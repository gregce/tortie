/**
 * Phase 368 (build/p368/SPEC.md D14 to D17): what a click on an agent's link
 * opens, what its hover line says, and that the handler's only route is
 * `window.open`.
 *
 * Three layers, each from the outside:
 *
 *  1. The rule itself (`../link-rules.ts`), pure, over research 145 section
 *     5.5's cases: words that are another address open the words; a URL Claude
 *     cut opens the whole target; `Foo_(bar)` under words opens exactly; Codex's
 *     echo opens what a click there opened before; the look-alikes and the
 *     hostile targets, each either refused or shown honestly on the hover.
 *  2. The real click path: xterm's OWN OSC 8 provider (read from the terminal's
 *     core on purpose, as other tests here read xterm's internals) over rows
 *     shaped as Claude Code 2.1.325 and Codex 0.167.1 drew them in research
 *     145's runs (adv-links/runs/claude-c1 and codex-x1), with the pane's
 *     handler as the terminal's `linkHandler`, and a frozen stand-in for the
 *     page whose one member is `open`, so the handler can touch nothing else.
 *  3. The hover line, over a stand-in for xterm's element: its text, its class,
 *     its place, that it follows the pointer within one link, and that leaving
 *     takes it away.
 *
 * WHAT IS OFFERED AND WHAT IS NOT, stated once because the list in the spec
 * reads loosely. D14 refuses a target (with no address in its words) that does
 * not parse, is not http or https, carries a user or a password, or is over
 * 2,048 bytes of UTF-8. D16 answers the look-alikes with the hover, never with
 * a refusal: `аpple.com` opens as `https://xn--pple-43d.com/`, a right-to-left
 * override in a PATH is shown percent-encoded, and `https:example.com/x` is
 * `https://example.com/x`. A right-to-left override or a zero-width joiner in
 * the HOST does not parse, so it is refused.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Terminal } from '@xterm/xterm';
import type { IBufferRange, ILink, ILinkProvider } from '@xterm/xterm';
import {
  CUT_ROWS_MAX,
  LINK_MAX_BYTES,
  cutFirstRow,
  endsAtEdge,
  hoverText,
  isCutAddress,
  lastRowOf,
  openedAddress,
  pathMayDecide,
  pathUnder,
  targetOffered,
  utf8FitsIn,
  wordsAddress,
  type RowText
} from '../link-rules';
import { LINK_HOVER_CLASS, paneLinks } from '../pane-link-handler';
import type { WebAddress } from '../web-reading';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const ESC = '\u001b';
const ST = `${ESC}\\`;
/** One OSC 8 link, as tmux forwards it to a `-T hyperlinks` client. */
const osc = (target: string, words: string, id?: string): string =>
  `${ESC}]8;${id === undefined ? '' : `id=${id}`};${target}${ST}${words}${ESC}]8;;${ST}`;

const LONG =
  'https://example.net/aaaaaaaaaa/bbbbbbbbbb/cccccccccc/dddddddddd/eeeeeeeeee/ffffffffff/gggggggggg/hhhhhhhhhh/iiiiiiiiii/jjjjjjjjjj/kkkkkkkkkk/llllllllll/mmmmmmmmmm/nnnnnnnnnn/oooooooooo/end';
const FOO = 'https://en.wikipedia.org/wiki/Foo_(bar)';
const SAFE = 'https://example.org/looks-safe';
const ELSEWHERE = 'https://example.com/really-elsewhere';
/** The terminal's width the pure rules are asked at. */
const COLS = 120;

const range = (x1: number, y1: number, x2: number, y2 = y1): IBufferRange => ({
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 }
});
const reading = (address: string, r: IBufferRange): WebAddress => ({ address, range: r });
const rows =
  (...texts: string[]): RowText =>
  (y) =>
    texts[y - 1] ?? null;

// ---------------------------------------------------------------------------
// 1. The rule
// ---------------------------------------------------------------------------

