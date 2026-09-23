#!/usr/bin/env node
/**
 * build/p316/hostile-door.mjs — a door that is not Tortie's, for `probe:p316`'s
 * attack (Phase 316.2, build/p316/SPEC.md §4 S2, Method B), and the loopback
 * stand-ins for its ATS arm.
 *
 * WHY IT EXISTS. The phone app draws a person's words from a network answer it
 * must not trust. Tortie's own door never sends a 10 MiB row, an unknown
 * status word, pages that go backwards or an answer that never completes, so
 * the only way to see what the app does with one is a door that does. Paired
 * through the DEBUG payload injection, the app is pointed at this door instead
 * of the Mac's, and every arm must end in a DRAWN SENTENCE with the app's
 * process still alive and no half-drawn screen. The honest arm is in the same
 * table: a door that refuses everything proves a client that is off, so the
 * control must draw the list.
 *
 * THE ARMS (`serve --arm <name>`):
 *   honest           the control. The answers `ios/TortieTests/Fixtures/vectors.json`
 *                    holds, composed by the SHIPPING route composer, with the
 *                    conversation paged honestly for any `to` and `limit`
 *
 *   THE LIST ARMS answer the FIRST signed `/v1/blocked` honestly and every one
 *   after it with their hostile body (Phase 316.2's fix round). The first
 *   signed read is the one pairing makes, and pairing already refuses any
 *   answer it cannot read with its own sentence; served there, these arms only
 *   ever drove the pairing screen, and the list's own failure path (a paired
 *   phone whose refresh comes back too large, unreadable or never) was never
 *   reached. So the app pairs, draws the list, and meets the body on its pull
 *   to refresh:
 *   huge-row         `/v1/blocked` is one row whose question is 10 MiB (a list
 *                    arm)
 *   unknown-status   a status word the Mac never says
 *   unknown-dot      a dot name that is not one of the five
 *   wrong-key        the TLS key is not the one the QR pins: the app must stop at
 *                    the handshake, and the door must have served 0 requests
 *   pair-word        `/pair` answers a word that is not pending, allowed or refused
 *   pages-backwards  the older page's indexes go forwards again
 *   pages-overlap    the older page repeats the newest page's first turn
 *   more-forever     `more: true` on an older page that adds nothing
 *   more-negative    `more: true` forever, every page as long as the `limit`
 *                    asked, so the page asked for below index 20 runs below zero
 *   long-ask         the newest turn's ask is one 4,000-character word (drawn
 *                    whole, not refused: it is a legal answer)
 *   malformed        `/v1/blocked` is not JSON (a list arm)
 *   missing-fields   `/v1/blocked`'s rows lack fields the contract requires (a
 *                    list arm)
 *   never-completes  `/v1/blocked` sends its headers and part of a body, then
 *                    nothing, forever (a list arm)
 *   ats              the ATS arm's two stand-ins: an https door whose
 *                    certificate names 100.64.0.1, issued by Tortie's own
 *                    src/main/pocket/tls.ts the way SPEC §3.2 measured it, on
 *                    127.0.0.1; and a SOCKS5 server on 127.0.0.1 that answers
 *                    a CONNECT to 100.64.0.1 (ATYP=1) and to nothing else by
 *                    splicing it to that door. With `allowFailover` off in the
 *                    app, no packet goes to the 100.64/10 range at all.
 *
 * HOW IT RUNS. As its OWN PROCESS under the pinned tsx: `probe:p316` starts it
 * with `spawn`, reads one `P316_DOOR:{…}` line (the ports, the pin, the QR
 * payload the app is handed), reads `P316_DOOR_EVENT:{…}` lines as requests
 * arrive, and ends it in a `finally`. A door in the probe's own process would
 * starve beside a synchronous exec (SPEC §3.4 pitfall b); a door in its own
 * process cannot. It ends itself on SIGTERM, SIGINT, SIGHUP, and when its
 * stdin closes, so a parent that dies cannot orphan it.
 *
 * `--self-test` drives every arm with build/p316/node-phone.mjs — no Simulator
 * — and asserts the door serves what the arm claims, including the SOCKS5
 * stand-in refusing a CONNECT to anything but 100.64.0.1.
 *
 * LOOPBACK ONLY: every listener binds 127.0.0.1, and the SOCKS5 stand-in dials
 * 127.0.0.1 and nothing else. It logs no key, no signature and no body: an
 * event names the method, the path, the arm, the signature's verdict as one
 * word, the status and the byte count. The tailnet key in its QR is made up.
 *
 *   node build/p316/hostile-door.mjs --self-test
 *   node build/p316/hostile-door.mjs serve --arm honest      (under tsx; the probe does this)
 */

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { connect as netConnect, createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';
import {
  b64u,
  fingerprintOf,
  makePhone,
  openPresentation,
  pageBack,
  pinOfPem,
  pinOfPeer,
  present,
  sealPresentation,
  signedGet,
  socksTls,
  verifySigned
} from './node-phone.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const TAG = '[p316 hostile door]';
const INNER = 'P316_HOSTILE_INNER';
const J = JSON.stringify;

/**
 * The arms, and what each expects the app to end in. An arm that ends in a
 * sentence names WHERE it is drawn (`at`, an accessibility identifier from
 * ios/Tortie/Screens/Identifiers.swift) and WHICH it is (`expect`, the names of
 * the `Copy.swift` words it may be), so the probe judges the sentence itself
 * and not merely that one was drawn. `list: true` marks a list arm: its
 * hostile body waits for the list's second read.
 */
export const HOSTILE_ARMS = Object.freeze({
  honest: { what: 'the control: an honest door', ends: 'drawn' },
  'huge-row': { what: 'a 10 MiB row on the list\'s refresh', ends: 'sentence', list: true, at: 'list-failure', expect: ['answerTooLarge'] },
  // DRAWN, NOT REFUSED (integrator, Phase 316.2). The status word and its
  // raised title are main's own words, and the phone draws main's words and
  // computes nothing from them (SPEC §4.0), so a word this build has never seen
  // is drawn as it arrived and an unknown dot is drawn as a ring with no colour
  // of its own. Refusing the list over it would make every status word a later
  // Mac adds a phone-breaking change. SPEC §4 S2's Method B listed both among
  // the arms that "end in a drawn sentence"; build/p316/SPEC.md §As built — 316.2
  // records the departure.
  'unknown-status': { what: 'a status word the Mac never says, drawn as main wrote it', ends: 'drawn' },
  'unknown-dot': { what: 'a dot name that is not one of the five, drawn as a neutral ring', ends: 'drawn' },
  'wrong-key': { what: 'a public key that does not match the pin', ends: 'sentence', at: 'pairing-line', expect: ['keyMismatch'] },
  'pair-word': { what: 'a /pair answer that is not one of its three words', ends: 'sentence', at: 'pairing-line', expect: ['pairAnswerUnknown'] },
  'pages-backwards': { what: 'older pages whose indexes go forwards again', ends: 'sentence', at: 'conversation-older-line', expect: ['earlierTurnsUnreadable'] },
  'pages-overlap': { what: 'an older page that overlaps the newest', ends: 'sentence', at: 'conversation-older-line', expect: ['earlierTurnsUnreadable'] },
  'more-forever': { what: 'more: true on a page that adds nothing', ends: 'sentence', at: 'conversation-older-line', expect: ['earlierTurnsUnreadable'] },
  'more-negative': { what: 'more: true forever, indexes below zero', ends: 'sentence', at: 'conversation-older-line', expect: ['earlierTurnsUnreadable'] },
  'long-ask': { what: 'a 4,000-character one-word ask', ends: 'drawn' },
  malformed: { what: 'an answer that is not JSON, on the list\'s refresh', ends: 'sentence', list: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'missing-fields': { what: 'rows missing fields the contract requires, on the list\'s refresh', ends: 'sentence', list: true, at: 'list-failure', expect: ['answerUnreadable'] },
  // The client's 15 s limit, then the list's own words for it.
  'never-completes': { what: 'an answer that never completes, on the list\'s refresh', ends: 'sentence', list: true, at: 'list-failure', expect: ['macDidNotAnswer'] },
  ats: { what: 'a door at 100.64.0.1 behind a loopback SOCKS5 stand-in', ends: 'ats' }
});

/** The made-up tailnet key the QR carries. No Tailscale server has ever seen it. */
export const MADE_UP_KEY = `tskey-auth-kP316hostile-${'0'.repeat(24)}`;
const HUGE_BYTES = 10 * 1024 * 1024;
/** The raised word the `unknown-status` arm sends; the probe looks for it on the drawn rows. */
export const UNKNOWN_STATUS_TITLE = 'Levitating';
const LONG_ASK = `p316${'w'.repeat(4_000 - 4)}`;

// ---------------------------------------------------------------------------
// Under tsx, so Tortie's own tls.ts can issue the certificates
// ---------------------------------------------------------------------------

/** The argv that runs this file under the pinned tsx, for a parent to spawn. */
export function hostileDoorArgv(args) {
  return [tsxCli(), '--tsconfig', 'tsconfig.node.json', HERE, ...args];
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && process.env[INNER] !== '1') {
  // A person ran it with plain node: hand it to tsx, in the foreground, and
  // wait. `serve` is always started under tsx by its parent, never through here.
  const r = spawnSync(process.execPath, hostileDoorArgv(process.argv.slice(2)), {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, [INNER]: '1' },
    timeout: 600_000
  });
  process.exit(r.status ?? 1);
}

/** One identity from src/main/pocket/tls.ts, covering `addresses`, sealed by nothing, in scratch. */
async function issueIdentity(addresses, scratch, name) {
  const tls = await import(pathToFileURL(join(ROOT, 'src', 'main', 'pocket', 'tls.ts')).href);
  const outcome = tls.ensureDoorIdentity({
    path: join(scratch, `${name}.json`),
    seal: { available: () => true, seal: (text) => text, open: (blob) => (typeof blob === 'string' ? blob : null) },
    names: { addresses, dnsNames: [] }
  });
  if (outcome.kind !== 'ready') throw new Error(`tls.ts refused to issue an identity: ${outcome.sentence}`);
  return { key: outcome.identity.keyPem, cert: outcome.identity.certPem, pin: pinOfPem(outcome.identity.certPem), sans: outcome.identity.subjectAltNames };
}

// ---------------------------------------------------------------------------
// The honest world, from the answers the shipping composer wrote
// ---------------------------------------------------------------------------

function honestWorld() {
  const file = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
  let vectors;
  try {
    vectors = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`the honest world is the answers in ${file}, and it could not be read: ${String(err?.message ?? err)}`);
  }
  const answer = (name) => {
    const text = vectors?.answers?.[name]?.json;
    if (typeof text !== 'string') throw new Error(`${file} holds no answers.${name}.json, which the honest door serves`);
    return JSON.parse(text);
  };
  const blocked = answer('blocked');
  const session = answer('session-talk');
  const newest = answer('turns-newest');
  const template = newest.turns?.[0];
  if (template === undefined) throw new Error(`${file}'s answers.turns-newest has no turn to model the conversation on`);
  const count = Number.isSafeInteger(session.session?.turnCount) && session.session.turnCount > 0 ? session.session.turnCount : 26;
  const turns = [];
  for (let i = 0; i < count; i += 1) {
    turns.push({ ...template, index: i, askText: `p316 ask ${String(i)} **x**`, answerText: `p316 answer ${String(i)} **x**`, absence: null });
  }
  return { blocked, session, turns, sessionId: session.session.sessionId, at: newest.at };
}

