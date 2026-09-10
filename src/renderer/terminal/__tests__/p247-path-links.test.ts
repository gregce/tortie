/**
 * PHASE 247 — the link provider, driven without an Electron, a pane or a real
 * xterm.
 *
 * The provider is a class over injected dependencies, so what it offers, what
 * it refuses and how many times it asks main are all readable directly. The
 * fake buffer answers rows the way xterm does: `translateToString(true)` with
 * trailing whitespace removed, and `getLine` 0-based against a
 * `provideLinks` line number that is 1-based.
 */

import { describe, expect, it } from 'vitest';
import type { ILink } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import type { PathLinkDeps } from '../path-links';
import { macOpenFailedToast, paneIsLocal, PathLinkProvider } from '../path-links';

/**
 * A buffer of rows, shaped as much of xterm's API as the provider touches.
 *
 * IT ANSWERS CELLS AS WELL AS A STRING, because the provider builds its range
 * in CELL COLUMNS and not in string indices (Phase 247 fix round). One cell
 * per CODE POINT, which is the shape that makes an emoji a single cell holding
 * two UTF-16 units, and a width of 2 for anything in the wide ranges below —
 * so an ASCII row maps one to one and a decorated one does not. The gate's
 * rule 11 is the same property against a REAL xterm buffer; this is what
 * `npm test` can hold.
 */
function cellsOf(row: string): { chars: string; width: number }[] {
  const out: { chars: string; width: number }[] = [];
  for (const chars of row) {
    const cp = chars.codePointAt(0) ?? 0;
    // A variation selector or a combining mark JOINS the cell before it, which
    // is what makes `⚠️` one cell holding two UTF-16 units — the ordinary
    // agent-output shape that moves the column by -1.
    const joins =
      (cp >= 0xfe00 && cp <= 0xfe0f) ||
      (cp >= 0x0300 && cp <= 0x036f) ||
      cp === 0x200d;
    const last = out[out.length - 1];
    if (joins && last !== undefined) {
      last.chars += chars;
      continue;
    }
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xff00 && cp <= 0xff60);
    out.push({ chars, width: wide ? 2 : 1 });
  }
  return out;
}

function fakeLine(row: string): unknown {
  const cells = cellsOf(row);
  const at: { chars: string; width: number }[] = [];
  for (const cell of cells) {
    at.push(cell);
    for (let i = 1; i < cell.width; i += 1) at.push({ chars: '', width: 0 });
  }
  return {
    length: at.length,
    translateToString: () => row,
    getCell: (x: number) => {
      const cell = at[x];
      return cell === undefined
        ? undefined
        : { getChars: () => cell.chars, getWidth: () => cell.width };
    }
  };
}

/**
 * PHASE 250. `cols` is the pane's width, which refusal 8 now asks about
 * instead of the row's last glyph, and 80 is wider than every fixture row
 * here — so a row that merely ENDS in a path is offered and the two rows that
 * really reach the width say so by naming their own length.
 */
function fakeTerm(
  rows: string[],
  cols = 80
): { buffer: { active: unknown }; cols: number } {
  return {
    cols,
    buffer: {
      active: {
        getLine: (y: number) =>
          rows[y] === undefined ? undefined : fakeLine(rows[y] as string)
      }
    }
  };
}

interface Harness {
  provider: PathLinkProvider;
  asked: string[][];
  /** PHASE 250: the base every ask carried, in order. */
  bases: string[];
  opened: { path: string; repoPath: string; line?: number }[];
  mac: string[];
  clock: { at: number };
}

