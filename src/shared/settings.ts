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
import {
  envPassthroughRefusal,
  OVERLAY_ENV_KEY_PATTERN,
  OVERLAY_LIMITS
} from './agent-overlay';

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
   * PHASE 359. Whether new Claude Code, Pi, and omp sessions receive
   * Tortie's first-party `tortie` skill for their launch, through which the
   * agent may query this Tortie process (capabilities, its own session, the
   * session list) and ask it to open a validated project file.
   *
   * OFF AT INSTALL AND ON SHAPE: anything that is not literally `true`
   * reads off, which is what every settings file written before this phase
   * means. SEALED, like the fold and arch choices: it decides what reaches
   * a launch, so a person must confirm the bytes out of band of any agent
   * turn (refusal 8). Lost or damaged while the keystore is unavailable, so
   * the switch returns to off rather than lying.
   */
  agentAccess: boolean;
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
   * Per-agent environment variable NAMES Tortie reads from the login shell at
   * each launch of that agent (Phase 269). A sibling of `launchDefaults`
   * above, and set at the same place in the Settings window, because the two
   * answer one question: what is every new session of this agent made of?
   *
   * VALUES ARE STORED NOWHERE. They are resolved fresh from the login shell
   * at every launch and at every restore, handed to that one pane, and
   * written neither here, nor into the manifest row, nor into the tmux server
   * environment, nor into a log.
   *
   * THE NAMES ARE SEALED — see src/main/settings/store.ts, "The danger seal".
   * A name is a decision about which of a person's secrets a spawned process
   * is handed, so an agent that appended a name to another agent's list could
   * read a key it was never given. A name that arrives without a seal is
   * refused on read rather than honoured.
   *
   * `agents.json` remains the other route (Phase 33) and is unchanged; a
   * launch reads the union of the two.
   */
  envPassthrough: Partial<Record<LaunchableAgentId, string[]>>;
  /**
   * The shell variable NAMES every agent gets (Phase 275), beside the
   * per-agent map above. Keyed by nothing: one list, every launchable agent,
   * including agents installed after the name was confirmed.
   *
   * WHY IT EXISTS. An API key is a property of a PROVIDER, not of an agent.
   * One DeepSeek key is the same key whichever agent talks to DeepSeek, so the
   * per-agent map made a person repeat identical work once per agent — which
   * is what issue 20's reporter hit. And the per-agent shape was buying less
   * than it cost: the values come from the person's own login shell, and every
   * one of those agents, run in Terminal, already receives all of them.
   *
   * IT DOES NOT REPLACE THE MAP ABOVE, and a phase that deletes that map to
   * simplify the drawing has removed the only reason the per-agent design was
   * defensible. A person who wants one agent narrower keeps that. A launch
   * reads the UNION (`envPassthroughFor`, @shared/launch-env), so a person who
   * set both meant both.
   *
   * SEALED IN ITS OWN FIELD — `DangerState.envShared` in
   * src/main/settings/store.ts, never in `env`. The agreement this list carries
   * is WIDER than a per-agent one, so a per-agent agreement must never be
   * replayable as this one. That is layer two of the seal moving by design; the
   * layer that does NOT move is that a name no human confirmed is dropped.
   *
   * VALUES ARE STORED NOWHERE, exactly as above.
   */
  envPassthroughShared: string[];
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
   * Which base palette the whole app draws from (Phase 213): 'dark', the
   * shipped graphite; 'light', the paper; or 'system', which follows the
   * Mac's own appearance and turns with it. 'dark' is the default and
   * derives ZERO overrides, and the dark base is byte identical to what
   * shipped before the field existed. Same posture as the frame fields
   * above: a preference with no danger semantics, never sealed. A hand
   * edited file holding any other value is read as 'dark'.
   */
  colorScheme: ColorScheme;
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
  /**
   * Does typing in a file save it on its own (Phase 268, issue 24)? DEFAULT
   * OFF, and off means no timer is ever armed.
   *
   * It is NOT sealed, and it starts no process. What it does do is write a
   * person's files on a timer, so the write itself goes through the SAME
   * guarded door a ⌘S takes (`fs:writeGuarded`), with the digest of what
   * Tortie last read as the precondition. A file something else wrote
   * underneath the buffer is refused and auto save stops for that file until
   * the person saves it themselves. See src/renderer/editor/auto-save.ts.
   */
  autoSave: AutoSaveSettings;
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
  /**
   * Does the fact base run its one hop wrapper pass (Phase 257)? DEFAULT
   * FALSE. The pass closes call sites that reach an anchor api through a
   * locally declared function, which is this repository's own
   * `handle(ipc, channel, fn)` shape: 0 of 229 IPC channels visible without
   * it and 229 of 229 with it, and research 118 §6.3 measured the cost at
   * 3.15× the whole read here and 1.57× to 1.83× on repositories where it
   * finds nothing, which is why it is a setting rather than always on.
   *
   * NOT sealed, on purpose: it decides what one existing worker pool parses
   * and never what runs, the same posture as `enabled`. Only a literal
   * `true` turns it on. No control draws it in this phase; Phase 258 draws
   * the row when there is a face on which its effect can be seen, so until
   * then it is a hand editable key in `settings.json`.
   */
  wrapperPass: boolean;
}

