/**
 * Phase 368 (build/p368/SPEC.md D15): the web links reading Tortie copied is
 * the reading the web links addon makes, over the same buffers.
 *
 * `../web-reading.ts` is an attributed copy of @xterm/addon-web-links 0.12.0's
 * `strictUrlRegex` and `LinkComputer`, because the link handler must ask the
 * same question a click on those cells answered before links reached the
 * terminal, and the addon exports only its class. This file holds the copy to
 * the ORIGINAL: the addon itself is loaded into each terminal (here, in the
 * test, and nowhere else in this phase), its provider is caught as it
 * registers, and for every row of every buffer the two must answer the same
 * addresses on the same cells, in the same order.
 *
 * The buffers are hand-written shapes the agents print (a URL Claude cut at the
 * edge and carried to an indented row, a URL the terminal wrapped, Codex's
 * `words (address)`, its echo of `[a](b)`, `Foo_(bar)`, wide characters before
 * and across the edge, a user part, an IPv6 host) and a seeded fuzz over random
 * rows of words, addresses, wide characters and punctuation at random widths,
 * in the normal and the alternate buffer (a tmux client lives in the
 * alternate one).
 */

import { describe, expect, it } from 'vitest';
import { Terminal } from '@xterm/xterm';
import type { IBufferRange, ILink, ILinkProvider } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { webAddressesOn } from '../web-reading';

interface Found {
  readonly address: string;
  readonly range: IBufferRange;
}

/** A terminal holding `text`, with the addon loaded and its provider caught. */
async function terminalWith(
  text: string,
  cols: number,
  rows = 24,
  alternate = false
): Promise<{ term: Terminal; addon: ILinkProvider }> {
  const term = new Terminal({ cols, rows, allowProposedApi: true, scrollback: 500 });
  const caught: { provider: ILinkProvider | null } = { provider: null };
  const register = term.registerLinkProvider.bind(term);
  term.registerLinkProvider = (provider: ILinkProvider) => {
    caught.provider = provider;
    return register(provider);
  };
  term.loadAddon(new WebLinksAddon(() => undefined));
  const addon = caught.provider;
  if (addon === null) throw new Error('the addon registered no provider');
  await new Promise<void>((done) => {
    term.write(`${alternate ? '\u001b[?1049h' : ''}${text}`, done);
  });
  return { term, addon };
}

/** What the addon's own provider answers for row `y`. */
function addonFinds(addon: ILinkProvider, y: number): Found[] {
  let links: ILink[] | undefined;
  addon.provideLinks(y, (answer) => {
    links = answer;
  });
  return (links ?? []).map((link) => ({ address: link.text, range: link.range }));
}

/** Compare every row of the active buffer; answer how many addresses agreed. */
function compareEveryRow(term: Terminal, addon: ILinkProvider, label: string): number {
  let agreed = 0;
  const length = term.buffer.active.length;
  for (let y = 1; y <= length; y += 1) {
    const ours = webAddressesOn(term, y).map((one) => ({ address: one.address, range: one.range }));
    expect(ours, `${label}, row ${y}`).toEqual(addonFinds(addon, y));
    agreed += ours.length;
  }
  return agreed;
}

const LONG =
  'https://example.net/aaaaaaaaaa/bbbbbbbbbb/cccccccccc/dddddddddd/eeeeeeeeee/ffffffffff/gggggggggg/hhhhhhhhhh/iiiiiiiiii/jjjjjjjjjj/kkkkkkkkkk/llllllllll/mmmmmmmmmm/nnnnnnnnnn/oooooooooo/end';

