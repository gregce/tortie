/**
 * The home screen update line (Phase 62.1).
 *
 * What these tests hold:
 * - The slot element ALWAYS renders at its one class, and a hidden state
 *   puts no words in it. The column can never shift when words appear.
 * - Every visible stage renders its exact home words and its data-stage.
 * - The line has no click surface on any path. The markup is one p element
 *   and nothing else, so there is nothing to click and no menu to open.
 * - A push wins over the mount read, the disposer unsubscribes, and a mount
 *   read that resolves after the disposer ran is dropped whole.
 * - A missing bridge renders the empty slot rather than throwing.
 *
 * The vitest environment is node, so component assertions read static
 * markup from react-dom/server, and the subscription behavior is driven
 * through connectHomeUpdateLine directly, because effects never fire in a
 * static render. The live probe (build/probe-home-update-line.mjs) drives
 * the mounted wiring on the packaged app.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UpdateUiState } from '@shared/ipc';
import {
  connectHomeUpdateLine,
  HomeUpdateLine,
  HomeUpdateLineView
} from '../HomeUpdateLine';

/** A full UpdateUiState with quiet defaults, overridden per case. */
function state(over: Partial<UpdateUiState>): UpdateUiState {
  return {
    currentVersion: '0.31.0',
    stagedVersion: null,
    lastCheckedAt: null,
    needsUpdateRepair: false,
    ring: 'hidden',
    ringVersion: null,
    ringPercent: null,
    failedDuring: null,
    ...over
  };
}

function view(over: Partial<UpdateUiState>): string {
  return renderToStaticMarkup(<HomeUpdateLineView state={state(over)} />);
}

/** The empty slot, byte for byte. Hidden and missing-bridge render this. */
const EMPTY_SLOT =
  '<p class="home-update-line" role="status" data-stage="hidden"></p>';

