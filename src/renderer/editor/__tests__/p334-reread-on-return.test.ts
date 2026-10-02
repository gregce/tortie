/**
 * PHASE 334. COMING BACK TO A TAB READS IT AGAIN, THROUGH THE ONE WALK, AT MOST
 * ONCE A SECOND PER REPOSITORY, AND NEVER OVER A PERSON'S TYPING.
 *
 * Issue 33: an agent's write inside a folder the repository ignores raises no
 * watcher event (research 83 §C.2, ignored 0 of 8), so the open tab kept the
 * old text until a save refused. build/p334/SPEC.md §3 adds DOORS, being the
 * moments a person comes back to a tab, and every door ends in the store's
 * `rereadOnReturn`, which asks `rereadRepo`, which is the watcher's own walk
 * (./tab-io `refreshRepo`) with its serializer and its clean test unchanged.
 *
 * WHAT RUNS IS THE SHIPPING STORE AND THE SHIPPING WALK. What is faked is only
 * what a node process has no copy of: main, as a map of paths to bytes behind
 * a bridge that counts every call by path; and the Monaco chunk, as a model
 * that holds a string, created through ./monaco-loader's own registry so the
 * walk's identity question (`getWorkingModel(id) === model`) is asked of the
 * real registry. The store's clock is `performance.now()`, driven here with
 * `vi.spyOn`, and every walk a test starts is settled before the next step.
 *
 * A WALK IS COUNTED as `readFile` calls under the repository divided by the
 * clean text tabs in it (§5), and for a dirty tab, whose walk reads no file by
 * rule, as `readDir` calls instead, so the safety rows are never vacuous.
 *
 * R11 and R12 read source, with comments blanked and brackets matched, and
 * each clause is proved on in-memory ablations that must read red.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The Monaco chunk, as a model that holds a string. Production's
// `resetWorkingModel` edits the SAME instance in place through
// `pushEditOperations`, which this model implements over one column, so a
// reload by the walk is the real call path and the buffer is the real buffer.
vi.mock('../monaco-impl', () => {
  class FakeModel {
    text: string;
    constructor(text: string) {
      this.text = text;
    }
    getValue(): string {
      return this.text;
    }
    isDisposed(): boolean {
      return false;
    }
    dispose(): void {}
    updateOptions(): void {}
    pushStackElement(): void {}
    onDidChangeContent(): { dispose: () => void } {
      return { dispose: () => undefined };
    }
    getPositionAt(offset: number): { lineNumber: number; column: number } {
      return { lineNumber: 1, column: offset + 1 };
    }
    pushEditOperations(
      _selections: unknown,
      ops: Array<{ range: { startColumn: number; endColumn: number }; text: string }>
    ): null {
      for (const op of ops) {
        this.text =
          this.text.slice(0, op.range.startColumn - 1) + op.text + this.text.slice(op.range.endColumn - 1);
      }
      return null;
    }
  }
  return {
    monaco: {
      Uri: { from: (o: object) => o },
      editor: { getModel: () => null, createModel: (t: string) => new FakeModel(t) },
      languages: { getLanguages: () => [] }
    }
  };
});

// -- main, as a map of bytes, every call counted by path ----------------------

const disk = new Map<string, string>();
const calls = { readFile: [] as string[], readDir: [] as string[], readImage: [] as string[], showHead: [] as string[] };
let inflight = 0;
let emitChanged: ((repoPath: string) => void) | null = null;

const dirOf = (p: string): string => p.slice(0, p.lastIndexOf('/'));
const baseOf = (p: string): string => p.slice(p.lastIndexOf('/') + 1);

async function counted<T>(fn: () => T): Promise<T> {
  inflight += 1;
  try {
    await Promise.resolve();
    return fn();
  } finally {
    inflight -= 1;
  }
}

/**
 * THE FIX ROUND (verifier A's V1d, V2a and V6a shapes). A file read held in
 * the air: the next `readFile` of `path` takes the disk's bytes when it is
 * called, as an open descriptor would, then waits until released. It counts as
 * in flight the whole time, so nothing settles past it by accident.
 */
const heldReads = new Map<string, { reached: () => void; release: Promise<void> }>();
function holdNextRead(path: string): { reached: Promise<void>; release: () => void } {
  let reached!: () => void;
  let release!: () => void;
  const reachedP = new Promise<void>((r) => {
    reached = r;
  });
  const releaseP = new Promise<void>((r) => {
    release = r;
  });
  heldReads.set(path, { reached, release: releaseP });
  return { reached: reachedP, release };
}
function readNow(path: string): { path: string; contents: string; encoding: string; truncated: boolean } {
  calls.readFile.push(path);
  const contents = disk.get(path);
  if (contents === undefined) throw new Error(`no file at ${path}`);
  return { path, contents, encoding: 'utf8', truncated: false };
}

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    setSessionsPosition: async () => {},
    setProjectsPosition: async () => {},
    fs: {
      readFile: (path: string) => {
        const held = heldReads.get(path);
        if (held === undefined) return counted(() => readNow(path));
        heldReads.delete(path);
        inflight += 1;
        const answer = readNow(path);
        return (async () => {
          try {
            held.reached();
            await held.release;
            return answer;
          } finally {
            inflight -= 1;
          }
        })();
      },
      readDir: (dir: string) =>
        counted(() => {
          calls.readDir.push(dir);
          return {
            entries: [...disk.keys()].filter((p) => dirOf(p) === dir).map((p) => ({ name: baseOf(p) }))
          };
        }),
      readImage: (input: { path: string }) =>
        counted(() => {
          calls.readImage.push(input.path);
          return { status: 'ok', url: `gmux-asset://${input.path}` };
        }),
      writeFile: async () => {
        throw new Error('nothing in this file writes');
      }
    },
    git: {
      showHead: (input: { repoPath: string; path: string }) =>
        counted(() => {
          calls.showHead.push(`${input.repoPath}/${input.path}`);
          return HEAD_TEXT;
        }),
      onChanged: (cb: (repoPath: string) => void) => {
        emitChanged = cb;
        return () => undefined;
      }
    }
  }
});
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', { body: { classList: { add() {}, remove() {}, contains: () => false } } });

