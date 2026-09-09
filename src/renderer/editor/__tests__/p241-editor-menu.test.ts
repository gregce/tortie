/**
 * PHASE 241 — the editor's right-click menu, and the dynamic group.
 *
 * Group A is the only dynamic group, and its whole promise is that a row is
 * drawn ONLY when it applies to what is under the cursor, and that a menu with
 * nothing to reshape draws no group and NO SEPARATOR FOR IT. Both halves are
 * pinned here over ten caret positions, because the second half is the one a
 * later round undoes by accident: an empty section reads as a bug and a greyed
 * row is the "TONS of words, bad" failure in menu form.
 *
 * Everything below runs the SHIPPING modules under node. The editor is a small
 * stand-in carrying only the four methods `reshapesFor` reads, so the decision
 * that decides the rows is the real one and no Electron is needed.
 */

import { describe, expect, it } from 'vitest';
import type * as monacoNs from 'monaco-editor';
import {
  buildEditorMenu,
  MONACO_ROWS,
  RESHAPE_LABELS,
  type EditorMenuActions
} from '../editor-menu';
import { applyReshape, reshapesFor } from '../use-editor-menu';

// ---------------------------------------------------------------------------
// A stand-in editor: getModel, getSelection, getPosition, and the model's
// four readers. Nothing else is touched by the decision under test.
// ---------------------------------------------------------------------------

interface Caret {
  line: number;
  /** [startLine, startColumn, endLine, endColumn], or null for no selection. */
  selection?: [number, number, number, number] | null;
  language?: string;
}

/** What an `applyReshape` press did: the edits, and the undo stops around them. */
interface Written {
  order: string[];
  edits: { range: unknown; text: string }[];
}

function fakeEditor(
  text: string,
  caret: Caret,
  wrote?: Written
): monacoNs.editor.IStandaloneCodeEditor {
  const lines = text.split('\n');
  const sel = caret.selection ?? null;
  const valueInRange = (r: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }): string => {
    const out: string[] = [];
    for (let n = r.startLineNumber; n <= r.endLineNumber; n += 1) {
      const line = lines[n - 1] ?? '';
      const from = n === r.startLineNumber ? r.startColumn - 1 : 0;
      const to = n === r.endLineNumber ? r.endColumn - 1 : line.length;
      out.push(line.slice(from, to));
    }
    return out.join('\n');
  };
  const model = {
    getLinesContent: () => lines,
    getValue: () => text,
    getValueLength: () => text.length,
    getLanguageId: () => caret.language ?? 'markdown',
    getValueInRange: valueInRange,
    getFullModelRange: () => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lines.length,
      endColumn: (lines[lines.length - 1]?.length ?? 0) + 1
    })
  };
  const selection =
    sel === null
      ? null
      : {
          startLineNumber: sel[0],
          startColumn: sel[1],
          endLineNumber: sel[2],
          endColumn: sel[3],
          isEmpty: () => sel[0] === sel[2] && sel[1] === sel[3]
        };
  const write = {
    ...model,
    getLineMaxColumn: (n: number) => (lines[n - 1]?.length ?? 0) + 1,
    pushEditOperations: (
      _before: unknown,
      edits: { range: unknown; text: string }[]
    ): null => {
      wrote?.order.push('edit');
      for (const e of edits) wrote?.edits.push(e);
      return null;
    }
  };
  return {
    getModel: () => write,
    getSelection: () => selection,
    getPosition: () => ({ lineNumber: caret.line, column: 1 }),
    focus: () => undefined,
    pushUndoStop: () => wrote?.order.push('stop')
  } as unknown as monacoNs.editor.IStandaloneCodeEditor;
}

const NO_ACTIONS: EditorMenuActions = {
  reshape: () => undefined,
  trigger: () => undefined,
  history: () => undefined,
  copyPath: () => undefined,
  save: () => undefined
};

function labelsOf(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  writable = true
): string[] {
  const items = buildEditorMenu(
    { reshapes: reshapesFor(editor, writable), writable, historyAvailable: true },
    NO_ACTIONS
  );
  return items.map((i) => (i === 'sep' ? '—' : i.label));
}

