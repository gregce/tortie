#!/usr/bin/env node
/**
 * build/p345/sni-relay.mjs — ONE loopback port for every door the phone keeps
 * (Phase 345, build/p345/SPEC.md §5.3 "The SNI relay").
 *
 * WHY IT EXISTS. The phone's DEBUG endpoint seam (`-TortieDebugDoorEndpoint
 * 127.0.0.1:<port>`, ios/Tortie/Door/Transport.swift) dials EVERY door on one
 * loopback port and keeps each code's public NAME as the TLS server name. With
 * several Macs kept, that one port must reach the right door, so this relay
 * reads each connection's TLS ClientHello, takes its server name, and forwards
 * the bytes WHOLE to that name's CURRENT backend: a Mac's stand-in forwarder
 * (re-read per connection, because a Remove or a re-confirm moves it) or a
 * node door's own port. It adds no byte, removes none and reads nothing past
 * the ClientHello but TLS record headers.
 *
 * WHAT IT COUNTS. Per name, every connection and when it came, and the records
 * of at least TLS_REQUEST_MIN bytes the phone sent after its ClientHello (the
 * tally build/p316/probe-p316.mjs's relay keeps, written again here because
 * that file runs its whole probe when imported). The phone holds ONE request
 * per connection except a Terminal's kept lines (ios/Tortie/Door/DoorClient.swift),
 * so a name's connections are its Electron door's "log of who asked". A name
 * the relay does not know is closed and counted as `unknown`, and so is a
 * connection whose first bytes are not a ClientHello.
 *
 * ITS THREE MODES, per name: `pass` (forward), `close` (accept, then close at
 * once, as a door that is not listening ends it) and `hold` (accept and never
 * answer, a Mac asleep). Leaving `hold` ends every held connection.
 *
 * LOOPBACK ONLY: it listens on 127.0.0.1 and dials 127.0.0.1. In-process, so
 * the probe's `finally` closes it with every socket it holds.
 *
 *   node build/p345/sni-relay.mjs --self-test
 */

import { connect as netConnect, createServer as createNetServer } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const TAG = '[p345 sni relay]';
const J = JSON.stringify;

/** A record at least this long, sent by the phone after its ClientHello, is counted as a request. */
export const TLS_REQUEST_MIN = 64;
/** The largest plaintext TLS record (RFC 8446 §5.1); a ClientHello in one record fits it. */
export const RECORD_MAX = 16_384;
/** How long a connection may take to send its whole ClientHello. */
export const HELLO_WAIT_MS = 10_000;
/** The three modes. */
export const MODES = Object.freeze(['pass', 'close', 'hold']);

/**
 * The server name of a TLS ClientHello, read from the first record of
 * `buf` and nothing past it. PURE.
 *
 *   { state: 'more' }                    the record is not all here yet
 *   { state: 'name', name }              the host_name, lowercased
 *   { state: 'none' }                    a well formed ClientHello with no server name
 *   { state: 'bad', why }                not a ClientHello, or a length that lies
 *
 * Only a ClientHello in ONE record is read: a hello split over records is
 * `bad`, which the relay closes and counts as unknown rather than guessing.
 */
