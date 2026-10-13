/**
 * PHASE 347 (issue 33). THE WINDOW DECLARES THE FILES ITS WALK READS, AND A
 * NOTICE FROM MAIN WALKS THEM THROUGH THE WALK'S OWN ROAD, UNFLOORED.
 *
 * build/p347/SPEC.md §4.4 and §5.4, decisions D12 and D17. Main watches one
 * file at a time for the files the worktree watcher cannot see; this file
 * proves the window's half: which files it declares (R1), when it declares
 * them (R2), what a notice does (R3), that a notice never replaces typing
 * (R4), the wiring read from the store's source (R5), and that a draft never
 * saved, beside a watched file, is left alone by the walk a notice starts (R6).
 *
 * WHAT RUNS IS THE SHIPPING STORE, THE SHIPPING WALK AND THE SHIPPING
 * ./open-file-watch. What is faked is only what a node process has no copy
 * of: main, as a map of paths to bytes behind a bridge that counts every call
 * and records every declaration; and the Monaco chunk, as a model that holds
 * a string, made through ./monaco-loader's own registry so the walk's
 * identity question is asked of the real registry. The harness is Phase
 * 334's (p334-reread-on-return.test.ts), so a walk is counted the same way:
 * `readFile` calls under the repository divided by its clean text tabs.
 *
 * R5 reads ./store with the TypeScript parser, so a comment can never satisfy
 * or break it, and each clause is proved on in-memory ablations that must
 * read red. The S rows drive ./open-file-watch alone, over a stub store.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

// -- main, as a map of bytes; every call counted, every declaration kept -------

type Entry = { repoPath: string; path: string };

const disk = new Map<string, string>();
const calls = { readFile: [] as string[], readDir: [] as string[], readImage: [] as string[], showHead: [] as string[] };
const declarations: Entry[][] = [];
let inflight = 0;
let notify: ((repoPath: unknown) => void) | null = null;

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

/** Phase 334's held read: the next `readFile` of `path` takes the disk's bytes when called, then waits. */
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
      onChanged: () => () => undefined,
      // §4.3's two members, as the preload hands them over.
      watchOpenFiles: async (entries: Entry[]) => {
        declarations.push(entries.map((e) => ({ repoPath: e.repoPath, path: e.path })));
        return { watched: entries.length };
      },
      onOpenFileChanged: (cb: (repoPath: unknown) => void) => {
        notify = cb;
        return () => {
          notify = null;
        };
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
const { followMoves } = await import('../../tree/editor-follow');
const { tabIsReadOnly } = await import('../tab-readonly');
const { watchedFilesOf, watchKeyOf, startOpenFileWatch } = await import('../open-file-watch');
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
vi.spyOn(performance, 'now').mockImplementation(() => clock);
let epoch = 1_000_000;
const at = (ms: number): void => {
  clock = epoch + ms;
};

// -- helpers --------------------------------------------------------------------

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

const plain = (t: EditorTab): boolean =>
  t.commit === null &&
  t.remote === undefined &&
  t.archMap === undefined &&
  t.diagnostics === undefined &&
  t.compare === undefined;

/** These tabs in the store, project P on screen; every plain tab's bytes on disk except a draft never saved. */
function seed(tabs: EditorTab[], activeId: string | null = tabs[0]?.id ?? null): void {
  for (const t of useEditor.getState().tabs) disposeModels(t.id);
  disk.clear();
  for (const t of tabs) {
    if (plain(t) && !(t.draft != null && t.savedContents === '')) disk.set(t.path, t.savedContents);
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

function walksOf(repo: string): number {
  const text = useEditor
    .getState()
    .tabs.filter((t) => t.repoPath === repo && plain(t) && !(t.image && !t.svg) && !t.dirty).length;
  const reads = under(calls.readFile, repo);
  expect(text, `no clean text tab in ${repo} to count walks by`).toBeGreaterThan(0);
  expect(reads % text, `${String(reads)} reads over ${String(text)} tabs is not a whole number of walks`).toBe(0);
  return reads / text;
}

const live = (id: string): EditorTab | undefined => useEditor.getState().tabs.find((t) => t.id === id);

/** A notice from main, as the preload hands it to the window. */
function notice(repoPath: unknown): void {
  expect(notify, 'init subscribed to the open file notice').not.toBeNull();
  notify?.(repoPath);
}

type Held = { text: string; getValue(): string };
async function bufferFor(id: string, text: string): Promise<Held> {
  const model = (await ensureWorkingModel(id, text, id)) as unknown as Held | null;
  if (model === null) throw new Error('the faked chunk did not load');
  model.text = text;
  return model;
}

/** `rereadRepo` asked, recorded on the way through; the real action still runs. */
const asked: string[] = [];
let realRereadRepo: ((repoPath: string) => void) | null = null;

let atStart: Entry[][] = [];

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
  atStart = declarations.map((d) => [...d]);
  const real = useEditor.getState().rereadRepo;
  realRereadRepo = real;
  useEditor.setState({
    rereadRepo: (repoPath: string) => {
      asked.push(repoPath);
      real(repoPath);
    }
  });
});

beforeEach(() => {
  epoch += 1_000_000;
  at(0);
  resetCalls();
  asked.length = 0;
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
});

describe('the harness', () => {
  it('wraps the real rereadRepo', () => {
    expect(realRereadRepo).not.toBeNull();
  });
});

// -----------------------------------------------------------------------------
// R1. Which files are declared: the walk's own set (D12).
// -----------------------------------------------------------------------------

describe('R1. the declared set is the set the walk reads', () => {
  const lastDeclared = (): Entry[] => declarations.at(-1) ?? [];

  it('a history, review, map, diagnostics and compare tab, no repository, a relative path and a draft never saved are left out; an image and an SVG are in', () => {
    seed(
      [
        tab(`${A}/a.md`),
        tab('abc123:a.md', { path: `${A}/a.md`, relPath: 'a.md', commit: { sha: 'abc123', shortSha: 'abc123', status: 'M' } as never }),
        tab(`machine:m1:${A}:r.md`, { path: `${A}/r.md`, relPath: 'r.md', remote: { machineId: 'm1', machineLabel: 'far', repoPath: A } as never }),
        tab(`arch-map:${A}`, { path: A, relPath: '', archMap: { repoPath: A } }),
        tab('diagnostics:report', { path: `${A}/report`, relPath: '', diagnostics: { kind: 'report' } }),
        tab(`compare:${A}/c.md`, { path: `${A}/c.md`, relPath: 'c.md', compare: { fileName: 'c.md' } }),
        tab('/elsewhere/n.md', { repoPath: '' }),
        tab('rel/x.md', { path: 'rel/x.md' }),
        tab(`${A}/draft.md`, { draft: 'draft\n', savedContents: '', dirty: true }),
        tab(`${A}/pic.png`, { image: true, svg: false, mode: 'image' }),
        tab(`${A}/logo.svg`, { image: true, svg: true, mode: 'preview' }),
        tab(`${B}/z.md`, { repoPath: B })
      ],
      null
    );
    expect(lastDeclared()).toEqual([
      { repoPath: A, path: `${A}/a.md` },
      { repoPath: A, path: `${A}/pic.png` },
      { repoPath: A, path: `${A}/logo.svg` },
      { repoPath: B, path: `${B}/z.md` }
    ]);
  });

  it('a draft that HAS been saved is a file like any other, and is declared', () => {
    seed([tab(`${A}/draft.md`, { draft: 'draft\n', savedContents: 'draft\n' })], null);
    expect(lastDeclared()).toEqual([{ repoPath: A, path: `${A}/draft.md` }]);
  });

  it('watchedFilesOf lists a path once, the first tab that names it deciding, in tabs order', () => {
    const all = (): boolean => true;
    const tabs = [tab(`${A}/b.ts`), tab(`${A}/a.md`), tab(`${A}/b.ts`, { repoPath: B, id: 'twin' }), tab(`${B}/z.md`, { repoPath: B })];
    expect(watchedFilesOf(tabs, all)).toEqual([
      { repoPath: A, path: `${A}/b.ts` },
      { repoPath: A, path: `${A}/a.md` },
      { repoPath: B, path: `${B}/z.md` }
    ]);
  });

  it('watchedFilesOf asks the predicate it is handed and nothing in its place', () => {
    const tabs = [tab(`${A}/a.md`), tab(`${A}/b.ts`)];
    expect(watchedFilesOf(tabs, (t) => t.path.endsWith('.ts'))).toEqual([{ repoPath: A, path: `${A}/b.ts` }]);
  });
});

// -----------------------------------------------------------------------------
// R2. When it declares: at start, and when the key moves, never on typing.
// -----------------------------------------------------------------------------

describe('R2. one declaration at start, none for typing, one for each move of the set or of a deleted flag', () => {
  it('init declared once, the empty set', () => {
    expect(atStart).toEqual([[]]);
  });

  it('a typing patch, a dirty flip back and a save of a known file send nothing', async () => {
    const id = `${A}/a.md`;
    seed([tab(id), tab(`${A}/b.ts`)], id);
    const before = declarations.length;
    useEditor.getState().markDirty(id, true);
    useEditor.getState().markDirty(id, false);
    useEditor.setState((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, savedContents: TYPED } : t)) }));
    useEditor.getState().activate(`${A}/b.ts`);
    await settle();
    expect(declarations.length - before).toBe(0);
  });

  it('an open is one declaration, its load none more', async () => {
    seed([tab(`${A}/a.md`)], `${A}/a.md`);
    disk.set(`${A}/c.ts`, OLD);
    const before = declarations.length;
    useEditor.getState().openFromRequest({ repoPath: A, relPath: 'c.ts', path: `${A}/c.ts`, mode: 'file', source: 'tree', preview: false });
    await settle();
    expect(live(`${A}/c.ts`)?.savedContents, 'the open loaded').toBe(OLD);
    expect(declarations.length - before).toBe(1);
    expect(declarations.at(-1)?.map((e) => e.path)).toEqual([`${A}/a.md`, `${A}/c.ts`]);
  });

  it('a close is one declaration', async () => {
    seed([tab(`${A}/a.md`), tab(`${A}/b.ts`)], `${A}/a.md`);
    const before = declarations.length;
    useEditor.getState().closeTab(`${A}/b.ts`);
    await settle();
    expect(declarations.length - before).toBe(1);
    expect(declarations.at(-1)?.map((e) => e.path)).toEqual([`${A}/a.md`]);
  });

  it('an eviction past the cap leaves the declaration with the open that caused it', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => tab(`${A}/f${String(i)}.ts`, { lastUsed: 10 + i }));
    seed(ten, `${A}/f9.ts`);
    disk.set(`${A}/new.ts`, OLD);
    const before = declarations.length;
    useEditor.getState().openFromRequest({ repoPath: A, relPath: 'new.ts', path: `${A}/new.ts`, mode: 'file', source: 'tree', preview: false });
    await settle();
    expect(live(`${A}/f0.ts`), 'the stalest clean tab was evicted').toBeUndefined();
    expect(declarations.length - before).toBe(1);
    const paths = declarations.at(-1)?.map((e) => e.path) ?? [];
    expect(paths).not.toContain(`${A}/f0.ts`);
    expect(paths).toContain(`${A}/new.ts`);
    expect(paths).toHaveLength(10);
  });

  it('a rename is one declaration, under the new path', async () => {
    seed([tab(`${A}/a.md`), tab(`${A}/b.ts`)], `${A}/a.md`);
    const before = declarations.length;
    followMoves([{ from: `${A}/a.md`, to: `${A}/renamed.md`, kind: 'file' }]);
    await settle();
    expect(declarations.length - before).toBe(1);
    expect(declarations.at(-1)?.map((e) => e.path)).toEqual([`${A}/renamed.md`, `${A}/b.ts`]);
  });

  it('a deleted flip each way is one declaration, with the same set', async () => {
    const id = `${A}/notes/a.md`;
    seed([tab(id), tab(`${A}/b.ts`)], id);
    const before = declarations.length;
    disk.delete(id);
    notice(A);
    await settle();
    expect(live(id)?.deleted, 'the walk marked it deleted').toBe(true);
    expect(declarations.length - before).toBe(1);
    disk.set(id, NEW);
    notice(A);
    await settle();
    expect(live(id)?.deleted, 'the walk found it again').toBe(false);
    expect(declarations.length - before).toBe(2);
    expect(declarations.at(-1)).toEqual(declarations.at(-2));
    expect(declarations.at(-1)?.map((e) => e.path)).toEqual([id, `${A}/b.ts`]);
  });

  it('watchKeyOf moves for the set and for deleted, and for nothing a keystroke or a save moves', () => {
    const all = (): boolean => true;
    const base = [tab(`${A}/a.md`), tab(`${A}/b.ts`)];
    const key = watchKeyOf(base, all);
    expect(watchKeyOf([{ ...base[0]!, dirty: true, savedContents: TYPED, lastUsed: 99 }, base[1]!], all)).toBe(key);
    expect(watchKeyOf([{ ...base[0]!, deleted: true }, base[1]!], all)).not.toBe(key);
    expect(watchKeyOf([base[0]!], all)).not.toBe(key);
    expect(watchKeyOf([base[1]!, base[0]!], all)).not.toBe(key);
    expect(watchKeyOf([{ ...base[0]!, repoPath: B }, base[1]!], all)).not.toBe(key);
  });
});

