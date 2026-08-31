/**
 * Phase 62 — Settings → Appearance: two controls and nothing else. One picks
 * the highlight scheme from four presets, one picks the contrast step.
 * Both write one-field patches through the settings store; the broadcast
 * applies them in every window at once (src/renderer/theme/apply.ts), so the
 * live window is the preview and there is no Save.
 *
 * Phase 78 added a third control in the same shape. It picks the face the
 * terminal and the editor draw with, from three presets. It writes the same
 * kind of one-field patch and the same applier reads it. It sets no size.
 * The size stepper stays withdrawn (docs/DESIGN-SPEC.md:601) because
 * per-region zoom already changes the terminal's size for real.
 *
 * Phase 174 added the Custom face, a typed family with one status line under
 * it. Phase 174.1 answered the two things the operator reported about that
 * field: it jumped upward the moment the status line appeared while he was
 * typing in it, and it suggested nothing, so he could not tell what his Mac
 * has. The line is now reserved whether or not it speaks, and the field offers
 * the installed families (src/renderer/theme/installed-fonts.ts).
 *
 * That phase's fix round joined the two. The line's answer now READS THE SAME
 * LIST the field suggests from, so the product can no longer offer a family and
 * then say that family is not installed. It did, for two of the operator's own
 * fonts, because the line was measured by drawing a Latin sample and an icon
 * font has no Latin glyph to draw.
 *
 * The section uses the existing settings vocabulary only. The option labels
 * are the spec's exact strings; the values are the persisted union members
 * from @shared/settings.
 */

import React from 'react';
import { keyDisplay } from '@shared/keymap';
import type {
  ContrastLevel,
  GmuxSettings,
  HighlightScheme,
  WorkAreaFont
} from '@shared/settings';
import { SCHEME_PRESETS } from '../theme/presets';
import {
  NO_FONT_SUGGESTIONS,
  loadFontSuggestions,
  type FontSuggestions
} from '../theme/installed-fonts';
import { WORK_FONTS, isWorkFontAvailable } from '../theme/work-fonts';
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
 * The three font presets, in UI order. System is the shipped default and
 * writes no token override. The list and its labels come from the preset
 * data in src/renderer/theme/work-fonts.ts, so the select can never offer a
 * face the applier does not implement.
 */
export const WORK_FONT_OPTIONS: { value: WorkAreaFont; label: string }[] =
  WORK_FONTS.map((f) => ({ value: f.id, label: f.label }));

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

/** Persist a font pick as a one-field patch. Exported for the test. */
export function selectWorkAreaFont(
  value: string
): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ workAreaFont: value as WorkAreaFont });
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

/** Persist the custom family as a one-field patch. Exported for the test. */
export function commitWorkAreaFontCustom(
  family: string
): Promise<GmuxSettings | null> {
  return useSettingsStore.getState().update({ workAreaFontCustom: family });
}

/**
 * The datalist the custom field reads. One id, because there is one field.
 */
const FONT_SUGGESTION_LIST_ID = 'set-font-installed';

/**
 * The installed families, as suggestions. Monospace leads, because a
 * proportional face in a terminal is a footgun. The rest follow rather than
 * being hidden: he asked to see what he has. A datalist renders no box, so this
 * element sits inside the stack without touching its layout.
 *
 * Exported so the node lane can pin it. It takes its list as a prop and reads
 * no store, which is what makes it renderable there at all: zustand serves the
 * INITIAL state to a server render, so a store the test sets is invisible to
 * `renderToStaticMarkup`.
 */
export function FontSuggestionList({
  suggestions
}: {
  suggestions: FontSuggestions;
}): React.JSX.Element {
  return (
    <datalist id={FONT_SUGGESTION_LIST_ID}>
      {suggestions.monospace.map((family) => (
        <option key={`m:${family}`} value={family} />
      ))}
      {suggestions.proportional.map((family) => (
        <option key={`p:${family}`} value={family} />
      ))}
    </datalist>
  );
}

/**
 * The one status line under the field.
 *
 * IT IS ALWAYS IN LAYOUT (Phase 174.1). It used to be rendered only when it had
 * something to say, which grew the bottom anchored column the moment it
 * appeared and shoved the field UP while the person was typing in it. That is
 * the defect the operator reported with a screenshot. It now holds its line
 * whatever it has to say and is hidden by `visibility` in
 * src/renderer/settings/settings.css, never by `display`, so the field's box is
 * identical before and during typing. A later round that tidies the rule back
 * to `display: none` brings his defect back with every gate green, which is why
 * both halves of this are pinned in the suite.
 *
 * Exported for the test, same reason as the list above.
 */
