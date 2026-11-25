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
 *
 * PHASE 365. Both watches go through `watchFolder` (./host.ts), and nothing in
 * this file touches the native module. The host runs every subscribe and
 * unsubscribe one at a time in a process of its own, asks whether the folder is
 * there at the watch's turn, and tracks every close for the quit's drains, so a
 * close here is `FolderWatch.close()` and nothing more. Three answers are new:
 * a worktree watch that comes back `null` rejects `watch()`, a dotgit watch that
 * comes back `null` is "no `.git` yet" and is asked again on the next flush, and
 * a watch that waited longer than the debounce window for its turn schedules one
 * flush, because an edit made while it waited was seen by no stream.
 *
 * PHASE 371. Each flush says whether GIT'S OWN DATA MAY HAVE MOVED, the second
 * value handed to `onChange`, so History can tell a commit from a saved file and
 * a saved file starts no git process that could only answer what it answered
 * before. UNKNOWN IS ALWAYS TRUE, and `false` is said only when all of it is
 * known: a `.git` stream is attached and has not died, everything git's refs
 * live in is under the directory it watches, no relevant event, drop, long wait
 * or attach has happened since the last flush, and the files no stream carries
 * (./git-data.ts) read exactly as they did at it. A linked worktree, a folder
 * inside a repository, a `.git` that was replaced and a stream that may have
 * died all read true on every flush, which is what every flush was before this
 * phase.
 *
 * Two of its rules are the kind a later round would tidy away. A DEAD `.git`
 * STREAM SAYS NOTHING: after `rm -rf .git` and `git init`, or `.git` renamed
 * away and back, the subscription stays set, no error comes and no event ever
 * comes again (measured, build/p371/SPEC.md 2.3), so `dotgitLost` is latched and
 * never un-set. And the bit is TAKEN at the flush and nowhere else, beside the
 * call that hands it over: a worktree batch must not clear what a ref set in the
 * same window.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { planWorktreeIgnore, readIgnoredRoots } from './ignored-roots';
import type { WorktreeIgnorePlan } from './ignored-roots';
import { WATCHER_RESTART_ERROR, watchFolder } from './host';
import type { FolderEvent, FolderWatch } from './host';
import { createGitDataReader } from './git-data';
import type { GitDataReading } from './git-data';
import { getLog } from '../log';
// PHASE 274. The ONE canonicalising realpath. `fs.realpathSync` is Node's own
// JavaScript walk and returns the case it was handed, which is not the
// canonical form the two comments below say this file needs.
import { canonicalPathSync } from '../fs/folder-identity';

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
  /**
   * Called once per debounce window when anything relevant changed.
   * `gitMoved` (Phase 371) is false only when it is known that git's own data
   * did not move; true means it may have.
   */
  onChange: (repoPath: string, gitMoved: boolean) => void;
  /** Watcher-level errors (never thrown async). Default: console.warn. */
  onError?: (err: Error) => void;
}

/**
 * The coalescing window every consumer of the repo-changed fan-out inherits.
 *
 * EXPORTED SINCE PHASE 63, and the reason is worth one sentence. The arch
 * checker's settle window is stated as a multiple of this number rather than as
 * a second copy of it, so the two can never disagree. Research 49 wrote this
 * number down as 150 ms, which was never true of this file; a consumer that
 * reads the constant cannot inherit that mistake.
 */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * dotgit files whose change means "HEAD/refs/index moved — re-status".
 *
 * PHASE 371 added the last three, so the things that live in them no longer wait
 * for an unrelated save to be shown: `config` and `config.worktree` hold the
 * remotes and every branch's upstream, and `reftable/tables.list` is rewritten
 * once for each ref update in a reftable repository, which has no `refs/` to
 * see. It is that one file and not the `reftable/` folder, whose table files
 * come and go several at a time for one update.
 */
