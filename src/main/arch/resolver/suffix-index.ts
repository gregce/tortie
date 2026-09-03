/**
 * Every tracked path keyed by every one of its slash suffixes, built once per
 * scan and shared by the two arms that resolve a header by its tail.
 *
 * WHY IT IS ITS OWN MODULE. The Objective-C arm (Phase 180) and the C family
 * arm (Phase 184) both need exactly this map and nothing else about it
 * differs, so Phase 184 arrived with the eighteen lines written out a second
 * time. CLAUDE.md's growth guardrail asks for that scan after parallel work
 * and this is where the block went. IT CHANGES NO ANSWER: the map both arms
 * used to build privately is the map this one builds, and the WeakMap is now
 * one rather than two, so a repository that holds both an `.m` and a `.c` pays
 * for the index once.
 *
 * WHAT IT IS FOR, in the arms' own words: Xcode's header maps and a C
 * compiler's include path both make a header reachable by a name shorter than
 * its path, so `#include "util.h"` has to be findable from anywhere in the
 * tree. A suffix two files share is reported as such, so the caller can answer
 * `unresolved` rather than pick one. libgit2 has 592 quoted includes, 14
 * percent of them, whose tail matches more than one tracked file.
 *
 * NOTHING HERE SPAWNS ANYTHING. It reads the caller's file list and builds a
 * map. No path reaches an argv.
 */

import type { ArchResolveContext } from './index';

const SUFFIX_INDEX = new WeakMap<ArchResolveContext, Map<string, string[]>>();

/** The paths whose tail is this suffix, or an empty list. */
export function trackedSuffixIndex(
  ctx: ArchResolveContext
): Map<string, string[]> {
  const cached = SUFFIX_INDEX.get(ctx);
  if (cached !== undefined) return cached;
  const index = new Map<string, string[]>();
  for (const path of ctx.files) {
    let cut = path.indexOf('/');
    while (cut !== -1) {
      const suffix = path.slice(cut + 1);
      const held = index.get(suffix);
      if (held === undefined) index.set(suffix, [path]);
      else held.push(path);
      cut = path.indexOf('/', cut + 1);
    }
  }
  SUFFIX_INDEX.set(ctx, index);
  return index;
}
