/**
 * PHASE 282.2's FIX ROUND. A SECOND ⌘Z, AND WHAT THE ROUND LEFT STANDING.
 *
 * THIS FILE IS PHASE 282.2's ATTACK VERIFIER'S RIG, ADOPTED, the way
 * ./p2822-after-undo.test.ts is Phase 282.1's. That file hears an undo only as
 * `markDirty(id, false)` and draws a dirty tab from `savedContents`, because it
 * mocks ../redline-edits and ../live-text; so it could not see what the
 * verifier then drove. This one mocks neither:
 *
 * - a keystroke is a real cancelable `beforeinput` at `.ed-redline-doc`;
 * - ⌘Z and ⌘⇧Z are real keydowns, answered by ../redline-edits' capture
 *   listener with `model.undo()` and `model.redo()`;
 * - a DIRTY TAB DRAWS ITS BUFFER (../live-text), which is the whole finding;
 * - the watcher's tick is the store's own `onRepoChanged` subscription;
 * - main is per path, a sha256 compare-and-swap, with named gates.
 *
 * WHAT IS FAKED, AND IT IS THE LIMIT OF THIS LANE: the Monaco chunk is a model
 * with monaco's undo semantics as the verifier wrote them down —
 * `pushStackElement` closes the open element, `pushEditOperations` appends to
 * an open element or opens one and clears redo, `undo`/`redo` move whole
 * elements and fire `onDidChangeContent` synchronously. The real Monaco's
 * answer is the app run's: `probe:redlinemoveon` arm X.
 *
 * WHAT WAS FIXED (the first describe). Two ⌘Z in a row, the second INSIDE the
 * read the first had pulled, on a tab whose model had followed the agent's
 * write as an undoable reload (any tab that was ever shown in File view): the
 * second undo un-applied that reload, the buffer held the text from BEFORE the
 * agent wrote, and its picture drew no change. ../redline-press `releaseHolds`
 * took that for the redraw the rewind was waiting for and let the hold go; the
 * read answered a dirty tab and was dropped; ⌘⇧Z made the tab clean over the
 * agent's bytes with the rewound change drawn, no hold, and so no read owed.
 * ⌥↩ accepted the change the person had rewound with nothing said, the next
 * read drew it backwards, and the next ⌥⌫ wrote the agent's word back. A hold
 * whose adoption refused now goes on BYTES and never on a picture alone.
 *
 * WHAT WAS NOT (the second describe), MEASURED AND PINNED AS IT STANDS. Each
 * needs a ruling that is the operator's and not a fix round's
 * (build/p282/SPEC.md §12, "STATED LIMITS"), so nothing was built for them and
 * they are written here as SEEDS: the entry that closes one rewrites its
 * expectations, exactly as ./p2822-after-undo.test.ts rewrote the 282.1
 * reverifier's.
 */

import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { arrivalOver, ownTheStoreClock } from './p334-arrival';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_NODE = 9;
const HTML_NS = 'http://www.w3.org/1999/xhtml';

interface FakeEvent {
  type: string;
  target: FakeNode;
  srcElement: FakeNode;
  currentTarget: FakeNode | null;
  defaultPrevented: boolean;
  cancelBubble: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
  [key: string]: unknown;
}
type Listener = { fn: (event: FakeEvent) => void; capture: boolean };

