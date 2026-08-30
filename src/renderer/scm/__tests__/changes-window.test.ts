/**
 * Phase 167. The Changes list draws a window of rows, not every row main sends.
 *
 * WHY THIS FILE EXISTS. A churn of 96,000 untracked files in a watched project
 * put 100,181 DOM nodes on the page for the 10,000 rows main is allowed to
 * send, and took the renderer to 1.8 GB. The list now draws `SCM_ROW_WINDOW`
 * rows per group and one line with the rest of the count. These tests hold
 * the rule with git's own porcelain output through the real parser, so the
 * 10,000 row cap the parser applies and the 200 row window the list applies
 * are proved together on the same bytes.
 *
 * What is pinned:
 *  1. Ten thousand untracked rows draw 200 and report 9,800 hidden, and the
 *     flattened row list the keyboard walks is the same 200.
 *  2. A group inside the window is returned as the SAME array, so the memo
 *     over it keeps its identity, and reports 0 hidden.
 *  3. Show more adds one window at a time and never runs past the group.
 *  4. The drawn rows are the group's own prefix, in the group's own order.
 *  5. The section draws `drawn.groups`, never `groups` whole, read off the
 *     source the way p165 reads the lazy doors. This is the line a later
 *     round would undo in one edit.
 *
 * On the tree before Phase 167 this file fails at its first import, because
 * the window module did not exist and the section mapped every row.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePorcelainV2Status, STATUS_LIMIT } from '../../../main/git/parse';
import { groupFiles } from '../groups';
import { flattenRows } from '../selection';
import {
  NO_EXTRA_WINDOWS,
  SCM_ROW_WINDOW,
  rowsAllowed,
  showMore,
  windowGroups
} from '../changes-window';

const ROOT = resolve(import.meta.dirname, '../../../..');

/** `git status --porcelain=v2 -z` with `n` untracked files and one edit. */
function porcelainWithUntracked(n: number): string {
  const lines = [
    '# branch.oid 1111111222222233333334444444555555566666667',
    '# branch.head main',
    '1 .M N... 100644 100644 100644 abc abc src/file0.ts'
  ];
  for (let i = 0; i < n; i += 1) {
    lines.push(`? churn/d${String(Math.floor(i / 1000))}/f${String(i)}.txt`);
  }
  return lines.join('\0') + '\0';
}

describe('windowGroups', () => {
  it('draws one window of ten thousand untracked rows and counts the rest', () => {
    const parsed = parsePorcelainV2Status(porcelainWithUntracked(12_000));
    // The parser's own cap, so the list is asked about exactly what main
    // sends and not about a number this file made up.
    expect(parsed.truncated).toBe(true);
    expect(parsed.files).toHaveLength(STATUS_LIMIT);

    const groups = groupFiles(parsed.files);
    expect(groups.untracked.length).toBeGreaterThan(SCM_ROW_WINDOW);

    const drawn = windowGroups(groups, NO_EXTRA_WINDOWS);
    expect(drawn.groups.untracked).toHaveLength(SCM_ROW_WINDOW);
    expect(drawn.hidden.untracked).toBe(
      groups.untracked.length - SCM_ROW_WINDOW
    );
    // The keyboard walks the drawn rows: the one edit plus one window.
    expect(flattenRows(drawn.groups)).toHaveLength(SCM_ROW_WINDOW + 1);
  });

  it('returns a group inside the window as the same array with nothing hidden', () => {
    const groups = groupFiles(
      parsePorcelainV2Status(porcelainWithUntracked(SCM_ROW_WINDOW)).files
    );
    const drawn = windowGroups(groups, NO_EXTRA_WINDOWS);
    expect(drawn.groups.untracked).toBe(groups.untracked);
    expect(drawn.groups.changes).toBe(groups.changes);
    expect(drawn.groups.staged).toBe(groups.staged);
    expect(drawn.groups.merge).toBe(groups.merge);
    expect(drawn.hidden).toEqual({
      merge: 0,
      staged: 0,
      changes: 0,
      untracked: 0
    });
  });

  it('shows one more window per press and never runs past the group', () => {
    const groups = groupFiles(
      parsePorcelainV2Status(porcelainWithUntracked(450)).files
    );
    let shown = NO_EXTRA_WINDOWS;
    let drawn = windowGroups(groups, shown);
    expect(drawn.groups.untracked).toHaveLength(200);
    expect(drawn.hidden.untracked).toBe(250);

    shown = showMore(shown, 'untracked');
    drawn = windowGroups(groups, shown);
    expect(drawn.groups.untracked).toHaveLength(400);
    expect(drawn.hidden.untracked).toBe(50);

    shown = showMore(shown, 'untracked');
    drawn = windowGroups(groups, shown);
    expect(drawn.groups.untracked).toHaveLength(450);
    expect(drawn.hidden.untracked).toBe(0);
    expect(drawn.groups.untracked).toBe(groups.untracked);

    // A press on one group leaves the others where they were, and the
    // changes group, which was never over the window, is untouched.
    expect(shown).toEqual({ untracked: 2 });
    expect(drawn.groups.changes).toBe(groups.changes);
  });

  it('draws the prefix of the group in the group order', () => {
    const groups = groupFiles(
      parsePorcelainV2Status(porcelainWithUntracked(1_000)).files
    );
    const drawn = windowGroups(groups, { untracked: 1 });
    expect(drawn.groups.untracked).toEqual(groups.untracked.slice(0, 400));
  });

  it('treats a missing, negative or fractional window count as whole windows', () => {
    expect(rowsAllowed(undefined)).toBe(SCM_ROW_WINDOW);
    expect(rowsAllowed(0)).toBe(SCM_ROW_WINDOW);
    expect(rowsAllowed(-3)).toBe(SCM_ROW_WINDOW);
    expect(rowsAllowed(1.9)).toBe(SCM_ROW_WINDOW * 2);
    expect(rowsAllowed(Number.NaN)).toBe(SCM_ROW_WINDOW);
  });
});

describe('the section draws the window', () => {
  const source = readFileSync(
    resolve(ROOT, 'src/renderer/scm/ScmSection.tsx'),
    'utf8'
  );

  it('maps the drawn groups and never the whole list', () => {
    expect(source).toContain("from './changes-window'");
    expect(source).toContain('drawn.groups[g].map((f) => {');
    // The header's Stage all still maps the WHOLE group to its paths; the
    // row map is the one that must not.
    expect(source).not.toMatch(/(?<!drawn\.)groups\[g\]\.map\(\(f\) => \{/);
    expect(source).toContain('flattenRows(drawn.groups)');
  });

  it('draws the count line with a Show more button', () => {
    expect(source).toContain('className="scm-more-row"');
    expect(source).toContain('drawn.hidden[g] > 0');
    expect(source).toContain('showMore(s, g)');
  });
});
