/**
 * redline-typing-probe.mts. The runtime half of Phase 237's arms on
 * `npm run conformance:redline` (rule 17).
 *
 * It runs the SHIPPING typing rules, src/renderer/editor/redline-typing.ts,
 * under node over strings written here, and prints ONE JSON line last. It
 * launches no Electron, opens no window, spawns nothing, makes no request and
 * reads nothing under the person's home.
 *
 * The module directory is `TYPING_DIR` (default `src/renderer/editor`) so the
 * gate can point the same probe at a copy of the chain with one clause
 * ablated. The knob is not `GMUX_` prefixed, because the contract inventory
 * sweeps that prefix.
 *
 * WHAT IT IS FOR. Research 97 drove every one of these in a real Electron with
 * real CDP key events, never `execCommand`. What decays after that is the
 * CLAUSES, so each arm below is one of the measure step's readings re-taken
 * over the shipping module, and the gate ablates the clause behind it.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env['TYPING_DIR'] ?? 'src/renderer/editor';
const typing = (await import(
  pathToFileURL(resolve(DIR, 'redline-typing.ts')).href
)) as typeof import('../src/renderer/editor/redline-typing');
const documentModule = (await import(
  pathToFileURL(resolve(DIR, 'redline-document.ts')).href
)) as typeof import('../src/renderer/editor/redline-document');
const rewind = (await import(
  pathToFileURL(resolve(DIR, 'rewind.ts')).href
)) as typeof import('../src/renderer/editor/rewind');

const { initialTyping, typingStep } = typing;
const { composeRedlineDocument, oldTextOf, newTextOf } = documentModule;
const { changesOf } = rewind;

type State = import('../src/renderer/editor/redline-typing').TypingState;
type Event = import('../src/renderer/editor/redline-typing').TypingEvent;

const step = (state: State, event: Event): State => typingStep(state, event);
const key = (
  state: State,
  inputType: string,
  data: string | null,
  start: number,
  end = start
): State => step(state, { kind: 'input', inputType, data, start, end });

// Research 83 B.1's own paragraph, which is what every redline arm uses.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

// ---------------------------------------------------------------------------
// 1. ENTER IS BYTES, and it arrives as `insertLineBreak` under plaintext-only.
// ---------------------------------------------------------------------------
const enterAt = CURRENT.indexOf('The application');
function enterArm(inputType: string): {
  answered: boolean;
  text: string;
  caret: number | null;
} {
  const state = key(initialTyping(CURRENT), inputType, null, enterAt);
  return {
    answered: state.text !== CURRENT,
    text: state.text.slice(enterAt - 6, enterAt + 6),
    caret: state.caret?.anchor ?? null
  };
}
const enterIsBytes = {
  lineBreak: enterArm('insertLineBreak'),
  paragraph: enterArm('insertParagraph'),
  // A `\n` and nothing else: the current side is one character longer and the
  // character is a newline.
  onlyANewline:
    key(initialTyping(CURRENT), 'insertLineBreak', null, enterAt).text ===
    `${CURRENT.slice(0, enterAt)}\n${CURRENT.slice(enterAt)}`
};

// ---------------------------------------------------------------------------
// 2 and 3. THE COMPOSITION. Research 97 §3.1: `insertCompositionText` is not
// cancelable, so while a composition is open every input event is ignored and
// every outside write is HELD; a redraw inside one broke the composition and
// took the baseline projection out by the length of the committed text.
// ---------------------------------------------------------------------------
const composeAt = CURRENT.indexOf('a throwaway') + 2;
const OUTSIDE = CURRENT.replace('Tortie holds', 'TORTIE HOLDS');
function composition(): {
  heldDuring: boolean;
  heldApplied: boolean;
  drawnDuring: string;
  after: string;
  caret: number | null;
  currentExact: boolean;
  baselineExact: boolean;
  japaneseInsideAChange: boolean;
} {
  let state = initialTyping(CURRENT);
  state = step(state, { kind: 'compositionstart', start: composeAt, end: composeAt });
  state = step(state, { kind: 'outside', text: OUTSIDE, caret: null });
  const heldDuring = state.text === CURRENT;
  const drawnDuring = state.text.slice(0, 12);
  state = step(state, { kind: 'compositionend', data: '日本' });
  const doc = composeRedlineDocument(BASELINE, state.text);
  const changes = changesOf(doc.runs);
  return {
    heldDuring,
    heldApplied: state.text.startsWith('TORTIE HOLDS'),
    drawnDuring,
    after: state.text.slice(composeAt - 4, composeAt + 8),
    caret: state.caret?.anchor ?? null,
    currentExact: newTextOf(doc.runs) === state.text,
    baselineExact: oldTextOf(doc.runs) === BASELINE,
    japaneseInsideAChange: changes.some((c) => c.ins.includes('日本'))
  };
}
const compositionHeld = composition();

const compositionIgnored = (() => {
  let state = initialTyping(CURRENT);
  state = step(state, { kind: 'compositionstart', start: composeAt, end: composeAt });
  const during = state;
  return {
    insertCompositionTextIgnored: key(during, 'insertCompositionText', 'に', composeAt) === during,
    insertTextIgnored: key(during, 'insertText', 'X', composeAt) === during,
    deleteIgnored: key(during, 'deleteContentBackward', null, composeAt) === during,
    // And with no composition open at all, because the event arrives by the
    // one door no `preventDefault` closes.
    ignoredWithNoComposition:
      key(initialTyping(CURRENT), 'insertCompositionText', 'に', composeAt) ===
      undefined
        ? false
        : key(initialTyping(CURRENT), 'insertCompositionText', 'に', composeAt).text ===
          CURRENT
  };
})();

// ---------------------------------------------------------------------------
// 4. THE CARET THROUGH A REDRAW, being research 97 §2.2's four outside-write
// shapes. The expected answers are re-derived HERE by a different method, a
// plain walk over the two texts, so the arm is not the module checking itself.
// ---------------------------------------------------------------------------
const caretAt = CURRENT.indexOf('exactly what it was') + 4;
const SHAPES: { name: string; write: string }[] = [
  { name: 'before the caret', write: CURRENT.replace('Tortie holds', 'Tortie now holds') },
  { name: 'after the caret', write: CURRENT.replace('rebuilt from memory', 'rebuilt from notes') },
  {
    name: 'the very run the caret is in',
    write: CURRENT.replace('still knows exactly what it was doing', 'still knows perfectly well what it was up to')
  },
  {
    name: 'that run removed entirely',
    write: CURRENT.replace(
      'When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n',
      ''
    )
  }
];

/** The independent expectation: the shared head and tail, walked by hand. */
function expectedOffset(before: string, after: string, offset: number): number {
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
  let tail = 0;
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }
  if (offset <= head) return offset;
  if (offset >= before.length - tail) return after.length - (before.length - offset);
  return head;
}

