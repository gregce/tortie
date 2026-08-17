/**
 * Phase 62 — runtime application of the appearance settings.
 *
 * `initAppearance()` runs in BOTH renderer entries (the main window and the
 * Settings window). It pulls the persisted settings once over the bridge,
 * derives CSS custom property overrides with `deriveOverrides`, writes them
 * inline on the document root, and re-applies on every settings broadcast.
 * It deliberately does not use the zustand settings store, so the main
 * window is themed at boot without any store init.
 *
 * The zero-override guarantee: the default appearance (blue, normal) derives
 * an empty map, so an untouched install writes NOTHING inline and renders
 * today's stylesheet bytes exactly. Returning to the defaults removes every
 * property this module ever set.
 *
 * The base values are captured from `getComputedStyle` ONCE, on the first
 * apply and before any write. Every later derivation starts from that
 * captured base, so applying teal after purple can never compound.
 *
 * `--bg-canvas` is read as the contrast anchor and is NEVER written. The
 * pre-paint window background, the terminal background mirror and the
 * capture path all depend on its exact byte value.
 */

import type { GmuxSettingsExtras } from '@shared/ipc';
import type { GmuxSettings } from '@shared/settings';
import { forEachTerminal } from '../terminal/drop/registry';
import { resolveTerminalTheme } from '../terminal/theme';
import { deriveOverrides, type Appearance } from './derive';
import { ALL_THEME_TOKENS } from './presets';

/**
 * What the applier needs from the world, injectable so the unit tests can
 * run without a DOM (the vitest environment is node) and can count derive
 * calls.
 */
export interface AppearanceEnv {
  /** The shipped value of one token, as the stylesheet computes it. */
  readBaseValue(token: string): string;
  /** Write one inline override on the document root. */
  setProperty(token: string, value: string): void;
  /** Remove one inline override from the document root. */
  removeProperty(token: string): void;
  /** Re-resolve the theme of every live terminal (selection highlight). */
  refreshTerminals(): void;
  /** The pure derivation; the real env passes `deriveOverrides`. */
  derive: typeof deriveOverrides;
}

/**
 * Build the applier: a function that takes an appearance and reconciles the
 * document root's inline custom properties to it.
 *
 * - Skips entirely when the incoming appearance equals the last applied one
 *   (JSON compare), so a settings broadcast about an unrelated field costs
 *   nothing. This is the "derive once per change" rule made mechanical.
 * - Diffs against the last applied map: setProperty for new or changed
 *   entries, removeProperty for entries no longer present. Returning to the
 *   defaults leaves zero inline custom properties.
 */
export function createAppearanceApplier(
  env: AppearanceEnv
): (appearance: Appearance) => void {
  let base: Record<string, string> | null = null;
  let lastKey: string | null = null;
  let applied: Record<string, string> = {};

  return (appearance) => {
    const key = JSON.stringify(appearance);
    if (key === lastKey) return;

    if (base === null) {
      // First apply: capture the shipped value of every covered token
      // BEFORE anything is written, so the base can never contain an
      // override this module made. ALL_THEME_TOKENS is the scheme family,
      // the contrast lists and the read-only `--bg-canvas` anchor.
      const captured: Record<string, string> = {};
      for (const token of ALL_THEME_TOKENS) {
        captured[token] = env.readBaseValue(token);
      }
      base = captured;
    }

    const next = env.derive(appearance, base);
    for (const [token, value] of Object.entries(next)) {
      if (applied[token] !== value) env.setProperty(token, value);
    }
    for (const token of Object.keys(applied)) {
      if (!(token in next)) env.removeProperty(token);
    }
    applied = next;
    lastKey = key;

    env.refreshTerminals();
  };
}

/**
 * Re-resolve the theme of every live terminal so the selection highlight
 * follows the scheme. One assignment per terminal, once per change; xterm
 * repaints on the options write. Exported for the unit test.
 */
export function refreshLiveTerminalThemes(): void {
  forEachTerminal((term) => {
    term.options.theme = resolveTerminalTheme();
  });
}

/** The two appearance fields out of the full settings shape. */
function toAppearance(settings: GmuxSettings): Appearance {
  return {
    highlightScheme: settings.highlightScheme,
    contrastLevel: settings.contrastLevel
  };
}

function browserEnv(): AppearanceEnv {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return {
    readBaseValue: (token) => styles.getPropertyValue(token).trim(),
    setProperty: (token, value) => root.style.setProperty(token, value),
    removeProperty: (token) => root.style.removeProperty(token),
    refreshTerminals: refreshLiveTerminalThemes,
    derive: deriveOverrides
  };
}

let started = false;

/**
 * Called once from each renderer entry, before createRoot. Feature-detects
 * the settings bridge; on an older preload it does nothing and the window
 * keeps the shipped colors. The first frames render the shipped colors until
 * `settingsGet` resolves, which is a recorded limit of the phase.
 */
export function initAppearance(): void {
  if (started) return;
  started = true;

  const bridge = (window.gmux ?? {}) as unknown as GmuxSettingsExtras;
  if (typeof bridge.settingsGet !== 'function') return;

  const apply = createAppearanceApplier(browserEnv());
  void bridge
    .settingsGet()
    .then((settings) => apply(toAppearance(settings)))
    .catch(() => {
      // An unanswerable read keeps the shipped colors; the next broadcast
      // reconciles.
    });
  bridge.onSettingsChanged?.((settings) => apply(toAppearance(settings)));
}
