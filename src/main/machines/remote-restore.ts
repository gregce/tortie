/**
 * Bringing back a session that lives on another machine (Phase 72, M5,
 * research 51 sections 4.3 and 4.6).
 *
 * ## What it brings back, and what it does not
 *
 * IT BRINGS BACK the session, on that machine, in the same folder, running the
 * same program by bare name, with the four session options and both pane
 * environment variables, and the manifest row moves to `running`.
 *
 * IT DOES NOT BRING BACK the conversation, and Phase 73 did not change that.
 * What Phase 73 changed is the record. The connected time store harvest reads
 * an agent's own store on a machine while Tortie is connected to it, so a row
 * for one of four agents can now carry a `resume_argv` and a
 * `remote-store-harvest` provenance, and for a muse row the arming gate says
 * yes. Saying yes is not typing. Nothing in this release types a resume command
 * into a pane on another machine, so `resumeArmed` is false on every outcome
 * this function returns and the sentence a person reads is unchanged. A row the
 * harvest could not prove still says `remote-not-collected` rather than saying
 * nothing, and every surface prints that sentence.
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
import type { Session } from '@shared/types';
import { savedOutputAt } from '../restore/snapshots';
import type { ManifestSessionRecord } from '../manifest/codecs';
import { provenanceOf } from '../manifest/contract';
import { assertArgvBelongsToMachine, captureRemoteArgv } from './remote-argv';
import { execOn } from './exec-plane';
import { ensureRemoteServer } from './remote-server';
import {
  REPLAY_IS_NOT_ATTEMPTED,
  RESTORE_NO_RECORD,
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
export { REPLAY_IS_NOT_ATTEMPTED, RESTORE_NO_RECORD };

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
   * FALSE for every row this release can produce. No remote row carries a
   * conversation id, because reading an agent's own files on another machine is
   * M6, so the arming gate refuses every one of them.
   */
  readonly resumeArmed: boolean;
  /** Which arm of the arming gate this row took, or null when it armed. */
  readonly resumeRefusal: ArmingRefusal | null;
  /**
   * The sentence about the conversation, or null when there is nothing to say.
   *
   * It is null for a session whose agent keeps no conversation, which is every
   * shell: nothing was lost, so inventing a sentence would invent a problem.
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

  // Step 3b. The program is still on that machine. A read, and it turns the
  // failure a person would otherwise meet, being a pane that prints "command not
  // found" and dies about a second later, into a sentence naming the program and
  // the machine. It runs after `ensureRemoteServer` because that is what
  // refreshes the search list this read is asked against.
  const launchArgv = bareLaunchArgv(record);
  const bare = launchArgv[0] ?? '';
  if (bare.length > 0) await captureRemoteArgv(ctx, bare);

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
    // BY BARE NAME. The row's `argv[0]` is the absolute path captured on that
    // machine, and it is a record rather than an instruction. See
    // `./remote-argv.ts` for the two reasons the launch stays bare, and step 3b
    // above for the read that proved the machine still has it.
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
  if (arming.arm) {
    // REACHED as of Phase 73, for a muse row whose id the connected time store
    // harvest proved on this machine. It stays a refusal rather than a silent
    // success, because typing a resume command into a pane on another machine
    // is a half nothing in this release builds. A silent success here would
    // report a continued conversation that was never continued.
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
    // Always false. The gate above can now say yes, and the typing half does
    // not exist. Phase 73's backlog entry records it as the first owed item.
    resumeArmed: false,
    resumeRefusal: arming.refusal,
    resumeNote: arming.reason,
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
 * The launch argv for a restore, BY BARE NAME.
 *
 * The row records the absolute path on that machine at `argv[0]`, and the launch
 * puts the bare name back. Both reasons are in `./remote-argv.ts`. The rest of
 * the argv is the row's own, unchanged, because those are the flags the session
 * was created with and a resume does not re-apply launch flags.
 *
 * An empty argv is a plain shell session, and tmux starts the machine's own
 * default command for it, which is what the create did too.
 */
function bareLaunchArgv(record: ManifestSessionRecord): string[] {
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
