/**
 * Phase 359, Builder C1 — the private agent-access socket service.
 *
 * WHAT THIS FILE OWNS. Socket ownership (exactly one `listen` at
 * `<userData>/gmux/agent.sock`, 0700 parent, 0600 socket), inode-safe
 * stale cleanup, the single serialized reconcile queue, shutdown/join, and
 * the per-request wiring of `socket.ts` framing into `dispatch.ts`.
 *
 * WHAT IT NEVER DOES. Validate a request body, look up an operation, or
 * project a value: that is `dispatch.ts` and `facts.ts`. Choose filesystem
 * or UI policy: that is Builder C2's injected open handler. No other module
 * calls `net.createServer` for this feature.
 *
 * LIFECYCLE CONTRACT, from build/p359/SPEC.md §2.6:
 * - `installAgentAccess(deps)` wires the service once; the integrator calls
 *   it from `installMainCapabilities` and subscribes `reconcileAgentAccess`
 *   to `onSettingsUpdated`, starting from the current plain boolean setting.
 * - `reconcileAgentAccess(enabled)` serializes off/on races: the latest
 *   requested state wins, and two starts never own two listeners.
 * - `beginAgentAccessShutdown` stops admission synchronously; `joinAgentAccess`
 *   awaits accepted dispatches for at most two seconds, then destroys what
 *   remains. Shutdown only unlinks the socket path when it is still the
 *   exact dev/ino this service created.
 * - macOS `sun_path` guard: a UTF-8 address longer than 103 bytes refuses as
 *   unavailable and is never truncated or hashed.
 */

