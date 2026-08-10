/**
 * Lazy loader for the markdown chunk — the same contract monaco-loader.ts
 * has with monaco-impl.ts: the shell never pays for react-markdown, the
 * remark/rehype stack or Shiki's rehype adapter until a .md file is first
 * previewed, and one failed load can be retried by opening it again.
 */

import type * as MarkdownImpl from './markdown-impl';

export type MarkdownModule = typeof MarkdownImpl;

let loadPromise: Promise<MarkdownModule> | null = null;
let loaded: MarkdownModule | null = null;

/** Load (once) and return the markdown renderer. Rejects on chunk failure. */
export function loadMarkdown(): Promise<MarkdownModule> {
  if (loadPromise === null) {
    loadPromise = import('./markdown-impl').then((m) => {
      loaded = m;
      return m;
    });
    loadPromise.catch(() => {
      loadPromise = null; // let a later open retry after a failed load
    });
  }
  return loadPromise;
}

/** The module if it is already in memory — lets the first paint skip a tick. */
export function getLoadedMarkdown(): MarkdownModule | null {
  return loaded;
}
