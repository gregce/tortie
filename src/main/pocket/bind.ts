/**
 * The door's address, its listener and its life (Phase 313, mechanism item 1).
 *
 * This is the first thing in Tortie that anything outside this Mac can reach,
 * so the two rules that decide whether that is safe are HERE and are written
 * as code rather than as manners:
 *
 *  1. **The address is READ, never chosen.** The first IPv4 in `100.64.0.0/10`
 *     from `os.networkInterfaces()`. Never `0.0.0.0`, never a name resolved at
 *     run time, never a literal in a setting, and never `tailscale status`
 *     (research 127 §7 item 16: the address comes from the interface table).
 *     No such address means NO DOOR — the switch draws one sentence and
 *     nothing listens. There is no wider fallback, because a fallback here is
 *     a door on a network nobody agreed to.
 *  2. **A confirmed port that is taken REFUSES rather than moving.** This is
 *     deliberately the opposite of `src/main/activity/hooks.ts:230-243`, whose
 *     whole safety argument is that it binds `127.0.0.1` and whose preferred
 *     port moving to an ephemeral one is therefore routine. Research 127 §7
 *     item 11 is the reason: under a shared origin a same-uid port squatter
 *     owns whatever the phone trusts, so a door that quietly takes another
 *     port hands the name it was given to whoever holds the first one.
 *
 * ## Why a /32 is part of the test, measured rather than assumed
 *
 * `100.64.0.0/10` is the carrier-grade NAT range, and Tailscale is not the
 * only thing that may hand out an address inside it: a carrier-NAT'ed Wi-Fi or
 * mobile hotspot can put one on `en0`. Binding the door there would be a door
 * on the local network, which this phase explicitly refuses ("No home Wi-Fi
 * bind" is the entry's own refusal). The separating fact is the NETMASK. Read
 * from this Mac's own interface table on 2026-09-22, with the addresses
 * deliberately not recorded: `utun4` carries an IPv4 in the range with netmask
 * `255.255.255.255` and the tailnet's own `fd7a:115c:a1e0::/48` IPv6 on the
 * same interface, while `en0` is a `255.255.255.0` and outside the range. So a
 * candidate must be a /32, and among /32s the one whose interface also carries
 * the tailnet ULA wins, which is a TIE BREAK and never a requirement, because
 * a person may have IPv6 off.
 *
 * ## The self-origin refusal is a narrowing, NOT the thing that stops a local
 * ## process, and saying so is the point
 *
 * {@link isSelfOrigin} destroys a socket whose source address is the address
 * the door answers on, before any header exists. That refuses the obvious
 * shape — an agent on this Mac dialling the door the way a phone would — and
 * it is worth having, because research 127 §7 item 10 measured that the
 * Tailscale identity header is worth nothing against a local process. But a
 * local process can choose another local source address, and this check would
 * then say nothing at all. **What actually stops it is that it has no key**:
 * every read route is signed, and `./pairing.ts`'s verifier refuses a request
 * whose source is not the address the phone was allowed AT, which is the pin
 * the hostile client goes red on when it is removed. Read this refusal as one
 * cheap narrowing in front of the signature, never as the boundary itself.
 *
 * ## What this module refuses to know
 *
 * It does not know what a route answers or what a pairing is. The request
 * handler is passed in, so nothing here can import the route table and nothing
 * in the route table can bind a socket.
 *
 * ## Its life, and the order it dies in
 *
 * The shutdown is `GmuxHookServer`'s, step for step, because that shape was
 * bought by an audit: admission closes on the FIRST LINE of `stop()` before
 * any await, the listener stops accepting, the accepted handlers are joined
 * bounded, anything still holding a socket is destroyed, and the door is not
 * restarted afterwards — a new one is constructed. `beginPocketShutdown()` and
 * `joinPocketDoor()` are the two lines `src/main/capabilities.ts` runs, and
 * they run BEFORE `shutdownGmuxCore()`, because every route reads session
 * truth and turns through owners that the same disposer closes further down.
 */

