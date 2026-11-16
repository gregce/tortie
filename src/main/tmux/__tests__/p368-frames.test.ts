/**
 * Phase 368, item 5 (build/p368/SPEC.md §4.3, D10): scrollback between frames.
 *
 * An ENTRY into the scrollback on this Mac (`scrollPaneBy` up, or a seek from
 * live) reads `#{pane_in_mode}` and `#{synchronized_output_flag}` before it
 * enters and the flag once more after it; when either read finds the program
 * inside a synchronized frame, `settleOpenFrame` re-freezes the view once, in
 * place, after that frame is drawn.
 *
 * THE PANE HERE IS SCRIPTED, AND IT DOES WHAT tmux 3.7b WAS MEASURED DOING
 * (the account in ../scroll.ts): entering copy mode on a pane a client draws
 * ends the program's frame in tmux's eyes, so the flag reads 0 from the entry
 * on whether the program has finished or not (`entryEndsFrame`). That is why
 * the settle never re-freezes sooner than TMUX_SYNC_TIMEOUT_MS after it starts,
 * and the first describe below holds exactly that.
 *
 * Time is fake (`setTimeout` and `performance`), so a second of settling costs
 * nothing, and every call is stamped with the fake clock.
 *
 * Runner: vitest (`npm test`).
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isDiscarding } from '../../scrollback/watch';
import {
  exitPaneScroll,
  FRAME_POLL_MS,
  FRAME_READ_FORMAT,
  FRAME_SETTLE_MS,
  FRAME_SETTLE_READ_FORMAT,
  frameRefreezeAllowed,
  frameSettlesForTests,
  readPaneScroll,
  REFREEZE_READ_FORMAT,
  REMOTE_STATE_FORMAT,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
  STATE_FORMAT,
  TMUX_SYNC_TIMEOUT_MS,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../scroll';

const SCROLL_TS = join(__dirname, '..', 'scroll.ts');
const SRC = join(__dirname, '..', '..', '..');

beforeEach(() => {
  resetSeekSupportForTests();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// The scripted pane
// ---------------------------------------------------------------------------

/** A pane on this Mac's server, as the runner below answers for it. */
interface Pane {
  inMode: boolean;
  /** `#{synchronized_output_flag}`: '1' a frame is open, '0' none, '' a tmux without the format (3.6a). */
  flag: '0' | '1' | '';
  /**
   * Entering copy mode ends the open frame in tmux's eyes, as measured on 3.7b
   * for a pane a client draws. False is a pane no client draws.
   */
  entryEndsFrame: boolean;
  history: number;
  /** `#{copy_position_limit}` while in copy mode; '' is a tmux that names no frame. */
  frame: string;
  alt: '0' | '1';
  limit: string;
  failFrameRead: boolean;
  failSettleRead: boolean;
  /** The clients attached to the session, as `list-clients` names them; null makes the list fail. */
  clients: string[] | null;
}

function pane(over: Partial<Pane> = {}): Pane {
  return {
    inMode: false,
    flag: '0',
    entryEndsFrame: true,
    history: 500,
    frame: '480',
    alt: '0',
    limit: '25000',
    failFrameRead: false,
    failSettleRead: false,
    clients: ['/dev/ttys001'],
    ...over
  };
}

interface Call {
  args: string[];
  /** The fake clock when the call was made. */
  at: number;
}

/** The eight fields of the pane's state, in STATE_FORMAT's order. */
function stateFields(p: Pane): string[] {
  return [
    p.inMode ? '1' : '0',
    p.inMode ? '3' : '',
    String(p.history),
    '40',
    p.alt,
    '0',
    '120',
    p.inMode ? p.frame : ''
  ];
}

