/**
 * A return to the window checks again (Phase 333.1, build/p3331/SPEC.md D2 to
 * D9, D34, and r2 §Attack F18 to F22).
 *
 * WHAT THIS FILE HOLDS. Main's one predicate for "a return would re-check this
 * refusal", `rechecks()`, driven clause by clause through `status().rechecks`
 * and through `pocket:recheck` itself; the windows each clause exists for,
 * every one driven rather than read: a return during a start's approval wait
 * (c), inside a restart between its timer and its own count (d), while a
 * restart is armed after a confirm's start set the funnel idle (e), behind a
 * restart that then publishes (r2 F19), behind a held close and then a Remove
 * and a confirm's start (r2 F20), after an off press Tortie could not save (r2
 * F18), and D34 as the SPEC writes it, a confirmed door relaunched with
 * Tailscale stopped and its phone Removed, where only D8 refuses; the drop of
 * a second return (D9, D10); the stat with no program, which sweeps nothing,
 * and a program at another pinned path (D7b); a start that refused
 * `not-approved`, with and without Funnel's two capabilities, and the three
 * things that clear the one fork a press (D8b, D9); the unconfirmed read that
 * never moves a stored port and never draws Allow over a held one (D9,
 * §Attack F3); step 1's state for every read (D2); the account, drawn only
 * (D4); the start's refusal word at its sites (D5); and the admin link, kept
 * only when Tortie would open it and dropped by every press that starts again
 * (D6).
 *
 * `build/ablation-p313.mjs` runs this file in its clone as its `return` check,
 * so every test here must pass on the shipping source and stay deterministic:
 * a wait of a second or more is released by hand, never slept.
 *
 * THE WORLD IS switch-queue.test.ts's: the SHIPPING owner over the REAL
 * `./bind.ts`, its door process run in this process (`./door/in-process.ts`,
 * the listener the utility process runs, on loopback TLS), and Funnel an
 * in-memory stand-in behind `FunnelDeps` that publishes a foreground session
 * when its child starts and deletes it when the child is signalled. The bind
 * wrapper below counts the forks and can HOLD a stop, which is how a window
 * inside an `unpublish()` is placed rather than guessed. Every count here is
 * of what the stand-in itself saw: its execs, its spawns, the forks that
 * reached the real bind.
 *
 * NOTHING HERE BINDS ANYTHING BUT 127.0.0.1:0, and no program is executed.
 * Waits of a second or more are held and released by hand. Every door is
 * stopped and every child ended in `afterEach`, whatever happened.
 */

import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketStatus } from '@shared/ipc/pocket';
import type { FunnelChild, FunnelDeps, FunnelResolution } from '../funnel';
import type { PocketFacts } from '../routes';
import { fakeNameDeps } from './dns-fixtures';

let userData = '';
const MARKER = '--tortie-p3331-return-test--';
/** The seal refuses every write while this is set (r2 F18: an off Tortie could not save). */
const seal = { fail: false };

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: { openExternal: async () => undefined },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => {
      if (seal.fail) throw new Error('p3331: the seal refused this write');
      return Buffer.from(`${MARKER}${text}`, 'utf8');
    },
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

/** Every log line, kept, so a test can say no line names the account. */
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
 * How many forks reached the REAL bind, and a stop the test can HOLD: while
 * `stopHold` is set, every stop waits on it before the real one runs. While
 * `refuseStart` is set, a start is answered with it instead, the way the door
 * process refuses with its own sentence.
 */
const binds = {
  entered: 0,
  stopsEntered: 0,
  stopHold: null as Promise<void> | null,
  refuseStart: null as { ok: false; reason: 'bind-failed'; sentence: string } | null
};
vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    startPocketDoor: async (input: Parameters<typeof real.startPocketDoor>[0]) => {
      binds.entered += 1;
      if (binds.refuseStart !== null) return binds.refuseStart;
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
const { phoneIdOf, pocketStorePath, readPocketStore, sealPresentationAsPhone } = await import('../pairing');
const bind = await import('../bind');
const { inProcessDoor } = await import('../door/in-process');
const { beginFunnelShutdown, readFunnelRecord, resetFunnelForTests, writeFunnelRecord } = await import('../funnel');
const { POCKET_FUNNEL_SENTENCES, pocketFunnelSentence } = await import('@shared/ipc/pocket');

type Host = InstanceType<typeof PocketHost>;

// ---------------------------------------------------------------------------
// Tailscale, in memory
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const ELSEWHERE = '/opt/homebrew/bin/tailscale';
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
    // A child that ignores SIGINT holds its stop on the stop's own wait.
    if (signal === 'SIGINT' && ts.ignoreInt) return true;
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
  /** What `resolve()` answers; null is the stand-in behind a development override. */
  resolution: null as FunnelResolution | null,
  resolves: 0,
  backend: 'Running',
  /** Every exec answers ENOENT, as a wrapper whose interpreter is gone does. */
  enoent: false,
  caps: true,
  funnelPortsCap: null as string | null,
  users: null as unknown,
  uid: 1 as unknown,
  tailnet: TAILNET,
  /** Ports his own Serve holds at the top level. */
  held: [] as number[],
  /** The stderr every funnel start fails with, or null. */
  refuse: null as string | null,
  approval: 'none' as 'none' | 'wait' | 'exit0' | 'exit0-elsewhere',
  ignoreInt: false,
  approve: null as null | (() => void),
  sessions: new Map<number, { port: number; target: string }>(),
  children: [] as Child[],
  execs: [] as { file: string; args: string[] }[],
  spawns: 0,
  /** Every `ps` the orphan sweep asked: a sweep over a planted record asks one. */
  psCalls: 0,
  holdExec: null as Promise<void> | null,
  sleeps: [] as HeldSleep[],
  nextPid: 80_000
};

