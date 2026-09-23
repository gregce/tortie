/**
 * The driven half of `conformance:push` (Phase 314). Plain node through the
 * pinned tsx: no Electron, no tmux, no ssh, no agent, and NO NETWORK.
 *
 * WHAT IT DRIVES. The SHIPPING sender, composer and engine
 * (`src/main/push/`), the door's own route composer (`src/main/pocket/
 * routes.ts`), `blockedSince` and `blockedAge` (`src/main/tray/attention.ts`)
 * and `WakeMark` over the drivable monitor, each with an injected wall clock,
 * an injected monotonic clock and an injected scheduler, against the loopback
 * APNs stand-in (`./apns-stand-in.mjs`) on `127.0.0.1`, which it starts and
 * closes in its own `finally`.
 *
 * THE FENCE, AND IT IS INSTALLED BEFORE ANYTHING ELSE. Every socket this
 * process could open goes through `http2.connect`, `tls.connect`, `net.connect`
 * or `net.createConnection`, and a name goes through `dns.lookup`. All five are
 * wrapped here so a host that is not `127.0.0.1` or `::1` is REFUSED BEFORE ANY
 * SOCKET and recorded. The sender's own refusal is what the rules test; the
 * fence is what makes a sender whose refusal was deleted (which is exactly
 * what `ablation:p314` does) unable to reach Apple, or anything else, from a
 * gate. A fence hit is a failure of H2 and H3, never a skipped check.
 *
 * WHAT IT PRINTS. Lines for a person, then ONE line `P314_PUSH:{…}` holding
 * each rule's check count and failures, which `build/conformance-push.mjs`
 * merges with its static half. It prints no key byte, no provider token, no
 * device token and no payload: the key is generated for this run, the tokens
 * are random, and a failure names a digest or a length.
 *
 *   node build/conformance-push.mjs        runs this through tsxCli()
 */

import { createRequire, syncBuiltinESMExports } from 'node:module';
import { createHash, generateKeyPairSync, randomBytes, webcrypto } from 'node:crypto';
import { startApnsStandIn, startSilentPeer } from './apns-stand-in.mjs';

// ---------------------------------------------------------------------------
// THE FENCE
// ---------------------------------------------------------------------------

const requireBuiltin = createRequire(import.meta.url);
const http2Module = requireBuiltin('node:http2');
const netModule = requireBuiltin('node:net');
const tlsModule = requireBuiltin('node:tls');
const dnsModule = requireBuiltin('node:dns');

/** Every refused dial, in order. Must be empty at the end of every run. */
const fenceHits: string[] = [];

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '[::1]']);

/** The host a connect call names, or '' for a unix socket path. */
function hostOf(args: unknown[]): string {
  const first = args[0];
  if (typeof first === 'object' && first !== null) {
    const o = first as Record<string, unknown>;
    if (typeof o['path'] === 'string') return '';
    return typeof o['host'] === 'string' ? o['host'] : 'localhost';
  }
  if (typeof first === 'string' && !/^\d+$/.test(first)) return '';
  return typeof args[1] === 'string' ? args[1] : 'localhost';
}

function fenced<T extends (...a: any[]) => any>(name: string, original: T, hostFrom: (args: unknown[]) => string): T {
  return function (this: unknown, ...args: unknown[]) {
    const host = hostFrom(args);
    if (host !== '' && !LOOPBACK_HOSTS.has(host)) {
      fenceHits.push(`${name} ${host}`);
      throw new Error(`[p314 fence] ${name} to ${host} refused: this gate reaches nothing but 127.0.0.1`);
    }
    return original.apply(this, args);
  } as T;
}

{
  const originalHttp2 = http2Module.connect;
  http2Module.connect = fenced('http2.connect', originalHttp2, (args) => {
    const authority = args[0];
    try {
      const url = typeof authority === 'string' ? new URL(authority) : (authority as URL);
      return url.hostname;
    } catch {
      return 'unparseable';
    }
  });
  netModule.connect = fenced('net.connect', netModule.connect, hostOf);
  netModule.createConnection = fenced('net.createConnection', netModule.createConnection, hostOf);
  tlsModule.connect = fenced('tls.connect', tlsModule.connect, hostOf);
  const originalLookup = dnsModule.lookup;
  dnsModule.lookup = function (hostname: string, ...rest: unknown[]) {
    if (!LOOPBACK_HOSTS.has(hostname) && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
      fenceHits.push(`dns.lookup ${hostname}`);
      const callback = rest[rest.length - 1];
      const err = Object.assign(new Error(`[p314 fence] dns.lookup of ${hostname} refused`), { code: 'ENOTFOUND' });
      if (typeof callback === 'function') {
        process.nextTick(() => (callback as (e: Error) => void)(err));
        return;
      }
      throw err;
    }
    return originalLookup.call(this, hostname, ...rest);
  };
  syncBuiltinESMExports();
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const RULE_IDS = [
  'H1', 'H2', 'H3', 'J1', 'J2', 'A1', 'A2', 'A3', 'A4', 'C1',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'G1', 'W1', 'Y1', 'S1'
] as const;
type RuleId = (typeof RULE_IDS)[number];

const failures: Record<string, string[]> = {};
const checks: Record<string, number> = {};
for (const id of RULE_IDS) {
  failures[id] = [];
  checks[id] = 0;
}
const fail = (id: RuleId, text: string): void => {
  failures[id]!.push(text);
};
const check = (id: RuleId, ok: boolean, text: string): boolean => {
  checks[id]! += 1;
  if (!ok) fail(id, text);
  return ok;
};
const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};
const J = JSON.stringify;
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

// ---------------------------------------------------------------------------
// The modules, each loaded on its own, so a missing one fails its rules BY NAME
// ---------------------------------------------------------------------------

async function load(path: string, rules: readonly RuleId[], owner: string): Promise<any> {
  try {
    return await import(path);
  } catch (err) {
    for (const id of rules) {
      fail(
        id,
        `${path.replace('../../', '')} could not be loaded (${(err as Error).message.split('\n')[0]}), so this rule ` +
          `drove nothing. It is ${owner}. A gate that passed here would go green on the day the push does not exist.`
      );
    }
    return null;
  }
}

const ALL_DRIVEN: readonly RuleId[] = ['H1', 'H2', 'H3', 'J1', 'J2', 'A1', 'A2', 'A3', 'A4', 'C1', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'Y1'];
const apns = await load('../../src/main/push/apns.js', ['H1', 'H2', 'J1', 'J2', 'A4', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'], 'Builder B’s sender');
const alert = await load('../../src/main/push/alert.js', ['A1', 'A2', 'A3', 'C1'], 'Builder B’s composer');
const engineModule = await load('../../src/main/push/engine.js', ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'], 'Builder B’s engine');
const attention = await load('../../src/main/tray/attention.js', ['Y1', 'E5', 'A1'], 'Builder A’s wake rule');
const wakeMarkModule = await load('../../src/main/power/wake-mark.js', ['E5'], 'Builder B’s WakeMark');
const drivable = await load('../../src/main/power/drivable-monitor.js', ['E5'], 'Builder C’s drivable monitor');
const routesModule = await load('../../src/main/pocket/routes.js', ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'A2'], 'Builder A’s door rows');
const copy = await load('../../src/shared/push-copy.js', ['A1', 'E5'], 'Builder B’s copy');

// The one name H3 reads: every sender this file builds is built through it.
const createApnsSender: ((options: any) => any) | undefined = apns?.createApnsSender;

/**
 * THE ATTACK'S ORIGINS, and the ONLY non-loopback origins this file may name.
 * `conformance:push` rule H3 exempts this one array by name and nothing else,
 * and the fence above proves at run time that none of them was dialled.
 */
const HOSTILE_ORIGINS = Object.freeze([
  'http://10.0.0.1:1',
  'http://localhost:1',
  'https://api.push.apple.com',
  'https://api.sandbox.push.apple.com:443',
  'http://100.64.0.1:443',
  'https://127.0.0.1.nip.io:443'
]);

// ---------------------------------------------------------------------------
// The scratch world: a key, two phones, and the stand-in
// ---------------------------------------------------------------------------

const TOPIC = 'software.itavero.tortie.p314';
function scratchKey(keyId: string, teamId: string) {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    record: {
      keyId,
      teamId,
      topic: TOPIC,
      p8: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    },
    publicKey: pair.publicKey
  };
}
const KEY = scratchKey('P314KEY001', 'P314TEAM01');
const tokenA = randomBytes(32).toString('hex');
const tokenB = randomBytes(32).toString('hex');
const tokenC = randomBytes(32).toString('hex');
const digestOf = (token: string): string => sha(token);
const destination = (phoneId: string, token: string, environment: 'development' | 'production') => ({
  phoneId,
  token,
  environment,
  tokenDigest: digestOf(token)
});

const b64u = (text: string): string => Buffer.from(text, 'utf8').toString('base64url');

/** The signing input, written here from Apple's documented claim set. */
function signingInputHere(keyId: string, teamId: string, iat: number): string {
  return `${b64u(`{"alg":"ES256","kid":"${keyId}"}`)}.${b64u(`{"iss":"${teamId}","iat":${String(iat)}}`)}`;
}

/** A second verifier, WebCrypto's, over the raw 64-byte r||s. */
async function verifiesHere(authorization: string, publicKey: import('node:crypto').KeyObject): Promise<boolean> {
  const parts = authorization.split('.');
  if (parts.length !== 3) return false;
  const signature = Buffer.from(parts[2]!, 'base64url');
  if (signature.length !== 64) return false;
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const key = await webcrypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    signature,
    Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8')
  );
}

