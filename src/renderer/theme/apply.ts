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
 * `--bg-canvas` is read as the contrast anchor and is written by the hue
 * alone (Phase 207), at a hue other than the shipped 222. The three mirrors
 * that depend on its byte value follow it: main paints the window from the
 * same shared rotation, the terminal re-resolves its theme here, and the
 * capture path reads the resolved theme.
 *
 * Phase 207 also made this module the ONE writer of the chrome theme store
 * (./chrome-theme.ts), in the same posture as the font store below: the
 * terminal's resolver and Monaco's theme read the overrides and the text
 * polarity from it, because neither can read a custom property change on
 * its own. It publishes BEFORE it refreshes the live terminals, so a pane
 * re-resolving sees the state that belongs to the same apply.
 *
 * Phase 213 added the SCHEME. The persisted choice resolves to one of two
 * bases, and each base is captured from the stylesheet the first time it is
 * in effect, with the root attribute on and no inline override present, so
 * the light base is read from tokens.css exactly as the dark one is and
 * neither can ever hold an override this module wrote. A change of base is
 * one reconcile inside one view transition, the crossfade; everything else
 * lands at once as before. The dark base is the absence of the attribute.
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
  resolveScheme,
  sanitizeChromeDepth,
  sanitizeChromeHue,
  sanitizeChromeShade,
  sanitizeColorScheme,
  sanitizeWorkAreaFont,
  sanitizeWorkAreaFontCustom
} from '@shared/settings';
import type { BaseScheme, ColorScheme, GmuxSettings, WorkAreaFont } from '@shared/settings';
import { forEachTerminal } from '../terminal/drop/registry';
import { resolveTerminalContrastFloor, resolveTerminalTheme } from '../terminal/theme';
import { publishChromeTheme, type ChromeThemeState } from './chrome-theme';
import { deriveOverrides, type Appearance } from './derive';
import { frameForBase } from './frame-stops';
import { textIsDarkOn } from './hue';
import { ALL_THEME_TOKENS, CANVAS_TOKEN } from './presets';
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
  /**
   * The persisted scheme (Phase 213): light, dark, or system. The applier
   * resolves system through the environment's own reading of the Mac and
   * derives over the BASE that resolves to, never over the choice.
   */
  colorScheme: ColorScheme;
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
  /** Publish what was written, for the terminal and Monaco (Phase 207). */
  publish(state: ChromeThemeState): void;
  /**
   * The synthetic ground (Phase 207): an OKLCH lightness added to the whole
   * ramp, 0 in every real launch. The real env reads the harness knob below;
   * the tests answer 0. It is part of the applier's skip key, so changing it
   * re-derives even when the appearance did not move.
   */
  groundLift(): number;
  /** The pure derivation; the real env passes `deriveOverrides`. */
  derive: typeof deriveOverrides;
  /**
   * Does the Mac prefer dark right now (Phase 213)? The real env reads
   * prefers-color-scheme, which is the same Chromium answer main reads from
   * nativeTheme for the compositor fill, so the two agree on the base.
   */
  systemPrefersDark(): boolean;
  /**
   * Put the base on the document root: the attribute tokens.css keys its
   * light block on, and the color-scheme every shadow root inherits. The
   * dark base is the ABSENCE of the attribute, which is what keeps a dark
   * launch byte identical to one that never had this field.
   */
  setScheme(scheme: BaseScheme): void;
  /**
   * Run one reconcile, crossfading when asked. The real env starts a view
   * transition, which snapshots the old frame, runs `commit` as one task,
   * and fades the snapshot over the new frame for one panel duration, so no
   * frame ever paints half a palette. Under reduced motion it runs `commit`
   * at once and nothing transitions. The tests run `commit` at once.
   */
  transition(commit: () => void, crossfade: boolean): void;
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
  // ONE BASE PER SCHEME (Phase 213). Each is captured from the stylesheet
  // the first time that scheme is in effect, with the attribute on the root
  // and no inline override present, so neither can ever contain a value
  // this module wrote, and the light base is read from tokens.css's light
  // block the way the dark one is read from its first block.
  const bases: Partial<Record<BaseScheme, Record<string, string>>> = {};
  let lastKey: string | null = null;
  let lastScheme: BaseScheme | null = null;
  let applied: Record<string, string> = {};

  return (appearance) => {
    const lift = env.groundLift();
    const scheme = resolveScheme(appearance.colorScheme, env.systemPrefersDark());
    const key = JSON.stringify({ appearance, lift, scheme });
    if (key === lastKey) return;
    lastKey = key;
    const schemeChanged = lastScheme !== null && lastScheme !== scheme;
    // A scheme change crossfades; the first apply and every other change,
    // being a hue, a shade, a depth, the highlight, the contrast or the
    // font, land at once as they always have.
    const crossfade = schemeChanged;
    lastScheme = scheme;

    env.transition(() => {
      if (schemeChanged) {
        // Every inline override off first, so the capture below and the
        // derivation after it start from the stylesheet's own bytes.
        for (const token of Object.keys(applied)) env.removeProperty(token);
        applied = {};
      }
      env.setScheme(scheme);
      let base = bases[scheme];
      if (base === undefined) {
        const captured: Record<string, string> = {};
        for (const token of ALL_THEME_TOKENS) {
          captured[token] = env.readBaseValue(token);
        }
        base = captured;
        bases[scheme] = captured;
      }
      capturedBases[scheme] = base;
      capturedScheme = scheme;
      // Feed the custom family store BEFORE fontOverrides resolves the stack,
      // or the tokens are written from the previous family on the broadcast
      // that selected Custom. This ordering is the whole point of the field
      // existing.
      env.setCustomFont(appearance.workAreaFontCustom);

      // Colour first, then the font map on top. They share no key, so the
      // spread is a union rather than a precedence question, and both halves
      // return {} at their defaults.
      // THE FRAME THIS BASE CAN DRAW (Phase 213). The Scheme control writes
      // one field and the two bases offer different regions, so the frame a
      // person is holding on dark is usually one the light base cannot draw:
      // 31 of the 35 pairs dark offers are outside the light region. This
      // brings it to the nearest stop this base does offer and persists
      // nothing, so the base that could draw it brings it back. On dark it
      // is the identity. The sliders read the same answer, so the face never
      // says one frame while the window draws another.
      const frame = frameForBase(appearance, scheme);
      const colour = env.derive({ ...appearance, ...frame }, base, lift);
      const next = {
        ...colour,
        ...fontOverrides(appearance.workAreaFont)
      };
      for (const [token, value] of Object.entries(next)) {
        if (applied[token] !== value) env.setProperty(token, value);
      }
      for (const token of Object.keys(applied)) {
        if (!(token in next)) env.removeProperty(token);
      }
      applied = next;

      // What the terminal and Monaco read, published before the refresh so
      // a pane re-resolving its theme sees the state of this same apply.
      const canvas = colour[CANVAS_TOKEN] ?? base[CANVAS_TOKEN] ?? '';
      env.publish({
        scheme,
        overrides: colour,
        canvas,
        textDark: canvas !== '' && textIsDarkOn(canvas)
      });
      env.refreshTerminals();
      env.setFont(appearance.workAreaFont);
    }, crossfade);
  };
}

