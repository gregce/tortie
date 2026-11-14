/**
 * Phase 364: the door's diagnostic records (build/p364/SPEC.md §4.3, D9).
 *
 * Check type: contract test over the REAL door module (`startPocketDoor`,
 * `stopPocketDoor`, the instance's start and death), the REAL flag
 * (`../../diagnostic-build/flag`) and the REAL record composer
 * (`../../diagnostic-build/events`), with `logEvent` captured. The define is
 * the global the flag reads, stubbed per load with a fresh module graph
 * (vitest turns a config `define` into exactly that global, so a stub wins
 * over it).
 *
 * What it pins, at the three points D9 names in bind.ts:
 *  - the fork: the door's generation;
 *  - the open: its own loopback port, its generation and the process's pid;
 *  - the unexpected stop: its generation; a stop somebody asked for, and a
 *    process that dies while it is opening, write no stop record;
 *  - a request the door forwards writes no record, and no record carries its
 *    target, its query, its headers or its answer;
 *  - the real fork (`utilityProcess.fork`, mocked with the pid lifetimes this
 *    builder measured in one scratch Electron 43.8.7: undefined right after
 *    the fork and after 1 and 3 microtasks, a number at `spawn` and at the
 *    first message, undefined inside the `exit` listener): the fork record is
 *    written, and the pid is on the open, the one point that has it;
 *  - with the define off, the same drive writes no record at all.
 *
 * Nothing here forks a process or opens a socket: the door processes are
 * fakes this file writes, or a mocked `utilityProcess.fork`.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POCKET_ROUTE_IDS } from '@shared/ipc/pocket';
import type { DoorChild, ToDoor } from '../door/wire';

interface LogRecord {
  readonly scope: string;
  readonly level: string;
  readonly event: string;
  readonly msg: string;
  readonly fields: Record<string, unknown> | undefined;
}

const records = vi.hoisted(() => [] as LogRecord[]);

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    getLog: () => ({ error: () => undefined, warn: () => undefined, info: () => undefined, debug: () => undefined }),
    logEvent: (scope: string, level: string, event: string, msg: string, fields?: Record<string, unknown>) => {
      records.push({ scope, level, event, msg, fields });
    }
  };
});

/** An Electron-shaped `utilityProcess.fork`: no pid until the test emits `spawn`. */
const forked = vi.hoisted(() => ({
  children: [] as (EventEmitter & { pid: number | undefined; posted: unknown[]; postMessage: (m: unknown) => void; kill: () => boolean })[]
}));

vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  return {
    utilityProcess: {
      fork: () => {
        const child = Object.assign(new Emitter(), {
          pid: undefined as number | undefined,
          posted: [] as unknown[],
          postMessage: (message: unknown) => {
            child.posted.push(message);
          },
          kill: () => true
        });
        forked.children.push(child);
        return child;
      }
    }
  };
});

/** What a forwarded request carries, none of which any record may. */
const TARGET = '/v1/blocked?p364=a-query-no-record-carries';
const PHONE = 'p364-a-phone-id-no-record-carries';
const ANSWER = '"p364 an answer no record carries"';

/** The door module, loaded fresh under the define. */
async function doorWith(diagnostic: boolean): Promise<typeof import('../bind')> {
  vi.resetModules();
  vi.stubGlobal('__TORTIE_DIAGNOSTIC__', diagnostic);
  return import('../bind');
}

const diagnostic = (): LogRecord[] => records.filter((r) => r.event.startsWith('diagnostic.'));

/** A record as diagnosticEvent composes it (src/main/diagnostic-build/events.ts). */
const record = (what: string, fields: Record<string, number | string>): LogRecord => ({
  scope: 'diagnostic',
  level: 'info',
  event: 'diagnostic.door',
  msg: `door ${what}`,
  fields: { ...fields, what }
});

