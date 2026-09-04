/**
 * Phase 62, Settings → Appearance, plus the Phase 78 font row.
 *
 * What these tests hold:
 * - All three selects render, with the spec's exact option labels in the
 *   spec's order and the spec's aria-labels.
 * - Every user-facing sentence on the section is the spec's exact string.
 * - The Font group sits after the Contrast group, which is where the phase
 *   spec put it.
 * - A pick persists a ONE-FIELD patch through the settings bridge, and the
 *   stored value afterward is the selected value.
 * - The section offers no size control, which is the withdrawal at
 *   docs/DESIGN-SPEC.md:601 held by a test rather than by a promise.
 *
 * The vitest environment is node, so the markup assertions read static
 * markup from react-dom/server, and the change handlers are exercised
 * directly (selectHighlightScheme / selectContrastLevel / selectWorkAreaFont
 * are the functions the selects' onChange calls).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GmuxSettings, GmuxSettingsPatch } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  AppearanceSection,
  COLOR_SCHEME_OPTIONS,
  CONTRAST_OPTIONS,
  SCHEME_OPTIONS,
  WORK_FONT_OPTIONS,
  hueSwatches,
  resetChromeFrame,
  selectChromeDepth,
  selectChromeHue,
  selectChromeShade,
  selectColorScheme,
  selectContrastLevel,
  selectHighlightScheme,
  selectWorkAreaFont,
  commitWorkAreaFontCustom
} from '../AppearanceSection';
import { FRAME_COLORS } from '../../theme/presets';
import { useSettingsStore } from '../settings-store';

/** A fake settings bridge that answers set with the merged settings. */
function installBridge(): ReturnType<typeof vi.fn> {
  const settingsSet = vi.fn(
    async (patch: GmuxSettingsPatch): Promise<GmuxSettings> => ({
      ...defaultGmuxSettings(),
      ...patch
    })
  );
  (globalThis as { window?: unknown }).window = {
    gmux: { settingsSet }
  };
  return settingsSet;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  useSettingsStore.setState({ settings: defaultGmuxSettings() });
});

