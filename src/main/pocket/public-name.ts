/**
 * Whether the Mac's public name answers from the internet (Phase 332,
 * build/p332/SPEC.md §4.1-§4.8 and §9).
 *
 * Tailscale publishes the door at `https://<publicName>:<publicPort>`, and the
 * public name reached public DNS about eight minutes after the door first
 * listened (build/p330/SPEC.md M5). A phone that scans before then asks for a
 * name that does not exist yet, and its resolver keeps that miss for 300 s
 * (the zone's SOA minimum, O4), which is longer than the pairing window. So
 * the Mac asks first, and `PocketHost` (`./ipc.ts`) shows a code only once the
 * name answers. This module is the asking: it writes and reads every packet
 * itself and decides nothing about the door.
 *
 * ## Why the packets are written here, and why not `node:dns`
 *
 * `node:dns` cannot clear the recursion-desired bit and cannot report the
 * authoritative bit, and the verdict below rests on both. It is also c-ares, a
 * C parser of bytes anyone on the path can forge, inside main, which is the
 * reason the door process left main. A JavaScript parser that meets a bad
 * packet answers a reason word, and every reason word is `unreadable`.
 *
 * ## What is asked, and of whom
 *
 * - Once per check run, 1.1.1.1 and 8.8.8.8 are asked `NS ts.net` and the NS
 *   hosts' `A`, with recursion on (§4.6). No question in that search names the
 *   Mac's name or its tailnet.
 * - Each round, every kept `ts.net` server is asked ONE `A` question for the
 *   Mac's public name with recursion OFF (§4.2). A resolver that intercepts
 *   port 53 answers a non-recursive question from its cache or refuses; it
 *   never goes and fetches the name, so the check cannot plant the 300 s miss
 *   the phone would then meet, and an intercepted answer lacks the
 *   authoritative bit and reads `unreadable`.
 *
 * ## What is trusted
 *
 * Only `reply.length` (§4.4). A reply is refused unless it is at most 512
 * bytes, carries the question's id, echoes the question byte for byte, holds at
 * most 32 records, and every name in it is bounded: labels of at most 63 bytes,
 * names of at most 255, pointers strictly backward and at most 8 per name, and
 * no trailing byte. A `record` needs the authoritative bit, the exact name
 * (RFC 4343's ASCII case rule), `A`/`IN` only, and every address public
 * (`NAME_REFUSED_V4`). The address is never compared with anything else, never
 * stored and never dialled.
 *
 * ## The transport, and the one guard that keeps a test off the internet
 *
 * One connected `udp4` socket per question, with a `lookup` of this module's
 * own that answers a literal address and nothing else, so `node:dns` is never
 * reached (Node's dgram calls the socket's `lookup` for bind and connect). A
 * loopback server is bound from `127.0.0.1`, so no test binds an interface. A
 * server that is not `127.0.0.1` is asked only inside Electron (D8): vitest,
 * `tsx` and plain `node` are not Electron, so no test and no script reaches a
 * real server through this transport, whatever it forgets to inject.
 *
 * ## What this module does not do
 *
 * It imports `node:dgram`, `node:crypto` and `node:net` and nothing else: no
 * `electron`, no logger, no file. It logs nothing; it answers reason words and
 * the host logs those. It reads one clock, the monotonic one in
 * `defaultNameCheckDeps`, and only for the sheet's progress (Phase 332.1); the
 * deadline is a `setTimeout`, and the schedule is gaps the host sleeps through.
 * Nothing thrown leaves it.
 */

import { createSocket, type RemoteInfo, type Socket } from 'node:dgram';
import { randomInt } from 'node:crypto';
import { isIPv4 } from 'node:net';

// ---------------------------------------------------------------------------
// Constants (§9)
// ---------------------------------------------------------------------------

/** The zone the Mac's public name is in; its SOA is `ts.net.` (O4). */
export const NAME_SEARCH_ZONE: string = 'ts.net';

/** The two resolvers the server search asks, in the order their answers win. */
export const NAME_SEARCH_RESOLVERS: readonly string[] = Object.freeze(['1.1.1.1', '8.8.8.8']);

/** Development builds only: up to four `127.0.0.1:<port>` servers asked in place of the search. */
export const NAME_SERVERS_ENV: string = 'GMUX_POCKET_NAME_SERVERS';

/** RFC 1035. */
export const NAME_DNS_PORT: number = 53;

/** At most this many zone servers are kept. */
export const NAME_SERVERS_MAX: number = 4;

/** One question's deadline. */
export const NAME_QUERY_DEADLINE_MS: number = 2_000;

/** RFC 1035 §4.2.1: no EDNS is sent, so no honest reply is longer. */
export const NAME_REPLY_MAX_BYTES: number = 512;

