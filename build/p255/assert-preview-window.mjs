#!/usr/bin/env node
/**
 * assert-preview-window.mjs — `npm run conformance:preview`. PHASE 255.
 *
 * Launches no Electron, starts no tmux server, makes no request and reads
 * nothing under the person's home. It spawns one plain node running the
 * pinned tsx per copy it judges, and writes every copy into a scratch
 * directory it removes in a `finally`.
 *
 * THE PROMISE IT KEEPS EXECUTABLE. The file preview used to draw a markdown
 * document in one synchronous pass — nothing painted until the whole page
 * was elements, 2,298 ms on the 2.56 MB twin at the parent. Now it CUTS the
 * document at blank lines where a cut cannot change the page, parses each
 * chunk with markdown-it under the same sanitizer, Shiki step and components
 * map, draws a first window and streams the rest. A faster preview that
 * draws a different page is a different preview, so every clause that keeps
 * the page the same is a rule here, and every rule is ablated.
 *
 *   0. The modules exist. A copy of the tree with the scanner or the parser
 *      removed must be named here, not crash the gate.
 *   1. THE WINDOW CHANGES NOTHING. Over this repository's own markdown, both
 *      twins and one fixture per veto, the chunked render equals the whole
 *      render node for node; and the scanner really cuts — the twins' chunk
 *      counts are pinned, and a document that mentions `<table>` in
 *      backticks is still cut. THE FIX ROUND added one fixture per clause of
 *      the scanner's model of parse5's open elements (an ordinary element an
 *      HTML block leaves open, a formatting element a paragraph leaves open,
 *      an end tag in indented code or a one-line comment, raw text opened in
 *      a paragraph, an end tag outside its scope or inside a paragraph) and
 *      one per way a reference definition was misread (a lookalike line, a
 *      destination on the next line, a definition in a blockquote or a
 *      comment), plus three documents a cut must still REACH, so a model that
 *      merged everything would fail too.
 *   2. THE PARSER DRAWS WHAT REMARK DREW. Over the same corpus and the twins,
 *      the new render equals the old react-markdown render as the page draws
 *      it, and every file that does not is classified into an enumerated
 *      class whose file list is pinned: a GFM email autolink remark made of
 *      a filename (`22.13.56@2x.png`) that markdown-it rightly does not. An
 *      UNCLASSIFIED file is a failure.
 *   3. THE PARITY SHIMS. `~~x~~` draws `del`, table alignment reaches the
 *      tree as `align`, a bare `CLAUDE.md` is not a link, task lists match,
 *      and the `www.` battery links every shape GFM links, with its residual
 *      shapes pinned by name. The fix round's shapes battery holds every
 *      difference the verifier found in its own corpus and in 788 real files:
 *      each draws the page remark drew or is pinned by name with its reason
 *      (`shapeResidual`).
 *   4. THE SANITIZER IS STILL THE WALL, AND STILL BEFORE SHIKI. The hostile
 *      fixture reaches no dangerous tag, no handler, no javascript: URL, no
 *      style and no hand-written gmux-asset path, the words around it
 *      survive, and a highlighter's styles are kept while a file's are not.
 *   5. THE WINDOW'S CAPS. The constants are pinned; a window stops at its
 *      chunk count and before its char budget, always takes one chunk, and
 *      successive windows over twin A draw every chunk exactly once.
 *   6. THE DEFERRAL, RE-DERIVED. Size alone never defers; a first chunk past
 *      1 MiB does, at its boundary; a footnote document keeps Phase 254's
 *      256 KiB, at its boundary.
 *   7. THE CACHE. An edit inside one paragraph of twin A changes exactly one
 *      chunk's text, an append changes none of the old chunks, and each
 *      chunk is held by React.memo keyed by position. Since the fix round the
 *      memo's own question is asked: a changed definition redraws the two
 *      chunks that use it and the one that holds it, and an unrelated new
 *      definition redraws only its own chunk.
 *   8. THE WIDE-BLOCK DOM SHAPE. A table and a fence are top-level nodes of a
 *      chunk's tree, a chunk mounts as a fragment, and the stream returns a
 *      fragment — so `.md-table-scroll` and `pre` stay direct children of
 *      `.md-content`, which conformance:wideblocks' selectors require.
 *   9. THE STREAM PARSES A WINDOW IN ONE TASK AND DRAWS IT IN THE NEXT, so a
 *      large uncuttable run costs two tasks of about half its price rather
 *      than one; a cancel between them draws nothing; and a drawn chunk takes
 *      the tree the stream parsed unless a definition it read has changed.
 *
 * WHAT IT DOES NOT PROVE: milliseconds. Those are probe:p255's, in the
 * running app, at the parent and at HEAD.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[preview-window]';
const SRC = 'src/renderer/editor/markdown';
const FILES = ['window-scan.ts', 'chunk-parse.ts', 'pipeline.ts', 'large-prose.ts', 'markdown-impl.tsx'];
const say = (l) => console.log(`${TAG} ${l}`);

// ---------------------------------------------------------------------------
// The pinned expectations
// ---------------------------------------------------------------------------

export const EXPECT = {
  twinChunks: { a: 324, b: 336 },
  backtickedTagChunksAtLeast: 40,
  parity: {
    'email-autolink': ['docs/BACKLOG.md', 'docs/research/49-arch-pane.md']
  },
  /**
   * The www. shapes whose drawn page still differs from remark-gfm's, each
   * a question of where the link ENDS or of a host GFM accepts and linkify
   * does not: an underscore before the last two labels, a bare `www.`, a
   * trailing `&name;`, a trailing quote, a trailing bracket, and a raw tag
   * straight after the host. Every other shape in the battery matches.
   */
  wwwResidual: [
    'www.a_b.c.d',
    'www.',
    'www.google.com/search?q=commonmark&hl;',
    'www.example.com<b>'
  ],
  /** Every document in the window arm's CUTS must still be cut at least this often. */
  cutsAtLeast: 20,
  /**
   * The page shapes that still draw differently from remark, each with the
   * reason. The first three are one class: GFM links a bare address and the
   * preview draws a mailto: link as a plain span, so the same words are drawn
   * with a span around them there and without one here.
   */
  shapeResidual: {
    'an address in angle-bracket entities': 'GFM links a bare address; the preview draws a mailto: link as a plain span',
    'a package name with an at sign': 'the same class: GFM made an address of npmlog@3.x',
    'a mailto: prefix': 'the same class, split one word earlier',
    'a URL after a plus sign': 'linkify-it wants a boundary before a scheme and + is not one, so git+https:// is not linked',
    'a no-break space before a destination': 'remark keeps U+00A0 in the destination and draws a dead link; markdown-it drops it and draws a working one',
    'a definition to a refused scheme': "markdown-it's validateLink refuses the definition and draws its line as text, once"
  },
  constants: {
    WINDOW_CHUNK_LINES: 60,
    WINDOW_INITIAL_CHUNKS: 12,
    WINDOW_INITIAL_CHARS: 128 * 1024,
    WINDOW_BATCH_CHUNKS: 12,
    WINDOW_BATCH_CHARS: 256 * 1024,
    PREVIEW_DEFER_CHARS: 256 * 1024,
    PREVIEW_DEFER_FIRST_CHUNK_CHARS: 1024 * 1024
  }
};

