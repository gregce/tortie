/**
 * Typing in the redline: the pure half (Phase 237).
 *
 * The operator asked for it on 2026-09-08 — *"allows for edits in redline mode
 * so you don't need to keep switching to source"* — which reverses his own
 * ruling of the day before that no typing is in the redline phases. Research
 * 97 drove both of research 83 D.4's options with real CDP key events and
 * chose the contenteditable document, on a reading of ZERO characters of caret
 * error over eight restorations out of eight.
 *
 * ## The mechanism, and it is ONE path for two things
 *
 * A keystroke is an outside write the person made. Both go the same way:
 *
 *   1. Fold the change into the CURRENT SIDE, being the file as it stands.
 *   2. Compose against the SAME baseline with ./redline-document, untouched.
 *   3. Redraw, and put the caret back through the common prefix and suffix.
 *
 * Research 97 §3 measured the alternative, research 83 D.2's own policy of
 * inserting the view's own `<ins>` on the Phase 227 markup: three loose `<ins>`
 * elements outside every change wrapper, Enter doing nothing, and a drawn
 * document that no longer agrees with the run list it was drawn from. So the
 * recompose is the mechanism, and it costs 1.8 ms a keystroke at 5,000
 * characters and 7.5 ms at 50,000, inside one frame either way.
 *
 * ## The coordinate is the CURRENT SIDE and nothing else
 *
 * Every `<del>` is `contenteditable="false"`, so a caret can only ever be in a
 * `same` or an `ins` run, and a position in this view is an offset into the
 * concatenation of every run that is not a deletion. That is the file the
 * person is typing in. Never a run index, never a change identity, never the
 * drawn text: those all move when the document is recomposed, and the current
 * side is the one coordinate that survives it (research 97 §7 rule 6).
 *
 * ## THE BASELINE IS NOT IN THIS FILE AND THAT IS THE POINT
 *
 * Research 83 A2.3: typing never moves the baseline and never moves the
 * generation, so a rewind drawn before a keystroke must not refuse because of
 * it. This module holds no baseline, names `nextBaseline` nowhere and cannot
 * advance anything; the state it answers is the current side, a caret and an
 * open composition. `npm run conformance:redline` rule 17 scans for that and
 * drives it.
 *
 * ## THE COMPOSITION IS HELD, and it is a rule rather than a limit
 *
 * `beforeinput` for a composition commit is `insertCompositionText` and
 * research 97 §3.1 read three times out of three that it is NOT cancelable, so
 * it is the one door no `preventDefault` closes. A redraw landing inside an
 * open composition breaks the composition, restarts it, and leaves the
 * committed text in a plain span — which counts on the BASELINE side as well
 * as the current one and took the baseline projection out by two characters.
 * So while a composition is open this state machine holds any outside write
 * and ignores every input event, and at `compositionend` it folds the
 * committed text and the held write into ONE current side and composes once.
 * Driven that way the composition was not even interrupted, the Japanese
 * landed inside an `<ins>` inside a change, and both projections were exact.
 *
 * It is pure, takes and answers plain values, names no DOM, no model, no
 * bridge and no file, so the gate runs it under node and ablates it one clause
 * at a time. The DOM half is ./redline-caret and the wiring is ./redline-edits.
 */

import { mapOffset } from './text-edit';

/** A replacement of `[start, end)` of the current side by `text`. */
export interface CurrentEdit {
  start: number;
  end: number;
  text: string;
}

/** Where the selection is, as two current-side offsets. */
export interface CurrentSelection {
  anchor: number;
  focus: number;
}

/**
 * Everything typing knows. There is no baseline in it, no generation, no tab
 * and no file: see the header.
 */
export interface TypingState {
  /** The current side, being the file as the person has it. */
  text: string;
  /** Where to put the selection on the next draw, or null to leave it alone. */
  caret: CurrentSelection | null;
  /** The composition that is open, by the span it replaces, or null. */
  composing: { start: number; end: number } | null;
  /** An outside write held until that composition commits, or null. */
  held: string | null;
  /** How many edits the PERSON has made. The wiring writes the buffer on it. */
  edits: number;
}

/** A tab whose current side is `text` and in which nothing has happened yet. */
export function initialTyping(text: string): TypingState {
  return { text, caret: null, composing: null, held: null, edits: 0 };
}

export type TypingEvent =
  /** A `beforeinput` this view cancelled, with the span it named. */
  | {
      kind: 'input';
      inputType: string;
      data: string | null;
      start: number;
      end: number;
    }
  /** A composition opened over `[start, end)` of the current side. */
  | { kind: 'compositionstart'; start: number; end: number }
  /** A composition committed `data`. */
  | { kind: 'compositionend'; data: string }
  /** The buffer changed under the view: an agent's write, a reload, an undo. */
  | { kind: 'outside'; text: string; caret: CurrentSelection | null };

/**
 * The `beforeinput` types that insert their own `data`, and the two that
 * insert a line break.
 *
 * `insertLineBreak` IS ENTER, and research 97 §3 corrects research 83 D.2 on
 * it: under `contenteditable="plaintext-only"` a real Enter reports
 * `insertLineBreak`, where D.2 measured `insertParagraph` under
 * `contenteditable="true"`. A phase that handles only the latter silently
 * refuses Enter, which is what happened on the measure step's first run, so
 * BOTH are here and both insert one `\n` and nothing else — bytes, never a
 * `<div>` and never a `<br>`.
 */
const INSERTS = new Set([
  'insertText',
  'insertReplacementText',
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
  'insertTranspose'
]);
const LINE_BREAKS = new Set(['insertLineBreak', 'insertParagraph']);

