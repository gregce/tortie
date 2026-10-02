/**
 * PHASE 282. THE PRESSES, THROUGH THE REAL VIEW: the keyboard after a rewind of
 * the only change, the move after an agent's write above, a second chord inside
 * a rewind's write, and a held key.
 *
 * `p282-move-on.test.ts` and `p282-one-press.test.ts` pin the rules in the
 * modules that own them and read the view's wiring as source. This file MOUNTS
 * `RedlineDocument` on React 19's own root and drives it with key events, so
 * the view's own `press`, `accept`, key handler and layout effects run: a
 * wiring that reads right and orders wrong is caught here and nowhere else in
 * the unit lane. The Phase 282 review reproduced these defects in the running
 * app and, for the move, by mounting this very component in Chromium; this lane
 * has no browser and no jsdom, so the document below is a fake that keeps
 * exactly the properties those defects depend on, and each one is named where
 * it is kept:
 *
 *   - FOCUS. `focus()` moves `activeElement` only onto a focusable element and
 *     fires a bubbling `focusin` (React's `onFocus`); and REMOVING the focused
 *     element, or anything holding it, sends `activeElement` to `body`, which is
 *     Chromium's focus fixup and the whole of finding 5: the scroller's key
 *     handler is a React handler ON the scroller, so a keydown at `body` never
 *     reaches it.
 *   - EVENTS. A keydown is dispatched at `document.activeElement`, capture then
 *     bubble along the parent chain, which is how React's root listener sees it
 *     and how a key the view no longer holds is lost.
 *   - SELECTORS. Only the three shapes the redline asks: `.class`,
 *     `.class[attr]` and `[attr]`.
 *
 * What is mocked is what this phase does not own and what a node process has
 * no copy of: Monaco's skeleton, the typing hook (SAVE's half, and its caret
 * needs a real selection), the chip (it only measures) and the menu push. Main
 * is a string on "disk" with a sha256 compare-and-swap in one synchronous step,
 * whose reads and writes can each be held at a named gate. The watcher's
 * delivery is a store patch of `savedContents`, which is the read it makes.
 *
 * PHASE 282.2. ONE READ IN HERE IS NOT HAND MADE ANY MORE. The view now asks
 * for a read itself when a tab goes clean under a landed hold, so the 282.1
 * case below runs ../tab-io's real walk against this main: the file read is
 * counted at `main.reads`, and because that walk asks git for the HEAD version
 * afterwards, `git.showHead` answers the HEAD each tab was mounted with rather
 * than the bridge's empty string.
 */

import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { gatedFs, gmuxBridge } from './p282-gated-fs';
import { arrivalOver, ownTheStoreClock } from './p334-arrival';

// ---------------------------------------------------------------------------
// The document.
// ---------------------------------------------------------------------------

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
    // CHROMIUM'S FOCUS FIXUP: the focused element left the tree, so the
    // document's focus goes to body and no element receives the keyboard.
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

/** Capture from the top, then bubble from the target, along the parent chain. */
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

/** `.class`, `.class[attr]` and `[attr]`, compound, and nothing else. */
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
  /** Chromium's rule: only a focusable element in the document takes focus, and it says so with `focusin`. */
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

// ---------------------------------------------------------------------------
// Main, the bridge and the mocks.
// ---------------------------------------------------------------------------

const doc = new FakeDocument();
const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
/** Only the steps a test names are held, so a whole mount drives itself. */
const main = gatedFs(sha);
const disk = main.disk;
/** PHASE 334. The view's arrival reads every open tab: ./p334-arrival says why it is answered apart. */
const arrival = arrivalOver(() => main.fs.readFile());
ownTheStoreClock();
/** PHASE 282.2. Each mounted file's HEAD version, by the path the walk asks git with. */
const heads = new Map<string, string>();

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
    git: { showHead: async (input: { path: string }) => heads.get(input.path) ?? '' }
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

// ---------------------------------------------------------------------------
// The mount.
// ---------------------------------------------------------------------------

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

