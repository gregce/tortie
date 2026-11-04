/**
 * Phase 355 (docs/BACKLOG.md "## Phase 355", build/p355/SPEC.md §4.3): the
 * conversation reader's scanner finishes a line only from bytes a read
 * returned. `scanFile` reads into one reused `Buffer.allocUnsafe` chunk, and
 * its newline search ran over the whole chunk, so when a record's last line
 * had no newline yet and the read that reached it was short, a newline the
 * read before had left in the chunk, or one in memory no read of the file
 * wrote, finished the line. Measured at the parent (SPEC §2): a line counted
 * that the record does not hold, a watermark past the record's end, a reply
 * drawn that the record does not hold, and a reply lost for good from a
 * record that grew during the read.
 *
 * Every reading here is held against something the scanner does not compute:
 * a REFERENCE READER written below reads the whole file and splits it at
 * newlines, a trailing line with no newline not being a line. Each case also
 * checks that it can fail, so none passes by never meeting the defect:
 *
 *  (a) the bound at every cut of a last unfinished line, at chunk sizes from
 *      1 to 4,096 and two starts, counting the cases where the previous
 *      read's newline sits exactly at the read's end, which is where a search
 *      one byte too wide meets it;
 *  (b) memory no read wrote: the chunk is handed over filled with newlines,
 *      then with a marker line, and the case asserts the fill was there;
 *  (c) a record that grows during the read: `readSync` is wrapped, in
 *      p244-read-cap-bytes.test.ts's shape, so the rest of the line and one
 *      more line arrive after the first short read of the record;
 *  (d) no reply drawn before its line is whole, through `readJsonl` and the
 *      shipping codex map, at every cut of the reply's line;
 *  (e) no reply lost when the record grows during the read, merged the way
 *      `service.ts` hands the store a tail read.
 *
 * Every record is one this file writes under the temporary directory.
 * Nothing under the person's home is read.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * While armed, the first read of `path` that returns more than 0 and fewer
 * bytes than it asked for is followed by `text` appended to `path`, which is
 * what an agent writing during the read does. Then it disarms.
 */
const growth = vi.hoisted(() => ({
  path: '',
  text: '',
  armed: false,
  fds: new Set<number>(),
  fired: 0
}));

vi.mock('node:fs', async (original) => {
  const real = await original<typeof import('node:fs')>();
  return {
    ...real,
    openSync: (...args: Parameters<typeof real.openSync>): number => {
      const fd = real.openSync(...args);
      if (growth.armed && String(args[0]) === growth.path) growth.fds.add(fd);
      return fd;
    },
    readSync: (...args: unknown[]): number => {
      const got = (real.readSync as (...a: unknown[]) => number)(...args);
      const fd = args[0] as number;
      const asked =
        typeof args[3] === 'number' ? args[3] : (args[1] as NodeJS.ArrayBufferView).byteLength;
      if (growth.armed && growth.fds.has(fd) && got > 0 && got < asked) {
        growth.armed = false;
        real.appendFileSync(growth.path, growth.text);
        growth.fired += 1;
      }
      return got;
    }
  };
});

import { readJsonl } from '../reader/containers';
import type { ContainerResult } from '../reader/containers';
import { compileHead, scanFile } from '../reader/lines';
import type { CompiledPrefilter, ScanAccounting, ScanOpts } from '../reader/lines';
import { providerMap } from '../reader/map';
import type { Prefilter, ProviderMap } from '../reader/map-types';

/** `lines.ts`'s own default chunk, the one the shipping read uses. */
const SHIPPING_CHUNK = 1 << 20;

/** Bound before any case spies on it, so a spy can hand out a real chunk. */
const REAL_ALLOC_UNSAFE = Buffer.allocUnsafe.bind(Buffer);

// ------------------------------------------------------------------ files --

let dir = '';
let made = 0;

beforeAll(() => {
  dir = fs.mkdtempSync(join(os.tmpdir(), 'p355-scan-bounds-'));
});

afterAll(() => {
  if (dir !== '') fs.rmSync(dir, { recursive: true, force: true });
});

function fileNamed(name: string): string {
  made += 1;
  return join(dir, `${String(made)}-${name}.jsonl`);
}

// ----------------------------------------------- the reference reader --

interface Handed {
  offset: number;
  bytes: string;
}

interface Reading {
  acct: ScanAccounting;
  handed: Handed[];
}

