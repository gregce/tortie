/**
 * The tests' own DNS replies, and name-check deps a test drives by hand
 * (Phase 332, build/p332/SPEC.md §4.1).
 *
 * A SECOND SPELLING. `replyTo` writes a reply to a question with a writer of
 * this file's own, and `readQuestion` reads a question with a reader of this
 * file's own. Neither shares a line with `../public-name.ts`: this file
 * imports its TYPES and nothing that runs, so a bug in the shipping parser is
 * never mirrored by the fixture that feeds it.
 *
 * `fakeNameDeps` is a `NameCheckDeps` that opens no socket and reads only its
 * own hand-moved clock (Phase 332.1: `monotonic()` starts at 0 and moves only
 * by `advance(ms)`, so a sleep released by hand passes no time of its own).
 * Every question it is asked is recorded; its answer comes from a function the
 * test supplies (a record at 203.0.113.10 by default, RFC 5737's documentation
 * range, so no fixture names a real host); an answer can be HELD until the test
 * releases it; and its sleeps are released by hand, or at once on the next
 * macrotask with `sleep: 'now'`. `ipc.test.ts` and `switch-queue.test.ts`
 * construct `PocketHost` with it.
 *
 * The fake is not the transport and filters nothing: whatever bytes the answer
 * names reach the round as they are, so a test can hand the parser a wrong id,
 * a QR-0 packet or a lie without a socket.
 */

import type { NameCheckDeps, NameExchange, NameServer, NameServerSource } from '../public-name';

// ---------------------------------------------------------------------------
// Writing replies
// ---------------------------------------------------------------------------

export type FixtureType = 'A' | 'NS' | 'CNAME' | 'SOA' | 'TXT' | number;

const TYPE_CODES: Readonly<Record<Exclude<FixtureType, number>, number>> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  TXT: 16
};

export interface FixtureRecord {
  /**
   * The owner. `'question'` (the default) is the pointer `c0 0c` to the
   * question's name; a string is written out in full, uncompressed; a Buffer
   * is written verbatim (a hand-made name, pointers included); `{ pointer }`
   * is a two-byte pointer to that offset.
   */
  readonly owner?: 'question' | string | Buffer | { readonly pointer: number };
  /** Default `A`. */
  readonly type?: FixtureType;
  /** Default 1 (`IN`). */
  readonly klass?: number;
  /** Default 60. */
  readonly ttl?: number;
  /** For `A`: a dotted quad. */
  readonly address?: string;
  /** For `NS` and `CNAME`: the target, written out in full. */
  readonly target?: string;
  /** The rdata verbatim; wins over `address` and `target`. */
  readonly rdata?: Buffer;
  /** RDLENGTH as written, when a test lies about it. */
  readonly rdlength?: number;
}

export interface ReplySpec {
  /** Default 0. */
  readonly rcode?: number;
  /** The authoritative bit. Default true. */
  readonly aa?: boolean;
  /** The truncation bit. Default false. */
  readonly tc?: boolean;
  /** Default true: a reply. */
  readonly qr?: boolean;
  /** Default 0. */
  readonly opcode?: number;
  /** The recursion-available bit. Default false. */
  readonly ra?: boolean;
  /** Default: the question's id. */
  readonly id?: number;
  /** `'echo'` (the default) copies the question section; `'none'` writes none; a Buffer is written in its place. */
  readonly question?: 'echo' | 'none' | Buffer;
  /** QDCOUNT as written. Default: 1, or 0 with `question: 'none'`. */
  readonly qdcount?: number;
  readonly answers?: readonly FixtureRecord[];
  readonly authority?: readonly FixtureRecord[];
  readonly additional?: readonly FixtureRecord[];
  /** The counts as written in the header, when a test lies about them. */
  readonly counts?: { readonly an?: number; readonly ns?: number; readonly ar?: number };
  /** Bytes appended after the last record. */
  readonly trailing?: Buffer;
  /** The whole reply, verbatim: every other field is ignored. */
  readonly raw?: Buffer;
}