export function sniOf(buf) {
  if (!Buffer.isBuffer(buf)) return { state: 'bad', why: 'not bytes' };
  if (buf.length < 5) return { state: 'more' };
  if (buf[0] !== 0x16) return { state: 'bad', why: `record type ${String(buf[0])}, not a handshake` };
  if (buf[1] !== 0x03) return { state: 'bad', why: 'not a TLS record version' };
  const recordLength = buf.readUInt16BE(3);
  if (recordLength === 0 || recordLength > RECORD_MAX) return { state: 'bad', why: `a record of ${String(recordLength)} bytes` };
  if (buf.length < 5 + recordLength) return { state: 'more' };
  const rec = buf.subarray(5, 5 + recordLength);
  if (rec.length < 4 || rec[0] !== 0x01) return { state: 'bad', why: 'the handshake is not a ClientHello' };
  const helloLength = rec.readUIntBE(1, 3);
  if (4 + helloLength > rec.length) return { state: 'bad', why: 'a ClientHello split over records, or a length that lies' };
  const h = rec.subarray(4, 4 + helloLength);
  let at = 0;
  const need = (n) => at + n <= h.length;
  // client_version (2) and random (32)
  if (!need(34)) return { state: 'bad', why: 'too short for its version and random' };
  at += 34;
  // session id
  if (!need(1)) return { state: 'bad', why: 'no session id length' };
  const sid = h[at];
  at += 1;
  if (sid > 32 || !need(sid)) return { state: 'bad', why: 'a session id that lies' };
  at += sid;
  // cipher suites
  if (!need(2)) return { state: 'bad', why: 'no cipher suites length' };
  const suites = h.readUInt16BE(at);
  at += 2;
  if (suites === 0 || suites % 2 !== 0 || !need(suites)) return { state: 'bad', why: 'cipher suites that lie' };
  at += suites;
  // compression methods
  if (!need(1)) return { state: 'bad', why: 'no compression length' };
  const comp = h[at];
  at += 1;
  if (comp === 0 || !need(comp)) return { state: 'bad', why: 'compression methods that lie' };
  at += comp;
  // extensions
  if (at === h.length) return { state: 'none' };
  if (!need(2)) return { state: 'bad', why: 'no extensions length' };
  const extsLength = h.readUInt16BE(at);
  at += 2;
  if (at + extsLength !== h.length) return { state: 'bad', why: 'extensions that do not end where the hello ends' };
  const end = at + extsLength;
  while (at < end) {
    if (at + 4 > end) return { state: 'bad', why: 'an extension header past the end' };
    const type = h.readUInt16BE(at);
    const len = h.readUInt16BE(at + 2);
    at += 4;
    if (at + len > end) return { state: 'bad', why: 'an extension that lies about its length' };
    if (type === 0x0000) {
      const ext = h.subarray(at, at + len);
      if (ext.length < 2) return { state: 'bad', why: 'a server_name extension with no list' };
      const listLength = ext.readUInt16BE(0);
      if (2 + listLength !== ext.length) return { state: 'bad', why: 'a server_name list that lies' };
      let p = 2;
      while (p < ext.length) {
        if (p + 3 > ext.length) return { state: 'bad', why: 'a server_name entry past the list' };
        const kind = ext[p];
        const nameLength = ext.readUInt16BE(p + 1);
        p += 3;
        if (p + nameLength > ext.length) return { state: 'bad', why: 'a server name that lies about its length' };
        if (kind === 0) {
          const bytes = ext.subarray(p, p + nameLength);
          if (nameLength === 0 || nameLength > 253 || !bytes.every((b) => b > 0x20 && b < 0x7f)) return { state: 'bad', why: 'a host_name that is not printable ASCII' };
          return { state: 'name', name: bytes.toString('latin1').toLowerCase() };
        }
        p += nameLength;
      }
      return { state: 'none' };
    }
    at += len;
  }
  return { state: 'none' };
}

/**
 * Records of at least `min` bytes in `chunk`, read off the TLS record headers
 * and nothing else. `state` is `{ buf, big }`; answers the next state.
 */
export function recordTally(state, chunk, min = TLS_REQUEST_MIN) {
  let buf = state.buf.length === 0 ? chunk : Buffer.concat([state.buf, chunk]);
  let big = state.big;
  for (;;) {
    if (buf.length < 5) return { buf: Buffer.from(buf), big };
    const len = buf.readUInt16BE(3);
    if (buf.length < 5 + len) return { buf: Buffer.from(buf), big };
    if (len >= min) big += 1;
    buf = buf.subarray(5 + len);
  }
}

/**
 * Start the relay on 127.0.0.1. `routes` maps a public name to a function
 * answering its backend port now (0: nothing listens, and the connection is
 * closed and counted as `noBackend`).
 */
