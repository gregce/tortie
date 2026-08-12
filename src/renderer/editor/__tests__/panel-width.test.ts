/**
 * The editor's width rules, as arithmetic.
 *
 * Two of them are load-bearing for Phase 18 and neither had a test:
 *
 *  1. **Persist intent, clamp presentation.** The stored per-project width is
 *     the user's choice and is never rewritten to fit a smaller window — the
 *     panel renders `min(stored, max)`. If a shrinking window ever wrote the
 *     clamped value back, growing the window again would leave the file at
 *     someone else's width, silently and permanently.
 *  2. **The JSON is user-writable.** `gmux.editorWidth` is a localStorage blob
 *     a person can hand-edit; a NaN or a 12 reaching the layout is a divider
 *     that cannot be grabbed, and (before the terminal floor) was a route to
 *     the 2-column reflow.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  EDITOR_MIN,
  editorIsOverlay,
  SPLIT_MIN_WORK_AREA,
  TERMINAL_FLOOR
} from '../../state/chrome-geometry';
import {
  defaultEditorWidth,
  loadEditorWidths,
  renderedEditorWidth,
  sanitizeEditorWidths,
  saveEditorWidths,
  setStoredEditorWidth
} from '../panel-width';

// The renderer tests run in node; localStorage is the one browser API this
// module touches, so it gets the smallest possible stand-in.
class MemoryStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

function withStorage(seed?: string): void {
  const storage = new MemoryStorage();
  if (seed !== undefined) storage.setItem('gmux.editorWidth', seed);
  (globalThis as { localStorage?: unknown }).localStorage = storage;
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('sanitizeEditorWidths', () => {
  it('keeps a plausible per-project width verbatim', () => {
    expect(sanitizeEditorWidths({ '/repo': 620 })).toEqual({ '/repo': 620 });
  });

  it('drops entries that are not finite numbers', () => {
    expect(
      sanitizeEditorWidths({
        '/a': Number.NaN,
        '/b': Number.POSITIVE_INFINITY,
        '/c': '640',
        '/d': null,
        '/e': 640
      })
    ).toEqual({ '/e': 640 });
  });

  it('clamps a hand-edited width into a range the panel can be laid out at', () => {
    expect(sanitizeEditorWidths({ '/a': 12, '/b': 99999 })).toEqual({
      '/a': EDITOR_MIN,
      '/b': 8192
    });
  });

  it('rounds, so a fractional width never reaches a layout', () => {
    expect(sanitizeEditorWidths({ '/a': 640.4 })).toEqual({ '/a': 640 });
  });

  it('answers {} for anything that is not an object of widths', () => {
    expect(sanitizeEditorWidths(null)).toEqual({});
    expect(sanitizeEditorWidths([600])).toEqual({});
    expect(sanitizeEditorWidths('600')).toEqual({});
  });
});

describe('loadEditorWidths', () => {
  it('sanitizes what it reads back', () => {
    withStorage(JSON.stringify({ '/a': 10, '/b': 700, '/c': 'wide' }));
    expect(loadEditorWidths()).toEqual({ '/a': EDITOR_MIN, '/b': 700 });
  });

  it('survives corrupt JSON rather than taking the panel down with it', () => {
    withStorage('{not json');
    expect(loadEditorWidths()).toEqual({});
  });

  it('round-trips through save', () => {
    withStorage();
    saveEditorWidths({ '/repo': 512 });
    expect(loadEditorWidths()).toEqual({ '/repo': 512 });
    setStoredEditorWidth('/other', 700);
    expect(loadEditorWidths()).toEqual({ '/repo': 512, '/other': 700 });
  });
});

describe('renderedEditorWidth — persist intent, clamp presentation', () => {
  const WORK = 1392; // 1440 window, no sidebar, sessions on top

  it('lays out the stored width when it fits', () => {
    expect(renderedEditorWidth(700, WORK)).toBe(700);
  });

  it('clamps a too-wide intent to leave the terminal its floor', () => {
    expect(renderedEditorWidth(9000, WORK)).toBe(WORK - TERMINAL_FLOOR);
  });

  it('returns the SAME width once the room is back — intent is not rewritten', () => {
    const intent = 900;
    const cramped = renderedEditorWidth(intent, 800);
    expect(cramped).toBeLessThan(intent);
    expect(renderedEditorWidth(intent, WORK)).toBe(intent);
  });

  it('holds the panel floor while the row can afford it', () => {
    expect(renderedEditorWidth(100, WORK)).toBe(EDITOR_MIN);
    // The narrowest row that seats both the panel floor and the terminal
    // floor — the panel gets exactly its minimum and not a pixel more.
    expect(renderedEditorWidth(100, SPLIT_MIN_WORK_AREA)).toBe(EDITOR_MIN);
  });

  /**
   * The fix round's correction, and it reverses what this test used to say
   * ("never under its floor, HOWEVER narrow the row"). That reading is how a
   * 332px row gave the panel its 320px and the terminal 12px — a live tmux
   * pane reflowed to two columns. The panel's floor is a comfort; the
   * terminal's floor is a promise about work in flight, so the terminal wins.
   *
   * In the running app the row never gets here: below SPLIT_MIN_WORK_AREA the
   * panel is an overlay and this width is not laid out at all. Asserted
   * anyway, because the arithmetic must be safe without depending on a
   * caller elsewhere having got its condition right.
   */
  it('yields its floor to the terminal floor in a row that cannot seat both', () => {
    expect(renderedEditorWidth(undefined, 400)).toBe(400 - TERMINAL_FLOOR);
    expect(renderedEditorWidth(5000, 400)).toBe(400 - TERMINAL_FLOOR);
    expect(400 - renderedEditorWidth(undefined, 400)).toBe(TERMINAL_FLOOR);
    expect(editorIsOverlay(1920, 400)).toBe(true);
  });

  it('opens at 45% of the work row, floored at 480', () => {
    expect(defaultEditorWidth(WORK)).toBe(Math.round(WORK * 0.45));
    expect(defaultEditorWidth(900)).toBe(480);
    expect(renderedEditorWidth(undefined, WORK)).toBe(defaultEditorWidth(WORK));
  });

  it('goes past the old 0.65 cap — the whole point of item 2', () => {
    // Phase 17 and earlier: min(stored, 0.65 × center) = 904 at this width.
    expect(renderedEditorWidth(1100, WORK)).toBe(1100);
    expect(1100).toBeGreaterThan(Math.round(WORK * 0.65));
  });
});
