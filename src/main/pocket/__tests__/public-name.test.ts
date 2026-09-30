/**
 * The Mac's public name, asked and read (Phase 332, build/p332/SPEC.md §6.1
 * item 2).
 *
 * NOTHING HERE REACHES REAL DNS. Every packet this file sends goes to a
 * stand-in bound to `127.0.0.1` in this process and closed in `afterEach`, and
 * three fences hold that:
 *
 * - `node:dgram` is fenced: every socket anything in this file's module graph
 *   makes (the shipping transport's and the stand-ins') refuses to bind,
 *   connect or send to anything but `127.0.0.1`, and records what it did, and
 *   `afterEach` asserts nothing was refused and every socket was closed;
 * - `node:dns`'s `lookup`, `lookupService`, `reverse` and every `resolve*`, on
 *   the module and on `dns.promises`, are spied to answer an error and FAIL the
 *   test in `afterEach` if called; one test proves the spies are live by making
 *   a socket without a lookup of its own, which dgram then resolves through
 *   `dns.lookup` (the spec's measurement, §2);
 * - the shipping transport itself sends to `127.0.0.1` alone outside Electron
 *   (D8), and vitest is not Electron, which one test holds with the socket
 *   count at zero.
 *
 * The replies are written by `./dns-fixtures.ts`, a second spelling that
 * shares no code with the parser. The only name asked is the probes' made-up
 * `p330-mac.tail00000.ts.net`; every address answered is in RFC 5737's
 * documentation ranges or is one of the lies this file exists to refuse.
 */

import { createRequire } from 'node:module';
import { createSocket, type RemoteInfo, type Socket } from 'node:dgram';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The dgram fence
// ---------------------------------------------------------------------------

const fence = vi.hoisted(() => ({
  created: 0,
  sockets: [] as Array<{ closed: boolean }>,
  refused: [] as string[],
  binds: [] as string[],
  connects: [] as string[],
  /** The argument count of every send, the stand-ins' included. */
  sends: [] as number[]
}));

vi.mock('node:dgram', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:dgram')>();
  const LOOPBACK = '127.0.0.1';
  const refuse = (what: string): never => {
    fence.refused.push(what);
    throw new Error(`[p332 fence] ${what}: this file reaches nothing but 127.0.0.1`);
  };
  const fenced = (...args: unknown[]): unknown => {
    const socket = (real.createSocket as (...a: unknown[]) => import('node:dgram').Socket)(...args);
    fence.created += 1;
    const row = { closed: false };
    fence.sockets.push(row);
    socket.once('close', () => {
      row.closed = true;
    });
    const mutable = socket as unknown as Record<'bind' | 'connect' | 'send', (...a: unknown[]) => unknown>;
    const bind = mutable.bind.bind(socket);
    const connect = mutable.connect.bind(socket);
    const send = mutable.send.bind(socket);
    mutable.bind = (...a: unknown[]): unknown => {
      const first = a[0];
      const address =
        typeof first === 'object' && first !== null ? (first as { address?: unknown }).address : a[1];
      if (address !== LOOPBACK) refuse(`bind ${String(address)}`);
      fence.binds.push(String(address));
      return bind(...a);
    };
    mutable.connect = (...a: unknown[]): unknown => {
      if (a[1] !== LOOPBACK) refuse(`connect ${String(a[1])}:${String(a[0])}`);
      fence.connects.push(`${String(a[1])}:${String(a[0])}`);
      return connect(...a);
    };
    mutable.send = (...a: unknown[]): unknown => {
      for (const arg of a.slice(1)) {
        if (typeof arg === 'string' && arg !== LOOPBACK) refuse(`send ${arg}`);
      }
      fence.sends.push(a.length);
      return send(...a);
    };
    return socket;
  };
  return { ...real, createSocket: fenced, default: { ...real, createSocket: fenced } };
});

// ---------------------------------------------------------------------------
// The dns spies
// ---------------------------------------------------------------------------

const nodeRequire = createRequire(import.meta.url);
const dnsModule = nodeRequire('node:dns') as Record<string, unknown> & { promises: Record<string, unknown> };
const dnsCalls: string[] = [];

function spyOnDns(): void {
  const targets: Array<[Record<string, unknown>, string]> = [
    [dnsModule, 'dns'],
    [dnsModule.promises, 'dns.promises']
  ];
  for (const [target, label] of targets) {
    for (const name of Object.keys(target)) {
      if (!/^(?:lookup|lookupService|reverse|resolve)/.test(name) || typeof target[name] !== 'function') continue;
      vi.spyOn(target as Record<string, (...a: unknown[]) => unknown>, name).mockImplementation(
        (...args: unknown[]): unknown => {
          dnsCalls.push(`${label}.${name}`);
          const err = Object.assign(new Error(`[p332] ${label}.${name} was called`), { code: 'ESPIED' });
          if (label === 'dns.promises') return Promise.reject(err);
          const done = args.findLast((a) => typeof a === 'function');
          if (typeof done === 'function') process.nextTick(done as (...a: unknown[]) => void, err);
          return undefined;
        }
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The module, and the fixtures
// ---------------------------------------------------------------------------

const {
  NAME_CHECK_AFTER_YES_MS,
  NAME_CHECK_GAPS_MS,
  NAME_CONFIRM_YES_ROUNDS,
  NAME_DNS_PORT,
  NAME_LABEL_MAX,
  NAME_OPEN_AFTER_ROUNDS,
  NAME_POINTERS_MAX,
  NAME_QUERY_DEADLINE_MS,
  NAME_RECORDS_MAX,
  NAME_REFUSED_V4,
  NAME_REPLY_MAX_BYTES,
  NAME_SEARCH_RESOLVERS,
  NAME_SEARCH_ZONE,
  NAME_SERVERS_ENV,
  NAME_SERVERS_MAX,
  NAME_STREAK_START,
  NAME_UNREADABLE_ROUNDS,
  NAME_WIRE_MAX,
  askNameRound,
  defaultNameCheckDeps,
  encodeNameQuery,
  findZoneServers,
  isPublicV4,
  judgeZoneAnswer,
  nameServersFrom,
  nextNameStreak,
  readNameReply,
  roundVerdictOf
} = await import('../public-name');
type NameServer = import('../public-name').NameServer;
type NameStreak = import('../public-name').NameStreak;
type NameVerdict = import('../public-name').NameVerdict;

const {
  addressReply,
  fakeNameDeps,
  noRecordReply,
  nsReply,
  nxdomainReply,
  questionOf,
  readQuestion,
  recordReply,
  replyTo,
  writeName
} = await import('./dns-fixtures');
type FakeAnswer = import('./dns-fixtures').FakeAnswer;
type FakeQuestion = import('./dns-fixtures').FakeQuestion;
type FixtureQuestion = import('./dns-fixtures').FixtureQuestion;
type ReplySpec = import('./dns-fixtures').ReplySpec;

/** The probes' made-up name (build/p330/tailscale-standin.mjs). His own is never written here. */
const NAME = 'p330-mac.tail00000.ts.net';
const PUBLIC = '203.0.113.10';

function query(id = 0x1234): Buffer {
  const q = encodeNameQuery(id, NAME, 'A', false);
  if (q === null) throw new Error('the made-up name must encode');
  return q;
}

function hex(text: string): string {
  return text.replace(/\s+/g, '');
}

// ---------------------------------------------------------------------------
// The loopback stand-in
// ---------------------------------------------------------------------------

interface Step {
  readonly bytes: Buffer;
  /** Milliseconds after the question arrives. */
  readonly after?: number;
  /** `'stranger'` sends from a second socket, on another port. */
  readonly from?: 'server' | 'stranger';
}

type Script = (query: Buffer, asked: FixtureQuestion | null) => readonly Step[];

interface StandIn {
  readonly server: NameServer;
  /** The override's spelling of this server. */
  readonly entry: string;
  readonly questions: Array<FixtureQuestion | null>;
  readonly sent: Array<{ readonly bytes: number; readonly from: string; readonly error: string | null }>;
  script: Script;
  close(): Promise<void>;
}

const standIns = new Set<StandIn>();

function literal(
  host: string,
  _family: unknown,
  done: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
): void {
  process.nextTick(done, null, host, 4);
}

function bindLoopback(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.bind({ address: '127.0.0.1', port: 0 }, () => {
      socket.off('error', reject);
      resolve();
    });
  });
}

function closeSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    try {
      socket.close(() => resolve());
    } catch {
      resolve();
    }
  });
}

