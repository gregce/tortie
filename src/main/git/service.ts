/**
 * GitService — one instance per project (repo root), spawning the system
 * git CLI with cwd = the project path (research 06: the VS Code model).
 *
 * Reads never throw for "this just isn't a git repo": status() returns the
 * contract's clean `isRepo: false` state instead, so the sidebar can render
 * a friendly empty state. Mutations on a non-repo throw NOT_A_GIT_REPO.
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type {
  GitBranchInfo,
  GitCherryPickResult,
  GitCommitDetail,
  GitLogEntryDetailed,
  GitStatusDetailed
} from '@shared/types';
import { gmuxError } from '../tmux/errors';
import { runGit, runGitOrThrow } from './exec';
import {
  BRANCH_FORMAT,
  COMMIT_META_FORMAT,
  LOG_FORMAT,
  mergeCommitFiles,
  normalizeGitHubRemote,
  parseCommitMeta,
  parseForEachRefBranches,
  parseLog,
  parseNameStatusZ,
  parseNumstatZ,
  parsePorcelainV2Status
} from './parse';

const NOT_A_REPO_RE = /not a git repository/i;
const UNBORN_HEAD_RE =
  /(?:could not resolve|invalid object name|unknown revision|bad default revision|ambiguous argument) '?HEAD'?|does not have any commits yet/i;
const MISSING_AT_HEAD_RE =
  /(?:does not exist in|exists on disk, but not in) '?HEAD'?|invalid object name 'HEAD'|bad revision 'HEAD/i;

/** Longer leash for commits: hooks (lint, tests) run inside them. */
const COMMIT_TIMEOUT_MS = 300_000;
/** Pathspec batches stay far below ARG_MAX. */
const PATH_CHUNK = 500;

export class GitService {
  /** Absolute, resolved repo root this service operates on. */
  readonly repoPath: string;

  /** Cached `git rev-parse --absolute-git-dir` (worktree/submodule-safe). */
  private gitDirCache: string | null = null;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /** True when repoPath is inside a git worktree. */
  async isRepo(): Promise<boolean> {
    const r = await runGit(this.repoPath, [
      'rev-parse',
      '--is-inside-work-tree'
    ]);
    return r.code === 0 && r.stdout.toString('utf8').trim() === 'true';
  }

  /**
   * One call powers everything (research 06 §5): branch, upstream,
   * ahead/behind, and every file's XY state incl. rename info — grouped
   * VS Code-style into merge/staged/changes/untracked.
   */
  async status(): Promise<GitStatusDetailed> {
    const r = await runGit(this.repoPath, [
      'status',
      '--porcelain=v2',
      '--branch',
      '-z',
      '--untracked-files=all'
    ]);

    if (r.code !== 0) {
      if (NOT_A_REPO_RE.test(r.stderr)) return this.notARepoStatus();
      throw gmuxError(
        'GIT_FAILED',
        'Could not read git status.',
        r.stderr.trim() || undefined
      );
    }

    const parsed = parsePorcelainV2Status(r.stdout.toString('utf8'));
    const merging = parsed.hasConflicts || (await this.sequencerInProgress());

    return {
      repoPath: this.repoPath,
      ...(parsed.branch !== undefined ? { branch: parsed.branch } : {}),
      ...(parsed.detachedAt !== undefined
        ? { detachedAt: parsed.detachedAt }
        : {}),
      ...(parsed.upstream !== undefined ? { upstream: parsed.upstream } : {}),
      ahead: parsed.ahead,
      behind: parsed.behind,
      merging,
      files: parsed.files,
      groups: parsed.groups,
      isRepo: true,
      ...(parsed.truncated ? { truncated: true } : {})
    };
  }

