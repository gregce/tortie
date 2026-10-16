/**
 * One Allow starts the door once, however many arrive (Phase 333.12.2,
 * build/p33122/SPEC.md §7.1, rows O1 to O12, and §As built, rows O13 to O20).
 *
 * WHAT THIS FILE HOLDS. The directed rows of the defect Phase 333.12's
 * reverify found: N `pocket:confirmDoor` calls arriving before the first start
 * published queued N starts, and every start after the first read the door's
 * OWN Funnel child as a port somebody else holds, refused `port-taken` and
 * wrote the funnel `idle`, leaving the door process listening and the child
 * publishing while main read `refused`. Each row drives the SHIPPING owner and
 * ends on {@link oneDoorOrNone}, the invariant the walk checks
 * (`p33122-walk.test.ts`): nothing answers the internet unless main says the
 * door is confirmed and listening (CLAUDE.md refusal 8).
 *
 * O1, O2, O2b, O3, O6, O7, O8 and O9 read RED at the parent `69c3bd5a` (and at
 * v0.111.1); O4, O5 and the controls O10 to O12 read green at both. The
 * mechanism each row answers: D1 the one start in flight (`queueStart`'s first
 * statement), D2 and D3 the `held` outcome and the two writes that leave a held
 * door alone, D4 the switch-on press that ends an adopted child before it
 * reads, D5 the child ended before the door process when a start loses.
 *
 * O13 to O15 are the integrator's (SPEC §As built, D13 to D15), the two
 * classes the walk still found once D1 to D4 were in: a door process left
 * listening after its CHILD died, behind a refused face, by an Allow (O13) or
 * a switch-on (O14) whose read refused; and a door process that died while
 * Tailscale waited on approval, under a child adopted after it (O15). All
 * three read RED at the parent.
 *
 * O16, O17 and O19 are the fix round's (SPEC §As built, D16): a stop queued
 * behind the start in flight (`pocket:forgetDoor`) swallowed the Allow made
 * after it. O16 (Allow, forget and Allow in one tick) and O17 (the same while
 * the first start waits on approval) read GREEN at the parent and RED at the
 * integrator's tree, which is the regression a verify lens found; O19 (a
 * published door, then forget and Allow in one tick) reads RED at both, the
 * same shape the parent already had. O16b (no Allow after the forget) and
 * O18 (unpublish ends the child before the door process) are controls, green
 * everywhere.
 *
 * `build/ablation-p313.mjs` runs this file in its clone as its `onestart`
 * check, so every test here must pass on the shipping source and stay
 * deterministic: a wait of a second or more is released by hand, never slept.
 *
 * THE WORLD IS p3331-return.test.ts's, copied (vi.mock is per file): the
 * SHIPPING owner over the REAL `./bind.ts` behind the same counting wrapper,
 * its door process run in this process (`./door/in-process.ts`, the listener
 * the utility process runs, on loopback TLS), and Funnel an in-memory stand-in
 * behind `FunnelDeps` that publishes a foreground session when its child
 * starts and deletes it when the child is signalled. Three additions, here
 * only:
 *
 *  1. TAILSCALED'S RULE in `spawn`: a child asked for a port a live foreground
 *     session (or his own Serve) already holds writes `listener already exists
 *     for port <p>` to stderr and exits 1, the pinned message `./funnel.ts`
 *     classifies `port-taken`, as the Phase 330 stand-in and the real
 *     tailscaled do.
 *  2. A DOOR WRAPPER around `inProcessDoor()` that keeps every `DoorChild` it
 *     hands out, so a row can make one die unasked (its `kill()`, called by
 *     the test, which `./bind.ts` reads as an exit nobody asked for).
 *  3. ONE ORDER LOG: the wrapper writes `door-kill` whenever any door process
 *     is killed, `Child.kill` writes `child-kill <pid>`, and the fake `exec`
 *     writes `exec <subcommand>`, so a row reads what happened before what.
 *
 * NOTHING HERE BINDS ANYTHING BUT 127.0.0.1:0, and no program is executed.
 * Every door is stopped and every child ended in `afterEach`, whatever
 * happened.
 */

import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DoorChild, DoorSpawner } from '../door/wire';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketFacts } from '../routes';
import { fakeNameDeps } from './dns-fixtures';

let userData = '';
const MARKER = '--tortie-p33122-one-start-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: { openExternal: async () => undefined },
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

/** Every log line, kept, so a row can say the door never logged port-taken. */
const logged: string[] = [];
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push(`${level} ${msg} ${JSON.stringify(fields ?? null)}`);
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
 * How many forks reached the REAL bind, and a stop the test can HOLD (the
 * world as p3331-return.test.ts has it; no row here holds one).
 */
