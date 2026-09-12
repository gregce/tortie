/**
 * The ⌘T name selection race (Phase 261, item 3).
 *
 * WHAT THIS PINS AND WHY IT IS NOT A RENDER TEST. This tree's vitest
 * environment is `node` (vitest.config.ts), so there is no DOM to render the
 * sheet into and no painted frame to read a selection off. The DOM evidence is
 * the app run, `build/p261/probe-p261-cmdt.mjs`, which reads
 * `selectionStart`/`selectionEnd` off `#session-name` on every animation frame
 * of an open and fails the open if any frame carries the committed prefill
 * unselected. That is the stated limit of this file.
 *
 * What IS pinnable here is the rule and the shape:
 *
 *  - `shouldSelectName`'s truth table, including the exact race case. The
 *    defect was `requestAnimationFrame(() => nameRef.current?.select())`
 *    scheduled from the same passive effect that calls `setName`, so the frame
 *    could fire before the commit that carries the prefill and `select()` ran
 *    against the DOM's PREVIOUS value. `domValue === name` is that question
 *    asked of the DOM instead of assumed;
 *  - that the selection lives inside a `useLayoutEffect`. A passive effect or
 *    a frame callback would put the race straight back, and neither the truth
 *    table nor any other test in this tree would notice. Read by matching
 *    braces rather than by searching the file for the word, so a
 *    `useLayoutEffect` elsewhere in the file cannot stand in for this one;
 *  - that nothing in the file hands `nameRef` to a `requestAnimationFrame`
 *    again.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldSelectName } from '../CreateSessionModal';

const SOURCE = readFileSync(
  join(__dirname, '..', 'CreateSessionModal.tsx'),
  'utf8'
);

/**
 * The body of the first `useLayoutEffect(` in the source, by matching braces
 * from the first `{` after it. A search for a word would pass on a comment.
 */
function layoutEffectBody(source: string): string {
  const at = source.indexOf('useLayoutEffect(');
  if (at < 0) return '';
  const open = source.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

describe('shouldSelectName', () => {
  it('selects once the DOM carries the prefilled name', () => {
    expect(shouldSelectName(true, false, 'claude-1', 'claude-1')).toBe(true);
  });

  it('is FALSE on the commit before the prefill lands, which is the race', () => {
    // `open` turned true in this commit; `setName` is scheduled and the input
    // still holds the previous opening's value. A frame callback fired here
    // selected `shell-3` and the person then saw `claude-1` unselected.
    expect(shouldSelectName(true, false, 'shell-3', 'claude-1')).toBe(false);
    // The first opening of the sheet: the input is empty.
    expect(shouldSelectName(true, false, '', 'claude-1')).toBe(false);
  });

  it('refuses once the person has typed', () => {
    expect(shouldSelectName(true, true, 'my-name', 'my-name')).toBe(false);
  });

  it('refuses an empty name, because there is nothing to select', () => {
    expect(shouldSelectName(true, false, '', '')).toBe(false);
  });

  it('refuses while the sheet is shut', () => {
    expect(shouldSelectName(false, false, 'claude-1', 'claude-1')).toBe(false);
  });
});

describe('where the selection lives', () => {
  it('is inside a useLayoutEffect, not a frame callback', () => {
    const body = layoutEffectBody(SOURCE);
    expect(body).not.toBe('');
    expect(body).toContain('shouldSelectName(');
    expect(body).toContain('.select()');
  });

  it('hands nameRef to no requestAnimationFrame anywhere in the file', () => {
    const frames = SOURCE.split('\n').filter(
      (line) => line.includes('requestAnimationFrame') && line.includes('nameRef')
    );
    expect(frames).toEqual([]);
  });

  it('selects the name in exactly one place', () => {
    const calls = SOURCE.match(/\.select\(\)/g) ?? [];
    expect(calls.length).toBe(1);
  });
});
