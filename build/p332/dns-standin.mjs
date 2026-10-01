#!/usr/bin/env node
/**
 * build/p332/dns-standin.mjs — a DNS server for ONE made-up name, on loopback,
 * in the caller's own process, and a model of a phone's resolver (Phase 332,
 * build/p332/SPEC.md §6.3 item 1). IT IS NOT DNS.
 *
 * WHY IT EXISTS. From Phase 332 a published door asks the `ts.net` zone's own
 * servers whether the Mac's public name answers before it shows a pairing
 * code (src/main/pocket/public-name.ts). No test, probe or agent may ask real
 * DNS for his name, and none may loop on a real DNS server. So every probe
 * that switches the door on runs THIS FILE's server in its own process and
 * names it with `GMUX_POCKET_NAME_SERVERS=127.0.0.1:<port>`, which a
 * development build honours and a packaged one ignores. The name it answers
 * for is the Tailscale stand-in's made-up `p330-mac.tail00000.ts.net`, and the
 * address it answers with is `203.0.113.10`, from the documentation range
 * (RFC 5737), so nothing it says names a real host.
 *
 * AN ENCODER OF ITS OWN. It imports nothing from `src/`: the packets it writes
 * and the questions it reads are spelled here, by hand, from RFC 1035, so a
 * bug in the shipping parser cannot be hidden by the same bug in its stand-in.
 *
 * ITS MODES, set with `setMode(mode)`:
 *
 *   'record'           AA, the question echoed byte for byte, ONE `A` answer
 *                      whose owner is the pointer `c0 0c`, TTL 60, the address
 *                      (`setMode('record', { address })` answers another).
 *                      A question for another name answers NXDOMAIN, and one
 *                      for this name of another type answers NODATA
 *   'nx'               AA, NXDOMAIN, the question echoed, and ONE SOA in the
 *                      authority section owned by `ts.net` as a pointer into
 *                      the question, minimum 300: what `ts.net` answered for a
 *                      name that did not exist yet (build/p330/SPEC.md O4)
 *   { nxUntil: ms }    'nx' until the epoch millisecond `ms`, 'record' from it
 *                      on; `{ nxUntil: null }` is 'nx' for ever
 *   'silent'           reads the question and answers nothing
 *   'hold'             answers nothing yet; `release()` answers every held
 *                      question with the mode current THEN (or, while the mode
 *                      is still 'hold', with the mode from before the hold)
 *   'servfail'         RCODE 2, no AA
 *   'refused'          RCODE 5, no AA
 *   { script: [m, …] } (Phase 332.1, build/p3321/SPEC.md §7.3 item 1) the n-th
 *                      `A` question for the name, in class IN, since the
 *                      script was set gets the n-th entry, and past the end
 *                      the LAST entry repeats. Each entry is one of the string
 *                      modes above, 'hold' included. A question for another
 *                      name or of another type is answered as 'record' answers
 *                      it (NXDOMAIN, NODATA) and does not advance the script.
 *                      Setting a script again starts it from its first entry.
 *                      `release()` while a script is current answers a held
 *                      question as 'record' would. This is how probe:p3321
 *                      replays his flapping name, one server per stand-in
 *
 * `log()` rows are `{ at, id, rd, qname, qtype, qclass, answered, step }` for
 * every question it was asked, the preflight's own excepted. `answered` is the
 * kind of reply it sent: `record`, `nodata`, `nx`, `servfail`, `refused`,
 * `silent`, `held` (not yet released) or `malformed` (not a question). `step`
 * is the script entry's index that answered it, or null when no script was
 * current or the question did not advance one.
 *
 * THE RESOLVER MODEL. `makeResolverModel({ zoneAnswers, negativeTtlMs })` is a
 * phone's resolver reduced to the one behaviour that failed his first scan: a
 * miss is kept for 300 s (RFC 2308, the SOA minimum O4 measured), so a phone
 * that asks before the name exists keeps failing after it appears.
 *
 * THE PROBES' OTHER GUARD. `writeQuietAgents(profile)` writes the scratch
 * profile's `gmux/config/agents.json` so the Gemini, Qwen, Antigravity, Grok
 * and Droid rows name binaries that do not exist, and `quietAgentsHeld(scan)`
 * reads `agents:list` back: detection then never runs any of their
 * `--version`. Every door probe writes it before every launch.
 *
 * WHAT IT REFUSES TO DO. It binds `127.0.0.1` and nothing else, sends only to
 * the address and port a question came from, starts no process and writes no
 * file but the agents file a probe asks for.
 *
 *   node build/p332/dns-standin.mjs --self-test
 */

import { createSocket } from 'node:dgram';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isIPv4 } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[p332 dns stand-in]';
const J = JSON.stringify;

/** The address a record answers with. RFC 5737's documentation range: no real host. */
export const STANDIN_ADDRESS = '203.0.113.10';
/** The record's TTL, in seconds. */
export const RECORD_TTL_S = 60;
/** The SOA minimum a miss carries, in seconds: `ts.net`'s, as O4 read it. */
export const NEGATIVE_TTL_S = 300;
/** The zone whose SOA a miss is owned by. */
export const SOA_ZONE = 'ts.net';
/** The variable a development build reads (src/main/pocket/public-name.ts). */
export const NAME_SERVERS_VAR = 'GMUX_POCKET_NAME_SERVERS';
/** The record types this file spells. */
export const QTYPE = Object.freeze({ A: 1, NS: 2, CNAME: 5, SOA: 6, AAAA: 28 });
const CLASS_IN = 1;