const binds = {
  entered: 0,
  stopsEntered: 0,
  stopHold: null as Promise<void> | null
};
vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    startPocketDoor: async (input: Parameters<typeof real.startPocketDoor>[0]) => {
      binds.entered += 1;
      return real.startPocketDoor(input);
    },
    stopPocketDoor: async () => {
      binds.stopsEntered += 1;
      const hold = binds.stopHold;
      if (hold !== null) await hold;
      return real.stopPocketDoor();
    }
  };
});

const { PocketHost } = await import('../ipc');
const { phoneIdOf, readPocketStore, sealPresentationAsPhone } = await import('../pairing');
const bind = await import('../bind');
const { inProcessDoor } = await import('../door/in-process');
const { liveFunnelCountForTests, resetFunnelForTests } = await import('../funnel');
const { pocketFunnelSentence } = await import('@shared/ipc/pocket');
const { confirmPath } = await import('../../config/confirm-record');

type Host = InstanceType<typeof PocketHost>;

/**
 * THE ORDER LOG (addition 3): `door-kill`, `child-kill <pid>` and
 * `exec <subcommand>`, in the order they happened.
 */
const order: string[] = [];

// ---------------------------------------------------------------------------
// Tailscale, in memory
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';
const TAILNET = 'example.github';
const ADMIN_URL = 'https://login.tailscale.com/f/funnel?node=nMADEUP';
/** The pinned message `classifyFunnelExit` reads as `not-approved`. */
const NOT_APPROVED = 'Funnel not available; "funnel" node attribute not set.';

class FakeStream extends EventEmitter {}

class Child extends EventEmitter {
  readonly stdout = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly stderr = new FakeStream() as unknown as NodeJS.ReadableStream;
  closed = false;
  command = '';
  constructor(
    readonly pid: number,
    private readonly onEnd: () => void
  ) {
    super();
  }
  out(text: string): void {
    (this.stdout as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }
  err(text: string): void {
    (this.stderr as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }
  close(code: number | null, signal: string | null = null): void {
    if (this.closed) return;
    this.closed = true;
    this.onEnd();
    this.emit('close', code, signal);
  }
  kill(signal: NodeJS.Signals): boolean {
    order.push(`child-kill ${String(this.pid)}`);
    this.close(signal === 'SIGINT' ? 0 : null, signal);
    return true;
  }
}

interface HeldSleep {
  ms: number;
  released: boolean;
  release: () => void;
}

const ts = {
  backend: 'Running',
  caps: true,
  users: null as unknown,
  uid: 1 as unknown,
  tailnet: TAILNET,
  /** Ports his own Serve holds at the top level. */
  held: [] as number[],
  /** The stderr every funnel start fails with, or null. */
  refuse: null as string | null,
  approval: 'none' as 'none' | 'wait',
  approve: null as null | (() => void),
  sessions: new Map<number, { port: number; target: string }>(),
  children: [] as Child[],
  execs: [] as { file: string; args: string[] }[],
  spawns: 0,
  sleeps: [] as HeldSleep[],
  nextPid: 80_000
};

function statusText(): string {
  const caps: Record<string, null> = ts.caps ? { https: null, funnel: null } : {};
  return JSON.stringify({
    BackendState: ts.backend,
    Self: { DNSName: `${NAME}.`, UserID: ts.uid, CapMap: caps },
    CurrentTailnet: { Name: ts.tailnet },
    User: ts.users,
    Peer: null
  });
}

function serveText(): string {
  const foreground: Record<string, unknown> = {};
  for (const [pid, s] of ts.sessions) {
    foreground[`s${String(pid)}`] = {
      TCP: { [String(s.port)]: { TCPForward: s.target, ProxyProtocol: 2 } },
      AllowFunnel: { [`${NAME}:${String(s.port)}`]: true }
    };
  }
  if (ts.held.length === 0 && ts.sessions.size === 0) return 'null';
  return JSON.stringify({
    TCP: Object.fromEntries(ts.held.map((p) => [String(p), { HTTPS: true }])),
    Foreground: foreground
  });
}

function funnelDeps(): FunnelDeps {
  return {
    resolve: () => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true }),
    exec: async (file, args) => {
      order.push(`exec ${args[0] ?? ''}`);
      ts.execs.push({ file, args: [...args] });
      if (args[0] === 'status') return { stdout: statusText(), stderr: '', code: 0, failed: false, errno: null };
      return { stdout: serveText(), stderr: '', code: 0, failed: false, errno: null };
    },
    spawn: (file, args) => {
      ts.spawns += 1;
      const pid = (ts.nextPid += 1);
      const port = Number(/--tcp=(\d+)/.exec(args.join(' '))?.[1] ?? 0);
      const target = (/tcp:\/\/(\S+)/.exec(args.join(' '))?.[1] ?? '').trim();
      const child = new Child(pid, () => ts.sessions.delete(pid));
      child.command = [file, ...args].join(' ');
      ts.children.push(child);
      const publish = (): void => {
        // TAILSCALED'S RULE (addition 1): a port a live foreground session or
        // his own Serve already holds is refused with the pinned message.
        if (ts.held.includes(port) || [...ts.sessions.values()].some((s) => s.port === port)) {
          child.err(`listener already exists for port ${String(port)}\n`);
          child.close(1);
          return;
        }
        ts.sessions.set(pid, { port, target });
        child.out('Available on the internet:\n');
      };
      setImmediate(() => {
        if (child.closed) return;
        if (ts.refuse !== null) {
          child.err(`${ts.refuse}\n`);
          child.close(1);
          return;
        }
        if (ts.approval === 'wait') {
          child.out(`\nTo approve, visit:\n\n         ${ADMIN_URL}\n\n`);
          ts.approve = () => {
            ts.approve = null;
            if (child.closed) return;
            child.out('Success.\n');
            publish();
          };
          return;
        }
        publish();
      });
      return child as unknown as FunnelChild;
    },
    ps: async (pid) => {
      const c = ts.children.find((x) => x.pid === pid);
      return c === undefined || c.closed ? null : { lstart: `s${String(pid)}`, command: c.command };
    },
    kill: (pid, signal) => {
      const c = ts.children.find((x) => x.pid === pid);
      if (signal === 0) return c !== undefined && !c.closed;
      c?.kill(signal);
      return c !== undefined;
    },
    recordPath: () => join(userData, 'gmux', 'pocket-funnel', 'record.json'),
    now: () => Date.now(),
    // Waits of a second or more are HELD until a test releases them, which is
    // how a restart's timer is placed by hand.
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        const entry: HeldSleep = {
          ms,
          released: false,
          release: () => {
            if (entry.released) return;
            entry.released = true;
            resolve();
          }
        };
        if (ms < 1_000) {
          setImmediate(resolve);
          return;
        }
        ts.sleeps.push(entry);
      })
  };
}

