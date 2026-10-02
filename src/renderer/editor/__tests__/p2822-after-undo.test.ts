/**
 * PHASE 282.2. THE WAY OUT THE SENTENCE PROMISES: after ⌘Z takes a tab back to
 * clean, the view itself reads the disk, the landed hold lets go, and the next
 * ⌥↩ accepts.
 *
 * THIS FILE IS PHASE 282.1'S ATTACK REVERIFIER'S TEST, ADOPTED. It was written
 * against the 282.1 fix round, which keeps a landed hold on a dirty tab and
 * answers ⌥↩ with "Save or undo your edits first, then accept". That round's
 * own view test undid the keystroke and then called `watcherReads(ID)`, a
 * store patch standing in for the watcher's read; this file asked what the
 * person meets BETWEEN the undo and that read, and measured that the app made
 * no read at all on a tab going clean: `refreshRepo` had one caller,
 * `onRepoChanged` (../store `init`), and monaco's undo reaches only
 * `markDirty(id, false)` (../redline-edits `onDidChangeContent`). While the
 * agent is idle nothing else changes the repository, so the hold lingered and
 * every ⌥↩ said "still being rewound" while nothing was. Run unchanged at the
 * 282.1 bytes it read exactly that, twice, on a clean tab.
 *
 * Its expectations are now the FIXED behaviour (../RedlineDocument's effect
 * keyed on `tab.dirty`, ../store `rereadRepo`), and what it measured is kept
 * twice over: the CONTROL holds the view's read in the air and reads the
 * linger for as long as the disk has not answered, which is what proves the
 * undo alone adopts nothing from memory; and MEASURED AT THE 282.1 BYTES takes
 * the read away by hand and reads the seed's own two sentences back.
 *
 * The rig is the shipping mounted view over the fake document of
 * ./p282-view-presses.test.ts, copied whole so the same wiring runs, with one
 * difference this phase forces: a REAL walk of the repository now runs in
 * here, and the walk asks git for the file's HEAD version after it reads the
 * file, so `git.showHead` answers the HEAD each tab was mounted with rather
 * than the bridge's empty string.
 */

import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { gatedFs, gmuxBridge } from './p282-gated-fs';
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
const main = gatedFs(sha);
const disk = main.disk;
/** PHASE 334. The view's arrival reads every open tab: ./p334-arrival says why it is answered apart. */
const arrival = arrivalOver(() => main.fs.readFile());
ownTheStoreClock();
/**
 * PHASE 282.2. The HEAD version of each mounted file, by the path the walk
 * asks git with. The walk this phase adds runs for real in this rig, and an
 * answer that was not the tab's HEAD would be a second event in a test about
 * one.
 */
const heads = new Map<string, string>();
/**
 * WALKS, counted where main sees them. `main.reads` counts file reads, and a
 * walk SKIPS the file read of a dirty tab, so a walk pulled on the way INTO
 * dirty would leave `main.reads` exactly where it was. Every walk still ends
 * by asking git for each tab's HEAD, so with one tab mounted this is the
 * number of walks, whoever asked for them.
 */
const walks = { count: 0 };

vi.mock('../MonacoHost', () => ({ OpeningSkeleton: () => null }));
vi.mock('../live-text', () => ({ useLiveTabText: (_id: string, saved: string) => saved }));
vi.mock('../redline-chip', () => ({ RedlineChip: () => null }));
vi.mock('../../app/menu-redline', () => ({ pushRedlineMountedToMenu: () => undefined }));
const noRef = (): void => undefined;
vi.mock('../redline-edits', () => ({
  useRedlineTyping: () => ({ text: null, docProps: { ref: noRef }, caretMove: null, canUndoTyping: false })
}));

