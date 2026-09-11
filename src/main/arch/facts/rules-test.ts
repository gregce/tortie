/**
 * The TEST rules that are call shaped (Phase 257): a test case declared by
 * calling `it`/`test`/`describe` in a test path, 96% (52 of 54), and swift's
 * `@Test` attribute. ONE FACT PER TEST is the rule of this family. Rust's
 * `#[test]` is read by the line rule `test.rust.fn` with a look back, so a
 * test fn is one fact carrying its own name rather than an attribute fact
 * beside a function fact; python's `@pytest.mark.parametrize` is not counted
 * because `test.python.def` already counts the function under it.
 */

import type { FactRule } from './types';
import { isAnnotation, isTestPath } from './predicates';

export const TEST_RULES: readonly FactRule[] = [
  {
    id: 'test.case.call',
    category: 'test',
    kind: 'test-case',
    langs: '*',
    match: (s, c) => {
      if (!isTestPath(c.file)) return null;
      if (!/^(it|test|describe|context|Describe|Context|It|scenario|given)$/.test(s.last)) return null;
      const n = s.args[0];
      if (n === undefined || n.length === 0) return null;
      return `${s.last} "${n.slice(0, 90)}"`;
    }
  },
  {
    id: 'test.case.attribute',
    category: 'test',
    kind: 'test-case',
    langs: ['swift'],
    match: (s) => {
      if (!isAnnotation(s.form)) return null;
      if (s.last !== 'Test' || s.recv !== '') return null;
      return `test attribute @${s.callee.slice(0, 60)}`;
    }
  }
];
