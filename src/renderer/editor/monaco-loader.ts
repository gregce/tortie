/**
 * Lazy Monaco loader + model registry.
 *
 * The shell never pays for Monaco until the first file opens: `loadMonaco()`
 * dynamic-imports monaco-impl (its own vite chunk, plus worker assets) once
 * and memoizes. Everything else in the editor stream goes through this
 * module so there is exactly one loading story.
 *
 * Model registry: one working ITextModel per open file — the File-mode
 * buffer, and the live "new" side PierreDiff subscribes to in Diff mode.
 * (HEAD contents are plain strings on the tab since Phase 11; the Monaco
 * HEAD-model registry went with the Monaco diff editor.)
 */

import type { Monaco } from './monaco-impl';
import type * as monacoNs from 'monaco-editor';

let loadPromise: Promise<Monaco> | null = null;

/** Load (once) and return the Monaco namespace. Rejects on chunk failure. */
export function loadMonaco(): Promise<Monaco> {
  if (loadPromise === null) {
    loadPromise = import('./monaco-impl').then((m) => m.monaco);
    loadPromise.catch(() => {
      loadPromise = null; // let a later open retry after a failed load
    });
  }
  return loadPromise;
}

let loaded: Monaco | null = null;
export function rememberLoaded(m: Monaco): void {
  loaded = m;
}
export function getLoadedMonaco(): Monaco | null {
  return loaded;
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

const workingModels = new Map<string, monacoNs.editor.ITextModel>();

function uriFor(m: Monaco, path: string): monacoNs.Uri {
  return m.Uri.from({ scheme: 'gmux', path });
}

/** Get-or-create the working model for a file. */
export function workingModel(
  m: Monaco,
  path: string,
  contents: string,
  language: string
): monacoNs.editor.ITextModel {
  const existing = workingModels.get(path);
  if (existing !== undefined && !existing.isDisposed()) return existing;
  const model = m.editor.createModel(contents, language, uriFor(m, path));
  workingModels.set(path, model);
  return model;
}

export function getWorkingModel(
  path: string
): monacoNs.editor.ITextModel | null {
  const model = workingModels.get(path);
  return model !== undefined && !model.isDisposed() ? model : null;
}

/** Replace the working model's text in place (external reload, not dirty). */
export function resetWorkingModel(path: string, contents: string): void {
  const model = getWorkingModel(path);
  if (model !== null && model.getValue() !== contents) {
    model.setValue(contents);
  }
}

/** Dispose the working model for a closed tab. */
export function disposeModels(path: string): void {
  workingModels.get(path)?.dispose();
  workingModels.delete(path);
}

// ---------------------------------------------------------------------------
// Per-file view state (scroll/cursor restore across tab switches)
// ---------------------------------------------------------------------------

const viewStates = new Map<string, monacoNs.editor.ICodeEditorViewState>();

export function saveViewState(
  path: string,
  state: monacoNs.editor.ICodeEditorViewState | null
): void {
  if (state !== null) viewStates.set(path, state);
}

export function takeViewState(
  path: string
): monacoNs.editor.ICodeEditorViewState | null {
  return viewStates.get(path) ?? null;
}

export function dropViewState(path: string): void {
  viewStates.delete(path);
}