/** The deletions, by how far each one reaches when the selection is collapsed. */
const DELETE_REACH: Record<string, 'char' | 'word' | 'line'> = {
  deleteContent: 'char',
  deleteContentBackward: 'char',
  deleteContentForward: 'char',
  deleteWordBackward: 'word',
  deleteWordForward: 'word',
  deleteSoftLineBackward: 'line',
  deleteSoftLineForward: 'line',
  deleteHardLineBackward: 'line',
  deleteHardLineForward: 'line',
  deleteEntireSoftLine: 'line',
  deleteByCut: 'char',
  deleteByDrag: 'char'
};

const FORWARD = /Forward$/;

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{N}_]/u.test(ch);
}

/**
 * One step back from `at`, by whole code points so a surrogate pair or an
 * emoji is never cut in half. A word step first eats any spacing between the
 * caret and the word and then the word, which is what a Mac text field does;
 * it is a fallback in practice, because Chromium names the span it means in
 * `getTargetRanges()` and ./redline-caret hands that span over instead.
 */
function stepBack(text: string, at: number, reach: 'char' | 'word' | 'line'): number {
  if (at <= 0) return 0;
  if (reach === 'line') {
    const nl = text.lastIndexOf('\n', at - 1);
    return nl === -1 ? 0 : nl + 1 === at ? nl : nl + 1;
  }
  const before = [...text.slice(0, at)];
  if (reach === 'char') {
    return at - (before[before.length - 1] ?? '').length;
  }
  let k = before.length;
  while (k > 0 && !isWordChar(before[k - 1] as string)) k -= 1;
  while (k > 0 && isWordChar(before[k - 1] as string)) k -= 1;
  return before.slice(0, k).join('').length;
}

/** One step forward from `at`, by the same rules. */
function stepForward(text: string, at: number, reach: 'char' | 'word' | 'line'): number {
  if (at >= text.length) return text.length;
  if (reach === 'line') {
    const nl = text.indexOf('\n', at);
    return nl === -1 ? text.length : nl === at ? nl + 1 : nl;
  }
  const after = [...text.slice(at)];
  if (reach === 'char') {
    return at + (after[0] ?? '').length;
  }
  let k = 0;
  while (k < after.length && !isWordChar(after[k] as string)) k += 1;
  while (k < after.length && isWordChar(after[k] as string)) k += 1;
  return at + after.slice(0, k).join('').length;
}

/**
 * What a cancelled `beforeinput` means as an edit on the current side, or null
 * when this view does not answer it. Null is a REFUSAL and never a guess: an
 * input type nobody named here does nothing at all, which is the honest answer
 * for a gesture whose meaning was not measured.
 */
export function editForInput(
  state: TypingState,
  event: Extract<TypingEvent, { kind: 'input' }>
): CurrentEdit | null {
  const lo = Math.max(0, Math.min(event.start, event.end, state.text.length));
  const hi = Math.max(0, Math.min(Math.max(event.start, event.end), state.text.length));
  if (INSERTS.has(event.inputType)) {
    return { start: lo, end: hi, text: event.data ?? '' };
  }
  if (LINE_BREAKS.has(event.inputType)) {
    return { start: lo, end: hi, text: '\n' };
  }
  const reach = DELETE_REACH[event.inputType];
  if (reach === undefined) return null;
  if (lo !== hi) return { start: lo, end: hi, text: '' };
  return FORWARD.test(event.inputType) || event.inputType === 'deleteEntireSoftLine'
    ? { start: lo, end: stepForward(state.text, lo, reach), text: '' }
    : { start: stepBack(state.text, lo, reach), end: hi, text: '' };
}

/** The current side with one edit folded into it. */
export function applyCurrentEdit(text: string, edit: CurrentEdit): string {
  return text.slice(0, edit.start) + edit.text + text.slice(edit.end);
}

/**
 * The next typing state. Answers the SAME object when nothing changed, so the
 * wiring can dispatch unconditionally and React can compare by identity.
 */
export function typingStep(state: TypingState, event: TypingEvent): TypingState {
  if (event.kind === 'input') {
    // While a composition is open every input event is the composition's own
    // and is left alone; see the header for what a redraw inside one costs.
    if (state.composing !== null) return state;
    if (event.inputType === 'insertCompositionText') return state;
    const edit = editForInput(state, event);
    if (edit === null) return state;
    const text = applyCurrentEdit(state.text, edit);
    if (text === state.text) return state;
    const at = edit.start + edit.text.length;
    return { ...state, text, caret: { anchor: at, focus: at }, edits: state.edits + 1 };
  }
  if (event.kind === 'compositionstart') {
    if (state.composing !== null) return state;
    return { ...state, composing: { start: event.start, end: event.end } };
  }
  if (event.kind === 'compositionend') {
    const open = state.composing;
    if (open === null) return state;
    // The held write first, because the committed text belongs where the
    // person put it in the text they can see, and the write moved that text.
    const base = state.held ?? state.text;
    const start = state.held === null ? open.start : mapOffset(state.text, base, open.start);
    const end = state.held === null ? open.end : mapOffset(state.text, base, open.end);
    const text = applyCurrentEdit(base, { start, end, text: event.data });
    const at = start + event.data.length;
    return {
      text,
      caret: { anchor: at, focus: at },
      composing: null,
      held: null,
      edits: state.edits + 1
    };
  }
  // An outside write. Held whole while a composition is open.
  if (state.composing !== null) {
    return state.held === event.text ? state : { ...state, held: event.text };
  }
  if (event.text === state.text) return state;
  const caret =
    event.caret === null
      ? null
      : {
          anchor: mapOffset(state.text, event.text, event.caret.anchor),
          focus: mapOffset(state.text, event.text, event.caret.focus)
        };
  return { ...state, text: event.text, caret };
}
