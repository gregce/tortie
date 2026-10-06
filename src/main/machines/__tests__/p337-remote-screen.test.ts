/**
 * One read of a session's screen on another machine (Phase 337,
 * build/p337/SPEC.md §5.3.3): ONE exec through `execOn` of exactly the
 * styled capture and the display, aimed at the session's LIVE `$N`, the one
 * format and nothing a caller wrote; the answer's last line the display (tab
 * or `_`), the rest the capture; anything else `unreachable`, with nothing
 * sent when the address is not live.
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

const { readScreenRemote, remoteScreenArgv, splitRemoteRead } = await import('../remote-screen');
const { remoteVerbsOf } = await vi.importActual<typeof import('../exec-plane')>('../exec-plane');

const DISPLAY = ['%9', '80', '3', '2', '1', '1', '0'].join('\t');

beforeEach(() => {
  state.address = { kind: 'live', machineId: 'm1', tmuxId: '$4' };
  state.ready = true;
  state.readied = [];
  state.calls = [];
  state.answer = `${ESC}[31mone\ntwo\n\n${DISPLAY}\n`;
});

describe('remoteScreenArgv', () => {
  it('is the styled capture, then the display, aimed at a $N, with the one format', () => {
    const argv = remoteScreenArgv('$4');
    expect(argv).toEqual(['capture-pane', '-p', '-e', '-t', '$4', ';', 'display-message', '-p', '-t', '$4', SCREEN_FORMAT]);
    expect(remoteVerbsOf(argv)).toEqual(['capture-pane', 'display-message']);
    expect(argv.filter((a) => a.includes('#{'))).toEqual([SCREEN_FORMAT]);
  });

  it('refuses any target but a $N', () => {
    for (const target of ['%4', '=name', 'name', '$', '$04', '$4;kill-server', '$4 ']) {
      expect(() => remoteScreenArgv(target), target).toThrow();
    }
  });
});

describe('splitRemoteRead', () => {
  it('the last line is the display, the rest the capture', () => {
    expect(splitRemoteRead(`a\nb\n\n${DISPLAY}\n`)).toEqual({
      styled: 'a\nb\n',
      display: { paneId: '%9', cols: 80, rows: 3, cursorX: 2, cursorY: 1, cursorVisible: true, alternate: false },
      displayLine: DISPLAY
    });
  });

  it('reads a display a far tmux printed with `_` for its tabs', () => {
    expect(splitRemoteRead(`a\n%9_80_1_0_0_0_1\n`)?.display).toMatchObject({ paneId: '%9', cols: 80, rows: 1, alternate: true });
  });

  it('a captured row shaped like a display is a row of the capture', () => {
    const forged = ['%1', '9', '9', '0', '0', '1', '1'].join('\t');
    const r = splitRemoteRead(`${forged}\nrow\n${DISPLAY}\n`);
    expect(r?.styled).toBe(`${forged}\nrow`);
    expect(r?.display.paneId).toBe('%9');
  });

  it('no display last is no read', () => {
    expect(splitRemoteRead('')).toBeNull();
    expect(splitRemoteRead('a\nb\n')).toBeNull();
    expect(splitRemoteRead(`${DISPLAY}\ntrailing\n`)).toBeNull();
  });
});

describe('readScreenRemote', () => {
  it('ONE exec through execOn, on the machine’s ready context, under the deadline it is handed', async () => {
    const reading = await readScreenRemote('s1', 2_000);
    expect(state.calls).toEqual([
      { ctx: { kind: 'remote', machineId: 'm1' }, args: remoteScreenArgv('$4'), options: { timeoutMs: 2_000 } }
    ]);
    expect(reading).toMatchObject({ styled: `${ESC}[31mone\ntwo\n`, displayLine: DISPLAY });
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
