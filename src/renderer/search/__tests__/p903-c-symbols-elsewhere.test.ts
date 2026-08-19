/**
 * Phase 90.3. The symbol palette does not reach another machine, and it says so.
 *
 * THE CONVERSION SITE BEING PROVED. `openPalette` takes the PAIR and asks
 * `localPathOf` for a folder. A project on another machine yields null, so the
 * store is never filled under such a tab: `repoPath` stays null, no index is
 * asked for, and no build is started. The symbol index is built from files on
 * this Mac, and a path from another computer names a different file here or
 * none at all.
 *
 * THE PALETTE STILL OPENS. An empty list would read as a project with no
 * symbols, which is a different and wrong conclusion, and it is the same rule
 * the cold index case has followed since Phase 14.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn(async () => ({
  hits: [],
  indexing: false,
  indexed: 0,
  total: 0,
  cold: false
}));
const ensure = vi.fn(async () => undefined);

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  setTimeout,
  clearTimeout,
  gmux: { symbols: { query, ensure, onProgress: () => () => undefined } }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../../state/store');
const { useSymbols } = await import('../symbols-store');

const HERE = { id: 'p1', path: '/Users/gdc/gmux', name: 'gmux' };
const THERE = {
  id: 'p2',
  path: '/Users/gdc/gmux',
  name: 'gmux',
  machineId: 'studio'
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  query.mockClear();
  ensure.mockClear();
  useSymbols.setState({ open: false, hits: [], elsewhere: null, repoPath: null });
  useApp.setState({
    projects: [HERE, THERE],
    activeProjectId: HERE.id,
    machineStates: [
      { id: 'studio', label: 'Studio', color: 'blue', link: 'connected' }
    ]
  } as never);
});

describe('a project on this Mac', () => {
  it('opens, names the folder and starts the index', async () => {
    useSymbols.getState().openPalette();
    await flush();
    expect(useSymbols.getState().repoPath).toBe('/Users/gdc/gmux');
    expect(useSymbols.getState().elsewhere).toBeNull();
    expect(ensure).toHaveBeenCalledWith('/Users/gdc/gmux');
    expect(query).toHaveBeenCalled();
  });
});

describe('a project on another machine', () => {
  beforeEach(() => {
    useApp.setState({ activeProjectId: THERE.id } as never);
  });

  it('opens and says which machine the files are on', () => {
    useSymbols.getState().openPalette();
    expect(useSymbols.getState().open).toBe(true);
    expect(useSymbols.getState().elsewhere).toBe('Studio');
  });

  it('asks for no index and starts no build', async () => {
    useSymbols.getState().openPalette();
    await flush();
    expect(useSymbols.getState().repoPath).toBeNull();
    expect(ensure).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('asks for nothing even after the person types', async () => {
    useSymbols.getState().openPalette();
    useSymbols.getState().setQuery('#auth');
    await flush();
    expect(query).not.toHaveBeenCalled();
    expect(useSymbols.getState().hits).toEqual([]);
  });

  it('clears the sentence when the palette closes', () => {
    useSymbols.getState().openPalette();
    useSymbols.getState().close();
    expect(useSymbols.getState().elsewhere).toBeNull();
  });

  it('falls back to the id when Tortie has no row for the machine', () => {
    useApp.setState({ machineStates: [] } as never);
    useSymbols.getState().openPalette();
    expect(useSymbols.getState().elsewhere).toBe('studio');
  });
});
