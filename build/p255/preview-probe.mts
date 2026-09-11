/**
 * preview-probe.mts — the node half of `npm run conformance:preview`. PHASE 255.
 *
 * Loads the SHIPPING window scanner, chunk parser, rehype plugin lists and
 * deferral guard from `--dir` (the tree's own src/renderer/editor/markdown,
 * or an ablated copy of it), drives them over this repository's own
 * markdown, the research 116 twins and fixtures it writes itself, and prints
 * one JSON document of READINGS. It judges nothing: the runner,
 * build/p255/assert-preview-window.mjs, holds every expectation, so an
 * ablated copy is read by exactly the same eyes as the tree.
 *
 * THE OLD RENDERER IS RE-DERIVED HERE, not imported from the tree: remark-
 * parse, remark-gfm and remark-rehype composed the way react-markdown
 * composes them, the tree's `markdownRehypePlugins`, then react-markdown's
 * own post-pass written out again with unist-util-visit. So removing the URL
 * transform from chunk-parse.ts cannot quietly remove it from the side it is
 * compared against.
 *
 * Spawns nothing, opens no socket, launches no Electron, reads nothing under
 * the person's home.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { visit } from 'unist-util-visit';
import { urlAttributes } from 'html-url-attributes';
import { defaultUrlTransform } from 'react-markdown';
import { SHAPES, synthTwin } from '../p254/twins.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k: string, d: string): string => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : (process.argv[i + 1] ?? d);
};
const DIR = resolve(REPO, arg('dir', 'src/renderer/editor/markdown'));
const ARMS = new Set(arg('arms', 'window,parity,shims,sanitize,plan,guard,cache,stream,dom').split(','));

// -- the modules, loaded so that ABSENCE is a reading and not a crash --------
const out: Record<string, unknown> = { dir: relative(REPO, DIR) };
const absent: string[] = [];
async function load(name: string): Promise<any> {
  try {
    return await import(pathToFileURL(join(DIR, name)).href);
  } catch (err) {
    absent.push(`${name}: ${String((err as Error).message).split('\n')[0]}`);
    return null;
  }
}
const scan = await load('window-scan.ts');
const chunk = await load('chunk-parse.ts');
const pipeline = await load('pipeline.ts');
const prose = await load('large-prose.ts');
if (absent.length > 0) {
  out['absent'] = absent;
  console.log(JSON.stringify(out));
  process.exit(0);
}
const implText = readFileSync(join(DIR, 'markdown-impl.tsx'), 'utf8');

// -- hast canon --------------------------------------------------------------
type N = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: N[]; value?: string };

const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul']);
const isBlock = (n: N | undefined): boolean => n === undefined || (n.type === 'element' && BLOCK.has(n.tagName ?? ''));

/**
 * Canonical text of a tree, as the page DRAWS it: elements with sorted,
 * stringified properties; text with whitespace collapsed outside `pre`, and
 * trimmed only at an edge that touches a block element or its parent's
 * boundary, because CSS draws no whitespace there; a text node left empty is
 * dropped, since it draws nothing and React makes no node for it. A space
 * BETWEEN two inline elements is kept, so this cannot hide a word run
 * together. With `raw`, nothing is trimmed and only empty text is dropped:
 * the difference between the two is the `whitespace` reading.
 */
function canon(node: N, raw: boolean, inPre = false, acc: string[] = []): string[] {
  // Adjacent text nodes draw as one run of text, so they are merged first: a
  // raw tag the sanitizer removed leaves its neighbours as two nodes on one
  // path and one on the other, and the page cannot tell.
  const kids: N[] = [];
  for (const k of node.children ?? []) {
    const last = kids[kids.length - 1];
    if (k.type === 'text' && last !== undefined && last.type === 'text') kids[kids.length - 1] = { type: 'text', value: `${last.value ?? ''}${k.value ?? ''}` };
    else kids.push(k);
  }
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i] as N;
    if (c.type === 'text') {
      let v = c.value ?? '';
      if (!inPre) {
        v = v.replace(/\s+/g, ' ');
        if (!raw && isBlock(kids[i - 1])) v = v.replace(/^ /, '');
        if (!raw && isBlock(kids[i + 1])) v = v.replace(/ $/, '');
      }
      if (v !== '') acc.push(JSON.stringify(v));
    } else if (c.type === 'element') {
      const props = Object.entries(c.properties ?? {})
        .flatMap(([k, v]) =>
          v === false || v === null || v === undefined ? [] : [`${k}=${Array.isArray(v) ? v.join(' ') : v === true ? '' : String(v)}`]
        )
        .sort();
      acc.push(`<${c.tagName}${props.length > 0 ? ` ${props.join(' ')}` : ''}>`);
      canon(c, raw, inPre || c.tagName === 'pre', acc);
      acc.push(`</${c.tagName}>`);
    }
  }
  return acc;
}
const exact = (t: N): string => canon(t, false).join('');
const rawText = (t: N): string => canon(t, true).join('');
const tight = exact;

