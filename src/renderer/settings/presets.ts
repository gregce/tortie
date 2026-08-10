/**
 * SHARED SELECTOR — launch-flag presets + persisted per-agent defaults.
 *
 * This is the ONE renderer source for "which flag toggles does agent X
 * offer, and which are enabled by default". Consumers:
 *  - the ⌘T create-session modal (S6 Options group): call
 *    useAgentPresetOptions(agentId) to render toggles with `defaultOn`
 *    pre-checked (danger presets pre-check too, keeping their styling), and
 *    send the user's FINAL selection as CreateSessionInput.extraArgs —
 *    per-session toggling never writes back to Settings;
 *  - quick-create + hotkey launches (no modal): defaultLaunchArgsFor(id)
 *    is the extraArgs to pass;
 *  - Settings → Launch defaults edits the persisted map these read.
 *
 * Only VERIFIED presets are ever offered or appended (flags.ts provenance
 * discipline); RESEARCH entries stay data-only.
 */

import { useEffect } from 'react';
import type { AgentFlagPresetView, GmuxSettings } from '@shared/settings';
import { defaultLaunchArgs } from '@shared/settings';
import { useSettingsStore } from './settings-store';

/** One toggle row for the ⌘T Options group / Settings Launch defaults. */
export interface AgentPresetOption extends AgentFlagPresetView {
  /** Enabled in Settings → Launch defaults → pre-checked in the modal. */
  defaultOn: boolean;
}

/** Pure form (testable): options for one agent from explicit inputs. */
export function agentPresetOptions(
  agentId: string,
  catalogs: ReturnType<typeof useSettingsStore.getState>['catalogs'],
  settings: Pick<GmuxSettings, 'launchDefaults'>
): AgentPresetOption[] {
  const catalog = (catalogs as Record<string, { presets: AgentFlagPresetView[] } | undefined>)[
    agentId
  ];
  if (!catalog) return [];
  const enabled = new Set(
    (settings.launchDefaults as Record<string, string[] | undefined>)[agentId] ?? []
  );
  return catalog.presets
    .filter((p) => p.verified)
    .map((p) => ({ ...p, defaultOn: enabled.has(p.flag) }));
}

/**
 * Hook form for the modal: reactive options for the selected agent.
 * Ensures the settings store is initialized (idempotent).
 */
export function useAgentPresetOptions(agentId: string): AgentPresetOption[] {
  const init = useSettingsStore((s) => s.init);
  const catalogs = useSettingsStore((s) => s.catalogs);
  const settings = useSettingsStore((s) => s.settings);
  useEffect(() => init(), [init]);
  return agentPresetOptions(agentId, catalogs, settings);
}

/**
 * The extraArgs a NO-MODAL create path (quick-create button, per-agent
 * hotkey) must pass so Settings → Launch defaults actually applies
 * (BACKLOG #8: flags land in manifest argv AND resume_argv via the
 * existing extraArgs plumbing).
 */
export function defaultLaunchArgsFor(agentId: string): string[] {
  const s = useSettingsStore.getState();
  return defaultLaunchArgs(agentId, s.settings, s.catalogs);
}

/** The persisted default agent for the ⌘T picker's initial selection. */
export function defaultAgentId(): string {
  return useSettingsStore.getState().settings.defaultAgent;
}