// ---------------------------------------------------------------------------
// The world an engine lives in: sessions, the door's rows, clocks, a scheduler
// ---------------------------------------------------------------------------

const PROJECT = { path: '/p/webapp', name: 'webapp' };

interface Timer {
  at: number;
  seq: number;
  fn: () => void;
  live: boolean;
}

let standIn: any = null;

class World {
  wall = 1_900_000_000_000;
  mono = 5_000_000;
  skew = 0;
  timers: Timer[] = [];
  timerSeq = 0;
  scheduled = 0;
  cancels = 0;
  sessions: any[] = [];
  since = new Map<string, number>();
  activity = new Map<string, any>();
  dests: any[];
  key: any = KEY.record;
  keyReads = 0;
  said: string[] = [];
  drops: string[] = [];
  inflight = 0;
  from: number;
  monitor: any;
  wakeMark: any;
  routes: any;
  engine: any;
  sender: any;
  dot = 'attention';
  /** While set, every send waits for it: a send IN FLIGHT, for the fix round's fall. */
  gate: Promise<void> | null = null;

  constructor(dests: any[], options: { canary?: boolean; dropPersists?: boolean } = {}) {
    this.dests = dests;
    this.from = standIn.requests.length;
    this.monitor = drivable.drivableMonitor();
    this.wakeMark = new wakeMarkModule.WakeMark(this.monitor, () => this.wall);
    const world = this;
    const facts = {
      sessions: () => world.sessions,
      projects: () => [PROJECT],
      blockedSince: () => world.since,
      wakes: () => world.wakeMark.wakes(),
      activity: (id: string) => world.activity.get(id),
      statusWord: (s: any) =>
        s.status === 'needs_input'
          ? { dot: world.dot, label: 'needs input' }
          : { dot: 'working', label: s.status === 'running' ? 'working' : String(s.status) },
      agentLabel: () => 'Claude Code',
      machineLabel: (s: any) => s.machine?.label ?? null,
      emptyLine: 'Nothing needs you',
      catchUp: async () => null,
      lastTurn: async () => ({ answerText: null, turnCount: 0 }),
      turns: async () => ({ turns: [], more: false }),
      handoff: () => null,
      now: () => world.wall
    };
    this.routes = routesModule.createPocketRoutes(facts);
    const real = createApnsSender!({
      origin: (env: 'development' | 'production') => standIn.origins[env],
      now: () => world.wall + world.skew
    });
    this.sender = {
      send: async (key: any, request: any) => {
        world.inflight += 1;
        try {
          if (world.gate !== null) await world.gate;
          return await real.send(key, request);
        } finally {
          world.inflight -= 1;
        }
      },
      close: () => real.close()
    };
    if (options.canary === true) this.dot = 'CANARYDOT';
    this.engine = engineModule.createPushEngine({
      rows: () => world.routes.blocked().rows,
      destinations: () => world.dests,
      providerKey: async () => {
        world.keyReads += 1;
        return world.key;
      },
      sender: this.sender,
      drop: (d: any) => {
        world.drops.push(d.tokenDigest);
        // A host whose sealed write failed keeps answering the dead token.
        if (options.dropPersists === false) return;
        world.dests = world.dests.filter((x) => x.tokenDigest !== d.tokenDigest);
      },
      wake: this.wakeMark,
      now: () => world.wall + world.skew,
      monotonic: () => world.mono,
      schedule: (fn: () => void, ms: number) => {
        world.scheduled += 1;
        const timer: Timer = { at: world.mono + ms, seq: world.timerSeq++, fn, live: true };
        world.timers.push(timer);
        return () => {
          if (timer.live) world.cancels += 1;
          timer.live = false;
        };
      },
      say: (id: string) => {
        world.said.push(id);
      }
    });
  }

  session(id: string, status: string, extra: Record<string, unknown> = {}) {
    const existing = this.sessions.find((s) => s.id === id);
    if (existing !== undefined) {
      existing.status = status;
      Object.assign(existing, extra);
      return existing;
    }
    const s = { id, name: id, projectPath: PROJECT.path, agent: 'claude', status, createdAt: 0, ...extra };
    this.sessions.push(s);
    return s;
  }

  /** One poll: the stamps move, then the engine looks. */
  tick(): void {
    this.since = attention.blockedSince(this.since, this.sessions, this.wall);
    this.engine.observe();
  }

  set(changes: Record<string, string>): void {
    for (const [id, status] of Object.entries(changes)) this.session(id, status);
    this.tick();
  }

  requests(): any[] {
    return standIn.requests.slice(this.from);
  }

