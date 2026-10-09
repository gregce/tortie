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
 *     PHASE 324: that refusal is never asked of a version Tortie has measured,
 *     because measured beats accepted, so a machine accepted at 3.5a that now
 *     reports 3.6b is prepared as any measured machine is.
 *  5. `ensureRemoteServer`. Boot, PATH capture, options, read back.
 *  5a. PHASE 84. Start the machine's feed, which is what makes its sessions
 *     appear. Before this phase Prepare reported success and started nothing
 *     that reads the machine's list, so a machine asleep at launch stayed
 *     unread for the whole run and the badge sent the person to the button that
 *     could not fix it. A feed that will not start does not fail the prepare.
 *  6. Compose one class, one headline and one detail, all in main.
 *
 * ## A confirm of changed details stops it (Phase 340.1)
 *
 * The context this function registers in step 2 is held in a local for the
 * rest of the call. A person who confirms CHANGED details while the version
 * read is out retires that route (`retireMachineRoute`, `./remote-sessions.ts`),
 * and before this phase the call went on regardless: it started the server
 * over the OLD details, and its late `startMachineFeed` re-armed a feed with
 * no context to send a list over, which marked the machine as not answering,
 * so the row read Offline about a machine nothing had asked (Phase 340's
 * ruled reverify measured it). So the route epoch (`machineRouteEpoch`,
 * `./context.ts`) is read before step 2 and asked again after every await. A
 * different number stops the call there, before `ensureRemoteServer` and
 * before `startMachineFeed`, and it answers {@link MACHINE_PREPARE_OVERTAKEN_HEADLINE}
 * and touches nothing: not the route, not the link and not the row's memory,
 * because a later Prepare under the new details may already hold them. The
 * row reads Not ready, with Prepare this machine as the next step.
 *
 * The fix round of 340.1 carried the same question INTO the server set-up
 * (`stillRouted`, `./remote-server.ts`), which asks it after every command it
 * sends: a confirm that lands there stops the set-up at its next command,
 * where before it let the rest go to the old details (24 commands, the
 * reverify's arm B). The check after the set-up returns is kept beside it; it
 * is reached only if the set-up stops asking after its last command.
 *
 * ## What it is not, and why the connection test was left alone
 *
 * The connection test starts nothing that stays. Starting a durable server from
 * a button labelled "Test the connection" would surprise a person about what is
 * now running on their machine, and surprising a person about that is what the
 * whole confirm gate exists to prevent. So Prepare is its own step and it says
 * what it will do before it does it.
 *
 * PHASE 340 corrected the sentence above, which said the test "stays the read
 * only `command -v` probe it is". The test is now the check in
 * `./check-script.ts`: it reads the far login shell's PATH and, for one program
 * it found by a name the person's own shell runs, that program's `-V`. It still
 * starts no server and leaves nothing of Tortie's running. Add a machine now
 * confirms and then calls THIS function in the same press (build/p340/SPEC.md
 * D7), which is the one place a confirmation is followed by a prepare.
 *
 * ## The row's memory of this answer (Phase 340, D24)
 *
 * {@link prepareMachine} is a wrapper: it runs {@link prepareMachineOnce} and
 * records what it answered in `./row-facts.ts`, in memory only, whoever started
 * it, so the Settings row can draw the last sign in's class and version.
 *
 * ## The server's version, and the program beside it (Phase 342)
 *
 * build/p342/SPEC.md D3, D9, D10. The version the gate reads is remembered for
 * the machine the moment it is read (`./far-tmux.ts`), so the set-up judges
 * each option's refusal against the server's own measured row and the feed's
 * first pass reads that version's quirks. On a WARM server whose row carries
 * `programs` (the four versions before 3.6), the program beside the server is
 * read once, with its own `-V`, through {@link readRemoteProgramVersion}, the
 * one reader of it, and the pair verdict is recorded keyed by that server
 * version. A pair nobody measured still gets the set-up and the feed, because
 * the exec plane answers across it and the sessions are listed, and Prepare
 * then answers `program-refused` with the pair sentence and scans no agents. A
 * server the set-up refused for good, and a server it started that reports
 * another version than its program said, both answer `program-refused` with
 * their own sentence, asked BEFORE the taxonomy, which would have read a
 * refusal as a machine Tortie could not reach. A refused optional setting the
 * measurement did not predict adds one sentence to the prepared detail.
 */

import { app } from 'electron';
import { homedir } from 'node:os';
import { getLog } from '../log';
import { GmuxError, gmuxErrorPayloadOf } from '../errors';
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
  machineRouteEpoch,
  type RemoteMachineContext
} from './context';
import { execOn, execRemoteShell } from './exec-plane';
import { shellQuoteArgv } from '../restore/command';
import {
  MACHINE_FEED_NOT_STARTED,
  MACHINE_PREPARE_OVERTAKEN_DETAIL,
  MACHINE_PREPARE_OVERTAKEN_HEADLINE,
  MACHINE_VERSION_ACCEPT_MISMATCH,
  MACHINE_VERSION_ACCEPT_OFFER,
  classifyMachineOutput,
  composeOutcomeCopy,
  lastPrintedLine,
  machineTmuxSettingRefused
} from './errors';
import {
  ensureRemoteServer,
  RemoteServerSetUpStopped,
  RemoteTmuxRefused
} from './remote-server';
// PHASE 342 (D3, D24). What this run knows about the machine's tmux.
import {
  farPairIsDisagreement,
  farPairOf,
  farServerVersion,
  noteFarPair,
  noteFarServerVersion
} from './far-tmux';
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
// PHASE 340 (D24). The last Prepare's answer, in memory, for the Settings row.
import { noteRowSignIn } from './row-facts';

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
  /**
   * The machine answered and named a version. PHASE 342: `from` says whose,
   * the running SERVER's (`display-message`) or the PROGRAM's own `-V`, which
   * is read when no server answered and, on the four rows before 3.6, beside
   * a server that did.
   */
  | {
      readonly kind: 'version';
      readonly version: string;
      readonly from: 'server' | 'program';
    }
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
  // Phase 340. ssh present and not starting is unreached for the same reason a
  // missing one is: nothing left this Mac.
  'client-failed',
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
    if (parsed !== null) return { kind: 'version', version: parsed, from: 'server' };
  } catch {
    // A machine with nothing of Tortie's running on it lands here, and that is
    // the ordinary case for a machine nobody has prepared.
  }
  return readRemoteProgramVersion(ctx);
}

