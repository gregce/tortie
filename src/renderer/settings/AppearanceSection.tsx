/**
 * Phase 62 — Settings → Appearance: two controls and nothing else. One picks
 * the highlight scheme from four presets, one picks the contrast step.
 * Both write one-field patches through the settings store; the broadcast
 * applies them in every window at once (src/renderer/theme/apply.ts), so the
 * live window is the preview and there is no Save.
 *
 * The section uses the existing settings vocabulary only. The option labels
 * are the spec's exact strings; the values are the persisted union members
 * from @shared/settings.
 */

import React from 'react';
import type {
  ContrastLevel,
  GmuxSettings,
  HighlightScheme
} from '@shared/settings';
import { SCHEME_PRESETS } from '../theme/presets';
import { useSettingsStore } from './settings-store';

/**
 * The four schemes, in UI order. Blue is the shipped default. The list and
 * its labels come from the preset data so the select can never drift from
 * what the derivation actually implements.
 */
export const SCHEME_OPTIONS: { value: HighlightScheme; label: string }[] =
  SCHEME_PRESETS.map((p) => ({ value: p.id, label: p.label }));

/** The three contrast steps, in UI order. Normal is the shipped default. */
export const CONTRAST_OPTIONS: { value: ContrastLevel; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'raised', label: 'Raised' },
  { value: 'high', label: 'High' }
];

/**
 * Persist a scheme pick as a one-field patch. Exported for the unit test,
 * which cannot fire a change event on server-rendered markup.
 */
export function selectHighlightScheme(
  value: string
): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ highlightScheme: value as HighlightScheme });
}

/** Persist a contrast pick as a one-field patch. Exported for the test. */
export function selectContrastLevel(
  value: string
): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ contrastLevel: value as ContrastLevel });
}

function HighlightSchemeRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Highlight scheme</span>
        <span className="set-row-caption">
          The color of selection and focus highlights. Blue is the shipped
          color. Changes apply at once.
        </span>
      </div>
      <select
        className="set-select"
        aria-label="Highlight scheme"
        value={settings.highlightScheme}
        onChange={(e) => {
          void selectHighlightScheme(e.target.value);
        }}
      >
        {SCHEME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ContrastRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Contrast</span>
        <span className="set-row-caption">
          Raised and High spread the colors of panels and text further apart,
          which helps on a dim display. Normal keeps the shipped colors.
        </span>
      </div>
      <select
        className="set-select"
        aria-label="Contrast"
        value={settings.contrastLevel}
        onChange={(e) => {
          void selectContrastLevel(e.target.value);
        }}
      >
        {CONTRAST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AppearanceSection(): React.JSX.Element {
  return (
    <section aria-label="Appearance">
      <h1 className="set-title">Appearance</h1>

      <div className="set-group-label">Highlight</div>
      <div className="set-card">
        <HighlightSchemeRow />
      </div>

      <div className="set-group-label">Contrast</div>
      <div className="set-card">
        <ContrastRow />
        {/* The recorded limits, on the card where the user is looking. */}
        <div className="set-row">
          <div className="set-row-text">
            <span className="set-row-caption">
              Text inside the terminal keeps its shipped colors. So do diff
              views and the file tree. The terminal selection highlight
              follows the highlight scheme.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
