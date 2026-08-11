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

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseSpecStoryVersionOutput } from '@shared/specstory-status';
import { runGuarded } from '../proc/guarded';
import { extraBinDirs, getUserPath, resolveBinaryAgainst } from '../tmux/resolve';

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
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Lazy electron import — keeps this module loadable in plain-node tests. */
function electronApp(): { isPackaged: boolean; getAppPath(): string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    return typeof app?.getAppPath === 'function'
      ? { isPackaged: app.isPackaged, getAppPath: () => app.getAppPath() }
      : null;
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
    env: { ...process.env, PATH: pathValue }
  });
  if (run.spawnError !== null || run.timedOut) return null;
  return parseSpecStoryVersionOutput(`${run.stdout}\n${run.stderr}`);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

async function probeBundled(pathValue: string): Promise<SpecstoryBinary | null> {
  const path = bundledSpecstoryPath();
  if (!existsSync(path)) return null;
  // The sidecar is authoritative and free; the probe is the honest fallback
  // AND the liveness check — a bundled binary that cannot exec (bad copy,
  // stripped exec bit, wrong arch) must lose to the installed one.
  const declared = bundledSpecstoryVersion();
  const probed = await probeVersion(path, pathValue);
  if (probed === null) return null;
  return { source: 'bundled', path, version: declared ?? probed };
}

async function probeInstalled(pathValue: string): Promise<SpecstoryBinary | null> {
  // extraBinDirs() passed explicitly (it is also the default) so the dirs a
  // GUI-launched app's PATH misses — /opt/homebrew/bin, ~/.local/bin — are
  // named at the call site, and so a test can control them.
  const path = resolveBinaryAgainst('specstory', pathValue, extraBinDirs());
  if (path === null) return null;
  const version = await probeVersion(path, pathValue);
  if (version === null) return null;
  return { source: 'installed', path, version };
}

let cached: Promise<SpecstoryResolution> | null = null;

async function resolveOnce(): Promise<SpecstoryResolution> {
  const pathValue = await getUserPath();
  const [bundled, installed] = await Promise.all([
    probeBundled(pathValue),
    probeInstalled(pathValue)
  ]);
  return { active: bundled ?? installed, bundled, installed };
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
