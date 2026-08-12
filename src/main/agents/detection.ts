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
 */

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import { stripAnsi } from '../ansi';
import { runGuarded } from '../proc/guarded';
import { extraBinDirs, getUserPath, resolveBinaryAgainst } from '../tmux/resolve';
import type { AgentRegistryEntry, VersionProbe } from './registry';
import { AGENT_REGISTRY } from './registry';

/** How long a versionCmd may run before it is killed and version stays null. */
export const VERSION_PROBE_TIMEOUT_MS = 4_000;

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
function execProbe(
  bin: string,
  args: readonly string[],
  pathValue: string
): Promise<string | null> {
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
    return combined.length > 0 ? combined : null;
  });
}

interface VersionProbeResult {
  version: string | null;
  /** True when output arrived but the identity substring was absent — the
   *  binary wearing this name is NOT the agent (e.g. a different `claude`). */
  identityFailed: boolean;
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
  if (probe.identitySubstring !== undefined && !out.includes(probe.identitySubstring)) {
    return { version: null, identityFailed: true };
  }
  return { version: extractVersion(out, probe.postProcess), identityFailed: false };
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

async function detectOne(
  entry: AgentRegistryEntry,
  userPath: string
): Promise<DetectedAgent> {
  const storeDetected = expandDirs(entry.storeDirs).some((dir) => existsSync(dir));

  // Resolve the binary for BOTH kinds (fs-only, no subprocess): IDE entries
  // report it for display, but their installed signal is the store.
  let binPath: string | null = null;
  const probeDirs = [...expandDirs(entry.extraProbeDirs), ...extraBinDirs()];
  for (const bin of entry.binaries) {
    const hit = resolveBinaryAgainst(bin, userPath, probeDirs);
    if (hit !== null) {
      binPath = hit;
      break;
    }
  }

  let installed: boolean;
  let version: string | null = null;
  if (entry.kind === 'ide') {
    // SpecStory rule: IDE detection is store existence, never a subprocess.
    installed = storeDetected;
  } else {
    installed = binPath !== null;
    if (binPath !== null && entry.versionProbe !== null) {
      const probed = await runVersionProbe(binPath, entry.versionProbe, userPath);
      version = probed.version;
      if (probed.identityFailed) {
        // Something else wears this name — do not offer it as the agent.
        installed = false;
        console.warn(
          `[gmux] agent detection: ${binPath} failed the '${entry.id}' identity probe — ignoring`
        );
      }
    }
  }

  return {
    id: entry.id,
    displayName: entry.displayName,
    kind: entry.kind,
    launchable: entry.launchable,
    installed,
    binPath,
    version,
    storeDetected,
    iconKey: entry.iconKey,
    unverified: entry.unverified
  };
}

async function scanAgents(): Promise<AgentsScanResult> {
  const userPath = await getUserPath();
  const agents = await Promise.all(
    AGENT_REGISTRY.map((entry) => detectOne(entry, userPath))
  );
  const installed = agents.filter((a) => a.installed).map((a) => a.id);
  console.log(
    `[gmux] agent detection: ${installed.length}/${agents.length} installed [${installed.join(', ')}]`
  );
  return { agents, scannedAt: Date.now() };
}

let scanPromise: Promise<AgentsScanResult> | null = null;

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

/** Test hook. */
export function resetDetectionCache(): void {
  scanPromise = null;
}
