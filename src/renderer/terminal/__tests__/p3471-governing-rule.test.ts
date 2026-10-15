/**
 * PHASE 347.1 — THE GOVERNING RULE, through the provider (build/p3471/SPEC.md
 * D2, §4.1, §5.2, GR1 to GR10).
 *
 * A JOIN NEVER TAKES A CELL FROM A ROW SPAN THE DOOR ALREADY ACCEPTS, judged
 * over every row of the chain. The provider is driven with a stub buffer and a
 * stub `classify`, as `p347-path-links-join.test.ts` drives it, and "today" is
 * measured rather than assumed: the same buffer through the same provider
 * with `joinedPathAt` switched off (`joinOff`), which is the parent's
 * per-row path.
 *
 * EVERY CASE CAN FAIL. A `vi.mock` switch takes the rule out
 * (`governingOff`: `spansUnderJoin` answers no span), and each case asserts
 * that its reading then DIFFERS. GR6 and GR7 are the two cases where the join
 * IS offered, so the rule taken out reads the same there by construction;
 * each of them is shown to differ by the switch for the clause it owns
 * instead: `noEdges` judges the covered rows without refusal 8's width and
 * predecessor (GR6), and `wholeRows` drops the cell test and takes every span
 * of every covered row (GR7). GR10's consistency is shown to break under
 * `hoveredOnly`, which judges the hovered row alone.
 *
 * GR11 is the fix round's (lens A's ablation A1b, which counted only the
 * editor door's answer as taken and left every case above green, because
 * every one of them answers through the editor door): a fragment the image
 * door accepts and one the Mac door accepts are held exactly as an editor one
 * is, and a press opens each through its own door.
 *
 * GR12 is his ruled round's, the reverify's F1 through the shipping provider
 * and a door that opens the project's own file of the tail's name: a path in
 * another folder broken over three rows whose top row carries cells past the
 * pane's width draws today's links on every row and opens nothing, where the
 * fix round's J9 cut the chain and the two rows below opened
 * `<project>/build/fixtures/facts/manifests/package.json`.
 *
 * HIS ABSOLUTE-ONLY ROUND (2026-10-14, build/p3471/SPEC.md D14, D15, §5.4).
 * J10 refuses every chain whose joined target is relative, so GR5's and
 * GR12's relative rows now join from no row whatever the rule says, and each
 * clause they carried moves to an ABSOLUTE twin. GR13 is J10 through the
 * provider (the reverify's E1: the relative tail of a path printed into
 * another worktree, which opened this project's copy at HEAD), and GR14 is
 * J11 (a chain a breaker that cuts anywhere left at either end, though both
 * the cut name and the printed one exist). Neither switch reaches J10 or
 * J11, which live in `joinedPathAt`; that each case can fail is shown by
 * taking the clause out of a copy of the source (the builder's report).
 */

import { describe, expect, it, vi } from 'vitest';
import type { ILink } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import type { PathLinkDeps } from '../path-links';
import { PathLinkProvider } from '../path-links';

type Mode = 'on' | 'joinOff' | 'governingOff' | 'noEdges' | 'wholeRows' | 'hoveredOnly';

/** The switches, read by the mock at every call. */
const sw = vi.hoisted(() => ({ mode: 'on' as string, hovered: -1 }));

vi.mock('@shared/path-spans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/path-spans')>();
  type Rows = (i: number) => import('@shared/path-spans').DrawnRow | null;
  type Join = import('@shared/path-spans').JoinedSpan;
  type Under = import('@shared/path-spans').SpanUnderJoin;
  /** Every span a covered row yields to `spansOf`, cell-tested or not. */
  const judge = (
    rows: Rows,
    join: Join,
    spansOf: (r: number) => import('@shared/path-spans').PathSpan[],
    cellTest: boolean
  ): Under[] | null => {
    const out: Under[] = [];
    for (let r = join.top; r <= join.bottom; r += 1) {
      const here = rows(r);
      if (here === null) return null;
      for (const span of spansOf(r)) {
        const range = actual.spanColumns(span, here.columns);
        if (range === null) continue;
        if (!cellTest || actual.sharesCellWithJoin(range, r, join)) {
          out.push({ row: r, target: span.target, range });
        }
      }
    }
    return out;
  };
  return {
    ...actual,
    joinedPathAt: (...args: Parameters<typeof actual.joinedPathAt>) =>
      sw.mode === 'joinOff' ? null : actual.joinedPathAt(...args),
    spansUnderJoin: (rows: Rows, join: Join, width: number): Under[] | null => {
      switch (sw.mode) {
        case 'governingOff':
          return [];
        case 'noEdges':
          return judge(
            rows,
            join,
            (r) => {
              const here = rows(r);
              return here === null
                ? []
                : actual.pathSpansInRow(here.text, {
                    width: Number.POSITIVE_INFINITY,
                    columns: here.columns,
                    above: null,
                    aboveEnd: 0
                  });
            },
            true
          );
        case 'wholeRows':
          return judge(rows, join, (r) => actual.rowSpansAt(rows, r, width), false);
        case 'hoveredOnly': {
          const all = actual.spansUnderJoin(rows, join, width);
          return all === null ? null : all.filter((u) => u.row === sw.hovered);
        }
        default:
          return actual.spansUnderJoin(rows, join, width);
      }
    }
  };
});

