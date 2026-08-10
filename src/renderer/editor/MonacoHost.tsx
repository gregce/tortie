/**
 * MonacoHost — owns the imperative Monaco code editor for the active tab's
 * File (edit) mode. Phase 11: the diff half is gone — Diff mode renders
 * PierreDiff (@pierre/diffs) instead, and Monaco remains the editing surface
 * only. The working ITextModel lives in the monaco-loader registry, so mode
 * switches and the live diff never lose unsaved text.
 */

import React, { useEffect, useRef, useState } from 'react';
import type * as monacoNs from 'monaco-editor';
import type { Monaco } from './monaco-impl';
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
  const codeEditor = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const contentListener = useRef<monacoNs.IDisposable | null>(null);
  const prevShownPath = useRef<string | null>(null);

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
  const readOnly = tab.deleted || tab.truncated;
  const contentReady = !tab.loading && tab.error === null;

  useEffect(() => {
    const m = getLoadedMonaco();
    if (!ready || m === null || !contentReady) return;

    const language = languageFor(m, tab.path);
    const model = workingModel(m, tab.path, tab.savedContents, language);

    // Save the outgoing file's view state.
    const prev = prevShownPath.current;
    if (prev !== null && prev !== tab.path) {
      saveViewState(prev, codeEditor.current?.saveViewState() ?? null);
    }

    contentListener.current?.dispose();
    contentListener.current = null;

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
    if (prev !== tab.path) {
      ce?.focus();
    }

    prevShownPath.current = tab.path;
    // NOTE deps: savedContents is deliberately absent — a save must NOT
    // re-run setModel (which resets scroll). Content updates flow through
    // the model registry instead (resetWorkingModel).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contentReady, readOnly, tab.path, markDirty]);

  // -- teardown on unmount ----------------------------------------------------
  // Mode toggles (File → Diff) unmount this host: keep the cursor/scroll so
  // toggling back restores the exact position.
  useEffect(
    () => () => {
      const path = prevShownPath.current;
      if (path !== null) {
        saveViewState(path, codeEditor.current?.saveViewState() ?? null);
      }
      contentListener.current?.dispose();
      codeEditor.current?.dispose();
      codeEditor.current = null;
      prevShownPath.current = null;
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
