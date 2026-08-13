/**
 * resolve.ts — WHICH copy of the `skills` CLI Tortie drives, and the one
 * environment every spawn of it gets.
 *
 * The single answer to "where is the skills CLI on this machine", for the same
 * reason `specstory/resolve.ts` is the single answer for specstory,
 * `search/resolve.ts` is for ripgrep and `tmux/resolve.ts` is for tmux (growth
 * guardrail 3). Every caller comes here.
 *
 * ## What is bundled, and how it is started
 *
 * Tortie ships the pinned CLI as a plain npm tree at
 * `Contents/Resources/skills-cli/` (electron-builder.yml, produced by
 * build/fetch-skills.cjs from build/skills-release.json). It is pure
 * JavaScript, so it is started by Electron's own Node:
 *
 *     process.execPath  <resources>/skills-cli/node_modules/skills/bin/cli.mjs  …
 *     with ELECTRON_RUN_AS_NODE=1
 *
 * That is why a machine with no `node`, no `npm` and no `npx` can still install
 * a skill. It also makes `ELECTRON_RUN_AS_NODE` a standing constraint on this
 * design: there is no `electronFuses` key in electron-builder.yml and no
 * `@electron/fuses` in the tree today, and turning the `runAsNode` fuse off as
 * a hardening measure would break every skill write silently. Anybody who
 * proposes it must read this paragraph first.
 *
 * A copy on the user's PATH is started directly, because it is an ordinary
 * `#!/usr/bin/env node` shim and needs a Node on the machine to work at all.
 *
 * ## Which copy wins
 *
 * Candidates are the bundled copy plus every `skills` on the recovered
 * login-shell PATH, deduplicated by real path and capped at 8 — the same shape
 * as `candidatePaths` in specstory/resolve.ts. A candidate is eligible when it
 * answers `--version` AND that version sits inside the pinned compat band,
 * which is `[min, belowMajor.0.0)`. The winner is the highest eligible version,
 * and a tie goes to the bundled copy because it is the one this build's command
 * shapes were verified against.
 *
 * That is how both halves of the rule hold at once. The bundled copy is the
 * default, and a user who needs a newer CLI is not blocked by a Tortie release.
 * A version whose output Tortie has never parsed is never silently trusted: it
 * is listed in Settings by name and version, with the reason it was refused,
 * and it is not used.
 *
 * There is no `skills` on the operator's PATH today, so this is insurance and
 * it changes nothing on day one. Settings should say that plainly. A fix
 * published upstream on a Tuesday waits for a Tortie release unless the user
 * installs their own copy, and the panel must not imply that it heals itself.
 *
 * ## The environment, and the variables that move the target
 *
 * The CLI reads 31 environment variables and several of them relocate the
 * directories it writes to. {@link RELOCATING_ENV_VARS} names them. Tortie's
 * filesystem reader must resolve the same variables out of the same env object
 * this module builds, or the view and the CLI will point at different
 * directories on any machine where one is set. None of them is set on the
 * operator's machine, so a bug here would not show up in local testing.
 */

import { accessSync, constants, existsSync, readFileSync, realpathSync } from 'node:fs';
import type {
  SkillsCliCopy,
  SkillsCliResolution,
  SkillsCliSource,
  SkillsCompatBand,
  SkillsInvocation
} from '@shared/skills';
import { delimiter, join } from 'node:path';
import { runGuarded } from '../proc/guarded';
import { extraBinDirs, getUserPath } from '../tmux/resolve';

/** Where the bundled tree sits inside the app, relative to Resources. */
const BUNDLED_DIR = 'skills-cli';
/** Spawn-free metadata written beside it by build/fetch-skills.cjs. */
const BUNDLED_META = 'skills.json';
/** The dev/unpackaged mirror of Resources — build/fetch-skills.cjs's output. */
const VENDOR_SUBPATH = ['build', 'vendor', 'skills'] as const;
/** The CLI's own entry point inside the tree. Mirrors `entry` in the pin. */
const ENTRY_SUBPATH = ['node_modules', 'skills', 'bin', 'cli.mjs'] as const;

/** The bare name a user's own copy would have on PATH. */
const CLI_NAME = 'skills';

/** How long a `--version` probe gets before the copy is called unusable. */
const VERSION_PROBE_TIMEOUT_MS = 15_000;

/**
 * Ceiling on how many copies are probed. One spawn each, and the cap exists so
 * a pathological PATH cannot turn app start into a process storm.
 */
