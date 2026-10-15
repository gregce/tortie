/**
 * PHASE 347 (issue 40) — the link provider and a path broken over rows.
 *
 * The provider is driven with a stub buffer and a stub `classify`, as
 * `p247-path-links.test.ts` drives it. What this file owns is J4 and D8: the
 * join is asked about through the same `doorFor` and cache as a row span, it
 * becomes ONE link from its first cell to its last only when the door accepts
 * it, the row spans inside it are dropped only then, and when the door
 * refuses it the row reads exactly as it did before the phase.
 *
 * "Before the phase" is measured, not assumed: the same buffer is run through
 * the same provider with `joinedPathAt` switched off, which is today's
 * per-row path, and the two are compared link for link.
 *
 * build/p347/SPEC.md §4.2, D7 to D9, §5.2 (PL1 to PL6; PL6 is the fix
 * round's, J7 over the app lens's word wrap, where BOTH names exist).
 *
 * PHASE 347.1 re-pointed it for the governing rule (build/p3471/SPEC.md D2,
 * §4.1) and nothing else: a join is offered only when the door refuses every
 * row span it covers, so the cases that show the join use `JOIN_ONLY`, a door
 * holding the whole file and `/a/other.md` and NO fragment, and PL3, where the
 * whole path and a fragment both exist, now reads every row as today.
 * `sharesCellWithJoin` lives in `@shared/path-spans` since that phase.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ILink } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import { sharesCellWithJoin } from '@shared/path-spans';
import type { PathLinkDeps } from '../path-links';
import { PathLinkProvider } from '../path-links';

/** The switch that makes the provider today's per-row path. */
const parent = vi.hoisted(() => ({ joinOff: false }));

vi.mock('@shared/path-spans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/path-spans')>();
  return {
    ...actual,
    joinedPathAt: (...args: Parameters<typeof actual.joinedPathAt>) =>
      parent.joinOff ? null : actual.joinedPathAt(...args)
  };
});

/** ASCII rows only here, so a cell is a character; PJ5 owns the cell maps. */
function fakeLine(row: string): unknown {
  return {
    length: row.length,
    translateToString: () => row,
    getCell: (x: number) =>
      x < row.length ? { getChars: () => row[x] ?? '', getWidth: () => 1 } : undefined
  };
}

function fakeTerm(rows: string[], cols: number): {
  term: { cols: number; buffer: { active: unknown } };
  reads: number[];
} {
  const reads: number[] = [];
  return {
    reads,
    term: {
      cols,
      buffer: {
        active: {
          length: rows.length,
          getLine: (y: number) => {
            reads.push(y);
            return rows[y] === undefined ? undefined : fakeLine(rows[y] as string);
          }
        }
      }
    }
  };
}

interface Harness {
  provider: PathLinkProvider;
  asked: string[];
  bases: string[];
  opened: { path: string; repoPath: string; line?: number }[];
  reads: number[];
}

const BASE = '/Users/johnberryman/projects/github/arcturus-labs/rook';

function harness(
  rows: string[],
  cols: number,
  doors: Record<string, PathDoorAnswer>,
  over: Partial<PathLinkDeps> = {}
): Harness {
  const asked: string[] = [];
  const bases: string[] = [];
  const opened: Harness['opened'] = [];
  const { term, reads } = fakeTerm(rows, cols);
  const deps: PathLinkDeps = {
    isLocal: () => true,
    repoPath: () => BASE,
    classify: async (paths, base) => {
      asked.push(...paths);
      bases.push(base);
      return paths.map(
        (path): DropPreparedItem => ({
          sourcePath: path,
          kind: 'file',
          refPath: path,
          copied: false,
          isImage: false,
          bytes: 0,
          door: doors[path] ?? { door: null, refusal: 'missing' }
        })
      );
    },
    openInTortie: (path, repoPath, line) => {
      opened.push({ path, repoPath, ...(line !== undefined ? { line } : {}) });
    },
    openOnMac: async () => {},
    ...over
  };
  return { provider: new PathLinkProvider(term as never, deps), asked, bases, opened, reads };
}

const linksOn = async (
  provider: PathLinkProvider,
  line: number
): Promise<ILink[] | undefined> =>
  new Promise((resolve) => {
    provider.provideLinks(line, resolve);
  });

const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const CLICK = {} as MouseEvent;

/** What a person can see of a link: where it is drawn and what it says. */
const drawnOf = (links: ILink[] | undefined): { range: ILink['range']; text: string }[] | undefined =>
  links?.map((l) => ({ range: l.range, text: l.text }));

const PATH =
  '/Users/johnberryman/projects/github/arcturus-labs/rook/.agents/skills/software-factory/.planning/brainstorming.md:134';