// ---------------------------------------------------------------------------
// The writer and the reader, spelled here and nowhere else
// ---------------------------------------------------------------------------

/** A name's labels, without the root, or null when it is not a name this file writes. */
function labelsOf(name) {
  const text = String(name ?? '').replace(/\.$/, '');
  if (text === '') return null;
  const labels = text.split('.');
  for (const l of labels) {
    if (l.length === 0 || l.length > 63 || !/^[A-Za-z0-9-]+$/.test(l)) return null;
  }
  return labels;
}

/** A name in wire form: length-prefixed labels and the root byte. Never compressed. */
export function writeName(name) {
  const labels = labelsOf(name);
  if (labels === null) throw new Error(`${TAG} not a name: ${J(name)}`);
  const parts = [];
  for (const l of labels) {
    parts.push(Buffer.from([l.length]), Buffer.from(l, 'ascii'));
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

const u16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
};
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
};

/**
 * The 12-byte header. `flags` names the bits; everything unnamed is 0.
 */
export function writeHeader(id, { qr = false, opcode = 0, aa = false, tc = false, rd = false, ra = false, rcode = 0 } = {}, { qd = 0, an = 0, ns = 0, ar = 0 } = {}) {
  const hi = (qr ? 0x80 : 0) | ((opcode & 0x0f) << 3) | (aa ? 0x04 : 0) | (tc ? 0x02 : 0) | (rd ? 0x01 : 0);
  const lo = (ra ? 0x80 : 0) | (rcode & 0x0f);
  return Buffer.concat([u16(id & 0xffff), Buffer.from([hi, lo]), u16(qd), u16(an), u16(ns), u16(ar)]);
}

/** A question, as a client writes one: the header, one name, a type and IN. */
export function writeQuestion(id, name, qtype, { rd = false } = {}) {
  return Buffer.concat([writeHeader(id, { rd }, { qd: 1 }), writeName(name), u16(qtype), u16(CLASS_IN)]);
}

/**
 * Read a question this server was sent, or null when it is not one: QR 0,
 * OPCODE 0, exactly one question and an uncompressed name. Every read is checked against the length first.
 */
export function readQuestion(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12 || buf.length > 512) return null;
  const id = buf.readUInt16BE(0);
  const hi = buf[2];
  if ((hi & 0x80) !== 0) return null;
  if (((hi >> 3) & 0x0f) !== 0) return null;
  if (buf.readUInt16BE(4) !== 1) return null;
  const labels = [];
  const starts = [];
  let pos = 12;
  for (let hops = 0; hops < 128; hops += 1) {
    if (pos >= buf.length) return null;
    const len = buf[pos];
    if (len === 0) {
      pos += 1;
      break;
    }
    if ((len & 0xc0) !== 0 || len > 63 || pos + 1 + len > buf.length) return null;
    starts.push(pos);
    labels.push(buf.subarray(pos + 1, pos + 1 + len).toString('latin1'));
    pos += 1 + len;
  }
  if (pos + 4 > buf.length) return null;
  const qtype = buf.readUInt16BE(pos);
  const qclass = buf.readUInt16BE(pos + 2);
  const end = pos + 4;
  return { id, rd: (hi & 0x01) === 1 ? 1 : 0, qname: labels.join('.'), labels, starts, qtype, qclass, end };
}

/** RFC 4343: two names are the same when they differ only in the case of A to Z. */
export function sameName(a, b) {
  const fold = (s) => String(s ?? '').replace(/\.$/, '').replace(/[A-Z]/g, (c) => c.toLowerCase());
  return fold(a) === fold(b);
}

/** Four octets from a dotted IPv4 address. */
function octetsOf(address) {
  if (!isIPv4(address)) throw new Error(`${TAG} not an IPv4 address: ${J(address)}`);
  return Buffer.from(address.split('.').map(Number));
}

/**
 * The pointer to `ts.net` inside the echoed question, or the name written
 * whole when the question does not end in it.
 */
function zoneOwner(q) {
  const zone = labelsOf(SOA_ZONE);
  const n = q.labels.length;
  if (n >= zone.length && zone.every((l, i) => sameName(q.labels[n - zone.length + i], l))) {
    const at = q.starts[n - zone.length];
    return Buffer.from([0xc0 | ((at >> 8) & 0x3f), at & 0xff]);
  }
  return writeName(SOA_ZONE);
}

/** `ts.net.`'s SOA, as a miss carries it (O4): minimum 300. */
function soaRecord(q) {
  const rdata = Buffer.concat([writeName('ns1.dnsimple.com'), writeName('admin.dnsimple.com'), u32(1), u32(3_600), u32(600), u32(604_800), u32(NEGATIVE_TTL_S)]);
  return Buffer.concat([zoneOwner(q), u16(QTYPE.SOA), u16(CLASS_IN), u32(NEGATIVE_TTL_S), u16(rdata.length), rdata]);
}

/**
 * The reply to one question for one kind of answer. `query` is the datagram
 * as it arrived, so the question section is echoed byte for byte.
 */
