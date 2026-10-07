/**
 * One read of a session's screen on another machine (Phase 337,
 * build/p337/SPEC.md §5.3.3; widened by Phase 337.1, build/p3371/SPEC.md D6,
 * D10, §5.3.3, §7.2): ONE exec through `execOn` of exactly the display, the
 * styled capture and the display, aimed at the session's LIVE `$N`, the one
 * format and nothing a caller wrote; the answer split by count (tab or `_`),
 * `steady` when its two displays agree; an answer whose count does not hold
 * read as today's split with `steady: false`, never `unreachable`; anything
 * else `unreachable`, with nothing sent when the address is not live. And a
 * page round: ONE exec of the three with two checked whole numbers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SCREEN_FORMAT } from '../../screen/read';

const ESC = String.fromCharCode(0x1b);

const state = vi.hoisted(() => ({
  address: { kind: 'live', machineId: 'm1', tmuxId: '$4' } as
    | { kind: 'live'; machineId: string; tmuxId: string }
    | { kind: 'waiting'; machineId: string }
    | { kind: 'ended' }
    | { kind: 'unknown' },
  ready: true,
  readied: [] as string[],
  calls: [] as { ctx: unknown; args: readonly string[]; options: unknown }[],
  answer: '' as string | Error
}));

vi.mock('../remote-sessions', () => ({ remoteScrollAddress: () => state.address }));
vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => {
    state.readied.push(machineId);
    if (!state.ready) throw new Error('not ready');
    return { kind: 'remote', machineId };
  }
}));
vi.mock('../exec-plane', () => ({
  execOn: (ctx: unknown, args: readonly string[], options: unknown) => {
    state.calls.push({ ctx, args, options });
    return state.answer instanceof Error ? Promise.reject(state.answer) : Promise.resolve(state.answer);
  }
}));

const { readScreenRemote, readScrollbackRemote, remoteScreenArgv, remoteScrollbackArgv, splitRemoteRead } = await import(
  '../remote-screen'
);
const { remoteVerbsOf } = await vi.importActual<typeof import('../exec-plane')>('../exec-plane');

const DISPLAY = ['%9', '80', '3', '2', '1', '1', '0', '250'].join('\t');
/** The same pane, one line further into its history: lines scrolled during the read. */
const DISPLAY_LATER = ['%9', '80', '3', '2', '1', '1', '0', '251'].join('\t');

beforeEach(() => {
  state.address = { kind: 'live', machineId: 'm1', tmuxId: '$4' };
  state.ready = true;
  state.readied = [];
  state.calls = [];
  state.answer = `${DISPLAY}\n${ESC}[31mone\ntwo\n\n${DISPLAY}\n`;
});

describe('remoteScreenArgv', () => {
  it('is the display, the styled capture, then the display, aimed at a $N, with the one format (D6)', () => {
    const argv = remoteScreenArgv('$4');
    expect(argv).toEqual([
      'display-message', '-p', '-t', '$4', SCREEN_FORMAT, ';',
      'capture-pane', '-p', '-e', '-t', '$4', ';',
      'display-message', '-p', '-t', '$4', SCREEN_FORMAT
    ]);
    expect(remoteVerbsOf(argv)).toEqual(['display-message', 'capture-pane', 'display-message']);
    expect(argv.filter((a) => a.includes('#{'))).toEqual([SCREEN_FORMAT, SCREEN_FORMAT]);
  });

  it('refuses any target but a $N', () => {
    for (const target of ['%4', '=name', 'name', '$', '$04', '$4;kill-server', '$4 ']) {
      expect(() => remoteScreenArgv(target), target).toThrow();
    }
  });
});

