/**
 * The conversation id feed — Phase 13.5's harvest, its boot rescue and its
 * Phase 32 reclaim correction, as one module.
 *
 * An agent that does not take a conversation id on its command line writes one
 * into its own store shortly after it starts. This feed watches that store,
 * arms the resume argv the moment the record appears, re-arms every row that
 * was left un-harvested by an earlier launch, and corrects the row that loses a
 * conversation to a session with better evidence.
 *
 * Phase 125 moved these four functions out of `./core.ts`. Every comment moved
 * with its code and no rule changed. What is durability critical here is what
 * it has always been, being `setAgentSessionId`, `clearAgentSessionId` and
 * `setResumeCapture` on the manifest, plus the `@gmux-session-id` tmux stamp.
 * None of the three writes changed, and neither did the stamp.
 *
 * THE ONE RULE THIS FILE KEEPS. It imports nothing from `./core`. It reads the
 * core through {@link IdHarvestDeps}, and the three maps in that object are the
 * core's OWN maps, passed by reference rather than copied, which is what makes
 * the behaviour identical to the inline version.
 */

import {
  agentBinaryName,
  // PHASE 49. The last RESOLVED scan, never a new one. The create path reads
  // this synchronously, so a create can never start a version probe and can
  // never wait on one.
  peekDetectedAgents,
  registryResumeArgv
} from '../agents';
import { getLog } from '../log';
import {
  agentHarvestsId,
  agentRescuesId,
  agentRescuesIdAfterExit,
  claimConversationId,
  conversationClaimant,
  conversationClaimStrength,
  harvestProvenance,
  ManifestStore,
  resolveClaimCwd,
  SESSION_CONTRACT_VERSION,
  watchForSessionId,
  type ConversationReclaim,
  type HarvestContext,
  type ManifestSessionRecord,
  type ResumeIdSource,
  type ResumeProvenance,
  type SessionIdWatch
} from '../manifest';
import { wrapWithRecord } from '../specstory';
import * as tmux from '../tmux';
import type { LaunchableAgentKind, ResumeCapture } from '@shared/types';
import { agentExtrasOf } from './launch-plan';
import { claimStrengthOf } from './reconcile-plan';

/**
 * Scope "sessions" (Phase 35), the same scope `./core.ts` writes under, so a
 * line this feed writes reads exactly as it did before Phase 125 moved it.
 */
const sessionsLog = getLog('sessions');

/**
 * How long a boot rescue looks for the record of a session whose process is
 * already gone. The store scan runs immediately and nothing will be written
 * afterwards, so this only has to outlast a slow disk — not the hours a LIVE
 * harvest waits for a trust prompt to be answered.
 */
const DEAD_ROW_RESCUE_TIMEOUT_MS = 20_000;

/**
 * What the feed needs from the session core.
 *
 * The three maps are the core's own objects. They are handed over by reference
 * rather than copied, so the core and this feed read and write the same
 * entries, which is what keeps the behaviour identical to the inline version.
 */
export interface IdHarvestDeps {
  readonly manifest: ManifestStore;
  /** manifest session id → live tmux `$-id`. */
  readonly liveIds: Map<string, string>;
  /** Pending session-id harvests, cancelled on kill/shutdown. */
  readonly idCaptureWatches: Map<string, SessionIdWatch>;
  /** True once the core has been disposed and its manifest closed. */
  isDisposed(): boolean;
  /** Push the full session list to every window. */
  broadcastSessions(): void;
}

