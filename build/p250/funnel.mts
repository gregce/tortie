#!/usr/bin/env -S node --import tsx
/**
 * PHASE 250, THE MEASURE STEP. MULTIPLY THE TWO REFUSALS TOGETHER, PRICE THE
 * TIGHTER SPELLING OF REFUSAL 8, AND FIND OUT WHETHER A RELATIVE PATH HAS A
 * BASE THAT CAN BE TRUSTED.
 *
 * It drives the SHIPPING modules rather than a model of them:
 * `src/shared/path-spans.ts` for the grammar, `src/shared/path-doors.ts` for
 * the decision and `src/main/fs/path-door.ts` for the filesystem half. So
 * every number below is a number about the code the operator is running.
 *
 * ITS LIVE MEASUREMENT IS GONE. It listed, captured and read the options of
 * his live sessions and read a copy of his manifest; it was removed on his
 * word of 2026-11-03 (Phase 352's question 5), and research 114 keeps the
 * numbers it took. What stays is the self-test, which conformance:pathdoors
 * rule 15 runs, and the fixtures.
 *
 * THE ONLY FILESYSTEM CALLS ANYWHERE ARE `lstat`, `realpath` AND `stat`, all
 * of them inside the shipping `factsForPath`. No path read out of a transcript
 * is opened, executed, followed into or written to. `shell.openPath` and
 * `shell.openExternal` are not imported and no Electron is launched.
 *
 * IT PRINTS COUNTS, RATES, EXTENSIONS AND SHAPES AND NEVER A PATH.
 *
 *   node_modules/.bin/tsx --tsconfig build/p250/tsconfig.json build/p250/funnel.mts
 *   ...--self-test    prove the graders, capture nothing, launch nothing
 *   ...--fixtures     the three screenshots and the attacks, over a scratch directory
 *
 * It is run through tsx with build/p250/tsconfig.json, which is the one thing
 * that teaches the loader the `@shared/*` alias the shipping main module uses.
 */

import {
  chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  edgeRefusal, looksLikePath, stripDecoration, tokensInRow
} from '../../src/shared/path-spans.ts';
import type { PathSpan } from '../../src/shared/path-spans.ts';
import { couldBeAbsolute } from '../../src/shared/path-doors.ts';
import { answerPathDoor } from '../../src/main/fs/path-door.ts';

const TAG = '[p250]';
const say = (l: string): void => { console.log(`${TAG} ${l}`); };

// ---------------------------------------------------------------------------
// The gutter, copied from the shipping module because it is not exported. The
// self test asserts this copy finds a row's head where the shipping
// `edgeRefusal` finds it, so a drift in the product turns a fixture red here.
// ---------------------------------------------------------------------------
const GUTTER = /^(?:\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;

/**
 * A DISPLAY WIDTH, because a row's string length is not the column its last
 * glyph sits in — the same fact `cellColumns` exists for in the shipping
 * module. This is an approximation of xterm's own arithmetic and it is stated
 * as one: zero for a combining mark, a variation selector and a ZWJ, two for
 * the wide and emoji blocks, one otherwise. Every reading that uses it also
 * reports how many of its rows were pure ASCII, where it is exact.
 */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c >= 0x0300 && c <= 0x036f) || (c >= 0xfe00 && c <= 0xfe0f) || c === 0x200d) continue;
    if (
      (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1f64f) ||
      (c >= 0x1f900 && c <= 0x1f9ff) || (c >= 0x20000 && c <= 0x3fffd)
    ) { w += 2; continue; }
    w += 1;
  }
  return w;
}

/**
 * THE TIGHTER SPELLING OF REFUSAL 8, which research 111 section 4.1 named and
 * did not adopt. It refuses a span that RUNS OFF the edge rather than one that
 * merely ENDS at the last glyph:
 *
 *   - the span's last cell is the pane's last COLUMN, which is the only shape
 *     a terminal wrap can take; or
 *   - the span starts a row whose PREDECESSOR filled its own last column,
 *     which is the other half of the same split.
 *
 * Everything it needs is readable in the renderer: the row's width is
 * `IBufferLine.length`, the span's last column comes from the map
 * `cellColumns` already builds, and THE PREDECESSOR IS MEASURED BY ITS DRAWN
 * CONTENT — the `replace(/\s+$/, '')` on the first line of the body below,
 * which is what `translateToString(true)` and `tmux capture-pane` both hand
 * back. Nothing here reads `isWrapped`, which research 107 measured lying in
 * both directions.
 *
 * THAT LAST CLAUSE IS THE WHOLE DIFFERENCE FROM `research111EdgeRefusal`
 * BELOW, and this comment used to deny it: it said the row above is read
 * untrimmed with `translateToString(false)`, which is that function's clause
 * and not this one's, while the body it sat on top of trimmed the row before
 * measuring it. Research 114 section 3.1 carried the same sentence and section
 * 8 told the next round to implement it, so a reader who believed the prose
 * would have shipped the spelling that refuses 41 of 272 in place of the one
 * that refuses 3. The parameter is still named `rawAbove` because the CALLER
 * has only the raw row; the trim is this function's own first act.
 */
