#!/usr/bin/env node
/**
 * assert-css-order.mjs. surface.css must be emitted once, and it must be
 * emitted before install.css (Phase 132.1).
 *
 * ## Why this file exists
 *
 * `src/renderer/context/install/install.css` carried
 * `@import '../surface/surface.css'` from Phase 26 until Phase 132.1, with a
 * comment saying Vite folded the duplicate away at build time. That sentence
 * was false and it kept a defect alive for four months.
 *
 * `postcss-import` inlines the TEXT of surface.css into install.css's output.
 * Inlined text is not the same module as the surface.css that
 * `src/renderer/context/surface/ContextDetail.tsx` imports, so rollup cannot
 * fold the two together. Two copies were emitted. Measured on 2026-08-22
 * against `out/renderer/assets/index-CctR26M2.css`, 327,267 bytes, copy 1 of
 * surface.css's `.ctxd-install-control` rule sat at byte 66,688 and copy 2 sat
 * at byte 281,177. install.css's own rules ran from 68,245 to about 82,000. So
 * copy 2 landed after every rule install.css contributes, including the
 * container query at byte 77,378 that lays the control band out, and
 * surface.css won every property the two files declare at the same
 * specificity. install.css's own rules were dead.
 *
 * The fix is a JavaScript import of surface.css on the line above
 * `./install.css`, in both modules that import install.css. A JavaScript import
 * resolves to one module id, so the bundler emits it once, and a module's CSS
 * is emitted after the CSS of everything it imports.
 *
 * ## Why the check reads the artifact
 *
 * The source cannot show this. `install-layout.test.ts` reads install.css as
 * text and passed through the whole four months, because the rules it asserts
 * WERE in the file. They just never drew. Only the bundled stylesheet holds the
 * answer, so this script reads `out/renderer/assets/*.css`.
 *
 * It is wired into `npm run build` rather than into a `conformance:` verb,
 * because this is a bundler ordering fact and a bundler ordering fact should be
 * checked by the thing that runs the bundler. That also puts it in
 * `npm run package`, so nothing that builds can skip it.
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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(repoRoot, 'out', 'renderer', 'assets');
const installCss = join(
  repoRoot,
  'src',
  'renderer',
  'context',
  'install',
  'install.css'
);

/**
 * The markers. Each one is written in the normalised form the reader below
 * produces, so the same string matches a pretty-printed stylesheet and a
 * minified one.
 */

/** Only surface.css declares this. It is the border on the control band. */
const SURFACE_CONTROL = 'border-top:1px solid var(--border-strong)';
/** surface.css's first rule. A copy that lost the marker above still has this. */
const SURFACE_HEAD = '.ctxd-detail{';
/** surface.css's last rule. */
const SURFACE_LAST = '@media (max-width:420px){.ctxd-card-row{grid-template-columns:1fr';
/** install.css's first own rule. Phase 150 doubled the width in it. */
const INSTALL_FIRST = '.ctxd-install-modal{width:min(1120px,92vw)';
/** The rule that lays the preview out in two columns, and the control band. */
const INSTALL_CONTAINER = '@container ctxd-preview (min-width:680px)';

const failures = [];

function fail(what, detail) {
  failures.push({ what, detail });
}

function commas(n) {
  return n.toLocaleString('en-US');
}

/**
 * Read one stylesheet and return its normalised text plus a map from every
 * normalised index back to the byte offset it came from in the file on disk.
 *
 * The normalisation collapses every run of whitespace to one space and then
 * drops the spaces that sit beside `{`, `}`, `:`, `;` and `,`. A minifier does
 * the same thing, so a future minifier cannot break these markers. The map is
 * what lets a failure print a real offset into the shipped file, because an
 * offset into a string this script invented is not evidence.
 */
function normalise(text) {
  const out = [];
  const map = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f') {
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      const before = out.length === 0 ? '' : out[out.length - 1];
      const after = text[j] ?? '';
      const punctuation = '{}:;,';
      if (
        out.length > 0 &&
        j < text.length &&
        !punctuation.includes(before) &&
        !punctuation.includes(after)
      ) {
        out.push(' ');
        map.push(i);
      }
      i = j;
      continue;
    }
    out.push(ch);
    map.push(i);
    i += 1;
  }
  return { text: out.join(''), map };
}