/** ASCII rows only here, so a cell is a character; U1 owns the cell maps. */
function fakeLine(row: string): unknown {
  return {
    length: row.length,
    translateToString: () => row,
    getCell: (x: number) =>
      x < row.length ? { getChars: () => row[x] ?? '', getWidth: () => 1 } : undefined
  };
}

/**
 * A buffer of rows; `flaky` names a row that answers `getLine` only once and
 * then `undefined`, the reader that changes under the provider (GR8).
 */
function fakeTerm(rows: string[], cols: number, flaky?: number): { cols: number; buffer: { active: unknown } } {
  let flakyReads = 0;
  return {
    cols,
    buffer: {
      active: {
        length: rows.length,
        getLine: (y: number) => {
          if (y === flaky) {
            flakyReads += 1;
            if (flakyReads > 1) return undefined;
          }
          return rows[y] === undefined ? undefined : fakeLine(rows[y] as string);
        }
      }
    }
  };
}

interface Opened {
  path: string;
  repoPath: string;
  line?: number;
}

interface Harness {
  provider: PathLinkProvider;
  asked: string[];
  bases: string[];
  opened: Opened[];
  /** What a press handed the Mac door (GR11). */
  onMac: string[];
}

const BASE = '/Users/johnberryman/projects/github/arcturus-labs/rook';

