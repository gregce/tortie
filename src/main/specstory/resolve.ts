/**
 * resolve.ts — WHICH specstory binary gmux drives, and where its state lives.
 *
 * The single answer to "where is specstory on this machine", for the same
 * reason `search/resolve.ts` is the single answer for ripgrep and
 * `tmux/resolve.ts` is for tmux (growth guardrail 3). Every caller — the wrap
 * composer, the session-end sync, the Settings panel — comes here.
 *
 * ## The order, and why it is bundled-first
 *
 * gmux ships its own specstory at `Contents/Resources/bin/specstory` (see
 * electron-builder.yml, docs/research/13-specstory-integration.md §2.1), so:
 *
 *   1. **bundled** — the pinned copy inside gmux.app. Preferred because it is
 *      the copy this build was written against: the wrap templates, the
 *      provider ids and the flags gmux composes (`-c`, `--resume`,
 *      `--no-version-check`) are verified against exactly this version. An
 *      older Homebrew copy on the user's PATH can be missing a provider or a
 *      flag, and the failure would look like "gmux's capture is broken".
 *   2. **installed** — whatever `specstory` the login-shell PATH finds. This is
 *      not a rare path: in dev there is no `Contents/Resources`, so this is
 *      what `npm run dev` uses, and it is also the safety net if the bundled
 *      copy is ever missing or unexecutable.
 *
 * Both are probed and both are reported, because Settings shows the one in use
 * *and* the version of the other (research §2.3 wants that audit trail, and
 * the manifest records `bin` + `bin_version` per session so a restore after a
 * mid-flight `brew upgrade` replays the same binary it launched with).
 *
 * ## Why EVERY copy is reported, not just those two (Phase 18.5)
 *
 * "The one on the PATH" is not one thing. Measured on this machine on
 * 2026-08-12 (docs/research/30 §0.2), and re-measured before this change:
 * `/opt/homebrew/bin/specstory` is **2.5.0** and wins `command -v`,
 * `/usr/local/bin/specstory` is **2.6.0** and is shadowed by it — newer,
 * invisible to `brew upgrade`, and invisible to a first-hit resolver — and the
 * bundled copy is **2.8.0**. Three versions spanning three minors, on the
 * machine the app is being built for.
 *
 * So {@link SpecstoryResolution} now carries `copies`: every specstory found,
 * each with its own version. Settings shows which one won AND what else is
 * lying around, because "SpecStory 2.8.0" next to a pane that a shell-launched
 * `specstory` would handle at 2.5.0 is a half-truth the user cannot debug.
 *
 * The WINNER IS UNCHANGED — bundled first, then the first copy in PATH order.
 * The only refinement: a copy that will not identify itself is skipped rather
 * than ending the search, which is the liveness rule `probeBundled` already
 * applied to the bundled copy ("a bundled binary that cannot exec must lose to
 * the installed one"), now applied consistently to all of them.
 *
 * ## The double-login trap (research §2.4, verified in the CLI source)
 *
 * A bundled CLI must not make the user log in twice. It does not, *by
 * construction*: every piece of specstory state is derived from `$HOME` and
 * the working directory, never from the binary's location —
 * `utils.GetAuthPath()` is literally `filepath.Join(homeDir, ".specstory",
 * "cli", "auth.json")`, and the CLI reads no `SPECSTORY_HOME`-style override
 * (its whole `os.Getenv` surface is CODEX_HOME / CLAUDE_CONFIG_DIR / XDG_* /
 * OTEL_* / NVM_* / HOMEBREW_PREFIX / USER). So one `specstory login` — done in
 * a terminal, by the Homebrew copy, or by gmux — serves both copies.
 *
 * The one way gmux could break that is by spawning specstory with a doctored
 * `HOME`. `specstoryEnv()` exists so that never happens by accident: it is the
 * only env builder for specstory spawns, it changes exactly one variable
 * (PATH, which GUI-launched Electron gets wrong), and a test pins that.
 *
 * ## The one deliberate exception: GMUX_SPECSTORY_HOME
 *
 * Set, it stands in for `$HOME` in BOTH halves — the `auth.json` gmux reads
 * and the `HOME` every specstory gmux spawns writes to. It exists so this
 * feature can be verified (signed-out photographs, login/logout flows,
 * captures that must never reach the user's real cloud) against a scratch
 * config, and it lives HERE rather than in each caller because the two halves
 * disagreeing is precisely the failure it is meant to prevent: a reader
 * pointed at a scratch file while a spawn writes the real one is worse than
 * no override at all. Unset — the shipped default — it changes nothing.
 */

