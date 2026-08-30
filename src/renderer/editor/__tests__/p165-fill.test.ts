/**
 * Phase 165 moved `toggleEditorFill` from EditorPanel.tsx to fill.ts so the
 * menu and the chord can reach it without loading the panel. These are the
 * four answers it gives, which did not change.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const app = {
  editorFill: null as null | object,
  enterEditorFill: vi.fn(() => {
    app.editorFill = {};
  }),
  exitEditorFill: vi.fn(() => {
    app.editorFill = null;
  })
};
const editor = { panelOpen: true, tabs: [{}] as object[] };
const geometry = { windowWidth: 1600, workArea: 1200 };
const overlay = { value: false };

vi.mock('../../state/store', () => ({
  useApp: { getState: () => app },
  liveChromeGeometry: () => geometry
}));
vi.mock('../../state/chrome-geometry', () => ({
  editorIsOverlay: () => overlay.value
}));
vi.mock('../store', () => ({ useEditor: { getState: () => editor } }));

const { toggleEditorFill } = await import('../fill');

beforeEach(() => {
  app.editorFill = null;
  app.enterEditorFill.mockClear();
  app.exitEditorFill.mockClear();
  editor.panelOpen = true;
  editor.tabs = [{}];
  overlay.value = false;
});

describe('toggleEditorFill', () => {
  it('enters fill with a file open in a split', () => {
    toggleEditorFill();
    expect(app.enterEditorFill).toHaveBeenCalledTimes(1);
    expect(app.editorFill).not.toBeNull();
  });

  it('leaves fill when already filled, and reads nothing else', () => {
    app.editorFill = {};
    editor.tabs = [];
    toggleEditorFill();
    expect(app.exitEditorFill).toHaveBeenCalledTimes(1);
    expect(app.enterEditorFill).not.toHaveBeenCalled();
  });

  it('refuses with no tab open', () => {
    editor.tabs = [];
    toggleEditorFill();
    expect(app.enterEditorFill).not.toHaveBeenCalled();
  });

  it('refuses with the panel hidden', () => {
    editor.panelOpen = false;
    toggleEditorFill();
    expect(app.enterEditorFill).not.toHaveBeenCalled();
  });

  it('refuses in overlay mode, where the editor already covers the terminal', () => {
    overlay.value = true;
    toggleEditorFill();
    expect(app.enterEditorFill).not.toHaveBeenCalled();
  });
});
