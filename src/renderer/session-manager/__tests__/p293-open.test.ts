/**
 * Phase 293. The sheet's two eager leaves: the door, the layer predicates, the
 * focus reclaim, the give-back and F2's target.
 *
 * What these tests hold:
 *  - `otherLayerOpen` names every layer `modalLayerOpen` names BUT the sheet's
 *    own and the two that always sit UNDER an open sheet, the Catch Me Up page
 *    and the New Session sheet (the fix round, W3), plus both palettes, so the
 *    Session menu's doors are refused under a confirmation, the ⌘J list or a
 *    palette that covers the sheet, and open over the page and the create
 *    sheet as Past Sessions did;
 *  - `leaveSessionManagerFor` closes the sheet, keyboard to nobody, BEFORE it
 *    runs the door (the fix round, W6);
 *  - `reclaimSessionSheetFocus` answers false inside the sheet (where
 *    `trapTabKey` does the wrap), false under a palette (which owns its keys by
 *    the ladder's design) and true from `body`, where it moves the keyboard to
 *    the selected tab;
 *  - the give-back WAITS ONE FRAME after the store write, goes to the element
 *    that held the keyboard at the opening gesture when it still takes it, and
 *    otherwise to `focusTerminal()`; `terminal` and `nobody` do what they say;
 *  - closing the sheet over an open saved-output expansion closes the saved
 *    output too, because `SavedOutputModal` answers null only WHILE the sheet is
 *    open and would otherwise stack the moment it closed;
 *  - F2's target is the focused SHEET row, re-read by id, and only when that
 *    row's own gate allows a rename. It never touches `renamingSessionId`;
 *  - `focusChain` takes the first selector that is connected, enabled and
 *    takes the keyboard;
 *  - both leaves import nothing drawn, so the entry chunk never pulls the sheet.
 *
 * The store, the two palettes and `focusTerminal` are doubles. The vitest
 * environment is node, so `document` is a small fake that knows `closest`,
 * `querySelector` and who holds the keyboard.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';

// ---------------------------------------------------------------------------
// A document small enough to read
// ---------------------------------------------------------------------------

interface FakeEl {
  name: string;
  isConnected: boolean;
  disabled: boolean;
  /** Selectors `closest` answers this element's ancestors for. */
  within: Record<string, FakeEl | null>;
  attrs: Record<string, string>;
  takesFocus: boolean;
  focus(): void;
  closest(selector: string): FakeEl | null;
  getAttribute(name: string): string | null;
}

const BODY = { name: 'body' };
let active: unknown = BODY;
let bySelector: Record<string, FakeEl | undefined> = {};

function el(name: string, patch: Partial<FakeEl> = {}): FakeEl {
  const self: FakeEl = {
    name,
    isConnected: true,
    disabled: false,
    within: {},
    attrs: {},
    takesFocus: true,
    focus() {
      if (self.takesFocus && self.isConnected) active = self;
    },
    closest(selector) {
      return self.within[selector] ?? null;
    },
    getAttribute(attr) {
      return self.attrs[attr] ?? null;
    },
    ...patch
  };
  return self;
}

vi.stubGlobal('document', {
  body: BODY,
  get activeElement() {
    return active;
  },
  querySelector: (selector: string) => bySelector[selector] ?? null
});

let frames: (() => void)[] = [];
vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
  frames.push(fn);
  return frames.length;
});
function flushFrames(): void {
  const run = frames;
  frames = [];
  for (const fn of run) fn();
}

// ---------------------------------------------------------------------------
// The doubles
// ---------------------------------------------------------------------------

interface FakeState {
  confirm: unknown;
  createOpen: boolean;
  newProjectOpen: boolean;
  remoteProjectOpen: boolean;
  shortcutsOpen: boolean;
  attentionOpen: boolean;
  overview: unknown;
  sessionSheet: null | {
    tab: 'managed' | 'past';
    inline: null | { id: string; kind: string; busy?: boolean };
  };
  sessions: Session[];
  pastSessions: Session[];
  restoringIds: Record<string, boolean>;
  handbacks: Record<string, undefined>;
  shellPathReady: boolean;
  renamingSessionId: string | null;
  canRestore(): boolean;
  canDiscard(): boolean;
  openSessionSheet: ReturnType<typeof vi.fn>;
  closeSessionSheet: ReturnType<typeof vi.fn>;
  setSessionSheetInline: ReturnType<typeof vi.fn>;
  closeSavedOutput: ReturnType<typeof vi.fn>;
  setRenaming: ReturnType<typeof vi.fn>;
}