/** A copy of the tree with every `a` the predicate names replaced by its children, adjacent text merged. */
function unwrap(node: N, drop: (a: N) => boolean): N {
  if (node.children === undefined) return { ...node };
  const kids: N[] = [];
  for (const c of node.children) {
    const next = c.type === 'element' && c.tagName === 'a' && drop(c) ? (c.children ?? []).map((k) => unwrap(k, drop)) : [unwrap(c, drop)];
    for (const k of next) {
      const last = kids[kids.length - 1];
      if (k.type === 'text' && last !== undefined && last.type === 'text') kids[kids.length - 1] = { type: 'text', value: `${last.value ?? ''}${k.value ?? ''}` };
      else kids.push(k);
    }
  }
  return { ...node, children: kids };
}
const href = (a: N): string => String(a.properties?.['href'] ?? '');

// -- the two renderers -------------------------------------------------------
const oldProc = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(pipeline.markdownRehypePlugins(null, 'gmux'))
  .freeze();
/** The old render: react-markdown's processor, then react-markdown's own post-pass, written out again. */
function oldTree(src: string): N {
  const tree = oldProc.runSync(oldProc.parse(src)) as N;
  visit(tree as never, (node: any, index: any, parent: any) => {
    if (node.type === 'raw' && parent && typeof index === 'number') {
      parent.children[index] = { type: 'text', value: node.value };
      return index;
    }
    if (node.type === 'element') {
      for (const key in urlAttributes) {
        if (Object.hasOwn(urlAttributes, key) && Object.hasOwn(node.properties, key)) {
          const test = (urlAttributes as Record<string, string[] | null>)[key];
          if (test === null || test?.includes(node.tagName)) node.properties[key] = defaultUrlTransform(String(node.properties[key] || ''));
        }
      }
    }
    return undefined;
  });
  return tree;
}
const md = chunk.createChunkParser();
const proc = chunk.createChunkProcessor(null, 'gmux');
const newWhole = (src: string): N => chunk.chunkToHast(md, proc, src) as N;
const collector = chunk.createReferenceCollector();
function newChunked(src: string, target?: number): { tree: N; chunks: number; biggest: number } {
  const plan = target === undefined ? scan.scanChunks(src) : scan.scanChunks(src, target);
  const children: N[] = [];
  const texts = scan.chunkTexts(src, plan) as string[];
  const references = chunk.collectReferences(collector, texts);
  for (const text of texts) children.push(...((chunk.chunkToHast(md, proc, text, references) as N).children ?? []));
  const sizes = plan.chunks.map((c: { start: number; end: number }) => c.end - c.start);
  return { tree: { type: 'root', children }, chunks: plan.chunks.length, biggest: Math.max(0, ...sizes) };
}