/**
 * The installed version of `agent`, or null when nothing can say yet.
 *
 * SYNCHRONOUS SINCE PHASE 49, and that is the point. `peekDetectedAgents()`
 * returns the last RESOLVED scan and never starts one, so a create can
 * never start a version probe and can never wait on one. Since Phase 164
 * the scan starts when a surface asks for it, and the Create Session surface
 * is one of them, so by the time a person presses Create the scan has
 * usually resolved; a create that beats it records agent_version NULL on
 * its row, exactly as the harvest path has always tolerated. The column is
 * nullable and nothing on the restore path reads it for correctness (Phase
 * 21 recorded the contract on the row instead).
 *
 * The manifest records the SpecStory wrapper's version already, explicitly
 * so a restore after a mid-flight upgrade replays the same binary. The agent
 * is the thing whose resume semantics actually change, and five of nine
 * installed agents drifted in the three days between research 30 being
 * written and being re-measured, so this is the version that matters more.
 */
export function cachedAgentVersion(agent: LaunchableAgentKind): string | null {
  if (agent === 'shell') return null;
  return (
    peekDetectedAgents()?.agents.find((a) => a.id === agent)?.version ?? null
  );
}

/**
 * How a watch was started. Phase 125 gave the inline shape a name, because
 * ./create-local.ts declares the same call in its own dependency interface and
 * two copies of one shape is what the house rules forbid. The fields, their
 * types and the comment on `atCreate` are the ones this options object has
 * carried since Phase 21.
 */
export interface IdCaptureOptions {
  timeoutMs?: number;
  markUnavailableOnFailure?: boolean;
  /**
   * TRUE when the watch was started with the pane (Phase 21, G6). FALSE
   * means a later launch started it against a REMEMBERED spawn time, with
   * no live process to correlate against, and the provenance records that
   * difference permanently rather than letting the two look alike.
   */
  atCreate?: boolean;
}

/**
 * Watch a harvesting agent's session store for the record that identifies
 * this pane's conversation, and arm the resume argv the moment it appears.
 * Used at create time AND re-armed on boot for sessions that were spawned
 * but never harvested (e.g. gmux quit within the harvest window).
 *
 * Was codex-only until Phase 13.5; the per-agent store paths, filename
 * patterns and correlation keys are now data in src/main/manifest/harvest.
 */
