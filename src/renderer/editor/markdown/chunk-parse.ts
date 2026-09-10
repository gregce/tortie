/**
 * PHASE 255 — one chunk of the windowed preview, parsed fast and sanitized
 * the same.
 *
 * The old preview parsed with micromark (remark-parse), which research 117
 * measured as the whole cost of the render and a cost with cliffs: 2,469 ms
 * of the 3,583 ms pipeline on the 2.56 MB twin, and 105,947 ms for a 1 MB
 * GFM table with no blank lines, against 108 ms here (§2.3). This module
 * parses a chunk with markdown-it — VS Code's own webview parser, pinned
 * exactly and bundled into the lazily loaded markdown chunk — and then
 * hands the tree to THE SAME WALL the remark path uses:
 *
 *   markdown-it → an HTML string → parse5 → hast            (this module)
 *   → rehype-sanitize with gmuxMarkdownSchema → Shiki       (pipeline.ts)
 *   → react-markdown's own URL transform                    (this module)
 *   → hast-util-to-jsx-runtime with the preview's components (markdown-impl)
 *
 * THE HTML STRING IS PARSER IR, NOT OUTPUT. It never reaches
 * `dangerouslySetInnerHTML` and never reaches the DOM: parse5 turns it into
 * nodes (parse5 is the parser rehype-raw itself runs, so raw HTML in a file
 * becomes nodes exactly as it did), and every node crosses the sanitizer
 * before anything downstream sees it. Shiki's inline styles are added after
 * the sanitizer, which is the order promise pipeline.ts exists for.
 *
 * WHAT IS CONFIGURED, and each item is load-bearing for parity with the
 * remark-gfm render (research 117 §3.3, found by the corpus, not by reading):
 *
 *  - `fuzzyLink: false`. GFM does not link a bare `CLAUDE.md`; with fuzzy
 *    links on, 98 of 221 corpus files drew differently.
 *  - a `www.` schema. Fuzzy links off also stops linkify linking
 *    `www.example.com`, which GFM DOES link, as `http://www.example.com`.
 *    This repository's markdown holds no bare `www.` link, so the corpus
 *    could not see it; a battery of 34 shapes did, 3 of them matching remark
 *    without the schema and 24 with it. The rest differ only in which
 *    trailing quote, bracket or `&name;` joins the link, or in a host with an
 *    underscore before its last two labels, and conformance:preview names
 *    every one.
 *  - `s` drawn as `del`. remark-gfm draws `~~x~~` as `<del>`.
 *  - table alignment as an `align` attribute. markdown-it writes
 *    `style="text-align:…"`, the schema strips `style`, so without this
 *    every aligned table silently loses its alignment. remark-rehype writes
 *    `align`, which the default schema allows.
 *  - task lists through the pinned plugin, whose extra classes the
 *    sanitizer strips down to exactly what remark-gfm's output keeps.
 *  - react-markdown's `defaultUrlTransform` over the same URL attributes
 *    react-markdown walks, after the plugins, because the old path ran it
 *    there: it is a second wall that refuses a scheme the sanitizer allows
 *    (`gmux-asset:` written into a file by hand) and the old preview had it.
 *
 * WHAT IS LEFT AT ITS DEFAULT ON PURPOSE: markdown-it's `validateLink`,
 * which refuses `javascript:`, `vbscript:`, `file:` and non-image `data:`
 * links at parse time. remark made such a link an element and the sanitizer
 * stripped its href; markdown-it leaves the markdown as text. The sanitizer
 * is the wall either way, and turning a parser's refusal off to match a
 * weaker parser is a change nobody asked for.
 *
 * PURE ON PURPOSE: no React component, no DOM, no electron. The conformance
 * gate runs this exact module under node over the corpus, the twins and a
 * hostile fixture, and ablates each item above to prove it can fail.
 */

import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';
import { parseFragment } from 'parse5';
import { fromParse5 } from 'hast-util-from-parse5';
import { urlAttributes } from 'html-url-attributes';
import { defaultUrlTransform } from 'react-markdown';
import { unified } from 'unified';
import type { Nodes, Root } from 'hast';
import type { HighlighterGeneric } from '@shikijs/types';
import { previewChunkRehypePlugins } from './pipeline';

/** The chunk parser, configured for parity with remark-gfm (header). */
export function createChunkParser(): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true }).use(
    markdownItTaskLists
  );
  md.linkify.set({ fuzzyLink: false });
  md.linkify.add('www.', {
    validate(text, pos, self) {
      const re = self.re as Record<string, RegExp | string>;
      if (!(re['previewWww'] instanceof RegExp)) {
        // The same host and path the built-in `http:` schema accepts after
        // its `//`, compiled lazily for the same reason linkify-it does.
        re['previewWww'] = new RegExp(`^${String(re['src_host_port_strict'])}${String(re['src_path'])}`, 'i');
      }
      const m = (re['previewWww'] as RegExp).exec(text.slice(pos));
      return m === null ? 0 : m[0].length;
    },
    normalize(match) {
      match.url = `http://${match.url}`;
    }
  });
  md.renderer.rules['s_open'] = () => '<del>';
  md.renderer.rules['s_close'] = () => '</del>';
  md.core.ruler.push('preview_table_align', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'th_open' && token.type !== 'td_open') continue;
      const at = token.attrIndex('style');
      if (at < 0 || token.attrs === null) continue;
      const attr = token.attrs[at];
      if (attr === undefined) continue;
      const m = /^text-align:(left|center|right)$/.exec(attr[1]);
      if (m !== null) token.attrs[at] = ['align', m[1] as string];
    }
    return true;
  });
  return md;
}

/** The rehype half, frozen once per highlighter: sanitize, then Shiki. */
export type ChunkProcessor = ReturnType<typeof createChunkProcessor>;

export function createChunkProcessor(
  highlighter: HighlighterGeneric<string, string> | null,
  theme: string
) {
  return unified().use(previewChunkRehypePlugins(highlighter, theme)).freeze();
}

/**
 * react-markdown's own post-pass (react-markdown/lib/index.js `post`), over
 * the attributes react-markdown walks: a `raw` node becomes text, and every
 * URL attribute goes through `defaultUrlTransform`.
 */
function transformUrls(node: Nodes, parent: { children: Nodes[] } | null, index: number): void {
  if ((node as { type: string }).type === 'raw' && parent !== null) {
    parent.children[index] = {
      type: 'text',
      value: (node as unknown as { value: string }).value
    };
    return;
  }
  if (node.type === 'element') {
    for (const key in urlAttributes) {
      if (!Object.hasOwn(urlAttributes, key) || !Object.hasOwn(node.properties, key)) continue;
      const test = urlAttributes[key];
      if (test === null || test === undefined || test.includes(node.tagName)) {
        node.properties[key] = defaultUrlTransform(String(node.properties[key] || ''));
      }
    }
  }
  if ('children' in node) {
    const holder = node as { children: Nodes[] };
    for (let i = 0; i < holder.children.length; i++) {
      transformUrls(holder.children[i] as Nodes, holder, i);
    }
  }
}

/**
 * One chunk to the tree the components map is handed: parsed, every raw tag
 * a node, sanitized, highlighted, URLs transformed.
 */
export function chunkToHast(
  md: MarkdownIt,
  processor: ChunkProcessor,
  text: string
): Root {
  const parsed = fromParse5(parseFragment(md.render(text))) as Root;
  const tree = processor.runSync(parsed) as Root;
  transformUrls(tree, null, 0);
  return tree;
}