/** Answer one command the way the scripted pane would. */
function answer(p: Pane, args: readonly string[]): string {
  if (args[0] === 'copy-mode') {
    if (!p.inMode && p.entryEndsFrame && p.flag === '1') p.flag = '0';
    p.inMode = true;
    return '';
  }
  if (args[0] === 'display-message') {
    const format = args[args.length - 1];
    if (format === FRAME_READ_FORMAT) {
      if (p.failFrameRead) throw new Error('server exited unexpectedly');
      return `${p.inMode ? '1' : '0'}\t${p.flag}\n`;
    }
    if (format === FRAME_SETTLE_READ_FORMAT) {
      if (p.failSettleRead) throw new Error('server exited unexpectedly');
      return [...stateFields(p), p.limit, p.flag].join('\t') + '\n';
    }
    if (format === REFREEZE_READ_FORMAT) return [...stateFields(p), p.limit].join('\t') + '\n';
    if (format === REMOTE_STATE_FORMAT) return stateFields(p).join(' ') + '\n';
    return stateFields(p).join('\t') + '\n';
  }
  if (args[0] === 'list-clients') {
    if (p.clients === null) throw new Error('server exited unexpectedly');
    return p.clients.map((name) => `${name}\n`).join('');
  }
  if (args.includes('cancel')) {
    p.inMode = false;
    return '';
  }
  if (args.includes('refresh-from-pane') || args.includes('top-line')) {
    if (!p.inMode) throw new Error('not in a mode');
    return '';
  }
  return '';
}

/** This Mac's session runner (it says it `refreezes`), over the scripted pane. */
function thisMacs(p: Pane): { run: TmuxScrollRunner; calls: Call[] } {
  const calls: Call[] = [];
  const fn = async (args: readonly string[]): Promise<string> => {
    calls.push({ args: [...args], at: performance.now() });
    return answer(p, args);
  };
  return { run: Object.assign(fn, { refreezes: true as const }), calls };
}

/** A short name for each command, so a sequence reads as one line. */
function label(args: readonly string[]): string {
  if (args[0] === 'display-message') {
    const format = args[args.length - 1];
    if (format === FRAME_READ_FORMAT) return 'frame?';
    if (format === FRAME_SETTLE_READ_FORMAT) return 'settle?';
    if (format === REFREEZE_READ_FORMAT) return 'refreeze?';
    if (format === STATE_FORMAT) return 'state?';
    if (format === REMOTE_STATE_FORMAT) return 'remote?';
    return `read ${String(format)}`;
  }
  if (args[0] === 'copy-mode') return args.includes('-H') ? 'enter -H' : 'enter';
  if (args[0] === 'list-clients') return 'clients?';
  if (args[0] === 'refresh-client') return `redraw ${String(args[args.length - 1])}`;
  const x = args.indexOf('-X');
  const verb = args[args.length - 1];
  if (x >= 0 && args[x + 1] === '-N') return `${verb === 'scroll-up' ? 'up' : 'down'} ${String(args[x + 2])}`;
  if (verb === 'top-line') return 'top';
  if (verb === 'refresh-from-pane') return 'refresh';
  if (verb === 'cancel') return 'cancel';
  if (args.includes('goto-line')) return `goto ${String(verb)}`;
  return args.join(' ');
}

const labels = (calls: readonly Call[]): string[] => calls.map((c) => label(c.args));

/** Let every settle run out: two seconds of fake time, then wait for the flights. */
async function settle(run: TmuxScrollRunner, ms = 2_000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await frameSettlesForTests(run);
}

/** The fake-clock time of each call labelled `name`, relative to `t0`. */
const timesOf = (calls: readonly Call[], name: string, t0: number): number[] =>
  calls.filter((c) => label(c.args) === name).map((c) => c.at - t0);

/** What an entry up three lines sends on this Mac, the two frame reads in their places. */
const ENTRY_UP_3 = ['frame?', 'enter', 'up 3', 'top', 'frame?', 'state?'];

// ---------------------------------------------------------------------------
// The formats
// ---------------------------------------------------------------------------

describe('the frame reads (Phase 368, D10)', () => {
  it('reads the pane mode and the flag, tab-separated, and the settle reads the re-freeze read with the flag tenth', () => {
    assert.equal(FRAME_READ_FORMAT, '#{pane_in_mode}\t#{synchronized_output_flag}');
    assert.equal(FRAME_SETTLE_READ_FORMAT, `${REFREEZE_READ_FORMAT}\t#{synchronized_output_flag}`);
    for (const format of [FRAME_READ_FORMAT, FRAME_SETTLE_READ_FORMAT]) assert.ok(!format.includes('#('));
  });

  it('moves none of the three older formats by a byte', () => {
    const eight = [
      '#{pane_in_mode}', '#{scroll_position}', '#{history_size}', '#{pane_height}',
      '#{alternate_on}', '#{mouse_any_flag}', '#{pane_width}', '#{copy_position_limit}'
    ];
    assert.equal(STATE_FORMAT, eight.join('\t'));
    assert.equal(REMOTE_STATE_FORMAT, eight.join(' '));
    assert.equal(REFREEZE_READ_FORMAT, `${eight.join('\t')}\t#{history_limit}`);
  });

  it('settles on the bound tmux itself sets: a second for any frame, read every 50 ms, for 1,100 ms in all', () => {
    assert.equal(TMUX_SYNC_TIMEOUT_MS, 1_000);
    assert.equal(FRAME_POLL_MS, 50);
    assert.equal(FRAME_SETTLE_MS, 1_100);
  });
});

