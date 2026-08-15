/**
 * The ONE store watcher — the generic half of Phase 13.5's session-id capture
 * (docs/research/22-resume-audit.md §3.2). Every agent-specific fact it needs
 * (where to look, how to read an id out of a name, how to prove the record is
 * this pane's) arrives as a HarvestDescriptor from ./stores.ts, so adding an
 * agent never means adding a second harvester.
 *
 * Strategy, inherited from the shipped codex harvester and now shared:
 *  - @parcel/watcher (FSEvents) subscriptions on the descriptor's roots — the
 *    fast channel,
 *  - plus a readdir poll that BACKS OFF, because a native watcher can fail to
 *    initialize or drop events and the id is the whole point,
 *  - disambiguation by the descriptor's key: a confirmed candidate wins as
 *    soon as a directory listing has counted its neighbours; an unconfirmable
 *    one is accepted after `graceMs` only if no confirmed rival has appeared,
 *    and is flagged `viaGraceTimer` so nobody downstream mistakes "probably"
 *    for "proven".
 *
 * Two rules from the Phase 21 fix round, both about the same thing, which is
 * that a claim recorded in the manifest has to be true afterwards:
 *
 *  1. Nothing is accepted until a readdir has FINISHED, and until one has run
 *     since the last record the fast channel brought in. An event batch says
 *     what one write did, and a listing that is half way through registering
 *     what it found is a prefix of the answer. The number being recorded says
 *     what the directory held, so it has to come from the directory.
 *  2. A record another session in this process is already resuming from is not
 *     a candidate for this one. See `claimedConversations`.
 *
 * A TIMEOUT IS NOT A SUCCESS: the promise rejects with a message saying the
 * session is fine and the id was not recorded. See HARVEST_WINDOW_MS in
 * ./stores.ts for why that window is hours rather than the old two minutes.
 *
 * Ownership: src/main/manifest/**. Pure Node (no Electron import).
 */

