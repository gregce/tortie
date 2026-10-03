/**
 * Phase 320.1, the session core scrolls a session on another machine exactly as
 * it scrolls one here (build/p3201/SPEC.md §3.5, D3, D4, D10).
 *
 * HOW IT IS DRIVEN, the shape `p95-scroll-no-pane.test.ts` settled on: the real
 * four methods are borrowed off `GmuxCore.prototype` and run against an object
 * holding `liveIds` and this Mac's runner, so no tmux server, attach host or
 * control client is booted. The two facts the core asks about a machine, the
 * session's address and the machine's carriage, are answered by this file; the
 * carriage's runner is the SHIPPING `guardedScrollRunner` over a recording send,
 * so every argv the core composes for a machine is also checked by the table.
 *
 * §3.5's table, row by row:
 *
 *   liveIds holds the id                          this Mac's path, and neither
 *                                                 machine fact is even asked
 *   address live, carriage live                   the operation, at the row's $N
 *   address live or waiting, carriage waiting     not reachable now
 *   address waiting, carriage live                not reachable now, 0 writes
 *   carriage none                                 NO_PANE_HERE
 *   address ended                                 NO_PANE_HERE
 *   address unknown, a remote manifest row        none: NO_PANE_HERE, else not
 *                                                 reachable now
 *   address unknown, anything else                NO_PANE_HERE
 *
 * and nothing throws: a far failure is the not-reachable-now value, said in the
 * log once per machine per connection with no argv and no far bytes.
 *
 * Phase 320.1's fix round adds the READ PROOF (`proveRemoteRead`): the first
 * operation on a machine's connection is preceded by one read, and a
 * connection whose first read cannot be read (a control client with no UTF-8
 * locale answered the tab format as `0__1971_30_0_0_100_`) answers NO_PANE_HERE
 * for every operation and parks nothing.
 *
 * THE SECOND BUILD (build/p3201/SPEC.md §6.5, D3, D5, D6) adds, driven through
 * the same four methods over a scripted far pane:
 *
 *  - `keysOrderedInMain` on EVERY remote answer, live and not reachable now,
 *    and never on NO_PANE_HERE or on an answer for this Mac;
 *  - a park of a pane not known parked waits for the attach to be quiet for
 *    ROAD_QUIET_MS, writing NOTHING while it waits, and a key typed in the wait
 *    DROPS it (the fix round, F2; an injected clock);
 *  - the read before the park (D3) comes before `copy-mode`; a pane whose
 *    program has the screen or the mouse is answered with that read and
 *    nothing else is written; a park the program raced is cancelled;
 *  - a key typed while the park's read is on its way takes the control
 *    connection behind that read, and the park is dropped (F2);
 *  - a pane Tortie parked goes back to its program at the next read once the
 *    program takes the screen or the mouse, and copy mode Tortie did not enter
 *    is left alone (F3);
 *  - a connection whose first read cannot be read carries no keystroke either;
 *  - a remote session removed or ended forgets its roads;
 *  - the ruled round (GONE): a pane that is or may be scrolled back on a
 *    machine that missed its greeting answers "not reachable now" rather than
 *    NO_PANE_HERE, so the surface keeps it while a key asks that machine once
 *    more; and once that ask has failed, NO_PANE_HERE again, as today (his
 *    ruling of 2026-10-02, "Fall back to today").
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TerminalScrollState } from '@shared/ipc';
import type { RemoteScrollCarriage } from '../../machines/scroll-shapes';
import type { RemoteScrollAddress } from '../../machines/remote-sessions';
import type { GmuxCore as Core } from '../core';

/** What the core is told about each session and each machine. */
let addresses = new Map<string, RemoteScrollAddress>();
let carriages = new Map<string, RemoteScrollCarriage>();
let records = new Map<string, { id: string; machineId?: string; removedAt?: number }>();
let remoteIds = new Set<string>();
let addressAsked = 0;
let carriageAsked = 0;
/** The ruled round: machines that missed their greeting this run. */
let missed = new Set<string>();

vi.mock('../../machines/remote-sessions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/remote-sessions')>()),
  remoteScrollAddress: (sessionId: string): RemoteScrollAddress => {
    addressAsked += 1;
    return addresses.get(sessionId) ?? { kind: 'unknown' };
  },
  // The remove and end paths below ask these; nothing here reaches a machine.
  isRemoteSessionId: (sessionId: string): boolean => remoteIds.has(sessionId),
  remoteKill: (): Promise<void> => Promise.resolve()
}));

vi.mock('../../machines/remote-capsule', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/remote-capsule')>()),
  captureRemoteSessionNow: (): Promise<boolean> => Promise.resolve(true)
}));

vi.mock('../../typed-events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../typed-events')>()),
  broadcastEvent: (): void => undefined
}));

