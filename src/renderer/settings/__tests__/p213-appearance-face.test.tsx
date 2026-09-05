/**
 * Phase 213 fix round, finding 1: THE APPEARANCE FACE FOLLOWS THE BASE THE
 * WINDOW DRAWS, and it follows it on the ordinary in-session switch.
 *
 * The defect, reproduced here before it was fixed. `apply.ts` publishes the
 * captured base and the scheme INSIDE the commit it hands to `env.transition`,
 * and on a scheme change the real env runs that commit through
 * `document.startViewTransition`, which defers it past React's synchronous
 * re-render on the same settings broadcast. The section read those two values
 * as module level getters, which are not reactive, so nothing re-rendered
 * afterwards: a person holding shade -2 on dark who chose Light got a window
 * on paper at the shipped stop and a face still reading -2, the dark end's
 * refusal sentence and five near black bands drawn on a light card.
 *
 * The fix is that the face reads the SCHEME from the chrome theme store,
 * which is published in that same commit and is reactive, and reads the base
 * FOR THAT SCHEME rather than for whichever the applier captured last. This
 * file pins the property that follows: with the applier's captured scheme
 * left on dark, moving the store alone moves the whole face. Ablating either
 * half of the fix turns the three assertions below red.
 *
 * The vitest environment is node, so the markup is read from
 * react-dom/server, which is enough here because every value on the face is
 * a pure function of the two stores; the interactive half, being that the
 * publish really re-renders the Settings window during a crossfade, is
 * driven in the real app by `npm run probe:p213` launch D.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppearanceSection, frameFace } from '../AppearanceSection';
import {
  createAppearanceApplier,
  shippedBaseFor,
  type AppearanceEnv,
  type AppliedAppearance
} from '../../theme/apply';
import { publishChromeTheme, useChromeTheme } from '../../theme/chrome-theme';
import { deriveOverrides } from '../../theme/derive';

/** The canvas of each base, which is how the two are told apart below. */
const DARK_BASE = '#131417';
const LIGHT_BASE = '#f5f7fa';

/**
 * The two bases as the stylesheet computes them: the first `:root` block is
 * the dark one, and the light block is an OVERLAY on it, exactly as the
 * cascade resolves it in a window carrying `data-scheme='light'`. Read from
 * the shipped tokens.css so the floor predicate and the derivation answer
 * here what they answer in the app.
 */
function shippedBases(): { dark: Map<string, string>; light: Map<string, string> } {
  const css = readFileSync(
    new URL('../../styles/tokens.css', import.meta.url),
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  const blockAt = (head: string): string => {
    const start = css.indexOf(head);
    if (start === -1) throw new Error(`tokens.css has no ${head}`);
    const close = css.indexOf('\n}', start);
    return css.slice(start + head.length, close);
  };
  const read = (text: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const match of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [, name, value] = match;
      if (name !== undefined && value !== undefined) out.set(name, value.trim());
    }
    return out;
  };
  const dark = read(blockAt(':root {'));
  const light = new Map(dark);
  for (const [name, value] of read(blockAt(":root[data-scheme='light'] {"))) {
    light.set(name, value);
  }
  return { dark, light };
}

const BASES = shippedBases();

/**
 * Capture both bases through the SHIPPING applier, exactly as a real session
 * does, and leave its captured scheme on DARK. Everything after this reads a
 * face whose only news is the store.
 */
function captureBothBases(): void {
  let scheme: 'dark' | 'light' = 'dark';
  const env: AppearanceEnv = {
    readBaseValue: (token) => (scheme === 'light' ? BASES.light : BASES.dark).get(token) ?? '',
    setProperty: () => {},
    removeProperty: () => {},
    refreshTerminals: () => {},
    setFont: () => {},
    setCustomFont: () => {},
    publish: () => {},
    groundLift: () => 0,
    derive: deriveOverrides,
    systemPrefersDark: () => true,
    setScheme: (next) => {
      scheme = next;
    },
    transition: (commit) => {
      commit();
    }
  };
  const apply = createAppearanceApplier(env);
  const held: AppliedAppearance = {
    highlightScheme: 'blue',
    contrastLevel: 'normal',
    chromeHue: 222,
    chromeShade: 0,
    chromeDepth: 0,
    workAreaFont: 'system',
    workAreaFontCustom: '',
    colorScheme: 'dark'
  };
  apply(held);
  apply({ ...held, colorScheme: 'light' });
  apply(held);
}