import { createServer, type Server } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { isIPv4, type Socket } from 'node:net';
import { app } from 'electron';

import { getLog } from '../log';
import {
  ensureDoorIdentity,
  holdDoorIdentity,
  shortFingerprint,
  type DoorIdentity,
  type IdentityOptions,
  type IdentityOutcome
} from './tls';

const log = getLog('pocket');

/** The tailnet's IPv4 range. Tailscale hands out one address inside it. */
export const TAILNET_IPV4_RANGE = '100.64.0.0/10';

/** The tailnet's IPv6 ULA prefix, used only to break a tie between /32s. */
export const TAILNET_ULA_PREFIX = 'fd7a:115c:a1e0';

/** Only a /32 is the tailnet. See the header. */
export const TAILNET_NETMASK = '255.255.255.255';

/** The same cap the hook server carries. */
export const MAX_CONNECTIONS = 32;

/** A client that opens a socket and says nothing gets this long. */
export const HEADERS_TIMEOUT_MS = 10_000;
/** A whole request, headers and body, gets this long. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** An idle keep-alive socket gets this long. */
export const KEEP_ALIVE_TIMEOUT_MS = 5_000;
/** The TLS handshake gets this long. */
export const HANDSHAKE_TIMEOUT_MS = 10_000;

/** How long `stop()` waits for accepted requests before cutting sockets. */
export const DOOR_STOP_JOIN_MS = 1_000;
/** How long it then waits for `close()` itself. */
export const DOOR_STOP_CLOSE_MS = 1_000;

/**
 * The harness override, and the two things that keep it honest: it is refused
 * in a packaged build, and it turns the self-origin refusal OFF explicitly
 * rather than by accident, because under a loopback bind every client is this
 * machine. `probe:p313` is what sets it; nothing a person can press does.
 */
export const HARNESS_LOOPBACK_ENV = 'GMUX_POCKET_LOOPBACK';

// ---------------------------------------------------------------------------
// The address
// ---------------------------------------------------------------------------

/** The shape this module needs from `os.networkInterfaces()`. */
export interface InterfaceAddress {
  readonly address: string;
  readonly family: string | number;
  readonly internal: boolean;
  readonly netmask: string;
}

export type InterfaceTable = Readonly<
  Record<string, readonly InterfaceAddress[] | undefined>
>;

/** An address that could be the door's. */
export interface TailnetCandidate {
  readonly address: string;
  readonly interfaceName: string;
  readonly netmask: string;
  /** The interface also carries a `fd7a:115c:a1e0::/48` address. */
  readonly hasTailnetUla: boolean;
}

/**
 * Is this an IPv4 literal inside `100.64.0.0/10`?
 *
 * `isIPv4` first, because it refuses the spellings a hand-rolled parser
 * accepts and a kernel reads differently: a leading zero (`100.064.0.1`),
 * whitespace, and a trailing dot.
 */
export function isTailnetIpv4(address: string): boolean {
  if (!isIPv4(address)) return false;
  const octets = address.split('.').map((part) => Number.parseInt(part, 10));
  return octets[0] === 100 && (octets[1] ?? 0) >= 64 && (octets[1] ?? 0) <= 127;
}

function isIpv4Family(family: string | number): boolean {
  return family === 'IPv4' || family === 4;
}

/**
 * Every address in the table that could be this Mac's tailnet address, in the
 * table's own order, with the interfaces that also carry the tailnet ULA
 * first. A candidate must be IPv4, not internal, inside the range, and a /32.
 */
