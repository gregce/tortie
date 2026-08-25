#!/usr/bin/env node
/**
 * assert-menu-glyphs.mjs. The menu icon set, checked against the font that
 * actually draws it (Phase 153).
 *
 * ## Why this gate exists, and it is not a hypothetical
 *
 * `src/renderer/icons/codicon-menu-icon.ts` holds a closed set of codicon
 * names. Every menu row's icon is one of them. TypeScript proves a builder
 * cannot name a glyph outside the set. It cannot prove the two things that
 * actually go wrong:
 *
 *  1. A NAME THAT DRAWS NOTHING. `@vscode/codicons` ships hundreds of names and
 *     the set moves between versions. A name with no rule in the stylesheet
 *     rasterizes to an empty bitmap, `menuGlyph` returns no icon, and the row
 *     silently loses its mark. Nothing fails, nothing is red, and the operator
 *     is the one who notices.
 *  2. TWO NAMES THAT DRAW THE SAME PICTURE. This is the one that shipped a
 *     wrong icon on 2026-08-25. `git-branch`, `git-branch-create` and
 *     `git-branch-delete` are all bound to U+EC6F in the shipped stylesheet, so
 *     `Create branch…` and `Delete branch…` would have worn one identical
 *     branch, saying nothing about creating and nothing about deleting. The
 *     Phase 153 probe found it by drawing all 49 glyphs and counting 48
 *     distinct bitmaps. This gate finds the same thing in a tenth of a second
 *     with no Electron, by reading the codepoints instead of the pixels.
 *
 * ONE THING THIS GATE DOES NOT SEE, said plainly. The shipped app declares the
 * font family `codicon` TWICE, once from `@vscode/codicons` and once from the
 * copy monaco-editor bundles, and whichever declaration comes later in the
 * built stylesheet is the one a canvas draws from. This gate reads only the
 * `@vscode/codicons` file. Both copies carry byte identical outlines today, so
 * no menu icon can be wrong, but a monaco upgrade that diverged would move the
 * drawn glyphs with nothing here going red. That is latent and it predates
 * Phase 153.
 *
 * It spawns nothing, launches no Electron, opens no profile, makes no request,
 * and reads exactly two files plus its own fixtures.
 *
 * Exit 0 when the set is clean, 1 when it is not.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[menu-glyphs]';

const SOURCE = join(
  repoRoot,
  'src',
  'renderer',
  'icons',
  'codicon-menu-icon.ts'
);
const STYLESHEET = join(
  repoRoot,
  'node_modules',
  '@vscode',
  'codicons',
  'dist',
  'codicon.css'
);

/** The closed set, read out of the one file that declares it. */
export function readNames(source) {
  const opened = source.indexOf('MENU_CODICONS = [');
  if (opened === -1) return null;
  const body = source.slice(opened).split('] as const')[0];
  return [...body.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

/** name → codepoint, read out of the stylesheet the DOM itself loads. */
export function readCodepoints(css) {
  const map = new Map();
  for (const m of css.matchAll(
    /\.codicon-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"\s*\}/g
  )) {
    map.set(m[1], m[2].toLowerCase());
  }
  return map;
}

/** Every complaint about one set against one stylesheet. */
export function check(names, codepoints) {
  const findings = [];
  if (names === null) {
    return ['MENU_CODICONS could not be read out of the source at all.'];
  }
  const seen = new Map();
  for (const name of names) {
    const point = codepoints.get(name);
    if (point === undefined) {
      findings.push(
        `"${name}" has no rule in the codicon stylesheet, so it would draw ` +
          'nothing and the row would silently lose its icon.'
      );
      continue;
    }
    const already = seen.get(point);
    if (already !== undefined) {
      findings.push(
        `"${name}" and "${already}" are both bound to U+${point.toUpperCase()}, ` +
          'so they draw the SAME picture. Two rows wearing one mark for two ' +
          'different verbs is a wrong icon, not a saving.'
      );
      continue;
    }
    seen.set(point, name);
  }
  const sorted = [...names].sort();
  if (JSON.stringify(names) !== JSON.stringify(sorted)) {
    findings.push(
      'MENU_CODICONS is not in alphabetical order, which is what makes it ' +
        'readable as a table.'
    );
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Prove the checker on fixtures it writes itself, before trusting its verdict
// ---------------------------------------------------------------------------

const FIXTURE_CSS =
  '.codicon-alpha:before { content: "\\ea01" }\n' +
  '.codicon-beta:before { content: "\\ea02" }\n' +
  '.codicon-beta-alias:before { content: "\\ea02" }\n';
const fixturePoints = readCodepoints(FIXTURE_CSS);

const fixtures = [
  {
    why: 'a clean set',
    names: ['alpha', 'beta'],
    want: 0
  },
  {
    why: 'a name the stylesheet does not carry',
    names: ['alpha', 'gamma'],
    want: 1
  },
  {
    why: 'two names bound to one codepoint',
    names: ['beta', 'beta-alias'],
    want: 1
  },
  {
    why: 'a set out of alphabetical order',
    names: ['beta', 'alpha'],
    want: 1
  }
];

let fixturesOk = true;
for (const one of fixtures) {
  const got = check(one.names, fixturePoints).length;
  if (got !== one.want) {
    console.error(
      `${TAG} the checker itself is wrong: ${one.why} produced ` +
        `${String(got)} findings, expected ${String(one.want)}.`
    );
    fixturesOk = false;
  }
}
if (!fixturesOk) process.exit(1);

// ---------------------------------------------------------------------------
// The real set
// ---------------------------------------------------------------------------

const names = readNames(readFileSync(SOURCE, 'utf8'));
const codepoints = readCodepoints(readFileSync(STYLESHEET, 'utf8'));
const findings = check(names, codepoints);

if (findings.length > 0) {
  for (const one of findings) console.error(`${TAG} ${one}`);
  console.error(
    `${TAG} FAILED. ${String(findings.length)} finding(s) in the menu icon set.`
  );
  process.exit(1);
}

console.log(
  `${TAG} OK: ${String(names.length)} menu glyphs, every one has a rule in ` +
    `the stylesheet, every one draws a different picture, and the ` +
    `stylesheet declares ${String(codepoints.size)} names in all. ` +
    `${String(fixtures.length)} fixtures behaved.`
);
