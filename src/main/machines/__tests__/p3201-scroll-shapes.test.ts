/**
 * Phase 320.1, the carriage door's closed table (build/p3201/SPEC.md §3.1, D1,
 * D10; research 130 §4).
 *
 * What it pins, each against the SHIPPING module and nothing copied from it:
 *
 *  - the table is eight rows with the eight ids, each with its repeat
 *    reasoning, and exactly three rows are not idempotent (`scroll-lines`, the
 *    seventh, `type-bytes`, which types: his word of 2026-09-30, D7; and the
 *    eighth, `type-key`, which types one named key: his word of 2026-10-05,
 *    build/p337/SPEC.md D20, added LAST);
 *  - `typedSequence` composes `cancel` then chunks of at most 256 lowercase hex
 *    bytes whose concatenation is the input's UTF-8 bytes, and every argv it
 *    composes is admitted as the shape it is;
 *  - EVERY argv the four `scroll.ts` entry points emit, through an unordered
 *    runner and through an ordered one with a server, including a relative
 *    scroll above 2,000 and the seek, is admitted with the shape it is;
 *  - a hostile corpus of more than forty argvs is refused, each for a reason
 *    that never repeats the argv;
 *  - the guarded runner calls `send` ZERO times on every refusal and on a
 *    connection that moved, and writes the quoted line otherwise;
 *  - the read's format is `REMOTE_STATE_FORMAT` itself, which holds no `#(`
 *    and no byte a client without a UTF-8 locale rewrites, this Mac's
 *    tab-separated `STATE_FORMAT` is refused, and the module names no format
 *    of its own (Phase 320.1's fix round);
 *  - the caller-side deadline answers the caller and leaves the late answer
 *    handled.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { quoteTmuxArg } from '../../tmux/control-client';
import {
  REMOTE_STATE_FORMAT,
  SCROLL_CHUNK_LINES,
  STATE_FORMAT,
  exitPaneScroll,
  readPaneScroll,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
  type TmuxScrollRunner
} from '../../tmux/scroll';
import { POCKET_SCREEN_KEY_NAMES } from '@shared/ipc/pocket';
import {
  GOTO_LINE_MAX,
  REMOTE_SCROLL_DEADLINE_MS,
  SCROLL_SHAPES,
  TYPED_BYTES_PER_COMMAND,
  admitScrollArgv,
  guardedScrollRunner,
  typedSequence,
  type ScrollShapeId
} from '../scroll-shapes';

const REPO = join(__dirname, '../../../..');

/**
 * A `display-message` answer's eight fields: parked, position, history, rows,
 * alt, mouse, cols, frame. Joined by the reader each runner reads with: a tab
 * for this Mac's, a space for a machine's (`REMOTE_STATE_FORMAT`).
 */
function stateLine(inMode: string, position: string, history: string): string[] {
  return [inMode, position, history, '40', '0', '0', '120', ''];
}

/**
 * Every argv a runner is handed, in order, answering reads with `answer`.
 *
 * BOTH flavours name a server, because the table is what crosses to a machine
 * and a machine's runner is the only one that reads with `REMOTE_STATE_FORMAT`:
 * `serial` drives the serial code (the one an unordered runner takes) and
 * `ordered` the pipelined one. This Mac's runner, which names no server, reads
 * with the tab format the table refuses, which is right: it never crosses
 * (Phase 320.1's fix round, and the case below).
 */
function recording(
  flavour: 'serial' | 'ordered',
  answer: string[]
): { run: TmuxScrollRunner; calls: string[][] } {
  const calls: string[][] = [];
  const fn = async (args: readonly string[]): Promise<string> => {
    calls.push([...args]);
    return args[0] === 'display-message' ? answer.join(' ') : '';
  };
  const run: TmuxScrollRunner =
    flavour === 'ordered'
      ? Object.assign(fn, { ordered: true, server: 'machine:rig' })
      : Object.assign(fn, { server: 'machine:rig' });
  return { run, calls };
}