// -----------------------------------------------------------------------------
// R3. A notice walks, through rereadRepo, unfloored (D17).
// -----------------------------------------------------------------------------

describe('R3. a notice walks its repository once, through rereadRepo, and is never floored', () => {
  it('a repository with a walked tab: one walk', async () => {
    seed([tab(`${A}/notes/a.md`), tab(`${B}/z.md`, { repoPath: B })], null);
    notice(A);
    await settle();
    expect(asked).toEqual([A]);
    expect(walksOf(A)).toBe(1);
    expect(under(calls.readFile, B)).toBe(0);
  });

  it('a repository whose only tab the walk refuses, and one with no tab: nothing asked, nothing read', async () => {
    seed(
      [
        tab(`${A}/a.md`),
        tab('abc123:z.md', { path: `${B}/z.md`, relPath: 'z.md', repoPath: B, commit: { sha: 'abc123', shortSha: 'abc123', status: 'M' } as never })
      ],
      null
    );
    notice(B);
    notice('/w/none');
    await settle();
    expect(asked).toEqual([]);
    expect(calls.readFile).toEqual([]);
    expect(calls.readDir).toEqual([]);
    expect(calls.showHead).toEqual([]);
  });

  it('a notice that is not a string asks nothing', async () => {
    seed([tab(`${A}/a.md`)], null);
    notice(undefined);
    notice(42);
    await settle();
    expect(asked).toEqual([]);
    expect(calls.readFile).toEqual([]);
  });

  it('two notices 10 ms apart, inside the return floor a door already took, are both asked and both walk', async () => {
    seed([tab(`${A}/notes/a.md`)], `${A}/notes/a.md`);
    at(0);
    useEditor.getState().rereadOnReturn(`${A}/notes/a.md`);
    await settle();
    expect(walksOf(A), 'the door walked and took the floor').toBe(1);
    at(10);
    notice(A);
    at(20);
    notice(A);
    await settle();
    expect(asked).toEqual([A, A, A]);
    expect(walksOf(A)).toBe(3);
    // The control: a door at the same moment IS floored.
    at(30);
    useEditor.getState().rereadOnReturn(`${A}/notes/a.md`);
    await settle();
    expect(walksOf(A)).toBe(3);
  });

  it('the last of a burst is shown: the walk after the last notice reads the last bytes', async () => {
    const id = `${A}/notes/a.md`;
    seed([tab(id)], id);
    const model = await bufferFor(id, OLD);
    for (let i = 0; i < 5; i += 1) {
      at(i * 400);
      disk.set(id, `write ${String(i)}\n`);
      notice(A);
      await settle();
    }
    expect(live(id)?.savedContents).toBe('write 4\n');
    expect(model.getValue()).toBe('write 4\n');
  });
});

