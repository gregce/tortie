/**
 * Agent CLI availability and the ⌘T picker's options (Phase 8 §6.5 /
 * DESIGN-SPEC S6, revised by Phase 23 C2).
 *
 * Main probes for the agent CLIs once per boot (agents:availability); this
 * module caches the answer for the renderer's lifetime and exposes it as a
 * hook. Feature-detected: an older preload without the bridge method (or a
 * failed probe) resolves OPTIMISTIC — the UI never blocks creation on an
 * unknown answer, it only disables agents main POSITIVELY reported missing.
 *
 * PHASE 23 C2 — WHY THIS FILE CHANGED.
 *
 * This module used to hold a hand-typed copy of main's launchable registry:
 * ten ids, ten labels, and the sentence `unverified: id === 'pi'`. Nothing
 * type-checked the labels or that flag against src/main/agents/registry.ts,
 * and two of the three facts had already drifted. The registry marks DROID
 * unverified and has not marked pi unverified since the Phase 13.5 audit, so
 * the ⌘T picker labelled the wrong agent "early" whenever it drew before the
 * detection scan landed.
 *
 * Phase 23 lets a user add a fourteenth agent in
 * `<userData>/gmux/config/agents.json`. That agent exists only at run time, in
 * main. It reaches this module the way every other fact about an agent
 * reaches it: inside the `agents:list` scan. So the rule for this file is now
 * stated once and enforced by `npm run conformance:agents`:
 *
 *   THE SCAN IS THE TRUTH. The seed below is the shape of the picker for the
 *   few hundred milliseconds before the first scan answers, and nothing else.
 *   No decision that outlives the scan may read it.
 *
 * Three things follow, and each closes a way a user-added agent could have
 * gone missing:
 *
 *  1. `buildAgentOptions` renders whatever launchable rows the scan carries.
 *     It never filters against the seed, so a fourteenth agent appears with
 *     no edit here.
 *  2. `agentShortLabel` learns display names from every scan it is handed, so
 *     a user-added agent reads as its own name in Context rows and resume
 *     copy instead of as a bare id.
 *  3. The seed carries its `unverified` answer per row rather than deriving it
 *     from an id, and the conformance gate fails when it disagrees with the
 *     registry.
 */

import { useEffect, useState } from 'react';
import type { AgentAvailability, MachineAgentsView } from '@shared/ipc';
import type {
  AgentsScanResult,
  DetectedAgent,
  LaunchableAgentKind
} from '@shared/types';
import { gmuxBridge } from '../bridge';

/**
 * PHASE 49. The hand-typed install table that used to live here is deleted.
 *
 * The provider's own install command now rides the scan row as
 * `DetectedAgent.install`, straight from the install map in
 * src/main/agents/registry.ts (research 47 §3). The scan is the truth, which
 * is the same doctrine the seed below already states. Every string in it is
 * display and clipboard material only. Nothing in it is ever run.
 */

/** The scan row's install display info, non-null form. */
export type AgentInstallDisplay = NonNullable<DetectedAgent['install']>;

const OPTIMISTIC: AgentAvailability = { claude: true, codex: true };

let cached: AgentAvailability | null = null;
let inflight: Promise<AgentAvailability> | null = null;

