/**
 * PHASE 244, audit finding F1. The rewind journal's owner is the TAB, and the
 * audit's own fixture (./audit-0908-journal.test.ts) drives exactly one of the
 * paths a tab can leave by. This file drives the rest, which is the phase's
 * re-derivation: `store.ts` removes a tab from `tabs` in THREE places, being
 * `forceCloseTab`, preview replacement and LRU eviction past `MAX_TABS`, and
 * eight gestures reach the first of them.
 *
 * It also pins the two things that must NOT clear a journal — a cancelled
 * dirty close, which keeps the tab, and switching between still-open tabs,
 * which unmounts the view — because "clear it on unmount" is the wrong repair
 * and this is what makes that wrongness executable.
 *
 * And it pins the retention budget the audit asked for. An entry holds the
 * deleted and the inserted STRINGS; until this phase nothing bounded how many
 * of them one tab could hold.
 */

import { beforeEach, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {},
    setProjectsPosition: async () => {},
    fs: {
      readFile: async () => ({ contents: 'hello\n', truncated: false }),
      readImage: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn()
    },
    git: { showHead: async () => '', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const {
  JOURNAL_MAX_BYTES,
  JOURNAL_MAX_ENTRIES,
  forgetRewindJournal,
  recordRewind,
  rewindJournalDepth
} = await import('../redline-journal');

const flush = (): Promise<unknown> => new Promise((done) => setTimeout(done, 0));

function request(name: string, keep = false): Parameters<
  ReturnType<typeof useEditor.getState>['openFromRequest']
>[0] {
  return {
    repoPath: '/repo',
    relPath: name,
    path: `/repo/${name}`,
    mode: 'file' as const,
    source: 'tree' as const,
    ...(keep ? { preview: false as const } : {})
  };
}

/** Open one file and answer with the id the store gave it. */
async function open(name: string, keep = false): Promise<string> {
  useEditor.getState().openFromRequest(request(name, keep));
  await flush();
  const id = useEditor.getState().activeTab()?.id;
  expect(id, `no tab for ${name}`).toBeDefined();
  return id as string;
}

const entry = (ins: string): { off: number; del: string; ins: string; generation: number } => ({
  off: 0,
  del: 'was',
  ins,
  generation: 1
});

/** Every id this file has ever recorded against, so nothing leaks between cases. */
const touched = new Set<string>();
function record(id: string, ins = 'now'): void {
  touched.add(id);
  recordRewind(id, entry(ins));
}

beforeEach(() => {
  for (const id of touched) forgetRewindJournal(id);
  touched.clear();
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
});

it('ends the journal of every tab a Close All takes', async () => {
  const ids = [await open('a.ts', true), await open('b.ts', true), await open('c.ts', true)];
  for (const id of ids) record(id);
  expect(ids.map((id) => rewindJournalDepth(id))).toEqual([1, 1, 1]);

  useEditor.getState().closeAll();

  expect(useEditor.getState().tabs).toHaveLength(0);
  expect(ids.map((id) => rewindJournalDepth(id))).toEqual([0, 0, 0]);
});

it('ends the journal of a preview tab another open replaces', async () => {
  const replaced = await open('preview-one.ts');
  record(replaced);
  expect(rewindJournalDepth(replaced)).toBe(1);

  // A second preview open takes the same slot: the tab is gone from `tabs`
  // without any close gesture at all.
  const second = await open('preview-two.ts');
  expect(second).not.toBe(replaced);
  expect(useEditor.getState().tabs.some((t) => t.id === replaced)).toBe(false);
  expect(rewindJournalDepth(replaced)).toBe(0);
});

it('ends the journal of a tab evicted past the cap', async () => {
  // Eleven kept tabs against a cap of ten. The stalest clean tab that is
  // neither the new one nor the active one is evicted, which is the first.
  const first = await open('lru-00.ts', true);
  record(first);
  for (let n = 1; n <= 10; n += 1) await open(`lru-${String(n).padStart(2, '0')}.ts`, true);

  expect(useEditor.getState().tabs.some((t) => t.id === first)).toBe(false);
  expect(rewindJournalDepth(first)).toBe(0);
});

it('keeps the journal when a dirty close is not answered', async () => {
  const id = await open('dirty.ts', true);
  record(id);
  useEditor.setState({
    tabs: useEditor.getState().tabs.map((t) => (t.id === id ? { ...t, dirty: true } : t))
  });

  // Cancel is "answer nothing": the confirm goes up and the tab stays.
  useEditor.getState().closeTab(id);

  expect(useEditor.getState().tabs.some((t) => t.id === id)).toBe(true);
  expect(rewindJournalDepth(id)).toBe(1);
});

it('keeps the journal of a still-open tab when another tab is activated', async () => {
  const first = await open('switch-a.ts', true);
  record(first);
  const second = await open('switch-b.ts', true);

  useEditor.getState().activate(second);
  useEditor.getState().activate(first);

  expect(rewindJournalDepth(first)).toBe(1);
});

it('bounds one tab journal by entries and by bytes', () => {
  const id = '/repo/budget.ts';
  touched.add(id);

  for (let n = 0; n < JOURNAL_MAX_ENTRIES + 25; n += 1) recordRewind(id, entry(`ins-${String(n)}`));
  expect(rewindJournalDepth(id)).toBe(JOURNAL_MAX_ENTRIES);

  forgetRewindJournal(id);
  const fat = 'x'.repeat(JOURNAL_MAX_BYTES / 4);
  for (let n = 0; n < 12; n += 1) recordRewind(id, entry(fat));
  // Four fat entries is exactly the budget, and `del` costs three units more.
  expect(rewindJournalDepth(id)).toBeLessThanOrEqual(4);
  expect(rewindJournalDepth(id)).toBeGreaterThan(0);

  // The newest is never dropped, even alone over the budget: a rewind with no
  // way back at all is the loss this journal exists to prevent.
  forgetRewindJournal(id);
  recordRewind(id, entry('x'.repeat(JOURNAL_MAX_BYTES * 2)));
  recordRewind(id, entry('x'.repeat(JOURNAL_MAX_BYTES * 2)));
  expect(rewindJournalDepth(id)).toBe(1);
});