describe('rule 4: a target alone (no address in the words)', () => {
  it('opens an http or https target with no user part and at most 2,048 bytes', () => {
    for (const target of [
      'https://example.com/',
      'http://example.com/insecure',
      FOO,
      'https://example.com/caf%C3%A9?x=1&y=2',
      'http://localhost:3000/',
      'http://127.0.0.1:8080/admin',
      'http://[::1]:3000/x',
      'HTTPS://EXAMPLE.COM/A'
    ]) {
      expect(targetOffered(target), target).toBe(true);
      expect(openedAddress({ target, range: range(1, 1, 5) }, [], rows(), COLS), target).toBe(target);
    }
  });

  it('refuses what is not http or https, has a user part, is too long or does not parse', () => {
    const refused: [string, string][] = [
      ['a user part', 'https://www.google.com@evil.example/'],
      ['a user and a password', 'https://user:pw@example.com/'],
      ['a user part on an IPv6 host', 'http://u:p@[::1]:8080/x'],
      ['a user with an empty password', 'https://user:@example.com/'],
      ['3,000 bytes', `https://example.com/${'x'.repeat(2980)}`],
      ['65,536 bytes', `https://example.com/${'x'.repeat(65516)}`],
      ['javascript:', 'javascript:alert(1)'],
      ['javascript: with leading spaces and mixed case', '   JaVaScRiPt:alert(1)'],
      ['data:', 'data:text/html,<b>x</b>'],
      ['file:', 'file:///private/var/tmp/x.txt'],
      ['vscode:', 'vscode://file/private/var/tmp/x.txt'],
      ['mailto:', 'mailto:someone@example.com'],
      ['a relative address', 'docs/README.md'],
      ['an empty target', ''],
      ['a right-to-left override in the host', 'https://exa‮mple.com/'],
      ['a zero-width joiner in the host', 'https://exa‍mple.com/']
    ];
    for (const [what, target] of refused) {
      expect(targetOffered(target), what).toBe(false);
      expect(openedAddress({ target, range: range(1, 1, 5) }, [], rows(), COLS), what).toBeNull();
    }
  });

  it('answers the look-alikes with an honest hover rather than a refusal (D16)', () => {
    const honest: [string, string, string][] = [
      ['a look-alike host', 'https://аpple.com/', 'https://xn--pple-43d.com/'],
      ['a right-to-left override in the path', 'https://example.com/‮gpj.exe', 'https://example.com/%E2%80%AEgpj.exe'],
      ['https: with no slashes', 'https:example.com/x', 'https://example.com/x'],
      ['a space in the path', 'https://example.com/a b', 'https://example.com/a%20b'],
      ['a zero-width space in the host', 'https://exa​mple.com/', 'https://example.com/'],
      ['a non-ASCII host', 'https://bücher.example/', 'https://xn--bcher-kva.example/']
    ];
    for (const [what, target, hover] of honest) {
      expect(targetOffered(target), what).toBe(true);
      expect(hoverText(target), what).toBe(hover);
      // The line is plain ASCII, so nothing in it can reorder what it says.
      expect(/^[\x21-\x7e]+$/.test(hover), what).toBe(true);
    }
  });

  it('counts the cap in bytes of UTF-8, exactly', () => {
    expect(LINK_MAX_BYTES).toBe(2048);
    const base = 'https://example.com/';
    expect(targetOffered(base + 'x'.repeat(2048 - base.length))).toBe(true);
    expect(targetOffered(base + 'x'.repeat(2049 - base.length))).toBe(false);
    // Three bytes each: 676 of them and 20 ASCII is 2,048.
    expect(utf8FitsIn(base + '€'.repeat(676), 2048)).toBe(true);
    expect(utf8FitsIn(`${base}x${'€'.repeat(676)}`, 2048)).toBe(false);
    // Four bytes each, as surrogate pairs.
    expect(utf8FitsIn('\u{1F680}'.repeat(512), 2048)).toBe(true);
    expect(utf8FitsIn('\u{1F680}'.repeat(512) + 'x', 2048)).toBe(false);
    // A lone surrogate weighs what its replacement does.
    expect(utf8FitsIn('\uD800'.repeat(682) + 'xx', 2048)).toBe(true);
    expect(utf8FitsIn('\uD800'.repeat(683), 2048)).toBe(false);
    for (const sample of ['', 'abc', 'café', '日本', '\u{1F680}x', '\uDC00a\uD800']) {
      expect(utf8FitsIn(sample, new TextEncoder().encode(sample).length), sample).toBe(true);
      expect(utf8FitsIn(sample, new TextEncoder().encode(sample).length - 1), sample).toBe(false);
    }
  });
});

