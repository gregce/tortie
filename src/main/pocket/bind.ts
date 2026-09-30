/**
 * The door's life: the process it runs in, and the order it dies in (Phase
 * 313; rebuilt around a `utilityProcess` by Phase 330, build/p330/SPEC.md
 * §4.5.3).
 *
 * The listener itself is no longer here. Since Phase 330 it runs in its own
 * process (`./door-process.ts`, over `./door/listener.ts`), because Tailscale
 * Funnel publishes it to the internet and a stranger's bytes must be parsed by
 * a process that holds no credential (research 132 §7.1, §9 condition 2). This
 * module forks that process, hands it what it needs, answers what it forwards,
 * and stops it. The rules that decide whether that is safe are written as code:
 *
 *  1. **The door binds `127.0.0.1` on an ephemeral port and nothing else, and
 *     it is reached from outside only through the Funnel a person confirmed.**
 *     The one `listen` is in `./door/listener.ts`; this module binds nothing.
 *     The public port a phone is told is chosen and held by `./funnel.ts`,
 *     where a confirmed port that is taken refuses rather than moving.
 *  2. **Main hands the process what it needs and nothing more**: the TLS key
 *     and certificate (main unseals them, because `safeStorage` is main's),
 *     the paired phones' client-key pins, the public name and port, and
 *     whether a window is open. The process hands main a parsed, bounded
 *     request (`./door/wire.ts`) and never a raw byte stream.
 *  3. **Refusal 7 by instance.** Every process has a generation, and main
 *     keeps the admission of each. A request is answered only if its
 *     generation's door has not begun to stop, asked with nothing awaited
 *     between that question and the post.
 *
 * ## What this module refuses to know
 *
 * It does not know what a route answers or what a pairing is. The request
 * handler is passed in (`./server.ts`), so nothing here can import the route
 * table and nothing in the route table can start a process.
 *
 * ## Its life, and the order it dies in
 *
 * The shutdown is `GmuxHookServer`'s, step for step, because that shape was
 * bought by an audit: admission closes on the FIRST LINE of `stop()` before
 * any await, the process is told (`shutdown`, then `stop`), the accepted
 * handlers are joined bounded, the process joins its own and replies
 * `stopped`, and it is killed two seconds after `stop` if it has not exited. A
 * stopped door is never revived: a new start forks a new process with a new
 * generation. `beginPocketShutdown()` and `joinPocketDoor()` are the two lines
 * `src/main/capabilities.ts` runs, and they run BEFORE `shutdownGmuxCore()`,
 * because every route reads session truth and turns through owners that the
 * same disposer closes further down.
 */

import { join } from 'node:path';
import { utilityProcess } from 'electron';

import { getLog } from '../log';
import type { DoorPin, DoorRequest, DoorSpawner, DoorChild, ToDoor } from './door/wire';
import { fromDoorOf, toDoorOf } from './door/wire';
import { DOOR_STOP_CLOSE_MS, DOOR_STOP_JOIN_MS } from './door/limits';
import {
  ensureDoorIdentity,
  holdDoorIdentity,
  shortFingerprint,
  type DoorIdentity,
  type IdentityOptions,
  type IdentityOutcome
} from './tls';

export type { DoorPin, DoorRequest, DoorSpawner, DoorChild } from './door/wire';
export { DOOR_STOP_CLOSE_MS, DOOR_STOP_JOIN_MS } from './door/limits';

const log = getLog('pocket');

/** Main kills a door process this long after `stop` if it has not exited. */
export const DOOR_STOP_KILL_MS = 2_000;
/** A door process has this long to say it is listening, or it is killed. */
export const DOOR_START_DEADLINE_MS = 10_000;
/** The name the door process carries in `app.getAppMetrics()`. */
export const DOOR_SERVICE_NAME = 'Tortie Door';

// ---------------------------------------------------------------------------
// What the door answers about itself
// ---------------------------------------------------------------------------

export type DoorRefusalReason = 'bind-failed' | 'no-certificate' | 'quitting' | 'door-exited';

