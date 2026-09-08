/**
 * PHASE 237. The rules typing runs on, pinned as a state machine.
 *
 * Research 97 drove all of this in a real Electron with real CDP key events —
 * never `execCommand`, which research 83 records fires no `beforeinput` in
 * Chromium and produced a wrong conclusion once already. What is pinned here
 * is the arithmetic those drives measured, so a later round cannot move a
 * clause without a red test: the type Enter really reports, the composition
 * that must be held, the deletion that steps over an island, and the fact
 * that no baseline is reachable from any of it.
 */

import { describe, expect, it } from 'vitest';
import {
  applyCurrentEdit,
  editForInput,
  initialTyping,
  typingStep
} from '../redline-typing';
import type { TypingState } from '../redline-typing';

const FILE = 'The quick brown fox jumps over the lazy dog.\nA second line.\n';

const at = (state: TypingState, n: number): TypingState => ({
  ...state,
  caret: { anchor: n, focus: n }
});

const type = (
  state: TypingState,
  inputType: string,
  data: string | null,
  start: number,
  end = start
): TypingState => typingStep(state, { kind: 'input', inputType, data, start, end });

describe('a keystroke is folded into the current side', () => {
  it('inserts what it carries and puts the caret after it', () => {
    const next = type(initialTyping(FILE), 'insertText', 'K', 10);
    expect(next.text).toBe(FILE.slice(0, 10) + 'K' + FILE.slice(10));
    expect(next.caret).toEqual({ anchor: 11, focus: 11 });
    expect(next.edits).toBe(1);
  });

  it('replaces a selection', () => {
    const next = type(initialTyping(FILE), 'insertText', 'slow', 4, 9);
    expect(next.text.startsWith('The slow brown')).toBe(true);
    expect(next.caret).toEqual({ anchor: 8, focus: 8 });
  });

  it('ENTER IS BYTES, and it reports insertLineBreak under plaintext-only', () => {
    // Research 97 §3 corrects research 83 D.2: D.2 measured `insertParagraph`
    // under `contenteditable="true"`, a real Enter under `plaintext-only`
    // reports `insertLineBreak`, and a phase handling only the first silently
    // refuses Enter. Both are answered, and both insert one `\n`.
    for (const kind of ['insertLineBreak', 'insertParagraph']) {
      const next = type(initialTyping(FILE), kind, null, 43);
      expect(next.text).toBe(`${FILE.slice(0, 43)}\n${FILE.slice(43)}`);
      expect(next.caret).toEqual({ anchor: 44, focus: 44 });
    }
  });

  it('takes a paste as the plain text it was handed', () => {
    const next = type(initialTyping(FILE), 'insertFromPaste', 'one\ntwo', 0);
    expect(next.text.startsWith('one\ntwoThe quick')).toBe(true);
  });

  it('refuses an input type nobody measured, rather than guessing', () => {
    const state = initialTyping(FILE);
    expect(typingStep(state, {
      kind: 'input',
      inputType: 'formatBold',
      data: null,
      start: 4,
      end: 9
    })).toBe(state);
  });
});

describe('a deletion', () => {
  it('takes the selection when there is one', () => {
    const next = type(initialTyping(FILE), 'deleteContentBackward', null, 4, 10);
    expect(next.text.startsWith('The brown')).toBe(true);
    expect(next.caret).toEqual({ anchor: 4, focus: 4 });
  });

  it('takes one whole code point back, never half a surrogate pair', () => {
    const emoji = 'a\u{1f469}‍\u{1f467}b';
    const state = initialTyping(emoji);
    const next = type(state, 'deleteContentBackward', null, emoji.length - 1);
    // The last code point of the family sequence, and not one code unit of it.
    expect(next.text).toBe(`a\u{1f469}‍b`);
  });

  it('takes the word behind the caret and stops at the space in front of it', () => {
    // "one two| three" loses "two" and neither space, which is what a Mac text
    // field does. In practice Chromium names the span itself in
    // `getTargetRanges()`; this is the fallback for when it does not.
    const next = type(initialTyping('one two three'), 'deleteWordBackward', null, 7);
    expect(next.text).toBe('one  three');
  });

  it('takes forward from the caret', () => {
    const next = type(initialTyping('abc'), 'deleteContentForward', null, 1);
    expect(next.text).toBe('ac');
    expect(next.caret).toEqual({ anchor: 1, focus: 1 });
  });

  it('answers the same state when it would change nothing', () => {
    const state = initialTyping('abc');
    expect(type(state, 'deleteContentBackward', null, 0)).toBe(state);
  });
});

