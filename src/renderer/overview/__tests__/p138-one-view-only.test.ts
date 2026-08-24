/**
 * The model writes on ONE view and no other (Phase 138).
 *
 * This is the entry's strongest refusal seen from the renderer's side. The
 * one session view and the multiplexed view are re-read from the store and
 * stay verbatim, so the words a person reads closely can never be wrong.
 *
 * Main holds the same refusal from the other side, by filling
 * `OverviewSessionView.summary` only on the overview:project payload and
 * leaving it null on overview:sessions. This test holds the renderer half:
 * `ProjectLines.tsx` and `line.ts` are the only files under this directory
 * that name the field at all. A later round that draws a written sentence on
 * the conversation view fails here before anybody has to notice by reading.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..');

/** The two files allowed to name the written sentence. */
const ALLOWED = new Set(['ProjectLines.tsx', 'line.ts']);

const files = readdirSync(DIR).filter(
  (name) => name.endsWith('.ts') || name.endsWith('.tsx')
);

/** Comments first, so the prose above may say what the rule is. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('the written sentence reaches one view', () => {
  it('scans the surface at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const name of files) {
    if (ALLOWED.has(name)) continue;
    it(`${name} never names the written sentence`, () => {
      const text = stripComments(readFileSync(join(DIR, name), 'utf8'));
      expect(text, `${name} reads session.summary`).not.toMatch(
        /\.summary\b/
      );
      expect(text, `${name} names the summary field`).not.toMatch(
        /\bsummary\s*[:?]/
      );
    });
  }

  it('ProjectLines.tsx is the only view that reads the field', () => {
    const text = stripComments(
      readFileSync(join(DIR, 'ProjectLines.tsx'), 'utf8')
    );
    expect(text).toMatch(/session\.summary/);
  });
});
