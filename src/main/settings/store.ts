/**
 * Persisted user settings — userData JSON store (Phase 10 S13).
 *
 * One small file (`<userData>/settings.json`) holds everything the Settings
 * window edits: default agent, per-agent hotkeys, per-agent launch-default
 * flags, danger confirm-once acknowledgements — plus the Settings window's
 * remembered bounds (private field, not part of the wire shape).
 *
 * Durability posture: settings are PREFERENCES, not session state — losing
 * this file loses nothing irreplaceable, so plain JSON with an atomic
 * write-rename is exactly enough (the manifest keeps its SQLite rigor).
 *
 * Every value is sanitized on load AND on patch against the agent registry
 * and the flag catalogs, so a hand-edited or stale file can never inject
 * unknown agents, malformed accelerators, or un-cataloged argv flags.
 *
 * DANGER FLAGS ARE SEALED (Phase 18.5). Sanitization bounds what a value may
 * be, not who wrote it, and this file is plain JSON under the user's home
 * directory. Tortie runs many agent processes under that same account, so
 * "the user wrote it" is not a safe reading of this file. Two values here can
 * cost the user their safeguards — a danger launch default, which reaches an
 * argv, and a danger acknowledgement, which is what silences the Settings
 * window's confirm modal — so both carry a seal that only Tortie can produce.
 * See "The danger seal" below for the mechanism and for what it does not
 * cover.
 *
 * THE FOLD CHOICE IS SEALED THE SAME WAY (Phase 138), and for the same reason
 * written in CLAUDE.md refusal 8: nothing may cause a process to start on a
 * configuration change alone, and a human confirms the bytes out of band of
 * any agent turn. The fold spawns a process, and this file sits in the home
 * directory that every agent Tortie runs can write. So a `fold` key an agent
 * put here is dropped before the value leaves this module, because the agent
 * cannot produce the seal. The choice reaches a spawn only when the Settings
 * window wrote it, which is a person acting out of band.
 *
 * THE SHELL VARIABLE NAMES ARE SEALED THE SAME WAY (Phase 269). A name on
 * `envPassthrough` decides which of the person's own secrets Tortie reads out
 * of their login shell and hands to a spawned process. An agent that appended
 * one name to another agent's list would be handed a key it was never given,
 * at every later launch, with nothing said anywhere. So a name that arrives
 * without a seal is REFUSED on read rather than honoured, and the value it
 * names is never in this file at all — only the name is, and the value is
 * resolved fresh at each launch.
 *
 * PHASE 275 ADDED A SECOND, WIDER LIST and gave it its OWN seal field.
 * `envPassthroughShared` is read for EVERY agent Tortie launches, including
 * agents installed after the name was confirmed, so the agreement it carries is
 * wider than a per-agent one. `DangerState.envShared` holds it separately from
 * `DangerState.env` for the reason `arch` is separate from `fold`: a per-agent
 * agreement must never be replayable as a shared one, and field separation
 * makes that impossible by construction rather than by string discipline. The
 * layer that did NOT move is the one above — a name no human confirmed is still
 * dropped, whichever list it is on.
 *
 * Ownership: src/main/settings/** (settings+hotkeys stream).
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, safeStorage } from 'electron';
import type {
  ArchSettings,
  AutoSaveSettings,
  EnvRejections,
  FoldSettings,
  GmuxSettings,
  GmuxSettingsPatch
} from '@shared/settings';
import {
  archKey,
  clampAutoSaveDelay,
  clampSavedScrollbackLines,
  clampScrollbackLines,
  confirmedEnvNames,
  dangerKey,
  defaultGmuxSettings,
  envFileEntryNames,
  envNameKey,
  envSharedKey,
  foldKey,
  isAutoSaveMode,
  noArchChosen,
  noAutoSave,
  noEnvRejections,
  noFoldChosen,
  sanitizeChromeDepth,
  sanitizeChromeHue,
  sanitizeChromeShade,
  sanitizeColorScheme,
  sanitizeContrastLevel,
  sanitizeEnvPassthrough,
  sanitizeEnvPassthroughShared,
  sanitizeHighlightScheme,
  sanitizeUsageSettings,
  sanitizeWorkAreaFont,
  sanitizeWorkAreaFontCustom
} from '@shared/settings';
// Phase 278. The echo bound on the backstop below, from the one place the
// number is declared. Nothing else in this file reads the overlay's limits.
import { OVERLAY_LIMITS } from '@shared/agent-overlay';
import {
  archRecipeFor,
  archSemanticRecipeFor,
  foldRecipeFor,
  recipeHasModel
} from '../overview/fold/recipes';
import type { LaunchableAgentId, LaunchableAgentKind } from '@shared/types';
import { compiledLaunchEnvKeys, LAUNCHABLE_AGENT_IDS } from '../agents/registry';
import { AGENT_FLAG_PRESETS } from '../agents/flags';

import { getLog } from '../log';

/**
 * Scope "settings" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const settingsLog = getLog('settings');

// ---------------------------------------------------------------------------
// Disk shape
// ---------------------------------------------------------------------------

export interface SettingsWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SettingsFile {
  version: 1;
  /**
   * As parsed and sanitized from disk, BEFORE the danger seal is checked.
   * Everything outside this module reads `getSettings()`, which is this value
   * minus any danger launch default the seal does not cover.
   */
  settings: GmuxSettings;
  /** Remembered Settings-window position/size (S13); absent on first run. */
  settingsWindowBounds?: SettingsWindowBounds;
  /**
   * The danger seal (Phase 18.5): an opaque string only Tortie can produce,
   * covering the exact danger launch defaults and danger acknowledgements the
   * user set in the Settings window. Absent when the file has neither.
   */
  dangerSeal?: string;
}

// ---------------------------------------------------------------------------
// Sanitization (pure — exported for tests)
// ---------------------------------------------------------------------------

const LAUNCHABLE_SET: ReadonlySet<string> = new Set(LAUNCHABLE_AGENT_IDS);

/**
 * Minimal Electron-accelerator shape check for a recorded hotkey: at least
 * one of Cmd/Ctrl (DESIGN.md §4: user chords must include ⌘ or ⌃), only
 * known modifier tokens, and exactly one non-modifier key token at the end.
 * The renderer's recorder enforces the full conflict matrix; this guard
 * keeps a hand-edited file from registering garbage accelerators.
 */
export function isValidHotkeyAccelerator(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    return false;
  }
  const tokens = value.split('+');
  const key = tokens[tokens.length - 1];
  const mods = tokens.slice(0, -1);
  if (key === undefined || key.length === 0) return false;
  const MODS = new Set(['Cmd', 'Ctrl', 'Alt', 'Shift']);
  if (!mods.every((m) => MODS.has(m))) return false;
  if (!mods.includes('Cmd') && !mods.includes('Ctrl')) return false;
  return !MODS.has(key);
}

/**
 * Flags persistable as launch defaults for an agent: cataloged AND VERIFIED
 * against the installed build's --help (flags.ts provenance discipline —
 * RESEARCH flags must never be silently appended to an argv, so they are
 * not storable as defaults either).
 */
function catalogedFlags(agentId: LaunchableAgentId): ReadonlySet<string> {
  const catalog = AGENT_FLAG_PRESETS[agentId];
  return new Set(
    (catalog?.presets ?? [])
      .filter((p) => p.provenance === 'VERIFIED')
      .map((p) => p.flag)
  );
}

/**
 * The names the SHARED list refuses because some launchable agent's COMPILED
 * `launch.env` already sets them (Phase 275). Today exactly three:
 * `FORCE_COLOR` (cursor), `GROK_PRIVACY_NOTICE_ROLLOUT` (grok) and, since
 * Phase 331, `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` (Claude Code).
 *
 * REFUSING THEM ON THE SHARED LIST IS THE HONEST ANSWER, not an over-reach.
 * The shared list reaches cursor too, and a shared `FORCE_COLOR` would make the
 * `env-unresolved` notice say a cursor pane started WITHOUT a variable that
 * pane actually has — the exact dishonesty `envPassthroughRefusal`'s last check
 * exists to prevent. A per-agent list only has to ask about ITS agent; this one
 * has to ask about all of them.
 *
 * SPELLED ONCE, HERE, and read by `sanitizeSettings` below and by the
 * `settings:envCandidates` handler in ./ipc.ts, so the door that refuses a name
 * and the list that offers one cannot come to different answers. Computed on
 * first read from the compiled registry, which is a static table, so the answer
 * cannot depend on a configuration file.
 */
let sharedRefusedKeys: readonly string[] | null = null;
export function sharedRefusedEnvKeys(): readonly string[] {
  if (sharedRefusedKeys !== null) return sharedRefusedKeys;
  const all = new Set<string>();
  for (const id of LAUNCHABLE_AGENT_IDS) {
    for (const key of compiledLaunchEnvKeys(id)) all.add(key);
  }
  sharedRefusedKeys = [...all].sort();
  return sharedRefusedKeys;
}

/**
 * The cataloged DANGER flags for an agent — the presets that turn a safeguard
 * off (e.g. `--dangerously-skip-permissions`,
 * `--dangerously-bypass-approvals-and-sandbox`).
 *
 * These are the only values in this file whose effect is to start a process
 * with fewer protections than it would otherwise have, which is why they are
 * the only ones that need a seal.
 */
