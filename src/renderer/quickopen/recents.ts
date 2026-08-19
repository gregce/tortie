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
 */

import { onOpenFile } from '../state/open-file';

/** Kept small on purpose: nobody scrolls back fifty files, and the whole list
 * is sent to the ranking worker whenever it changes. */
const MAX_RECENTS = 50;

const STORAGE_KEY = 'gmux.quickopen.recents';

export interface RecentFile {
  repoPath: string;
  relPath: string;
  /** `Date.now()` of the most recent open. */
  at: number;
}

let entries: RecentFile[] = load();

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
 * The worker's tiebreaker key: `${repoPath} ${relPath}`. A space is safe as
 * the separator because an absolute POSIX path cannot end in one and the
 * worker splits on the FIRST space, so a path containing spaces still
 * round-trips.
 */
export function recentKeys(): string[] {
  return entries.map((e) => `${e.repoPath} ${e.relPath}`);
}

export function noteOpened(repoPath: string, relPath: string): void {
  const at = Date.now();
  entries = [
    { repoPath, relPath, at },
    ...entries.filter((e) => !(e.repoPath === repoPath && e.relPath === relPath))
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
    // PHASE 90.3. A file on another machine is refused for a stronger reason.
    // Its `repoPath` is a path on THAT computer, and this record is read back
    // as a rank tiebreaker over paths quick open listed on this Mac. Quick open
    // cannot list a path from over there, because `rootsFor` in ./store.ts drops
    // every project that is not on this Mac, so such an entry could only ever
    // match a DIFFERENT file that this Mac happens to hold at the same path.
    // The guard is here as well as there, because the two answers must agree
    // and this bus carries every open gesture in the app.
    if (req.remote !== undefined) return;
    noteOpened(req.repoPath, req.relPath);
  });
  return () => {
    started = false;
    off();
  };
}
