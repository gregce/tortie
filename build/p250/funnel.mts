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
 * It LISTS, SHOWS OPTIONS and CAPTURES on `-L gmux` and does nothing else: it
 * never attaches, never sends a key, never kills a session, never starts an
 * agent, spends no token. A session with no `@gmux-agent` option is not ours
 * and is skipped. The manifest is read from a COPY, never in place.
 *
 * THE ONLY FILESYSTEM CALLS ANYWHERE ARE `lstat`, `realpath` AND `stat`, all
 * of them inside the shipping `factsForPath`. No path read out of a transcript
 * is opened, executed, followed into or written to. `shell.openPath` and
 * `shell.openExternal` are not imported and no Electron is launched.
 *
 * IT PRINTS COUNTS, RATES, EXTENSIONS AND SHAPES AND NEVER A PATH.
 *
 *   P250_MANIFEST=<a copy of manifest.db> \
 *     node_modules/.bin/tsx --tsconfig build/p250/tsconfig.json build/p250/funnel.mts
 *   ...--self-test    prove the graders, capture nothing, launch nothing
 *   ...--fixtures     the three screenshots and the attacks, over a scratch directory
 *
 * It is run through tsx with build/p250/tsconfig.json, which is the one thing
 * that teaches the loader the `@shared/*` alias the shipping main module uses.
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  edgeRefusal, looksLikePath, pathSpansInRow, stripDecoration, tokensInRow
} from '../../src/shared/path-spans.ts';
import type { PathSpan } from '../../src/shared/path-spans.ts';
import { couldBeAbsolute } from '../../src/shared/path-doors.ts';
import type { PathDoorAnswer } from '../../src/shared/path-doors.ts';
import { answerPathDoor } from '../../src/main/fs/path-door.ts';

const TAG = '[p250]';
const say = (l: string): void => { console.log(`${TAG} ${l}`); };
const pct = (n: number, d: number): string => (d === 0 ? '0.0' : ((100 * n) / d).toFixed(1));

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
 * `cellColumns` already builds, and the row above is read untrimmed with
 * `translateToString(false)`. Nothing here reads `isWrapped`, which research
 * 107 measured lying in both directions.
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

// ---------------------------------------------------------------------------
// The corpus. LIST, SHOW OPTIONS, LIST PANES and CAPTURE. Nothing else.
// ---------------------------------------------------------------------------
interface Pane {
  sid: string;
  agent: string;
  gmuxId: string;
  width: number;
  paneCwd: string;
  raw: string[];
  rows: string[];
  joinedText: string;
}

function tmux(...a: string[]): string {
  return execFileSync('tmux', ['-L', 'gmux', ...a], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024
  });
}

