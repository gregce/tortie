/**
 * PHASE 96, defect 1. A tab that names a file on another machine refuses the
 * keystroke rather than accepting it and refusing the save.
 *
 * WHAT WAS WRONG. `save` in ../tab-io.ts has refused a remote tab since Phase
 * 73 and has said so out loud since Phase 90.3, and the band ../EditorPanel.tsx
 * draws over such a tab already told the person that typing changes nothing.
 * Monaco was never told, so the editor took every character and the sentence
 * over it was false.
 *
 * WHAT THIS PROVES, and what it does not. It proves the DECISION, which is the
 * predicate the host hands to `updateOptions`. It does not prove the editor,
 * because Monaco is not mounted here. The editor itself is measured live by
 * `npm run probe:p96`, which types into a real model and reads the option and
 * the text back.
 */

import { describe, expect, it, vi } from 'vitest';

// ../MonacoHost reaches the app store through the editor store, and that store
// reads window.gmux while zustand builds its initial state. So the globals have
// to exist before the module under test is ever imported, which is the same
// preamble ./p903-c-remote-save.test.ts uses.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    fs: { readFile: vi.fn(), writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead: vi.fn(), onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve([]) }
});

const { tabIsReadOnly } = await import('../MonacoHost');
type EditorTab = import('../tab-types').EditorTab;

const REMOTE = {
  machineId: 'studio',
  machineLabel: 'Studio',
  repoPath: '/home/greg/api'
};

/** A plain, editable file tab. Every case below changes one field of it. */
function tab(over: Partial<EditorTab> = {}): EditorTab {
  return {
    id: '/repo/src/auth.ts',
    path: '/repo/src/auth.ts',
    relPath: 'src/auth.ts',
    origRelPath: null,
    repoPath: '/repo',
    name: 'auth.ts',
    mode: 'file',
    canDiff: true,
    markdown: false,
    image: false,
    svg: false,
    html: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    pendingSelection: null,
    pendingFocus: false,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: 'here\n',
    headContents: null,
    lastUsed: 0,
    contextEntry: null,
    ...over
  };
}

describe('tabIsReadOnly', () => {
  it('lets an ordinary file tab be edited', () => {
    expect(tabIsReadOnly(tab())).toBe(false);
  });

  const reasons: [string, Partial<EditorTab>][] = [
    ['the file was deleted under the tab', { deleted: true }],
    ['the file was opened truncated', { truncated: true }],
    [
      'the tab shows one commit',
      {
        commit: {
          sha: 'abc1234def5678',
          shortSha: 'abc1234',
          status: 'M',
          subject: 'a change'
        }
      }
    ],
    ['the file is on another machine', { remote: REMOTE }]
  ];

  for (const [why, over] of reasons) {
    it(`refuses the keystroke when ${why}`, () => {
      expect(tabIsReadOnly(tab(over))).toBe(true);
    });
  }

  it('refuses a remote tab in every mode it can be shown in', () => {
    // A review tab opens in Diff and a person can switch it to File, which is
    // the mode Monaco owns. The reason it is not an edit surface is the
    // machine, so no mode may undo it.
    for (const mode of ['diff', 'file', 'preview', 'split', 'image'] as const) {
      expect([mode, tabIsReadOnly(tab({ mode, remote: REMOTE }))]).toEqual([
        mode,
        true
      ]);
    }
  });
});