async function startStandIn(script: Script): Promise<StandIn> {
  const own = createSocket({ type: 'udp4', lookup: literal });
  const stranger = createSocket({ type: 'udp4', lookup: literal });
  own.on('error', () => undefined);
  stranger.on('error', () => undefined);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const questions: Array<FixtureQuestion | null> = [];
  const sent: Array<{ bytes: number; from: string; error: string | null }> = [];
  let closed = false;
  const standIn: StandIn = {
    server: { address: '127.0.0.1', port: 0 },
    entry: '',
    questions,
    sent,
    script,
    close: async () => {
      if (closed) return;
      closed = true;
      standIns.delete(standIn);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      await Promise.all([closeSocket(own), closeSocket(stranger)]);
    }
  };
  standIns.add(standIn);
  await bindLoopback(own);
  await bindLoopback(stranger);
  // A 65,507-byte datagram needs more than macOS's 9,216-byte default
  // (net.inet.udp.maxdgram), measured by this builder: EMSGSIZE without it.
  own.setSendBufferSize(131_072);
  stranger.setSendBufferSize(131_072);
  const port = own.address().port;
  (standIn as { server: NameServer }).server = { address: '127.0.0.1', port };
  (standIn as { entry: string }).entry = `127.0.0.1:${String(port)}`;
  own.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
    const asked = readQuestion(msg);
    questions.push(asked);
    for (const step of standIn.script(Buffer.from(msg), asked)) {
      const go = (): void => {
        if (closed) return;
        const from = step.from ?? 'server';
        const sock = from === 'stranger' ? stranger : own;
        sock.send(step.bytes, rinfo.port, '127.0.0.1', (err) => {
          sent.push({ bytes: step.bytes.length, from, error: err === null ? null : String((err as NodeJS.ErrnoException).code ?? err.message) });
        });
      };
      if (step.after !== undefined && step.after > 0) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          go();
        }, step.after);
        timers.add(timer);
      } else {
        go();
      }
    }
  });
  return standIn;
}

/** A stand-in that answers every question with one reply written from `spec` (or the bytes `spec` makes). */
function answering(spec: ReplySpec | ((q: Buffer) => Buffer)): Promise<StandIn> {
  return startStandIn((q) => [{ bytes: typeof spec === 'function' ? spec(q) : replyTo(q, spec) }]);
}

/** The SHIPPING deps, pointed at stand-ins through the development override. */
function shipping(...servers: StandIn[]) {
  return defaultNameCheckDeps({
    packaged: false,
    env: { [NAME_SERVERS_ENV]: servers.map((s) => s.entry).join(',') }
  });
}

async function timed<T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await work();
  return { value, ms: performance.now() - start };
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  dnsCalls.length = 0;
  spyOnDns();
});

afterEach(async () => {
  for (const s of [...standIns]) await s.close();
  await new Promise((resolve) => setImmediate(resolve));
  vi.restoreAllMocks();
  expect(dnsCalls, 'node:dns was reached').toEqual([]);
  expect(fence.refused, 'a socket was pointed past 127.0.0.1').toEqual([]);
  expect(
    fence.sockets.filter((s) => !s.closed).length,
    'a socket was left open'
  ).toBe(0);
});

// ---------------------------------------------------------------------------
// §4.2 The question, byte for byte
// ---------------------------------------------------------------------------

describe('the constants (§9)', () => {
  it('are the spec’s, so a changed deadline or cap is a visible edit', () => {
    expect(NAME_SEARCH_ZONE).toBe('ts.net');
    expect(NAME_SEARCH_RESOLVERS).toEqual(['1.1.1.1', '8.8.8.8']);
    expect(Object.isFrozen(NAME_SEARCH_RESOLVERS)).toBe(true);
    expect(NAME_DNS_PORT).toBe(53);
    expect(NAME_SERVERS_MAX).toBe(4);
    expect(NAME_QUERY_DEADLINE_MS).toBe(2_000);
    expect(NAME_REPLY_MAX_BYTES).toBe(512);
    expect(NAME_LABEL_MAX).toBe(63);
    expect(NAME_WIRE_MAX).toBe(255);
    expect(NAME_POINTERS_MAX).toBe(8);
    expect(NAME_RECORDS_MAX).toBe(32);
    expect(NAME_REFUSED_V4).toHaveLength(8);
  });
});

