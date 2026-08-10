/**
 * Lazy Monaco loader + model registry.
 *
 * The shell never pays for Monaco until the first file opens: `loadMonaco()`
 * dynamic-imports monaco-impl (its own vite chunk, plus worker assets) once
 * and memoizes. Everything else in the editor stream goes through this
 * module so there is exactly one loading story.
 *
 * Model registry: one working ITextModel per open TAB (keyed by `tab.id`,
 * not by path) — the File-mode buffer, and the live "new" side PierreDiff
 * subscribes to in Diff mode.
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

/**
 * One URI per TAB IDENTITY, not per path. A historical commit tab
 * (`<sha>:<relPath>`) and the worktree tab for the same file are two buffers,
 * and Monaco keys models by URI — sharing one would let a read-only blob and
 * an editable file overwrite each other.
 */
function uriFor(m: Monaco, key: string): monacoNs.Uri {
  return m.Uri.from({
    scheme: 'gmux',
    path: key.startsWith('/') ? key : `/${key}`
  });
}

/** Get-or-create the working model for a tab. */
export function workingModel(
  m: Monaco,
  key: string,
  contents: string,
  language: string
): monacoNs.editor.ITextModel {
  const existing = workingModels.get(key);
  if (existing !== undefined && !existing.isDisposed()) return existing;
  const model = m.editor.createModel(contents, language, uriFor(m, key));
  // Bracket-pair colorization also lives on the MODEL, not only on the
  // editor: `IEditorOptions.bracketPairColorization` is read by VS Code's
  // model service from workbench configuration, which standalone Monaco has
  // no equivalent of, so setting it on the editor alone left the rainbow on.
  // Measured: even with both off, Monaco still tags brackets with
  // `bracket-highlighting-N`, so the colour that actually ships is the one
  // monaco-impl.ts pins in the theme. Belt and braces, theme is the brace.
  model.updateOptions({
    bracketColorizationOptions: {
      enabled: false,
      independentColorPoolPerBracketType: false
    }
  });
  workingModels.set(key, model);
  return model;
}

export function getWorkingModel(
  key: string
): monacoNs.editor.ITextModel | null {
  const model = workingModels.get(key);
  return model !== undefined && !model.isDisposed() ? model : null;
}

/** Replace the working model's text in place (external reload, not dirty). */
export function resetWorkingModel(key: string, contents: string): void {
  const model = getWorkingModel(key);
  if (model !== null && model.getValue() !== contents) {
    model.setValue(contents);
  }
}

/** Dispose the working model for a closed tab. */
export function disposeModels(key: string): void {
  workingModels.get(key)?.dispose();
  workingModels.delete(key);
}

// ---------------------------------------------------------------------------
// Per-tab view state (scroll/cursor restore across tab switches)
// ---------------------------------------------------------------------------

const viewStates = new Map<string, monacoNs.editor.ICodeEditorViewState>();

export function saveViewState(
  key: string,
  state: monacoNs.editor.ICodeEditorViewState | null
): void {
  if (state !== null) viewStates.set(key, state);
}

export function takeViewState(
  key: string
): monacoNs.editor.ICodeEditorViewState | null {
  return viewStates.get(key) ?? null;
}

export function dropViewState(key: string): void {
  viewStates.delete(key);
}
