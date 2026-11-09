/**
 * Unit tests for the pane scroll controller (Phase 12.3).
 *
 * The runner is injected, so the whole module is testable without a tmux
 * server; the recorded argv is the contract these tests actually pin, because
 * a wrong flag here is the difference between scrolling and "not in a mode".
 *
 * Runner: vitest (`npm test`).
 */

import { beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as scrollModule from '../scroll';
import { isDiscarding } from '../../scrollback/watch';
import {
  exitPaneScroll,
  readPaneScroll,
  REFREEZE_READ_FORMAT,
  refreezeWanted,
  REMOTE_STATE_FORMAT,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
  STATE_FORMAT,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../scroll';

// `goto-line` support is probed once per process and latched, so every test
// starts from "not yet probed" rather than inheriting the previous one's
// verdict (which would make the fallback suite order-dependent).
beforeEach(() => resetSeekSupportForTests());

/**
 * `display-message -F` output: in_mode, position, history, rows, alt, mouse,
 * and the pane's width last (Phase 292).
 */
function state(
  inMode: string,
  position: string,
  history: string,
  rows = '40',
  alt = '0',
  mouse = '0',
  cols = '120'
): string {
  return [inMode, position, history, rows, alt, mouse, cols].join('\t') + '\n';
}

/** What `cursorToTopRow` sends, which follows every scroll that parks. */
const TOP_LINE = ['send-keys', '-t', '$3', '-X', 'top-line'];

/** A runner that records argv and replays scripted display-message output. */
function recorder(
  outputs: string[]
): { run: TmuxScrollRunner; calls: string[][] } {
  const calls: string[][] = [];
  let next = 0;
  const run: TmuxScrollRunner = async (args) => {
    calls.push([...args]);
    if (args[0] !== 'display-message') return '';
    return outputs[Math.min(next++, outputs.length - 1)] ?? '';
  };
  return { run, calls };
}

describe('readPaneScroll', () => {
  it('parses the state and treats an empty scroll_position as live', async () => {
    const { run } = recorder([state('0', '', '120')]);
    assert.deepEqual(await readPaneScroll(run, '$3'), {
      position: 0,
      history: 120,
      rows: 40,
      cols: 120,
      frameHistory: null,
      inMode: false,
      innerAlt: false,
      innerMouse: false
    });
  });

  it('reports NO history for an alt-screen app', async () => {
    // MEASURED: copy-mode over vim shows blank `~` rows — an alternate screen
    // never enters tmux history, so the shell's 283 lines underneath are not
    // reachable and must not be advertised as scrollable.
    const { run } = recorder([state('0', '', '283', '40', '1', '0')]);
    const s = await readPaneScroll(run, '$3');
    assert.equal(s.history, 0);
    assert.equal(s.innerAlt, true);
  });

  it('keeps the history for a pane ALREADY scrolled back when the app opened its alt screen', async () => {
    // Phase 292. Copy mode reads the frame it froze at entry, which is the
    // ordinary screen: measured on 3.6a and 3.7b, row 0 held "line 294",
    // scroll-up 5 showed "line 289" and the history stood at 434 throughout.
    // Answering 0 here took the thumb away from a reader who was still parked.
    const { run } = recorder([state('1', '100', '434', '40', '1', '0')]);
    const s = await readPaneScroll(run, '$3');
    assert.equal(s.history, 434);
    assert.equal(s.position, 100);
    assert.equal(s.innerAlt, true);
  });

  it('reads the width last, and answers 0 when an older format carried none', async () => {
    const wide = recorder([state('0', '', '120', '40', '0', '0', '152')]);
    assert.equal((await readPaneScroll(wide.run, '$3')).cols, 152);
    const old = recorder([['0', '', '120', '40', '0', '0'].join('\t') + '\n']);
    assert.equal((await readPaneScroll(old.run, '$3')).cols, 0);
  });

  it('reads the frozen frame\'s depth from copy_position_limit, in copy mode and only there', async () => {
    // Phase 292's fix round. tmux 3.7b answers the depth of the frame copy
    // mode reads; 3.6a answers the format empty.
    const line = (fields: string[]): string => fields.join('\t') + '\n';
    const parked = recorder([
      line(['1', '100', '2881', '40', '0', '0', '120', '2831'])
    ]);
    const s = await readPaneScroll(parked.run, '$3');
    assert.equal(s.frameHistory, 2831);
    assert.equal(s.history, 2881);
    // The format is asked for, last, in the one display-message.
    assert.match(parked.calls[0]?.join(' ') ?? '', /#\{pane_width\}\t#\{copy_position_limit\}$/);
    // 3.6a: copy mode, and the format empty.
    const older = recorder([line(['1', '100', '2881', '40', '0', '0', '120', ''])]);
    assert.equal((await readPaneScroll(older.run, '$3')).frameHistory, null);
    // Live: whatever a format says, there is no frame.
    const live = recorder([line(['0', '', '2881', '40', '0', '0', '120', '2831'])]);
    assert.equal((await readPaneScroll(live.run, '$3')).frameHistory, null);
    // A line from a format with no eighth field, and a garbled one.
    const short = recorder([state('1', '100', '2881')]);
    assert.equal((await readPaneScroll(short.run, '$3')).frameHistory, null);
    const garbled = recorder([line(['1', '100', '2881', '40', '0', '0', '120', '12x'])]);
    assert.equal((await readPaneScroll(garbled.run, '$3')).frameHistory, null);
  });

  it('reads it in the mode it means the frame\'s depth: the app\'s tmux config never sets copy-mode-line-numbers', () => {
    // In tmux 3.7b's window-copy.c, `copy_position_limit` is the backing
    // screen's history only while the line number mode is off or default; the
    // absolute, relative and hybrid modes add the screen's height to it.
    const conf = readFileSync(join(__dirname, '../../../../resources/gmux-tmux.conf'), 'utf8');
    assert.match(conf, /copy-mode-position-format/);
    assert.doesNotMatch(conf, /copy-mode-line-numbers/);
  });

  it('surfaces the inner app mouse flag', async () => {
    const { run } = recorder([state('0', '', '10', '40', '1', '1')]);
    assert.equal((await readPaneScroll(run, '$3')).innerMouse, true);
  });

  it('never yields NaN from garbage output', async () => {
    const { run } = recorder(['nonsense\n']);
    const s = await readPaneScroll(run, '$3');
    assert.equal(s.position, 0);
    assert.equal(s.history, 0);
  });
});

describe('scrollPaneBy', () => {
  it('enters copy-mode then scrolls up by whole lines', async () => {
    const { run, calls } = recorder([state('1', '7', '120')]);
    const s = await scrollPaneBy(run, '$3', 7);
    assert.deepEqual(calls[0], ['copy-mode', '-e', '-t', '$3']);
    assert.deepEqual(calls[1], [
      'send-keys', '-t', '$3', '-X', '-N', '7', 'scroll-up'
    ]);
    // Phase 292. The copy cursor goes to the top row, so tmux keeps the
    // reader's top line across a resize by itself, and only then the read.
    assert.deepEqual(calls[2], TOP_LINE);
    assert.equal(calls[3]?.[0], 'display-message');
    assert.equal(calls.length, 4);
    assert.equal(s.position, 7);
  });

  it('scrolls DOWN without entering copy-mode', async () => {
    // `copy-mode -e` exits by itself at the bottom, so scrolling toward live
    // must never re-enter it — that would trap the pane one line above live.
    const { run, calls } = recorder([state('1', '16', '120')]);
    await scrollPaneBy(run, '$3', -4);
    assert.deepEqual(calls[0], [
      'send-keys', '-t', '$3', '-X', '-N', '4', 'scroll-down'
    ]);
    // scroll, the cursor to the top row, read: no copy-mode.
    assert.deepEqual(calls[1], TOP_LINE);
    assert.equal(calls.length, 3);
    assert.ok(!calls.some((c) => c[0] === 'copy-mode'));
  });

  it('places no cursor when the scroll DOWN found the pane already live', async () => {
    const calls: string[][] = [];
    const run: TmuxScrollRunner = async (args) => {
      calls.push([...args]);
      if (args.includes('scroll-down')) throw new Error('not in a mode');
      return state('0', '', '120');
    };
    await scrollPaneBy(run, '$3', -4);
    assert.ok(!calls.some((c) => c.includes('top-line')));
    assert.equal(calls.length, 2);
  });

  it('swallows "not in a mode" from the cursor when the scroll DOWN left copy mode', async () => {
    // `-e` leaves copy mode at the bottom, and then there is no copy cursor.
    const run: TmuxScrollRunner = async (args) => {
      if (args.includes('top-line')) throw new Error('not in a mode');
      return args[0] === 'display-message' ? state('0', '', '120') : '';
    };
    assert.equal((await scrollPaneBy(run, '$3', -400)).position, 0);
  });

  it('tolerates "not in a mode" when already live', async () => {
    const calls: string[][] = [];
    const run: TmuxScrollRunner = async (args) => {
      calls.push([...args]);
      if (args[0] === 'send-keys') throw new Error('not in a mode');
      return state('0', '', '120');
    };
    assert.equal((await scrollPaneBy(run, '$3', -4)).position, 0);
  });

  it('a zero delta only reads', async () => {
    const { run, calls } = recorder([state('0', '', '120')]);
    await scrollPaneBy(run, '$3', 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], 'display-message');
  });
});

describe('enterCopyModeArgs, the one entry (Phase 342, build/p342/SPEC.md D11)', () => {
  /** A machine's runner: the strict space-separated read, parked at 7. */
  function farRecorder(ordered: boolean): { run: TmuxScrollRunner; calls: string[][] } {
    const calls: string[][] = [];
    const fn = async (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      return args[0] === 'display-message' ? '1 7 9000 40 0 0 120 \n' : '';
    };
    const run: TmuxScrollRunner = ordered
      ? Object.assign(fn, { ordered: true as const, server: 'machine:far' })
      : Object.assign(fn, { server: 'machine:far' });
    return { run, calls };
  }

  it('answers today\'s four elements for this Mac\'s runner, which names no server', () => {
    const { run } = recorder([state('0', '', '10')]);
    assert.deepEqual(scrollModule.enterCopyModeArgs(run, '$3'), ['copy-mode', '-e', '-t', '$3']);
  });

  it('answers -H between -e and -t for a runner that names a server, ordered or not', () => {
    for (const ordered of [false, true]) {
      const { run } = farRecorder(ordered);
      assert.deepEqual(scrollModule.enterCopyModeArgs(run, '$9'), [
        'copy-mode',
        '-e',
        '-H',
        '-t',
        '$9'
      ]);
    }
  });

  it('is what all four entry sites send, on both kinds of runner', async () => {
    const entries = (calls: string[][]): string[][] => calls.filter((c) => c[0] === 'copy-mode');
    for (const ordered of [false, true]) {
      // scrollPaneBy up (serial and pipelined), and the seek (serial and pipelined).
      for (const drive of [
        (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 5),
        (run: TmuxScrollRunner) => scrollPaneTo(run, '$3', 50)
      ]) {
        resetSeekSupportForTests();
        const far = farRecorder(ordered);
        await drive(far.run);
        assert.deepEqual(entries(far.calls), [['copy-mode', '-e', '-H', '-t', '$3']]);
        resetSeekSupportForTests();
        const here = recorder([state('1', '7', '9000')]);
        await drive(here.run);
        assert.deepEqual(entries(here.calls), [['copy-mode', '-e', '-t', '$3']]);
      }
    }
  });

  it('is the only place scroll.ts spells copy-mode or -H', () => {
    const source = readFileSync(join(__dirname, '..', 'scroll.ts'), 'utf8');
    const start = source.indexOf('export function enterCopyModeArgs(');
    assert.ok(start > 0);
    const end = source.indexOf('\n}\n', start);
    const body = source.slice(start, end);
    const outside = source.slice(0, start) + source.slice(end);
    assert.equal(body.split("'copy-mode'").length - 1, 2);
    assert.equal(body.split("'-H'").length - 1, 1);
    assert.equal(outside.split("'copy-mode'").length - 1, 0);
    assert.equal(outside.split("'-H'").length - 1, 0);
    // And it is called at the four sites.
    assert.equal(outside.split('enterCopyModeArgs(run, target)').length - 1, 4);
  });
});

describe('scrollPaneTo', () => {
  it('SEEKS to the absolute offset instead of walking to it', async () => {
    // Phase 13.7. The old implementation issued one `-N <delta> scroll-up`,
    // which tmux runs as a per-line loop: 3,958 ms at 200k lines, with the
    // whole single-threaded server — every other session, and the 1 Hz
    // activity poll — blocked for 3,895 ms of it.
    const { run, calls } = recorder([state('1', '20', '300')]);
    await scrollPaneTo(run, '$3', 50);
    assert.deepEqual(calls[1], ['copy-mode', '-e', '-t', '$3']);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', 'goto-line', '50'
    ]);
    // Phase 292. A drag parks the pane too, so the cursor follows the seek.
    assert.deepEqual(calls[3], TOP_LINE);
    assert.ok(!calls.some((c) => c.includes('scroll-up')));
  });

  it('costs the SAME number of commands at 200,000 lines as at 50', async () => {
    // The whole point: constant work, so depth cannot buy latency.
    const shallow = recorder([state('1', '0', '50')]);
    await scrollPaneTo(shallow.run, '$3', 50);
    resetSeekSupportForTests();
    const deep = recorder([state('1', '0', '200000')]);
    await scrollPaneTo(deep.run, '$3', 200000);
    assert.equal(deep.calls.length, shallow.calls.length);
    assert.deepEqual(deep.calls[2], [
      'send-keys', '-t', '$3', '-X', 'goto-line', '200000'
    ]);
  });

  it('clamps a scrub past the top to the history size', async () => {
    const { run, calls } = recorder([state('1', '20', '300')]);
    await scrollPaneTo(run, '$3', 9999);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', 'goto-line', '300'
    ]);
  });

  it('position 0 cancels copy-mode instead of scrolling', async () => {
    // `goto-line 0` parks at the bottom but LEAVES the pane in copy-mode
    // (verified on 3.6a: `#{pane_in_mode}` is still 1 afterwards), so the
    // only correct way back to live output is still an explicit cancel.
    const { run, calls } = recorder([state('0', '', '300')]);
    await scrollPaneTo(run, '$3', 0);
    assert.deepEqual(calls[0], ['send-keys', '-t', '$3', '-X', 'cancel']);
  });

  it('never seeks under an alt-screen app', async () => {
    // history reads 0 for an inner alt screen — there is nothing to reach.
    const { run, calls } = recorder([state('0', '', '283', '40', '1', '0')]);
    await scrollPaneTo(run, '$3', 100);
    assert.ok(!calls.some((c) => c.includes('goto-line')));
  });

  it('does nothing when the drag re-sends the offset it is already on', async () => {
    const { run, calls } = recorder([state('1', '50', '300')]);
    await scrollPaneTo(run, '$3', 50);
    assert.equal(calls.length, 1);
  });
});

