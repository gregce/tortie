/**
 * The door's switch handles ONE PRESS AT A TIME (Phase 316.1, his ruling of
 * 2026-09-23: "Yes, fix and land.").
 *
 * WHAT THE REVERIFY FOUND. `setDoor` on, off, on, off inside one turn ended
 * with the sealed store saying off, the sheet saying off, and the door
 * LISTENING, and a paired phone read 200 from it. The second on waited inside
 * `./bind.ts` for the first on's socket to let go; the second off found no door
 * to stop, because the module had none between the two; and the second on then
 * bound. Its shapes were X1b (the four presses with turns between them), X1c
 * (the four in one turn, with a phone), X1d (the production-shaped wait on the
 * sessions) and X2b (a start, a stop, a start, a stop, the first start inside
 * its listen when the stop lands).
 *
 * WHAT THIS FILE HOLDS. Every one of those shapes, driven through the SHIPPING
 * owner over the REAL `./bind.ts` on loopback — a real TLS door on a port found
 * for it here, a real phone paired through the real window and reading with a
 * real signature — and after the LAST press settles, the three things a person
 * and a phone can see must agree: the sealed store, the sheet's state, and the
 * socket. The last press decides which way they agree.
 *
 * `./bind.ts` is the real module. The one wrapper below counts how many starts
 * reached it, so X2b can place its stop inside the first start's listen rather
 * than wherever a microtask count happens to put it; the start it counts is the
 * real one, and the door it opens is a real socket.
 *
 * NOTHING HERE BINDS ANYTHING BUT 127.0.0.1 (`GMUX_POCKET_LOOPBACK`, the
 * harness override the probe uses). Every door is stopped in `afterEach`,
 * whatever happened. No tailnet key is used: every pairing passes null.
 */

import {
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject
} from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { connect as netConnect, createServer as netServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@shared/types';
import type { PocketFacts } from '../routes';

let userData = '';
const MARKER = '--tortie-pocket-switch-queue-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

/** Kept quiet, and kept, so a failure can say what the door refused. */
const logged: string[] = [];
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string): void => {
      logged.push(`${level} ${msg}`);
    };
  return {
    ...real,
    getLog: () => ({
      error: capture('error'),
      warn: capture('warn'),
      info: capture('info'),
      debug: capture('debug')
    })
  };
});

/**
 * How many starts reached the REAL bind, and whether a door was already
 * listening when each one did. The start itself is not changed.
 */
const binds = { entered: 0, listeningAtEntry: [] as boolean[] };
vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    startPocketDoor: (input: Parameters<typeof real.startPocketDoor>[0]) => {
      binds.entered += 1;
      binds.listeningAtEntry.push(real.pocketDoorStatus().listening);
      return real.startPocketDoor(input);
    }
  };
});

const LOOPBACK_ENV = 'GMUX_POCKET_LOOPBACK';
process.env[LOOPBACK_ENV] = '1';

const { PocketHost } = await import('../ipc');
const {
  POCKET_HEADERS,
  phoneIdOf,
  pocketConfirmStatus,
  readPocketStore,
  sealPresentationAsPhone,
  signAsPhone,
  writePocketStore
} = await import('../pairing');
const bind = await import('../bind');

type Host = InstanceType<typeof PocketHost>;

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const SESSION = {
  id: 's-switch',
  name: 'switch',
  tmuxName: 'switch',
  projectPath: '/w/switch',
  cwd: '/w/switch',
  agent: 'claude',
  status: 'idle',
  createdAt: 1
} as Session;