// -- inputs ------------------------------------------------------------------
const corpus: { name: string; src: string }[] = [];
const SKIP = new Set(['node_modules', '.git', 'out', 'dist', 'release', 'vendor']);
(function walk(dir: string): void {
  for (const e of readdirSync(dir).sort()) {
    if (SKIP.has(e) || /^\.p\d/.test(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith('.md')) corpus.push({ name: relative(REPO, p), src: readFileSync(p, 'utf8') });
  }
})(REPO);
const twinA = synthTwin(SHAPES.a, 11);
/** The page the SHIPPING preview draws: a footnote document whole on the old path, anything else cut. */
const newPage = (src: string): N => (scan.hasFootnotes(src) ? oldTree(src) : newChunked(src).tree);
const twinB = synthTwin(SHAPES.b, 22);

const para = (i: number): string => `Paragraph ${i} carries a few plain words.`;
const paragraphs = (n: number, from = 0): string => Array.from({ length: n }, (_, i) => para(from + i)).join('\n\n');
/** Fixtures for the window arm, each built to catch one veto; cut with a two-line target so every cuttable blank IS cut. */
const FIXTURES: Record<string, string> = {
  'loose list': `${paragraphs(4)}\n\n${Array.from({ length: 20 }, (_, i) => `- item ${i}`).join('\n\n')}\n\n${paragraphs(4, 10)}`,
  'fence with blanks': `${paragraphs(4)}\n\n\`\`\`ts\n${Array.from({ length: 10 }, (_, i) => `const a${i} = ${i};\n`).join('\n')}\`\`\`\n\n${paragraphs(4, 10)}`,
  'raw container': `${paragraphs(2)}\n\n<details>\n<summary>more</summary>\n\n${paragraphs(4, 20)}\n\n</details>\n\n${paragraphs(2, 30)}`,
  'html comment': `${paragraphs(2)}\n\n<!--\n\n${paragraphs(4, 20)}\n\n-->\n\n${paragraphs(2, 30)}`,
  'tab indented code': `${paragraphs(3)}\n\n\tcode one\n\n\tcode two\n\n${paragraphs(3, 10)}`,
  // THE FIX ROUND'S TAG MODEL, one fixture per clause (window-scan.ts header).
  'an ordinary element an HTML block leaves open': `${paragraphs(3)}\n\n<span class="x">\n\n${paragraphs(4, 20)}\n\n</span>\n\n${paragraphs(3, 30)}`,
  'a formatting element an HTML block leaves open': `${paragraphs(3)}\n\n<b>\n\n${paragraphs(4, 20)}\n\n</b>\n\n${paragraphs(3, 30)}`,
  'a formatting element a paragraph leaves open': `${paragraphs(3)}\n\nSome <b>bold words.\n\n${paragraphs(6, 20)}`,
  'an end tag in an indented code block': `${paragraphs(3)}\n\n<div>\n\ntext\n\n    </div>\n\n${paragraphs(4, 20)}\n\n</div>\n\n${paragraphs(3, 30)}`,
  'an end tag in a one-line comment': `${paragraphs(3)}\n\n<div>\n\n<!-- </div> -->\n\n${paragraphs(4, 20)}\n\n</div>\n\n${paragraphs(3, 30)}`,
  // The end tag inside the raw text is text to parse5, so it must not close the outer <div>.
  'raw text opened inside a paragraph': `${paragraphs(3)}\n\n<div>\n\nType into a <textarea> like this.\n\n</div> is only text in here.\n\n${paragraphs(4, 20)}\n\n</textarea> and after.\n\n${paragraphs(3, 30)}\n\n</div>\n\n${paragraphs(3, 40)}`,
  'an end tag outside its scope': `${paragraphs(3)}\n\n<div>\n<table><tr><td>\n\ntext </div>\n\n</td></tr></table>\n\n${paragraphs(4, 20)}\n\n</div>\n\n${paragraphs(3, 30)}`,
  'an ordinary end tag inside a paragraph': `${paragraphs(3)}\n\n<span>\n\n${paragraphs(2, 20)}\n\nwords </span> more\n\n${paragraphs(2, 25)}\n\n</span>\n\n${paragraphs(3, 30)}`,
  'a formatting element outlives the end tag that pops past it': `${paragraphs(3)}\n\n<div><b>\n\n${paragraphs(2, 20)}\n\n</div>\n\n${paragraphs(4, 30)}`,
  // THE DEFINITIONS, read by markdown-it and handed over as a table (chunk-parse.ts).
  'definition far from its use': `[site]: https://first.example\n\n${paragraphs(12)}\n\nSee [site].`,
  'the first definition wins beside a later duplicate': `[dup]: https://first.example\n\n${paragraphs(6)}\n\n[dup]: https://second.example\nSee [dup].\n\n${paragraphs(4, 20)}`,
  'a line that looks like a definition': `Intro.\n\n[Note]: remember to do this later\n\n${paragraphs(8)}\n\n[TODO]: fix the flaky thing\n\nSee [Note].`,
  'a definition whose destination is on the next line': `Use [t2] here.\n\n${paragraphs(8)}\n\n[t2]:\n  https://example.com/t2\n`,
  'a definition inside a blockquote': `Use [q] here.\n\n${paragraphs(8)}\n\n> [q]: https://quote.example/\n`,
  'a definition inside a comment': `<!--\n\n[x]: https://evil.example/\n\n-->\n\nUse [x] now.\n\n${paragraphs(8)}\n\nAnd [x] later.\n`
};
/**
 * Documents a cut must still reach: each holds a shape the tag model closes
 * or ignores as parse5 does, so an over-merge that is safe but needless shows
 * up as a chunk count.
 */
const CUTS: Record<string, string> = {
  'an unclosed hero <p> closed by the heading after it': `<p align="center">\n  <img src="logo.png">\n\n# Title\n\n${paragraphs(40)}`,
  'a generic type written in prose': `The function returns Promise<void> and Array<string>.\n\n${paragraphs(40)}`,
  'a self-closed svg': `An icon <svg viewBox="0 0 1 1"/> in a sentence.\n\n${paragraphs(40)}`
};
const BACKTICKED_TAG = `Write \`<table>\` or \`<details>\` in prose.\n\n${paragraphs(40)}`;

// -- arms --------------------------------------------------------------------
if (ARMS.has('window')) {
  const differ: string[] = [];
  let chunks = 0;
  let biggest = { name: '', size: 0 };
  for (const f of corpus) {
    const c = newChunked(f.src);
    chunks += c.chunks;
    if (c.biggest > biggest.size) biggest = { name: f.name, size: c.biggest };
    if (exact(newWhole(f.src)) !== exact(c.tree)) differ.push(f.name);
  }
  const twins: Record<string, { chunks: number; biggest: number; same: boolean }> = {};
  for (const [name, src] of [['a', twinA], ['b', twinB]] as const) {
    const c = newChunked(src);
    twins[name] = { chunks: c.chunks, biggest: c.biggest, same: exact(newWhole(src)) === exact(c.tree) };
  }
  const fixtures: Record<string, { chunks: number; same: boolean }> = {};
  for (const [name, src] of Object.entries(FIXTURES)) {
    const c = newChunked(src, 2);
    fixtures[name] = { chunks: c.chunks, same: exact(newWhole(src)) === exact(c.tree) };
  }
  const cuts = Object.fromEntries(Object.entries(CUTS).map(([name, src]) => [name, scan.scanChunks(src, 2).chunks.length]));
  out['window'] = { files: corpus.length, differ, chunks, biggest, twins, fixtures, cuts, backtickedTagChunks: scan.scanChunks(BACKTICKED_TAG, 2).chunks.length };
}

if (ARMS.has('parity')) {
  const classes: Record<string, string[]> = {};
  let identical = 0;
  let whitespaceOnly = 0;
  const firstDifference: Record<string, { old: string; new: string }> = {};
  const docs = [...corpus, { name: 'twin-a', src: twinA }, { name: 'twin-b', src: twinB }];
  for (const f of docs) {
    const oldT = oldTree(f.src);
    const newT = newChunked(f.src).tree;
    if (exact(oldT) === exact(newT)) {
      identical += 1;
      if (rawText(oldT) !== rawText(newT)) whitespaceOnly += 1;
      continue;
    }
    let cls: string;
    if (exact(unwrap(oldT, (a) => href(a).startsWith('mailto:'))) === exact(unwrap(newT, (a) => href(a).startsWith('mailto:')))) cls = 'email-autolink';
    else if (exact(unwrap(oldT, (a) => /^https?:/.test(href(a)))) === exact(unwrap(newT, (a) => /^https?:/.test(href(a))))) cls = 'url-trailing-punctuation';
    else cls = 'UNCLASSIFIED';
    (classes[cls] ??= []).push(f.name);
    if (cls === 'UNCLASSIFIED') {
      const a = exact(unwrap(oldT, (x) => href(x).startsWith('mailto:')));
      const b = exact(newT);
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      (firstDifference[f.name] = { old: a.slice(Math.max(0, i - 160), i + 160), new: b.slice(Math.max(0, i - 160), i + 160) });
    }
  }
  out['parity'] = { files: docs.length, identical, whitespaceOnly, classes, firstDifference };
}

if (ARMS.has('shims')) {
  const same = (src: string): boolean => tight(oldTree(src)) === tight(newChunked(src).tree);
  const find = (t: N, pred: (n: N) => boolean): N[] => {
    const acc: N[] = [];
    visit(t as never, (n: any) => { if (pred(n)) acc.push(n); });
    return acc;
  };
  const strike = '~~gone~~ stays.';
  const table = '| l | c | r |\n| :-- | :-: | --: |\n| a | b | c |';
  const fuzzy = 'See CLAUDE.md, docs/BACKLOG.md and example.com here.';
  const tasks = '- [ ] open\n- [x] done';
  const WWW = [
    'www.example.com', 'Visit www.commonmark.org/help for more information.', 'www.example.com.', 'www.example.com,', '(www.example.com)',
    'www.google.com/search?q=Markup+(business)', 'www.google.com/search?q=Markup+(business)))', '(www.google.com/search?q=Markup+(business))',
    'www.example.com/a_b', 'www.commonmark.org/a.b.', 'www.example', 'www.a.b_c.d', 'www.a_b.c.d', 'www.ex_ample.com', 'www.',
    'www.example.com/path?x=1&y=2', 'www.example.com/search?q=commonmark&hl=en', 'www.google.com/search?q=commonmark&hl;',
    'www.example.com:8080/x', 'awww.example.com', '_www.example.com_', '*www.example.com*', '~~www.example.com~~',
    'www.example.com!', 'www.example.com?', 'www.example.com/"quoted"', "www.example.com/it's", 'www.example.com<b>',
    'www.example.com/café', 'www.xn--80ak6aa92e.com', 'www.example.com/[x]', 'see www.example.com/ ok', 'www.example.com:', 'www.example.com*'
  ];
  /**
   * The verifier's shapes, from the corpus it wrote and from 788 real files
   * under node_modules. Each either draws the page remark drew, or is pinned
   * by name in the runner's `shapeResidual` with the reason beside it.
   */
  const PAGE_SHAPES: Record<string, string> = {
    'single tilde': 'This is ~approximately~ right and ~~double~~ too.',
    // One paragraph each, and none starting a line with ~~~, which is a fence.
    'tilde runs': ['A ~~~triple~~~ run.', '~a~~ and b~', 'x ~one~~ two~~ y', '~~a~ b~', 'go ~a~~b~~ c~ d', 'a~b~c and ~ spaced ~', '\\~esc~ and *~em~* and ~*x*~'].join('\n\n'),
    'trailing colon': 'For more information see https://github.com/felixrieseberg/windows-build-tools:',
    'trailing underscore, tilde, bracket and quote': 'https://a.b/c_ and https://a.b/c~ and https://a.b/[x] and https://a.b/"q"',
    'percent escapes in autolink text': '<http://www.wolframalpha.com/input/?i=Sum%5B1000*x^k%2C+{k%2C+0%2C+9}%5D>',
    'a fence left open at the end of the file': 'para\n\n```\nnever closed\n\n# not a heading\n\ntail',
    'noscript content in an attribute': '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    'a line that looks like a definition': '[Note]: remember to do this later\n\nand [Note] again',
    'a definition inside a list item': 'Use [li] here.\n\n- [li]: https://list.example/',
    'a footnote defined inside a blockquote': 'Text with a note[^q].\n\n> [^q]: Quoted note.',
    'a footnote defined inside a list item': 'Text with a note[^l].\n\n- [^l]: Listed note.',
    'an address in angle-bracket entities': 'Copyright (c) 2014 TJ Holowaychuk &lt;tj@vision-media.ca&gt;',
    'a package name with an at sign': 'Allow for npmlog@3.x (Rebecca Turner)',
    'a mailto: prefix': 'Write to mailto:foo@bar.example today',
    'a URL after a plus sign': 'Repository: git+https://github.com/antfu/install-pkg.git',
    'a no-break space before a destination': 'See [#1149].\n\n[#1149]: https://github.com/tj/commander.js/pull/1149',
    'a definition to a refused scheme': 'Use [refjs].\n\n[refjs]: javascript:alert(1)'
  };
  out['shims'] = {
    shapes: Object.keys(PAGE_SHAPES).length,
    shapeResidual: Object.entries(PAGE_SHAPES).filter(([, src]) => tight(oldTree(src)) !== tight(newPage(src))).map(([name]) => name),

    strike: { same: same(strike), del: find(newWhole(strike), (n) => n.tagName === 'del').length },
    table: { same: same(table), aligned: find(newWhole(table), (n) => n.tagName === 'th' && n.properties?.['align'] !== undefined).length },
    fuzzy: { same: same(fuzzy), links: find(newWhole(fuzzy), (n) => n.tagName === 'a').length },
    tasks: { same: same(tasks) },
    www: { shapes: WWW.length, linked: WWW.filter((s) => find(newWhole(s), (n) => n.tagName === 'a').length > 0).length, residual: WWW.filter((s) => !same(s)) }
  };
}

if (ARMS.has('sanitize')) {
  const HOSTILE = [
    'Before the attack.',
    '<script>window.gmux.terminalWrite("rm -rf ~")</script>',
    '<img src=x onerror="fetch(\'https://evil.example/x\')">',
    '<iframe src="https://evil.example/frame"></iframe>',
    '<a href="javascript:alert(document.title)">raw link</a>',
    '[click me](javascript:alert(document.title))',
    '<div style="position:fixed;inset:0">cover</div>',
    '<img src="gmux-asset://local/%2Fetc%2Fpasswd">',
    '<svg><script>alert(1)</script></svg>',
    '<object data="https://evil.example/o"></object>',
    '<form action="https://evil.example/f"><input name="q"></form>',
    'After the attack.'
  ].join('\n\n');
  const values: string[] = [];
  const tags: string[] = [];
  const handlers: string[] = [];
  const oldTags: string[] = [];
  visit(oldTree(HOSTILE) as never, (n: any) => { if (n.type === 'element') oldTags.push(n.tagName); });
  visit(newChunked(HOSTILE).tree as never, (n: any) => {
    if (n.type !== 'element') return;
    tags.push(n.tagName);
    for (const [k, v] of Object.entries(n.properties ?? {})) {
      if (/^on/i.test(k)) handlers.push(k);
      values.push(`${k}=${Array.isArray(v) ? v.join(' ') : String(v)}`);
    }
  });
  const stub = {
    getLoadedLanguages: () => ['ts', 'text'],
    loadLanguage: async () => undefined,
    codeToHast: (code: string) => ({
      type: 'root',
      children: [{ type: 'element', tagName: 'pre', properties: { className: ['shiki'], style: 'background-color:#131417' }, children: [{ type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: code }] }] }]
    })
  };
  const lit = chunk.chunkToHast(md, chunk.createChunkProcessor(stub, 'gmux'), '```ts\nconst x = 1;\n```\n\n<span style="color:red">raw</span>') as N;
  const styles: string[] = [];
  visit(lit as never, (n: any) => { if (n.type === 'element' && n.properties?.style !== undefined) styles.push(`${n.tagName}:${n.properties.style}`); });
  out['sanitize'] = {
    dangerousTags: tags.filter((t) => ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'style', 'link', 'meta', 'base'].includes(t)),
    tagsNotInOld: tags.filter((t) => !oldTags.includes(t)),
    handlers,
    javascriptUrls: values.filter((v) => /javascript:/i.test(v)),
    styles: values.filter((v) => v.startsWith('style=')),
    passwd: values.filter((v) => v.includes('passwd')),
    wordsKept: exact(newChunked(HOSTILE).tree).includes('Before the attack.') && exact(newChunked(HOSTILE).tree).includes('After the attack.'),
    highlighted: styles
  };
}

