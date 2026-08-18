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
 * Ownership: src/main/settings/** (settings+hotkeys stream).
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, safeStorage } from 'electron';
import type {
  GmuxSettings,
  GmuxSettingsPatch
} from '@shared/settings';
import {
  clampSavedScrollbackLines,
  clampScrollbackLines,
  dangerKey,
  defaultGmuxSettings,
  sanitizeContrastLevel,
  sanitizeHighlightScheme,
  sanitizeWorkAreaFont
} from '@shared/settings';
import type { LaunchableAgentId, LaunchableAgentKind } from '@shared/types';
import { LAUNCHABLE_AGENT_IDS } from '../agents/registry';
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
  return {
    defaults: defaults.sort(),
    acks: [...settings.dangerAcknowledged].sort()
  };
}

/** No danger state at all, which is the case for almost every settings file. */
export function isDangerStateEmpty(state: DangerState): boolean {
  return state.defaults.length === 0 && state.acks.length === 0;
}

/**
 * `settings` with every danger value the seal does not cover removed, plus the
 * launch defaults that were removed so the caller can say what happened.
 * Non-danger defaults are never touched. Pure, and exported for tests.
 *
 * A rejected ACK is not reported: its only effect is that the user sees the
 * confirm modal one more time, which is the safe direction.
 */
export function withSealedDangerState(
  settings: GmuxSettings,
  sealed: DangerState
): { settings: GmuxSettings; rejected: string[] } {
  const sealedDefaults = new Set(sealed.defaults);
  const sealedAcks = new Set(sealed.acks);
  const rejected: string[] = [];
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
  const acks = settings.dangerAcknowledged.filter((k) => sealedAcks.has(k));
  if (rejected.length === 0 && acks.length === settings.dangerAcknowledged.length) {
    return { settings, rejected };
  }
  return {
    settings: { ...settings, launchDefaults, dangerAcknowledged: acks },
    rejected
  };
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
 */
const SEAL_PREFIX = 'gmux-danger-seal-v1:';

const EMPTY_DANGER_STATE: DangerState = { defaults: [], acks: [] };

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
    return {
      defaults: strings(asState.defaults),
      acks: strings(asState.acks)
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

  return out;
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

function loadFile(): SettingsFile {
  if (cached !== null) return cached;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(settingsPath(), 'utf8'));
  } catch {
    // Missing or corrupt → defaults. Preferences are recoverable by design.
  }
  const obj =
    parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
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
  sealChecked = null;
  return cached;
}

/** Log a rejection once per load, naming the flags and the reason. */
function warnRejected(rejected: readonly string[]): void {
  if (rejected.length === 0) return;
  settingsLog.warn(
    `ignoring ${rejected.length} launch default(s) that turn a ` +
      `safeguard off and were not switched on in Tortie's Settings window: ` +
      `${rejected.join(', ')}. Switch them on in Settings → Launch defaults ` +
      `if you want them.`
  );
}

function writeFile(file: SettingsFile): void {
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
    const stripped = withSealedDangerState(settings, EMPTY_DANGER_STATE);
    settings = stripped.settings;
    settingsLog.warn(
      `the OS keystore is unavailable, so these launch defaults ` +
        `cannot be recorded: ${stripped.rejected.join(', ')}`
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
  writeFile(cached);
  return settings;
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
  if (isDangerStateEmpty(dangerStateOf(file.settings))) {
    // The common case, and the one that never touches the keychain.
    sealChecked = file.settings;
    return sealChecked;
  }
  const sealed = openDangerSeal(file.dangerSeal);
  const { settings, rejected } = withSealedDangerState(
    file.settings,
    sealed ?? EMPTY_DANGER_STATE
  );
  // A null seal means "not known yet" (app not ready). Answer safely now and
  // ask again on the next read rather than remembering the safe answer, and
  // do not announce a rejection that is not final.
  if (sealed !== null) {
    sealChecked = settings;
    warnRejected(rejected);
  }
  return settings;
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
  cached = { ...loadFile(), settingsWindowBounds: bounds };
  writeFile(cached);
}
