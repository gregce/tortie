/**
 * The bounded manifest walk two Phase 180 readers share.
 *
 * `./manifest.ts` already walks the tree once for nested `package.json` files
 * (Phase 178). The Kotlin and Objective-C readers need the same walk for
 * `build.gradle*`, `libs.versions.toml` and `Podfile`, and writing the loop a
 * third time is the duplication the growth guardrail forbids, so the loop
 * lives here and each reader keeps only its own predicate.
 *
 * SAME SAFETY SHAPE AS PHASE 178'S WALK. Breadth first so files near the root
 * win the bounds, symlinked directories are never entered, and the walk skips
 * the directories that are build output rather than source, because a Gradle
 * `build/` tree or a CocoaPods `Pods/` tree can be enormous and holds no
 * manifest anybody wrote. A file past the bounds is simply not read, which
 * errs grey. Nothing here spawns anything.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Directories the walk never enters. Output and vendor trees, not source. */
const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', '.gradle', 'build', '.build', 'Pods',
  'DerivedData', 'target', 'dist', 'out'
]);

/** How many directories the walk will enter before it stops. */
const MAX_WALK_DIRS = 4096;

/** How many matching files the walk will return. */
const MAX_WALK_FILES = 64;

/**
 * Every file under the repository the predicate wants, repository relative,
 * breadth first, bounded.
 */
export function walkForFiles(
  repoPath: string,
  wanted: (name: string, relPath: string) => boolean
): string[] {
  const out: string[] = [];
  const queue: string[] = [''];
  let visited = 0;
  while (queue.length > 0) {
    const dir = queue.shift();
    if (dir === undefined) break;
    visited += 1;
    if (visited > MAX_WALK_DIRS) break;
    let entries;
    try {
      entries = readdirSync(join(repoPath, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const name = entry.name;
      const relPath = dir === '' ? name : `${dir}/${name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(name)) queue.push(relPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (out.length >= MAX_WALK_FILES) continue;
      if (wanted(name, relPath)) out.push(relPath);
    }
  }
  return out;
}