function dangerFlags(agentId: LaunchableAgentId): ReadonlySet<string> {
  const catalog = AGENT_FLAG_PRESETS[agentId];
  return new Set(
    (catalog?.presets ?? [])
      .filter((p) => p.provenance === 'VERIFIED' && p.danger)
      .map((p) => p.flag)
  );
}

/**
 * Everything about a settings file that only Tortie may decide. Both lists
 * hold `"<agentId> <flag>"` keys (see `dangerKey`).
 */
export interface DangerState {
  /** Danger flags switched on as launch defaults. These reach an argv. */
  readonly defaults: readonly string[];
  /** Danger confirms the user has accepted, which skip the confirm modal. */
  readonly acks: readonly string[];
  /**
   * "<agentId> <model>" when a fold harness is chosen, null for None
   * (Phase 138). It is here rather than in a second seal because it is the
   * same question: did a person set this, or did something else write the
   * file?
   */
  readonly fold: string | null;
  /**
   * "<agentId> <model>" when an arch enrichment harness is chosen, null for
   * None (Phase 158). A separate field from `fold` on purpose: the two
   * choices spawn different passes, so agreeing to one must never be
   * replayable as agreeing to the other. An old seal has no `arch` member at
   * all, which opens as null and fails safe to None.
   */
  readonly arch: string | null;
  /**
   * "<agentId> <NAME>" for every environment variable name the person set in
   * the Settings window (Phase 269).
   *
   * A NAME IS WHAT DECIDES which of the person's secrets a spawned process is
   * handed, so it belongs in exactly the class the two above are in: an agent
   * that appended a name to another agent's list could read a key it was
   * never given, and it would be handed that key at every later launch with
   * nothing said. An old seal has no `env` member at all, which opens as []
   * and fails safe to no names.
   */
  readonly env: readonly string[];
  /**
   * Every shell variable name on the SHARED list (Phase 275) — a BARE name,
   * with no agent id in front of it, sorted so the state seals to one text.
   *
   * A SEPARATE FIELD rather than more entries in `env`, for the reason `arch`
   * is a separate field from `fold` twenty lines above: agreeing to one must
   * never be replayable as agreeing to the other. Here the two agreements
   * differ in SCOPE — `env` covers one agent, this covers every agent Tortie
   * can launch, INCLUDING AGENTS INSTALLED LATER — so a per-agent agreement
   * replayed as a shared one is exactly the widening this phase exists to make
   * a person ask for out loud.
   *
   * NON-OPTIONAL ON PURPOSE, so the compiler names every construction site
   * rather than letting one default quietly to nothing. An old seal has no
   * `envShared` member at all, which `openDangerSeal` reads as [] and which
   * fails safe to no shared name.
   */
  readonly envShared: readonly string[];
}

/** The danger state of a settings object, sorted so it seals to one text. */
export function dangerStateOf(settings: GmuxSettings): DangerState {
  const defaults: string[] = [];
  for (const [id, flags] of Object.entries(settings.launchDefaults)) {
    if (!Array.isArray(flags)) continue;
    const danger = dangerFlags(id as LaunchableAgentId);
    for (const flag of flags) {
      if (danger.has(flag)) defaults.push(dangerKey(id, flag));
    }
  }
  const fold =
    settings.fold.agentId !== null && settings.fold.model !== null
      ? foldKey(settings.fold.agentId, settings.fold.model)
      : null;
  const arch =
    settings.arch.agentId !== null && settings.arch.model !== null
      ? archKey(settings.arch.agentId, settings.arch.model)
      : null;
  // Phase 269. Every passthrough name, under its own agent id, sorted so the
  // state seals to one text whatever order the map was written in.
  const env: string[] = [];
  for (const [id, names] of Object.entries(settings.envPassthrough)) {
    if (!Array.isArray(names)) continue;
    for (const name of names) env.push(envNameKey(id, name));
  }
  // Phase 275. The shared names, BARE — `envSharedKey` is a display form and
  // never goes in here (see its own comment in @shared/settings). Sorted for
  // the same reason `env` is: the state has to seal to ONE text whatever order
  // the list was written in, or a re-save with the same names would move the
  // sealed blob and look like a change.
  const envShared = [...settings.envPassthroughShared];
  return {
    defaults: defaults.sort(),
    acks: [...settings.dangerAcknowledged].sort(),
    fold,
    arch,
    env: env.sort(),
    envShared: envShared.sort()
  };
}

/**
 * No danger state at all, which is the case for almost every settings file.
 *
 * THIS IS THE LINE A NEW SEALED FIELD IS MOST LIKELY TO BE FORGOTTEN IN, and
 * forgetting it is a complete bypass rather than a cosmetic miss. `getSettings`
 * short-circuits on this answer and returns the file VERBATIM, WITHOUT OPENING
 * THE SEAL. It is a boolean expression over an object, so adding a field to
 * `DangerState` leaves this function COMPILING AND WRONG: a settings.json whose
 * only danger value is the new field would be admitted unsealed.
 *
 * Phase 275 added `envShared` and this clause with it. The ablation that proves
 * the clause is not decoration lives in
 * `__tests__/p275-env-shared-seal.test.ts` — a file whose ONLY danger value is
 * a shared name must still reach the seal.
 */
export function isDangerStateEmpty(state: DangerState): boolean {
  return (
    state.defaults.length === 0 &&
    state.acks.length === 0 &&
    state.fold === null &&
    state.arch === null &&
    state.env.length === 0 &&
    state.envShared.length === 0
  );
}

/**
 * What the SEAL dropped from the two shell-variable lists on one read
 * (Phase 275), by list, so the Settings window can say it on the card it
 * belongs to rather than as one undifferentiated line.
 *
 * NAMES ONLY, and every one of them has already passed
 * `OVERLAY_ENV_KEY_PATTERN` at the shape layer before this function ever runs,
 * so nothing here is a rendering primitive. A hostile entry that could not be
 * named safely never reaches the seal at all: the shape layer counted it and
 * threw the bytes away.
 */
export interface SealEnvRejections {
  /** Shared names the seal did not cover, bare. */
  shared: string[];
  /** Per-agent names the seal did not cover, by agent id. */
  perAgent: Partial<Record<LaunchableAgentId, string[]>>;
  /**
   * PHASE 278 — THE BACKSTOP'S ANSWER, and it is the other direction. The two
   * fields above are names the file HOLDS and the seal does not cover. These
   * two are names the SEAL covers — a person confirmed them in this window —
   * that the finished lists do not contain. Counts, never lists, because a
   * per-agent seal key would have to be split to get the bare name back and no
   * seal key in this module is ever split.
   *
   * `sharedMissing` leaves out a sealed shared name the file still holds,
   * because the shape layer's `sharedUnread` already names it on the same card
   * (the Phase 278 fix round). `perAgentMissing` counts every one.
   */
  sharedMissing: number;
  /** Sealed per-agent names the finished lists do not contain, by agent id. */
  perAgentMissing: Partial<Record<LaunchableAgentId, number>>;
}

/** An empty report, so the four construction sites cannot drift apart. */
function noSealEnvRejections(): SealEnvRejections {
  return { shared: [], perAgent: {}, sharedMissing: 0, perAgentMissing: {} };
}

/**
 * `settings` with every danger value the seal does not cover removed, plus the
 * launch defaults that were removed so the caller can say what happened.
 * Non-danger defaults are never touched. Pure, and exported for tests.
 *
 * A rejected ACK is not reported: its only effect is that the user sees the
 * confirm modal one more time, which is the safe direction.
 *
 * PHASE 275 RETURNS THE ENV DROPS STRUCTURALLY AS WELL, in `envRejected`, and
 * that is not a convenience. `rejected` is a flat list of OPAQUE KEYS mixing
 * four spellings — `dangerKey`, `foldKey`, `archKey`, `envNameKey` and now
 * `envSharedKey` — and no seal key is ever split back into parts anywhere in
 * this module. Splitting one here so the Settings window could draw it would
 * introduce the first parser over a key space whose whole safety argument is
 * that a key only has to be UNAMBIGUOUS, never PARSEABLE. So the loop that
 * knows which list a name came from records it there and then.
 *
 * ---------------------------------------------------------------------------
 * PHASE 278 — TWO MECHANISMS, AND NEITHER IS REDUNDANT
 * ---------------------------------------------------------------------------
 *
 * THE DEFECT, stated in its own terms. The shape layer caps each list at
 * sixteen in FILE ORDER and this function asks who wrote them afterwards. So
 * sixteen valid-looking names written by anything with write access to the home
 * directory spent the whole budget before anything asked who wrote them, and
 * the seventeenth — the one the person confirmed in the Settings window — was
 * already gone when the seal got here. The seal then rejected the sixteen, the
 * person ended with NO names, and the one line explaining it named sixteen
 * strings they never typed and not the one they did. It FAILED CLOSED on every
 * measured shape (`accepted = {}`), so nothing leaked and nothing extra was
 * authorised; the defect is that a person lost a setting they made and was not
 * told which one. The next save then made it permanent.
 *
 * 1. THE SEAL-AWARE PASS, which is what makes the person's key keep working.
 *    When `candidates` is supplied — only `getSettings` supplies it — each env
 *    list is recomputed from the FILE's own entries in the FILE's own order,
 *    keeping only entries this seal covers and still stopping at sixteen. The
 *    result is a SUBSEQUENCE of the list in the file: nothing added, nothing
 *    moved. That is the answer to the objection Phase 275 recorded when it
 *    half-closed this — "a sanitizer that reorders admits a list nobody wrote".
 *    Nothing is reordered and no sanitizer changed; the rule added is "do not
 *    spend the budget on names that are about to be thrown away one step
 *    later", and WHEN a name is skipped is not an order.
 *
 * 2. THE BACKSTOP, which is what makes a lost confirmed name impossible to hide
 *    anywhere else, including on the paths the pass cannot reach — a two
 *    argument call, a name deleted from the file outright, a name a later build
 *    refuses on shape. Every key the seal covers that the FINISHED lists do not
 *    contain is pushed onto `rejected` and returned in `missing`.
 *
 * The auditor's own fixture proves neither substitutes for the other: it calls
 * this function with TWO arguments over already-sanitized settings, so the pass
 * never runs there and the fixture passes on `reported` rather than on
 * `retained`. The pass is what a person gets; the backstop is what a test can
 * prove from outside. See `__tests__/audit-0914-env-cap.test.ts`.
 *
 * THE FIRST LAYER DOES NOT MOVE. `isSealed` below is the same question this
 * function has always asked, made no wider. A name no human confirmed is
 * dropped, on every path, including both new ones.
 */
