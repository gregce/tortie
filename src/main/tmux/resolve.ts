/**
 * resolve.ts — THE single resolution module (growth guardrail 3).
 *
 * Everything that answers "where is this binary / config on THIS machine"
 * lives here, shared by the supervisor, the attach host, the agent
 * availability probe, and (Phase 10) the agent detection service:
 *
 *  1. Login-shell PATH capture. gmux.app is launched by launchd with a
 *     minimal GUI PATH (/usr/bin:/bin:…) — agent CLIs live in ~/.local/bin,
 *     /opt/homebrew/bin, npm-global, etc. We ask the user's real shell once
 *     (`$SHELL -lic 'printf …$PATH…'`, 3 s timeout) and fall back to a sane
 *     default when the shell is slow/broken. The captured PATH is injected
 *     into the private tmux server env at boot (supervisor.ensureServer) so
 *     every pane — and everything agents spawn — sees the user's real PATH.
 *
 *  2. Binary resolution: argv[0] → absolute path against the captured PATH
 *     plus the known install dirs GUI apps miss. The manifest stores ONLY
 *     absolute paths (argv and resume_argv), so restores survive PATH drift.
 *
 *  3. tmux binary + gmux-tmux.conf resolution (moved from supervisor.ts and
 *     attach-host.ts — one module, two consumers, zero duplication).
 *
 * Pure Node except resolveConfPath (lazy electron import keeps this module
 * unit-testable outside Electron).
 */

import { execFile } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';

// ---------------------------------------------------------------------------
// Login-shell PATH capture
// ---------------------------------------------------------------------------

/** How long the login shell gets to print its PATH before we fall back. */
export const PATH_CAPTURE_TIMEOUT_MS = 3_000;

/**
 * Marker pair around the PATH so rc-file noise (echo/neofetch/etc. printed
 * by interactive shells) can never corrupt the capture.
 */
const PATH_MARKER = '__GMUX_PATH__';
const PATH_CAPTURE_RE = /__GMUX_PATH__(.*?)__GMUX_PATH__/s;

/**
 * Install dirs GUI-launched apps typically miss. Used both as the PATH
 * fallback tail and as the extra probe dirs for binary resolution
 * (superset of the agent registry's extraDirs — research 11).
 */
export function extraBinDirs(): string[] {
  const home = homedir();
  return [
    join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    join(home, 'bin'),
    // `claude install` (native build) symlinks here.
    join(home, '.claude', 'local'),
    // Default npm-global prefix locations.
    join(home, '.npm-global', 'bin'),
    join(home, '.bun', 'bin'),
    // Cursor CLI self-install location (registry pathProbe).
    join(home, '.cursor', 'bin')
  ];
}

/** System baseline every PATH must keep, whatever the capture said. */
const SYSTEM_PATH_DIRS = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];

/** Join dir lists into a PATH string, deduped, order-preserving. */
export function mergePathDirs(...groups: readonly (readonly string[])[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const dir of group) {
      if (dir.length === 0 || seen.has(dir)) continue;
      seen.add(dir);
      out.push(dir);
    }
  }
  return out.join(delimiter);
}

/**
 * The no-shell-needed fallback PATH: the process's own PATH (whatever
 * launchd gave us) + the known install dirs + the system baseline.
 */
export function fallbackPath(env: NodeJS.ProcessEnv = process.env): string {
  return mergePathDirs(
    (env['PATH'] ?? '').split(delimiter),
    extraBinDirs(),
    SYSTEM_PATH_DIRS
  );
}

export interface CapturePathOptions {
  /** Shell to interrogate; default $SHELL, then /bin/zsh. */
  shell?: string;
  /** Capture timeout; default PATH_CAPTURE_TIMEOUT_MS (3 s). */
  timeoutMs?: number;
  /** Env for the fallback computation (tests). */
  env?: NodeJS.ProcessEnv;
}

/**
 * Ask the user's login shell for its PATH. `-lic` = login + interactive +
 * command, matching what the user's terminal sessions actually see (zsh
 * sources .zprofile AND .zshrc this way; bash and fish accept the same
 * flags). Marker-delimited so rc noise can't break parsing.
 *
 * NEVER rejects: any failure (missing shell, hang, empty output) resolves
 * to the merged fallback. The result always keeps the system baseline and
 * the known install dirs appended — a broken rc file can shrink PATH, and
 * gmux must never inherit that fragility.
 */
