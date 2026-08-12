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
import type { Monaco } from './monaco-impl';
import { GMUX_MONACO_THEME } from './monaco-theme-name';
import {
  getLoadedMonaco,
  loadMonaco,
  rememberLoaded,
  saveViewState,
  takeViewState,
  workingModel
} from './monaco-loader';
import { useEditor } from './store';
import type { EditorTab } from './store';
// Phase 12.11: the editor region's zoom reaches Monaco through its OWN
// font-size API — a CSS zoom around the editor would leave its cursor,
// selection and hit-testing measuring a coordinate space it does not use.
import { useZoom, zoomedFontSize } from '../zoom';

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
 * visible one; colours come from GMUX_MONACO_THEME's `minimap*` entries.
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
    fontFamily: cssVar('--font-mono', '"SF Mono", ui-monospace, Menlo, monospace'),
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

  const [ready, setReady] = useState<boolean>(getLoadedMonaco() !== null);

  const codeContainer = useRef<HTMLDivElement | null>(null);
  const codeEditor = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const contentListener = useRef<monacoNs.IDisposable | null>(null);
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
  // A history tab shows a file as it was at one commit — the past is not an
  // edit surface (VS Code opens commit contents read-only for the same
  // reason: a save would write an old revision over the live file).
  const readOnly = tab.deleted || tab.truncated || tab.commit !== null;
  const contentReady = !tab.loading && tab.error === null;

  useEffect(() => {
    const m = getLoadedMonaco();
    if (!ready || m === null || !contentReady) return;

    const language = languageFor(m, tab.path);
    const model = workingModel(m, tab.id, tab.savedContents, language);

    // Save the outgoing tab's view state.
    const prev = prevShownId.current;
    if (prev !== null && prev !== tab.id) {
      saveViewState(prev, codeEditor.current?.saveViewState() ?? null);
    }

    contentListener.current?.dispose();
    contentListener.current = null;

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
        theme: GMUX_MONACO_THEME
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
      codeEditor.current?.dispose();
      codeEditor.current = null;
      prevShownId.current = null;
    },
    []
  );

  return (
    <div className="ed-host">
      <div ref={codeContainer} className="ed-mount" />
      {!ready || !contentReady ? <OpeningSkeleton /> : null}
    </div>
  );
}

function languageFor(m: Monaco, path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot);
  for (const lang of m.languages.getLanguages()) {
    if (ext !== '' && lang.extensions?.some((e) => e.toLowerCase() === ext)) {
      return lang.id;
    }
    if (lang.filenames?.some((f) => f.toLowerCase() === name)) {
      return lang.id;
    }
  }
  return 'plaintext';
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
