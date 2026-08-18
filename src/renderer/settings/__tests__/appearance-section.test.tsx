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
  CONTRAST_OPTIONS,
  SCHEME_OPTIONS,
  WORK_FONT_OPTIONS,
  selectContrastLevel,
  selectHighlightScheme,
  selectWorkAreaFont
} from '../AppearanceSection';
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

  it('renders the section title and all three group labels', () => {
    expect(html).toContain('Appearance');
    expect(html).toContain('Highlight');
    expect(html).toContain('Contrast');
    expect(html).toContain('Font');
  });

  it('puts the Font group directly after the Contrast group', () => {
    const at = (label: string): number =>
      html.indexOf(`<div class="set-group-label">${label}</div>`);
    expect(at('Highlight')).toBeGreaterThan(-1);
    expect(at('Contrast')).toBeGreaterThan(at('Highlight'));
    expect(at('Font')).toBeGreaterThan(at('Contrast'));
    // Nothing else is a group, so "after Contrast" is also "last".
    expect(html.split('class="set-group-label"')).toHaveLength(4);
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

  it('renders the font select with the three presets in order', () => {
    expect(html).toContain('aria-label="Terminal and editor font"');
    const labels = WORK_FONT_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(['System', 'JetBrains Mono', 'Source Code Pro']);
    expect(WORK_FONT_OPTIONS.map((o) => o.value)).toEqual([
      'system',
      'jetbrains-mono',
      'source-code-pro'
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
      'Text inside the terminal keeps its shipped colors. So do diff views ' +
        'and the file tree. The terminal selection highlight follows the ' +
        'highlight scheme.'
    );
  });

  it('carries the four exact font sentences', () => {
    expect(html).toContain(
      'The face the terminal and the editor draw with. System is Menlo, ' +
        'which is already on your Mac. The sidebar and the rest of the app ' +
        'keep the system interface font. Changes apply at once.'
    );
    expect(html).toContain(
      'Size is not set here. Use ⌘+ and ⌘- to change the size of the area ' +
        'you are working in.'
    );
    expect(html).toContain(
      'Source Code Pro is missing three of the marks agents print. The ' +
        'first is the cross at U+2717. The second is the arrow at U+279C. ' +
        'The third is the warning at U+26A0. Menlo draws each one instead, ' +
        '12.5 percent taller than the letters beside it. The column grid ' +
        'does not move.'
    );
    expect(html).toContain(
      'Agent spinners are drawn from Apple Braille under all three options. ' +
        'No monospace font on this Mac has those marks, so nothing here ' +
        'changes them.'
    );
  });
});

describe('the picks', () => {
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
});
