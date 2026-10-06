/**
 * Phase 337, the eighth carriage row and the phone's keys on another machine
 * (build/p337/SPEC.md D20, §5.6, §6.3 conditions 122 and 123; his ruling of
 * 2026-10-05, "Every key, including Ctrl-C").
 *
 * Driven against the SHIPPING ../scroll-shapes.ts and ../scroll-order.ts. The
 * carriage's runner is the shipping `guardedScrollRunner` over a `send` that
 * records each control-mode line it is handed, so "written" below means the
 * line reached the connection, after the table admitted it.
 *
 *  - `namedKeySequence` composes the `cancel` then one name, for every one of
 *    the contract's 35 names, and the table admits both as the shapes they are;
 *    a name not on the list is refused by the composer and by the table;
 *  - `typePhoneKeys` writes ONE `cancel` first, then every item's commands in
 *    order (text as `-H` bytes, at most 256 a command; a name as the eighth
 *    row), then the road's read, all BEFORE it returns;
 *  - a session with no live address, a machine with no live connection, a
 *    connection whose first read could not be read: `unreachable`, nothing
 *    written, nothing held, and nothing written when the connection comes back;
 *  - a write whose connection closed unanswered is never sent again;
 *  - the road it leaves: live, nothing in flight once answered, one keystroke
 *    counted for a write and none for a refusal.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POCKET_SCREEN_KEY_NAMES, type PocketKeyItem, type PocketScreenKeyName } from '@shared/ipc/pocket';
import { REMOTE_STATE_FORMAT } from '../../tmux/scroll';
import { gmuxError } from '../../errors';
import type { RemoteScrollAddress } from '../remote-sessions';
import {
  SCROLL_SHAPES,
  admitScrollArgv,
  guardedScrollRunner,
  namedKeySequence,
  type RemoteScrollCarriage
} from '../scroll-shapes';
import {
  keysSoFar,
  noteAnswer,
  noteUnreadableConnection,
  resetScrollOrderForTests,
  roadFacts,
  routeKey,
  typePhoneKeys,
  type KeyCarriageSource
} from '../scroll-order';

/**
 * A composer that composes a command the table refuses, switched on by one
 * case below: the ONLY way to show that `typePhoneKeys` checks every argv
 * BEFORE its first write, because the guarded runner's own check is per argv
 * and would let the commands before a refused one cross.
 */
let breakComposer = false;
vi.mock('../scroll-shapes', async (importOriginal) => {
  const real = await importOriginal<typeof import('../scroll-shapes')>();
  return {
    ...real,
    namedKeySequence: (target: string, name: PocketScreenKeyName): string[][] => {
      const argvs = real.namedKeySequence(target, name);
      return breakComposer ? [argvs[0] ?? [], ['send-keys', '-t', target, '-l', name]] : argvs;
    }
  };
});

const READ = `display-message -p -t $7 -F '${REMOTE_STATE_FORMAT}'`;
const CANCEL = 'send-keys -t $7 -X cancel';
/** A live pane's read, in REMOTE_STATE_FORMAT's eight places. */
const LIVE = ['0', '', '900', '40', '0', '0', '120', ''].join(' ');

let addresses = new Map<string, RemoteScrollAddress>();
let carriages = new Map<string, RemoteScrollCarriage>();

const SOURCE: KeyCarriageSource = {
  address: (sessionId) => addresses.get(sessionId) ?? { kind: 'unknown' },
  carriage: (machineId) => carriages.get(machineId) ?? { kind: 'waiting' }
};

/** A clock nothing here sleeps on for long; the held-key loop must never start. */
const CLOCK = {
  now: () => 1_000,
  sleep: () => new Promise<void>((resolve) => setTimeout(resolve, 1))
};

/**
 * A live carriage whose every written line is recorded, answered by `answer`
 * (a read gets a live pane; anything else an empty block).
 */
function recordingCarriage(
  generation = 1,
  answer: (line: string) => Promise<readonly string[]> = (line) =>
    Promise.resolve(line.startsWith('display-message') ? [LIVE] : [])
): { lines: string[]; carriage: RemoteScrollCarriage } {
  const lines: string[] = [];
  const carriage: RemoteScrollCarriage = {
    kind: 'live',
    generation,
    run: guardedScrollRunner({
      send: (line) => {
        lines.push(line);
        return answer(line);
      },
      isCurrent: () => true,
      server: 'machine:far'
    })
  };
  return { lines, carriage };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  addresses = new Map();
  carriages = new Map();
  resetScrollOrderForTests(CLOCK, SOURCE);
  addresses.set('s1', { kind: 'live', machineId: 'far', tmuxId: '$7' });
});

