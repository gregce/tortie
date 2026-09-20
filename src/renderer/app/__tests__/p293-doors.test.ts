/**
 * Phase 293. The doors into the session manager, and every door that must not
 * act under it.
 *
 * WHY THIS FILE DRIVES THE SHIPPING HANDLERS AND DOES NOT READ THEM. Every
 * rule below is about WHICH session a key or a menu row acts on while the
 * sheet is open, and a rule like that is only held by pressing the key. The
 * first pass of this phase put the F2 refusal in the menu arm, where a source
 * reading found it and was satisfied, and the adversary showed the arm is
 * never reached: the keydown ladder runs first, resolves no sheet row (the
 * sheet stamps no `data-session-id` on purpose), falls through to the ACTIVE
 * session and renames the one behind the scrim. So the keydown listener is
 * taken out of the hook and called with a key, with an active session present,
 * which is the shape that went wrong.
 *
 * HOW, IN A NODE ENVIRONMENT. There is no DOM here (the note at the top of
 * p127-keyboard.test.ts). The hook's one effect is run at once by a one line
 * mock of `useEffect`, `window.addEventListener` is a stub that keeps what it
 * is handed, and the document is three hand built elements that answer
 * `closest`. The store is a double that holds the fields the two controllers
 * read and verbs that really write them, so "changed nothing" is a comparison
 * of two snapshots and not a belief about which verb a door would have called.
 *
 * WHAT IS REAL AND WHAT IS NOT. `keyboard.ts`, `menu-actions.ts` and
 * `shell-actions.ts` are the shipping files, so `modalLayerOpen()` and
 * `focusChordSwallowed()` are read for real. `session-manager/open.ts` and
 * `escape.ts` are doubles written from SPEC section 6, because their own
 * behaviour is pinned beside them in `session-manager/__tests__`; the last
 * block here reads the REAL `open.ts` as text and holds the one property this
 * file's doors lean on, that `otherLayerOpen` names every layer
 * `modalLayerOpen` names but three: the sheet's own, and the two that always
 * sit UNDER an open sheet, the Catch Me Up page and the New Session sheet.
 *
 * THE FIX ROUND (the no-regression verifier's W3 and W6, the press attack's
 * P1 to P3). Four doors that draw a layer a person uses today ABOVE Past
 * Sessions now close the sheet first and then open (⌘J, ⌘/, End Session…,
 * Close Project…); the rest stay refused; the split arrows, Next and Previous
 * Session and the three project dialogs join the refused; and the two doors
 * open over the page and the create sheet, as Past Sessions did.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The doubles
// ---------------------------------------------------------------------------

/** An element that answers `closest` for the selectors it sits inside. */
class FakeElement {
  tagName = 'DIV';
  constructor(
    readonly inside: readonly string[] = [],
    readonly dataset: Record<string, string> = {}
  ) {}
  closest(selector: string): FakeElement | null {
    return this.inside.includes(selector) ? this : null;
  }
}

interface FakeSession {
  id: string;
  status: string;
}

const h = vi.hoisted(() => {
  const spies = {
    toast: vi.fn(),
    resumeInPlace: vi.fn(() => Promise.resolve()),
    noteTerminalInput: vi.fn(),
    openSessionManager: vi.fn(),
    closeSessionManager: vi.fn(),
    reclaimSessionSheetFocus: vi.fn(),
    renameFocusedManageRow: vi.fn(),
    sessionSheetTookEscape: vi.fn(),
    runFillChord: vi.fn(() => Promise.resolve()),
    toggleSessionFocus: vi.fn(() => Promise.resolve()),
    toggleOverview: vi.fn(() => Promise.resolve()),
    backOrLeaveOverview: vi.fn(() => Promise.resolve()),
    openAimPicker: vi.fn(() => Promise.resolve()),
    focusTerminal: vi.fn(),
    jumpToSession: vi.fn(),
    quickOpenToggle: vi.fn(),
    navigate: vi.fn(),
    closeProject: vi.fn(),
    leaveSessionManagerFor: vi.fn()
  };
  const palettes = { quickOpen: false, symbols: false };
  const listeners: Array<(e: unknown) => void> = [];
  const menu: { deliver: ((action: string) => void) | null } = { deliver: null };
  return { spies, palettes, listeners, menu };
});

/** The fields the two controllers and `modalLayerOpen` read. */
function restingFields() {
  return {
    bootBlock: null as string | null,
    projects: [] as Array<{ id: string }>,
    activeProjectId: null as string | null,
    confirm: null as { kind: string; id: string } | null,
    createOpen: false,
    newProjectOpen: false,
    remoteProjectOpen: false,
    shortcutsOpen: false,
    attentionOpen: false,
    overview: null as { kind: string } | null,
    sessionFocus: false,
    sessionSheet: null as { tab: 'managed' | 'past' } | null,
    renamingSessionId: null as string | null,
    active: null as FakeSession | null
  };
}