export function fetchAgentAvailability(): Promise<AgentAvailability> {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight !== null) return inflight;
  const probe = gmuxBridge()?.agentAvailability;
  if (typeof probe !== 'function') {
    cached = OPTIMISTIC;
    return Promise.resolve(cached);
  }
  inflight = probe()
    .then((res) => {
      cached = res;
      return res;
    })
    .catch(() => {
      // A failed probe must never block session creation.
      cached = OPTIMISTIC;
      return OPTIMISTIC;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * PHASE 48. Forget the probe's answer so the next read asks main again.
 *
 * The create sheet's `Try again` calls it. The probe runs once per boot and
 * the answer is cached for the renderer's lifetime, so a person who installed
 * the agent while the sheet was open would otherwise keep seeing "not
 * installed" on the tile until they quit Tortie. Nothing else clears it.
 */
export function resetAgentAvailabilityCache(): void {
  cached = null;
  inflight = null;
}

/** Current availability; starts optimistic and settles once probed. */
export function useAgentAvailability(): AgentAvailability {
  const [avail, setAvail] = useState<AgentAvailability>(cached ?? OPTIMISTIC);
  useEffect(() => {
    let alive = true;
    void fetchAgentAvailability().then((res) => {
      if (alive) setAvail(res);
    });
    return () => {
      alive = false;
    };
  }, []);
  return avail;
}

// ---------------------------------------------------------------------------
// APPENDED — Phase 10 (create-modal stream): the ⌘T agent-picker helpers.
//
// The agents:list scan itself lives in the shared settings store
// (src/renderer/settings/settings-store.ts — one truth for the Settings
// window AND the main window); these are the PURE helpers that turn a scan
// (or its absence) into picker options. Same doctrine as availability:
// OPTIMISTIC — only a POSITIVE "not installed" answer disables an agent chip
// (create-time AGENT_NOT_FOUND stays the friendly backstop).
// ---------------------------------------------------------------------------

/** One ⌘T agent-picker option (chip grid, DESIGN-SPEC S6 round 2). */
export interface AgentPickerOption {
  id: LaunchableAgentKind;
  /** Short chip label (S6 sketch vocabulary, not the long registry name). */
  label: string;
  /** AgentIcon key (unknown keys render the terminal-glyph fallback). */
  iconKey: string;
  /** False only when detection POSITIVELY reported the CLI missing. */
  installed: boolean;
  /** The registry marks this agent's core mechanics unverified (droid). */
  unverified: boolean;
  /**
   * PHASE 23 FIX ROUND. Null for every compiled agent. For an agent that came
   * from `agents.json` and can cause a program to run, this is what the
   * confirm gate says right now.
   *
   * Anything other than 'confirmed' means a create WILL be refused in main, so
   * the picker disables the chip and says why. Offering it as an ordinary
   * choice was the defect: a person picked it, typed a name, pressed Create
   * and got a modal error with no way to act on it.
   */
  configState: 'confirmed' | 'never' | 'changed' | 'unknown' | null;
  /**
   * PHASE 49. The provider's own install command for this agent, from the
   * scan row, for display and the clipboard and nothing else. Null on the
   * pre-scan seed, for muse, for the IDE pair and for a configured agent.
   * For the few hundred milliseconds before the first scan answers, no
   * install caption renders, and that is correct: the seed is a shape, and
   * Tortie has nothing verified to hand over yet.
   */
  install: AgentInstallDisplay | null;
}

/**
 * Why this agent cannot be picked, or null when it can.
 *
 * One sentence, written for the picker rather than for the throw site. It
 * names the place the person fixes it, because the only thing they can do
 * from here is go there.
 */
export function agentBlockedReason(option: AgentPickerOption): string | null {
  switch (option.configState) {
    case 'never':
      return `${option.label} comes from your configuration file. Open Settings, then Agents, read what it runs and confirm it.`;
    case 'changed':
      return `${option.label} changed after you confirmed it. Open Settings, then Agents, read what it runs now and confirm it again.`;
    case 'unknown':
      return `Tortie could not read the confirmation record for ${option.label} from the system keychain, so it will not start it.`;
    default:
      return null;
  }
}

/** One row of the pre-scan seed. */
interface SeedAgent {
  id: LaunchableAgentKind;
  /** The short chip label. Deliberately shorter than the registry's name. */
  label: string;
  /** Mirrors the registry's `unverified` flag for this id. */
  unverified: boolean;
}

/**
 * The picker's shape before the first scan answers, in registry order.
 *
 * THIS IS A SEED, NOT A MIRROR. It exists so ⌘T draws something correct in
 * the moment before `agents:list` returns, and it is read nowhere else. Its
 * ids and its `unverified` column must agree with src/main/agents/registry.ts
 * and `npm run conformance:agents` fails when they do not. The LABELS are a
 * deliberate difference — the chip says "Cursor" where the registry says
 * "Cursor CLI" — so the gate checks the ids and the flag, never the label.
 *
 * A user-added agent is correctly absent here. It cannot be known before a
 * scan, and it appears the moment one lands.
 */
const SEED_AGENTS: readonly SeedAgent[] = [
  { id: 'claude', label: 'Claude Code', unverified: false },
  { id: 'cursor', label: 'Cursor', unverified: false },
  { id: 'codex', label: 'Codex', unverified: false },
  { id: 'gemini', label: 'Gemini', unverified: false },
  { id: 'droid', label: 'Droid', unverified: true },
  // Phase 25.5: the product renamed itself; the id stays 'deepseek' because
  // it is in every manifest row and the SpecStory provider mapping.
  { id: 'deepseek', label: 'CodeWhale', unverified: false },
  { id: 'antigravity', label: 'Antigravity', unverified: false },
  { id: 'muse', label: 'Muse', unverified: false },
  { id: 'qwen', label: 'Qwen', unverified: false },
  { id: 'pi', label: 'Pi', unverified: false },
  { id: 'grok', label: 'Grok', unverified: false }
];

/** Seed short labels, by id. Compiled agents only, and that is the point. */
const SEED_LABELS: Record<string, string | undefined> = Object.fromEntries(
  SEED_AGENTS.map((o) => [o.id, o.label])
);

/**
 * Display names learned from scans, by id.
 *
 * A user-added agent has no seed row, so without this its name would only be
 * right inside the picker and would read as a bare id everywhere else. Every
 * scan handed to {@link buildAgentOptions} fills this in, which is the same
 * lifetime rule the availability cache above already follows.
 */
const learnedLabels = new Map<string, string>();

/**
 * The short display label for an agent id ("pi" → "Pi").
 *
 * The seed wins for the eleven compiled agents, because its labels are chosen
 * chip copy rather than the registry's longer names. Anything else falls back
 * to the display name main reported in the last scan, and then to the id
 * itself, so an agent Tortie has never heard of reads as itself rather than
 * disappearing.
 */
export function agentShortLabel(id: string): string {
  const seeded = SEED_LABELS[id];
  if (seeded !== undefined) return seeded;
  const learned = learnedLabels.get(id);
  if (learned !== undefined) return learned;
  return id === 'shell' ? 'Shell' : id;
}

/**
 * The ⌘T picker options: every launchable agent the scan reports, plus Shell
 * last. Before the first scan, the seed above stands in.
 *
 * Installed is optimistic — false only on a positive miss (a scan row, or the
 * Phase 8 probe for claude/codex when no scan exists yet).
 *
 * NOTHING HERE FILTERS AGAINST THE SEED. A launchable row main did not
 * compile in — a Phase 23 overlay agent — becomes a chip on the same terms as
 * the other thirteen.
 *
 * PHASE 109 — THE THIRD INPUT. On a tab whose files are on a machine, this
 * Mac's detection scan says nothing about what a person can start there, so
 * `machine` carries that machine's own answer and it alone decides
 * `installed`. Three rules, and research 58 §8 rows 1 and 2 are why each one
 * is written down:
 *
 *  - Only a POSITIVE `absent` greys a tile. `unknown`, and an agent the
 *    answer does not name at all, draw on, which is the same optimism the
 *    local path has always had.
 *  - The local `installed` bit is not consulted at all. It is a fact about
 *    this Mac's disk, and this Mac's disk is not where the session will run.
 *  - `install` is forced to null on every option, which mechanically removes
 *    the install command from every surface that reads it. The command Tortie
 *    holds was read for this Mac, and it must never be offered as a claim
 *    about another machine.
 *
 * Shell is appended after the transform, so it stays `installed: true`: the
 * far side runs its own login shell and is never asked about `shell`.
 *
 * The parameter defaults to null (this Mac) so the conformance probe in
 * build/agents-conformance-probe.mts, which this phase does not own, keeps
 * calling the two-argument form it always has.
 */
export function buildAgentOptions(
  scan: AgentsScanResult | null,
  avail: AgentAvailability,
  machine: MachineAgentsView | null = null
): AgentPickerOption[] {
  let options: AgentPickerOption[];
  if (scan !== null) {
    for (const row of scan.agents) learnedLabels.set(row.id, row.displayName);
    options = scan.agents
      .filter((a) => a.launchable)
      .map((a) => ({
        id: a.id as LaunchableAgentKind,
        label: SEED_LABELS[a.id] ?? a.displayName,
        iconKey: a.iconKey,
        installed: a.installed,
        unverified: a.unverified,
        configState: a.configState ?? null,
        install: a.install ?? null
      }));
  } else {
    options = SEED_AGENTS.map(({ id, label, unverified }) => ({
      id,
      label,
      iconKey: id,
      installed: id === 'claude' || id === 'codex' ? avail[id] : true,
      unverified,
      // The seed is the thirteen compiled agents. None of them has anything to
      // confirm, and a configured agent is correctly absent before a scan.
      configState: null,
      install: null
    }));
  }
  if (machine !== null) {
    // The machine's answer, one reading per launchable agent id. An id the
    // answer does not name reads as unknown, and unknown draws on.
    const presence = new Map(
      machine.agents.map((one) => [one.agentId, one.presence])
    );
    options = options.map((o) => ({
      ...o,
      installed: presence.get(String(o.id)) !== 'absent',
      install: null
    }));
  }
  options.push({
    id: 'shell',
    label: 'Shell',
    iconKey: 'shell',
    installed: true,
    unverified: false,
    configState: null,
    install: null
  });
  return options;
}

/**
 * Whether at least one tile is greyed by that machine's answer (Phase 109).
 *
 * The two surfaces that draw the agent board on a machine tab put one
 * sentence under it when this is true, and nothing when it is not. It is
 * false for this Mac by definition, because the sentence names a machine and
 * there is none to name. Shell is skipped because the far side is never asked
 * about it, so it can never be greyed by an answer.
 *
 * On a machine view every non-shell option's `installed` was decided by that
 * answer alone in {@link buildAgentOptions}, so "greyed" and "that machine
 * said absent" are the same fact here.
 */
export function agentsGreyedByMachine(
  options: readonly AgentPickerOption[],
  machine: MachineAgentsView | null
): boolean {
  if (machine === null) return false;
  return options.some((o) => o.id !== 'shell' && !o.installed);
}

/**
 * Default ⌘T selection: the Settings default agent (GmuxSettings.defaultAgent,
 * 'claude' when Settings hasn't answered) when installed → claude → first
 * installed launchable in registry order → shell. Explicit, never
 * alphabetical (research 11 rule 8).
 */
export function defaultAgentChoice(
  options: readonly AgentPickerOption[],
  preferredId: string
): LaunchableAgentKind {
  // "Installed" is not enough on its own since Phase 23. A configured agent
  // whose row nobody has confirmed is present and installed and still cannot
  // start, so selecting it by default would put a refusal in front of a person
  // who never chose it.
  const usable = (o: AgentPickerOption): boolean =>
    o.installed && agentBlockedReason(o) === null;
  const installed = (id: string): AgentPickerOption | undefined =>
    options.find((o) => o.id === id && usable(o));
  const preferred = installed(preferredId) ?? installed('claude');
  if (preferred !== undefined) return preferred.id;
  return options.find(usable)?.id ?? 'shell';
}

// ---------------------------------------------------------------------------
// APPENDED — Phase 49 (the install map): the pure copy composers.
//
// Every sentence below is display material about how an agent reached the
// disk or where its install command was read from. The composers are pure so
// the unit tests can pin the exact words, and so the three surfaces that draw
// them (the create sheet, the empty state, Settings then Agents) agree by
// construction. Nothing here runs anything, ever.
// ---------------------------------------------------------------------------

/**
 * One piece of a composed sentence. `code: true` renders in code font (paths,
 * binary names, interpreter names); `code: false` is plain prose.
 */
export interface InstallCopySegment {
  code: boolean;
  text: string;
}

/** The sentence under every shown install command. Pinned for the tests. */
export const INSTALL_NOTE_LINE = 'Tortie does not run install commands for you.';

/** The one line added when the install map's read date is old. */
export const STALE_INSTALL_LINE =
  'This was read some time ago. Check the page if the command does not work.';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * An ISO date such as '2026-08-15' as '15 August 2026'.
 *
 * Composed from the string's own parts rather than through `new Date`, so a
 * timezone west of UTC can never shift the printed day back by one. A string
 * that does not parse comes back unchanged rather than as "NaN undefined".
 */
export function formatReadOn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m === null) return iso;
  const month = MONTH_NAMES[Number(m[2]) - 1];
  if (month === undefined) return iso;
  return `${Number(m[3])} ${month} ${Number(m[1])}`;
}

