/**
 * Bringing back a session that lives on another machine (Phase 72, M5,
 * research 51 sections 4.3 and 4.6, and Phase 89).
 *
 * ## What it brings back
 *
 * IT BRINGS BACK the session, on that machine, in the same folder, with the
 * four session options and both pane environment variables, and the manifest
 * row moves to `running`.
 *
 * IT NOW BRINGS BACK THE CONVERSATION TOO, for a row the arming gate proves.
 * That is Phase 89 and it is the thing this file did not do for four phases.
 * The shape is the local restore's own shape: the session comes back running
 * THAT MACHINE'S OWN SHELL, Tortie types the command that continues the
 * conversation into it, and Tortie stops there. The person presses Enter.
 *
 * A ROW THE GATE REFUSES DID NOT MOVE AT ALL. It comes back running the same
 * program at the absolute path that machine reports for it today, with the same
 * sentence it got before Phase 89. Nine of the thirteen agents are still in
 * that position, and each one keeps its own sentence.
 *
 * IT DOES NOT PUT THE SAVED OUTPUT BACK on that machine. Tortie keeps a copy of
 * a remote session's output on this Mac, and the copy stays here. Three
 * mechanisms could put it back and all three are refused, which is stated in
 * full at {@link REPLAY_IS_NOT_ATTEMPTED} rather than left as a silence.
 *
 * ## Why the gate had to move to the front, and it is the unobvious part
 *
 * Before Phase 89 the gate was asked LAST, after the create, because its answer
 * only decided which sentence the outcome carried. The create was composed from
 * the row's LAUNCH argv, which since Phase 84 carries a conversation id on the
 * line itself, so the pane came back already running the agent as a fresh
 * conversation.
 *
 * Typing a resume command into a pane that is already running an agent puts the
 * text into that agent's own input box. It continues nothing. So the gate is
 * asked BEFORE the create now, and TWO answers together pick the argv, being
 * the gate's and the composer's:
 *
 *   gate says yes and Tortie composed a command
 *                  ->  create with an EMPTY argv, so tmux starts the machine's
 *                      own shell, then type the command into it
 *   gate says yes and Tortie composed none
 *                  ->  create with the launch argv, so the program comes back
 *   gate says no   ->  create with the launch argv, exactly as before
 *
 * THE SECOND ROW IS THE FIX ROUND'S AND IT COST A PERSON THEIR PROGRAM. The two
 * answers are not the same answer. The gate reads the row's provenance. The
 * composer reads every word of the recorded resume command against Tortie's
 * compiled catalogue and refuses a word that did not come from there, which is
 * what an agent a person added in Settings hits, because such an agent keeps
 * its launch flags in the overlay. With the composer asked after the create,
 * such a row came back running a bare shell with no agent in it, which is worse
 * than what it got before this phase, and `RESUME_NOT_COMPOSED` told the person
 * the session comes back with its program while it did not.
 *
 * ## The order, and every step is where it is because of a failure
 *
 *  1. ASK THE RESTORE GATE. Six facts, one of which is that the machine's own
 *     last completed list does not hold this session. The whole rung exists for
 *     that one, because bringing back a session that never stopped is two
 *     agents on one conversation.
 *  2. CHECK THE ROW BELONGS HERE. The recorded program path was read on one
 *     machine and means nothing on another.
 *  3. RE-ASSERT THE SERVER AND CAPTURE THE PATH, before any mutation. A machine
 *     that rebooted has a fresh tmux server with tmux's own defaults, and
 *     `exit-empty` on means a server with no sessions ends itself. This is also
 *     what refreshes the program search list the far side's pane will take, and
 *     one more read then asks whether that machine still HAS the program, so a
 *     machine that lost it gets a sentence rather than a pane that dies. The
 *     answer is `argv[0]` for the launch AND `argv[0]` for the typed text.
 *  4. ASK THE ARMING GATE, which is new in Phase 89 and is why step 3b runs for
 *     both branches.
 * 4b. COMPOSE THE TEXT, for a row the gate armed, and let a refusal send the
 *     restore back to the launch argv. Composing is pure, so this costs one
 *     function call and no machine work, and the answer is handed to step 7
 *     rather than asked for again.
 *  5. ASK THE DOUBLE RUN GUARD ONE MORE TIME. Steps 3 and 4 are several seconds
 *     of commands, and a session can come back in that window, e.g. a person on
 *     that machine started it by hand.
 *  6. CREATE, with both identity variables on the line itself, then stamp the
 *     four options and read them back.
 *  7. TYPE THE RESUME COMMAND, on the armed branch only, through the one narrow
 *     door in `./remote-arm.ts`. Enter is never sent.
 *  8. WRITE the row's new status, and return an outcome that names each of the
 *     facts above.
 *
 * ## Safety
 *
 * Every command goes through `./exec-plane.ts`, so the verb ledger and the
 * ordering gate apply unchanged. Nothing here sends `kill-server`,
 * `attach-session` or `respawn-pane`, and the ledger would refuse them if it
 * did. `send-keys` is on the ledger as of Phase 89 and it is marked unsafe to
 * repeat, so the general door still refuses it. The one narrow door that may
 * send it composes its own five element argv, refuses any text carrying a
 * newline, and is called from exactly one place, being `./remote-arm.ts`.
 */