export function tailnetCandidates(
  table: InterfaceTable = networkInterfaces() as InterfaceTable
): readonly TailnetCandidate[] {
  const out: TailnetCandidate[] = [];
  for (const [interfaceName, list] of Object.entries(table)) {
    if (list === undefined) continue;
    const hasTailnetUla = list.some(
      (entry) =>
        !isIpv4Family(entry.family) &&
        entry.address.toLowerCase().startsWith(TAILNET_ULA_PREFIX)
    );
    for (const entry of list) {
      if (!isIpv4Family(entry.family)) continue;
      if (entry.internal) continue;
      if (!isTailnetIpv4(entry.address)) continue;
      if (entry.netmask !== TAILNET_NETMASK) continue;
      out.push({
        address: entry.address,
        interfaceName,
        netmask: entry.netmask,
        hasTailnetUla
      });
    }
  }
  // Stable: the table's order, with the ULA-bearing interfaces lifted.
  return [...out.filter((c) => c.hasTailnetUla), ...out.filter((c) => !c.hasTailnetUla)];
}

/** The one address the door would bind, or null when there is none. */
export function chooseTailnetAddress(
  table: InterfaceTable = networkInterfaces() as InterfaceTable
): TailnetCandidate | null {
  return tailnetCandidates(table)[0] ?? null;
}

/**
 * The same answer as a bare address, under the name `build/p313/SPEC.md` §1
 * pins: **the only function in the repository that may produce a bind host**.
 * Null when this Mac has no tailnet address, which is a door that does not
 * open rather than a door on something else.
 */
export function pocketBindAddress(
  table: InterfaceTable = networkInterfaces() as InterfaceTable
): string | null {
  return chooseTailnetAddress(table)?.address ?? null;
}

/**
 * Is the address the door is bound to still on this machine? Sleep, a Wi-Fi
 * change or a Tailscale restart can take it away or replace it.
 *
 * NOTHING CALLS THIS ON A TIMER IN THIS PHASE. There is no watcher and no
 * `powerMonitor` hook here: a door that rebound itself would change the place
 * a phone was told to dial without anybody deciding to. It is a question a
 * surface asks when a person is looking at it.
 */
export function doorAddressIsStale(
  table: InterfaceTable = networkInterfaces() as InterfaceTable
): boolean {
  const door = current;
  if (door === null || !door.listening) return false;
  return addressIsStale(door.address, table);
}

/** The question above, with the bound address passed in. */
export function addressIsStale(
  bound: string | null,
  table: InterfaceTable
): boolean {
  if (bound === null) return false;
  if (!isTailnetIpv4(bound)) return false; // the harness loopback bind
  return !tailnetCandidates(table).some((c) => c.address === bound);
}

/**
 * A connection from this machine itself is refused, before a header is read.
 *
 * Research 127 §7 item 10: the Tailscale identity header is worth nothing
 * against a LOCAL process, because it is added only inside Serve's reverse
 * proxy. The door's own answer is simpler — a request whose source address is
 * the address the door is bound to came from this Mac, and every agent Tortie
 * runs is on this Mac. An IPv4-mapped form (`::ffff:100.x.y.z`) is the same
 * address and is compared as one.
 */
export function isSelfOrigin(remote: string | undefined, bound: string): boolean {
  if (remote === undefined || remote.length === 0) return true; // fail closed
  const stripped = remote.startsWith('::ffff:') ? remote.slice('::ffff:'.length) : remote;
  return stripped === bound;
}

// ---------------------------------------------------------------------------
// What the door answers about itself
// ---------------------------------------------------------------------------

export type DoorRefusalReason =
  | 'no-tailnet-address'
  | 'port-taken'
  | 'address-unavailable'
  | 'bind-failed'
  | 'invalid-port'
  | 'no-certificate'
  | 'quitting';

/** One sentence per refusal, said by the surface exactly as it is written. */
export const DOOR_SENTENCES: Readonly<Record<DoorRefusalReason, string>> = {
  'no-tailnet-address':
    'This Mac has no tailnet address, so there is nothing for a phone to dial and the door is off.',
  'port-taken':
    'Something else on this Mac already holds that port. Tortie will not move to another one, because a phone was told this number.',
  'address-unavailable':
    'This Mac’s tailnet address went away before the door could open. Tortie will try again when it is back.',
  'bind-failed': 'Tortie could not open the door on this Mac.',
  'invalid-port':
    'That port cannot be used. Pick a number between 1024 and 65535.',
  'no-certificate': 'The door has no certificate, so it cannot answer safely.',
  quitting: 'Tortie is quitting, so the door did not open.'
};