describe('rules 1 to 3: the words\' own address', () => {
  it('opens the words when they are another address (item 11, question 4)', () => {
    const link = { target: ELSEWHERE, range: range(7, 3, 36) };
    expect(openedAddress(link, [reading(SAFE, range(7, 3, 36))], rows(), COLS)).toBe(SAFE);
  });

  it('opens the whole target for a URL the agent cut at the edge (item 12)', () => {
    const first = LONG.slice(0, 114);
    const link = { target: LONG, range: range(7, 5, 120) };
    const next = rows('', '', '', '', `      ${first}`, `      ${LONG.slice(114)}`);
    expect(isCutAddress(LONG, reading(first, range(7, 5, 120)), next, COLS)).toBe(true);
    expect(openedAddress(link, [reading(first, range(7, 5, 120))], next, COLS)).toBe(LONG);
  });

  it('reads an address that reaches its row\'s last cell as cut there, in either spelling the reading answers', () => {
    // The reading answers such an address as ending at column 0 of the NEXT
    // row; a range ending on the last column itself means the same.
    expect(endsAtEdge(range(98, 5, 0, 6), COLS)).toBe(true);
    expect(endsAtEdge(range(98, 5, COLS, 5), COLS)).toBe(true);
    expect(endsAtEdge(range(98, 5, COLS - 1, 5), COLS)).toBe(false);
    expect(lastRowOf(range(7, 5, 0, 6))).toBe(5);
    expect(lastRowOf(range(7, 5, 120, 5))).toBe(5);
    const w = reading('https://example.com/abc', range(98, 5, 0, 6));
    expect(isCutAddress('https://example.com/abcdefgh', w, rows('', '', '', '', 'x', '  defgh'), COLS)).toBe(true);
  });

  it('asks the next row for the WHOLE rest of the target, as its first word (the fix round)', () => {
    const w = reading('https://example.com/abc', range(98, 1, 0, 2));
    // The rest is "defghijklm": the next row's first word must be exactly it.
    expect(isCutAddress('https://example.com/abcdefghijklm', w, rows('', '  defghijklm'), COLS)).toBe(true);
    expect(isCutAddress('https://example.com/abcdefghijklm', w, rows('', '  defghijklm and more'), COLS)).toBe(true);
    // Its first eight characters are no longer enough: the attack lens's own shapes.
    expect(isCutAddress('https://example.com/abcdefghijklm', w, rows('', '  defghijk'), COLS)).toBe(false);
    expect(isCutAddress('https://example.com/abcdefghijklm', w, rows('', '  defghijkXYZ'), COLS)).toBe(false);
    // A word that goes on past the rest is a longer address on the screen, unless all it adds is closing punctuation.
    expect(isCutAddress('https://example.com/abcdef', w, rows('', 'defg'), COLS)).toBe(false);
    expect(isCutAddress('https://example.com/abcdef', w, rows('', 'def).'), COLS)).toBe(true);
    expect(isCutAddress('https://example.com/abcdef', w, rows('', 'def?x=1'), COLS)).toBe(false);
    // Leading spaces go, and only spaces.
    expect(isCutAddress('https://example.com/abcdef', w, rows('', '\tdef'), COLS)).toBe(false);
    // No next row, a blank one, a target no longer than W, or one W does not begin.
    expect(isCutAddress('https://example.com/abcdef', w, rows(''), COLS)).toBe(false);
    expect(isCutAddress('https://example.com/abcdef', w, rows('', '   '), COLS)).toBe(false);
    expect(isCutAddress('https://example.com/abc', w, rows('', 'abc'), COLS)).toBe(false);
    expect(isCutAddress('https://example.org/abcdef', w, rows('', 'def'), COLS)).toBe(false);
  });

  it('is never a cut when the words stop short of their row\'s last cell, wrapped or not', () => {
    // The address the reading found ends before the edge, so nothing it draws
    // goes on to the next row whatever that row says.
    expect(isCutAddress('https://example.com/abcdef', reading('https://example.com/abc', range(1, 1, 23)), rows('', 'def'), COLS)).toBe(false);
    const wrapped = reading('https://example.com/abc', range(70, 1, 13, 2));
    expect(isCutAddress('https://example.com/abcdefgh', wrapped, rows('x', 'y', 'defgh'), COLS)).toBe(false);
    // Wrapped onto row 2 and reaching ITS last cell: row 3 goes on with it.
    const wrappedToEdge = reading('https://example.com/abc', range(70, 1, 0, 3));
    expect(isCutAddress('https://example.com/abcdefgh', wrappedToEdge, rows('x', 'y', '   defgh'), COLS)).toBe(true);
    // A width that is not a terminal's says nothing about an edge.
    expect(isCutAddress('https://example.com/abcdef', reading('https://example.com/abc', range(98, 1, 0, 2)), rows('', 'def'), 0)).toBe(false);
  });

  it('follows a URL cut over several rows, each middle piece filling its row', () => {
    const cols = 20;
    const target = 'https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaa/end';
    // Row 1 ends with the first 20 characters at its last cell; row 2 is 18
    // more after two spaces of indent, filling it; row 3 holds the last piece.
    const w = reading(target.slice(0, 20), range(1, 1, 0, 2));
    const piece2 = target.slice(20, 38);
    const piece3 = target.slice(38);
    expect(isCutAddress(target, w, rows(target.slice(0, 20), `  ${piece2}`, `  ${piece3}`), cols)).toBe(true);
    // A middle piece that does not reach its row's last cell is not cut again there.
    expect(isCutAddress(target, w, rows(target.slice(0, 20), `  ${piece2.slice(0, 10)}`, `  ${piece2.slice(10)}${piece3}`), cols)).toBe(false);
    // A middle row holding more than the piece is not a continuation.
    expect(isCutAddress(target, w, rows(target.slice(0, 20), ` ${piece2.slice(0, 13)} x`, `  ${piece2.slice(13)}${piece3}`), cols)).toBe(false);
    expect(CUT_ROWS_MAX).toBe(64);
  });

  it('never opens a host the screen does not show: the attack lens\'s cut-looking links open the words (the fix round)', () => {
    // Drawn `https://good.ex` at the row's end and `ample.com/login` on the
    // next row, which reads https://good.example.com/login; the target goes
    // somewhere else after eight matching characters.
    const L19 = 'https://good.example.co.evil.io/x';
    const w19 = reading('https://good.ex', range(106, 1, 0, 2));
    const link19 = { target: L19, range: range(106, 1, 120) };
    expect(openedAddress(link19, [w19], rows(`${' '.repeat(105)}https://good.ex`, 'ample.com/login'), COLS)).toBe('https://good.ex');
    // A drawn …/xyVISIBLE whose target is …/xyHIDDEN.
    const L16 = 'https://good.example/a/b/c/d/xyHIDDEN';
    const w16 = reading('https://good.example/a/', range(99, 1, 0, 2));
    expect(openedAddress({ target: L16, range: range(99, 1, 120) }, [w16], rows('', 'b/c/d/xyVISIBLE'), COLS)).toBe('https://good.example/a/');
    // A host continued past what the target says.
    const L15 = 'https://good.example.evil.example/x';
    const w15 = reading('https://good.example', range(101, 1, 0, 2));
    expect(openedAddress({ target: L15, range: range(101, 1, 120) }, [w15], rows('', '.evil.example/x'), COLS)).toBe(L15);
    expect(openedAddress({ target: L15, range: range(101, 1, 120) }, [w15], rows('', '.evil.example/x/more'), COLS)).toBe('https://good.example');
    // The honest cut opens the whole target, the drawn text read across the row end.
    const L14 = 'https://example.com/cut/honest/rest-of-path/end';
    const w14 = reading('https://example.com/cut/honest/', range(90, 1, 0, 2));
    expect(openedAddress({ target: L14, range: range(90, 1, 120) }, [w14], rows('', 'rest-of-path/end'), COLS)).toBe(L14);
  });

  it('keeps the words\' address when a cut target would be refused, so no click opens less than before', () => {
    const first = 'https://example.com';
    const w = reading(first, range(10, 1, 28));
    const after = rows(`         ${first}`, '@evil.example/steal');
    // A user part hidden across the edge (the row is 28 cells wide): the target is refused, the words open.
    expect(isCutAddress('https://example.com@evil.example/steal', w, after, 28)).toBe(true);
    expect(
      openedAddress({ target: 'https://example.com@evil.example/steal', range: range(10, 1, 28) }, [w], after, 28)
    ).toBe(first);
    // A cut target over the byte cap: the words open, as before.
    const huge = `https://example.com/${'y'.repeat(3000)}`;
    const w2 = reading('https://example.com/yyyy', range(1, 1, 24));
    expect(openedAddress({ target: huge, range: range(1, 1, 24) }, [w2], rows('', 'yyyyyyyyyy'), 24)).toBe(
      'https://example.com/yyyy'
    );
  });

  it('keeps the words\' address when the next row does not go on with the target (Foo_(bar) drawn by Codex)', () => {
    // Codex draws the address too; the reading stops at "(", as it always has.
    const w = reading('https://en.wikipedia.org/wiki/Foo_', range(18, 4, 51));
    const link = { target: FOO, range: range(18, 4, 56) };
    expect(openedAddress(link, [w], rows('', '', '', '', '  9. cafe'), COLS)).toBe('https://en.wikipedia.org/wiki/Foo_');
  });

  it('opens Foo_(bar) exactly under words that hold no address (Claude, and Codex\'s words)', () => {
    expect(openedAddress({ target: FOO, range: range(6, 4, 14) }, [], rows(), COLS)).toBe(FOO);
    // An address elsewhere on the row is not on the link's cells.
    const elsewhere = reading('https://en.wikipedia.org/wiki/Foo_', range(18, 4, 51));
    expect(openedAddress({ target: FOO, range: range(6, 4, 14) }, [elsewhere], rows(), COLS)).toBe(FOO);
  });

  it('opens what a click there opened before on Codex\'s echo, which holds two addresses under one target', () => {
    const target = `${SAFE}](${ELSEWHERE})`;
    const w1 = reading(SAFE, range(4, 2, 33));
    const w2 = reading(ELSEWHERE, range(36, 2, 71));
    const link = { range: range(4, 2, 72), target };
    expect(openedAddress({ ...link, at: { x: 10, y: 2 } }, [w1, w2], rows(), COLS)).toBe(SAFE);
    expect(openedAddress({ ...link, at: { x: 50, y: 2 } }, [w1, w2], rows(), COLS)).toBe(ELSEWHERE);
    // Between the two, or with no pointer: the first, rule 1 as the spec writes it.
    expect(openedAddress({ ...link, at: { x: 34, y: 2 } }, [w1, w2], rows(), COLS)).toBe(SAFE);
    expect(openedAddress(link, [w1, w2], rows(), COLS)).toBe(SAFE);
    expect(wordsAddress({ ...link, at: null }, [w1, w2])).toBe(w1);
  });
});

