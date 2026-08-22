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

import { readdirSync, readFileSync, existsSync } from 'node:fs';
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
/** install.css's first own rule. */
const INSTALL_FIRST = '.ctxd-install-modal{width:560px';
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
  for (const [what, hits, target, targetName] of ordering) {
    if (target === undefined) continue;
    for (const hit of hits) {
      if (hit.sheet !== target.sheet) {
        fail(
          `${what}, and it does not: they are in different stylesheets`,
          `surface.css is in ${hit.sheet} at byte ${commas(hit.offset)} and ` +
            `${targetName} is in ${target.sheet} at byte ` +
            `${commas(target.offset)}. Two stylesheets have no cascade order ` +
            'this script can read, so the rules would decide by load order ' +
            'in the document instead.'
        );
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

  const gap = (installAt?.offset ?? 0) - (control[0]?.offset ?? 0);
  console.log(
    `[css-order] surface.css is emitted once, ${commas(gap)} bytes before ` +
      "install.css's first rule."
  );
}

main();
