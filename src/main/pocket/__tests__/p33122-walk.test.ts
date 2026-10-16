/**
 * One Allow starts the door once, however many arrive: THE WALK (Phase
 * 333.12.2, build/p33122/SPEC.md §7.2, D10).
 *
 * WHAT THIS FILE HOLDS. A seeded, model-based random walk over the SHIPPING
 * `PocketHost`: thousands of presses drawn from the whole alphabet a person,
 * the bridge, Tailscale and the processes can produce, and after each one
 * that settles, the invariant that refusal 8 rests on read from the world
 * itself rather than from main's word for it:
 *
 *   I1  a door process alive, or a Funnel child alive, means main says
 *       `listening` over `confirmed` (the one exception is a face that says
 *       Tortie is trying again: `opening` with the funnel `restarting`);
 *   I2  at most one Funnel child alive, at most one door process alive, and
 *       the funnel module's own count of live children equals the world's;
 *   I3  `listening` means the door process listens and exactly one child is
 *       alive, publishing `status().publicPort` and forwarding to the door's
 *       own local port;
 *   I5  no refusal says a port is taken while nothing but the door's own
 *       children could hold one (nothing in this world plants his Serve);
 *   I6  the switch `off` means no child and no door process;
 *   I7  an Allow is never swallowed: when the person's last word was an
 *       Allow main answered `allowed`, and Tailscale runs, main never reads
 *       `refused` over `confirmed` with no sentence and no refusal word
 *       (Phase 333.12.2's fix round, D16: Allow, forget and Allow left the
 *       door shut that way where the parent opened it, found by a verify
 *       lens's own walk; and D17: an Allow made after the start in flight
 *       last read the gate, found by the fix round's own short walks). A
 *       WORD is an action that moves the switch, the
 *       agreement or a hashed field, or relaunches; the Allow words are
 *       `allow`, `allowN` and `allowForgetAllow`, whose last call is an
 *       Allow. Only the last word counts, because a door an alerts-on closed
 *       stays closed when alerts-off puts its fields back (Phase 333.12's
 *       rule: nothing but a start opens a door), which is honest.
 *
 * The fix round added `forget` (the bridge's `pocket:forgetDoor`) and
 * `allowForgetAllow` (Allow, forget and Allow in one tick) to the alphabet,
 * and I7 to the invariant, so the walk drawn from a seed is not the one the
 * integrator's round drew from it.
 *
 * I1 is printed in two kinds and counted alike (SPEC §2.1 counts both): `I1
 * internet`, a Funnel child alive, and `I1 loopback`, the door process alive
 * with no Funnel child.
 *
 * QUIESCENCE (SPEC §7.2): the owner's queue idle and every immediate it
 * scheduled run, every action's own awaits settled, every approval a child
 * waits on released, and, while the funnel reads `restarting` and Tailscale
 * runs, the held restart waits released (at most five times). Only then is
 * the world checked, and each check is counted. `noSettle` issues the next
 * action a few turns after this one, before anything settles; and a start
 * waiting on Tailscale's approval, or a restart armed and waiting its turn, is
 * a PAUSE POINT the walk sometimes leaves waiting so the next press lands
 * there (SPEC §2.2 rows 5, 9 to 11). No pause point is ever checked.
 *
 * Phase 333.12's reverify found the double Allow with a walk like this one
 * (60,000 presses); its script and seed lived in a scratch the landing
 * removed, so this one is the phase's own (SPEC D10, §Attack A11). IT MUST BE
 * RED AT THE PARENT (`69c3bd5a`) BEFORE IT IS BELIEVED GREEN HERE, and it
 * imports nothing Phase 333.12.2 adds, so the same file runs unchanged there.
 *
 * THE SEED AND THE SIZE. `P33122_WALK_SEED` (default 333122) seeds an inline
 * 32-bit generator (mulberry32); `P33122_WALK_PRESSES` sets the number of
 * presses (the default keeps this file to a few seconds inside `npm test`;
 * the verifier runs 60,000). Every choice reads only the generator and main's
 * own answers (`status()`), so one seed replays one walk; the event loop's
 * real I/O (the door's loopback listener) can still reorder an interleaving
 * that `noSettle` leaves open.
 *
 * THE WORLD IS p3331-return.test.ts's, copied (vi.mock is per file): the
 * shipping owner over the REAL `../bind` behind a counting wrapper, the door
 * process run in this process through `../door/in-process` (a REAL TLS
 * listener on 127.0.0.1:0), and Funnel an in-memory stand-in behind
 * `FunnelDeps` that publishes a foreground session when its child starts and
 * deletes it when the child ends. With SPEC §7.1's three additions:
 *
 *   1. tailscaled's rule: a child asked for a port a live foreground session
 *      already holds writes `listener already exists for port <p>` and exits
 *      1, as the Phase 330 stand-in and the real tailscaled do;
 *   2. a door wrapper that keeps every door process it hands out, so the walk
 *      can make one die unasked (bind.ts reads that as an exit nobody asked
 *      for), and logs `door-kill` whenever one is killed;
 *   3. the order log: `child-kill <pid>`, `child-dies <pid>`, `door-kill`,
 *      `door-dies` and `exec <verb>`, kept as a short tail for the readings.
 *
 * A RELAUNCH IS A QUIT AND A NEW PROCESS: the quit's own first lines
 * (`beginPocketShutdown`, `beginFunnelShutdown`), the old owner's `stop()`,
 * the quit's two joins, the old process's exit (which ends any door process
 * it still has, as an app's utility processes end with it; counted as `door
 * processes a quit left`), then both modules reset as a new process finds
 * them, a new owner on the same store, and `openAtLaunch()`, sometimes with an
 * Allow in the same tick. Nothing of the old owner runs after the reset.
 *
 * NOTHING HERE BINDS ANYTHING BUT 127.0.0.1:0, and no program is executed: no
 * Tailscale, no DNS (the name check is `dns-fixtures.ts`'s fake), no APNs, no
 * shell. Waits of a second or more are held and released by the walk, never
 * slept. Every door is stopped and every child ended in `afterEach`.
 */

