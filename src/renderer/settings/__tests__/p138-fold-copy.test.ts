/**
 * The copy rules for Settings then Project line (Phase 138), made mechanical.
 *
 * The same rules the Catch Me Up page carries bind this section, because a
 * person reads the two on the same afternoon. The person is "you". A harness
 * is named rather than called "it". No sentence holds a dash of any kind, and
 * a colon only introduces a list. No literal holds a digit, and the one
 * number that reaches the section is the measured date, which arrives from
 * main as data.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as copy from '../fold-copy';

const source = readFileSync(join(__dirname, '..', 'fold-copy.ts'), 'utf8');

/** Comments first, so the prose above may say what the rule is. */
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

const literals = stringLiterals(stripComments(source)).filter(
  (s) => s.trim().length > 0
);

describe('every sentence in fold-copy.ts', () => {
  it('found the sentences at all', () => {
    expect(literals.length).toBeGreaterThan(10);
  });

  it('never calls a harness or the person "it"', () => {
    for (const text of literals) {
      expect(text, `"${text}" holds a standalone "it"`).not.toContain(' it ');
      expect(text, `"${text}" holds a standalone "it"`).not.toContain(' it.');
      expect(text, `"${text}" starts with "it"`).not.toMatch(/^it[\s.]/);
    }
  });

  it('never says I, the AI or the assistant', () => {
    for (const text of literals) {
      expect(text).not.toMatch(/\bI\b/);
      expect(text).not.toContain('the AI');
      expect(text).not.toContain('the assistant');
    }
  });

  it('holds no dash of any kind', () => {
    for (const text of literals) {
      expect(text, `"${text}" holds an em dash`).not.toContain('\u2014');
      expect(text, `"${text}" holds an en dash`).not.toContain('\u2013');
    }
  });

  it('holds no digit, because the date is the only number and comes from main', () => {
    for (const text of literals) {
      expect(text, `"${text}" holds a digit`).not.toMatch(/\d/);
    }
  });

  it('uses a colon only to introduce a list', () => {
    for (const text of literals) {
      expect(text, `"${text}" joins two clauses with a colon`).not.toMatch(
        /\w:\s/
      );
    }
  });
});

describe('the sentences that take a value', () => {
  it('names the harness rather than calling the harness "it"', () => {
    expect(copy.foldChosenUnavailable('Claude Code')).toContain('Claude Code');
    expect(copy.foldChosenUnavailable('Claude Code')).not.toContain(' it ');
  });

  it('joins a refused row to its reason with a full stop', () => {
    expect(copy.foldUnavailable('Codex', 'Tortie has not measured a recipe.'))
      .toBe('Codex. Tortie has not measured a recipe.');
  });

  it('puts the measured date in a sentence of its own', () => {
    expect(copy.foldMeasuredOn('2026-08-23')).toBe(
      'The flags behind this agent were measured on 2026-08-23.'
    );
  });

  it('calls the absence of a choice None', () => {
    expect(copy.FOLD_NONE_OPTION).toBe('None');
  });
});
