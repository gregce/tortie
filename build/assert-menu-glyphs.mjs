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
 * ## What Phase 156 added, and why the codepoints were not enough
 *
 * Phase 156 put the same marks on the application menu bar and on the tray
 * menu. Those are built in MAIN, before any window exists, so their PNGs are
 * generated at build time into `src/main/menu-icons.generated.ts` rather than
 * rasterized on demand. Three new checks cover that file, and the third is the
 * one that earned its place before it shipped.
 *
 *  3. THE GENERATED SET AND THE TABLE MUST AGREE NAME FOR NAME. A name in the
 *     table with no bitmap is a row that silently loses its mark in main, and a
 *     bitmap with no name is a mark nothing can wear.
 *  4. EVERY ENTRY MUST DECODE TO A 32×32 PNG. A truncated or mistyped data URL
 *     answers null from `menuIcon` and the row loses its mark quietly.
 *  5. NO TWO GENERATED BITMAPS MAY BE IDENTICAL. This is the byte level version
 *     of the codepoint check above and it sees what the codepoint check cannot.
 *     It catches a generator run where the font never loaded, which produces
 *     sixty valid PNGs of one blank box. It also caught a real defect on
 *     2026-08-25, and that defect is the reason this check exists rather than a
 *     hypothetical it guards against: the shipped font draws `source-control`
 *     at U+EA68 and `git-branch` at U+EC6F as ONE IDENTICAL OUTLINE, 284 ink
 *     pixels each, byte for byte the same PNG. The codepoints differ, so check
 *     2 passes and always would have. Only the bitmaps say so.
 *
 * That third check is also the only thing in this file that closes the monaco
 * blind spot recorded below, for the generated set, because it reads the bytes
 * that will actually ship rather than the stylesheet they came from.
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
 * and reads exactly three files plus its own fixtures.
 *
 * Exit 0 when the set is clean, 1 when it is not.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[menu-glyphs]';

// PHASE 156 moved the table into shared, because main builds the menu bar and
// the tray menu and may not import the renderer. The reason is written at the
// top of the file this now points at.
const SOURCE = join(repoRoot, 'src', 'shared', 'menu-codicons.ts');
// PHASE 156. The bitmaps main actually ships, generated from the table above by
// build/generate-menu-icons.mjs.
const GENERATED = join(repoRoot, 'src', 'main', 'menu-icons.generated.ts');
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
// PHASE 156: the generated bitmaps main ships
// ---------------------------------------------------------------------------

/** name → PNG data URL, read out of the generated module. */
export function readGenerated(source) {
  const map = new Map();
  for (const m of source.matchAll(
    /'([a-z0-9-]+)':\s*'(data:image\/png;base64,[A-Za-z0-9+/=]+)'/g
  )) {
    map.set(m[1], m[2]);
  }
  return map;
}

/**
 * One PNG's width, height and IDAT bytes, or null when it is not a PNG.
 *
 * Written by hand over the chunk structure rather than pulled from a library,
 * because this gate has no dependencies and must not grow one. `node:zlib` is a
 * builtin and does the only hard part.
 */
export function readPng(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  let raw;
  try {
    raw = Buffer.from(dataUrl.slice(comma + 1), 'base64');
  } catch {
    return null;
  }
  const MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (raw.length < 8 || !raw.subarray(0, 8).equals(MAGIC)) return null;
  let at = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (at + 8 <= raw.length) {
    const len = raw.readUInt32BE(at);
    const type = raw.subarray(at + 4, at + 8).toString('latin1');
    const body = raw.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      if (len < 8) return null;
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
    }
    if (type === 'IDAT') idat.push(body);
    at += 12 + len;
  }
  if (width === 0 || height === 0 || idat.length === 0) return null;
  let pixels;
  try {
    pixels = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }
  return { width, height, pixels };
}

/**
 * Every complaint about one generated set against one table of names.
 *
 * The third check is the one that is not decoration. Two names that draw the
 * same picture is the defect this whole file exists for, and the stylesheet
 * cannot see it when the two codepoints differ.
 */
