/**
 * gmux settings — shared wire shapes + defaults (Phase 10, S13).
 *
 * NEW FILE appended to src/shared by the settings+hotkeys stream (shared/*
 * is append-only during parallel builds — nothing existing was edited).
 *
 * The persisted store lives in main (src/main/settings/store.ts, userData
 * JSON); renderers read/write it over the settings:* channels appended to
 * src/shared/ipc.ts. Everything here is pure data + pure helpers so both
 * processes (and unit tests) can share one definition of "valid settings".
 */

import type { LaunchableAgentId, LaunchableAgentKind } from './types';

// ---------------------------------------------------------------------------
// Settings shape
// ---------------------------------------------------------------------------

export interface GmuxSettings {
  /**
   * Agent preselected in the ⌘T modal (S13 General). Explicit 'claude' out
   * of the box — never alphabetical (registry rule 8). 'shell' is allowed.
   */
  defaultAgent: LaunchableAgentKind;
  /**
   * Per-agent "new session" shortcut, as an Electron accelerator string
   * (e.g. "Cmd+Shift+C"). Registered as native Session-menu accelerators;
   * pressing one creates `<agent>-<n>` in the active project (S13 Hotkeys).
   * Absent key = no shortcut assigned. ⌘T stays the generic new-session.
   */
  hotkeys: Partial<Record<LaunchableAgentId, string>>;
  /**
   * Per-agent launch-default flags: the exact `flag` strings of presets from
   * the flag catalog (src/main/agents/flags.ts) the user enabled in
   * Settings → Launch defaults. Applied at session create (quick-create and
   * hotkey launches) and pre-checked in the ⌘T Options group (S6/S13).
   * Only flags present in the agent's cataloged presets survive main-side
   * sanitization — this map can never smuggle arbitrary argv.
   */
  launchDefaults: Partial<Record<LaunchableAgentId, string[]>>;
  /**
   * "<agentId> <flag>" keys whose danger confirm has been accepted once —
   * first enable of a danger preset confirms, later re-enables don't (S13).
   */
  dangerAcknowledged: string[];
}

/** Shallow patch — present keys replace the stored value wholesale. */
export type GmuxSettingsPatch = Partial<GmuxSettings>;

export function defaultGmuxSettings(): GmuxSettings {
  return {
    defaultAgent: 'claude',
    hotkeys: {},
    launchDefaults: {},
    dangerAcknowledged: []
  };
}

/** Key for the confirm-once danger acknowledgement list. */
export function dangerKey(agentId: string, flag: string): string {
  return `${agentId} ${flag}`;
}

// ---------------------------------------------------------------------------
// Flag-preset wire shapes (agents:flagPresets)
// ---------------------------------------------------------------------------

/**
 * One launch-flag preset as sent to renderers. Mirrors the catalog entry in
 * src/main/agents/flags.ts minus main-only fields; `verified` carries the
 * provenance discipline — only VERIFIED presets may be offered as toggles
 * or appended to an argv (RESEARCH ones render informationally at most).
 */
export interface AgentFlagPresetView {
  /** Exact argv token(s), space-separated when the flag takes a value. */
  flag: string;
  label: string;
  description: string;
  /** Danger-styled, off by default, confirm-once on first default-enable. */
  danger: boolean;
  /** provenance === 'VERIFIED' against the installed build's --help. */
  verified: boolean;
}

export interface AgentFlagCatalogView {
  agentId: LaunchableAgentId;
  /** Binary the flags apply to (registry binaries[0]). */
  binary: string;
  /** --help-inspected build version; null = not installed when cataloged. */
  helpVerifiedVersion: string | null;
  presets: AgentFlagPresetView[];
}

/** agents:flagPresets response: catalog per launchable registry agent. */
export type AgentFlagCatalogs = Partial<
  Record<LaunchableAgentId, AgentFlagCatalogView>
>;

// ---------------------------------------------------------------------------
// Pure helpers shared by main (sanitize/apply) and renderers (selectors)
// ---------------------------------------------------------------------------

/** Split a preset's `flag` field into argv tokens (fixed values included). */
export function presetArgvTokens(flag: string): string[] {
  return flag.split(' ').filter((t) => t.length > 0);
}

/**
 * The launch-default argv tokens for one agent: enabled flags, filtered to
 * presets that exist in the catalog AND are verified, in catalog order.
 * Used by every create path that bypasses the ⌘T modal (quick-create,
 * hotkey launches); the modal instead PRE-CHECKS these and sends its own
 * final selection (per-session toggling never writes back to Settings).
 */
export function defaultLaunchArgs(
  agentId: string,
  settings: Pick<GmuxSettings, 'launchDefaults'>,
  catalogs: AgentFlagCatalogs
): string[] {
  const catalog = (catalogs as Record<string, AgentFlagCatalogView | undefined>)[
    agentId
  ];
  const enabled =
    (settings.launchDefaults as Record<string, string[] | undefined>)[agentId] ??
    [];
  if (!catalog || enabled.length === 0) return [];
  const enabledSet = new Set(enabled);
  return catalog.presets
    .filter((p) => p.verified && enabledSet.has(p.flag))
    .flatMap((p) => presetArgvTokens(p.flag));
}
