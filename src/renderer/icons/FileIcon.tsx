/**
 * FileIcon — the material-icon-theme glyph for a filename, as a plain React
 * icon.
 *
 * The tree gets its icons through the @pierre/trees sprite sheet
 * (src/renderer/tree/pierre-icons.ts) because that component renders in shadow
 * DOM. Ordinary DOM surfaces — editor tabs today — need the same vocabulary
 * without the sprite machinery, and they must resolve a name to an icon by the
 * SAME rules, or a file would wear two different icons in one window.
 * Both consumers read the generated maps; this module owns the lookup.
 */

import type { FC } from 'react';
import {
  DEFAULT_FILE_ICON,
  EXT_TO_ICON,
  FILE_ICON_SVGS,
  NAME_TO_ICON
} from './file-icons.generated';
import { InlineSvg } from './InlineSvg';

/**
 * material-icon-theme's own precedence: exact filename first (`Dockerfile`,
 * `tsconfig.json`), then the longest matching extension (`.test.ts` before
 * `.ts`), then the default file glyph.
 */
export function fileIconIdFor(pathOrName: string): string {
  const name = pathOrName.slice(pathOrName.lastIndexOf('/') + 1).toLowerCase();
  const exact = NAME_TO_ICON[name];
  if (exact !== undefined) return exact;
  let from = name.indexOf('.');
  while (from !== -1) {
    const ext = name.slice(from + 1);
    const byExt = EXT_TO_ICON[ext];
    if (byExt !== undefined) return byExt;
    from = name.indexOf('.', from + 1);
  }
  return DEFAULT_FILE_ICON;
}

export interface FileIconProps {
  /** Absolute path or bare filename. */
  path: string;
  /** Box size in px (DESIGN.md §3 file rows use 16; editor tabs 14). */
  size?: number;
  className?: string;
}

export const FileIcon: FC<FileIconProps> = ({ path, size = 16, className }) => {
  const id = fileIconIdFor(path);
  const svg = FILE_ICON_SVGS[id] ?? FILE_ICON_SVGS[DEFAULT_FILE_ICON] ?? '';
  return <InlineSvg svg={svg} size={size} {...(className ? { className } : {})} />;
};
