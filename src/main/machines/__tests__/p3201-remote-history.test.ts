/**
 * Phase 320.1, a history copy from a session on another machine reads THAT
 * machine (build/p3201/SPEC.md D11, §3.7).
 *
 * The module is src/main/machines/remote-pane-history.ts. The spec calls it
 * `remote-history.ts`, a name Phase 107's commit graph module already holds.
 *
 * What is pinned:
 *
 *  - `remoteHistoryArgs` composes exactly two argvs, the extent read and the
 *    capture, every value `$N` or a whole number, and the module names neither
 *    scroll verb and reaches the machine through `execOn` alone;
 *  - hostile targets and ranges (negative, NaN, a fraction, 1e9, 1e300,
 *    reversed, gone) are clamped by THIS Mac's clamp or refused before any
 *    capture is sent, never sent as text;
 *  - only a LIVE address is read, and the answer is shaped exactly as this Mac's
 *    `captureHistoryRange` shapes it;
 *  - the capture registrar routes a remote session there, refuses a remote read
 *    with no range, and hands every other input to this Mac's path unchanged,
 *    the same object, so a local `sessionId` changes nothing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapturePaneInput } from '@shared/ipc';
import type { RemoteScrollAddress } from '../remote-sessions';

let addresses = new Map<string, RemoteScrollAddress>();
let records = new Map<string, { id: string; machineId?: string }>();
/** Every argv the exec plane was handed, and what the extent read answers. */
let execs: string[][] = [];
let extentAnswer = '861 43\n';

vi.mock('../remote-sessions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-sessions')>()),
  remoteScrollAddress: (id: string): RemoteScrollAddress => addresses.get(id) ?? { kind: 'unknown' }
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteRecordOf: (id: string) => records.get(id) ?? null
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => ({ kind: 'remote', machineId })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    execs.push([...args]);
    return Promise.resolve(args[0] === 'display-message' ? extentAnswer : 'far row\n');
  }
}));

/** This Mac's path, recorded so a test can say it was, or was not, taken. */
const localCalls: CapturePaneInput[] = [];
vi.mock('../../capture/service', () => ({
  captureImage: () => undefined,
  captureViewport: () => undefined,
  clearHistory: () => undefined,
  saveLastCapture: () => undefined,
  writeRichClipboard: () => undefined,
  capturePaneText: (input: CapturePaneInput) => {
    localCalls.push(input);
    return Promise.resolve({ ansi: 'local row\n' });
  }
}));

/** The registrar's handlers, by channel. */
const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
vi.mock('../../typed-ipc', () => ({
  handle: (_ipc: unknown, channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
    handlers.set(channel, fn);
  }
}));

const { REMOTE_EXTENT_FORMAT, namesSessionOnMachine, readRemoteHistoryRange, remoteHistoryArgs } = await import(
  '../remote-pane-history'
);
const { registerCaptureIpc } = await import('../../capture/ipc');
registerCaptureIpc({} as never);

const REPO = join(__dirname, '../../../..');

beforeEach(() => {
  addresses = new Map();
  records = new Map();
  execs = [];
  extentAnswer = '861 43\n';
  localCalls.length = 0;
});

function capturePane(input: CapturePaneInput): Promise<unknown> {
  const fn = handlers.get('capture:pane');
  if (fn === undefined) throw new Error('capture:pane was not registered');
  return Promise.resolve(fn({}, input));
}