vi.mock('../../machines/control-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/control-plane')>()),
  remoteScrollRunner: (machineId: string): RemoteScrollCarriage => {
    carriageAsked += 1;
    return carriages.get(machineId) ?? { kind: 'waiting' };
  },
  missedGreetingThisRun: (machineId: string): boolean => missed.has(machineId)
}));

vi.mock('../../machines/remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/remote-record')>()),
  remoteRecordOf: (sessionId: string) => records.get(sessionId) ?? null
}));

const { GmuxCore } = await import('../core');
const { guardedScrollRunner } = await import('../../machines/scroll-shapes');
const { REMOTE_STATE_FORMAT } = await import('../../tmux/scroll');
const { ROAD_QUIET_MS, resetScrollOrderForTests, roadFacts, routeKey, noteAnswer } = await import(
  '../../machines/scroll-order'
);

const NO_PANE_HERE: TerminalScrollState = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};
const NOT_REACHABLE_NOW: TerminalScrollState = {
  ...NO_PANE_HERE,
  unreachable: true,
  keysOrderedInMain: true
};

/** A parked pane's read, 120 back over 5000, 42 rows, 152 columns. */
const PARKED_FIELDS = ['1', '120', '5000', '42', '0', '0', '152', ''];
/** As this Mac's read answers it. */
const PARKED = PARKED_FIELDS.join('\t');
/** As a machine's read answers it (`REMOTE_STATE_FORMAT`, a space between fields). */
const PARKED_THERE = PARKED_FIELDS.join(' ');
/**
 * What a machine's control client with NO UTF-8 locale answered for this
 * Mac's tab format, measured by the attack verifier over the loopback machine
 * on 3.6a and 3.7b: every tab turned into `_`.
 */
const SANITIZED = '0__1971_30_0_0_100_';
/** The line the read proof writes before a connection's first operation. */
const PROOF_READ = `display-message -p -t $7 -F '${REMOTE_STATE_FORMAT}'`;

interface Harness {
  core: Core;
  local: string[][];
}

function harness(bindings: [string, string][]): Harness {
  const local: string[][] = [];
  const core = Object.create(GmuxCore.prototype) as Core;
  Object.assign(core, {
    liveIds: new Map<string, string>(bindings),
    runScrollCommand: async (args: readonly string[]): Promise<string> => {
      local.push([...args]);
      return PARKED;
    }
  });
  return { core, local };
}

/**
 * A live carriage whose writes are recorded and answered, through the shipping
 * table. `asked` counts calls to the runner ITSELF, before the table: the table
 * would refuse a missing `$N` on its own, and a rule in the core that let one
 * through must still read red here rather than be hidden by the layer below.
 */
function liveCarriage(
  generation = 1,
  answer: (line: string) => Promise<readonly string[]> = () => Promise.resolve([PARKED_THERE])
): { carriage: RemoteScrollCarriage; lines: string[]; asked: () => number } {
  const lines: string[] = [];
  let asked = 0;
  const inner = guardedScrollRunner({
    send: (line) => {
      lines.push(line);
      return answer(line);
    },
    isCurrent: () => true,
    server: 'machine:far'
  });
  const run = Object.assign(
    (args: readonly string[]): Promise<string> => {
      asked += 1;
      return inner(args);
    },
    { ordered: true as const, server: 'machine:far' }
  );
  return { lines, asked: () => asked, carriage: { kind: 'live', generation, run } };
}

const VERBS: [string, (core: Core, id: string) => Promise<TerminalScrollState>][] = [
  ['scrollState', (core, id) => core.scrollState({ sessionId: id })],
  ['scrollBy', (core, id) => core.scrollBy({ sessionId: id, lines: 5 })],
  ['scrollTo', (core, id) => core.scrollTo({ sessionId: id, position: 300 })],
  ['scrollLive', (core, id) => core.scrollLive(id)]
];