import { getLog } from '../log';
import { gmuxError } from '../errors';
import type { LaunchableAgentKind, Session } from '@shared/types';
import { savedOutputAt } from '../restore/snapshots';
import type { ManifestSessionRecord } from '../manifest/codecs';
import { provenanceOf } from '../manifest/contract';
import { assertArgvBelongsToMachine, findRemoteProgram } from './remote-argv';
import { execOn } from './exec-plane';
import { ensureRemoteServer } from './remote-server';
import {
  REPLAY_IS_NOT_ATTEMPTED,
  RESTORE_NO_RECORD,
  noRemoteRowFor
} from './remote-copy';
// Phase 89. The arming path: compose the text from the registry, read the
// screen, send it through the one narrow door, read the screen again and count
// what landed. It never presses Enter and it never throws for a machine
// failure, so every answer it gives is a landing a person can be told about.
import {
  armRemoteResume,
  composeArmedResumeText,
  type ComposedArmedText,
  type RemoteArmLanding,
  type RemoteArmRefusal,
  type RemoteArmResult
} from './remote-arm';
// Phase 72. The pure gate that decides whether a restore may type the command
// that continues a conversation. Every remote row goes through it, and the
// sentence it returns is the sentence the outcome carries.
import { resumeArmingVerdict, type ArmingRefusal } from './resume-arming';
import { remoteManifest, remoteRecordOf } from './remote-record';
import {
  REMOTE_STAMPS,
  oneLine,
  parseRemoteListLine,
  pollRemoteMachine,
  readyRemoteContext,
  remoteCreateArgs,
  remoteListArgs,
  remoteRestoreVerdictFor,
  remoteSessionRow,
  remoteStampArgs,
  remoteLaunchEntry,
  projectRemoteRecord,
  startMachineFeed
} from './remote-sessions';

const machinesLog = getLog('config');

/**
 * The two sentences this module's callers print, re-exported from their home.
 *
 * PHASE 89 REMOVED A THIRD, being `RESUME_NOT_TYPED_HERE`. It said continuing a
 * conversation on another machine is something this release does not do, and
 * this release does it. A false sentence is deleted rather than left standing,
 * which is what Phase 72 did with `RESTORE_REFUSED` for the same reason. The
 * five sentences that replace it live in `./remote-arm.ts` with the path that
 * produces them.
 *
 * They live in `./remote-copy.ts` with every other sentence main prints about a
 * session on another machine, which is the file the renderer's vocabulary audit
 * reads. They are re-exported here because this is where a reader of the
 * restore looks for them, and because the harnesses that watch them fire import
 * them from here.
 */
export { REPLAY_IS_NOT_ATTEMPTED, RESTORE_NO_RECORD };