vi.stubGlobal('window', {
  document: undefined,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  HTMLIFrameElement: class {},
  gmux: gmuxBridge(main, {
    fs: { readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn(), readFile: arrival.readFile },
    git: {
      showHead: async (input: { path: string }) => {
        walks.count += 1;
        return heads.get(input.path) ?? '';
      }
    }
  })
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
const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
const { forgetRewindJournal } = await import('../redline-journal');
type EditorTab = import('../store').EditorTab;

const toasts: string[] = [];

function tabOf(id: string, head: string, saved: string): EditorTab {
  return {
    id, path: id, relPath: id.slice(id.lastIndexOf('/') + 1), origRelPath: null, repoPath: '/repo',
    name: id.slice(id.lastIndexOf('/') + 1), projectId: 'p', mode: 'redline', canDiff: true, markdown: false,
    image: false, svg: false, html: false, imageData: null, imageHead: null, imageRevision: 0, preview: false,
    commit: null, pendingSelection: null, pendingFocus: false, dirty: false, deleted: false, truncated: false,
    loading: false, error: null, savedContents: saved, headContents: head,
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

async function mount(tabs: EditorTab[], onDisk: string, looks = tabs.length): Promise<void> {
  main.reset(onDisk);
  toasts.length = 0;
  heads.clear();
  walks.count = 0;
  for (const t of tabs) heads.set(t.relPath, t.headContents ?? '');
  for (const t of tabs) forgetRewindJournal(t.id);
  useApp.setState({ toast: (_kind: string, text: string) => void toasts.push(text) } as never);
  useEditor.setState({ projectId: 'p', tabs, activeId: tabs[0]?.id ?? null, panelOpen: true } as never);
  function View(): React.ReactElement | null {
    const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId));
    return tab === undefined ? null : React.createElement(RedlineDocument, { tab });
  }
  container = doc.createElement('div');
  doc.body.appendChild(container);
  root = createRoot(container as never);
  // PHASE 334. The arrival is a look over the bytes each tab holds, one walk
  // of the repository, and `onDisk` is the agent's write after it
  // (./p334-arrival). The walks below are counted from there.
  arrival.begin(tabs);
  await act(() => {
    root?.render(React.createElement(View));
  });
  expect({ reads: arrival.done(), walks: walks.count }).toEqual({ reads: looks, walks: looks });
  walks.count = 0;
}

afterEach(async () => {
  if (root !== null) await act(() => root?.unmount());
  if (container !== null) doc.body.removeChild(container);
  root = null;
  container = null;
  doc.activeElement = doc.body;
});

const wrappers = (): FakeElement[] => container?.querySelectorAll('.ed-redline-change') ?? [];
const label = (el: FakeElement | null | undefined): string | null =>
  el === null || el === undefined ? null : `${JSON.stringify(el.getAttribute('data-change-del'))}->${JSON.stringify(el.getAttribute('data-change-ins'))}`;
const drawn = (): (string | null)[] => wrappers().map(label);
const marked = (): string | null => label(container?.querySelector('.ed-redline-change[data-current]'));

const chord = (key: string, mods: { shift?: boolean; repeat?: boolean } = {}): Promise<void> =>
  act(() => {
    dispatch(doc.activeElement ?? doc.body, {
      type: 'keydown', key, altKey: true, shiftKey: mods.shift === true, metaKey: false, ctrlKey: false,
      repeat: mods.repeat === true, keyCode: 0
    });
  });
const next = (): Promise<void> => chord('ArrowDown');
const rewind = (): Promise<void> => chord('Backspace');
const accept = (): Promise<void> => chord('Enter');
/**
 * A STEP IS WAITED FOR BY WHAT IT DOES, with a bound, and never by a number of
 * turns alone. A rewind hashes the bytes it read before it writes
 * (../redline-write `sha256Hex`), and that digest runs on the thread pool, so
 * how long a press takes to reach main is the machine's load and not the
 * code's. The rig this one was copied from gives every chord twelve turns, and
 * this directory run five times at a load average of 20 measured them running
 * out once, before an un-held ⌥⌫ had written. Every case here reads `reads`,
 * `walks` and `waiting()` right after a press, so each of those presses is
 * followed to the gate, or to the disk, that the case is about to read.
 */
const until = async (what: string, done: () => boolean): Promise<void> => {
  for (let i = 0; i < 400 && !done(); i += 1) {
    await act(() => new Promise<void>((r) => setTimeout(r, 5)));
  }
  if (!done()) throw new Error(`waited 2 s and ${what} never happened; held: ${main.waiting()}`);
};
const arrives = (label: string): Promise<void> =>
  until(`${label} arriving at its gate`, () => main.gates.some((g) => g.label === label));
const release = async (label: string): Promise<void> => {
  await arrives(label);
  const step = main.take(label);
  if (step === null) throw new Error(`nothing is held at ${label}; held: ${main.waiting()}`);
  await act(() => step());
};
const watcherReads = (id: string): Promise<void> =>
  act(() => {
    useEditor.setState({ tabs: useEditor.getState().tabs.map((t) => (t.id === id ? { ...t, savedContents: disk.text } : t)) });
  });

const ID = '/repo/notes.txt';
const BASE = 'The quick brown fox jumps over the lazy dog.\n';
const AGENT = 'The quick red fox leaps over the lazy dog.\n';
const REWOUND = 'The quick brown fox leaps over the lazy dog.\n';

const ACCEPT_DIRTY =
  'A change in notes.txt was rewound, but your unsaved edits still show it, so nothing was accepted. Save or undo your edits first, then accept.';
const ACCEPT_HELD = 'A change in notes.txt is still being rewound, so nothing was accepted.';

const tabNow = (): EditorTab | undefined => useEditor.getState().tabs[0];
/** A keystroke, and ⌘Z on it: all the store hears of either is the dirty edge (../redline-edits). */
const types = (id: string): Promise<void> =>
  act(() => {
    useEditor.getState().markDirty(id, true);
  });
const undoesTyping = (id: string): Promise<void> =>
  act(() => {
    useEditor.getState().markDirty(id, false);
  });

/**
 * The shape both reverifiers drove: ⌥↓, ⌥⌫ with its write held, a keystroke
 * inside the write, the landing. The rewind is on disk, the adoption refused
 * the dirty tab, and the hold has landed on the trailing bytes.
 */
async function rewindWithAKeystrokeInsideTheWrite(looks = 1): Promise<void> {
  await mount([tabOf(ID, BASE, AGENT)], AGENT, looks);
  await next();
  expect(marked()).toBe('"brown"->"red"');
  main.hold('write#1');
  await rewind();
  // The keystroke is INSIDE the write: the write is at main's door, not before it.
  await arrives('write#1');
  await types(ID);
  await release('write#1');
  expect({ disk: disk.text, reads: main.reads, walks: walks.count, dirty: tabNow()?.dirty }).toEqual({
    disk: REWOUND,
    reads: 1,
    walks: 0,
    dirty: true
  });
}

describe('PHASE 282.2: the person does what the sentence says (undo), and the view reads the disk', () => {
  it('THE WAY OUT: after the undo the view itself pulls ONE read, the hold lets go, and the next ⌥↩ accepts', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    await accept();
    const whileDirty = { toast: toasts.at(-1), drawn: drawn(), reads: main.reads, walks: walks.count };
    // ⌘Z on the keystroke: monaco's undo → onDidChangeContent → markDirty(false).
    // NO hand-made read follows. At the 282.1 bytes none followed in the app
    // either, and this step read `reads: 1` and the held sentence twice.
    await undoesTyping(ID);
    const afterUndo = {
      dirty: tabNow()?.dirty,
      savedContents: tabNow()?.savedContents,
      disk: disk.text,
      reads: main.reads,
      walks: walks.count,
      drawn: drawn(),
      marked: marked()
    };
    await accept();
    expect({ whileDirty, afterUndo, then: { drawn: drawn(), toasts: toasts.slice(1), reads: main.reads } }).toEqual({
      whileDirty: { toast: ACCEPT_DIRTY, drawn: ['"brown"->"red"', '"jumps"->"leaps"'], reads: 1, walks: 0 },
      // The picture is the disk's: the rewound change is gone, the person is on
      // the change that followed it, and nothing is drawn backwards.
      afterUndo: {
        dirty: false,
        savedContents: REWOUND,
        disk: REWOUND,
        reads: 2,
        walks: 1,
        drawn: ['"jumps"->"leaps"'],
        marked: '"jumps"->"leaps"'
      },
      then: { drawn: [], toasts: [], reads: 2 }
    });
  });

  it('CONTROL: it is the READ that lets go, never the undo — with the read held in the air the hold stands, and nothing is adopted from memory', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    main.hold('read#2');
    await undoesTyping(ID);
    await accept();
    await accept();
    // The seed's own reading, for exactly as long as the disk has not answered.
    const inTheAir = {
      dirty: tabNow()?.dirty,
      savedContents: tabNow()?.savedContents,
      reads: main.reads,
      waiting: main.waiting(),
      toasts: [...toasts],
      drawn: drawn(),
      marked: marked()
    };
    await release('read#2');
    await accept();
    expect({ inTheAir, then: { savedContents: tabNow()?.savedContents, drawn: drawn(), toasts: toasts.slice(2) } }).toEqual({
      inTheAir: {
        dirty: false,
        savedContents: AGENT,
        reads: 2,
        waiting: 'read#2',
        toasts: [ACCEPT_HELD, ACCEPT_HELD],
        drawn: ['"brown"->"red"', '"jumps"->"leaps"'],
        marked: '"brown"->"red"'
      },
      then: { savedContents: REWOUND, drawn: [], toasts: [] }
    });
  });

  it('A READ ASKS THE DISK WHAT IS THERE NOW: an agent wrote between the rewind and the undo, and the picture after the undo is the disk, not the bytes the hold remembers', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    // The agent writes again while the tab is dirty; the watcher's tick for it
    // skips the dirty tab by rule, exactly as the rewind's own tick did.
    const LATER = 'The quick brown fox leaps over the sleepy dog.\n';
    disk.text = LATER;
    await undoesTyping(ID);
    expect({ savedContents: tabNow()?.savedContents, reads: main.reads, drawn: drawn(), toasts }).toEqual({
      savedContents: LATER,
      reads: 2,
      drawn: ['"jumps"->"leaps"', '"lazy"->"sleepy"'],
      toasts: []
    });
  });

  it('MEASURED AT THE 282.1 BYTES: with the read taken away, ⌥↩ twice on a CLEAN tab says "still being rewound", and only a repo change elsewhere ends it', async () => {
    // The store action made a no-op is the whole of the 282.1 behaviour: the
    // effect has nothing to call, and no other reader exists on the undo path.
    const shipped = useEditor.getState().rereadRepo;
    useEditor.setState({ rereadRepo: () => undefined } as never);
    try {
      // PHASE 334. The arrival's look takes the same road (../store
      // `rereadOnReturn` asks `rereadRepo`), so it is taken away with it.
      await rewindWithAKeystrokeInsideTheWrite(0);
      await accept();
      await undoesTyping(ID);
      await accept();
      await accept();
      const lingering = {
        dirty: tabNow()?.dirty,
        savedContents: tabNow()?.savedContents,
        disk: disk.text,
        reads: main.reads,
        walks: walks.count,
        toasts: toasts.slice(1),
        drawn: drawn(),
        marked: marked()
      };
      // The seed's CONTROL: a repo change elsewhere brings the watcher's read.
      await watcherReads(ID);
      await accept();
      expect({ lingering, then: { drawn: drawn(), toasts: toasts.slice(3) } }).toEqual({
        lingering: {
          dirty: false,
          savedContents: AGENT,
          disk: REWOUND,
          reads: 1,
          walks: 0,
          toasts: [ACCEPT_HELD, ACCEPT_HELD],
          drawn: ['"brown"->"red"', '"jumps"->"leaps"'],
          marked: '"brown"->"red"'
        },
        then: { drawn: [], toasts: [] }
      });
    } finally {
      useEditor.setState({ rereadRepo: shipped } as never);
    }
  });

  it('THE OTHER WAY OUT (save): the saved bytes let the hold go in the same commit, so the accept proceeds and NO read is pulled', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    // A save's completion: savedContents = the buffer's bytes (AGENT + the
    // keystroke), tab clean. They are neither `landed.saved` nor `landed.was`,
    // so the release's second clause runs in the layout effect BEFORE the
    // effect this phase adds asks whether a landed hold exists.
    const SAVED = 'The quick red fox leaps over the lazy dog.!\n';
    await act(() => {
      useEditor.setState({ tabs: useEditor.getState().tabs.map((t) => (t.id === ID ? { ...t, savedContents: SAVED, dirty: false } : t)) });
    });
    const afterSave = { reads: main.reads, walks: walks.count, marked: marked() };
    await accept();
    expect({ afterSave, toasts, reads: main.reads, walks: walks.count, accepted: !drawn().includes('"brown"->"red"') }).toEqual({
      afterSave: { reads: 1, walks: 0, marked: '"brown"->"red"' },
      toasts: [],
      reads: 1,
      walks: 0,
      accepted: true
    });
  });
});

