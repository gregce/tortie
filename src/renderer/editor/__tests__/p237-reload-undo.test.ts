/**
 * PHASE 237, item 1. A file that changes under a caret keeps ⌘Z.
 *
 * Research 97 §5 measured this in a real monaco 0.56.0 with real CDP keys:
 * `resetWorkingModel` called `model.setValue`, `setValue` reaches
 * `textModel.js:342-343`'s `this._commandManager.clear()`, and the reading was
 * a caret moved from 5:7 to 1:1 with one ⌘Z giving nothing back. Through
 * `pushEditOperations` the caret stayed at 5:7 and the undo worked, and with
 * `pushStackElement()` in front of it the person's OWN typing survived that
 * undo instead of being reverted with the agent's write.
 *
 * Monaco does not run under this lane, so what is pinned here is the shape:
 * the arithmetic that decides the one range (./text-edit), and the calls
 * `applyModelText` makes on a model, recorded by a hand written double.
 * The real editor's answer is the app run's, `build/probe-p237-typing.mjs`.
 */

import { describe, expect, it } from 'vitest';
import { commonAffix, mapOffset, rangeEditFor } from '../text-edit';
import { applyModelText, resetWorkingModel, workingModel } from '../monaco-loader';

describe('the one range that turns one text into another', () => {
  it('is nothing at all when the two are equal', () => {
    expect(rangeEditFor('same', 'same')).toBeNull();
  });

  it('replaces exactly what changed in the middle', () => {
    const edit = rangeEditFor('the quick brown fox', 'the slow brown fox');
    expect(edit).toEqual({ start: 4, end: 9, text: 'slow' });
  });

  it('is an insertion with an empty range', () => {
    expect(rangeEditFor('ab', 'aXb')).toEqual({ start: 1, end: 1, text: 'X' });
  });

  it('is a deletion with empty text', () => {
    expect(rangeEditFor('aXb', 'ab')).toEqual({ start: 1, end: 2, text: '' });
  });

  it('never lets the prefix and the suffix overlap', () => {
    const { prefix, suffix } = commonAffix('aaaa', 'aa');
    expect(prefix + suffix).toBeLessThanOrEqual(2);
    const edit = rangeEditFor('aaaa', 'aa');
    expect(edit).not.toBeNull();
    const e = edit as { start: number; end: number; text: string };
    expect('aaaa'.slice(0, e.start) + e.text + 'aaaa'.slice(e.end)).toBe('aa');
  });

  it('rebuilds the new text over a corpus of shapes', () => {
    const pairs: [string, string][] = [
      ['', 'hello'],
      ['hello', ''],
      ['a\nb\nc\n', 'a\nB\nc\n'],
      ['one two three', 'one two three four'],
      ['Ka', 'Kå'],
      ['\u{1f469}‍\u{1f467} family', '\u{1f469}‍\u{1f467} families'],
      ['line\r\nline', 'line\r\nLINE']
    ];
    for (const [before, after] of pairs) {
      const edit = rangeEditFor(before, after);
      const applied =
        edit === null
          ? before
          : before.slice(0, edit.start) + edit.text + before.slice(edit.end);
      expect(applied).toBe(after);
    }
  });
});