afterEach(() => {
  breakComposer = false;
  resetScrollOrderForTests();
});

describe('namedKeySequence, the one composer of the eighth shape (condition 122)', () => {
  it('composes the cancel then the one name, for each of the 35, each argv admitted as the shape it is', () => {
    expect(POCKET_SCREEN_KEY_NAMES).toHaveLength(35);
    for (const name of POCKET_SCREEN_KEY_NAMES) {
      const argvs = namedKeySequence('$7', name);
      expect(argvs).toEqual([
        ['send-keys', '-t', '$7', '-X', 'cancel'],
        ['send-keys', '-t', '$7', name]
      ]);
      expect(argvs.map((argv) => admitScrollArgv(argv))).toEqual([
        { ok: true, shape: 'cancel' },
        { ok: true, shape: 'type-key' }
      ]);
    }
  });

  it('refuses a name not on the contract\'s list, by its own check and not only by its type', () => {
    for (const name of ['M-x', 'F1', 'C-Up', 'Up Down', 'c-c', 'Enter;']) {
      expect(() => namedKeySequence('$7', name as PocketScreenKeyName)).toThrow();
    }
  });

  it('is refused by the table for every shape the phone must never reach', () => {
    for (const argv of [
      ['send-keys', '-t', '$1', 'M-x'],
      ['send-keys', '-t', '$1', 'C-Up'],
      ['send-keys', '-t', '$1', 'Up', 'Down'],
      ['send-keys', '-t', '$1', '-l', 'Up'],
      ['send-keys', '-t', '%1', 'Up'],
      ['send-keys', '-t', '=s', 'Up'],
      ['send-keys', '-t', '$1 ; kill-server', 'Up']
    ]) {
      expect(admitScrollArgv(argv).ok, argv.join(' ')).toBe(false);
    }
  });

  it('is the eighth row, last, four elements, not idempotent', () => {
    const last = SCROLL_SHAPES[SCROLL_SHAPES.length - 1];
    expect(SCROLL_SHAPES).toHaveLength(8);
    expect(last?.id).toBe('type-key');
    expect(last?.argv).toHaveLength(4);
    expect(last?.idempotent).toBe(false);
  });
});