/** Drive every entry point once and return what they emitted. */
async function everyEmittedArgv(flavour: 'serial' | 'ordered'): Promise<string[][]> {
  const out: string[][] = [];
  const drive = async (
    answer: string[],
    op: (run: TmuxScrollRunner) => Promise<unknown>
  ): Promise<void> => {
    resetSeekSupportForTests();
    const { run, calls } = recording(flavour, answer);
    await op(run);
    out.push(...calls);
  };
  await drive(stateLine('0', '', '9000'), (run) => readPaneScroll(run, '$3'));
  await drive(stateLine('1', '7', '9000'), (run) => scrollPaneBy(run, '$3', 7));
  await drive(stateLine('1', '7', '9000'), (run) => scrollPaneBy(run, '$3', -4));
  await drive(stateLine('1', '7', '9000'), (run) => scrollPaneBy(run, '$3', SCROLL_CHUNK_LINES));
  await drive(stateLine('1', '7', '9000'), (run) => scrollPaneBy(run, '$3', 0));
  // Above one slice: re-expressed as a read, then the absolute seek.
  await drive(stateLine('1', '100', '90000'), (run) => scrollPaneBy(run, '$3', 40_000));
  await drive(stateLine('1', '5000', '90000'), (run) => scrollPaneBy(run, '$3', -2_500));
  await drive(stateLine('1', '20', '300'), (run) => scrollPaneTo(run, '$3', 50));
  await drive(stateLine('1', '20', '300'), (run) => scrollPaneTo(run, '$3', 9999));
  await drive(stateLine('1', '20', '300'), (run) => scrollPaneTo(run, '$3', 0));
  await drive(stateLine('0', '', '300'), (run) => exitPaneScroll(run, '$3'));
  return out;
}

