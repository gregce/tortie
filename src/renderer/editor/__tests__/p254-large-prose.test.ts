/**
 * PHASE 254 — a large prose file opens fast, pinned clause by clause.
 *
 * THE RULE (research 116, the phase's charter): the one slow stage of the
 * operator's two opens was the rendered markdown preview, ~5 s of main-thread
 * render with no first paint until the end, against 53–136 ms in Monaco and
 * ~250 ms in the Pierre diff. So a markdown tab whose source is past
 * `PREVIEW_DEFER_CHARS` opens in Source, and the rendered preview is DEFERRED
 * to a deliberate click on the mode chip, which states the cost in one
 * clause. Deferred, never dropped: every mode is still offered, choosing
 * Preview still renders the whole document, the baseline still seeds, and a
 * small README still opens rendered.
 *
 * WHAT THIS PROVES, each arm written so it can fail (the ablation for each is
 * named beside it; every one goes red with the clause removed):
 *
 *   1. The pure rule: the threshold's exact boundary, and the mode matrix —
 *      only preview and split demote, only markdown, only past the threshold.
 *      (Ablation: `previewDeferred` returning false, or the mode test
 *      widened/narrowed in ../markdown/large-prose.ts.)
 *   2. The SHIPPING store + tab IO over the renderer's own bridge stubs: an
 *      untracked large .md lands in 'file', and NO OBSERVED STATE ever holds
 *      a past-threshold source while the mode is 'preview' or 'split' — the
 *      demotion rides the same patch as the bytes, so the preview surface
 *      can never mount over a large source. (Ablation: the demotion moved
 *      out of the `deps.patch` in loadContents.)
 *   3. A small .md still opens rendered, and a large TRACKED .md opened as a
 *      diff keeps its diff — the demotion touches nothing else.
 *   4. The person's own later choice is final: setMode('preview') on a large
 *      tab stands, through a watcher tick that re-reads the file.
 *      (Ablation: the demotion re-run anywhere but the first load.)
 *   5. `loadHead`'s fallback (diff base unavailable) lands a large markdown
 *      tab in 'file', not back in the ~5 s preview, and a small one in
 *      'preview' exactly as before. (Ablation: `fallbackMode` put back to
 *      `tab.markdown ? 'preview' : 'file'`.)
 *   6. The chip states the deferral: the SHIPPING `modeOptions` gives
 *      Preview `PREVIEW_DEFER_TITLE` for a large markdown tab and the plain
 *      'Rendered markdown' for a small one, and still OFFERS all three
 *      prose modes on a large tab. (Ablation: the title wiring in
 *      EditorPanel.tsx.)
 *
 * PHASE 255 RE-DERIVED THE THRESHOLD (large-prose.ts): the preview now draws a
 * first window and streams the rest, so SIZE alone no longer defers. The one
 * shape Phase 254's 256 KiB still governs is a document that DEFINES A
 * FOOTNOTE, which is never cut and is drawn whole on the old remark path —
 * so the large fixtures below carry one, and every arm keeps its full
 * strength over that shape. The windowed guard's own boundary is pinned in
 * ../markdown/__tests__/p255-window.test.tsx.
 *
 * WHAT IT DOES NOT PROVE. No render is timed here — the milliseconds are
 * probe:p254's, over the same twins research 116 synthesized, at the parent
 * and at HEAD.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const buffer = vi.hoisted(() => ({ text: 'typed\n' }));
vi.mock('../monaco-loader', () => ({
  loadMonaco: async () => ({}),
  rememberLoaded: () => undefined,
  getLoadedMonaco: () => null,
  rekeyTabResources: () => undefined,
  workingModel: () => ({ getValue: () => buffer.text }),
  getWorkingModel: () => ({ getValue: () => buffer.text }),
  resetWorkingModel: () => undefined,
  disposeModels: () => undefined,
  saveViewState: () => undefined,
  takeViewState: () => null,
  dropViewState: () => undefined
}));

const readFile = vi.fn();
const showHead = vi.fn();
const writeFile = vi.fn(async () => undefined);
const writeGuarded = vi.fn(async () => ({
  outcome: 'wrote' as const,
  sha256: 'deadbeef',
  bytes: 1
}));
const readDir = vi.fn();
const readImage = vi.fn(async () => ({ status: 'ok' }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, writeGuarded, readDir },
    git: { showHead, onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const {
  PREVIEW_DEFER_CHARS,
  PREVIEW_DEFER_TITLE,
  openedProseMode,
  previewDeferred
} = await import('../markdown/large-prose');
const { useEditor } = await import('../store');
const { createTabIo } = await import('../tab-io');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;
type EditorTab = import('../tab-types').EditorTab;
type EditorMode = import('../tab-types').EditorMode;

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** A footnote definition: the shape that is drawn whole (Phase 255). */
const FN = '[^1]: a footnote\n\n';
/** A footnote document of exactly `len` characters. */
const footnoteDoc = (len: number): string => `${FN}${'x'.repeat(len - FN.length)}`;
/** A source one character PAST the threshold — the smallest large file. */
const LARGE = `# big\n${FN}${'x'.repeat(PREVIEW_DEFER_CHARS - 5 - FN.length)}`;
/** A source AT the threshold exactly — the largest small file. */
const AT_CAP = `# ok\n${FN}${'x'.repeat(PREVIEW_DEFER_CHARS - 5 - FN.length)}`.slice(
  0,
  PREVIEW_DEFER_CHARS
);
const SMALL = '# readme\n\nhello\n';

