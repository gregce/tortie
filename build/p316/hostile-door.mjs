#!/usr/bin/env node
/**
 * build/p316/hostile-door.mjs — a door that is not Tortie's, for `probe:p316`'s
 * attack (Phase 316.2, build/p316/SPEC.md §4 S2, Method B), speaking the
 * Phase 330 wire (build/p330/SPEC.md §4.6 to §4.8).
 *
 * WHY IT EXISTS. The phone app draws a person's words from a network answer it
 * must not trust. Tortie's own door never sends a 10 MiB row, an unknown
 * status word, pages that go backwards, a chunked body or two lengths, so the
 * only way to see what the app does with one is a door that does. Paired
 * through the DEBUG payload injection and dialled through the DEBUG endpoint
 * (`-TortieDebugDoorEndpoint 127.0.0.1:<port>`, which keeps the code's NAME as
 * the TLS server name and the `Host`), the app is pointed at this door instead
 * of the Mac's, and every arm must end in a DRAWN SENTENCE with the app's
 * process still alive and no half-drawn screen. The honest arm is in the same
 * table: a door that refuses everything proves a client that is off, so the
 * control must draw the list.
 *
 * WHAT IT IS, from Phase 330. TLS 1.3 only, under a key issued by Tortie's own
 * src/main/pocket/tls.ts for the code's made-up `.ts.net` name, asking every
 * client for a certificate. `/pair` checks the presentation's proof, answers
 * `pending` first and `allowed` with a client certificate (issued by tls.ts's
 * `issueClientCertificate` over the phone's client key) after, and every
 * request event records the SNI, the `Host` and the client key the handshake
 * presented, so the probe can hold the app to mutual TLS and to its name.
 *
 * THE ARMS (`serve --arm <name>`):
 *   honest           the control. The answers `ios/TortieTests/Fixtures/vectors.json`
 *                    holds, composed by the SHIPPING route composer, with the
 *                    conversation paged honestly for any `to` and `limit`
 *
 *   THE LIST ARMS answer the FIRST signed `/v1/blocked` honestly and every one
 *   after it with their hostile body, so the app pairs, draws the list, and
 *   meets the body on its pull to refresh (Phase 316.2's fix round):
 *   huge-row         one row whose question is 10 MiB
 *   malformed        not JSON
 *   missing-fields   rows lacking fields the contract requires
 *   never-completes  its headers and part of a body, then nothing, forever
 *
 *   THE HTTP ARMS (Phase 330, SPEC §6.4 (t)): the phone's HTTP/1.1 reader is
 *   hand-written and bounded, so each of these is written as RAW BYTES on the
 *   TLS socket, on the list's refresh like the list arms:
 *   chunked          `Transfer-Encoding: chunked`, a well-formed chunked body
 *   no-length        no `Content-Length`, the body ended by the close
 *   two-lengths      two `Content-Length` headers
 *   over-cap         a `Content-Length` of 3 MiB, over the phone's 2 MiB
 *   huge-header      one 20 KiB header line, over the phone's 16 KiB
 *   not-http11       an `HTTP/1.0` status line
 *   early-close      a `Content-Length` twice what is sent, then the close
 *   not-json         a 200 whose `Content-Type` is `text/plain`
 *
 *   unknown-status   a status word the Mac never says (drawn as main wrote it)
 *   unknown-dot      a dot name that is not one of the five (a neutral ring)
 *   wrong-key        the TLS key is not the one the QR pins: the app must stop at
 *                    the handshake, and the door must have served 0 requests
 *   pair-word        `/pair` answers a word that is not pending, allowed or refused
 *   pages-backwards  the older page's indexes go forwards again
 *   pages-overlap    the older page repeats the newest page's first turn
 *   more-forever     `more: true` on an older page that adds nothing
 *   more-negative    `more: true` forever, every page as long as the `limit`
 *   long-ask         the newest turn's ask is one 4,000-character word (drawn
 *                    whole, not refused: it is a legal answer)
 *
 *   THE MARKDOWN ARMS (Phase 316.6, build/p3166/SPEC.md §7.3). Each answers
 *   the pairing and the list honestly and serves a conversation whose answers
 *   are somebody else's markdown, one per turn, and each must END DRAWN:
 *   md-hostile       every ios/TortieTests/Fixtures/markdown/fixtures.json
 *                    fixture whose `hostile` names it, then every built
 *                    recipe that fits, one per turn, under 1.5 MiB together
 *   md-huge          the two 5 MiB recipes (`fence-5mb`, `line-5mb`), each
 *                    cut so the page holding both fits a 1.8 MiB answer
 *   `{{MD3}}` in a fixture is the probe's loopback listener, handed in as
 *   `--md3 127.0.0.1:<port>` (127.0.0.1:9 when none is), which must count
 *   0 connections: nothing an answer names is fetched.
 *
 *   THE WRITE ARMS (Phase 317, build/p317/SPEC.md §7.5 EH and §6.3 (t)). Each
 *   answers the pairing, the list and the session honestly, the session's row
 *   offering End with the Mac's own confirmation (the vectors' `endConfirm`,
 *   or the SHIPPING `endSessionConfirm` over the row when the vectors carry
 *   none), and answers the ONE `POST /v1/end` a press sends in its own way.
 *   Every write is counted, so the probe holds the app to exactly one POST per
 *   press, and every one is verified over its method, its path and its body:
 *   write-other-id         a 200 whose write id is not the one sent
 *   write-malformed-empty  a 200 `refused` `malformed` echoing `""`, the
 *                          Mac's own answer to a body it could not read: the
 *                          door's `unreadable` sentence is drawn
 *   write-unknown-outcome  a 200 with an outcome word the Mac never says
 *   write-cut              the connection cut after the request was read
 *   write-late             no answer for longer than the phone's 15 s
 *   write-404              a 404 with no body, the door's own refusal
 *   write-malformed        a 200 that is not JSON
 *   write-cut-reread-refused  the write cut, then every read after it
 *                          refused: the READ's own consequence is drawn, and
 *                          a signed read refused 404 is a pairing the Mac no
 *                          longer answers, so the app lands on Pairing (the
 *                          fix round: the verify measured it there, where this
 *                          row had said the list); never `Your Mac did not
 *                          answer. This is the session as it reads now.`,
 *                          which would be false
 *   write-unreachable-offer   the session's row offers no End, only the Mac's
 *                          `END_UNREACHABLE_TITLE` under an End drawn off:
 *                          no press is possible, so no POST may arrive
 *   Each names where it ends (`at`), the Copy.swift words it may end in
 *   (`expect`), the door sentences (`door`, keys of the shipping
 *   `POCKET_WRITE_SENTENCES`) and the words it must never draw (`never`).
 *
 * The ATS arm (a SOCKS5 stand-in dialling 100.64.0.1) left with TailscaleKit in
 * Phase 330: the phone has no tailnet and no ATS exception any more.
 *
 * HOW IT RUNS. As its OWN PROCESS under the pinned tsx: `probe:p316` starts it
 * with `spawn`, reads one `P316_DOOR:{…}` line (the port, the pin, the QR
 * payload the app is handed), reads `P316_DOOR_EVENT:{…}` lines as requests
 * arrive, and ends it in a `finally`. It ends itself on SIGTERM, SIGINT,
 * SIGHUP, and when its stdin closes, so a parent that dies cannot orphan it.
 *
 * `--self-test` drives every arm with build/p316/node-phone.mjs — no Simulator
 * — and asserts the door serves what the arm claims, reading the HTTP arms'
 * answers as raw bytes.
 *
 * LOOPBACK ONLY: every listener binds 127.0.0.1. It logs no key, no signature
 * and no body: an event names the method, the path, the arm, the signature's
 * verdict as one word, the status, the byte count, the SNI and Host it saw and
 * the client key pin the handshake presented. The name in its QR is made up.
 *
 *   node build/p316/hostile-door.mjs --self-test
 *   node build/p316/hostile-door.mjs serve --arm honest      (under tsx; the probe does this)
 *   node build/p316/hostile-door.mjs serve --arm md-hostile --md3 127.0.0.1:<port>
 */