/**
 * What a request's handler may ask of the door that ACCEPTED the request (the
 * Phase 316.1 fix round).
 *
 * One question, asked of the INSTANCE rather than of the module: a stop drops
 * the module's door before it joins the handlers that door accepted, so a
 * handler that asked the module "is the door stopping?" after its own await
 * would be told about no door at all, and would answer. `./server.ts` asks it
 * again after the answer is composed, before a byte of it leaves.
 */
export interface DoorAdmission {
  /** True from the first line of this door's `stop()` or `beginShutdown()`. */
  stopping(): boolean;
}

export interface DoorStartInput {
  /** The confirmed port. */
  readonly port: number;
  /**
   * What answers a request. Passed in, so the listener imports no route. It is
   * handed the door that accepted the request as its third argument.
   */
  readonly handle: (
    req: IncomingMessage,
    res: ServerResponse,
    door: DoorAdmission
  ) => void | Promise<void>;
  /** The names the certificate must cover beyond the bind address. */
  readonly dnsNames?: readonly string[];
  /** Injected in tests. Defaults to `os.networkInterfaces()`. */
  readonly table?: InterfaceTable;
  /** Injected in tests. Defaults to the real sealed identity. */
  readonly identity?: (options: IdentityOptions) => IdentityOutcome;
  /** Injected in tests. Defaults to the identity file's own path. */
  readonly identityPath?: string;
  /**
   * Refuse a connection whose source is the bind address. Defaults to true
   * for a tailnet bind and false for the harness loopback bind, because under
   * loopback every client is this machine.
   */
  readonly refuseSelfOrigin?: boolean;
}

export type DoorStartResult =
  | {
      readonly ok: true;
      readonly address: string;
      readonly port: number;
      readonly certificateFingerprint: string;
      readonly publicKeyFingerprint: string;
      readonly shortFingerprint: string;
      readonly selfOriginRefused: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: DoorRefusalReason;
      readonly sentence: string;
    };

export interface DoorStatus {
  readonly listening: boolean;
  readonly address: string | null;
  readonly port: number;
  readonly certificateFingerprint: string | null;
  readonly publicKeyFingerprint: string | null;
  readonly shortFingerprint: string | null;
  readonly selfOriginRefused: boolean;
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
// The door
// ---------------------------------------------------------------------------

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

export class PocketDoor {
  private server: Server | null = null;
  private bound: string | null = null;
  private boundPort = 0;
  private identity: DoorIdentity | null = null;
  private refuseSelf = true;
  private shuttingDown = false;
  private readonly inFlight = new Set<Promise<void>>();

  get listening(): boolean {
    return this.server !== null;
  }

  get address(): string | null {
    return this.bound;
  }

  get port(): number {
    return this.boundPort;
  }

  get shutdownStarted(): boolean {
    return this.shuttingDown;
  }

  get inFlightCount(): number {
    return this.inFlight.size;
  }

  get selfOriginRefused(): boolean {
    return this.refuseSelf;
  }

  get fingerprints(): { certificate: string; publicKey: string } | null {
    if (this.identity === null) return null;
    return {
      certificate: this.identity.certificateFingerprint,
      publicKey: this.identity.publicKeyFingerprint
    };
  }

