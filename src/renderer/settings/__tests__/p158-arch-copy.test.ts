/**
 * The copy rules for Settings then Architecture (Phase 158), made
 * mechanical, the way p138-fold-copy.test.ts holds the Catch Me Up section.
 *
 * The person is "you". A harness is named rather than called "it". No
 * sentence holds a dash of any kind, and a colon only introduces a list. No
 * literal holds a digit, and the one number that reaches the section is the
 * measured date, which arrives from main as data.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as copy from '../arch-copy';

const source = readFileSync(join(__dirname, '..', 'arch-copy.ts'), 'utf8');

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
 * colon has in this product's copy. Both name every agent that shares a
 * reason on one line. Any OTHER colon in this file is a defect.
 */
const COLON_INTRODUCES_A_LIST = [
  'Not measured yet: ${names}.',
  'Not confirmed yet: ${names}. Confirm under Agents.'
];

describe('every sentence in arch-copy.ts', () => {
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
      expect(literals, `${text} is no longer in arch-copy.ts`).toContain(text);
    }
  });

  it('never reaches for tmux vocabulary', () => {
    for (const text of literals) {
      expect(text).not.toMatch(/\bpane\b|\bprefix\b/i);
    }
  });
});

describe('the sentences that take a value', () => {
  it('names the harness rather than calling the harness "it"', () => {
    expect(copy.archChosenUnavailable('Claude Code')).toContain('Claude Code');
    expect(copy.archChosenUnavailable('Claude Code')).not.toContain(' it ');
  });

  it('names every unmeasured agent on one line', () => {
    expect(copy.archNotMeasured('Codex, Cursor, Grok')).toBe(
      'Not measured yet: Codex, Cursor, Grok.'
    );
  });

  it('sends the unconfirmed agents to Agents on one line', () => {
    const line = copy.archNotConfirmed('A patched claude');
    expect(line).toContain('A patched claude');
    expect(line).toContain('Agents');
  });

  it('puts the measured date in a sentence of its own', () => {
    expect(copy.archMeasuredOn('2026-08-28')).toBe(
      'Tortie measured these flags on 2026-08-28.'
    );
  });

  it('calls the absence of a choice None', () => {
    expect(copy.ARCH_NONE_OPTION).toBe('None');
  });
});

describe('what the disclosure promises', () => {
  it('says the skeleton stands on its own without an agent', () => {
    expect(copy.ARCH_AGENT_CAPTION).toContain('None is the default');
    expect(copy.ARCH_AGENT_CAPTION).toContain('skeleton');
  });

  it('says the writes land in Source Control for review', () => {
    expect(copy.ARCH_ABOUT_WRITES).toContain('Source Control');
    expect(copy.ARCH_ABOUT_WRITES).toContain('review');
  });

  it('says the agent runs only on your ask, never on a change', () => {
    expect(copy.ARCH_ABOUT_BOUNDARY).toContain('only when you ask');
    expect(copy.ARCH_ABOUT_BOUNDARY).toContain('never because a file changed');
  });
});

describe('just enough words, the ruling of 2026-08-28, held mechanically', () => {
  const words = (text: string): number => text.trim().split(/\s+/).length;
  const stops = (text: string): number => (text.match(/\./g) ?? []).length;

  it('keeps every resting caption to ONE short sentence', () => {
    for (const caption of [copy.ARCH_AGENT_CAPTION, copy.ARCH_MODEL_CAPTION]) {
      expect(stops(caption), `"${caption}" is more than one sentence`).toBe(1);
      expect(words(caption), `"${caption}" runs long`).toBeLessThanOrEqual(12);
    }
  });

  it('keeps each refused line to one line', () => {
    expect(words(copy.archNotMeasured('Codex, Grok'))).toBeLessThanOrEqual(8);
    expect(
      words(copy.archNotConfirmed('Cursor CLI'))
    ).toBeLessThanOrEqual(10);
  });

  it('keeps the disclosure summary a label, not a sentence', () => {
    expect(stops(copy.ARCH_ABOUT_GROUP)).toBe(0);
    expect(words(copy.ARCH_ABOUT_GROUP)).toBeLessThanOrEqual(5);
  });
});
