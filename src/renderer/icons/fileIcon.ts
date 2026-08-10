/**
 * fileIcon — VS Code-style file/folder icons for the Files tree.
 *
 * Theme: material-icon-theme (npm, MIT — © Philipp Kief; license verified
 * 2026-08-09; the most-installed VS Code file-icon theme, so the tree reads
 * instantly to VS Code users). A curated subset of its 16-grid SVGs plus its
 * own filename/extension alias maps is embedded at build time — see
 * generate-file-icons.mjs / file-icons.generated.ts for the how and why.
 *
 * Matching mirrors VS Code: exact (lowercased) filename first, then
 * progressively shorter dotted suffixes ("a.test.ts" → "test.ts" → "ts"),
 * then the theme's default file icon. Folders resolve by basename with
 * distinct closed/open variants ("src" → folder-src / folder-src-open).
 */
import { createElement } from 'react';
import type { FC } from 'react';
import { InlineSvg } from './InlineSvg';
import {
  DEFAULT_FILE_ICON,
  DEFAULT_FOLDER_ICON,
  DEFAULT_FOLDER_OPEN_ICON,
  EXT_TO_ICON,
  FILE_ICON_SVGS,
  FOLDER_NAME_TO_ICON,
  FOLDER_OPEN_NAME_TO_ICON,
  NAME_TO_ICON
} from './file-icons.generated';

export interface FileIconProps {
  /** Square edge in px (default 16; icons are drawn on a 16 grid). */
  size?: number;
  className?: string;
}

export interface FileIconOptions {
  /** True when the entry is a directory. */
  dir?: boolean;
  /** Directories only: expanded (open) state. */
  expanded?: boolean;
}

function resolveIconId(name: string, options?: FileIconOptions): string {
  const lower = name.toLowerCase();
  if (options?.dir) {
    return options.expanded
      ? (FOLDER_OPEN_NAME_TO_ICON[lower] ?? DEFAULT_FOLDER_OPEN_ICON)
      : (FOLDER_NAME_TO_ICON[lower] ?? DEFAULT_FOLDER_ICON);
  }
  const byName = NAME_TO_ICON[lower];
  if (byName !== undefined) return byName;
  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const byExt = EXT_TO_ICON[parts.slice(i).join('.')];
    if (byExt !== undefined) return byExt;
  }
  return DEFAULT_FILE_ICON;
}

/** One stable component per icon id — cheap to call per row, and React sees
 *  the same component identity across renders (no remount churn). */
const componentCache = new Map<string, FC<FileIconProps>>();

/**
 * Resolve a basename (file or directory — pass options.dir for directories)
 * to an icon component: `const Icon = getFileIcon(node.name, { dir, expanded });
 * <Icon size={16} />`. Unknown files get the theme's generic file icon.
 */
export function getFileIcon(name: string, options?: FileIconOptions): FC<FileIconProps> {
  const id = resolveIconId(name, options);
  const cached = componentCache.get(id);
  if (cached !== undefined) return cached;
  const svg = FILE_ICON_SVGS[id] ?? FILE_ICON_SVGS[DEFAULT_FILE_ICON] ?? '';
  const Icon: FC<FileIconProps> = ({ size = 16, className }) =>
    createElement(InlineSvg, {
      svg,
      size,
      ...(className !== undefined ? { className } : {})
    });
  Icon.displayName = `FileIcon(${id})`;
  componentCache.set(id, Icon);
  return Icon;
}