/** Release the newest held wait of exactly `ms`. */
function releaseNewest(ms: number): void {
  const entry = [...ts.sleeps].reverse().find((s) => s.ms === ms && !s.released);
  expect(entry, `a held wait of ${String(ms)} ms`).toBeDefined();
  entry?.release();
}

// ---------------------------------------------------------------------------
// The door process, counted (addition 2)
// ---------------------------------------------------------------------------

interface DoorEntry {
  readonly child: DoorChild;
  killed: boolean;
}

/** Every door process handed out, in order. */
const doors: DoorEntry[] = [];

/**
 * `inProcessDoor()`, with every `DoorChild` it hands out kept, and every kill
 * of one written to the order log, whoever asked for it.
 */
function countedDoor(): DoorSpawner {
  const inner = inProcessDoor();
  return () => {
    const child = inner();
    const entry: DoorEntry = {
      child: {
        pid: child.pid,
        post: (message) => child.post(message),
        onMessage: (listener) => child.onMessage(listener),
        onExit: (listener) => child.onExit(listener),
        kill: () => {
          order.push('door-kill');
          entry.killed = true;
          child.kill();
        }
      },
      killed: false
    };
    doors.push(entry);
    return entry.child;
  };
}

/** The door process dies unasked: killed by the test, which `./bind.ts` reads as nobody's ask. */
function doorDiesUnasked(): void {
  const entry = [...doors].reverse().find((d) => !d.killed);
  if (entry === undefined) throw new Error('no door process is alive');
  entry.child.kill();
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const FACTS: PocketFacts = {
  sessions: () => [],
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
const hosts: Host[] = [];

function hostOn(): Host {
  const one = new PocketHost({
    facts: FACTS,
    tailscale: funnelDeps(),
    door: countedDoor(),
    names: fakeNameDeps({ sleep: 'now' })
  });
  hosts.push(one);
  return one;
}

/** Let the queue and every immediate it scheduled run. */
async function settle(one: Host): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await one.idle();
    await tick();
  }
}

async function until(test: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 400 && !test(); i += 1) await tick();
  expect(test(), what).toBe(true);
}

const statusReads = (): number => ts.execs.filter((e) => e.args[0] === 'status').length;
const liveChildren = (): Child[] => ts.children.filter((c) => !c.closed);
const alive = (): number => liveChildren().length;
const lastChild = (): Child => {
  const child = ts.children.at(-1);
  if (child === undefined) throw new Error('no child was spawned');
  return child;
};