function harness(
  rows: string[],
  doors: Record<string, PathDoorAnswer>,
  over: Partial<PathLinkDeps> = {},
  cols = 80
): Harness {
  const asked: string[][] = [];
  const bases: string[] = [];
  const opened: Harness['opened'] = [];
  const mac: string[] = [];
  const clock = { at: 1_000 };
  const deps: PathLinkDeps = {
    isLocal: () => true,
    repoPath: () => '/Users/gdc/gmux',
    classify: async (paths, base) => {
      asked.push(paths);
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
    openOnMac: async (path) => {
      mac.push(path);
    },
    ...over
  };
  return {
    provider: new PathLinkProvider(
      fakeTerm(rows, cols) as never,
      deps,
      () => clock.at
    ),
    asked,
    bases,
    opened,
    mac,
    clock
  };
}

/**
 * The vitest environment here is `node`, so there is no `MouseEvent`. The
 * provider never reads the event, which is why a stand-in is enough and why
 * saying so is better than pulling a DOM in for one argument.
 */
const CLICK = {} as MouseEvent;

/** Let the click's own round trips settle. */
const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const linksOn = async (
  provider: PathLinkProvider,
  y: number
): Promise<ILink[] | undefined> =>
  new Promise((resolve) => {
    provider.provideLinks(y, resolve);
  });

describe('what the provider offers', () => {
  it('underlines a path that reaches a door, and nothing else on the row', async () => {
    const { provider } = harness(
      ['wrote /a/b.md and /a/run.sh for you'],
      {
        '/a/b.md': { door: 'editor', path: '/a/b.md' },
        '/a/run.sh': { door: null, refusal: 'executable-bit' }
      }
    );
    const links = await linksOn(provider, 1);
    expect(links?.map((l) => l.text)).toEqual(['/a/b.md']);
    // xterm's range is 1-based and inclusive at both ends.
    expect(links?.[0]?.range).toEqual({
      start: { x: 7, y: 1 },
      end: { x: 13, y: 1 }
    });
  });

  it('offers nothing at all on a pane whose session runs on another machine', async () => {
    const { provider, asked } = harness(
      ['wrote /a/b.md for you'],
      { '/a/b.md': { door: 'editor', path: '/a/b.md' } },
      { isLocal: () => false }
    );
    expect(await linksOn(provider, 1)).toBeUndefined();
    // ...and main is not even asked, so a remote pane costs nothing either.
    expect(asked).toEqual([]);
  });

  it('offers nothing when every span on the row is refused', async () => {
    const { provider } = harness(['ran /a/run.sh twice'], {
      '/a/run.sh': { door: null, refusal: 'executable-bit' }
    });
    expect(await linksOn(provider, 1)).toBeUndefined();
  });

  it('asks main nothing for a row with no path-shaped token on it', async () => {
    const { provider, asked } = harness(['all done, 171/383 complete'], {});
    expect(await linksOn(provider, 1)).toBeUndefined();
    expect(asked).toEqual([]);
  });

  /**
   * PHASE 250's lift one, driven through the provider: the operator's own
   * first screenshot is a path at the end of a line in a pane far wider than
   * the line.
   */
  it('offers a span that merely ENDS its row (Phase 250 lift one)', async () => {
    const { provider } = harness(['wrote /a/b.md'], {
      '/a/b.md': { door: 'editor', path: '/a/b.md' }
    });
    expect((await linksOn(provider, 1))?.map((l) => l.text)).toEqual(['/a/b.md']);
  });

  it('refuses the same span when its last cell is the pane’s last column', async () => {
    const { provider } = harness(
      ['wrote /a/b.md'],
      { '/a/b.md': { door: 'editor', path: '/a/b.md' } },
      {},
      'wrote /a/b.md'.length
    );
    expect(await linksOn(provider, 1)).toBeUndefined();
  });

  it('reads the row above to decide the head half of refusal 8', async () => {
    const rows = ['wrote /a', '/b.md and more'];
    const { provider } = harness(
      rows,
      { '/b.md': { door: 'editor', path: '/b.md' } },
      {},
      // The predecessor fills its own last column, so the head span below it
      // is a wrap tail and stays refused.
      'wrote /a'.length
    );
    expect(await linksOn(provider, 2)).toBeUndefined();
  });

  /**
   * PHASE 250. The same two rows in a pane the predecessor does NOT fill: the
   * break fell where the row ended rather than at the edge, so nothing was
   * carried over and the head span is offered.
   */
  it('offers the head span when the row above stopped short of the width', async () => {
    const rows = ['wrote /a', '/b.md and more'];
    const { provider } = harness(rows, {
      '/b.md': { door: 'editor', path: '/b.md' }
    });
    expect((await linksOn(provider, 2))?.map((l) => l.text)).toEqual(['/b.md']);
  });
});

describe('what a click does', () => {
  it('opens a Tortie door in Tortie, with the pane’s own project and the :line', async () => {
    const { provider, opened, mac } = harness(['see /a/b.ts:42 there'], {
      '/a/b.ts': { door: 'editor', path: '/a/b.ts' }
    });
    const links = await linksOn(provider, 1);
    links?.[0]?.activate(CLICK, '/a/b.ts:42');
    await settle();
    expect(opened).toEqual([
      { path: '/a/b.ts', repoPath: '/Users/gdc/gmux', line: 42 }
    ]);
    expect(mac).toEqual([]);
  });

  it('sends the Mac door to the Mac and nowhere else', async () => {
    const { provider, opened, mac } = harness(['see /a/paper.pdf there'], {
      '/a/paper.pdf': { door: 'mac', path: '/a/paper.pdf' }
    });
    const links = await linksOn(provider, 1);
    links?.[0]?.activate(CLICK, '/a/paper.pdf');
    await settle();
    expect(mac).toEqual(['/a/paper.pdf']);
    expect(opened).toEqual([]);
  });

  it('asks AGAIN on the click, and does nothing when the answer moved', async () => {
    const doors: Record<string, PathDoorAnswer> = {
      '/a/b.md': { door: 'editor', path: '/a/b.md' }
    };
    const { provider, opened, asked } = harness(['see /a/b.md there'], doors);
    const links = await linksOn(provider, 1);
    // The file is replaced between the underline and the press.
    doors['/a/b.md'] = { door: null, refusal: 'executable-bit' };
    links?.[0]?.activate(CLICK, '/a/b.md');
    await settle();
    expect(asked).toHaveLength(2);
    expect(opened).toEqual([]);
  });

  it('opens where the click’s own answer says, not where the hover said', async () => {
    const doors: Record<string, PathDoorAnswer> = {
      '/a/thing': { door: 'editor', path: '/a/thing' }
    };
    const { provider, opened, mac } = harness(['see /a/thing there'], doors);
    const links = await linksOn(provider, 1);
    doors['/a/thing'] = { door: 'mac', path: '/a/real.pdf' };
    links?.[0]?.activate(CLICK, '/a/thing');
    await settle();
    expect(mac).toEqual(['/a/real.pdf']);
    expect(opened).toEqual([]);
  });

  it('refuses a click on a pane that became remote after the underline was drawn', async () => {
    let local = true;
    const { provider, opened, mac } = harness(
      ['see /a/b.md there'],
      { '/a/b.md': { door: 'editor', path: '/a/b.md' } },
      { isLocal: () => local }
    );
    const links = await linksOn(provider, 1);
    local = false;
    links?.[0]?.activate(CLICK, '/a/b.md');
    await settle();
    expect(opened).toEqual([]);
    expect(mac).toEqual([]);
  });
});

describe('the cache', () => {
  it('asks main once per distinct path however many times a row is hovered', async () => {
    const { provider, asked } = harness(
      ['see /a/b.md and /a/b.md and /a/c.md here'],
      {
        '/a/b.md': { door: 'editor', path: '/a/b.md' },
        '/a/c.md': { door: 'editor', path: '/a/c.md' }
      }
    );
    await linksOn(provider, 1);
    await linksOn(provider, 1);
    await linksOn(provider, 1);
    // Three spans, two distinct paths, and the second hover asks nothing.
    expect(asked.flat().sort()).toEqual(['/a/b.md', '/a/c.md']);
  });

  it('asks again once an entry has expired, so a deleted file stops being a link', async () => {
    const doors: Record<string, PathDoorAnswer> = {
      '/a/b.md': { door: 'editor', path: '/a/b.md' }
    };
    const h = harness(['see /a/b.md there'], doors);
    expect((await linksOn(h.provider, 1))?.length).toBe(1);
    doors['/a/b.md'] = { door: null, refusal: 'missing' };
    h.clock.at += 31_000;
    expect(await linksOn(h.provider, 1)).toBeUndefined();
    expect(h.asked).toHaveLength(2);
  });

  it('draws nothing at all when the bridge is not there', async () => {
    const { provider } = harness(
      ['see /a/b.md there'],
      {},
      {
        classify: () => {
          throw new Error('no bridge');
        }
      }
    );
    expect(await linksOn(provider, 1)).toBeUndefined();
  });
});

describe('the one sentence a person can read', () => {
  it('says what did not happen, and appends main’s prose when there is some', () => {
    expect(macOpenFailedToast('')).toBe('Could not open that file');
    expect(macOpenFailedToast('There is no application set to open it.')).toBe(
      'Could not open that file. There is no application set to open it.'
    );
  });
});

/**
 * THE PHASE 247 FIX ROUND'S TWO FINDINGS, pinned where `npm test` can see them.
 */
describe('the fix round', () => {
  it('draws the underline on the cells the path occupies, not the string indices', async () => {
    // `⚠️ ` is one CELL holding TWO UTF-16 units, so from here on the string
    // index runs one ahead of the column. Measured against the shipping
    // @xterm/xterm 6.0.0: 9 of 14 glyphs a real transcript carries move it.
    const warned = '⚠️ wrote /a/b.md now';
    const wide = '你 wrote /a/b.md now';
    const plain = 'xy wrote /a/b.md now';
    const doors = { '/a/b.md': { door: 'editor', path: '/a/b.md' } as PathDoorAnswer };
    const a = await linksOn(harness([warned], doors).provider, 1);
    const b = await linksOn(harness([wide], doors).provider, 1);
    const control = await linksOn(harness([plain], doors).provider, 1);
    expect(a?.length).toBe(1);
    expect(b?.length).toBe(1);
    expect(control?.length).toBe(1);
    // Both halves of the defect, in one reading each.
    //
    // `⚠️ ` is TWO columns holding THREE units, so the path sits at the SAME
    // string index as the control's and one column to the LEFT of it. `你 `
    // is THREE columns holding TWO, so the path sits one string index EARLIER
    // and in exactly the control's columns. A range built from a string index
    // is wrong on both, in opposite directions.
    expect(warned.indexOf('/a/b.md')).toBe(9);
    expect(wide.indexOf('/a/b.md')).toBe(8);
    expect(plain.indexOf('/a/b.md')).toBe(9);
    expect(control?.[0]?.range.start.x).toBe(10);
    expect(control?.[0]?.range.end.x).toBe(16);
    expect(a?.[0]?.range.start.x).toBe(9);
    expect(a?.[0]?.range.end.x).toBe(15);
    expect(b?.[0]?.range).toEqual(control?.[0]?.range);
    // ...and every range is exactly as long as the path it underlines.
    for (const link of [a, b, control]) {
      const range = link?.[0]?.range;
      expect((range?.end.x ?? 0) - (range?.start.x ?? 0) + 1).toBe('/a/b.md'.length);
    }
  });

  it('refuses a pane with no session row, which "?.machine === undefined" did not', () => {
    expect(paneIsLocal({ machine: undefined })).toBe(true);
    expect(paneIsLocal({ machine: { id: 'macpro' } })).toBe(false);
    // The one that shipped the other way. `undefined?.machine` is `undefined`,
    // so the predicate read TRUE for a pane whose row had not arrived.
    expect(paneIsLocal(undefined)).toBe(false);
  });

  it('never asks main about a relative spelling on a pane with no base', async () => {
    const h = harness(['see src/main/fs/ipc.ts and ./a/b.md now'], {}, {
      // A pane whose session carries no project — the shape `repoPath()`
      // answers '' for.
      repoPath: () => ''
    });
    expect(await linksOn(h.provider, 1)).toBeUndefined();
    expect(h.asked).toEqual([]);
  });
});

/**
 * PHASE 250 LIFT TWO, at the provider. The join itself is main's and the
 * pure decision's; what this file owns is that the base is READ PER HOVER,
 * carried to main, and part of the cache key.
 */
describe('a relative path and the pane’s own base', () => {
  it('asks main about a relative spelling and hands it the base', async () => {
    const h = harness(['wrote docs/notes.md for you'], {
      'docs/notes.md': {
        door: 'editor',
        path: '/Users/gdc/gmux/docs/notes.md'
      }
    });
    const links = await linksOn(h.provider, 1);
    expect(links?.map((l) => l.text)).toEqual(['docs/notes.md']);
    expect(h.asked).toEqual([['docs/notes.md']]);
    expect(h.bases).toEqual(['/Users/gdc/gmux']);
  });

  it('opens the file MAIN resolved, and the tab’s repo is that same base', async () => {
    const h = harness(['see docs/notes.md:12 there'], {
      'docs/notes.md': {
        door: 'editor',
        path: '/Users/gdc/gmux/docs/notes.md'
      }
    });
    const links = await linksOn(h.provider, 1);
    links?.[0]?.activate(CLICK, 'docs/notes.md:12');
    await settle();
    expect(h.opened).toEqual([
      {
        path: '/Users/gdc/gmux/docs/notes.md',
        repoPath: '/Users/gdc/gmux',
        line: 12
      }
    ]);
  });

  /**
   * The same spelling under two bases is two different files, so a cached
   * answer from one pane's project may never be handed to another's.
   */
  it('keys a relative answer by its base', async () => {
    let base = '/Users/gdc/gmux';
    const h = harness(
      ['wrote docs/notes.md for you'],
      {
        'docs/notes.md': {
          door: 'editor',
          path: `${base}/docs/notes.md`
        }
      },
      { repoPath: () => base }
    );
    await linksOn(h.provider, 1);
    expect(h.asked).toHaveLength(1);
    // The same hover again is the cache doing its job.
    await linksOn(h.provider, 1);
    expect(h.asked).toHaveLength(1);
    // ...and the same spelling under a different base is asked afresh.
    base = '/Users/gdc/rookery';
    await linksOn(h.provider, 1);
    expect(h.asked).toHaveLength(2);
    expect(h.bases).toEqual(['/Users/gdc/gmux', '/Users/gdc/rookery']);
  });

  it('keys an ABSOLUTE spelling by itself, exactly as Phase 247 did', async () => {
    let base = '/Users/gdc/gmux';
    const h = harness(
      ['wrote /a/b.md for you'],
      { '/a/b.md': { door: 'editor', path: '/a/b.md' } },
      { repoPath: () => base }
    );
    await linksOn(h.provider, 1);
    base = '/Users/gdc/rookery';
    await linksOn(h.provider, 1);
    expect(h.asked).toHaveLength(1);
  });
});