/** Install a fake window for the mounted component, torn down after each test. */
function installWindow(gmux: unknown): void {
  (globalThis as { window?: unknown }).window = { gmux };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('the reserved slot', () => {
  it('hidden renders the slot and nothing else', () => {
    expect(view({ ring: 'hidden' })).toBe(EMPTY_SLOT);
  });

  it('a null state renders the same empty slot', () => {
    expect(renderToStaticMarkup(<HomeUpdateLineView state={null} />)).toBe(
      EMPTY_SLOT
    );
  });
});

describe('each stage renders its words', () => {
  const cases: { over: Partial<UpdateUiState>; stage: string; words: string }[] =
    [
      {
        over: { ring: 'checking' },
        stage: 'checking',
        words: 'Checking for updates'
      },
      {
        over: { ring: 'downloading', ringVersion: '0.26.0', ringPercent: 40 },
        stage: 'downloading',
        words: 'Downloading 0.26.0, 40 percent'
      },
      {
        over: { ring: 'staging', ringVersion: '0.26.0' },
        stage: 'staging',
        words: 'Preparing 0.26.0'
      },
      {
        over: { ring: 'ready', ringVersion: '0.26.0' },
        stage: 'ready',
        words: 'Tortie 0.26.0 is ready. It installs when you quit.'
      },
      {
        over: { ring: 'failed', failedDuring: 'checking' },
        stage: 'failed',
        words: 'The update check failed.'
      },
      {
        over: {
          ring: 'failed',
          ringVersion: '0.26.0',
          failedDuring: 'downloading'
        },
        stage: 'failed',
        words: 'The download of 0.26.0 did not finish.'
      },
      {
        over: {
          ring: 'failed',
          ringVersion: '0.26.0',
          failedDuring: 'staging'
        },
        stage: 'failed',
        words: 'Tortie could not prepare 0.26.0.'
      }
    ];

  for (const c of cases) {
    it(`${c.stage} shows "${c.words}"`, () => {
      const markup = view(c.over);
      expect(markup).toBe(
        `<p class="home-update-line" role="status" data-stage="${c.stage}">${c.words}</p>`
      );
    });
  }

  it('no stage adds a click suffix, because nothing here can be clicked', () => {
    expect(view({ ring: 'ready', ringVersion: '0.26.0' })).not.toContain(
      'Click to'
    );
    expect(view({ ring: 'failed', failedDuring: 'checking' })).not.toContain(
      'Click to'
    );
  });
});

describe('no click surface on any path', () => {
  it('every stage renders one p element and no other tag', () => {
    const overs: Partial<UpdateUiState>[] = [
      { ring: 'hidden' },
      { ring: 'checking' },
      { ring: 'downloading', ringVersion: '0.26.0', ringPercent: 40 },
      { ring: 'staging', ringVersion: '0.26.0' },
      { ring: 'ready', ringVersion: '0.26.0' },
      { ring: 'failed', failedDuring: 'checking' }
    ];
    for (const over of overs) {
      const markup = view(over);
      const tags = [...markup.matchAll(/<([a-z]+)/g)].map((m) => m[1]);
      expect(tags).toEqual(['p']);
      expect(markup).not.toContain('<button');
      expect(markup).not.toContain('role="menu"');
    }
  });
});

describe('the subscription, driven directly', () => {
  it('the mount read draws the line when no push has arrived', async () => {
    const seen: UpdateUiState[] = [];
    const off = vi.fn();
    const dispose = connectHomeUpdateLine(
      {
        state: async () => state({ ring: 'checking' }),
        onChanged: () => off
      },
      (s) => seen.push(s)
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(seen.map((s) => s.ring)).toEqual(['checking']);
    dispose();
  });

  it('a push wins over the mount read', async () => {
    let resolveRead: (s: UpdateUiState) => void = () => {};
    const read = new Promise<UpdateUiState>((r) => {
      resolveRead = r;
    });
    let push: (s: UpdateUiState) => void = () => {};
    const seen: UpdateUiState[] = [];
    const dispose = connectHomeUpdateLine(
      {
        state: () => read,
        onChanged: (cb) => {
          push = cb;
          return () => {};
        }
      },
      (s) => seen.push(s)
    );
    // The push lands first, then the slow mount read answers with an older
    // truth. The stale answer must be dropped whole.
    push(state({ ring: 'downloading', ringVersion: '0.26.0', ringPercent: 3 }));
    resolveRead(state({ ring: 'hidden' }));
    await read;
    await Promise.resolve();
    expect(seen.map((s) => s.ring)).toEqual(['downloading']);
    dispose();
  });

  it('the disposer unsubscribes and drops a late mount read', async () => {
    let resolveRead: (s: UpdateUiState) => void = () => {};
    const read = new Promise<UpdateUiState>((r) => {
      resolveRead = r;
    });
    const off = vi.fn();
    const seen: UpdateUiState[] = [];
    const dispose = connectHomeUpdateLine(
      { state: () => read, onChanged: () => off },
      (s) => seen.push(s)
    );
    dispose();
    expect(off).toHaveBeenCalledTimes(1);
    resolveRead(state({ ring: 'ready', ringVersion: '0.32.0' }));
    await read;
    await Promise.resolve();
    expect(seen).toEqual([]);
  });

  it('a rejected mount read draws nothing and does not throw', async () => {
    const seen: UpdateUiState[] = [];
    const dispose = connectHomeUpdateLine(
      {
        state: () => Promise.reject(new Error('no answer')),
        onChanged: () => () => {}
      },
      (s) => seen.push(s)
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toEqual([]);
    dispose();
  });

  it('a push after disposal is dropped', () => {
    let push: (s: UpdateUiState) => void = () => {};
    const seen: UpdateUiState[] = [];
    const dispose = connectHomeUpdateLine(
      {
        state: async () => state({}),
        onChanged: (cb) => {
          push = cb;
          return () => {};
        }
      },
      (s) => seen.push(s)
    );
    dispose();
    push(state({ ring: 'checking' }));
    expect(seen).toEqual([]);
  });
});

describe('a missing bridge', () => {
  it('renders the empty slot when window.gmux is absent', () => {
    installWindow(undefined);
    expect(renderToStaticMarkup(<HomeUpdateLine />)).toBe(EMPTY_SLOT);
  });

  it('renders the empty slot when the updates extras are missing', () => {
    installWindow({ popupMenu: async () => null, updates: {} });
    expect(renderToStaticMarkup(<HomeUpdateLine />)).toBe(EMPTY_SLOT);
  });

  it('renders the empty slot before main answers, even with a full bridge', () => {
    installWindow({
      popupMenu: async () => null,
      updates: {
        state: async () => state({ ring: 'checking' }),
        onChanged: () => () => {}
      }
    });
    // A static render never runs the effect, so this is the first paint:
    // the reserved slot, empty, at its fixed height.
    expect(renderToStaticMarkup(<HomeUpdateLine />)).toBe(EMPTY_SLOT);
  });
});
