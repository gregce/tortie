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
 *  - GFM strikethrough with ONE tilde as well as two. remark-gfm draws
 *    `~x~` as `del` (its `singleTilde` defaults on) and markdown-it's own
 *    rule wants two; the rule below replaces it, pairing a run only with a
 *    run of the same size, which is micromark's rule, and leaving a run of
 *    three or more as text.
 *  - GFM's trailing punctuation. A bare URL ending in `:`, `_`, `~`, `]` or
 *    a quote keeps that character OUT of the link in GFM and linkify-it
 *    keeps it IN, so `see https://x.example/tools:` linked the colon. Both
 *    of linkify-it's match entry points are wrapped to trim the same trail
 *    micromark trims.
 *  - link text as written. markdown-it percent-decodes an autolink's text
 *    for display (`%5B` shown as `[`); remark shows the file's characters.
 *  - a final newline on a code block that runs to the end of the file, which
 *    remark's code node always has and markdown-it's does not.
 *  - parse5 with scripting OFF. rehype-raw parses with
 *    `scriptingEnabled: false` (hast-util-raw), so `<noscript>` content is
 *    markup there and raw text under parse5's default; the shape
 *    `<noscript><p title="</noscript><img …>">` drew an attribute on the old
 *    path and an image here until the option matched.
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
 * REFERENCE DEFINITIONS ARE HANDED OVER AS A TABLE, NOT AS TEXT (the Phase
 * 255 fix round). The build prepended every `[label]: …` line the scanner
 * saw to every chunk's parse input. Three things were wrong with that, and
 * the verifier measured each: a line that LOOKS like a definition and is not
 * one (`[Note]: remember this`, a destination on the next line, a refused
 * scheme) was drawn as a paragraph at the top of every chunk; a definition
 * inside a blockquote or a list item was never collected and one inside a
 * comment or a `<pre>` was; and the prepended text made the parse input
 * chunks times definitions, 160 MB for a 1.15 MB changelog, and changed
 * every chunk's text when one definition was added. Now markdown-it's OWN
 * block pass reads the definitions (`createReferenceCollector`, normalize
 * and block rules only, over the chunks that contain `]:` at all), so what
 * counts as a definition is exactly what markdown-it's reference rule
 * accepts wherever it sits, and the first definition of a label wins
 * document-wide as it does in one whole parse. Each chunk is then parsed with
 * that table as `env.references`, read through a proxy that RECORDS every
 * label the chunk looked up, hit or miss, so the preview's memo can tell
 * which chunks a changed definition really changes (`sameReferences`).
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

type InlineRule = Parameters<MarkdownIt['inline']['ruler']['at']>[1];
type InlineState = Parameters<InlineRule>[0];
type PostRule = Parameters<MarkdownIt['inline']['ruler2']['at']>[1];

// ---------------------------------------------------------------------------
// GFM strikethrough: one tilde or two (header)
// ---------------------------------------------------------------------------

const TILDE = 0x7e;
/**
 * A run's SIZE is part of its marker, so markdown-it's balance_pairs only
 * ever pairs a run of one with a run of one and a run of two with a run of
 * two, which is micromark's "if the sizes are the same".
 */
const STRIKE_ONE = 0x7e01;
const STRIKE_TWO = 0x7e02;

const gfmStrikeTokenize: InlineRule = (state, silent) => {
  if (silent || state.src.charCodeAt(state.pos) !== TILDE) return false;
  const scanned = state.scanDelims(state.pos, true);
  const token = state.push('text', '', 0);
  token.content = '~'.repeat(scanned.length);
  // Three or more is text in GFM, and consuming the whole run keeps its tail
  // from being tried again as a run of two.
  if (scanned.length <= 2) {
    state.delimiters.push({
      marker: scanned.length === 1 ? STRIKE_ONE : STRIKE_TWO,
      length: 0, // no "rule of 3": that belongs to emphasis
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close
    });
  }
  state.pos += scanned.length;
  return true;
};

function strikePairs(state: InlineState, delimiters: InlineState['delimiters']): void {
  for (const open of delimiters) {
    if ((open.marker !== STRIKE_ONE && open.marker !== STRIKE_TWO) || open.end === -1) continue;
    const close = delimiters[open.end];
    const a = state.tokens[open.token];
    const b = close === undefined ? undefined : state.tokens[close.token];
    if (a === undefined || b === undefined) continue;
    a.type = 's_open';
    a.tag = 's';
    a.nesting = 1;
    a.markup = a.content;
    a.content = '';
    b.type = 's_close';
    b.tag = 's';
    b.nesting = -1;
    b.markup = b.content;
    b.content = '';
  }
}

const gfmStrikePostProcess: PostRule = (state) => {
  strikePairs(state, state.delimiters);
  for (const meta of state.tokens_meta) {
    if (meta?.delimiters) strikePairs(state, meta.delimiters);
  }
  return true;
};