describe('the copy finds what the addon finds, on the shapes the agents print', () => {
  const shapes: { what: string; text: string; cols: number }[] = [
    {
      what: "Claude's URL cut at the edge and carried to an indented row",
      text: `      ${LONG.slice(0, 114)}\r\n      ${LONG.slice(114)}\r\n`,
      cols: 120
    },
    { what: 'a URL the terminal wrapped', text: `  12. ${LONG}\r\n\r\n`, cols: 60 },
    {
      what: "Codex's words and address",
      text:
        '  1. https://example.com/autolink (https://example.com/autolink) - autolink\r\n' +
        '  4. wiki page (https://en.wikipedia.org/wiki/Foo_(bar)) - parentheses\r\n' +
        '  9. cafe (https://example.com/caf%C3%A9?x=1&y=2) - encoding\r\n',
      cols: 100
    },
    {
      what: "Codex's echo of a person's own [a](b)",
      text: '  [https://example.org/looks-safe](https://example.com/really-elsewhere) ; 12) a bare URL\r\n',
      cols: 120
    },
    {
      what: 'wide characters before an address and across the edge',
      text: `日本語の説明 https://example.com/日本 ✅ done\r\n${'漢'.repeat(19)}https://x.example/wrap/after/a/wide/edge\r\n`,
      cols: 40
    },
    {
      // The addon's one correction: a wide character that does not fit in the
      // last column is pushed to the next row and leaves that cell empty, and
      // the reading must still map the address back onto the right cells.
      what: 'a wide character pushed past the edge inside an address',
      text: 'abcd https://example.com/aaaa日本語/xyz and more\r\nnext https://b.example/c\r\n',
      cols: 30
    },
    {
      what: 'punctuation, quotes, brackets and an address that is not one',
      text:
        'see https://a.example/b. and "https://c.example/d", <https://e.example/f>, ' +
        '(https://g.example/h) and https:// alone and http://[::1]:3000/x and ' +
        'HTTPS://UP.EXAMPLE/PATH and https://user:pw@h.example/p and mailto:a@b.c\r\n',
      cols: 80
    }
  ];

  for (const shape of shapes) {
    for (const alternate of [false, true]) {
      it(`${shape.what}${alternate ? ', in the alternate buffer' : ''}`, async () => {
        const { term, addon } = await terminalWith(shape.text, shape.cols, 24, alternate);
        try {
          expect(compareEveryRow(term, addon, shape.what)).toBeGreaterThan(0);
        } finally {
          term.dispose();
        }
      });
    }
  }

  it('reads the cut URL as the first row\'s part, which is what a click there opened', async () => {
    const { term } = await terminalWith(
      `      ${LONG.slice(0, 114)}\r\n      ${LONG.slice(114)}\r\n`,
      120
    );
    try {
      expect(webAddressesOn(term, 1).map((one) => one.address)).toEqual([LONG.slice(0, 114)]);
      expect(webAddressesOn(term, 2)).toEqual([]);
    } finally {
      term.dispose();
    }
  });

  it('reads Foo_(bar) as the address up to its parenthesis, as the addon always has', async () => {
    const { term } = await terminalWith(
      '  4. wiki page (https://en.wikipedia.org/wiki/Foo_(bar)) - parentheses\r\n',
      100
    );
    try {
      expect(webAddressesOn(term, 1).map((one) => one.address)).toEqual([
        'https://en.wikipedia.org/wiki/Foo_'
      ]);
    } finally {
      term.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// The fuzz
// ---------------------------------------------------------------------------

/** mulberry32: a seeded generator, so a failure names the seed that made it. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ['see', 'the', 'notes', 'file', 'and', 'run', '—', '·', '1.', '##', '`code`'];
const ADDRESSES = [
  'https://example.com/a/b',
  'http://x.example/z?q=1&r=2',
  'https://en.wikipedia.org/wiki/Foo_(bar)',
  'https://a.example/c.',
  'https://a.example/c,',
  '<https://a.example/angle>',
  '"https://a.example/quoted"',
  'https://user:pw@h.example/p',
  'https://www.google.com@evil.example/',
  'https://h.example:8080/p#frag',
  'http://[::1]:3000/x',
  'HTTPS://UP.EXAMPLE/X',
  'https://example.org/looks-safe](https://example.com/really-elsewhere)',
  'https://example.com/caf%C3%A9?x=1&y=2',
  'https://',
  'https://x',
  `${LONG}?more=${'q'.repeat(40)}`
];
const WIDE = ['日本', '漢字', '✅', '🚀', '📝', 'ｗｉｄｅ', '⚠️'];
const MARKS = ['(', ')', '[', ']', ':', '.', ',', '!', '?', "'", '"'];

function randomText(next: () => number, cols: number): string {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)] as T;
  const paragraphs: string[] = [];
  const count = 4 + Math.floor(next() * 10);
  for (let p = 0; p < count; p += 1) {
    const parts: string[] = [];
    // Sometimes an indent, the way Claude's continuation rows begin.
    if (next() < 0.3) parts.push(' '.repeat(1 + Math.floor(next() * 6)));
    const tokens = 2 + Math.floor(next() * 14);
    for (let t = 0; t < tokens; t += 1) {
      const roll = next();
      const token =
        roll < 0.35 ? pick(ADDRESSES) : roll < 0.6 ? pick(WORDS) : roll < 0.75 ? pick(WIDE) : pick(MARKS);
      parts.push(token);
      // A space, two, or none, so marks and wide characters touch addresses.
      const gap = next();
      parts.push(gap < 0.65 ? ' ' : gap < 0.75 ? '  ' : '');
    }
    let text = parts.join('');
    // Sometimes break it by hand at the width, the way an agent cuts a row.
    if (next() < 0.25 && text.length > cols) {
      text = `${text.slice(0, cols - 1)}\r\n${'  '}${text.slice(cols - 1)}`;
    }
    paragraphs.push(text);
  }
  return `${paragraphs.join('\r\n')}\r\n`;
}

describe('the copy finds what the addon finds, over a seeded fuzz', () => {
  it('agrees on every row of 160 random buffers at random widths, normal and alternate', async () => {
    const next = seeded(368);
    let rows = 0;
    let addresses = 0;
    for (let n = 0; n < 160; n += 1) {
      const cols = 20 + Math.floor(next() * 121);
      const alternate = n % 2 === 1;
      const text = randomText(next, cols);
      const { term, addon } = await terminalWith(text, cols, 30, alternate);
      try {
        addresses += compareEveryRow(term, addon, `buffer ${n} at ${cols} columns`);
        rows += term.buffer.active.length;
      } finally {
        term.dispose();
      }
    }
    // The fuzz is only evidence if it reached many rows and many addresses.
    expect(rows).toBeGreaterThan(3000);
    expect(addresses).toBeGreaterThan(500);
  });
});