  /** Bind, or refuse and say which of the five things went wrong. */
  async start(input: DoorStartInput): Promise<DoorStartResult> {
    if (this.shuttingDown) return refuse('quitting');
    // An open door answers what is open. A person changing the port stops the
    // door and starts it again, because the port is a confirmed field and a
    // door that re-bound underneath a paired phone would move the number the
    // phone was told without anybody confirming the move.
    if (this.server !== null && this.bound !== null && this.identity !== null) {
      return {
        ok: true,
        address: this.bound,
        port: this.boundPort,
        certificateFingerprint: this.identity.certificateFingerprint,
        publicKeyFingerprint: this.identity.publicKeyFingerprint,
        shortFingerprint: shortFingerprint(this.identity.publicKeyFingerprint),
        selfOriginRefused: this.refuseSelf
      };
    }
    if (
      !Number.isInteger(input.port) ||
      input.port < 1024 ||
      input.port > 65_535
    ) {
      return refuse('invalid-port');
    }

    const loopback = harnessLoopback();
    const candidate = loopback ? null : chooseTailnetAddress(input.table);
    if (!loopback && candidate === null) return refuse('no-tailnet-address');
    const address = loopback ? '127.0.0.1' : (candidate?.address ?? '');
    if (address.length === 0) return refuse('no-tailnet-address');

    const makeIdentity = input.identity ?? ensureDoorIdentity;
    const outcome = makeIdentity({
      ...(input.identityPath !== undefined ? { path: input.identityPath } : {}),
      names: {
        addresses: [address],
        dnsNames: input.dnsNames ?? []
      }
    });
    if (outcome.kind === 'refused') {
      // The sentence belongs to the identity, which is where the refusal is.
      log.warn(`the door has no certificate: ${outcome.reason}`, {
        reason: outcome.reason
      });
      return { ok: false, reason: 'no-certificate', sentence: outcome.sentence };
    }
    const identity = outcome.identity;
    this.refuseSelf = input.refuseSelfOrigin ?? !loopback;
    // THIS door, as its handler may ask about it. One object per start.
    const admission: DoorAdmission = { stopping: () => this.shuttingDown };

    const server = createServer(
      {
        key: identity.keyPem,
        cert: identity.certPem,
        minVersion: 'TLSv1.2',
        handshakeTimeout: HANDSHAKE_TIMEOUT_MS
      },
      (req, res) => {
        // Tracked from the moment the request is accepted, so `stop()` has
        // something to join. It never rejects.
        const job = Promise.resolve(input.handle(req, res, admission)).then(
          () => undefined,
          () => undefined
        );
        this.inFlight.add(job);
        void job.finally(() => {
          this.inFlight.delete(job);
        });
      }
    );
    server.maxConnections = MAX_CONNECTIONS;
    server.headersTimeout = HEADERS_TIMEOUT_MS;
    server.requestTimeout = REQUEST_TIMEOUT_MS;
    server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
    // Before a header, before the handshake: a socket from this machine is
    // destroyed, and so is every socket once the shutdown has begun.
    server.on('connection', (socket: Socket) => {
      if (this.shuttingDown) {
        socket.destroy();
        return;
      }
      if (this.refuseSelf && isSelfOrigin(socket.remoteAddress, address)) {
        socket.destroy();
      }
    });
    // A malformed request, or a plain http client on an https port, is a
    // closed socket and never a thrown exception in main.
    server.on('clientError', (_err, socket) => {
      socket.destroy();
    });
    server.on('tlsClientError', () => undefined);

    const outcomeOfListen = await new Promise<{ ok: boolean; code: string }>(
      (resolve) => {
        const onError = (err: NodeJS.ErrnoException): void => {
          resolve({ ok: false, code: err.code ?? '' });
        };
        server.once('error', onError);
        // THE ONE BIND CALL IN THIS MODULE. There is no second one and no
        // ephemeral fallback: a port that is taken refuses and never moves.
        server.listen(input.port, address, () => {
          server.off('error', onError);
          resolve({ ok: true, code: '' });
        });
      }
    );
    if (!outcomeOfListen.ok) {
      server.close();
      const reason: DoorRefusalReason =
        outcomeOfListen.code === 'EADDRINUSE'
          ? 'port-taken'
          : outcomeOfListen.code === 'EADDRNOTAVAIL'
            ? 'address-unavailable'
            : 'bind-failed';
      log.warn(`the door did not open: ${reason}`, { reason });
      return refuse(reason);
    }
    // STOPPED WHILE IT WAS OPENING (the Phase 316.1 fix round). The listen is
    // the one await in this method, and a `stop()` that ran inside it found no
    // server to close, because none had been assigned yet. Without this the
    // listener bound here would be assigned to a door nobody holds any more: it
    // would accept TCP, destroy every socket and keep the port, and the next
    // start would refuse `port-taken`, which is a refusal about Tortie itself.
    if (this.shuttingDown) {
      server.close();
      log.warn('the door was stopped while it was opening, so it closed again');
      return refuse('quitting');
    }
    // Never the reason a quit stays alive; the app's own windows do that.
    server.unref();
    // After listen, an error is a socket's and never a throw.
    server.on('error', () => undefined);
    this.server = server;
    this.bound = address;
    this.boundPort = input.port;
    this.identity = identity;
    // What the rest of the domain reads its fingerprint and its material
    // from, held only while something is actually answering with it.
    holdDoorIdentity(identity);
    log.info('the door is open', {
      port: input.port,
      loopback,
      selfOriginRefused: this.refuseSelf
    });
    return {
      ok: true,
      address,
      port: input.port,
      certificateFingerprint: identity.certificateFingerprint,
      publicKeyFingerprint: identity.publicKeyFingerprint,
      shortFingerprint: shortFingerprint(identity.publicKeyFingerprint),
      selfOriginRefused: this.refuseSelf
    };
  }

