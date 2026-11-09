/**
 * Agent detection service (Phase 10 — BACKLOG item 2, research 11 §3).
 *
 * For every registry entry: resolve the binary to an ABSOLUTE path via the
 * ONE shared resolver (src/main/tmux/resolve.ts — captured login-shell PATH
 * + install dirs + the entry's own extraProbeDirs), check the session-store
 * roots (an agent whose store exists is installed AND in use — a stronger
 * signal than a binary on PATH), and run the entry's versionCmd as a
 * timeout-guarded identity probe.
 *
 * Results are cached after the first scan; agents:rescan drops the cache and
 * re-probes (Settings "Re-scan" button). IDE entries (cursoride/copilotide)
 * are detected by store existence only — deliberately no subprocess, exactly
 * like SpecStory.
 *
 * Pure Node (no Electron import) so the pure helpers are unit-testable.
 *
 * ## Phase 23: which table is scanned
 *
 * The list of agents to probe is no longer `AGENT_REGISTRY` directly. It comes
 * from {@link setAgentTableSource}, which defaults to the compiled registry and
 * which boot replaces with the merged table from src/main/config/store.ts.
 *
 * The dependency is inverted on purpose. The overlay store imports Electron
 * (for `app.getPath`) and a file watcher, and this module must not, because its
 * helpers are unit-tested as plain Node. So the store pushes its table in
 * rather than this module pulling it out. It is the same seam
 * `setConfigRowSource` uses in src/main/config/ipc.ts.
 *
 * The provider returns MEMORY. It is called once per scan and it must never
 * read the disk, which is what keeps the configuration file off every path
 * that reaches a scan.
 *
 * ## Phase 335: which launches run a version probe
 *
 * Every ordinary launch probes every agent it resolves, exactly as before.
 * A harness launch, being `GMUX_SMOKE` or `GMUX_SHOT` (`isIsolatedLaunch`),
 * still resolves every binary and reads every store, and starts no version
 * probe at all, because `dispatchHarness` returns before the configuration
 * overlay is installed and four of the agents a scan finds update themselves
 * the moment they start, `--version` included (the operator's rule of
 * 2026-09-29; Phase 316.6's reverify caught `agy --version` under
 * `smoke:t1`). {@link versionProbeHeld} is asked in front of every spawn this
 * module makes, and its first statement answers no for every other launch.
 *
 * A harness mode that READS a version names the agents it needs before its
 * first scan, through {@link nameHarnessVersionProbes}. Exactly two do, and
 * `npm run conformance:harnessprobes` holds the list: the shadow smoke names
 * its own two `droid` copies inside its profile, and the resume conformance
 * names the agents it was asked for. The default names nothing, so a mode
 * written later probes nothing until it says why.
 *
 * ## Phase 350: pi's floor is read from this scan, and nothing new starts one
 *
 * pi's inline token (`PI_INLINE_ARGS`) is composed only for a pi this Mac's
 * scan read at `PI_INLINE_FLOOR` or later, so four readers are added beside
 * the scan and none of them is a second scan. {@link piInlineFloorFor} reads
 * the last RESOLVED scan, as `peekDetectedAgents` does, for ONE binary: it
 * answers `unread` until a scan exists, and for any file but the one the scan
 * read pi's version from, as that file was when it was read (the fix round,
 * below). {@link piOwnResumeArgv} composes a row's own resume command from the
 * table this module scans, with no token of Tortie's, so a person's own
 * `--tui-mode` is told from Tortie's. {@link firstScanAnswered} settles when
 * the first scan in this process resolves and starts nothing; the boot pass
 * that brings recorded pi rows across waits on it.
 * {@link warmDetectionForLocalPi} starts the one memoised scan for a manifest
 * holding a local pi row a person would see, and it is asked at this
 * process's first terminal bytes rather than at boot, because Phase 164
 * measured that the boot's probes made the first attach slower (cold p50
 * 472.6 to 449.5 ms once they left it). Phase 335's hold applies to all of it
 * unchanged, because the scan is the same function: a harness launch that
 * names no pi reads no pi version and composes no token.
 *
 * THE FLOOR IS A FACT ABOUT ONE FILE (the Phase 350 fix round). A version is
 * read from the binary the scan resolved, and a recorded row runs the absolute
 * binary its own argv names, which need not be that one: two pi installs (a
 * Homebrew pi beside an npm one, or one per Node under nvm) put rows of each
 * in one manifest, and a pi reinstalled while Tortie runs leaves the memoised
 * scan reading a file that is no longer there. So before each primary probe
 * the scan records what the file IS (its real path, device, inode, size,
 * modified and changed times; never its name alone), and the floor holds for a
 * binary only when that binary is, now, the very file the version was read
 * from. Every other binary reads `unread`: no token is composed for it, the
 * pass moves none of its rows, and restore takes Tortie's token out of what
 * it arms for it, which is how every pi ran before this phase.
 *
 * ONLY PI'S OWN PACKAGE (his ruling of 2026-11-02, R1). One file is not
 * enough: a version manager's shim (mise, rtx, asdf, volta, proto) is ONE
 * file whose real path is the manager's dispatcher, and the dispatcher picks
 * pi's version each time it runs, by the folder it runs in or by the hour, so
 * the scan's reading of it says nothing about the pi a project pinned below
 * 0.84.0 will be (the reverify measured that pi stopping after its trust
 * question at every launch). So {@link piInlineFloorFor} also asks
 * {@link insidePiPackage}: the floor holds only for a binary whose real file
 * sits inside pi's own installed package, the nearest package.json above it
 * naming `PI_PACKAGE_NAME`. A shim, pnpm's shell shim, any wrapper script, a
 * copy of pi's file outside its package, or a package.json that cannot be
 * read all read `unread`, and pi runs there exactly as it did before this
 * phase. Files are read, never run.
 *
 * THE FILE THAT RUNS (his ruling of 2026-11-02, the second ruled round: "Check
 * the file that runs"). A create spawns pi by its BARE NAME (Phase 12.7 F3),
 * and the pane's execvp walks the pane's PATH from the folder tmux starts it
 * in, so a relative entry (`node_modules/.bin`, the common
 * `export PATH=./node_modules/.bin:$PATH`) finds a project's own pi there,
 * which may be below 0.84.0, while the scan read the global one. So a create
 * that spawns by the bare name hands {@link piInlineFloorFor} how its pane
 * will look ({@link BareNameSpawn}), and the floor holds only when
 * {@link bareNameSpawnFile}, the one resolver, finds that very file by device
 * and inode ({@link bareNameSpawnRuns}). Anything else reads `unread`, and pi
 * starts exactly as it did before this phase. Files are read, never run.
 */

