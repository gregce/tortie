/**
 * Phase 325.1 (build/p3251/SPEC.md D3251-10): a restore that replayed a snapshot hands the session core the
 * replay's last rows as plain text, so main's record of what was typed into the session holds what the old screen
 * showed, and a question on it is not read as the agent asking now. Driven against the SHIPPING
 * `restoreSessionInTmux` over a recording tmux and a snapshot body on disk:
 *
 *  - a replay hands its last 24 rows, escape sequences stripped and trailing blank lines dropped, on the armed and
 *    the transcript arms, read back only once the replay was typed;
 *  - nothing for shell_only, a failed replay, no snapshot, or a body that cannot be read, and the restore then
 *    answers exactly as it always has;
 *  - `restoreRecordOf` never carries it, so it is never stored;
 *  - `replayTailOf` reads the body and names no log call.
 *
 * The bodies are made up here, or the committed gemini trust gate (src/main/activity/__tests__/fixtures/).
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest';

/** Every tmux argv the restore sent, in order. */
const sent: string[][] = [];
/** The snapshot `resolveSnapshot` answers, or none. */
let snapshot: string | null = null;
/** Make the replay's `send-keys` throw. */
let replayThrows = false;
/** Called when the replay's Enter is sent, the last thing before the replay's typing resolves. */
let onReplayEnter: (() => void) | null = null;

