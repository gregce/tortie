/**
 * Phase 40 item 1 — the session menu decides from the SNAPSHOT.
 *
 * The bug the operator reported: select text, right-click, and Copy as HTML
 * reads as unavailable. xterm's own contextmenu handler had already replaced
 * or destroyed the selection by the time the menu was built, so the live
 * model was the wrong thing to ask. The pane now reads the selection once, at
 * right-click time, and hands it to the menu.
 *
 * These cases pin all three answers: the snapshot wins when there is one, an
 * explicit "nothing was selected" also wins, and the caller that passes no
 * snapshot at all still gets the old live reading, which is what keeps the
 * keyboard path unchanged.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IBufferRange, Terminal } from '@xterm/xterm';
import type { Session } from '@shared/types';

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  gmux: {
    capture: {
      writeRich: () => Promise.resolve(),
      viewport: () => Promise.resolve({ path: null }),
      image: () => Promise.resolve({ path: null }),
      paste: () => Promise.resolve(),
      pane: () => Promise.resolve({ ansi: '' }),
      clearHistory: () => Promise.resolve(),
      saveLast: () => Promise.resolve({ path: null })
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
  querySelector: () => null
});

const { terminalMenuItems } = await import('../terminal-menu');
const { registerTerminal } = await import('../drop/registry');
const { snapshotSelection } = await import('../capture');

const RANGE: IBufferRange = {
  start: { x: 0, y: 10 },
  end: { x: 12, y: 12 }
};

const SESSION: Session = {
  id: 'sess-1',
  name: 'api-refactor',
  tmuxName: 'api-refactor',
  projectPath: '/repo',
  cwd: '/repo',
  agent: 'shell',
  status: 'running',
  createdAt: 0
};

/** A terminal that reports exactly the selection it was built with. */
function fakeTerminal(text: string | null): Terminal {
  return {
    hasSelection: () => text !== null,
    getSelection: () => text ?? '',
    getSelectionPosition: () => (text === null ? undefined : RANGE)
  } as unknown as Terminal;
}

/** Enabled state of one label in a built menu. */
function enabled(
  items: ReturnType<typeof terminalMenuItems>,
  label: string
): boolean | 'missing' {
  const found = items.find((i) => i !== 'sep' && i.label === label);
  if (found === undefined || found === 'sep') return 'missing';
  return found.disabled !== true;
}

let unregister: () => void = () => undefined;

beforeEach(() => {
  unregister();
  unregister = () => undefined;
});

describe('terminalMenuItems with a selection snapshot', () => {
  it('enables Copy and Copy as HTML when the live terminal reports nothing', () => {
    // Exactly the operator's bug: the live model is empty because the right
    // click destroyed the selection, and the snapshot is the truth.
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(SESSION, {
      selection: { text: 'one\ntwo\nthree', position: RANGE }
    });
    expect(enabled(items, 'Copy')).toBe(true);
    expect(enabled(items, 'Copy as HTML')).toBe(true);
    expect(enabled(items, 'Capture Selection')).toBe(true);
  });

  it('disables them when the snapshot says nothing was selected', () => {
    // The caller looked and found nothing, so a live selection that appeared
    // afterwards must not enable a verb that would act on the wrong bytes.
    unregister = registerTerminal(SESSION.id, fakeTerminal('appeared later'));
    const items = terminalMenuItems(SESSION, { selection: null });
    expect(enabled(items, 'Copy')).toBe(false);
    expect(enabled(items, 'Copy as HTML')).toBe(false);
    expect(enabled(items, 'Capture Selection')).toBe(false);
  });
});

describe('terminalMenuItems without a snapshot', () => {
  it('disables the selection verbs when nothing is selected', () => {
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(SESSION, {});
    expect(enabled(items, 'Copy')).toBe(false);
    expect(enabled(items, 'Copy as HTML')).toBe(false);
    expect(enabled(items, 'Capture Selection')).toBe(false);
  });

  it('still reads the live selection, so the keyboard path is unchanged', () => {
    unregister = registerTerminal(SESSION.id, fakeTerminal('live text'));
    const items = terminalMenuItems(SESSION, {});
    expect(enabled(items, 'Copy')).toBe(true);
    expect(enabled(items, 'Copy as HTML')).toBe(true);
    expect(enabled(items, 'Capture Selection')).toBe(true);
  });

  it('disables everything selection-shaped when no terminal is mounted', () => {
    const items = terminalMenuItems(SESSION, {});
    expect(enabled(items, 'Copy')).toBe(false);
    expect(enabled(items, 'Select All')).toBe(false);
    // A saved session has no capture bridge target, so the capture items are
    // absent rather than disabled.
    expect(enabled(items, 'Capture Selection')).toBe('missing');
  });
});

describe('snapshotSelection', () => {
  it('is null when nothing is selected', () => {
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    expect(snapshotSelection(SESSION.id)).toBeNull();
  });

  it('carries the text and the range together', () => {
    unregister = registerTerminal(SESSION.id, fakeTerminal('one\ntwo'));
    expect(snapshotSelection(SESSION.id)).toEqual({
      text: 'one\ntwo',
      position: RANGE
    });
  });
});
