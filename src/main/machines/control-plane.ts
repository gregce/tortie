/**
 * One live connection per machine, and the link state every surface reads
 * (Phase 71, M4, research 51 sections 4.1 and 4.4).
 *
 * ## What this replaces
 *
 * Phase 70 asked every machine for its list on a timer, at 5,000 ms in front and
 * 30,000 ms behind. A timer is a guess about when something happened. This
 * module opens the connection research 51 section 4.1's CONTROL row describes,
 * so a machine TELLS Tortie that a session was created, killed or renamed, and
 * the list is read because something happened rather than because a clock ticked.
 *
 * The carriage is one line, and it is the same composer the exec plane and the
 * attach plane use:
 *
 *     <ssh> <the nine carriage options> <host> \
 *       '<that machine's tmux> -L <socket> -f /dev/null -C new-session -A -s gmux-control'
 *
 * `-f /dev/null` is one flag more than section 4.1 shows. `remoteTmuxArgv` puts
 * it on every remote command, and `-C new-session` creates a server when none is
 * running, so a server born here would otherwise read that machine's own
 * configuration file. Phase 70 recorded the same one flag for the ATTACH row for
 * the same reason, and this rung reuses that composer rather than writing a
 * second one. A second composer is a second place a carriage option can be
 * dropped, and a dropped keepalive is a link that hangs instead of ending.
 *
 * `-u` is NOT on this carriage, and that is measured rather than chosen.
 * `build/probe-control-dialect.mjs` step 8 opened the same server twice, once
 * with the flag and once without, and the two streams were 106 bytes each and
 * identical. The attach carriage does carry `-u`, because there the flag decides
 * whether a pane gets ASCII substitutes for its glyphs (Bug C, Phase 9.2). The
 * two planes differ and the difference is written down.
 *
 * ## One connection per MACHINE, never per session
 *
 * A machine with forty sessions has one connection. The client is the event bus,
 * not a renderer: `refresh-client -f no-output` is the first command it sends,
 * exactly as the local one does, so no pane output ever crosses this link.
 *
 * ## Why the precheck is a read and never `ensureServer`
 *
 * Research 51 section 3 states the rule: a remote reconnect must never call a
 * local `ensureServer()`. Without that rule a machine that went to sleep would
 * have started a tmux server on THIS Mac on every backoff step, forever.
 *
 * The precheck here is ONE cheap command over the exec plane,
 * `display-message -p '#{version}'`, and it does three jobs at once:
 *
 *  1. It proves the link is up, which is what a precheck is for.
 *  2. It proves that machine's server is RUNNING. This is load bearing. A
 *     `-C new-session -A` against a machine with no server would CREATE one,
 *     with `-f /dev/null` and therefore with tmux's own `exit-empty on` and none
 *     of the options `resources/gmux-tmux.conf` declares. `ensureRemoteServer`
 *     is the one place a server on another machine is allowed to be born,
 *     because it is the one place those options are asserted.
 *  3. It reads the version, which is what {@link decideRemoteControlGate} needs.
 *
 * ## No cycle with `./remote-sessions.ts`
 *
 * This module never imports the feed. The feed hands it a context and registers
 * a sink, and this module calls back into that sink. The alternative, importing
 * `readyRemoteContext` from there, would make the two modules a cycle, and
 * `./ssh.ts` records in its own header why this codebase keeps them apart.
 */

import { getLog } from '../log';
import { gmuxError } from '../errors';
import {
  CONTROL_ATTACH_ARGS,
  TmuxControlClient,
  type ControlTransport
} from '../tmux/control-client';
import {
  decideRemoteControlGate,
  joinVersionList,
  parseTmuxVersion
} from '../tmux/version';
import {
  machineContext,
  machineGeneration,
  tmuxCommand,
  type RemoteMachineContext,
  type SpawnPlan
} from './context';
import { execOn } from './exec-plane';

const machinesLog = getLog('config');

/**
 * How long the precheck gets before Tortie gives up on this attempt.
 *
 * 5,000 ms. It is half the exec plane's default, because this command stands in
 * front of a connection the person is waiting on rather than in front of work
 * they asked for, and a machine that will not answer a one line read in five
 * seconds is one the timer feed should carry for now.
 */
export const CONTROL_PRECHECK_TIMEOUT_MS = 5_000;

