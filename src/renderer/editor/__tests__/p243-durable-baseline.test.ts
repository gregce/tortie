/**
 * PHASE 243. The baseline outlives the tab, pinned clause by clause.
 *
 * WHAT THIS PROVES, over the SHIPPING store and the SHIPPING tab IO under
 * node with the renderer's own bridge stubs:
 *
 *  1. A MOVED baseline is recorded and an unmoved one is not, which is what
 *     makes a watcher tick free. The record carries the key, the origin, the
 *     tab's own generation and `headSeen`.
 *  2. A STORED baseline is offered at the next open, and it arrives WITH its
 *     generation, which is what Phase 227's press guard is bound to.
 *  3. THE CREDIBILITY RULE IS `nextBaseline` REPLAYED AND NOTHING NEW. A
 *     restored baseline whose file's committed version has not moved stands;
 *     one whose HEAD answer has moved is re-seeded on the line that already
 *     exists, before the picture is ever drawn. Research 106 section 2.3
 *     measured the alternative — a record keyed on the HEAD COMMIT would be
 *     refused in 99.8% of one-day gaps and deliver almost nothing across the
 *     overnight case this phase exists for.
 *  4. The four tabs that keep nothing: a file the redline never draws, a
 *     truncated read, a file outside its repository, and a review tab on
 *     another machine.
 *  5. The receipt does not loop: marking a state recorded is not a move, so
 *     it cannot cause a second write.
 *
 * WHAT IT DOES NOT PROVE. Nothing here opens a file. Main's own half — the
 * ring, the record, the sweep, the mid-write kill and the hostile record — is
 * `npm run conformance:redline` rules 21 to 24, which drive the shipping store
 * over a real directory.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const readDir = vi.fn();
const readImage = vi.fn(async () => ({ status: 'ok' }));
const writeGuarded = vi.fn(async () => ({
  outcome: 'wrote' as const,
  sha256: 'deadbeef',
  bytes: 1
}));
const writeFile = vi.fn(async () => undefined);

type StoreCall = import('@shared/baselines').BaselineStoreInput;
type LoadResult = import('@shared/baselines').BaselineLoadResult;

const baselineStore = vi.fn(async (_input: StoreCall) => ({
  stored: true as const,
  bytes: 1
}));
const baselineLoad = vi.fn(
  async (): Promise<LoadResult> => ({
    found: false,
    refused: 'missing',
    reason: 'nothing is stored for this file'
  })
);

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, writeGuarded, readDir },
    git: { showHead, onChanged: () => () => undefined },
    baselines: { load: baselineLoad, store: baselineStore }
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

const { baselineName, baselineSentence, baselineDetail, nextBaseline, NO_BASELINE } =
  await import('../baseline');
const { keepsBaseline, stateFromStored, storeInputFor } = await import(
  '../baseline-durable'
);
const { useEditor } = await import('../store');
const { createTabIo } = await import('../tab-io');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../tab-types').EditorTab;

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

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
          (t) => t.repoPath === repoPath && t.commit === null && t.remote === undefined
        )
  });
}

const tabAt = (path: string): EditorTab => {
  const tab = useEditor.getState().tabs.find((t) => t.path === path);
  if (tab === undefined) throw new Error(`no tab for ${path}`);
  return tab;
};

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
  buffer.text = 'typed\n';
  readFile.mockResolvedValue({ contents: 'file v1\n', truncated: false });
  showHead.mockResolvedValue('HEAD v1\n');
  baselineStore.mockResolvedValue({ stored: true, bytes: 1 });
  baselineLoad.mockResolvedValue({
    found: false,
    refused: 'missing',
    reason: 'nothing is stored for this file'
  });
});

describe('what a moved baseline asks main to record', () => {
  it('records the key, the origin, the generation and the HEAD version it was taken against', async () => {
    useEditor.getState().openFromRequest(req());
    await flush();
    const tab = tabAt('/repo/notes.md');
    expect(tab.baseline?.from).toBe('commit');
    // The read seeded and HEAD won, so TWO moves and two records. The last
    // one is the baseline the tab holds.
    const last = baselineStore.mock.calls.at(-1)?.[0] as StoreCall;
    expect(last.repoPath).toBe('/repo');
    expect(last.relPath).toBe('notes.md');
    expect(last.machineId).toBeNull();
    expect(last.origin).toBe('commit');
    expect(last.text).toBe('HEAD v1\n');
    // THE CREDIBILITY CHECK IS THIS FIELD. Without it a restored record is
    // destroyed by the first watcher tick, silently (research 106 §2.3).
    expect(last.headSeen).toBe('HEAD v1\n');
    expect(last.generation).toBe(tab.baseline?.generation);
    expect(last.truncated).toBe(false);
    // The receipt landed and it is not a move.
    expect(tab.baseline?.durable).toBe('written');
  });

  it('a receipt is not a move, so it cannot cause a second write', async () => {
    useEditor.getState().openFromRequest(req());
    await flush();
    const after = baselineStore.mock.calls.length;
    await flush();
    await flush();
    expect(baselineStore.mock.calls.length).toBe(after);
  });

  it('a watcher tick that moves nothing writes nothing', async () => {
    const io = ioOverStore();
    useEditor.getState().openFromRequest(req());
    await flush();
    baselineStore.mockClear();
    readDir.mockResolvedValue({ entries: [{ name: 'notes.md' }] });
    readFile.mockResolvedValue({ contents: 'agent rewrote it\n', truncated: false });
    await io.refreshRepo('/repo');
    await flush();
    // The FILE changed and the baseline did not, which is the whole rule.
    expect(baselineStore).not.toHaveBeenCalled();
    expect(tabAt('/repo/notes.md').baseline?.text).toBe('HEAD v1\n');
  });

  it('two accepts in a row each end with a receipt on the tab', async () => {
    useEditor.getState().openFromRequest(req());
    await flush();
    const id = tabAt('/repo/notes.md').id;
    useEditor.getState().acceptBaseline(id, 'first accept\n', 1_700_000_000_000);
    await flush();
    expect(tabAt('/repo/notes.md').baseline?.durable).toBe('written');
    useEditor.getState().acceptBaseline(id, 'second accept\n', 1_700_000_000_001);
    await flush();
    expect(tabAt('/repo/notes.md').baseline?.text).toBe('second accept\n');
    expect(tabAt('/repo/notes.md').baseline?.durable).toBe('written');
  });

  it('an accept is recorded, because it is the gesture this phase exists for', async () => {
    useEditor.getState().openFromRequest(req());
    await flush();
    baselineStore.mockClear();
    const id = tabAt('/repo/notes.md').id;
    useEditor.getState().acceptBaseline(id, 'accepted bytes\n', 1_700_000_000_000);
    await flush();
    const last = baselineStore.mock.calls.at(-1)?.[0] as StoreCall;
    expect(last.origin).toBe('accept');
    expect(last.text).toBe('accepted bytes\n');
    expect(last.acceptedAt).toBe(1_700_000_000_000);
    // And the HEAD version it was taken against travels with it, so the next
    // open can ask whether the file's committed version has moved.
    expect(last.headSeen).toBe('HEAD v1\n');
  });
});

describe('the four tabs that keep nothing', () => {
  const base = {
    commit: null,
    remote: undefined,
    repoPath: '/repo',
    relPath: 'notes.md',
    path: '/repo/notes.md',
    truncated: false
  } as const;

  it('prose only, inside the repository, on this Mac, and not truncated', () => {
    expect(keepsBaseline(base)).toBe(true);
    expect(keepsBaseline({ ...base, relPath: 'main.ts', path: '/repo/main.ts' })).toBe(false);
    expect(keepsBaseline({ ...base, truncated: true })).toBe(false);
    expect(keepsBaseline({ ...base, path: '/elsewhere/notes.md' })).toBe(false);
    expect(
      keepsBaseline({
        ...base,
        remote: { machineId: 'mac-pro', machineLabel: 'Mac Pro', repoPath: '/repo' }
      })
    ).toBe(false);
  });

  it('a truncated read stores nothing at all', async () => {
    readFile.mockResolvedValue({ contents: 'x'.repeat(64), truncated: true });
    useEditor.getState().openFromRequest(req());
    await flush();
    // The load is issued before the read can say the file is truncated, which
    // is a read of Tortie's own directory and costs nothing; the WRITE is what
    // must never happen, and the door refuses one too.
    expect(baselineStore).not.toHaveBeenCalled();
  });

  it('a file the redline never draws is never asked about', async () => {
    useEditor
      .getState()
      .openFromRequest(req({ relPath: 'main.ts', path: '/repo/main.ts', mode: 'file' }));
    await flush();
    expect(baselineLoad).not.toHaveBeenCalled();
    expect(baselineStore).not.toHaveBeenCalled();
  });

  it('storeInputFor answers null while nothing has seeded the tab', () => {
    expect(storeInputFor(base, undefined)).toBeNull();
    expect(storeInputFor(base, NO_BASELINE)).toBeNull();
  });
});

describe('a stored baseline at the next open, and when it is still credible', () => {
  const stored = {
    text: 'yesterday\n',
    headSeen: 'HEAD v1\n',
    origin: 'accept' as const,
    generation: 7,
    takenAt: 1_700_000_000_000,
    acceptedAt: 1_700_000_000_000,
    storedAt: 1_700_000_000_500
  };

  it('is offered, and arrives with the generation every press is bound to', async () => {
    baselineLoad.mockResolvedValue({ found: true, baseline: stored });
    useEditor.getState().openFromRequest(req());
    await flush();
    const tab = tabAt('/repo/notes.md');
    expect(tab.baseline?.text).toBe('yesterday\n');
    expect(tab.baseline?.from).toBe('accept');
    expect(tab.baseline?.generation).toBe(7);
    expect(tab.baseline?.durable).toBe('restored');
    // Nothing moved, so nothing was written back.
    expect(baselineStore).not.toHaveBeenCalled();
  });

  it("stands when the file's committed version has not moved", async () => {
    baselineLoad.mockResolvedValue({ found: true, baseline: stored });
    showHead.mockResolvedValue('HEAD v1\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const tab = tabAt('/repo/notes.md');
    expect(tab.baseline?.text).toBe('yesterday\n');
    expect(tab.baseline?.generation).toBe(7);
  });

  it('is re-seeded when it has, on the line that already exists', async () => {
    baselineLoad.mockResolvedValue({ found: true, baseline: stored });
    showHead.mockResolvedValue('HEAD v2\n');
    useEditor.getState().openFromRequest(req());
    await flush();
    const tab = tabAt('/repo/notes.md');
    // The narrowing across the commit is gone before it was ever drawn.
    expect(tab.baseline?.text).toBe('HEAD v2\n');
    expect(tab.baseline?.from).toBe('commit');
    expect(tab.baseline?.durable).toBe('written');
    // And the moved baseline is recorded in its turn, so the next open is
    // credible too.
    expect(baselineStore.mock.calls.at(-1)?.[0].headSeen).toBe('HEAD v2\n');
  });

  it('an untracked file keeps its restored baseline, because an empty HEAD answer never seeds', async () => {
    baselineLoad.mockResolvedValue({
      found: true,
      baseline: { ...stored, headSeen: '', origin: 'read' as const }
    });
    showHead.mockResolvedValue('');
    useEditor.getState().openFromRequest(req());
    await flush();
    expect(tabAt('/repo/notes.md').baseline?.text).toBe('yesterday\n');
  });
});

describe('the face, which says the longer lifetime only when it is true', () => {
  const at = new Date(2026, 8, 8, 14, 2).getTime();
  const yesterday = new Date(2026, 8, 7, 14, 2).getTime();
  const now = new Date(2026, 8, 8, 16, 30).getTime();

  it('an in-memory baseline says exactly what Phase 225 shipped', () => {
    const read = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a' }, at);
    expect(baselineSentence(read, false, {}, now)).toBe(
      'Marked since you opened this file, for as long as this tab is open.'
    );
  });

  it('a recorded baseline says what really ends it', () => {
    const read = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a' }, at);
    const head = nextBaseline(read, { kind: 'head', contents: 'b' }, at);
    const kept = { ...head, durable: 'written' as const };
    expect(baselineSentence(kept, false, {}, now)).toBe(
      "Marked since the last commit, until this file's last commit moves."
    );
    // An untracked file has no committed version to move, so its marking ends
    // at its first commit instead.
    expect(baselineSentence({ ...read, durable: 'written', headSeen: '' }, false, {}, now)).toBe(
      'Marked since you opened this file, until you commit this file.'
    );
  });

  it('a restored baseline names its day, once, and only on the face that needs it', () => {
    const restored = stateFromStored({
      text: 'a',
      headSeen: 'h',
      origin: 'accept',
      generation: 3,
      takenAt: yesterday,
      acceptedAt: yesterday,
      storedAt: yesterday
    });
    expect(baselineName(restored, now)).toBe('you accepted at 14:02 yesterday');
    expect(baselineSentence(restored, false, {}, now)).toBe(
      "Marked since you accepted at 14:02 yesterday, until this file's last commit moves."
    );
    // The time is said ONCE, never "at 14:02 yesterday at 14:02".
    const opened = stateFromStored({
      text: 'a',
      headSeen: '',
      origin: 'read',
      generation: 3,
      takenAt: yesterday,
      acceptedAt: null,
      storedAt: yesterday
    });
    expect(baselineSentence(opened, false, { empty: true }, now)).toBe(
      'Nothing has changed since you opened this file at 14:02 yesterday.'
    );
    // The longer line is the hover's, and it says the marking is older than
    // this tab without saying anything is kept anywhere.
    const detail = baselineDetail(restored, {}, now) ?? '';
    expect(detail).toContain('This marking is from an earlier session.');
    for (const words of [detail, baselineSentence(restored, false, {}, now) ?? '']) {
      expect(words).not.toMatch(/\b(backup|saved|kept|recovered|restored)\b/i);
    }
  });

  it('a moment older than yesterday says its date, with no locale in it', () => {
    const old = stateFromStored({
      text: 'a',
      headSeen: 'h',
      origin: 'accept',
      generation: 1,
      takenAt: new Date(2026, 8, 2, 9, 5).getTime(),
      acceptedAt: new Date(2026, 8, 2, 9, 5).getTime(),
      storedAt: 1
    });
    expect(baselineName(old, now)).toBe('you accepted at 09:05 on 2 Sep');
  });
});