interface Counts {
  forks: number;
  spawns: number;
  reads: number;
}
const counts = (): Counts => ({ forks: binds.entered, spawns: ts.spawns, reads: statusReads() });
const since = (before: Counts): Counts => ({
  forks: binds.entered - before.forks,
  spawns: ts.spawns - before.spawns,
  reads: statusReads() - before.reads
});

/** The switch on, and its read settled: the sheet now draws the lines and Allow. */
async function switchedOn(one: Host): Promise<void> {
  await one.setDoor({ on: true });
  await settle(one);
  expect(one.status().confirmable).toBe(true);
}

/** The sheet's order: the switch, the read, Allow, listening. */
async function onAndConfirmed(one: Host): Promise<void> {
  await switchedOn(one);
  const lines = one.status();
  await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
  await settle(one);
  expect(one.status().state).toBe('listening');
}

/** Allow whatever the sheet draws now. */
async function allow(one: Host): Promise<void> {
  const lines = one.status();
  const answer = await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
  expect(answer.allowed, answer.refusal ?? '').toBe(true);
}

/** `n` Allows of ONE status, in one tick: every call made before any is awaited. */
async function allowsInOneTick(one: Host, n: number): Promise<void> {
  const lines = one.status();
  const answers = await Promise.all(
    Array.from({ length: n }, () => one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash }))
  );
  expect(answers.map((a) => a.allowed)).toEqual(Array.from({ length: n }, () => true));
}

/** The confirm record's bytes on disk, or null with none. */
function recordBytes(): string | null {
  return existsSync(confirmPath()) ? readFileSync(confirmPath(), 'utf8') : null;
}

/**
 * Pair one phone through the shipping window on a published door, once main
 * says a code may show, and answer its id (p3331-return.test.ts's pairing).
 */
async function pairPhone(one: Host, label: string): Promise<string> {
  await until(() => one.status().pairable, 'main says a code may show');
  const offer = await one.beginPairing();
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const spki = (key: KeyObject): string => key.export({ format: 'der', type: 'spki' }).toString('base64url');
  const signingKey = spki(signing.publicKey);
  const body = (): Parameters<Host['pairing']['present']>[0] =>
    JSON.parse(
      sealPresentationAsPhone(
        offer.payload,
        { label, signingKey, exchangeKey: spki(exchange.publicKey), clientKey: spki(client.publicKey) },
        signing.privateKey
      ).toString('utf8')
    ) as Parameters<Host['pairing']['present']>[0];
  expect(one.pairing.present(body())).toEqual({ state: 'pending' });
  const view = one.pairing.view();
  expect(one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' }).allowed).toBe(true);
  expect(one.pairing.present(body()).state).toBe('allowed');
  one.cancelPairing();
  return phoneIdOf(signingKey);
}

/**
 * THE INVARIANT (SPEC §7.1, I1, I2, I3, I5), asserted at the end of every row
 * once its queue has settled.
 *
 *  I1  a door process up (listening, or handed out and never killed) or a
 *      Funnel child alive means main reads `listening` AND `confirmed`;
 *  I2  at most one child alive, and the funnel module holds exactly the
 *      children that are alive;
 *  I3  `listening` means the door process listens and exactly one child is
 *      alive, published on `status().publicPort` and forwarding to
 *      `127.0.0.1:<the door's local port>`;
 *  I5  the refusal is never the port-taken sentence (nor the word) for a port
 *      only the door's own children held: his own Serve must hold it.
 */
function oneDoorOrNone(one: Host): void {
  const s = one.status();
  const door = bind.pocketDoorStatus();
  const children = liveChildren();
  const doorsUp = doors.filter((d) => !d.killed).length;
  const answering = door.listening || doorsUp > 0 || children.length > 0;
  if (answering) {
    expect(
      { state: s.state, confirmState: s.confirmState },
      `I1: a door process (listening ${String(door.listening)}, up ${String(doorsUp)}) or ${String(children.length)} Funnel child(ren) answer while main reads ${s.state}/${s.confirmState}`
    ).toEqual({ state: 'listening', confirmState: 'confirmed' });
  }
  expect(children.length, 'I2: more than one Funnel child is alive').toBeLessThanOrEqual(1);
  expect(liveFunnelCountForTests(), 'I2: the funnel module holds a child that is not alive, or misses one').toBe(
    children.length
  );
  expect(doorsUp, 'I1: more than one door process is up').toBeLessThanOrEqual(1);
  if (s.state === 'listening') {
    expect(door.listening, 'I3: listening with no door process listening').toBe(true);
    expect(children, 'I3: listening without exactly one Funnel child').toHaveLength(1);
    const session = ts.sessions.get(children[0]?.pid ?? -1);
    expect(session, 'I3: the child does not publish this door').toEqual({
      port: s.publicPort,
      target: `127.0.0.1:${String(door.localPort)}`
    });
  }
  for (const port of new Set([8443, 10000, s.publicPort])) {
    if (s.refusal === pocketFunnelSentence('port-taken', port)) {
      expect(ts.held, `I5: port-taken for ${String(port)}, which only the door's own child held`).toContain(port);
    }
  }
  if (s.funnel.refused === 'port-taken') {
    expect(ts.held, 'I5: the word port-taken over a port only the door held').toContain(s.publicPort);
  }
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p33122-one-start-'));
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  binds.entered = 0;
  binds.stopsEntered = 0;
  binds.stopHold = null;
  Object.assign(ts, {
    backend: 'Running',
    caps: true,
    users: null,
    uid: 1,
    tailnet: TAILNET,
    held: [],
    refuse: null,
    approval: 'none',
    approve: null,
    children: [],
    execs: [],
    spawns: 0,
    sleeps: []
  });
  ts.sessions.clear();
  order.length = 0;
  doors.length = 0;
  logged.length = 0;
});