function harness(
  rows: string[],
  cols: number,
  doors: Record<string, PathDoorAnswer>,
  base = BASE,
  flaky?: number
): Harness {
  const asked: string[] = [];
  const bases: string[] = [];
  const opened: Opened[] = [];
  const onMac: string[] = [];
  const deps: PathLinkDeps = {
    isLocal: () => true,
    repoPath: () => base,
    classify: async (paths, b) => {
      asked.push(...paths);
      bases.push(b);
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
    openOnMac: async (path) => {
      onMac.push(path);
    },
  };
  const term = fakeTerm(rows, cols, flaky);
  return { provider: new PathLinkProvider(term as never, deps), asked, bases, opened, onMac };
}

const linksOn = async (provider: PathLinkProvider, line: number): Promise<ILink[] | undefined> =>
  new Promise((resolve) => {
    provider.provideLinks(line, resolve);
  });

const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const CLICK = {} as MouseEvent;

type Drawn = { range: ILink['range']; text: string }[] | undefined;

const drawnOf = (links: ILink[] | undefined): Drawn =>
  links?.map((l) => ({ range: l.range, text: l.text }));

interface Fixture {
  rows: string[];
  width: number;
  doors: Record<string, PathDoorAnswer>;
  base?: string;
  flaky?: number;
}

/** What one row draws under one mode, on a fresh provider. */
async function reading(f: Fixture, line: number, mode: Mode = 'on'): Promise<Drawn> {
  sw.mode = mode;
  sw.hovered = line - 1;
  try {
    const h = harness(f.rows, f.width, f.doors, f.base, f.flaky);
    return drawnOf(await linksOn(h.provider, line));
  } finally {
    sw.mode = 'on';
    sw.hovered = -1;
  }
}

/** Every row 1..n under one mode. */
async function everyRow(f: Fixture, mode: Mode = 'on'): Promise<Drawn[]> {
  const out: Drawn[] = [];
  for (let line = 1; line <= f.rows.length; line += 1) out.push(await reading(f, line, mode));
  return out;
}

/** What a press on the link whose text starts with `text` opens, from `line`. */
async function press(f: Fixture, line: number, text: string): Promise<Opened[]> {
  const h = harness(f.rows, f.width, f.doors, f.base, f.flaky);
  const links = await linksOn(h.provider, line);
  const link = links?.find((l) => l.text.startsWith(text));
  if (link === undefined) return [];
  link.activate(CLICK, link.text);
  await settle();
  return h.opened;
}

const editor = (path: string): PathDoorAnswer => ({ door: 'editor', path });

/** Every link `line` draws, each pressed once: what they opened, in order. */
async function pressEvery(f: Fixture, line: number): Promise<Opened[]> {
  const h = harness(f.rows, f.width, f.doors, f.base, f.flaky);
  const links = await linksOn(h.provider, line);
  for (const link of links ?? []) link.activate(CLICK, link.text);
  await settle();
  return h.opened;
}

/** Every row reads exactly as `joinOff` reads it. */
async function everyRowAsToday(f: Fixture): Promise<void> {
  for (let line = 1; line <= f.rows.length; line += 1) {
    expect(await reading(f, line), `line ${String(line)}`).toEqual(await reading(f, line, 'joinOff'));
  }
}

const PATH =
  '/Users/johnberryman/projects/github/arcturus-labs/rook/.agents/skills/software-factory/.planning/brainstorming.md:134';
const FILE = PATH.replace(/:134$/, '');
const TOP = '/Users/johnberryman/projects/github/arcturus-';
const MIDDLE = 'labs/rook/.agents/skills/software-factory/';
const BOTTOM = '.planning/brainstorming.md';

/** Issue 40's rows, with prose above and a second path beside the last piece. */
const ROWS = [
  'The plan is written down at',
  TOP,
  MIDDLE,
  `${BOTTOM}:134 and /a/other.md`,
  '',
  '> '
];

const JOIN_RANGE = { start: { x: 1, y: 2 }, end: { x: 30, y: 4 } };

/** Asserts every row reads as today, and that with the rule out it does not. */
async function readsAsToday(f: Fixture, lines: number[]): Promise<void> {
  const differs: number[] = [];
  for (const line of lines) {
    const now = await reading(f, line);
    expect(now, `line ${String(line)}`).toEqual(await reading(f, line, 'joinOff'));
    if (JSON.stringify(await reading(f, line, 'governingOff')) !== JSON.stringify(now)) {
      differs.push(line);
    }
  }
  // The rule taken out moves at least one of these rows: the case can fail.
  expect(differs.length, 'rows the rule decides').toBeGreaterThan(0);
}

describe('GR1 issue 40 at 47 with the bottom fragment’s own spelling a file', () => {
  const f: Fixture = {
    rows: ROWS,
    width: 47,
    doors: {
      [FILE]: editor(FILE),
      [BOTTOM]: editor(`${BASE}/${BOTTOM}`),
      '/a/other.md': editor('/a/other.md')
    }
  };

  it('reads rows 2, 3 and 4 exactly as today, and the rule out reads them otherwise', async () => {
    await readsAsToday(f, [2, 3, 4]);
    expect((await reading(f, 2, 'governingOff'))?.map((l) => l.text)).toEqual([PATH]);
  });

  it('opens the fragment from the bottom row, at its line, never the whole file', async () => {
    expect(await press(f, 4, BOTTOM)).toEqual([{ path: `${BASE}/${BOTTOM}`, repoPath: BASE, line: 134 }]);
    sw.mode = 'governingOff';
    try {
      expect(await press(f, 4, BOTTOM)).toEqual([]);
    } finally {
      sw.mode = 'on';
    }
  });
});

describe('GR2 the top fragment a file, at 47 where refusal 8 does not hide it', () => {
  const f: Fixture = {
    rows: ROWS,
    width: 47,
    doors: { [FILE]: editor(FILE), [TOP]: editor(TOP), '/a/other.md': editor('/a/other.md') }
  };
  it('reads every row as today', async () => {
    await readsAsToday(f, [1, 2, 3, 4, 5, 6]);
    expect((await reading(f, 2))?.map((l) => l.text)).toEqual([TOP]);
  });
});

describe('GR3 the middle piece’s spelling accepted (a door that accepts a folder)', () => {
  const f: Fixture = {
    rows: ROWS,
    width: 47,
    doors: {
      [FILE]: editor(FILE),
      [MIDDLE]: editor(`${BASE}/${MIDDLE}`),
      '/a/other.md': editor('/a/other.md')
    }
  };
  it('reads every row as today', async () => {
    await readsAsToday(f, [1, 2, 3, 4, 5, 6]);
    expect((await reading(f, 3))?.map((l) => l.text)).toEqual([MIDDLE]);
  });
});

describe('GR4 the third reverify’s list shapes, 1, 2 and 3 cells short of the edge', () => {
  const base = '/r/tortie';
  const shapes: { name: string; upper: string; lower: string; joined: string; item: string }[] = [
    {
      name: 'an absolute folder',
      upper: '• /r/tortie/docs/',
      lower: '• notes/a.md',
      joined: '/r/tortie/docs/notes/a.md',
      item: 'notes/a.md'
    },
    {
      name: 'a ~/ folder',
      upper: '• ~/tortie/docs/',
      lower: '• notes/a.md',
      joined: '~/tortie/docs/notes/a.md',
      item: 'notes/a.md'
    },
    {
      name: 'a piece broken after -',
      upper: '• /r/tortie/src/n8kk-',
      lower: '• draft8.md',
      joined: '/r/tortie/src/n8kk-draft8.md',
      item: 'draft8.md'
    }
  ];
  for (const s of shapes) {
    for (const short of [1, 2, 3]) {
      it(`${s.name}, ${String(short)} short: every row as today, and the item opens its own file`, async () => {
        const f: Fixture = {
          rows: ['Files:', s.upper, s.lower, '', '> '],
          width: s.upper.length + short,
          base,
          doors: {
            [s.joined]: editor(`/r/tortie/joined/${s.item}`),
            [s.item]: editor(`${base}/${s.item}`)
          }
        };
        await readsAsToday(f, [1, 2, 3, 4, 5]);
        expect(await press(f, 3, s.item)).toEqual([{ path: `${base}/${s.item}`, repoPath: base }]);
        // The shape really joins: with the rule out the join takes the item's cells.
        expect((await reading(f, 3, 'governingOff'))?.map((l) => l.text)).toEqual([s.joined]);
      });
    }
  }
});

describe('GR5 a folder ON the last column above an indented item', () => {
  // His absolute-only round: the folder is ABSOLUTE, so J10 lets the chain
  // through and the rule is what refuses it; the relative folder this case
  // read before joins from no row whatever the rule says (J10).
  for (const lower of ['  notes.md', '⎿  notes.md']) {
    it(`reads every row as today above ${JSON.stringify(lower)}`, async () => {
      const upper = '  /r/tortie/docs/research/';
      const joined = '/r/tortie/docs/research/notes.md';
      const f: Fixture = {
        rows: ['Files:', upper, lower, '', '> '],
        width: upper.length,
        base: '/r/tortie',
        doors: {
          [joined]: editor(joined),
          'notes.md': editor('/r/tortie/notes.md')
        }
      };
      await readsAsToday(f, [1, 2, 3, 4, 5]);
      expect((await reading(f, 3))?.map((l) => l.text)).toEqual(['notes.md']);
      expect((await reading(f, 3, 'governingOff'))?.map((l) => l.text)).toEqual([joined]);
    });

    it(`the relative folder above ${JSON.stringify(lower)} joins from no row, with the rule or without it (J10)`, async () => {
      const upper = '  docs/research/';
      const f: Fixture = {
        rows: ['Files:', upper, lower, '', '> '],
        width: upper.length,
        base: '/r/tortie',
        doors: {
          'docs/research/notes.md': editor('/r/tortie/docs/research/notes.md'),
          'notes.md': editor('/r/tortie/notes.md')
        }
      };
      for (let line = 1; line <= f.rows.length; line += 1) {
        const today = await reading(f, line, 'joinOff');
        expect(await reading(f, line), `line ${String(line)}`).toEqual(today);
        expect(await reading(f, line, 'governingOff'), `line ${String(line)}`).toEqual(today);
      }
      expect((await reading(f, 3))?.map((l) => l.text)).toEqual(['notes.md']);
    });
  }
});

describe('GR6 a fragment refusal 8 hid drew no link today, so the join IS offered', () => {
  const cases: { name: string; doors: Record<string, PathDoorAnswer> }[] = [
    {
      name: 'the top fragment a file, its end on the last column',
      doors: { [FILE]: editor(FILE), [TOP]: editor(TOP) }
    },
    {
      name: 'the middle piece accepted, below a full row ending on -',
      doors: { [FILE]: editor(FILE), [MIDDLE]: editor(`${BASE}/${MIDDLE}`) }
    }
  ];
  for (const c of cases) {
    it(`offers the join from all three rows at 45: ${c.name}`, async () => {
      // ROWS' bottom row is 46 cells, which no 45-column pane draws, and J9
      // (his ruled round) refuses a chain whose bottom row reads past the
      // width; `/a/other.md` is not in this door table, so it is shortened.
      const rows = ROWS.map((r) => r.replace(' and /a/other.md', ' and /a/o.md'));
      expect(rows[3]).toHaveLength(42);
      const f: Fixture = { rows, width: 45, doors: c.doors };
      for (const line of [2, 3]) {
        // Today the row drew nothing: refusal 8 hid the fragment.
        expect(await reading(f, line, 'joinOff'), `line ${String(line)}`).toBeUndefined();
      }
      for (const line of [2, 3, 4]) {
        const now = await reading(f, line);
        expect(now?.[0], `line ${String(line)}`).toEqual({ range: JOIN_RANGE, text: PATH });
        // The rule out reads the same here, by construction...
        expect(await reading(f, line, 'governingOff'), `line ${String(line)}`).toEqual(now);
        // ...and judging the rows WITHOUT refusal 8 refuses the join: the
        // width and the predecessor are what let it through.
        expect(
          (await reading(f, line, 'noEdges'))?.some((l) => l.text === PATH),
          `line ${String(line)}`
        ).not.toBe(true);
      }
      expect(await press(f, 3, PATH)).toEqual([{ path: FILE, repoPath: BASE, line: 134 }]);
    });
  }
});

describe('GR7 an accepted span beside the join on its bottom row', () => {
  const f: Fixture = {
    rows: ROWS,
    width: 47,
    doors: { [FILE]: editor(FILE), '/a/other.md': editor('/a/other.md') }
  };
  it('offers the join and keeps /a/other.md’s link', async () => {
    const want = [
      { range: JOIN_RANGE, text: PATH },
      { range: { start: { x: 36, y: 4 }, end: { x: 46, y: 4 } }, text: '/a/other.md' }
    ];
    expect(await reading(f, 4)).toEqual(want);
    expect(await reading(f, 4, 'governingOff')).toEqual(want);
    // The cell test is what lets it through: every span of the row refuses it.
    expect(await reading(f, 4, 'wholeRows')).toEqual([want[1]]);
    expect(await press(f, 4, '/a/other.md')).toEqual([{ path: '/a/other.md', repoPath: BASE }]);
  });
});

describe('GR8 a row of the join that answers once and then undefined', () => {
  const doors = { [FILE]: editor(FILE), '/a/other.md': editor('/a/other.md') };
  const cases: { name: string; line: number; flaky: number }[] = [
    { name: 'the top row, hovering the bottom', line: 4, flaky: 1 },
    { name: 'the bottom row, hovering the top', line: 2, flaky: 3 }
  ];
  for (const c of cases) {
    it(`offers no join, and the hovered row reads as today: ${c.name}`, async () => {
      const f: Fixture = { rows: ROWS, width: 47, doors, flaky: c.flaky };
      const now = await reading(f, c.line);
      expect(now?.some((l) => l.text === PATH)).not.toBe(true);
      expect(now).toEqual(await reading(f, c.line, 'joinOff'));
      // The join WAS found (the reader answered `joinedPathAt`); the rule's
      // own read of the row refused it, so with the rule out it is offered.
      expect((await reading(f, c.line, 'governingOff'))?.[0]?.text).toBe(PATH);
    });
  }
});

describe('GR9 every target the join covers is asked through classify, with one base', () => {
  const f: Fixture = {
    rows: ROWS,
    width: 47,
    doors: { [FILE]: editor(FILE) }
  };
  it('asks the top, middle and bottom pieces and the joined target from the middle row', async () => {
    const h = harness(f.rows, f.width, f.doors);
    await linksOn(h.provider, 3);
    expect(new Set(h.asked)).toEqual(new Set([TOP, MIDDLE, BOTTOM, FILE]));
    expect(new Set(h.bases)).toEqual(new Set([BASE]));
    // The hovered row's own piece is one spelling: asked once, not twice.
    expect(h.asked.filter((p) => p === MIDDLE)).toHaveLength(1);
  });

  it('an answer that is missing counts as accepted, so the join is not offered', async () => {
    // `doorFor` always answers today, so the only way to reach this clause is
    // to make one answer go missing: the top piece's, asked from the middle row.
    const missing = harness(f.rows, f.width, f.doors);
    const p = missing.provider as unknown as {
      doorFor(target: string, base: string): Promise<PathDoorAnswer | undefined>;
    };
    const original = p.doorFor.bind(missing.provider);
    p.doorFor = async (target, base) => (target === TOP ? undefined : original(target, base));
    expect((await linksOn(missing.provider, 3))?.some((l) => l.text === PATH)).not.toBe(true);
    // The control: the same rows and doors with every answer present.
    const present = harness(f.rows, f.width, f.doors);
    expect((await linksOn(present.provider, 3))?.map((l) => l.text)).toEqual([PATH]);
  });

  it('with the rule out, the other rows’ pieces are never asked', async () => {
    sw.mode = 'governingOff';
    try {
      const h = harness(f.rows, f.width, f.doors);
      await linksOn(h.provider, 3);
      expect(new Set(h.asked)).toEqual(new Set([MIDDLE, FILE]));
    } finally {
      sw.mode = 'on';
    }
  });
});

describe('GR10 every row of a chain gives the same answer', () => {
  const offers = (rows: Drawn[]): boolean[] =>
    [2, 3, 4].map((line) => rows[line - 1]?.some((l) => l.text === PATH) === true);

  it('none offers the join when one row’s piece is a file, all offer it when none is', async () => {
    const taken: Fixture = {
      rows: ROWS,
      width: 47,
      doors: { [FILE]: editor(FILE), [TOP]: editor(TOP) }
    };
    const free: Fixture = { rows: ROWS, width: 47, doors: { [FILE]: editor(FILE) } };
    expect(offers(await everyRow(taken))).toEqual([false, false, false]);
    expect(offers(await everyRow(free))).toEqual([true, true, true]);
    // The rule out reads `taken` otherwise...
    expect(offers(await everyRow(taken, 'governingOff'))).toEqual([true, true, true]);
    // ...and judging the hovered row alone breaks the agreement between rows.
    expect(offers(await everyRow(taken, 'hoveredOnly'))).toEqual([false, true, true]);
  });
});

describe('GR11 the door’s kind does not matter: an image or a Mac door’s fragment is taken too', () => {
  const image = (path: string): PathDoorAnswer => ({ door: 'image', path });
  const mac = (path: string): PathDoorAnswer => ({ door: 'mac', path });

  it('a fragment the image door opens keeps its row, and opens through that door', async () => {
    const piece = '.planning/shot.png';
    const whole = FILE.replace(/brainstorming\.md$/, 'shot.png');
    const f: Fixture = {
      rows: ['The plan is written down at', TOP, MIDDLE, `${piece} and /a/other.md`, '', '> '],
      width: 47,
      doors: {
        [whole]: image(whole),
        [piece]: image(`${BASE}/${piece}`),
        '/a/other.md': editor('/a/other.md')
      }
    };
    await readsAsToday(f, [1, 2, 3, 4, 5, 6]);
    expect((await reading(f, 4))?.map((l) => l.text)).toEqual([piece, '/a/other.md']);
    // The shape really joins: with the rule out the whole image is offered.
    expect((await reading(f, 2, 'governingOff'))?.map((l) => l.text)).toEqual([`${TOP}${MIDDLE}${piece}`]);
    expect(await press(f, 4, piece)).toEqual([{ path: `${BASE}/${piece}`, repoPath: BASE }]);
  });

  it('a fragment the Mac door opens keeps its row, and a press hands it to the Mac', async () => {
    // A `~/` piece is the one absolute spelling that can start a lower row
    // below a folder one cell short of the edge (J3 counts `~/`'s two cells),
    // and the real door gives a relative PDF no door at all.
    const folder = '/Users/me/projects/app/docs/';
    const piece = '~/brief.pdf';
    const base = '/Users/me/projects/app';
    const f: Fixture = {
      rows: ['The brief is at', folder, `${piece} now`, '', '> '],
      width: folder.length + 1,
      base,
      doors: {
        [`${folder}${piece}`]: mac(`${folder}${piece}`),
        [piece]: mac('/Users/me/brief.pdf')
      }
    };
    await readsAsToday(f, [1, 2, 3, 4, 5]);
    expect((await reading(f, 3))?.map((l) => l.text)).toEqual([piece]);
    expect((await reading(f, 3, 'governingOff'))?.map((l) => l.text)).toEqual([`${folder}${piece}`]);
    const h = harness(f.rows, f.width, f.doors, base);
    const links = await linksOn(h.provider, 3);
    links?.[0]?.activate(CLICK, links[0].text);
    await settle();
    expect(h.onMac).toEqual(['/Users/me/brief.pdf']);
    expect(h.opened).toEqual([]);
  });
});

describe('GR12 a path broken over rows with cells past the width on its top row opens nothing (his ruled round)', () => {
  const base = '/Users/me/projects/app';
  const tail = 'build/fixtures/facts/manifests/package.json';
  // The door opens the project's own file of the tail's name, and nothing in
  // the other folder: the reverify's worktree case, where a press on the
  // lower rows opened this checkout's file at the path another one printed.
  const doors = { [tail]: editor(`${base}/${tail}`) };
  const rows = (top: string): string[] => ['', top, 'build/fixtures/facts/manifests/package', '.json:134 and the rest follows.', '', '> '];
  for (const [name, top] of [
    ['X2, leftover cells glued onto the top row', 'The plan is written down at /q/tortie/e/A'],
    ['X3, leftover cells a blank cell past the top row', 'The plan is written down at /q/tortie/ zz']
  ] as const) {
    it(`${name}: every row reads as today and no press opens a file`, async () => {
      const f: Fixture = { rows: rows(top), width: 38, doors, base };
      for (let line = 1; line <= f.rows.length; line += 1) {
        sw.mode = 'joinOff';
        let today: Drawn;
        try {
          today = drawnOf(await linksOn(harness(f.rows, f.width, f.doors, base).provider, line));
        } finally {
          sw.mode = 'on';
        }
        expect(await reading(f, line), `line ${String(line)}`).toEqual(today);
      }
      for (const line of [3, 4]) {
        expect(await press(f, line, 'build/'), `line ${String(line)}`).toEqual([]);
        expect(await press(f, line, '.json'), `line ${String(line)}`).toEqual([]);
      }
      // ...and the two rows below, with nothing past the width above them,
      // are RELATIVE, so they open nothing either (J10, his absolute-only
      // round): the row-above clause's control is the absolute twin below.
      const alone: Fixture = { rows: ['x', ...f.rows.slice(2)], width: 38, doors, base };
      for (const line of [2, 3]) expect(await pressEvery(alone, line), `line ${String(line)}`).toEqual([]);
    });
  }

  it('the absolute twin: every row reads as today below a row past the width, and the clean rows open the file', async () => {
    // Rule 17's `j9a-row-above`: `/r/aaa-` above `bbb.md now` at 10 columns.
    const whole = '/r/aaa-bbb.md';
    const stale: Fixture = {
      rows: ['x', 'Plan:' + ' '.repeat(5) + ' zz', '/r/aaa-', 'bbb.md now', 'y'],
      width: 10,
      doors: { [whole]: editor(whole) },
      base
    };
    await everyRowAsToday(stale);
    for (let line = 1; line <= stale.rows.length; line += 1) {
      expect(await pressEvery(stale, line), `line ${String(line)}`).toEqual([]);
    }
    const clean: Fixture = { ...stale, rows: ['x', 'Plan:', '/r/aaa-', 'bbb.md now', 'y'] };
    for (const line of [3, 4]) {
      expect(await pressEvery(clean, line), `line ${String(line)}`).toEqual([{ path: whole, repoPath: base }]);
    }
  });
});

describe('GR13 J10: the relative tail of a path printed into another worktree opens nothing (his ruling of 2026-10-14)', () => {
  // The reverify's E1: an agent printed a path into ANOTHER worktree of this
  // repository, broken at 46 columns. At 47 J3 stops the walk above `src/`,
  // and the two rows below read `src/main/__tests__/menu-popup-template.test.ts:38`,
  // which resolves against THIS project: HEAD opened its own copy there,
  // where the parent opened nothing.
  const base = '/Users/me/projects/tortie';
  const tail = 'src/main/__tests__/menu-popup-template.test.ts';
  const other = `/private/tmp/wt-p3471-parent-rv2/${tail}`;
  const rows = [
    '',
    '⏺ Updated /private/tmp/wt-p3471-parent-rv2/',
    '  src/main/__tests__/menu-popup-',
    '  template.test.ts:38 and ran the tests.',
    '',
    '> '
  ];

  it('at 47, with a door that opens this project’s copy and nothing in the other folder, every row reads as today and no press opens a file', async () => {
    const f: Fixture = { rows, width: 47, base, doors: { [tail]: editor(`${base}/${tail}`) } };
    await everyRowAsToday(f);
    for (let line = 1; line <= rows.length; line += 1) {
      expect(await pressEvery(f, line), `line ${String(line)}`).toEqual([]);
    }
  });

  it('at 46, with a door that opens the other worktree’s file, the whole path opens it at line 38 from every row', async () => {
    const f: Fixture = {
      rows,
      width: 46,
      base,
      doors: { [tail]: editor(`${base}/${tail}`), [other]: editor(other) }
    };
    for (const line of [2, 3, 4]) {
      expect(await pressEvery(f, line), `line ${String(line)}`).toEqual([{ path: other, repoPath: base, line: 38 }]);
    }
  });
});

describe('GR14 J11: a chain a breaker that cuts anywhere left at either end opens nothing, though both names exist', () => {
  const base = '/Users/me/projects/tortie';
  const cases: {
    name: string;
    rows: string[];
    width: number;
    names: string[];
    /** The same rows with one row one cell shorter or longer, which join and open. */
    control?: { row: number; text: string; opens: string; lines: number[] };
  }[] = [
    {
      name: 'the reverify’s nit at 38, cut at both ends (answer.hard beside answer.hard13)',
      rows: ['', 'I updated the test in /private', '/tmp/wt-p3471-parent-rv2/docs/', 'research/assets/58/answer.hard', '13:60 today.', '', '> '],
      width: 38,
      names: [
        '/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard',
        '/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard13',
        '/private/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard13'
      ]
    },
    {
      name: 'index.js at 33, cut mid-name at its bottom (index.js beside index.js.map)',
      rows: ['', 'I updated /Users/me/proj/dist/', 'assets/vendor-chunk-a/index.js', '.map today.', '', '> '],
      width: 33,
      names: [
        '/Users/me/proj/dist/assets/vendor-chunk-a/index.js',
        '/Users/me/proj/dist/assets/vendor-chunk-a/index.js.map',
        '/Users/me/proj/dist/assets/vendor-chunk/index.js'
      ],
      // Two cells SHORTER than the row above (the fix round of his
      // absolute-only round): a cut inside a name lands only at a breaker's
      // limit, and no breaker that drew the row above has its limit here.
      control: {
        row: 2,
        text: 'assets/vendor-chunk/index.js',
        opens: '/Users/me/proj/dist/assets/vendor-chunk/index.js',
        lines: [2, 3]
      }
    },
    {
      name: 'nightly-build at 32, cut just before a / at its top (the screen names /Users/me/proj/tmp/…)',
      rows: ['', 'I saved it to /Users/me/proj', '/tmp/run-logs/nightly-build-', 'output.log today.', '', '> '],
      width: 32,
      names: [
        '/tmp/run-logs/nightly-build-output.log',
        '/Users/me/proj/tmp/run-logs/nightly-build-output.log'
      ],
      // Five cells short of the widest row, so `/tmp` would have fitted on it
      // (the fix round of his absolute-only round; one cell short is a cut a
      // breaker that breaks before a `/` may have made).
      control: {
        row: 1,
        text: 'I saved it to /Users/me',
        opens: '/tmp/run-logs/nightly-build-output.log',
        lines: [3, 4]
      }
    },
    // THE FIX ROUND OF HIS ABSOLUTE-ONLY ROUND: the attack lens's shapes,
    // through the shipping provider, with the cut's name and the printed
    // name both on disk.
    {
      name: 'cmd.hard at 45 by a hyphen-aware cutter (Rust textwrap), the row above ending after `-` short of the limit',
      rows: ['', '⏺ Updated /private/tmp/wt-p3471-parent-', '  attack/docs/research/assets/58/cmd.hard', '  13:62 and ran the tests.', '', '> '],
      width: 45,
      names: [
        '/private/tmp/wt-p3471-parent-attack/docs/research/assets/58/cmd.hard',
        '/private/tmp/wt-p3471-parent-attack/docs/research/assets/58/cmd.hard13'
      ]
    },
    {
      name: 'a home alone at the end of the row above (`~` above `/tmp/…`)',
      rows: ['', 'I wrote the build log to ~', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log today.', '', '> '],
      width: 34,
      names: ['/tmp/p3471atk/run-logs/nightly-build-output.log', '~/tmp/p3471atk/run-logs/nightly-build-output.log']
    },
    {
      name: 'a URL’s host at the end of the row above',
      rows: ['', 'See https://example.com', '/tmp/p3471atk/run-logs/nightly-', 'build-output.log for the log.', '', '> '],
      width: 34,
      names: ['/tmp/p3471atk/run-logs/nightly-build-output.log']
    },
    {
      name: 'a terminal soft wrap whose row ends in `]` right before `/`',
      rows: ['', 'Edited ~/h/pages/[slug]', '/tmp/p3471atk/run-logs/', 'nightly-build-output.lo', 'g now', '', '> '],
      width: 23,
      names: ['/tmp/p3471atk/run-logs/nightly-build-output.log', '~/h/pages/[slug]/tmp/p3471atk/run-logs/nightly-build-output.log']
    }
  ];
  for (const c of cases) {
    it(`${c.name}: every row reads as today and no press opens a file`, async () => {
      const doors = Object.fromEntries(c.names.map((n) => [n, editor(n)]));
      const f: Fixture = { rows: c.rows, width: c.width, base, doors };
      await everyRowAsToday(f);
      for (let line = 1; line <= c.rows.length; line += 1) {
        expect(await pressEvery(f, line), `line ${String(line)}`).toEqual([]);
      }
      // The fixture is not vacuous: the one-cell control joins and opens
      // through the same provider and door (a column decides, not the text).
      const ctl = c.control;
      if (ctl !== undefined) {
        const control: Fixture = { ...f, rows: c.rows.map((r, k) => (k === ctl.row ? ctl.text : r)) };
        for (const line of ctl.lines) {
          expect(await pressEvery(control, line), `control line ${String(line)}`).toEqual([
            { path: ctl.opens, repoPath: base }
          ]);
        }
      }
    });
  }
});
