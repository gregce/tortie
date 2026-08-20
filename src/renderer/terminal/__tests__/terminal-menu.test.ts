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

/**
 * The same session, running on another machine (Phase 96).
 *
 * It carries the SAME `tmuxName`, which is the whole reason the defect was
 * worth fixing: a name is unique on one machine and not across machines, so a
 * verb that searches this Mac's session server by name can find somebody
 * else's session and act on it.
 */
const REMOTE_SESSION: Session = {
  ...SESSION,
  machine: {
    id: 'studio',
    label: 'Studio',
    color: 'magenta',
    answering: true,
    canRestore: false,
    restoreReason: null
  }
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

/**
 * PHASE 96, defect 2. Three items in this menu reach THIS Mac's own session
 * server by name, being the two history presets and Clear. A session on
 * another machine has a live terminal in this window because Tortie is
 * attached to it over the link, so before this phase all three were offered
 * and each one searched the wrong server.
 *
 * The four cases below pin what moved and, in case 4, everything that did not.
 */
describe('a session that runs on another machine', () => {
  it('draws both history presets and an enabled Clear on THIS Mac', () => {
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(SESSION, { selection: null });
    expect(enabled(items, 'Capture Last 250 Lines')).toBe(true);
    expect(enabled(items, 'Capture Last 1,000 Lines')).toBe(true);
    expect(enabled(items, 'Clear')).toBe(true);
  });

  it('draws neither history preset for a session on another machine', () => {
    // Absent rather than disabled: the history they read is not on this Mac at
    // all, so there is nothing here for the item to be about.
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(REMOTE_SESSION, { selection: null });
    expect(enabled(items, 'Capture Last 250 Lines')).toBe('missing');
    expect(enabled(items, 'Capture Last 1,000 Lines')).toBe('missing');
  });

  it('keeps Clear on screen and disables it', () => {
    // Present because the item is a fact about this session. A verb that
    // vanishes from a menu a person knows reads as a bug in the product.
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(REMOTE_SESSION, { selection: null });
    expect(enabled(items, 'Clear')).toBe(false);
  });

  it('leaves every other item exactly as a session on this Mac has it', () => {
    // This is the case that fails if a later round widens the refusal. Each of
    // these reads or photographs the buffer this window is already drawing,
    // which is true whichever machine produced it.
    const selection = { text: 'one\ntwo', position: RANGE };
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    const local = terminalMenuItems(SESSION, { selection });
    unregister();
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const remote = terminalMenuItems(REMOTE_SESSION, { selection });
    for (const label of [
      'New Session…',
      'Split Session',
      'Copy',
      'Copy as HTML',
      'Paste',
      'Select All',
      'Capture Screen',
      'Capture Selection'
    ]) {
      expect([label, enabled(remote, label)]).toEqual([
        label,
        enabled(local, label)
      ]);
    }
  });
});

/**
 * PHASE 100. The one item this phase adds, and the two Phase 96 removals it
 * must not undo.
 *
 * The item reads the last lines of a session on another machine. It is drawn
 * for exactly the set the two history presets are NOT drawn for, so the two
 * rules do not overlap and the capture group is never empty for a remote row.
 */
describe('reading the last lines of a session on another machine', () => {
  it('draws the item for a session on another machine', () => {
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(REMOTE_SESSION, { selection: null });
    expect(enabled(items, 'Read Last Lines…')).toBe(true);
  });

  it('does not draw it for a session on this Mac', () => {
    // Absent rather than disabled. A session on this Mac has a scrollbar, a
    // wheel and the two history presets, so there is nothing for this item to
    // be about.
    unregister = registerTerminal(SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(SESSION, { selection: null });
    expect(enabled(items, 'Read Last Lines…')).toBe('missing');
  });

  it("still draws neither of Phase 96's two removed items", () => {
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const items = terminalMenuItems(REMOTE_SESSION, { selection: null });
    expect(enabled(items, 'Capture Last 250 Lines')).toBe('missing');
    expect(enabled(items, 'Capture Last 1,000 Lines')).toBe('missing');
  });

  it('is drawn even on a build with no capture bridge', () => {
    // It does not touch this window's own buffer, so nothing about it depends
    // on that bridge. With no terminal mounted `canCapture` is false and the
    // capture group is gone, and the item is still there.
    const items = terminalMenuItems(REMOTE_SESSION, { selection: null });
    expect(enabled(items, 'Capture Screen')).toBe('missing');
    expect(enabled(items, 'Read Last Lines…')).toBe(true);
  });

  it('sits after the capture items and before Clear', () => {
    unregister = registerTerminal(REMOTE_SESSION.id, fakeTerminal(null));
    const labels = terminalMenuItems(REMOTE_SESSION, { selection: null })
      .filter((one): one is Exclude<typeof one, 'sep'> => one !== 'sep')
      .map((one) => one.label);
    expect(labels.indexOf('Read Last Lines…')).toBeGreaterThan(
      labels.indexOf('Capture Selection')
    );
    expect(labels.indexOf('Read Last Lines…')).toBeLessThan(
      labels.indexOf('Clear')
    );
  });
});
