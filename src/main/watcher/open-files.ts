/**
 * A file open in a tab, in a folder the repository watcher cannot see, is
 * watched on its own while the tab is open (Phase 347, issue 33).
 *
 * WHY THIS EXISTS (§2.3 of build/p347/SPEC.md). The worktree subscription in
 * ./repo-watcher.ts excludes `.git` and the repository's ignored directories,
 * in the kernel and in userspace (./ignored-roots.ts), so an agent writing
 * `notes/a.md` in an ignored `notes/` sends the bus nothing and the open tab
 * changed only when a person looked (Phase 334's doors). Measured over the
 * shipping `RepoWatcher`: an in-place write and a rename-over inside an ignored
 * directory both gave the bus 0 events, while an ignored FILE in a tracked
 * directory and a directory ignored after the start gave it 1. So the set the
 * bus is blind to is exactly the running watcher's exclusion plan, and that is
 * the set this module serves (D11): the window declares the files its walk
 * reads, and main arms only those the repository's own running watcher answers
 * `excludes` for.
 *
 * THE PRIMITIVE (D13). `node:fs`'s watch on ONE FILE, never a directory, never
 * `@parcel/watcher`, never an exclusion path, so the eight path budget
 * `conformance:watcher` guards is untouched (Phase 276's `env/watch.ts` uses the
 * same primitive for the same reason). It is armed through a DESCRIPTOR: the
 * canonical path opened `O_RDONLY | O_NONBLOCK | O_NOFOLLOW`, `fstat` asked
 * whether it is a regular file, the watch armed on `/dev/fd/<n>`, and `<n>`
 * closed in a `finally`. A plain `fs.watch(path)` on a FIFO never returns (it
 * would freeze main), and a stat then a watch leaves that race open; a
 * non-blocking open of a FIFO returns at once and `fstat` refuses it. The watch
 * holds one descriptor of its own, measured at exactly one per watch.
 *
 * ONE GATE FOR EVERY ARM (D14). `armChecked` is the only caller of
 * `deps.armFile`, for the declaration, the re-arm after `rename` or `error`
 * (every Tortie save of a file in a project is a rename-over, so without the
 * re-arm the first auto save would end the watch), the flush's re-arm of a
 * dormant entry, and the check's. In order, nothing awaited: G1 canonical, G2
 * the plan excludes it, G3 arm, G4 canonical and excludes again (a folder
 * swapped for a link mid-gate is refused here), G5 the path's identity equals
 * the handle's (Phase 274's dev and ino, never a name; bounded retries), G6 the
 * window opened and the CHECK handed to `afterKernelSees`. libuv gives a new
 * watch to the kernel at the next poll, so a replace landing before it leaves
 * the watch on an unlinked inode forever; the check, two check phases later,
 * asks G1, G2 and G5 again and re-arms when anything moved.
 *
 * COALESCING (D15). Per declared repository, a window of the bus's own
 * `DEFAULT_DEBOUNCE_MS` that does NOT reset: the first event opens it and its
 * end sends one notice (200 writes 5 ms apart are 200 kernel events, measured).
 * Every arm opens it too, so a write before the kevent was registered is read
 * by the walk that notice causes. A refused arm opens it only when the file is
 * still being replaced (G5 or the check ran out of tries), never for a file
 * that is gone, or a missing file would send a notice every window.
 *
 * DELIVERY (D16, D17). One notice, `git:openFileChanged`, to the windows that
 * declared that repository, never `git:changed`, which would wake status, the
 * tree and SCM for a write git does not track. The window answers it with the
 * same unfloored walk every door takes.
 *
 * WHAT THIS MODULE NEVER DOES (D21). It reads no byte of a watched file,
 * writes nothing, starts no process, and logs counts only, never a path. It
 * arms nothing the plan does not exclude at ANY arm, so a link in an ignored
 * folder to a file outside the repository is never watched, and a watched file
 * replaced by such a link goes dormant. 64 watches across the app (D18), at
 * most 512 entries read from one declaration, and `GMUX_NO_OPEN_FILE_WATCH=1`
 * read at each declaration turns the whole module off (D20).
 */

import { closeSync, constants, fstatSync, lstatSync, openSync, watch } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { gmuxError } from '../errors';
// D15: the bus's own window, imported and never a second copy.
import { DEFAULT_DEBOUNCE_MS } from './repo-watcher';

