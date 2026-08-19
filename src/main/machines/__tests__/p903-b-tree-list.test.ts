/**
 * One folder tree on another machine, read in one call (Phase 90.3).
 *
 * The parse and the two pure helpers are tested for real. The read itself
 * crosses to another computer, and a mocked spawn would prove the mock, so the
 * live listing is driven in `GMUX_SMOKE=remote-sessions` against a scratch
 * machine and by `node build/probe-remote-tree.mjs` against a real one.
 *
 * The parse is the part that matters. A wrong answer here is an Explorer that
 * draws a file as a folder, or a folder that is really there reported missing.
 */

import { describe, expect, it } from 'vitest';
import {
  REMOTE_TREE_TIMEOUT_MS,
  clampTreeDepth,
  entryOfLine,
  parseTreeList
} from '../tree-list';
import { REMOTE_SCRIPTS } from '../remote-scripts';

describe('reading what the machine printed', () => {
  it('reads the count, the root and the lines', () => {
    const answer = parseTreeList(
      'ok 3 /Users/gdc/gmux\n/Users/gdc/gmux/src/\n/Users/gdc/gmux/README.md'
    );
    expect(answer).toEqual({
      status: 'ok',
      root: '/Users/gdc/gmux',
      total: 3,
      lines: ['/Users/gdc/gmux/src/', '/Users/gdc/gmux/README.md']
    });
  });

  it('keeps a root whose name holds a space, because it is the rest of the line', () => {
    const answer = parseTreeList('ok 1 /Users/gdc/my work\n/Users/gdc/my work/a.txt');
    expect(answer?.root).toBe('/Users/gdc/my work');
    expect(answer?.lines).toEqual(['/Users/gdc/my work/a.txt']);
  });

  it('DROPS a line that does not begin with the root', () => {
    // This is the shape a file whose name holds a newline arrives in. The
    // second half is not under the root, so it never reaches a surface.
    const answer = parseTreeList(
      'ok 2 /root\n/root/first\nsecond-half-of-a-newline-name'
    );
    expect(answer?.lines).toEqual(['/root/first']);
  });

  it('drops a line that is the root itself', () => {
    const answer = parseTreeList('ok 1 /root\n/root\n/root/a');
    expect(answer?.lines).toEqual(['/root/a']);
  });

  it('reads the three refusals with the path last', () => {
    expect(parseTreeList('missing /a/b c')).toEqual({
      status: 'missing',
      root: '/a/b c',
      total: 0,
      lines: []
    });
    expect(parseTreeList('notdir /a/f.txt')?.status).toBe('notdir');
    expect(parseTreeList('denied /a')?.status).toBe('denied');
  });

  it('refuses a payload it does not recognise rather than guessing', () => {
    expect(parseTreeList('')).toBeNull();
    expect(parseTreeList('whatever /a')).toBeNull();
    expect(parseTreeList('ok /a')).toBeNull();
    expect(parseTreeList('ok x /a')).toBeNull();
    // A root that is not absolute cannot be a folder on that machine.
    expect(parseTreeList('ok 1 relative/path\nrelative/path/a')).toBeNull();
  });

  it('never reports a total smaller than what arrived', () => {
    const answer = parseTreeList('ok 0 /root\n/root/a\n/root/b');
    expect(answer?.total).toBe(2);
  });
});

describe('one line into one entry', () => {
  it('reads a trailing slash as a directory and strips it', () => {
    expect(entryOfLine('/root/src/')).toEqual({ path: '/root/src', kind: 'dir' });
  });

  it('reads everything else as a file', () => {
    expect(entryOfLine('/root/a.ts')).toEqual({ path: '/root/a.ts', kind: 'file' });
  });
});

describe('how deep a caller may ask', () => {
  it('defaults to the shipped depth', () => {
    expect(clampTreeDepth(undefined)).toBe(3);
    expect(clampTreeDepth(Number.NaN)).toBe(3);
  });

  it('refuses a depth under one, because zero prints only the root', () => {
    expect(clampTreeDepth(0)).toBe(1);
    expect(clampTreeDepth(-4)).toBe(1);
  });

  it('caps the walk, so no defect can ask a machine to read to the bottom', () => {
    expect(clampTreeDepth(9)).toBe(8);
    expect(clampTreeDepth(10_000)).toBe(8);
  });
});

describe('the deadline and the script it belongs to', () => {
  it('is a deadline rather than an expectation', () => {
    expect(REMOTE_TREE_TIMEOUT_MS).toBe(20_000);
  });

  it('the catalogue holds tree-list as a read taking three values', () => {
    const row = REMOTE_SCRIPTS.find((one) => one.id === 'tree-list');
    expect(row?.mode).toBe('read');
    expect(row?.params).toBe(3);
  });

  it('the script prunes .git and names no git verb', () => {
    const row = REMOTE_SCRIPTS.find((one) => one.id === 'tree-list');
    expect(row?.text).toContain('-name ".git" -prune');
    expect(/git (?:--no-pager )?[a-z-]+/.test(row?.text ?? '')).toBe(false);
  });

  it('review-file refuses a path that climbs, before it uses it', () => {
    const row = REMOTE_SCRIPTS.find((one) => one.id === 'review-file');
    const lines = (row?.text ?? '').split('\n');
    const guardAt = lines.findIndex((line) => line.startsWith('case '));
    expect(lines[guardAt]).toBe('case "$2" in /*|*..*) exit 1;; esac');
    expect(guardAt).toBeLessThan(
      lines.findIndex((line) => line.includes('$2') && !line.startsWith('case '))
    );
  });
});
