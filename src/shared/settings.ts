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
  /**
   * Which face the terminal and the editor draw with (Phase 78). 'system'
   * derives ZERO overrides and is byte identical to the shipped stylesheet.
   * It has the same posture as `highlightScheme` and `contrastLevel` above.
   * It is a preference with no danger semantics and it is never sealed. A
   * hand-edited file can at worst pick a different preset.
   */
  workAreaFont: WorkAreaFont;
  /**
   * The family a 'custom' workAreaFont draws with (Phase 78.1). '' when none
   * was typed, which reads as Menlo through the same fallback System uses.
   */
  workAreaFontCustom: string;
  /**
   * The hue of the frame around the work (Phase 207), a whole degree on the
   * circle. 222 is the shipped graphite and derives ZERO overrides. It has
   * the same posture as the three above: a preference with no danger
   * semantics, never sealed. A hand-edited file can at worst pick a hue.
   */
  chromeHue: number;
  /**
   * Where the frame's ramp sits, from near black upward (Phase 210), as a
   * whole stop offset from the shipped ramp. 0 is the shipped graphite and
   * derives ZERO overrides. Same posture as `chromeHue` above: a preference
   * with no danger semantics, never sealed.
   */
  chromeShade: number;
  /**
   * How far the frame's ramp spreads between its darkest and lightest token
   * (Phase 210), as a whole stop offset. 0 is the shipped distances and
   * derives ZERO overrides. Same posture as `chromeShade` above.
   */
  chromeDepth: number;
  /**
   * Who writes the project line (Phase 138). Absent on every install that has
   * never opened Settings and picked one, which is what "None" is.
   *
   * This value DECIDES WHAT RUNS, so it is not a preference in the sense the
   * three above are. It is sealed exactly the way a danger launch default is,
   * because CLAUDE.md refusal 8 reads that nothing may cause a process to
   * start on a configuration change alone. See src/main/settings/store.ts.
   */
  fold: FoldSettings;
  /**
   * Who fills in the architecture contract (Phase 158). Absent on every
   * install that has never opened Settings and picked one, which is what
   * "None" is. With None chosen a project still gets the deterministic
   * skeleton, and no agent ever runs for the arch pass.
   *
   * This value DECIDES WHAT RUNS, exactly as `fold` above does, so it rides
   * the same danger seal. A settings file an agent edited comes back as None,
   * and the Settings page says one sentence about it.
   */
  arch: ArchSettings;
  /**
   * Which providers' subscription usage the meter reads (Phase 181). BOTH
   * DEFAULT OFF, and off means nothing at all happens: main opens no
   * keychain, opens no credentials file and makes no request.
   *
   * This value is NOT sealed, and that is a decision rather than an
   * oversight. The seal exists for refusal 8, being that nothing may cause a
   * process to START on a configuration change alone. What it can cause is
   * one HTTPS GET to the vendor that issued the token being sent, and that
   * destination is compiled in and cannot be named by any configuration, so
   * the worst a hand edited file can do is ask Anthropic or OpenAI about the
   * person's own plan.
   *
   * PHASE 182 RE EXAMINED THAT AND IT STILL HOLDS, and the reasoning is here
   * rather than in a commit message because the claim moved. With `claude`
   * on, a claude session Tortie launches from then on carries a managed
   * status line, and claude runs it on the person's own turns. So the switch
   * does now decide that something runs. What it CANNOT do is decide WHAT
   * runs: the script is generated whole by Tortie from
   * src/main/usage/statusline.ts, it lives under Tortie's own userData, and
   * no field of any settings file reaches its bytes or its argv. That is the
   * boundary refusal 8 draws, being that configuration selects from choices
   * the compiled world already contains. It is also why Tortie refuses to
   * compose a status line command the person's own settings file names.
   *
   * IT REACHES A SESSION AT ITS NEXT LAUNCH OR RESTORE, because claude reads
   * its settings once at process start. Turning the switch off stops the
   * numbers at once, and a session launched while it was on goes on running
   * the script until it ends; every post it makes is dropped.
   */
  usage: UsageSettings;
}