const store = {
  ...restingFields(),
  activeSession(): FakeSession | null {
    return store.active;
  },
  setRenaming(id: string | null): void {
    store.renamingSessionId = id;
  },
  // The real verb raises the ConfirmDialog, and that is the harm the refusal
  // exists to stop, so the double raises one too.
  endSession(id: string): void {
    store.confirm = { kind: 'end', id };
  },
  setConfirm(next: { kind: string; id: string } | null): void {
    store.confirm = next;
  },
  setCreateOpen(on: boolean): void {
    store.createOpen = on;
  },
  setNewProjectOpen(on: boolean): void {
    store.newProjectOpen = on;
  },
  setRemoteProjectOpen(on: boolean): void {
    store.remoteProjectOpen = on;
  },
  setAttentionOpen(on: boolean): void {
    store.attentionOpen = on;
  },
  setShortcutsOpen(on: boolean): void {
    store.shortcutsOpen = on;
  },
  closeProject: h.spies.closeProject,
  canCreateProject: (): boolean => true,
  canAddRemoteProject: (): boolean => true,
  resumeInPlace: h.spies.resumeInPlace,
  toast: h.spies.toast,
  noteTerminalInput: h.spies.noteTerminalInput
};

/** Everything a door could have changed, as one comparable value. */
function snapshot(): string {
  const fields: Record<string, unknown> = {};
  for (const name of Object.keys(restingFields())) {
    fields[name] = (store as unknown as Record<string, unknown>)[name];
  }
  return JSON.stringify(fields);
}

const body = new FakeElement();
const sheetRow = new FakeElement(['[data-manage-row]', '.session-sheet'], {
  manageRow: 'row-x'
});
const selectedTab = new FakeElement(['.session-sheet']);
const doc = { body, activeElement: body as FakeElement | null };

// SPEC section 5.2 and 2.13, over the double store: every layer
// `modalLayerOpen` names but the sheet's own and the two that always sit under
// an open sheet (the create sheet and the Catch Me Up page), plus the two
// palettes.
function otherLayerOpen(): boolean {
  return (
    store.confirm !== null ||
    store.newProjectOpen ||
    store.remoteProjectOpen ||
    store.shortcutsOpen ||
    store.attentionOpen ||
    h.palettes.quickOpen ||
    h.palettes.symbols
  );
}
function sheetIsTopLayer(): boolean {
  return store.sessionSheet !== null && !otherLayerOpen();
}

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    // The two hooks under test are one effect each. Run at once, the effect
    // registers its listener on the stub window below and that is all.
    useEffect: (effect: () => unknown) => {
      effect();
    }
  };
});

vi.mock('../../state/store', () => ({
  useApp: { getState: () => store }
}));
vi.mock('../../session-manager/open', () => ({
  openSessionManager: h.spies.openSessionManager,
  closeSessionManager: h.spies.closeSessionManager,
  otherLayerOpen: () => otherLayerOpen(),
  sheetIsTopLayer: () => sheetIsTopLayer(),
  reclaimSessionSheetFocus: h.spies.reclaimSessionSheetFocus,
  renameFocusedManageRow: h.spies.renameFocusedManageRow,
  leaveSessionManagerFor: h.spies.leaveSessionManagerFor
}));
vi.mock('../../session-manager/escape', () => ({
  sessionSheetTookEscape: h.spies.sessionSheetTookEscape
}));
vi.mock('../../state/layout', () => ({
  useLayout: { getState: () => ({ navigate: h.spies.navigate }) }
}));
vi.mock('../session-focus', () => ({
  focusTerminal: h.spies.focusTerminal,
  jumpToSession: h.spies.jumpToSession
}));
vi.mock('../focus-flight', () => ({
  toggleSessionFocus: h.spies.toggleSessionFocus
}));
vi.mock('../fill-chord', () => ({ runFillChord: h.spies.runFillChord }));
vi.mock('../../overview/open-overview', () => ({
  backOrLeaveOverview: h.spies.backOrLeaveOverview,
  overviewChordYields: () => false,
  toggleOverview: h.spies.toggleOverview
}));
vi.mock('../../overview/session-keys', () => ({
  askRailTookEscape: () => false
}));
vi.mock('../../overview/story', () => ({ storyTookEscape: () => false }));
vi.mock('../../quickopen/store', () => ({
  useQuickOpen: {
    getState: () => ({
      open: h.palettes.quickOpen,
      close: vi.fn(),
      toggleOrOpen: h.spies.quickOpenToggle
    })
  }
}));
vi.mock('../../search/symbols-store', () => ({
  useSymbols: {
    getState: () => ({
      open: h.palettes.symbols,
      close: vi.fn(),
      openPalette: vi.fn()
    })
  }
}));
vi.mock('../../arch/picker', () => ({ openAimPicker: h.spies.openAimPicker }));
vi.mock('../../search/focus', () => ({
  focusInsideSearch: () => false,
  focusSearchInput: vi.fn(),
  selectionSeed: () => undefined
}));
vi.mock('../../search/results-focus', () => ({ focusResultsList: () => false }));
vi.mock('../../search/store', () => ({
  useSearch: { getState: () => ({ stepResult: () => false }) }
}));
vi.mock('../../settings/settings-store', () => ({
  archSurfacesOn: () => false,
  useSettingsStore: { getState: () => ({}) }
}));
vi.mock('../../state/clone', () => ({ cloneAction: () => undefined }));
vi.mock('../open-recent-on-machine', () => ({ openRecentOnMachine: vi.fn() }));
vi.mock('../../state/shell-open', () => ({ pullPendingShellOpen: vi.fn() }));
vi.mock('../../editor/store', () => ({ useEditor: { getState: () => ({}) } }));
vi.mock('../../editor/fill', () => ({ toggleEditorFill: vi.fn() }));
vi.mock('../../editor/redline-commands', () => ({ runRedlineCommand: vi.fn() }));
vi.mock('../../editor/reshape-commands', () => ({
  runReshapeCommand: () => false
}));
vi.mock('../../arch/open-map', () => ({ openArchMapForActiveProject: vi.fn() }));
vi.mock('../../diagnostics/open-report', () => ({
  openDiagnosticsReport: vi.fn()
}));
vi.mock('../../bridge', () => ({
  gmuxBridge: () => ({
    onMenuAction: (deliver: (action: string) => void) => {
      h.menu.deliver = deliver;
      return () => {};
    }
  })
}));

