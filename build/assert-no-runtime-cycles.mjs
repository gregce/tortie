#!/usr/bin/env node
/**
 * Phase 123: no production runtime cycles, proven by a graph gate.
 *
 * What this replaces, and why the thing it replaces was not enough.
 * src/shared/__tests__/source-scan.test.ts used to name one import specifier
 * per former cycle and assert that specifier was absent. That check passed
 * for months while seven strongly connected components existed across
 * thirty-eight production modules. A cycle can close through any edge, and a
 * fixed string sees only the one edge somebody wrote down. This gate reads
 * the graph instead of a list of names, so a cycle that closes through a new
 * edge is caught the first time it is committed.
 *
 * The rule, stated once:
 *
 *   No production runtime import graph over src/shared, src/main,
 *   src/preload and src/renderer may contain a cycle.
 *
 * What counts as a node.
 * Every .ts and .tsx file under those four layers, except a file under a
 * directory named __tests__ or node_modules, and except a .d.ts file. Tests
 * are excluded because tsconfig.tests.json is the one program allowed to
 * cross a process boundary, so a test may import anything and a cycle
 * through a test is not a production fact.
 *
 * What counts as a runtime edge. There are four shapes, and they are the
 * four ways one module can make another module's body run.
 *
 *   static       import { v } from './b'
 *   side-effect  import './b'
 *   reexport     export { v } from './b'
 *   dynamic      import('./b') as a call
 *
 * What is NOT an edge. A type-only edge erases at compile time, so it cannot
 * make a body run and it cannot deadlock a module initialiser.
 *
 *   import type { T } from './b'
 *   import { type T, type U } from './b'     every named binding is a type
 *   export type { T } from './b'
 *   export { type T } from './b'             every named export is a type
 *   let x: import('./b').T                   import in a TYPE position
 *
 * One decision that is worth its own paragraph. A dynamic import('...') with
 * a string literal IS counted as a runtime edge. The Phase 123 audit counted
 * it, and the reason is measured rather than assumed: Vite reports that
 * several intended dynamic imports in this tree are also statically
 * reachable, so the bundler puts them in the same chunk. A dynamic import
 * the bundler cannot split is a runtime edge wearing different syntax.
 * Counting it costs nothing today, because no cycle in the tree exists only
 * because of a dynamic edge that Vite actually splits. If a future round
 * wants a genuinely split dynamic boundary to be free, it must prove the
 * split with a number, and then it changes DYNAMIC_IS_AN_EDGE below and
 * writes down which chunk boundary it relied on.
 *
 * How a specifier is resolved. Only './x', '../x', '@shared/x' and
 * '@renderer/x' resolve, and they resolve against src/ the way the four
 * tsconfig path maps and electron.vite.config.ts resolve them. The
 * candidates are tried in the order '.ts', '.tsx', '/index.ts', '/index.tsx'.
 * A bare package specifier is never an edge, because a package is not a node
 * in this graph.
 *
 * Output. Exit 1 listing every component of more than one module, and every
 * module that imports itself, naming each module and each edge inside the
 * component with its kind and its line. Exit 0 with a one-line summary.
 *
 * The fixture table at the bottom runs on every invocation, before any real
 * file is read. Every fixture goes through the same buildGraph and
 * findCycles the repository goes through, so what the fixtures prove is what
 * the repository is checked against. The fixtures read nothing from disk and
 * write nothing.
 *
 * The one dependency is `typescript`, which is already a devDependency and
 * which build/contract-inventory.mjs already imports.
 */
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LAYERS = ['shared', 'main', 'preload', 'renderer'];

/** See the paragraph above. Changing this needs a measured chunk boundary. */
const DYNAMIC_IS_AN_EDGE = true;

/** The candidate suffixes, in the order a resolver tries them. */
const CANDIDATES = ['.ts', '.tsx', `${sep}index.ts`, `${sep}index.tsx`];

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/**
 * True when a path is a production source file this gate treats as a node.
 * The tree walk and the graph builder both ask this one function, so a file
 * the walk skips can never arrive as an edge target either.
 */
