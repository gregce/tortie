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
 * Ownership: src/main/settings/** (settings+hotkeys stream).
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type {
  GmuxSettings,
  GmuxSettingsPatch
} from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import type { LaunchableAgentId, LaunchableAgentKind } from '@shared/types';
import { LAUNCHABLE_AGENT_IDS } from '../agents/registry';
import { AGENT_FLAG_PRESETS } from '../agents/flags';

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
  settings: GmuxSettings;
  /** Remembered Settings-window position/size (S13); absent on first run. */
  settingsWindowBounds?: SettingsWindowBounds;
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
 * Coerce arbitrary parsed JSON into a valid GmuxSettings: unknown agent ids
 * dropped, malformed accelerators dropped, launch-default flags restricted
 * to each agent's cataloged presets, danger keys restricted to strings.
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

  const acked = obj['dangerAcknowledged'];
  if (Array.isArray(acked)) {
    out.dangerAcknowledged = [...new Set(
      acked.filter((k): k is string => typeof k === 'string' && k.length <= 200)
    )].slice(0, 500);
  }

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
  cached = {
    version: 1,
    settings: sanitizeSettings(obj['settings']),
    ...(bounds !== undefined ? { settingsWindowBounds: bounds } : {})
  };
  return cached;
}

function persist(file: SettingsFile): void {
  cached = file;
  try {
    const path = settingsPath();
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    renameSync(tmp, path); // atomic on the same volume
  } catch (err) {
    // Never let a failed preference write break the app; the in-memory
    // value stays live for this run.
    console.warn(`[gmux] could not persist settings: ${(err as Error).message}`);
  }
}

type SettingsListener = (settings: GmuxSettings) => void;
const listeners = new Set<SettingsListener>();

/** Current persisted settings (loaded + sanitized on first call). */
export function getSettings(): GmuxSettings {
  return loadFile().settings;
}

/** Patch + persist + notify main-side listeners; returns the new settings. */
export function updateSettings(patch: GmuxSettingsPatch): GmuxSettings {
  const file = loadFile();
  const next = applySettingsPatch(file.settings, patch);
  persist({ ...file, settings: next });
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
  persist({ ...loadFile(), settingsWindowBounds: bounds });
}
