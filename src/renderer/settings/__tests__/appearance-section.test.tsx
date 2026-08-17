/**
 * Phase 62 — Settings → Appearance.
 *
 * What these tests hold:
 * - Both selects render, with the spec's exact option labels in the spec's
 *   order and the spec's aria-labels.
 * - Every user-facing sentence on the section is the spec's exact string.
 * - A pick persists a ONE-FIELD patch through the settings bridge, and the
 *   stored value afterward is the selected value.
 *
 * The vitest environment is node, so the markup assertions read static
 * markup from react-dom/server, and the change handlers are exercised
 * directly (selectHighlightScheme / selectContrastLevel are the functions
 * the selects' onChange calls).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GmuxSettings, GmuxSettingsPatch } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  AppearanceSection,
  CONTRAST_OPTIONS,
  SCHEME_OPTIONS,
  selectContrastLevel,
  selectHighlightScheme
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

  it('renders the section title and both group labels', () => {
    expect(html).toContain('Appearance');
    expect(html).toContain('Highlight');
    expect(html).toContain('Contrast');
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
});
