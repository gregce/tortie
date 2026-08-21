/**
 * Recently opened files — the list that answers an empty ⌘P and breaks ties
 * between equally-scored paths.
 *
 * It listens to the ONE open-file bus rather than being told by the palette,
 * so every gesture that opens a file counts: a tree click, an SCM row, a
 * search hit, a ⌘P pick. That is the honest definition of "recent" — the
 * files you have been in — and it costs one listener and no changes to any
 * other module.
 *
 * Persisted to localStorage so the list survives a restart. It is a
 * convenience, never truth: an unreadable or unwritable store degrades to an
 * empty list and the palette works exactly as well, one tiebreaker poorer.
 *
 * PHASE 99 PUT THE MACHINE IN THE KEY. Quick Open ranks the files in a folder
 * on another machine now, so an entry here can name a file that is not on this
 * Mac. A path alone cannot say whose computer it is on, and the same path on
 * two computers is two different files, so the key carries the machine id
 * inside its first field. `rootKeyOf` composes it and it is the same composer
 * the query's root key comes from, so a recent entry can only ever break a tie
 * inside the root it was opened from.
 *
 * PHASE 121 MADE THAT KEY TWO FIELDS. The renderer used to hand the worker one
 * string per entry, being `${rootKey} ${relPath}`, and the worker took it apart
 * at the first space. A project folder whose path holds a space produced a root
 * nothing matched, so an empty Cmd+P listed nothing for that project. The
 * stored rows did not change and are not migrated. Only what `recentKeys()`
 * hands the worker changed.
 */

import type { QuickOpenRecent } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { LOCAL_MACHINE_ID, rootKeyOf } from '@shared/workspace-target';
import { onOpenFile } from '../state/open-file';

/** Kept small on purpose: nobody scrolls back fifty files, and the whole list
 * is sent to the ranking worker whenever it changes. */
const MAX_RECENTS = 50;

const STORAGE_KEY = 'gmux.quickopen.recents';

export interface RecentFile {
  /** The repository root. On a machine, a path ON THAT MACHINE. */
  repoPath: string;
  relPath: string;
  /**
   * PHASE 99. Which computer `repoPath` is on. An entry written by a build
   * before this phase has none, and it is read as {@link LOCAL_MACHINE_ID},
   * which is what it was.
   */
  machineId: string;
  /** `Date.now()` of the most recent open. */
  at: number;
}

let entries: RecentFile[] = load();

/** The target one entry names, so the key composer is the shared one. */
function targetOf(entry: RecentFile): WorkspaceTarget {
  return { machineId: entry.machineId, path: entry.repoPath };
}

function load(): RecentFile[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentFile =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as RecentFile).repoPath === 'string' &&
          typeof (x as RecentFile).relPath === 'string'
      )
      .map((x) => ({
        repoPath: x.repoPath,
        relPath: x.relPath,
        // PHASE 99. An entry from an older build has no machine id. It is read
        // as a file on this Mac, which is what it is, so no store is discarded
        // and no key is migrated.
        machineId:
          typeof x.machineId === 'string' && x.machineId !== ''
            ? x.machineId
            : LOCAL_MACHINE_ID,
        at: typeof x.at === 'number' ? x.at : 0
      }))
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* private mode, quota, corrupt store — the feature degrades, not breaks */
  }
}

/** Most-recent-first, newest at index 0. */
export function recentFiles(): readonly RecentFile[] {
  return entries;
}

/**
 * The list the ranking worker ranks by, most recent first.
 *
 * PHASE 121 MADE IT A TUPLE. It used to be `${rootKey} ${relPath}` and the
 * worker split it at the first space. A root key holding a space, which is
 * every project inside a folder such as `/Users/gdc/My Projects`, split into a
 * root nothing matched, so an empty Cmd+P listed nothing for that project. Two
 * fields cannot split wrong.
 *
 * PHASE 99 PUT THE MACHINE INSIDE THE ROOT, and that is unchanged here. A
 * folder on this Mac keys as its own absolute path. A folder on another machine
 * keys as `machine:<machineId>:<path>`, so one relative path under one absolute
 * path on two computers is two entries rather than one.
 *
 * The stored rows are NOT touched by this. `load()` and `persist()` read and
 * write the same object array they have always written, so nobody's saved
 * recents move.
 */
export function recentKeys(): QuickOpenRecent[] {
  return entries.map((e) => ({
    root: rootKeyOf(targetOf(e)),
    relPath: e.relPath
  }));
}

/**
 * Record one open.
 *
 * `machineId` is omitted for a file on this Mac, which is every call before
 * Phase 99 and every call from a local surface after it.
 */
export function noteOpened(
  repoPath: string,
  relPath: string,
  machineId?: string
): void {
  const at = Date.now();
  const id = machineId === undefined ? LOCAL_MACHINE_ID : machineId;
  entries = [
    { repoPath, relPath, machineId: id, at },
    ...entries.filter(
      (e) =>
        !(
          e.repoPath === repoPath &&
          e.relPath === relPath &&
          e.machineId === id
        )
    )
  ].slice(0, MAX_RECENTS);
  persist();
}

let started = false;

/**
 * Start recording. Idempotent, called once from the palette's mount — the
 * palette is always mounted, so this is effectively app lifetime, but keeping
 * it a call rather than a module side effect keeps the module testable.
 */
export function startRecordingRecents(): () => void {
  if (started) return () => undefined;
  started = true;
  const off = onOpenFile((req) => {
    // A historical file is a view of the past, not a file you are working in;
    // recording it would put `<sha>` versions in tomorrow's empty palette.
    if (req.commit !== undefined) return;
    // PHASE 99 DELETED THE REFUSAL THAT STOOD HERE. Phase 90.3 dropped a file
    // on another machine, because quick open listed this Mac only and such an
    // entry could only ever match a DIFFERENT file that this Mac happens to
    // hold at the same path. Quick open lists that machine's own folder now,
    // and the key carries the machine, so the entry ranks the file it names
    // and nothing else.
    noteOpened(req.repoPath, req.relPath, req.remote?.machineId);
  });
  return () => {
    started = false;
    off();
  };
}