function req(over: Partial<OpenFileRequest> = {}): OpenFileRequest {
  return {
    repoPath: '/repo',
    relPath: 'notes.md',
    path: '/repo/notes.md',
    mode: 'file',
    source: 'tree',
    preview: true,
    ...over
  };
}

const tabAt = (path: string): EditorTab => {
  const tab = useEditor.getState().tabs.find((t) => t.path === path);
  if (tab === undefined) throw new Error(`no tab for ${path}`);
  return tab;
};

/** The tab IO over the live store, the way the store itself wires it. */
function ioOverStore(): ReturnType<typeof createTabIo> {
  return createTabIo({
    patch: (id, patch) =>
      useEditor.setState((s) => ({
        tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t))
      })),
    byId: (id) => useEditor.getState().tabs.find((t) => t.id === id),
    worktreeTabsIn: (repoPath) =>
      useEditor
        .getState()
        .tabs.filter(
          (t) =>
            t.repoPath === repoPath &&
            t.commit === null &&
            t.remote === undefined
        )
  });
}

beforeEach(() => {
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  vi.clearAllMocks();
  showHead.mockRejectedValue(new Error('no head'));
});

describe('the pure rule (large-prose.ts), one clause a test', () => {
  it('the threshold is exact: at the cap is small, one past it is large', () => {
    expect(PREVIEW_DEFER_CHARS).toBe(256 * 1024);
    expect(previewDeferred(footnoteDoc(PREVIEW_DEFER_CHARS))).toBe(false);
    expect(previewDeferred(footnoteDoc(PREVIEW_DEFER_CHARS + 1))).toBe(true);
    expect(AT_CAP.length).toBe(PREVIEW_DEFER_CHARS);
    expect(LARGE.length).toBe(PREVIEW_DEFER_CHARS + 1);
  });

  it('only preview and split demote, only for markdown, only past the cap', () => {
    const modes: EditorMode[] = [
      'diff',
      'file',
      'preview',
      'split',
      'image',
      'redline'
    ];
    for (const mode of modes) {
      // Small source: nothing moves, ever.
      expect(openedProseMode(mode, true, SMALL)).toBe(mode);
      // Not markdown: nothing moves, whatever the size.
      expect(openedProseMode(mode, false, LARGE)).toBe(mode);
      // Markdown past the cap: exactly the two preview-rendering modes move.
      expect(openedProseMode(mode, true, LARGE)).toBe(
        mode === 'preview' || mode === 'split' ? 'file' : mode
      );
    }
    // The boundary is the predicate's own.
    expect(openedProseMode('preview', true, AT_CAP)).toBe('preview');
  });
});