export function captureLoginShellPath(
  options: CapturePathOptions = {}
): Promise<string> {
  const env = options.env ?? process.env;
  const shell = options.shell ?? env['SHELL'] ?? '/bin/zsh';
  const timeoutMs = options.timeoutMs ?? PATH_CAPTURE_TIMEOUT_MS;
  return new Promise<string>((resolve) => {
    let settled = false;
    const finish = (captured: string | null): void => {
      if (settled) return;
      settled = true;
      const capturedDirs =
        captured === null ? [] : captured.split(delimiter).filter(Boolean);
      // Captured dirs first (user's own ordering wins), then the safety net.
      resolve(
        mergePathDirs(
          capturedDirs,
          (env['PATH'] ?? '').split(delimiter),
          extraBinDirs(),
          SYSTEM_PATH_DIRS
        )
      );
    };
    try {
      execFile(
        shell,
        ['-lic', `printf '${PATH_MARKER}%s${PATH_MARKER}' "$PATH"`],
        { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
        (err, stdout) => {
          const m = PATH_CAPTURE_RE.exec(stdout ?? '');
          if (m !== null && m[1] !== undefined && m[1].length > 0) {
            finish(m[1]);
          } else {
            if (err) {
              console.warn(
                `[gmux] login-shell PATH capture failed (${shell}): ${err.message} — using fallback`
              );
            }
            finish(null);
          }
        }
      );
    } catch (err) {
      console.warn(
        `[gmux] login-shell PATH capture threw (${shell}): ${(err as Error).message} — using fallback`
      );
      finish(null);
    }
  });
}

let userPathPromise: Promise<string> | null = null;

/**
 * The user's real PATH, captured once per boot (cached promise — concurrent
 * callers share the one capture). Always resolves.
 */
export function getUserPath(): Promise<string> {
  if (userPathPromise === null) {
    userPathPromise = captureLoginShellPath();
  }
  return userPathPromise;
}

/** Test hook. */
export function resetUserPathCache(): void {
  userPathPromise = null;
}

// ---------------------------------------------------------------------------
// Binary resolution (argv[0] → absolute path)
// ---------------------------------------------------------------------------

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a binary name to an absolute executable path against an explicit
 * PATH string, then `extraDirs`. Absolute/relative inputs (anything with a
 * separator) are validated as-is, tilde-expanded first. Returns null when
 * nothing executable was found — callers surface a friendly typed error.
 */
export function resolveBinaryAgainst(
  bin: string,
  pathValue: string,
  extraDirs: readonly string[] = extraBinDirs()
): string | null {
  if (bin.length === 0) return null;
  const expanded = bin.startsWith('~/') ? join(homedir(), bin.slice(2)) : bin;
  if (expanded.includes('/')) {
    return isAbsolute(expanded) && isExecutableFile(expanded) ? expanded : null;
  }
  for (const dir of [...pathValue.split(delimiter), ...extraDirs]) {
    if (dir.length === 0) continue;
    const candidate = join(dir, expanded);
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve a binary against the captured login-shell PATH + install dirs.
 * The one call sites use at session-create time (and Phase 10 detection).
 */
export async function resolveBinary(bin: string): Promise<string | null> {
  return resolveBinaryAgainst(bin, await getUserPath());
}

// ---------------------------------------------------------------------------
// tmux binary + conf resolution (single source for supervisor + attach host)
// ---------------------------------------------------------------------------

/**
 * Locate tmux. GUI-launched Electron apps inherit a minimal PATH (no
 * /opt/homebrew/bin), so probe known locations first, then scan PATH.
 */
export function findTmuxBinary(): string | null {
  const known = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux'
  ];
  for (const candidate of known) {
    if (existsSync(candidate)) return candidate;
  }
  return resolveBinaryAgainst('tmux', process.env['PATH'] ?? '', []);
}

/** Resolve resources/gmux-tmux.conf for dev vs packaged builds. */
export function resolveConfPath(): string {
  // Lazy import: keeps this module loadable in plain-node unit tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require('electron') as typeof import('electron');
  // Packaged: electron-builder copies resources/gmux-tmux.conf → Resources/.
  // Dev / `electron .`: repo-root resources/.
  return app.isPackaged
    ? join(process.resourcesPath, 'gmux-tmux.conf')
    : join(app.getAppPath(), 'resources', 'gmux-tmux.conf');
}