export function startIdCapture(
  deps: IdHarvestDeps,
  id: string,
  agent: LaunchableAgentKind,
  ctx: HarvestContext,
  extraArgs: readonly string[],
  options: IdCaptureOptions = {}
): void {
  if (agent === 'shell' || !agentRescuesId(agent)) return;
  if (deps.idCaptureWatches.has(id)) return;
  const watch = watchForSessionId(agent, ctx, {
    // PHASE 21 fix round. The session this watch is FOR. Two panes started
    // seconds apart in one folder can both see the first record, and the
    // freshness window is two seconds wide on purpose, so without this the
    // second pane could arm the first pane's conversation and record the
    // answer as proven. A record another session already has is not a
    // candidate here, and the same session may retake its own id when the
    // watch is started again.
    claimant: id,
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {})
  });
  deps.idCaptureWatches.set(id, watch);
  watch.promise
    .then((harvested) => {
      deps.idCaptureWatches.delete(id);
      // dispose() cancels every watch and then closes the manifest, so a
      // settle that lands after teardown must touch nothing.
      if (deps.isDisposed()) return;
      // The session may have been killed/discarded while we watched.
      const rec = deps.manifest.getSession(id);
      if (rec === undefined) return;
      // Resume with the session's recorded ABSOLUTE binary (Bug A), and
      // re-append the original extras — resume restores no launch flags.
      //
      // Phase 15: on a CAPTURED session, `rec.argv[0]` is the specstory
      // wrapper, not the agent — the agent's own argv lives in the capture
      // record, which is why it is stored verbatim. Compose the inner
      // resume from THAT, then put the wrapper back around it, so a
      // harvested session restores captured exactly like a pre-assigned one.
      const capture = rec.specstory;
      const innerBin =
        capture?.agentArgv[0] ?? rec.argv[0] ?? agentBinaryName(agent);
      const innerResume = registryResumeArgv(
        agent,
        harvested.sessionId,
        extraArgs,
        innerBin
      );
      if (innerResume.length === 0) return; // never persist an id-less argv
      let resumeArgv = innerResume;
      if (capture?.enabled === true) {
        const rewrapped = wrapWithRecord(capture, innerResume);
        if (rewrapped !== null) resumeArgv = rewrapped;
        else {
          // The wrap could not be rebuilt (an argument SpecStory cannot
          // pass through). Arming the BARE resume is right — the
          // conversation is what matters — but the user's capture would
          // silently stop at the restore, so it is said out loud.
          sessionsLog.warn(
            `${agent} resume for "${rec.name}" could not keep ` +
              'SpecStory capture; the armed command runs the agent directly.'
          );
        }
      }
      // PHASE 21 (G6) — persist how good the evidence was, not just the id.
      //
      // The watcher knows which key proved the record, whether a timer
      // accepted it, and how many candidates were still in play. All of it
      // used to end at the console line below, so an exact correlation and
      // a timing guess reached the manifest as the same armed session.
      const provenance = harvestProvenance(harvested, {
        cwd: ctx.cwd,
        agentVersion: cachedAgentVersion(agent),
        atCreate: options.atCreate !== false
      });
      // ONE durable write, not two. The id and the claim about the id go
      // into the same transaction, so no power cut can leave a row that is
      // armed and silent about where the id came from.
      deps.manifest.setAgentSessionId(
        id,
        harvested.sessionId,
        resumeArgv,
        provenance
      );
      if (provenance.confidence !== 'exact') {
        // Armed, but not PROVEN to be this pane's conversation. Said out
        // loud in the log because the alternative is a confident restore
        // into somebody else's session.
        sessionsLog.warn(
          `${agent} resume id ${harvested.sessionId} matched on ` +
            `'${harvested.key}'${harvested.viaGraceTimer ? ' via the grace timer' : ''} ` +
            `with ${harvested.rivals} candidate(s) in play ` +
            `(${provenance.confidence}) — ${harvested.storePath}`
        );
      }
      const live = deps.liveIds.get(id);
      if (live !== undefined) {
        void tmux
          .setSessionOption(live, '@gmux-session-id', harvested.sessionId)
          .catch(() => undefined);
      }
      deps.broadcastSessions();
    })
    .catch((err: unknown) => {
      deps.idCaptureWatches.delete(id);
      if (deps.isDisposed()) return; // teardown cancelled us; the DB is closed
      // A TIMEOUT IS NOT A SUCCESS. It is not terminal either, and that is
      // a deliberate change from research 22 §4.1 point 2, which assumed a
      // harvest "resolves within seconds for every Tier-2 agent". MEASURED
      // 2026-08-11: codex and muse sit behind a first-run trust prompt and
      // write nothing until it is answered, and codex writes no rollout at
      // all until the first turn. Flipping to "directory only" while gmux
      // is still watching — and will arm the moment the user types — would
      // be a worse lie than the one this phase is fixing. The state goes
      // terminal where the answer really is final: refresh() re-arms live
      // sessions, and resumeIdHarvests() withdraws the promise once the
      // session is gone without an id.
      sessionsLog.warn(`${agent} session-id harvest: ${(err as Error).message}`);
      // …EXCEPT for a rescue of a session that has already exited, where
      // the answer really is final: no process will ever write that record
      // now, so the row stops saying 'capturing' and says what a restore
      // would actually give the user.
      if (options.markUnavailableOnFailure === true) {
        const rec = deps.manifest.getSession(id);
        if (rec?.resumeCapture === 'capturing') {
          deps.manifest.setResumeCapture(id, 'unavailable');
        }
      }
      deps.broadcastSessions();
    });
}

/**
 * Boot-time finalization: any session still missing its agentSessionId gets
 * a fresh watch keyed to its original spawn time, so resume ids are
 * recorded even across a gmux restart mid-harvest. extraArgs are recovered
 * from the recorded launch argv.
 *
 * Phase 13.5.1 widened this past the harvesting agents, because the rows the
 * user reported were being skipped by the very code written to rescue them:
 * muse-1 and qwen-1 were re-armed here, and pi-1 and pi1 were not, since pi
 * PRE-ASSIGNS and so never had a harvester — leaving two sessions with a
 * NULL resume argv and their transcripts sitting on disk the whole time. A
 * row with no id is a row the launch path already failed for, whatever its
 * agent's normal strategy is, so the question is only whether the store can
 * still answer (see agentRescuesId / agentRescuesIdAfterExit).
 */