function statusText(): string {
  const caps: Record<string, null> = ts.caps ? { https: null, funnel: null } : {};
  if (ts.funnelPortsCap !== null) caps[ts.funnelPortsCap] = null;
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
    resolve: () => {
      ts.resolves += 1;
      return ts.resolution ?? { resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true };
    },
    exec: async (file, args) => {
      ts.execs.push({ file, args: [...args] });
      if (ts.holdExec !== null) await ts.holdExec;
      if (ts.enoent) return { stdout: '', stderr: '', code: null, failed: true, errno: 'ENOENT' };
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
        if (ts.approval === 'exit0' || ts.approval === 'exit0-elsewhere') {
          child.out(`         ${ts.approval === 'exit0' ? ADMIN_URL : 'https://example.invalid/f/funnel'}\n`);
          child.close(0);
          return;
        }
        if (ts.approval === 'wait') {
          child.out(`\nTo approve, visit:\n\n         ${ADMIN_URL}\n\n`);
          ts.approve = () => {
            ts.approve = null;
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
      ts.psCalls += 1;
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
    // how a restart's timer and a stop's SIGINT wait are placed by hand.
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
const releasers: Array<() => void> = [];

function hostOn(beforeOpen?: () => Promise<unknown>): Host {
  const one = new PocketHost({
    facts: FACTS,
    tailscale: funnelDeps(),
    door: inProcessDoor(),
    names: fakeNameDeps({ sleep: 'now' }),
    ...(beforeOpen !== undefined ? { beforeOpen } : {})
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

/** A hold the test releases, released in `afterEach` whatever happened. */
function hold(): { promise: Promise<void>; release: () => void } {
  let release = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  releasers.push(() => release());
  return { promise, release: () => release() };
}

const statusReads = (): number => ts.execs.filter((e) => e.args[0] === 'status').length;
const calls = (): number => ts.execs.length + ts.spawns;
const alive = (): number => ts.children.filter((c) => !c.closed).length;
const lastChild = (): Child => {
  const child = ts.children.at(-1);
  if (child === undefined) throw new Error('no child was spawned');
  return child;
};

/** The sheet's order: the switch, the read, Allow, listening. */
async function onAndConfirmed(one: Host): Promise<void> {
  await one.setDoor({ on: true });
  await settle(one);
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

/**
 * A CONFIRMED door whose last read found Tailscale stopped: the switch off and
 * on again with Tailscale stopped. The shape every clause below is one step
 * from, and in which a return re-checks.
 */
async function confirmedButStopped(one: Host): Promise<void> {
  await onAndConfirmed(one);
  ts.backend = 'Stopped';
  await one.setDoor({ on: false });
  await settle(one);
  await one.setDoor({ on: true });
  await settle(one);
  const s = one.status();
  expect(s).toMatchObject({ state: 'refused', confirmState: 'confirmed', tailscale: 'stopped', rechecks: true });
  expect(s.funnel).toMatchObject({ state: 'idle', refused: 'not-running' });
}

/**
 * Pair one phone through the shipping window on a published door, once main
 * says a code may show, the way switch-queue.test.ts pairs one, and answer
 * its id. The agreement the window records holds the phone, so a Remove
 * withdraws it.
 */
async function pairPhone(one: Host): Promise<string> {
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
        { label: 'Return iPhone', signingKey, exchangeKey: spki(exchange.publicKey), clientKey: spki(client.publicKey) },
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

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p3331-return-'));
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  seal.fail = false;
  binds.entered = 0;
  binds.stopsEntered = 0;
  binds.stopHold = null;
  binds.refuseStart = null;
  Object.assign(ts, {
    resolution: null,
    resolves: 0,
    backend: 'Running',
    enoent: false,
    caps: true,
    funnelPortsCap: null,
    users: null,
    uid: 1,
    tailnet: TAILNET,
    held: [],
    refuse: null,
    approval: 'none',
    ignoreInt: false,
    approve: null,
    children: [],
    execs: [],
    spawns: 0,
    psCalls: 0,
    holdExec: null,
    sleeps: []
  });
  ts.sessions.clear();
  logged.length = 0;
});

afterEach(async () => {
  binds.stopHold = null;
  binds.refuseStart = null;
  ts.holdExec = null;
  ts.ignoreInt = false;
  seal.fail = false;
  for (const release of releasers.splice(0)) release();
  for (const one of hosts.splice(0)) {
    try {
      await one.stop();
    } catch {
      /* a stop never throws; this is the teardown */
    }
  }
  for (const s of ts.sleeps) s.release();
  await bind.stopPocketDoor();
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
// rechecks(), one clause at a time (D7)
// ---------------------------------------------------------------------------

describe('rechecks(): every clause of D7 refuses on its own', () => {
  it('holds in the shape a return exists for, and the return then reads and starts exactly as launch does', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    const reads = statusReads();
    const forks = binds.entered;
    const answered = one.recheck();
    // Answered at once, before anything ran.
    expect(answered.state).toBe('opening');
    await settle(one);
    expect(statusReads() - reads).toBe(1);
    expect(binds.entered - forks).toBe(1);
    expect(one.status()).toMatchObject({ state: 'listening', tailscale: 'ready', rechecks: false });
  });

  it('(a) the switch off: a return reads nothing', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    await one.setDoor({ on: false });
    await settle(one);
    ts.backend = 'Running';
    const before = calls();
    expect(one.status().rechecks).toBe(false);
    expect(one.recheck().state).toBe('off');
    await settle(one);
    expect(calls()).toBe(before);
  });

  it('(b) published: a return reads nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const before = calls();
    expect(one.status().rechecks).toBe(false);
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
  });

  it('(f) the quit: a return reads nothing once the quit has begun', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    beginFunnelShutdown();
    const before = calls();
    expect(one.status().rechecks).toBe(false);
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
  });

  it('(f) the door’s half of the quit on its own: a return reads nothing once beginPocketShutdown has run', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    bind.beginPocketShutdown();
    const before = calls();
    expect(one.status().rechecks).toBe(false);
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
    expect(binds.entered).toBe(1);
  });

  it('(g) only the read’s three words and a start’s not-approved: never shields-up, port-taken, busy or failed', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    for (const [backend, word, rechecks] of [
      ['NeedsLogin', 'signed-out', true],
      ['NeedsMachineAuth', 'signed-out', true],
      ['Stopped', 'not-running', true],
      ['Weird', 'unreadable', false]
    ] as const) {
      ts.backend = backend;
      await one.setDoor({ on: true });
      await settle(one);
      expect(one.status().funnel.refused, backend).toBe(word);
      expect(one.status().rechecks, backend).toBe(rechecks);
    }
    ts.backend = 'Running';
    ts.enoent = true;
    await one.setDoor({ on: true });
    await settle(one);
    // The stat found a program and the READ found none (a wrapper whose
    // interpreter is gone): step 1 says missing, and Get Tailscale is listed.
    expect(one.status()).toMatchObject({ tailscale: 'missing', rechecks: true, setupActions: ['get-tailscale'] });
    expect(one.status().funnel.refused).toBe('no-tailscale');
    ts.enoent = false;
    // The start's own refusals: only not-approved is re-checked.
    for (const [stderr, word, rechecks] of [
      ['Unable to turn on Funnel while shields-up is enabled', 'shields-up', false],
      ['Another client is changing the serve config', 'busy', false],
      ['something nobody expected', 'failed', false],
      ['Funnel not available; "funnel" node attribute not set.', 'not-approved', true]
    ] as const) {
      ts.refuse = stderr;
      await one.setDoor({ on: true });
      await settle(one);
      const s = one.status();
      expect(s.funnel.refused, word).toBe(word);
      expect(s.rechecks, word).toBe(rechecks);
      expect(s.refusal).toBe(POCKET_FUNNEL_SENTENCES[word]);
    }
    ts.refuse = null;
    // The confirmed port held by another serve, found by a start that is not a
    // press (the launch's): Tailscale's word, and not re-checked.
    ts.held = [8443];
    await one.start();
    await settle(one);
    expect(one.status().funnel.refused).toBe('port-taken');
    expect(one.status().rechecks).toBe(false);
    // Both ports held, found by a press: the read's word, and not re-checked.
    ts.held = [8443, 10000];
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().funnel.refused).toBe('ports-taken');
    expect(one.status().rechecks).toBe(false);
    // shields-up: a return makes ZERO calls, whatever Tailscale does meanwhile.
    ts.held = [];
    ts.refuse = 'Unable to turn on Funnel while shields-up is enabled';
    await one.setDoor({ on: true });
    await settle(one);
    ts.refuse = null;
    const before = calls();
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
  });

  it('(h) unconfirmed fields re-check only in the run whose press started the setup (D8, D34)', async () => {
    const first = hostOn();
    await confirmedButStopped(first);
    // The person quits Tortie with the door on: a relaunch reads at launch.
    await first.stop();
    hosts.splice(hosts.indexOf(first), 1);
    const one = hostOn();
    expect(await one.openAtLaunch()).toBe('refused');
    await settle(one);
    expect(one.status()).toMatchObject({ confirmState: 'confirmed', tailscale: 'stopped', rechecks: true });
    // A press that moves a hashed field withdraws the agreement and is no
    // switch press, so this run never pressed the switch on.
    await one.setPushAlerts(true);
    await settle(one);
    expect(one.status().confirmState).not.toBe('confirmed');
    expect(one.status().funnel.refused).toBe('not-running');
    expect(one.status().rechecks).toBe(false);
    ts.backend = 'Running';
    const before = calls();
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
    // Try again is a press, and it reads.
    await one.setDoor({ on: true });
    await settle(one);
    expect(statusReads()).toBeGreaterThan(0);
    expect(calls()).toBeGreaterThan(before);
  });

  it('(h) D34 as written: a confirmed door relaunched with Tailscale stopped, then Remove of its phone, then Tailscale running: only D8 refuses the return', async () => {
    const first = hostOn();
    await onAndConfirmed(first);
    const phoneId = await pairPhone(first);
    expect(first.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(first.status().phones.map((p) => p.id)).toEqual([phoneId]);
    // The person quits Tortie with the door on and a phone paired.
    await first.stop();
    hosts.splice(hosts.indexOf(first), 1);
    ts.backend = 'Stopped';
    const one = hostOn();
    expect(await one.openAtLaunch()).toBe('refused');
    await settle(one);
    expect(one.status()).toMatchObject({ confirmState: 'confirmed', tailscale: 'stopped', rechecks: true });
    // Remove withdraws the agreement and clears no refusal word (§15 M7).
    await one.removePhone(phoneId);
    await settle(one);
    const s = one.status();
    expect(s.phones).toEqual([]);
    expect(s.confirmState).not.toBe('confirmed');
    expect(s.funnel.refused).toBe('not-running');
    // Unconfirmed, a word in the return set, and no switch press in this run.
    expect(s.rechecks).toBe(false);
    ts.backend = 'Running';
    const before = { execs: ts.execs.length, spawns: ts.spawns, forks: binds.entered, ps: ts.psCalls };
    for (let i = 0; i < 3; i += 1) one.recheck();
    await settle(one);
    // ZERO calls. This is the reading that goes red only with BOTH of D8's
    // questions gone, the one in rechecks() and the job's own (SPEC §6.1 arms
    // 2 and 2b): either one alone still refuses.
    expect({ execs: ts.execs.length, spawns: ts.spawns, forks: binds.entered, ps: ts.psCalls }).toEqual(before);
    // Try again is a press, and it reads; the lines, never a start.
    await one.setDoor({ on: true });
    await settle(one);
    expect(ts.execs.length).toBeGreaterThan(before.execs);
    expect(binds.entered).toBe(before.forks);
  });
});

// ---------------------------------------------------------------------------
// The windows, each the one clause that refuses it
// ---------------------------------------------------------------------------

describe('the windows each clause exists for', () => {
  it('(c) a return during a start’s approval wait reads nothing, and the approval still publishes', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'wait';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await until(() => one.status().funnel.state === 'approval', 'the start waits on its approval');
    const before = calls();
    const child = lastChild();
    for (let i = 0; i < 5; i += 1) expect(one.recheck().funnel.state).toBe('approval');
    await tick();
    expect(calls()).toBe(before);
    expect(child.closed).toBe(false);
    ts.caps = true;
    ts.approve?.();
    await settle(one);
    expect(one.status().state).toBe('listening');
  });

  it('(c) a second return while the first is queued is dropped, not queued: twenty in a row while its read is held make one read', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    const held = hold();
    ts.holdExec = held.promise;
    const reads = statusReads();
    expect(one.recheck().state).toBe('opening');
    await until(() => statusReads() === reads + 1, 'the first return’s read began');
    for (let i = 0; i < 20; i += 1) {
      const s = one.recheck();
      // Answered at once, each time.
      expect(s.state).toBe('opening');
      expect(s.rechecks).toBe(false);
    }
    // The first return finds Tailscale signed out, which a return re-checks:
    // a second job, had one been queued, would read again.
    ts.backend = 'NeedsLogin';
    ts.holdExec = null;
    held.release();
    await settle(one);
    expect(statusReads() - reads).toBe(1);
    expect(one.status()).toMatchObject({ state: 'refused', tailscale: 'signed-out', rechecks: true });
  });

  it('(d) a return inside a restart, between its timer and its own count, reads nothing (the restart’s read answering signed-out)', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    // The child stops unasked while Tailscale is stopped: the first restart
    // reads not-running, which is retried, and arms the next one.
    ts.backend = 'Stopped';
    lastChild().close(1);
    await settle(one);
    expect(one.status().funnel.state).toBe('restarting');
    releaseNewest(2_000);
    await settle(one);
    expect(one.status().funnel).toMatchObject({ state: 'restarting', refused: 'not-running' });
    // The next restart's timer fires, and its job is held inside unpublish(),
    // before its opening += 1.
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    releaseNewest(4_000);
    await until(() => binds.stopsEntered > stops, 'the restart reached its unpublish');
    expect(one.status().funnel.state).toBe('restarting');
    expect(one.status().rechecks).toBe(false);
    const reads = statusReads();
    one.recheck();
    ts.backend = 'NeedsLogin';
    binds.stopHold = null;
    gate.release();
    await settle(one);
    // The restart's own read, and nothing of the return's.
    expect(statusReads() - reads).toBe(1);
    expect(one.status()).toMatchObject({ state: 'refused', tailscale: 'signed-out' });
    expect(one.status().funnel.state).toBe('idle');
  });

  it('(e) a return while a restart is armed and a confirm’s start set the funnel idle reads nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    ts.backend = 'Stopped';
    lastChild().close(1);
    await settle(one);
    expect(one.status().funnel.state).toBe('restarting');
    // Allow, while the restart's timer is armed: its start reads not-running
    // and leaves the funnel idle; start() cancels no restart.
    await allow(one);
    await settle(one);
    expect(one.status().funnel).toMatchObject({ state: 'idle', refused: 'not-running' });
    expect(one.status().rechecks).toBe(false);
    ts.backend = 'Running';
    const before = calls();
    one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// r2's windows, over the in-process door (§Attack F18 to F20)
// ---------------------------------------------------------------------------

describe('r2’s windows: nothing a return runs outlives the person’s off, or lands beside another start', () => {
  it('F18: after an off press Tortie could not save, a return reads nothing, forks nothing and spawns nothing; the next on press reads', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    seal.fail = true;
    await expect(one.setDoor({ on: false })).rejects.toThrow(/could not save the switch/);
    await settle(one);
    // The held store still says on: the precondition r2 measured.
    expect(one.status()).toMatchObject({ state: 'refused', confirmState: 'confirmed' });
    expect(one.status().funnel.state).toBe('idle');
    seal.fail = false;
    ts.backend = 'Running';
    const reads = statusReads();
    const forks = binds.entered;
    const spawns = ts.spawns;
    expect(one.status().rechecks).toBe(false);
    one.recheck();
    await settle(one);
    expect(statusReads()).toBe(reads);
    expect(binds.entered).toBe(forks);
    expect(ts.spawns).toBe(spawns);
    expect(alive()).toBe(0);
    await one.setDoor({ on: true });
    await settle(one);
    expect(statusReads()).toBeGreaterThan(reads);
    expect(one.status().state).toBe('listening');
  });

  /** Published, then the child stops unasked with Tailscale stopped, and Allow while the restart is armed. */
  async function restartBehindAConfirm(one: Host): Promise<void> {
    await onAndConfirmed(one);
    ts.backend = 'Stopped';
    lastChild().close(1);
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status().funnel).toMatchObject({ state: 'idle', refused: 'not-running' });
  }

  it('F19: a return queued behind a restart that publishes runs nothing: one child, listening, no port-taken', async () => {
    const one = hostOn();
    await restartBehindAConfirm(one);
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    releaseNewest(2_000);
    await until(() => binds.stopsEntered > stops, 'the restart’s timer fired and its job reached unpublish');
    // The funnel is the idle the confirm's start left, and nothing is armed:
    // only the job's own second question stops the return now.
    expect(one.status().rechecks).toBe(true);
    one.recheck();
    ts.backend = 'Running';
    const forks = binds.entered;
    binds.stopHold = null;
    gate.release();
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(alive()).toBe(1);
    expect(ts.sessions.size).toBe(1);
    const s = one.status();
    expect(s.state).toBe('listening');
    expect(s.refusal).toBeNull();
    expect(logged.some((l) => l.includes('port-taken'))).toBe(false);
  });

  it('F19, the restart reading signed-out: the return’s job reads once, after it', async () => {
    const one = hostOn();
    await restartBehindAConfirm(one);
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    releaseNewest(2_000);
    await until(() => binds.stopsEntered > stops, 'the restart’s timer fired and its job reached unpublish');
    one.recheck();
    ts.backend = 'NeedsLogin';
    const reads = statusReads();
    binds.stopHold = null;
    gate.release();
    await settle(one);
    expect(statusReads() - reads).toBe(2);
    expect(one.status()).toMatchObject({ state: 'refused', tailscale: 'signed-out' });
    expect(alive()).toBe(0);
  });

  it('F20: a return queued behind a held close, then a hashed press and Allow before it runs: it runs nothing, and the confirm’s own start publishes once', async () => {
    const one = hostOn();
    // A start that refused not-approved WITH Funnel's capabilities present:
    // re-checked, and the read itself refuses nothing, so Allow can be drawn.
    ts.refuse = 'Funnel not available; "funnel" node attribute not set.';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'refused', rechecks: true, confirmable: true });
    ts.refuse = null;
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    const closing = one.stop();
    await until(() => binds.stopsEntered > stops, 'the close holds the queue');
    one.recheck();
    // Two presses before the return runs: one that moves a hashed field (the
    // agreement is withdrawn, as Remove does), then Allow, which queues a start.
    void one.setPushAlerts(true);
    await tick();
    await allow(one);
    const forks = binds.entered;
    const spawns = ts.spawns;
    binds.stopHold = null;
    gate.release();
    await closing;
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(ts.spawns - spawns).toBe(1);
    expect(alive()).toBe(1);
    expect(one.status()).toMatchObject({ state: 'listening', refusal: null });
  });

  it('F20 as written, by a Remove: a return queued behind a held close, then Remove of the phone and Allow before it runs: it runs nothing, and the confirm’s own start publishes once', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phoneId = await pairPhone(one);
    // The next start refuses not-approved WITH Funnel's capabilities present:
    // re-checked, and the read refuses nothing, so Allow can be drawn again.
    ts.refuse = 'Funnel not available; "funnel" node attribute not set.';
    await one.setDoor({ on: false });
    await settle(one);
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ state: 'refused', confirmState: 'confirmed', rechecks: true, confirmable: true });
    ts.refuse = null;
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    const closing = one.stop();
    await until(() => binds.stopsEntered > stops, 'the close holds the queue');
    expect(one.recheck().state).toBe('opening');
    // Two presses before the return runs: Remove, which withdraws the
    // agreement, then Allow over the fields it left, which queues a start.
    const removing = one.removePhone(phoneId);
    await tick();
    expect(one.status().confirmState).not.toBe('confirmed');
    await allow(one);
    const forks = binds.entered;
    const spawns = ts.spawns;
    binds.stopHold = null;
    gate.release();
    await closing;
    await removing;
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(ts.spawns - spawns).toBe(1);
    expect(alive()).toBe(1);
    expect(one.status()).toMatchObject({ state: 'listening', refusal: null, phones: [] });
    expect(logged.some((l) => l.includes('port-taken'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// What a return may run (D7b), and how often it may start the door (D8b)
// ---------------------------------------------------------------------------

describe('what a return may run, and how often it may start the door', () => {
  it('D7b: with no program to read, a return sweeps nothing and reads nothing, and rechecks still holds', async () => {
    const one = hostOn();
    ts.resolution = { resolution: { path: null, source: 'missing', detail: '' }, overrideSet: false };
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ tailscale: 'missing', rechecks: true });
    expect(one.status().setupActions).toEqual(['get-tailscale']);
    // A record a crashed run left, planted AFTER the press's own sweep: a
    // sweep over it asks `ps` once and deletes it, so a sweep is SEEN.
    const record = join(userData, 'gmux', 'pocket-funnel', 'record.json');
    writeFunnelRecord(record, {
      pid: 4_242,
      lstart: 's4242',
      command: `${PROGRAM} funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:50001`,
      argv: [],
      at: 0
    });
    expect(readFunnelRecord(record)).not.toBeNull();
    const before = { execs: ts.execs.length, spawns: ts.spawns, forks: binds.entered, ps: ts.psCalls };
    for (let i = 0; i < 5; i += 1) {
      // Nothing is queued, so nothing is drawn as checking.
      expect(one.recheck().state).toBe('refused');
    }
    await settle(one);
    expect({ execs: ts.execs.length, spawns: ts.spawns, forks: binds.entered, ps: ts.psCalls }).toEqual(before);
    expect(existsSync(record)).toBe(true);
    // The install finished: the next return sweeps once, reads once and draws the lines.
    ts.resolution = null;
    one.recheck();
    await settle(one);
    expect(ts.psCalls - before.ps).toBe(1);
    expect(existsSync(record)).toBe(false);
    expect(statusReads()).toBe(1);
    expect(one.status()).toMatchObject({ tailscale: 'ready', confirmable: true, confirmState: 'never' });
    expect(binds.entered).toBe(0);
  });

  it('D7b: on confirmed fields, a program at ANOTHER pinned path runs on Try again and never on a return', async () => {
    const first = hostOn();
    await onAndConfirmed(first);
    await first.stop();
    hosts.splice(hosts.indexOf(first), 1);
    // Relaunched with the allowed program gone: the launch read refuses no-tailscale.
    ts.resolution = { resolution: { path: null, source: 'missing', detail: '' }, overrideSet: false };
    const one = hostOn();
    await one.openAtLaunch();
    await settle(one);
    expect(one.status()).toMatchObject({ confirmState: 'confirmed', tailscale: 'missing', rechecks: true });
    // A Tailscale appears at another pinned path.
    ts.resolution = { resolution: { path: ELSEWHERE, source: 'pinned', detail: ELSEWHERE }, overrideSet: false };
    const runsOf = (file: string): number => ts.execs.filter((e) => e.file === file).length;
    for (let i = 0; i < 3; i += 1) one.recheck();
    await settle(one);
    expect(runsOf(ELSEWHERE)).toBe(0);
    await one.setDoor({ on: true });
    await settle(one);
    expect(runsOf(ELSEWHERE)).toBeGreaterThan(0);
    // The moved program is a moved field: the lines, never a start.
    expect(one.status().confirmState).toBe('changed');
    expect(binds.entered).toBe(1);
  });

  it('D7b, asked again in the job: a program that moved while the return waited its turn is not run', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    const gate = hold();
    binds.stopHold = gate.promise;
    const stops = binds.stopsEntered;
    const closing = one.stop();
    await until(() => binds.stopsEntered > stops, 'the close holds the queue');
    expect(one.recheck().state).toBe('opening');
    ts.resolution = { resolution: { path: ELSEWHERE, source: 'pinned', detail: ELSEWHERE }, overrideSet: false };
    binds.stopHold = null;
    gate.release();
    await closing;
    await settle(one);
    expect(ts.execs.filter((e) => e.file === ELSEWHERE)).toEqual([]);
    expect(binds.entered).toBe(1);
  });

  it('a read that shows Funnel’s two capabilities drops the admin link, even when the start that follows refuses another way', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'exit0';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    ts.caps = true;
    ts.approval = 'none';
    ts.refuse = 'Another client is changing the serve config';
    one.recheck();
    await settle(one);
    const s = one.status();
    expect(s.funnel.refused).toBe('busy');
    expect(s.setupActions).not.toContain('copy-admin-link');
  });

  it('after not-approved with the read still asking approval: no fork and no spawn, Copy link kept; after the approval, one of each and the link dropped', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'exit0';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    let s = one.status();
    expect(s.funnel.refused).toBe('not-approved');
    expect(s.rechecks).toBe(true);
    expect(s.setupActions).toContain('copy-admin-link');
    const forks = binds.entered;
    const spawns = ts.spawns;
    const reads = statusReads();
    one.recheck();
    await settle(one);
    expect(statusReads() - reads).toBe(1);
    expect(binds.entered).toBe(forks);
    expect(ts.spawns).toBe(spawns);
    s = one.status();
    expect(s.setupActions).toContain('copy-admin-link');
    expect(s.rechecks).toBe(true);
    // The admin approved: Funnel's two capabilities are there.
    ts.caps = true;
    ts.approval = 'none';
    one.recheck();
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(ts.spawns - spawns).toBe(1);
    s = one.status();
    expect(s.state).toBe('listening');
    expect(s.setupActions).not.toContain('copy-admin-link');
    // The counted start cleared the start's word with its sentence: a door
    // that then stops by itself is never drawn as waiting on an admin.
    lastChild().close(1);
    await settle(one);
    expect(one.status().funnel).toMatchObject({ state: 'restarting', refused: null });
  });

  it('D8b: a start refusing not-approved WITH the capabilities present starts once from a return, then twenty returns make no call, and Try again clears it', async () => {
    const one = hostOn();
    ts.refuse = 'Funnel not available; "funnel" node attribute not set.';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status()).toMatchObject({ rechecks: true, setupActions: [] });
    const forks = binds.entered;
    const spawns = ts.spawns;
    one.recheck();
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(ts.spawns - spawns).toBe(1);
    expect(one.status().rechecks).toBe(false);
    const before = calls();
    for (let i = 0; i < 20; i += 1) one.recheck();
    await settle(one);
    expect(calls()).toBe(before);
    await one.setDoor({ on: true });
    await settle(one);
    expect(binds.entered - forks).toBe(2);
    expect(one.status().rechecks).toBe(true);
    // A confirm that records clears the mark too: the return after it is a new one.
    one.recheck();
    await settle(one);
    expect(binds.entered - forks).toBe(3);
    expect(one.status().rechecks).toBe(false);
    await allow(one);
    await settle(one);
    expect(binds.entered - forks).toBe(4);
    expect(one.status()).toMatchObject({ state: 'refused', rechecks: true });
  });

  it('D8b: the counted start clears the mark, so a door a return published that later stops by itself is re-checked again', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    one.recheck();
    await settle(one);
    expect(one.status().state).toBe('listening');
    // The child stops unasked and the restart finds Tailscale signed out, a
    // word no restart retries: the door rests refused, nothing armed.
    ts.backend = 'NeedsLogin';
    lastChild().close(1);
    await settle(one);
    expect(one.status().funnel.state).toBe('restarting');
    releaseNewest(2_000);
    await settle(one);
    const s = one.status();
    expect(s).toMatchObject({ state: 'refused', tailscale: 'signed-out', rechecks: true });
    expect(s.funnel.state).toBe('idle');
    ts.backend = 'Running';
    const forks = binds.entered;
    one.recheck();
    await settle(one);
    expect(binds.entered - forks).toBe(1);
    expect(one.status().state).toBe('listening');
  });

  it('an off press racing a return wins: nothing is published and no child is alive', async () => {
    const one = hostOn();
    await confirmedButStopped(one);
    ts.backend = 'Running';
    const held = hold();
    ts.holdExec = held.promise;
    const reads = statusReads();
    const forks = binds.entered;
    one.recheck();
    await until(() => statusReads() === reads + 1, 'the return’s read began');
    const off = one.setDoor({ on: false });
    ts.holdExec = null;
    held.release();
    await off;
    await settle(one);
    expect(one.status().state).toBe('off');
    expect(binds.entered).toBe(forks);
    expect(alive()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// A first setup's read on a return (D9, §Attack F3)
// ---------------------------------------------------------------------------

describe('a return on fields nobody has allowed', () => {
  it('writes a public port only when none is stored, and starts nothing', async () => {
    const one = hostOn();
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(0);
    expect(one.status()).toMatchObject({ tailscale: 'stopped', rechecks: true, confirmable: false });
    ts.backend = 'Running';
    one.recheck();
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(8443);
    // The lines and Allow, exactly as the press draws them.
    expect(one.status()).toMatchObject({ tailscale: 'ready', confirmable: true, confirmState: 'never' });
    expect(one.status().funnel.refused).toBeNull();
    expect(binds.entered).toBe(0);
    expect(ts.spawns).toBe(0);
  });

  it('refuses a held stored port as the READ’s port-taken: no Allow over it, the store untouched, and Try again chooses again', async () => {
    const one = hostOn();
    await one.setDoor({ on: true });
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(8443);
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().rechecks).toBe(true);
    ts.backend = 'Running';
    ts.held = [8443];
    const stored = readFileSync(pocketStorePath());
    one.recheck();
    await settle(one);
    const s = one.status();
    expect(s.confirmable).toBe(false);
    expect(s.funnel.refused).toBe('port-taken');
    expect(s.refusal).toBe(pocketFunnelSentence('port-taken', 8443));
    expect(readFileSync(pocketStorePath()).equals(stored)).toBe(true);
    expect(binds.entered).toBe(0);
    expect(ts.spawns).toBe(0);
    // Allow is refused over it as well: confirmDoor asks the same predicate.
    const answer = await one.confirmDoor({ linesRead: s.confirmLines, hashRead: s.confirmHash });
    expect(answer.allowed).toBe(false);
    // Try again is the press that chooses again.
    await one.setDoor({ on: true });
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(10000);
    expect(one.status().confirmable).toBe(true);
    expect(one.status().funnel.refused).toBeNull();
  });

  it('refuses a stored port the tailnet’s policy no longer allows as funnel-ports, and keeps it', async () => {
    const one = hostOn();
    await one.setDoor({ on: true });
    await settle(one);
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    ts.backend = 'Running';
    ts.funnelPortsCap = 'https://tailscale.com/cap/funnel-ports?ports=10000';
    one.recheck();
    await settle(one);
    expect(one.status().funnel.refused).toBe('funnel-ports');
    expect(one.status().confirmable).toBe(false);
    expect(readPocketStore().store?.publicPort).toBe(8443);
  });

  // The 333.1 reverify (2026-10-08): the read's own last-press check. A
  // person's off that arrives while the return's read is out wins: the read
  // that answers after it writes no port and keeps no refusal.
  it('an off press while its read is out: the read writes no port and keeps no refusal', async () => {
    const one = hostOn();
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(0);
    expect(one.status().rechecks).toBe(true);
    ts.backend = 'Running';
    const held = hold();
    ts.holdExec = held.promise;
    const reads = statusReads();
    one.recheck();
    await until(() => statusReads() === reads + 1, 'the return’s read began');
    const off = one.setDoor({ on: false });
    ts.holdExec = null;
    held.release();
    await off;
    await settle(one);
    expect(one.status().state).toBe('off');
    expect(readPocketStore().store?.publicPort).toBe(0);
    expect(readPocketStore().store?.enabled).toBe(false);
    expect(binds.entered).toBe(0);
    expect(ts.spawns).toBe(0);
  });

  it('an off press while its read is out over a held stored port: the door stays off with its port, and the next on press reads afresh', async () => {
    const one = hostOn();
    await one.setDoor({ on: true });
    await settle(one);
    expect(readPocketStore().store?.publicPort).toBe(8443);
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().rechecks).toBe(true);
    ts.backend = 'Running';
    ts.held = [8443];
    const held = hold();
    ts.holdExec = held.promise;
    const reads = statusReads();
    one.recheck();
    await until(() => statusReads() === reads + 1, 'the return’s read began');
    const off = one.setDoor({ on: false });
    ts.holdExec = null;
    held.release();
    await off;
    await settle(one);
    expect(one.status().state).toBe('off');
    expect(one.status().funnel.refused).toBeNull();
    expect(one.status().refusal).not.toBe(pocketFunnelSentence('port-taken', 8443));
    expect(readPocketStore().store?.publicPort).toBe(8443);
    // The next on press is the person's: it reads, and chooses again.
    ts.held = [];
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().funnel.refused).toBeNull();
    expect(one.status().confirmable).toBe(true);
    expect(readPocketStore().store?.publicPort).toBe(8443);
  });
});

