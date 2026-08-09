/**
 * Low-level `git` process runner for the gmux git service.
 *
 * Every invocation spawns the SYSTEM git CLI (the VS Code model — research
 * 06 §1.1): this inherits the user's hooks, config, signing and credential
 * setup, and coexists safely with coding agents running git in the same
 * worktree. All calls set `GIT_OPTIONAL_LOCKS=0` so background reads never
 * take the index lock out from under an agent's foreground git command.
 *
 * NOTE: bundling a pinned git binary is out of scope today (same call as the
 * pinned-tmux decision) — we rely on /usr/bin/git shipping with the Xcode
 * CLT on every dev Mac. A missing binary surfaces as a friendly GIT_FAILED.
 */

import { spawn } from 'node:child_process';
import { gmuxError } from '../tmux/errors';

export interface GitResult {
  /** Process exit code (-1 when killed by signal). */
  code: number;
  /** Raw stdout bytes — binary-safe for `git show HEAD:<path>`. */
  stdout: Buffer;
  /** stderr decoded as UTF-8 (git error text). */
  stderr: string;
}

export interface RunGitOptions {
  /** Kill the process after this long. Default 30 s (reads). */
  timeoutMs?: number;
  /** Reject when stdout exceeds this many bytes. Default 64 MiB. */
  maxOutputBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT = 64 * 1024 * 1024;
const MAX_STDERR = 1024 * 1024;

/**
 * Run `git <args>` with cwd = `repoPath`. Resolves with the exit code (it
 * does NOT throw on non-zero exit — callers classify stderr); rejects only
 * for spawn-level failures (git missing, timeout, output cap).
 */
export function runGit(
  repoPath: string,
  args: string[],
  options: RunGitOptions = {}
): Promise<GitResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutput = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;

  return new Promise<GitResult>((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: repoPath,
      env: {
        ...process.env,
        // Never contend with an agent's foreground git for the index lock.
        GIT_OPTIONAL_LOCKS: '0',
        // No TTY exists: a credential prompt would hang forever — fail fast
        // instead (only reachable via user hooks doing network calls).
        GIT_TERMINAL_PROMPT: '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const timer = setTimeout(() => {
      fail(
        gmuxError(
          'GIT_FAILED',
          'A git command took too long and was stopped.',
          `git ${args.join(' ')} exceeded ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    function fail(err: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGKILL');
      reject(err);
    }

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > maxOutput) {
        fail(
          gmuxError(
            'GIT_FAILED',
            'A git command produced too much output.',
            `git ${args.join(' ')} exceeded ${maxOutput} bytes of stdout`
          )
        );
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes < MAX_STDERR) {
        stderrChunks.push(chunk);
        stderrBytes += chunk.byteLength;
      }
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        fail(
          gmuxError(
            'GIT_FAILED',
            'Git is not installed (or not on PATH). Install the Xcode Command Line Tools: xcode-select --install',
            err.message
          )
        );
      } else {
        fail(
          gmuxError('SPAWN_FAILED', 'Could not start git.', err.message)
        );
      }
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code: code ?? -1,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks).toString('utf8')
      });
    });
  });
}

/** Run git and throw a structured GIT_FAILED unless it exits 0. */
export async function runGitOrThrow(
  repoPath: string,
  args: string[],
  friendly: string,
  options: RunGitOptions = {}
): Promise<GitResult> {
  const result = await runGit(repoPath, args, options);
  if (result.code !== 0) {
    throw gmuxError('GIT_FAILED', friendly, result.stderr.trim() || undefined);
  }
  return result;
}
