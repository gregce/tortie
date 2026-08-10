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
import { rm, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type {
  GitBranchInfo,
  GitCherryPickResult,
  GitCommitDetail,
  GitCommitFileDiff,
  GitCommitFileDiffInput,
  GitDeleteBranchResult,
  GitLogEntryDetailed,
  GitPullResult,
  GitPushInput,
  GitPushResult,
  GitRemoteBranchesResult,
  GitRemoteInfo,
  GitRemotesResult,
  GitStatusDetailed,
  GitSyncResult
} from '@shared/types';
import { gmuxError } from '../tmux/errors';
import { runGit, runGitOrThrow } from './exec';
import {
  BRANCH_FORMAT,
  COMMIT_META_FORMAT,
  LOG_FORMAT,
  REMOTE_BRANCH_FORMAT,
  mergeCommitFiles,
  normalizeGitHubRemote,
  parseCommitMeta,
  parseForEachRefBranches,
  parseForEachRefRemoteBranches,
  parseLog,
  parseNameStatusZ,
  parseNumstatZ,
  parsePorcelainV2Status,
  parseRemoteVerbose,
  remoteOfUpstream
} from './parse';

const NOT_A_REPO_RE = /not a git repository/i;
const UNBORN_HEAD_RE =
  /(?:could not resolve|invalid object name|unknown revision|bad default revision|ambiguous argument) '?HEAD'?|does not have any commits yet/i;
/**
 * "That path is not in that revision" — rev-AGNOSTIC (Phase 12 item 4). The
 * round-0 regex required a literal `HEAD` after "does not exist in", so
 * `fatal: path 'x' does not exist in '<sha>'` fell through and threw instead
 * of resolving null. Every caller validates the revision separately (see
 * resolveCommit), so a genuinely bad rev is still an error, never a null side.
 */
const MISSING_IN_REV_RE =
  /does not exist in|exists on disk, but not in|invalid object name|unknown revision|bad revision|does not exist \(neither on disk nor in the index\)/i;

/** Longer leash for commits: hooks (lint, tests) run inside them. */
const COMMIT_TIMEOUT_MS = 300_000;
/** Longer leash for fetch: it talks to the network (never interactive). */
const FETCH_TIMEOUT_MS = 120_000;
/** Pathspec batches stay far below ARG_MAX. */
const PATH_CHUNK = 500;
/** git's own binary heuristic: a NUL byte in the first 8000 bytes. */
const BINARY_SNIFF_BYTES = 8000;

// --- remote-operation failure classification (push / pull / fetch) ---------
// Every one of these surfaces as a REAL message; nothing about a network or
// credential failure is ever swallowed (BACKLOG 12 item 3).

/** Unambiguous credential failures — git names them outright. */
const AUTH_FAILURE_RE =
  /could not read (username|password)|authentication failed|permission denied \(publickey\)|terminal prompts disabled|invalid username or password|403 forbidden|401 unauthorized|access denied|support for password authentication was removed/i;
/**
 * The catch-all git prints under BOTH a credential failure and a bad URL, so
 * it is only consulted after NO_REMOTE_REPO_RE has had its say — otherwise a
 * typo'd path reads as "authenticate", which sends the user hunting for the
 * wrong problem.
 */
const AUTH_MAYBE_RE = /could not read from remote repository/i;
const NETWORK_FAILURE_RE =
  /could not resolve host|connection refused|connection timed out|network is unreachable|operation timed out|failed to connect|temporary failure in name resolution|ssl|proxy/i;
const NON_FAST_FORWARD_RE =
  /non-fast-forward|updates were rejected|fetch first|behind its remote counterpart|\[rejected\]/i;
const DIVERGED_RE =
  /need to specify how to reconcile divergent branches|divergent branches|not possible to fast-forward/i;
const DIRTY_TREE_RE =
  /cannot pull with rebase|you have unstaged changes|local changes to the following files would be overwritten|please commit your changes or stash them/i;
const NO_REMOTE_REPO_RE = /does not appear to be a git repository|repository not found/i;

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
   * Contents of `path` at any revision as raw bytes (binary-safe), or null
   * when the file does not exist there. ONE reader for every rev — HEAD, a
   * commit, a commit's first parent (guardrail 3: showHeadBuffer is a
   * one-liner over this, and the historical-diff path reuses it verbatim).
   */
  async showAtRefBuffer(ref: string, path: string): Promise<Buffer | null> {
    const rel = this.assertRelPath(path);
    const r = await runGit(this.repoPath, ['show', `${ref}:${rel}`]);
    if (r.code === 0) return r.stdout;
    if (
      MISSING_IN_REV_RE.test(r.stderr) ||
      UNBORN_HEAD_RE.test(r.stderr) ||
      NOT_A_REPO_RE.test(r.stderr)
    ) {
      return null;
    }
    throw gmuxError(
      'GIT_FAILED',
      `Could not read the file at ${ref}.`,
      r.stderr.trim() || undefined
    );
  }

  /**
   * Contents of `path` at HEAD as raw bytes (binary-safe), or null when the
   * file did not exist at HEAD (new file, or unborn branch, or non-repo).
   */
  async showHeadBuffer(path: string): Promise<Buffer | null> {
    return this.showAtRefBuffer('HEAD', path);
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

    // `-M` (Phase 12 item 4): pair renames explicitly instead of inheriting
    // the user's `diff.renames` — with renames off, a rename degrades to
    // D+A and the history rows lose their `old → new` pairing. Both
    // --name-status and --numstat go through here, so mergeCommitFiles' keys
    // stay aligned.
    const showArgs = (mode: string): string[] => [
      'show',
      ref,
      '-z',
      mode,
      '-M',
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
   * BACKLOG 12 item 4 — the content pair a HISTORY file row must render:
   * `<sha>^ → <sha>` (DESIGN-SPEC S3A), never HEAD → worktree.
   *
   * Semantics follow VS Code's `toMultiFileDiffEditorUris`: LEFT is the file
   * at the FIRST parent (empty for adds and for a root commit's files), RIGHT
   * is the file at the commit (empty for deletes), and a rename reads
   * `origPath → path`. The caller's `status` letter is only a hint — which
   * side EXISTS is decided by whether git can read that blob, so a stale
   * letter degrades to a correct add/delete instead of a wrong diff.
   */
  async commitFileDiff(input: GitCommitFileDiffInput): Promise<GitCommitFileDiff> {
    const sha = await this.resolveCommit(input.sha);
    const newRel = this.assertRelPath(input.path);
    const oldRel =
      input.origPath !== undefined && input.origPath.length > 0
        ? this.assertRelPath(input.origPath)
        : newRel;
    const parentSha = await this.firstParent(sha);

    const [oldBuf, newBuf] = await Promise.all([
      parentSha === null
        ? Promise.resolve(null)
        : this.showAtRefBuffer(parentSha, oldRel),
      this.showAtRefBuffer(sha, newRel)
    ]);

    const binary = isBinaryBuffer(oldBuf) || isBinaryBuffer(newBuf);
    return {
      sha,
      shortSha: sha.slice(0, 7),
      parentSha,
      oldPath: oldBuf === null ? null : oldRel,
      newPath: newBuf === null ? null : newRel,
      oldContents: oldBuf === null || binary ? null : oldBuf.toString('utf8'),
      newContents: newBuf === null || binary ? null : newBuf.toString('utf8'),
      binary
    };
  }

  /**
   * Full SHA of a commit's FIRST parent, or null for a root commit.
   * `<root>^` is `fatal: invalid object name` — never build that string;
   * `rev-parse --verify --quiet <sha>^1` answers empty + non-zero instead.
   */
  async firstParent(sha: string): Promise<string | null> {
    const ref = this.assertSha(sha);
    const r = await runGit(this.repoPath, [
      'rev-parse',
      '--verify',
      '--quiet',
      `${ref}^1`
    ]);
    const out = r.stdout.toString('utf8').trim();
    return r.code === 0 && out.length > 0 ? out : null;
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
  // Branch management (Phase 10 #7): remote refs, fetch, tracking checkout,
  // local branch deletion.
  // -------------------------------------------------------------------------

  /**
   * Remote-tracking branches (all remotes) + the repo's last-fetch time —
   * one `for-each-ref refs/remotes` call; the symbolic `<remote>/HEAD`
   * aliases are deduped by the parser. Non-repo resolves to the empty
   * result (friendly read, same discipline as branches()).
   */
  async remoteBranches(): Promise<GitRemoteBranchesResult> {
    const r = await runGit(this.repoPath, [
      'for-each-ref',
      'refs/remotes',
      `--format=${REMOTE_BRANCH_FORMAT}`
    ]);
    if (r.code !== 0) {
      if (NOT_A_REPO_RE.test(r.stderr)) {
        return { branches: [], lastFetchedAt: null };
      }
      throw gmuxError(
        'GIT_FAILED',
        'Could not list remote branches.',
        r.stderr.trim() || undefined
      );
    }
    return {
      branches: parseForEachRefRemoteBranches(r.stdout.toString('utf8')),
      lastFetchedAt: await this.lastFetchedAt()
    };
  }

  /**
   * `git fetch --all --prune` — long leash (network), never interactive
   * (GIT_TERMINAL_PROMPT=0 is set by the runner, so a credential prompt
   * fails fast instead of hanging a spinner forever).
   */
  async fetch(): Promise<void> {
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, ['fetch', '--all', '--prune'], {
      timeoutMs: FETCH_TIMEOUT_MS
    });
    if (r.code !== 0) {
      // Phase 12 item 3: same classification as push/pull — a credential or
      // network failure says which, and always carries git's own words.
      throw remoteOpError('fetch', 'the remote', null, r);
    }
  }

  /**
   * Check out a remote branch (DESIGN-SPEC S3A remote-row click): when a
   * local branch with the same short name already exists, switch to it;
   * otherwise create a tracking local (`checkout -b <short> --track
   * <remote>/<short>`) and switch. A create that loses the race to an
   * "already exists" failure falls back to the plain checkout.
   */
  async checkoutTracking(remoteBranch: string): Promise<void> {
    const ref = this.assertSafeRef(remoteBranch);
    const slash = ref.indexOf('/');
    if (slash <= 0 || slash === ref.length - 1) {
      throw gmuxError(
        'INVALID_INPUT',
        'That is not a remote branch name.',
        remoteBranch
      );
    }
    const short = ref.slice(slash + 1);
    await this.assertIsRepo();

    const localExists = await runGit(this.repoPath, [
      'show-ref',
      '--verify',
      '--quiet',
      `refs/heads/${short}`
    ]);
    if (localExists.code === 0) {
      await this.checkout(short);
      return;
    }

    const r = await runGit(this.repoPath, [
      'checkout',
      '-q',
      '-b',
      short,
      '--track',
      ref,
      '--'
    ]);
    if (r.code === 0) return;
    // Race: the local appeared between the probe and the create — switch.
    if (/already exists/i.test(r.stderr)) {
      await this.checkout(short);
      return;
    }
    throw gmuxError(
      'GIT_FAILED',
      `Could not check out '${ref}'.`,
      r.stderr.trim() || undefined
    );
  }

  /**
   * Delete a local branch. `git branch -d` refusing an unmerged branch is a
   * TYPED RESULT ({status:'unmerged'}), not an exception — the UI offers
   * force (-D) exactly then. Deleting the current branch fails as git says.
   */
  async deleteBranch(
    name: string,
    force = false
  ): Promise<GitDeleteBranchResult> {
    const branch = this.assertSafeRef(name);
    await this.assertIsRepo();
    const r = await runGit(this.repoPath, [
      'branch',
      force ? '-D' : '-d',
      branch
    ]);
    if (r.code === 0) return { status: 'deleted' };
    if (!force && /not fully merged/i.test(r.stderr)) {
      return { status: 'unmerged' };
    }
    throw gmuxError(
      'GIT_FAILED',
      `Could not delete '${branch}'.`,
      r.stderr.trim() || undefined
    );
  }

  // -------------------------------------------------------------------------
  // Sync (Phase 12 item 3): remotes, push, pull, sync. Everything that talks
  // to a network gets the fetch leash, runs with GIT_TERMINAL_PROMPT=0 (a
  // credential prompt fails fast instead of hanging a spinner forever), and
  // reports failures as a CLASSIFIED message with git's own stderr attached —
  // never a silent no-op.
  // -------------------------------------------------------------------------

  /**
   * Configured remotes (name + fetch/push URL) plus the tracking context:
   * which branch is checked out and which remote-tracking ref it follows, so
   * the UI can mark the remote the current branch pushes to. Non-repo and
   * no-remote repos resolve to the empty result (friendly read).
   */
  async remotes(): Promise<GitRemotesResult> {
    const r = await runGit(this.repoPath, ['remote', '-v']);
    if (r.code !== 0) {
      if (NOT_A_REPO_RE.test(r.stderr)) {
        return { remotes: [], branch: null, upstream: null };
      }
      throw gmuxError(
        'GIT_FAILED',
        'Could not list remotes.',
        r.stderr.trim() || undefined
      );
    }
    const parsed = parseRemoteVerbose(r.stdout.toString('utf8'));
    const [branch, upstream] = await Promise.all([
      this.currentBranch(),
      this.upstreamRef()
    ]);
    const trackedRemote =
      upstream === null
        ? null
        : remoteOfUpstream(upstream, parsed.map((p) => p.name));
    const remotes: GitRemoteInfo[] = parsed.map((p) => ({
      name: p.name,
      fetchUrl: p.fetchUrl,
      pushUrl: p.pushUrl,
      tracked: p.name === trackedRemote
    }));
    return { remotes, branch, upstream };
  }

  /**
   * `git push`. A branch with NO upstream is a typed state, not a failure —
   * publishing is an explicit gesture (`setUpstream`), so gmux never invents
   * a remote behind the user's back.
   */
  async push(input: GitPushInput = { repoPath: this.repoPath }): Promise<GitPushResult> {
    await this.assertIsRepo();
    const branch = await this.currentBranch();
    if (branch === null) {
      throw gmuxError(
        'GIT_FAILED',
        'You are not on a branch — check one out before pushing.',
        'HEAD is detached or the branch has no commits yet.'
      );
    }
    const upstream = await this.upstreamRef();

    if (upstream === null) {
      const fallback = input.remote ?? (await this.defaultRemote());
      if (input.setUpstream !== true) {
        return { status: 'no-upstream', branch, remote: fallback };
      }
      if (fallback === null) {
        throw gmuxError(
          'GIT_FAILED',
          'This repository has no remote to publish to.',
          'Add one with `git remote add origin <url>`.'
        );
      }
      const remote = this.assertSafeRef(fallback);
      const r = await runGit(
        this.repoPath,
        ['push', '--set-upstream', remote, branch],
        { timeoutMs: FETCH_TIMEOUT_MS }
      );
      if (r.code !== 0) throw remoteOpError('push', remote, branch, r);
      return { status: 'pushed', remote, branch };
    }

    const remote =
      remoteOfUpstream(upstream, await this.remoteNames()) ?? 'origin';
    const r = await runGit(this.repoPath, ['push'], {
      timeoutMs: FETCH_TIMEOUT_MS
    });
    if (r.code !== 0) throw remoteOpError('push', remote, branch, r);
    const noise = r.stderr + r.stdout.toString('utf8');
    return {
      status: /everything up-to-date/i.test(noise) ? 'up-to-date' : 'pushed',
      remote,
      branch
    };
  }

  /**
   * `git pull` — honours the user's own `pull.rebase` / `pull.ff` config
   * (same discipline as commit: git behaves exactly as it does in their
   * terminal). Conflicts are a TYPED RESULT: the repo is deliberately left
   * mid-merge, which the Changes section already renders.
   */
  async pull(): Promise<GitPullResult> {
    await this.assertIsRepo();
    const branch = await this.currentBranch();
    const upstream = await this.upstreamRef();
    if (upstream === null) {
      return { status: 'no-upstream', branch: branch ?? 'HEAD' };
    }
    const remote = remoteOfUpstream(upstream, await this.remoteNames()) ?? 'origin';
    const r = await runGit(this.repoPath, ['pull'], {
      timeoutMs: FETCH_TIMEOUT_MS
    });
    const noise = r.stderr + r.stdout.toString('utf8');
    if (r.code !== 0) {
      if (/conflict/i.test(noise) || (await this.sequencerInProgress())) {
        const detail = noise.trim();
        return {
          status: 'conflict',
          ...(detail.length > 0 ? { detail } : {})
        };
      }
      throw remoteOpError('pull', remote, branch ?? 'HEAD', r);
    }
    return {
      status: /already up to date/i.test(noise) ? 'up-to-date' : 'pulled',
      upstream
    };
  }

  /** Sync = pull, then push (VS Code's Sync Changes). A pull that conflicts
   *  is never pushed over. */
  async sync(): Promise<GitSyncResult> {
    const pull = await this.pull();
    if (pull.status === 'conflict') return { pull, push: null };
    const push = await this.push({ repoPath: this.repoPath });
    return { pull, push };
  }

  /** Current branch name; null when detached, unborn, or not a repo. */
  async currentBranch(): Promise<string | null> {
    const r = await runGit(this.repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    const name = r.stdout.toString('utf8').trim();
    return r.code === 0 && name.length > 0 ? name : null;
  }

  /** Upstream of the current branch ("origin/main"); null when it has none. */
  async upstreamRef(): Promise<string | null> {
    const r = await runGit(this.repoPath, [
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{upstream}'
    ]);
    const name = r.stdout.toString('utf8').trim();
    return r.code === 0 && name.length > 0 ? name : null;
  }

  /** Remote names only (`git remote`), in git's order. */
  private async remoteNames(): Promise<string[]> {
    const r = await runGit(this.repoPath, ['remote']);
    if (r.code !== 0) return [];
    return r.stdout
      .toString('utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  /**
   * The remote a fresh branch should publish to: `origin` when it exists,
   * otherwise the only remote; null when there are none or the choice is
   * ambiguous (the UI then asks instead of guessing).
   */
  private async defaultRemote(): Promise<string | null> {
    const names = await this.remoteNames();
    if (names.includes('origin')) return 'origin';
    return names.length === 1 ? (names[0] ?? null) : null;
  }

  /**
   * mtime of .git/FETCH_HEAD (epoch ms) — when this clone last talked to a
   * remote. Null before any fetch, or when the git dir is unreadable.
   */
  private async lastFetchedAt(): Promise<number | null> {
    const gitDir = await this.resolveGitDir();
    if (gitDir === null) return null;
    try {
      const s = await stat(join(gitDir, 'FETCH_HEAD'));
      return Math.floor(s.mtimeMs);
    } catch {
      return null;
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

  /**
   * Validate a SHA argument AND prove the commit exists in this repo,
   * resolving it to its full 40-char id. Doing this up front is what lets
   * `showAtRefBuffer` treat "invalid object name" as "the path isn't in that
   * revision" (null side) without ever masking a bogus commit id.
   */
  private async resolveCommit(sha: string): Promise<string> {
    const ref = this.assertSha(sha);
    const r = await runGit(this.repoPath, [
      'rev-parse',
      '--verify',
      '--quiet',
      `${ref}^{commit}`
    ]);
    const full = r.stdout.toString('utf8').trim();
    if (r.code !== 0 || full.length === 0) {
      throw gmuxError(
        'INVALID_INPUT',
        'That commit is not in this repository.',
        sha
      );
    }
    return full;
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

/** git's own heuristic: a NUL byte in the first 8000 bytes means binary. */
function isBinaryBuffer(buf: Buffer | null): boolean {
  return buf !== null && buf.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

/**
 * Turn a failed push/pull/fetch into a message that names the PROBLEM and the
 * RECOVERY (DESIGN.md §6.11), with git's own stderr always attached as the
 * detail. Auth is the case that must never read as a generic failure: gmux
 * runs git with no terminal, so "it silently did nothing" is exactly the
 * experience this replaces.
 */
function remoteOpError(
  op: 'push' | 'pull' | 'fetch',
  remote: string,
  branch: string | null,
  r: { stderr: string; stdout: Buffer }
): Error {
  const noise = `${r.stderr}\n${r.stdout.toString('utf8')}`;
  const detail = (r.stderr.trim() || r.stdout.toString('utf8').trim()) || undefined;
  const verb = op === 'push' ? 'Push' : op === 'pull' ? 'Pull' : 'Fetch';

  const authFailure = (): Error =>
    gmuxError(
      'GIT_FAILED',
      `Couldn’t authenticate with ${remote}. gmux runs git without a terminal, so it can’t ask for a password — set up an SSH key or a credential helper, then try again.`,
      detail
    );

  if (AUTH_FAILURE_RE.test(noise)) return authFailure();
  if (NO_REMOTE_REPO_RE.test(noise)) {
    return gmuxError(
      'GIT_FAILED',
      `Couldn’t find a repository at ${remote} — check the URL, and that your account has access to it.`,
      detail
    );
  }
  if (AUTH_MAYBE_RE.test(noise)) return authFailure();
  if (NETWORK_FAILURE_RE.test(noise)) {
    return gmuxError(
      'GIT_FAILED',
      `Couldn’t reach ${remote}. Check your connection and try again.`,
      detail
    );
  }
  if (op === 'push' && NON_FAST_FORWARD_RE.test(noise)) {
    return gmuxError(
      'GIT_FAILED',
      `Push rejected — ${remote} has commits ${branch ?? 'this branch'} doesn’t. Pull first, then push.`,
      detail
    );
  }
  if (op === 'pull' && DIRTY_TREE_RE.test(noise)) {
    return gmuxError(
      'GIT_FAILED',
      'Pull needs a clean working tree — commit or stash your changes first.',
      detail
    );
  }
  if (op === 'pull' && DIVERGED_RE.test(noise)) {
    return gmuxError(
      'GIT_FAILED',
      `${branch ?? 'This branch'} and ${remote} have diverged. Git needs to know whether to merge or rebase: set \`pull.rebase\` in your git config, then pull again.`,
      detail
    );
  }
  return gmuxError('GIT_FAILED', `${verb} failed.`, detail);
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