const FACTS: PocketFacts = {
  sessions: () => [SESSION],
  projects: () => [],
  blockedSince: () => new Map(),
  activity: () => undefined,
  statusWord: () => ({ dot: 'idle', label: 'idle' }),
  agentLabel: (id) => id,
  machineLabel: () => null,
  emptyLine: 'Nothing needs you',
  wakes: () => [],
  catchUp: async () => null,
  lastTurn: async () => ({ answerText: null, turnCount: 0 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort(): Promise<number> {
  const server = netServer();
  try {
    return await new Promise<number>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** Does anything accept a TCP connection on the door's port? Nothing is sent. */
function socketAnswers(port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port });
    const finish = (value: boolean): void => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(2_000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

let port = 0;
const hosts: Host[] = [];
/** Every held wait on the sessions, released in `afterEach` whatever happened. */
const releasers: Array<() => void> = [];

/**
 * A host over a sealed store whose port is one nothing else holds. The store
 * is minted by a first owner (which opens nothing), moved to the free port,
 * and then read by the owner under test.
 */
async function hostOn(beforeOpen?: () => Promise<unknown>): Promise<Host> {
  const mint = new PocketHost({ facts: FACTS, bindAddress: () => '127.0.0.1' });
  await mint.setPushAlerts(false);
  const read = readPocketStore();
  if (read.store === null) throw new Error('no store was minted');
  port = await freePort();
  writePocketStore({ ...read.store, port });
  const one = new PocketHost({
    facts: FACTS,
    bindAddress: () => '127.0.0.1',
    ...(beforeOpen !== undefined ? { beforeOpen } : {})
  });
  hosts.push(one);
  return one;
}

/** The sheet's order: on, confirm, listening. */
async function onAndConfirmed(one: Host): Promise<void> {
  const on = await one.setDoor({ on: true });
  await one.confirmDoor({ linesRead: on.confirmLines, hashRead: on.confirmHash });
  expect(one.status().state).toBe('listening');
}

// ---------------------------------------------------------------------------
// The phone, its half spelled here from the wire format
// ---------------------------------------------------------------------------

interface Phone {
  id: string;
  signPrivate: KeyObject;
  binding: string;
}

/** Pair one phone through the shipping window on a listening door. */
function pairPhone(one: Host): Phone {
  const offer = one.beginPairing({ tailnetKey: null });
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const signingKey = signing.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const exchangeKey = exchange.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const said = one.pairing.present(
    sealPresentationAsPhone(offer.payload, { label: 'Switch iPhone', signingKey, exchangeKey }),
    '127.0.0.1'
  );
  expect(said).toBe('pending');
  const view = one.pairing.view();
  expect(one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' }).allowed).toBe(true);
  one.cancelPairing();
  const dx = String((JSON.parse(offer.payload) as { dx: string }).dx);
  const shared = diffieHellman({
    privateKey: exchange.privateKey,
    publicKey: createPublicKey({ key: Buffer.from(dx, 'base64url'), format: 'der', type: 'spki' })
  });
  const binding = Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${dx}\n${exchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
  return { id: phoneIdOf(signingKey), signPrivate: signing.privateKey, binding };
}

/** A signed read over real TLS. 0 when there was no socket to read from. */
function phoneReads(phone: Phone, target = '/v1/blocked'): Promise<number> {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const signature = signAsPhone(phone.signPrivate, {
    method: 'GET',
    target,
    bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
    timestamp,
    nonce,
    binding: phone.binding
  });
  return new Promise((done) => {
    let settled = false;
    const finish = (status: number): void => {
      if (settled) return;
      settled = true;
      done(status);
    };
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: target,
        agent: false,
        rejectUnauthorized: false,
        headers: {
          [POCKET_HEADERS.phone]: phone.id,
          [POCKET_HEADERS.timestamp]: timestamp,
          [POCKET_HEADERS.nonce]: nonce,
          [POCKET_HEADERS.signature]: signature
        }
      },
      (res) => {
        res.resume();
        res.on('end', () => finish(res.statusCode ?? 0));
        res.on('error', () => finish(0));
      }
    );
    req.setTimeout(5_000, () => req.destroy(new Error('timed out')));
    req.on('error', () => finish(0));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// The agreement
// ---------------------------------------------------------------------------

interface Reading {
  enabled: boolean | null;
  bindAtLaunch: boolean | null;
  sheet: string;
  /**
   * The sheet's sentence is the GATE's own, or none: never a refusal a
   * superseded start's listen answered (a quit that is not happening, a port
   * Tortie itself holds).
   */
  onlyTheGateSpeaks: boolean;
  module: boolean;
  socket: boolean;
  phone: number | null;
}

/** What the store, the sheet, the module and the socket say, after the last press. */
async function reading(one: Host, phone?: Phone): Promise<Reading> {
  await tick();
  await sleep(20);
  const stored = readPocketStore().store;
  const sheet = one.status();
  const socket = await socketAnswers(port);
  const gate = pocketConfirmStatus(one.fields());
  return {
    enabled: stored?.enabled ?? null,
    bindAtLaunch: stored?.bindAtLaunch ?? null,
    sheet: sheet.state,
    onlyTheGateSpeaks: sheet.refusal === (sheet.state === 'listening' ? null : gate.refusal),
    module: bind.pocketDoorStatus().listening,
    socket,
    phone: phone === undefined || !socket ? null : await phoneReads(phone)
  };
}

/** The last press was OFF: every one of them says off, and a phone reads nothing. */
function agreeOff(r: Reading): void {
  expect(r).toEqual({
    enabled: false,
    bindAtLaunch: false,
    sheet: 'off',
    onlyTheGateSpeaks: true,
    module: false,
    socket: false,
    phone: null
  });
}

/** The last press was ON, on confirmed fields: every one of them says listening. */
function agreeListening(r: Reading, withPhone: boolean): void {
  expect(r).toEqual({
    enabled: true,
    bindAtLaunch: true,
    sheet: 'listening',
    onlyTheGateSpeaks: true,
    module: true,
    socket: true,
    phone: withPhone ? 200 : null
  });
}

/** The presses, pressed back to back, with `k` turns of `wait` after each. */
async function press(
  one: Host,
  switches: readonly boolean[],
  k = 0,
  wait: () => Promise<void> = tick
): Promise<void> {
  const pressed: Promise<unknown>[] = [];
  for (const on of switches) {
    pressed.push(one.setDoor({ on }));
    for (let i = 0; i < k; i += 1) await wait();
  }
  const settled = await Promise.allSettled(pressed);
  // Every press here is one the owner accepts; none may be refused.
  expect(settled.map((s) => s.status)).toEqual(switches.map(() => 'fulfilled'));
}

/** The production `beforeOpen` once the app is up: a window exists, the core has booted. */
const upAlready = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p316-switch-'));
  process.env[LOOPBACK_ENV] = '1';
  bind.resetPocketDoorForTests();
  binds.entered = 0;
  binds.listeningAtEntry = [];
  logged.length = 0;
});

afterEach(async () => {
  for (const release of releasers.splice(0)) release();
  for (const one of hosts.splice(0)) {
    try {
      await one.stop();
    } catch {
      /* a stop never throws; this is the teardown */
    }
  }
  await bind.stopPocketDoor();
  bind.resetPocketDoorForTests();
  rmSync(userData, { recursive: true, force: true });
});

afterAll(async () => {
  await bind.joinPocketDoor();
  bind.resetPocketDoorForTests();
});

// ---------------------------------------------------------------------------
// The reverify's four shapes. Each ends on an OFF, so all four must say off.
// ---------------------------------------------------------------------------

describe('the reverify’s shapes: the last press is off, and nothing listens', () => {
  it('X1b: on, off, on, off in one turn, from a confirmed door that was switched off', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    await one.setDoor({ on: false });
    await press(one, [true, false, true, false]);
    agreeOff(await reading(one));
  });

  it('X1c: on, off, on, off in one turn with a phone paired: the phone reads nothing', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    // The control: the paired phone reads the listening door.
    expect(await phoneReads(phone)).toBe(200);
    await one.setDoor({ on: false });
    await press(one, [true, false, true, false]);
    const after = await reading(one, phone);
    agreeOff(after);
    // And the socket that could have answered it is not there to ask.
    expect(await phoneReads(phone)).toBe(0);
  });

  for (const k of [3, 4]) {
    it(`X1d: on, off, on, off ${String(k)} microtasks apart, with the production wait on the sessions and a phone paired`, async () => {
      const one = await hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false], k, () => Promise.resolve());
      agreeOff(await reading(one, phone));
      expect(await phoneReads(phone)).toBe(0);
    });
  }

  it('X2b: the first start is inside its listen when the off lands; then on, off', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    await one.setDoor({ on: false });
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    // Placed, not counted: the next three presses are pressed only once the
    // first start has reached the real bind, whose listen is its one await.
    for (let i = 0; i < 50 && binds.entered === entered; i += 1) await Promise.resolve();
    expect(binds.entered).toBe(entered + 1);
    const rest = [one.setDoor({ on: false }), one.setDoor({ on: true }), one.setDoor({ on: false })];
    await Promise.all([first, ...rest]);
    agreeOff(await reading(one, phone));
    expect(await phoneReads(phone)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The sweep the reverify ran around those shapes. Every row ends on an OFF.
// Coverage, not the proof: most rows were already green before the queue, and
// the three that were not are the shapes above at the offsets that failed.
// ---------------------------------------------------------------------------

describe('the sweep around them: every offset, with and without a wait on the sessions', () => {
  for (const waitsOnSessions of [false, true]) {
    for (let k = 0; k <= 6; k += 1) {
      it(`on, off, on, off, ${String(k)} turns apart (${waitsOnSessions ? 'the sessions take a timer' : 'no wait on the sessions'})`, async () => {
        const one = await hostOn(waitsOnSessions ? () => sleep(1) : undefined);
        await onAndConfirmed(one);
        await one.setDoor({ on: false });
        await press(one, [true, false, true, false], k);
        agreeOff(await reading(one));
      });
    }
  }
  for (let k = 0; k <= 4; k += 1) {
    it(`the production wait on the sessions, ${String(k)} microtasks apart, with a phone`, async () => {
      const one = await hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false], k, () => Promise.resolve());
      agreeOff(await reading(one, phone));
    });
  }
});

// ---------------------------------------------------------------------------
// The last press decides in the other direction too.
// ---------------------------------------------------------------------------

describe('when the last press is ON, the door the person switched on is the one that answers', () => {
  it('on, on: the second press does not lose the door the first one opened', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    await one.setDoor({ on: false });
    await press(one, [true, true]);
    agreeListening(await reading(one, phone), true);
  });

  it('on, off, on in one turn', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    await one.setDoor({ on: false });
    await press(one, [true, false, true]);
    agreeListening(await reading(one, phone), true);
  });

  for (const k of [0, 1, 2, 3, 4]) {
    it(`on, off, on, off, on, ${String(k)} microtasks apart, with the production wait on the sessions`, async () => {
      const one = await hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false, true], k, () => Promise.resolve());
      agreeListening(await reading(one, phone), true);
    });
  }
});