// ---------------------------------------------------------------------------
// The rules, over one reading
// ---------------------------------------------------------------------------

export function judge(r) {
  const bad = [];
  const fail = (rule, why) => bad.push({ rule, why });
  if (Array.isArray(r.absent)) {
    fail(0, `the preview's modules are not all there: ${r.absent.join('; ')}`);
    return bad;
  }
  const w = r.window;
  if (w !== undefined) {
    if (w.differ.length > 0) fail(1, `the chunked render differs from the whole render in ${w.differ.join(', ')}`);
    for (const k of ['a', 'b']) {
      if (w.twins[k].same !== true) fail(1, `twin ${k}'s chunked render differs from its whole render`);
      if (w.twins[k].chunks !== EXPECT.twinChunks[k]) fail(1, `twin ${k} cuts into ${w.twins[k].chunks} chunks, pinned at ${EXPECT.twinChunks[k]}`);
    }
    for (const [name, f] of Object.entries(w.fixtures)) {
      if (f.same !== true) fail(1, `the "${name}" fixture draws differently once cut`);
      if (f.chunks < 3) fail(1, `the "${name}" fixture was cut into ${f.chunks} chunk(s), so it tests no cut`);
    }
    if (w.backtickedTagChunks < EXPECT.backtickedTagChunksAtLeast) fail(1, `a tag written in backticks held the cuts closed: ${w.backtickedTagChunks} chunks`);
    for (const [name, count] of Object.entries(w.cuts ?? {})) {
      if (count < EXPECT.cutsAtLeast) fail(1, `"${name}" was cut into ${count} chunk(s); the model held cuts closed that parse5 would not`);
    }
  }
  const p = r.parity;
  if (p !== undefined) {
    const got = Object.fromEntries(Object.entries(p.classes).map(([k, v]) => [k, [...v].sort()]));
    const want = Object.fromEntries(Object.entries(EXPECT.parity).map(([k, v]) => [k, [...v].sort()]));
    for (const k of new Set([...Object.keys(got), ...Object.keys(want)])) {
      if (JSON.stringify(got[k] ?? []) !== JSON.stringify(want[k] ?? [])) {
        fail(2, `the "${k}" class holds ${JSON.stringify(got[k] ?? [])}, pinned at ${JSON.stringify(want[k] ?? [])}`);
      }
    }
    if (p.identical + Object.values(p.classes).flat().length !== p.files) fail(2, 'the parity reading does not account for every file');
  }
  const s = r.shims;
  if (s !== undefined) {
    if (s.strike.same !== true || s.strike.del !== 1) fail(3, `~~x~~ draws ${s.strike.del} del element(s) and matches remark: ${s.strike.same}`);
    if (s.table.same !== true || s.table.aligned !== 3) fail(3, `an aligned table reaches the tree with ${s.table.aligned} aligned header cell(s) of 3 and matches remark: ${s.table.same}`);
    if (s.fuzzy.same !== true || s.fuzzy.links !== 0) fail(3, `a bare filename or domain draws ${s.fuzzy.links} link(s)`);
    if (s.tasks.same !== true) fail(3, 'a task list draws differently from remark');
    if (JSON.stringify([...s.www.residual].sort()) !== JSON.stringify([...EXPECT.wwwResidual].sort())) {
      fail(3, `the www. shapes that differ from remark are ${JSON.stringify(s.www.residual)}, pinned at ${JSON.stringify(EXPECT.wwwResidual)}`);
    }
    const pinned = Object.keys(EXPECT.shapeResidual).sort();
    if (JSON.stringify([...(s.shapeResidual ?? [])].sort()) !== JSON.stringify(pinned)) {
      fail(3, `the page shapes that differ from remark are ${JSON.stringify(s.shapeResidual)}, pinned at ${JSON.stringify(pinned)}`);
    }
  }
  const z = r.sanitize;
  if (z !== undefined) {
    for (const [k, v] of [['dangerous tags', z.dangerousTags], ['event handlers', z.handlers], ['javascript: URLs', z.javascriptUrls], ['styles from the file', z.styles], ['a hand-written gmux-asset path', z.passwd]]) {
      if (v.length > 0) fail(4, `the hostile fixture reached the tree: ${k} ${JSON.stringify(v)}`);
    }
    if (z.wordsKept !== true) fail(4, 'the words around the hostile fixture were lost');
    if (!z.highlighted.includes('pre:background-color:#131417')) fail(4, `the highlighter's styles did not survive: ${JSON.stringify(z.highlighted)}`);
    if (z.highlighted.some((x) => x.includes('color:red'))) fail(4, 'a style written in the file survived beside the highlighter');
  }
  const pl = r.plan;
  if (pl !== undefined) {
    for (const [k, v] of Object.entries(EXPECT.constants)) {
      if (k in pl.constants && pl.constants[k] !== v) fail(5, `${k} is ${pl.constants[k]}, pinned at ${v}`);
    }
    if (pl.countCap !== 12) fail(5, `a window of small chunks ended at ${pl.countCap}, not at its chunk count`);
    if (JSON.stringify(pl.charCap) !== JSON.stringify([1, 2, 3, 4, 5, 5])) fail(5, `the char budget gave windows ending ${JSON.stringify(pl.charCap)}`);
    if (pl.twinA.everyChunkOnce !== true) fail(5, 'successive windows over twin A did not draw every chunk exactly once');
    if (pl.twinA.firstWindowChunks > 1 && pl.twinA.firstWindowChars > EXPECT.constants.WINDOW_INITIAL_CHARS) fail(5, `twin A's first window holds ${pl.twinA.firstWindowChars} chars`);
    if (pl.twinA.worstMultiChunkWindowChars > EXPECT.constants.WINDOW_BATCH_CHARS) fail(5, `a streamed window of several chunks holds ${pl.twinA.worstMultiChunkWindowChars} chars`);
  }
  const g = r.guard;
  if (g !== undefined) {
    for (const [k, v] of Object.entries(g.constants)) if (EXPECT.constants[k] !== v) fail(6, `${k} is ${v}, pinned at ${EXPECT.constants[k]}`);
    const want = { footnoteAtCap: false, footnotePastCap: true, footnoteInQuotePastCap: true, footnoteInListPastCap: true, tableFirstPastCap: true, tableFirstUnderCap: false, twinA: false, twinB: false, prose3mb: false };
    for (const [k, v] of Object.entries(want)) if (g[k] !== v) fail(6, `previewDeferred(${k}) is ${g[k]}, should be ${v}`);
  }
  const c = r.cache;
  if (c !== undefined) {
    if (c.editChangedChunks !== 1 || c.editSameCount !== true) fail(7, `an edit inside one paragraph changed ${c.editChangedChunks} chunk text(s)`);
    if (c.appendChangedOldChunks > 1) fail(7, `an append at the end changed ${c.appendChangedOldChunks} of the old chunks`);
    if (c.definitionChanged?.redrawn !== 3) fail(7, `a changed definition redrew ${c.definitionChanged?.redrawn} chunk(s), not its two users and its own chunk`);
    if (c.definitionAdded?.redrawn !== 1) fail(7, `an unrelated new definition redrew ${c.definitionAdded?.redrawn} chunk(s), not only its own`);
    if (c.memoized !== true) fail(7, 'MarkdownChunk is not held by React.memo with sameChunkProps');
    if (c.keyedByPosition !== true) fail(7, 'the drawn chunks are not the memoized component keyed by position');
  }
  const d = r.dom;
  if (d !== undefined) {
    if (!d.topLevel.includes('table') || !d.topLevel.includes('pre')) fail(8, `a chunk's top level is ${JSON.stringify(d.topLevel)}; a table and a fence must be on it`);
    if (d.chunkReturns !== '<>{renderer.render(text, references)}</>') fail(8, `a chunk mounts as ${JSON.stringify(d.chunkReturns)}, not a fragment`);
    if (d.windowedReturnsFragment !== true) fail(8, 'the stream does not return a fragment');
  }
  const st = r.stream;
  if (st !== undefined) {
    if (st.order !== 'parse | draw |') fail(9, `one window ran as ${JSON.stringify(st.order)}, not a parse task then a draw task`);
    if (st.cancelled !== 'parse') fail(9, `a window cancelled after its parse ran ${JSON.stringify(st.cancelled)}`);
    if (JSON.stringify(st.parses) !== '[1,1,3]') fail(9, `the renderer parsed ${JSON.stringify(st.parses)} times, not [1,1,3]: a prepared tree must be drawn, and one whose definitions changed must not`);
    if (st.implStreams !== true) fail(9, 'the preview does not stream through streamWindow with renderer.prepare');
  }
  return bad;
}