const DOTGIT_FILES = new Set([
  'HEAD',
  'ORIG_HEAD',
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'REBASE_HEAD',
  'FETCH_HEAD',
  'packed-refs',
  'index',
  'config',
  'config.worktree',
  'reftable/tables.list'
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
 * Phase 365 added a fourth sender: the host's restart notice,
 * `WATCHER_RESTART_ERROR` in ./host.ts, ends with the same sentence, so a watch
 * re-bound after its process was replaced is re-read exactly as a drop is.
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

/**
 * PHASE 347. What the running worktree subscription can never deliver an event
 * for, kept so `excludes` can answer from it. It is the plan the subscription
 * was handed, with one change made once, at start: every kernel path is spelled
 * the way the DISK stores it.
 *
 * WHY THE KERNEL PATHS ARE RESPELLED, AND WHY ONLY THEY ARE. Git on macOS runs
 * with `core.precomposeunicode=true`, so it reports an ignored folder's name
 * composed (NFC) even when the folder is stored decomposed (NFD), which is how
 * Finder and Cocoa make names. `FSEventStreamSetExclusionPaths` still excludes
 * that folder (the reverify measured 0 events for writes inside it), so the bus
 * is blind to it, while `canonicalPathSync` spells a file inside it with the
 * stored bytes. A string compare of the two would answer "not excluded" for a
 * file the bus cannot see. So each kernel path is passed through
 * `canonicalPathSync` once, which ASKS THE FILESYSTEM for the stored name; no
 * string is normalised or case folded (conformance:samefolder rule 23), and a
 * path that cannot be resolved keeps its own spelling.
 *
 * The OVERFLOW matchers are left exactly as the subscription has them. They are
 * matched in userspace against the event's path relative to the root, as text,
 * so a matcher spelled composed does not exclude a folder stored decomposed, the
 * bus sees that folder, and reading the canonical path with the same matcher is
 * what mirrors it. That reasoning is not measured over FSEvents here; the
 * kernel half is.
 */
export interface ExclusionView {
  /** The kernel exclusion paths, `.git` first, each in its stored spelling. */
  readonly paths: readonly string[];
  /** The userspace matchers, run against the POSIX path relative to the root. */
  readonly overflow: readonly RegExp[];
}

/** PHASE 347. The plan as `excludes` reads it, kernel paths respelled once. */
export function exclusionViewOf(plan: WorktreeIgnorePlan): ExclusionView {
  return {
    paths: plan.paths.map((p) => {
      try {
        return canonicalPathSync(p);
      } catch {
        return p;
      }
    }),
    overflow: [...plan.overflow]
  };
}

/**
 * PHASE 365. Why a worktree watch came back `null`, in words that are true.
 *
 * The host answers `null` for a folder that is not there at the watch's turn
 * (the reason that is about the folder, and D11's words), and also while the
 * app quits, once it has stopped restarting a process that kept crashing, and
 * for a watch it was holding when its process was replaced. Those are about
 * the watcher, the host writes its own line for each, and saying "is not there"
 * of a folder that is there would send a reader of app.log the wrong way. So
 * the disk is asked once, here, and nowhere else.
 */
function notWatchedReason(repoPath: string, watchRoot: string): string {
  try {
    if (statSync(watchRoot).isDirectory()) {
      return `the file watcher did not watch ${repoPath}`;
    }
  } catch {
    /* gone, which is the ordinary reason */
  }
  return `${repoPath} is not there`;
}

/** True when `child` is `parent` or sits under it, as path components. */
function isAtOrUnder(child: string, parent: string): boolean {
  if (child === parent) return true;
  const prefix = parent.endsWith(sep) ? parent : parent + sep;
  return child.startsWith(prefix);
}

/**
 * PHASE 347, D11. True when the worktree subscription never delivers an event
 * for this canonical path: it is one of the view's kernel paths or under one,
 * or its POSIX path relative to the root matches an overflow matcher. False
 * outside the root, and false with no view (a watcher not started, or stopped).
 * Byte exact on canonical spellings; nothing here folds case or normalises.
 */
export function excludedBy(
  view: ExclusionView | null,
  watchRoot: string,
  canonicalPath: string
): boolean {
  if (view === null) return false;
  if (canonicalPath === watchRoot || !isAtOrUnder(canonicalPath, watchRoot)) {
    return false;
  }
  for (const p of view.paths) {
    if (isAtOrUnder(canonicalPath, p)) return true;
  }
  if (view.overflow.length === 0) return false;
  const rel = relative(watchRoot, canonicalPath).split(sep).join('/');
  return view.overflow.some((r) => r.test(rel));
}

export class RepoWatcher {
  /** The path as the caller gave it — reported verbatim in onChange. */
  readonly repoPath: string;
  /**
   * realpath of repoPath — FSEvents reports canonical paths (e.g.
   * /private/var/… for a /var/… symlink), so subscriptions and path
   * filters must use the canonical form or the relevance filter breaks.
   *
   * PHASE 274: it is now the canonical form in CASE too. `fs.realpathSync`
   * resolved the symlink half of that promise and kept whatever case the caller
   * typed, so a project opened at a spelling the disk does not use watched a
   * root whose string never matched the events FSEvents delivered.
   */
  private readonly watchRoot: string;

  private readonly debounceMs: number;
  private readonly onChange: (repoPath: string, gitMoved: boolean) => void;
  private readonly onError: (err: Error) => void;

  private worktreeSub: FolderWatch | null = null;
  private dotgitSub: FolderWatch | null = null;
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

  /**
   * PHASE 371. Something since the last flush says git's own data may have
   * moved. True at construction, because nothing is known before the first one.
   * Taken and cleared by `takeGitMoved` alone.
   */
  private gitMovePending = true;
  /**
   * PHASE 371. The `.git` stream may have died, or may be watching a directory
   * that is no longer this repository's. Never un-set: nothing re-attaches it,
   * so nothing it could say again would be the whole truth.
   */
  private dotgitLost = false;
  /** PHASE 371. The identity of the git directory the `.git` watch was asked for. */
  private dotgitId: string | null = null;
  /** PHASE 371. The stamp of the files no stream carries, at the last flush. */
  private gitStamp: string | null = null;
  private readonly readGitData: (gitDir: string | null) => GitDataReading;

  /**
   * PHASE 347. The exclusion plan the worktree subscription was started with,
   * kept for `excludes` (it used to be a local of `watch()`). Null until the
   * subscription exists, and null again from the first step of `dispose()`, so
   * a holder of a stopped watcher is told nothing is excluded and arms nothing.
   */
  private plan: ExclusionView | null = null;

  /**
   * Phase 163, the observation Phase 151 left owed. Three integers kept in
   * memory and read only when a diagnostics capture asks: kernel drops, the
   * re-reads a drop scheduled, and the re-reads that ran. Nothing reads them
   * on a timer. `unservedDrops` is the alarm: drops since the last completed
   * re-read, and when it climbs past one with nothing completing inside two
   * debounce windows, one warning names the repository in the log.
   */
  readonly observation = { drops: 0, rescansScheduled: 0, rescansCompleted: 0 };
  private unservedDrops = 0;
  private lastRescanScheduledAt = 0;
  private rescanPending = false;

  private constructor(repoPath: string, options: RepoWatcherOptions) {
    this.repoPath = repoPath;
    this.watchRoot = canonicalPathSync(repoPath);
    this.readGitData = createGitDataReader(this.watchRoot, process.env);
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

    const worktree = await watchFolder(
      rw.watchRoot,
      // `.git` is always the first exclusion; the targeted dotgit watcher
      // below covers HEAD/refs. The rest are this repository's ignored roots.
      { ignore: plan.ignore },
      (err, events) => rw.handleWorktreeEvents(err, events)
    );
    // Phase 365: `null` is "nothing to watch". The folder is usually gone (it
    // can go while the git read above runs, and the host asks at the watch's
    // turn rather than subscribing to a folder that is not there). The words
    // ask the disk, because the host also answers `null` while the app quits
    // or once it has stopped restarting its process, and a "could not watch"
    // line in app.log is evidence a later diagnosis reads.
    if (worktree === null) throw new Error(notWatchedReason(repoPath, rw.watchRoot));
    rw.worktreeSub = worktree;
    // Phase 347: kept for `excludes`, the kernel paths spelled as stored.
    rw.plan = exclusionViewOf(plan);

    await rw.tryStartDotgitWatcher();
    // Phase 365, D9: a stream sees nothing from before it started. When this
    // watch waited longer than one debounce window (behind a burst of other
    // watches at a boot, or a restarted watcher process), one re-read covers an
    // edit made while it waited. A short wait is today's few milliseconds.
    // Phase 371: nor is it known what git's data did meanwhile.
    if (worktree.startedAfterMs > rw.debounceMs) {
      rw.gitMovePending = true;
      rw.scheduleFlush();
    }
    return rw;
  }

  /**
   * PHASE 347. True when the worktree subscription never delivers an event
   * for this canonical path: it is one of the plan's kernel paths (`.git`
   * included) or under one, or its POSIX path relative to the root matches an
   * overflow matcher. False outside the root. The plan is fixed for the life
   * of the subscription, and false once `dispose()` has begun.
   */
  excludes(canonicalPath: string): boolean {
    return excludedBy(this.plan, this.watchRoot, canonicalPath);
  }

  /** Stop both subscriptions. Safe to call twice. */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    // Phase 347: first, so a holder of this watcher arms nothing from now on.
    this.plan = null;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // Phase 36: a dotgit attach can be mid subscribe right now. Wait for it,
    // so its "disposed during subscribe" close has FINISHED (not just been
    // fired) by the time this dispose resolves. The quit path awaits dispose,
    // so this closes the last unawaited close in this file.
    if (this.dotgitStart !== null) {
      await this.dotgitStart.catch(() => undefined);
    }
    const subs = [this.worktreeSub, this.dotgitSub];
    this.worktreeSub = null;
    this.dotgitSub = null;
    for (const sub of subs) {
      if (sub !== null) {
        // Awaited, as Phase 36 made it. Phase 365: the host tracks every
        // close for the quit's drains itself, so it is not tracked a second
        // time here.
        await sub.close().catch(() => undefined);
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
  private handleWorktreeEvents(err: Error | null, events: FolderEvent[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      if (isRescanRequired(err)) this.noteDrop();
      return;
    }
    if (events.length > 0) this.scheduleFlush();
  }

  /**
   * Phase 151, the same fix. Here the flush is UNCONDITIONAL on a drop rather
   * than filtered by `isRelevantDotGitPath`, because a dropped batch tells us
   * nothing about which paths were in it. A ref may have moved and we cannot
   * know, so the only honest answer is to re-status.
   *
   * PHASE 371 latches `dotgitLost` here for the three ways this stream can die.
   * A fatal error is one. The restart notice is another, and it IS a re-scan
   * notice: the new watcher process re-binds each watch, and a re-bind that comes
   * back with no watch says nothing to anybody. The third is an event that
   * deletes the git directory itself, after which the library stops the stream.
   * Every event is read, so a delete behind a relevant event is not missed.
   */
  private handleDotgitEvents(err: Error | null, events: FolderEvent[]): void {
    if (this.disposed) return;
    if (err) {
      this.onError(err);
      if (!isRescanRequired(err) || err.message === WATCHER_RESTART_ERROR) {
        this.dotgitLost = true;
      }
      if (isRescanRequired(err)) this.noteDrop();
      return;
    }
    const gitDir = this.dotgitDir;
    if (gitDir === null) return;
    for (const e of events) {
      const rel = relative(gitDir, e.path).split(sep).join('/');
      if (rel === '' && e.type === 'delete') this.dotgitLost = true;
      if (isRelevantDotGitPath(rel)) {
        this.gitMovePending = true;
        this.scheduleFlush();
      }
    }
  }

  /**
   * Phase 163. A drop is counted, the re-read it needs is scheduled through
   * the same window an ordinary event uses, and the one alarm fires when
   * drops keep arriving and no re-read completes. The alarm is a log line
   * and never a number on a surface.
   *
   * Phase 371: on either stream a dropped batch may have held a ref, so git's
   * data may have moved.
   */
  private noteDrop(): void {
    const now = Date.now();
    this.observation.drops += 1;
    this.unservedDrops += 1;
    if (
      this.unservedDrops > 1 &&
      this.lastRescanScheduledAt !== 0 &&
      now - this.lastRescanScheduledAt > this.debounceMs * 2
    ) {
      watcherLog.warn(
        `repo watcher (${this.repoPath}): ${this.unservedDrops} dropped ` +
          'batches and no re-read has completed since the first'
      );
    }
    if (this.flushTimer === null) {
      this.observation.rescansScheduled += 1;
      this.lastRescanScheduledAt = now;
    }
    this.rescanPending = true;
    this.gitMovePending = true;
    this.scheduleFlush();
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
      if (this.rescanPending) {
        this.rescanPending = false;
        this.observation.rescansCompleted += 1;
        this.unservedDrops = 0;
      }
      // Phase 371: taken before the attach below, which sets it again.
      const gitMoved = this.takeGitMoved();
      // `git init` after the fact: attach the dotgit watcher when it appears.
      void this.tryStartDotgitWatcher();
      try {
        this.onChange(this.repoPath, gitMoved);
      } catch (err) {
        this.onError(err as Error);
      }
    }, this.debounceMs);
  }

  /**
   * PHASE 371. May git's own data have moved since the last flush? Every operand
   * is read on every flush, so the stamp never goes stale behind a pending bit.
   *
   * The git directory is resolved again here rather than taken from the watch,
   * because a directory made again in the same place, another one moved onto it
   * and a `.git` file that now points elsewhere all leave a watch that is set
   * and deaf.
   */
  private takeGitMoved(): boolean {
    const pending = this.gitMovePending;
    this.gitMovePending = false;
    const now = this.readGitData(this.resolveDotgitDir());
    if (this.dotgitSub !== null && now.id !== this.dotgitId) this.dotgitLost = true;
    const changed = this.gitStamp !== now.stamp;
    this.gitStamp = now.stamp;
    return pending || changed || !now.whole || this.dotgitSub === null || this.dotgitLost;
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
      // Phase 371: before the watch is asked for, so a directory replaced while
      // the watch waits its turn is not the one this says is watched.
      this.dotgitId = this.readGitData(gitDir).id;
      const sub = await watchFolder(
        gitDir,
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
        },
        (err, events) => this.handleDotgitEvents(err, events)
      );
      // Phase 365: `null` is "no `.git` (yet)", the folder having gone between
      // the stat above and the watch's turn. It is asked again on the next
      // flush, exactly as a missing `.git` always has been.
      if (sub === null) return;
      if (this.disposed) {
        // Phase 36: awaited, because dispose() is waiting on this very
        // promise. The host tracks the close for the quit's drains.
        await sub.close().catch(() => undefined);
        return;
      }
      this.dotgitSub = sub;
      // Phase 371: a ref that moved between the flush that asked for this watch
      // and the moment it began reached no stream.
      this.gitMovePending = true;
      // Phase 365, D9, for this stream too: a `.git` watch attached after a
      // long wait for its turn re-reads once, because a ref that moved while it
      // waited reached no stream (the worktree watch excludes `.git`).
      if (sub.startedAfterMs > this.debounceMs) {
        this.gitMovePending = true;
        this.scheduleFlush();
      }
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
      if (st.isDirectory()) return canonicalPathSync(dotGit);
      if (st.isFile()) {
        const target = readGitdirPointer(
          dotGit,
          readFileSync(dotGit, 'utf8')
        );
        if (target !== null && statSync(target).isDirectory()) {
          return canonicalPathSync(target);
        }
      }
    } catch {
      /* no .git (yet) — retried on the next flush */
    }
    return null;
  }
}