afterEach(async () => {
  binds.stopHold = null;
  ts.approve = null;
  for (const one of hosts.splice(0)) {
    try {
      await one.stop();
    } catch {
      /* a stop never throws; this is the teardown */
    }
  }
  for (const s of ts.sleeps) s.release();
  await bind.stopPocketDoor();
  for (const d of doors) if (!d.killed) d.child.kill();
  for (const c of ts.children) c.close(null, 'SIGKILL');
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  rmSync(userData, { recursive: true, force: true });
});

afterAll(async () => {
  await bind.joinPocketDoor();
  bind.resetPocketDoorForTests();
});

// ---------------------------------------------------------------------------
// D1: one start in flight, however many Allows
// ---------------------------------------------------------------------------

describe('D1: Allows that arrive before the first start publishes start the door once', () => {
  it('O1 the reverify’s sequence: on, Allow, alerts on, then two Allows in one tick — one start, listening, and a switch-on moves nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await one.setPushAlerts(true);
    await settle(one);
    expect(one.status().confirmState).toBe('changed');
    expect(alive()).toBe(0);
    const before = counts();
    await allowsInOneTick(one, 2);
    await settle(one);
    expect(since(before)).toEqual({ forks: 1, spawns: 1, reads: 1 });
    expect(one.status()).toMatchObject({
      state: 'listening',
      confirmState: 'confirmed',
      refusal: null,
      funnel: { state: 'publishing', refused: null }
    });
    expect(alive()).toBe(1);
    // The parent's Try again moved the port over the door's own child here.
    const spawns = ts.spawns;
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().publicPort).toBe(8443);
    expect(ts.spawns).toBe(spawns);
    expect(alive()).toBe(1);
    expect(logged.filter((line) => line.includes('did not open: port-taken'))).toEqual([]);
    oneDoorOrNone(one);
  });

  it.each([2, 3, 10])('O2 a first setup and %i Allows in one tick: one fork, one spawn, one read, listening', async (n) => {
    const one = hostOn();
    await switchedOn(one);
    const before = counts();
    await allowsInOneTick(one, n);
    await settle(one);
    expect(since(before)).toEqual({ forks: 1, spawns: 1, reads: 1 });
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', refusal: null });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O2b two Allows in one tick while every Funnel start is refused: the second reads and spawns nothing again', async () => {
    ts.refuse = NOT_APPROVED;
    const one = hostOn();
    await switchedOn(one);
    const before = counts();
    await allowsInOneTick(one, 2);
    await settle(one);
    expect(since(before)).toMatchObject({ spawns: 1, reads: 1 });
    expect(one.status()).toMatchObject({ state: 'refused', funnel: { state: 'idle', refused: 'not-approved' } });
    expect(alive()).toBe(0);
    expect(bind.pocketDoorStatus().listening).toBe(false);
    oneDoorOrNone(one);
  });

  it('O3 an Allow while the first start waits on approval answers allowed and opening, and starts nothing more', async () => {
    ts.approval = 'wait';
    const one = hostOn();
    await switchedOn(one);
    const before = counts();
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on Tailscale’s approval');
    const lines = one.status();
    const second = await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    expect(second.allowed).toBe(true);
    expect(second.status.state).toBe('opening');
    const approve = ts.approve;
    if (approve === null) throw new Error('the child is not waiting on approval');
    approve();
    await settle(one);
    expect(since(before)).toMatchObject({ spawns: 1 });
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// Phase 333.12's narrowings beside an Allow (no violation at either build)
// ---------------------------------------------------------------------------

describe('an Allow beside a Remove or the alerts off (Phase 333.12’s narrowings), unchanged', () => {
  it('O4 two phones, alerts on, then Allow and Remove of one phone in one tick: listening on the narrower door', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await pairPhone(one, 'Phone A');
    const b = await pairPhone(one, 'Phone B');
    await one.setPushAlerts(true);
    await settle(one);
    expect(one.status().confirmState).toBe('changed');
    const lines = one.status();
    const [answer] = await Promise.all([
      one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash }),
      one.removePhone(b)
    ]);
    expect(answer.allowed).toBe(true);
    await settle(one);
    const s = one.status();
    expect(s).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(s.phones).toHaveLength(1);
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O4 reversed: a Remove first, then an Allow over the lines read before it, is refused and records nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await pairPhone(one, 'Phone A');
    const b = await pairPhone(one, 'Phone B');
    await one.setPushAlerts(true);
    await settle(one);
    const lines = one.status();
    expect(lines.confirmState).toBe('changed');
    await one.removePhone(b);
    await settle(one);
    const before = recordBytes();
    const refused = await one
      .confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash })
      .then(
        () => null,
        (err: unknown) => err
      );
    expect(refused).toMatchObject({ payload: { code: 'INVALID_INPUT' } });
    expect(String((refused as Error).message)).toMatch(/changed after it was shown/);
    await settle(one);
    expect(recordBytes()).toBe(before);
    expect(alive()).toBe(0);
    expect(bind.pocketDoorStatus().listening).toBe(false);
    oneDoorOrNone(one);
  });

  it('O5 alerts on, then Allow and alerts off in one tick: listening, one child', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await one.setPushAlerts(true);
    await settle(one);
    expect(one.status().confirmState).toBe('changed');
    const lines = one.status();
    const [answer] = await Promise.all([
      one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash }),
      one.setPushAlerts(false)
    ]);
    expect(answer.allowed).toBe(true);
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', pushAlerts: false });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// D2, D3, D6: a start queued behind a job that published is held
// ---------------------------------------------------------------------------

