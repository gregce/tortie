/**
 * Typing in the redline: the wiring (Phase 237).
 *
 * ./redline-typing holds the rules and is pure; ./redline-caret reads and
 * writes the selection; this is the hook that joins them to the tab, and it is
 * deliberately the only file of the three that knows a tab exists. It is a
 * hook rather than lines inside ./RedlineDocument so the view keeps the shape
 * Phases 238 and 239 are queued against.
 *
 * ## Where a typed character goes, and why it is monaco's model
 *
 * The buffer the person types into is the TAB'S working model, being the same
 * `src/renderer/editor/monaco-loader` registry File mode shows and the same
 * one `save` in ./tab-io reads. A second buffer beside it would be a second
 * answer to "what is in this file", and ⌘S would write one of them. The model
 * is created lazily, on the first keystroke and never on a mount, so a redline
 * that is only read still pays nothing for the monaco chunk.
 *
 * Consequences the charter names, and every one of them falls out of that
 * choice rather than being added:
 *
 *   - A typed character makes the tab DIRTY, so `refreshRepo` skips it exactly
 *     as it skips a dirty File tab, and ./baseline's sentence already says so
 *     on the face ("Not refreshed from disk while there are unsaved edits.").
 *   - ⌘S is the ordinary save, which writes the file and clears dirty; the
 *     redline then recomposes against the SAME baseline, so what was typed is
 *     drawn as an insertion.
 *   - ⌘Z is monaco's own undo of the buffer. It is NOT the journal's undo of a
 *     rewind, which is ⌥⇧⌫ and stays exactly where Phase 227 put it; the two
 *     do not merge in this phase and ./redline-sentences says which is which.
 *
 * ## The baseline does not move and cannot
 *
 * Research 83 A2.3. Nothing here names `nextBaseline`, touches
 * `tab.baseline` or moves a generation, so a rewind drawn before a keystroke
 * still resolves against the picture it was drawn from.
 * `npm run conformance:redline` rule 17 scans for that.
 *
 * ## ⌘Z is taken in the CAPTURE phase, and that is not a preference
 *
 * The Edit menu carries `{ role: 'undo' }`, whose accelerator is ⌘Z and is
 * app-wide. src/main/menu.ts records the mechanism this tree relies on: a
 * renderer capture-phase handler runs about 5 ms before the accelerator and
 * `preventDefault()` stops it. So the chord is answered here, in capture, and
 * only while the caret is really inside an editable redline; every other ⌘Z in
 * the app is untouched. `historyUndo` on `beforeinput` is answered too, so a
 * platform that delivers it the other way is served as well.
 *
 * It names no bridge and writes no file, so it is scanned by
 * `npm run conformance:redline` rule 9 with the other redline modules.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  applyModelText,
  ensureWorkingModel,
  getWorkingModel
} from './monaco-loader';
import {
  changeAtCaret,
  readCurrentSelection,
  restoreCurrentSelection,
  spanOfInput,
  textOfInput
} from './redline-caret';
import { caretMoveOf } from './redline-current';
import type { CaretMove } from './redline-current';
import { initialTyping, typingStep } from './redline-typing';
import type {
  CurrentSelection,
  TypingEvent,
  TypingState
} from './redline-typing';
import { useEditor } from './store';
import { useApp } from '../state/store';
import type { EditorTab } from './tab-types';

/**
 * How long a run of typing stays one undo step. A pause longer than this
 * starts a new one, which is the boundary a person feels: they stop, think,
 * and what they type next is a different thought. The number is a judgement
 * rather than a measurement, and it is on the generous side of the 500 ms most
 * editors use so a slow typist's sentence is still one ⌘Z.
 */
const TYPING_RUN_MS = 1_000;

/** What the view needs back from the hook. */
export interface RedlineTyping {
  /** The current side to draw, or null when this tab cannot be typed in. */
  text: string | null;
  /**
   * Props for the document element. The ref is how this hook finds the
   * document at all, which is also why it is the only thing in `docProps`
   * when the tab is read only: a redline that cannot be typed in still hands
   * back an element nobody listens to, so the view has ONE expression.
   */
  docProps: {
    ref: (el: HTMLElement | null) => void;
    contentEditable?: 'plaintext-only';
    suppressContentEditableWarning?: true;
    spellCheck?: false;
  };
  /**
   * WHERE THE PERSON LAST MOVED THE CARET, as an EVENT rather than a place:
   * the change it landed in, or null for a caret that landed in the document
   * and in no change at all. It is null while nothing the person did has moved
   * it, and — the fix round's finding — a restore this hook performs after a
   * recompose produces none, because a write above the caret leaves its
   * current-side offset pointing at different text and the view was reading
   * that as the person walking to another change. The rule is
   * ./redline-current `caretMoveOf`, which is pure and is ablated by
   * `npm run conformance:redline` rule 18b.
   */
  caretMove: CaretMove | null;
  /** Whether the person has typing of their own to undo with ⌘Z. */
  canUndoTyping: boolean;
}

