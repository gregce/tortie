/**
 * PHASE 290. THE TAB OWES THE READ, NOT THE MOUNT.
 *
 * Phase 282.2's attack verifier measured the chain this file is about, and
 * build/p352/SPEC.md §2.6 re-measured it at this tree: a keystroke inside a
 * rewind's write, so the adoption refuses a dirty tab; then a tab switch, or a
 * look at the File view, or an undo made there; then ⌥↩ takes the change the
 * person rewound with nothing said, the next read draws it backwards, and the
 * next ⌥⌫ in the rhythm writes the agent's words back:
 * `[wrote REWOUND, wrote AGENT]`. The refusal and the read it owed were the
 * Redline MOUNT's (`rewindHolds`), and every one of those gestures ends the
 * mount. ./p2822-second-undo.test.ts carries the two seeds, flipped; this file
 * carries the mark's own rules and the entry's attack list.
 *
 *  - THE MARK (`EditorTab.rewindOwesRead`) is set where an adoption refuses
 *    and leaves the tab holding bytes other than the ones the write wrote
 *    (../store's `adoptWritten`, right after ../tab-io's), and nowhere else.
 *  - IT IS CLEARED by the walk's read of the tab while it is clean, whether
 *    that read reloads the tab or finds it already holding the disk's bytes,
 *    and by a save of it that lands; by nothing else.
 *  - TWO DOORS PULL THE READ: the store's clean edge (`markDirty`), which is
 *    how an undo made in the File view reaches it, and a Redline mount over a
 *    clean tab that owes it.
 *  - ⌥↩ ASKS THE MARK as it asks a hold (../redline-accept), in today's
 *    sentences.
 *  - THE ATTACK LIST, one case each: the tab evicted at MAX_TABS, closed and
 *    reopened, hidden by a project switch, a save in flight when the mark is
 *    set, the mark set twice by two rewinds, and the pulled read racing the
 *    watcher's own tick.
 *
 * THE RIG IS ./p2822-second-undo.test.ts's, copied whole so the same wiring
 * runs: a real cancelable `beforeinput`, real ⌘Z keydowns, ../redline-edits and
 * ../live-text unmocked, the store's own watcher subscription, and main per
 * path with a sha256 compare-and-swap and named gates. Its limit is that file's
 * limit: the Monaco chunk is a model with monaco's undo semantics as the
 * verifier wrote them down. The real Monaco is `probe:redlinemoveon` arm M.
 * One difference: the bridge's baseline store answers `{ found: false }`, the
 * shape the real one answers, because a file reopened here reads it.
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
// MAIN, faked, as ./p2822-second-undo.test.ts fakes it: per-path files, a
// sha256 compare-and-swap, named gates.
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
    baselines: { store: async () => ({ stored: false }), load: async () => ({ found: false }), forget: async () => undefined },
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
const { pressAccept } = await import('../redline-accept');
const { getWorkingModel } = (await import('../monaco-loader')) as unknown as {
  getWorkingModel: (id: string) => UndoModel | null;
};
type EditorTab = import('../store').EditorTab;
type PressedChange = import('../redline-press').PressedChange;

const toasts: string[] = [];
const ROOT = '/repo';
const ID = `${ROOT}/notes.txt`;
const OTHER = `${ROOT}/other.txt`;
const BASE = 'The quick brown fox jumps over the lazy dog.\n';
const AGENT = 'The quick red fox leaps over the lazy dog.\n';
const REWOUND = 'The quick brown fox leaps over the lazy dog.\n';
/** The agent's newer write the tab has not read: its own words, and one change more below them. */
const LATER = 'The quick red fox leaps over the sleepy dog.\n';
/** LATER with "brown"->"red" rewound, which is what a rewind pressed on the trailing tab writes. */
const REWOUND_LATER = 'The quick brown fox leaps over the sleepy dog.\n';
const KEY = 'x';
/** The caret sits after "lazy", below both changes, as the probe's arms put it below every change. */
const KEY_AT = AGENT.indexOf('lazy') + 4;
const withKey = (t: string): string => {
  const at = t.indexOf('lazy') + 4;
  return `${t.slice(0, at)}${KEY}${t.slice(at)}`;
};
const ACCEPT_DIRTY =
  'A change in notes.txt was rewound, but your unsaved edits still show it, so nothing was accepted. Save or undo your edits first, then accept.';
const ACCEPT_HELD = 'A change in notes.txt is still being rewound, so nothing was accepted.';
const RED = '"brown"->"red"';
const LEAPS = '"jumps"->"leaps"';
const SLEEPY = '"lazy"->"sleepy"';
const BACKWARDS = '"red"->"brown"';

