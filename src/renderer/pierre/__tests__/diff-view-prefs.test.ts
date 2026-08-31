/**
 * The diff view's two choices, and the refusals a later round could undo in
 * one line (Phase 185).
 *
 * The mode ids are @pierre/diffs' own `LineDiffTypes`, so a typo in one of
 * them is not a type error, it is a mode that silently never applies. And the
 * DEFAULT is a promise: nobody's diffs change under them because this phase
 * shipped. Both are pinned here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INLINE_DIFF_MODE,
  INLINE_DIFF_MODES,
  isInlineDiffMode,
  readDiffBackgrounds,
  readInlineDiffMode,
  writeDiffBackgrounds,
  writeInlineDiffMode
} from '../diff-view-prefs';

/** The exact union @pierre/diffs declares (dist/types.d.ts). */
const PIERRE_MODES = ['word-alt', 'word', 'char', 'none'];

describe('the inline mode table', () => {
  it('offers every mode @pierre/diffs declares, and no invented one', () => {
    expect([...INLINE_DIFF_MODES.map((m) => m.id)].sort()).toEqual(
      [...PIERRE_MODES].sort()
    );
  });

  it('reads Off, Words, Phrases, Characters, in that order', () => {
    expect(INLINE_DIFF_MODES.map((m) => m.label)).toEqual([
      'Off',
      'Words',
      'Phrases',
      'Characters'
    ]);
  });

  it('gives every mode one plain word and one short hint', () => {
    for (const mode of INLINE_DIFF_MODES) {
      expect(mode.label.split(' ')).toHaveLength(1);
      expect(mode.hint.length).toBeLessThanOrEqual(60);
      // House rule: no em or en dash in anything a person reads.
      expect(mode.label + mode.hint).not.toMatch(/[—–]/);
    }
  });

  it('defaults to what shipped before the control existed', () => {
    // If this ever has to change, it changes because somebody decided to move
    // every existing person's diffs, not because a table was reordered.
    expect(DEFAULT_INLINE_DIFF_MODE).toBe('word');
  });

  it('recognises exactly the four ids', () => {
    for (const id of PIERRE_MODES) expect(isInlineDiffMode(id)).toBe(true);
    for (const junk of ['Word', 'words', '', null, undefined, 7, {}]) {
      expect(isInlineDiffMode(junk)).toBe(false);
    }
  });
});

/**
 * A localStorage stand-in, the shape src/renderer/app/__tests__/one-time-tip
 * already uses: the suite runs on the node environment, so there is no real
 * one, and a hand-written double is the only way to make a read or a write
 * THROW, which is the case these two readers exist to survive.
 */
function makeStorage(): {
  store: Map<string, string>;
  api: Pick<Storage, 'getItem' | 'setItem'>;
} {
  const store = new Map<string, string>();
  return {
    store,
    api: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      }
    }
  };
}

describe('the persisted choice', () => {
  let storage = makeStorage();
  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage.api);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips every mode under its own key', () => {
    for (const mode of INLINE_DIFF_MODES) {
      writeInlineDiffMode(mode.id);
      expect(storage.store.get('gmux.diffInlineMode')).toBe(mode.id);
      expect(readInlineDiffMode()).toBe(mode.id);
    }
  });

  it('falls back to the default for a value nothing wrote', () => {
    storage.store.set('gmux.diffInlineMode', 'word-ALT');
    expect(readInlineDiffMode()).toBe(DEFAULT_INLINE_DIFF_MODE);
    storage.store.delete('gmux.diffInlineMode');
    expect(readInlineDiffMode()).toBe(DEFAULT_INLINE_DIFF_MODE);
  });

  it('paints the backgrounds until somebody turns them off', () => {
    expect(readDiffBackgrounds()).toBe(true);
    writeDiffBackgrounds(false);
    expect(storage.store.get('gmux.diffBackgrounds')).toBe('0');
    expect(readDiffBackgrounds()).toBe(false);
    writeDiffBackgrounds(true);
    expect(readDiffBackgrounds()).toBe(true);
  });

  it('survives a storage that throws, because a preference is cosmetic', () => {
    const boom = (): never => {
      throw new Error('storage is unavailable');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
    expect(readInlineDiffMode()).toBe(DEFAULT_INLINE_DIFF_MODE);
    expect(readDiffBackgrounds()).toBe(true);
    expect(() => {
      writeInlineDiffMode('char');
    }).not.toThrow();
    expect(() => {
      writeDiffBackgrounds(false);
    }).not.toThrow();
  });
});