describe('typePhoneKeys, one keys write on another machine (condition 123)', () => {
  it('writes ONE cancel, every item\'s commands in order, then the read, all before it returns', () => {
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    const keys: PocketKeyItem[] = [{ t: 'é😀' }, { k: 'BSpace' }, { t: 'ab' }];
    expect(typePhoneKeys('s1', keys)).toBe('carriage');
    // No await between the call and this read: every line is already written.
    expect(lines).toEqual([
      CANCEL,
      'send-keys -t $7 -H c3 a9 f0 9f 98 80',
      'send-keys -t $7 BSpace',
      'send-keys -t $7 -H 61 62',
      READ
    ]);
    expect(lines.filter((line) => line === CANCEL)).toHaveLength(1);
  });

  it('writes a named key alone behind its cancel, Ctrl-C and application-mode Up by name, never by bytes', () => {
    for (const name of ['C-c', 'Up', 'Escape', 'BTab', 'Enter'] as const) {
      resetScrollOrderForTests(CLOCK, SOURCE);
      const { lines, carriage } = recordingCarriage();
      carriages.set('far', carriage);
      expect(typePhoneKeys('s1', [{ k: name }])).toBe('carriage');
      expect(lines).toEqual([CANCEL, `send-keys -t $7 ${name}`, READ]);
    }
  });

  it('splits a long text at 256 bytes a command, in order, and every line it writes is one the table admits', () => {
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    const text = 'x'.repeat(600);
    expect(typePhoneKeys('s1', [{ t: text }])).toBe('carriage');
    expect(lines).toHaveLength(1 + 3 + 1);
    const hex = lines.slice(1, 4).map((line) => line.split(' ').slice(4));
    expect(hex.map((bytes) => bytes.length)).toEqual([256, 256, 88]);
    expect(hex.flat().every((byte) => byte === '78')).toBe(true);
  });

  it('answers unreachable with nothing written when the session has no live address', () => {
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    for (const address of [
      { kind: 'ended' } as const,
      { kind: 'unknown' } as const,
      { kind: 'waiting', machineId: 'far' } as const
    ]) {
      addresses.set('s1', address);
      expect(typePhoneKeys('s1', [{ k: 'Enter' }])).toBe('unreachable');
    }
    expect(lines).toEqual([]);
  });

  it('answers unreachable when the machine has no live connection, holds NOTHING, and types nothing when it returns', async () => {
    for (const down of [{ kind: 'waiting' } as const, { kind: 'none' } as const]) {
      resetScrollOrderForTests(CLOCK, SOURCE);
      carriages.set('far', down);
      expect(typePhoneKeys('s1', [{ t: 'echo p337' }])).toBe('unreachable');
      expect(typePhoneKeys('s1', [{ k: 'Enter' }])).toBe('unreachable');
      expect(roadFacts('s1').held).toBe(0);
      expect(roadFacts('s1').inFlight).toBe(0);
      // The connection comes back: nothing it was handed is typed later.
      const { lines, carriage } = recordingCarriage();
      carriages.set('far', carriage);
      await settle();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(lines).toEqual([]);
    }
  });

  it('answers unreachable on a connection whose first read could not be read, writing nothing (Phase 320.1 D10)', () => {
    const { lines, carriage } = recordingCarriage(4);
    carriages.set('far', carriage);
    noteUnreadableConnection('far', 4);
    expect(typePhoneKeys('s1', [{ k: 'Enter' }])).toBe('unreachable');
    expect(lines).toEqual([]);
  });

  it('answers unreachable for a write that composes to nothing, writing nothing', () => {
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    expect(typePhoneKeys('s1', [])).toBe('unreachable');
    expect(typePhoneKeys('s1', [{ t: '' }])).toBe('unreachable');
    expect(typePhoneKeys('s1', [{ k: 'M-x' as PocketScreenKeyName }])).toBe('unreachable');
    expect(lines).toEqual([]);
  });

  it('checks EVERY command before the first is written: one the table refuses writes nothing at all', () => {
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    breakComposer = true;
    expect(typePhoneKeys('s1', [{ t: 'a' }, { k: 'Up' }])).toBe('unreachable');
    expect(lines).toEqual([]);
    expect(roadFacts('s1').inFlight).toBe(0);
  });

  it('refuses a target the table refuses, writing nothing', () => {
    addresses.set('s1', { kind: 'live', machineId: 'far', tmuxId: '%7' });
    const { lines, carriage } = recordingCarriage();
    carriages.set('far', carriage);
    expect(typePhoneKeys('s1', [{ k: 'Enter' }])).toBe('unreachable');
    expect(lines).toEqual([]);
  });

  it('leaves the road live with nothing in flight once answered, counting one keystroke per write and none per refusal', async () => {
    const { carriage } = recordingCarriage();
    carriages.set('far', carriage);
    expect(keysSoFar('s1')).toBe(0);
    expect(typePhoneKeys('s1', [{ t: 'a' }, { k: 'BSpace' }])).toBe('carriage');
    expect(keysSoFar('s1')).toBe(1);
    // In flight until answered: a desk key meanwhile queues behind on the same connection.
    expect(roadFacts('s1').inFlight).toBe(1);
    expect(routeKey('s1', 'z')).toBe('carriage');
    await settle();
    expect(roadFacts('s1')).toMatchObject({ parked: false, mayBeParked: false, inFlight: 0, held: 0, unanswered: 0 });
    carriages.set('far', { kind: 'waiting' });
    expect(typePhoneKeys('s1', [{ k: 'Enter' }])).toBe('unreachable');
    expect(keysSoFar('s1')).toBe(2);
  });

  it('never sends a write again when its connection closed before the cancel was answered', async () => {
    const closed = gmuxError('TMUX_UNREACHABLE', 'the control client for far disconnected');
    const first = recordingCarriage(1, () => Promise.reject(closed));
    carriages.set('far', first.carriage);
    expect(typePhoneKeys('s1', [{ t: 'echo hi' }, { k: 'BSpace' }])).toBe('carriage');
    // The connection is replaced while the answers are on their way.
    const second = recordingCarriage(2);
    carriages.set('far', second.carriage);
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(roadFacts('s1').unanswered).toBe(0);
    expect(roadFacts('s1').held).toBe(0);
    expect(second.lines).toEqual([]);
    // The pane is possibly parked, so the next desk key goes behind a cancel.
    expect(roadFacts('s1').mayBeParked).toBe(true);
  });

  it('never joins the desk\'s held keys: a key held for the connection stays the desk\'s alone', () => {
    carriages.set('far', { kind: 'waiting' });
    // The pane may be parked, so a desk key is HELD for the connection (F4).
    noteAnswer('s1', 'unreadable');
    expect(routeKey('s1', 'q')).toBe('held');
    expect(roadFacts('s1').held).toBe(1);
    // The phone's write is refused, and nothing of it joins what is held.
    expect(typePhoneKeys('s1', [{ k: 'Up' }])).toBe('unreachable');
    expect(roadFacts('s1').held).toBe(1);
  });
});