function tabOf(
  id: string,
  head: string,
  saved: string,
  over: { mode?: 'redline' | 'file'; dirty?: boolean; owes?: boolean } = {}
): EditorTab {
  return {
    id, path: id, relPath: nameOf(id), origRelPath: null, repoPath: ROOT, name: nameOf(id), projectId: 'p',
    mode: over.mode ?? 'redline', canDiff: true, markdown: false, image: false, svg: false, html: false,
    imageData: null, imageHead: null, imageRevision: 0, preview: false, commit: null, pendingSelection: null,
    pendingFocus: false, dirty: over.dirty ?? false, rewindOwesRead: over.owes ?? false, deleted: false,
    truncated: false, loading: false, error: null, savedContents: saved, headContents: head,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: head }, 1), lastUsed: 0, contextEntry: null
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

/**
 * Mount the view over `tabs`, with `files` the agent's bytes after the arrival
 * (./p334-arrival). A first tab in the File view mounts no Redline view, so
 * nothing arrives and nothing is read: `looks` is 0 then.
 */
async function mount(tabs: EditorTab[], files: Record<string, string>): Promise<void> {
  main.reset(files);
  toasts.length = 0;
  heads.clear();
  for (const t of tabs) {
    heads.set(t.relPath, t.headContents ?? '');
    forgetRewindJournal(t.id);
  }
  useApp.setState({
    projects: [
      { id: 'p', path: ROOT, name: 'repo' },
      { id: 'q', path: '/elsewhere', name: 'elsewhere' }
    ],
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
  const looks = tabs[0]?.mode === 'redline' ? tabs.length : 0;
  arrival.begin(tabs);
  await act(() => {
    root?.render(React.createElement(View));
  });
  expect({ reads: arrival.done(), walks: main.walks }).toEqual({ reads: looks, walks: looks });
  main.walks = 0;
}

afterEach(async () => {
  // A step still held when a case fails would hold ../tab-io's serializer for
  // every case after it (a walk that never settles is its stated limit).
  main.held.clear();
  for (const waiting of main.gates.splice(0)) waiting.release();
  await settle();
  if (root !== null) await act(() => root?.unmount());
  if (container !== null) doc.body.removeChild(container);
  root = null;
  container = null;
  doc.activeElement = doc.body;
  // Every tab this case made, the reopened and the evicted-into included: a
  // tab id is a path and the model registry outlives a test.
  for (const t of [...useEditor.getState().tabs]) useEditor.getState().forceCloseTab(t.id);
  useApp.setState({ confirm: null, activeProjectId: 'p' } as never);
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
/** ⌘Z, as a keydown ../redline-edits answers in the capture phase. */
const cmdZ = (): Promise<void> =>
  act(() => {
    doc.activeElement = docEl();
    dispatch(docEl(), { ...Z, shiftKey: false, repeat: false });
  });

/** A step is waited for by what it does, with a bound (./p2822-second-undo.test.ts says why). */
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
/** The watcher's tick: the store's own `onRepoChanged` subscription, as an agent's write elsewhere raises it. */
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
/** THE MARK, as the store holds it. */
const owes = (id = ID): boolean | undefined => tabNow(id)?.rewindOwesRead;
const reading = (): Record<string, unknown> => {
  const t = tabNow();
  return {
    dirty: t?.dirty,
    saved: t?.savedContents,
    disk: main.files.get(ID),
    model: getWorkingModel(ID)?.getValue() ?? null,
    baseline: (t?.baseline as { text?: string } | null | undefined)?.text ?? null,
    owes: t?.rewindOwesRead
  };
};
const markDirty = (dirty: boolean): Promise<void> =>
  act(() => {
    useEditor.getState().markDirty(ID, dirty);
  });
const open = (path: string): Promise<void> =>
  act(() => {
    useEditor
      .getState()
      .openFromRequest({ repoPath: ROOT, relPath: nameOf(path), path, mode: 'file', source: 'tree', preview: false });
  });

/**
 * THE SHAPE THE PHASE EXISTS FOR, through the real typing path: ⌥↓, ⌥⌫ with its
 * write held, a real `beforeinput` inside the write, the landing. The rewind
 * is on disk, the adoption refused the dirty tab, and the TAB owes the read.
 */
async function rewindWithAKeystrokeInsideTheWrite(
  opts: { tabs?: EditorTab[]; files?: Record<string, string> } = {}
): Promise<void> {
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
    dirty: true, saved: AGENT, disk: REWOUND, model: withKey(AGENT), baseline: BASE, owes: true, reads: 1, walks: 0
  });
}

/**
 * THE TRAILING TAB: the agent wrote LATER after the tab last read the file, so
 * the tab is clean and draws AGENT; ⌥⌫ on "red" re-reads the disk, writes
 * REWOUND_LATER, and the adoption refuses because `savedContents` is not the
 * `was` the write replaced. Nothing is typed.
 */
async function rewindOnATrailingTab(): Promise<void> {
  await mount([tabOf(ID, BASE, AGENT)], { [ID]: LATER });
  await next();
  expect(marked()).toBe(RED);
  await rewind();
  await until('the rewind landing', () => main.writeLog.length === 1);
  await rest();
  expect({ ...reading(), log: [...main.writeLog] }).toEqual({
    dirty: false, saved: AGENT, disk: REWOUND_LATER, model: null, baseline: BASE, owes: true, log: [`wrote ${REWOUND_LATER}`]
  });
}

describe('PHASE 290: THE MARK IS SET WHERE AN ADOPTION REFUSES, and only there', () => {
  it('A KEYSTROKE INSIDE THE WRITE: the adoption refuses the dirty tab and the TAB owes the read, which ⌥↩ asks', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await accept();
    expect({ owes: owes(), toasts, drawn: drawn() }).toEqual({
      owes: true, toasts: [ACCEPT_DIRTY], drawn: [RED, LEAPS, '"lazy"->"lazyx"']
    });
  });

  it('A TRAILING TAB: a clean tab that had not read the agent’s newer write refuses the adoption, and owes the read with nothing typed', async () => {
    await rewindOnATrailingTab();
  });

  it('AN ADOPTION THAT TAKES THE BYTES owes nothing', async () => {
    await mount([tabOf(ID, BASE, AGENT)], { [ID]: AGENT });
    await next();
    await rewind();
    await until('the rewind landing', () => main.writeLog.length === 1);
    await draws([LEAPS]);
    expect(reading()).toEqual({
      dirty: false, saved: REWOUND, disk: REWOUND, model: null, baseline: BASE, owes: false
    });
  });

  it('A TAB ALREADY HOLDING THE BYTES THE WRITE WROTE owes nothing, dirty or clean, and one holding older bytes does (the store’s own action)', async () => {
    await mount([tabOf(ID, BASE, REWOUND, { mode: 'file', dirty: true })], { [ID]: REWOUND });
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, AGENT));
    const dirtyHolding = { saved: tabNow()?.savedContents, owes: owes() };
    useEditor.setState({ tabs: [tabOf(ID, BASE, REWOUND, { mode: 'file' })] } as never);
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, AGENT));
    const cleanHolding = { saved: tabNow()?.savedContents, owes: owes() };
    useEditor.setState({ tabs: [tabOf(ID, BASE, AGENT, { mode: 'file', dirty: true })] } as never);
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, AGENT));
    const dirtyOlder = { saved: tabNow()?.savedContents, owes: owes() };
    expect({ dirtyHolding, cleanHolding, dirtyOlder }).toEqual({
      dirtyHolding: { saved: REWOUND, owes: false },
      cleanHolding: { saved: REWOUND, owes: false },
      dirtyOlder: { saved: AGENT, owes: true }
    });
  });

  it('THE SUCCESS ARM MOVES NO MARK: an adoption that takes leaves a standing mark to the read, and the walk’s clean read then clears it', async () => {
    await mount([tabOf(ID, BASE, AGENT, { mode: 'file', owes: true })], { [ID]: REWOUND });
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, AGENT));
    const adopted = { saved: tabNow()?.savedContents, owes: owes() };
    await tick();
    await until('the walk', () => main.walks === 1);
    await rest();
    expect({ adopted, read: { saved: tabNow()?.savedContents, owes: owes() } }).toEqual({
      adopted: { saved: REWOUND, owes: true },
      read: { saved: REWOUND, owes: false }
    });
  });
});