export function tightEdgeRefusal(
  span: PathSpan,
  row: string,
  rawAbove: string | null,
  width: number
): boolean {
  if (displayWidth(row.slice(0, span.end)) >= width) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  if (rawAbove === null) return false;
  const drawn = rawAbove.replace(/\s+$/, '');
  if (displayWidth(drawn) < width) return false;
  // ...AND the character it ended on is one a path can continue with, which is
  // the shipped rule's own second half. A predecessor that filled its row and
  // ended in a space did not carry a path over the break.
  return /[A-Za-z0-9._@%+~$/-]/.test(drawn[drawn.length - 1] ?? '');
}

/**
 * REFUSAL 8 AS PHASE 247 SHIPPED IT, and it lives here now (the fix round).
 *
 * This file measures three spellings against each other, and one of them —
 * the one every "at the parent" number in research 114 is taken from — used
 * to be the imported `edgeRefusal`. Phase 250 then CHANGED that function, in
 * shape as well as in name: its third parameter went from the row above as a
 * string to a `RowEdges` object. So the import stopped meaning "the rule at
 * the parent" and started meaning "the rule this file recommended", and it
 * stopped working at all — run at HEAD, `--self-test` died with
 * `Cannot read properties of null (reading 'columns')` on its sixth check.
 * Nothing went red, because tsx strips the types, `build/p250` is outside
 * `tsc -b`, and this file is in no gate.
 *
 * A measure step whose helper cannot be run is a document, so the Phase 247
 * spelling is a fixed reference point here, copied from `path-spans.ts` at
 * `2ca274ca`, and the SHIPPING `edgeRefusal` is still imported — used now for
 * the one thing an import is good for, which is asking whether what shipped
 * and what this file measured are still the same rule. See `selfTest`.
 */
export function phase247EdgeRefusal(
  span: PathSpan,
  row: string,
  rowAbove: string | null
): boolean {
  if (span.end === row.length) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  if (rowAbove === null || rowAbove.length === 0) return false;
  return /[A-Za-z0-9._@%+~$/-]/.test(rowAbove[rowAbove.length - 1] ?? '');
}

/**
 * RESEARCH 114 SECTION 3.1's SENTENCE TAKEN LITERALLY (the fix round).
 *
 * That section's quoted rule is the one above, and the paragraph under it used
 * to say the row above is "read untrimmed with `translateToString(false)`" —
 * so this is that paragraph joined to that rule: the raw predecessor, and the
 * path-character clause KEPT, which is the half section 3.1 never dropped.
 *
 * It is here to be counted rather than argued about. The fix round's first
 * reading of the corrected sentence repeated a cost of "41 of 272 instead of
 * 3" for it, and that number belongs to `research111EdgeRefusal` below, which
 * drops the path-character clause as WELL as the trim.
 *
 * MEASURED over 32 of the operator's live panes and 82,425 physical rows, this
 * spelling refuses **310 grammar spans and 2 of 280 door-reaching absolute
 * spans**, which is EXACTLY what `tightEdgeRefusal` refuses; research 111's
 * refuses 638 and 39, and Phase 247's refused 4,649 and 81. The reason is one
 * character: a row padded out to the width ends in a SPACE, and a space is not
 * a character a path continues with, so the clause section 3.1 keeps absorbs
 * the clause it got wrong. `conformance:pathdoors` rule 15 pins that, and its
 * ablation is both clauses rather than one.
 */
export function section31EdgeRefusal(
  span: PathSpan,
  row: string,
  rawAbove: string | null,
  width: number
): boolean {
  if (displayWidth(row.slice(0, span.end)) >= width) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  if (rawAbove === null) return false;
  if (displayWidth(rawAbove) < width) return false;
  return /[A-Za-z0-9._@%+~$/-]/.test(rawAbove[rawAbove.length - 1] ?? '');
}