class FakeNode {
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  nodeValue: string | null = null;
  private listeners = new Map<string, Listener[]>();
  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
    public ownerDocument: FakeDocument | null
  ) {}
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const siblings = this.parentNode?.childNodes ?? [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
  get previousSibling(): FakeNode | null {
    const siblings = this.parentNode?.childNodes ?? [];
    const at = siblings.indexOf(this);
    return at > 0 ? (siblings[at - 1] ?? null) : null;
  }
  get parentElement(): FakeElement | null {
    return this.parentNode instanceof FakeElement ? this.parentNode : null;
  }
  appendChild(child: FakeNode): FakeNode {
    return this.insertBefore(child, null);
  }
  insertBefore(child: FakeNode, ref: FakeNode | null): FakeNode {
    child.parentNode?.removeChild(child);
    const at = ref === null ? this.childNodes.length : this.childNodes.indexOf(ref);
    this.childNodes.splice(at, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild(child: FakeNode): FakeNode {
    const at = this.childNodes.indexOf(child);
    if (at !== -1) this.childNodes.splice(at, 1);
    child.parentNode = null;
    const doc = this.ownerDocument ?? (this instanceof FakeDocument ? this : null);
    const active = doc?.activeElement ?? null;
    if (doc !== null && active !== null && child.contains(active)) doc.activeElement = doc.body;
    return child;
  }
  contains(other: FakeNode | null): boolean {
    for (let n = other; n !== null; n = n.parentNode) if (n === this) return true;
    return false;
  }
  get textContent(): string {
    if (this.nodeType === TEXT_NODE) return this.nodeValue ?? '';
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(text: string) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    if (text !== '' && this.ownerDocument !== null) this.appendChild(this.ownerDocument.createTextNode(text));
  }
  addEventListener(type: string, fn: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    const capture = options === true || (typeof options === 'object' && options.capture === true);
    const list = this.listeners.get(type) ?? [];
    list.push({ fn, capture });
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, fn: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    const capture = options === true || (typeof options === 'object' && options.capture === true);
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((l) => l.fn !== fn || l.capture !== capture)
    );
  }
  fire(event: FakeEvent, capture: boolean): void {
    for (const l of [...(this.listeners.get(event.type) ?? [])]) {
      if (l.capture === capture) {
        event.currentTarget = this;
        l.fn(event);
      }
    }
  }
}

function dispatch(target: FakeNode, init: Record<string, unknown> & { type: string }): FakeEvent {
  const event: FakeEvent = {
    ...init,
    target,
    srcElement: target,
    currentTarget: null,
    defaultPrevented: false,
    cancelBubble: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {
      event.cancelBubble = true;
    }
  };
  const path: FakeNode[] = [];
  for (let n: FakeNode | null = target; n !== null; n = n.parentNode) path.push(n);
  for (const n of [...path].reverse()) {
    n.fire(event, true);
    if (event.cancelBubble) return event;
  }
  for (const n of path) {
    n.fire(event, false);
    if (event.cancelBubble) return event;
  }
  return event;
}

function matches(el: FakeElement, selector: string): boolean {
  const parts = selector.match(/\.[\w-]+|\[[\w-]+\]/g) ?? [];
  if (parts.join('') !== selector) throw new Error(`the fake document does not parse ${selector}`);
  const classes = (el.getAttribute('class') ?? '').split(/\s+/);
  return parts.every((p) => (p.startsWith('.') ? classes.includes(p.slice(1)) : el.hasAttribute(p.slice(1, -1))));
}

class FakeElement extends FakeNode {
  readonly namespaceURI = HTML_NS;
  readonly attributes = new Map<string, string>();
  readonly style: Record<string, string> & { setProperty: (k: string, v: string) => void; removeProperty: (k: string) => void };
  readonly classList = { add() {}, remove() {}, contains: () => false };
  clientWidth = 900;
  offsetWidth = 900;
  scrollTop = 0;
  scrollLeft = 0;
  constructor(readonly tagName: string, owner: FakeDocument | null) {
    super(ELEMENT_NODE, tagName, owner);
    const style = {} as FakeElement['style'];
    style.setProperty = (k, v) => {
      style[k] = v;
    };
    style.removeProperty = (k) => {
      delete style[k];
    };
    this.style = style;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase());
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }
  get dataset(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, value] of this.attributes) {
      if (name.startsWith('data-')) out[name.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return out;
  }
  closest(selector: string): FakeElement | null {
    for (let n: FakeNode | null = this; n instanceof FakeElement; n = n.parentNode) if (matches(n, selector)) return n;
    return null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (n: FakeNode): void => {
      for (const c of n.childNodes) {
        if (c instanceof FakeElement) {
          if (matches(c, selector)) out.push(c);
          walk(c);
        }
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  focus(): void {
    const doc = this.ownerDocument;
    if (doc === null || !doc.documentElement.contains(this)) return;
    if (!this.hasAttribute('tabindex') && this.tagName !== 'BUTTON') return;
    if (doc.activeElement === this) return;
    const was = doc.activeElement;
    doc.activeElement = this;
    dispatch(this, { type: 'focusin', relatedTarget: was });
  }
  getClientRects(): never[] {
    return [];
  }
  getBoundingClientRect(): { top: number; left: number; right: number; bottom: number; width: number; height: number } {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
}

class FakeDocument extends FakeNode {
  readonly documentElement: FakeElement;
  readonly body: FakeElement;
  activeElement: FakeElement | null;
  readonly defaultView: Record<string, unknown>;
  constructor() {
    super(DOCUMENT_NODE, '#document', null);
    this.documentElement = new FakeElement('HTML', this);
    this.body = new FakeElement('BODY', this);
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
    this.defaultView = { document: this, HTMLIFrameElement: class {}, getSelection: () => null };
  }
  createElement(tag: string): FakeElement {
    return new FakeElement(tag.toUpperCase(), this);
  }
  createElementNS(_ns: string, tag: string): FakeElement {
    return this.createElement(tag);
  }
  createTextNode(text: string): FakeNode {
    const node = new FakeNode(TEXT_NODE, '#text', this);
    node.nodeValue = text;
    return node;
  }
  getSelection(): null {
    return null;
  }
}

const doc = new FakeDocument();
const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

// ---------------------------------------------------------------------------
// MAIN, faked. Per-path files (a tab switch needs two), a sha256
// compare-and-swap, named gates. ./p282-gated-fs is one file wide, which is
// why this rig carries its own.
// ---------------------------------------------------------------------------
interface Gate {
  label: string;
  release: () => void;
}
const main = {
  files: new Map<string, string>(),
  reads: 0,
  writes: 0,
  walks: 0,
  gates: [] as Gate[],
  held: new Set<string>(),
  writeLog: [] as string[],
  reset(files: Record<string, string>): void {
    this.files = new Map(Object.entries(files));
    this.reads = 0;
    this.writes = 0;
    this.walks = 0;
    this.gates.length = 0;
    this.held.clear();
    this.writeLog.length = 0;
  },
  hold(...labels: string[]): void {
    for (const l of labels) this.held.add(l);
  },
  waiting(): string {
    return this.gates.map((g) => g.label).join(',');
  },
  take(label: string): (() => void) | null {
    const at = this.gates.findIndex((g) => g.label === label);
    if (at === -1) return null;
    const [g] = this.gates.splice(at, 1);
    return g?.release ?? null;
  }
};
const gate = (label: string): Promise<void> =>
  main.held.has(label)
    ? new Promise<void>((release) => {
        main.gates.push({ label, release });
      })
    : Promise.resolve();
const dirOf = (p: string): string => p.slice(0, p.lastIndexOf('/')) || '/';
const nameOf = (p: string): string => p.slice(p.lastIndexOf('/') + 1);
const heads = new Map<string, string>();

/** PHASE 334. The view's arrival reads every open tab: ./p334-arrival says why it is answered apart. */
const arrival = arrivalOver(async (path: string) => {
  main.reads += 1;
  await gate(`read#${String(main.reads)}`);
  return { contents: main.files.get(path) ?? '', truncated: false };
});
ownTheStoreClock();

const fakeFs = {
  readFile: arrival.readFile,
  writeGuarded: async (input: { path: string; expect: string; contents: string }) => {
    main.writes += 1;
    await gate(`write#${String(main.writes)}`);
    const now = sha(main.files.get(input.path) ?? '');
    if (now !== input.expect) {
      main.writeLog.push(`stale ${input.contents}`);
      return { outcome: 'stale' as const, sha256: now, reason: 'changed since it was read' };
    }
    main.files.set(input.path, input.contents);
    main.writeLog.push(`wrote ${input.contents}`);
    return { outcome: 'wrote' as const, sha256: sha(input.contents), bytes: input.contents.length };
  },
  readDir: async (dir: string) => ({
    entries: [...main.files.keys()].filter((p) => dirOf(p) === dir).map((p) => ({ name: nameOf(p) }))
  }),
  readImage: vi.fn(),
  writeFile: async () => {
    throw new Error('the plain door must not be used');
  }
};

// ---------------------------------------------------------------------------
// THE MONACO CHUNK, faked with monaco's undo semantics (the header says which).
// ---------------------------------------------------------------------------
interface StackElement {
  before: string;
  after: string;
  open: boolean;
}
class UndoModel {
  private text: string;
  private subs: Array<() => void> = [];
  readonly undoStack: StackElement[] = [];
  readonly redoStack: StackElement[] = [];
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
  private fire(): void {
    for (const s of [...this.subs]) s();
  }
  pushStackElement(): void {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top !== undefined) top.open = false;
  }
  undo(): void {
    const el = this.undoStack.pop();
    if (el === undefined) return;
    el.open = false;
    this.text = el.before;
    this.redoStack.push(el);
    this.fire();
  }
  redo(): void {
    const el = this.redoStack.pop();
    if (el === undefined) return;
    this.text = el.after;
    this.undoStack.push(el);
    this.fire();
  }
  onDidChangeContent(fn: () => void): { dispose: () => void } {
    this.subs.push(fn);
    return {
      dispose: () => {
        this.subs = this.subs.filter((s) => s !== fn);
      }
    };
  }
  getPositionAt(offset: number): { lineNumber: number; column: number } {
    return { lineNumber: 1, column: offset + 1 };
  }
  pushEditOperations(
    _selections: unknown,
    ops: Array<{ range: { startColumn: number; endColumn: number }; text: string }>
  ): null {
    const before = this.text;
    for (const op of ops) {
      this.text = this.text.slice(0, op.range.startColumn - 1) + op.text + this.text.slice(op.range.endColumn - 1);
    }
    const top = this.undoStack[this.undoStack.length - 1];
    if (top !== undefined && top.open) top.after = this.text;
    else this.undoStack.push({ before, after: this.text, open: true });
    this.redoStack.length = 0;
    this.fire();
    return null;
  }
}

const caret = vi.hoisted(() => ({ at: 0 }));
const watcher = vi.hoisted(() => ({ fire: null as null | ((repoPath: string) => void) }));

vi.mock('../monaco-impl', () => ({
  monaco: {
    Uri: { from: (o: object) => o },
    editor: { getModel: () => null, createModel: (t: string) => new UndoModel(t) },
    languages: { getLanguages: () => [] }
  }
}));
vi.mock('../../state/repo-changed', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  onRepoChanged: (listener: (repoPath: string) => void) => {
    watcher.fire = listener;
    return () => undefined;
  }
}));
vi.mock('../redline-caret', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  spanOfInput: () => ({ anchor: caret.at, focus: caret.at }),
  readCurrentSelection: () => ({ anchor: caret.at, focus: caret.at }),
  restoreCurrentSelection: (_root: unknown, want: { focus: number }) => {
    caret.at = want.focus;
  },
  changeAtCaret: () => null
}));
vi.mock('../MonacoHost', () => ({ OpeningSkeleton: () => null }));
vi.mock('../redline-chip', () => ({ RedlineChip: () => null }));
vi.mock('../../app/menu-redline', () => ({ pushRedlineMountedToMenu: () => undefined }));