import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  type BigIntStats
} from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import { stripAnsi } from '../ansi';
import { isIsolatedLaunch } from '../harness/launch-gate';
import { runGuarded } from '../proc/guarded';
import {
  extraBinDirs,
  getUserPath,
  resolveBinaryAgainst,
  resolveBinaryAllAgainst
} from '../tmux/resolve';
// DIRECT, not through the ./index barrel: this module is imported by that
// barrel, and health.ts is a leaf beside it.
import { checkAgentBinary, type AgentRuntime } from './health';
import type {
  AgentInstallInfo,
  AgentRegistryEntry,
  InlineFloorReading,
  InstallSignature,
  LaunchableEntryLike,
  VersionProbe
} from './registry';
import { AGENT_REGISTRY, PI_PACKAGE_NAME, piInlineFloor, resumeArgvFor } from './registry';
import { getLog } from '../log';

/**
 * Scope "agents" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const agentsLog = getLog('agents');


/**
 * How long a versionCmd may run before it is killed and version stays null.
 *
 * 10,000 ms since Phase 49. It was 4,000 ms. Research 47 §4.4 measured gemini
 * at a 6937 ms median at one point on one machine, and 3 of 6 runs crossed
 * 4,000 ms there. The scan is parallel and cached, so a larger budget costs
 * nothing when nothing is slow, and the create path can no longer wait on a
 * probe at all (`peekDetectedAgents` below), so nothing a person is waiting
 * for sits behind this number.
 */
export const VERSION_PROBE_TIMEOUT_MS = 10_000;

/**
 * A registry entry as detection needs it: everything the compiled entry has,
 * with the id widened so a configured agent fits.
 *
 * This is NOT the overlay type and it is not exported to the renderer. It is
 * the smallest shape this module actually reads, written here so the module
 * keeps compiling against the compiled registry alone.
 *
 * `install` is nullable here (Phase 49): the compiled entry always carries a
 * map, and a configured agent's merged row carries null, because Tortie has
 * read no provider page for an agent the user's own file created.
 */
export type DetectableAgentEntry = Omit<AgentRegistryEntry, 'id' | 'install'> & {
  id: string;
  install: AgentInstallInfo | null;
};

/** The table a scan walks. Memory only — a provider must never read the disk. */
export type AgentTableSource = () => readonly DetectableAgentEntry[];

const COMPILED_TABLE: AgentTableSource = () => AGENT_REGISTRY;

let agentTable: AgentTableSource = COMPILED_TABLE;

/**
 * Point detection at the merged agent table. Called once during boot, by
 * `initAgentOverlay`, after its first read.
 *
 * Before that call, and in every test and harness that never makes it, a scan
 * walks exactly the compiled thirteen. That is the correct answer for a machine
 * with no configuration file, so nothing has to be wired for the ordinary case
 * to be right.
 */
export function setAgentTableSource(next: AgentTableSource): void {
  agentTable = next;
}

/** Put detection back on the compiled registry. Tests only. */
export function resetAgentTableSource(): void {
  agentTable = COMPILED_TABLE;
}

// ---------------------------------------------------------------------------
// Pure path helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Expand `~/` and `$VAR`/`${VAR}` tokens in a registry path. Returns null
 * when a referenced env var is unset/empty — the dir simply does not apply
 * on this machine ($CODEX_HOME, $NVM_BIN, $PI_CODING_AGENT_DIR, …).
 */
export function expandPath(
  input: string,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir()
): string | null {
  let missing = false;
  let out = input.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_m, braced: string | undefined, bare: string | undefined) => {
      const value = env[braced ?? bare ?? ''];
      if (value === undefined || value.length === 0) {
        missing = true;
        return '';
      }
      return value;
    }
  );
  if (missing) return null;
  if (out === '~') out = home;
  else if (out.startsWith('~/')) out = join(home, out.slice(2));
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Expand ONE `*` path segment against the filesystem (codex's
 * `~/.nvm/versions/node/*╱bin` probe dir). Non-glob paths pass through.
 */
export function expandStarSegment(path: string): string[] {
  if (!path.includes('*')) return [path];
  const parts = path.split('/');
  const starIdx = parts.findIndex((seg) => seg.includes('*'));
  const starSeg = parts[starIdx];
  if (starSeg === undefined) return [path];
  const prefix = parts.slice(0, starIdx).join('/') || '/';
  const suffix = parts.slice(starIdx + 1).join('/');
  const re = new RegExp(
    `^${starSeg.split('*').map(escapeRegExp).join('.*')}$`
  );
  let names: string[];
  try {
    names = readdirSync(prefix);
  } catch {
    return [];
  }
  return names
    .filter((n) => re.test(n))
    .sort()
    .reverse() // nvm: newest node version dirs first
    .map((n) => (suffix.length > 0 ? join(prefix, n, suffix) : join(prefix, n)));
}