// ---------------------------------------------------------------------------
// The ablations: one clause each, over a copy, and the rule that must go red
// ---------------------------------------------------------------------------

const ABLATIONS = [
  { name: 'the scanner and the parser deleted (the parent tree)', rule: 0, delete: ['window-scan.ts', 'chunk-parse.ts'] },
  { name: 'the list veto removed', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'if (indent >= 4 || (inList && prevListish)) vetoBefore[i] = 1;', to: 'if (indent >= 4) vetoBefore[i] = 1;' },
  { name: 'the fence state removed', rule: 1, arms: 'window', file: 'window-scan.ts', from: '        fence = fm[1] as string;\n', to: '' },
  { name: 'the open-element veto removed', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'cuttable[i] = stack.length === 0 ? 1 : 0;', to: 'cuttable[i] = 1;' },
  { name: 'the HTML comment state removed', rule: 1, arms: 'window', file: 'window-scan.ts', from: "          comment = inline ? 'inline' : 'block';", to: '          comment = null;' },
  { name: 'code spans counted as tags', rule: 1, arms: 'window', file: 'window-scan.ts', from: '      if (inline && c === 96) {', to: '      if (false && c === 96) {' },
  { name: 'a tab counted as one column', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'else if (ch === 9) col += 4 - (col % 4);', to: 'else if (ch === 9) col += 1;' },
  // The fix round's model of parse5's open elements, one clause each.
  { name: 'an element an HTML block opens dropped at the blank line', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'const entry = { name, droppable: inline && !SPECIAL.has(name) && !FORMATTING.has(name) };', to: 'const entry = { name, droppable: !SPECIAL.has(name) && !FORMATTING.has(name) };' },
  { name: 'a formatting element a paragraph opens dropped at the blank line', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'const entry = { name, droppable: inline && !SPECIAL.has(name) && !FORMATTING.has(name) };', to: 'const entry = { name, droppable: inline && !SPECIAL.has(name) };' },
  { name: 'tags read inside indented code', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'if (!htmlBlock && indent >= 4 && !inList && (startsBlock || prevCode)) {', to: 'if (false) {' },
  { name: 'tags read inside a one-line comment', rule: 1, arms: 'window', file: 'window-scan.ts', from: "          i = at + 3;\n        } else {\n          comment = inline", to: "          i += 4;\n        } else {\n          comment = inline" },
  { name: 'raw text not swallowed', rule: 1, arms: 'window', file: 'window-scan.ts', from: '    if (RAWTEXT.has(t.name)) {', to: '    if (false) {' },
  { name: 'an end tag searched past its scope', rule: 1, arms: 'window', file: 'window-scan.ts', from: '      if (scope.has(e.name) || (ordinary && SPECIAL.has(e.name))) return;', to: '      if (ordinary && SPECIAL.has(e.name)) return;' },
  { name: 'an ordinary end tag inside a paragraph counted', rule: 1, arms: 'window', file: 'window-scan.ts', from: '    if (inline && ordinary) return;\n', to: '' },
  { name: 'a formatting element popped by an outer end tag', rule: 1, arms: 'window', file: 'window-scan.ts', from: 'const kept = stack.slice(k + 1).filter((e) => FORMATTING.has(e.name));', to: 'const kept: OpenElement[] = [];' },
  { name: "a markdown block no longer closing an open <p>", rule: 1, arms: 'window', file: 'window-scan.ts', from: '      } else if (ATX_RE.test(line) || /^ {0,3}>/.test(line) || (startsBlock && !REF_DEF_RE.test(line))) {', to: '      } else if (false) {' },
  { name: "a paragraph's ordinary elements kept past its end", rule: 1, arms: 'window', file: 'window-scan.ts', from: '      for (let k = stack.length - 1; k >= 0; k--) if ((stack[k] as OpenElement).droppable) stack.splice(k, 1);\n', to: '' },
  { name: 'a self-closed foreign element left open', rule: 1, arms: 'window', file: 'window-scan.ts', from: '    if (selfClosed && foreign) {', to: '    if (false) {' },
  // The definitions, read by markdown-it and handed over as a table.
  { name: 'the definition table not handed to a chunk', rule: 1, arms: 'window', file: 'chunk-parse.ts', from: 'const html = md.render(text, { references: lookupTable(references, used) });', to: 'const html = md.render(text, { references: lookupTable(NO_REFERENCES, used) });' },
  { name: 'the collector skipping a definition whose destination is on the next line', rule: 1, arms: 'window', file: 'chunk-parse.ts', from: "if (!text.includes(']:')) continue;", to: "if (!text.includes(']: ')) continue;" },
  { name: 'a later definition winning', rule: 1, arms: 'window', file: 'chunk-parse.ts', from: 'if (!Object.hasOwn(table, label)) table[label] = ref;', to: 'table[label] = ref;' },
  { name: 'the del shim removed', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: "  md.renderer.rules['s_open'] = () => '<del>';\n  md.renderer.rules['s_close'] = () => '</del>';", to: '' },
  { name: 'the table alignment shim removed', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: "      if (m !== null) token.attrs[at] = ['align', m[1] as string];", to: '' },
  { name: 'fuzzy links left on', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: 'md.linkify.set({ fuzzyLink: false });', to: 'md.linkify.set({ fuzzyLink: true });' },
  { name: 'the www. schema removed', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: "  md.linkify.add('www.', {", to: "  md.linkify.add('unused-www.', {" },
  { name: 'the task list plugin removed', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: '.use(\n    markdownItTaskLists\n  )', to: '' },
  { name: 'the single-tilde strikethrough rule removed', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: "  md.inline.ruler.at('strikethrough', gfmStrikeTokenize);\n  md.inline.ruler2.at('strikethrough', gfmStrikePostProcess);\n", to: '' },
  { name: "a tilde run's size left out of its marker", rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: 'marker: scanned.length === 1 ? STRIKE_ONE : STRIKE_TWO,', to: 'marker: STRIKE_TWO,' },
  { name: "GFM's trailing punctuation kept in a URL", rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: '    return m === null ? null : trimTrail(m);', to: '    return m;' },
  { name: 'autolink text percent-decoded', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: '  md.normalizeLinkText = (url) => url;\n', to: '' },
  { name: 'a code block at the end of the file left without its newline', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: "        token.content += '\\n';\n", to: '' },
  { name: 'parse5 left with scripting on', rule: 3, arms: 'shims', file: 'chunk-parse.ts', from: 'parseFragment(html, { scriptingEnabled: false })', to: 'parseFragment(html)' },
  { name: "react-markdown's URL transform removed", rule: 4, arms: 'sanitize', file: 'chunk-parse.ts', from: '  transformUrls(tree, null, 0);\n', to: '' },
  { name: 'the sanitizer removed from the chunk path', rule: 4, arms: 'sanitize', file: 'pipeline.ts', from: '  return sanitizeThenHighlight(highlighter, theme);\n}\n\n/**\n * The rehype plugin list for an AGENT', to: '  return sanitizeThenHighlight(highlighter, theme).slice(1);\n}\n\n/**\n * The rehype plugin list for an AGENT' },
  { name: 'Shiki moved in front of the sanitizer', rule: 4, arms: 'sanitize', file: 'pipeline.ts', from: '  return sanitizeThenHighlight(highlighter, theme);\n}\n\n/**\n * The rehype plugin list for an AGENT', to: '  return sanitizeThenHighlight(highlighter, theme).reverse();\n}\n\n/**\n * The rehype plugin list for an AGENT' },
  { name: 'the window char budget removed', rule: 5, arms: 'plan', file: 'window-scan.ts', from: '    if (end > from && chars + size > maxChars) break;\n', to: '' },
  { name: 'the first window allowed to take nothing', rule: 5, arms: 'plan', file: 'window-scan.ts', from: 'if (end > from && chars + size > maxChars) break;', to: 'if (chars + size > maxChars) break;' },
  { name: 'the guard put back to the file size', rule: 6, arms: 'guard', file: 'large-prose.ts', from: '    const first = scanChunks(source).chunks[0];\n    answer =\n      first !== undefined &&\n      first.end - first.start > PREVIEW_DEFER_FIRST_CHUNK_CHARS;', to: '    answer = source.length > PREVIEW_DEFER_FIRST_CHUNK_CHARS;' },
  { name: 'the footnote clause removed from the guard', rule: 6, arms: 'guard', file: 'large-prose.ts', from: '  if (hasFootnotes(source)) {\n    answer = true;\n  } else if', to: '  if (false) {\n    answer = true;\n  } else if' },
  { name: 'a footnote inside a quote or a list item not seen', rule: 6, arms: 'guard', file: 'window-scan.ts', from: String.raw`const FOOTNOTE_DEF_RE = /^[ \t>]*(?:(?:[-+*]|\d{1,9}[.)])[ \t]+[ \t>]*)*\[\^[^\]\n]+\]:/m;`, to: String.raw`const FOOTNOTE_DEF_RE = /^ {0,3}\[\^[^\]]+\]:/m;` },
  { name: 'the chunk memo removed', rule: 7, arms: 'cache', file: 'markdown-impl.tsx', from: 'const MarkdownChunk = React.memo(function MarkdownChunk(', to: 'const MarkdownChunk = (function MarkdownChunk(' },
  { name: 'the labels a chunk looked up not recorded', rule: 7, arms: 'cache', file: 'chunk-parse.ts', from: '      used?.add(key);\n', to: '' },
  { name: 'the memo blind to definitions', rule: 7, arms: 'cache', file: 'chunk-parse.ts', from: '    prev.renderer === next.renderer &&\n    sameReferences(next.renderer.usedBy(next.text), prev.references, next.references)', to: '    prev.renderer === next.renderer' },
  { name: 'a chunk wrapped in an element', rule: 8, arms: 'dom', file: 'markdown-impl.tsx', from: '  return <>{renderer.render(text, references)}</>;', to: '  return <div className="md-chunk">{renderer.render(text, references)}</div>;' },
  { name: 'a window parsed and drawn in one task', rule: 9, arms: 'stream', file: 'chunk-parse.ts', from: '    prepare();\n    cancel = request(draw);', to: '    prepare();\n    draw();' },
  { name: 'the tree the stream parsed not drawn', rule: 9, arms: 'stream', file: 'chunk-parse.ts', from: '      let p = prepared.get(text);', to: '      let p = undefined as ReturnType<typeof parse> | undefined;' },
  { name: 'a parsed tree drawn after a definition it read changed', rule: 9, arms: 'stream', file: 'chunk-parse.ts', from: '      if (p === undefined || !sameReferences(p.used, p.references, references)) {', to: '      if (p === undefined) {' }
];