const { useEditor } = await import('../store');
const { useApp } = await import('../../state/store');
const { useSettingsStore } = await import('../../settings/settings-store');
const { ensureWorkingModel, getWorkingModel, disposeModels } = await import('../monaco-loader');
const { REPO_CHANGED_DEBOUNCE_MS } = await import('../../state/repo-changed');
type EditorTab = import('../store').EditorTab;

const HEAD_TEXT = 'committed\n';
const OLD = 'old line\n';
const NEW = 'the agent wrote this\n';
const TYPED = 'old line\nthe person typed this\n';

const P = 'proj-p';
const Q = 'proj-q';
const A = '/w/a';
const B = '/w/b';

// -- the clock ------------------------------------------------------------------

let clock = 0;
const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => clock);
/** Every test starts a long way past the last, so no floor carries over. */
let epoch = 1_000_000;

// -- helpers --------------------------------------------------------------------

/** Every walk a step started, finished: no bridge call in flight for three idle turns. */
async function settle(): Promise<void> {
  let idle = 0;
  for (let i = 0; i < 2_000 && idle < 3; i += 1) {
    await new Promise((r) => setImmediate(r));
    idle = inflight === 0 ? idle + 1 : 0;
  }
  expect(inflight, 'a walk never settled').toBe(0);
}

function tab(id: string, over: Partial<EditorTab> = {}): EditorTab {
  const repoPath = over.repoPath ?? (id.startsWith(B) ? B : A);
  const name = baseOf(id);
  return {
    id,
    path: id,
    relPath: id.startsWith(`${repoPath}/`) ? id.slice(repoPath.length + 1) : id,
    origRelPath: null,
    repoPath,
    projectId: P,
    name,
    mode: 'file',
    canDiff: false,
    markdown: name.endsWith('.md'),
    image: false,
    svg: false,
    html: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    pendingSelection: null,
    pendingFocus: true,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: OLD,
    headContents: null,
    lastUsed: 0,
    contextEntry: null,
    draft: null,
    ...over
  } as EditorTab;
}

/** Put these tabs in the store, one project on screen with its panel open. */
function seed(tabs: EditorTab[], activeId: string | null = tabs[0]?.id ?? null): void {
  for (const t of useEditor.getState().tabs) disposeModels(t.id);
  disk.clear();
  for (const t of tabs) {
    if (t.commit === null && t.remote === undefined && t.archMap === undefined && t.diagnostics === undefined && t.compare === undefined) {
      disk.set(t.path, t.savedContents);
    }
  }
  useEditor.setState({
    tabs,
    activeId,
    panelOpen: true,
    projectId: P,
    activeIdByProject: { [P]: activeId },
    panelOpenByProject: { [P]: true },
    lastRequest: null,
    lastRequestProjectId: null
  });
}

function resetCalls(): void {
  calls.readFile.length = 0;
  calls.readDir.length = 0;
  calls.readImage.length = 0;
  calls.showHead.length = 0;
}

const under = (list: string[], repo: string): number => list.filter((p) => p.startsWith(`${repo}/`) || p === repo).length;

/** Walks of `repo`: its file reads divided by the clean text tabs it holds. */
function walksOf(repo: string): number {
  const text = useEditor
    .getState()
    .tabs.filter(
      (t) =>
        t.repoPath === repo &&
        t.commit === null &&
        t.remote === undefined &&
        t.archMap === undefined &&
        t.diagnostics === undefined &&
        t.compare === undefined &&
        !(t.image && !t.svg) &&
        !t.dirty
    ).length;
  const reads = under(calls.readFile, repo);
  expect(text, `no clean text tab in ${repo} to count walks by`).toBeGreaterThan(0);
  expect(reads % text, `${String(reads)} reads over ${String(text)} tabs is not a whole number of walks`).toBe(0);
  return reads / text;
}

/** Move the store's clock to `ms` past this test's epoch. */
const at = (ms: number): void => {
  clock = epoch + ms;
};

beforeAll(() => {
  useApp.setState({
    projects: [
      { id: P, path: A, name: 'alpha' },
      { id: Q, path: B, name: 'bravo' }
    ],
    activeProjectId: P,
    confirm: null,
    toasts: []
  } as never);
  const settings = useSettingsStore.getState().settings;
  useSettingsStore.setState({ settings: { ...settings, autoSave: { mode: 'off', delayMs: 1000 } } });
  useEditor.getState().init();
});

