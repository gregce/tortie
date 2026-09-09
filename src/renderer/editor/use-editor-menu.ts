/**
 * The wiring between ./editor-menu.ts and the live Monaco editor (Phase 241).
 *
 * The shape of the menu is composed in ./editor-menu.ts and the reshapes are
 * pure functions in ./reshape.ts. What is here is everything that needs the
 * editor itself: where the caret goes, what the subject of a reshape is, how
 * an edit is written so ⌘Z takes it back in one press, and the four Tortie
 * verbs, each reached through the call site that already exists.
 *
 * ## IT HANGS ON `.ed-mount`, AND THAT IS THE REDLINE REFUSAL
 *
 * The menu must not appear over a Redline document, for four reasons any one
 * of which is enough (docs/research/101 §5): there is no Monaco model to edit,
 * there is no editor to `trigger` against, `src/renderer/editor/
 * redline-write.ts` is the redline's ONE write call site and
 * `npm run conformance:redline` rule 9 asserts exactly that, and the one-⌘Z
 * promise cannot be kept because the redline has no undo stack — it has the
 * Phase 227 journal, and a rewind is not an undo. So the refusal is
 * STRUCTURAL rather than a condition somebody has to remember: the handler is
 * hung on MonacoHost's own `.ed-mount`, which does not exist in redline mode,
 * and no future round can forget the check.
 *
 * ## PASTE NEEDS TEXT FOCUS, and this is the only place that knows
 *
 * Measured (docs/research/101 §1.3). `Menu.popup` takes focus away from the
 * web contents, and Monaco's clipboard commands branch on `hasTextFocus()`:
 * with it false, Cut and Copy run against whatever the browser thinks is
 * focused, and PASTE DOES NOTHING AT ALL — its generic-dom implementation is
 * `clipboardService.triggerPaste`, which is `undefined` in standalone Monaco,
 * so it returns false, no implementation handles the command, and it resolves
 * silently having changed nothing. Every row therefore focuses the editor
 * before it triggers.
 */

import { useCallback } from 'react';
import type * as monacoNs from 'monaco-editor';
import type React from 'react';
import { useApp } from '../state/store';
import { REMOTE_COPIED_WITH_MACHINE } from '../machines/explorer';
import { copiedMessage, pathsForClipboard } from '../tree/tree-menu';
import { buildEditorMenu, type ReshapeRowId } from './editor-menu';
import {
  isReshapableJson,
  minifyJson,
  prettyJson,
  reshapeTableAt,
  tableAt,
  type Reshaped
} from './reshape';
import { useEditor } from './store';
import type { EditorTab } from './tab-types';

type CodeEditor = monacoNs.editor.IStandaloneCodeEditor;

/**
 * Above this many characters the whole-document JSON check is skipped, so a
 * right click is never the thing that stalls. A selection is always checked,
 * whatever the file's size, because the person chose its extent.
 */
const JSON_SCAN_CAP = 2_000_000;

/** The lines a caret sits on, with a selection's START winning over it. */
function caretLine(editor: CodeEditor): number {
  const selection = editor.getSelection();
  if (selection !== null && !selection.isEmpty()) return selection.startLineNumber;
  return editor.getPosition()?.lineNumber ?? 1;
}

/**
 * WHAT THE TWO JSON ROWS ACT ON, and the one place the selection rule lives.
 *
 * SELECTION BEATS CARET: with a selection, the selection is the subject, and a
 * selection that does not parse draws no JSON row at all — even in a `.json`
 * file, because the person named an extent and that extent is not JSON. With
 * no selection, a JSON file's own single top-level value is the subject, which
 * is what "under the cursor" means in a document that holds exactly one value.
 *
 * The table's subject is NOT the selection, and that difference is deliberate:
 * half a table is not a table, so Format Table always takes the whole block
 * the caret is in.
 */
function jsonSubject(
  editor: CodeEditor
): { range: monacoNs.IRange; text: string } | null {
  const model = editor.getModel();
  if (model === null) return null;
  const selection = editor.getSelection();
  if (selection !== null && !selection.isEmpty()) {
    const text = model.getValueInRange(selection);
    return isReshapableJson(text) ? { range: selection, text } : null;
  }
  if (model.getLanguageId() !== 'json') return null;
  if (model.getValueLength() > JSON_SCAN_CAP) return null;
  const text = model.getValue();
  return isReshapableJson(text) ? { range: model.getFullModelRange(), text } : null;
}

/** Which reshape rows apply to what is under the cursor right now. */
export function reshapesFor(
  editor: CodeEditor,
  writable: boolean
): ReshapeRowId[] {
  if (!writable) return [];
  const model = editor.getModel();
  if (model === null) return [];
  const rows: ReshapeRowId[] = [];
  if (tableAt(model.getLinesContent(), caretLine(editor)) !== null) {
    rows.push('table');
  }
  if (jsonSubject(editor) !== null) rows.push('json-format', 'json-minify');
  return rows;
}

/**
 * ONE EDIT, ONE ⌘Z. `pushEditOperations` makes one undo element, and the two
 * undo stops around it stop Monaco folding the reshape into whatever the
 * person typed a moment earlier — which would make one press take back both.
 */