vi.stubGlobal('HTMLElement', FakeElement);
vi.stubGlobal('Element', FakeElement);
vi.stubGlobal('HTMLInputElement', class {});
vi.stubGlobal('document', doc);
vi.stubGlobal('window', {
  addEventListener: (type: string, listener: (e: unknown) => void) => {
    if (type === 'keydown') h.listeners.push(listener);
  },
  removeEventListener() {}
});

const { useKeyboardMap, focusChordSwallowed } = await import('../keyboard');
const { runMenuAction, useMenuActions } = await import('../menu-actions');
const { modalLayerOpen } = await import('../shell-actions');

useKeyboardMap();
useMenuActions();
/** The map itself. */
const onKeyDown = h.listeners[0] as (e: unknown) => void;
/** The split arrows' own listener, the second one the hook registers. */
const onKeyDownArrows = h.listeners[1] as (e: unknown) => void;

interface FakeKey {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  target: FakeElement | null;
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
}

function press(
  init: Partial<FakeKey> & { key: string },
  listener: (e: unknown) => void = onKeyDown
): FakeKey {
  const e: FakeKey = {
    code: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    target: doc.activeElement,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...init
  };
  listener(e);
  return e;
}

type MenuAction = Parameters<typeof runMenuAction>[0];
const menu = (action: string): void => runMenuAction(action as MenuAction);

beforeEach(() => {
  Object.assign(store, restingFields());
  h.palettes.quickOpen = false;
  h.palettes.symbols = false;
  doc.activeElement = body;
  for (const spy of Object.values(h.spies)) spy.mockReset();
  h.spies.openSessionManager.mockImplementation((tab: 'managed' | 'past') => {
    store.sessionSheet = { tab };
  });
  h.spies.closeSessionManager.mockImplementation(() => {
    store.sessionSheet = null;
  });
  // SPEC section 5.4: true, and focus on the selected tab, only when the sheet
  // is the top layer and the active element is outside it.
  h.spies.reclaimSessionSheetFocus.mockImplementation(() => {
    if (!sheetIsTopLayer()) return false;
    const el = doc.activeElement;
    if (el !== null && el.closest('.session-sheet') !== null) return false;
    doc.activeElement = selectedTab;
    return true;
  });
  h.spies.sessionSheetTookEscape.mockReturnValue(false);
  h.spies.jumpToSession.mockResolvedValue({ ok: true });
  // SPEC 5.3 as the fix round wrote it: the sheet closes, keyboard to nobody,
  // then the door runs.
  h.spies.leaveSessionManagerFor.mockImplementation((run: () => void) => {
    h.spies.closeSessionManager({ give: 'nobody' });
    run();
  });
});

/** The sheet open on Managed, a live session behind it, focus on a sheet row. */
function openSheetOverAnActiveSession(): void {
  store.projects = [{ id: 'p1' }];
  store.activeProjectId = 'p1';
  store.active = { id: 'behind-the-scrim', status: 'running' };
  store.sessionSheet = { tab: 'managed' };
  doc.activeElement = sheetRow;
}

