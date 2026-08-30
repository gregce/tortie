#!/usr/bin/env node
/**
 * assert-probe-containment.mjs. What a person's launch loads is bounded, and
 * the things that must not be in it are not (Phase 127, widened in Phase 165).
 *
 * ## Why this file exists, and it is the same lesson as its two siblings
 *
 * `build/assert-bundle-refusals.mjs` was written in Phase 20 after a refusal
 * that a unit test proved present in the source was found absent from
 * `out/main/index.js`. Vitest runs the source. The bundler ships something
 * else. No test in this repository can see the difference, and a source test
 * that reads `import(...)` in `probe-loader.ts` proves an intention rather than
 * an artifact.
 *
 * Before Phase 127, `src/renderer/app/App.tsx` statically imported fourteen
 * probe modules, being 224,900 bytes of source. Every one of them landed in the
 * single entry chunk a launch loads. Now `probe-loader.ts` reaches them through
 * one `import(...)` behind a query string on the renderer's own URL, so Rollup
 * emits them as a chunk of their own.
 *
 * ## What Phase 165 added, and why it is this file and not a third sibling
 *
 * The audit of 2026-08-26 (docs/audits/2026-08-26-code-quality-memory-and-
 * performance.md, P1) set a budget for the JavaScript a launch parses before
 * first paint: under 2 MB raw and under 500 KB gzip. The fresh baseline taken
 * at 8767fb7 read 4,552,069 raw and 996,202 gzip, being every sidebar subject,
 * the editor panel with all of @pierre/diffs and the shiki family, the eight
 * sheets, the two palettes and the Catch Me Up page, each mounted at boot and
 * each returning null until a store bit flipped. Phase 165 put every one of
 * them behind a lazy door. This gate is what keeps them there.
 *
 * It is this file because the mechanism is the same one: read the built
 * output, find the chunk a launch loads, and assert a string is not in it and
 * IS somewhere else. The probe rules below are that mechanism for one chunk.
 * The budget and boundary rules are that mechanism for the whole eager set.
 *
 * ## The eager set, defined
 *
 * The chunks a launch parses before the shell's first render: the module
 * script `out/renderer/index.html` names, every `modulepreload` it names, and
 * the closure of those under STATIC import edges (`import ... from "./x.js"`,
 * `import "./x.js"`, `export ... from "./x.js"`). A dynamic `import("./x.js")`
 * is NOT an edge. Bytes are the file's bytes on disk; gzip is node's zlib at
 * its default level 6, which is stated here because Vite's build log prints no
 * gzip column in this repository and a gate that names no compressor names no
 * number.
 *
 * ## The rules
 *
 *   1. None of the probe markers is in the entry chunk.
 *   2. Each of them IS in exactly one other chunk under out/renderer/assets/.
 *   3. That other chunk is the SAME one for all of them, being the probe
 *      registry.
 *   4. The eager set is under the budget, raw AND gzip.
 *   5. Each boundary marker, one per surface the phase made lazy, is in NO
 *      eager chunk and in exactly ONE other chunk.
 *
 * The second direction of rules 2 and 5 is not decoration. A marker that
 * vanished from both places would mean somebody deleted a surface, or renamed
 * a class this list names, and this gate would go on passing while checking
 * nothing. It fails on that too.
 *
 * ## THE BUDGET IS NEVER WEAKENED ONLY TO MAKE THE GATE GREEN
 *
 * That sentence is the audit's, verbatim. When rule 4 fails, this gate prints
 * every eager chunk with its bytes, the overage, and what has to happen next:
 * the measured reason is published, in the phase's commit body and in the
 * backlog, BEFORE either number below moves. A round that raises a number
 * here without that paragraph has not fixed a gate, it has deleted one.
 *
 * Run by `npm run build`, so it cannot be skipped by anything that builds,
 * including `npm run package`. The five fixtures at the bottom run first on
 * every invocation, so the scanner is proved before it is trusted.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererDir = join(repoRoot, 'out', 'renderer');

/**
 * The budget, in bytes, from the audit. Raw is the sum of the eager chunks'
 * bytes on disk. Gzip is each chunk gzipped on its own at zlib level 6 and
 * summed, which is what a file served whole would cost.
 */
export const EAGER_RAW_BUDGET = 2_000_000;
export const EAGER_GZIP_BUDGET = 500_000;