describe('PHASE 290: CLEARED BY THE WALK’S CLEAN READ AND BY A SAVE THAT LANDS, and by nothing else', () => {
  it('THE WALK THAT RELOADS THE CLEAN TAB clears the mark in the very patch that moves savedContents', async () => {
    await rewindOnATrailingTab();
    const seen: Array<{ saved: string; owes: boolean | undefined }> = [];
    const off = useEditor.subscribe((s) => {
      const t = s.tabs.find((x) => x.id === ID);
      if (t !== undefined) seen.push({ saved: t.savedContents, owes: t.rewindOwesRead });
    });
    await tick();
    await draws([LEAPS, SLEEPY]);
    off();
    expect({
      owes: owes(),
      reloadedOwing: seen.some((r) => r.saved === REWOUND_LATER && r.owes === true),
      reloadedClear: seen.some((r) => r.saved === REWOUND_LATER && r.owes === false)
    }).toEqual({ owes: false, reloadedOwing: false, reloadedClear: true });
  });

  it('THE WALK THAT FINDS THE CLEAN TAB ALREADY HOLDING THE DISK’S BYTES clears it: the agent wrote its words again after the rewind, so its change is on disk and ⌥↩ may take it', async () => {
    await rewindWithAKeystrokeInsideTheWrite({
      tabs: [tabOf(ID, BASE, AGENT), tabOf(OTHER, 'other\n', 'other\n')],
      files: { [ID]: AGENT, [OTHER]: 'other\n' }
    });
    // The agent writes its own words again, over the rewind, while the tab is dirty.
    main.files.set(ID, AGENT);
    await cmdZ();
    await draws([RED, LEAPS]);
    await rest();
    expect(reading()).toEqual({ dirty: false, saved: AGENT, disk: AGENT, model: AGENT, baseline: BASE, owes: false });
    // This mount's hold is Phase 282.2's and it never lets go on the bytes the
    // rewind replaced (../redline-press `releaseHolds`), so here ⌥↩ is held.
    await markChange(RED);
    await accept();
    expect(toasts.at(-1)).toBe(ACCEPT_HELD);
    // A switch ends the mount and its hold; the TAB owes nothing, and the
    // change ⌥↩ takes is the one the disk holds.
    await act(() => useEditor.getState().activate(OTHER));
    await rest();
    await act(() => useEditor.getState().activate(ID));
    await draws([RED, LEAPS]);
    const said = toasts.length;
    await markChange(RED);
    await accept();
    await draws([LEAPS]);
    expect(toasts).toHaveLength(said);
    await tick();
    await rest();
    expect({ drawn: drawn(), log: [...main.writeLog] }).toEqual({ drawn: [LEAPS], log: [`wrote ${REWOUND}`] });
  });

  it('A SAVE THAT LANDS clears it, in the very patch that says so: ⌘S answered stale writes nothing and the mark stands, then Overwrite writes the buffer and the tab owes nothing', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await act(async () => {
      await useEditor.getState().save();
    });
    const stale = { owes: owes(), asked: useApp.getState().confirm !== null, log: [...main.writeLog] };
    // Every state the store passes through from here. The view's own effect
    // reads the disk once the tab is clean, and that read clears the mark too,
    // so the end state alone cannot tell the save's clear from the read's.
    const seen: Array<{ saved: string; owes: boolean | undefined }> = [];
    const off = useEditor.subscribe((s) => {
      const t = s.tabs.find((x) => x.id === ID);
      if (t !== undefined) seen.push({ saved: t.savedContents, owes: t.rewindOwesRead });
    });
    await act(() => {
      useApp.getState().confirm?.onAlt?.();
      useApp.getState().setConfirm(null);
    });
    await until('the overwrite landing', () => main.writeLog.length === 3);
    await rest();
    off();
    expect({
      stale,
      savedButOwing: seen.some((r) => r.saved === withKey(AGENT) && r.owes === true),
      after: reading(),
      log: [...main.writeLog]
    }).toEqual({
      stale: { owes: true, asked: true, log: [`wrote ${REWOUND}`, `stale ${withKey(AGENT)}`] },
      savedButOwing: false,
      after: { dirty: false, saved: withKey(AGENT), disk: withKey(AGENT), model: withKey(AGENT), baseline: BASE, owes: false },
      log: [`wrote ${REWOUND}`, `stale ${withKey(AGENT)}`, `wrote ${withKey(AGENT)}`]
    });
  });

  it('NOTHING ELSE CLEARS IT: more typing, a walk of the dirty tab, the File view and back, a tab switch and back, a held ⌥↩, and ⌘S answered stale and cancelled', async () => {
    await rewindWithAKeystrokeInsideTheWrite({
      tabs: [tabOf(ID, BASE, AGENT), tabOf(OTHER, 'other\n', 'other\n')],
      files: { [ID]: AGENT, [OTHER]: 'other\n' }
    });
    const after: Record<string, boolean | undefined> = {};
    caret.at = KEY_AT + 1;
    await typeKey('y');
    await until('the second keystroke reaching the buffer', () => (getWorkingModel(ID)?.getValue() ?? '').includes('lazyxy'));
    after.typing = owes();
    await tick();
    await rest();
    after.walkOfTheDirtyTab = owes();
    await act(() => useEditor.getState().setMode(ID, 'file'));
    await rest();
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await rest();
    after.fileViewAndBack = owes();
    await act(() => useEditor.getState().activate(OTHER));
    await rest();
    await act(() => useEditor.getState().activate(ID));
    await rest();
    after.switchAndBack = owes();
    await markChange(RED);
    await accept();
    after.heldAccept = owes();
    await act(async () => {
      await useEditor.getState().save();
    });
    await act(() => useApp.getState().setConfirm(null));
    after.staleSaveCancelled = owes();
    expect({ after, dirty: tabNow()?.dirty, lastToast: toasts.at(-1), disk: main.files.get(ID) }).toEqual({
      after: {
        typing: true,
        walkOfTheDirtyTab: true,
        fileViewAndBack: true,
        switchAndBack: true,
        heldAccept: true,
        staleSaveCancelled: true
      },
      dirty: true,
      lastToast: ACCEPT_DIRTY,
      disk: REWOUND
    });
  });
});

