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
 *
 * PHASE 151 CHANGED TWO THINGS, and the second one is the important one.
 *
 *   1. The worktree subscription now also excludes the directories the
 *      repository itself ignores, inside the eight path budget the macOS API
 *      actually enforces. Anything past the eighth is excluded in userspace
 *      instead, by an anchored matcher built from the ESCAPED directory name,
 *      because a directory name is a literal and handing it to a glob engine
 *      made one repository whose root was named `!archive` go completely
 *      blind. See ./ignored-roots.ts, which carries the measurements and the
 *      reason a ninth path would silently disable all eight. Measured on 2026-08-25 with two subscriptions on ONE tree under
 *      one lot of churn, so both arms saw identical conditions: three 60
 *      second runs delivered 300,357, 318,368 and 343,577 events to the old
 *      single `.git` exclusion, and 29, 26 and 26 to this one.
 *   2. A DROPPED BATCH NOW CAUSES A RE-READ. FSEvents overflow is reported on
 *      the same callback as ordinary events, and this file used to log it and
 *      return, so the message that says "File system must be re-scanned" was
 *      answered by no re-scan at all and the events that arrived beside it
 *      were discarded too. That is what could lose a person's edit from view.
 *
 * THEY HAD TO LAND TOGETHER, and this is the thing to understand before
 * touching either. Excluding the noise WITHOUT fixing the drop would have
 * made the product worse. The ordinary events were accidentally covering for
 * the defect: enough non error batches arrived that some flush usually
 * happened anyway. Take them away and the drop is often the only callback in
 * the minute, and under the old rule a drop did nothing at all.
 *
 * The number, measured over three 60 second churn runs driving this class,
 * with a real edit to a tracked file every two seconds:
 *
 *                              parent a2d7ad0      this commit
 *     drops logged per minute  124, 115, 118       22, 29, 25
 *     onChange calls           1, 14, 7            23, 29, 25
 *     edits seen within 5 s    0/28, 10/28, 8/28   27/28, 29/29, 29/29
 *     median latency           none, 1786, 2087    309, 310, 311 ms
 *
 * The first run of the parent commit surfaced NONE of the twenty eight edits,
 * and its median latency after this change is the 300 ms debounce and nothing
 * else.
 */

import watcher from '@parcel/watcher';
import type { AsyncSubscription, Event } from '@parcel/watcher';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { planWorktreeIgnore, readIgnoredRoots } from './ignored-roots';
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

/**
 * Does this watcher error mean "the file system must be re-scanned"?
 *
 * The three macOS drop messages are written in
 * `node_modules/@parcel/watcher/src/macos/FSEventsBackend.cc` lines 84, 86
 * and 88, one per drop cause, and all three end with that same sentence:
 *
 *   "Events were dropped by the FSEvents client. File system must be re-scanned."
 *   "Events were dropped by the kernel. File system must be re-scanned."
 *   "Too many events. File system must be re-scanned."
 *
 * The sentence is the stable part, so it is what is matched.
 *
 * WHY THIS IS NOT SIMPLY "any error". `Watcher::notifyError` in
 * `node_modules/@parcel/watcher/src/Watcher.cc` line 113 delivers a FATAL
 * error on this same callback, for example the watched root being deleted,
 * and it calls `clearCallbacks()` immediately after, so the subscription is
 * dead. Re-scanning on that would be a re-read that can never be followed by
 * another event, and treating it as a reason to keep going would be a lie
 * about whether we are still watching. A drop is the opposite: the
 * subscription is alive and healthy, and the only thing lost is the batch.
 */
export function isRescanRequired(err: Error): boolean {
  return /must be re-scanned/i.test(err.message);
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

    // Phase 151. Everything the repository itself ignores is churn Tortie
    // will never act on, and until this phase all of it was inside the
    // stream. `readIgnoredRoots` is one git read of about 20 ms; it never
    // throws, and `ensureWatcher` in src/main/git/ipc.ts stores this promise
    // without awaiting it, so no `git:status` waits on it. The plan spends
    // the eight CoreServices slots first and falls back to userspace globs,
    // for the reasons written out in full in ./ignored-roots.ts.
    const plan = planWorktreeIgnore(
      rw.watchRoot,
      existsSync(join(rw.watchRoot, '.git'))
        ? await readIgnoredRoots(rw.watchRoot)
        : []
    );
    if (plan.overflow.length > 0) {
      watcherLog.info(
        `${repoPath}: ${plan.paths.length} ignored roots excluded in the ` +
          `kernel, ${plan.overflow.length} past the 8 path cap filtered in ` +
          'userspace instead',
        // A RegExp serialises to `{}`, so log the source a person can read.
        { paths: plan.paths, overflow: plan.overflow.map((r) => r.source) }
      );
    }

    rw.worktreeSub = await watcher.subscribe(
      rw.watchRoot,
      (err, events) => rw.handleWorktreeEvents(err, events),
      // `.git` is always the first exclusion; the targeted dotgit watcher
      // below covers HEAD/refs. The rest are this repository's ignored roots.
      { ignore: plan.ignore }
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

  /**
   * Phase 151: A DROPPED BATCH NOW CAUSES A RE-READ.
   *
   * Until this phase this method called `onError` and returned, so the one
   * message that says in plain words "File system must be re-scanned" was
   * the one message Tortie answered by doing nothing. After a drop the tree
   * and the SCM view could stay stale until an unrelated event happened to
   * arrive, and with this phase's exclusions in place the drop is often the
   * ONLY callback in a whole minute, so nothing unrelated arrives.
   *
   * Two things are wrong with the old three lines and both are fixed here.
   * First, no re-scan. Second, `Watcher::triggerCallbacks` in
   * `node_modules/@parcel/watcher/src/Watcher.cc` line 124 builds ONE
   * `CallbackData(error, events)` and hands the callback both at once, so the
   * early return threw away the real events that arrived beside the error.
   * Measured on 2026-08-25 over a 60 second churn run with the exclusions on
   * and a real edit to a tracked file every two seconds: 25 of the 29 edits
   * arrived inside a batch that also carried the drop, and the old rule threw
   * all 25 away. Only 4 batches in that whole minute carried events and no
   * error, so the old rule would have fired four times for twenty nine edits.
   *
   * The re-scan is one `scheduleFlush()`, which is the same call an ordinary
   * event makes, and that is deliberate. Every consumer of `onChange` answers
   * a repo change by re-reading from scratch rather than by patching
   * incremental state, so the correct response to a drop IS an ordinary
   * change notification. Routing it into the existing 300 ms non resetting
   * window also means a storm of drops is bounded exactly as a storm of
   * events already is, at about three notifications a second, with no second
   * timer and no new number.
   *
   * Returning after the flush stays correct: `scheduleFlush` is idempotent
   * inside a window, so the events that came with the error would only
   * schedule the very same flush.
   */
  private handleWorktreeEvents(err: Error | null, events: Event[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      if (isRescanRequired(err)) this.scheduleFlush();
      return;
    }
    if (events.length > 0) this.scheduleFlush();
  }

  /**
   * Phase 151, the same fix. Here the flush is UNCONDITIONAL on a drop rather
   * than filtered by `isRelevantDotGitPath`, because a dropped batch tells us
   * nothing about which paths were in it. A ref may have moved and we cannot
   * know, so the only honest answer is to re-status.
   */
  private handleDotgitEvents(err: Error | null, events: Event[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      if (isRescanRequired(err)) this.scheduleFlush();
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
