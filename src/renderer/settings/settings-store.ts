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
import type {
  ConfigRowsResult,
  GmuxAgentRegistryExtras,
  GmuxConfigExtras
} from '@shared/ipc';

function bridge(): GmuxSettingsExtras &
  GmuxAgentRegistryExtras &
  GmuxConfigExtras {
  return (window.gmux ?? {}) as unknown as GmuxSettingsExtras &
    GmuxAgentRegistryExtras &
    GmuxConfigExtras;
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

  /**
   * PHASE 23. What `agents.json` currently says, and what is on record for
   * each row that can cause a program to run.
   *
   * Null means "not read yet". A build whose preload has no `config` member
   * leaves it null for the life of the window and Settings draws nothing,
   * which is also the right answer for the ordinary machine that has no
   * configuration file: the result then carries no rows and no errors.
   *
   * This is the ONLY place the errors surface. A row Tortie dropped is a
   * sentence naming the field and the reason, and it has to be somewhere a
   * person can read it rather than only in a console nobody has open.
   */
  config: ConfigRowsResult | null;
  configBusy: string | null;

  /** Idempotent: load settings + catalogs + scan + config, subscribe. */
  init(): void;
  /** Persist a shallow patch; resolves the post-patch settings (or null
   *  when the bridge is absent). Optimistically applies locally first. */
  update(patch: GmuxSettingsPatch): Promise<GmuxSettings | null>;
  /** Settings → Agents [Re-scan]: drop main's cache and re-probe. */
  rescan(): Promise<void>;

  /** Re-read the config rows and their confirmation state from main. */
  refreshConfig(): Promise<void>;
  /**
   * Record that this person read these lines and agreed to them.
   *
   * The hash and the lines are the ones the sheet was drawn from, so main can
   * refuse the confirmation if the file moved while the sheet was open. It
   * returns the error sentence when main refused, and null when it recorded.
   * Confirming starts nothing: the person still has to create a session.
   */
  confirmConfigRow(id: string): Promise<string | null>;
  /** Withdraw one agreement, so the row asks again before it may launch. */
  forgetConfigRow(id: string): Promise<string | null>;
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
  config: null,
  configBusy: null,

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

    // Phase 23. One read at init. It reaches memory in main, so it costs no
    // disk access, and a build with no `config` member leaves this null.
    void get().refreshConfig();

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
  },

  async refreshConfig() {
    const b = bridge();
    if (b.config === undefined) return;
    try {
      set({ config: await b.config.rows() });
    } catch {
      /* leave the last good answer up rather than blanking the list */
    }
  },

  async confirmConfigRow(id) {
    const b = bridge();
    if (b.config === undefined) return 'This build cannot confirm rows.';
    const row = get().config?.rows.find((r) => r.id === id);
    if (row === undefined) return `There is no row called ${id} to confirm.`;
    set({ configBusy: id });
    try {
      // The hash and the lines are the ones this sheet was drawn from. Main
      // compares them against the file as it is NOW and refuses if the row
      // moved while the sheet was open, so an agent that rewrites the file
      // mid-read cannot have its new bytes agreed to by an old click.
      await b.config.confirm({ id, hashRead: row.hash, linesRead: row.lines });
      await get().refreshConfig();
      return null;
    } catch (err) {
      await get().refreshConfig();
      return err instanceof Error ? err.message : String(err);
    } finally {
      set({ configBusy: null });
    }
  },

  async forgetConfigRow(id) {
    const b = bridge();
    if (b.config === undefined) return 'This build cannot withdraw a row.';
    set({ configBusy: id });
    try {
      await b.config.forget(id);
      await get().refreshConfig();
      return null;
    } catch (err) {
      await get().refreshConfig();
      return err instanceof Error ? err.message : String(err);
    } finally {
      set({ configBusy: null });
    }
  }
}));