function isProductionSource(absPath) {
  const rel = relative(SRC, absPath);
  if (rel.startsWith('..')) return false;
  const parts = rel.split(sep);
  if (parts.includes('__tests__') || parts.includes('node_modules')) return false;
  const name = parts[parts.length - 1] ?? '';
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.tsx');
}

/** Collect every production source file under src/<layer>. */
function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(path, out);
    } else if (isProductionSource(path)) {
      out.push(path);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

/**
 * Resolve one specifier from one file to a node of the graph, or null.
 * `known` is the set of files that are nodes, so a specifier naming a test
 * file, a .d.ts file or a package resolves to nothing and adds no edge.
 */
function resolveSpecifier(fromFile, spec, known) {
  let base;
  if (spec.startsWith('@shared/')) {
    base = join(SRC, 'shared', spec.slice('@shared/'.length));
  } else if (spec.startsWith('@renderer/')) {
    base = join(SRC, 'renderer', spec.slice('@renderer/'.length));
  } else if (spec.startsWith('.')) {
    base = resolve(dirname(fromFile), spec);
  } else {
    return null;
  }
  if (known.has(base)) return base;
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix;
    if (known.has(candidate)) return candidate;
  }
  return null;
}

/**
 * True when an import clause carries at least one value binding. A clause
 * that is absent means a side-effect import, which always runs the body.
 */
function importIsRuntime(clause) {
  if (clause === undefined) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name !== undefined) return true;
  const bindings = clause.namedBindings;
  if (bindings !== undefined && ts.isNamedImports(bindings)) {
    const elements = bindings.elements;
    if (elements.length > 0 && elements.every((e) => e.isTypeOnly)) return false;
  }
  return true;
}

/** True when an `export ... from` carries at least one value export. */
function exportIsRuntime(node) {
  if (node.isTypeOnly) return false;
  const clause = node.exportClause;
  if (clause !== undefined && ts.isNamedExports(clause)) {
    const elements = clause.elements;
    if (elements.length > 0 && elements.every((e) => e.isTypeOnly)) return false;
  }
  return true;
}

/**
 * The runtime edges one file's source text declares, as
 * { spec, kind, line }. This is the whole edge rule, and it is the function
 * the fixtures exercise. It resolves nothing, so it needs no file system.
 */
function edgesFor(absFile, text) {
  const out = [];
  const sourceFile = ts.createSourceFile(
    absFile,
    text,
    ts.ScriptTarget.ESNext,
    true,
    absFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const lineOf = (node) =>
    ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile)).line + 1;

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (importIsRuntime(node.importClause)) {
        out.push({
          spec: node.moduleSpecifier.text,
          kind: node.importClause === undefined ? 'side-effect' : 'static',
          line: lineOf(node)
        });
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (exportIsRuntime(node)) {
        out.push({ spec: node.moduleSpecifier.text, kind: 'reexport', line: lineOf(node) });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      // A call, so this is import('./b'). An ImportTypeNode is the other
      // shape, being import('./b').T in a type position, and it never
      // reaches here because it is not a CallExpression.
      const first = node.arguments[0];
      if (DYNAMIC_IS_AN_EDGE && first !== undefined && ts.isStringLiteral(first)) {
        out.push({ spec: first.text, kind: 'dynamic', line: lineOf(node) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

/**
 * Build the directed graph. `sources` maps an absolute path to its text.
 * The result is adj: Map<from, Map<to, Array<{ kind, line }>>>.
 */
function buildGraph(sources) {
  const known = new Set([...sources.keys()].filter(isProductionSource));
  const adj = new Map();
  let edgeCount = 0;
  for (const file of known) {
    const targets = new Map();
    for (const edge of edgesFor(file, sources.get(file))) {
      const to = resolveSpecifier(file, edge.spec, known);
      if (to === null) continue;
      let list = targets.get(to);
      if (list === undefined) {
        list = [];
        targets.set(to, list);
        edgeCount += 1;
      }
      list.push({ kind: edge.kind, line: edge.line });
    }
    adj.set(file, targets);
  }
  return { adj, edgeCount, nodes: [...known].sort() };
}

// ---------------------------------------------------------------------------
// Tarjan
// ---------------------------------------------------------------------------

/**
 * Every strongly connected component of more than one module, plus every
 * module that imports itself. Sorted largest first, and each component's
 * members sorted by name so the failure output is stable.
 */
function findCycles(graph) {
  const { adj, nodes } = graph;
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  const connect = (v) => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v)?.keys() ?? []) {
      if (!index.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), index.get(w)));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      components.push(component);
    }
  };

  for (const node of nodes) if (!index.has(node)) connect(node);

  return components
    .filter((c) => c.length > 1 || adj.get(c[0])?.has(c[0]) === true)
    .map((c) => c.slice().sort())
    .sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
}

