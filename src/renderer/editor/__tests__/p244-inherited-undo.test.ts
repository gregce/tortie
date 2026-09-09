/**
 * PHASE 244, audit finding F1, THE BYTE PROOF. What an inherited undo does to a
 * real file, which the 0.101.0 audit deliberately did not ask: it said plainly
 * that it "did not execute an inherited undo against a real user file and does
 * not claim demonstrated file corruption".
 *
 * The measure step asked it, at the parent, and the answer was bytes. Opened,
 * an agent's phrase rewound, the tab CLOSED, the same file reopened, and one
 * press of undo in that new opening — in which nothing had ever been rewound —
 * put the agent's `red` back over the person's `brown`, 44 bytes to 42, with
 * the face offering the affordance because `undoableRewind` compares two
 * generations that both read 1. The whole reading is in research 108.
 *
 * This is that driver with its assertions turned the right way up, kept as a
 * maintained regression because it is the only thing in the suite that watches
 * the FILE. The audit's own fixture (./audit-0908-journal.test.ts) watches the
 * journal's depth, and ./p244-journal-lifetime.test.ts watches the other five
 * paths; none of the three would notice a repair that emptied the journal and
 * left some other route to the same write.
 *
 * It runs the SHIPPING chain and injects only the two ends, both routed at real
 * bytes on disk rather than at a fixture string: the editor store opens, closes
 * and reopens the tab; `pressRedline` owns the order and the journal;
 * `applyRewind` asks the generation guard, re-reads and calls the guarded
 * channel; `writeGuarded` in main replaces the real file. The scratch directory
 * is made and removed in a `finally`.
 */
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { writeGuarded } from '../../../main/fs/guarded-write';

const scratch = vi.hoisted(() => ({ root: '', path: '' }));