export async function startSniRelay({ routes = {}, helloWaitMs = HELLO_WAIT_MS } = {}) {
  const sockets = new Set();
  /** name → { port, mode, held, counts } */
  const table = new Map();
  /** Every connection, in order: { n, at, name, mode, outcome }. */
  const log = [];
  let unknown = 0;
  let serial = 0;
  let closed = false;

  const routeOf = (name) => {
    const key = String(name).toLowerCase();
    if (!table.has(key)) table.set(key, { port: () => 0, mode: 'pass', held: new Set(), counts: { connections: 0, requests: 0, passed: 0, closed: 0, held: 0, noBackend: 0 } });
    return table.get(key);
  };
  for (const [name, port] of Object.entries(routes)) routeOf(name).port = port;

  const forward = (client, first, route) => {
    const port = Number(route.port()) || 0;
    if (port <= 0) {
      route.counts.noBackend += 1;
      client.destroy();
      return 'no-backend';
    }
    const upstream = netConnect({ host: '127.0.0.1', port });
    sockets.add(upstream);
    upstream.on('close', () => {
      sockets.delete(upstream);
      client.destroy();
    });
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    // What came after the ClientHello in the first bytes is tallied too.
    const helloEnd = 5 + first.readUInt16BE(3);
    let tally = recordTally({ buf: Buffer.alloc(0), big: 0 }, first.subarray(helloEnd));
    route.counts.requests += tally.big;
    client.on('data', (b) => {
      const was = tally.big;
      tally = recordTally(tally, b);
      route.counts.requests += tally.big - was;
    });
    upstream.write(first);
    client.pipe(upstream);
    upstream.pipe(client);
    route.counts.passed += 1;
    return 'passed';
  };

  const server = createNetServer((client) => {
    sockets.add(client);
    client.on('close', () => sockets.delete(client));
    client.on('error', () => undefined);
    if (closed) {
      client.destroy();
      return;
    }
    const n = (serial += 1);
    const at = Date.now();
    let buf = Buffer.alloc(0);
    let decided = false;
    const timer = setTimeout(() => {
      if (decided) return;
      decided = true;
      unknown += 1;
      log.push({ n, at, name: null, mode: null, outcome: 'no-hello' });
      client.destroy();
    }, helloWaitMs);
    timer.unref?.();
    const onData = (b) => {
      if (decided) return;
      buf = Buffer.concat([buf, b]);
      const read = sniOf(buf);
      if (read.state === 'more') {
        if (buf.length > 5 + RECORD_MAX) read.state = 'bad';
        else return;
      }
      decided = true;
      clearTimeout(timer);
      client.off('data', onData);
      if (read.state !== 'name' || !table.has(read.name)) {
        unknown += 1;
        log.push({ n, at, name: read.state === 'name' ? read.name : null, mode: null, outcome: read.state === 'name' ? 'unknown-name' : `no-name (${read.state})` });
        client.destroy();
        return;
      }
      const route = table.get(read.name);
      route.counts.connections += 1;
      const entry = { n, at, name: read.name, mode: route.mode, outcome: null };
      log.push(entry);
      if (route.mode === 'close') {
        route.counts.closed += 1;
        entry.outcome = 'closed';
        client.destroy();
        return;
      }
      if (route.mode === 'hold') {
        route.counts.held += 1;
        entry.outcome = 'held';
        route.held.add(client);
        client.on('close', () => route.held.delete(client));
        // Read and dropped: a held connection is answered by nothing.
        client.on('data', () => undefined);
        return;
      }
      client.pause();
      entry.outcome = forward(client, buf, route);
      client.resume();
    };
    client.on('data', onData);
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok());
  });
  const port = server.address().port;

  /** Connections on `name` (or every name, `null`) whose arrival is in [from, to). */
  const between = (name, from = 0, to = Infinity) => log.filter((e) => (name === null ? e.name !== null : e.name === String(name).toLowerCase()) && e.at >= from && e.at < to && e.outcome !== 'unknown-name').length;

  return {
    port,
    /** Point `name` at a backend: a function answering a port, or a port. */
    setBackend: (name, portOf) => {
      routeOf(name).port = typeof portOf === 'function' ? portOf : () => Number(portOf) || 0;
    },
    /** `pass`, `close` or `hold`. Leaving `hold` ends every connection it held. */
    setMode: (name, mode) => {
      if (!MODES.includes(mode)) throw new Error(`${TAG} no mode named ${J(mode)}; the modes are ${MODES.join(', ')}`);
      const route = routeOf(name);
      const was = route.mode;
      route.mode = mode;
      if (was === 'hold' && mode !== 'hold') {
        for (const s of route.held) s.destroy();
        route.held.clear();
      }
    },
    mode: (name) => routeOf(name).mode,
    /** One name's counts, a copy. */
    counts: (name) => ({ ...routeOf(name).counts, heldNow: routeOf(name).held.size }),
    /** Every known name's connections now, for a reading stamped beside an event. */
    snapshot: () => Object.fromEntries([...table].map(([name, r]) => [name, r.counts.connections])),
    names: () => [...table.keys()],
    between,
    unknown: () => unknown,
    log: () => log.map((e) => ({ ...e })),
    close: () =>
      new Promise((done) => {
        closed = true;
        for (const s of sockets) s.destroy();
        for (const r of table.values()) r.held.clear();
        server.close(() => done());
      })
  };
}