/**
 * What the PROGRAM on that machine says its version is, with its own `-V`
 * (Phase 342, D3: factored out of {@link readRemoteTmuxVersion}, whose second
 * read it is, unchanged).
 *
 * THE ONE READER OF IT. Prepare calls it again beside a warm server whose row
 * carries `programs`, and nothing else in the tree reads a far program's
 * version: the live connection's precheck and its open CONSULT the verdict
 * this read leads to (`./far-tmux.ts`), so `execRemoteShell` gains no caller
 * and the precheck stays the one read it is.
 */
export async function readRemoteProgramVersion(
  ctx: RemoteMachineContext
): Promise<RemoteVersionRead> {
  // PHASE 235, item 3. The clock the deadline branch below reads. It starts
  // here rather than at the top of the function, so it measures THIS read's own
  // deadline and not the first read's as well.
  const startedAt = Date.now();
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
    return parsed === null
      ? { kind: 'unreadable' }
      : { kind: 'version', version: parsed, from: 'program' };
  } catch (err) {
    const cls = classOfFailure(err);
    if (UNREACHED_CLASSES.includes(cls)) {
      return { kind: 'unreached', cls, detail: sentenceOf(err) };
    }
    // PHASE 235, item 3. THE DEADLINE ANSWERS ITS OWN CLASS.
    //
    // A machine at an address that routes nowhere was described as one whose
    // program would not report its version, and nothing had reached it. The
    // whole defect is THIRTEEN MILLISECONDS wide, measured 2026-09-08 against
    // 192.0.2.1 through the product's own nine ssh options: ssh printed
    // `ssh: connect to host 192.0.2.1 port 22: Operation timed out` at
    // 10,013 ms, which the phrase table above classifies `unreachable` and so
    // reads as unreached — but the child is killed at 10,000 ms, and what the
    // classifier is handed is the empty string the kill left behind, which is
    // `unknown` and falls through to `unreadable`. A person then read, of a
    // machine nothing ever touched, that the program at a named path on it
    // would not identify itself.
    //
    // So the read asks its own question rather than the taxonomy's: did this
    // attempt use the WHOLE deadline? A read that did learned nothing about any
    // program, whatever the reason the far side never came back, and
    // `timed-out` is what says that — its copy is "The test ran out of time."
    // with "Nothing was changed on either machine", which is true of a machine
    // that is off and of one that is wedged, where the version sentence is true
    // of neither. It is already a member of `UNREACHED_CLASSES` and already has
    // copy in `./errors.ts`, and until now nothing could produce it, because
    // `PHRASE_TABLE` holds no phrase that answers it.
    //
    // `REMOTE_VERSION_TIMEOUT_MS` IS NOT CHANGED, per the charter. The number
    // is read, never moved.
    //
    // ONLY `unknown` reaches here, so a machine that said something the
    // taxonomy recognises keeps its own class and its own words. The clock is
    // the wall clock and can jump backwards, and that direction is the safe
    // one: a shorter reading falls through to `unreadable`, which is the
    // behaviour before this phase.
    if (cls === 'unknown' && Date.now() - startedAt >= REMOTE_VERSION_TIMEOUT_MS) {
      return { kind: 'unreached', cls: 'timed-out', detail: sentenceOf(err) };
    }
    return { kind: 'unreadable' };
  }
}