vi.stubGlobal('window', {
  document: undefined,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  HTMLIFrameElement: class {},
  gmux: {
    setSessionsPosition: async () => {},
    setProjectsPosition: async () => {},
    fs: fakeFs,
    git: {
      showHead: async (input: { path: string }) => {
        main.walks += 1;
        return heads.get(input.path) ?? '';
      },
      onChanged: () => () => {}
    },
    baselines: { store: async () => ({ stored: false }), load: async () => null, forget: async () => undefined },
    machines: {}
  }
});
vi.stubGlobal('document', doc);
vi.stubGlobal('HTMLElement', FakeElement);
vi.stubGlobal('Element', FakeElement);
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { useEditor } = await import('../store');
const { useApp } = await import('../../state/store');
const { useSettingsStore } = await import('../../settings/settings-store');
const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
const { forgetRewindJournal } = await import('../redline-journal');
const { runRedlineCommand } = await import('../redline-commands');
const { getWorkingModel, ensureWorkingModel, resetWorkingModel } = (await import('../monaco-loader')) as unknown as {
  getWorkingModel: (id: string) => UndoModel | null;
  ensureWorkingModel: (id: string, contents: string, path: string) => Promise<UndoModel | null>;
  resetWorkingModel: (id: string, contents: string) => void;
};
type EditorTab = import('../store').EditorTab;