// ---------------------------------------------------------------------------
// --self-test: the parser on hand-made hellos and a real one, the relay on loopback
// ---------------------------------------------------------------------------

/** A ClientHello in one record, its fields as given, for the parser's fixtures. */
export function helloBytes({ names = [], sessionId = 32, suites = [0x1301, 0x1302], extra = [], lie = null } = {}) {
  const u16 = (n) => Buffer.from([(n >> 8) & 0xff, n & 0xff]);
  const exts = [];
  if (names.length > 0) {
    const list = Buffer.concat(names.map((n) => Buffer.concat([Buffer.from([0]), u16(Buffer.byteLength(n)), Buffer.from(n, 'latin1')])));
    const body = Buffer.concat([u16(list.length), list]);
    exts.push(Buffer.concat([u16(0), u16(body.length), body]));
  }
  for (const e of extra) exts.push(Buffer.concat([u16(e.type), u16(e.data.length), e.data]));
  let extBlock = Buffer.concat(exts);
  if (lie === 'extension') extBlock = Buffer.concat([extBlock.subarray(0, 2), u16(9_999), extBlock.subarray(4)]);
  const hello = Buffer.concat([
    Buffer.from([0x03, 0x03]),
    Buffer.alloc(32, 7),
    Buffer.from([sessionId]),
    Buffer.alloc(sessionId, 1),
    u16(suites.length * 2),
    Buffer.concat(suites.map(u16)),
    Buffer.from([1, 0]),
    ...(exts.length > 0 || extra.length > 0 ? [u16(extBlock.length), extBlock] : [])
  ]);
  const hs = Buffer.concat([Buffer.from([0x01, (hello.length >> 16) & 0xff, (hello.length >> 8) & 0xff, hello.length & 0xff]), hello]);
  return Buffer.concat([Buffer.from([0x16, 0x03, 0x01]), u16(hs.length), hs]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A plain loopback listener that keeps what each connection sent. Closed by its caller. */
async function captureServer() {
  const sockets = new Set();
  const got = [];
  const server = createNetServer((s) => {
    sockets.add(s);
    const one = { bytes: Buffer.alloc(0) };
    got.push(one);
    s.on('data', (b) => {
      one.bytes = Buffer.concat([one.bytes, b]);
    });
    s.on('close', () => sockets.delete(s));
    s.on('error', () => undefined);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    port: server.address().port,
    got,
    close: () =>
      new Promise((done) => {
        for (const s of sockets) s.destroy();
        server.close(() => done());
      })
  };
}

/** A real ClientHello from node's own TLS client, for `servername`, captured by `capture`. */
async function realHello(capture, servername) {
  const before = capture.got.length;
  const socket = tlsConnect({ host: '127.0.0.1', port: capture.port, servername, rejectUnauthorized: false, minVersion: 'TLSv1.3' });
  socket.on('error', () => undefined);
  try {
    for (let i = 0; i < 40 && (capture.got.length <= before || capture.got[before].bytes.length === 0); i += 1) await sleep(25);
    await sleep(50);
    return capture.got[before]?.bytes ?? Buffer.alloc(0);
  } finally {
    socket.destroy();
  }
}

/** One raw connection to the relay: send `bytes`, wait, and say whether the relay closed it. */
async function rawDial(port, bytes, waitMs = 300) {
  return new Promise((done) => {
    const s = netConnect({ host: '127.0.0.1', port });
    let ended = false;
    s.on('error', () => undefined);
    s.on('close', () => {
      ended = true;
    });
    s.on('connect', () => s.write(bytes));
    setTimeout(() => {
      const wasEnded = ended;
      s.destroy();
      done({ closedByRelay: wasEnded, socket: s });
    }, waitMs);
  });
}

async function selfTest() {
  const results = [];
  const check = (name, ok, said) => {
    results.push({ name, ok });
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} ${said}\n`);
  };
  // The parser, on hellos written here.
  const A = 'p345-studio.tail00000.ts.net';
  const B = 'p345-laptop.tail00000.ts.net';
  const one = helloBytes({ names: [A], extra: [{ type: 0x002b, data: Buffer.from([2, 3, 4]) }] });
  const cases = [
    ['a hello naming A', sniOf(one), (r) => r.state === 'name' && r.name === A],
    ['the name lowercased', sniOf(helloBytes({ names: [A.toUpperCase()] })), (r) => r.state === 'name' && r.name === A],
    ['no server name', sniOf(helloBytes({ extra: [{ type: 0x002b, data: Buffer.from([2, 3, 4]) }] })), (r) => r.state === 'none'],
    ['no extensions at all', sniOf(helloBytes({})), (r) => r.state === 'none'],
    ['half a record', sniOf(one.subarray(0, Math.floor(one.length / 2))), (r) => r.state === 'more'],
    ['four bytes', sniOf(one.subarray(0, 4)), (r) => r.state === 'more'],
    ['application data, not a handshake', sniOf(Buffer.concat([Buffer.from([0x17]), one.subarray(1)])), (r) => r.state === 'bad'],
    ['a ServerHello', sniOf(Buffer.concat([one.subarray(0, 5), Buffer.from([0x02]), one.subarray(6)])), (r) => r.state === 'bad'],
    ['an extension that lies about its length', sniOf(helloBytes({ names: [A], lie: 'extension' })), (r) => r.state === 'bad'],
    ['a 33-byte session id', sniOf(helloBytes({ names: [A], sessionId: 33 })), (r) => r.state === 'bad'],
    ['a name that is not printable ASCII', sniOf(helloBytes({ names: ['p345\u0001x.ts.net'] })), (r) => r.state === 'bad'],
    ['not bytes', sniOf('hello'), (r) => r.state === 'bad']
  ];
  for (const [name, got, want] of cases) check(`sniOf: ${name}`, want(got), J(got));

  const capA = await captureServer();
  const capB = await captureServer();
  let relay = null;
  try {
    // node's own ClientHello, read by the parser.
    const real = await realHello(capA, B);
    check('sniOf: node\'s own ClientHello', sniOf(real).state === 'name' && sniOf(real).name === B, `${String(real.length)} bytes read as ${J(sniOf(real))}`);
    capA.got.length = 0;

    relay = await startSniRelay({ routes: { [A]: () => capA.port, [B]: () => capB.port }, helloWaitMs: 1_000 });
    // pass: A's hello reaches A's backend whole, B's B's.
    await realHello({ port: relay.port, got: [] }, A).catch(() => undefined);
    await sleep(150);
    const reachedA = capA.got.length === 1 && sniOf(capA.got[0].bytes).name === A && capB.got.length === 0;
    check('pass: A to A\'s backend alone', reachedA && relay.counts(A).connections === 1 && relay.counts(B).connections === 0, `A's backend saw ${String(capA.got.length)} connection(s), B's ${String(capB.got.length)}; counts ${J(relay.snapshot())}`);
    // a request record after the hello is counted, and forwarded whole.
    const appData = Buffer.concat([Buffer.from([0x17, 0x03, 0x03, 0x00, 100]), Buffer.alloc(100, 9)]);
    const small = Buffer.concat([Buffer.from([0x17, 0x03, 0x03, 0x00, 20]), Buffer.alloc(20, 9)]);
    const hello = helloBytes({ names: [B] });
    await rawDial(relay.port, Buffer.concat([hello, appData, small, appData]), 300);
    await sleep(100);
    const forwarded = capB.got[0]?.bytes ?? Buffer.alloc(0);
    check('pass: records tallied, bytes unchanged', relay.counts(B).requests === 2 && forwarded.equals(Buffer.concat([hello, appData, small, appData])), `B's requests ${String(relay.counts(B).requests)} (want 2: two of 100 bytes, one of 20 not counted); ${String(forwarded.length)} bytes forwarded unchanged: ${String(forwarded.equals(Buffer.concat([hello, appData, small, appData])))}`);
    // an unknown name is closed and counted as unknown.
    const before = capA.got.length + capB.got.length;
    const stranger = await rawDial(relay.port, helloBytes({ names: ['p345-nobody.tail00000.ts.net'] }));
    check('an unknown name is closed', stranger.closedByRelay && relay.unknown() === 1 && capA.got.length + capB.got.length === before, `closed ${String(stranger.closedByRelay)}, unknown ${String(relay.unknown())}, nothing forwarded: ${String(capA.got.length + capB.got.length === before)}`);
    // bytes that are not a hello are closed.
    const garbage = await rawDial(relay.port, Buffer.from('GET / HTTP/1.1\r\n\r\n'));
    check('bytes that are not a hello are closed', garbage.closedByRelay && relay.unknown() === 2, `closed ${String(garbage.closedByRelay)}, unknown ${String(relay.unknown())}`);
    // close: accepted, then closed, nothing forwarded.
    relay.setMode(A, 'close');
    const shut = await rawDial(relay.port, helloBytes({ names: [A] }));
    check('close: accepted then closed', shut.closedByRelay && relay.counts(A).closed === 1 && capA.got.length === 1, `closed ${String(shut.closedByRelay)}, A's closed count ${String(relay.counts(A).closed)}, A's backend still ${String(capA.got.length)}`);
    // hold: kept open, answered by nothing, ended when the mode leaves hold.
    relay.setMode(A, 'hold');
    const heldSocket = netConnect({ host: '127.0.0.1', port: relay.port });
    let heldClosed = false;
    heldSocket.on('error', () => undefined);
    heldSocket.on('close', () => {
      heldClosed = true;
    });
    heldSocket.on('connect', () => heldSocket.write(helloBytes({ names: [A] })));
    await sleep(600);
    const stillOpen = !heldClosed && relay.counts(A).heldNow === 1 && capA.got.length === 1;
    relay.setMode(A, 'pass');
    await sleep(200);
    check('hold: open and unanswered, then ended', stillOpen && heldClosed && relay.counts(A).heldNow === 0, `open after 600 ms ${String(stillOpen)}; ended when the mode left hold ${String(heldClosed)}`);
    heldSocket.destroy();
    // no backend: closed and counted.
    relay.setBackend(B, () => 0);
    const none = await rawDial(relay.port, helloBytes({ names: [B] }));
    check('no backend: closed', none.closedByRelay && relay.counts(B).noBackend === 1, `closed ${String(none.closedByRelay)}, noBackend ${String(relay.counts(B).noBackend)}`);
    // a window count
    const t0 = Date.now();
    relay.setBackend(B, () => capB.port);
    await rawDial(relay.port, helloBytes({ names: [B] }), 100);
    check('between counts a window', relay.between(B, t0) === 1 && relay.between(A, t0) === 0, `B since ${String(t0)}: ${String(relay.between(B, t0))}, A: ${String(relay.between(A, t0))}`);
    let threw = false;
    try {
      relay.setMode(A, 'sideways');
    } catch {
      threw = true;
    }
    check('an unknown mode is refused', threw, threw ? 'refused' : 'ACCEPTED');
  } catch (err) {
    check('the relay self-test', false, `threw: ${String(err?.stack ?? err)}`);
  } finally {
    await relay?.close();
    await capA.close();
    await capB.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  process.stdout.write(failed === 0 ? `${TAG} self-test PASS: ${String(results.length)} cases, every listener closed.\n` : `${TAG} self-test FAIL: ${String(failed)} of ${String(results.length)}.\n`);
  return failed === 0;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const ok = await selfTest();
    process.exit(ok ? 0 : 1);
  }
  process.stderr.write(`${TAG} usage: node build/p345/sni-relay.mjs --self-test (the probe imports startSniRelay)\n`);
  process.exit(2);
}
