/**
 * Prepare this machine (Phase 69, M2). The one production caller of the exec
 * plane, and the first thing Tortie ever starts on another computer.
 *
 * ## Why this exists rather than only a harness
 *
 * Without a production caller the whole rung would be provable by harness alone,
 * which does not meet the Tier 3 bar the charter sets for anything touching
 * durability. One button gives the rung a caller a person presses, in the real
 * app, with the real gate and the real keychain in front of it.
 *
 * ## The order, and every step is where it is on purpose
 *
 *  1. `assertMachineMayConnect`. An unconfirmed machine, a machine whose details
 *     moved, and a record whose seal cannot be read all refuse HERE, before any
 *     process exists.
 *  2. Build and register the context. This is where the control socket name is
 *     composed and where the connection's first generation starts.
 *  3. Read the version over the plane. `display-message -p '#{version}'` first,
 *     and the no-server answer is not a failure at this step: a machine with
 *     nothing running on it cannot report a version, so the program's own `-V` is
 *     read instead.
 *  4. `decideRemoteVersionGate`. An unmeasured version stops here and NOTHING is
 *     started on that machine. That ordering is deliberate and
 *     `build/probe-execplane.mjs` records the argv sequence to prove it.
 *     PHASE 83 GAVE THE GATE A FOURTH ANSWER. A person may accept one version
 *     for one machine, and an accepted version proceeds to step 5 with the
 *     success copy saying plainly that Tortie measured nothing. An acceptance
 *     that names a different version from the one the machine reports now is a
 *     refusal of its own, so an acceptance of 3.8a does not carry to 3.9a.
 *  5. `ensureRemoteServer`. Boot, PATH capture, options, read back.
 *  5a. PHASE 84. Start the machine's feed, which is what makes its sessions
 *     appear. Before this phase Prepare reported success and started nothing
 *     that reads the machine's list, so a machine asleep at launch stayed
 *     unread for the whole run and the badge sent the person to the button that
 *     could not fix it. A feed that will not start does not fail the prepare.
 *  6. Compose one class, one headline and one detail, all in main.
 *
 * ## What it is not, and why the connection test was left alone
 *
 * The connection test stays the read only `command -v` probe it is. Starting a
 * durable server from a button labelled "Test the connection" would surprise a
 * person about what is now running on their machine, and surprising a person
 * about that is what the whole confirm gate exists to prevent. So Prepare is its
 * own button and it says what it will do before it does it.
 */

import { app } from 'electron';
import { homedir } from 'node:os';
import { getLog } from '../log';
import { GmuxError } from '../errors';
import {
  decideRemoteVersionGate,
  joinVersionList,
  parseTmuxVersion,
  TESTED_REMOTE_TMUX_VERSIONS
} from '../tmux/version';
import type { MachinePrepareResult, MachineTestClass } from '@shared/ipc';
import {
  buildRemoteMachineContext,
  registerRemoteMachineContext,
  machineGeneration,
  type RemoteMachineContext
} from './context';
import { execOn, execRemoteShell } from './exec-plane';
import { shellQuoteArgv } from '../restore/command';
import {
  MACHINE_FEED_NOT_STARTED,
  MACHINE_VERSION_ACCEPT_MISMATCH,
  MACHINE_VERSION_ACCEPT_OFFER,
  classifyMachineOutput,
  composeOutcomeCopy
} from './errors';
import { ensureRemoteServer } from './remote-server';
// PHASE 84, item 4. Preparing a machine is what makes its sessions visible, and
// until this phase it started nothing that reads them. `startMachineFeed` is a
// no-op for a machine that already has one, so calling it here and at the launch
// sign in is one feed rather than two.
import { startMachineFeed } from './remote-sessions';
// PHASE 109. One batched read of which agents the machine has, started on
// the prepared arm with `void`, so the answer is warm before any create
// sheet opens and nothing a person waits on waits for it.
import { scanMachineAgents } from './machine-agents';
import { describeMachine, type MachineExecutionFields } from './confirm';

const machinesLog = getLog('config');

/** How long the version read gets. Short, because a hang is the failure it stops. */
export const REMOTE_VERSION_TIMEOUT_MS = 10_000;

