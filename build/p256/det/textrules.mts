/**
 * Phase 256 prototype — the LINE rules.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 * Three things a call-site reader cannot see, because they are declarations
 * rather than calls: a program's main, a test function's own name, and a
 * guard written as a bare `if`. Each is a line scan with the line recorded.
 * A line rule states its language family; a rule that answers for one family
 * is reported as answering for one.
 */

import type { Fact } from './rules.mts';

interface LineRule {
  id: string;
  category: Fact['category'];
  kind: string;
  langs: readonly string[];
  re: RegExp;
  subject: (m: RegExpExecArray, rel: string) => string | null;
}

const LINE_RULES: readonly LineRule[] = [
  {
    id: 'entrypoint.go.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['go'],
    re: /^func\s+main\s*\(\s*\)/,
    subject: (_m, rel) => `main() in ${rel}`
  },
  {
    id: 'entrypoint.rust.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['rust'],
    re: /^(?:#\[\w+\]\s*)?(?:pub\s+)?(?:async\s+)?fn\s+main\s*\(/,
    subject: (_m, rel) => `main() in ${rel}`
  },
  {
    id: 'entrypoint.python.dunder-main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['python'],
    re: /^if\s+__name__\s*==\s*["']__main__["']/,
    subject: (_m, rel) => `__main__ in ${rel}`
  },
  {
    id: 'entrypoint.jvm.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['java', 'kotlin'],
    re: /(public\s+static\s+void\s+main\s*\(|^fun\s+main\s*\()/,
    subject: (_m, rel) => `main() in ${rel}`
  },
  {
    id: 'entrypoint.swift.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['swift'],
    re: /^\s*@main\b/,
    subject: (_m, rel) => `@main in ${rel}`
  },
  {
    id: 'entrypoint.objc.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['objc'],
    re: /^\s*int\s+main\s*\(/,
    subject: (_m, rel) => `main() in ${rel}`
  },
  {
    id: 'entrypoint.php.main',
    category: 'entrypoint',
    kind: 'main',
    langs: ['php'],
    re: /^\s*require(?:_once)?\s+__DIR__\s*\.\s*['"]\/(?:\.\.\/)*vendor\/autoload/,
    subject: (_m, rel) => `front controller ${rel}`
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
    re: /^\s*(?:async\s+)?fn\s+(\w+)\s*\(\s*\)/,
    subject: (m, rel) => (/tests?\b|_test\b/.test(rel) ? `test fn ${m[1]}` : null)
  },
  {
    id: 'test.jvm.class',
    category: 'test',
    kind: 'test-case',
    langs: ['java', 'kotlin'],
    re: /^\s*(?:public\s+)?(?:final\s+)?class\s+(\w*Tests?)\b/,
    subject: (m) => `test class ${m[1]}`
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
    id: 'test.php.method',
    category: 'test',
    kind: 'test-case',
    langs: ['php'],
    re: /^\s*public\s+function\s+(test\w+)\s*\(/,
    subject: (m) => `test ${m[1]}`
  },
  {
    id: 'gate.env-read',
    category: 'gate',
    kind: 'flag',
    langs: '*' as unknown as readonly string[],
    re: /(process\.env\.([A-Z][A-Z0-9_]{2,})|os\.environ(?:\.get)?\[?['"]([A-Z][A-Z0-9_]{2,})|std::env::var\(\s*"([A-Z][A-Z0-9_]{2,})"|os\.Getenv\(\s*"([A-Z][A-Z0-9_]{2,})"|ENV\[['"]([A-Z][A-Z0-9_]{2,})|getenv\(\s*['"]([A-Z][A-Z0-9_]{2,}))/,
    subject: (m) => {
      const name = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? m[7];
      return name ? `environment switch ${name}` : null;
    }
  },
  {
    id: 'gate.refusal-guard',
    category: 'gate',
    kind: 'guard',
    langs: '*' as unknown as readonly string[],
    re: /^\s*(?:if|unless|guard)\s*[({]?\s*!?[\w.()\[\]'"\s]{1,60}(?:===?\s*(?:false|null|nil|undefined)|\bis\s+None|\.is_empty\(\)|==\s*nil)?\s*[)}]?\s*(?:\{)?\s*(?:then\s*)?$/,
    subject: () => null // placeholder: measured as unusable, see notes
  }
];

export function applyTextRules(rel: string, lang: string, lines: readonly string[]): Fact[] {
  const out: Fact[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i];
    if (ln.length > 600) continue;
    for (const r of LINE_RULES) {
      const langs = r.langs as readonly string[] | '*';
      if (langs !== '*' && !(langs as readonly string[]).includes(lang)) continue;
      const m = r.re.exec(ln);
      if (m === null) continue;
      const subject = r.subject(m, rel);
      if (subject === null) continue;
      const key = `${r.id}|${subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        category: r.category,
        kind: r.kind,
        subject,
        file: rel,
        line: i + 1,
        rule: r.id,
        lang,
        evidence: ln.trim().slice(0, 200)
      });
    }
  }
  return out;
}

/**
 * Entrypoints and library roots a PATH alone establishes. Convention, and
 * labelled as such: the fact's rule id says `by-name`, so a reader knows the
 * evidence is the filename rather than anything in it.
 */
export function pathFacts(rel: string): Fact[] {
  const out: Fact[] = [];
  const base = rel.split('/').pop()!;
  const add = (category: Fact['category'], kind: string, subject: string, rule: string) =>
    out.push({ category, kind, subject, file: rel, line: 1, rule, lang: 'path', evidence: rel });
  if (/^(src\/)?(main|index|app|server|cli|bin|__main__)\.(ts|tsx|js|mjs|cjs|py|rs|go|rb|swift|kt|java|php|cs|m)$/.test(rel)) {
    add('entrypoint', 'by-name', `entry file ${rel}`, 'entrypoint.path.by-name');
  }
  if (/^(cmd|bin)\//.test(rel) && /\.(go|rs|ts|js|py|rb)$/.test(base)) {
    add('entrypoint', 'by-name', `command file ${rel}`, 'entrypoint.path.cmd-dir');
  }
  if (base === 'lib.rs' || base === 'mod.rs' || base === '__init__.py' || base === 'index.ts') {
    add('boundary', 'module-root', `module root ${rel}`, 'boundary.path.module-root');
  }
  if (/(^|\/)(migrations?|db\/migrate)\//.test(rel)) {
    add('store', 'migration', `migration ${rel}`, 'store.path.migration');
  }
  return out;
}