const toasts: string[] = [];
const ROOT = '/repo';
const ID = `${ROOT}/notes.txt`;
const OTHER = `${ROOT}/other.txt`;
const BASE = 'The quick brown fox jumps over the lazy dog.\n';
const AGENT = 'The quick red fox leaps over the lazy dog.\n';
const REWOUND = 'The quick brown fox leaps over the lazy dog.\n';
/** The baseline once "brown"->"red" alone has been accepted. */
const RED_ACCEPTED = 'The quick red fox jumps over the lazy dog.\n';
const KEY = 'x';
/** The caret sits after "lazy", below both changes, as the probe's arms put it below every change. */
const KEY_AT = AGENT.indexOf('lazy') + 4;
const withKey = (t: string): string => {
  const at = t.indexOf('lazy') + 4;
  return `${t.slice(0, at)}${KEY}${t.slice(at)}`;
};
const ACCEPT_DIRTY =
  'A change in notes.txt was rewound, but your unsaved edits still show it, so nothing was accepted. Save or undo your edits first, then accept.';
const RED = '"brown"->"red"';
const LEAPS = '"jumps"->"leaps"';
const BACKWARDS = '"red"->"brown"';

function tabOf(id: string, head: string, saved: string): EditorTab {
  return {
    id, path: id, relPath: nameOf(id), origRelPath: null, repoPath: ROOT, name: nameOf(id), projectId: 'p',
    mode: 'redline', canDiff: true, markdown: false, image: false, svg: false, html: false, imageData: null,
    imageHead: null, imageRevision: 0, preview: false, commit: null, pendingSelection: null, pendingFocus: false,
    dirty: false, deleted: false, truncated: false, loading: false, error: null, savedContents: saved,
    headContents: head, baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: head }, 1), lastUsed: 0,
    contextEntry: null
  } as unknown as EditorTab;
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r));
};
const act = async (fn: () => void | Promise<void>): Promise<void> => {
  await React.act(async () => {
    await fn();
    await settle();
  });
};