/**
 * The refusal when a machine's version has no control measurement.
 *
 * Pinned by `build/assert-bundle-refusals.mjs` as
 * `machine.control-dialect-unmeasured`. It is not an error a person has to act
 * on: the machine still works, on the timer feed, and the sentence says exactly
 * that. It names no program and no protocol, because neither is a thing the
 * person chose.
 */
export const CONTROL_DIALECT_UNMEASURED =
  'Tortie has not measured how this machine speaks over a live connection, so ' +
  'it asks the machine for its list on a timer instead. Nothing was changed on ' +
  'either machine.';

// ---------------------------------------------------------------------------
// The link, as a surface reads it
// ---------------------------------------------------------------------------

export type MachineLinkKind =
  /** A live control connection. */
  | 'connected'
  /** Answering, on the timer feed. */
  | 'polling'
  /** Signing in right now. */
  | 'connecting'
  /** Confirmed, and the last attempt got no answer. */
  | 'quiet'
  /** The gate or the version list said no. */
  | 'refused';

export interface MachineLinkFacts {
  readonly machineId: string;
  readonly link: MachineLinkKind;
  /** True once any list completed for this machine in this run. */
  readonly everAnswered: boolean;
  /** Local epoch ms of the last completed list, or null. */
  readonly lastAnsweredAt: number | null;
  /** Why the link is not connected. One clause, no transport words. */
  readonly reason: string | null;
}

/** What this module remembers about one machine. */
interface LinkRecord {
  link: MachineLinkKind;
  everAnswered: boolean;
  lastAnsweredAt: number | null;
  reason: string | null;
}

const links = new Map<string, LinkRecord>();
const clients = new Map<string, TmuxControlClient>();

let linkListeners: (() => void)[] = [];

function recordOf(machineId: string): LinkRecord {
  const found = links.get(machineId);
  if (found !== undefined) return found;
  const fresh: LinkRecord = {
    link: 'connecting',
    everAnswered: false,
    lastAnsweredAt: null,
    reason: 'has not answered since Tortie started'
  };
  links.set(machineId, fresh);
  return fresh;
}

function announceLink(): void {
  for (const listener of [...linkListeners]) listener();
}

/** Subscribe to link state changes. Returns the unsubscribe. */
export function onMachineLinkChanged(listener: () => void): () => void {
  linkListeners.push(listener);
  return () => {
    linkListeners = linkListeners.filter((one) => one !== listener);
  };
}

/** What is known about one machine's link. A machine nobody touched reads quiet. */
export function machineLinkFacts(machineId: string): MachineLinkFacts {
  const record = links.get(machineId);
  if (record === undefined) {
    return {
      machineId,
      link: 'quiet',
      everAnswered: false,
      lastAnsweredAt: null,
      reason: 'has not been signed in to in this run'
    };
  }
  return {
    machineId,
    link: record.link,
    everAnswered: record.everAnswered,
    lastAnsweredAt: record.lastAnsweredAt,
    reason: record.reason
  };
}

/** Every machine this run has touched, oldest id first. */
export function everyMachineLinkFacts(): readonly MachineLinkFacts[] {
  return [...links.keys()].sort().map((id) => machineLinkFacts(id));
}

function setLink(
  machineId: string,
  link: MachineLinkKind,
  reason: string | null
): void {
  const record = recordOf(machineId);
  if (record.link === link && record.reason === reason) return;
  record.link = link;
  record.reason = reason;
  announceLink();
}

/** Tortie is signing in to this machine right now. */
export function noteMachineConnecting(machineId: string): void {
  const record = recordOf(machineId);
  if (record.link === 'connected') return;
  setLink(
    machineId,
    'connecting',
    record.everAnswered ? null : 'has not answered since Tortie started'
  );
}

/**
 * A list completed for this machine.
 *
 * `at` is the moment the command was ISSUED rather than the moment its answer
 * arrived, per research 51 section 4.4's clock rule, so a slow link does not make
 * a fresh answer look older than it is.
 */
export function noteMachineAnswered(machineId: string, at: number): void {
  const record = recordOf(machineId);
  record.everAnswered = true;
  record.lastAnsweredAt = at;
  const live = clients.get(machineId)?.connected === true;
  setLink(machineId, live ? 'connected' : 'polling', null);
  announceLink();
}

/** The machine did not answer. */
export function noteMachineQuiet(machineId: string, reason: string): void {
  setLink(machineId, 'quiet', reason);
}