/** A head rule read from its own strings, with no help from `compileHead`. */
interface HeadRule {
  headBytes: number;
  head: string;
  rejectHead: string;
}

/**
 * The whole file in memory, split at newlines. A trailing line with no
 * newline is not a line. With a rule, a line is handed when its first
 * `headBytes` hold the head marker and not the refusal.
 */
function referenceRead(file: string, start: number, rule: HeadRule | null): Reading {
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
    const line = data.subarray(at, nl);
    acct.lines += 1;
    const head = rule === null ? null : line.subarray(0, rule.headBytes).toString('latin1');
    if (rule !== null && head !== null && (!head.includes(rule.head) || head.includes(rule.rejectHead))) {
      acct.linesSkippedOnHead += 1;
    } else {
      acct.linesParsed += 1;
      acct.bytesParsed += line.length;
      acct.peakLineBuffer = Math.max(acct.peakLineBuffer, line.length);
      handed.push({ offset: at, bytes: line.toString('latin1') });
    }
    at = nl + 1;
    acct.lastCompleteOffset = at;
  }
  return { acct, handed };
}

/** The SHIPPING scanner, every line it hands copied while the call runs. */
function scanned(file: string, compiled: CompiledPrefilter | null, opts: ScanOpts): Reading {
  const handed: Handed[] = [];
  const acct = scanFile(
    file,
    compiled,
    (line, offset) => handed.push({ offset, bytes: line.toString('latin1') }),
    opts
  );
  return { acct, handed };
}

const FIELDS = [
  'bytesRead',
  'bytesParsed',
  'lines',
  'linesParsed',
  'linesSkippedOnHead',
  'linesSkippedOnWhole',
  'lastCompleteOffset',
  'peakLineBuffer'
] as const;

/** The fields and the handed lines that differ, as words; empty when none does. */
function differences(got: Reading, want: Reading, withStat: boolean): string[] {
  const out: string[] = [];
  const fields = withStat ? [...FIELDS, 'size' as const, 'mtimeNs' as const] : FIELDS;
  for (const f of fields) {
    if (got.acct[f] !== want.acct[f]) out.push(`${f} ${String(got.acct[f])} for ${String(want.acct[f])}`);
  }
  if (JSON.stringify(got.handed) !== JSON.stringify(want.handed)) {
    out.push(`${String(got.handed.length)} lines handed for ${String(want.handed.length)}, or their bytes differ`);
  }
  return out;
}

/** Every handed line is a whole line of the record at its own offset. */
function wholeLinesOf(file: string, handed: Handed[]): boolean {
  const data = fs.readFileSync(file);
  return handed.every(
    (h) =>
      h.offset + h.bytes.length < data.length &&
      data[h.offset + h.bytes.length] === 10 &&
      data.subarray(h.offset, h.offset + h.bytes.length).toString('latin1') === h.bytes
  );
}

// -------------------------------------------- the short-line records --

/** A line of exactly `len` bytes, `{"n":k,"pad":"abc…"}`. */
function lineOf(k: number, len: number): string {
  const head = `{"n":${String(k)},"pad":"`;
  const fill = Math.max(0, len - head.length - 2);
  return `${head}${'abcdefghijklmnopqrstuvwxyz'.repeat(Math.ceil(fill / 26)).slice(0, fill)}"}`;
}

/** SPEC §2.4 part 2's record: 30 lines of 23 bytes, 720 bytes with their newlines. */
const BODY = Array.from({ length: 30 }, (_, k) => `${lineOf(k, 23)}\n`).join('');
/** The line the agent is still writing, 58 bytes, cut at every byte below. */
const UNFINISHED = '{"n":"last","text":"the agent is still writing this line"}';

const CHUNKS = [1, 2, 3, 5, 7, 8, 13, 16, 31, 64, 100, 4096];
const STARTS = [0, 5];

/** Refuses lines 2 and 20 to 29 on an 8 byte head, and admits the unfinished one. */
const HEAD_RULE: HeadRule = { headBytes: 8, head: '{"n":', rejectHead: '"n":2' };
const HEAD_PREFILTER: Prefilter = {
  headBytes: HEAD_RULE.headBytes,
  rules: [{ head: HEAD_RULE.head, rejectHead: [HEAD_RULE.rejectHead] }]
};

// ------------------------------------------------------------- (a) ----

