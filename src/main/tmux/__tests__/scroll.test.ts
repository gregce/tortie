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
import {
  anchorPaneScroll,
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

/** `display-message -F` output: in_mode, position, history, rows, alt, mouse. */
function state(
  inMode: string,
  position: string,
  history: string,
  rows = '40',
  alt = '0',
  mouse = '0'
): string {
  return [inMode, position, history, rows, alt, mouse].join('\t') + '\n';
}

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
    assert.equal(s.position, 7);
  });

  it('scrolls DOWN without entering copy-mode', async () => {
    // `copy-mode -e` exits by itself at the bottom, so scrolling toward live
    // must never re-enter it — that would trap the pane one line above live.
    const { run, calls } = recorder([state('0', '', '120')]);
    await scrollPaneBy(run, '$3', -4);
    assert.deepEqual(calls[0], [
      'send-keys', '-t', '$3', '-X', '-N', '4', 'scroll-down'
    ]);
    assert.equal(calls.length, 2); // scroll + read, no copy-mode
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
    // anchorPaneScroll can produce one of these when an agent dumps tens of
    // thousands of lines between polls.
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

describe('anchorPaneScroll', () => {
  it('adds new output back to the offset so the reader keeps their place', async () => {
    // MEASURED: scroll_position is relative to the LIVE bottom, so eight new
    // lines slid a pane parked at 10 from LINE-272 to LINE-280.
    const { run, calls } = recorder([state('1', '10', '282'), state('1', '18', '282')]);
    const s = await anchorPaneScroll(run, '$3', 274);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', '-N', '8', 'scroll-up'
    ]);
    assert.equal(s.position, 18);
  });

  it('does not anchor a pane that is at live output', async () => {
    const { run, calls } = recorder([state('0', '', '282')]);
    await anchorPaneScroll(run, '$3', 274);
    assert.equal(calls.length, 1);
  });

  it('does not anchor when history did not grow', async () => {
    const { run, calls } = recorder([state('1', '10', '274')]);
    await anchorPaneScroll(run, '$3', 274);
    assert.equal(calls.length, 1);
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