export function withSealedDangerState(
  settings: GmuxSettings,
  sealed: DangerState,
  candidates?: {
    /** Raw per-agent entries from the file, in the file's own order. */
    perAgent: Partial<Record<LaunchableAgentId, readonly string[]>>;
    /** Raw shared entries from the file, in the file's own order. */
    shared: readonly string[];
    /** One agent's compiled `launch.env` keys. */
    agentEnvKeys: (id: string) => readonly string[];
    /** The union of those keys over every launchable agent. */
    sharedRefusedEnvKeys: readonly string[];
  }
): {
  settings: GmuxSettings;
  rejected: string[];
  /** Phase 278. The sealed keys the finished lists do not contain. */
  missing: string[];
  envRejected: SealEnvRejections;
} {
  const sealedDefaults = new Set(sealed.defaults);
  const sealedAcks = new Set(sealed.acks);
  const sealedEnv = new Set(sealed.env);
  // PHASE 275, BELT ONE OF TWO, and it holds even if the two key spellings
  // were identical. A per-agent name is tested ONLY against `sealedEnv` and a
  // shared name ONLY against `sealedShared`. Neither Set is consulted for the
  // other kind, on any path, so a name sealed one way cannot be admitted the
  // other way. (Belt two is textual and lives on `envSharedKey` in
  // @shared/settings: every per-agent key holds exactly one space, every bare
  // shared name holds none, and the two spaces are disjoint.)
  const sealedShared = new Set(sealed.envShared);
  const rejected: string[] = [];
  const missing: string[] = [];
  const envRejected: SealEnvRejections = noSealEnvRejections();
  // Phase 138. The fold choice is dropped back to None unless the seal covers
  // that exact pair, and it IS reported, so the Settings window can say one
  // sentence about it. A dropped fold choice costs nothing: the page draws
  // Phase 137's built line, which is complete on its own.
  const chosenFold =
    settings.fold.agentId !== null && settings.fold.model !== null
      ? foldKey(settings.fold.agentId, settings.fold.model)
      : null;
  const foldRejected = chosenFold !== null && chosenFold !== sealed.fold;
  if (foldRejected) rejected.push(chosenFold);
  // Phase 158. The arch choice is dropped the same way, against its OWN seal
  // field, so a fold agreement copied into the arch key by hand covers
  // nothing. A dropped arch choice costs nothing either: the Architecture
  // view keeps the deterministic skeleton, which is complete on its own.
  const chosenArch =
    settings.arch.agentId !== null && settings.arch.model !== null
      ? archKey(settings.arch.agentId, settings.arch.model)
      : null;
  const archRejected = chosenArch !== null && chosenArch !== sealed.arch;
  if (archRejected) rejected.push(chosenArch);
  const launchDefaults: GmuxSettings['launchDefaults'] = {};
  for (const [id, flags] of Object.entries(settings.launchDefaults)) {
    if (!Array.isArray(flags)) continue;
    const danger = dangerFlags(id as LaunchableAgentId);
    const kept = flags.filter((flag) => {
      if (!danger.has(flag)) return true;
      if (sealedDefaults.has(dangerKey(id, flag))) return true;
      rejected.push(dangerKey(id, flag));
      return false;
    });
    if (kept.length > 0) launchDefaults[id as LaunchableAgentId] = kept;
  }
  // Phase 269. Every passthrough name the seal does not cover is dropped, and
  // it IS reported, so `warnRejected` names it in app.log: a person whose
  // agent quietly stopped getting a variable has one line that says why. An
  // agent left with no surviving name is absent from the map rather than
  // present and empty, which is the shape `launchDefaults` above already has.
  //
  // PHASE 278 SPLIT THE REPORT FROM THE RESULT HERE, and the split is the whole
  // repair. `filtered` below is the REPORT: it walks the SANITIZED list, which
  // is capped at sixteen whatever the file holds, and it is what fills
  // `rejected` and `envRejected`. `kept` is the RESULT: when candidates are
  // supplied it is the seal-aware pass over the FILE's own entries. Keeping the
  // report on the sanitized list is what keeps every drawn and logged list
  // bounded by sixteen per list — nothing this phase adds can grow an echo.
  const envPassthrough: GmuxSettings['envPassthrough'] = {};
  // True when the pass answered differently from the plain filter. The only
  // direction that difference can take is a RESTORE — the pass's output is
  // always a superset of the filter's kept set, because both test the same
  // seal and the pass starts from a superset of the same entries — but it is
  // written as a difference so the identity return below stays correct even if
  // that argument is ever wrong.
  let envRestored = false;
  // THE FIX ROUND. An id that arrives only through `candidates` must be one
  // this build launches. `loadFile` already drops every other id, but this
  // function is exported and pure, and without this filter it would put a name
  // under `notanagent` or `constructor` whenever a seal covered that key. Both
  // filters stay, and a test drives this one on its own.
  const agentIds = new Set<string>([
    ...Object.keys(settings.envPassthrough),
    ...(candidates !== undefined
      ? Object.keys(candidates.perAgent).filter((id) => LAUNCHABLE_SET.has(id))
      : [])
  ]);
  for (const id of agentIds) {
    const names = Object.prototype.hasOwnProperty.call(settings.envPassthrough, id)
      ? (settings.envPassthrough as Record<string, unknown>)[id]
      : undefined;
    const dropped: string[] = [];
    const filtered = (Array.isArray(names) ? (names as string[]) : []).filter(
      (name) => {
        if (sealedEnv.has(envNameKey(id, name))) return true;
        rejected.push(envNameKey(id, name));
        dropped.push(name);
        return false;
      }
    );
    const kept =
      candidates === undefined
        ? filtered
        : confirmedEnvNames(
            (LAUNCHABLE_SET.has(id) &&
            Object.prototype.hasOwnProperty.call(candidates.perAgent, id)
              ? candidates.perAgent[id as LaunchableAgentId]
              : undefined) ?? [],
            // PHASE 275'S BELT ONE, HELD ON THE NEW PATH TOO. A per-agent name
            // is asked of `sealedEnv` under its own agent id and of nothing
            // else, so a name sealed for one agent still cannot be admitted for
            // another and a shared agreement still cannot be replayed here.
            (name) => sealedEnv.has(envNameKey(id, name)),
            candidates.agentEnvKeys(id),
            'agent'
          );
    if (!sameNames(kept, filtered)) envRestored = true;
    if (kept.length > 0) envPassthrough[id as LaunchableAgentId] = kept;
    if (dropped.length > 0) envRejected.perAgent[id as LaunchableAgentId] = dropped;
  }
  // PHASE 275. The shared list, against its OWN seal field and against nothing
  // else. A dropped shared name is pushed into `rejected` through
  // `envSharedKey`, so the one warning line in app.log reads
  // `* ANTHROPIC_API_KEY` beside `claude FOO` and a person can tell WHICH list
  // lost a name — which matters more here than it did for one agent, because
  // the two lists are drawn on two different cards.
  const sharedFiltered = settings.envPassthroughShared.filter((name) => {
    if (sealedShared.has(name)) return true;
    rejected.push(envSharedKey(name));
    envRejected.shared.push(name);
    return false;
  });
  const envPassthroughShared =
    candidates === undefined
      ? sharedFiltered
      : confirmedEnvNames(
          candidates.shared,
          (name) => sealedShared.has(name),
          candidates.sharedRefusedEnvKeys,
          'shared'
        );
  if (!sameNames(envPassthroughShared, sharedFiltered)) envRestored = true;
  // PHASE 278 — THE BACKSTOP. Every key the seal covers that the FINISHED lists
  // do not contain, named on the same `rejected` list the audit's fixture reads
  // and returned separately in `missing` so a caller can tell the two classes
  // apart without looking inside a key.
  //
  // NO SEAL KEY IS SPLIT. `present` is COMPOSED with `envNameKey`, never
  // parsed. The one thing that has to be derived from a key is which agent CARD
  // a missing name belongs to, and that is a prefix test against a COMPOSED
  // prefix over the compiled closed set `LAUNCHABLE_AGENT_IDS` — the name half
  // is never read. That test is unambiguous by the argument `envSharedKey`
  // already makes in @shared/settings: `OVERLAY_ENV_KEY_PATTERN` forbids a
  // space in a name and `OVERLAY_ID_PATTERN` forbids one in an id, so a key
  // holds exactly one space and `claude ` cannot prefix a key belonging to
  // `claude-x`.
  //
  // IT COVERS `env` AND `envShared` AND NOTHING ELSE on `DangerState`. A sealed
  // launch default that vanishes from the file is drawn as an unchecked
  // checkbox a person can SEE; a vanished variable name leaves no trace at all
  // on the card. That difference is the whole reason this exists, and it is why
  // the fold choice, the arch choice and the danger flags get no backstop.
  //
  // THE ECHO IS BOUNDED HERE TOO: at most sixteen keys per list are pushed and
  // the rest are counted, so no seal, however it came to exist, can author a
  // paragraph in app.log or in the Settings window.
  const present = new Set<string>();
  for (const [id, names] of Object.entries(envPassthrough)) {
    for (const name of names) present.add(envNameKey(id, name));
  }
  const echoed = new Map<string, number>();
  const echoBudget = (bucket: string): boolean => {
    const used = echoed.get(bucket) ?? 0;
    if (used >= OVERLAY_LIMITS.maxEnvPassthroughNames) return false;
    echoed.set(bucket, used + 1);
    return true;
  };
  for (const key of sealedEnv) {
    if (present.has(key)) continue;
    const owner = LAUNCHABLE_AGENT_IDS.find((id) => key.startsWith(envNameKey(id, '')));
    if (owner !== undefined) {
      envRejected.perAgentMissing[owner] =
        (envRejected.perAgentMissing[owner] ?? 0) + 1;
    }
    // A key belonging to an agent this build no longer launches is still said
    // in the log — it is a setting the person made and is not in effect — and
    // it is counted on no card, because there is no card to draw it on.
    if (!echoBudget(owner ?? '')) continue;
    rejected.push(key);
    missing.push(key);
  }
  const finalShared = new Set(envPassthroughShared);
  // THE FIX ROUND. A sealed shared name the FILE still holds, and that is not
  // on the finished list, was refused by the shape layer — a later build's
  // denylist, or a seventeenth confirmed name — and `sharedUnread` already
  // names it on the shared card, or `sharedUnreadOver` counts it. Counting it
  // here as well drew a second sentence about the same name that told the
  // person to add it again, which the Add sheet then refuses. So the CARD's
  // count is only the names the file no longer holds. The LOG still says every
  // one of them, because the shape layer writes nothing to app.log. Without
  // candidates there is no file to ask, and every name is counted.
  const fileShared =
    candidates !== undefined ? new Set(candidates.shared) : new Set<string>();
  for (const name of sealedShared) {
    if (finalShared.has(name)) continue;
    if (!fileShared.has(name)) envRejected.sharedMissing += 1;
    if (!echoBudget('*')) continue;
    rejected.push(envSharedKey(name));
    missing.push(envSharedKey(name));
  }
  const acks = settings.dangerAcknowledged.filter((k) => sealedAcks.has(k));
  // PHASE 278. The identity return is decided by what was DROPPED, what was
  // RESTORED and what acks were FILTERED — never by the backstop. A sealed name
  // the file no longer holds changes nothing about the settings object, and
  // rebuilding it for a REPORT would move an object identity that renderers and
  // memoised selectors read as "nothing changed". So the drop count is taken
  // before the backstop pushed anything, rather than from `rejected.length`.
  const dropped = rejected.length - missing.length;
  if (
    dropped === 0 &&
    !envRestored &&
    acks.length === settings.dangerAcknowledged.length
  ) {
    return { settings, rejected, missing, envRejected };
  }
  return {
    settings: {
      ...settings,
      launchDefaults,
      envPassthrough,
      // Phase 275. Carried here rather than left on the spread, so the strip
      // path in `persistSettings` — the one that runs when the OS keystore
      // cannot seal — writes NO shared name rather than writing one the next
      // load would refuse.
      envPassthroughShared,
      dangerAcknowledged: acks,
      fold: foldRejected ? noFoldChosen() : settings.fold,
      // Phase 175. The seal drops the harness PAIR and only the pair. The
      // visibility switch is not sealed, because a false value hides
      // surfaces and starts nothing, so a rejected choice keeps whatever
      // the person set it to.
      arch: archRejected
        ? {
            ...noArchChosen(),
            enabled: settings.arch.enabled,
            wrapperPass: settings.arch.wrapperPass
          }
        : settings.arch
    },
    rejected,
    missing,
    envRejected
  };
}

