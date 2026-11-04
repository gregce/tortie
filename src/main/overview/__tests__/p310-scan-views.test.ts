/**
 * Phase 310, built in Phase 352 (docs/BACKLOG.md "## Phase 310",
 * build/p352/SPEC.md D21 and §4.7): the conversation reader's scanner hands a
 * line that lies inside one chunk to `onLine` as a view of that chunk, and
 * copies only a line that does not end in the chunk it starts in. Nothing it
 * admits, counts or hands on may move, so every reading here is taken against
 * something the scanner does not compute itself.
 *
 *  - A REFERENCE READER, written below, copies everything. It reads the whole
 *    file, splits it at newlines and decides each line from the prefilter's
 *    own strings, never through `lines.ts`. Every `ScanAccounting` field and
 *    every byte and offset handed to `onLine` must equal its answer, at every
 *    chunk size and start tried.
 *  - A COPY MODEL lays the file over the chunk grid and lists the pieces the
 *    scanner holds as copies: every piece of a line that does not end in the
 *    chunk it starts in, up to the piece where its head says skip. While
 *    `scanFile` runs, `Buffer.from` is counted (never while `onLine` runs),
 *    and the lengths it was handed must be exactly those pieces, in order. The
 *    model also lists what the scanner copied before this phase, every held
 *    piece of every line, so a case can say what it no longer copies.
 *  - A VIEW KEPT past the call is written over by the next chunk, which is
 *    why `lines.ts` says the line is valid only during the call. The one
 *    caller that keeps lines past it, the conformance probe's stage timing,
 *    copies them, and that is read from its text.
 *
 * The real data is the committed records under
 * docs/research/assets/63-fixtures, read through each provider's own rules
 * as `containers.ts` compiles them. Nothing under the person's home is read.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compileHead, detectWideHead, scanFile, WIDE_HEAD_BYTES } from '../reader/lines';
import type { CompiledPrefilter, ScanAccounting } from '../reader/lines';
import { providerMap } from '../reader/map';
import type { Prefilter, PrefilterRule } from '../reader/map-types';

const REPO = resolve(__dirname, '../../../..');
const FIXTURES = join(REPO, 'docs', 'research', 'assets', '63-fixtures');

/** `lines.ts`'s own default chunk, the one the shipping read uses. */
const SHIPPING_CHUNK = 1 << 20;

// ------------------------------------------------------------------ files --

let dir = '';
let made = 0;

beforeAll(() => {
  dir = fs.mkdtempSync(join(os.tmpdir(), 'p310-scan-views-'));
});

afterAll(() => {
  if (dir !== '') fs.rmSync(dir, { recursive: true, force: true });
});

function recordOf(content: string): string {
  made += 1;
  const file = join(dir, `record-${String(made)}.jsonl`);
  fs.writeFileSync(file, content);
  return file;
}

// ------------------------------------------------ the rules, read again --

interface Rule {
  head: Buffer;
  rejectHead: Buffer[];
  requireAnywhere: Buffer[];
  rejectAnywhere: Buffer[];
}

/** A prefilter read from its own strings, with no help from `compileHead`. */
interface Plan {
  headBytes: number;
  rules: Rule[];
}

function planOf(
  prefilter: Prefilter | null,
  extra: PrefilterRule[],
  headBytes: number | undefined
): Plan | null {
  if (prefilter === null) return null;
  const utf8 = (s: string): Buffer => Buffer.from(s, 'utf8');
  return {
    headBytes: headBytes ?? prefilter.headBytes ?? 512,
    rules: [...prefilter.rules, ...extra].map((r) => ({
      head: utf8(r.head),
      rejectHead: (r.rejectHead ?? []).map(utf8),
      requireAnywhere: (r.requireAnywhere ?? []).map(utf8),
      rejectAnywhere: (r.rejectAnywhere ?? []).map(utf8)
    }))
  };
}

/** The rules whose head marker is in the head and none of whose refusals is. */
function headAdmits(plan: Plan, head: Buffer): Rule[] {
  return plan.rules.filter((r) => head.includes(r.head) && !r.rejectHead.some((b) => head.includes(b)));
}

