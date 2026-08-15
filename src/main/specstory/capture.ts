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
 * in the log — and now also in Settings, via `providerSource: 'fallback'`.
 *
 * ## The vocabulary is OPEN (Phase 18.5, docs/research/30 §3.2 and §3.5)
 *
 * Fact 1 used to be answered against a closed eight-member list: an id the
 * binary reported that gmux had no name for was dropped on the floor, silently,
 * with no trace in the UI or the log. Two things changed:
 *
 *  - the parse keeps any id of the right SHAPE, so it still cannot invent one
 *    out of a formatting change, but it no longer discards a real one;
 *  - an agent with no `specstory` registry row can still match, by its OWN id
 *    against the probed set. That single rule is what makes `qwen` work the day
 *    specstory ships it — gmux's agent id is `qwen`, specstory's provider id is
 *    `qwen`. Never a display name, never a fuzzy match.
 *
 * The registry row keeps the one job the probe cannot do: saying whether gmux
 * has MEASURED how that provider reports exit codes. A discovered provider is
 * still offered — flagged `discovered` on the wire, `confidence: 'new'` here —
 * and it is recorded as `exitCodeFidelity: 'collapsed'`, the pessimistic value,
 * which only ever makes a death report say "at least 1" instead of asserting a
 * number gmux made up.
 */

import type { LaunchableAgentId } from '@shared/types';
import type {
  SpecStoryCaptureAgent,
  SpecStoryCaptureBlocked,
  SpecStoryProvider,
  SpecStoryProviderSource
} from '@shared/specstory-status';
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
  specstoryProbeCwd,
  type SpecstoryBinary
} from './resolve';
import { wrapArgv } from './wrap';
import { getLog } from '../log';

/**
 * Scope "specstory" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const specstoryLog = getLog('specstory');


// ---------------------------------------------------------------------------
// Provider availability
// ---------------------------------------------------------------------------

/** Either probe is ~150 ms warm; this is the "it hung" ceiling. */
const PROVIDER_PROBE_TIMEOUT_MS = 5_000;

/** The line the CLI prints in `run --help`, verified on 2.5.0, 2.6.0 and 2.8.0. */
const PROVIDER_MARKER = 'Available provider IDs:';

/**
 * A provider id that can never BE one: leading underscores are not a Go-ish
 * provider id, and `registerAll()` has never produced anything like it. The
 * probe asks for it precisely so the CLI refuses and lists what it does have.
 */
const PROBE_SENTINEL = '__tortie_provider_probe__';

/** A probe is not usage. Accepted by 2.5.0, 2.6.0 and 2.8.0 (measured). */
const NO_ANALYTICS = '--no-usage-analytics';

/**
 * What a provider id may look like. The FAIL-CLOSED guard, replacing the
 * eight-member allowlist: it is what stops a reflowed help paragraph from
 * turning an English word into a provider, without also stopping a real new id.
 */
const PROVIDER_ID_SHAPE = /^[a-z][a-z0-9_-]{0,31}$/;

/** One provider as the binary describes it. */
export interface ProbedProvider {
  readonly id: SpecstoryProviderId;
  /** `Claude Code` — only the per-line surface carries it; null otherwise. */
  readonly displayName: string | null;
}

/** The answer to "what can THIS copy of specstory do", and where it came from. */
export interface ProviderCatalog {
  readonly ids: ReadonlySet<SpecstoryProviderId>;
  /** Sorted by id, so a UI list is stable across probes. */
  readonly list: readonly ProbedProvider[];
  readonly source: SpecStoryProviderSource;
}

/**
 * Parse the per-line provider list the CLI prints when it is asked for a
 * provider that does not exist:
 *
 * ```
 * The registered providers are:
 *   - antigravity - Antigravity CLI
 *   - claude - Claude Code
 * ```
 *
 * Byte-identical in shape on 2.5.0, 2.6.0 and 2.8.0 (measured 2026-08-12).
 * Unwrapped — unlike the help paragraph, which breaks mid-name
 * (`copilotide (VS Code ⏎ Copilot IDE)`) — and it carries the display name,
 * which is the only place a provider gmux has no agent for can get a readable
 * label. Returns null when the text holds no such lines at all.
 */