/**
 * The gate said no, so Tortie will not sign in to this machine at all.
 *
 * The one caller that knows is the code reading a prepare result, because an
 * unmeasured EXEC version means nothing was started on that machine. An
 * unmeasured CONTROL dialect is a different thing and is NOT refused: the
 * machine keeps the timer feed and its link reads `polling`.
 */
export function noteMachineRefused(machineId: string, reason: string): void {
  setLink(machineId, 'refused', reason);
}

// ---------------------------------------------------------------------------
// The sink the feed registers
// ---------------------------------------------------------------------------

/**
 * What the feed wants to hear about. This module composes no copy and holds no
 * session row, so everything it learns goes straight back out through here.
 */
export interface ControlPlaneSink {
  /** The connection reached connected. Clear the timer and list once, now. */
  connected(machineId: string): void;
  /** A session was created or destroyed on that machine. List once. */
  sessionsChanged(machineId: string): void;
  /** A session was renamed on that machine. List once. */
  sessionRenamed(machineId: string): void;
  /** The connection went. Arm the timer and write `unknown` on every row. */
  lost(machineId: string, reason: string): void;
}

let sink: ControlPlaneSink | null = null;

/** Register the one sink. A second call replaces the first. */
export function setControlPlaneSink(next: ControlPlaneSink | null): void {
  sink = next;
}

// ---------------------------------------------------------------------------
// The transport
// ---------------------------------------------------------------------------

/**
 * The context for a machine, re-resolved on every reconnect.
 *
 * It is re-read rather than captured because a machine can be prepared again
 * between two reconnect attempts, and a captured context would hold the previous
 * connection's control socket name.
 *
 * It asks the same three questions `readyRemoteContext` asks in
 * `./remote-sessions.ts`, and it asks them here rather than importing that
 * function because the feed imports this module. `./ssh.ts` records in its own
 * header why this codebase keeps two modules from forming a cycle. The three
 * questions are the whole of the duplication and a test compares the two answers.
 */
export function remoteContextFor(machineId: string): RemoteMachineContext {
  const ctx = machineContext(machineId);
  if (ctx.kind !== 'remote') {
    throw gmuxError(
      'INVALID_INPUT',
      `${machineId} resolved to this Mac rather than to a machine`
    );
  }
  if (machineGeneration(machineId).remotePath === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `no program search list is recorded for ${machineId}'s current connection`
    );
  }
  return ctx;
}

/** The transport for one machine's control connection. */
export function remoteControlTransport(machineId: string): ControlTransport {
  return {
    machineId,
    async precheck(): Promise<void> {
      const ctx = remoteContextFor(machineId);
      const printed = await execOn(ctx, ['display-message', '-p', '#{version}'], {
        timeoutMs: CONTROL_PRECHECK_TIMEOUT_MS
      });
      assertControlDialectMeasured(machineId, parseTmuxVersion(printed));
    },
    async plan(): Promise<SpawnPlan> {
      return Promise.resolve(
        tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)
      );
    },
    env(): NodeJS.ProcessEnv {
      return process.env;
    }
  };
}

/**
 * Ask the control gate about one version, and refuse when it has no measurement.
 *
 * Exported so `GMUX_SMOKE` modes and the unit tests can watch the refusal fire.
 * A refusal nobody has watched fire is not a refusal.
 *
 * @throws GmuxError INVALID_INPUT with {@link CONTROL_DIALECT_UNMEASURED}
 */
export function assertControlDialectMeasured(
  machineId: string,
  version: string | null
): string {
  const gate = decideRemoteControlGate(version);
  if (gate.kind === 'measured') return gate.version;
  throw gmuxError(
    'INVALID_INPUT',
    CONTROL_DIALECT_UNMEASURED,
    `${machineId} reports ${version ?? 'no version at all'} and this release ` +
      `has measured the live connection for ` +
      `${joinVersionList(gate.supported)}`
  );
}

// ---------------------------------------------------------------------------
// Open and close
// ---------------------------------------------------------------------------