/** RFC 1035 §2.3.4. */
export const NAME_LABEL_MAX: number = 63;
export const NAME_WIRE_MAX: number = 255;

/** Strictly backward alone does not end a loop (§4.4), so a name follows at most this many. */
export const NAME_POINTERS_MAX: number = 8;

/** A real answer holds a handful. */
export const NAME_RECORDS_MAX: number = 32;

/** The gaps after the first rounds of a run; the last repeats. Measured from the END of a round. */
export const NAME_CHECK_GAPS_MS: readonly number[] = Object.freeze([20_000, 30_000, 45_000, 60_000]);

/** The gap after a `yes` that does not confirm (none does while {@link NAME_CONFIRM_YES_ROUNDS} is one). */
export const NAME_CHECK_AFTER_YES_MS: number = 20_000;

/**
 * `yes` rounds in a row that confirm. ONE (the fix round): a round is `yes`
 * only when a kept server answered the record and none said no
 * ({@link roundVerdictOf}), and a second round 20 s later held Pair back 20 s
 * on a Mac whose name already answered but was not yet remembered (the first
 * launch of this build, or after Tailscale's approval was asked again), where
 * the build before this phase showed it at once.
 */
export const NAME_CONFIRM_YES_ROUNDS: number = 1;

/**
 * `unreadable` rounds in a row that open Pair anyway, so nobody is locked out.
 * ONE (the fix round): three held Pair back about 55 s on a network that
 * blocks DNS, where the build before this phase showed it at once.
 */
export const NAME_UNREADABLE_ROUNDS: number = 1;

/**
 * Rounds in one run after which a name that still answers no opens Pair
 * anyway (the fix round). The 18th round of a run is about 15½ minutes in (0,
 * 20, 50, 95 and 155 s, then every 60 s), half as long again as the ten
 * minutes Tailscale documents for a new name, so a network that forges an
 * authoritative "no such name" delays Pair and never locks it away.
 */
export const NAME_OPEN_AFTER_ROUNDS: number = 18;

/**
 * The IPv4 ranges an answer may not name, as `[a, b, c, d, prefix]`. Named
 * once; {@link isPublicV4} is the only reader. Numbers rather than dotted
 * text, because `conformance:pocket` L2 refuses the unspecified address's
 * text anywhere in this domain.
 *
 *   0/8          unspecified
 *   10/8         private: a split-horizon or captive resolver
 *   100.64/10    carrier-grade NAT, and MagicDNS's answer for the Mac's name
 *   127/8        loopback
 *   169.254/16   link-local
 *   172.16/12    private
 *   192.168/16   private
 *   224/3        multicast and reserved, the broadcast address included
 *
 * The documentation ranges (192.0.2/24, 198.51.100/24, 203.0.113/24) are NOT
 * refused: no real resolver answers them, and they are what every test and
 * probe answers with, so no fixture names a real host.
 */
export const NAME_REFUSED_V4: readonly (readonly [number, number, number, number, number])[] = Object.freeze<
  readonly (readonly [number, number, number, number, number])[]
>([
  [0, 0, 0, 0, 8],
  [10, 0, 0, 0, 8],
  [100, 64, 0, 0, 10],
  [127, 0, 0, 0, 8],
  [169, 254, 0, 0, 16],
  [172, 16, 0, 0, 12],
  [192, 168, 0, 0, 16],
  [224, 0, 0, 0, 3]
]);

// ---------------------------------------------------------------------------
// Types (§4.1)
// ---------------------------------------------------------------------------

export type NameVerdict = 'yes' | 'no' | 'unreadable';
export type NameAnswer = 'record' | 'negative' | 'unreadable';
export type NameReason =
  | 'record'
  | 'nxdomain'
  | 'no-record'
  | 'timeout'
  | 'socket'
  | 'too-long'
  | 'malformed'
  | 'id'
  | 'not-reply'
  | 'opcode'
  | 'truncated'
  | 'servfail'
  | 'refused'
  | 'rcode'
  | 'question'
  | 'counts'
  | 'pointer'
  | 'label'
  | 'name-long'
  | 'trailing'
  | 'not-authoritative'
  | 'other-owner'
  | 'cname'
  | 'type'
  | 'class'
  | 'private-address'
  | 'no-servers'
  | 'override-unusable'
  | 'bad-name'
  | 'outside-zone'
  | 'error';

export interface NameServer {
  readonly address: string;
  readonly port: number;
}

export type NameServerSource =
  | { readonly kind: 'search' }
  | { readonly kind: 'fixed'; readonly servers: readonly NameServer[] }
  | { readonly kind: 'refused' };

export type NameExchange =
  | { readonly kind: 'reply'; readonly bytes: Buffer }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'error' };

