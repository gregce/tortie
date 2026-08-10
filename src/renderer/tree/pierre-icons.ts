/**
 * Pierre tree icon config — ports the Phase 9 material-icon-theme subset
 * (src/renderer/icons/file-icons.generated.ts) into @pierre/trees' shadow-DOM
 * icon system: every icon becomes a `<symbol>` in one custom sprite sheet,
 * and the theme's filename/extension alias maps drive `byFileName` /
 * `byFileExtension`. `set: 'none'` keeps Pierre's own file-icon vocabulary
 * out of the way (its minimal sheet still supplies the chevron/dot slots);
 * the default-file slot is remapped to the material default.
 *
 * Directories: @pierre/trees puts the chevron in a folder row's only icon
 * slot and resolves per-path icons for the file slot alone, so the theme's
 * 122 per-basename folder variants have no surface to attach to. The generic
 * closed/open pair still does — FOLDER_ICON_CSS below paints it as a second
 * icon column in the shadow root, giving the row the chevron 12 · icon 16
 * anatomy DESIGN.md §3 specifies. Files get a matching leading gap so both
 * kinds keep one icon column and the indent guides stay put.
 */

import type { FileTreeIconConfig, RemappedIcon } from '@pierre/trees';
import {
  DEFAULT_FILE_ICON,
  EXT_TO_ICON,
  FILE_ICON_SVGS,
  FOLDER_ICON_SVGS,
  NAME_TO_ICON
} from '../icons/file-icons.generated';

/** Namespaces our symbol ids away from Pierre's `file-tree-*` sprite ids. */
const SYMBOL_PREFIX = 'mit-';

/**
 * `<svg …viewBox="0 0 32 32">inner</svg>` → `<symbol id viewBox>inner</symbol>`.
 * The symbol keeps its own viewBox, so Pierre's 16px `<use>` wrapper scales
 * the 32-grid material art without distortion.
 */
function toSymbol(id: string, svg: string): string {
  const openEnd = svg.indexOf('>');
  const inner = svg.slice(openEnd + 1, svg.lastIndexOf('</svg>'));
  const viewBox =
    /viewBox="([^"]+)"/.exec(svg.slice(0, openEnd + 1))?.[1] ?? '0 0 32 32';
  return `<symbol id="${SYMBOL_PREFIX}${id}" viewBox="${viewBox}">${inner}</symbol>`;
}

function prefixValues(map: Record<string, string>): Record<string, RemappedIcon> {
  const out: Record<string, RemappedIcon> = {};
  for (const [key, iconId] of Object.entries(map)) {
    out[key] = SYMBOL_PREFIX + iconId;
  }
  return out;
}

/** `<svg …>` → a `url(...)` value usable as a CSS background-image. */
function toCssUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Folder art for the shadow root (merged into the tree's `unsafeCSS`).
 *
 * The icon lane widens to hold two glyphs for EVERY row: folders put the
 * chevron left and the folder icon right; files leave the chevron position
 * empty and right-align their icon into the same column. Both kinds therefore
 * share one icon column and one text column, and because the change is inside
 * the icon lane the depth-indent guides — which are measured from
 * `--trees-icon-width`, untouched here — keep running through the chevrons.
 */
export const FOLDER_ICON_CSS = `
[data-item-section="icon"] {
  width: calc(var(--trees-icon-width) * 2 + var(--trees-item-row-gap));
  justify-content: flex-end;
}

[data-item-type="folder"] > [data-item-section="icon"] {
  justify-content: space-between;
}

[data-item-type="folder"] > [data-item-section="icon"]::after {
  content: "";
  flex: 0 0 auto;
  width: var(--trees-icon-width);
  height: var(--trees-icon-width);
  background: ${toCssUrl(FOLDER_ICON_SVGS.closed)} center / contain no-repeat;
}

[data-item-type="folder"][aria-expanded="true"] > [data-item-section="icon"]::after {
  background-image: ${toCssUrl(FOLDER_ICON_SVGS.open)};
}
`;

let cached: FileTreeIconConfig | null = null;

/**
 * The one icon config for every Pierre tree instance. Built lazily (the
 * sprite sheet concatenates 257 SVGs) and cached — a stable object identity
 * also lets @pierre/trees skip re-injecting the sheet.
 */
export function getPierreTreeIcons(): FileTreeIconConfig {
  if (cached !== null) return cached;
  const symbols = Object.entries(FILE_ICON_SVGS)
    .map(([id, svg]) => toSymbol(id, svg))
    .join('');
  cached = {
    set: 'none',
    // width/height 0 like Pierre's own sheets — a bare <svg> is a 300x150
    // replaced element and would occupy layout in the host's flex column.
    spriteSheet: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0">${symbols}</svg>`,
    byFileName: prefixValues(NAME_TO_ICON),
    byFileExtension: prefixValues(EXT_TO_ICON),
    remap: { 'file-tree-icon-file': SYMBOL_PREFIX + DEFAULT_FILE_ICON }
  };
  return cached;
}
