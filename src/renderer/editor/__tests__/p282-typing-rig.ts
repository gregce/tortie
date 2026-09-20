/**
 * PHASE 282. THE REDLINE'S TYPING HALF, MOUNTED FOR REAL AND WITHOUT A DOM.
 *
 * Shared by `p282-typing-burst.test.ts` and `p282-keystroke-in-transit.test.ts`,
 * and deliberately not a test itself. What runs is the SHIPPING code: React
 * 19's own root, `useLiveTabText` (./live-text, NOT mocked — mocking it is how
 * the PR's scramble passed every unit suite), `useRedlineTyping`
 * (./redline-edits), ./monaco-loader's registry, the editor store, `markDirty`,
 * `adoptWritten`, `save` and the rewind's own `pressRedline` and
 * `applyRewind`. What is faked is only what a node process has no copy of:
 *
 *   - the Monaco chunk, as a model that answers `getValue`, fires its change
 *     listeners synchronously the way `textModel.js` does, and keeps offsets in
 *     one column so no line arithmetic is involved. Its import is GATED, so a
 *     test decides whether the first keystroke of a session outlasts a round
 *     trip, which is the real chunk load research 97 measured;
 *   - main, as a string on "disk" with a sha256 compare-and-swap in one
 *     synchronous step (src/main/fs/guarded-write.ts's steps 3 to 9), whose
 *     reads and writes can each be HELD at a named gate;
 *   - the caret, which the calling file mocks in ./redline-caret so that the
 *     next keystroke lands where the view last PUT the caret. That is the one
 *     property of a real contenteditable the scramble depends on: probe:p237
 *     read `"rely\n lathro"` because the view restored a caret mapped through
 *     its own write mistaken for an outside one.
 *
 * The calling file owns the `vi.mock` of ./redline-caret (mocks are hoisted per
 * file) and hands this rig the object that mock reads.
 *
 * ## PHASE 297 GAVE IT A SECOND TAB, and everything about it is opt-in
 *
 * `second: true` opens a second redline tab on a second file with a disk of its
 * own, and `switchTo(id)` clicks it in the lane a real click commits in. The
 * mount follows the ACTIVE tab and is not keyed by it, which is what
 * EditorPanel.tsx does, so a switch is a prop change through one mount — the
 * shape the tab-switch defect needs. With `second` left out nothing changes:
 * one tab, one disk, one `readDir` entry, and every reading the Phase 282 files
 * take is the reading they took before.
 */

import { createHash } from 'node:crypto';
import { vi } from 'vitest';

import { gatedFs, gmuxBridge } from './p282-gated-fs';

export const HEAD = 'Alpha brown fox runs. Beta line stays.\n';
/** What the agent wrote: `brown` became `red`. On disk before anything runs. */
export const AGENT = 'Alpha red fox runs. Beta line stays.\n';
export const ROOT = '/w/proj';
export const ID = `${ROOT}/doc.md`;

/**
 * PHASE 297. THE SECOND TAB, mounted only when `second` is asked for, so every
 * test written before this one mounts exactly the one tab it always did.
 *
 * Its bytes share no word with `AGENT` or `HEAD` on purpose: the whole
 * question this second tab exists to answer is whether one file's text can end
 * up in the other one's buffer, and a substring in common would make that
 * reading ambiguous.
 */
export const OTHER_ID = `${ROOT}/other.md`;
export const OTHER = 'Second file. Only this sentence is in it.\n';

const hex = (t: string): string => createHash('sha256').update(t).digest('hex');

/** The caret the calling file's ./redline-caret mock reads and writes. */
export interface CaretCell {
  at: number;
}