vi.mock('../../tmux', async () => {
  const errors = await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
    createSession: (input: { cwd: string }) =>
      Promise.resolve({ sessionId: '$3251', tmuxName: 'p3251', cwd: input.cwd, panePid: 3251 }),
    execTmux: (args: string[]) => {
      sent.push([...args]);
      const payload = args[args.length - 1] ?? '';
      const isReplay = args.includes('-l') && payload.trimStart().startsWith('cat ');
      if (isReplay && replayThrows) return Promise.reject(new Error('send-keys: no such pane'));
      const previous = sent[sent.length - 2];
      const afterReplay = previous !== undefined && previous.includes('-l') && (previous[previous.length - 1] ?? '').trimStart().startsWith('cat ');
      if (payload === 'Enter' && afterReplay) onReplayEnter?.();
      return Promise.resolve('');
    },
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({
  resolveSnapshot: () => (snapshot === null ? null : { path: snapshot, capsule: null, verified: true, source: 'generation', rejected: 0 })
}));

const { REPLAY_TAIL_ROWS, replayTailOf, restoreRecordOf, restoreSessionInTmux } = await import('../restore');

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
const REPO = join(__dirname, '../../../..');

let root: string;

beforeEach(() => {
  sent.length = 0;
  replayThrows = false;
  onReplayEnter = null;
  root = mkdtempSync(join(tmpdir(), 'p3251-replay-tail-'));
  snapshot = join(root, 'snap.txt');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function rec(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 'p3251-row',
    name: 'p3251 row',
    tmuxName: 'p3251-row',
    projectPath: root,
    cwd: root,
    agent: 'claude',
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: ['/abs/claude'],
    resumeArgv: ['/abs/claude', '--resume', 'ID'],
    ...over
  } as ManifestSessionRecord;
}

/** A shell row: nothing to arm, so a replay alone comes back as `transcript`. */
const shellRow = (): ManifestSessionRecord => rec({ agent: 'shell', argv: ['/bin/sh'], resumeArgv: [] });

/** Forty made-up rows, styled, with an OSC title, then blank rows: a space, an escape alone, an empty line. */
function styledBody(): { body: string; plain: string[] } {
  const plain = Array.from({ length: 40 }, (_v, i) => `row ${String(i + 1)}: the agent said something`);
  const styled = plain.map((line, i) => (i % 3 === 0 ? `${ESC}[1;32m${line}${ESC}[0m` : i % 3 === 1 ? `${ESC}]0;a title${BEL}${line}` : line));
  return { body: `${styled.join('\n')}\n   \n${ESC}[0m\n\n`, plain };
}

describe('what a replay hands on', () => {
  it('a replay hands its last 24 rows', async () => {
    const { body, plain } = styledBody();
    writeFileSync(snapshot as string, body);
    const out = await restoreSessionInTmux(rec());
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(REPLAY_TAIL_ROWS).toBe(24);
    expect(out.replayedTail).toBe(plain.slice(-24).join('\n'));
    expect(out.replayedTail?.split('\n')).toHaveLength(24);
    expect(out.replayedTail).not.toContain(ESC);
    expect(out.replayedTail).not.toContain(BEL);
  });

  it('on the transcript arm too, and a body shorter than 24 rows hands all of them', async () => {
    writeFileSync(snapshot as string, `first\n${ESC}[2msecond${ESC}[0m\nthird\n\n\n`);
    const out = await restoreSessionInTmux(shellRow());
    expect(out.kind).toBe('transcript');
    if (out.kind !== 'transcript') return;
    expect(out.replayedTail).toBe('first\nsecond\nthird');
  });

  it("the committed gemini trust gate as the body: its last 24 rows, the gate's own options among them", async () => {
    const gate = readFileSync(join(REPO, 'src/main/activity/__tests__/fixtures/gemini-trust-gate.txt'), 'utf8');
    writeFileSync(snapshot as string, gate);
    const out = await restoreSessionInTmux(rec());
    if (out.kind !== 'armed') throw new Error(`restore answered ${out.kind}`);
    const lines = gate.split('\n');
    while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') lines.pop();
    expect(out.replayedTail).toBe(lines.slice(-24).join('\n'));
    expect(out.replayedTail).toContain('1. Trust folder');
    expect(out.replayedTail).toContain('Do you trust the files in this folder?');
  });

  it('is read back only once the replay was typed: the body as it stood when the replay resolved', async () => {
    writeFileSync(snapshot as string, 'what the body said before the replay was typed\n');
    onReplayEnter = () => writeFileSync(snapshot as string, 'what the replay printed\n');
    const out = await restoreSessionInTmux(rec());
    expect(out.kind === 'armed' && out.replayedTail).toBe('what the replay printed');
  });
});

describe('nothing when nothing was replayed or nothing can be read', () => {
  it('no snapshot: no tail on any arm', async () => {
    snapshot = null;
    const armed = await restoreSessionInTmux(rec());
    expect(armed.kind).toBe('armed');
    expect('replayedTail' in armed).toBe(false);
    const bare = await restoreSessionInTmux(shellRow());
    expect(bare.kind).toBe('shell_only');
    expect('replayedTail' in bare).toBe(false);
  });

  it('a replay that failed hands nothing, and the failure is reported as it always was', async () => {
    writeFileSync(snapshot as string, 'old rows\n');
    replayThrows = true;
    const armed = await restoreSessionInTmux(rec());
    expect(armed.kind).toBe('armed');
    expect('replayedTail' in armed).toBe(false);
    expect(armed.kind === 'armed' && armed.replayFailure).toBe('send-keys: no such pane');
    const bare = await restoreSessionInTmux(shellRow());
    expect(bare.kind).toBe('shell_only');
    expect('replayedTail' in bare).toBe(false);
    expect(bare.kind === 'shell_only' && bare.replayFailure).toBe('send-keys: no such pane');
  });

  it('a body that cannot be read back hands nothing, and the restore answers as it always has', async () => {
    // The replay was typed (the shell's own `cat` decides what it prints), but nothing is here to read.
    snapshot = join(root, 'gone.txt');
    const armed = await restoreSessionInTmux(rec());
    expect(armed.kind).toBe('armed');
    expect('replayedTail' in armed).toBe(false);
    expect(armed.kind === 'armed' && armed.replayFailure).toBeUndefined();
    const replayOnly = await restoreSessionInTmux(shellRow());
    expect(replayOnly.kind).toBe('transcript');
    expect('replayedTail' in replayOnly).toBe(false);
    // A folder where the body should be is unreadable too.
    snapshot = root;
    const folder = await restoreSessionInTmux(shellRow());
    expect(folder.kind).toBe('transcript');
    expect('replayedTail' in folder).toBe(false);
  });

  it('replayTailOf answers undefined for an unreadable body and plain rows for a readable one', () => {
    expect(replayTailOf(join(root, 'nothing-here'))).toBeUndefined();
    writeFileSync(join(root, 'body.txt'), `${ESC}[31mred${ESC}[0m\n  \n`);
    expect(replayTailOf(join(root, 'body.txt'))).toBe('red');
    writeFileSync(join(root, 'blank.txt'), '\n \n\n');
    expect(replayTailOf(join(root, 'blank.txt'))).toBe('');
  });
});

describe('it is never stored and never logged', () => {
  it('restoreRecordOf never carries it, on the armed or the transcript arm', async () => {
    writeFileSync(snapshot as string, 'a row\n');
    const armed = await restoreSessionInTmux(rec());
    expect(armed.kind === 'armed' && armed.replayedTail).toBe('a row');
    expect('replayedTail' in restoreRecordOf(armed, 1)).toBe(false);
    expect(restoreRecordOf(armed, 1)).toEqual({ kind: 'armed', at: 1 });
    const transcript = await restoreSessionInTmux(shellRow());
    expect(transcript.kind === 'transcript' && transcript.replayedTail).toBe('a row');
    expect('replayedTail' in restoreRecordOf(transcript, 1)).toBe(false);
    expect(restoreRecordOf(transcript, 1)).toEqual({ kind: 'transcript', at: 1 });
  });

  it('replayTailOf reads the body and names no log call, and its rows are set only after the replay was typed', () => {
    const code = readFileSync(join(__dirname, '..', 'restore.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const start = code.indexOf('export function replayTailOf(');
    expect(start).toBeGreaterThan(-1);
    const body = code.slice(start, code.indexOf('\n}\n', start));
    expect(body).not.toMatch(/restoreLog|getLog|console\.|postDurabilityNotice/);
    expect(body.match(/readFileSync\(/g)).toHaveLength(1);
    // ONE assignment of the tail, inside the replay's try, after its typing was awaited.
    const assigns = code.match(/replayedTail = /g) ?? [];
    expect(assigns).toHaveLength(1);
    const replay = code.indexOf('await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);');
    const assign = code.indexOf('replayedTail = replayTailOf(snapshot);');
    expect(replay).toBeGreaterThan(-1);
    expect(assign).toBeGreaterThan(replay);
    expect(code.slice(replay, assign)).not.toMatch(/\bcatch\b/);
  });
});