  /** History for the sidebar: newest-first, default 200 (contract). */
  async log(maxCount = 200): Promise<GitLogEntryDetailed[]> {
    const r = await runGit(this.repoPath, [
      'log',
      '-z',
      `--max-count=${Math.max(1, Math.floor(maxCount))}`,
      `--format=${LOG_FORMAT}`
    ]);
    if (r.code !== 0) {
      // Empty repo (unborn HEAD) and not-a-repo both render as "no history".
      if (UNBORN_HEAD_RE.test(r.stderr) || NOT_A_REPO_RE.test(r.stderr)) {
        return [];
      }
      throw gmuxError(
        'GIT_FAILED',
        'Could not read git history.',
        r.stderr.trim() || undefined
      );
    }
    return parseLog(r.stdout.toString('utf8'));
  }

  /**
   * Contents of `path` at HEAD as raw bytes (binary-safe), or null when the
   * file did not exist at HEAD (new file, or unborn branch, or non-repo).
   */
  async showHeadBuffer(path: string): Promise<Buffer | null> {
    const rel = this.assertRelPath(path);
    const r = await runGit(this.repoPath, ['show', `HEAD:${rel}`]);
    if (r.code === 0) return r.stdout;
    if (
      MISSING_AT_HEAD_RE.test(r.stderr) ||
      UNBORN_HEAD_RE.test(r.stderr) ||
      NOT_A_REPO_RE.test(r.stderr)
    ) {
      return null;
    }
    throw gmuxError(
      'GIT_FAILED',
      'Could not read the file at HEAD.',
      r.stderr.trim() || undefined
    );
  }