/** What the caller hands over, so this module reads no store and no Electron path. */
export interface PrepareInput {
  readonly machineId: string;
  readonly fields: MachineExecutionFields;
  /** Tortie's own identity record file. Named first on every command. */
  readonly tortieHostKeys: string;
  /**
   * Tortie's own key for this machine, or null (Phase 84, item 7).
   *
   * Handed over rather than looked up, for the reason `tortieHostKeys` is: this
   * module reads no store. `./ipc.ts` is the caller that knows.
   */
  readonly identityFile?: string | null;
  /**
   * The label the person typed for this machine, or null (Phase 109).
   *
   * Handed over rather than looked up, for the reason the two above are. It
   * goes onto the context so a refusal composed one machine away can name
   * the machine the way the person named it. It reaches no argv and no hash.
   */
  readonly label?: string | null;
  readonly packaged?: boolean;
  readonly env?: NodeJS.ProcessEnv;
  readonly home?: string;
  readonly uid?: number;
}

/**
 * What the two version reads learned. Three answers, and the third is the one
 * Phase 71 added.
 *
 * `unreached` exists because the first build had no way to say it. Both reads
 * were caught, both returned null, and null was read as "the program would not
 * report its version". Tortie then told the person, about a machine that was
 * switched off, that the program at a named path on it would not identify
 * itself. Nothing had reached that machine, so nothing had been learned about
 * any program on it, and the sentence was false. MEASURED 2026-08-17 with the
 * scratch sshd killed: the log read "partitionmachine reports tmux nothing at
 * all" and the person's sentence named the path.
 */
export type RemoteVersionRead =
  /** The machine answered and named a version. */
  | { readonly kind: 'version'; readonly version: string }
  /** The machine answered and the program named no version Tortie could read. */
  | { readonly kind: 'unreadable' }
  /** Nothing reached the machine. Nothing was learned about any program on it. */
  | { readonly kind: 'unreached'; readonly cls: MachineTestClass; readonly detail: string };

/**
 * The failure classes that mean the sign in program never got there.
 *
 * `no-server` is deliberately absent: that text comes from tmux on a machine
 * that DID answer, which is the ordinary state of a machine nobody has prepared,
 * and the second read is what settles it.
 */
const UNREACHED_CLASSES: readonly MachineTestClass[] = [
  'unreachable',
  'refused',
  'not-resolved',
  'auth-refused',
  // Phase 79.1 fix round. The machine answered and asked for a password, so
  // the sign in never completed and nothing was learned about any program on
  // it. It belongs beside `auth-refused` and not beside `no-server`.
  'password-required',
  'host-key-changed',
  'client-missing',
  'timed-out'
];

/**
 * Read the version of the program on that machine.
 *
 * Two reads, in this order, and the second is not a fallback for a broken first
 * one. `display-message -p '#{version}'` asks the SERVER, and it is the read that
 * answers on a server holding zero sessions (measured in the header of
 * `../tmux/version.ts`). A machine with no server at all cannot answer it, so the
 * program's own `-V` is read instead, which contacts nothing and starts nothing.
 *
 * The SECOND read decides whether the machine was reached, because it is the one
 * that runs on a machine with nothing of Tortie's on it. A failure the taxonomy
 * recognises as the sign in program's own is `unreached`, and the caller then
 * says what is true, which is that Tortie could not reach the machine.
 */
export async function readRemoteTmuxVersion(
  ctx: RemoteMachineContext
): Promise<RemoteVersionRead> {
  try {
    const out = await execOn(ctx, ['display-message', '-p', '#{version}'], {
      timeoutMs: REMOTE_VERSION_TIMEOUT_MS
    });
    const parsed = parseTmuxVersion(out);
    if (parsed !== null) return { kind: 'version', version: parsed };
  } catch {
    // A machine with nothing of Tortie's running on it lands here, and that is
    // the ordinary case for a machine nobody has prepared.
  }
  try {
    // `<program> -V` contacts no server and starts no server, so it is the read
    // that answers on a machine with nothing running on it. It is not a tmux
    // verb, so it goes over the login shell door rather than the verb door, and
    // the verb ledger is not the thing that governs it. The path is the one the
    // confirm hash bound, quoted with the one quoting helper in this process.
    const out = await execRemoteShell(
      ctx,
      shellQuoteArgv([ctx.remoteTmuxPath, '-V']),
      { timeoutMs: REMOTE_VERSION_TIMEOUT_MS }
    );
    const parsed = parseTmuxVersion(out);
    return parsed === null ? { kind: 'unreadable' } : { kind: 'version', version: parsed };
  } catch (err) {
    const cls = classOfFailure(err);
    if (UNREACHED_CLASSES.includes(cls)) {
      return { kind: 'unreached', cls, detail: sentenceOf(err) };
    }
    return { kind: 'unreadable' };
  }
}

