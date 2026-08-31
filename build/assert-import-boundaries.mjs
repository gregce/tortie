#!/usr/bin/env node
/**
 * Phase 42 stage 7: the forbidden-import check.
 * Phase 124: the platform rule, and the fixtures that prove it.
 * Phase 125: the facade rule, and the seven fixtures that prove it.
 * Phase 127: the directory wall, and the ten fixtures that prove it.
 * Phase 172: the two arch facade doors, and the fourteen fixtures that
 * prove them.
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
 * One directory has ONE door (Phase 125). src/shared/ipc/machines/ holds nine
 * domain files and src/shared/ipc/machines.ts is the barrel that composes
 * them. Only a file already inside src/shared/ipc/ may name one of the nine.
 * Phase 42 set that shape when it split src/shared/ipc.ts into domain files
 * behind index.ts, and a second door is how the declared surface and the
 * installed one drift apart. Tests are exempt, as they are from every rule
 * here, and src/main/actions/index.ts already states the same house
 * convention, that a directory's private files are imported directly by its
 * tests.
 *
 * One directory may not name two others (Phase 127). src/renderer/state may
 * not name src/renderer/app or src/renderer/editor. The store is COMPOSED BY
 * the app shell and the editor, so it may not name either of them. Facts and
 * sentences about the data the store holds belong at or below the store, which
 * is why Phase 127 moved the machine vocabulary, resume readiness, the format
 * helpers, the clone words and the menu types down. An operation on the shell
 * is injected instead, through src/renderer/state/shell-ops.ts, which the
 * composition root fills once in src/renderer/main.tsx.
 *
 * A TYPE ONLY import is rejected by that rule too. This gate reads text and
 * does not distinguish, and here that is correct rather than a limitation.
 * A type-only import of an app file is still the state layer naming its
 * composition owner, and the whole point of the rule is that
 * the store's declared surface names nothing above it. That makes this rule
 * stricter than build/assert-no-runtime-cycles.mjs, which counts runtime edges
 * only, and the two are meant to differ.
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

/**
 * Phase 125. The directories that have ONE door, and the sentence each failure
 * prints. `dir` is the private directory, `onlyFrom` is the one prefix allowed
 * to name it, and `door` is what the importer should have used instead.
 *
 * Phase 172 added `doors`: when the door file lives INSIDE the private
 * directory, this lists the src-relative specifiers (extensionless, as the
 * resolver answers them) an outer caller may still name. The machines rule
 * needs none, because its barrel sits beside the directory rather than in it.
 */
const FACADE_ONLY = [
  {
    dir: 'shared/ipc/machines/',
    onlyFrom: 'shared/ipc/',
    door: 'src/shared/ipc/machines.ts',
    why:
      'the machines contract has ONE door. Phase 42 split src/shared/ipc.ts ' +
      'into domain files behind index.ts and Phase 125 split machines.ts the ' +
      'same way. A second door is how the declared surface and the installed ' +
      'one drift apart.'
  },
  {
    dir: 'main/arch/',
    onlyFrom: 'main/arch/',
    doors: ['main/arch/ipc'],
    door: 'src/main/arch/ipc.ts',
    why:
      'the arch domain has ONE door for the rest of main, being the ' +
      'registrar that boot already calls. Phase 172 moved the check and ' +
      'enrichment workflows into coordinator modules behind it, and a second ' +
      'importer of any internal module is how those seams stop being ' +
      'internal.'
  },
  {
    dir: 'renderer/arch/state/',
    onlyFrom: 'renderer/arch/',
    door: 'src/renderer/arch/store.ts',
    why:
      'the Architecture store has ONE renderer facade, being useArch in ' +
      'store.ts. Phase 172 built it from the document, map and pass action ' +
      'modules over the one state type, and a second importer of any of ' +
      'them is how a competing store starts.'
  }
];

/**
 * Phase 127. The directories one directory may not name, and the sentence each
 * failure prints. `dir` is the walled directory, and `forbidden` is the list of
 * prefixes it may not reach.
 */
