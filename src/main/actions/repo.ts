/**
 * The four small git reads the Runs section needs (Phase 46).
 *
 * They are here rather than in service.ts because they are one
 * responsibility and it is not the service's: answering "which GitHub
 * repository is this, which branch is checked out, and where do HEAD and the
 * remote tracking ref point". Everything goes through `runGit`, the existing
 * process runner in src/main/git, so nothing about how git is spawned is
 * written twice. This phase adds no file to src/main/git and changes none.
 *
 * Every read is short, read only, and answers null rather than throwing.
 */

import { normalizeGitHubRemote, runGit } from '../git';

/** These are single ref reads. Two seconds is already generous. */
const GIT_TIMEOUT_MS = 5_000;

async function readLine(
  repoPath: string,
  args: string[]
): Promise<string | null> {
  try {
    const result = await runGit(repoPath, args, { timeoutMs: GIT_TIMEOUT_MS });
    if (result.code !== 0) return null;
    const text = result.stdout.toString('utf8').trim();
    return text.length > 0 ? text : null;
  } catch {
    // runGit rejects only for a spawn failure or a timeout. Neither is worth
    // an error state here: the panel simply has no answer for this read.
    return null;
  }
}

/**
 * `owner/repo` when origin points at github.com, null otherwise.
 *
 * The normalization is `normalizeGitHubRemote`, the same function behind
 * `git:remoteUrl`, so main and the renderer's render gate cannot disagree
 * about whether a repository is on GitHub.
 */
export async function readOwnerRepo(repoPath: string): Promise<string | null> {
  const url = await readLine(repoPath, ['remote', 'get-url', 'origin']);
  if (url === null) return null;
  const normalized = normalizeGitHubRemote(url);
  if (normalized === null) return null;
  return normalized.slice('https://github.com/'.length);
}

/** The checked out branch, or null on a detached HEAD. */
export function readBranch(repoPath: string): Promise<string | null> {
  return readLine(repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
}

/** The commit HEAD points at. */
export function readHeadSha(repoPath: string): Promise<string | null> {
  return readLine(repoPath, ['rev-parse', 'HEAD']);
}

/**
 * The commit the remote tracking ref points at, or null when the branch has
 * no upstream. This is the sha a push moves, and it is the same read for a
 * push made in Tortie and a push made in a terminal.
 */
export function readUpstreamSha(repoPath: string): Promise<string | null> {
  return readLine(repoPath, [
    'rev-parse',
    '--verify',
    '--quiet',
    '@{upstream}'
  ]);
}