describe('scroll fallback (a tmux without goto-line)', () => {
  /** Recorder whose `send-keys -X goto-line` always fails. */
  function noGotoLine(out: string): { run: TmuxScrollRunner; calls: string[][] } {
    const calls: string[][] = [];
    const run: TmuxScrollRunner = async (args) => {
      calls.push([...args]);
      if (args.includes('goto-line')) throw new Error('unknown command');
      return args[0] === 'display-message' ? out : '';
    };
    return { run, calls };
  }

  it('falls back to a CHUNKED relative scroll, never one huge one', async () => {
    // Same total work, sliced, so the server gets a service window between
    // slices instead of one multi-second freeze.
    const { run, calls } = noGotoLine(state('1', '0', '200000'));
    await scrollPaneTo(run, '$3', 5000);
    const scrolls = calls.filter((c) => c.includes('scroll-up'));
    assert.deepEqual(
      scrolls.map((c) => c[5]),
      ['2000', '2000', '1000']
    );
  });

  it('probes goto-line ONCE, then stops paying for the failure', async () => {
    const { run, calls } = noGotoLine(state('1', '0', '9000'));
    await scrollPaneTo(run, '$3', 3000);
    await scrollPaneTo(run, '$3', 6000);
    assert.equal(calls.filter((c) => c.includes('goto-line')).length, 1);
  });
});