import { spawnSync } from 'node:child_process';
import { X509Certificate, createHash, createPrivateKey, generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';
import {
  adoptCertificate,
  b64u,
  bindingOf,
  challengeOf,
  clientKeyPinOf,
  doorFrom,
  fingerprintOf,
  makePhone,
  openPresentation,
  pageBack,
  pairAnswerOf,
  pairThrough,
  phoneIdOf,
  pinOfPem,
  present,
  proofTextOf,
  readOffer,
  rawExchange,
  sealPresentation,
  signedGet,
  signedHeaders,
  signedPost,
  verifySigned,
  writeBodyOf
} from './node-phone.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const TAG = '[p316 hostile door]';
const INNER = 'P316_HOSTILE_INNER';
const J = JSON.stringify;

/** The made-up public name the hostile door's code names. No resolver has ever answered it. */
export const HOSTILE_NAME = 'p316-hostile.tail00000.ts.net';
/** The public port its code names. The app dials the loopback port through the DEBUG endpoint instead. */
export const HOSTILE_PUBLIC_PORT = 8443;

/**
 * The arms, and what each expects the app to end in. An arm that ends in a
 * sentence names WHERE it is drawn (`at`, an accessibility identifier from
 * ios/Tortie/Screens/Identifiers.swift) and WHICH it is (`expect`, the names of
 * the `Copy.swift` words it may be), so the probe judges the sentence itself
 * and not merely that one was drawn. `list: true` marks a list arm: its
 * hostile body waits for the list's second read. `raw: true` marks an HTTP arm
 * written as bytes.
 */
export const HOSTILE_ARMS = Object.freeze({
  honest: { what: 'the control: an honest door', ends: 'drawn' },
  'huge-row': { what: 'a 10 MiB row on the list\'s refresh', ends: 'sentence', list: true, at: 'list-failure', expect: ['answerTooLarge'] },
  // DRAWN, NOT REFUSED (integrator, Phase 316.2): the status word and its title
  // are main's own words, which the phone draws and computes nothing from.
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
  // THE HTTP ARMS (Phase 330, SPEC §4.12.3 and §6.4 (t)). The phone's reader
  // turns each into `malformed`, `unexpectedStatus` or `tooLarge`, and its
  // words for those are `answerUnreadable` and `answerTooLarge`.
  chunked: { what: 'Transfer-Encoding: chunked on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'no-length': { what: 'no Content-Length, ended by the close, on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'two-lengths': { what: 'two Content-Length headers on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'over-cap': { what: 'a Content-Length of 3 MiB on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerTooLarge'] },
  'huge-header': { what: 'a 20 KiB header on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable', 'answerTooLarge'] },
  'not-http11': { what: 'an HTTP/1.0 status line on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'early-close': { what: 'a Content-Length twice what is sent, then the close, on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  'not-json': { what: 'a 200 whose Content-Type is text/plain on the list\'s refresh', ends: 'sentence', list: true, raw: true, at: 'list-failure', expect: ['answerUnreadable'] },
  // THE MARKDOWN ARMS (Phase 316.6): somebody else's markdown, one answer per
  // turn, and the conversation must end drawn.
  'md-hostile': { what: 'every hostile markdown fixture and every built one that fits, one per turn, under 1.5 MiB together', ends: 'drawn', md: true },
  'md-huge': { what: 'the two 5 MiB fixtures, each cut so their page fits a 1.8 MiB answer', ends: 'drawn', md: true },
  // THE WRITE ARMS (Phase 317, SPEC §7.5 EH). One POST per press, each answered
  // its own way; the line under the End bar is what the probe grades.
  'write-other-id': { what: 'a 200 to the End whose write id is not the one sent', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNoAnswer'], door: [], never: [] },
  'write-malformed-empty': { what: 'a 200 refused malformed echoing an empty id, the Mac\'s own answer to a body it could not read', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: [], door: ['unreadable'], never: ['endNoAnswer'] },
  'write-unknown-outcome': { what: 'a 200 to the End with an outcome word the Mac never says', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNoAnswer'], door: [], never: [] },
  'write-cut': { what: 'the End\'s connection cut after its request was read', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNoAnswer'], door: [], never: [] },
  'write-late': { what: 'no answer to the End for longer than the phone\'s 15 s', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNoAnswer'], door: [], never: [] },
  'write-404': { what: 'a 404 with no body to the End, the door\'s own refusal', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNotTaken'], door: [], never: ['endNoAnswer'] },
  'write-malformed': { what: 'a 200 to the End that is not JSON', ends: 'sentence', write: true, posts: 1, at: 'session-end-line', expect: ['endNoAnswer'], door: [], never: [] },
  'write-cut-reread-refused': { what: 'the End cut after its request, then every read refused', ends: 'pairing', write: true, posts: 1, at: 'screen-pairing', expect: [], door: [], never: ['endNoAnswer'] },
  'write-unreachable-offer': { what: 'a session row whose End is unreachable, with the Mac\'s title under an End drawn off', ends: 'drawn', write: true, posts: 0, at: 'session-end-line', expect: [], door: [], never: ['endNoAnswer', 'endNotTaken'], title: 'unreachable' }
});

/** The names of the write arms (Phase 317), as conformance:ios (t) reads them. */
export const WRITE_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].write === true));
/** Past the phone's whole-exchange limit (15 s, DoorLimits.timeout), so write-late is the phone's timer and never this door's answer. */
export const WRITE_LATE_MS = 20_000;

/** The names of the HTTP arms, as conformance:ios (t) reads them. */
export const HTTP_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].raw === true));

const HUGE_BYTES = 10 * 1024 * 1024;
const OVER_CAP_BYTES = 3 * 1024 * 1024;
const HUGE_HEADER_BYTES = 20 * 1024;
/** The raised word the `unknown-status` arm sends; the probe looks for it on the drawn rows. */
export const UNKNOWN_STATUS_TITLE = 'Levitating';
const LONG_ASK = `p316${'w'.repeat(4_000 - 4)}`;

// ---------------------------------------------------------------------------
// The markdown fixtures (Phase 316.6, build/p3166/SPEC.md §7.2 and §7.3)
// ---------------------------------------------------------------------------

/** The committed fixtures, ASCII only. */
export const MARKDOWN_FIXTURES = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'markdown', 'fixtures.json');
/** What `{{MD3}}` stands for when no listener is named, as the unit tests read it. */
export const MD3_UNSET = '127.0.0.1:9';
/** md-hostile's answers together stay under this. */
export const MD_HOSTILE_BYTES = 1.5 * 1024 * 1024;
/** md-huge's page fits an answer this size, under the phone's 2 MiB cap. */
export const MD_HUGE_PAGE_BYTES = 1.8 * 1024 * 1024;

/**
 * One recipe's bytes, built the way the file's own `about` says, and the way
 * ios/TortieTests/MarkdownHostileTests.swift builds them: its parts in order,
 * `{text}` as itself, `{repeat, times}` repeated, `{index}` the named loop
 * counter in decimal, and `{each, count, join, parts}` the parts once per
 * counter value from 0 below count, joined by `join`.
 */
export function buildRecipe(recipe) {
  const render = (parts, scope) => {
    const out = [];
    for (const p of parts) {
      if (typeof p.text === 'string') out.push(p.text);
      else if (typeof p.repeat === 'string') out.push(p.repeat.repeat(p.times));
      else if (typeof p.index === 'string') {
        if (!Object.hasOwn(scope, p.index)) throw new Error(`${recipe.name}: {index: ${p.index}} outside its loop`);
        out.push(String(scope[p.index]));
      } else if (typeof p.each === 'string') {
        const rows = [];
        for (let k = 0; k < p.count; k += 1) rows.push(render(p.parts, { ...scope, [p.each]: k }));
        out.push(rows.join(p.join ?? ''));
      } else throw new Error(`${recipe.name}: a part that is not text, repeat, index or each`);
    }
    return out.join('');
  };
  return render(recipe.parts, {});
}

/** `127.0.0.1:<port>` and nothing else, or null. */
export function md3Of(value) {
  const m = /^127\.0\.0\.1:([0-9]{1,5})$/.exec(String(value ?? ''));
  return m !== null && Number(m[1]) > 0 && Number(m[1]) < 65_536 ? `127.0.0.1:${m[1]}` : null;
}

/**
 * The committed fixtures with `{{MD3}}` filled, and the recipes. `md3` must
 * be a loopback address and port; anything else is refused.
 */
export function markdownFixtures(md3 = MD3_UNSET) {
  const at = md3Of(md3);
  if (at === null) throw new Error(`{{MD3}} must be 127.0.0.1:<port>, not ${JSON.stringify(md3)}`);
  const doc = JSON.parse(readFileSync(MARKDOWN_FIXTURES, 'utf8'));
  const fill = (text) => text.split('{{MD3}}').join(at);
  return { fixtures: doc.fixtures.map((f) => ({ ...f, source: fill(f.source) })), recipes: doc.recipes, md3: at };
}

/** The answers an md arm serves, in turn order, as `{ name, text }`. */
export function markdownAnswers(arm, md3 = MD3_UNSET) {
  const { fixtures, recipes } = markdownFixtures(md3);
  if (arm === 'md-hostile') {
    const answers = fixtures.filter((f) => f.hostile === 'md-hostile').map((f) => ({ name: f.name, text: f.source }));
    let bytes = answers.reduce((n, a) => n + Buffer.byteLength(a.text), 0);
    for (const r of recipes.filter((x) => x.hostile === 'md-hostile')) {
      const text = buildRecipe(r);
      if (bytes + Buffer.byteLength(text) >= MD_HOSTILE_BYTES) continue;
      bytes += Buffer.byteLength(text);
      answers.push({ name: r.name, text });
    }
    return answers;
  }
  if (arm === 'md-huge') {
    const huge = recipes.filter((x) => x.hostile === 'md-huge').map((r) => ({ name: r.name, full: buildRecipe(r) }));
    // Each cut to the same length, the longest whose page still fits.
    let cut = Math.floor(MD_HUGE_PAGE_BYTES / Math.max(1, huge.length));
    const pageBytes = (n) => Buffer.byteLength(JSON.stringify({ turns: huge.map((h) => ({ answerText: h.full.slice(0, n), askText: `p3166 md ${h.name}` })) })) + 1_024 * huge.length;
    while (cut > 0 && pageBytes(cut) > MD_HUGE_PAGE_BYTES) cut -= 4_096;
    return huge.map((h) => ({ name: h.name, text: h.full.slice(0, cut) }));
  }
  throw new Error(`${arm} is not a markdown arm`);
}

/** The honest world, its conversation's answers replaced by an md arm's. */
function markdownWorld(arm, md3) {
  const world = honestWorld();
  const template = world.turns[0];
  const answers = markdownAnswers(arm, md3);
  world.turns = answers.map((a, i) => ({ ...template, index: i, askText: `p3166 md ${a.name}`, askClipped: false, answerText: a.text, answerClipped: false, absence: null }));
  world.session = { ...world.session, session: { ...world.session.session, turnCount: answers.length, lastAnswer: answers.at(-1)?.text ?? null } };
  world.answers = answers;
  return world;
}

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

async function tlsModule() {
  return import(pathToFileURL(join(ROOT, 'src', 'main', 'pocket', 'tls.ts')).href);
}

/** One identity from src/main/pocket/tls.ts, naming `dnsName`, sealed by nothing, in scratch. */
async function issueIdentity(dnsName, scratch, name) {
  const tls = await tlsModule();
  const outcome = tls.ensureDoorIdentity({
    path: join(scratch, `${name}.json`),
    seal: { available: () => true, seal: (text) => text, open: (blob) => (typeof blob === 'string' ? blob : null) },
    names: { addresses: [], dnsNames: [dnsName] }
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
// The write arms' world (Phase 317)
// ---------------------------------------------------------------------------

/** The shipping words a write arm draws from: the End confirmation, the unreachable title, the door's write sentences. */
async function writeWords() {
  const lifecycle = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'lifecycle-words.ts')).href);
  const pocket = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts')).href);
  for (const [name, value] of [['endSessionConfirm', lifecycle.endSessionConfirm], ['END_UNREACHABLE_TITLE', lifecycle.END_UNREACHABLE_TITLE], ['POCKET_WRITE_SENTENCES', pocket.POCKET_WRITE_SENTENCES]]) {
    if (value === undefined) throw new Error(`the shipping tree has no ${name}, which a write arm draws its words from`);
  }
  return { endSessionConfirm: lifecycle.endSessionConfirm, END_UNREACHABLE_TITLE: lifecycle.END_UNREACHABLE_TITLE, POCKET_WRITE_SENTENCES: pocket.POCKET_WRITE_SENTENCES };
}

/**
 * The session the write arms open, offering End (or, for
 * write-unreachable-offer, only the Mac's unreachable title), on its own
 * answer and on every list row naming it. The confirmation is the vectors'
 * own `endConfirm` when they carry one, else the SHIPPING
 * `endSessionConfirm` over a running session of the row's name and agent:
 * either way the Mac's words, never this door's.
 */
export function offerEnd(world, arm, words) {
  const s = world.session.session;
  const end = arm === 'write-unreachable-offer' ? { state: 'unreachable', title: words.END_UNREACHABLE_TITLE } : { state: 'offered', batch: true };
  let confirm = null;
  let from = 'none';
  if (end.state === 'offered') {
    if (s.endConfirm !== null && typeof s.endConfirm === 'object') {
      confirm = s.endConfirm;
      from = 'vectors';
    } else {
      confirm = words.endSessionConfirm({ id: s.sessionId, name: s.name, tmuxName: s.name, agent: s.agent, status: 'running', projectPath: '/Users/p316/tortie', cwd: '/Users/p316/tortie', createdAt: 0, resumeArgv: [] });
      from = 'composed';
    }
  }
  s.end = end;
  s.endConfirm = confirm;
  for (const r of [...world.blocked.rows, ...world.blocked.others]) if (r.sessionId === s.sessionId) r.end = end;
  world.endConfirm = confirm;
  world.endConfirmFrom = from;
  world.endOffer = end;
  return world;
}

/** A 32-hex write id that is not `id`. */
const otherWriteId = (id) => createHash('sha256').update(`p316 hostile other ${id}`).digest('hex').slice(0, 32);

/**
 * The raw bytes an HTTP arm writes, for an honest body. Every one is a
 * complete HTTP answer in some shape the phone's reader must refuse (SPEC
 * §4.12.3). Exported so the self-test and conformance:ios can read the table.
 */
export function rawAnswerOf(arm, body) {
  const json = Buffer.from(body, 'utf8');
  const head = (lines) => Buffer.from(`${lines.join('\r\n')}\r\n\r\n`, 'utf8');
  switch (arm) {
    case 'chunked':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', 'Transfer-Encoding: chunked', 'Connection: close']), Buffer.from(`${json.length.toString(16)}\r\n`), json, Buffer.from('\r\n0\r\n\r\n')]);
    case 'no-length':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', 'Connection: close']), json]);
    case 'two-lengths':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', `Content-Length: ${String(json.length)}`, `Content-Length: ${String(json.length)}`, 'Connection: close']), json]);
    case 'over-cap': {
      const padded = Buffer.alloc(OVER_CAP_BYTES, 0x20);
      json.copy(padded, 0);
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', `Content-Length: ${String(padded.length)}`, 'Connection: close']), padded]);
    }
    case 'huge-header':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', `X-P316-Padding: ${'a'.repeat(HUGE_HEADER_BYTES)}`, `Content-Length: ${String(json.length)}`, 'Connection: close']), json]);
    case 'not-http11':
      return Buffer.concat([head(['HTTP/1.0 200 OK', 'Content-Type: application/json; charset=utf-8', `Content-Length: ${String(json.length)}`, 'Connection: close']), json]);
    case 'early-close':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', `Content-Length: ${String(json.length * 2)}`, 'Connection: close']), json]);
    case 'not-json':
      return Buffer.concat([head(['HTTP/1.1 200 OK', 'Content-Type: text/plain; charset=utf-8', `Content-Length: ${String(json.length)}`, 'Connection: close']), json]);
    default:
      throw new Error(`${arm} is not an HTTP arm`);
  }
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

/**
 * Start one arm's door on 127.0.0.1. Returns its facts and a `close()`. `emit`
 * receives one event per request and per handshake.
 */
export async function startHostileDoor(arm, emit = () => undefined, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(HOSTILE_ARMS, arm)) throw new Error(`no arm named ${arm}; the arms are ${Object.keys(HOSTILE_ARMS).join(', ')}`);
  const scratch = mkdtempSync(join(tmpdir(), 'p316-hostile-'));
  const sockets = new Set();
  const servers = [];
  const counts = { requests: 0, handshakes: 0, writes: 0 };
  const closeAll = async () => {
    for (const s of sockets) s.destroy();
    await Promise.all(servers.map((s) => new Promise((r) => s.close(() => r()))));
    rmSync(scratch, { recursive: true, force: true });
  };
  try {
    const tls = await tlsModule();
    const world = HOSTILE_ARMS[arm].md === true ? markdownWorld(arm, options.md3 ?? MD3_UNSET) : honestWorld();
    // Phase 317: a write arm's session offers End with the Mac's own words.
    const words = HOSTILE_ARMS[arm].write === true ? await writeWords() : null;
    if (words !== null) offerEnd(world, arm, words);
    /** write-cut-reread-refused: every signed read after its write is refused. */
    let refuseReads = false;
    const pinned = await issueIdentity(HOSTILE_NAME, scratch, 'door');
    const served = arm === 'wrong-key' ? await issueIdentity(HOSTILE_NAME, scratch, 'impostor') : pinned;
    const doorSign = generateKeyPairSync('ed25519');
    const doorX = generateKeyPairSync('x25519');
    const dk = b64u(doorSign.publicKey.export({ type: 'spki', format: 'der' }));
    const dx = b64u(doorX.publicKey.export({ type: 'spki', format: 'der' }));
    const ps = b64u(randomBytes(16));
    let phone = null;
    let certificate = null;
    /** How many times each signing key has presented a proof that held. */
    const presentedBy = new Map();
    /** Signed `/v1/blocked` reads answered; a list arm answers the first honestly. */
    let blockedReads = 0;

    /** What the handshake under this request presented: the SNI, the Host, the client key pin. */
    const seenOf = (req) => {
      const socket = req.socket;
      let clientPin = null;
      try {
        const peer = socket.getPeerX509Certificate?.();
        if (peer !== undefined) clientPin = b64u(createHash('sha256').update(peer.publicKey.export({ type: 'spki', format: 'der' })).digest());
      } catch {
        clientPin = null;
      }
      return { servername: typeof socket.servername === 'string' ? socket.servername : null, host: req.headers.host ?? null, clientPin, tls: socket.getProtocol?.() ?? null };
    };

    const send = (res, status, body, event) => {
      const bytes = Buffer.byteLength(body);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(bytes), 'cache-control': 'no-store' });
      res.end(body);
      emit({ kind: 'request', arm, ...event, status, bytes });
    };
    const sendRaw = (req, raw, event) => {
      const socket = req.socket;
      emit({ kind: 'request', arm, ...event, status: 'raw', bytes: raw.length });
      socket.write(raw, () => {
        if (arm === 'early-close') socket.destroy();
        else socket.end();
      });
    };

    const handler = (req, res) => {
      counts.requests += 1;
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const url = new URL(req.url ?? '/', 'https://door.invalid');
        const route = `${req.method} ${url.pathname}`;
        const seen = seenOf(req);
        if (route === 'POST /pair') {
          const opened = openPresentation(ps, body);
          if (opened === null || !opened.proofOk) return send(res, 200, J({ state: 'refused' }), { route, ...seen, sealed: opened === null ? 'refused' : 'proof-refused' });
          if (arm === 'pair-word') return send(res, 200, J({ state: 'granted' }), { route, ...seen, sealed: 'opened' });
          // The person "allows" on a key's second presentation, the way the
          // real door answers `pending` until the Allow and `allowed` after it.
          const times = (presentedBy.get(opened.signingKey) ?? 0) + 1;
          presentedBy.set(opened.signingKey, times);
          if (phone === null || phone.signingKey !== opened.signingKey) {
            phone = opened;
            certificate = null;
          }
          if (times === 1) return send(res, 200, J({ state: 'pending' }), { route, ...seen, sealed: 'opened', fingerprint: fingerprintOf(opened.signingKey, opened.exchangeKey, opened.clientKey) });
          certificate ??= b64u(tls.issueClientCertificate(pinned.key, opened.clientKey, Date.now()));
          return send(res, 200, J({ state: 'allowed', cert: certificate }), { route, ...seen, sealed: 'opened' });
        }
        if (req.method === 'POST' && url.pathname === '/v1/end') {
          // PHASE 317's write: counted, verified over the body, and answered
          // the arm's way. A non-write arm answers honestly. (Its fix round
          // took `/v1/unpair` out; a POST to it is a path this door does not
          // have, a 404 below.)
          counts.writes += 1;
          const verifiedWrite = verifySigned({ method: 'POST', target: req.url ?? '', headers: req.headers, body, phone, doorExchangePrivate: doorX.privateKey, doorExchangeKey: dx });
          const channelWrite = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
          const event = { route, ...seen, verified: verifiedWrite, channelHeld: channelWrite, write: counts.writes, query: url.search !== '' };
          if (verifiedWrite !== 'ok' || url.search !== '') return send(res, 404, '', event);
          let id = '';
          try {
            const parsed = JSON.parse(body.toString('utf8'));
            if (typeof parsed?.write === 'string' && /^[0-9a-f]{32}$/.test(parsed.write)) id = parsed.write;
          } catch {
            id = '';
          }
          const verb = 'end';
          const done = J({ verb, write: id, outcome: 'done', reason: null, sentence: null });
          switch (arm) {
            case 'write-other-id':
              return send(res, 200, J({ verb, write: otherWriteId(id), outcome: 'done', reason: null, sentence: null }), event);
            case 'write-malformed-empty':
              return send(res, 200, J({ verb, write: '', outcome: 'refused', reason: 'malformed', sentence: words.POCKET_WRITE_SENTENCES.unreadable }), event);
            case 'write-unknown-outcome':
              return send(res, 200, J({ verb, write: id, outcome: 'vanished', reason: null, sentence: null }), event);
            case 'write-cut':
            case 'write-cut-reread-refused':
              if (arm === 'write-cut-reread-refused') refuseReads = true;
              emit({ kind: 'request', arm, ...event, status: 'cut', bytes: 0 });
              req.socket.destroy();
              return;
            case 'write-late': {
              emit({ kind: 'request', arm, ...event, status: 200, bytes: 0, held: true });
              const timer = setTimeout(() => {
                if (!req.socket.destroyed) send(res, 200, done, { ...event, late: true });
              }, WRITE_LATE_MS);
              timer.unref?.();
              return;
            }
            case 'write-404':
              return send(res, 404, '', event);
            case 'write-malformed':
              return send(res, 200, `${done.slice(0, 20)} not json`, event);
            default:
              return send(res, 200, done, event);
          }
        }
        if (req.method !== 'GET' || !['/v1/blocked', '/v1/session', '/v1/turns'].includes(url.pathname)) {
          return send(res, 404, '', { route, ...seen });
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
        const channelHeld = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
        const event = { route, ...seen, verified, channelHeld };
        if (verified !== 'ok') return send(res, 404, '', event);
        if (refuseReads) return send(res, 404, '', { ...event, refusedAfterWrite: true });
        if (url.pathname === '/v1/blocked') {
          blockedReads += 1;
          const answer = structuredClone(world.blocked);
          // The first signed read is pairing's: a list arm answers it
          // honestly, so the app pairs and its LIST meets the body.
          if (HOSTILE_ARMS[arm].list === true && blockedReads === 1) return send(res, 200, J(answer), { ...event, honestFirst: true });
          if (HOSTILE_ARMS[arm].raw === true) return sendRaw(req, rawAnswerOf(arm, J(answer)), event);
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
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': '100000' });
            res.write('{"rows":[');
            emit({ kind: 'request', arm, ...event, status: 200, bytes: 9, held: true });
            return;
          }
          return send(res, 200, J(answer), event);
        }
        if (url.pathname === '/v1/session') {
          if (url.searchParams.get('id') !== world.sessionId) {
            const other = [...world.blocked.rows, ...world.blocked.others].find((r) => r.sessionId === url.searchParams.get('id'));
            if (other === undefined) return send(res, 404, '', event);
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
          const to = first ? world.turns.length - 1 : Number(url.searchParams.get('to'));
          const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 20) || 20));
          page.turns = Array.from({ length: limit }, (_, k) => ({ ...world.turns[0], index: to - limit + 1 + k }));
          page.more = true;
        }
        return send(res, 200, J(page), event);
      });
    };

    // TLS 1.3 only, asking for a client certificate and checking it by PIN in
    // the handler rather than by a chain, the way the real door does.
    const door = createHttpsServer({ key: served.key, cert: served.cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false }, handler);
    door.on('secureConnection', (s) => {
      counts.handshakes += 1;
      let clientPin = null;
      try {
        const peer = s.getPeerX509Certificate?.();
        if (peer !== undefined) clientPin = b64u(createHash('sha256').update(peer.publicKey.export({ type: 'spki', format: 'der' })).digest());
      } catch {
        clientPin = null;
      }
      emit({ kind: 'handshake', arm, servername: typeof s.servername === 'string' ? s.servername : null, clientPin, tls: s.getProtocol?.() ?? null });
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

    const exp = Date.now() + 3 * 60_000;
    const payload = J({ v: 3, host: HOSTILE_NAME, port: HOSTILE_PUBLIC_PORT, fp: pinned.pin, dk, dx, ps, exp });
    return {
      arm,
      port,
      name: HOSTILE_NAME,
      publicPort: HOSTILE_PUBLIC_PORT,
      pin: pinned.pin,
      servedPin: served.pin,
      sans: pinned.sans,
      payload,
      dx,
      ps,
      sessionToOpen: world.sessionId,
      turnCount: world.turns.length,
      answers: world.answers ?? null,
      // Phase 317: the End the write arms' session offers, and where its words came from.
      endOffer: world.endOffer ?? null,
      endConfirm: world.endConfirm ?? null,
      endConfirmFrom: world.endConfirmFrom ?? null,
      // The door's own write sentences, which a write arm's `door` keys name.
      writeSentences: words === null ? null : { ...words.POCKET_WRITE_SENTENCES },
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

async function serve(arm, md3) {
  const out = (line) => process.stdout.write(`${line}\n`);
  const door = await startHostileDoor(arm, (event) => out(`P316_DOOR_EVENT:${J(event)}`), { md3 });
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
      name: door.name,
      publicPort: door.publicPort,
      pin: door.pin,
      servedPin: door.servedPin,
      payload: door.payload,
      sessionToOpen: door.sessionToOpen,
      turnCount: door.turnCount,
      // Phase 316.6: an md arm's turns, by name and size only.
      answers: door.answers === null ? null : door.answers.map((a) => ({ name: a.name, bytes: Buffer.byteLength(a.text) })),
      // Phase 317: the write arms' End, for the probe to hold the dialog to.
      endOffer: door.endOffer,
      endConfirm: door.endConfirm,
      endConfirmFrom: door.endConfirmFrom,
      writeSentences: door.writeSentences
    })}`
  );
}

// ---------------------------------------------------------------------------
// --self-test: every arm driven by the node phone, no Simulator
// ---------------------------------------------------------------------------

/** Split a raw answer into its status line, its header lines and its body. */
export function splitRaw(bytes) {
  const at = bytes.indexOf('\r\n\r\n');
  if (at === -1) return { status: bytes.toString('latin1').split('\r\n')[0], headers: [], body: Buffer.alloc(0), headBytes: bytes.length };
  const lines = bytes.subarray(0, at).toString('latin1').split('\r\n');
  return { status: lines[0], headers: lines.slice(1), body: bytes.subarray(at + 4), headBytes: at + 4 };
}

/**
 * THE NODE PHONE AGAINST THE SHIPPING TYPESCRIPT. build/p316/node-phone.mjs is
 * written from the SPEC's wire format and never from src/main/pocket/, and
 * ios/TortieTests/Fixtures/vectors.json is what the SHIPPING pairing.ts and
 * tls.ts wrote (build/p316/vectors.mjs). Where the two agree, the node phone
 * every probe pairs with speaks the Mac's wire; where they do not, one of them
 * is wrong, and the arm names which field.
 */
function vectorsAgree() {
  const file = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
  const v = JSON.parse(readFileSync(file, 'utf8'));
  const x25519 = (seedHex) => createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' });
  const k = v.keys;
  const opened = openPresentation(v.seal.secret, Buffer.from(v.seal.fromPhone.body, 'utf8'));
  const offers = (v.qr ?? []).map((q) => readOffer(q.payload));
  const allowed = pairAnswerOf({ body: v.pairAnswers.allowed });
  // The phone's refusals of a code, on the shipping code's own bytes with one
  // thing changed each (SPEC §4.8.1): an earlier version, an address for a
  // host, a port that is not 8443 or 10000, a tailnet key, a host off ts.net.
  const good = JSON.parse(v.qr[0].payload);
  const variant = (patch) => readOffer(J({ ...good, ...patch })).ok;
  const withTk = readOffer(J({ ...good, tk: 'tskey-auth-kMADEUP-0' })).ok;
  const rows = [
    ['a v:2 code is refused', variant({ v: 2 }) === false],
    ['a code naming an address is refused', variant({ host: '100.64.0.1' }) === false],
    ['a code naming port 443 is refused', variant({ port: 443 }) === false],
    ['a code carrying a tailnet key is refused', withTk === false],
    ['a code naming a host off ts.net is refused', variant({ host: 'p330-mac.example.com' }) === false],
    ['the phone id', phoneIdOf(k.phoneSigningKey) === v.identity.phoneId],
    ['the three-key fingerprint', fingerprintOf(k.phoneSigningKey, k.phoneExchangeKey, k.clientKey) === v.identity.fingerprint],
    ['the binding', bindingOf(x25519(k.phoneExchangeSeed), k.macExchangeKey, k.macExchangeKey, k.phoneExchangeKey) === v.identity.binding],
    ['the client-key pin', clientKeyPinOf(k.clientKey) === v.identity.clientPin],
    ['the challenge', challengeOf(v.seal.secret) === v.seal.challenge],
    ['the proof text', proofTextOf(v.seal.challenge, v.seal.fromPhone.iv, v.seal.fromPhone.ct, v.seal.fromPhone.tag) === v.seal.fromPhone.proof],
    ['the presentation opens and its proof holds', opened !== null && opened.proofOk && opened.clientKey === k.clientKey && opened.label === v.seal.label],
    ['every code reads the phone\'s way', offers.length > 0 && offers.every((o) => o.ok)],
    ['the certificate names the client key', adoptCertificate({ clientKey: v.client.clientKey }, v.client.certificateDer).ok],
    ['allowed carries the certificate and nothing else', allowed.state === 'allowed' && J(allowed.keys) === J(['cert', 'state'])]
  ];
  return { ok: rows.every(([, ok]) => ok), failed: rows.filter(([, ok]) => !ok).map(([name]) => name), count: rows.length };
}

/** The listener the self-test names; nothing listens there, and nothing dials it. */
const SELF_TEST_MD3 = '127.0.0.1:9';

async function selfTest() {
  const results = [];
  const check = (arm, ok, said) => {
    results.push({ arm, ok, said });
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${arm.padEnd(16)} ${said}\n`);
  };
  try {
    const agreed = vectorsAgree();
    check('vectors', agreed.ok, agreed.ok ? `the node phone agrees with the shipping TypeScript's vectors on all ${String(agreed.count)} fields` : `the node phone DISAGREES with the shipping TypeScript's vectors on ${J(agreed.failed)}`);
  } catch (err) {
    check('vectors', false, `the vectors could not be read: ${String(err?.message ?? err)}`);
  }
  for (const arm of Object.keys(HOSTILE_ARMS)) {
    const events = [];
    let door = null;
    try {
      door = await startHostileDoor(arm, (e) => events.push(e), { md3: SELF_TEST_MD3 });
      const qr = JSON.parse(door.payload);
      const d = doorFrom(qr, door.port);
      if (arm === 'wrong-key') {
        const p = makePhone('p316 self-test phone', qr.dx);
        const got = await present(d, sealPresentation(qr.ps, p));
        check(arm, got.status === 0 && /not the pinned/.test(got.error ?? '') && door.counts.requests === 0 && door.pin !== door.servedPin, `the pinned client stopped at the handshake (${got.error ?? got.status}); the door served ${String(door.counts.requests)} request(s)`);
        continue;
      }
      const phone = makePhone('p316 self-test phone', qr.dx);
      if (arm === 'pair-word') {
        const got = await present(d, sealPresentation(qr.ps, phone));
        let word = null;
        try {
          word = JSON.parse(got.body).state;
        } catch {
          word = null;
        }
        check(arm, !['pending', 'allowed', 'refused'].includes(word), `/pair answered ${J(word)}`);
        continue;
      }
      // A presentation whose proof is signed by another key is refused, so the
      // door checks the proof the phone must make.
      const stranger = generateKeyPairSync('ed25519').privateKey;
      const forged = await present(d, sealPresentation(qr.ps, phone, { signWith: stranger }));
      const paired = await pairThrough(d, qr, phone, { tries: 3, everyMs: 50 });
      const cert = paired.ok ? new X509Certificate(paired.cert.der) : null;
      if (!paired.ok || JSON.parse(forged.body).state !== 'refused') {
        check(arm, false, `pairing answered ${J(paired.words)} (${paired.why}); a proof by another key answered ${J(forged.body)}`);
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
      /** Every signed read so far presented the client identity, over TLS 1.3, with the name as SNI and Host; and there was one. */
      const mtlsNow = () => {
        const reads = events.filter((e) => e.kind === 'request' && e.verified !== undefined);
        return reads.length > 0 && reads.every((e) => e.channelHeld === true && e.servername === HOSTILE_NAME && e.host === `${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}` && e.tls === 'TLSv1.3');
      };
      const first = listArm ? 'the first read honest and presenting its identity, then ' : '';
      if (HOSTILE_ARMS[arm].raw === true) {
        const target = '/v1/blocked';
        const headers = signedHeaders(phone, target);
        const request = Buffer.from(
          [`GET ${target} HTTP/1.1`, `Host: ${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), 'Connection: close', '', ''].join('\r\n'),
          'utf8'
        );
        const raw = await rawExchange({ door: d, bytes: request, identity: phone, capBytes: 8 * 1024 * 1024 });
        const mtls = mtlsNow();
        const { status, headers: lines, body, headBytes } = splitRaw(raw.bytes);
        const lengths = lines.filter((l) => /^content-length:/i.test(l));
        const declared = lengths.length === 1 ? Number(lengths[0].split(':')[1]) : null;
        const says = {
          chunked: lines.some((l) => /^transfer-encoding:\s*chunked$/i.test(l)) && lengths.length === 0,
          'no-length': lengths.length === 0 && !lines.some((l) => /^transfer-encoding:/i.test(l)) && body.length > 0,
          'two-lengths': lengths.length === 2,
          'over-cap': declared !== null && declared > 2 * 1024 * 1024 && body.length === declared,
          'huge-header': lines.some((l) => l.length >= HUGE_HEADER_BYTES) && headBytes > 16 * 1024,
          'not-http11': /^HTTP\/1\.0 200 /.test(status),
          'early-close': declared !== null && body.length < declared,
          'not-json': status.startsWith('HTTP/1.1 200 ') && lines.some((l) => /^content-type:\s*text\/plain/i.test(l)) && declared === body.length
        }[arm];
        check(arm, raw.handshook && says === true && mtls, `${first}the raw answer: ${J(status)}, ${String(lines.length)} header line(s) (${lengths.length} Content-Length${declared === null ? '' : ` = ${String(declared)}`}), ${String(body.length)} body byte(s); every signed read over TLS 1.3 with the client identity, the name as SNI and Host: ${String(mtls)}`);
        continue;
      }
      if (HOSTILE_ARMS[arm].md === true) {
        // THE MARKDOWN ARMS: the list honest, then the conversation paged
        // whole, every answer the fixture byte for byte with {{MD3}} filled.
        const blocked = await signedGet(phone, d, '/v1/blocked');
        const paged = await pageBack(phone, d, door.sessionToOpen, 20, 50);
        const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
        const want = markdownAnswers(arm, SELF_TEST_MD3);
        const same = all.length === want.length && all.every((t, k) => t.answerText === want[k].text && t.askText === `p3166 md ${want[k].name}`);
        const filled = all.every((t) => !t.answerText.includes('{{MD3}}')) && all.some((t) => t.answerText.includes(SELF_TEST_MD3)) === (arm === 'md-hostile');
        const total = want.reduce((n, a) => n + Buffer.byteLength(a.text), 0);
        const pageBytes = Math.max(...paged.pages.map((p) => Buffer.byteLength(J(p))));
        const sized = arm === 'md-hostile' ? total < MD_HOSTILE_BYTES : pageBytes <= MD_HUGE_PAGE_BYTES && want.every((a) => a.text.length > 512 * 1024);
        const mtls = mtlsNow();
        check(
          arm,
          blocked.status === 200 && paged.ok && same && filled && sized && mtls,
          `the list ${String(blocked.status)}; ${String(all.length)} of ${String(want.length)} turns paged back over ${String(paged.pages.length)} page(s), every answer the fixture byte for byte: ${String(same)}; {{MD3}} filled with ${SELF_TEST_MD3}: ${String(filled)}; ${String(total)} bytes in all, the largest page ${String(pageBytes)} bytes (${arm === 'md-hostile' ? 'under 1.5 MiB together' : 'each answer over 512 KiB, the page at most 1.8 MiB'}: ${String(sized)}); every read over TLS 1.3 with the client identity: ${String(mtls)}`
        );
        continue;
      }
      if (HOSTILE_ARMS[arm].write === true) {
        // THE WRITE ARMS (Phase 317): the session offers what the arm says,
        // and the one POST is answered the arm's way, counted once.
        const spec = HOSTILE_ARMS[arm];
        const sessionTarget = `/v1/session?id=${encodeURIComponent(door.sessionToOpen)}`;
        const read = await signedGet(phone, d, sessionTarget);
        let s = null;
        try {
          s = JSON.parse(read.body).session;
        } catch {
          s = null;
        }
        const offered =
          spec.title === 'unreachable'
            ? s?.end?.state === 'unreachable' && typeof s?.end?.title === 'string' && s.end.title.length > 0 && s.endConfirm === null
            : s?.end?.state === 'offered' && s?.end?.batch === true && s?.endConfirm?.title === `End '${String(s?.name)}'?` && s?.endConfirm?.confirmLabel === 'End session' && typeof s?.endConfirm?.body === 'string' && s.endConfirm.body.length > 0;
        if (spec.posts === 0) {
          check(arm, read.status === 200 && offered && door.counts.writes === 0, `the session's end reads ${J(s?.end)} with endConfirm ${J(s?.endConfirm)}; ${String(door.counts.writes)} write(s) arrived`);
          continue;
        }
        const id = randomBytes(16).toString('hex');
        const got = await signedPost(phone, d, '/v1/end', { batch: false, session: door.sessionToOpen, write: id }, { timeoutMs: arm === 'write-late' ? 2_000 : 20_000 });
        let said = null;
        try {
          said = JSON.parse(got.body);
        } catch {
          said = null;
        }
        const unreadable = (await writeWords()).POCKET_WRITE_SENTENCES.unreadable;
        const shape = {
          'write-other-id': got.status === 200 && said?.write !== id && /^[0-9a-f]{32}$/.test(said?.write ?? '') && said?.outcome === 'done',
          'write-malformed-empty': got.status === 200 && said?.write === '' && said?.outcome === 'refused' && said?.reason === 'malformed' && said?.sentence === unreadable,
          'write-unknown-outcome': got.status === 200 && said?.write === id && !['done', 'refused', 'failed', 'busy'].includes(said?.outcome),
          'write-cut': got.status === 0,
          'write-late': got.status === 0 && /timed out/.test(got.error ?? ''),
          'write-404': got.status === 404 && got.body === '',
          'write-malformed': got.status === 200 && said === null,
          'write-cut-reread-refused': got.status === 0
        }[arm];
        const reread = arm === 'write-cut-reread-refused' ? (await signedGet(phone, d, sessionTarget)).status : null;
        const writeEvents = events.filter((e) => e.kind === 'request' && e.write !== undefined);
        const signedOk = writeEvents.length === 1 && writeEvents[0].verified === 'ok' && writeEvents[0].channelHeld === true;
        check(
          arm,
          read.status === 200 && offered && shape === true && door.counts.writes === 1 && signedOk && (reread === null || reread === 404),
          `the session offers ${J(s?.end)} with the Mac's confirm (${String(door.endConfirmFrom)}); the one POST answered ${String(got.status)}${got.error ? ` (${got.error})` : ''} ${got.body.slice(0, 120)}; ${String(door.counts.writes)} write(s) counted, verified over its body with the client identity: ${String(signedOk)}${reread === null ? '' : `; the read after it answered ${String(reread)}`}`
        );
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
      let mtls = mtlsNow();
      const certNote = cert === null ? '' : `; the client certificate names the phone's key (${cert.subject.replace(/\n/g, ' ')})`;
      if (arm === 'huge-row') check(arm, blocked.bytes > HUGE_BYTES && verified && mtls, `${first}/v1/blocked sent ${String(blocked.bytes)} bytes`);
      else if (arm === 'unknown-status') check(arm, body?.rows?.[0]?.statusLabel === 'levitating' && mtls, `the first row's word is ${J(body?.rows?.[0]?.statusLabel)}`);
      else if (arm === 'unknown-dot') check(arm, body?.rows?.[0]?.statusDot === 'plaid' && mtls, `the first row's dot is ${J(body?.rows?.[0]?.statusDot)}`);
      else if (arm === 'malformed') check(arm, blocked.status === 200 && body === null && mtls, `${first}/v1/blocked answered ${String(blocked.status)} and ${body === null ? 'does not parse' : 'PARSES'}`);
      else if (arm === 'missing-fields') check(arm, body !== null && body.rows?.[0]?.statusLabel === undefined && body.rows?.[0]?.sessionId === undefined && mtls, `${first}the rows carry no statusLabel and no sessionId`);
      else if (arm === 'never-completes') check(arm, blocked.status === 0 && /timed out|socket hang up/.test(blocked.error ?? '') && mtls, `${first}the read ended ${blocked.error ?? blocked.status} after the client's own limit`);
      else {
        const paged = await pageBack(phone, d, door.sessionToOpen, 7, 12);
        const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
        const indexes = all.map((t) => t.index);
        const contiguous = indexes.every((ix, k) => k === 0 || ix === indexes[k - 1] + 1);
        const pagesForward = paged.pages.length > 1 && paged.pages[1].turns.length > 0 && paged.pages[1].turns[0].index >= paged.pages[0].turns[0].index;
        if (arm === 'honest') {
          mtls = mtlsNow();
          // Without the client identity, an honest door still answers (it is
          // hostile, not strict), but its event records no client key: the
          // probe grades the APP on presenting one, and this proves the event
          // would show a read that did not.
          const bare = { ...phone, certPem: null };
          await signedGet(bare, d, '/v1/blocked');
          const bareEvent = events.filter((e) => e.kind === 'request' && e.route === 'GET /v1/blocked').pop();
          // Phase 317: an honest write is answered done with its id; the same
          // signature over a body with one byte changed is refused 404.
          const writeId = randomBytes(16).toString('hex');
          const writeFields = { batch: false, session: door.sessionToOpen, write: writeId };
          const honestWrite = await signedPost(phone, d, '/v1/end', writeFields);
          const forgedWrite = await signedPost(phone, d, '/v1/end', writeFields, {
            signedBody: writeBodyOf(writeFields),
            body: writeBodyOf({ ...writeFields, write: writeId.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')) })
          });
          const writesHold = honestWrite.status === 200 && JSON.parse(honestWrite.body).write === writeId && forgedWrite.status === 404 && door.counts.writes === 2;
          check(
            arm,
            blocked.status === 200 && body !== null && paged.ok && all.length === door.turnCount && contiguous && indexes[0] === 0 && verified && mtls && bareEvent?.clientPin === null && bareEvent?.channelHeld === false && writesHold,
            `paired (a proof by another key refused), the list read, the conversation paged to the first turn: ${String(all.length)} of ${String(door.turnCount)} turns, contiguous ${String(contiguous)}; every signature verified; every read over TLS 1.3 with the client identity and the name: ${String(mtls)}; a read without the identity is recorded as such; an honest write answered ${String(honestWrite.status)} with its id and the same signature over a changed body ${String(forgedWrite.status)}${certNote}`
          );
        } else if (arm === 'pages-backwards') {
          check(arm, pagesForward, `the older page starts at ${J(paged.pages[1]?.turns?.[0]?.index)} after a page that started at ${J(paged.pages[0]?.turns?.[0]?.index)}`);
        } else if (arm === 'pages-overlap') {
          const a = new Set(paged.pages[0]?.turns.map((t) => t.index));
          check(arm, (paged.pages[1]?.turns ?? []).some((t) => a.has(t.index)), 'the older page repeats a turn of the newest');
        } else if (arm === 'more-forever') {
          check(arm, !paged.ok && /says more and carries nothing/.test(paged.why), `paging stopped: ${paged.why}`);
        } else if (arm === 'more-negative') {
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
      check(arm, false, `threw: ${String(err?.stack ?? err)}`);
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
    const md3At = args.indexOf('--md3');
    const md3 = md3At === -1 ? MD3_UNSET : md3Of(args[md3At + 1]);
    if (md3 === null) {
      process.stderr.write(`${TAG} --md3 takes 127.0.0.1:<port> and nothing else\n`);
      process.exit(2);
    }
    await serve(at === -1 ? 'honest' : String(args[at + 1]), md3);
  } else {
    process.stderr.write(`${TAG} usage: --self-test | serve --arm <${Object.keys(HOSTILE_ARMS).join('|')}> [--md3 127.0.0.1:<port>]\n`);
    process.exit(2);
  }
}

export const hostileDoorPath = HERE;