/**
 * One string per probe surface, each of which only exists because a harness
 * reads it. Four are window properties a probe polls for over CDP. The fifth
 * is a console line only the shot-layout wrapper prints.
 *
 * THE FIFTH IS NOT THE BARE `[shot-drive]` PREFIX. Before Phase 165
 * `src/renderer/editor/shot-hook.ts` was the BASE drive and stayed statically
 * imported by EditorPanel.tsx on purpose, so the marker had to name the
 * wrapper's own line. Phase 165 moved the base drive into the registry with
 * the seven other surface drives, so the prefix is in one chunk now too, but
 * the marker keeps naming the wrapper's line because that is the line that
 * proves the WRAPPER shipped, not merely the base.
 */
const PROBE_MARKERS = [
  '__gmuxP93',
  '__gmuxP95',
  '__gmuxP96RemoteSurfaces',
  '__gmuxShellPathProbe',
  '[shot-drive] projectDigit'
];

/**
 * One string per surface Phase 165 put behind a lazy door, each a class name
 * or a storage key that exists only in that surface's own module. Each is
 * written WITH its opening quote, so a selector such as `".overview-layer"`
 * in an eager module that queries the DOM does not match the JSX string
 * `"overview-layer"` in the lazy one. The first two doors are Builder A's
 * (overview, arch); the rest are Builder B's.
 */
const BOUNDARY_MARKERS = [
  { surface: 'the Catch Me Up page (overview/OverviewLayer.tsx)', marker: '"overview-layer"' },
  { surface: 'the Architecture subject (arch/ArchView.tsx)', marker: '"arch-accept-open"' },
  { surface: 'the architecture map tab (arch/ArchMapTab.tsx)', marker: '"arch-map-crumb-sep"' },
  { surface: 'the diagnostics tab (diagnostics/DiagnosticsTab.tsx)', marker: '"diag-chips-label"' },
  { surface: 'the Source Control subject (scm/ScmSection.tsx)', marker: '"scm-commit-caption"' },
  { surface: 'the branch header (scm/BranchHeader.tsx)', marker: '"branch-header"' },
  { surface: 'the Explorer subject (tree/FilesSection.tsx)', marker: '"gmux.filesCollapsed"' },
  { surface: 'the file tree (tree/FileTree.tsx)', marker: '"files-tree"' },
  { surface: 'the Context subject (context/ContextView.tsx)', marker: '"ctx-empty-title"' },
  { surface: 'the install sheet (context/install/InstallSheet.tsx)', marker: '"ctx-sheet-hit-name"' },
  { surface: 'the Search subject (search/SearchView.tsx)', marker: '"search-stale-action"' },
  { surface: 'the symbol palette (search/SymbolPalette.tsx)', marker: '"search-hit"' },
  { surface: 'the editor panel (editor/EditorPanel.tsx)', marker: '"ed-banner-spacer"' },
  { surface: 'the diff surface (editor/PierreDiff.tsx)', marker: '"ed-pierre-content"' },
  { surface: 'the Monaco host (editor/MonacoHost.tsx)', marker: '"ed-skeleton-lines"' },
  { surface: 'the quick open palette (quickopen/QuickOpenPalette.tsx)', marker: '"qo-backdrop"' },
  { surface: 'the create session sheet (app/CreateSessionModal.tsx)', marker: '"agent-missing-cmd"' },
  { surface: 'the shortcuts overlay (app/ShortcutsOverlay.tsx)', marker: '"shortcut-action"' }
];

/**
 * A static import edge in Rollup's ES output. `import{a as b}from"./x.js"`,
 * `import"./x.js"` and `export{a}from"./x.js"`, each at a statement start.
 * `import("./x.js")` does not match, because after `import` the next byte is
 * a parenthesis and neither a quote nor a `from` clause.
 */