export interface NameCheckDeps {
  readonly source: NameServerSource;
  /** One question to one server. Never rejects. */
  exchange(server: NameServer, packet: Buffer): Promise<NameExchange>;
  /** 0..65535. */
  id(): number;
  sleep(ms: number): Promise<void>;
  /**
   * Milliseconds on a clock nobody can set (Phase 332.1): read ONLY to tell the
   * sheet how long the check has run and when it asks next. Nothing in the
   * check decides from it (`conformance:pocket` D10). On macOS it counts the
   * Mac's sleep (build/p3321/SPEC.md §3 row 2, measured).
   */
  monotonic(): number;
}

/** A run's search result: `null` means search at the next round. */
export interface NameRoundCache {
  servers: readonly NameServer[] | null;
}

export interface NameRoundResult {
  readonly verdict: NameVerdict;
  readonly reason: NameReason;
}

/**
 * A round as the host reads it (Phase 332.1): the verdict, and each kept
 * server's answer, kinds only, in the order the servers were asked. Empty when
 * nothing was asked (a refused name, a refused override, no servers, a throw).
 */
export interface NameRound extends NameRoundResult {
  readonly answers: readonly NameAnswer[];
}

/** A round that asked nobody (Phase 332.1). */
const NO_NAME_ANSWERS: readonly NameAnswer[] = Object.freeze([]);

export interface NameStreak {
  readonly rounds: number;
  readonly yes: number;
  readonly unreadable: number;
  readonly opened: boolean;
}

export const NAME_STREAK_START: NameStreak = Object.freeze({ rounds: 0, yes: 0, unreadable: 0, opened: false });

/** One answer-section record. `rdataOffset` is kept so a name in the rdata can be read with pointers into the whole packet. */
export interface NameRecord {
  readonly owner: readonly Buffer[];
  readonly type: number;
  readonly klass: number;
  readonly rdata: Buffer;
  readonly rdataOffset: number;
}

export interface ParsedNameReply {
  readonly ok: true;
  readonly id: number;
  readonly aa: boolean;
  readonly rcode: number;
  readonly answers: readonly NameRecord[];
}

export interface NameReplyRefusal {
  readonly ok: false;
  readonly reason: NameReason;
}

// ---------------------------------------------------------------------------
// Names (§4.2)
// ---------------------------------------------------------------------------

const TYPE_A = 1;
const TYPE_NS = 2;
const TYPE_CNAME = 5;
const CLASS_IN = 1;

const NAME_TEXT = /^[A-Za-z0-9.-]+$/;
const LABEL_RULE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * §4.2's name rule: lowercased, one trailing dot dropped, at least two labels,
 * each 1..63 bytes of `[a-z0-9-]` neither starting nor ending with a hyphen,
 * and at most 255 bytes on the wire. The labels, or null.
 *
 * ASCII is checked BEFORE lowercasing, because `toLowerCase` turns some
 * non-ASCII letters into ASCII ones (the Kelvin sign becomes `k`).
 */
function labelsOfName(name: string): string[] | null {
  if (typeof name !== 'string' || !NAME_TEXT.test(name)) return null;
  let text = name.toLowerCase();
  if (text.endsWith('.')) text = text.slice(0, -1);
  const labels = text.split('.');
  if (labels.length < 2) return null;
  let wire = 1; // the root
  for (const label of labels) {
    if (label.length < 1 || label.length > NAME_LABEL_MAX || !LABEL_RULE.test(label)) return null;
    wire += 1 + label.length;
  }
  return wire <= NAME_WIRE_MAX ? labels : null;
}

/** §4.2's zone rule, for the question about the Mac's name: at least three labels, ending `ts.net`. */
function zoneNameOf(name: string): { readonly name: string } | { readonly reason: NameReason } {
  const labels = labelsOfName(name);
  if (labels === null) return { reason: 'bad-name' };
  const zone = NAME_SEARCH_ZONE.split('.');
  if (labels.length <= zone.length) return { reason: 'outside-zone' };
  const tail = labels.slice(labels.length - zone.length);
  if (tail.join('.') !== zone.join('.')) return { reason: 'outside-zone' };
  return { name: labels.join('.') };
}

/**
 * One question, hand-built (§4.2): a 12-byte header with QR, OPCODE, AA, TC
 * and every flag but RD clear, QDCOUNT 1 and no other record (no EDNS, no
 * DNSSEC bit, no cookie), then the name uncompressed, the type and `IN`. RD is
 * set only when `recursion` is true, which only the server search asks.
 * Null for an id outside 0..65535 or a name the rule refuses.
 */