/** D18: armed watches across the whole app. Ten tabs a project is six projects. */
export const OPEN_FILE_WATCH_CAP = 64;

/** D18: entries read from one declaration; the rest are skipped. */
export const OPEN_FILE_DECLARE_MAX = 512;

/** D14: how many more times G1 to G5, or the check, may re-arm one entry in a row before it goes dormant. */
export const ARM_RECHECKS = 3;

/** D20: `=1` arms nothing, closes what is armed and answers 0, read at each declaration. */
export const OPEN_FILE_WATCH_OFF_ENV = 'GMUX_NO_OPEN_FILE_WATCH';

/** A declared repository or file path longer than this is skipped. */
const ENTRY_TEXT_MAX = 4_096;

/** One file a window's walk reads, in the repository it reads it for. */
export interface OpenFileEntry {
  repoPath: string;
  path: string;
}

/** D11: one repository's running watcher. Synchronous over the plan it holds; false once it is stopped. */
export interface OpenFilePlan {
  excludes(canonicalPath: string): boolean;
}

/** D14 G5: Phase 274's identity, never a name. */
export interface FileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

/** One armed watch: the identity `fstat` read through its descriptor, and its close. */
export interface ArmedFile extends FileIdentity {
  close(): void;
}

/** What a watch reports. `error` is the watcher's own error event. */
export type OpenFileEventKind = 'change' | 'rename' | 'error';

/** The seams. The unit tests hand in fakes and open no real watcher. */
export interface OpenFileWatchDeps {
  /** D11: the repository's running watcher after `ensureWatcher`, held by every entry of it; null when there is none. */
  planFor(repoPath: string): Promise<OpenFilePlan | null>;
  /** D14 G1 and G4: `canonicalPathSync`; a throw answers null. */
  canonical(path: string): string | null;
  /** D13: open the CANONICAL path O_RDONLY|O_NONBLOCK|O_NOFOLLOW, fstat isFile, watch /dev/fd/N, close N; null when refused. */
  armFile(canonicalPath: string, onEvent: (kind: OpenFileEventKind) => void): ArmedFile | null;
  /** D14 G5: `lstat` of a canonical path; its dev and ino when it is a regular file, else null. */
  identity(canonicalPath: string): FileIdentity | null;
  /** D14: runs `fn` once the kernel holds every watch armed before the call (two check phases). */
  afterKernelSees(fn: () => void): void;
  setTimeout(fn: () => void, ms: number): { clear(): void };
  /** D16: one notice to one window. The production send skips a destroyed one. */
  send(senderId: number, repoPath: string): void;
  env(): NodeJS.ProcessEnv;
  /** Counts only. Never a path (D21). */
  log(level: 'info' | 'warn', message: string): void;
}

export interface OpenFileWatches {
  /** D12, D19: this window's whole set; the later of two declarations wins. Rejects INVALID_INPUT for a non-array. */
  declare(senderId: number, entries: unknown): Promise<{ watched: number }>;
  /** D19: the window is destroyed or its renderer is gone. */
  dropSender(senderId: number): void;
  /** D19: the repository was unwatched; its entries close. */
  dropRepo(repoPath: string): void;
  /** D19: quit. Every watch closed and every timer cleared; nothing arms again. */
  dispose(): void;
  /** For tests and the probe's reading through logs; never a surface. */
  counts(): { armed: number; dormant: number; capped: number };
}

/** One declared path. One armed watch per path however many windows declared it. */
interface Entry {
  readonly path: string;
  /** The repository as `unwatchGitRepo` keys it, for `dropRepo`. */
  readonly repoKey: string;
  /** D11: the running watcher of the repository, held from the declaration on. */
  readonly plan: OpenFilePlan | null;
  /** Sender id to the repository string that sender declared this path under. */
  readonly declarers: Map<number, string>;
  handle: ArmedFile | null;
  /** `capped`: refused for the cap alone, so any freed slot may arm it. */
  state: 'armed' | 'dormant' | 'capped';
  closed: boolean;
  /** D14: consecutive re-arms the check has made. */
  rechecks: number;
}