import { app } from 'electron';
import { chmod, lstat, mkdir, unlink } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { createConnection, type Server, type Socket } from 'node:net';
import { join } from 'node:path';
import {
  AGENT_ACCESS_SOCKET_ENV,
  type AgentAccessCreateHandler,
  type AgentAccessFocusHandler,
  type AgentAccessOpenHandler,
  type AgentAccessOpenProjectHandler,
  type AgentAccessOperation,
  type AgentAccessRenameHandler,
  type AgentAccessResponse
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import { getLog } from '../log';
import { getSettings } from '../settings/store';
import {
  acceptFramedConnections,
  createAgentAccessServer,
  serializeAgentAccessResponse
} from './socket';
import { dispatchAgentAccessRequest } from './dispatch';
import type { AgentAccessStoredSummary } from './facts';

const agentAccessLog = getLog('agent-access');

/** macOS `sun_path` bound: longer refuses as unavailable, never hashed. */
export const AGENT_ACCESS_SOCKET_PATH_MAX_BYTES = 103;

/** Parent directory mode and socket mode, exactly. */
const SOCKET_DIR_MODE = 0o700;
const SOCKET_MODE = 0o600;

/** How long `joinAgentAccess` waits for accepted dispatches before destroying. */
const SHUTDOWN_GRACE_MS = 2_000;

/** What the service reads from the app. Nothing here starts anything. */
export interface AgentAccessDeps {
  /** The plain switch. `getSettings().agentAccess === true`; no seal. */
  isEnabled: () => boolean;
  /** The app's current session list. Async: a sync list would pin a stale core. */
  listSessions: () => Promise<Session[]>;
  /** The app's current project rows. Async: a sync list would pin a stale core. */
  listProjects: () => Promise<Project[]>;
  /** `app.getVersion()`, read at request time. */
  tortieVersion: () => string;
  /** Builder C2's open operation. */
  open: AgentAccessOpenHandler;
  /**
   * PHASE 362. Tortie's own written summary for one session, or null. The
   * installer answers it from the overview store; a build with no store (a
   * harness launch, a cold profile) answers null and the door says
   * `state: 'none'` rather than failing the request.
   */
  readSummary?: (sessionId: string) => AgentAccessStoredSummary | null;
  /**
   * PHASE 362. The acting half, injected exactly as `open` is. The service
   * only hands them to the dispatcher: it validates nothing and chooses no
   * policy. Required, so a build that cannot act says so at compile time
   * rather than answering a closed refusal it invented.
   */
  openProject: AgentAccessOpenProjectHandler;
  create: AgentAccessCreateHandler;
  rename: AgentAccessRenameHandler;
  focus: AgentAccessFocusHandler;
}

/** The exact filesystem address of this profile's door. */
export function agentAccessSocketPath(userDataDir?: string): string {
  const base = userDataDir ?? app.getPath('userData');
  return join(base, 'gmux', 'agent.sock');
}

/** The pane environment carrying the socket address, for delivery. */
export function agentAccessSocketEnv(
  socketPath: string
): Record<typeof AGENT_ACCESS_SOCKET_ENV, string> {
  return { [AGENT_ACCESS_SOCKET_ENV]: socketPath } as Record<
    typeof AGENT_ACCESS_SOCKET_ENV,
    string
  >;
}

/** True when the UTF-8 address fits macOS `sun_path`. */
export function agentAccessSocketPathFits(path: string): boolean {
  return Buffer.byteLength(path, 'utf8') <= AGENT_ACCESS_SOCKET_PATH_MAX_BYTES;
}

interface InFlight {
  socket: Socket;
  finished: boolean;
  /** Set when the dispatch deadline fired and a timeout reply was written. */
  expired: boolean;
  timer: NodeJS.Timeout;
}

let installed: AgentAccessDeps | null = null;
let server: Server | null = null;
let servingSocketPath: string | null = null;
let servingIdentity: { dev: number; ino: number } | null = null;
let shuttingDown = false;
let reconcileChain: Promise<void> = Promise.resolve();
let inFlight: Set<InFlight> = new Set();
let acceptedCount = 0;

/** Canary-free reason words for listener lifecycle lines. */
type ListenerOutcome =
  | 'started'
  | 'stopped'
  | 'already'
  | 'refused-path-too-long'
  | 'refused-not-socket'
  | 'refused-live-owner'
  | 'replaced-stale'
  | 'left-stale-unreadable';

function noteListener(outcome: ListenerOutcome): void {
  agentAccessLog.info('agent access listener changed', { outcome });
}

/** One structured line per completed/refused request. Payload-free by type. */
function reportRequest(entry: {
  operation: AgentAccessOperation | 'unknown';
  outcome: string;
  durationMs: number;
}): void {
  agentAccessLog.info('agent access request finished', {
    operation: entry.operation,
    outcome: entry.outcome,
    durationMs: entry.durationMs
  });
}

/**
 * Narrow the parent directory to 0700, creating it when absent. A file that
 * refuses to narrow is a refusal, never a fallback to a looser directory.
 */
async function prepareSocketDir(dir: string): Promise<boolean> {
  try {
    await mkdir(dir, { recursive: true, mode: SOCKET_DIR_MODE });
  } catch {
    return false;
  }
  try {
    await chmod(dir, SOCKET_DIR_MODE);
  } catch {
    return false;
  }
  return true;
}

async function statOrNull(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch {
    return null;
  }
}

/** True when probing the path proves a live owner answers there. */
async function probeLiveOwner(path: string): Promise<'live' | 'refused' | 'missing'> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (answer: 'live' | 'refused' | 'missing'): void => {
      if (settled) return;
      settled = true;
      resolve(answer);
    };
    let probe: Socket;
    try {
      probe = createConnection({ path });
    } catch {
      done('missing');
      return;
    }
    const timer = setTimeout(() => {
      try {
        probe.destroy();
      } catch {
        /* a dead probe stays dead */
      }
      done('refused');
    }, 500);
    if (typeof timer.unref === 'function') timer.unref();
    probe.on('connect', () => {
      clearTimeout(timer);
      try {
        probe.destroy();
      } catch {
        /* a dead probe stays dead */
      }
      done('live');
    });
    probe.on('error', () => {
      clearTimeout(timer);
      done('refused');
    });
  });
}