// -----------------------------------------------------------------------------
// R4. THE SAFETY CLAUSE, through the notice.
// -----------------------------------------------------------------------------

describe('R4. a notice never replaces a person’s typing; the same tab clean takes the disk', () => {
  const id = `${A}/notes/a.md`;

  it('dirty: the buffer and savedContents stand, and the walk did run', async () => {
    seed([tab(id), tab(`${A}/b.ts`)], id);
    const model = await bufferFor(id, TYPED);
    useEditor.getState().markDirty(id, true);
    disk.set(id, NEW);
    notice(A);
    await settle();
    expect(under(calls.readDir, A), 'the walk visited both tabs').toBe(2);
    expect(calls.readFile).not.toContain(id);
    expect(model.getValue()).toBe(TYPED);
    expect(live(id)?.savedContents).toBe(OLD);
    expect(live(id)?.dirty).toBe(true);
    expect(getWorkingModel(id)).toBe(model);
  });

  it('a keystroke after the walk’s read was opened: the typing stands', async () => {
    seed([tab(id)], id);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    const held = holdNextRead(id);
    notice(A);
    await held.reached;
    model.text = TYPED;
    useEditor.getState().markDirty(id, true);
    held.release();
    await settle();
    expect(calls.readFile, 'the notice’s walk read the file it held').toContain(id);
    expect(model.getValue()).toBe(TYPED);
    expect(live(id)?.savedContents).toBe(OLD);
    expect(live(id)?.dirty).toBe(true);
  });

  it('clean: the new bytes land in savedContents and the buffer', async () => {
    seed([tab(id)], id);
    const model = await bufferFor(id, OLD);
    disk.set(id, NEW);
    notice(A);
    await settle();
    expect(live(id)?.savedContents).toBe(NEW);
    expect(live(id)?.dirty).toBe(false);
    expect(model.getValue()).toBe(NEW);
    expect(getWorkingModel(id)).toBe(model);
  });
});