const MAX_CANDIDATES = 8;

/**
 * The fallback compat band, used only when the sidecar is missing — which means
 * the build shipped without the vendored tree. Keep in step with
 * build/skills-release.json; a test asserts the two agree.
 */
const FALLBACK_COMPAT_BAND: SkillsCompatBand = { min: '1.5.22', belowMajor: 2 };

/**
 * Environment variables that MOVE the directories the CLI reads and writes.
 * Read out of the CLI on 2026-08-12. The first six relocate one agent's
 * configuration directory; `XDG_STATE_HOME` moves the global lock file from
 * `~/.agents/.skill-lock.json` to `$XDG_STATE_HOME/skills/.skill-lock.json`.
 *
 * Exported because the filesystem reader that draws the panel has to resolve
 * the same list from the same env object. Two readers disagreeing about where
 * a skill lives is the defect this constant exists to prevent.
 */
export const RELOCATING_ENV_VARS = [
  'CLAUDE_CONFIG_DIR',
  'CODEX_HOME',
  'GROK_HOME',
  'VIBE_HOME',
  'HERMES_HOME',
  'AUTOHAND_HOME',
  'XDG_STATE_HOME'
] as const;

/** How a private source is reached. Passed through, never invented. */
export const CREDENTIAL_ENV_VARS = [
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'GH_HOST',
  'GIT_SSH_COMMAND'
] as const;

/**
 * The four shapes below are DECLARED IN `src/shared/skills.ts` and re-exported
 * here under the same names. They cross IPC, so `src/shared/ipc.ts` has to name
 * them, and a copy declared in main beside a copy declared in shared is how the
 * confirm starts showing a field the runner no longer sets. Every importer in
 * this directory keeps importing them from here.
 */
export type {
  SkillsCliCopy,
  SkillsCliResolution,
  SkillsCliSource,
  SkillsCompatBand,
  SkillsInvocation
} from '@shared/skills';

// ---------------------------------------------------------------------------
// Paths and the sidecar
// ---------------------------------------------------------------------------

/** Lazy electron import — keeps this module loadable in plain-node tests. */
function electronApp(): { isPackaged: boolean; getAppPath(): string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    if (typeof app?.getAppPath !== 'function') return null;
    return { isPackaged: app.isPackaged, getAppPath: () => app.getAppPath() };
  } catch {
    return null;
  }
}

/**
 * Where the bundled tree WOULD be. Packaged: `Contents/Resources/skills-cli/`.
 * Unpackaged: `build/vendor/skills/`, which is what `npm run vendor:skills`
 * fills and what electron-builder copies — so a dev run exercises the bundled
 * path instead of only ever testing the fallback.
 */
export function bundledSkillsDir(): string {
  const app = electronApp();
  if (app?.isPackaged === true) return join(process.resourcesPath, BUNDLED_DIR);
  const root = app?.getAppPath() ?? process.cwd();
  return join(root, ...VENDOR_SUBPATH);
}

/** Absolute path of the bundled CLI entry point, whether or not it exists. */
export function bundledSkillsEntry(): string {
  return join(bundledSkillsDir(), ...ENTRY_SUBPATH);
}

export interface BundledSkillsMeta {
  readonly version: string;
  readonly compatBand: SkillsCompatBand;
  readonly lockVersions: { readonly global: number; readonly project: number };
}

/**
 * What the build vendored, read from the sidecar — no subprocess. Null when the
 * sidecar is absent or unreadable, which is a packaging problem rather than a
 * user one; the caller falls back to probing the entry point.
 */