/**
 * Which window the ONE bar per provider fills to (Phase 181.2).
 *
 * Phase 181 filled the bar to whichever of the two windows was further along
 * and put no label on the bar at all, so a person read the bar against the
 * first number in the line beside it and the two disagreed: the operator's
 * screenshot of 2026-08-31 reads 32 percent 5h with the bar filled to 62.
 * The maximum is defensible, being the window that will stop you first, but
 * an unlabelled maximum is the confusion, so it became a choice a person
 * makes and the five hour window is the shipped answer.
 *
 * ONE SETTING FOR BOTH PROVIDERS. There is no per provider variant, and the
 * hover card goes on naming every window in full whatever this says.
 */
export type UsageBarWindow = 'five-hour' | 'seven-day' | 'most-used';

/** In the order the choice is offered. */
export const USAGE_BAR_WINDOWS: readonly UsageBarWindow[] = [
  'five-hour',
  'seven-day',
  'most-used'
];

/**
 * The shipped answer, and the reason this setting exists: the bar agrees with
 * the number a person reads first.
 */
export const DEFAULT_USAGE_BAR_WINDOW: UsageBarWindow = 'five-hour';

/**
 * The per provider opt in (Phase 181) and the bar's window (Phase 181.2).
 * Absent on every settings file written before its phase: absent reads as off
 * for both switches, and as the five hour window for the bar.
 */
export interface UsageSettings {
  claude: boolean;
  codex: boolean;
  bar: UsageBarWindow;
}

/** Both meters off, bar on the five hour window. The shipped answer. */
export function noUsageChosen(): UsageSettings {
  return { claude: false, codex: false, bar: DEFAULT_USAGE_BAR_WINDOW };
}

/** A stored bar choice, or the shipped one when the value is not a choice. */
export function sanitizeUsageBarWindow(raw: unknown): UsageBarWindow {
  return USAGE_BAR_WINDOWS.includes(raw as UsageBarWindow)
    ? (raw as UsageBarWindow)
    : DEFAULT_USAGE_BAR_WINDOW;
}

/**
 * Coerce a parsed `usage` value into a valid object.
 *
 * Anything that is not literally `true` reads false, per switch, which is the
 * shipped default and what every settings file written before Phase 181
 * means. A bar value that is not one of the three choices reads as the five
 * hour window, which is what a file written before Phase 181.2 says by having
 * no bar value at all. A half valid object is not dropped whole here because
 * there is nothing to keep consistent: each field stands alone and a bad one
 * reads as the shipped answer, which is the safe direction.
 */
export function sanitizeUsageSettings(raw: unknown): UsageSettings {
  if (raw === null || typeof raw !== 'object') return noUsageChosen();
  const obj = raw as Record<string, unknown>;
  return {
    claude: obj['claude'] === true,
    codex: obj['codex'] === true,
    bar: sanitizeUsageBarWindow(obj['bar'])
  };
}

/**
 * The fold choice (Phase 138). Null on both fields means None, and None is
 * the shipped answer: Phase 137's built line is what the page draws then, and
 * the page is complete without any model.
 */
export interface FoldSettings {
  /** The registry id of the agent that writes the project line. Null means None. */
  agentId: string | null;
  /** A model id from that agent's compiled list. Null means None. */
  model: string | null;
}

/** No fold harness chosen. The shipped answer, and a valid one forever. */
export function noFoldChosen(): FoldSettings {
  return { agentId: null, model: null };
}

/** Has a person picked a harness and a model? Both are needed to spawn. */
export function foldIsChosen(fold: FoldSettings): boolean {
  return fold.agentId !== null && fold.model !== null;
}

/** The sealed key for a fold choice, being the pair that decides what runs. */
export function foldKey(agentId: string, model: string): string {
  return `${agentId} ${model}`;
}