  /**
   * Close admission, synchronously and with no await, so a socket that
   * arrives between the quit's first line and its bounded join below is
   * destroyed rather than answered. It starts nothing: `stop()` is what
   * joins, and calling this twice is calling it once.
   */
  beginShutdown(): void {
    this.shuttingDown = true;
  }

  /**
   * Shut down as ONE JOINED OPERATION, in `GmuxHookServer.stop`'s order:
   *
   *  1. ADMISSION CLOSES, synchronously, before any await. From this line no
   *     socket is admitted and no accepted request may reach a route.
   *  2. The listener stops accepting and idle keep-alive sockets are cut, so
   *     `close()` can reach its callback.
   *  3. The accepted handlers are JOINED, bounded.
   *  4. Anything still holding a socket after that bound is destroyed, so a
   *     client that never finishes cannot hold a quit open.
   *
   * It never throws and it always resolves. A stopped door is not restarted.
   */
  async stop(): Promise<DoorStopReport> {
    const startedAt = Date.now();
    this.shuttingDown = true;
    const server = this.server;
    this.server = null;
    this.bound = null;
    this.boundPort = 0;
    this.identity = null;
    holdDoorIdentity(null);
    const accepted = this.inFlight.size;
    if (server === null) {
      this.inFlight.clear();
      return { accepted, joined: true, waitedMs: Date.now() - startedAt };
    }
    server.closeIdleConnections?.();
    const closed = new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    const joined = await settleWithin(
      Promise.all([...this.inFlight]).then(() => undefined),
      DOOR_STOP_JOIN_MS
    );
    if (!joined) server.closeAllConnections?.();
    await settleWithin(closed, DOOR_STOP_CLOSE_MS);
    this.inFlight.clear();
    return { accepted, joined, waitedMs: Date.now() - startedAt };
  }
}

function refuse(reason: DoorRefusalReason): DoorStartResult {
  return { ok: false, reason, sentence: DOOR_SENTENCES[reason] };
}

/**
 * The harness loopback override, refused in a packaged build.
 *
 * `app.isPackaged` throws in a unit test, where `electron` is a path string,
 * and a throw here means "not packaged", which is what a test is.
 */
function harnessLoopback(): boolean {
  if (process.env[HARNESS_LOOPBACK_ENV] !== '1') return false;
  try {
    if (app.isPackaged) return false;
  } catch {
    /* not an Electron run */
  }
  return true;
}

// ---------------------------------------------------------------------------
// The one door this process has
// ---------------------------------------------------------------------------

let current: PocketDoor | null = null;
let quitting = false;
let lastRefusal: DoorRefusalReason | null = null;
/**
 * The start in flight, and the door it is starting. Two presses of one switch,
 * or a settings write landing beside a boot, would otherwise both reach the
 * bind and the second would meet the FIRST as a squatter and refuse
 * `port-taken` — a refusal about Tortie itself, which is the one thing that
 * refusal must never mean.
 */
let starting: { readonly door: PocketDoor; readonly run: Promise<DoorStartResult> } | null = null;

/** Open the door. Calling it while it is open answers what is open. */
export async function startPocketDoor(
  input: DoorStartInput
): Promise<DoorStartResult> {
  if (quitting) return refuse('quitting');
  // A START IN FLIGHT FOR A DOOR THAT WAS SINCE STOPPED IS NOT JOINED (the
  // Phase 316.1 fix round). That door closes itself as its listen answers and
  // refuses, so joining it would hand a later press a refusal it did not
  // cause. Wait for it to let go of the port instead, then start afresh.
  while (starting !== null && starting.door !== current) {
    await starting.run.catch(() => undefined);
  }
  if (quitting) return refuse('quitting');
  if (starting !== null) return starting.run;
  const door = current ?? new PocketDoor();
  current = door;
  const run = door.start(input).then((result) => {
    // A door stopped while it was opening answers `quitting` to its own
    // caller. That is this module's last word only when the quit stopped it.
    if (result.ok || current === door || quitting) {
      lastRefusal = result.ok ? null : result.reason;
    }
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

/** What the surface draws. It never carries a key. */
export function pocketDoorStatus(): DoorStatus {
  const door = current;
  const prints = door?.fingerprints ?? null;
  return {
    listening: door?.listening ?? false,
    address: door?.address ?? null,
    port: door?.port ?? 0,
    certificateFingerprint: prints?.certificate ?? null,
    publicKeyFingerprint: prints?.publicKey ?? null,
    shortFingerprint: prints === null ? null : shortFingerprint(prints.publicKey),
    selfOriginRefused: door?.selfOriginRefused ?? true,
    lastRefusal,
    sentence: lastRefusal === null ? null : DOOR_SENTENCES[lastRefusal]
  };
}

/**
 * Close the door a person switched off. The instance is dropped, so the next
 * start constructs a new one rather than reviving a stopped server.
 */
export async function stopPocketDoor(): Promise<DoorStopReport> {
  const door = current;
  current = null;
  if (door === null) return { accepted: 0, joined: true, waitedMs: 0 };
  return door.stop();
}

/**
 * Quit-time admission, closed synchronously by `disposeMainCapabilities` on
 * its first lines, before any await. Nothing turns it back on.
 */
export function beginPocketShutdown(): void {
  quitting = true;
  // Admission closes on the instance too, so a socket that arrives between
  // this line and the join below is destroyed rather than answered. It starts
  // no work: `joinPocketDoor()` is the one that closes and joins.
  current?.beginShutdown();
}

/** True from the first line of `beginPocketShutdown`. */
export function pocketShutdownStarted(): boolean {
  return quitting;
}

/**
 * Admission, as the request handler's own second question.
 *
 * `server.ts`'s handler asks it again after every await, which is the race the
 * 0.98.0 audit named on the hook server: a request that passed every check
 * before the quit began reaches the line after the body read afterwards, and
 * composing an answer there would read main's state during its own disposal.
 */
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

/** Tests only: forget the module's door without touching a real socket. */
export function resetPocketDoorForTests(): void {
  current = null;
  quitting = false;
  lastRefusal = null;
  starting = null;
}