  async settle(): Promise<void> {
    for (let round = 0; round < 400; round += 1) {
      await new Promise((r) => setImmediate(r));
      if (this.inflight === 0) {
        let stable = true;
        for (let i = 0; i < 6; i += 1) {
          await new Promise((r) => setImmediate(r));
          if (this.inflight !== 0) {
            stable = false;
            break;
          }
        }
        if (stable) return;
      } else {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
  }

  /** Move both clocks to `mono + ms`, firing every due timer in order. */
  async advance(ms: number): Promise<void> {
    const target = this.mono + ms;
    for (;;) {
      const due = this.timers
        .filter((t) => t.live && t.at <= target)
        .sort((a, b) => a.at - b.at || a.seq - b.seq)[0];
      if (due === undefined) break;
      this.wall += due.at - this.mono;
      this.mono = due.at;
      due.live = false;
      due.fn();
      await this.settle();
    }
    this.wall += target - this.mono;
    this.mono = target;
    await this.settle();
  }

  /** Fire what is due NOW without moving the clocks. */
  async fireDue(): Promise<void> {
    await this.advance(0);
  }

  /** Move the clocks without firing anything. */
  jump(ms: number): void {
    this.wall += ms;
    this.mono += ms;
  }

  liveTimers(): number {
    return this.timers.filter((t) => t.live).length;
  }

  /** Hold every send until the answer returned is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.gate = new Promise<void>((resolve) => {
      release = () => {
        this.gate = null;
        resolve();
      };
    });
    return release;
  }

  /** Fire the earliest live timer WITHOUT waiting for what it starts. */
  fireNextNoWait(): void {
    const due = this.timers.filter((t) => t.live).sort((a, b) => a.at - b.at || a.seq - b.seq)[0];
    if (due === undefined) return;
    this.wall += due.at - this.mono;
    this.mono = due.at;
    due.live = false;
    due.fn();
  }

  async close(): Promise<void> {
    try {
      this.engine.beginShutdown();
    } catch {
      /* the rule that owns it says so */
    }
    await this.sender.close().catch(() => undefined);
  }
}

const tokenOf = (req: any): string | null => req.token;
const toToken = (reqs: any[], token: string): any[] => reqs.filter((r) => tokenOf(r) === token);
const bodyOf = (req: any): any => {
  try {
    return JSON.parse(req.body);
  } catch {
    return null;
  }
};

/** The alert shapes' KEYS, in order, and nothing else. */
function keysOk(payload: string): string | null {
  let p: any;
  try {
    p = JSON.parse(payload);
  } catch {
    return 'does not parse';
  }
  const keys = (o: any): string => Object.keys(o ?? {}).join(',');
  if (keys(p) === 'aps' && keys(p.aps) === 'badge') {
    return Number.isInteger(p.aps.badge) && p.aps.badge >= 0 ? null : 'a badge that is not a count';
  }
  if (keys(p) !== 'aps,tortie') return `top-level keys ${keys(p)}`;
  if (keys(p.aps) !== 'alert,badge,sound,thread-id') return `aps keys ${keys(p.aps)}`;
  if (keys(p.aps.alert) !== 'title,body') return `alert keys ${keys(p.aps.alert)}`;
  if (p.aps.sound !== 'default') return 'sound is not "default"';
  if (!Number.isInteger(p.aps.badge) || p.aps.badge < 0) return 'a badge that is not a count';
  const t = keys(p.tortie);
  if (t !== 'v,session' && t !== 'v') return `tortie keys ${t}`;
  if (p.tortie.v !== 1) return 'tortie.v is not 1';
  return null;
}

// ---------------------------------------------------------------------------
// The scenarios
// ---------------------------------------------------------------------------

const EXPECTED_SINGLE = (id: string, name: string, badge: number, project = 'webapp'): string =>
  `{"aps":{"alert":{"title":"${name} needs input","body":"${project} · Claude Code"},"badge":${String(badge)},"sound":"default","thread-id":"${id}"},"tortie":{"v":1,"session":"${id}"}}`;
const EXPECTED_COUNT = (body: string, badge: number): string =>
  `{"aps":{"alert":{"title":"Needs your input (${String(badge)})","body":"${body}"},"badge":${String(badge)},"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}`;
const EXPECTED_BADGE = (badge: number): string => `{"aps":{"badge":${String(badge)}}}`;

const UUID1 = '11111111-2222-4333-8444-555555555555';

function row(over: Record<string, unknown>): any {
  return {
    sessionId: UUID1,
    name: 'fix-login',
    project: 'webapp',
    machine: null,
    agent: 'claude',
    agentLabel: 'Claude Code',
    statusLabel: 'needs input',
    statusDot: 'attention',
    question: null,
    choices: [],
    blockedSince: 1,
    seenAtWake: false,
    ...over
  };
}

/** H1 and H2: the hosts, and the sender's refusals before any socket. */
async function hostsAndRefusals(): Promise<void> {
  if (apns === null) return;
  const origin = (env: string): URL | null => {
    try {
      return new URL(apns.apnsOrigin(env));
    } catch {
      return null;
    }
  };
  const prod = origin('production');
  const dev = origin('development');
  check('H1', prod?.hostname === 'api.push.apple.com' && prod.protocol === 'https:' && (prod.port === '' || prod.port === '443'),
    `apnsOrigin('production') answered ${J(prod?.href ?? null)}, not Apple's production origin over https`);
  check('H1', dev?.hostname === 'api.sandbox.push.apple.com' && dev.protocol === 'https:' && (dev.port === '' || dev.port === '443'),
    `apnsOrigin('development') answered ${J(dev?.href ?? null)}, not Apple's sandbox origin over https`);

  const before = { ...standIn.connections };
  const reqBefore = standIn.requests.length;
  const hitsBefore = fenceHits.length;
  for (const hostile of HOSTILE_ORIGINS) {
    const sender = createApnsSender!({ origin: () => hostile });
    let answer: any = null;
    try {
      answer = await sender.send(KEY.record, {
        token: tokenA,
        environment: 'production',
        topic: TOPIC,
        payload: EXPECTED_BADGE(0),
        priority: 5,
        expiration: 0,
        collapseId: null
      });
    } catch (err) {
      answer = { threw: (err as Error).message };
    }
    await sender.close().catch(() => undefined);
    check('H2', answer !== null && answer.ok === false && answer.threw === undefined,
      `a sender aimed at ${hostile} without allowRemote answered ${J(answer)}; it must answer a refusal, not throw and not succeed`);
    check('H2', fenceHits.length === hitsBefore,
      `a sender aimed at ${hostile} DIALLED it (${J(fenceHits.slice(hitsBefore))}); the refusal must come before any socket. The fence stopped it.`);
  }
  check('H2', standIn.connections.development === before.development && standIn.connections.production === before.production && standIn.requests.length === reqBefore,
    'the stand-in’s connection count moved while only hostile origins were asked');

  // And the honest arm, so a sender that refuses EVERYTHING is not a pass.
  const honest = createApnsSender!({ origin: (env: string) => standIn.origins[env] });
  const ok = await honest.send(KEY.record, {
    token: tokenA, environment: 'development', topic: TOPIC, payload: EXPECTED_BADGE(0), priority: 5, expiration: 0, collapseId: null
  });
  await honest.close();
  check('H2', ok?.ok === true, `a sender aimed at the loopback stand-in answered ${J(ok)}; the honest arm must succeed`);
}

/** J1 and J2: the provider token. */
async function providerToken(): Promise<void> {
  if (apns === null) return;
  let clock = 1_900_000_000_000;
  const sender = createApnsSender!({ origin: (env: string) => standIn.origins[env], now: () => clock });
  const from = standIn.requests.length;
  const send = (key = KEY.record, token = tokenA) =>
    sender.send(key, { token, environment: 'development', topic: TOPIC, payload: EXPECTED_BADGE(1), priority: 5, expiration: 0, collapseId: null });
  const last = (): any => standIn.requests[standIn.requests.length - 1];
  try {
    // J1, the bytes.
    const iat0 = Math.floor(clock / 1000);
    check('J1', apns.providerTokenSigningInput('P314KEY001', 'P314TEAM01', iat0) === signingInputHere('P314KEY001', 'P314TEAM01', iat0),
      'providerTokenSigningInput is not Apple’s header and claim set, base64url with no padding, joined by a dot (SPEC §2.6)');
    const first = await send();
    check('J1', first?.ok === true, `the first send answered ${J(first)}`);
    const rec = last();
    const auth: string = rec?.authorization ?? '';
    const parts = auth.split('.');
    check('J1', parts.length === 3 && !auth.includes('='), 'the provider token is not three base64url segments with no padding');
    check('J1', `${parts[0]}.${parts[1]}` === signingInputHere('P314KEY001', 'P314TEAM01', iat0),
      `the provider token’s signing input is not SPEC §2.6’s, byte for byte, for iat ${String(iat0)} (sha256 ${sha(`${parts[0]}.${parts[1]}`).slice(0, 12)})`);
    check('J1', Buffer.from(parts[1] ?? '', 'base64url').toString('utf8') === `{"iss":"P314TEAM01","iat":${String(iat0)}}`,
      'the claims are not exactly {"iss":<team>,"iat":<whole seconds of the wall clock>}');
    check('J1', rec?.jwt?.signatureBytes === 64, `the signature is ${String(rec?.jwt?.signatureBytes)} bytes, not the 64-byte ieee-p1363 r||s`);
    check('J1', rec?.jwt?.verifies === true && (await verifiesHere(auth, KEY.publicKey)),
      'the signature does not verify under the scratch PUBLIC key, by node’s verifier and WebCrypto’s');
    check('J1', rec?.headerNames?.includes('authorization') && /^bearer /.test(`bearer ${auth}`), 'no bearer authorization');

    // J2, reuse.
    const digest0 = rec?.authorizationDigest;
    clock += 49 * 60_000;
    await send();
    check('J2', last()?.authorizationDigest === digest0, 'a token 49 minutes old was re-minted; it must be reused under 50 minutes');
    clock += 60_000;
    await send();
    const digest50 = last()?.authorizationDigest;
    check('J2', digest50 !== digest0 && last()?.jwt?.claims?.iat === Math.floor(clock / 1000),
      'a token 50 minutes old was not re-minted with the wall clock’s whole seconds');
    // The clock moves BACKWARDS: reuse, never re-mint.
    clock -= 2 * 3_600_000;
    await send();
    check('J2', last()?.authorizationDigest === digest50,
      'the wall clock moved back two hours and the token was RE-MINTED; a negative age reuses (SPEC §2.6), or Apple answers TooManyProviderTokenUpdates');
    // ExpiredProviderToken once: one re-mint, one retry.
    let n = standIn.requests.length;
    standIn.script(tokenA, { status: 403, reason: 'ExpiredProviderToken' });
    const retried = await send();
    const two = standIn.requests.slice(n);
    check('J2', two.length === 2 && retried?.ok === true,
      `one ExpiredProviderToken cost ${String(two.length)} request(s) and answered ${J(retried)}; it must cost exactly one re-mint and one retry`);
    check('J2', two.length === 2 && two[0].authorizationDigest !== two[1].authorizationDigest,
      'the retry after ExpiredProviderToken carried the SAME token; it must be re-minted');
    // Twice: never a third attempt.
    n = standIn.requests.length;
    standIn.script(tokenA, { status: 403, reason: 'ExpiredProviderToken' }, { status: 403, reason: 'ExpiredProviderToken' });
    const twice = await send();
    await new Promise((r) => setTimeout(r, 150));
    check('J2', standIn.requests.length - n === 2 && twice?.ok === false,
      `two ExpiredProviderToken answers cost ${String(standIn.requests.length - n)} request(s); there is never a third attempt`);
    standIn.clearScripts();
    // A different key re-mints.
    const d = last()?.authorizationDigest;
    await send({ ...KEY.record, keyId: 'P314KEY002' });
    check('J2', last()?.authorizationDigest !== d && last()?.jwt?.header?.kid === 'P314KEY002',
      'a different key record reused the old key’s token; the cache must be keyed by the whole record');
    void from;
  } finally {
    standIn.clearScripts();
    await sender.close().catch(() => undefined);
  }
}

/** A1, A3: the composer, directly. */
function composer(): void {
  if (alert === null) return;
  const plan = (announce: any[], count: number) => alert.composeAlert({ announce, blockedCount: count });
  const single = plan([row({})], 3);
  check('A1', single.kind === 'single' && single.payload === EXPECTED_SINGLE(UUID1, 'fix-login', 3),
    `the single shape is not SPEC §2.3’s bytes: got ${String(single.payload).slice(0, 200)}`);
  check('A1', single.priority === 10 && single.collapseId === UUID1 && single.ttlSeconds === 3600,
    `the single plan is priority ${String(single.priority)}, collapse ${J(single.collapseId)}, ttl ${String(single.ttlSeconds)}`);
  const w = ['w3', 'w2', 'w1'].map((name, i) => row({ sessionId: `wake-${String(i)}`, name, seenAtWake: true }));
  const wake = plan(w, 3);
  check('A1', wake.kind === 'count' && wake.payload === EXPECTED_COUNT('Seen when your Mac woke · w3 · w2 · w1', 3),
    `the wake count shape is not SPEC §2.3’s bytes: got ${String(wake.payload).slice(0, 200)}`);
  check('A1', wake.collapseId === 'tortie-waiting' && wake.priority === 10 && wake.ttlSeconds === 3600,
    `the count plan is collapse ${J(wake.collapseId)}, priority ${String(wake.priority)}`);
  const plain = plan([row({ sessionId: 'a', name: 'a' }), row({ sessionId: 'b', name: 'b' })], 5);
  check('A1', plain.payload === EXPECTED_COUNT('a · b', 5), `the plain count shape: got ${String(plain.payload).slice(0, 200)}`);
  // THE FIX ROUND: the lead says every name after it was first seen at the
  // wake, so a batch that holds a row with its true stamp does not say it.
  const mixed = plan([
    row({ sessionId: 'w3', name: 'w3', seenAtWake: true }),
    row({ sessionId: 'w2', name: 'w2', seenAtWake: true }),
    row({ sessionId: 'p1', name: 'p1', seenAtWake: false })
  ], 3);
  check('A1', mixed.kind === 'count' && mixed.payload === EXPECTED_COUNT('w3 · w2 · p1', 3),
    `a count alert holding a row NOT first seen at the wake must not lead with "Seen when your Mac woke", which would be false of it: got ${String(mixed.payload).slice(0, 200)}`);
  // ONE row first seen at a wake is still a count alert that says the wake.
  const solo = plan([row({ sessionId: 's', name: 'solo', seenAtWake: true })], 1);
  check('A1', solo.kind === 'count' && solo.payload === EXPECTED_COUNT('Seen when your Mac woke · solo', 1),
    `one row seen at a wake must be the count shape with the wake said (SPEC §2.2): got ${solo.kind} ${String(solo.payload).slice(0, 160)}`);
  const badge = alert.composeBadge(0);
  check('A1', badge.kind === 'badge' && badge.payload === EXPECTED_BADGE(0) && badge.priority === 5 && badge.collapseId === null && badge.ttlSeconds === 0,
    `the badge shape is not {"aps":{"badge":0}} at priority 5, no collapse id, ttl 0: got ${J(badge)}`);
  const empty = plan([], 2);
  check('A1', empty.kind === 'badge' && empty.payload === EXPECTED_BADGE(2), 'nothing announced must compose the badge shape');
  for (const p of [single, wake, plain, solo, badge]) {
    const why = keysOk(p.payload);
    check('A1', why === null, `a composed payload failed the key allowlist: ${String(why)}`);
    check('A1', Buffer.byteLength(p.payload, 'utf8') <= 4096, 'a composed payload is over 4096 bytes');
  }
  // A machine, when there is one (never in this phase, SPEC §1.2 row 12).
  const remote = plan([row({ machine: 'studio' })], 1);
  check('A1', bodyOfPayload(remote.payload)?.aps?.alert?.body === 'webapp · Claude Code · studio',
    'a non-null machine is drawn as the third segment of the single body');

  // A3, the ceiling.
  const EMOJI = '😀';
  const CJK = '界';
  const longName = (EMOJI + CJK + 'a').repeat(2500).slice(0, 10_000);
  const clipSingle = (name: string, project = 'webapp'): string => {
    const points = Array.from(name);
    const render = (k: number): string =>
      EXPECTED_SINGLE(UUID1, JSON.stringify(points.slice(0, k).join('') + '…').slice(1, -1), 1, project);
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (Buffer.byteLength(render(mid), 'utf8') <= 4096) lo = mid;
      else hi = mid - 1;
    }
    return render(lo);
  };
  const huge = plan([row({ name: longName })], 1);
  const bytes = Buffer.byteLength(huge.payload, 'utf8');
  check('A3', bytes <= 4096, `a 10,000-unit name composed ${String(bytes)} bytes; Apple’s ceiling is 4096`);
  check('A3', huge.payload === clipSingle(longName),
    'the clipped single payload is not SPEC §2.4 step 2’s: the longest whole-code-point prefix of the name plus … that fits');
  check('A3', huge.payload === plan([row({ name: longName })], 1).payload, 'the clip is not deterministic');
  check('A3', Buffer.from(huge.payload, 'utf8').toString('utf8') === huge.payload && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(huge.payload),
    'the clipped payload holds a lone surrogate or is not valid UTF-8');
  check('A3', bodyOfPayload(huge.payload) !== null, 'the clipped payload does not parse');
  // The count shape drops names from the end and says so once.
  const many = Array.from({ length: 400 }, (_, i) => row({ sessionId: `m${String(i)}`, name: `session-${String(i).padStart(3, '0')}-${CJK.repeat(6)}` }));
  const count = plan(many, 400);
  const cBytes = Buffer.byteLength(count.payload, 'utf8');
  check('A3', cBytes <= 4096, `four hundred names composed ${String(cBytes)} bytes`);
  const names = many.map((r) => r.name as string);
  let expected = '';
  for (let kept = names.length - 1; kept >= 1; kept -= 1) {
    const candidate = EXPECTED_COUNT(`${names.slice(0, kept).join(' · ')} · …`, 400);
    if (Buffer.byteLength(candidate, 'utf8') <= 4096) {
      expected = candidate;
      break;
    }
  }
  check('A3', count.payload === expected,
    'the clipped count payload is not SPEC §2.4 step 3’s: names dropped from the END one at a time and ` · …` once after the last kept');
  // A project too long for even an empty name: the project is clipped next.
  const both = plan([row({ name: longName, project: longName })], 1);
  check('A3', Buffer.byteLength(both.payload, 'utf8') <= 4096 && bodyOfPayload(both.payload)?.aps?.alert?.title === '… needs input',
    'a name AND a project each of 10,000 units: the name must go to … and the project be clipped next (SPEC §2.4 step 2)');
}

function bodyOfPayload(payload: string): any {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Y1: the one age function, both edges. */
function ageFunction(): void {
  if (attention === null) return;
  const w = { suspendedAt: 1000, resumedAt: 100_000 };
  const age = (stamp: number, wakes: any[] = [w]) => attention.blockedAge(stamp, wakes);
  check('Y1', attention.WAKE_WINDOW_MS === 15_000, `WAKE_WINDOW_MS is ${String(attention.WAKE_WINDOW_MS)}, not SPEC §3.1’s 15,000`);
  check('Y1', age(100_000).seenAtWake === true, 'a row first seen AT the resume is not seenAtWake');
  check('Y1', age(115_000).seenAtWake === true, 'a row first seen at resume + 15,000 is not seenAtWake; the window is inclusive');
  check('Y1', age(115_001).seenAtWake === false, 'a row first seen at resume + 15,001 reads seenAtWake');
  check('Y1', age(99_999).seenAtWake === false, 'a row stamped before the resume reads seenAtWake; its stamp is true');
  check('Y1', age(100_500, []).seenAtWake === false, 'with no wake at all a row reads seenAtWake');
  check('Y1', age(500_000, [w, { suspendedAt: null, resumedAt: 490_000 }]).seenAtWake === true, 'any wake in the list counts');
  check('Y1', age(123_456).since === 123_456, 'since is not the stamp');
}

// ---------------------------------------------------------------------------
// The engine, in worlds
// ---------------------------------------------------------------------------

const A = () => destination('A', tokenA, 'development');
const B = () => destination('B', tokenB, 'production');

/** Every badge-only request to one token is BELOW the badge before it. */
function badgeNeverRisesAlone(world: World, label: string): void {
  for (const token of [tokenA, tokenB, tokenC]) {
    let lastBadge: number | null = null;
    for (const r of toToken(world.requests(), token)) {
      const p = bodyOf(r);
      if (p === null) continue;
      const alertShape = p.aps?.alert !== undefined;
      const badge = p.aps?.badge;
      if (!alertShape) {
        check('E1', lastBadge !== null && badge < lastBadge,
          `${label}: a badge-only request carried ${String(badge)} after ${String(lastBadge)}; a badge rises only inside an alert`);
      }
      if (r.status === 200) lastBadge = badge;
    }
  }
}

/** Every payload any world sent passes the key allowlist and the ceiling. */
function everyPayload(world: World, label: string): void {
  for (const r of world.requests()) {
    const why = keysOk(r.body);
    check('A1', why === null, `${label}: a payload the engine sent failed the allowlist: ${String(why)}`);
    check('A1', r.bodyBytes <= 4096, `${label}: a payload the engine sent is ${String(r.bodyBytes)} bytes`);
  }
}

async function scenario(name: string, rules: readonly RuleId[], body: () => Promise<void>): Promise<void> {
  try {
    await body();
    say(`  ran ${name}`);
  } catch (err) {
    for (const id of rules) fail(id, `${name} threw: ${(err as Error).stack?.split('\n').slice(0, 3).join(' / ') ?? String(err)}`);
  }
}

async function engineRules(): Promise<void> {
  if (engineModule === null || routesModule === null || attention === null || createApnsSender === undefined) return;
  const COALESCE = engineModule.COALESCE_MS as number;
  const FLOOR = engineModule.ALERT_FLOOR_MS as number;
  const RETRY = engineModule.RETRY_AFTER_MS as number;
  check('E3', COALESCE === 4_000 && FLOOR === 30_000, `COALESCE_MS ${String(COALESCE)} and ALERT_FLOOR_MS ${String(FLOOR)} are not SPEC §3.5’s 4,000 and 30,000`);
  check('E7', RETRY === 15_000, `RETRY_AFTER_MS is ${String(RETRY)}, not SPEC §2.7’s 15,000`);

  // ---- E6: the first observe seeds silently -------------------------------
  await scenario('E6 launch with rows already blocked', ['E6'], async () => {
    const world = new World([A(), B()]);
    try {
      world.set({ x1: 'needs_input', x2: 'needs_input', x3: 'needs_input' });
      await world.advance(5 * 60_000);
      world.tick();
      await world.advance(5 * 60_000);
      check('E6', world.requests().length === 0,
        `launching with three rows already blocked sent ${String(world.requests().length)} request(s); the first observe seeds silently`);
      world.set({ x4: 'needs_input' });
      await world.advance(60_000);
      const reqs = world.requests();
      check('E6', reqs.length === 2 && reqs.every((r) => r.body === EXPECTED_SINGLE('x4', 'x4', 4)),
        `a row joining after the seed must go out alone with the seeded rows in its badge: ${J(reqs.map((r) => r.body.slice(0, 90)))}`);
      badgeNeverRisesAlone(world, 'E6');
    } finally {
      await world.close();
    }
  });

  // ---- E1: nothing for working or idle -----------------------------------
  await scenario('E1 working and idle', ['E1'], async () => {
    const world = new World([A(), B()]);
    try {
      world.set({ busy: 'idle', calm: 'running' });
      for (let i = 0; i < 6; i += 1) {
        world.set({ busy: i % 2 === 0 ? 'running' : 'idle', calm: i % 2 === 0 ? 'idle' : 'running' });
        await world.advance(20_000);
      }
      await world.advance(5 * 60_000);
      check('E1', world.requests().length === 0,
        `sessions moving between working and idle sent ${String(world.requests().length)} request(s); nothing rises for working or idle, ever`);
      check('E1', world.keyReads === 0 && world.scheduled === 0,
        `working and idle read the key ${String(world.keyReads)} time(s) and armed ${String(world.scheduled)} timer(s)`);
    } finally {
      await world.close();
    }
  });

  // ---- E2: nothing for a row on another machine --------------------------
  await scenario('E2 a remote row forced to needs_input', ['E2'], async () => {
    const world = new World([A(), B()]);
    try {
      world.tick();
      world.session('far', 'needs_input', { machine: { id: 'studio', label: 'studio' } });
      world.tick();
      await world.advance(2 * 60_000);
      check('E2', world.requests().length === 0,
        `a remote row forced to needs_input sent ${String(world.requests().length)} request(s); it is never announced`);
      world.set({ near: 'needs_input' });
      await world.advance(60_000);
      const reqs = world.requests();
      check('E2', reqs.length === 2 && reqs.every((r) => r.body === EXPECTED_SINGLE('near', 'near', 1)),
        `a local row beside a remote one must be a single alert with badge 1, never 2: ${J(reqs.map((r) => r.body.slice(0, 120)))}`);
    } finally {
      await world.close();
    }
  });

  // ---- E3: twenty at once, the floor, a join-and-leave, a fall -----------
  await scenario('E3 twenty rows, the floor, a join and leave, a fall', ['E3', 'E1'], async () => {
    const world = new World([A(), B()]);
    try {
      world.tick();
      const twenty: Record<string, string> = {};
      for (let i = 1; i <= 10; i += 1) twenty[`t${String(i).padStart(2, '0')}`] = 'needs_input';
      world.set(twenty);
      await world.advance(1_000);
      const more: Record<string, string> = {};
      for (let i = 11; i <= 20; i += 1) more[`t${String(i).padStart(2, '0')}`] = 'needs_input';
      world.set(more);
      // The window the FIRST join opened closes COALESCE after it.
      await world.advance(COALESCE - 1_000);
      let reqs = world.requests();
      check('E3', reqs.length === 2 && toToken(reqs, tokenA).length === 1 && toToken(reqs, tokenB).length === 1,
        `twenty rows flipping inside one window sent ${String(reqs.length)} request(s); it must be ONE per destination`);
      const p = bodyOf(reqs[0] ?? {});
      check('E3', p?.aps?.alert?.title === 'Needs your input (20)' && p?.aps?.badge === 20,
        `the twenty alert’s title is ${J(p?.aps?.alert?.title)} with badge ${String(p?.aps?.badge)}`);
      const sentAt = world.mono;
      // The floor: a join 5 s after the send waits for sentAt + 30 s.
      await world.advance(5_000);
      world.set({ x: 'needs_input' });
      const floorAt = sentAt + FLOOR;
      await world.advance(floorAt - world.mono - 1);
      check('E3', world.requests().length === 2, 'a join 5 s after a send went out before the 30 s floor');
      await world.advance(1);
      reqs = world.requests();
      check('E3', reqs.length === 4 && reqs.slice(2).every((r) => r.body === EXPECTED_SINGLE('x', 'x', 21)),
        `the join after the floor must go out alone at sentAt + 30 s: ${J(reqs.slice(2).map((r) => r.body.slice(0, 100)))}`);
      // A join and leave inside one window is not announced, and says nothing.
      await world.advance(10_000);
      world.set({ y: 'needs_input' });
      await world.advance(1_000);
      world.set({ y: 'idle' });
      await world.advance(2 * 60_000);
      check('E3', world.requests().length === 4,
        `a row that joined and left inside the window sent ${String(world.requests().length - 4)} request(s)`);
      // A fall below the last badge: badge-only, priority 5, expiration 0.
      world.set({ t01: 'idle', t02: 'idle', t03: 'idle', t04: 'idle', t05: 'idle' });
      await world.advance(2 * 60_000);
      reqs = world.requests().slice(4);
      check('E3', reqs.length === 2 && reqs.every((r) => r.body === EXPECTED_BADGE(16)),
        `five rows clearing must send one badge-only 16 per destination: ${J(reqs.map((r) => r.body))}`);
      check('E3', reqs.every((r) => r.headers['apns-priority'] === '5' && r.headers['apns-expiration'] === '0' && r.headers['apns-collapse-id'] === null),
        'the badge-only fall is not priority 5, expiration 0, with no collapse id');
      badgeNeverRisesAlone(world, 'E3');
      everyPayload(world, 'E3');
    } finally {
      await world.close();
    }
  });

  // THE FIX ROUND: a row that leaves while its alert is in flight. The fall
  // was judged against the badge before the send, and the send then recorded
  // the higher badge, so the phone kept a badge above the count.
  await scenario('E3 a row leaves while its alert is in flight', ['E3'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ fa: 'needs_input', fb: 'needs_input' });
      const release = world.hold();
      world.jump(COALESCE);
      world.fireNextNoWait();
      await new Promise((r) => setTimeout(r, 20));
      world.set({ fb: 'idle' });
      release();
      await world.settle();
      await world.advance(2 * 60_000);
      const reqs = toToken(world.requests(), tokenA);
      const last = reqs[reqs.length - 1];
      check('E3', reqs.length === 2 && bodyOf(reqs[0] ?? {})?.aps?.badge === 2 && last?.body === EXPECTED_BADGE(1),
        `a row answered while its alert was in flight must be followed by one badge-only 1, so the phone’s badge is the blocked count: ${J(reqs.map((r) => r.body.slice(0, 90)))}`);
      await world.advance(10 * 60_000);
      check('E3', toToken(world.requests(), tokenA).length === 2, 'the correction was sent more than once');
    } finally {
      world.gate = null;
      await world.close();
    }
  });

  // ---- E4: block, clear, block again -------------------------------------
  await scenario('E4 block, clear, block again', ['E4', 'A4'], async () => {
    const world = new World([A(), B()]);
    try {
      world.tick();
      world.set({ [UUID1]: 'needs_input' });
      const wallAtFlush = world.wall + COALESCE;
      await world.advance(COALESCE);
      const first = world.requests();
      world.set({ [UUID1]: 'idle' });
      await world.advance(2 * 60_000);
      const fall = world.requests().slice(first.length);
      world.set({ [UUID1]: 'needs_input' });
      await world.advance(2 * 60_000);
      const again = world.requests().slice(first.length + fall.length);
      check('E4', first.length === 2 && again.length === 2, `the first block sent ${String(first.length)} and the second ${String(again.length)} request(s); each must be one per destination`);
      check('E4', fall.length === 2 && fall.every((r) => r.body === EXPECTED_BADGE(0) && r.headers['apns-priority'] === '5' && r.headers['apns-expiration'] === '0'),
        `the clear between must be one badge-only 0 per destination at priority 5, expiration 0: ${J(fall.map((r) => r.body))}`);
      for (const [a, b] of [[first[0], again.find((r) => r.token === first[0]?.token)], [first[1], again.find((r) => r.token === first[1]?.token)]]) {
        check('E4', a?.headers['apns-collapse-id'] === UUID1 && b?.headers['apns-collapse-id'] === UUID1,
          `a re-block must carry the SAME apns-collapse-id, the session id, so it replaces its own card: ${J(a?.headers['apns-collapse-id'])} then ${J(b?.headers['apns-collapse-id'])}`);
        check('E4', bodyOf(a ?? {})?.aps?.['thread-id'] === UUID1 && bodyOf(b ?? {})?.aps?.['thread-id'] === UUID1,
          'a re-block must carry the SAME thread-id, the session id');
      }
      // A4, the headers of an alert and a badge, from the engine's own sends.
      for (const r of first) {
        check('A4', r.method === 'POST' && r.path === `/3/device/${r.token}` && /^[0-9a-f]+$/.test(r.token ?? ''),
          `an alert’s method and path are ${r.method} ${J(r.path)}`);
        check('A4', r.authorization !== null, 'an alert carried no bearer authorization');
        check('A4', r.headers['apns-topic'] === TOPIC && r.headers['apns-push-type'] === 'alert' && r.headers['apns-priority'] === '10',
          `an alert’s topic, push type and priority are ${J([r.headers['apns-topic'], r.headers['apns-push-type'], r.headers['apns-priority']])}`);
        check('A4', r.headers['apns-expiration'] === String(Math.floor(wallAtFlush / 1000) + 3600),
          `an alert’s apns-expiration is ${J(r.headers['apns-expiration'])}, not the flush’s whole seconds plus 3600`);
        check('A4', r.headers['apns-id'] === null, 'an alert set apns-id; Apple makes one when it is omitted');
        const unknown = (r.headerNames as string[]).filter((n) => /^apns-/.test(n) && !['apns-topic', 'apns-push-type', 'apns-priority', 'apns-expiration', 'apns-collapse-id'].includes(n));
        check('A4', unknown.length === 0, `an alert carried headers SPEC §2.5 does not name: ${J(unknown)}`);
      }
      for (const r of fall) {
        check('A4', r.headers['apns-push-type'] === 'alert' && r.headers['apns-collapse-id'] === null && !(r.headerNames as string[]).includes('apns-collapse-id'),
          'a badge-only send carried a collapse id or a push type that is not alert');
      }
      badgeNeverRisesAlone(world, 'E4');
      everyPayload(world, 'E4');
    } finally {
      await world.close();
    }
  });

  // ---- E5: THE WAKE, the pending fold, the eight-hour re-mint -------------
  await scenario('E5 the wake', ['E5', 'Y1'], async () => {
    const world = new World([A(), B()]);
    try {
      world.tick();
      world.set({ s0: 'needs_input' });
      await world.advance(COALESCE);
      const before = world.requests();
      const iat0 = before[0]?.jwt?.claims?.iat ?? 0;
      // A minute on, so the 30 s floor does not bind at the wake and the
      // window's own suppression is the only thing holding the joins back.
      await world.advance(60_000);
      world.monitor.fire('suspend');
      await world.settle();
      // EIGHT HOURS. The monotonic clock does not advance across a sleep on
      // macOS; the wall clock does.
      world.wall += 8 * 3_600_000;
      world.monitor.fire('resume');
      const resumedAt = world.wall;
      await world.settle();
      const atResume = world.requests().length;
      for (const [i, id] of ['w1', 'w2', 'w3'].entries()) {
        await world.advance(1_000);
        world.set({ [id]: 'needs_input' });
        void i;
      }
      await world.advance(15_000 - 3_000 - 1);
      check('E5', world.requests().length === atResume,
        `the wake window let ${String(world.requests().length - atResume)} request(s) out before it closed; every join inside it is suppressed`);
      await world.advance(1);
      const wake = world.requests().slice(atResume);
      check('E5', wake.length === 2 && toToken(wake, tokenA).length === 1 && toToken(wake, tokenB).length === 1,
        `THE WAKE sent ${String(wake.length)} request(s); it must be ONE per destination`);
      check('E5', wake.every((r) => r.body === EXPECTED_COUNT('Seen when your Mac woke · w3 · w2 · w1', 4)),
        `the wake alert is not the count shape saying the wake, the three wake rows newest first: ${J(wake.map((r) => r.body.slice(0, 200)))}`);
      const iat1 = wake[0]?.jwt?.claims?.iat ?? 0;
      check('E5', iat1 - iat0 >= 8 * 3600, `the provider token was not re-minted across the eight-hour sleep (iat moved ${String(iat1 - iat0)} s)`);
      const rows = world.routes.blocked().rows as any[];
      const seen = Object.fromEntries(rows.map((r) => [r.name, r.seenAtWake]));
      check('E5', seen['w1'] === true && seen['w2'] === true && seen['w3'] === true && seen['s0'] === false,
        `the door’s rows read ${J(seen)}; w1..w3 were first seen when the Mac woke and s0 was not`);
      check('Y1', rows.every((r) => r.seenAtWake === attention.blockedAge(r.blockedSince, world.wakeMark.wakes()).seenAtWake),
        'a door row’s seenAtWake is not blockedAge’s answer for its own stamp');
      check('E5', world.wakeMark.wakes().some((w: any) => w.resumedAt === resumedAt), 'WakeMark did not record the resume');
      badgeNeverRisesAlone(world, 'E5');
      everyPayload(world, 'E5');
    } finally {
      await world.close();
    }
  });

  // W-pending: a row that joined two seconds before the suspend folds into the
  // wake's ONE alert with its true stamp, and so the alert does not say the
  // wake, which would be false of it (the fix round; SPEC §1.2 row 11).
  await scenario('E5 a row pending from before the suspend', ['E5'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ p: 'needs_input' });
      await world.advance(2_000);
      world.monitor.fire('suspend');
      await world.settle();
      world.wall += 8 * 3_600_000;
      world.monitor.fire('resume');
      await world.settle();
      await world.advance(1_000);
      world.set({ w1: 'needs_input' });
      await world.advance(15_000 - 1_000);
      const reqs = world.requests();
      check('E5', reqs.length === 1 && reqs[0]?.body === EXPECTED_COUNT('w1 · p', 2),
        `the pending row must fold into the ONE wake alert, and the alert must not lead with the wake, which p was not seen at: ${J(reqs.map((r) => r.body.slice(0, 200)))}`);
      const seen = Object.fromEntries((world.routes.blocked().rows as any[]).map((r) => [r.name, r.seenAtWake]));
      check('E5', seen['w1'] === true && seen['p'] === false, `the door reads ${J(seen)}; w1 was first seen at the wake and p was not`);
    } finally {
      await world.close();
    }
  });

  await scenario('E5 the window’s two edges', ['E5'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.monitor.fire('suspend');
      world.wall += 3_600_000;
      world.monitor.fire('resume');
      await world.settle();
      // Exactly resume + 15,000: in the wake alert, seen at the wake.
      world.jump(15_000);
      world.set({ e1: 'needs_input' });
      await world.fireDue();
      const wake = world.requests();
      check('E5', wake.length === 1 && wake[0]?.body === EXPECTED_COUNT('Seen when your Mac woke · e1', 1),
        `a row first seen at resume + 15,000 must be in the wake alert, said as a wake: ${J(wake.map((r) => r.body.slice(0, 160)))}`);
      // resume + 15,001: not in it, and out in ordinary coalescing.
      world.jump(1);
      world.set({ e2: 'needs_input' });
      await world.advance(60_000);
      const later = world.requests().slice(wake.length);
      check('E5', later.length === 1 && later[0]?.body === EXPECTED_SINGLE('e2', 'e2', 2),
        `a row first seen at resume + 15,001 must go out in ordinary coalescing as a single alert: ${J(later.map((r) => r.body.slice(0, 160)))}`);
      const seen = Object.fromEntries((world.routes.blocked().rows as any[]).map((r) => [r.name, r.seenAtWake]));
      check('E5', seen['e1'] === true && seen['e2'] === false, `the door reads ${J(seen)} at the two edges`);
    } finally {
      await world.close();
    }
  });

  // ---- E7: Apple's answers, every row ------------------------------------
  const answerRow = async (
    label: string,
    answers: any[],
    expect: 'ok' | 'drop' | 'stop' | 'later' | 'retry' | 'retry-fails',
    dests: any[] = [A()]
  ): Promise<void> => {
    await scenario(`E7 ${label}`, ['E7'], async () => {
      const world = new World(dests);
      try {
        world.tick();
        if (answers.length > 0) standIn.script(dests[0].token, ...answers);
        world.set({ r1: 'needs_input' });
        await world.advance(COALESCE);
        const token = dests[0].token;
        const firstCount = toToken(world.requests(), token).length;
        if (expect === 'ok') {
          check('E7', firstCount === 1 && world.drops.length === 0 && world.said.length === 0, `${label}: sent ${String(firstCount)}, dropped ${String(world.drops.length)}, said ${J(world.said)}`);
        }
        if (expect === 'drop') {
          check('E7', world.drops.length === 1 && world.drops[0] === digestOf(token), `${label}: the token was not dropped exactly once (drops ${String(world.drops.length)})`);
          check('E7', world.said.filter((s) => s === 'dropped').length === 1, `${label}: said ${J(world.said)}; PUSH_TOKEN_STOPPED once`);
          await world.advance(2 * 60_000);
          world.set({ r2: 'needs_input' });
          await world.advance(2 * 60_000);
          check('E7', toToken(world.requests(), token).length === 1, `${label}: the dropped token was asked again (${String(toToken(world.requests(), token).length)} requests)`);
          if (dests.length > 1) {
            check('E7', toToken(world.requests(), dests[1].token).length === 2, `${label}: the other phone was not still told`);
          }
        }
        if (expect === 'stop') {
          check('E7', world.drops.length === 0, `${label}: a key or topic fault DROPPED the phone’s token; the fault is not the phone’s`);
          check('E7', world.said.filter((s) => s === 'refused-key').length === 1, `${label}: said ${J(world.said)}; PUSH_KEY_REFUSED once`);
          await world.advance(2 * 60_000);
          world.set({ r2: 'needs_input' });
          await world.advance(2 * 60_000);
          check('E7', toToken(world.requests(), token).length === 1, `${label}: sending did not stop while the same key record is in place`);
          // A CORRECTED key record: the same scratch pair under another key
          // id, so the stand-in verifies it and its digest is a new one.
          world.key = { ...KEY.record, keyId: 'P314KEY003' };
          world.set({ r3: 'needs_input' });
          await world.advance(2 * 60_000);
          check('E7', toToken(world.requests(), token).length === 2, `${label}: keeping a corrected key did not lift the stop`);
        }
        if (expect === 'later') {
          await world.advance(5 * 60_000);
          check('E7', toToken(world.requests(), token).length === 1 && world.drops.length === 0, `${label}: a 429 was retried or dropped (${String(toToken(world.requests(), token).length)} requests)`);
          world.set({ r2: 'needs_input' });
          await world.advance(2 * 60_000);
          check('E7', toToken(world.requests(), token).length === 2, `${label}: the next join did not send the current state`);
        }
        if (expect === 'retry' || expect === 'retry-fails') {
          check('E7', firstCount === 1, `${label}: the first attempt sent ${String(firstCount)}`);
          await world.advance(RETRY - 1);
          check('E7', toToken(world.requests(), token).length === 1, `${label}: the retry came before 15 s`);
          await world.advance(1);
          check('E7', toToken(world.requests(), token).length === 2, `${label}: exactly one retry after 15 s was not made`);
          await world.advance(10 * 60_000);
          check('E7', toToken(world.requests(), token).length === 2, `${label}: a third attempt was made`);
          if (expect === 'retry-fails') {
            check('E7', world.said.filter((s) => s === 'unreachable').length === 1, `${label}: said ${J(world.said)}; PUSH_UNREACHABLE once`);
          } else {
            check('E7', world.said.length === 0, `${label}: said ${J(world.said)} after a retry that succeeded`);
          }
        }
      } finally {
        standIn.clearScripts();
        await world.close();
      }
    });
  };
  await answerRow('200', [], 'ok');
  await answerRow('410 Unregistered', [{ status: 410, reason: 'Unregistered' }], 'drop', [A(), B()]);
  await answerRow('410 ExpiredToken', [{ status: 410, reason: 'ExpiredToken' }], 'drop');
  // The wrong environment: B's token presented as a DEVELOPMENT one reaches the
  // development listener, which was never seeded with it.
  await answerRow('400 BadDeviceToken, the wrong environment', [], 'drop', [destination('B', tokenB, 'development'), A()]);
  await answerRow('400 DeviceTokenNotForTopic', [{ status: 400, reason: 'DeviceTokenNotForTopic' }], 'stop');
  await answerRow('400 another reason', [{ status: 400, reason: 'BadCollapseId' }], 'stop');
  await answerRow('403 InvalidProviderToken', [{ status: 403, reason: 'InvalidProviderToken' }], 'stop');
  await answerRow('403 MissingProviderToken', [{ status: 403, reason: 'MissingProviderToken' }], 'stop');
  await answerRow('413 PayloadTooLarge', [{ status: 413, reason: 'PayloadTooLarge' }], 'stop');
  await answerRow('429 TooManyRequests', [{ status: 429, reason: 'TooManyRequests' }], 'later');
  await answerRow('500 InternalServerError', [{ status: 500, reason: 'InternalServerError' }], 'retry');
  await answerRow('503 ServiceUnavailable', [{ status: 503, reason: 'ServiceUnavailable' }], 'retry');
  await answerRow('a stream reset', [{ reset: true }], 'retry');
  await answerRow('500 twice', [{ status: 500, reason: 'InternalServerError' }, { status: 500, reason: 'InternalServerError' }], 'retry-fails');

  await scenario('E7 a retry is recomposed from the rows as they are then', ['E7'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      standIn.script(tokenA, { status: 500, reason: 'InternalServerError' });
      world.set({ ra: 'needs_input', rb: 'needs_input' });
      await world.advance(COALESCE);
      world.set({ rb: 'idle' });
      await world.advance(RETRY);
      const reqs = toToken(world.requests(), tokenA);
      check('E7', reqs.length === 2 && reqs[1]?.body === EXPECTED_SINGLE('ra', 'ra', 1),
        `the retry must announce only the row still blocked: ${J(reqs.map((r) => r.body.slice(0, 120)))}`);
    } finally {
      standIn.clearScripts();
      await world.close();
    }
  });

  await scenario('E7 a removed destination is never sent to', ['E7'], async () => {
    const world = new World([A(), B()]);
    try {
      world.tick();
      world.set({ q1: 'needs_input' });
      await world.advance(COALESCE);
      world.dests = [A()];
      await world.advance(60_000);
      world.set({ q2: 'needs_input' });
      await world.advance(60_000);
      check('E7', toToken(world.requests(), tokenB).length === 1 && toToken(world.requests(), tokenA).length === 2,
        'a destination no longer answered by destinations() was sent to again');
    } finally {
      await world.close();
    }
  });

  // THE FIX ROUND: a drop the host could not write down is still a drop.
  await scenario('E7 a 410 the host could not persist is never asked again', ['E7'], async () => {
    const world = new World([A(), B()], { dropPersists: false });
    try {
      world.tick();
      standIn.script(tokenB, { status: 410, reason: 'Unregistered' });
      world.set({ d1: 'needs_input' });
      await world.advance(COALESCE);
      for (const id of ['d2', 'd3', 'd4']) {
        await world.advance(60_000);
        world.set({ [id]: 'needs_input' });
        await world.advance(60_000);
      }
      check('E7', world.dests.length === 2, 'the scenario’s host dropped the token itself, so it proves nothing');
      check('E7', toToken(world.requests(), tokenB).length === 1 && toToken(world.requests(), tokenA).length === 4,
        `a token Apple answered 410 was asked ${String(toToken(world.requests(), tokenB).length)} time(s) across four joins while the host still answered it; once, and never again`);
      check('E7', world.said.filter((s) => s === 'dropped').length === 1, `said ${J(world.said)}`);
    } finally {
      standIn.clearScripts();
      await world.close();
    }
  });

  await scenario('E7 a token two pairings presented is asked once', ['E7'], async () => {
    const world = new World([A(), { ...A(), phoneId: 'A-again' }]);
    try {
      world.tick();
      world.set({ u1: 'needs_input' });
      await world.advance(COALESCE);
      check('E7', toToken(world.requests(), tokenA).length === 1,
        `one device token presented by two pairings got ${String(toToken(world.requests(), tokenA).length)} identical alerts; one`);
    } finally {
      await world.close();
    }
  });

  // THE FIX ROUND: a second ExpiredProviderToken after the one re-mint is a
  // clock fault, not a key fault. It says so, stops nothing, and the next join
  // tries again.
  await scenario('E7 a second ExpiredProviderToken is the clock, not the key', ['E7'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      standIn.script(tokenA, { status: 403, reason: 'ExpiredProviderToken' }, { status: 403, reason: 'ExpiredProviderToken' });
      world.set({ x1: 'needs_input' });
      await world.advance(COALESCE);
      check('E7', toToken(world.requests(), tokenA).length === 2, `two ExpiredProviderToken answers cost ${String(toToken(world.requests(), tokenA).length)} request(s); one re-mint and one retry`);
      check('E7', world.said.length === 1 && world.said[0] === 'clock' && world.engine.status().state !== 'refused' && world.drops.length === 0,
        `a fresh token Apple called expired must say the clock (said ${J(world.said)}, state ${J(world.engine.status().state)}), stop nothing and drop nothing`);
      await world.advance(60_000);
      world.set({ x2: 'needs_input' });
      await world.advance(60_000);
      const reqs = toToken(world.requests(), tokenA);
      check('E7', reqs.length === 3 && reqs[2]?.status === 200,
        `after the clock is right the next join must send: ${J(reqs.map((r) => r.status))}`);
      check('E7', world.engine.status().sentence === null, 'the clock sentence outlived a send that went through');
    } finally {
      standIn.clearScripts();
      await world.close();
    }
  });

  // THE INTEGRATOR'S ROW (Phase 314): a fall is an EVENT. Asked as a state on
  // every poll, a badge Apple could not take was sent again every few seconds
  // beside its one retry: 282 badge sends in ten minutes of polls against a
  // 500, measured on the builders' engine.
  await scenario('E7 a failed badge-only send gets its one retry and nothing from later polls', ['E7'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ f1: 'needs_input', f2: 'needs_input' });
      await world.advance(COALESCE);
      standIn.script(
        tokenA,
        { status: 500, reason: 'InternalServerError' },
        { status: 500, reason: 'InternalServerError' },
        { status: 429, reason: 'TooManyRequests' }
      );
      world.set({ f1: 'idle' });
      for (let i = 0; i < 150; i += 1) {
        await world.advance(2_000);
        world.tick();
      }
      const badges = toToken(world.requests(), tokenA).filter((r) => bodyOf(r)?.aps?.alert === undefined);
      check('E7', badges.length === 2,
        `a badge-only send answered 500 was sent ${String(badges.length)} time(s) across 150 polls; SPEC §2.7 allows it and ONE retry, and a poll with no fall sends nothing`);
    } finally {
      standIn.clearScripts();
      await world.close();
    }
  });

  // ---- J2 through the engine: the clock moved backwards between join and send
  await scenario('J2 the clock moved backwards between the join and the send', ['J2'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ c1: 'needs_input' });
      await world.advance(COALESCE);
      const minted = world.requests()[0]?.authorizationDigest;
      await world.advance(60_000);
      world.set({ c2: 'needs_input' });
      world.skew = -2 * 3_600_000;
      const wallAtSend = world.wall + world.skew + 30_000 - 60_000;
      await world.advance(60_000);
      const reqs = world.requests();
      check('J2', reqs.length === 2, `the alert after the clock moved back was sent ${String(reqs.length - 1)} time(s); exactly once`);
      check('J2', reqs[1]?.authorizationDigest === minted, 'the clock moved backwards and the engine’s send re-minted the token');
      const exp = Number(reqs[1]?.headers['apns-expiration']);
      // A negative NUMBER, as JSON writes one after a colon, a bracket or a comma.
      check('J2', Number.isInteger(exp) && exp > 0 && !/[:[,]\s*-\d/.test(reqs[1]?.body ?? ':-1'), 'a negative number reached the payload or the expiration');
      void wallAtSend;
    } finally {
      await world.close();
    }
  });

  // ---- E8: inert, and no key ---------------------------------------------
  await scenario('E8 inert with no destination', ['E8'], async () => {
    const conns = { ...standIn.connections };
    const world = new World([]);
    try {
      world.tick();
      world.set({ n1: 'needs_input', n2: 'needs_input' });
      await world.advance(10 * 60_000);
      world.set({ n1: 'idle' });
      await world.advance(10 * 60_000);
      check('E8', world.requests().length === 0 && world.keyReads === 0 && world.scheduled === 0,
        `with no destination the engine sent ${String(world.requests().length)}, read the key ${String(world.keyReads)} time(s) and armed ${String(world.scheduled)} timer(s); all must be zero`);
      check('E8', standIn.connections.development === conns.development && standIn.connections.production === conns.production,
        'with no destination the engine opened a connection');
      check('E8', world.said.length === 0, `with no destination the engine said ${J(world.said)}`);
    } finally {
      await world.close();
    }
  });

  await scenario('E8 the key is read only inside a flush, and no key says one sentence', ['E8'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ k1: 'needs_input' });
      check('E8', world.keyReads === 0, `a join read the key ${String(world.keyReads)} time(s) before any flush`);
      await world.advance(COALESCE);
      check('E8', world.keyReads === 1 && world.requests().length === 1, `the flush read the key ${String(world.keyReads)} time(s) and sent ${String(world.requests().length)}`);
      world.key = null;
      await world.advance(60_000);
      world.set({ k2: 'needs_input' });
      await world.advance(60_000);
      world.set({ k3: 'needs_input' });
      await world.advance(60_000);
      check('E8', world.requests().length === 1, `with no key the engine still sent ${String(world.requests().length - 1)} request(s)`);
      check('E8', world.said.filter((s) => s === 'no-key').length === 1 && world.said.length === 1,
        `with no key over two flushes the engine said ${J(world.said)}; PUSH_NO_KEY exactly once per run`);
      check('E8', world.engine.status().state === 'no-key', `status() reads ${J(world.engine.status())} with no key`);
    } finally {
      await world.close();
    }
  });

  // ---- E9: shutdown ------------------------------------------------------
  await scenario('E9 shutdown closes admission and cancels timers', ['E9'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      world.set({ z1: 'needs_input' });
      const live = world.liveTimers();
      world.engine.beginShutdown();
      check('E9', live >= 1 && world.liveTimers() === 0, `beginShutdown left ${String(world.liveTimers())} of ${String(live)} timer(s) live`);
      const scheduled = world.scheduled;
      world.set({ z2: 'needs_input' });
      await world.advance(10 * 60_000);
      check('E9', world.requests().length === 0 && world.scheduled === scheduled,
        `after beginShutdown the engine sent ${String(world.requests().length)} and armed ${String(world.scheduled - scheduled)} timer(s)`);
    } finally {
      await world.close();
    }
  });

  await scenario('E9 join is bounded when a send never answers', ['E9'], async () => {
    const world = new World([A()]);
    try {
      world.tick();
      standIn.script(tokenA, { hang: true });
      world.set({ h1: 'needs_input' });
      // Fire the flush; the stand-in holds the request open and never answers.
      const due = world.timers.filter((t) => t.live).sort((a, b) => a.at - b.at)[0];
      if (due !== undefined) {
        world.wall += due.at - world.mono;
        world.mono = due.at;
        due.live = false;
        due.fn();
      }
      for (let i = 0; i < 50 && standIn.hungCount() === 0; i += 1) await new Promise((r) => setTimeout(r, 10));
      check('E9', standIn.hungCount() === 1, 'the hung request never reached the stand-in');
      world.engine.beginShutdown();
      const started = Date.now();
      let joined = false;
      const joining = world.engine.join().then(() => {
        joined = true;
      });
      // Its bound may run on the injected clock: move it, a minute at most.
      for (let step = 0; step < 60 && !joined && Date.now() - started < 8_000; step += 1) {
        const next = world.timers.filter((t) => t.live).sort((a, b) => a.at - b.at)[0];
        if (next !== undefined && next.at <= world.mono + 60_000) {
          world.mono = next.at;
          next.live = false;
          next.fn();
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      await Promise.race([joining, new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - started))))]);
      check('E9', joined, `join() had not returned ${String(Date.now() - started)} ms after beginShutdown with a send that never answers; it must be bounded`);
    } finally {
      standIn.clearScripts();
      await world.close();
    }
  });

  // ---- A2: canaries in every field the alert may not read -----------------
  await scenario('A2 canaries', ['A2'], async () => {
    const world = new World([A(), B()], { canary: true });
    const CANARIES = ['CANARYQUESTION', 'CANARYCHOICE', 'CANARYDOT', 'CANARYAGENT'];
    try {
      world.tick();
      world.activity.set('cn', { question: 'CANARYQUESTION rm -rf build', choice: { atChoice: true, options: [{ marker: '1', text: 'CANARYCHOICE yes' }] } });
      world.session('cn', 'needs_input', { agent: 'CANARYAGENT' });
      world.tick();
      world.activity.set('cm', { question: 'CANARYQUESTION two' });
      world.set({ cm: 'needs_input' });
      await world.advance(COALESCE);
      world.set({ cn: 'idle' });
      await world.advance(2 * 60_000);
      const reqs = world.requests();
      check('A2', reqs.length >= 2, `the canary world sent ${String(reqs.length)} request(s); it must send something to prove anything`);
      const doorRow = (world.routes.blocked().rows as any[]).find((r) => r.sessionId === 'cm');
      check('A2', doorRow?.question === 'CANARYQUESTION two', 'the door row did not carry the canary question, so the canary proves nothing');
      for (const r of reqs) {
        const everything = `${r.path}\n${J(r.headers)}\n${r.body}`;
        for (const canary of CANARIES) {
          check('A2', !everything.includes(canary), `${canary} reached a request (${r.path.slice(0, 12)}…); the alert reads the SPEC §2.1 fields and no others`);
        }
      }
    } finally {
      await world.close();
    }
  });
}

