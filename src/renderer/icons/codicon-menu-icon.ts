/**
 * Codicon marks for NATIVE menus (Phase 153).
 *
 * The sibling `agent-menu-icon.ts` does this for the vendor marks. This file
 * does it for the UI glyphs, and the two work the same way for the same
 * reason: DESIGN.md §3 makes every menu a macOS menu, so an icon has to reach
 * main as pixels rather than as a `<span class="codicon">` React can mount.
 *
 * WHERE THE GLYPH COMES FROM, and it is the point of the file. The codicon set
 * is an icon FONT, and the name to character map lives in the one stylesheet
 * `Codicon.tsx` already loads. This file reads that map back out of the
 * document with `getComputedStyle(el, '::before')`, so a menu row and the DOM
 * surface beside it are drawing the same character out of the same font file.
 * They cannot drift, because there is no second table to keep in step.
 *
 * Every mark is painted flat black and flagged `template`, so macOS owns the
 * tint for light and dark, for the highlighted row and for a disabled one.
 * That is what makes a greyed row's icon grey with it.
 *
 * Everything here is best effort, the rule `agent-menu-icon.ts` states: a menu
 * with no icons is a fine menu, a menu that failed to open is not. In a test
 * environment there is no document and no canvas, so `menuGlyph` returns an
 * empty object and every builder composes exactly the rows it composed before.
 */

import '@vscode/codicons/dist/codicon.css';
import type { PopupMenuIcon } from '@shared/ipc';

/** Physical pixels; 16pt × 2 for Retina, the same as an agent mark. */
const PX = 32;

/**
 * THE TABLE MOVED TO `src/shared/menu-codicons.ts` (Phase 156).
 *
 * It went there because the application menu bar and the tray menu now wear
 * the same marks, and both are built in main, which may not import the
 * renderer. Both names are re-exported here unchanged, so every existing
 * renderer call site reads exactly as it did. The reasoning for every chosen
 * mark went with the table, which is where a reviewer looks for the whole set.
 */
export { MENU_CODICONS } from '@shared/menu-codicons';
export type { MenuCodicon } from '@shared/menu-codicons';

import { MENU_CODICONS } from '@shared/menu-codicons';
import type { MenuCodicon } from '@shared/menu-codicons';

const cache = new Map<string, PopupMenuIcon>();

/**
 * The character the stylesheet binds to `codicon-<name>`, or null.
 *
 * A hidden probe span is the only way to ask CSS what a `::before` rule says,
 * and it is why this reads the SAME rule the visible glyph beside it reads.
 */
function glyphOf(name: string): string | null {
  const doc = (globalThis as { document?: Document }).document;
  if (doc === undefined || doc.body === null) return null;
  const probe = doc.createElement('span');
  probe.className = `codicon codicon-${name}`;
  probe.setAttribute(
    'style',
    'position:absolute;left:-9999px;top:0;visibility:hidden'
  );
  doc.body.appendChild(probe);
  try {
    const view = doc.defaultView;
    if (view === null) return null;
    const raw = view.getComputedStyle(probe, '::before').content;
    // Chromium returns the value quoted, e.g. `"\ea81"` rendered as `"<char>"`.
    const inner = /^(?:"([^"]*)"|'([^']*)')$/.exec(raw);
    const ch = inner?.[1] ?? inner?.[2] ?? '';
    return ch.length > 0 ? ch : null;
  } catch {
    return null;
  } finally {
    probe.remove();
  }
}

/** One character → a 32×32 flat black PNG data URL, or null. */
function rasterize(ch: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = PX;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return null;
    ctx.clearRect(0, 0, PX, PX);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // The em box IS the 16px design grid, so a 32px em fills a 32px bitmap at
    // exactly the proportions the DOM draws at `size={16}`.
    ctx.font = `${PX}px codicon`;
    ctx.fillText(ch, PX / 2, PX / 2);
    return canvas.toDataURL('image/png');
  } catch {
    // Canvas unavailable (jsdom, tainted context) — no icon, no drama.
    return null;
  }
}

let warmed: Promise<void> | null = null;

/**
 * Rasterize every mark in `MENU_CODICONS`, once per app run.
 *
 * The font is asked for first, because `font-display: block` means the face is
 * not fetched until something draws with it, and a canvas asked to draw a
 * character the font has not delivered paints the fallback family's blank box.
 * A menu opened before this resolves is a menu with no icons rather than a
 * menu with wrong ones.
 */
export function warmMenuIcons(): Promise<void> {
  if (warmed !== null) return warmed;
  warmed = (async (): Promise<void> => {
    const doc = (globalThis as { document?: Document }).document;
    if (doc === undefined) return;
    try {
      await doc.fonts.load(`${PX}px codicon`);
    } catch {
      // No FontFaceSet (jsdom) — the draw below decides for itself.
    }
    for (const name of MENU_CODICONS) {
      const ch = glyphOf(name);
      if (ch === null) continue;
      const dataUrl = rasterize(ch);
      if (dataUrl === null) continue;
      cache.set(name, { dataUrl, template: true });
    }
  })();
  return warmed;
}

/**
 * The `icon` field for a menu row, ready to spread.
 *
 * It is a spread rather than a value so a call site reads as one line and so a
 * mark that is not there yields no key at all, which is what keeps the shape
 * of every existing menu unchanged under test.
 */
export function menuGlyph(name: MenuCodicon): { icon?: PopupMenuIcon } {
  const icon = cache.get(name);
  return icon === undefined ? {} : { icon };
}

/**
 * Every mark the warm pass rasterized, as `name → data URL` (Phase 156).
 *
 * ONE READER, NOT A SECOND RASTERIZER. `build/generate-menu-icons.mjs` drives
 * the real built renderer, awaits `warmMenuIcons()` and then calls this, so
 * the bytes it commits into `src/main/menu-icons.generated.ts` come out of the
 * cache above rather than out of a second copy of `glyphOf` and `rasterize`.
 * That is what makes the generated set the SAME set the right click menus draw
 * from, and it is why this phase adds no second icon table.
 *
 * Nothing in the product calls it. It exists for the generator and for a test.
 */
export function warmedMenuIcons(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, icon] of cache) out[name] = icon.dataUrl;
  return out;
}
