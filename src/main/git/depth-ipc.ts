/**
 * git-depth IPC (dogfood round 1) — the eight channels behind the VS Code-bar
 * git history: branch switching, per-commit context menu actions, and the
 * rich commit hover card.
 *
 * Registered by `registerGitDepthIpc`, which registerGitIpc (src/main/git/
 * ipc.ts — the existing registration point) calls with its own per-repo
 * service registry injected, so both layers share one GitService + one
 * RepoWatcher per repo and there is no import cycle.
 *
 * Mutations (checkout / createBranch / createTag / cherryPick /
 * checkoutDetached) broadcast EVT_GIT_CHANGED immediately so the sidebar
 * snaps without waiting out the watcher debounce — same discipline as
 * stage/commit in ipc.ts.
 */

import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type {
  DepthInvokeReq,
  DepthInvokeRes,
  GitDepthInvokeChannelMap
} from '@shared/ipc';
import type { GitService } from './service';

/** What the host registration (ipc.ts) lends us. */
export interface GitDepthDeps {
  /** Per-repo GitService registry (normalizes + validates the path). */
  getService(repoPath: string): GitService;
  /** Lazily start the repo watcher (idempotent). */
  ensureWatcher(repoPath: string): void;
  /** Broadcast EVT_GIT_CHANGED to all windows. */
  broadcast(repoPath: string): void;
}

type DepthChannel = keyof GitDepthInvokeChannelMap;

/** Typed ipcMain.handle wrapper over the git-depth channels. */
function handle<C extends DepthChannel>(
  ipc: IpcMain,
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: DepthInvokeReq<C>
  ) => Promise<DepthInvokeRes<C>> | DepthInvokeRes<C>
): void {
  ipc.handle(channel, (event, ...args) =>
    fn(event, ...(args as DepthInvokeReq<C>))
  );
}

/**
 * Register the git-depth invoke handlers. Called exactly once, from
 * registerGitIpc.
 */
export function registerGitDepthIpc(ipc: IpcMain, deps: GitDepthDeps): void {
  const svcFor = (repoPath: string): GitService => {
    const svc = deps.getService(repoPath);
    deps.ensureWatcher(svc.repoPath);
    return svc;
  };

  handle(ipc, 'git:branches', (_e, repoPath) => svcFor(repoPath).branches());

  handle(ipc, 'git:checkout', async (_e, input) => {
    const svc = svcFor(input.repoPath);
    await svc.checkout(input.branch);
    deps.broadcast(svc.repoPath);
  });

  handle(ipc, 'git:createBranch', async (_e, input) => {
    const svc = svcFor(input.repoPath);
    await svc.createBranch(input.name, input.fromRef);
    deps.broadcast(svc.repoPath);
  });

  handle(ipc, 'git:createTag', async (_e, input) => {
    const svc = svcFor(input.repoPath);
    await svc.createTag(input.name, input.ref);
    deps.broadcast(svc.repoPath);
  });

  handle(ipc, 'git:cherryPick', async (_e, input) => {
    const svc = svcFor(input.repoPath);
    const result = await svc.cherryPick(input.sha);
    // Applied moves HEAD; a conflicted attempt was aborted (index/worktree
    // touched and restored) — refresh either way.
    deps.broadcast(svc.repoPath);
    return result;
  });

  handle(ipc, 'git:commitDetail', (_e, input) =>
    svcFor(input.repoPath).commitDetail(input.sha)
  );

  handle(ipc, 'git:remoteUrl', (_e, repoPath) => svcFor(repoPath).remoteUrl());

  handle(ipc, 'git:checkoutDetached', async (_e, input) => {
    const svc = svcFor(input.repoPath);
    await svc.checkoutDetached(input.sha);
    deps.broadcast(svc.repoPath);
  });
}