/**
 * Why a restore did not continue the conversation, as an outcome can report it.
 *
 * FOUR OF THEM COME FROM THE ARMING GATE in `./resume-arming.ts`, and each of
 * those is a fact about the ROW: what was collected, how strong it was, and
 * which machine it was collected on. A row carrying one of those four came back
 * running its own program and nothing was typed into it.
 *
 * THREE OF THEM COME FROM THE ARMING PATH in `./remote-arm.ts`, and each of
 * those is a fact about the TEXT. `not-composed` is the one that matters most:
 * one word of the command did not come from Tortie's own compiled list of
 * programs and flags, so Tortie refused to type any of it.
 *
 * PHASE 89 DELETED A FIFTH, being `not-typed-here`. It meant the gate said yes
 * and nothing typed the command, which was every armed row up to Phase 88.
 * There is no such row now: an armed row goes to `./remote-arm.ts` and comes
 * back with a landing.
 */
export type RemoteResumeRefusal = ArmingRefusal | RemoteArmRefusal;

/** What one remote restore did, in facts a surface can print. */
export interface RemoteRestoreOutcome {
  /** The session as it now reads. */
  readonly session: Session;
  /** The far side's immutable identifier for the recreated session. */
  readonly tmuxId: string;
  /** How many of the four session options were written and read back. */
  readonly stampsLanded: number;
  /** True when the far side's server had to be created by this restore. */
  readonly serverWasBorn: boolean;
  /**
   * Epoch ms of the newest saved output Tortie holds on THIS Mac, or null when
   * it holds none. Local receipt time, never a remote clock.
   */
  readonly savedOutputAt: number | null;
  /**
   * True when the command that continues the conversation is on that session's
   * screen exactly once and nothing pressed Enter.
   *
   * IT IS READ BACK, NEVER ASSUMED. Tortie counts the copies of the text on the
   * screen before the send and again after it, and this is true only when the
   * difference is exactly one. A send that threw, a screen that came back
   * without the text and a screen with two copies of it all leave this false,
   * and each of those has its own landing below.
   */
  readonly resumeArmed: boolean;
  /**
   * The command Tortie typed, or null when it typed none.
   *
   * It is here so the log, the harness and any later surface can name the exact
   * bytes rather than describe them. `argv[0]` is the absolute path that
   * machine reports for the program today.
   */
  readonly resumeCommand: string | null;
  /**
   * What that session's screen said after the send, or null when nothing was
   * sent because the gate refused the row.
   */
  readonly resumeLanding: RemoteArmLanding | null;
  /**
   * Why the conversation did not come back, or null.
   *
   * NULL IS REACHABLE AS OF PHASE 89, and it is reachable in two shapes. An
   * armed row that landed carries a landing rather than a refusal, so this is
   * null and `resumeArmed` is true. An armed row whose text landed twice or not
   * at all also carries null here, because nothing refused it: the send
   * happened and the screen disagreed, and `resumeLanding` is the field that
   * says which. For a shell it is `nothing-to-arm` rather than null, because a
   * shell never had a conversation.
   */
  readonly resumeRefusal: RemoteResumeRefusal | null;
  /**
   * The sentence about the conversation, or null when there is nothing to say.
   *
   * It is null for a session whose agent keeps no conversation, which is every
   * shell: nothing was lost, so inventing a sentence would invent a problem.
   * For every other row it carries a sentence, including a row that came back
   * armed, because a person who does not know a command is waiting on their
   * screen will not press Enter.
   */
  readonly resumeNote: string | null;
  /** The sentence about the saved output, when there is any. */
  readonly replayNote: string | null;
}

/**
 * Whether this session's agent keeps a conversation at all (Phase 72 fix round).
 *
 * A plain shell does not, and it never did, so the arming gate says nothing
 * about it. Every other agent in the table keeps one, which is what makes
 * `resume_argv` a column at all.
 */
function agentKeepsConversation(agent: string): boolean {
  return agent !== 'shell';
}

/**
 * Bring back one session on the machine it was created on.
 *
 * @throws GmuxError INVALID_INPUT carrying the gate's own sentence when the
 *   restore is refused. Nothing is sent in that case.
 * @throws GmuxError SPAWN_FAILED when the machine did not create the session.
 */