/**
 * True when `readOn` is more than 180 days before `nowMs` (research 47 §10).
 * Exactly 180 days is not stale; day 181 is.
 */
export function installReadIsStale(
  readOn: string,
  nowMs: number = Date.now()
): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(readOn);
  if (m === null) return false;
  const readMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return nowMs - readMs > 180 * 86_400_000;
}

/** The source line under a shown command, e.g. on the create sheet. */
export function installSourceSentence(readOn: string): string {
  return `Read from the provider’s install page on ${formatReadOn(readOn)}.`;
}

/** The sentence for an agent whose provider publishes no install command. */
export function noInstallCommandLine(label: string): string {
  return (
    `The provider does not publish an install command for ${label}. ` +
    'Tortie finds it as soon as it is on your login shell’s PATH.'
  );
}

/** The last path segment, e.g. '/Users/x/.local/bin/codex' → 'codex'. */
function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Home-relative display form, duplicated from `displayPath` in
 *  ../format.ts so this module keeps zero imports from the component layer.
 *  That file was src/renderer/app/format.ts until Phase 127 moved it down to
 *  a top-level leaf, which is the shape ../bridge.ts already uses. */
function homePath(path: string): string {
  const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
  return m !== null ? `~${m[1] ?? ''}` : path;
}

/**
 * Which package manager the resolved file's real path names, for the state C
 * sentence. Shape tests only, the same ones main's `installKind` uses:
 * a path through node_modules is npm's global layout, and a path through a
 * Cellar is Homebrew's. Anything else in a package-manager install reads as
 * the generic sentence.
 */
