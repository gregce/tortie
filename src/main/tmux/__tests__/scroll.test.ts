/**
 * Unit tests for the pane scroll controller (Phase 12.3).
 *
 * The runner is injected, so the whole module is testable without a tmux
 * server; the recorded argv is the contract these tests actually pin, because
 * a wrong flag here is the difference between scrolling and "not in a mode".
 *
 * Runner: vitest (`npm test`).
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  anchorPaneScroll,
  exitPaneScroll,
  readPaneScroll,
  scrollPaneBy,
  scrollPaneTo,
  type TmuxScrollRunner
} from '../scroll';

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
  it('scrubs by the difference from the current offset', async () => {
    const { run, calls } = recorder([state('1', '20', '300')]);
    await scrollPaneTo(run, '$3', 50);
    assert.deepEqual(calls[1], ['copy-mode', '-e', '-t', '$3']);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', '-N', '30', 'scroll-up'
    ]);
  });

  it('clamps a scrub past the top to the history size', async () => {
    const { run, calls } = recorder([state('1', '20', '300')]);
    await scrollPaneTo(run, '$3', 9999);
    assert.deepEqual(calls[2], [
      'send-keys', '-t', '$3', '-X', '-N', '280', 'scroll-up'
    ]);
  });

  it('position 0 cancels copy-mode instead of scrolling', async () => {
    const { run, calls } = recorder([state('0', '', '300')]);
    await scrollPaneTo(run, '$3', 0);
    assert.deepEqual(calls[0], ['send-keys', '-t', '$3', '-X', 'cancel']);
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
