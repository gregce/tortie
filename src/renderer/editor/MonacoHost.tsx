/**
 * MonacoHost — owns the imperative Monaco code editor for the active tab's
 * File (edit) mode. Phase 11: the diff half is gone — Diff mode renders
 * PierreDiff (@pierre/diffs) instead, and Monaco remains the editing surface
 * only. The working ITextModel lives in the monaco-loader registry, so mode
 * switches and the live diff never lose unsaved text.
 *
 * Phase 14 added the LANDING: a tab that arrives with `pendingSelection`
 * came from a search hit, a symbol pick or a `foo.ts:412`, and this host owes
 * it a reveal, a real selection and one flash. It is a second effect rather
 * than a few lines inside the wiring effect for a reason that is easy to get
 * wrong — see the comment on it.
 */

import React, { useEffect, useRef, useState } from 'react';
import type * as monacoNs from 'monaco-editor';
import { monacoThemeNameFor } from './monaco-theme-name';
import { remoteTabWriteFolder, tabIsReadOnly } from './tab-readonly';
import { useChromeTheme } from '../theme/chrome-theme';
import {
  getLoadedMonaco,
  languageFor,
  loadMonaco,
  rememberLoaded,
  saveViewState,
  takeViewState,
  workingModel
} from './monaco-loader';
import { useEditor } from './store';
import type { EditorTab } from './store';
// PHASE 241. The editor's right-click menu, and the three reshapes the Edit
// menu's rows reach through the leaf below.
import { installReshapeCommands } from './reshape-commands';
import { useEditorMenu } from './use-editor-menu';
// PHASE 101. Whether a tab that names a file on another machine is an edit
// surface is a fact about that MACHINE, not about the tab, so it is read from
// the link state main pushes rather than from anything written into the tab.
import { useApp } from '../state/store';
// Phase 12.11: the editor region's zoom reaches Monaco through its OWN
// font-size API — a CSS zoom around the editor would leave its cursor,
// selection and hit-testing measuring a coordinate space it does not use.
import { useZoom, zoomedFontSize } from '../zoom';
// Phase 78: the work-area font preset. Monaco owns an imperative `fontFamily`
// option, so a custom property change alone would move the token and leave the
// editor measuring the old face.
import { loadWorkAreaFace, useCustomWorkFontFamily, useWorkAreaFont } from '../theme/work-fonts';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v.length > 0 ? v : fallback;
}

/**
 * Minimap options (BACKLOG item 6). Toggling is `updateOptions()` — no
 * re-create, no model churn, no lost scroll position. `showSlider: 'always'`
 * because gmux is a supervision tool and a hidden affordance is worse than a
 * visible one; colours come from the gmux Monaco theme's `minimap*` entries.
 *
 * The git added/modified/deleted stripes people remember from VS Code are a
 * workbench contribution, not a standalone-Monaco feature — there is no
 * `minimapGutter.*` to theme, so this minimap shows text, not change lanes.
 *
 * DELETING MONACO LATER (the BACKLOG note): this is the only minimap that
 * exists today, and it covers the editing surfaces only — @pierre/diffs has
 * no minimap or overview ruler at all, and rendered markdown gets a heading
 * ruler instead (editor/markdown/HeadingRuler.tsx). If Monaco is replaced,
 * the replacement owes the editing surface a minimap; nothing else changes,
 * because `minimapEnabled` lives in the store and the ruler is independent.
 */
const MINIMAP_ON: monacoNs.editor.IEditorMinimapOptions = {
  enabled: true,
  renderCharacters: true,
  showSlider: 'always',
  size: 'proportional',
  maxColumn: 100,
  autohide: 'none'
};

/**
 * The editor's base font size — the number ⌘+ / ⌘- multiply, kept here so
 * there is exactly one of it (regions.ts `zoomedFontSize` does the rest).
 */
const EDITOR_BASE_FONT_SIZE = 12;

/**
 * How long the arrival flash stays on the matched range. The fade itself is
 * CSS (`.ed-flash`, editor.css); under prefers-reduced-motion that rule drops
 * the animation and the wash simply holds for this long instead — the point
 * of the flash is "the thing you clicked is HERE", and that survives having
 * no motion. Removing the decoration is this timer either way.
 */