/**
 * Can this tab be typed in?
 *
 * A commit tab is the past and is immutable; a tab on another machine saves
 * through a different door and is out of this phase; a truncated tab is
 * refused by `save` already, so offering a caret over one would be an edit
 * nothing could write; a deleted tab has no file and an errored tab has no
 * bytes. Everything else is an ordinary prose file in an open project.
 */
export function redlineTypable(tab: EditorTab): boolean {
  return (
    tab.commit === null &&
    tab.remote === undefined &&
    !tab.truncated &&
    !tab.deleted &&
    !tab.error &&
    !tab.loading &&
    tab.archMap === undefined &&
    tab.diagnostics === undefined
  );
}

export function useRedlineTyping(args: {
  tab: EditorTab;
  /** The buffer as the rest of the app has it, from ./live-text. */
  liveText: string;
}): RedlineTyping {
  const { tab, liveText } = args;
  const editable = redlineTypable(tab);
  const tabId = tab.id;
  const path = tab.path;

  const [doc, setDoc] = useState<HTMLElement | null>(null);
  const [state, setState] = useState<TypingState>(() => initialTyping(liveText));
  const [caretMove, setCaretMove] = useState<CaretMove | null>(null);
  // What the restore below last put back, so the selection listener can tell
  // this view's own act from the person's. It is consumed on the first
  // `selectionchange` after it is set, whether that event matched it or not.
  const restored = useRef<CurrentSelection | null>(null);
  // Bumped when this hook has made a working model, so the effect that
  // listens to it re-runs instead of polling for one.
  const [modelTick, setModelTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastLive = useRef(liveText);
  const written = useRef(0);
  const wanted = useRef<string | null>(null);
  // Where the last keystroke left the caret and when, so a run of typing is
  // ONE undo step and a fresh start is a new one. See `continuesTyping`.
  const lastEdit = useRef<{ at: number; when: number } | null>(null);

  const dispatch = useCallback((event: TypingEvent): void => {
    setState((current) => typingStep(current, event));
  }, []);

  /** The selection now, or null when the caret is not in this document. */
  const caretNow = useCallback(
    (): CurrentSelection | null => (doc === null ? null : readCurrentSelection(doc)),
    [doc]
  );

  // A new tab is a new document. FIRST, so the outside-write effect below
  // sees the seeded state rather than the last tab's.
  useEffect(() => {
    lastLive.current = liveText;
    written.current = 0;
    wanted.current = null;
    setState(initialTyping(liveText));
    setCaretMove(null);
    restored.current = null;
    // The seed is the live text at the moment the tab changed; a later change
    // of that text is an outside write and is the next effect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  // The buffer changed under the view. Only a CHANGE is an event: the value
  // merely differing is what a tab whose model this hook has not yet created
  // looks like, and dispatching on that would fight the person's own typing.
  useEffect(() => {
    if (lastLive.current === liveText) return;
    lastLive.current = liveText;
    dispatch({ kind: 'outside', text: liveText, caret: caretNow() });
  }, [liveText, caretNow, dispatch]);

  // The person's own edits reach the buffer. The model is created on the
  // first one and never on a mount; a keystroke that lands while the chunk is
  // still loading is not lost, because what is written is the LATEST current
  // side rather than the edit that asked for the write.
  useEffect(() => {
    if (!editable || state.edits === written.current) return;
    written.current = state.edits;
    wanted.current = state.text;
    const had = getWorkingModel(tabId) !== null;
    // WHERE ONE UNDO STEP ENDS. A run of typing is one ⌘Z, which is what every
    // editor does and what monaco does in File mode; a keystroke that does NOT
    // continue the last one starts a new step, and so does the first keystroke
    // after a save, because a save is a place a person expects to stop at.
    // Without this the whole session's typing is one element and one ⌘Z takes
    // all of it, which the app run read as `"s a throwa"` where it wanted the
    // saved text back.
    const live = useEditor.getState().tabs.find((t) => t.id === tabId);
    const at = state.caret?.focus ?? null;
    const previous = lastEdit.current;
    const continues =
      previous !== null &&
      at !== null &&
      live?.dirty === true &&
      Date.now() - previous.when < TYPING_RUN_MS &&
      Math.abs(at - previous.at) <= 1;
    lastEdit.current = at === null ? null : { at, when: Date.now() };
    void (async () => {
      const model = await ensureWorkingModel(
        tabId,
        live?.savedContents ?? state.text,
        path
      );
      if (model === null) {
        useApp
          .getState()
          .toast('error', 'The editor failed to load, so this edit was not kept.');
        return;
      }
      if (!had) setModelTick((n) => n + 1);
      const want = wanted.current;
      if (want === null) return;
      applyModelText(model, want, !continues);
      const now = useEditor.getState().tabs.find((t) => t.id === tabId);
      if (now !== undefined) {
        useEditor.getState().markDirty(tabId, want !== now.savedContents);
      }
    })();
  }, [editable, state.edits, state.text, tabId, path]);

  // Once this hook has made a model, ./live-text's subscription predates it
  // and the view would never hear a reload. This one is installed on the
  // model itself and hears every change of it, monaco's own undo and
  // ./tab-io's `resetWorkingModel` included.
  useEffect(() => {
    if (!editable) return;
    const model = getWorkingModel(tabId);
    if (model === null) return;
    const sub = model.onDidChangeContent(() => {
      const text = model.getValue();
      // DIRTY IS TRACKED HERE AND NOT ONLY WHERE THE EDIT IS MADE, because a
      // change of this buffer is not always an edit of the person's: monaco's
      // own ⌘Z is one, and the app run caught exactly that. With it counted
      // only at the keystroke, undoing back to the saved bytes left the tab
      // dirty for ever, `refreshRepo` went on skipping it, and a rewind
      // refused with "save or undo your edits first" over a buffer that WAS
      // the file. It is the same rule ./MonacoHost's own listener applies, and
      // it is above the early return because our own writes take that return.
      const live = useEditor.getState().tabs.find((t) => t.id === tabId);
      if (live !== undefined) {
        useEditor.getState().markDirty(tabId, text !== live.savedContents);
      }
      if (text === stateRef.current.text) return;
      dispatch({ kind: 'outside', text, caret: caretNow() });
    });
    return () => {
      sub.dispose();
    };
  }, [editable, tabId, modelTick, caretNow, dispatch]);

  // Every default behaviour of a contenteditable, cancelled and re-applied as
  // the composer's own answer. Research 97 §3: this is the one path, and it is
  // the same path an outside write takes.
  useEffect(() => {
    if (!editable || doc === null) return;

    const onBeforeInput = (event: InputEvent): void => {
      if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
        event.preventDefault();
        const model = getWorkingModel(tabId);
        if (event.inputType === 'historyUndo') void model?.undo();
        else void model?.redo();
        return;
      }
      // `insertCompositionText` is NOT cancelable (research 97 §3.1). Nothing
      // here can stop it, and `compositionend` is where it is answered.
      if (!event.cancelable) return;
      event.preventDefault();
      const span = spanOfInput(doc, event);
      if (span === null) return;
      dispatch({
        kind: 'input',
        inputType: event.inputType,
        data: textOfInput(event),
        start: span.anchor,
        end: span.focus
      });
    };

    const onCompositionStart = (): void => {
      const span = readCurrentSelection(doc);
      if (span === null) return;
      dispatch({
        kind: 'compositionstart',
        start: Math.min(span.anchor, span.focus),
        end: Math.max(span.anchor, span.focus)
      });
    };

    const onCompositionEnd = (event: CompositionEvent): void => {
      dispatch({ kind: 'compositionend', data: event.data });
    };

    doc.addEventListener('beforeinput', onBeforeInput as EventListener);
    doc.addEventListener('compositionstart', onCompositionStart);
    doc.addEventListener('compositionend', onCompositionEnd as EventListener);
    return () => {
      doc.removeEventListener('beforeinput', onBeforeInput as EventListener);
      doc.removeEventListener('compositionstart', onCompositionStart);
      doc.removeEventListener('compositionend', onCompositionEnd as EventListener);
    };
  }, [editable, doc, dispatch, tabId]);

  // ⌘Z and ⌘⇧Z, in the capture phase, and only while the caret is in here.
  useEffect(() => {
    if (!editable || doc === null) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'z') return;
      const active = doc.ownerDocument.activeElement;
      if (active === null || !doc.contains(active)) return;
      const model = getWorkingModel(tabId);
      if (model === null) return;
      event.preventDefault();
      if (event.shiftKey) void model.redo();
      else void model.undo();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [editable, doc, tabId]);

  // WHICH CHANGE THE CARET IS IN, AND ONLY WHEN THE PERSON PUT IT THERE. The
  // rule is ./redline-current `caretMoveOf` and its whole reasoning is there;
  // this listener only hands it the three readings it asks for.
  useEffect(() => {
    if (!editable || doc === null) return;
    const onSelectionChange = (): void => {
      const now = readCurrentSelection(doc);
      const put = restored.current;
      restored.current = null;
      const move = caretMoveOf({ restored: put, now, change: changeAtCaret(doc) });
      if (move !== null) setCaretMove(move);
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [editable, doc]);

  // The redraw's other half. React has just rebuilt the runs; the caret is a
  // pair of current-side offsets and goes back through them. Research 97 §2.3
  // read what happens without this: the anchor is the document element itself
  // at offset zero, 227 to 474 characters from where the person was.
  useLayoutEffect(() => {
    if (!editable || doc === null || state.caret === null) return;
    const active = doc.ownerDocument.activeElement;
    if (active === null || !doc.contains(active)) return;
    // MARKED BEFORE THE CALL. `selectionchange` is queued rather than
    // dispatched synchronously, so the listener above always reads this.
    restored.current = state.caret;
    restoreCurrentSelection(doc, state.caret);
  }, [editable, doc, state]);

  if (!editable) return { text: null, docProps: { ref: setDoc }, caretMove: null, canUndoTyping: false };
  return {
    text: state.text,
    docProps: {
      ref: setDoc,
      contentEditable: 'plaintext-only',
      suppressContentEditableWarning: true,
      spellCheck: false
    },
    caretMove,
    canUndoTyping: tab.dirty
  };
}