/** Dispatch deadlines are separate from the shutdown grace. */
const DISPATCH_DEADLINE_MS = 15_000;
function trackInFlight(socket: Socket, deadlineMs = DISPATCH_DEADLINE_MS): InFlight {
  const record: InFlight = {
    socket,
    finished: false,
    expired: false,
    timer: setTimeout(() => {
      // Answer a closed timeout and mark the request dead so no late verb
      // acts on it. The reply is written, never silently destroyed.
      record.expired = true;
      writeResponseAndEnd(socket, {
        version: 1,
        ok: false,
        error: { code: 'unavailable', message: 'Unavailable.' }
      });
    }, deadlineMs)
  };
  if (typeof record.timer.unref === 'function') record.timer.unref();
  inFlight.add(record);
  return record;
}

function untrackInFlight(record: InFlight): void {
  clearTimeout(record.timer);
  inFlight.delete(record);
}

function writeResponseAndEnd(
  socket: Socket,
  response: AgentAccessResponse
): void {
  const line = serializeAgentAccessResponse(response);
  if (line === null) {
    // A value that cannot fit the 256 KiB cap answers unavailable rather
    // than echoing anything about itself.
    const fallback: AgentAccessResponse = {
      version: 1,
      ok: false,
      error: { code: 'unavailable', message: 'Unavailable.' }
    };
    const fallbackLine = serializeAgentAccessResponse(fallback);
    try {
      if (fallbackLine !== null) socket.write(fallbackLine);
    } catch {
      /* the socket is already gone */
    }
    try {
      socket.end();
    } catch {
      /* the socket is already gone */
    }
    return;
  }
  try {
    socket.write(line);
  } catch {
    /* the socket is already gone */
  }
  try {
    socket.end();
  } catch {
    /* the socket is already gone */
  }
}

/**
 * PHASE 363. THE ONE INSTALLED DISPATCH ENTRY. The socket and the Apple
 * Events adapter both call this, so the dependency mapping, the switch, the
 * caller validation, the handlers and the report line are one set. Answers
 * `unavailable` when nothing is installed or the service is shutting down.
 */
export async function dispatchInstalledAgentAccess(
  line: string,
  opts: { isLive: () => boolean }
): Promise<AgentAccessResponse> {
  const deps = installed;
  if (deps === null || shuttingDown) {
    return {
      version: 1,
      ok: false,
      error: { code: 'unavailable', message: 'Unavailable.' }
    };
  }
  return dispatchAgentAccessRequest(line, {
    isEnabled: deps.isEnabled,
    isLive: opts.isLive,
    listSessions: deps.listSessions,
    listProjects: deps.listProjects,
    tortieVersion: deps.tortieVersion,
    open: deps.open,
    openProject: deps.openProject,
    create: deps.create,
    rename: deps.rename,
    focus: deps.focus,
    readSummary: deps.readSummary ?? (() => null),
    report: reportRequest
  });
}

/**
 * Handle one framed line: dispatch through the operation registry and write
 * exactly one response line, then end. Framing errors answer `bad-request`
 * without reaching the dispatcher.
 */
function handleFramedLine(
  _deps: AgentAccessDeps,
  socket: Socket,
  line: string
): void {
  const record = trackInFlight(socket, DISPATCH_DEADLINE_MS);
  void (async () => {
    let response: AgentAccessResponse;
    try {
      response = await dispatchInstalledAgentAccess(line, {
        // A half-open client may finish sending and still wait for its reply.
        // Read-side EOF is not cancellation; expiry or write-side closure is.
        isLive: () =>
          !record.expired && !socket.destroyed && !socket.writableEnded
      });
    } catch {
      // PHASE 359, reverify follow-up (independent). Dispatch only throws
      // out when the try body assigned nothing, i.e. a handler or a list
      // provider threw before any closed answer existed. The dispatch
      // finally already reported that operation with outcome 'threw', so a
      // second 'unknown' line would violate the one-line rule and re-add the
      // word the fix removed. The client still gets the closed error, which
      // is the documented design (open.ts:365-372: thrown, not returned).
      response = {
        version: 1,
        ok: false,
        error: { code: 'unavailable', message: 'Unavailable.' }
      };
    } finally {
      record.finished = true;
      untrackInFlight(record);
    }
    if (!record.expired) writeResponseAndEnd(socket, response);
  })();
}

