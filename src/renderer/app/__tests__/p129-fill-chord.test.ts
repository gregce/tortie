/**
 * Phase 129 item 4. One chord, two regions, and the region the keyboard is in
 * is what decides.
 *
 * What is pinned here, and why each line is a test rather than a comment:
 *
 *  - the routing rule is arithmetic on one element, so it is asserted against
 *    every root that means "session" and against the editor's own root;
 *  - the chord does nothing at all outside those regions. This is the refusal
 *    that stops it growing or shrinking a layout the person is not looking at,
 *    and a later round that "helpfully" falls back to the session would break
 *    this case and nothing else;
 *  - the two silent refusals inside `toggleEditorFill` are spoken here, word
 *    for word. Silence is right for the fill button, which is not drawn in
 *    either case. It is wrong for a chord the keymap says fills the file;
 *  - the exit branch asks NEITHER question. A window made narrower after the
 *    fill must still be leavable, which is the failure the guard order exists
 *    to avoid;
 *  - the one time tip fires only when the fill actually happened, read back
 *    from the store rather than assumed.
 *
 * The vitest environment is node and jsdom is not a dependency here, so the
 * DOM is a hand built stub, exactly as focus-flight.test.ts builds one. The
 * stub only has to answer `closest`, because that is the only DOM call this
 * module makes.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The stubs
// ---------------------------------------------------------------------------

const app = {
  editorFill: null as { sidebarVisible: boolean; dockCollapsed: boolean } | null,
  toast: vi.fn()
};

/** What `liveChromeGeometry()` hands back on the next call. */
const geometry = { windowWidth: 1600, dockReserved: 320, sidebarMax: 400, workArea: 1000 };

vi.mock('../../state/store', () => ({
  useApp: { getState: () => app },
  liveChromeGeometry: () => geometry
}));

const editor = { panelOpen: true, tabs: [{ id: 'a' }] as { id: string }[] };

/**
 * The real `toggleEditorFill` writes `editorFill`. The stub does the same, so
 * the module's read back of the store after calling it is exercised rather
 * than mocked away. `entersFill` turns that write off, which is how the "the
 * tip is not shown when nothing happened" case is built.
 */
const entersFill = { value: true };
const toggleEditorFill = vi.fn(() => {
  if (!entersFill.value) return;
  app.editorFill =
    app.editorFill === null ? { sidebarVisible: true, dockCollapsed: false } : null;
});

vi.mock('../../editor', () => ({
  toggleEditorFill,
  useEditor: { getState: () => editor }
}));

const toggleSessionFocus = vi.fn(() => Promise.resolve());
vi.mock('../focus-flight', () => ({ toggleSessionFocus }));

const showOneTimeTip = vi.fn(() => true);
vi.mock('../one-time-tip', () => ({ showOneTimeTip }));

/**
 * An element that answers `closest` for the selectors named, and for nothing
 * else. `closest` is handed a comma separated list, so each part is compared
 * on its own, which is what a browser does.
 */
function el(...roots: string[]): Element {
  return {
    closest: (selector: string): Element | null => {
      const parts = selector.split(',').map((part) => part.trim());
      return parts.some((part) => roots.includes(part))
        ? ({} as Element)
        : null;
    }
  } as unknown as Element;
}

function keyboardOn(active: Element | null): void {
  vi.stubGlobal('document', { activeElement: active });
}

const {
  activeFillRegion,
  fillRegionOf,
  runFillChord,
  FILL_CHORD_NO_REGION,
  NO_FILE_TO_FILL,
  WINDOW_TOO_NARROW
} = await import('../fill-chord');

beforeEach(() => {
  app.editorFill = null;
  app.toast.mockClear();
  editor.panelOpen = true;
  editor.tabs = [{ id: 'a' }];
  geometry.windowWidth = 1600;
  geometry.workArea = 1000;
  entersFill.value = true;
  toggleEditorFill.mockClear();
  toggleSessionFocus.mockClear();
  showOneTimeTip.mockClear();
});

// ---------------------------------------------------------------------------

describe('the routing rule', () => {
  it('reads the editor from its own panel root', () => {
    expect(fillRegionOf(el('.ed-panel'))).toBe('editor');
  });

  it('reads the session from the terminal and from both list densities', () => {
    expect(fillRegionOf(el('.gmux-terminal-mount'))).toBe('session');
    expect(fillRegionOf(el('[data-slot="session-strip"]'))).toBe('session');
    expect(fillRegionOf(el('[data-slot="session-dock"]'))).toBe('session');
  });

  it('answers null for every other region, and for nothing at all', () => {
    expect(fillRegionOf(el('.activity-bar'))).toBeNull();
    expect(fillRegionOf(el('.sidebar', '.tree-row'))).toBeNull();
    expect(fillRegionOf(null)).toBeNull();
  });

  it('reads the keyboard from the document, not from a stored region', () => {
    keyboardOn(el('.ed-panel'));
    expect(activeFillRegion()).toBe('editor');
    keyboardOn(el('.gmux-terminal-mount'));
    expect(activeFillRegion()).toBe('session');
    keyboardOn(null);
    expect(activeFillRegion()).toBeNull();
  });

  it('answers null when there is no document at all', () => {
    vi.stubGlobal('document', undefined);
    expect(activeFillRegion()).toBeNull();
  });
});