async function turn(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

/** A door process that is not one: it records what main posts and says what a test tells it to. */
function fakeChild(pid: number, behaviour: { listen?: boolean } = {}) {
  const posted: ToDoor[] = [];
  let onMessage: (message: unknown) => void = () => undefined;
  let onExit: (code: number | null) => void = () => undefined;
  let exited = false;
  const exit = (): void => {
    if (exited) return;
    exited = true;
    setImmediate(() => onExit(0));
  };
  const child: DoorChild = {
    pid,
    post(message) {
      posted.push(message);
      if (message.kind === 'start' && behaviour.listen !== false) {
        setImmediate(() => onMessage({ kind: 'listening', localPort: 50_123 }));
      }
      if (message.kind === 'start' && behaviour.listen === false) {
        setImmediate(() => onMessage({ kind: 'refused', reason: 'bind-failed' }));
      }
      if (message.kind === 'stop') {
        setImmediate(() => onMessage({ kind: 'stopped', accepted: 0, joined: true, waitedMs: 1 }));
      }
    },
    onMessage(listener) {
      onMessage = listener;
    },
    onExit(listener) {
      onExit = listener;
    },
    kill() {
      exit();
    }
  };
  return { spawn: () => child, posted, say: (m: unknown) => onMessage(m), exit };
}

type Door = typeof import('../bind');

function startInput(spawn: (() => DoorChild) | undefined): import('../bind').DoorStartInput {
  return {
    handle: async () => ({ status: 200, body: ANSWER }),
    publicHost: { name: 'mac.tail00000.ts.net', port: 8443 },
    pins: [],
    windowOpen: false,
    routes: POCKET_ROUTE_IDS,
    // A stand-in identity: the door's material is not what is measured here.
    identity: () => ({
      kind: 'ready',
      identity: {
        keyPem: 'p364-key',
        certPem: 'p364-cert',
        certificateFingerprint: 'AA:BB',
        publicKeyFingerprint: 'CC:DD:EE:FF:00:11',
        notBefore: 0,
        notAfter: 1,
        subjectAltNames: []
      },
      created: false,
      renewed: false
    }),
    ...(spawn !== undefined ? { spawn } : {})
  };
}

/**
 * One drive through the three points: a door that opens, answers one request
 * and dies unasked; one whose process cannot listen; one switched off; and a
 * REAL fork (Electron mocked) that opens and dies unasked.
 */
async function drive(door: Door): Promise<{ answers: ToDoor[]; results: unknown[] }> {
  door.resetPocketDoorForTests();
  const results: unknown[] = [];
  const first = fakeChild(7_001);
  results.push(await door.startPocketDoor(startInput(first.spawn)));
  first.say({
    kind: 'request',
    id: 1,
    generation: 1,
    request: {
      route: 'blocked',
      method: 'GET',
      target: TARGET,
      headers: {
        'x-tortie-phone': PHONE,
        'x-tortie-timestamp': '1',
        'x-tortie-nonce': '0123456789abcdef',
        'x-tortie-signature': 's'
      },
      body: new Uint8Array(0),
      channel: PHONE
    }
  });
  await turn();
  first.exit();
  await turn();
  const cannot = fakeChild(7_002, { listen: false });
  results.push(await door.startPocketDoor(startInput(cannot.spawn)));
  await turn();
  const asked = fakeChild(7_003);
  results.push(await door.startPocketDoor(startInput(asked.spawn)));
  await door.stopPocketDoor();
  await turn();
  // The real fork, through utilityProcess.fork.
  const opening = door.startPocketDoor(startInput(undefined));
  await turn();
  const real = forked.children.at(-1)!;
  // Electron gives a utility process its pid at its 'spawn' event, after the fork returned.
  real.pid = 4_343;
  real.emit('spawn');
  real.emit('message', { kind: 'listening', localPort: 50_124 });
  results.push(await opening);
  // Electron names no pid inside a utility process's 'exit' listener (measured, 43.8.7).
  real.pid = undefined;
  real.emit('exit', 0);
  await turn();
  return { answers: first.posted.filter((m) => m.kind === 'answer'), results };
}

beforeEach(() => {
  records.length = 0;
  forked.children.length = 0;
});

afterEach(async () => {
  vi.unstubAllGlobals();
});

describe('the diagnostic build', () => {
  it('records each fork, open and unexpected stop, with the fields D9 names and nothing else', async () => {
    const door = await doorWith(true);
    const { answers, results } = await drive(door);
    // The drive did what it says: three doors opened, one could not, and the request was answered.
    expect(results.map((r) => (r as { ok: boolean }).ok)).toEqual([true, false, true, true]);
    expect(answers).toEqual([{ kind: 'answer', id: 1, status: 200, body: ANSWER }]);
    expect(forked.children).toHaveLength(1);
    expect(diagnostic()).toEqual([
      record('fork', { generation: 1 }),
      record('open', { localPort: 50_123, generation: 1, pid: 7_001 }),
      record('stopped', { generation: 1 }),
      // A process that cannot listen is forked, and its end is the start's refusal, not a stop.
      record('fork', { generation: 2 }),
      // A door switched off: forked and opened, and its stop was asked for.
      record('fork', { generation: 3 }),
      record('open', { localPort: 50_123, generation: 3, pid: 7_003 }),
      // The real fork: no pid at the fork, the pid at the open.
      record('fork', { generation: 4 }),
      record('open', { localPort: 50_124, generation: 4, pid: 4_343 }),
      record('stopped', { generation: 4 })
    ]);
  });

  it('never carries a request’s target, query, phone, headers or answer', async () => {
    await drive(await doorWith(true));
    expect(diagnostic().length).toBeGreaterThan(0);
    for (const r of diagnostic()) {
      const text = JSON.stringify(r);
      for (const word of ['/v1/blocked', 'a-query-no-record-carries', PHONE, '0123456789abcdef', 'an answer no record carries', 'mac.tail00000.ts.net', '8443', 'p364-key', 'p364-cert']) {
        expect(text).not.toContain(word);
      }
    }
  });
});

describe('the normal build', () => {
  it('writes no record for the same drive', async () => {
    const door = await doorWith(false);
    const { answers, results } = await drive(door);
    expect(results.map((r) => (r as { ok: boolean }).ok)).toEqual([true, false, true, true]);
    expect(answers).toHaveLength(1);
    expect(diagnostic()).toEqual([]);
  });
});