export function FontMissingNote({
  missing
}: {
  missing: boolean;
}): React.JSX.Element {
  return (
    <span
      className={missing ? 'set-font-missing' : 'set-font-missing blank'}
      aria-hidden={missing ? undefined : true}
    >
      not installed on this Mac
    </span>
  );
}

function WorkAreaFontRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const isCustom = settings.workAreaFont === 'custom';
  // Local draft for the custom field, committed on blur/Enter — the same
  // pattern ScrollbackSection's Custom… number field uses, so a half-typed
  // family never reaches the persisted settings.
  const [draft, setDraft] = React.useState(settings.workAreaFontCustom);
  // Keep the field showing the persisted (and cleaned) family after a commit,
  // the same resync ScrollbackSection's Custom… field does. This never fights
  // typing, because the persisted value only changes on blur/Enter.
  React.useEffect(() => {
    setDraft(settings.workAreaFontCustom);
  }, [settings.workAreaFontCustom]);
  const commit = (): void => {
    void commitWorkAreaFontCustom(draft);
  };
  // MEASURED in this Electron: the platform refuses to name the installed
  // families on a hidden or occluded page, rejecting with "SecurityError: Page
  // needs to be visible.", and a Settings window that opened behind the
  // terminal stayed hidden for 25 s. Both reads below depend on that answer, so
  // one listener bumps this and both of them ask again when the window comes to
  // the front. A refusal is "not yet", never an error on the face.
  const [visibleTick, setVisibleTick] = React.useState(0);
  React.useEffect(() => {
    if (!isCustom) return;
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        setVisibleTick((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isCustom]);
  // Whether the typed family is actually drawable here. A family this Mac does
  // not have falls back to Menlo silently, so one short line says so. Measured
  // off the draft so it answers as the person types; empty draft says nothing.
  const [missing, setMissing] = React.useState(false);
  React.useEffect(() => {
    if (settings.workAreaFont !== 'custom' || draft.trim() === '') {
      setMissing(false);
      return;
    }
    let cancelled = false;
    void isWorkFontAvailable(draft).then((available) => {
      if (!cancelled) setMissing(!available);
    });
    return () => {
      cancelled = true;
    };
    // visibleTick is a dependency because the answer's best source is the
    // platform's own list, and on a hidden page there is no list to read.
  }, [draft, settings.workAreaFont, visibleTick]);
  // The families this Mac actually has, offered as suggestions (Phase 174.1).
  // Never a cage: the control stays a text field, so a family the list does not
  // carry can still be typed and the note below still tells the truth about it.
  const [suggestions, setSuggestions] =
    React.useState<FontSuggestions>(NO_FONT_SUGGESTIONS);
  React.useEffect(() => {
    if (!isCustom) return;
    let cancelled = false;
    void loadFontSuggestions().then((found) => {
      if (!cancelled) setSuggestions(found);
    });
    return () => {
      cancelled = true;
    };
  }, [isCustom, visibleTick]);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Terminal and editor font</span>
        <span className="set-row-caption">
          The face the terminal and the editor draw with. System is Menlo,
          which is already on your Mac. The sidebar and the rest of the app
          keep the system interface font. Changes apply at once.
        </span>
      </div>
      <select
        className="set-select"
        aria-label="Terminal and editor font"
        value={settings.workAreaFont}
        onChange={(e) => {
          void selectWorkAreaFont(e.target.value);
        }}
      >
        {WORK_FONT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isCustom ? (
        <div className="set-font-custom">
          <input
            className="set-select"
            type="text"
            aria-label="Custom font family"
            placeholder="Font family name"
            spellCheck={false}
            autoComplete="off"
            list={FONT_SUGGESTION_LIST_ID}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
          />
          <FontSuggestionList suggestions={suggestions} />
          <FontMissingNote missing={missing} />
        </div>
      ) : null}
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

      <div className="set-group-label">Font</div>
      <div className="set-card">
        <WorkAreaFontRow />
        {/* One note, and it is the one a person meets by acting. They came
            here to change the font and there is no size control. The two font
            glyph measurements Phase 78 recorded moved to
            docs/research/57-terminal-font-glyph-coverage.md in Phase 87. */}
        <div className="set-row">
          <div className="set-row-text">
            {/*
              The two chords are read from src/shared/keymap.ts rather than
              typed here, which is the single-source rule
              (src/shared/__tests__/keymap-single-source.test.ts). They
              render as ⌘+ and ⌘-.
            */}
            <span className="set-row-caption">
              {`Size is not set here. Use ${keyDisplay('view.zoomIn')} and ` +
                `${keyDisplay('view.zoomOut')} to change the size of the ` +
                `area you are working in.`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
