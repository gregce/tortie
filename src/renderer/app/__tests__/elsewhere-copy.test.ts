/**
 * Phase 90.1. The sentences the sidebars say when the project they follow is on
 * another machine.
 *
 * PHASE 90.3 TOOK THE FILES PAIR OFF THIS TEST, and the reason is the phase.
 * Those two said "Tortie reads files on this Mac only, so nothing is listed
 * here", and the Explorer now lists that machine's own rows, so the sentence
 * had become false. What the Explorer says instead is pinned in
 * ./p903-c-remote-copy.test.ts. The Search and Context pairs are unchanged,
 * because neither of those two reads another machine.
 *
 * The strings are pinned here because two builders write against them and
 * because a person reads them. The vocabulary audit next door already covers
 * the forbidden words in this file. This test covers two things that audit
 * cannot judge. The first is the exact wording. The second is the house
 * writing rules, being no dash of either kind and no colon that is not
 * introducing a list.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONTEXT_ELSEWHERE_BODY,
  contextElsewhereTitle,
  SEARCH_ELSEWHERE_BODY,
  searchElsewhereTitle
} from '../machine-copy';

const ROOT = resolve(import.meta.dirname, '../../../..');

/**
 * Every string and template literal left after comments and module paths are
 * removed. It is the same reading the vocabulary audit next door performs. The
 * two helpers are repeated rather than imported, because importing a test file
 * from a test file registers its cases twice.
 */
function copyLiteralsOf(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const withoutPaths = withoutComments
    .split('\n')
    .filter((line) => !/^\s*(import|export)\b.*['"`]/.test(line))
    .join('\n');
  return (
    withoutPaths.match(
      /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g
    ) ?? []
  );
}

describe('the four sentences', () => {
  it('says what Search draws', () => {
    expect(searchElsewhereTitle('Studio')).toBe(
      'Search does not reach Studio.'
    );
    expect(SEARCH_ELSEWHERE_BODY).toBe(
      'Tortie searches files on this Mac only. The files in this project are ' +
        'on that machine, so there is nothing here to search.'
    );
  });

  it('says what Context draws', () => {
    expect(contextElsewhereTitle('Studio')).toBe(
      'These agent files live on Studio.'
    );
    expect(CONTEXT_ELSEWHERE_BODY).toBe(
      'Tortie reads skills, servers and hooks from this Mac only, so nothing ' +
        'is listed here.'
    );
  });
});

describe('the writing rules, over every sentence in machine-copy.ts', () => {
  const source = readFileSync(
    resolve(ROOT, 'src/renderer/app/machine-copy.ts'),
    'utf8'
  );
  const literals = copyLiteralsOf(source);

  it('reads a set of sentences rather than nothing', () => {
    expect(literals.length).toBeGreaterThan(20);
  });

  it('holds no em dash and no en dash', () => {
    const offenders = literals.filter(
      (one) => one.includes('—') || one.includes('–')
    );
    expect(offenders).toEqual([]);
  });

  it('uses no colon in any of the four sentences', () => {
    // The whole file is not swept for a colon, because one literal in it is a
    // clock time and a clock time is not punctuation. These four introduce no
    // list, so none of them may hold one.
    const four = [
      searchElsewhereTitle('Studio'),
      SEARCH_ELSEWHERE_BODY,
      contextElsewhereTitle('Studio'),
      CONTEXT_ELSEWHERE_BODY
    ];
    expect(four.filter((one) => one.includes(':'))).toEqual([]);
    // Each one is a complete sentence and ends in a full stop.
    expect(four.filter((one) => !one.endsWith('.'))).toEqual([]);
  });
});
