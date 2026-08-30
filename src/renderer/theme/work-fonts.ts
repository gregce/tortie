/**
 * The three work-area font presets (Phase 78), and the one place their family
 * strings exist.
 *
 * WHAT A PRESET IS. It is a family, and only a family. It writes two CSS
 * custom properties and nothing else. It sets no size, because
 * docs/DESIGN-SPEC.md:601 withdrew the font size stepper and said the
 * `--font-terminal` token remains the family lever, with zoom staying a
 * multiplier over whatever base size that implies. Per region zoom already
 * changes the terminal's font size for real and pushes the new geometry to
 * tmux, so a second size control here would be two controls fighting over one
 * pane.
 *
 * THE TWO TOKENS, and why there are two rather than one.
 *   - `--font-terminal` is xterm's, and it was already the family lever.
 *   - `--font-editor` was added by this phase with a value byte identical to
 *     `--font-mono`. Monaco, the Pierre diff and the markdown preview's code
 *     and pre read it. They used to read `--font-mono`, which has about 60
 *     users and most of them are chrome. Moving `--font-mono` would have moved
 *     the sidebar, which this phase refuses.
 *
 * THE SYSTEM PRESET WRITES NOTHING. `fontOverrides('system')` returns an empty
 * object, so an install that never opens the section carries zero inline font
 * properties and renders the shipped stylesheet bytes exactly. That is the same
 * zero-override guarantee Phase 62 made for the blue scheme at normal contrast,
 * and apply.ts's existing diff is what removes both tokens again when a person
 * goes back to System.
 *
 * BOTH STACKS END IN MENLO on purpose. Both bundled faces sit within 0.35
 * percent of Menlo's advance, so a codepoint neither family has lands inside
 * the cell rather than pushing the column grid. Menlo REGULAR is the safe
 * upright last resort and only the regular face. Menlo Bold has 0 of the 128
 * box drawing characters and Menlo Italic is missing four of the marks agents
 * print. Neither gap reaches the terminal, because xterm's WebGL renderer draws
 * the box, block, powerline and legacy computing glyphs itself.
 *
 * THE TRAP THIS MODULE EXISTS TO AVOID is `loadWorkAreaFace`. A `@font-face`
 * is fetched only when something renders in it. Assigning the family to xterm
 * first makes xterm measure the cell and build its WebGL glyph atlas in the
 * fallback face, and it stays wrong until the next resize. The comment at
 * TerminalPane.tsx's font handler has recorded that since Phase 9.2. So every
 * consumer awaits the named face before it re-measures anything.
 */

import { create } from 'zustand';
import {
  DEFAULT_WORK_AREA_FONT,
  sanitizeWorkAreaFontCustom,
  type WorkAreaFont
} from '@shared/settings';

/** One row of the preset table. `null` twice is the System preset. */
export interface WorkFontPreset {
  id: WorkAreaFont;
  /** The Settings option label. */
  label: string;
  /**
   * The bare family name, for `document.fonts.load` and for the `@font-face`
   * the capture path inlines. Null for 'system', which ships no face.
   */
  familyName: string | null;
  /**
   * The full stack written into both tokens. Null for 'system', which writes
   * no override at all.
   */
  stack: string | null;
}

/**
 * The table. Settings reads it for the option list and the capture path reads
 * it for the family name, so a preset's strings have exactly one source.
 *
 * Order is the order the select offers, and System is first because it is the
 * default.
 */
export const WORK_FONTS: readonly WorkFontPreset[] = [
  { id: 'system', label: 'System', familyName: null, stack: null },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    familyName: 'JetBrains Mono',
    stack: "'JetBrains Mono', Menlo, monospace"
  },
  {
    id: 'source-code-pro',
    label: 'Source Code Pro',
    familyName: 'Source Code Pro',
    stack: "'Source Code Pro', Menlo, monospace"
  },
  // The custom row's strings are null HERE: the family is user data, read at
  // resolution time from useCustomWorkFontFamily (see workFont), not baked
  // into a compiled row. Settings still lists it as one more option.
  { id: 'custom', label: 'Custom…', familyName: null, stack: null }
];

const SYSTEM_PRESET: WorkFontPreset = WORK_FONTS[0] as WorkFontPreset;

/** The two tokens a bundled preset writes. Nothing else is ever written. */
export const WORK_FONT_TOKENS = ['--font-terminal', '--font-editor'] as const;

/** The row for an id. An unknown id reads as System rather than throwing. */
export function workFont(id: WorkAreaFont): WorkFontPreset {
  const row = WORK_FONTS.find((f) => f.id === id) ?? SYSTEM_PRESET;
  if (row.id !== 'custom') return row;
  // The custom family is user data, not a compiled row, so it resolves here
  // from the live mirror apply.ts feeds. An empty family means the user picked
  // Custom but typed nothing yet, which reads as Menlo through the stack.
  //
  // This is the ONE boundary between the typed string and every place it is
  // drawn: the CSS custom property, xterm's fontFamily, Monaco's option and
  // the capture SVG all read the value this function returns. So it is
  // sanitized here (Phase 174), which strips quotes a person pasted around the
  // name AND every character that could break out of the `'…'` stack — a
  // quote, a semicolon, a brace, a backslash, a control character or a `url(`
  // fragment. sanitizeWorkAreaFontCustom is the single definition, applied at
  // persistence and again here, so a store fed by any path still emits a clean
  // family. An empty result is the System preset's own Menlo fallback.
  const family = sanitizeWorkAreaFontCustom(
    useCustomWorkFontFamily.getState().family
  );
  const stack = `'${family}', Menlo, monospace`;
  return { id: 'custom', label: row.label, familyName: family, stack };
}