export function parseProviderList(text: string): ProbedProvider[] | null {
  const found = new Map<string, ProbedProvider>();
  for (const raw of text.split('\n')) {
    const m = /^\s*[-•]\s+([a-z][a-z0-9_-]*)\s+-\s+(\S.*?)\s*$/.exec(raw);
    const id = m?.[1];
    if (id === undefined || !PROVIDER_ID_SHAPE.test(id) || found.has(id)) continue;
    found.set(id, { id, displayName: m?.[2] ?? null });
  }
  return found.size === 0 ? null : [...found.values()];
}

/**
 * Parse the provider ids out of `specstory run --help` — the fallback rung.
 *
 * The help text wraps across lines and pads with trailing spaces, so this
 * scans for `<id> (` pairs after the marker. It keeps any id of the right
 * shape: a formatting change can still only LOSE ids (fail closed, capture
 * off), never invent one, but an id gmux has never heard of now survives
 * instead of being discarded (§3.2). No display names — the wrap mangles them.
 */
export function parseProviderIds(help: string): SpecstoryProviderId[] | null {
  const at = help.indexOf(PROVIDER_MARKER);
  if (at < 0) return null;
  const tail = help.slice(at + PROVIDER_MARKER.length, at + 2_000);
  const found = new Set<SpecstoryProviderId>();
  for (const m of tail.matchAll(/([a-z][a-z0-9_-]*)\s*\(/g)) {
    const id = m[1];
    if (id !== undefined && PROVIDER_ID_SHAPE.test(id)) found.add(id);
  }
  return found.size === 0 ? null : [...found];
}

/** Registry rows whose fidelity was measured — the fail-safe provider set. */
function verifiedProviders(): SpecstoryProviderId[] {
  return AGENT_REGISTRY.flatMap((e) =>
    e.specstory !== undefined && e.specstory.verified === 'verified'
      ? [e.specstory.provider]
      : []
  );
}

function catalogOf(
  providers: readonly ProbedProvider[],
  source: SpecStoryProviderSource
): ProviderCatalog {
  const list = [...providers].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ids: new Set(list.map((p) => p.id)), list, source };
}

const EMPTY_CATALOG: ProviderCatalog = catalogOf([], 'fallback');

let providerCache: Promise<ProviderCatalog> | null = null;

/**
 * Rung 1: `specstory list <sentinel>`.
 *
 * `list`, NOT `run`. `run`'s RunE calls `config.EnsureDefaultProjectConfig()`
 * and writes `.specstory/cli/config.toml` into its working directory — measured
 * twice, independently (docs/research/30 §0.1) — which for a probe that
 * inherits the app's cwd means an uninvited file in whichever repository the
 * user happened to launch Tortie from. `list` writes nothing, prints the
 * unwrapped list on stderr, and exits 1.
 *
 * The two guards are what stop a future version that ACCEPTS the sentinel from
 * being read as a provider list: the exit must be non-zero, and the sentinel
 * must be echoed back in the output.
 */
async function probeByList(bin: SpecstoryBinary): Promise<ProbedProvider[] | null> {
  const run = await runGuarded(
    bin.path,
    ['list', PROBE_SENTINEL, NO_VERSION_CHECK, NO_ANALYTICS],
    {
      timeoutMs: PROVIDER_PROBE_TIMEOUT_MS,
      maxOutputBytes: 256 * 1024,
      cwd: specstoryProbeCwd(),
      env: await specstoryEnv()
    }
  );
  if (run.spawnError !== null || run.timedOut || run.code === 0) return null;
  const text = `${run.stdout}\n${run.stderr}`;
  if (!text.includes(PROBE_SENTINEL)) return null;
  return parseProviderList(text);
}