/** A name written out in full: each label its length byte and its bytes, then the root. No compression. */
export function writeName(name: string): Buffer {
  const text = name.endsWith('.') ? name.slice(0, -1) : name;
  const parts: Buffer[] = [];
  if (text.length > 0) {
    for (const label of text.split('.')) {
      const bytes = Buffer.from(label, 'latin1');
      parts.push(Buffer.from([bytes.length]), bytes);
    }
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function u16(value: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(value & 0xffff, 0);
  return b;
}

function u32(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(value >>> 0, 0);
  return b;
}

function octetsOf(address: string): Buffer {
  const parts = address.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error(`dns-fixtures: ${JSON.stringify(address)} is not a dotted quad`);
  }
  return Buffer.from(parts);
}

/** An SOA's rdata with every name written out: `ns1.zone-a.example. hostmaster.zone-a.example. 1 7200 3600 1209600 <minimum>`. */
export function soaRdata(minimum = 300): Buffer {
  return Buffer.concat([
    writeName('ns1.zone-a.example'),
    writeName('hostmaster.zone-a.example'),
    u32(1),
    u32(7200),
    u32(3600),
    u32(1_209_600),
    u32(minimum)
  ]);
}

/** The zone's SOA, as a miss carries it (O4: `ts.net. 300 IN SOA … 300`), its owner written out. */
export const ZONE_SOA: FixtureRecord = Object.freeze({ owner: 'ts.net', type: 'SOA', ttl: 300, rdata: soaRdata(300) });

function recordBytes(record: FixtureRecord): Buffer {
  const owner = record.owner ?? 'question';
  const ownerBytes =
    owner === 'question'
      ? Buffer.from([0xc0, 0x0c])
      : Buffer.isBuffer(owner)
        ? owner
        : typeof owner === 'string'
          ? writeName(owner)
          : Buffer.from([0xc0 | ((owner.pointer >> 8) & 0x3f), owner.pointer & 0xff]);
  const typeName = record.type ?? 'A';
  const type = typeof typeName === 'number' ? typeName : TYPE_CODES[typeName];
  const rdata =
    record.rdata ??
    (record.address !== undefined
      ? octetsOf(record.address)
      : record.target !== undefined
        ? writeName(record.target)
        : Buffer.alloc(0));
  return Buffer.concat([
    ownerBytes,
    u16(type),
    u16(record.klass ?? 1),
    u32(record.ttl ?? 60),
    u16(record.rdlength ?? rdata.length),
    rdata
  ]);
}

/** The question section of a query: everything after its 12-byte header. */
export function questionOf(query: Buffer): Buffer {
  return query.subarray(12);
}

/**
 * A reply to `query`, written by this file. The default is an authoritative
 * NOERROR echoing the question with no record; every field of {@link
 * ReplySpec} moves one thing, so a test says exactly how its reply lies.
 */
export function replyTo(query: Buffer, spec: ReplySpec = {}): Buffer {
  if (spec.raw !== undefined) return Buffer.from(spec.raw);
  const id = spec.id ?? query.readUInt16BE(0);
  const flagsHigh =
    ((spec.qr ?? true) ? 0x80 : 0) |
    (((spec.opcode ?? 0) & 0x0f) << 3) |
    ((spec.aa ?? true) ? 0x04 : 0) |
    ((spec.tc ?? false) ? 0x02 : 0) |
    (query.readUInt8(2) & 0x01); // RD is copied from the question, as a server does
  const flagsLow = ((spec.ra ?? false) ? 0x80 : 0) | ((spec.rcode ?? 0) & 0x0f);
  const question =
    spec.question === undefined || spec.question === 'echo'
      ? questionOf(query)
      : spec.question === 'none'
        ? Buffer.alloc(0)
        : spec.question;
  const qdcount = spec.qdcount ?? (spec.question === 'none' ? 0 : 1);
  const answers = spec.answers ?? [];
  const authority = spec.authority ?? [];
  const additional = spec.additional ?? [];
  const header = Buffer.concat([
    u16(id),
    Buffer.from([flagsHigh, flagsLow]),
    u16(qdcount),
    u16(spec.counts?.an ?? answers.length),
    u16(spec.counts?.ns ?? authority.length),
    u16(spec.counts?.ar ?? additional.length)
  ]);
  return Buffer.concat([
    header,
    question,
    ...answers.map(recordBytes),
    ...authority.map(recordBytes),
    ...additional.map(recordBytes),
    spec.trailing ?? Buffer.alloc(0)
  ]);
}

/** An authoritative `A` at `address`, its owner the pointer to the question: what a zone server answers once the name is public. */
export function recordReply(address = '203.0.113.10'): ReplySpec {
  return { aa: true, answers: [{ address }] };
}

/** An authoritative NXDOMAIN carrying the zone's SOA: what a zone server answers before the name is public. */
export function nxdomainReply(): ReplySpec {
  return { aa: true, rcode: 3, authority: [ZONE_SOA] };
}

/** An authoritative NOERROR with no answer (NODATA). */
export function noRecordReply(): ReplySpec {
  return { aa: true, authority: [ZONE_SOA] };
}

/** A resolver's recursive `NS` answer for the question's name. */
export function nsReply(targets: readonly string[]): ReplySpec {
  return { aa: false, ra: true, answers: targets.map((target) => ({ type: 'NS', target })) };
}

/** A resolver's recursive `A` answer for the question's name. */
export function addressReply(addresses: readonly string[]): ReplySpec {
  return { aa: false, ra: true, answers: addresses.map((address) => ({ address })) };
}

// ---------------------------------------------------------------------------
// Reading questions
// ---------------------------------------------------------------------------

export interface FixtureQuestion {
  readonly id: number;
  /** The recursion-desired bit. */
  readonly rd: boolean;
  /** The name as asked, labels joined by dots, no trailing dot. */
  readonly qname: string;
  /** `'A'`, `'NS'`, or the number for anything else. */
  readonly qtype: 'A' | 'NS' | number;
  readonly qclass: number;
  /** QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT. */
  readonly counts: readonly [number, number, number, number];
}

/** This file's own reader of a question: no pointers (a question is never compressed), or null. */
export function readQuestion(query: Buffer): FixtureQuestion | null {
  if (query.length < 17) return null;
  const labels: string[] = [];
  let pos = 12;
  for (;;) {
    if (pos >= query.length) return null;
    const length = query.readUInt8(pos);
    if (length === 0) break;
    if (length > 63 || pos + 1 + length > query.length) return null;
    labels.push(query.subarray(pos + 1, pos + 1 + length).toString('latin1'));
    pos += 1 + length;
  }
  pos += 1;
  if (pos + 4 > query.length) return null;
  const code = query.readUInt16BE(pos);
  return {
    id: query.readUInt16BE(0),
    rd: (query.readUInt8(2) & 0x01) !== 0,
    qname: labels.join('.'),
    qtype: code === 1 ? 'A' : code === 2 ? 'NS' : code,
    qclass: query.readUInt16BE(pos + 2),
    counts: [query.readUInt16BE(4), query.readUInt16BE(6), query.readUInt16BE(8), query.readUInt16BE(10)]
  };
}

// ---------------------------------------------------------------------------
// Deps a test drives by hand
// ---------------------------------------------------------------------------

/**
 * What the fake server answers: a reply written by {@link replyTo}, bytes
 * verbatim, `'silent'` (the deadline passed: `timeout`, at once), `'error'`
 * (the socket failed), or `'hold'` (parked until the test releases it).
 */
export type FakeAnswer = ReplySpec | Buffer | 'silent' | 'error' | 'hold';

export interface FakeQuestion extends FixtureQuestion {
  readonly server: NameServer;
  readonly query: Buffer;
}

export type FakeAnswerFn = (qname: string, qtype: 'A' | 'NS' | number, question: FakeQuestion) => FakeAnswer;

export interface FakeSleep {
  readonly ms: number;
  readonly released: boolean;
  release(): void;
}

export interface FakeHeld {
  readonly question: FakeQuestion;
  readonly released: boolean;
  /** Answer it now: with `answer`, or else with what the answer function says now (a second `'hold'` answers the record). */
  release(answer?: FakeAnswer): void;
}

export interface FakeNameDepsOptions {
  /** Default: the record at 203.0.113.10 for an `A` question, and silence for anything else. */
  answer?: FakeAnswerFn;
  /** Default: one fixed server, `127.0.0.1:53`, which no socket ever reaches. */
  source?: NameServerSource;
  /** `'hand'` (the default): every sleep waits for the test. `'now'`: each resolves on the next macrotask. A function is used as it is. */
  sleep?: 'hand' | 'now' | ((ms: number) => Promise<void>);
  /** The first id handed out, then one more each time. Default 0x1000. */
  firstId?: number;
  /** Phase 332.1: the clock `monotonic()` answers. Default: the hand-moved clock ({@link FakeNameDeps.advance}). */
  monotonic?: () => number;
}

export interface FakeNameDeps extends NameCheckDeps {
  /** Every question asked, in order. */
  readonly questions: FakeQuestion[];
  /** Every sleep asked for, in order, released or not. */
  readonly sleeps: FakeSleep[];
  /** Every held answer, in order, released or not. */
  readonly held: FakeHeld[];
  /** The durations of the sleeps still waiting, in the order they were asked. */
  pendingSleeps(): number[];
  /** Release every waiting sleep, or only those of `ms`. Answers how many. */
  releaseSleeps(ms?: number): number;
  /** Release every waiting held answer (see {@link FakeHeld.release}). Answers how many. */
  releaseHeld(answer?: FakeAnswer): number;
  /** Change what the server answers from the next question on (a held one re-reads it on release). */
  answerWith(answer: FakeAnswer | FakeAnswerFn): void;
  /** Phase 332.1: move the hand-moved clock forward by `ms` (never back). Answers where it now reads. */
  advance(ms: number): number;
  /** Phase 332.1: where the hand-moved clock reads, without counting as a read by the host. */
  monotonicAt(): number;
  /** Phase 332.1: how many times the host read `monotonic()`. */
  monotonicReads(): number;
}

const DEFAULT_SERVERS: readonly NameServer[] = Object.freeze([{ address: '127.0.0.1', port: 53 }]);

function defaultAnswer(_qname: string, qtype: 'A' | 'NS' | number): FakeAnswer {
  return qtype === 'A' ? recordReply() : 'silent';
}

function exchangeOf(query: Buffer, answer: FakeAnswer): NameExchange {
  if (answer === 'silent') return { kind: 'timeout' };
  if (answer === 'error') return { kind: 'error' };
  if (answer === 'hold') return { kind: 'reply', bytes: replyTo(query, recordReply()) };
  if (Buffer.isBuffer(answer)) return { kind: 'reply', bytes: Buffer.from(answer) };
  return { kind: 'reply', bytes: replyTo(query, answer) };
}

/** A `NameCheckDeps` that opens no socket and reads only its own hand-moved clock. See the file's header. */
export function fakeNameDeps(options: FakeNameDepsOptions = {}): FakeNameDeps {
  let answerFn: FakeAnswerFn = options.answer ?? defaultAnswer;
  let nextId = (options.firstId ?? 0x1000) & 0xffff;
  const questions: FakeQuestion[] = [];
  const sleeps: Array<FakeSleep & { released: boolean }> = [];
  const held: Array<FakeHeld & { released: boolean }> = [];
  const sleepMode = options.sleep ?? 'hand';
  let handClock = 0;
  let clockReads = 0;

  const sleep = (ms: number): Promise<void> => {
    if (typeof sleepMode === 'function') return sleepMode(ms);
    return new Promise<void>((resolve) => {
      const entry = {
        ms,
        released: false,
        release(): void {
          if (entry.released) return;
          entry.released = true;
          resolve();
        }
      };
      sleeps.push(entry);
      if (sleepMode === 'now') setImmediate(() => entry.release());
    });
  };

  const exchange = (server: NameServer, packet: Buffer): Promise<NameExchange> => {
    const read = readQuestion(packet);
    const question: FakeQuestion = {
      ...(read ?? { id: -1, rd: false, qname: '', qtype: -1, qclass: -1, counts: [0, 0, 0, 0] as const }),
      server: { address: server.address, port: server.port },
      query: Buffer.from(packet)
    };
    questions.push(question);
    const answer = answerFn(question.qname, question.qtype, question);
    if (answer !== 'hold') return Promise.resolve(exchangeOf(packet, answer));
    return new Promise<NameExchange>((resolve) => {
      const entry = {
        question,
        released: false,
        release(given?: FakeAnswer): void {
          if (entry.released) return;
          entry.released = true;
          const now = given ?? answerFn(question.qname, question.qtype, question);
          resolve(exchangeOf(packet, now));
        }
      };
      held.push(entry);
    });
  };

  return {
    source: options.source ?? { kind: 'fixed', servers: DEFAULT_SERVERS },
    exchange,
    id: () => {
      const id = nextId;
      nextId = (nextId + 1) & 0xffff;
      return id;
    },
    sleep,
    monotonic: () => {
      clockReads += 1;
      return options.monotonic !== undefined ? options.monotonic() : handClock;
    },
    questions,
    sleeps,
    held,
    pendingSleeps: () => sleeps.filter((s) => !s.released).map((s) => s.ms),
    releaseSleeps: (ms?: number) => {
      const waiting = sleeps.filter((s) => !s.released && (ms === undefined || s.ms === ms));
      for (const s of waiting) s.release();
      return waiting.length;
    },
    releaseHeld: (answer?: FakeAnswer) => {
      const waiting = held.filter((h) => !h.released);
      for (const h of waiting) h.release(answer);
      return waiting.length;
    },
    answerWith: (answer: FakeAnswer | FakeAnswerFn) => {
      answerFn = typeof answer === 'function' ? answer : () => answer;
    },
    advance: (ms: number) => {
      if (!Number.isFinite(ms) || ms < 0) throw new Error(`dns-fixtures: a monotonic clock does not move by ${String(ms)}`);
      handClock += ms;
      return handClock;
    },
    monotonicAt: () => handClock,
    monotonicReads: () => clockReads
  };
}
