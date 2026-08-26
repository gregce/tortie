/**
 * The glob checker, and the matcher every other checker borrows (Phase 63,
 * research 49 section 4.4).
 *
 * **It proves that every anchor matches at least one tracked file.** An anchor
 * that matches nothing is an absence rather than a divergence, because the
 * component may simply have been moved or deleted, and calling that a broken
 * promise would be a guess.
 *
 * ## Where the matching happens, and why that is the whole point
 *
 * In this process, against the output of one fixed argv `git ls-files -z`. An
 * anchor is a value out of a file that arrived with a `git pull`, so it never
 * becomes an argument to anything. Ripgrep's `-g` would have been the obvious
 * place to put it, and `buildListFilesArgs` in `../../search/files-args.ts`
 * takes exactly such a list. Nothing under `src/main/arch/` imports that module,
 * and `npm run conformance:arch` scans this directory for ripgrep tokens to
 * keep it that way.
 *
 * ## The matcher lives next door
 *
 * The pattern language and the scan that runs it are in `../glob-pattern.ts`,
 * because the format layer needs the same tokenizer to bound how expensive an
 * anchor may be. That module's header says why it is a scan rather than a
 * regular expression, and the measurement that made it one.
 *
 * This module keeps the compiled anchors of the run, so the freshness walk does
 * not recompile the same pattern once per commit per touched path.
 */

import type { ArchComponent } from '@shared/arch';
import {
  compileGlob,
  isPlainGlob,
  matchGlobTokens,
  type ArchGlobToken
} from '../glob-pattern';
import type { ArchCheckerResult, ArchCheckerVerdict, ArchFactBase } from './facts';

/**
 * The compiled anchors of the run, so the freshness walk does not recompile.
 *
 * `countCommitsBehind` asks about one anchor once per commit per touched path,
 * which is where the old build paid to rebuild its regular expression tens of
 * thousands of times. The map is cleared whole rather than evicted one entry at
 * a time, because the only thing it protects against is a contract with a great
 * many distinct anchors and clearing costs nothing.
 */
const COMPILED = new Map<string, ArchGlobToken[]>();
const COMPILED_MAX = 4096;

function compiled(glob: string): ArchGlobToken[] {
  const hit = COMPILED.get(glob);
  if (hit !== undefined) return hit;
  if (COMPILED.size >= COMPILED_MAX) COMPILED.clear();
  const tokens = compileGlob(glob);
  COMPILED.set(glob, tokens);
  return tokens;
}

/** Does one anchor name one path? The single path question, with no array built. */
export function globMatches(anchor: string, path: string): boolean {
  if (isPlainGlob(anchor)) {
    const prefix = anchor.endsWith('/') ? anchor : `${anchor}/`;
    return path === anchor || path.startsWith(prefix);
  }
  return matchGlobTokens(compiled(anchor), path);
}

/** Every tracked file one anchor names. */
export function matchAnchor(anchor: string, trackedFiles: readonly string[]): string[] {
  if (isPlainGlob(anchor)) {
    const prefix = anchor.endsWith('/') ? anchor : `${anchor}/`;
    return trackedFiles.filter((path) => path === anchor || path.startsWith(prefix));
  }
  const tokens = compiled(anchor);
  return trackedFiles.filter((path) => matchGlobTokens(tokens, path));
}

/** Every tracked file a whole component names, sorted and without repeats. */
export function componentFiles(
  component: ArchComponent,
  trackedFiles: readonly string[]
): string[] {
  const out = new Set<string>();
  for (const anchor of component.anchors) {
    for (const path of matchAnchor(anchor, trackedFiles)) out.add(path);
  }
  return [...out].sort();
}

/** Which component owns each tracked file, for the imports checker. */
export function fileOwners(
  components: readonly ArchComponent[],
  trackedFiles: readonly string[]
): Map<string, string[]> {
  const owners = new Map<string, string[]>();
  for (const component of components) {
    for (const path of componentFiles(component, trackedFiles)) {
      const list = owners.get(path);
      if (list === undefined) owners.set(path, [component.id]);
      else list.push(component.id);
    }
  }
  return owners;
}

/**
 * Run the glob checker.
 *
 * One verdict per anchor, so a component with five anchors and one dead one
 * says which one died rather than going amber as a whole.
 */
export function checkGlobs(facts: ArchFactBase): ArchCheckerResult {
  const started = Date.now();
  const verdicts: ArchCheckerVerdict[] = [];
  for (const component of facts.components) {
    if (component.anchors.length === 0) {
      verdicts.push({
        subjectId: `component:${component.id}`,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason:
          `${component.name} is a ${component.kind}, which lives outside the ` +
          `tree, so there is no file to check it against.`
      });
      continue;
    }
    component.anchors.forEach((anchor, index) => {
      const matched = matchAnchor(anchor, facts.trackedFiles);
      verdicts.push(
        matched.length > 0
          ? {
              subjectId: `component:${component.id}#anchor:${index}`,
              status: 'convergent',
              coverage: 'checked',
              reason: null
            }
          : {
              subjectId: `component:${component.id}#anchor:${index}`,
              status: 'absent',
              coverage: 'checked',
              reason:
                `${component.name} says it lives at "${anchor}", and no ` +
                `tracked file is there. It may have moved, or the pattern ` +
                `may have a typo.`
            }
      );
    });
  }
  return { checker: 'glob', verdicts, durationMs: Date.now() - started };
}