const FLASH_MS = 600;

function baseOptions(
  zoom: number
): monacoNs.editor.IStandaloneEditorConstructionOptions {
  return {
    // Phase 78: `--font-editor`, not `--font-mono`. The two carry the same
    // shipped value. The editor token follows the work-area font preset and
    // the mono token stays put, so the sidebar never changes face.
    fontFamily: cssVar('--font-editor', 'ui-monospace, Menlo, monospace'),
    fontSize: zoomedFontSize(EDITOR_BASE_FONT_SIZE, zoom),
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    renderLineHighlight: 'line',
    contextmenu: false, // context menus are native-only in gmux (DESIGN §3)
    fixedOverflowWidgets: true,
    padding: { top: 8, bottom: 8 },
    stickyScroll: { enabled: false },
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false
    },
    dragAndDrop: false,
    // `dragAndDrop` only governs Monaco's own MOUSE-driven text drag. The
    // separate HTML5 path (`dropIntoEditor`) accepts any drag carrying
    // text/plain or text/uri-list and INSERTS it into the buffer — so a file
    // dragged from Finder, or from the Phase 12.9 tree, would silently type a
    // path into the open file. gmux decides what a drop means in one place
    // (terminal/drop/router.ts); the editor is never a drop target.
    dropIntoEditor: { enabled: false },
    tabSize: 2,
    // Monaco's rainbow brackets are gold #FFD700 / orchid #DA70D6 — colours
    // that exist in no gmux token. Split mode puts Monaco directly beside
    // Shiki, so the SAME fenced block renders twice on one screen. This
    // option alone does NOT switch the feature off in standalone Monaco (see
    // monaco-loader.ts); the theme's editorBracketHighlight.foreground1..6
    // are what actually pin every depth to the neutral delimiter colour.
    bracketPairColorization: { enabled: false }
  };
}

// PHASE 268. `tabIsReadOnly` moved next door to ./tab-readonly.ts, unchanged,
// and is re-exported here so every existing importer and its two tests read
// the same name from the same place. The move is a cycle rather than a tidy:
// the auto-save policy asks this exact question, this store's own header
// already refuses `store -> … -> MonacoHost` for the markdown barrel, and
// `store -> auto-save -> MonacoHost -> store` is that cycle by another route.
export { tabIsReadOnly };

/**
 * Per-tab options. Everything here is applied with `updateOptions()` on every
 * tab switch, because the editor instance is created once and re-used.
 *
 * wordWrap: markdown SOURCE is prose, and prose must not run off the right
 * edge — in Split at the design's widest panel the source column is ~380px,
 * which hard-clipped lines mid-word with the horizontal scrollbar parked off
 * the bottom of the viewport. VS Code word-wraps markdown by default for the
 * same reason. Code keeps `off`: a wrapped line number lies about structure.
 */
function tabOptions(
  tab: EditorTab,
  readOnly: boolean
): monacoNs.editor.IEditorOptions {
  return { readOnly, wordWrap: tab.markdown ? 'on' : 'off' };
}

export interface MonacoHostProps {
  tab: EditorTab;
  /** Show Monaco's minimap (store-level toggle, off below a narrow panel). */
  minimap: boolean;
}