import { existsSync, realpathSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as parcelWatcher from '@parcel/watcher';
import type { LaunchableAgentId } from '@shared/types';
import { getRegistryEntry } from '../../agents/registry';
import { trackWatcherClose } from '../../watcher/teardown';
import {
  claimRank,
  claimStrengthForKey,
  mayTakeOver,
  type ClaimStrength
} from './claim-strength';
import {
  DESCRIPTORS,
  type DescriptorEnv,
  type HarvestContext,
  type HarvestDescriptor,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './stores';
import { getLog } from '../../log';

/**
 * Scope "manifest" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const manifestLog = getLog('manifest');


// ---------------------------------------------------------------------------
// The watcher
// ---------------------------------------------------------------------------

interface Candidate {
  path: string;
  sessionId: string;
  /** Filename timestamp when the name carries one, else first-seen. */
  orderTs: number;
  firstSeen: number;
  verdict: HarvestVerdict;
}

/** Which channel brought a path in. Only the listing can count neighbours. */
type CandidateSource = 'poll' | 'events';

// ---------------------------------------------------------------------------
// Who already owns which conversation
// ---------------------------------------------------------------------------

/**
 * The claim strength ladder moved to ./claim-strength.ts in Phase 34, because
 * `deriveResumeConfidence` reads the same fact about a key and the two must
 * not drift. The type is re-exported here so every existing importer of
 * './watch' keeps working.
 */
export type { ClaimStrength };

interface ConversationClaim {
  claimant: string;
  strength: ClaimStrength;
  /**
   * The launch folder of the session that holds it, as `resolveClaimCwd`
   * returned it (Phase 34). It is what the rank 2 takeover rule compares: a
   * folder match proves the loser cannot own the record only when the loser
   * is somewhere else. Absent for a caller that did not name one, and an
   * absent folder refuses the transfer rather than guessing.
   */
  cwd?: string | undefined;
}

/**
 * The one spelling of a launch folder that the ownership rules compare.
 *
 * WHY THIS EXISTS, and it is measured rather than theoretical. The rank 2
 * rule in ./claim-strength.ts compares two launch folders as STRINGS, and on
 * macOS one physical folder has more than one spelling, because `/tmp` is a
 * symlink to `/private/tmp`. A pane launched at `/private/tmp/proj` took a
 * grace claim, a second pane launched at `/tmp/proj` matched the same record,
 * the two strings were not equal, and the second pane TOOK the claim. That is
 * the same folder steal the rule exists to refuse. The same compare decides
 * `sameCwdWatches`, so the neighbour also went uncounted and the row recorded
 * `exact` where the honest answer is `weak`.
 *
 * Every folder that enters the claim map or the pending watch map goes
 * through here first, so the compare means the folder rather than the path
 * the caller happened to type. A folder that no longer exists resolves to
 * itself, which is the only spelling anyone has for it.
 *
 * It is exported because `sessions/core.ts` resolves the same way before it
 * builds a `HarvestContext`, and one implementation is what keeps the two
 * from drifting.
 */
export function resolveClaimCwd(cwd: string): string {
  try {
    return realpathSync(cwd);
  } catch {
    return cwd;
  }
}

/**
 * Conversation ids this process has already given to a session, and to which
 * session (the "claimant").
 *
 * WHY THIS EXISTS. Verifier B measured two panes started 150 ms apart in one
 * folder both settling on the SAME codex rollout, and both recording the
 * answer as 'exact'. The second pane's own record did not exist yet when its
 * watch looked, and the freshness window is deliberately two seconds wide to
 * absorb clock skew, so the first pane's record was a legal candidate for it.
 * Two manifest rows then pointed at one conversation and both claimed the
 * correlation was proven.
 *
 * A directory cannot separate them. Ownership can: a record that another
 * session is already resuming from is not this session's record, whatever the
 * timestamps say. The loser of the race keeps waiting and gets its own record
 * a moment later, which is the RIGHT answer rather than a hedged one.
 *
 * PHASE 32 GAVE EACH CLAIM A STRENGTH, because first-wins alone re-created
 * the defect one level up for the time-keyed store: a hungry earlier watch
 * grace-claimed the LATER session's conversation, and the rightful session
 * was then permanently starved by this very filter. A grace claim is now
 * provisional, an exact confirm takes it over (see `accept`), and the loser's
 * manifest row is corrected through the reclaim event below.
 *
 * PHASE 34 MADE THE STRENGTH FOLLOW THE KEY rather than the timer. A folder
 * match is evidence and not proof, so it claims 'matched', which an identity
 * proof can still take. Only an identity key claims 'confirmed'. Without that
 * rung, two CodeWhale panes in one folder ended with the first watch holding
 * an immovable claim on a record that may be the other pane's. See
 * ./claim-strength.ts for the ladder and the two takeover rules.
 *
 * It is keyed by claimant so that re-watching the SAME session (the boot
 * rescue, a restore) can retake the id it already had.
 *
 * Nothing prunes it. One entry is a short record per successful harvest, the
 * count is the number of sessions, and an entry that expired would put the
 * hazard back for the case it exists to cover.
 */
const claimedConversations = new Map<string, ConversationClaim>();

let anonymousClaimants = 0;

/**
 * A claimant for a caller that did not name one.
 *
 * Every watch gets a distinct one, so the protection is on by default and a
 * caller has to opt IN to sharing an id rather than opt out of stealing one.
 */
function nextAnonymousClaimant(): string {
  anonymousClaimants += 1;
  return `anon-${String(anonymousClaimants)}`;
}

/**
 * The claim some OTHER session holds on this conversation, if any.
 *
 * The caller decides what to do with it, because the answer is no longer a
 * yes or no about one strength: a candidate may be filtered out, winnable by
 * proof, or winnable only from a different folder.
 */
function claimHeldByAnother(
  conversationId: string,
  claimant: string
): ConversationClaim | undefined {
  const claim = claimedConversations.get(conversationId);
  return claim !== undefined && claim.claimant !== claimant ? claim : undefined;
}

/**
 * Record that `claimant` owns `conversationId`.
 *
 * Exported because the manifest knows things this process has not watched: at
 * boot, every row that already carries a conversation id claims it, so a
 * rescue watch started minutes later cannot hand one session's conversation to
 * another. The first claim wins; a later one for the same id is refused, since
 * the row that already had it is the one with the older evidence.
 *
 * `strength` says how the id was originally obtained (Phase 32). It defaults
 * to 'confirmed' so every pre-existing caller keeps its old meaning. This
 * function NEVER performs a takeover, whatever strengths collide: takeover is
 * the accept path's alone, so a boot claim can never silently steal.
 *
 * `cwd` is the claimant's launch folder (Phase 34). It is optional and last,
 * and it is only read when something later asks whether a folder match may
 * take this claim. A claim with no folder is never taken by a folder match.
 * It is resolved here rather than trusted, because the boot claim passes the
 * folder the row was created with and two rows in one folder can spell it two
 * ways (see `resolveClaimCwd`).
 *
 * It says nothing itself. A refusal means two different things depending on
 * who asked, and only the caller knows which: a watch being refused is a bug
 * in the watch, while a boot time claim being refused is a pair of rows that
 * were already sharing a conversation before this build existed.
 *
 * @returns true when `claimant` holds it afterwards, which includes the case
 *          where it already did.
 */
export function claimConversationId(
  conversationId: string,
  claimant: string,
  strength: ClaimStrength = 'confirmed',
  cwd?: string
): boolean {
  if (conversationId.length === 0) return false;
  const claim = claimedConversations.get(conversationId);
  if (claim !== undefined) return claim.claimant === claimant;
  claimedConversations.set(conversationId, {
    claimant,
    strength,
    cwd: cwd === undefined ? undefined : resolveClaimCwd(cwd)
  });
  return true;
}

/** Which session holds it, for a caller that has to name the other one. */
export function conversationClaimant(conversationId: string): string | undefined {
  return claimedConversations.get(conversationId)?.claimant;
}

/** How strongly it is held. For tests and for the core's logging. */
export function conversationClaimStrength(
  conversationId: string
): ClaimStrength | undefined {
  return claimedConversations.get(conversationId)?.strength;
}

/**
 * Give up every conversation `claimant` holds.
 *
 * Called when a session row is DISCARDED, and at no other time. A claim
 * outlives the watch that made it, and it outlives the session ending, because
 * an exited session can still be restored and that restore resumes the same
 * conversation. Only removing the row ends it.
 */
export function releaseConversationClaims(claimant: string): void {
  for (const [id, claim] of claimedConversations) {
    if (claim.claimant === claimant) claimedConversations.delete(id);
  }
}

/** Test hook. The app never forgets every claim at once. */
export function forgetConversationClaims(): void {
  claimedConversations.clear();
}

// ---------------------------------------------------------------------------
// Reclaims — exact beats grace (Phase 32)
// ---------------------------------------------------------------------------

/**
 * An exact confirm displaced another session's provisional claim. Fired
 * synchronously inside the winner's accept, BEFORE its settle, so a decide
 * running in any other watch in the same tick already sees the new owner.
 * The handler in sessions/core.ts corrects the loser's manifest row and
 * restarts its watch.
 */
export interface ConversationReclaim {
  agent: LaunchableAgentId;
  conversationId: string;
  /** The claimant that lost the id (a Tortie session id in production). */
  from: string;
  /** The claimant whose exact confirm won it. */
  to: string;
  /** Epoch ms. */
  at: number;
}

const reclaimListeners = new Set<(ev: ConversationReclaim) => void>();

/** Subscribe to reclaims. Returns the unsubscribe. */
export function onConversationReclaimed(
  listener: (ev: ConversationReclaim) => void
): () => void {
  reclaimListeners.add(listener);
  return () => {
    reclaimListeners.delete(listener);
  };
}

/** Listener exceptions are logged, never propagated into the watch. */
function emitReclaim(ev: ConversationReclaim): void {
  for (const listener of [...reclaimListeners]) {
    try {
      listener(ev);
    } catch (err) {
      manifestLog.warn(
        `conversation reclaim listener failed: ${(err as Error).message}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Pending watches — who else is still looking (Phase 32)
// ---------------------------------------------------------------------------

/**
 * Claimants with a live watch, per agent, each with the folder it was
 * launched in. Two questions are asked of it at an acceptance, and they are
 * different questions:
 *
 *  - how many OTHER sessions of this agent were still waiting for a record
 *    anywhere, which a grace acceptance persists as `contestedByWatches`;
 *  - how many were waiting IN THIS FOLDER, which every acceptance persists as
 *    `sameCwdWatches` (Phase 34). That is the number that says a folder match
 *    was a timing guess: a neighbour in the same folder would have confirmed
 *    the same record, so `rivals: 1` on its own is misleading.
 */
const pendingWatches = new Map<LaunchableAgentId, Map<string, string>>();

function addPendingWatch(
  agent: LaunchableAgentId,
  claimant: string,
  cwd: string
): void {
  let byClaimant = pendingWatches.get(agent);
  if (byClaimant === undefined) {
    byClaimant = new Map();
    pendingWatches.set(agent, byClaimant);
  }
  byClaimant.set(claimant, cwd);
}

function removePendingWatch(agent: LaunchableAgentId, claimant: string): void {
  pendingWatches.get(agent)?.delete(claimant);
}

function otherPendingWatchCount(
  agent: LaunchableAgentId,
  claimant: string
): number {
  const byClaimant = pendingWatches.get(agent);
  if (byClaimant === undefined) return 0;
  return byClaimant.size - (byClaimant.has(claimant) ? 1 : 0);
}

/** Other watches of this agent whose launch folder is `cwd`. */
function otherPendingWatchesInCwd(
  agent: LaunchableAgentId,
  claimant: string,
  cwd: string
): number {
  const byClaimant = pendingWatches.get(agent);
  if (byClaimant === undefined) return 0;
  let n = 0;
  for (const [other, folder] of byClaimant) {
    if (other !== claimant && folder === cwd) n += 1;
  }
  return n;
}

/** Test hook. In the app every watch removes itself when it settles. */
export function resetPendingWatches(): void {
  pendingWatches.clear();
}

/** List candidate entries under `dir`, honouring the descriptor's filters. */
async function scan(
  dir: string,
  depth: number,
  d: HarvestDescriptor,
  out: string[]
): Promise<void> {
  if (depth > d.maxDepth) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // not created yet, or vanished — both fine
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (d.entry === 'dir' && depth === 0 && d.identify(full) !== null) {
        out.push(full);
      }
      if (d.recurse?.(e.name, depth, full) === true) {
        await scan(full, depth + 1, d, out);
      }
    } else if (d.entry === 'file' && d.identify(full) !== null) {
      out.push(full);
    }
  }
}

/**
 * Watch an agent's session store for the record created by the spawn at
 * `ctx.sinceTs` and extract its conversation id.
 *
 * Strategy (unchanged from the shipped codex harvester, now shared):
 *  - @parcel/watcher (FSEvents) subscriptions on the descriptor's roots,
 *  - plus a readdir poll, because a native watcher can fail to initialize or
 *    drop events and the id is the whole point,
 *  - disambiguation by the descriptor's key: a confirmed candidate wins
 *    immediately, an unconfirmable one is accepted after `graceMs` only if no
 *    confirmed rival has appeared.
 *
 * @throws (rejects) on timeout, with a message that says the SESSION is fine
 *         and the ID was not recorded — never silently resolves.
 */
export function watchForSessionId(
  agent: LaunchableAgentId,
  ctx: HarvestContext,
  options: HarvestOptions = {}
): SessionIdWatch {
  const d = DESCRIPTORS[agent];
  if (d === undefined) {
    // Asking an agent with no store descriptor to harvest is a programming
    // error, not a runtime condition — say which mode it actually uses.
    // (pi HAS a descriptor, but a rescueOnly one: its store stays empty until
    // the first turn, so a codex-style watch at create time would find nothing
    // for exactly the panes nobody has talked to yet. It is reached only by
    // the boot rescue, for rows that never got a pre-assigned id at all.)
    const refused: Promise<HarvestedSessionId> = Promise.reject(
      new Error(
        `Agent '${agent}' does not harvest its session id ` +
          `(idCapture: ${getRegistryEntry(agent).resume.idCapture.mode}).`
      )
    );
    refused.catch(() => undefined); // never an unhandled rejection
    return { promise: refused, cancel: () => undefined };
  }

  const de: DescriptorEnv = {
    home: options.home ?? homedir(),
    env: options.env ?? process.env
  };
  const roots = d.roots(ctx, de);
  const timeoutMs = options.timeoutMs ?? d.timeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? d.pollIntervalMs;
  const maxPollIntervalMs = Math.max(
    pollIntervalMs,
    options.maxPollIntervalMs ?? 10_000
  );
  const graceMs = options.graceMs ?? d.graceMs;
  // Slack for clock/fs-timestamp skew between our sinceTs and file times.
  const minTs = ctx.sinceTs - 2_000;

  const claimant = options.claimant ?? nextAnonymousClaimant();

  /**
   * The launch folder as the ownership rules compare it (Phase 34 fix round).
   * `HarvestContext.cwd` is documented as already resolved and the app does
   * resolve it, but every folder that reaches the claim map is resolved here
   * as well, because a caller that forgets produces a wrong OWNER rather than
   * a failed lookup. `resolveClaimCwd` has the measured case.
   */
  const claimCwd = resolveClaimCwd(ctx.cwd);

  /**
   * The strongest claim this watch can ever take, which is what its own key
   * would claim on a 'match'. Both the candidate filter and the takeover
   * question are asked against it, so a watch never waits on a claim it
   * could win and never tries for one it could not.
   */
  const matchStrength = claimStrengthForKey(d.key, false);
  const myMatchRank = claimRank(matchStrength);

  const candidates = new Map<string, Candidate>();
  const subscriptions: parcelWatcher.AsyncSubscription[] = [];
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let pollDelay = pollIntervalMs;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  /** True while a listing of the roots is in flight. */
  let scanning = false;
  /** A listing was asked for while one was running. */
  let rescanQueued = false;
  /** When the most recent COMPLETED listing began. 0 before the first one. */
  let scannedAt = 0;
  /** When the fast channel last brought in a candidate no listing has seen. */
  let unscannedCandidateAt = 0;

  let resolveP!: (v: HarvestedSessionId) => void;
  let rejectP!: (e: Error) => void;
  const promise = new Promise<HarvestedSessionId>((resolve, reject) => {
    resolveP = resolve;
    rejectP = reject;
  });
  // A rejection that nobody has attached to yet must not crash main.
  promise.catch(() => undefined);

  // Registered before any decision can run, removed by cleanup(), which
  // every way out (settle, cancel, timeout) funnels through. It is what
  // `contestedByWatches` and `sameCwdWatches` count at another watch's
  // acceptance.
  addPendingWatch(agent, claimant, claimCwd);

  const cleanup = (): void => {
    removePendingWatch(agent, claimant);
    if (pollTimer !== undefined) clearTimeout(pollTimer);
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    for (const sub of subscriptions) {
      // Phase 36: tracked so the before-quit drain can wait for this close.
      // A fire-and-forget unsubscribe whose completion lands during
      // FreeEnvironment is a SIGABRT, not a quit.
      void trackWatcherClose(sub.unsubscribe().catch(() => undefined));
    }
    subscriptions.length = 0;
  };

  const settle = (info: HarvestedSessionId | null, err?: Error): void => {
    if (settled) return;
    settled = true;
    cleanup();
    if (info) resolveP(info);
    else rejectP(err ?? new Error(`${agent} session-id harvest failed`));
  };

  /**
   * The descriptor root `path` was found under, or the first root when the
   * path cannot be attributed to one (an archive move out of the tree).
   */
  const rootOf = (path: string): string =>
    roots.find((root) => path === root || path.startsWith(`${root}/`)) ??
    roots[0] ??
    '';

  /**
   * Settle on a candidate, WITH the evidence that chose it.
   *
   * `rivals` is passed in by the caller rather than read off `candidates`
   * here, because the number that matters is how many were still in play
   * after the mismatches were dropped, which is what `decide()` computed.
   */
  const accept = (c: Candidate, viaGraceTimer: boolean, rivals: number): void => {
    // The claim goes in BEFORE the settle, so a second watch that decides
    // inside the same tick already sees it. Both are synchronous, so there is
    // no window between them.
    //
    // PHASE 34: the strength comes from the KEY, not from the timer. A folder
    // key claims 'matched', which an identity proof can still take back.
    const strength = claimStrengthForKey(d.key, viaGraceTimer);
    const mine = { strength, cwd: claimCwd };
    const existing = claimedConversations.get(c.sessionId);
    let reclaimedFrom: string | undefined;
    if (
      existing !== undefined &&
      existing.claimant !== claimant &&
      mayTakeOver(mine, existing)
    ) {
      // A STRONGER CLAIM TAKES A WEAKER ONE (Phase 32, widened in Phase 34).
      // Another session holds this id on weaker evidence than this watch has.
      // The claim moves, the reclaim event fires synchronously so a same-tick
      // decide in any other watch already sees the new owner, and the loser's
      // manifest row is corrected by the handler in sessions/core.ts before
      // this watch's own settle resolves.
      reclaimedFrom = existing.claimant;
      claimedConversations.set(c.sessionId, { claimant, ...mine });
      emitReclaim({
        agent,
        conversationId: c.sessionId,
        from: existing.claimant,
        to: claimant,
        at: Date.now()
      });
    } else if (!claimConversationId(c.sessionId, claimant, strength, claimCwd)) {
      // `decide()` filters out anything another session holds at a rank this
      // watch cannot beat, and the branch above handles a holder it can, so
      // this cannot happen. It is said out loud rather than swallowed because
      // if it ever does, the sentence is the whole bug report.
      manifestLog.warn(
        `${agent} took conversation ${c.sessionId} for ${claimant}, ` +
          `which ${String(conversationClaimant(c.sessionId))} already has.`
      );
    } else if (
      existing?.claimant === claimant &&
      claimRank(strength) > claimRank(existing.strength)
    ) {
      // The same session proved an id it had held on weaker evidence (a
      // re-armed watch confirming its own grace claim). Upgrade in place.
      claimedConversations.set(c.sessionId, { claimant, ...mine });
    }
    // How many OTHER same-agent watches were still waiting when a grace
    // timer took this guess. Persisted so the doubt survives a restart.
    const contested = viaGraceTimer
      ? otherPendingWatchCount(agent, claimant)
      : undefined;
    // How many of them were looking in THIS folder, grace or match alike.
    // Above 0 the answer was separated by time even when the directory held
    // exactly one record, because a neighbour would have confirmed it too.
    const sameCwd = otherPendingWatchesInCwd(agent, claimant, claimCwd);
    settle({
      agent,
      sessionId: c.sessionId,
      storePath: c.path,
      storeRoot: rootOf(c.path),
      key: d.key,
      confidence: d.confidence,
      viaGraceTimer,
      rivals,
      acceptedAt: Date.now(),
      ...(reclaimedFrom !== undefined ? { reclaimedFrom } : {}),
      ...(contested !== undefined ? { contestedByWatches: contested } : {}),
      ...(sameCwd > 0 ? { sameCwdWatches: sameCwd } : {})
    });
  };

  /**
   * A watcher event for a dir-keyed store arrives as a path INSIDE the
   * session directory (`brain/<id>/.system_generated/…`); walk it back up to
   * the directory that carries the id.
   */
  const normalize = (path: string): string => {
    if (d.entry !== 'dir') return path;
    for (const root of roots) {
      const prefix = `${root}/`;
      if (!path.startsWith(prefix)) continue;
      const seg = path.slice(prefix.length).split('/')[0];
      if (seg !== undefined && seg.length > 0) return join(root, seg);
    }
    return path;
  };

  /**
   * Register or refresh one path as a candidate. It does NOT decide.
   *
   * PHASE 21 TOOK THE DECISION OUT OF HERE, and it was a correctness fix
   * rather than a tidy-up. `decide()` sorts the candidates and documents that
   * the earliest record at or after the spawn wins, but deciding after every
   * single candidate meant the FIRST one readdir happened to return settled
   * the watch, and the sort never ran. On a directory with two records of the
   * same agent the winner was therefore chosen by APFS enumeration order, and
   * the count of rivals a session's provenance now carries would have been 1
   * every time. Both callers register their whole batch and then decide once.
   *
   * `source` says which channel found it, and the fix round made that
   * load bearing. See `unscannedCandidateAt`.
   */
  const consider = async (raw: string, source: CandidateSource): Promise<void> => {
    if (settled) return;
    const path = normalize(raw);
    const parsed = d.identify(path);
    if (parsed === null) return;

    // Freshness: a filename timestamp OR the file's own times must be at or
    // after the spawn. Either passing is enough — stat can fail after an
    // archive move, and a filename time can lag the write. Unless the
    // descriptor says the NAME is the session's start time (pi), in which
    // case an older name is a verdict: mtime would only re-admit a file that
    // was touched by a later resume.
    let fresh = parsed.nameTs !== undefined && parsed.nameTs >= minTs;
    const nameDecides =
      d.nameTsIsAuthoritative === true && parsed.nameTs !== undefined;
    let orderTs = parsed.nameTs ?? Date.now();
    if (!fresh && nameDecides) return;
    if (!fresh) {
      try {
        const st = await stat(path);
        fresh = st.mtimeMs >= minTs || st.birthtimeMs >= minTs;
        if (parsed.nameTs === undefined) {
          orderTs = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
        }
      } catch {
        /* moved away — the name check already spoke */
      }
    }
    if (!fresh) return;

    const existing = candidates.get(parsed.sessionId);
    const cand: Candidate = existing ?? {
      path,
      sessionId: parsed.sessionId,
      orderTs,
      firstSeen: Date.now(),
      verdict: 'unknown'
    };
    cand.path = path; // follow archive moves
    if (cand.verdict === 'unknown') {
      cand.verdict = await d.confirm(path, ctx);
    }
    candidates.set(parsed.sessionId, cand);
    // A candidate the FAST channel brought in is a candidate no directory
    // listing has confirmed the neighbours of. Record the moment, so
    // `decide()` can insist on a scan before it counts.
    if (existing === undefined && source === 'events') {
      unscannedCandidateAt = Date.now();
    }
  };

  /**
   * Pick a winner if one is ready.
   *
   * THE FIX ROUND CHANGED WHEN THIS MAY ACCEPT, NOT WHAT IT PICKS. Verifier B
   * measured the old rule failing: one FSEvents callback carrying one of two
   * records that were both already on disk settled the watch with
   * `rivals: 1`, and `deriveResumeConfidence` then called a directory keyed
   * answer 'exact' for a session that had a rival in the same folder. It was
   * rare (3 of 150 under load, and 2 of 5 full test suite runs) and it broke
   * the invariant the phase is built on, which is that ambiguity never
   * produces an exact claim.
   *
   * So nothing is accepted until a readdir of the roots has FINISHED, and
   * until one has run since the last record the fast channel brought in. An
   * event batch is a fact about one write. A listing that is still going is a
   * prefix of the answer, and that second case is the one that survived the
   * first attempt at this fix: an event arriving part way through the first
   * listing saw the one record it had registered so far and settled on it.
   *
   * A directory listing is a fact about the directory, and the number being
   * recorded is a claim about the directory.
   */
  const decide = (): void => {
    if (settled) return;
    // A record another session in this process holds at a rank THIS watch
    // could never beat is not in play for it. Dropping it here rather than
    // after the sort is what lets the loser of a two pane race keep waiting
    // for its OWN record.
    //
    // The rank this watch could reach is the strength its own key would
    // claim on a match: 3 for an identity key, 2 for a folder key. So a
    // folder-keyed watch drops anything held at 'matched' or better, and an
    // identity-keyed watch drops only what is held 'confirmed'. A candidate
    // it could still win stays in the list and therefore counts as a rival,
    // which is the honest direction for that number.
    const list = [...candidates.values()].filter((c) => {
      if (c.verdict === 'mismatch') return false;
      const held = claimHeldByAnother(c.sessionId, claimant);
      return held === undefined || claimRank(held.strength) < myMatchRank;
    });
    if (list.length === 0) return;
    // A listing is PART WAY THROUGH registering what it found. Whatever is in
    // the map right now is a prefix of the answer, not the answer. It ends in
    // its own `decide()`, so waiting costs nothing and deciding here is how
    // the count came out as 1 with two records on disk.
    if (scanning) return;
    // The rivals count has to come from a listing of the directory: one that
    // has finished, and one that started after the last thing the fast channel
    // brought in. Ask for one and come back, because every listing ends in
    // another `decide()`.
    if (scannedAt === 0 || unscannedCandidateAt > scannedAt) {
      void runScan();
      return;
    }
    // Earliest record at/after spawn is most likely ours.
    list.sort((a, b) => a.orderTs - b.orderTs);
    // Candidates the watcher has NOT ruled out. When this is above 1 the
    // answer below was separated by time, and for a directory keyed store
    // that is a guess rather than a correlation. The number is carried into
    // the manifest so the guess is still visible after a reboot.
    const rivals = list.length;
    // Everything not ruled out counts, including a candidate that has not been
    // classified yet. For a cwd keyed store an unclassified record created
    // after our spawn could equally be ours, and understating that is the one
    // direction this number may not fail in. An identity key is unaffected:
    // deriveResumeConfidence exempts 'tmux-pane' and 'pid', where a second
    // candidate cannot make a proven match untrue.
    //
    // The PICK does not change. The earliest record at or after the spawn is
    // still the best available answer. What changes is the claim recorded
    // about it.
    //
    // A match that another session already holds is taken only when this
    // watch's evidence outranks the holder's, which for a folder key also
    // means the holder was in a different folder (./claim-strength.ts).
    const confirmed = list.find((c) => {
      if (c.verdict !== 'match') return false;
      const held = claimHeldByAnother(c.sessionId, claimant);
      return (
        held === undefined ||
        mayTakeOver({ strength: matchStrength, cwd: claimCwd }, held)
      );
    });
    if (confirmed) {
      accept(confirmed, false, rivals);
      return;
    }
    // No confirmation possible yet: wait out the grace period in case a
    // confirmable rival shows up or the record gains its key.
    //
    // GRACE NEVER STEALS (Phase 32). The pick is the earliest candidate no
    // other session holds AT ALL: two timer guesses about one id must not
    // trade it back and forth, so a held claim falls only to the branch
    // above. When every surviving candidate is held by others, this watch
    // keeps waiting, which is the honest outcome. Its own record appears on
    // its own first turn.
    const first = list.find(
      (c) => claimHeldByAnother(c.sessionId, claimant) === undefined
    );
    if (first && Date.now() - first.firstSeen >= graceMs) accept(first, true, rivals);
  };

  /**
   * One listing of every root, then one decision.
   *
   * Only one runs at a time. A second request while one is in flight is
   * remembered and run afterwards, because the listing that is already going
   * may have read the directory before the record that prompted the request
   * was written.
   */
  const runScan = async (): Promise<void> => {
    if (settled) return;
    if (scanning) {
      rescanQueued = true;
      return;
    }
    scanning = true;
    // Taken BEFORE the readdir. Anything written after this instant may not
    // be in the listing, so this is the moment the scan can honestly speak
    // for, and `decide()` compares against it.
    const startedAt = Date.now();
    try {
      const found: string[] = [];
      for (const root of roots) await scan(root, 0, d, found);
      for (const p of found) await consider(p, 'poll');
      scannedAt = Math.max(scannedAt, startedAt);
    } catch {
      // A listing that could not finish has proved nothing about the
      // directory, so `scannedAt` is deliberately left where it was and the
      // next one is still required. Swallowed rather than rethrown: the two
      // callers below both start this with `void`, and an unhandled rejection
      // in main is a worse outcome than one missed listing.
    } finally {
      scanning = false;
    }
    decide(); // re-evaluate grace timers even with no new entries
    if (rescanQueued && !settled) {
      rescanQueued = false;
      void runScan();
    }
  };

  const onEvents: parcelWatcher.SubscribeCallback = (err, events) => {
    if (settled) return;
    if (err) return; // the poll is the guaranteed path
    // The whole batch is registered before anything is chosen, exactly as the
    // scan does it. One FSEvents callback can carry two records written in the
    // same instant, and choosing on the first of them would be the enumeration
    // order bug wearing different clothes.
    void (async () => {
      for (const evt of events) {
        if (evt.type === 'delete') continue;
        await consider(evt.path, 'events');
      }
      decide();
    })();
  };

  const subscribeTo = async (dir: string): Promise<void> => {
    try {
      if (!existsSync(dir)) return; // the poll picks it up once it exists
      const sub = await parcelWatcher.subscribe(dir, onEvents);
      if (settled) {
        // Phase 36: the watch settled while this subscribe was in flight.
        // The close still has to be awaitable at quit, so track it.
        void trackWatcherClose(sub.unsubscribe().catch(() => undefined));
        return;
      }
      subscriptions.push(sub);
    } catch {
      // FSEvents unavailable or a dir race — polling covers us.
    }
  };
  for (const root of roots) void subscribeTo(root);

  /**
   * Self-rescheduling poll that BACKS OFF. The native watcher is the fast
   * channel; this is the guarantee, and the window is now hours long (a
   * trust prompt or an untouched pane), so a fixed 1 Hz readdir would be
   * paying full price for the whole tail.
   */
  const schedulePoll = (): void => {
    if (settled) return;
    pollTimer = setTimeout(() => {
      void runScan().finally(() => {
        pollDelay = Math.min(Math.round(pollDelay * 1.5), maxPollIntervalMs);
        schedulePoll();
      });
    }, pollDelay);
  };
  void runScan();
  schedulePoll();

  timeoutTimer = setTimeout(() => {
    settle(
      null,
      new Error(
        `Timed out after ${timeoutMs} ms waiting for a ${agent} session record in ` +
          `${roots.join(', ')} (cwd ${ctx.cwd}). The session runs fine, but Tortie ` +
          'could not record its resume id.'
      )
    );
  }, timeoutMs);

  return {
    promise,
    cancel: () => settle(null, new Error(`${agent} session-id harvest cancelled`))
  };
}
