/**
 * Lazy Monaco loader + model registry.
 *
 * The shell never pays for Monaco until the first file opens: `loadMonaco()`
 * dynamic-imports monaco-impl (its own vite chunk, plus worker assets) once
 * and memoizes. Everything else in the editor stream goes through this
 * module so there is exactly one loading story.
 *
 * Model registry: one working ITextModel per open file (shared between the
 * plain editor and the diff editor's modified side) and one HEAD model per
 * file in diff mode (original side, updated in place when HEAD moves).
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

/** True once Monaco has finished loading (render-safe, no await). */
export function isMonacoLoaded(): boolean {
  return loaded !== null;
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
const headModels = new Map<string, monacoNs.editor.ITextModel>();

function uriFor(m: Monaco, path: string, head: boolean): monacoNs.Uri {
  // Distinct schemes keep the HEAD snapshot from colliding with the working
  // copy (and out of the TS worker's project graph).
  return m.Uri.from({ scheme: head ? 'gmux-head' : 'gmux', path });
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
  const model = m.editor.createModel(contents, language, uriFor(m, path, false));
  workingModels.set(path, model);
  return model;
}

/** Get-or-create the HEAD (diff original) model for a file. */
export function headModel(
  m: Monaco,
  path: string,
  contents: string,
  language: string
): monacoNs.editor.ITextModel {
  const existing = headModels.get(path);
  if (existing !== undefined && !existing.isDisposed()) {
    if (existing.getValue() !== contents) existing.setValue(contents);
    return existing;
  }
  const model = m.editor.createModel(contents, language, uriFor(m, path, true));
  headModels.set(path, model);
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

/** Dispose both models for a closed tab. */
export function disposeModels(path: string): void {
  workingModels.get(path)?.dispose();
  workingModels.delete(path);
  headModels.get(path)?.dispose();
  headModels.delete(path);
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