beforeEach(() => {
  addresses = new Map();
  carriages = new Map();
  records = new Map();
  remoteIds = new Set();
  addressAsked = 0;
  carriageAsked = 0;
  missed = new Set();
  resetScrollOrderForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('liveIds holds the id: this Mac\'s path, byte for byte', () => {
  for (const [name, call] of VERBS) {
    it(`${name} runs this Mac's runner at the $-id and asks no machine fact`, async () => {
      addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
      const { carriage, lines } = liveCarriage();
      carriages.set('far', carriage);
      const { core, local } = harness([['sess', '$4']]);
      const state = await call(core, 'sess');
      expect(state.hasPane).toBe(true);
      expect('unreachable' in state).toBe(false);
      // This Mac's answers never say main orders the keys: P1 to P4 stay here.
      expect('keysOrderedInMain' in state).toBe(false);
      expect(local.length).toBeGreaterThan(0);
      expect(local.every((argv) => argv.includes('$4'))).toBe(true);
      expect(lines).toEqual([]);
      expect(addressAsked).toBe(0);
      expect(carriageAsked).toBe(0);
    });
  }
});

describe('address live, carriage live: the operation on that machine', () => {
  for (const [name, call] of VERBS) {
    it(`${name} runs over the machine's runner at the row's $N`, async () => {
      addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
      const { carriage, lines } = liveCarriage();
      carriages.set('far', carriage);
      const { core, local } = harness([]);
      const state = await call(core, 'sess');
      expect(local).toEqual([]);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((line) => line.includes(' $7'))).toBe(true);
      expect(state).toMatchObject({ hasPane: true, keysOrderedInMain: true });
      expect('unreachable' in state).toBe(false);
    });
  }

  it('answers the read\'s numbers exactly, with hasPane true', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    carriages.set('far', liveCarriage().carriage);
    const { core } = harness([]);
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual({
      hasPane: true,
      position: 120,
      history: 5000,
      rows: 42,
      cols: 152,
      frameHistory: null,
      inMode: true,
      innerAlt: false,
      innerMouse: false,
      keysOrderedInMain: true
    });
  });

  it('a relative scroll is written as one pipelined sequence', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const { carriage, lines } = liveCarriage();
    carriages.set('far', carriage);
    const { core } = harness([]);
    await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(lines).toEqual([
      // The read proof, once for this connection; the read before a park of a
      // pane not known parked (D3), which found it parked; then the sequence.
      PROOF_READ,
      PROOF_READ,
      'copy-mode -e -t $7',
      'send-keys -t $7 -X -N 5 scroll-up',
      'send-keys -t $7 -X top-line',
      PROOF_READ
    ]);
    // A second operation on the same connection asks no proof again, and a
    // pane known parked is not read before the park.
    lines.length = 0;
    await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(lines).toEqual([
      'copy-mode -e -t $7',
      'send-keys -t $7 -X -N 5 scroll-up',
      'send-keys -t $7 -X top-line',
      PROOF_READ
    ]);
  });
});

describe('the read proof: never park what cannot be read (Phase 320.1\'s fix round)', () => {
  it('a connection whose first read cannot be read answers NO_PANE_HERE for every verb, and writes only that read', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'nolocale', tmuxId: '$7' });
    const live = liveCarriage(1, () => Promise.resolve([SANITIZED]));
    carriages.set('nolocale', live.carriage);
    const { core, local } = harness([]);
    for (const [, call] of VERBS) {
      const state = await call(core, 'sess');
      expect(state).toEqual(NO_PANE_HERE);
      expect('unreachable' in state).toBe(false);
      expect('keysOrderedInMain' in state).toBe(false);
    }
    expect(await core.scrollBy({ sessionId: 'sess', lines: 40 })).toEqual(NO_PANE_HERE);
    // ONE read crossed, for the whole connection: no copy-mode, no scroll.
    expect(live.lines).toEqual([PROOF_READ]);
    expect(local).toEqual([]);
    // And no keystroke takes that connection either (D10): the attach, as today.
    expect(routeKey('sess', 'x')).toBe('attach');
    noteAnswer('sess', 'failed');
    expect(roadFacts('sess').mayBeParked).toBe(true);
    expect(routeKey('sess', 'y')).toBe('attach');
    expect(live.lines).toEqual([PROOF_READ]);
    const said = spy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .filter((line: string) => line.includes('nolocale') && line.includes('does not read'));
    expect(said).toHaveLength(1);
    expect(said[0]?.includes('0__1971')).toBe(false);
  });

  it('a new connection is asked again, and scrolls when its read can be read', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'mended', tmuxId: '$7' });
    carriages.set('mended', liveCarriage(1, () => Promise.resolve([SANITIZED])).carriage);
    const { core } = harness([]);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toEqual(NO_PANE_HERE);
    const next = liveCarriage(2);
    carriages.set('mended', next.carriage);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toMatchObject({
      hasPane: true,
      position: 120,
      inMode: true
    });
    expect(next.lines[0]).toBe(PROOF_READ);
    expect(next.lines).toContain('copy-mode -e -t $7');
  });

  it('a proof read that got no answer proves nothing: the value, and the next operation asks again', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'flaky', tmuxId: '$7' });
    let fail = true;
    const live = liveCarriage(1, () => (fail ? Promise.reject(new Error('dropped')) : Promise.resolve([PARKED_THERE])));
    carriages.set('flaky', live.carriage);
    const { core } = harness([]);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toEqual(NOT_REACHABLE_NOW);
    expect(live.lines).toEqual([PROOF_READ]);
    fail = false;
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toMatchObject({ hasPane: true, position: 120 });
    expect(live.lines[1]).toBe(PROOF_READ);
    expect(live.lines).toContain('copy-mode -e -t $7');
  });

  it('after a good proof, an operation whose read cannot be read is the not-reachable-now value, never live', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'turned', tmuxId: '$7' });
    let answer = PARKED_THERE;
    carriages.set('turned', liveCarriage(1, () => Promise.resolve([answer])).carriage);
    const { core } = harness([]);
    expect(await core.scrollState({ sessionId: 'sess' })).toMatchObject({ hasPane: true, inMode: true });
    answer = SANITIZED;
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
  });
});