describe('splitRemoteRead', () => {
  it('by count: the first display, its rows of capture, the last display, steady when the two agree', () => {
    expect(splitRemoteRead(`${DISPLAY}\na\nb\n\n${DISPLAY}\n`)).toEqual({
      styled: 'a\nb\n',
      display: {
        paneId: '%9',
        cols: 80,
        rows: 3,
        cursorX: 2,
        cursorY: 1,
        cursorVisible: true,
        alternate: false,
        history: 250
      },
      displayLine: DISPLAY,
      steady: true
    });
  });

  it('two displays that disagree (lines scrolled during the exec) serve the last, `steady: false`, both lines in displayLine', () => {
    const r = splitRemoteRead(`${DISPLAY}\na\nb\nc\n${DISPLAY_LATER}\n`);
    expect(r?.styled).toBe('a\nb\nc');
    expect(r?.display.history).toBe(251);
    expect(r?.steady).toBe(false);
    expect(r?.displayLine).toBe(`${DISPLAY}\n${DISPLAY_LATER}`);
  });

  it('reads displays a far tmux printed with `_` for its tabs', () => {
    expect(splitRemoteRead(`%9_80_1_0_0_0_1_7\na\n%9_80_1_0_0_0_1_7\n`)).toMatchObject({
      display: { paneId: '%9', cols: 80, rows: 1, alternate: true, history: 7 },
      styled: 'a',
      steady: true
    });
  });

  it('a captured row shaped like a display is a row of the capture, wherever it stands', () => {
    const forged = ['%1', '9', '9', '0', '0', '1', '1', '0'].join('\t');
    const r = splitRemoteRead(`${DISPLAY}\n${forged}\nrow\n${forged}\n${DISPLAY}\n`);
    expect(r?.styled).toBe(`${forged}\nrow\n${forged}`);
    expect(r?.display.paneId).toBe('%9');
    expect(r?.steady).toBe(true);
  });

  it('a count that does not hold is today’s split, `steady: false`, and still a picture (never unreachable, §Attack B16)', () => {
    // The pane grew a row between the first display and the capture.
    const grown = ['%9', '80', '4', '2', '1', '1', '0', '250'].join('\t');
    const r = splitRemoteRead(`${DISPLAY}\na\nb\nc\nd\n${grown}\n`);
    expect(r).toMatchObject({ styled: 'a\nb\nc\nd', steady: false });
    expect(r?.display.rows).toBe(4);
    expect(r?.displayLine).toBe(`${DISPLAY}\n${grown}`);
    // A first line that is not a display: everything but the last line is the capture.
    const odd = splitRemoteRead(`x\ny\n${DISPLAY}\n`);
    expect(odd).toMatchObject({ styled: 'x\ny', steady: false, displayLine: DISPLAY });
  });

  it('no display last is no read', () => {
    expect(splitRemoteRead('')).toBeNull();
    expect(splitRemoteRead('a\nb\n')).toBeNull();
    expect(splitRemoteRead(`${DISPLAY}\ntrailing\n`)).toBeNull();
    expect(splitRemoteRead(`${DISPLAY}\na\nb\nc\nnot a display\n`)).toBeNull();
  });
});

describe('remoteScrollbackArgv (D10)', () => {
  it('is ONE exec of the display, the capture of tmux lines a to b, and the display, with the one format', () => {
    const argv = remoteScrollbackArgv('$4', -228, -101);
    expect(argv).toEqual([
      'display-message', '-p', '-t', '$4', SCREEN_FORMAT, ';',
      'capture-pane', '-p', '-e', '-t', '$4', '-S', '-228', '-E', '-101', ';',
      'display-message', '-p', '-t', '$4', SCREEN_FORMAT
    ]);
    expect(remoteVerbsOf(argv)).toEqual(['display-message', 'capture-pane', 'display-message']);
    expect(argv.filter((a) => a.includes('#{'))).toEqual([SCREEN_FORMAT, SCREEN_FORMAT]);
    expect(argv.filter((a) => a === ';')).toHaveLength(2);
  });

  it('throws before composing for a number that is not whole, and for any target but a $N', () => {
    for (const [a, b] of [
      [-1.5, -1],
      [-228, Number.NaN],
      [Number.POSITIVE_INFINITY, -1],
      [-228, 2 ** 60]
    ] as const) {
      expect(() => remoteScrollbackArgv('$4', a, b), `${String(a)} ${String(b)}`).toThrow();
    }
    for (const target of ['%4', '=name', '$04', '$4;kill-server']) {
      expect(() => remoteScrollbackArgv(target, -228, -101), target).toThrow();
    }
  });
});