if (ARMS.has('plan')) {
  let at = 0;
  const sized = (sizes: number[]) => sizes.map((s) => ({ start: at, end: (at += s) }));
  at = 0;
  const hundred = sized(Array(40).fill(100));
  at = 0;
  const big = scan.WINDOW_BATCH_CHARS as number;
  const fat = sized([100, big, 100, big * 3, 100]);
  const { chunks } = scan.scanChunks(twinA);
  const seen: number[] = [];
  let end = scan.windowEnd(chunks, 0, scan.WINDOW_INITIAL_CHUNKS, scan.WINDOW_INITIAL_CHARS);
  const firstWindowChars = chunks.slice(0, end).reduce((s: number, c: { start: number; end: number }) => s + c.end - c.start, 0);
  const firstWindowChunks = end;
  for (let i = 0; i < end; i++) seen.push(i);
  let windows = 1;
  let worstWindowChars = firstWindowChars;
  while (end < chunks.length) {
    const next = scan.windowEnd(chunks, end, scan.WINDOW_BATCH_CHUNKS, scan.WINDOW_BATCH_CHARS);
    if (next <= end) break;
    const chars = chunks.slice(end, next).reduce((s: number, c: { start: number; end: number }) => s + c.end - c.start, 0);
    if (next - end > 1) worstWindowChars = Math.max(worstWindowChars, chars);
    for (let i = end; i < next; i++) seen.push(i);
    end = next;
    windows += 1;
  }
  out['plan'] = {
    constants: {
      WINDOW_CHUNK_LINES: scan.WINDOW_CHUNK_LINES,
      WINDOW_INITIAL_CHUNKS: scan.WINDOW_INITIAL_CHUNKS,
      WINDOW_INITIAL_CHARS: scan.WINDOW_INITIAL_CHARS,
      WINDOW_BATCH_CHUNKS: scan.WINDOW_BATCH_CHUNKS,
      WINDOW_BATCH_CHARS: scan.WINDOW_BATCH_CHARS
    },
    countCap: scan.windowEnd(hundred, 0, scan.WINDOW_INITIAL_CHUNKS, scan.WINDOW_INITIAL_CHARS),
    charCap: [0, 1, 2, 3, 4, 5].map((from) => scan.windowEnd(fat, from, scan.WINDOW_BATCH_CHUNKS, scan.WINDOW_BATCH_CHARS)),
    twinA: { chunks: chunks.length, firstWindowChunks, firstWindowChars, windows, worstMultiChunkWindowChars: worstWindowChars, everyChunkOnce: seen.length === chunks.length && seen.every((v, i) => v === i) }
  };
}