const FILE = PATH.replace(/:134$/, '');
const FRAGMENT_TOP = '/Users/johnberryman/projects/github/arcturus-';
const FRAGMENT_BOTTOM = '.planning/brainstorming.md';

/** Issue 40's rows, with prose above and a second path beside the last piece. */
const ROWS = [
  'The plan is written down at',
  FRAGMENT_TOP,
  'labs/rook/.agents/skills/software-factory/',
  '.planning/brainstorming.md:134 and /a/other.md',
  '',
  '> '
];
const WIDTH = 47;

const editor = (path: string): PathDoorAnswer => ({ door: 'editor', path });

/** The whole path exists, and so does every fragment's own spelling. */
const EVERYTHING: Record<string, PathDoorAnswer> = {
  [FILE]: editor(FILE),
  [FRAGMENT_TOP]: editor(FRAGMENT_TOP),
  [FRAGMENT_BOTTOM]: editor(`${BASE}/${FRAGMENT_BOTTOM}`),
  '/a/other.md': editor('/a/other.md')
};

/**
 * The whole path exists and NO fragment's own spelling does (Phase 347.1):
 * the door accepts the join and refuses every row span it covers, so the
 * governing rule lets it through.
 */
const JOIN_ONLY: Record<string, PathDoorAnswer> = {
  [FILE]: editor(FILE),
  '/a/other.md': editor('/a/other.md')
};

const JOIN_RANGE = { start: { x: 1, y: 2 }, end: { x: 30, y: 4 } };

describe('PL1 the door accepts the join', () => {
  it('returns ONE link from the first cell on the top row to the last on the bottom, from every row', async () => {
    for (const line of [2, 3, 4]) {
      const h = harness(ROWS, WIDTH, JOIN_ONLY);
      const links = await linksOn(h.provider, line);
      const join = links?.find((l) => l.text === PATH);
      expect(join?.range, `line ${String(line)}`).toEqual(JOIN_RANGE);
      // The range ends on the BOTTOM row, not on the row it started on.
      expect(join?.range.end.y).toBe(4);
    }
  });

  it('draws only the join inside it and keeps the row spans outside it', async () => {
    const top = await linksOn(harness(ROWS, WIDTH, JOIN_ONLY).provider, 2);
    expect(drawnOf(top)).toEqual([{ range: JOIN_RANGE, text: PATH }]);
    const bottom = await linksOn(harness(ROWS, WIDTH, JOIN_ONLY).provider, 4);
    expect(drawnOf(bottom)).toEqual([
      { range: JOIN_RANGE, text: PATH },
      { range: { start: { x: 36, y: 4 }, end: { x: 46, y: 4 } }, text: '/a/other.md' }
    ]);
  });

  it('asks the door about the joined target beside the spans, once, through the cache', async () => {
    const h = harness(ROWS, WIDTH, EVERYTHING);
    await linksOn(h.provider, 2);
    await linksOn(h.provider, 3);
    await linksOn(h.provider, 4);
    expect(h.asked.filter((p) => p === FILE)).toHaveLength(1);
    expect(new Set(h.bases)).toEqual(new Set([BASE]));
  });

  it('offers the join on a row with no span of its own', async () => {
    // At 45 columns the top row's fragment reaches the last column, so
    // refusal 8 takes it and the row has no span at all; the join is still
    // looked for and offered. (Phase 347.1's ruled round: ROWS' bottom row is
    // 46 cells, which no 45-column pane draws, and J9 refuses a chain whose
    // bottom row reads past the width, so the second path, which the door
    // here does not accept, is shortened to fit.)
    const rows45 = ROWS.map((r) => r.replace(' and /a/other.md', ' and /a/o.md'));
    expect(rows45[3]).toHaveLength(42);
    const h = harness(rows45, 45, { [FILE]: editor(FILE) });
    expect(drawnOf(await linksOn(h.provider, 2))).toEqual([{ range: JOIN_RANGE, text: PATH }]);
    parent.joinOff = true;
    try {
      expect(await linksOn(harness(rows45, 45, { [FILE]: editor(FILE) }).provider, 2)).toBeUndefined();
    } finally {
      parent.joinOff = false;
    }
  });

  it('offers the join on a row whose own spans the door refuses', async () => {
    const h = harness(ROWS, WIDTH, { [FILE]: editor(FILE) });
    expect(drawnOf(await linksOn(h.provider, 3))).toEqual([{ range: JOIN_RANGE, text: PATH }]);
  });
});