describe('D2 and D3: a start that finds the door’s child adopted does nothing and writes nothing', () => {
  it('O6 stopped, then a switch-on and an Allow of the recorded hash in one tick: the switch’s job publishes, the Allow’s start is held', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await one.stop();
    await settle(one);
    expect(alive()).toBe(0);
    const lines = one.status();
    expect(lines.confirmState).toBe('confirmed');
    const before = counts();
    const [, answer] = await Promise.all([
      one.setDoor({ on: true }),
      one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash })
    ]);
    expect(answer.allowed).toBe(true);
    await settle(one);
    expect(since(before).spawns).toBe(1);
    expect(one.status()).toMatchObject({
      state: 'listening',
      confirmState: 'confirmed',
      refusal: null,
      funnel: { state: 'publishing', refused: null }
    });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O7 a relaunch: openAtLaunch() and, before it is awaited, an Allow of its status — the launch answers opened, one spawn', async () => {
    const first = hostOn();
    await onAndConfirmed(first);
    await first.stop();
    await settle(first);
    expect(alive()).toBe(0);
    const before = counts();
    const one = hostOn();
    const launched = one.openAtLaunch();
    const lines = one.status();
    expect(lines.confirmState).toBe('confirmed');
    const answer = await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    expect(answer.allowed).toBe(true);
    expect(await launched).toBe('opened');
    await settle(one);
    expect(since(before).spawns).toBe(1);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O8 the door process dies unasked, then an Allow before the restart: nothing forks, spawns or reads, the face says Tortie is trying again, and the restart publishes', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const firstChild = lastChild();
    doorDiesUnasked();
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'opening', funnel: { state: 'restarting' } });
    const before = counts();
    await allow(one);
    await settle(one);
    expect(since(before)).toEqual({ forks: 0, spawns: 0, reads: 0 });
    const s = one.status();
    expect(s).toMatchObject({ state: 'opening', funnel: { state: 'restarting' } });
    expect(s.refusal).not.toBe(pocketFunnelSentence('port-taken', s.publicPort));
    expect(s.funnel.refused).not.toBe('port-taken');
    releaseNewest(2_000);
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    expect(firstChild.closed).toBe(true);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// D4: a switch-on that replaces a restart ends the adopted child first
// ---------------------------------------------------------------------------