function wholeKeeps(rule: Rule, line: Buffer): boolean {
  return (
    rule.requireAnywhere.every((b) => line.includes(b)) &&
    !rule.rejectAnywhere.some((b) => line.includes(b))
  );
}

/** What `onLine` was handed, written down while the call runs. */
interface Handed {
  offset: number;
  length: number;
  bytes: string;
}

function handedOf(line: Buffer, offset: number): Handed {
  const bytes =
    line.length <= 4096
      ? line.toString('latin1')
      : `sha256 ${createHash('sha256').update(line).digest('hex')}`;
  return { offset, length: line.length, bytes };
}

// ----------------------------------------------- the reference reader --

/**
 * The whole file in memory, split at newlines, every line copied and decided
 * from the plan. A trailing line with no newline is not a line.
 */
function referenceRead(
  file: string,
  plan: Plan | null,
  start: number
): { acct: ScanAccounting; handed: Handed[] } {
  const data = fs.readFileSync(file);
  const st = fs.statSync(file, { bigint: true });
  const acct: ScanAccounting = {
    bytesRead: Math.max(0, data.length - start),
    bytesParsed: 0,
    lines: 0,
    linesParsed: 0,
    linesSkippedOnHead: 0,
    linesSkippedOnWhole: 0,
    lastCompleteOffset: start,
    peakLineBuffer: 0,
    size: Number(st.size),
    mtimeNs: String(st.mtimeNs)
  };
  const handed: Handed[] = [];
  let at = start;
  while (at < data.length) {
    const nl = data.indexOf(10, at);
    if (nl === -1) break;
    const line = Buffer.from(data.subarray(at, nl));
    acct.lines += 1;
    const admitted = plan === null ? null : headAdmits(plan, line.subarray(0, plan.headBytes));
    if (admitted !== null && admitted.length === 0) {
      acct.linesSkippedOnHead += 1;
    } else {
      acct.peakLineBuffer = Math.max(acct.peakLineBuffer, line.length);
      if (admitted === null || admitted.some((r) => wholeKeeps(r, line))) {
        acct.linesParsed += 1;
        acct.bytesParsed += line.length;
        handed.push(handedOf(line, at));
      } else {
        acct.linesSkippedOnWhole += 1;
      }
    }
    at = nl + 1;
    acct.lastCompleteOffset = at;
  }
  return { acct, handed };
}

// ------------------------------------------------------- the copy model --

interface Copies {
  /** The pieces the scanner copies since Phase 310, in the order it copies them. */
  now: number[];
  /** The pieces it copied before: every held piece of every line. */
  before: number[];
}

/**
 * The scanner reads chunk k as the bytes [start + k * chunkSize, start +
 * (k + 1) * chunkSize). A line's pieces are its bytes in each chunk it
 * touches, and the chunk that holds its newline holds a piece too, empty when
 * the newline is that chunk's first byte. A trailing line with no newline has
 * no such chunk, so it never ends where it starts.
 */
function copyModel(file: string, plan: Plan | null, start: number, chunkSize: number): Copies {
  const data = fs.readFileSync(file);
  const chunkOf = (offset: number): number => Math.floor((offset - start) / chunkSize);
  const now: number[] = [];
  const before: number[] = [];
  let at = start;
  while (at < data.length) {
    const nl = data.indexOf(10, at);
    const ends = nl !== -1;
    const end = ends ? nl : data.length;
    const first = chunkOf(at);
    const last = ends ? chunkOf(nl) : chunkOf(data.length - 1);
    const pieces: number[] = [];
    for (let k = first; k <= last; k += 1) {
      pieces.push(Math.min(end, start + (k + 1) * chunkSize) - Math.max(at, start + k * chunkSize));
    }
    const held = heldPieces(pieces, plan, data.subarray(at, end));
    before.push(...held);
    if (!ends || first !== last) now.push(...held);
    at = ends ? nl + 1 : data.length;
  }
  return { now, before };
}

/**
 * The pieces the scanner holds: every one while the head is undecided, and
 * from the piece that fills the head window on, only if the head admits. A
 * line shorter than the window is decided at its end, so it holds them all.
 */