export async function restoreRemoteSession(
  sessionId: string
): Promise<RemoteRestoreOutcome> {
  const record = remoteRecordOf(sessionId);
  if (record === null) {
    // A feed row with no manifest row, which is every remote session created by
    // 0.34 or 0.35. There is no recorded folder, no recorded program and no
    // recorded machine, so there is nothing to compose from.
    throw gmuxError(
      'INVALID_INPUT',
      RESTORE_NO_RECORD,
      `${sessionId} has no session record on this Mac, so nothing describes ` +
        `what to start`
    );
  }
  const machineId = record.machineId ?? '';

  // Step 1. The gate, before anything is composed and before anything is sent.
  const verdict = remoteRestoreVerdictFor(sessionId, machineId);
  if (!verdict.offered) {
    throw gmuxError(
      'INVALID_INPUT',
      verdict.reason ?? '',
      `the restore gate refused ${sessionId} on ${machineId} with ` +
        `${String(verdict.refusal)}`
    );
  }

  // Step 2. A path captured on one machine can never launch on another.
  //
  // The context is resolved from the registry independently of the row, so this
  // compares two answers that came from two places. They agree by construction
  // today, and the day they stop agreeing is the day a restore would compose a
  // command for one machine and send it to another.
  const ctx = readyRemoteContext(machineId);
  assertArgvBelongsToMachine(machineId, ctx.machineId);

  // Step 3. The server, its options and the program search list, before any
  // mutation. A machine that rebooted between two passes has a fresh server with
  // tmux's own defaults on it, and `ensureRemoteServer` is what puts Tortie's
  // back and captures the PATH the new pane will take.
  const server = await ensureRemoteServer(ctx);

  // Step 3b. WHERE THAT MACHINE KEEPS THE PROGRAM, ASKED AGAIN, AND THE ANSWER
  // IS WHAT LAUNCHES.
  //
  // This read does two jobs and the second one is the one the fix round added.
  // It turns the failure a person would otherwise meet, being a pane that prints
  // "command not found" and dies about a second later, into a sentence naming
  // the program and the machine. It also supplies `argv[0]`.
  //
  // MEASURED on the operator's Mac Pro, 2026-08-18. A restore that launched by
  // bare name left a pane reading `pane_dead=1`, `pane_dead_status=1` and an
  // empty screen, with `pane_start_command = claude --session-id <id>`, while
  // the manifest row still read `idle`. A pane on that machine gets
  // `/usr/bin:/bin:/usr/sbin:/sbin` and `claude` is at `~/.local/bin/claude`,
  // which is on neither that list nor the login shell's. `remoteCreate` had
  // already been moved onto the absolute path and this path had not, so a
  // create worked and the restore of the same row killed the session.
  //
  // It is asked again rather than read off the row, because the row records
  // where the program was on the day the session was created and a machine can
  // move or lose it in between. `assertArgvBelongsToMachine` above is what makes
  // the row's own path safe to compare against; this is what makes the launch
  // true today. It runs after `ensureRemoteServer` because that is what
  // refreshes the search list this read is asked against.
  const launchArgv = searchNameArgv(record);
  const bare = launchArgv[0] ?? '';
  if (bare.length > 0) {
    const entry = remoteLaunchEntry(record.agent as LaunchableAgentKind);
    const found = await findRemoteProgram(
      ctx,
      bare,
      entry?.extraProbeDirs ?? []
    );
    launchArgv[0] = found.path;
  }

  // Step 4. THE ARMING GATE, AND PHASE 89 MOVED IT HERE FROM THE FOOT OF THIS
  // FUNCTION.
  //
  // It used to be asked after the create, because its answer only decided which
  // sentence the outcome carried. Now it decides WHAT THE CREATE STARTS, so it
  // has to be asked first.
  //
  // A row the gate arms comes back running that machine's own shell, and the
  // resume command is typed into that shell. A row the gate refuses comes back
  // running its own program at the path step 3b just found, which is exactly
  // what every remote restore did before this phase.
  //
  // WHY THE ARMED BRANCH CANNOT USE THE LAUNCH ARGV. Since Phase 84 the launch
  // argv carries a conversation id on the line itself, so a pane created from it
  // is already running the agent. Typing a resume command into that pane puts
  // the text into the agent's own input box and continues nothing.
  const arming = resumeArmingVerdict({
    machineId,
    targetMachineId: ctx.machineId,
    agentKeepsConversation: agentKeepsConversation(String(record.agent)),
    resumeArgvLength: record.resumeArgv?.length ?? 0,
    provenance: provenanceOf(record.resumeProvenance)
  });
  // Step 4b. THE TEXT IS COMPOSED BEFORE THE CREATE, NOT AFTER IT, and the fix
  // round added this step because leaving it out cost a person their program.
  //
  // The gate saying yes is not enough on its own. The gate reads the row's
  // provenance; the composer reads every word of the recorded resume command
  // against Tortie's compiled catalogue, and it refuses a word that did not
  // come from there. An agent a person added in Settings keeps its launch flags
  // in the overlay rather than in that catalogue, so the gate arms it and the
  // composer refuses it.
  //
  // WITH THE COMPOSE ASKED AFTER THE CREATE the session was already running a
  // bare shell by the time the refusal arrived, so such a row came back with no
  // program at all. That was worse than the behaviour before this phase, and it
  // made `RESUME_NOT_COMPOSED` false as it stood, because that sentence tells
  // the person the session comes back with its folder AND ITS PROGRAM.
  //
  // Composing is pure. It spawns nothing, reads no file and contacts no
  // machine, so asking it here costs nothing and the answer is handed to
  // `armRemoteResume` below rather than asked for a second time.
  const armBase = {
    machineId,
    agent: String(record.agent),
    agentSessionId: record.agentSessionId ?? '',
    recordedResumeArgv: record.resumeArgv ?? [],
    // The path that machine reports for the program TODAY, which step 3b just
    // read. The row's own recorded path is where the program was on the day the
    // session was created, and a machine can move it. A bare name would type a
    // command that prints "command not found" the moment the person presses
    // Enter, because a pane on another machine does not get that machine's
    // login shell program list.
    binOnMachine: launchArgv[0] ?? ''
  };
  let composed: ComposedArmedText | null = null;
  if (arming.arm) {
    composed = composeArmedResumeText({ ...armBase, target: '' });
    if (composed.text === null) {
      machinesLog.warn(
        `${sessionId} on ${machineId} is armed by the gate and Tortie composed ` +
          `no command for it, so it comes back running its own program: ` +
          `${composed.detail}`
      );
    }
  }

  // The empty argv is what makes tmux start the machine's own default command,
  // which is that machine's shell. `remoteCreateArgs` sends no `--` and no
  // command at all for it, and that is the same thing a shell session's create
  // has always done.
  //
  // IT IS TAKEN ONLY WHEN THERE IS A TEXT TO TYPE INTO THAT SHELL. A gate that
  // said yes and a composer that refused takes the launch argv, exactly as a
  // row the gate refuses does, so the session comes back running its program.
  const armsForReal = composed !== null && composed.text !== null;
  const createArgv = armsForReal ? [] : launchArgv;

  // Step 5. The double run guard, asked again against a fresh list. Steps 3 and
  // 4 are several commands and a session can appear inside that window, e.g.
  // somebody sitting at that machine started it by hand.
  await assertStillAbsent(sessionId, machineId);

  // Step 6. The create. `remoteCreateArgs` is the SAME composer the create path
  // uses, so both identity variables ride the line itself and a create whose
  // answer is lost is still identifiable by reading the pane environment back.
  const tmuxName = record.tmuxName.length > 0 ? record.tmuxName : record.name;
  const args = remoteCreateArgs({
    tmuxName,
    // The folder ON THAT MACHINE, as the row recorded it. No local check runs
    // against it, because this Mac cannot answer for another computer's disk.
    cwd: record.cwd,
    sessionId,
    // EMPTY ON THE ARMED BRANCH, so the machine starts its own shell and the
    // resume command has somewhere to be typed. Otherwise THE ABSOLUTE PATH ON
    // THAT MACHINE, as step 3b above just found it. The create path composes its
    // launch the same way, at step 6 of `remoteCreate` in `./remote-sessions.ts`,
    // and the two must not differ for a row that is not armed: such a restore is
    // the same session starting again.
    argv: createArgv,
    ...(record.env !== undefined ? { env: record.env } : {})
  });
  const printed = await execOn(ctx, args);
  const tmuxId = (printed.split('\n')[0] ?? '').trim();
  if (!tmuxId.startsWith('$')) {
    throw gmuxError(
      'SPAWN_FAILED',
      noRemoteRowFor(record.name),
      `${machineId} answered ${JSON.stringify(tmuxId)} to the restore`
    );
  }

  // The four stamps, in the order REMOTE_STAMPS declares them. A stamp that
  // fails is logged and the restore still succeeds, because the pane environment
  // already carries the identity.
  const stamped: Record<(typeof REMOTE_STAMPS)[number], string> = {
    '@gmux-id': sessionId,
    '@gmux-agent': String(record.agent),
    '@gmux-name': oneLine(record.name),
    '@gmux-project': oneLine(record.projectPath)
  };
  let stampsLanded = 0;
  for (const option of REMOTE_STAMPS) {
    try {
      await execOn(ctx, remoteStampArgs(tmuxId, option, stamped[option]));
      stampsLanded += 1;
    } catch (err) {
      machinesLog.warn(
        `${machineId} did not keep ${option} on ${tmuxId} after a restore: ` +
          `${(err as Error).message}`
      );
    }
  }

  // Step 7. THE RESUME COMMAND, TYPED, ON THE ARMED BRANCH ONLY (Phase 89).
  //
  // It runs BEFORE the row is written and before the feed starts, so the pane a
  // person opens a moment later already has the command on it. Step 4b already
  // composed the text from the compiled agent registry and already refused any
  // word that did not come from there. What is left here is the machine work:
  // read the screen, send the text through the one narrow door, read the screen
  // again and count what landed.
  //
  // IT NEVER THROWS FOR A MACHINE FAILURE. A send that failed, a machine that
  // stopped answering and a read that timed out each come back as a landing,
  // because a screen Tortie could not read is a different fact from a screen
  // with nothing on it, and a person is owed the difference.
  //
  // ENTER IS NEVER PRESSED, on any path, by any argument. That is the promise
  // the local restore has always made and Phase 89 did not weaken it for a
  // session on another machine.
  let armed: RemoteArmResult | null = null;
  if (composed !== null) {
    // The answer step 4b already got is handed straight through, so the decision
    // that chose the create and the decision that chooses the text are provably
    // one decision. A row whose text was refused reaches this call too, and it
    // comes straight back out carrying the refusal and its sentence, having
    // sent nothing.
    armed = await armRemoteResume(
      { ...armBase, target: tmuxId },
      undefined,
      composed
    );
    machinesLog.info(
      `${sessionId} on ${machineId}: the resume command was ` +
        `${armed.refusal === null ? String(armed.landing) : `refused with ${armed.refusal}`}` +
        `, with ${String(armed.before)} copies on the screen before and ` +
        `${String(armed.after)} after`
    );
  }

  // Step 8. The row, and the feed, so the window shows the session without
  // waiting a cadence. The status is written by the pass that follows, from the
  // machine's own answer, rather than asserted here.
  remoteManifest().updateSession(sessionId, {
    tmuxName,
    status: 'running',
    lastSeen: Date.now()
  });
  await startMachineFeed(machineId);

  const savedAt = savedOutputAt(sessionId);
  const fresh = remoteRecordOf(sessionId) ?? record;
  return {
    session: projectRemoteRecord(fresh),
    tmuxId,
    stampsLanded,
    serverWasBorn: server.born,
    savedOutputAt: savedAt,
    // READ BACK, never assumed. True only when the screen showed one more copy
    // of the text after the send than before it. Two copies, no copies and a
    // screen that could not be read all leave it false, and `resumeLanding`
    // below is what says which of the three happened.
    resumeArmed: armed !== null && armed.landing === 'armed',
    resumeCommand: armed?.text ?? null,
    resumeLanding: armed?.landing ?? null,
    // The gate's refusal for a row it refused, the arming path's own refusal
    // for a text it would not compose, and null for a row whose text was sent.
    resumeRefusal: armed !== null ? armed.refusal : arming.refusal,
    // Never null on a row that reached the arming path, because every one of
    // its four landings and all three of its refusals carry a sentence. Null
    // only for a shell, which never had a conversation to lose.
    resumeNote: armed !== null ? armed.note : arming.reason,
    replayNote: savedAt === null ? null : REPLAY_IS_NOT_ATTEMPTED
  };
}

