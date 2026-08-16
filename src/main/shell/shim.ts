/**
 * The `tortie` shell shim (Phase 51): compose, install, report, remove.
 *
 * The shim is a small POSIX sh script written by one explicit click in
 * Settings, mode 0755. It resolves its argument to an absolute folder and
 * execs `/usr/bin/open -n -b com.itavero.tortie --args <abs>` — the standard
 * bundle lookup, the same shape as VS Code's own `code` shim. `-n` is
 * required: without it, `open --args` against a running app activates it
 * and drops the arguments. With it, a fresh copy starts, the running holder
 * refuses it through the single-instance lock, the argv reaches the holder
 * in the `second-instance` event, and the refused copy exits 0. When Tortie
 * is not running, the fresh copy is simply the first instance and the
 * folder opens on boot.
 *
 * THE CAP holds here mechanically: the shim refuses every argument that
 * starts with a dash and passes only one folder path to the app. No flag
 * may ever select an agent, start a session, or run a command
 * (docs/research/48-what-people-want.md section 9.3, refusal 8).
 *
 * Main alone computes the target path. The install and remove IPC channels
 * take no arguments, so no process can steer the write location through
 * IPC. Every function takes an injectable deps object so the shim smoke
 * (src/main/harness/shim-smoke.ts) and the unit tests run against a temp
 * directory and can never touch a real PATH directory.
 */

import { constants } from 'node:fs';
import { access, readFile, stat, unlink, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import type { ShellCommandStatus } from '@shared/ipc';
import { getUserPath } from '../tmux/resolve';
import { TORTIE_BUNDLE_ID } from '../updates/shipit-state';

/** The file name the shim is installed under. */
export const SHIM_NAME = 'tortie';

/**
 * The ownership marker: the first comment line of the shim. Remove refuses
 * to delete a file that does not carry it, and status reports such a file
 * as 'foreign'.
 */
export const SHIM_MARKER = '# Tortie shell command. Installed from Tortie Settings.';

/**
 * The candidate install directories, in preference order. The chosen one
 * must be on the user's login-shell PATH and writable by this user. There
 * is no sudo flow and no PATH editing: Tortie never edits shell profiles.
 */
export const SHIM_CANDIDATE_DIRS: readonly string[] = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '~/.local/bin'
];

/** What the shim module needs to answer; injectable for smoke and tests. */
export interface ShimDeps {
  /** Candidate install directories, in preference order. */
  candidates: readonly string[];
  /** The user's login-shell PATH (colon-joined). */
  userPath(): Promise<string>;
  /** The bundle id the shim's `open -b` names. */
  bundleId: string;
}

/** The real deps: the shared login-shell PATH capture, the real bundle id. */
export function defaultShimDeps(): ShimDeps {
  return {
    candidates: SHIM_CANDIDATE_DIRS,
    userPath: getUserPath,
    bundleId: TORTIE_BUNDLE_ID
  };
}

/**
 * The exact shim content. Every line is deliberate:
 *  - the dash refusal is the cap, enforced before anything else;
 *  - extra arguments are ignored OUT LOUD, never silently;
 *  - the shim resolves the argument itself (`cd` + `pwd`), so main never
 *    sees a relative path from this route;
 *  - `exec /usr/bin/open -n -b <id>` finds the installed app by bundle id,
 *    never by a hardcoded path.
 */
export function composeShimContent(bundleId: string): string {
  return [
    '#!/bin/sh',
    SHIM_MARKER,
    '# It opens one folder as a project tab in the running Tortie window.',
    '# It opens a folder and does nothing else. It accepts no flags on purpose.',
    'dir="${1:-.}"',
    'case "$dir" in',
    '  -*)',
    '    echo "usage: tortie [folder]" >&2',
    '    echo "tortie opens one folder as a project tab in Tortie. It accepts no flags." >&2',
    '    exit 64',
    '    ;;',
    'esac',
    'if [ "$#" -gt 1 ]; then',
    '  shift',
    '  echo "tortie: extra arguments were ignored: $*" >&2',
    'fi',
    'abs=$(cd "$dir" 2>/dev/null && pwd) || {',
    '  echo "tortie: $dir is not a folder that exists" >&2',
    '  exit 1',
    '}',
    `exec /usr/bin/open -n -b ${bundleId} --args "$abs"`,
    ''
  ].join('\n');
}

