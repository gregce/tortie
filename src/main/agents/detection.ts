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
 */

import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import { stripAnsi } from '../ansi';
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
import type { AgentInstallInfo, AgentRegistryEntry, InstallSignature, VersionProbe } from './registry';
import { AGENT_REGISTRY } from './registry';
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
      return realPath.startsWith(dir.endsWith('/') ? dir : `${dir}/`);
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

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

async function detectOne(
  entry: DetectableAgentEntry,
  userPath: string
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
  const versionP =
    probe === null
      ? Promise.resolve<VersionProbeResult>({ version: null, identityFailed: false })
      : runVersionProbe(binPath, probe, userPath);
  // One probe per shadowed copy: the entry's PRIMARY args, no fallback args
  // and no identity judgment. A null answer drops the version clause from the
  // Settings sentence, never the row.
  const shadowedP = Promise.all(
    shadowPaths.map(async (path) => {
      if (probe === null) return { path, version: null };
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
  const userPath = await getUserPath();
  const agents = await Promise.all(
    agentTable().map((entry) => detectOne(entry, userPath))
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
  return result;
}

let scanPromise: Promise<AgentsScanResult> | null = null;
let lastScan: AgentsScanResult | null = null;
let scanStarts = 0;

/** Cached detection scan (first call probes; later calls reuse). */
export function listDetectedAgents(): Promise<AgentsScanResult> {
  scanPromise ??= scanAgents();
  return scanPromise;
}

/** Drop the cache and re-probe everything (Settings re-scan). */
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
  scanStarts = 0;
}