// -----------------------------------------------------------------------------
// R6. A DRAFT NEVER SAVED beside a watched file (the attack lens's minor).
// -----------------------------------------------------------------------------

describe('R6. a notice leaves a draft never saved exactly as it was, while the watched file beside it updates', () => {
  it('the draft: not deleted, editable, its buffer and empty savedContents intact; notes/a.md: the new bytes', async () => {
    const watched = `${A}/notes/a.md`;
    const draft = `${A}/notes/draft.md`;
    const DRAFT_TEXT = 'a draft the person is still writing\n';
    seed([tab(watched), tab(draft, { draft: DRAFT_TEXT, savedContents: '', dirty: true })], draft);
    expect(disk.has(draft), 'a draft never saved has no file').toBe(false);
    const watchedModel = await bufferFor(watched, OLD);
    const draftModel = await bufferFor(draft, DRAFT_TEXT);
    disk.set(watched, NEW);
    notice(A);
    await settle();
    const d = live(draft);
    expect(d?.deleted, 'the draft is not marked deleted').toBe(false);
    expect(d !== undefined && tabIsReadOnly(d, null), 'the draft is still editable').toBe(false);
    expect(d?.dirty).toBe(true);
    expect(d?.savedContents).toBe('');
    expect(draftModel.getValue()).toBe(DRAFT_TEXT);
    expect(getWorkingModel(draft)).toBe(draftModel);
    expect(live(watched)?.savedContents).toBe(NEW);
    expect(watchedModel.getValue()).toBe(NEW);
  });
});