describe('a huge relative scroll', () => {
  it('is re-expressed as a seek rather than walked line by line', async () => {
    // No caller produces one of these today: the one that could, the deleted
    // `anchorPaneScroll` after an agent dumped tens of thousands of lines
    // between polls, is gone (Phase 292). `lines` still arrives over IPC as
    // any number, so the guard is pinned whoever sends it.
    const { run, calls } = recorder([state('1', '100', '90000')]);
    await scrollPaneBy(run, '$3', 40000);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', 'goto-line', '40100'
    ]);
  });

  it('leaves the wheel and page steps on the relative path', async () => {
    const { run, calls } = recorder([state('1', '41', '9000')]);
    await scrollPaneBy(run, '$3', 41);
    assert.deepEqual(calls[1], [
      'send-keys', '-t', '$3', '-X', '-N', '41', 'scroll-up'
    ]);
  });
});

/**
 * THE CORRECTION CANNOT QUIETLY COME BACK (Phase 292).
 *
 * Pull request 30 deleted `anchorPaneScroll` and the `anchorFrom` field that
 * asked for it, because the 250 ms correction they made was the thing sliding
 * a reader's page; `../scroll.ts`'s `scrollPaneTo` carries the account. The
 * belief it was built on reads as common sense and was held from Phase 12.3
 * on, so a later round WILL be tempted, and a deletion nothing pins is one
 * tidy refactor from being undone. This reads the five files the mechanism
 * crossed as text, comments taken out, because every one of them now names
 * both identifiers in the prose that explains why they are gone.
 *
 * The rule is proved able to fail on the shapes main shipped, below, so a
 * green here is not the rule having stopped looking.
 */
