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

import { rangeEditFor } from './text-edit';
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

/**
 * A URI Monaco is not already using.
 *
 * A model's URI is fixed for its lifetime, so a tab that CHANGES identity
 * (`rekeyTabResources` — a rename in the tree carries the tab with it) keeps
 * a model parked on the old name's URI. Opening a freshly created file at
 * that old name would then hit Monaco's "model already exists" throw inside
 * the open path. The suffix is invisible: nothing reads the URI back, it only
 * has to be unique.
 */
function freeUriFor(m: Monaco, key: string): monacoNs.Uri {
  let uri = uriFor(m, key);
  for (let n = 2; m.editor.getModel(uri) !== null; n += 1) {
    uri = uriFor(m, `${key}#${n}`);
  }
  return uri;
}

/**
 * Move a tab's model and view state onto a new identity, in place.
 *
 * The bytes did not change, only the name did — so the buffer, its dirty
 * state, its undo stack and the cursor all survive a rename. Anything already
 * registered under `toKey` is disposed first: it belongs to the entry the
 * rename displaced, which is in the Trash.
 */
export function rekeyTabResources(fromKey: string, toKey: string): void {
  if (fromKey === toKey) return;
  const model = workingModels.get(fromKey);
  if (model !== undefined) {
    workingModels.get(toKey)?.dispose();
    workingModels.delete(fromKey);
    workingModels.set(toKey, model);
  }
  const view = viewStates.get(fromKey);
  if (view !== undefined) {
    viewStates.delete(fromKey);
    viewStates.set(toKey, view);
  }
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
  const model = m.editor.createModel(contents, language, freeUriFor(m, key));
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

/**
 * Apply `contents` to a live model as ONE range replacement, keeping the undo
 * stack and the caret (Phase 237, research 97 §5).
 *
 * `pushEditOperations` is monaco's own preferred door — `editor.api.d.ts:2352`
 * says "the edit operations will land on the undo stack", and `:2367` warns
 * that `applyEdits` "can have dire consequences" on it, so `applyEdits` is not
 * the door. The range is ./text-edit's common prefix and common suffix, which
 * is one range whatever the write did.
 *
 * `closeUndoGroup` is the second half and it is not optional for a reload:
 * measured in a real monaco with a real ⌘Z, without `pushStackElement()` in
 * front of it the outside write merges into the edit element the person was
 * building and one ⌘Z reverts their own typing along with the agent's write.
 * A person's own keystroke passes `false`, so a word typed in one go is one
 * undo step rather than one per character.
 */
export function applyModelText(
  model: monacoNs.editor.ITextModel,
  contents: string,
  closeUndoGroup: boolean
): boolean {
  const edit = rangeEditFor(model.getValue(), contents);
  if (edit === null) return false;
  if (closeUndoGroup) model.pushStackElement();
  const start = model.getPositionAt(edit.start);
  const end = model.getPositionAt(edit.end);
  model.pushEditOperations(
    null,
    [
      {
        range: {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column
        },
        text: edit.text
      }
    ],
    () => null
  );
  return true;
}

/**
 * Replace the working model's text in place (external reload, not dirty).
 *
 * PHASE 237. It called `model.setValue`, and `setValue` reaches
 * `textModel.js:342-343`'s `this._commandManager.clear()` in the installed
 * 0.56.0, so a file changing under a resting caret destroyed the undo stack
 * and moved the caret to 1:1. It is an EDIT now, through `applyModelText`
 * above, so ⌘Z still reaches back past the agent's write and the caret stays
 * where it was in text that did not move.
 */
export function resetWorkingModel(key: string, contents: string): void {
  const model = getWorkingModel(key);
  if (model !== null) applyModelText(model, contents, true);
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