describe('the markup', () => {
  const html = renderToStaticMarkup(<AppearanceSection />);

  it('renders the section title and all four group labels', () => {
    expect(html).toContain('Appearance');
    expect(html).toContain('Highlight');
    expect(html).toContain('Frame');
    expect(html).toContain('Contrast');
    expect(html).toContain('Font');
  });

  it('puts Scheme first, the Frame group between Highlight and Contrast, and Font last', () => {
    const at = (label: string): number =>
      html.indexOf(`<div class="set-group-label">${label}</div>`);
    expect(at('Scheme')).toBeGreaterThan(-1);
    expect(at('Highlight')).toBeGreaterThan(at('Scheme'));
    expect(at('Frame')).toBeGreaterThan(at('Highlight'));
    expect(at('Contrast')).toBeGreaterThan(at('Frame'));
    expect(at('Font')).toBeGreaterThan(at('Contrast'));
    // Nothing else is a group, so "after Contrast" is also "last".
    expect(html.split('class="set-group-label"')).toHaveLength(6);
  });

  it('renders the Scheme control as three names with Dark pressed (Phase 213)', () => {
    expect(html).toContain('role="radiogroup" aria-label="Scheme"');
    expect(COLOR_SCHEME_OPTIONS.map((o) => o.label)).toEqual(['Light', 'Dark', 'Match the Mac']);
    expect(COLOR_SCHEME_OPTIONS.map((o) => o.value)).toEqual(['light', 'dark', 'system']);
    let at = -1;
    for (const o of COLOR_SCHEME_OPTIONS) {
      const next = html.indexOf(`aria-label="${o.label}"`);
      expect(next).toBeGreaterThan(at);
      at = next;
      // The words live on the hover title, not the face.
      expect(html).toContain(`title="${o.title}"`);
    }
    expect(html).toContain('aria-checked="true" aria-label="Dark"');
    expect(html).toContain('aria-checked="false" aria-label="Light"');
    expect(html).toContain('aria-checked="false" aria-label="Match the Mac"');
    // Just enough words: one label, one caption, no paragraph.
    expect(html).toContain('Light, dark, or whatever the Mac is set to. Changes apply at once.');
    expect(html).not.toContain('paper ground');
  });

  it('names the eight starting colors and draws NO degree (Phase 210)', () => {
    // The operator's second sentence: 222 named a position on a wheel nobody
    // is looking at. The row shows the frames themselves, by name.
    expect(html).toContain('aria-label="Frame color"');
    for (const colour of FRAME_COLORS) {
      expect(html).toContain(`aria-label="${colour.label}"`);
    }
    expect(FRAME_COLORS[0]).toEqual({ hue: 222, label: 'Graphite' });
    // The shipped frame leads the row and is the one selected at the default.
    expect(html).toContain('aria-checked="true" aria-label="Graphite"');
    // THE DEGREE IS OFF THE RESTING FACE. It survives on the hover title and
    // in the persisted setting, and nowhere a person reads without asking.
    expect(html).not.toContain('222°');
    expect(html).not.toMatch(/>\s*\d+°/);
    expect(html).toContain('title="Graphite, hue 222"');
    // Five bands in ramp order, the sidebar first, drawn from the live tokens
    // before any base is captured.
    const swatches = [...html.matchAll(/data-token="(--[a-z-]+)"/g)].map((m) => m[1]);
    expect(swatches).toEqual(['--bg-sidebar', '--bg-canvas', '--bg-surface', '--bg-raised', '--bg-active']);
    expect(html).toContain('background:var(--bg-sidebar)');
    // The reset holds its place and says nothing at the default.
    expect(html).toContain('class="set-hue-reset blank"');
    // Just enough words: one label, one caption, and no explanation of
    // colour spaces or thresholds on the resting face.
    expect(html).not.toContain('OKLCH');
    expect(html).not.toContain('threshold');
  });

  it('renders the two stop sliders at the shipped ramp (Phase 210)', () => {
    expect(html).toContain('aria-label="Shade"');
    expect(html).toContain('aria-label="Depth"');
    expect(html).toMatch(/aria-label="Shade"[^>]*min="-4"[^>]*max="2"[^>]*step="1"[^>]*value="0"/);
    expect(html).toMatch(/aria-label="Depth"[^>]*min="-3"[^>]*max="3"[^>]*step="1"[^>]*value="0"/);
    // The refusal line holds its place and says nothing while nothing is
    // refused, so the card cannot jump under the pointer (Phase 174.1).
    expect(html.split('class="set-frame-note blank"')).toHaveLength(3);
  });

  it('renders the highlight select with the four schemes in order', () => {
    expect(html).toContain('aria-label="Highlight scheme"');
    const labels = SCHEME_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(['Blue', 'Teal', 'Purple', 'Slate']);
    expect(SCHEME_OPTIONS.map((o) => o.value)).toEqual([
      'blue',
      'teal',
      'purple',
      'slate'
    ]);
    let at = -1;
    for (const label of labels) {
      const next = html.indexOf(`>${label}</option>`);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });

  it('renders the contrast select with the three steps in order', () => {
    expect(html).toContain('aria-label="Contrast"');
    const labels = CONTRAST_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(['Normal', 'Raised', 'High']);
    expect(CONTRAST_OPTIONS.map((o) => o.value)).toEqual([
      'normal',
      'raised',
      'high'
    ]);
    let at = -1;
    for (const label of labels) {
      const next = html.indexOf(`>${label}</option>`);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });

  it('renders the font select with the four presets in order', () => {
    expect(html).toContain('aria-label="Terminal and editor font"');
    const labels = WORK_FONT_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(['System', 'JetBrains Mono', 'Source Code Pro', 'Custom…']);
    expect(WORK_FONT_OPTIONS.map((o) => o.value)).toEqual([
      'system',
      'jetbrains-mono',
      'source-code-pro',
      'custom'
    ]);
    let at = -1;
    for (const label of labels) {
      const next = html.indexOf(`>${label}</option>`);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });

  it('offers no size control, per the withdrawal at DESIGN-SPEC 601', () => {
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain('set-stepper');
    expect(html.toLowerCase()).not.toContain('font size');
  });

  it('carries the spec&apos;s exact captions', () => {
    expect(html).toContain(
      'The color of selection and focus highlights. Blue is the shipped ' +
        'color. Changes apply at once.'
    );
    expect(html).toContain(
      'Raised and High spread the colors of panels and text further apart, ' +
        'which helps on a dim display. Normal keeps the shipped colors.'
    );
    expect(html).toContain(
      'Text inside the terminal keeps its shipped colors for the scheme. ' +
        'The terminal selection highlight follows the highlight scheme.'
    );
    expect(html).toContain(
      'The color of the sidebar, the tabs and the panels around your work. ' +
        'Changes apply at once.'
    );
  });

  it('carries the two exact font sentences', () => {
    expect(html).toContain(
      'The face the terminal and the editor draw with. System is Menlo, ' +
        'which is already on your Mac. The sidebar and the rest of the app ' +
        'keep the system interface font. Changes apply at once.'
    );
    expect(html).toContain(
      'Size is not set here. Use ⌘+ and ⌘- to change the size of the area ' +
        'you are working in.'
    );
  });

  it('carries neither font measurement, which moved to research 57', () => {
    // Phase 87 moved the Source Code Pro note and the Apple Braille note to
    // docs/research/57-terminal-font-glyph-coverage.md, verbatim. Neither
    // says anything a person acts on while picking a face, and a later round
    // must not put them back on the dropdown.
    expect(html).not.toContain('U+2717');
    expect(html).not.toContain('U+279C');
    expect(html).not.toContain('U+26A0');
    expect(html).not.toContain('Apple Braille');
    expect(html).not.toContain('12.5 percent');
  });
});

describe('the picks', () => {
  it('a colour scheme pick persists a one-field patch and garbage reads as dark (Phase 213)', async () => {
    const settingsSet = installBridge();
    await selectColorScheme('light');
    expect(settingsSet).toHaveBeenCalledTimes(1);
    expect(settingsSet.mock.calls[0]?.[0]).toEqual({ colorScheme: 'light' });
    expect(useSettingsStore.getState().settings.colorScheme).toBe('light');
    await selectColorScheme('paper');
    expect(settingsSet.mock.calls[1]?.[0]).toEqual({ colorScheme: 'dark' });
  });

  it('a scheme pick persists a one-field patch and the stored value follows', async () => {
    const settingsSet = installBridge();
    await selectHighlightScheme('teal');
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ highlightScheme: 'teal' });
    expect(Object.keys(patch)).toEqual(['highlightScheme']);
    expect(useSettingsStore.getState().settings.highlightScheme).toBe('teal');
  });

  it('a contrast pick persists a one-field patch and the stored value follows', async () => {
    const settingsSet = installBridge();
    await selectContrastLevel('high');
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ contrastLevel: 'high' });
    expect(Object.keys(patch)).toEqual(['contrastLevel']);
    expect(useSettingsStore.getState().settings.contrastLevel).toBe('high');
  });

  it('a hue pick persists a one-field whole degree patch (Phase 207)', async () => {
    const settingsSet = installBridge();
    await selectChromeHue(40);
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ chromeHue: 40 });
    expect(Object.keys(patch)).toEqual(['chromeHue']);
    expect(useSettingsStore.getState().settings.chromeHue).toBe(40);
    // The wrap and the rounding happen before the patch leaves.
    await selectChromeHue(360.4);
    expect(settingsSet.mock.calls[1]?.[0]).toEqual({ chromeHue: 0 });
    await selectChromeHue(-1);
    expect(settingsSet.mock.calls[2]?.[0]).toEqual({ chromeHue: 359 });
  });

  it('the swatch strip draws nothing until a base is captured, then the composed frame', () => {
    expect(hueSwatches({ highlightScheme: 'blue', contrastLevel: 'normal' }, 40)).toBeNull();
    expect(
      hueSwatches({ highlightScheme: 'blue', contrastLevel: 'normal' }, 40, 2, 1)
    ).toBeNull();
  });

  it('a shade and a depth pick each persist ONE clamped whole stop (Phase 210)', async () => {
    const settingsSet = installBridge();
    await selectChromeShade(-2);
    expect(settingsSet.mock.calls[0]?.[0]).toEqual({ chromeShade: -2 });
    expect(useSettingsStore.getState().settings.chromeShade).toBe(-2);
    await selectChromeDepth(3);
    expect(settingsSet.mock.calls[1]?.[0]).toEqual({ chromeDepth: 3 });
    // The ends CLAMP rather than wrap, unlike the hue, because the ends of
    // these axes are where the ramp stops working.
    await selectChromeShade(99);
    expect(settingsSet.mock.calls[2]?.[0]).toEqual({ chromeShade: 2 });
    await selectChromeDepth(-99);
    expect(settingsSet.mock.calls[3]?.[0]).toEqual({ chromeDepth: -3 });
    await selectChromeShade(Number.NaN);
    expect(settingsSet.mock.calls[4]?.[0]).toEqual({ chromeShade: 0 });
  });

  it('Reset puts all three frame fields back in one patch (Phase 210)', async () => {
    const settingsSet = installBridge();
    await resetChromeFrame();
    expect(settingsSet.mock.calls[0]?.[0]).toEqual({
      chromeHue: 222,
      chromeShade: 0,
      chromeDepth: 0
    });
  });

  it('a font pick persists a one-field patch and the stored value follows', async () => {
    const settingsSet = installBridge();
    await selectWorkAreaFont('jetbrains-mono');
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ workAreaFont: 'jetbrains-mono' });
    expect(Object.keys(patch)).toEqual(['workAreaFont']);
    expect(useSettingsStore.getState().settings.workAreaFont).toBe(
      'jetbrains-mono'
    );
  });

  it('returning to System persists system, which writes no override', async () => {
    const settingsSet = installBridge();
    await selectWorkAreaFont('source-code-pro');
    await selectWorkAreaFont('system');
    expect(settingsSet).toHaveBeenCalledTimes(2);
    expect(settingsSet.mock.calls[1]?.[0]).toEqual({ workAreaFont: 'system' });
    expect(useSettingsStore.getState().settings.workAreaFont).toBe('system');
  });

  it('a custom family commit persists a one-field patch', async () => {
    const settingsSet = installBridge();
    await commitWorkAreaFontCustom('Berkeley Mono');
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ workAreaFontCustom: 'Berkeley Mono' });
    expect(Object.keys(patch)).toEqual(['workAreaFontCustom']);
    expect(useSettingsStore.getState().settings.workAreaFontCustom).toBe(
      'Berkeley Mono'
    );
  });

  it('renders no custom family field at the default (system) install', () => {
    // The field is conditional on the persisted id, so a default install's
    // markup carries no input for it. (The positive half — the field appears
    // under 'custom' — needs a CLIENT render to prove, because
    // renderToStaticMarkup caches the store's server snapshot per pass and a
    // setState between two SSR renders does not re-read it. The interactive
    // reactivity is covered by driving the real app, not by this file.)
    useSettingsStore.setState({
      settings: { ...defaultGmuxSettings(), workAreaFont: 'system' }
    });
    expect(renderToStaticMarkup(<AppearanceSection />)).not.toContain(
      'aria-label="Custom font family"'
    );
  });
});