const REPO_ROOT = join(__dirname, '../../../..');

/** Each file the correction crossed, and a line that proves it was the file read. */
const CORRECTION_PATH: ReadonlyArray<{ file: string; mustStillHold: RegExp }> = [
  { file: 'src/main/tmux/scroll.ts', mustStillHold: /export async function readPaneScroll\(/ },
  { file: 'src/main/tmux/index.ts', mustStillHold: /\breadPaneScroll\b/ },
  { file: 'src/main/sessions/core.ts', mustStillHold: /tmux\.readPaneScroll\(/ },
  { file: 'src/shared/ipc/terminal.ts', mustStillHold: /export interface TerminalScrollPollInput\b/ },
  { file: 'src/renderer/terminal/scroll/surface.ts', mustStillHold: /\bapi\.state\(/ }
];

const DELETED_NAMES = /\b(?:anchorPaneScroll|anchorFrom)\b/g;

/**
 * `source` with its comments taken out, by a walk that knows a string from a
 * comment (the shape `p289-focus-terminal.test.ts` settled on, after two
 * regular expressions read `//` inside a string as a comment).
 */
function stripComments(source: string): string {
  let out = '';
  let quote: string | null = null;
  let i = 0;
  while (i < source.length) {
    const c = source.charAt(i);
    const next = source.charAt(i + 1);
    if (quote !== null) {
      out += c;
      if (c === '\\') {
        out += next;
        i += 2;
        continue;
      }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      // Its line breaks are kept, so a finding names the line of the FILE.
      out += ` ${source.slice(i, stop).replace(/[^\n]/g, '')}`;
      i = stop;
      continue;
    }
    if (c === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    out += c;
    i += 1;
  }
  return out;
}

/** Every time CODE names the deleted correction, as `name at line N` of the file. */
function correctionNamedIn(source: string): string[] {
  const found: string[] = [];
  stripComments(source)
    .split('\n')
    .forEach((line, index) => {
      for (const m of line.matchAll(DELETED_NAMES)) {
        found.push(`${m[0]} at line ${String(index + 1)}`);
      }
    });
  return found;
}

describe('the deleted correction stays deleted (Phase 292)', () => {
  it('the module exports no anchorPaneScroll', () => {
    assert.equal('anchorPaneScroll' in scrollModule, false);
  });

  for (const { file, mustStillHold } of CORRECTION_PATH) {
    it(`${file} names neither anchorPaneScroll nor anchorFrom in code`, () => {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
      // A pin over a file that moved reads nothing and passes for ever.
      assert.match(source, mustStillHold);
      assert.deepEqual(correctionNamedIn(source), []);
    });
  }

  it('the rule is red on the shapes main shipped, and blind to prose', () => {
    // src/main/tmux/scroll.ts at ac011d9d.
    assert.deepEqual(
      correctionNamedIn(
        'export async function anchorPaneScroll(\n  run: TmuxScrollRunner\n) {}\n'
      ),
      ['anchorPaneScroll at line 1']
    );
    // src/main/tmux/index.ts at ac011d9d.
    assert.deepEqual(
      correctionNamedIn('export {\n  readPaneScroll,\n  anchorPaneScroll,\n};\n'),
      ['anchorPaneScroll at line 3']
    );
    // src/renderer/terminal/scroll/surface.ts at ac011d9d, the send itself.
    assert.deepEqual(
      correctionNamedIn(
        'api.state({\n  sessionId: this.sessionId,\n' +
          '  ...(anchorFrom !== undefined ? { anchorFrom } : {})\n})\n'
      ),
      ['anchorFrom at line 3', 'anchorFrom at line 3']
    );
    // src/shared/ipc/terminal.ts at ac011d9d, the field under its comment.
    assert.deepEqual(
      correctionNamedIn('/** History the caller last rendered. */\n  anchorFrom?: number;\n'),
      ['anchorFrom at line 2']
    );
    // What the tree says today, in both comment shapes, is not a finding.
    assert.deepEqual(
      correctionNamedIn(
        '/** `anchorPaneScroll` and `anchorFrom` were deleted. */\n' +
          '// the poll used to send anchorFrom\nconst poll = 1;\n'
      ),
      []
    );
  });
});

// ---------------------------------------------------------------------------
// PHASE 294. The way back down passes through what printed while you read.
// ---------------------------------------------------------------------------

/**
 * A parked pane the decision should re-freeze: three lines above the bottom
 * of a frame 400 lines deep, while the live history grew to 520, under the
 * default limit. Every row of the table below changes ONE thing from it.
 */
const PARKED: PaneScrollState = {
  position: 3,
  history: 520,
  rows: 40,
  cols: 120,
  frameHistory: 400,
  inMode: true,
  innerAlt: false,
  innerMouse: false
};

/** The decision's table: a state, a limit, a notch, the answer, and which clause the row owns. */
const DECISION_ROWS: ReadonlyArray<{
  name: string;
  state: PaneScrollState;
  limit: number | null;
  n: number;
  want: boolean;
  owns?: string;
}> = [
  { name: 'parked, the frame lags, the notch reaches its bottom', state: PARKED, limit: 25_000, n: -3, want: true },
  { name: 'a notch exactly to the bottom', state: { ...PARKED, position: 3 }, limit: 25_000, n: -3, want: true },
  { name: 'at the bottom already, still in copy mode', state: { ...PARKED, position: 0 }, limit: 25_000, n: -3, want: true },
  { name: 'a page toward live reaches it from further up', state: { ...PARKED, position: 39 }, limit: 25_000, n: -39, want: true },
  { name: 'live, not in copy mode', state: { ...PARKED, inMode: false, frameHistory: null, position: 0 }, limit: 25_000, n: -3, want: false },
  // The parser never names a frame outside copy mode, and the decision does
  // not lean on that: a state that says it is not in copy mode is refused.
  { name: 'out of copy mode, though a frame is named', state: { ...PARKED, inMode: false }, limit: 25_000, n: -3, want: false, owns: 'in copy mode' },
  { name: 'tmux names no frame (3.6a)', state: { ...PARKED, frameHistory: null }, limit: 25_000, n: -3, want: false, owns: "the frame's depth" },
  { name: 'the program opened its alternate screen while parked', state: { ...PARKED, innerAlt: true }, limit: 25_000, n: -3, want: false, owns: 'the alternate screen' },
  { name: 'nothing printed since the park', state: { ...PARKED, history: 400 }, limit: 25_000, n: -3, want: false, owns: 'the growth' },
  { name: 'the history shrank under the frame (a trim or a Clear)', state: { ...PARKED, history: 300 }, limit: 25_000, n: -3, want: false, owns: 'the growth' },
  { name: 'the notch stops short of the bottom', state: { ...PARKED, position: 4 }, limit: 25_000, n: -3, want: false, owns: 'the bottom' },
  // THE BAND'S EDGE and one each side, the entry's attack: with a limit of
  // 1,000, tmux trims a tenth at a time and the band begins at 900.
  { name: 'one line below the trim band', state: { ...PARKED, frameHistory: 800, history: 899 }, limit: 1_000, n: -3, want: true },
  { name: 'exactly at the trim band', state: { ...PARKED, frameHistory: 800, history: 900 }, limit: 1_000, n: -3, want: false, owns: 'the trim band' },
  { name: 'one line inside the trim band', state: { ...PARKED, frameHistory: 800, history: 901 }, limit: 1_000, n: -3, want: false, owns: 'the trim band' },
  { name: 'a history at its limit', state: { ...PARKED, frameHistory: 990, history: 995 }, limit: 1_000, n: -3, want: false, owns: 'the trim band' },
  { name: 'tmux answered no limit', state: PARKED, limit: null, n: -3, want: false, owns: 'the trim band' },
  { name: 'tmux answered a limit of 0', state: PARKED, limit: 0, n: -3, want: false, owns: 'the trim band' }
];

/** The clauses of the shipping decision, as the lines of its own source. */
function decisionSource(): { expr: string; clauses: string[] } {
  const source = readFileSync(join(__dirname, '..', 'scroll.ts'), 'utf8');
  const start = source.indexOf('export function refreezeWanted(');
  assert.ok(start > 0, 'refreezeWanted is declared in scroll.ts');
  const open = source.indexOf('return (', start);
  const close = source.indexOf('\n  );\n}', open);
  assert.ok(open > start && close > open, 'refreezeWanted is one return of one parenthesised chain');
  const expr = source.slice(open + 'return ('.length, close);
  const clauses = expr
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return { expr, clauses };
}

/** The decision compiled from source text, so a clause can be taken away. */
function compiled(expr: string): (state: PaneScrollState, limit: number | null, n: number) => boolean {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('state', 'historyLimit', 'n', 'isDiscarding', `return (${expr});`) as (
    state: PaneScrollState,
    limit: number | null,
    n: number,
    discarding: typeof isDiscarding
  ) => boolean;
  return (state, limit, n) => fn(state, limit, n, isDiscarding);
}

describe('refreezeWanted, the decision (Phase 294, D294-3)', () => {
  for (const row of DECISION_ROWS) {
    it(`${row.want ? 'RE-FREEZES' : 'leaves today\'s path'}: ${row.name}`, () => {
      assert.equal(refreezeWanted(row.state, row.limit, row.n), row.want);
    });
  }

  it('is the same answer compiled from its own source text, so the ablations below read the shipping clauses', () => {
    const { expr } = decisionSource();
    const fn = compiled(expr);
    for (const row of DECISION_ROWS) assert.equal(fn(row.state, row.limit, row.n), row.want, row.name);
  });

  // One ablation per clause: the clause's line taken out of the SHIPPING
  // source, and the table read again. Each must go red on the rows it owns.
  const ABLATIONS: ReadonlyArray<{ owns: string; line: RegExp }> = [
    { owns: 'in copy mode', line: /^state\.inMode &&$/ },
    { owns: "the frame's depth", line: /^state\.frameHistory !== null &&$/ },
    { owns: 'the alternate screen', line: /^!state\.innerAlt &&$/ },
    { owns: 'the growth', line: /^state\.history > state\.frameHistory &&$/ },
    { owns: 'the trim band', line: /isDiscarding\(state\.history, historyLimit\) &&$/ },
    { owns: 'the bottom', line: /^state\.position <= Math\.abs\(n\)$/ }
  ];
  for (const ablation of ABLATIONS) {
    it(`goes red when "${ablation.owns}" is taken out of the shipping source`, () => {
      const { clauses } = decisionSource();
      const at = clauses.findIndex((clause) => ablation.line.test(clause));
      assert.ok(at >= 0, `the clause for ${ablation.owns} is one line of the decision`);
      const last = at === clauses.length - 1;
      const ablated = clauses.map((clause, i) => (i === at ? (last ? 'true' : 'true &&') : clause)).join('\n');
      const fn = compiled(ablated);
      const owned = DECISION_ROWS.filter((row) => row.owns === ablation.owns);
      assert.ok(owned.length > 0, `some row owns ${ablation.owns}`);
      const wrong = owned.filter((row) => fn(row.state, row.limit, row.n) !== row.want);
      assert.ok(wrong.length > 0, `taking out ${ablation.owns} changed no row it owns`);
    });
  }

  it('reads the trim band through isDiscarding, the band\'s one spelling', () => {
    const { clauses } = decisionSource();
    assert.ok(clauses.some((clause) => clause.includes('!isDiscarding(state.history, historyLimit)')));
    const source = readFileSync(join(__dirname, '..', 'scroll.ts'), 'utf8');
    assert.match(source, /import \{ isDiscarding \} from '\.\.\/scrollback\/watch';/);
  });
});

/** A runner that says it is this Mac's session runner (`refreezes`), recording argv. */
function thisMacs(answer: (args: readonly string[]) => string): {
  run: TmuxScrollRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const fn = async (args: readonly string[]): Promise<string> => {
    calls.push([...args]);
    return answer(args);
  };
  return { run: Object.assign(fn, { refreezes: true as const }), calls };
}

/** One read's answer, tab-separated, with the limit as a ninth field when the read asked for it. */
function readAnswer(args: readonly string[], fields: string[], limit: string): string {
  const asked = args[args.length - 1];
  return [...fields, ...(asked === REFREEZE_READ_FORMAT ? [limit] : [])].join('\t') + '\n';
}

const REFRESH = ['send-keys', '-t', '$3', '-X', 'refresh-from-pane'];
const READ_REFREEZE = ['display-message', '-p', '-t', '$3', '-F', REFREEZE_READ_FORMAT];
const READ_STATE = ['display-message', '-p', '-t', '$3', '-F', STATE_FORMAT];
const DOWN_3 = ['send-keys', '-t', '$3', '-X', '-N', '3', 'scroll-down'];

describe('the way down on this Mac (Phase 294, D294-4)', () => {
  /** Parked 3 back over a 400-line frame while the history grew to 520, limit 25,000. */
  const lagging = (args: readonly string[]): string =>
    args[0] === 'display-message'
      ? readAnswer(args, ['1', '3', '520', '40', '0', '0', '120', '400'], '25000')
      : '';

  it('reads first, re-freezes, then scrolls exactly as today', async () => {
    const { run, calls } = thisMacs(lagging);
    await scrollPaneBy(run, '$3', -3);
    assert.deepEqual(calls, [READ_REFREEZE, REFRESH, DOWN_3, TOP_LINE, READ_STATE]);
  });

  it('reads first and sends today\'s bytes when the notch does not reach the bottom', async () => {
    const { run, calls } = thisMacs((args) =>
      args[0] === 'display-message' ? readAnswer(args, ['1', '30', '520', '40', '0', '0', '120', '400'], '25000') : ''
    );
    await scrollPaneBy(run, '$3', -3);
    assert.deepEqual(calls, [READ_REFREEZE, DOWN_3, TOP_LINE, READ_STATE]);
  });

  it('keeps 3.6a\'s jump: no frame named, no re-freeze', async () => {
    const { run, calls } = thisMacs((args) =>
      args[0] === 'display-message' ? readAnswer(args, ['1', '3', '520', '40', '0', '0', '120', ''], '25000') : ''
    );
    await scrollPaneBy(run, '$3', -3);
    assert.ok(!calls.some((c) => c.includes('refresh-from-pane')));
  });

  it('keeps today\'s jump for a history at its limit', async () => {
    const { run, calls } = thisMacs((args) =>
      args[0] === 'display-message' ? readAnswer(args, ['1', '3', '995', '40', '0', '0', '120', '990'], '1000') : ''
    );
    await scrollPaneBy(run, '$3', -3);
    assert.ok(!calls.some((c) => c.includes('refresh-from-pane')));
  });

  it('decides nothing when the first read fails, and the notch follows as today', async () => {
    let reads = 0;
    const { run, calls } = thisMacs((args) => {
      if (args[0] !== 'display-message') return '';
      reads += 1;
      if (reads === 1) throw new Error('server exited unexpectedly');
      return readAnswer(args, ['1', '0', '520', '40', '0', '0', '120', '400'], '25000');
    });
    await scrollPaneBy(run, '$3', -3);
    assert.deepEqual(calls, [READ_REFREEZE, DOWN_3, TOP_LINE, READ_STATE]);
  });

  it('swallows a re-freeze that found the pane already live, and the notch follows as today', async () => {
    const calls: string[][] = [];
    const fn = async (args: readonly string[]): Promise<string> => {
      calls.push([...args]);
      if (args.includes('refresh-from-pane') || args.includes('scroll-down')) throw new Error('not in a mode');
      return lagging(args);
    };
    const run: TmuxScrollRunner = Object.assign(fn, { refreezes: true as const });
    await scrollPaneBy(run, '$3', -3);
    assert.deepEqual(calls, [READ_REFREEZE, REFRESH, DOWN_3, READ_STATE]);
  });

  it('never re-freezes on the way UP, nor on a read, a cancel or a zero delta', async () => {
    for (const op of [
      (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 3),
      (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 0),
      (run: TmuxScrollRunner) => readPaneScroll(run, '$3'),
      (run: TmuxScrollRunner) => exitPaneScroll(run, '$3')
    ]) {
      const { run, calls } = thisMacs(lagging);
      await op(run);
      assert.ok(!calls.some((c) => c.includes('refresh-from-pane')), JSON.stringify(calls));
      // ...and reads with the eight fields it always has.
      assert.ok(calls.filter((c) => c[0] === 'display-message').every((c) => c[c.length - 1] === STATE_FORMAT));
    }
  });

  it('gains nothing on a runner that does not say it refreezes, which keeps today\'s bytes', async () => {
    const { run, calls } = recorder([readAnswer([], ['1', '3', '520', '40', '0', '0', '120', '400'], '25000')]);
    await scrollPaneBy(run, '$3', -3);
    assert.deepEqual(calls, [DOWN_3, TOP_LINE, READ_STATE]);
  });

  it('gains nothing on another machine, ordered or not, whatever the runner says', async () => {
    for (const ordered of [false, true]) {
      const calls: string[][] = [];
      const fn = async (args: readonly string[]): Promise<string> => {
        calls.push([...args]);
        return args[0] === 'display-message' ? '1 3 520 40 0 0 120 400\n' : '';
      };
      const run: TmuxScrollRunner = Object.assign(fn, {
        refreezes: true as const,
        server: 'machine:far',
        ...(ordered ? { ordered: true as const } : {})
      });
      await scrollPaneBy(run, '$3', -3);
      await scrollPaneTo(run, '$3', 1);
      assert.ok(!calls.some((c) => c.includes('refresh-from-pane')), `ordered ${String(ordered)}`);
      assert.ok(calls.filter((c) => c[0] === 'display-message').every((c) => c[c.length - 1] === REMOTE_STATE_FORMAT));
    }
  });

  it('asks the ninth field of this Mac\'s read alone: the eight fields and another machine\'s read are byte for byte', () => {
    const eight = [
      '#{pane_in_mode}', '#{scroll_position}', '#{history_size}', '#{pane_height}',
      '#{alternate_on}', '#{mouse_any_flag}', '#{pane_width}', '#{copy_position_limit}'
    ];
    assert.equal(STATE_FORMAT, eight.join('\t'));
    assert.equal(REMOTE_STATE_FORMAT, eight.join(' '));
    assert.equal(REFREEZE_READ_FORMAT, `${STATE_FORMAT}\t#{history_limit}`);
  });

  it('reads the limit only as a whole number above 0, and the state exactly as the poll reads it', async () => {
    const fields = ['1', '3', '520', '40', '0', '0', '120', '400'];
    for (const [limit, re] of [['25000', true], ['', false], ['0', false], ['1e3', false], ['-5', false]] as const) {
      const { run, calls } = thisMacs((args) => (args[0] === 'display-message' ? readAnswer(args, fields, limit) : ''));
      await scrollPaneBy(run, '$3', -3);
      assert.equal(calls.some((c) => c.includes('refresh-from-pane')), re, `limit ${JSON.stringify(limit)}`);
    }
  });
});

describe('the drag\'s band on this Mac (Phase 294, D294-5)', () => {
  /** Parked at `position` over a 400-line frame, history 520; a re-freeze moves both by the 120 printed. */
  function band(position: number, frame = '400'): { run: TmuxScrollRunner; calls: string[][] } {
    let refrozen = false;
    const recorded = thisMacs((args) => {
      if (args.includes('refresh-from-pane')) {
        if (frame !== '') refrozen = true;
        return '';
      }
      if (args[0] !== 'display-message') return '';
      return refrozen
        ? readAnswer(args, ['1', String(position + 120), '520', '40', '0', '0', '120', '520'], '25000')
        : readAnswer(args, ['1', String(position), '520', '40', '0', '0', '120', frame], '25000');
    });
    return recorded;
  }

  it('re-freezes when the drag asks the frame\'s bottom while the frame lags, and keeps the reader on their line', async () => {
    const { run, calls } = band(1);
    const s = await scrollPaneTo(run, '$3', 1);
    // Position 1 of the old frame is position 121 of the new one, which is
    // where the re-freeze already put the view: no seek is needed.
    assert.deepEqual(calls, [READ_REFREEZE, REFRESH, READ_STATE]);
    assert.equal(s.position, 121);
    assert.equal(s.frameHistory, 520);
  });

  it('seeks to the asked line plus the frame\'s growth when the drag jumps into the band from further up', async () => {
    const { run, calls } = band(50);
    await scrollPaneTo(run, '$3', 1);
    assert.deepEqual(calls, [
      READ_REFREEZE,
      REFRESH,
      READ_STATE,
      ['copy-mode', '-e', '-t', '$3'],
      ['send-keys', '-t', '$3', '-X', 'goto-line', '121'],
      TOP_LINE,
      READ_STATE
    ]);
  });

  it('does not re-freeze for a drag that asks any line of the frame above its bottom', async () => {
    const { run, calls } = band(50);
    await scrollPaneTo(run, '$3', 2);
    assert.ok(!calls.some((c) => c.includes('refresh-from-pane')));
  });

  it('keeps today\'s band on 3.6a, which names no frame', async () => {
    const { run, calls } = band(1, '');
    await scrollPaneTo(run, '$3', 1);
    assert.deepEqual(calls, [READ_REFREEZE]);
  });

  it('leaves the lane\'s foot as today\'s cancel', async () => {
    const { run, calls } = band(1);
    await scrollPaneTo(run, '$3', 0);
    assert.deepEqual(calls[0], ['send-keys', '-t', '$3', '-X', 'cancel']);
    assert.ok(!calls.some((c) => c.includes('refresh-from-pane')));
  });

  it('a huge relative scroll, which no caller sends, takes no re-freeze', async () => {
    const { run, calls } = band(2400);
    await scrollPaneBy(run, '$3', -2399);
    assert.ok(!calls.some((c) => c.includes('refresh-from-pane')));
  });
});

describe('the production runner opts in (Phase 294)', () => {
  it('src/main/sessions/core.ts\'s runScrollCommand, this Mac\'s session runner, says it refreezes', () => {
    // The re-freeze is opt-in so that every other runner keeps the serial
    // bytes the pipelined code is compared with. The session core's runner is
    // the one a person's wheel reaches, and without the fact the fix ships
    // inert.
    const core = readFileSync(join(REPO_ROOT, 'src/main/sessions/core.ts'), 'utf8');
    const at = core.indexOf('private readonly runScrollCommand');
    assert.ok(at > 0, 'core.ts declares runScrollCommand');
    // The field, up to the next member's doc comment.
    const next = core.indexOf('\n\n  /**', at);
    const field = core.slice(at, next === -1 ? undefined : next);
    assert.match(field, /refreezes:\s*true/);
  });
});

describe('exitPaneScroll', () => {
  it('cancels and re-reads, swallowing "not in a mode"', async () => {
    const calls: string[][] = [];
    const run: TmuxScrollRunner = async (args) => {
      calls.push([...args]);
      if (args[0] === 'send-keys') throw new Error('not in a mode');
      return state('0', '', '5');
    };
    const s = await exitPaneScroll(run, '$3');
    assert.deepEqual(calls[0], ['send-keys', '-t', '$3', '-X', 'cancel']);
    assert.equal(s.position, 0);
    assert.equal(s.inMode, false);
  });
});