import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketAllowInput } from '@shared/ipc/pocket';
import type { DoorChild, DoorSpawner } from '../bind';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketFacts } from '../routes';
import { fakeNameDeps } from './dns-fixtures';

let userData = '';
const MARKER = '--tortie-p33122-walk-test--';

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

/** The last log lines, kept as a short tail for a violation's readings. */
const logTail: string[] = [];
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string): void => {
      logTail.push(`${level} ${msg}`);
      if (logTail.length > 12) logTail.shift();
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

/** How many forks and stops reached the REAL bind. */
const binds = { entered: 0, stopsEntered: 0 };
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
      return real.stopPocketDoor();
    }
  };
});

const { PocketHost } = await import('../ipc');
const { sealPresentationAsPhone } = await import('../pairing');
const bind = await import('../bind');
const { inProcessDoor } = await import('../door/in-process');
const { beginFunnelShutdown, funnelTarget, joinFunnel, liveFunnelCountForTests, resetFunnelForTests } = await import(
  '../funnel'
);
const { pocketFunnelSentence } = await import('@shared/ipc/pocket');

type Host = InstanceType<typeof PocketHost>;

// ---------------------------------------------------------------------------
// The seed and the size
// ---------------------------------------------------------------------------

const DEFAULT_SEED = 333_122;
/** The default size: a few seconds here (never under 400, SPEC §7.2). */
const DEFAULT_PRESSES = 4_000;

function envInteger(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

const SEED = (envInteger('P33122_WALK_SEED') ?? DEFAULT_SEED) >>> 0;
const PRESSES = (() => {
  const asked = envInteger('P33122_WALK_PRESSES');
  return asked !== null && asked > 0 ? asked : Math.max(400, DEFAULT_PRESSES);
})();
const WALK_TIMEOUT_MS = Math.max(60_000, PRESSES * 8 + 30_000);

/** One line to the run's own output, past vitest's console capture (as p321-shapes.test.ts prints its cost). */
function say(text: string): void {
  process.stdout.write(`${text}\n`);
}

/** mulberry32: one 32-bit state, written here so the walk depends on nothing. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// ---------------------------------------------------------------------------
// The order log (SPEC §7.1, addition 3)
// ---------------------------------------------------------------------------

const order: string[] = [];
function logOrder(entry: string): void {
  order.push(entry);
  if (order.length > 40) order.shift();
}

// ---------------------------------------------------------------------------
// Tailscale, in memory (p3331-return.test.ts's, with tailscaled's held port)
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';
const TAILNET = 'example.github';
const ADMIN_URL = 'https://login.tailscale.com/f/funnel?node=nMADEUP';

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
    logOrder(`child-kill ${String(this.pid)}`);
    this.close(signal === 'SIGINT' ? 0 : null, signal);
    return true;
  }
}

const ts = {
  backend: 'Running',
  caps: true,
  /** Ports his own Serve holds at the top level. NOTHING IN THE WALK PLANTS ONE (I5). */
  held: [] as number[],
  /** How many of the next spawns wait for an approval. */
  approvalNext: 0,
  /** Every approval a waiting child holds, oldest first. */
  approvals: [] as Array<() => void>,
  sessions: new Map<number, { port: number; target: string }>(),
  /** Every child not yet closed (a closed one is dropped: `ps` and `kill` answer the same for both). */
  children: [] as Child[],
  statusReads: 0,
  serveReads: 0,
  spawns: 0,
  /** Spawns tailscaled refused because a live session held the port. */
  heldRefusals: 0,
  /** The held waits (a restart's): released by the walk, never slept. */
  sleeps: [] as Array<() => void>,
  nextPid: 90_000
};

