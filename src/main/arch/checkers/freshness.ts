/**
 * The freshness checker (Phase 63, research 49 section 4.4 and fix 13).
 *
 * **It says how far the code has moved since the contract last described it**,
 * per component, in two numbers a person can act on: the commits that touched
 * this part since its own contract file last changed, and the files under it
 * that are changed and not committed right now.
 *
 * ## Why the second number exists, and it is not a nicety
 *
 * Agents work uncommitted for hours. A freshness sentence built from commits
 * alone reads "0 behind" in the middle of a two hundred file rewrite, which is
 * the exact moment a person most needs to be told the map is behind. So one
 * `git status --porcelain -z` joins the pass and the sentence carries "and N
 * files changed uncommitted under this part".
 *
 * ## Why one stream rather than one call per anchor
 *
 * The counting is done in this process over one `git log --format=%H
 * --name-only --no-renames -z` stream, bucketed by anchor. The per anchor
 * `git rev-list` form was rejected because its cost scales with the history
 * walked, and it blows the budget on exactly the stale repositories the
 * freshness ribbon exists to catch.
 *
 * ## Freshness is never a verdict about the code
 *
 * A stale part is not a broken promise. It is a part whose description may have
 * stopped being true, and only a person can say. So the rows this checker emits
 * carry coverage `unverifiable` with the sentence, never `divergent`, and
 * nothing about a freshness number ever starts an agent.
 */

import { ARCH_DIR, type ArchComponent } from '@shared/arch';
import type { ArchUncommitted } from '../git-facts';
import type { ArchCommitTouch } from '../git-facts';
import type { ArchCheckerResult, ArchCheckerVerdict, ArchFactBase } from './facts';
import { componentFiles, globMatches } from './glob';

/** How stale one part is, in the two numbers the ribbon draws. */
export interface ArchFreshnessCount {
  componentId: string;
  commitsBehind: number;
  uncommittedFiles: number;
}

/**
 * The commits that landed AFTER the contract was last written.
 *
 * `git log` hands its commits back newest first, so the point the contract was
 * written at is the first commit in that list that touched anything under
 * `docs/arch/`, and everything before it in the list landed since.
 *
 * THE CASE THAT MATTERS MOST IS THE ONE WITH NO SUCH COMMIT, and it is the
 * common case rather than the exotic one. A person who has just drafted a
 * contract has not committed it yet, so no commit in the whole history touches
 * `docs/arch/`. The walk then reaches the end of the list having found no
 * boundary, and the answer is that NOTHING has landed since the contract was
 * written, because it was written after HEAD. An empty list is returned for
 * that, and it is returned deliberately.
 *
 * The second fix of this function is the reason that paragraph is here. The
 * first fix found the boundary correctly and still fell out of the bottom of
 * the loop returning every commit it had walked, so a repository with no
 * committed contract, which is every repository on the day the contract is
 * drafted, got the whole history back exactly as before. Measured on this
 * repository on 2026-08-26: 530 commits walked, 0 of them touching
 * `docs/arch/`, and 530 handed back.
 *
 * WHY THE COUNTING IS DONE HERE RATHER THAN BY GIT. Asking git for the commit
 * one contract file last changed at means putting that file's path on a git
 * command line, and the name of a file inside `docs/arch/` is chosen by
 * whoever last pushed. `../argv-guard.ts` exists to make that impossible. So
 * the whole history is walked once with a fixed argv and bucketed in this
 * process, which is also why the walk carries no range: there is no value the
 * guard would let us put there.
 *
 * The first build of this feature took a range from a field nothing ever set,
 * so the walk was always the whole history AND the truncation never happened,
 * and every component reported every commit that had ever touched it as a
 * commit that landed since the contract was written. That read "168 commits
 * have landed under the main process since this was written" at `aa1d801`, and
 * "169" at this worktree's tip, about a contract written two minutes earlier.
 * Both numbers are the whole history of that directory rather than a staleness:
 * `git rev-list --count HEAD -- src/main` prints the same number.
 */
export function commitsSinceContract(
  commits: readonly ArchCommitTouch[]
): ArchCommitTouch[] {
  const prefix = `${ARCH_DIR}/`;
  const out: ArchCommitTouch[] = [];
  for (const commit of commits) {
    if (commit.paths.some((path) => path === ARCH_DIR || path.startsWith(prefix))) {
      return out;
    }
    out.push(commit);
  }
  // THE WALK FOUND NO BOUNDARY, so the contract has never been committed and
  // nothing in this history landed after it was written. Returning `out` here
  // would hand back every commit the walk collected, which is the whole
  // history, and that is the defect this line exists to close.
  return [];
}

/**
 * Count the commits that touched each part since a given point.
 *
 * A commit counts once for a part however many of that part's files it touched,
 * because the question is how much has happened here and not how large each
 * change was.
 */
export function countCommitsBehind(
  components: readonly ArchComponent[],
  trackedFiles: readonly string[],
  commits: readonly ArchCommitTouch[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const component of components) {
    const owned = new Set(componentFiles(component, trackedFiles));
    let count = 0;
    for (const commit of commits) {
      const touched = commit.paths.some(
        (path) =>
          owned.has(path) ||
          component.anchors.some((anchor) => globMatches(anchor, path))
      );
      if (touched) count += 1;
    }
    out.set(component.id, count);
  }
  return out;
}

/**
 * Count the files under each part that are changed and not committed.
 *
 * A path that no tracked file list knows about is still counted, because a new
 * file an agent has just written is exactly the case this number exists for and
 * it is not tracked yet.
 */
export function countUncommitted(
  components: readonly ArchComponent[],
  changed: readonly ArchUncommitted[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const component of components) {
    let count = 0;
    for (const entry of changed) {
      const hit = component.anchors.some((anchor) =>
        globMatches(anchor, entry.path)
      );
      if (hit) count += 1;
    }
    out.set(component.id, count);
  }
  return out;
}

/** The sentence a person reads under a part. */
export function freshnessSentence(
  name: string,
  commitsBehind: number,
  uncommittedFiles: number
): string {
  const commits =
    commitsBehind === 0
      ? `Nothing has landed under ${name} since this was written`
      : `${commitsBehind} ${commitsBehind === 1 ? 'commit has' : 'commits have'} ` +
        `landed under ${name} since this was written`;
  const uncommitted =
    uncommittedFiles === 0
      ? ''
      : `, and ${uncommittedFiles} ${uncommittedFiles === 1 ? 'file is' : 'files are'} ` +
        `changed and not committed under it right now`;
  return `${commits}${uncommitted}.`;
}

/** Run the freshness checker. It judges nothing and it reports everything. */
export function checkFreshness(facts: ArchFactBase): ArchCheckerResult {
  const started = Date.now();
  const verdicts: ArchCheckerVerdict[] = [];
  for (const component of facts.components) {
    const behind = facts.commitsBehind.get(component.id) ?? 0;
    const uncommitted = facts.uncommittedFiles.get(component.id) ?? 0;
    verdicts.push({
      subjectId: `component:${component.id}#freshness`,
      status: 'unverifiable',
      coverage: 'unverifiable',
      reason: freshnessSentence(component.name, behind, uncommitted)
    });
  }
  return { checker: 'freshness', verdicts, durationMs: Date.now() - started };
}