let root: ReturnType<typeof createRoot> | null = null;
let container: FakeElement | null = null;
let inited = false;
const mountedIds: string[] = [];

async function mount(tabs: EditorTab[], files: Record<string, string>): Promise<void> {
  main.reset(files);
  toasts.length = 0;
  heads.clear();
  mountedIds.length = 0;
  for (const t of tabs) {
    heads.set(t.relPath, t.headContents ?? '');
    forgetRewindJournal(t.id);
    mountedIds.push(t.id);
  }
  useApp.setState({
    projects: [{ id: 'p', path: ROOT, name: 'repo' }],
    activeProjectId: 'p',
    confirm: null,
    toast: (_kind: string, text: string) => void toasts.push(text)
  } as never);
  const settings = useSettingsStore.getState().settings;
  useSettingsStore.setState({ settings: { ...settings, autoSave: { mode: 'off', delayMs: 1000 } } });
  useEditor.setState({ projectId: 'p', tabs, activeId: tabs[0]?.id ?? null, panelOpen: true } as never);
  if (!inited) {
    // The store's own watcher subscription, so a tick below is the shipping
    // `onRepoChanged` -> `io.refreshRepo`, and never a patch.
    useEditor.getState().init();
    inited = true;
  }
  function View(): React.ReactElement | null {
    const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId));
    // ../EditorPanel draws <RedlineDocument tab={activeTab} /> with no key, and
    // only while the active tab's mode is `redline`.
    return tab === undefined || tab.mode !== 'redline' ? null : React.createElement(RedlineDocument, { tab });
  }
  container = doc.createElement('div');
  doc.body.appendChild(container);
  root = createRoot(container as never);
  // PHASE 334. The arrival is a look over the bytes each tab holds, one walk
  // of the repository, and `files` is the agent's write after it
  // (./p334-arrival). The walks below are counted from there.
  arrival.begin(tabs);
  await act(() => {
    root?.render(React.createElement(View));
  });
  expect({ reads: arrival.done(), walks: main.walks }).toEqual({ reads: tabs.length, walks: tabs.length });
  main.walks = 0;
}

afterEach(async () => {
  // A step still held when a case fails would hold ../tab-io's serializer for
  // every case after it (a walk that never settles is its stated limit), and
  // the first red case would read as seven. Let everything go first.
  main.held.clear();
  for (const waiting of main.gates.splice(0)) waiting.release();
  await settle();
  if (root !== null) await act(() => root?.unmount());
  if (container !== null) doc.body.removeChild(container);
  root = null;
  container = null;
  doc.activeElement = doc.body;
  // A tab id is a path and the model registry outlives a test: drop the model
  // the way the store's own close does.
  for (const id of mountedIds) useEditor.getState().forceCloseTab(id);
  useApp.setState({ confirm: null } as never);
});

const wrappers = (): FakeElement[] => container?.querySelectorAll('.ed-redline-change') ?? [];
const label = (el: FakeElement | null | undefined): string | null =>
  el === null || el === undefined
    ? null
    : `${JSON.stringify(el.getAttribute('data-change-del'))}->${JSON.stringify(el.getAttribute('data-change-ins'))}`;
const drawn = (): (string | null)[] => wrappers().map(label);
const marked = (): string | null => label(container?.querySelector('.ed-redline-change[data-current]'));
const docEl = (): FakeElement => {
  const el = container?.querySelector('.ed-redline-doc') ?? null;
  if (el === null) throw new Error('no .ed-redline-doc is mounted');
  return el;
};
const scroller = (): FakeElement => {
  const el = container?.querySelector('.ed-redline-scroll') ?? null;
  if (el === null) throw new Error('no scroller is mounted');
  return el;
};

const chord = (key: string): Promise<void> =>
  act(() => {
    dispatch(doc.activeElement ?? doc.body, {
      type: 'keydown', key, altKey: true, shiftKey: false, metaKey: false, ctrlKey: false, repeat: false, keyCode: 0
    });
  });
