/**
 * The directory every fold runs in (Phase 138.1).
 *
 * RESEARCH 64 MEASURED WHY THIS EXISTS. Every agent CLI keys its own history
 * on the working directory it was started in, so a fold started inside one of
 * your projects writes a transcript into that project's history and your own
 * conversation list grows a row per turn that you never held.
 *
 * Phase 138 answered that for claude with `--no-session-persistence`, which
 * writes nothing anywhere. Four of the five recipes now have no such flag, so
 * the answer for them is a directory of Tortie's own that is not a project
 * and never will be. It sits beside the overview database, inside userData,
 * and it is created on first use.
 *
 * The directory is deliberately EMPTY of a git repository, of an AGENTS.md
 * and of a CLAUDE.md, so an agent that reads context files from its working
 * directory finds none. That is why the fold's prompt stays the size the
 * composer built rather than the size your repository makes it.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

/** The name of the directory, kept in one place so a test can name it too. */
export const FOLD_HOME_DIR = 'fold';

let ensured: string | null = null;

/**
 * The fold's own working directory, created if it is not there yet.
 *
 * It is remembered after the first call, because a fold runs once per turn
 * boundary and a directory that already exists does not need making again.
 */
export function foldHome(): string {
  if (ensured !== null) return ensured;
  const dir = join(app.getPath('userData'), 'gmux', FOLD_HOME_DIR);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // A fold that cannot make its own directory still runs. The child will
    // fail to start and the row will say so, which is better than throwing
    // out of a getter.
  }
  ensured = dir;
  return dir;
}

/** Forget the remembered path. Used by tests, never in an ordinary launch. */
export function resetFoldHome(): void {
  ensured = null;
}