/** An honest page, the way the door's reader cuts one. */
function honestPage(world, query) {
  const limit = Math.max(1, Math.min(200, Number(query.get('limit') ?? 20) || 20));
  const toRaw = query.get('to');
  const to = toRaw === null ? world.turns.length - 1 : Number(toRaw);
  const upto = world.turns.filter((t) => t.index <= to);
  const page = upto.slice(Math.max(0, upto.length - limit));
  const more = page.length > 0 && page[0].index > 0;
  return { sessionId: world.sessionId, turns: page, more, at: world.at, note: null };
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

/**
 * Start one arm's door on 127.0.0.1. Returns its facts and a `close()`. `emit`
 * receives one event per request and per SOCKS CONNECT.
 */
export async function startHostileDoor(arm, emit = () => undefined) {
  if (!Object.prototype.hasOwnProperty.call(HOSTILE_ARMS, arm)) throw new Error(`no arm named ${arm}; the arms are ${Object.keys(HOSTILE_ARMS).join(', ')}`);
  const scratch = mkdtempSync(join(tmpdir(), 'p316-hostile-'));
  const sockets = new Set();
  const servers = [];
  const counts = { requests: 0, handshakes: 0, connects: 0 };
  const closeAll = async () => {
    for (const s of sockets) s.destroy();
    await Promise.all(servers.map((s) => new Promise((r) => s.close(() => r()))));
    rmSync(scratch, { recursive: true, force: true });
  };
  try {
    const world = arm === 'ats' ? null : honestWorld();
    const pinned = await issueIdentity(arm === 'ats' ? ['100.64.0.1'] : ['127.0.0.1'], scratch, 'door');
    const served = arm === 'wrong-key' ? await issueIdentity(['127.0.0.1'], scratch, 'impostor') : pinned;
    const doorSign = generateKeyPairSync('ed25519');
    const doorX = generateKeyPairSync('x25519');
    const dk = b64u(doorSign.publicKey.export({ type: 'spki', format: 'der' }));
    const dx = b64u(doorX.publicKey.export({ type: 'spki', format: 'der' }));
    const ps = b64u(randomBytes(16));
    let phone = null;
    let presentations = 0;
    /** Signed `/v1/blocked` reads answered; a list arm answers the first honestly. */
    let blockedReads = 0;

    const send = (res, status, body, event) => {
      const bytes = Buffer.byteLength(body);
      res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(bytes), 'cache-control': 'no-store' });
      res.end(body);
      emit({ kind: 'request', arm, ...event, status, bytes });
    };

    const handler = (req, res) => {
      counts.requests += 1;
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const url = new URL(req.url ?? '/', 'https://door.invalid');
        const route = `${req.method} ${url.pathname}`;
        if (route === 'POST /pair') {
          presentations += 1;
          if (arm === 'ats') return send(res, 200, J({ state: 'pending' }), { route });
          const opened = openPresentation(ps, body);
          if (opened === null) return send(res, 200, J({ state: 'refused' }), { route, sealed: 'refused' });
          phone = opened;
          if (arm === 'pair-word') return send(res, 200, J({ state: 'granted' }), { route, sealed: 'opened' });
          // The person "allows" on the second presentation, the way the real
          // door answers `pending` until the Allow and `allowed` after it.
          return send(res, 200, J({ state: presentations === 1 ? 'pending' : 'allowed' }), { route, sealed: 'opened', fingerprint: fingerprintOf(opened.signingKey, opened.exchangeKey) });
        }
        if (req.method !== 'GET' || !['/v1/blocked', '/v1/session', '/v1/turns'].includes(url.pathname) || world === null) {
          return send(res, 404, '{}', { route });
        }
        const verified = verifySigned({
          method: req.method,
          target: req.url ?? '',
          headers: req.headers,
          body,
          phone,
          doorExchangePrivate: doorX.privateKey,
          doorExchangeKey: dx
        });
        if (verified !== 'ok') return send(res, 404, '{}', { route, verified });
        const event = { route, verified };
        if (url.pathname === '/v1/blocked') {
          blockedReads += 1;
          const answer = structuredClone(world.blocked);
          // The first signed read is pairing's: a list arm answers it
          // honestly, so the app pairs and its LIST meets the body.
          if (HOSTILE_ARMS[arm].list === true && blockedReads === 1) return send(res, 200, J(answer), { ...event, honestFirst: true });
          if (arm === 'huge-row') {
            const row = { ...answer.rows[0], question: 'q'.repeat(HUGE_BYTES) };
            return send(res, 200, J({ ...answer, rows: [row] }), event);
          }
          if (arm === 'unknown-status') {
            for (const r of [...answer.rows, ...answer.others]) r.statusLabel = 'levitating';
            for (const r of [...answer.rows, ...answer.others]) r.statusTitle = UNKNOWN_STATUS_TITLE;
          }
          if (arm === 'unknown-dot') for (const r of [...answer.rows, ...answer.others]) r.statusDot = 'plaid';
          if (arm === 'malformed') return send(res, 200, `${J(answer).slice(0, 40)}`, event);
          if (arm === 'missing-fields') {
            for (const r of [...answer.rows, ...answer.others]) {
              delete r.statusLabel;
              delete r.sessionId;
            }
          }
          if (arm === 'never-completes') {
            res.writeHead(200, { 'content-type': 'application/json', 'content-length': '100000' });
            res.write('{"rows":[');
            emit({ kind: 'request', arm, ...event, status: 200, bytes: 9, held: true });
            return;
          }
          return send(res, 200, J(answer), event);
        }
        if (url.pathname === '/v1/session') {
          if (url.searchParams.get('id') !== world.sessionId) {
            const other = [...world.blocked.rows, ...world.blocked.others].find((r) => r.sessionId === url.searchParams.get('id'));
            if (other === undefined) return send(res, 404, '{}', event);
            return send(res, 200, J({ session: { ...world.session.session, ...other }, at: world.at }), event);
          }
          return send(res, 200, J(world.session), event);
        }
        // /v1/turns
        const page = honestPage(world, url.searchParams);
        const first = url.searchParams.get('to') === null;
        if (arm === 'long-ask' && first && page.turns.length > 0) {
          page.turns[page.turns.length - 1] = { ...page.turns[page.turns.length - 1], askText: LONG_ASK, askClipped: false };
        }
        if (!first) {
          if (arm === 'pages-backwards') page.turns = page.turns.map((t) => ({ ...t, index: t.index + page.turns.length + 1 }));
          if (arm === 'pages-overlap') page.turns = page.turns.map((t) => ({ ...t, index: t.index + 1 }));
          if (arm === 'more-forever') {
            page.turns = [];
            page.more = true;
          }
        }
        if (arm === 'more-negative') {
          // Every page is as long as the `limit` asked for, so the page asked
          // for below index `limit` runs below zero. (The first build cut each
          // page to the honest page's length, which never goes below zero when
          // the asker is the app: the app stopped quietly at index 0.)
          const to = first ? world.turns.length - 1 : Number(url.searchParams.get('to'));
          const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 20) || 20));
          page.turns = Array.from({ length: limit }, (_, k) => ({ ...world.turns[0], index: to - limit + 1 + k }));
          page.more = true;
        }
        return send(res, 200, J(page), event);
      });
    };

    const door = createHttpsServer({ key: served.key, cert: served.cert, minVersion: 'TLSv1.2' }, handler);
    door.on('secureConnection', () => {
      counts.handshakes += 1;
    });
    door.on('connection', (s) => {
      sockets.add(s);
      s.on('close', () => sockets.delete(s));
    });
    servers.push(door);
    await new Promise((r, j) => {
      door.once('error', j);
      door.listen(0, '127.0.0.1', () => r());
    });
    const port = door.address().port;

    let socksPort = null;
    if (arm === 'ats') {
      // THE SOCKS5 STAND-IN. It answers exactly one destination, 100.64.0.1 at
      // the door's own port, written as ATYP=1 (an IPv4 literal), and splices
      // it to the door on 127.0.0.1. Anything else is refused with REP=2
      // ("connection not allowed by ruleset") and never dialled.
      const socks = createNetServer((client) => {
        sockets.add(client);
        client.on('close', () => sockets.delete(client));
        client.on('error', () => undefined);
        let buf = Buffer.alloc(0);
        let stage = 'greet';
        const onData = (chunk) => {
          buf = Buffer.concat([buf, chunk]);
          if (stage === 'greet') {
            if (buf.length < 2 || buf.length < 2 + buf[1]) return;
            const methods = buf.subarray(2, 2 + buf[1]);
            buf = buf.subarray(2 + buf[1]);
            if (!methods.includes(0)) {
              client.end(Buffer.from([5, 0xff]));
              return;
            }
            client.write(Buffer.from([5, 0]));
            stage = 'request';
          }
          if (stage === 'request') {
            if (buf.length < 4) return;
            const atyp = buf[3];
            let host = null;
            let at = 4;
            if (atyp === 1) {
              if (buf.length < 10) return;
              host = [...buf.subarray(4, 8)].join('.');
              at = 8;
            } else if (atyp === 3) {
              if (buf.length < 5 || buf.length < 5 + buf[4] + 2) return;
              host = buf.subarray(5, 5 + buf[4]).toString('utf8');
              at = 5 + buf[4];
            } else if (atyp === 4) {
              if (buf.length < 22) return;
              host = buf.subarray(4, 20).toString('hex');
              at = 20;
            }
            const dport = buf.readUInt16BE(at);
            const allowed = buf[1] === 1 && atyp === 1 && host === '100.64.0.1' && dport === port;
            counts.connects += 1;
            emit({ kind: 'socks', arm, atyp, host, port: dport, allowed });
            client.removeListener('data', onData);
            if (!allowed) {
              client.end(Buffer.from([5, 2, 0, 1, 0, 0, 0, 0, 0, 0]));
              return;
            }
            const upstream = netConnect({ host: '127.0.0.1', port }, () => {
              client.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, (port >> 8) & 0xff, port & 0xff]));
              const rest = buf.subarray(at + 2);
              if (rest.length > 0) upstream.write(rest);
              client.pipe(upstream);
              upstream.pipe(client);
            });
            sockets.add(upstream);
            upstream.on('close', () => {
              sockets.delete(upstream);
              client.destroy();
            });
            upstream.on('error', () => client.destroy());
            stage = 'spliced';
          }
        };
        client.on('data', onData);
      });
      servers.push(socks);
      await new Promise((r, j) => {
        socks.once('error', j);
        socks.listen(0, '127.0.0.1', () => r());
      });
      socksPort = socks.address().port;
    }

    const exp = Date.now() + 3 * 60_000;
    const payload = arm === 'ats' ? null : J({ v: 2, host: '127.0.0.1', port, fp: pinned.pin, dk, dx, ps, exp, tk: MADE_UP_KEY });
    return {
      arm,
      port,
      pin: pinned.pin,
      servedPin: served.pin,
      sans: pinned.sans,
      payload,
      dx,
      ps,
      socksPort,
      atsHost: arm === 'ats' ? '100.64.0.1' : null,
      sessionToOpen: world?.sessionId ?? null,
      turnCount: world?.turns.length ?? null,
      counts,
      phone: () => phone,
      close: closeAll
    };
  } catch (err) {
    await closeAll();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// serve: one arm, for a parent that reads lines
// ---------------------------------------------------------------------------

async function serve(arm) {
  const out = (line) => process.stdout.write(`${line}\n`);
  const door = await startHostileDoor(arm, (event) => out(`P316_DOOR_EVENT:${J(event)}`));
  let ending = false;
  const end = async () => {
    if (ending) return;
    ending = true;
    out(`P316_DOOR_END:${J(door.counts)}`);
    await door.close();
    process.exit(0);
  };
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => void end());
  // A parent that dies closes this pipe; the door must not outlive it.
  process.stdin.on('end', () => void end());
  process.stdin.on('close', () => void end());
  process.stdin.resume();
  out(
    `P316_DOOR:${J({
      arm,
      port: door.port,
      pin: door.pin,
      servedPin: door.servedPin,
      payload: door.payload,
      socksPort: door.socksPort,
      atsHost: door.atsHost,
      sessionToOpen: door.sessionToOpen,
      turnCount: door.turnCount
    })}`
  );
}