const next = (): Promise<void> => chord('ArrowDown');
const rewind = (): Promise<void> => chord('Backspace');
const accept = (): Promise<void> => chord('Enter');
/** ⌥↓ from the scroller until `want` is the marked change, at most one lap. */
const markChange = async (want: string): Promise<void> => {
  doc.activeElement = scroller();
  for (let i = 0; i < 4 && marked() !== want; i += 1) await next();
  expect(marked()).toBe(want);
};

/** One typed character: the cancelable `beforeinput` ../redline-edits listens for. */
const typeKey = (ch: string): Promise<void> =>
  act(() => {
    doc.activeElement = docEl();
    dispatch(docEl(), { type: 'beforeinput', inputType: 'insertText', data: ch, cancelable: true, dataTransfer: null });
  });
const Z = { type: 'keydown', key: 'z', metaKey: true, ctrlKey: false, altKey: false, keyCode: 0 };
/** ⌘Z, or ⌘⇧Z, as a keydown ../redline-edits answers in the capture phase. */
const cmdZ = (mods: { shift?: boolean; repeat?: boolean } = {}): Promise<void> =>
  act(() => {
    doc.activeElement = docEl();
    dispatch(docEl(), { ...Z, shiftKey: mods.shift === true, repeat: mods.repeat === true });
  });
/** Two ⌘Z keydowns in ONE task: a key repeat that arrives before any reply, or any render, can. */
const cmdZTwiceInOneTask = (): Promise<void> =>
  act(() => {
    doc.activeElement = docEl();
    for (const repeat of [false, true]) dispatch(docEl(), { ...Z, shiftKey: false, repeat });
  });

/**
 * A STEP IS WAITED FOR BY WHAT IT DOES, with a bound, and never by a number of
 * turns alone (./p2822-after-undo.test.ts says why: a rewind hashes on the
 * thread pool, and ../live-text debounces a model change by 150 ms of real
 * time, so how long a step takes is the machine's load and not the code's).
 */
const until = async (what: string, done: () => boolean): Promise<void> => {
  for (let i = 0; i < 1200 && !done(); i += 1) {
    await act(() => new Promise<void>((r) => setTimeout(r, 5)));
  }
  if (!done()) throw new Error(`waited 6 s and ${what} never happened; held: ${main.waiting()}`);
};
const arrives = (l: string): Promise<void> => until(`${l} arriving at its gate`, () => main.gates.some((g) => g.label === l));
const release = async (l: string): Promise<void> => {
  await arrives(l);
  const step = main.take(l);
  if (step === null) throw new Error(`nothing is held at ${l}; held: ${main.waiting()}`);
  await act(() => step());
};
/** Real time, so ../live-text's 150 ms debounce and every continuation have run. */
const rest = (ms = 220): Promise<void> => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const tick = (): Promise<void> =>
  act(() => {
    if (watcher.fire === null) throw new Error('the store never subscribed its watcher');
    watcher.fire(ROOT);
  });
const sameList = (a: readonly unknown[], b: readonly unknown[]): boolean => JSON.stringify(a) === JSON.stringify(b);
/** Wait for the picture, then let the debounce drain so nothing is still on its way. */
const draws = async (want: readonly string[]): Promise<void> => {
  await until(`the picture drawing ${JSON.stringify(want)} (it draws ${JSON.stringify(drawn())})`, () => sameList(drawn(), want));
  await rest();
  expect(drawn()).toEqual(want);
};

const tabNow = (id = ID): EditorTab | undefined => useEditor.getState().tabs.find((t) => t.id === id);
const reading = (): Record<string, unknown> => {
  const t = tabNow();
  return {
    dirty: t?.dirty,
    saved: t?.savedContents,
    disk: main.files.get(ID),
    model: getWorkingModel(ID)?.getValue() ?? null,
    baseline: (t?.baseline as { text?: string } | null | undefined)?.text ?? null
  };
};

/**
 * THE SHAPE THE PHASE EXISTS FOR, through the real typing path: ⌥↓, ⌥⌫ with its
 * write held, a real `beforeinput` inside the write, the landing.
 *
 * `modelFirst` is a tab that was shown in File view earlier in the session:
 * the model exists, was built from BASE, and followed the agent's write as an
 * UNDOABLE reload (../monaco-loader `resetWorkingModel`, Phase 237). That
 * reload is the entry a second ⌘Z un-applies.
 */