/** Expand a registry dir list: env vars, tilde, single-`*` globs. */
export function expandDirs(
  dirs: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir()
): string[] {
  const out: string[] = [];
  for (const dir of dirs) {
    const expanded = expandPath(dir, env, home);
    if (expanded === null) continue;
    out.push(...expandStarSegment(expanded));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Version probe (exported pure parts for tests)
// ---------------------------------------------------------------------------

/**
 * Strip ANSI escape sequences (droid colors its --version output).
 *
 * Re-exported from `main/ansi.ts` — this module used to carry its own weaker
 * copy with no OSC branch and no `:` in the CSI parameter class, so an agent
 * whose `--version` output used colon-SGR or an OSC title left escape residue
 * in `extractVersion()`'s answer, and therefore in the `helpVerifiedVersion`
 * comparand and the text in Settings → Agents (research 25 §3 B1).
 */
export { stripAnsi };

/**
 * Distill a version string from raw probe output. Default: first non-empty
 * line. 'strip-ansi-last-line' is droid's documented quirk (strip ANSI, take
 * the last line). Returns null for effectively-empty output.
 */
export function extractVersion(
  raw: string,
  postProcess: VersionProbe['postProcess'] = 'first-line'
): string | null {
  const lines = stripAnsi(raw)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const line = postProcess === 'strip-ansi-last-line' ? lines[lines.length - 1] : lines[0];
  return line ?? null;
}

/**
 * Run `bin args…`; resolve combined stdout+stderr, or null on failure.
 *
 * Through runGuarded, not execFile (Phase 13.8's leak sweep). An agent CLI is
 * a node wrapper that may fork; execFile's callback fires on stdio CLOSE, so
 * one forked child holding stdout would hang the whole availability scan
 * forever AND leave the fork behind — the same shape as the `zsh -lic` probe
 * that leaked for 19 hours. runGuarded always settles and kills the group.
 */
/** What one probe run produced, with the two streams kept apart. */
interface ProbeOutput {
  /** stdout and stderr joined, which is what a version is read out of. */
  combined: string;
  /** stdout alone, which is the only stream an identity is judged on. */
  stdout: string;
}

/**
 * Every subprocess this module has ever started in this process (Phase 49).
 *
 * The number exists so "the version probe is unreachable from the create
 * path" is executable rather than asserted: the unit test beside this module
 * and `npm run conformance:agents` both drive the create path's read and then
 * require this to still be 0.
 */
let probeCount = 0;

/** Test and gate hook. How many version probes have run in this process. */
export function versionProbeCount(): number {
  return probeCount;
}

function execProbe(
  bin: string,
  args: readonly string[],
  pathValue: string
): Promise<ProbeOutput | null> {
  probeCount += 1;
  return runGuarded(bin, args, {
    timeoutMs: VERSION_PROBE_TIMEOUT_MS,
    maxOutputBytes: 256 * 1024,
    // Node-shebang CLIs need a real PATH to find their interpreter.
    env: { ...process.env, PATH: pathValue }
  }).then((r) => {
    const combined = `${r.stdout}\n${r.stderr}`.trim();
    // Some CLIs print the version yet exit non-zero; use any output. No
    // output at all is a failed probe whatever the exit code said — the
    // caller falls back to probe.fallbackArgs on null.
    return combined.length > 0 ? { combined, stdout: r.stdout.trim() } : null;
  });
}

interface VersionProbeResult {
  version: string | null;
  /** True when output arrived but the identity substring was absent — the
   *  binary wearing this name is NOT the agent (e.g. a different `claude`). */
  identityFailed: boolean;
}

/**
 * Judge the identity on STDOUT ALONE, and only when there is some.
 *
 * PHASE 48 FIX ROUND, and this is the line that made state B unreachable for
 * claude on a fresh boot, which is the exact machine in the operator's bug
 * report. The identity test used to read stdout and stderr joined. An npm shim
 * whose interpreter is missing prints nothing to stdout and
 * "env: node: No such file or directory" to stderr, so the joined text was not
 * empty, it did not contain "(Claude Code)", and the row was marked NOT
 * INSTALLED. The tile then read "Claude Code — not installed", the click was
 * refused before any create could be attempted, and the sheet offered
 * `npm install -g @anthropic-ai/claude-code`, which is the one piece of advice
 * launch-plan.ts says must never be printed for this failure. codex has no
 * `identitySubstring`, so the identical breakage reached the full refusal
 * there. Of the thirteen compiled rows exactly two carry an identity
 * substring, claude ('(Claude Code)') and, since Phase 59, grok ('grok '),
 * so this stdout-only rule now protects both of them.
 *
 * The test still does its job. A DIFFERENT program wearing the name `claude`
 * that runs and prints its own version to stdout is still refused, which is
 * what `identitySubstring` was added for. What no longer happens is a program
 * that could not run at all being reported as an impostor.
 */
function identityMissing(probe: VersionProbe, out: ProbeOutput): boolean {
  return (
    probe.identitySubstring !== undefined &&
    !out.combined.includes(probe.identitySubstring)
  );
}

async function runVersionProbe(
  binPath: string,
  probe: VersionProbe,
  pathValue: string
): Promise<VersionProbeResult> {
  let out = await execProbe(binPath, probe.args, pathValue);
  if (out === null && probe.fallbackArgs !== undefined) {
    out = await execProbe(binPath, probe.fallbackArgs, pathValue);
  }
  if (out === null) return { version: null, identityFailed: false };
  if (identityMissing(probe, out)) {
    // No version either way: text that is not the agent's own greeting is not
    // this agent's version, so Settings shows nothing rather than showing an
    // error message where a number belongs. Only the second half, the claim
    // that something ELSE wears this name, needs stdout to stand on.
    return { version: null, identityFailed: out.stdout.length > 0 };
  }
  return {
    version: extractVersion(out.combined, probe.postProcess),
    identityFailed: false
  };
}

// ---------------------------------------------------------------------------
// Install kind (Phase 49, research 47 §5 and §10) — pure, exported for tests
// ---------------------------------------------------------------------------

/**
 * Does one path-shape signature hold for this resolved copy?
 *
 * Filesystem stat only, never a subprocess. A signature that fails to match
 * never blocks anything; its only effect is the advisory `installKind` value.
 */
export function signatureMatches(
  sig: InstallSignature,
  realPath: string,
  home: string = homedir()
): boolean {
  switch (sig.kind) {
    case 'realpath-under': {
      const dir = expandPath(sig.dir, {}, home);
      if (dir === null) return false;
      return liesUnder(realPath, dir);
    }
    case 'marker-file': {
      const path = expandPath(sig.path, {}, home);
      return path !== null && existsSync(path);
    }
    case 'sibling-glob': {
      const re = new RegExp(
        `^${sig.glob.split('*').map(escapeRegExp).join('.*')}$`
      );
      let names: string[];
      try {
        names = readdirSync(dirname(realPath));
      } catch {
        return false;
      }
      return names.some((n) => re.test(n));
    }
  }
}

/**
 * How the resolved copy reached the disk, in this order: a signature that
 * matches answers canonical; a real path through node_modules or a Homebrew
 * Cellar answers package-manager; everything else is the honest unknown.
 */
export function installKindOf(
  realPath: string,
  signature: readonly InstallSignature[] | null,
  home: string = homedir()
): 'canonical' | 'package-manager' | 'unknown' {
  if (
    signature !== null &&
    signature.some((sig) => signatureMatches(sig, realPath, home))
  ) {
    return 'canonical';
  }
  if (
    realPath.includes('/node_modules/') ||
    realPath.startsWith('/opt/homebrew/Cellar/') ||
    realPath.startsWith('/usr/local/Cellar/')
  ) {
    return 'package-manager';
  }
  return 'unknown';
}

/** The display slice of an install map, or null when there is no command. */
function displayInstallOf(info: AgentInstallInfo | null): DetectedAgent['install'] {
  if (info === null || info.canonical === null) return null;
  return {
    command: info.canonical.command,
    docUrl: info.canonical.docUrl,
    readOn: info.canonical.readOn,
    canonicalIsPackageManager: info.canonicalIsPackageManager
  };
}

/** realpathSync that answers the input when the disk cannot answer. */
function realOf(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * PHASE 350 FIX ROUND. What one file IS, read off the disk: its real path and
 * its device, inode, size, modified and changed times. Two readings of one file
 * agree only while nothing has replaced or rewritten it; a reinstall makes a new
 * file (a new inode, a new changed time) even where it keeps the name, the size
 * and, as npm sets every installed file's, the modified time.
 */
interface FileIdentity {
  readonly real: string;
  readonly dev: number;
  readonly ino: number;
  readonly size: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
}

/** The file `path` names, followed through every link, or null when it is no regular file now. Filesystem only. */
function fileIdentityOf(path: string): FileIdentity | null {
  try {
    const real = realpathSync(path);
    const st = statSync(real);
    if (!st.isFile()) return null;
    return { real, dev: st.dev, ino: st.ino, size: st.size, mtimeMs: st.mtimeMs, ctimeMs: st.ctimeMs };
  } catch {
    return null;
  }
}

/** TRUE when two readings are of the same file, unchanged between them. */
function sameFile(a: FileIdentity, b: FileIdentity): boolean {
  return (
    a.real === b.real &&
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  );
}

/** PHASE 350, R1. The largest package.json {@link insidePiPackage} reads; pi 0.84.2's own is 3,914 bytes. */
const PACKAGE_JSON_CAP = 1024 * 1024;

/**
 * PHASE 350, HIS RULING OF 2026-11-02 (R1). TRUE when the real file `bin`
 * names, every link followed, sits inside pi's OWN installed package: the
 * nearest `package.json` above that file, walking up from its folder, is a
 * readable regular file whose `name` is `PI_PACKAGE_NAME`.
 *
 * True for npm's global link (`<prefix>/bin/pi` to
 * `../lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js`, which is
 * how pi 0.84.2 is installed on this Mac), for bun's global link (bun links its
 * global bins into the package; read on this Mac), for any second link to
 * either, and for pi's own binary beside the package.json its build copies
 * there. False for everything else: a version manager's shim or dispatcher
 * (mise, rtx, asdf, volta, proto, an nvm-style wrapper), whose real file is the
 * manager's own and whose pi version it chooses each time it runs; pnpm's
 * shell shim; any wrapper script; a copy of pi's file outside its package; a
 * nearer package.json that names another package or none; and one that cannot
 * be read or parsed. FILES ARE READ, NEVER RUN: one realpath, then a look and
 * at most one read of one small file per folder walked; no process starts and
 * no scan begins. The one reader is {@link piInlineFloorFor}.
 */
export function insidePiPackage(bin: string): boolean {
  let dir: string;
  try {
    dir = dirname(realpathSync(bin));
  } catch {
    return false;
  }
  for (;;) {
    const manifest = join(dir, 'package.json');
    let present = true;
    try {
      lstatSync(manifest);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      // Not here: walk up. Anything else is a folder this process cannot read.
      if (code !== 'ENOENT' && code !== 'ENOTDIR') return false;
      present = false;
    }
    if (present) {
      // The nearest one decides, read or not: a link that leads nowhere, a
      // folder, a file too large, one this process cannot open or that is not
      // JSON is a package that cannot be read, and that is no reading.
      try {
        const st = statSync(manifest);
        if (!st.isFile() || st.size > PACKAGE_JSON_CAP) return false;
        const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
        return typeof parsed === 'object' && parsed !== null && (parsed as { name?: unknown }).name === PI_PACKAGE_NAME;
      } catch {
        return false;
      }
    }
    const up = dirname(dir);
    if (up === dir) return false;
    dir = up;
  }
}

/**
 * PHASE 350, HIS RULING OF 2026-11-02, THE SECOND RULED ROUND ("Check the
 * file that runs"). How a create's pane will start pi when it spawns it by its
 * BARE NAME (Phase 12.7 F3, `spawnArgvFor` in ../sessions/launch-plan.ts),
 * which every create of a pi the login PATH finds does: the desk's, the
 * phone's start and Restart's replacement.
 */
export interface BareNameSpawn {
  /** argv[0] as the pane gets it: a name with no `/` in it. */
  readonly name: string;
  /**
   * The PATH the pane's execvp walks. tmux gives a pane the PATH of the CLIENT
   * that asked for it, and this process is that client: the value
   * ../tmux/user-path.ts writes into it, once.
   */
  readonly path: string;
  /** The folder the create hands tmux, which tmux changes into before it execs. */
  readonly folder: string;
}

/** What {@link bareNameSpawnFile} found: where, as its walk spelled it, and that file's device and inode, every link followed. */
export interface SpawnedFile {
  readonly at: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

/**
 * THE ONE RESOLVER (the second ruled round): the file a pane spawned by its
 * bare name runs, found the way execvp finds it in that pane. `spawn.path` is
 * walked in order: an absolute entry is itself; a relative entry is read from
 * the session's OWN folder, the one tmux changes into, and never from this
 * process's (`node_modules/.bin`, `./node_modules/.bin`, `.`, a project's
 * `bin`); an empty entry, a leading, trailing or doubled colon, is that folder
 * itself. The first entry holding an executable regular file of that name,
 * every link followed, is the answer, and an entry holding none (no such file,
 * a folder of that name, a file this user may not run, a link to nothing) is
 * passed over, as execvp passes it over.
 *
 * `null` when no entry holds one; when the folder is not an absolute folder
 * this process may enter (tmux could not enter it either, and starts the pane
 * in the home folder instead); and when anything the walk must look through
 * cannot be read, a folder it may not search or a link that loops, because then
 * the file the pane runs is not known. A candidate is spelled by joining
 * strings and never normalised, so a `..` is resolved by the kernel through the
 * folder's own links, as the pane's lookup resolves it. FILES ARE READ, NEVER
 * RUN: a stat and an access check per entry, and nothing starts.
 *
 * A FOLDER HOLDING A `#`, OR ENDING IN `;`, IS WALKED LIKE ANY OTHER since
 * Phase 353. His rulings of 2026-11-03 and 2026-11-04 read such a folder as
 * unread, because tmux read `new-session -c` as a format and ended a command at
 * an argument ending in `;`, so the pane did not start there. The create now
 * hands tmux the folder held back (`tmuxFolderArgument` in
 * ../tmux/argument.ts), so the pane starts in exactly the folder this walk
 * starts from, and the two clauses went with the cause.
 */
export function bareNameSpawnFile(spawn: BareNameSpawn): SpawnedFile | null {
  const { name, path, folder } = spawn;
  if (name.length === 0 || name.includes('/') || !folder.startsWith('/')) return null;
  try {
    if (!statSync(folder).isDirectory()) return null;
    accessSync(folder, constants.X_OK);
  } catch {
    return null;
  }
  for (const entry of path.split(delimiter)) {
    const dir = entry.length === 0 ? folder : entry.startsWith('/') ? entry : `${folder}/${entry}`;
    const at = `${dir}/${name}`;
    let st: BigIntStats;
    try {
      st = statSync(at, { bigint: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      // Nothing here, as execvp reads ENOENT and ENOTDIR: the next entry.
      if (code === 'ENOENT' || code === 'ENOTDIR') continue;
      return null;
    }
    if (!st.isFile()) continue;
    try {
      accessSync(at, constants.X_OK);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EACCES') continue;
      return null;
    }
    return { at, dev: st.dev, ino: st.ino };
  }
  return null;
}

/**
 * TRUE when the file a pane spawned by its bare name runs IS `bin`: one device
 * and one inode, each followed through every link to its real file, and never
 * one spelling, so a second link, a hard link, a linked folder on the PATH and
 * a `..` are the same file and a project's own pi, a binstub or a shim is
 * another. No case folding and no normalising. Files are read, never run.
 */
export function bareNameSpawnRuns(spawn: BareNameSpawn, bin: string): boolean {
  const runs = bareNameSpawnFile(spawn);
  if (runs === null) return false;
  try {
    const st = statSync(bin, { bigint: true });
    return st.dev === runs.dev && st.ino === runs.ino;
  } catch {
    return false;
  }
}

/**
 * Whether `path` lies STRICTLY under `dir`: the directory itself is not under
 * itself, and `/a/b-c` is not under `/a/b`. Compared as written, with no case
 * folding and no normalisation, so a caller hands it real paths. The one
 * spelling of the `realpath-under` idiom, shared by `signatureMatches` and
 * {@link versionProbeHeld}.
 */
function liesUnder(path: string, dir: string): boolean {
  return path.startsWith(dir.endsWith('/') ? dir : `${dir}/`);
}

// ---------------------------------------------------------------------------
// Phase 335: the harness launch's version probes (see the header)
// ---------------------------------------------------------------------------

/** What a harness mode names before its first scan. */
export interface HarnessVersionProbes {
  /** Registry ids this harness mode reads a version of. */
  readonly agents: readonly string[];
  /** When set, a named agent is probed only for a copy whose REAL path lies under this directory. */
  readonly within?: string;
}

/**
 * The naming in force. The default names nothing, and
 * {@link nameHarnessVersionProbes} is the one place that replaces it.
 * `resetDetectionCache` leaves it alone on purpose: narrowing back is
 * `nameHarnessVersionProbes({ agents: [] })`.
 */
let harnessNaming: { readonly agents: readonly string[]; readonly withinReal: string | null } = {
  agents: [],
  withinReal: null
};

/**
 * Name the agents a harness mode reads a version of. Called by the shadow
 * smoke and the resume conformance before their core boots, and by nothing
 * else (`npm run conformance:harnessprobes`). In an ordinary launch it changes
 * nothing, because {@link versionProbeHeld} answers before it reads the naming.
 */
export function nameHarnessVersionProbes(named: HarnessVersionProbes): void {
  harnessNaming = {
    agents: [...named.agents],
    withinReal: named.within === undefined ? null : realOf(named.within)
  };
}

/**
 * Whether the version probe of one resolved copy of one agent is HELD, that is
 * not started. Asked in front of every spawn this module makes.
 *
 * In order: an ordinary launch holds nothing, and that is the first statement,
 * so it reads nothing else; a harness launch holds every agent its mode did
 * not name; a named agent with no `within` is probed; and a named agent with a
 * `within` is probed only for a copy whose real path lies strictly under that
 * directory's real path, so a symlink planted inside it that points outside is
 * held.
 */
export function versionProbeHeld(
  agentId: string,
  path: string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!isIsolatedLaunch(env)) return false;
  if (!harnessNaming.agents.includes(agentId)) return true;
  if (harnessNaming.withinReal === null) return false;
  return !liesUnder(realOf(path), harnessNaming.withinReal);
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

async function detectOne(
  entry: DetectableAgentEntry,
  userPath: string,
  // PHASE 350 FIX ROUND. This scan's own record of the file each primary
  // version probe ran, by agent id; see the header.
  readFrom: Map<string, FileIdentity>
): Promise<DetectedAgent> {
  const storeDetected = expandDirs(entry.storeDirs).some((dir) => existsSync(dir));

  // Resolve the binary for BOTH kinds (fs-only, no subprocess): IDE entries
  // report it for display, but their installed signal is the store.
  let binPath: string | null = null;
  let winningBare: string | null = null;
  const probeDirs = [...expandDirs(entry.extraProbeDirs), ...extraBinDirs()];
  for (const bin of entry.binaries) {
    const hit = resolveBinaryAgainst(bin, userPath, probeDirs);
    if (hit !== null) {
      binPath = hit;
      winningBare = bin;
      break;
    }
  }

  // The guard against a cast test fixture: the compiled table always carries
  // the field, and a fixture that skipped it reads as "no map", never a throw.
  const install = displayInstallOf(entry.install ?? null);

  const base: DetectedAgent = {
    id: entry.id,
    displayName: entry.displayName,
    kind: entry.kind,
    launchable: entry.launchable,
    installed: false,
    binPath,
    version: null,
    storeDetected,
    iconKey: entry.iconKey,
    unverified: entry.unverified,
    install,
    installKind: 'unknown',
    runtime: null,
    realPath: null,
    shadowed: [],
    overridden: false
  };

  if (entry.kind === 'ide') {
    // SpecStory rule: IDE detection is store existence, never a subprocess.
    return { ...base, installed: storeDetected };
  }
  if (binPath === null || winningBare === null) return base;

  // Phase 49, research 47 §5. Everything below runs IN PARALLEL: the primary
  // version probe, the health read (one file open, cached, never a spawn),
  // and one probe per shadowed copy. All of it is scan-time only; the create
  // path can no longer reach any of it (see peekDetectedAgents).
  const realPath = realOf(binPath);

  // Every later hit for the SAME name that won, deduped by real path against
  // the used copy and against each other, capped at 4.
  const seenReals = new Set([realPath]);
  const shadowPaths: string[] = [];
  for (const hit of resolveBinaryAllAgainst(winningBare, userPath, probeDirs)) {
    if (hit === binPath) continue;
    const real = realOf(hit);
    if (seenReals.has(real)) continue;
    seenReals.add(real);
    shadowPaths.push(hit);
    if (shadowPaths.length >= 4) break;
  }

  const probe = entry.versionProbe;
  // PHASE 350 FIX ROUND. What the file the primary probe is about to run IS,
  // read BEFORE it starts, so a file replaced during or after the probe never
  // matches the reading taken here. One stat, never a spawn; a held probe's
  // record is never read, because its version is null.
  const identity = probe === null ? null : fileIdentityOf(binPath);
  if (identity !== null) readFrom.set(entry.id, identity);
  // Phase 335: a held probe answers exactly what a row with no probe answers.
  const versionP =
    probe === null || versionProbeHeld(entry.id, binPath)
      ? Promise.resolve<VersionProbeResult>({ version: null, identityFailed: false })
      : runVersionProbe(binPath, probe, userPath);
  // One probe per shadowed copy: the entry's PRIMARY args, no fallback args
  // and no identity judgment. A null answer drops the version clause from the
  // Settings sentence, never the row.
  const shadowedP = Promise.all(
    shadowPaths.map(async (path) => {
      if (probe === null || versionProbeHeld(entry.id, path)) return { path, version: null };
      const out = await execProbe(path, probe.args, userPath);
      return {
        path,
        version: out === null ? null : extractVersion(out.combined, probe.postProcess)
      };
    })
  );
  const healthP = checkAgentBinary(binPath);

  const [probed, shadowed, health] = await Promise.all([versionP, shadowedP, healthP]);

  let installed = true;
  if (probed.identityFailed) {
    // Something else wears this name — do not offer it as the agent.
    installed = false;
    agentsLog.warn(
      `agent detection: ${binPath} failed the '${entry.id}' identity probe — ignoring`
    );
  }

  // What actually runs when the resolved file starts, read off the answer the
  // health module already computed for the launch path. Never a second read.
  const runtime: AgentRuntime | null =
    health.answer === 'ok'
      ? health.runtime
      : health.answer === 'interpreter-missing'
        ? { kind: 'script', interpreter: health.interpreter, interpreterPath: null }
        : null;

  return {
    ...base,
    installed,
    version: probed.version,
    installKind: installKindOf(realPath, entry.install?.signature ?? null),
    runtime,
    realPath,
    shadowed,
    // A Phase 23 patch row pinning a path is exactly a winning candidate that
    // contains a separator; a bare name can never carry one.
    overridden: winningBare.includes('/')
  };
}

async function scanAgents(): Promise<AgentsScanResult> {
  scanStarts += 1;
  // PHASE 350. The answer this scan settles is the one in force when it
  // started, so a scan begun before `resetDetectionCache` cannot settle the
  // fresh one a test made after it.
  const answer = firstAnswer;
  const userPath = await getUserPath();
  // PHASE 350 FIX ROUND. This scan's own record, kept beside its result.
  const readFrom = new Map<string, FileIdentity>();
  const agents = await Promise.all(
    agentTable().map((entry) => detectOne(entry, userPath, readFrom))
  );
  const installed = agents.filter((a) => a.installed).map((a) => a.id);
  console.log(
    `[gmux] agent detection: ${installed.length}/${agents.length} installed [${installed.join(', ')}]`
  );
  const result: AgentsScanResult = { agents, scannedAt: Date.now() };
  // Phase 49. The last RESOLVED scan, kept readable while a re-scan is in
  // flight. This is the whole of what core's private `agentScan` field used
  // to provide, moved to the one module that owns the scan.
  lastScan = result;
  // PHASE 350 FIX ROUND. In the same statement list as `lastScan`, so a reader
  // never pairs one scan's versions with another scan's files.
  lastReadFrom = readFrom;
  // PHASE 350 (D19). Settled after `lastScan`, so a reader woken by it reads
  // this scan's rows; a second resolve of a settled promise does nothing, so
  // only the FIRST scan that resolves is ever the answer.
  answer.settle(result);
  return result;
}

let scanPromise: Promise<AgentsScanResult> | null = null;
let lastScan: AgentsScanResult | null = null;
/** PHASE 350 FIX ROUND. The file each version of {@link lastScan} was read from, by agent id. */
let lastReadFrom: ReadonlyMap<string, FileIdentity> = new Map();
let scanStarts = 0;

/** PHASE 350. A promise and the one function that settles it. */
interface FirstAnswer {
  readonly promise: Promise<AgentsScanResult>;
  readonly settle: (result: AgentsScanResult) => void;
}

function freshFirstAnswer(): FirstAnswer {
  let settle: (result: AgentsScanResult) => void = () => undefined;
  const promise = new Promise<AgentsScanResult>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

/** PHASE 350. Settled by the first scan in this process that resolves. */
let firstAnswer: FirstAnswer = freshFirstAnswer();

/**
 * Cached detection scan (first call probes; later calls reuse).
 *
 * SINCE PHASE 164 THE FIRST CALL IS MADE BY A SURFACE, NOT BY BOOT. The
 * callers are the `agents:list` handler, which every renderer surface that
 * draws a scan asks through (Create Session, the quick create menu, Settings,
 * the shortcuts overlay), restore's `liveAgentVersion`, and
 * `warmDetectionAtBoot` below on a profile with nothing to show. Whoever asks
 * first starts the one scan; everybody else awaits the same promise and reads
 * the same rows, so moving the first call later changed WHEN the probes run
 * and nothing about what they find. In a harness launch the scan starts only
 * the version probes its mode named (Phase 335, {@link versionProbeHeld}).
 */
export function listDetectedAgents(): Promise<AgentsScanResult> {
  scanPromise ??= scanAgents();
  return scanPromise;
}

/**
 * The boot warm, kept only for the profile that will need it first (Phase 164).
 *
 * Measured on 2026-08-29 at the parent commit: every launch started all
 * fourteen version probes about 90 ms after the PATH landed and before the
 * window was shown, including a launch that reopened an existing terminal and
 * drew no surface that reads a scan. That boot now starts none, and the first
 * surface to ask pays the same 30 to 60 ms it would have waited anyway.
 *
 * A manifest with no session row to show is the one case where the warm
 * stays, because the first screen there is the session tiles, which read the
 * scan the moment they mount. The gate counts the rows a person would see, so
 * a discarded tombstone does not count as something to show. Returns whether a
 * scan was requested, for the tests; the scan itself is the same memoised one
 * `listDetectedAgents` hands everybody, so a warm and a later surface never
 * make two. In a harness launch that scan resolves every binary and starts no
 * version probe its mode did not name (Phase 335).
 */
export function warmDetectionAtBoot(
  sessionRows: ReadonlyArray<{ status: string }>
): boolean {
  if (sessionRows.some((row) => row.status !== 'discarded')) return false;
  void listDetectedAgents().catch(() => undefined);
  return true;
}

/**
 * PHASE 350 (build/p350/SPEC.md D18). The warm a pi user's launch asks for.
 *
 * pi's inline token is composed only once this Mac's scan has read pi's
 * version, and a boot with sessions to show starts no scan (Phase 164 above).
 * So the session core asks this ONCE, at this process's first terminal bytes,
 * and it starts the one memoised scan exactly when some row is a pi row on this
 * Mac that a person would see (its status is not `discarded`). It does nothing
 * for any other manifest. It waits for the first terminal bytes, and never runs
 * at boot, because Phase 164 measured on his Mac that the boot's version probes
 * made the first attach slower: cold p50 472.6 to 449.5 ms, warm p95 522.2 to
 * 476.4 ms once they left the boot path. The scan is the same memoised one
 * {@link listDetectedAgents} hands everybody, so a warm and a later surface
 * never make two, and in a harness launch it starts no probe its mode did not
 * name (Phase 335). Returns whether a scan was asked for, for the tests.
 */
export function warmDetectionForLocalPi(
  rows: ReadonlyArray<{ agent: string; status: string; machineId?: string }>
): boolean {
  const asks = rows.some(
    (row) =>
      row.agent === 'pi' &&
      row.status !== 'discarded' &&
      (row.machineId ?? LOCAL_MACHINE_ID) === LOCAL_MACHINE_ID
  );
  if (!asks) return false;
  void listDetectedAgents().catch(() => undefined);
  return true;
}

/**
 * PHASE 350 (D19). Settled with the result of the FIRST scan in this process
 * that resolves, whoever started it. It starts nothing: a process in which no
 * surface, restore or warm ever asks for a scan never settles it. A scan that
 * rejects does not settle it either; the next one that resolves does.
 * `resetDetectionCache` makes a fresh one.
 */
export function firstScanAnswered(): Promise<AgentsScanResult> {
  return firstAnswer.promise;
}

/**
 * PHASE 350 (D25), and its fix round. What this Mac's last resolved scan says
 * about pi's floor FOR ONE BINARY, `bin`, the absolute file a launch or a
 * restore is about to run: `unread` before any scan resolved, when pi was not
 * found, when its probe was held or answered nothing a version reader can read,
 * for any `bin` whose real file is not inside pi's own installed package
 * ({@link insidePiPackage}, his ruling of 2026-11-02: a version manager's shim,
 * a wrapper, a copy), and for any `bin` that is not, now, the very file the
 * scan read pi's version from, as it was then (another install, a reinstall, a
 * file that is gone); otherwise `holds` or `below`. Never starts a scan and
 * never waits on one: files are read, never run. The one reader the create,
 * the harvest and the admission, restore, resume in place, Restart's
 * replacement (a create) and the boot pass ask, each with the binary its own
 * argv names.
 *
 * `spawn` is how a create's pane will start `bin` when it spawns it by its
 * BARE NAME (the second ruled round): then the reading holds only when the
 * pane's own lookup finds `bin` itself ({@link bareNameSpawnRuns}), and a
 * project's own pi, a binstub, anything ahead of `bin` on the pane's PATH, or
 * a walk that cannot be read is `unread`. A launch that runs `bin` by its
 * absolute path, which every restore, resume in place and pass row does, hands
 * none and needs no walk.
 */
export function piInlineFloorFor(bin: string | null | undefined, spawn?: BareNameSpawn): InlineFloorReading {
  const reading = piInlineFloor(peekDetectedAgents()?.agents.find((a) => a.id === 'pi')?.version ?? null);
  if (reading === 'unread' || bin === null || bin === undefined || bin.length === 0) return 'unread';
  // HIS RULING OF 2026-11-02 (R1): pi's own package, or no reading at all.
  if (!insidePiPackage(bin)) return 'unread';
  // HIS RULING OF 2026-11-02, THE SECOND RULED ROUND: the file that runs, or no reading at all.
  if (spawn !== undefined && !bareNameSpawnRuns(spawn, bin)) return 'unread';
  const read = lastReadFrom.get('pi');
  const now = read === undefined ? null : fileIdentityOf(bin);
  return read !== undefined && now !== null && sameFile(read, now) ? reading : 'unread';
}

/**
 * PHASE 350 FIX ROUND. The resume command a pi row's own configuration
 * composes for conversation `sessionId` with no token of Tortie's, from the
 * table this module scans (the compiled row, or the merged row an `agents.json`
 * made; memory only, as {@link AgentTableSource} promises), or `[]` when that
 * table holds no launchable pi or composes nothing. Only its first tokens are
 * read, by `piTokenIsTortiesIn` in ./registry.ts, to tell a person's own
 * leading `--tui-mode regular` from Tortie's copy.
 *
 * The person's own launch flags are composed into it, read off the row's
 * recorded launch argv (`launched`) as what follows the pre-assigned id
 * (`launchArgvFor` puts the id pair before every one of them), so a confirmed
 * row that puts them FIRST (`resumeExtrasPosition: 'leading'`) with
 * `--tui-mode regular` at their head is read as leading with its own copy, as
 * a template that leads with it is. A launch argv that does not carry the id
 * pair reads as no flags.
 */
export function piOwnResumeArgv(sessionId: string, launched: readonly string[] = []): readonly string[] {
  const entry = agentTable().find((e) => e.id === 'pi');
  if (entry === undefined || !entry.launchable || entry.launch === null) return [];
  try {
    const capture = entry.resume.idCapture;
    const pair = capture.mode === 'pre-assign' && sessionId.length > 0 ? [...capture.launchFlag, sessionId] : [];
    let flags: readonly string[] = [];
    for (let at = 1; pair.length > 0 && at + pair.length <= launched.length; at += 1) {
      if (pair.every((token, i) => launched[at + i] === token)) {
        flags = launched.slice(at + pair.length);
        break;
      }
    }
    return resumeArgvFor(entry as LaunchableEntryLike, sessionId, flags, undefined, false);
  } catch {
    return [];
  }
}

/** Drop the cache and re-probe everything (Settings re-scan); a harness launch probes only what it named (Phase 335). */
export function rescanAgents(): Promise<AgentsScanResult> {
  scanPromise = scanAgents();
  return scanPromise;
}

/**
 * The last RESOLVED scan, and never anything else (Phase 49, research 47 §4.4).
 *
 * It never starts a scan and never waits on one, which is the property the
 * create path stands on: a create can never start a version probe and can
 * never wait on one. Before the boot scan resolves this answers null, and the
 * one create that races it records agent_version NULL on its manifest row,
 * exactly as the harvest path has always tolerated. The column is nullable
 * and nothing on the restore path reads it for correctness (Phase 21 recorded
 * the contract on the row instead).
 */
export function peekDetectedAgents(): AgentsScanResult | null {
  return lastScan;
}

/** Test hook. How many scans have STARTED in this process. */
export function detectionScanCount(): number {
  return scanStarts;
}

/** Test hook. */
export function resetDetectionCache(): void {
  scanPromise = null;
  lastScan = null;
  probeCount = 0;
  // PHASE 350. A fresh first answer, and (its fix round) no file read; kept
  // above the last line, which `conformance:harnessprobes` A8 anchors on.
  firstAnswer = freshFirstAnswer();
  lastReadFrom = new Map();
  scanStarts = 0;
}
