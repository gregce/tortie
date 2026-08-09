/**
 * MonacoHost — owns the imperative Monaco instances for the active tab.
 *
 * One code editor + one diff editor, created lazily after the Monaco chunk
 * loads, toggled by the active tab's mode. The working ITextModel is shared:
 * plain editor and the diff's modified side edit the same buffer, so mode
 * switches never lose unsaved text.
 */

import React, { useEffect, useRef, useState } from 'react';
import type * as monacoNs from 'monaco-editor';
import type { Monaco } from './monaco-impl';
import {
  getLoadedMonaco,
  headModel,
  loadMonaco,
  rememberLoaded,
  saveViewState,
  takeViewState,
  workingModel
} from './monaco-loader';
import { useEditor } from './store';
import type { EditorTab } from './store';

/** Below this editor width the diff renders inline instead of side-by-side. */
const SIDE_BY_SIDE_MIN_PX = 900;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v.length > 0 ? v : fallback;
}

function baseOptions(): monacoNs.editor.IStandaloneEditorConstructionOptions {
  return {
    fontFamily: cssVar('--font-mono', '"SF Mono", ui-monospace, Menlo, monospace'),
    fontSize: 12,
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
    tabSize: 2
  };
}

export interface MonacoHostProps {
  tab: EditorTab;
}

export function MonacoHost({ tab }: MonacoHostProps): React.JSX.Element {
  const setMonacoError = useEditor((s) => s.setMonacoError);
  const markDirty = useEditor((s) => s.markDirty);

  const [ready, setReady] = useState<boolean>(getLoadedMonaco() !== null);

  const codeContainer = useRef<HTMLDivElement | null>(null);
  const diffContainer = useRef<HTMLDivElement | null>(null);
  const codeEditor = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const diffEditor = useRef<monacoNs.editor.IStandaloneDiffEditor | null>(null);
  const contentListener = useRef<monacoNs.IDisposable | null>(null);
  const prevShown = useRef<{ path: string; mode: 'diff' | 'file' } | null>(null);

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

  // -- (re)wire editors whenever the shown (path, mode) changes -------------
  const readOnly = tab.deleted || tab.truncated;
  // A diff tab is not ready until its HEAD side arrived — otherwise the
  // plain editor would flash for a frame before the diff mounts.
  const headPending =
    tab.mode === 'diff' && tab.canDiff && tab.headContents === null;
  const contentReady = !tab.loading && tab.error === null && !headPending;
  const showDiff =
    tab.mode === 'diff' && tab.canDiff && tab.headContents !== null;

  useEffect(() => {
    const m = getLoadedMonaco();
    if (!ready || m === null || !contentReady) return;

    const language = languageFor(m, tab.path);
    const model = workingModel(m, tab.path, tab.savedContents, language);

    // Save the outgoing file's view state.
    const prev = prevShown.current;
    if (prev !== null && prev.path !== tab.path) {
      const source =
        prev.mode === 'diff'
          ? diffEditor.current?.getModifiedEditor()
          : codeEditor.current;
      saveViewState(prev.path, source?.saveViewState() ?? null);
    }

    contentListener.current?.dispose();
    contentListener.current = null;

    let focusTarget: monacoNs.editor.ICodeEditor | null = null;

    if (showDiff) {
      const original = headModel(m, tab.path, tab.headContents ?? '', language);
      if (diffEditor.current === null && diffContainer.current !== null) {
        diffEditor.current = m.editor.createDiffEditor(diffContainer.current, {
          ...baseOptions(),
          theme: 'gmux-dark',
          originalEditable: false,
          ignoreTrimWhitespace: false,
          renderSideBySide:
            (diffContainer.current.clientWidth || 0) >= SIDE_BY_SIDE_MIN_PX,
          diffWordWrap: 'off'
        });
      }
      const de = diffEditor.current;
      if (de !== null) {
        de.setModel({ original, modified: model });
        de.updateOptions({ readOnly });
        const modified = de.getModifiedEditor();
        const state = takeViewState(tab.path);
        if (state !== null) modified.restoreViewState(state);
        focusTarget = modified;
      }
    } else {
      if (codeEditor.current === null && codeContainer.current !== null) {
        codeEditor.current = m.editor.create(codeContainer.current, {
          ...baseOptions(),
          theme: 'gmux-dark'
        });
      }
      const ce = codeEditor.current;
      if (ce !== null) {
        ce.setModel(model);
        ce.updateOptions({ readOnly });
        const state = takeViewState(tab.path);
        if (state !== null) ce.restoreViewState(state);
        focusTarget = ce;
      }
    }

    // Dirty tracking: buffer text vs last saved contents (store truth).
    contentListener.current = model.onDidChangeContent(() => {
      const current = useEditor
        .getState()
        .tabs.find((t) => t.path === tab.path);
      if (current === undefined) return;
      markDirty(tab.path, model.getValue() !== current.savedContents);
    });

    // Opening a file is an attention switch — the editor takes focus so
    // ⌘F / arrows / typing work immediately (Esc hands it back).
    if (prev === null || prev.path !== tab.path) {
      focusTarget?.focus();
    }

    prevShown.current = { path: tab.path, mode: showDiff ? 'diff' : 'file' };
    // NOTE deps: savedContents/headContents are deliberately absent — a save
    // or HEAD refresh must NOT re-run setModel (the diff editor resets its
    // scroll position on setModel). Content updates flow through the model
    // registry instead (resetWorkingModel / the head-sync effect below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contentReady, showDiff, readOnly, tab.path, markDirty]);

  // Keep the diff's HEAD side honest when the base moves (commit from a
  // session terminal, stage/discard) — headModel() setValue's in place.
  useEffect(() => {
    const m = getLoadedMonaco();
    if (!ready || m === null || tab.headContents === null) return;
    headModel(m, tab.path, tab.headContents, languageFor(m, tab.path));
  }, [ready, tab.path, tab.headContents]);

  // -- responsive diff layout: side-by-side ≥900px, inline below ------------
  useEffect(() => {
    const el = diffContainer.current;
    if (!ready || el === null) return;
    const ro = new ResizeObserver(() => {
      diffEditor.current?.updateOptions({
        renderSideBySide: el.clientWidth >= SIDE_BY_SIDE_MIN_PX
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // -- teardown on unmount ----------------------------------------------------
  useEffect(
    () => () => {
      contentListener.current?.dispose();
      codeEditor.current?.dispose();
      diffEditor.current?.dispose();
      codeEditor.current = null;
      diffEditor.current = null;
      prevShown.current = null;
    },
    []
  );

  return (
    <div className="ed-host">
      <div
        ref={diffContainer}
        className="ed-mount"
        style={{ display: showDiff ? 'block' : 'none' }}
      />
      <div
        ref={codeContainer}
        className="ed-mount"
        style={{ display: showDiff ? 'none' : 'block' }}
      />
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
