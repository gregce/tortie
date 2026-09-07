/**
 * Clear during a selection (Phase 219, item 11), driven through the shipping
 * verbs.
 *
 * WHAT WAS WRONG, AND IT IS A SILENCE. Phase 209's verifier reported that if
 * Clear drops the history while a selection is held, copy does nothing and
 * says nothing. Still true at bd16e36: `clearSession` called `term.clear()`
 * and `bridge.clearHistory()` and never dropped the held range, so
 * `copySelection` composed from a pair of positions in a scrollback that no
 * longer existed, got no text, and took `composed.text.length === 0` to
 * `return false`. Both of its callers, ../menu/terminal-menu.ts and
 * ../keys/index.ts, are `void copySelection(...)`. Nothing was written and
 * nothing was said.
 *
 * TWO THINGS ARE PINNED, and they are the two halves of the fix. The
 * selection VISIBLY GOES with the history it describes, which is the charter's
 * own option and the reason a person is not left pressing Copy into silence.
 * And the residual path, which a server can still reach by dropping a
 * scrollback for its own reasons, SAYS SO instead of failing quietly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { HistoryPos } from '../../scroll/drag-math';

interface Toasted {
  kind: string;
  text: string;
}

const writes: { text: string; html: string }[] = [];
const toasts: Toasted[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    capture: {
      writeRich: (payload: { text: string; html: string }) => {
        writes.push(payload);
        return Promise.resolve();
      },
      clearHistory: () => Promise.resolve()
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: {},
  querySelector: () => null
});
// The colored copy resolves the live terminal theme before it composes, and
// that reads computed custom properties. Every token answers empty, which is
// the shipped fallback path and touches nothing this file is about.
vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));

/** The app store, stubbed down to the two things these verbs reach for. */
vi.mock('../../../state/store', () => ({
  errorText: (e: unknown) => String(e),
  useApp: {
    getState: () => ({
      sessions: [{ id: 'sess-clear', name: 'one', tmuxName: 'gmux-one' }],
      toast: (kind: string, text: string) => {
        toasts.push({ kind, text });
      }
    })
  }
}));

/** The pane's server answers with a scrollback that is gone. */
vi.mock('../history-copy', () => ({
  composeHistorySelection: () => Promise.resolve({ text: '', html: '' })
}));

const { COPY_NOTHING_LEFT, clearSession, copySelection, copySelectionAsHtml } =
  await import('../index');
const { historyRangeToCopy, holdHistorySelection } = await import(
  '../history-selection'
);
const { registerTerminal } = await import('../../drop/registry');

const POS = (line: number): HistoryPos => ({ line, col: 0 });

/** A terminal that records what Clear did to it. */
function recordingTerminal(): {
  term: Terminal;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    term: {
      clear: () => calls.push('clear'),
      clearSelection: () => calls.push('clearSelection'),
      hasSelection: () => false,
      getSelection: () => '',
      getSelectionPosition: () => undefined
    } as unknown as Terminal
  };
}

const ID = 'sess-clear';
let unregister: () => void = () => undefined;

/** A held range, the shape a drag that scrolled the history leaves behind. */
function holdOne(): void {
  holdHistorySelection(ID, {
    start: POS(10),
    end: POS(14),
    cols: 80,
    redraw: () => undefined
  });
}

beforeEach(() => {
  writes.length = 0;
  toasts.length = 0;
  unregister();
  unregister = () => undefined;
  holdHistorySelection(ID, null);
});

describe('Clear while a selection is held', () => {
  it('drops the held range, so nothing points at a history that is gone', async () => {
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    expect(historyRangeToCopy(ID)).not.toBeNull();
    await clearSession(ID, 'gmux-one');
    expect(historyRangeToCopy(ID)).toBeNull();
  });

  it('takes the highlight off the screen too, so a person SEES it go', async () => {
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    await clearSession(ID, 'gmux-one');
    expect(rec.calls).toContain('clearSelection');
    expect(rec.calls).toContain('clear');
  });

  it('clears the highlight BEFORE the screen', async () => {
    // The order is the guarantee that no onSelectionChange fired by clear()
    // can put a range back after the drop.
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    await clearSession(ID, 'gmux-one');
    // Both must be there before the order means anything: an absent call has
    // an index of -1, which sorts before everything and would pass an order
    // check on its own.
    expect(rec.calls).toEqual(['clearSelection', 'clear']);
  });

  it('drops the range even when no terminal is mounted for the session', async () => {
    // The held map is module state and outlives a pane. A drop that depended
    // on the terminal being there would leave one behind on a torn down pane.
    holdOne();
    await clearSession(ID, 'gmux-one');
    expect(historyRangeToCopy(ID)).toBeNull();
  });

  it('leaves nothing on the clipboard, because the person asked for it to go', async () => {
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    await clearSession(ID, 'gmux-one');
    expect(await copySelection(ID)).toBe(false);
    expect(writes).toEqual([]);
  });
});

describe('the residual empty compose, which a server can still reach', () => {
  it('says so rather than failing silently', async () => {
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    // The range survives, and the server answers with nothing: a scrollback
    // dropped for the server's own reasons between the selection and the verb.
    expect(await copySelection(ID)).toBe(false);
    expect(writes).toEqual([]);
    expect(toasts).toEqual([{ kind: 'info', text: COPY_NOTHING_LEFT }]);
  });

  it('says the same thing on the colored copy', async () => {
    const rec = recordingTerminal();
    unregister = registerTerminal(ID, rec.term);
    holdOne();
    await copySelectionAsHtml(ID);
    expect(writes).toEqual([]);
    expect(toasts).toEqual([{ kind: 'info', text: COPY_NOTHING_LEFT }]);
  });

  it('is told as information, not as a fault', () => {
    // Nothing went wrong. The lines are gone, and the words say what happened
    // rather than naming a mechanism.
    expect(COPY_NOTHING_LEFT).toBe('Those lines are no longer in the scrollback.');
    expect(COPY_NOTHING_LEFT.length).toBeLessThanOrEqual(80);
  });
});