function heldPieces(pieces: number[], plan: Plan | null, line: Buffer): number[] {
  if (plan === null || line.length < plan.headBytes) return pieces;
  const admits = headAdmits(plan, line.subarray(0, plan.headBytes)).length > 0;
  const held: number[] = [];
  let seen = 0;
  let decided = false;
  for (const piece of pieces) {
    if (!decided && seen + piece >= plan.headBytes) decided = true;
    if (!decided || admits) held.push(piece);
    seen += piece;
  }
  return held;
}

// --------------------------------------------- the scanner, counted --

interface Run {
  acct: ScanAccounting;
  handed: Handed[];
  /** The length of every byte view `Buffer.from` copied while the scanner ran. */
  copies: number[];
  /** Every buffer `onLine` was handed, kept past the call. */
  kept: Buffer[];
}

/**
 * The SHIPPING scanner, with `Buffer.from` counted while it runs. A call made
 * inside `onLine` is this file's own and is not counted, and a call handed
 * anything but a byte view fails the run, so what is counted is the scanner's
 * copies and nothing else.
 */
function countedScan(
  file: string,
  compiled: CompiledPrefilter | null,
  opts: { chunkSize: number | undefined; start: number }
): Run {
  const handed: Handed[] = [];
  const kept: Buffer[] = [];
  const copies: number[] = [];
  const other: string[] = [];
  let inCall = false;
  const real = Buffer.from;
  const counted = function (this: unknown, ...args: unknown[]): unknown {
    if (!inCall) {
      const a = args[0];
      if (a instanceof Uint8Array) copies.push(a.length);
      else other.push(typeof a);
    }
    return (real as unknown as (...a: unknown[]) => unknown).apply(this, args);
  };
  (Buffer as unknown as { from: unknown }).from = counted;
  let acct: ScanAccounting;
  try {
    acct = scanFile(
      file,
      compiled,
      (line, offset) => {
        inCall = true;
        try {
          handed.push(handedOf(line, offset));
          kept.push(line);
        } finally {
          inCall = false;
        }
      },
      opts
    );
  } finally {
    (Buffer as unknown as { from: unknown }).from = real;
  }
  expect(other, 'Buffer.from was handed something other than a byte view').toEqual([]);
  return { acct, handed, copies, kept };
}

interface Shape {
  prefilter: Prefilter | null;
  extra?: PrefilterRule[];
  chunkSize?: number;
  start?: number;
  wide?: boolean;
}

interface Checked {
  run: Run;
  copies: Copies;
  acct: ScanAccounting;
  handed: Handed[];
}

/** The scanner against the reference reader and the copy model, field by field. */
function checkFile(file: string, shape: Shape, label: string): Checked {
  const start = shape.start ?? 0;
  const extra = shape.extra ?? [];
  const headBytes = shape.wide === true ? WIDE_HEAD_BYTES : undefined;
  const compiled = shape.prefilter === null ? null : compileHead(shape.prefilter, extra, headBytes);
  const plan = planOf(shape.prefilter, extra, headBytes);
  const run = countedScan(file, compiled, { chunkSize: shape.chunkSize, start });
  const ref = referenceRead(file, plan, start);
  const copies = copyModel(file, plan, start, shape.chunkSize ?? SHIPPING_CHUNK);
  expect(run.acct, `${label}: every accounting field`).toEqual(ref.acct);
  expect(run.handed, `${label}: every line handed, its offset and its bytes`).toEqual(ref.handed);
  expect(run.copies, `${label}: the pieces Buffer.from copied`).toEqual(copies.now);
  return { run, copies, acct: ref.acct, handed: ref.handed };
}

function checkCase(content: string, shape: Shape, label: string): Checked {
  return checkFile(recordOf(content), shape, label);
}

// ------------------------------------------------------------ the shapes --

/**
 * Two rules and an 8 byte head, so every shape fits a 16 byte chunk. The
 * filler holds no marker: no D, K, P, X or /, and neither `ok` nor `no`.
 */
