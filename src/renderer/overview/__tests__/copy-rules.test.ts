/**
 * The two copy rules, made mechanical (Phase 137).
 *
 * The person is "you" and the agent is "the agent". Neither is ever "it".
 * The one sentence allowed to carry "it" uses it for the work git was asked
 * about, and it is whitelisted by its full text so a new sentence cannot
 * ride in on the exception.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as copy from '../copy';

const source = readFileSync(join(__dirname, '..', 'copy.ts'), 'utf8');

/**
 * Comments first (Phase 138.1), so the prose above a string may say what the
 * rule is.
 *
 * Without this a lone apostrophe in a comment, e.g. "the CLI's own notice",
 * opens a quote the scanner then closes on the next real string, and whole
 * paragraphs of comment are read as one sentence. That is how a comment
 * carrying a phase number failed the no digit rule while every string in the
 * file obeyed it.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Every quoted string in the file, template literals included. */
function stringLiterals(text: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return out;
}

/** The sentences allowed to hold the word "it", by their full text. */
const IT_WHITELIST = new Set([
  'The agent says it is done. git has no record of it',
  'Done, and git agrees'
]);

describe('every string in copy.ts', () => {
  const literals = stringLiterals(stripComments(source)).filter(
    (s) => s.length > 0
  );

  it('found the sentences at all', () => {
    expect(literals.length).toBeGreaterThan(10);
  });

  it('never calls the agent or the person "it"', () => {
    for (const text of literals) {
      if (IT_WHITELIST.has(text)) continue;
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

  it('carries no digit, because the formatters are the only digit sources', () => {
    for (const text of literals) {
      expect(text, `"${text}" holds a digit`).not.toMatch(/\d/);
    }
  });
});

describe('the two labels', () => {
  it('are exactly "you" and "the agent"', () => {
    expect(copy.YOU_LABEL).toBe('you');
    expect(copy.AGENT_LABEL).toBe('the agent');
  });

  it('compose their sentences without a pronoun for the agent', () => {
    expect(copy.sessionStoppedNotice('usage limit reached')).toBe(
      'the session stopped: usage limit reached'
    );
    expect(copy.outcomeNothingAsked('13:31')).toBe(
      'started 13:31, nothing asked yet'
    );
    expect(copy.outcomeUnreadable(null)).toBe(
      'Tortie could not read this session’s record.'
    );
    expect(copy.outcomeUnreadable('The file is locked.')).toBe(
      'Tortie could not read this session’s record. The file is locked.'
    );
    expect(copy.readAtHeader('13:31')).toBe('read 13:31');
  });
});