// ---------------------------------------------------------------------------
// The entry and the settle
// ---------------------------------------------------------------------------

describe('an entry inside a frame re-freezes at its first quiet read and again a second later (D10)', () => {
  const ROUND = ['refresh', 'top', 'clients?', 'redraw /dev/ttys001'];

  it('the way up: the flag 1 before the entry re-freezes early and a second later, each with the cursor step and the redraw', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    // The gesture's own commands, and the read the renderer gets, come first.
    assert.deepEqual(labels(calls), ENTRY_UP_3);
    await settle(run);
    const tail = labels(calls).slice(ENTRY_UP_3.length);
    assert.deepEqual(tail.filter((l) => l !== 'settle?'), [...ROUND, ...ROUND]);
    // The EARLY one at the first quiet read, and the LAST one no sooner than
    // tmux's own second, though the flag read 0 from the entry on: the entry
    // ended tmux's hold on the frame, not the frame.
    const [early, last] = timesOf(calls, 'refresh', t0);
    assert.equal(early, FRAME_POLL_MS, `the early re-freeze at ${String(early)} ms`);
    assert.ok(last !== undefined && last >= TMUX_SYNC_TIMEOUT_MS, `the last re-freeze at ${String(last)} ms`);
    assert.ok(last <= FRAME_SETTLE_MS, `the last re-freeze at ${String(last)} ms`);
    // Nothing is read or sent after the last one.
    assert.deepEqual(labels(calls).slice(-4), ROUND);
  });

  it('after each re-freeze has each attached client draw again, with nothing but a redraw', async () => {
    const p = pane({ flag: '1', clients: ['/dev/ttys004', '/dev/ttys009'] });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    const list = ['list-clients', '-t', '$3', '-F', '#{client_name}'];
    assert.deepEqual(calls.filter((c) => c.args[0] === 'list-clients').map((c) => c.args), [list, list]);
    // `refresh-client` with no flag: a full redraw, no size, no pan, no status-only.
    const redraws = [['refresh-client', '-t', '/dev/ttys004'], ['refresh-client', '-t', '/dev/ttys009']];
    assert.deepEqual(calls.filter((c) => c.args[0] === 'refresh-client').map((c) => c.args), [...redraws, ...redraws]);
  });

  it('a client list that fails redraws nothing, and the re-freeze stands', async () => {
    const p = pane({ flag: '1', clients: null });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.deepEqual(labels(calls).slice(-3), ['refresh', 'top', 'clients?']);
    assert.equal(labels(calls).filter((l) => l === 'refresh').length, 2);
  });

  it('redraws nothing when the guard refuses the re-freeze', async () => {
    const p = pane({ flag: '1', frame: '' });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.ok(!calls.some((c) => c.args[0] === 'list-clients' || c.args[0] === 'refresh-client'));
  });

  it('a seek from live, the scrollbar drag, is an entry too', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    await scrollPaneTo(run, '$3', 50);
    assert.deepEqual(labels(calls), ['refreeze?', 'frame?', 'enter', 'goto 50', 'top', 'frame?', 'state?']);
    await settle(run);
    assert.equal(labels(calls).filter((l) => l === 'refresh').length, 2);
  });

  it('the flag 0 before and after: no settle, and no command beyond the two reads', async () => {
    const { run, calls } = thisMacs(pane());
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ENTRY_UP_3);
  });

  it('the flag seen only after the entry starts the settle too', async () => {
    // A frame the program opened between the two reads, on a pane no client
    // draws, so the flag still says so after the entry; it closes at 290 ms.
    const p = pane({ entryEndsFrame: false });
    const calls: Call[] = [];
    let frameReads = 0;
    const fn = async (args: readonly string[]): Promise<string> => {
      calls.push({ args: [...args], at: performance.now() });
      if (args[args.length - 1] === FRAME_READ_FORMAT) {
        frameReads += 1;
        if (frameReads === 2) p.flag = '1';
      }
      return answer(p, args);
    };
    const run: TmuxScrollRunner = Object.assign(fn, { refreezes: true as const });
    setTimeout(() => {
      p.flag = '0';
    }, 290);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    assert.deepEqual(labels(calls), ENTRY_UP_3);
    await settle(run);
    const [early, last] = timesOf(calls, 'refresh', t0);
    assert.equal(early, 300, 'the early re-freeze waits out the open frame');
    assert.ok((last ?? 0) >= TMUX_SYNC_TIMEOUT_MS);
  });

  it('never re-freezes while the flag reads 1: a frame open at the second waits for its close', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    // The program opens another frame at 950 ms and closes it at 1,060 ms.
    setTimeout(() => {
      p.flag = '1';
    }, 950);
    setTimeout(() => {
      p.flag = '0';
    }, 1_060);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    const refreshes = timesOf(calls, 'refresh', t0);
    assert.deepEqual(refreshes, [FRAME_POLL_MS, 1_100], `re-froze at ${refreshes.join(', ')} ms`);
  });

  it('on a pane no client draws, waits out the frame the flag still reports', async () => {
    const p = pane({ flag: '1', entryEndsFrame: false });
    const { run, calls } = thisMacs(p);
    setTimeout(() => {
      p.flag = '0';
    }, 590);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    const refreshes = timesOf(calls, 'refresh', t0);
    assert.equal(refreshes.length, 2);
    assert.equal(refreshes[0], 600, 'the early re-freeze comes at the first read after the frame closed');
    assert.ok((refreshes[1] ?? 0) >= TMUX_SYNC_TIMEOUT_MS);
    // It read the open frame all through it, and sent nothing then.
    assert.equal(timesOf(calls, 'settle?', t0).filter((t) => t < 590).length, 11);
  });

  it('the bound ends a flag that never clears, with nothing sent', async () => {
    const p = pane({ flag: '1', entryEndsFrame: false });
    const { run, calls } = thisMacs(p);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 5_000);
    assert.ok(!labels(calls).includes('refresh'));
    const reads = timesOf(calls, 'settle?', t0);
    assert.equal(reads.length, FRAME_SETTLE_MS / FRAME_POLL_MS);
    assert.ok(Math.max(...reads) <= FRAME_SETTLE_MS);
  });

  it('ends when the pane leaves copy mode, sending nothing more', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    setTimeout(() => {
      p.inMode = false;
    }, 310);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.deepEqual(timesOf(calls, 'refresh', t0), [FRAME_POLL_MS], 'only the early re-freeze, before the pane left');
    const reads = timesOf(calls, 'settle?', t0);
    assert.equal(Math.max(...reads), 350, 'the first read after the pane went live is the last');
  });

  it('ends when the reader goes live with a keystroke, sending nothing more', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await vi.advanceTimersByTimeAsync(200);
    await exitPaneScroll(run, '$3');
    await settle(run);
    assert.deepEqual(timesOf(calls, 'refresh', t0), [FRAME_POLL_MS]);
    assert.ok(Math.max(...timesOf(calls, 'settle?', t0)) <= 250);
  });

  for (const [name, change] of [
    ['the program is on its alternate screen', (p: Pane) => { p.alt = '1'; }],
    ['the history is in the trim band', (p: Pane) => { p.history = 24_000; p.frame = '23990'; }],
    ['tmux names no frame', (p: Pane) => { p.frame = ''; }],
    ['tmux answered no limit', (p: Pane) => { p.limit = ''; }]
  ] as const) {
    it(`sends nothing when ${name} (Phase 294's guard)`, async () => {
      const p = pane({ flag: '1' });
      change(p);
      const { run, calls } = thisMacs(p);
      const t0 = performance.now();
      await scrollPaneBy(run, '$3', 3);
      await settle(run);
      assert.ok(!labels(calls).includes('refresh'), labels(calls).join(', '));
      // It decided at its first read of 0 and stopped.
      assert.deepEqual(timesOf(calls, 'settle?', t0), [FRAME_POLL_MS]);
    });
  }

  it('asks the guard at each re-freeze: a change between the two sends nothing more', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    setTimeout(() => {
      p.alt = '1';
    }, 500);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.deepEqual(timesOf(calls, 'refresh', t0), [FRAME_POLL_MS]);
  });

  it('ends with nothing more sent when a read fails', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    setTimeout(() => {
      p.failSettleRead = true;
    }, 200);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.deepEqual(timesOf(calls, 'refresh', t0), [FRAME_POLL_MS]);
  });

  it('a second entry during the wait joins the flight, gives it its early re-freeze again and moves its second', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    const t0 = performance.now();
    await scrollPaneBy(run, '$3', 3);
    await vi.advanceTimersByTimeAsync(500);
    // The reader went live, the program opened another frame, and the reader
    // scrolled back again: a second entry inside a second frame.
    p.inMode = false;
    p.flag = '1';
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 3_000);
    const reads = timesOf(calls, 'settle?', t0);
    // ONE flight: no two settle reads at one instant, each 50 ms after the last.
    assert.equal(new Set(reads).size, reads.length);
    for (let i = 1; i < reads.length; i += 1) assert.equal((reads[i] ?? 0) - (reads[i - 1] ?? 0), FRAME_POLL_MS);
    const refreshes = timesOf(calls, 'refresh', t0);
    assert.equal(refreshes.length, 3, `re-froze at ${refreshes.join(', ')} ms`);
    assert.equal(refreshes[0], FRAME_POLL_MS);
    assert.equal(refreshes[1], 500 + FRAME_POLL_MS);
    assert.ok((refreshes[2] ?? 0) >= 500 + TMUX_SYNC_TIMEOUT_MS && (refreshes[2] ?? 0) <= 500 + FRAME_SETTLE_MS);
  });

  it('a later entry after a flight ended starts a flight of its own', async () => {
    const p = pane({ flag: '1' });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    p.inMode = false;
    p.flag = '1';
    await scrollPaneBy(run, '$3', 3);
    await settle(run);
    assert.equal(labels(calls).filter((l) => l === 'refresh').length, 4);
  });
});