const RULES: Prefilter = {
  headBytes: 8,
  rules: [
    { head: 'K', rejectHead: ['X'], requireAnywhere: ['ok'], rejectAnywhere: ['no'] },
    { head: 'P', requireAnywhere: ['/'] }
  ]
};

const C = 16;

function fill(n: number): string {
  return 'abcdefghij'.repeat(Math.ceil(n / 10)).slice(0, n);
}

/** n bytes, admitted on the head and kept. */
const kept = (n: number): string => `K${fill(n - 3)}ok`;
/** n bytes, admitted on the head and refused on the whole line. */
const refusedWhole = (n: number): string => `K${fill(n - 3)}no`;
/** n bytes, refused on the head. */
const refusedHead = (n: number): string => `D${fill(n - 1)}`;
/** n bytes, refused on the head by its rejectHead marker. */
const markedX = (n: number): string => `KX${fill(n - 4)}ok`;
/** n bytes, kept by the second rule. */
const second = (n: number): string => `P${fill(n - 2)}/`;
/** n bytes whose marker lies past the 8 byte head: refused there, kept at the wide head. */
const late = (n: number): string => `${fill(10)}K${fill(n - 13)}ok`;

const lines = (...each: string[]): string => each.map((l) => `${l}\n`).join('');
const offsets = (handed: Handed[]): number[] => handed.map((h) => h.offset);

// ------------------------------------------------------------- the cases --