export function replyFor(query, q, kind, address = STANDIN_ADDRESS) {
  const echoed = query.subarray(12, q.end);
  const rd = q.rd === 1;
  if (kind === 'record') {
    const answer = Buffer.concat([Buffer.from([0xc0, 0x0c]), u16(QTYPE.A), u16(CLASS_IN), u32(RECORD_TTL_S), u16(4), octetsOf(address)]);
    return Buffer.concat([writeHeader(q.id, { qr: true, aa: true, rd }, { qd: 1, an: 1 }), echoed, answer]);
  }
  if (kind === 'nodata') return Buffer.concat([writeHeader(q.id, { qr: true, aa: true, rd }, { qd: 1, ns: 1 }), echoed, soaRecord(q)]);
  if (kind === 'nx') return Buffer.concat([writeHeader(q.id, { qr: true, aa: true, rd, rcode: 3 }, { qd: 1, ns: 1 }), echoed, soaRecord(q)]);
  if (kind === 'servfail') return Buffer.concat([writeHeader(q.id, { qr: true, rd, rcode: 2 }, { qd: 1 }), echoed]);
  if (kind === 'refused') return Buffer.concat([writeHeader(q.id, { qr: true, rd, rcode: 5 }, { qd: 1 }), echoed]);
  return null;
}

// ---------------------------------------------------------------------------
// The server
// ---------------------------------------------------------------------------

const MODES = new Set(['record', 'nx', 'silent', 'hold', 'servfail', 'refused']);

function checkedMode(mode) {
  if (typeof mode === 'string' && MODES.has(mode)) return mode;
  if (mode !== null && typeof mode === 'object' && Object.hasOwn(mode, 'nxUntil') && (mode.nxUntil === null || Number.isFinite(mode.nxUntil))) {
    return { nxUntil: mode.nxUntil };
  }
  // A script: one to many string modes, frozen so the caller cannot move it under the server.
  if (mode !== null && typeof mode === 'object' && Array.isArray(mode.script) && mode.script.length > 0 && mode.script.every((m) => typeof m === 'string' && MODES.has(m))) {
    return { script: Object.freeze([...mode.script]) };
  }
  throw new Error(`${TAG} not a mode: ${J(mode)}`);
}

/** Is `m` a script mode? */
const isScript = (m) => m !== null && typeof m === 'object' && Array.isArray(m.script);

/** Is `value` one to four `127.0.0.1:<port>` entries and nothing else? */
export function loopbackOnlyServers(value) {
  if (typeof value !== 'string') return false;
  const entries = value.split(',');
  if (entries.length < 1 || entries.length > 4) return false;
  return entries.every((e) => {
    const m = /^127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(e);
    return m !== null && Number(m[1]) <= 65_535;
  });
}

/** A lookup that answers literals only, so binding never reaches the resolver. */
function literalOnly(host, _options, cb) {
  if (isIPv4(host)) process.nextTick(cb, null, host, 4);
  else process.nextTick(cb, new Error(`${TAG} binds literals only, not ${J(host)}`));
}

/**
 * Bind the stand-in on `127.0.0.1` at a port the kernel chooses, answering
 * questions for `name`. Resolves with its handle; `close()` ends it.
 */
