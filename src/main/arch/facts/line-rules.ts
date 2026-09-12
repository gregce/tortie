/**
 * The LINE rules (Phase 257): the three things a call site reader cannot see
 * because they are declarations rather than calls, being a program's main, a
 * test function's own name, and an environment switch read by name. Each is
 * a line scan with the line recorded, and a rule states its grammar so a rule
 * that answers for one family is reported as answering for one.
 *
 * `test.rust.fn` is the one that changed shape in the port. The prototype
 * counted any zero argument `fn` under a `tests` path AND the `#[test]`
 * attribute beside it, two facts per test. It now LOOKS BACK: a `fn` whose
 * nearest preceding attribute lines, up to three, carry a `test` attribute is
 * one fact carrying its own name, and a plain helper next to it is nothing.
 * `entrypoint.rails.application` is new, because Rails' composition root is a
 * class declaration the pair table in `./rules-entrypoint.ts` cannot express.
 *
 * STATED LIMIT: A LINE RULE SEES NO PARSE TREE. It reads a line of text, so
 * `def test_in_docstring():` inside a Python docstring is a test case and
 * `process.env.CMT_SECRET` inside a `//` comment or a string literal is an
 * environment switch (the Phase 257 fix round's hostile tree). Both are
 * faithful to the prototype the numbers were measured with, and the call
 * shaped rules, which DO read the tree, were fooled by none of those shapes.
 */

import type { ArchFactDraft } from '@shared/arch';
import { FACT_LIMITS } from './limits';
import { evidenceAt } from './rules';
import { ruleReads, type LineRule, type RuleContext } from './types';

/**
 * A test attribute is one whose PATH ends in `test`: `#[test]`,
 * `#[tokio::test]`, `#[test(flavor = …)]`. `#[cfg(test)]` does not match,
 * because `test` there is an argument and not the path's last segment, and
 * that is the whole exclusion: the Phase 257 fix round found a second clause
 * spelling it again that no ablation could turn red, and removed it.
 */
const RUST_TEST_ATTRIBUTE = /^\s*#\[[\w:]*test\b[^\]]*\]\s*$/;
const RUST_ANY_ATTRIBUTE = /^\s*#\[[^\]]*\]\s*$/;

/**
 * Is the `fn` at `index` marked by a test attribute? The nearest preceding
 * non blank lines are read while they are attribute lines, at most three of
 * them, and `#[cfg(test)]` on its own marks a module rather than a function.
 */
function rustTestAttributeAbove(lines: readonly string[], index: number): boolean {
  let read = 0;
  for (let i = index - 1; i >= 0 && read < 3; i -= 1) {
    const ln = lines[i]!;
    if (ln.trim() === '') continue;
    if (!RUST_ANY_ATTRIBUTE.test(ln)) return false;
    read += 1;
    if (RUST_TEST_ATTRIBUTE.test(ln)) return true;
  }
  return false;
}

export const LINE_RULES: readonly LineRule[] = [
  {
    id: 'entrypoint.go.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['go'],
    re: /^func\s+main\s*\(\s*\)/,
    subject: (_m, c) => `main() in ${c.file}`
  },
  {
    id: 'entrypoint.rust.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['rust'],
    re: /^(?:#\[\w+\]\s*)?(?:pub\s+)?(?:async\s+)?fn\s+main\s*\(/,
    subject: (_m, c) => `main() in ${c.file}`
  },
  {
    id: 'entrypoint.python.dunder-main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['python'],
    re: /^if\s+__name__\s*==\s*["']__main__["']/,
    subject: (_m, c) => `__main__ in ${c.file}`
  },
  {
    id: 'entrypoint.swift.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['swift'],
    re: /^\s*@main\b/,
    subject: (_m, c) => `@main in ${c.file}`
  },
  {
    id: 'entrypoint.rails.application',
    category: 'entrypoint',
    kind: 'composition-root',
    langs: ['ruby'],
    re: /^\s*class\s+(\w+)\s*<\s*Rails::Application\b/,
    subject: (m) => `composes ${m[1]} < Rails::Application`
  },
  {
    id: 'test.go.func',
    category: 'test',
    kind: 'test-case',
    langs: ['go'],
    re: /^func\s+(Test|Benchmark|Fuzz|Example)([A-Z]\w*)\s*\(/,
    subject: (m) => `${m[1]} ${m[2]}`
  },
  {
    id: 'test.python.def',
    category: 'test',
    kind: 'test-case',
    langs: ['python'],
    re: /^\s*(?:async\s+)?def\s+(test_\w+)\s*\(/,
    subject: (m) => `test ${m[1]}`
  },
  {
    id: 'test.rust.fn',
    category: 'test',
    kind: 'test-case',
    langs: ['rust'],
    re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)\s*\(/,
    subject: (m, _c, lines, index) => (rustTestAttributeAbove(lines, index) ? `test fn ${m[1]}` : null)
  },
  {
    id: 'test.swift.xctest',
    category: 'test',
    kind: 'test-case',
    langs: ['swift'],
    re: /^\s*(?:final\s+)?class\s+(\w+)\s*:\s*XCTestCase/,
    subject: (m) => `XCTestCase ${m[1]}`
  },
  {
    id: 'test.swift.func',
    category: 'test',
    kind: 'test-case',
    langs: ['swift'],
    re: /^\s*func\s+(test\w+)\s*\(/,
    subject: (m) => `test ${m[1]}`
  },
  {
    id: 'test.ruby.def',
    category: 'test',
    kind: 'test-case',
    langs: ['ruby'],
    re: /^\s*def\s+(test_\w+)/,
    subject: (m) => `test ${m[1]}`
  },
  {
    id: 'gate.env-read',
    category: 'gate',
    kind: 'flag',
    langs: '*',
    re: /(process\.env\.([A-Z][A-Z0-9_]{2,})|os\.environ(?:\.get)?\[?['"]([A-Z][A-Z0-9_]{2,})|std::env::var\(\s*"([A-Z][A-Z0-9_]{2,})"|os\.Getenv\(\s*"([A-Z][A-Z0-9_]{2,})"|ENV\[['"]([A-Z][A-Z0-9_]{2,})|getenv\(\s*['"]([A-Z][A-Z0-9_]{2,}))/,
    subject: (m) => {
      const name = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? m[7];
      return name ? `environment switch ${name}` : null;
    }
  }
];

/** Every fact the line rules yield for one file. One per (rule, subject). */
export function applyLineRules(ctx: RuleContext, lines: readonly string[]): ArchFactDraft[] {
  const out: ArchFactDraft[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i]!;
    if (ln.length > FACT_LIMITS.maxLine) continue;
    for (const r of LINE_RULES) {
      if (!ruleReads(r.langs, ctx.lang)) continue;
      const m = r.re.exec(ln);
      if (m === null) continue;
      const subject = r.subject(m, ctx, lines, i);
      if (subject === null) continue;
      const draft: ArchFactDraft = {
        category: r.category,
        kind: r.kind,
        subject: subject.slice(0, FACT_LIMITS.maxSubject),
        line: i + 1,
        rule: r.id,
        evidence: evidenceAt(lines, i + 1)
      };
      const key = `${r.id}|${draft.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(draft);
    }
  }
  return out;
}