if (ARMS.has('guard')) {
  const FN = '[^1]: a footnote\n\n';
  const footnoteDoc = (len: number): string => `${FN}${'x'.repeat(len - FN.length)}`;
  const tableFirst = (chars: number): string => {
    const head = '| a | b |\n| --- | --- |\n';
    const row = '| cell | cell |\n';
    return `${head}${row.repeat(Math.ceil((chars - head.length) / row.length))}\n${paragraphs(4)}\n`;
  };
  const cap = prose.PREVIEW_DEFER_FIRST_CHUNK_CHARS as number;
  const sizeCap = prose.PREVIEW_DEFER_CHARS as number;
  out['guard'] = {
    constants: { PREVIEW_DEFER_CHARS: sizeCap, PREVIEW_DEFER_FIRST_CHUNK_CHARS: cap },
    footnoteAtCap: prose.previewDeferred(footnoteDoc(sizeCap)),
    footnoteInQuotePastCap: prose.previewDeferred(`> [^1]: a quoted footnote\n\n${'x'.repeat(sizeCap)}`),
    footnoteInListPastCap: prose.previewDeferred(`- [^1]: a listed footnote\n\n${'x'.repeat(sizeCap)}`),
    footnotePastCap: prose.previewDeferred(footnoteDoc(sizeCap + 1)),
    tableFirstPastCap: prose.previewDeferred(tableFirst(cap + 64)),
    tableFirstUnderCap: prose.previewDeferred(tableFirst(cap - 4096)),
    twinA: prose.previewDeferred(twinA),
    twinB: prose.previewDeferred(twinB),
    prose3mb: prose.previewDeferred(paragraphs(80000))
  };
}