// ---------------------------------------------------------------------------
// The ruling's two clauses about a superseded start, and the wait it ends.
// ---------------------------------------------------------------------------

describe('a start whose press is no longer the last one', () => {
  /** A wait on the sessions this test releases, and how often it was entered. */
  function heldSessions(): {
    wait: () => Promise<unknown>;
    entered: () => number;
    hold: () => void;
    release: () => void;
  } {
    let held = false;
    let entered = 0;
    let release = (): void => undefined;
    const sessions = new Promise<void>((resolve) => {
      release = resolve;
    });
    releasers.push(() => release());
    return {
      wait: () => {
        if (!held) return Promise.resolve();
        entered += 1;
        return sessions;
      },
      entered: () => entered,
      hold: () => {
        held = true;
      },
      release: () => release()
    };
  }

  async function until(test: () => boolean): Promise<void> {
    for (let i = 0; i < 200 && !test(); i += 1) await Promise.resolve();
    expect(test()).toBe(true);
  }

  it('stops waiting on the sessions when a later press arrives, so the off is answered while they are still coming up', async () => {
    const sessions = heldSessions();
    const one = await hostOn(sessions.wait);
    await onAndConfirmed(one);
    await one.setDoor({ on: false });
    sessions.hold();
    const entered = binds.entered;
    const on = one.setDoor({ on: true });
    // The start is WAITING on the sessions before the off is pressed.
    await until(() => sessions.entered() === 1);
    const off = await one.setDoor({ on: false });
    // Answered with the sessions still not up, and nothing reached the bind.
    expect(off.state).toBe('off');
    await on;
    expect(binds.entered).toBe(entered);
    agreeOff(await reading(one));
    sessions.release();
    await tick();
    agreeOff(await reading(one));
    expect(binds.entered).toBe(entered);
  });

  it('does not bind when it is superseded before it binds: on, on, and ONE start reaches the bind', async () => {
    const sessions = heldSessions();
    const one = await hostOn(sessions.wait);
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    await one.setDoor({ on: false });
    sessions.hold();
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    await until(() => sessions.entered() === 1);
    const second = one.setDoor({ on: true });
    // The first start stopped waiting when the second press arrived; the
    // second waits on the sessions in its turn.
    await until(() => sessions.entered() === 2);
    sessions.release();
    await Promise.all([first, second]);
    expect(binds.entered).toBe(entered + 1);
    agreeListening(await reading(one, phone), true);
  });

  it('closes a door that bound under it before the next press runs', async () => {
    const one = await hostOn();
    await onAndConfirmed(one);
    const phone = pairPhone(one);
    await one.setDoor({ on: false });
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    // The first start is inside the real listen when the second press arrives.
    await until(() => binds.entered === entered + 1);
    const second = one.setDoor({ on: true });
    await Promise.all([first, second]);
    // The second start reached the bind with nothing listening: the door the
    // first one opened was closed inside the first one's turn.
    expect(binds.listeningAtEntry.slice(entered)).toEqual([false, false]);
    agreeListening(await reading(one, phone), true);
  });
});