export function checkGenerated(names, generated) {
  const findings = [];
  if (names === null) return findings;
  for (const name of names) {
    if (!generated.has(name)) {
      findings.push(
        `"${name}" is in the table but has no bitmap in the generated set, ` +
          'so a menu row built in main would silently lose its mark. Run ' +
          'node build/generate-menu-icons.mjs.'
      );
    }
  }
  for (const name of generated.keys()) {
    if (!names.includes(name)) {
      findings.push(
        `"${name}" has a bitmap in the generated set but is not in the ` +
          'table, so nothing can ever wear it. Run node ' +
          'build/generate-menu-icons.mjs.'
      );
    }
  }
  const bytesToName = new Map();
  for (const [name, dataUrl] of generated) {
    const png = readPng(dataUrl);
    if (png === null) {
      findings.push(
        `"${name}" does not decode to a PNG, so nativeImage would answer an ` +
          'empty image and the row would silently lose its mark.'
      );
      continue;
    }
    if (png.width !== 32 || png.height !== 32) {
      findings.push(
        `"${name}" is ${String(png.width)}×${String(png.height)} rather than ` +
          '32×32, so at scaleFactor 2 it would not be a 16pt mark.'
      );
      continue;
    }
    const key = png.pixels.toString('base64');
    const already = bytesToName.get(key);
    if (already !== undefined) {
      findings.push(
        `"${name}" and "${already}" are byte for byte the SAME bitmap, even ` +
          'though the stylesheet binds them to different codepoints. Two ' +
          'rows wearing one picture for two different verbs is a wrong icon. ' +
          'Every bitmap identical is what a generator run with no font looks ' +
          'like.'
      );
      continue;
    }
    bytesToName.set(key, name);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Prove the checkers on fixtures they write themselves, before trusting them
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
// The generated-set checker, proven on PNGs this gate builds itself (Phase 156)
// ---------------------------------------------------------------------------

/**
 * A real 32×32 PNG whose pixels are `fill`, built here with node:zlib.
 *
 * It is built rather than pasted for the reason Phase 153's own probe recorded
 * when it pasted one: a base64 string that decodes to a valid header and no
 * pixels would make every fixture below pass for the wrong reason.
 */
function makePng(fill, width = 32, height = 32) {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const x of buf) crc = table[(crc ^ x) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(width * 4 + 1);
    for (let x = 0; x < width; x += 1) row[1 + x * 4 + 3] = fill;
    rows.push(row);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

const PNG_A = makePng(10);
const PNG_B = makePng(20);
const PNG_SMALL = makePng(30, 16, 16);

const genFixtures = [
  {
    why: 'a clean generated set',
    names: ['alpha', 'beta'],
    generated: new Map([
      ['alpha', PNG_A],
      ['beta', PNG_B]
    ]),
    want: 0
  },
  {
    why: 'a name in the table with no bitmap',
    names: ['alpha', 'beta'],
    generated: new Map([['alpha', PNG_A]]),
    want: 1
  },
  {
    why: 'a bitmap for a name the table does not carry',
    names: ['alpha'],
    generated: new Map([
      ['alpha', PNG_A],
      ['beta', PNG_B]
    ]),
    want: 1
  },
  {
    why: 'a value that is not a PNG at all',
    names: ['alpha'],
    generated: new Map([['alpha', 'data:image/png;base64,bm90YXBuZw==']]),
    want: 1
  },
  {
    why: 'a PNG that is not 32 by 32',
    names: ['alpha'],
    generated: new Map([['alpha', PNG_SMALL]]),
    want: 1
  },
  {
    why: 'two names drawing one identical bitmap',
    names: ['alpha', 'beta'],
    generated: new Map([
      ['alpha', PNG_A],
      ['beta', PNG_A]
    ]),
    want: 1
  }
];

let genFixturesOk = true;
for (const one of genFixtures) {
  const got = checkGenerated(one.names, one.generated).length;
  if (got !== one.want) {
    console.error(
      `${TAG} the generated-set checker itself is wrong: ${one.why} produced ` +
        `${String(got)} findings, expected ${String(one.want)}.`
    );
    genFixturesOk = false;
  }
}
if (!genFixturesOk) process.exit(1);

// ---------------------------------------------------------------------------
// The real set
// ---------------------------------------------------------------------------

const names = readNames(readFileSync(SOURCE, 'utf8'));
const codepoints = readCodepoints(readFileSync(STYLESHEET, 'utf8'));
const generated = readGenerated(readFileSync(GENERATED, 'utf8'));
const findings = [
  ...check(names, codepoints),
  ...checkGenerated(names, generated)
];

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
    `The generated set main ships carries the same ` +
    `${String(generated.size)} names, every one decodes to a 32×32 PNG, and ` +
    `no two are the same bitmap. ` +
    `${String(fixtures.length + genFixtures.length)} fixtures behaved.`
);