export function encodeNameQuery(id: number, name: string, type: 'A' | 'NS', recursion: boolean): Buffer | null {
  try {
    if (!Number.isInteger(id) || id < 0 || id > 0xffff) return null;
    const qtype = type === 'A' ? TYPE_A : type === 'NS' ? TYPE_NS : 0;
    if (qtype === 0) return null;
    const labels = labelsOfName(name);
    if (labels === null) return null;
    const header = Buffer.alloc(12);
    header.writeUInt16BE(id, 0);
    header.writeUInt8(recursion === true ? 0x01 : 0x00, 2);
    header.writeUInt8(0x00, 3);
    header.writeUInt16BE(1, 4);
    const parts: Buffer[] = [header];
    for (const label of labels) {
      parts.push(Buffer.from([label.length]), Buffer.from(label, 'ascii'));
    }
    const tail = Buffer.alloc(5);
    tail.writeUInt8(0, 0);
    tail.writeUInt16BE(qtype, 1);
    tail.writeUInt16BE(CLASS_IN, 3);
    parts.push(tail);
    return Buffer.concat(parts);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The parser (§4.4)
// ---------------------------------------------------------------------------

function refusal(reason: NameReason): NameReplyRefusal {
  return { ok: false, reason };
}

type DecodedName =
  | { readonly ok: true; readonly labels: readonly Buffer[]; readonly next: number }
  | NameReplyRefusal;

/**
 * The one name reader, for owners and for NS targets. Every byte is checked
 * against `buf.length` before it is read.
 *
 * A pointer must land at or after the header's end and strictly before
 * itself, and a name may follow at most {@link NAME_POINTERS_MAX}. Strictly
 * backward stops a pointer naming itself or anything later; the cap ends the
 * one loop strictly backward still allows, a name that passes a label and
 * meets a later pointer back into its own bytes.
 */
function decodeName(buf: Buffer, start: number): DecodedName {
  const labels: Buffer[] = [];
  let pos = start;
  let next = -1;
  let wire = 0;
  let pointers = 0;
  for (;;) {
    if (pos < 0 || pos >= buf.length) return refusal('malformed');
    const length = buf.readUInt8(pos);
    if (length === 0) {
      wire += 1;
      if (wire > NAME_WIRE_MAX) return refusal('name-long');
      return { ok: true, labels, next: next === -1 ? pos + 1 : next };
    }
    const kind = length & 0xc0;
    if (kind === 0xc0) {
      if (pos + 1 >= buf.length) return refusal('malformed');
      const target = ((length & 0x3f) << 8) | buf.readUInt8(pos + 1);
      if (target < 12 || target >= pos) return refusal('pointer');
      pointers += 1;
      if (pointers > NAME_POINTERS_MAX) return refusal('pointer');
      if (next === -1) next = pos + 2;
      pos = target;
      continue;
    }
    // 0x40 is the extended label type and 0x80 is reserved. A 64-byte label
    // is written 0x40 and lands here.
    if (kind !== 0) return refusal('label');
    if (pos + 1 + length > buf.length) return refusal('malformed');
    wire += 1 + length;
    if (wire + 1 > NAME_WIRE_MAX) return refusal('name-long');
    labels.push(buf.subarray(pos + 1, pos + 1 + length));
    pos += 1 + length;
  }
}

/** RFC 4343: the same labels, each byte equal once `A-Z` is folded to `a-z`, and every other byte compared exactly. */
function sameName(a: readonly Buffer[], b: readonly Buffer[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x === undefined || y === undefined || x.length !== y.length) return false;
    for (let j = 0; j < x.length; j += 1) {
      if (foldAscii(x.readUInt8(j)) !== foldAscii(y.readUInt8(j))) return false;
    }
  }
  return true;
}

function foldAscii(byte: number): number {
  return byte >= 0x41 && byte <= 0x5a ? byte + 0x20 : byte;
}

function labelBuffers(labels: readonly string[]): Buffer[] {
  return labels.map((label) => Buffer.from(label, 'ascii'));
}

/**
 * Read a reply to `query`, trusting `reply.length` and nothing else. The first
 * failure answers its reason word, in §4.4's order: the size, the id, QR, the
 * opcode, TC, the RCODE (0 and 3 go on), the question echoed byte for byte,
 * the record count, every record of all three sections bounded and walked
 * (only the answer section is kept), and no trailing byte.
 */
export function readNameReply(query: Buffer, reply: Buffer): ParsedNameReply | NameReplyRefusal {
  try {
    if (reply.length > NAME_REPLY_MAX_BYTES) return refusal('too-long');
    if (reply.length < 12) return refusal('malformed');
    if (query.length < 12) return refusal('question');
    const id = reply.readUInt16BE(0);
    if (id !== query.readUInt16BE(0)) return refusal('id');
    const flags = reply.readUInt8(2);
    if ((flags & 0x80) === 0) return refusal('not-reply');
    if (((flags >> 3) & 0x0f) !== 0) return refusal('opcode');
    // No retry over TCP: a truncated answer is not read at all.
    if ((flags & 0x02) !== 0) return refusal('truncated');
    const rcode = reply.readUInt8(3) & 0x0f;
    if (rcode === 2) return refusal('servfail');
    if (rcode === 5) return refusal('refused');
    if (rcode !== 0 && rcode !== 3) return refusal('rcode');
    // BYTE FOR BYTE, so a compressed, case-changed, retyped or reclassed
    // question is refused.
    const question = query.subarray(12);
    if (
      reply.readUInt16BE(4) !== 1 ||
      reply.length < 12 + question.length ||
      !reply.subarray(12, 12 + question.length).equals(question)
    ) {
      return refusal('question');
    }
    const total = reply.readUInt16BE(6) + reply.readUInt16BE(8) + reply.readUInt16BE(10);
    if (total > NAME_RECORDS_MAX) return refusal('counts');
    const answerCount = reply.readUInt16BE(6);
    const answers: NameRecord[] = [];
    let cursor = 12 + question.length;
    for (let i = 0; i < total; i += 1) {
      const owner = decodeName(reply, cursor);
      if (!owner.ok) return refusal(owner.reason);
      cursor = owner.next;
      // TYPE, CLASS, TTL and RDLENGTH.
      if (cursor + 10 > reply.length) return refusal('malformed');
      const type = reply.readUInt16BE(cursor);
      const klass = reply.readUInt16BE(cursor + 2);
      const rdlength = reply.readUInt16BE(cursor + 8);
      cursor += 10;
      if (cursor + rdlength > reply.length) return refusal('malformed');
      if (i < answerCount) {
        answers.push({ owner: owner.labels, type, klass, rdata: reply.subarray(cursor, cursor + rdlength), rdataOffset: cursor });
      }
      cursor += rdlength;
    }
    if (cursor !== reply.length) return refusal('trailing');
    return { ok: true, id, aa: (flags & 0x04) !== 0, rcode, answers };
  } catch {
    return refusal('malformed');
  }
}

// ---------------------------------------------------------------------------
// The verdict (§4.5)
// ---------------------------------------------------------------------------

function unreadable(reason: NameReason): { readonly answer: NameAnswer; readonly reason: NameReason } {
  return { answer: 'unreadable', reason };
}

/**
 * One zone server's answer about `name`. `record` needs the authoritative
 * bit, the exact name, only `A`/`IN` of four bytes, and every address public;
 * one record failing makes the whole answer `unreadable`. `negative` is an
 * authoritative NXDOMAIN, or an authoritative NOERROR with no answer. A
 * cache, an interceptor and a referral lack the authoritative bit.
 */
export function judgeZoneAnswer(
  query: Buffer,
  reply: Buffer,
  name: string
): { readonly answer: NameAnswer; readonly reason: NameReason } {
  try {
    const parsed = readNameReply(query, reply);
    if (!parsed.ok) return unreadable(parsed.reason);
    if (!parsed.aa) return unreadable('not-authoritative');
    if (parsed.rcode === 3) return { answer: 'negative', reason: 'nxdomain' };
    if (parsed.answers.length === 0) return { answer: 'negative', reason: 'no-record' };
    const labels = labelsOfName(name);
    if (labels === null) return unreadable('bad-name');
    const wanted = labelBuffers(labels);
    for (const record of parsed.answers) {
      if (!sameName(record.owner, wanted)) return unreadable('other-owner');
      if (record.type === TYPE_CNAME) return unreadable('cname');
      if (record.type !== TYPE_A) return unreadable('type');
      if (record.klass !== CLASS_IN) return unreadable('class');
      if (record.rdata.length !== 4) return unreadable('malformed');
      if (!isPublicV4([...record.rdata])) return unreadable('private-address');
    }
    return { answer: 'record', reason: 'record' };
  } catch {
    return unreadable('error');
  }
}

/** Four octets outside every range of {@link NAME_REFUSED_V4}. A 32-bit mask comparison. */
export function isPublicV4(octets: readonly number[]): boolean {
  if (octets.length !== 4) return false;
  let value = 0;
  for (const octet of octets) {
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return false;
    value = ((value << 8) | octet) >>> 0;
  }
  for (const [a, b, c, d, prefix] of NAME_REFUSED_V4) {
    const base = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    if (((value & mask) >>> 0) === ((base & mask) >>> 0)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The round and the confirm rule (§4.7)
// ---------------------------------------------------------------------------

/**
 * Every kept server's answer, read as one round: any negative is `no` (a new
 * record reaches one anycast node before another, so one server still saying
 * NXDOMAIN means a phone may still be told it), else any record is `yes`, else
 * `unreadable` with the first reason in server order.
 */
export function roundVerdictOf(
  answers: readonly { readonly answer: NameAnswer; readonly reason: NameReason }[]
): NameRoundResult {
  const negative = answers.find((a) => a.answer === 'negative');
  if (negative !== undefined) return { verdict: 'no', reason: negative.reason };
  if (answers.some((a) => a.answer === 'record')) return { verdict: 'yes', reason: 'record' };
  return { verdict: 'unreadable', reason: answers[0]?.reason ?? 'no-servers' };
}

/**
 * The whole schedule rule, pure (§4.7's table, as the fix round left it).
 * `rounds` counts the round just read. A `yes` confirms; a `no` or an
 * `unreadable` is followed by 20, 30, 45, then 60 s; an `unreadable` opens
 * Pair, and a `no` closes it again until the run has asked
 * {@link NAME_OPEN_AFTER_ROUNDS} rounds, after which it stays open.
 */
export function nextNameStreak(
  streak: NameStreak,
  verdict: NameVerdict
): { readonly streak: NameStreak; readonly confirmed: boolean; readonly gapMs: number } {
  const rounds = streak.rounds + 1;
  const long = rounds >= NAME_OPEN_AFTER_ROUNDS;
  if (verdict === 'yes') {
    const yes = streak.yes + 1;
    return {
      streak: { rounds, yes, unreadable: 0, opened: streak.opened },
      confirmed: yes >= NAME_CONFIRM_YES_ROUNDS,
      gapMs: NAME_CHECK_AFTER_YES_MS
    };
  }
  const last = NAME_CHECK_GAPS_MS.length - 1;
  const gapMs = NAME_CHECK_GAPS_MS[Math.min(rounds - 1, last)] ?? NAME_CHECK_GAPS_MS[last] ?? NAME_CHECK_AFTER_YES_MS;
  if (verdict === 'no') {
    return { streak: { rounds, yes: 0, unreadable: 0, opened: long }, confirmed: false, gapMs };
  }
  const count = streak.unreadable + 1;
  return {
    streak: { rounds, yes: 0, unreadable: count, opened: streak.opened || long || count >= NAME_UNREADABLE_ROUNDS },
    confirmed: false,
    gapMs
  };
}

/**
 * One round (§4.7), never rejecting: the name and zone rules before anything
 * is sent, a refused override before the search is named, then every server
 * at once with a fresh id and recursion off. A round in which every searched
 * server was unreadable drops the cache, so a renumbered server is found
 * without a restart.
 */
export async function askNameRound(
  deps: NameCheckDeps,
  publicName: string,
  cache: NameRoundCache
): Promise<NameRound> {
  try {
    const zoned = zoneNameOf(publicName);
    if (!('name' in zoned)) return { verdict: 'unreadable', reason: zoned.reason, answers: NO_NAME_ANSWERS };
    const name = zoned.name;
    const source = deps.source;
    if (source.kind === 'refused') return { verdict: 'unreadable', reason: 'override-unusable', answers: NO_NAME_ANSWERS };
    let servers: readonly NameServer[] | null;
    if (source.kind === 'fixed') {
      servers = source.servers;
    } else {
      if (cache.servers === null) cache.servers = await findZoneServers(deps);
      servers = cache.servers;
    }
    if (servers === null || servers.length === 0) return { verdict: 'unreadable', reason: 'no-servers', answers: NO_NAME_ANSWERS };
    const answers = await Promise.all(
      servers.map(async (server) => {
        const query = encodeNameQuery(deps.id(), name, 'A', false);
        if (query === null) return unreadable('bad-name');
        const exchanged = await deps.exchange(server, query);
        if (exchanged.kind === 'timeout') return unreadable('timeout');
        if (exchanged.kind !== 'reply') return unreadable('socket');
        return judgeZoneAnswer(query, exchanged.bytes, name);
      })
    );
    if (source.kind === 'search' && answers.every((a) => a.answer === 'unreadable')) cache.servers = null;
    return { ...roundVerdictOf(answers), answers: answers.map((a) => a.answer) };
  } catch {
    return { verdict: 'unreadable', reason: 'error', answers: NO_NAME_ANSWERS };
  }
}

// ---------------------------------------------------------------------------
// Finding the zone servers (§4.6)
// ---------------------------------------------------------------------------

/** A decoded name as text, when every label passes the label rule. */
function nameTextOf(labels: readonly Buffer[]): string | null {
  const texts: string[] = [];
  for (const label of labels) {
    const text = label.toString('latin1');
    if (!NAME_TEXT.test(text) || text.includes('.')) return null;
    texts.push(text.toLowerCase());
  }
  const joined = texts.join('.');
  return labelsOfName(joined) === null ? null : joined;
}

/** The NS targets of a resolver's `NS ts.net` reply, or null when the reply is not readable (§4.6 step 2). */
function nsTargetsOf(query: Buffer, reply: Buffer): string[] | null {
  const parsed = readNameReply(query, reply);
  if (!parsed.ok || parsed.rcode !== 0 || parsed.answers.length === 0) return null;
  const zone = labelBuffers(NAME_SEARCH_ZONE.split('.'));
  const targets: string[] = [];
  for (const record of parsed.answers) {
    if (record.type !== TYPE_NS || record.klass !== CLASS_IN || !sameName(record.owner, zone)) return null;
    const decoded = decodeName(reply, record.rdataOffset);
    if (!decoded.ok || decoded.next !== record.rdataOffset + record.rdata.length) return null;
    const target = nameTextOf(decoded.labels);
    if (target === null) return null;
    if (!targets.includes(target)) targets.push(target);
  }
  return targets.slice(0, NAME_SERVERS_MAX);
}

/** The first public address of a resolver's `A <target>` reply, or null (§4.6 step 4). No CNAME is followed. */
function firstPublicAddressOf(query: Buffer, reply: Buffer, target: string): string | null {
  const parsed = readNameReply(query, reply);
  if (!parsed.ok || parsed.rcode !== 0) return null;
  const labels = labelsOfName(target);
  if (labels === null) return null;
  const owner = labelBuffers(labels);
  let first: string | null = null;
  for (const record of parsed.answers) {
    if (record.type !== TYPE_A || record.klass !== CLASS_IN || record.rdata.length !== 4) return null;
    if (!sameName(record.owner, owner)) return null;
    const octets = [...record.rdata];
    if (first === null && isPublicV4(octets)) first = octets.join('.');
  }
  return first;
}

/**
 * The `ts.net` zone's own servers, found without naming the Mac's name: `NS
 * ts.net` at both resolvers at once, the first readable reply in resolver
 * order winning, then each target's `A` at that resolver, at most four
 * distinct public addresses on port 53. At most six packets. Null when none.
 * Never rejects.
 */
export async function findZoneServers(deps: NameCheckDeps): Promise<readonly NameServer[] | null> {
  try {
    const searched = await Promise.all(
      NAME_SEARCH_RESOLVERS.map(async (address) => {
        const resolver: NameServer = { address, port: NAME_DNS_PORT };
        const query = encodeNameQuery(deps.id(), NAME_SEARCH_ZONE, 'NS', true);
        if (query === null) return null;
        const exchanged = await deps.exchange(resolver, query);
        if (exchanged.kind !== 'reply') return null;
        const targets = nsTargetsOf(query, exchanged.bytes);
        return targets === null ? null : { resolver, targets };
      })
    );
    const won = searched.find((s) => s !== null) ?? null;
    if (won === null) return null;
    const addresses = await Promise.all(
      won.targets.map(async (target) => {
        const query = encodeNameQuery(deps.id(), target, 'A', true);
        if (query === null) return null;
        const exchanged = await deps.exchange(won.resolver, query);
        if (exchanged.kind !== 'reply') return null;
        return firstPublicAddressOf(query, exchanged.bytes, target);
      })
    );
    const servers: NameServer[] = [];
    for (const address of addresses) {
      if (address === null || servers.some((s) => s.address === address)) continue;
      if (servers.length >= NAME_SERVERS_MAX) break;
      servers.push({ address, port: NAME_DNS_PORT });
    }
    return servers.length === 0 ? null : servers;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The development override (§4.8)
// ---------------------------------------------------------------------------

const OVERRIDE_ENTRY = /^127\.0\.0\.1:([1-9][0-9]{0,4})$/;

/**
 * Where a round's questions go. A packaged build ignores the override. In a
 * development build an unset or blank value is the search, which is the
 * product; a set value must be 1 to 4 `127.0.0.1:<port>` entries, and anything
 * else REFUSES the whole value. A refused value never falls back to the
 * search: from a probe the search is real DNS.
 */
export function nameServersFrom(input: { packaged: boolean; env: NodeJS.ProcessEnv }): NameServerSource {
  if (input.packaged) return { kind: 'search' };
  try {
    const raw = input.env[NAME_SERVERS_ENV];
    if (raw === undefined || raw.trim() === '') return { kind: 'search' };
    const entries = raw.split(',');
    if (entries.length < 1 || entries.length > NAME_SERVERS_MAX) return { kind: 'refused' };
    const servers: NameServer[] = [];
    for (const entry of entries) {
      const match = OVERRIDE_ENTRY.exec(entry.trim());
      const port = match === null ? NaN : Number(match[1]);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) return { kind: 'refused' };
      servers.push({ address: '127.0.0.1', port });
    }
    return { kind: 'fixed', servers };
  } catch {
    return { kind: 'refused' };
  }
}

// ---------------------------------------------------------------------------
// The transport (§4.3)
// ---------------------------------------------------------------------------

const EXCHANGE_ERROR: NameExchange = Object.freeze({ kind: 'error' });
const EXCHANGE_TIMEOUT: NameExchange = Object.freeze({ kind: 'timeout' });

/**
 * The socket's own `lookup`: a literal IPv4 address answers itself, and
 * anything else is an error, so `node:dns` is never reached. Node's dgram
 * calls it as `(host, 4, callback)` for bind and connect.
 */
function literalLookup(
  host: string,
  _family: unknown,
  done: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
): void {
  if (typeof host === 'string' && isIPv4(host)) {
    process.nextTick(done, null, host, 4);
    return;
  }
  const refused: NodeJS.ErrnoException = new Error('a name server is named by its address');
  refused.code = 'ENOTFOUND';
  process.nextTick(done, refused, '', 4);
}

function ignore(): void {
  // A socket being closed may still emit; it has somewhere to go.
}

/**
 * One question to one server, never rejecting (§4.3). In order: outside
 * Electron nothing but `127.0.0.1` (D8); a literal address and a real port;
 * a socket with its own lookup; the listeners before anything else; a loopback
 * server bound from `127.0.0.1`; connect, and only inside its callback the
 * send, of the buffer alone. Every datagram is filtered by its source, its
 * size, the id and QR before it is kept, so a stranger can make a question
 * time out and nothing it sends can end one early or be parsed.
 */
function exchangeOverUdp(server: NameServer, packet: Buffer): Promise<NameExchange> {
  // D8. Vitest, tsx and plain node are not Electron.
  if (server.address !== '127.0.0.1' && typeof process.versions.electron !== 'string') {
    return Promise.resolve(EXCHANGE_ERROR);
  }
  if (typeof server.address !== 'string' || !isIPv4(server.address)) return Promise.resolve(EXCHANGE_ERROR);
  if (!Number.isInteger(server.port) || server.port < 1 || server.port > 65_535) return Promise.resolve(EXCHANGE_ERROR);
  if (!Buffer.isBuffer(packet) || packet.length < 12 || packet.length > NAME_REPLY_MAX_BYTES) {
    return Promise.resolve(EXCHANGE_ERROR);
  }
  const id = packet.readUInt16BE(0);
  return new Promise<NameExchange>((resolve) => {
    let settled = false;
    let socket: Socket | null = null;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const settle = (answer: NameExchange): void => {
      if (settled) return;
      settled = true;
      if (deadline !== null) clearTimeout(deadline);
      const open = socket;
      socket = null;
      if (open !== null) {
        open.removeAllListeners('message');
        open.removeAllListeners('error');
        open.on('error', ignore);
        try {
          open.close();
        } catch {
          // already closed
        }
      }
      resolve(answer);
    };
    try {
      const sock = createSocket({ type: 'udp4', lookup: literalLookup });
      socket = sock;
      sock.on('error', () => settle(EXCHANGE_ERROR));
      sock.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
        try {
          if (settled) return;
          if (rinfo.address !== server.address || rinfo.port !== server.port) return;
          if (msg.length < 12 || msg.length > NAME_REPLY_MAX_BYTES) return;
          if (msg.readUInt16BE(0) !== id) return;
          if ((msg.readUInt8(2) & 0x80) === 0) return;
          settle({ kind: 'reply', bytes: Buffer.from(msg) });
        } catch {
          settle(EXCHANGE_ERROR);
        }
      });
      deadline = setTimeout(() => settle(EXCHANGE_TIMEOUT), NAME_QUERY_DEADLINE_MS);
      deadline.unref();
      sock.unref();
      const ask = (): void => {
        try {
          if (settled) return;
          sock.connect(server.port, server.address, (err?: Error) => {
            try {
              if (settled) return;
              if (err !== undefined && err !== null) {
                settle(EXCHANGE_ERROR);
                return;
              }
              sock.send(packet, (sendErr: Error | null) => {
                if (sendErr !== null && sendErr !== undefined) settle(EXCHANGE_ERROR);
              });
            } catch {
              settle(EXCHANGE_ERROR);
            }
          });
        } catch {
          settle(EXCHANGE_ERROR);
        }
      };
      if (server.address === '127.0.0.1') {
        sock.bind({ address: '127.0.0.1', port: 0 }, ask);
      } else {
        ask();
      }
    } catch {
      settle(EXCHANGE_ERROR);
    }
  });
}

/** The shipping deps. The host reads `packaged` as `funnel.ts` does and passes it in. */
export function defaultNameCheckDeps(input: { packaged: boolean; env: NodeJS.ProcessEnv }): NameCheckDeps {
  return {
    source: nameServersFrom(input),
    exchange: exchangeOverUdp,
    id: () => randomInt(0, 0x10000),
    monotonic: () => performance.now(),
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        timer.unref();
      })
  };
}