/** Mount the view over tabs whose first is active, with `onDisk` as the file's bytes. */
async function mount(tabs: EditorTab[], onDisk: string): Promise<void> {
  main.reset(onDisk);
  toasts.length = 0;
  heads.clear();
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
  // PHASE 334. The arrival is a look over the bytes each tab holds, and
  // `onDisk` is the agent's write after it (./p334-arrival).
  arrival.begin(tabs);
  await act(() => {
    root?.render(React.createElement(View));
  });
  expect(arrival.done()).toBe(tabs.length);
}

afterEach(async () => {
  if (root !== null) await act(() => root?.unmount());
  if (container !== null) doc.body.removeChild(container);
  root = null;
  container = null;
  doc.activeElement = doc.body;
});

const host = (): FakeElement => {
  const el = container?.querySelector('.ed-redline-scroll');
  if (el === null || el === undefined) throw new Error('the view drew no scroller');
  return el;
};
const wrappers = (): FakeElement[] => container?.querySelectorAll('.ed-redline-change') ?? [];
const label = (el: FakeElement | null | undefined): string | null =>
  el === null || el === undefined ? null : `${JSON.stringify(el.getAttribute('data-change-del'))}->${JSON.stringify(el.getAttribute('data-change-ins'))}`;
const drawn = (): (string | null)[] => wrappers().map(label);
const marked = (): string | null => label(container?.querySelector('.ed-redline-change[data-current]'));

/** A chord, dispatched where Chromium would send it: at the focused element. */
const chord = (key: string, mods: { shift?: boolean; repeat?: boolean } = {}): Promise<void> =>
  act(() => {
    dispatch(doc.activeElement ?? doc.body, {
      type: 'keydown', key, altKey: true, shiftKey: mods.shift === true, metaKey: false, ctrlKey: false,
      repeat: mods.repeat === true, keyCode: 0
    });
  });
const next = (): Promise<void> => chord('ArrowDown');
const rewind = (repeat = false): Promise<void> => chord('Backspace', { repeat });
const undo = (): Promise<void> => chord('Backspace', { shift: true });
const accept = (): Promise<void> => chord('Enter');
const release = async (label: string): Promise<void> => {
  const step = main.take(label);
  if (step === null) throw new Error(`nothing is held at ${label}; held: ${main.waiting()}`);
  // Inside `act`, because what a released step causes here is a RENDER.
  await act(() => step());
};
/** The watcher's read of the file, which is what moves `savedContents` when the adoption refused. */
const watcherReads = (id: string): Promise<void> =>
  act(() => {
    useEditor.setState({ tabs: useEditor.getState().tabs.map((t) => (t.id === id ? { ...t, savedContents: disk.text } : t)) });
  });

const ID = '/repo/notes.txt';
const BASE = 'The quick brown fox jumps over the lazy dog.\n';
const AGENT = 'The quick red fox leaps over the lazy dog.\n';

