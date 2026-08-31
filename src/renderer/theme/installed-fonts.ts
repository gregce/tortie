/**
 * The families this Mac actually has, for the Custom font field's suggestions
 * (Phase 174.1).
 *
 * WHY THIS EXISTS. Phase 174 shipped the Custom face as a bare text box against
 * a set of families only the operating system knows, so a person could not tell
 * what was installed. This module answers that, and it is the whole mechanism:
 * one platform call from the Settings renderer, no main-process code, no IPC
 * channel, no permission handler, no new package, no directory read and no
 * third-party code of any kind.
 *
 * THE CALL. `window.queryLocalFonts()` is Chromium's Local Font Access API.
 * Measured in this Electron (43.3.0 / Chrome 150) inside Tortie's own Settings
 * window, at the real `file://` origin under the real CSP:
 *   - `typeof window.queryLocalFonts` is 'function';
 *   - `navigator.permissions.query({name:'local-fonts'})` answers 'granted'
 *     with NO permission handler anywhere in src, because that is Electron's
 *     default. Nothing had to be widened and nothing was added. A later round
 *     that installs a permission handler must allow 'local-fonts' explicitly,
 *     or these suggestions die in silence;
 *   - no user activation is needed: a call made after transient activation had
 *     expired still resolved, in 8 ms, so it may run from an effect.
 *
 * THE ONE REAL CONSTRAINT, and it is why the caller retries. On a hidden or
 * occluded page the call rejects with `SecurityError: Page needs to be
 * visible.` A Settings window that opened behind the terminal stayed hidden for
 * 25 s in one measured run. So a rejection here means "no suggestions yet",
 * never an error on the face, and it is deliberately NOT cached: the next call
 * tries again.
 *
 * WHAT COMES BACK IS UNTRUSTED TEXT. A family name is a string read out of a
 * font file somebody else wrote. It crosses exactly the boundary Phase 174
 * built for the typed string: every name is put through
 * `sanitizeWorkAreaFontCustom` before it reaches an <option value>, so what a
 * person picks is byte for byte what the persisted field would have accepted
 * had they typed it. A name that cleans away to nothing is dropped.
 *
 * MONOSPACE LEADS, because a proportional face in a terminal is a footgun. The
 * API does not report it: `FontData` carries family, fullName, postscriptName
 * and style, and nothing that says the face is fixed pitch. So it is MEASURED
 * rather than asked, by the same instrument `isWorkFontAvailable` uses: ten
 * narrow glyphs and ten wide ones are drawn on a canvas in the family, and a
 * fixed pitch face gives them the same advance. The fallback in that font
 * shorthand is `sans-serif` on purpose, so a name CSS cannot resolve is judged
 * proportional and never promoted into the lead. The rest are not hidden.
 */

import { sanitizeWorkAreaFontCustom } from '@shared/settings';

/** The installed families, split so the monospaced ones can be offered first. */
export interface FontSuggestions {
  readonly monospace: readonly string[];
  readonly proportional: readonly string[];
}

/** What every failure answers with: no suggestions, and no error on the face. */
export const NO_FONT_SUGGESTIONS: FontSuggestions = {
  monospace: [],
  proportional: []
};

/**
 * One row of `queryLocalFonts()`. Only `family` is read, and it is `unknown`
 * because it is text from a font file rather than a value this app produced.
 */
interface LocalFontRow {
  readonly family?: unknown;
}

type LocalFontQuery = () => Promise<readonly LocalFontRow[]>;

/** The two effects this module has, injected so the tests own both. */
export interface FontSuggestionDeps {
  /** The platform call, or null where this browser does not carry it. */
  readonly query: LocalFontQuery | null;
  /** Is this family fixed pitch? Measured, not asked. */
  readonly monospaced: (family: string) => boolean;
}

