/**
 * A menu row's mark, as a `NativeImage` (Phase 156 extracted it from
 * `./menu-popup.ts`, where Phase 153 wrote it).
 *
 * ## Why this is its own module
 *
 * Until Phase 156 there was one place in main that turned a PNG data URL into
 * a menu icon, and it was the `ui:popupMenu` handler, because right click menus
 * were the only native menus wearing marks. Phase 156 put marks on the
 * application menu bar and on the tray menu, so three call sites now need the
 * same ten lines. The growth guardrail names that case directly: a duplicated
 * ten line block gets extracted rather than copied. `./menu-popup.ts`,
 * `./menu.ts` and `./tray/index.ts` all call in here.
 *
 * ## Where the bytes come from, and it differs by caller
 *
 * The popup handler is handed its bytes over the bridge by the renderer, which
 * rasterized them from the codicon font at the moment the menu opened. The
 * menu bar and the tray read theirs from `./menu-icons.generated.ts`, which the
 * build time generator produced from that same rasterizer. Two sources, one
 * decoder, and one closed set of names behind both.
 *
 * ## Best effort, always
 *
 * The rule `src/renderer/icons/agent-menu-icon.ts` states and this file keeps:
 * a menu with no icons is a fine menu, a menu that failed to open is not. Every
 * failure here answers null, and every call site spreads the result so a null
 * yields no `icon` key at all and the row is composed exactly as it was before.
 */

import { nativeImage } from 'electron';
import type { PopupMenuIcon } from '@shared/ipc';
import type { MenuCodicon } from '@shared/menu-codicons';
import { MENU_ICON_PNGS } from './menu-icons.generated';

const PREFIX = 'data:image/png;base64,';

/**
 * A rasterized menu icon → NativeImage at 16pt.
 *
 * The PNG arrives at 32×32 physical pixels; scaleFactor 2 is what makes it a
 * 16pt image rather than a 32pt one. Template images let macOS tint the alpha
 * for light/dark, highlight and disabled — which is the whole reason the
 * monochrome marks look right greyed out.
 */
export function menuIcon(
  icon: PopupMenuIcon | undefined
): Electron.NativeImage | null {
  if (icon === undefined) return null;
  const comma = icon.dataUrl.indexOf(',');
  if (!icon.dataUrl.startsWith(PREFIX) || comma < 0) return null;
  try {
    const img = nativeImage.createFromBuffer(
      Buffer.from(icon.dataUrl.slice(comma + 1), 'base64'),
      { scaleFactor: 2 }
    );
    if (img.isEmpty()) return null;
    if (icon.template) img.setTemplateImage(true);
    return img;
  } catch {
    // A bad icon must never cost the user their menu.
    return null;
  }
}

/**
 * Decoded marks, one per name, decoded at most once per app run.
 *
 * The menu bar is rebuilt on every recents change, every update state change,
 * every machines change and every hotkey change, and the tray menu is rebuilt
 * on every full session broadcast. Decoding sixty PNGs on each of those would
 * be work nobody asked for, and a `NativeImage` is immutable once built.
 */
const decoded = new Map<string, Electron.NativeImage | null>();

/**
 * The `icon` field for a native menu row built in MAIN, ready to spread.
 *
 * It is a spread rather than a value for the reason `menuGlyph` in the renderer
 * is: a call site reads as one line, and a mark that is not there yields no key
 * at all, which is what keeps every menu's shape unchanged when the generated
 * set is missing a name or the module failed to load.
 *
 * The name is a `MenuCodicon`, so a builder cannot type a glyph the generator
 * never produced and silently get no icon. That union and the generated set are
 * both derived from the one table in `src/shared/menu-codicons.ts`, and
 * `build/assert-menu-glyphs.mjs` proves they agree name for name.
 */
export function nativeMenuGlyph(name: MenuCodicon): {
  icon?: Electron.NativeImage;
} {
  let img = decoded.get(name);
  if (img === undefined) {
    const dataUrl = MENU_ICON_PNGS[name];
    img =
      dataUrl === undefined ? null : menuIcon({ dataUrl, template: true });
    decoded.set(name, img);
  }
  return img === null ? {} : { icon: img };
}