describe('the table', () => {
  it('has eight rows, the eight ids, each with its reasoning, and exactly three not idempotent', () => {
    const ids: ScrollShapeId[] = SCROLL_SHAPES.map((shape) => shape.id);
    expect(ids).toEqual([
      'read-state',
      'enter-copy-mode',
      'scroll-lines',
      'goto-line',
      'top-line',
      'cancel',
      'type-bytes',
      'type-key'
    ]);
    for (const shape of SCROLL_SHAPES) expect(shape.repeat.trim().length).toBeGreaterThan(20);
    const notIdempotent = SCROLL_SHAPES.filter((shape) => !shape.idempotent).map((shape) => shape.id);
    expect(notIdempotent).toEqual(['scroll-lines', 'type-bytes', 'type-key']);
  });

  it('admits the eighth row as send-keys -t $N and exactly one of the contract\'s 35 names, read from the contract', () => {
    const typeKey = SCROLL_SHAPES.find((shape) => shape.id === 'type-key');
    expect(typeKey?.argv).toHaveLength(4);
    const last = typeKey?.argv[3];
    // The contract's own frozen list, not a copy of it.
    expect(last).toEqual({ kind: 'one-of', words: POCKET_SCREEN_KEY_NAMES });
    expect(last?.kind === 'one-of' ? last.words : null).toBe(POCKET_SCREEN_KEY_NAMES);
    expect(POCKET_SCREEN_KEY_NAMES).toHaveLength(35);
    for (const name of POCKET_SCREEN_KEY_NAMES) {
      expect(admitScrollArgv(['send-keys', '-t', '$3', name])).toEqual({ ok: true, shape: 'type-key' });
    }
    // A key name the phone never sends, a modifier, a second name, and a flag.
    for (const refused of ['M-x', 'F1', 'C-Up', 'c-c', 'C-C', 'Home', 'PageUp', 'Space', 'C-c;', ' Enter', 'Enter ']) {
      expect(admitScrollArgv(['send-keys', '-t', '$3', refused]).ok, refused).toBe(false);
    }
  });

  it('admits the seventh row with 1 to 256 lowercase two-digit bytes, and nothing else after -H', () => {
    expect(TYPED_BYTES_PER_COMMAND).toBe(256);
    const typed = (bytes: string[]): boolean =>
      admitScrollArgv(['send-keys', '-t', '$3', '-H', ...bytes]).ok;
    expect(admitScrollArgv(['send-keys', '-t', '$3', '-H', '61'])).toEqual({ ok: true, shape: 'type-bytes' });
    expect(typed(['00', 'ff', '0d', '1b', '7f'])).toBe(true);
    expect(typed(Array.from({ length: 256 }, () => 'aa'))).toBe(true);
    expect(typed([])).toBe(false);
    expect(typed(Array.from({ length: 257 }, () => 'aa'))).toBe(false);
    // One spelling of a byte, and it is never the last element that is judged alone.
    expect(typed(['61', '6A'])).toBe(false);
    expect(typed(['6A', '61'])).toBe(false);
  });

  it('reads a machine with REMOTE_STATE_FORMAT itself, which holds no #( and no byte below 0x20, and names no format of its own', () => {
    expect(REMOTE_STATE_FORMAT.includes('#(')).toBe(false);
    // Every byte printable ASCII: tmux rewrites anything below 0x20 to `_` for
    // a client with no UTF-8 locale, which a machine's control client may be.
    expect(/^[\x20-\x7e]+$/.test(REMOTE_STATE_FORMAT)).toBe(true);
    // The same eight fields as this Mac's read, in the same places.
    expect(REMOTE_STATE_FORMAT.split(' ')).toEqual(STATE_FORMAT.split('\t'));
    expect(admitScrollArgv(['display-message', '-p', '-t', '$3', '-F', REMOTE_STATE_FORMAT])).toEqual({
      ok: true,
      shape: 'read-state'
    });
    const source = readFileSync(join(REPO, 'src/main/machines/scroll-shapes.ts'), 'utf8');
    expect(source.includes('#{')).toBe(false);
    expect(source).toMatch(/import \{[^}]*REMOTE_STATE_FORMAT[^}]*\} from '\.\.\/tmux\/scroll'/);
    expect(source).toMatch(/import \{[^}]*SCROLL_CHUNK_LINES[^}]*\} from '\.\.\/tmux\/scroll'/);
  });

  it('refuses this Mac\'s tab-separated read on a machine, whose tabs a client with no UTF-8 locale answers as _', () => {
    expect(STATE_FORMAT.includes('\t')).toBe(true);
    expect(admitScrollArgv(['display-message', '-p', '-t', '$3', '-F', STATE_FORMAT])).toMatchObject({ ok: false });
  });

  it('bounds the relative scroll at the one slice number, 2,000', () => {
    expect(SCROLL_CHUNK_LINES).toBe(2_000);
    const at = (n: string): boolean =>
      admitScrollArgv(['send-keys', '-t', '$3', '-X', '-N', n, 'scroll-up']).ok;
    expect(at('1')).toBe(true);
    expect(at('2000')).toBe(true);
    expect(at('0')).toBe(false);
    expect(at('2001')).toBe(false);
    expect(
      admitScrollArgv(['send-keys', '-t', '$3', '-X', 'goto-line', String(GOTO_LINE_MAX)]).ok
    ).toBe(true);
    expect(
      admitScrollArgv(['send-keys', '-t', '$3', '-X', 'goto-line', String(GOTO_LINE_MAX + 1)]).ok
    ).toBe(false);
  });
});

