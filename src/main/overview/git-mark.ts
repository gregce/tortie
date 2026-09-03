/**
 * The git corroboration mark (Phase 137, spec section 7.3).
 *
 * Beside each answer the page shows one fact. Either git agrees with what the
 * agent named, or git has no record of it, or the turn named nothing inside
 * the project and there is nothing to check. No model is involved. The mark
 * is a fact or it is absent.
 *
 * The candidates for one turn are the inside paths of the turn's path index
 * plus the path shaped strings in the agent's closing answer. Git is asked
 * twice per page open, once for the commit log since the oldest ask shown and
 * once for the working tree, through the existing service in
 * src/main/git/exec.ts. Research 62 measured the two reads at 73.0 ms and
 * 33.2 ms on this worktree. Research 62 also described a "what changed since
 * you last looked" zone, and that is NOT built here.
 */

import { isRenderableInstant } from '@shared/instant';
import type { OverviewGitMark } from '@shared/overview';
import { runGit } from '../git/exec';
import { extractPathsFromText, type PathMention } from './reader';

/** The leash on each git read. The two reads run once per page open. */
const GIT_TIMEOUT_MS = 5_000;

/** What git said about the project, read once per call. */
export interface GitEvidence {
  isGitRepo: boolean;
  /** Repository relative path to the epoch ms of the latest commit touching it. */
  committedAtMs: Map<string, number>;
  /** Repository relative paths changed in the working tree right now. */
  workingTree: Set<string>;
}

/** The evidence for a folder that is not a git repository. Every mark is then nothing-to-check. */
function noRepo(): GitEvidence {
  return { isGitRepo: false, committedAtMs: new Map(), workingTree: new Set() };
}

/**
 * `git log --since=<...> --name-only --format=%ct` prints one epoch seconds
 * line per commit and then the paths that commit touched. The map keeps the
 * latest commit time per path.
 */
function parseLog(text: string): Map<string, number> {
  const committedAtMs = new Map<string, number>();
  let atMs: number | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    if (/^\d+$/.test(trimmed)) {
      atMs = Number(trimmed) * 1000;
      continue;
    }
    if (atMs === null) continue;
    const known = committedAtMs.get(trimmed);
    if (known === undefined || atMs > known) committedAtMs.set(trimmed, atMs);
  }
  return committedAtMs;
}

/**
 * `git status --porcelain -z --untracked-files=all` prints NUL separated
 * entries of `XY <path>`. A rename or a copy is followed by one extra NUL
 * separated token holding the original path, and both paths count as changed.
 */
function parseStatus(text: string): Set<string> {
  const changed = new Set<string>();
  const tokens = text.split('\0');
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined || token.length < 4) continue;
    changed.add(token.slice(3));
    const x = token[0];
    if (x === 'R' || x === 'C') {
      const original = tokens[i + 1];
      if (original !== undefined && original !== '') changed.add(original);
      i += 1;
    }
  }
  return changed;
}

/**
 * Asks git the two questions the marks need, once per call. A folder that is
 * not a repository answers with empty evidence and `isGitRepo: false`. A git
 * read that fails answers with what the other read found, because a mark
 * built on partial evidence can only move from `agrees` to `no-record`, and
 * `no-record` is an honest answer.
 */