// -----------------------------------------------------------------------------
// S. ./open-file-watch alone, over a stub store.
// -----------------------------------------------------------------------------

describe('S. startOpenFileWatch over a stub store', () => {
  function rig(over: { declare?: ((e: Entry[]) => Promise<unknown>) | null; onChanged?: boolean } = {}) {
    const log: string[] = [];
    const sent: Entry[][] = [];
    const changed: string[] = [];
    let listener: (() => void) | null = null;
    let cb: ((repoPath: string) => void) | null = null;
    let tabs: EditorTab[] = [tab(`${A}/a.md`)];
    let walkedCalls = 0;
    const declare =
      over.declare === null
        ? undefined
        : (over.declare ??
          (async (e: Entry[]) => {
            log.push('declare');
            sent.push(e);
            return { watched: e.length };
          }));
    const stop = startOpenFileWatch({
      subscribe: (l) => {
        log.push('subscribe');
        listener = l;
        return () => {
          log.push('unsubscribe');
          listener = null;
        };
      },
      tabs: () => tabs,
      walked: () => {
        walkedCalls += 1;
        return true;
      },
      declare,
      onChanged:
        over.onChanged === false
          ? undefined
          : (c) => {
              log.push('onChanged');
              cb = c;
              return () => {
                log.push('offChanged');
                cb = null;
              };
            },
      changed: (r) => changed.push(r)
    });
    return {
      log,
      sent,
      changed,
      stop,
      setTabs: (next: EditorTab[]) => {
        tabs = next;
        listener?.();
      },
      tick: () => listener?.(),
      emit: (r: unknown) => (cb as ((x: unknown) => void) | null)?.(r),
      walked: () => walkedCalls,
      listening: () => listener !== null
    };
  }

  it('S1 no declare member: nothing subscribed, nothing listened to', () => {
    const r = rig({ declare: null });
    expect(r.log).toEqual([]);
    expect(r.listening()).toBe(false);
  });

  it('S1 no notice member: nothing declared, nothing subscribed', () => {
    const r = rig({ onChanged: false });
    expect(r.log).toEqual([]);
    expect(r.sent).toEqual([]);
  });

  it('S2 the notice listener is in place before the first declaration', () => {
    const r = rig();
    expect(r.log).toEqual(['onChanged', 'declare', 'subscribe']);
    expect(r.sent).toEqual([[{ repoPath: A, path: `${A}/a.md` }]]);
  });

  it('S3 a store change that touched no tab computes nothing; one that keeps the key declares nothing; one that moves it declares once', () => {
    const r = rig();
    const walked = r.walked();
    r.tick();
    r.tick();
    expect(r.walked(), 'the same tabs array asks nothing').toBe(walked);
    r.setTabs([tab(`${A}/a.md`, { dirty: true })]);
    expect(r.sent).toHaveLength(1);
    r.setTabs([tab(`${A}/a.md`), tab(`${A}/b.ts`)]);
    expect(r.sent).toHaveLength(2);
    expect(r.sent.at(-1)?.map((e) => e.path)).toEqual([`${A}/a.md`, `${A}/b.ts`]);
  });

  it('S4 a refused declaration, rejected or thrown, is swallowed and the next one still goes', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      let n = 0;
      const r = rig({
        declare: (e) => {
          n += 1;
          if (n === 1) return Promise.reject(new Error('main refused'));
          if (n === 2) throw new Error('the bridge threw');
          return Promise.resolve({ watched: e.length });
        }
      });
      expect(() => r.setTabs([tab(`${A}/b.ts`)])).not.toThrow();
      r.setTabs([tab(`${A}/c.ts`)]);
      expect(n).toBe(3);
      for (let i = 0; i < 5; i += 1) await new Promise((res) => setImmediate(res));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('S5 no timer, ever', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'setImmediate'] });
    try {
      const r = rig();
      r.setTabs([tab(`${A}/b.ts`)]);
      r.emit(A);
      r.stop();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('S6 a notice hands its repository to changed, once; anything not a string is dropped', () => {
    const r = rig();
    r.emit(A);
    r.emit(undefined);
    r.emit({ repoPath: A });
    expect(r.changed).toEqual([A]);
  });

  it('S7 the stop unsubscribes both and declares nothing', () => {
    const r = rig();
    r.stop();
    expect(r.log.slice(-2).sort()).toEqual(['offChanged', 'unsubscribe']);
    expect(r.sent).toHaveLength(1);
  });
});