describe('every argv the shipping scroll.ts emits is admitted', () => {
  for (const flavour of ['serial', 'ordered'] as const) {
    it(`through a ${flavour} runner`, async () => {
      const emitted = await everyEmittedArgv(flavour);
      expect(emitted.length).toBeGreaterThan(25);
      const seen = new Set<ScrollShapeId>();
      for (const argv of emitted) {
        const verdict = admitScrollArgv(argv);
        expect(verdict, argv.join(' ')).toMatchObject({ ok: true });
        if (verdict.ok) seen.add(verdict.shape);
      }
      // Every scroll shape is reached by some entry point, so none of the six
      // is dead. The two typing rows are reached by their own composers.
      expect([...seen].sort()).toEqual(
        ['cancel', 'enter-copy-mode', 'goto-line', 'read-state', 'scroll-lines', 'top-line']
      );
    });
  }

  it('this Mac\'s runner, which names no server, reads with the tab format, and the table refuses that read', async () => {
    const calls: string[][] = [];
    const here: TmuxScrollRunner = (args) => {
      calls.push([...args]);
      return Promise.resolve(args[0] === 'display-message' ? '0\t\t9000\t40\t0\t0\t120\t' : '');
    };
    await readPaneScroll(here, '$3');
    expect(calls).toEqual([['display-message', '-p', '-t', '$3', '-F', STATE_FORMAT]]);
    expect(admitScrollArgv(calls[0] ?? [])).toMatchObject({ ok: false });
  });
});

describe('typedSequence, the one composer of the seventh shape (D7)', () => {
  const hexOf = (argvs: string[][]): string[] =>
    argvs.slice(1).flatMap((argv) => argv.slice(4));

  it('writes cancel first, then the UTF-8 bytes as lowercase hex, and é😀\\r crosses as c3 a9 f0 9f 98 80 0d', () => {
    const argvs = typedSequence('$7', Buffer.from('é😀\r', 'utf8'));
    expect(argvs).toEqual([
      ['send-keys', '-t', '$7', '-X', 'cancel'],
      ['send-keys', '-t', '$7', '-H', 'c3', 'a9', 'f0', '9f', '98', '80', '0d']
    ]);
  });

  it('splits 600 bytes into three commands of 256, 256 and 88, in order, whose bytes are the input\'s', () => {
    const input = Buffer.from(Array.from({ length: 600 }, (_, i) => (i * 7 + 3) % 256));
    const argvs = typedSequence('$7', input);
    expect(argvs.map((argv) => argv.length - 4)).toEqual([1, 256, 256, 88]);
    expect(argvs[0]).toEqual(['send-keys', '-t', '$7', '-X', 'cancel']);
    expect(Buffer.from(hexOf(argvs).join(''), 'hex').equals(input)).toBe(true);
    for (const argv of argvs.slice(1)) expect(argv.slice(0, 4)).toEqual(['send-keys', '-t', '$7', '-H']);
  });

  it('is exact at the boundary: 256 bytes are one command, 257 are two, none is the cancel alone', () => {
    expect(typedSequence('$1', new Uint8Array(256))).toHaveLength(2);
    expect(typedSequence('$1', new Uint8Array(257))).toHaveLength(3);
    expect(typedSequence('$1', new Uint8Array(0))).toEqual([['send-keys', '-t', '$1', '-X', 'cancel']]);
  });

  it('composes only argvs the table admits, as cancel then type-bytes, over every byte value', () => {
    const every = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const argvs = typedSequence('$42', Buffer.concat([every, Buffer.from('日本 a\x1bOA\x03', 'utf8')]));
    const shapes = argvs.map((argv) => {
      const verdict = admitScrollArgv(argv);
      expect(verdict, argv.slice(0, 5).join(' ')).toMatchObject({ ok: true });
      return verdict.ok ? verdict.shape : null;
    });
    expect(shapes[0]).toBe('cancel');
    expect(shapes.slice(1).every((shape) => shape === 'type-bytes')).toBe(true);
    for (const hex of hexOf(argvs)) expect(hex).toMatch(/^[0-9a-f]{2}$/);
  });

  it('crosses the guarded runner as one quoted line per command, in call order', () => {
    const lines: string[] = [];
    const run = guardedScrollRunner({
      send: (line) => {
        lines.push(line);
        return Promise.resolve([]);
      },
      isCurrent: () => true,
      server: 'machine:rig'
    });
    for (const argv of typedSequence('$3', Buffer.from('ab', 'utf8'))) void run(argv).catch(() => undefined);
    expect(lines).toEqual(['send-keys -t $3 -X cancel', 'send-keys -t $3 -H 61 62']);
  });
});

