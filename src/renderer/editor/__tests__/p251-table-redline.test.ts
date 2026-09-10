/**
 * PHASE 251, fault 3. A table is diffed ROW AGAINST ROW, and the four leaf
 * rules that stop a change being drawn as nothing at all.
 *
 * `npm run conformance:redline` rules 26 to 32 drive the same properties over
 * a seeded fuzz and ablate every clause. This file is the cheap half that runs
 * on every `npm test`, and it pins the four readings a later round is most
 * likely to move: the renamed first column, which a first-cell key cannot
 * pair; the three caps as three separate questions; the dropped separator's
 * bytes still being in the run list; and ruling 5 of ../redline standing
 * exactly and no wider.
 */

import { describe, expect, it } from 'vitest';
import {
  cancelPairs,
  composeRedlineDocument,
  isTableBlock,
  pairRows,
  redlineLeaves,
  rowResemblance,
  tableRuns,
  REDLINE_ROW_RESEMBLANCE
} from '../redline-document';
import {
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_EDIT_LENGTH,
  REDLINE_MAX_TABLE_ROWS
} from '../redline';
import type { RedlineRun } from '../redline';

const marks = (runs: readonly RedlineRun[]): string[] =>
  runs.filter((r) => r.kind !== 'same').map((r) => `${r.kind}:${r.text}`);
const oldSide = (runs: readonly RedlineRun[]): string =>
  runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const newSide = (runs: readonly RedlineRun[]): string =>
  runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
const rows = (n: number, cell: string): string =>
  Array.from({ length: n }, () => `|${cell}|\n`).join('');

describe('the row alignment', () => {
  it('pairs a row whose FIRST CELL is what changed', () => {
    const doc = composeRedlineDocument(
      '| Sessions | the tab order |\n',
      '| Ledger | the tab order |\n'
    );
    // THE WHOLE OF FAULT 3 IS THIS ASSERTION. A first-cell key answers two
    // whole rows here, which is a worse picture than the flat stream it
    // replaces, and a renamed label column is the commonest table edit there
    // is.
    expect(doc.runs.map((r) => `${r.kind}:${r.text}`)).toEqual([
      'same:| ',
      'del:Sessions',
      'ins:Ledger',
      'same: | the tab order |\n'
    ]);
  });

  it('reuses research 110 §6’s own threshold and asks it of the whole row', () => {
    expect(REDLINE_ROW_RESEMBLANCE).toBe(0.5);
    expect(rowResemblance('| Sessions | the tab order |', '| Ledger | the tab order |'))
      .toBeGreaterThanOrEqual(REDLINE_ROW_RESEMBLANCE);
    expect(rowResemblance('| alpha bravo |', '| charlie delta |')).toBe(0);
  });

  it('keeps each side in its own order, so neither projection can move', () => {
    const oldText = '| a one |\n| b two |\n| c three |\n';
    const newText = '| c three |\n| a one |\n| b two |\n';
    const steps = pairRows(
      oldText.match(/[^\n]*\n|[^\n]+$/g) ?? [],
      newText.match(/[^\n]*\n|[^\n]+$/g) ?? []
    );
    expect(steps.filter((s) => s.kind === 'pair').map((s) => s.old)).toEqual([0, 1]);
    const doc = composeRedlineDocument(oldText, newText);
    expect(oldSide(doc.runs)).toBe(oldText);
    expect(newSide(doc.runs)).toBe(newText);
  });

  it('is asked only of a block that is a table on BOTH sides', () => {
    expect(isTableBlock('| a |\n', '| b |\n')).toBe(true);
    expect(isTableBlock('| a |\n', 'a paragraph\n')).toBe(false);
    expect(isTableBlock('a paragraph\n', '| a |\n')).toBe(false);
    expect(isTableBlock('\n', '\n')).toBe(false);
  });
});

describe('the three caps, asked as three questions', () => {
  it('spends ONE block budget across all its rows', () => {
    const oldText = Array.from(
      { length: 60 },
      (_, i) => `| r${String(i)} | alpha bravo charlie delta |\n`
    ).join('');
    const newText = Array.from(
      { length: 60 },
      (_, i) => `| r${String(i)} | alpha zulu cobalt delta |\n`
    ).join('');
    const table = tableRuns(oldText, newText);
    expect(table).not.toBeNull();
    // A PER-ROW CAP OF 200 WOULD SPEND 240 HERE, which is ruling 4's own
    // promise broken. The rows past the budget are whole-row replacements,
    // which is the fallback the block cap already has.
    expect(table?.spent).toBe(REDLINE_MAX_EDIT_LENGTH);
    expect(table?.paired).toBe(50);
    expect(table?.wholeRows).toBe(10);
  });

  it('sits INSIDE the character cap, so a table over it draws whole', () => {
    const row = (i: number): string => `| row ${String(i)} | ${'x'.repeat(60)} |\n`;
    let oldText = '';
    let newText = '';
    for (let i = 0; oldText.length <= REDLINE_MAX_BLOCK_CHARS; i += 1) {
      oldText += row(i);
      newText += row(i).replace('x', 'y');
    }
    expect(oldText.length).toBeGreaterThan(REDLINE_MAX_BLOCK_CHARS);
    const over = composeRedlineDocument(oldText, newText);
    expect(over.whole.tooBig).toBe(1);
    expect(over.runs.filter((r) => r.kind !== 'same')).toHaveLength(2);
    // And one row shorter it is inside the cap and draws row by row.
    const cut = (text: string): string =>
      text.slice(0, text.lastIndexOf('\n', text.length - 2) + 1);
    const under = composeRedlineDocument(cut(oldText), cut(newText));
    expect(under.whole.tooBig).toBe(0);
    expect(under.runs.length).toBeGreaterThan(100);
  });

  it('has a refusal of its own, because it answers on every input there is', () => {
    expect(REDLINE_MAX_TABLE_ROWS).toBe(60);
    const wide = rows(666, 'ab');
    const other = rows(666, 'cd');
    // BOTH SIDES ARE INSIDE THE CHARACTER CAP and no cap above this one can
    // see them: 3,330 bytes each.
    expect(wide.length).toBe(3330);
    expect(wide.length).toBeLessThan(REDLINE_MAX_BLOCK_CHARS);
    expect(tableRuns(wide, other)).toBeNull();
    expect(tableRuns(rows(61, 'ab'), rows(61, 'cd'))).toBeNull();
    expect(tableRuns(rows(60, 'ab'), rows(60, 'cd'))?.runs).toHaveLength(120);
    expect(composeRedlineDocument(wide, other).whole.tooBig).toBe(1);
  });
});