// ---------------------------------------------------------------------------
// GFM trailing punctuation on a bare URL (header)
// ---------------------------------------------------------------------------

/**
 * micromark-extension-gfm-autolink-literal's trail, less the two it decides
 * by context (`)` by balance and `&…;` as an entity), which linkify-it
 * already ends the same way.
 */
const GFM_TRAIL_RE = /[!"'*,.:;<?\]_~]+$/;

interface LinkifyMatch {
  schema: string;
  index: number;
  lastIndex: number;
  raw: string;
  text: string;
  url: string;
}

function trimTrail(m: LinkifyMatch): LinkifyMatch | null {
  const cut = GFM_TRAIL_RE.exec(m.text)?.[0].length ?? 0;
  if (cut === 0) return m;
  const text = m.text.slice(0, -cut);
  // Nothing left but a scheme: GFM links nothing there.
  if (text === '' || /^[a-z][a-z0-9+.-]*:\/*$/i.test(text)) return null;
  m.text = text;
  m.raw = m.raw.slice(0, -cut);
  m.url = m.url.slice(0, -cut);
  m.lastIndex -= cut;
  return m;
}

// ---------------------------------------------------------------------------
// The parser
// ---------------------------------------------------------------------------

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
  const linkify = md.linkify as unknown as {
    match(text: string): LinkifyMatch[] | null;
    matchAtStart(text: string): LinkifyMatch | null;
  };
  const matchAll = linkify.match.bind(linkify);
  const matchAtStart = linkify.matchAtStart.bind(linkify);
  linkify.match = (text) => {
    const found = matchAll(text);
    if (found === null) return null;
    const kept: LinkifyMatch[] = [];
    for (const m of found) {
      const t = trimTrail(m);
      if (t !== null) kept.push(t);
    }
    return kept;
  };
  linkify.matchAtStart = (text) => {
    const m = matchAtStart(text);
    return m === null ? null : trimTrail(m);
  };
  md.inline.ruler.at('strikethrough', gfmStrikeTokenize);
  md.inline.ruler2.at('strikethrough', gfmStrikePostProcess);
  md.renderer.rules['s_open'] = () => '<del>';
  md.renderer.rules['s_close'] = () => '</del>';
  // Link text as the file wrote it. markdown-it decodes an autolink's text
  // for display (`%5B` shown as `[`, a punycode host shown in Unicode);
  // remark shows the characters in the file, and so does this.
  md.normalizeLinkText = (url) => url;
  // A code block that runs to the end of a file with no final newline:
  // remark's code node always ends its text with one, markdown-it's does not.
  md.core.ruler.push('preview_code_newline', (state) => {
    for (const token of state.tokens) {
      if ((token.type === 'fence' || token.type === 'code_block') && token.content !== '' && !token.content.endsWith('\n')) {
        token.content += '\n';
      }
    }
    return true;
  });
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

// ---------------------------------------------------------------------------
// Reference definitions: read by markdown-it, handed over as a table (header)
// ---------------------------------------------------------------------------

/** One definition, as markdown-it's reference rule records it. */
export interface Reference {
  href: string;
  title: string;
}

/** Normalized label to definition, the document's FIRST definition winning. */
export type References = Readonly<Record<string, Reference>>;

export const NO_REFERENCES: References = Object.freeze(Object.create(null) as Record<string, Reference>);

/**
 * The same parser with every core rule but `normalize` and `block` turned
 * off: it builds block tokens and fills `env.references`, and does no inline
 * work at all.
 */
export function createReferenceCollector(): MarkdownIt {
  const md = createChunkParser();
  md.core.ruler.enableOnly(['normalize', 'block']);
  return md;
}

/** What one chunk defines, in the order it defines it, kept by the chunk's text. */
export type ReferenceCache = Map<string, ReadonlyArray<readonly [string, Reference]>>;

/**
 * The document's definition table, from its chunks. A chunk is read only if
 * its text contains `]:`, which every definition must: the label's closing
 * bracket and the colon are adjacent by the grammar. Because the scanner
 * cuts only where nothing continues across a cut, markdown-it finds in a
 * chunk exactly the definitions it finds on those lines in a whole parse.
 */
export function collectReferences(
  collector: MarkdownIt,
  texts: readonly string[],
  cache?: ReferenceCache
): References {
  const table = Object.create(null) as Record<string, Reference>;
  for (const text of texts) {
    if (!text.includes(']:')) continue;
    let found = cache?.get(text);
    if (found === undefined) {
      const env: { references?: Record<string, Reference> } = {};
      collector.parse(text, env);
      found = Object.entries(env.references ?? {}).map(
        ([label, ref]) => [label, { href: ref.href, title: ref.title }] as const
      );
      cache?.set(text, found);
    }
    for (const [label, ref] of found) {
      if (!Object.hasOwn(table, label)) table[label] = ref;
    }
  }
  return table;
}

/**
 * `env.references` for one chunk: the document's table, read through a proxy
 * that records every label looked up. A definition the chunk itself makes is
 * already in the table (first wins), and anything markdown-it writes lands
 * in a local overlay, never in the shared table.
 */
function lookupTable(table: References, used: Set<string> | undefined): Record<string, Reference> {
  const local = Object.create(null) as Record<string, Reference>;
  return new Proxy(local, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      used?.add(key);
      return Object.hasOwn(table, key) ? table[key] : target[key];
    }
  });
}

/**
 * Would a chunk that looked up `used` draw the same under `b` as under `a`?
 * With no record, only the same table is the same answer.
 */
export function sameReferences(
  used: ReadonlySet<string> | undefined,
  a: References,
  b: References
): boolean {
  if (a === b) return true;
  if (used === undefined) return false;
  for (const label of used) {
    const x = Object.hasOwn(a, label) ? a[label] : undefined;
    const y = Object.hasOwn(b, label) ? b[label] : undefined;
    if (x === y) continue;
    if (x === undefined || y === undefined || x.href !== y.href || x.title !== y.title) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The rehype half, and one chunk to a tree
// ---------------------------------------------------------------------------

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
 * One chunk to the tree the components map is handed: parsed with the
 * document's definitions, every raw tag a node, sanitized, highlighted, URLs
 * transformed. `used` collects every label the chunk looked up.
 */
export function chunkToHast(
  md: MarkdownIt,
  processor: ChunkProcessor,
  text: string,
  references: References = NO_REFERENCES,
  used?: Set<string>
): Root {
  const html = md.render(text, { references: lookupTable(references, used) });
  const parsed = fromParse5(parseFragment(html, { scriptingEnabled: false })) as Root;
  const tree = processor.runSync(parsed) as Root;
  transformUrls(tree, null, 0);
  return tree;
}

// ---------------------------------------------------------------------------
// Chunks the preview draws: parsed now or ahead of time, and what they read
// ---------------------------------------------------------------------------

/**
 * The windowed preview's per-chunk work, pure of React so the gate can drive
 * it: `prepare` parses a chunk AHEAD of its draw (the stream does that in one
 * idle task and draws in the next, so a large uncuttable run is two tasks of
 * about half its cost rather than one), `render` takes that tree if the
 * definitions it read are unchanged or parses again, and `usedBy` answers
 * which labels a drawn chunk read, for the memo.
 */
export interface ChunkRenderer<E> {
  prepare(text: string, references: References): void;
  render(text: string, references: References): E;
  usedBy(text: string): ReadonlySet<string> | undefined;
  /** Drop what is kept for any text the document no longer holds. */
  keepOnly(texts: ReadonlySet<string>): void;
}

export function createChunkRenderer<E>(
  md: MarkdownIt,
  processor: ChunkProcessor,
  toElements: (tree: Root) => E
): ChunkRenderer<E> {
  const prepared = new Map<string, { tree: Root; used: Set<string>; references: References }>();
  const used = new Map<string, ReadonlySet<string>>();
  const parse = (text: string, references: References) => {
    const u = new Set<string>();
    return { tree: chunkToHast(md, processor, text, references, u), used: u, references };
  };
  return {
    prepare(text, references) {
      if (!prepared.has(text)) prepared.set(text, parse(text, references));
    },
    render(text, references) {
      let p = prepared.get(text);
      // A prepared tree is drawn once: a second draw of the same text parses.
      prepared.delete(text);
      if (p === undefined || !sameReferences(p.used, p.references, references)) {
        p = parse(text, references);
      }
      used.set(text, p.used);
      return toElements(p.tree);
    },
    usedBy: (text) => used.get(text),
    keepOnly(texts) {
      for (const k of used.keys()) if (!texts.has(k)) used.delete(k);
      for (const k of prepared.keys()) if (!texts.has(k)) prepared.delete(k);
    }
  };
}

/** The props a drawn chunk is memoized on. */
export interface ChunkProps<E> {
  text: string;
  references: References;
  renderer: ChunkRenderer<E>;
}

/**
 * The memo's question: the same text, drawn by the same renderer, and every
 * definition it read the same. A changed definition therefore redraws the
 * chunks that use its label and no others.
 */
export function sameChunkProps<E>(prev: ChunkProps<E>, next: ChunkProps<E>): boolean {
  return (
    prev.text === next.text &&
    prev.renderer === next.renderer &&
    sameReferences(next.renderer.usedBy(next.text), prev.references, next.references)
  );
}

/** A task queue the stream can be handed: request runs `task` later and returns its cancel. */
export type IdleRequest = (task: () => void) => () => void;

/**
 * Stream one window: PARSE it in one task and DRAW it in the next, so neither
 * task pays for both halves. Returns the cancel for whichever task is pending.
 */
export function streamWindow(request: IdleRequest, prepare: () => void, draw: () => void): () => void {
  let cancel = request(() => {
    prepare();
    cancel = request(draw);
  });
  return () => cancel();
}