/**
 * Ask the machine one more time whether it is holding this session, and refuse
 * if it is.
 *
 * The gate already asked, against the last completed list. This asks against a
 * list read now, after the several seconds `ensureRemoteServer` takes, because
 * that window is long enough for somebody at that machine to start the session
 * by hand.
 *
 * @throws GmuxError INVALID_INPUT with the gate's `running` sentence.
 */
async function assertStillAbsent(
  sessionId: string,
  machineId: string
): Promise<void> {
  await pollRemoteMachine(machineId);
  if (remoteSessionRow(sessionId) === null) return;
  const verdict = remoteRestoreVerdictFor(sessionId, machineId);
  if (verdict.offered) return;
  throw gmuxError(
    'INVALID_INPUT',
    verdict.reason ?? '',
    `${machineId} listed ${sessionId} on the read taken after its server was ` +
      `re-asserted, so the restore was refused with ${String(verdict.refusal)}`
  );
}

/**
 * The argv a restore ASKS THE MACHINE ABOUT, with the bare name at `argv[0]`.
 *
 * It is not the argv that launches. The row records the absolute path the
 * machine reported on the day the session was created, and `findRemoteProgram`
 * takes a bare name, so the name is cut out of the recorded path and the answer
 * that comes back is put in its place. Step 3b of {@link restoreRemoteSession}
 * is where that swap happens and why.
 *
 * The rest of the argv is the row's own, unchanged, because those are the flags
 * the session was created with and a resume does not re-apply launch flags.
 *
 * An empty argv is a plain shell session, and tmux starts the machine's own
 * default command for it, which is what the create did too.
 */
