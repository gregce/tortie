/**
 * Phase 228. The Search view's idle face and its waiting face are ONE face
 * each, drawn for a folder on this Mac and for a folder on a machine alike.
 *
 * THE OPERATOR'S RULE OF 2026-09-07 is that a remote tab feels almost
 * identical to a local one. Research 85 section 3.2 measured the remote view
 * while it waits, and section 3.3 counted a 34 word idle body on the remote
 * face that the local face never carried. The Phase 228 entry rules that a
 * search on a machine draws its idle sentence the way local does, and while
 * it waits draws what local draws while streaming, being the rows so far or
 * nothing rather than a header alone.
 *
 * WHAT THIS PINS, read off the real source rather than a render: the two
 * faces are each defined ONCE in src/renderer/search/ResultsList.tsx and
 * each is drawn from BOTH arms of EmptyResults, so the remote arm cannot grow
 * a body of its own without this going red; the one word the waiting face
 * says appears once in that file; and the remote arm holds no paragraph of
 * its own between the refusals and the two faces. The store half, that the
 * rows so far stay on screen while a machine is asked again, is pinned in
 * ./p98-remote-search.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../../..');
const SOURCE = readFileSync(
  resolve(ROOT, 'src/renderer/search/ResultsList.tsx'),
  'utf8'
);

/** Block and line comments out, and JSX comments with them. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
}

const CODE = withoutComments(SOURCE);

/** The body of `function EmptyResults()`, read by matching braces. */
function emptyResultsBody(): string {
  const start = CODE.indexOf('function EmptyResults(');
  expect(start).toBeGreaterThan(-1);
  const open = CODE.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CODE.length; i += 1) {
    if (CODE[i] === '{') depth += 1;
    if (CODE[i] === '}') {
      depth -= 1;
      if (depth === 0) return CODE.slice(open, i + 1);
    }
  }
  throw new Error('EmptyResults never closed');
}

describe('the scanner can fail', () => {
  it('reads a body and counts a draw', () => {
    const body = emptyResultsBody();
    expect(body.length).toBeGreaterThan(200);
    expect((body.match(/<IdleFace /g) ?? []).length).toBeGreaterThan(0);
  });
});

describe('one idle face and one waiting face', () => {
  it('are each defined once', () => {
    expect((CODE.match(/function IdleFace\(/g) ?? []).length).toBe(1);
    expect((CODE.match(/function WaitingFace\(/g) ?? []).length).toBe(1);
  });

  it('are each drawn from both arms of the empty state', () => {
    const body = emptyResultsBody();
    // The remote arm is the `if (target !== null && localPathOf(target) === null)`
    // block, and the local arm is everything after it.
    const split = body.indexOf('localPathOf(target) === null');
    expect(split).toBeGreaterThan(-1);
    const remoteArm = body.slice(split, body.indexOf('if (status === \'error\' && error !== null && !isRegex)'));
    const localArm = body.slice(remoteArm.length + split);
    for (const face of ['<IdleFace ', '<WaitingFace />']) {
      expect((remoteArm.match(new RegExp(face, 'g')) ?? []).length).toBe(1);
      expect((localArm.match(new RegExp(face, 'g')) ?? []).length).toBe(1);
    }
  });

  it('say the one waiting word once, and the idle body once', () => {
    expect((CODE.match(/Searching…/g) ?? []).length).toBe(1);
    expect((CODE.match(/Matches stream in as they are found/g) ?? []).length).toBe(1);
  });

  it('leave the remote arm no paragraph of its own beyond the refusals', () => {
    // Every <p> the remote arm draws is a refusal from presentation.ts, the
    // bridge sentence, the error pair, or the shared "No results found."
    // title, which the local arm draws too. No body text is composed there.
    const body = emptyResultsBody();
    const split = body.indexOf('localPathOf(target) === null');
    const remoteArm = body.slice(split, body.indexOf('if (status === \'error\' && error !== null && !isRegex)'));
    const bodies = remoteArm.match(/<p className="search-empty-body">([^<]*)<\/p>/g) ?? [];
    expect(bodies).toEqual(['<p className="search-empty-body">{error}</p>']);
    expect(remoteArm).not.toContain('ON_THIS_MAC');
  });
});