/** A4: a device token that is not lowercase hex is refused before a path exists. */
async function deviceTokenRefusal(): Promise<void> {
  if (apns === null) return;
  const sender = createApnsSender!({ origin: (env: string) => standIn.origins[env] });
  try {
    for (const bad of ['00/../../3/device/ab', 'ABCDEF0123', 'ab cd', '', 'abc?x=1', 'ab#cd']) {
      const n = standIn.requests.length;
      const answer = await sender.send(KEY.record, {
        token: bad, environment: 'development', topic: TOPIC, payload: EXPECTED_BADGE(0), priority: 5, expiration: 0, collapseId: null
      });
      check('A4', answer?.ok === false && standIn.requests.length === n,
        `a device token ${J(bad)} reached the stand-in (${String(standIn.requests.length - n)} request(s)); a token that is not lowercase hex is refused before a path is composed`);
    }
  } finally {
    await sender.close().catch(() => undefined);
  }
}

/**
 * E7, below the request (the fix round): a peer that never answers. Before the
 * fix a send over a TLS handshake nobody answered was still pending after
 * three minutes and its connection was handed to every later send. The sender
 * is built with a 300 ms deadline so this runs in about a second; the shipping
 * 20 s is read as a constant.
 */
async function peersThatNeverAnswer(): Promise<void> {
  if (apns === null) return;
  check('E7', apns.REQUEST_TIMEOUT_MS === 20_000, `REQUEST_TIMEOUT_MS is ${String(apns.REQUEST_TIMEOUT_MS)}, not 20,000`);
  const BOUND_MS = 3_000;
  const within = async (work: Promise<any>): Promise<any> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([work, new Promise((r) => (timer = setTimeout(() => r('still pending'), BOUND_MS)))]);
    } finally {
      clearTimeout(timer);
    }
  };
  const send = (sender: any, token = tokenA) =>
    sender.send(KEY.record, { token, environment: 'development', topic: TOPIC, payload: EXPECTED_BADGE(1), priority: 5, expiration: 0, collapseId: null });
  for (const scheme of ['https', 'http'] as const) {
    const label = scheme === 'https' ? 'a TLS handshake nobody answers' : 'an h2c peer that never sends a byte';
    const peer = await startSilentPeer();
    const sender = createApnsSender!({ origin: () => peer.origin(scheme), requestTimeoutMs: 300 });
    try {
      const first = await within(send(sender));
      check('E7', first !== 'still pending' && first?.ok === false && first?.status === 0 && first?.kind === 'retry',
        `${label}: the send answered ${J(first)} after ${String(BOUND_MS)} ms; it must settle as unreachable by its deadline`);
      for (let i = 0; i < 100 && peer.counts.closed < 1; i += 1) await new Promise((r) => setTimeout(r, 10));
      check('E7', peer.counts.closed >= 1, `${label}: the connection a request got no answer on was kept open`);
      const second = await within(send(sender));
      check('E7', second !== 'still pending' && peer.counts.accepted === 2,
        `${label}: the next send answered ${J(second)} over ${String(peer.counts.accepted)} connection(s); a dead connection is never handed on, so it must dial a second`);
    } finally {
      await sender.close().catch(() => undefined);
      await peer.close();
    }
  }
  // A 200 whose body never ends settles on its status at the deadline.
  const sender = createApnsSender!({ origin: (env: string) => standIn.origins[env], requestTimeoutMs: 300 });
  try {
    standIn.script(tokenA, { trickle: true });
    const answer = await within(send(sender));
    check('E7', answer !== 'still pending' && answer?.ok === true,
      `a 200 whose body trickles forever answered ${J(answer)}; it must settle on its status by the deadline`);
  } finally {
    standIn.clearScripts();
    await sender.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

try {
  standIn = await startApnsStandIn({
    publicKey: KEY.publicKey,
    topic: TOPIC,
    devices: { [tokenA]: 'development', [tokenB]: 'production', [tokenC]: 'development' }
  });
  say(`[p314 driven] stand-in on ${standIn.origins.development} and ${standIn.origins.production}`);
  // P314-H3-ANCHOR: the ablation's H3 arm inserts a hostile sender below this line.
  await hostsAndRefusals();
  await providerToken();
  composer();
  ageFunction();
  await deviceTokenRefusal();
  await peersThatNeverAnswer();
  await engineRules();
} catch (err) {
  for (const id of ALL_DRIVEN) fail(id, `the driven half threw: ${(err as Error).stack?.split('\n').slice(0, 3).join(' / ')}`);
} finally {
  if (standIn !== null) await standIn.close().catch(() => undefined);
}

// THE FENCE'S VERDICT: nothing in this run dialled anything but 127.0.0.1.
check('H3', fenceHits.length === 0, `this run tried to reach ${J(fenceHits)}; every test, gate and probe aims the sender at loopback`);
check('H2', fenceHits.length === 0, `a sender dialled ${J(fenceHits)} before refusing it`);

say(`P314_PUSH:${J({ checks, failures, fenceHits: fenceHits.length, requests: standIn?.requests.length ?? 0 })}`);
process.exit(0);