vi.stubGlobal('window', {
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {}, setProjectsPosition: async () => {},
    fs: {
      readFile: async () => ({ contents: readFileSync(scratch.path, 'utf8'), truncated: false }),
      readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn()
    },
    git: { showHead: async () => '', onChanged: () => () => {} }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', { body: { classList: { add() {}, remove() {}, contains: () => false } } });

// The renderer bridge the ONE call site names, routed at the real file and at
// the real main-side guarded channel.
vi.mock('../../bridge', () => ({
  gmuxBridge: () => ({
    fs: {
      readFile: async () => ({ contents: readFileSync(scratch.path, 'utf8'), truncated: false }),
      writeGuarded: async (input: { root: string; path: string; expect: string; contents: string }) =>
        writeGuarded({ listProjectRoots: async () => [scratch.root] }, input)
    }
  })
}));

const { useEditor } = await import('../store');
const { rewindJournalDepth, forgetRewindJournal, undoableRewind } = await import('../redline-journal');
const { pressRedline } = await import('../redline-press');
const { applyRewind } = await import('../redline-write');
const { composeRedlineDocument } = await import('../redline-document');
const { changesOf } = await import('../rewind');

const BASELINE = 'The quick brown fox jumps over the lazy dog.\n';
const AGENT = 'The quick red fox jumps over the lazy dog.\n';

it('a reopened tab has nothing to undo, and the file is not rewritten', async () => {
  // realpath, because the guarded channel resolves the target and /var is a
  // link to /private/var on macOS.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'p244-f1-')));
  scratch.root = root;
  scratch.path = join(root, 'notes.txt');
  const flush = () => new Promise((done) => setTimeout(done, 0));
  const request = {
    repoPath: root, relPath: 'notes.txt', path: scratch.path,
    mode: 'file' as const, source: 'tree' as const
  };
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  try {
    // 1. The person's own prose is what Tortie reads first, so it is the
    //    shadow baseline of this opening.
    writeFileSync(scratch.path, BASELINE);
    useEditor.getState().openFromRequest(request);
    await flush();
    const first = useEditor.getState().activeTab()!;
    const firstBaseline = first.baseline!;
    const readings: Record<string, unknown> = {
      id: first.id,
      generationFirstOpening: firstBaseline.generation,
      baselineSeeded: firstBaseline.text === BASELINE
    };

    // 2. An agent rewrites one phrase.
    writeFileSync(scratch.path, AGENT);

    // 3. The person rewinds it. This is the ordinary act the journal exists for.
    // The identity is read the way the view reads it: off the drawn change,
    // composed by the shipping document composer over this pair.
    const drawn = changesOf(composeRedlineDocument(firstBaseline.text!, AGENT).runs);
    readings['changesDrawn'] = drawn.length;
    const one = drawn[0]!;
    const pressed = { off: one.off, del: one.del, ins: one.ins, generation: firstBaseline.generation };
    readings['pressedIdentity'] = { off: one.off, del: one.del, ins: one.ins };
    const rewind = await pressRedline('rewind', {
      id: first.id, root, path: scratch.path,
      baseline: firstBaseline.text!, generation: firstBaseline.generation, dirty: false
    }, { focused: () => pressed, apply: applyRewind, refuse: (why) => { readings['rewindRefusedWhy'] = why; } });
    readings['rewind'] = rewind.outcome;
    readings['afterRewind'] = readFileSync(scratch.path, 'utf8');
    readings['depthAfterRewind'] = rewindJournalDepth(first.id);

    // 4. The tab is closed. The audit's fixture stops here.
    useEditor.getState().closeTab(first.id);
    expect(useEditor.getState().tabs).toHaveLength(0);
    readings['depthAfterClose'] = rewindJournalDepth(first.id);

    // 5. Later, the same file is opened again. Exceed the store's
    //    duplicate-open debounce, which is not a settling delay.
    await new Promise((done) => setTimeout(done, 350));
    useEditor.getState().openFromRequest(request);
    await flush();
    const second = useEditor.getState().activeTab()!;
    const secondBaseline = second.baseline!;
    readings['reopenedId'] = second.id;
    readings['sameId'] = second.id === first.id;
    readings['generationSecondOpening'] = secondBaseline.generation;
    readings['depthAfterReopen'] = rewindJournalDepth(second.id);

    // What the FACE would draw: RedlineDocument's chip and sentence are drawn
    // from `undoableRewind(tab.id, generation)` and nothing else.
    readings['canUndoOnFace'] =
      undoableRewind(second.id, secondBaseline.generation) !== undefined;

    // 6. The person presses undo in THIS opening. Nothing was rewound in it.
    const undo = await pressRedline('undo', {
      id: second.id, root, path: scratch.path,
      baseline: secondBaseline.text!, generation: secondBaseline.generation, dirty: false
    }, { focused: () => null, apply: applyRewind, refuse: (why) => { readings['refused'] = why; } });
    readings['undo'] = undo.outcome;
    readings['afterUndo'] = readFileSync(scratch.path, 'utf8');
    readings['depthAfterUndo'] = rewindJournalDepth(second.id);
    console.log(JSON.stringify(readings, null, 1));

    // The two readings that made this reachable are UNCHANGED and are asserted,
    // because the repair is the journal's lifetime and not either of them: the
    // second opening still carries the first opening's id, and its baseline
    // generation still reads the same 1. A repair that leaned on `undoableRewind`
    // would look correct here and would not be.
    expect(readings['sameId']).toBe(true);
    expect(readings['generationSecondOpening']).toBe(readings['generationFirstOpening']);

    // The rewind of step 3 happened and is what the file holds.
    expect(readings['rewind']).toBe('wrote');
    expect(readings['afterRewind']).toBe(BASELINE);
    expect(readings['depthAfterRewind']).toBe(1);

    // The tab's close ended the journal, so the reopened tab inherits nothing,
    // the face offers no undo, the press reads no file and writes no byte, and
    // the person's own prose is still there.
    expect(readings['depthAfterClose']).toBe(0);
    expect(readings['depthAfterReopen']).toBe(0);
    expect(readings['canUndoOnFace']).toBe(false);
    expect(readings['undo']).toBe('nothing');
    expect(readings['afterUndo']).toBe(BASELINE);
  } finally {
    forgetRewindJournal(scratch.path);
    useEditor.getState().forceCloseTab(scratch.path);
    rmSync(root, { recursive: true, force: true });
  }
});