describe('what the provider hands the join', () => {
  it('asks about the PANE’s width, not the hovered row’s length', async () => {
    // At 50 columns the top row (45) plus `labs/` fits, so no breaker was
    // forced and the whole path is not joined from there, whatever exists.
    const h = harness(ROWS, 50, { [FILE]: editor(FILE) });
    expect(await linksOn(h.provider, 2)).toBeUndefined();
    expect(h.asked).not.toContain(FILE);
  });

  it('tells the join where the buffer ends, so a path running off its last row is not joined', async () => {
    const rows = ['x', 'see /Users/me/proj/aaa-', 'bbb.md'];
    const whole = '/Users/me/proj/aaa-bbb.md';
    const h = harness(rows, 23, { [whole]: editor(whole) });
    expect(await linksOn(h.provider, 2)).toBeUndefined();
    expect(await linksOn(h.provider, 3)).toBeUndefined();
    // One row more below it, and the same join opens.
    const control = harness([...rows, ''], 23, { [whole]: editor(whole) });
    expect(drawnOf(await linksOn(control.provider, 3))?.map((l) => l.text)).toEqual([whole]);
  });
});

describe('PL2 the door refuses the join: the row reads exactly as it did', () => {
  const doorsWithoutTheFile: Record<string, PathDoorAnswer> = {
    [FRAGMENT_TOP]: editor(FRAGMENT_TOP),
    [FRAGMENT_BOTTOM]: editor(`${BASE}/${FRAGMENT_BOTTOM}`),
    '/a/other.md': editor('/a/other.md')
  };

  for (const width of [45, 47, 50]) {
    it(`gives today's per-row links on every row at ${String(width)} columns`, async () => {
      for (let line = 1; line <= ROWS.length; line += 1) {
        const now = harness(ROWS, width, doorsWithoutTheFile);
        const got = drawnOf(await linksOn(now.provider, line));
        parent.joinOff = true;
        try {
          const before = harness(ROWS, width, doorsWithoutTheFile);
          const want = drawnOf(await linksOn(before.provider, line));
          expect(got, `line ${String(line)}`).toEqual(want);
        } finally {
          parent.joinOff = false;
        }
      }
    });
  }

  it('still asks the door about the join, so a refusal is the door’s and not a guess', async () => {
    const h = harness(ROWS, WIDTH, doorsWithoutTheFile);
    await linksOn(h.provider, 3);
    expect(h.asked).toContain(FILE);
  });

  it('really is a different reading when the door accepts (the comparison can fail)', async () => {
    const now = drawnOf(await linksOn(harness(ROWS, WIDTH, JOIN_ONLY).provider, 2));
    parent.joinOff = true;
    try {
      const before = drawnOf(await linksOn(harness(ROWS, WIDTH, JOIN_ONLY).provider, 2));
      expect(now).not.toEqual(before);
      expect(now?.map((l) => l.text)).toEqual([PATH]);
      expect(before).toBeUndefined();
    } finally {
      parent.joinOff = false;
    }
  });
});

describe('PL3 the whole path and a fragment both exist: every row reads as today (Phase 347.1)', () => {
  it('gives the parent’s links from rows 2, 3 and 4', async () => {
    for (const line of [2, 3, 4]) {
      const got = drawnOf(await linksOn(harness(ROWS, WIDTH, EVERYTHING).provider, line));
      parent.joinOff = true;
      try {
        const want = drawnOf(await linksOn(harness(ROWS, WIDTH, EVERYTHING).provider, line));
        expect(got, `line ${String(line)}`).toEqual(want);
      } finally {
        parent.joinOff = false;
      }
      expect(got?.some((l) => l.text === PATH), `line ${String(line)}`).not.toBe(true);
    }
  });

  it('opens the bottom fragment from its own row, at its line, never the whole file', async () => {
    const h = harness(ROWS, WIDTH, EVERYTHING);
    const links = await linksOn(h.provider, 4);
    const fragment = links?.find((l) => l.text.startsWith(FRAGMENT_BOTTOM));
    expect(fragment).toBeDefined();
    fragment?.activate(CLICK, fragment.text);
    await settle();
    expect(h.opened).toEqual([{ path: `${BASE}/${FRAGMENT_BOTTOM}`, repoPath: BASE, line: 134 }]);
  });

  it('opens the top fragment from its own row at 47 columns, where refusal 8 does not hide it', async () => {
    const h = harness(ROWS, WIDTH, EVERYTHING);
    const links = await linksOn(h.provider, 2);
    expect(links?.map((l) => l.text)).toEqual([FRAGMENT_TOP]);
    links?.[0]?.activate(CLICK, links[0].text);
    await settle();
    expect(h.opened).toEqual([{ path: FRAGMENT_TOP, repoPath: BASE }]);
  });
});