export function resumeIdHarvests(deps: IdHarvestDeps): void {
  // PHASE 21 fix round, and it has to happen before the first watch starts.
  // The in-process record of who owns which conversation is empty at boot,
  // so a rescue watch would be free to hand session A's conversation to
  // session B. The manifest already knows. Every id it holds is claimed by
  // the row that holds it, and the rescues below then look for a record
  // nobody has.
  for (const rec of deps.manifest.listSessions()) {
    // Phase 29: a tombstone claims nothing. Remove released the claim on
    // purpose, and a tombstone re-claiming its conversation at the next
    // boot would block a new session in that folder from recording the id.
    if (rec.status === 'discarded') continue;
    if (rec.agentSessionId === undefined) continue;
    // Phase 32 (strength extracted to claimStrengthOf in Phase 29): a row
    // armed by a grace GUESS must stay reclaimable across restarts. Phase
    // 34 added the middle rung, so a folder match is takeable here too, and
    // the row's cwd travels with the claim because that is what decides
    // whether another session's folder match may take it.
    if (
      claimConversationId(
        rec.agentSessionId,
        rec.id,
        claimStrengthOf(rec),
        rec.cwd
      )
    ) {
      continue;
    }
    // Two rows already record one conversation. This build cannot make that
    // happen any more, and it cannot undo one that a previous build wrote:
    // there is no way to know which row is right. It is said out loud
    // because restoring both resumes the same conversation twice, and that
    // is worth knowing before it surprises someone. MEASURED in the T1 smoke
    // profile the moment this landed: codex-1 and codex-2 both carry
    // 019febf5-e7fa-7e32-8fd5-c4a56e10a859.
    sessionsLog.warn(
      `sessions ${String(conversationClaimant(rec.agentSessionId))} ` +
        `and ${rec.id} both record ${rec.agent} conversation ` +
        `${rec.agentSessionId}. Restoring both resumes the same conversation.`
    );
  }
  for (const rec of deps.manifest.listSessions()) {
    // Phase 29: never rescue an id for a tombstone. A rescue watch would
    // write a conversation id onto a row the user removed.
    if (rec.status === 'discarded') continue;
    if (rec.agent === 'shell' || !agentRescuesId(rec.agent)) continue;
    if (rec.agentSessionId !== undefined) continue;
    const live = deps.liveIds.get(rec.id);
    if (
      rec.status === 'exited' ||
      rec.status === 'restorable' ||
      live === undefined
    ) {
      // The process is gone. For most agents that ends it — their stores are
      // keyed on a pid or a tmux pane that no longer exists — so leaving the
      // row 'capturing' would spin forever over a session that comes back as
      // a bare directory. A cwd+start-time store (pi) outlives its pane,
      // though, and this is exactly the post-reboot case the phase is for:
      // give it one bounded look, then say 'unavailable' if it finds nothing.
      if (agentRescuesIdAfterExit(rec.agent)) {
        startIdCapture(
          deps,
          rec.id,
          rec.agent,
          // Resolved, because `HarvestContext.cwd` is the store key for pi
          // and qwen and the folder every ownership rule compares. The row
          // keeps the folder the user chose, which can be a symlink to the
          // folder another row spells directly.
          { cwd: resolveClaimCwd(rec.cwd), sinceTs: rec.createdAt },
          agentExtrasOf(rec),
          {
            // The record either exists now or never will: no process is
            // going to write one. One scan, not a six-hour vigil.
            timeoutMs: DEAD_ROW_RESCUE_TIMEOUT_MS,
            markUnavailableOnFailure: true,
            // No live pane to correlate against — this is time alone.
            atCreate: false
          }
        );
        continue;
      }
      if (rec.resumeCapture === 'capturing') {
        deps.manifest.setResumeCapture(rec.id, 'unavailable');
      }
      continue;
    }
    startIdCapture(
      deps,
      rec.id,
      rec.agent,
      {
        cwd: resolveClaimCwd(rec.cwd),
        sinceTs: rec.createdAt,
        tmuxSessionId: live,
        ...(rec.panePid !== undefined ? { panePid: rec.panePid } : {})
      },
      agentExtrasOf(rec),
      // The pane is still alive, so the pane and pid keys still work, but
      // the watch was started by a LATER launch against a remembered spawn
      // time. That is weaker than a watch started with the pane, and the
      // record says so.
      { atCreate: false }
    );
  }
}