const caretThroughRedraw = SHAPES.map((shape) => {
  const state = step(initialTyping(CURRENT), {
    kind: 'outside',
    text: shape.write,
    caret: { anchor: caretAt, focus: caretAt }
  });
  const got = state.caret?.anchor ?? -1;
  const want = expectedOffset(CURRENT, shape.write, caretAt);
  return {
    name: shape.name,
    got,
    want,
    error: got - want,
    // What the caret is really sitting between, which is the reading a person
    // would recognise: research 97's own "ps its inden|tation".
    context: `${shape.write.slice(Math.max(0, got - 8), got)}|${shape.write.slice(got, got + 8)}`,
    naive: caretAt
  };
});

// ---------------------------------------------------------------------------
// 5. TYPING FOLDS INTO THE CURRENT SIDE AND THE BASELINE DOES NOT MOVE. The
// composer is handed the SAME baseline before and after, and both projections
// are re-derived by plain joins over the runs it printed.
// ---------------------------------------------------------------------------
const typedWord = 'really ';
const typedAt = CURRENT.indexOf('throwaway viewer');
const typedState = (() => {
  let state = initialTyping(CURRENT);
  for (let i = 0; i < typedWord.length; i += 1) {
    state = key(state, 'insertText', typedWord[i] as string, typedAt + i);
  }
  return state;
})();
const before = composeRedlineDocument(BASELINE, CURRENT);
const after = composeRedlineDocument(BASELINE, typedState.text);
const afterChanges = changesOf(after.runs);
const projection = {
  typed: typedState.text.slice(typedAt - 3, typedAt + 24),
  edits: typedState.edits,
  caret: typedState.caret?.anchor ?? null,
  expectedCaret: typedAt + typedWord.length,
  baselineBefore: oldTextOf(before.runs) === BASELINE,
  baselineAfter: oldTextOf(after.runs) === BASELINE,
  currentAfter: newTextOf(after.runs) === typedState.text,
  insideAChange: afterChanges.some((c) => c.ins.includes(typedWord.trim())),
  // The state has no baseline and no generation in it at all.
  stateKeys: Object.keys(typedState).sort()
};

console.log(
  JSON.stringify({
    enterIsBytes,
    compositionHeld,
    compositionIgnored,
    caretThroughRedraw,
    projection
  })
);
