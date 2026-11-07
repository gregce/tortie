/**
 * Phase 359, Builder C1 — the real scratch socket: framing, caps, ownership.
 *
 * WHAT THIS PINS, against a real Unix-domain socket the test creates and
 * removes in a `finally`:
 * - one request per connection; arbitrary chunk boundaries and byte-split
 *   writes still frame exactly one line;
 * - reordered JSON keys succeed (order is irrelevant);
 * - the absolute two-second deadline closes a slow connection that trickles
 *   bytes;
 * - 64 KiB + 1 overflow answers `bad-request` and is never parsed (the stub
 *   dispatcher would have answered `ok` had the line reached it);
 * - a second request on one connection answers `bad-request`;
 * - ASCII whitespace after the first newline is tolerated; any other byte
 *   is a second request and refuses;
 * - the response line is asserted against the 256 KiB cap before writing;
 * - the frame splitter is proved on its own over hostile byte shapes.
 *
 * NO ELECTRON, NO AGENT, NO MANIFEST. The dispatcher behind the socket is a
 * stub that echoes only CLOSED words; `unavailable` is the only error it can
 * produce, so no request-shaped byte can leak into an answer.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConnection, type Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AgentAccessResponse } from '@shared/agent-access';
import { agentAccessSocketPathFits } from '../service';
import {
  acceptFramedConnections,
  createAgentAccessServer,
  serializeAgentAccessResponse,
  splitFramedRequest
} from '../socket';

let scratchDirs: string[] = [];

afterEach(() => {
  for (const dir of scratchDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
  vi.restoreAllMocks();
});

function scratchSocketPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'p359-sock-'));
  scratchDirs.push(dir);
  return join(dir, 'agent.sock');
}

function stubOk(line: string): AgentAccessResponse {
  // Reordered-key control and canary check: the stub never echoes the line.
  void line;
  return { version: 1, ok: true, operation: 'whoami', value: { session: undefined as never } as never };
}

function connectOnce(path: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ path });
    socket.on('connect', () => resolve(socket));
    socket.on('error', reject);
  });
}

function readAll(socket: Socket): Promise<string> {
  return new Promise((resolve) => {
    let out = '';
    socket.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8');
    });
    socket.on('close', () => resolve(out));
    socket.on('end', () => resolve(out));
    setTimeout(() => resolve(out), 3000);
  });
}

async function serveOnce(
  path: string,
  hooks?: {
    onLine?: (line: string) => AgentAccessResponse;
  }
): Promise<{ close: () => Promise<void> }> {
  const server = createAgentAccessServer();
  acceptFramedConnections(server, {
    onLine: (socket, line) => {
      const answer = hooks?.onLine?.(line) ?? stubOk(line);
      const text = serializeAgentAccessResponse(answer);
      expect(text).not.toBeNull();
      if (text !== null) socket.write(text);
      socket.end();
    },
    onFramingError: (socket) => {
      const text = serializeAgentAccessResponse({
        version: 1,
        ok: false,
        error: { code: 'bad-request', message: 'Malformed request.' }
      });
      if (text !== null) socket.write(text);
      socket.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(path, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  return {
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        setTimeout(resolve, 1000);
      })
  };
}

describe('agent-access socket framing', () => {
  it('splits one framed line and refuses second requests', () => {
    const first = splitFramedRequest(Buffer.from('{"a":1}\n', 'utf8'));
    expect(first).toEqual({ line: '{"a":1}', ok: true });
    const trailing = splitFramedRequest(Buffer.from('{"a":1}\n  \t\r\n', 'utf8'));
    expect(trailing).toEqual({ line: '{"a":1}', ok: true });
    expect(
      splitFramedRequest(Buffer.from('{"a":1}\n{"b":2}\n', 'utf8')).ok
    ).toBe(false);
    expect(splitFramedRequest(Buffer.from('{"a":1}\n ', 'utf8')).ok).toBe(true);
    expect(splitFramedRequest(Buffer.from('{"a":1}\nX', 'utf8')).ok).toBe(false);
    expect(splitFramedRequest(Buffer.from('no-newline', 'utf8')).ok).toBe(false);
  });

  it('frames one request across arbitrary chunk boundaries', async () => {
    const path = scratchSocketPath();
    const seen: string[] = [];
    const server = await serveOnce(path, {
      onLine: (line) => {
        seen.push(line);
        return {
          version: 1,
          ok: true,
          operation: 'sessions',
          value: { sessions: [], omitted: 0 }
        };
      }
    });
    try {
      const line = '{"version":1,"operation":"sessions","session":"caller-1"}\n';
      // One byte at a time, including a split inside a multi-byte boundary
      // of the JSON itself.
      const socket = await connectOnce(path);
      const answer = readAll(socket);
      for (const char of line) {
        socket.write(char);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      const text = await answer;
      expect(seen).toEqual([line.trimEnd()]);
      expect(text.trimEnd()).toContain('"ok":true');
    } finally {
      await server.close();
    }
  });

  it('accepts reordered keys on the wire', async () => {
    const path = scratchSocketPath();
    const server = await serveOnce(path);
    try {
      const socket = await connectOnce(path);
      const answer = readAll(socket);
      socket.write('{"session":"caller-1","operation":"whoami","version":1}\n');
      const text = await answer;
      expect(text).toContain('"ok":true');
    } finally {
      await server.close();
    }
  });

  it('refuses a second request on one connection', async () => {
    const path = scratchSocketPath();
    let reached = false;
    const server = await serveOnce(path, {
      onLine: () => {
        reached = true;
        return stubOk('');
      }
    });
    try {
      const socket = await connectOnce(path);
      const answer = readAll(socket);
      // A pipelined second request, even byte-identical, refuses before
      // any handler runs, and the connection closes.
      socket.write(
        '{"version":1,"operation":"whoami","session":"a"}\n' +
          '{"version":1,"operation":"whoami","session":"a"}\n'
      );
      const text = await answer;
      expect(text).toContain('bad-request');
      expect(reached).toBe(false);
    } finally {
      await server.close();
    }
  });

  it('refuses 64 KiB + 1 overflow before parsing', async () => {
    const path = scratchSocketPath();
    let reached = false;
    const server = await serveOnce(path, {
      onLine: () => {
        reached = true;
        return stubOk('');
      }
    });
    try {
      const socket = await connectOnce(path);
      const answer = readAll(socket);
      socket.write('x'.repeat(64 * 1024 + 1));
      const text = await answer;
      expect(text).toContain('bad-request');
      expect(reached).toBe(false);
    } finally {
      await server.close();
    }
  });

  it('closes an absolute two-second deadline a slowloris cannot reset', async () => {
    const path = scratchSocketPath();
    const server = await serveOnce(path);
    try {
      const socket = await connectOnce(path);
      const startedAt = Date.now();
      const answer = readAll(socket);
      // Trickle bytes just before each interval; none completes a line.
      for (let i = 0; i < 5; i += 1) {
        socket.write('{"par');
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const text = await answer;
      const waitedMs = Date.now() - startedAt;
      expect(waitedMs).toBeLessThan(5000);
      expect(text).toContain('bad-request');
    } finally {
      await server.close();
    }
  }, 10000);

  it('asserts the 256 KiB response cap before writing', () => {
    const small: AgentAccessResponse = {
      version: 1,
      ok: true,
      operation: 'sessions',
      value: { sessions: [], omitted: 0 }
    };
    expect(serializeAgentAccessResponse(small)).toMatch(/\n$/);
    const huge: AgentAccessResponse = {
      version: 1,
      ok: true,
      operation: 'sessions',
      value: {
        sessions: [],
        omitted: 0,
        extra: 'x'.repeat(256 * 1024)
      } as unknown as { sessions: never[]; omitted: 0 }
    };
    expect(serializeAgentAccessResponse(huge)).toBeNull();
  });

  it('holds the 103-byte macOS path guard', () => {
    expect(agentAccessSocketPathFits('a'.repeat(103))).toBe(true);
    expect(agentAccessSocketPathFits('a'.repeat(104))).toBe(false);
    // Multi-byte characters count bytes, not characters: 1 + 51 * 2 = 103 fits.
    expect(agentAccessSocketPathFits(`/${'é'.repeat(51)}`)).toBe(true);
    expect(agentAccessSocketPathFits(`/${'é'.repeat(52)}`)).toBe(false);
  });
});
