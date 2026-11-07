/**
 * Phase 359, Builder C2 — the editor focus rule for agent-access arrivals.
 *
 * WHAT THIS PINS. `shouldFocusFor` returns false when `focus === false`,
 * before the existing search rule is asked: a background or cross-project
 * agent-access open never steals keyboard focus. Every prior shape keeps its
 * answer — no `focus` field, `focus: true`, and the search/preview matrix —
 * because the opt-out narrows focus and never widens it.
 */

import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile: vi.fn(), readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead: vi.fn(async () => ''), onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

// `shouldFocusFor` is module-private; the rule is pinned through the only
// seam that can observe it — `openFromRequest`'s `pendingFocus` — over the
// real editor store.
const { useEditor } = await import('../store');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

const LAND = { line: 3, column: 0, endLine: 3, endColumn: 0 } as const;

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'src/auth.ts',
    path: '/repo/src/auth.ts',
    mode: 'file',
    source: 'quickopen',
    selection: { ...LAND },
    ...over
  };
}

describe('agent-access focus rule', () => {
  it('focuses an ordinary quickopen arrival', () => {
    useEditor.setState({ tabs: [], activeId: null });
    useEditor.getState().openFromRequest(req());
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(true);
  });

  it('never focuses a background/cross-project arrival carrying focus false', () => {
    useEditor.setState({ tabs: [], activeId: null });
    useEditor.getState().openFromRequest(req({ focus: false }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(false);
  });

  it('keeps the search-preview matrix: preview search stays unfocused', () => {
    useEditor.setState({ tabs: [], activeId: null });
    useEditor
      .getState()
      .openFromRequest(req({ source: 'search', preview: true }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(false);
  });

  it('keeps the search-preview matrix: pinned search still focuses', () => {
    useEditor.setState({ tabs: [], activeId: null });
    useEditor
      .getState()
      .openFromRequest(req({ source: 'search', preview: false }));
    expect(useEditor.getState().activeTab()?.pendingFocus).toBe(true);
  });
});