// ---------------------------------------------------------------------------
// The captured base, for a surface that previews (Phase 207)
// ---------------------------------------------------------------------------

const capturedBases: Partial<Record<BaseScheme, Readonly<Record<string, string>>>> = {};
let capturedScheme: BaseScheme = 'dark';

/**
 * The shipped value of every covered token of the base IN EFFECT, as the
 * applier captured it from the stylesheet before any write. Null until the
 * first apply on that base. The Appearance section's swatch strip derives
 * from it, so a preview starts from the same base the applier does and
 * never from an override.
 */
export function shippedBaseNow(): Readonly<Record<string, string>> | null {
  return capturedBases[capturedScheme] ?? null;
}

/** The base the applier last put on the root (Phase 213). */
export function schemeNow(): BaseScheme {
  return capturedScheme;
}

// ---------------------------------------------------------------------------
// The synthetic ground, a harness knob (Phase 207)
// ---------------------------------------------------------------------------

/**
 * The OKLCH lightness the whole ramp is lifted by, 0 in every real launch.
 * `build/probe-p207-hue.mjs` sets it through the harness drive so the text
 * flip, which no hue can reach, is driven and read in the real app: the
 * sidebar, the canvas, a terminal and an editor all take the lifted ground
 * and the text follows. No setting, no menu and no bridge call reaches it.
 */
let probeGroundLift = 0;
let liveApply: ((appearance: AppliedAppearance) => void) | null = null;
let lastAppearance: AppliedAppearance | null = null;