describe('what is not an entry, or not this Mac, keeps today\'s bytes (D10)', () => {
  it('a notch that finds the pane already scrolled back reads once and starts nothing, whatever the flag', async () => {
    const p = pane({ inMode: true, flag: '1' });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ['frame?', 'enter', 'up 3', 'top', 'state?']);
  });

  it('a drag that finds the pane already scrolled back reads no frame at all', async () => {
    const p = pane({ inMode: true, flag: '1' });
    const { run, calls } = thisMacs(p);
    await scrollPaneTo(run, '$3', 30);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ['refreeze?', 'enter', 'goto 30', 'top', 'state?']);
  });

  it('a read before the entry that fails decides nothing, and the gesture runs as today', async () => {
    const p = pane({ flag: '1', failFrameRead: true });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ['frame?', 'enter', 'up 3', 'top', 'state?']);
  });

  it('a read it cannot read decides nothing', async () => {
    for (const garbled of ['', '1', '0\t1\t0', '2\t1', '0\tx', '0\t1\n0\t1']) {
      const calls: Call[] = [];
      const p = pane({ flag: '1' });
      const fn = async (args: readonly string[]): Promise<string> => {
        calls.push({ args: [...args], at: performance.now() });
        return args[args.length - 1] === FRAME_READ_FORMAT ? garbled : answer(p, args);
      };
      const run: TmuxScrollRunner = Object.assign(fn, { refreezes: true as const });
      await scrollPaneBy(run, '$3', 3);
      await settle(run);
      assert.deepEqual(labels(calls), ['frame?', 'enter', 'up 3', 'top', 'state?'], JSON.stringify(garbled));
    }
  });

  it('tmux 3.6a answers the flag empty, which is never a frame, so nothing is settled', async () => {
    const p = pane({ flag: '', frame: '' });
    const { run, calls } = thisMacs(p);
    await scrollPaneBy(run, '$3', 3);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ENTRY_UP_3);
  });

  it('the way down, a read, a cancel and a zero delta read no frame', async () => {
    for (const op of [
      (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', -3),
      (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 0),
      (run: TmuxScrollRunner) => readPaneScroll(run, '$3'),
      (run: TmuxScrollRunner) => exitPaneScroll(run, '$3')
    ]) {
      const { run, calls } = thisMacs(pane({ inMode: true, flag: '1' }));
      await op(run);
      await settle(run, 3_000);
      // (The way down may still re-freeze by Phase 294's own rule; that is not this.)
      assert.ok(!labels(calls).some((l) => l === 'frame?' || l === 'settle?'), labels(calls).join(', '));
    }
  });

  it('a runner that does not say it refreezes sends today\'s bytes', async () => {
    const p = pane({ flag: '1' });
    const calls: Call[] = [];
    const run: TmuxScrollRunner = async (args) => {
      calls.push({ args: [...args], at: performance.now() });
      return answer(p, args);
    };
    await scrollPaneBy(run, '$3', 3);
    p.inMode = false;
    await scrollPaneTo(run, '$3', 50);
    await settle(run, 3_000);
    assert.deepEqual(labels(calls), ['enter', 'up 3', 'top', 'state?', 'state?', 'enter', 'goto 50', 'top', 'state?']);
  });

  it('another machine, ordered or not, whatever the runner says, sends today\'s bytes and never the flag', async () => {
    for (const ordered of [false, true]) {
      const p = pane({ flag: '1' });
      const calls: Call[] = [];
      const fn = async (args: readonly string[]): Promise<string> => {
        calls.push({ args: [...args], at: performance.now() });
        return answer(p, args);
      };
      const run: TmuxScrollRunner = Object.assign(fn, {
        refreezes: true as const,
        server: 'machine:far',
        ...(ordered ? { ordered: true as const } : {})
      });
      await scrollPaneBy(run, '$3', 3);
      p.inMode = false;
      await scrollPaneTo(run, '$3', 50);
      await settle(run, 3_000);
      assert.deepEqual(
        labels(calls),
        ['enter -H', 'up 3', 'top', 'remote?', 'remote?', 'enter -H', 'goto 50', 'top', 'remote?'],
        `ordered ${String(ordered)}`
      );
      assert.ok(!calls.some((c) => c.args.join(' ').includes('synchronized_output_flag')));
    }
  });
});