/**
 * The custom property overrides for a preset. `{}` for System, and two entries
 * for a bundled face. apply.ts merges this on top of the colour derivation and
 * its existing diff removes whatever leaves the map.
 */
export function fontOverrides(id: WorkAreaFont): Record<string, string> {
  const stack = workFont(id).stack;
  if (stack === null) return {};
  const out: Record<string, string> = {};
  for (const token of WORK_FONT_TOKENS) out[token] = stack;
  return out;
}

/**
 * Await the regular and the bold member of this preset at this size, so the
 * caller can re-measure against a face the browser has actually parsed.
 *
 * A no-op for System, and a no-op in any environment without a FontFaceSet,
 * which is what the node test environment is. A rejected load is swallowed:
 * the caller then measures the fallback, which is what would have happened
 * anyway, and the `loadingdone` listener in TerminalPane is the second belt.
 */
export async function loadWorkAreaFace(
  id: WorkAreaFont,
  sizePx: number
): Promise<void> {
  const family = workFont(id).familyName;
  if (family === null) return;
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (fonts === undefined) return;
  const size = Number.isFinite(sizePx) && sizePx > 0 ? sizePx : 13;
  try {
    await Promise.all([
      fonts.load(`${size}px "${family}"`),
      fonts.load(`bold ${size}px "${family}"`)
    ]);
  } catch {
    /* An unloadable face leaves the fallback on screen, not an exception. */
  }
}

export interface WorkAreaFontState {
  preset: WorkAreaFont;
}

/**
 * The preset the work area is currently drawing with.
 *
 * apply.ts is the ONLY writer. It is the module that already pulls the
 * settings once at boot and re-applies on every broadcast, so putting the
 * write there keeps one path for the whole appearance. TerminalPane and
 * MonacoHost subscribe, because xterm and Monaco each own an imperative font
 * option that a CSS custom property change cannot reach on its own.
 *
 * It is deliberately NOT persisted here. The preset lives in main's
 * settings.json beside the two Phase 62 appearance fields, and this store is
 * only the renderer's live mirror of it.
 */
export const useWorkAreaFont = create<WorkAreaFontState>()(() => ({
  preset: DEFAULT_WORK_AREA_FONT
}));

export interface CustomWorkFontFamilyState {
  family: string;
}

/**
 * The family the 'custom' preset draws with, as a live mirror of the persisted
 * `workAreaFontCustom`. Same posture as useWorkAreaFont: apply.ts is the only
 * writer, fed by the settings read + broadcast, and nothing here is persisted.
 * An empty string is "picked Custom but typed nothing yet", which the stack
 * reads as Menlo (the terminal's guaranteed fallback).
 */
export const useCustomWorkFontFamily = create<CustomWorkFontFamilyState>()(() => ({
  family: ''
}));

/** apply.ts calls this once per settings change, beside setWorkAreaFont. */
export function setCustomWorkFontFamily(family: string): void {
  if (useCustomWorkFontFamily.getState().family === family) return;
  useCustomWorkFontFamily.setState({ family });
}

/** apply.ts calls this once per settings change. */
export function setWorkAreaFont(id: WorkAreaFont): void {
  if (useWorkAreaFont.getState().preset === id) return;
  useWorkAreaFont.setState({ preset: id });
}

/**
 * Is a typed family actually drawable on this Mac (Phase 174)? This answers the
 * "not installed on this Mac" line under the Custom field, and it is measured,
 * not asked. `document.fonts.check` cannot answer it: it returns true for a
 * family the machine does not have, because there is no `@font-face` to load,
 * and false for a face the app bundles but has not rendered yet. Measured in
 * this Electron, `check('13px "Zznonexistent"')` returned true.
 *
 * So this renders a probe string on a canvas in `'<family>', <generic>` and in
 * `<generic>` alone, for three unrelated generics. If the family is present it
 * overrides the fallback and at least one width differs; if it is absent every
 * width matches its generic. A bundled family reads as available because the
 * load below pulls its bytes first, and a system family loads as a no-op.
 *
 * An empty family is "nothing typed", not "missing", so it returns true. Any
 * environment without a document or a 2D context (the node test env) returns
 * true, so the line never fires where it cannot measure.
 */
export async function isWorkFontAvailable(family: string): Promise<boolean> {
  const name = sanitizeWorkAreaFontCustom(family);
  if (name === '') return true;
  if (typeof document === 'undefined') return true;
  // Pull the bytes for a face the app bundles under this name, so a bundled
  // family is not mis-reported as missing before anything has rendered in it.
  // A system font's load is a no-op, and an unloadable name is swallowed.
  try {
    await document.fonts?.load(`13px "${name}"`);
  } catch {
    /* an unloadable face is exactly the "missing" case measured below */
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx === null) return true;
  const sample = 'mmmmmmmmmmlliWWWWWW0123456789 gjpqyQ@';
  const generics = ['monospace', 'sans-serif', 'serif'];
  const widthIn = (f: string): number => {
    ctx.font = `72px ${f}`;
    return ctx.measureText(sample).width;
  };
  return generics.some((g) => widthIn(`'${name}', ${g}`) !== widthIn(g));
}