/**
 * The arch enrichment choice (Phase 158). Null on both fields means None, and
 * None is the shipped answer: the deterministic skeleton is what a project
 * with no contract gets then, and the Architecture view is complete without
 * any model. The shape mirrors `FoldSettings` on purpose, because the two
 * choices are the same question asked about two different surfaces, and the
 * seal treats them the same way. They are separate FIELDS with separate seal
 * entries, so agreeing to one never agrees to the other.
 */
export interface ArchSettings {
  /**
   * Is the Architecture surface on at all (Phase 175)? DEFAULT FALSE. While
   * false the activity bar has no Architecture icon, the View menu has
   * neither Architecture row, the view chord and the two menu actions do
   * nothing, and the map tab refuses to open. Settings then Architecture
   * stays visible ALWAYS and carries the switch at its head, because the
   * setting is the only way back in: a flag that hid its own page would
   * strand whoever flipped it. Visibility only. This field decides what is
   * SHOWN and never causes anything to run, so it is not part of the sealed
   * key below and a missing field simply reads false, which is what every
   * settings file written before this phase should mean.
   */
  enabled: boolean;
  /** The registry id of the agent that fills in the contract. Null means None. */
  agentId: string | null;
  /** A model id from that agent's compiled arch recipe. Null means None. */
  model: string | null;
}

/**
 * No arch harness chosen and the surface off. The shipped answer, and a
 * valid one forever. Callers that mean only "drop the harness pair" spread
 * the existing settings instead, so a dropped choice never flips the
 * person's visibility switch behind their back.
 */
export function noArchChosen(): ArchSettings {
  return { enabled: false, agentId: null, model: null };
}

/** Has a person picked a harness and a model? Both are needed to spawn. */
export function archIsChosen(arch: ArchSettings): boolean {
  return arch.agentId !== null && arch.model !== null;
}

/**
 * The sealed key for an arch choice. Same "<agentId> <model>" text as
 * `foldKey`, but sealed under the DangerState's own `arch` field, so a fold
 * agreement can never be replayed as an arch agreement or the other way
 * around.
 */