export function liveSessionCount(): number {
  try {
    return tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function capture(): Pane[] {
  let sessions: string[];
  try {
    sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
  } catch {
    console.error(`${TAG} no sessions on -L gmux. Nothing to measure.`);
    process.exit(2);
  }
  const panes: Pane[] = [];
  for (const sid of sessions) {
    let agent = '';
    let gmuxId = '';
    try {
      const opts = tmux('show-options', '-t', sid).split('\n');
      agent = opts.find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
      gmuxId = opts.find((l) => l.startsWith('@gmux-id '))?.slice(9).trim() ?? '';
    } catch { continue; }
    if (agent === '') continue;               // not ours: never adopt it
    let width = 80;
    let paneCwd = '';
    try {
      const first = tmux('list-panes', '-t', sid, '-F', '#{pane_width}\t#{pane_current_path}')
        .trim().split('\n')[0] ?? '';
      const [w, p] = first.split('\t');
      width = Number(w) || 80;
      paneCwd = p ?? '';
    } catch { /* keep the defaults */ }
    let plain = '';
    let joined = '';
    try { plain = tmux('capture-pane', '-p', '-N', '-S', '-', '-t', sid); } catch { continue; }
    try { joined = tmux('capture-pane', '-p', '-J', '-S', '-', '-t', sid); } catch { joined = ''; }
    const raw = plain.split('\n');
    panes.push({
      sid, agent, gmuxId, width, paneCwd,
      raw,
      rows: raw.map((r) => r.replace(/\s+$/, '')),
      joinedText: joined
    });
  }
  return panes;
}

/** The manifest's two bases, read from a COPY handed in by name. */
function manifestBases(dbCopy: string): Map<string, { project: string; cwd: string }> {
  const out = new Map<string, { project: string; cwd: string }>();
  if (dbCopy === '') return out;
  let text = '';
  try {
    text = execFileSync('sqlite3', [dbCopy, '-separator', '\t',
      'select id, project_path, cwd from sessions;'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch { return out; }
  for (const line of text.split('\n')) {
    const [id, project, cwd] = line.split('\t');
    if (id === undefined || project === undefined || cwd === undefined) continue;
    if (id.length === 0) continue;
    out.set(id, { project, cwd });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The door, memoised by spelling. Every answer comes from the SHIPPING
// sequence; nothing here re-implements a clause of it.
// ---------------------------------------------------------------------------
const doorMemo = new Map<string, PathDoorAnswer>();
let doorCalls = 0;
async function doorFor(spelling: string): Promise<PathDoorAnswer> {
  const held = doorMemo.get(spelling);
  if (held !== undefined) return held;
  doorCalls += 1;
  const answer = await answerPathDoor(spelling);
  doorMemo.set(spelling, answer);
  return answer;
}

const bump = <K>(m: Map<K, number>, k: K): void => { m.set(k, (m.get(k) ?? 0) + 1); };
const top = <K>(m: Map<K, number>, n: number): [K, number][] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

/** A relative target joined to a base, or null when there is nothing to join. */
export function joinToBase(base: string, target: string): string | null {
  if (base === '' || !isAbsolute(base)) return null;
  if (target.startsWith('/') || target.startsWith('~')) return null;
  return resolvePath(base, target);
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
interface RelRecord {
  target: string;
  pane: number;
  paneAgent: string;
  climbs: boolean;
  /** realpath per base index, or null when that base gives no door. */
  doors: (string | null)[];
  /** the door word or the refusal word per base index. */
  words: (string | null)[];
}

async function run(dbCopy: string): Promise<number> {
  const before = liveSessionCount();
  const panes = capture();
  const bases = manifestBases(dbCopy);

  // ---- the funnel -------------------------------------------------------
  let rows = 0, tokens = 0, grammar = 0, afterEdge = 0, afterRelative = 0, reached = 0;
  let tildeSpans = 0, mountRefused = 0;
  const refusals = new Map<string, number>();
  const doorsBy = new Map<string, number>();
  const distinctGrammar = new Set<string>();
  const distinctAfterEdge = new Set<string>();
  const distinctAbsolute = new Set<string>();
  const distinctDoor = new Set<string>();
  const distinctRelative = new Set<string>();
  const perAgent = new Map<string, { panes: number; rows: number; grammar: number; edge: number; rel: number; door: number }>();

  // ---- lift one ---------------------------------------------------------
  let edgeShipped = 0, edgeTight = 0, edgeGain = 0;
  let gainDoor = 0, gainWrapped = 0, gainWrappedDoor = 0;
  let tightAtColumn = 0, tightAtColumnWrapped = 0;
  let asciiRows = 0;
  const gainExt = new Map<string, number>();
  const gainDistinct = new Set<string>();
  let gainRelative = 0;
  // research 111 section 4.1's own denominator: ABSOLUTE spans whose realpath
  // is a regular file, whether or not an edge rule refuses them. 78 and 34 are
  // the numbers it published, and this is what re-derives them.
  let fileSpans = 0, fileEdgeShipped = 0, fileEdgeTight = 0, fileEdge111 = 0;
  let edge111 = 0;
  const shortfall = new Map<number, number>();
  let paddedRows = 0;
  // A span the oracle calls wrapped but which is FOLLOWED BY WHITESPACE on its
  // own raw row cannot have been cut by the terminal: the wrap happened in the
  // padding. This is what tells a real truncation from a padded row.
  let gainWrappedDoorFlush = 0, gainWrappedDoorPadded = 0;
  const doorUnion = new Set<string>();

  // ---- lift two ---------------------------------------------------------
  const rel: RelRecord[] = [];
  /** every grammar span, kept so the two lifts can be composed at the end. */
  const every: { target: string; pane: number; shipped: boolean; tight: boolean }[] = [];
  const paneBases: { project: string; cwd: string; pane: string }[] = [];
  const absSeen: Set<string>[] = [];

  for (const [pi, pane] of panes.entries()) {
    const m = bases.get(pane.gmuxId) ?? { project: '', cwd: '' };
    paneBases.push({ project: m.project, cwd: m.cwd, pane: pane.paneCwd });
    absSeen.push(new Set<string>());
    const pa = perAgent.get(pane.agent) ?? { panes: 0, rows: 0, grammar: 0, edge: 0, rel: 0, door: 0 };
    pa.panes += 1; pa.rows += pane.rows.length;
    perAgent.set(pane.agent, pa);
    const oneLineMemo = new Map<number, boolean>();
    const rowsAreOneLine = (i: number): boolean => {
      const held = oneLineMemo.get(i);
      if (held !== undefined) return held;
      const a = pane.raw[i] ?? '';
      const b = pane.raw[i + 1] ?? '';
      const probe = a + b.slice(0, Math.min(20, b.length));
      const answer = a.length > 0 && b.length > 0 && pane.joinedText.includes(probe);
      oneLineMemo.set(i, answer);
      return answer;
    };

    for (const [i, row] of pane.rows.entries()) {
      rows += 1;
      if (/^[\x20-\x7e]*$/.test(row)) asciiRows += 1;
      if ((pane.raw[i] ?? '').length >= pane.width && displayWidth(row) < pane.width) paddedRows += 1;
      const above = i > 0 ? (pane.rows[i - 1] ?? null) : null;
      const rawAbove = i > 0 ? (pane.raw[i - 1] ?? null) : null;
      const all = tokensInRow(row);
      tokens += all.length;
      for (const span of all) {
        if (!looksLikePath(span.text)) continue;
        grammar += 1; pa.grammar += 1;
        const { target } = stripDecoration(span.text);
        if (target.length === 0) continue;
        distinctGrammar.add(target);
        if (target.startsWith('/')) (absSeen[pi] as Set<string>).add(target);
        const shipped = edgeRefusal(span, row, above);
        const tight = tightEdgeRefusal(span, row, rawAbove, pane.width);
        const r111 = research111EdgeRefusal(span, row, rawAbove, pane.width);
        if (r111) edge111 += 1;
        if (shipped) edgeShipped += 1;
        // WHICH BREAK COULD HAVE CUT THIS SPAN. A span that ENDS its row can
        // only have been cut by the break BELOW it, and a span at a row's HEAD
        // only by the break ABOVE it. Asking the oracle about the wrong break
        // is the mistake this comment exists to stop: the first version of
        // this helper asked `rowsAreOneLine(i)` for both and read three
        // truncations that could not have happened.
        const atRightEdge = span.end === row.length;
        const wrappedForThisSpan = atRightEdge
          ? rowsAreOneLine(i)
          : i > 0 && rowsAreOneLine(i - 1);
        if (tight) {
          edgeTight += 1;
          if (displayWidth(row.slice(0, span.end)) >= pane.width) {
            tightAtColumn += 1;
            if (wrappedForThisSpan) tightAtColumnWrapped += 1;
          }
        }
        every.push({ target, pane: pi, shipped, tight });
        const isRel = !couldBeAbsolute(target);
        if (!isRel) {
          const a = await doorFor(target);
          // research 111 section 4.1's denominator, asked before any edge rule
          if (a.door === 'editor' || a.door === 'image' || a.door === 'mac') {
            fileSpans += 1;
            if (shipped) fileEdgeShipped += 1;
            if (tight) fileEdgeTight += 1;
            if (r111) fileEdge111 += 1;
            if (!tight) doorUnion.add(a.path);
          }
        }
        if (shipped && !tight) {
          edgeGain += 1;
          if (isRel) gainRelative += 1;
          const wrapped = wrappedForThisSpan;
          if (wrapped) gainWrapped += 1;
          if (!isRel) {
            const a = await doorFor(target);
            if (a.door !== null) {
              gainDoor += 1;
              gainDistinct.add(a.path);
              bump(gainExt, extname(a.path).toLowerCase() || '(none)');
              if (wrapped) {
                gainWrappedDoor += 1;
                // is there whitespace between the span and the row's edge?
                // For a span that ENDS its row the question is whether anything
                // but whitespace sits between it and the row's edge; for one at
                // a row's HEAD it is whether the row above ended in whitespace.
                // Either way, a break that fell in the padding cannot have cut
                // the path, whatever the oracle says about the two rows.
                const rawHere = atRightEdge ? (pane.raw[i] ?? '') : (pane.raw[i - 1] ?? '');
                const padded = atRightEdge
                  ? rawHere.length > span.end && /^\s+$/.test(rawHere.slice(span.end))
                  : /\s$/.test(rawHere);
                if (padded) {
                  gainWrappedDoorPadded += 1;
                } else {
                  gainWrappedDoorFlush += 1;
                  bump(shortfall, pane.width - displayWidth(atRightEdge ? row : (pane.rows[i - 1] ?? '')));
                }
              }
            }
          }
        }
        if (shipped) continue;
        afterEdge += 1; pa.edge += 1;
        distinctAfterEdge.add(target);
        if (isRel) {
          distinctRelative.add(target);
          pa.rel += 1;
          rel.push({
            target, pane: pi, paneAgent: pane.agent,
            climbs: target.split('/').includes('..'),
            doors: [], words: []
          });
          continue;
        }
        afterRelative += 1;
        if (target.startsWith('~')) tildeSpans += 1;
        distinctAbsolute.add(target);
        const answer = await doorFor(target);
        if (answer.door === null) {
          bump(refusals, answer.refusal);
          if (answer.refusal === 'mount') mountRefused += 1;
          continue;
        }
        reached += 1; pa.door += 1;
        distinctDoor.add(answer.path);
        bump(doorsBy, answer.door);
      }
    }
  }

  // internal check: the funnel's survivors are exactly what pathSpansInRow yields
  let shippingSpans = 0;
  for (const pane of panes) {
    for (const [i, row] of pane.rows.entries()) {
      shippingSpans += pathSpansInRow(row, i > 0 ? (pane.rows[i - 1] ?? null) : null).length;
    }
  }

  console.log('');
  say(`corpus: ${String(panes.length)} of ${String(before)} live sessions are ours, ${String(rows)} physical rows`);
  say(`sessions on -L gmux before ${String(before)}, after ${String(liveSessionCount())}`);
  console.log('');
  say('THE FUNNEL — the two refusals multiplied together, through the SHIPPING grammar and the SHIPPING door');
  say(`  whitespace tokens                                  ${String(tokens).padStart(7)}`);
  say(`  spans the GRAMMAR yields (looksLikePath)           ${String(grammar).padStart(7)}   distinct targets ${String(distinctGrammar.size)}`);
  say(`  survive REFUSAL 8 (edgeRefusal)                    ${String(afterEdge).padStart(7)} (${pct(afterEdge, grammar)}% of the grammar)   distinct ${String(distinctAfterEdge.size)}`);
  say(`  survive NOT-ABSOLUTE (couldBeAbsolute)             ${String(afterRelative).padStart(7)} (${pct(afterRelative, grammar)}% of the grammar)   distinct ${String(distinctAbsolute.size)}`);
  say(`  REACH A DOOR                                       ${String(reached).padStart(7)} (${pct(reached, grammar)}% of the grammar)   distinct files ${String(distinctDoor.size)}`);
  say(`  cross-check: the shipping pathSpansInRow yields    ${String(shippingSpans).padStart(7)}   (must equal the refusal-8 survivor count)`);
  say(`  spellings starting with ~ that main expands: ${String(tildeSpans)}; refused mounts: ${String(mountRefused)}; door calls so far: ${String(doorCalls)}`);
  say(`  THE DOORS: ${[...doorsBy.entries()].map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);
  say(`  THE REFUSALS after not-absolute: ${[...refusals.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${String(v)}`).join(', ')}`);
  console.log('');
  say('PER AGENT');
  for (const [a, v] of [...perAgent.entries()].sort()) {
    say(`  ${a.padEnd(8)} panes ${String(v.panes).padStart(3)}  rows ${String(v.rows).padStart(6)}  grammar ${String(v.grammar).padStart(5)}  survive refusal 8 ${String(v.edge).padStart(5)}  relative ${String(v.rel).padStart(5)}  reach a door ${String(v.door).padStart(4)}`);
  }

  console.log('');
  say('LIFT ONE — refusal 8 spelled tightly, re-derived over these panes');
  say(`  rows that are pure ASCII, where the column arithmetic is exact: ${String(asciiRows)} of ${String(rows)} (${pct(asciiRows, rows)}%)`);
  say(`  grammar spans refused by the SHIPPED spelling: ${String(edgeShipped)} (${pct(edgeShipped, grammar)}%)`);
  say(`  grammar spans refused by the TIGHT spelling:   ${String(edgeTight)} (${pct(edgeTight, grammar)}%)`);
  say(`  spans the tight spelling ADMITS that the shipped one refuses: ${String(edgeGain)}`);
  say(`    ...of them RELATIVE, so they need lift two as well: ${String(gainRelative)}`);
  say(`    ...of them ABSOLUTE and reaching a door: ${String(gainDoor)} over ${String(gainDistinct.size)} distinct files`);
  say(`  THE COST: of the admitted spans, how many does tmux's own -J oracle say are really one line with the next row?`);
  say(`    admitted spans the oracle calls wrapped: ${String(gainWrapped)} (${pct(gainWrapped, edgeGain)}%)`);
  say(`    ...of which reach a door, so a click would open the WRONG file: ${String(gainWrappedDoor)}`);
  say(`      ...of those 'wrong opens', how many really are FLUSH with the row's edge rather than followed by padding: ${String(gainWrappedDoorFlush)} flush, ${String(gainWrappedDoorPadded)} padded`);
  say(`  THE PROTECTION KEPT: spans the tight spelling refuses for reaching the pane's last column: ${String(tightAtColumn)}, of which the oracle confirms wrapped ${String(tightAtColumnWrapped)} (${pct(tightAtColumnWrapped, tightAtColumn)}%)`);
  say(`  extensions of the newly clickable: ${top(gainExt, 12).map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);
  say(`    ...and how far short of the pane's width those flush rows ended: ${[...shortfall.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${String(k)} columns x${String(v)}`).join(', ') || 'none'}`);
  say(`  rows whose RAW length reaches the pane width while their DRAWN content stops short (padding): ${String(paddedRows)} of ${String(rows)} (${pct(paddedRows, rows)}%)`);
  say(`  research 111's own spelling refuses ${String(edge111)} grammar spans (${pct(edge111, grammar)}%), against this one's ${String(edgeTight)} and the shipped ${String(edgeShipped)}`);
  say(`  RESEARCH 111 SECTION 4.1's OWN DENOMINATOR re-derived: absolute spans whose realpath reaches a door: ${String(fileSpans)}`);
  say(`    the SHIPPED spelling refuses ${String(fileEdgeShipped)} of them (${pct(fileEdgeShipped, fileSpans)}%); research 111's TIGHT spelling refuses ${String(fileEdge111)} (${pct(fileEdge111, fileSpans)}%); this one refuses ${String(fileEdgeTight)} (${pct(fileEdgeTight, fileSpans)}%)`);
  say(`    the clickable set with the tight spelling: ${String(fileSpans - fileEdgeTight)} spans over ${String(doorUnion.size)} distinct files, against ${String(reached)} over ${String(distinctDoor.size)} today`);

  // ---- lift two ---------------------------------------------------------
  console.log('');
  say('LIFT TWO — the three candidate bases');
  const BASE = ['session projectPath', 'pane_current_path', 'agent launch cwd'];
  let allThree = 0, projEqPane = 0, projEqCwd = 0, paneEqCwd = 0, anyMissing = 0;
  for (const b of paneBases) {
    if (b.project === '' || b.pane === '' || b.cwd === '') anyMissing += 1;
    if (b.project === b.pane) projEqPane += 1;
    if (b.project === b.cwd) projEqCwd += 1;
    if (b.pane === b.cwd) paneEqCwd += 1;
    if (b.project === b.pane && b.pane === b.cwd) allThree += 1;
  }
  say(`  panes where all three bases are the same string: ${String(allThree)} of ${String(paneBases.length)} (${pct(allThree, paneBases.length)}%)`);
  say(`  projectPath == pane_current_path: ${String(projEqPane)}; projectPath == launch cwd: ${String(projEqCwd)}; pane_current_path == launch cwd: ${String(paneEqCwd)}`);
  say(`  panes with at least one base this measurement could not read: ${String(anyMissing)}`);

  for (const r of rel) {
    const b = paneBases[r.pane] as { project: string; cwd: string; pane: string };
    for (const base of [b.project, b.pane, b.cwd]) {
      const joined = joinToBase(base, r.target);
      if (joined === null) { r.doors.push(null); r.words.push(null); continue; }
      const a = await doorFor(joined);
      r.doors.push(a.door === null ? null : a.path);
      r.words.push(a.door === null ? a.refusal : a.door);
    }
  }

  let none = 0, one = 0, agree = 0, disagree = 0;
  let insideBase = 0, outsideBase = 0;
  const perBaseDoor = [0, 0, 0];
  const climbs = rel.filter((r) => r.climbs).length;
  let macDoor = 0;
  const relExt = new Map<string, number>();
  const distinctRelDoor = new Set<string>();
  const relRefusals = new Map<string, number>();
  for (const r of rel) {
    const hits = r.doors.filter((d) => d !== null) as string[];
    for (const [i, d] of r.doors.entries()) if (d !== null) perBaseDoor[i] = (perBaseDoor[i] ?? 0) + 1;
    for (const w of r.words) {
      if (w === 'mac') macDoor += 1;
      if (w !== null && w !== 'mac' && w !== 'editor' && w !== 'image') bump(relRefusals, w);
    }
    const b2 = paneBases[r.pane] as { project: string; cwd: string; pane: string };
    const drawn0 = r.doors[0];
    if (drawn0 !== null && drawn0 !== undefined) {
      if (drawn0 === b2.project || drawn0.startsWith(`${b2.project}/`)) insideBase += 1;
      else outsideBase += 1;
    }
    const distinct = new Set(hits);
    if (hits.length === 0) none += 1;
    else if (hits.length === 1) one += 1;
    else if (distinct.size === 1) agree += 1;
    else disagree += 1;
    for (const h of distinct) { distinctRelDoor.add(h); bump(relExt, extname(h).toLowerCase() || '(none)'); }
  }
  console.log('');
  say(`  RELATIVE spans that survive refusal 8: ${String(rel.length)} over ${String(distinctRelative.size)} distinct targets`);
  say(`    holding a '..' segment: ${String(climbs)}`);
  say('  what each base ANSWERS A DOOR for, span by span:');
  for (const [i, name] of BASE.entries()) {
    say(`    ${name.padEnd(20)} ${String(perBaseDoor[i]).padStart(5)} (${pct(perBaseDoor[i] ?? 0, rel.length)}% of relative spans)`);
  }
  say('  AGREEMENT over the bases that answered:');
  say(`    no base resolves — the span stays unclickable, which costs nothing: ${String(none)} (${pct(none, rel.length)}%)`);
  say(`    exactly one base resolves — unambiguous:                            ${String(one)} (${pct(one, rel.length)}%)`);
  say(`    two or more resolve to the SAME file — agree:                       ${String(agree)} (${pct(agree, rel.length)}%)`);
  say(`    two or more resolve to DIFFERENT files — a wrong base opens a real, wrong file: ${String(disagree)} (${pct(disagree, rel.length)}%)`);
  say(`  distinct files behind the resolvable relative spans: ${String(distinctRelDoor.size)}`);
  say(`  spans whose resolution would take the MAC door: ${String(macDoor)}`);
  say(`  A CANDIDATE GUARD, priced: keep only a resolved relative path whose REALPATH stays inside its base`);
  say(`    resolved spans whose realpath is inside the base: ${String(insideBase)} (${pct(insideBase, insideBase + outsideBase)}%)`);
  say(`    resolved spans whose realpath escapes it, by a '..' or by a symlink: ${String(outsideBase)}`);
  say(`  refusal words the resolved relative paths met: ${top(relRefusals, 8).map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);
  say(`  extensions: ${top(relExt, 12).map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);

  // ---- the corpus oracle -------------------------------------------------
  console.log('');
  say('THE CORPUS ORACLE — a relative target whose own pane also prints it ABSOLUTE tells us its true base');
  let oracleN = 0, oracleAmbiguous = 0;
  const right = [0, 0, 0];
  const wrongResolvable = [0, 0, 0];
  // THE CLICK-LEVEL READING, which is the one the entry asks for: of the
  // oracle spans the base would DRAW A LINK on, does the file it opens equal
  // the file the oracle says the text names?
  let clickable = 0, clickRight = 0, clickWrong = 0, noLink = 0;
  // and the shape of a disagreement: is the true base UNDER the project root
  // (an agent that printed a path relative to a subdirectory) or elsewhere?
  let truthUnderProject = 0, truthElsewhere = 0;
  const wrongShapes: string[] = [];
  const truthFamily = new Map<string, number>();
  for (const r of rel) {
    const seen = absSeen[r.pane] as Set<string>;
    const suffix = `/${r.target}`;
    const implied = new Set<string>();
    for (const a of seen) if (a.endsWith(suffix)) implied.add(a.slice(0, a.length - suffix.length));
    if (implied.size === 0) continue;
    if (implied.size > 1) { oracleAmbiguous += 1; continue; }
    oracleN += 1;
    const truth = [...implied][0] as string;
    const b = paneBases[r.pane] as { project: string; cwd: string; pane: string };
    for (const [i, base] of [b.project, b.pane, b.cwd].entries()) {
      if (base === truth) right[i] = (right[i] ?? 0) + 1;
      else if (r.doors[i] !== null) wrongResolvable[i] = (wrongResolvable[i] ?? 0) + 1;
    }
    if (b.project !== truth) {
      if (truth.startsWith(`${b.project}/`)) truthUnderProject += 1; else truthElsewhere += 1;
      bump(truthFamily, /^\/(private\/)?(tmp|var)\//.test(truth) ? 'a scratch root'
        : truth.startsWith(`${b.project}/`) ? 'a subdirectory of the project'
        : /^\/Users\/[^/]+\//.test(truth) ? 'elsewhere in the home'
        : 'a system root');
    }
    // what the shipping sequence would open under the project base, against
    // what it would open under the base the oracle says is true
    const drawn = r.doors[0];
    if (drawn === null || drawn === undefined) { noLink += 1; continue; }
    clickable += 1;
    const truthJoin = joinToBase(truth, r.target);
    const truthAnswer = truthJoin === null ? null : await doorFor(truthJoin);
    const truthPath = truthAnswer !== null && truthAnswer.door !== null ? truthAnswer.path : null;
    if (truthPath !== null && truthPath === drawn) clickRight += 1;
    else {
      clickWrong += 1;
      // the SHAPE of a wrong open, never the path: is the file the oracle
      // names even there, is the true base another pane's project, and how
      // many segments does the relative target carry?
      const otherProject = paneBases.some((x) => x.project === truth);
      wrongShapes.push(
        `segments ${String(r.target.split('/').length)}, ext ${extname(r.target).toLowerCase() || '(none)'}, ` +
        `the oracle's own file ${truthPath === null ? 'is NOT there' : 'IS there'}, ` +
        `true base is ${otherProject ? "another pane's project" : 'not a project in this corpus'}, ` +
        `true base family ${/^\/(private\/)?(tmp|var)\//.test(truth) ? 'a scratch root' : truth.startsWith(`${b.project}/`) ? 'a subdirectory of the project' : /^\/Users\/[^/]+\//.test(truth) ? 'elsewhere in the home' : 'a system root'}, ` +
        `climbs ${String(r.climbs)}`
      );
    }
  }
  say(`  relative spans whose pane names the same tail absolutely, with ONE implied base: ${String(oracleN)}`);
  say(`  ...with more than one implied base, so the oracle itself cannot say: ${String(oracleAmbiguous)}`);
  for (const [i, name] of BASE.entries()) {
    say(`    ${name.padEnd(20)} agrees with the oracle ${String(right[i]).padStart(4)} (${pct(right[i] ?? 0, oracleN)}%)   disagrees AND still opens a real file ${String(wrongResolvable[i]).padStart(4)} (${pct(wrongResolvable[i] ?? 0, oracleN)}%)`);
  }
  say('  THE CLICK-LEVEL READING against the session projectPath, over the oracle spans:');
  say(`    no link drawn at all — the join resolves to nothing:      ${String(noLink).padStart(4)} (${pct(noLink, oracleN)}%)`);
  say(`    a link drawn:                                             ${String(clickable).padStart(4)} (${pct(clickable, oracleN)}%)`);
  say(`      ...opening the file the oracle says the text names:     ${String(clickRight).padStart(4)} (${pct(clickRight, clickable)}% of the links drawn)`);
  say(`      ...opening a DIFFERENT file:                            ${String(clickWrong).padStart(4)} (${pct(clickWrong, clickable)}% of the links drawn)`);
  say(`  the shape of a disagreement: the true base is UNDER the project root ${String(truthUnderProject)}, elsewhere ${String(truthElsewhere)}`);
  say(`  the FAMILY of the true base when it disagrees: ${top(truthFamily, 6).map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);
  for (const w of wrongShapes) say(`    WRONG OPEN — ${w}`);

  // ---- A SECOND CANDIDATE GUARD, and the one that catches the worktree ---
  console.log('');
  say('THE DISAGREEING-WITNESS GUARD — refuse a relative span whose own pane has printed the same tail under a DIFFERENT base');
  let guardRefused = 0, guardKept = 0, guardRefusedDrawn = 0;
  for (const r of rel) {
    const seen = absSeen[r.pane] as Set<string>;
    const b = paneBases[r.pane] as { project: string; cwd: string; pane: string };
    const suffix = `/${r.target}`;
    let witnessDisagrees = false;
    for (const a of seen) {
      if (!a.endsWith(suffix)) continue;
      if (a.slice(0, a.length - suffix.length) !== b.project) { witnessDisagrees = true; break; }
    }
    if (witnessDisagrees) {
      guardRefused += 1;
      if (r.doors[0] !== null && r.doors[0] !== undefined) guardRefusedDrawn += 1;
    } else guardKept += 1;
  }
  say(`  relative spans it would refuse: ${String(guardRefused)} of ${String(rel.length)} (${pct(guardRefused, rel.length)}%)`);
  say(`  ...of which would have had a link drawn on them: ${String(guardRefusedDrawn)} of the ${String(perBaseDoor[0])} links lift two draws (${pct(guardRefusedDrawn, perBaseDoor[0] ?? 0)}%)`);
  say(`  relative spans it leaves alone: ${String(guardKept)}`);

  // ---- the two lifts composed -------------------------------------------
  console.log('');
  say('THE TWO LIFTS COMPOSED — what a hover would offer with both of them in');
  const composed = { spans: 0, files: new Set<string>(), fromAbsolute: 0, fromRelative: 0 };
  const oneOnly = { spans: 0, files: new Set<string>() };
  const twoOnly = { spans: 0, files: new Set<string>() };
  /** every distinct target that names a real, openable file under ANY rule. */
  const ceiling = new Set<string>();
  const ceilingTargets = new Set<string>();
  for (const e of every) {
    const b = paneBases[e.pane] as { project: string; cwd: string; pane: string };
    const isRel = !couldBeAbsolute(e.target);
    const spelling = isRel ? joinToBase(b.project, e.target) : e.target;
    if (spelling === null) continue;
    const a = await doorFor(spelling);
    if (a.door === null) continue;
    if (!e.tight) {
      composed.spans += 1;
      composed.files.add(a.path);
      if (isRel) composed.fromRelative += 1; else composed.fromAbsolute += 1;
      if (!isRel) { oneOnly.spans += 1; oneOnly.files.add(a.path); }
    }
    if (!e.shipped) { twoOnly.spans += 1; twoOnly.files.add(a.path); }
    ceiling.add(a.path);
    ceilingTargets.add(e.target);
  }
  say(`  today:            ${String(reached).padStart(5)} spans over ${String(distinctDoor.size)} distinct files`);
  say(`  LIFT ONE only:    ${String(oneOnly.spans).padStart(5)} spans over ${String(oneOnly.files.size)} distinct files`);
  say(`  LIFT TWO only:    ${String(twoOnly.spans).padStart(5)} spans over ${String(twoOnly.files.size)} distinct files`);
  say(`  BOTH:             ${String(composed.spans).padStart(5)} spans over ${String(composed.files.size)} distinct files   (absolute ${String(composed.fromAbsolute)}, resolved relative ${String(composed.fromRelative)})`);
  say(`  as a share of the ${String(grammar)} spans the grammar yields: today ${pct(reached, grammar)}%, both lifts ${pct(composed.spans, grammar)}%`);
  say(`  as a share of the ${String(distinctGrammar.size)} distinct targets his agents printed: today ${pct(distinctDoor.size, distinctGrammar.size)}%, both lifts ${pct(composed.files.size, distinctGrammar.size)}%`);
  say(`  THE CEILING — distinct targets that name a real, openable file under any rule at all: ${String(ceilingTargets.size)} spellings over ${String(ceiling.size)} files`);
  say(`    of that ceiling, TODAY reaches ${String(distinctDoor.size)} files (${pct(distinctDoor.size, ceiling.size)}%) and BOTH LIFTS reach ${String(composed.files.size)} (${pct(composed.files.size, ceiling.size)}%)`);

  // ---- the collision measurement ----------------------------------------
  console.log('');
  say('THE COLLISION — how easy it is for a wrong base to open a REAL file');
  const allBases = [...new Set(paneBases.flatMap((b) => [b.project, b.pane, b.cwd]).filter((x) => x !== ''))];
  const collide = new Map<number, number>();
  for (const t of distinctRelative) {
    let n = 0;
    for (const base of allBases) {
      const j = joinToBase(base, t);
      if (j === null) continue;
      const a = await doorFor(j);
      if (a.door !== null) n += 1;
    }
    bump(collide, n);
  }
  const totalT = distinctRelative.size;
  const under2 = [...collide.entries()].filter(([k]) => k >= 2).reduce((s, [, v]) => s + v, 0);
  const under1 = collide.get(1) ?? 0;
  say(`  distinct bases anywhere in the corpus: ${String(allBases.length)}`);
  say('  distinct relative targets that open a real file under N of them:');
  for (const [k, v] of [...collide.entries()].sort((a, b) => a[0] - b[0]).slice(0, 14)) {
    say(`    ${String(k).padStart(3)} bases  ${String(v).padStart(5)} targets (${pct(v, totalT)}%)`);
  }
  say(`  targets that open a real file under EXACTLY ONE base: ${String(under1)} of ${String(totalT)} (${pct(under1, totalT)}%)`);
  say(`  targets that open a real file under TWO OR MORE bases: ${String(under2)} of ${String(totalT)} (${pct(under2, totalT)}%)`);
  say(`  door calls made in total: ${String(doorCalls)}`);
  return 0;
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
    check(edgeRefusal(span, row, null) === true,
      'THE SHIPPED refusal 8 refuses a path that ENDS its row, which is his first screenshot');
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
  check(gs !== undefined && edgeRefusal(gs, gut, 'y'.repeat(62)) === true,
    '...which the SHIPPING edgeRefusal confirms on the same row');
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
          : edgeRefusal(span, row, above);
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
    check(await offer('read paper.pdf now', null, 120, true, proj), '',
      'A BARE FILENAME WITH NO SLASH IS NEVER A CANDIDATE — looksLikePath requires one, so lift two cannot reach it');
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
  else process.exit(await run(process.env['P250_MANIFEST'] ?? ''));
}