let state: FakeState;
const quickOpen = { open: false };
const symbols = { open: false };
const focusTerminal = vi.fn();

vi.mock('../../state/store', () => ({
  useApp: { getState: () => state },
  effectiveStatusOf: (s: Session) => s.status
}));
vi.mock('../../quickopen/store', () => ({
  useQuickOpen: { getState: () => quickOpen }
}));
vi.mock('../../search/symbols-store', () => ({
  useSymbols: { getState: () => symbols }
}));
vi.mock('../../app/session-focus', () => ({ focusTerminal }));
// The shipping gates when builder C's have landed, and the spec's own formula
// for the one field this file reads when they have not. SPEC 4.1: `canRename`
// is `!unknown && !removed`.
vi.mock('../../state/resume', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return {
    ...real,
    sessionActionGates:
      real['sessionActionGates'] ??
      ((_s: Session, status: SessionStatus) => ({
        canRename: status !== 'unknown' && status !== 'discarded'
      }))
  };
});

const open = await import('../open');

function session(id: string, status: SessionStatus): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p/one',
    cwd: '/p/one',
    agent: 'shell',
    status,
    createdAt: 1
  };
}

beforeEach(() => {
  active = BODY;
  bySelector = {};
  frames = [];
  quickOpen.open = false;
  symbols.open = false;
  focusTerminal.mockClear();
  state = {
    confirm: null,
    createOpen: false,
    newProjectOpen: false,
    remoteProjectOpen: false,
    shortcutsOpen: false,
    attentionOpen: false,
    overview: null,
    sessionSheet: null,
    sessions: [],
    pastSessions: [],
    restoringIds: {},
    handbacks: {},
    shellPathReady: true,
    renamingSessionId: null,
    canRestore: () => true,
    canDiscard: () => true,
    openSessionSheet: vi.fn((tab: 'managed' | 'past') => {
      state.sessionSheet = { tab, inline: null };
    }),
    closeSessionSheet: vi.fn(() => {
      state.sessionSheet = null;
    }),
    setSessionSheetInline: vi.fn(() => true),
    closeSavedOutput: vi.fn(),
    setRenaming: vi.fn()
  };
  // No origin is left behind from the test before: every open from a closed
  // sheet records its own, or records that there was none.
});

const SHEET = el('sheet');
const inSheet = (name: string, patch: Partial<FakeEl> = {}): FakeEl =>
  el(name, { within: { '.session-sheet': SHEET }, ...patch });
const SELECTED_TAB = '.session-sheet [role="tab"][aria-selected="true"]';

// ---------------------------------------------------------------------------