/** One byte of the pinned format changed, never added or taken away. */
const FORMAT_ONE_BYTE_OFF = REMOTE_STATE_FORMAT.replace('pane_height', 'pane_heighT');

/** The hostile corpus: every refused kind of §3.1 and §3.8. Held here, not imported. */
const HOSTILE: readonly (readonly unknown[])[] = [
  // Key names outside the eighth row's closed list, literal text, the other
  // send-keys flags. (`send-keys -t $1 Enter` was here until Phase 337: it is
  // the eighth row now, on his word of 2026-10-05, and the eighth row's own
  // edges are below.)
  ['send-keys', '-t', '$1', '-l', 'abc'],
  ['send-keys', '-t', '$1', 'q'],
  ['send-keys', '-t', '$1', '-K', 'a'],
  ['send-keys', '-t', '$1', '-M'],
  ['send-keys', '-t', '$1', '-R'],
  // copy-pipe, which runs a program from copy mode.
  ['send-keys', '-t', '$1', '-X', 'copy-pipe-and-cancel', 'touch /tmp/p3201-ran'],
  ['send-keys', '-t', '$1', '-X', 'copy-pipe', 'touch /tmp/p3201-ran'],
  ['send-keys', '-t', '$1', '-X', 'copy-pipe-no-clear', 'touch /tmp/p3201-ran'],
  ['send-keys', '-t', '$1', '-X', 'copy-pipe-and-cancel'],
  // Other -X commands.
  ['send-keys', '-t', '$1', '-X', 'search-backward', 'x'],
  ['send-keys', '-t', '$1', '-X', '-N', '5', 'page-up'],
  ['send-keys', '-t', '$1', '-X', 'scroll-up'],
  // Formats: a program in one, one byte off, one short, one long, none.
  ['display-message', '-p', '-t', '$1', '-F', '#(touch /tmp/p3201-ran)'],
  ['display-message', '-p', '-t', '$1', '-F', FORMAT_ONE_BYTE_OFF],
  ['display-message', '-p', '-t', '$1', '-F', REMOTE_STATE_FORMAT.slice(0, -1)],
  ['display-message', '-p', '-t', '$1', '-F', `${REMOTE_STATE_FORMAT} `],
  ['display-message', '-p', '-t', '$1', '-F', `${REMOTE_STATE_FORMAT}#(touch /tmp/p3201-ran)`],
  ['display-message', '-p', '-t', '$1', REMOTE_STATE_FORMAT],
  ['display-message', '-t', '$1', '-p', '-F', REMOTE_STATE_FORMAT],
  ['display-message', '-p', '-t', '$1', '-F', REMOTE_STATE_FORMAT, 'extra'],
  // This Mac's tab-separated read, which a machine may answer as underscores.
  ['display-message', '-p', '-t', '$1', '-F', STATE_FORMAT],
  // Counts that are not plain whole numbers in range.
  ['send-keys', '-t', '$1', '-X', '-N', '0', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '2001', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '1e3', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', ' 5', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '+5', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '-5', 'scroll-down'],
  ['send-keys', '-t', '$1', '-X', '-N', '٥', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '05', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '0x5', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '5.0', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', '-N', '5\n', 'scroll-up'],
  ['send-keys', '-t', '$1', '-X', 'goto-line', '-1'],
  ['send-keys', '-t', '$1', '-X', 'goto-line', '2147483648'],
  ['send-keys', '-t', '$1', '-X', 'goto-line', '1e3'],
  // Targets that are not a session's immutable id.
  ['send-keys', '-t', '$1 ; kill-server', '-X', 'cancel'],
  ['send-keys', '-t', '%1', '-X', 'cancel'],
  ['send-keys', '-t', '=name', '-X', 'cancel'],
  ['send-keys', '-t', 'name', '-X', 'cancel'],
  ['send-keys', '-t', '$01', '-X', 'cancel'],
  ['send-keys', '-t', '$1234567890', '-X', 'cancel'],
  ['send-keys', '-t', '$-1', '-X', 'cancel'],
  ['send-keys', '-t', '$1\n', '-X', 'cancel'],
  ['copy-mode', '-e', '-t', '@1'],
  // One element more, one fewer, other flags and orders.
  ['send-keys', '-t', '$1', '-X', 'cancel', 'extra'],
  ['send-keys', '-t', '$1', '-X'],
  ['copy-mode', '-e', '-t'],
  ['copy-mode', '-e', '-t', '$1', '-u'],
  ['copy-mode', '-u', '-t', '$1'],
  ['copy-mode', '-t', '$1', '-e'],
  ['send-keys', '-e', '-t', '$1', '-X', 'cancel'],
  ['send-keys', '-c', '/tmp', '-t', '$1', '-X'],
  ['send-keys', '-X', '-t', '$1', 'cancel'],
  ['send-keys', '-t', '$1', '-X', 'CANCEL'],
  // Other verbs and chains.
  [';'],
  ['kill-server'],
  ['run-shell', 'touch /tmp/p3201-ran'],
  ['copy-mode', '-e', '-t', '$1', ';', 'kill-server'],
  [],
  // Not strings at all.
  ['send-keys', '-t', 1, '-X', 'cancel'],
  ['send-keys', '-t', '$1', '-X', '-N', 5, 'scroll-up'],
  // THE SEVENTH ROW'S EDGES (build/p3201/SPEC.md §6.3): `-H` with no byte and
  // with 257, a byte in any other spelling, a key name after it, the other
  // send-keys flags beside it, `-H` before `-t`, and every target that is not
  // a session's immutable id.
  ['send-keys', '-t', '$1', '-H'],
  ['send-keys', '-t', '$1', '-H', ...Array.from({ length: 257 }, () => '61')],
  ['send-keys', '-t', '$1', '-H', '6'],
  ['send-keys', '-t', '$1', '-H', '061'],
  ['send-keys', '-t', '$1', '-H', '6A'],
  ['send-keys', '-t', '$1', '-H', '0x61'],
  ['send-keys', '-t', '$1', '-H', '-1'],
  ['send-keys', '-t', '$1', '-H', '100'],
  ['send-keys', '-t', '$1', '-H', 'Enter'],
  ['send-keys', '-t', '$1', '-H', '61', 'Enter'],
  ['send-keys', '-t', '$1', '-H', '61', 'C-c'],
  ['send-keys', '-t', '$1', '-H', '61', ';', 'kill-server'],
  ['send-keys', '-t', '$1', '-H', ' 61'],
  ['send-keys', '-t', '$1', '-H', '61 '],
  ['send-keys', '-t', '$1', '-H', '６１'],
  ['send-keys', '-t', '$1', '-H', 0x61],
  ['send-keys', '-t', '$1', '-H', '-l', '61'],
  ['send-keys', '-t', '$1', '-l', '-H', '61'],
  ['send-keys', '-t', '$1', '-H', '-K', '61'],
  ['send-keys', '-t', '$1', '-H', '-M', '61'],
  ['send-keys', '-t', '$1', '-H', '-R', '61'],
  ['send-keys', '-t', '$1', '-H', '-X', 'cancel'],
  ['send-keys', '-t', '$1', '-X', '-H', '61'],
  ['send-keys', '-H', '-t', '$1', '61'],
  ['send-keys', '-H', '61', '-t', '$1'],
  ['send-keys', '-t', 'name', '-H', '61'],
  ['send-keys', '-t', '%1', '-H', '61'],
  ['send-keys', '-t', '=name', '-H', '61'],
  ['send-keys', '-t', '$01', '-H', '61'],
  ['send-keys', '-t', '$1 ; kill-server', '-H', '61'],
  // THE EIGHTH ROW'S EDGES (build/p337/SPEC.md D20, §6.3): a name not on the
  // list, two names, a flag before or after the name, -X or -H with a name,
  // `;`, and every target that is not a session's immutable id.
  ['send-keys', '-t', '$1', 'M-x'],
  ['send-keys', '-t', '$1', 'C-Up'],
  ['send-keys', '-t', '$1', 'F1'],
  ['send-keys', '-t', '$1', 'Up', 'Down'],
  ['send-keys', '-t', '$1', 'Enter', ';', 'kill-server'],
  ['send-keys', '-t', '$1', '-l', 'Up'],
  ['send-keys', '-t', '$1', 'Up', '-l'],
  ['send-keys', '-t', '$1', '-X', 'Up'],
  ['send-keys', '-t', '$1', '-H', 'Up'],
  ['send-keys', '-t', '$1', 'C-c;'],
  ['send-keys', '-t', '$1', 'Enter\n'],
  ['send-keys', '-t', '$1', ''],
  ['send-keys', 'Up', '-t', '$1'],
  ['send-keys', '-t', '%1', 'Up'],
  ['send-keys', '-t', '=name', 'Up'],
  ['send-keys', '-t', 'name', 'Up'],
  ['send-keys', '-t', '$01', 'Up'],
  ['send-keys', '-t', '$1 ; kill-server', 'Up'],
  ['send-keys', '-t', '$1', 0x0d]
];

describe('the hostile corpus', () => {
  it('holds at least forty argvs', () => {
    expect(HOSTILE.length).toBeGreaterThanOrEqual(40);
  });

  for (const argv of HOSTILE) {
    it(`refuses ${JSON.stringify(argv)}`, () => {
      const verdict = admitScrollArgv(argv);
      expect(verdict.ok).toBe(false);
      if (verdict.ok) return;
      // The reason is a short clause and never carries the argv's own text.
      expect(verdict.reason.length).toBeLessThan(80);
      for (const element of argv) {
        if (typeof element === 'string' && element.length > 3) {
          expect(verdict.reason.includes(element)).toBe(false);
        }
      }
    });
  }
});

describe('the guarded runner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is ordered, names its server, and writes the quoted line', async () => {
    const lines: string[] = [];
    const run = guardedScrollRunner({
      send: (line) => {
        lines.push(line);
        return Promise.resolve(['1 7 9000 40 0 0 120 ']);
      },
      isCurrent: () => true,
      server: 'machine:rig'
    });
    expect(run.ordered).toBe(true);
    expect(run.server).toBe('machine:rig');
    const argv = ['display-message', '-p', '-t', '$3', '-F', REMOTE_STATE_FORMAT];
    expect(await run(argv)).toBe('1 7 9000 40 0 0 120 ');
    expect(lines).toEqual([argv.map(quoteTmuxArg).join(' ')]);
  });

  it('calls send ZERO times for every hostile argv', async () => {
    let sends = 0;
    const run = guardedScrollRunner({
      send: () => {
        sends += 1;
        return Promise.resolve([]);
      },
      isCurrent: () => true,
      server: 'machine:rig'
    });
    for (const argv of HOSTILE) {
      const err = await run(argv as readonly string[]).then(
        () => null,
        (one: unknown) => one as { payload?: { code?: string } }
      );
      expect(err?.payload?.code, JSON.stringify(argv)).toBe('INVALID_INPUT');
    }
    expect(sends).toBe(0);
  });

  it('calls send ZERO times when the connection moved, and checks the table first', async () => {
    let sends = 0;
    let current = false;
    const order: string[] = [];
    const run = guardedScrollRunner({
      send: () => {
        sends += 1;
        order.push('send');
        return Promise.resolve([]);
      },
      isCurrent: () => {
        order.push('isCurrent');
        return current;
      },
      server: 'machine:rig'
    });
    const moved = await run(['send-keys', '-t', '$3', '-X', 'cancel']).catch(
      (one: unknown) => one as { payload?: { code?: string } }
    );
    expect(moved).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
    expect(sends).toBe(0);
    // A hostile argv is refused before the currency test is even asked.
    order.length = 0;
    await run(['send-keys', '-t', '%1', '-X', 'cancel']).catch(() => undefined);
    expect(order).toEqual([]);
    current = true;
    await run(['send-keys', '-t', '$3', '-X', 'cancel']);
    expect(order).toEqual(['isCurrent', 'send']);
    expect(sends).toBe(1);
  });

  it('writes the list it checked, read once, never a second read of the caller\'s', async () => {
    // Found by the integrator's re-derivation: a list whose elements read one
    // way at the check and another at the write passed the table as `cancel`
    // and crossed as `copy-pipe-and-cancel` on a target with a `;` in it.
    const lines: string[] = [];
    let checked = false;
    const run = guardedScrollRunner({
      send: (line) => {
        lines.push(line);
        return Promise.resolve([]);
      },
      isCurrent: () => {
        checked = true;
        return true;
      },
      server: 'machine:rig'
    });
    const shifty = new Proxy(['send-keys', '-t', '$3', '-X', 'cancel'], {
      get(target, prop, receiver) {
        if (checked && prop === '2') return '$3 ; run-shell "touch /tmp/x"';
        if (checked && prop === '4') return 'copy-pipe-and-cancel';
        return Reflect.get(target, prop, receiver) as unknown;
      }
    });
    await run(shifty);
    expect(lines).toEqual(['send-keys -t $3 -X cancel']);
  });

  it('writes in the call itself, so a pipelined sequence leaves in call order', () => {
    const lines: string[] = [];
    const run = guardedScrollRunner({
      send: (line) => {
        lines.push(line);
        return new Promise<readonly string[]>(() => undefined);
      },
      isCurrent: () => true,
      server: 'machine:rig'
    });
    void run(['copy-mode', '-e', '-t', '$3']).catch(() => undefined);
    void run(['send-keys', '-t', '$3', '-X', '-N', '5', 'scroll-up']).catch(() => undefined);
    // No await between the two calls and the read below.
    expect(lines).toEqual(['copy-mode -e -t $3', 'send-keys -t $3 -X -N 5 scroll-up']);
  });

  it('answers the caller at the deadline and leaves the late answer handled', async () => {
    vi.useFakeTimers();
    const late: { resolve: (lines: readonly string[]) => void; reject: (err: Error) => void }[] = [];
    const run = guardedScrollRunner({
      send: () =>
        new Promise<readonly string[]>((resolve, reject) => {
          late.push({ resolve, reject });
        }),
      isCurrent: () => true,
      server: 'machine:rig'
    });
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const first = run(['send-keys', '-t', '$3', '-X', 'cancel']).catch(
        (one: unknown) => one as { payload?: { code?: string } }
      );
      const second = run(['send-keys', '-t', '$3', '-X', 'top-line']).catch(
        (one: unknown) => one as { payload?: { code?: string } }
      );
      let settled = false;
      void first.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(REMOTE_SCROLL_DEADLINE_MS - 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await first).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
      expect(await second).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
      // The late answers arrive, one a block and one a failure. Nobody is
      // listening any more, and nothing escapes to the process.
      late[0]?.resolve(['late']);
      late[1]?.reject(new Error('late failure'));
      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('is 5,000 ms by default, the control plane precheck value it names', async () => {
    const { CONTROL_PRECHECK_TIMEOUT_MS } = await import('../control-plane');
    expect(REMOTE_SCROLL_DEADLINE_MS).toBe(5_000);
    expect(REMOTE_SCROLL_DEADLINE_MS).toBe(CONTROL_PRECHECK_TIMEOUT_MS);
  });
});