export async function makeDnsStandin({ name, mode = 'record', address: firstAddress = STANDIN_ADDRESS, now = () => Date.now() } = {}) {
  if (labelsOf(name) === null) throw new Error(`${TAG} not a name: ${J(name)}`);
  octetsOf(firstAddress);
  let address = firstAddress;
  let current = checkedMode(mode);
  let beforeHold = current === 'hold' ? 'record' : current;
  /** How many questions the current script has answered: the next one gets entry `min(scriptAt, last)`. */
  let scriptAt = 0;
  const rows = [];
  const held = [];
  const preflightPorts = new Set();
  let closed = false;

  const socket = createSocket({ type: 'udp4', lookup: literalOnly });

  /** The kind a question gets under `m`, which is never 'hold'. A script here is 'record' (a held question's release, or one that did not advance it). */
  const kindUnder = (m, q) => {
    const effective = isScript(m) ? 'record' : typeof m === 'object' ? (m.nxUntil === null || now() < m.nxUntil ? 'nx' : 'record') : m;
    if (effective !== 'record') return effective;
    if (!sameName(q.qname, name) || q.qclass !== CLASS_IN) return 'nx';
    return q.qtype === QTYPE.A ? 'record' : 'nodata';
  };
  const send = (bytes, rinfo) => {
    if (closed || bytes === null) return;
    try {
      socket.send(bytes, rinfo.port, rinfo.address);
    } catch {
      /* closed under us */
    }
  };

  socket.on('message', (msg, rinfo) => {
    // Loopback only, both ways: a datagram from anywhere else is not read.
    if (rinfo.address !== '127.0.0.1') return;
    const q = readQuestion(msg);
    if (preflightPorts.has(rinfo.port)) {
      if (q !== null) send(replyFor(msg, q, 'record', address), rinfo);
      return;
    }
    const row = { at: now(), id: q?.id ?? null, rd: q?.rd ?? null, qname: q?.qname ?? null, qtype: q?.qtype ?? null, qclass: q?.qclass ?? null, answered: 'malformed', step: null };
    rows.push(row);
    if (q === null) return;
    // THE SCRIPT (Phase 332.1): only an A question for the name, in IN,
    // advances it; anything else is answered as 'record' answers it.
    let effective = current;
    if (isScript(current)) {
      if (sameName(q.qname, name) && q.qtype === QTYPE.A && q.qclass === CLASS_IN) {
        row.step = Math.min(scriptAt, current.script.length - 1);
        scriptAt += 1;
        effective = current.script[row.step];
      } else {
        effective = 'record';
      }
    }
    if (effective === 'hold') {
      row.answered = 'held';
      held.push({ msg: Buffer.from(msg), q, rinfo: { address: rinfo.address, port: rinfo.port }, row });
      return;
    }
    if (effective === 'silent') {
      row.answered = 'silent';
      return;
    }
    const kind = kindUnder(effective, q);
    row.answered = kind;
    send(replyFor(msg, q, kind, address), rinfo);
  });
  socket.on('error', () => undefined);

  await new Promise((ok, fail) => {
    socket.once('error', fail);
    socket.bind({ address: '127.0.0.1', port: 0 }, () => {
      socket.off('error', fail);
      ok();
    });
  });
  const bound = socket.address();
  const port = bound.port;
  const servers = `127.0.0.1:${String(port)}`;

  const handle = {
    name: String(name).replace(/\.$/, ''),
    address: () => address,
    port,
    servers,
    mode: () => current,
    /**
     * Set the mode, and with `{ address }` the address a record answers with
     * from now on (a verifier's lie, say). `release()` then answers what 'hold'
     * kept with the mode current at that moment.
     */
    setMode(next, options = {}) {
      const m = checkedMode(next);
      if (options.address !== undefined) {
        octetsOf(options.address);
        address = options.address;
      }
      if (m === 'hold' && current !== 'hold') beforeHold = current;
      if (isScript(m)) scriptAt = 0;
      current = m;
      return current;
    },
    /** Answer every held question: with `next` when given, else with the mode now (or the one before the hold). */
    release(next) {
      if (next !== undefined) handle.setMode(next);
      const under = current === 'hold' ? beforeHold : current;
      const out = held.splice(0, held.length);
      for (const h of out) {
        if (under === 'silent') {
          h.row.answered = 'silent';
          h.row.releasedAt = now();
          continue;
        }
        const kind = kindUnder(under, h.q);
        h.row.answered = kind;
        h.row.releasedAt = now();
        send(replyFor(h.msg, h.q, kind, address), h.rinfo);
      }
      return out.length;
    },
    held: () => held.length,
    log: () => rows.map((r) => ({ ...r })),
    /**
     * THE PREFLIGHT every probe runs before it launches: the socket is bound
     * to 127.0.0.1 and nothing else, the value the app is handed is this
     * server's and names loopback alone, and a question for the name is
     * answered, over loopback, by a client of this file's own (not logged).
     */
    async preflight(envValue = servers) {
      const problems = [];
      if (closed) problems.push('the stand-in is closed');
      let addr = null;
      try {
        addr = socket.address();
      } catch {
        addr = null;
      }
      if (addr === null || addr.address !== '127.0.0.1' || addr.family !== 'IPv4') problems.push(`the stand-in is bound to ${J(addr)}, not 127.0.0.1`);
      if (envValue !== servers) problems.push(`${NAME_SERVERS_VAR} is ${J(envValue ?? null)}, not this stand-in's ${servers}`);
      if (!loopbackOnlyServers(envValue)) problems.push(`${NAME_SERVERS_VAR}=${J(envValue ?? null)} names something that is not 127.0.0.1`);
      if (problems.length === 0) {
        const answer = await askOnce(port, handle.name, QTYPE.A, { mark: (p) => preflightPorts.add(p) });
        if (answer === null) problems.push('a question for the name was not answered on loopback');
        else if (!answer.aa || answer.rcode !== 0 || answer.an !== 1) problems.push(`the preflight question read ${J({ aa: answer.aa, rcode: answer.rcode, an: answer.an })}`);
      }
      return { ok: problems.length === 0, problems };
    },
    closed: () => closed,
    close() {
      if (closed) return Promise.resolve();
      closed = true;
      held.splice(0, held.length);
      return new Promise((done) => {
        try {
          socket.close(() => done());
        } catch {
          done();
        }
      });
    }
  };
  return handle;
}

/**
 * Ask one question of a server on 127.0.0.1 and read the reply's header, or
 * null after `ms`. The client socket binds loopback and is closed on every way
 * out. `mark` hears the client's port before it sends.
 */
export function askOnce(port, name, qtype, { rd = false, ms = 1_000, id = 0x5332, mark = () => undefined } = {}) {
  return new Promise((done) => {
    const client = createSocket({ type: 'udp4', lookup: literalOnly });
    let timer = null;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      try {
        client.close();
      } catch {
        /* already closed */
      }
      done(value);
    };
    client.on('error', () => finish(null));
    client.on('message', (msg, rinfo) => {
      if (rinfo.port !== port || msg.length < 12 || msg.readUInt16BE(0) !== id) return;
      finish({ bytes: Buffer.from(msg), id, aa: (msg[2] & 0x04) !== 0, qr: (msg[2] & 0x80) !== 0, rd: msg[2] & 0x01, rcode: msg[3] & 0x0f, an: msg.readUInt16BE(6), ns: msg.readUInt16BE(8) });
    });
    timer = setTimeout(() => finish(null), ms);
    client.bind({ port: 0, address: '127.0.0.1' }, () => {
      mark(client.address().port);
      client.send(writeQuestion(id, name, qtype, { rd }), port, '127.0.0.1');
    });
  });
}

// ---------------------------------------------------------------------------
// The phone's resolver, reduced to the one behaviour that failed his first scan
// ---------------------------------------------------------------------------

/**
 * `zoneAnswers(at)` says whether the zone publishes the name at `at`. A miss is
 * kept for `negativeTtlMs` from the moment it was met, whatever the zone says
 * in the meantime: RFC 2308, which is what O4 measured.
 */