function searchNameArgv(record: ManifestSessionRecord): string[] {
  const argv = record.argv;
  const first = argv[0] ?? '';
  if (first.length === 0) return [];
  const slash = first.lastIndexOf('/');
  const bare = slash === -1 ? first : first.slice(slash + 1);
  return [bare, ...argv.slice(1)];
}

/**
 * Read the four stamps and both pane variables back off the far side, for the
 * verifier and the matrix.
 *
 * It is here rather than in a harness because the matrix has to compare what the
 * far side holds against what the row says, byte for byte, and composing that
 * read in two places would let the two drift.
 */
export async function readBackRemoteStamps(
  machineId: string,
  sessionId: string
): Promise<Record<string, string>> {
  const ctx = readyRemoteContext(machineId);
  const listed = await execOn(ctx, remoteListArgs());
  const out: Record<string, string> = {};
  for (const line of listed.split('\n')) {
    const row = parseRemoteListLine(line);
    if (row === null || row.gmuxId !== sessionId) continue;
    out['@gmux-id'] = row.gmuxId;
    out['@gmux-agent'] = row.agent;
    out['@gmux-name'] = row.name;
    out['@gmux-project'] = row.projectPath;
    const env = await execOn(ctx, ['show-environment', '-t', row.tmuxId]);
    for (const entry of env.split('\n')) {
      const eq = entry.indexOf('=');
      if (eq <= 0) continue;
      const key = entry.slice(0, eq);
      if (key !== 'GMUX_SESSION_ID' && key !== 'GMUX_MANAGED') continue;
      out[key] = entry.slice(eq + 1);
    }
    return out;
  }
  return out;
}