export function packageManagerLabel(
  realPath: string | null
): 'npm' | 'Homebrew' | null {
  if (realPath === null) return null;
  if (realPath.includes('/node_modules/')) return 'npm';
  if (
    realPath.startsWith('/opt/homebrew/Cellar/') ||
    realPath.startsWith('/usr/local/Cellar/')
  ) {
    return 'Homebrew';
  }
  return null;
}

/**
 * State C (research 47 §7): the one passive line under an installed agent's
 * path in Settings then Agents. Null unless the scan judged the install
 * `package-manager`, because a canonical or unknown install that works is
 * not a problem and draws nothing.
 */
export function installKindLine(
  agent: DetectedAgent
): InstallCopySegment[] | null {
  if (agent.installKind !== 'package-manager') return null;
  if (agent.binPath === null || agent.binPath === undefined) return null;
  const path = homePath(agent.binPath);
  const manager = packageManagerLabel(agent.realPath ?? null);
  const opening =
    manager !== null
      ? `Installed with ${manager}, at `
      : 'Installed from a package manager, at ';
  const line: InstallCopySegment[] = [
    { code: false, text: opening },
    { code: true, text: path }
  ];
  const runtime = agent.runtime ?? null;
  if (
    manager === 'npm' &&
    runtime !== null &&
    runtime.kind === 'script' &&
    runtime.interpreterPath !== null
  ) {
    line.push(
      { code: false, text: '. Runs on ' },
      { code: true, text: runtime.interpreter },
      { code: false, text: ' from ' },
      { code: true, text: homePath(runtime.interpreterPath) },
      { code: false, text: '.' }
    );
  } else {
    line.push({ code: false, text: '.' });
  }
  return line;
}