export function createOpenFileWatches(deps: OpenFileWatchDeps): OpenFileWatches {
  const entries = new Map<string, Entry>();
  /** Each window's current set: path to the repository string it declared. */
  const senders = new Map<number, Map<string, string>>();
  /** D19: a window's declarations run one after the other. */
  const queues = new Map<number, Promise<unknown>>();
  /** Bumped by `dropSender`, so a declaration still awaiting its plans lands nothing. */
  const generations = new Map<number, number>();
  /** D15: one window per declared repository string. */
  const windows = new Map<string, { clear(): void }>();
  let armedCount = 0;
  let disposed = false;

  function closeHandle(e: Entry): void {
    const h = e.handle;
    if (h === null) return;
    e.handle = null;
    e.state = 'dormant';
    armedCount -= 1;
    closeQuietly(h);
  }

  function closeEntry(e: Entry): void {
    e.closed = true;
    closeHandle(e);
    if (entries.get(e.path) === e) entries.delete(e.path);
  }

  function dormant(e: Entry): false {
    e.state = 'dormant';
    return false;
  }

  /** D15. Not reset: an open window is left to end where it was going to. */
  function openWindow(repoPath: string): void {
    if (disposed || windows.has(repoPath)) return;
    windows.set(repoPath, deps.setTimeout(() => flush(repoPath), DEFAULT_DEBOUNCE_MS));
  }

  /**
   * D18: a slot freed anywhere may arm a capped entry, whichever window
   * declared it. Asked after a declaration, a window's end and a project's
   * end, so another window's capped tabs never wait for that window's own
   * next declaration (the fix round; the attack lens's nit).
   */
  function armCapped(): void {
    for (const e of [...entries.values()]) {
      if (e.state === 'capped' && e.handle === null) armChecked(e);
    }
  }

  function openWindowsOf(e: Entry): void {
    for (const repoPath of new Set(e.declarers.values())) openWindow(repoPath);
  }

  /** D15, D16: one notice to every window that declared the repository, then its dormant entries try again. */
  function flush(repoPath: string): void {
    windows.delete(repoPath);
    if (disposed) return;
    for (const [senderId, set] of senders) {
      if (!declaresRepo(set, repoPath)) continue;
      try {
        deps.send(senderId, repoPath);
      } catch {
        // A window that cannot be told is a window that will look later.
      }
    }
    for (const e of [...entries.values()]) {
      if (e.closed || e.handle !== null) continue;
      if (!hasRepo(e, repoPath)) continue;
      armChecked(e);
    }
  }

  /**
   * D14, THE ONE GATE. Every arm comes through here and nothing else calls
   * `deps.armFile`. Nothing is awaited between its steps.
   */
  function armChecked(e: Entry): boolean {
    if (disposed || e.closed) return false;
    if (e.handle !== null) return true;
    // D18: the cap is decided here and only here.
    if (armedCount >= OPEN_FILE_WATCH_CAP) {
      e.state = 'capped';
      return false;
    }
    const plan = e.plan;
    for (let attempt = 0; attempt <= ARM_RECHECKS; attempt += 1) {
      // G1
      const c1 = deps.canonical(e.path);
      if (c1 === null) return dormant(e);
      // G2: only what the running watcher cannot see.
      if (plan === null || !plan.excludes(c1)) return dormant(e);
      // G3: the descriptor arm, on the canonical path.
      const h: ArmedFile | null = deps.armFile(c1, (kind) => onEvent(e, h, kind));
      if (h === null) return dormant(e);
      // G4: a folder of the path swapped for a link while G1 to G3 ran.
      const c2 = deps.canonical(e.path);
      if (c2 === null || !plan.excludes(c2)) {
        closeQuietly(h);
        return dormant(e);
      }
      // G5: the file at the path is the file the handle holds.
      const id = deps.identity(c2);
      if (id !== null && id.dev === h.dev && id.ino === h.ino) {
        // G6
        e.handle = h;
        e.state = 'armed';
        armedCount += 1;
        openWindowsOf(e);
        deps.afterKernelSees(() => check(e, h));
        return true;
      }
      // Replaced while it was being opened: close it and try again.
      closeQuietly(h);
    }
    // G5 ran out of tries: still a file being replaced, so the flush tries once more.
    e.state = 'dormant';
    openWindowsOf(e);
    return false;
  }

  /**
   * D14, THE CHECK, run once the kernel holds the watch. G1, G2 and G5 again;
   * anything moved closes the handle and runs the gate, a bounded number of
   * times in a row, then the entry is dormant with the window opened.
   */
  function check(e: Entry, h: ArmedFile): void {
    if (disposed || e.closed || e.handle !== h) return;
    // G1, G2, G5, in the gate's order.
    const c = deps.canonical(e.path);
    const inPlan = c !== null && e.plan !== null && e.plan.excludes(c);
    const id = inPlan && c !== null ? deps.identity(c) : null;
    if (id !== null && id.dev === h.dev && id.ino === h.ino) {
      e.rechecks = 0;
      return;
    }
    closeHandle(e);
    if (e.rechecks >= ARM_RECHECKS) {
      e.rechecks = 0;
      e.state = 'dormant';
      openWindowsOf(e);
      return;
    }
    e.rechecks += 1;
    armChecked(e);
  }

  /** One watch event. A callback after its entry closed, or for a replaced handle, does nothing. */
  function onEvent(e: Entry, h: ArmedFile | null, kind: OpenFileEventKind): void {
    if (disposed || e.closed || h === null || e.handle !== h) return;
    openWindowsOf(e);
    if (kind === 'rename' || kind === 'error') {
      // The watch is on the old inode now. Close it and arm again through the gate.
      closeHandle(e);
      armChecked(e);
    }
  }

  async function apply(
    senderId: number,
    list: OpenFileEntry[],
    generation: number
  ): Promise<{ watched: number }> {
    if (disposed) return { watched: 0 };
    if (deps.env()[OPEN_FILE_WATCH_OFF_ENV] === '1') {
      // D20: the parent's behaviour, reachable at HEAD.
      closeEverything();
      return { watched: 0 };
    }
    // D11: each repository's running watcher, asked fresh for every declaration.
    const plans = new Map<string, OpenFilePlan | null>();
    for (const { repoPath } of list) plans.set(repoPath, null);
    await Promise.all(
      [...plans.keys()].map(async (repoPath) => {
        try {
          plans.set(repoPath, await deps.planFor(repoPath));
        } catch {
          plans.set(repoPath, null);
        }
      })
    );
    if (disposed || (generations.get(senderId) ?? 0) !== generation) {
      return { watched: 0 };
    }

    const next = new Map<string, string>();
    for (const { repoPath, path } of list) next.set(path, repoPath);
    const previous = senders.get(senderId) ?? new Map<string, string>();
    // What left this window's set.
    for (const path of previous.keys()) {
      if (next.has(path)) continue;
      const e = entries.get(path);
      if (e === undefined) continue;
      e.declarers.delete(senderId);
      if (e.declarers.size === 0) closeEntry(e);
    }
    senders.set(senderId, next);
    // What is new, or still waiting to be armed. An armed entry is left alone.
    for (const [path, repoPath] of next) {
      let e = entries.get(path);
      if (e === undefined) {
        e = {
          path,
          repoKey: resolve(repoPath),
          plan: plans.get(repoPath) ?? null,
          declarers: new Map(),
          handle: null,
          state: 'dormant',
          closed: false,
          rechecks: 0
        };
        entries.set(path, e);
      }
      e.declarers.set(senderId, repoPath);
      if (e.handle === null) armChecked(e);
    }
    // A slot freed by this declaration may arm another window's capped entry.
    armCapped();

    let watched = 0;
    let capped = 0;
    for (const path of next.keys()) {
      const e = entries.get(path);
      if (e === undefined) continue;
      if (e.handle !== null) watched += 1;
      else if (e.state === 'capped') capped += 1;
    }
    if (capped > 0) {
      deps.log(
        'info',
        `open file watch: ${String(next.size)} declared by one window, ` +
          `${String(armedCount)} watched in all, ${String(capped)} past the cap`
      );
    }
    return { watched };
  }

  function closeEverything(): void {
    for (const e of [...entries.values()]) closeEntry(e);
    entries.clear();
    senders.clear();
    for (const w of windows.values()) w.clear();
    windows.clear();
  }

  return {
    declare(senderId, raw) {
      let list: OpenFileEntry[];
      try {
        list = parseOpenFileEntries(raw);
      } catch (err) {
        return Promise.reject(err);
      }
      const generation = generations.get(senderId) ?? 0;
      const previous = queues.get(senderId) ?? Promise.resolve();
      const run = previous.then(
        () => apply(senderId, list, generation),
        () => apply(senderId, list, generation)
      );
      queues.set(senderId, run);
      const done = (): void => {
        if (queues.get(senderId) === run) queues.delete(senderId);
      };
      run.then(done, done);
      return run;
    },
    dropSender(senderId) {
      generations.set(senderId, (generations.get(senderId) ?? 0) + 1);
      const set = senders.get(senderId);
      senders.delete(senderId);
      if (set === undefined) return;
      for (const path of set.keys()) {
        const e = entries.get(path);
        if (e === undefined) continue;
        e.declarers.delete(senderId);
        if (e.declarers.size === 0) closeEntry(e);
      }
      armCapped();
    },
    dropRepo(repoPath) {
      const key = resolve(repoPath);
      for (const e of [...entries.values()]) {
        if (e.repoKey === key) closeEntry(e);
      }
      armCapped();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closeEverything();
    },
    counts() {
      let dormantCount = 0;
      let cappedCount = 0;
      for (const e of entries.values()) {
        if (e.handle !== null) continue;
        if (e.state === 'capped') cappedCount += 1;
        else dormantCount += 1;
      }
      return { armed: armedCount, dormant: dormantCount, capped: cappedCount };
    }
  };
}

