#!/usr/bin/env node
/**
 * probe:p313 — the door SWITCHED ON, and read by a phone that is a node script
 * (Phase 316.1). Phase 313 named this probe and never wrote it; build/p316/SPEC.md
 * §4 "S1 — Proof" is where it is specified, and this file is that paragraph.
 *
 * WHY IT EXISTS. Phase 313 built a door on the tailnet and nothing turned it on:
 * nothing called the registrar, nothing wrote `enabled`, there was no Settings
 * then Phone and the conversation store would have answered a stale page. Phase
 * 316.1 wires every one of those. What no plain-node check can reach is the
 * ORDER inside the real app — turn on, confirm, listening, pair, allow — over
 * the real registrar, the real sealed store and confirm record (mock keychain),
 * the real facts composer reading the real session list and the real overview
 * store, and the real launch step on a relaunch. This probe is that run.
 *
 * WHAT IS REAL IN A RUN
 *   - The app's own `pocket:*` channels, pressed through `window.gmux.pocket`
 *     exactly as Settings then Phone presses them, and the door they open.
 *   - The door's TLS, its closed route table, its signature check, its pairing
 *     window and its facts: the sessions are Tortie's own, the blocked row is
 *     the status monitor's own verdict, and the conversation is the overview
 *     store's own rows, brought up to date by the door's own refresh.
 *   - The launch step: the second launch must find the door listening with no
 *     press, and the third, whose agreement a Remove withdrew, must not.
 *
 * WHAT IS SUPPLIED, and it is exactly three things:
 *   - the PHONE, a node client written here from the wire format rather than
 *     imported from `src/main/pocket/`: its Ed25519 signature, its X25519
 *     binding, its sealed presentation, its phone id, its short fingerprint and
 *     its PIN are a second implementation, so the door cannot pass by checking
 *     what it happens to produce. The pin is the Swift shape exactly: the
 *     26-byte P-256 SubjectPublicKeyInfo header, then the leaf's 65-byte point,
 *     sha256, base64url (build/p316/SPEC.md §3.3);
 *   - the `claude` on the scratch PATH, a /bin/sh script this probe writes. For
 *     one session it prints the COMMITTED Phase 312 dialog fixture
 *     (src/main/activity/__tests__/fixtures/claude-permission-prompt.txt), so
 *     the shipped screen tier reads `needs_input` with its numbered choices; for
 *     another it plants the COMMITTED research 63 transcript
 *     (docs/research/assets/63-fixtures/claude-session.jsonl) under the scratch
 *     HOME at the path its `--session-id` names. NO VENDOR PROCESS RUNS AND NO
 *     TOKEN IS SPENT;
 *   - THE TAILNET KEY, which is a MADE-UP `tskey-auth-…` string generated here.
 *     No real key exists in this run. It is pasted into the pairing window the
 *     way he would paste his, and at the end every file under the scratch
 *     profile, the harness directory and the scratch HOME, plus everything the
 *     app wrote to its console, is scanned for its bytes, which must be absent.
 *
 * NO REAL INTERFACE, EVER. The app runs with `GMUX_POCKET_LOOPBACK=1`, so the
 * door binds 127.0.0.1, and this probe REFUSES to dial any host but 127.0.0.1:
 * the QR's `host` is asserted to be loopback BEFORE a byte is sent, and a QR
 * naming anything else ends the run. It never runs a `tailscale` command, never
 * opens an admin console and never binds 0.0.0.0.
 *
 * THE ORDER, one scratch world, three launches ONE AT A TIME
 *   Launch 1 (the order):
 *     C0  the channel census: every `pocket:*` channel of the contract answers
 *         from main (the parent reading is 0 and no `pocket` member at all)
 *     D0  pairing is refused while nothing listens, so the QR's pin can never
 *         be null; nothing is listening before the confirm
 *     D1  turn on: confirmState is not confirmed and nothing listens yet
 *     D2  confirm: listening on 127.0.0.1 and the default port
 *     K0  a 10 KB key and a key that does not start `tskey-auth-` are refused
 *         with a sentence, the refusal does not echo the key, and no window
 *         opened
 *     K1  the pairing offer is v:2 and carries the key as `tk`; the sheet's
 *         view and the status do not
 *     F1  the QR's `fp` is the PUBLIC KEY's hash, re-derived here from the leaf
 *         the door served, and not the certificate's
 *     P1  present, read the fingerprint on both sides, Allow, present again
 *     P2  after Allow the window no longer holds the key (the view says
 *         nothing of it) and a second phone with the photographed QR is refused
 *     B1  `/v1/blocked`: the waiting session is the one row, its title is the
 *         raised word, its age is main's own and re-derived here, it blocked
 *         AFTER it was created (`blockedSince > createdAt`), and `others` is
 *         exactly every listed session that is not blocked
 *     S1  `/v1/session` for the planted conversation: counts and a last answer
 *     T1  `/v1/turns` paged back to the first turn: pages never overlap, the
 *         indexes are contiguous, and the count drawn equals the turn count
 *     T2  ONE TURN APPENDED TO THE PLANTED RECORD, and the next `/v1/turns`
 *         shows it: the refresh runs before the read
 *     T3  a 4,000-character one-word ask comes back whole, and an unanswered
 *         turn carries one of the three absence sentences
 *     A1  page indexes that go backwards, overlap, are negative or are 2^53
 *     A2  the id of a removed session, and a session with no record
 *   Launch 2 (the relaunch):
 *     R1  listening with no press, and the paired phone still reads
 *     A3  a Remove AFTER VERIFY AND BEFORE THE ANSWER IS WRITTEN (the 316.1
 *         reverify's nit 2): the composition is held on the app's own
 *         `sessionActivity` chain by a flood of `overview:activity` calls
 *         from the renderer, the request is sent twice with one nonce, and
 *         the Remove is pressed only after main prints that the second
 *         sending was refused `replay` — so the first had passed verify.
 *         THAT request must be refused (404) or cut, never answered, and
 *         main must print refusal 7's own reason, `unpaired`; a request
 *         refused before verify says `shutdown`, because the Remove stops the
 *         door in the same task. A run that cannot place the Remove is
 *         UNREADABLE, never a pass. At the pre-fix build this arm fails: the
 *         composed request is answered 200
 *   Launch 3 (nothing confirmed any more):
 *     L1  `enabled` and `bindAtLaunch` are still true and the agreement is
 *         gone, so the relaunch must NOT bind and must say why
 *     A4  `setDoor` during quit: the app exits, and nothing listens afterwards
 *   After:
 *     K2  the key's bytes are in no file under the profile, the harness
 *         directory or the HOME, and in nothing the app printed
 *     no Electron of this run is left
 *
 * NOT DRIVEN HERE, and why. A REMOTE row's turns need a second machine, and no
 * harness here can make one; `conformance:pocket:hostile` drives the SHIPPING
 * composer's remote arm with a remote row in its facts. `blockedSince` for a
 * row first seen at a wake is Phase 314's (`probe:p314`, the wake arm).
 *
 * WHAT IT WRITES. `out/p313/probe-p313.json`: per arm a verdict and a
 * sentence, with lengths, counts, digests and the probe's own synthetic
 * names — NEVER the key (it is written as its sha256), and never a signature,
 * a nonce or a private key. With `P313_KEEP=1` the scratch world is kept and
 * `rederive/answers.json` is written INSIDE it: every door answer this run
 * received, main's own session list, and the paths of the scratch profile's
 * databases, for the verifier's independent reader (SPEC S1, Method A), which
 * this file deliberately does not contain.
 *
 * WHAT IT REFUSES TO DO. It signals nothing it did not start: every launch goes
 * through `build/electron-run.mjs`'s `withElectron`, whose kill is in a
 * `finally`, and it names its own scratch tmux socket (`gmux-p313-<pid>`, never
 * `gmux`), so the same teardown ends that server and every pane in it. It runs
 * no tmux command of its own, never runs `pkill`, installs nothing, spends no
 * token, passes no flag to any agent, reads no credential, keychain item or
 * conversation store of the person's, and writes nothing under the person's
 * home. `npm run shot` is not called.
 *
 * VERIFIERS ONLY. It starts an Electron: take the orchestrator's Electron lock
 * first. Builders write it and never run it.
 *
 * BUILD FIRST. It carries no `npm run build &&` on purpose, because a run
 * against another checkout must not rebuild this one, and it refuses (exit 2)
 * when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p313
 *   P313_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p313   the parent reading
 *   P313_KEEP=1 npm run -s probe:p313                            keep the scratch world
 *
 * Exit 0 when every arm passed (or, at the parent, the parent reading was
 * taken), 1 when an arm failed, 2 when it could not run or an arm could not be
 * READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import {
  X509Certificate,
  createCipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith
} from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { connect as netConnect } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { wsConnect, cdpEval } from './cdp-client.mjs';
import { pickRendererTarget } from './cdp-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The checkout whose APP is launched. The helper and the phone are always this tree's. */
const CHECKOUT = resolve((process.env['P313_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p313 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;
const sha = (data) => createHash('sha256').update(data).digest('hex');

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// What the SHIPPING source says, read out of it rather than copied, so no
// comparison below can drift from what the app does.
// ---------------------------------------------------------------------------

function sourceOf(...files) {
  for (const file of files) {
    const path = join(CHECKOUT, file);
    if (existsSync(path)) return readFileSync(path, 'utf8');
  }
  return '';
}
function numberIn(text, name) {
  const hit = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(text);
  return hit === null ? null : Number(hit[1].replace(/_/g, ''));
}
function stringIn(text, name) {
  const hit = new RegExp(`${name}\\s*=\\s*'([^']*)'`).exec(text);
  return hit === null ? null : hit[1];
}

const IPC_SRC = sourceOf('src/main/pocket/ipc.ts');
const CONTRACT_SRC = sourceOf('src/shared/ipc/pocket.ts');
const ROUTES_SRC = sourceOf('src/main/pocket/routes.ts');
const COPY_SRC = sourceOf('src/shared/overview-copy.ts', 'src/renderer/overview/copy.ts');
const PORT = numberIn(IPC_SRC, 'POCKET_DEFAULT_PORT') ?? 8823;
const OTHERS_MAX = numberIn(CONTRACT_SRC, 'POCKET_OTHERS_MAX');
const AGE_NOTE = stringIn(CONTRACT_SRC, 'POCKET_AGE_HONESTY');
const ABSENCES = ['NOT_ANSWERED_YET', 'STOPPED_BEFORE_ANSWER', 'ANSWER_NOT_IN_RECORD']
  .map((name) => stringIn(COPY_SRC, name))
  .filter((s) => s !== null);
/** Every `pocket:*` channel the contract declares, from its channel map's own keys. */
const CONTRACT_CHANNELS = [...CONTRACT_SRC.matchAll(/^\s*'(pocket:[A-Za-z]+)':\s*\{\s*req:/gm)].map((m) => m[1]);
/** The route table's rows, read as literals, for the write-route count. */
const ROUTE_ROWS = [
  ...ROUTES_SRC.matchAll(/\{\s*id:\s*'(\w+)',\s*method:\s*'(\w+)',\s*path:\s*'([^']+)',\s*reads:\s*(true|false)/g)
].map((m) => ({ id: m[1], method: m[2], path: m[3], reads: m[4] === 'true' }));
const WRITE_ROUTES = ROUTE_ROWS.filter((r) => !r.reads || (r.method !== 'GET' && r.path !== '/pair')).length;

// ---------------------------------------------------------------------------
// The scratch world. Outside the repository and outside the person's home,
// which is what build/electron-run.mjs refuses a profile for.
// ---------------------------------------------------------------------------

const RUN = resolve((process.env['P313_RUN'] ?? '').trim() || `/private/tmp/p313-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const SOCKET = `gmux-p313-${String(process.pid)}`;
const KEEP = (process.env['P313_KEEP'] ?? '') === '1';

/** The fake claude's control files. The probe owns the timing. */
const NEXT = join(RUN, 'fake-next');
const STOP = join(RUN, 'fake-stop');
const TALK_SID = join(RUN, 'talk-sid');
const DIALOG = join(CHECKOUT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const STORE_SRC = join(CHECKOUT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
for (const file of [DIALOG, STORE_SRC]) {
  if (existsSync(file)) continue;
  console.error(`${TAG} no committed fixture at ${file}`);
  process.exit(2);
}

/**
 * THE TAILNET KEY. MADE UP, here, for this run. It has the shape the door
 * checks and nothing else: no Tailscale server has ever seen it and none ever
 * will, because nothing in this run dials anything but 127.0.0.1. The report
 * names it only by its sha256.
 */
const KEY = `tskey-auth-kP313probe${randomBytes(6).toString('hex')}-CNTRLp313probe${randomBytes(18).toString('hex')}`;
const KEY_SHA = sha(KEY);
/** Anything that goes into the report passes through this. */
const unkeyed = (text) => String(text).split(KEY).join('<the made-up key>');

/** The session names. Every one is this run's own. */
const N = { shell: 'p313-shell', gone: 'p313-gone', talk: 'p313-talk', ask: 'p313-ask' };

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const report = {
  checkout: CHECKOUT,
  atParent: AT_PARENT,
  keySha256: KEY_SHA,
  constants: { PORT, OTHERS_MAX, AGE_NOTE, absences: ABSENCES.length, contractChannels: CONTRACT_CHANNELS, writeRoutes: WRITE_ROUTES },
  arms: [],
  readings: {}
};
let failures = 0;
const arm = (id, ok, said) => {
  const text = unkeyed(said);
  report.arms.push({ id, ok, said: text });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
};
/** Every door answer this run received, for the verifier's re-derivation. */
const answers = [];

// ---------------------------------------------------------------------------
// The phone, written from the wire format and not from src/main/pocket/
// ---------------------------------------------------------------------------

const b64u = (buf) => Buffer.from(buf).toString('base64url');
/**
 * The DER header of a P-256 SubjectPublicKeyInfo, before its 65-byte point.
 * This is what the Swift client prepends to `SecKeyCopyExternalRepresentation`
 * (build/p316/SPEC.md §3.3), so the pin here is computed the phone's way.
 */
const SPKI_P256_HEADER = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');

function makePhone(label, doorExchangePublic) {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const signingKey = b64u(signing.publicKey.export({ type: 'spki', format: 'der' }));
  const exchangeKey = b64u(exchange.publicKey.export({ type: 'spki', format: 'der' }));
  const shared = diffieHellman({
    privateKey: exchange.privateKey,
    publicKey: createPublicKey({ key: Buffer.from(doorExchangePublic, 'base64url'), format: 'der', type: 'spki' })
  });
  const binding = Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${doorExchangePublic}\n${exchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
  const id = sha(`tortie-pocket-id-v1\n${signingKey}`).slice(0, 32);
  const fingerprint = (sha(`tortie-pocket-fp-v1\n${signingKey}\n${exchangeKey}`).slice(0, 24).match(/.{4}/g) ?? []).join(' ');
  return { label, id, signingKey, exchangeKey, signPrivate: signing.privateKey, binding, fingerprint };
}

/** A presentation sealed under the QR's one-shot secret, the phone's way. */
function sealPresentation(secretB64u, phone) {
  const secret = Buffer.from(secretB64u, 'base64url');
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(J({ label: phone.label, ek: phone.signingKey, xk: phone.exchangeKey }), 'utf8');
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.from(J({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }), 'utf8');
}

/** The pin, the phone's way: header + the leaf's point, sha256, base64url. */
function pinOf(peer) {
  if (peer === undefined || peer === null || !Buffer.isBuffer(peer.pubkey) || peer.pubkey.length !== 65) return null;
  return b64u(createHash('sha256').update(Buffer.concat([SPKI_P256_HEADER, peer.pubkey])).digest());
}

// ---------------------------------------------------------------------------
// The wire. 127.0.0.1 and nothing else, ever.
// ---------------------------------------------------------------------------

let pinned = null;
/** What the last handshake presented, for F1's re-derivation. */
let lastLeaf = null;

/** Is anything accepting on 127.0.0.1:PORT? A plain TCP connect, nothing sent. */
function portAnswers() {
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port: PORT });
    const finish = (value) => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(3_000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * One request to the door. It never rejects: a refusal that arrives as a dead
 * socket is itself a reading. Nothing is accepted before the pin holds.
 */
function ask(method, target, headers, body, { timeoutMs = 20_000 } = {}) {
  return new Promise((done) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path: target,
        agent: false,
        rejectUnauthorized: false,
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => finish({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', (err) => finish({ status: 0, body: '', error: String(err?.message ?? err) }));
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timed out'));
    });
    req.on('socket', (socket) => {
      socket.on('secureConnect', () => {
        const peer = socket.getPeerCertificate?.();
        lastLeaf = peer ?? null;
        const pin = pinOf(peer);
        if (pinned === null || pin !== pinned) {
          socket.destroy();
          finish({ status: 0, body: '', error: pinned === null ? 'nothing is pinned yet' : 'the door presented a key that is not the pinned one' });
        }
      });
    });
    req.on('error', (err) => finish({ status: 0, body: '', error: String(err?.message ?? err) }));
    if (body !== null) req.write(body);
    req.end();
  });
}

/** A signed GET, from a phone that signs honestly. */
function signedGet(phone, target, options) {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const canonical = ['tortie-pocket-req-v1', 'GET', target, sha(Buffer.alloc(0)), timestamp, nonce, phone.binding].join('\n');
  const signature = b64u(signWith(null, Buffer.from(canonical, 'utf8'), phone.signPrivate));
  return ask(
    'GET',
    target,
    {
      'x-tortie-phone': phone.id,
      'x-tortie-timestamp': timestamp,
      'x-tortie-nonce': nonce,
      'x-tortie-signature': signature
    },
    null,
    options
  );
}

/**
 * ONE signed GET whose headers can be sent TWICE (arm A3, the 316.1 reverify's
 * nit 2). The second sending is a replay: same timestamp, same nonce, same
 * signature. The door spends a nonce only AFTER the signature holds, so when it
 * refuses one of the two sendings `replay`, the other has passed verify and is
 * inside the composition — which is the one fact about the app's timing this
 * probe can read from outside it, and it reads the same at the parent.
 */
function signedTwice(phone, target) {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const canonical = ['tortie-pocket-req-v1', 'GET', target, sha(Buffer.alloc(0)), timestamp, nonce, phone.binding].join('\n');
  const headers = {
    'x-tortie-phone': phone.id,
    'x-tortie-timestamp': timestamp,
    'x-tortie-nonce': nonce,
    'x-tortie-signature': b64u(signWith(null, Buffer.from(canonical, 'utf8'), phone.signPrivate))
  };
  /** One sending: its answer, and `written` once the request has left in full. */
  const send = () => {
    const out = { settled: false, answer: null, written: null };
    let wrote = () => undefined;
    out.written = new Promise((done) => {
      wrote = done;
    });
    out.answer = new Promise((done) => {
      const finish = (value) => {
        if (out.settled) return;
        out.settled = true;
        wrote();
        done(value);
      };
      const req = httpsRequest(
        { host: '127.0.0.1', port: PORT, method: 'GET', path: target, agent: false, rejectUnauthorized: false, headers },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => finish({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
          res.on('error', (err) => finish({ status: 0, body: '', error: String(err?.message ?? err) }));
        }
      );
      req.setTimeout(30_000, () => req.destroy(new Error('timed out')));
      req.on('socket', (socket) => {
        socket.on('secureConnect', () => {
          const pin = pinOf(socket.getPeerCertificate?.());
          if (pinned === null || pin !== pinned) {
            socket.destroy();
            finish({ status: 0, body: '', error: 'the door presented a key that is not the pinned one' });
          }
        });
      });
      req.on('finish', () => wrote());
      req.on('error', (err) => finish({ status: 0, body: '', error: String(err?.message ?? err) }));
      req.end();
    });
    return out;
  };
  return { send };
}

const verdictOf = (answer) =>
  answer.status === 200 ? 'ok' : answer.status === 0 ? `nosocket-${answer.error ?? '?'}` : `refused-${String(answer.status)}`;
const parse = (answer) => {
  try {
    return JSON.parse(answer.body);
  } catch {
    return null;
  }
};
/** A read the verifier will re-derive, kept in memory. */
async function read(phone, target, label) {
  const answer = await signedGet(phone, target);
  answers.push({ label, target, status: answer.status, body: answer.body });
  return answer;
}

/** Every page of one session's conversation, newest first, to the first turn. */
async function pageBack(phone, sessionId, limit, label) {
  const pages = [];
  let to = null;
  for (let i = 0; i < 400; i += 1) {
    const target = `/v1/turns?id=${encodeURIComponent(sessionId)}&limit=${String(limit)}${to === null ? '' : `&to=${String(to)}`}`;
    const answer = await read(phone, target, `${label} page ${String(i)}`);
    const body = parse(answer);
    if (answer.status !== 200 || body === null) return { ok: false, pages, why: `page ${String(i)} answered ${verdictOf(answer)}` };
    pages.push(body);
    if (!Array.isArray(body.turns)) return { ok: false, pages, why: `page ${String(i)} carries no turns array` };
    if (body.more !== true) return { ok: true, pages, why: '' };
    if (body.turns.length === 0) return { ok: false, pages, why: `page ${String(i)} says more and carries nothing, which would page forever` };
    to = body.turns[0].index - 1;
  }
  return { ok: false, pages, why: 'more than 400 pages' };
}

// ---------------------------------------------------------------------------
// The app, driven through its own bridge
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(
  Object.keys(process.env)
    .filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name))
    .map((name) => [name, undefined])
);

async function attach(timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

/** The app's bridge, armed. */
async function armed(cdp) {
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    const ready = await cdpEval(cdp, 'window.gmux !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined');
    if (ready === true) return true;
    await sleep(300);
  }
  return false;
}

/** One press on `window.gmux.pocket`, answered as `{ ok, value }` or `{ ok: false, error }`. */
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  const text = await cdpEval(
    cdp,
    `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`
  );
  return JSON.parse(text);
}

async function mainSessions(cdp) {
  return JSON.parse(
    await cdpEval(
      cdp,
      'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, createdAt: x.createdAt, agent: x.agent, agentSessionId: x.agentSessionId ?? null }))))'
    )
  );
}

async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(cdp, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(500);
  }
}

// ---------------------------------------------------------------------------
// The planted conversation
// ---------------------------------------------------------------------------

function talkRecordPath() {
  if (!existsSync(TALK_SID)) return null;
  const sid = readFileSync(TALK_SID, 'utf8').trim();
  if (sid === '') return null;
  const dir = join(HOME, '.claude', 'projects', PROJECT.replace(/[^a-zA-Z0-9]/g, '-'));
  return { sid, file: join(dir, `${sid}.jsonl`) };
}

/** One more exchange on the scratch COPY. The committed fixture is never touched. */
function appendTurn(record, nth, askText, answerText) {
  const at = new Date().toISOString();
  const base = {
    isSidechain: false,
    userType: 'external',
    entrypoint: 'cli',
    cwd: PROJECT,
    sessionId: record.sid,
    version: '2.1.238',
    gitBranch: 'main'
  };
  const pad = String(nth).padStart(4, '0');
  const lines = [
    J({
      parentUuid: null,
      ...base,
      type: 'user',
      message: { role: 'user', content: askText },
      uuid: `3130${pad}-1111-4111-8111-111111111111`,
      timestamp: at,
      promptSource: 'typed',
      promptId: `p313-${pad}`,
      origin: { kind: 'human' }
    })
  ];
  if (answerText !== null) {
    lines.push(
      J({
        parentUuid: null,
        ...base,
        message: {
          model: 'claude-opus-5',
          id: `msg_p313${pad}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: answerText }]
        },
        requestId: `req_p313${pad}`,
        type: 'assistant',
        uuid: `3131${pad}-1111-4111-8111-111111111111`,
        timestamp: at
      })
    );
  }
  appendFileSync(record.file, `${lines.join('\n')}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// The scan for the key
// ---------------------------------------------------------------------------

/** Every regular file under `root` whose bytes hold any needle. Symlinks are not followed. */
function filesHolding(root, needles) {
  const hits = [];
  let files = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!st.isFile()) continue;
      files += 1;
      let bytes;
      try {
        bytes = readFileSync(path);
      } catch {
        continue;
      }
      for (const [needle, what] of needles) {
        if (bytes.indexOf(needle) !== -1) hits.push(`${relative(RUN, path)} (${what})`);
      }
    }
  };
  if (existsSync(root)) walk(root);
  return { hits, files };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let appText = '';
let shimPid = 0;
let appPid = 0;
let ran = false;

const launchOptions = (label) => ({
  label,
  userDataDir: PROFILE,
  cwd: CHECKOUT,
  tmuxSocket: SOCKET,
  args: ['--remote-debugging-port=0', '--use-mock-keychain'],
  env: withoutDevRenderer({
    ...INHERITED_CLAUDE,
    HOME,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
    GMUX_HARNESS_DIR: HARNESS,
    // THE LOOPBACK BIND. src/main/pocket/bind.ts binds 127.0.0.1 under this and
    // refuses it in a packaged build. Nothing in this run binds a real interface.
    GMUX_POCKET_LOOPBACK: '1',
    P313_NEXT: NEXT,
    P313_STOP: STOP,
    P313_TALK_SID: TALK_SID,
    P313_DIALOG: DIALOG,
    P313_STORE: STORE_SRC
  }),
  graceMs: 8_000,
  ceilingMs: 600_000
});

/** Record what a launch printed and which pids it started, whatever happened. */
async function launch(label, body) {
  await withElectron(launchOptions(label), async (handle) => {
    try {
      await body(handle);
    } finally {
      appText += `\n${handle.text()}`;
      shimPid = handle.pid;
      try {
        appPid = handle.appPid();
      } catch {
        appPid = 0;
      }
    }
  });
}

/** The pairing, the phone, and the paired phone's id, carried across launches. */
let phone = null;
let sessionsSeen = [];

try {
  // ---- the world ----------------------------------------------------------
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PROJECT, BIN, join(HOME, '.claude')]) {
    mkdirSync(dir, { recursive: true });
  }
  // The fake claude. /bin/sh, no vendor code. `--session-id` and `--resume`
  // both name the session; the mode is a file the probe writes before each
  // create, consumed by the one session that starts next.
  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p313. Not Claude Code. It prints a committed fixture and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sid=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi
  prev="$a"
done
mode=""
if [ -n "$P313_NEXT" ] && [ -f "$P313_NEXT" ]; then
  mode=$(cat "$P313_NEXT")
  rm -f "$P313_NEXT"
fi
if [ "$mode" = "talk" ] && [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  if [ ! -f "$d/$sid.jsonl" ]; then
    sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P313_STORE" > "$d/$sid.jsonl"
  fi
  printf '%s\\n' "$sid" > "$P313_TALK_SID"
  echo "p313 a planted conversation; nothing is being asked here"
fi
if [ "$mode" = "ask" ]; then
  sleep 2
  cat "$P313_DIALOG"
fi
while [ ! -f "$P313_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  // tmux's execvp reads the LOGIN shell's PATH, so the scratch bin goes on it.
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // The door's port is a CONFIRMED field and a taken one refuses rather than
  // moving, so a port somebody else holds is a run that cannot be read.
  if (await portAnswers()) {
    arm('the run', null, `something already accepts on 127.0.0.1:${String(PORT)}, the door's confirmed port; this run cannot tell its door from that`);
    throw new Error('port taken');
  }

  // ======================================================================
  // LAUNCH 1 — the order
  // ======================================================================
  await launch('p313-order', async () => {
    const cdp = await attach(150_000);
    try {
      if (!(await armed(cdp))) {
        arm('the run', null, 'the app never armed its bridge and the harness drives');
        return;
      }
      const hasPocket = await cdpEval(cdp, "typeof window.gmux.pocket === 'object' && window.gmux.pocket !== null");

      // ---- C0: the channel census ---------------------------------------
      // Each channel is pressed with an input main refuses or ignores, so the
      // census changes nothing: a channel is REGISTERED when main answered,
      // with a value or a refusal of its own, and NOT when Electron answered
      // "No handler registered".
      const HARMLESS = {
        status: undefined,
        pairingState: undefined,
        cancelPairing: undefined,
        removePhone: 'p313-no-such-phone',
        allowPhone: { linesRead: [], hashRead: 'p313-not-a-hash' },
        confirmDoor: { linesRead: [], hashRead: 'p313-not-a-hash' },
        forgetDoor: undefined,
        setPushAlerts: { on: false },
        setDoor: { on: false },
        beginPairing: { tailnetKey: null }
      };
      const census = {};
      if (hasPocket === true) {
        for (const channel of CONTRACT_CHANNELS) {
          const method = channel.slice('pocket:'.length);
          const exists = await cdpEval(cdp, `typeof window.gmux.pocket[${J(method)}] === 'function'`);
          if (exists !== true) {
            census[channel] = 'no bridge method';
            continue;
          }
          const got = await pocket(cdp, method, HARMLESS[method]);
          census[channel] = got.ok ? 'answered' : /No handler registered/i.test(got.error) ? 'not registered' : 'refused by main';
        }
      }
      const registered = Object.values(census).filter((v) => v === 'answered' || v === 'refused by main').length;
      report.readings.census = census;
      report.readings.registeredChannels = registered;
      report.readings.writeRoutes = WRITE_ROUTES;

      if (AT_PARENT) {
        const reachable = await portAnswers();
        report.readings.parent = { pocketMember: hasPocket === true, registered, writeRoutes: WRITE_ROUTES, doorReachable: reachable };
        arm(
          'C0 the parent reading',
          true,
          `window.gmux.pocket is ${hasPocket === true ? 'present' : 'absent'}; ${String(registered)} pocket channel(s) registered; ${String(WRITE_ROUTES)} write route(s) in the table; the door on 127.0.0.1:${String(PORT)} is ${reachable ? 'REACHABLE' : 'unreachable'}`
        );
        return;
      }
      arm(
        'C0 every pocket channel answers from main',
        hasPocket === true && CONTRACT_CHANNELS.length > 0 && registered === CONTRACT_CHANNELS.length && WRITE_ROUTES === 0,
        `${String(registered)} of ${String(CONTRACT_CHANNELS.length)} contract channels registered (${J(census)}); ${String(WRITE_ROUTES)} write route(s)`
      );
      if (hasPocket !== true) return;

      // ---- the sessions, first, so the waiting one has time to block -----
      await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: PROJECT, names: [N.shell, N.gone] })}).then(() => true)`);
      writeFileSync(NEXT, 'talk', 'utf8');
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.talk)}, 'claude').then(() => true).catch(() => false)`);
      for (let i = 0; i < 60 && talkRecordPath() === null; i += 1) await sleep(500);
      rmSync(NEXT, { force: true });
      writeFileSync(NEXT, 'ask', 'utf8');
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.ask)}, 'claude').then(() => true).catch(() => false)`);

      // ---- D0: nothing to pin, nothing listening -------------------------
      const early = await pocket(cdp, 'beginPairing', { tailnetKey: KEY });
      const earlyView = await pocket(cdp, 'pairingState');
      arm(
        'D0 pairing is refused while the door is not listening',
        early.ok === false && !early.error.includes(KEY) && earlyView.ok && earlyView.value.state === 'idle' && !(await portAnswers()),
        `beginPairing answered ${early.ok ? 'an offer' : `a refusal (${early.error.slice(0, 160)})`}; the window is ${earlyView.value?.state ?? '?'}; nothing accepts on the port`
      );

      // ---- D1: turn it on, and nothing listens yet ------------------------
      const on = await pocket(cdp, 'setDoor', { on: true });
      await sleep(1_500);
      const listeningBeforeConfirm = await portAnswers();
      arm(
        'D1 turning on asks first and binds nothing',
        on.ok && on.value.state !== 'listening' && on.value.confirmState !== 'confirmed' && !listeningBeforeConfirm &&
          Array.isArray(on.value.confirmLines) && on.value.confirmLines.length > 0 && typeof on.value.confirmHash === 'string',
        `setDoor on answered state ${J(on.value?.state)}, confirmState ${J(on.value?.confirmState)}, ${String(on.value?.confirmLines?.length ?? 0)} line(s) to confirm; the port ${listeningBeforeConfirm ? 'ACCEPTS' : 'accepts nothing'}`
      );

      // ---- D2: confirm, and it listens ------------------------------------
      const confirmed = on.ok
        ? await pocket(cdp, 'confirmDoor', { linesRead: on.value.confirmLines, hashRead: on.value.confirmHash })
        : { ok: false, error: 'no status to confirm from' };
      const listening = await waitStatus(cdp, (s) => s.state === 'listening', 20_000);
      report.readings.listening = listening.status === null ? null : { state: listening.status.state, address: listening.status.address, port: listening.status.port, grant: listening.status.grant };
      arm(
        'D2 the confirm opens the door on loopback',
        confirmed.ok && confirmed.value.allowed === true && listening.ok && listening.status.address === '127.0.0.1' && listening.status.port === PORT && (await portAnswers()),
        `confirmDoor ${confirmed.ok ? `allowed=${String(confirmed.value.allowed)}` : `threw ${confirmed.error}`}; status ${J(report.readings.listening)}`
      );
      if (!listening.ok) return;

      // ---- K0: the keys that are refused ---------------------------------
      const huge = `tskey-auth-${'k'.repeat(10 * 1024)}`;
      const refusals = [];
      for (const [name, bad] of [
        ['a 10 KB key', huge],
        ['a key that does not start tskey-auth-', `tskeyauth-p313probe${randomBytes(12).toString('hex')}`],
        ['an API key rather than an auth key', `tskey-api-p313probe${randomBytes(12).toString('hex')}`]
      ]) {
        const got = await pocket(cdp, 'beginPairing', { tailnetKey: bad });
        const view = await pocket(cdp, 'pairingState');
        refusals.push({
          name,
          refused: got.ok === false,
          echoed: !got.ok && got.error.includes(bad.slice(0, 40)),
          window: view.value?.state ?? '?'
        });
      }
      report.readings.keyRefusals = refusals;
      arm(
        'K0 a key that is not the shape is refused with a sentence and opens nothing',
        refusals.every((r) => r.refused && !r.echoed && r.window === 'idle'),
        refusals.map((r) => `${r.name}: ${r.refused ? 'refused' : 'ACCEPTED'}${r.echoed ? ', and the refusal ECHOED it' : ''}, window ${r.window}`).join('; ')
      );

      // ---- K1 and F1: the offer ------------------------------------------
      const offered = await pocket(cdp, 'beginPairing', { tailnetKey: KEY });
      if (!offered.ok) {
        arm('K1 the offer', false, `beginPairing refused a well-formed key while listening: ${offered.error.slice(0, 200)}`);
        return;
      }
      const offer = JSON.parse(offered.value.payload);
      // NO REAL INTERFACE. The QR's host is asserted to be loopback before a
      // byte is sent to it; anything else ends the run here.
      if (offer.host !== '127.0.0.1' || offer.port !== PORT) {
        arm('the run', false, `the QR names ${J(offer.host)}:${J(offer.port)}, which is not this run's loopback door; nothing was dialled`);
        return;
      }
      const viewAfterOffer = await pocket(cdp, 'pairingState');
      const statusAfterOffer = await pocket(cdp, 'status');
      arm(
        'K1 the offer carries the key as tk, and nothing else the sheet reads does',
        offer.v === 2 && offer.tk === KEY && typeof offer.fp === 'string' && typeof offer.ps === 'string' &&
          viewAfterOffer.ok && !J(viewAfterOffer.value).includes(KEY) && statusAfterOffer.ok && !J(statusAfterOffer.value).includes(KEY),
        `payload v=${J(offer.v)}, keys ${J(Object.keys(offer).sort())}, tk ${offer.tk === KEY ? 'is the key' : 'is NOT the key'}; the window view ${J(viewAfterOffer.value ?? {}).includes(KEY) ? 'CARRIES the key' : 'does not carry it'}; the status ${J(statusAfterOffer.value ?? {}).includes(KEY) ? 'CARRIES the key' : 'does not carry it'}`
      );

      // THE PIN, the phone's way. Every request below is refused client side
      // unless the door's leaf hashes to the QR's `fp`.
      pinned = offer.fp;
      phone = makePhone('p313 phone', offer.dx);
      const presented = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, phone));
      const certSha = lastLeaf?.raw ? createHash('sha256').update(lastLeaf.raw).digest() : null;
      const x509Pin = lastLeaf?.raw ? b64u(createHash('sha256').update(new X509Certificate(lastLeaf.raw).publicKey.export({ type: 'spki', format: 'der' })).digest()) : null;
      arm(
        'F1 the QR pins the door’s PUBLIC KEY, not its certificate',
        presented.status === 200 && pinOf(lastLeaf) === offer.fp && x509Pin === offer.fp &&
          certSha !== null && offer.fp !== b64u(certSha) && offer.fp.toLowerCase() !== certSha.toString('hex'),
        `fp is ${String(offer.fp).length} characters; the leaf's point hashed the phone's way ${pinOf(lastLeaf) === offer.fp ? 'matches' : 'DOES NOT match'}, node's own SPKI export ${x509Pin === offer.fp ? 'matches' : 'DOES NOT match'}, and the certificate's own hash ${certSha !== null && (offer.fp === b64u(certSha) || offer.fp.toLowerCase() === certSha.toString('hex')) ? 'IS what the QR pins' : 'is not'}`
      );

      // ---- P1: present, match, allow --------------------------------------
      const state0 = parse(presented)?.state ?? 'none';
      const sheet = await pocket(cdp, 'pairingState');
      const allowed = sheet.ok && sheet.value.state === 'presented'
        ? await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash })
        : { ok: false, error: 'nothing presented' };
      const again = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, phone));
      arm(
        'P1 present, match the fingerprint on both screens, Allow',
        state0 === 'pending' && sheet.ok && sheet.value.fingerprint === phone.fingerprint && allowed.ok && allowed.value.allowed === true && (parse(again)?.state ?? '') === 'allowed',
        `presenting answered ${J(state0)}; the sheet's fingerprint ${sheet.value?.fingerprint === phone.fingerprint ? 'equals' : 'DIFFERS FROM'} the one the phone computed; Allow ${allowed.ok ? `answered allowed=${String(allowed.value.allowed)}` : `threw ${allowed.error}`}; presenting again answered ${J(parse(again)?.state ?? verdictOf(again))}`
      );

      // ---- P2: the photographed QR after Allow ----------------------------
      // UNDER LOOPBACK EVERY PHONE HAS THE SAME ADDRESS, so `present` answers a
      // second body from 127.0.0.1 with the allowed phone's own word (it asks the
      // address, and on a tailnet a second device has a second one). What this
      // arm holds is what that word is worth: the stranger is on no list and
      // reads nothing, the window's secret opened nothing for it, and once the
      // window shuts `/pair` is not a route at all.
      const viewAfterAllow = await pocket(cdp, 'pairingState');
      const stranger = makePhone('a photographed screen', offer.dx);
      const late = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, stranger));
      const strangerRead = await signedGet(stranger, '/v1/blocked');
      const phonesNow = await pocket(cdp, 'status');
      await pocket(cdp, 'cancelPairing');
      const dead = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, stranger));
      const listed = phonesNow.ok && Array.isArray(phonesNow.value.phones) ? phonesNow.value.phones.map((p) => p.id) : [];
      arm(
        'P2 after Allow the key is gone from the window and the QR is worth nothing',
        viewAfterAllow.ok && !J(viewAfterAllow.value).includes(KEY) && verdictOf(strangerRead) === 'refused-404' &&
          J(listed) === J([phone.id]) && verdictOf(dead) === 'refused-404',
        `the view after Allow ${J(viewAfterAllow.value ?? {}).includes(KEY) ? 'CARRIES the key' : 'does not carry it'}; a second phone with the same QR inside the window was answered ${J(parse(late)?.state ?? verdictOf(late))} and its signed read ${verdictOf(strangerRead)}; the sheet lists ${J(listed.length)} phone(s)${J(listed) === J([phone.id]) ? ', the allowed one' : ', NOT just the allowed one'}; after the window shut, /pair answered ${verdictOf(dead)}`
      );

      // ---- B1: the blocked list, with others ------------------------------
      let blockedAnswer = null;
      let sessions = [];
      const waitStarted = Date.now();
      for (;;) {
        sessions = await mainSessions(cdp);
        const askRow = sessions.find((s) => s.name === N.ask);
        if (askRow?.status === 'needs_input') break;
        if (Date.now() - waitStarted > 90_000) break;
        await sleep(1_000);
      }
      sessionsSeen = sessions;
      const askRow = sessions.find((s) => s.name === N.ask);
      const blocked = await read(phone, '/v1/blocked', 'blocked');
      blockedAnswer = parse(blocked);
      if (askRow?.status !== 'needs_input') {
        arm('B1 the blocked list', null, `${N.ask} never read needs_input in main within 90 s (it read ${J(askRow?.status)}), so the status monitor did not confirm the committed dialog; not a door reading`);
      } else if (blocked.status !== 200 || blockedAnswer === null) {
        arm('B1 the blocked list', false, `/v1/blocked answered ${verdictOf(blocked)}`);
      } else {
        const rows = Array.isArray(blockedAnswer.rows) ? blockedAnswer.rows : [];
        const others = Array.isArray(blockedAnswer.others) ? blockedAnswer.others : [];
        const row = rows.find((r) => r.sessionId === askRow.id);
        const blockedIds = new Set(rows.map((r) => r.sessionId));
        const wantOthers = sessions.filter((s) => !blockedIds.has(s.id)).map((s) => s.id).sort();
        const gotOthers = others.map((r) => r.sessionId).sort();
        const raised = (label) => (typeof label === 'string' && label.length > 0 ? label[0].toUpperCase() + label.slice(1) : label);
        const age = (since, now) => {
          const minutes = Math.floor(Math.max(0, now - since) / 60_000);
          if (minutes < 1) return 'now';
          if (minutes < 60) return `${String(minutes)}m`;
          const hours = Math.floor(minutes / 60);
          return hours < 24 ? `${String(hours)}h` : `${String(Math.floor(hours / 24))}d`;
        };
        report.readings.blocked = {
          rows: rows.length,
          others: others.length,
          othersOmitted: blockedAnswer.othersOmitted,
          statusTitle: row?.statusTitle,
          ageText: row?.ageText,
          choices: row?.choices?.length ?? 0,
          blockedSinceMinusCreatedAt: row === undefined ? null : row.blockedSince - askRow.createdAt,
          ageNote: blockedAnswer.ageNote
        };
        arm(
          'B1 the waiting session is the one row, in main’s words',
          row !== undefined && rows.length === 1 && row.statusLabel === 'needs input' && row.statusTitle === raised(row.statusLabel) &&
            row.statusTitle === 'Needs input' && (row.seenAtWake === true || row.ageText === age(row.blockedSince, blockedAnswer.at)) &&
            Array.isArray(row.choices) && row.choices.length > 0,
          `${String(rows.length)} row(s); ${N.ask} ${row === undefined ? 'is NOT one of them' : `reads ${J(row.statusLabel)} titled ${J(row.statusTitle)}, age ${J(row.ageText)} against ${J(age(row.blockedSince, blockedAnswer.at))} re-derived here, ${String(row.choices?.length ?? 0)} choice(s)`}`
        );
        arm(
          'B1b it blocked AFTER it was created, and the age says so',
          row !== undefined && typeof askRow.createdAt === 'number' && row.blockedSince > askRow.createdAt,
          row === undefined ? 'no row' : `blockedSince − createdAt = ${String(row.blockedSince - askRow.createdAt)} ms; a missing stamp falls back to createdAt and reads 0`
        );
        arm(
          'O1 others is exactly every listed session that is not blocked',
          J(gotOthers) === J(wantOthers) && gotOthers.every((id) => !blockedIds.has(id)) &&
            (OTHERS_MAX === null || others.length <= OTHERS_MAX) && blockedAnswer.othersOmitted === Math.max(0, wantOthers.length - (OTHERS_MAX ?? Infinity)) &&
            (AGE_NOTE === null || blockedAnswer.ageNote === AGE_NOTE),
          `main lists ${String(sessions.length)} session(s), ${String(rows.length)} blocked; others holds ${String(others.length)} (${gotOthers.length === wantOthers.length ? 'the same count' : `WANT ${String(wantOthers.length)}`}), ${J(gotOthers) === J(wantOthers) ? 'the same ids' : 'DIFFERENT ids'}; othersOmitted ${J(blockedAnswer.othersOmitted)}; ageNote ${blockedAnswer.ageNote === AGE_NOTE ? 'is Phase 314’s sentence' : `is ${J(blockedAnswer.ageNote)}`}`
        );
      }

      // ---- S1 and T1: the planted conversation ------------------------------
      const record = talkRecordPath();
      const talk = sessions.find((s) => s.name === N.talk);
      if (record === null || talk === undefined) {
        arm('S1 the planted conversation', null, `the fake claude never planted the record (${record === null ? 'no session id file' : 'no session row'})`);
      } else {
        report.readings.talk = { sessionId: talk.id, agentSessionId: talk.agentSessionId, recordMatches: talk.agentSessionId === record.sid };
        const detailAnswer = await read(phone, `/v1/session?id=${encodeURIComponent(talk.id)}`, 'session talk');
        const detail = parse(detailAnswer)?.session ?? null;
        arm(
          'S1 one session, with its counts and its last answer',
          detailAnswer.status === 200 && detail !== null && detail.turnCount > 0 && detail.activity !== null && typeof detail.activity === 'object' &&
            (detail.lastAnswer === null || typeof detail.lastAnswer === 'string') && detail.handoff === null &&
            (detail.lastMessageText === null) === (detail.activity.lastMessageAt === null),
          `/v1/session answered ${verdictOf(detailAnswer)}: ${detail === null ? 'no body' : `${String(detail.turnCount)} turn(s), activity ${detail.activity === null ? 'null' : 'present'}, last answer ${typeof detail.lastAnswer === 'string' ? `${String(detail.lastAnswer.length)} characters` : J(detail.lastAnswer)}, handoff ${J(detail.handoff)}, lastMessageText ${J(detail.lastMessageText)}`}`
        );
        const paged = await pageBack(phone, talk.id, 2, 'turns talk');
        const turns = paged.pages.slice().reverse().flatMap((p) => p.turns);
        const indexes = turns.map((t) => t.index);
        const contiguous = indexes.every((ix, i) => i === 0 || ix === indexes[i - 1] + 1);
        const overlapFree = new Set(indexes).size === indexes.length;
        const absenceOk = turns.every((t) => (t.answerText === null ? ABSENCES.includes(t.absence) : t.absence === null));
        report.readings.paged = { pages: paged.pages.length, turns: turns.length, first: indexes[0] ?? null, last: indexes[indexes.length - 1] ?? null, turnCount: detail?.turnCount ?? null };
        arm(
          'T1 paged back to the first turn, the count drawn equals the turn count',
          paged.ok && detail !== null && turns.length === detail.turnCount && contiguous && overlapFree && paged.pages[paged.pages.length - 1]?.more === false && absenceOk,
          `${String(paged.pages.length)} page(s) of at most 2, ${String(turns.length)} turn(s) against turnCount ${J(detail?.turnCount)}; indexes ${contiguous ? 'contiguous' : 'NOT contiguous'} and ${overlapFree ? 'never repeated' : 'REPEATED'}; every unanswered turn ${absenceOk ? 'carries one of the three absence sentences and every answered one none' : 'does NOT carry its absence sentence'}${paged.ok ? '' : `; ${paged.why}`}`
        );

        // ---- T2: append one turn, and the next read shows it -----------------
        const marker = `p313 appended ask ${randomBytes(4).toString('hex')}`;
        const reply = `p313 appended answer ${randomBytes(4).toString('hex')}, read back through the door`;
        appendTurn(record, 1, marker, reply);
        const fresh = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=1`, 'turns talk after append');
        const newest = parse(fresh)?.turns?.[0] ?? null;
        const again = parse(await read(phone, `/v1/session?id=${encodeURIComponent(talk.id)}`, 'session talk after append'))?.session ?? null;
        arm(
          'T2 a turn appended to the record is on the very next read, of the turns and of the session',
          fresh.status === 200 && newest !== null && newest.askText === marker && newest.answerText === reply &&
            again !== null && again.lastAnswer === reply && detail !== null && again.turnCount === detail.turnCount + 1,
          `the next /v1/turns answered ${verdictOf(fresh)} and its newest ask ${newest?.askText === marker ? 'IS the appended one' : `is ${J(String(newest?.askText ?? '').slice(0, 60))}`}; the next /v1/session's last answer ${again?.lastAnswer === reply ? 'IS the appended one' : 'is NOT'}, turnCount ${J(again?.turnCount)} after ${J(detail?.turnCount)}`
        );

        // ---- T3: a 4,000-character one-word ask, with no answer --------------
        const word = `p313${'w'.repeat(4_000 - 4)}`;
        appendTurn(record, 2, word, null);
        const long = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=1`, 'turns talk long ask');
        const longTurn = parse(long)?.turns?.[0] ?? null;
        arm(
          'T3 a 4,000-character one-word ask comes back whole, and its absence is said',
          long.status === 200 && longTurn !== null && longTurn.askText === word && longTurn.askClipped === false && longTurn.answerText === null && ABSENCES.includes(longTurn.absence),
          `answered ${verdictOf(long)}; the ask is ${String(longTurn?.askText?.length ?? 0)} characters (${longTurn?.askText === word ? 'byte for byte' : 'NOT the one written'}), clipped ${J(longTurn?.askClipped)}, absence ${J(longTurn?.absence)}`
        );

        // ---- A1: page indexes an attacker chooses -----------------------------
        // A PAGE THAT IS NOT A PAGE IS REFUSED, never guessed at: an index is a
        // plain non-negative safe integer and `from` is not past `to`
        // (`readTurnRange`). A limit is not an index: it is CLAMPED to the
        // store's own ceiling, so 2^53 answers at most 200 turns.
        const hostile = [];
        for (const [name, query, want] of [
          ['backwards', 'from=5&to=2', 'refused-404'],
          ['negative to', 'to=-5', 'refused-404'],
          ['negative from', 'from=-3&to=2', 'refused-404'],
          ['2^53', `to=${String(2 ** 53)}`, 'refused-404'],
          ['2^53 from', `from=${String(2 ** 53)}&to=${String(2 ** 53 + 2)}`, 'refused-404'],
          ['not a number', 'to=abc', 'refused-404'],
          ['a limit of 2^53', `limit=${String(2 ** 53)}`, 'ok']
        ]) {
          const got = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&${query}`, `turns hostile ${name}`);
          const body = parse(got);
          hostile.push({
            name,
            want,
            verdict: verdictOf(got),
            turns: Array.isArray(body?.turns) ? body.turns.length : null,
            bounded: body === null || !Array.isArray(body.turns) || body.turns.length <= 200,
            sane: body === null || !Array.isArray(body.turns) || body.turns.every((t) => Number.isSafeInteger(t.index) && t.index >= 0)
          });
        }
        // Two overlapping pages: the turns they share must be the same bytes.
        const pageA = parse(await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=3&to=4`, 'turns overlap a'));
        const pageB = parse(await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=3&to=5`, 'turns overlap b'));
        const shared = (pageA?.turns ?? []).filter((t) => (pageB?.turns ?? []).some((u) => u.index === t.index));
        const agree = shared.every((t) => J(t) === J((pageB?.turns ?? []).find((u) => u.index === t.index)));
        report.readings.hostilePages = { hostile, overlapShared: shared.length, overlapAgree: agree };
        arm(
          'A1 page indexes an attacker chooses are refused, a huge limit is clamped, and overlapping pages agree',
          hostile.every((h) => h.verdict === h.want && h.bounded && h.sane) && shared.length > 0 && agree,
          `${hostile.map((h) => `${h.name}: ${h.verdict}${h.verdict === h.want ? '' : ` (WANT ${h.want})`}${h.turns === null ? '' : ` with ${String(h.turns)} turn(s)`}`).join('; ')}; two overlapping pages share ${String(shared.length)} turn(s) and ${agree ? 'agree byte for byte' : 'DISAGREE'}`
        );
      }

      // ---- A2: a removed session, and a session with no record -------------
      const shell = sessions.find((s) => s.name === N.shell);
      const gone = sessions.find((s) => s.name === N.gone);
      if (gone !== undefined) {
        await cdpEval(cdp, `window.gmux.sessions.kill(${J(gone.id)}).then(() => true).catch(() => false)`);
        await sleep(1_500);
        await cdpEval(cdp, `window.gmux.sessions.discard(${J(gone.id)}).then(() => true).catch(() => false)`);
        await sleep(1_000);
      }
      const goneListed = (await mainSessions(cdp)).some((s) => s.id === gone?.id);
      const goneSession = gone === undefined ? null : await read(phone, `/v1/session?id=${encodeURIComponent(gone.id)}`, 'session removed');
      const goneTurns = gone === undefined ? null : await read(phone, `/v1/turns?id=${encodeURIComponent(gone.id)}`, 'turns removed');
      const shellTurns = shell === undefined ? null : await read(phone, `/v1/turns?id=${encodeURIComponent(shell.id)}`, 'turns shell');
      const shellBody = shellTurns === null ? null : parse(shellTurns);
      arm(
        'A2 a removed session is refused, and a session with no record answers an empty page',
        gone !== undefined && !goneListed && verdictOf(goneSession) === 'refused-404' && verdictOf(goneTurns) === 'refused-404' &&
          shellTurns !== null && shellTurns.status === 200 && Array.isArray(shellBody?.turns) && shellBody.turns.length === 0,
        `${N.gone} is ${goneListed ? 'STILL LISTED' : 'no longer listed'}; its /v1/session answered ${goneSession === null ? '?' : verdictOf(goneSession)} and its /v1/turns ${goneTurns === null ? '?' : verdictOf(goneTurns)}; ${N.shell}'s /v1/turns answered ${shellTurns === null ? '?' : verdictOf(shellTurns)} with ${J(shellBody?.turns?.length ?? null)} turn(s)`
      );
      arm('A2b a remote row’s turns', true, 'NOT DRIVEN HERE: no harness makes a second machine. conformance:pocket:hostile drives the shipping composer with a remote row and holds it to a note, never an error');
    } finally {
      cdp.close();
    }
  });
  if (AT_PARENT || phone === null) {
    ran = true;
  } else {
    // ======================================================================
    // LAUNCH 2 — the relaunch
    // ======================================================================
    await launch('p313-relaunch', async (handle) => {
      const cdp = await attach(150_000);
      try {
        if (!(await armed(cdp))) {
          arm('R1 the relaunch', null, 'the app never armed its bridge');
          return;
        }
        const up = await waitStatus(cdp, (s) => s.state === 'listening', 30_000);
        const reread = await read(phone, '/v1/blocked', 'blocked after relaunch');
        arm(
          'R1 the relaunch is listening with no press, and the paired phone still reads',
          up.ok && up.status.confirmState === 'confirmed' && reread.status === 200,
          `status ${J({ state: up.status?.state, confirmState: up.status?.confirmState, refusal: up.status?.refusal })}; /v1/blocked answered ${verdictOf(reread)}`
        );

        // ---- A3: a Remove INSIDE the composition, and refusal 7's reason ------
        // THE 316.1 REVERIFY'S NIT 2. The arm this replaces held the request's
        // body, so the Remove landed BEFORE verify and the request was refused
        // `shutdown` — which it also was at the pre-fix build, so it proved
        // nothing about the answer composed after the press. This one places
        // the Remove AFTER verify and BEFORE the answer is written, and reads
        // the refusal's own reason.
        //
        // HOW IT IS PLACED, with nothing but the app's own paths. The door's
        // composition awaits its refresh, and the refresh is `sessionActivity`,
        // whose calls run ONE AT A TIME on a chain that yields to the event loop
        // between the rows of a call. So the renderer asks `overview:activity`
        // for two conversations many times over, and a request that reaches
        // the composition waits on that chain across many turns of main's
        // loop, which is where a Remove can land. WHERE the request is, is READ
        // rather than timed: the request is sent twice with one nonce, the door
        // refuses the second sending `replay` only once the first has passed
        // verify, and the Remove is pressed only after main has printed that.
        const sessions = await mainSessions(cdp);
        const talk = sessions.find((s) => s.name === N.talk);
        const askRow = sessions.find((s) => s.name === N.ask);
        const REPLAY_LINE = /refused a request on the tailnet door: replay/;
        const UNPAIRED_LINE = /refused a request on the tailnet door: unpaired/;
        const readable = [talk, askRow].filter((s) => typeof s?.agentSessionId === 'string' && s.agentSessionId.length > 0);
        if (talk === undefined || readable.length < 2) {
          arm('A3 a Remove inside the composition', null, `the chain needs two sessions with a conversation id to yield between (${J(readable.map((s) => s.name))}), so the Remove could not be placed`);
        } else {
          const ids = readable.map((s) => s.id);
          const flood = (n) =>
            `(() => { const ids = ${J(ids)}; const at = performance.now(); window.__p313flood = Promise.all(Array.from({ length: ${String(n)} }, () => window.gmux.overview.activity({ sessionIds: ids }).catch(() => null))).then(() => performance.now() - at); return true; })()`;
          // The chain's own pace on this machine, measured, not assumed. The
          // hold aims INSIDE the stop's one second join of the request, so the
          // composed request is answered rather than cut: a 404 here, and at
          // the pre-fix build the 200 that was the defect. Measured on
          // 2026-09-23: a 1.2 s aim held the chain 0.66 s and still placed the
          // Remove; a 2 s aim held it 1.9 s and the join cut the request at
          // both builds. `P313_A3_HOLD_MS` moves the aim.
          const CALIBRATE = 1_000;
          await cdpEval(cdp, flood(CALIBRATE));
          const calibrationMs = Number(await cdpEval(cdp, 'window.__p313flood', 60_000));
          const perCall = Math.max(0.02, calibrationMs / CALIBRATE);
          const TARGET_MS = Number(process.env['P313_A3_HOLD_MS'] ?? '') || 1_200;
          const calls = Math.min(20_000, Math.max(200, Math.ceil(TARGET_MS / perCall)));
          const target = `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=200`;
          const twice = signedTwice(phone, target);
          const textBefore = handle.text().length;
          await cdpEval(cdp, flood(calls));
          const first = twice.send();
          await first.written;
          const second = twice.send();
          let replayed = false;
          try {
            await handle.waitForLine(REPLAY_LINE, Math.max(5_000, TARGET_MS * 3));
            replayed = REPLAY_LINE.test(handle.text().slice(textBefore));
          } catch {
            replayed = false;
          }
          // AT THE PRESS: which sending is still in flight. Main prints the
          // replay line BEFORE that refusal's 404 has reached this client, so
          // the probe waits (bounded) for one sending to settle; the other is
          // the one inside the composition, and it must not have been answered.
          if (replayed) {
            const waitedFrom = Date.now();
            while (first.settled === second.settled && Date.now() - waitedFrom < 3_000) await sleep(5);
          }
          const pendingAtPress = [first, second].filter((x) => !x.settled);
          const removing = pocket(cdp, 'removePhone', phone.id);
          const [removed, a1, a2] = await Promise.all([removing, first.answer, second.answer]);
          const floodMs = Number(await cdpEval(cdp, 'window.__p313flood', 120_000).catch(() => NaN));
          const composed = pendingAtPress.length === 1 ? (pendingAtPress[0] === first ? a1 : a2) : null;
          let reason = false;
          try {
            await handle.waitForLine(UNPAIRED_LINE, 10_000);
            reason = UNPAIRED_LINE.test(handle.text().slice(textBefore));
          } catch {
            reason = false;
          }
          answers.push({ label: 'turns composed while Remove was pressed', target, status: composed?.status ?? null, body: composed?.body ?? '' });
          const after = await read(phone, '/v1/blocked', 'blocked after remove');
          const statusAfter = await pocket(cdp, 'status');
          report.readings.a3 = {
            calibrationMs,
            calls,
            floodMs,
            replayed,
            pendingAtPress: pendingAtPress.length,
            first: verdictOf(a1),
            second: verdictOf(a2),
            composed: composed === null ? null : verdictOf(composed),
            refusal7Reason: reason
          };
          const placed = replayed && pendingAtPress.length === 1;
          const said =
            `the chain held ${String(calls)} activity call(s) for ${Number.isFinite(floodMs) ? `${String(Math.round(floodMs))} ms` : '?'} (calibrated at ${String(Math.round(calibrationMs))} ms per ${String(CALIBRATE)}); ` +
            `the replay was ${replayed ? 'refused, so one sending had passed verify' : 'NOT seen'}; ${String(pendingAtPress.length)} sending(s) in flight at the press; ` +
            `removePhone ${removed.ok ? 'answered' : `threw ${removed.error}`}; the sendings settled ${verdictOf(a1)} and ${verdictOf(a2)}; the composed one ${composed === null ? 'is unknown' : verdictOf(composed)}; ` +
            `main ${reason ? 'printed' : 'did NOT print'} refusal 7's reason (unpaired); the next /v1/blocked answered ${verdictOf(after)}; ` +
            `the sheet lists ${J(statusAfter.value?.phones?.length ?? null)} phone(s), state ${J(statusAfter.value?.state)}, confirmState ${J(statusAfter.value?.confirmState)}`;
          if (!placed) {
            // Never a pass: the Remove was not shown to land inside the
            // composition, so this reading says nothing about refusal 7.
            arm('A3 a Remove inside the composition', null, `the Remove could not be PLACED after verify on this run: ${said}`);
          } else {
            // A 200 is the defect itself: an answer read from the store after
            // the person pressed Remove. A request refused before verify would
            // say `shutdown` (the Remove stops the door in the same task), so
            // `unpaired` here is refusal 7 and nothing else.
            const settled = composed.status === 404 || (composed.status === 0 && !/timed out/.test(composed.error ?? ''));
            arm(
              'A3 a Remove after verify and before the answer: refused by refusal 7 for its own reason, never answered',
              removed.ok && settled && reason && verdictOf(after) !== 'ok' &&
                statusAfter.ok && Array.isArray(statusAfter.value.phones) && statusAfter.value.phones.length === 0 &&
                statusAfter.value.state !== 'listening' && statusAfter.value.confirmState !== 'confirmed',
              said
            );
          }
        }
      } finally {
        cdp.close();
      }
    });

    // ======================================================================
    // LAUNCH 3 — nothing is confirmed any more
    // ======================================================================
    let exitedCleanly = null;
    await launch('p313-unconfirmed', async (handle) => {
      const cdp = await attach(150_000);
      try {
        if (!(await armed(cdp))) {
          arm('L1 the unconfirmed relaunch', null, 'the app never armed its bridge');
          return;
        }
        // Long enough for any launch step to have run and bound.
        await sleep(6_000);
        const got = await pocket(cdp, 'status');
        const s = got.ok ? got.value : null;
        const accepts = await portAnswers();
        // `refused` is the state of a door that is ON and not listening; `off`
        // would mean `enabled` was lost, which is a different defect.
        arm(
          'L1 enabled and bindAtLaunch with no agreement: the relaunch does not bind, and says why',
          s !== null && s.bindAtLaunch === true && s.state === 'refused' && s.confirmState !== 'confirmed' &&
            typeof s.refusal === 'string' && s.refusal.length > 0 && !accepts,
          `status ${J({ state: s?.state, bindAtLaunch: s?.bindAtLaunch, confirmState: s?.confirmState, refusal: s?.refusal })}; the port ${accepts ? 'ACCEPTS' : 'accepts nothing'}`
        );

        // ---- A4: setDoor during quit --------------------------------------
        // The quit is asked for FIRST, through the app's own renderer-confirmed
        // quit, and the switch is pressed in the same task, so the press lands
        // while the ordered disposer is closing the door's admission.
        await cdpEval(
          cdp,
          `(() => { try { window.gmux.quit(); } catch {} ; window.gmux.pocket.setDoor({ on: false }).catch(() => null); window.gmux.pocket.setDoor({ on: true }).catch(() => null); window.gmux.pocket.confirmDoor(${J({ linesRead: s?.confirmLines ?? [], hashRead: s?.confirmHash ?? '' })}).catch(() => null); return true; })()`,
          10_000
        ).catch(() => null);
        const code = await Promise.race([handle.exited, sleep(30_000).then(() => null)]);
        exitedCleanly = code;
      } finally {
        cdp.close();
      }
    });
    const afterQuit = await portAnswers();
    arm(
      'A4 setDoor during quit: the app exits and nothing listens afterwards',
      exitedCleanly !== null && !afterQuit,
      `the app ${exitedCleanly === null ? 'did NOT exit on its own within 30 s' : `exited with ${String(exitedCleanly)}`}; the port ${afterQuit ? 'ACCEPTS' : 'accepts nothing'} afterwards`
    );
    ran = true;
  }
} catch (err) {
  if (String(err?.message ?? err) !== 'port taken') arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
} finally {
  // The fake claude's loops end on this file whatever the teardown did.
  try {
    writeFileSync(STOP, 'stop\n', 'utf8');
  } catch {
    /* the world may already be gone */
  }
}