// ---------------------------------------------------------------------------
// Step 1, the account, the start's word and the admin link (D2, D4, D5, D6)
// ---------------------------------------------------------------------------

describe('what status() says about Tailscale', () => {
  it('calls resolve() exactly once per status, and starts nothing', () => {
    const one = hostOn();
    const before = ts.resolves;
    one.status();
    expect(ts.resolves - before).toBe(1);
    expect(ts.execs).toEqual([]);
    expect(ts.spawns).toBe(0);
  });

  it('step 1 from the stat alone while the switch is off, and from this run’s last read while it is on', async () => {
    const one = hostOn();
    expect(one.status().tailscale).toBe('installed');
    ts.resolution = { resolution: { path: null, source: 'missing', detail: '' }, overrideSet: false };
    expect(one.status().tailscale).toBe('missing');
    ts.resolution = null;
    for (const [backend, state] of [
      ['Stopped', 'stopped'],
      ['NeedsLogin', 'signed-out'],
      ['NeedsMachineAuth', 'signed-out'],
      ['Weird', 'installed'],
      ['Running', 'ready']
    ] as const) {
      ts.backend = backend;
      await one.setDoor({ on: true });
      await settle(one);
      expect(one.status().tailscale, backend).toBe(state);
    }
    ts.enoent = true;
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().tailscale).toBe('missing');
    // The switch off: the stat alone, whatever the last read said.
    await one.setDoor({ on: false });
    await settle(one);
    expect(one.status().tailscale).toBe('installed');
  });

  it('never claims ready from the stored facts: a relaunched door nobody allowed, which this run has not read, is installed', async () => {
    const first = hostOn();
    await first.setDoor({ on: true });
    await settle(first);
    expect(first.status()).toMatchObject({ tailscale: 'ready', confirmState: 'never' });
    expect(readPocketStore().store?.tailnetFacts).not.toBeNull();
    await first.stop();
    hosts.splice(hosts.indexOf(first), 1);
    const one = hostOn();
    await one.openAtLaunch();
    await settle(one);
    expect(ts.execs.filter((e) => e.args[0] === 'status')).toHaveLength(1);
    expect(one.status()).toMatchObject({ state: 'refused', tailscale: 'installed', account: null, tailnet: null });
  });

  it('draws the account and the tailnet only while the read answered, and never hashes, stores or logs the account', async () => {
    const one = hostOn();
    ts.users = { '1': { ID: 1, LoginName: 'person@example.com', DisplayName: 'Person', ProfilePicURL: '' } };
    await one.setDoor({ on: true });
    await settle(one);
    let s: PocketStatus = one.status();
    expect(s).toMatchObject({ tailscale: 'ready', account: 'person@example.com', tailnet: TAILNET });
    expect(JSON.stringify(one.fields())).not.toContain('person@example.com');
    expect(s.confirmLines.join('\n')).not.toContain('person@example.com');
    expect(readFileSync(pocketStorePath(), 'utf8')).not.toContain('person@example.com');
    await allow(one);
    await settle(one);
    expect(one.status().state).toBe('listening');
    expect(logged.some((l) => l.includes('person@example.com'))).toBe(false);
    // Tailscale stopped: not ready, so neither is drawn.
    ts.backend = 'Stopped';
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settle(one);
    s = one.status();
    expect(s).toMatchObject({ tailscale: 'stopped', account: null, tailnet: null });
    // A read with no User map draws the tailnet alone.
    ts.backend = 'Running';
    ts.users = null;
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status()).toMatchObject({ tailscale: 'ready', account: null, tailnet: TAILNET });
  });

  it('keeps the start’s refusal word beside its sentence, and null where the sentence is not Tailscale’s', async () => {
    const throwing = hostOn(async () => {
      throw new Error('the sessions are not up');
    });
    await throwing.setDoor({ on: true });
    await settle(throwing);
    await allow(throwing);
    await settle(throwing);
    let s = throwing.status();
    expect(s.state).toBe('refused');
    expect(s.refusal).toMatch(/could not start its sessions/);
    expect(s.funnel.refused).toBeNull();
    expect(s.rechecks).toBe(false);
    await throwing.stop();
    hosts.splice(hosts.indexOf(throwing), 1);
    bind.resetPocketDoorForTests();
    // The port this press chose could not be saved.
    rmSync(userData, { recursive: true, force: true });
    userData = mkdtempSync(join(tmpdir(), 'p3331-return-'));
    const one = hostOn();
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    ts.backend = 'Running';
    seal.fail = true;
    await one.setDoor({ on: true });
    await settle(one);
    seal.fail = false;
    s = one.status();
    // The press's sentence sits under the read's (port 0 names nothing to
    // allow); its word is null either way, because it is not Tailscale's.
    expect(readPocketStore().store?.publicPort).toBe(0);
    expect(s.funnel.refused).toBeNull();
    expect(s.rechecks).toBe(false);
    // The counted start clears it, and so does the door listening.
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status().state).toBe('listening');
    expect(one.status().funnel.refused).toBeNull();
    // A refusal the start kept is not drawn once the switch is off.
    ts.refuse = 'Another client is changing the serve config';
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().funnel.refused).toBe('busy');
    await one.setDoor({ on: false });
    await settle(one);
    expect(one.status().funnel.refused).toBeNull();
  });

  it('keeps no word for the sessions’ refusal or the door process’s own: a not-approved word before either is cleared beside its sentence (D5)', async () => {
    let sessionsFail = false;
    const one = hostOn(async () => {
      if (sessionsFail) throw new Error('the sessions are not up');
    });
    const notApproved = async (): Promise<void> => {
      ts.refuse = 'Funnel not available; "funnel" node attribute not set.';
      await one.setDoor({ on: true });
      await settle(one);
      if (one.status().confirmState !== 'confirmed') await allow(one);
      await settle(one);
      expect(one.status().funnel.refused).toBe('not-approved');
      expect(one.status().rechecks).toBe(true);
      ts.refuse = null;
    };
    // The sessions, then the door process: neither sentence is Tailscale's, so
    // neither carries a word, and nothing a return re-checks is left behind.
    // Each start is a CONFIRM's (Allow again), not a switch press: the
    // press's own read clears the word before its start, which would hide
    // the site this reads.
    await notApproved();
    sessionsFail = true;
    await allow(one);
    await settle(one);
    let s = one.status();
    expect(s.refusal).toMatch(/could not start its sessions/);
    expect(s.funnel.refused).toBeNull();
    expect(s.rechecks).toBe(false);
    sessionsFail = false;
    await notApproved();
    binds.refuseStart = { ok: false, reason: 'bind-failed', sentence: bind.DOOR_SENTENCES['bind-failed'] };
    await allow(one);
    await settle(one);
    s = one.status();
    expect(s.refusal).toBe(bind.DOOR_SENTENCES['bind-failed']);
    expect(s.funnel.refused).toBeNull();
    expect(s.rechecks).toBe(false);
  });

  it('drops the admin link on a switch press, on or off, and on a confirm that records (D6)', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'exit0';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    // The on press drops it the moment it is counted; its own start, refused
    // the same way, keeps the link it printed.
    expect((await one.setDoor({ on: true })).setupActions).not.toContain('copy-admin-link');
    await settle(one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    // A confirm that records drops it in its own answer.
    const lines = one.status();
    const answer = await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    expect(answer.allowed).toBe(true);
    expect(answer.status.setupActions).not.toContain('copy-admin-link');
    await settle(one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    // The off press drops it, and nothing gives it back.
    await one.setDoor({ on: false });
    await settle(one);
    expect(one.status().setupActions).not.toContain('copy-admin-link');
  });

  it('keeps no admin link a start printed when Tortie would not open it (D6, §Attack F9)', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'exit0-elsewhere';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    const s = one.status();
    expect(s.funnel.refused).toBe('not-approved');
    expect(s.setupActions).not.toContain('copy-admin-link');
    expect(s.funnel.approvalText).toBeNull();
    expect(JSON.stringify(s)).not.toContain('example.invalid');
  });

  it('never carries the admin link to the renderer: it is no field of the status', async () => {
    const one = hostOn();
    ts.caps = false;
    ts.approval = 'exit0';
    await one.setDoor({ on: true });
    await settle(one);
    await allow(one);
    await settle(one);
    const s = one.status();
    expect(s.setupActions).toContain('copy-admin-link');
    expect(JSON.stringify(s)).not.toContain('nMADEUP');
  });
});
