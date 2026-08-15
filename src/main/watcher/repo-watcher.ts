/**
 * RepoWatcher — VS Code's exact watcher recipe (research 06 §1.2, §4.1)
 * built on @parcel/watcher (native FSEvents on macOS; the same primitive
 * VS Code core uses):
 *
 *   1. a WORKTREE watcher on the repo root with `.git` excluded, and
 *   2. a targeted DOTGIT watcher whose events are filtered down to
 *      `.git/HEAD` + `.git/refs/**` (plus the other ref/sequencer state
 *      files) — @parcel/watcher only watches directories, so "watch
 *      .git/HEAD and .git/refs" is implemented as a `.git` subscription
 *      with the noisy subtrees (objects/, logs/, …) excluded natively and
 *      a per-event relevance filter on what remains. `index.lock` and
 *      fsmonitor cookies are ignored, exactly like VS Code.
 *
 * Any accepted event from either watcher coalesces into a single
 * `onChange(repoPath)` after a 300 ms debounce window. The window does NOT
 * reset on new events (first event schedules the flush), so continuous
 * agent-driven churn still yields a refresh every ~300 ms instead of
 * starving.
 *
 * `.git` may be a FILE (`gitdir: <path>` pointer) in linked worktrees and
 * submodules — the pointer is followed. A repo that is not (yet) a git repo
 * simply gets no dotgit watcher; each debounced flush retries attaching it,
 * so `git init` is picked up without a restart.
 */

import watcher from '@parcel/watcher';
import type { AsyncSubscription, Event } from '@parcel/watcher';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { trackWatcherClose } from './teardown';
import { getLog } from '../log';

/**
 * Scope "watcher" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const watcherLog = getLog('watcher');


export interface RepoWatcherOptions {
  /** Coalescing window for change events. Default 300 ms. */
  debounceMs?: number;
  /** Called once per debounce window when anything relevant changed. */
  onChange: (repoPath: string) => void;
  /** Watcher-level errors (never thrown async). Default: console.warn. */
  onError?: (err: Error) => void;
}

const DEFAULT_DEBOUNCE_MS = 300;

/** dotgit files whose change means "HEAD/refs/index moved — re-status". */
const DOTGIT_FILES = new Set([
  'HEAD',
  'ORIG_HEAD',
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'REBASE_HEAD',
  'FETCH_HEAD',
  'packed-refs',
  'index'
]);

const DOTGIT_PREFIXES = ['refs', 'rebase-merge', 'rebase-apply', 'sequencer'];

/** Is this path (relative to the git dir) one we care about? */
export function isRelevantDotGitPath(rel: string): boolean {
  if (rel.length === 0) return false;
  if (rel.endsWith('.lock')) return false; // index.lock, refs/*.lock
  if (DOTGIT_FILES.has(rel)) return true;
  return DOTGIT_PREFIXES.some(
    (p) => rel === p || rel.startsWith(`${p}/`)
  );
}

/** Follow a `.git` FILE's `gitdir: <path>` pointer (worktrees/submodules). */
export function readGitdirPointer(
  dotGitFile: string,
  contents: string
): string | null {
  const m = /^gitdir:\s*(.+)\s*$/m.exec(contents);
  if (!m || m[1] === undefined) return null;
  const target = m[1].trim();
  return resolve(dirname(dotGitFile), target);
}

export class RepoWatcher {
  /** The path as the caller gave it — reported verbatim in onChange. */
  readonly repoPath: string;
  /**
   * realpath of repoPath — FSEvents reports canonical paths (e.g.
   * /private/var/… for a /var/… symlink), so subscriptions and path
   * filters must use the canonical form or the relevance filter breaks.
   */
  private readonly watchRoot: string;

  private readonly debounceMs: number;
  private readonly onChange: (repoPath: string) => void;
  private readonly onError: (err: Error) => void;

  private worktreeSub: AsyncSubscription | null = null;
  private dotgitSub: AsyncSubscription | null = null;
  private dotgitDir: string | null = null;
  /**
   * The in-flight dotgit attach, held so dispose() can AWAIT it (Phase 36).
   * A dispose that lands mid subscribe used to fire the "disposed during
   * subscribe" unsubscribe and walk away; now the whole start is awaited,
   * so the close finishes before dispose returns.
   */
  private dotgitStart: Promise<void> | null = null;

  private flushTimer: NodeJS.Timeout | null = null;
  private disposed = false;

  private constructor(repoPath: string, options: RepoWatcherOptions) {
    this.repoPath = repoPath;
    this.watchRoot = realpathSync(repoPath);
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.onChange = options.onChange;
    this.onError =
      options.onError ??
      ((err) =>
        watcherLog.warn(`repo watcher (${repoPath}): ${err.message}`));
  }