describe('otherLayerOpen and sheetIsTopLayer (Phase 293, SPEC 5.2)', () => {
  it('is false at rest, and false with the sheet alone', () => {
    expect(open.otherLayerOpen()).toBe(false);
    state.sessionSheet = { tab: 'managed', inline: null };
    expect(open.otherLayerOpen()).toBe(false);
    expect(open.sheetIsTopLayer()).toBe(true);
  });

  it.each([
    ['confirm', { title: 'x' }],
    ['newProjectOpen', true],
    ['remoteProjectOpen', true],
    ['shortcutsOpen', true],
    ['attentionOpen', true]
  ] as const)('%s over the sheet is another layer', (field, value) => {
    state.sessionSheet = { tab: 'managed', inline: null };
    (state as unknown as Record<string, unknown>)[field] = value;
    expect(open.otherLayerOpen()).toBe(true);
    expect(open.sheetIsTopLayer()).toBe(false);
  });

  it.each([
    ['createOpen', true],
    ['overview', { level: 'project' }]
  ] as const)('%s is always UNDER an open sheet, which stays the top layer', (field, value) => {
    // The fix round, W3. The page draws under every modal, and nothing opens
    // the create sheet while the sheet is open, so when either is open with
    // the sheet the sheet is above it: the door opens over it, and the
    // keyboard is still pulled back into the sheet.
    (state as unknown as Record<string, unknown>)[field] = value;
    expect(open.otherLayerOpen()).toBe(false);
    state.sessionSheet = { tab: 'managed', inline: null };
    expect(open.otherLayerOpen()).toBe(false);
    expect(open.sheetIsTopLayer()).toBe(true);
  });

  it('either palette over the sheet is another layer', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    quickOpen.open = true;
    expect(open.otherLayerOpen()).toBe(true);
    expect(open.sheetIsTopLayer()).toBe(false);
    quickOpen.open = false;
    symbols.open = true;
    expect(open.otherLayerOpen()).toBe(true);
    expect(open.sheetIsTopLayer()).toBe(false);
  });

  it('a closed sheet is never the top layer', () => {
    expect(open.sheetIsTopLayer()).toBe(false);
  });

  it('names every field modalLayerOpen names but the sheet’s own (source text)', () => {
    const root = resolve(import.meta.dirname, '../..');
    const bodyOf = (source: string, name: string): string => {
      const at = source.indexOf(`function ${name}(`);
      expect(at).toBeGreaterThan(-1);
      const start = source.indexOf('{', source.indexOf(')', at));
      let depth = 0;
      for (let i = start; i < source.length; i += 1) {
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
      throw new Error(`unbalanced braces in ${name}`);
    };
    const code = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
    const modal = code(
      bodyOf(
        readFileSync(resolve(root, 'app/shell-actions.ts'), 'utf8'),
        'modalLayerOpen'
      )
    );
    const other = code(
      bodyOf(
        readFileSync(resolve(root, 'session-manager/open.ts'), 'utf8'),
        'otherLayerOpen'
      )
    );
    const fields = [...modal.matchAll(/\bs\.(\w+)/g)].map((m) => m[1] ?? '');
    // The sheet's own field, and the two that are always under it (the fix
    // round, W3), are the ones `otherLayerOpen` must NOT name; the old Past
    // modal's flag is gone, so it is no longer excused here.
    const own = new Set(['sessionSheet', 'createOpen', 'overview']);
    const others = fields.filter((f) => !own.has(f));
    expect(others.length).toBeGreaterThanOrEqual(5);
    for (const field of others) {
      expect(other, `otherLayerOpen does not name ${field}`).toMatch(
        new RegExp(`\\bs\\.${field}\\b`)
      );
    }
    for (const field of own) {
      expect(other).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(other).toContain('useQuickOpen');
    expect(other).toContain('useSymbols');
  });
});

describe('reclaimSessionSheetFocus (Phase 293, SPEC 2.13 and 5.4)', () => {
  it('answers false while the sheet is closed', () => {
    expect(open.reclaimSessionSheetFocus()).toBe(false);
  });

  it('answers false INSIDE the sheet, where trapTabKey does the wrap', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    const tab = inSheet('tab');
    bySelector[SELECTED_TAB] = tab;
    active = inSheet('search');
    expect(open.reclaimSessionSheetFocus()).toBe(false);
    expect((active as FakeEl).name).toBe('search');
  });

  it('answers false under a palette, which owns its own keys', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    bySelector[SELECTED_TAB] = inSheet('tab');
    quickOpen.open = true;
    expect(open.reclaimSessionSheetFocus()).toBe(false);
    expect(active).toBe(BODY);
  });

  it('from body, moves the keyboard to the selected tab and answers true', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    const tab = inSheet('tab');
    bySelector[SELECTED_TAB] = tab;
    expect(open.reclaimSessionSheetFocus()).toBe(true);
    expect(active).toBe(tab);
  });

  it('from an element BEHIND the scrim, the same', () => {
    state.sessionSheet = { tab: 'past', inline: null };
    const tab = inSheet('tab');
    bySelector[SELECTED_TAB] = tab;
    active = el('a row behind the scrim');
    expect(open.reclaimSessionSheetFocus()).toBe(true);
    expect(active).toBe(tab);
  });

  it('answers true, so Tab is still swallowed, while the chunk is in flight', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    expect(open.reclaimSessionSheetFocus()).toBe(true);
    expect(active).toBe(BODY);
  });
});