async function rewindWithAKeystrokeInsideTheWrite(
  opts: { modelFirst?: boolean; tabs?: EditorTab[]; files?: Record<string, string> } = {}
): Promise<void> {
  if (opts.modelFirst === true) {
    await ensureWorkingModel(ID, BASE, ID);
    resetWorkingModel(ID, AGENT);
  }
  await mount(opts.tabs ?? [tabOf(ID, BASE, AGENT)], opts.files ?? { [ID]: AGENT });
  await next();
  expect(marked()).toBe(RED);
  main.hold('write#1');
  caret.at = KEY_AT;
  await rewind();
  await arrives('write#1');
  await typeKey(KEY);
  await release('write#1');
  await until('the keystroke reaching the buffer', () => getWorkingModel(ID)?.getValue() === withKey(AGENT));
  await draws([RED, LEAPS, '"lazy"->"lazyx"']);
  expect({ ...reading(), reads: main.reads, walks: main.walks }).toEqual({
    dirty: true, saved: AGENT, disk: REWOUND, model: withKey(AGENT), baseline: BASE, reads: 1, walks: 0
  });
}

describe("PHASE 282.2's FIX ROUND: the undo road, through a real keystroke and a real ⌘Z", () => {
  it('THE WAY OUT, UNMOCKED: ⌥↩ names the way out, ⌘Z makes the tab clean, the view pulls one read, and ⌥↩ accepts the NEXT change', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await accept();
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    await cmdZ();
    await draws([LEAPS]);
    expect({ ...reading(), reads: main.reads, walks: main.walks }).toEqual({
      dirty: false, saved: REWOUND, disk: REWOUND, model: REWOUND, baseline: BASE, reads: 2, walks: 1
    });
    await accept();
    await draws([]);
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    expect(main.writeLog).toEqual([`wrote ${REWOUND}`]);
  });

  it("A SECOND ⌘Z INSIDE THE READ, then ⌘⇧Z: the hold outlives the dirty buffer's empty picture, the clean transition reads AGAIN, and the rewound change is never accepted", async () => {
    await rewindWithAKeystrokeInsideTheWrite({ modelFirst: true });
    main.hold('read#2');
    await cmdZ();
    // The first ⌘Z made the tab clean and the view's read is at main's door.
    await arrives('read#2');
    expect({ ...reading(), reads: main.reads }).toEqual({
      dirty: false, saved: AGENT, disk: REWOUND, model: AGENT, baseline: BASE, reads: 2
    });
    // The key is still down. The repeat un-applies the agent's reload: the
    // buffer is the text from before the agent wrote, and it draws NO change.
    await cmdZ({ repeat: true });
    await draws([]);
    expect(reading()).toEqual({ dirty: true, saved: AGENT, disk: REWOUND, model: BASE, baseline: BASE });
    // THE HOLD STANDS, which is the fix: before it, this picture let it go. A
    // per-change ⌥↩ has no change to name here and is silent by rule, so the
    // hold is asked through the Edit menu's Accept All, which a hold refuses
    // with the dirty tab's sentence before it composes anything.
    await act(() => void runRedlineCommand('acceptAll'));
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    // The read answers a dirty tab and is dropped (../tab-io, the live clean test).
    await release('read#2');
    await rest();
    expect({ ...reading(), reads: main.reads }).toEqual({
      dirty: true, saved: AGENT, disk: REWOUND, model: BASE, baseline: BASE, reads: 2
    });
    // The person sees they went too far: ⌘⇧Z. Clean again, UNDER A LANDED
    // HOLD, so the clean transition reads a second time and the disk answers.
    await cmdZ({ shift: true });
    await draws([LEAPS]);
    expect({ ...reading(), reads: main.reads }).toEqual({
      dirty: false, saved: REWOUND, disk: REWOUND, model: REWOUND, baseline: BASE, reads: 3
    });
    // ⌥↩ in the rhythm takes the change that FOLLOWED the rewound one...
    await markChange(LEAPS);
    await accept();
    await draws([]);
    // ...and a later read of the repository draws nothing backwards.
    await tick();
    await rest();
    expect(drawn()).toEqual([]);
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    expect(main.writeLog).toEqual([`wrote ${REWOUND}`]);
  });

  it('BOTH ⌘Z IN ONE TASK, before any render: no read was ever pulled, the hold still stands, and ⌘⇧Z pulls the first one', async () => {
    await rewindWithAKeystrokeInsideTheWrite({ modelFirst: true });
    await cmdZTwiceInOneTask();
    await draws([]);
    expect({ ...reading(), reads: main.reads }).toEqual({
      dirty: true, saved: AGENT, disk: REWOUND, model: BASE, baseline: BASE, reads: 1
    });
    await cmdZ({ shift: true });
    await draws([LEAPS]);
    expect({ ...reading(), reads: main.reads }).toEqual({
      dirty: false, saved: REWOUND, disk: REWOUND, model: REWOUND, baseline: BASE, reads: 2
    });
    expect(toasts).toEqual([]);
  });
});