export function setProbeGroundLift(lift: number): void {
  probeGroundLift = Number.isFinite(lift) ? lift : 0;
  if (liveApply !== null && lastAppearance !== null) liveApply(lastAppearance);
}

export function probeGroundLiftNow(): number {
  return probeGroundLift;
}

/**
 * Re-resolve the theme of every live terminal so the selection highlight
 * follows the scheme. One assignment per terminal, once per change; xterm
 * repaints on the options write. Exported for the unit test.
 */
export function refreshLiveTerminalThemes(): void {
  const floor = resolveTerminalContrastFloor();
  forEachTerminal((term) => {
    term.options.theme = resolveTerminalTheme();
    // Phase 213: the contrast floor belongs to the light theme alone, and
    // it is live the same way the theme is (research 80 section 1.3).
    if (term.options.minimumContrastRatio !== floor) {
      term.options.minimumContrastRatio = floor;
    }
  });
}

/**
 * The five appearance fields out of the full settings shape.
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
    chromeShade: sanitizeChromeShade(settings.chromeShade),
    chromeDepth: sanitizeChromeDepth(settings.chromeDepth),
    workAreaFontCustom: sanitizeWorkAreaFontCustom(settings.workAreaFontCustom),
    workAreaFont: sanitizeWorkAreaFont(settings.workAreaFont),
    colorScheme: sanitizeColorScheme(settings.colorScheme)
  };
}

/** The one attribute the light base is keyed on, in tokens.css and index.html. */
export const SCHEME_ATTRIBUTE = 'data-scheme';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** `document.startViewTransition`, typed for a lib that may not carry it. */
type ViewTransitionStarter = (update: () => void) => { finished: Promise<void> };

function viewTransitionStarter(): ViewTransitionStarter | null {
  const doc = document as Document & { startViewTransition?: ViewTransitionStarter };
  return typeof doc.startViewTransition === 'function'
    ? doc.startViewTransition.bind(doc)
    : null;
}

function browserEnv(): AppearanceEnv {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return {
    readBaseValue: (token) => styles.getPropertyValue(token).trim(),
    setProperty: (token, value) => root.style.setProperty(token, value),
    removeProperty: (token) => root.style.removeProperty(token),
    setCustomFont: setCustomWorkFontFamily,
    publish: publishChromeTheme,
    groundLift: probeGroundLiftNow,
    refreshTerminals: refreshLiveTerminalThemes,
    setFont: setWorkAreaFont,
    derive: deriveOverrides,
    systemPrefersDark: () => window.matchMedia(DARK_QUERY).matches,
    setScheme: (scheme) => {
      if (scheme === 'light') root.setAttribute(SCHEME_ATTRIBUTE, 'light');
      else root.removeAttribute(SCHEME_ATTRIBUTE);
    },
    transition: (commit, crossfade) => {
      // THE CROSSFADE IS THE PLATFORM'S OWN STILL (Phase 213). A view
      // transition snapshots the document as painted, canvases and shadow
      // roots included, runs the update as one task, and fades the old
      // snapshot over the new frame for the duration tokens.css sets on the
      // root's transition pseudo elements. It costs one snapshot and nothing
      // crosses a bridge. Reduced motion asks for no motion, so it gets the
      // one frame switch research 80 section 6 measured, and the same media
      // query in tokens.css stops the pseudo elements animating besides.
      const start = viewTransitionStarter();
      if (!crossfade || start === null || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        commit();
        return;
      }
      try {
        start(commit);
      } catch {
        commit();
      }
    }
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

  const inner = createAppearanceApplier(browserEnv());
  const apply = (appearance: AppliedAppearance): void => {
    lastAppearance = appearance;
    inner(appearance);
  };
  liveApply = apply;
  void bridge
    .settingsGet()
    .then((settings) => apply(toAppearance(settings)))
    .catch(() => {
      // An unanswerable read keeps the shipped colors; the next broadcast
      // reconciles.
    });
  bridge.onSettingsChanged?.((settings) => apply(toAppearance(settings)));
  // MATCH THE MAC (Phase 213). Under 'system' the base is the Mac's, and the
  // Mac changes at sunset. The media query fires on the next read after
  // nativeTheme moves (8 ms, research 80 section 4); the applier's key
  // carries the resolved base, so a change under any other scheme is a
  // no-op here and the compositor fill main keeps moves in the same breath.
  const dark = window.matchMedia(DARK_QUERY);
  dark.addEventListener('change', () => {
    if (lastAppearance !== null) apply(lastAppearance);
  });
}