describe('reclaimSheetKeyboard: the keyboard back where it was (Phase 293, the fix round)', () => {
  // The press attack's P4: a focused End that turned into Restore under the
  // finger sent the keyboard to the selected tab, and a person in a long list
  // lost their place. And its P1 and P3: a terminal behind the scrim took the
  // keyboard for a moment, and the sheet gave it back to the tab, not to where
  // the person was.
  const TAB = inSheet('tab');
  const nameOf = (id: string): string => `[data-manage-name="${id}"]`;

  beforeEach(() => {
    bySelector[SELECTED_TAB] = TAB;
  });

  it('back to the element that had it, when it is still drawn, enabled and in the sheet', () => {
    const more = inSheet('ellipsis', { attrs: { 'data-manage-more': 'x' } });
    const mark = open.markSheetFocus(more as unknown as HTMLElement);
    active = BODY;
    open.reclaimSheetKeyboard(mark);
    expect(active).toBe(more);
  });

  it('a visible button whose VERB changed since gives the keyboard to its row’s name, never back to the button', () => {
    const primary = inSheet('primary', {
      attrs: { 'data-manage-primary': 'x', 'data-verb': 'end' },
      within: { '.session-sheet': SHEET, '[data-manage-row]': el('row', { attrs: { 'data-manage-row': 'x' } }) }
    });
    const mark = open.markSheetFocus(primary as unknown as HTMLElement);
    expect(mark.row).toBe('x');
    expect(mark.verb).toBe('end');
    primary.attrs['data-verb'] = 'restore';
    const name = inSheet('name of x');
    bySelector[nameOf('x')] = name;
    active = BODY;
    open.reclaimSheetKeyboard(mark);
    expect(active).toBe(name);
  });

  it('a button that went disabled gives the keyboard to its row’s name', () => {
    const primary = inSheet('primary', {
      attrs: { 'data-manage-primary': 'x', 'data-verb': 'end' },
      within: { '.session-sheet': SHEET, '[data-manage-row]': el('row', { attrs: { 'data-manage-row': 'x' } }) }
    });
    const mark = open.markSheetFocus(primary as unknown as HTMLElement);
    primary.disabled = true;
    const name = inSheet('name of x');
    bySelector[nameOf('x')] = name;
    active = BODY;
    open.reclaimSheetKeyboard(mark);
    expect(active).toBe(name);
  });

  it('an element that left the document, with no row, falls to the selected tab', () => {
    const gone = inSheet('panel button');
    const mark = open.markSheetFocus(gone as unknown as HTMLElement);
    gone.isConnected = false;
    active = BODY;
    open.reclaimSheetKeyboard(mark);
    expect(active).toBe(TAB);
  });

  it('a row that left the list too falls to the selected tab', () => {
    const cell = inSheet('check', {
      within: { '.session-sheet': SHEET, '[data-manage-row]': el('row', { attrs: { 'data-manage-row': 'x' } }) }
    });
    const mark = open.markSheetFocus(cell as unknown as HTMLElement);
    cell.isConnected = false;
    active = BODY;
    open.reclaimSheetKeyboard(mark);
    expect(active).toBe(TAB);
  });

  it('with nothing marked, the selected tab', () => {
    active = BODY;
    open.reclaimSheetKeyboard(null);
    expect(active).toBe(TAB);
  });
});

