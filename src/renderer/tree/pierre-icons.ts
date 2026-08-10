/**
 * Pierre tree icon config — ports the Phase 9 material-icon-theme subset
 * (src/renderer/icons/file-icons.generated.ts) into @pierre/trees' shadow-DOM
 * icon system: every icon becomes a `<symbol>` in one custom sprite sheet,
 * and the theme's filename/extension alias maps drive `byFileName` /
 * `byFileExtension`. `set: 'none'` keeps Pierre's own file-icon vocabulary
 * out of the way (its minimal sheet still supplies the chevron/dot slots);
 * the default-file slot is remapped to the material default.
 *
 * Directories: @pierre/trees renders a chevron in the leading icon slot by
 * design — there is no per-row folder icon surface, so the material folder
 * variants do not port (see the Phase 11 tree-swap notes).
 */

import type { FileTreeIconConfig, RemappedIcon } from '@pierre/trees';
import {
  DEFAULT_FILE_ICON,
  EXT_TO_ICON,
  FILE_ICON_SVGS,
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