describe('the two argvs', () => {
  it('are the extent read and the capture, $N and whole numbers only', () => {
    const argvs = remoteHistoryArgs('$3', { start: -325, end: -284 }, true);
    expect(argvs).toHaveLength(2);
    expect(argvs[0]).toEqual(['display-message', '-p', '-t', '$3', '-F', REMOTE_EXTENT_FORMAT]);
    expect(argvs[1]).toEqual(['capture-pane', '-p', '-e', '-J', '-t', '$3', '-S', '-325', '-E', '-284']);
    expect(remoteHistoryArgs('$3', { start: 0, end: 5 }, false)[1]).toEqual([
      'capture-pane', '-p', '-e', '-t', '$3', '-S', '0', '-E', '5'
    ]);
    // The two fields of this Mac's own extent format, with a space where it has
    // a tab (Phase 320.1's fix round), so no byte of it is one a client with no
    // UTF-8 locale gets back as `_`.
    const sessions = readFileSync(join(REPO, 'src/main/tmux/sessions.ts'), 'utf8');
    expect(sessions.includes(`'${REMOTE_EXTENT_FORMAT.replace(' ', '\\t')}'`)).toBe(true);
    expect(/^[\x20-\x7e]+$/.test(REMOTE_EXTENT_FORMAT)).toBe(true);
  });

  it('refuse a target that is not a session id, and a range end that is not a whole number', () => {
    for (const target of ['%3', '=name', 'name', '$03', '$3 ; kill-server', '']) {
      expect(() => remoteHistoryArgs(target, { start: 0, end: 1 }, false), target).toThrow();
    }
    for (const bad of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, 1e300, -1e300]) {
      expect(() => remoteHistoryArgs('$3', { start: bad, end: 1 }, false), String(bad)).toThrow();
      expect(() => remoteHistoryArgs('$3', { start: 0, end: bad }, false), String(bad)).toThrow();
    }
  });

  it('the module names neither scroll verb and reaches the machine through execOn alone', () => {
    const source = readFileSync(join(REPO, 'src/main/machines/remote-pane-history.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code.includes('copy-mode')).toBe(false);
    expect(code.includes('send-keys')).toBe(false);
    expect(code.includes('remoteScrollRunner')).toBe(false);
    expect(code.includes('sendCommand')).toBe(false);
    expect(code.match(/execOn\(/g)).toHaveLength(2);
    // Exactly two argv literals: the extent read's and the capture's.
    expect(code.match(/'display-message'/g)).toHaveLength(1);
    expect(code.match(/'capture-pane'/g)).toHaveLength(1);
  });
});

describe('a range read from a live address', () => {
  beforeEach(() => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
  });

  it('converts oldest-first lines against a fresh extent, as this Mac does', async () => {
    const res = await readRemoteHistoryRange('sess', { start: 536, end: 577 }, true);
    expect(execs).toEqual([
      ['display-message', '-p', '-t', '$7', '-F', REMOTE_EXTENT_FORMAT],
      ['capture-pane', '-p', '-e', '-J', '-t', '$7', '-S', String(536 - 861), '-E', String(577 - 861)]
    ]);
    expect(res).toEqual({ ansi: 'far row\n', firstLine: 536 });
  });

  it('a negative start is clamped to the oldest line and says so', async () => {
    const res = await readRemoteHistoryRange('sess', { start: -30, end: 5 }, false);
    expect(execs[1]).toEqual(['capture-pane', '-p', '-e', '-t', '$7', '-S', '-861', '-E', String(5 - 861)]);
    expect(res.firstLine).toBe(0);
  });

  it('an end of 1e9 is cut at the last row of the screen', async () => {
    await readRemoteHistoryRange('sess', { start: 900, end: 1e9 }, false);
    expect(execs[1]?.slice(-4)).toEqual(['-S', '39', '-E', '42']);
  });

  it('a reversed range, and one entirely gone, answer nothing and capture nothing', async () => {
    expect(await readRemoteHistoryRange('sess', { start: 600, end: 500 }, false)).toEqual({ ansi: '', firstLine: 600 });
    extentAnswer = '20 10\n';
    expect(await readRemoteHistoryRange('sess', { start: -50, end: -40 }, false)).toEqual({ ansi: '', firstLine: 0 });
    expect(await readRemoteHistoryRange('sess', { start: 1e9, end: 2e9 }, false)).toEqual({ ansi: '', firstLine: 1e9 });
    expect(execs.every((argv) => argv[0] === 'display-message')).toBe(true);
  });

  it('NaN is refused before a capture is composed, and never sent as text', async () => {
    await expect(readRemoteHistoryRange('sess', { start: Number.NaN, end: 5 }, false)).rejects.toThrow();
    await expect(readRemoteHistoryRange('sess', { start: 0, end: Number.NaN }, false)).rejects.toThrow();
    expect(execs.every((argv) => argv[0] === 'display-message')).toBe(true);
    expect(execs.flat().some((element) => element.includes('NaN'))).toBe(false);
  });

  it('a hostile extent answer is refused, and no capture is composed from it', async () => {
    for (const hostile of ['1e400 43\n', '#(touch x) ;kill-server\n', '-5 43\n', '5.5 43\n', ' 5 43\n']) {
      extentAnswer = hostile;
      await expect(readRemoteHistoryRange('sess', { start: 0, end: 5 }, false), hostile).rejects.toMatchObject({
        payload: { code: 'TMUX_UNREACHABLE' }
      });
    }
    expect(execs.some((one) => one[0] === 'capture-pane')).toBe(false);
  });

  it('an extent a client with no UTF-8 locale sanitized is refused, never read as an empty range (Phase 320.1\'s fix round)', async () => {
    // Measured by the attack verifier over the loopback machine, 3.6a and 3.7b:
    // the tab format answered `1971_30`, which the lenient reader took as no
    // history and no rows, so every copy came back empty.
    for (const unreadable of ['1971_30\n', '1971\t30\n', '1971\n', '1971 30 7\n', '1971 30\n40 2\n', '\n', '']) {
      extentAnswer = unreadable;
      const err = await readRemoteHistoryRange('sess', { start: 0, end: 5 }, false).then(
        () => null,
        (one: unknown) => one as { payload?: { code?: string; message?: string; detail?: string } }
      );
      expect(err?.payload?.code, JSON.stringify(unreadable)).toBe('TMUX_UNREACHABLE');
      expect(err?.payload?.message).toBe("Couldn't read this session's history.");
      // The refusal names no byte of the far answer.
      expect(JSON.stringify(err?.payload ?? {}).includes('1971')).toBe(false);
    }
    expect(execs.some((one) => one[0] === 'capture-pane')).toBe(false);
    // And a clean answer still reads.
    extentAnswer = '1971 30\n';
    expect(await readRemoteHistoryRange('sess', { start: 1500, end: 1520 }, false)).toEqual({
      ansi: 'far row\n',
      firstLine: 1500
    });
  });
});

describe('only a live address is read', () => {
  for (const address of [
    { kind: 'waiting', machineId: 'far' },
    { kind: 'ended' },
    { kind: 'unknown' }
  ] as RemoteScrollAddress[]) {
    it(`${address.kind}: refused, and nothing is sent`, async () => {
      addresses.set('sess', address);
      await expect(readRemoteHistoryRange('sess', { start: 0, end: 5 }, false)).rejects.toMatchObject({
        payload: { code: 'TMUX_UNREACHABLE' }
      });
      expect(execs).toEqual([]);
    });
  }
});

describe('the capture registrar routes by session', () => {
  it('a session on this Mac, or none named: this Mac\'s path, the same object, and nothing sent', async () => {
    records.set('mac', { id: 'mac', machineId: 'local' });
    const withLocal: CapturePaneInput = { tmuxName: 'work', historyLines: 0, range: { start: 1, end: 2 }, sessionId: 'mac' };
    const withNone: CapturePaneInput = { tmuxName: 'work', historyLines: 207 };
    const withUnknown: CapturePaneInput = { tmuxName: 'work', historyLines: 0, range: { start: 1, end: 2 }, sessionId: 'nobody' };
    expect(await capturePane(withLocal)).toEqual({ ansi: 'local row\n' });
    expect(await capturePane(withNone)).toEqual({ ansi: 'local row\n' });
    expect(await capturePane(withUnknown)).toEqual({ ansi: 'local row\n' });
    expect(localCalls).toHaveLength(3);
    expect(localCalls[0]).toBe(withLocal);
    expect(localCalls[1]).toBe(withNone);
    expect(localCalls[2]).toBe(withUnknown);
    expect(execs).toEqual([]);
  });

  it('a session on another machine: read there, never by name here', async () => {
    addresses.set('far-sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const res = await capturePane({
      tmuxName: 'work',
      historyLines: 0,
      range: { start: 536, end: 577 },
      join: true,
      sessionId: 'far-sess'
    });
    expect(res).toEqual({ ansi: 'far row\n', firstLine: 536 });
    expect(localCalls).toEqual([]);
    expect(execs.map((argv) => argv[0])).toEqual(['display-message', 'capture-pane']);
  });

  it('a session on another machine with no range: refused with the existing sentence, nothing sent', async () => {
    addresses.set('far-sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    await expect(capturePane({ tmuxName: 'work', historyLines: 200, sessionId: 'far-sess' })).rejects.toMatchObject({
      payload: { message: "Couldn't read this session's history." }
    });
    expect(localCalls).toEqual([]);
    expect(execs).toEqual([]);
  });

  it('a remote row the feed does not hold yet: refused with the existing sentence, never read here', async () => {
    records.set('far-sess', { id: 'far-sess', machineId: 'far' });
    expect(namesSessionOnMachine('far-sess')).toBe(true);
    await expect(
      capturePane({ tmuxName: 'work', historyLines: 0, range: { start: 0, end: 5 }, sessionId: 'far-sess' })
    ).rejects.toMatchObject({ payload: { message: "Couldn't read this session's history." } });
    expect(localCalls).toEqual([]);
    expect(execs).toEqual([]);
  });
});
