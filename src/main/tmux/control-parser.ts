/**
 * tmux control-mode (`tmux -C`) line parser — PURE module.
 *
 * Control mode is a line-oriented text protocol: commands we send are
 * answered with `%begin … %end/%error` guarded blocks (strictly ordered by
 * command number), and the server pushes asynchronous `%`-prefixed
 * notifications between blocks. Reference: docs/research/01-durability-layer.md
 * §3.2 and the tmux Control Mode wiki. Wire formats below were verified
 * against tmux 3.6a on the private `-L gmux` socket:
 *
 *   %begin 1786298676 328 0
 *   %end 1786298676 328 1
 *   %error 1786298658 326 1
 *   %sessions-changed
 *   %session-changed $1 gmux-control
 *   %session-renamed $0 new-name
 *   %session-window-changed $0 @4
 *   %exit [reason]
 *   %output %5 dataa\015\012
 *
 * No tmux/electron/node imports — unit-testable under any runner
 * (see __tests__/control-parser.test.ts). The stateful concerns (pairing
 * blocks to pending commands, treating in-block lines as body text) live in
 * control-client.ts; this module only classifies a single line.
 */

// ---------------------------------------------------------------------------
// Event model
// ---------------------------------------------------------------------------

export interface BlockGuard {
  /** Epoch seconds as printed by tmux. */
  timestamp: number;
  /** Server-assigned command number; blocks are strictly ordered by it. */
  commandNumber: number;
  /** Flags bitfield (1 = block belongs to a client command). */
  flags: number;
}

export type ControlEvent =
  /** `%begin` — start of a command-output block. */
  | ({ kind: 'begin' } & BlockGuard)
  /** `%end` — successful end of the block opened by the matching %begin. */
  | ({ kind: 'end' } & BlockGuard)
  /** `%error` — the command failed; block content is the error text. */
  | ({ kind: 'command-error' } & BlockGuard)
  /** `%sessions-changed` — a session was created or destroyed. */
  | { kind: 'sessions-changed' }
  /** `%session-changed $id name` — THIS client switched sessions. */
  | { kind: 'session-changed'; sessionId: string; name: string }
  /** `%session-renamed $id name` — any session was renamed. */
  | { kind: 'session-renamed'; sessionId: string; name: string }
  /** `%session-window-changed $id @id` — a session's current window moved. */
  | { kind: 'session-window-changed'; sessionId: string; windowId: string }
  /** `%output %pane data` — pane output (octal-escaped). Suppressed in gmux
   *  via `refresh-client -f no-output`, parsed for completeness. */
  | { kind: 'output'; paneId: string; data: string }
  /** `%exit [reason]` — the control client is done (detach/kill/server exit). */
  | { kind: 'exit'; reason?: string }
  /** Any other `%notification` we don't consume yet (window-add, …). */
  | { kind: 'other-notification'; name: string; raw: string }
  /** A non-`%` line: command output (only meaningful inside a block). */
  | { kind: 'body'; line: string };

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const GUARD_RE = /^%(begin|end|error) (\d+) (\d+) (\d+)$/;

/**
 * Classify one control-mode line. Callers must feed complete lines with the
 * trailing `\n` removed; a trailing `\r` (PTY transports) is tolerated.
 */
export function parseControlLine(rawLine: string): ControlEvent {
  const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

  if (!line.startsWith('%')) {
    return { kind: 'body', line };
  }

  const guard = GUARD_RE.exec(line);
  if (guard !== null) {
    const word = guard[1];
    const block: BlockGuard = {
      timestamp: Number(guard[2]),
      commandNumber: Number(guard[3]),
      flags: Number(guard[4])
    };
    if (word === 'begin') return { kind: 'begin', ...block };
    if (word === 'end') return { kind: 'end', ...block };
    return { kind: 'command-error', ...block };
  }

  const space = line.indexOf(' ');
  const name = space === -1 ? line.slice(1) : line.slice(1, space);
  const rest = space === -1 ? '' : line.slice(space + 1);

  switch (name) {
    case 'sessions-changed':
      return { kind: 'sessions-changed' };

    case 'session-changed':
    case 'session-renamed': {
      // `$id name` — the name may itself contain spaces.
      const sp = rest.indexOf(' ');
      if (!rest.startsWith('$') || sp === -1) break;
      const sessionId = rest.slice(0, sp);
      const sessionName = rest.slice(sp + 1);
      return name === 'session-changed'
        ? { kind: 'session-changed', sessionId, name: sessionName }
        : { kind: 'session-renamed', sessionId, name: sessionName };
    }

    case 'session-window-changed': {
      const parts = rest.split(' ');
      const sessionId = parts[0];
      const windowId = parts[1];
      if (
        parts.length !== 2 ||
        sessionId === undefined ||
        windowId === undefined ||
        !sessionId.startsWith('$') ||
        !windowId.startsWith('@')
      ) {
        break;
      }
      return { kind: 'session-window-changed', sessionId, windowId };
    }

    case 'output': {
      // `%output %pane data` — data is octal-escaped, may be empty.
      const sp = rest.indexOf(' ');
      const paneId = sp === -1 ? rest : rest.slice(0, sp);
      if (!paneId.startsWith('%')) break;
      const data = sp === -1 ? '' : rest.slice(sp + 1);
      return { kind: 'output', paneId, data };
    }

    case 'exit':
      return rest.length > 0 ? { kind: 'exit', reason: rest } : { kind: 'exit' };

    default:
      break;
  }

  return { kind: 'other-notification', name, raw: line };
}

// ---------------------------------------------------------------------------
// %output octal unescaping
// ---------------------------------------------------------------------------

const OCTAL_DIGITS = new Set(['0', '1', '2', '3', '4', '5', '6', '7']);

/**
 * Decode the octal escaping tmux applies to `%output` data: bytes < 0x20 and
 * `\` arrive as `\ooo` (older tmuxes escaped ALL non-ASCII bytes this way, so
 * multi-byte UTF-8 sequences can arrive as runs of `\ooo` — which is why this
 * operates on a byte buffer and decodes UTF-8 at the end, not char-by-char).
 */
export function unescapeOctal(data: string): string {
  const encoder = new TextEncoder();
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const ch = data[i] as string; // i < length ⇒ defined
    if (
      ch === '\\' &&
      i + 3 < data.length &&
      OCTAL_DIGITS.has(data[i + 1] ?? '') &&
      OCTAL_DIGITS.has(data[i + 2] ?? '') &&
      OCTAL_DIGITS.has(data[i + 3] ?? '')
    ) {
      bytes.push(parseInt(data.slice(i + 1, i + 4), 8) & 0xff);
      i += 3;
    } else {
      // Re-encode the (possibly multi-byte) character as UTF-8 bytes.
      for (const b of encoder.encode(ch)) bytes.push(b);
    }
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

// ---------------------------------------------------------------------------
// Line splitting helper (byte-stream → complete lines)
// ---------------------------------------------------------------------------

/**
 * Stateful newline splitter for a chunked text stream. Feed decoded chunks,
 * receive complete lines (without terminators); partial trailing data is
 * buffered until its newline arrives.
 */
export class LineBuffer {
  private pending = '';

  push(chunk: string): string[] {
    this.pending += chunk;
    const lines = this.pending.split('\n');
    // Last element is the (possibly empty) unterminated remainder.
    this.pending = lines.pop() ?? '';
    return lines;
  }

  /** Discard buffered partial data (on disconnect). */
  reset(): void {
    this.pending = '';
  }
}
