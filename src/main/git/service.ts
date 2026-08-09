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
  GitLogEntryDetailed,
  GitStatusDetailed
} from '@shared/types';
import { gmuxError } from '../tmux/errors';
import { runGit, runGitOrThrow } from './exec';
import { LOG_FORMAT, parseLog, parsePorcelainV2Status } from './parse';

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