describe('the chord in an open file', () => {
  it('fills the window and teaches the way out once', async () => {
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).toHaveBeenCalledTimes(1);
    expect(toggleSessionFocus).not.toHaveBeenCalled();
    expect(app.toast).not.toHaveBeenCalled();
    expect(showOneTimeTip.mock.calls).toEqual([['editor-fill-exit']]);
  });

  it('says out loud that no file is open, instead of refusing in silence', async () => {
    editor.panelOpen = false;
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(app.toast.mock.calls).toEqual([['info', NO_FILE_TO_FILL]]);
    expect(NO_FILE_TO_FILL).toBe('Open a file first, then press the keys again.');
  });

  it('says the same thing when the panel is open with no tabs in it', async () => {
    editor.tabs = [];
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(app.toast.mock.calls).toEqual([['info', NO_FILE_TO_FILL]]);
  });

  it('says out loud that the window is too narrow, with the way to fix it', async () => {
    // 900 is under OVERLAY_BREAKPOINT_PX, so the real editorIsOverlay is what
    // decides here. The sentence names the action the person can take.
    geometry.windowWidth = 900;
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(app.toast.mock.calls).toEqual([['info', WINDOW_TOO_NARROW]]);
    expect(WINDOW_TOO_NARROW).toBe(
      'The window is too narrow to fill from a file. Make it wider and press the keys again.'
    );
  });

  it('refuses on a work area too small to seat both, at any window width', async () => {
    // The second half of editorIsOverlay. A wide window whose work row cannot
    // seat EDITOR_MIN plus TERMINAL_FLOOR is the safety case, not the taste
    // case, and the chord must refuse for it too.
    geometry.windowWidth = 2400;
    geometry.workArea = 400;
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(app.toast.mock.calls).toEqual([['info', WINDOW_TOO_NARROW]]);
  });

  it('leaves a filled editor even when the window has since been narrowed', async () => {
    // The exit branch asks neither question. A mode with no way out is the
    // failure this order exists to avoid.
    app.editorFill = { sidebarVisible: true, dockCollapsed: false };
    geometry.windowWidth = 900;
    editor.tabs = [];
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).toHaveBeenCalledTimes(1);
    expect(app.editorFill).toBeNull();
    expect(app.toast).not.toHaveBeenCalled();
    expect(showOneTimeTip).not.toHaveBeenCalled();
  });

  it('shows the tip once and never again in the same run', async () => {
    keyboardOn(el('.ed-panel'));
    await runFillChord(); // in
    await runFillChord(); // out
    await runFillChord(); // in again
    // The module asks every time it enters; the tip module itself is what
    // remembers. Asking twice and being answered twice is the contract, and
    // it is why the flag lives in one-time-tip.ts and not here.
    expect(showOneTimeTip.mock.calls).toEqual([
      ['editor-fill-exit'],
      ['editor-fill-exit']
    ]);
  });

  it('does not teach the way out when the fill did not happen', async () => {
    entersFill.value = false;
    keyboardOn(el('.ed-panel'));
    await runFillChord();
    expect(toggleEditorFill).toHaveBeenCalledTimes(1);
    expect(showOneTimeTip).not.toHaveBeenCalled();
  });
});

describe('the chord in a session', () => {
  it('runs session focus and never touches the editor', async () => {
    keyboardOn(el('.gmux-terminal-mount'));
    await runFillChord();
    expect(toggleSessionFocus).toHaveBeenCalledTimes(1);
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(showOneTimeTip).not.toHaveBeenCalled();
  });

  it('runs it from the session list too, in both densities', async () => {
    keyboardOn(el('[data-slot="session-dock"]'));
    await runFillChord();
    keyboardOn(el('[data-slot="session-strip"]'));
    await runFillChord();
    expect(toggleSessionFocus).toHaveBeenCalledTimes(2);
  });
});

describe('the chord anywhere else', () => {
  it('does nothing, and says nothing', async () => {
    keyboardOn(el('.activity-bar'));
    await runFillChord();
    keyboardOn(null);
    await runFillChord();
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(toggleSessionFocus).not.toHaveBeenCalled();
    expect(app.toast).not.toHaveBeenCalled();
    expect(showOneTimeTip).not.toHaveBeenCalled();
  });
});

/**
 * The View menu's row carries this chord's accelerator, so the row runs this
 * router rather than calling session focus directly. If it did not, a row
 * printed with ⇧⌘↩ would fill the file when the keys were pressed and focus
 * the session when the row was chosen, which is the drift these three tests
 * exist to stop.
 */
describe('the View menu row, which is the same router', () => {
  it('fills the open file when the keyboard is in one', async () => {
    keyboardOn(el('.ed-panel'));
    await runFillChord('menu');
    expect(toggleEditorFill).toHaveBeenCalledTimes(1);
    expect(toggleSessionFocus).not.toHaveBeenCalled();
  });

  it('focuses the session when the keyboard is in one', async () => {
    keyboardOn(el('.gmux-terminal-mount'));
    await runFillChord('menu');
    expect(toggleSessionFocus).toHaveBeenCalledTimes(1);
    expect(toggleEditorFill).not.toHaveBeenCalled();
  });

  it('changes no layout from neither region, and says why', async () => {
    keyboardOn(el('.activity-bar'));
    await runFillChord('menu');
    expect(toggleEditorFill).not.toHaveBeenCalled();
    expect(toggleSessionFocus).not.toHaveBeenCalled();
    expect(app.toast).toHaveBeenCalledWith('info', FILL_CHORD_NO_REGION);
  });
});
