/**
 * CAN this agent be captured on this machine, right now — the one question
 * the create modal, the create pipeline and the restore path all ask.
 *
 * Three facts have to agree before gmux wraps anything, and they come from
 * three different places on purpose:
 *
 *  1. **Does specstory know this agent?** — the registry's `specstory` row
 *     (src/main/agents/registry.ts). Data, versioned with the code.
 *  2. **Does the RESOLVED binary have that provider?** — probed from the
 *     binary itself. The registry cannot answer this: the bundled copy and
 *     the user's Homebrew copy ship different provider sets (2.5.0 has never
 *     heard of `muse`), and a wrap naming a provider the binary lacks is an
 *     immediate error in the pane — the dead-pane failure mode Phase 13.5
 *     spent a whole round eliminating.
 *  3. **Is there a specstory at all?** — ./resolve.ts.
 *
 * Nothing here guesses. When the probe cannot answer, capture falls back to
 * the providers whose registry row was MEASURED (`verified: 'verified'`),
 * which is the same standard the rest of the registry is held to, and says so
 * in the log.
 */

import type { LaunchableAgentId } from '@shared/types';
import { runGuarded } from '../proc/guarded';
import {
  AGENT_REGISTRY,
  type AgentSpecstoryCapture,
  type SpecstoryProviderId
} from '../agents/registry';
import {
  NO_VERSION_CHECK,
  cloudDisabledByEnv,
  resolveSpecstory,
  specstoryEnv,
  type SpecstoryBinary
} from './resolve';
import { wrapArgv } from './wrap';

// ---------------------------------------------------------------------------
// Provider availability
// ---------------------------------------------------------------------------

/** `specstory run --help` is ~100 ms warm; this is the "it hung" ceiling. */
const PROVIDER_PROBE_TIMEOUT_MS = 5_000;

/** The line the CLI prints in `run --help`, verified on 2.5.0 and 2.8.0. */
const PROVIDER_MARKER = 'Available provider IDs:';

const ALL_PROVIDERS: readonly SpecstoryProviderId[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse'
];

/**
 * Parse the provider ids out of `specstory run --help`.
 *
 * The help text wraps across lines and pads with trailing spaces, so this
 * scans for `<id> (` pairs after the marker and keeps only ids gmux has a
 * registry row for — a formatting change can therefore lose ids (fail
 * closed, capture off) but can never invent one.
 */