export function bundledSkillsMeta(): BundledSkillsMeta | null {
  try {
    const raw = readFileSync(join(bundledSkillsDir(), BUNDLED_META), 'utf8');
    const meta = JSON.parse(raw) as Record<string, unknown>;
    const version = meta['version'];
    if (typeof version !== 'string' || version.length === 0) return null;
    const band = meta['compatBand'] as Partial<SkillsCompatBand> | undefined;
    const locks = meta['lockVersions'] as
      | { global?: unknown; project?: unknown }
      | undefined;
    return {
      version,
      compatBand:
        typeof band?.min === 'string' && typeof band.belowMajor === 'number'
          ? { min: band.min, belowMajor: band.belowMajor }
          : FALLBACK_COMPAT_BAND,
      lockVersions: {
        global: typeof locks?.global === 'number' ? locks.global : 3,
        project: typeof locks?.project === 'number' ? locks.project : 1
      }
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

/**
 * `1.5.22\n` → `1.5.22`, and null when the output holds no version.
 *
 * The CLI prints a bare version string and nothing else, so this is
 * deliberately strict: anything that is not a leading three-part version means
 * the output shape changed under us, and per the failure table that is a failed
 * probe rather than an unknown version.
 */
export function parseSkillsVersionOutput(output: string): string | null {
  const match = /^\s*v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s*$/m.exec(output);
  return match?.[1] ?? null;
}

/** [major, minor, patch], or null when the string is not a version. */
function versionParts(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  if (left === null || right === null) return 0;
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] as number;
    const r = right[i] as number;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

/** True when `version` sits inside `[band.min, band.belowMajor.0.0)`. */
export function withinCompatBand(version: string, band: SkillsCompatBand): boolean {
  const parts = versionParts(version);
  if (parts === null) return false;
  if (parts[0] >= band.belowMajor) return false;
  return compareVersions(version, band.min) >= 0;
}

// ---------------------------------------------------------------------------
// The spawn environment
// ---------------------------------------------------------------------------

export interface SkillsEnvOptions {
  /**
   * False when the user's usage-data switch is off, which exports
   * `DO_NOT_TRACK=1` to the child. Reads send nothing either way; install,
   * remove and update send the source and the target agents to the CLI's
   * own endpoint, and this is the single switch that stops them.
   *
   * There is no usage-data switch in GmuxSettings today. The caller supplies
   * this so the wrapper does not grow a second opinion about a setting it does
   * not own. Default true, which is the CLI's own default behaviour.
   */
  readonly sendUsageData?: boolean;
  /** Set only when the user has configured their own source. */
  readonly apiUrl?: string;
  /** Set only when the user has configured their own source. */
  readonly downloadUrl?: string;
  /** Base environment. Defaults to the app's own. */
  readonly base?: NodeJS.ProcessEnv;
}

/**
 * The environment for EVERY skills CLI spawn. There is exactly one of these,
 * because a spawn that built its own could point the CLI at a different set of
 * agent directories than the reader that draws the panel.
 *
 * PATH is the recovered login-shell PATH, because a GUI-launched Electron app
 * inherits launchd's minimal one and the CLI shells out to `git` and `gh`.
 * Everything else is passed through untouched and on purpose: the six
 * configuration-directory variables, `XDG_STATE_HOME` and the four credential
 * variables are how a user points the CLI somewhere else, and scrubbing them
 * would make Tortie manage a different machine than the user's terminal does.
 */
export async function skillsEnv(
  options: SkillsEnvOptions = {}
): Promise<NodeJS.ProcessEnv> {
  const env: NodeJS.ProcessEnv = { ...(options.base ?? process.env) };
  env['PATH'] = await getUserPath();
  if (options.sendUsageData === false) env['DO_NOT_TRACK'] = '1';
  if (options.apiUrl !== undefined && options.apiUrl.length > 0) {
    env['SKILLS_API_URL'] = options.apiUrl;
  }
  if (options.downloadUrl !== undefined && options.downloadUrl.length > 0) {
    env['SKILLS_DOWNLOAD_URL'] = options.downloadUrl;
  }
  return env;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** X_OK, the same test tmux/resolve.ts applies — not merely "the file is there". */
function executableAt(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Follow symlinks so two PATH entries pointing at one file are not two copies. */
function sameFileKey(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

interface Candidate {
  readonly source: SkillsCliSource;
  readonly path: string;
  readonly invocation: SkillsInvocation;
}

function candidates(pathValue: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (candidate: Candidate): void => {
    const key = sameFileKey(candidate.path);
    if (seen.has(key) || out.length >= MAX_CANDIDATES) return;
    seen.add(key);
    out.push(candidate);
  };

  // `existsSync` for the bundled entry, `executableAt` for the rest, and the
  // asymmetry is deliberate: the bundled entry is a .mjs run by Electron's own
  // Node, so its exec bit is irrelevant, while a non-executable file named
  // `skills` in a PATH directory is not a copy in any sense a shell would
  // recognise. A bundled entry that will not run is a PACKAGING BUG worth
  // showing: it is listed, with a null version, and it does not win.
  const entry = bundledSkillsEntry();
  if (existsSync(entry)) {
    add({
      source: 'bundled',
      path: entry,
      invocation: {
        bin: process.execPath,
        prefixArgs: [entry],
        // Without this the Electron binary starts an app instead of running a
        // script. Nothing runs without it, ever.
        env: { ELECTRON_RUN_AS_NODE: '1' }
      }
    });
  }

  for (const dir of [...pathValue.split(delimiter), ...extraBinDirs()]) {
    if (dir.length === 0) continue;
    const binary = join(dir, CLI_NAME);
    if (!executableAt(binary)) continue;
    add({
      source: 'installed',
      path: binary,
      invocation: { bin: binary, prefixArgs: [], env: {} }
    });
  }
  return out;
}

async function probeCopy(
  candidate: Candidate,
  env: NodeJS.ProcessEnv,
  band: SkillsCompatBand
): Promise<SkillsCliCopy> {
  const run = await runGuarded(
    candidate.invocation.bin,
    [...candidate.invocation.prefixArgs, '--version'],
    {
      timeoutMs: VERSION_PROBE_TIMEOUT_MS,
      maxOutputBytes: 64 * 1024,
      env: { ...env, ...candidate.invocation.env }
    }
  );
  const version =
    run.spawnError !== null || run.timedOut
      ? null
      : parseSkillsVersionOutput(`${run.stdout}\n${run.stderr}`);

  if (version === null) {
    return {
      source: candidate.source,
      path: candidate.path,
      version: null,
      eligible: false,
      refusedBecause:
        run.spawnError !== null
          ? `it would not start (${run.spawnError})`
          : run.timedOut
            ? 'it did not answer --version within 15 seconds'
            : 'it did not print a version',
      invocation: candidate.invocation
    };
  }
  if (!withinCompatBand(version, band)) {
    return {
      source: candidate.source,
      path: candidate.path,
      version,
      eligible: false,
      refusedBecause: `version ${version} is outside the range Tortie drives, ${band.min} up to ${band.belowMajor}.0.0`,
      invocation: candidate.invocation
    };
  }
  return {
    source: candidate.source,
    path: candidate.path,
    version,
    eligible: true,
    refusedBecause: null,
    invocation: candidate.invocation
  };
}

async function resolveOnce(): Promise<SkillsCliResolution> {
  const band = bundledSkillsMeta()?.compatBand ?? FALLBACK_COMPAT_BAND;
  const pathValue = await getUserPath();
  const env = await skillsEnv();
  const copies = await Promise.all(
    candidates(pathValue).map((candidate) => probeCopy(candidate, env, band))
  );

  const bundled = copies.find((copy) => copy.source === 'bundled') ?? null;
  // Highest eligible version wins; a tie goes to the bundled copy, which is the
  // one this build's command shapes were verified against.
  let active: SkillsCliCopy | null = null;
  for (const copy of copies) {
    if (!copy.eligible || copy.version === null) continue;
    if (active === null) {
      active = copy;
      continue;
    }
    const order = compareVersions(copy.version, active.version as string);
    if (order > 0) active = copy;
  }

  return { active, bundled, copies, bundledEntryPath: bundledSkillsEntry(), compatBand: band };
}

let cached: Promise<SkillsCliResolution> | null = null;

/**
 * The resolution, computed once per app run (concurrent callers share it).
 * Never rejects: "there is no usable skills CLI" is `active: null`, which the
 * panel turns into disabled write controls and one honest line rather than an
 * exception.
 */
export function resolveSkillsCli(): Promise<SkillsCliResolution> {
  if (cached === null) cached = resolveOnce();
  return cached;
}

/** Test seam, and the hook for a re-check button in Settings. */
export function resetSkillsResolutionCache(): void {
  cached = null;
}

/**
 * The one line the panel shows when there is no usable copy, and the one every
 * refusal repeats. It lives here so the message is written once: the plan path
 * and the capability summary both need it, and two wordings for one condition
 * is how a user ends up unable to search for the sentence they were shown.
 *
 * It always names the path that was tried. This is the packaging-mistake case
 * and it must be loud.
 */
export function skillsUnavailableMessage(resolution: SkillsCliResolution): string {
  const head = 'Skill installing is unavailable in this build.';
  if (resolution.bundled === null) {
    return `${head} Tortie looked for its skills CLI at ${resolution.bundledEntryPath} and there is nothing there.`;
  }
  return (
    `${head} The skills CLI at ${resolution.bundledEntryPath} was found but not used, because ` +
    `${resolution.bundled.refusedBecause ?? 'it could not be used'}.`
  );
}
