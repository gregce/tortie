/**
 * far-texts.mts. The SHIPPING far-side texts of Phase 336's folder-bound
 * writes, printed as one JSON line, for `build/p336/script-arms.mjs`
 * (`npm run probe:p336:script`) to run under `/bin/sh` and `/bin/dash` with
 * main bypassed (build/p336/SPEC.md §8.3).
 *
 * WHY A FILE RATHER THAN A COPY. A harness that carries its own copy of a
 * script text proves the copy. This one imports the catalogue
 * (`src/main/machines/remote-scripts.ts`) under the pinned tsx and prints the
 * text the product would send, byte for byte, so a later edit to the catalogue
 * is what the arms run the next time, with no step in between.
 *
 * IT SPAWNS NOTHING AND READS NOTHING BUT THE TREE. `remote-scripts.ts`
 * imports nothing at all (condition 40 of `conformance:machines` holds it
 * there), so loading it starts no ssh, no tmux and no Electron. It prints, for
 * every row of the catalogue, its id, mode, declared positional count, text
 * and, since Phase 336, `bound` (`'folder'` or `'machine'` on a write) and
 * `folderArg` (the 1-based positional the folder rides in on a folder-bound
 * write; the row carries it 0-based as an index into the argument list main
 * composes, and this file prints both so a reader never converts by hand).
 *
 * A module that will not load is printed as `loadError` with the reason,
 * never as an empty list: an empty list would read as "no scripts to run" and
 * every arm would pass by not being looked at.
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogue = join(repoRoot, 'src', 'main', 'machines', 'remote-scripts.ts');

interface Row {
  readonly id: string;
  readonly mode: string;
  readonly params: number;
  readonly text: string;
  readonly bound: string | null;
  /** The row's own field: an index into the argument list main composes (0-based). */
  readonly folderArgIndex: number | null;
  /** The same position as a shell positional, `$1` being 1. */
  readonly folderPositional: number | null;
}

let out: {
  readonly id: 'p336-far-texts';
  readonly marker: string | null;
  readonly empty: string | null;
  readonly scripts: readonly Row[];
  readonly loadError: string | null;
};

try {
  const mod = (await import(pathToFileURL(catalogue).href)) as Record<string, unknown>;
  const list = Array.isArray(mod['REMOTE_SCRIPTS']) ? (mod['REMOTE_SCRIPTS'] as Record<string, unknown>[]) : null;
  if (list === null) throw new Error('REMOTE_SCRIPTS is not an exported array');
  const scripts = list.map((row): Row => {
    const folderArg = typeof row['folderArg'] === 'number' ? (row['folderArg'] as number) : null;
    return {
      id: String(row['id']),
      mode: String(row['mode']),
      params: Number(row['params']),
      text: String(row['text']),
      bound: typeof row['bound'] === 'string' ? (row['bound'] as string) : null,
      folderArgIndex: folderArg,
      folderPositional: folderArg === null ? null : folderArg + 1
    };
  });
  out = {
    id: 'p336-far-texts',
    marker: typeof mod['REMOTE_SCRIPT_MARKER'] === 'string' ? (mod['REMOTE_SCRIPT_MARKER'] as string) : null,
    empty: typeof mod['REMOTE_SCRIPT_EMPTY'] === 'string' ? (mod['REMOTE_SCRIPT_EMPTY'] as string) : null,
    scripts,
    loadError: null
  };
} catch (err) {
  out = {
    id: 'p336-far-texts',
    marker: null,
    empty: null,
    scripts: [],
    loadError: err instanceof Error ? err.message.split('\n')[0] ?? String(err) : String(err)
  };
}

process.stdout.write(`${JSON.stringify(out)}\n`);
