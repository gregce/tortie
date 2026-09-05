/**
 * Phase 62 — Settings → Appearance: two controls and nothing else. One picks
 * the highlight scheme from four presets, one picks the contrast step.
 * Phase 213 put the SCHEME above both, being Light, Dark and Match the Mac
 * on one segmented control, because it decides the base every other control
 * here composes on.
 * Both write one-field patches through the settings store; the broadcast
 * applies them in every window at once (src/renderer/theme/apply.ts), so the
 * live window is the preview and there is no Save.
 *
 * Phase 207 added the frame's hue between the two, a slider over the whole
 * circle with a degree on its face. Phase 210 replaced that face and added
 * the control he was actually looking for when he found it.
 *
 * THE DEGREE IS GONE FROM THE RESTING FACE, at his word: 222 named a position
 * on a wheel nobody is looking at and told him nothing about what he would
 * see. The colour is chosen from EIGHT NAMED FRAMES, each drawn as the frame
 * it would produce, so what a person picks from is the thing itself. The
 * degree survives in the persisted setting and on the hover title, which is
 * where somebody who wants it can still find it.
 *
 * TWO STOP SLIDERS MOVE THE RAMP ITSELF, which is the ask: Shade sets where
 * it sits, from near black upward, and Depth sets how far its panels and
 * hairlines stand apart. A slider STOPS at the last stop that keeps every
 * contrast floor and says why in a few words, rather than accepting the move
 * and quietly clamping it, which is Phase 207's rule that we never silently
 * refuse what he asked for. The edge is measured through the shipping
 * derivation and the shipping floor predicate, the same pair
 * `npm run conformance:hue` walks.
 *
 * All three write one-field patches, throttled while a drag is in flight, and
 * the same applier reads them. Everything drawn here derives from the
 * captured base with the scheme and the contrast level as they stand, so it
 * previews the composition and never one axis alone.
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
  BaseScheme,
  ColorScheme,
  ContrastLevel,
  GmuxSettings,
  HighlightScheme,
  WorkAreaFont
} from '@shared/settings';
import {
  DEFAULT_CHROME_DEPTH,
  DEFAULT_CHROME_HUE,
  DEFAULT_CHROME_SHADE,
  sanitizeChromeDepth,
  sanitizeChromeHue,
  sanitizeChromeShade,
  sanitizeColorScheme
} from '@shared/settings';
import { shippedBaseFor, shippedBaseNow } from '../theme/apply';
import { useChromeTheme } from '../theme/chrome-theme';
import type { FloorFailure } from '../theme/floors';
import { deriveOverrides } from '../theme/derive';
import {
  DEPTH_STOPS,
  SHADE_STOPS,
  axisReading,
  depthRange,
  frameFailure,
  frameForBase,
  resetFrame,
  shadeRange,
  type FrameChoice,
  type StopRange
} from '../theme/frame-stops';
import {
  CONTRAST_BG,
  CANVAS_TOKEN,
  FRAME_COLORS,
  SCHEME_PRESETS
} from '../theme/presets';
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
 * The three schemes, in UI order (Phase 213). Light, Dark, Match the Mac.
 * Dark is the shipped default. The hover titles are where the words live:
 * the face carries the three names and nothing else.
 */
export const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string; title: string }[] = [
  { value: 'light', label: 'Light', title: 'Paper with dark text' },
  { value: 'dark', label: 'Dark', title: 'Graphite with light text, the shipped look' },
  { value: 'system', label: 'Match the Mac', title: 'Follows the Mac and changes with it' }
];

/** Persist a scheme pick as a one-field patch (Phase 213). For the test. */
export function selectColorScheme(value: string): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ colorScheme: sanitizeColorScheme(value) });
}

/**
 * The segmented control (Phase 213): three names, one pressed. A
 * radiogroup, so the keyboard and the screen reader read it as one choice
 * rather than three buttons.
 */
function ColorSchemeRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const scheme = sanitizeColorScheme(settings.colorScheme);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Scheme</span>
        <span className="set-row-caption">
          Light, dark, or whatever the Mac is set to. Changes apply at once.
        </span>
      </div>
      <div className="set-segments" role="radiogroup" aria-label="Scheme">
        {COLOR_SCHEME_OPTIONS.map((o) => {
          const on = o.value === scheme;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              title={o.title}
              className={on ? 'set-segment on' : 'set-segment'}
              onClick={() => void selectColorScheme(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

/**
 * Persist a hue as a one-field patch (Phase 207). Exported for the test.
 * The value is sanitized here as well as in main, so the optimistic local
 * state the store applies before the round trip is already a whole degree.
 */
export function selectChromeHue(value: number): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ chromeHue: sanitizeChromeHue(value) });
}

/** Persist a shade stop as a one-field patch (Phase 210). For the test. */
export function selectChromeShade(value: number): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ chromeShade: sanitizeChromeShade(value) });
}

/** Persist a depth stop as a one-field patch (Phase 210). For the test. */
export function selectChromeDepth(value: number): Promise<GmuxSettings | null> {
  return useSettingsStore
    .getState()
    .update({ chromeDepth: sanitizeChromeDepth(value) });
}

/**
 * Put the frame back where it ships (Phase 210), being the axes THIS BASE
 * CAN MOVE and no other (Phase 214 committer's round).
 *
 * Hiding the Shade row was not enough on its own. Reset is the one Frame
 * control this phase deliberately kept on paper, and it wrote all three
 * fields whatever base it was pressed on, so a person on paper who nudged
 * Depth and then pressed Reset lost the shade they had chosen on dark. The
 * patch is now composed by `resetFrame` from the same two booleans the rows
 * are drawn from, which is one sentence for the whole group: what a base
 * cannot move, it does not touch.
 *
 * The default is both axes, which is what the dark base answers and what the
 * Phase 210 test calls it with.
 */
export function resetChromeFrame(
  moves: { shade: boolean; depth: boolean } = { shade: true, depth: true }
): Promise<GmuxSettings | null> {
  return useSettingsStore.getState().update(resetFrame(moves));
}

/**
 * The five grounds the frame preview draws, in ramp order: the sidebar first
 * because it is below the canvas since Phase 196, then the canvas and the
 * three fills above it.
 */
export const HUE_SWATCH_TOKENS: readonly string[] = [
  '--bg-sidebar',
  CANVAS_TOKEN,
  ...CONTRAST_BG.filter((t) => t !== '--bg-sidebar')
];

/**
 * The frame exactly as the applier would write it, derived from the captured
 * base with the OTHER two settings as they stand, so what is drawn previews
 * the composition and not one axis alone. Null before the first apply has
 * captured a base, when the strip draws the live tokens instead.
 *
 * `--border` rides along because the hairline is how the DEPTH shows: two
 * panels a step apart with no line between them is what the depth control
 * takes away, and a preview that hid it would preview the wrong thing.
 */
export function hueSwatches(
  settings: Pick<GmuxSettings, 'highlightScheme' | 'contrastLevel'>,
  chromeHue: number,
  chromeShade = 0,
  chromeDepth = 0,
  // THE BASE IT DRAWS FROM (Phase 213 fix round, finding 1). The caller
  // passes the base of the scheme the WINDOW is drawing; it defaults to the
  // one the applier captured last, which is the same thing everywhere except
  // during a crossfade, when it is the base being left behind.
  from: Readonly<Record<string, string>> | null = shippedBaseNow()
): Record<string, string> | null {
  const base = from;
  if (base === null) return null;
  const overrides = deriveOverrides(
    {
      highlightScheme: settings.highlightScheme,
      contrastLevel: settings.contrastLevel,
      chromeHue,
      chromeShade,
      chromeDepth
    },
    base
  );
  const out: Record<string, string> = {};
  for (const token of [...HUE_SWATCH_TOKENS, '--border']) {
    const value = overrides[token] ?? base[token];
    if (value !== undefined) out[token] = value;
  }
  return out;
}

/**
 * THE BASE THE WINDOW IS DRAWING, read reactively (Phase 213 fix round,
 * finding 1).
 *
 * The applier publishes the scheme to the chrome theme store INSIDE the
 * commit it hands to `document.startViewTransition`, and that commit is
 * deferred past the React render the same settings broadcast causes. So the
 * face cannot read the scheme as a module level value: on the render that
 * follows a person clicking Light it would still say dark, and nothing would
 * re-render it afterwards. Subscribing to the store is what makes the publish
 * the thing that moves the face, so the face and the window move together.
 *
 * It is read through `useSyncExternalStore` rather than through zustand's own
 * hook because zustand answers the store's INITIAL state during a server
 * render, and the section's node tests render exactly that way; this reads
 * the live state on both paths.
 */
