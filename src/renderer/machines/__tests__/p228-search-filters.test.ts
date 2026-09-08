/**
 * Phase 228. The three search filters that do not reach a machine are three
 * disabled controls with one short title each.
 *
 * Until this phase the include field, the exclude field and the ignore files
 * toggle all carried the same 34 word paragraph as their title on a tab whose
 * folder is on a machine, and the same paragraph was the idle body of the
 * Search view, read before a person typed anything. The operator's rule of
 * 2026-09-07 is that a remote tab feels almost identical to a local one, and a
 * limit that is genuinely different is a disabled control with at most one
 * short label. This pins the three labels, that they are labels rather than
 * sentences, and that src/renderer/search/QueryBlock.tsx is the one place
 * that draws them, each on its own control.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SEARCH_EXCLUDE_ON_THIS_MAC,
  SEARCH_IGNORE_ON_THIS_MAC,
  SEARCH_INCLUDE_ON_THIS_MAC
} from '../search';
import { namesIdentifier } from './p228-off-the-face.test';

const ROOT = resolve(import.meta.dirname, '../../../..');
const QUERY_BLOCK = readFileSync(
  resolve(ROOT, 'src/renderer/search/QueryBlock.tsx'),
  'utf8'
);

const LABELS = [
  ['SEARCH_INCLUDE_ON_THIS_MAC', SEARCH_INCLUDE_ON_THIS_MAC],
  ['SEARCH_EXCLUDE_ON_THIS_MAC', SEARCH_EXCLUDE_ON_THIS_MAC],
  ['SEARCH_IGNORE_ON_THIS_MAC', SEARCH_IGNORE_ON_THIS_MAC]
] as const;

describe('the three labels', () => {
  it('say which control works on this Mac only, and nothing more', () => {
    expect(SEARCH_INCLUDE_ON_THIS_MAC).toBe('Include filters work on this Mac only');
    expect(SEARCH_EXCLUDE_ON_THIS_MAC).toBe('Exclude filters work on this Mac only');
    expect(SEARCH_IGNORE_ON_THIS_MAC).toBe(
      'The ignore files toggle works on this Mac only'
    );
  });

  it('are short labels rather than sentences', () => {
    for (const [, label] of LABELS) {
      expect(label.split(/\s+/).length).toBeLessThanOrEqual(10);
      expect(label.endsWith('.')).toBe(false);
      expect(label).not.toMatch(/[—–:]/);
    }
    // Three different controls, three different labels.
    expect(new Set(LABELS.map(([, label]) => label)).size).toBe(3);
  });
});

describe('where they are drawn', () => {
  // The raw text and not the comment stripped one: the include field's
  // placeholder is "src/**, *.ts", which a plain comment scan reads as the
  // start of a block comment, and no comment in that file names a label.
  const code = QUERY_BLOCK;

  it('is the query block, each on exactly one control', () => {
    for (const [name] of LABELS) {
      expect(namesIdentifier(QUERY_BLOCK, name)).toBe(true);
      // One import and one use.
      expect(code.match(new RegExp(`\\b${name}\\b`, 'g'))?.length).toBe(2);
    }
  });

  it('is a title on a disabled control, never a paragraph', () => {
    for (const [name] of LABELS) {
      expect(code).toMatch(new RegExp(`title=\\{\\s*onMachine\\s*\\?\\s*${name}\\b`));
      expect(code).not.toMatch(new RegExp(`<p[^>]*>\\{${name}\\}`));
    }
    expect(code.match(/disabled=\{onMachine\}/g)?.length).toBe(3);
  });
});
