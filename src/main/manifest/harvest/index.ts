/**
 * Session-id harvesting — the capture route for every agent that only reveals
 * its conversation id AFTER the process has written it (Phase 13.5,
 * docs/research/22-resume-audit.md §3.2/§3.3).
 *
 * Two halves, one seam: ./stores.ts is what each agent's store looks like and
 * how a record is proven to belong to this pane; ./watch.ts is the single
 * watch/settle algorithm that consumes those descriptors. Adding an agent is
 * a descriptor, never a second harvester.
 */

export {
  agentHarvestsId,
  agentRescuesId,
  agentRescuesIdAfterExit,
  sanitizeOmpCwd,
  sanitizePiCwd,
  sanitizeQwenCwd,
  type HarvestContext,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './stores';

export { isDescendantOf, resetProcessParentCache } from './process-table';

export {
  claimConversationId,
  conversationClaimant,
  conversationClaimStrength,
  forgetConversationClaims,
  onConversationReclaimed,
  releaseConversationClaims,
  resetPendingWatches,
  resolveClaimCwd,
  watchForSessionId,
  type ConversationReclaim
} from './watch';

/**
 * The claim ladder (Phase 34). It is its own module because the claim map and
 * `deriveResumeConfidence` are two readings of one fact about a harvest key.
 */
export {
  claimRank,
  claimStrengthForKey,
  mayTakeOver,
  IDENTITY_HARVEST_KEYS,
  type ClaimStanding,
  type ClaimStrength
} from './claim-strength';

export {
  agyOwnedConversations,
  resetAgyOwnershipCache,
  type AgyOwnership
} from './agy-owner';

/**
 * PHASE 73. The same store descriptors, read over a connection to another
 * machine rather than off this Mac's own disk.
 *
 * It is a third file beside ./stores.ts and ./watch.ts rather than a branch
 * inside either, because the two halves it needs are different halves. It
 * reuses `roots` and `identify`, which are pure, and it deliberately does not
 * reuse `confirm`, which opens local files. The live half that sends the reads
 * is `../../machines/remote-harvest.ts`.
 */
export {
  confirmRemoteCandidate,
  decideRemoteHarvest,
  parseMachineFacts,
  parseRemoteListing,
  remoteHarvestKey,
  remoteHarvestRoots,
  remoteHarvestsId,
  remoteKeyConfidence,
  rootOfRemotePath,
  REMOTE_FACT_ENV_NAMES,
  REMOTE_HARVEST_AGENTS,
  type RemoteCandidate,
  type RemoteConfirmVerdict,
  type RemoteHarvestFacts,
  type RemoteHarvestPlan,
  type RemoteHarvestSession,
  type RemoteHarvestWinner
} from './remote';

/**
 * PHASE 73. The 8 day window a date sharded store is walked back over, exported
 * so the connected harvest uses the same number this file's own watcher does.
 */
export { DATE_SHARD_WINDOW_MS } from './stores';