describe('PL6 a word wrap below a path that ends short of the edge (J7, the fix round)', () => {
  // The app lens's fixture: README.md two cells short of the last column,
  // above `.bak beside it`, and README.md.bak REALLY EXISTS. Before J7 the
  // door accepted the join, the row's own README.md link was dropped and the
  // press opened README.md.bak. The row names README.md, which the parent
  // opened, so the row must read exactly as it did.
  const ABOVE = 'I kept a copy of /r/projects/app/src/README.md';
  const BELOW = '.bak beside it, just in case.';
  const RW = ['x', ABOVE, BELOW, 'y'];
  const README = '/r/projects/app/src/README.md';
  const BAK = `${README}.bak`;
  const BOTH: Record<string, PathDoorAnswer> = { [README]: editor(README), [BAK]: editor(BAK) };

  for (const width of [47, 48, 49]) {
    it(`reads both rows as the parent did at ${String(width)} columns, and never asks about README.md.bak`, async () => {
      for (const line of [2, 3]) {
        const now = harness(RW, width, BOTH);
        const got = drawnOf(await linksOn(now.provider, line));
        expect(now.asked, `line ${String(line)}`).not.toContain(BAK);
        parent.joinOff = true;
        try {
          const want = drawnOf(await linksOn(harness(RW, width, BOTH).provider, line));
          expect(got, `line ${String(line)}`).toEqual(want);
        } finally {
          parent.joinOff = false;
        }
      }
    });
  }

  it('opens README.md from its own row, never README.md.bak', async () => {
    const h = harness(RW, 48, BOTH);
    const links = await linksOn(h.provider, 2);
    expect(links?.map((l) => l.text)).toEqual([README]);
    links?.[0]?.activate(CLICK, links[0].text);
    await settle();
    expect(h.opened.map((o) => o.path)).toEqual([README]);
    expect(await linksOn(h.provider, 3)).toBeUndefined();
  });
});

describe('PL4 a pane whose session runs on another machine', () => {
  it('asks nothing, reads no row and returns nothing, before any join is looked for', async () => {
    const h = harness(ROWS, WIDTH, EVERYTHING, { isLocal: () => false });
    for (const line of [2, 3, 4]) expect(await linksOn(h.provider, line)).toBeUndefined();
    expect(h.asked).toEqual([]);
    expect(h.reads).toEqual([]);
  });
});

describe('PL5 the click', () => {
  it('asks the door again and opens main’s re-spelling under the base, with the joined line', async () => {
    const doors: Record<string, PathDoorAnswer> = { [FILE]: editor(FILE) };
    const h = harness(ROWS, WIDTH, doors);
    const links = await linksOn(h.provider, 3);
    doors[FILE] = { door: 'editor', path: '/private/real/brainstorming.md', underBase: FILE };
    const before = h.asked.length;
    links?.[0]?.activate(CLICK, PATH);
    await settle();
    expect(h.asked.slice(before)).toEqual([FILE]);
    expect(h.opened).toEqual([{ path: FILE, repoPath: BASE, line: 134 }]);
  });

  it('opens `path` when main sends no re-spelling', async () => {
    const doors: Record<string, PathDoorAnswer> = { [FILE]: editor(FILE) };
    const h = harness(ROWS, WIDTH, doors);
    const links = await linksOn(h.provider, 3);
    doors[FILE] = editor('/private/real/brainstorming.md');
    links?.[0]?.activate(CLICK, PATH);
    await settle();
    expect(h.opened).toEqual([{ path: '/private/real/brainstorming.md', repoPath: BASE, line: 134 }]);
  });

  it('opens nothing when the fresh answer refuses, and nothing on a pane that became remote', async () => {
    const doors: Record<string, PathDoorAnswer> = { [FILE]: editor(FILE) };
    let local = true;
    const h = harness(ROWS, WIDTH, doors, { isLocal: () => local });
    const links = await linksOn(h.provider, 3);
    doors[FILE] = { door: null, refusal: 'executable-bit' };
    links?.[0]?.activate(CLICK, PATH);
    await settle();
    expect(h.opened).toEqual([]);
    doors[FILE] = editor(FILE);
    local = false;
    links?.[0]?.activate(CLICK, PATH);
    await settle();
    expect(h.opened).toEqual([]);
  });
});

describe('the cell test a row span yields by', () => {
  const join = { top: 1, bottom: 3, startColumn: 4, endColumn: 10 };
  it('covers the top row from the first cell, the middle whole and the bottom to the last cell', () => {
    expect(sharesCellWithJoin({ start: 1, end: 4 }, 1, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 5, end: 9 }, 1, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 1, end: 200 }, 2, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 1, end: 10 }, 3, join)).toBe(true);
    expect(sharesCellWithJoin({ start: 11, end: 20 }, 3, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 1, end: 9 }, 0, join)).toBe(false);
    expect(sharesCellWithJoin({ start: 1, end: 9 }, 4, join)).toBe(false);
  });
});