/** One sentence per refusal, said by the surface exactly as it is written. */
export const DOOR_SENTENCES: Readonly<Record<DoorRefusalReason, string>> = {
  'bind-failed': 'Tortie could not open the door on this Mac.',
  'no-certificate': 'The door has no certificate, so it cannot answer safely.',
  quitting: 'Tortie is quitting, so the door did not open.',
  'door-exited': 'The door stopped unexpectedly, so nothing is answering. Tortie is trying again.'
};

/**
 * What a request's handler may ask of the door that ACCEPTED the request (the
 * Phase 316.1 fix round), asked of the INSTANCE rather than of the module: a
 * stop drops the module's door before it joins the handlers that door
 * accepted, so a handler that asked the module would be told about no door.
 */
export interface DoorAdmission {
  /** True from the first line of this door's `stop()` or `beginShutdown()`. */
  stopping(): boolean;
}

/** What main answers a forwarded request. A refusal is `404` and no body. */
export interface DoorAnswer {
  readonly status: 200 | 404;
  readonly body: string | null;
}

/** `./server.ts`'s handler, handed the door that accepted the request. */
export type DoorRequestHandler = (request: DoorRequest, door: DoorAdmission) => Promise<DoorAnswer>;

export interface DoorStartInput {
  readonly handle: DoorRequestHandler;
  /** The name and port a phone dials, which the door checks SNI and `Host` against. */
  readonly publicHost: { readonly name: string; readonly port: number };
  readonly pins: readonly DoorPin[];
  readonly windowOpen: boolean;
  /** Tests. Defaults to the real sealed identity. */
  readonly identity?: (options: IdentityOptions) => IdentityOutcome;
  /** Tests. Defaults to the identity file's own path. */
  readonly identityPath?: string;
  /** Tests: `inProcessDoor()`. Defaults to the `utilityProcess`. */
  readonly spawn?: DoorSpawner;
}

export type DoorStartResult =
  | {
      readonly ok: true;
      readonly localPort: number;
      readonly certificateFingerprint: string;
      readonly publicKeyFingerprint: string;
      readonly shortFingerprint: string;
    }
  | {
      readonly ok: false;
      readonly reason: DoorRefusalReason;
      readonly sentence: string;
    };

export interface DoorStatus {
  readonly listening: boolean;
  readonly localPort: number;
  readonly certificateFingerprint: string | null;
  readonly publicKeyFingerprint: string | null;
  readonly shortFingerprint: string | null;
  readonly lastRefusal: DoorRefusalReason | null;
  readonly sentence: string | null;
}

export interface DoorStopReport {
  /** Requests accepted and unfinished when the stop began. */
  readonly accepted: number;
  /** True when they settled inside the bound rather than being cut. */
  readonly joined: boolean;
  readonly waitedMs: number;
}

// ---------------------------------------------------------------------------
// The process
// ---------------------------------------------------------------------------

/**
 * The real door process. `utilityProcess.fork` exists only in Electron's main
 * once the app is ready, which is the only place a door is started; a unit
 * test passes `inProcessDoor()` instead and never reaches this.
 *
 * ITS WHOLE ENVIRONMENT IS ONE VARIABLE, AND IT IS NOT EMPTY ON PURPOSE (the
 * Phase 330 fix round). Electron 43 reads `env: {}` as "not set" and hands the
 * child main's whole environment. The verifier measured exactly that in the
 * running app: `ps -E` on the door process showed HOME, GMUX_TAILSCALE_BIN and
 * a variable set only on main, and a standalone `utilityProcess.fork` gave
 * 4,458 bytes of environment for `{}` and 884 for one named variable. Under
 * `npm run dev` main's environment is his shell's, tokens included, and this
 * is the one process the internet reaches. The door reads nothing from its
 * environment; `TORTIE_DOOR` says what the process is, so `ps -E` tells it
 * from Chromium's own utility processes. `conformance:pocket` E1 holds the
 * shape, and `probe:p330` A13 reads the running door's environment.
 */
