/**
 * Session orchestration — create / rename / kill / attach / detach / resize /
 * restore, the reconcile loop, the status watcher, the capture-sync queue,
 * scroll, and the projects API.
 *
 * Phase 16 (L1) gave this domain the folder it never had: 1,453 of these lines
 * used to live inside a file called `ipc.ts`, and seven modules imported that
 * file to reach a service object. The class itself was moved verbatim.
 */

export {
  coreLifecycleState,
  getGmuxCore,
  shutdownGmuxCore,
  GmuxCore
} from './core';
export type { CoreLifecycleState } from './core';