describe('Phase 355 (a): the newline search sees only the bytes a read returned, at every cut', () => {
  it('every cut of a last unfinished line, twelve chunk sizes, two starts, with and without a head', () => {
    expect(Buffer.byteLength(BODY)).toBe(720);
    expect(UNFINISHED).toHaveLength(58);
    const compiled = compileHead(HEAD_PREFILTER);
    const heads = [
      ['no prefilter', null, null],
      ['an 8 byte head', compiled, HEAD_RULE]
    ] as const;
    const wrong: string[] = [];
    const pastTheEnd: string[] = [];
    let cases = 0;
    let staleAtTheReadsEnd = 0;
    let skippedOnHead = 0;
    const file = fileNamed('cut');
    for (const chunkSize of CHUNKS) {
      for (const start of STARTS) {
        for (let k = 1; k <= UNFINISHED.length; k += 1) {
          const content = BODY + UNFINISHED.slice(0, k);
          fs.writeFileSync(file, content);
          // From the record alone: the last read is short and follows a full
          // read, and the byte one chunk before the record's end, the one the
          // read before left at chunk[n], is a newline.
          const size = Buffer.byteLength(content);
          const span = size - start;
          if (span > chunkSize && span % chunkSize !== 0 && content.charCodeAt(size - chunkSize) === 10) {
            staleAtTheReadsEnd += 1;
          }
          for (const [mode, prefilter, rule] of heads) {
            const label = `${mode}, chunk ${String(chunkSize)}, start ${String(start)}, cut ${String(k)}`;
            const got = scanned(file, prefilter, { chunkSize, start });
            const want = referenceRead(file, start, rule);
            cases += 1;
            skippedOnHead += want.acct.linesSkippedOnHead;
            const diff = differences(got, want, true);
            if (diff.length > 0) wrong.push(`${label}: ${diff.join(', ')}`);
            if (got.acct.lastCompleteOffset > size) {
              pastTheEnd.push(`${label}: ${String(got.acct.lastCompleteOffset)} for a size of ${String(size)}`);
            }
          }
        }
      }
    }
    expect(cases).toBe(CHUNKS.length * STARTS.length * UNFINISHED.length * heads.length);
    // The matrix holds the shape a search one byte too wide fails on (SPEC
    // §2.4 measured 25), and the head refuses lines, so neither half of the
    // case is idle.
    expect(staleAtTheReadsEnd, 'cases with the previous read’s newline at the read’s end').toBeGreaterThanOrEqual(1);
    expect(skippedOnHead).toBeGreaterThan(0);
    expect(wrong.length, wrong.slice(0, 12).join('\n')).toBe(0);
    expect(pastTheEnd.length, pastTheEnd.slice(0, 12).join('\n')).toBe(0);
  });
});

// ------------------------------------------------------------- (b) ----

/** A record under one chunk whose every line and the unfinished one are a multiple of 20 bytes. */
function recordUnderOneChunk(): { content: string; mid: number } {
  // `{"k":"00000","x":1}` is 19 bytes, 20 with its newline; the unfinished
  // line is 40 bytes. From 0 and from a line's start, every read ends on a
  // multiple of 20, so a 20 byte marker in the chunk begins exactly at the
  // read's end and a search past it would carry the whole marker.
  const body = Array.from({ length: 1000 }, (_, k) => `{"k":"${String(k).padStart(5, '0')}","x":1}\n`).join('');
  const content = body + UNFINISHED.slice(0, 40);
  return { content, mid: 500 * 20 };
}

const MARKER = '"never in the file"\n';

interface Filled {
  reading: Reading;
  /** What `Buffer.allocUnsafe` was asked for while the scanner ran. */
  asked: number[];
  chunk: Buffer | undefined;
}

/** The SHIPPING scanner, handed a chunk filled with `pattern` instead of whatever memory held. */
function scanOverAFilledChunk(file: string, start: number, pattern: Buffer): Filled {
  const asked: number[] = [];
  const chunks: Buffer[] = [];
  const spy = vi.spyOn(Buffer, 'allocUnsafe').mockImplementation((size: number) => {
    asked.push(size);
    const chunk = REAL_ALLOC_UNSAFE(size).fill(pattern);
    chunks.push(chunk);
    return chunk;
  });
  let reading: Reading;
  try {
    reading = scanned(file, null, { start });
  } finally {
    spy.mockRestore();
  }
  return { reading, asked, chunk: chunks[0] };
}