if (ARMS.has('cache')) {
  const texts = (src: string): string[] => scan.chunkTexts(src, scan.scanChunks(src));
  const before = texts(twinA);
  const lines = twinA.split('\n');
  const mid = lines.findIndex((l, i) => i > lines.length / 2 && /^[a-z]{4,} [a-z]{4,} [a-z]{4,}/.test(l));
  if (mid < 0) throw new Error('the cache arm found no paragraph line to edit in twin A');
  const edited = [...lines];
  edited[mid] = `${edited[mid]} edited`;
  const afterEdit = texts(edited.join('\n'));
  const afterAppend = texts(`${twinA}\n\nOne more paragraph at the end.\n`);
  const changed = (a: string[], b: string[]): number => a.filter((t, i) => b[i] !== t).length;
  // Which drawn chunks the memo redraws when a DEFINITION changes: draw every
  // chunk through the shipping renderer, change the document, and ask the
  // shipping memo question of every position.
  const refDoc = (href: string, extra: string): string =>
    `${paragraphs(10)}\n\nSee [site] early.\n\n${paragraphs(200, 100)}\n\nSee [site] late.\n\n${paragraphs(40, 400)}\n\n[site]: ${href}${extra}\n`;
  const redraws = (from: string, to: string): { redrawn: number; chunks: number } => {
    const renderer = chunk.createChunkRenderer(md, proc, (t: N) => t);
    const a = texts(from);
    const refsA = chunk.collectReferences(collector, a);
    for (const t of a) renderer.render(t, refsA);
    const b = texts(to);
    const refsB = chunk.collectReferences(collector, b);
    let redrawn = 0;
    for (let i = 0; i < b.length; i++) {
      const prev = { text: a[i] as string, references: refsA, renderer };
      const next = { text: b[i] as string, references: refsB, renderer };
      if (a[i] === undefined || !chunk.sameChunkProps(prev, next)) redrawn += 1;
    }
    return { redrawn, chunks: b.length };
  };
  const base = refDoc('https://first.example', '');
  out['cache'] = {
    editChangedChunks: changed(before, afterEdit),
    editSameCount: afterEdit.length === before.length,
    appendChangedOldChunks: changed(before, afterAppend),
    definitionChanged: redraws(base, refDoc('https://second.example', '')),
    definitionAdded: redraws(base, refDoc('https://first.example', '\n[other]: https://other.example')),
    memoized: /const MarkdownChunk = React\.memo\(function MarkdownChunk\([\s\S]*?\n\}, sameChunkProps\);/.test(implText),
    keyedByPosition: /<MarkdownChunk key=\{i\} text=\{text\} references=\{references\} renderer=\{renderer\} \/>/.test(implText)
  };
}