function face(scheme: 'dark' | 'light'): string {
  publishChromeTheme({
    scheme,
    overrides: {},
    canvas: scheme === 'light' ? LIGHT_BASE : DARK_BASE,
    textDark: scheme === 'light'
  });
  return renderToStaticMarkup(<AppearanceSection />);
}

afterEach(() => {
  publishChromeTheme({ scheme: 'dark', overrides: {}, canvas: DARK_BASE, textDark: false });
  useChromeTheme.setState({ scheme: 'dark' });
});

describe('the Appearance face on an in-session switch (Phase 213 finding 1)', () => {
  it('draws the sentence and the bands of the base the store says is drawn', () => {
    captureBothBases();

    // On dark the shipped frame sits inside the region with room on both
    // sides, so the line the face carries is the LIGHT end's, and the five
    // bands are the dark base's own bytes.
    const dark = face('dark');
    expect(dark).toContain('aria-label="Shade"');
    expect(dark).toContain('Lighter puts the file colors under their contrast floor.');
    expect(dark).toContain(DARK_BASE);
    expect(dark).not.toContain(LIGHT_BASE);

    // On paper the shade row is one cell wide, so PHASE 214 does not draw it
    // at all and its sentence goes with it: paper carries one shade and there
    // is nothing to refuse. Depth still moves there, so its row stays and
    // says its own reason, and every band comes from the light base.
    // Nothing but the store moved between these two renders.
    const light = face('light');
    expect(light).not.toContain('aria-label="Shade"');
    expect(light).not.toContain('Darker puts the accent under its contrast floor.');
    expect(light).toContain('aria-label="Depth"');
    expect(light).not.toContain('Lighter puts the file colors under their contrast floor.');
    expect(light).toContain(LIGHT_BASE);
    expect(light).not.toContain(DARK_BASE);

    // And back, byte for byte.
    expect(face('dark')).toBe(dark);
  });

  it('shows a carried frame at the stop the base it moved to actually draws', () => {
    // The operator's own path: shade -2 at depth 0 is one of the 35 pairs
    // the dark base offers and one of the 31 that paper cannot draw. The
    // window draws the shipped stop, and so must every part of the face.
    const settings = { highlightScheme: 'blue' as const, contrastLevel: 'normal' as const };
    const carried = { chromeHue: 222, chromeShade: -2, chromeDepth: 0 };
    captureBothBases();

    const onDark = frameFace('dark', settings, shippedBaseFor('dark'), carried);
    expect([onDark.held.chromeShade, onDark.held.chromeDepth]).toEqual([-2, 0]);
    expect(onDark.swatches?.['--bg-canvas']).not.toBe(LIGHT_BASE);

    const onPaper = frameFace('light', settings, shippedBaseFor('light'), carried);
    expect([onPaper.held.chromeShade, onPaper.held.chromeDepth]).toEqual([0, 0]);
    expect(onPaper.shade).toEqual({ min: 0, max: 0, belowElsewhere: false, aboveElsewhere: false });
    // PHASE 214. One stop is not a control, so the row is not drawn and it
    // carries no sentence. Depth still has four stops and still speaks.
    expect(onPaper.shadeMoves).toBe(false);
    expect(onPaper.shadeNote).toBe('');
    expect(onPaper.depthMoves).toBe(true);
    expect(onPaper.depthNote).not.toBe('');
    expect(onDark.shadeMoves).toBe(true);
    expect(onDark.depthMoves).toBe(true);
    // The strip is the light base at its shipped stop, which derives nothing.
    expect(onPaper.swatches?.['--bg-canvas']).toBe(LIGHT_BASE);
    expect(onPaper.atDefault).toBe(true);
  });
});
