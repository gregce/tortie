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
  const plugins: PluggableList = [
    // 1. raw HTML in the source becomes real nodes…
    rehypeRaw,
    // 2. …then everything, ours and theirs, goes through the allowlist…
    [rehypeSanitize, gmuxMarkdownSchema]
  ];
  if (highlighter !== null) {
    // 3. …and only then do we add the inline styles we intend to keep.
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