if (ARMS.has('stream')) {
  // A task queue the probe runs by hand, one task per call.
  const tasks: (() => void)[] = [];
  const request = (task: () => void): (() => void) => {
    tasks.push(task);
    return () => {
      const k = tasks.indexOf(task);
      if (k >= 0) tasks.splice(k, 1);
    };
  };
  const runTask = (): void => {
    tasks.shift()?.();
  };
  const log: string[] = [];
  chunk.streamWindow(request, () => log.push('parse'), () => log.push('draw'));
  runTask();
  log.push('|');
  runTask();
  log.push('|');
  const cancelled: string[] = [];
  const cancel = chunk.streamWindow(request, () => cancelled.push('parse'), () => cancelled.push('draw'));
  runTask();
  cancel();
  while (tasks.length > 0) runTask();
  // The renderer draws the tree the stream parsed, unless a definition it read changed.
  const counted = chunk.createChunkParser();
  const render = counted.render.bind(counted);
  let parses = 0;
  counted.render = (src: string, env?: unknown) => {
    parses += 1;
    return render(src, env);
  };
  const renderer = chunk.createChunkRenderer(counted, proc, (t: N) => t);
  const text = 'See [a] here.';
  const refsA = chunk.collectReferences(collector, ['[a]: https://a.example']);
  const refsB = chunk.collectReferences(collector, ['[a]: https://b.example']);
  const parsesAfter: number[] = [];
  renderer.prepare(text, refsA);
  parsesAfter.push(parses);
  renderer.render(text, refsA);
  parsesAfter.push(parses);
  renderer.prepare(text, refsA);
  renderer.render(text, refsB);
  parsesAfter.push(parses);
  out['stream'] = {
    order: log.join(' '),
    cancelled: cancelled.join(' '),
    parses: parsesAfter,
    implStreams: /streamWindow\(\s*idleRequest,\s*\(\) => \{\s*for \(let i = shown; i < end; i\+\+\) renderer\.prepare\(/.test(implText)
  };
}

if (ARMS.has('dom')) {
  const src = `Intro.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n\`\`\`ts\nconst x = 1;\n\`\`\`\n\n> quote`;
  const top = (newChunked(src).tree.children ?? []).filter((n) => n.type === 'element').map((n) => n.tagName);
  const chunkBody = /const MarkdownChunk = React\.memo\(function MarkdownChunk\([\s\S]*?\{\n\s*return (.*);\n\}, sameChunkProps\);/.exec(implText)?.[1] ?? null;
  const windowedReturn = /return \(\n\s*<>\n\s*\{texts\.slice\(0, shown\)\.map/.test(implText);
  out['dom'] = { topLevel: top, chunkReturns: chunkBody, windowedReturnsFragment: windowedReturn };
}

console.log(JSON.stringify(out));
