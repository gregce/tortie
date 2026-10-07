/**
 * PHASE 343. A FILE THE EXPLORER OPENED THROUGH A LINK TO A FOLDER IS READ
 * ONLY, in the six places a tab's bytes could reach a disk (build/p343/SPEC.md
 * D11 and D12, and the entry's ruling 2: "Read only in 343").
 *
 * The flag is `throughLink`. The Explorer sets it on the open request for a row
 * under a link it drew as a folder, and the store copies it onto the tab only
 * when it CREATES the tab. Each case below is red when its clause is removed:
 *
 *   1. `tabIsReadOnly`, on this Mac and on another machine WITH a write folder,
 *      because the flag is asked before the remote reason;
 *   2. `markDirty`, which leaves a flagged tab clean;
 *   3. `redlineTypable`, which offers it no caret;
 *   4. the Redline press, which says the existing read-only sentence before
 *      `pressRedline` is called and before a byte is read, driven through the
 *      MOUNTED view below with the Edit menu's own door;
 *   5. `keepsBaseline`, for a prose file lexically inside its repository, and
 *      the store's open, which asks the durable store nothing for it;
 *   6. `saveOnce`, NEW in this phase, because an explicit ⌘S on a CLEAN tab
 *      still writes (S2 measured it replacing the file an in-project link
 *      points at): a clean flagged tab sends nothing through any of the three
 *      write doors and says nothing, on both computers, beside a control that
 *      is the same tab without the flag and does write;
 *
 * plus the flag at creation only, both ways round, and the band's words in the
 * panel, read off its source in the order the chain stands because the panel
 * is not rendered in this lane.
 *
 * TWO MODULE GRAPHS, ONE FILE. The store and save half runs over the real
 * editor store and tab IO with Monaco's buffer stubbed (the
 * `p336-remote-tab-writable.test.ts` shape); the press half mounts
 * `RedlineDocument` on React's own root over the fake document
 * `p282-view-presses.test.ts` keeps (copied below, because a node process has
 * no DOM and that file is a test, not a module). Each half resets the module
 * registry and stubs its own globals in its `beforeAll`, so neither sees the
 * other's mocks; `vi.doMock` is used rather than `vi.mock` because the latter
 * is hoisted over the whole file.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { gatedFs, gmuxBridge } from './p282-gated-fs';
import { arrivalOver } from './p334-arrival';

type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../tab-types').EditorTab;
type MachineStateView = import('@shared/ipc').MachineStateView;
type PutInput = import('@shared/ipc').MachineFilePutInput;
type PutResult = import('@shared/ipc').MachineFilePutResult;

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Comments blanked, so a rule is never satisfied by its own explanation. */
const codeOf = (file: string): string =>
  readFileSync(resolve(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

// ---------------------------------------------------------------------------
// The store and save half.
// ---------------------------------------------------------------------------

const REPO = '/Users/op/project';
/** The issue's shape: `.claude/skills -> ../.agent/skills`. */
const LINKED_REL = '.claude/skills/notes.md';
const SAVED = 'notes\n';

const FAR_REPO = '/srv/greg/api';
const LABEL = 'Studio';

describe('a tab the Explorer opened through a link', () => {
  const buffer = { text: SAVED };
  const model = { getValue: () => buffer.text };
  const readFile = vi.fn(async () => ({ contents: SAVED, truncated: false }));
  const showHead = vi.fn(async () => SAVED);
  const writeFile = vi.fn(async () => undefined);
  const writeGuarded = vi.fn(async () => ({ outcome: 'wrote' as const, sha256: 'a'.repeat(64), bytes: SAVED.length }));
  const putFile = vi.fn(
    async (_input: PutInput): Promise<PutResult> => ({
      outcome: 'wrote',
      sha256: 'a'.repeat(64),
      bytes: SAVED.length,
      writeRoot: FAR_REPO
    })
  );
  const reviewFile = vi.fn();
  const baselineLoad = vi.fn(async () => ({ found: false }));
  const baselineStore = vi.fn(async () => ({ stored: false }));
  let toasts: string[] = [];

  let useEditor: typeof import('../store').useEditor;
  let useApp: typeof import('../../state/store').useApp;
  let tabIsReadOnly: typeof import('../tab-readonly').tabIsReadOnly;
  let remoteTabWriteFolder: typeof import('../tab-readonly').remoteTabWriteFolder;
  let redlineTypable: typeof import('../redline-edits').redlineTypable;
  let keepsBaseline: typeof import('../baseline-durable').keepsBaseline;

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock('../monaco-loader', () => ({
      loadMonaco: async () => ({}),
      rememberLoaded: () => undefined,
      getLoadedMonaco: () => null,
      rekeyTabResources: () => undefined,
      workingModel: () => model,
      getWorkingModel: () => model,
      applyModelText: () => undefined,
      resetWorkingModel: () => undefined,
      languageFor: () => 'plaintext',
      ensureWorkingModel: async () => model,
      disposeModels: () => undefined,
      saveViewState: () => undefined,
      takeViewState: () => null,
      dropViewState: () => undefined
    }));
    vi.stubGlobal('window', {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
      gmux: {
        fs: { readFile, writeFile, writeGuarded, readDir: vi.fn(async () => ({ entries: [] })), readImage: vi.fn() },
        git: { showHead, onChanged: () => () => undefined },
        machines: { reviewFile, putFile },
        baselines: { load: baselineLoad, store: baselineStore, forget: async () => undefined }
      }
    });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    vi.stubGlobal('document', { body: { classList: { add() {}, remove() {}, contains: () => false } } });
    ({ useEditor } = await import('../store'));
    ({ useApp } = await import('../../state/store'));
    ({ tabIsReadOnly, remoteTabWriteFolder } = await import('../tab-readonly'));
    ({ redlineTypable } = await import('../redline-edits'));
    ({ keepsBaseline } = await import('../baseline-durable'));
  });

  afterAll(() => {
    vi.doUnmock('../monaco-loader');
    vi.unstubAllGlobals();
  });

  function machines(): MachineStateView[] {
    return [
      {
        id: 'studio',
        label: LABEL,
        color: 'blue',
        link: 'connected',
        everAnswered: true,
        lastAnsweredAt: 0,
        detail: null,
        savesInProjects: true,
        writeRoot: null
      }
    ];
  }

  beforeEach(() => {
    toasts = [];
    buffer.text = SAVED;
    useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
    useApp.setState({
      machineStates: machines(),
      projects: [
        { id: 'p', path: REPO, name: 'project' },
        { id: `p:${FAR_REPO}`, path: FAR_REPO, name: 'api', machineId: 'studio' }
      ],
      activeProjectId: 'p',
      toast: (_kind: string, text: string) => {
        toasts.push(text);
      }
    } as never);
    vi.clearAllMocks();
    reviewFile.mockResolvedValue({
      oldContents: SAVED,
      newContents: SAVED,
      binary: false,
      truncated: false,
      note: null,
      bytes: SAVED.length
    });
  });

  /** One open from the Explorer, local; `through` is what the Explorer would set. */
  function localReq(rel: string, through: boolean): OpenFileRequest {
    return {
      repoPath: REPO,
      relPath: rel,
      path: `${REPO}/${rel}`,
      mode: 'file',
      source: 'tree',
      preview: false,
      ...(through ? { throughLink: true as const } : {})
    };
  }

  /** The same open on another machine, inside a project open there. */
  function farReq(rel: string, through: boolean): OpenFileRequest {
    return {
      repoPath: FAR_REPO,
      relPath: rel,
      path: `${FAR_REPO}/${rel}`,
      mode: 'diff',
      source: 'tree',
      preview: false,
      remote: { machineId: 'studio', machineLabel: LABEL, repoPath: FAR_REPO },
      ...(through ? { throughLink: true as const } : {})
    };
  }

  async function open(req: OpenFileRequest): Promise<EditorTab> {
    useEditor.getState().openFromRequest(req);
    await flush();
    await flush();
    const id = useEditor.getState().activeId as string;
    return useEditor.getState().tabs.find((t) => t.id === id) as EditorTab;
  }

  const live = (id: string): EditorTab => useEditor.getState().tabs.find((t) => t.id === id) as EditorTab;

  /** What Monaco asks, with the folder MonacoHost would hand it. */
  const readOnlyNow = (tab: EditorTab): boolean => {
    const app = useApp.getState();
    return tabIsReadOnly(tab, remoteTabWriteFolder(tab, app.machineStates, app.projects));
  };

  const writesSent = (): number =>
    writeGuarded.mock.calls.length + writeFile.mock.calls.length + putFile.mock.calls.length;

  describe('1. tabIsReadOnly', () => {
    const local = { deleted: false, truncated: false, commit: null } as unknown as EditorTab;
    const far = {
      ...local,
      remote: { machineId: 'studio', machineLabel: LABEL, repoPath: FAR_REPO }
    } as unknown as EditorTab;

    it('is true with the flag on this Mac, where the same tab without it is an edit surface', () => {
      expect(tabIsReadOnly(local, null)).toBe(false);
      expect(tabIsReadOnly({ ...local, throughLink: true }, null)).toBe(true);
    });

    it('is true with the flag on another machine WITH a write folder, so the flag wins over the remote reason', () => {
      expect(tabIsReadOnly(far, FAR_REPO)).toBe(false);
      expect(tabIsReadOnly({ ...far, throughLink: true }, FAR_REPO)).toBe(true);
    });

    it('is what Monaco is told for a tab the store opened, local and far', async () => {
      const mine = await open(localReq(LINKED_REL, true));
      expect(mine.throughLink).toBe(true);
      expect(readOnlyNow(mine)).toBe(true);
      useEditor.setState({ tabs: [], activeId: null });
      const theirs = await open(farReq(LINKED_REL, true));
      expect(theirs.throughLink).toBe(true);
      // The folder on that machine is real, so only the flag makes it read only.
      const app = useApp.getState();
      expect(remoteTabWriteFolder(theirs, app.machineStates, app.projects)).toBe(FAR_REPO);
      expect(readOnlyNow(theirs)).toBe(true);
    });
  });

  describe('2. markDirty', () => {
    it('leaves a flagged tab clean, local and far, where the unflagged control goes dirty', async () => {
      const flagged = await open(localReq(LINKED_REL, true));
      useEditor.getState().markDirty(flagged.id, true);
      expect(live(flagged.id).dirty).toBe(false);

      const control = await open(localReq('src/index.ts', false));
      useEditor.getState().markDirty(control.id, true);
      expect(live(control.id).dirty).toBe(true);

      const far = await open(farReq(LINKED_REL, true));
      useEditor.getState().markDirty(far.id, true);
      expect(live(far.id).dirty).toBe(false);
    });
  });

  describe('3. redlineTypable', () => {
    it('offers a flagged tab no caret', () => {
      const tab = {
        commit: null,
        truncated: false,
        deleted: false,
        error: null,
        loading: false
      } as unknown as EditorTab;
      expect(redlineTypable(tab)).toBe(true);
      expect(redlineTypable({ ...tab, throughLink: true })).toBe(false);
    });
  });

  describe('5. keepsBaseline', () => {
    it('is false for a prose file lexically inside its repository, opened through a link', () => {
      const tab = {
        commit: null,
        truncated: false,
        repoPath: REPO,
        relPath: LINKED_REL,
        path: `${REPO}/${LINKED_REL}`
      };
      expect(keepsBaseline(tab)).toBe(true);
      expect(keepsBaseline({ ...tab, throughLink: true })).toBe(false);
    });

    it('so opening one asks the durable store nothing, where the control asks it', async () => {
      await open(localReq(LINKED_REL, true));
      expect(readFile).toHaveBeenCalled();
      expect(baselineLoad).not.toHaveBeenCalled();
      expect(baselineStore).not.toHaveBeenCalled();
      await open(localReq('docs/notes.md', false));
      expect(baselineLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. saveOnce', () => {
    it('a CLEAN flagged tab on this Mac sends nothing through any door and says nothing; the control writes', async () => {
      const control = await open(localReq('docs/notes.md', false));
      expect(live(control.id).dirty).toBe(false);
      await useEditor.getState().save();
      expect(writeGuarded).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      const flagged = await open(localReq(LINKED_REL, true));
      expect(useEditor.getState().activeId).toBe(flagged.id);
      expect(live(flagged.id).dirty).toBe(false);
      await useEditor.getState().save();
      expect(writesSent()).toBe(0);
      expect(toasts).toEqual([]);
    });

    it('a CLEAN flagged tab on another machine with a write folder sends nothing and says nothing; the control writes', async () => {
      const control = await open(farReq('src/auth.ts', false));
      expect(readOnlyNow(control)).toBe(false);
      await useEditor.getState().save();
      expect(putFile).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      const flagged = await open(farReq(LINKED_REL, true));
      expect(useEditor.getState().activeId).toBe(flagged.id);
      await useEditor.getState().save();
      expect(writesSent()).toBe(0);
      expect(toasts).toEqual([]);
    });

    it('is refused above every door, so a local tab whose bytes differ still writes nothing', async () => {
      const flagged = await open(localReq(LINKED_REL, true));
      buffer.text = 'typed somehow\n';
      await useEditor.getState().save();
      expect(writesSent()).toBe(0);
      expect(toasts).toEqual([]);
      expect(live(flagged.id).savedContents).toBe(SAVED);
    });
  });

  describe('the flag is taken at creation only', () => {
    it('a flagged open then an unflagged open of the same file stays read only', async () => {
      const first = await open(localReq(LINKED_REL, true));
      const again = await open({ ...localReq(LINKED_REL, false) });
      expect(again.id).toBe(first.id);
      expect(useEditor.getState().tabs.length).toBe(1);
      expect(again.throughLink).toBe(true);
      expect(readOnlyNow(again)).toBe(true);
    });

    it('an unflagged open then a flagged open stays editable, and a dirty tab is never turned read only', async () => {
      const first = await open(localReq(LINKED_REL, false));
      useEditor.getState().markDirty(first.id, true);
      const again = await open(localReq(LINKED_REL, true));
      expect(again.id).toBe(first.id);
      expect(again.throughLink).toBeUndefined();
      expect(again.dirty).toBe(true);
      expect(readOnlyNow(again)).toBe(false);
    });

    it('an open with no flag at all carries no field, so every other opener is unchanged', async () => {
      const tab = await open(localReq('src/index.ts', false));
      expect('throughLink' in tab).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// The band, read off the panel's source in the order the chain stands.
// ---------------------------------------------------------------------------

describe('the band', () => {
  it('is drawn first after a deleted file, with the lock and the read-only class, in exactly these words', () => {
    const code = codeOf('../EditorPanel.tsx');
    const deleted = code.indexOf('{activeTab.deleted ? (');
    const link = code.indexOf(') : activeTab.throughLink === true ? (');
    const cap = code.indexOf(') : remoteCapBand !== null ? (');
    expect(deleted).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(deleted);
    expect(cap).toBeGreaterThan(link);
    const arm = code.slice(link, cap);
    expect(arm).toContain('className="banner ed-banner-readonly"');
    expect(arm).toContain('<Codicon name="lock" size="md" />');
    expect(arm).toContain('<span className="banner-text">Read only · opened through a link</span>');
    // Nothing between the deleted arm and this one.
    const between = code.slice(deleted, link);
    expect(between.match(/\) : /g)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The press half: the fake document `p282-view-presses.test.ts` keeps, copied
// whole (its own header says which properties of Chromium it keeps and why).
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

describe('4. the Redline press, through the mounted view', () => {
  const doc = new FakeDocument();
  const sha = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
  const main = gatedFs(sha);
  const arrival = arrivalOver(() => main.fs.readFile());
  const toasts: string[] = [];
  const noRef = (): void => undefined;

  // The store's arrival floor reads `performance.now()`: one fresh window per
  // case, held still inside it (./p334-arrival `ownTheStoreClock`, scoped here
  // so the store half above never sees it).
  let clock = 0;
  let nowSpy: ReturnType<typeof vi.spyOn> | null = null;

  let React: typeof import('react');
  let createRoot: typeof import('react-dom/client').createRoot;
  let useEditor: typeof import('../store').useEditor;
  let useApp: typeof import('../../state/store').useApp;
  let RedlineDocument: typeof import('../RedlineDocument').RedlineDocument;
  let pressRefusedUpFront: typeof import('../RedlineDocument').pressRefusedUpFront;
  let runRedlineCommand: typeof import('../redline-commands').runRedlineCommand;
  let NO_BASELINE: typeof import('../baseline').NO_BASELINE;
  let nextBaseline: typeof import('../baseline').nextBaseline;
  let forgetRewindJournal: typeof import('../redline-journal').forgetRewindJournal;
  let redlineRefusalSentence: typeof import('../redline-sentences').redlineRefusalSentence;
  let redlineUndoRefusalSentence: typeof import('../redline-sentences').redlineUndoRefusalSentence;

  beforeAll(async () => {
    nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.resetModules();
    vi.doMock('../MonacoHost', () => ({ OpeningSkeleton: () => null }));
    vi.doMock('../live-text', () => ({ useLiveTabText: (_id: string, saved: string) => saved }));
    vi.doMock('../redline-chip', () => ({ RedlineChip: () => null }));
    vi.doMock('../../app/menu-redline', () => ({ pushRedlineMountedToMenu: () => undefined }));
    vi.doMock('../redline-edits', () => ({
      useRedlineTyping: () => ({ text: null, docProps: { ref: noRef }, caretMove: null, canUndoTyping: false })
    }));
    vi.stubGlobal('window', {
      document: undefined,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
      HTMLIFrameElement: class {},
      gmux: gmuxBridge(main, {
        fs: { readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn(), readFile: arrival.readFile }
      })
    });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('Element', FakeElement);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    React = await import('react');
    ({ createRoot } = await import('react-dom/client'));
    ({ useEditor } = await import('../store'));
    ({ useApp } = await import('../../state/store'));
    ({ RedlineDocument, pressRefusedUpFront } = await import('../RedlineDocument'));
    ({ runRedlineCommand } = await import('../redline-commands'));
    ({ NO_BASELINE, nextBaseline } = await import('../baseline'));
    ({ forgetRewindJournal } = await import('../redline-journal'));
    ({ redlineRefusalSentence, redlineUndoRefusalSentence } = await import('../redline-sentences'));
  });

  afterAll(() => {
    nowSpy?.mockRestore();
    for (const path of ['../MonacoHost', '../live-text', '../redline-chip', '../../app/menu-redline', '../redline-edits']) {
      vi.doUnmock(path);
    }
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    clock += 60_000;
  });

  const ID = '/repo/.claude/skills/notes.txt';
  const BASE = 'The quick brown fox jumps over the lazy dog.\n';
  const AGENT = 'The quick red fox jumps over the lazy dog.\n';

  function tabOf(through: boolean): EditorTab {
    return {
      id: ID, path: ID, relPath: '.claude/skills/notes.txt', origRelPath: null, repoPath: '/repo',
      name: 'notes.txt', projectId: 'p', mode: 'redline', canDiff: true, markdown: false,
      image: false, svg: false, html: false, imageData: null, imageHead: null, imageRevision: 0, preview: false,
      commit: null, pendingSelection: null, pendingFocus: false, dirty: false, deleted: false, truncated: false,
      loading: false, error: null, savedContents: AGENT, headContents: BASE,
      baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: BASE }, 1), lastUsed: 0, contextEntry: null,
      ...(through ? { throughLink: true as const } : {})
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

  async function mount(tab: EditorTab): Promise<void> {
    main.reset(tab.savedContents);
    toasts.length = 0;
    forgetRewindJournal(tab.id);
    useApp.setState({ toast: (_kind: string, text: string) => void toasts.push(text) } as never);
    useEditor.setState({ projectId: 'p', tabs: [tab], activeId: tab.id, panelOpen: true } as never);
    function View(): React.ReactElement | null {
      const t = useEditor((s) => s.tabs.find((one) => one.id === s.activeId));
      return t === undefined ? null : React.createElement(RedlineDocument, { tab: t });
    }
    container = doc.createElement('div');
    doc.body.appendChild(container);
    root = createRoot(container as never);
    arrival.begin([tab]);
    await act(() => {
      root?.render(React.createElement(View));
    });
    arrival.done();
  }

  afterEach(async () => {
    if (root !== null) await act(() => root?.unmount());
    if (container !== null) doc.body.removeChild(container);
    root = null;
    container = null;
    doc.activeElement = doc.body;
  });

  const drawnChanges = (): number => container?.querySelectorAll('.ed-redline-change').length ?? 0;
  /** The Edit menu's own door to the mounted view's four commands. */
  const command = (verb: 'next' | 'rewind' | 'undo'): Promise<void> =>
    act(() => {
      expect(runRedlineCommand(verb)).toBe(true);
    });

  it('the helper answers readOnly for a flagged tab and nothing for any other', () => {
    expect(pressRefusedUpFront({ throughLink: true })).toBe('readOnly');
    expect(pressRefusedUpFront({})).toBeNull();
  });

  it('⌥⌫ on a flagged tab says the read-only sentence and reads and writes nothing', async () => {
    await mount(tabOf(true));
    expect(drawnChanges()).toBe(1);
    await command('next');
    await command('rewind');
    expect(toasts).toEqual([redlineRefusalSentence('readOnly', 'notes.txt')]);
    expect(toasts).toEqual(['notes.txt is read-only, so it cannot be rewound.']);
    expect([main.reads, main.writes, main.disk.writes]).toEqual([0, 0, 0]);
    expect(main.disk.text).toBe(AGENT);
  });

  it('⌥⇧⌫ on a flagged tab says the undo’s own read-only sentence and reads nothing', async () => {
    await mount(tabOf(true));
    await command('undo');
    expect(toasts).toEqual([redlineUndoRefusalSentence('readOnly', 'notes.txt')]);
    expect(toasts).toEqual(['notes.txt is read-only, so the rewind cannot be undone.']);
    expect([main.reads, main.writes]).toEqual([0, 0]);
  });

  it('the same press on the same tab without the flag rewinds, so the refusal above is the flag’s', async () => {
    await mount(tabOf(false));
    await command('next');
    await command('rewind');
    expect(toasts).toEqual([]);
    expect(main.disk.writes).toBe(1);
    expect(main.disk.text).toBe(BASE);
  });

  it('the press asks the helper before it reads the pressed change and before pressRedline', () => {
    const code = codeOf('../RedlineDocument.tsx');
    const at = code.indexOf('const press = useCallback(');
    const press = code.slice(at, code.indexOf('useCallback(', at + 'const press = useCallback('.length));
    const ask = press.indexOf('pressRefusedUpFront(live)');
    const refused = press.indexOf('refuse(upFront);');
    expect(ask).toBeGreaterThan(-1);
    expect(refused).toBeGreaterThan(ask);
    expect(press.indexOf('return;', refused)).toBeGreaterThan(refused);
    expect(press.indexOf('pressedElement(host)')).toBeGreaterThan(refused);
    expect(press.indexOf('pressRedline(')).toBeGreaterThan(refused);
  });
});