// ---------------------------------------------------------------------------
// The guard, clause by clause
// ---------------------------------------------------------------------------

/** A parked view the settle may re-freeze; every row below changes one thing. */
const PARKED: PaneScrollState = {
  position: 3,
  history: 520,
  rows: 40,
  cols: 120,
  frameHistory: 500,
  inMode: true,
  innerAlt: false,
  innerMouse: false
};

const GUARD_ROWS: ReadonlyArray<{
  name: string;
  state: PaneScrollState;
  limit: number | null;
  want: boolean;
  owns?: string;
}> = [
  { name: 'parked, a frame named, below the band', state: PARKED, limit: 25_000, want: true },
  // A frame redraws rows in place: nothing need have printed since the entry,
  // which Phase 294's growth clause would have refused.
  { name: 'nothing printed since the entry', state: { ...PARKED, history: 500 }, limit: 25_000, want: true },
  { name: 'out of copy mode, though a frame is named', state: { ...PARKED, inMode: false }, limit: 25_000, want: false, owns: 'in copy mode' },
  { name: 'tmux names no frame (3.6a)', state: { ...PARKED, frameHistory: null }, limit: 25_000, want: false, owns: "the frame's depth" },
  { name: 'the program is on its alternate screen', state: { ...PARKED, innerAlt: true }, limit: 25_000, want: false, owns: 'the alternate screen' },
  { name: 'one line below the trim band', state: { ...PARKED, frameHistory: 800, history: 899 }, limit: 1_000, want: true },
  { name: 'exactly at the trim band', state: { ...PARKED, frameHistory: 800, history: 900 }, limit: 1_000, want: false, owns: 'the trim band' },
  { name: 'tmux answered no limit', state: PARKED, limit: null, want: false, owns: 'the trim band' },
  { name: 'tmux answered a limit of 0', state: PARKED, limit: 0, want: false, owns: 'the trim band' }
];