describe('the not-reachable-now value', () => {
  const cases: [string, RemoteScrollAddress, RemoteScrollCarriage | 'live'][] = [
    ['address live, carriage waiting', { kind: 'live', machineId: 'far', tmuxId: '$7' }, { kind: 'waiting' }],
    ['address waiting, carriage waiting', { kind: 'waiting', machineId: 'far' }, { kind: 'waiting' }],
    ['address waiting, carriage live', { kind: 'waiting', machineId: 'far' }, 'live']
  ];
  for (const [label, address, carriageOrLive] of cases) {
    for (const [name, call] of VERBS) {
      it(`${label}: ${name} answers it and writes nothing`, async () => {
        addresses.set('sess', address);
        const live = liveCarriage();
        carriages.set('far', carriageOrLive === 'live' ? live.carriage : carriageOrLive);
        const { core, local } = harness([]);
        expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
        expect(local).toEqual([]);
        expect(live.lines).toEqual([]);
        expect(live.asked()).toBe(0);
      });
    }
  }
});

describe('NO_PANE_HERE, Phase 320\'s pass-through', () => {
  for (const [name, call] of VERBS) {
    it(`carriage none: ${name}`, async () => {
      addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
      carriages.set('far', { kind: 'none' });
      const { core, local } = harness([]);
      const state = await call(core, 'sess');
      expect(state).toEqual(NO_PANE_HERE);
      expect('unreachable' in state).toBe(false);
      expect('keysOrderedInMain' in state).toBe(false);
      expect(local).toEqual([]);
    });

    it(`address ended: ${name}, and no carriage is asked`, async () => {
      addresses.set('sess', { kind: 'ended' });
      carriages.set('far', liveCarriage().carriage);
      const { core, local } = harness([]);
      expect(await call(core, 'sess')).toEqual(NO_PANE_HERE);
      expect(local).toEqual([]);
      expect(carriageAsked).toBe(0);
    });
  }

  it('address waiting, carriage none', async () => {
    addresses.set('sess', { kind: 'waiting', machineId: 'far' });
    carriages.set('far', { kind: 'none' });
    const { core } = harness([]);
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual(NO_PANE_HERE);
  });
});

describe('a scrolled-back pane on a machine that missed its greeting is kept (the ruled round, GONE)', () => {
  // The reverifier's GONE row: the app answered "no pane" for such a pane, so
  // the surface stopped asking and only a remount could bring scrolling back,
  // after a key returned the pane. Now it answers "not reachable now", and the
  // first answer after a key's ask brings the connection back is a live one.
  for (const [name, call] of VERBS) {
    it(`${name}: not reachable now, and nothing written anywhere`, async () => {
      addresses.set('sess', { kind: 'waiting', machineId: 'far' });
      carriages.set('far', { kind: 'none' });
      missed.add('far');
      noteAnswer('sess', {
        position: 120,
        history: 5000,
        rows: 42,
        cols: 152,
        frameHistory: null,
        inMode: true,
        innerAlt: false,
        innerMouse: false
      });
      const { core, local } = harness([]);
      expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
      expect(local).toEqual([]);
    });
  }

  it('once a key\'s ask of that machine has failed: NO_PANE_HERE for every verb, as today (his ruling of 2026-10-02)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'waiting', machineId: 'far' });
    carriages.set('far', { kind: 'none' });
    missed.add('far');
    let asks = 0;
    resetScrollOrderForTests(
      { now: () => 1_000, sleep: () => new Promise<void>((resolve) => setImmediate(resolve)) },
      {
        address: (id) => addresses.get(id) ?? { kind: 'unknown' },
        carriage: (machineId) => carriages.get(machineId) ?? { kind: 'waiting' },
        mayReopen: (machineId) => missed.has(machineId),
        reopen: () => {
          asks += 1;
          return Promise.resolve(false);
        }
      }
    );
    noteAnswer('sess', {
      position: 120,
      history: 5000,
      rows: 42,
      cols: 152,
      frameHistory: null,
      inMode: true,
      innerAlt: false,
      innerMouse: false
    });
    const { core, local } = harness([]);
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual(NOT_REACHABLE_NOW);
    expect(routeKey('sess', 'a')).toBe('held');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(roadFacts('sess').held).toBe(0);
    // The machine fell back to today: the key goes down the attach, and the
    // surface is told "no pane", as it is for any machine with no connection.
    expect(routeKey('sess', 'q')).toBe('attach');
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NO_PANE_HERE);
    expect(asks).toBe(1);
    expect(local).toEqual([]);
  });

  it('a pane at rest there, or a machine whose tmux was refused: NO_PANE_HERE, as before', async () => {
    addresses.set('sess', { kind: 'waiting', machineId: 'far' });
    carriages.set('far', { kind: 'none' });
    missed.add('far');
    const { core } = harness([]);
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual(NO_PANE_HERE);
    missed.clear();
    noteAnswer('sess', 'failed');
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual(NO_PANE_HERE);
  });
});