// -----------------------------------------------------------------------------
// R5. The wiring, read from ./store with the TypeScript parser.
// -----------------------------------------------------------------------------

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const STORE = readFileSync(resolve(ROOT, 'src/renderer/editor/store.ts'), 'utf8');

/** §2.5, in one sentence, so a reader of a red run knows why the door is wrong. */
const FLOOR_REASON =
  'Phase 334’s 1,000 ms return floor drops the last write in 4 of 6 schedules (build/p347/SPEC.md §2.5, issue 33’s own step 4 among them), and a dropped last write is issue 33 again';

function each(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (c) => each(c, visit));
}

function calleeName(call: ts.CallExpression): string | null {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

function callsIn(node: ts.Node): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  each(node, (n) => {
    if (ts.isCallExpression(n)) out.push(n);
  });
  return out;
}

/** Everything wrong with the store's open file wiring, or an empty list. */
function wiringFindings(source: string): string[] {
  const sf = ts.createSourceFile('store.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const inits: ts.MethodDeclaration[] = [];
  each(sf, (n) => {
    if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'init' && n.body !== undefined) inits.push(n);
  });
  if (inits.length !== 1) return [`the store has ${String(inits.length)} init methods, not 1`];
  const init = inits[0]!;
  const everywhere = callsIn(sf).filter((c) => calleeName(c) === 'startOpenFileWatch');
  const inInit = callsIn(init).filter((c) => calleeName(c) === 'startOpenFileWatch');
  if (inInit.length !== 1) return [`init calls startOpenFileWatch( ${String(inInit.length)} times, not once`];
  if (everywhere.length !== 1) out.push(`startOpenFileWatch( is called ${String(everywhere.length)} times in the store, not once`);
  const call = inInit[0]!;

  // Directly after the bus's own block (§4.4).
  const stmts = init.body!.statements;
  const at = stmts.findIndex((s) => s.pos <= call.pos && call.end <= s.end);
  const prev = at > 0 ? stmts[at - 1] : undefined;
  const prevIsBus =
    prev !== undefined &&
    ts.isExpressionStatement(prev) &&
    ts.isCallExpression(prev.expression) &&
    calleeName(prev.expression) === 'onRepoChanged';
  if (!prevIsBus) out.push('startOpenFileWatch( is not the statement directly after the onRepoChanged( block');

  const arg = call.arguments[0];
  if (arg === undefined || !ts.isObjectLiteralExpression(arg)) return [...out, 'startOpenFileWatch( is not handed an object literal'];
  const prop = (name: string): ts.Expression | null => {
    for (const p of arg.properties) {
      if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name) return p.initializer;
    }
    return null;
  };
  const walked = prop('walked');
  if (walked === null || !ts.isIdentifier(walked) || walked.text !== 'walkedByRefresh') {
    out.push('walked is not walkedByRefresh, so the declared set can drift from the walked set (D12)');
  }
  const declare = prop('declare');
  if (declare === null || !declare.getText(sf).includes('watchOpenFiles')) out.push('declare does not hand over the bridge’s watchOpenFiles');
  const onChanged = prop('onChanged');
  if (onChanged === null || !onChanged.getText(sf).includes('onOpenFileChanged')) {
    out.push('onChanged does not hand over the bridge’s onOpenFileChanged');
  }

  const changed = prop('changed');
  if (changed === null || !(ts.isArrowFunction(changed) || ts.isFunctionExpression(changed))) {
    return [...out, 'changed is not a function'];
  }
  const names = callsIn(changed).map((c) => ({ name: calleeName(c), pos: c.getStart(sf) }));
  const road = names.find((c) => c.name === 'rereadRepo');
  if (names.some((c) => c.name === 'rereadOnReturn')) out.push(`changed names rereadOnReturn(: ${FLOOR_REASON}`);
  if (names.some((c) => c.name === 'refreshRepo')) out.push('changed names refreshRepo( directly, past the road every door takes');
  if (road === undefined) out.push('changed never names rereadRepo(, so a notice reads nothing');
  const guard = names.find((c) => c.name === 'walkedByRefresh');
  if (guard === undefined) out.push('changed walks without asking walkedByRefresh whether the repository holds a walked tab');
  else if (road !== undefined && guard.pos > road.pos) out.push('changed asks walkedByRefresh after it walks');
  return out;
}

