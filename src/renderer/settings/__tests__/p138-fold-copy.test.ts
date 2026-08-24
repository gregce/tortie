/**
 * The copy rules for Settings then Catch Me Up (Phase 138), made mechanical.
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

/**
 * The two sentences where a colon introduces a list, which is the one job a
 * colon has in this product's copy (Phase 138.1). Both name every agent that
 * shares a reason on one line, in place of the paragraph per agent Phase 138
 * drew. Any OTHER colon in this file is still a defect.
 */
const COLON_INTRODUCES_A_LIST = [
  'Not measured yet: ${names}.',
  'Not confirmed yet: ${names}. Confirm what each one runs under Agents.'
];

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
      if (COLON_INTRODUCES_A_LIST.includes(text)) continue;
      expect(text, `"${text}" joins two clauses with a colon`).not.toMatch(
        /\w:\s/
      );
    }
  });

  it('names both list sentences, so the exception cannot rot', () => {
    for (const text of COLON_INTRODUCES_A_LIST) {
      expect(literals, `${text} is no longer in fold-copy.ts`).toContain(text);
    }
  });
});

describe('the sentences that take a value', () => {
  it('names the harness rather than calling the harness "it"', () => {
    expect(copy.foldChosenUnavailable('Claude Code')).toContain('Claude Code');
    expect(copy.foldChosenUnavailable('Claude Code')).not.toContain(' it ');
  });

  // Phase 138.1. The unmeasured agents are named TOGETHER on one line. Phase
  // 138 drew one paragraph per agent here, ten of them on the operator's Mac,
  // and he said the page looked like trash.
  it('names every unmeasured agent on one line', () => {
    expect(copy.foldNotMeasured('Codex, Cursor, Grok')).toBe(
      'Not measured yet: Codex, Cursor, Grok.'
    );
  });

  it('sends the unconfirmed agents to Agents on one line', () => {
    const line = copy.foldNotConfirmed('A patched claude');
    expect(line).toContain('A patched claude');
    expect(line).toContain('Agents');
  });

  it('puts the measured date in a sentence of its own', () => {
    expect(copy.foldMeasuredOn('2026-08-23')).toBe(
      'Tortie measured these flags on 2026-08-23.'
    );
  });

  it('reads the chord rather than typing one', () => {
    expect(copy.foldAboutOpen('⇧⌘U')).toContain('⇧⌘U');
    expect(copy.foldAboutOpen('⇧⌘U')).toContain('View menu');
  });

  it('calls the absence of a choice None', () => {
    expect(copy.FOLD_NONE_OPTION).toBe('None');
  });
});
