#!/usr/bin/env node
/**
 * Phase 42 stage 7: the forbidden-import check.
 * Phase 124: the platform rule, and the fixtures that prove it.
 *
 * The five TypeScript projects (tsconfig.shared.json, tsconfig.main.json,
 * tsconfig.preload.json, tsconfig.web.json for production, and
 * tsconfig.tests.json for every file under a __tests__ directory) draw the
 * process boundaries, and tsc -b enforces them for the shared leaf:
 * composite projects must list every file in their program, so a shared file
 * importing main is a compile error. The tests project is the one program
 * allowed to cross a boundary, which is what lets the other four state what
 * production actually does. tsc alone does NOT forbid every direction, and a
 * future non-composite config would silently stop forbidding all of them.
 * This script is the boundary rule stated once, in one place, checked at
 * every `npm run typecheck`.
 *
 * The rules, for PRODUCTION sources only (files under __tests__/ and
 * src/test/ are exempt; e.g. the renderer agents test deliberately imports
 * the main-process registry to prove the seed list agrees with it):
 *
 *   src/shared    may import only src/shared
 *   src/preload   may import only src/preload and src/shared
 *   src/main      may import only src/main and src/shared
 *   src/renderer  may import only src/renderer and src/shared
 *
 * Two layers may not name the platform at all (Phase 124):
 *
 *   src/shared    no node builtin, no 'electron'. Shared is compiled into
 *                 both processes, so it may use only what both provide.
 *   src/renderer  no node builtin, no 'electron'. The renderer runs with no
 *                 Node integration and reaches the system over the bridge.
 *   src/main      allowed. Main is the Node process.
 *   src/preload   allowed. The preload must reach contextBridge.
 *
 * Other package imports are out of scope, with ONE exception (Phase 35,
 * research 42 §8 and §12): only src/main/log/ may import electron-log. The
 * logging framework choice is safe precisely because one module owns it, so
 * if the framework disappoints, one file changes. A second importer anywhere
 * in src/ fails typecheck here.
 *
 * No dependencies, no TypeScript parse: a line scan for the four import
 * shapes (from '...', side-effect import '...', import('...'),
 * require('...')). Exits 1 listing every violation as file:line.
 *
 * The fixture table at the bottom runs on every invocation, before any real
 * file is read, so the rules above are proved rather than asserted. It reads
 * nothing from disk and writes nothing.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const LAYERS = ['shared', 'main', 'preload', 'renderer'];
const ALLOWED = {
  shared: new Set(['shared']),
  main: new Set(['main', 'shared']),
  preload: new Set(['preload', 'shared']),
  renderer: new Set(['renderer', 'shared'])
};

/**
 * Phase 124. The layers that may not name a node builtin or 'electron', and
 * the sentence each failure prints so the reader learns the rule from the
 * failure instead of from this file.
 */
const NO_PLATFORM_ACCESS = {
  shared:
    'Shared code is compiled into both processes, so it may use only what ' +
    'both provide. Disk, processes and Electron belong to src/main.',
  renderer:
    'The renderer runs with no Node integration. Everything it needs from ' +
    'the system crosses the window.gmux bridge.'
};

const BUILTINS = new Set(builtinModules);

/** Collect every production .ts/.tsx file under src/<layer>. */
function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/** Which layer a repo-absolute path belongs to, or null. */
function layerOf(path) {
  const rel = relative(SRC, path);
  if (rel.startsWith('..')) return null;
  const first = rel.split(sep)[0];
  return LAYERS.includes(first) ? first : null;
}

/** True when the file is a test, which is exempt from every rule here. */
function isTestFile(path) {
  const parts = relative(SRC, path).split(sep);
  return parts.includes('__tests__') || parts[0] === 'test';
}

/** Resolve an import specifier from a file to a layer, or null. */
function targetLayer(fromFile, spec) {
  if (spec.startsWith('@shared/')) return 'shared';
  if (spec.startsWith('@renderer/')) return 'renderer';
  if (spec.startsWith('.')) {
    return layerOf(resolve(fromFile, '..', spec));
  }
  return null; // package or builtin: out of scope
}

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g, // import/export ... from '...'
  /^\s*import\s+['"]([^'"]+)['"]/gm, // side-effect import '...'
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('...')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g // require('...')
];

/**
 * Phase 35: the packages exactly one directory may import. The key is the
 * package name (bare, or any subpath of it); the value is the one directory
 * prefix, relative to src/, allowed to name it.
 */
const SOLE_OWNER_PACKAGES = {
  'electron-log': {
    dir: 'main/log/',
    why:
      'the logging framework is safe because ONE module owns it. A second ' +
      'importer means a framework swap is no longer one file (research 42 §8)'
  }
};