describe('Phase 355 (b): memory no read wrote finishes no line', () => {
  const { content, mid } = recordUnderOneChunk();
  const FILLS = [
    ['newlines', Buffer.from([0x0a])],
    ['a marker line', Buffer.from(MARKER)]
  ] as const;
  for (const [fillName, pattern] of FILLS) {
    for (const start of [0, mid]) {
      it(`a chunk filled with ${fillName}, read from ${start === 0 ? 'the start' : 'a mid offset, a tail read'}`, () => {
        const file = fileNamed('under-one-chunk');
        fs.writeFileSync(file, content);
        const size = Buffer.byteLength(content);
        const n = size - start;
        expect(n).toBeLessThan(SHIPPING_CHUNK);
        expect(n % MARKER.length).toBe(0);
        const { reading, asked, chunk } = scanOverAFilledChunk(file, start, pattern);
        // The scanner asked for one chunk of the shipping size, and the chunk
        // it read into still holds the fill past the bytes the read returned,
        // so this case cannot pass on fresh zeros.
        expect(asked).toEqual([SHIPPING_CHUNK]);
        expect(chunk).toBeDefined();
        const filled = Buffer.alloc(SHIPPING_CHUNK).fill(pattern);
        expect(
          chunk !== undefined && chunk.subarray(n).equals(filled.subarray(n)),
          'the chunk was filled past the read'
        ).toBe(true);
        // The answer is the record's, and nothing handed came from the fill.
        expect(differences(reading, referenceRead(file, start, null), true)).toEqual([]);
        expect(reading.acct.lastCompleteOffset).toBe(size - 40);
        expect(wholeLinesOf(file, reading.handed)).toBe(true);
        expect(reading.handed.some((h) => h.bytes.includes(MARKER.trimEnd()))).toBe(false);
      });
    }
  }
});

// ------------------------------------------------------------- (c) ----

describe('Phase 355 (c): a record that grows during the read', () => {
  it('the rest of the line and one more line arrive after the first short read, at every cut', () => {
    const after = `${lineOf(9999, 30)}\n`;
    const fired = new Map<number, number>();
    const wrong: string[] = [];
    const file = fileNamed('growing');
    for (const chunkSize of [3, 16, 64, 4096]) {
      fired.set(chunkSize, 0);
      for (let k = 1; k <= UNFINISHED.length; k += 1) {
        const content = BODY + UNFINISHED.slice(0, k);
        fs.writeFileSync(file, content);
        const sizeBefore = Buffer.byteLength(content);
        growth.path = file;
        growth.text = `${UNFINISHED.slice(k)}\n${after}`;
        growth.fds.clear();
        growth.fired = 0;
        growth.armed = true;
        let got: Reading;
        try {
          got = scanned(file, null, { chunkSize, start: 0 });
        } finally {
          growth.armed = false;
          growth.fds.clear();
        }
        // A cut whose last read is a whole chunk ends on a read of 0 bytes,
        // so the growth never fires there; the record then reads as written.
        if (growth.fired === 1) fired.set(chunkSize, (fired.get(chunkSize) ?? 0) + 1);
        const label = `chunk ${String(chunkSize)}, cut ${String(k)}, ${growth.fired === 1 ? 'grown' : 'not grown'}`;
        const want = referenceRead(file, 0, null);
        const diff = differences(got, want, false);
        if (got.acct.size !== sizeBefore) diff.push(`size ${String(got.acct.size)} for ${String(sizeBefore)}`);
        if (!wholeLinesOf(file, got.handed)) diff.push('a handed line is not a whole line of the record at its offset');
        if (diff.length > 0) wrong.push(`${label}: ${diff.join(', ')}`);
      }
    }
    for (const [chunkSize, n] of fired) {
      expect(n, `chunk ${String(chunkSize)}: the growth fired`).toBeGreaterThanOrEqual(1);
    }
    expect(wrong.length, wrong.slice(0, 12).join('\n')).toBe(0);
  });
});

// ---------------------------------------------------- codex records --

const SESSION = '00005555-3555-7000-8000-355355355355';