describe('STATED LIMITS, MEASURED AS THEY STAND (build/p282/SPEC.md §12): each is the operator’s ruling to make, and a seed for the entry that makes it', () => {
  /**
   * THE HOLD IS THE MOUNT'S (Phase 282's ruling, ../RedlineDocument
   * `rewindHolds`), so whatever ends the mount ends the refusal AND the read
   * this phase owes. The chain runs to the end: the rewind the person made is
   * overwritten by the next ⌥⌫ in the rhythm.
   */
  async function theChainToItsEnd(): Promise<void> {
    // ⌘Z where the person now is. The tab goes clean and NOTHING reads.
    await cmdZ();
    await draws([RED, LEAPS]);
    expect({ ...reading(), reads: main.reads, walks: main.walks }).toEqual({
      dirty: false, saved: AGENT, disk: REWOUND, model: AGENT, baseline: BASE, reads: 1, walks: 0
    });
    // ⌥↩ on the change the person REWOUND: accepted, with nothing said.
    const said = toasts.length;
    await markChange(RED);
    await accept();
    await draws([LEAPS]);
    expect(toasts).toHaveLength(said);
    expect(reading()).toMatchObject({ baseline: RED_ACCEPTED, disk: REWOUND });
    // The agent writes another file of the repository: the rewind, drawn backwards.
    await tick();
    await draws([BACKWARDS, LEAPS]);
    // ⌥⌫ in the rhythm, on the backwards change: the agent's word is back on disk.
    await markChange(BACKWARDS);
    await rewind();
    await until('the second rewind landing', () => main.writeLog.length === 2);
    expect(main.writeLog).toEqual([`wrote ${REWOUND}`, `wrote ${AGENT}`]);
  }

  it('A TAB SWITCH AND BACK, then the undo: no read, ⌥↩ accepts the rewound change unsaid, and the rhythm writes the rewind away', async () => {
    await rewindWithAKeystrokeInsideTheWrite({
      tabs: [tabOf(ID, BASE, AGENT), tabOf(OTHER, 'other\n', 'other\n')],
      files: { [ID]: AGENT, [OTHER]: 'other\n' }
    });
    await accept();
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    await act(() => useEditor.getState().activate(OTHER));
    await rest();
    await act(() => useEditor.getState().activate(ID));
    await draws([RED, LEAPS, '"lazy"->"lazyx"']);
    await theChainToItsEnd();
  });

  it('A LOOK AT THE FILE VIEW AND BACK (the mode chip), then the undo: the same chain, to the same end', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await accept();
    expect(toasts).toEqual([ACCEPT_DIRTY]);
    await act(() => useEditor.getState().setMode(ID, 'file'));
    await rest();
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await draws([RED, LEAPS, '"lazy"->"lazyx"']);
    await theChainToItsEnd();
  });

  it('ONE ⌘Z TOO MANY, after the read has landed: the read is an undoable edit, so ⌘Z un-applies it, ⌥↩ accepts the rewound change from the buffer, and ⌘⇧Z draws it backwards', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await cmdZ();
    await draws([LEAPS]);
    await cmdZ();
    await draws([RED, LEAPS]);
    // Everything here is visible: the change is drawn again and the tab says unsaved.
    expect(reading()).toEqual({ dirty: true, saved: REWOUND, disk: REWOUND, model: AGENT, baseline: BASE });
    await markChange(RED);
    await accept();
    await draws([LEAPS]);
    expect(toasts).toEqual([]);
    await cmdZ({ shift: true });
    await draws([BACKWARDS, LEAPS]);
    expect(reading()).toEqual({ dirty: false, saved: REWOUND, disk: REWOUND, model: REWOUND, baseline: RED_ACCEPTED });
  });

  it('THE UNDO IS NOT TEMPORARY: the read is an edit, so it empties redo, and ⌘⇧Z no longer brings the typing back', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await cmdZ();
    await draws([LEAPS]);
    expect(getWorkingModel(ID)?.redoStack).toHaveLength(0);
    await cmdZ({ shift: true });
    await rest();
    expect(reading()).toEqual({ dirty: false, saved: REWOUND, disk: REWOUND, model: REWOUND, baseline: BASE });
  });
});
