/**
 * Renderer-side settings state (S13) — one zustand store shared by the
 * Settings window AND the main window (the ⌘T modal's preset defaults and
 * the hotkey quick-create path read the same truth).
 *
 * Backing: the settings:* bridge extras, feature-detected — against an older
 * preload the store stays on defaults and `available` is false (the Settings
 * surface renders a friendly "not available" note instead of dead controls).
 * Cross-window coherence comes from EVT_SETTINGS_CHANGED: main broadcasts
 * every persisted change to every window.
 */

import { create } from 'zustand';
import type { GmuxSettingsExtras } from '@shared/ipc';
import type {
  AgentFlagCatalogs,
  GmuxSettings,
  GmuxSettingsPatch
} from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import type { AgentsScanResult } from '@shared/types';
import type { GmuxAgentRegistryExtras } from '@shared/ipc';

function bridge(): GmuxSettingsExtras & GmuxAgentRegistryExtras {
  return (window.gmux ?? {}) as unknown as GmuxSettingsExtras &
    GmuxAgentRegistryExtras;
}

export interface SettingsStoreState {
  /** Persisted settings (defaults until loaded). */
  settings: GmuxSettings;
  settingsLoaded: boolean;
  /** False when the preload lacks the settings bridge (older build). */
  available: boolean;
  /** Per-agent launch-flag catalogs (static per build). */
  catalogs: AgentFlagCatalogs;
  catalogsLoaded: boolean;
  /** Full 12-agent detection scan (agents:list); null until loaded. */
  scan: AgentsScanResult | null;
  scanning: boolean;

  /** Idempotent: load settings + catalogs + scan, subscribe to changes. */
  init(): void;
  /** Persist a shallow patch; resolves the post-patch settings (or null
   *  when the bridge is absent). Optimistically applies locally first. */
  update(patch: GmuxSettingsPatch): Promise<GmuxSettings | null>;
  /** Settings → Agents [Re-scan]: drop main's cache and re-probe. */
  rescan(): Promise<void>;
}

let initialized = false;

export const useSettingsStore = create<SettingsStoreState>()((set, get) => ({
  settings: defaultGmuxSettings(),
  settingsLoaded: false,
  available: true, // optimistic until init() feature-detects
  catalogs: {},
  catalogsLoaded: false,
  scan: null,
  scanning: false,

  init() {
    if (initialized) return;
    initialized = true;
    const b = bridge();

    if (typeof b.settingsGet !== 'function') {
      set({ available: false, settingsLoaded: true, catalogsLoaded: true });
      return;
    }

    void b
      .settingsGet()
      .then((settings) => set({ settings, settingsLoaded: true }))
      .catch(() => set({ settingsLoaded: true }));

    if (typeof b.agentFlagPresets === 'function') {
      void b
        .agentFlagPresets()
        .then((catalogs) => set({ catalogs, catalogsLoaded: true }))
        .catch(() => set({ catalogsLoaded: true }));
    } else {
      set({ catalogsLoaded: true });
    }

    if (typeof b.agentsList === 'function') {
      const list = b.agentsList.bind(b);
      set({ scanning: true });
      void list()
        .then((scan) => set({ scan, scanning: false }))
        .catch(() => set({ scanning: false }));
    }

    // Never unsubscribed — the store lives as long as the window.
    b.onSettingsChanged?.((settings) => set({ settings, settingsLoaded: true }));
  },

  async update(patch) {
    const b = bridge();
    if (typeof b.settingsSet !== 'function') return null;
    // Optimistic local apply; the broadcast confirms with the sanitized
    // truth (and corrects it if main dropped anything).
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    try {
      const next = await b.settingsSet(patch);
      set({ settings: next });
      return next;
    } catch {
      // Re-pull the persisted truth rather than guessing.
      try {
        const current = await b.settingsGet?.();
        if (current) set({ settings: current });
      } catch {
        /* keep optimistic state — next broadcast reconciles */
      }
      return null;
    }
  },

  async rescan() {
    const b = bridge();
    if (typeof b.agentsRescan !== 'function' || get().scanning) return;
    set({ scanning: true });
    try {
      const scan = await b.agentsRescan();
      set({ scan, scanning: false });
    } catch {
      set({ scanning: false });
    }
  }
}));