/** Codex records in the committed fixture's shapes, numbered as they are written. */
function codexWriter(): {
  meta: () => string;
  pad: () => string;
  started: (t: number) => string;
  ask: (text: string) => string;
  said: (t: number, text: string) => string;
  complete: (t: number, text: string, durationMs: number) => string;
} {
  let ordinal = 0;
  const rec = (type: string, payload: Record<string, unknown>): string => {
    const s = ordinal;
    ordinal += 1;
    const timestamp = `2026-11-03T1${String(Math.floor(s / 3600) % 10)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.000Z`;
    return `${JSON.stringify({ timestamp, ordinal: s, type, payload })}\n`;
  };
  return {
    meta: () =>
      rec('session_meta', {
        session_id: SESSION,
        id: SESSION,
        cwd: '/Users/example/p355',
        originator: 'codex-tui',
        cli_version: '0.147.0',
        source: 'cli',
        thread_source: 'user',
        model_provider: 'openai',
        instructions: null
      }),
    // No head marker in its first 200 bytes: the codex head refuses it.
    pad: () => rec('event_msg', { type: 'p355_pad', pad: 'x'.repeat(900) }),
    started: (t) =>
      rec('event_msg', {
        type: 'task_started',
        turn_id: `turn-${String(t)}`,
        started_at: 1793700000 + t,
        model_context_window: 258400,
        collaboration_mode_kind: 'default'
      }),
    ask: (text) =>
      rec('event_msg', {
        type: 'user_message',
        message: text,
        images: [],
        local_images: [],
        audio: [],
        local_audio: [],
        text_elements: []
      }),
    said: (t, text) => rec('event_msg', { type: 'agent_message', message: text, turn_id: `turn-${String(t)}` }),
    complete: (t, text, durationMs) =>
      rec('event_msg', {
        type: 'task_complete',
        turn_id: `turn-${String(t)}`,
        last_agent_message: text,
        started_at: 1793700000 + t,
        completed_at: 1793700010 + t,
        duration_ms: durationMs,
        time_to_first_token_ms: 900
      })
  };
}

function codexMap(): ProviderMap {
  const cfg = providerMap('codex');
  if (!cfg) throw new Error('the shipping keep map has no codex entry');
  return cfg;
}

const readCodex = (file: string, watermark: ContainerResult['watermark']): ContainerResult =>
  readJsonl(codexMap(), { file, sessionId: null, watermark });

/** The tail read as `service.ts` hands it to `store.replaceTurnsFrom`. */
function mergedAsTheStoreMerges(first: ContainerResult, next: ContainerResult): ContainerResult['turns'] {
  const fromIndex = next.turns[0]?.index ?? next.watermark?.turnIndex ?? 0;
  return [...first.turns.filter((t) => t.index < fromIndex), ...next.turns];
}

// ------------------------------------------------------------- (d) ----

const SENTENCES = [
  'the migration for the ledger table ran and the counts agree with the export.',
  'two tests failed on the release branch, both in the payments module.',
  'I reverted the config change and the staging deploy is green again.',
  'the flaky test is a timeout in the websocket handshake, not a real failure.',
  'nothing in the diff touches the public API, so no version bump is needed.',
  'the lint step is slow because it walks node_modules; I excluded it.',
  'the backup ran at 03:00 and the restore check read every row back.'
];