/**
 * Open one machine's control connection, or answer false and change nothing.
 *
 * The order is fixed and every step is where it is on purpose:
 *
 *  1. One connection per machine. A second call for a machine that already has
 *     one returns true and starts nothing.
 *  2. The context. A machine Tortie has not signed in to in this run has none,
 *     so nothing is opened and nothing is sent.
 *  3. The precheck, which is the link test, the server test and the version read
 *     in one command.
 *  4. The control gate. An unmeasured dialect returns false and NOTHING is
 *     opened, so that machine keeps the timer feed.
 *  5. Start the client, which composes its plan through the one composer.
 *
 * It never throws. A machine that cannot be reached is a fact a surface draws,
 * not an error a caller has to catch, and the feed's fallback is the timer.
 */
export async function openControlPlane(machineId: string): Promise<boolean> {
  if (clients.has(machineId)) return true;
  noteMachineConnecting(machineId);

  let ctx: RemoteMachineContext;
  try {
    ctx = remoteContextFor(machineId);
  } catch (err) {
    machinesLog.info(
      `no live connection was opened to ${machineId}: ${(err as Error).message}`
    );
    return false;
  }

  let version: string | null = null;
  try {
    const printed = await execOn(ctx, ['display-message', '-p', '#{version}'], {
      timeoutMs: CONTROL_PRECHECK_TIMEOUT_MS
    });
    version = parseTmuxVersion(printed);
  } catch (err) {
    machinesLog.info(
      `${machineId} did not answer the read that stands in front of a live ` +
        `connection, so it stays on the timer: ${(err as Error).message}`
    );
    return false;
  }

  const gate = decideRemoteControlGate(version);
  if (gate.kind !== 'measured') {
    setLink(machineId, 'polling', 'runs a version Tortie has not measured');
    machinesLog.info(
      `${machineId} reports ${version ?? 'no version at all'}, and this release ` +
        `has measured a live connection for ` +
        `${joinVersionList(gate.supported) || 'no version at all'}. It keeps the ` +
        `timer feed and nothing was changed on either machine.`
    );
    return false;
  }

  const client = new TmuxControlClient(remoteControlTransport(machineId));
  clients.set(machineId, client);
  wire(machineId, client);
  try {
    await client.start();
  } catch (err) {
    // start() schedules its own retry, so the client stays in the map and the
    // backoff carries it. The feed's timer is what covers the gap.
    machinesLog.info(
      `the live connection to ${machineId} did not open on the first try: ` +
        `${(err as Error).message}`
    );
  }
  return true;
}

function wire(machineId: string, client: TmuxControlClient): void {
  client.on('connected', () => {
    setLink(machineId, 'connected', null);
    machinesLog.info(`${machineId} is on a live connection.`);
    sink?.connected(machineId);
  });
  client.on('sessions-changed', () => {
    sink?.sessionsChanged(machineId);
  });
  client.on('session-renamed', () => {
    sink?.sessionRenamed(machineId);
  });
  client.on('disconnected', () => {
    // ONE handler for a child that exited and for %exit, and they are treated
    // the same on purpose. Both mean the feed is gone, and the honest answer for
    // every row on that machine is `unknown` rather than a status the last
    // answer happened to leave behind. Research 51 section 4.4.
    const record = recordOf(machineId);
    setLink(
      machineId,
      'quiet',
      record.everAnswered
        ? 'did not answer the last time Tortie asked'
        : 'has not answered since Tortie started'
    );
    sink?.lost(machineId, 'the live connection ended');
  });
  client.on('error', (err) => {
    machinesLog.warn(`the live connection to ${machineId}: ${err.message}`);
  });
}

/** Close one machine's connection. Nothing is sent to that machine. */
export function closeControlPlane(machineId: string): void {
  const client = clients.get(machineId);
  if (client === undefined) return;
  clients.delete(machineId);
  client.removeAllListeners();
  client.stop();
  const record = recordOf(machineId);
  if (record.link === 'connected') {
    setLink(machineId, 'polling', 'is not on a live connection');
  }
}

/** Close every connection. Called from the session core's dispose. */
export function closeEveryControlPlane(): void {
  for (const machineId of [...clients.keys()]) closeControlPlane(machineId);
}

/** True when this machine has a connection that reached connected. */
export function isControlPlaneLive(machineId: string): boolean {
  return clients.get(machineId)?.connected === true;
}

/** How many connections are open. One per machine, never per session. */
export function openControlPlaneCount(): number {
  return clients.size;
}

/** Drop every client, every link record and the sink. Tests and the smoke. */
export function resetControlPlanesForTests(): void {
  closeEveryControlPlane();
  links.clear();
  linkListeners = [];
  sink = null;
}