describe('address unknown: the manifest decides', () => {
  it('a remote row whose machine has no carriage this run: NO_PANE_HERE', async () => {
    records.set('sess', { id: 'sess', machineId: 'far' });
    carriages.set('far', { kind: 'none' });
    const { core } = harness([]);
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NO_PANE_HERE);
  });

  it('a remote row whose machine is waiting or even live: not reachable now, and nothing written', async () => {
    records.set('sess', { id: 'sess', machineId: 'far' });
    carriages.set('far', { kind: 'waiting' });
    const { core } = harness([]);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toEqual(NOT_REACHABLE_NOW);
    const live = liveCarriage();
    carriages.set('far', live.carriage);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toEqual(NOT_REACHABLE_NOW);
    expect(live.lines).toEqual([]);
    expect(live.asked()).toBe(0);
  });

  it('a row on this Mac, no row at all, and a removed remote row: NO_PANE_HERE', async () => {
    records.set('mac', { id: 'mac', machineId: 'local' });
    records.set('older', { id: 'older' });
    records.set('removed', { id: 'removed', machineId: 'far', removedAt: 1 });
    carriages.set('far', { kind: 'waiting' });
    const { core, local } = harness([]);
    for (const id of ['mac', 'older', 'nobody', 'removed']) {
      for (const [, call] of VERBS) expect(await call(core, id)).toEqual(NO_PANE_HERE);
    }
    expect(local).toEqual([]);
  });
});