describe('the presses, through the mounted view', () => {
  it('THE REWIND KEEPS THE KEYBOARD: ⌥⌫ on the only change, then ⌥⇧⌫ brings it back without a click', async () => {
    const ONE = 'The quick red fox jumps over the lazy dog.\n';
    await mount([tabOf(ID, BASE, ONE)], ONE);
    expect(drawn()).toEqual(['"brown"->"red"']);
    await next();
    expect(marked()).toBe('"brown"->"red"');
    await rewind();
    const afterRewind = {
      disk: disk.text,
      drawn: drawn(),
      keyboardInTheView: doc.activeElement !== null && host().contains(doc.activeElement)
    };
    // The undo the face names, pressed where the keyboard is.
    await undo();
    expect({ afterRewind, afterUndo: { disk: disk.text, drawn: drawn(), toasts } }).toEqual({
      afterRewind: { disk: BASE, drawn: [], keyboardInTheView: true },
      afterUndo: { disk: ONE, drawn: ['"brown"->"red"'], toasts: [] }
    });
  });

  it("AN AGENT'S WRITE ABOVE, on disk when ⌥⌫ is pressed, moves the person to the change that followed", async () => {
    const base = 'Line one is here.\nLine two is here.\nLine three is here.\nLine four is here.\n';
    const shown = 'Line one is here.\nLine TWO is here.\nLine THREE is here.\nLine FOUR is here.\n';
    const agentAbove = 'Line ONE is here.\nLine TWO is here.\nLine THREE is here.\nLine FOUR is here.\n';
    await mount([tabOf(ID, base, shown)], agentAbove);
    await next();
    await next();
    expect(marked()).toBe('"three"->"THREE"');
    await rewind();
    // The rewind re-read the agent's bytes, so the tab trailed disk and the
    // adoption refused: the picture still draws the change and the move waits.
    expect({ disk: disk.text, marked: marked() }).toEqual({
      disk: 'Line ONE is here.\nLine TWO is here.\nLine three is here.\nLine FOUR is here.\n',
      marked: '"three"->"THREE"'
    });
    await watcherReads(ID);
    expect({
      drawn: drawn(),
      marked: marked(),
      focused: label(doc.activeElement?.closest('.ed-redline-change'))
    }).toEqual({
      drawn: ['"one"->"ONE"', '"two"->"TWO"', '"four"->"FOUR"'],
      marked: '"four"->"FOUR"',
      focused: '"four"->"FOUR"'
    });
  });

  it('⌥⌫ THEN ⌥↩ INSIDE THE WRITE: the accept is refused with its sentence and the change is never drawn backwards', async () => {
    await mount([tabOf(ID, BASE, AGENT)], AGENT);
    await next();
    expect(marked()).toBe('"brown"->"red"');
    main.hold('write#1');
    await rewind();
    // The write is in the air and the mark has not moved: ⌥↩ names the same change.
    expect(marked()).toBe('"brown"->"red"');
    await accept();
    await release('write#1');
    expect({ disk: disk.text, drawn: drawn(), toasts }).toEqual({
      disk: 'The quick brown fox leaps over the lazy dog.\n',
      drawn: ['"jumps"->"leaps"'],
      toasts: ['A change in notes.txt is still being rewound, so nothing was accepted.']
    });
  });

  it('⌥⌫ ⌥⌫ INSIDE THE WRITE: the second reads nothing, writes nothing, and says why', async () => {
    await mount([tabOf(ID, BASE, AGENT)], AGENT);
    await next();
    main.hold('write#1');
    await rewind();
    await rewind();
    await release('write#1');
    expect({ reads: main.reads, writes: main.writes, disk: disk.text, drawn: drawn(), toasts }).toEqual({
      reads: 1,
      writes: 1,
      disk: 'The quick brown fox leaps over the lazy dog.\n',
      drawn: ['"jumps"->"leaps"'],
      toasts: ['That change in notes.txt is already being rewound.']
    });
  });

  it('A HELD KEY IS ONE PRESS: a repeated ⌥⌫, ⌥↩ or ⌥⇧⌫ acts on nothing, while a repeated ⌥↓ still walks', async () => {
    const base = 'alpha one beta two gamma three delta\n';
    const shown = 'ALPHA one BETA two GAMMA three delta\n';
    await mount([tabOf(ID, base, shown)], shown);
    await next();
    await rewind();
    // The press moved on to the change that followed, and the key is still down.
    expect(marked()).toBe('"beta"->"BETA"');
    await rewind(true);
    await chord('Enter', { repeat: true });
    await chord('Backspace', { shift: true, repeat: true });
    expect({ writes: main.writes, disk: disk.text, drawn: drawn(), marked: marked(), toasts }).toEqual({
      writes: 1,
      disk: 'alpha one BETA two GAMMA three delta\n',
      drawn: ['"beta"->"BETA"', '"gamma"->"GAMMA"'],
      marked: '"beta"->"BETA"',
      toasts: []
    });
    // CONTROL: walking writes nothing, so a held ⌥↓ repeats.
    await chord('ArrowDown', { repeat: true });
    expect(marked()).toBe('"gamma"->"GAMMA"');
    // And the rewind's hold let go on the redraw that took its change away, so
    // a fresh ⌥↩ is a press like any other.
    await accept();
    expect({ drawn: drawn(), toasts }).toEqual({ drawn: ['"beta"->"BETA"'], toasts: [] });
  });

  /**
   * PHASE 282.1. THE KEYSTROKE INSIDE THE WRITE, through the view. The
   * reverify's attack drove this shape and read the fix round's own rule
   * unimplemented for it: the hold landed on a tab that had gone dirty inside
   * the write, no dependency of the release effect moved at the landing, and
   * every ⌥↩ answered "still being rewound" with nothing said about the way out.
   * Its re-derive then measured that releasing the hold there is the harm: the
   * accept moves the baseline onto the agent's words and the rewind is drawn
   * backwards once the tab is clean. So the hold STAYS, the sentence on a dirty
   * tab names the way out, and once the person undoes the keystroke a read
   * lets the hold go and the follower is theirs to accept.
   *
   * PHASE 282.2. THAT READ IS THE VIEW'S OWN NOW, and this case no longer makes
   * one by hand. The 282.1 round called `watcherReads(ID)` right after the
   * undo, which is why it was green over a gap both reverifiers measured: the
   * app made no read on a tab going clean, the rewind's own tick had been
   * spent while the tab was dirty, and between the undo and some later change
   * in the repository every ⌥↩ said "still being rewound". The between-step is
   * asserted here instead: the undo ALONE takes `main.reads` from 1 to 2, the
   * picture is the disk's, and the very next ⌥↩ accepts.
   * `p2822-after-undo.test.ts` holds that read in the air and reads the linger
   * for as long as the disk has not answered.
   */
  it('A KEYSTROKE INSIDE THE WRITE: the landed hold stays on the dirty tab, ⌥↩ says the way out, and ⌘Z alone pulls the read that lets it go with nothing drawn backwards', async () => {
    await mount([tabOf(ID, BASE, AGENT)], AGENT);
    await next();
    expect(marked()).toBe('"brown"->"red"');
    main.hold('write#1');
    await rewind();
    // The person types while the write is in the air: the tab is dirty at once.
    await act(() => {
      useEditor.getState().markDirty(ID, true);
    });
    await release('write#1');
    // The rewind is on disk; the adoption refused; the picture still draws X.
    expect({ disk: disk.text, drawn: drawn(), dirty: useEditor.getState().tabs[0]?.dirty }).toEqual({
      disk: 'The quick brown fox leaps over the lazy dog.\n',
      drawn: ['"brown"->"red"', '"jumps"->"leaps"'],
      dirty: true
    });
    await accept();
    await accept();
    const whileDirty = { drawn: drawn(), toasts: [...toasts], reads: main.reads };
    // ⌘Z on the keystroke, and NOTHING ELSE: no watcher tick is delivered and
    // no store patch stands in for one. The read below is the view's.
    await act(() => {
      useEditor.getState().markDirty(ID, false);
    });
    const afterUndo = {
      reads: main.reads,
      savedContents: useEditor.getState().tabs[0]?.savedContents,
      drawn: drawn(),
      marked: marked()
    };
    await accept();
    expect({ whileDirty, afterUndo, then: { drawn: drawn(), toasts: toasts.slice(2), reads: main.reads } }).toEqual({
      whileDirty: {
        drawn: ['"brown"->"red"', '"jumps"->"leaps"'],
        toasts: [
          'A change in notes.txt was rewound, but your unsaved edits still show it, so nothing was accepted. Save or undo your edits first, then accept.',
          'A change in notes.txt was rewound, but your unsaved edits still show it, so nothing was accepted. Save or undo your edits first, then accept.'
        ],
        reads: 1
      },
      afterUndo: {
        reads: 2,
        savedContents: 'The quick brown fox leaps over the lazy dog.\n',
        drawn: ['"jumps"->"leaps"'],
        marked: '"jumps"->"leaps"'
      },
      then: { drawn: [], toasts: [], reads: 2 }
    });
  });

  it('CONTROL: a hold belongs to the tab it was pressed on, and another tab in the same view accepts', async () => {
    const OTHER = '/repo/other.txt';
    await mount([tabOf(ID, BASE, AGENT), tabOf(OTHER, 'one two\n', 'one TWO\n')], AGENT);
    await next();
    main.hold('write#1');
    await rewind();
    // The same component draws the other tab (EditorPanel gives it no key).
    await act(() => {
      useEditor.setState({ activeId: OTHER });
    });
    expect(drawn()).toEqual(['"two"->"TWO"']);
    await next();
    await accept();
    expect({ drawn: drawn(), toasts }).toEqual({ drawn: [], toasts: [] });
    await release('write#1');
  });
});