describe('Phase 310: a line inside one chunk is handed as a view and never copied', () => {
  it('a line whose newline is the last byte of its chunk', () => {
    const r = checkCase(lines(kept(15), kept(4)), { prefilter: RULES, chunkSize: C }, 'newline last');
    expect(offsets(r.handed)).toEqual([0, 16]);
    expect(r.run.copies).toEqual([]);
    expect(r.copies.before).toEqual([15, 4]);
  });

  it('a line whose newline is the first byte of the next chunk is copied, in two pieces', () => {
    const r = checkCase(lines(kept(16), kept(4)), { prefilter: RULES, chunkSize: C }, 'newline first');
    expect(offsets(r.handed)).toEqual([0, 17]);
    expect(r.run.copies).toEqual([16, 0]);
    expect(r.copies.before).toEqual([16, 0, 4]);
  });

  it('lines that cross one, two and many chunks are copied piece by piece, as before', () => {
    const one = checkCase(lines(kept(4), kept(20), kept(4)), { prefilter: RULES, chunkSize: C }, 'one');
    expect(offsets(one.handed)).toEqual([0, 5, 26]);
    expect(one.run.copies).toEqual([11, 9]);
    expect(one.copies.before).toEqual([4, 11, 9, 4]);

    const two = checkCase(lines(kept(4), kept(40)), { prefilter: RULES, chunkSize: C }, 'two');
    expect(two.run.copies).toEqual([11, 16, 13]);

    const many = checkCase(lines(kept(4), kept(147)), { prefilter: RULES, chunkSize: C }, 'many');
    expect(many.run.copies).toEqual([11, 16, 16, 16, 16, 16, 16, 16, 16, 8]);
    expect(many.acct.peakLineBuffer).toBe(147);
  });

  it('a trailing line with no newline is not consumed, and what is held of it is a copy', () => {
    // Each record ends where a chunk ends.
    const inside = checkCase(lines(kept(4)) + kept(11), { prefilter: RULES, chunkSize: C }, 'inside');
    expect(inside.acct).toMatchObject({ lines: 1, linesParsed: 1, lastCompleteOffset: 5, bytesRead: 16 });
    expect(offsets(inside.handed)).toEqual([0]);
    expect(inside.run.copies).toEqual([11]);

    const across = checkCase(lines(kept(4)) + kept(27), { prefilter: RULES, chunkSize: C }, 'across');
    expect(across.acct).toMatchObject({ lines: 1, lastCompleteOffset: 5, bytesRead: 32 });
    expect(across.run.copies).toEqual([11, 16]);
  });

  it('an empty line, at the last byte of a chunk and at the first byte of the next', () => {
    // 0 an empty line; 1 Kaok; 6 an empty line; 7 Kabcdok; 15 and 16 empty
    // lines either side of the chunk edge; 17 Kaok.
    const content = `\n${lines(kept(4))}\n${lines(kept(7))}\n\n${lines(kept(4))}`;
    const ruled = checkCase(content, { prefilter: RULES, chunkSize: C }, 'empty, ruled');
    expect(ruled.acct).toMatchObject({ lines: 7, linesParsed: 3, linesSkippedOnHead: 4 });
    expect(ruled.run.copies).toEqual([]);

    const bare = checkCase(content, { prefilter: null, chunkSize: C }, 'empty, no prefilter');
    expect(bare.handed.filter((h) => h.length === 0).map((h) => h.offset)).toEqual([0, 6, 15, 16]);
    expect(bare.run.copies).toEqual([]);
    expect(bare.copies.before).toEqual([0, 4, 0, 7, 0, 0, 4]);
  });

  it('the head decided mid-line, both ways, with the line inside one chunk', () => {
    const content = lines(kept(15), refusedHead(15), refusedWhole(15), markedX(15), second(15));
    const r = checkCase(content, { prefilter: RULES, chunkSize: C }, 'mid-line');
    expect(r.acct).toMatchObject({ lines: 5, linesParsed: 2, linesSkippedOnHead: 2, linesSkippedOnWhole: 1 });
    expect(offsets(r.handed)).toEqual([0, 64]);
    expect(r.run.copies).toEqual([]);
    // Before, the three lines the head admitted were copied, the one the
    // whole line then refused among them.
    expect(r.copies.before).toEqual([15, 15, 15]);
  });

  it('the head decided in the second piece of a line, both ways, and in the first', () => {
    // The first line and its newline take 12 bytes, so the second starts 4
    // bytes before the edge at 16 and its head window fills after it.
    const shape: Shape = { prefilter: RULES, chunkSize: C };
    const admitted = checkCase(lines(refusedHead(11), kept(12)), shape, 'second, admitted');
    expect(offsets(admitted.handed)).toEqual([12]);
    expect(admitted.run.copies).toEqual([4, 8]);

    const refused = checkCase(lines(refusedHead(11), refusedHead(12)), shape, 'second, refused');
    expect(refused.acct).toMatchObject({ lines: 2, linesSkippedOnHead: 2 });
    expect(refused.run.copies).toEqual([4]);

    // Decided in its first piece and refused there: nothing of it is held.
    const early = checkCase(lines(kept(4), refusedHead(20)), shape, 'first, refused');
    expect(early.run.copies).toEqual([]);
    expect(early.copies.before).toEqual([4]);
  });

  it('a line shorter than the head is decided at its end, both ways, inside a chunk and across one', () => {
    const inside = checkCase(lines(kept(3), refusedHead(3)), { prefilter: RULES, chunkSize: C }, 'short inside');
    expect(inside.acct).toMatchObject({ lines: 2, linesParsed: 1, linesSkippedOnHead: 1 });
    expect(inside.run.copies).toEqual([]);

    // Kok crosses at 16 and Dab ends at 32, the next chunk's first byte; both
    // are held whole, undecided, until their newline.
    const content = lines(kept(13), kept(3), refusedHead(10), refusedHead(3));
    const across = checkCase(content, { prefilter: RULES, chunkSize: C }, 'short across');
    expect(across.acct).toMatchObject({ lines: 4, linesParsed: 2, linesSkippedOnHead: 2 });
    expect(offsets(across.handed)).toEqual([0, 14]);
    expect(across.run.copies).toEqual([2, 1, 3, 0]);
  });

  it('the wide head decides every line at its end', () => {
    const content = lines(late(15), kept(15), kept(4), kept(40));
    const narrow = checkCase(content, { prefilter: RULES, chunkSize: C }, 'the 8 byte head');
    const wide = checkCase(content, { prefilter: RULES, chunkSize: C, wide: true }, 'the wide head');
    expect(offsets(narrow.handed)).toEqual([16, 32, 37]);
    expect(offsets(wide.handed)).toEqual([0, 16, 32, 37]);
    expect(narrow.run.copies).toEqual([11, 16, 13]);
    expect(wide.run.copies).toEqual([11, 16, 13]);
    expect(wide.copies.before).toEqual([15, 15, 4, 11, 16, 13]);
  });

  it('a read from an offset lays its chunks from that offset', () => {
    const content = lines(kept(10), kept(20), kept(5), refusedWhole(12), kept(30));
    for (const start of [0, 3, 11, 12, 40, content.length, content.length + 5]) {
      checkCase(content, { prefilter: RULES, chunkSize: C, start }, `start ${String(start)}`);
    }
    // From 11 the chunk edges fall at 27, 43, 59 and 75: the line at 11
    // crosses at 27, the one at 32 ends inside its chunk, the one at 38 (the
    // whole line refuses it, after its head admitted it) crosses at 43, and
    // the one at 51 crosses at 59 and 75.
    const tail = checkCase(content, { prefilter: RULES, chunkSize: C, start: 11 }, 'tail');
    expect(offsets(tail.handed)).toEqual([11, 32, 51]);
    expect(tail.run.copies).toEqual([16, 4, 5, 7, 8, 16, 6]);
    expect(tail.copies.before).toEqual([16, 4, 5, 5, 7, 8, 16, 6]);
  });

  it('with no prefilter every line is handed, and only a line that crosses a chunk is copied', () => {
    const content = lines(refusedHead(15), kept(20), markedX(9), '', late(14));
    const r = checkCase(content, { prefilter: null, chunkSize: C }, 'no prefilter');
    expect(r.handed).toHaveLength(5);
    expect(r.run.copies).toEqual([16, 4]);
    expect(r.copies.before).toEqual([15, 16, 4, 9, 0, 14]);
  });

  it('at the shipping chunk size, a line of 2.5 MiB is the only one copied', () => {
    const short = Array.from({ length: 300 }, (_, i) =>
      i % 3 === 0 ? refusedHead(90) : i % 3 === 1 ? refusedWhole(100) : kept(110)
    );
    const big = kept(Math.floor(2.5 * 1024 * 1024));
    const r = checkCase(lines(...short, big, ...short), { prefilter: RULES }, 'shipping chunk');
    expect(r.acct.lines).toBe(601);
    expect(r.run.copies).toHaveLength(3);
    expect(r.run.copies.reduce((a, b) => a + b, 0)).toBe(big.length);
    // Before, 200 short lines a side were copied too, admitted by the head.
    expect(r.copies.before).toHaveLength(403);
  });
});