export async function readGitEvidence(
  projectPath: string,
  sinceMs: number
): Promise<GitEvidence> {
  const probe = await runGit(projectPath, ['rev-parse', '--is-inside-work-tree'], {
    timeoutMs: GIT_TIMEOUT_MS
  });
  if (probe.code !== 0) return noRepo();
  // PHASE 206. THE ONE OTHER EXPOSED CALLER, named by Phase 188.1 and left
  // unguarded there. `sinceMs` is `Math.min` over manifest `createdAt` values,
  // and `Math.min` propagates NaN, so ONE corrupt row took this whole
  // project's page down with `RangeError: Invalid time value` rather than
  // spoiling one session's mark. All six impossible values threw here at the
  // parent while the two boundary instants rendered.
  //
  // AN IMPOSSIBLE FLOOR IS READ AS A LOG THAT COULD NOT BE ASKED, which is a
  // shape this function already has: a git read that fails answers with what
  // the other read found, because a mark built on partial evidence can only
  // move from `agrees` to `no-record`, and `no-record` is an honest answer.
  // The alternatives are both worse. A clamp would invent a floor and could
  // widen the window until a commit nobody's turn touched read as agreement,
  // and dropping `--since` would walk the whole history of the repository on
  // the strength of a corrupt row. Nothing is guessed and nothing is written
  // back, which is Phase 188.1's own rule, and the check does NOT move into
  // `rowToRecord` for the reason Phase 188.1 gave and this phase did not
  // reverse.
  const since = isRenderableInstant(sinceMs) ? new Date(sinceMs).toISOString() : null;
  const [log, status] = await Promise.all([
    since === null
      ? Promise.resolve(null)
      : runGit(
          projectPath,
          ['log', `--since=${since}`, '--name-only', '--format=%ct'],
          { timeoutMs: GIT_TIMEOUT_MS }
        ),
    runGit(
      projectPath,
      ['status', '--porcelain', '-z', '--untracked-files=all'],
      { timeoutMs: GIT_TIMEOUT_MS }
    )
  ]);
  return {
    isGitRepo: true,
    committedAtMs: parseLog(
      log !== null && log.code === 0 ? log.stdout.toString('utf8') : ''
    ),
    workingTree: parseStatus(status.code === 0 ? status.stdout.toString('utf8') : '')
  };
}

/** One turn, as the mark needs it. The service builds this from store rows. */
export interface TurnMarkInput {
  /** The turn's stored path index. */
  paths: PathMention[];
  /** The redacted closing answer, or null when none is on record. */
  answerText: string | null;
  /** The ask's clock as epoch ms, or null when the provider keeps none. */
  askAtMs: number | null;
  /** The manifest createdAt, the comparison floor for a turn with no clock. */
  sessionCreatedAtMs: number;
  /** The session's working directory, for resolving relative path mentions. */
  cwd: string;
  projectPath: string;
}

export interface TurnMark {
  git: OverviewGitMark;
  namedOnlyOutside: boolean;
}

/**
 * One mark for one turn, from evidence already read. Pure apart from the text
 * scan, which is the same `extractPathsFromText` the path index uses.
 *
 * The rules, in order:
 * - the folder is not a git repository, or the turn named nothing inside the
 *   project, and the mark is `nothing-to-check`
 * - a candidate is in the working tree set, or its latest commit lands at or
 *   after the ask, and the mark is `agrees`
 * - otherwise the mark is `no-record`
 *
 * A turn with no ask clock compares against the session's createdAt. Commit
 * times carry whole seconds, so the comparison floor is rounded down to the
 * second and a commit inside the ask's own second still counts.
 */
export function markTurn(evidence: GitEvidence, turn: TurnMarkInput): TurnMark {
  const fromAnswer =
    turn.answerText === null
      ? []
      : extractPathsFromText(turn.answerText, turn.cwd, turn.projectPath);
  const named = [...turn.paths, ...fromAnswer];
  const inside = [...new Set(named.filter((m) => m.inside).map((m) => m.path))];
  const namedOnlyOutside = named.length > 0 && inside.length === 0;
  if (!evidence.isGitRepo || inside.length === 0) {
    return { git: 'nothing-to-check', namedOnlyOutside };
  }
  const fromMs = turn.askAtMs ?? turn.sessionCreatedAtMs;
  const floorMs = Math.floor(fromMs / 1000) * 1000;
  for (const path of inside) {
    if (evidence.workingTree.has(path)) {
      return { git: 'agrees', namedOnlyOutside };
    }
    const committed = evidence.committedAtMs.get(path);
    if (committed !== undefined && committed >= floorMs) {
      return { git: 'agrees', namedOnlyOutside };
    }
  }
  return { git: 'no-record', namedOnlyOutside };
}
