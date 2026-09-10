/**
 * The rehype half of the markdown pipeline — schema and PLUGIN ORDER.
 *
 * Both are load-bearing and both fail SILENTLY when wrong, which is why they
 * live in one exported function with a unit test over it
 * (__tests__/pipeline.test.ts) rather than inline in the component:
 *
 *  1. ORDER must be raw → sanitize → shiki. `style` is not in
 *     hast-util-sanitize's default `'*'` allowlist, so highlighting BEFORE
 *     sanitize strips every colour and each fence renders monochrome with no
 *     error anywhere. Highlighting after means the styles we allow are the
 *     ones we generated a moment earlier.
 *  2. `lazy` must stay false. Its own docs: enabling it "requires the unified
 *     pipeline to be async", and react-markdown's `<Markdown>` is synchronous
 *     — so the caller preloads the languages first (see markdown-impl.tsx)
 *     and this transform stays sync.
 *
 * The schema is otherwise the default: a rendered README is untrusted input
 * that arrived from a checked-out repository.
 */

import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { HighlighterGeneric } from '@shikijs/types';
import type { PluggableList } from 'unified';

/** The scheme main serves local images on (src/main/assets/protocol.ts). */
export const ASSET_PROTOCOL = 'gmux-asset';

type AttrList = NonNullable<typeof defaultSchema.attributes>[string];

function withAttrs(tag: string, extra: AttrList): AttrList {
  return [...(defaultSchema.attributes?.[tag] ?? []), ...extra];
}

/**
 * The default sanitize schema plus exactly what this surface needs — and
 * deliberately NOT `style`.
 *
 * Leaving `style` out is what gives the plugin order teeth: the only inline
 * styles that can reach the DOM are the ones Shiki writes AFTER the sanitizer
 * has run, never any a checked-out README wrote itself. (A README that could
 * set `position:fixed` could paint over the app.)
 *
 * What is added:
 *  - `gmux-asset` as an image protocol. Relative `src` values are rewritten
 *    to it by the `img` component after the pipeline, so today this is
 *    defence in depth — but the moment anyone moves that rewrite into a
 *    rehype plugin, its absence strips every image with no error (trap 2).
 *  - GFM task-list checkboxes, and the `<details>`/`<summary>` pair every
 *    other README uses.
 */
export const gmuxMarkdownSchema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'details', 'summary'],
  attributes: {
    ...defaultSchema.attributes,
    img: withAttrs('img', ['src', 'alt', 'title', 'width', 'height', 'loading']),
    input: withAttrs('input', ['type', 'checked', 'disabled']),
    details: ['open'],
    a: withAttrs('a', ['target', 'rel'])
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), ASSET_PROTOCOL],
    href: [...(defaultSchema.protocols?.href ?? []), ASSET_PROTOCOL]
  }
};

/**
 * Sanitize, then highlight: the tail every path shares, and the ORDER the
 * header's point 1 is about. Spelled once, so the preview's remark chain,
 * the answer's chain and the windowed chunk path (Phase 255) cannot drift.
 */
function sanitizeThenHighlight(
  highlighter: HighlighterGeneric<string, string> | null,
  theme: string
): PluggableList {
  // Everything, ours and theirs, goes through the allowlist…
  const plugins: PluggableList = [[rehypeSanitize, gmuxMarkdownSchema]];
  if (highlighter !== null) {
    // …and only then do we add the inline styles we intend to keep.
    plugins.push([
      rehypeShikiFromHighlighter,
      highlighter,
      {
        theme,
        lazy: false,
        addLanguageClass: true,
        fallbackLanguage: 'text',
        defaultLanguage: 'text'
      }
    ]);
  }
  return plugins;
}

/**
 * The rehype plugin list, in the one order that works.
 *
 * @param highlighter Shiki highlighter with the gmux theme and the document's
 *   languages already attached, or null to render fences unhighlighted (the
 *   highlighter failed to load — better plain code than no code).
 * @param theme       registered theme name to colour with.
 */
export function markdownRehypePlugins(
  highlighter: HighlighterGeneric<string, string> | null,
  theme: string
): PluggableList {
  // Raw HTML in the source becomes real nodes, then sanitize, then Shiki.
  return [rehypeRaw, ...sanitizeThenHighlight(highlighter, theme)];
}

/**
 * The rehype plugin list for ONE CHUNK of the windowed preview (Phase 255):
 * the same schema, the same sanitizer, the same Shiki step, in the same
 * order.
 *
 * `rehype-raw` is absent because its work is already DONE, not because raw
 * HTML is refused: chunk-parse.ts hands this list a tree that parse5 built
 * from markdown-it's output, which is the same parser rehype-raw runs, so
 * every raw tag in the file is already a node when the sanitizer sees it.
 * Running rehype-raw again would re-serialize the whole tree through parse5
 * for nothing, which research 117 §2.2 measured as the second largest stage
 * of the old pipeline. The promise that matters is unchanged: all raw HTML
 * becomes nodes, the sanitizer runs over all of them, and only then are
 * Shiki's styles added.
 */
export function previewChunkRehypePlugins(
  highlighter: HighlighterGeneric<string, string> | null,
  theme: string
): PluggableList {
  return sanitizeThenHighlight(highlighter, theme);
}

/**
 * The rehype plugin list for an AGENT'S ANSWER (Phase 137.1) — the same
 * schema, the same sanitizer, the same Shiki step, and NO `rehype-raw`.
 *
 * The difference from `markdownRehypePlugins` is deliberate and permanent.
 * A README is a file the person chose to open, so raw HTML in it is parsed
 * into nodes and then sanitized. An answer is an agent's bytes arriving on
 * a page the person opened for a different reason, so raw HTML in it never
 * becomes a node at all: with `rehype-raw` absent, react-markdown drops
 * every raw HTML fragment before the tree reaches the DOM, and
 * `rehype-sanitize` stays in the chain as the second wall. The Phase 137.1
 * backlog entry forbids `rehype-raw` in the overview's chain, ever.
 *
 * Sanitize still runs BEFORE Shiki for the reason the file header gives:
 * the only inline styles that may reach the DOM are the ones Shiki writes
 * after the allowlist has run.
 */
export function answerRehypePlugins(
  highlighter: HighlighterGeneric<string, string> | null,
  theme: string
): PluggableList {
  return sanitizeThenHighlight(highlighter, theme);
}