describe('Phase 310: every chunk size from 1 to 48, three starts, three heads', () => {
  const WHOLE = lines(
    '',
    kept(3),
    refusedHead(3),
    kept(8),
    refusedHead(8),
    kept(9),
    refusedWhole(9),
    markedX(12),
    second(5),
    second(17),
    late(15),
    '',
    kept(31),
    refusedHead(33),
    refusedWhole(47),
    kept(16),
    kept(15),
    // Characters of two, three and four bytes, which a chunk edge cuts at
    // every byte as the sweep moves; the 8 byte head cuts the first one's
    // emoji too.
    `Ké—😀${'é—😀'.repeat(3)}ok`,
    `P${'日本語'.repeat(3)}/`
  );
  /** The same lines and an unfinished one, 23 bytes or 1, wherever a chunk ends. */
  const UNFINISHED = [
    ['unfinished, 23 bytes', WHOLE + kept(23)],
    ['unfinished, 1 byte', WHOLE + fill(1)]
  ] as const;
  const HEADS = [
    ['no prefilter', null, false],
    ['the 8 byte head', RULES, false],
    ['the wide head', RULES, true]
  ] as const;
  for (const [name, prefilter, wide] of HEADS) {
    it(name, () => {
      const whole = recordOf(WHOLE);
      const open = UNFINISHED.map(([form, content]) => [form, recordOf(content)] as const);
      let saved = 0;
      for (let chunkSize = 1; chunkSize <= 48; chunkSize += 1) {
        for (const start of [0, 1, 9]) {
          for (const [form, file] of [['whole', whole] as const, ...open]) {
            const label = `${name}, ${form}, chunk ${String(chunkSize)}, start ${String(start)}`;
            const r = checkFile(file, { prefilter, chunkSize, start, wide }, label);
            saved += r.copies.before.length - r.run.copies.length;
          }
        }
      }
      expect(saved).toBeGreaterThan(0);
    });
  }
});