// ---------------------------------------------------------------------------
// The two doors
// ---------------------------------------------------------------------------

describe('Session → Manage Sessions… and Past Sessions…', () => {
  it('opens Managed with no project open at all', () => {
    expect(store.projects).toEqual([]);
    menu('manage-sessions');
    expect(h.spies.openSessionManager).toHaveBeenCalledExactlyOnceWith('managed');
    expect(store.sessionSheet).toEqual({ tab: 'managed' });
  });

  it('opens the same sheet on Past with no project open at all', () => {
    menu('past-sessions');
    expect(h.spies.openSessionManager).toHaveBeenCalledExactlyOnceWith('past');
    expect(store.sessionSheet).toEqual({ tab: 'past' });
  });

  it('a second press switches the tab of the open sheet', () => {
    // The sheet is itself a layer of modalLayerOpen(), so a door that asked
    // THAT question would refuse its own second press.
    menu('manage-sessions');
    menu('past-sessions');
    expect(store.sessionSheet).toEqual({ tab: 'past' });
    menu('manage-sessions');
    expect(store.sessionSheet).toEqual({ tab: 'managed' });
  });

  it('is refused under a boot block, where no sheet can mount', () => {
    store.bootBlock = 'tmux-missing';
    menu('manage-sessions');
    menu('past-sessions');
    expect(h.spies.openSessionManager).not.toHaveBeenCalled();
    expect(store.sessionSheet).toBeNull();
  });

  const LAYERS: Array<[string, () => void]> = [
    ['a ConfirmDialog', () => (store.confirm = { kind: 'end', id: 'x' })],
    ['the ⌘J overlay', () => (store.attentionOpen = true)],
    ['the shortcuts overlay', () => (store.shortcutsOpen = true)],
    ['Quick Open', () => (h.palettes.quickOpen = true)],
    ['Go to Symbol', () => (h.palettes.symbols = true)]
  ];
  for (const [name, raise] of LAYERS) {
    it(`is refused while ${name} is over the sheet, and switches no tab`, () => {
      store.sessionSheet = { tab: 'managed' };
      raise();
      menu('past-sessions');
      expect(h.spies.openSessionManager).not.toHaveBeenCalled();
      expect(store.sessionSheet).toEqual({ tab: 'managed' });
    });

    it(`is refused while ${name} is open and the sheet is not`, () => {
      raise();
      menu('manage-sessions');
      expect(h.spies.openSessionManager).not.toHaveBeenCalled();
      expect(store.sessionSheet).toBeNull();
    });
  }

  // The fix round, W3. Today Past Sessions opens over both, and the first
  // build's door refused there with no word.
  const UNDER: Array<[string, () => void]> = [
    ['the Catch Me Up page', () => (store.overview = { kind: 'project' })],
    ['the New Session sheet', () => (store.createOpen = true)]
  ];
  for (const [name, raise] of UNDER) {
    it(`opens OVER ${name}, which stays open under it`, () => {
      raise();
      const under = snapshot();
      menu('past-sessions');
      expect(h.spies.openSessionManager).toHaveBeenCalledExactlyOnceWith('past');
      expect(store.sessionSheet).toEqual({ tab: 'past' });
      // Everything but the sheet's own field is what it was.
      store.sessionSheet = null;
      expect(snapshot()).toBe(under);
    });

    it(`a second press over ${name} switches the tab, and the sheet is the top layer`, () => {
      raise();
      menu('manage-sessions');
      menu('past-sessions');
      expect(store.sessionSheet).toEqual({ tab: 'past' });
      expect(sheetIsTopLayer()).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// The layer
// ---------------------------------------------------------------------------

describe('the sheet is a layer', () => {
  it('modalLayerOpen() is false at rest and true while the sheet is open', () => {
    expect(modalLayerOpen()).toBe(false);
    store.sessionSheet = { tab: 'past' };
    expect(modalLayerOpen()).toBe(true);
  });

  it('⇧⌘↩ is swallowed under it, and still prevented', () => {
    openSheetOverAnActiveSession();
    expect(focusChordSwallowed()).toBe(true);
    const e = press({ key: 'Enter', metaKey: true, shiftKey: true });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(h.spies.runFillChord).not.toHaveBeenCalled();
  });

  it('the ⌃⇧P picker is swallowed under it', () => {
    openSheetOverAnActiveSession();
    press({ key: 'P', ctrlKey: true, shiftKey: true });
    expect(h.spies.openAimPicker).not.toHaveBeenCalled();
  });

  it('⇧⌘U does nothing under it, and is prevented so the menu row never fires', () => {
    openSheetOverAnActiveSession();
    const before = snapshot();
    const e = press({ key: 'u', metaKey: true, shiftKey: true });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(h.spies.toggleOverview).not.toHaveBeenCalled();
    expect(snapshot()).toBe(before);
  });

  it('View → Catch Me Up does nothing under it', () => {
    openSheetOverAnActiveSession();
    menu('show-overview');
    expect(h.spies.toggleOverview).not.toHaveBeenCalled();
  });

  it('⇧⌘U still toggles the page with no sheet, because it must be able to close it', () => {
    store.overview = { kind: 'project' };
    press({ key: 'u', metaKey: true, shiftKey: true });
    menu('show-overview');
    expect(h.spies.toggleOverview).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// F2
// ---------------------------------------------------------------------------

describe('F2 under the sheet never renames the session behind it', () => {
  it('the KEYDOWN path, an active session present, focus on a sheet row', () => {
    openSheetOverAnActiveSession();
    const e = press({ key: 'F2' });
    expect(store.renamingSessionId, 'the active session was renamed').toBeNull();
    expect(h.spies.renameFocusedManageRow).toHaveBeenCalledTimes(1);
    // Prevented, so the native accelerator never delivers rename-session too.
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it('a held F2 is swallowed and opens nothing a second time', () => {
    openSheetOverAnActiveSession();
    const e = press({ key: 'F2', repeat: true });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(h.spies.renameFocusedManageRow).not.toHaveBeenCalled();
    expect(store.renamingSessionId).toBeNull();
  });

  it('under a palette over the sheet it does nothing at all', () => {
    openSheetOverAnActiveSession();
    h.palettes.quickOpen = true;
    const e = press({ key: 'F2' });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(h.spies.renameFocusedManageRow).not.toHaveBeenCalled();
    expect(store.renamingSessionId).toBeNull();
  });

  it('the rename-session menu arm, for a real click on the row', () => {
    openSheetOverAnActiveSession();
    menu('rename-session');
    expect(store.renamingSessionId).toBeNull();
    expect(h.spies.renameFocusedManageRow).toHaveBeenCalledTimes(1);
  });

  it('with no sheet F2 still renames the active session, as it always did', () => {
    store.active = { id: 'the-active-one', status: 'running' };
    press({ key: 'F2' });
    expect(store.renamingSessionId).toBe('the-active-one');
    expect(h.spies.renameFocusedManageRow).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The six doors
// ---------------------------------------------------------------------------

describe('with the sheet open, a door acts on the sheet or not at all', () => {
  // Today each of these acts BEHIND Past Sessions, where nobody can see it:
  // under the sheet each does nothing at all.
  const MENU_DOORS = [
    'resume-conversation',
    'new-session',
    'toggle-session-focus',
    'next-session',
    'prev-session',
    'new-project',
    'open-remote-project',
    'clone-repository'
  ];
  for (const action of MENU_DOORS) {
    it(`the ${action} menu row changes nothing`, () => {
      openSheetOverAnActiveSession();
      const before = snapshot();
      menu(action);
      expect(snapshot()).toBe(before);
      expect(h.spies.resumeInPlace).not.toHaveBeenCalled();
      expect(h.spies.runFillChord).not.toHaveBeenCalled();
      expect(h.spies.navigate).not.toHaveBeenCalled();
      expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
      expect(h.spies.toast).not.toHaveBeenCalled();
    });
  }

  it('⌘T changes nothing, and is prevented so its menu row never fires', () => {
    openSheetOverAnActiveSession();
    const before = snapshot();
    const e = press({ key: 't', metaKey: true });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(snapshot()).toBe(before);
    expect(h.spies.toast).not.toHaveBeenCalled();
  });

  it('the split arrows move nothing behind the sheet, and are prevented', () => {
    // The press attack's P1: ⌥⌘↓ selected a session behind the sheet and its
    // terminal took the keyboard.
    openSheetOverAnActiveSession();
    const before = snapshot();
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
      const e = press({ key, metaKey: true, altKey: true }, onKeyDownArrows);
      expect(e.preventDefault).toHaveBeenCalled();
    }
    expect(h.spies.navigate).not.toHaveBeenCalled();
    expect(snapshot()).toBe(before);
  });

  // The fix round, W6. Today each draws a layer ABOVE Past Sessions that a
  // person uses there. Under the sheet the sheet closes FIRST, keyboard to
  // nobody, and then the layer opens: the person gets it, and nothing is ever
  // stacked on the sheet.
  const LEAVE_DOORS: Array<[string, () => void, () => boolean]> = [
    ['Session → End Session…', () => menu('end-session'), () => store.confirm?.kind === 'end' && store.confirm.id === 'behind-the-scrim'],
    ['the ⌘J menu row', () => menu('attention'), () => store.attentionOpen],
    ['the shortcuts menu row', () => menu('shortcuts'), () => store.shortcutsOpen],
    ['⌘J', () => void press({ key: 'j', metaKey: true }), () => store.attentionOpen],
    ['⌘/', () => void press({ key: '/', metaKey: true }), () => store.shortcutsOpen],
    ['Project → Close Project…', () => menu('close-project'), () => h.spies.closeProject.mock.calls.length === 1 && h.spies.closeProject.mock.calls[0]?.[0] === 'p1']
  ];
  for (const [name, run, opened] of LEAVE_DOORS) {
    it(`${name} closes the sheet FIRST, then opens over the app`, () => {
      openSheetOverAnActiveSession();
      // Whether the layer was already up at the moment the sheet closed: it
      // must not be, or for that instant it was stacked on the sheet.
      let openAtClose: boolean | null = null;
      h.spies.closeSessionManager.mockImplementation(() => {
        openAtClose = opened();
        store.sessionSheet = null;
      });
      run();
      expect(opened(), `${name} did not open its layer`).toBe(true);
      expect(store.sessionSheet, 'the sheet is still open under it').toBeNull();
      expect(openAtClose, 'the layer opened before the sheet closed').toBe(false);
      expect(h.spies.closeSessionManager).toHaveBeenCalledExactlyOnceWith({
        give: 'nobody'
      });
    });
  }

  it('End Session… with no active session, or an ended one, leaves the sheet alone', () => {
    openSheetOverAnActiveSession();
    store.active = { id: 'ended', status: 'exited' };
    menu('end-session');
    store.active = null;
    menu('end-session');
    expect(store.sessionSheet).toEqual({ tab: 'managed' });
    expect(store.confirm).toBeNull();
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
  });

  it('every one of them still works with no sheet', () => {
    // The refusals above are worth nothing if the doors were simply broken.
    store.projects = [{ id: 'p1' }];
    store.active = { id: 'a', status: 'running' };
    menu('end-session');
    expect(store.confirm).toEqual({ kind: 'end', id: 'a' });
    store.confirm = null;
    menu('resume-conversation');
    expect(h.spies.resumeInPlace).toHaveBeenCalledExactlyOnceWith('a');
    menu('new-session');
    expect(store.createOpen).toBe(true);
    store.createOpen = false;
    press({ key: 't', metaKey: true });
    expect(store.createOpen).toBe(true);
    store.createOpen = false;
    press({ key: 'j', metaKey: true });
    expect(store.attentionOpen).toBe(true);
    store.attentionOpen = false;
    press({ key: '/', metaKey: true });
    expect(store.shortcutsOpen).toBe(true);
    store.shortcutsOpen = false;
    menu('toggle-session-focus');
    expect(h.spies.runFillChord).toHaveBeenCalledExactlyOnceWith('menu');
    menu('next-session');
    menu('prev-session');
    press({ key: 'ArrowDown', metaKey: true, altKey: true }, onKeyDownArrows);
    expect(h.spies.navigate.mock.calls).toEqual([['down'], ['up'], ['down']]);
    menu('new-project');
    expect(store.newProjectOpen).toBe(true);
    store.newProjectOpen = false;
    menu('open-remote-project');
    expect(store.remoteProjectOpen).toBe(true);
    store.remoteProjectOpen = false;
    store.activeProjectId = 'p1';
    menu('close-project');
    expect(h.spies.closeProject).toHaveBeenCalledExactlyOnceWith('p1');
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Escape and Tab
// ---------------------------------------------------------------------------

describe('Escape, one rung', () => {
  it('closes the sheet when the sheet itself took nothing', () => {
    openSheetOverAnActiveSession();
    const e = press({ key: 'Escape' });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(h.spies.sessionSheetTookEscape).toHaveBeenCalledTimes(1);
    expect(h.spies.closeSessionManager).toHaveBeenCalledExactlyOnceWith();
  });

  it('leaves the sheet open when a layer inside it took the key', () => {
    openSheetOverAnActiveSession();
    h.spies.sessionSheetTookEscape.mockReturnValue(true);
    press({ key: 'Escape' });
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
    expect(store.sessionSheet).not.toBeNull();
  });

  it('ignores a repeat, swallowed, so a held Escape closes one layer', () => {
    openSheetOverAnActiveSession();
    const e = press({ key: 'Escape', repeat: true });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(h.spies.sessionSheetTookEscape).not.toHaveBeenCalled();
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
  });

  it('never toggles session focus under the sheet', () => {
    // The old Past modal had this defect: Escape outside a terminal, in focus
    // mode, left focus mode behind the modal and did not close it.
    openSheetOverAnActiveSession();
    store.sessionFocus = true;
    press({ key: 'Escape' });
    expect(h.spies.toggleSessionFocus).not.toHaveBeenCalled();
    expect(h.spies.closeSessionManager).toHaveBeenCalledTimes(1);
  });

  it('is asked before the Catch Me Up rung', () => {
    openSheetOverAnActiveSession();
    store.overview = { kind: 'project' };
    press({ key: 'Escape' });
    expect(h.spies.backOrLeaveOverview).not.toHaveBeenCalled();
    expect(h.spies.closeSessionManager).toHaveBeenCalledTimes(1);
  });

  it('the New Session sheet UNDER the sheet yields its Escape to the sheet', () => {
    // The fix round, W3: the door opens over the create sheet, so the create
    // sheet's rung, which sits above the sheet's, must not close the sheet
    // nobody can see first.
    openSheetOverAnActiveSession();
    store.createOpen = true;
    press({ key: 'Escape' });
    expect(store.createOpen).toBe(true);
    expect(h.spies.closeSessionManager).toHaveBeenCalledTimes(1);
    // With the sheet gone the same key closes the create sheet, as always.
    press({ key: 'Escape' });
    expect(store.createOpen).toBe(false);
  });

  it('a ConfirmDialog over the sheet still gets its own Escape first', () => {
    openSheetOverAnActiveSession();
    store.confirm = { kind: 'end', id: 'x' };
    press({ key: 'Escape' });
    expect(store.confirm).toBeNull();
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
  });
});

describe('Tab never reaches a control behind the scrim', () => {
  it('from body, it is taken and focus goes into the sheet', () => {
    openSheetOverAnActiveSession();
    doc.activeElement = body;
    const e = press({ key: 'Tab' });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(doc.activeElement).toBe(selectedTab);
  });

  it('inside the sheet it is left to the sheet, whose own trap wraps it', () => {
    openSheetOverAnActiveSession();
    const e = press({ key: 'Tab' });
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(doc.activeElement).toBe(sheetRow);
  });

  it('with no sheet the rung asks nothing', () => {
    press({ key: 'Tab' });
    expect(h.spies.reclaimSessionSheetFocus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The tray and the menu bar
// ---------------------------------------------------------------------------

describe('focus-session: from outside the window', () => {
  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  it('closes the sheet, keyboard to the terminal, when the jump landed', async () => {
    openSheetOverAnActiveSession();
    h.menu.deliver?.('focus-session:s1');
    await settle();
    expect(h.spies.jumpToSession).toHaveBeenCalledExactlyOnceWith('s1');
    expect(h.spies.closeSessionManager).toHaveBeenCalledExactlyOnceWith({
      give: 'terminal'
    });
  });

  it('leaves the sheet open when the jump was refused', async () => {
    openSheetOverAnActiveSession();
    h.spies.jumpToSession.mockResolvedValue({ ok: false, message: 'no' });
    h.menu.deliver?.('focus-session:s1');
    await settle();
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
    expect(store.sessionSheet).not.toBeNull();
  });

  it('closes nothing when no sheet was open', async () => {
    h.menu.deliver?.('focus-session:s1');
    await settle();
    expect(h.spies.jumpToSession).toHaveBeenCalledTimes(1);
    expect(h.spies.closeSessionManager).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Source order, and the one property of open.ts these doors lean on
// ---------------------------------------------------------------------------

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyboard = readFileSync(join(APP_DIR, 'keyboard.ts'), 'utf8');
const menuActions = readFileSync(join(APP_DIR, 'menu-actions.ts'), 'utf8');
const shellActions = readFileSync(join(APP_DIR, 'shell-actions.ts'), 'utf8');

/**
 * Comments out. A sentence ABOUT a name is not a use of it, and the files read
 * below carry such sentences on purpose, to say what stood where.
 */
function codeOf(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

/** A function's body, by matching braces from its declaration. */
function bodyOf(source: string, name: string): string {
  const at = source.indexOf(`function ${name}(`);
  expect(at, `no function ${name}`).toBeGreaterThan(-1);
  const open = source.indexOf('{', source.indexOf(')', at));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces in ${name}`);
}

describe('where the rungs sit', () => {
  const rung = keyboard.indexOf('} else if (s.sessionSheet !== null) {');

  it('the Escape rung is below the shortcuts rung', () => {
    expect(rung).toBeGreaterThan(-1);
    expect(rung).toBeGreaterThan(keyboard.indexOf('} else if (s.shortcutsOpen) {'));
  });

  it('and above s.overview and s.sessionFocus, which would swallow its key', () => {
    expect(rung).toBeLessThan(keyboard.indexOf('} else if (s.overview !== null) {'));
    expect(rung).toBeLessThan(
      keyboard.indexOf('} else if (s.sessionFocus && !inTerminal) {')
    );
  });

  it('the Tab rung is above the Escape ladder', () => {
    const tab = keyboard.indexOf('reclaimSessionSheetFocus()');
    expect(tab).toBeGreaterThan(-1);
    expect(tab).toBeLessThan(keyboard.indexOf("if (e.key === 'Escape') {"));
  });

  it('the sheet branch is the FIRST statement of the F2 branch', () => {
    const f2 = keyboard.indexOf("if (e.key === 'F2') {");
    const first = keyboard.slice(f2).split('\n')[1] ?? '';
    expect(first.trim()).toBe('if (s.sessionSheet !== null) {');
  });

  it('the rename-session arm asks about the sheet above its layer guard', () => {
    const arm = menuActions.slice(menuActions.indexOf("case 'rename-session': {"));
    const sheet = arm.indexOf('sheetOpen');
    expect(sheet).toBeGreaterThan(-1);
    expect(sheet).toBeLessThan(arm.indexOf('if (layerOpen ||'));
  });

  it('neither controller imports the drawn sheet, only the two eager leaves', () => {
    for (const text of [keyboard, menuActions]) {
      expect(text).not.toContain('SessionManagerSheet');
      expect(text).not.toContain("from '../session-manager'");
      expect(text).not.toContain("from '../session-manager/lazy'");
    }
  });
});

describe('the two layer predicates agree on everything but the sheet and what sits under it', () => {
  const modalBody = codeOf(bodyOf(shellActions, 'modalLayerOpen'));
  const modalFields = [...modalBody.matchAll(/\bs\.(\w+)/g)].map((m) => m[1] ?? '');

  it('modalLayerOpen names eight layers, the sheet among them', () => {
    expect(modalFields).toEqual([
      'confirm',
      'createOpen',
      'newProjectOpen',
      'remoteProjectOpen',
      'shortcutsOpen',
      'attentionOpen',
      'sessionSheet',
      'overview'
    ]);
  });

  it('otherLayerOpen names every one of them but three, plus both palettes', () => {
    const open = readFileSync(
      join(APP_DIR, '..', 'session-manager', 'open.ts'),
      'utf8'
    );
    const other = codeOf(bodyOf(open, 'otherLayerOpen'));
    // The sheet's own, and the two that are always UNDER an open sheet (the
    // fix round, W3). A NEW layer in modalLayerOpen must be named here too,
    // or this goes red: whoever adds one decides which side it is on.
    const under = new Set(['sessionSheet', 'createOpen', 'overview']);
    for (const field of modalFields.filter((f) => !under.has(f))) {
      expect(other, `otherLayerOpen does not name ${field}`).toMatch(
        new RegExp(`\\b${field}\\b`)
      );
    }
    for (const field of under) {
      expect(other, `otherLayerOpen names ${field}, which sits under the sheet`).not.toMatch(
        new RegExp(`\\b${field}\\b`)
      );
    }
    expect(other).toContain('useQuickOpen');
    expect(other).toContain('useSymbols');
  });
});

describe('the old Past Sessions modal is gone, not kept beside the sheet', () => {
  // Ruling R8. Two surfaces over one list are two restore flows, and the old
  // one landed in the session and closed itself, which the sheet never does.
  it('its two files are deleted', () => {
    expect(existsSync(join(APP_DIR, 'PastSessionsModal.tsx'))).toBe(false);
    expect(existsSync(join(APP_DIR, 'past-sessions.css'))).toBe(false);
  });

  it('no door, no re-export and no mount still names it', () => {
    for (const file of ['App.tsx', 'lazy-modals.tsx', 'modals.ts']) {
      const code = codeOf(readFileSync(join(APP_DIR, file), 'utf8'));
      expect(code, `${file} still names the old modal`).not.toContain(
        'PastSessions'
      );
      expect(code, `${file} still reads the old flag`).not.toContain('pastOpen');
    }
  });

  it('App.tsx mounts the sheet door outside the no-projects branch', () => {
    // The branch is one ternary that ends at `)}`. A door inside it would not
    // exist on the home screen, where both Session menu rows must still work.
    const app = readFileSync(join(APP_DIR, 'App.tsx'), 'utf8');
    const branch = app.indexOf('{ready && projects.length === 0 ? (');
    const body = app.indexOf('<div className="shell-body">', branch);
    const mount = app.indexOf('<SessionManagerSheetLazy />');
    const firstSheet = app.indexOf('<CreateSessionModalLazy />');
    expect(branch).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(branch);
    expect(firstSheet).toBeGreaterThan(body);
    expect(mount, 'the door sits with the other sheets').toBeGreaterThan(
      firstSheet
    );
    expect(app.split('<SessionManagerSheetLazy />').length - 1).toBe(1);
  });
});