/**
 * No arch harness chosen and the surface off. The shipped answer, and a
 * valid one forever. Callers that mean only "drop the harness pair" spread
 * the existing settings instead, so a dropped choice never flips the
 * person's visibility switch behind their back.
 */
export function noArchChosen(): ArchSettings {
  return { enabled: false, agentId: null, model: null, wrapperPass: false };
}

/** Has a person picked a harness and a model? Both are needed to spawn. */
export function archIsChosen(arch: ArchSettings): boolean {
  return arch.agentId !== null && arch.model !== null;
}

/**
 * PHASE 268 — auto save (issue 24, JnBrymn: "I keep forgetting to CTRL+S and
 * then the agent gets confused when I tell it to read a file").
 *
 * VS Code's own vocabulary, because it is the vocabulary people already know,
 * minus `onWindowChange`. That is a REFUSAL rather than an omission: Tortie is
 * a single window app whose sessions live inside that window, so a person does
 * not leave it to watch an agent, and Electron's window blur fires for the
 * Settings window, a native menu and a screenshot, so the mode would write on
 * gestures that are not "I left". `onFocusChange` already covers the gesture
 * issue 24 describes, being clicking from the editor into a terminal to tell
 * the agent to read the file. build/p268/SPEC.md section 2.
 */
export type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange';

export interface AutoSaveSettings {
  /**
   * 'off' is the default, and it is not a preference in the ordinary sense: a
   * person's files are not opted into timed writes by an upgrade.
   */
  mode: AutoSaveMode;
  /** Quiet time after the last keystroke before an `afterDelay` save. Clamped. */
  delayMs: number;
}

export const AUTO_SAVE_MODES: readonly AutoSaveMode[] = [
  'off',
  'afterDelay',
  'onFocusChange'
];

/** VS Code's own `files.autoSaveDelay` default. */
export const DEFAULT_AUTO_SAVE_DELAY_MS = 1000;
/**
 * The floor is 250 rather than VS Code's 0. A zero delay is a guarded read and
 * write PER KEYSTROKE against files agents hold open, which is a very different
 * thing on this machine than it is in an editor with one writer.
 */
export const MIN_AUTO_SAVE_DELAY_MS = 250;
export const MAX_AUTO_SAVE_DELAY_MS = 30_000;
/** The four the Settings row offers. The field itself accepts anything in range. */
export const AUTO_SAVE_DELAY_CHOICES: readonly number[] = [1000, 2000, 5000, 10_000];

/** A whole delay in range, or the shipped default for anything that is not one. */
export function clampAutoSaveDelay(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_AUTO_SAVE_DELAY_MS;
  }
  return Math.max(
    MIN_AUTO_SAVE_DELAY_MS,
    Math.min(MAX_AUTO_SAVE_DELAY_MS, Math.round(value))
  );
}

