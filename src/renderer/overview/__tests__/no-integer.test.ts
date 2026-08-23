/**
 * The integer rule, made mechanical (Phase 137).
 *
 * No integer appears on any view except a clock time, a date or an elapsed
 * time. The three formatters in ../clock.ts and formatAge are the only
 * sources of digits, and the views wrap their output in data-clock,
 * data-date or data-age spans. So the view sources themselves may hold no
 * digit in any string literal or any JSX text node.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..');

const files = [
  ...readdirSync(DIR)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => join(DIR, name)),
  join(DIR, 'copy.ts')
];

/** Comments go first, so a phase number in prose cannot fail the rule. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function stringLiterals(text: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return out;
}

describe('no integer on any view', () => {
  it('scans the view sources at all', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    const name = file.split('/').pop() ?? file;
    const text = stripComments(readFileSync(file, 'utf8'));

    it(`${name} holds no digit in any string literal`, () => {
      for (const literal of stringLiterals(text)) {
        expect(literal, `"${literal}" in ${name}`).not.toMatch(/\d/);
      }
    });

    it(`${name} holds no digit in any JSX text node`, () => {
      // A JSX text node is what sits between a closing and an opening
      // bracket with no code characters in it. Braced expressions, calls
      // and attributes all carry one of the excluded characters, so a
      // digit that reaches the page as literal text is what this finds.
      const hits = text.match(/>[^<>{}();=]*\d[^<>{}();=]*</g) ?? [];
      expect(hits, `${name}: ${hits.join(' | ')}`).toHaveLength(0);
    });
  }
});