describe('the door and the give-back (Phase 293, SPEC 2.13 and 5.5)', () => {
  it('opens on the asked tab', () => {
    open.openSessionManager('past');
    expect(state.openSessionSheet).toHaveBeenCalledWith('past');
    expect(state.sessionSheet?.tab).toBe('past');
  });

  it('gives the keyboard back to where it was, ONE FRAME after the close', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('search');
    open.closeSessionManager();
    expect(state.closeSessionSheet).toHaveBeenCalledTimes(1);
    // Not yet: the sheet is still drawn in this task.
    expect((active as FakeEl).name).toBe('search');
    flushFrames();
    expect(active).toBe(origin);
    expect(focusTerminal).not.toHaveBeenCalled();
  });

  it('falls to focusTerminal when the origin has left the document', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    origin.isConnected = false;
    open.closeSessionManager();
    flushFrames();
    expect(focusTerminal).toHaveBeenCalledTimes(1);
  });

  it('falls to focusTerminal when the origin refuses the keyboard', () => {
    const origin = el('hidden row', { takesFocus: false });
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('search');
    open.closeSessionManager();
    flushFrames();
    expect(focusTerminal).toHaveBeenCalledTimes(1);
  });

  it('falls to focusTerminal when the gesture began on body', () => {
    open.openSessionManager('managed');
    open.closeSessionManager();
    flushFrames();
    expect(focusTerminal).toHaveBeenCalledTimes(1);
  });

  it('a second press switches the tab and keeps the FIRST origin', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('tab');
    open.openSessionManager('past');
    expect(state.openSessionSheet).toHaveBeenLastCalledWith('past');
    open.closeSessionManager();
    flushFrames();
    expect(active).toBe(origin);
  });

  it('give terminal: focusTerminal one frame after the close, never the origin', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('row name');
    open.closeSessionManager({ give: 'terminal' });
    expect(focusTerminal).not.toHaveBeenCalled();
    flushFrames();
    expect(focusTerminal).toHaveBeenCalledTimes(1);
    expect(active).not.toBe(origin);
  });

  it('give nobody: the keyboard is handed to no one', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('row name');
    open.closeSessionManager({ give: 'nobody' });
    flushFrames();
    expect(focusTerminal).not.toHaveBeenCalled();
    expect((active as FakeEl).name).toBe('row name');
  });

  it('a give-back that lost a race with a reopen does nothing', () => {
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    open.closeSessionManager();
    open.openSessionManager('managed');
    active = inSheet('search');
    flushFrames();
    // The sheet is open again, so nothing may pull the keyboard out of it.
    expect((active as FakeEl).name).toBe('search');
    expect(focusTerminal).not.toHaveBeenCalled();
  });

  it('closing over the saved-output expansion closes the saved output too', () => {
    open.openSessionManager('managed');
    state.sessionSheet = {
      tab: 'managed',
      inline: { id: 'a', kind: 'output' }
    };
    open.closeSessionManager({ give: 'nobody' });
    expect(state.closeSavedOutput).toHaveBeenCalledTimes(1);
  });

  it('closing over any other expansion leaves the saved output alone', () => {
    open.openSessionManager('managed');
    state.sessionSheet = { tab: 'managed', inline: { id: 'a', kind: 'end' } };
    open.closeSessionManager({ give: 'nobody' });
    expect(state.closeSavedOutput).not.toHaveBeenCalled();
  });

  it('leaveSessionManagerFor: the sheet closes, keyboard to nobody, BEFORE the door runs', () => {
    // The fix round, W6. The door's own layer takes the keyboard on mount;
    // a give-back a frame later would pull it out of that layer.
    const origin = el('dock row');
    active = origin;
    open.openSessionManager('managed');
    active = inSheet('row name');
    let sheetWhenRun: unknown = 'not run';
    open.leaveSessionManagerFor(() => {
      sheetWhenRun = state.sessionSheet;
    });
    expect(sheetWhenRun).toBeNull();
    expect(state.closeSessionSheet).toHaveBeenCalledTimes(1);
    flushFrames();
    expect(focusTerminal).not.toHaveBeenCalled();
    expect((active as FakeEl).name).toBe('row name');
  });

  it('closing a closed sheet writes nothing and moves no keyboard', () => {
    open.closeSessionManager();
    flushFrames();
    expect(state.closeSessionSheet).not.toHaveBeenCalled();
    expect(focusTerminal).not.toHaveBeenCalled();
  });
});