export function makeResolverModel({ zoneAnswers, negativeTtlMs = NEGATIVE_TTL_S * 1_000, now = () => Date.now() }) {
  const missUntil = new Map();
  const rows = [];
  return {
    lookup(name) {
      const key = String(name).toLowerCase().replace(/\.$/, '');
      const at = now();
      const until = missUntil.get(key);
      if (until !== undefined && at < until) {
        rows.push({ at, name: key, verdict: 'miss', cached: true });
        return 'miss';
      }
      if (zoneAnswers(at) === true) {
        missUntil.delete(key);
        rows.push({ at, name: key, verdict: 'answer', cached: false });
        return 'answer';
      }
      missUntil.set(key, at + negativeTtlMs);
      rows.push({ at, name: key, verdict: 'miss', cached: false });
      return 'miss';
    },
    lookups: () => rows.map((r) => ({ ...r }))
  };
}

// ---------------------------------------------------------------------------
// The one grader clause every re-pointed probe adds (SPEC §4.13 item 5)
// ---------------------------------------------------------------------------

/**
 * What is wrong with the questions a build asked the stand-in: none at all, or
 * one that is not an `A` question, is recursive, or names another name. An
 * empty list is a pass.
 */
export function nameQuestionProblems(rows, name) {
  const problems = [];
  if (!Array.isArray(rows) || rows.length === 0) return ['the stand-in was asked nothing, so no name check reached it'];
  const notA = rows.filter((r) => r.qtype !== QTYPE.A);
  const recursive = rows.filter((r) => r.rd !== 0);
  const other = rows.filter((r) => !sameName(r.qname, name));
  if (notA.length > 0) problems.push(`${String(notA.length)} question(s) were not A: ${J(notA.slice(0, 3).map((r) => r.qtype))}`);
  if (recursive.length > 0) problems.push(`${String(recursive.length)} question(s) asked for recursion`);
  if (other.length > 0) problems.push(`${String(other.length)} question(s) named another name: ${J(other.slice(0, 3).map((r) => r.qname))}`);
  return problems;
}

/**
 * THE CLAUSE every re-pointed probe grades at HEAD, as one arm's verdict and
 * sentence. `expect` is false at a parent build, which ignores the variable,
 * and on a run where no door was ever published, which asks nothing: then
 * there is nothing owed and nothing graded.
 */
export function nameQuestionsVerdict({ expect, rows, name }) {
  if (expect !== true) return { ok: true, said: `not owed here (${String(rows.length)} question(s) seen)` };
  const problems = nameQuestionProblems(rows, name);
  return { ok: problems.length === 0, said: problems.length === 0 ? `${String(rows.length)} question(s), every one A, RD 0, for ${name}` : problems.join('; ') };
}

/** The clause's own cases: the honest reading, each break red on its own, and the readings nothing is owed on. */
export function nameQuestionsCases(name) {
  const row = { at: 1, id: 7, rd: 0, qname: name, qtype: QTYPE.A, qclass: 1, answered: 'record' };
  return [
    { what: 'two honest questions', reading: { expect: true, rows: [row, { ...row, at: 20_001 }], name }, ok: true },
    { what: 'a name asked in capitals', reading: { expect: true, rows: [{ ...row, qname: name.toUpperCase() }], name }, ok: true },
    { what: 'no question at all on a published door', reading: { expect: true, rows: [], name }, ok: false },
    { what: 'an NS question', reading: { expect: true, rows: [row, { ...row, qtype: QTYPE.NS }], name }, ok: false },
    { what: 'a recursive question', reading: { expect: true, rows: [{ ...row, rd: 1 }], name }, ok: false },
    { what: 'a question for another name', reading: { expect: true, rows: [{ ...row, qname: 'p332-other.tail00000.ts.net' }], name }, ok: false },
    { what: 'a parent build, which asks nothing', reading: { expect: false, rows: [], name }, ok: true }
  ];
}

/** Run the clause's cases; `write` prints one line each. True when every case graded as it must. */
export function nameQuestionsSelfTest(name, write = (line) => process.stdout.write(`${line}\n`)) {
  let bad = 0;
  for (const c of nameQuestionsCases(name)) {
    const got = nameQuestionsVerdict(c.reading);
    const right = got.ok === c.ok;
    if (!right) bad += 1;
    write(`${right ? 'ok  ' : 'FAIL'} the name-question clause reads ${c.what} as ${got.ok ? 'green' : 'red'}`);
  }
  return bad === 0;
}

// ---------------------------------------------------------------------------
// The probes' other guard: agents that must never start
// ---------------------------------------------------------------------------

/** The agents whose `--version` no door probe may run (the Phase 332 brief). */
export const QUIET_AGENT_IDS = Object.freeze(['gemini', 'qwen', 'antigravity', 'grok', 'droid']);
/** A binary name that exists nowhere. */
export const absentBinaryOf = (id) => `p332-absent-${id}`;

/**
 * Write `<profile>/gmux/config/agents.json` so each of `ids` names a binary
 * that does not exist, in `binaries` and `launch.argv[0]` alike. Detection
 * then finds nothing to ask its version.
 */
export function writeQuietAgents(profile, ids = QUIET_AGENT_IDS) {
  const dir = join(profile, 'gmux', 'config');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const agents = ids.map((id) => ({ id, binaries: [absentBinaryOf(id)], launch: { argv: [absentBinaryOf(id)] }, notes: 'probe: never started' }));
  const path = join(dir, 'agents.json');
  writeFileSync(path, `${J({ schema: 2, agents }, null, 2)}\n`, { mode: 0o600 });
  return path;
}

