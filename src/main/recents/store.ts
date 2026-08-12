/**
 * Recent projects, kept in a plain JSON file at `<userData>/recents.json`.
 *
 * WHY A FILE AND NOT THE MANIFEST (research 35 section 4.2). The manifest at
 * `<userData>/gmux/manifest.db` holds session restore state, which is the one
 * thing Tortie promises never to lose. A recents list is disposable. Losing it
 * costs the user one trip to Finder. Putting it in the manifest would mean a
 * migration, a new table and a new failure mode inside the file that must
 * never break, so the risk would run the wrong way. The precedent for this
 * shape is `src/main/settings/store.ts`, which is the same atomic write and
 * rename over one small JSON file.
 *
 * WHY MAIN OWNS IT AND NOT localStorage. Main builds the native
 * `File > Open Recent` menu, and main cannot read localStorage. That is the
 * whole reason. An earlier draft said localStorage dies with a userData reset
 * that the manifest survives, and that is wrong. Both live under the same
 * userData directory and both die together.
 *
 * WHAT IS DELIBERATELY NOT HERE. No session count, no status, no last-opened
 * time on the row and no repository facts. The home screen shows a name and a
 * parent path, and research 35 section 5.1 records why the rest was cut.
 *
 * Ownership: src/main/recents/**.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { app } from 'electron';
import type { RecentProject } from '@shared/ipc';
import type { Project } from '@shared/types';

/**
 * How many rows the file keeps. The home screen shows 5 and the native menu
 * shows 10, so 20 is headroom for both plus the entries a user removes one at
 * a time. Older rows are dropped on write, which is the only pruning there is.
 */
export const RECENTS_FILE_MAX = 20;

/** Longest name kept from a file on disk, so a hand-edited row cannot bloat. */
const MAX_NAME_LENGTH = 200;

// ---------------------------------------------------------------------------
// The list algebra, pure and exported for tests
// ---------------------------------------------------------------------------

interface RecentsFile {
  version: 1;
  recents: RecentProject[];
}

/**
 * Coerce arbitrary parsed JSON into a valid list: absolute paths only, one row
 * per path, a usable name on every row, newest first, capped.
 *
 * A file that does not parse and a file full of nonsense reach the same place,
 * which is an empty list. Losing recents costs nothing, so there is no repair
 * path and no error surfaced to the user.
 */
export function sanitizeRecents(raw: unknown): RecentProject[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)['recents']
      : null;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: RecentProject[] = [];
  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    const path = entry['path'];
    if (typeof path !== 'string' || !isAbsolute(path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    const rawName = entry['name'];
    const name =
      typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim().slice(0, MAX_NAME_LENGTH)
        : basename(path);
    const at = entry['lastOpenedAt'];
    const lastOpenedAt = typeof at === 'number' && Number.isFinite(at) ? at : 0;
    out.push({ path, name, lastOpenedAt });
  }
  out.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  return out.slice(0, RECENTS_FILE_MAX);
}

/**
 * `list` with `entry` at the front, any older row for the same path gone, and
 * the tail cut to the cap. Pure.
 */
export function withRecent(
  list: readonly RecentProject[],
  entry: RecentProject
): RecentProject[] {
  return [entry, ...list.filter((r) => r.path !== entry.path)].slice(
    0,
    RECENTS_FILE_MAX
  );
}

/** `list` with the row for `path` gone. Pure. */
export function withoutRecent(
  list: readonly RecentProject[],
  path: string
): RecentProject[] {
  return list.filter((r) => r.path !== path);
}

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

function recentsPath(): string {
  return join(app.getPath('userData'), 'recents.json');
}

let cached: RecentProject[] | null = null;

function load(): RecentProject[] {
  if (cached !== null) return cached;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(recentsPath(), 'utf8'));
  } catch {
    // Missing on a first launch, and corrupt is treated the same way. Neither
    // is worth a word to the user.
  }
  cached = sanitizeRecents(parsed);
  return cached;
}

function persist(next: RecentProject[]): void {
  cached = next;
  const file: RecentsFile = { version: 1, recents: next };
  try {
    const path = recentsPath();
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    renameSync(tmp, path); // atomic on the same volume
  } catch (err) {
    // A recents write must never be the reason an open or a close fails. The
    // in-memory list stays live for this run.
    console.warn(
      `[gmux] could not persist recent projects: ${(err as Error).message}`
    );
  }
  for (const listener of listeners) listener(next);
}

type RecentsListener = (recents: RecentProject[]) => void;
const listeners = new Set<RecentsListener>();

/**
 * Main-side change subscription. The IPC registrar uses it to broadcast
 * `recents:changed`, and the menu builder uses it to rebuild `Open Recent`.
 * Returns an unsubscribe.
 */
export function onRecentsChanged(listener: RecentsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Reads and writes
// ---------------------------------------------------------------------------

/** Every remembered project, newest first, at most `RECENTS_FILE_MAX`. */
export function listRecents(): RecentProject[] {
  return [...load()];
}

/**
 * Record that the user opened or closed this project, which moves it to the
 * front of the list.
 *
 * BOTH EVENTS CALL THIS ONE FUNCTION. An open and a close mean the same thing
 * to a recents list, which is that the user was just here. Writing on close as
 * well as on open is what makes the row appear the moment the last project is
 * closed and the home screen comes back.
 *
 * Takes the project rather than a bare path so the row carries the manifest's
 * name, which is what a rename edits. Accepts `undefined` so a call site that
 * looked up a project that had already gone stays a single line and can never
 * throw.
 */
export function rememberProject(project: Project | undefined): void {
  if (project === undefined) return;
  if (typeof project.path !== 'string' || !isAbsolute(project.path)) return;
  const name =
    project.name.trim().length > 0
      ? project.name.trim().slice(0, MAX_NAME_LENGTH)
      : basename(project.path);
  persist(
    withRecent(load(), { path: project.path, name, lastOpenedAt: Date.now() })
  );
}

/** Remove from Recent, on one row. Resolves to the list that is left. */
export function removeRecent(path: string): RecentProject[] {
  const next = withoutRecent(load(), path);
  if (next.length !== load().length) persist(next);
  return [...next];
}

/** The native menu's Clear Menu convention. Empties the list. */
export function clearRecents(): RecentProject[] {
  if (load().length > 0) persist([]);
  return [];
}

/**
 * The paths whose folder is no longer there, checked one stat per row.
 *
 * The home screen calls this AFTER its first paint and never before it, so the
 * screen never waits on the filesystem. A missing folder only ever ADDS a
 * treatment to a row that is already drawn, and the warning slot is reserved
 * on every row, so nothing reflows when the answer arrives.
 *
 * A row is missing when the path is gone AND when it is now a file rather than
 * a directory. Both mean the same thing to the user, which is that Tortie
 * cannot open it.
 */
export async function missingRecents(): Promise<string[]> {
  const rows = load();
  const checks = await Promise.all(
    rows.map(async (row) => {
      try {
        return (await stat(row.path)).isDirectory() ? null : row.path;
      } catch {
        return row.path;
      }
    })
  );
  return checks.filter((p): p is string => p !== null);
}

/** Drop the in-memory copy so the next read comes off disk. Tests only. */
export function resetRecentsCacheForTests(): void {
  cached = null;
}