// ---------------------------------------------------------------------------
// --self-test: every arm driven by the node phone, no Simulator
// ---------------------------------------------------------------------------

async function selfTest() {
  const results = [];
  const check = (arm, ok, said) => {
    results.push({ arm, ok, said });
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${arm.padEnd(16)} ${said}\n`);
  };
  /** Pair a node phone with this door the way the app would: present twice. */
  const pairWith = async (door) => {
    const qr = JSON.parse(door.payload);
    const p = makePhone('p316 self-test phone', qr.dx);
    const d = { port: qr.port, pin: qr.fp };
    const first = await present(d, sealPresentation(qr.ps, p));
    const second = await present(d, sealPresentation(qr.ps, p));
    return { phone: p, door: d, words: [first, second].map((a) => { try { return JSON.parse(a.body).state; } catch { return `status ${String(a.status)} ${a.error ?? ''}`; } }) };
  };
  for (const arm of Object.keys(HOSTILE_ARMS)) {
    const events = [];
    let door = null;
    try {
      door = await startHostileDoor(arm, (e) => events.push(e));
      if (arm === 'ats') {
        const through = await socksTls({ socksPort: door.socksPort, ipv4: '100.64.0.1', port: door.port });
        let status = 0;
        if (through.ok) {
          status = await new Promise((done) => {
            through.tls.write(`POST /pair HTTP/1.1\r\nHost: 100.64.0.1\r\nContent-Type: application/json\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`);
            let text = '';
            through.tls.on('data', (c) => (text += c.toString('utf8')));
            through.tls.on('end', () => done(Number(/^HTTP\/1\.1 (\d+)/.exec(text)?.[1] ?? 0)));
            through.tls.on('error', () => done(0));
          });
        }
        const refused = await socksTls({ socksPort: door.socksPort, ipv4: '192.0.2.10', port: door.port });
        const pinHolds = through.ok && pinOfPeer(through.peer) === door.pin;
        const san = (door.sans ?? []).some((s) => s.includes('100.64.0.1'));
        const socks = events.filter((e) => e.kind === 'socks');
        check(
          arm,
          through.ok && status === 200 && pinHolds && san && !refused.ok && socks.length === 2 && socks[0].atyp === 1 && socks[0].allowed && !socks[1].allowed,
          `through the stand-in to 100.64.0.1: TLS ${through.ok ? 'up' : `DOWN (${through.why})`}, pin ${pinHolds ? 'holds' : 'DOES NOT hold'}, the certificate ${san ? 'names 100.64.0.1' : 'does NOT name 100.64.0.1'}, POST /pair ${String(status)}; to 192.0.2.10: ${refused.ok ? 'SPLICED' : 'refused'}; ${String(socks.length)} CONNECT(s) seen, the first ATYP=${String(socks[0]?.atyp)}`
        );
        continue;
      }
      if (arm === 'wrong-key') {
        const qr = JSON.parse(door.payload);
        const p = makePhone('p316 self-test phone', qr.dx);
        const got = await present({ port: qr.port, pin: qr.fp }, sealPresentation(qr.ps, p));
        check(arm, got.status === 0 && /not the pinned/.test(got.error ?? '') && door.counts.requests === 0 && door.pin !== door.servedPin, `the pinned client stopped at the handshake (${got.error ?? got.status}); the door served ${String(door.counts.requests)} request(s)`);
        continue;
      }
      const { phone, door: d, words } = await pairWith(door);
      if (arm === 'pair-word') {
        check(arm, !['pending', 'allowed', 'refused'].includes(words[0]), `/pair answered ${J(words[0])}`);
        continue;
      }
      if (words[0] !== 'pending' || words[1] !== 'allowed') {
        check(arm, false, `pairing answered ${J(words)}, not pending then allowed`);
        continue;
      }
      // A list arm answers pairing's first signed read honestly and the
      // list's next read with its body, so both are read here, in that order.
      const listArm = HOSTILE_ARMS[arm].list === true;
      const firstRead = listArm ? await signedGet(phone, d, '/v1/blocked') : null;
      let firstBody = null;
      try {
        firstBody = firstRead === null ? null : JSON.parse(firstRead.body);
      } catch {
        firstBody = null;
      }
      const honestFirst = !listArm || (firstRead.status === 200 && Array.isArray(firstBody?.rows) && firstBody.rows.length > 0);
      if (!honestFirst) {
        check(arm, false, `the first signed read (pairing's) answered ${String(firstRead.status)} and ${firstBody === null ? 'does not parse' : 'parses without rows'}, not honestly`);
        continue;
      }
      const blocked = await signedGet(phone, d, '/v1/blocked', { timeoutMs: arm === 'never-completes' ? 3_000 : 20_000 });
      let body = null;
      try {
        body = JSON.parse(blocked.body);
      } catch {
        body = null;
      }
      const verified = events.filter((e) => e.kind === 'request' && e.verified !== undefined).every((e) => e.verified === 'ok');
      const first = listArm ? 'the first read honest, then ' : '';
      if (arm === 'huge-row') check(arm, blocked.bytes > HUGE_BYTES && verified, `${first}/v1/blocked sent ${String(blocked.bytes)} bytes`);
      else if (arm === 'unknown-status') check(arm, body?.rows?.[0]?.statusLabel === 'levitating', `the first row's word is ${J(body?.rows?.[0]?.statusLabel)}`);
      else if (arm === 'unknown-dot') check(arm, body?.rows?.[0]?.statusDot === 'plaid', `the first row's dot is ${J(body?.rows?.[0]?.statusDot)}`);
      else if (arm === 'malformed') check(arm, blocked.status === 200 && body === null, `${first}/v1/blocked answered ${String(blocked.status)} and ${body === null ? 'does not parse' : 'PARSES'}`);
      else if (arm === 'missing-fields') check(arm, body !== null && body.rows?.[0]?.statusLabel === undefined && body.rows?.[0]?.sessionId === undefined, `${first}the rows carry no statusLabel and no sessionId`);
      else if (arm === 'never-completes') check(arm, blocked.status === 0 && /timed out|socket hang up/.test(blocked.error ?? ''), `${first}the read ended ${blocked.error ?? blocked.status} after the client's own limit`);
      else {
        const paged = await pageBack(phone, d, door.sessionToOpen, 7, 12);
        const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
        const indexes = all.map((t) => t.index);
        const contiguous = indexes.every((ix, k) => k === 0 || ix === indexes[k - 1] + 1);
        const pagesForward = paged.pages.length > 1 && paged.pages[1].turns.length > 0 && paged.pages[1].turns[0].index >= paged.pages[0].turns[0].index;
        if (arm === 'honest') {
          check(arm, blocked.status === 200 && body !== null && paged.ok && all.length === door.turnCount && contiguous && indexes[0] === 0 && verified, `paired, the list read, the conversation paged to the first turn: ${String(all.length)} of ${String(door.turnCount)} turns, contiguous ${String(contiguous)}; every signature verified by the door's own reader`);
        } else if (arm === 'pages-backwards') {
          check(arm, pagesForward, `the older page starts at ${J(paged.pages[1]?.turns?.[0]?.index)} after a page that started at ${J(paged.pages[0]?.turns?.[0]?.index)}`);
        } else if (arm === 'pages-overlap') {
          const a = new Set(paged.pages[0]?.turns.map((t) => t.index));
          check(arm, (paged.pages[1]?.turns ?? []).some((t) => a.has(t.index)), 'the older page repeats a turn of the newest');
        } else if (arm === 'more-forever') {
          check(arm, !paged.ok && /says more and carries nothing/.test(paged.why), `paging stopped: ${paged.why}`);
        } else if (arm === 'more-negative') {
          // Paged again at the app's own page size (TurnPages.pageSize, 20),
          // because that is the asker this arm must reach below zero.
          const asApp = await pageBack(phone, d, door.sessionToOpen, 20, 6);
          const asAppAll = asApp.pages.flatMap((p) => p.turns);
          check(arm, !paged.ok && all.some((t) => t.index < 0) && asAppAll.some((t) => t.index < 0), `paging did not end, and ${String(all.filter((t) => t.index < 0).length)} turn(s) came back below index 0 at a limit of 7, ${String(asAppAll.filter((t) => t.index < 0).length)} at the app's 20`);
        } else if (arm === 'long-ask') {
          const newest = paged.pages[0]?.turns?.[paged.pages[0].turns.length - 1];
          check(arm, newest?.askText === LONG_ASK && !/\s/.test(newest.askText), `the newest ask is ${String(newest?.askText?.length ?? 0)} characters with no space`);
        } else {
          check(arm, false, 'no self-test for this arm');
        }
      }
    } catch (err) {
      check(arm, false, `threw: ${String(err?.message ?? err)}`);
    } finally {
      await door?.close();
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  process.stdout.write(failed === 0 ? `${TAG} self-test PASS: ${String(results.length)} arms serve what they claim, on loopback, and every listener is closed.\n` : `${TAG} self-test FAIL: ${String(failed)} of ${String(results.length)} arm(s).\n`);
  return failed === 0;
}

if (isMain && process.env[INNER] === '1') {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const ok = await selfTest();
    process.exit(ok ? 0 : 1);
  } else if (args[0] === 'serve') {
    const at = args.indexOf('--arm');
    await serve(at === -1 ? 'honest' : String(args[at + 1]));
  } else {
    process.stderr.write(`${TAG} usage: --self-test | serve --arm <${Object.keys(HOSTILE_ARMS).join('|')}>\n`);
    process.exit(2);
  }
}

export const hostileDoorPath = HERE;
