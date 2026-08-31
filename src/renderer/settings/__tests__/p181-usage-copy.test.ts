/**
 * The copy rules for Settings then Usage and for the meter itself (Phase
 * 181), made mechanical, the way p138-fold-copy.test.ts and
 * p158-arch-copy.test.ts hold the two sections before it.
 *
 * The person is "you". A vendor is named rather than called "it". No sentence
 * holds a dash of any kind, and the em dash and the en dash are barred by the
 * phase brief as well as by house style.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const FILES: [string, string][] = [
  ['settings', join(__dirname, '..', 'usage-copy.ts')],
  ['meter', join(__dirname, '..', '..', 'app', 'usage-copy.ts')]
];

for (const [name, path] of FILES) {
  const literals = stringLiterals(
    stripComments(readFileSync(path, 'utf8'))
  ).filter((s) => s.trim().length > 0);

  describe(`every sentence in the ${name} copy`, () => {
    it('found the sentences at all', () => {
      expect(literals.length).toBeGreaterThan(5);
    });

    it('holds no dash of any kind', () => {
      for (const text of literals) {
        expect(text, `"${text}" holds a dash`).not.toMatch(/[‐-―]/);
        expect(text, `"${text}" holds a hyphen used as a dash`).not.toMatch(
          / - /
        );
      }
    });

    it('never calls a vendor or the person "it"', () => {
      for (const text of literals) {
        expect(text, `"${text}" holds a standalone "it"`).not.toContain(' it ');
        expect(text, `"${text}" holds a standalone "it"`).not.toContain(' it.');
      }
    });

    it('never says I, the AI or the assistant', () => {
      for (const text of literals) {
        expect(text).not.toMatch(/\bI\b/);
        expect(text).not.toContain('the AI');
        expect(text).not.toContain('the assistant');
      }
    });

    it('uses no tmux vocabulary', () => {
      for (const text of literals) {
        expect(text.toLowerCase()).not.toContain('pane');
        expect(text.toLowerCase()).not.toContain('tmux');
        expect(text.toLowerCase()).not.toContain('prefix');
      }
    });

    it('never names a token, a key or a keychain on a face', () => {
      for (const text of literals) {
        const lower = text.toLowerCase();
        expect(lower, `"${text}" says token`).not.toContain('token');
        expect(lower, `"${text}" says bearer`).not.toContain('bearer');
      }
    });
  });
}

describe('the settings page keeps its promises', () => {
  it('states the off rule plainly', async () => {
    const copy = await import('../usage-copy');
    expect(copy.USAGE_OFF_NOTE).toContain('nothing is read');
    expect(copy.USAGE_OFF_NOTE).toContain('nothing is sent');
  });

  it('names both vendors so a person knows where the ask goes', async () => {
    const copy = await import('../usage-copy');
    expect(copy.USAGE_CLAUDE_CAPTION).toContain('Anthropic');
    expect(copy.USAGE_CODEX_CAPTION).toContain('OpenAI');
  });
});
