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
 * Phase 23 lets a user add a thirteenth agent in
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
 *     It never filters against the seed, so a thirteenth agent appears with
 *     no edit here.
 *  2. `agentShortLabel` learns display names from every scan it is handed, so
 *     a user-added agent reads as its own name in Context rows and resume
 *     copy instead of as a bare id.
 *  3. The seed carries its `unverified` answer per row rather than deriving it
 *     from an id, and the conformance gate fails when it disagrees with the
 *     registry.
 */

import { useEffect, useState } from 'react';
import type { AgentAvailability, GmuxAgentExtras } from '@shared/ipc';
import type {
  AgentsScanResult,
  LaunchableAgentKind
} from '@shared/types';

/**
 * Install commands surfaced next to a disabled agent option.
 *
 * Two entries, and that is deliberate rather than unfinished: these are the
 * only two agents whose install line Tortie has verified. Inventing a command
 * for the other eight would put an unchecked shell line in front of a user.
 * Read it through {@link agentInstallCommand} so a caller never has to write
 * the `id === 'claude' || id === 'codex'` test again.
 */
export const AGENT_INSTALL_COMMANDS: Record<'claude' | 'codex', string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  codex: 'npm install -g @openai/codex'
};

/**
 * The install line for an agent, or null when Tortie has not verified one.
 *
 * A user-added agent always returns null. Tortie did not install it and has
 * nothing true to say about how to.
 */
export function agentInstallCommand(id: string): string | null {
  return id === 'claude' || id === 'codex' ? AGENT_INSTALL_COMMANDS[id] : null;
}

const OPTIMISTIC: AgentAvailability = { claude: true, codex: true };

let cached: AgentAvailability | null = null;
let inflight: Promise<AgentAvailability> | null = null;

function agentExtras(): GmuxAgentExtras {
  return (window.gmux ?? {}) as unknown as GmuxAgentExtras;
}

export function fetchAgentAvailability(): Promise<AgentAvailability> {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight !== null) return inflight;
  const probe = agentExtras().agentAvailability;
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
  { id: 'pi', label: 'Pi', unverified: false }
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
 * The seed wins for the ten compiled agents, because its labels are chosen
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
 * the other twelve.
 */
export function buildAgentOptions(
  scan: AgentsScanResult | null,
  avail: AgentAvailability
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
        configState: a.configState ?? null
      }));
  } else {
    options = SEED_AGENTS.map(({ id, label, unverified }) => ({
      id,
      label,
      iconKey: id,
      installed: id === 'claude' || id === 'codex' ? avail[id] : true,
      unverified,
      // The seed is the twelve compiled agents. None of them has anything to
      // confirm, and a configured agent is correctly absent before a scan.
      configState: null
    }));
  }
  options.push({
    id: 'shell',
    label: 'Shell',
    iconKey: 'shell',
    installed: true,
    unverified: false,
    configState: null
  });
  return options;
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