/** Expand a leading `~/` against the home directory. */
function expandTilde(dir: string): string {
  return dir.startsWith('~/') ? join(homedir(), dir.slice(2)) : dir;
}

/** Strip one trailing slash so PATH entries compare by name. */
function trimSlash(dir: string): string {
  return dir.length > 1 && dir.endsWith('/') ? dir.slice(0, -1) : dir;
}

/**
 * The first candidate that is both on the login-shell PATH and writable,
 * or null when none qualifies (the 'unavailable' state).
 */
export async function chooseInstallDir(
  deps: ShimDeps = defaultShimDeps()
): Promise<string | null> {
  const pathValue = await deps.userPath();
  const onPath = new Set(
    pathValue
      .split(delimiter)
      .filter((entry) => entry.length > 0)
      .map(trimSlash)
  );
  for (const candidate of deps.candidates) {
    const dir = trimSlash(expandTilde(candidate));
    if (!onPath.has(dir)) continue;
    try {
      await access(dir, constants.W_OK);
    } catch {
      continue;
    }
    return dir;
  }
  return null;
}

/** The full target path the shim would live at, or null when unavailable. */
async function shimTarget(deps: ShimDeps): Promise<string | null> {
  const dir = await chooseInstallDir(deps);
  return dir === null ? null : join(dir, SHIM_NAME);
}

/** Does this file carry the ownership marker? False for unreadable files. */
async function carriesMarker(target: string): Promise<boolean> {
  try {
    const content = await readFile(target, 'utf8');
    return content.includes(SHIM_MARKER);
  } catch {
    return false;
  }
}

/** Whether a file exists at the target. */
async function targetExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * The shim's current state, computed from the target only. A `tortie`
 * earlier on PATH in some other directory is not detected; the spec names
 * that limit honestly rather than sweeping PATH.
 */
export async function shimStatus(
  deps: ShimDeps = defaultShimDeps()
): Promise<ShellCommandStatus> {
  const target = await shimTarget(deps);
  if (target === null) return { state: 'unavailable', target: null };
  if (!(await targetExists(target))) return { state: 'not-installed', target };
  if (await carriesMarker(target)) return { state: 'installed', target };
  return {
    state: 'foreign',
    target,
    reason:
      `A file named ${SHIM_NAME} already exists at ${target} and Tortie ` +
      'did not install it, so Tortie will not replace it or remove it.'
  };
}

/**
 * Write the shim to the computed target, mode 0755, and return the fresh
 * status. Refuses a foreign file (defense in depth behind the disabled UI)
 * and rejects with a plain sentence when the write fails.
 */
export async function installShim(
  deps: ShimDeps = defaultShimDeps()
): Promise<ShellCommandStatus> {
  const target = await shimTarget(deps);
  if (target === null) {
    throw new Error(
      'The command cannot be installed. Tortie looked for a folder that is ' +
        'both on your PATH and writable, among /opt/homebrew/bin, ' +
        '/usr/local/bin and ~/.local/bin, and found none.'
    );
  }
  if ((await targetExists(target)) && !(await carriesMarker(target))) {
    throw new Error(
      `A file named ${SHIM_NAME} already exists at ${target} and Tortie ` +
        'did not install it, so Tortie will not replace it or remove it.'
    );
  }
  try {
    await writeFile(target, composeShimContent(deps.bundleId), {
      encoding: 'utf8',
      mode: 0o755
    });
    // writeFile applies `mode` only when it CREATES the file. A reinstall
    // over our own shim keeps the old bits, so state them explicitly.
    await chmod(target, 0o755);
  } catch (err) {
    throw new Error(
      `The command could not be written to ${target}. ${(err as Error).message}`
    );
  }
  return shimStatus(deps);
}

/**
 * Delete the target, only when the ownership marker is present. A foreign
 * file is left alone and the rejection says so.
 */
export async function removeShim(
  deps: ShimDeps = defaultShimDeps()
): Promise<ShellCommandStatus> {
  const target = await shimTarget(deps);
  if (target === null) return { state: 'unavailable', target: null };
  if (!(await targetExists(target))) return { state: 'not-installed', target };
  if (!(await carriesMarker(target))) {
    throw new Error(
      `The file at ${target} was not installed by Tortie, so it was left alone.`
    );
  }
  await unlink(target);
  return shimStatus(deps);
}