describe('a far failure is the value, never a throw, and is said once per connection', () => {
  function sessionsLines(spy: ReturnType<typeof vi.spyOn>): string[] {
    return spy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .filter((line: string) => line.startsWith('[gmux-sessions]') && line.includes('rigfail'));
  }

  it('a rejected command answers not reachable now, logs one line per generation with no argv or far bytes', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'rigfail', tmuxId: '$7' });
    carriages.set(
      'rigfail',
      liveCarriage(1, () => Promise.reject(new Error('secret far text from the pane'))).carriage
    );
    const { core } = harness([]);
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
    expect(await core.scrollState({ sessionId: 'sess' })).toEqual(NOT_REACHABLE_NOW);
    let lines = sessionsLines(spy);
    expect(lines).toHaveLength(1);
    for (const forbidden of ['secret far text', 'send-keys', 'display-message', 'copy-mode', '$7', '#{']) {
      expect(lines[0]?.includes(forbidden)).toBe(false);
    }
    // A new connection says it once more, and only once.
    carriages.set(
      'rigfail',
      liveCarriage(2, () => Promise.reject(new Error('again'))).carriage
    );
    await core.scrollState({ sessionId: 'sess' });
    await core.scrollLive('sess');
    lines = sessionsLines(spy);
    expect(lines).toHaveLength(2);
  });

  it('a $N the table refuses is the value too, with nothing written', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    addresses.set('sess', { kind: 'live', machineId: 'odd', tmuxId: '%7' });
    const live = liveCarriage();
    carriages.set('odd', live.carriage);
    const { core } = harness([]);
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
    expect(live.lines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE SECOND BUILD (build/p3201/SPEC.md §6.5, D3, D5, D6)
// ---------------------------------------------------------------------------

/** A far pane the scripted connection answers for, the way tmux does. */
interface FarPane {
  inMode: boolean;
  alt: boolean;
  mouse: boolean;
  position: number;
  /** Runs as a `copy-mode` is answered: the program racing the park. */
  onPark?: () => void;
  /** Hold every read's answer until this settles, when set. */
  holdReads?: Promise<void> | null;
}

function farPane(init: Partial<FarPane> = {}): FarPane {
  return { inMode: false, alt: false, mouse: false, position: 0, ...init };
}

/** The read's eight fields, in `REMOTE_STATE_FORMAT`'s places, a space between. */
function fieldsOf(pane: FarPane): string {
  return [
    pane.inMode ? '1' : '0',
    pane.inMode ? String(pane.position) : '',
    '5000',
    '42',
    pane.alt ? '1' : '0',
    pane.mouse ? '1' : '0',
    '152',
    ''
  ].join(' ');
}

/** Answer one control line as that pane would. */
function answerAs(pane: FarPane): (line: string) => Promise<readonly string[]> {
  return async (line) => {
    if (line.startsWith('display-message')) {
      if (pane.holdReads) await pane.holdReads;
      return [fieldsOf(pane)];
    }
    if (line.startsWith('copy-mode')) {
      pane.inMode = true;
      pane.onPark?.();
      return [];
    }
    if (line.endsWith('-X cancel')) {
      if (!pane.inMode) throw new Error('not in a mode');
      pane.inMode = false;
      pane.position = 0;
      return [];
    }
    const up = / -X -N (\d+) scroll-up$/.exec(line);
    if (up !== null) {
      pane.position += Number(up[1]);
      return [];
    }
    return [];
  };
}

/** A clock the park's wait reads and sleeps on, moved by hand. */
function manualClock(start = 1_000): {
  clock: { now(): number; sleep(ms: number): Promise<void> };
  set(at: number): void;
  sleepers: { ms: number; wake: () => void }[];
} {
  let at = start;
  const sleepers: { ms: number; wake: () => void }[] = [];
  return {
    clock: {
      now: () => at,
      sleep: (ms) =>
        new Promise<void>((resolve) => {
          sleepers.push({ ms, wake: resolve });
        })
    },
    set: (next) => {
      at = next;
    },
    sleepers
  };
}

/** Let every pending promise chain run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

const TYPED = (hex: string): string => `send-keys -t $7 -H ${hex}`;
const CANCEL = 'send-keys -t $7 -X cancel';
const PARK = ['copy-mode -e -t $7', 'send-keys -t $7 -X -N 5 scroll-up', 'send-keys -t $7 -X top-line'];

describe('keysOrderedInMain: every remote answer says main orders the keys (D5)', () => {
  it('rides a live answer from every verb, and the not-reachable-now value', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    carriages.set('far', liveCarriage(1, answerAs(farPane())).carriage);
    const { core } = harness([]);
    for (const [name, call] of VERBS) {
      const state = await call(core, 'sess');
      expect(state.keysOrderedInMain, name).toBe(true);
      expect(state.hasPane, name).toBe(true);
    }
    carriages.set('far', { kind: 'waiting' });
    for (const [, call] of VERBS) expect(await call(core, 'sess')).toEqual(NOT_REACHABLE_NOW);
  });
});

describe('the park gate: a park of a pane not known parked, in order (D3, D6)', () => {
  it('waits for ROAD_QUIET_MS after a key on the attach, writing nothing, then parks', async () => {
    const time = manualClock();
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    expect(ROAD_QUIET_MS).toBe(200);
    // A key at rest goes down the attach, and the scroll is asked 50 ms later.
    expect(routeKey('sess', 'a')).toBe('attach');
    time.set(1_050);
    const scrolled = core.scrollBy({ sessionId: 'sess', lines: 5 });
    await settle();
    expect(time.sleepers.map((one) => one.ms)).toEqual([150]);
    expect(live.lines).toEqual([]);
    time.set(1_200);
    time.sleepers[0]?.wake();
    const state = await scrolled;
    expect(state).toMatchObject({ hasPane: true, inMode: true, position: 5, keysOrderedInMain: true });
    // The proof, the read before the park, then the park itself.
    expect(live.lines).toEqual([PROOF_READ, PROOF_READ, ...PARK, PROOF_READ]);
    expect(roadFacts('sess')).toMatchObject({ parked: true, inFlight: 0, ours: true });
  });

  it('F2: a key typed while the park waits DROPS it, so the pane stays live and only a read is written', async () => {
    const time = manualClock();
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    expect(routeKey('sess', 'a')).toBe('attach');
    const scrolled = core.scrollBy({ sessionId: 'sess', lines: 5 });
    await settle();
    expect(time.sleepers.map((one) => one.ms)).toEqual([ROAD_QUIET_MS]);
    // 150 ms later another key: the attach, since nothing is written yet.
    time.set(1_150);
    expect(routeKey('sess', 'b')).toBe('attach');
    time.set(1_200);
    time.sleepers[0]?.wake();
    const state = await scrolled;
    // No second wait: the person is typing, and the scroll they began before it is dropped.
    expect(time.sleepers).toHaveLength(1);
    expect(state).toMatchObject({ hasPane: true, inMode: false, position: 0, keysOrderedInMain: true });
    expect(live.lines).toEqual([PROOF_READ, PROOF_READ]);
    expect(roadFacts('sess')).toMatchObject({ parked: false, inFlight: 0 });
  });

  it('F2: typing that outlasts a flick never parks the pane, and a flick that outlasts the typing does', async () => {
    const time = manualClock();
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    // A key, a notch, another key inside the notch's wait: six times over.
    for (let i = 0; i < 6; i += 1) {
      time.set(1_000 + i * 70);
      expect(routeKey('sess', 'k')).toBe('attach');
      const scrolled = core.scrollBy({ sessionId: 'sess', lines: 3 });
      await settle();
      time.set(1_000 + i * 70 + 35);
      expect(routeKey('sess', 'k')).toBe('attach');
      time.sleepers.shift()?.wake();
      expect(await scrolled).toMatchObject({ inMode: false });
    }
    expect(pane.inMode).toBe(false);
    expect(live.lines.some((line) => line.startsWith('copy-mode'))).toBe(false);
    // The typing stops; the next notch waits out the quiet and parks.
    time.set(2_000);
    const last = core.scrollBy({ sessionId: 'sess', lines: 3 });
    await settle();
    expect(time.sleepers).toEqual([]);
    expect(await last).toMatchObject({ inMode: true });
  });

  it('a program that has the mouse is answered with the read, and nothing else is written', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const live = liveCarriage(1, answerAs(farPane({ alt: true, mouse: true })));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    const state = await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(state).toMatchObject({ hasPane: true, inMode: false, innerAlt: true, innerMouse: true });
    expect(live.lines).toEqual([PROOF_READ, PROOF_READ]);
    expect(await core.scrollTo({ sessionId: 'sess', position: 300 })).toMatchObject({ inMode: false });
    expect(live.lines).toEqual([PROOF_READ, PROOF_READ, PROOF_READ]);
    expect(roadFacts('sess').parked).toBe(false);
  });

  it('a program with the mouse and no alternate screen is not parked either', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const live = liveCarriage(1, answerAs(farPane({ mouse: true })));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toMatchObject({ inMode: false, innerMouse: true });
    expect(live.lines.some((line) => line.startsWith('copy-mode'))).toBe(false);
  });

  it('a park the program raced (it asked for the mouse while the park was on its way) is cancelled', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    pane.onPark = () => {
      pane.alt = true;
      pane.mouse = true;
    };
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    const state = await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(live.lines).toEqual([PROOF_READ, PROOF_READ, ...PARK, PROOF_READ, CANCEL, PROOF_READ]);
    expect(state).toMatchObject({ inMode: false, innerMouse: true, keysOrderedInMain: true });
    expect(pane.inMode).toBe(false);
    expect(roadFacts('sess')).toMatchObject({ parked: false, inFlight: 0 });
  });

  it('copy mode Tortie did not enter is left alone when its program has the screen and the mouse', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane({ inMode: true, position: 40, alt: true, mouse: true });
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    const state = await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(state).toMatchObject({ inMode: true, position: 45 });
    expect(await core.scrollState({ sessionId: 'sess' })).toMatchObject({ inMode: true });
    expect(live.lines.includes(CANCEL)).toBe(false);
    expect(roadFacts('sess').ours).toBe(false);
  });

  it('F3: a pane Tortie parked goes back to its program at the next poll once the program takes the mouse', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    expect(await core.scrollBy({ sessionId: 'sess', lines: 5 })).toMatchObject({ inMode: true });
    expect(roadFacts('sess').ours).toBe(true);
    // A poll while nothing has changed leaves it parked.
    expect(await core.scrollState({ sessionId: 'sess' })).toMatchObject({ inMode: true });
    expect(live.lines.includes(CANCEL)).toBe(false);
    // The program takes the screen and the mouse by itself.
    pane.alt = true;
    pane.mouse = true;
    live.lines.length = 0;
    const state = await core.scrollState({ sessionId: 'sess' });
    expect(live.lines).toEqual([PROOF_READ, CANCEL, PROOF_READ]);
    expect(state).toMatchObject({ inMode: false, innerAlt: true, innerMouse: true, keysOrderedInMain: true });
    expect(pane.inMode).toBe(false);
    expect(roadFacts('sess')).toMatchObject({ parked: false, ours: false, inFlight: 0 });
  });

  it('F3: the same at the next notch, for a program that takes the mouse alone or the screen alone', async () => {
    for (const took of [{ mouse: true }, { alt: true }] as Partial<FarPane>[]) {
      resetScrollOrderForTests();
      addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
      const pane = farPane();
      const live = liveCarriage(1, answerAs(pane));
      carriages.set('far', live.carriage);
      const { core } = harness([]);
      await core.scrollBy({ sessionId: 'sess', lines: 5 });
      Object.assign(pane, took);
      live.lines.length = 0;
      const state = await core.scrollBy({ sessionId: 'sess', lines: 3 });
      expect(live.lines.slice(-2)).toEqual([CANCEL, PROOF_READ]);
      expect(state.inMode).toBe(false);
      expect(pane.inMode).toBe(false);
    }
  });

  it('F2: a key typed while the read before the park is on its way takes the control connection behind that read, and the park is dropped', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    // Prove the connection first, so the next read written is D3's.
    await core.scrollState({ sessionId: 'sess' });
    live.lines.length = 0;
    let release = (): void => undefined;
    pane.holdReads = new Promise<void>((resolve) => {
      release = resolve;
    });
    const scrolled = core.scrollBy({ sessionId: 'sess', lines: 5 });
    await settle();
    expect(live.lines).toEqual([PROOF_READ]);
    expect(roadFacts('sess').inFlight).toBe(1);
    // The key is written before routeKey returns, on the control connection.
    expect(routeKey('sess', 'x')).toBe('carriage');
    expect(live.lines).toEqual([PROOF_READ, CANCEL, TYPED('78'), PROOF_READ]);
    pane.holdReads = null;
    release();
    expect(await scrolled).toMatchObject({ inMode: false });
    // Nothing after the key: the scroll it overtook is never written.
    expect(live.lines).toEqual([PROOF_READ, CANCEL, TYPED('78'), PROOF_READ]);
    expect(pane.inMode).toBe(false);
  });

  it('an operation on a pane that may be parked is counted, so a key typed during it takes the control connection (x13)', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    await core.scrollState({ sessionId: 'sess' });
    noteAnswer('sess', 'failed');
    let release = (): void => undefined;
    pane.holdReads = new Promise<void>((resolve) => {
      release = resolve;
    });
    const polled = core.scrollState({ sessionId: 'sess' });
    await settle();
    expect(roadFacts('sess').inFlight).toBe(1);
    pane.holdReads = null;
    release();
    await polled;
    expect(roadFacts('sess')).toMatchObject({ inFlight: 0, mayBeParked: false });
  });

  it('F2 and F4: a park asked while keys are kept for a connection that was down is dropped', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    const { core } = harness([]);
    noteAnswer('sess', 'failed');
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'h')).toBe('held');
    carriages.set('far', live.carriage);
    expect(roadFacts('sess').held).toBe(1);
    const state = await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(live.lines.some((line) => line.startsWith('copy-mode'))).toBe(false);
    expect(state.keysOrderedInMain).toBe(true);
    resetScrollOrderForTests();
  });

  it('a poll of a pane not known parked is not counted, so a key typed at rest stays on the attach', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    let release = (): void => undefined;
    pane.holdReads = new Promise<void>((resolve) => {
      release = resolve;
    });
    carriages.set('far', liveCarriage(1, answerAs(pane)).carriage);
    const { core } = harness([]);
    const polled = core.scrollState({ sessionId: 'sess' });
    await settle();
    expect(roadFacts('sess').inFlight).toBe(0);
    expect(routeKey('sess', 'q')).toBe('attach');
    pane.holdReads = null;
    release();
    await polled;
  });

  it('a return to live of a pane known parked is counted, so keys stay on the control connection until it answers', async () => {
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    const pane = farPane();
    const live = liveCarriage(1, answerAs(pane));
    carriages.set('far', live.carriage);
    const { core } = harness([]);
    await core.scrollBy({ sessionId: 'sess', lines: 5 });
    expect(roadFacts('sess').parked).toBe(true);
    let release = (): void => undefined;
    pane.holdReads = new Promise<void>((resolve) => {
      release = resolve;
    });
    const back = core.scrollLive('sess');
    await settle();
    expect(roadFacts('sess').inFlight).toBe(1);
    expect(routeKey('sess', 'z')).toBe('carriage');
    pane.holdReads = null;
    release();
    expect(await back).toMatchObject({ inMode: false });
  });
});

describe('the core hands the attach host its key router (§6.4)', () => {
  it('the AttachHost is built with routeRemoteInput answering true for every road but the attach', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const text = readFileSync(join(__dirname, '..', 'core.ts'), 'utf8');
    const start = text.indexOf('this.attachHost = new AttachHost({');
    expect(start).toBeGreaterThan(0);
    // The argument object, read by matching braces.
    let depth = 0;
    let end = -1;
    for (let i = text.indexOf('{', start); i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      if (text[i] === '}') depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    const options = text.slice(start, end + 1);
    expect(options).toMatch(
      /routeRemoteInput: \(sessionId, data\) => routeKey\(sessionId, data\) !== 'attach'/
    );
  });
});

describe('a remote session removed or ended forgets its roads', () => {
  function parkedRoad(id: string): void {
    noteAnswer(id, {
      position: 3,
      history: 50,
      rows: 10,
      cols: 80,
      frameHistory: null,
      inMode: true,
      innerAlt: false,
      innerMouse: false
    });
    expect(roadFacts(id).parked).toBe(true);
  }

  it('Remove', () => {
    remoteIds.add('gone');
    parkedRoad('gone');
    const { core } = harness([]);
    Object.assign(core, { disposed: false, broadcastSessions: () => undefined });
    core.removeSession('gone');
    expect(roadFacts('gone').parked).toBe(false);
  });

  it('End', async () => {
    remoteIds.add('ended');
    parkedRoad('ended');
    const { core } = harness([]);
    Object.assign(core, {
      manifest: { getSession: () => undefined },
      attachHost: { detach: () => undefined },
      broadcastSessions: () => undefined
    });
    await (core as unknown as { killSessionAdmitted(id: string): Promise<void> }).killSessionAdmitted('ended');
    expect(roadFacts('ended').parked).toBe(false);
  });
});