function handleFramingError(socket: Socket): void {
  const record = trackInFlight(socket);
  reportRequest({ operation: 'unknown', outcome: 'bad-request', durationMs: 0 });
  untrackInFlight(record);
  writeResponseAndEnd(socket, {
    version: 1,
    ok: false,
    error: { code: 'bad-request', message: 'Malformed request.' }
  });
}

async function stopListeningLocked(): Promise<void> {
  const owned = server;
  server = null;
  servingSocketPath = null;
  servingIdentity = null;
  if (owned === null) return;
  await new Promise<void>((resolve) => {
    try {
      owned.close(() => resolve());
    } catch {
      resolve();
    }
    // A server with no connections calls back at once; one with accepted
    // dispatches still open must not hold the reconcile queue past the
    // same grace the shutdown join uses.
    setTimeout(resolve, SHUTDOWN_GRACE_MS).unref?.();
  });
  try {
    owned.removeAllListeners();
  } catch {
    /* a closed server stays closed */
  }
  noteListener('stopped');
}

/**
 * Start one listener at this profile's exact socket address, or refuse.
 *
 * Existing paths: a non-socket is never unlinked; a live socket refuses as
 * another owner and is never unlinked; a stale socket is unlinked only when
 * its dev/ino still match the re-read, then exactly one listen follows. No
 * pattern deletion and no directory sweep, ever.
 */
async function startListeningLocked(socketPath: string): Promise<void> {
  if (!agentAccessSocketPathFits(socketPath)) {
    noteListener('refused-path-too-long');
    return;
  }
  const dir = join(socketPath, '..');
  if (!(await prepareSocketDir(dir))) return;
  const existing = await statOrNull(socketPath);
  if (existing !== null) {
    if (!existing.isSocket()) {
      noteListener('refused-not-socket');
      return;
    }
    const probe = await probeLiveOwner(socketPath);
    if (probe === 'live') {
      noteListener('refused-live-owner');
      return;
    }
    if (probe === 'missing') {
      noteListener('left-stale-unreadable');
      return;
    }
    const reread = await statOrNull(socketPath);
    if (
      reread === null ||
      !reread.isSocket() ||
      reread.dev !== existing.dev ||
      reread.ino !== existing.ino
    ) {
      noteListener('left-stale-unreadable');
      return;
    }
    try {
      await unlink(socketPath);
    } catch {
      noteListener('left-stale-unreadable');
      return;
    }
    noteListener('replaced-stale');
  }
  const deps = installed;
  if (deps === null || shuttingDown) return;
  // PHASE 362. THE FACTORY, NOT `createServer()`. `createAgentAccessServer`
  // is the one place `allowHalfOpen: true` is set, and a piped caller
  // (`printf ... | nc -U ...`) finishes its write side the moment the line is
  // sent: without the flag, every operation that awaited anything wrote its
  // answer into a socket the server had already ended, and the caller saw an
  // empty EOF. See ./socket.ts for the measurement.
  const next = createAgentAccessServer();
  acceptFramedConnections(next, {
    onLine: (socket, line) => handleFramedLine(deps, socket, line),
    onFramingError: (socket) => handleFramingError(socket)
  });
  await new Promise<void>((resolve, reject) => {
    next.on('error', reject);
    next.listen(socketPath, () => {
      next.removeListener('error', reject);
      resolve();
    });
  }).catch(() => {
    try {
      next.removeAllListeners();
    } catch {
      /* a failed server stays failed */
    }
    return undefined;
  });
  if (installed === null || shuttingDown) {
    try {
      next.close();
    } catch {
      /* a stillborn server stays stillborn */
    }
    return;
  }
  try {
    await chmod(socketPath, SOCKET_MODE);
  } catch {
    try {
      next.close();
    } catch {
      /* a world-readable socket never serves */
    }
    return;
  }
  const identity = await statOrNull(socketPath);
  if (identity === null || !identity.isSocket()) {
    try {
      next.close();
    } catch {
      /* a socket that is not a socket never serves */
    }
    return;
  }
  server = next;
  servingSocketPath = socketPath;
  servingIdentity = { dev: identity.dev, ino: identity.ino };
  noteListener('started');
}