function runProbe(dir, arms) {
  const args = [tsxCli(), 'build/p255/preview-probe.mts', '--dir', relative(REPO, dir)];
  if (arms !== undefined) args.push('--arms', arms);
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return { error: `the probe did not run: ${(r.stderr || r.stdout || '').split('\n').slice(0, 6).join(' | ')}` };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { error: `the probe did not print JSON: ${r.stdout.slice(0, 300)}` };
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const started = Date.now();
let failed = false;
const live = runProbe(join(REPO, SRC));
if (live.error !== undefined) {
  say(`FAIL ${live.error}`);
  process.exit(1);
}
const findings = judge(live);
for (const f of findings) say(`FAIL rule ${f.rule}: ${f.why}`);
failed = findings.length > 0;
if (!failed) {
  const w = live.window;
  const p = live.parity;
  say(`1. over ${w.files} markdown files and both twins the chunked render equals the whole render; ${w.chunks} chunks, the largest ${w.biggest.size} chars (${w.biggest.name}); twin A ${w.twins.a.chunks} chunks, twin B ${w.twins.b.chunks}; ${Object.keys(w.fixtures).length} veto fixtures each cut and unchanged; ${Object.keys(w.cuts).length} documents still cut at least ${EXPECT.cutsAtLeast} times`);
  say(`2. of ${p.files} documents ${p.identical} draw the same page as the old render (${p.whitespaceOnly} of them differ only in whitespace the page does not draw); ${Object.entries(p.classes).map(([k, v]) => `${v.length} ${k}`).join(', ') || 'no others'}`);
  say(`3. del, align, no fuzzy links, task lists; ${live.shims.www.linked} of ${live.shims.www.shapes} www. shapes linked, ${live.shims.www.residual.length} differing from remark as pinned; ${live.shims.shapes - live.shims.shapeResidual.length} of ${live.shims.shapes} page shapes draw remark's page, ${live.shims.shapeResidual.length} pinned by name`);
  say('4. the hostile fixture reaches nothing, the words survive, the highlighter\'s styles survive and the file\'s do not');
  say(`5. windows of ${live.plan.twinA.firstWindowChunks} then up to ${EXPECT.constants.WINDOW_BATCH_CHUNKS} chunks, twin A in ${live.plan.twinA.windows} windows, every chunk once`);
  say('6. size alone never defers; a first chunk past 1 MiB does; a footnote document past 256 KiB does');
  say(`7. an edit changes ${live.cache.editChangedChunks} chunk, an append ${live.cache.appendChangedOldChunks} old ones; a changed definition redraws ${live.cache.definitionChanged.redrawn} of ${live.cache.definitionChanged.chunks}, an unrelated one ${live.cache.definitionAdded.redrawn}; React.memo keyed by position`);
  say(`8. a chunk's top level is ${JSON.stringify(live.dom.topLevel)}, mounted as a fragment`);
  say(`9. a window is ${live.stream.order}; the renderer parsed ${JSON.stringify(live.stream.parses)}`);
}

const scratch = mkdtempSync(join(REPO, '.p255-ablate-'));
try {
  let red = 0;
  for (const a of ABLATIONS) {
    const dir = join(scratch, a.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 48));
    cpSync(join(REPO, SRC), dir, { recursive: true, filter: (p) => !p.includes('__tests__') });
    if (a.delete !== undefined) {
      for (const f of a.delete) rmSync(join(dir, f));
    } else {
      const file = join(dir, a.file);
      const text = readFileSync(file, 'utf8');
      if (!text.includes(a.from)) {
        say(`FAIL ablation "${a.name}" found nothing to edit in ${a.file}`);
        failed = true;
        continue;
      }
      writeFileSync(file, text.replace(a.from, a.to));
    }
    const reading = runProbe(dir, a.arms);
    const rules = reading.error !== undefined ? [] : judge(reading).map((f) => f.rule);
    const ok = rules.includes(a.rule);
    if (ok) red += 1;
    else failed = true;
    say(`${ok ? 'red ' : 'FAIL'} ablation: ${a.name} -> ${reading.error ?? (rules.length === 0 ? 'every rule stayed green' : `rules ${[...new Set(rules)].join(', ')}`)}${ok ? '' : ` (wanted rule ${a.rule})`}`);
  }
  say(`${red} of ${ABLATIONS.length} ablations went red on the rule that owns them`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
say(`${failed ? 'FAILED' : 'OK'} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