const STATIC_EDGE =
  /(?:^|[;\n}])\s*(?:import|export)\s*(?:[^;'"]*?\bfrom\s*)?["']\.\/([^"']+\.js)["']/g;

function commas(n) {
  return n.toLocaleString('en-US');
}

/**
 * Read one built renderer directory: the entry chunk and the preloads from
 * index.html, and every JS chunk under assets/ with its bytes.
 */
function readRenderer(dir) {
  const assetsDir = join(dir, 'assets');
  const html = join(dir, 'index.html');
  if (!existsSync(assetsDir)) {
    throw new Error(`${assetsDir} is not there. Run the build before this check.`);
  }
  if (!existsSync(html)) {
    throw new Error(`${html} is not there. Run the build before this check.`);
  }
  const page = readFileSync(html, 'utf8');
  const entryHit = /<script[^>]+src="[^"]*assets\/([^"]+\.js)"/.exec(page);
  if (entryHit === null) {
    throw new Error(
      'out/renderer/index.html names no module script under assets/, so this ' +
        'check cannot tell which chunk a launch loads.'
    );
  }
  const preloads = [];
  for (const m of page.matchAll(
    /<link[^>]+rel="modulepreload"[^>]+href="[^"]*assets\/([^"]+\.js)"/g
  )) {
    preloads.push(m[1]);
  }
  const chunks = new Map();
  for (const name of readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue;
    const bytes = readFileSync(join(assetsDir, name));
    chunks.set(name, {
      name,
      code: bytes.toString('utf8'),
      raw: bytes.length,
      gzip: gzipSync(bytes).length
    });
  }
  const entry = entryHit[1];
  if (!chunks.has(entry)) {
    throw new Error(`${entry} is named by index.html but is not on disk.`);
  }
  return { entry, preloads, chunks };
}

/**
 * The eager closure: the entry, the preloads, and everything reachable from
 * them over static edges. Returns the names in discovery order, entry first.
 */
export function eagerClosure({ entry, preloads, chunks }) {
  const eager = [];
  const seen = new Set();
  const stack = [...preloads.slice().reverse(), entry];
  while (stack.length > 0) {
    const name = stack.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const chunk = chunks.get(name);
    if (chunk === undefined) continue;
    eager.push(name);
    const edges = [];
    for (const m of chunk.code.matchAll(STATIC_EDGE)) edges.push(m[1]);
    for (const edge of edges.reverse()) {
      if (!seen.has(edge)) stack.push(edge);
    }
  }
  return eager;
}

/**
 * Rules 1, 2, 3 and 5, one function. `markers` is the list of strings, `eager`
 * the eager names, `sameHome` whether every marker must share one chunk.
 * Returns failures as `{ what, detail }` and the set of home chunks found.
 */
export function checkContained({ markers, eager, chunks, sameHome, whatFor }) {
  const failures = [];
  const eagerSet = new Set(eager);
  const homes = new Map();
  for (const { marker, surface } of markers) {
    const inEager = eager.filter((n) => chunks.get(n).code.includes(marker));
    if (inEager.length > 0) {
      failures.push({
        what: `${marker} (${surface}) is in the eager set`,
        detail:
          `It is in ${inEager.join(', ')}, which a person's launch parses ` +
          'before first paint. Something imports that surface statically: a ' +
          'barrel that re-exports it, a leaf that reaches into its module for ' +
          'one function, or a door that was bypassed. Find it with: grep -rn ' +
          `"${surface.replace(/^.*\(([^)]+)\).*$/, '$1').replace(/\.tsx?$/, '')}" src/renderer/`
      });
    }
    const elsewhere = [...chunks.values()].filter(
      (c) => !eagerSet.has(c.name) && c.code.includes(marker)
    );
    if (elsewhere.length === 0) {
      failures.push({
        what: `${marker} (${surface}) is in no chunk at all`,
        detail:
          'It is absent from the eager set AND from every other chunk, so ' +
          'this check is passing while proving nothing. Either the surface ' +
          'was deleted, or its marker was renamed and the list in this file ' +
          'went stale. Fix the list rather than deleting the row.'
      });
      continue;
    }
    if (elsewhere.length > 1) {
      failures.push({
        what: `${marker} (${surface}) is in ${String(elsewhere.length)} chunks`,
        detail:
          `They are ${elsewhere.map((c) => c.name).join(', ')}. One surface ` +
          'lives in one chunk. More than one means the module has a second ' +
          'importer that pulled it into another split, and the string is no ' +
          'longer a fingerprint of one file.'
      });
      continue;
    }
    homes.set(marker, elsewhere[0].name);
  }
  const distinct = new Set(homes.values());
  if (sameHome && distinct.size > 1) {
    failures.push({
      what: `the ${whatFor} markers are spread across several chunks`,
      detail:
        `They are in ${[...distinct].join(', ')}. All of them belong to ` +
        'src/renderer/app/probe-registry.ts, which is one dynamic import and ' +
        'therefore one chunk.'
    });
  }
  return { failures, homes };
}

/** Rule 4. Returns failures, and the two totals either way. */
export function checkBudget({ eager, chunks, rawBudget, gzipBudget }) {
  const rows = eager.map((n) => chunks.get(n));
  const raw = rows.reduce((a, c) => a + c.raw, 0);
  const gzip = rows.reduce((a, c) => a + c.gzip, 0);
  const failures = [];
  const over = [];
  if (raw > rawBudget) over.push(`raw ${commas(raw)} is ${commas(raw - rawBudget)} over ${commas(rawBudget)}`);
  if (gzip > gzipBudget) over.push(`gzip ${commas(gzip)} is ${commas(gzip - gzipBudget)} over ${commas(gzipBudget)}`);
  if (over.length > 0) {
    failures.push({
      what: `the eager set is over budget: ${over.join('; ')}`,
      detail:
        'The eager set is ' +
        rows.map((c) => `${c.name} (${commas(c.raw)} raw, ${commas(c.gzip)} gzip)`).join(', ') +
        '. THE BUDGET IS NEVER WEAKENED ONLY TO MAKE THE GATE GREEN. Find ' +
        'what grew with a sourcemap build (electron-vite build --sourcemap ' +
        '--outDir <scratch>) and put it behind a lazy door. If the growth is ' +
        'required for first paint, publish the measured reason, being the ' +
        'module, its bytes and why the first screen cannot draw without it, ' +
        'in the commit body and docs/BACKLOG.md BEFORE either number in this ' +
        'file moves.'
    });
  }
  return { failures, raw, gzip };
}

/** Everything, over one renderer directory. */
export function checkRenderer(dir, { rawBudget, gzipBudget, probeMarkers, boundaryMarkers }) {
  const built = readRenderer(dir);
  const eager = eagerClosure(built);
  const probes = checkContained({
    markers: probeMarkers.map((marker) => ({ marker, surface: 'probe registry' })),
    eager,
    chunks: built.chunks,
    sameHome: true,
    whatFor: 'probe'
  });
  const boundaries = checkContained({
    markers: boundaryMarkers,
    eager,
    chunks: built.chunks,
    sameHome: false,
    whatFor: 'boundary'
  });
  const budget = checkBudget({ eager, chunks: built.chunks, rawBudget, gzipBudget });
  return {
    entry: built.entry,
    eager,
    chunks: built.chunks,
    failures: [...probes.failures, ...boundaries.failures, ...budget.failures],
    probeHome: [...new Set(probes.homes.values())][0] ?? null,
    boundaryHomes: boundaries.homes,
    raw: budget.raw,
    gzip: budget.gzip
  };
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

/**
 * A tiny built renderer, written from a template so each case can bend one
 * thing. The entry statically imports globals and side, dynamically imports
 * lazy, and the page preloads globals. So the eager set is entry, globals and
 * side, and lazy is where both marker kinds live.
 */
function writeFixture(dir, bend) {
  const assets = join(dir, 'assets');
  mkdirSync(assets, { recursive: true });
  const marker = bend.marker ?? '"lazy-only-class"';
  const probe = '__gmuxFixtureProbe';
  const files = {
    'index.html':
      '<!doctype html><html><head>' +
      '<script type="module" crossorigin src="./assets/index-AAAA.js"></script>' +
      '<link rel="modulepreload" crossorigin href="./assets/globals-BBBB.js">' +
      '</head><body></body></html>',
    'index-AAAA.js':
      'import{a}from"./globals-BBBB.js";import"./side-CCCC.js";' +
      'const load=()=>import("./lazy-DDDD.js");' +
      (bend.markerInEntry ? `const m=${marker};` : '') +
      'console.log(a,load);',
    'globals-BBBB.js': 'export const a=1;',
    'side-CCCC.js': 'console.log("side");',
    'lazy-DDDD.js': bend.dropLazy
      ? null
      : `export const x=${marker};export const p="${probe}";`,
    'other-EEEE.js': bend.markerTwice ? `export const y=${marker};` : 'export const y=2;'
  };
  for (const [name, text] of Object.entries(files)) {
    if (text === null) continue;
    writeFileSync(name === 'index.html' ? join(dir, name) : join(assets, name), text);
  }
  return { marker, probe };
}

function proveFixtures() {
  const root = mkdtempSync(join(tmpdir(), 'p165-gate-'));
  const cases = [];
  const run = (label, bend, opts = {}) => {
    const dir = join(root, label);
    const { marker, probe } = writeFixture(dir, bend);
    const result = checkRenderer(dir, {
      rawBudget: opts.rawBudget ?? 10_000,
      gzipBudget: opts.gzipBudget ?? 10_000,
      probeMarkers: [probe],
      boundaryMarkers: [{ surface: 'the fixture surface (lazy-DDDD.js)', marker }]
    });
    cases.push({ label, result });
    return result;
  };
  try {
    const good = run('good', {});
    if (good.failures.length !== 0) {
      throw new Error(`fixture "good" failed: ${good.failures.map((f) => f.what).join('; ')}`);
    }
    if (good.eager.join(',') !== 'globals-BBBB.js,index-AAAA.js,side-CCCC.js' &&
        good.eager.slice().sort().join(',') !== 'globals-BBBB.js,index-AAAA.js,side-CCCC.js') {
      throw new Error(`fixture "good" eager set is ${good.eager.join(',')}, expected entry, globals, side`);
    }
    if (good.eager.includes('lazy-DDDD.js')) {
      throw new Error('fixture "good" followed a dynamic import as if it were static');
    }
    if (good.probeHome !== 'lazy-DDDD.js') {
      throw new Error(`fixture "good" put the probe in ${String(good.probeHome)}`);
    }

    const leak = run('marker-in-entry', { markerInEntry: true });
    if (!leak.failures.some((f) => f.what.includes('is in the eager set'))) {
      throw new Error('fixture "marker-in-entry" passed: a marker in the entry chunk was not caught');
    }

    const gone = run('lazy-deleted', { dropLazy: true });
    if (!gone.failures.some((f) => f.what.includes('is in no chunk at all'))) {
      throw new Error('fixture "lazy-deleted" passed: a surface that vanished everywhere was not caught');
    }

    const twice = run('marker-twice', { markerTwice: true });
    if (!twice.failures.some((f) => f.what.includes('is in 2 chunks'))) {
      throw new Error('fixture "marker-twice" passed: a marker in two lazy chunks was not caught');
    }

    const fat = run('over-budget', {}, { rawBudget: 10, gzipBudget: 10_000 });
    const overRaw = fat.failures.find((f) => f.what.includes('over budget'));
    if (overRaw === undefined || !overRaw.what.includes('raw') || overRaw.what.includes('gzip ')) {
      throw new Error('fixture "over-budget" did not fail on raw alone');
    }
    if (!overRaw.detail.includes('NEVER WEAKENED')) {
      throw new Error('fixture "over-budget" failed without the sentence that says what happens next');
    }
    const fatGz = run('over-gzip', {}, { rawBudget: 10_000, gzipBudget: 10 });
    if (!fatGz.failures.some((f) => f.what.includes('over budget') && f.what.includes('gzip'))) {
      throw new Error('fixture "over-gzip" did not fail on gzip alone');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  return cases.length;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  let fixtures;
  try {
    fixtures = proveFixtures();
  } catch (err) {
    console.error(`[probes] the scanner failed its own fixtures: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  let result;
  try {
    result = checkRenderer(rendererDir, {
      rawBudget: EAGER_RAW_BUDGET,
      gzipBudget: EAGER_GZIP_BUDGET,
      probeMarkers: PROBE_MARKERS,
      boundaryMarkers: BOUNDARY_MARKERS
    });
  } catch (err) {
    console.error(`[probes] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (result.failures.length > 0) {
    console.error(
      '[probes] the eager set is not what a launch may load. ' +
        `${String(result.failures.length)} failure(s):`
    );
    for (const { what, detail } of result.failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  const rows = result.eager.map((n) => result.chunks.get(n));
  const homeChunk = result.chunks.get(result.probeHome);
  const lazyHomes = new Set(result.boundaryHomes.values());
  console.log(
    `[probes] eager set is ${String(rows.length)} chunk(s), ${commas(result.raw)} raw ` +
      `and ${commas(result.gzip)} gzip (zlib level 6), under the budget of ` +
      `${commas(EAGER_RAW_BUDGET)} raw and ${commas(EAGER_GZIP_BUDGET)} gzip by ` +
      `${commas(EAGER_RAW_BUDGET - result.raw)} and ${commas(EAGER_GZIP_BUDGET - result.gzip)}: ` +
      rows.map((c) => `${c.name} ${commas(c.raw)}/${commas(c.gzip)}`).join(', ') +
      `. None of the ${String(PROBE_MARKERS.length)} probe markers is in it; all are in ` +
      `${result.probeHome}, ${commas(homeChunk.raw)} bytes. None of the ` +
      `${String(BOUNDARY_MARKERS.length)} lazy surfaces is in it; they are in ` +
      `${String(lazyHomes.size)} chunk(s) of their own. ${String(fixtures)} fixtures behaved.`
  );
}

main();