/** Install the service once. Called from `installMainCapabilities`. */
export function installAgentAccess(deps: AgentAccessDeps): void {
  installed = deps;
  shuttingDown = false;
}

/**
 * Reconcile the listener with the latest plain boolean switch. Calls serialize on
 * one queue so off/on races resolve to the latest requested state, and two
 * starts never own two listeners.
 */
export function reconcileAgentAccess(enabled: boolean): void {
  reconcileChain = reconcileChain.then(async () => {
    if (installed === null || shuttingDown) return;
    const want = enabled && installed !== null;
    const socketPath = agentAccessSocketPath();
    if (!want) {
      if (server !== null) await stopListeningLocked();
      return;
    }
    if (server !== null) return;
    // Off raced on while queued: the latest requested state wins.
    if (!getSealedSwitchNow()) {
      return;
    }
    await startListeningLocked(socketPath);
  });
  void reconcileChain.catch(() => {
    /* reconciliation never throws into the settings subscriber */
  });
}

function getSealedSwitchNow(): boolean {
  try {
    return getSettings().agentAccess === true;
  } catch {
    return false;
  }
}

/** Stop admission synchronously. First line of the ordered disposer. */
export function beginAgentAccessShutdown(): void {
  shuttingDown = true;
  const owned = server;
  server = null;
  if (owned !== null) {
    try {
      owned.close();
    } catch {
      /* a closing server stays closing */
    }
  }
  for (const record of inFlight) {
    if (record.finished) continue;
    try {
      record.socket.destroy();
    } catch {
      /* a dying socket stays dying */
    }
  }
}

/**
 * Await accepted dispatches for at most two seconds, then destroy what
 * remains. Unlinks the socket path only when it is still the exact dev/ino
 * this service created.
 */
export async function joinAgentAccess(): Promise<{
  accepted: number;
  joined: boolean;
  waitedMs: number;
}> {
  const startedAt = Date.now();
  const deadline = startedAt + SHUTDOWN_GRACE_MS;
  while (inFlight.size > 0 && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  let joined = inFlight.size === 0;
  for (const record of inFlight) {
    try {
      record.socket.destroy();
    } catch {
      /* a dying socket stays dying */
    }
    clearTimeout(record.timer);
  }
  inFlight = new Set();
  const path = servingSocketPath;
  const identity = servingIdentity;
  servingSocketPath = null;
  servingIdentity = null;
  if (path !== null && identity !== null) {
    const current = await statOrNull(path);
    if (
      current !== null &&
      current.isSocket() &&
      current.dev === identity.dev &&
      current.ino === identity.ino
    ) {
      try {
        await unlink(path);
      } catch {
        joined = false;
      }
    }
  }
  const waitedMs = Date.now() - startedAt;
  return { accepted: acceptedCount, joined, waitedMs };
}

/** Test-only: reset module state between isolated cases. */
export function resetAgentAccessForTests(): void {
  installed = null;
  server = null;
  servingSocketPath = null;
  servingIdentity = null;
  shuttingDown = false;
  reconcileChain = Promise.resolve();
  inFlight = new Set();
  acceptedCount = 0;
}