describe('readScreenRemote', () => {
  it('ONE exec through execOn, on the machine’s ready context, under the deadline it is handed', async () => {
    const reading = await readScreenRemote('s1', 2_000);
    expect(state.calls).toEqual([
      { ctx: { kind: 'remote', machineId: 'm1' }, args: remoteScreenArgv('$4'), options: { timeoutMs: 2_000 } }
    ]);
    expect(reading).toMatchObject({ styled: `${ESC}[31mone\ntwo\n`, displayLine: DISPLAY, steady: true });
  });

  it('an answer whose count does not hold is a picture, never unreachable (§Attack B16)', async () => {
    state.answer = `${DISPLAY}\nonly one row\n${DISPLAY}\n`;
    expect(await readScreenRemote('s1', 2_000)).toMatchObject({ styled: 'only one row', steady: false });
  });

  it('a session with no live address is unreachable, and nothing is sent', async () => {
    for (const address of [
      { kind: 'waiting', machineId: 'm1' } as const,
      { kind: 'ended' } as const,
      { kind: 'unknown' } as const
    ]) {
      state.address = address;
      expect(await readScreenRemote('s1', 2_000), address.kind).toBe('unreachable');
    }
    // Not even the machine's connection is asked for.
    expect(state.readied).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('a machine with no ready connection, a failed exec, or an answer that is not a reading is unreachable', async () => {
    state.ready = false;
    expect(await readScreenRemote('s1', 2_000)).toBe('unreachable');
    expect(state.calls).toEqual([]);
    state.ready = true;
    state.answer = new Error('ssh: connect to host');
    expect(await readScreenRemote('s1', 2_000)).toBe('unreachable');
    state.answer = 'no display here\n';
    expect(await readScreenRemote('s1', 2_000)).toBe('unreachable');
  });
});

describe('readScrollbackRemote (D10)', () => {
  const FIRST = ['%9', '80', '3', '2', '1', '1', '0', '10'].join('\t');

  it('asks the live address first, then ONE exec of the page argv under the deadline it is handed, split by count', async () => {
    // -S -12 -E -9 over a history of 10: lines 0 and 1.
    state.answer = `${FIRST}\nL1\nL2\n${FIRST}\n`;
    const round = await readScrollbackRemote('s1', -12, -9, 2_000);
    expect(state.calls).toEqual([
      { ctx: { kind: 'remote', machineId: 'm1' }, args: remoteScrollbackArgv('$4', -12, -9), options: { timeoutMs: 2_000 } }
    ]);
    expect(round).toMatchObject({ rows: ['L1', 'L2'] });
    expect(round === null || round === 'unreachable' ? null : round.last.history).toBe(10);
  });

  it('no live address, no ready connection, or a failed exec is unreachable; an answer that is not a round is null', async () => {
    state.address = { kind: 'waiting', machineId: 'm1' };
    expect(await readScrollbackRemote('s1', -12, -9, 2_000)).toBe('unreachable');
    expect(state.readied).toEqual([]);
    expect(state.calls).toEqual([]);
    state.address = { kind: 'live', machineId: 'm1', tmuxId: '$4' };
    state.ready = false;
    expect(await readScrollbackRemote('s1', -12, -9, 2_000)).toBe('unreachable');
    expect(state.calls).toEqual([]);
    state.ready = true;
    state.answer = new Error('ssh: connect to host');
    expect(await readScrollbackRemote('s1', -12, -9, 2_000)).toBe('unreachable');
    state.answer = `${FIRST}\nL1\n${FIRST}\n`;
    expect(await readScrollbackRemote('s1', -12, -9, 2_000)).toBeNull();
  });
});
