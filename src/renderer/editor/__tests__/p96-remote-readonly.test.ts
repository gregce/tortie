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
 *
 * PHASE 101 ADDED THE SECOND ARGUMENT, and with it the one case that is new.
 * A remote tab whose machine carries a folder a person confirmed Tortie may
 * save under IS an edit surface. Every other case is unchanged, including the
 * default, which is that a remote tab on a machine with no confirmed folder is
 * still read only. The three local reasons are unconditional on both computers.
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

/** No machine carries a folder Tortie may save under. The ordinary case. */
const NO_ROOT = null;

/** One machine's confirmed folder, as main answers it on the link state. */
const ROOT = '/home/greg';

describe('tabIsReadOnly', () => {
  it('lets an ordinary file tab be edited', () => {
    expect(tabIsReadOnly(tab(), NO_ROOT)).toBe(false);
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
      expect(tabIsReadOnly(tab(over), NO_ROOT)).toBe(true);
    });
  }

  it('refuses a remote tab in every mode it can be shown in', () => {
    // A review tab opens in Diff and a person can switch it to File, which is
    // the mode Monaco owns. The reason it is not an edit surface is the
    // machine, so no mode may undo it.
    for (const mode of ['diff', 'file', 'preview', 'split', 'image'] as const) {
      expect([mode, tabIsReadOnly(tab({ mode, remote: REMOTE }), NO_ROOT)]).toEqual([
        mode,
        true
      ]);
    }
  });

  // PHASE 101. The one case that changed, and the three that did not.
  it('lets a remote tab be edited when that machine carries a folder', () => {
    expect(tabIsReadOnly(tab({ remote: REMOTE }), ROOT)).toBe(false);
  });

  it('reads an empty folder as no folder at all', () => {
    expect(tabIsReadOnly(tab({ remote: REMOTE }), '')).toBe(true);
  });

  it('keeps the three local reasons on a machine that can be saved to', () => {
    const cases: Partial<EditorTab>[] = [
      { deleted: true },
      { truncated: true },
      {
        commit: {
          sha: 'abc1234def5678',
          shortSha: 'abc1234',
          status: 'M',
          subject: 'a change'
        }
      }
    ];
    for (const over of cases) {
      expect(tabIsReadOnly(tab({ remote: REMOTE, ...over }), ROOT)).toBe(true);
    }
  });

  it('is unmoved for a tab on this Mac whatever the folder says', () => {
    // A folder on some machine can never make a local tab read only, and can
    // never make a local commit tab editable.
    expect(tabIsReadOnly(tab(), ROOT)).toBe(false);
    expect(tabIsReadOnly(tab({ deleted: true }), ROOT)).toBe(true);
  });
});