export function MonacoHost({
  tab,
  minimap
}: MonacoHostProps): React.JSX.Element {
  const setMonacoError = useEditor((s) => s.setMonacoError);
  const markDirty = useEditor((s) => s.markDirty);
  const clearPendingSelection = useEditor((s) => s.clearPendingSelection);
  const zoom = useZoom((s) => s.levels.editor);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const workAreaFont = useWorkAreaFont((s) => s.preset);
  // Editing the custom family changes no preset id, so the effect below keys
  // on the family as well — same reason TerminalPane subscribes to both.
  const customFontFamily = useCustomWorkFontFamily((s) => s.family);

  const [ready, setReady] = useState<boolean>(getLoadedMonaco() !== null);

  const codeContainer = useRef<HTMLDivElement | null>(null);
  const codeEditor = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const contentListener = useRef<monacoNs.IDisposable | null>(null);
  // PHASE 268. The `onFocusChange` auto-save mode's one trigger. It is a
  // second disposable rather than work inside the content listener because
  // they answer different events, and it is torn down in the same two places.
  const blurListener = useRef<monacoNs.IDisposable | null>(null);
  // PHASE 334. Its partner: focus ENTERING the editor widget is a return to
  // the tab, and the store re-reads it. Torn down in the same two places.
  const focusListener = useRef<monacoNs.IDisposable | null>(null);
  const prevShownId = useRef<string | null>(null);
  const flash = useRef<monacoNs.editor.IEditorDecorationsCollection | null>(
    null
  );
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- load the Monaco chunk once -------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (getLoadedMonaco() !== null) return;
    loadMonaco()
      .then((m) => {
        rememberLoaded(m);
        if (!cancelled) {
          setMonacoError(null);
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMonacoError(
            `The editor failed to load — ${(err as Error).message}`
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setMonacoError]);

  // -- (re)wire the editor whenever the shown path changes ------------------
  // The reasons a tab refuses every keystroke are in `tabIsReadOnly` above.
  // PHASE 101. The fourth reason needs facts from outside the tab. PHASE 336
  // made them the machine's confirmation and the projects open on it, because
  // a project open on a confirmed machine is a folder Tortie may write under.
  // They are read here rather than inside the predicate so the predicate stays
  // pure and its test can drive both answers without a store.
  const machineStates = useApp((s) => s.machineStates);
  const projects = useApp((s) => s.projects);
  const remoteWriteFolder = remoteTabWriteFolder(tab, machineStates, projects);
  const readOnly = tabIsReadOnly(tab, remoteWriteFolder);
  const contentReady = !tab.loading && tab.error === null;

  // PHASE 241. The editor's native context menu. It is hung on `.ed-mount`
  // below rather than on the panel, which is what keeps it off the Redline
  // view structurally — that element does not exist in redline mode. Monaco's
  // own `contextmenu` option stays false (DESIGN §3).
  const { onContextMenu, runReshape } = useEditorMenu({
    tab,
    writable: !readOnly,
    editorRef: codeEditor
  });

  // The Edit menu's three reshape rows reach the mounted host through this
  // leaf, the way Phase 227's four Redline rows reach the mounted view.
  useEffect(() => installReshapeCommands(runReshape), [runReshape]);

  useEffect(() => {
    const m = getLoadedMonaco();
    if (!ready || m === null || !contentReady) return;

    const language = languageFor(m, tab.path);
    // PHASE 63. A DRAFT seeds the model from the bytes the request carried,
    // because nothing was ever read from disk and `savedContents` is empty on
    // purpose: that emptiness is what keeps the tab dirty. `workingModel`
    // creates once per tab id and returns the existing model afterwards, so
    // this expression only decides the FIRST text and never overwrites a
    // buffer the person has typed into.
    const model = workingModel(
      m,
      tab.id,
      tab.draft ?? tab.savedContents,
      language
    );

    // Save the outgoing tab's view state.
    const prev = prevShownId.current;
    if (prev !== null && prev !== tab.id) {
      saveViewState(prev, codeEditor.current?.saveViewState() ?? null);
    }

    contentListener.current?.dispose();
    contentListener.current = null;
    blurListener.current?.dispose();
    blurListener.current = null;
    focusListener.current?.dispose();
    focusListener.current = null;

    // A landing flash belongs to the model it was set on. Drop it before the
    // model swaps, or a fast tab switch leaves a wash sitting on whatever
    // text happens to occupy those coordinates in the next file.
    if (flashTimer.current !== null) {
      clearTimeout(flashTimer.current);
      flashTimer.current = null;
    }
    flash.current?.clear();

    if (codeEditor.current === null && codeContainer.current !== null) {
      codeEditor.current = m.editor.create(codeContainer.current, {
        // Created at the CURRENT zoom so a file opened into an already-zoomed
        // editor never paints one frame at 12px and then jumps.
        ...baseOptions(zoomRef.current),
        // The theme of the base in effect (Phase 213); the applier's
        // publish redefines and sets it for every live editor after this.
        theme: monacoThemeNameFor(useChromeTheme.getState().scheme)
      });
    }
    const ce = codeEditor.current;
    if (ce !== null) {
      ce.setModel(model);
      ce.updateOptions(tabOptions(tab, readOnly));
      const state = takeViewState(tab.id);
      if (state !== null) ce.restoreViewState(state);
    }

    // Dirty tracking: buffer text vs last saved contents (store truth).
    contentListener.current = model.onDidChangeContent(() => {
      const current = useEditor.getState().tabs.find((t) => t.id === tab.id);
      if (current === undefined) return;
      markDirty(tab.id, model.getValue() !== current.savedContents);
    });

    // PHASE 268. Leaving the editor is the gesture issue 24 describes: you
    // click from the file into a terminal to tell the agent to read it. The
    // store decides whether the mode is on and whether the tab is one a timer
    // may write; this only reports the event.
    blurListener.current =
      ce?.onDidBlurEditorWidget(() => {
        useEditor.getState().autoSaveOnBlur(tab.id);
      }) ?? null;

    // PHASE 334. Coming back into the editor is a look: read the file again, so an
    // agent's write in a folder the repository ignores is on screen before you type.
    // The WIDGET event, not the text one: it fires only on focus entering the
    // editor, where the text event also fires on a move back from Monaco's own
    // find widget, which is not a return. Listening before the arrival focus
    // below is deliberate: that focus enters from outside too, and the store's
    // floor folds it into the activation's own read.
    focusListener.current =
      ce?.onDidFocusEditorWidget(() => {
        useEditor.getState().rereadOnReturn(tab.id);
      }) ?? null;

    // Opening a file is an attention switch — the editor takes focus so
    // ⌘F / arrows / typing work immediately (Esc hands it back).
    //
    // …with one exception (Phase 14): while the user is walking a search
    // results list with ↑↓, every step previews a different file here. Taking
    // focus on each of those would kill the arrow keys after the first hit,
    // which makes the list unusable. `pendingFocus` is the store's answer for
    // this one gesture and is true for every other open.
    if (prev !== tab.id && tab.pendingFocus) {
      ce?.focus();
    }

    prevShownId.current = tab.id;
    // NOTE deps: savedContents is deliberately absent — a save must NOT
    // re-run setModel (which resets scroll). Content updates flow through
    // the model registry instead (resetWorkingModel). pendingFocus is absent
    // for the same class of reason: it is read at open time, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contentReady, readOnly, tab.id, tab.path, markDirty]);

  // -- land a navigation: reveal + select + flash (Phase 14) -----------------
  //
  // A SEPARATE effect, declared after the wiring one, and both facts are
  // load-bearing:
  //
  //  - **After**, because React runs effects in declaration order within a
  //    commit, and the wiring effect's `restoreViewState` would silently
  //    overwrite a reveal issued before it. (research 19 §2.6 rule 3.)
  //  - **Separate**, because re-opening a tab that is already active, already
  //    mounted and already loaded changes NONE of the wiring effect's deps —
  //    so the second search hit in the same file would never land. This one
  //    is keyed on the pending selection itself, which is a fresh object per
  //    request, so clicking the same match twice re-reveals and re-flashes.
  const pending = tab.pendingSelection;
  useEffect(() => {
    const m = getLoadedMonaco();
    const ce = codeEditor.current;
    if (pending === null || m === null || ce === null || !contentReady) return;

    // Bus coordinates are 1-based lines and 0-based UTF-16 columns; Monaco
    // is 1-based on both axes. That +1 is applied here and nowhere else.
    const model = ce.getModel();
    const lastLine = model?.getLineCount() ?? pending.line;
    // A stale index (the file shrank since it was searched) must not throw or
    // scroll to nothing — clamp to the end of the file, which is where the
    // content the user asked about used to be.
    const startLine = Math.min(Math.max(pending.line, 1), lastLine);
    const endLine = Math.min(
      Math.max(pending.endLine ?? pending.line, startLine),
      lastLine
    );
    const startCol = (pending.column ?? 0) + 1;
    const endCol = (pending.endColumn ?? pending.column ?? 0) + 1;
    const range = new m.Range(startLine, startCol, endLine, endCol);

    ce.setSelection(range);
    // "In center if outside viewport": a hit that is already on screen must
    // not jump the page under the user — it is already where they can see it.
    ce.revealRangeInCenterIfOutsideViewport(
      range,
      m.editor.ScrollType.Immediate
    );

    if (pending.highlight !== false) {
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      flash.current ??= ce.createDecorationsCollection();
      flash.current.set([{ range, options: { className: 'ed-flash' } }]);
      flashTimer.current = setTimeout(() => {
        flashTimer.current = null;
        flash.current?.clear();
      }, FLASH_MS);
    }

    if (tab.pendingFocus) ce.focus();
    clearPendingSelection(tab.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, contentReady, ready, tab.id]);

  // Minimap toggles in place — updateOptions keeps the model and the scroll
  // position, which a re-create would throw away.
  useEffect(() => {
    codeEditor.current?.updateOptions({
      minimap: minimap ? MINIMAP_ON : { enabled: false }
    });
  }, [minimap, ready, contentReady]);

  // ⌘+ / ⌘- with the editor focused. Same reasoning as the minimap: the font
  // size is an option, so Monaco re-measures its own line height, gutter and
  // cursor geometry and keeps the model, the scroll position and the
  // selection exactly where they were.
  useEffect(() => {
    codeEditor.current?.updateOptions({
      fontSize: zoomedFontSize(EDITOR_BASE_FONT_SIZE, zoom)
    });
  }, [zoom, ready, contentReady]);

  // Settings → Appearance → Font (Phase 78). Two calls, in this order, and
  // both are needed. `updateOptions` moves the family Monaco draws with.
  // `remeasureFonts` is Monaco's own answer to a face that changed underneath
  // it, and without it the cursor, the selection and the horizontal scroll
  // range keep the previous character width.
  //
  // The face is awaited first for the same reason the terminal awaits it. A
  // `@font-face` is fetched only when something renders in it, so assigning
  // the family first would have Monaco measure the fallback and cache that.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadWorkAreaFace(workAreaFont, EDITOR_BASE_FONT_SIZE);
      if (cancelled) return;
      codeEditor.current?.updateOptions({
        fontFamily: cssVar('--font-editor', 'ui-monospace, Menlo, monospace')
      });
      getLoadedMonaco()?.editor.remeasureFonts();
    })();
    return () => {
      cancelled = true;
    };
  }, [workAreaFont, customFontFamily, ready, contentReady]);

  // -- teardown on unmount ----------------------------------------------------
  // Mode toggles (File → Diff) unmount this host: keep the cursor/scroll so
  // toggling back restores the exact position.
  useEffect(
    () => () => {
      const id = prevShownId.current;
      if (id !== null) {
        saveViewState(id, codeEditor.current?.saveViewState() ?? null);
      }
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      flashTimer.current = null;
      flash.current = null; // owned by the editor; disposed with it
      contentListener.current?.dispose();
      blurListener.current?.dispose();
      focusListener.current?.dispose();
      codeEditor.current?.dispose();
      codeEditor.current = null;
      prevShownId.current = null;
    },
    []
  );

  return (
    <div className="ed-host">
      <div ref={codeContainer} className="ed-mount" onContextMenu={onContextMenu} />
      {!ready || !contentReady ? <OpeningSkeleton /> : null}
    </div>
  );
}

/**
 * S5 loading state: 12px muted "Opening editor…"; past 300ms, three shimmer
 * lines (60/80/40% width) fade in — skeleton, not spinner.
 */
export function OpeningSkeleton(): React.JSX.Element {
  return (
    <div className="ed-skeleton" role="status" aria-label="Opening editor">
      <div className="ed-skeleton-text">Opening editor…</div>
      <div className="ed-skeleton-lines">
        <div className="ed-skeleton-line" style={{ width: '60%' }} />
        <div className="ed-skeleton-line" style={{ width: '80%' }} />
        <div className="ed-skeleton-line" style={{ width: '40%' }} />
      </div>
    </div>
  );
}