/**
 * The one extra state C sentence, drawn when the provider's own first choice
 * is NOT a package manager, so the person can see there is a native route.
 * The component puts the `Read the install page` anchor after it. Null
 * whenever the state C line itself would not draw.
 */
export function nativeRecommendSentence(agent: DetectedAgent): string | null {
  if (agent.installKind !== 'package-manager') return null;
  const install = agent.install ?? null;
  if (install === null || install.canonicalIsPackageManager) return null;
  const runtime = agent.runtime ?? null;
  if (runtime !== null && runtime.kind === 'script') {
    return `The provider recommends the native install, which does not need ${runtime.interpreter}.`;
  }
  return 'The provider recommends the native install.';
}

/** 'Two' to 'Five': the used copy plus one to four shadowed ones. */
const COPY_COUNT_WORDS = ['Two', 'Three', 'Four', 'Five'];

/** `, version 0.147.0` when known, nothing when the probe had no answer. */
function versionClause(version: string | null): InstallCopySegment[] {
  return version === null ? [] : [{ code: false, text: `, version ${version}` }];
}

/**
 * The shadowed-copies sentence for Settings then Agents (research 47 §9).
 * Null when the scan found no other copy of this binary name. The middle
 * sentence changes when a Phase 23 override pinned the path, because "it
 * comes first on your PATH" would then be false.
 */
export function shadowedLine(
  agent: DetectedAgent
): InstallCopySegment[] | null {
  const shadowed = agent.shadowed ?? [];
  if (shadowed.length === 0) return null;
  if (agent.binPath === null || agent.binPath === undefined) return null;
  const countWord =
    COPY_COUNT_WORDS[Math.min(shadowed.length - 1, COPY_COUNT_WORDS.length - 1)];
  const line: InstallCopySegment[] = [
    { code: false, text: `${countWord} copies of ` },
    { code: true, text: lastSegment(agent.binPath) },
    { code: false, text: ' are installed. Tortie uses ' },
    { code: true, text: homePath(agent.binPath) },
    ...versionClause(agent.version),
    {
      code: false,
      text:
        agent.overridden === true
          ? ', because you set its path in your agents file and confirmed it.'
          : ', because it comes first on your PATH.'
    }
  ];
  for (const copy of shadowed) {
    line.push(
      { code: false, text: ' There is also ' },
      { code: true, text: homePath(copy.path) },
      ...versionClause(copy.version),
      { code: false, text: '.' }
    );
  }
  return line;
}