describe('Phase 310: the committed records, through each provider’s own rules', () => {
  const RECORDS: ReadonlyArray<readonly [provider: string, file: string]> = [
    ['antigravity', 'antigravity-transcript_full.jsonl'],
    ['claude', 'claude-bare-command.jsonl'],
    ['claude', 'claude-session.jsonl'],
    ['codex', 'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl'],
    ['gemini', 'gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl'],
    ['grok', 'grok-updates.jsonl'],
    ['muse', 'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl'],
    ['omp', 'omp-sessions-rookery/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl'],
    [
      'pi',
      'pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl'
    ],
    ['qwen', 'qwen-chat.jsonl']
  ];

  it('the list is every committed JSONL record', () => {
    const found: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.jsonl')) found.push(relative(FIXTURES, p));
      }
    };
    walk(FIXTURES);
    expect(found.sort()).toEqual(RECORDS.map(([, f]) => f).sort());
  });

  for (const [provider, name] of RECORDS) {
    it(`${provider}, ${name}`, () => {
      const file = join(FIXTURES, name);
      const cfg = providerMap(provider);
      expect(cfg?.container).toBe('jsonl');
      const rules = cfg?.prefilter ?? null;
      expect(rules).not.toBeNull();
      if (rules === null) return;
      const extra = cfg?.paths?.prefilter ? [cfg.paths.prefilter] : [];
      const shipsWide = detectWideHead(file, rules, extra);
      const data = fs.readFileSync(file);
      const middle = data.indexOf(10, Math.floor(data.length / 2)) + 1;
      const heads = [
        ['no prefilter', null, false],
        ['as containers.ts compiles it', rules, shipsWide],
        ['at the wide head', rules, true]
      ] as const;
      let saved = 0;
      for (const chunkSize of [3, 64, 4096, SHIPPING_CHUNK]) {
        for (const start of [0, middle]) {
          for (const [mode, prefilter, wide] of heads) {
            const r = checkFile(
              file,
              { prefilter, extra, chunkSize, start, wide },
              `${provider} ${mode}, chunk ${String(chunkSize)}, start ${String(start)}`
            );
            saved += r.copies.before.length - r.run.copies.length;
          }
        }
      }
      expect(saved).toBeGreaterThan(0);
    });
  }
});

describe('Phase 310: the line is valid only during the call', () => {
  it('a view kept past the call is written over by the next chunk, and a copied line is not', () => {
    // Chunk 0 holds two lines, chunk 1 two more, and the fifth crosses from
    // chunk 2 into chunk 3, the last chunk read.
    const content = lines(kept(7), kept(7), second(7), second(7), kept(20), second(9));
    const r = checkCase(content, { prefilter: RULES, chunkSize: C }, 'kept views');
    expect(r.handed.map((h) => h.bytes)).toEqual([kept(7), kept(7), second(7), second(7), kept(20), second(9)]);
    const now = r.run.kept.map((b) => b.toString('latin1'));
    for (const i of [0, 1, 2, 3]) {
      expect(now[i], `line ${String(i + 1)}, a view of a chunk read over since`).not.toBe(r.handed[i]?.bytes);
    }
    expect(now[4], 'the line that crossed a chunk, a copy').toBe(kept(20));
  });

  it('the conformance probe’s stage timing, which keeps lines past the call, keeps copies', () => {
    const probe = fs.readFileSync(join(REPO, 'build', 'overview-conformance-probe.mts'), 'utf8');
    const pushes = [...probe.matchAll(/admitted\.push\(([^;]*)\);/g)].map((m) => m[1]);
    expect(pushes.length).toBeGreaterThan(0);
    for (const arg of pushes) expect(arg).toBe('Buffer.from(line)');
  });
});
