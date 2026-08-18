/**
 * Bringing back a session that lives on another machine (Phase 72, M5,
 * research 51 sections 4.3 and 4.6).
 *
 * ## What it brings back, and what it does not
 *
 * IT BRINGS BACK the session, on that machine, in the same folder, running the
 * same program at the absolute path that machine reports for it TODAY, with the
 * four session options and both pane environment variables, and the manifest
 * row moves to `running`.
 *
 * IT DOES NOT BRING BACK the conversation, and Phase 73 did not change that.
 * What Phase 73 changed is the record. The connected time store harvest reads
 * an agent's own store on a machine while Tortie is connected to it, so a row
 * for one of four agents can now carry a `resume_argv` and a
 * `remote-store-harvest` provenance, and for a muse row the arming gate says
 * yes. PHASE 84 ADDED A SECOND SHAPE OF ROW THAT GETS A YES, being any of the
 * seven agents that take a conversation id on their own launch flag, because a
 * remote create now puts one on the line and records it.
 *
 * Saying yes is still not typing. Nothing in this release types a resume command
 * into a pane on another machine, so `resumeArmed` is false on every outcome
 * this function returns. An armed row carries {@link RESUME_NOT_TYPED_HERE},
 * and a row the harvest could not prove still says `remote-not-collected`. Every
 * agent row comes back with a sentence, and none of them comes back silent.
 *
 * IT DOES NOT PUT THE SAVED OUTPUT BACK on that machine. Tortie keeps a copy of
 * a remote session's output on this Mac, and the copy stays here. Three
 * mechanisms could put it back and all three are refused, which is stated in
 * full at {@link REPLAY_IS_NOT_ATTEMPTED} rather than left as a silence.
 *
 * ## The order, and every step is where it is because of a failure
 *
 *  1. ASK THE GATE. Six facts, one of which is that the machine's own last
 *     completed list does not hold this session. The whole rung exists for that
 *     one, because bringing back a session that never stopped is two agents on
 *     one conversation.
 *  2. CHECK THE ROW BELONGS HERE. The recorded program path was read on one
 *     machine and means nothing on another.
 *  3. RE-ASSERT THE SERVER AND CAPTURE THE PATH, before any mutation. A machine
 *     that rebooted has a fresh tmux server with tmux's own defaults, and
 *     `exit-empty` on means a server with no sessions ends itself. This is also
 *     what refreshes the program search list the far side's pane will take, and
 *     one more read then asks whether that machine still HAS the program, so a
 *     machine that lost it gets a sentence rather than a pane that dies.
 *  4. ASK ONE MORE TIME. Step 3 is several seconds of commands, and a session
 *     can come back in that window, e.g. a person on that machine started it by
 *     hand. So the list is read again and the double run guard is asked again
 *     against the fresh answer.
 *  5. CREATE, with both identity variables on the line itself, then stamp the
 *     four options and read them back.
 *  6. WRITE the row's new status, and return an outcome that names each of the
 *     three things above.
 *
 * ## Safety
 *
 * Every command goes through `./exec-plane.ts`, so the verb ledger and the
 * ordering gate apply unchanged. Nothing here sends `kill-server`,
 * `attach-session`, `send-keys` or `respawn-pane`, and the ledger would refuse
 * them if it did.
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
  RESUME_NOT_TYPED_HERE,
  noRemoteRowFor
} from './remote-copy';
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
 * They live in `./remote-copy.ts` with every other sentence main prints about a
 * session on another machine, which is the file the renderer's vocabulary audit
 * reads. They are re-exported here because this is where a reader of the
 * restore looks for them, and because the harnesses that watch them fire import
 * them from here.
 */
export { REPLAY_IS_NOT_ATTEMPTED, RESTORE_NO_RECORD, RESUME_NOT_TYPED_HERE };

/**
 * Why a restore did not continue the conversation, as an outcome can report it.
 *
 * FOUR OF THE FIVE COME FROM THE GATE in `./resume-arming.ts`, and each of
 * those is a fact about the ROW: what was collected, how strong it was, and
 * which machine it was collected on.
 *
 * THE FIFTH IS THIS FILE'S OWN and it is a fact about the RELEASE.
 * `not-typed-here` is what a row gets when the gate armed it and nothing typed
 * the command, which is every armed row in this release. It is kept separate
 * from the gate's four on purpose. The gate answers whether an id may be used,
 * and it must keep answering yes for a row whose id is provable, or the round
 * that builds the typing half has a gate arm to delete instead of a caller to
 * write.
 */
