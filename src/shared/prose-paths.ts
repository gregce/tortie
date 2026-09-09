/**
 * Which files are PROSE, and therefore which files the redline draws and the
 * baseline store keeps.
 *
 * PHASE 243 MOVED THE SET HERE AND CHANGED NOTHING IN IT. The list has lived
 * in `src/renderer/editor/redline.ts` since Phase 191 and `isRedlinePath`
 * still exports it from there, unchanged and still pinned by
 * `conformance:redline` rule 1. What Phase 243 added is a SECOND asker in a
 * process that cannot import the renderer: `src/main/baselines/store.ts`
 * refuses to keep a baseline for a file the redline would never draw, and a
 * durable store whose idea of prose drifts from the view's would either fill
 * a person's data directory with code it can never use or refuse a file the
 * view is drawing. One list, two askers.
 *
 * The set is deliberately narrow, and the reason is the one Phase 191 wrote:
 * this is a READING aid over prose, and a file somebody opened to read as
 * code must not be treated as words.
 */

/** The prose extensions, lower case and without the dot. */
export const PROSE_EXTENSIONS: ReadonlySet<string> = new Set([
  'md',
  'markdown',
  'mdown',
  'mkd',
  'mdx',
  'txt',
  'text'
]);

/**
 * True for the prose extensions above (case-insensitive).
 *
 * The base name is taken with a plain split on both separators rather than
 * through `node:path`, because this module is imported by the renderer, by
 * the preload and by main, and only one of the three has `node:path`.
 */
export function isProsePath(path: string): boolean {
  const name = (path.split(/[/\\]/).pop() ?? '').toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  return PROSE_EXTENSIONS.has(name.slice(dot + 1));
}