function useDrawnScheme(): BaseScheme {
  return React.useSyncExternalStore(
    useChromeTheme.subscribe,
    () => useChromeTheme.getState().scheme,
    () => useChromeTheme.getState().scheme
  );
}

/** Everything the two Frame sliders and the strip draw, for one base. */
export interface FrameFace {
  /** The frame this base can draw, which is what every part of the face says. */
  held: FrameChoice;
  shade: StopRange;
  depth: StopRange;
  /**
   * Does the face DRAW each control (Phase 214)? A control with a single
   * stop cannot move, so it is absent rather than present and inert, and on
   * paper that is the Shade row: the light palette carries one shade.
   */
  shadeMoves: boolean;
  depthMoves: boolean;
  /** The refusal line for each, empty when the control is not drawn. */
  shadeNote: string;
  depthNote: string;
  swatches: Record<string, string> | null;
  atDefault: boolean;
}

/**
 * The whole face of the Frame group, as a pure function of the base, the
 * composition and the frame in hand.
 *
 * It is one function rather than nine expressions inside the component so
 * that the two things the phase promised can be pinned by a test: that the
 * face never says one frame while the window draws another, and that a
 * carried frame the new base cannot draw is shown at the stop it is actually
 * drawn at, with that base's own refusal sentence and that base's own bands.
 */
export function frameFace(
  scheme: BaseScheme,
  settings: Pick<GmuxSettings, 'highlightScheme' | 'contrastLevel'>,
  base: Readonly<Record<string, string>> | null,
  choice: FrameChoice
): FrameFace {
  // AND THE SLIDERS READ THE FRAME THIS BASE DRAWS, not the one persisted.
  // The applier brings a frame the base cannot draw to the nearest stop the
  // base offers and persists nothing, so on paper a shade of -2 chosen on
  // dark draws as the shipped stop; a slider still sitting at -2 would say
  // one frame while the window drew another. Dragging writes the drafts
  // straight through, so this only ever moves a value nobody is touching.
  const held = frameForBase(choice, scheme);
  // The stops on offer come from the pinned region, so they cost nothing and
  // do not move when a person changes their colour or their contrast. The
  // REASON a slider stopped is measured live, at the composition in front of
  // them, through the shipping derivation and the shipping floor predicate.
  const ranges = {
    shade: shadeRange(held.chromeDepth, scheme),
    depth: depthRange(held.chromeShade, scheme)
  };
  const context = {
    highlightScheme: settings.highlightScheme,
    contrastLevel: settings.contrastLevel,
    scheme
  };
  const why = (chromeShade: number, chromeDepth: number): FloorFailure | null =>
    base === null
      ? null
      : frameFailure(context, base, { chromeHue: held.chromeHue, chromeShade, chromeDepth });
  // WHAT THE REGION SAYS BINDS AT EACH END, by base, and it is a measurement
  // rather than a guess (Phase 213). On the dark base the dark end is the
  // RENDERED STEP, because near black eight bits run out before the ramp
  // does, and the light end is the git decorations on the active row. On
  // paper both ends move: the dark end is the accent, which ships at 5.03:1
  // against a floor of 4.5 so one stop darker takes it under, and the light
  // end is the ORDER, because the sheet ships at OKLCH L 0.992 and one stop
  // lighter puts it and the canvas both at white. It is a fallback and not
  // the sentence: where the live composition really fails, that failure
  // names itself.
  const ends =
    scheme === 'light'
      ? {
          darker: { family: 'chromatic' as const, token: '--accent-text' },
          lighter: { family: 'order' as const },
          lessDepth: { family: 'step' as const },
          moreDepth: { family: 'chromatic' as const }
        }
      : {
          darker: { family: 'step' as const },
          lighter: { family: 'chromatic' as const },
          lessDepth: { family: 'step' as const },
          moreDepth: { family: 'chromatic' as const }
        };
  // AND EACH AXIS IS READ BY ONE FUNCTION (Phase 214), which answers both
  // whether the control is drawn and what it says. On paper the Shade range
  // is a single stop, so it is not drawn and it says nothing.
  const shadeAxis = axisReading(
    'shade',
    ranges.shade,
    held.chromeShade,
    (stop) => why(stop, held.chromeDepth),
    { below: ends.darker, above: ends.lighter }
  );
  const depthAxis = axisReading(
    'depth',
    ranges.depth,
    held.chromeDepth,
    (stop) => why(held.chromeShade, stop),
    { below: ends.lessDepth, above: ends.moreDepth }
  );
  return {
    held,
    shade: ranges.shade,
    depth: ranges.depth,
    shadeMoves: shadeAxis.moves,
    depthMoves: depthAxis.moves,
    shadeNote: shadeAxis.note,
    depthNote: depthAxis.note,
    swatches: hueSwatches(settings, held.chromeHue, held.chromeShade, held.chromeDepth, base),
    atDefault:
      held.chromeHue === DEFAULT_CHROME_HUE &&
      held.chromeShade === DEFAULT_CHROME_SHADE &&
      held.chromeDepth === DEFAULT_CHROME_DEPTH
  };
}

