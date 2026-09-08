/**
 * PHASE 225. The shadow baseline the redline draws against, pinned clause by
 * clause.
 *
 * THE RULE (research 83 A1.2 and A4.2, the charter's whole phase):
 *
 *   baseline = the newest of { the HEAD version, the last version accepted,
 *   the last version committed }; for a file with no HEAD version, the first
 *   bytes Tortie successfully read. A HEAD version not seen before wins
 *   outright. In this phase there is no accept, so the baseline is seeded at
 *   the first successful read, re-seeded when HEAD moves, and otherwise
 *   immutable, with a generation that moves exactly when it does.
 *
 * WHAT THIS PROVES. The pure module first, one clause a test. Then the
 * SHIPPING store and the SHIPPING tab IO under node, over the renderer's own
 * bridge stubs, so the four things that must NEVER advance the baseline are
 * driven rather than read: a file change on the watcher tick, a look at the
 * view, a save, and a tab switch. Then the one thing that must: a HEAD
 * version not seen before. And the empty HEAD answer research 85 finding 2
 * named, which must never seed. Every clause goes red when its line in
 * ../baseline.ts is ablated, and the phase's commit body records each
 * ablation run once.
 *
 * WHAT IT DOES NOT PROVE. Nothing here draws. The view's compose site is one
 * argument, `redlineBaseSide`, and it is pinned here as a function; the
 * projection property off the live DOM is the app run's.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Monaco does not run here, so the working buffer is stubbed, the way the
 * remote save suite stubs it: `getValue` for the save, and a no-op
 * `resetWorkingModel` for the watcher tick that would otherwise reach a model.
 */
const buffer = vi.hoisted(() => ({ text: 'typed\n' }));
vi.mock('../monaco-loader', () => ({
  loadMonaco: async () => ({}),
  rememberLoaded: () => undefined,
  getLoadedMonaco: () => null,
  rekeyTabResources: () => undefined,
  workingModel: () => ({ getValue: () => buffer.text }),
  getWorkingModel: () => ({ getValue: () => buffer.text }),
  resetWorkingModel: () => undefined,
  disposeModels: () => undefined,
  saveViewState: () => undefined,
  takeViewState: () => null,
  dropViewState: () => undefined
}));

const readFile = vi.fn();
const showHead = vi.fn();
const writeFile = vi.fn(async () => undefined);
// PHASE 240. A save of a file inside an open project goes through the guarded
// channel now, with the digest of `savedContents` as its precondition. This
// file's subject is the BASELINE and not the door, so the stub answers `wrote`
// and the assertion below moved from one channel to the other.
const writeGuarded = vi.fn(async () => ({
  outcome: 'wrote' as const,
  sha256: 'deadbeef',
  bytes: 1
}));
const readDir = vi.fn();
const readImage = vi.fn(async () => ({ status: 'ok' }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, writeGuarded, readDir },
    git: { showHead, onChanged: () => () => undefined }
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

const {
  NO_BASELINE,
  baselineSentence,
  nextBaseline,
  redlineBaseSide
} = await import('../baseline');
const { useEditor } = await import('../store');
const { createTabIo } = await import('../tab-io');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../tab-types').EditorTab;

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const later = <T,>(value: T, ms: number): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'notes.md',
    path: '/repo/notes.md',
    mode: 'diff',
    source: 'tree',
    preview: false,
    ...over
  };
}

/** The tab IO over the live store, the way the store itself wires it. */
function ioOverStore(): ReturnType<typeof createTabIo> {
  return createTabIo({
    patch: (id, patch) =>
      useEditor.setState((s) => ({
        tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t))
      })),
    byId: (id) => useEditor.getState().tabs.find((t) => t.id === id),
    worktreeTabsIn: (repoPath) =>
      useEditor
        .getState()
        .tabs.filter(
          (t) =>
            t.repoPath === repoPath &&
            t.commit === null &&
            t.remote === undefined
        )
  });
}