describe('F2’s target (Phase 293, SPEC 5.3)', () => {
  function focusRow(id: string): void {
    const row = el('row', { attrs: { 'data-manage-row': id } });
    active = el('name button', {
      within: { '[data-manage-row]': row, '.session-sheet': SHEET }
    });
  }

  it('reads the focused sheet row’s id, and null anywhere else', () => {
    expect(open.focusedManageRowId()).toBeNull();
    focusRow('s1');
    expect(open.focusedManageRowId()).toBe('s1');
    active = inSheet('search');
    expect(open.focusedManageRowId()).toBeNull();
  });

  it('an empty id is never a target', () => {
    focusRow('');
    expect(open.focusedManageRowId()).toBeNull();
  });

  it('opens the rename expansion for a row whose gate allows it', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    state.sessions = [session('s1', 'running')];
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).toHaveBeenCalledWith({
      id: 's1',
      kind: 'rename'
    });
  });

  it('NEVER renames the session behind the sheet', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    state.sessions = [session('s1', 'running'), session('active', 'running')];
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setRenaming).not.toHaveBeenCalled();
    expect(state.renamingSessionId).toBeNull();
  });

  it.each(['unknown', 'discarded'] as const)(
    'does nothing for a row that reads %s',
    (status) => {
      state.sessionSheet = { tab: 'managed', inline: null };
      state.sessions = [session('s1', status)];
      focusRow('s1');
      open.renameFocusedManageRow();
      expect(state.setSessionSheetInline).not.toHaveBeenCalled();
    }
  );

  it('re-reads the row by id: a row that has left the list is not a target', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    state.sessions = [];
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).not.toHaveBeenCalled();
  });

  it('reads the Past list on the Past tab, where no row may be renamed', () => {
    state.sessionSheet = { tab: 'past', inline: null };
    state.sessions = [session('s1', 'running')];
    state.pastSessions = [session('s1', 'discarded')];
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).not.toHaveBeenCalled();
  });

  it('a busy row accepts no press', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    state.sessions = [session('s1', 'exited')];
    state.restoringIds = { s1: true };
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).not.toHaveBeenCalled();
  });

  it('does nothing with no row focused, and nothing while the sheet is closed', () => {
    state.sessionSheet = { tab: 'managed', inline: null };
    state.sessions = [session('s1', 'running')];
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).not.toHaveBeenCalled();
    state.sessionSheet = null;
    focusRow('s1');
    open.renameFocusedManageRow();
    expect(state.setSessionSheetInline).not.toHaveBeenCalled();
  });
});

describe('focusChain (Phase 293, SPEC 2.13)', () => {
  it('takes the first selector that is there and takes the keyboard', () => {
    const second = el('second');
    bySelector['#b'] = second;
    expect(open.focusChain(['#a', '#b', '#c'])).toBe(true);
    expect(active).toBe(second);
  });

  it('passes over a disabled control and a disconnected one', () => {
    bySelector['#a'] = el('a', { disabled: true });
    bySelector['#b'] = el('b', { isConnected: false });
    const third = el('c');
    bySelector['#c'] = third;
    expect(open.focusChain(['#a', '#b', '#c'])).toBe(true);
    expect(active).toBe(third);
  });

  it('passes over one that refuses the keyboard, read off the document', () => {
    bySelector['#a'] = el('a', { takesFocus: false });
    const next = el('b');
    bySelector['#b'] = next;
    expect(open.focusChain(['#a', '#b'])).toBe(true);
    expect(active).toBe(next);
  });

  it('answers false, and moves nothing, when no link of the chain is there', () => {
    expect(open.focusChain(['#a', '#b'])).toBe(false);
    expect(active).toBe(BODY);
  });
});

describe('the two leaves import nothing drawn (Phase 293, SPEC 5.5)', () => {
  const dir = resolve(import.meta.dirname, '..');
  const imports = (file: string): string[] =>
    [
      ...readFileSync(resolve(dir, file), 'utf8').matchAll(
        /(?:from|import)\s*\(?\s*'([^']+)'/g
      )
    ].map((m) => m[1] ?? '');

  it('escape.ts imports nothing at all', () => {
    expect(imports('escape.ts')).toEqual([]);
  });

  it('open.ts names no component, no stylesheet, no React and nothing of the lazy chunk', () => {
    const found = imports('open.ts');
    expect(found.length).toBeGreaterThan(0);
    for (const spec of found) {
      expect(spec).not.toMatch(/\.css$/);
      expect(spec).not.toMatch(/^react/);
      expect(spec).not.toMatch(
        /SessionManagerSheet|ManagedGrid|PastList|InlinePanel|BatchPanel|\/actions$|\/lazy$|batch-end|projection|\/view$|\/copy$/
      );
    }
  });

  it('lazy.tsx reaches the sheet only through import()', () => {
    const text = readFileSync(resolve(dir, 'lazy.tsx'), 'utf8');
    expect(text).toMatch(/import\('\.\/SessionManagerSheet'\)/);
    expect(text).not.toMatch(/from '\.\/SessionManagerSheet'/);
    expect(text).toContain('s.sessionSheet !== null');
  });
});