function statusText(): string {
  const caps: Record<string, null> = ts.caps ? { https: null, funnel: null } : {};
  return JSON.stringify({
    BackendState: ts.backend,
    Self: { DNSName: `${NAME}.`, UserID: 1, CapMap: caps },
    CurrentTailnet: { Name: TAILNET },
    User: null,
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

/** A port a live foreground session (or his Serve) already holds. */
function portHeldNow(port: number): boolean {
  if (ts.held.includes(port)) return true;
  for (const s of ts.sessions.values()) if (s.port === port) return true;
  return false;
}

function pruneChildren(): void {
  ts.children = ts.children.filter((c) => !c.closed);
}

function funnelDeps(): FunnelDeps {
  return {
    resolve: () => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true }),
    exec: async (_file, args) => {
      logOrder(`exec ${args[0] ?? ''}`);
      if (args[0] === 'status') {
        ts.statusReads += 1;
        return { stdout: statusText(), stderr: '', code: 0, failed: false, errno: null };
      }
      ts.serveReads += 1;
      return { stdout: serveText(), stderr: '', code: 0, failed: false, errno: null };
    },
    spawn: (file, args) => {
      ts.spawns += 1;
      pruneChildren();
      const pid = (ts.nextPid += 1);
      const port = Number(/--tcp=(\d+)/.exec(args.join(' '))?.[1] ?? 0);
      const target = (/tcp:\/\/(\S+)/.exec(args.join(' '))?.[1] ?? '').trim();
      const child = new Child(pid, () => ts.sessions.delete(pid));
      child.command = [file, ...args].join(' ');
      ts.children.push(child);
      const waits = ts.approvalNext > 0;
      if (waits) ts.approvalNext -= 1;
      const publish = (): void => {
        if (child.closed) return;
        ts.sessions.set(pid, { port, target });
        child.out('Available on the internet:\n');
      };
      setImmediate(() => {
        if (child.closed) return;
        // TAILSCALED'S RULE (SPEC §7.1, addition 1): a port a live foreground
        // session already holds is refused, and the child exits 1.
        if (portHeldNow(port)) {
          ts.heldRefusals += 1;
          child.err(`listener already exists for port ${String(port)}\n`);
          child.close(1);
          return;
        }
        if (waits) {
          child.out(`\nTo approve, visit:\n\n         ${ADMIN_URL}\n\n`);
          ts.approvals.push(() => {
            if (child.closed) return;
            child.out('Success.\n');
            publish();
          });
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
    // Waits under a second pass on the next turn. The start's deadline (20 s)
    // and the approval's own wait (10 min) never pass here: every start the
    // walk makes publishes, refuses or is released. Every other wait of a
    // second or more is a restart's, HELD until the walk releases it.
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        if (ms < 1_000) {
          setImmediate(resolve);
          return;
        }
        if (ms === 20_000 || ms === 600_000) return;
        ts.sleeps.push(resolve);
      })
  };
}

/** Release every waiting approval; true when there was one. */
function releaseApprovals(): number {
  const waiting = ts.approvals.splice(0);
  for (const approve of waiting) approve();
  return waiting.length;
}

// ---------------------------------------------------------------------------
// The door process, wrapped (SPEC §7.1, addition 2)
// ---------------------------------------------------------------------------

interface DoorEntry {
  exited: boolean;
  /** The inner child's own kill: an exit nobody asked for, as bind.ts reads it. */
  die(): void;
}
const doorProcesses: DoorEntry[] = [];

/**
 * A spawner that hands out the in-process door, one fresh `inProcessDoor()`
 * per process so nothing outlives its door, and keeps every live one.
 */
function wrappedDoor(): DoorSpawner {
  return (): DoorChild => {
    const inner = inProcessDoor()();
    const entry: DoorEntry = {
      exited: false,
      die: () => {
        if (entry.exited) return;
        entry.exited = true;
        logOrder('door-dies');
        inner.kill();
      }
    };
    for (let i = doorProcesses.length - 1; i >= 0; i -= 1) {
      if (doorProcesses[i]?.exited === true) doorProcesses.splice(i, 1);
    }
    doorProcesses.push(entry);
    return {
      pid: inner.pid,
      post: (message) => inner.post(message),
      onMessage: (listener) => inner.onMessage(listener),
      onExit: (listener) => inner.onExit(listener),
      kill: () => {
        logOrder('door-kill');
        entry.exited = true;
        inner.kill();
      }
    };
  };
}

const doorProcessesAlive = (): number => doorProcesses.filter((d) => !d.exited).length;

// ---------------------------------------------------------------------------
// The owner
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

function makeHost(): Host {
  const one = new PocketHost({
    facts: FACTS,
    tailscale: funnelDeps(),
    door: wrappedDoor(),
    names: fakeNameDeps({ sleep: 'now' })
  });
  hosts.push(one);
  return one;
}

/** What the sheet would draw beside Allow right now. */
function shown(one: Host): PocketAllowInput {
  const s = one.status();
  return { linesRead: s.confirmLines, hashRead: s.confirmHash };
}

/** The bound on turns for one wait, so a walk that hangs fails rather than hangs. */
const MAX_TURNS = 4_000;

async function turnsUntil(done: () => boolean, max = MAX_TURNS): Promise<boolean> {
  for (let i = 0; i < max; i += 1) {
    if (done()) return true;
    await tick();
  }
  return done();
}

/** The owner's queue empty, or an approval waiting (which holds it). */
async function idleOrHeld(one: Host): Promise<boolean> {
  let idle = false;
  void one.idle().then(() => {
    idle = true;
  });
  await turnsUntil(() => idle || ts.approvals.length > 0);
  return idle;
}

// ---------------------------------------------------------------------------
// The walk's own bookkeeping
// ---------------------------------------------------------------------------

/** Action promises not yet settled. */
let inflight = 0;
const throwsSeen = new Map<string, number>();

function track(label: string, work: Promise<unknown>): void {
  inflight += 1;
  void work
    .then(
      () => undefined,
      (err: unknown) => {
        const text = err instanceof Error ? err.message : String(err);
        const key = `${label}: ${text.slice(0, 70)}`;
        throwsSeen.set(key, (throwsSeen.get(key) ?? 0) + 1);
      }
    )
    .finally(() => {
      inflight -= 1;
    });
}

/** Pair one phone through the shipping window, as p3331-return.test.ts does. */
async function pairFlow(one: Host): Promise<void> {
  const offer = await one.beginPairing();
  try {
    const signing = generateKeyPairSync('ed25519');
    const exchange = generateKeyPairSync('x25519');
    const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const spki = (key: KeyObject): string => key.export({ format: 'der', type: 'spki' }).toString('base64url');
    const body = JSON.parse(
      sealPresentationAsPhone(
        offer.payload,
        {
          label: 'Walk iPhone',
          signingKey: spki(signing.publicKey),
          exchangeKey: spki(exchange.publicKey),
          clientKey: spki(client.publicKey)
        },
        signing.privateKey
      ).toString('utf8')
    ) as Parameters<Host['pairing']['present']>[0];
    if (one.pairing.present(body).state !== 'pending') throw new Error('the presentation was not pending');
    const view = one.pairing.view();
    const allowed = one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
    if (!allowed.allowed) throw new Error(`the phone was not allowed: ${allowed.refusal ?? ''}`);
  } finally {
    one.cancelPairing();
  }
}

// ---------------------------------------------------------------------------
// The invariant (SPEC §7.1 I1, I2, I3, I5, §7.2 I6, and the fix round's I7)
// ---------------------------------------------------------------------------

interface Reading {
  state: string;
  funnel: string;
  refused: string | null;
  confirmState: string;
  publicPort: number;
  refusal: string | null;
  doorListening: boolean;
  doorLocalPort: number;
  doorProcesses: number;
  children: Array<{ pid: number; session: { port: number; target: string } | null }>;
  liveRuns: number;
  backend: string;
}

function readWorld(one: Host): Reading {
  const s = one.status();
  const door = bind.pocketDoorStatus();
  return {
    state: s.state,
    funnel: s.funnel.state,
    refused: s.funnel.refused,
    confirmState: s.confirmState,
    publicPort: s.publicPort,
    refusal: s.refusal,
    doorListening: door.listening,
    doorLocalPort: door.localPort,
    doorProcesses: doorProcessesAlive(),
    children: ts.children.filter((c) => !c.closed).map((c) => ({ pid: c.pid, session: ts.sessions.get(c.pid) ?? null })),
    liveRuns: liveFunnelCountForTests(),
    backend: ts.backend
  };
}

/** Every clause the reading breaks, by name; empty when the world is honest. */
function broken(r: Reading, lastWordAllowed: boolean): string[] {
  const out: string[] = [];
  const somethingAlive = r.doorListening || r.doorProcesses > 0 || r.children.length > 0;
  const tryingAgain = r.state === 'opening' && r.funnel === 'restarting';
  if (somethingAlive && !tryingAgain && !(r.state === 'listening' && r.confirmState === 'confirmed')) {
    // Told apart for the reader, counted alike (SPEC §2.1 counts both): a
    // child carries the internet; a door process alone listens on loopback.
    out.push(
      r.children.length > 0
        ? `I1 internet: ${String(r.children.length)} Funnel child alive (door process listening ${String(r.doorListening)}) while main reads ${r.state}/${r.confirmState}`
        : `I1 loopback: the door process alive with no Funnel child while main reads ${r.state}/${r.confirmState}`
    );
  }
  if (r.children.length > 1) out.push(`I2: ${String(r.children.length)} Funnel children alive`);
  if (r.doorProcesses > 1) out.push(`I2: ${String(r.doorProcesses)} door processes alive`);
  if (r.liveRuns !== r.children.length) out.push(`I2: funnel counts ${String(r.liveRuns)} live, the world ${String(r.children.length)}`);
  if (r.state === 'listening') {
    const child = r.children[0];
    if (!r.doorListening || r.children.length !== 1 || child === undefined || child.session === null) {
      out.push('I3: listening without exactly one door process and one publishing child');
    } else if (child.session.port !== r.publicPort || child.session.target !== funnelTarget(r.doorLocalPort)) {
      out.push(`I3: the child publishes ${String(child.session.port)} to ${child.session.target}, main says ${String(r.publicPort)} to the door at ${String(r.doorLocalPort)}`);
    }
  }
  if (ts.held.length === 0) {
    const taken = [8443, 10000, r.publicPort].map((p) => pocketFunnelSentence('port-taken', p));
    if (
      (r.refusal !== null && (taken.includes(r.refusal) || r.refusal === pocketFunnelSentence('ports-taken', 0))) ||
      r.refused === 'port-taken' ||
      r.refused === 'ports-taken'
    ) {
      out.push(`I5: a port is said taken while only the door's own children could hold one (${r.refused ?? 'no word'})`);
    }
  }
  if (r.state === 'off' && somethingAlive) out.push('I6: the switch is off and something still answers');
  if (
    lastWordAllowed &&
    r.state === 'refused' &&
    r.confirmState === 'confirmed' &&
    r.refusal === null &&
    r.refused === null &&
    r.backend === 'Running'
  ) {
    out.push('I7: the last word was an Allow main answered allowed, and the door is shut with nothing said: refused over confirmed, Tailscale running');
  }
  return out;
}

interface Violation {
  press: number;
  clauses: string[];
  lastActions: string[];
  reading: Reading | { threw: string };
  order: string[];
  log: string[];
}

// ---------------------------------------------------------------------------
// Setup and teardown
// ---------------------------------------------------------------------------

function resetWorld(): void {
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  binds.entered = 0;
  binds.stopsEntered = 0;
  Object.assign(ts, {
    backend: 'Running',
    caps: true,
    held: [],
    approvalNext: 0,
    approvals: [],
    children: [],
    statusReads: 0,
    serveReads: 0,
    spawns: 0,
    heldRefusals: 0,
    sleeps: []
  });
  ts.sessions.clear();
  doorProcesses.length = 0;
  order.length = 0;
  logTail.length = 0;
  inflight = 0;
  throwsSeen.clear();
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p33122-walk-'));
  resetWorld();
});

afterEach(async () => {
  releaseApprovals();
  for (const release of ts.sleeps.splice(0)) release();
  for (const one of hosts.splice(0)) {
    try {
      await one.stop();
    } catch {
      /* a stop never throws; this is the teardown */
    }
  }
  await bind.stopPocketDoor();
  for (const c of ts.children) c.close(null, 'SIGKILL');
  for (const d of doorProcesses) d.die();
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  rmSync(userData, { recursive: true, force: true });
});

afterAll(async () => {
  await bind.joinPocketDoor();
  bind.resetPocketDoorForTests();
});

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

type ActionName =
  | 'on'
  | 'off'
  | 'allow'
  | 'allowN'
  | 'allowStale'
  | 'alertsOn'
  | 'alertsOff'
  | 'pair'
  | 'remove'
  | 'recheck'
  | 'onAndAllow'
  | 'allowAndRemove'
  | 'allowAndAlerts'
  | 'childDies'
  | 'doorDies'
  | 'tailscaleStops'
  | 'tailscaleRuns'
  | 'approvalHold'
  | 'approve'
  | 'relaunch'
  | 'forget'
  | 'allowForgetAllow'
  | 'noSettle';

/** The whole alphabet of SPEC §7.2, every member present, with its weight. */
const ALPHABET: ReadonlyArray<readonly [ActionName, number]> = [
  ['on', 8],
  ['off', 4],
  ['allow', 9],
  ['allowN', 7],
  ['allowStale', 3],
  ['alertsOn', 5],
  ['alertsOff', 4],
  ['pair', 4],
  ['remove', 3],
  ['recheck', 4],
  ['onAndAllow', 4],
  ['allowAndRemove', 3],
  ['allowAndAlerts', 3],
  ['childDies', 4],
  ['doorDies', 4],
  ['tailscaleStops', 2],
  ['tailscaleRuns', 3],
  ['approvalHold', 3],
  ['approve', 2],
  ['relaunch', 2],
  ['forget', 2],
  ['allowForgetAllow', 2],
  ['noSettle', 6]
];
const TOTAL_WEIGHT = ALPHABET.reduce((n, [, w]) => n + w, 0);

/** I7's WORDS: the actions that move the switch, the agreement or a hashed field, or relaunch. */
const WORDS: ReadonlySet<ActionName> = new Set<ActionName>([
  'on',
  'off',
  'allow',
  'allowN',
  'allowStale',
  'alertsOn',
  'alertsOff',
  'pair',
  'remove',
  'onAndAllow',
  'allowAndRemove',
  'allowAndAlerts',
  'relaunch',
  'forget',
  'allowForgetAllow'
]);

describe('the walk: one Allow starts the door once, whatever the presses (build/p33122/SPEC.md §7.2)', () => {
  it(
    `holds I1, I2, I3, I5, I6 and I7 at every quiescence over ${String(PRESSES)} presses of seed ${String(SEED)}`,
    async () => {
      const random = mulberry32(SEED);
      const pick = <T>(items: readonly T[]): T => {
        const item = items[Math.floor(random() * items.length)];
        if (item === undefined) throw new Error('pick from nothing');
        return item;
      };
      const draw = (): ActionName => {
        let at = random() * TOTAL_WEIGHT;
        for (const [name, weight] of ALPHABET) {
          at -= weight;
          if (at < 0) return name;
        }
        return 'noSettle';
      };

      let host = makeHost();
      const counts: Record<string, number> = {};
      const skipped: Record<string, number> = {};
      const lastActions: string[] = [];
      const violations: Violation[] = [];
      let checks = 0;
      let restartsReleased = 0;
      let approvalsReleased = 0;
      let notQuiescent = 0;
      let pausedAtApproval = 0;
      let pausedAtRestart = 0;
      let quitLeftDoors = 0;
      /** What the sheet showed before the previous action: `allowStale` presses Allow over it. */
      let shownBefore: PocketAllowInput | null = null;
      let shownLast: PocketAllowInput | null = null;
      /** I7: how many words so far, and whether the last one was an Allow main answered allowed. */
      let words = 0;
      let lastWordAllowed = false;
      /** An Allow word's LAST confirm: it alone may say the last word was allowed, and only while it is the last word. */
      const lastAllow = (name: ActionName, work: Promise<{ allowed: boolean }>): void => {
        const at = words;
        track(
          name,
          work.then((answer) => {
            if (answer.allowed && at === words) lastWordAllowed = true;
            return answer;
          })
        );
      };
      /** Set by `noSettle`: the next action is issued before the queue settles. */
      let unsettled = false;

      const skip = (name: string): string => {
        skipped[name] = (skipped[name] ?? 0) + 1;
        return `${name}:skipped`;
      };

      /** Settle: the queue, the approvals, the restarts (at most five), and every action's own awaits. */
      const quiesce = async (): Promise<boolean> => {
        let restarts = 0;
        for (let round = 0; round < 80; round += 1) {
          const idle = await idleOrHeld(host);
          const approved = releaseApprovals();
          if (approved > 0) {
            approvalsReleased += approved;
            continue;
          }
          if (!idle) continue;
          if (!(await turnsUntil(() => inflight === 0))) continue;
          // p3331-return.test.ts's settle: the queue and every immediate it scheduled.
          let calm = true;
          for (let i = 0; i < 10 && calm; i += 1) {
            calm = await idleOrHeld(host);
            await tick();
          }
          if (!calm || ts.approvals.length > 0 || inflight > 0) continue;
          if (
            host.status().funnel.state === 'restarting' &&
            ts.backend === 'Running' &&
            restarts < 5 &&
            ts.sleeps.length > 0
          ) {
            for (const release of ts.sleeps.splice(0)) release();
            restarts += 1;
            restartsReleased += 1;
            continue;
          }
          return true;
        }
        return false;
      };

      /** A quit, then a new process: see the header. Awaited whole, so nothing of the old owner runs after it. */
      const quitAndRelaunch = async (): Promise<void> => {
        const old = host;
        bind.beginPocketShutdown();
        beginFunnelShutdown();
        await old.stop();
        await turnsUntil(() => inflight === 0);
        await old.idle();
        await joinFunnel();
        await bind.joinPocketDoor();
        hosts.splice(hosts.indexOf(old), 1);
        // THE OLD PROCESS EXITS, and its door processes with it, as an app's
        // utility processes end with the app. One the joins did not end (a
        // fork the quit's first line caught mid-start answers `quitting` and
        // is not `current`, bind.ts `start()`), is counted, then ended here.
        // Its Funnel children are NOT ended here: a quit ends those in
        // `joinFunnel()`, and one it missed is the next launch's orphan.
        for (const door of doorProcesses) {
          if (door.exited) continue;
          quitLeftDoors += 1;
          door.die();
        }
        await turnsUntil(() => false, 5);
        // A new process: both modules as it finds them, and no wait of the old one's left.
        for (const release of ts.sleeps.splice(0)) release();
        bind.resetPocketDoorForTests();
        resetFunnelForTests();
        pruneChildren();
        for (let i = doorProcesses.length - 1; i >= 0; i -= 1) {
          if (doorProcesses[i]?.exited === true) doorProcesses.splice(i, 1);
        }
        host = makeHost();
      };

      const act = async (name: ActionName): Promise<string> => {
        if (WORDS.has(name)) {
          words += 1;
          lastWordAllowed = false;
        }
        switch (name) {
          case 'on':
            track(name, host.setDoor({ on: true }));
            return name;
          case 'off':
            track(name, host.setDoor({ on: false }));
            return name;
          case 'allow':
            lastAllow(name, host.confirmDoor(shown(host)));
            return name;
          case 'allowN': {
            const n = pick([2, 3, 10]);
            const input = shown(host);
            for (let i = 0; i < n - 1; i += 1) track(name, host.confirmDoor(input));
            lastAllow(name, host.confirmDoor(input));
            return `allow×${String(n)}`;
          }
          case 'allowStale':
            track(name, host.confirmDoor(shownBefore ?? shown(host)));
            return name;
          case 'alertsOn':
            track(name, host.setPushAlerts(true));
            return name;
          case 'alertsOff':
            track(name, host.setPushAlerts(false));
            return name;
          case 'pair': {
            const s = host.status();
            if (!s.pairable || s.phones.length >= 3) return skip(name);
            track(name, pairFlow(host));
            return name;
          }
          case 'remove': {
            const phones = host.status().phones;
            if (phones.length === 0) return skip(name);
            track(name, host.removePhone(pick(phones).id));
            return name;
          }
          case 'recheck':
            try {
              host.recheck();
            } catch (err) {
              track(name, Promise.reject(err));
            }
            return name;
          case 'onAndAllow': {
            const input = shown(host);
            track(name, host.setDoor({ on: true }));
            track(name, host.confirmDoor(input));
            return name;
          }
          case 'allowAndRemove': {
            const input = shown(host);
            const phones = host.status().phones;
            const id = phones.length === 0 ? 'nobody' : pick(phones).id;
            if (random() < 0.5) {
              track(name, host.confirmDoor(input));
              track(name, host.removePhone(id));
              return 'allow+remove';
            }
            track(name, host.removePhone(id));
            track(name, host.confirmDoor(input));
            return 'remove+allow';
          }
          case 'allowAndAlerts': {
            const input = shown(host);
            const on = random() < 0.5;
            if (random() < 0.5) {
              track(name, host.confirmDoor(input));
              track(name, host.setPushAlerts(on));
              return `allow+alerts${on ? 'On' : 'Off'}`;
            }
            track(name, host.setPushAlerts(on));
            track(name, host.confirmDoor(input));
            return `alerts${on ? 'On' : 'Off'}+allow`;
          }
          case 'childDies': {
            const alive = ts.children.filter((c) => !c.closed);
            if (alive.length === 0) return skip(name);
            const child = pick(alive);
            logOrder(`child-dies ${String(child.pid)}`);
            child.close(null, 'SIGKILL');
            return name;
          }
          case 'doorDies': {
            const alive = doorProcesses.filter((d) => !d.exited);
            const door = alive.at(-1);
            if (door === undefined) return skip(name);
            door.die();
            return name;
          }
          case 'tailscaleStops':
            ts.backend = 'Stopped';
            return name;
          case 'tailscaleRuns':
            ts.backend = 'Running';
            return name;
          case 'approvalHold':
            ts.approvalNext = 1;
            return name;
          case 'approve': {
            const approve = ts.approvals.shift();
            if (approve === undefined) return skip(name);
            approve();
            return name;
          }
          case 'relaunch': {
            const withAllow = random() < 0.5;
            await quitAndRelaunch();
            track(name, host.openAtLaunch());
            if (withAllow) track(name, host.confirmDoor(shown(host)));
            return withAllow ? 'relaunch+allow' : 'relaunch';
          }
          case 'forget':
            track(name, host.forgetDoor());
            return name;
          case 'allowForgetAllow': {
            // THE FIX ROUND (D16): a stop queued behind the start in flight,
            // and an Allow after it in the same tick.
            const input = shown(host);
            track(name, host.confirmDoor(input));
            track(name, host.forgetDoor());
            lastAllow(name, host.confirmDoor(input));
            return 'allow+forget+allow';
          }
          case 'noSettle':
            unsettled = true;
            return name;
        }
      };

      for (let press = 0; press < PRESSES; press += 1) {
        const name = draw();
        counts[name] = (counts[name] ?? 0) + 1;
        const wasUnsettled = unsettled;
        unsettled = false;
        shownBefore = shownLast;
        shownLast = shown(host);
        const label = await act(name);
        lastActions.push(`${String(press)} ${label}`);
        if (lastActions.length > 10) lastActions.shift();
        // `noSettle` itself, or the action straight after it: the next one is
        // issued before the queue settles, a few turns apart at most.
        if (unsettled || (wasUnsettled && name !== 'noSettle' && random() < 0.5)) {
          const turns = Math.floor(random() * 4);
          for (let i = 0; i < turns; i += 1) await tick();
          continue;
        }
        // THE PAUSE POINTS: a start waiting on Tailscale's approval, or a
        // restart armed and waiting its turn, is a place the next press can
        // land (SPEC §2.2 rows 5, 9 to 11). The walk sometimes leaves it
        // waiting and issues the next action there; `approve` and the next
        // quiescence release it. Nothing is checked until it has settled.
        await idleOrHeld(host);
        if (ts.approvals.length > 0 && random() < 0.6) {
          pausedAtApproval += 1;
          continue;
        }
        if (
          ts.approvals.length === 0 &&
          ts.sleeps.length > 0 &&
          host.status().funnel.state === 'restarting' &&
          random() < 0.4
        ) {
          pausedAtRestart += 1;
          continue;
        }
        const quiet = await quiesce();
        if (!quiet) notQuiescent += 1;
        checks += 1;
        let reading: Reading | null = null;
        let clauses: string[];
        try {
          reading = readWorld(host);
          clauses = broken(reading, lastWordAllowed);
          if (!quiet) clauses.push('the walk could not reach quiescence: a job never finished');
        } catch (err) {
          clauses = [`status() threw: ${err instanceof Error ? err.message : String(err)}`];
        }
        if (clauses.length > 0) {
          violations.push({
            press,
            clauses,
            lastActions: [...lastActions],
            reading: reading ?? { threw: clauses[0] ?? '' },
            order: order.slice(-15),
            log: logTail.slice(-8)
          });
        }
      }

      const line =
        `[p33122 walk] seed ${String(SEED)} presses ${String(PRESSES)} checks ${String(checks)} ` +
        `violations ${String(violations.length)} actions ${JSON.stringify(counts)}`;
      say(line);
      say(
        `[p33122 walk] world forks ${String(binds.entered)} spawns ${String(ts.spawns)} status reads ` +
          `${String(ts.statusReads)} held-port refusals ${String(ts.heldRefusals)} restarts released ` +
          `${String(restartsReleased)} approvals released ${String(approvalsReleased)} paused at an approval ` +
          `${String(pausedAtApproval)} paused at a restart ${String(pausedAtRestart)} door processes a quit left ` +
          `${String(quitLeftDoors)} not quiescent ` +
          `${String(notQuiescent)} skipped ${JSON.stringify(skipped)}`
      );
      say(`[p33122 walk] throws ${JSON.stringify(Object.fromEntries(throwsSeen))}`);
      const byClause: Record<string, number> = {};
      const firstOfEach = new Map<string, Violation>();
      for (const v of violations) {
        for (const clause of v.clauses) {
          const kind = clause.slice(0, Math.max(0, clause.indexOf(':'))) || clause;
          byClause[kind] = (byClause[kind] ?? 0) + 1;
          if (!firstOfEach.has(kind)) firstOfEach.set(kind, v);
        }
      }
      say(`[p33122 walk] clauses ${JSON.stringify(byClause)} first at ${violations[0] === undefined ? 'none' : String(violations[0].press)}`);
      if (firstOfEach.size > 0) {
        say(`[p33122 walk] first of each clause ${JSON.stringify(Object.fromEntries(firstOfEach), null, 1)}`);
      }
      const firstThree = violations.slice(0, 3);
      if (firstThree.length > 0) say(`[p33122 walk] first violations ${JSON.stringify(firstThree, null, 1)}`);

      // The walk must have walked: every member of the alphabet drawn, and the
      // door published and checked many times over.
      for (const [name] of ALPHABET) expect(counts[name] ?? 0, `${name} was drawn`).toBeGreaterThan(0);
      expect(checks, 'quiescent checks').toBeGreaterThan(PRESSES / 4);
      expect(ts.spawns, 'Funnel children spawned').toBeGreaterThan(0);
      expect(violations.length, `${line}\n${JSON.stringify(firstThree, null, 1)}`).toBe(0);
    },
    WALK_TIMEOUT_MS
  );
});