// ---------------------------------------------------------------------------
// The fixtures. Fifteen synthetic module sets, run before any real file is
// read. Each one states the shape it proves, its files, and how many
// components and edges the gate must find in it. Nothing is read from disk
// and nothing is written to it.
// ---------------------------------------------------------------------------

const FIXTURES = [
  {
    proves: 'a type-only edge does NOT close a cycle',
    files: {
      'main/fx/a.ts': "import type { T } from './b';\nexport const a = 1;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [],
    edges: 1
  },
  {
    proves: 'a real runtime cycle DOES fail the gate',
    files: {
      'main/fx/c.ts': "import { d } from './d';\nexport const c = d;\n",
      'main/fx/d.ts': "import { c } from './c';\nexport const d = c;\n"
    },
    components: [['main/fx/c.ts', 'main/fx/d.ts']],
    edges: 2
  },
  {
    proves: 'a named import where EVERY binding is marked type is not an edge',
    files: {
      'main/fx/a.ts': "import { type T, type U } from './b';\nexport const a = 1;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [],
    edges: 1
  },
  {
    proves: 'a named import with ONE value binding beside the types IS an edge',
    files: {
      'main/fx/a.ts': "import { type T, v } from './b';\nexport const a = v;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const v = a;\n"
    },
    components: [['main/fx/a.ts', 'main/fx/b.ts']],
    edges: 2
  },
  {
    proves: 'a dynamic import IS an edge',
    files: {
      'main/fx/a.ts': "export async function a() {\n  const m = await import('./b');\n  return m;\n}\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [['main/fx/a.ts', 'main/fx/b.ts']],
    edges: 2
  },
  {
    proves: "import('./b').T in a TYPE position is not an edge",
    files: {
      'main/fx/a.ts': "export let x: import('./b').T | null = null;\n",
      'main/fx/b.ts': "import { x } from './a';\nexport const b = x;\n"
    },
    components: [],
    edges: 1
  },
  {
    proves: 'a re-export chain closes a cycle',
    files: {
      'main/fx/a.ts': "export { v } from './b';\n",
      'main/fx/b.ts': "export { w as v } from './c';\n",
      'main/fx/c.ts': "import { v } from './a';\nexport const w = v;\n"
    },
    components: [['main/fx/a.ts', 'main/fx/b.ts', 'main/fx/c.ts']],
    edges: 3
  },
  {
    proves: 'export type ... from is not an edge',
    files: {
      'main/fx/a.ts': "export type { T } from './b';\nexport const a = 1;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [],
    edges: 1
  },
  {
    proves: 'export { type T } from, with every export a type, is not an edge',
    files: {
      'main/fx/a.ts': "export { type T, type U } from './b';\nexport const a = 1;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [],
    edges: 1
  },
  {
    proves: 'a side-effect import IS an edge',
    files: {
      'main/fx/a.ts': "import './b';\nexport const a = 1;\n",
      'main/fx/b.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [['main/fx/a.ts', 'main/fx/b.ts']],
    edges: 2
  },
  {
    proves: 'an index barrel is a node, so a cycle through a barrel is found',
    files: {
      'main/fx/a.ts': "import { v } from './dir';\nexport const a = v;\n",
      'main/fx/dir/index.ts': "export { w as v } from './leaf';\n",
      'main/fx/dir/leaf.ts': "import { a } from '../a';\nexport const w = a;\n"
    },
    components: [
      ['main/fx/a.ts', 'main/fx/dir/index.ts', 'main/fx/dir/leaf.ts']
    ],
    edges: 3
  },
  {
    proves: 'the @renderer and @shared aliases resolve, so a cycle through one is found',
    files: {
      'renderer/fx/a.ts': "import { v } from '@shared/fx/leaf';\nexport const a = v;\n",
      'shared/fx/leaf.ts': "export const v = 1;\n",
      'renderer/fx/b.ts': "import { a } from '@renderer/fx/a';\nexport const b = a;\n"
    },
    // shared/fx/leaf.ts is a leaf, so there is no cycle here. The two edges
    // are the proof: neither alias resolved to nothing.
    components: [],
    edges: 2
  },
  {
    proves: 'a bare package specifier is not an edge',
    files: {
      'renderer/fx/a.ts': "import { create } from 'zustand';\nimport React from 'react';\nexport const a = create;\n"
    },
    components: [],
    edges: 0
  },
  {
    proves: 'a file under __tests__ is not a node, in either direction',
    files: {
      'main/fx/a.ts': "import { t } from './__tests__/t';\nexport const a = t;\n",
      'main/fx/__tests__/t.ts': "import { a } from '../a';\nexport const t = a;\n"
    },
    components: [],
    edges: 0
  },
  {
    proves: 'a module that imports itself is reported',
    files: {
      'main/fx/a.ts': "import { a } from './a';\nexport const b = a;\n"
    },
    components: [['main/fx/a.ts']],
    edges: 1
  }
];

const relFromSrc = (file) => relative(SRC, file).split(sep).join('/');

function runFixtures() {
  const failures = [];
  for (const fixture of FIXTURES) {
    const sources = new Map();
    for (const [name, text] of Object.entries(fixture.files)) {
      sources.set(join(SRC, ...name.split('/')), text);
    }
    const graph = buildGraph(sources);
    const found = findCycles(graph).map((c) => c.map(relFromSrc));
    const wanted = fixture.components.map((c) => c.slice().sort());
    if (JSON.stringify(found) !== JSON.stringify(wanted)) {
      failures.push(
        `"${fixture.proves}" wanted components ${JSON.stringify(wanted)} ` +
          `and the gate found ${JSON.stringify(found)}.`
      );
    }
    if (graph.edgeCount !== fixture.edges) {
      failures.push(
        `"${fixture.proves}" wanted ${fixture.edges} runtime edges ` +
          `and the gate found ${graph.edgeCount}.`
      );
    }
  }
  if (failures.length > 0) {
    console.error('FIXTURE FAILED (see build/assert-no-runtime-cycles.mjs):');
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      '  The rule and the fixtures disagree, so the gate is not proving anything.'
    );
    process.exit(1);
  }
  return FIXTURES.length;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const fixturesChecked = runFixtures();

const sources = new Map();
for (const layer of LAYERS) {
  for (const file of walk(join(SRC, layer), [])) {
    sources.set(file, readFileSync(file, 'utf8'));
  }
}

const graph = buildGraph(sources);
const cycles = findCycles(graph);

if (cycles.length > 0) {
  const modules = cycles.reduce((n, c) => n + c.length, 0);
  console.error('PRODUCTION RUNTIME CYCLES (see build/assert-no-runtime-cycles.mjs):');
  console.error(
    `  ${cycles.length} strongly connected component(s) across ${modules} module(s).`
  );
  console.error(
    '  A cycle means two modules run each other at import time, so the order ' +
      'they initialise in is decided by whoever imports first.'
  );
  for (const component of cycles) {
    console.error(`\n  --- ${component.length} module(s) ---`);
    const inside = new Set(component);
    for (const file of component) {
      console.error(`    ${relFromSrc(file)}`);
      for (const [to, uses] of graph.adj.get(file) ?? []) {
        if (!inside.has(to)) continue;
        for (const use of uses) {
          console.error(`        -> ${relFromSrc(to)}  [${use.kind}, line ${use.line}]`);
        }
      }
    }
  }
  console.error(
    '\n  Cut one edge per component. The smallest cut is usually a leaf: move ' +
      'the shared thing into its own module that both sides import.'
  );
  process.exit(1);
}

console.log(
  `no runtime cycles: ${fixturesChecked} fixtures behaved, ${graph.nodes.length} ` +
    `production files, ${graph.edgeCount} runtime edges (dynamic counted), ` +
    `0 strongly connected components`
);