class FakeModel {
  private text: string;
  private subs: Array<() => void> = [];
  /**
   * PHASE 297. EVERY VALUE THIS BUFFER HAS EVER HELD, from its birth, the
   * constructor's text first.
   *
   * A settled reading is not evidence about a write into the wrong tab: one
   * corner of the tab-switch defect writes the departing file's text into the
   * arriving tab's model and then, one task later, writes the arriving tab's
   * own bytes back over it, so the buffer reads correct a frame afterwards
   * while a ⌘S inside the window has already written the wrong file. The
   * history is recorded here, in the model, rather than from a subscription a
   * test installs, because in the corner that matters the model does not exist
   * yet when the test would subscribe.
   */
  readonly history: string[];
  /**
   * PHASE 297. How many times an undo GROUP was closed on this buffer, which is
   * `pushStackElement` and is the only observable of "this keystroke starts a
   * new ⌘Z rather than joining the last one".
   */
  undoGroups = 0;
  constructor(text: string) {
    this.text = text;
    this.history = [text];
  }
  getValue(): string {
    return this.text;
  }
  isDisposed(): boolean {
    return false;
  }
  dispose(): void {}
  updateOptions(): void {}
  pushStackElement(): void {
    this.undoGroups += 1;
  }
  undo(): void {}
  redo(): void {}
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
    for (const op of ops) {
      this.text =
        this.text.slice(0, op.range.startColumn - 1) + op.text + this.text.slice(op.range.endColumn - 1);
    }
    this.history.push(this.text);
    for (const s of [...this.subs]) s();
    return null;
  }
}

export interface RigOptions {
  /** The caret cell the calling file's ./redline-caret mock reads. */
  caret: CaretCell;
  /** Hold the Monaco chunk's import until `releaseChunk()`. */
  holdChunk: boolean;
  /** Create the working model before the view mounts, as a File view would have. */
  modelFirst: boolean;
  /** The Monaco chunk's import REJECTS once it is let go, as a failed chunk load does. */
  failChunk?: boolean;
  /**
   * PHASE 297. Open a SECOND redline tab on ./other.md, with a disk of its own,
   * so `switchTo` is a real tab click between two files and not a remount.
   */
  second?: boolean;
  /**
   * PHASE 297. Create the SECOND tab's working model before the view mounts, as
   * opening it in the File view first would. It is the knob the app verifiers'
   * L1 and L2 arms differ by: with a model the arriving tab's buffer is written
   * directly, without one it is created inside the write.
   */
  modelFirstSecond?: boolean;
}

