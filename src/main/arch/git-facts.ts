/**
 * The one place the arch checkers talk to git, and the parsers for what comes
 * back (Phase 63, research 49 section 4.7).
 *
 * Every call is composed by `./argv-guard.ts` and proved before it is spawned.
 * This module holds the seam that runs it and the in process readers for the
 * four output shapes. The readers are pure functions over bytes, which is why
 * `npm run conformance:arch` can drive all five checkers over a committed
 * fixture without starting a single process.
 *
 * ## Why the runner is a seam rather than a direct call
 *
 * Two reasons, and only one of them is testing.
 *
 * The first is the gate. A gate that had to build a real git repository to
 * check the argv defense would be an adapter test that needs git on the host,
 * and it would prove the defense only for the paths that repository happened to
 * hold. With the seam, the gate records every argv the checkers compose over a
 * fixture that holds deliberately hostile paths, and it can assert on all of
 * them at once.
 *
 * The second is that the real runner is `runGit` from `../git/exec`, which is
 * the VS Code model: the system git, the user's own hooks and config, and
 * `GIT_OPTIONAL_LOCKS=0` so a background read never takes the index lock out
 * from under an agent's foreground command. Arch reads git in the background on
 * every burst of file changes, so it must never be the thing that makes an
 * agent's `git commit` fail.
 */

import { runGit } from '../git/exec';
import type { ArchGitCall } from './argv-guard';

/** What one git call produced. The same three fields `runGit` resolves with. */
export interface ArchGitResult {
  code: number;
  stdout: Buffer;
  stderr: string;
}

/**
 * The seam. It takes a call this build composed and runs it.
 *
 * It takes the whole {@link ArchGitCall} rather than a bare argv so that no
 * caller can compose an argument list of its own and hand it in. The only
 * values of this type come from the five functions in `./argv-guard.ts`.
 */
export interface ArchGitRunner {
  run(call: ArchGitCall): Promise<ArchGitResult>;
}

/** The real runner, over the system git in one repository. */
export function createArchGitRunner(
  repoPath: string,
  timeoutMs = 30_000
): ArchGitRunner {
  return {
    run(call: ArchGitCall): Promise<ArchGitResult> {
      return runGit(repoPath, [...call.argv], {
        timeoutMs,
        ...(call.stdin === undefined ? {} : { stdin: call.stdin })
      });
    }
  };
}

// ---------------------------------------------------------------------------
// The readers, all pure
// ---------------------------------------------------------------------------

/** Every tracked path, from `git ls-files -z`. */
export function readLsFiles(stdout: Buffer): string[] {
  return splitZero(stdout.toString('utf8'));
}

/** One path that is changed and not committed, from `git status --porcelain -z`. */
export interface ArchUncommitted {
  path: string;
  /** The two letter code git printed, kept whole so nothing is guessed at. */
  code: string;
}

/**
 * Read `git status --porcelain -z`.
 *
 * The zero separated form puts the whole entry in one field, being two status
 * letters, a space and the path. A rename entry is followed by a second field
 * holding the old path, and that second field is consumed rather than counted,
 * because one rename is one changed file and not two.
 */
export function readStatusPorcelain(stdout: Buffer): ArchUncommitted[] {
  const fields = splitZero(stdout.toString('utf8'));
  const out: ArchUncommitted[] = [];
  for (let i = 0; i < fields.length; i += 1) {
    const entry = fields[i] ?? '';
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    const path = entry.slice(3);
    out.push({ path, code });
    if (code.includes('R') || code.includes('C')) i += 1;
  }
  return out;
}

/** One commit and the paths it touched, from `git log --format=%H --name-only -z`. */
export interface ArchCommitTouch {
  commit: string;
  paths: string[];
}

/**
 * Read `git log --format=%H --name-only --no-renames -z`.
 *
 * With `-z` the format line and the path list share one zero separated stream,
 * and a commit's own record begins with the forty character name. Every field
 * after it, until the next name, is a path that commit touched. A merge commit
 * lists no path at all, which is why an empty list is normal rather than a
 * parse failure.
 */
export function readLogNameOnly(stdout: Buffer): ArchCommitTouch[] {
  const out: ArchCommitTouch[] = [];
  let current: ArchCommitTouch | null = null;
  for (const rawField of splitZero(stdout.toString('utf8'))) {
    // The first path after a format line arrives glued to it by a newline,
    // because git ends the format with one and only separates PATHS by zero.
    for (const piece of rawField.split('\n')) {
      const field = piece.trim();
      if (field.length === 0) continue;
      if (/^[0-9a-f]{40}$/.test(field)) {
        current = { commit: field, paths: [] };
        out.push(current);
        continue;
      }
      if (current !== null) current.paths.push(field);
    }
  }
  return out;
}

/** One answer from `git cat-file --batch`, keyed by the request that asked for it. */
export interface ArchBlobRead {
  request: string;
  /** null when git said the request names nothing, which is an ordinary answer. */
  bytes: Buffer | null;
}

/**
 * Read `git cat-file --batch` output.
 *
 * The protocol is one header line per request. A found object reads
 * `<name> <type> <size>` and is followed by exactly `size` bytes and one
 * newline. A missing one reads `<request> missing` and is followed by nothing.
 * The requests are passed back in so each answer carries the request that asked
 * for it, because a missing answer does not name the object it could not find
 * in every git version.
 */
export function readCatFileBatch(
  stdout: Buffer,
  requests: readonly string[]
): ArchBlobRead[] {
  const out: ArchBlobRead[] = [];
  let at = 0;
  for (const request of requests) {
    const newline = stdout.indexOf(0x0a, at);
    if (newline === -1) {
      out.push({ request, bytes: null });
      continue;
    }
    const header = stdout.toString('utf8', at, newline);
    at = newline + 1;
    const parts = header.split(' ');
    const size = Number(parts[2]);
    if (parts.length < 3 || !Number.isFinite(size)) {
      out.push({ request, bytes: null });
      continue;
    }
    out.push({ request, bytes: stdout.subarray(at, at + size) });
    // The size, then the newline git writes after the object's bytes.
    at += size + 1;
  }
  return out;
}

/** Split a zero separated stream, dropping the empty tail git leaves. */
function splitZero(text: string): string[] {
  return text.split('\u0000').filter((part) => part.length > 0);
}