/**
 * Are these two name lists the same names in the same order (Phase 278)?
 *
 * Used for one decision only: whether the seal-aware pass answered differently
 * from the plain filter, which is what "what was restored" means in the
 * identity return above. Both lists are at most sixteen short strings.
 */
function sameNames(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

// ---------------------------------------------------------------------------
// The danger seal
// ---------------------------------------------------------------------------

/**
 * WHAT THIS DEFENDS AGAINST. `settings.json` is plain JSON in the user's home
 * directory, and Tortie's whole job is running agent processes with write
 * access to that directory. An agent that writes one line into this file used
 * to be able to switch on a cataloged danger flag as a launch default. Every
 * later modal-less create for that agent — the per-agent hotkey, the ˅ board,
 * quick-create — would then start with the safeguard off, and the ⌘T sheet
 * would pre-check it. The same file could pre-fill `dangerAcknowledged`, which
 * is what makes the Settings window skip its confirm modal, so the user's own
 * first enable would happen with no warning either.
 *
 * HOW IT WORKS. When the Settings window writes either of those, Tortie
 * encrypts the sorted key lists with `safeStorage` and stores the ciphertext
 * next to the settings. On load, a danger value counts only if the seal covers
 * it; anything else is dropped before the value leaves this module. The key
 * lives in the macOS keychain under an access control bound to Tortie, so
 * another process running as the same user cannot read it without the user
 * answering a keychain prompt.
 *
 * WHAT IT DOES NOT COVER, stated plainly:
 *  - A seal that was valid at some point in the past stays valid for the exact
 *    values it covers. An attacker holding an old copy of the file, from a time
 *    when the user really had that flag on, can put the pair back. Closing
 *    that needs a second secret kept outside the file, and the file is the
 *    only thing an attacker needs to write.
 *  - It says nothing about code running inside Tortie's own renderer.
 *  - A session that was already created keeps the argv it was created with.
 *    This changes what future sessions launch with, not what is running.
 *
 * FAIL CLOSED. If the seal cannot be read, no danger default is applied. A
 * flag that turns a safeguard off is not applied on the strength of a file
 * anyone can write.
 *
 * COST WHEN UNUSED. A settings file with no danger value never reaches the
 * keystore at all, so the common case adds no keychain access and no prompt.
 * A machine that names a shell variable (Phase 269, and the shared list in
 * Phase 275) leaves that common case, exactly as a danger flag or a fold choice
 * already does; a machine that names none is byte for byte unchanged.
 */
const SEAL_PREFIX = 'gmux-danger-seal-v1:';

const EMPTY_DANGER_STATE: DangerState = {
  defaults: [],
  acks: [],
  fold: null,
  arch: null,
  env: [],
  envShared: []
};

/** Is `safeStorage` usable right now? False before `app` is ready. */
function sealAvailable(): boolean {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/** Seal a danger state. Returns undefined when no seal can be produced. */
function sealDangerState(state: DangerState): string | undefined {
  if (isDangerStateEmpty(state)) return undefined;
  if (!sealAvailable()) return undefined;
  try {
    const text = `${SEAL_PREFIX}${JSON.stringify(state)}`;
    return safeStorage.encryptString(text).toString('base64');
  } catch (err) {
    settingsLog.warn(
      `could not seal danger settings: ${(err as Error).message}`
    );
    return undefined;
  }
}

/**
 * Open a seal read from disk.
 *
 * Returns the covered state, or null when the answer is not known yet (the app
 * is not ready, or the OS keystore is unavailable) so the caller can ask again
 * later instead of caching "nothing is sealed" for the whole run. A missing
 * seal is a known answer — nothing is sealed — and costs no keychain access.
 */
function openDangerSeal(blob: unknown): DangerState | null {
  if (typeof blob !== 'string' || blob.length === 0) return EMPTY_DANGER_STATE;
  if (!sealAvailable()) return null;
  try {
    const text = safeStorage.decryptString(Buffer.from(blob, 'base64'));
    if (!text.startsWith(SEAL_PREFIX)) return EMPTY_DANGER_STATE;
    const parsed: unknown = JSON.parse(text.slice(SEAL_PREFIX.length));
    if (parsed === null || typeof parsed !== 'object') {
      return EMPTY_DANGER_STATE;
    }
    const asState = parsed as Partial<DangerState>;
    const strings = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [];
    // `fold` defaults to null, so an old seal written before Phase 138 still
    // opens and still covers exactly what it always covered. `arch` defaults
    // to null the same way (Phase 158), so a seal written before this phase
    // covers no arch choice and the value fails safe to None.
    return {
      defaults: strings(asState.defaults),
      acks: strings(asState.acks),
      fold: typeof asState.fold === 'string' ? asState.fold : null,
      arch: typeof asState.arch === 'string' ? asState.arch : null,
      // Phase 269. `env` reads through the same `strings()` helper the two
      // lists above use and defaults to [], so a seal written before this
      // phase opens and covers no passthrough name at all.
      env: strings(asState.env),
      // Phase 275. Same helper, same default. A seal written before this phase
      // has no `envShared` member, opens as [], and covers NO shared name — so
      // an agreement a person gave to one agent's list can never come back as
      // an agreement covering every agent.
      envShared: strings(asState.envShared)
    };
  } catch {
    // Forged, truncated, or written by a different machine's key. It proves
    // nothing, so it covers nothing.
    return EMPTY_DANGER_STATE;
  }
}

/**
 * Coerce arbitrary parsed JSON into a valid GmuxSettings: unknown agent ids
 * dropped, malformed accelerators dropped, launch-default flags restricted
 * to each agent's cataloged presets, danger keys restricted to strings.
 *
 * This bounds the SHAPE of a value. It cannot tell who wrote the file, which
 * is what the danger seal above is for.
 */
export function sanitizeSettings(raw: unknown): GmuxSettings {
  const out = defaultGmuxSettings();
  if (raw === null || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;

  const agent = obj['defaultAgent'];
  if (agent === 'shell' || (typeof agent === 'string' && LAUNCHABLE_SET.has(agent))) {
    out.defaultAgent = agent as LaunchableAgentKind;
  }

  const hotkeys = obj['hotkeys'];
  if (hotkeys !== null && typeof hotkeys === 'object') {
    const seen = new Set<string>();
    for (const [id, accel] of Object.entries(hotkeys as Record<string, unknown>)) {
      if (!LAUNCHABLE_SET.has(id)) continue;
      if (!isValidHotkeyAccelerator(accel)) continue;
      if (seen.has(accel)) continue; // one chord, one action — drop dupes
      seen.add(accel);
      out.hotkeys[id as LaunchableAgentId] = accel;
    }
  }

  const defaults = obj['launchDefaults'];
  if (defaults !== null && typeof defaults === 'object') {
    for (const [id, flags] of Object.entries(defaults as Record<string, unknown>)) {
      if (!LAUNCHABLE_SET.has(id) || !Array.isArray(flags)) continue;
      const allowed = catalogedFlags(id as LaunchableAgentId);
      const clean = [...new Set(flags.filter(
        (f): f is string => typeof f === 'string' && allowed.has(f)
      ))];
      if (clean.length > 0) out.launchDefaults[id as LaunchableAgentId] = clean;
    }
  }

  // PHASE 269. The environment variable NAMES per agent. Membership FIRST,
  // and the seal after, in getSettings — the same two step check the fold and
  // arch choices take, and for the same reason: this bounds what a value may
  // be and cannot tell who wrote the file.
  out.envPassthrough = sanitizeEnvPassthrough(
    obj['envPassthrough'],
    (id) => LAUNCHABLE_SET.has(id),
    compiledLaunchEnvKeys
  );

  // PHASE 275. The SHARED list, through its own sanitizer for the same two
  // step reason: this bounds what a value may be, and the seal in `getSettings`
  // is what asks who wrote it. The `refused`/`unnamed` halves of the answer are
  // thrown away HERE and re-derived in `loadFile` — see the comment there for
  // why the reporting is not smuggled out of this function, which is pure and
  // is called by tests, by `applySettingsPatch` and by the load.
  out.envPassthroughShared = sanitizeEnvPassthroughShared(
    obj['envPassthroughShared'],
    sharedRefusedEnvKeys()
  ).names;

  // Per-agent SpecStory capture defaults (Phase 15). Unknown ids dropped and
  // only `true` is stored: an explicit false is the absence of the key, which
  // keeps a hand-edited file from teaching the map a third state.
  const capture = obj['captureDefaults'];
  if (capture !== null && typeof capture === 'object') {
    for (const [id, on] of Object.entries(capture as Record<string, unknown>)) {
      if (!LAUNCHABLE_SET.has(id) || on !== true) continue;
      out.captureDefaults[id as LaunchableAgentId] = true;
    }
  }

  const acked = obj['dangerAcknowledged'];
  if (Array.isArray(acked)) {
    out.dangerAcknowledged = [...new Set(
      acked.filter((k): k is string => typeof k === 'string' && k.length <= 200)
    )].slice(0, 500);
  }

  // Scrollback depths (Phase 13.7). These reach `tmux set-option -g
  // history-limit` and `capture-pane -S -<n>`, so the clamp is a guard, not a
  // nicety: a hand-edited settings.json asking for 50,000,000 lines is a
  // memory-exhaustion footgun, and it must be caught HERE rather than after
  // the value has been handed to tmux.
  out.scrollbackLines = clampScrollbackLines(obj['scrollbackLines']);
  out.savedScrollbackLines = clampSavedScrollbackLines(
    obj['savedScrollbackLines'],
    out.scrollbackLines
  );

  // Appearance (Phase 62, and the work area font in Phase 78). Membership
  // checks only. These are preferences with no danger semantics. They never
  // touch the danger seal. A hand-edited file can at worst pick a different
  // preset, and an old file without these keys loads as the defaults, which
  // derive zero overrides.
  out.highlightScheme = sanitizeHighlightScheme(obj['highlightScheme']);
  out.contrastLevel = sanitizeContrastLevel(obj['contrastLevel']);
  out.workAreaFont = sanitizeWorkAreaFont(obj['workAreaFont']);
  out.workAreaFontCustom = sanitizeWorkAreaFontCustom(obj['workAreaFontCustom']);
  // The frame's hue (Phase 207). Same posture: a whole degree on the circle
  // or the shipped 222, never sealed, and 222 derives zero overrides.
  out.chromeHue = sanitizeChromeHue(obj['chromeHue']);
  // Where the ramp sits and how far it spreads (Phase 210). Whole stops
  // CLAMPED into range rather than wrapped, because the ends of these two
  // axes are where the ramp stops working. Both default to the shipped ramp,
  // which derives zero overrides.
  out.chromeShade = sanitizeChromeShade(obj['chromeShade']);
  out.chromeDepth = sanitizeChromeDepth(obj['chromeDepth']);
  // The scheme (Phase 213). Membership only, and garbage reads as the shipped
  // dark, which derives zero overrides and is byte identical to before.
  out.colorScheme = sanitizeColorScheme(obj['colorScheme']);

  // The fold choice (Phase 138). Membership FIRST, and the seal after, in
  // getSettings. This is the shape check and it cannot tell who wrote the
  // file, which is what the seal is for.
  out.fold = sanitizeFoldSettings(obj['fold']);

  // The arch enrichment choice (Phase 158). The same two step check as the
  // fold above: membership against the compiled ARCH recipe table here, and
  // the seal after, in getSettings.
  out.arch = sanitizeArchSettings(obj['arch']);

  // The usage meter's per provider opt in (Phase 181). Membership only, and
  // no seal: turning a meter on starts no process, and the only thing it can
  // cause is one request to the vendor that issued the token, whose host is
  // compiled in and cannot be named by a settings file. Anything that is not
  // literally `true` reads off, which is what every settings file written
  // before this phase means.
  out.usage = sanitizeUsageSettings(obj['usage']);

  // Auto save (Phase 268). Membership on the mode and a clamp on the delay,
  // and no seal: a timer writes the person's own files through the guarded
  // door and starts nothing. An invalid row drops WHOLE to off, which is the
  // shipped answer and what every settings file written before this phase
  // means.
  out.autoSave = sanitizeAutoSaveSettings(obj['autoSave']);

  return out;
}

/**
 * Coerce a parsed `autoSave` value into a valid choice (Phase 268).
 *
 * The same discipline as `sanitizeArchSettings` below: a non-object or an
 * unknown mode drops the WHOLE row to off rather than merging half of it,
 * because half a choice here would be a timer with no mode or a mode with a
 * delay nobody chose, and the thing at the other end of it is a write to the
 * person's file. A valid mode with a silly delay keeps the mode and clamps the
 * delay, because the mode is the decision and the delay is a number.
 */
export function sanitizeAutoSaveSettings(raw: unknown): AutoSaveSettings {
  if (raw === null || typeof raw !== 'object') return noAutoSave();
  const obj = raw as Record<string, unknown>;
  const mode = obj['mode'];
  if (!isAutoSaveMode(mode)) return noAutoSave();
  return { mode, delayMs: clampAutoSaveDelay(obj['delayMs']) };
}

/**
 * Coerce a parsed `fold` value into a valid choice.
 *
 * AN INVALID VALUE DROPS THE WHOLE OBJECT TO NONE rather than merging half of
 * it. That mirrors the rule CLAUDE.md already states for an overlay row: an
 * invalid row is dropped whole and never partially merged. Half a fold choice
 * would be an agent with no model or a model no recipe exposes, and either one
 * would put an unmeasured argv in front of a person's own subscription.
 *
 * None is the answer for a file with no `fold` key, which is every settings
 * file written before this phase and every fresh install.
 */
export function sanitizeFoldSettings(raw: unknown): FoldSettings {
  if (raw === null || typeof raw !== 'object') return noFoldChosen();
  const obj = raw as Record<string, unknown>;
  const agentId = obj['agentId'];
  const model = obj['model'];
  if (typeof agentId !== 'string' || typeof model !== 'string') {
    return noFoldChosen();
  }
  const recipe = foldRecipeFor(agentId);
  if (recipe === null || !recipeHasModel(recipe, model)) return noFoldChosen();
  return { agentId, model };
}

/**
 * Coerce a parsed `arch` value into a valid choice (Phase 158).
 *
 * The same discipline as `sanitizeFoldSettings` above, against the compiled
 * ARCH recipe table: an invalid value drops the whole object to None rather
 * than merging half of it, because half a choice would be an agent with no
 * model or a model no arch recipe exposes, and either one would put an
 * unmeasured argv in front of a person's own subscription. None is the
 * answer for a file with no `arch` key, which is every settings file written
 * before this phase and every fresh install.
 */
export function sanitizeArchSettings(raw: unknown): ArchSettings {
  if (raw === null || typeof raw !== 'object') return noArchChosen();
  const obj = raw as Record<string, unknown>;
  // Phase 175. The visibility switch reads independently of the harness
  // pair: a bad pair drops to None but must not turn the surface off behind
  // the person's back, and anything that is not literally `true` reads
  // false, which is the shipped default and what every settings file written
  // before this phase means.
  const enabled = obj['enabled'] === true;
  // Phase 257. The wrapper pass switch reads the same way and rides beside
  // `enabled` through both early returns: it decides what one worker pool
  // parses and never what runs, so it is no part of the sealed key either.
  const wrapperPass = obj['wrapperPass'] === true;
  const agentId = obj['agentId'];
  const model = obj['model'];
  if (typeof agentId !== 'string' || typeof model !== 'string') {
    return { ...noArchChosen(), enabled, wrapperPass };
  }
  // PHASE 259. THE ARCHITECTURE PANE NOW HAS TWO RECIPE TABLES AND ONE
  // CHOICE, so a pair is valid when EITHER table admits it.
  //
  // The contract pass reads `archRecipeFor` and the semantic pass reads
  // `archSemanticRecipeFor` (enrich/run.ts), and until this line was written
  // only the first was asked here. Measured on 2026-09-12: choosing
  // `codex`/`gpt-6-astra` through the app's own settings door read back
  // `null/null`, because codex names no CONTRACT recipe, so every semantic
  // ask refused `no-choice` before it reached the runner and the row this
  // phase adds could not be selected by anybody, ever.
  //
  // THIS WIDENS WHAT MAY BE CHOSEN AND NOTHING ELSE. The seal, the Phase 23
  // confirm gate and the runner's re-check at the spawn are untouched, and an
  // agent that names only one of the two tables still refuses `no-recipe` on
  // the pass it has no row for, which is a result rather than a failure.
  const contract = archRecipeFor(agentId);
  const semantic = archSemanticRecipeFor(agentId);
  const known =
    (contract !== null && recipeHasModel(contract, model)) ||
    (semantic !== null && recipeHasModel(semantic, model));
  if (!known) {
    return { ...noArchChosen(), enabled, wrapperPass };
  }
  return { enabled, agentId, model, wrapperPass };
}

/** Apply a shallow patch (present keys replace wholesale), re-sanitized. */
export function applySettingsPatch(
  current: GmuxSettings,
  patch: GmuxSettingsPatch
): GmuxSettings {
  return sanitizeSettings({ ...current, ...patch });
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

let cached: SettingsFile | null = null;

/**
 * The seal-checked view of `cached.settings`, remembered per load so the
 * keychain is read at most once per run. Null until the check has run with a
 * usable keystore — before that every read re-tries, because caching "nothing
 * is sealed" from a pre-ready call would drop a legitimate flag for the whole
 * run.
 */
let sealChecked: GmuxSettings | null = null;

/**
 * WHAT THE LAST READ OF `settings.json` DROPPED from the shell-variable lists
 * (Phase 275), split by the layer that dropped it.
 *
 * TWO LAYERS AND THEY ARE NOT INTERCHANGEABLE. The SHAPE layer drops a name
 * that could never be read — a non-string, a refused name, a seventeenth — and
 * it cannot tell who wrote the file, which is Phase 269's recorded contract and
 * is why `sanitizeEnvPassthrough` says nothing. The SEAL layer drops a name
 * that is perfectly well formed and that no human confirmed, which is the
 * interesting one, and it runs over the already-sanitized settings so every
 * name it reports is provably safe to draw.
 *
 * WHY IT IS HELD HERE RATHER THAN RECOMPUTED ON ASK. `getSettings` short
 * circuits on `sealChecked` after the first call of a load, so the seal answer
 * exists exactly once per load and asking again would either re-open the
 * keychain or invent a second answer.
 */
let shapeEnvRejections: {
  shared: string[];
  sharedOver: number;
  unnamed: number;
} = {
  shared: [],
  sharedOver: 0,
  unnamed: 0
};
let sealEnvRejections: SealEnvRejections | null = null;

/**
 * PHASE 278 — THE FILE'S OWN ENTRIES, in the file's own order, for the seal to
 * filter once it is open.
 *
 * WHY IT IS HELD HERE. The repair is that the sixteen-name budget must be spent
 * on names the seal covers rather than on the first sixteen entries anything
 * with write access to the home directory appended. The seal is only open in
 * `getSettings`, four steps after `sanitizeSettings` has already thrown the
 * seventeenth entry away, so the read path needs the file's own list at that
 * point. This is it, re-derived from the RAW parsed object the same way the
 * shape report above is — see that comment for why the reporting is not
 * smuggled out of the pure sanitizer through a side effect.
 *
 * THIS FIELD MAY NEVER BE PUT ON `SettingsFile`. `writeFile` serialises that
 * object WHOLE into the person's own `settings.json`, so a later round that
 * "tidied" the candidates onto `cached` would write an attacker's junk names
 * back into the file the seal exists to distrust. It is cheap to break, it
 * would look like a simplification, and it is the one rule about this field
 * that matters.
 *
 * IT ADDS NO UNBOUNDEDNESS THAT IS NOT ALREADY PAID. `loadFile` reads the whole
 * file with `readFileSync` and `JSON.parse`s it with no bound, and the shared
 * sanitizer already walks every entry of the raw list. These names are a SUBSET
 * of what that parse already held, every one of them is at most
 * `OVERLAY_LIMITS.maxEnvKeyLength` bytes because `isDrawableEnvName` says so,
 * and nothing derived from them is ever echoed: the pass caps at sixteen and
 * the report loops run over the sanitized lists. It is cleared on the next
 * load and on a successful write, so it is never held for the life of the
 * process.
 */
let fileEnvEntries: {
  perAgent: Partial<Record<LaunchableAgentId, string[]>>;
  shared: string[];
} = { perAgent: {}, shared: [] };

/**
 * `settings.json` parsed, or null when it is missing, corrupt or not an
 * object. The one reader, shared by `loadFile` and `saveSettingsWindowBounds`.
 */
function readSettingsObject(): Record<string, unknown> | null {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(settingsPath(), 'utf8'));
  } catch {
    // Missing or corrupt → defaults. Preferences are recoverable by design.
  }
  return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function loadFile(): SettingsFile {
  if (cached !== null) return cached;
  const obj = readSettingsObject() ?? {};
  const boundsRaw = obj['settingsWindowBounds'];
  const bounds =
    boundsRaw !== null &&
    typeof boundsRaw === 'object' &&
    ['x', 'y', 'width', 'height'].every(
      (k) => typeof (boundsRaw as Record<string, unknown>)[k] === 'number'
    )
      ? (boundsRaw as unknown as SettingsWindowBounds)
      : undefined;
  const seal = obj['dangerSeal'];
  cached = {
    version: 1,
    settings: sanitizeSettings(obj['settings']),
    ...(bounds !== undefined ? { settingsWindowBounds: bounds } : {}),
    ...(typeof seal === 'string' ? { dangerSeal: seal } : {})
  };
  // PHASE 275. The shape layer's own report, RE-DERIVED here rather than
  // smuggled out of `sanitizeSettings` through a module global. That function
  // is documented pure, is exported, and is called by tests and by
  // `applySettingsPatch`; giving it a side effect so this line could read one
  // would make a patch merge quietly rewrite what the Settings window draws.
  // The cost is running one filter twice over at most sixteen short strings.
  const rawSettings = obj['settings'];
  const sharedShape = sanitizeEnvPassthroughShared(
    rawSettings !== null && typeof rawSettings === 'object'
      ? (rawSettings as Record<string, unknown>)['envPassthroughShared']
      : undefined,
    sharedRefusedEnvKeys()
  );
  shapeEnvRejections = {
    shared: sharedShape.refused,
    sharedOver: sharedShape.refusedOver,
    unnamed: sharedShape.unnamed
  };
  // PHASE 278. The file's own entries, kept beside the shape report and for the
  // same reason: `getSettings` needs them once the seal is open, and the pure
  // sanitizer must not grow a side effect to hand them over. Ids that are not
  // launchable are dropped here, which is the one thing `envFileEntryNames`
  // cannot do for itself — it answers about a LIST and this is a MAP.
  const rawMap =
    rawSettings !== null && typeof rawSettings === 'object'
      ? (rawSettings as Record<string, unknown>)['envPassthrough']
      : undefined;
  const perAgentCandidates: Partial<Record<LaunchableAgentId, string[]>> = {};
  if (rawMap !== null && typeof rawMap === 'object') {
    for (const [id, names] of Object.entries(rawMap as Record<string, unknown>)) {
      if (!LAUNCHABLE_SET.has(id)) continue;
      const list = envFileEntryNames(names);
      if (list.length > 0) perAgentCandidates[id as LaunchableAgentId] = list;
    }
  }
  fileEnvEntries = {
    perAgent: perAgentCandidates,
    shared: envFileEntryNames(
      rawSettings !== null && typeof rawSettings === 'object'
        ? (rawSettings as Record<string, unknown>)['envPassthroughShared']
        : undefined
    )
  };
  sealChecked = null;
  sealEnvRejections = null;
  return cached;
}

/**
 * Log a rejection once per load, naming the flags and the reason.
 *
 * PHASE 275. The keys arrive already spelled by the loop that dropped them, so
 * a shared name reads `* ANTHROPIC_API_KEY` (through `envSharedKey`) beside a
 * per-agent `claude FOO`. Nothing here parses one back apart — this function
 * joins opaque strings, which is all a seal key ever has to be.
 */
function warnRejected(
  rejected: readonly string[],
  missing: readonly string[] = []
): void {
  // PHASE 278 — TWO SENTENCES, BECAUSE THE FIRST ONE IS FALSE OF HALF THE LIST.
  // `rejected` now carries two different facts. A DROP is a setting that was in
  // the file and that nobody set in the Settings window, and today's sentence
  // is exactly right about it. A MISSING key is the opposite: a setting the
  // person DID make here, which the file no longer carries, so telling them it
  // "was not set in Tortie's Settings window" would be untrue about the only
  // entries on the line they are not at fault for.
  //
  // ONE SET DIFFERENCE OVER OPAQUE STRINGS, and never a parse. Neither half of
  // this function looks inside a key; `missing` arrives already spelled by the
  // backstop that composed it.
  const missingSet = new Set(missing);
  const drops = rejected.filter((key) => !missingSet.has(key));
  if (drops.length > 0) {
    settingsLog.warn(
      `ignoring ${drops.length} setting(s) that decide what runs and were ` +
        `not set in Tortie's Settings window: ${drops.join(', ')}. Set them ` +
        `in Settings if you want them.`
    );
  }
  // THE FIX ROUND CORRECTED THE SECOND SENTENCE. It said the settings were
  // "not in settings.json any more", and that is false of a confirmed name a
  // later build refuses on shape, which the file still holds. It now says what
  // is true of both causes, in the words the card uses.
  if (missing.length > 0) {
    settingsLog.warn(
      `${missing.length} setting(s) you set in Tortie's Settings window are ` +
        `not on the list Tortie reads any more, so they are not in effect: ` +
        `${missing.join(', ')}. Set them again if you still want them.`
    );
  }
}

/**
 * Write `settings.json` atomically. It takes a `SettingsFile`, or, for the one
 * caller that must leave the settings half alone, the object the file already
 * holds with one key replaced (`saveSettingsWindowBounds`).
 */
function writeFile(file: SettingsFile | Readonly<Record<string, unknown>>): void {
  try {
    const path = settingsPath();
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    renameSync(tmp, path); // atomic on the same volume
  } catch (err) {
    // Never let a failed preference write break the app; the in-memory
    // value stays live for this run.
    settingsLog.warn(`could not persist settings: ${(err as Error).message}`);
  }
}

/**
 * Write settings and re-seal their danger state. A danger value that cannot be
 * sealed is not written at all, because storing one that the next load would
 * refuse would make the Settings window lie about what future sessions will
 * launch with.
 */
function persistSettings(next: GmuxSettings): GmuxSettings {
  const file = loadFile();
  let settings = next;
  const state = dangerStateOf(settings);
  const seal = sealDangerState(state);
  if (!isDangerStateEmpty(state) && seal === undefined) {
    // PHASE 278. TWO ARGUMENTS, DELIBERATELY. This is the WRITE path and the
    // question it asks is "what can be recorded right now", not "what did the
    // file hold". Handing it the file's candidates would restore names into a
    // save that cannot seal them, and an empty seal covers nothing anyway so
    // its backstop reports no missing name and the log line below keeps exactly
    // the meaning it has always had.
    const stripped = withSealedDangerState(settings, EMPTY_DANGER_STATE);
    settings = stripped.settings;
    settingsLog.warn(
      `the OS keystore is unavailable, so these choices cannot be ` +
        `recorded: ${stripped.rejected.join(', ')}`
    );
  }
  cached = {
    version: file.version,
    settings,
    ...(file.settingsWindowBounds !== undefined
      ? { settingsWindowBounds: file.settingsWindowBounds }
      : {}),
    ...(seal !== undefined ? { dangerSeal: seal } : {})
  };
  sealChecked = settings;
  // PHASE 275. A successful write CLEARS the rejections, and that is honesty
  // rather than tidiness: `writeFile` below persists the seal-filtered
  // settings, so the dropped names are gone from settings.json. Saying they are
  // still being ignored would be a sentence about a file that no longer says
  // what it said.
  // PHASE 278. The candidates go with them, for the same reason and one more:
  // `writeFile` below writes the seal-filtered settings, so the file's own
  // entries are now the settings' own entries and holding the old ones would
  // be a record of a file that no longer says what it said. THIS IS ALSO WHERE
  // THE HEALING HAPPENS. At the parent commit this same save was what made the
  // loss permanent — it wrote the settings the cap had already emptied and
  // re-sealed to them. Now the pass has put the confirmed name back before this
  // runs, so the save writes the confirmed name and drops the junk.
  settingsHalfWritten();
  writeFile(cached);
  return settings;
}

/**
 * The settings half of the file is about to be written from `sealChecked`, so
 * every report about the LOAD is now about a file that no longer says what it
 * said. Two callers: `persistSettings`, and the one arm of
 * `saveSettingsWindowBounds` that cannot leave the settings half alone.
 */
function settingsHalfWritten(): void {
  shapeEnvRejections = { shared: [], sharedOver: 0, unnamed: 0 };
  sealEnvRejections = noSealEnvRejections();
  fileEnvEntries = { perAgent: {}, shared: [] };
}

type SettingsListener = (settings: GmuxSettings) => void;
const listeners = new Set<SettingsListener>();

/**
 * Current persisted settings (loaded + sanitized on first call), with every
 * danger value the seal does not cover removed. This is the only read anything
 * outside this module has, so an unsealed danger flag never reaches a create
 * path, a hotkey launch, or the ⌘T sheet's pre-checks.
 */
export function getSettings(): GmuxSettings {
  const file = loadFile();
  if (sealChecked !== null) return sealChecked;
  // PHASE 278 — THE TRIPWIRE. A blob beside a danger state that READS as empty
  // means a setting the person confirmed is not in effect. Without this clause
  // such a file takes the short circuit below and nothing ever asks the seal
  // what it covers — the one hole in the backstop, and exactly the shape a
  // person hits when something empties their lists outright rather than
  // pushing a name out of them.
  //
  // THREE THINGS PRODUCE THAT PAIR, AND TORTIE'S OWN WRITES ARE NOT ONE OF
  // THEM. The file was edited underneath the app; the file was rolled back to
  // an older copy; or the file holds a sealed value this build refuses on
  // shape, so the SANITIZED state is empty while the file on disk is not. Each
  // is a case the backstop exists to report, and each costs one keychain read.
  // Tortie's writes were read rather than assumed: `sealDangerState` returns
  // `undefined` on its first line when `isDangerStateEmpty(state)`, and
  // `persistSettings` omits the `dangerSeal` key entirely when the seal is
  // `undefined`. The Phase 278 fix round removed the one door that did write
  // the pair — `saveSettingsWindowBounds` wrote the sanitized settings beside
  // the old blob, so closing the Settings window could empty a state and keep
  // its seal — and that door now leaves the settings half as the file holds it.
  //
  // IT COSTS AN ORDINARY INSTALL NOTHING. A file with no danger value has no
  // blob at all, so `hasSeal` is false, the short circuit still runs and the
  // keychain is still never touched — which is what keeps the cost sentence on
  // the seal header above true.
  const hasSeal = typeof file.dangerSeal === 'string' && file.dangerSeal.length > 0;
  if (!hasSeal && isDangerStateEmpty(dangerStateOf(file.settings))) {
    // The common case, and the one that never touches the keychain. Phase 275:
    // a file whose only danger value is a SHARED name does not take this
    // branch, because `isDangerStateEmpty` asks about `envShared`. That clause
    // is the whole of layer one for this phase and it has an ablation.
    sealChecked = file.settings;
    sealEnvRejections = noSealEnvRejections();
    return sealChecked;
  }
  const sealed = openDangerSeal(file.dangerSeal);
  const { settings, rejected, missing, envRejected } = withSealedDangerState(
    file.settings,
    sealed ?? EMPTY_DANGER_STATE,
    // PHASE 278. The file's own entries, handed in rather than reached for, so
    // `withSealedDangerState` stays pure and stays exported for tests. This is
    // the ONLY shipping call site that supplies them: the write path in
    // `persistSettings` does not.
    {
      perAgent: fileEnvEntries.perAgent,
      shared: fileEnvEntries.shared,
      agentEnvKeys: compiledLaunchEnvKeys,
      sharedRefusedEnvKeys: sharedRefusedEnvKeys()
    }
  );
  // A null seal means "not known yet" (app not ready). Answer safely now and
  // ask again on the next read rather than remembering the safe answer, and
  // do not announce a rejection that is not final.
  if (sealed !== null) {
    sealChecked = settings;
    warnRejected(rejected, missing);
    // Phase 275. Recorded on exactly the branch that announces, so the Settings
    // window never draws a rejection that is not final either.
    sealEnvRejections = envRejected;
  }
  return settings;
}

/**
 * What the last read dropped from the two shell-variable lists (Phase 275),
 * for the Settings window to draw on the card it belongs to.
 *
 * READ ONLY, and it answers about the load rather than about the disk: it is
 * the pair of reports the current load produced, and the next successful write
 * clears it. Calling `getSettings()` first is what makes the seal half
 * meaningful — before the first read of a load there has been no seal check to
 * report, and this answers empty rather than inventing one.
 *
 * THE TWO LAYERS LEAVE THIS FUNCTION APART, AND THE FIX ROUND IS WHY. The
 * comment thirty lines above this one says the shape layer and the seal layer
 * "are not interchangeable" and keeps them in two module fields for exactly that
 * reason — and then the build this round verified concatenated them here, into
 * one list the window drew under the SEAL's sentence. Two verifiers found it
 * independently, one in a harness and one in the running window:
 *
 *   - hand-write PATH and twenty junk names into a sealed settings.json and the
 *     card drew 21 names under "Ignored, because they were not added here",
 *     while app.log — which sees the seal layer alone — named 12. The window and
 *     the log disagreed about what had happened;
 *   - put sixteen shape-valid junk names AHEAD of a name the seal does cover and
 *     the real name is pushed out at the shape layer, so the card named that
 *     name FIRST and said it had never been added here. It had. The one line
 *     that exists to say honestly why a key stopped arriving was untrue about
 *     the only name the person cared about.
 *
 * Nothing unsafe was delivered on either reading — the name was dropped, the cap
 * still failed closed, and no value moved — so this is an honesty defect and it
 * is repaired where the two answers are still apart rather than after they are
 * joined. The concatenation is gone: `shared` is the seal's answer and
 * `sharedUnread` is the shape layer's, and `env-copy.ts` gives each its own
 * sentence, because "add it here" is the fix for one of them and a dead end for
 * the other.
 *
 * PHASE 278 SUBTRACTS THE RESTORED NAMES, AND HERE IS WHERE BOTH HALVES ARE IN
 * HAND. `shapeEnvRejections.shared` comes from `sanitizeEnvPassthroughShared`,
 * which counts a name dropped for being PAST THE CAP as a shape drop. Since
 * this phase the seal-aware pass may put such a name back, and drawing
 * `envUnreadLine` over it would tell a person "Tortie will not read it" about a
 * name Tortie is reading — the exact class of untruth the fix round above
 * existed to end. So the shape layer's own answer is taken apart from the
 * seal's exactly as before, and THEN every entry whose NAME Tortie reads is
 * subtracted from it. `sanitizeEnvPassthroughShared` itself is untouched.
 *
 * THE FIX ROUND MADE THE SUBTRACTION COUNT ENTRIES, NOT NAMES. The first build
 * subtracted restored NAMES from a report that counts ENTRIES, so a restored
 * name written twice past the cap made `sharedUnreadOver` GROW, and the card
 * said "and 1 more" about a copy of a name Tortie reads. The same rule now
 * also covers a copy of a name the shape layer kept, which Phase 275 drew as
 * "Tortie will not read them" while Tortie read it. The count is exact because
 * of two facts about the shape layer: every drawable entry it refuses is
 * either echoed or counted, never both and never neither; and of all the
 * entries that carry one name it keeps at most one, the first. So the file's
 * entries carrying a name Tortie reads, less one for each such name the shape
 * layer kept, are exactly the refused entries to take away, and the ones not
 * echoed come off the count.
 *
 * PHASE 278 ALSO CARRIES THE BACKSTOP'S TWO COUNTS. They are the other
 * direction — a name the person confirmed that the finished lists do not hold —
 * and the card draws a third sentence from them.
 *
 * NAMES ONLY. There is no field on `EnvRejections` that could carry a value,
 * and every name on it passed the shape gate before it got here.
 */
export function envRejectionsNow(): EnvRejections {
  const seal = sealEnvRejections;
  const answer = noEnvRejections();
  answer.unnamed = shapeEnvRejections.unnamed;
  answer.shared = [...(seal?.shared ?? [])];
  answer.sharedUnread = [...shapeEnvRejections.shared];
  answer.sharedUnreadOver = shapeEnvRejections.sharedOver;
  answer.perAgent = { ...(seal?.perAgent ?? {}) };
  answer.sharedMissing = seal?.sharedMissing ?? 0;
  answer.perAgentMissing = { ...(seal?.perAgentMissing ?? {}) };
  // The module fields the subtraction needs, read where they already sit:
  // `sealChecked` is the finished shared list of this load, `cached` is the
  // SANITIZED one it was built from, and `fileEnvEntries` is the file's own
  // entries. Before the first read of a load `sealChecked` is null and this is
  // a no-op. After a save the shape report is empty, and so is this.
  const finalShared = new Set(sealChecked?.envPassthroughShared ?? []);
  if (
    finalShared.size > 0 &&
    (answer.sharedUnread.length > 0 || answer.sharedUnreadOver > 0)
  ) {
    const unread = answer.sharedUnread.filter((name) => !finalShared.has(name));
    const echoedRead = answer.sharedUnread.length - unread.length;
    const shapedShared = new Set(cached?.settings.envPassthroughShared ?? []);
    let refusedRead = 0;
    for (const name of fileEnvEntries.shared) {
      if (finalShared.has(name)) refusedRead += 1;
    }
    for (const name of finalShared) {
      if (shapedShared.has(name)) refusedRead -= 1;
    }
    answer.sharedUnread = unread;
    answer.sharedUnreadOver = Math.max(
      0,
      answer.sharedUnreadOver - Math.max(0, refusedRead - echoedRead)
    );
  }
  return answer;
}

/** Patch + persist + notify main-side listeners; returns the new settings. */
export function updateSettings(patch: GmuxSettingsPatch): GmuxSettings {
  const next = persistSettings(applySettingsPatch(getSettings(), patch));
  for (const l of listeners) l(next);
  return next;
}

/**
 * Main-side change subscription (menu accelerator rebuild, renderer
 * broadcast). Returns an unsubscribe.
 */
export function onSettingsUpdated(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Remembered Settings-window bounds (S13 "position remembered"). */
export function getSettingsWindowBounds(): SettingsWindowBounds | undefined {
  return loadFile().settingsWindowBounds;
}

export function saveSettingsWindowBounds(bounds: SettingsWindowBounds): void {
  // Bounds are written WITHOUT re-sealing: this path must not rewrite the
  // settings half of the file, so a window move can neither launder an
  // unsealed danger flag onto disk nor delete a sealed one.
  const held: SettingsFile = { ...loadFile(), settingsWindowBounds: bounds };
  cached = held;
  // THE PHASE 278 FIX ROUND MADE THE COMMENT ABOVE TRUE. This used to write
  // `cached`, and `cached.settings` is the SANITIZED settings: every list cut
  // at sixteen in file order, and every value this build does not offer
  // dropped. So closing the Settings window, which calls this, wrote sixteen
  // junk names to disk and dropped the confirmed seventeenth. The seal-aware
  // pass had put that name back for this run, and at the next launch there was
  // nothing left for it to find. The same write removed a sealed launch default
  // this build does not offer, and left the seal beside an empty danger state.
  //
  // So the file is read again and ONE key is replaced. Everything else is
  // written back exactly as the file holds it, including the seal blob. Nothing
  // new can be admitted this way, because nothing is sealed here and the next
  // load asks the seal about every name, exactly as it asks today.
  const onDisk = readSettingsObject();
  if (onDisk !== null) {
    writeFile({ ...onDisk, settingsWindowBounds: bounds });
    return;
  }
  // PHASE 282.1. A MISSING OR UNREADABLE FILE HAS NO SETTINGS HALF TO KEEP,
  // and the fix round's arm for it wrote `cached` — which is the Phase 278
  // write it had just removed from the readable path, one door over: the
  // SANITIZED list, cut at sixteen in file order, beside the old seal. The
  // reverify drove a file truncated at the re-read (a hand edit with a syntax
  // error, or an editor mid-write, which is the population Phase 278 is
  // about) and read the confirmed seventeenth name dropped from disk, the
  // seal left beside a state that no longer held it, and the next launch
  // reporting it missing on both cards.
  //
  // What is in memory is better than the cut list: `sealChecked` is this
  // load's finished answer, the confirmed names put back and the junk
  // dropped, and the seal on disk covers exactly those names — it is what
  // `persistSettings` writes, minus the re-seal, which this door still never
  // does. So that is what is written, and this arm is the one place besides
  // `persistSettings` that writes the settings half, so the load's reports
  // are cleared the same way. When the seal's answer is NOT final — the
  // keystore not ready, so `getSettings` answered with every danger value
  // stripped and cached nothing — nothing is written at all: a bounds write
  // that stripped a confirmed flag from disk would be worse than a window
  // that opens where it did last time, and the bounds stay in memory for this
  // run.
  const settings = getSettings();
  if (sealChecked === null) {
    settingsLog.warn(
      'settings.json could not be read and the seal is not open, so the Settings window bounds were not written'
    );
    return;
  }
  const healed: SettingsFile = { ...held, settings };
  cached = healed;
  settingsHalfWritten();
  writeFile(healed);
}