describe('PHASE 282.2: what pulls NO read, and what pulls only one', () => {
  it('NO LANDED HOLD, NO READ: an ordinary undo on an ordinary tab reads nothing, and neither does one made while a rewind is still in the air', async () => {
    await mount([tabOf(ID, BASE, AGENT)], AGENT);
    await types(ID);
    await undoesTyping(ID);
    const ordinary = { reads: main.reads, walks: walks.count, dirty: tabNow()?.dirty };
    // A hold IN THE AIR is not a landed hold: the write has not happened, so
    // there is nothing on disk for a read to find.
    await next();
    main.hold('write#1');
    await rewind();
    await arrives('write#1');
    await types(ID);
    await undoesTyping(ID);
    const inTheAir = { reads: main.reads, walks: walks.count, waiting: main.waiting() };
    await release('write#1');
    // The tab was clean at the landing, so the adoption took the bytes itself.
    expect({
      ordinary,
      inTheAir,
      landed: { reads: main.reads, walks: walks.count, drawn: drawn(), savedContents: tabNow()?.savedContents }
    }).toEqual({
      ordinary: { reads: 0, walks: 0, dirty: false },
      // The one read is the rewind's own, of the file it was about to write.
      inTheAir: { reads: 1, walks: 0, waiting: 'write#1' },
      landed: { reads: 1, walks: 0, drawn: ['"jumps"->"leaps"'], savedContents: REWOUND }
    });
  });

  it('NO READ ON THE WAY INTO DIRTY: a hold that landed on a CLEAN trailing tab, then a keystroke', async () => {
    const base = 'Line one is here.\nLine two is here.\nLine three is here.\n';
    const shown = 'Line one is here.\nLine TWO is here.\nLine THREE is here.\n';
    const agentAbove = 'Line ONE is here.\nLine TWO is here.\nLine THREE is here.\n';
    await mount([tabOf(ID, base, shown)], agentAbove);
    await next();
    await next();
    expect(marked()).toBe('"three"->"THREE"');
    await rewind();
    await until("the rewind's write landing", () => disk.writes === 1);
    // The tab trailed disk, so the adoption refused and the hold landed clean.
    const landed = { reads: main.reads, walks: walks.count, dirty: tabNow()?.dirty, savedContents: tabNow()?.savedContents };
    await types(ID);
    await accept();
    expect({ landed, afterKeystroke: { reads: main.reads, walks: walks.count, dirty: tabNow()?.dirty, toasts } }).toEqual({
      landed: { reads: 1, walks: 0, dirty: false, savedContents: shown },
      afterKeystroke: {
        reads: 1,
        // Counted as WALKS because a walk skips a dirty tab's file read: a
        // read pulled on the way into dirty would not move `reads` at all.
        walks: 0,
        dirty: true,
        // The hold is still there to refuse the accept, in the dirty sentence.
        toasts: [ACCEPT_DIRTY]
      }
    });
  });

  it('UNDO, REDO, UNDO, REDO, UNDO while the first read is in the air: one read in flight, ONE more queued behind it, and the newest bytes win', async () => {
    await rewindWithAKeystrokeInsideTheWrite();
    main.hold('read#2');
    await undoesTyping(ID);
    const first = main.reads;
    await types(ID);
    const intoDirty = main.reads;
    await undoesTyping(ID);
    await types(ID);
    await undoesTyping(ID);
    const inFlight = { reads: main.reads, walks: walks.count, waiting: main.waiting() };
    await release('read#2');
    await accept();
    expect({
      first,
      intoDirty,
      inFlight,
      after: { reads: main.reads, walks: walks.count, savedContents: tabNow()?.savedContents, drawn: drawn(), toasts }
    }).toEqual({
      first: 2,
      intoDirty: 2,
      // ../tab-io's serializer: the second and third calls JOIN one queued walk.
      inFlight: { reads: 2, walks: 0, waiting: 'read#2' },
      // Three undos, two walks: the one in the air and the ONE queued behind it.
      after: { reads: 3, walks: 2, savedContents: REWOUND, drawn: [], toasts: [] }
    });
  });
});