function replaceRange(
  editor: CodeEditor,
  range: monacoNs.IRange,
  text: string
): void {
  const model = editor.getModel();
  if (model === null) return;
  editor.pushUndoStop();
  model.pushEditOperations(null, [{ range, text, forceMoveMarkers: false }], () => null);
  editor.pushUndoStop();
}

/**
 * Apply one reshape. Answers null when it happened, or the sentence to show
 * when it did not — every refusal names what it needed or what it would have
 * changed, and nothing is ever written on a refusal.
 */
export function applyReshape(
  editor: CodeEditor,
  id: ReshapeRowId,
  writable: boolean
): string | null {
  const model = editor.getModel();
  if (model === null) return 'There is no file open to reshape.';
  if (!writable) return 'This file is read-only here.';

  if (id === 'table') {
    const answer = reshapeTableAt(model.getLinesContent(), caretLine(editor));
    if (!answer.ok) return answer.why;
    const endColumn = model.getLineMaxColumn(answer.endLine);
    replaceRange(
      editor,
      { startLineNumber: answer.startLine, startColumn: 1, endLineNumber: answer.endLine, endColumn },
      answer.text
    );
    return null;
  }

  const subject = jsonSubject(editor);
  if (subject === null) {
    return 'Select some JSON, or put the cursor in a JSON file.';
  }
  const answer: Reshaped =
    id === 'json-format' ? prettyJson(subject.text) : minifyJson(subject.text);
  if (!answer.ok) return answer.why;
  replaceRange(editor, subject.range, answer.text);
  return null;
}

export interface EditorMenuOptions {
  tab: EditorTab;
  /** `tabIsReadOnly` inverted — the four reasons a tab takes no keystroke. */
  writable: boolean;
  /** The live editor, owned by ./MonacoHost.tsx. */
  editorRef: React.RefObject<CodeEditor | null>;
}

export interface EditorMenuResult {
  onContextMenu: (e: React.MouseEvent) => void;
  /** What the Edit menu's three rows run, installed by the host on mount. */
  runReshape: (id: ReshapeRowId) => void;
}

export function useEditorMenu({
  tab,
  writable,
  editorRef
}: EditorMenuOptions): EditorMenuResult {
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);

  const runReshape = useCallback(
    (id: ReshapeRowId): void => {
      const editor = editorRef.current;
      if (editor === null) return;
      editor.focus();
      const why = applyReshape(editor, id, writable);
      if (why !== null) toast('info', why);
    },
    [editorRef, toast, writable]
  );

  const copyPath = useCallback(
    (relative: boolean): void => {
      // PHASE 90.3's rule, and the tree's own helper rather than a second
      // composition: an absolute path from a tab on another machine is pasted
      // with that machine in front of it, and a relative path is unchanged
      // because it is true on both computers.
      const remote = tab.remote;
      const text = pathsForClipboard(
        tab.repoPath,
        [tab.relPath],
        relative,
        relative || remote === undefined ? null : remote.machineLabel
      );
      void navigator.clipboard.writeText(text).then(
        () =>
          toast(
            'info',
            !relative && remote !== undefined
              ? REMOTE_COPIED_WITH_MACHINE
              : copiedMessage(1, relative)
          ),
        () => toast('error', 'Could not copy the path')
      );
    },
    [tab.relPath, tab.remote, tab.repoPath, toast]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent): void => {
      const editor = editorRef.current;
      if (editor === null) return;
      const model = editor.getModel();
      if (model === null) return;
      e.preventDefault();

      // THE CARET MOVES FIRST, the way every editor does, so "under the
      // cursor" means what a person expects. A right click INSIDE an existing
      // selection keeps it, which is the same rule Finder and every editor
      // follow and is what makes "reshape the selection" reachable.
      const at = editor.getTargetAtClientPoint(e.clientX, e.clientY);
      const position = at?.position ?? null;
      const selection = editor.getSelection();
      const inSelection =
        position !== null &&
        selection !== null &&
        !selection.isEmpty() &&
        selection.containsPosition(position);
      if (position !== null && !inSelection) editor.setPosition(position);

      const items = buildEditorMenu(
        {
          reshapes: reshapesFor(editor, writable),
          writable,
          // Phase 198's walk runs git on THIS Mac against a repository that is
          // not there for a remote tab, and a draft has no path in it at all.
          historyAvailable:
            tab.remote === undefined && tab.draft === null && tab.relPath !== ''
        },
        {
          reshape: (id) => runReshape(id),
          trigger: (action) => {
            editor.focus();
            editor.trigger('gmux-menu', action, null);
          },
          // The tree's History row is `openRel(path, true)` and then these
          // two lines; from an editor tab the file is already open, so the
          // row is the two lines and nothing else. The store is reached
          // through a lazy door, exactly as ../app/menu-actions.ts reaches it,
          // so the Source Control chunk stays out of the editor's.
          history: () => {
            useApp.getState().showSidebarView('scm');
            void import('../scm/depth').then((m) => {
              m.useGitDepth.getState().revealFileHistory();
            });
          },
          copyPath,
          save: () => void useEditor.getState().save()
        }
      );
      if (items.length === 0) return;
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [copyPath, editorRef, runReshape, setMenu, tab.draft, tab.relPath, tab.remote, writable]
  );

  return { onContextMenu, runReshape };
}