export async function mountTypingRig(opts: RigOptions) {
  vi.resetModules();
  let releaseChunk: () => void = () => undefined;
  const chunk = opts.holdChunk
    ? new Promise<void>((r) => {
        releaseChunk = r;
      })
    : Promise.resolve();
  vi.doMock('../monaco-impl', async () => {
    await chunk;
    if (opts.failChunk === true) throw new Error('the chunk did not load');
    return {
      monaco: {
        Uri: { from: (o: object) => o },
        editor: { getModel: () => null, createModel: (t: string) => new FakeModel(t) },
        languages: { getLanguages: () => [] }
      }
    };
  });

  // Main, shared with the phase's other two rigs (./p282-gated-fs). Only the
  // steps a test names are held, so a mount drives itself until it is attacked.
  const main = gatedFs(hex);
  main.reset(AGENT);
  const disk = main.disk;

  // PHASE 297. THE SECOND FILE HAS A DISK OF ITS OWN, and it is here rather
  // than in ./p282-gated-fs because that module is one file's compare-and-swap
  // with the gates this phase's other rigs hold steps at, and nothing in this
  // phase needs to hold a step on the second file. Only the second tab's path
  // is answered here; everything else still goes to `main`, so every gate a
  // test holds by name works exactly as it did.
  const otherDisk = { text: OTHER, writes: 0 };
  const secondFs = {
    readFile: async (path: string) =>
      path === OTHER_ID ? { contents: otherDisk.text, truncated: false } : main.fs.readFile(),
    writeGuarded: async (input: { path: string; expect: string; contents: string }) => {
      if (input.path !== OTHER_ID) return main.fs.writeGuarded(input);
      const now = hex(otherDisk.text);
      if (now !== input.expect) {
        return { outcome: 'stale' as const, sha256: now, reason: 'changed since it was read' };
      }
      otherDisk.text = input.contents;
      otherDisk.writes += 1;
      return { outcome: 'wrote' as const, sha256: hex(input.contents), bytes: input.contents.length };
    }
  };

  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    HTMLIFrameElement: class {},
    gmux: gmuxBridge(main, {
      fs: {
        readDir: async () => ({
          entries: opts.second === true ? [{ name: 'doc.md' }, { name: 'other.md' }] : [{ name: 'doc.md' }]
        }),
        // The plain door is never this domain's; conformance:save owns the rule.
        writeFile: async () => {
          throw new Error('the plain door must not be used');
        },
        ...(opts.second === true ? secondFs : {})
      },
      git: { showHead: async (input: { path: string }) => (input.path === 'other.md' ? OTHER : HEAD) },
      rest: { machines: {} }
    })
  });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } },
    addEventListener() {},
    removeEventListener() {}
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const React = await import('react');
  // PHASE 297. `flushSync` is how `switchTo` reaches the discrete lane a click
  // commits in; see its own comment for why `act` will not do.
  const ReactDOM = await import('react-dom');
  const { createRoot } = await import('react-dom/client');
  const { useEditor } = await import('../store');
  const { useApp } = await import('../../state/store');
  const { useSettingsStore } = await import('../../settings/settings-store');
  const { useLiveTabText } = await import('../live-text');
  const { useRedlineTyping } = await import('../redline-edits');
  const { ensureWorkingModel, getWorkingModel } = await import('../monaco-loader');
  const { pressRedline } = await import('../redline-press');
  const { applyRewind } = await import('../redline-write');
  const { composeRedlineDocument } = await import('../redline-document');
  const { changesOf } = await import('../rewind');
  const { NO_BASELINE, nextBaseline, redlineBaseSide } = await import('../baseline');
  const { redlineRefusalSentence } = await import('../redline-sentences');

  useApp.setState({
    projects: [{ id: 'p', path: ROOT, name: 'proj' }],
    activeProjectId: 'p',
    confirm: null,
    toasts: []
  } as never);
  const settings = useSettingsStore.getState().settings;
  useSettingsStore.setState({ settings: { ...settings, autoSave: { mode: 'off', delayMs: 1000 } } });
  useEditor.setState({
    projectId: 'p',
    tabs: [
      {
        id: ID, path: ID, relPath: 'doc.md', origRelPath: null, repoPath: ROOT, name: 'doc.md', projectId: 'p',
        mode: 'redline', canDiff: true, markdown: true, image: false, svg: false, html: false, imageData: null,
        imageHead: null, imageRevision: 0, preview: false, commit: null, pendingSelection: null, pendingFocus: false,
        dirty: false, deleted: false, truncated: false, loading: false, error: null, savedContents: AGENT,
        headContents: HEAD, baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: HEAD }, 1),
        lastUsed: 0, contextEntry: null
      },
      // PHASE 297. The second tab, when one is asked for: the same shape, a
      // file of its own, and its baseline is its own bytes, so nothing in it is
      // drawn as a change until somebody writes into it.
      ...(opts.second === true
        ? [
            {
              id: OTHER_ID, path: OTHER_ID, relPath: 'other.md', origRelPath: null, repoPath: ROOT, name: 'other.md',
              projectId: 'p', mode: 'redline', canDiff: true, markdown: true, image: false, svg: false, html: false,
              imageData: null, imageHead: null, imageRevision: 0, preview: false, commit: null,
              pendingSelection: null, pendingFocus: false, dirty: false, deleted: false, truncated: false,
              loading: false, error: null, savedContents: OTHER, headContents: OTHER,
              baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: OTHER }, 1),
              lastUsed: 0, contextEntry: null
            }
          ]
        : [])
    ],
    activeId: ID
  } as never);

  if (opts.modelFirst) await ensureWorkingModel(ID, AGENT, ID);
  if (opts.modelFirstSecond === true) await ensureWorkingModel(OTHER_ID, OTHER, OTHER_ID);

  const listeners: Record<string, (e: unknown) => void> = {};
  const docEl: Record<string, unknown> = {
    addEventListener: (t: string, f: (e: unknown) => void) => {
      listeners[t] = f;
    },
    removeEventListener() {},
    contains: () => true
  };
  docEl['ownerDocument'] = { activeElement: docEl };
  let typing: { text: string | null; docProps: { ref: (el: HTMLElement | null) => void } } | null = null;
  // PHASE 297. THE MOUNT FOLLOWS THE ACTIVE TAB AND IS NOT KEYED BY IT, which
  // is EditorPanel.tsx's own shape: `<RedlineDocument tab={activeTab} />` with
  // no `key`, so clicking another tab is a prop change through ONE mount rather
  // than a remount. With a single tab this selects exactly the tab it always
  // did, so every test written before this one is unchanged.
  function View(): null {
    const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId));
    if (tab === undefined) return null;
    const text = useLiveTabText(tab.id, tab.savedContents, true);
    typing = useRedlineTyping({ tab, liveText: text });
    return null;
  }
  const host = {
    nodeType: 1, nodeName: 'DIV', tagName: 'DIV', namespaceURI: 'http://www.w3.org/1999/xhtml', textContent: '',
    addEventListener() {}, removeEventListener() {}, ownerDocument: { addEventListener() {}, removeEventListener() {} }
  };
  const root = createRoot(host as never);
  await React.act(async () => {
    root.render(React.createElement(View));
  });
  await React.act(async () => {
    typing!.docProps.ref(docEl as never);
  });

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 12; i += 1) await new Promise((r) => setImmediate(r));
  };
  const tab = () => useEditor.getState().tabs.find((t) => t.id === ID)!;
  const fire = (inputType: string, data: string | null): void => {
    listeners['beforeinput']!({ inputType, data, cancelable: true, preventDefault() {}, dataTransfer: null });
  };
  const input = async (inputType: string, data: string | null): Promise<void> => {
    await React.act(async () => {
      fire(inputType, data);
    });
  };

  return {
    disk,
    /** PHASE 297. The SECOND file as main has it, `writes` counting landed writes. */
    otherDisk,
    /** The bytes the view draws now. */
    drawn: (): string => typing!.text ?? '',
    /** The working model's text, or null before one exists. */
    model: (): string | null => getWorkingModel(ID)?.getValue() ?? null,
    /** PHASE 297. Any tab's working model text, or null before one exists. */
    modelOf: (id: string): string | null => getWorkingModel(id)?.getValue() ?? null,
    /**
     * PHASE 297. EVERY VALUE that tab's buffer has ever held, oldest first,
     * starting with the bytes it was born holding. Empty when no model was ever
     * made for it — which is itself a reading, because a tab switch must not
     * make one.
     */
    everHeldBy: (id: string): string[] => [
      ...((getWorkingModel(id) as unknown as FakeModel | null)?.history ?? [])
    ],
    /**
     * PHASE 297. How many undo groups have been closed on that tab's buffer. A
     * keystroke that STARTS a run closes the previous group; one that continues
     * a run does not, so this counts the ⌘Z steps the person has made.
     */
    undoGroupsOf: (id: string): number =>
      (getWorkingModel(id) as unknown as FakeModel | null)?.undoGroups ?? 0,
    tab,
    /** PHASE 297. Any tab as the store has it. */
    tabOf: (id: string) => useEditor.getState().tabs.find((t) => t.id === id),
    /**
     * PHASE 297. THE TAB CLICK, IN THE LANE THE APP CLICKS IN, and the driver is
     * the load-bearing part of this rig's addition.
     *
     * `activate` runs inside a click handler, so React commits the switch render
     * and its effects synchronously in the discrete lane and the microtask the
     * hook's edit effect awaits resolves BEFORE the re-render that effect's own
     * `setState` scheduled. `flushSync` is that lane, measured against this
     * React: the same switch driven inside `act` flushes the re-render first and
     * shows an order the app has never had, which is why this is deliberately
     * NOT wrapped in `act` and why a caller must read its evidence before the
     * next `act`. One microtask turn is awaited, which is the whole window the
     * continuation lives in.
     */
    switchTo: async (id: string): Promise<void> => {
      ReactDOM.flushSync(() => {
        useEditor.getState().activate(id);
      });
      await Promise.resolve();
    },
    /** One character at the caret, as a real `insertText` beforeinput. */
    type: (ch: string) => input('insertText', ch),
    /** Enter under `plaintext-only` (research 97 §3). */
    enter: () => input('insertLineBreak', null),
    /**
     * PHASE 297. One backspace at the caret, which is how this rig takes a
     * keystroke BACK. It is not ⌘Z: the faked Monaco has no undo stack, and a
     * backspace is the stronger reading anyway — the buffer really returns to
     * the saved bytes and the tab really goes clean, which is the state the app
     * verifier's "typing undone first" arm was in when it switched tabs.
     */
    backspace: () => input('deleteContentBackward', null),
    /**
     * One character typed AND a held step let go inside ONE `act`, so React
     * draws the keystroke and whatever the step's continuation patches into
     * the store in the same render. That is the only shape in which the order
     * of ./redline-edits' effects is observable: the edit and the new live
     * text arrive together, and the edit was typed on the text from before.
     */
    typeReleasing: async (ch: string, label: string): Promise<void> => {
      const step = main.take(label);
      if (step === null) throw new Error(`nothing is held at ${label}; held: ${main.waiting()}`);
      await React.act(async () => {
        fire('insertText', ch);
        step();
        await settle();
      });
    },
    /** Hold the next read or write with this label (`read#2`, `write#1`). */
    hold: (label: string) => {
      main.hold(label);
    },
    /** Let a held step go, then let every continuation it unblocks run. */
    release: async (label: string): Promise<void> => {
      for (let i = 0; i < 200; i += 1) {
        const step = main.take(label);
        if (step !== null) {
          await React.act(async () => {
            step();
            await settle();
          });
          return;
        }
        await new Promise((r) => setImmediate(r));
      }
      throw new Error(`nothing is held at ${label}; held: ${main.waiting()}`);
    },
    releaseChunk: async (): Promise<void> => {
      await React.act(async () => {
        releaseChunk();
        await settle();
      });
    },
    settle: async (): Promise<void> => {
      await React.act(async () => {
        await settle();
      });
    },
    /**
     * ⌥⌫ on the agent's change, through the SHIPPING press and write, followed
     * by exactly what RedlineDocument's `press` does with a landed write: the
     * tab adopts the bytes. Answers the promise so a test can type while the
     * write is held; a test awaits it inside `release` or `settle`.
     */
    rewindAgentChange: (): Promise<{ outcome: string; toasts: string[] }> => {
      const live = tab();
      const base = redlineBaseSide(live.baseline, live.headContents);
      const change = changesOf(composeRedlineDocument(base, typing!.text ?? live.savedContents).runs).find((c) =>
        c.del.includes('brown')
      )!;
      const toasts: string[] = [];
      return pressRedline(
        'rewind',
        {
          id: live.id,
          root: live.repoPath,
          path: live.path,
          baseline: base,
          generation: live.baseline?.generation ?? 0,
          dirty: live.dirty
        },
        {
          focused: () => ({ off: change.off, del: change.del, ins: change.ins, generation: live.baseline?.generation ?? 0 }),
          apply: applyRewind,
          refuse: (why) => toasts.push(redlineRefusalSentence(why, live.name))
        }
      ).then((r) => {
        // No `act` of its own: this continuation runs inside whichever `act`
        // released the write, and two overlapping `act` scopes leave React's
        // queue unable to flush the next root this file mounts.
        if (r.outcome === 'wrote') useEditor.getState().adoptWritten(live.id, r.contents, r.was);
        return { outcome: r.outcome, toasts };
      });
    },
    /** The store's own `adoptWritten`, as RedlineDocument calls it after a landed write. */
    adopt: async (contents: string, was: string): Promise<void> => {
      await React.act(async () => {
        useEditor.getState().adoptWritten(ID, contents, was);
      });
    },
    /** Every toast's words, oldest first. */
    toasts: (): string[] => (useApp.getState() as { toasts: Array<{ text: string }> }).toasts.map((t) => t.text),
    /** Move `savedContents` with no guard at all, standing for any later path. */
    replaceSaved: (text: string): void => {
      useEditor.setState({ tabs: useEditor.getState().tabs.map((t) => (t.id === ID ? { ...t, savedContents: text } : t)) });
    },
    /** Turn auto save to this policy, as Settings does. */
    setAutoSave: (autoSave: { mode: 'off' | 'afterDelay'; delayMs: number }): void => {
      const now = useSettingsStore.getState().settings;
      useSettingsStore.setState({ settings: { ...now, autoSave } });
    },
    /** Real time passing, with every continuation it lets run drawn. */
    wait: async (ms: number): Promise<void> => {
      await React.act(async () => {
        await new Promise((r) => setTimeout(r, ms));
        await settle();
      });
    },
    /** The store's `init`, which subscribes its watcher through ./state/repo-changed. */
    init: async (): Promise<void> => {
      await React.act(async () => {
        useEditor.getState().init();
      });
    },
    /**
     * One watcher tick, through the listener the calling file captured from its
     * mock of ./state/repo-changed (mocks are hoisted per file, like the caret).
     */
    tick: async (repoPath: string, fire: (repoPath: string) => void): Promise<void> => {
      await React.act(async () => {
        fire(repoPath);
        await settle();
      });
    },
    /** ⌘S, the store's own. */
    save: async (): Promise<void> => {
      await React.act(async () => {
        await useEditor.getState().save();
        await settle();
      });
    },
    confirmTitle: (): string | null => (useApp.getState() as { confirm: { title?: string } | null }).confirm?.title ?? null,
    unmount: async (): Promise<void> => {
      await React.act(async () => {
        root.unmount();
      });
    }
  };
}