  /** UTF-8 decode of showHeadBuffer (Monaco diff input). Missing → null. */
  async showHead(path: string): Promise<string | null> {
    const buf = await this.showHeadBuffer(path);
    return buf === null ? null : buf.toString('utf8');
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /** `git add` — stages modifications, deletions, and untracked files. */
  async stage(paths: string[]): Promise<void> {
    const specs = this.toPathspecs(paths);
    if (specs.length === 0) return;
    await this.assertIsRepo();
    for (const chunk of chunked(specs, PATH_CHUNK)) {
      await runGitOrThrow(
        this.repoPath,
        ['add', '-A', '--', ...chunk],
        'Could not stage the selected files.'
      );
    }
  }

  /**
   * `git restore --staged` — with a `git rm --cached` fallback on an unborn
   * branch (restore needs HEAD; a brand-new repo has none).
   */
  async unstage(paths: string[]): Promise<void> {
    const specs = this.toPathspecs(paths);
    if (specs.length === 0) return;
    await this.assertIsRepo();
    for (const chunk of chunked(specs, PATH_CHUNK)) {
      const r = await runGit(this.repoPath, [
        'restore',
        '--staged',
        '--',
        ...chunk
      ]);
      if (r.code === 0) continue;
      if (UNBORN_HEAD_RE.test(r.stderr)) {
        await runGitOrThrow(
          this.repoPath,
          ['rm', '--cached', '-r', '-q', '--', ...chunk],
          'Could not unstage the selected files.'
        );
        continue;
      }
      throw gmuxError(
        'GIT_FAILED',
        'Could not unstage the selected files.',
        r.stderr.trim() || undefined
      );
    }
  }

  /**
   * Discard worktree changes: untracked files are deleted, tracked files are
   * restored from the index (VS Code semantics). Paths already clean are
   * skipped silently — the desired end state is already true.
   */
  async discard(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await this.assertIsRepo();
    const status = await this.status();
    const byPath = new Map(status.files.map((f) => [f.path, f]));

    const toDelete: string[] = [];
    const toRestore: string[] = [];
    for (const p of paths) {
      const rel = this.assertRelPath(p);
      const entry = byPath.get(rel);
      if (entry === undefined) continue; // clean already
      if (entry.indexState === '?') toDelete.push(rel);
      else if (entry.worktreeState !== '.') toRestore.push(rel);
    }

    for (const rel of toDelete) {
      try {
        await rm(join(this.repoPath, rel), { force: true, recursive: true });
      } catch (err) {
        throw gmuxError(
          'GIT_FAILED',
          'Could not delete an untracked file.',
          `${rel}: ${(err as Error).message}`
        );
      }
    }
    for (const chunk of chunked(
      toRestore.map((p) => literalSpec(p)),
      PATH_CHUNK
    )) {
      await runGitOrThrow(
        this.repoPath,
        ['restore', '--', ...chunk],
        'Could not discard changes for the selected files.'
      );
    }
  }

  /**
   * Commit staged changes via `-F <tempfile>` so multi-line messages work
   * and the user's hooks + commit signing run exactly as on the CLI.
   * Resolves to the new commit hash.
   */
  async commit(message: string, amend = false): Promise<string> {
    if (message.trim().length === 0) {
      throw gmuxError('INVALID_INPUT', 'Commit message cannot be empty.');
    }
    await this.assertIsRepo();

    const msgFile = join(tmpdir(), `gmux-commit-${randomUUID()}.txt`);
    await writeFile(msgFile, message, 'utf8');
    try {
      const args = ['commit', '-F', msgFile, ...(amend ? ['--amend'] : [])];
      const r = await runGit(this.repoPath, args, {
        timeoutMs: COMMIT_TIMEOUT_MS
      });
      if (r.code !== 0) {
        const noise = (r.stderr + r.stdout.toString('utf8')).toLowerCase();
        if (noise.includes('nothing to commit')) {
          throw gmuxError(
            'GIT_FAILED',
            'There are no staged changes to commit.'
          );
        }
        // Hook rejections land here with the hook's own output as detail.
        throw gmuxError(
          'GIT_FAILED',
          'Commit failed.',
          (r.stderr.trim() || r.stdout.toString('utf8').trim()) || undefined
        );
      }
      const head = await runGitOrThrow(
        this.repoPath,
        ['rev-parse', 'HEAD'],
        'Commit succeeded but the new hash could not be read.'
      );
      return head.stdout.toString('utf8').trim();
    } finally {
      await unlink(msgFile).catch(() => undefined);
    }
  }

  // -------------------------------------------------------------------------
  // Git depth (dogfood round 1): branches, checkout, tags, cherry-pick,
  // commit detail, GitHub remote.
  // -------------------------------------------------------------------------

  /**
   * Local branches with current-branch marker, upstream, and ahead/behind —
   * one `for-each-ref` call. Non-repo and unborn-HEAD repos resolve to []
   * (friendly read, same discipline as log()).
   */
  async branches(): Promise<GitBranchInfo[]> {
    const r = await runGit(this.repoPath, [
      'for-each-ref',
      'refs/heads',
      `--format=${BRANCH_FORMAT}`
    ]);
    if (r.code !== 0) {
      if (NOT_A_REPO_RE.test(r.stderr)) return [];
      throw gmuxError(
        'GIT_FAILED',
        'Could not list branches.',
        r.stderr.trim() || undefined
      );
    }
    return parseForEachRefBranches(r.stdout.toString('utf8'));
  }

  /** Switch to a local branch (`git checkout <branch>`). */
  async checkout(branch: string): Promise<void> {
    const ref = this.assertSafeRef(branch);
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, ['checkout', '-q', ref, '--']);
    if (r.code !== 0) {
      throw gmuxError(
        'GIT_FAILED',
        `Could not switch to '${ref}'.`,
        r.stderr.trim() || undefined
      );
    }
  }

  /**
   * Create a branch AND switch to it (VS Code's "Create Branch…" semantics),
   * optionally from a start ref (commit context menu → Create Branch…).
   */
  async createBranch(name: string, fromRef?: string): Promise<void> {
    const branch = this.assertSafeRef(name);
    const from = fromRef !== undefined ? this.assertSafeRef(fromRef) : null;
    await this.assertIsRepo();
    const args = [
      'checkout',
      '-q',
      '-b',
      branch,
      ...(from !== null ? [from] : []),
      '--'
    ];
    const r = await runGit(this.repoPath, args);
    if (r.code !== 0) {
      throw gmuxError(
        'GIT_FAILED',
        `Could not create branch '${branch}'.`,
        r.stderr.trim() || undefined
      );
    }
  }