/** Rung 2: the marker parse of `run --help` — read-only, and what shipped. */
async function probeByHelp(bin: SpecstoryBinary): Promise<ProbedProvider[] | null> {
  const run = await runGuarded(bin.path, ['run', '--help', NO_VERSION_CHECK], {
    timeoutMs: PROVIDER_PROBE_TIMEOUT_MS,
    maxOutputBytes: 256 * 1024,
    cwd: specstoryProbeCwd(),
    env: await specstoryEnv()
  });
  if (run.spawnError !== null || run.timedOut) return null;
  const ids = parseProviderIds(`${run.stdout}\n${run.stderr}`);
  return ids === null ? null : ids.map((id) => ({ id, displayName: null }));
}

async function probeProviders(bin: SpecstoryBinary): Promise<ProviderCatalog> {
  const listed = await probeByList(bin);
  if (listed !== null) return catalogOf(listed, 'probed');
  const helped = await probeByHelp(bin);
  if (helped !== null) return catalogOf(helped, 'probed');
  specstoryLog.warn(
    `specstory ${bin.version ?? '?'} did not list its providers ` +
      `(${bin.path}) — capture falls back to the measured set`
  );
  return catalogOf(
    verifiedProviders().map((id) => ({ id, displayName: null })),
    'fallback'
  );
}

/**
 * What the ACTIVE specstory binary can capture, probed once per app run
 * (an empty catalog when there is no specstory at all).
 */
export async function providerCatalog(): Promise<ProviderCatalog> {
  if (providerCache === null) {
    providerCache = resolveSpecstory().then((res) =>
      res.active === null ? EMPTY_CATALOG : probeProviders(res.active)
    );
  }
  return providerCache;
}

/** Just the ids — the set the three-fact rule intersects against. */
export async function availableProviders(): Promise<ReadonlySet<SpecstoryProviderId>> {
  return (await providerCatalog()).ids;
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
  /**
   * 'measured' ⇔ a verified registry row backs this provider. 'new' ⇔ the id
   * came from the binary and nothing about its exit-code behaviour has been
   * measured here (§3.5). Always 'measured' when unsupported — there is
   * nothing to be confident about.
   */
  readonly confidence: 'measured' | 'new';
}

const UNSUPPORTED = (
  reason: CaptureSupport['reason'],
  provider: SpecstoryProviderId | null,
  bin: SpecstoryBinary | null,
  registry: AgentSpecstoryCapture | null
): CaptureSupport => ({
  supported: false,
  reason,
  provider,
  bin,
  registry,
  confidence: 'measured'
});

/** The registry's specstory row for an agent id (null for shells/unknowns). */
export function specstoryRowFor(agent: string): AgentSpecstoryCapture | null {
  return AGENT_REGISTRY.find((e) => e.id === agent)?.specstory ?? null;
}

/**
 * The provider id to ask for, from the two sources §3.5 allows and no others.
 *
 * 1. The registry row — versioned with the code, and the only source that also
 *    carries measured exit-code fidelity.
 * 2. Failing that, the agent's OWN id, if the binary reports a provider by
 *    that exact name. Every agent in the registry already agrees with
 *    specstory on its id except `antigravity`↔`agy`, which has an explicit row
 *    anyway. Exact match only: a display-name or fuzzy match would let two
 *    unrelated tools be silently conflated.
 *
 * Launchability is checked here rather than at the call sites because the
 * intersection is with what gmux can put in a tmux pane — `cursoride` and
 * `copilotide` are providers gmux must never offer, and they stay out by this
 * one condition.
 */