/** Is this one of the three modes shipped? */
export function isAutoSaveMode(value: unknown): value is AutoSaveMode {
  return AUTO_SAVE_MODES.includes(value as AutoSaveMode);
}

/** Nothing is saved on a timer. The shipped answer, and a valid one forever. */
export function noAutoSave(): AutoSaveSettings {
  return { mode: 'off', delayMs: DEFAULT_AUTO_SAVE_DELAY_MS };
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
// The scheme (Phase 213). Which base palette, and whether the Mac decides.
// ---------------------------------------------------------------------------

/**
 * The persisted choice, in UI order: Light, Dark, Match the Mac. The base
 * palettes themselves are the two `:root` blocks of
 * src/renderer/styles/tokens.css; here is only the id.
 */
export type ColorScheme = 'light' | 'dark' | 'system';
export const COLOR_SCHEMES: readonly ColorScheme[] = ['light', 'dark', 'system'];
export const DEFAULT_COLOR_SCHEME: ColorScheme = 'dark';

/** The base a window actually draws from once 'system' has been asked. */
export type BaseScheme = 'light' | 'dark';

/**
 * Membership check for a persisted scheme. Anything outside the union, of
 * any type, is the shipped dark, so a hand edited file can at worst pick
 * one of the three.
 */
export function sanitizeColorScheme(value: unknown): ColorScheme {
  return typeof value === 'string' &&
    (COLOR_SCHEMES as readonly string[]).includes(value)
    ? (value as ColorScheme)
    : DEFAULT_COLOR_SCHEME;
}

/**
 * The base a persisted choice resolves to, given what the Mac says. Main
 * asks nativeTheme; the renderer asks prefers-color-scheme; both are the
 * same Chromium answer, which is what keeps the compositor fill and the
 * document on one base.
 */
export function resolveScheme(scheme: ColorScheme, systemDark: boolean): BaseScheme {
  if (scheme === 'system') return systemDark ? 'dark' : 'light';
  return scheme;
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
    // PHASE 359. Off at install. This is the delivery gate for the
    // agent-access skill; nothing is delivered until the person turns it on
    // in Settings and the seal is produced for it.
    agentAccess: false,
    hotkeys: {},
    launchDefaults: {},
    envPassthrough: {},
    // PHASE 275. Empty at install is not a nicety. It is what keeps
    // `envPassthroughFor` answering `undefined` for a person who has
    // configured nothing, which is what keeps the login shell probe unspawned
    // on every launch — one shared name makes EVERY agent's create pay for it.
    envPassthroughShared: [],
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
    colorScheme: DEFAULT_COLOR_SCHEME,
    fold: noFoldChosen(),
    arch: noArchChosen(),
    usage: noUsageChosen(),
    autoSave: noAutoSave()
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

/**
 * The sealed key for one passthrough name (Phase 269), joined exactly the way
 * `dangerKey` joins a flag.
 *
 * The agent id is part of the key rather than beside it, so a seal covering
 * one agent's name never covers another agent's, and an agent that copies a
 * sealed name into a second agent's list gets it dropped.
 */
export function envNameKey(agentId: string, name: string): string {
  return `${agentId} ${name}`;
}

/**
 * How a SHARED name is WRITTEN when it has to be read beside a per-agent key
 * (Phase 275) — in `warnRejected`'s log line and in the rejection the Settings
 * window draws.
 *
 * IT IS NOT A SEAL KEY. The shared seal holds BARE names in its own field
 * (`DangerState.envShared`, src/main/settings/store.ts), and this prefix is
 * never put into that field, never compared against it, and never parsed back
 * apart. It exists so one log line can print `* ANTHROPIC_API_KEY` next to
 * `claude FOO` and a person can tell which list lost a name.
 *
 * THE TWO KEY SPACES ARE PROVABLY DISJOINT and this function cannot collide
 * with either of them. `envNameKey` joins with a single space and
 * `OVERLAY_ENV_KEY_PATTERN` forbids a space in a name, so every per-agent key
 * holds EXACTLY ONE space and every bare shared name holds NONE. The agent id
 * half is never pattern-matched at all — it is drawn from the compiled closed
 * set `LAUNCHABLE_AGENT_IDS`, every member of which begins with a lowercase
 * letter — so no `envNameKey` output can begin with `*` either.
 */
export function envSharedKey(name: string): string {
  return `* ${name}`;
}

/**
 * The names a person's login shell exports, offered as suggestions in the
 * Settings window (Phase 269). NAMES ONLY — there is no field on this shape
 * that could carry a value.
 */
export interface EnvVarCandidates {
  /** Offerable names: refused names and the agent's own are already gone. */
  names: string[];
  /** True when the login shell did not answer at all. */
  probeFailed: boolean;
}

/**
 * WHICH LIST the Settings window is asking candidates for (Phase 275).
 *
 * A discriminated union rather than a nullable agent id, because a shared list
 * has no agent and `null` would have to mean "shared" by convention. The two
 * arms refuse different things — the agent arm refuses that agent's own
 * compiled `launch.env` keys, the shared arm refuses the union over every
 * launchable agent, because the shared list reaches every one of them — so the
 * handler has to tell them apart rather than guess.
 */
export type EnvCandidateScope =
  | { kind: 'agent'; agentId: LaunchableAgentId }
  | { kind: 'shared' };

/**
 * What the last read of `settings.json` DROPPED from the shell-variable lists
 * (Phase 275), so the Settings window can say it instead of a person finding
 * out when their agent stops seeing a key.
 *
 * TWO LAYERS DROP A NAME AND THEY GET TWO FIELDS, which is THE FIX ROUND'S
 * REPAIR and it is a truthfulness repair rather than a shape preference. The
 * build this round verified concatenated both layers into one `shared` list and
 * drew the SEAL's sentence — "Ignored, because they were not added here" — over
 * all of it. Measured on the shipping store on 2026-09-16: a settings file
 * holding sixteen shape-valid junk names ahead of a name the seal DOES cover
 * pushed the real name out at the SHAPE layer, and the one line telling a person
 * why their own confirmed key stopped arriving named that key FIRST and told
 * them it had never been added here. It had. The two layers mean different
 * things to the person reading them, so they are two fields and two sentences:
 *
 *  - `shared` is the SEAL's answer. The name is well formed and Tortie would
 *    read it; no human confirmed it in this window. Adding it here fixes it.
 *  - `sharedUnread` is the SHAPE layer's answer. Tortie will not read that name
 *    at all — it is not a name, or it is on a denylist, or it is a duplicate, or
 *    it is past the sixteen this door reads. Adding it here does NOT fix it, so
 *    sending a person to the Add sheet would be sending them to a dead end.
 *
 * SAFE TO DRAW, by construction. Every string on this shape has already passed
 * `OVERLAY_ENV_KEY_PATTERN` — letters, digits and underscore, at most 64 bytes,
 * no newline — so nothing here is a rendering primitive. An entry that could
 * NOT be named safely (a non-string, a 4 KB blob, a string with a newline in
 * it) is counted in `unnamed` and is never echoed. That is the difference
 * between "never silently dropped" and "hand an attacker a DOM".
 *
 * AND EVERY LIST HERE IS BOUNDED, which the verified build's was not. The seal
 * half always was, because the seal runs over the already-capped sanitized
 * settings; the shape half was not, because it ran over the RAW file. Measured
 * the same day: 200,000 junk names in `settings.json` produced 200,000 echoed
 * names and a single 12,088,932-byte paragraph in the Settings window. The count
 * past the echo cap is `sharedUnreadOver` — counted, never echoed, the same
 * channel `unnamed` already is.
 *
 * PHASE 278 ADDS A THIRD THING THAT CAN GO WRONG, AND IT IS A COUNT. The two
 * fields above are both about a name that IS in `settings.json` and is not
 * being used. The third is the other way round: a name the seal covers —
 * meaning a person confirmed it in this window — that the finished lists do
 * NOT contain, because the file no longer holds it or because a later build
 * refuses its shape. Until this phase that case was silent everywhere, and it
 * is the only one where the person is not at fault for anything.
 *
 * ON THE SHARED CARD IT COUNTS ONLY THE FIRST CAUSE (the Phase 278 fix round).
 * A sealed shared name the file still holds and the shape layer refused is
 * already NAMED in `sharedUnread`, or counted in `sharedUnreadOver`, on the same
 * card. Counting it here as well drew two sentences about one name, and the
 * second one said "Add it again", which the Add sheet would then refuse. An
 * agent card draws no shape-layer report, so `perAgentMissing` counts both
 * causes.
 *
 * IT IS A COUNT AND NEVER A LIST, and that is a consequence of a rule this
 * module already keeps rather than a preference. A per-agent seal key is
 * `envNameKey(id, name)` and no seal key in this repository is ever split back
 * apart; recovering the bare name to draw it would be the first parser over a
 * key space whose whole safety argument is that a key only has to be
 * UNAMBIGUOUS. One rule for both lists rather than a cleverer rule that names
 * them on the shared card and counts them on the agent cards.
 *
 * NAMES ONLY. There is no field here that could carry a value.
 */
export interface EnvRejections {
  /** Shared names THE SEAL dropped on the last read, bare. */
  shared: string[];
  /** Shared names THE SHAPE LAYER dropped on the last read, bare, capped. */
  sharedUnread: string[];
  /** Shape-layer drops past the echo cap: counted, never echoed. */
  sharedUnreadOver: number;
  /** Per-agent names the seal dropped on the last read, by agent id. */
  perAgent: Partial<Record<LaunchableAgentId, string[]>>;
  /** Entries dropped that could not be named safely. */
  unnamed: number;
  /**
   * Sealed SHARED names the last read did not find on the finished list and
   * did not find in the file either (Phase 278). A count, never a list. A
   * sealed name the file still holds is `sharedUnread`'s to name.
   */
  sharedMissing: number;
  /**
   * Sealed PER-AGENT names the last read did not find, by agent id
   * (Phase 278). Counts, never lists.
   */
  perAgentMissing: Partial<Record<LaunchableAgentId, number>>;
}

/** No rejection at all, which is what almost every settings file reads as. */
export function noEnvRejections(): EnvRejections {
  return {
    shared: [],
    sharedUnread: [],
    sharedUnreadOver: 0,
    perAgent: {},
    unnamed: 0,
    sharedMissing: 0,
    perAgentMissing: {}
  };
}

/**
 * Coerce a parsed `envPassthroughShared` value into a valid list, and SAY WHAT
 * IT DROPPED (Phase 275).
 *
 * A NEW FUNCTION rather than a widening of `sanitizeEnvPassthrough` below, for
 * two reasons. That one takes a MAP and asks `agentEnvKeys(id)`, and a shared
 * list has no agent. And its documented silence is a contract Phase 269 wrote
 * and this phase does not edit — the reporting belongs to the new field.
 *
 * THE UNIT THAT IS DROPPED WHOLE IS ONE NAME. A name is kept entirely or
 * dropped entirely: never trimmed, case-folded, truncated, de-duplicated into
 * something else, or otherwise repaired into an acceptable shape. The FIELD is
 * dropped whole only when it is not an array.
 *
 * ONE BAD ENTRY NEVER DENIES THE REST, and that is a security decision rather
 * than a convenience. Dropping the whole list because one entry is junk is a
 * denial any agent with write access could author in one line, and it would
 * take away every key a person set. Per-name dropping fails closed per name,
 * and it is the treatment `sanitizeEnvPassthrough` already gives.
 *
 * `sharedRefusedEnvKeys` is the union of every launchable agent's compiled
 * `launch.env` keys — today exactly `FORCE_COLOR` (cursor) and
 * `GROK_PRIVACY_NOTICE_ROLLOUT` (grok). Refusing them HERE is the honest
 * answer: the shared list reaches cursor too, and a shared `FORCE_COLOR` would
 * make the `env-unresolved` notice say a cursor pane started WITHOUT a variable
 * that pane actually has, which is the exact dishonesty
 * `envPassthroughRefusal`'s last check exists to prevent.
 *
 * `refused` IS CAPPED, AND THE FIX ROUND ADDED THAT CAP. Everything else on
 * this function was bounded by the sixteen `envPassthroughRefusal` enforces,
 * because `names` is what the cap counts. `refused` is not — it runs over the
 * RAW file, whose length is chosen by whoever wrote the file, which since this
 * phase is the exact actor layer one of the seal names. The verified build
 * pushed every refused entry into it, `store.ts` copied the whole list into the
 * `settings:envRejections` answer, and `env-copy.ts` joined the lot into ONE
 * paragraph in the Settings window. Measured against the shipping store on
 * 2026-09-16, with a 53-byte name: 1,000 names gave a 57,932-byte line, 50,000
 * gave 2,988,932 bytes, and 200,000 gave 12,088,932 bytes at a 115 ms load. A
 * SECOND re-derivation the same day, with a short name, read 11,888 bytes at
 * 1,000 — the same defect at a fifth the size, and the two readings are quoted
 * together on purpose, because the per-name cost is chosen by whoever writes the
 * file and so is the count. Nothing was unsafe — every echoed byte had passed
 * the alphabet — but a rendering primitive is a size as well as a character set,
 * and the size was the attacker's to choose.
 *
 * So the echo stops at the number this domain already spells, sixteen, and the
 * rest is a COUNT in `refusedOver`. A count is the channel `unnamed` has always
 * been, and it is separate from `unnamed` because the two say different things
 * to a person: `unnamed` means "that was not a variable name", `refusedOver`
 * means "there were more of these and Tortie stopped listing them".
 *
 * It never throws.
 */
export function sanitizeEnvPassthroughShared(
  raw: unknown,
  sharedRefusedEnvKeys: readonly string[]
): { names: string[]; refused: string[]; refusedOver: number; unnamed: number } {
  const names: string[] = [];
  const refused: string[] = [];
  let refusedOver = 0;
  let unnamed = 0;
  if (!Array.isArray(raw)) return { names, refused, refusedOver, unnamed };
  for (const entry of raw as unknown[]) {
    if (typeof entry === 'string') {
      const refusal = envPassthroughRefusal(entry, {
        existing: names,
        agentEnvKeys: sharedRefusedEnvKeys,
        scope: 'shared'
      });
      if (refusal === null) {
        names.push(entry);
        continue;
      }
    }
    if (!isDrawableEnvName(entry)) unnamed += 1;
    else if (refused.length < OVERLAY_LIMITS.maxEnvPassthroughNames) refused.push(entry);
    else refusedOver += 1;
  }
  return { names, refused, refusedOver, unnamed };
}

/**
 * Is this entry safe to print in a log line and to put in the DOM?
 *
 * THE LENGTH TEST RUNS FIRST ON PURPOSE, so a 4 MB string written into
 * settings.json by hand is refused by a comparison rather than by a regex walk.
 *
 * THE NEWLINE TEST IS A BELT, AND THE INTEGRATOR'S ROUND CORRECTED WHY. The
 * first draft of this comment copied the one on `filterRemoteEnvNames` in
 * src/main/machines/remote-env-carriage.ts, which claimed JavaScript's `$`
 * matches immediately before a FINAL NEWLINE with no `m` flag, so `"NAME\n"`
 * would pass {@link OVERLAY_ENV_KEY_PATTERN} on its own. That is Python and
 * Perl. Measured on 2026-09-16:
 * `new RegExp('^[A-Za-z_][A-Za-z0-9_]{0,63}$').test('ABC\n')` is **false**.
 * THERE WERE THREE COPIES, NOT TWO. The build fixed this one and the one in
 * remote-env-carriage.ts and said so in these words — and then a verifier found
 * a third, in `build/agents-conformance-probe.mts`'s own `trailingNewline`
 * fixture comment, which the fix round corrected. That is the whole argument
 * for the two explicit checks below: a wrong claim about a regular expression
 * propagates by copy faster than anybody re-measures it.
 *
 * The two lines stay. This answer decides whether a string a person never typed
 * goes into a warning record and into the DOM, and a guard at that boundary
 * should not rest on where a regular expression decides `$` is — the pattern is
 * a shared constant, and an `m` flag added to it for some other caller would
 * open the hole silently.
 */
function isDrawableEnvName(entry: unknown): entry is string {
  return (
    typeof entry === 'string' &&
    entry.length <= OVERLAY_LIMITS.maxEnvKeyLength &&
    !entry.includes('\n') &&
    !entry.includes('\r') &&
    new RegExp(OVERLAY_ENV_KEY_PATTERN).test(entry)
  );
}

/**
 * Coerce a parsed `envPassthrough` value into a valid map (Phase 269).
 *
 * It drops an unknown id, a non array, a non string entry and every name
 * `envPassthroughRefusal` refuses, keeps the rest in order, and never throws.
 *
 * IT IS SILENT, like every other sanitizer in this file. The shape layer
 * bounds what a value may BE and cannot tell who wrote the file, which is what
 * the seal in src/main/settings/store.ts is for; a person hears about a
 * refusal at the door they typed the name into, with the sentence that door
 * shows them.
 */
export function sanitizeEnvPassthrough(
  raw: unknown,
  isLaunchable: (id: string) => boolean,
  agentEnvKeys: (id: string) => readonly string[]
): Partial<Record<LaunchableAgentId, string[]>> {
  const out: Partial<Record<LaunchableAgentId, string[]>> = {};
  if (raw === null || typeof raw !== 'object') return out;
  for (const [id, names] of Object.entries(raw as Record<string, unknown>)) {
    if (!isLaunchable(id) || !Array.isArray(names)) continue;
    const kept: string[] = [];
    for (const name of names) {
      if (typeof name !== 'string') continue;
      const refusal = envPassthroughRefusal(name, {
        existing: kept,
        agentEnvKeys: agentEnvKeys(id)
      });
      if (refusal !== null) continue;
      kept.push(name);
    }
    if (kept.length > 0) out[id as LaunchableAgentId] = kept;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The seal-aware pass (Phase 278)
// ---------------------------------------------------------------------------

/**
 * PHASE 278 — WHY THESE TWO FUNCTIONS EXIST, AND WHY THEY ARE NOT IN THE
 * SANITIZER ABOVE.
 *
 * THE DEFECT. `sanitizeEnvPassthrough` admits names in FILE ORDER and stops at
 * sixteen. The seal — "who wrote this?" — is asked four steps later, in
 * `withSealedDangerState` in src/main/settings/store.ts. So sixteen
 * valid-looking names written by anything with write access to the home
 * directory consume the whole budget before anything asks who wrote them, and
 * the seventeenth — the one the person confirmed in the Settings window — is
 * gone at the shape layer before the seal ever sees it. The seal then rejects
 * the sixteen. The person ends with no names, and the one line that exists to
 * explain it names sixteen strings they never typed and not the one they did.
 *
 * IT FAILS CLOSED, and that is said here so nobody reads this block as a
 * patched escalation. No extra name was ever authorised, no value was ever
 * resolved, nothing leaked. The defect is that a person loses a setting they
 * made and is not told which one — and at the parent commit the loss became
 * PERMANENT at the next save, because `persistSettings` writes the
 * seal-filtered settings and re-seals to them.
 *
 * WHY NOT INSIDE THE SANITIZER. The research that drove this rejected "apply
 * the seal before the cap" for four mechanical reasons, and every one of them
 * is about putting the seal INSIDE `sanitizeEnvPassthrough`: that function is
 * memoised, runs before `app.isReady()`, is also the WRITE path through
 * `applySettingsPatch` where the seal must NOT be consulted, and its documented
 * contract is that it "bounds the SHAPE of a value; it cannot tell who wrote
 * the file". All four dissolve when the pass lives at the SEAL SITE instead,
 * which already has the opened seal in hand and runs on the read path only.
 * These two functions are the pure half of that; `withSealedDangerState` calls
 * them. The sanitizers above are untouched, byte for byte.
 *
 * NOTHING IS REORDERED, which is the objection Phase 275 recorded when it
 * half-closed this ("a sanitizer that reorders admits a list nobody wrote").
 * The answer is not "put the confirmed names first". It is "do not spend the
 * budget on names that are about to be thrown away one step later". The output
 * of `confirmedEnvNames` is a SUBSEQUENCE of its input: same elements, same
 * relative order, nothing added, nothing moved. Every element and every
 * adjacency belongs to the file, so a list nobody wrote is unreachable rather
 * than merely avoided.
 */

/**
 * Every entry of a raw passthrough list that is a NAME, in the file's own
 * order (Phase 278). Nothing is trimmed, case-folded, truncated, de-duplicated
 * or repaired — the unit that is kept or dropped is one whole entry, exactly as
 * it is in the sanitizers above.
 *
 * IT USES `isDrawableEnvName`, which is the same test the shape layer already
 * makes, so this filter can never lose a name the seal covers: a sealed name
 * got into the seal by passing `envPassthroughRefusal`, whose first check is
 * the same length bound and the same {@link OVERLAY_ENV_KEY_PATTERN}. What it
 * does drop is the 4 KB blob and the entry with a newline in it, which have to
 * be gone before anything downstream can hold them.
 *
 * NOT `envCandidateNames`. That name already belongs to the preload bridge
 * method and `settings:envCandidates`, which answer "which names does the
 * picker OFFER from the login shell". This function answers "which entries does
 * the FILE hold", and the fix round renamed it so the two are never confused in
 * the one domain where confusing them decides what a process receives.
 */
export function envFileEntryNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(isDrawableEnvName);
}

/**
 * The names of one list Tortie will actually USE, given the seal (Phase 278).
 *
 * Walks `candidates` in the file's own order and keeps a name when the seal
 * covers it AND `envPassthroughRefusal` accepts it against the names kept so
 * far. Its accumulator therefore never grows past
 * `OVERLAY_LIMITS.maxEnvPassthroughNames`, because that refusal is where the
 * cap lives.
 *
 * THE SEAL IS ASKED FIRST AND THE REFUSAL SECOND, and the order is the whole
 * point of the function. `existing` is the accumulator either way, so asking
 * the refusal first would keep exactly the same names — but it would read as if
 * the budget were still being spent on entries that are about to be discarded,
 * and this function exists to say that it is not.
 *
 * THERE IS DELIBERATELY NO `break` ON THE CAP, and that is not an oversight.
 * This function copies NO rule from `envPassthroughRefusal`: not the duplicate
 * check, not the three denylists, not the compiled-key check, and not the cap.
 * Writing `if (kept.length >= OVERLAY_LIMITS.maxEnvPassthroughNames) break` here
 * would be a second spelling of the sixteen, in a second file, that a later
 * round could move on its own — so the cap is REACHED rather than restated, and
 * the walk simply stops accumulating once the refusal starts saying no. The
 * cost is one refusal call per remaining entry, which is what
 * `sanitizeEnvPassthroughShared` already pays over the same raw list.
 *
 * IT ADMITS NOTHING. `isSealed` is the same question `withSealedDangerState`
 * asks today, made no wider: a name no human confirmed is dropped. A name the
 * seal covers that this build refuses on SHAPE is still dropped, because both
 * tests must pass — which is what stops a seal from ever laundering `PATH` onto
 * a list.
 */
export function confirmedEnvNames(
  candidates: readonly string[],
  isSealed: (name: string) => boolean,
  agentEnvKeys: readonly string[],
  scope: 'agent' | 'shared'
): string[] {
  const kept: string[] = [];
  for (const name of candidates) {
    if (!isSealed(name)) continue;
    const refusal = envPassthroughRefusal(name, {
      existing: kept,
      agentEnvKeys,
      scope
    });
    if (refusal !== null) continue;
    kept.push(name);
  }
  return kept;
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
  /**
   * The env keys this agent's COMPILED row sets (Phase 269). Empty for all
   * but two agents. It rides the catalog so the Settings window can say "this
   * agent already sets FORCE_COLOR itself" without a second round trip.
   */
  envKeys: string[];
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
