/**
 * server-origin.ts — who started the session server that is already running
 * (Phase 217).
 *
 * ## Why it exists
 *
 * The version gate refuses a pair this release never tested, and until this
 * phase the refusal named two version numbers and stopped. The operator met
 * that on 2026-09-06 and there was nothing on the screen that said which
 * program had created the server or what to do about it. This module is the
 * measurement half of the fix. It reads who made the server, and the words are
 * composed from what it reads in ./version.ts.
 *
 * ## It reads, and it does nothing else
 *
 * Nothing here restarts, signals, reconfigures or upgrades a server. Nothing
 * here kills a process. Two reads happen and both are questions:
 *
 *   1. `display-message -p '#{pid}'` through the caller's own exec door, which
 *      is already bound to the socket. MEASURED 2026-09-06 on a scratch socket
 *      across the refused pair itself, being a 3.6a client against a 3.7b
 *      server, at 6 ms. That direction matters, because the whole point is to
 *      answer for a pair Tortie is about to refuse.
 *   2. `/bin/ps -p <pid> -o comm=`, which on macOS prints the FULL PATH of the
 *      executable rather than the leaf name, measured at 2 ms. The program is
 *      named ABSOLUTELY rather than resolved through PATH, because the app's
 *      own PATH is the person's login shell PATH by the time this runs and a
 *      shim earlier on it would be what answered.
 *
 * ## It never throws, and it never guesses
 *
 * Every read that fails leaves its field null, and a null field costs the
 * screen one line rather than producing an invented one. A remedy naming the
 * wrong file would be worse than no remedy, which is the rule the phase was
 * given.
 */

import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

import type { TmuxExec } from './version';

const execFileP = promisify(execFile);

/**
 * How long either read gets. The same 2,000 ms the version probe takes, and
 * for the same reason: this sits in front of a screen a person is waiting on.
 */
export const ORIGIN_PROBE_TIMEOUT_MS = 2_000;

/** What could be read about the process holding the session server. */
export interface TmuxServerOrigin {
  /** The server's process id, when it answered. */
  pid: number | null;
  /** Absolute path of the program that process is running, when ps answered. */
  binary: string | null;
  /**
   * The application bundle that program sits inside, when it sits inside one.
   * `/Applications/Tortie.app` for a server an installed Tortie created.
   */
  appBundle: string | null;
}

/** Nothing was readable. The screen then looks as it did before Phase 217. */
export const UNKNOWN_ORIGIN: TmuxServerOrigin = {
  pid: null,
  binary: null,
  appBundle: null
};

/**
 * The `.app` a path sits inside, or null. Pure, so the shape is testable
 * without a machine.
 *
 * It matches the FIRST `.app` segment followed by `Contents/`, which is the
 * only shape macOS puts a bundled executable in. A directory merely named
 * something.app with no Contents under it is not a bundle and answers null.
 */
export function appBundleOf(binary: string): string | null {
  const m = /^(\/.*?\.app)\/Contents\//.exec(binary);
  return m?.[1] ?? null;
}

/** The bundle's display name, e.g. "Tortie" for /Applications/Tortie.app. */
export function appNameOf(appBundle: string): string {
  return basename(appBundle).replace(/\.app$/, '');
}

/** How the process table is asked. Injected so a test drives every branch. */
export type PsReader = (pid: number) => Promise<string | null>;

/** Where macOS keeps `ps`. Named absolutely so no shim on PATH can answer. */
const PS = '/bin/ps';

/** `/bin/ps -p <pid> -o comm=`. Never throws, and never runs through a shell. */
export const readProcessCommand: PsReader = async (pid) => {
  try {
    const { stdout } = await execFileP(PS, ['-p', String(pid), '-o', 'comm='], {
      timeout: ORIGIN_PROBE_TIMEOUT_MS
    });
    const line = stdout.split('\n')[0]?.trim() ?? '';
    return line.length === 0 ? null : line;
  } catch {
    return null;
  }
};

/**
 * Read who started the server on the other end of the socket.
 *
 * Resolves for every input. A pid that is not a positive integer is refused
 * before it can reach an argv, which is why the parse is a whole-string test
 * rather than `parseInt`.
 */
export async function readServerOrigin(
  exec: TmuxExec,
  ps: PsReader = readProcessCommand
): Promise<TmuxServerOrigin> {
  let answer = '';
  try {
    answer = await exec(['display-message', '-p', '#{pid}'], {
      timeoutMs: ORIGIN_PROBE_TIMEOUT_MS
    });
  } catch {
    return UNKNOWN_ORIGIN;
  }
  const first = answer.split('\n')[0]?.trim() ?? '';
  if (!/^[0-9]{1,10}$/.test(first)) return UNKNOWN_ORIGIN;
  const pid = Number(first);
  if (pid <= 0) return UNKNOWN_ORIGIN;
  const binary = await ps(pid);
  if (binary === null || !binary.startsWith('/')) {
    return { pid, binary: null, appBundle: null };
  }
  return { pid, binary, appBundle: appBundleOf(binary) };
}