describe('Phase 355 (d): no reply is drawn before its line is whole', () => {
  it('a last reply cut at every byte, past one 1 MiB chunk of whole turns', () => {
    const w = codexWriter();
    const askOf = (t: number): string => `Please look at step ${String(t)} of the plan.`;
    const noteOf = (t: number, j: number): string =>
      `Step ${String(t)}, note ${String(j)}: ${SENTENCES[(t * 3 + j) % SENTENCES.length] ?? ''}`;
    const parts: string[] = [w.meta()];
    let bytes = Buffer.byteLength(parts[0] ?? '');
    let t = 0;
    while (bytes < SHIPPING_CHUNK + 40 * 1024) {
      t += 1;
      const turn = [
        w.started(t),
        w.ask(askOf(t)),
        w.said(t, noteOf(t, 1)),
        w.said(t, noteOf(t, 2)),
        w.said(t, noteOf(t, 3)),
        w.complete(t, `Step ${String(t)} is done.`, 9000)
      ].join('');
      parts.push(turn);
      bytes += Buffer.byteLength(turn);
    }
    const last = t + 1;
    parts.push(w.started(last), w.ask(askOf(last)));
    const head = parts.join('');
    const headBytes = Buffer.byteLength(head);
    const reply = w.said(last, noteOf(last, 1)).trimEnd();
    expect(headBytes).toBeGreaterThan(SHIPPING_CHUNK);
    const file = fileNamed('reply-cut');
    fs.writeFileSync(file, head);
    const drawn: string[] = [];
    for (let k = 1; k < reply.length; k += 1) {
      fs.truncateSync(file, headBytes);
      fs.appendFileSync(file, reply.slice(0, k));
      const r = readCodex(file, null);
      const lastTurn = r.turns[r.turns.length - 1];
      if (
        r.turns.length !== last ||
        lastTurn === undefined ||
        lastTurn.ask.text !== askOf(last) ||
        lastTurn.answer !== null
      ) {
        const what =
          lastTurn?.answer != null
            ? `drawing "${lastTurn.answer.text.slice(0, 80)}"`
            : `asking "${String(lastTurn?.ask.text)}"`;
        drawn.push(`cut ${String(k)}: ${String(r.turns.length)} turns, the last ${what}`);
      }
    }
    expect(reply.length - 1).toBeGreaterThan(100);
    expect(drawn.length, drawn.slice(0, 12).join('\n')).toBe(0);
  }, 120_000);
});

// ------------------------------------------------------------- (e) ----

describe('Phase 355 (e): no reply is lost when the record grows during the read', () => {
  it('the turn whose close was unfinished keeps its reply, and the merged turns equal a whole read', () => {
    const w = codexWriter();
    const askOf = (t: number): string => `Ask number ${String(t)}: is the build green?`;
    const replyOf = (t: number): string => `REPLY ${String(t)}: yes, the build is green and the tests pass.`;
    const pads: string[] = [];
    let padBytes = 0;
    while (padBytes < SHIPPING_CHUNK + 64 * 1024) {
      const p = w.pad();
      pads.push(p);
      padBytes += Buffer.byteLength(p);
    }
    const head = [
      w.meta(),
      ...pads,
      w.started(1),
      w.ask(askOf(1)),
      w.said(1, 'Working on ask 1.'),
      w.complete(1, replyOf(1), 10001),
      w.started(2),
      w.ask(askOf(2)),
      w.complete(2, replyOf(2), 10002),
      w.started(3),
      w.ask(askOf(3))
    ].join('');
    const close3 = w.complete(3, replyOf(3), 10003);
    const grownBy = [
      close3.slice(90),
      w.started(4),
      w.ask(askOf(4)),
      w.said(4, 'Working on ask 4.'),
      w.complete(4, replyOf(4), 10004),
      w.started(5),
      w.ask(askOf(5))
    ].join('');
    const file = fileNamed('grows-while-read');
    fs.writeFileSync(file, head + close3.slice(0, 90));
    growth.path = file;
    growth.text = grownBy;
    growth.fds.clear();
    growth.fired = 0;
    growth.armed = true;
    let grown: ContainerResult;
    try {
      grown = readCodex(file, null);
    } finally {
      growth.armed = false;
      growth.fds.clear();
    }
    expect(growth.fired, 'the record grew after the scanner’s first short read').toBe(1);

    // The read that met the growth reads what a whole read of the record as
    // it then stood reads, turn 3's reply and duration among it.
    const asItStood = readCodex(file, null);
    expect(JSON.stringify(grown.turns)).toBe(JSON.stringify(asItStood.turns));
    const turn3 = grown.turns.find((t) => t.ask.text === askOf(3));
    expect(turn3?.answer?.text).toBe(replyOf(3));
    expect(turn3?.durationMs).toBe(10003);

    // It grows once more and is read from the watermark, as the service reads
    // it, and the store's merge equals a whole read, every reply on record.
    fs.appendFileSync(file, w.said(5, 'Working on ask 5.') + w.complete(5, replyOf(5), 10005));
    const next = readCodex(file, grown.watermark);
    expect(next.work).toBe('tail');
    const merged = mergedAsTheStoreMerges(grown, next);
    const whole = readCodex(file, null);
    expect(JSON.stringify(merged)).toBe(JSON.stringify(whole.turns));
    const replies = (turns: ContainerResult['turns']): number => turns.filter((t) => t.answer !== null).length;
    expect(replies(merged)).toBe(replies(whole.turns));
    expect(replies(whole.turns)).toBe(5);
  }, 60_000);
});