beforeEach(() => {
  epoch += 1_000_000;
  at(0);
  resetCalls();
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
});

describe('the clock the store reads', () => {
  it('is the spied performance.now', () => {
    at(42);
    expect(performance.now()).toBe(epoch + 42);
    expect(vi.isMockFunction(performance.now)).toBe(true);
    expect(nowSpy).toBe(performance.now);
  });
});

// -----------------------------------------------------------------------------
// R1. Which tabs are doors.
// -----------------------------------------------------------------------------

describe('R1. activation reads a tab the walk reads, and no other', () => {
  const worktree = [`${A}/a.md`, `${A}/b.ts`];
  const special: Array<[string, EditorTab]> = [
    ['a history tab', tab(`abc123:a.md`, { path: `${A}/a.md`, relPath: 'a.md', commit: { sha: 'abc123', shortSha: 'abc123', status: 'M' } as never })],
    ['a review tab', tab(`machine:m1:${A}:a.md`, { path: `${A}/a.md`, relPath: 'a.md', remote: { machineId: 'm1', machineLabel: 'far', repoPath: A } as never })],
    ['a compare tab', tab(`compare:${A}/a.md`, { path: `${A}/a.md`, relPath: 'a.md', compare: { fileName: 'a.md' } })],
    ['a map tab', tab(`arch-map:${A}`, { path: A, relPath: '', archMap: { repoPath: A } })],
    ['a diagnostics tab', tab('diagnostics:report', { path: A, relPath: '', diagnostics: { kind: 'report' } })],
    ['a raster image tab', tab(`${A}/pic.png`, { image: true, svg: false, mode: 'image' })]
  ];

  it('a worktree tab: exactly one walk', async () => {
    seed(worktree.map((id) => tab(id)), null);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(1);
  });

  for (const [what, t] of special) {
    it(`${what}: no walk`, async () => {
      seed([...worktree.map((id) => tab(id)), t], null);
      useEditor.getState().activate(t.id);
      await settle();
      expect(calls.readFile).toEqual([]);
      expect(calls.readDir).toEqual([]);
      expect(calls.readImage).toEqual([]);
      expect(calls.showHead).toEqual([]);
    });
  }

  it('an SVG tab is text to the walk, so it is a door: one walk', async () => {
    seed([tab(`${A}/logo.svg`, { image: true, svg: true, mode: 'preview' }), tab(`${A}/b.ts`)], null);
    useEditor.getState().activate(`${A}/logo.svg`);
    await settle();
    expect(walksOf(A)).toBe(1);
  });

  it('a tab with no repository: no walk', async () => {
    seed([tab(`/elsewhere/n.md`, { repoPath: '' })], null);
    useEditor.getState().activate('/elsewhere/n.md');
    await settle();
    expect(calls.readFile).toEqual([]);
    expect(calls.readDir).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// R2, R3. The floor, through the store.
// -----------------------------------------------------------------------------

describe('R2. two activations inside the floor are one walk, past it two', () => {
  it('inside: one', async () => {
    seed([tab(`${A}/a.md`), tab(`${A}/b.ts`)], null);
    at(0);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    at(999);
    useEditor.getState().activate(`${A}/b.ts`);
    await settle();
    expect(walksOf(A)).toBe(1);
  });

  it('past it: two', async () => {
    seed([tab(`${A}/a.md`), tab(`${A}/b.ts`)], null);
    at(0);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    at(1_000);
    useEditor.getState().activate(`${A}/b.ts`);
    await settle();
    expect(walksOf(A)).toBe(2);
  });

  it('two repositories have a floor each', async () => {
    seed([tab(`${A}/a.md`), tab(`${B}/z.md`, { repoPath: B })], null);
    at(0);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    at(10);
    useEditor.getState().activate(`${B}/z.md`);
    await settle();
    expect(walksOf(A)).toBe(1);
    expect(walksOf(B)).toBe(1);
  });
});

describe('R3. a tab the door refuses does not consume the floor', () => {
  it('a history tab, then a worktree tab 10 ms later, walks', async () => {
    const history = tab('abc123:a.md', {
      path: `${A}/a.md`,
      relPath: 'a.md',
      commit: { sha: 'abc123', shortSha: 'abc123', status: 'M' } as never
    });
    seed([tab(`${A}/a.md`), history], null);
    at(0);
    useEditor.getState().activate(history.id);
    await settle();
    expect(calls.readFile).toEqual([]);
    at(10);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(1);
  });

  it('a raster image, then a worktree tab 10 ms later, walks', async () => {
    seed([tab(`${A}/a.md`), tab(`${A}/pic.png`, { image: true, mode: 'image' })], null);
    at(0);
    useEditor.getState().activate(`${A}/pic.png`);
    await settle();
    expect(calls.readImage).toEqual([]);
    at(10);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// R4. The strip's cycle and the ⌃Tab run.
// -----------------------------------------------------------------------------

describe('R4. ⌘⇧] walks; a ⌃Tab step does not; the landing does, once; a bare Control release does not', () => {
  const three = (): EditorTab[] => [
    tab(`${A}/a.md`, { lastUsed: 3 }),
    tab(`${A}/b.ts`, { lastUsed: 2 }),
    tab(`${A}/c.ts`, { lastUsed: 1 })
  ];

  it('cycleTab walks', async () => {
    seed(three(), `${A}/a.md`);
    useEditor.getState().cycleTab(1);
    await settle();
    expect(useEditor.getState().activeId).toBe(`${A}/b.ts`);
    expect(walksOf(A)).toBe(1);
  });

  it('cycleMru steps walk nothing, and commitMru after the run walks once', async () => {
    seed(three(), `${A}/a.md`);
    useEditor.getState().cycleMru(1);
    await settle();
    at(1_200);
    useEditor.getState().cycleMru(1);
    await settle();
    expect(useEditor.getState().activeId).toBe(`${A}/c.ts`);
    expect(calls.readFile).toEqual([]);
    at(2_400);
    useEditor.getState().commitMru();
    await settle();
    expect(walksOf(A)).toBe(1);
    // The run is over: the next bare release is not a landing.
    at(4_000);
    useEditor.getState().commitMru();
    await settle();
    expect(walksOf(A)).toBe(1);
  });

  it('commitMru with no run walks nothing and still stamps lastUsed as today', async () => {
    seed(three(), `${A}/b.ts`);
    const before = Date.now();
    useEditor.getState().commitMru();
    await settle();
    expect(calls.readFile).toEqual([]);
    expect(calls.readDir).toEqual([]);
    const stamped = useEditor.getState().tabs.find((t) => t.id === `${A}/b.ts`)?.lastUsed ?? 0;
    expect(stamped).toBeGreaterThanOrEqual(before);
    // The others are not stamped.
    expect(useEditor.getState().tabs.find((t) => t.id === `${A}/a.md`)?.lastUsed).toBe(3);
  });

  it('a run of one step lands once, and the release after it is bare', async () => {
    seed(three(), `${A}/a.md`);
    useEditor.getState().cycleMru(1);
    at(1_200);
    useEditor.getState().commitMru();
    await settle();
    expect(walksOf(A)).toBe(1);
    at(2_400);
    useEditor.getState().commitMru();
    await settle();
    expect(walksOf(A)).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// R5. Coming back to a project.
// -----------------------------------------------------------------------------

describe('R5. switching into a project reads the tab it shows, when its editor is on screen', () => {
  const twoProjects = (panelQ: boolean | undefined, withTabs = true): void => {
    const tabs = [tab(`${A}/a.md`), ...(withTabs ? [tab(`${B}/z.md`, { repoPath: B, projectId: Q })] : [])];
    seed(tabs, `${A}/a.md`);
    useEditor.setState({
      activeIdByProject: { [P]: `${A}/a.md`, ...(withTabs ? { [Q]: `${B}/z.md` } : {}) },
      panelOpenByProject: { [P]: true, ...(panelQ === undefined ? {} : { [Q]: panelQ }) }
    });
  };

  it('panel open on a worktree tab: one walk of that project', async () => {
    twoProjects(true);
    useEditor.getState().switchProject(Q);
    await settle();
    expect(useEditor.getState().activeId).toBe(`${B}/z.md`);
    expect(useEditor.getState().panelOpen).toBe(true);
    expect(walksOf(B)).toBe(1);
    expect(under(calls.readFile, A)).toBe(0);
  });

  it('a project never left comes back open, and walks', async () => {
    twoProjects(undefined);
    useEditor.getState().switchProject(Q);
    await settle();
    expect(useEditor.getState().panelOpen).toBe(true);
    expect(walksOf(B)).toBe(1);
  });

  it('panel closed: no walk', async () => {
    twoProjects(false);
    useEditor.getState().switchProject(Q);
    await settle();
    expect(useEditor.getState().panelOpen).toBe(false);
    expect(calls.readFile).toEqual([]);
    expect(calls.readDir).toEqual([]);
  });

  it('a project with no tabs: no walk', async () => {
    twoProjects(undefined, false);
    useEditor.getState().switchProject(Q);
    await settle();
    expect(useEditor.getState().activeId).toBe(null);
    expect(calls.readFile).toEqual([]);
    expect(calls.readDir).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// R6, R7. THE SAFETY CLAUSE: a door never replaces a person's typing.
// -----------------------------------------------------------------------------

type Held = { text: string; getValue(): string };

async function bufferFor(id: string, text: string): Promise<Held> {
  const model = (await ensureWorkingModel(id, text, id)) as unknown as Held | null;
  if (model === null) throw new Error('the faked chunk did not load');
  model.text = text;
  return model;
}

describe('R6. a dirty tab under every door keeps its buffer; the same tab clean takes the disk', () => {
  it('dirty: activation, focus, a ⌃Tab landing and a project switch each walk and replace nothing', async () => {
    const id = `${A}/a.md`;
    seed([tab(id), tab(`${A}/b.ts`, { lastUsed: 9 })], `${A}/b.ts`);
    const model = await bufferFor(id, TYPED);
    useEditor.getState().markDirty(id, true);
    disk.set(id, NEW);

    const holds = (door: string): void => {
      const live = useEditor.getState().tabs.find((t) => t.id === id);
      expect(model.getValue(), `${door}: the buffer`).toBe(TYPED);
      expect(live?.savedContents, `${door}: savedContents`).toBe(OLD);
      expect(live?.dirty, `${door}: dirty`).toBe(true);
      expect(getWorkingModel(id), `${door}: the same buffer`).toBe(model);
    };
    // A walk reads the parent of every tab it visits, the dirty one included,
    // so each door's walk is counted by its directory reads.
    const dirReads = (): number => under(calls.readDir, A);

    at(0);
    useEditor.getState().activate(id);
    await settle();
    expect(dirReads()).toBe(2);
    holds('activation');

    at(1_200);
    useEditor.getState().rereadOnReturn(id);
    await settle();
    expect(dirReads()).toBe(4);
    holds('focus');

    at(2_400);
    useEditor.getState().cycleMru(1);
    useEditor.getState().cycleMru(1);
    expect(useEditor.getState().activeId).toBe(id);
    useEditor.getState().commitMru();
    await settle();
    expect(dirReads()).toBe(6);
    holds('⌃Tab landing');

    at(3_600);
    useEditor.setState({
      tabs: [...useEditor.getState().tabs, tab(`${B}/z.md`, { repoPath: B, projectId: Q })],
      activeIdByProject: { ...useEditor.getState().activeIdByProject, [Q]: `${B}/z.md` }
    });
    disk.set(`${B}/z.md`, OLD);
    useEditor.getState().switchProject(Q);
    await settle();
    at(4_800);
    useEditor.getState().switchProject(P);
    await settle();
    expect(dirReads()).toBe(8);
    holds('project switch');
  });

  it('clean: the same door takes the disk into savedContents and the buffer', async () => {
    const id = `${A}/a.md`;
    seed([tab(id), tab(`${A}/b.ts`)], `${A}/b.ts`);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    useEditor.getState().activate(id);
    await settle();
    const live = useEditor.getState().tabs.find((t) => t.id === id);
    expect(live?.savedContents).toBe(NEW);
    expect(live?.dirty).toBe(false);
    expect(model.getValue()).toBe(NEW);
  });

  it('clean, through the focus door alone: the disk is taken', async () => {
    const id = `${A}/a.md`;
    seed([tab(id)], id);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    useEditor.getState().rereadOnReturn(id);
    await settle();
    expect(useEditor.getState().tabs.find((t) => t.id === id)?.savedContents).toBe(NEW);
    expect(model.getValue()).toBe(NEW);
  });
});

describe('R7. the same tick: an activation and a keystroke in one synchronous turn', () => {
  it('the typed buffer stands and savedContents does not move', async () => {
    const id = `${A}/a.md`;
    seed([tab(id), tab(`${A}/b.ts`)], `${A}/b.ts`);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    // One turn: the click, then the keystroke Monaco reports synchronously.
    useEditor.getState().activate(id);
    model.text = TYPED;
    useEditor.getState().markDirty(id, true);
    await settle();
    const live = useEditor.getState().tabs.find((t) => t.id === id);
    // The walk ran: it read the dirty tab's directory and skipped its bytes.
    expect(under(calls.readDir, A)).toBe(2);
    expect(calls.readFile).not.toContain(id);
    expect(model.getValue()).toBe(TYPED);
    expect(live?.savedContents).toBe(OLD);
    expect(live?.dirty).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// R7b-d (the fix round). THE WALK'S THREE POST-READ CLAUSES, THROUGH A DOOR.
// Verifier A removed each of tab-io's `!live.dirty`, `live.savedContents ===
// savedBefore` and `getWorkingModel(tab.id) === model` in turn and these
// files stayed green, because no arm typed, adopted or replaced the model
// while a door's read was in the air. conformance:save rules 22 and 26 pin
// them for the bus; these rows pin them for the doors this phase adds.
// -----------------------------------------------------------------------------

describe("R7b-d. what happens while a door's read of the file is in the air", () => {
  const id = `${A}/a.md`;

  it('R7b a keystroke after the read was opened: the typing stands and savedContents does not move', async () => {
    seed([tab(id), tab(`${A}/b.ts`)], `${A}/b.ts`);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    const held = holdNextRead(id);
    useEditor.getState().activate(id);
    await held.reached;
    model.text = TYPED;
    useEditor.getState().markDirty(id, true);
    held.release();
    await settle();
    const live = useEditor.getState().tabs.find((t) => t.id === id);
    expect(calls.readFile, 'the door read the file it held').toContain(id);
    expect(model.getValue()).toBe(TYPED);
    expect(live?.savedContents).toBe(OLD);
    expect(live?.dirty).toBe(true);
  });

  it("R7c a rewind adopted while the read answers the pre-rewind bytes: the rewind stands", async () => {
    const REWOUND = 'the rewound text\n';
    seed([tab(id), tab(`${A}/b.ts`)], `${A}/b.ts`);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    const held = holdNextRead(id);
    useEditor.getState().activate(id);
    await held.reached;
    // The read already holds NEW, as a descriptor opened before the guarded
    // write's rename holds the old inode. The rewind lands and is adopted.
    disk.set(id, REWOUND);
    useEditor.getState().adoptWritten(id, REWOUND, OLD);
    const adopted = useEditor.getState().tabs.find((t) => t.id === id);
    expect(adopted?.savedContents, 'the adoption took').toBe(REWOUND);
    held.release();
    await settle();
    const live = useEditor.getState().tabs.find((t) => t.id === id);
    expect(model.getValue()).toBe(REWOUND);
    expect(live?.savedContents).toBe(REWOUND);
    expect(live?.dirty).toBe(false);
  });

  it('R7d the model replaced while the read is in the air: the new buffer is untouched', async () => {
    const REBUILT = 'a new buffer\n';
    seed([tab(id), tab(`${A}/b.ts`)], `${A}/b.ts`);
    await bufferFor(id, OLD);
    disk.set(id, NEW);
    const held = holdNextRead(id);
    useEditor.getState().activate(id);
    await held.reached;
    disposeModels(id);
    const rebuilt = await bufferFor(id, REBUILT);
    held.release();
    await settle();
    const live = useEditor.getState().tabs.find((t) => t.id === id);
    expect(getWorkingModel(id)).toBe(rebuilt);
    expect(rebuilt.getValue()).toBe(REBUILT);
    expect(live?.savedContents).toBe(OLD);
  });
});

// -----------------------------------------------------------------------------
// R8, R9. The two reads that are NOT floored.
// -----------------------------------------------------------------------------

describe('R8. the bus is not floored', () => {
  it('a door walk, then two watcher deliveries inside the floor, are three walks', async () => {
    seed([tab(`${A}/a.md`)], `${A}/a.md`);
    expect(emitChanged, 'init subscribed the bus').not.toBeNull();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    at(0);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(1);

    at(10);
    emitChanged?.(A);
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    await settle();
    expect(walksOf(A)).toBe(2);

    at(400);
    emitChanged?.(A);
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    await settle();
    expect(walksOf(A)).toBe(3);

    // The control: a door at the same moment IS floored.
    at(500);
    useEditor.getState().rereadOnReturn(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(3);
  });
});

describe('R9. rereadRepo is not floored', () => {
  it('a door walk, then rereadRepo 10 ms later, is two walks', async () => {
    seed([tab(`${A}/a.md`)], `${A}/a.md`);
    at(0);
    useEditor.getState().activate(`${A}/a.md`);
    await settle();
    at(10);
    useEditor.getState().rereadRepo(A);
    await settle();
    expect(walksOf(A)).toBe(2);
    // And the floor it did not touch still refuses the next door.
    at(20);
    useEditor.getState().rereadOnReturn(`${A}/a.md`);
    await settle();
    expect(walksOf(A)).toBe(2);
  });
});

// -----------------------------------------------------------------------------
// R10. The burst.
// -----------------------------------------------------------------------------

describe('R10. fifty activations alternating two tabs of one repository', () => {
  async function burst(spacingMs: number): Promise<number> {
    seed([tab(`${A}/a.md`), tab(`${A}/b.ts`)], null);
    for (let i = 0; i < 50; i += 1) {
      at(i * spacingMs);
      useEditor.getState().activate(i % 2 === 0 ? `${A}/a.md` : `${A}/b.ts`);
      await settle();
    }
    return walksOf(A);
  }

  it('over one second of driven clock: exactly one walk', async () => {
    expect(await burst(20)).toBe(1);
  });

  it('over two and a half seconds: three', async () => {
    expect(await burst(50)).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// R11, R12. The wiring, read from source.
// -----------------------------------------------------------------------------

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const MONACO_HOST = readFileSync(resolve(ROOT, 'src/renderer/editor/MonacoHost.tsx'), 'utf8');
const STORE = readFileSync(resolve(ROOT, 'src/renderer/editor/store.ts'), 'utf8');

/** Comments blanked character for character, so an offset here is an offset in the file. */
function blankComments(src: string): string {
  const out = src.split('');
  let i = 0;
  const skipString = (q: string): void => {
    i += 1;
    while (i < src.length && src[i] !== q) i += src[i] === '\\' ? 2 : 1;
    i += 1;
  };
  const skipTemplate = (): void => {
    i += 1;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') i += 2;
      else if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        let depth = 1;
        while (i < src.length && depth > 0) {
          if (src[i] === '{') depth += 1;
          else if (src[i] === '}') depth -= 1;
          if (depth > 0) i += 1;
        }
        i += 1;
      } else i += 1;
    }
    i += 1;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') out[i++] = ' ';
    } else if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') out[i] = ' ';
        i += 1;
      }
      if (i < src.length) {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
      }
    } else if (c === "'" || c === '"') skipString(c);
    else if (c === '`') skipTemplate();
    else i += 1;
  }
  return out.join('');
}

/** The index of the bracket closing the one at `open`, strings skipped, or -1. */
function closeOf(code: string, open: number): number {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  for (let i = open; i < code.length; i += 1) {
    const c = code[i] as string;
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i += 1;
      while (i < code.length && code[i] !== q) i += code[i] === '\\' ? 2 : 1;
      continue;
    }
    if (pairs[c] !== undefined) stack.push(pairs[c] as string);
    else if (c === ')' || c === ']' || c === '}') {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** Every `useEffect(`/`useLayoutEffect(` call: its whole text and its last argument, spaces removed. */
function effectsOf(code: string): Array<{ text: string; deps: string }> {
  const out: Array<{ text: string; deps: string }> = [];
  const opener = /\buse(?:Layout)?Effect\(/g;
  let m: RegExpExecArray | null;
  while ((m = opener.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = closeOf(code, open);
    if (close === -1) continue;
    const text = code.slice(open, close + 1);
    const lastComma = (() => {
      let depth = 0;
      let last = -1;
      for (let i = 1; i < text.length - 1; i += 1) {
        const c = text[i];
        if (c === '(' || c === '[' || c === '{') depth += 1;
        else if (c === ')' || c === ']' || c === '}') depth -= 1;
        else if (c === ',' && depth === 0) last = i;
      }
      return last;
    })();
    out.push({ text, deps: lastComma === -1 ? '' : text.slice(lastComma + 1, -1).replace(/\s+/g, '') });
  }
  return out;
}

const WIRING_DEPS = '[ready,contentReady,readOnly,tab.id,tab.path,markDirty]';
const FOCUS_DISPOSE = 'focusListener.current?.dispose()';
const BLUR_DISPOSE = 'blurListener.current?.dispose()';

/** Everything wrong with MonacoHost's focus door, or an empty list. */
function monacoFindings(source: string): string[] {
  const code = blankComments(source);
  const out: string[] = [];
  if (/\bonDidFocusEditorText\b/.test(code)) {
    out.push('names onDidFocusEditorText, which also fires on a move back from the find widget');
  }
  const effects = effectsOf(code);
  const wiring = effects.find((e) => e.deps === WIRING_DEPS);
  if (wiring === undefined) return [...out, 'no wiring effect with its dependency array'];
  const body = wiring.text;
  const assign = /focusListener\.current\s*=\s*ce\?\.onDidFocusEditorWidget\(/.exec(body);
  if (assign === null) {
    out.push('the wiring effect assigns no onDidFocusEditorWidget listener to focusListener');
  } else {
    const open = assign.index + assign[0].length - 1;
    const close = closeOf(body, open);
    const handler = close === -1 ? '' : body.slice(open, close + 1);
    if (!/\brereadOnReturn\(\s*tab\.id\s*\)/.test(handler)) {
      out.push('the focus handler does not call rereadOnReturn(tab.id)');
    }
    const focus = body.indexOf('ce?.focus()');
    if (focus === -1) out.push('the wiring effect no longer focuses the editor, so the order cannot be read');
    else if (assign.index > focus) out.push('the focus listener is assigned AFTER ce?.focus(), so the arrival focus is missed');
    const disposeHere = body.indexOf(FOCUS_DISPOSE);
    if (disposeHere === -1 || disposeHere > assign.index) {
      out.push('the wiring effect does not dispose the previous focus listener before it assigns the next');
    }
  }
  const blurPlaces = effects.filter((e) => e.text.includes(BLUR_DISPOSE));
  if (blurPlaces.length !== 2) out.push(`blurListener is disposed in ${String(blurPlaces.length)} effects, not 2`);
  for (const place of blurPlaces) {
    if (!place.text.includes(FOCUS_DISPOSE)) {
      out.push(`an effect (deps ${place.deps}) disposes blurListener and not focusListener`);
    }
  }
  const count = (s: string): number => code.split(s).length - 1;
  if (count(FOCUS_DISPOSE) !== count(BLUR_DISPOSE)) {
    out.push(`focusListener is disposed ${String(count(FOCUS_DISPOSE))} times and blurListener ${String(count(BLUR_DISPOSE))}`);
  }
  return out;
}

/** The body of a shorthand method on the store's returned object, or null. */
function methodBody(code: string, signature: string): string | null {
  const at = code.indexOf(`\n    ${signature} {`);
  if (at === -1) return null;
  const open = code.indexOf('{', at + signature.length);
  const close = closeOf(code, open);
  return close === -1 ? null : code.slice(open, close + 1);
}

/** Everything wrong with the store's doors, or an empty list. */
function storeFindings(source: string): string[] {
  const code = blankComments(source);
  const out: string[] = [];
  const doors: Array<[string, string, string]> = [
    ['activate(id)', 'focusPatch(', 'the focus patch'],
    ['commitMru()', 'patchTab(', 'the lastUsed stamp'],
    ['switchProject(projectId)', 'set({', 'the switch itself']
  ];
  for (const [signature, before, what] of doors) {
    const body = methodBody(code, signature);
    if (body === null) {
      out.push(`${signature} is not a method on the store`);
      continue;
    }
    const door = body.indexOf('rereadOnReturn(');
    if (door === -1) out.push(`${signature} names no rereadOnReturn(`);
    if (/\brereadRepo\(/.test(body)) out.push(`${signature} names rereadRepo( directly`);
    if (/\brefreshRepo\(/.test(body)) out.push(`${signature} names refreshRepo( directly`);
    const first = body.indexOf(before);
    if (door !== -1 && (first === -1 || door < first)) out.push(`${signature} calls its door before ${what}`);
  }
  const step = methodBody(code, 'cycleMru(delta)');
  if (step === null) out.push('cycleMru(delta) is not a method on the store');
  else if (step.includes('rereadOnReturn(')) out.push('cycleMru(delta) is a door; a step must not take the floor');
  const action = methodBody(code, 'rereadOnReturn(id)');
  if (action === null) out.push('rereadOnReturn(id) is not a method on the store');
  else {
    const predicate = action.indexOf('walkedByRefresh(');
    const admit = action.indexOf('returnFloor.admit(');
    const road = action.indexOf('get().rereadRepo(');
    if (predicate === -1 || admit === -1 || road === -1) {
      out.push('rereadOnReturn does not ask the walk predicate, then the floor, then rereadRepo');
    } else if (!(predicate < admit && admit < road)) {
      out.push('rereadOnReturn asks the floor before the predicate, or walks before the floor');
    }
  }
  return out;
}

describe('R11. MonacoHost: focus entering the widget is a door', () => {
  it('the shipping source reads clean', () => {
    expect(monacoFindings(MONACO_HOST)).toEqual([]);
  });

  const ablations: Array<[string, (s: string) => string]> = [
    [
      'the handler removed',
      (s) =>
        s.replace(
          /focusListener\.current =\s*ce\?\.onDidFocusEditorWidget\(\(\) => \{\s*useEditor\.getState\(\)\.rereadOnReturn\(tab\.id\);\s*\}\) \?\? null;/,
          ''
        )
    ],
    ['onDidFocusEditorText substituted', (s) => s.replace('ce?.onDidFocusEditorWidget(', 'ce?.onDidFocusEditorText(')],
    [
      'the handler calls something else',
      (s) => s.replace('useEditor.getState().rereadOnReturn(tab.id);', 'useEditor.getState().autoSaveOnBlur(tab.id);')
    ],
    [
      'the assignment moved after ce?.focus()',
      (s) => {
        const stmt = /\n\s*focusListener\.current =\s*ce\?\.onDidFocusEditorWidget\(\(\) => \{\s*useEditor\.getState\(\)\.rereadOnReturn\(tab\.id\);\s*\}\) \?\? null;/.exec(s);
        if (stmt === null) return s;
        const without = s.replace(stmt[0], '');
        return without.replace('      ce?.focus();\n', `      ce?.focus();\n${stmt[0]}\n`);
      }
    ],
    [
      'the wiring effect does not dispose it',
      (s) => s.replace('    focusListener.current?.dispose();\n    focusListener.current = null;\n', '    focusListener.current = null;\n')
    ],
    ['the unmount teardown does not dispose it', (s) => s.replace('      focusListener.current?.dispose();\n      codeEditor', '      codeEditor')]
  ];
  for (const [name, ablate] of ablations) {
    it(`ablation: ${name} reads red`, () => {
      const broken = ablate(MONACO_HOST);
      expect(broken, 'the ablation found its text').not.toBe(MONACO_HOST);
      expect(monacoFindings(broken).length).toBeGreaterThan(0);
    });
  }
});

describe('R12. every door in the store goes through rereadOnReturn', () => {
  it('the shipping source reads clean', () => {
    expect(storeFindings(STORE)).toEqual([]);
  });

  const ablations: Array<[string, (s: string) => string]> = [
    ['activate names no door', (s) => s.replace('      get().rereadOnReturn(id);\n    },\n\n    closeTab', '    },\n\n    closeTab')],
    [
      'activate walks directly',
      (s) => s.replace('      get().rereadOnReturn(id);\n    },\n\n    closeTab', '      get().rereadRepo(tab.repoPath);\n    },\n\n    closeTab')
    ],
    [
      'activate doors before the focus patch',
      (s) =>
        s.replace(
          '      set((s) => focusPatch(s, projectId, id, true));\n      // PHASE 334. The person chose this tab',
          '      get().rereadOnReturn(id);\n      set((s) => focusPatch(s, projectId, id, true));\n      // PHASE 334. The person chose this tab'
        ).replace('      get().rereadOnReturn(id);\n    },\n\n    closeTab', '    },\n\n    closeTab')
    ],
    ['commitMru names no door', (s) => s.replace('        if (landed) get().rereadOnReturn(id);\n', '')],
    ['commitMru reaches refreshRepo', (s) => s.replace('        if (landed) get().rereadOnReturn(id);\n', '        if (landed) void io.refreshRepo(get().tabs[0]!.repoPath);\n')],
    ['switchProject names no door', (s) => s.replace('      if (activeId !== null && panelOpen) get().rereadOnReturn(activeId);\n', '')],
    [
      'switchProject walks directly',
      (s) =>
        s.replace(
          '      if (activeId !== null && panelOpen) get().rereadOnReturn(activeId);\n',
          '      if (activeId !== null && panelOpen) get().rereadRepo(get().tabs[0]!.repoPath);\n'
        )
    ],
    ['a ⌃Tab step doors', (s) => s.replace('        mruRun = true;\n', '        mruRun = true;\n        get().rereadOnReturn(next.id);\n')],
    [
      'rereadOnReturn asks the floor before the predicate',
      (s) =>
        s.replace(
          "      if (tab === undefined || tab.repoPath === '' || !walkedByRefresh(tab)) return;\n      if (tab.image && !tab.svg) return;\n      if (!returnFloor.admit(tab.repoPath)) return;\n",
          "      if (tab === undefined || !returnFloor.admit(tab.repoPath)) return;\n      if (tab.repoPath === '' || !walkedByRefresh(tab)) return;\n      if (tab.image && !tab.svg) return;\n"
        )
    ]
  ];
  for (const [name, ablate] of ablations) {
    it(`ablation: ${name} reads red`, () => {
      const broken = ablate(STORE);
      expect(broken, 'the ablation found its text').not.toBe(STORE);
      expect(storeFindings(broken).length).toBeGreaterThan(0);
    });
  }
});