describe('the separator pair', () => {
  const before = '| surface | holds |\n| ------- | ----- |\n| manifest | argv |\n';
  const after = '| surface | holds | reader |\n| ------- | ----- | ------ |\n| manifest | argv | restore |\n';

  it('marks the deleted copy as not drawn, and keeps its bytes', () => {
    const doc = composeRedlineDocument(before, after);
    const leaves = redlineLeaves(doc.runs);
    const dropped = doc.runs.filter((_, i) => leaves[i]?.drop === true);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]?.kind).toBe('del');
    expect(dropped[0]?.text).toBe('| ------- | ----- |');
    // NOT DRAWN IS NOT ABSENT. Both projections are exact in the same reading.
    expect(oldSide(doc.runs)).toBe(before);
    expect(newSide(doc.runs)).toBe(after);
  });

  it('draws both copies when either side carries an alignment marker', () => {
    const aligned = before.replace('| -------', '| :------');
    const alignedAfter = after.replace('| -------', '| :------');
    const doc = composeRedlineDocument(aligned, alignedAfter);
    expect(redlineLeaves(doc.runs).filter((l) => l.drop)).toHaveLength(0);
  });

  it('never drops a thematic break in ordinary prose', () => {
    const doc = composeRedlineDocument('one\n\n---\n\ntwo\n', 'one\n\n-----\n\ntwo\n');
    expect(redlineLeaves(doc.runs).filter((l) => l.drop)).toHaveLength(0);
  });
});

describe('the leaf rules', () => {
  it('withholds the wash from furniture and from a structural newline', () => {
    const doc = composeRedlineDocument('one\n\ntwo\n', 'one\ntwo\n');
    const leaves = redlineLeaves(doc.runs);
    const lone = doc.runs.filter((_, i) => leaves[i]?.lone === true);
    expect(marks(doc.runs)).toEqual(['del:\n']);
    // A CHANGE MUST CARRY INK. With no wash and no strikethrough to land on,
    // this change would be drawn as nothing at all while the counter, the
    // chip and ⌥↓ all still offered Rewind and Accept on it.
    expect(lone).toHaveLength(1);
    expect(leaves.filter((l) => l.spacing)).toHaveLength(0);
  });

  it('keeps the wash on a real spacing change, which is ruling 5 exactly', () => {
    const doc = composeRedlineDocument(
      'Spacing   here   was   uneven.\n',
      'Spacing here was uneven.\n'
    );
    const leaves = redlineLeaves(doc.runs);
    const spacing = leaves.filter((l) => l.spacing);
    expect(spacing.length).toBeGreaterThan(0);
    expect(leaves.filter((l) => l.lone)).toHaveLength(0);
  });

  it('keeps the wash when four spaces become a tab', () => {
    const doc = composeRedlineDocument('a\n    b\n', 'a\n\tb\n');
    const leaves = redlineLeaves(doc.runs);
    expect(leaves.filter((l) => l.spacing).length).toBeGreaterThan(0);
  });

  it('marks a table’s pipes and dashes as furniture', () => {
    const doc = composeRedlineDocument('| a | b |\n', '| a | b | c |\n');
    const leaves = redlineLeaves(doc.runs);
    const wordless = doc.runs.filter((_, i) => leaves[i]?.wordless === true);
    expect(wordless.every((r) => !/[\p{L}\p{N}]/u.test(r.text))).toBe(true);
  });

  it('says nothing at all about a plain run', () => {
    const leaves = redlineLeaves([{ kind: 'same', text: '   \n' }]);
    expect(leaves[0]).toEqual({
      wordless: false,
      blank: false,
      spacing: false,
      lone: false,
      drop: false
    });
  });
});

describe('the cancel pass', () => {
  it('replaces a deletion and an insertion of the same bytes with one run', () => {
    expect(
      cancelPairs([
        { kind: 'same', text: 'a' },
        { kind: 'del', text: 'x' },
        { kind: 'ins', text: 'x' },
        { kind: 'same', text: 'b' }
      ])
    ).toEqual([{ kind: 'same', text: 'axb' }]);
  });

  it('leaves a pair that really differs exactly where it is', () => {
    const runs: RedlineRun[] = [
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'x' },
      { kind: 'ins', text: 'y' },
      { kind: 'same', text: 'b' }
    ];
    expect(cancelPairs(runs)).toEqual(runs);
  });

  it('is an identity on both projections', () => {
    const oldText = '| a | one |\n| b | two |\n';
    const newText = '| a | ONE |\n| b | two |\n';
    const doc = composeRedlineDocument(oldText, newText);
    const again = cancelPairs(doc.runs);
    expect(oldSide(again)).toBe(oldText);
    expect(newSide(again)).toBe(newText);
  });
});
