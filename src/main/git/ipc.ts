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
 *  - Phase 347: a window declares the open files its walk reads
 *    (git:watchOpenFiles); the ones the repository's own running watcher
 *    excludes are watched one file each (../watcher/open-files.ts), and a
 *    change is told to that window alone as EVT_GIT_OPEN_FILE_CHANGED.
 */

import { webContents } from 'electron';
import type { IpcMain, WebContents } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { EVT_GIT_CHANGED, EVT_GIT_OPEN_FILE_CHANGED } from '@shared/ipc';
import { gmuxError } from '../errors';
import { canonicalPathSync } from '../fs/folder-identity';
import {
  afterKernelSees,
  armFileByDescriptor,
  createOpenFileWatches,
  emitRepoChanged,
  fileIdentity,
  onRepoChanged,
  RepoWatcher
} from '../watcher';
import { registerGitDepthIpc } from './depth-ipc';
import { runGitOrThrow } from './exec';
import { GitService } from './service';
import { handle } from '../typed-ipc';
import { broadcastEvent, sendEvent } from '../typed-events';
import { getLog } from '../log';

/**
 * Scope "git" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const gitLog = getLog('git');

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
    gitLog.warn(
      `could not watch ${key}: ${(err as Error).message}`
    );
    return null;
  });
  watchers.set(key, promise);
}

/**
 * `normalizeRepoPath`'s answer, or null where it would throw. Phase 347's
 * declaration is an enhancement, so a folder that is not there is no error.
 */
function repoKeyOrNull(repoPath: string): string | null {
  try {
    return normalizeRepoPath(repoPath);
  } catch {
    return null;
  }
}

/**
 * PHASE 347 (issue 33). The open files the bus cannot see, one watch each.
 *
 * `planFor` hands every entry the repository's own RUNNING watcher, started by
 * the same `ensureWatcher` every git read uses, so `excludes` is asked of the
 * exclusion plan the subscription really has (D11). `canonical` is Phase 274's
 * one canonicalising realpath, a throw answering null. The notice goes to the
 * one window that declared it, never a destroyed one (D16).
 */
const openFileWatches = createOpenFileWatches({
  planFor: async (repoPath) => {
    const key = repoKeyOrNull(repoPath);
    if (key === null) return null;
    ensureWatcher(key);
    const pending = watchers.get(key);
    if (pending === undefined) return null;
    return pending.catch(() => null);
  },
  canonical: (path) => {
    try {
      return canonicalPathSync(path);
    } catch {
      return null;
    }
  },
  armFile: armFileByDescriptor,
  identity: fileIdentity,
  afterKernelSees,
  setTimeout: (fn, ms) => {
    const timer = setTimeout(fn, ms);
    return { clear: () => clearTimeout(timer) };
  },
  send: (senderId, repoPath) => {
    const target = webContents.fromId(senderId);
    if (target === undefined || target.isDestroyed()) return;
    sendEvent(target, EVT_GIT_OPEN_FILE_CHANGED, repoPath);
  },
  env: () => process.env,
  log: (level, message) => {
    if (level === 'warn') gitLog.warn(message);
    else gitLog.info(message);
  }
});

/** Senders whose end is already hooked, so each is hooked exactly once (the search/ipc.ts shape). */
const openFileSenders = new WeakSet<WebContents>();

/** D19: a window destroyed, or its renderer gone, takes every watch it declared with it. */
function hookOpenFileSender(sender: WebContents): void {
  if (openFileSenders.has(sender)) return;
  openFileSenders.add(sender);
  const id = sender.id;
  sender.once('destroyed', () => openFileWatches.dropSender(id));
  sender.on('render-process-gone', () => openFileWatches.dropSender(id));
}

/** One repository's drop and re-read counts, for the diagnostics report. */
export interface WatcherObservationRow {
  repoPath: string;
  drops: number;
  rescansScheduled: number;
  rescansCompleted: number;
}

/**
 * Phase 163. Every live watcher's observation, read on demand. A repository
 * whose watcher could not start has no row, because it has nothing to count.
 */
export async function watcherObservations(): Promise<WatcherObservationRow[]> {
  const out: WatcherObservationRow[] = [];
  for (const pending of watchers.values()) {
    const rw = await pending.catch(() => null);
    if (rw === null) continue;
    out.push({ repoPath: rw.repoPath, ...rw.observation });
  }
  return out;
}

/** How many repositories have a live watcher, or one starting. */
export function watchedRepoCount(): number {
  return watchers.size;
}

/** Stop watching a repo (call when its project tab is removed). */
export async function unwatchGitRepo(repoPath: string): Promise<void> {
  const key = resolvePath(repoPath);
  // Phase 347: the open files watched for this repository close with it.
  openFileWatches.dropRepo(key);
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
  // Phase 347: every open file watch closed and every window timer cleared,
  // before the watchers are awaited, so nothing arms against a stopping one.
  openFileWatches.dispose();
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

  // Phase 347 (issue 33): the window's whole set of open files its walk
  // reads. Main watches the ones the running watcher excludes and answers how
  // many. A non-array rejects INVALID_INPUT inside `declare`.
  handle(ipc, 'git:watchOpenFiles', (event, entries) => {
    hookOpenFileSender(event.sender);
    return openFileWatches.declare(event.sender.id, entries);
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