describe('rule 0: a path the pane offers on the clicked cell (the fix round)', () => {
  const path = (x1: number, x2: number, y = 3): { range: IBufferRange; text: string } => ({
    range: range(x1, y, x2),
    text: 'notes/guide.md'
  });

  it('asks the path provider only when no address the reading finds holds the pointer\'s cell', () => {
    const link = { target: 'https://github.com/acme/repo/blob/main/notes/guide.md', range: range(7, 3, 20), at: { x: 10, y: 3 } };
    expect(pathMayDecide(link, [])).toBe(true);
    // An address under the pointer outranked the path provider before links reached the terminal.
    expect(pathMayDecide(link, [reading('https://example.com/x', range(7, 3, 20))])).toBe(false);
    // An address elsewhere on the link does not hold the pointer's cell.
    expect(pathMayDecide({ ...link, range: range(7, 3, 60) }, [reading('https://example.com/x', range(30, 3, 50))])).toBe(true);
    // With no pointer cell, only a link with no address on its cells asks.
    expect(pathMayDecide({ ...link, at: null }, [])).toBe(true);
    expect(pathMayDecide({ ...link, at: null }, [reading('https://example.com/x', range(7, 3, 20))])).toBe(false);
  });

  it('opens the path holding the pointer\'s cell, and none that does not', () => {
    const link = { target: 'https://example.com/elsewhere', range: range(7, 3, 40), at: { x: 10, y: 3 } };
    const under = path(7, 20);
    expect(pathUnder(link, [path(30, 40), under])).toBe(under);
    expect(pathUnder({ ...link, at: { x: 25, y: 3 } }, [path(30, 40), under])).toBeNull();
    // With no pointer cell, the first on the link's cells.
    expect(pathUnder({ ...link, at: null }, [path(50, 60), under])).toBe(under);
    expect(pathUnder(link, [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2 and 3. The real click path, and the hover line
// ---------------------------------------------------------------------------

/** A stand-in for the one element xterm hands an embedder, and its screen. */
interface FakeNode {
  className: string;
  textContent: string | null;
  parentElement: FakeHost | null;
  readonly attrs: Map<string, string>;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getAttribute(name: string): string | null;
  remove(): void;
}
interface FakeHost {
  readonly children: FakeNode[];
  readonly moves: Set<(event: { clientX: number; clientY: number }) => void>;
  readonly ownerDocument: { createElement(tag: string): FakeNode };
  appendChild(node: FakeNode): FakeNode;
  querySelector(selector: string): { getBoundingClientRect(): DOMRect } | null;
  addEventListener(type: string, fn: (event: { clientX: number; clientY: number }) => void): void;
  removeEventListener(type: string, fn: (event: { clientX: number; clientY: number }) => void): void;
}

/** Cells are 10 by 20 pixels on the stand-in screen. */
const CELL_W = 10;
const CELL_H = 20;
/** The pointer over 1-based viewport cell (x, y). */
const pointer = (x: number, y: number): MouseEvent =>
  ({ clientX: (x - 0.5) * CELL_W, clientY: (y - 0.5) * CELL_H }) as MouseEvent;

function fakeHost(cols: number, rowCount: number): FakeHost {
  const host: FakeHost = {
    children: [],
    moves: new Set(),
    ownerDocument: {
      createElement(): FakeNode {
        const node: FakeNode = {
          className: '',
          textContent: null,
          parentElement: null,
          attrs: new Map(),
          setAttribute(name, value) {
            node.attrs.set(name, value);
          },
          removeAttribute(name) {
            node.attrs.delete(name);
          },
          getAttribute(name) {
            return node.attrs.get(name) ?? null;
          },
          remove() {
            const at = host.children.indexOf(node);
            if (at >= 0) host.children.splice(at, 1);
            node.parentElement = null;
          }
        };
        return node;
      }
    },
    appendChild(node) {
      node.parentElement = host;
      host.children.push(node);
      return node;
    },
    querySelector(selector) {
      if (selector !== '.xterm-screen') return null;
      return {
        getBoundingClientRect: () =>
          ({ left: 0, top: 0, width: cols * CELL_W, height: rowCount * CELL_H }) as DOMRect
      };
    },
    addEventListener(type, fn) {
      if (type === 'mousemove') host.moves.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === 'mousemove') host.moves.delete(fn);
    }
  };
  return host;
}

interface Pane {
  readonly term: Terminal;
  readonly host: FakeHost;
  readonly links: ReturnType<typeof paneLinks>;
  /** xterm's own OSC 8 links on buffer row `y` (1-based). */
  oscLinks(y: number): ILink[];
}

async function pane(text: string, cols: number, rowCount = 24): Promise<Pane> {
  const links = paneLinks();
  const term = new Terminal({ cols, rows: rowCount, allowProposedApi: true, linkHandler: links.handler });
  const host = fakeHost(cols, rowCount);
  // The handler reads the terminal's buffer and its element; xterm made in
  // node has no element, so the element alone is the stand-in.
  const bound = new Proxy(term, {
    get(target, prop) {
      if (prop === 'element') return host;
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    }
  });
  links.bind(bound);
  // A tmux client draws in the alternate buffer.
  await new Promise<void>((done) => term.write(`${ESC}[?1049h${text}`, done));
  const core = (term as unknown as { _core: { _linkProviderService: { linkProviders: ILinkProvider[] } } })
    ._core;
  // xterm registers its OSC 8 provider first, in the terminal's constructor.
  const provider = core._linkProviderService.linkProviders[0];
  if (provider === undefined) throw new Error('xterm registered no OSC 8 provider');
  return {
    term,
    host,
    links,
    oscLinks(y) {
      let found: ILink[] | undefined;
      provider.provideLinks(y, (answer) => {
        found = answer;
      });
      return found ?? [];
    }
  };
}

const page = { open: vi.fn() };

beforeEach(() => {
  page.open.mockReset();
  // The page's one member is `open`, frozen: a handler that wrote anything
  // else on it would throw here rather than pass.
  vi.stubGlobal('window', Object.freeze({ open: page.open }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Click link `index` of row `y` at its first cell, or at `at`. */
function click(p: Pane, y: number, index = 0, at?: { x: number; y: number }): void {
  const link = p.oscLinks(y)[index];
  if (link === undefined) throw new Error(`no OSC link ${index} on row ${y}`);
  link.activate(pointer(at?.x ?? link.range.start.x, at?.y ?? y), link.text);
}

function opened(): unknown[][] {
  return page.open.mock.calls;
}

// Claude Code 2.1.325's rows, as research 145's adv-links run drew them.
const CLAUDE = [
  `  1. ${osc('https://example.com/autolink', 'https://example.com/autolink', '1jsezbe')} — A standard autolink.`,
  `  4. ${osc(FOO, 'wiki page', '14975q6')} — A link whose URL contains balanced parentheses.`,
  `  11. ${osc(ELSEWHERE, SAFE, '1b3k0jx')} — A link whose visible text is a URL that differs.`,
  `      ${osc(LONG, LONG.slice(0, 114), '1q408j5')}`,
  `      ${osc(LONG, LONG.slice(114), '1q408j5')}`
].join('\r\n');

// Codex 0.167.1's rows: its words, then the address in parentheses, both linked.
const CODEX = [
  `  4. ${osc(FOO, 'wiki page')} (${osc(FOO, FOO)}) — This tests parentheses in a destination.`,
  `  11. ${osc(ELSEWHERE, SAFE)} (${osc(ELSEWHERE, ELSEWHERE)}) — This tests link text.`,
  `  [${osc(`${SAFE}](${ELSEWHERE})`, `${SAFE}](${ELSEWHERE})`)} ; 12) a bare URL on its own line`
].join('\r\n');

describe('a click through xterm\'s own OSC 8 provider, Claude Code\'s rows', () => {
  it('registers a link for every linked item', async () => {
    const p = await pane(CLAUDE, 120);
    try {
      expect([1, 2, 3, 4, 5].map((y) => p.oscLinks(y).length)).toEqual([1, 1, 1, 1, 1]);
      expect(p.oscLinks(2)[0]?.text).toBe(FOO);
    } finally {
      p.term.dispose();
    }
  });

  it('opens each with exactly the one route, and the address D14 names', async () => {
    const p = await pane(CLAUDE, 120);
    try {
      click(p, 1); // the autolink: words and target agree
      click(p, 2); // "wiki page": no address in the words, the target exactly
      click(p, 3); // words that are another address: the words
      click(p, 4); // the cut URL's first row: the whole target
      click(p, 5); // its second row: no address in the words, the whole target
      expect(opened()).toEqual([
        ['https://example.com/autolink', '_blank', 'noopener,noreferrer'],
        [FOO, '_blank', 'noopener,noreferrer'],
        [SAFE, '_blank', 'noopener,noreferrer'],
        [LONG, '_blank', 'noopener,noreferrer'],
        [LONG, '_blank', 'noopener,noreferrer']
      ]);
    } finally {
      p.term.dispose();
    }
  });
});

describe('a click through xterm\'s own OSC 8 provider, Codex\'s rows', () => {
  it('opens its words\' target, its drawn address as before, and its echo by the pointer', async () => {
    const p = await pane(CODEX, 120);
    try {
      expect(p.oscLinks(1)).toHaveLength(2);
      click(p, 1, 0); // "wiki page": the target exactly
      click(p, 1, 1); // the drawn address: what the reading opened before
      click(p, 2, 0); // words that are another address: the words
      click(p, 2, 1); // the drawn target: itself
      const echo = p.oscLinks(3)[0];
      if (echo === undefined) throw new Error('no echo link');
      click(p, 3, 0, { x: echo.range.start.x + 5, y: 3 }); // on the first address
      click(p, 3, 0, { x: echo.range.start.x + 40, y: 3 }); // on the second
      expect(opened().map((call) => call[0])).toEqual([
        FOO,
        'https://en.wikipedia.org/wiki/Foo_',
        SAFE,
        ELSEWHERE,
        SAFE,
        ELSEWHERE
      ]);
    } finally {
      p.term.dispose();
    }
  });
});

describe('a click on words that are a path the pane offers opens the path, as before (the fix round)', () => {
  const GITHUB = 'https://github.com/acme/repo/blob/main/notes/guide.md';
  /** A path link over the given cells of row `y`, recording its own activation. */
  const pathLink = (r: IBufferRange): ILink & { opened: number } => {
    const l = {
      range: r,
      text: 'notes/guide.md',
      opened: 0,
      activate: () => {
        l.opened += 1;
      }
    };
    return l;
  };

  it('opens the file through the path provider, never the web target, whether it answers at once or later', async () => {
    const text = [`  1. ${osc(GITHUB, 'notes/guide.md')} is the guide`, `  2. ${osc(GITHUB, 'notes/guide.md')} again`].join('\r\n');
    const p = await pane(text, 120, 30);
    try {
      const first = p.oscLinks(1)[0];
      const second = p.oscLinks(2)[0];
      if (first === undefined || second === undefined) throw new Error('two links expected');
      const now = pathLink(first.range);
      const later = pathLink(second.range);
      const asked: number[] = [];
      p.links.paths((y, then) => {
        asked.push(y);
        if (y === 1) then([now]);
        else setTimeout(() => then([later]), 5);
      });
      click(p, 1);
      expect(now.opened).toBe(1);
      click(p, 2);
      expect(later.opened).toBe(0);
      await new Promise((done) => setTimeout(done, 20));
      expect(later.opened).toBe(1);
      expect(opened()).toEqual([]);
      expect(asked).toEqual([1, 2]);
      // The hover draws no line for a click that opens a path, and takes the
      // old line away while it waits for a later answer.
      first.hover?.(pointer(first.range.start.x, 1), first.text);
      expect(p.host.children).toEqual([]);
      second.hover?.(pointer(second.range.start.x, 2), second.text);
      expect(p.host.children).toEqual([]);
      await new Promise((done) => setTimeout(done, 20));
      expect(p.host.children).toEqual([]);
    } finally {
      p.term.dispose();
    }
  });

  it('opens the target from a cell the path does not hold, and when the pane offers no path there', async () => {
    const p = await pane(`  ${osc(GITHUB, 'see notes/guide.md here')}`, 120, 30);
    try {
      const link = p.oscLinks(1)[0];
      if (link === undefined) throw new Error('no link');
      // The path is the words' middle: cells 7 to 20 of "  see notes/guide.md here".
      const middle = pathLink(range(7, 1, 20));
      p.links.paths((_y, then) => then([middle]));
      click(p, 1, 0, { x: 4, y: 1 }); // on "see"
      expect(middle.opened).toBe(0);
      click(p, 1, 0, { x: 10, y: 1 }); // on the path
      expect(middle.opened).toBe(1);
      p.links.paths((_y, then) => then([]));
      click(p, 1, 0, { x: 10, y: 1 });
      expect(opened().map((call) => call[0])).toEqual([GITHUB, GITHUB]);
    } finally {
      p.term.dispose();
    }
  });

  it('never asks the path provider when an address the reading finds holds the pointer\'s cell', async () => {
    const p = await pane(`  ${osc(ELSEWHERE, SAFE)}`, 120, 30);
    try {
      const link = p.oscLinks(1)[0];
      if (link === undefined) throw new Error('no link');
      const shadow = pathLink(link.range);
      const asked: number[] = [];
      p.links.paths((y, then) => {
        asked.push(y);
        then([shadow]);
      });
      click(p, 1);
      expect(asked).toEqual([]);
      expect(shadow.opened).toBe(0);
      expect(opened().map((call) => call[0])).toEqual([SAFE]);
    } finally {
      p.term.dispose();
    }
  });
});

describe('a cut-looking link whose target is not what the rows draw (the fix round)', () => {
  it('opens the words from either row, never the target\'s other host', async () => {
    // 120 columns: the first row ends with `https://good.ex` at its last cell.
    const target = 'https://good.example.co.evil.io/x';
    const text = [`${' '.repeat(105)}${osc(target, 'https://good.ex')}`, `${osc(target, 'ample.com/login')}`].join('\r\n');
    const p = await pane(text, 120, 30);
    try {
      click(p, 1);
      click(p, 2);
      // Row 1: the words' own address, as before. Row 2 is a later row of a
      // cut-looking address that is not a cut: nothing, as before.
      expect(opened().map((call) => call[0])).toEqual(['https://good.ex']);
      const second = p.oscLinks(2)[0];
      second?.hover?.(pointer(second.range.start.x, 2), second.text);
      expect(p.host.children).toEqual([]);
    } finally {
      p.term.dispose();
    }
  });

  it('opens the whole target from every row of an honest cut over three rows', async () => {
    const target = `https://example.com/${'a'.repeat(40)}/end`;
    // 30 columns: 30 characters on row 1, 28 after two spaces on row 2, the rest on row 3.
    const text = [osc(target, target.slice(0, 30)), `  ${osc(target, target.slice(30, 58))}`, `  ${osc(target, target.slice(58))}`].join('\r\n');
    const p = await pane(text, 30, 10);
    try {
      click(p, 1);
      click(p, 2);
      click(p, 3);
      expect(opened().map((call) => call[0])).toEqual([target, target, target]);
    } finally {
      p.term.dispose();
    }
  });
});

describe('a cut\'s later rows, pure (the fix round)', () => {
  const T = 'https://example.com/cut/honest/rest-of-path/end';
  const first = reading('https://example.com/cut/honest/', range(90, 1, 0, 2));
  const readingOf = (map: Record<number, WebAddress[]>) => (y: number) => map[y] ?? [];

  it('finds the first row above a continuation, and refuses anything else above it', () => {
    const link = { target: T, range: range(1, 2, 16) };
    expect(cutFirstRow(link, rows('', 'rest-of-path/end'), readingOf({ 1: [first] }), COLS)).toBe(first);
    // The row above ends before its last cell: not a cut's first row.
    const short = reading('https://example.com/cut/honest/', range(10, 1, 40));
    expect(cutFirstRow(link, rows('', 'rest-of-path/end'), readingOf({ 1: [short] }), COLS)).toBeNull();
    // An address the target does not begin with.
    const other = reading('https://example.org/x', range(100, 1, 0, 2));
    expect(cutFirstRow(link, rows('', 'rest-of-path/end'), readingOf({ 1: [other] }), COLS)).toBeNull();
  });

  it('opens T from a later row only when the rows spell it, and nothing otherwise', () => {
    const link = { target: T, range: range(1, 2, 16) };
    expect(openedAddress(link, [], rows('', 'rest-of-path/end'), COLS, readingOf({ 1: [first] }))).toBe(T);
    expect(openedAddress(link, [], rows('', 'rest-of-path/elsewhere'), COLS, readingOf({ 1: [first] }))).toBeNull();
    // A link whose rows above are no cut is any other link: rule 4.
    expect(openedAddress(link, [], rows('just words', 'rest-of-path/end'), COLS, readingOf({}))).toBe(T);
  });
});

describe('hostile targets under words that hold no address', () => {
  const hostile: [string, string][] = [
    ['a user part', 'https://www.google.com@evil.example/'],
    ['3,000 bytes', `https://example.com/${'x'.repeat(2980)}`],
    ['65,536 bytes', `https://example.com/${'x'.repeat(65516)}`],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,x'],
    ['file:', 'file:///etc/hosts'],
    ['vscode:', 'vscode://file/x'],
    ['a right-to-left override in the host', 'https://exa‮mple.com/'],
    ['a relative address', 'docs/README.md']
  ];

  it('opens none of them, whether or not xterm offers the link at all', async () => {
    const text = hostile.map(([what, target]) => `${osc(target, `click ${what.length}`)}`).join('\r\n');
    const p = await pane(text, 120, 30);
    try {
      let offered = 0;
      hostile.forEach(([what], i) => {
        const links = p.oscLinks(i + 1);
        offered += links.length;
        for (const link of links) {
          link.activate(pointer(link.range.start.x, i + 1), link.text);
          link.hover?.(pointer(link.range.start.x, i + 1), link.text);
          expect(p.host.children, what).toEqual([]);
        }
      });
      // xterm itself drops the schemes it does not offer and what does not
      // parse; the user part and the two long ones reach the handler.
      expect(offered).toBe(3);
      // Asked directly, the handler refuses every one too.
      hostile.forEach(([, target], i) => {
        p.links.handler.activate(pointer(1, i + 1), target, range(1, i + 1, 5));
      });
      expect(opened()).toEqual([]);
    } finally {
      p.term.dispose();
    }
  });
});

describe('the hover line', () => {
  it('says the address a click opens, as text, in xterm\'s element, and leaving takes it away', async () => {
    const p = await pane(CLAUDE, 120, 30);
    try {
      const words = p.oscLinks(3)[0];
      if (words === undefined) throw new Error('no link');
      words.hover?.(pointer(words.range.start.x, 3), words.text);
      expect(p.host.children).toHaveLength(1);
      const line = p.host.children[0];
      expect(line?.className).toBe(LINK_HOVER_CLASS);
      expect(LINK_HOVER_CLASS.split(' ')).toContain('xterm-hover');
      expect(line?.textContent).toBe(hoverText(SAFE));
      expect(p.host.moves.size).toBe(1);
      words.leave?.(pointer(words.range.start.x, 3), words.text);
      expect(p.host.children).toEqual([]);
      expect(p.host.moves.size).toBe(0);
    } finally {
      p.term.dispose();
    }
  });

  it('is one line at a time, and draws no line for a target a click would not open', async () => {
    const text = `${osc(FOO, 'wiki page')} and ${osc('https://u:p@evil.example/', 'login')}`;
    const p = await pane(text, 120, 30);
    try {
      const [wiki, login] = p.oscLinks(1);
      if (wiki === undefined || login === undefined) throw new Error('two links expected');
      wiki.hover?.(pointer(wiki.range.start.x, 1), wiki.text);
      expect(p.host.children.map((n) => n.textContent)).toEqual([FOO]);
      wiki.leave?.(pointer(wiki.range.start.x, 1), wiki.text);
      login.hover?.(pointer(login.range.start.x, 1), login.text);
      expect(p.host.children).toEqual([]);
    } finally {
      p.term.dispose();
    }
  });

  it('shows a look-alike host in ASCII', async () => {
    const p = await pane(osc('https://аpple.com/sign-in', 'Apple'), 80, 30);
    try {
      const link = p.oscLinks(1)[0];
      link?.hover?.(pointer(link.range.start.x, 1), link.text);
      expect(p.host.children[0]?.textContent).toBe('https://xn--pple-43d.com/sign-in');
    } finally {
      p.term.dispose();
    }
  });

  it('follows the pointer within one link whose words hold two addresses', async () => {
    const p = await pane(CODEX, 120, 30);
    try {
      const echo = p.oscLinks(3)[0];
      if (echo === undefined) throw new Error('no echo link');
      echo.hover?.(pointer(echo.range.start.x + 5, 3), echo.text);
      expect(p.host.children[0]?.textContent).toBe(hoverText(SAFE));
      for (const move of p.host.moves) move(pointer(echo.range.start.x + 40, 3));
      expect(p.host.children[0]?.textContent).toBe(hoverText(ELSEWHERE));
      expect(p.host.children).toHaveLength(1);
    } finally {
      p.term.dispose();
    }
  });

  it('moves to the top left when the link sits on the rows it would cover', async () => {
    const rowCount = 10;
    const text = `${osc(FOO, 'top link')}${'\r\n'.repeat(rowCount - 1)}${osc(FOO, 'bottom link')}`;
    const p = await pane(text, 80, rowCount);
    try {
      const top = p.oscLinks(1)[0];
      const bottom = p.oscLinks(rowCount)[0];
      if (top === undefined || bottom === undefined) throw new Error('two links expected');
      top.hover?.(pointer(top.range.start.x, 1), top.text);
      expect(p.host.children[0]?.getAttribute('data-at')).toBeNull();
      top.leave?.(pointer(top.range.start.x, 1), top.text);
      bottom.hover?.(pointer(bottom.range.start.x, rowCount), bottom.text);
      expect(p.host.children[0]?.getAttribute('data-at')).toBe('top');
    } finally {
      p.term.dispose();
    }
  });
});

describe('the handler itself', () => {
  it('opens nothing and draws nothing before it is bound to a terminal', () => {
    const { handler } = paneLinks();
    handler.activate(pointer(1, 1), FOO, range(1, 1, 9));
    handler.hover?.(pointer(1, 1), FOO, range(1, 1, 9));
    expect(opened()).toEqual([]);
  });

  it('never admits another scheme: xterm\'s option for that is not on the handler', () => {
    const { handler } = paneLinks();
    expect('allowNonHttpProtocols' in handler).toBe(false);
    expect(Object.keys(handler).sort()).toEqual(['activate', 'hover', 'leave']);
  });
});
