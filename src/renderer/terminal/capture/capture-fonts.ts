/**
 * The bundled face, as `@font-face` rules the capture SVG can carry (Phase 78).
 *
 * `rasterize.ts` serialises the terminal into an SVG inside a `data:` URL. That
 * SVG is an ISOLATED document. Chromium does not apply the host page's
 * `@font-face` rules inside it and fetches nothing from it, which is exactly
 * why the canvas is never tainted. So a preset that changed the screen used to
 * leave the exported PNG in Menlo, with no error anywhere. Measured, probe P6:
 * the un-inlined SVG render sat 0 ink pixels from a Menlo render of the same
 * text and 2,838 of 16,758 pixels from the screen. The fix is to carry
 * the bytes into the isolated document, base64 inline, where the CSP already
 * permits them (`font-src 'self' data:` in both entry documents).
 *
 * Two rules about which faces are inlined:
 *
 *   - The regular face goes in whenever a bundled preset is active.
 *   - The bold face goes in ONLY when the serialized HTML holds a bold run.
 *     `serialize.ts` emits `font-weight:bold` for bold cells. Measured (probe
 *     P6b, Electron 43.3.0): with no face at all the bold run comes out as
 *     Menlo Bold, 2,333 of 16,554 ink pixels away from the screen. With the
 *     regular face alone Chromium does NOT fall back to Menlo. It synthesises
 *     an emboldened form of the bundled face, which is closer but still 1,673
 *     of 15,840 ink pixels away, about 10.6 percent. With both members the
 *     difference is 0 pixels. Paying for bold only when there is bold on
 *     screen keeps the common capture at 123,032 extra bytes for JetBrains
 *     Mono instead of 249,296.
 *
 * The bytes arrive through a LAZY dynamic `?inline` import. Two reasons, both
 * load bearing. The renderer loads over `file://`, so `fetch` of an asset URL
 * is not available. And a static import would put 454,384 bytes of base64 into
 * the eager renderer bundle, which no session that never captures should pay
 * for. Measured after this phase: four lazy chunks of 122,990, 126,216,
 * 101,910 and 103,268 bytes, none of them reachable from the entry chunk. `vite/client` already declares `*?inline` as `const src: string`,
 * and `src/renderer/env.d.ts` already references it, so no new type
 * declaration is involved.
 */

import type { WorkAreaFont } from '@shared/settings';
import { useWorkAreaFont, workFont } from '../../theme/work-fonts';

/** A preset that ships bytes. The System preset ships none, and neither does
 *  the Custom preset — a user-installed face has no bytes Tortie can inline,
 *  so it falls back to Menlo in a capture exactly the way System does. */
export type BundledWorkAreaFont = Exclude<WorkAreaFont, 'system' | 'custom'>;

/** The two members of a preset. No italic face ships (see the header). */
export type FaceWeight = 'regular' | 'bold';

/** CSS `font-weight` for each member, so the SVG can pick the right one. */
const CSS_WEIGHT: Record<FaceWeight, number> = { regular: 400, bold: 700 };

const FACE_MODULES: Record<
  BundledWorkAreaFont,
  Record<FaceWeight, () => Promise<{ default: string }>>
> = {
  'jetbrains-mono': {
    regular: () => import('../../assets/fonts/JetBrainsMono-Regular.woff2?inline'),
    bold: () => import('../../assets/fonts/JetBrainsMono-Bold.woff2?inline')
  },
  'source-code-pro': {
    regular: () =>
      import('../../assets/fonts/SourceCodePro-Regular.otf.woff2?inline'),
    bold: () => import('../../assets/fonts/SourceCodePro-Bold.otf.woff2?inline')
  }
};

/**
 * Reads one member of one preset as a `data:font/woff2;base64,…` string.
 *
 * The parameter exists so a unit test can hand `faceCssFor` a fake without a
 * bundler. The woff2 files are Vite assets, and a test runner outside Vite's
 * asset pipeline cannot resolve them.
 */
export type FaceBytesLoader = (
  preset: BundledWorkAreaFont,
  weight: FaceWeight
) => Promise<string>;

async function bundledFaceDataUrl(
  preset: BundledWorkAreaFont,
  weight: FaceWeight
): Promise<string> {
  return (await FACE_MODULES[preset][weight]()).default;
}

/**
 * True when this serialized capture has at least one bold run in it.
 *
 * The marker is `serialize.ts`'s own output for a bold cell. It survives
 * `escapeAttr`, which only touches `&`, `<`, `>` and `"`, so a substring test
 * over the finished HTML is exact rather than approximate.
 */
export function hasBoldRuns(html: string): boolean {
  return html.includes('font-weight:bold');
}

/**
 * The `@font-face` rules to place inside the capture SVG, or `''` for a preset
 * that ships no bytes.
 *
 * `''` is the System preset's byte identity guarantee. `buildCaptureSvg` with
 * an empty string returns exactly the string the pre-Phase-78 code returned.
 *
 * Base64 needs no XML escaping. It uses `A-Za-z0-9+/=` and the family names
 * carry no `&` or `<` either, so the rules go into the `<style>` element's text
 * content as they are.
 */
export async function faceCssFor(
  preset: WorkAreaFont,
  options: { bold: boolean },
  load: FaceBytesLoader = bundledFaceDataUrl
): Promise<string> {
  // Two guards for one fact. The first narrows the id so the loader can be
  // called without a cast. The second is the preset table's own answer, and a
  // row that names no family has no bytes to inline.
  if (preset === 'system' || preset === 'custom') return '';
  const family = workFont(preset).familyName;
  if (family === null) return '';
  const weights: FaceWeight[] = options.bold
    ? ['regular', 'bold']
    : ['regular'];
  const rules = await Promise.all(
    weights.map(async (weight) => {
      const url = await load(preset, weight);
      return (
        '@font-face{' +
        `font-family:"${family}";` +
        'font-style:normal;' +
        `font-weight:${CSS_WEIGHT[weight]};` +
        // `block` rather than the default `auto`. The SVG is rasterised the
        // instant `img.decode()` resolves, and a swap period would let that
        // one frame land in the fallback face.
        'font-display:block;' +
        `src:url("${url}") format("woff2")` +
        '}'
      );
    })
  );
  return rules.join('');
}

/**
 * The preset the work area is drawing with right now.
 *
 * `apply.ts` is the only writer of that store, so this is the same value the
 * `--font-terminal` token carries. Reading the token instead would mean
 * matching a family stack back to a preset id, which is a second source of
 * truth for no gain.
 */
export function currentWorkAreaFont(): WorkAreaFont {
  return useWorkAreaFont.getState().preset;
}