describe('the shipping store and tab IO, driven over the bridge stubs', () => {
  it('an untracked large .md opens in Source, atomically — no state ever holds a large source in preview', async () => {
    readFile.mockResolvedValue({ contents: LARGE, truncated: false });
    // Record EVERY state the store passes through: the demotion must ride the
    // same patch as the bytes, so the preview surface can never see them.
    const seen: Array<{ mode: EditorMode; len: number }> = [];
    const unsub = useEditor.subscribe((s) => {
      const t = s.tabs.find((x) => x.path === '/repo/notes.md');
      if (t !== undefined)
        seen.push({ mode: t.mode, len: t.savedContents.length });
    });
    useEditor.getState().openFromRequest(req());
    await flush();
    unsub();
    const tab = tabAt('/repo/notes.md');
    expect(tab.mode).toBe('file');
    expect(tab.markdown).toBe(true);
    expect(tab.savedContents).toBe(LARGE);
    // The baseline still seeded — the deferral drops no promise. Optional
    // chaining for the type alone: an absent baseline answers undefined,
    // which never equals LARGE, so the assertion keeps its full strength.
    expect(tab.baseline?.text).toBe(LARGE);
    // The default WAS preview (nothing in localStorage), so the demotion is
    // what moved it — and never with the large bytes on board.
    expect(seen.some((s) => s.mode === 'preview')).toBe(true);
    const leaked = seen.filter(
      (s) =>
        (s.mode === 'preview' || s.mode === 'split') &&
        s.len > PREVIEW_DEFER_CHARS
    );
    expect(leaked).toEqual([]);
  });

  it('a small .md still opens rendered, exactly as before', async () => {
    readFile.mockResolvedValue({ contents: SMALL, truncated: false });
    useEditor.getState().openFromRequest(req());
    await flush();
    expect(tabAt('/repo/notes.md').mode).toBe('preview');
  });

  it('a source at the cap exactly still opens rendered', async () => {
    readFile.mockResolvedValue({ contents: AT_CAP, truncated: false });
    useEditor.getState().openFromRequest(req());
    await flush();
    expect(tabAt('/repo/notes.md').mode).toBe('preview');
  });

  it('a large TRACKED .md opened as a diff keeps its diff', async () => {
    readFile.mockResolvedValue({ contents: LARGE, truncated: false });
    showHead.mockResolvedValue(`${LARGE}old\n`);
    useEditor.getState().openFromRequest(req({ mode: 'diff' }));
    await flush();
    const tab = tabAt('/repo/notes.md');
    expect(tab.mode).toBe('diff');
    expect(tab.canDiff).toBe(true);
  });

  it("the person's own Preview choice on a large tab is final, through a watcher tick", async () => {
    readFile.mockResolvedValue({ contents: LARGE, truncated: false });
    useEditor.getState().openFromRequest(req());
    await flush();
    const id = tabAt('/repo/notes.md').id;
    expect(tabAt('/repo/notes.md').mode).toBe('file');
    // The deliberate click on the chip: the ~5 s render is theirs to choose.
    useEditor.getState().setMode(id, 'preview');
    expect(tabAt('/repo/notes.md').mode).toBe('preview');
    // A watcher tick re-reads the (still large) file; the mode must stand.
    readFile.mockResolvedValue({ contents: `${LARGE}more\n`, truncated: false });
    readDir.mockResolvedValue({ entries: [{ name: 'notes.md' }] });
    await ioOverStore().refreshRepo('/repo');
    expect(tabAt('/repo/notes.md').mode).toBe('preview');
    expect(tabAt('/repo/notes.md').savedContents).toBe(`${LARGE}more\n`);
  });

  it("loadHead's fallback lands a large markdown tab in Source, a small one in preview", async () => {
    // Large: the diff base failing must not re-route through the ~5 s render.
    readFile.mockResolvedValue({ contents: LARGE, truncated: false });
    showHead.mockRejectedValue(new Error('git failed'));
    useEditor.getState().openFromRequest(req({ mode: 'diff' }));
    await flush();
    const large = tabAt('/repo/notes.md');
    expect(large.mode).toBe('file');
    expect(large.canDiff).toBe(false);
    // Small: the fallback keeps its Phase 26 shape, byte for byte.
    readFile.mockResolvedValue({ contents: SMALL, truncated: false });
    useEditor
      .getState()
      .openFromRequest(
        req({ relPath: 'small.md', path: '/repo/small.md', mode: 'diff' })
      );
    await flush();
    const small = tabAt('/repo/small.md');
    expect(small.mode).toBe('preview');
    expect(small.canDiff).toBe(false);
  });
});

describe('the chip states the deferral where the person meets it', () => {
  const baseTab = (over: Partial<EditorTab>): EditorTab =>
    ({
      id: '/repo/notes.md',
      path: '/repo/notes.md',
      relPath: 'notes.md',
      origRelPath: null,
      repoPath: '/repo',
      name: 'notes.md',
      mode: 'file',
      canDiff: false,
      markdown: true,
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
      savedContents: SMALL,
      headContents: null,
      baseline: {
        text: null,
        from: 'read',
        generation: 0,
        headSeen: null,
        takenAt: null,
        acceptedAt: null
      },
      lastUsed: 0,
      contextEntry: null,
      draft: null,
      ...over
    }) as EditorTab;

  it('Preview carries the one-clause deferral title on a large tab, the plain one on a small tab, and every prose mode is still offered', async () => {
    const { modeOptions } = await import('../EditorPanel');
    const largeOpts = modeOptions(baseTab({ savedContents: LARGE }), true);
    const smallOpts = modeOptions(baseTab({}), true);
    const previewOf = (
      opts: ReturnType<typeof modeOptions>
    ): { title: string } => {
      const p = opts.find((o) => o.mode === 'preview');
      if (p === undefined) throw new Error('Preview is not offered');
      return p;
    };
    // Deferred, never dropped: the large tab still offers all three.
    expect(largeOpts.map((o) => o.mode)).toEqual(
      expect.arrayContaining(['preview', 'file', 'split'])
    );
    expect(previewOf(largeOpts).title).toBe(PREVIEW_DEFER_TITLE);
    expect(previewOf(smallOpts).title).toBe('Rendered markdown');
    // The clause really is one clause about the deferral and the cost.
    expect(PREVIEW_DEFER_TITLE).toContain('deferred');
    expect(PREVIEW_DEFER_TITLE).toContain('few seconds');
  });
});