import { accessSync, constants, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { parseSpecStoryVersionOutput } from '@shared/specstory-status';
import { runGuarded } from '../proc/guarded';
import { extraBinDirs, getUserPath } from '../tmux/resolve';

/** Where the bundled copy sits inside the app, relative to Resources. */
const BUNDLED_SUBPATH = ['bin', 'specstory'] as const;
/** Spawn-free version metadata written beside it by build/fetch-specstory.cjs. */
const BUNDLED_META = ['bin', 'specstory.json'] as const;
/** The dev/unpackaged mirror of Resources — build/fetch-specstory.cjs's output. */
const VENDOR_SUBPATH = ['build', 'vendor', 'specstory'] as const;

/**
 * ALWAYS pass this. Without it every invocation blocks on a 2.5 s GitHub HEAD
 * and prints an "Update Available!" box into the pane (research §1.1).
 */
export const NO_VERSION_CHECK = '--no-version-check';

/** How long a `--version` probe gets before we call the binary unusable. */
const VERSION_PROBE_TIMEOUT_MS = 5_000;

/**
 * Ceiling on how many copies are probed. One spawn each (~120 ms, parallel),
 * and three is the most any real machine has shown; the cap exists so a
 * pathological PATH cannot turn app start into a process storm.
 */
const MAX_CANDIDATES = 8;

export type SpecstorySource = 'bundled' | 'installed';

export interface SpecstoryBinary {
  readonly source: SpecstorySource;
  /** Absolute path. Record this in the manifest, never the bare name. */
  readonly path: string;
  /** `2.8.0`, or null when the binary exists but would not identify itself. */
  readonly version: string | null;
}

export interface SpecstoryResolution {
  /** The binary gmux will actually run, or null when there is none. */
  readonly active: SpecstoryBinary | null;
  /** The copy inside gmux.app (null in dev, or if the build shipped without). */
  readonly bundled: SpecstoryBinary | null;
  /** The copy on the user's PATH, if any. */
  readonly installed: SpecstoryBinary | null;
  /**
   * EVERY specstory found on this machine, bundled first and then in PATH
   * order, each with its own version — including copies that lost, and
   * copies that would not identify themselves (`version: null`). This is what
   * Settings lists under the winner; see the file header for why one line is
   * not enough.
   */
  readonly copies: readonly SpecstoryBinary[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Lazy electron import — keeps this module loadable in plain-node tests. */
function electronApp(): {
  isPackaged: boolean;
  getAppPath(): string;
  userData(): string | null;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    if (typeof app?.getAppPath !== 'function') return null;
    return {
      isPackaged: app.isPackaged,
      getAppPath: () => app.getAppPath(),
      userData: () => {
        try {
          return app.getPath('userData');
        } catch {
          return null;
        }
      }
    };
  } catch {
    return null;
  }
}

/**
 * Where the bundled copy WOULD be. Packaged: `Contents/Resources/bin/`.
 * Unpackaged: `build/vendor/specstory/bin/`, which is what
 * `npm run vendor:specstory` fills and what electron-builder copies — so a dev
 * run can exercise the bundled path instead of only ever testing the fallback.
 */
function bundledDir(): string {
  const app = electronApp();
  if (app?.isPackaged === true) return process.resourcesPath;
  const root = app?.getAppPath() ?? process.cwd();
  return join(root, ...VENDOR_SUBPATH);
}

/** Absolute path of the bundled specstory (whether or not it exists). */
export function bundledSpecstoryPath(): string {
  return join(bundledDir(), ...BUNDLED_SUBPATH);
}

/**
 * The version the build vendored, read from the sidecar JSON — no subprocess.
 * Null when the sidecar is absent or unreadable, which is a packaging problem,
 * not a user one; the caller falls back to probing the binary.
 */
export function bundledSpecstoryVersion(): string | null {
  try {
    const raw = readFileSync(join(bundledDir(), ...BUNDLED_META), 'utf8');
    const meta = JSON.parse(raw) as { version?: unknown };
    return typeof meta.version === 'string' && meta.version.length > 0
      ? meta.version
      : null;
  } catch {
    return null;
  }
}

/**
 * The directory EVERY specstory probe runs in, and it is one gmux owns.
 *
 * A probe inherits the Electron main process's working directory unless it is
 * told otherwise — `/` under launchd, but the terminal's directory when the
 * app is started from a shell, i.e. very plausibly one of the user's
 * repositories. That is fine for a read-only probe and not fine for the next
 * one somebody adds: `specstory run <anything>` calls
 * `config.EnsureDefaultProjectConfig()` and writes `.specstory/cli/config.toml`
 * into its cwd (measured twice, docs/research/30 §0.1). So the cwd is pinned
 * here rather than at each call site, and an uninvited config file lands in
 * gmux's own state directory instead of in a repo the user is working in.
 *
 * `<userData>/gmux/` is the inner directory the rest of the app already writes
 * to (snapshots, dropped-images); the temp dir is the fallback for a plain-node
 * test with no Electron around.
 */
export function specstoryProbeCwd(): string {
  const userData = electronApp()?.userData() ?? null;
  if (userData !== null) {
    const dir = join(userData, 'gmux');
    try {
      mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      /* fall through to the temp dir */
    }
  }
  return tmpdir();
}

/**
 * The home directory specstory derives all its state from — `os.UserHomeDir()`,
 * i.e. `$HOME`, unless the verification override in the file header is set.
 * THE one answer, read by the auth reader and by every spawn env below.
 */
export function specstoryHome(): string {
  const override = process.env['GMUX_SPECSTORY_HOME'];
  return override !== undefined && override.length > 0 ? override : homedir();
}

/**
 * `~/.specstory/cli/auth.json` — the parseable auth surface, because the CLI
 * has no `whoami`/`status` command (research §1.3). Home-derived (literally
 * `utils.GetAuthPath()`), so it is the same file for the bundled and the
 * installed copy. Settings reads it; nothing else may compute this path.
 */
export function specstoryAuthPath(): string {
  return join(specstoryHome(), '.specstory', 'cli', 'auth.json');
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/**
 * `2.8.0 (SpecStory)` → `2.8.0`, and null when the output holds no version.
 *
 * THE parser is `parseSpecStoryVersionOutput` in @shared/specstory-status —
 * this module had a second one, which differed (it truncated `2.8.0-rc.1` to
 * `2.8.0`), and two answers to "what version is this binary" is exactly what
 * a version check must not have. The shared one wins because Settings and the
 * renderer already read it and it is the one with the prerelease case.
 */
export { parseSpecStoryVersionOutput } from '@shared/specstory-status';

/**
 * Ask a binary what it is. Through `runGuarded` rather than execFile for the
 * reason detection.ts documents: a probe that can hang is a probe that leaks.
 * Returns null when the binary would not run or printed nothing version-like.
 */
async function probeVersion(path: string, pathValue: string): Promise<string | null> {
  const run = await runGuarded(path, [NO_VERSION_CHECK, '--version'], {
    timeoutMs: VERSION_PROBE_TIMEOUT_MS,
    maxOutputBytes: 64 * 1024,
    cwd: specstoryProbeCwd(),
    env: { ...process.env, PATH: pathValue }
  });
  if (run.spawnError !== null || run.timedOut) return null;
  return parseSpecStoryVersionOutput(`${run.stdout}\n${run.stderr}`);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** X_OK, the same test `tmux/resolve.ts` applies — not merely "the file is there". */
function executableAt(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Follow symlinks so `/usr/local/bin` and a Cellar path are not two copies. */
function sameFileKey(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Every distinct specstory on this machine, in preference order: the bundled
 * copy, then PATH order, then the install dirs a GUI-launched app's PATH
 * misses (`extraBinDirs()` — `/opt/homebrew/bin`, `~/.local/bin`, …).
 *
 * This is deliberately NOT `resolveBinaryAgainst`, which answers a different
 * question — "the first hit" — and is right for every other caller. Here the
 * ones that lost are the point: on this machine the first hit is 2.5.0 and the
 * copy it shadows is 2.6.0.
 */
function candidatePaths(pathValue: string): { source: SpecstorySource; path: string }[] {
  const out: { source: SpecstorySource; path: string }[] = [];
  const seen = new Set<string>();
  const add = (source: SpecstorySource, path: string): void => {
    const key = sameFileKey(path);
    if (seen.has(key) || out.length >= MAX_CANDIDATES) return;
    seen.add(key);
    out.push({ source, path });
  };
  // `existsSync` for the bundled copy, `executableAt` for the rest, and the
  // asymmetry is deliberate: a file named `specstory` in a PATH dir that is
  // not executable is not a copy of specstory in any sense a shell would
  // recognise, while a bundled file that cannot exec is a PACKAGING BUG worth
  // showing — it is listed, with a null version, and it does not win.
  const bundled = bundledSpecstoryPath();
  if (existsSync(bundled)) add('bundled', bundled);
  for (const dir of [...pathValue.split(delimiter), ...extraBinDirs()]) {
    if (dir.length === 0) continue;
    const candidate = join(dir, 'specstory');
    if (executableAt(candidate)) add('installed', candidate);
  }
  return out;
}

async function probeCopy(
  candidate: { source: SpecstorySource; path: string },
  pathValue: string
): Promise<SpecstoryBinary> {
  const probed = await probeVersion(candidate.path, pathValue);
  if (candidate.source !== 'bundled') {
    return { source: 'installed', path: candidate.path, version: probed };
  }
  // For the bundled copy the sidecar written by build/fetch-specstory.cjs is
  // authoritative and free; the probe is the honest fallback AND the liveness
  // check — a bundled binary that cannot exec (bad copy, stripped exec bit,
  // wrong arch) must lose to an installed one, so a failed probe stays null
  // even when the sidecar has an opinion.
  const declared = bundledSpecstoryVersion();
  return {
    source: 'bundled',
    path: candidate.path,
    version: probed === null ? null : (declared ?? probed)
  };
}

let cached: Promise<SpecstoryResolution> | null = null;

async function resolveOnce(): Promise<SpecstoryResolution> {
  const pathValue = await getUserPath();
  const copies = await Promise.all(
    candidatePaths(pathValue).map((c) => probeCopy(c, pathValue))
  );
  // A copy that would not say what it is does not get to be the winner, and
  // does not end the search either — the next one down is asked.
  const usable = copies.filter((c) => c.version !== null);
  const bundled = usable.find((c) => c.source === 'bundled') ?? null;
  const installed = usable.find((c) => c.source === 'installed') ?? null;
  return { active: bundled ?? installed, bundled, installed, copies };
}

/**
 * The resolution, computed once per app run (concurrent callers share it).
 * Never rejects: "there is no specstory" is `active: null`, which the capture
 * toggle turns into a disabled row rather than an exception.
 */
export function resolveSpecstory(): Promise<SpecstoryResolution> {
  if (cached === null) cached = resolveOnce();
  return cached;
}

/** Test seam, and the hook for a "re-check" button in Settings. */
export function resetSpecstoryResolutionCache(): void {
  cached = null;
}

// ---------------------------------------------------------------------------
// Spawn environment
// ---------------------------------------------------------------------------

/**
 * The env for EVERY specstory spawn — the wrap, the provider probe, the
 * version probe, the session-end sync, and the Settings login/logout. There is
 * exactly one of these because a spawn that built its own could put the CLI in
 * a different home than the one gmux reads its account facts from.
 *
 * In the shipped configuration the ONLY change from the caller's env is PATH,
 * because a GUI-launched Electron app inherits launchd's minimal PATH and
 * specstory shells out to the agent binaries and to git. `HOME` is passed
 * through untouched, deliberately — it is what makes the bundled copy share
 * `~/.specstory/cli/auth.json` with the user's own, so one login serves both.
 * Do not add a "gmux-private config dir" here.
 *
 * The single exception is the `GMUX_SPECSTORY_HOME` verification override
 * (file header). When it is set, `HOME` is redirected to the same scratch
 * directory {@link specstoryAuthPath} reads from, so the reader and the writer
 * can never end up looking at different files.
 */
export async function specstoryEnv(
  base: NodeJS.ProcessEnv = process.env
): Promise<NodeJS.ProcessEnv> {
  const env: NodeJS.ProcessEnv = { ...base, PATH: await getUserPath() };
  const override = process.env['GMUX_SPECSTORY_HOME'];
  if (override !== undefined && override.length > 0) env['HOME'] = override;
  return env;
}

/**
 * `GMUX_SPECSTORY_NO_CLOUD=1` — capture and sync LOCALLY ONLY.
 *
 * It lives here, beside the spawn env, because it applies to every specstory
 * gmux starts: the wrap (`run … --no-cloud-sync`) and the session-end flush
 * (`sync … --no-cloud-sync`) both read it, and a rule that held on one and not
 * the other would be worse than no rule.
 *
 * It exists because this feature cannot be built or verified honestly without
 * it. Development drives real captures on a machine that is signed in, and
 * NOTHING gmux does during development may push a scratch session into the
 * user's SpecStory Cloud. Unset — the shipped default — it changes nothing.
 */
export function cloudDisabledByEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env['GMUX_SPECSTORY_NO_CLOUD'];
  return raw === '1' || raw === 'true';
}