describe('PHASE 290: THE TWO DOORS', () => {
  it('THE STORE’S CLEAN EDGE pulls the read with no Redline mounted: only on the way OUT of dirty, and only while the mark stands', async () => {
    await mount([tabOf(ID, BASE, AGENT, { mode: 'file' })], { [ID]: REWOUND });
    // An ordinary keystroke and an ordinary undo read nothing.
    await markDirty(true);
    await markDirty(false);
    const ordinary = { reads: main.reads, walks: main.walks };
    // A rewind's write this clean tab did not take, because it trailed the disk.
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, LATER));
    // The way INTO dirty while the mark stands, and a keystroke more: no read.
    // Counted as walks too, because a walk skips a dirty tab's file read.
    await markDirty(true);
    await markDirty(true);
    const intoDirty = { reads: main.reads, walks: main.walks, owes: owes() };
    // The undo made in the File view: MonacoHost marks the tab clean, and that is all the store hears.
    await markDirty(false);
    await until('the read landing', () => tabNow()?.savedContents === REWOUND);
    await rest();
    const out = { reads: main.reads, walks: main.walks, owes: owes() };
    expect({ ordinary, intoDirty, out }).toEqual({
      ordinary: { reads: 0, walks: 0 },
      intoDirty: { reads: 0, walks: 0, owes: true },
      out: { reads: 1, walks: 1, owes: false }
    });
  });

  /**
   * The Redline view's arrival is also a look (Phase 334, ../store
   * `rereadOnReturn`), floored at one per repository per second. With nothing
   * mounted at the start there was no arrival, so the floor is spent first,
   * on a read that finds the tab already holding the disk's bytes, and every
   * read after it is a door of this phase.
   */
  async function aFileTabWhoseFloorIsSpent(over: { dirty?: boolean }): Promise<void> {
    await mount([tabOf(ID, BASE, AGENT, { mode: 'file', ...over })], { [ID]: AGENT });
    await act(() => useEditor.getState().rereadOnReturn(ID));
    await until('the floor’s read', () => main.walks === 1);
    await rest();
    main.files.set(ID, REWOUND);
    main.reads = 0;
    main.walks = 0;
  }

  it('A REDLINE MOUNT OVER A CLEAN TAB THAT OWES THE READ pulls it, and the rewound change is never drawn after it', async () => {
    await aFileTabWhoseFloorIsSpent({});
    // The rewind's write, refused by a tab that trailed it.
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, LATER));
    expect({ owes: owes(), reads: main.reads }).toEqual({ owes: true, reads: 0 });
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await draws([LEAPS]);
    // The mount's door and the `[tab.dirty]` effect both run on a mount and
    // both ask the mark; the second walk is queued behind the first.
    expect({ ...reading(), reads: main.reads, walks: main.walks }).toEqual({
      dirty: false, saved: REWOUND, disk: REWOUND, model: null, baseline: BASE, owes: false, reads: 2, walks: 2
    });
  });

  it('A SWITCH BETWEEN TWO CLEAN TABS, where nothing moves the dirty flag: the view arriving on the one that owes the read pulls it by its own door', async () => {
    // The arrival spends the floor (Phase 334), so the switch's own look is floored.
    await mount([tabOf(OTHER, 'other\n', 'other\n'), tabOf(ID, BASE, AGENT)], { [OTHER]: 'other\n', [ID]: AGENT });
    main.files.set(ID, REWOUND);
    // The rewind's write, refused by a tab that trailed it, while OTHER is on screen.
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, LATER));
    const before = { owes: owes(), reads: main.reads, walks: main.walks };
    await act(() => useEditor.getState().activate(ID));
    await draws([LEAPS]);
    // ONE walk, of both open tabs: a file read and a HEAD read each.
    expect({ before, after: { ...reading(), reads: main.reads, walks: main.walks } }).toEqual({
      before: { owes: true, reads: 0, walks: 0 },
      after: { dirty: false, saved: REWOUND, disk: REWOUND, model: null, baseline: BASE, owes: false, reads: 2, walks: 2 }
    });
  });

  it('A REDLINE MOUNT pulls nothing over a clean tab that owes nothing, and nothing over a dirty tab that owes it', async () => {
    await aFileTabWhoseFloorIsSpent({});
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await draws([RED, LEAPS]);
    const owingNothing = { reads: main.reads, saved: tabNow()?.savedContents, owes: owes() };
    await act(() => root?.unmount());
    root = null;
    useEditor.setState({ tabs: [tabOf(ID, BASE, AGENT, { mode: 'file', dirty: true })] } as never);
    await act(() => useEditor.getState().adoptWritten(ID, REWOUND, LATER));
    root = createRoot(container as never);
    function View(): React.ReactElement | null {
      const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId));
      return tab === undefined || tab.mode !== 'redline' ? null : React.createElement(RedlineDocument, { tab });
    }
    await act(() => {
      root?.render(React.createElement(View));
    });
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await rest();
    expect({ owingNothing, dirtyOwing: { reads: main.reads, saved: tabNow()?.savedContents, owes: owes() } }).toEqual({
      owingNothing: { reads: 0, saved: AGENT, owes: false },
      dirtyOwing: { reads: 0, saved: AGENT, owes: true }
    });
  });

  it('⌥↩ ASKS THE MARK: held per change and all while the tab owes the read, the empty chord silent first, and accepted when it owes nothing', () => {
    const tab = { id: ID, baseline: BASE, generation: 1, current: AGENT, truncated: false };
    const calls: string[] = [];
    const deps = (owed: boolean | undefined, focused: PressedChange | null) => ({
      focused: () => focused,
      advance: () => void calls.push('advance'),
      refuse: (why: string) => void calls.push(`refuse ${why}`),
      now: () => 0,
      ...(owed === undefined ? {} : { owed })
    });
    const change: PressedChange = { off: 10, del: 'brown', ins: 'red', generation: 1 };
    const held = {
      one: pressAccept('one', tab, deps(true, change)),
      all: pressAccept('all', tab, deps(true, null)),
      nothingFocused: pressAccept('one', tab, deps(true, null)),
      calls: [...calls]
    };
    const free = {
      owedFalse: pressAccept('all', tab, deps(false, null)),
      owedAbsent: pressAccept('all', tab, deps(undefined, null)),
      calls: [...calls]
    };
    expect({ held, free }).toEqual({
      held: { one: { outcome: 'held' }, all: { outcome: 'held' }, nothingFocused: { outcome: 'nothing' }, calls: [] },
      free: {
        owedFalse: { outcome: 'accepted', baseline: AGENT },
        owedAbsent: { outcome: 'accepted', baseline: AGENT },
        calls: ['advance', 'advance']
      }
    });
  });
});

