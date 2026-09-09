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
import { macOpenFailedToast, PathLinkProvider } from '../path-links';

/** A buffer of rows, shaped as much of xterm's API as the provider touches. */
function fakeTerm(rows: string[]): { buffer: { active: unknown } } {
  return {
    buffer: {
      active: {
        getLine: (y: number) =>
          rows[y] === undefined
            ? undefined
            : { translateToString: () => rows[y] as string }
      }
    }
  };
}

interface Harness {
  provider: PathLinkProvider;
  asked: string[][];
  opened: { path: string; repoPath: string; line?: number }[];
  mac: string[];
  clock: { at: number };
}

function harness(
  rows: string[],
  doors: Record<string, PathDoorAnswer>,
  over: Partial<PathLinkDeps> = {}
): Harness {
  const asked: string[][] = [];
  const opened: Harness['opened'] = [];
  const mac: string[] = [];
  const clock = { at: 1_000 };
  const deps: PathLinkDeps = {
    isLocal: () => true,
    repoPath: () => '/Users/gdc/gmux',
    classify: async (paths) => {
      asked.push(paths);
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
      fakeTerm(rows) as never,
      deps,
      () => clock.at
    ),
    asked,
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

  it('refuses a span that touches either end of its row (refusal 8)', async () => {
    const { provider } = harness(['wrote /a/b.md'], {
      '/a/b.md': { door: 'editor', path: '/a/b.md' }
    });
    expect(await linksOn(provider, 1)).toBeUndefined();
  });

  it('reads the row above to decide the head half of refusal 8', async () => {
    const rows = ['wrote /a', '/b.md and more'];
    const { provider } = harness(rows, {
      '/b.md': { door: 'editor', path: '/b.md' }
    });
    expect(await linksOn(provider, 2)).toBeUndefined();
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