/**
 * RESEARCH 111 SECTION 4.1's OWN SPELLING, kept beside the one above so the
 * two can be priced against each other rather than one being adopted on the
 * other's numbers. It differs in two places and both matter: it measures the
 * predecessor's RAW length, trailing spaces included, and it drops the
 * path-character test the shipped rule carries.
 */
export function research111EdgeRefusal(
  span: PathSpan,
  row: string,
  rawAbove: string | null,
  width: number
): boolean {
  if (span.end >= width) return true;
  const head = row.replace(GUTTER, '');
  const headAt = row.length - head.length;
  if (span.start !== headAt) return false;
  if (rawAbove === null) return false;
  return rawAbove.length >= width;
}

/** A relative target joined to a base, or null when there is nothing to join. */
export function joinToBase(base: string, target: string): string | null {
  if (base === '' || !isAbsolute(base)) return null;
  if (target.startsWith('/') || target.startsWith('~')) return null;
  return resolvePath(base, target);
}

// ---------------------------------------------------------------------------
// The self test. It captures nothing and launches nothing.
// ---------------------------------------------------------------------------
function selfTest(): number {
  let bad = 0;
  const check = (ok: boolean, why: string): void => {
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${why}`);
  };
  check(displayWidth('abc') === 3, 'ascii is one column a character');
  check(displayWidth('日本') === 4, 'a CJK character is two columns');
  check(displayWidth('é') === 1, 'a combining acute adds no column');
  check(displayWidth('\u{1f469}‍\u{1f469}') === 4, 'a ZWJ adds no column of its own');
  const row = 'see /etc/hosts';
  const span = tokensInRow(row).find((t) => t.text === '/etc/hosts');
  check(span !== undefined, 'the shipping tokenizer finds the span');
  if (span !== undefined) {
    check(phase247EdgeRefusal(span, row, null) === true,
      'THE PHASE 247 refusal 8 refuses a path that ENDS its row, which is his first screenshot');
    check(tightEdgeRefusal(span, row, null, 120) === false,
      'the TIGHT spelling admits it, because it stops far short of the last column');
    check(tightEdgeRefusal(span, row, null, 14) === true,
      'the TIGHT spelling still refuses it when the span DOES reach the last column — a wrapped path stays refused');
  }
  const head = '/etc/hosts and more';
  const hs = tokensInRow(head).find((t) => t.text === '/etc/hosts');
  check(hs !== undefined && tightEdgeRefusal(hs, head, 'y'.repeat(62), 62) === true,
    'a span at the head of a row whose PREDECESSOR filled its own last column is refused');
  check(hs !== undefined && tightEdgeRefusal(hs, head, 'short', 62) === false,
    '...and admitted when the predecessor did not');
  const gut = '  ⎿ /etc/hosts and more';
  const gs = tokensInRow(gut).find((t) => t.text === '/etc/hosts');
  check(gs !== undefined && tightEdgeRefusal(gs, gut, 'y'.repeat(62), 62) === true,
    'the gutter copy finds the row head the way the shipping edgeRefusal does');
  check(gs !== undefined && phase247EdgeRefusal(gs, gut, 'y'.repeat(62)) === true,
    '...which the PHASE 247 edgeRefusal confirms on the same row');

  // WHAT SHIPPED AND WHAT THIS FILE MEASURED ARE THE SAME RULE, asked rather
  // than assumed (the fix round). Research 114 section 3.1 described the
  // adopted spelling with research 111 section 4.1's own clause — the
  // predecessor read UNTRIMMED — and section 8 line 1 told the next round to
  // implement section 3.1. Every number in that document came out of
  // `tightEdgeRefusal`, which trims on its first line, so the prose and the
  // arithmetic disagreed and only the prose was reviewable. These four rows
  // ask the SHIPPING `edgeRefusal` the same questions the tight spelling is
  // asked, over pure ASCII where a string index and a cell column are the same
  // number, and the padded one is the row that tells the two spellings apart:
  // implement section 3.1 as it was written and the last check goes red.
  const shipped = (text: string, sp: PathSpan, ab: string | null, width: number, aboveEnd: number | null): boolean =>
    edgeRefusal(sp, text, {
      width,
      columns: [...text].map((_, i) => i).concat([text.length]),
      above: ab,
      aboveEnd
    });
  const hd = '/b.md and more text';
  const hspan = tokensInRow(hd).find((t) => t.text === '/b.md');
  if (span !== undefined && hspan !== undefined) {
    check(shipped(row, span, null, 120, 0) === tightEdgeRefusal(span, row, null, 120),
      'the SHIPPED rule and the one this file measured agree on a path that ends its row');
    check(shipped(row, span, null, 14, 0) === tightEdgeRefusal(span, row, null, 14),
      '...and on one whose last cell IS the pane’s last column');
    check(shipped(hd, hspan, 'wrote /a', 8, 8) === tightEdgeRefusal(hspan, hd, 'wrote /a', 8),
      '...and at a row’s head below a predecessor that really filled its own');
    check(
      shipped(hd, hspan, 'wrote /a', 80, 8) === false
        && tightEdgeRefusal(hspan, hd, 'wrote /a'.padEnd(80, ' '), 80) === false
        && research111EdgeRefusal(hspan, hd, 'wrote /a'.padEnd(80, ' '), 80) === true,
      'THE PADDED PREDECESSOR is where the two spellings part, and the shipped rule is on the measured side of it'
    );
  }
  check(joinToBase('/a/b', 'c/d.md') === '/a/b/c/d.md', 'a relative target joins to its base');
  check(joinToBase('/a/b', '../c.md') === '/a/c.md', 'a .. climbs, which is why it is counted');
  check(joinToBase('/a/b', '/c.md') === null, 'an absolute target is not a relative one');
  check(joinToBase('', 'c.md') === null, 'an empty base joins nothing');
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The fixtures: his three screenshots, and the attacks the lifts open.
// Files are made in a scratch directory removed in a `finally`. Nothing is
// opened, read or executed: every answer is lstat, realpath and stat.
// ---------------------------------------------------------------------------
async function fixtures(): Promise<number> {
  const dir = mkdtempSync(`${tmpdir()}/p250-`);
  let bad = 0;
  const check = (got: string, want: string, why: string): void => {
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${got.padEnd(30)} — ${why}`);
  };
  try {
    const proj = `${dir}/project`;
    mkdirSync(`${proj}/docs/reviews`, { recursive: true });
    writeFileSync(`${proj}/README.md`, '# readme\n');
    writeFileSync(`${proj}/docs/reviews/a-decision.md`, 'x\n');
    const other = `${dir}/other`;
    mkdirSync(`${other}/docs/reviews`, { recursive: true });
    writeFileSync(`${other}/docs/reviews/a-decision.md`, 'a DIFFERENT file with the same relative name\n');

    /** what one row offers, under a named spelling of refusal 8 and a base. */
    const offer = async (
      row: string, above: string | null, width: number, tight: boolean, base: string | null
    ): Promise<string> => {
      const out: string[] = [];
      for (const span of tokensInRow(row)) {
        if (!looksLikePath(span.text)) continue;
        const refused = tight
          ? tightEdgeRefusal(span, row, above, width)
          : phase247EdgeRefusal(span, row, above);
        if (refused) { out.push('refused:edge'); continue; }
        const { target } = stripDecoration(span.text);
        let spelling = target;
        if (!couldBeAbsolute(target)) {
          const j = base === null ? null : joinToBase(base, target);
          if (j === null) { out.push('refused:not-absolute'); continue; }
          spelling = j;
        }
        const a = await answerPathDoor(spelling);
        out.push(a.door === null ? `refused:${a.refusal}` : a.door);
      }
      return out.join(',');
    };

    console.log(`${TAG} --- SCREENSHOT 1: an absolute, existing README on a line of its own ---`);
    const r1 = `${proj}/README.md`;
    check(await offer(r1, null, 120, false, null), 'refused:edge',
      'AT HEAD today: refusal 8 refuses it because the span ends the row');
    check(await offer(r1, null, 120, true, null), 'editor',
      'LIFT ONE alone fixes it: the row is far short of the pane width');
    check(await offer(r1, null, r1.length, true, null), 'refused:edge',
      'and it is still refused when the span really does reach the last column');

    console.log(`${TAG} --- SCREENSHOT 2: a relative path mid-sentence with a trailing colon ---`);
    const r2 = 'I wrote docs/reviews/a-decision.md: it explains the choice';
    check(await offer(r2, null, 120, false, null), 'refused:not-absolute',
      'AT HEAD: the grammar yields it, refusal 8 lets it through, and not-absolute drops it');
    check(await offer(r2, null, 120, true, null), 'refused:not-absolute',
      'LIFT ONE does nothing for it');
    check(await offer(r2, null, 120, true, proj), 'editor',
      'LIFT TWO fixes it — against the RIGHT base');
    check(await offer(r2, null, 120, true, other), 'editor',
      'AND AGAINST THE WRONG BASE IT ALSO OPENS, a different file, silently. This is the whole risk');

    console.log(`${TAG} --- SCREENSHOT 3: a relative path at the END of a row, and with :93 ---`);
    const r3 = 'see docs/reviews/a-decision.md';
    check(await offer(r3, null, 120, false, proj), 'refused:edge',
      'AT HEAD both refusals fire, and refusal 8 fires FIRST');
    check(await offer(r3, null, 120, true, proj), 'editor',
      'it needs BOTH lifts');
    const r4 = 'see docs/reviews/a-decision.md:93 for the line';
    check(await offer(r4, null, 120, true, proj), 'editor',
      'a :line suffix is stripped by the shipping stripDecoration');

    console.log(`${TAG} --- THE ATTACKS the lifts open ---`);
    check(await offer('see ../other/docs/reviews/a-decision.md now', null, 120, true, proj), 'editor',
      'A RELATIVE PATH CLIMBS OUT OF ITS BASE WITH .. and lands where the base does not reach');
    mkdirSync(`${proj}/bin`, { recursive: true });
    writeFileSync(`${proj}/bin/go.sh`, '#!/bin/sh\n');
    chmodSync(`${proj}/bin/go.sh`, 0o755);
    check(await offer('run bin/go.sh now', null, 120, true, proj), 'refused:executable-bit',
      'a resolved relative path is asked the SAME mode question: the sequence does not care how the spelling was made');
    writeFileSync(`${proj}/.env`, 'SECRET=1\n');
    check(await offer('read .env now', null, 120, true, proj), '',
      'a bare .env has no slash, so the grammar never yields it at all');
    check(await offer('read config/.env now', null, 120, true, proj), 'refused:missing',
      'a relative secret name under a directory that is not there is refused as missing');
    mkdirSync(`${proj}/config`, { recursive: true });
    writeFileSync(`${proj}/config/.env`, 'SECRET=1\n');
    check(await offer('read config/.env now', null, 120, true, proj), 'refused:secret-name',
      '...and refused by NAME once it is there, because the resolved path goes through looksLikeSecretPath');
    const app = `${proj}/Thing.app`;
    mkdirSync(`${app}/Contents`, { recursive: true });
    writeFileSync(`${app}/Contents/Info.plist`, '<plist/>');
    check(await offer('open Thing.app/Contents now', null, 120, true, proj), 'refused:not-a-regular-file',
      'a resolved relative directory is never a link');
    symlinkSync(app, `${proj}/pic.png`);
    check(await offer('see docs/../pic.png now', null, 120, true, proj), 'refused:bundle',
      'a relative symlink whose LEAF is a bundle is refused on the realpath, exactly as an absolute one is');
    check(await offer('see /Volumes/x/docs/a.md now', null, 120, true, proj), 'refused:mount',
      'a mount is refused before any call');
    mkdirSync(`${proj}/d/d/d`, { recursive: true });
    writeFileSync(`${proj}/d/d/d/f.md`, 'x');
    check(await offer('nested d/d/d/f.md here', null, 120, true, proj), 'editor',
      'an ordinary nested relative path opens');
    writeFileSync(`${proj}/docs/paper.pdf`, '%PDF-1.4\n');
    // PHASE 253 admitted a bare FILE-SHAPED name to the grammar (research 115
    // §5), joined to the base exactly as a relative path is. This one is not
    // at the project root, so the join answers missing — the spelling means
    // "paper.pdf under the base" and nothing else, which is the cheap
    // design's own honesty about ambiguity.
    check(await offer('read paper.pdf now', null, 120, true, proj), 'refused:missing',
      'A BARE FILE-SHAPED NAME IS A CANDIDATE NOW (Phase 253), joined to the base, and this one is not at the root');
    check(await offer('read some words now', null, 120, true, proj), '',
      'a bare WORD is still never a candidate — the file-shaped grammar is the filter');
    check(await offer('read docs/paper.pdf now', null, 120, true, proj), 'mac',
      'A RESOLVED RELATIVE PATH REACHES THE MAC DOOR TODAY — which is the asymmetry this phase must rule on');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

const DIRECT = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (DIRECT) {
  if (process.argv.includes('--self-test')) process.exit(selfTest());
  else if (process.argv.includes('--fixtures')) process.exit(await fixtures());
  else {
    console.error(`${TAG} the live measurement was removed on his word of 2026-11-03; --self-test and --fixtures remain.`);
    process.exit(2);
  }
}