/** How long a drag waits between persisted patches. */
const HUE_COMMIT_MS = 80;

/**
 * A slider that draws its draft at once and persists at most once per
 * HUE_COMMIT_MS. A drag fires a change per pixel; the draft moves on every
 * one of them and the disk write and the broadcast to every window do not.
 * Phase 207 wrote this for the hue and Phase 210 has two more sliders, so it
 * is one hook rather than three copies.
 */
function useThrottledStop(
  persisted: number,
  commitTo: (value: number) => Promise<unknown>
): [number, (value: number) => void] {
  const [draft, setDraft] = React.useState(persisted);
  React.useEffect(() => {
    setDraft(persisted);
  }, [persisted]);
  const pending = React.useRef<number | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  const pick = React.useCallback(
    (value: number): void => {
      setDraft(value);
      pending.current = value;
      if (timer.current !== null) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        if (pending.current !== null) void commitTo(pending.current);
        pending.current = null;
      }, HUE_COMMIT_MS);
    },
    [commitTo]
  );
  return [draft, pick];
}

/** The frame the three controls together produce, as five bands and a line. */
function FrameStrip({
  swatches
}: {
  swatches: Record<string, string> | null;
}): React.JSX.Element {
  const line = swatches?.['--border'] ?? 'var(--border)';
  return (
    <div className="set-frame-strip" aria-hidden="true">
      {HUE_SWATCH_TOKENS.map((token, i) => (
        <span
          key={token}
          className="set-frame-band"
          data-token={token}
          style={{
            background: swatches?.[token] ?? `var(${token})`,
            borderLeft: i === 0 ? 'none' : `1px solid ${line}`
          }}
        />
      ))}
    </div>
  );
}

/**
 * The colour row: the named starting colours, each drawn as the frame it
 * produces at the shade and depth in effect. The degree is on the title and
 * nowhere on the face, which is the operator's second sentence answered.
 */
function FrameColorRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const hue = sanitizeChromeHue(settings.chromeHue);
  // THE CHIPS ARE DRAWN AT THE FRAME IN EFFECT (Phase 213 fix round), which
  // on a base that cannot draw the carried one is the stop it was brought
  // to, from that base's own bytes. docs/DESIGN-SPEC.md says each chip is
  // "the frame it produces at the shade and depth in effect", and on paper
  // the shade in effect is the shipped stop rather than the persisted one.
  const scheme = useDrawnScheme();
  const base = shippedBaseFor(scheme);
  const held = frameForBase(
    {
      chromeHue: hue,
      chromeShade: sanitizeChromeShade(settings.chromeShade),
      chromeDepth: sanitizeChromeDepth(settings.chromeDepth)
    },
    scheme
  );
  const shade = held.chromeShade;
  const depth = held.chromeDepth;
  const named = FRAME_COLORS.some((c) => c.hue === hue);
  // A hue none of the eight carries keeps its own swatch at the head of the
  // row rather than being snapped onto a neighbour, which would show a person
  // a colour they did not choose. It leaves as soon as they pick one.
  const choices = named
    ? FRAME_COLORS
    : [{ hue, label: 'Yours' }, ...FRAME_COLORS];
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Color</span>
        <span className="set-row-caption">
          The color of the sidebar, the tabs and the panels around your work.
          Changes apply at once.
        </span>
      </div>
      <div className="set-frame-colors" role="radiogroup" aria-label="Frame color">
        {choices.map((choice) => {
          const swatches = hueSwatches(settings, choice.hue, shade, depth, base);
          const on = choice.hue === hue;
          return (
            <button
              key={choice.hue}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={choice.label}
              title={`${choice.label}, hue ${String(choice.hue)}`}
              className={on ? 'set-frame-color on' : 'set-frame-color'}
              onClick={() => void selectChromeHue(choice.hue)}
            >
              <span className="set-frame-chip">
                {HUE_SWATCH_TOKENS.map((token) => (
                  <span
                    key={token}
                    className="set-frame-chip-band"
                    style={{
                      background: swatches?.[token] ?? `var(${token})`
                    }}
                  />
                ))}
              </span>
              <span className="set-frame-color-name">{choice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What one move of a stop slider does. */
export interface StopPick {
  /** Where the thumb lands, which is the move stopped at the edge. */
  stopped: number;
  /** Did the edge stop it, so the refusal line speaks? */
  refused: boolean;
  /** Does it write? False when it lands on the stop already drawn. */
  persist: boolean;
}

/**
 * One move of a stop slider, as a pure function so the guard below can be
 * pinned without a DOM (Phase 213, the committer's round). See the header of
 * `StopSliderRow` for why `persist` is a comparison against the DRAWN stop
 * rather than the inverse of `refused`.
 */
export function stopSliderPick(
  raw: number,
  { edgeMin, edgeMax, drawn }: { edgeMin: number; edgeMax: number; drawn: number }
): StopPick {
  const wanted = Math.round(raw);
  const stopped = Math.min(edgeMax, Math.max(edgeMin, wanted));
  return { stopped, refused: stopped !== wanted, persist: stopped !== drawn };
}

/**
 * One stop slider with its refusal line.
 *
 * THE SLIDER STOPS AT THE EDGE OF WHAT KEEPS THE FLOORS. It does not shrink
 * its track, because a control whose length changed under the pointer would
 * be its own puzzle; it refuses the move and says why, and the line holds its
 * place whether or not it speaks so the card never jumps (Phase 174.1).
 *
 * AND A MOVE THAT LANDS BACK ON THE STOP THE BASE IS ALREADY DRAWING WRITES
 * NOTHING (Phase 213, the committer's round). `frameForBase` brings a frame
 * the base cannot draw to the nearest stop it does offer and its header
 * promises that nothing is persisted, so going back to the base that could
 * draw it brings it back exactly. The two sliders were the hole in that
 * promise: `draft` here is the BROUGHT stop, and persisting whatever a move
 * clamped to wrote that stop into the settings file. On paper the whole
 * region is one shade row, so the Shade slider is inert, and one arrow key or
 * one stray click on it wrote the shipped shade over the shade the person
 * chose on dark and it was gone. Measured in the real app before the guard:
 * shade -2 and depth 3 set on dark, one ArrowLeft on paper, and Dark came
 * back at 0.
 *
 * The guard is the comparison and not a flag, because the DESIGNED refusal
 * still has to move: a drag from 1 to 3 where the edge is 2 lands on 2, which
 * is not the stop being drawn, so it persists 2 and says why. Only a move
 * whose landing place is the one already in front of the person writes
 * nothing, and on the dark base, where the drawn stop is always the persisted
 * one, the only writes this removes are writes of the value already there.
 * `npm run probe:p213` launch E drives all four arms, including the control
 * that a move INSIDE the range still persists.
 */
function StopSliderRow({
  label,
  caption,
  min,
  max,
  edgeMin,
  edgeMax,
  draft,
  onPick,
  note
}: {
  label: string;
  caption: string;
  min: number;
  max: number;
  edgeMin: number;
  edgeMax: number;
  draft: number;
  onPick: (value: number) => void;
  note: string;
}): React.JSX.Element {
  const [refused, setRefused] = React.useState(false);
  const pick = (raw: number): void => {
    const answer = stopSliderPick(raw, { edgeMin, edgeMax, drawn: draft });
    setRefused(answer.refused);
    if (answer.persist) onPick(answer.stopped);
  };
  const speaking = refused && note !== '';
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        <span className="set-row-caption">{caption}</span>
      </div>
      <div className="set-hue">
        <input
          className="set-hue-slider"
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(e) => pick(Number(e.target.value))}
        />
        <span
          className={speaking ? 'set-frame-note' : 'set-frame-note blank'}
          aria-hidden={speaking ? undefined : true}
        >
          {note}
        </span>
      </div>
    </div>
  );
}

/** The two rows that move the ramp, and the strip that shows where it went. */
function FrameShapeRows(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const hue = sanitizeChromeHue(settings.chromeHue);
  const [shade, pickShade] = useThrottledStop(
    sanitizeChromeShade(settings.chromeShade),
    selectChromeShade
  );
  const [depth, pickDepth] = useThrottledStop(
    sanitizeChromeDepth(settings.chromeDepth),
    selectChromeDepth
  );
  // The base in effect (Phase 213): the light region is its own table and
  // the light floors are their own predicate, so both are asked by scheme,
  // and the scheme is the one the WINDOW is drawing rather than the one the
  // applier happened to capture last.
  const scheme = useDrawnScheme();
  const face = frameFace(scheme, settings, shippedBaseFor(scheme), {
    chromeHue: hue,
    chromeShade: shade,
    chromeDepth: depth
  });
  // A CONTROL THAT CANNOT MOVE IS NOT DRAWN (Phase 214). Paper carries one
  // shade, so the Shade row is absent there rather than present and inert.
  // The guard is the range's own length, asked per axis, so nothing here
  // names a base and a palette that later opens a second row gets its
  // control back with no edit. `npm run conformance:hue` rule 31 asserts
  // both halves, being the arithmetic and this wiring.
  return (
    <>
      {face.shadeMoves ? (
        <StopSliderRow
          label="Shade"
          caption="How dark the frame is. The shipped frame is a point on this line, and it is where it starts."
          min={SHADE_STOPS[0] ?? 0}
          max={SHADE_STOPS[SHADE_STOPS.length - 1] ?? 0}
          edgeMin={face.shade.min}
          edgeMax={face.shade.max}
          draft={face.held.chromeShade}
          onPick={pickShade}
          note={face.shadeNote}
        />
      ) : null}
      {face.depthMoves ? (
        <StopSliderRow
          label="Depth"
          caption="How far the panels and the hairlines stand apart from the background."
          min={DEPTH_STOPS[0] ?? 0}
          max={DEPTH_STOPS[DEPTH_STOPS.length - 1] ?? 0}
          edgeMin={face.depth.min}
          edgeMax={face.depth.max}
          draft={face.held.chromeDepth}
          onPick={pickDepth}
          note={face.depthNote}
        />
      ) : null}
      <div className="set-row">
        <div className="set-row-text">
          <FrameStrip swatches={face.swatches} />
        </div>
        <button
          type="button"
          className={face.atDefault ? 'set-hue-reset blank' : 'set-hue-reset'}
          aria-hidden={face.atDefault ? true : undefined}
          tabIndex={face.atDefault ? -1 : undefined}
          onClick={() =>
            void resetChromeFrame({ shade: face.shadeMoves, depth: face.depthMoves })
          }
        >
          Reset
        </button>
      </div>
    </>
  );
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

      {/* Phase 213. The scheme leads, because it decides the base every
          control under it composes on: paper or graphite, or the Mac's own
          choice, followed live. Three words on a segmented control. */}
      <div className="set-group-label">Scheme</div>
      <div className="set-card">
        <ColorSchemeRow />
      </div>

      <div className="set-group-label">Highlight</div>
      <div className="set-card">
        <HighlightSchemeRow />
      </div>

      {/* Phase 207 put the frame's hue here as a slider with a degree on its
          face. Phase 210 answered his second sentence, that the degree told
          him nothing about what he would see: the colour is chosen by name
          from the frames themselves, and two stop sliders move the ramp's own
          lightness, which is the control he was looking for when he found the
          first one. The strip under them is the frame those three produce,
          derived the way the applier derives it. */}
      <div className="set-group-label">Frame</div>
      <div className="set-card">
        <FrameColorRow />
        <FrameShapeRows />
      </div>

      <div className="set-group-label">Contrast</div>
      <div className="set-card">
        <ContrastRow />
        {/* The recorded limits, on the card where the user is looking. Phase
            207 took the file tree out of this sentence: it follows the frame
            now, through the tokens, as the sidebar around it does. */}
        <div className="set-row">
          <div className="set-row-text">
            <span className="set-row-caption">
              Text inside the terminal keeps its shipped colors for the
              scheme. The terminal selection highlight follows the highlight
              scheme.
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
