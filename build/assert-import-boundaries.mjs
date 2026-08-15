#!/usr/bin/env node
/**
 * Phase 42 stage 7: the forbidden-import check.
 *
 * The four TypeScript projects (tsconfig.shared.json, tsconfig.main.json,
 * tsconfig.preload.json, tsconfig.web.json) draw the process boundaries, and
 * tsc -b enforces them for the shared leaf: composite projects must list
 * every file in their program, so a shared file importing main is a compile
 * error. tsc alone does NOT forbid the other directions for test files, and
 * a future non-composite config would silently stop forbidding all of them.
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
 * Package and node builtin imports are out of scope, with ONE exception
 * (Phase 35, research 42 §8 and §12): only src/main/log/ may import
 * electron-log. The logging framework choice is safe precisely because one
 * module owns it, so if the framework disappoints, one file changes. A
 * second importer anywhere in src/ fails typecheck here.
 *
 * No dependencies, no TypeScript parse: a line scan for the four import
 * shapes (from '...', side-effect import '...', import('...'),
 * require('...')). Exits 1 listing every violation as file:line.
 */
import { readdirSync, readFileSync } from 'node:fs';
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

const violations = [];
let filesScanned = 0;
let importsChecked = 0;

for (const layer of LAYERS) {
  for (const file of walk(join(SRC, layer), [])) {
    filesScanned += 1;
    const text = readFileSync(file, 'utf8');
    const relFromSrc = relative(SRC, file).split(sep).join('/');
    const seen = new Set(); // dedupe a specifier matched by two patterns
    for (const pattern of SPECIFIER_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const spec = match[1];
        const key = `${match.index}:${spec}`;
        if (seen.has(key)) continue;
        seen.add(key);
        importsChecked += 1;
        const line = () => text.slice(0, match.index).split('\n').length;

        const pkg = packageOf(spec);
        const owned = pkg === null ? undefined : SOLE_OWNER_PACKAGES[pkg];
        if (owned !== undefined && !relFromSrc.startsWith(owned.dir)) {
          violations.push(
            `${relative(ROOT, file)}:${line()} imports '${spec}', and only ` +
              `src/${owned.dir} may: ${owned.why}`
          );
          continue;
        }

        const target = targetLayer(file, spec);
        if (target === null || ALLOWED[layer].has(target)) continue;
        violations.push(
          `${relative(ROOT, file)}:${line()} src/${layer} imports src/${target} ('${spec}')`
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error('FORBIDDEN IMPORTS (see build/assert-import-boundaries.mjs):');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(
  `import boundaries OK: ${filesScanned} production files, ${importsChecked} imports, ` +
    `0 violations (${Object.keys(SOLE_OWNER_PACKAGES).length} sole-owner package rule)`
);