describe('D4: a press that replaces a restart ends what the restart would have ended', () => {
  it('O9 the door process dies unasked, then a switch-on before the restart: the old child ends before Tailscale is read, and the port stays 8443', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const firstChild = lastChild();
    doorDiesUnasked();
    await settle(one);
    expect(one.status().funnel.state).toBe('restarting');
    const mark = order.length;
    await one.setDoor({ on: true });
    await settle(one);
    const after = order.slice(mark);
    const killed = after.indexOf(`child-kill ${String(firstChild.pid)}`);
    const read = after.indexOf('exec status');
    expect(killed, `the old child is ended by the press (${after.join(', ')})`).toBeGreaterThanOrEqual(0);
    expect(read, `the press reads Tailscale after the old child ended (${after.join(', ')})`).toBeGreaterThan(killed);
    const s = one.status();
    expect(s.publicPort).toBe(8443);
    expect(readPocketStore().store?.publicPort).toBe(8443);
    expect(s).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(s.funnel.state).not.toBe('restarting');
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// D13 to D15 (the integrator's, SPEC §As built): no door process without its child
// ---------------------------------------------------------------------------

describe('D13 to D15: a door process is never left listening without its child behind a refused face', () => {
  it('O13 (D13) Tailscale stops and the CHILD dies unasked, then an Allow before the restart: the door process it left is ended, and the restart publishes once Tailscale runs', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    ts.backend = 'Stopped';
    lastChild().close(null, 'SIGKILL');
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'opening', funnel: { state: 'restarting' } });
    expect(bind.pocketDoorStatus().listening).toBe(true);
    await allow(one);
    await settle(one);
    expect(bind.pocketDoorStatus().listening, 'the door process the dead child left is ended by the start').toBe(false);
    expect(alive()).toBe(0);
    expect(one.status().state).not.toBe('listening');
    oneDoorOrNone(one);
    ts.backend = 'Running';
    releaseNewest(2_000);
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O14 (D15) Tailscale stops and the CHILD dies unasked, then a switch-on before the restart: the door process is ended before the read, and Try again publishes once Tailscale runs', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    ts.backend = 'Stopped';
    lastChild().close(null, 'SIGKILL');
    await settle(one);
    expect(bind.pocketDoorStatus().listening).toBe(true);
    await one.setDoor({ on: true });
    await settle(one);
    expect(bind.pocketDoorStatus().listening, 'the press ends the door process the dead child left').toBe(false);
    expect(alive()).toBe(0);
    expect(one.status()).toMatchObject({ state: 'refused', tailscale: 'stopped' });
    oneDoorOrNone(one);
    ts.backend = 'Running';
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O15 (D14) the door process dies unasked while the start waits on approval: the approved child is ended rather than adopted, the face says the door could not open, and Try again publishes', async () => {
    ts.approval = 'wait';
    const one = hostOn();
    await switchedOn(one);
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on Tailscale’s approval');
    const child = lastChild();
    doorDiesUnasked();
    for (let i = 0; i < 20; i += 1) await tick();
    expect(bind.pocketDoorStatus().listening).toBe(false);
    ts.approve?.();
    await settle(one);
    expect(child.closed, 'the approved child is ended, not adopted').toBe(true);
    expect(alive()).toBe(0);
    expect(liveFunnelCountForTests()).toBe(0);
    const s = one.status();
    expect(s.state).toBe('refused');
    expect(s.refusal).toBe(bind.DOOR_SENTENCES['bind-failed']);
    oneDoorOrNone(one);
    ts.approval = 'none';
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// D16 (the fix round, SPEC §As built): a stop behind the start in flight
// ---------------------------------------------------------------------------

describe('D16: a stop queued behind the start in flight does not swallow the Allow after it', () => {
  it('O16 Allow, forget and Allow in one tick: the last word is Allow, and the door ends listening with one child', async () => {
    const one = hostOn();
    await switchedOn(one);
    const lines = one.status();
    const input = { linesRead: lines.confirmLines, hashRead: lines.confirmHash };
    const first = one.confirmDoor(input);
    const forgotten = one.forgetDoor();
    const last = one.confirmDoor(input);
    expect((await first).allowed).toBe(true);
    expect((await last).allowed).toBe(true);
    await forgotten;
    await settle(one);
    expect(one.status()).toMatchObject({
      state: 'listening',
      confirmState: 'confirmed',
      refusal: null,
      funnel: { state: 'publishing', refused: null }
    });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O16b control: Allow and forget in one tick, and no Allow after it: the door stays shut and nothing answers', async () => {
    const one = hostOn();
    await switchedOn(one);
    const lines = one.status();
    const first = one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    const forgotten = one.forgetDoor();
    expect((await first).allowed).toBe(true);
    await forgotten;
    await settle(one);
    const s = one.status();
    expect(s.state).not.toBe('listening');
    expect(s.confirmState).not.toBe('confirmed');
    expect(alive()).toBe(0);
    expect(bind.pocketDoorStatus().listening).toBe(false);
    oneDoorOrNone(one);
  });

  it('O17 the start waits on approval, then forget and Allow, then approval: the stop closes what that start opened and the Allow’s own start opens the door', async () => {
    ts.approval = 'wait';
    const one = hostOn();
    await switchedOn(one);
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on Tailscale’s approval');
    const forgotten = one.forgetDoor();
    await allow(one);
    ts.approval = 'none';
    const approve = ts.approve;
    if (approve === null) throw new Error('the child is not waiting on approval');
    approve();
    await forgotten;
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', refusal: null });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O19 a published door, then forget and Allow in one tick: the Allow starts the door again behind the stop rather than leave it shut (red at the parent too)', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const before = counts();
    const forgotten = one.forgetDoor();
    await allow(one);
    await forgotten;
    await settle(one);
    expect(since(before)).toMatchObject({ forks: 1, spawns: 1 });
    expect(one.status()).toMatchObject({
      state: 'listening',
      confirmState: 'confirmed',
      refusal: null,
      funnel: { state: 'publishing', refused: null }
    });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// D17 (the fix round, SPEC §As built): the confirm the start in flight never read
// ---------------------------------------------------------------------------

describe('D17: an Allow made after the start in flight last read the gate is queued when that start ends', () => {
  it('O20 the start publishes, finds alerts turned on at its end and closes; an Allow made while it closes opens the door again', async () => {
    ts.approval = 'wait';
    const one = hostOn();
    await switchedOn(one);
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on Tailscale’s approval');
    // Alerts on while the start waits: its last read of the gate will say changed.
    const alerts = one.setPushAlerts(true);
    let release: () => void = () => undefined;
    binds.stopHold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stopsBefore = binds.stopsEntered;
    ts.approval = 'none';
    const approve = ts.approve;
    if (approve === null) throw new Error('the child is not waiting on approval');
    approve();
    // The start publishes, reads the gate at its end, and closes: held inside its stop.
    await until(() => binds.stopsEntered > stopsBefore, 'the start’s end closes the door it published');
    expect(one.status().confirmState).toBe('changed');
    await allow(one);
    binds.stopHold = null;
    release();
    await alerts;
    await settle(one);
    expect(one.status()).toMatchObject({
      state: 'listening',
      confirmState: 'confirmed',
      refusal: null,
      pushAlerts: true,
      funnel: { state: 'publishing', refused: null }
    });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });
});

// ---------------------------------------------------------------------------
// Controls, and D5: today's readings
// ---------------------------------------------------------------------------

describe('controls: today’s readings, byte for byte', () => {
  it('O10 the CHILD dies unasked, then a switch-on: listening, one child', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    lastChild().close(null, 'SIGKILL');
    await settle(one);
    expect(one.status().funnel.state).toBe('restarting');
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O11 a first setup and ONE Allow: one fork, one spawn, one read, listening', async () => {
    const one = hostOn();
    await switchedOn(one);
    const before = counts();
    await allow(one);
    await settle(one);
    expect(since(before)).toEqual({ forks: 1, spawns: 1, reads: 1 });
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(alive()).toBe(1);
    oneDoorOrNone(one);
  });

  it('O12 (D5) a start superseded during Tailscale’s approval wait ends its child BEFORE its door process, and leaves nothing', async () => {
    ts.approval = 'wait';
    const one = hostOn();
    await switchedOn(one);
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on Tailscale’s approval');
    const child = lastChild();
    const mark = order.length;
    await one.setDoor({ on: false });
    await settle(one);
    const after = order.slice(mark);
    const childKill = after.indexOf(`child-kill ${String(child.pid)}`);
    const doorKill = after.indexOf('door-kill');
    expect(childKill, `the start’s child is ended (${after.join(', ')})`).toBeGreaterThanOrEqual(0);
    expect(doorKill, `the door process is ended after its child (${after.join(', ')})`).toBeGreaterThan(childKill);
    expect(alive()).toBe(0);
    expect(bind.pocketDoorStatus().listening).toBe(false);
    expect(liveFunnelCountForTests()).toBe(0);
    expect(one.status().state).toBe('off');
    oneDoorOrNone(one);
  });

  it('O18 off on a published door ends the Funnel child BEFORE the door process (unpublish’s own order), and leaves nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const child = lastChild();
    const mark = order.length;
    await one.setDoor({ on: false });
    await settle(one);
    const after = order.slice(mark);
    const childKill = after.indexOf(`child-kill ${String(child.pid)}`);
    const doorKill = after.indexOf('door-kill');
    expect(childKill, `the published child is ended (${after.join(', ')})`).toBeGreaterThanOrEqual(0);
    expect(doorKill, `the door process is ended after its child (${after.join(', ')})`).toBeGreaterThan(childKill);
    expect(alive()).toBe(0);
    expect(bind.pocketDoorStatus().listening).toBe(false);
    expect(one.status().state).toBe('off');
    oneDoorOrNone(one);
  });
});