/**
 * Prepare one machine, and answer with one class and one piece of copy.
 *
 * It never throws for a machine level failure. A refusal from the gate, a machine
 * that cannot be reached and a version nobody measured all come back as a result
 * carrying the class and the sentence, because the surface has to draw them and a
 * thrown error would arrive there as a bare message with no class beside it.
 */
export async function prepareMachine(
  input: PrepareInput
): Promise<MachinePrepareResult> {
  const startedAt = Date.now();
  const supported = TESTED_REMOTE_TMUX_VERSIONS.filter(
    (row) => row.measured.exec
  ).map((row) => row.version);
  const base = {
    id: input.machineId,
    version: null as string | null,
    supported,
    serverBorn: false,
    options: [],
    pathCaptured: false,
    // PHASE 83. Null on every outcome but the two that offer a sheet, because a
    // machine Tortie measured needs no acceptance and a machine that would not
    // name a version has nothing for an acceptance to bind to.
    acceptSheet: null as MachinePrepareResult['acceptSheet']
  };

  let ctx: RemoteMachineContext;
  try {
    // Step 1 and 2. The gate is inside buildRemoteMachineContext and it is asked
    // before anything is composed, so an unconfirmed machine has no context at all.
    ctx = registerRemoteMachineContext(
      buildRemoteMachineContext({
        machineId: input.machineId,
        fields: input.fields,
        packaged: input.packaged ?? app.isPackaged,
        env: input.env ?? process.env,
        home: input.home ?? homedir(),
        uid: input.uid ?? process.getuid?.() ?? 0,
        tortieHostKeys: input.tortieHostKeys,
        identityFile: input.identityFile ?? null,
        // Phase 109. The name a far side refusal calls this machine.
        label: input.label ?? null
      })
    );
  } catch (err) {
    return {
      ...base,
      class: 'unknown',
      alarm: false,
      headline: 'Tortie will not sign in to this machine.',
      detail: sentenceOf(err),
      durationMs: Date.now() - startedAt
    };
  }

  // Step 3 and 4. The version is read BEFORE any server is started, so a machine
  // running a version nobody measured never has anything started on it.
  const read = await readRemoteTmuxVersion(ctx);

  // A machine nothing reached is reported as a machine nothing reached. It is
  // said here, before the version gate, because the gate's whole vocabulary is
  // about a program Tortie looked at and there was no program to look at.
  if (read.kind === 'unreached') {
    const copy = composeOutcomeCopy(read.cls, { lastLine: read.detail });
    machinesLog.warn(
      `${input.machineId} could not be reached, so nothing was learned about ` +
        `any program on it: ${read.detail}`
    );
    return {
      ...base,
      version: null,
      class: read.cls,
      alarm: copy.alarm,
      headline: copy.headline,
      detail: copy.detail,
      durationMs: Date.now() - startedAt
    };
  }

  const version = read.kind === 'version' ? read.version : null;
  const accepted = ctx.acceptedTmuxVersion ?? null;

  /**
   * The sheet a person reads to accept the version this machine reports.
   *
   * It is `describeMachine` over the row's own fields with the accepted version
   * set to what the machine reported, so the hash on it is the hash
   * `machines:acceptVersion` recomputes before it writes anything. A machine
   * that named no version gets no sheet, because there is nothing to bind an
   * acceptance to.
   */
  const sheetFor = (
    reported: string | null
  ): MachinePrepareResult['acceptSheet'] => {
    if (reported === null) return null;
    const summary = describeMachine(input.machineId, {
      ...input.fields,
      acceptedTmuxVersion: reported
    });
    return {
      hash: summary.hash,
      lines: [...summary.lines],
      warning: summary.warning
    };
  };

  // PHASE 83. The arm that stops an acceptance carrying to the next version.
  // It is asked BEFORE the gate, because the gate answers `unmeasured` for this
  // case and the plain unmeasured sentence would not say what actually
  // happened, which is that the program on that machine is not the program the
  // person accepted.
  if (accepted !== null && version !== null && accepted !== version) {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: ctx.remoteTmuxPath,
      version,
      supportedPhrase: joinVersionList(supported)
    });
    machinesLog.warn(
      `${input.machineId} reports tmux ${version} and the version accepted for ` +
        `it is ${accepted}, so nothing was started`
    );
    return {
      ...base,
      version,
      class: 'version-unmeasured',
      alarm: copy.alarm,
      headline: copy.headline,
      detail: `${MACHINE_VERSION_ACCEPT_MISMATCH} ${MACHINE_VERSION_ACCEPT_OFFER}`,
      acceptSheet: sheetFor(version),
      durationMs: Date.now() - startedAt
    };
  }

  const gate = decideRemoteVersionGate(
    version,
    TESTED_REMOTE_TMUX_VERSIONS,
    accepted
  );
  if (gate.kind !== 'measured' && gate.kind !== 'accepted') {
    const sheet = sheetFor(version);
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: ctx.remoteTmuxPath,
      version,
      supportedPhrase: joinVersionList(supported),
      acceptOffered: sheet !== null
    });
    machinesLog.warn(
      `${input.machineId} reports tmux ${version ?? 'nothing at all'} and this ` +
        `release has measured ${supported.join(', ') || 'none'}, so nothing was started`
    );
    return {
      ...base,
      version,
      class: 'version-unmeasured',
      alarm: copy.alarm,
      headline: copy.headline,
      detail: copy.detail,
      acceptSheet: sheet,
      durationMs: Date.now() - startedAt
    };
  }

  // Step 5.
  try {
    const server = await ensureRemoteServer(ctx);
    // Step 5a. PHASE 84, item 4. The feed, started HERE rather than in the
    // channel above, because `signInToConfirmedMachines` in
    // `../sessions/core.ts` already calls this function and then started a feed
    // by hand. One of those two calls had to go away rather than a third being
    // added. A feed that will not start does not fail the prepare: the machine
    // really was signed in to and the program really is running on it, so the
    // honest answer is the success sentence with one more sentence after it.
    let feedStarted = true;
    try {
      await startMachineFeed(input.machineId);
    } catch (err) {
      feedStarted = false;
      machinesLog.warn(
        `${input.machineId} was prepared and its list of sessions could not be ` +
          `read: ${sentenceOf(err)}`
      );
    }
    // Step 5b. PHASE 109. One batched read of which agents this machine has,
    // started with `void` so nothing a person is waiting on awaits it. It
    // runs on the prepared arm ONLY, because every other arm is a machine
    // nothing should be sent to. A scan that fails leaves every agent
    // `unknown`, which draws as selectable, and its own log line says so, so
    // it never fails the prepare.
    void scanMachineAgents(input.machineId).catch((err: unknown) => {
      machinesLog.warn(
        `${input.machineId} was prepared and its agents could not be ` +
          `scanned: ${sentenceOf(err)}`
      );
    });
    const copy = composeOutcomeCopy('prepared', {
      resolvedPath: ctx.remoteTmuxPath,
      version,
      // The sentence says which of the two happened, because the row draws an
      // honesty line beside it saying the same thing and the two must agree.
      serverBorn: server.born,
      // PHASE 83. A machine standing on an acceptance says so in the success
      // sentence, so nobody reads "this machine is ready" as "Tortie measured
      // this version".
      versionAccepted: gate.kind === 'accepted'
    });
    return {
      id: input.machineId,
      class: 'prepared',
      alarm: copy.alarm,
      headline: copy.headline,
      // PHASE 84. The one sentence that says what is still not true, appended
      // rather than replacing the success sentence, because both are true.
      detail: feedStarted
        ? copy.detail
        : `${copy.detail} ${MACHINE_FEED_NOT_STARTED}`,
      version,
      supported,
      serverBorn: server.born,
      options: server.options.map((row) => ({
        name: row.name,
        wanted: row.wanted,
        observed: row.observed,
        agrees: row.agrees
      })),
      pathCaptured: machineGeneration(input.machineId).remotePath !== null,
      acceptSheet: null,
      durationMs: Date.now() - startedAt
    };
  } catch (err) {
    const cls = classOfFailure(err);
    const copy = composeOutcomeCopy(cls, { lastLine: sentenceOf(err) });
    return {
      ...base,
      version,
      class: cls,
      alarm: copy.alarm,
      // A gmux error already carries a sentence written for a person, so it is
      // drawn rather than replaced by the taxonomy's generic one.
      headline: copy.headline,
      detail: err instanceof GmuxError ? sentenceOf(err) : copy.detail,
      pathCaptured: machineGeneration(input.machineId).remotePath !== null,
      durationMs: Date.now() - startedAt
    };
  }
}

/** Main's own sentence when it threw, or the value as a plain sentence. */
function sentenceOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Which class a failed boot is.
 *
 * The taxonomy is asked about the whole message, because a gmux error from the
 * exec plane carries the classified reason in its detail and the message a person
 * reads in front of it.
 */
function classOfFailure(err: unknown): MachineTestClass {
  const text = sentenceOf(err);
  const detail =
    err instanceof GmuxError ? String(err.payload.detail ?? '') : '';
  return classifyMachineOutput(`${text}\n${detail}`);
}