const DOC = [
  'Some prose about the thing.', // 1
  '', // 2
  '| a | b |', // 3
  '| --- | --: |', // 4
  '| 1 | 2 |', // 5
  '| 3 | 4 |', // 6
  '', // 7
  'A closing paragraph', // 8
  '---', // 9  a setext heading, NOT a delimiter row
  '', // 10
  '- item', // 11
  '', // 12
  '    | c | d |', // 13
  '    | --- | --- |', // 14
  '    | 5 | 6 |', // 15
  '', // 16
  '```json', // 17
  '{"b":2,"a":[1,2]}', // 18
  '```' // 19
].join('\n');

describe('Group A is dynamic, over ten caret positions', () => {
  const table = RESHAPE_LABELS.table;
  const format = RESHAPE_LABELS['json-format'];
  const minify = RESHAPE_LABELS['json-minify'];

  it('1. the caret in the header row draws Format Table first', () => {
    expect(labelsOf(fakeEditor(DOC, { line: 3 }))[0]).toBe(table);
  });

  it('2. the caret in a body row draws it too', () => {
    expect(labelsOf(fakeEditor(DOC, { line: 6 }))[0]).toBe(table);
  });

  it('3. the caret in prose draws NO Group A and no separator in front', () => {
    const labels = labelsOf(fakeEditor(DOC, { line: 1 }));
    expect(labels).not.toContain(table);
    expect(labels[0]).toBe('Undo');
    // The rule that decays: no leading separator, and never two in a row.
    expect(labels[0]).not.toBe('—');
    expect(labels.join(' ')).not.toContain('— —');
  });

  it('4. the caret on a blank line between two tables draws nothing', () => {
    expect(labelsOf(fakeEditor(DOC, { line: 7 }))).not.toContain(table);
  });

  it('5. a setext heading under prose is not a delimiter row', () => {
    // `---` matches every hyphen rule a delimiter row has; the pipe is what
    // tells them apart, and without it every heading in the tree draws a row.
    expect(labelsOf(fakeEditor(DOC, { line: 8 }))).not.toContain(table);
    expect(labelsOf(fakeEditor(DOC, { line: 9 }))).not.toContain(table);
  });

  it('6. a table indented inside a list item still draws the row', () => {
    expect(labelsOf(fakeEditor(DOC, { line: 14 }))[0]).toBe(table);
  });

  it('7. a JSON file with no selection draws both JSON rows', () => {
    const editor = fakeEditor('{"b":2,"a":1}', { line: 1, language: 'json' });
    expect(labelsOf(editor).slice(0, 3)).toEqual([format, minify, '—']);
  });

  it('8. SELECTION BEATS CARET: a JSON fence selected in markdown', () => {
    const editor = fakeEditor(DOC, { line: 18, selection: [18, 1, 18, 18] });
    expect(labelsOf(editor).slice(0, 2)).toEqual([format, minify]);
  });

  it('9. a selection that is not JSON draws no JSON row, even in a .json file', () => {
    const editor = fakeEditor('{"b":2,"a":1}', {
      line: 1,
      language: 'json',
      selection: [1, 2, 1, 6]
    });
    expect(labelsOf(editor)).not.toContain(format);
  });

  it('10. a read-only tab draws no reshape and no mutating Monaco row', () => {
    const labels = labelsOf(fakeEditor(DOC, { line: 3 }), false);
    expect(labels).not.toContain(table);
    for (const row of MONACO_ROWS) {
      if (row.mutates) expect(labels).not.toContain(row.label);
      else expect(labels).toContain(row.label);
    }
    expect(labels).not.toContain('Save');
    expect(labels).toContain('Copy Path');
  });
});