/** The package a bare specifier names, or null for a relative or alias one. */
function packageOf(spec) {
  if (spec.startsWith('.') || spec.startsWith('@shared/') || spec.startsWith('@renderer/')) {
    return null;
  }
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Phase 124. True when the specifier names the platform directly: the
 * `node:` scheme, a name node ships as a builtin, or Electron itself.
 * packageOf() already reduces electron/renderer to electron.
 */
function isPlatformSpecifier(spec) {
  if (spec.startsWith('node:')) return true;
  const pkg = packageOf(spec);
  if (pkg === null) return false;
  return BUILTINS.has(pkg) || pkg === 'electron';
}

/**
 * Every rule in this file, applied to one file's text. It returns the
 * violations and the number of specifiers it looked at. The tree walk and the
 * fixture table are the only callers, so what the fixtures prove is what the
 * repository is checked against.
 */
function violationsFor(absFile, text) {
  const out = [];
  const layer = layerOf(absFile);
  if (layer === null || isTestFile(absFile)) return { violations: out, imports: 0 };
  const relFromSrc = relative(SRC, absFile).split(sep).join('/');
  const relFromRoot = relative(ROOT, absFile);
  const seen = new Set(); // dedupe a specifier matched by two patterns
  let checked = 0;
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const spec = match[1];
      const key = `${match.index}:${spec}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checked += 1;
      const line = () => text.slice(0, match.index).split('\n').length;

      const pkg = packageOf(spec);
      const owned = pkg === null ? undefined : SOLE_OWNER_PACKAGES[pkg];
      if (owned !== undefined && !relFromSrc.startsWith(owned.dir)) {
        out.push(
          `${relFromRoot}:${line()} imports '${spec}', and only ` +
            `src/${owned.dir} may: ${owned.why}`
        );
        continue;
      }

      const why = NO_PLATFORM_ACCESS[layer];
      if (why !== undefined && isPlatformSpecifier(spec)) {
        out.push(
          `${relFromRoot}:${line()} imports '${spec}', and src/${layer} may not. ${why}`
        );
        continue;
      }

      const target = targetLayer(absFile, spec);
      if (target === null || ALLOWED[layer].has(target)) continue;
      out.push(`${relFromRoot}:${line()} src/${layer} imports src/${target} ('${spec}')`);
    }
  }
  return { violations: out, imports: checked };
}

// ---------------------------------------------------------------------------
// The fixtures. Eleven synthetic files, each one line of source, run before
// any real file is read. Nothing is written to disk and nothing is read from
// it. A row that does not behave fails the gate with a non-zero exit.
// ---------------------------------------------------------------------------

const FIXTURES = [
  ['shared/p124-fixture.ts', "import { readFileSync } from 'node:fs';", 'node:fs'],
  ['shared/p124-fixture.ts', "import { join } from 'path';", 'path'],
  ['shared/p124-fixture.ts', "import { app } from 'electron';", 'electron'],
  ['renderer/p124-fixture.ts', "import { readFileSync } from 'node:fs';", 'node:fs'],
  ['renderer/p124-fixture.tsx', "const fs = await import('node:fs');", 'node:fs'],
  ['renderer/p124-fixture.ts', "import { ipcRenderer } from 'electron';", 'electron'],
  ['renderer/p124-fixture.ts', "import { create } from 'zustand';", null],
  ['shared/p124-fixture.ts', "import type { Foo } from './foo';", null],
  ['main/p124-fixture.ts', "import { readFileSync } from 'node:fs';", null],
  ['preload/p124-fixture.ts', "import { contextBridge } from 'electron';", null],
  ['renderer/x/__tests__/p124-fixture.ts', "import { readFileSync } from 'node:fs';", null]
];

function runFixtures() {
  const failures = [];
  for (const [file, line, rejectFor] of FIXTURES) {
    const found = violationsFor(join(SRC, file), `${line}\n`).violations;
    const hit = found.some((v) => rejectFor !== null && v.includes(`'${rejectFor}'`));
    if (rejectFor !== null && !hit) {
      failures.push(
        `${file} with\n  "${line}" should have been rejected for ${rejectFor}, ` +
          `and it was not.`
      );
    }
    if (rejectFor === null && found.length > 0) {
      failures.push(`${file} with\n  "${line}" should have been accepted, and it was not.`);
    }
  }
  if (failures.length > 0) {
    console.error('FIXTURE FAILED (see build/assert-import-boundaries.mjs):');
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      '  The rule and the fixtures disagree, so the gate is not proving anything.'
    );
    process.exit(1);
  }
  return FIXTURES.length;
}

const fixturesChecked = runFixtures();

const violations = [];
let filesScanned = 0;
let importsChecked = 0;

for (const layer of LAYERS) {
  for (const file of walk(join(SRC, layer), [])) {
    filesScanned += 1;
    const found = violationsFor(file, readFileSync(file, 'utf8'));
    importsChecked += found.imports;
    violations.push(...found.violations);
  }
}

if (violations.length > 0) {
  console.error('FORBIDDEN IMPORTS (see build/assert-import-boundaries.mjs):');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(
  `import boundaries OK: ${fixturesChecked} fixtures behaved, ${filesScanned} ` +
    `production files, ${importsChecked} imports, 0 violations ` +
    `(${Object.keys(SOLE_OWNER_PACKAGES).length} sole-owner package rule, ` +
    `${Object.keys(NO_PLATFORM_ACCESS).length} layers with no platform access)`
);