/** The guard's clauses, as the lines of its own source. */
function guardSource(): { clauses: string[] } {
  const source = readFileSync(SCROLL_TS, 'utf8');
  const start = source.indexOf('export function frameRefreezeAllowed(');
  assert.ok(start > 0, 'frameRefreezeAllowed is declared in scroll.ts');
  const open = source.indexOf('return (', start);
  const close = source.indexOf('\n  );\n}', open);
  assert.ok(open > start && close > open, 'frameRefreezeAllowed is one return of one parenthesised chain');
  const clauses = source
    .slice(open + 'return ('.length, close)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return { clauses };
}

/** The guard compiled from source text, so a clause can be taken away. */
function compiled(expr: string): (state: PaneScrollState, limit: number | null) => boolean {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('state', 'historyLimit', 'isDiscarding', `return (${expr});`) as (
    state: PaneScrollState,
    limit: number | null,
    discarding: typeof isDiscarding
  ) => boolean;
  return (state, limit) => fn(state, limit, isDiscarding);
}

describe('frameRefreezeAllowed, Phase 294\'s guard for the settle (D10)', () => {
  for (const row of GUARD_ROWS) {
    it(`${row.want ? 'RE-FREEZES' : 'sends nothing'}: ${row.name}`, () => {
      assert.equal(frameRefreezeAllowed(row.state, row.limit), row.want);
    });
  }

  it('is the same answer compiled from its own source text', () => {
    const fn = compiled(guardSource().clauses.join('\n'));
    for (const row of GUARD_ROWS) assert.equal(fn(row.state, row.limit), row.want, row.name);
  });

  const ABLATIONS: ReadonlyArray<{ owns: string; line: RegExp }> = [
    { owns: 'in copy mode', line: /^state\.inMode &&$/ },
    { owns: "the frame's depth", line: /^state\.frameHistory !== null &&$/ },
    { owns: 'the alternate screen', line: /^!state\.innerAlt &&$/ },
    { owns: 'the trim band', line: /isDiscarding\(state\.history, historyLimit\)$/ }
  ];
  for (const ablation of ABLATIONS) {
    it(`goes red when "${ablation.owns}" is taken out of the shipping source`, () => {
      const { clauses } = guardSource();
      const at = clauses.findIndex((clause) => ablation.line.test(clause));
      assert.ok(at >= 0, `the clause for ${ablation.owns} is one line of the guard`);
      const last = at === clauses.length - 1;
      const fn = compiled(clauses.map((clause, i) => (i === at ? (last ? 'true' : 'true &&') : clause)).join('\n'));
      const owned = GUARD_ROWS.filter((row) => row.owns === ablation.owns);
      assert.ok(owned.length > 0, `some row owns ${ablation.owns}`);
      assert.ok(owned.some((row) => fn(row.state, row.limit) !== row.want), `taking out ${ablation.owns} changed no row it owns`);
    });
  }
});