const tabAt = (path: string): EditorTab => {
  const tab = useEditor.getState().tabs.find((t) => t.path === path);
  if (tab === undefined) throw new Error(`no tab for ${path}`);
  return tab;
};

/** One watcher tick over /repo, with the file present on disk. */
async function tick(io: ReturnType<typeof createTabIo>): Promise<void> {
  readDir.mockResolvedValue({ entries: [{ name: 'notes.md' }, { name: 'other.md' }] });
  await io.refreshRepo('/repo');
}

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
  buffer.text = 'typed\n';
});

describe('nextBaseline, one clause a test', () => {
  it('the first successful read seeds the baseline, named as the read', () => {
    // PHASE 239 added `takenAt`, which moves with the generation and never
    // otherwise, so the seed is handed its own clock here. PHASE 238 added
    // `acceptedAt`, which only an accept fills in.
    const next = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' }, 111);
    expect(next).toEqual({
      text: 'a\n',
      from: 'read',
      generation: 1,
      headSeen: null,
      takenAt: 111,
      acceptedAt: null
    });
  });

  it('a later read never advances it, whatever the bytes', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    expect(nextBaseline(seeded, { kind: 'read', contents: 'b\n' })).toBe(seeded);
    expect(nextBaseline(seeded, { kind: 'read', contents: 'a\n' })).toBe(seeded);
  });

  it('an empty HEAD answer never seeds, before or after a read', () => {
    const empty = nextBaseline(NO_BASELINE, { kind: 'head', contents: '' });
    expect(empty.text).toBeNull();
    expect(empty.generation).toBe(0);
    expect(empty.headSeen).toBe('');
    const seeded = nextBaseline(empty, { kind: 'read', contents: 'draft\n' });
    expect(seeded.text).toBe('draft\n');
    expect(seeded.from).toBe('read');
    expect(nextBaseline(seeded, { kind: 'head', contents: '' })).toBe(seeded);
  });

  it('a HEAD version not seen before wins outright', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'file\n' }, 111);
    const head = nextBaseline(seeded, { kind: 'head', contents: 'HEAD\n' }, 222);
    expect(head).toEqual({
      text: 'HEAD\n',
      from: 'commit',
      generation: 2,
      headSeen: 'HEAD\n',
      takenAt: 222,
      acceptedAt: null
    });
  });

  it('a HEAD answer already seen moves nothing', () => {
    const head = nextBaseline(NO_BASELINE, { kind: 'head', contents: 'HEAD\n' });
    expect(nextBaseline(head, { kind: 'head', contents: 'HEAD\n' })).toBe(head);
  });

  it('the generation moves exactly when the baseline does', () => {
    const steps: Array<Parameters<typeof nextBaseline>[1]> = [
      { kind: 'head', contents: '' },
      { kind: 'read', contents: 'v1\n' },
      { kind: 'read', contents: 'v2\n' },
      { kind: 'head', contents: '' },
      { kind: 'head', contents: 'c1\n' },
      { kind: 'head', contents: 'c1\n' },
      { kind: 'read', contents: 'v3\n' },
      { kind: 'head', contents: 'c2\n' }
    ];
    let state = NO_BASELINE;
    for (const step of steps) {
      const next = nextBaseline(state, step);
      const moved = next.text !== state.text || next.from !== state.from;
      expect(next.generation - state.generation).toBe(moved ? 1 : 0);
      state = next;
    }
    expect(state.generation).toBe(3);
  });

  it('a tab with no baseline composes against headContents, and against nothing without one', () => {
    expect(redlineBaseSide(undefined, 'HEAD\n')).toBe('HEAD\n');
    expect(redlineBaseSide(NO_BASELINE, 'HEAD\n')).toBe('HEAD\n');
    expect(redlineBaseSide(undefined, null)).toBe('');
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'file\n' });
    expect(redlineBaseSide(seeded, 'HEAD\n')).toBe('file\n');
  });

  it('the face names the baseline, its lifetime, and the dirty limit only while dirty', () => {
    expect(baselineSentence(undefined, false)).toBeNull();
    expect(baselineSentence(NO_BASELINE, true)).toBeNull();
    const read = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a' });
    const head = nextBaseline(read, { kind: 'head', contents: 'b' });
    expect(baselineSentence(read, false)).toBe(
      'Marked since you opened this file, for as long as this tab is open.'
    );
    expect(baselineSentence(head, false)).toBe(
      'Marked since the last commit, for as long as this tab is open.'
    );
    expect(baselineSentence(head, true)).toBe(
      'Marked since the last commit, for as long as this tab is open. Not refreshed from disk while there are unsaved edits.'
    );
    // Never that the old text is kept anywhere.
    for (const s of [baselineSentence(read, true), baselineSentence(head, true)]) {
      expect(s).not.toMatch(/\b(kept|saved|backup|copy|history)\b/i);
    }
  });
});