/**
 * The declared set, read defensively (O12). A non-array is refused whole; an
 * entry that is not `{ repoPath, path }` strings, absolute and at most 4,096
 * characters each, is skipped; at most 512 are read; a path is kept once.
 */
export function parseOpenFileEntries(raw: unknown): OpenFileEntry[] {
  if (!Array.isArray(raw)) {
    throw gmuxError('INVALID_INPUT', 'The open files to watch must be a list.');
  }
  const out: OpenFileEntry[] = [];
  const seen = new Set<string>();
  const n = Math.min(raw.length, OPEN_FILE_DECLARE_MAX);
  for (let i = 0; i < n; i += 1) {
    const item: unknown = raw[i];
    if (item === null || typeof item !== 'object') continue;
    const { repoPath, path } = item as Record<string, unknown>;
    if (typeof repoPath !== 'string' || typeof path !== 'string') continue;
    if (repoPath.length > ENTRY_TEXT_MAX || path.length > ENTRY_TEXT_MAX) continue;
    if (!isAbsolute(repoPath) || !isAbsolute(path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ repoPath, path });
  }
  return out;
}

function declaresRepo(set: Map<string, string>, repoPath: string): boolean {
  for (const r of set.values()) if (r === repoPath) return true;
  return false;
}

function hasRepo(e: Entry, repoPath: string): boolean {
  for (const r of e.declarers.values()) if (r === repoPath) return true;
  return false;
}