// ---- K2: the key's bytes, anywhere -------------------------------------------
if (!AT_PARENT && ran) {
  const needles = [
    [Buffer.from(KEY, 'utf8'), 'the key as UTF-8'],
    [Buffer.from(KEY, 'utf16le'), 'the key as UTF-16'],
    [Buffer.from(KEY.slice(11), 'utf8'), 'the key without its prefix']
  ];
  const scanned = [HARNESS, HOME].map((root) => filesHolding(root, needles));
  const hits = scanned.flatMap((s) => s.hits);
  const files = scanned.reduce((n, s) => n + s.files, 0);
  const printed = appText.includes(KEY) || appText.includes(KEY.slice(11));
  report.readings.keyScan = { files, hits, printed };
  arm(
    'K2 the key is in no file and in nothing the app printed',
    files > 0 && hits.length === 0 && !printed,
    `${String(files)} file(s) under the profile, the harness directory and the scratch HOME read; ${hits.length === 0 ? 'none holds the key' : `the key is in ${J(hits)}`}; the app's own output ${printed ? 'CARRIES it' : 'does not'}`
  );
}

// ---- what the verifier's re-derivation reads, kept only on request -------------
if (KEEP) {
  mkdirSync(join(RUN, 'rederive'), { recursive: true });
  writeFileSync(
    join(RUN, 'rederive', 'answers.json'),
    `${J(
      {
        note: 'Synthetic: every session, turn and phone here is this run’s own. build/p316/SPEC.md S1 Method A reads this with the scratch profile’s databases.',
        profile: PROFILE,
        home: HOME,
        sessions: sessionsSeen,
        answers: answers.map((a) => ({ ...a, body: unkeyed(a.body) }))
      },
      null,
      1
    )}\n`,
    { mode: 0o600 }
  );
  say(`kept the scratch world at ${RUN}; the re-derivation reads ${join(RUN, 'rederive', 'answers.json')}`);
} else {
  rmSync(RUN, { recursive: true, force: true });
}

