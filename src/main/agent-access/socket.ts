/**
 * Phase 359, Builder C1 — the one framing owner for the agent-access socket.
 *
 * SOCKET.PARSE ONLY. `socket.ts` binds, accepts, frames and writes; it never
 * validates a request body, never looks up an operation, never checks the
 * switch, and never produces a value. `dispatch.ts` owns all of that.
 *
 * THE CONTRACT, from build/p359/SPEC.md §2.6:
 * - one connection carries exactly one newline-terminated request;
 * - bytes after the first newline may be ASCII whitespace only;
 * - a second request is `bad-request` and the connection closes;
 * - at most 64 KiB plus one sentinel byte are read; overflow answers
 *   `bad-request` and is never parsed;
 * - the response is serialized, asserted ≤ 256 KiB, written as one line;
 * - the absolute request deadline is two seconds from accept and is never
 *   reset by bytes: a slowloris cannot keep the app open.
 */

import { createServer, type Server, type Socket } from 'node:net';
import {
  AGENT_ACCESS_MAX_REQUEST_BYTES,
  AGENT_ACCESS_MAX_RESPONSE_BYTES,
  AGENT_ACCESS_REQUEST_DEADLINE_MS,
  type AgentAccessResponse
} from '@shared/agent-access';

/** ASCII whitespace the framing layer tolerates after the first newline. */
const TRAILING_WHITESPACE = new Set([' ', '\t', '\r', '\n', '\v', '\f']);

/**
 * Split one connection's buffered bytes into a framing verdict.
 *
 * Returns the single JSON line when exactly one newline-terminated request
 * arrived and every byte after that newline is ASCII whitespace; otherwise
 * null, and the connection is refused `bad-request`. The second request is
 * refused even when it is byte-identical to the first: one connection carries
 * one request, never a pipeline.
 */
export function splitFramedRequest(buffered: Buffer): {
  line: string;
  ok: boolean;
} {
  const newlineAt = buffered.indexOf(0x0a);
  if (newlineAt < 0) return { line: '', ok: false };
  for (let i = newlineAt + 1; i < buffered.length; i += 1) {
    const byte = buffered[i];
    if (byte === undefined) return { line: '', ok: false };
    if (!TRAILING_WHITESPACE.has(String.fromCharCode(byte))) {
      return { line: '', ok: false };
    }
  }
  return { line: buffered.subarray(0, newlineAt).toString('utf8'), ok: true };
}

/** Serialize one response line, asserting the 256 KiB response cap. */
export function serializeAgentAccessResponse(
  response: AgentAccessResponse
): string | null {
  let line: string;
  try {
    line = `${JSON.stringify(response)}\n`;
  } catch {
    return null;
  }
  if (Buffer.byteLength(line, 'utf8') > AGENT_ACCESS_MAX_RESPONSE_BYTES) {
    return null;
  }
  return line;
}

/**
 * What a raw connection hands the dispatcher: the exact bytes of its one
 * framed request line, already capped at 64 KiB. The dispatcher validates
 * the JSON body against the shared contract.
 */
export interface AgentAccessFramedConnection {
  /** The one request line, without its newline. */
  line: string;
}

/**
 * Accept connections on a bound server, frame each exactly once, and hand the
 * line to `onLine`. Framing refusals are answered through `onFramingError`
 * with a fully composed `AgentAccessResponse`, because the response's error
 * code still comes from the dispatcher's closed set.
 *
 * The deadline is ABSOLUTE: it starts at accept and no byte resets it. The
 * read cap is 64 KiB plus one sentinel byte: crossing it answers
 * `bad-request` and the bytes are never parsed.
 */
export function acceptFramedConnections(
  server: Server,
  hooks: {
    onLine: (socket: Socket, line: string) => void;
    onFramingError: (socket: Socket, code: 'bad-request') => void;
  }
): void {
  server.on('connection', (socket: Socket) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;
    const fail = (code: 'bad-request'): void => {
      if (settled) return;
      settled = true;
      try {
        socket.removeAllListeners('data');
      } catch {
        /* a dying socket stays dying */
      }
      hooks.onFramingError(socket, code);
    };
    const deadline = setTimeout(() => {
      // Absolute: a slow sender that never finishes its first line still
      // cannot keep the app open. The dispatcher's own per-request work
      // ends the connection sooner; this timer only bounds the read.
      fail('bad-request');
    }, AGENT_ACCESS_REQUEST_DEADLINE_MS);
    deadline.unref?.();
    const finish = (line: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      try {
        socket.removeAllListeners('data');
      } catch {
        /* a dying socket stays dying */
      }
      hooks.onLine(socket, line);
    };
    socket.on('data', (chunk: Buffer) => {
      if (settled) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      received += bytes.length;
      if (received > AGENT_ACCESS_MAX_REQUEST_BYTES + 1) {
        // Overflow: never parse. The sentinel byte is what distinguishes a
        // 64 KiB line that simply has not ended yet from one that will not
        // fit; either way the answer is `bad-request`.
        clearTimeout(deadline);
        fail('bad-request');
        return;
      }
      chunks.push(bytes);
      const buffered = Buffer.concat(chunks);
      const newlineAt = buffered.indexOf(0x0a);
      if (newlineAt < 0) return;
      const framed = splitFramedRequest(buffered);
      if (!framed.ok) {
        clearTimeout(deadline);
        fail('bad-request');
        return;
      }
      finish(framed.line);
    });
    socket.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(deadline);
      }
    });
    socket.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(deadline);
      }
    });
  });
}

/** The one `net.createServer` for this feature. No other module calls it. */
export function createAgentAccessServer(): Server {
  return createServer();
}