/**
 * Correct the loser of a conversation reclaim (Phase 32).
 *
 * Another session PROVED, by its own agy process holding the record open,
 * that a conversation id this row carries was a wrong grace guess. The map
 * in the watcher was already corrected before this fired; what is left is
 * the durable side: withdraw the id from the row, record why, and give the
 * loser a fresh watch so it finds its OWN conversation on its own first
 * turn.
 *
 * ORDERING GUARANTEE. This runs synchronously inside the winner's accept,
 * before the winner's settle resolves, and better-sqlite3 writes are
 * synchronous. The winner's own `setAgentSessionId` happens in its watch's
 * `.then()` AFTER this returns, so at no observable moment do two manifest
 * rows carry the same conversation id.
 */
export function handleConversationReclaim(
  deps: IdHarvestDeps,
  ev: ConversationReclaim
): void {
  try {
    if (deps.isDisposed()) return;
    const rec = deps.manifest.getSession(ev.from);
    // The row is gone, or it no longer carries the reclaimed id (a test
    // claimant, or a row corrected already). The claim map was fixed in
    // the watcher; there is nothing durable to correct.
    if (rec === undefined || rec.agentSessionId !== ev.conversationId) return;
    const prior = rec.resumeProvenance;
    // The correction keeps the withdrawn guess's own evidence: those
    // fields describe the guess being taken back, and losing them would
    // erase the only record of how the wrong id got there.
    const provenance: ResumeProvenance = {
      v: SESSION_CONTRACT_VERSION,
      source: prior?.source === 'boot-rescue' ? 'boot-rescue' : 'store-harvest',
      confidence: 'none',
      at: ev.at,
      cwd: prior?.cwd ?? rec.cwd,
      ...(prior?.key !== undefined ? { key: prior.key } : {}),
      ...(prior?.keyConfidence !== undefined
        ? { keyConfidence: prior.keyConfidence }
        : {}),
      ...(prior?.viaGraceTimer !== undefined
        ? { viaGraceTimer: prior.viaGraceTimer }
        : {}),
      ...(prior?.rivals !== undefined ? { rivals: prior.rivals } : {}),
      ...(prior?.contestedByWatches !== undefined
        ? { contestedByWatches: prior.contestedByWatches }
        : {}),
      ...(prior?.sameCwdWatches !== undefined
        ? { sameCwdWatches: prior.sameCwdWatches }
        : {}),
      ...(prior?.storePath !== undefined ? { storePath: prior.storePath } : {}),
      reclaimedBy: ev.to,
      reclaimedAt: ev.at
    };
    const live = deps.liveIds.get(ev.from);
    const state: ResumeCapture =
      live !== undefined &&
      rec.agent !== 'shell' &&
      agentHarvestsId(rec.agent)
        ? 'capturing'
        : 'unavailable';
    deps.manifest.clearAgentSessionId(ev.from, state, provenance);
    if (live !== undefined) {
      // Best effort: the tmux marker carried the wrong id too.
      void tmux
        .setSessionOption(live, '@gmux-session-id', '')
        .catch(() => undefined);
    }
    if (live !== undefined && rec.agent !== 'shell') {
      // The watch guard passes: the loser's old watch settled when its
      // grace timer accepted, and a settled watch deletes its entry. The
      // re-armed watch confirms the loser's OWN record the moment its agy
      // takes a turn, because its agy holds those descriptors.
      startIdCapture(
        deps,
        ev.from,
        rec.agent,
        {
          cwd: resolveClaimCwd(rec.cwd),
          sinceTs: rec.createdAt,
          tmuxSessionId: live,
          ...(rec.panePid !== undefined ? { panePid: rec.panePid } : {})
        },
        agentExtrasOf(rec),
        { atCreate: false }
      );
    }
    deps.broadcastSessions();
    // Phase 34: the line names the winner's evidence, because the ladder
    // now has three rungs and "reclaimed" alone does not say which one
    // took it. The operator reads this through Copy Diagnostics.
    const winner = conversationClaimStrength(ev.conversationId);
    const evidence =
      winner === 'confirmed'
        ? 'The winner proved ownership with an identity key.'
        : 'The winner matched the folder the record names.';
    sessionsLog.warn(
      `${rec.agent} conversation ${ev.conversationId} moved from session ` +
        `${ev.from} to ${ev.to}. ${evidence} The losing row was cleared and ` +
        `its watch was ${
          live !== undefined
            ? 'restarted'
            : 'not restarted, because the session has no live pane'
        }.`
    );
  } catch (err) {
    sessionsLog.warn(
      `conversation reclaim correction failed for ${ev.from}: ` +
        `${(err as Error).message}`
    );
  }
}