export function providerIdFor(
  agent: string,
  probed: ReadonlySet<SpecstoryProviderId>
): SpecstoryProviderId | null {
  const entry = AGENT_REGISTRY.find((e) => e.id === agent) ?? null;
  if (entry === null || !entry.launchable) return null;
  if (entry.specstory !== undefined) return entry.specstory.provider;
  return probed.has(entry.id) ? entry.id : null;
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
  if (active === null) {
    // Asked before the binary question is settled, "gmux has no row for this
    // agent" is the less useful of the two true answers: nothing can be
    // captured at all, and that is what the caller must say.
    return UNSUPPORTED('no-binary', registry?.provider ?? null, null, registry);
  }
  const catalog = await providerCatalog();
  const provider = providerIdFor(agent, catalog.ids);
  if (provider === null) {
    return UNSUPPORTED('no-provider-for-agent', null, active, registry);
  }
  if (!catalog.ids.has(provider)) {
    return UNSUPPORTED('provider-missing-from-cli', provider, active, registry);
  }
  return {
    supported: true,
    reason: 'ok',
    provider,
    bin: active,
    registry,
    confidence: registry?.verified === 'verified' ? 'measured' : 'new'
  };
}

/** Launchable registry ids, in registry order — the universe both lists split. */
function launchableAgentIds(): LaunchableAgentId[] {
  return AGENT_REGISTRY.flatMap((e) => (e.launchable ? [e.id as LaunchableAgentId] : []));
}

/** Every agent gmux can capture right now — the modal's allowlist. */
export async function capturableAgents(): Promise<LaunchableAgentId[]> {
  const { ids } = await providerCatalog();
  if (ids.size === 0) return [];
  return launchableAgentIds().filter((id) => {
    const provider = providerIdFor(id, ids);
    return provider !== null && ids.has(provider);
  });
}

/**
 * Both halves of the Settings list in one pass: what can be captured, what
 * cannot and why, and what the binary said it supports.
 *
 * The blocked half is the whole point. `captureSupportFor` has always computed
 * a precise reason and the UI has always thrown it away, so an agent that
 * cannot be captured simply did not appear and nothing anywhere answered "why
 * not?" (docs/research/30 §4.7 gap 2).
 */
export interface CaptureMatrix {
  supported: SpecStoryCaptureAgent[];
  blocked: SpecStoryCaptureBlocked[];
  providers: SpecStoryProvider[];
  providerSource: SpecStoryProviderSource;
}

export async function captureMatrix(): Promise<CaptureMatrix> {
  const { active } = await resolveSpecstory();
  const catalog = await providerCatalog();
  const nameOf = new Map(catalog.list.map((p) => [p.id, p.displayName]));
  const supported: SpecStoryCaptureAgent[] = [];
  const blocked: SpecStoryCaptureBlocked[] = [];
  const matched = new Set<SpecstoryProviderId>();

  for (const agentId of launchableAgentIds()) {
    const provider = providerIdFor(agentId, catalog.ids);
    if (provider !== null && catalog.ids.has(provider)) {
      matched.add(provider);
      const row = specstoryRowFor(agentId);
      supported.push({
        agentId,
        provider,
        discovered: row?.verified !== 'verified',
        providerName: nameOf.get(provider) ?? null
      });
      continue;
    }
    // No binary ⇒ no per-agent rows at all: the section already says SpecStory
    // is unavailable in one line, and ten copies of it is noise.
    if (active === null) continue;
    blocked.push({
      agentId,
      provider,
      reason: provider === null ? 'no-provider-for-agent' : 'provider-missing-from-cli'
    });
  }

  return {
    supported,
    blocked,
    providers: catalog.list.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      matchedAgent: matched.has(p.id)
    })),
    providerSource: catalog.source
  };
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
      // No registry row ⇒ this provider was DISCOVERED from the binary and
      // nobody has measured how it reports exit codes, so gmux records the
      // pessimistic value. 'collapsed' only ever makes the death report say
      // "at least 1"; 'exact' would make it assert a number gmux invented.
      exitCodeFidelity: support.registry?.exitCodeFidelity ?? 'collapsed',
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
