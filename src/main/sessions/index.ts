/**
 * Session orchestration — create / rename / kill / attach / detach / resize /
 * restore, the reconcile loop, the status watcher, the capture-sync queue,
 * scroll, and the projects API.
 *
 * Phase 16 (L1) gave this domain the folder it never had: 1,453 of these lines
 * used to live inside a file called `ipc.ts`, and seven modules imported that
 * file to reach a service object. The class itself was moved verbatim.
 *
 * Phase 141 added one more leaf, being `./resume-in-place.ts`: the verb for a
 * session whose agent left its shell running, and the one function that may
 * bind a conversation to a row on that path. Its types are exported here
 * because the restore registrar and the renderer's payload both name them.
 *
 * Phase 125 moved four workflows out of `./core.ts` into leaves beside it,
 * being the local create, the conversation id feed, the mutation ledger and
 * the quit generation. This barrel exports the same four names it always did,
 * and `GmuxCore` keeps every public method it had, so nothing outside this
 * directory changed.
 */

export {
  coreLifecycleState,
  getGmuxCore,
  shutdownGmuxCore,
  GmuxCore
} from './core';
export type { CoreLifecycleState } from './core';

export {
  claimAgentConversationId,
  ResumeInPlaceService,
  type ConversationClaimOutcome,
  type HandbackObservation,
  type HandbackState,
  type ResumeInPlaceRefusal,
  type ResumeInPlaceResult,
  type SessionHandbackUpdate
} from './resume-in-place';