// ---- Electron, counted once, at the end ------------------------------------------
const commandOf = (pid) => (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
// CLAUDE.md: the main process renames itself `Tortie` and carries NO argument,
// so a search for the profile misses it. It is found by the pids this run's
// last launch started: the app itself, or anything whose parent is the shim.
const ours = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  if (appPid > 0 && (pid === appPid || ppid === appPid)) return true;
  if (shimPid > 0 && (pid === shimPid || ppid === shimPid)) return true;
  return commandOf(pid).includes(PROFILE);
});
report.readings.electron = { lines: electronLines.length, ofThisRun: ours.length };
arm(
  'no Electron of this run is left',
  ours.length === 0,
  `${String(electronLines.length)} Electron line(s) on the machine (the operator’s own Tortie included), ${String(ours.length)} of this run`
);

const OUT = join(ROOT, 'out', 'p313');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p313${AT_PARENT ? '-parent' : ''}.json`);
writeFileSync(outFile, `${unkeyed(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${outFile}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (AT_PARENT && failures === 0) {
  say('probe:p313 at the parent: the parent reading is taken');
  process.exit(0);
}
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p313 could not READ ${String(unreadable)} arm(s) at this build; that is not a pass`);
  process.exit(2);
}
say(!ran ? 'probe:p313 did not complete' : failures === 0 ? 'probe:p313 OK' : `probe:p313 FAILED ${String(failures)} arm(s)`);
process.exit(ran && failures === 0 ? 0 : 1);
