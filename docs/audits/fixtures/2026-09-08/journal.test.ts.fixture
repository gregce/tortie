import { expect, it, vi } from 'vitest';
vi.stubGlobal('window', {
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {}, setProjectsPosition: async () => {},
    fs: { readFile: async () => ({ contents: 'hello\n', truncated: false }), readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead: async () => '', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', { body: { classList: { add() {}, remove() {}, contains: () => false } } });
const { useEditor } = await import('../store');
const { recordRewind, rewindJournalDepth, forgetRewindJournal } = await import('../redline-journal');

it('does not give a reopened tab the previous opening journal', async () => {
  const request = { repoPath: '/repo', relPath: 'notes.txt', path: '/repo/notes.txt', mode: 'file' as const, source: 'tree' as const };
  const flush = () => new Promise((done) => setTimeout(done, 0));
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  try {
    useEditor.getState().openFromRequest(request);
    await flush();
    const id = useEditor.getState().activeTab()!.id;
    recordRewind(id, { off: 0, del: 'old', ins: 'new', generation: 1 });
    useEditor.getState().closeTab(id);
    expect(useEditor.getState().tabs).toHaveLength(0);
    const afterClose = rewindJournalDepth(id);
    // Exceed the store's duplicate-open debounce, not a memory settling delay.
    await new Promise((done) => setTimeout(done, 350));
    useEditor.getState().openFromRequest(request);
    await flush();
    const reopened = useEditor.getState().activeTab()!.id;
    console.log(JSON.stringify({ id, reopened, afterClose, afterReopen: rewindJournalDepth(reopened) }));
    expect(rewindJournalDepth(reopened)).toBe(0);
  } finally {
    forgetRewindJournal(request.path);
    useEditor.getState().forceCloseTab(request.path);
  }
});