  /**
   * Start watching. Rejects only when the WORKTREE subscription cannot be
   * established (missing dir, permissions); a missing/odd `.git` is fine.
   */
  static async watch(
    repoPath: string,
    options: RepoWatcherOptions
  ): Promise<RepoWatcher> {
    const rw = new RepoWatcher(resolve(repoPath), options);

    rw.worktreeSub = await watcher.subscribe(
      rw.watchRoot,
      (err, events) => rw.handleWorktreeEvents(err, events),
      // Exclude ALL of .git from the worktree watcher; the targeted dotgit
      // watcher below covers HEAD/refs.
      { ignore: [join(rw.watchRoot, '.git')] }
    );

    await rw.tryStartDotgitWatcher();
    return rw;
  }

  /** Stop both subscriptions. Safe to call twice. */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // Phase 36: a dotgit attach can be mid subscribe right now. Wait for it,
    // so its "disposed during subscribe" unsubscribe has FINISHED (not just
    // been fired) by the time this dispose resolves. The quit path awaits
    // dispose, so this closes the last unawaited close in this file.
    if (this.dotgitStart !== null) {
      await this.dotgitStart.catch(() => undefined);
    }
    const subs = [this.worktreeSub, this.dotgitSub];
    this.worktreeSub = null;
    this.dotgitSub = null;
    for (const sub of subs) {
      if (sub !== null) {
        // Tracked AND awaited (Phase 36 fix round). The quit path bounds the
        // await with a race; when the bound expires with this unsubscribe
        // still queued behind pool work, the tracked set is the only thing
        // that lets `pendingWatcherCloseCount()` see it and drain again
        // instead of quitting into a napi abort.
        await trackWatcherClose(sub.unsubscribe().catch(() => undefined));
      }
    }
  }

  // -------------------------------------------------------------------------

  private handleWorktreeEvents(err: Error | null, events: Event[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      return;
    }
    if (events.length > 0) this.scheduleFlush();
  }

  private handleDotgitEvents(err: Error | null, events: Event[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      return;
    }
    const gitDir = this.dotgitDir;
    if (gitDir === null) return;
    for (const e of events) {
      const rel = relative(gitDir, e.path).split(sep).join('/');
      if (isRelevantDotGitPath(rel)) {
        this.scheduleFlush();
        return;
      }
    }
  }

  /**
   * First event opens a 300 ms window; everything inside it coalesces into
   * one onChange. Deliberately NOT resetting the timer on new events —
   * continuous churn still refreshes every window.
   */
  private scheduleFlush(): void {
    if (this.disposed || this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.disposed) return;
      // `git init` after the fact: attach the dotgit watcher when it appears.
      void this.tryStartDotgitWatcher();
      try {
        this.onChange(this.repoPath);
      } catch (err) {
        this.onError(err as Error);
      }
    }, this.debounceMs);
  }

  /** Attach the dotgit watcher if `.git` exists and none is attached yet. */
  private tryStartDotgitWatcher(): Promise<void> {
    if (this.disposed || this.dotgitSub !== null) return Promise.resolve();
    if (this.dotgitStart !== null) return this.dotgitStart;
    this.dotgitStart = this.startDotgitWatcher().finally(() => {
      this.dotgitStart = null;
    });
    return this.dotgitStart;
  }

  /** The attach itself. Never rejects; errors go through onError. */
  private async startDotgitWatcher(): Promise<void> {
    try {
      const gitDir = this.resolveDotgitDir();
      if (gitDir === null) return;
      this.dotgitDir = gitDir;
      const sub = await watcher.subscribe(
        gitDir,
        (err, events) => this.handleDotgitEvents(err, events),
        {
          // Keep the firehose subtrees out natively; the relevance filter
          // above handles the rest (index.lock etc.).
          ignore: [
            join(gitDir, 'objects'),
            join(gitDir, 'logs'),
            join(gitDir, 'lfs'),
            join(gitDir, 'worktrees'),
            join(gitDir, 'fsmonitor--daemon')
          ]
        }
      );
      if (this.disposed) {
        // Phase 36: tracked AND awaited — dispose() is waiting on this very
        // promise, and the quit drain is the second line of defence.
        await trackWatcherClose(sub.unsubscribe().catch(() => undefined));
        return;
      }
      this.dotgitSub = sub;
    } catch (err) {
      this.onError(err as Error);
    }
  }

  /**
   * `.git` directory, or the resolved target of a `.git` pointer file —
   * always in canonical (realpath) form, matching FSEvents' event paths.
   */
  private resolveDotgitDir(): string | null {
    const dotGit = join(this.watchRoot, '.git');
    try {
      const st = statSync(dotGit);
      if (st.isDirectory()) return realpathSync(dotGit);
      if (st.isFile()) {
        const target = readGitdirPointer(
          dotGit,
          readFileSync(dotGit, 'utf8')
        );
        if (target !== null && statSync(target).isDirectory()) {
          return realpathSync(target);
        }
      }
    } catch {
      /* no .git (yet) — retried on the next flush */
    }
    return null;
  }
}
