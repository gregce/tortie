/**
 * git:* IPC — self-contained registration the integrator calls once from
 * main-process boot:
 *
 *     import { registerGitIpc } from './git';
 *     registerGitIpc(ipcMain);
 *
 * and (optionally, on quit):
 *
 *     import { disposeGitIpc } from './git';
 *     await disposeGitIpc();
 *
 * Design:
 *  - One GitService per resolved repo path, created on demand.
 *  - One RepoWatcher per repo, started lazily on the first git:* call for
 *    that repo; every debounced worktree/dotgit change broadcasts
 *    EVT_GIT_CHANGED(repoPath) to all windows (the renderer re-pulls
 *    git:status — the frozen contract's flow).
 *  - Mutations (stage/unstage/commit/discard) ALSO broadcast immediately so
 *    the sidebar snaps without waiting out the debounce.
 *  - Non-repo folders are a friendly state: git:status resolves with
 *    isRepo:false; mutations throw NOT_A_GIT_REPO (structured GmuxError).
 */

import type { IpcMain } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { EVT_GIT_CHANGED } from '@shared/ipc';
import { gmuxError } from '../errors';
import { emitRepoChanged, onRepoChanged, RepoWatcher } from '../watcher';
import { registerGitDepthIpc } from './depth-ipc';
import { runGitOrThrow } from './exec';
import { GitService } from './service';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';

// ---------------------------------------------------------------------------
// Per-repo registries
// ---------------------------------------------------------------------------

const services = new Map<string, GitService>();
/** Promise-valued so concurrent calls never double-subscribe. */
const watchers = new Map<string, Promise<RepoWatcher | null>>();

/**
 * The GitService for a repo path (also usable by other main-process modules,
 * e.g. an editor diff provider wanting binary-safe showHeadBuffer()).
 */
export function getGitService(repoPath: string): GitService {
  const key = normalizeRepoPath(repoPath);
  let svc = services.get(key);
  if (svc === undefined) {
    svc = new GitService(key);
    services.set(key, svc);
  }
  return svc;
}

function normalizeRepoPath(repoPath: string): string {
  if (typeof repoPath !== 'string' || repoPath.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'A repository path is required.');
  }
  const abs = resolvePath(repoPath);
  if (!isDirectory(abs)) {
    throw gmuxError(
      'INVALID_INPUT',
      'That project folder does not exist.',
      abs
    );
  }
  return abs;
}

function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function broadcastGitChanged(repoPath: string): void {
  broadcastEvent(EVT_GIT_CHANGED, repoPath);
}

// Phase 14 (research 19 §2.5, O3): the watcher callback below now feeds the
// repo-changed BUS instead of calling broadcastGitChanged directly, and git
// re-enters through the front door as one subscriber among several. Purely a
// re-plumbing — every watcher event still produces exactly one
// EVT_GIT_CHANGED, in the same order, on the same debounce — but it is what
// lets quick open's path index stay fresh WITHOUT a second FSEvents
// subscription on a 95k-file tree.
onRepoChanged(broadcastGitChanged);

/**
 * Lazily start the two-part VS Code-recipe watcher for a repo. Failures are
 * logged, cached as null (so we don't retry-spam), and never surface to the
 * caller — watching is an enhancement, not a dependency of the request.
 */
function ensureWatcher(repoPath: string): void {
  const key = repoPath; // already normalized by callers
  if (watchers.has(key)) return;
  const promise = RepoWatcher.watch(key, {
    onChange: emitRepoChanged
  }).catch((err: unknown) => {
    console.warn(
      `[gmux] could not watch ${key}: ${(err as Error).message}`
    );
    return null;
  });
  watchers.set(key, promise);
}

/** Stop watching a repo (call when its project tab is removed). */
export async function unwatchGitRepo(repoPath: string): Promise<void> {
  const key = resolvePath(repoPath);
  const pending = watchers.get(key);
  watchers.delete(key);
  services.delete(key);
  if (pending !== undefined) {
    const rw = await pending;
    if (rw !== null) await rw.dispose();
  }
}

/** Quit-time teardown: stop every watcher, drop every service. */
export async function disposeGitIpc(): Promise<void> {
  const pending = [...watchers.values()];
  watchers.clear();
  services.clear();
  for (const p of pending) {
    const rw = await p.catch(() => null);
    if (rw !== null) await rw.dispose().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------


/**
 * Register every git:* invoke handler. Self-contained: safe to call exactly
 * once during main-process boot, before or after window creation.
 */
export function registerGitIpc(ipc: IpcMain): void {
  handle(ipc, 'git:status', (_e, repoPath) => {
    const svc = getGitService(repoPath);
    ensureWatcher(svc.repoPath);
    return svc.status();
  });

  handle(ipc, 'git:stage', async (_e, input) => {
    const svc = getGitService(input.repoPath);
    ensureWatcher(svc.repoPath);
    await svc.stage(input.paths);
    broadcastGitChanged(svc.repoPath);
  });

  handle(ipc, 'git:unstage', async (_e, input) => {
    const svc = getGitService(input.repoPath);
    ensureWatcher(svc.repoPath);
    await svc.unstage(input.paths);
    broadcastGitChanged(svc.repoPath);
  });

  handle(ipc, 'git:discard', async (_e, input) => {
    const svc = getGitService(input.repoPath);
    ensureWatcher(svc.repoPath);
    await svc.discard(input.paths);
    broadcastGitChanged(svc.repoPath);
  });

  handle(ipc, 'git:commit', async (_e, input) => {
    const svc = getGitService(input.repoPath);
    ensureWatcher(svc.repoPath);
    const hash = await svc.commit(input.message, input.amend ?? false);
    broadcastGitChanged(svc.repoPath);
    return hash;
  });

  handle(ipc, 'git:log', (_e, input) => {
    const svc = getGitService(input.repoPath);
    ensureWatcher(svc.repoPath);
    return svc.log(input.maxCount ?? 200);
  });

  handle(ipc, 'git:showHead', async (_e, input) => {
    const svc = getGitService(input.repoPath);
    // Frozen contract: string result, '' for files new since HEAD. The
    // richer null-distinguishing API is GitService.showHead()/showHeadBuffer()
    // for in-main consumers.
    return (await svc.showHead(input.path)) ?? '';
  });

  // Phase 47: which of the paths the file tree has loaded are ignored. A pure
  // read, so it does NOT start a watcher — the tree's own git:status call has
  // already done that for this repo, and a decoration must not be the thing
  // that subscribes a folder.
  handle(ipc, 'git:checkIgnore', (_e, input) => {
    const svc = getGitService(input.repoPath);
    return svc.checkIgnore(input.paths);
  });

  // Appended optional channel (ScmInvokeChannelMap): the §6.3
  // [Initialize repository] button on non-repo project folders.
  handle(ipc, 'git:init', async (_e, repoPath) => {
    const abs = normalizeRepoPath(repoPath);
    await runGitOrThrow(abs, ['init'], 'Could not initialize the repository.');
    // GitService re-resolves --absolute-git-dir on demand (a "not a repo"
    // answer is never cached), so the existing service just starts working.
    ensureWatcher(abs); // idempotent; late `git init` is picked up either way
    broadcastGitChanged(abs);
  });

  // git-depth channels (dogfood round 1): branches / checkout / createBranch
  // / createTag / cherryPick / commitDetail / remoteUrl / checkoutDetached.
  // Shares this module's per-repo service + watcher registries.
  registerGitDepthIpc(ipc, {
    getService: getGitService,
    ensureWatcher,
    broadcast: broadcastGitChanged
  });
}