const DIRECTORY_WALLS = [
  {
    dir: 'main/arch/',
    forbidden: ['main/manifest/', 'main/restore/', 'main/context/'],
    why:
      'the standing contract is DERIVED and disposable, and the manifest and ' +
      'the restore path are the durability record. Arch reads a repository ' +
      'and answers about files, so it has no business naming the thing that ' +
      'decides whether a session comes back. Context is walled for the other ' +
      'reason: a repository local directory that arrives with a git pull must ' +
      'never be able to reach what an agent launched with. Research 49 ' +
      'section 4.5 states the wall and CLAUDE.md refusal 4 is why it is not ' +
      'negotiable. Everything arch needs from git is in src/main/arch/' +
      'argv-guard.ts, which composes five fixed argv and no others.'
  },
  {
    dir: 'renderer/state/',
    forbidden: ['renderer/app/', 'renderer/editor/'],
    why:
      'the store is composed BY the app shell and the editor, so it may not ' +
      'name either of them. Facts and sentences about the data the store ' +
      'holds belong at or below the store. An operation on the shell is ' +
      'INJECTED through src/renderer/state/shell-ops.ts, which the ' +
      'composition root fills once in src/renderer/main.tsx.'
  }
];

/**
 * The src-relative path a specifier names, forward-slashed, or null when it
 * names a bare package or resolves outside src/. It handles the same three
 * shapes targetLayer() handles, and it is the only other resolver here.
 */