/**
 * The platform call, or null in any environment without it (the test env).
 *
 * BOUND TO THE WINDOW, and that is not decoration. `queryLocalFonts` is a
 * WebIDL operation on Window: called with any other receiver it throws
 * `TypeError: Illegal invocation` before it does anything. Measured here on
 * 2026-08-31, with the page visible and the permission granted, an unbound
 * reference failed on every call and the failure looked exactly like a machine
 * with no fonts, because a failed read is deliberately quiet.
 */
function localFontQuery(): LocalFontQuery | null {
  if (typeof window === 'undefined') return null;
  const found = (window as unknown as { queryLocalFonts?: unknown })
    .queryLocalFonts;
  return typeof found === 'function'
    ? ((found as LocalFontQuery).bind(window) as LocalFontQuery)
    : null;
}

/**
 * A fixed-pitch test over one shared 2D context. Ten narrow glyphs and ten
 * wide ones measure the same in a monospaced face and differ in every
 * proportional one. Any environment without a 2D context answers false, which
 * puts every family in the second group rather than mis-leading with it.
 */
function canvasMonospaceTest(): (family: string) => boolean {
  const canvas =
    typeof document === 'undefined' ? null : document.createElement('canvas');
  const ctx = canvas === null ? null : canvas.getContext('2d');
  if (ctx === null) return () => false;
  const NARROW = 'iiiiiiiiii';
  const WIDE = 'WWWWWWWWWW';
  return (family: string): boolean => {
    ctx.font = `72px '${family}', sans-serif`;
    const narrow = ctx.measureText(NARROW).width;
    const wide = ctx.measureText(WIDE).width;
    return narrow > 0 && Math.abs(narrow - wide) <= 0.5;
  };
}

/** The real pair. Built per read, which only happens when the cache is empty. */
export function platformFontDeps(): FontSuggestionDeps {
  return { query: localFontQuery(), monospaced: canvasMonospaceTest() };
}

/**
 * One read. `null` means "could not answer" — no API, or the page was hidden —
 * which is what keeps a rejection out of the cache. An empty pair means the
 * machine really has nothing to offer.
 */
export async function readFontSuggestions(
  deps: FontSuggestionDeps
): Promise<FontSuggestions | null> {
  if (deps.query === null) return null;
  let rows: readonly LocalFontRow[];
  try {
    rows = await deps.query();
  } catch {
    return null;
  }
  const seen = new Set<string>();
  const families: string[] = [];
  for (const row of rows) {
    // The one boundary: untrusted text is cleaned before it can reach markup,
    // and what survives is exactly what the persisted field would accept.
    const family = sanitizeWorkAreaFontCustom(
      (row as LocalFontRow | null)?.family
    );
    if (family === '' || seen.has(family)) continue;
    seen.add(family);
    families.push(family);
  }
  families.sort((a, b) => a.localeCompare(b, 'en'));
  const monospace: string[] = [];
  const proportional: string[] = [];
  for (const family of families) {
    if (deps.monospaced(family)) monospace.push(family);
    else proportional.push(family);
  }
  return { monospace, proportional };
}

let cached: FontSuggestions | null = null;
let inFlight: Promise<FontSuggestions> | null = null;

/**
 * The read the field calls, cached. A success is remembered for the life of
 * the window; a failure is not, so the caller may simply ask again when the
 * page becomes visible.
 */
export function loadFontSuggestions(
  deps: FontSuggestionDeps = platformFontDeps()
): Promise<FontSuggestions> {
  if (cached !== null) return Promise.resolve(cached);
  if (inFlight !== null) return inFlight;
  const run = readFontSuggestions(deps).then(
    (found) => {
      inFlight = null;
      if (found === null) return NO_FONT_SUGGESTIONS;
      cached = found;
      return found;
    },
    () => {
      inFlight = null;
      return NO_FONT_SUGGESTIONS;
    }
  );
  inFlight = run;
  return run;
}

/** Drop the cache. The tests are the only caller; nothing in the product is. */
export function resetFontSuggestions(): void {
  cached = null;
  inFlight = null;
}