export function parseProviderIds(help: string): SpecstoryProviderId[] | null {
  const at = help.indexOf(PROVIDER_MARKER);
  if (at < 0) return null;
  const tail = help.slice(at + PROVIDER_MARKER.length, at + 2_000);
  const known = new Set<string>(ALL_PROVIDERS);
  const found = new Set<SpecstoryProviderId>();
  for (const m of tail.matchAll(/([a-z][a-z0-9_-]*)\s*\(/g)) {
    const id = m[1];
    if (id !== undefined && known.has(id)) found.add(id as SpecstoryProviderId);
  }
  return [...found];
}

/** Registry rows whose fidelity was measured — the fail-safe provider set. */
function verifiedProviders(): SpecstoryProviderId[] {
  return AGENT_REGISTRY.flatMap((e) =>
    e.specstory !== undefined && e.specstory.verified === 'verified'
      ? [e.specstory.provider]
      : []
  );
}

let providerCache: Promise<ReadonlySet<SpecstoryProviderId>> | null = null;

async function probeProviders(
  bin: SpecstoryBinary
): Promise<ReadonlySet<SpecstoryProviderId>> {
  const run = await runGuarded(bin.path, ['run', '--help', NO_VERSION_CHECK], {
    timeoutMs: PROVIDER_PROBE_TIMEOUT_MS,
    maxOutputBytes: 256 * 1024,
    env: await specstoryEnv()
  });
  const parsed =
    run.spawnError === null && !run.timedOut
      ? parseProviderIds(`${run.stdout}\n${run.stderr}`)
      : null;
  if (parsed !== null) return new Set(parsed);
  console.warn(
    `[gmux] specstory ${bin.version ?? '?'} did not list its providers ` +
      `(${bin.path}) — capture falls back to the measured set`
  );
  return new Set(verifiedProviders());
}

/**
 * Providers the ACTIVE specstory binary actually has, probed once per app run
 * (empty when there is no specstory at all).
 */
export async function availableProviders(): Promise<ReadonlySet<SpecstoryProviderId>> {
  if (providerCache === null) {
    providerCache = resolveSpecstory().then((res) =>
      res.active === null
        ? new Set<SpecstoryProviderId>()
        : probeProviders(res.active)
    );
  }
  return providerCache;
}

/** Test seam / Settings "re-check": forget the probed provider list. */
export function resetProviderCache(): void {
  providerCache = null;
}

// ---------------------------------------------------------------------------
// Per-agent capture support
// ---------------------------------------------------------------------------

export interface CaptureSupport {
  /** True ⇔ gmux would wrap this agent if the user asked it to. */
  readonly supported: boolean;
  /** Why not, for the log and the (disabled) UI row. */
  readonly reason:
    | 'ok'
    | 'no-binary'
    | 'no-provider-for-agent'
    | 'provider-missing-from-cli';
  readonly provider: SpecstoryProviderId | null;
  readonly bin: SpecstoryBinary | null;
  /** The registry row, so callers can see exit-code fidelity without re-reading. */
  readonly registry: AgentSpecstoryCapture | null;
}

const UNSUPPORTED = (
  reason: CaptureSupport['reason'],
  provider: SpecstoryProviderId | null,
  bin: SpecstoryBinary | null,
  registry: AgentSpecstoryCapture | null
): CaptureSupport => ({ supported: false, reason, provider, bin, registry });

/** The registry's specstory row for an agent id (null for shells/unknowns). */
export function specstoryRowFor(agent: string): AgentSpecstoryCapture | null {
  return AGENT_REGISTRY.find((e) => e.id === agent)?.specstory ?? null;
}

/**
 * Everything the caller needs to decide whether to offer, and then perform,
 * capture for one agent.
 */
export async function captureSupportFor(
  agent: LaunchableAgentId | 'shell' | string
): Promise<CaptureSupport> {
  const registry = specstoryRowFor(agent);
  const { active } = await resolveSpecstory();
  if (registry === null) {
    return UNSUPPORTED('no-provider-for-agent', null, active, null);
  }
  if (active === null) {
    return UNSUPPORTED('no-binary', registry.provider, null, registry);
  }
  const providers = await availableProviders();
  if (!providers.has(registry.provider)) {
    return UNSUPPORTED('provider-missing-from-cli', registry.provider, active, registry);
  }
  return {
    supported: true,
    reason: 'ok',
    provider: registry.provider,
    bin: active,
    registry
  };
}

/** Every agent gmux can capture right now — the modal's allowlist. */
export async function capturableAgents(): Promise<LaunchableAgentId[]> {
  const providers = await availableProviders();
  if (providers.size === 0) return [];
  return AGENT_REGISTRY.flatMap((e) =>
    e.launchable && e.specstory !== undefined && providers.has(e.specstory.provider)
      ? [e.id as LaunchableAgentId]
      : []
  );
}

// ---------------------------------------------------------------------------
// The wrap, with the support check attached
// ---------------------------------------------------------------------------

/**
 * What a wrapped session records in the manifest. `agentArgv` is the whole
 * point: re-deriving the inner argv by re-splitting the `-c` string is the
 * lossy direction (see ./wrap.ts), so the unwrapped command is stored
 * verbatim and every later re-composition — the harvest arming the resume
 * argv, a restore replaying it — starts from THIS, not from a parse.
 */
export interface SpecstoryCaptureRecord {
  enabled: boolean;
  bin: string;
  binVersion: string | null;
  provider: SpecstoryProviderId;
  /** 'collapsed' ⇒ this session's recorded exit code is a floor, not a fact. */
  exitCodeFidelity: 'exact' | 'collapsed';
  /** The UNWRAPPED agent argv (argv[0] = the agent binary). */
  agentArgv: string[];
  /**
   * This session captures locally and never uploads (`--no-cloud-sync` on
   * both the wrap and its syncs). Set from the `GMUX_SPECSTORY_NO_CLOUD=1`
   * development opt-out at CREATE time and then obeyed for the session's
   * whole life, so a restore reproduces the argv it launched with instead of
   * quietly gaining a cloud upload the session never had.
   */
  noCloud?: boolean;
}

export interface WrapResult {
  /** The argv to spawn (wrapped), or null when capture could not be applied. */
  argv: string[] | null;
  /** The manifest record for a successful wrap. */
  record: SpecstoryCaptureRecord | null;
  /** Plain-language reason a requested capture did not happen. */
  declined: string | null;
}

/**
 * Wrap an agent launch for capture, or explain why not.
 *
 * A decline is never silent and never fatal: the session still launches, it
 * just launches uncaptured, and the caller surfaces the sentence.
 */
export async function wrapForCapture(
  agent: string,
  inner: readonly string[]
): Promise<WrapResult> {
  const support = await captureSupportFor(agent);
  if (!support.supported || support.bin === null || support.provider === null) {
    return {
      argv: null,
      record: null,
      declined: declineSentence(agent, support)
    };
  }
  const noCloud = cloudDisabledByEnv();
  const argv = wrapArgv({
    bin: support.bin.path,
    provider: support.provider,
    inner,
    noCloud
  });
  if (argv === null) {
    return {
      argv: null,
      record: null,
      declined:
        'SpecStory capture was turned off for this session: one of its launch ' +
        'arguments is an empty string, which SpecStory cannot pass through to ' +
        'the agent unchanged.'
    };
  }
  return {
    argv,
    record: {
      enabled: true,
      bin: support.bin.path,
      binVersion: support.bin.version,
      provider: support.provider,
      exitCodeFidelity: support.registry?.exitCodeFidelity ?? 'exact',
      agentArgv: [...inner],
      ...(noCloud ? { noCloud: true } : {})
    },
    declined: null
  };
}

function declineSentence(agent: string, support: CaptureSupport): string {
  switch (support.reason) {
    case 'no-binary':
      return 'SpecStory capture is off for this session: no SpecStory CLI was found.';
    case 'no-provider-for-agent':
      return `SpecStory cannot capture ${agent} yet, so this session runs without capture.`;
    case 'provider-missing-from-cli':
      return (
        `SpecStory ${support.bin?.version ?? ''} on this machine has no ` +
        `"${support.provider ?? agent}" provider, so this session runs without capture.`
      ).replace(/\s+/g, ' ');
    default:
      return 'SpecStory capture is off for this session.';
  }
}

/**
 * Wrap an argv using a session's RECORDED capture, not a freshly resolved one.
 *
 * Two callers, one rule between them:
 *
 *  - the harvest arming `resumeArgv` minutes after launch — this is where
 *    "a restored session keeps capturing" is actually enforced for the five
 *    agents whose id only exists after the fact;
 *  - the launch itself, re-composed with the agent's BARE name inside the
 *    `-c` string (Phase 12.7 F3).
 *
 * It re-reads the recorded `bin`, never a freshly resolved one, so a
 * `brew upgrade` mid-session cannot change the semantics of an armed resume.
 */
export function wrapWithRecord(
  record: SpecstoryCaptureRecord,
  inner: readonly string[]
): string[] | null {
  if (!record.enabled || inner.length === 0) return null;
  return wrapArgv({
    bin: record.bin,
    provider: record.provider,
    inner,
    ...(record.noCloud === true ? { noCloud: true } : {})
  });
}