function targetPath(fromFile, spec) {
  if (spec.startsWith('@shared/')) return `shared/${spec.slice('@shared/'.length)}`;
  if (spec.startsWith('@renderer/')) return `renderer/${spec.slice('@renderer/'.length)}`;
  if (!spec.startsWith('.')) return null;
  const rel = relative(SRC, resolve(fromFile, '..', spec));
  if (rel.startsWith('..')) return null;
  return rel.split(sep).join('/');
}

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

      const named = targetPath(absFile, spec);
      const facade =
        named === null
          ? undefined
          : FACADE_ONLY.find(
              (rule) =>
                named.startsWith(rule.dir) &&
                !relFromSrc.startsWith(rule.onlyFrom) &&
                !(rule.doors ?? []).includes(named)
            );
      if (facade !== undefined) {
        out.push(
          `${relFromRoot}:${line()} imports '${spec}', and only src/` +
            `${facade.onlyFrom} may. Import ${facade.door} instead: ${facade.why}`
        );
        continue;
      }

      const wall =
        named === null
          ? undefined
          : DIRECTORY_WALLS.find(
              (rule) =>
                relFromSrc.startsWith(rule.dir) &&
                rule.forbidden.some((bad) => named.startsWith(bad))
            );
      if (wall !== undefined) {
        out.push(
          `${relFromRoot}:${line()} imports '${spec}', and src/${wall.dir} ` +
            `may not name src/${wall.forbidden.join(' or src/')}: ${wall.why}`
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
// The fixtures. Forty-two synthetic files, each one line of source, run before
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
  ['renderer/x/__tests__/p124-fixture.ts', "import { readFileSync } from 'node:fs';", null],
  // Phase 125, the facade rule. Three rejections, one per layer that could
  // reach around the barrel, and four acceptances that pin what the rule must
  // NOT catch.
  [
    'main/p125-fixture.ts',
    "import type { MachineRowView } from '@shared/ipc/machines/rows';",
    '@shared/ipc/machines/rows'
  ],
  [
    'renderer/p125-fixture.tsx',
    "import { EVT_MACHINE_STATE } from '@shared/ipc/machines/presence';",
    '@shared/ipc/machines/presence'
  ],
  [
    'shared/p125-fixture.ts',
    "import type { X } from './ipc/machines/scm';",
    './ipc/machines/scm'
  ],
  ['main/p125-fixture.ts', "import type { MachineRowView } from '@shared/ipc';", null],
  ['shared/ipc/index.ts', "export * from './machines';", null],
  [
    'shared/ipc/machines/filesystem.ts',
    "import type { MachineRowView } from './rows';",
    null
  ],
  // A test may name a private file, and every rule in this gate already
  // exempts one. Making the facade rule stricter than that exemption would
  // change the meaning of the gate rather than add to it.
  [
    'main/__tests__/p125-fixture.ts',
    "import type { MachineRowView } from '@shared/ipc/machines/rows';",
    null
  ],
  // Phase 172, the arch facade. Three rejections, one per shape that can
  // reach around the registrar, and four acceptances that pin the one door,
  // the inside, and the test exemption.
  [
    'main/p172-fixture.ts',
    "import { createArchCheckCoordinator } from './arch/check-coordinator';",
    './arch/check-coordinator'
  ],
  [
    'main/p172-fixture.ts',
    "import { createArchEnrichCoordinator } from './arch/enrich-coordinator';",
    './arch/enrich-coordinator'
  ],
  [
    'main/machines/p172-fixture.ts',
    "const db = await import('../arch/db');",
    '../arch/db'
  ],
  ['main/p172-fixture.ts', "import { registerArchIpc } from './arch/ipc';", null],
  [
    'main/arch/p172-fixture.ts',
    "import { createArchCheckCoordinator } from './check-coordinator';",
    null
  ],
  [
    'main/arch/enrich/p172-fixture.ts',
    "import { firstPartyPairs } from '../repair-trigger';",
    null
  ],
  [
    'main/__tests__/p172-fixture.ts',
    "import { createArchCheckCoordinator } from '../arch/check-coordinator';",
    null
  ],
  // Phase 172, the renderer store facade. Three rejections, one per shape
  // that can reach around useArch, and four acceptances that pin the door,
  // the inside and the test exemption.
  [
    'renderer/editor/p172-fixture.ts',
    "import { createMapActions } from '../arch/state/map-actions';",
    '../arch/state/map-actions'
  ],
  [
    'renderer/p172-fixture.tsx',
    "import { errorText } from '@renderer/arch/state/view-state';",
    '@renderer/arch/state/view-state'
  ],
  [
    'renderer/scm/p172-fixture.ts',
    "const acts = await import('../arch/state/pass-actions');",
    '../arch/state/pass-actions'
  ],
  ['renderer/p172-fixture.ts', "import { useArch } from './arch/store';", null],
  [
    'renderer/arch/p172-fixture.ts',
    "import { createDocumentActions } from './state/document-actions';",
    null
  ],
  [
    'renderer/arch/state/p172-fixture.ts',
    "import { NONE } from './view-state';",
    null
  ],
  [
    'renderer/editor/__tests__/p172-fixture.ts',
    "import { drillPatch } from '../../arch/state/view-state';",
    null
  ],
  // Phase 127, the directory wall. Four rejections, one per shape that can
  // break the wall, and six acceptances that pin what the rule must NOT catch.
  [
    'renderer/state/p127-fixture.ts',
    "import { focusFleetPrimary } from '../app/focus-trap';",
    '../app/focus-trap'
  ],
  [
    'renderer/state/p127-fixture.ts',
    "import type { MenuSpec } from '@renderer/app/ContextMenu';",
    '@renderer/app/ContextMenu'
  ],
  [
    'renderer/state/p127-fixture.ts',
    "const m = await import('../editor/store');",
    '../editor/store'
  ],
  [
    'renderer/state/nested/p127-fixture.ts',
    "export { showNativeMenu } from '../../app/ContextMenu';",
    '../../app/ContextMenu'
  ],
  ['renderer/state/p127-fixture.ts', "import { shellOps } from './shell-ops';", null],
  [
    'renderer/state/p127-fixture.ts',
    "import { remoteTabOpened } from '../machines/project-tab';",
    null
  ],
  ['renderer/state/p127-fixture.ts', "import type { MenuSpec } from '../menus/spec';", null],
  // The wall is one-directional. The app shell and the editor compose the
  // store, so both may name it and neither is caught here.
  ['renderer/app/p127-fixture.tsx', "import { useApp } from '../state/store';", null],
  ['renderer/editor/p127-fixture.ts', "import { requestOpenFile } from '../state/open-file';", null],
  // A test may name what its production neighbour may not, and every rule in
  // this gate already exempts one. Making this rule stricter than that
  // exemption would change the meaning of the gate rather than add to it.
  [
    'renderer/state/__tests__/p127-fixture.ts',
    "import { focusFleetPrimary } from '../../app/focus-trap';",
    null
  ]
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
    `${Object.keys(NO_PLATFORM_ACCESS).length} layers with no platform ` +
    `access, ${FACADE_ONLY.length} facade directory, ` +
    `${DIRECTORY_WALLS.length} directory wall)`
);