describe('the groups, and what is absent on purpose', () => {
  it('draws all eleven Monaco rows on a writable tab', () => {
    const labels = labelsOf(fakeEditor(DOC, { line: 1 }));
    expect(MONACO_ROWS).toHaveLength(11);
    for (const row of MONACO_ROWS) expect(labels).toContain(row.label);
  });

  it('names no row that needs a chat, a language server, a host or a palette', () => {
    const labels = labelsOf(fakeEditor(DOC, { line: 3 })).join(' | ');
    for (const refused of [
      'Add Symbol to Chat',
      'Add Symbol to New Chat',
      'Create Rule',
      'Refactor',
      'Go to Definition',
      'Open on Remote',
      'Share',
      'Copy As',
      'Command Palette',
      'Reveal in Explorer'
    ]) {
      expect(labels).not.toContain(refused);
    }
  });

  it('drops History for a file on another machine and keeps the two copies', () => {
    const items = buildEditorMenu(
      { reshapes: [], writable: true, historyAvailable: false },
      NO_ACTIONS
    );
    const labels = items.map((i) => (i === 'sep' ? '—' : i.label));
    expect(labels).not.toContain('History');
    expect(labels).toContain('Copy Path');
    expect(labels).toContain('Copy Relative Path');
  });

  it('runs the action the row names, and no other', () => {
    const pressed: string[] = [];
    const items = buildEditorMenu(
      { reshapes: ['table'], writable: true, historyAvailable: true },
      { ...NO_ACTIONS, reshape: (id) => pressed.push(id), trigger: (a) => pressed.push(a) }
    );
    for (const item of items) if (item !== 'sep') item.run();
    expect(pressed[0]).toBe('table');
    expect(pressed.slice(1)).toEqual(MONACO_ROWS.map((r) => r.action));
  });
});

describe('what a press writes', () => {
  it('is ONE edit between two undo stops, so one ⌘Z takes it back', () => {
    const wrote: Written = { order: [], edits: [] };
    const why = applyReshape(fakeEditor(DOC, { line: 5 }, wrote), 'table', true);
    expect(why).toBeNull();
    expect(wrote.order).toEqual(['stop', 'edit', 'stop']);
    expect(wrote.edits).toHaveLength(1);
  });

  it('KEEPS the file\'s trailing newline when the subject is the whole document', () => {
    const wrote: Written = { order: [], edits: [] };
    const editor = fakeEditor('{"b":2,"a":1}\n', { line: 1, language: 'json' }, wrote);
    expect(applyReshape(editor, 'json-format', true)).toBeNull();
    expect(wrote.edits[0]?.text.endsWith('}\n')).toBe(true);
    // …and adds one that was never there.
    const bare: Written = { order: [], edits: [] };
    applyReshape(fakeEditor('{"b":2}', { line: 1, language: 'json' }, bare), 'json-format', true);
    expect(bare.edits[0]?.text.endsWith('}')).toBe(true);
  });

  it('writes NOTHING on a refusal and says why', () => {
    const wrote: Written = { order: [], edits: [] };
    const editor = fakeEditor('{"id":12345678901234567890}\n', { line: 1, language: 'json' }, wrote);
    const why = applyReshape(editor, 'json-format', true);
    expect(why).toContain('more than whitespace at offset');
    expect(wrote.edits).toHaveLength(0);
    expect(wrote.order).toEqual([]);
    // The minify row is byte-preserving, so it still answers on the same file.
    expect(applyReshape(editor, 'json-minify', true)).toBeNull();
  });

  it('refuses on a read-only tab and on a caret with nothing under it', () => {
    const wrote: Written = { order: [], edits: [] };
    expect(applyReshape(fakeEditor(DOC, { line: 5 }, wrote), 'table', false)).toBe(
      'This file is read-only here.'
    );
    expect(applyReshape(fakeEditor(DOC, { line: 1 }, wrote), 'table', true)).toBe(
      'The cursor is not inside a markdown table.'
    );
    expect(applyReshape(fakeEditor(DOC, { line: 1 }, wrote), 'json-format', true)).toBe(
      'Select some JSON, or put the cursor in a JSON file.'
    );
    expect(wrote.edits).toHaveLength(0);
  });
});