/** Every occurrence of a marker, as byte offsets into the file on disk. */
function findAll(sheet, marker) {
  const hits = [];
  let from = 0;
  for (;;) {
    const at = sheet.normal.indexOf(marker, from);
    if (at === -1) break;
    hits.push({ sheet: sheet.name, offset: sheet.map[at] ?? at });
    from = at + 1;
  }
  return hits;
}

function readSheets() {
  if (!existsSync(assetsDir)) return null;
  const out = [];
  for (const name of readdirSync(assetsDir).sort()) {
    if (!name.endsWith('.css')) continue;
    const raw = readFileSync(join(assetsDir, name), 'utf8');
    const { text, map } = normalise(raw);
    out.push({ name, bytes: raw.length, normal: text, map });
  }
  return out;
}

function describe(hits) {
  return hits
    .map((h) => `${h.sheet} at byte ${commas(h.offset)}`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Two stylesheets (Phase 165)
// ---------------------------------------------------------------------------

/**
 * PHASE 165 put the Context subject and the editor panel behind lazy doors,
 * and `context/surface/` is reached by both, so Rollup emits it as a chunk of
 * its own with surface.css beside it, while install.css stays with the
 * subject. The two files are in two stylesheets now, and this gate used to
 * refuse that outright: "two stylesheets have no cascade order this script
 * can read". They do, and it is in the artifact.
 *
 * Vite's preload helper, emitted into the entry chunk, receives for every
 * `import()` a list of dependencies built by `__vite__mapDeps`, and it
 * appends a `<link>` for each one IN LIST ORDER, skipping any already in the
 * document. Vite builds that list depth first and adds a chunk's own CSS
 * AFTER the CSS of everything it imports, with the comment "so the style of
 * current chunk won't be overwritten unexpectedly". So the document order of
 * two stylesheets is the list order of the first site that loaded them, and
 * a later site that carries one already present skips it, which keeps it
 * earlier. Read on 2026-08-29 from out/renderer/assets/index-DkTiI5h6.js, the
 * subject's site listed `PreviewCard-Dsx6tVaF.css` (surface) eighth and
 * `subject-ccysqxwK.css` (install) tenth, and the editor's site listed
 * surface's sheet and never install's.
 *
 * The proof this reader makes: every preload list in every chunk that names
 * install.css's stylesheet names surface.css's stylesheet EARLIER in the same
 * list, and at least one such list exists. The first clause is the cascade.
 * The second is the same lesson as check 1: a stylesheet nothing ever loads
 * would pass an ordering check while drawing nothing.
 */
function readPreloadSites(dir) {
  const sites = [];
  if (!existsSync(dir)) return sites;
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.js')) continue;
    const code = readFileSync(join(dir, name), 'utf8');
    const table = /m\.f=\[([^\]]*)\]/.exec(code);
    if (table === null) continue;
    let names;
    try {
      names = JSON.parse(`[${table[1]}]`);
    } catch {
      continue;
    }
    const re = /__vite__mapDeps\(\[([0-9,\s]*)\]\)/g;
    for (let m = re.exec(code); m !== null; m = re.exec(code)) {
      const before = code.slice(Math.max(0, m.index - 200), m.index);
      const target = /import\(\s*["']\.\/([^"']+)["']\s*\)\s*,?\s*$/.exec(before.replace(/\s+/g, ' '));
      const deps = m[1]
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((x) => names[Number(x)])
        .filter((x) => typeof x === 'string')
        .map((x) => x.replace(/^\.\//, ''));
      sites.push({ chunk: name, target: target?.[1] ?? null, deps });
    }
  }
  return sites;
}

/**
 * Whether every load path that brings in `installSheet` brings `surfaceSheet`
 * in first. Returns null when proven, else the reason.
 */
function loadOrderReason(dir, surfaceSheet, installSheet) {
  const sites = readPreloadSites(dir);
  const carrying = sites.filter((s) => s.deps.includes(installSheet));
  if (carrying.length === 0) {
    return (
      `no preload list in any chunk under ${dir} names ${installSheet}, so ` +
      'nothing ever loads it and its rules never draw.'
    );
  }
  for (const site of carrying) {
    const at = site.deps.indexOf(surfaceSheet);
    const installAt = site.deps.indexOf(installSheet);
    if (at === -1) {
      return (
        `the preload list for import("./${String(site.target)}") in ` +
        `${site.chunk} names ${installSheet} but not ${surfaceSheet}, so a ` +
        'launch that opens that surface first gets install.css with no ' +
        'surface.css under it.'
      );
    }
    if (at > installAt) {
      return (
        `the preload list for import("./${String(site.target)}") in ` +
        `${site.chunk} names ${installSheet} at position ${String(installAt + 1)} ` +
        `and ${surfaceSheet} at position ${String(at + 1)}, so the document ` +
        'gets install.css first and surface.css wins every property the two ' +
        'declare at the same specificity.'
      );
    }
  }
  return null;
}

/**
 * The reader above, proved on three fixtures it writes itself: a list with
 * surface before install passes, a list with install before surface fails,
 * and a list that never names install fails.
 */
function proveLoadOrderReader() {
  const root = mkdtempSync(join(tmpdir(), 'p165-css-order-'));
  const write = (label, deps, order) => {
    const dir = join(root, label);
    mkdirSync(dir, { recursive: true });
    const table = deps.map((d) => JSON.stringify(`./${d}`)).join(',');
    const idx = order.map((d) => String(deps.indexOf(d))).join(',');
    writeFileSync(
      join(dir, 'index-AAAA.js'),
      `const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[${table}])))=>i.map(i=>d[i]);` +
        `const l=()=>__vitePreload(()=>import("./lazy-BBBB.js"),__vite__mapDeps([${idx}]));`
    );
    return dir;
  };
  try {
    const good = write('good', ['lazy-BBBB.js', 'a.css', 'b.css'], ['lazy-BBBB.js', 'a.css', 'b.css']);
    if (loadOrderReason(good, 'a.css', 'b.css') !== null) {
      throw new Error('the good fixture was refused');
    }
    const reversed = write('reversed', ['lazy-BBBB.js', 'a.css', 'b.css'], ['lazy-BBBB.js', 'b.css', 'a.css']);
    if (loadOrderReason(reversed, 'a.css', 'b.css') === null) {
      throw new Error('the reversed fixture passed');
    }
    const missing = write('missing', ['lazy-BBBB.js', 'a.css', 'b.css'], ['lazy-BBBB.js', 'a.css']);
    if (loadOrderReason(missing, 'a.css', 'b.css') === null) {
      throw new Error('the fixture that never loads install.css passed');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  const sheets = readSheets();
  if (sheets === null || sheets.length === 0) {
    console.error(
      `[css-order] ${assetsDir} holds no stylesheet. Run the build before ` +
        'this check.'
    );
    process.exit(1);
  }

  const control = sheets.flatMap((s) => findAll(s, SURFACE_CONTROL));
  const head = sheets.flatMap((s) => findAll(s, SURFACE_HEAD));
  const last = sheets.flatMap((s) => findAll(s, SURFACE_LAST));
  const first = sheets.flatMap((s) => findAll(s, INSTALL_FIRST));
  const container = sheets.flatMap((s) => findAll(s, INSTALL_CONTAINER));

  // Check 1. surface.css is emitted exactly once, read two ways. The control
  // band's border is the rule the whole defect turned on. `.ctxd-detail` is the
  // file's first rule, and it catches a copy that lost the first marker but
  // kept the rest of the file.
  for (const [what, hits] of [
    [`surface.css's control-band rule (${SURFACE_CONTROL})`, control],
    [`surface.css's first rule (${SURFACE_HEAD})`, head],
    [`surface.css's last rule (${SURFACE_LAST})`, last]
  ]) {
    if (hits.length !== 1) {
      fail(
        `${what} is emitted ${String(hits.length)} times and must be emitted 1 time`,
        hits.length === 0
          ? 'It is in no shipped stylesheet. Either surface.css stopped being ' +
            'imported, or this marker went stale and needs updating here.'
          : `Found at ${describe(hits)}. Two copies means something imports ` +
            'surface.css from CSS rather than from JavaScript. `@import` ' +
            'inlines the text, and inlined text is a second module the ' +
            'bundler cannot fold away. The later copy wins every property the ' +
            'two files declare at the same specificity.'
      );
    }
  }

  if (first.length !== 1) {
    fail(
      `install.css's first own rule (${INSTALL_FIRST}) is emitted ` +
        `${String(first.length)} times and must be emitted 1 time`,
      first.length === 0
        ? 'It is in no shipped stylesheet. Either the rule changed, or this ' +
          'marker went stale and needs updating here.'
        : `Found at ${describe(first)}.`
    );
  }
  if (container.length !== 1) {
    fail(
      `install.css's container query (${INSTALL_CONTAINER}) is emitted ` +
        `${String(container.length)} times and must be emitted 1 time`,
      container.length === 0
        ? 'It is in no shipped stylesheet. Either the query changed, or this ' +
          'marker went stale and needs updating here.'
        : `Found at ${describe(container)}.`
    );
  }

  const installAt = first[0];
  const containerAt = container[0];

  // Checks 2, 3 and 4. Every copy of surface.css lands before install.css. The
  // check reads EVERY occurrence rather than the first, because it was the
  // SECOND copy that broke this and the first copy was always in the right
  // place.
  const ordering = [
    [
      'surface.css lands before install.css',
      control,
      installAt,
      "install.css's first own rule"
    ],
    [
      'surface.css lands before the container query',
      control,
      containerAt,
      "install.css's container query"
    ],
    [
      'the whole of surface.css lands before install.css',
      last,
      installAt,
      "install.css's first own rule"
    ]
  ];
  let crossSheet = null;
  for (const [what, hits, target, targetName] of ordering) {
    if (target === undefined) continue;
    for (const hit of hits) {
      if (hit.sheet !== target.sheet) {
        // Phase 165. Two stylesheets decide by load order in the document,
        // and that order is in the preload lists. Read it rather than refuse.
        const reason = loadOrderReason(assetsDir, hit.sheet, target.sheet);
        if (reason !== null) {
          fail(
            `${what}, and it does not: they are in different stylesheets ` +
              'and the load order does not put surface.css first',
            `surface.css is in ${hit.sheet} at byte ${commas(hit.offset)} and ` +
              `${targetName} is in ${target.sheet} at byte ` +
              `${commas(target.offset)}, and ${reason}`
          );
        } else {
          crossSheet = { surface: hit.sheet, install: target.sheet };
        }
        continue;
      }
      if (hit.offset >= target.offset) {
        fail(
          `${what}, and it does not`,
          `surface.css is at byte ${commas(hit.offset)} in ${hit.sheet} and ` +
            `${targetName} is at byte ${commas(target.offset)}, which is ` +
            `${commas(hit.offset - target.offset)} bytes earlier. Where the ` +
            'two files declare the same property at the same specificity, ' +
            "install.css must win. That is what this file's whole design " +
            'assumes.'
        );
      }
    }
  }

  // Check 5. The `@import` did not come back. This is the only check that
  // reads the source, and it reads it because that one source line is what
  // recreates the defect in the artifact.
  if (!existsSync(installCss)) {
    fail(`${installCss} is not there`, 'The stylesheet this check guards is gone.');
  } else {
    const source = readFileSync(installCss, 'utf8');
    const imports = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter((entry) => entry.line.startsWith('@import'));
    for (const entry of imports) {
      fail(
        `src/renderer/context/install/install.css line ${String(entry.number)} ` +
          'states an @import',
        `The line is ${JSON.stringify(entry.line)}. This stylesheet takes ` +
          'surface.css through a JavaScript import in InstallSheet.tsx and ' +
          'InstallDialog.tsx, on the line above `./install.css`. An `@import` ' +
          'here inlines the text again and emits a second copy that wins.'
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      '[css-order] the shipped stylesheet does not put surface.css once and ' +
        'first.'
    );
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      console.error(`    ${detail}`);
    }
    process.exit(1);
  }

  if (crossSheet !== null) {
    console.log(
      `[css-order] surface.css is emitted once, in ${crossSheet.surface}, and ` +
        `install.css is in ${crossSheet.install}; every preload list that ` +
        'loads the second names the first earlier, so the document gets ' +
        'surface.css first. 3 fixtures behaved.'
    );
    return;
  }
  const gap = (installAt?.offset ?? 0) - (control[0]?.offset ?? 0);
  console.log(
    `[css-order] surface.css is emitted once, ${commas(gap)} bytes before ` +
      "install.css's first rule. 3 fixtures behaved."
  );
}

proveLoadOrderReader();
main();
