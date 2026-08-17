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
  /**
   * Per-agent SpecStory capture default (Phase 15, research 13 §3.1): does a
   * new session of this agent start with capture ON? Absent = OFF, which is
   * the first-run answer for every agent — capture writes `.specstory/` into
   * the user's repo and, when signed in, uploads transcripts, and neither
   * should happen by surprise.
   *
   * This is a STICKY LAST CHOICE, not a policy: the ⌘T modal prefills from it
   * and writes the user's flip back, and Settings → SpecStory edits the same
   * map. Only agents SpecStory has a provider for can appear here.
   */
  captureDefaults: Partial<Record<LaunchableAgentId, boolean>>;
  /**
   * How much output each session KEEPS — tmux `history-limit` for panes
   * created from now on (Phase 13.7). This is what scrolling and capture can
   * reach; it is not what the terminal preloads on reattach (that is
   * `savedScrollbackLines`, and the two are independent — see below).
   *
   * Applied at PANE CREATION and nowhere else: no tmux option changes the
   * depth of a pane that already exists (`set -p history-limit` returns 0,
   * echoes back from `show -p`, and does nothing — measured on 3.6a).
   */
  scrollbackLines: number;
  /**
   * How much of a session COMES BACK after a restart — the lines captured
   * into its reboot snapshot. Bounded by quit latency, not disk: the captures
   * serialise inside the single-threaded tmux server, so 16 sessions at
   * 50,000 lines is 4.7-9.0 s of beachball on the quit path.
   */
  savedScrollbackLines: number;
  /**
   * Which highlight scheme the renderer derives token overrides from
   * (Phase 62). 'blue' is the shipped palette and derives ZERO overrides.
   * This is a preference with no danger semantics. It never touches the
   * danger seal. A hand-edited file can at worst pick a different preset.
   */
  highlightScheme: HighlightScheme;
  /**
   * Which contrast step the renderer derives token overrides from
   * (Phase 62). 'normal' derives ZERO overrides. Same posture as
   * `highlightScheme` above. No danger semantics, never sealed.
   */
  contrastLevel: ContrastLevel;
}

// ---------------------------------------------------------------------------
// Appearance (Phase 62). The value unions and their membership checks.
// ---------------------------------------------------------------------------

/**
 * The highlight scheme presets, in UI order. The preset DATA (target OKLCH
 * hues, the token family each one recolors) lives in
 * src/renderer/theme/presets.ts. Here is only the persisted id.
 */
export type HighlightScheme = 'blue' | 'teal' | 'purple' | 'slate';
export const HIGHLIGHT_SCHEMES: readonly HighlightScheme[] = [
  'blue',
  'teal',
  'purple',
  'slate'
];
export const DEFAULT_HIGHLIGHT_SCHEME: HighlightScheme = 'blue';

/** The contrast steps, in UI order. 'normal' is the shipped palette. */
export type ContrastLevel = 'normal' | 'raised' | 'high';
export const CONTRAST_LEVELS: readonly ContrastLevel[] = [
  'normal',
  'raised',
  'high'
];
export const DEFAULT_CONTRAST_LEVEL: ContrastLevel = 'normal';

/**
 * Membership check for a persisted highlight scheme. Anything outside the
 * union falls back to the default, following the `clampScrollbackLines`
 * pattern: one pure helper here so main sanitization and tests share one
 * definition of "valid".
 */
export function sanitizeHighlightScheme(value: unknown): HighlightScheme {
  return typeof value === 'string' &&
    (HIGHLIGHT_SCHEMES as readonly string[]).includes(value)
    ? (value as HighlightScheme)
    : DEFAULT_HIGHLIGHT_SCHEME;
}

/** Membership check for a persisted contrast level. Same pattern as above. */
export function sanitizeContrastLevel(value: unknown): ContrastLevel {
  return typeof value === 'string' &&
    (CONTRAST_LEVELS as readonly string[]).includes(value)
    ? (value as ContrastLevel)
    : DEFAULT_CONTRAST_LEVEL;
}

// ---------------------------------------------------------------------------
// Scrollback bounds (Phase 13.7) — measured, see docs/research/23-*.md
// ---------------------------------------------------------------------------

/**
 * The depth range offered for `scrollbackLines`.
 *
 * The ceiling is set by LATENCY, not RAM. Before Phase 13.7 a scrollbar drag
 * to the top of a deep session ran tmux's per-line copy-mode loop and froze
 * the whole single-threaded server — 3,958 ms at 200,000 lines. That is fixed
 * (the drag is now an O(1) absolute seek), but `capture-pane` at quit and the
 * grid itself still scale with depth: 20 sessions × 100,000 lines of dense
 * truecolour is 9.2 GB, which a 16 GB machine feels.
 */
export const MIN_SCROLLBACK_LINES = 1_000;
export const MAX_SCROLLBACK_LINES = 100_000;
export const DEFAULT_SCROLLBACK_LINES = 25_000;

/**
 * The range offered for `savedScrollbackLines`. The 25,000 ceiling is where
 * two independent walls arrive together: quit latency (2.3-4.5 s across 16
 * sessions) and the 64 MB `maxBuffer` on the capture (25.3 MB worst case).
 */
export const MIN_SAVED_SCROLLBACK_LINES = 500;
export const MAX_SAVED_SCROLLBACK_LINES = 25_000;
export const DEFAULT_SAVED_SCROLLBACK_LINES = 10_000;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Depth for new sessions, clamped. */
export function clampScrollbackLines(value: unknown): number {
  return clampInt(
    value,
    MIN_SCROLLBACK_LINES,
    MAX_SCROLLBACK_LINES,
    DEFAULT_SCROLLBACK_LINES
  );
}

/**
 * Saved depth, clamped — and never deeper than the session keeps, because
 * saving more than exists is a promise the capture cannot fulfil.
 */
export function clampSavedScrollbackLines(
  value: unknown,
  scrollbackLines: number
): number {
  const ceiling = Math.max(
    MIN_SAVED_SCROLLBACK_LINES,
    Math.min(MAX_SAVED_SCROLLBACK_LINES, scrollbackLines)
  );
  return clampInt(
    value,
    MIN_SAVED_SCROLLBACK_LINES,
    ceiling,
    Math.min(DEFAULT_SAVED_SCROLLBACK_LINES, ceiling)
  );
}

/** Shallow patch — present keys replace the stored value wholesale. */
export type GmuxSettingsPatch = Partial<GmuxSettings>;

export function defaultGmuxSettings(): GmuxSettings {
  return {
    defaultAgent: 'claude',
    hotkeys: {},
    launchDefaults: {},
    dangerAcknowledged: [],
    captureDefaults: {},
    scrollbackLines: DEFAULT_SCROLLBACK_LINES,
    savedScrollbackLines: DEFAULT_SAVED_SCROLLBACK_LINES,
    highlightScheme: DEFAULT_HIGHLIGHT_SCHEME,
    contrastLevel: DEFAULT_CONTRAST_LEVEL
  };
}

/**
 * Does a new session of this agent start with SpecStory capture on? Absent
 * means OFF — the create paths read this one helper so "no stored answer" can
 * never be read as "yes" by one caller and "no" by another.
 */
export function captureDefaultFor(
  settings: Pick<GmuxSettings, 'captureDefaults'>,
  agentId: string
): boolean {
  return (
    (settings.captureDefaults as Record<string, boolean | undefined>)[agentId] ===
    true
  );
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