function closeQuietly(h: ArmedFile): void {
  try {
    h.close();
  } catch {
    // A watch that will not close holds nothing more we can free.
  }
}

/**
 * The production arm, D13 exactly. The descriptor is opened without following
 * a link at the leaf (a canonical path holds none, so one there was put there
 * after the gate read the path) and without blocking (a FIFO opens at once and
 * `fstat` refuses it). The watch is armed through `/dev/fd/<n>`, which gives
 * it a descriptor of its own, and `<n>` is closed whatever happened. No byte of
 * the file is read.
 */
export function armFileByDescriptor(
  canonicalPath: string,
  onEvent: (kind: OpenFileEventKind) => void
): ArmedFile | null {
  let fd: number;
  try {
    fd = openSync(
      canonicalPath,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW
    );
  } catch {
    return null;
  }
  try {
    const st = fstatSync(fd, { bigint: true });
    if (!st.isFile()) return null;
    const w = watch(`/dev/fd/${String(fd)}`, { persistent: false }, (kind) => {
      onEvent(kind === 'change' ? 'change' : 'rename');
    });
    w.on('error', () => onEvent('error'));
    return {
      dev: st.dev,
      ino: st.ino,
      close: () => w.close()
    };
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/** The production G5 read: `lstat`, a regular file's dev and ino, else null. */
export function fileIdentity(canonicalPath: string): FileIdentity | null {
  try {
    const st = lstatSync(canonicalPath, { bigint: true });
    return st.isFile() ? { dev: st.dev, ino: st.ino } : null;
  } catch {
    return null;
  }
}

/**
 * The production wait, D14. libuv hands a new file watch to the kernel at the
 * start of the loop's NEXT poll. A watch armed inside a watch callback (every
 * re-arm after `rename`) is armed in a poll callback, and the check phase that
 * follows comes BEFORE the poll that registers it, so one `setImmediate` checks
 * too early and a replace in that gap leaves the watch dead (§2.7 F2: one check
 * phase dead, two recovered). The second check phase always comes after a poll.
 */
export function afterKernelSees(fn: () => void): void {
  setImmediate(() => setImmediate(fn));
}
