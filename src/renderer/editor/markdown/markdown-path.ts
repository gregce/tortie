/**
 * Which files render as markdown. Deliberately narrow: the preview is a
 * READING surface, and a file the user opened to edit must not be hijacked
 * into a rendered view because its extension looked documentation-shaped.
 */

import { baseName } from '../paths';

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd', 'mdx']);

/** True for `.md` and its established spellings (case-insensitive). */
export function isMarkdownPath(path: string): boolean {
  const name = baseName(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  return MARKDOWN_EXTENSIONS.has(name.slice(dot + 1));
}