/** Did the app read it: is every one of `ids` not installed, with no binary found? */
export function quietAgentsHeld(scan, ids = QUIET_AGENT_IDS) {
  const problems = [];
  const agents = Array.isArray(scan?.agents) ? scan.agents : null;
  if (agents === null) return { ok: false, problems: ['agents:list answered no agent list'] };
  for (const id of ids) {
    const row = agents.find((a) => a.id === id);
    if (row === undefined) problems.push(`${id} is not in agents:list`);
    else if (row.installed !== false || row.binPath !== null || row.version !== null) problems.push(`${id} reads installed=${J(row.installed)} binPath=${J(row.binPath)} version=${J(row.version)}`);
  }
  return { ok: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// --self-test: every mode on loopback, read back by a reader of its own
// ---------------------------------------------------------------------------

/** Read a reply this file wrote, with the self-test's own reader. */
function readReply(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  const h = { id: buf.readUInt16BE(0), qr: (buf[2] & 0x80) !== 0, aa: (buf[2] & 0x04) !== 0, rd: buf[2] & 0x01, rcode: buf[3] & 0x0f, qd: buf.readUInt16BE(4), an: buf.readUInt16BE(6), ns: buf.readUInt16BE(8), ar: buf.readUInt16BE(10) };
  const nameAt = (start) => {
    const labels = [];
    let pos = start;
    let next = -1;
    for (let hops = 0; hops < 16; hops += 1) {
      const len = buf[pos];
      if (len === 0) {
        if (next < 0) next = pos + 1;
        return { name: labels.join('.'), next };
      }
      if ((len & 0xc0) === 0xc0) {
        const to = ((len & 0x3f) << 8) | buf[pos + 1];
        if (to >= pos) return null;
        if (next < 0) next = pos + 2;
        pos = to;
        continue;
      }
      labels.push(buf.subarray(pos + 1, pos + 1 + len).toString('latin1'));
      pos += 1 + len;
    }
    return null;
  };
  const q = nameAt(12);
  if (q === null) return null;
  let pos = q.next + 4;
  const records = [];
  for (let i = 0; i < h.an + h.ns + h.ar; i += 1) {
    const owner = nameAt(pos);
    if (owner === null) return null;
    const ownerBytes = buf.subarray(pos, owner.next);
    pos = owner.next;
    const type = buf.readUInt16BE(pos);
    const klass = buf.readUInt16BE(pos + 2);
    const ttl = buf.readUInt32BE(pos + 4);
    const len = buf.readUInt16BE(pos + 8);
    const rdata = buf.subarray(pos + 10, pos + 10 + len);
    const rec = { owner: owner.name, ownerBytes, type, klass, ttl, rdata };
    if (type === QTYPE.SOA) {
      const m = nameAt(pos + 10);
      const r = m === null ? null : nameAt(m.next);
      rec.minimum = r === null ? null : buf.readUInt32BE(r.next + 16);
    }
    records.push(rec);
    pos += 10 + len;
  }
  return { ...h, question: q.name, questionEnd: q.next + 4, records, trailing: buf.length - pos };
}

async function selfTest() {
  let failures = 0;
  let checks = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const NAME = 'p330-mac.tail00000.ts.net';
  let standin = null;
  try {
    // The writer, byte for byte against SPEC §4.2's worked example.
    const q = writeQuestion(0x1234, NAME, QTYPE.A);
    say(q.toString('hex') === '12340000000100000000000008703333302d6d6163097461696c303030303002747303' + '6e65740000010001', `a question for the made-up name is SPEC §4.2's 43 bytes (${String(q.length)})`);
    say(readQuestion(q)?.qname === NAME && readQuestion(q)?.rd === 0, 'the question reads back as itself, RD 0');
    say(readQuestion(writeHeader(1, { qr: true }, { qd: 1 })) === null, 'a reply is not read as a question');

    // Mode by mode, over loopback, through the server's own socket.
    standin = await makeDnsStandin({ name: NAME, mode: 'record' });
    say(/^127\.0\.0\.1:\d+$/.test(standin.servers) && standin.port > 0, `it listens on ${standin.servers}`);
    const pre = await standin.preflight();
    say(pre.ok && standin.log().length === 0, `the preflight passes and is not logged (${J(pre.problems)})`);
    say(!(await standin.preflight('10.0.0.1:53')).ok, 'the preflight refuses a value that is not loopback');
    say(!(await standin.preflight('127.0.0.1:1')).ok, 'the preflight refuses a value that is not this stand-in');

    const ask = async (name, qtype, opts = {}) => {
      const got = await askOnce(standin.port, name, qtype, { ms: 600, ...opts });
      return got === null ? null : { ...got, read: readReply(got.bytes) };
    };
    const rec = await ask(NAME, QTYPE.A);
    const ans = rec?.read?.records[0];
    say(
      rec !== null && rec.qr && rec.aa && rec.rcode === 0 && rec.an === 1 && ans?.type === QTYPE.A && ans.klass === 1 && ans.ttl === RECORD_TTL_S && [...ans.rdata].join('.') === STANDIN_ADDRESS && ans.ownerBytes.equals(Buffer.from([0xc0, 0x0c])) && rec.read.trailing === 0,
      `record: AA, one A for ${STANDIN_ADDRESS}, TTL 60, owned by the pointer c0 0c, nothing trailing`
    );
    say(rec !== null && rec.bytes.subarray(12, 12 + q.length - 12).equals(q.subarray(12)), 'record: the question is echoed byte for byte');
    const upper = await ask(NAME.toUpperCase(), QTYPE.A);
    say(upper?.an === 1 && upper.read.question === NAME.toUpperCase(), 'record: the name matches in any case and its own case is echoed');
    const other = await ask('p332-other.tail00000.ts.net', QTYPE.A);
    say(other?.rcode === 3 && other.aa, 'record: another name answers NXDOMAIN');
    const aaaa = await ask(NAME, QTYPE.AAAA);
    say(aaaa?.rcode === 0 && aaaa.an === 0 && aaaa.ns === 1, 'record: another type answers NODATA');

    standin.setMode('nx');
    const nx = await ask(NAME, QTYPE.A);
    const soa = nx?.read?.records[0];
    say(
      nx !== null && nx.aa && nx.rcode === 3 && nx.an === 0 && nx.ns === 1 && soa?.type === QTYPE.SOA && soa.owner === SOA_ZONE && (soa.ownerBytes[0] & 0xc0) === 0xc0 && soa.minimum === NEGATIVE_TTL_S && nx.read.trailing === 0,
      `nx: AA, NXDOMAIN, one SOA owned by ts.net through a pointer into the question, minimum ${String(soa?.minimum)}`
    );

    standin.setMode({ nxUntil: Date.now() + 60_000 });
    say((await ask(NAME, QTYPE.A))?.rcode === 3, 'nxUntil in the future: NXDOMAIN');
    standin.setMode({ nxUntil: Date.now() - 1 });
    say((await ask(NAME, QTYPE.A))?.an === 1, 'nxUntil in the past: the record');
    standin.setMode({ nxUntil: null });
    say((await ask(NAME, QTYPE.A))?.rcode === 3, 'nxUntil null: NXDOMAIN for ever');

    standin.setMode('servfail');
    const sf = await ask(NAME, QTYPE.A);
    say(sf?.rcode === 2 && !sf.aa, 'servfail: RCODE 2, not authoritative');
    standin.setMode('refused');
    const rf = await ask(NAME, QTYPE.A);
    say(rf?.rcode === 5 && !rf.aa, 'refused: RCODE 5, not authoritative');

    standin.setMode('silent');
    say((await ask(NAME, QTYPE.A)) === null, 'silent: no answer');

    standin.setMode('hold');
    const waiting = askOnce(standin.port, NAME, QTYPE.A, { ms: 2_000, id: 0x4242 });
    await new Promise((r) => setTimeout(r, 300));
    say(standin.held() === 1 && standin.log().at(-1).answered === 'held', 'hold: the question is held and logged as held');
    say(standin.release('record') === 1, 'release answers the one held question');
    const released = await waiting;
    say(released?.an === 1 && released.aa && standin.log().at(-1).answered === 'record', 'release: the held question gets the record, and the log says so');
    standin.setMode('hold');
    const waiting2 = askOnce(standin.port, NAME, QTYPE.A, { ms: 1_500, id: 0x4343 });
    await new Promise((r) => setTimeout(r, 300));
    standin.release();
    say((await waiting2)?.an === 1, 'release while still holding answers with the mode before the hold');

    standin.setMode('record', { address: '198.51.100.7' });
    const moved = await ask(NAME, QTYPE.A);
    say(moved !== null && [...moved.read.records[0].rdata].join('.') === '198.51.100.7' && standin.address() === '198.51.100.7', 'setMode with an address answers the record with it');
    standin.setMode('record', { address: STANDIN_ADDRESS });
    await ask(NAME, QTYPE.A, { rd: true });
    const last = standin.log().at(-1);
    say(last.rd === 1 && last.qtype === QTYPE.A && last.qname === NAME && typeof last.at === 'number' && last.id === 0x5332, `the log reads RD, the type, the name and the id (${J(last)})`);
    say(standin.log().every((r) => ['record', 'nodata', 'nx', 'servfail', 'refused', 'silent', 'held', 'malformed'].includes(r.answered)), 'every log row names what it was answered');
    say(standin.log().every((r) => r.step === null), 'with no script current, every log row’s step is null');

    // THE SCRIPT (Phase 332.1): a three-entry script over four A questions
    // answers in order and repeats its last; another type and another name
    // answer as 'record' answers them and do not advance it.
    const fromScript = standin.log().length;
    standin.setMode({ script: ['record', 'nx', 'servfail'] });
    const s1 = await ask(NAME, QTYPE.A);
    const sAaaa = await ask(NAME, QTYPE.AAAA);
    const s2 = await ask(NAME, QTYPE.A);
    const sOther = await ask('p332-other.tail00000.ts.net', QTYPE.A);
    const s3 = await ask(NAME, QTYPE.A);
    const s4 = await ask(NAME, QTYPE.A);
    say(
      s1?.rcode === 0 && s1.an === 1 && s1.aa && s2?.rcode === 3 && s2.aa && s2.read?.records[0]?.minimum === NEGATIVE_TTL_S && s3?.rcode === 2 && !s3.aa && s4?.rcode === 2 && !s4.aa,
      `script: four A questions answer record, NXDOMAIN, SERVFAIL, then SERVFAIL again, read back by this file's reader (${J([s1?.rcode, s2?.rcode, s3?.rcode, s4?.rcode])})`
    );
    say(sAaaa?.rcode === 0 && sAaaa.an === 0 && sAaaa.ns === 1 && sOther?.rcode === 3, 'script: another type answers NODATA and another name NXDOMAIN, as record mode answers them');
    const scriptRows = standin.log().slice(fromScript);
    say(J(scriptRows.map((r) => [r.answered, r.step])) === J([['record', 0], ['nodata', null], ['nx', 1], ['nx', null], ['servfail', 2], ['servfail', 2]]), `script: the log's step is the entry that answered, null for a question that did not advance it (${J(scriptRows.map((r) => r.step))})`);
    standin.setMode({ script: ['silent', 'record'] });
    const r1 = await ask(NAME, QTYPE.A);
    const r2 = await ask(NAME, QTYPE.A);
    say(r1 === null && r2?.an === 1 && J(standin.log().slice(-2).map((r) => [r.answered, r.step])) === J([['silent', 0], ['record', 1]]), 'script: setting a script again starts at its first entry, and a silent entry answers nothing');
    standin.setMode({ script: ['hold'] });
    const heldAsk = askOnce(standin.port, NAME, QTYPE.A, { ms: 1_500, id: 0x4444 });
    await new Promise((r) => setTimeout(r, 300));
    say(standin.held() === 1 && standin.log().at(-1).step === 0 && standin.release() === 1 && (await heldAsk)?.an === 1, 'script: a hold entry holds, and release() under a script answers as record');
    for (const bad of [{ script: [] }, { script: ['record', 'loud'] }, { script: 'record' }]) {
      let threw = false;
      try {
        standin.setMode(bad);
      } catch {
        threw = true;
      }
      say(threw, `script: setMode refuses ${J(bad)}`);
    }
    standin.setMode('record');

    // The resolver model, on a clock of its own.
    let clock = 1_000_000;
    let recordAt = clock + 110_000;
    const model = makeResolverModel({ zoneAnswers: (at) => at >= recordAt, now: () => clock });
    say(model.lookup(NAME) === 'miss', 'model: a lookup before the record misses');
    clock = recordAt + 1;
    say(model.lookup(NAME) === 'miss', 'model: after the record, the miss is still cached');
    clock = 1_000_000 + 300_000 - 1;
    say(model.lookup(NAME) === 'miss', 'model: one millisecond before 300 s, still the cached miss');
    clock = 1_000_000 + 300_000;
    say(model.lookup(NAME) === 'answer', 'model: at 300 s the resolver asks again and answers');
    const fresh = makeResolverModel({ zoneAnswers: () => true, now: () => clock });
    say(fresh.lookup(NAME) === 'answer' && fresh.lookups().length === 1, 'model: a first lookup after the record answers at once');
    recordAt = 0;

    // The probes' grader clause, and each break of it.
    const good = [{ qtype: 1, rd: 0, qname: NAME }];
    say(nameQuestionProblems(good, NAME).length === 0, 'the question grader passes A, RD 0, the name');
    say(nameQuestionProblems([], NAME).length === 1, 'the question grader goes red on no question at all');
    say(nameQuestionProblems([{ ...good[0], qtype: 2 }], NAME).some((p) => p.includes('not A')), 'the question grader goes red on an NS question');
    say(nameQuestionProblems([{ ...good[0], rd: 1 }], NAME).some((p) => p.includes('recursion')), 'the question grader goes red on RD 1');
    say(nameQuestionProblems([{ ...good[0], qname: 'p332-other-mac.tail00000.ts.net' }], NAME).some((p) => p.includes('another name')), 'the question grader goes red on another name');
    say(nameQuestionProblems([{ ...good[0], qname: NAME.toUpperCase() }], NAME).length === 0, 'the question grader reads a name in any case as the same name');
    say(nameQuestionsSelfTest(NAME, (line) => process.stdout.write(`  ${line}\n`)), 'the probes\' name-question clause grades its own cases');

    // The value a probe hands the app.
    for (const [value, want] of [['127.0.0.1:53', true], ['127.0.0.1:5353,127.0.0.1:5354', true], ['127.0.0.1:1,127.0.0.1:2,127.0.0.1:3,127.0.0.1:4,127.0.0.1:5', false], ['10.0.0.1:53', false], ['localhost:53', false], ['127.0.0.1:0', false], ['127.0.0.1:65536', false], ['127.0.0.2:53', false], ['', false]]) {
      say(loopbackOnlyServers(value) === want, `loopbackOnlyServers(${J(value)}) is ${String(want)}`);
    }

    // The agents guard, over a scratch profile and a made-up scan.
    const scratch = mkdtempSync(join(tmpdir(), 'p332-agents-'));
    try {
      const written = writeQuietAgents(scratch);
      const file = JSON.parse(readFileSync(written, 'utf8'));
      say(file.schema === 2 && file.agents.length === QUIET_AGENT_IDS.length && file.agents.every((a) => a.binaries[0] === a.launch.argv[0] && a.binaries[0] === absentBinaryOf(a.id)), 'the agents file renames every quiet agent in binaries and launch.argv[0] alike');
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
    const scan = { agents: QUIET_AGENT_IDS.map((id) => ({ id, installed: false, binPath: null, version: null })) };
    say(quietAgentsHeld(scan).ok, 'quietAgentsHeld passes a scan where none is installed');
    say(!quietAgentsHeld({ agents: scan.agents.map((a) => (a.id === 'grok' ? { ...a, installed: true, binPath: '/usr/local/bin/grok' } : a)) }).ok, 'quietAgentsHeld refuses a scan that found grok');
    say(!quietAgentsHeld({ agents: scan.agents.filter((a) => a.id !== 'qwen') }).ok, 'quietAgentsHeld refuses a scan missing qwen');
  } catch (err) {
    say(false, `the self-test threw: ${String(err?.stack ?? err)}`);
  } finally {
    if (standin !== null) await standin.close();
  }
  say(standin === null || standin.closed(), 'the stand-in is closed in the finally');
  process.stdout.write(failures === 0 ? `${TAG} self-test PASS: ${String(checks)} checks, every mode answered on 127.0.0.1 and read back by a reader of this file's own.\n` : `${TAG} self-test FAIL: ${String(failures)} of ${String(checks)}.\n`);
  return failures === 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  process.exit((await selfTest()) ? 0 : 1);
}