/**
 * Prepare one machine, and remember what it answered (Phase 340, D24).
 *
 * The ONE wrapper around every return of {@link prepareMachineOnce}: the launch
 * sign in, its retry and a person's press all reach this name, so the row's
 * memory of the last sign in is written whoever started it. The memory is in
 * `./row-facts.ts`, never in machines.json.
 */
export async function prepareMachine(
  input: PrepareInput
): Promise<MachinePrepareResult> {
  const routeEpoch = machineRouteEpoch(input.machineId);
  const result = await prepareMachineOnce(input);
  // PHASE 340.1. A Prepare a confirm of changed details overtook signed in
  // under the OLD details, so what it read is not the row's last sign-in: the
  // confirm forgot the old facts, and they stay forgotten.
  if (machineRouteEpoch(input.machineId) === routeEpoch) {
    noteRowSignIn(input.machineId, result);
  }
  return result;
}

/**
 * Prepare one machine, and answer with one class and one piece of copy.
 *
 * It never throws for a machine level failure. A refusal from the gate, a machine
 * that cannot be reached and a version nobody measured all come back as a result
 * carrying the class and the sentence, because the surface has to draw them and a
 * thrown error would arrive there as a bare message with no class beside it.
 */
export async function prepareMachineOnce(
  input: PrepareInput
): Promise<MachinePrepareResult> {
  const startedAt = Date.now();
  // PHASE 340.1. Read before the context is registered, asked after every
  // await below. See "A confirm of changed details stops it" above.
  const routeEpoch = machineRouteEpoch(input.machineId);
  const overtaken = (): boolean =>
    machineRouteEpoch(input.machineId) !== routeEpoch;
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
  /**
   * The answer of a Prepare a confirm of changed details overtook. Not
   * Offline and not a refusal of the machine, whose new details nothing has
   * asked yet; `born` is true when the old details' sign-in is known to have
   * started the server before it stopped. Logged, and nothing else is
   * touched.
   */
  const stopped = (born: boolean): MachinePrepareResult => {
    machinesLog.info(
      `${input.machineId}'s details changed while it was being prepared, so ` +
        `Tortie stopped before starting anything more there. Prepare signs in ` +
        `with the new details.`
    );
    return {
      ...base,
      serverBorn: born,
      class: 'unknown',
      alarm: false,
      headline: MACHINE_PREPARE_OVERTAKEN_HEADLINE,
      detail: MACHINE_PREPARE_OVERTAKEN_DETAIL,
      durationMs: Date.now() - startedAt
    };
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
  // PHASE 340.1. Before every arm below, so neither a version nor a machine
  // nothing reached is reported about details a person has since replaced.
  if (overtaken()) return stopped(false);

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
  // PHASE 342 (D9, D24). Remembered the moment it is read, so the set-up
  // judges each refusal against this version's own row and the feed's first
  // pass reads its quirks. A server the set-up starts is asked again and
  // replaces it.
  noteFarServerVersion(input.machineId, version);

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
      warning: summary.warning,
      // PHASE 101. The row's own write root decides this, and an acceptance
      // sheet for a machine that already grants saving draws the paragraph
      // exactly as the ordinary confirm sheet does.
      writeHonesty: summary.writeHonesty
    };
  };

  const gate = decideRemoteVersionGate(
    version,
    TESTED_REMOTE_TMUX_VERSIONS,
    accepted
  );

  // PHASE 83. The arm that stops an acceptance carrying to the next version.
  // It is asked BEFORE the plain refusal below, because the gate answers
  // `unmeasured` for this case and the plain unmeasured sentence would not say
  // what actually happened, which is that the program on that machine is not
  // the program the person accepted.
  //
  // PHASE 324, the ruled round. It is asked ONLY when the gate answered
  // `unmeasured`, and only for an acceptance of a version Tortie has not
  // measured. Measured beats accepted (rule 2 of `decideRemoteVersionGate`):
  //
  //  - A machine whose acceptance names 3.5a and whose program now reports
  //    3.6b, a measured version, is prepared like any measured machine. The
  //    arm used to be asked before the gate, so it drew "Tortie has not
  //    measured the program this machine runs" and offered a sheet accepting
  //    3.6b "which Tortie has not measured", beside a list naming 3.6b as
  //    measured. All of it was false, and accepting it wrote an acceptance
  //    nothing reads. The same was true of 3.6a, 3.7b and 3.7c before this
  //    phase, and this phase made it true of two more versions.
  //  - An acceptance of a version Tortie has since measured decides nothing,
  //    so it is treated as no acceptance here, as `describeMachine` treats
  //    it on the row. A machine that accepted 3.6 on an older build and now
  //    reports 3.5a gets the plain refusal any measured machine gets, rather
  //    than a sentence about an acceptance the row no longer draws.
  //
  // Nothing is dropped. The acceptance stays in the row and in the hash, so the
  // person's confirmation stands and a Tortie that has not measured that
  // version still finds it accepted.
  if (
    gate.kind === 'unmeasured' &&
    accepted !== null &&
    decideRemoteVersionGate(accepted).kind !== 'measured'
  ) {
    const copy = composeOutcomeCopy('version-unmeasured', {
      resolvedPath: ctx.remoteTmuxPath,
      version,
      supportedPhrase: joinVersionList(supported)
    });
    machinesLog.warn(
      `${input.machineId} reports tmux ${gate.version} and the version ` +
        `accepted for it is ${accepted}, so nothing was started`
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

  // Step 4a. PHASE 342 (D3). The program beside a WARM server, read once, and
  // only on a row that carries `programs`, which no row from 3.6 does, so a
  // machine that works today is sent nothing more. The verdict is recorded
  // whatever it is, keyed by this server version, which is what clears an
  // old refusal; only a read that reached nothing records none. A server that
  // did not answer has no pair to read: the set-up starts one and asks it its
  // own version.
  if (read.kind === 'version' && read.from === 'server') {
    const row = TESTED_REMOTE_TMUX_VERSIONS.find((one) => one.version === read.version);
    if (row?.programs !== undefined) {
      const program = await readRemoteProgramVersion(ctx);
      if (overtaken()) return stopped(false);
      if (program.kind === 'unreached') {
        // Nothing reached the program, so nothing was learnt about the pair:
        // no verdict is recorded, and one an earlier Prepare recorded against
        // this server stands. A blip here must not keep a machine whose pair
        // is fine off its live connection for the rest of the run.
        machinesLog.warn(
          `${input.machineId}'s program beside its tmux ${read.version} server ` +
            `could not be asked its version, so nothing was learnt about the ` +
            `two: ${program.detail}`
        );
      } else {
        const ran = program.kind === 'version' ? program.version : null;
        if (ran === null) {
          machinesLog.warn(
            `${input.machineId}'s program beside its tmux ${read.version} server ` +
              `named no version, so Tortie opens no new live connection there.`
          );
        }
        noteFarPair(input.machineId, read.version, ran);
      }
    } else {
      noteFarPair(input.machineId, read.version, null);
    }
  }

  // Step 5.
  let serverBorn = false;
  try {
    // PHASE 340.1's fix round. The set-up asks the route epoch after every
    // command it sends, so a confirm of changed details that lands inside it
    // stops it at the next command rather than after the last.
    //
    // PHASE 342 (D9). The program's own version goes with it when that is
    // what the gate read, because no server answered: a server the set-up
    // starts must report the same.
    const server = await ensureRemoteServer(ctx, {
      stillRouted: () => !overtaken(),
      ...(read.kind === 'version' && read.from === 'program'
        ? { version: read.version }
        : {})
    });
    serverBorn = server.born;
    // PHASE 340.1. The server over the old details is as far as it got: no
    // feed is started for a route that was retired while it was being set up.
    if (overtaken()) return stopped(server.born);
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
    // PHASE 340.1. Retired while the feed was starting: the feed stopped
    // itself, and this is not the prepared machine the new details describe.
    if (overtaken()) return stopped(server.born);
    const readback = server.options.map((row) => ({
      name: row.name,
      wanted: row.wanted,
      observed: row.observed,
      agrees: row.agrees
    }));
    // Step 5a2. PHASE 342 (D3). A program nobody measured beside the server
    // that still runs the sessions. The set-up and the feed ran, because the
    // exec plane answers across the pair and the sessions are listed; no
    // session is opened there (the live connection, an attach, a create and a
    // restore each consult the verdict), no agent is scanned, and nothing is
    // ended (his ruling 3, "Only say so"). Asked of the recorded verdict, so a
    // server the set-up started, which recorded its own pair, answers prepared.
    const pair = farPairOf(input.machineId);
    if (pair !== null && pair.kind === 'refused' && pair.program !== null) {
      // PHASE 342'S SECOND FIX ROUND. A program this run saw say another
      // version than the server it started runs as, still beside that very
      // server, is said as sentence (4) again, never as an update: the second
      // verifier read "updated while its sessions kept running … After that
      // machine restarts, Tortie can restore them" of a program that lies,
      // which nothing updated and no restart changes.
      const lies = farPairIsDisagreement(input.machineId);
      const refusedCopy = composeOutcomeCopy('program-refused', {
        tmuxRefusal: lies
          ? { kind: 'disagrees', said: pair.program, ran: pair.server }
          : { kind: 'pair', server: pair.server, program: pair.program }
      });
      machinesLog.warn(
        `${input.machineId} runs a tmux ${pair.server} server beside a ` +
          `${pair.program} program, a pair Tortie has not measured` +
          `${lies ? ', a program this run saw say another version than the server it started' : ''}, ` +
          `so it lists its sessions and opens none.`
      );
      return {
        id: input.machineId,
        class: 'program-refused',
        alarm: refusedCopy.alarm,
        headline: refusedCopy.headline,
        detail: refusedCopy.detail,
        version,
        supported,
        serverBorn: server.born,
        options: readback,
        pathCaptured: machineGeneration(input.machineId).remotePath !== null,
        acceptSheet: null,
        durationMs: Date.now() - startedAt
      };
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
    // PHASE 342 (D7). An optional setting the server refused that its
    // version's measurement did not predict: ONE sentence, said once however
    // many there were, about the server's own version.
    //
    // PHASE 342'S FIX ROUND. Carried alone as `note` as well as at the end of
    // the detail, because the verifier found it drawn NOWHERE: the row's
    // Ready chip draws its own hover and no prepared detail, and Add a
    // machine's last step draws "<name> is ready." alone. Both draw the note.
    const unexpected = server.refused.some((one) => !one.expected);
    const note = unexpected
      ? machineTmuxSettingRefused(farServerVersion(input.machineId) ?? version)
      : null;
    const said = note === null ? copy.detail : `${copy.detail} ${note}`;
    return {
      id: input.machineId,
      class: 'prepared',
      alarm: copy.alarm,
      headline: copy.headline,
      // PHASE 84. The one sentence that says what is still not true, appended
      // rather than replacing the success sentence, because both are true.
      detail: feedStarted ? said : `${said} ${MACHINE_FEED_NOT_STARTED}`,
      version,
      supported,
      serverBorn: server.born,
      options: readback,
      pathCaptured: machineGeneration(input.machineId).remotePath !== null,
      acceptSheet: null,
      durationMs: Date.now() - startedAt,
      note
    };
  } catch (err) {
    // PHASE 340.1. A failure of the old details' server is not this machine's,
    // and neither is a set-up the confirm stopped part way, which says whether
    // it had started the server by then.
    if (overtaken()) {
      return stopped(
        serverBorn ||
          ((err instanceof RemoteServerSetUpStopped || err instanceof RemoteTmuxRefused) &&
            err.born)
      );
    }
    // PHASE 342 (D6, D9, D10). Asked BEFORE the taxonomy, which reads tmux's
    // refusal of a setting as a machine Tortie could not reach. The machine
    // answered; its tmux is too old for a setting Tortie cannot do without, or
    // the server the set-up started is not the version its program said.
    if (err instanceof RemoteTmuxRefused) {
      return {
        ...base,
        // PHASE 342'S FIX ROUND. A server that is not the version its program
        // said is drawn as the version it RUNS, so the row's line of facts
        // agrees with the sentence under it rather than naming the version
        // that sentence says is not true.
        version: err.refusal.kind === 'disagrees' ? err.refusal.ran : version,
        class: 'program-refused',
        alarm: false,
        headline: err.headline,
        detail: err.detail,
        serverBorn: serverBorn || err.born,
        pathCaptured: machineGeneration(input.machineId).remotePath !== null,
        durationMs: Date.now() - startedAt
      };
    }
    const cls = classOfFailure(err);
    // PHASE 342'S FIX ROUND. A gmux error's `message` is its whole payload as
    // JSON, so this arm drew that JSON, the ssh command line inside it, as the
    // row's hover. The payload is read instead: the program's own last line
    // for the taxonomy's sentence, and the payload's own sentence for a
    // person, except the exec plane's catch-all (code UNKNOWN), whose message
    // is the failed command line and is no sentence at all.
    const payload = gmuxErrorPayloadOf(err);
    const copy = composeOutcomeCopy(cls, {
      lastLine: lastPrintedLine(payload?.detail ?? sentenceOf(err))
    });
    return {
      ...base,
      version,
      class: cls,
      alarm: copy.alarm,
      // A gmux error already carries a sentence written for a person, so it is
      // drawn rather than replaced by the taxonomy's generic one.
      headline: copy.headline,
      detail: payload !== null && payload.code !== 'UNKNOWN' ? payload.message : copy.detail,
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