describe('where an offset lands when the text under it changes', () => {
  const before = 'alpha beta gamma delta';

  it('does not move when the write was after it', () => {
    expect(mapOffset(before, 'alpha beta gamma DELTA', 3)).toBe(3);
  });

  it('moves with its own text when the write was before it', () => {
    const after = 'ALPHAS beta gamma delta';
    expect(mapOffset(before, after, 12)).toBe(13);
    expect(after.slice(13)).toBe(before.slice(12));
  });

  it('lands where the replacement begins when the write took it', () => {
    // "beta gamma" replaced whole: an offset inside it has nowhere of its own.
    expect(mapOffset(before, 'alpha X delta', 8)).toBe(6);
  });

  it('is clamped to the two texts', () => {
    expect(mapOffset(before, 'alpha', 999)).toBe(5);
    expect(mapOffset(before, 'alpha', -4)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The calls a reload makes on a live model, recorded.
// ---------------------------------------------------------------------------

interface Call {
  kind: 'setValue' | 'pushStackElement' | 'pushEditOperations';
  text?: string;
  range?: { start: [number, number]; end: [number, number] };
}

/** A model double: enough of ITextModel for the loader, and a call log. */
function fakeModel(initial: string): {
  model: unknown;
  calls: Call[];
  value: () => string;
} {
  let text = initial;
  const calls: Call[] = [];
  const positionAt = (offset: number): { lineNumber: number; column: number } => {
    const upto = text.slice(0, offset);
    const lines = upto.split('\n');
    return {
      lineNumber: lines.length,
      column: (lines[lines.length - 1] ?? '').length + 1
    };
  };
  const offsetAt = (line: number, column: number): number => {
    const lines = text.split('\n');
    let at = 0;
    for (let n = 0; n < line - 1; n += 1) at += (lines[n] ?? '').length + 1;
    return at + column - 1;
  };
  const model = {
    isDisposed: () => false,
    updateOptions: () => undefined,
    getValue: () => text,
    getPositionAt: positionAt,
    setValue(next: string) {
      calls.push({ kind: 'setValue', text: next });
      text = next;
    },
    pushStackElement() {
      calls.push({ kind: 'pushStackElement' });
    },
    pushEditOperations(
      _before: unknown,
      edits: { range: Record<string, number>; text: string }[]
    ) {
      const one = edits[0] as { range: Record<string, number>; text: string };
      const start = offsetAt(
        one.range['startLineNumber'] as number,
        one.range['startColumn'] as number
      );
      const end = offsetAt(
        one.range['endLineNumber'] as number,
        one.range['endColumn'] as number
      );
      calls.push({
        kind: 'pushEditOperations',
        text: one.text,
        range: {
          start: [one.range['startLineNumber'] as number, one.range['startColumn'] as number],
          end: [one.range['endLineNumber'] as number, one.range['endColumn'] as number]
        }
      });
      text = text.slice(0, start) + one.text + text.slice(end);
      return null;
    }
  };
  return { model, calls, value: () => text };
}

/** A monaco namespace double: enough of it for `workingModel` to register. */
function fakeMonaco(model: unknown): unknown {
  return {
    Uri: { from: (parts: unknown) => parts },
    editor: {
      getModel: () => null,
      createModel: () => model
    }
  };
}

const REGISTERED = 'p237-reload';

describe('a reload of a live buffer', () => {
  it('is one range replacement and never setValue, with the group closed first', () => {
    const before = 'one\ntwo\nthree\n';
    const after = 'one\nTWO\nthree\n';
    const { model, calls, value } = fakeModel(before);
    workingModel(
      fakeMonaco(model) as never,
      REGISTERED,
      before,
      'plaintext'
    );

    resetWorkingModel(REGISTERED, after);

    expect(value()).toBe(after);
    expect(calls.some((c) => c.kind === 'setValue')).toBe(false);
    expect(calls.map((c) => c.kind)).toEqual([
      'pushStackElement',
      'pushEditOperations'
    ]);
    // Line 2, columns 1 to 4: the word and nothing else in the file.
    expect(calls[1]?.range).toEqual({ start: [2, 1], end: [2, 4] });
    expect(calls[1]?.text).toBe('TWO');
  });

  it('does nothing at all when the bytes did not change', () => {
    const { model, calls } = fakeModel('unchanged');
    workingModel(fakeMonaco(model) as never, `${REGISTERED}-same`, 'unchanged', 'plaintext');
    resetWorkingModel(`${REGISTERED}-same`, 'unchanged');
    expect(calls).toEqual([]);
  });

  it("leaves the person's own undo element open when the edit is theirs", () => {
    const { model, calls } = fakeModel('type here');
    workingModel(fakeMonaco(model) as never, `${REGISTERED}-typed`, 'type here', 'plaintext');
    const applied = applyModelText(model as never, 'type X here', false);
    expect(applied).toBe(true);
    expect(calls.map((c) => c.kind)).toEqual(['pushEditOperations']);
  });
});
