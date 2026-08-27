/**
 * The path and file reading pieces every resolver arm needs (Phase 157).
 *
 * WHY THIS MODULE EXISTS. Phase 157 added three language arms in parallel and
 * each one arrived carrying its own copy of the same four helpers. The
 * duplicate scan over `src/main/arch/resolver/` found `readTextOrNull` written
 * three times, `normalizeRel` written twice, a directory glob expander written
 * twice at ten identical lines, and a parent directory helper written three
 * times. CLAUDE.md's growth guardrail asks for exactly that scan after parallel
 * work, and this is where those blocks went.
 *
 * WHY IT IS A LEAF AND HAS TO STAY ONE. `./manifest.ts` calls into
 * `./pyproject.ts` and `./gemfile.ts` to build the one manifest shape, so those
 * two cannot import back out of it without making a runtime cycle that
 * `npm run typecheck` refuses through build/assert-no-runtime-cycles.mjs. Both
 * of them wrote `normalizeRel` out again for that reason and said so in a
 * comment. This module imports nothing but `node:fs`, so every one of them can
 * reach it and the cycle never forms. **Never import another resolver module
 * from here.**
 *
 * NOTHING HERE SPAWNS ANYTHING. It reads text off disk and joins strings.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * How large a file this module will read.
 *
 * A package manifest is a few kilobytes. Anything enormous wearing the name
 * `Cargo.toml` or `pyproject.toml` is not one, and reading it would be the only
 * unbounded read in this feature. The Python builder's reader carried this cap
 * and the other two did not; the cap is kept, because it is the safe half.
 */
const MAX_MANIFEST_BYTES = 4_000_000;

/**
 * A repository relative path in one shape: forward slashes, no `.`, no empty
 * segment, and every `..` applied.
 *
 * IT SILENTLY DROPS A `..` IT CANNOT HONOUR, so `../../x` from the root becomes
 * `x`. That is right for a manifest value, which is written relative to the
 * repository and cannot legally escape it, and it is WRONG for an import
 * specifier, which can. Both the Python and the Ruby arms count their own dots
 * by hand for that reason and say so on their faces. Read those before reaching
 * for this on a specifier.
 */
export function normalizeRel(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('\\').join('/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}

/** The directory a path sits in, or the empty string when it sits at the root. */
export function parentOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? '' : path.slice(0, cut);
}

/** `dir` and `name` joined, with no leading slash when the directory is the root. */
export function joinRel(dir: string, name: string): string {
  return dir === '' ? name : `${dir}/${name}`;
}

/**
 * One file's text, or null when it is absent, unreadable or absurdly large.
 *
 * Every manifest reader in this directory goes through here, so "the file was
 * not there" and "the file could not be read" produce the same empty answer at
 * one place rather than at three.
 */
export function readTextOrNull(path: string): string | null {
  try {
    if (statSync(path).size > MAX_MANIFEST_BYTES) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * One workspace or members glob to the directories it names.
 *
 * Only the two shapes that actually appear in package manifests are handled: a
 * literal directory, and one trailing `*` segment. Anything more is left to the
 * directory read finding nothing, which costs those packages their first party
 * classification and nothing else.
 *
 * npm's `workspaces` and Cargo's `[workspace] members` are the same two shapes
 * and had the same ten lines written twice. They are one function now.
 */
export function expandDirGlob(repoPath: string, glob: string): string[] {
  const clean = normalizeRel(glob);
  if (clean === '') return [];
  if (!clean.includes('*')) return [clean];
  const star = clean.indexOf('*');
  const parent = normalizeRel(clean.slice(0, star));
  let names: string[];
  try {
    names = readdirSync(join(repoPath, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  return names.map((name) => joinRel(parent, name));
}