export function archKey(agentId: string, model: string): string {
  return `${agentId} ${model}`;
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
// The frame's hue (Phase 207). One number on the circle.
// ---------------------------------------------------------------------------

/**
 * The hue the shipped ramp is declared at (tokens.css section 1.1). The
 * slider's default, and the position at which the rotation in
 * src/shared/chrome-hue.ts is the identity.
 */
export const DEFAULT_CHROME_HUE = 222;

/** The last whole degree a slider offers. 360 wraps to 0. */
export const CHROME_HUE_MAX = 359;

/**
 * A persisted or typed hue, made into a whole degree on the circle. Anything
 * that is not a finite number is the default. 360 is 0, 361 is 1, -1 is 359
 * and 222.4 is 222, so a hand-edited file can at worst pick another hue.
 */
export function sanitizeChromeHue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_CHROME_HUE;
  }
  const whole = Math.round(value);
  return ((whole % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// The frame's own lightness (Phase 210). Two stops, and both are whole steps.
// ---------------------------------------------------------------------------

/**
 * WHERE THE RAMP SITS, as an offset in stops from the shipped ramp. Stop 0 is
 * the shipped graphite and derives ZERO overrides. Each stop moves the CANVAS
 * by CHROME_SHADE_STEP in OKLCH lightness and slides every other neutral with
 * it, so the ramp keeps its shape and only its height changes.
 *
 * The two ends are measured rather than chosen, over every whole degree of the
 * circle and all three contrast levels:
 * - Stop 2 is the lightest the ramp goes before the git decorations and the
 *   graph lanes fall under 3:1 on `--bg-active`, which this phase does not
 *   move. The canvas there is #1e1f23.
 * - Stop -4 is the darkest the ramp goes before two of its rungs render as the
 *   same eight bit colour. Below that the ramp stops being a ramp: at stop -5
 *   the canvas is #010102 and no depth makes the rungs separate again.
 *
 * So a person can go four stops darker and two lighter, and the light half is
 * the half he asked for. Near black is reachable and BLACK IS NOT, because a
 * black frame cannot carry a legible ramp in eight bits.
 */
export const CHROME_SHADE_STEP = 0.025;
export const CHROME_SHADE_MIN = -4;
export const CHROME_SHADE_MAX = 2;
export const DEFAULT_CHROME_SHADE = 0;

/**
 * HOW FAR THE RAMP SPREADS, as a multiplier on the distance each neutral
 * already sits from the canvas. Stop 0 is 1.0, the shipped distances, and
 * derives ZERO overrides. A multiplier never reorders the ramp, which is the
 * property that keeps `--bg-sidebar` below `--bg-canvas` at every setting.
 *
 * The ends are measured the same way. Below 0.50 the rungs collide in eight
 * bits at every shade; above 1.75 the git decorations fall under their floor
 * at the shipped shade even at the normal contrast level.
 */
export const CHROME_DEPTH_FACTORS: readonly number[] = [
  0.5, 0.65, 0.8, 1, 1.25, 1.5, 1.75
];
export const CHROME_DEPTH_MIN = -3;
export const CHROME_DEPTH_MAX = 3;
export const DEFAULT_CHROME_DEPTH = 0;

function wholeStopIn(value: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

/**
 * A persisted or typed shade stop, made a whole stop inside the range. Unlike
 * the hue this CLAMPS rather than wraps, because the ends of this axis are
 * where the ramp stops working rather than where the circle joins up. Anything
 * that is not a finite number is the shipped ramp.
 */
export function sanitizeChromeShade(value: unknown): number {
  return wholeStopIn(value, CHROME_SHADE_MIN, CHROME_SHADE_MAX, DEFAULT_CHROME_SHADE);
}

/** A persisted or typed depth stop. Same rule as the shade above. */
export function sanitizeChromeDepth(value: unknown): number {
  return wholeStopIn(value, CHROME_DEPTH_MIN, CHROME_DEPTH_MAX, DEFAULT_CHROME_DEPTH);
}

// ---------------------------------------------------------------------------
// The work area font (Phase 78). A family picker, and no size control.
// ---------------------------------------------------------------------------

/**
 * Which face the terminal and the editor draw with, in UI order (Phase 78).
 * 'system' is the shipped answer and writes no token override at all, so an
 * install that never opens the section renders the shipped stylesheet bytes.
 *
 * The preset DATA (the bare family name and the stack written into the two
 * tokens) lives in src/renderer/theme/work-fonts.ts. Here is only the
 * persisted id, so main can sanitize a file it reads without importing any
 * renderer module.
 *
 * There is no size field anywhere. docs/DESIGN-SPEC.md:601 withdrew the size
 * stepper, and per-region zoom already changes the terminal's size for real.
 */
export type WorkAreaFont = 'system' | 'jetbrains-mono' | 'source-code-pro' | 'custom';
export const WORK_AREA_FONTS: readonly WorkAreaFont[] = [
  'system',
  'jetbrains-mono',
  'source-code-pro',
  'custom'
];
export const DEFAULT_WORK_AREA_FONT: WorkAreaFont = 'system';

/** Membership check for a persisted work area font. Same pattern as above. */
export function sanitizeWorkAreaFont(value: unknown): WorkAreaFont {
  return typeof value === 'string' &&
    (WORK_AREA_FONTS as readonly string[]).includes(value)
    ? (value as WorkAreaFont)
    : DEFAULT_WORK_AREA_FONT;
}

/**
 * The family name a 'custom' `workAreaFont` resolves to (Phase 78.1). This is
 * the one thing the preset table cannot hold: a user-typed family is data, not
 * a compiled row, so it is persisted beside the id rather than baked into
 * src/renderer/theme/work-fonts.ts. A custom face ships no bytes, so a capture
 * taken under it falls back to Menlo exactly the way the System preset's does.
 */
export const DEFAULT_WORK_AREA_FONT_CUSTOM = '';

/**
 * The longest custom family this accepts (Phase 174). A real family name is a
 * few words, so a cap far above that costs a legitimate user nothing and stops
 * a pathological paste (the charter's 4,000 character case) from ever reaching
 * a CSS custom property, xterm's font option or the capture SVG.
 */
export const MAX_WORK_AREA_FONT_CUSTOM = 64;

/**
 * A persisted custom family, cleaned so no value can break out of the
 * `'<family>', Menlo, monospace` stack it is dropped into (Phase 174). The
 * family flows into a CSS custom property, xterm's `fontFamily`, Monaco's
 * option and the capture SVG's inline `font-family`. This is the one boundary
 * that decides what those sinks ever see, so it refuses every character that
 * could end the quoted string, start a new declaration, open a function like
 * `url()`, break the SVG's style attribute, or hide itself while changing what
 * the name looks like. A real family name carries none
 * of them, so the cleaning is invisible to a legitimate name and total for a
 * hostile one. The result is trimmed, its inner whitespace collapsed, and
 * capped; '' when nothing usable is left, which reads as Menlo through the
 * same fallback the System preset uses.
 */
export function sanitizeWorkAreaFontCustom(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_WORK_AREA_FONT_CUSTOM;
  const cleaned = value
    // Control characters, which includes newlines, carriage returns and tabs.
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // The INVISIBLE controls, added in Phase 174.1's fix round now that names
    // arrive from font files rather than only from a keyboard. A family name
    // carrying U+202E would draw its own row in the suggestion dropdown
    // backwards, and a zero width character would make two different rows look
    // identical. Neither can be seen, so neither can be judged.
    //
    // PHASE 206 REPLACED THE HAND WRITTEN LIST WITH THE PROPERTY ITSELF. Phase
    // 174.1 spelled out the bidi set, the zero width set, the separators and
    // the byte order mark; Phase 197 item 10 added U+061C, the one Bidi_Control
    // character outside those ranges. The Phase 197 verifier then attacked the
    // widened class with characters the builder never tried and 19 of 21 rode
    // through, because a list closes the gap it was written for and not the
    // category the gap came from. Measured over the whole of Unicode on
    // 2026-09-02: the old class refused 27 code points and 4,179 more with the
    // same property walked past it, 410 of them assigned.
    //
    // THE RULE IS THE UNION OF TWO PROPERTIES, and it needs both. Unicode's
    // Default_Ignorable_Code_Point is the category the whole family belongs to,
    // being the variation selectors, the tag block, the Hangul fillers, the
    // Mongolian selectors and the soft hyphen; it leaves 32 assigned format
    // characters out, being the Arabic number signs, the interlinear
    // annotation marks and the Egyptian hieroglyph format controls, and
    // `\p{Cf}` is what takes those. U+2028 and U+2029 are in neither, so they
    // stay spelled. A character Unicode adds to either property later is
    // refused by this line without another round, which is the whole point of
    // naming the property rather than its members.
    .replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}\u2028\u2029]/gu, '')
    // Quotes, backslash, and the structural punctuation a family never holds:
    // string delimiters, statement and declaration terminators, and the
    // brackets that open a function or a block. Stripping the parenthesis pair
    // is what neutralises a `url(...)` fragment.
    .replace(/["'`\\;{}()[\]<>]/g, '')
    // Collapse the whitespace the strips may have left ragged.
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, MAX_WORK_AREA_FONT_CUSTOM).trim();
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
    contrastLevel: DEFAULT_CONTRAST_LEVEL,
    workAreaFont: DEFAULT_WORK_AREA_FONT,
    workAreaFontCustom: DEFAULT_WORK_AREA_FONT_CUSTOM,
    chromeHue: DEFAULT_CHROME_HUE,
    chromeShade: DEFAULT_CHROME_SHADE,
    chromeDepth: DEFAULT_CHROME_DEPTH,
    fold: noFoldChosen(),
    arch: noArchChosen(),
    usage: noUsageChosen()
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
