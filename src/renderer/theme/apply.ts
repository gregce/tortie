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
 *
 * Phase 78 added the work-area FONT to the same mechanism, and it added
 * nothing else. The font half does not go through `deriveOverrides`, which is
 * colour math with an sRGB contract and its own tests. It is a second, tiny
 * map merged on top, produced by the pure `fontOverrides` in ./work-fonts.ts.
 * The System preset returns an empty map, so the zero-override guarantee above
 * now covers three fields rather than two, and the existing diff is what
 * removes both font tokens again when a person goes back to System.
 *
 * The applier is also the ONE writer of the work-area font store. xterm and
 * Monaco each own an imperative font option that a custom property change
 * cannot reach, so they subscribe to that store and re-measure themselves.
 * They do that AFTER awaiting the named face, which this module never does on
 * their behalf.
 */

import {
  sanitizeChromeHue,
  sanitizeWorkAreaFont,
  sanitizeWorkAreaFontCustom
} from '@shared/settings';
import type { GmuxSettings, WorkAreaFont } from '@shared/settings';
import { forEachTerminal } from '../terminal/drop/registry';
import { resolveTerminalTheme } from '../terminal/theme';
import { deriveOverrides, type Appearance } from './derive';
import { ALL_THEME_TOKENS } from './presets';
import { fontOverrides, setCustomWorkFontFamily, setWorkAreaFont } from './work-fonts';
import { gmuxBridge } from '../bridge';

/**
 * Everything the applier reconciles the document to: the two Phase 62 colour
 * fields and the Phase 78 font field.
 *
 * It is a superset of `Appearance`, which stays exactly the colour pair
 * `deriveOverrides` accepts. The font never reaches the colour derivation.
 */
export interface AppliedAppearance extends Appearance {
  workAreaFont: WorkAreaFont;
  /** The family a 'custom' preset draws with ('' reads as Menlo). */
  workAreaFontCustom: string;
}

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
  /**
   * Publish the chosen preset to the store TerminalPane and MonacoHost watch.
   * It deliberately does NOT assign xterm's `fontFamily` here. Assigning the
   * family before the face has loaded makes xterm measure the cell and build
   * its WebGL glyph atlas in the fallback, and it stays wrong until the next
   * resize. Each pane awaits its own face and then re-measures itself.
   */
  setFont(preset: WorkAreaFont): void;
  /** Publish the 'custom' family to the store workFont resolves from. */
  setCustomFont(family: string): void;
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
): (appearance: AppliedAppearance) => void {
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
    // Feed the custom family store BEFORE fontOverrides resolves the stack,
    // or the tokens are written from the previous family on the broadcast that
    // selected Custom. This ordering is the whole point of the field existing.
    env.setCustomFont(appearance.workAreaFontCustom);

    // Colour first, then the font map on top. They share no key, so the
    // spread is a union rather than a precedence question, and both halves
    // return {} at their defaults.
    const next = {
      ...env.derive(appearance, base),
      ...fontOverrides(appearance.workAreaFont)
    };
    for (const [token, value] of Object.entries(next)) {
      if (applied[token] !== value) env.setProperty(token, value);
    }
    for (const token of Object.keys(applied)) {
      if (!(token in next)) env.removeProperty(token);
    }
    applied = next;
    lastKey = key;

    env.refreshTerminals();
    env.setFont(appearance.workAreaFont);
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

/**
 * The three appearance fields out of the full settings shape.
 *
 * The font field is sanitized again here even though main sanitizes it before
 * it is written. This renderer also reads a settings object over the bridge,
 * and a value that is not a preset would otherwise reach the store xterm and
 * Monaco subscribe to. The sanitizer answers 'system', which writes nothing.
 */
function toAppearance(settings: GmuxSettings): AppliedAppearance {
  return {
    highlightScheme: settings.highlightScheme,
    contrastLevel: settings.contrastLevel,
    chromeHue: sanitizeChromeHue(settings.chromeHue),
    workAreaFontCustom: sanitizeWorkAreaFontCustom(settings.workAreaFontCustom),
    workAreaFont: sanitizeWorkAreaFont(settings.workAreaFont)
  };
}

function browserEnv(): AppearanceEnv {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return {
    readBaseValue: (token) => styles.getPropertyValue(token).trim(),
    setProperty: (token, value) => root.style.setProperty(token, value),
    removeProperty: (token) => root.style.removeProperty(token),
    setCustomFont: setCustomWorkFontFamily,
    refreshTerminals: refreshLiveTerminalThemes,
    setFont: setWorkAreaFont,
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

  const bridge = gmuxBridge();
  if (typeof bridge?.settingsGet !== 'function') return;

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