function forkDoorProcess(): DoorChild {
  const child = utilityProcess.fork(join(__dirname, 'pocket-door.js'), [], {
    env: { TORTIE_DOOR: '1' },
    stdio: 'ignore',
    serviceName: DOOR_SERVICE_NAME
  });
  return {
    get pid() {
      return child.pid;
    },
    post: (message) => child.postMessage(message),
    onMessage: (listener) => {
      child.on('message', listener);
    },
    onExit: (listener) => {
      child.on('exit', (code) => listener(code));
    },
    kill: () => {
      child.kill();
    }
  };
}

/** Await `work`, but never longer than `ms`. True when the work won. */
async function settleWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([work.then(() => true), expired]);
  } catch {
    return true;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function refuse(reason: DoorRefusalReason): DoorStartResult {
  return { ok: false, reason, sentence: DOOR_SENTENCES[reason] };
}

/** The answer a refused or stopping request gets, and nothing else. */
const REFUSED: DoorAnswer = { status: 404, body: null };

/** Refusal 7 by generation: every door process's admission, by its generation. */
const admissions = new Map<number, DoorAdmission>();
let nextGeneration = 1;
/**
 * The connection refusals main has written: ONE LINE PER WORD PER MAIN PROCESS,
 * across every door process it forks (build/p330/SPEC.md §As built row 7). A
 * later door that refuses the same word writes nothing more, because the log
 * is bounded by words, never by connections.
 */
const loggedWords = new Set<string>();
/** Messages from a door process that did not validate, dropped whole and counted. */
let droppedMessages = 0;

type FirstWord = 'listening' | 'refused' | 'exited' | 'late';

export class PocketDoor {
  readonly generation: number;
  private child: DoorChild | null = null;
  private shuttingDown = false;
  private listeningNow = false;
  private port = 0;
  private identity: DoorIdentity | null = null;
  private exited = false;
  private readonly inFlight = new Set<Promise<void>>();
  private readonly waiters: { first: ((word: FirstWord) => void) | null; stopped: (() => void) | null; exit: (() => void)[] } = {
    first: null,
    stopped: null,
    exit: []
  };
  /** THIS door, as its handlers may ask about it. One object per process. */
  readonly admission: DoorAdmission = { stopping: () => this.shuttingDown };

  constructor(private readonly onDiedUnasked: (door: PocketDoor) => void) {
    this.generation = nextGeneration;
    nextGeneration += 1;
  }

  get listening(): boolean {
    return this.listeningNow;
  }

  get localPort(): number {
    return this.port;
  }

  get shutdownStarted(): boolean {
    return this.shuttingDown;
  }

  get inFlightCount(): number {
    return this.inFlight.size;
  }

  get fingerprints(): { certificate: string; publicKey: string } | null {
    if (this.identity === null) return null;
    return { certificate: this.identity.certificateFingerprint, publicKey: this.identity.publicKeyFingerprint };
  }

  /** Fork the process and wait for it to listen, or refuse and say why. */
  async start(input: DoorStartInput): Promise<DoorStartResult> {
    if (this.shuttingDown) return refuse('quitting');
    const makeIdentity = input.identity ?? ensureDoorIdentity;
    const outcome = makeIdentity({
      ...(input.identityPath !== undefined ? { path: input.identityPath } : {}),
      // The public name alone: `./tls.ts` renews from the same key when the
      // names change, so a new public name never moves the pin.
      names: { addresses: [], dnsNames: [input.publicHost.name] }
    });
    if (outcome.kind === 'refused') {
      log.warn(`the door has no certificate: ${outcome.reason}`, { reason: outcome.reason });
      return { ok: false, reason: 'no-certificate', sentence: outcome.sentence };
    }
    const identity = outcome.identity;
    let child: DoorChild;
    try {
      child = (input.spawn ?? forkDoorProcess)();
    } catch {
      log.warn('the door process could not be started');
      return refuse('bind-failed');
    }
    this.child = child;
    admissions.set(this.generation, this.admission);
    const first = new Promise<FirstWord>((resolve) => {
      this.waiters.first = resolve;
    });
    child.onMessage((message) => this.receive(message, input.handle));
    child.onExit(() => this.died());
    this.post({
      kind: 'start',
      generation: this.generation,
      tls: { key: identity.keyPem, cert: identity.certPem },
      pins: [...input.pins],
      host: { name: input.publicHost.name, port: input.publicHost.port },
      windowOpen: input.windowOpen
    });
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<FirstWord>((resolve) => {
      deadline = setTimeout(() => resolve('late'), DOOR_START_DEADLINE_MS);
      deadline.unref?.();
    });
    const word = await Promise.race([first, late]);
    if (deadline !== undefined) clearTimeout(deadline);
    this.waiters.first = null;
    // STOPPED WHILE IT WAS OPENING (the Phase 316.1 fix round). The stop that
    // ran inside the wait has already told the process to go and ends it
    // itself; what is left is to say so rather than hand a caller a door nobody
    // holds.
    if (this.shuttingDown) {
      log.warn('the door was stopped while it was opening, so it closed again');
      return refuse('quitting');
    }
    if (word !== 'listening') {
      this.shuttingDown = true;
      this.kill();
      const reason: DoorRefusalReason = word === 'exited' ? 'door-exited' : 'bind-failed';
      log.warn(`the door did not open: ${reason}`, { reason });
      return refuse(reason);
    }
    this.listeningNow = true;
    this.identity = identity;
    // What the rest of the domain reads its fingerprint and its material
    // from, held only while something is actually answering with it.
    holdDoorIdentity(identity);
    log.info('the door is open', { localPort: this.port, generation: this.generation });
    return this.opened();
  }

  /** What an open door answers a second start. */
  opened(): DoorStartResult {
    if (!this.listeningNow || this.identity === null) return refuse('bind-failed');
    return {
      ok: true,
      localPort: this.port,
      certificateFingerprint: this.identity.certificateFingerprint,
      publicKeyFingerprint: this.identity.publicKeyFingerprint,
      shortFingerprint: shortFingerprint(this.identity.publicKeyFingerprint)
    };
  }

  /** The pins or the window moved. A socket whose key is no longer pinned is cut. */
  update(update: { pins?: readonly DoorPin[]; windowOpen?: boolean }): void {
    if (this.shuttingDown) return;
    const message: { kind: 'update'; pins?: DoorPin[]; windowOpen?: boolean } = { kind: 'update' };
    if (update.pins !== undefined) message.pins = [...update.pins];
    if (update.windowOpen !== undefined) message.windowOpen = update.windowOpen;
    this.post(message);
  }

  private post(message: ToDoor): void {
    if (this.exited || this.child === null) return;
    // THE SAME VALIDATOR THE DOOR RUNS, on this side too: an answer over the
    // bound is refused here rather than dropped there with the phone waiting.
    const checked = toDoorOf(message);
    if (checked === null) {
      if (message.kind === 'answer') this.child.post({ kind: 'answer', id: message.id, ...REFUSED });
      return;
    }
    try {
      this.child.post(checked);
    } catch {
      /* a process that has gone takes nothing, and says so by its exit */
    }
  }

  private receive(raw: unknown, handle: DoorRequestHandler): void {
    const message = fromDoorOf(raw);
    if (message === null) {
      droppedMessages += 1;
      return;
    }
    switch (message.kind) {
      case 'listening':
        this.port = message.localPort;
        this.waiters.first?.('listening');
        return;
      case 'refused':
        this.waiters.first?.('refused');
        return;
      case 'refusal':
        // One line per word per process, a WORD and never a value.
        if (!loggedWords.has(message.word)) {
          loggedWords.add(message.word);
          log.warn(`refused a connection at the door: ${message.word}`);
        }
        return;
      case 'stopped':
        this.waiters.stopped?.();
        return;
      case 'request':
        this.dispatch(message.id, message.generation, message.request, handle);
        return;
    }
  }

  private dispatch(id: number, generation: number, request: DoorRequest, handle: DoorRequestHandler): void {
    // REFUSAL 7 BY GENERATION: a request stamped for a door that is not this
    // one, or for a door that has begun to stop, is refused before a handler
    // sees it.
    const admission = admissions.get(generation);
    if (generation !== this.generation || admission === undefined || admission.stopping()) {
      this.post({ kind: 'answer', id, ...REFUSED });
      return;
    }
    const job = (async (): Promise<void> => {
      let answer: DoorAnswer;
      try {
        answer = await handle(request, admission);
      } catch {
        answer = REFUSED;
      }
      // Asked AGAIN, with nothing awaited between the question and the post.
      if (admission.stopping()) answer = REFUSED;
      this.post({ kind: 'answer', id, status: answer.status, body: answer.status === 404 ? null : answer.body });
    })();
    this.inFlight.add(job);
    void job.finally(() => this.inFlight.delete(job));
  }

  /**
   * Close admission, synchronously and with no await, so a request forwarded
   * between the quit's first line and its bounded join below is refused rather
   * than answered. Calling this twice is calling it once.
   */
  beginShutdown(): void {
    this.shuttingDown = true;
    this.post({ kind: 'shutdown' });
  }

  /**
   * Shut down as ONE JOINED OPERATION, in `GmuxHookServer.stop`'s order:
   *
   *  1. ADMISSION CLOSES, synchronously, before any await. From this line no
   *     forwarded request may reach a route, and the process is told.
   *  2. The process is told to stop: it closes its listener and cuts its idle
   *     sockets.
   *  3. The accepted handlers are JOINED, bounded.
   *  4. The process replies `stopped`, or is killed two seconds after `stop`.
   *
   * It never throws and it always resolves. A stopped door is not restarted.
   */
  async stop(): Promise<DoorStopReport> {
    const startedAt = Date.now();
    this.shuttingDown = true;
    this.post({ kind: 'shutdown' });
    const wasListening = this.listeningNow;
    this.listeningNow = false;
    if (wasListening) holdDoorIdentity(null);
    this.identity = null;
    const accepted = this.inFlight.size;
    if (this.child === null || this.exited) {
      admissions.delete(this.generation);
      return { accepted, joined: true, waitedMs: Date.now() - startedAt };
    }
    const stopped = new Promise<void>((resolve) => {
      this.waiters.stopped = resolve;
    });
    const exited = new Promise<void>((resolve) => {
      if (this.exited) resolve();
      else this.waiters.exit.push(resolve);
    });
    this.post({ kind: 'stop' });
    const joined = await settleWithin(Promise.all([...this.inFlight]), DOOR_STOP_JOIN_MS);
    await settleWithin(Promise.race([stopped, exited]), DOOR_STOP_KILL_MS - (Date.now() - startedAt));
    this.kill();
    await settleWithin(exited, DOOR_STOP_CLOSE_MS);
    admissions.delete(this.generation);
    return { accepted, joined, waitedMs: Date.now() - startedAt };
  }

  private kill(): void {
    if (this.exited || this.child === null) return;
    try {
      this.child.kill();
    } catch {
      /* already gone */
    }
  }

  /** The process exited, asked or not. */
  private died(): void {
    if (this.exited) return;
    this.exited = true;
    this.waiters.first?.('exited');
    for (const resolve of this.waiters.exit.splice(0)) resolve();
    // A stop asked for it, or it died while opening: `start()` says so.
    if (this.shuttingDown || !this.listeningNow) return;
    // DIED UNASKED while answering. Nothing is answering, so nothing may say it is.
    this.shuttingDown = true;
    this.listeningNow = false;
    this.identity = null;
    admissions.delete(this.generation);
    this.onDiedUnasked(this);
  }
}

// ---------------------------------------------------------------------------
// The one door this process has
// ---------------------------------------------------------------------------

let current: PocketDoor | null = null;
let quitting = false;
let lastRefusal: DoorRefusalReason | null = null;
const exitListeners = new Set<() => void>();
/**
 * The start in flight, and the door it is starting. Two presses of one switch
 * would otherwise both fork a process.
 */
let starting: { readonly door: PocketDoor; readonly run: Promise<DoorStartResult> } | null = null;

function diedUnasked(door: PocketDoor): void {
  if (current !== door) return;
  current = null;
  lastRefusal = 'door-exited';
  holdDoorIdentity(null);
  log.warn('the door process stopped unexpectedly');
  for (const listener of exitListeners) {
    try {
      listener();
    } catch {
      /* a listener's throw is its own */
    }
  }
}

/** Open the door. Calling it while it is open answers what is open. */
export async function startPocketDoor(input: DoorStartInput): Promise<DoorStartResult> {
  if (quitting) return refuse('quitting');
  // A START IN FLIGHT FOR A DOOR THAT WAS SINCE STOPPED IS NOT JOINED (the
  // Phase 316.1 fix round). That door refuses as its process answers, so
  // joining it would hand a later press a refusal it did not cause.
  while (starting !== null && starting.door !== current) {
    await starting.run.catch(() => undefined);
  }
  if (quitting) return refuse('quitting');
  if (starting !== null) return starting.run;
  if (current !== null && current.listening) return current.opened();
  const door = new PocketDoor(diedUnasked);
  current = door;
  const run = door.start(input).then((result) => {
    // A door stopped while it was opening answers `quitting` to its own
    // caller. That is this module's last word only when the quit stopped it.
    if (result.ok || current === door || quitting) {
      lastRefusal = result.ok ? null : result.reason;
    }
    if (!result.ok && current === door) current = null;
    return result;
  });
  const mine = { door, run };
  starting = mine;
  try {
    return await run;
  } finally {
    if (starting === mine) starting = null;
  }
}

/** The pins or the window moved. Nothing happens when no door is open. */
export function updatePocketDoor(update: { pins?: readonly DoorPin[]; windowOpen?: boolean }): void {
  current?.update(update);
}

/** What the surface draws. It never carries a key. */
export function pocketDoorStatus(): DoorStatus {
  const door = current;
  const prints = door?.listening === true ? door.fingerprints : null;
  return {
    listening: door?.listening ?? false,
    localPort: door?.listening === true ? door.localPort : 0,
    certificateFingerprint: prints?.certificate ?? null,
    publicKeyFingerprint: prints?.publicKey ?? null,
    shortFingerprint: prints === null ? null : shortFingerprint(prints.publicKey),
    lastRefusal,
    sentence: lastRefusal === null ? null : DOOR_SENTENCES[lastRefusal]
  };
}

/**
 * Close the door a person switched off. The instance is dropped, so the next
 * start forks a new process rather than reviving a stopped one.
 */
export async function stopPocketDoor(): Promise<DoorStopReport> {
  const door = current;
  current = null;
  if (door === null) return { accepted: 0, joined: true, waitedMs: 0 };
  return door.stop();
}

/** The process died unasked. Answers the unsubscribe. */
export function onPocketDoorExit(listener: () => void): () => void {
  exitListeners.add(listener);
  return () => {
    exitListeners.delete(listener);
  };
}

/**
 * Quit-time admission, closed synchronously by `disposeMainCapabilities` on
 * its first lines, before any await. Nothing turns it back on.
 */
export function beginPocketShutdown(): void {
  quitting = true;
  // Admission closes on the instance too, and the process is told, so a
  // request that arrives between this line and the join below is refused.
  current?.beginShutdown();
}

/** True from the first line of `beginPocketShutdown`. */
export function pocketShutdownStarted(): boolean {
  return quitting;
}

/** Admission, as the request handler's own second question. */
export function pocketDoorShuttingDown(): boolean {
  return quitting || (current?.shutdownStarted ?? false);
}

/** The bounded join the quit awaits. It never throws. */
export async function joinPocketDoor(): Promise<DoorStopReport> {
  quitting = true;
  const door = current;
  current = null;
  if (door === null) return { accepted: 0, joined: true, waitedMs: 0 };
  try {
    return await door.stop();
  } catch {
    return { accepted: 0, joined: false, waitedMs: 0 };
  }
}

/**
 * How many messages from a door process did not validate and were dropped
 * whole. A number, and never what the message held.
 */
export function pocketDoorDroppedMessages(): number {
  return droppedMessages;
}

/** Tests only: forget the module's door without touching a real socket. */
export function resetPocketDoorForTests(): void {
  current = null;
  quitting = false;
  lastRefusal = null;
  starting = null;
  exitListeners.clear();
  loggedWords.clear();
  droppedMessages = 0;
}