export type RemoteResumeRefusal = ArmingRefusal | 'not-typed-here';

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
   * True when the restore typed the command that continues a conversation.
   *
   * FALSE for every row this release can produce, and it is false for two
   * different reasons now. Most rows are refused by the gate in
   * `./resume-arming.ts`. A row the gate arms is not typed either, because
   * nothing in this release can type into a pane on another machine, and such a
   * row reports `not-typed-here`.
   */
  readonly resumeArmed: boolean;
  /**
   * Why the conversation did not come back, or null.
   *
   * NULL IS UNREACHABLE FOR AN AGENT ROW in this release, and that is the point
   * of the fifth member. A row the gate arms takes `not-typed-here`, because
   * nothing types the command. Null is left in the type for the round that
   * builds the typing half, and for a shell it is `nothing-to-arm` rather than
   * null because a shell never had a conversation.
   */
  readonly resumeRefusal: RemoteResumeRefusal | null;
  /**
   * The sentence about the conversation, or null when there is nothing to say.
   *
   * It is null for a session whose agent keeps no conversation, which is every
   * shell: nothing was lost, so inventing a sentence would invent a problem.
   * For every other row it carries a sentence, including a row the gate armed,
   * because a restore that continues nothing and says nothing is a restore a
   * person finds out about in an empty pane.
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

  // Step 4. The double run guard, asked again against a fresh list. Step 3 is
  // several commands and a session can appear inside that window, e.g. somebody
  // sitting at that machine started it by hand.
  await assertStillAbsent(sessionId, machineId);

  // Step 5. The create. `remoteCreateArgs` is the SAME composer the create path
  // uses, so both identity variables ride the line itself and a create whose
  // answer is lost is still identifiable by reading the pane environment back.
  const tmuxName = record.tmuxName.length > 0 ? record.tmuxName : record.name;
  const args = remoteCreateArgs({
    tmuxName,
    // The folder ON THAT MACHINE, as the row recorded it. No local check runs
    // against it, because this Mac cannot answer for another computer's disk.
    cwd: record.cwd,
    sessionId,
    // THE ABSOLUTE PATH ON THAT MACHINE, as step 3b above just found it. The
    // create path composes its launch the same way, at step 6 of `remoteCreate`
    // in `./remote-sessions.ts`, and the two must not differ: a restore is the
    // same session starting again.
    argv: launchArgv,
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

  // Step 6. The row, and the feed, so the window shows the session without
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
  // ASKED, never assumed. The first cut of this function printed the
  // `not-collected` sentence unconditionally and the gate that owns the decision
  // had no caller at all. It is asked here, once, and its answer is what the
  // outcome carries.
  //
  // PHASE 73 CHANGED WHAT THE ANSWER CAN BE, and did not change what this
  // function does with it. The connected time store harvest now writes a
  // provable conversation id for a muse session on a machine, so `arm` comes
  // back true for such a row. `resumeArmed` below is still false, because
  // saying yes is not typing and nothing in this release types a resume command
  // into a pane on another machine. The gap is logged and is recorded as owed.
  const arming = resumeArmingVerdict({
    machineId,
    targetMachineId: ctx.machineId,
    agentKeepsConversation: agentKeepsConversation(String(record.agent)),
    resumeArgvLength: record.resumeArgv?.length ?? 0,
    provenance: provenanceOf(record.resumeProvenance)
  });
  // REACHED as of Phase 73, for a muse row whose id the connected time store
  // harvest proved on this machine, and as of PHASE 84 for a row of any of the
  // seven agents that take a conversation id on their own launch flag, because a
  // remote create now puts one there and records it.
  //
  // THE OUTCOME STILL CARRIES A REFUSAL AND A SENTENCE, and the fix round put
  // them here. Before it, an armed row came back with `resumeRefusal: null` and
  // `resumeNote: null`, so the one shape of row Phase 84 added was the one shape
  // that said nothing at all about its conversation. `resumeArmed` was already
  // false and the log line was already written, and neither of those is
  // something a person reads.
  //
  // The refusal is this file's own rather than the gate's, for the reason on
  // {@link RemoteResumeRefusal}. Typing a resume command into a pane on another
  // machine needs `send-keys`, which is on the permanently refused verb list at
  // `./exec-plane.ts`, and the decision to change that list is not made here.
  const refusal: RemoteResumeRefusal | null = arming.arm
    ? 'not-typed-here'
    : arming.refusal;
  const note = arming.arm ? RESUME_NOT_TYPED_HERE : arming.reason;
  if (arming.arm) {
    machinesLog.warn(
      `the arming gate allowed a conversation for ${sessionId} on ${machineId} ` +
        `and this release has no way to continue one on another machine`
    );
  }
  return {
    session: projectRemoteRecord(fresh),
    tmuxId,
    stampsLanded,
    serverWasBorn: server.born,
    savedOutputAt: savedAt,
    // Always false. The gate above can now say yes for two different shapes of
    // row, and the typing half does not exist for either. Phase 73's backlog
    // entry records it as the first owed item and Phase 84 did not close it.
    resumeArmed: false,
    resumeRefusal: refusal,
    resumeNote: note,
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