// ---------------------------------------------------------------------------
// PHASE 141 — the one place a conversation confirmed after a handback is
// written, and the lift of the gate that used to make that impossible
// ---------------------------------------------------------------------------

/**
 * Where an id confirmed after a handback is recorded as having come from.
 *
 * `ResumeIdSource` lives in `../manifest/agents.ts` and this phase does not own
 * that file, so the closest true member is used: the id was read out of the
 * agent's own store or off the process the person started, which is what
 * 'store-harvest' describes. It is a CONSTANT so the integrator has one line to
 * change if a 'handback-confirmed' member is added.
 */
const HANDBACK_ID_SOURCE: ResumeIdSource = 'store-harvest';

/** What {@link admitConfirmedConversationId} did, in the caller's terms. */
export type ConfirmedIdAdmission =
  /** The id and a rebuilt resume argv went to the drive in one write. */
  | 'written'
  /** The row already carries a conversation. Nothing was touched. */
  | 'row-holds-one'
  /** Another row holds that conversation. Nothing was written. */
  | 'claim-refused'
  /** No resume argv could be composed for it, so nothing was written. */
  | 'no-resume-argv';

/**
 * Admit ONE confirmed conversation id onto a row that holds none.
 *
 * ## The hole this closes
 *
 * The boot rescue above reads `if (rec.agentSessionId !== undefined) continue;`
 * and the create time watch deletes itself the moment an id settles, so a
 * conversation started later, in a shell that outlived its agent, was never
 * recorded anywhere. That is the data loss Phase 141 exists to end.
 *
 * ## The gate, lifted exactly as far as that and no further
 *
 * A row that HOLDS a conversation is refused here, in the same words the boot
 * loop refuses it. This function cannot re-point `agent_session_id`, cannot
 * take a conversation another row holds, and cannot write an id without
 * rebuilding the resume argv in the same durable write, so a row can never name
 * one conversation on screen and arm a different one on the next restart.
 *
 * ## The order, and it matters
 *
 * The argv is composed BEFORE the claim, so a row that turns out to have no
 * composable resume never leaves a claim behind it. The claim is taken next,
 * because a refused claim must write nothing at all. The manifest write is
 * last, and it is one write rather than two.
 *
 * Its only product caller is `./resume-in-place.ts`, which owns the decision
 * about WHETHER an id may be admitted. This function owns the mechanics of
 * admitting one.
 */
