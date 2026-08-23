#!/usr/bin/env node
/**
 * assert-probe-containment.mjs. The harness drives must not be in the chunk a
 * person's launch loads (Phase 127).
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
 * This script reads the built output and asserts BOTH directions, for the same
 * reason the refusals gate does.
 *
 *   1. None of the five markers is in the entry chunk.
 *   2. Each of them IS in exactly one other chunk under out/renderer/assets/.
 *   3. That other chunk is the SAME one for all five, being the probe registry.
 *
 * The second direction is not decoration. A marker that vanished from both
 * places would mean somebody deleted a probe, and this gate would go on passing
 * while checking nothing. It fails on that too.
 *
 * Run by `npm run build`, so it cannot be skipped by anything that builds,
 * including `npm run package`.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererDir = join(repoRoot, 'out', 'renderer');
const assetsDir = join(rendererDir, 'assets');
const rendererHtml = join(rendererDir, 'index.html');

/**
 * One string per probe surface, each of which only exists because a harness
 * reads it. Four are window properties a probe polls for over CDP. The fifth
 * is a console line only the shot-layout wrapper prints.
 *
 * THE FIFTH IS NOT THE BARE `[shot-drive]` PREFIX, and the reason is the scope
 * of the phase. `src/renderer/editor/shot-hook.ts` is the BASE drive and it
 * stays statically imported by EditorPanel.tsx on purpose, along with
 * `src/renderer/split/shot-probe.ts` which it reaches. Both print that prefix
 * and both are still in the entry chunk. Phase 127 moved the fourteen modules
 * App.tsx named and no others, so the marker names the wrapper's own line.
 */
const MARKERS = [
  '__gmuxP93',
  '__gmuxP95',
  '__gmuxP96RemoteSurfaces',
  '__gmuxShellPathProbe',
  '[shot-drive] projectDigit'
];

/**
 * What is deliberately still in the entry chunk, printed on a pass so the
 * build log says what is NOT true as well as what is.
 */
const STILL_STATIC = 'src/renderer/editor/shot-hook.ts and its split probe';

const failures = [];

function fail(what, detail) {
  failures.push({ what, detail });
}

/** The entry chunk, read out of the shipped index.html rather than guessed. */
function entryChunkName() {
  if (!existsSync(rendererHtml)) return null;
  const html = readFileSync(rendererHtml, 'utf8');
  const hit = /<script[^>]+src="[^"]*assets\/([^"]+\.js)"/.exec(html);
  return hit === null ? null : hit[1];
}

function main() {
  if (!existsSync(assetsDir)) {
    console.error(
      `[probes] ${assetsDir} is not there. Run the build before this check.`
    );
    process.exit(1);
  }
  const entry = entryChunkName();
  if (entry === null) {
    console.error(
      '[probes] out/renderer/index.html names no module script under ' +
        'assets/, so this check cannot tell which chunk a launch loads.'
    );
    process.exit(1);
  }

  const chunks = [];
  for (const name of readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue;
    chunks.push({ name, code: readFileSync(join(assetsDir, name), 'utf8') });
  }
  const entryChunk = chunks.find((c) => c.name === entry);
  if (entryChunk === undefined) {
    console.error(`[probes] ${entry} is named by index.html but is not on disk.`);
    process.exit(1);
  }

  /** The chunk each marker was found in, so rule 3 can compare them. */
  const homes = new Map();

  for (const marker of MARKERS) {
    const inEntry = entryChunk.code.split(marker).length - 1;
    if (inEntry > 0) {
      fail(
        `${marker} is in the entry chunk`,
        `${entry} contains it ${inEntry} time(s). The entry chunk is what a ` +
          "person's launch loads. Something imports " +
          'src/renderer/app/probe-registry.ts statically, or a probe module ' +
          'gained a second importer outside it. Find it with: grep -rn ' +
          "\"probe-registry\" src/renderer/"
      );
    }
    const elsewhere = chunks.filter(
      (c) => c.name !== entry && c.code.includes(marker)
    );
    if (elsewhere.length === 0) {
      fail(
        `${marker} is in no chunk at all`,
        'It is absent from the entry chunk AND from every other chunk, so ' +
          'this check is passing while proving nothing. Either the probe was ' +
          'deleted, or its marker was renamed and MARKERS in this file went ' +
          'stale. Fix the list rather than deleting the row.'
      );
      continue;
    }
    if (elsewhere.length > 1) {
      fail(
        `${marker} is in ${String(elsewhere.length)} chunks`,
        `They are ${elsewhere.map((c) => c.name).join(', ')}. One probe ` +
          'surface lives in one chunk. More than one means a probe module has ' +
          'a second importer that pulled it into another split.'
      );
      continue;
    }
    homes.set(marker, elsewhere[0].name);
  }

  const distinct = new Set(homes.values());
  if (distinct.size > 1) {
    fail(
      'the five markers are spread across several chunks',
      `They are in ${[...distinct].join(', ')}. All five belong to ` +
        'src/renderer/app/probe-registry.ts, which is one dynamic import and ' +
        'therefore one chunk.'
    );
  }

  if (failures.length > 0) {
    console.error(
      '[probes] the harness drives are not contained in their own chunk.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  const home = [...distinct][0];
  const homeChunk = chunks.find((c) => c.name === home);
  console.log(
    `[probes] entry chunk ${entry} is ${String(entryChunk.code.length)} ` +
      `bytes and carries none of the ${String(MARKERS.length)} probe ` +
      `markers. All ${String(MARKERS.length)} are in ${home}, ` +
      `${String(homeChunk.code.length)} bytes. Still in the entry chunk on ` +
      `purpose: ${STILL_STATIC}.`
  );
}

main();