// ---------------------------------------------------------------------------
// Where the flag may be read, as text
// ---------------------------------------------------------------------------

/** The text with every comment blanked, line breaks kept. scroll.ts holds no `//` or `/*` inside a string. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

/** Every production `.ts` file under src/, tests excluded. */
function productionFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') out.push(...productionFiles(path));
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(path);
    }
  }
  return out;
}

/** The body of `function name(` in `text`, read by matching braces from the first `{` after its `)`. */
function bodyOf(text: string, name: string): string | null {
  const at = text.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (at < 0) return null;
  const open = text.indexOf('{', text.indexOf(')', at));
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

const GUARD_LINE = 'if (!isThisMacsRunner(run)) return null;';

/**
 * Where scroll.ts may read the flag, as a list of what is wrong (empty when
 * nothing is): a frame read is handed to a runner only inside `readFrame` and
 * `readSettle`, each of which asks `isThisMacsRunner` before it reads, and the
 * settle starts only for this Mac's runner.
 */
function frameReadProblems(source: string): string[] {
  const text = code(source);
  const problems: string[] = [];
  for (const name of ['readFrame', 'readSettle']) {
    const body = bodyOf(text, name);
    if (body === null) {
      problems.push(`${name} is not declared`);
      continue;
    }
    const guard = body.indexOf(GUARD_LINE);
    const read = body.search(/FRAME_(SETTLE_)?READ_FORMAT/);
    if (guard < 0 || read < 0 || read < guard) problems.push(`${name} reads the flag without asking isThisMacsRunner first`);
  }
  let outside = text;
  for (const name of ['readFrame', 'readSettle']) outside = outside.replace(bodyOf(text, name) ?? '\u0000', '');
  const strays = (outside.match(/run\(\s*\[[^\]]*(FRAME_(SETTLE_)?READ_FORMAT|SYNC_FLAG_FIELD)/g) ?? []).length;
  if (strays > 0) problems.push(`${String(strays)} frame read(s) handed to a runner outside readFrame and readSettle`);
  if (!/^\{\s*if \(!isThisMacsRunner\(run\)\) return Promise\.resolve\(\);/.test(bodyOf(text, 'settleOpenFrame') ?? '')) {
    problems.push('settleOpenFrame does not ask isThisMacsRunner first');
  }
  return problems;
}

describe('the flag is this Mac\'s alone (D10, the gate\'s T9)', () => {
  it('names #{synchronized_output_flag} in scroll.ts and in no other production file', () => {
    const naming = productionFiles(SRC)
      .filter((file) => code(readFileSync(file, 'utf8')).includes('synchronized_output_flag'))
      .map((file) => relative(SRC, file));
    assert.deepEqual(naming, ['main/tmux/scroll.ts']);
  });

  it('sends a frame read only from functions that ask isThisMacsRunner first', () => {
    assert.deepEqual(frameReadProblems(readFileSync(SCROLL_TS, 'utf8')), []);
  });

  it('that check goes red on each way of breaking it, planted in a copy', () => {
    const source = readFileSync(SCROLL_TS, 'utf8');
    const once = (from: string, to: string): string => {
      assert.equal(source.split(from).length - 1, 1, `the plant's anchor ${JSON.stringify(from)} stands once`);
      return source.replace(from, to);
    };
    // The guard taken out of readFrame.
    const unguarded = once(
      `): Promise<FrameRead | null> {\n  ${GUARD_LINE}`,
      '): Promise<FrameRead | null> {\n'
    );
    assert.ok(frameReadProblems(unguarded).some((p) => p.startsWith('readFrame')));
    // The flag read in another machine's branch: the pipelined seek.
    const remote = once(
      '    const answers = await pipelined(run, [\n      { args: enterCopyModeArgs',
      "    await run(['display-message', '-p', '-t', target, '-F', FRAME_READ_FORMAT]);\n" +
        '    const answers = await pipelined(run, [\n      { args: enterCopyModeArgs'
    );
    assert.ok(frameReadProblems(remote).some((p) => p.includes('outside readFrame and readSettle')));
    // The settle started for any runner.
    const anyRunner = once(
      '  if (!isThisMacsRunner(run)) return Promise.resolve();\n',
      ''
    );
    assert.ok(frameReadProblems(anyRunner).some((p) => p.startsWith('settleOpenFrame')));
  });

  it('re-freezes only through refreeze, which spells refresh-from-pane once, then the cursor step and the redraw', () => {
    const text = code(readFileSync(SCROLL_TS, 'utf8'));
    assert.equal((text.match(/'refresh-from-pane'/g) ?? []).length, 1);
    assert.match(bodyOf(text, 'refreeze') ?? '', /'refresh-from-pane'/);
    const flight = bodyOf(text, 'settleFlight') ?? '';
    assert.match(
      flight,
      /await refreeze\(run, target\);\s*await cursorToTopRow\(run, target\);\s*await redrawClients\(run, target\);/
    );
  });

  it('spells list-clients and refresh-client in redrawClients alone, which asks isThisMacsRunner first', () => {
    const text = code(readFileSync(SCROLL_TS, 'utf8'));
    const body = bodyOf(text, 'redrawClients') ?? '';
    assert.match(body, /^\{\s*if \(!isThisMacsRunner\(run\)\) return;/);
    for (const verb of ["'list-clients'", "'refresh-client'"]) {
      assert.equal(text.split(verb).length - 1, 1, `${verb} is spelled once`);
      assert.ok(body.includes(verb), `${verb} is spelled in redrawClients`);
    }
    // Nothing in the file sends a size: no resize verb and no refresh-client flag.
    assert.ok(!/'resize-(window|pane)'|'-C'/.test(text));
  });
});