  /** Create a lightweight tag at `ref` (commit context menu → Create Tag…). */
  async createTag(name: string, ref: string): Promise<void> {
    const tag = this.assertSafeRef(name);
    const at = this.assertSafeRef(ref);
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, ['tag', tag, at]);
    if (r.code !== 0) {
      throw gmuxError(
        'GIT_FAILED',
        `Could not create tag '${tag}'.`,
        r.stderr.trim() || undefined
      );
    }
  }

  /**
   * Cherry-pick `sha` onto HEAD. Conflicts are a TYPED RESULT, not an
   * exception — and the repo is NEVER left mid-cherry-pick: any sequencer
   * state from a failed pick is aborted before this resolves. Other failures
   * (bad sha, empty commit, …) throw GIT_FAILED after the same cleanup.
   */
  async cherryPick(sha: string): Promise<GitCherryPickResult> {
    const ref = this.assertSha(sha);
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, ['cherry-pick', ref], {
      timeoutMs: COMMIT_TIMEOUT_MS
    });
    if (r.code === 0) {
      const head = await runGitOrThrow(
        this.repoPath,
        ['rev-parse', 'HEAD'],
        'Cherry-pick succeeded but the new hash could not be read.'
      );
      return { status: 'applied', sha: head.stdout.toString('utf8').trim() };
    }

    const stdout = r.stdout.toString('utf8');
    const detail = (r.stderr.trim() || stdout.trim()) || undefined;

    // Never leave the repo mid-cherry-pick: abort any sequencer state.
    let aborted = true;
    if (await this.sequencerInProgress()) {
      const ab = await runGit(this.repoPath, ['cherry-pick', '--abort']);
      aborted = ab.code === 0;
    }

    if (/conflict/i.test(r.stderr) || /conflict/i.test(stdout)) {
      return { status: 'conflict', aborted, ...(detail ? { detail } : {}) };
    }
    throw gmuxError('GIT_FAILED', 'Cherry-pick failed.', detail);
  }

  /**
   * Everything the rich hover card needs: author/email/ISO date, subject +
   * full body, per-file status letters, and insertions/deletions counts.
   * Merge commits show their diff against the FIRST parent (VS Code's view).
   */
  async commitDetail(sha: string): Promise<GitCommitDetail> {
    const ref = this.assertSha(sha);
    const meta = await runGit(this.repoPath, [
      'log',
      '-1',
      '-z',
      `--format=${COMMIT_META_FORMAT}`,
      ref,
      '--'
    ]);
    if (meta.code !== 0) {
      throw gmuxError(
        'GIT_FAILED',
        'Could not read the commit.',
        meta.stderr.trim() || undefined
      );
    }
    const parsed = parseCommitMeta(meta.stdout.toString('utf8'));
    if (parsed === null) {
      throw gmuxError('GIT_FAILED', 'Could not read the commit.', ref);
    }

    const showArgs = (mode: string): string[] => [
      'show',
      ref,
      '-z',
      mode,
      '--format=',
      '--diff-merges=first-parent',
      '--'
    ];
    const [nameStatus, numstat] = await Promise.all([
      runGitOrThrow(
        this.repoPath,
        showArgs('--name-status'),
        'Could not read the commit’s changed files.'
      ),
      runGitOrThrow(
        this.repoPath,
        showArgs('--numstat'),
        'Could not read the commit’s change counts.'
      )
    ]);

    const counts = parseNumstatZ(numstat.stdout.toString('utf8'));
    const files = mergeCommitFiles(
      parseNameStatusZ(nameStatus.stdout.toString('utf8')),
      counts
    );
    return {
      ...parsed,
      files,
      insertions: counts.insertions,
      deletions: counts.deletions
    };
  }

  /**
   * `https://github.com/owner/repo` when origin points at GitHub (ssh/scp/
   * git protocol forms normalized); null for non-GitHub remotes, no origin,
   * or not a repo — the caller hides "Open on GitHub".
   */
  async remoteUrl(): Promise<string | null> {
    const r = await runGit(this.repoPath, ['remote', 'get-url', 'origin']);
    if (r.code !== 0) return null;
    return normalizeGitHubRemote(r.stdout.toString('utf8').trim());
  }

  /** Check out a commit detached (commit context menu → Checkout (Detached)). */
  async checkoutDetached(sha: string): Promise<void> {
    const ref = this.assertSha(sha);
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, [
      'checkout',
      '-q',
      '--detach',
      ref,
      '--'
    ]);
    if (r.code !== 0) {
      throw gmuxError(
        'GIT_FAILED',
        `Could not check out ${ref.slice(0, 7)} (detached).`,
        r.stderr.trim() || undefined
      );
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * The real git dir (handles worktrees/submodules where `.git` is a file).
   * Null when not a repo. Cached after first success.
   */
  async resolveGitDir(): Promise<string | null> {
    if (this.gitDirCache !== null && existsSync(this.gitDirCache)) {
      return this.gitDirCache;
    }
    const r = await runGit(this.repoPath, ['rev-parse', '--absolute-git-dir']);
    if (r.code !== 0) return null;
    const dir = r.stdout.toString('utf8').trim();
    this.gitDirCache = dir.length > 0 ? dir : null;
    return this.gitDirCache;
  }

  /** Merge/rebase/cherry-pick/revert in progress? (state files in gitdir) */
  private async sequencerInProgress(): Promise<boolean> {
    const gitDir = await this.resolveGitDir();
    if (gitDir === null) return false;
    return (
      existsSync(join(gitDir, 'MERGE_HEAD')) ||
      existsSync(join(gitDir, 'CHERRY_PICK_HEAD')) ||
      existsSync(join(gitDir, 'REVERT_HEAD')) ||
      existsSync(join(gitDir, 'rebase-merge')) ||
      existsSync(join(gitDir, 'rebase-apply'))
    );
  }

  private notARepoStatus(): GitStatusDetailed {
    return {
      repoPath: this.repoPath,
      ahead: 0,
      behind: 0,
      merging: false,
      files: [],
      groups: { merge: [], staged: [], changes: [], untracked: [] },
      isRepo: false
    };
  }

  private async assertIsRepo(): Promise<void> {
    if (!(await this.isRepo())) {
      throw gmuxError(
        'NOT_A_GIT_REPO',
        'This folder is not a git repository.',
        this.repoPath
      );
    }
  }

  /**
   * Validate a ref/branch/tag name argument: non-empty, no leading `-`
   * (option injection), no whitespace or control characters. Git itself
   * remains the authority on full refname validity — this guard only keeps
   * user input from being read as flags.
   */
  private assertSafeRef(ref: string): string {
    const r = ref.trim();
    // eslint-disable-next-line no-control-regex
    if (r.length === 0 || r.startsWith('-') || /[\s\x00-\x1f\x7f]/.test(r)) {
      throw gmuxError('INVALID_INPUT', 'That is not a valid git name.', ref);
    }
    return r;
  }

  /** Validate a commit SHA argument (full or abbreviated hex). */
  private assertSha(sha: string): string {
    const s = sha.trim();
    if (!/^[0-9a-f]{4,40}$/i.test(s)) {
      throw gmuxError('INVALID_INPUT', 'That is not a valid commit id.', sha);
    }
    return s;
  }

  /** Validate a repo-relative path (no absolute paths, no `..` escapes). */
  private assertRelPath(path: string): string {
    const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
    if (
      normalized.length === 0 ||
      isAbsolute(normalized) ||
      normalized.split('/').includes('..')
    ) {
      throw gmuxError(
        'INVALID_INPUT',
        'Paths must be relative to the repository root.',
        path
      );
    }
    return normalized;
  }

  /** Literal pathspecs so `*`/`[` in filenames never glob. */
  private toPathspecs(paths: string[]): string[] {
    return paths.map((p) => literalSpec(this.assertRelPath(p)));
  }
}

function literalSpec(relPath: string): string {
  return `:(literal)${relPath}`;
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
