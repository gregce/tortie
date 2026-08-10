/**
 * The two markdown-pipeline mistakes that produce NO error message.
 *
 * Both were found in research (docs/research/15-phase12-inputs.md §C) rather
 * than in a bug report, because neither is visible in a stack trace: one makes
 * every code fence monochrome, the other makes every local image vanish. A
 * reviewer cannot see either by reading the plugin list, so they are asserted
 * here instead.
 */

import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import { gmuxMarkdownSchema, markdownRehypePlugins } from '../pipeline';

/**
 * Stands in for the Shiki highlighter: emits exactly the shape Shiki does —
 * inline `style` on the pre and on every token span — without loading a
 * grammar. What is under test is the plugin ORDER, not Shiki.
 */
const stubHighlighter = {
  getLoadedLanguages: () => ['ts', 'text'],
  loadLanguage: async () => undefined,
  codeToHast: (code: string): Root => ({
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: { className: ['shiki'], style: 'background-color:#131417' },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { style: 'color:#6CB6FF' },
                children: [{ type: 'text', value: code }]
              }
            ]
          }
        ]
      }
    ]
  })
} as unknown as Parameters<typeof markdownRehypePlugins>[0];

function fenceTree(lang: string, code: string): Root {
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: [`language-${lang}`] },
            children: [{ type: 'text', value: code }]
          }
        ]
      }
    ]
  };
}

async function runPlugins(
  plugins: ReturnType<typeof markdownRehypePlugins>,
  tree: Root
): Promise<Root> {
  const processor = unified();
  for (const plugin of plugins) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processor.use(...([] as any).concat(plugin));
  }
  return (await processor.run(tree)) as Root;
}

async function run(tree: Root): Promise<Root> {
  return runPlugins(markdownRehypePlugins(stubHighlighter, 'gmux-dark'), tree);
}

function collect(tree: Root, tagName: string): Element[] {
  const out: Element[] = [];
  visit(tree, 'element', (node: Element) => {
    if (node.tagName === tagName) out.push(node);
  });
  return out;
}

describe('markdown rehype pipeline', () => {
  it('keeps the inline styles Shiki generates (order: sanitize BEFORE shiki)', async () => {
    const out = await run(fenceTree('ts', 'const a = 1\n'));
    const spans = collect(out, 'span');
    expect(spans.length).toBeGreaterThan(0);
    // Highlighting after sanitize is the whole point: run it before, and
    // hast-util-sanitize drops `style` (not in its default `*` allowlist)
    // and every fence renders grey with no error anywhere.
    expect(spans.some((s) => typeof s.properties['style'] === 'string')).toBe(
      true
    );
    const pre = collect(out, 'pre')[0];
    expect(pre?.properties['style']).toBeTruthy();
  });

  it('loses every colour if the order is reversed (this is the trap)', async () => {
    // The negative control that gives the test above its teeth: highlighting
    // BEFORE the sanitizer is a plausible-looking plugin list that produces a
    // monochrome document and no error message anywhere.
    const [raw, sanitize, shiki] = markdownRehypePlugins(
      stubHighlighter,
      'gmux-dark'
    );
    const reversed = [raw, shiki, sanitize] as ReturnType<
      typeof markdownRehypePlugins
    >;
    const out = await runPlugins(reversed, fenceTree('ts', 'const a = 1\n'));
    const styled = collect(out, 'span').filter(
      (s) => typeof s.properties['style'] === 'string'
    );
    expect(styled).toHaveLength(0);
  });

  it('keeps images served over gmux-asset:', async () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: { src: 'gmux-asset://local/repo/docs/shot.png', alt: 'x' },
          children: []
        }
      ]
    };
    const out = await run(tree);
    const img = collect(out, 'img')[0];
    // `protocols.src` defaults to http/https only — without gmux-asset in the
    // schema every local image is stripped silently.
    expect(img?.properties['src']).toBe('gmux-asset://local/repo/docs/shot.png');
  });

  it('still strips the things a checked-out README must not do', async () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'script',
          properties: {},
          children: [{ type: 'text', value: 'alert(1)' }]
        },
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'javascript:alert(1)' },
          children: [{ type: 'text', value: 'click' }]
        },
        {
          type: 'element',
          tagName: 'div',
          properties: { style: 'position:fixed;inset:0' },
          children: []
        }
      ]
    };
    const out = await run(tree);
    expect(collect(out, 'script')).toHaveLength(0);
    expect(collect(out, 'a')[0]?.properties['href']).toBeUndefined();
    // `style` is allowed on the three elements Shiki writes, never globally.
    expect(collect(out, 'div')[0]?.properties['style']).toBeUndefined();
  });

  it('allows the GFM task-list checkbox through', async () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'input',
          properties: { type: 'checkbox', checked: true, disabled: true },
          children: []
        }
      ]
    };
    const out = await run(tree);
    expect(collect(out, 'input')[0]?.properties['checked']).toBe(true);
  });

  it('lists gmux-asset as an image protocol in the schema itself', () => {
    expect(gmuxMarkdownSchema.protocols?.['src']).toContain('gmux-asset');
  });
});
