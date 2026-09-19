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
import {
  exitPaneScroll,
  readPaneScroll,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
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