describe('the shipping store and tab IO: what never moves the baseline, and what does', () => {
  it('a tracked file seeds from HEAD whichever loader lands first', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    let tab = tabAt('/repo/notes.md');
    expect(tab.savedContents).toBe('file v1\n');
    expect(tab.baseline?.text).toBe('HEAD v1\n');
    expect(tab.baseline?.from).toBe('commit');
    // The read landed first and seeded at 1; HEAD then won at 2. A loader
    // that read the tab BEFORE its own await would hand the rule the empty
    // state and land at 1, overwriting the read's seed rather than following
    // it, so the generation is the clause that pins "either order".
    expect(tab.baseline?.generation).toBe(2);

    // The other order: the read lands after git has answered.
    useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
    readFile.mockImplementation(() =>
      later({ contents: 'file v1\n', truncated: false }, 5)
    );
    useEditor.getState().openFromRequest(req());
    await flush();
    tab = tabAt('/repo/notes.md');
    expect(tab.baseline?.text).toBe('HEAD v1\n');
    expect(tab.baseline?.generation).toBe(1);
    await later(undefined, 10);
    tab = tabAt('/repo/notes.md');
    expect(tab.savedContents).toBe('file v1\n');
    expect(tab.baseline?.text).toBe('HEAD v1\n');
    expect(tab.baseline?.from).toBe('commit');
    // HEAD seeded at 1 and the late read moved nothing.
    expect(tab.baseline?.generation).toBe(1);
  });

  it('a file change on the watcher tick never moves it', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const before = tabAt('/repo/notes.md').baseline;
    const io = ioOverStore();

    readFile.mockResolvedValue({ contents: 'file v2, the agent wrote\n', truncated: false });
    await tick(io);
    const tab = tabAt('/repo/notes.md');
    expect(tab.savedContents).toBe('file v2, the agent wrote\n');
    expect(tab.baseline).toBe(before);
    expect(tab.baseline?.generation).toBe(before?.generation);
  });

  it('a look never moves it', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const before = tabAt('/repo/notes.md').baseline;
    const id = tabAt('/repo/notes.md').id;

    useEditor.getState().setMode(id, 'redline');
    await flush();
    useEditor.getState().setMode(id, 'file');
    useEditor.getState().setMode(id, 'redline');
    useEditor.getState().activate(id);
    await flush();
    expect(tabAt('/repo/notes.md').mode).toBe('redline');
    expect(tabAt('/repo/notes.md').baseline).toBe(before);
  });

  it('a save never moves it', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const before = tabAt('/repo/notes.md').baseline;
    const io = ioOverStore();

    buffer.text = 'file v1, and my own paragraph\n';
    expect(await io.save(tabAt('/repo/notes.md').id)).toBe(true);
    expect(writeGuarded).toHaveBeenCalledTimes(1);
    expect(writeFile).not.toHaveBeenCalled();
    const tab = tabAt('/repo/notes.md');
    expect(tab.savedContents).toBe('file v1, and my own paragraph\n');
    expect(tab.baseline).toBe(before);
  });

  it('a tab switch never moves it', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const before = tabAt('/repo/notes.md').baseline;

    readFile.mockResolvedValue({ contents: 'other\n', truncated: false });
    showHead.mockResolvedValue('other HEAD\n');
    useEditor
      .getState()
      .openFromRequest(req({ relPath: 'other.md', path: '/repo/other.md' }));
    await flush();
    expect(useEditor.getState().activeId).toBe(tabAt('/repo/other.md').id);
    useEditor.getState().activate(tabAt('/repo/notes.md').id);
    expect(useEditor.getState().activeId).toBe(tabAt('/repo/notes.md').id);
    expect(tabAt('/repo/notes.md').baseline).toBe(before);
    expect(tabAt('/repo/other.md').baseline?.text).toBe('other HEAD\n');
  });

  it('an unseen HEAD version advances it, the generation moves by one, and a repeat moves nothing', async () => {
    readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const before = tabAt('/repo/notes.md').baseline;
    const io = ioOverStore();

    // A branch switch under the tab: HEAD moves, the file moves with it.
    readFile.mockResolvedValue({ contents: 'HEAD v2\n', truncated: false });
    showHead.mockResolvedValue('HEAD v2\n');
    await tick(io);
    let tab = tabAt('/repo/notes.md');
    expect(tab.headContents).toBe('HEAD v2\n');
    expect(tab.baseline?.text).toBe('HEAD v2\n');
    expect(tab.baseline?.from).toBe('commit');
    expect(tab.baseline?.generation).toBe((before?.generation ?? 0) + 1);
    const moved = tab.baseline;

    await tick(io);
    tab = tabAt('/repo/notes.md');
    expect(tab.baseline).toBe(moved);
  });

  it('an untracked prose file: seeded from the first read, never re-seeded by the empty HEAD answer, re-seeded when it is committed', async () => {
    // The tree sends mode 'file' for an untracked status, so no HEAD is asked
    // at open (research 85 section 5).
    readFile.mockResolvedValue({ contents: 'draft v1\n', truncated: false });
    showHead.mockResolvedValue('');
    useEditor.getState().openFromRequest(req({ mode: 'file' }));
    await flush();
    let tab = tabAt('/repo/notes.md');
    expect(showHead).toHaveBeenCalledTimes(0);
    expect(tab.headContents).toBeNull();
    expect(tab.baseline?.text).toBe('draft v1\n');
    expect(tab.baseline?.from).toBe('read');
    const seeded = tab.baseline;
    const io = ioOverStore();

    // The first tick: the frozen '' answer lands, the file has moved on. The
    // bridge cannot tell an empty HEAD version from none, so '' never seeds.
    readFile.mockResolvedValue({ contents: 'draft v2, the agent wrote\n', truncated: false });
    await tick(io);
    tab = tabAt('/repo/notes.md');
    expect(showHead).toHaveBeenCalledTimes(1);
    expect(tab.headContents).toBe('');
    expect(tab.savedContents).toBe('draft v2, the agent wrote\n');
    expect(tab.baseline?.text).toBe('draft v1\n');
    expect(tab.baseline?.generation).toBe(seeded?.generation);
    expect(redlineBaseSide(tab.baseline, tab.headContents)).toBe('draft v1\n');

    // Choosing Redline asks git once more and gets the same '' answer.
    useEditor.getState().setMode(tab.id, 'redline');
    await flush();
    expect(tabAt('/repo/notes.md').baseline?.text).toBe('draft v1\n');

    // The file is committed: a HEAD version not seen before wins outright.
    showHead.mockResolvedValue('draft v2, the agent wrote\n');
    await tick(io);
    tab = tabAt('/repo/notes.md');
    expect(tab.baseline?.text).toBe('draft v2, the agent wrote\n');
    expect(tab.baseline?.from).toBe('commit');
    expect(tab.baseline?.generation).toBe((seeded?.generation ?? 0) + 1);
  });

  it('a tab built without the field is still a valid tab and composes against HEAD', () => {
    const fixture = { headContents: 'HEAD\n' } as Partial<EditorTab> as EditorTab;
    expect(fixture.baseline).toBeUndefined();
    expect(redlineBaseSide(fixture.baseline, fixture.headContents)).toBe('HEAD\n');
  });
});