export function admitConfirmedConversationId(
  deps: IdHarvestDeps,
  rec: ManifestSessionRecord,
  conversationId: string,
  at: number
): ConfirmedIdAdmission {
  if (deps.isDisposed()) return 'no-resume-argv';
  // The lift of the boot loop's gate: a row that holds a conversation keeps it.
  if (rec.agentSessionId !== undefined) return 'row-holds-one';
  if (rec.agent === 'shell') return 'row-holds-one';
  if (rec.status === 'discarded') return 'row-holds-one';

  // The same composition the harvest write above makes, for the same reason:
  // on a captured session `rec.argv[0]` is the SpecStory wrapper rather than
  // the agent, so the inner argv is composed first and the wrapper goes back
  // around it afterwards.
  const capture = rec.specstory;
  const innerBin =
    capture?.agentArgv[0] ?? rec.argv[0] ?? agentBinaryName(rec.agent);
  const extras = agentExtrasOf(rec);
  // FOUND BY THIS PHASE'S OWN TEST. `registryResumeArgv` THROWS for an agent
  // the registry holds but cannot launch in a session, e.g. cursoride, whose
  // resume is a row written into another program's database rather than a
  // command. `startIdCapture` above never meets that case because
  // `agentRescuesId` filters it out first, and this path has no such filter in
  // front of it: the agent column is whatever the row records. A throw here
  // would land inside a confirmation nobody is awaiting, so it is an answer
  // rather than an exception.
  let innerResume: string[];
  try {
    innerResume = registryResumeArgv(rec.agent, conversationId, extras, innerBin);
  } catch {
    return 'no-resume-argv';
  }
  if (innerResume.length === 0) return 'no-resume-argv';
  let resumeArgv = innerResume;
  if (capture?.enabled === true) {
    const rewrapped = wrapWithRecord(capture, innerResume);
    if (rewrapped !== null) resumeArgv = rewrapped;
    else {
      sessionsLog.warn(
        `${rec.agent} resume for "${rec.name}" could not keep SpecStory ` +
          'capture; the armed command runs the agent directly.'
      );
    }
  }

  // 'confirmed' rather than `claimStrengthOf`, and the difference is the
  // point: this id was read out of the process that is running in that session
  // right now, which is the same quality of evidence an identity harvest key
  // gives. A row with no key reads 'confirmed' in `claimStrengthOf` too.
  if (!claimConversationId(conversationId, rec.id, 'confirmed', rec.cwd)) {
    // The shipped comment on the boot loop is explicit that two rows on one
    // conversation cannot be undone, because there is no way to know which row
    // is right. So this writes nothing and says so.
    sessionsLog.warn(
      `session ${String(conversationClaimant(conversationId))} already ` +
        `records ${rec.agent} conversation ${conversationId}, so session ` +
        `${rec.id} was not bound to it and nothing was written.`
    );
    return 'claim-refused';
  }

  const agentVersion = cachedAgentVersion(rec.agent);
  const provenance: ResumeProvenance = {
    v: SESSION_CONTRACT_VERSION,
    source: HANDBACK_ID_SOURCE,
    confidence: 'exact',
    at,
    cwd: resolveClaimCwd(rec.cwd),
    ...(agentVersion !== null ? { agentVersion } : {})
  };
  deps.manifest.setAgentSessionId(rec.id, conversationId, resumeArgv, provenance);
  const live = deps.liveIds.get(rec.id);
  if (live !== undefined) {
    // Best effort, exactly as the harvest write does it: the tmux marker is a
    // second copy of the same fact and losing it costs a diagnostic.
    void tmux
      .setSessionOption(live, '@gmux-session-id', conversationId)
      .catch(() => undefined);
  }
  deps.broadcastSessions();
  sessionsLog.info(
    `session ${rec.id} was bound to ${rec.agent} conversation ` +
      `${conversationId} after its agent came back.`
  );
  return 'written';
}