describe('PHASE 290: THE ATTACK LIST, one case each (the entry’s)', () => {
  /** Ten more files, opened for keeps from the tree, each a clean tab of the same project. */
  const FILLERS = Array.from({ length: 10 }, (_, i) => `${ROOT}/f${String(i)}.txt`);
  const fillerFiles = Object.fromEntries(FILLERS.map((p) => [p, 'filler\n']));

  it('EVICTED AT MAX_TABS (10): a clean tab owing the read goes like any clean tab, and the file opened again reads the rewind off the disk and owes nothing', async () => {
    await mount([tabOf(ID, BASE, AGENT)], { [ID]: LATER, ...fillerFiles });
    await next();
    await rewind();
    await until('the rewind landing', () => main.writeLog.length === 1);
    await rest();
    expect(owes()).toBe(true);
    for (const p of FILLERS) await open(p);
    await until('the fillers read', () => FILLERS.every((p) => tabNow(p)?.loading !== true));
    const evicted = { gone: tabNow() === undefined, tabs: useEditor.getState().tabs.length, model: getWorkingModel(ID) };
    await open(ID);
    await until('the file read again', () => tabNow()?.loading === false);
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await until('the picture', () => container?.querySelector('.ed-redline-doc') !== null);
    await rest();
    expect({ evicted, reopened: { saved: tabNow()?.savedContents, owes: owes(), dirty: tabNow()?.dirty }, red: drawn().includes(RED) }).toEqual({
      evicted: { gone: true, tabs: 10, model: null },
      reopened: { saved: REWOUND_LATER, owes: false, dirty: false },
      red: false
    });
  });

  it('EVICTED AT MAX_TABS: a DIRTY tab owing the read is never the one evicted, and keeps its mark', async () => {
    await rewindWithAKeystrokeInsideTheWrite({ files: { [ID]: AGENT, ...fillerFiles } });
    for (const p of FILLERS) await open(p);
    await until('the fillers read', () => FILLERS.every((p) => tabNow(p)?.loading !== true));
    expect({
      kept: tabNow() !== undefined,
      dirty: tabNow()?.dirty,
      owes: owes(),
      tabs: useEditor.getState().tabs.length,
      firstFillerGone: tabNow(FILLERS[0]) === undefined
    }).toEqual({ kept: true, dirty: true, owes: true, tabs: 10, firstFillerGone: true });
  });

  it('CLOSED AND REOPENED: Don’t Save ends the tab and its mark, and the file opened again reads the rewind off the disk and owes nothing', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await act(() => useEditor.getState().closeTab(ID));
    const asked = useApp.getState().confirm?.title ?? null;
    await act(() => {
      useApp.getState().confirm?.onAlt?.();
      useApp.getState().setConfirm(null);
    });
    const closed = tabNow() === undefined;
    await open(ID);
    await until('the file read again', () => tabNow()?.loading === false);
    await act(() => useEditor.getState().setMode(ID, 'redline'));
    await until('the picture', () => container?.querySelector('.ed-redline-doc') !== null);
    await rest();
    expect({
      asked,
      closed,
      reopened: { saved: tabNow()?.savedContents, owes: owes(), dirty: tabNow()?.dirty },
      red: drawn().includes(RED),
      log: [...main.writeLog]
    }).toEqual({
      asked: "Save changes to 'notes.txt'?",
      closed: true,
      reopened: { saved: REWOUND, owes: false, dirty: false },
      red: false,
      log: [`wrote ${REWOUND}`]
    });
  });

  it('A PROJECT SWITCH hides the tab and never closes it: the mark survives the hiding, and coming back mounts the view over the clean tab, which pulls the read', async () => {
    await rewindOnATrailingTab();
    await act(() => useApp.setState({ activeProjectId: 'q' } as never));
    await rest();
    const hidden = {
      shown: container?.querySelector('.ed-redline-doc') !== null,
      kept: tabNow() !== undefined,
      owes: owes(),
      walks: main.walks
    };
    await act(() => useApp.setState({ activeProjectId: 'p' } as never));
    await draws([LEAPS, SLEEPY]);
    expect({ hidden, back: { saved: tabNow()?.savedContents, owes: owes(), read: main.walks > hidden.walks } }).toEqual({
      hidden: { shown: false, kept: true, owes: true, walks: 0 },
      back: { saved: REWOUND_LATER, owes: false, read: true }
    });
  });

  it('A SAVE IN FLIGHT when the mark is set: the save lands second and is answered stale, writing nothing, so the mark stands until Overwrite', async () => {
    await mount([tabOf(ID, BASE, AGENT)], { [ID]: AGENT });
    await next();
    main.hold('write#1', 'write#2');
    caret.at = KEY_AT;
    await rewind();
    await arrives('write#1');
    await typeKey(KEY);
    await until('the keystroke reaching the buffer', () => getWorkingModel(ID)?.getValue() === withKey(AGENT));
    const pending: { save: Promise<void> | null } = { save: null };
    await act(() => {
      pending.save = useEditor.getState().save();
    });
    await arrives('write#2');
    await release('write#1');
    await until('the rewind landing', () => main.writeLog.length === 1);
    await rest();
    const rewound = { owes: owes(), dirty: tabNow()?.dirty };
    await release('write#2');
    await act(async () => {
      await pending.save;
    });
    const answered = { owes: owes(), asked: useApp.getState().confirm !== null, log: [...main.writeLog] };
    await act(() => {
      useApp.getState().confirm?.onAlt?.();
      useApp.getState().setConfirm(null);
    });
    await until('the overwrite landing', () => main.writeLog.length === 3);
    await rest();
    expect({ rewound, answered, overwritten: { owes: owes(), dirty: tabNow()?.dirty, disk: main.files.get(ID) } }).toEqual({
      rewound: { owes: true, dirty: true },
      answered: { owes: true, asked: true, log: [`wrote ${REWOUND}`, `stale ${withKey(AGENT)}`] },
      overwritten: { owes: false, dirty: false, disk: withKey(AGENT) }
    });
  });

  it('A SAVE IN FLIGHT, the other order: the save lands first, the rewind is refused stale, and nothing is owed because nothing was rewound', async () => {
    await mount([tabOf(ID, BASE, AGENT)], { [ID]: AGENT });
    await next();
    main.hold('write#1', 'write#2');
    caret.at = KEY_AT;
    await rewind();
    await arrives('write#1');
    await typeKey(KEY);
    await until('the keystroke reaching the buffer', () => getWorkingModel(ID)?.getValue() === withKey(AGENT));
    const pending: { save: Promise<void> | null } = { save: null };
    await act(() => {
      pending.save = useEditor.getState().save();
    });
    await release('write#2');
    await act(async () => {
      await pending.save;
    });
    await release('write#1');
    await until('the rewind answered', () => main.writeLog.length === 2);
    await rest();
    expect({ ...reading(), log: [...main.writeLog] }).toEqual({
      dirty: false,
      saved: withKey(AGENT),
      disk: withKey(AGENT),
      model: withKey(AGENT),
      baseline: BASE,
      owes: false,
      log: [`wrote ${withKey(AGENT)}`, `stale ${REWOUND}`]
    });
  });

  it('TWO REWINDS SET IT TWICE: the second lands on a clean tab whose read is still at main’s door, and that one read takes both rewound changes out of the picture', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    main.hold('read#2');
    await cmdZ();
    await arrives('read#2');
    await draws([RED, LEAPS]);
    await markChange(LEAPS);
    await rewind();
    await until('the second rewind landing', () => main.writeLog.length === 2);
    await rest();
    const twice = { owes: owes(), saved: tabNow()?.savedContents, disk: main.files.get(ID), drawn: drawn() };
    await release('read#2');
    await draws([]);
    await tick();
    await rest();
    expect({ twice, after: reading(), drawn: drawn(), log: [...main.writeLog] }).toEqual({
      twice: { owes: true, saved: AGENT, disk: BASE, drawn: [RED, LEAPS] },
      after: { dirty: false, saved: BASE, disk: BASE, model: BASE, baseline: BASE, owes: false },
      drawn: [],
      log: [`wrote ${REWOUND}`, `wrote ${BASE}`]
    });
  });

  it('THE PULLED READ RACING THE WATCHER’S OWN TICK, the door’s read first: the newest bytes win, the mark goes once, and nothing is drawn backwards', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    // The agent writes again below while the tab is dirty.
    const NEWEST = REWOUND.replace('lazy', 'sleepy');
    main.files.set(ID, NEWEST);
    main.hold('read#2');
    await cmdZ();
    await arrives('read#2');
    await tick();
    await release('read#2');
    await draws([LEAPS, SLEEPY]);
    await rest();
    expect({ ...reading(), backwards: drawn().includes(BACKWARDS) }).toEqual({
      dirty: false, saved: NEWEST, disk: NEWEST, model: NEWEST, baseline: BASE, owes: false, backwards: false
    });
  });

  it('THE PULLED READ RACING THE WATCHER’S OWN TICK, the tick first: the door’s read queues behind it, the newest bytes win, and the mark goes', async () => {
    await rewindOnATrailingTab();
    const NEWEST = REWOUND_LATER.replace('leaps', 'bounds');
    main.hold('read#2');
    await tick();
    await arrives('read#2');
    // A keystroke and its undo while the tick's read is in the air: the clean edge pulls the read the tab owes.
    caret.at = KEY_AT;
    await typeKey(KEY);
    await until('the keystroke reaching the buffer', () => (getWorkingModel(ID)?.getValue() ?? '').includes('lazyx'));
    await cmdZ();
    main.files.set(ID, NEWEST);
    await release('read#2');
    await draws(['"jumps"->"bounds"', SLEEPY]);
    await rest();
    expect({ ...reading(), backwards: drawn().includes(BACKWARDS) }).toEqual({
      dirty: false, saved: NEWEST, disk: NEWEST, model: NEWEST, baseline: BASE, owes: false, backwards: false
    });
  });
});