describe('the question, byte for byte (§4.2)', () => {
  it('writes the two worked examples byte for byte', () => {
    expect(encodeNameQuery(0x1234, NAME, 'A', false)?.toString('hex')).toBe(
      hex(`12 34 00 00 00 01 00 00 00 00 00 00 08 70 33 33 30 2d 6d 61 63 09 74 61 69 6c 30 30 30 30 30
           02 74 73 03 6e 65 74 00 00 01 00 01`)
    );
    expect(encodeNameQuery(0x1234, NAME, 'A', false)?.length).toBe(43);
    expect(encodeNameQuery(0xbeef, 'ts.net', 'NS', true)?.toString('hex')).toBe(
      hex('be ef 01 00 00 01 00 00 00 00 00 00 02 74 73 03 6e 65 74 00 00 02 00 01')
    );
  });

  it('lowercases, drops one trailing dot, sets RD only when asked, and writes no other record', () => {
    const upper = encodeNameQuery(0x1234, 'P330-MAC.Tail00000.TS.NET.', 'A', false);
    expect(upper?.equals(query(0x1234))).toBe(true);
    const recursive = encodeNameQuery(0x1234, NAME, 'A', true);
    expect(recursive?.readUInt8(2)).toBe(0x01);
    expect(query().readUInt8(2)).toBe(0x00);
    expect(query().readUInt8(3)).toBe(0x00);
    // QDCOUNT 1, and AN, NS, AR 0: no OPT record, so no EDNS and no cookie.
    expect([...query().subarray(4, 12)]).toEqual([0, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('refuses every name the rule refuses, and every id outside 0..65535', () => {
    const bad = [
      '',
      '.',
      'net',
      'net.',
      'ts.net..',
      '..ts.net',
      'a..ts.net',
      '-a.ts.net',
      'a-.ts.net',
      'a_b.ts.net',
      'a b.ts.net',
      'a.ts.net/x',
      'a.ts.net:443',
      'ünï.ts.net',
      // The Kelvin sign lowercases to an ASCII k, so the rule reads ASCII first.
      'Kelvin.ts.net',
      `${'a'.repeat(64)}.ts.net`,
      // 63 + 63 + 63 + 62 labels: 256 bytes on the wire.
      `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}`
    ];
    for (const name of bad) {
      expect(encodeNameQuery(0x1234, name, 'A', false), JSON.stringify(name)).toBeNull();
    }
    for (const id of [-1, 0x10000, 1.5, Number.NaN]) {
      expect(encodeNameQuery(id, NAME, 'A', false), String(id)).toBeNull();
    }
    expect(encodeNameQuery(0, NAME, 'A', false)).not.toBeNull();
    expect(encodeNameQuery(0xffff, NAME, 'A', false)).not.toBeNull();
    // The boundaries on the other side: a 63-byte label, and 255 bytes on the wire.
    expect(encodeNameQuery(1, `${'a'.repeat(63)}.tail00000.ts.net`, 'A', false)).not.toBeNull();
    const longest = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
    expect(encodeNameQuery(1, longest, 'A', false)?.length).toBe(12 + 255 + 4);
  });

  it('a round refuses a bad name, or a name outside ts.net, before anything is sent', async () => {
    const deps = fakeNameDeps();
    for (const name of ['', 'a..ts.net', `${'a'.repeat(64)}.ts.net`, 'a_b.ts.net']) {
      expect(await askNameRound(deps, name, { servers: null })).toEqual({ verdict: 'unreadable', reason: 'bad-name' });
    }
    for (const name of ['example.com', 'ts.net', 'TS.NET.', 'x.ts.net.evil.example', 'x.xts.net', 'x.tsnet', '127.0.0.1']) {
      expect(await askNameRound(deps, name, { servers: null }), name).toEqual({
        verdict: 'unreadable',
        reason: 'outside-zone'
      });
    }
    expect(deps.questions).toHaveLength(0);
    expect(await askNameRound(deps, 'x.ts.net', { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    expect(deps.questions).toHaveLength(1);
  });

  it('asks the zone with RD 0 and the resolvers with RD 1, and no search question names the Mac', async () => {
    const deps = fakeNameDeps({
      source: { kind: 'search' },
      answer: (qname, qtype, q) => {
        if (q.server.address === '1.1.1.1' && qtype === 'NS') return nsReply(['ns1.zone-a.example', 'ns2.zone-b.example']);
        if (q.server.address === '1.1.1.1' && qname === 'ns1.zone-a.example') return addressReply(['192.0.2.53']);
        if (q.server.address === '1.1.1.1' && qname === 'ns2.zone-b.example') return addressReply(['198.51.100.53']);
        if (q.server.address === '8.8.8.8') return 'silent';
        return recordReply();
      }
    });
    expect(await askNameRound(deps, NAME, { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    const zone = deps.questions.filter((q) => q.qname === NAME);
    const search = deps.questions.filter((q) => q.qname !== NAME);
    expect(zone.map((q) => [q.server.address, q.server.port, q.rd, q.qtype])).toEqual([
      ['192.0.2.53', 53, false, 'A'],
      ['198.51.100.53', 53, false, 'A']
    ]);
    expect(search.length).toBeLessThanOrEqual(6);
    for (const q of search) {
      expect(q.rd).toBe(true);
      expect(NAME_SEARCH_RESOLVERS).toContain(q.server.address);
      expect(q.qname).not.toContain('tail00000');
      expect(q.qname).not.toContain('p330-mac');
    }
    // Every question, zone and search, carried QDCOUNT 1 and nothing else.
    for (const q of deps.questions) expect(q.counts).toEqual([1, 0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// §4.3 The transport, against a loopback stand-in
// ---------------------------------------------------------------------------

describe('the transport (§4.3), against a stand-in on 127.0.0.1', () => {
  it('asks once, from 127.0.0.1, over a connected socket, and reads an honest compressed record', async () => {
    const zone = await answering(recordReply(PUBLIC));
    const deps = shipping(zone);
    expect(deps.source).toEqual({ kind: 'fixed', servers: [zone.server] });
    const sendsBefore = fence.sends.length;
    const connectsBefore = fence.connects.length;
    const { value, ms } = await timed(() => askNameRound(deps, NAME, { servers: null }));
    expect(value).toEqual({ verdict: 'yes', reason: 'record' });
    expect(ms).toBeLessThan(NAME_QUERY_DEADLINE_MS);
    expect(zone.questions).toHaveLength(1);
    expect(zone.questions[0]).toMatchObject({ qname: NAME, qtype: 'A', rd: false, counts: [1, 0, 0, 0] });
    // The shipping socket connected to the stand-in and sent the buffer and a
    // callback, nothing else; the stand-in's own send names a port and address.
    expect(fence.connects.slice(connectsBefore)).toEqual([zone.entry]);
    expect(fence.sends.slice(sendsBefore).filter((n) => n === 2)).toHaveLength(1);
  });

  it('answers SERVFAIL, REFUSED and a truncated reply at once, not at the deadline', async () => {
    for (const [spec, reason] of [
      [{ rcode: 2 }, 'servfail'],
      [{ rcode: 5 }, 'refused'],
      [{ tc: true, answers: [{ address: PUBLIC }] }, 'truncated']
    ] as const) {
      const zone = await answering(spec);
      const { value, ms } = await timed(() => askNameRound(shipping(zone), NAME, { servers: null }));
      expect(value, reason).toEqual({ verdict: 'unreadable', reason });
      expect(ms, reason).toBeLessThan(NAME_QUERY_DEADLINE_MS / 2);
    }
  });

  it('drops a wrong id, a stranger and a burst of noise without ending the wait, and the first reply that passes decides', async () => {
    const zone = await startStandIn((q) => {
      const wrongId = replyTo(q, { ...recordReply(PUBLIC), id: (q.readUInt16BE(0) + 1) & 0xffff });
      const noise: Step[] = [];
      for (let i = 0; i < 300; i += 1) {
        const kind = i % 3;
        noise.push({
          bytes:
            kind === 0
              ? replyTo(q, { ...recordReply(PUBLIC), id: (q.readUInt16BE(0) + 2 + i) & 0xffff })
              : kind === 1
                ? replyTo(q, { ...recordReply(PUBLIC), qr: false })
                : Buffer.alloc(NAME_REPLY_MAX_BYTES + 1, 0xff)
        });
      }
      return [
        { bytes: wrongId },
        { bytes: replyTo(q, recordReply(PUBLIC)), from: 'stranger' },
        ...noise,
        // The first that passes: NXDOMAIN. The record after it is never read.
        { bytes: replyTo(q, nxdomainReply()), after: 50 },
        { bytes: replyTo(q, recordReply(PUBLIC)), after: 60 }
      ];
    });
    const { value, ms } = await timed(() => askNameRound(shipping(zone), NAME, { servers: null }));
    expect(value).toEqual({ verdict: 'no', reason: 'nxdomain' });
    expect(ms).toBeLessThan(NAME_QUERY_DEADLINE_MS);
  });

  it('ends at the deadline as timeout for silence, a wrong id, another port, 11, 513 and 65,507 bytes, QR 0, and a reply that comes late', async () => {
    const late = NAME_QUERY_DEADLINE_MS + 300;
    const shapes: Array<[string, Script]> = [
      ['silence', () => []],
      ['a wrong id', (q) => [{ bytes: replyTo(q, { ...recordReply(PUBLIC), id: (q.readUInt16BE(0) ^ 0x5555) & 0xffff }) }]],
      ['another port', (q) => [{ bytes: replyTo(q, recordReply(PUBLIC)), from: 'stranger' }]],
      ['11 bytes', (q) => [{ bytes: replyTo(q, recordReply(PUBLIC)).subarray(0, 11) }]],
      [
        '513 bytes',
        (q) => [{ bytes: replyTo(q, { ...recordReply(PUBLIC), trailing: Buffer.alloc(513 - replyTo(q, recordReply(PUBLIC)).length) }) }]
      ],
      [
        '65,507 bytes',
        (q) => [{ bytes: replyTo(q, { ...recordReply(PUBLIC), trailing: Buffer.alloc(65_507 - replyTo(q, recordReply(PUBLIC)).length) }) }]
      ],
      ['QR 0', (q) => [{ bytes: replyTo(q, { ...recordReply(PUBLIC), qr: false }) }]],
      ['late', (q) => [{ bytes: replyTo(q, recordReply(PUBLIC)), after: late }]]
    ];
    const zones = await Promise.all(shapes.map(([, script]) => startStandIn(script)));
    const results = await Promise.all(
      zones.map((zone) => timed(() => askNameRound(shipping(zone), NAME, { servers: null })))
    );
    // Hold the stand-ins open past the late reply, so it was really sent.
    await new Promise((resolve) => setTimeout(resolve, late - NAME_QUERY_DEADLINE_MS + 150));
    shapes.forEach(([label], i) => {
      const result = results[i];
      const zone = zones[i];
      expect(result?.value, label).toEqual({ verdict: 'unreadable', reason: 'timeout' });
      expect(result?.ms, label).toBeGreaterThanOrEqual(NAME_QUERY_DEADLINE_MS - 50);
      expect(result?.ms, label).toBeLessThan(NAME_QUERY_DEADLINE_MS + 900);
      expect(zone?.questions, label).toHaveLength(1);
      if (label !== 'silence') {
        // Each reply really left the stand-in, with no error: it was dropped
        // by the asker, not lost on the way.
        expect(zone?.sent, label).toHaveLength(1);
        expect(zone?.sent[0]?.error, label).toBeNull();
      }
    });
    expect(zones[5]?.sent[0]?.bytes).toBe(65_507);
  });

  it('outside Electron, a server that is not 127.0.0.1 answers error with no socket made (D8)', async () => {
    expect(typeof process.versions.electron).not.toBe('string');
    const deps = defaultNameCheckDeps({ packaged: false, env: {} });
    expect(deps.source).toEqual({ kind: 'search' });
    const before = fence.created;
    for (const server of [
      { address: PUBLIC, port: 53 },
      { address: '1.1.1.1', port: 53 },
      { address: '8.8.8.8', port: 53 },
      { address: '127.0.0.2', port: 53 }
    ]) {
      expect(await deps.exchange(server, query()), server.address).toEqual({ kind: 'error' });
    }
    expect(fence.created - before).toBe(0);
    // A development run with no override: the search reaches no resolver, so
    // a test that forgets its deps gets an unreadable round and no packet.
    expect(await askNameRound(deps, NAME, { servers: null })).toEqual({ verdict: 'unreadable', reason: 'no-servers' });
    expect(fence.created - before).toBe(0);
  });

  it('refuses a port outside 1..65535 or a packet that is not a question, before any socket', async () => {
    const deps = defaultNameCheckDeps({ packaged: false, env: {} });
    const before = fence.created;
    for (const port of [0, 65_536, 1.5, -53]) {
      expect(await deps.exchange({ address: '127.0.0.1', port }, query()), String(port)).toEqual({ kind: 'error' });
    }
    expect(await deps.exchange({ address: '127.0.0.1', port: 53 }, Buffer.alloc(11))).toEqual({ kind: 'error' });
    expect(await deps.exchange({ address: '127.0.0.1', port: 53 }, Buffer.alloc(513))).toEqual({ kind: 'error' });
    expect(fence.created - before).toBe(0);
  });

  it('never reaches node:dns, where a socket without a lookup of its own does (the spies are live)', async () => {
    const plain = createSocket('udp4');
    const failed = await new Promise<boolean>((resolve) => {
      plain.once('error', () => resolve(true));
      plain.bind({ address: '127.0.0.1', port: 0 }, () => resolve(false));
    });
    await closeSocket(plain);
    expect(failed).toBe(true);
    expect(dnsCalls).toEqual(['dns.lookup']);
    dnsCalls.length = 0;
    const zone = await answering(recordReply(PUBLIC));
    expect(await askNameRound(shipping(zone), NAME, { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    expect(dnsCalls).toEqual([]);
  });

  it('closes every socket it opens, on every way out', async () => {
    const zones = await Promise.all([
      answering(recordReply(PUBLIC)),
      answering({ rcode: 2 }),
      startStandIn(() => [])
    ]);
    const before = fence.sockets.length;
    const deps = shipping(...zones);
    expect(await askNameRound(deps, NAME, { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    await new Promise((resolve) => setImmediate(resolve));
    const made = fence.sockets.slice(before);
    expect(made).toHaveLength(3);
    expect(made.every((s) => s.closed)).toBe(true);
  });

  it('the shipping deps: a random id in 0..65535, a sleep that waits, and the source the override names', async () => {
    const deps = defaultNameCheckDeps({ packaged: false, env: { [NAME_SERVERS_ENV]: '127.0.0.1:5353' } });
    const ids = new Set<number>();
    for (let i = 0; i < 200; i += 1) {
      const id = deps.id();
      expect(Number.isInteger(id) && id >= 0 && id <= 0xffff).toBe(true);
      ids.add(id);
    }
    expect(ids.size).toBeGreaterThan(150);
    const { ms } = await timed(() => deps.sleep(25));
    expect(ms).toBeGreaterThanOrEqual(20);
    expect(deps.source).toEqual({ kind: 'fixed', servers: [{ address: '127.0.0.1', port: 5353 }] });
    expect(defaultNameCheckDeps({ packaged: true, env: { [NAME_SERVERS_ENV]: '127.0.0.1:5353' } }).source).toEqual({
      kind: 'search'
    });
  });
});

// ---------------------------------------------------------------------------
// §4.4 and §4.5 What a reply may say
// ---------------------------------------------------------------------------

describe('lies, another name, and the verdicts (§4.5), through the shipping transport', () => {
  it('an authoritative private address is a lie: MagicDNS, private, loopback and link-local are refused', async () => {
    for (const address of ['100.81.28.106', '10.0.0.1', '127.0.0.1', '169.254.1.1', '192.168.1.1', '172.16.0.1', '224.0.0.1']) {
      const zone = await answering(recordReply(address));
      expect(await askNameRound(shipping(zone), NAME, { servers: null }), address).toEqual({
        verdict: 'unreadable',
        reason: 'private-address'
      });
    }
  });

  it('a public address without the authoritative bit is a cache or an interceptor, not an answer', async () => {
    for (const spec of [{ ...recordReply(PUBLIC), aa: false }, { ...nxdomainReply(), aa: false }, { ...noRecordReply(), aa: false }]) {
      const zone = await answering(spec);
      expect(await askNameRound(shipping(zone), NAME, { servers: null })).toEqual({
        verdict: 'unreadable',
        reason: 'not-authoritative'
      });
    }
  });

  it('another name: the question not echoed, changed, or case-changed, another owner, a CNAME, another type or class', async () => {
    const other = Buffer.concat([writeName('p330-mac.tail99999.ts.net'), Buffer.from([0, 1, 0, 1])]);
    const cases: Array<[string, ReplySpec | ((q: Buffer) => Buffer), string]> = [
      ['no question', { ...recordReply(PUBLIC), question: 'none' }, 'question'],
      ['two questions', { ...recordReply(PUBLIC), qdcount: 2 }, 'question'],
      ['another question', { ...recordReply(PUBLIC), question: other }, 'question'],
      [
        'the question case-changed',
        { ...recordReply(PUBLIC), question: Buffer.from(questionOf(query()).toString('latin1').toUpperCase(), 'latin1') },
        'question'
      ],
      ['the question retyped', { ...recordReply(PUBLIC), question: Buffer.concat([writeName(NAME), Buffer.from([0, 28, 0, 1])]) }, 'question'],
      ['another owner', { aa: true, answers: [{ owner: 'p330-mac.tail99999.ts.net', address: PUBLIC }] }, 'other-owner'],
      ['an owner one label short', { aa: true, answers: [{ owner: 'tail00000.ts.net', address: PUBLIC }] }, 'other-owner'],
      // A dot INSIDE a label is not a label boundary.
      [
        'an owner with a dotted label',
        { aa: true, answers: [{ owner: Buffer.concat([Buffer.from([18]), Buffer.from('p330-mac.tail00000'), writeName('ts.net')]), address: PUBLIC }] },
        'other-owner'
      ],
      // Only A-Z fold. A fold that ORs 0x20 into every byte would read 0x10
      // as '0' and 0x0d as '-', and take this owner for the name.
      [
        'an owner that matches only if every byte were folded',
        {
          aa: true,
          answers: [
            {
              owner: Buffer.concat([Buffer.from([8, 0x70, 0x33, 0x33, 0x10, 0x0d, 0x6d, 0x61, 0x63]), writeName('tail00000.ts.net')]),
              address: PUBLIC
            }
          ]
        },
        'other-owner'
      ],
      ['a CNAME', { aa: true, answers: [{ type: 'CNAME', target: 'elsewhere.example' }] }, 'cname'],
      ['a TXT', { aa: true, answers: [{ type: 'TXT', rdata: Buffer.from([2, 0x68, 0x69]) }] }, 'type'],
      ['class CH', { aa: true, answers: [{ klass: 3, address: PUBLIC }] }, 'class'],
      ['an A of five bytes', { aa: true, answers: [{ rdata: Buffer.from([203, 0, 113, 10, 0]) }] }, 'malformed'],
      ['an honest A then a private one', { aa: true, answers: [{ address: PUBLIC }, { address: '10.1.2.3' }] }, 'private-address'],
      ['an honest A then a CNAME', { aa: true, answers: [{ address: PUBLIC }, { type: 'CNAME', target: 'x.example' }] }, 'cname']
    ];
    for (const [label, spec, reason] of cases) {
      const zone = await answering(spec);
      expect(await askNameRound(shipping(zone), NAME, { servers: null }), label).toEqual({ verdict: 'unreadable', reason });
    }
  });

  it('the verdicts: NXDOMAIN and NODATA are negative, an honest record is yes, and an owner differing only in ASCII case is the name', async () => {
    const cases: Array<[string, ReplySpec, { verdict: NameVerdict; reason: string }]> = [
      ['NXDOMAIN', nxdomainReply(), { verdict: 'no', reason: 'nxdomain' }],
      ['NXDOMAIN with no SOA', { aa: true, rcode: 3 }, { verdict: 'no', reason: 'nxdomain' }],
      ['NOERROR, no answer', noRecordReply(), { verdict: 'no', reason: 'no-record' }],
      ['the honest record, compressed', recordReply(PUBLIC), { verdict: 'yes', reason: 'record' }],
      ['two honest records', { aa: true, answers: [{ address: PUBLIC }, { address: '198.51.100.7' }] }, { verdict: 'yes', reason: 'record' }],
      ['the owner in capitals', { aa: true, answers: [{ owner: 'P330-MAC.TAIL00000.TS.NET', address: PUBLIC }] }, { verdict: 'yes', reason: 'record' }],
      ['the owner written out', { aa: true, answers: [{ owner: NAME, address: PUBLIC }] }, { verdict: 'yes', reason: 'record' }]
    ];
    for (const [label, spec, expected] of cases) {
      const zone = await answering(spec);
      expect(await askNameRound(shipping(zone), NAME, { servers: null }), label).toEqual(expected);
    }
  });
});

/** The malformed shapes, each built by hand around the question of {@link query}. */
function malformed(q: Buffer): Array<[string, Buffer, string]> {
  const qlen = questionOf(q).length; // 31
  const first = 12 + qlen; // the first record's owner
  const aTail = Buffer.from([0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 203, 0, 113, 10]);
  const withOwner = (owner: Buffer): Buffer =>
    Buffer.concat([replyTo(q, { counts: { an: 1 } }), owner, aTail]);
  const chain = (pointers: number): Buffer => {
    // Record 0: owner c0 0c, a TXT whose rdata is `pointers - 1` links, the
    // first pointing at the question's name and each later one at the link
    // before it, all strictly backward. Record 1's owner points at the last
    // link, so reading it follows exactly `pointers` pointers.
    const rdataAt = first + 2 + 10;
    const links: number[] = [];
    for (let k = 0; k < pointers - 1; k += 1) {
      const target = k === 0 ? 12 : rdataAt + 2 * (k - 1);
      links.push(0xc0 | (target >> 8), target & 0xff);
    }
    const rdata = Buffer.from(links);
    const last = rdataAt + 2 * (pointers - 2);
    return replyTo(q, {
      answers: [
        { type: 'TXT', rdata },
        { owner: Buffer.from([0xc0 | (last >> 8), last & 0xff]), address: PUBLIC }
      ]
    });
  };
  const label63 = Buffer.concat([Buffer.from([63]), Buffer.alloc(63, 0x61), Buffer.from([0])]);
  const label64 = Buffer.concat([Buffer.from([64]), Buffer.alloc(64, 0x61), Buffer.from([0])]);
  const longName = (last: number): Buffer =>
    Buffer.concat([
      Buffer.from([63]),
      Buffer.alloc(63, 0x61),
      Buffer.from([63]),
      Buffer.alloc(63, 0x62),
      Buffer.from([63]),
      Buffer.alloc(63, 0x63),
      Buffer.from([last]),
      Buffer.alloc(last, 0x64),
      Buffer.from([0])
    ]);
  const roots = (n: number): ReplySpec => ({
    answers: Array.from({ length: n }, () => ({ owner: Buffer.from([0]), rdata: Buffer.alloc(0) }))
  });
  const header = replyTo(q, recordReply(PUBLIC)).subarray(0, 12);
  return [
    ['a pointer loop', withOwner(Buffer.from([0x01, 0x61, 0xc0, first])), 'pointer'],
    ['a pointer to itself', withOwner(Buffer.from([0xc0, first])), 'pointer'],
    ['a pointer forward', withOwner(Buffer.from([0xc0, first + 2])), 'pointer'],
    ['a pointer into the header', withOwner(Buffer.from([0xc0, 0x05])), 'pointer'],
    ['a pointer past the end', withOwner(Buffer.from([0xff, 0xff])), 'pointer'],
    ['a pointer cut in half', Buffer.concat([replyTo(q, { counts: { an: 1 } }), Buffer.from([0xc0])]), 'malformed'],
    ['nine pointers', chain(9), 'pointer'],
    ['a 64-byte label', withOwner(label64), 'label'],
    ['a reserved label type', withOwner(Buffer.from([0x80, 0x61, 0])), 'label'],
    ['a 256-byte name', withOwner(longName(62)), 'name-long'],
    // Five 63-byte labels and no root before the packet ends: refused as too
    // long the moment it passes 255 bytes, before the reader runs off the end.
    [
      'a name past 255 bytes that never ends',
      Buffer.concat([replyTo(q, { counts: { an: 1 } }), ...Array.from({ length: 5 }, () => Buffer.concat([Buffer.from([63]), Buffer.alloc(63, 0x61)]))]),
      'name-long'
    ],
    ['counts past the packet', replyTo(q, { ...recordReply(PUBLIC), counts: { an: 3 } }), 'malformed'],
    ['33 records claimed', replyTo(q, { ...recordReply(PUBLIC), counts: { an: 1, ns: 16, ar: 16 } }), 'counts'],
    ['33 records written', replyTo(q, roots(33)), 'counts'],
    ['a record header cut short', Buffer.concat([replyTo(q, { counts: { an: 1 } }), Buffer.from([0xc0, 0x0c, 0, 1, 0, 1])]), 'malformed'],
    ['an rdata longer than the packet', replyTo(q, { aa: true, answers: [{ address: PUBLIC, rdlength: 200 }] }), 'malformed'],
    ['a trailing byte', replyTo(q, { ...recordReply(PUBLIC), trailing: Buffer.from([0]) }), 'trailing'],
    ['a 12-byte header alone', header, 'question'],
    ['OPCODE 2', replyTo(q, { ...recordReply(PUBLIC), opcode: 2 }), 'opcode'],
    ['RCODE 4', replyTo(q, { rcode: 4 }), 'rcode'],
    // The two that pass the parser: they are here so the boundary is tested
    // from both sides, and they read as another owner, not as a record.
    ['eight pointers', chain(8), 'type'],
    ['a 63-byte label', withOwner(label63), 'other-owner'],
    ['a 255-byte name', withOwner(longName(61)), 'other-owner'],
    ['32 records', replyTo(q, roots(32)), 'other-owner']
  ];
}

describe('the parser (§4.4): bounded, and never throws', () => {
  it('reads every malformed shape as its reason word, through the shipping transport and within the deadline', async () => {
    let sent = 0;
    for (const [label] of malformed(query())) {
      const zone = await startStandIn((q) => {
        const shape = malformed(q).find(([l]) => l === label);
        return shape === undefined ? [] : [{ bytes: shape[1] }];
      });
      const expected = malformed(query()).find(([l]) => l === label)?.[2];
      const { value, ms } = await timed(() => askNameRound(shipping(zone), NAME, { servers: null }));
      expect(value, label).toEqual({ verdict: 'unreadable', reason: expected });
      expect(ms, label).toBeLessThan(NAME_QUERY_DEADLINE_MS);
      sent += zone.sent.length;
      await zone.close();
    }
    expect(sent).toBe(malformed(query()).length);
  });

  it('a name follows at most eight pointers, a label is at most 63 bytes, and a name at most 255', () => {
    const q = query();
    const shapes = new Map(malformed(q).map(([label, bytes]) => [label, bytes]));
    const read = (label: string) => readNameReply(q, shapes.get(label) ?? Buffer.alloc(0));
    expect(NAME_POINTERS_MAX).toBe(8);
    expect(read('eight pointers')).toMatchObject({ ok: true });
    expect(read('nine pointers')).toEqual({ ok: false, reason: 'pointer' });
    expect(read('a 63-byte label')).toMatchObject({ ok: true });
    expect(read('a 64-byte label')).toEqual({ ok: false, reason: 'label' });
    expect(read('a 255-byte name')).toMatchObject({ ok: true });
    expect(read('a 256-byte name')).toEqual({ ok: false, reason: 'name-long' });
    expect(NAME_RECORDS_MAX).toBe(32);
    expect(read('32 records')).toMatchObject({ ok: true });
    expect(read('33 records written')).toEqual({ ok: false, reason: 'counts' });
  });

  it('refuses what the transport would drop: the size, a wrong id and QR 0', () => {
    const q = query();
    const honest = replyTo(q, recordReply(PUBLIC));
    expect(readNameReply(q, Buffer.concat([honest, Buffer.alloc(513 - honest.length)]))).toEqual({ ok: false, reason: 'too-long' });
    expect(readNameReply(q, honest.subarray(0, 11))).toEqual({ ok: false, reason: 'malformed' });
    expect(readNameReply(q, replyTo(q, { ...recordReply(PUBLIC), id: 0x4321 }))).toEqual({ ok: false, reason: 'id' });
    expect(readNameReply(q, replyTo(q, { ...recordReply(PUBLIC), qr: false }))).toEqual({ ok: false, reason: 'not-reply' });
  });

  it('keeps the answer section, walks the other two, and hands back the rdata offset', () => {
    const q = query();
    const reply = replyTo(q, { aa: true, answers: [{ address: PUBLIC }], authority: [{ owner: 'ts.net', type: 'NS', target: 'ns1.zone-a.example' }] });
    const parsed = readNameReply(q, reply);
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed).toMatchObject({ id: 0x1234, aa: true, rcode: 0 });
    expect(parsed.answers).toHaveLength(1);
    const record = parsed.answers[0];
    expect(record?.owner.map((l) => l.toString('latin1'))).toEqual(['p330-mac', 'tail00000', 'ts', 'net']);
    expect([record?.type, record?.klass]).toEqual([1, 1]);
    expect(record !== undefined && [...reply.subarray(record.rdataOffset, record.rdataOffset + 4)]).toEqual([203, 0, 113, 10]);
  });

  it('refuses every strict prefix of an honest reply, and 5,000 seeded random packets, without throwing', () => {
    const q = query();
    const honest = replyTo(q, { ...nxdomainReply(), answers: [] });
    for (let n = 0; n < honest.length; n += 1) {
      const out = readNameReply(q, honest.subarray(0, n));
      expect(out.ok, String(n)).toBe(false);
      expect(judgeZoneAnswer(q, honest.subarray(0, n), NAME).answer, String(n)).toBe('unreadable');
    }
    expect(judgeZoneAnswer(q, honest, NAME)).toEqual({ answer: 'negative', reason: 'nxdomain' });
    // A seeded generator, so a failure names a packet that can be rebuilt.
    let seed = 0x332;
    const next = (): number => {
      seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0;
      return seed >>> 16;
    };
    const words = new Set(['record', 'negative', 'unreadable']);
    for (let i = 0; i < 5_000; i += 1) {
      const length = 12 + (next() % 500);
      const bytes = Buffer.alloc(length);
      for (let j = 0; j < length; j += 1) bytes[j] = next() & 0xff;
      // Half of them pass the transport's filter and the question check, so
      // the record walk is what meets the noise.
      if (i % 2 === 0) {
        bytes.writeUInt16BE(0x1234, 0);
        bytes[2] = 0x84;
        bytes[3] = 0;
        bytes.writeUInt16BE(1, 4);
        questionOf(q).copy(bytes, 12);
      }
      const judged = judgeZoneAnswer(q, bytes, NAME);
      expect(words.has(judged.answer)).toBe(true);
    }
  });
});

describe('the refused ranges (§4.5)', () => {
  /** A 32-bit address as four octets, so this file spells no range as text. */
  const v4 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

  it('refuses the first and last address of each of the eight ranges, and passes their neighbours', () => {
    // [first, last, the address before, the address after]; null where there is none.
    const ranges: Array<[number, number, number | null, number | null]> = [
      [0x00000000, 0x00ffffff, null, 0x01000000], // unspecified
      [0x0a000000, 0x0affffff, 0x09ffffff, 0x0b000000], // private
      [0x64400000, 0x647fffff, 0x643fffff, 0x64800000], // carrier-grade NAT, MagicDNS
      [0x7f000000, 0x7fffffff, 0x7effffff, 0x80000000], // loopback
      [0xa9fe0000, 0xa9feffff, 0xa9fdffff, 0xa9ff0000], // link-local
      [0xac100000, 0xac1fffff, 0xac0fffff, 0xac200000], // private
      [0xc0a80000, 0xc0a8ffff, 0xc0a7ffff, 0xc0a90000], // private
      [0xe0000000, 0xffffffff, 0xdfffffff, null] // multicast and reserved
    ];
    for (const [firstAddress, lastAddress, before, after] of ranges) {
      expect(isPublicV4(v4(firstAddress)), v4(firstAddress).join('.')).toBe(false);
      expect(isPublicV4(v4(lastAddress)), v4(lastAddress).join('.')).toBe(false);
      if (before !== null) expect(isPublicV4(v4(before)), v4(before).join('.')).toBe(true);
      if (after !== null) expect(isPublicV4(v4(after)), v4(after).join('.')).toBe(true);
    }
  });

  it('passes the documentation ranges the tests answer with, and refuses anything that is not four octets', () => {
    for (const n of [0xc0000201, 0xc6336401, 0xcb00710a]) expect(isPublicV4(v4(n))).toBe(true);
    expect(isPublicV4([100, 81, 28, 106])).toBe(false);
    for (const bad of [[], [203, 0, 113], [203, 0, 113, 10, 1], [256, 0, 0, 1], [-1, 0, 0, 1], [1.5, 0, 0, 1]]) {
      expect(isPublicV4(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// §4.7 The round and the confirm rule
// ---------------------------------------------------------------------------

describe('the round and the confirm rule (§4.7)', () => {
  it('any negative is no, else any record is yes, else the first reason in server order', () => {
    expect(
      roundVerdictOf([
        { answer: 'record', reason: 'record' },
        { answer: 'negative', reason: 'nxdomain' }
      ])
    ).toEqual({ verdict: 'no', reason: 'nxdomain' });
    expect(
      roundVerdictOf([
        { answer: 'unreadable', reason: 'timeout' },
        { answer: 'record', reason: 'record' }
      ])
    ).toEqual({ verdict: 'yes', reason: 'record' });
    expect(
      roundVerdictOf([
        { answer: 'unreadable', reason: 'timeout' },
        { answer: 'negative', reason: 'no-record' }
      ])
    ).toEqual({ verdict: 'no', reason: 'no-record' });
    expect(
      roundVerdictOf([
        { answer: 'unreadable', reason: 'servfail' },
        { answer: 'unreadable', reason: 'timeout' }
      ])
    ).toEqual({ verdict: 'unreadable', reason: 'servfail' });
    expect(roundVerdictOf([])).toEqual({ verdict: 'unreadable', reason: 'no-servers' });
  });

  it('asks every kept server at once, each with a fresh id, and two that disagree read no', async () => {
    const deps = fakeNameDeps({
      source: {
        kind: 'fixed',
        servers: [
          { address: '127.0.0.1', port: 5301 },
          { address: '127.0.0.1', port: 5302 },
          { address: '127.0.0.1', port: 5303 }
        ]
      },
      answer: () => 'hold'
    });
    const round = askNameRound(deps, NAME, { servers: null });
    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.held).toHaveLength(3);
    expect(new Set(deps.questions.map((q) => q.id)).size).toBe(3);
    deps.held[0]?.release(recordReply(PUBLIC));
    deps.held[1]?.release(nxdomainReply());
    deps.held[2]?.release('silent');
    expect(await round).toEqual({ verdict: 'no', reason: 'nxdomain' });
  });

  it('two live stand-ins that disagree in one round read no', async () => {
    const yes = await answering(recordReply(PUBLIC));
    const no = await answering(nxdomainReply());
    expect(await askNameRound(shipping(yes, no), NAME, { servers: null })).toEqual({ verdict: 'no', reason: 'nxdomain' });
    expect(await askNameRound(shipping(no, yes), NAME, { servers: null })).toEqual({ verdict: 'no', reason: 'nxdomain' });
  });

  it('every row of the streak table, and the gaps 20, 30, 45, 60, 60 s', () => {
    expect(NAME_STREAK_START).toEqual({ rounds: 0, yes: 0, unreadable: 0, opened: false });
    expect(NAME_CHECK_GAPS_MS).toEqual([20_000, 30_000, 45_000, 60_000]);
    expect(NAME_CHECK_AFTER_YES_MS).toBe(20_000);
    // THE FIX ROUND: one yes confirms and one unreadable opens, because two
    // and three held Pair back 20 s and 55 s behind the build before this
    // phase; a no that lasts 18 rounds opens too, so nothing locks Pair away.
    expect(NAME_CONFIRM_YES_ROUNDS).toBe(1);
    expect(NAME_UNREADABLE_ROUNDS).toBe(1);
    expect(NAME_OPEN_AFTER_ROUNDS).toBe(18);

    // yes: yes + 1, unreadable 0, opened kept; confirmed; 20 s.
    expect(nextNameStreak({ rounds: 4, yes: 0, unreadable: 2, opened: true }, 'yes')).toEqual({
      streak: { rounds: 5, yes: 1, unreadable: 0, opened: true },
      confirmed: true,
      gapMs: 20_000
    });
    expect(nextNameStreak(NAME_STREAK_START, 'yes')).toEqual({
      streak: { rounds: 1, yes: 1, unreadable: 0, opened: false },
      confirmed: true,
      gapMs: 20_000
    });
    // no: yes 0, unreadable 0, opened false before the 18th round; the schedule.
    expect(nextNameStreak({ rounds: 7, yes: 1, unreadable: 3, opened: true }, 'no')).toEqual({
      streak: { rounds: 8, yes: 0, unreadable: 0, opened: false },
      confirmed: false,
      gapMs: 60_000
    });
    // ...and opened from the 18th round on, whatever came before.
    expect(nextNameStreak({ rounds: 16, yes: 0, unreadable: 0, opened: false }, 'no').streak.opened).toBe(false);
    expect(nextNameStreak({ rounds: 17, yes: 0, unreadable: 0, opened: false }, 'no')).toEqual({
      streak: { rounds: 18, yes: 0, unreadable: 0, opened: true },
      confirmed: false,
      gapMs: 60_000
    });
    expect(nextNameStreak({ rounds: 30, yes: 0, unreadable: 0, opened: true }, 'no').streak.opened).toBe(true);
    // unreadable: yes 0, unreadable + 1, opened at the first; the schedule.
    expect(nextNameStreak({ rounds: 1, yes: 0, unreadable: 0, opened: false }, 'unreadable')).toEqual({
      streak: { rounds: 2, yes: 0, unreadable: 1, opened: true },
      confirmed: false,
      gapMs: 30_000
    });
    expect(nextNameStreak(NAME_STREAK_START, 'unreadable')).toEqual({
      streak: { rounds: 1, yes: 0, unreadable: 1, opened: true },
      confirmed: false,
      gapMs: 20_000
    });

    // The gaps of a run that never confirms.
    const verdicts: NameVerdict[] = ['no', 'no', 'no', 'no', 'no', 'no'];
    let streak: NameStreak = NAME_STREAK_START;
    const gaps: number[] = [];
    for (const v of verdicts) {
      const step = nextNameStreak(streak, v);
      gaps.push(step.gapMs);
      streak = step.streak;
    }
    expect(gaps).toEqual([20_000, 30_000, 45_000, 60_000, 60_000, 60_000]);
    // §3 row 2's probe run: no at 0, 20, 50, 95, then yes at 155, which confirms.
    let at = 0;
    const times: number[] = [];
    streak = NAME_STREAK_START;
    let confirmed = false;
    for (const v of ['no', 'no', 'no', 'no', 'yes'] as NameVerdict[]) {
      times.push(at / 1000);
      const step = nextNameStreak(streak, v);
      streak = step.streak;
      confirmed = step.confirmed;
      at += step.gapMs;
    }
    expect(times).toEqual([0, 20, 50, 95, 155]);
    expect(confirmed).toBe(true);
    // A no that never ends: the 18th round opens Pair, about 15½ minutes in.
    at = 0;
    streak = NAME_STREAK_START;
    let openedAt: number | null = null;
    for (let i = 0; i < 25; i += 1) {
      const step = nextNameStreak(streak, 'no');
      streak = step.streak;
      if (openedAt === null && streak.opened) openedAt = at;
      at += step.gapMs;
    }
    expect(openedAt).toBe(935_000);
    expect(streak.opened).toBe(true);
    // The re-ask's no starts checking at 20 s.
    expect(nextNameStreak(NAME_STREAK_START, 'no').gapMs).toBe(20_000);
  });

  it('a yes confirms; an unreadable opens; a no closes it until the 18th round; a yes and an unreadable keep it open', () => {
    const run = (verdicts: NameVerdict[]) => {
      let streak: NameStreak = NAME_STREAK_START;
      const out: Array<{ confirmed: boolean; opened: boolean }> = [];
      for (const v of verdicts) {
        const step = nextNameStreak(streak, v);
        streak = step.streak;
        out.push({ confirmed: step.confirmed, opened: streak.opened });
      }
      return out;
    };
    expect(run(['yes']).map((s) => s.confirmed)).toEqual([true]);
    expect(run(['no', 'no', 'yes']).map((s) => s.confirmed)).toEqual([false, false, true]);
    expect(run(['unreadable', 'yes']).map((s) => s.confirmed)).toEqual([false, true]);
    expect(run(['unreadable', 'unreadable', 'no', 'unreadable', 'no']).map((s) => s.opened)).toEqual([
      true,
      true,
      false,
      true,
      false
    ]);
    const long = run([...new Array<NameVerdict>(17).fill('no'), 'no', 'unreadable', 'no']).map((s) => s.opened);
    expect(long.slice(0, 17).every((o) => !o)).toBe(true);
    expect(long.slice(17)).toEqual([true, true, true]);
  });

  it('a server flapping between the record and NXDOMAIN: each round reads what it was answered, and the first yes confirms', async () => {
    let flip = true;
    const deps = fakeNameDeps({
      answer: () => {
        flip = !flip;
        return flip ? recordReply(PUBLIC) : nxdomainReply();
      }
    });
    let streak: NameStreak = NAME_STREAK_START;
    const verdicts: string[] = [];
    const confirmedAt: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const result = await askNameRound(deps, NAME, { servers: null });
      verdicts.push(result.verdict);
      const step = nextNameStreak(streak, result.verdict);
      streak = step.streak;
      if (step.confirmed) confirmedAt.push(i);
    }
    expect(verdicts).toEqual(['no', 'yes', 'no', 'yes']);
    // The host ends the run at the first confirmation, so nothing after it is asked.
    expect(confirmedAt[0]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §4.6 Finding the zone servers
// ---------------------------------------------------------------------------

describe('finding the zone servers (§4.6), over deps that open no socket', () => {
  type Table = (q: FakeQuestion) => FakeAnswer;
  const search = (table: Table) =>
    fakeNameDeps({ source: { kind: 'search' }, answer: (_n, _t, q) => table(q) });
  /** 1.1.1.1 answers `targets`, every target's A is in `addresses`, and 8.8.8.8 is silent. */
  const resolver = (targets: string[], addresses: Record<string, string[]>, at = '1.1.1.1'): Table => (q) => {
    if (q.server.address !== at) return NAME_SEARCH_RESOLVERS.includes(q.server.address) ? 'silent' : recordReply(PUBLIC);
    if (q.qtype === 'NS') return nsReply(targets);
    return addressReply(addresses[q.qname] ?? []);
  };

  it('asks NS ts.net at both resolvers at once, then each target at the winner, and keeps the public addresses on port 53', async () => {
    const deps = search(resolver(['ns1.zone-a.example', 'ns2.zone-b.example'], {
      'ns1.zone-a.example': ['192.0.2.53'],
      'ns2.zone-b.example': ['198.51.100.53']
    }));
    expect(await findZoneServers(deps)).toEqual([
      { address: '192.0.2.53', port: NAME_DNS_PORT },
      { address: '198.51.100.53', port: NAME_DNS_PORT }
    ]);
    expect(deps.questions.map((q) => [q.server.address, q.qtype, q.qname, q.rd])).toEqual([
      ['1.1.1.1', 'NS', NAME_SEARCH_ZONE, true],
      ['8.8.8.8', 'NS', NAME_SEARCH_ZONE, true],
      ['1.1.1.1', 'A', 'ns1.zone-a.example', true],
      ['1.1.1.1', 'A', 'ns2.zone-b.example', true]
    ]);
  });

  it('keeps 8.8.8.8’s servers when 1.1.1.1 is silent, and asks their addresses at 8.8.8.8', async () => {
    const deps = search(resolver(['ns1.zone-a.example'], { 'ns1.zone-a.example': ['192.0.2.54'] }, '8.8.8.8'));
    expect(await findZoneServers(deps)).toEqual([{ address: '192.0.2.54', port: 53 }]);
    expect(deps.questions.filter((q) => q.qtype === 'A').map((q) => q.server.address)).toEqual(['8.8.8.8']);
  });

  it('prefers 1.1.1.1 when both answer', async () => {
    const deps = search((q) => {
      if (q.qtype === 'NS') return nsReply([q.server.address === '1.1.1.1' ? 'ns1.zone-a.example' : 'ns9.zone-z.example']);
      return addressReply([q.qname === 'ns1.zone-a.example' ? '192.0.2.1' : '192.0.2.9']);
    });
    expect(await findZoneServers(deps)).toEqual([{ address: '192.0.2.1', port: 53 }]);
  });

  it('answers null when both resolvers are silent, and when every NS reply is unreadable', async () => {
    expect(await findZoneServers(search(() => 'silent'))).toBeNull();
    expect(await findZoneServers(search(() => 'error'))).toBeNull();
    const unreadable: Array<[string, ReplySpec]> = [
      ['a CNAME among the NS', { answers: [{ type: 'NS', target: 'ns1.zone-a.example' }, { type: 'CNAME', target: 'x.example' }] }],
      ['a bad target', nsReply(['bad_target.example'])],
      ['a one-label target', nsReply(['localhost'])],
      ['a target with a dotted label', { answers: [{ type: 'NS', rdata: Buffer.concat([Buffer.from([7]), Buffer.from('ns1.zon'), Buffer.from([7]), Buffer.from('example'), Buffer.from([0])]) }] }],
      ['NS owned by another zone', { answers: [{ owner: 'example.com', type: 'NS', target: 'ns1.zone-a.example' }] }],
      ['NS of another class', { answers: [{ type: 'NS', klass: 3, target: 'ns1.zone-a.example' }] }],
      // `ns1` with no root: the name runs on into the next record's owner and
      // would read `ns1.ts.net` if its end were not held to the rdata's.
      [
        'a target running past its rdata',
        {
          answers: [
            { type: 'NS', rdata: Buffer.from([3, 0x6e, 0x73, 0x31]) },
            { owner: 'ts.net', type: 'NS', target: 'ns2.zone-b.example' }
          ]
        }
      ],
      ['NXDOMAIN', { rcode: 3 }],
      ['no answer', {}]
    ];
    for (const [label, spec] of unreadable) {
      const deps = search((q) =>
        q.qtype === 'NS' ? spec : addressReply(['192.0.2.53'])
      );
      expect(await findZoneServers(deps), label).toBeNull();
      expect(deps.questions.filter((q) => q.qtype === 'A'), label).toHaveLength(0);
    }
  });

  it('keeps four of five targets, drops a target whose only address is private, and follows no CNAME', async () => {
    const five = ['ns1.a.example', 'ns2.b.example', 'ns3.c.example', 'ns4.d.example', 'ns5.e.example'];
    const deps = search(resolver(five, {
      'ns1.a.example': ['192.0.2.1'],
      'ns2.b.example': ['192.0.2.2'],
      'ns3.c.example': ['192.0.2.3'],
      'ns4.d.example': ['192.0.2.4'],
      'ns5.e.example': ['192.0.2.5']
    }));
    expect((await findZoneServers(deps))?.map((s) => s.address)).toEqual(['192.0.2.1', '192.0.2.2', '192.0.2.3', '192.0.2.4']);
    expect(deps.questions.filter((q) => q.qtype === 'A')).toHaveLength(NAME_SERVERS_MAX);
    expect(deps.questions.length).toBeLessThanOrEqual(6);

    const mixed = search((q) => {
      if (q.server.address === '8.8.8.8') return 'silent';
      if (q.qtype === 'NS') return nsReply(['ns1.a.example', 'ns2.b.example', 'ns3.c.example', 'ns4.d.example']);
      if (q.qname === 'ns1.a.example') return addressReply(['10.0.0.53']);
      // A CNAME, then an A owned by the target itself: the reply holds a
      // CNAME, so it does not count, even though the A would.
      if (q.qname === 'ns2.b.example') return { answers: [{ type: 'CNAME', target: 'ns9.z.example' }, { address: '192.0.2.2' }] };
      if (q.qname === 'ns3.c.example') return addressReply(['127.0.0.53', '192.0.2.3']);
      return { answers: [{ owner: 'ns9.z.example', address: '192.0.2.4' }] };
    });
    // The private one dropped, the CNAME not followed, the first PUBLIC
    // address kept, and an answer owned by another name read as none.
    expect(await findZoneServers(mixed)).toEqual([{ address: '192.0.2.3', port: 53 }]);
  });

  it('keeps distinct addresses only', async () => {
    const deps = search(resolver(['ns1.a.example', 'ns2.b.example'], {
      'ns1.a.example': ['192.0.2.1'],
      'ns2.b.example': ['192.0.2.1']
    }));
    expect(await findZoneServers(deps)).toEqual([{ address: '192.0.2.1', port: 53 }]);
  });

  it('searches once per run, and again after a round in which every kept server was unreadable', async () => {
    let zoneAnswer: FakeAnswer = recordReply(PUBLIC);
    const deps = search((q) => {
      if (q.server.address === '8.8.8.8') return 'silent';
      if (q.server.address === '1.1.1.1') return q.qtype === 'NS' ? nsReply(['ns1.a.example']) : addressReply(['192.0.2.53']);
      return zoneAnswer;
    });
    const cache: { servers: readonly NameServer[] | null } = { servers: null };
    const nsAsked = () => deps.questions.filter((q) => q.qtype === 'NS').length;
    expect(await askNameRound(deps, NAME, cache)).toEqual({ verdict: 'yes', reason: 'record' });
    expect(cache.servers).toEqual([{ address: '192.0.2.53', port: 53 }]);
    expect(await askNameRound(deps, NAME, cache)).toEqual({ verdict: 'yes', reason: 'record' });
    expect(nsAsked()).toBe(2);
    zoneAnswer = 'silent';
    expect(await askNameRound(deps, NAME, cache)).toEqual({ verdict: 'unreadable', reason: 'timeout' });
    expect(cache.servers).toBeNull();
    zoneAnswer = nxdomainReply();
    expect(await askNameRound(deps, NAME, cache)).toEqual({ verdict: 'no', reason: 'nxdomain' });
    expect(nsAsked()).toBe(4);
    // A negative round keeps the servers it read.
    expect(cache.servers).not.toBeNull();
    // And a search that finds nothing is no-servers, searched again next time.
    const empty = search(() => 'silent');
    const none: { servers: readonly NameServer[] | null } = { servers: null };
    expect(await askNameRound(empty, NAME, none)).toEqual({ verdict: 'unreadable', reason: 'no-servers' });
    expect(await askNameRound(empty, NAME, none)).toEqual({ verdict: 'unreadable', reason: 'no-servers' });
    expect(empty.questions.filter((q) => q.qtype === 'NS')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// §4.8 The development override
// ---------------------------------------------------------------------------

describe('the development override (§4.8)', () => {
  const from = (value: string | undefined, packaged = false) =>
    nameServersFrom({ packaged, env: value === undefined ? {} : { [NAME_SERVERS_ENV]: value } });

  it('is read under its own name', () => {
    expect(NAME_SERVERS_ENV).toBe('GMUX_POCKET_NAME_SERVERS');
  });

  it('unset or blank is the search; one to four loopback entries are fixed; anything else refuses the whole value', () => {
    expect(from(undefined)).toEqual({ kind: 'search' });
    expect(from('')).toEqual({ kind: 'search' });
    expect(from('   ')).toEqual({ kind: 'search' });
    expect(from('127.0.0.1:5353')).toEqual({ kind: 'fixed', servers: [{ address: '127.0.0.1', port: 5353 }] });
    expect(from(' 127.0.0.1:1 , 127.0.0.1:2,127.0.0.1:3,127.0.0.1:65535 ')).toEqual({
      kind: 'fixed',
      servers: [1, 2, 3, 65_535].map((port) => ({ address: '127.0.0.1', port }))
    });
    for (const value of [
      '127.0.0.1:1,127.0.0.1:2,127.0.0.1:3,127.0.0.1:4,127.0.0.1:5',
      '10.0.0.1:53',
      'localhost:53',
      '127.0.0.1:0',
      '127.0.0.1:65536',
      '127.0.0.1:053',
      '127.0.0.2:53',
      '127.0.0.1',
      '127.0.0.1:',
      '127.0.0.1:53,',
      '127.0.0.1:53,10.0.0.1:53',
      '[::1]:53',
      '127.0.0.1:53 extra',
      '127.000.000.001:53',
      '9127.0.0.1:53',
      '127.0.0.1:5353:53'
    ]) {
      expect(from(value), value).toEqual({ kind: 'refused' });
    }
  });

  it('a packaged build ignores every value', () => {
    for (const value of [undefined, '', '127.0.0.1:5353', '10.0.0.1:53', 'localhost:53', '127.0.0.1:0']) {
      expect(from(value, true), String(value)).toEqual({ kind: 'search' });
    }
  });

  it('a refused value asks nothing and never falls back to the search', async () => {
    const deps = fakeNameDeps({ source: { kind: 'refused' } });
    for (let i = 0; i < 3; i += 1) {
      expect(await askNameRound(deps, NAME, { servers: null })).toEqual({ verdict: 'unreadable', reason: 'override-unusable' });
    }
    expect(deps.questions).toHaveLength(0);
    // The shipping deps with the same value: no socket either.
    const before = fence.created;
    const shippingRefused = defaultNameCheckDeps({ packaged: false, env: { [NAME_SERVERS_ENV]: '10.0.0.1:53' } });
    expect(shippingRefused.source).toEqual({ kind: 'refused' });
    expect(await askNameRound(shippingRefused, NAME, { servers: null })).toEqual({
      verdict: 'unreadable',
      reason: 'override-unusable'
    });
    expect(fence.created - before).toBe(0);
  });

  it('a fixed value is asked as it is, with no search', async () => {
    const deps = fakeNameDeps({ source: from('127.0.0.1:5353,127.0.0.1:5354') });
    expect(await askNameRound(deps, NAME, { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    expect(deps.questions.map((q) => [q.server.address, q.server.port, q.qtype])).toEqual([
      ['127.0.0.1', 5353, 'A'],
      ['127.0.0.1', 5354, 'A']
    ]);
  });
});

// ---------------------------------------------------------------------------
// The fixtures the host's tests drive
// ---------------------------------------------------------------------------

describe('fakeNameDeps (the host tests’ deps)', () => {
  it('holds an answer until it is released, and records every question', async () => {
    const deps = fakeNameDeps({ answer: () => 'hold' });
    let done = false;
    const round = askNameRound(deps, NAME, { servers: null }).then((r) => {
      done = true;
      return r;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(done).toBe(false);
    expect(deps.held).toHaveLength(1);
    expect(deps.questions[0]).toMatchObject({ qname: NAME, qtype: 'A', rd: false });
    deps.answerWith(nxdomainReply());
    expect(deps.releaseHeld()).toBe(1);
    expect(await round).toEqual({ verdict: 'no', reason: 'nxdomain' });
    expect(deps.releaseHeld()).toBe(0);
  });

  it('answers the record by default, and releases sleeps by hand or at once', async () => {
    const hand = fakeNameDeps();
    expect(await askNameRound(hand, NAME, { servers: null })).toEqual({ verdict: 'yes', reason: 'record' });
    let slept = false;
    void hand.sleep(20_000).then(() => {
      slept = true;
    });
    void hand.sleep(30_000);
    await new Promise((resolve) => setImmediate(resolve));
    expect(slept).toBe(false);
    expect(hand.pendingSleeps()).toEqual([20_000, 30_000]);
    expect(hand.releaseSleeps(20_000)).toBe(1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(slept).toBe(true);
    expect(hand.pendingSleeps()).toEqual([30_000]);
    expect(hand.releaseSleeps()).toBe(1);

    const now = fakeNameDeps({ sleep: 'now' });
    await now.sleep(60_000);
    expect(now.sleeps.map((s) => [s.ms, s.released])).toEqual([[60_000, true]]);
    const ids = [now.id(), now.id()];
    expect(ids).toEqual([0x1000, 0x1001]);
  });
});