describe('a composition, which is the one door no preventDefault closes', () => {
  it('holds an outside write and folds it with the committed text', () => {
    // Research 97 §3.1: a redraw landing inside an open composition breaks the
    // composition, leaves the committed text in a plain span and takes the
    // baseline projection out by the length of it. Held to `compositionend`,
    // the composition is not interrupted and both projections are exact.
    const base = 'hello  world';
    let state = initialTyping(base);
    state = typingStep(state, { kind: 'compositionstart', start: 6, end: 6 });
    const outside = 'HELLO  world';
    state = typingStep(state, { kind: 'outside', text: outside, caret: null });
    // NOT applied yet: the view still draws what the person is composing over.
    expect(state.text).toBe(base);
    expect(state.held).toBe(outside);
    state = typingStep(state, { kind: 'compositionend', data: '日本' });
    expect(state.text).toBe('HELLO 日本 world');
    expect(state.held).toBeNull();
    expect(state.composing).toBeNull();
    expect(state.caret).toEqual({ anchor: 8, focus: 8 });
  });

  it('ignores every input event while it is open, insertCompositionText first', () => {
    let state = initialTyping('abc');
    state = typingStep(state, { kind: 'compositionstart', start: 1, end: 1 });
    const held = state;
    expect(type(state, 'insertCompositionText', 'に', 1)).toBe(held);
    expect(type(state, 'insertText', 'X', 1)).toBe(held);
    expect(type(state, 'deleteContentBackward', null, 1)).toBe(held);
  });

  it('ignores insertCompositionText even with no composition open', () => {
    const state = initialTyping('abc');
    expect(type(state, 'insertCompositionText', 'に', 1)).toBe(state);
  });

  it('commits with nothing held when nothing arrived', () => {
    let state = initialTyping('abc');
    state = typingStep(state, { kind: 'compositionstart', start: 3, end: 3 });
    state = typingStep(state, { kind: 'compositionend', data: '日' });
    expect(state.text).toBe('abc日');
  });
});

describe('an outside write while a caret is in the document', () => {
  const base = 'alpha beta gamma delta';

  it('moves a caret with its own text', () => {
    const state = at(initialTyping(base), 12);
    const next = typingStep(state, {
      kind: 'outside',
      text: 'ALPHAS beta gamma delta',
      caret: { anchor: 12, focus: 12 }
    });
    expect(next.caret).toEqual({ anchor: 13, focus: 13 });
  });

  it('leaves the selection alone when the caret is not in here', () => {
    const next = typingStep(initialTyping(base), {
      kind: 'outside',
      text: 'other',
      caret: null
    });
    expect(next.caret).toBeNull();
    expect(next.text).toBe('other');
  });

  it('is not an event at all when the bytes did not move', () => {
    const state = initialTyping(base);
    expect(typingStep(state, { kind: 'outside', text: base, caret: null })).toBe(state);
  });

  it('is never counted as an edit of the person\'s', () => {
    const next = typingStep(initialTyping(base), {
      kind: 'outside',
      text: 'something else',
      caret: null
    });
    expect(next.edits).toBe(0);
  });
});

describe('TYPING NEVER MOVES THE BASELINE (research 83 A2.3)', () => {
  it('has no baseline and no generation in its state at all', () => {
    let state = initialTyping(FILE);
    for (const ch of 'a typed word') state = type(state, 'insertText', ch, 0);
    expect(Object.keys(state).sort()).toEqual([
      'caret',
      'composing',
      'edits',
      'held',
      'text'
    ]);
  });

  it('is a module that cannot reach one: no baseline named in its code', async () => {
    const fs = await import('node:fs');
    const source = fs
      .readFileSync(new URL('../redline-typing.ts', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source).not.toContain('nextBaseline');
    expect(source).not.toContain('baseline');
    expect(source).not.toContain('generation');
  });
});

describe('the edit itself', () => {
  it('is applied as a plain splice', () => {
    expect(applyCurrentEdit('abcdef', { start: 2, end: 4, text: 'XY' })).toBe('abXYef');
  });

  it('is clamped to the text it is applied to', () => {
    const edit = editForInput(initialTyping('abc'), {
      kind: 'input',
      inputType: 'insertText',
      data: 'Z',
      start: 99,
      end: 99
    });
    expect(edit).toEqual({ start: 3, end: 3, text: 'Z' });
  });
});