describe('R5. init wires the watch once, and a notice takes rereadRepo’s road', () => {
  it('the shipping source reads clean', () => {
    expect(wiringFindings(STORE)).toEqual([]);
  });

  const CALL = /\n {6}startOpenFileWatch\(\{[\s\S]*?\n {6}\}\);/;
  const ROAD = '          get().rereadRepo(repoPath);\n';
  const GUARD = ' && walkedByRefresh(t))) return;';
  const ablations: Array<[string, (s: string) => string, string]> = [
    [
      'rereadOnReturn substituted',
      (s) => s.replace(ROAD, '          for (const t of get().tabs) if (t.repoPath === repoPath) get().rereadOnReturn(t.id);\n'),
      '§2.5'
    ],
    ['the walkedByRefresh test removed', (s) => s.replace(GUARD, ')) return;'), 'walkedByRefresh'],
    ['the call removed', (s) => s.replace(CALL, ''), 'startOpenFileWatch'],
    ['refreshRepo substituted', (s) => s.replace(ROAD, '          void io.refreshRepo(repoPath);\n'), 'refreshRepo'],
    ['another predicate handed in', (s) => s.replace('        walked: walkedByRefresh,\n', '        walked: () => true,\n'), 'D12'],
    [
      'the call moved above the bus',
      (s) => {
        const m = CALL.exec(s);
        if (m === null) return s;
        return s.replace(m[0], '').replace('\n      onRepoChanged((repoPath) => {', `${m[0]}\n      onRepoChanged((repoPath) => {`);
      },
      'onRepoChanged'
    ]
  ];
  for (const [name, ablate, word] of ablations) {
    it(`ablation: ${name} reads red`, () => {
      const broken = ablate(STORE);
      expect(broken, 'the ablation found its text').not.toBe(STORE);
      const findings = wiringFindings(broken);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.join('\n')).toContain(word);
    });
  }
});
