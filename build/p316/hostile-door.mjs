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
 *   THE REPLY ARMS (Phase 318, build/p318/SPEC.md §7.7 RH and §6.3 (t)). Each
 *   answers the pairing, the list and the session honestly, the session
 *   carrying a reply offer: a press arm's session WAITS, its options
 *   pressable under a made-up question id and mark (the vectors'
 *   `session-waiting`), and a message arm's session sits at its prompt with
 *   `canSay` true (the vectors' `session-talk`). It answers the ONE
 *   `POST /v1/choose` or `POST /v1/say` a press or a Send sends in its own way,
 *   counted and verified over its body like End's:
 *   reply-other-id          a 200 to a press whose write id is not the one sent
 *   reply-refused-changed   a 200 `refused` `changed` to a press, with the
 *                           Mac's own LIFECYCLE_SESSION_CHANGED: drawn as said
 *   reply-unknown-reason    a 200 `refused` to a message with a reason word the
 *                           Mac never says: no answer, and his words kept
 *   reply-cut               a message's connection cut after its request was
 *                           read: the no-answer line, over a read that came back
 *   reply-cut-reread-refused  a message cut, then every read refused: the
 *                           read's own consequence, Pairing, never the
 *                           no-answer line
 *   reply-404               a 404 with no body to a press: not taken
 *   reply-late              no answer to a message for longer than 15 s
 *   reply-say-done          a 200 `done` to a message: `Sent`, the box empty
 *   Each names its verb, where it ends (`at`), the Copy.swift words it may end
 *   in (`expect`), the Mac's own sentences (`mac`, constants of
 *   src/shared/lifecycle-words.ts or src/shared/reply-copy.ts) and the words it
 *   must never draw (`never`).
 *
 * THE SCREEN ARMS (Phase 337, build/p337/SPEC.md §7.8 PSH and §6.4 (t)).
 * Every arm answers `GET /v1/screen` and `POST /v1/keys` now: the honest
 * screen is the vectors' `screen-sample` answer, which the SHIPPING
 * `screenOf` re-composed from the sample the shipping composer wrote, its
 * revision moving only when the door is told to (`screen-next` on a served
 * door's stdin, or `nextScreen()`), a `since` that is current held 2 s and
 * answered `unchanged`; and an honest keys write is counted, verified over its
 * body and answered `done`. The screen arms answer the FIRST `/v1/screen`
 * honestly, so the Screen draws, and meet the phone's NEXT read their way:
 *   screen-run-past-cols        a run whose cells pass `cols`
 *   screen-style-out-of-range   a run whose style index is past the table
 *   screen-colour-not-hex       a style colour that is not `#rrggbb`
 *   screen-cols-513             `cols` 513, over the contract's 512
 *   screen-cursor-y-rows        `cursor.y` equal to `rows`
 *   screen-unchanged-with-screen  `unchanged: true` with a screen carried
 *   screen-chunked              the answer chunked, as raw bytes
 *   screen-never-answers        no answer, for longer than the phone's 15 s
 *   THE KEPT LINES (D25, §Attack A12): the answer is honest, the line is not:
 *   screen-kept-closed          the kept connection closed after its first
 *                               answer: the read asked once more, and drawn
 *   screen-stray-answer         a SECOND, unasked answer written on the kept
 *                               line after the first: the line closed, the
 *                               stray never drawn
 *   screen-connection-close     the first answer says `Connection: close`:
 *                               the next read on a new line
 *   THE KEYS (D17, D30): one POST per batch, answered its own way:
 *   keys-404                    a 404 with no body: not taken
 *   keys-other-id               a 200 whose write id is not the one sent
 * Each names where it ends (`at`) and the Copy.swift words it may end in
 * (`expect`); a keys arm counts its POSTs (`posts`). Every `/v1/screen` and
 * `/v1/keys` event carries the connection's own serial, so the probe can count
 * handshakes against reads and say which line carried which request.
 *
 * THE SCROLLBACK ARMS (Phase 337.1, build/p3371/SPEC.md §7.8 PSH and §6.4
 * (t), names pinned there). Every arm's honest screen now carries a history,
 * `depth` HOSTILE_HISTORY_DEPTH and `space` HOSTILE_SPACE, and every arm
 * answers `GET /v1/scrollback` (the six names, each once, signed) with a page
 * of that history, numbered lines `L000001 …` (build/p3371/history-stand-in.mjs's
 * own spelling) cut to the `wrap` asked, one style. The scrollback arms answer
 * the Screen honestly and their PAGES their own way, so each must end with the
 * live terminal drawn and the app in the foreground:
 *   scrollback-extra-rows   every page carries ten rows more than asked
 *   scrollback-from         every page's `from` is one past the one asked
 *   scrollback-colour       every page's style colour is not `#rrggbb`
 *   scrollback-overlap-lie  the first page honest; every page after it a lie
 *                           in every row, so the overlap rows are not the
 *                           held rows: the moved line drawn, nothing more asked
 *   scrollback-space        every page names another space than the live
 *                           picture's: the moved line drawn, nothing more asked
 *   scrollback-chunked      every page chunked, as raw bytes
 *   scrollback-never        no page ever answered, past the phone's 15 s: asked
 *                           again after the back-off, the live rows still drawn
 *   scrollback-404          every page a 404 with no body
 *   scrollback-fill-moved   (Phase 337.3, build/p3373/SPEC.md §7.3) the FIRST
 *                           page answered `moved` with the Mac's own sentence
 *                           (src/shared/screen-copy.ts SCROLLBACK_MOVED, as
 *                           main's absence carries it), every later one
 *                           honest: the Terminal's fill at open is refused, so
 *                           following draws no line and no history row and
 *                           asks nothing more over a still screen (D8), and a
 *                           drag then pages honestly
 * Each names where it ends (`at`) and the Copy.swift words it may end in
 * (`expect`); `retried` marks an arm whose page must be asked again after its
 * back-off, `stops` one after which no page may be asked, and `fillOnce` the
 * arm whose one hostile page is the fill's at open. Every
 * `/v1/scrollback` event carries the ask's numbers and the connection's own
 * serial, never a row.
 *
 * THE SESSIONS READ (Phase 316.7, build/p3167/SPEC.md §9.5). Every arm now
 * answers `GET /v1/sessions` too, because the Sessions tab reads it first: the
 * honest answer is composed by the SHIPPING `createPocketRoutes(facts).sessions`
 * (src/main/pocket/routes.ts) over facts built from the vectors' own
 * `/v1/blocked` rows, so the rows a conversation arm opens are the rows the
 * Sessions tab draws. The list arms answer the FIRST `/v1/sessions` honestly
 * and every one after it with their hostile body, as they do `/v1/blocked`
 * (the Sessions tab's refresh meets the body; the Needs input tab's meets
 * `/v1/blocked`'s). The write arm that refuses every read after its write
 * refuses `/v1/sessions` too. The new arms:
 *   sessions-cap          the 2,000-row cap over build/p3167/seed-sessions.mts'
 *                         `cap` world (every name at the clip, the bidi name,
 *                         three `app` groups one of them on a second machine,
 *                         two machines, two agents, `omitted` above 0),
 *                         composed by the shipping composer for whatever words
 *                         the phone sends: it must END DRAWN
 *   sessions-older-mac    `/v1/sessions` refused 404, `/v1/blocked` honest: a
 *                         Mac older than this phase, which the Sessions tab
 *                         draws as today's two sections with Select
 *   sessions-older-mac-recovers   404 for every `/v1/sessions` read until the
 *                         door is told the Mac updated (`releaseSessions()`, or
 *                         the line `sessions-honest` on a served door's stdin),
 *                         honest after: a Mac updated under the phone, whose
 *                         new tab one pull brings back (SPEC §15 F6). Until the
 *                         fix round (2026-10-03) it refused only the FIRST
 *                         read, and the older face's own appear read was
 *                         answered, so the arm could never be read
 *   sessions-dup-id, sessions-group-range, sessions-split-group,
 *   sessions-count, sessions-omitted-sum, sessions-waiting-false,
 *   sessions-omitted-negative, sessions-omitted-max, sessions-asked,
 *   sessions-show-word    one malformed `/v1/sessions` body each, every read,
 *                         each refused whole by the phone (SPEC §6.4.5):
 *                         `Copy.answerUnreadable` drawn, the app alive
 * Every `/v1/sessions` request event carries `at` and, for the sessions arms,
 * the answer's ids and groups, so the probe grades what this door SENT.
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
import { lineOf as historyLineOf } from '../p3371/history-stand-in.mjs';
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
  writeBodyOf,
  ANSWER_MAX_BYTES,
  SESSIONS_BUDGET_BYTES,
  SESSIONS_MAX_ROWS,
  askedOf,
  readSessions,
  sessionsAnswerProblems,
  sessionsBudgetBytes,
  sessionsTarget,
  screenRead,
  screenAnswerProblems,
  screenRowText,
  screenTarget,
  scrollbackAnswerProblems,
  scrollbackRead,
  scrollbackTarget,
  sendKeys,
  signedHeadersFor
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
  'write-unreachable-offer': { what: 'a session row whose End is unreachable, with the Mac\'s title under an End drawn off', ends: 'drawn', write: true, posts: 0, at: 'session-end-line', expect: [], door: [], never: ['endNoAnswer', 'endNotTaken'], title: 'unreachable' },
  // THE REPLY ARMS (Phase 318, SPEC §7.7 RH). One POST per press or Send, each
  // answered its own way; the line under the options or the box is graded.
  'reply-other-id': { what: 'a 200 to a press whose write id is not the one sent', ends: 'sentence', reply: true, verb: 'choose', posts: 1, at: 'session-reply-line', expect: ['endNoAnswer'], mac: [], never: [] },
  'reply-refused-changed': { what: 'a 200 refused changed to a press, with the Mac\'s own sentence', ends: 'sentence', reply: true, verb: 'choose', posts: 1, at: 'session-reply-line', expect: [], mac: ['LIFECYCLE_SESSION_CHANGED'], never: ['endNoAnswer'] },
  'reply-unknown-reason': { what: 'a 200 refused to a message with a reason word the Mac never says', ends: 'sentence', reply: true, verb: 'say', posts: 1, at: 'session-message-line', expect: ['endNoAnswer'], mac: [], never: ['replySent'], kept: true },
  'reply-cut': { what: 'a message\'s connection cut after its request was read', ends: 'sentence', reply: true, verb: 'say', posts: 1, at: 'session-message-line', expect: ['endNoAnswer'], mac: [], never: ['replySent'], kept: true },
  'reply-cut-reread-refused': { what: 'a message cut after its request, then every read refused', ends: 'pairing', reply: true, verb: 'say', posts: 1, at: 'screen-pairing', expect: [], mac: [], never: ['endNoAnswer', 'replySent'] },
  'reply-404': { what: 'a 404 with no body to a press, the door\'s own refusal', ends: 'sentence', reply: true, verb: 'choose', posts: 1, at: 'session-reply-line', expect: ['replyNotTaken'], mac: [], never: ['endNoAnswer'] },
  'reply-late': { what: 'no answer to a message for longer than the phone\'s 15 s', ends: 'sentence', reply: true, verb: 'say', posts: 1, at: 'session-message-line', expect: ['endNoAnswer'], mac: [], never: ['replySent'], kept: true },
  'reply-say-done': { what: 'a 200 done to a message: Sent, and the box empty', ends: 'sentence', reply: true, verb: 'say', posts: 1, at: 'session-message-line', expect: ['replySent'], mac: [], never: ['endNoAnswer'], cleared: true },
  // THE SESSIONS ARMS (Phase 316.7, build/p3167/SPEC.md §9.5). `sessions` marks
  // them; `floor: true` names the ones probe:p316 also drives on iOS 18.3 by
  // default. A malformed arm's `breaks` names the refusal of §6.4.5 its body
  // must meet, which the self-test reads back through the node phone's own
  // re-derivation (`sessionsAnswerProblems`).
  'sessions-cap': { what: 'the 2,000-row cap: every name at the clip, the bidi name, three app groups one elsewhere, two machines, two agents, omitted above 0', ends: 'drawn', sessions: 'cap', floor: true },
  'sessions-older-mac': { what: 'a Mac older than this phase: /v1/sessions refused 404, /v1/blocked honest', ends: 'older', sessions: 'missing', floor: true },
  'sessions-older-mac-recovers': { what: 'a Mac updated under the phone: /v1/sessions 404 until the probe says the Mac updated, honest after', ends: 'recovers', sessions: 'missing-first', floor: true },
  'sessions-dup-id': { what: 'a /v1/sessions row id twice', ends: 'sentence', sessions: 'malformed', breaks: 'listed twice', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-group-range': { what: 'a /v1/sessions row whose group is outside groups', ends: 'sentence', sessions: 'malformed', breaks: 'is outside groups', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-split-group': { what: 'a /v1/sessions group whose rows are not together under Project', ends: 'sentence', sessions: 'malformed', breaks: 'not together', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-count': { what: 'a /v1/sessions group whose count is not its drawn rows plus its omitted', ends: 'sentence', sessions: 'malformed', breaks: 'drawn row(s) plus', at: 'list-failure', expect: ['answerUnreadable'], floor: true },
  'sessions-omitted-sum': { what: '/v1/sessions groups whose omitted sum above the top-level omitted', ends: 'sentence', sessions: 'malformed', breaks: 'omitted sum to', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-waiting-false': { what: 'a /v1/sessions group reading waiting false over a waiting row', ends: 'sentence', sessions: 'malformed', breaks: 'waiting false', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-omitted-negative': { what: 'a /v1/sessions omitted below zero', ends: 'sentence', sessions: 'malformed', breaks: 'omitted -1', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-omitted-max': { what: 'a /v1/sessions omitted of Int.max', ends: 'sentence', sessions: 'malformed', breaks: 'omitted 9223372036854776000', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-asked': { what: 'a /v1/sessions answer to another question', ends: 'sentence', sessions: 'malformed', breaks: 'is not the question sent', at: 'list-failure', expect: ['answerUnreadable'] },
  'sessions-show-word': { what: 'a /v1/sessions answer with a Show word the Mac never says', ends: 'sentence', sessions: 'malformed', breaks: 'is not a Show word', at: 'list-failure', expect: ['answerUnreadable'] },
  // THE SCREEN ARMS (Phase 337, build/p337/SPEC.md §7.8 PSH). The first
  // /v1/screen read is answered honestly, so a picture is drawn; the next
  // meets the arm, and a refused answer keeps the last picture under
  // Copy.screenNotAnswering at the Screen's line.
  'screen-run-past-cols': { what: 'a /v1/screen run whose cells pass cols', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-style-out-of-range': { what: 'a /v1/screen run whose style index is past the table', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-colour-not-hex': { what: 'a /v1/screen style colour that is not #rrggbb', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-cols-513': { what: 'a /v1/screen answer of 513 columns', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-cursor-y-rows': { what: 'a /v1/screen cursor whose y is rows', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-unchanged-with-screen': { what: 'a /v1/screen answer unchanged that carries a screen', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-chunked': { what: 'a /v1/screen answer chunked', ends: 'sentence', screen: true, raw: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-never-answers': { what: 'a /v1/screen read never answered, past the phone\'s 15 s', ends: 'sentence', screen: true, at: 'screen-line', expect: ['screenNotAnswering'] },
  'screen-kept-closed': { what: 'the kept connection closed after its first answer: the read asked once more on a new line', ends: 'drawn', screen: true, at: 'screen-grid', expect: [], kept: 'closed' },
  'screen-stray-answer': { what: 'a second, unasked answer on the kept line after the first: the line closed, the stray never drawn', ends: 'drawn', screen: true, at: 'screen-grid', expect: [], kept: 'stray' },
  'screen-connection-close': { what: 'the first /v1/screen answer says Connection: close: the next read on a new line', ends: 'drawn', screen: true, at: 'screen-grid', expect: [], kept: 'close' },
  'keys-404': { what: 'a 404 with no body to a keys write', ends: 'sentence', screen: true, keys: true, posts: 1, at: 'screen-line', expect: ['replyNotTaken'] },
  'keys-other-id': { what: 'a 200 to a keys write whose write id is not the one sent', ends: 'sentence', screen: true, keys: true, posts: 1, at: 'screen-line', expect: ['endNoAnswer'] },
  // THE SCROLLBACK ARMS (Phase 337.1, build/p3371/SPEC.md §7.8 PSH, names
  // pinned in §6.4 (t)). The Screen is answered honestly; the pages meet the
  // arm. `scrollback` says which pages: 'every' or 'after-first'.
  // A page well formed but holding rows not asked is a page the phone does not join (ScrollbackLayout.accept,
  // build/p3371/SPEC.md §5.5.4 "anything else sets edge = .moved"), so it draws the moved line and asks no more,
  // where a page its decoder refuses (from, colour, chunked) is a read that failed and is asked again.
  'scrollback-extra-rows': { what: 'a /v1/scrollback page with ten rows more than asked', ends: 'sentence', scrollback: 'every', at: 'screen-scrollback-line', expect: ['scrollbackMoved'], stops: true },
  'scrollback-from': { what: 'a /v1/scrollback page whose from is not the one asked', ends: 'drawn', scrollback: 'every', at: 'screen-grid', expect: [], retried: true },
  'scrollback-colour': { what: 'a /v1/scrollback page whose style colour is not #rrggbb', ends: 'drawn', scrollback: 'every', at: 'screen-grid', expect: [], retried: true },
  'scrollback-overlap-lie': { what: 'an older page whose overlap rows are not the rows the phone holds', ends: 'sentence', scrollback: 'after-first', at: 'screen-scrollback-line', expect: ['scrollbackMoved'], stops: true },
  'scrollback-space': { what: 'a page of another space than the live picture', ends: 'sentence', scrollback: 'every', at: 'screen-scrollback-line', expect: ['scrollbackMoved'], stops: true },
  'scrollback-chunked': { what: 'a /v1/scrollback page chunked', ends: 'drawn', scrollback: 'every', raw: true, at: 'screen-grid', expect: [], retried: true },
  'scrollback-never': { what: 'a /v1/scrollback page never answered, past the phone\'s 15 s', ends: 'drawn', scrollback: 'every', at: 'screen-grid', expect: [], retried: true, live: true },
  'scrollback-404': { what: 'a 404 with no body to a page', ends: 'drawn', scrollback: 'every', at: 'screen-grid', expect: [] },
  // PHASE 337.3 (build/p3373/SPEC.md §7.3, D8): the fill's one page at open answered moved, every later page honest.
  'scrollback-fill-moved': { what: 'the first /v1/scrollback page answered moved with the Mac\'s sentence, every later one honest', ends: 'drawn', scrollback: 'first', at: 'screen-grid', expect: [], fillOnce: true }
});

/** The names of the Screen's arms (Phase 337). */
export const SCREEN_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].screen === true));
/** The names of the scrollback arms (Phase 337.1), as conformance:ios (t) and probe:p316's PSH read them. */
export const SCROLLBACK_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => typeof HOSTILE_ARMS[a].scrollback === 'string'));
/** Phase 337.1: the depth of the history every arm's honest screen offers, and the space it names. */
export const HOSTILE_HISTORY_DEPTH = 600;
export const HOSTILE_SPACE = '5c3a1f0e9d8b';
/** The space a scrollback-space arm's pages name instead. */
export const HOSTILE_OTHER_SPACE = '0f1e2d3c4b5a';
/** The six names of a `/v1/scrollback` query, sorted. */
const SCROLLBACK_PARAMS = 'count,depth,from,id,keep,wrap';
const WHOLE_TEXT = /^(0|[1-9][0-9]{0,5})$/;

/**
 * A `/v1/scrollback` query read as the Mac reads it (build/p3371/SPEC.md D7):
 * the six names each once and nothing else, every number whole and bounded,
 * `from + count` within `depth`, `keep` `top` or `bottom`. The ask, or null.
 */
export function scrollbackAskOf(searchParams) {
  const names = [...searchParams.keys()];
  if (names.length !== 6 || [...names].sort().join(',') !== SCROLLBACK_PARAMS) return null;
  const id = searchParams.get('id') ?? '';
  const keep = searchParams.get('keep');
  const n = {};
  for (const k of ['from', 'count', 'depth', 'wrap']) {
    const v = searchParams.get(k) ?? '';
    if (!WHOLE_TEXT.test(v)) return null;
    n[k] = Number(v);
  }
  if (!(id.length >= 1 && id.length <= 128) || (keep !== 'top' && keep !== 'bottom')) return null;
  if (!(n.count >= 1 && n.count <= 128 && n.depth <= 100_000 && n.from + n.count <= n.depth && n.wrap >= 1 && n.wrap <= 512)) return null;
  return { id, from: n.from, count: n.count, depth: n.depth, wrap: n.wrap, keep };
}

/** The honest page of the door's history for an ask: numbered lines cut to its wrap, one style. */
export function honestPageOf(ask, lineOf) {
  const rows = [];
  for (let i = ask.from; i < Math.min(ask.from + ask.count, HOSTILE_HISTORY_DEPTH); i += 1) {
    const text = lineOf(i + 1).slice(0, ask.wrap);
    rows.push([{ text, style: 0, cells: text.length }]);
  }
  return {
    sessionId: ask.id,
    at: Date.now(),
    from: ask.from,
    depth: Math.max(ask.depth, HOSTILE_HISTORY_DEPTH),
    wrap: ask.wrap,
    space: HOSTILE_SPACE,
    styles: [{ fg: '#d4d4d4', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }],
    rows,
    why: null,
    sentence: null
  };
}

/** A scrollback arm's page over an honest one (the raw, never and 404 arms are written by the door itself). */
export function hostilePage(arm, honest, lineOf) {
  const a = structuredClone(honest);
  switch (arm) {
    case 'scrollback-extra-rows': {
      // Ten rows more than asked, inside the 128-row bound and the depth, so a decoder that reads its bounds alone
      // takes them: below the page when the history has room, above it (from ten earlier) when the page is its newest.
      const row = (n) => {
        const text = lineOf(n).slice(0, a.wrap);
        return [{ text, style: 0, cells: text.length }];
      };
      if (a.from + a.rows.length + 10 <= a.depth) for (let k = 0; k < 10; k += 1) a.rows.push(row(a.from + a.rows.length + 1));
      else {
        const from = Math.max(0, a.from - 10);
        a.rows = [...Array.from({ length: a.from - from }, (_, k) => row(from + k + 1)), ...a.rows];
        a.from = from;
      }
      return a;
    }
    case 'scrollback-from':
      a.from += 1;
      return a;
    case 'scrollback-colour':
      a.styles[0] = { ...a.styles[0], fg: 'red' };
      return a;
    case 'scrollback-overlap-lie':
      a.rows = a.rows.map((row) => row.map((run) => ({ ...run, text: `Z${run.text.slice(1)}` })));
      return a;
    case 'scrollback-space':
      a.space = HOSTILE_OTHER_SPACE;
      return a;
    default:
      return a;
  }
}

/**
 * Whether a scrollback arm spoils its `n`th page (1-based): `every` page,
 * the `first` alone (Phase 337.3's fill-moved), or every one `after-first`.
 */
export function pageIsHostile(spec, n) {
  if (typeof spec?.scrollback !== 'string') return false;
  if (spec.scrollback === 'every') return true;
  if (spec.scrollback === 'first') return n === 1;
  return n > 1;
}

/**
 * Phase 337.3: main's absence for a page whose history moved, field for field
 * as src/main/screen/scrollback.ts's `absent` writes it: nothing read is
 * carried, and the sentence is the Mac's own SCROLLBACK_MOVED.
 */
export function movedPageOf(ask, sentence) {
  return { sessionId: ask.id, at: Date.now(), from: null, depth: null, wrap: null, space: null, styles: [], rows: [], why: 'moved', sentence };
}

/** Phase 337.3: the Mac's own words a scrollback absence carries (src/shared/screen-copy.ts), under tsx. */
async function screenWords() {
  const copy = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'screen-copy.ts')).href);
  if (typeof copy.SCROLLBACK_MOVED !== 'string') throw new Error('the shipping tree has no SCROLLBACK_MOVED, which scrollback-fill-moved answers its first page with');
  return { SCROLLBACK_MOVED: copy.SCROLLBACK_MOVED };
}

/** How long an honest door holds a /v1/screen read whose `since` is current, before `unchanged`. */
export const SCREEN_HOLD_HONEST_MS = 2_000;

/** The honest screen answer the door serves, from the vectors' `screen-sample`, at a revision of its own. */
export function honestScreen(world, sessionId, serial) {
  const revision = createHash('sha256').update(`p316 hostile screen ${String(serial)}`).digest('hex').slice(0, 12);
  if (world.screenSample === null) return { sessionId, revision, at: Date.now(), unchanged: false, screen: null, why: 'unreachable', sentence: 'Tortie cannot reach this session’s machine now.' };
  const answer = { ...structuredClone(world.screenSample), sessionId, revision, at: Date.now(), unchanged: false, why: null, sentence: null };
  // PHASE 337.1 (D3): the honest screen offers the door's own history, which `/v1/scrollback` pages.
  if (answer.screen !== null && typeof answer.screen === 'object' && answer.screen.alternate !== true) {
    answer.screen.depth = HOSTILE_HISTORY_DEPTH;
    answer.screen.space = HOSTILE_SPACE;
  }
  return answer;
}

/** The screen arm's hostile answer to the phone's second read, over an honest one. */
export function hostileScreen(arm, honest) {
  const a = structuredClone(honest);
  const sc = a.screen;
  switch (arm) {
    case 'screen-run-past-cols': {
      const row = sc.lines.findIndex((l) => l.length > 0);
      sc.lines[Math.max(0, row)] = [{ text: 'x', style: 0, cells: sc.cols + 1 }];
      return a;
    }
    case 'screen-style-out-of-range': {
      const row = sc.lines.findIndex((l) => l.length > 0);
      sc.lines[Math.max(0, row)] = [{ text: 'x', style: sc.styles.length, cells: 1 }];
      return a;
    }
    case 'screen-colour-not-hex':
      sc.styles[0] = { ...sc.styles[0], fg: 'red' };
      return a;
    case 'screen-cols-513':
      sc.cols = 513;
      return a;
    case 'screen-cursor-y-rows':
      sc.cursor = { ...sc.cursor, y: sc.rows };
      return a;
    case 'screen-unchanged-with-screen':
      a.unchanged = true;
      return a;
    default:
      return a;
  }
}

/** The names of the sessions arms (Phase 316.7). */
export const SESSIONS_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => typeof HOSTILE_ARMS[a].sessions === 'string'));
/** `Int.max`, written into a body as its digits (a JS number would round it). */
export const INT_MAX_TEXT = '9223372036854775807';

/** The names of the write arms (Phase 317), as conformance:ios (t) reads them. */
export const WRITE_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].write === true));
/** The names of the reply arms (Phase 318), as conformance:ios (t) and probe:p316's RH read them. */
export const REPLY_ARMS = Object.freeze(Object.keys(HOSTILE_ARMS).filter((a) => HOSTILE_ARMS[a].reply === true));
/** A made-up question id and mark a press arm's offer carries; the door checks the press echoes them. */
export const HOSTILE_QUESTION = '0123456789abcdef-7';
export const HOSTILE_MARK = 'a1b2c3d4e5f6';
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
  // PHASE 337: the Screen's honest answer, the shipping screenOf's
  // re-composition of the committed sample (null on vectors older than it).
  const sampleText = vectors?.answers?.['screen-sample']?.json;
  const screenSample = typeof sampleText === 'string' ? JSON.parse(sampleText) : null;
  return { blocked, session, turns, sessionId: session.session.sessionId, at: newest.at, screenSample };
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

// ---------------------------------------------------------------------------
// The reply arms' world (Phase 318)
// ---------------------------------------------------------------------------

/** The Mac's own words a reply arm draws from: LIFECYCLE_SESSION_CHANGED and the reply's own sentences. */
async function replyWords() {
  const lifecycle = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'lifecycle-words.ts')).href);
  let reply = {};
  try {
    reply = await import(pathToFileURL(join(ROOT, 'src', 'shared', 'reply-copy.ts')).href);
  } catch {
    reply = {};
  }
  if (typeof lifecycle.LIFECYCLE_SESSION_CHANGED !== 'string') throw new Error('the shipping tree has no LIFECYCLE_SESSION_CHANGED, which a reply arm draws');
  return { LIFECYCLE_SESSION_CHANGED: lifecycle.LIFECYCLE_SESSION_CHANGED, ...Object.fromEntries(Object.entries(reply).filter(([k, v]) => /^REPLY_/.test(k) && typeof v === 'string')) };
}

/**
 * The session a reply arm opens, carrying the offer its verb needs: a press
 * arm opens the vectors' WAITING session, every option pressable under
 * HOSTILE_QUESTION and HOSTILE_MARK; a message arm opens the vectors' talking
 * session at its prompt, `canSay` true. The offer is the door's shape
 * (`PocketReplyOffer`), field by field.
 */
export function offerReply(world, arm) {
  const spec = HOSTILE_ARMS[arm];
  if (spec.verb === 'choose') {
    const file = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
    const waiting = JSON.parse(JSON.parse(readFileSync(file, 'utf8')).answers['session-waiting'].json);
    const markers = (waiting.session.choices ?? []).map((c) => c.marker);
    if (markers.length === 0) throw new Error(`${file}'s session-waiting draws no options, so a press arm has nothing to press`);
    waiting.session.reply = { question: HOSTILE_QUESTION, mark: HOSTILE_MARK, pressable: markers, command: null, canSay: false };
    world.session = waiting;
    world.sessionId = waiting.session.sessionId;
  } else {
    world.session.session.reply = { question: null, mark: null, pressable: [], command: null, canSay: true };
  }
  world.replyOffer = world.session.session.reply;
  return world;
}

// ---------------------------------------------------------------------------
// The sessions read (Phase 316.7)
// ---------------------------------------------------------------------------

/** build/p3167/seed-sessions.mts and the shipping composer it loads, under tsx. */
async function sessionsModules() {
  const seed = await import(pathToFileURL(join(ROOT, 'build', 'p3167', 'seed-sessions.mts')).href);
  const shipping = await seed.shippingSessions();
  if (shipping.compose === null) throw new Error(`the shipping tree cannot compose /v1/sessions: ${shipping.why}`);
  return { seed, shipping };
}

/** A vectors row's status word as a Session status: the row says it, this reads it back. */
export function statusOfRow(row, waiting) {
  if (waiting) return 'needs_input';
  const label = String(row?.statusLabel ?? '');
  if (label === 'working') return 'running';
  if (label === 'idle') return 'idle';
  if (label === 'restorable') return 'restorable';
  if (label === 'unknown') return 'unknown';
  if (label === 'needs input') return 'needs_input';
  return 'exited';
}

/** An age a row draws (`now`, `4m`, `2h`, `3d`), in milliseconds, or null. */
const ageMsOf = (text) => {
  const m = /^(\d+)([mhd])$/.exec(String(text ?? ''));
  if (text === 'now') return 0;
  return m === null ? null : Number(m[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
};

/**
 * The facts the honest world's `/v1/sessions` is composed over: one Session
 * per row of the vectors' own `/v1/blocked` (waiting rows waiting, the rest by
 * the status the row names), each row's own status word, agent name and End
 * offer handed back unchanged, so every row the Sessions tab draws is a row the
 * door's `/v1/session` answers for. Built per request, after a write arm has
 * set its End offer on the rows.
 */
export function factsFromBlocked(seed, blocked, now = Date.now()) {
  const rows = [...(blocked.rows ?? []).map((r) => ({ r, waiting: true })), ...(blocked.others ?? []).map((r) => ({ r, waiting: false }))];
  const sessions = [];
  const byId = new Map();
  const stamps = new Map();
  const activity = new Map();
  const questions = new Map();
  rows.forEach(({ r, waiting }, i) => {
    const status = statusOfRow(r, waiting);
    const machine = r.machine === null || r.machine === undefined ? undefined : { id: String(r.machine).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'far', label: r.machine, color: 'blue', answering: true, canRestore: false, restoreReason: null };
    const s = {
      id: r.sessionId,
      name: r.name,
      tmuxName: r.name,
      projectPath: `/Users/p316/${String(r.project ?? 'p316')}`,
      cwd: `/Users/p316/${String(r.project ?? 'p316')}`,
      agent: r.agent ?? 'claude',
      status,
      createdAt: now - (i + 2) * 86_400_000,
      ...(r.statusDot === 'failed' ? { exitCode: 1 } : {}),
      ...(machine === undefined ? {} : { machine })
    };
    sessions.push(s);
    byId.set(s.id, r);
    if (waiting) {
      stamps.set(s.id, now - (ageMsOf(r.ageText) ?? 120_000));
      if (typeof r.question === 'string') questions.set(s.id, r.question);
    } else if (status === 'running' || status === 'idle') {
      activity.set(s.id, now - (ageMsOf(r.ageText) ?? 60_000));
    }
  });
  const labels = new Map(rows.map(({ r }) => [r.agent, r.agentLabel]));
  return seed.factsOf(sessions, {
    stamps,
    activity,
    questions,
    statusWord: (s) => ({ dot: byId.get(s.id)?.statusDot ?? 'idle', label: byId.get(s.id)?.statusLabel ?? 'idle' }),
    agentLabel: (id) => labels.get(id) ?? id,
    endOffer: (s) => byId.get(s.id)?.end ?? { state: 'none' }
  });
}

/** What a sessions request event carries: the counts, and for the sessions arms the ids and groups sent. */
export function sessionsSummary(answer, whole) {
  const base = { rows: answer.rows.length, groups: answer.groups.length, omitted: answer.omitted, total: answer.total, asked: answer.asked };
  if (!whole) return base;
  return {
    ...base,
    ids: answer.rows.map((r) => r.sessionId),
    groupOf: answer.rows.map((r) => r.group),
    groupList: answer.groups.map((g) => ({ id: g.id, label: g.label, machine: g.machine, folder: g.folder, count: g.count, omitted: g.omitted, waiting: g.waiting, collapsed: g.collapsed })),
    agents: answer.agents.map((c) => c.id),
    machines: answer.machines.map((c) => c.id)
  };
}

/**
 * A malformed arm's body, built from the honest answer for the same words with
 * ONE thing broken (SPEC §6.4.5), so the refusal the phone meets is the arm's
 * own and nothing else. Answers the body's text: `Int.max` is written as its
 * digits, which a JavaScript number would round.
 */
export function malformedSessions(arm, honest) {
  const a = structuredClone(honest);
  const runOf = (g) => a.rows.map((r, i) => ({ r, i })).filter((x) => x.r.group === g);
  const big = a.groups.findIndex((_, g) => runOf(g).length >= 2);
  switch (arm) {
    case 'sessions-dup-id': {
      // A copy of the first row, beside it, its group's count raised to match.
      a.rows.splice(1, 0, structuredClone(a.rows[0]));
      a.groups[a.rows[0].group].count += 1;
      break;
    }
    case 'sessions-group-range': {
      const last = runOf(big).at(-1);
      a.rows[last.i].group = a.groups.length;
      a.groups[big].count -= 1;
      break;
    }
    case 'sessions-split-group': {
      // The big group's last row moved past the next group's rows: not
      // together, and every group still first emitted in its own order.
      const next = big + 1 < a.groups.length ? big + 1 : -1;
      if (next === -1) {
        a.groups.reverse();
        break;
      }
      const last = runOf(big).at(-1);
      const [moved] = a.rows.splice(last.i, 1);
      const nextEnd = a.rows.map((r) => r.group).lastIndexOf(next);
      a.rows.splice(nextEnd + 1, 0, moved);
      break;
    }
    case 'sessions-count':
      a.groups[0].count += 1;
      break;
    case 'sessions-omitted-sum':
      a.groups[0].omitted += 1;
      a.groups[0].count += 1;
      break;
    case 'sessions-waiting-false': {
      const g = a.rows.find((r) => r.waiting === true)?.group ?? 0;
      a.groups[g].waiting = false;
      break;
    }
    case 'sessions-omitted-negative':
      a.omitted = -1;
      break;
    case 'sessions-omitted-max':
      a.omitted = '__P316_INT_MAX__';
      return J(a).replace('"__P316_INT_MAX__"', INT_MAX_TEXT);
    case 'sessions-asked':
      a.asked = { ...a.asked, sort: a.asked.sort === 'name' ? 'oldest' : 'name' };
      break;
    case 'sessions-show-word':
      a.asked = { ...a.asked, show: 'everything' };
      break;
    default:
      throw new Error(`${arm} is not a malformed sessions arm`);
  }
  return J(a);
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
    // Phase 318: a reply arm's session offers a press or a message.
    const replyWordsNow = HOSTILE_ARMS[arm].reply === true || arm === 'honest' ? await replyWords() : null;
    if (HOSTILE_ARMS[arm].reply === true) offerReply(world, arm);
    // Phase 337.3: the fill-moved arm answers its first page with the Mac's own sentence.
    const screenWordsNow = HOSTILE_ARMS[arm].fillOnce === true ? await screenWords() : null;
    /** write-cut-reread-refused: every signed read after its write is refused. */
    let refuseReads = false;
    // PHASE 316.7: the sessions read, composed by the SHIPPING composer. A
    // sessions arm cannot run without it; any other arm answers 404 for
    // /v1/sessions then, which the phone reads as a Mac older than this phase,
    // and its event says why.
    let sessionsKit = null;
    let sessionsKitWhy = null;
    try {
      sessionsKit = await sessionsModules();
    } catch (err) {
      sessionsKitWhy = String(err?.message ?? err);
    }
    if (typeof HOSTILE_ARMS[arm].sessions === 'string' && sessionsKit === null) throw new Error(`${arm} needs the shipping /v1/sessions composer: ${String(sessionsKitWhy)}`);
    const cap = HOSTILE_ARMS[arm].sessions === 'cap'
      ? (() => {
          const w = sessionsKit.seed.worldOf('cap');
          return { world: w, facts: sessionsKit.seed.factsOf(w.sessions, { stamps: w.stamps, activity: w.activity }) };
        })()
      : null;
    /** The answer to one `/v1/sessions` query, as the shipping composer writes it, or null when it refuses the words. */
    const composeSessions = (query) => (sessionsKit === null ? null : sessionsKit.shipping.compose(cap?.facts ?? factsFromBlocked(sessionsKit.seed, world.blocked), query));
    /** Signed `/v1/sessions` reads answered. */
    let sessionsReads = 0;
    /** `missing-first`: whether the door has been told the Mac updated. */
    let sessionsReleased = false;
    /** The Mac updated under the phone: `/v1/sessions` is answered from now on. */
    const releaseSessions = () => {
      if (sessionsReleased) return;
      sessionsReleased = true;
      emit({ kind: 'sessions-released', arm, at: Date.now(), sessionsReads });
    };
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
      emit({ kind: 'request', arm, ...event, status, bytes, at: event.at ?? Date.now() });
    };
    const sendRaw = (req, raw, event) => {
      const socket = req.socket;
      emit({ kind: 'request', arm, ...event, status: 'raw', bytes: raw.length });
      socket.write(raw, () => {
        if (arm === 'early-close') socket.destroy();
        else socket.end();
      });
    };

    /** Phase 337: each connection's serial, so an event says which line carried it. */
    const lineOf = new WeakMap();
    let lines = 0;
    const lineSerial = (socket) => {
      if (!lineOf.has(socket)) {
        lines += 1;
        lineOf.set(socket, lines);
      }
      return lineOf.get(socket);
    };
    /** Phase 337.1: signed /v1/scrollback reads, counted for the arm that answers after the first. */
    let scrollbackReads = 0;
    /** Signed /v1/screen reads answered, and the revision the honest screen is at. */
    let screenReads = 0;
    let screenSerial = 0;
    /** The Mac drew something new: the honest screen's revision moves. */
    const nextScreen = () => {
      screenSerial += 1;
      emit({ kind: 'screen-next', arm, at: Date.now(), screenSerial });
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
        if (req.method === 'POST' && url.pathname === '/v1/keys') {
          // PHASE 337's keys write: counted, verified over the body, answered
          // the arm's way; an honest door answers done. Logged by shape only:
          // never a key or a text.
          counts.writes += 1;
          const verifiedWrite = verifySigned({ method: 'POST', target: req.url ?? '', headers: req.headers, body, phone, doorExchangePrivate: doorX.privateKey, doorExchangeKey: dx });
          const channelWrite = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
          let parsed = null;
          try {
            parsed = JSON.parse(body.toString('utf8'));
          } catch {
            parsed = null;
          }
          const id = typeof parsed?.write === 'string' && /^[0-9a-f]{32}$/.test(parsed.write) ? parsed.write : '';
          const keys = parsed === null || typeof parsed !== 'object' ? '' : Object.keys(parsed).sort().join(',');
          const items = Array.isArray(parsed?.keys) ? parsed.keys.length : -1;
          const event = { route, ...seen, verified: verifiedWrite, channelHeld: channelWrite, write: counts.writes, verb: 'keys', keys, items, line: lineSerial(req.socket), query: url.search !== '' };
          if (verifiedWrite !== 'ok' || url.search !== '') return send(res, 404, '', event);
          if (arm === 'keys-404') return send(res, 404, '', event);
          if (arm === 'keys-other-id') return send(res, 200, J({ verb: 'keys', write: otherWriteId(id), outcome: 'done', reason: null, sentence: null }), event);
          return send(res, 200, J({ verb: 'keys', write: id, outcome: 'done', reason: null, sentence: null }), event);
        }
        if (req.method === 'GET' && url.pathname === '/v1/screen') {
          // PHASE 337's read: signed, answered the arm's way.
          const verifiedRead = verifySigned({ method: 'GET', target: req.url ?? '', headers: req.headers, body, phone, doorExchangePrivate: doorX.privateKey, doorExchangeKey: dx });
          const channelRead = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
          const params = [...url.searchParams.keys()].sort().join(',');
          screenReads += 1;
          const n = screenReads;
          const ev = { route, ...seen, verified: verifiedRead, channelHeld: channelRead, screenRead: n, params, line: lineSerial(req.socket), at: Date.now() };
          if (verifiedRead !== 'ok' || (params !== 'id' && params !== 'id,since')) return send(res, 404, '', ev);
          if (refuseReads) return send(res, 404, '', { ...ev, refusedAfterWrite: true });
          const honest = honestScreen(world, url.searchParams.get('id') ?? world.sessionId, screenSerial);
          const spec = HOSTILE_ARMS[arm];
          const since = url.searchParams.get('since');
          const first = n === 1;
          if (spec.screen === true && spec.keys !== true && spec.kept === undefined && !first) {
            if (arm === 'screen-never-answers') {
              emit({ kind: 'request', arm, ...ev, status: 200, bytes: 0, held: true });
              return;
            }
            if (spec.raw === true) return sendRaw(req, rawAnswerOf('chunked', J(honest)), ev);
            return send(res, 200, J(hostileScreen(arm, honest)), { ...ev, hostile: arm });
          }
          const answerNow = () => {
            if (spec.kept === 'close' && first) {
              res.setHeader('connection', 'close');
              return send(res, 200, J(honest), { ...ev, kept: 'close' });
            }
            if (spec.kept === 'closed' && first) {
              res.on('finish', () => req.socket.end());
              return send(res, 200, J(honest), { ...ev, kept: 'closed' });
            }
            if (spec.kept === 'stray' && first) {
              res.on('finish', () => {
                const stray = J({ ...honest, revision: 'ffffffffffff' });
                req.socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${String(Buffer.byteLength(stray))}\r\n\r\n${stray}`);
                emit({ kind: 'request', arm, ...ev, status: 'stray', bytes: Buffer.byteLength(stray) });
              });
              return send(res, 200, J(honest), { ...ev, kept: 'stray' });
            }
            return send(res, 200, J(honest), ev);
          };
          if (since !== null && since === honest.revision) {
            // Current: held, then unchanged, unless the Mac draws meanwhile.
            emit({ kind: 'request', arm, ...ev, status: 200, bytes: 0, held: true });
            const at = screenSerial;
            const started = Date.now();
            const tick = setInterval(() => {
              if (req.socket.destroyed) {
                clearInterval(tick);
                return;
              }
              if (screenSerial !== at) {
                clearInterval(tick);
                answerNow();
              } else if (Date.now() - started >= SCREEN_HOLD_HONEST_MS) {
                clearInterval(tick);
                send(res, 200, J({ sessionId: honest.sessionId, revision: honest.revision, at: Date.now(), unchanged: true, screen: null, why: null, sentence: null }), { ...ev, unchanged: true });
              }
            }, 50);
            tick.unref?.();
            return;
          }
          return answerNow();
        }
        if (req.method === 'GET' && url.pathname === '/v1/scrollback') {
          // PHASE 337.1's page: signed, the six names, answered the arm's way.
          // Logged by its numbers only: never a row.
          const verifiedRead = verifySigned({ method: 'GET', target: req.url ?? '', headers: req.headers, body, phone, doorExchangePrivate: doorX.privateKey, doorExchangeKey: dx });
          const channelRead = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
          const ask = scrollbackAskOf(url.searchParams);
          scrollbackReads += 1;
          const n = scrollbackReads;
          const ev = { route, ...seen, verified: verifiedRead, channelHeld: channelRead, pageRead: n, ask: ask === null ? null : { from: ask.from, count: ask.count, depth: ask.depth, wrap: ask.wrap, keep: ask.keep }, line: lineSerial(req.socket), at: Date.now() };
          if (verifiedRead !== 'ok' || ask === null || ask.from >= HOSTILE_HISTORY_DEPTH) return send(res, 404, '', ev);
          if (refuseReads) return send(res, 404, '', { ...ev, refusedAfterWrite: true });
          const honest = honestPageOf(ask, historyLineOf);
          const spec = HOSTILE_ARMS[arm];
          const hostileNow = pageIsHostile(spec, n);
          if (!hostileNow) return send(res, 200, J(honest), ev);
          if (arm === 'scrollback-never') {
            emit({ kind: 'request', arm, ...ev, status: 200, bytes: 0, held: true });
            return;
          }
          if (arm === 'scrollback-404') return send(res, 404, '', { ...ev, hostile: arm });
          if (spec.fillOnce === true) return send(res, 200, J(movedPageOf(ask, screenWordsNow.SCROLLBACK_MOVED)), { ...ev, hostile: arm, why: 'moved' });
          if (spec.raw === true) return sendRaw(req, rawAnswerOf('chunked', J(honest)), { ...ev, hostile: arm });
          return send(res, 200, J(hostilePage(arm, honest, historyLineOf)), { ...ev, hostile: arm });
        }
        if (req.method === 'POST' && (url.pathname === '/v1/choose' || url.pathname === '/v1/say')) {
          // PHASE 318's two writes: counted, verified over the body, and
          // answered the arm's way. Any other arm answers honestly.
          counts.writes += 1;
          const verb = url.pathname === '/v1/choose' ? 'choose' : 'say';
          const verifiedWrite = verifySigned({ method: 'POST', target: req.url ?? '', headers: req.headers, body, phone, doorExchangePrivate: doorX.privateKey, doorExchangeKey: dx });
          const channelWrite = phone !== null && seen.clientPin === clientKeyPinOf(phone.clientKey);
          let parsed = null;
          try {
            parsed = JSON.parse(body.toString('utf8'));
          } catch {
            parsed = null;
          }
          const id = typeof parsed?.write === 'string' && /^[0-9a-f]{32}$/.test(parsed.write) ? parsed.write : '';
          const keys = parsed === null || typeof parsed !== 'object' ? '' : Object.keys(parsed).sort().join(',');
          // What the phone echoed, by shape only: never the words a message carried.
          const echoed = verb === 'choose' ? parsed?.question === HOSTILE_QUESTION && parsed?.mark === HOSTILE_MARK : typeof parsed?.text === 'string';
          const event = { route, ...seen, verified: verifiedWrite, channelHeld: channelWrite, write: counts.writes, verb, keys, echoed, query: url.search !== '' };
          if (verifiedWrite !== 'ok' || url.search !== '') return send(res, 404, '', event);
          const done = J({ verb, write: id, outcome: 'done', reason: null, sentence: null });
          switch (arm) {
            case 'reply-other-id':
              return send(res, 200, J({ verb, write: otherWriteId(id), outcome: 'done', reason: null, sentence: null }), event);
            case 'reply-refused-changed':
              return send(res, 200, J({ verb, write: id, outcome: 'refused', reason: 'changed', sentence: replyWordsNow.LIFECYCLE_SESSION_CHANGED }), event);
            case 'reply-unknown-reason':
              return send(res, 200, J({ verb, write: id, outcome: 'refused', reason: 'sideways', sentence: replyWordsNow.LIFECYCLE_SESSION_CHANGED }), event);
            case 'reply-cut':
            case 'reply-cut-reread-refused':
              if (arm === 'reply-cut-reread-refused') refuseReads = true;
              emit({ kind: 'request', arm, ...event, status: 'cut', bytes: 0 });
              req.socket.destroy();
              return;
            case 'reply-late': {
              emit({ kind: 'request', arm, ...event, status: 200, bytes: 0, held: true });
              const timer = setTimeout(() => {
                if (!req.socket.destroyed) send(res, 200, done, { ...event, late: true });
              }, WRITE_LATE_MS);
              timer.unref?.();
              return;
            }
            case 'reply-404':
              return send(res, 404, '', event);
            default:
              return send(res, 200, done, event);
          }
        }
        if (req.method !== 'GET' || !['/v1/blocked', '/v1/session', '/v1/turns', '/v1/sessions'].includes(url.pathname)) {
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
        if (url.pathname === '/v1/sessions') {
          // PHASE 316.7. The Sessions tab's read, answered the arm's way.
          sessionsReads += 1;
          const n = sessionsReads;
          const spec = HOSTILE_ARMS[arm];
          const at = Date.now();
          const ev = { ...event, sessionsRead: n, at };
          if (spec.sessions === 'missing' || (spec.sessions === 'missing-first' && !sessionsReleased)) return send(res, 404, '', { ...ev, olderMac: true });
          const answer = composeSessions(url.searchParams);
          if (answer === null || answer === undefined) return send(res, 404, '', { ...ev, refused: sessionsKit === null ? `no composer: ${String(sessionsKitWhy)}` : 'the composer refused the words' });
          const summary = sessionsSummary(answer, typeof spec.sessions === 'string');
          if (cap !== null) {
            const bidi = answer.rows.find((r) => r.sessionId === cap.world.bidiId) ?? null;
            summary.bidi = bidi === null ? null : { id: bidi.sessionId, name: bidi.name, ageText: bidi.ageText };
          }
          // A list arm answers the Sessions tab's FIRST read honestly, so the
          // tab draws, and its refresh meets the body.
          if (spec.list === true && n === 1) return send(res, 200, J(answer), { ...ev, honestFirst: true, sessions: summary });
          if (spec.list === true) {
            if (spec.raw === true) return sendRaw(req, rawAnswerOf(arm, J(answer)), ev);
            if (arm === 'huge-row') return send(res, 200, J({ ...answer, rows: [{ ...answer.rows[0], question: 'q'.repeat(HUGE_BYTES) }, ...answer.rows.slice(1)] }), ev);
            if (arm === 'malformed') return send(res, 200, `${J(answer).slice(0, 40)}`, ev);
            if (arm === 'missing-fields') {
              for (const r of answer.rows) {
                delete r.statusDot;
                delete r.sessionId;
              }
              return send(res, 200, J(answer), ev);
            }
            if (arm === 'never-completes') {
              res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': '100000' });
              res.write('{"asked":');
              emit({ kind: 'request', arm, ...ev, status: 200, bytes: 9, held: true });
              return;
            }
          }
          if (spec.sessions === 'malformed') return send(res, 200, malformedSessions(arm, answer), { ...ev, malformed: arm });
          if (arm === 'unknown-status') for (const r of answer.rows) r.statusTitle = UNKNOWN_STATUS_TITLE;
          if (arm === 'unknown-dot') for (const r of answer.rows) r.statusDot = 'plaid';
          return send(res, 200, J(answer), { ...ev, sessions: summary });
        }
        if (url.pathname === '/v1/blocked') {
          blockedReads += 1;
          const answer = structuredClone(world.blocked);
          // The first signed read is pairing's: a list arm answers it
          // honestly, so the app pairs and its LIST meets the body.
          if (HOSTILE_ARMS[arm].list === true && blockedReads === 1) return send(res, 200, J(answer), { ...event, honestFirst: true });
          // A raw arm answers the LIST raw. The screen's raw arm
          // (screen-chunked) is the Screen's, so the list, pairing's first
          // read included, answers it honestly: answered raw, the phone
          // rightly refused to pair and never reached the Screen, and the arm
          // proved nothing about a chunked screen (the fix round of 2026-10-06).
          if (HOSTILE_ARMS[arm].raw === true && HOSTILE_ARMS[arm].list === true) return sendRaw(req, rawAnswerOf(arm, J(answer)), event);
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
      // Phase 318: the reply offer the session carries, and the Mac's words a reply arm's `mac` names.
      replyOffer: world.replyOffer ?? null,
      replyWords: replyWordsNow,
      counts,
      // Phase 316.7: whether this door can compose /v1/sessions, and the cap world's own facts.
      sessionsComposer: sessionsKit !== null,
      sessionsComposerWhy: sessionsKitWhy,
      capBidiId: cap?.world.bidiId ?? null,
      capMachine: cap === null ? null : sessionsKit.seed.CAP_MACHINE,
      composeSessions,
      releaseSessions,
      // Phase 337: the Mac draws something new, and the Screen's lines so far.
      nextScreen,
      lines: () => lines,
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
  // The one line a parent may send: the Mac updated (`missing-first`).
  let said = '';
  process.stdin.on('data', (chunk) => {
    said += chunk.toString('utf8');
    let at;
    while ((at = said.indexOf('\n')) !== -1) {
      if (said.slice(0, at).trim() === 'sessions-honest') door.releaseSessions();
      // Phase 337: the Mac drew something new on the Screen.
      if (said.slice(0, at).trim() === 'screen-next') door.nextScreen();
      said = said.slice(at + 1);
    }
  });
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
      writeSentences: door.writeSentences,
      // Phase 318: the reply arms' offer and the Mac's words they draw.
      replyOffer: door.replyOffer,
      replyWords: door.replyWords,
      // Phase 316.7: the sessions read.
      sessionsComposer: door.sessionsComposer,
      sessionsComposerWhy: door.sessionsComposerWhy,
      capBidiId: door.capBidiId,
      capMachine: door.capMachine
    })}`
  );
}

// ---------------------------------------------------------------------------
// --self-test: every arm driven by the node phone, no Simulator
// ---------------------------------------------------------------------------

/** Whether a raw answer is the shape its HTTP arm claims, and the parts it was read from. */
export function rawSays(arm, bytes) {
  const { status, headers: lines, body, headBytes } = splitRaw(bytes);
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
  return { status, headers: lines, body, headBytes, lengths, declared, says };
}

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
      // PHASE 337: THE SCREEN ARMS, read with the node phone's own
      // re-derivation of the phone's refusals (`screenAnswerProblems`), and
      // the kept-line arms read as RAW bytes on one TLS connection.
      if (HOSTILE_ARMS[arm].screen === true) {
        const spec = HOSTILE_ARMS[arm];
        const sid = door.sessionToOpen;
        /** One signed GET of the screen, written as raw bytes, kept alive, on its own TLS connection. */
        const rawScreen = (timeoutMs) => {
          const target = screenTarget(sid);
          const h = signedHeadersFor(phone, 'GET', target, Buffer.alloc(0));
          const bytes = `GET ${target} HTTP/1.1\r\nHost: ${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}\r\n${Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\nConnection: keep-alive\r\n\r\n`;
          return rawExchange({ door: d, bytes: Buffer.from(bytes, 'utf8'), identity: phone, timeoutMs });
        };
        if (spec.kept !== undefined) {
          // The FIRST read is the one the arm answers its way.
          const got = await rawScreen(7_000);
          const text = got.bytes.toString('utf8');
          const answers = (text.match(/HTTP\/1\.1 200/g) ?? []).length;
          const closeSaid = /\r\nconnection: close\r\n/i.test(text);
          const keptSaid = /\r\nconnection: keep-alive\r\n/i.test(text);
          const ok = spec.kept === 'stray' ? answers === 2 && keptSaid : spec.kept === 'close' ? answers === 1 && closeSaid : answers === 1 && keptSaid && got.error !== 'timed out';
          check(arm, ok, `one kept-alive request answered ${String(answers)} time(s) on its connection${closeSaid ? ', saying Connection: close' : keptSaid ? ', saying keep-alive' : ''}, then the door ${got.error === 'timed out' ? 'kept it open' : 'closed it'}`);
          continue;
        }
        // Pairing's first signed read is /v1/blocked, and a screen arm answers
        // it, and every list read, honestly (the fix round of 2026-10-06).
        const pairingRead = await signedGet(phone, d, '/v1/blocked');
        let pairingOk = false;
        try {
          pairingOk = pairingRead.status === 200 && Array.isArray(JSON.parse(pairingRead.body).rows);
        } catch {
          pairingOk = false;
        }
        const first = await screenRead(phone, d, sid);
        const firstOk = pairingOk && first.status === 200 && first.answer !== null && screenAnswerProblems(first.answer).length === 0 && first.answer.screen !== null;
        if (spec.keys === true) {
          const sent = await sendKeys(phone, d, sid, [{ t: 'echo p316' }], { turn: first.answer?.screen?.turn ?? `${'0'.repeat(16)}-0`, dialog: null });
          const said = sent.status === 200 ? JSON.parse(sent.body) : null;
          const posts = events.filter((e) => e.kind === 'request' && e.route === 'POST /v1/keys').length;
          const ok = arm === 'keys-404' ? sent.status === 404 : sent.status === 200 && said?.write !== sent.write && said?.outcome === 'done';
          check(arm, firstOk && ok && posts === 1, `the first /v1/screen answered ${String(first.status)} and drew; the keys write answered ${String(sent.status)}${said === null ? '' : ` echoing ${said.write === sent.write ? 'its own id' : 'another id'}`}; ${String(posts)} POST(s)`);
          continue;
        }
        if (arm === 'screen-never-answers') {
          const second = await screenRead(phone, d, sid, { timeoutMs: 1_500 });
          check(arm, firstOk && second.status !== 200, `the first /v1/screen drew; the second answered ${second.status === 0 ? 'nothing' : String(second.status)} within 1.5 s (${String(second.error)})`);
          continue;
        }
        if (spec.raw === true) {
          const raw = await rawScreen(5_000);
          const chunked = /\r\ntransfer-encoding: chunked\r\n/i.test(raw.bytes.toString('utf8'));
          check(arm, firstOk && chunked, `the first /v1/screen drew; the second was written as raw bytes${chunked ? ' with Transfer-Encoding: chunked' : ' WITHOUT Transfer-Encoding: chunked'}, which the phone's reader refuses`);
          continue;
        }
        const second = await screenRead(phone, d, sid);
        const problems = second.answer === null ? ['no answer'] : screenAnswerProblems(second.answer);
        check(arm, firstOk && second.status === 200 && problems.length > 0, `the first /v1/screen drew; the second is refused for ${J(problems.slice(0, 2))}`);
        continue;
      }
      // PHASE 337.1: THE SCROLLBACK ARMS, read with the node phone's own
      // re-derivation of the phone's refusals (`scrollbackAnswerProblems`):
      // the Screen honest and offering the door's history, each page the arm's.
      if (typeof HOSTILE_ARMS[arm].scrollback === 'string') {
        const spec = HOSTILE_ARMS[arm];
        const sid = door.sessionToOpen;
        const pairingRead = await signedGet(phone, d, '/v1/blocked');
        const screen = await screenRead(phone, d, sid);
        const sc = screen.answer?.screen ?? null;
        const screenOk = pairingRead.status === 200 && screen.status === 200 && sc !== null && screenAnswerProblems(screen.answer).length === 0 && sc.depth === HOSTILE_HISTORY_DEPTH && sc.space === HOSTILE_SPACE;
        const H = typeof sc?.depth === 'number' ? sc.depth : HOSTILE_HISTORY_DEPTH;
        const wrap = typeof sc?.cols === 'number' ? sc.cols : 120;
        const firstAsk = { from: H - 100, count: 100, depth: H, wrap, keep: 'bottom' };
        const olderAsk = { from: H - 192, count: 100, depth: H, wrap, keep: 'bottom' };
        const honestTexts = (ask) => honestPageOf({ id: sid, ...ask }, historyLineOf).rows.map(screenRowText);
        if (arm === 'scrollback-never') {
          const p = await scrollbackRead(phone, d, sid, { ...firstAsk, timeoutMs: 1_500 });
          check(arm, screenOk && p.status !== 200, `the Screen drew with a history of ${String(H)}; the page answered ${p.status === 0 ? 'nothing' : String(p.status)} within 1.5 s (${String(p.error)})`);
          continue;
        }
        if (arm === 'scrollback-404') {
          const p = await scrollbackRead(phone, d, sid, firstAsk);
          check(arm, screenOk && p.status === 404 && p.answer === null, `the Screen drew; the page answered ${String(p.status)}`);
          continue;
        }
        if (spec.raw === true) {
          const target = scrollbackTarget(sid, firstAsk);
          const request = Buffer.from([`GET ${target} HTTP/1.1`, `Host: ${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`, ...Object.entries(signedHeaders(phone, target)).map(([k, v]) => `${k}: ${v}`), 'Connection: close', '', ''].join('\r\n'), 'utf8');
          const raw = await rawExchange({ door: d, bytes: request, identity: phone, capBytes: 8 * 1024 * 1024 });
          const chunked = /\r\ntransfer-encoding: chunked\r\n/i.test(raw.bytes.toString('utf8'));
          check(arm, screenOk && raw.handshook && chunked, `the Screen drew; the page was written as raw bytes${chunked ? ' with Transfer-Encoding: chunked' : ' WITHOUT Transfer-Encoding: chunked'}, which the phone's reader refuses`);
          continue;
        }
        // PHASE 337.3: the fill's page at open answered moved, as main's absence and in the Mac's own words; every
        // later page honest, the very same ask again among them, so a drag pages the door's own lines.
        if (spec.fillOnce === true) {
          const { SCROLLBACK_MOVED } = await screenWords();
          const p1 = await scrollbackRead(phone, d, sid, firstAsk);
          const prob1 = p1.answer === null ? ['no answer'] : scrollbackAnswerProblems(p1.answer, firstAsk);
          const moved = p1.status === 200 && prob1.length === 0 && p1.answer.why === 'moved' && p1.answer.sentence === SCROLLBACK_MOVED && p1.answer.rows.length === 0 && p1.answer.from === null;
          const honestAt = async (ask) => {
            const p = await scrollbackRead(phone, d, sid, ask);
            const prob = p.answer === null ? ['no answer'] : scrollbackAnswerProblems(p.answer, ask);
            return { ok: p.status === 200 && prob.length === 0 && p.answer.why === null && J(p.answer.rows.map(screenRowText)) === J(honestTexts(ask)), prob };
          };
          const again = await honestAt(firstAsk);
          const older = await honestAt(olderAsk);
          const hostileEvents = events.filter((e) => e.kind === 'request' && e.route === 'GET /v1/scrollback' && e.hostile === arm).length;
          check(arm, screenOk && moved && again.ok && older.ok && hostileEvents === 1, `the Screen drew with a history of ${String(H)}; the first page answered ${String(p1.status)} ${J(p1.answer?.why ?? null)} with the Mac's own sentence: ${String(p1.answer?.sentence === SCROLLBACK_MOVED)} and no row (refused for ${J(prob1)}); the same ask again and an older page honest: ${String(again.ok)} and ${String(older.ok)} (${J([...again.prob, ...older.prob].slice(0, 2))}); ${String(hostileEvents)} hostile page(s) in all`);
          continue;
        }
        // extra-rows is read on an older page, where its rows stay inside the depth, so only the asked range refuses it.
        const ask1 = arm === 'scrollback-extra-rows' ? olderAsk : firstAsk;
        const p1 = await scrollbackRead(phone, d, sid, ask1);
        const prob1 = p1.answer === null ? ['no answer'] : scrollbackAnswerProblems(p1.answer, ask1);
        if (arm === 'scrollback-overlap-lie') {
          const p2 = await scrollbackRead(phone, d, sid, olderAsk);
          const prob2 = p2.answer === null ? ['no answer'] : scrollbackAnswerProblems(p2.answer, olderAsk);
          const want = honestTexts(olderAsk);
          const lied = p2.answer !== null && p2.answer.rows.length === want.length && p2.answer.rows.every((row, k) => screenRowText(row) !== want[k]);
          const firstHonest = p1.answer !== null && J(p1.answer.rows.map(screenRowText)) === J(honestTexts(firstAsk));
          check(arm, screenOk && prob1.length === 0 && firstHonest && prob2.length === 0 && lied, `the first page honest (${String(firstHonest)}, refused for ${J(prob1)}); the older page well formed (${J(prob2)}) and every row of it a lie, its 8 overlap rows among them: ${String(lied)}`);
          continue;
        }
        if (arm === 'scrollback-space') {
          check(arm, screenOk && prob1.length === 0 && p1.answer?.space === HOSTILE_OTHER_SPACE && p1.answer.space !== sc?.space, `the page is well formed (${J(prob1)}) and names the space ${J(p1.answer?.space)}, the picture ${J(sc?.space)}`);
          continue;
        }
        const shaped = arm !== 'scrollback-extra-rows' || (p1.answer !== null && p1.answer.rows.length === ask1.count + 10 && p1.answer.from + p1.answer.rows.length <= p1.answer.depth);
        check(arm, screenOk && p1.status === 200 && prob1.length > 0 && shaped, `the Screen drew with a history of ${String(H)}; the page${arm === 'scrollback-extra-rows' ? ` holds ${String(p1.answer?.rows?.length)} rows for ${String(ask1.count)} asked, inside its depth: ${String(shaped)}, and` : ''} is refused for ${J(prob1.slice(0, 2))}`);
        continue;
      }
      // PHASE 316.7: THE SESSIONS ARMS, read with the node phone's own
      // re-derivation of the phone's refusals (`sessionsAnswerProblems`).
      if (typeof HOSTILE_ARMS[arm].sessions === 'string') {
        const spec = HOSTILE_ARMS[arm];
        const asked = askedOf({});
        const first = await readSessions(phone, d, {});
        const blockedRead = await signedGet(phone, d, '/v1/blocked');
        const honest = door.composeSessions(new URLSearchParams(sessionsTarget({}).split('?')[1]));
        const honestProblems = honest === null ? ['the composer refused the default words'] : sessionsAnswerProblems(honest, asked);
        if (spec.sessions === 'missing' || spec.sessions === 'missing-first') {
          // The older face's own appear read: still refused, on both arms.
          const again = await readSessions(phone, d, {});
          // `missing-first` answers only once it is told the Mac updated.
          const releasedAt = events.length;
          if (spec.sessions === 'missing-first') door.releaseSessions();
          const told = spec.sessions === 'missing' || events.slice(releasedAt).some((e) => e.kind === 'sessions-released');
          const after = await readSessions(phone, d, {});
          const wantAfter = spec.sessions === 'missing' ? after.status === 404 : after.status === 200 && sessionsAnswerProblems(after.answer, asked).length === 0;
          check(arm, first.status === 404 && blockedRead.status === 200 && again.status === 404 && told && wantAfter && honestProblems.length === 0, `the first /v1/sessions answered ${String(first.status)}, /v1/blocked ${String(blockedRead.status)}, the next /v1/sessions ${String(again.status)}${spec.sessions === 'missing-first' ? `, then, ${told ? 'told' : 'NOT told'} the Mac updated, ${String(after.status)}${after.answer !== null ? ` with ${String(after.answer.rows.length)} row(s), refused for ${J(sessionsAnswerProblems(after.answer, asked))}` : ''}` : `, and after that ${String(after.status)}`}`);
          continue;
        }
        if (spec.sessions === 'cap') {
          const a = first.answer;
          const problems = a === null ? ['no answer'] : sessionsAnswerProblems(a, asked);
          const apps = (a?.groups ?? []).filter((g) => g.label === 'app');
          const localApps = apps.filter((g) => g.machine === null && typeof g.folder === 'string' && g.folder !== '');
          const remoteApp = apps.filter((g) => g.machine === door.capMachine?.label && g.folder === null);
          const bidi = (a?.rows ?? []).find((r) => r.sessionId === door.capBidiId) ?? null;
          // The one clip (SPEC D5): 199 units then the ellipsis, one fewer when
          // the last kept unit is a high surrogate, which none may end on.
          const clipped = (a?.rows ?? []).filter((r) => r.name.length <= 200 && r.name.endsWith('\u2026'));
          const torn = clipped.filter((r) => {
            const c = r.name.charCodeAt(r.name.length - 2);
            return c >= 0xd800 && c <= 0xdbff;
          });
          const leftOut = (a?.groups ?? []).filter((g) => g.omitted > 0).length;
          const ok = first.status === 200 && problems.length === 0 && a.rows.length === SESSIONS_MAX_ROWS && a.omitted > 0 && leftOut > 0 && localApps.length === 2 && remoteApp.length === 1 && bidi !== null && a.machines.length === 2 && a.agents.length === 2 && sessionsBudgetBytes(a) <= SESSIONS_BUDGET_BYTES && first.bytes <= ANSWER_MAX_BYTES && clipped.length > 0 && torn.length === 0;
          check(arm, ok, `${String(first.status)}: ${String(a?.rows?.length)} row(s), omitted ${String(a?.omitted)} over ${String(leftOut)} group(s), ${String(sessionsBudgetBytes(a))} budget bytes and ${String(first.bytes)} on the wire; app groups: ${String(localApps.length)} local with a folder, ${String(remoteApp.length)} on ${String(door.capMachine?.label)} with none; the bidi row ${bidi === null ? 'NOT drawn' : `${String(bidi.name.length)} units`}; ${String(clipped.length)} name(s) clipped with an ellipsis, ${String(torn.length)} torn inside a surrogate pair; ${String(a?.machines?.length)} machine and ${String(a?.agents?.length)} agent choice(s); refused for ${J(problems)}`);
          continue;
        }
        // A malformed arm: every read answers its body, which the phone's
        // re-derived refusals must refuse for the arm's own reason, beside an
        // honest answer to the same words that they draw.
        const again = await readSessions(phone, d, {});
        const problems = first.answer === null ? ['the body does not parse'] : sessionsAnswerProblems(first.answer, asked);
        const own = problems.some((p) => p.includes(spec.breaks));
        check(arm, first.status === 200 && again.status === 200 && own && honestProblems.length === 0 && blockedRead.status === 200, `the body is refused for ${J(problems)}${own ? '' : `, NOT for its own reason (${spec.breaks})`}; the honest answer to the same words ${honestProblems.length === 0 ? 'is drawn' : `is refused too: ${J(honestProblems)}`}; /v1/blocked ${String(blockedRead.status)}`);
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
      if (listArm) {
        // PHASE 316.7: the Sessions tab's read meets the same body, its first
        // answer honest and its refresh the arm's.
        const s1 = await readSessions(phone, d, {});
        const s1Problems = s1.answer === null ? ['no answer'] : sessionsAnswerProblems(s1.answer, askedOf({}));
        let s2Says = false;
        let s2Said = '';
        if (HOSTILE_ARMS[arm].raw === true) {
          const target = sessionsTarget({});
          const request = Buffer.from([`GET ${target} HTTP/1.1`, `Host: ${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`, ...Object.entries(signedHeaders(phone, target)).map(([k, v]) => `${k}: ${v}`), 'Connection: close', '', ''].join('\r\n'), 'utf8');
          const raw = await rawExchange({ door: d, bytes: request, identity: phone, capBytes: 8 * 1024 * 1024 });
          const r = rawSays(arm, raw.bytes);
          s2Says = raw.handshook && r.says === true;
          s2Said = `the raw answer ${J(r.status)}`;
        } else {
          const s2 = await readSessions(phone, d, {}, { timeoutMs: arm === 'never-completes' ? 3_000 : 20_000 });
          s2Says = {
            'huge-row': s2.bytes > HUGE_BYTES,
            malformed: s2.status === 200 && s2.answer === null,
            'missing-fields': s2.status === 200 && s2.answer !== null && s2.answer.rows.every((r) => r.sessionId === undefined && r.statusDot === undefined),
            'never-completes': s2.status === 0 && /timed out|socket hang up/.test(s2.error ?? '')
          }[arm] === true;
          s2Said = `${String(s2.status)}, ${String(s2.bytes)} byte(s)${s2.error ? ` (${s2.error})` : ''}`;
        }
        check(`${arm} (sessions)`, s1.status === 200 && s1Problems.length === 0 && s2Says, `the Sessions tab's first /v1/sessions answered ${String(s1.status)}, refused for ${J(s1Problems)}; its refresh ${s2Said}, the arm's shape: ${String(s2Says)}`);
      }
      if (HOSTILE_ARMS[arm].raw === true) {
        const target = '/v1/blocked';
        const headers = signedHeaders(phone, target);
        const request = Buffer.from(
          [`GET ${target} HTTP/1.1`, `Host: ${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), 'Connection: close', '', ''].join('\r\n'),
          'utf8'
        );
        const raw = await rawExchange({ door: d, bytes: request, identity: phone, capBytes: 8 * 1024 * 1024 });
        const mtls = mtlsNow();
        const { status, headers: lines, body, lengths, declared, says } = rawSays(arm, raw.bytes);
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
        // Phase 316.7: every read after the cut is refused, the Sessions tab's too.
        const reread = arm === 'write-cut-reread-refused' ? Math.max((await signedGet(phone, d, sessionTarget)).status, (await readSessions(phone, d, {})).status) : null;
        const writeEvents = events.filter((e) => e.kind === 'request' && e.write !== undefined);
        const signedOk = writeEvents.length === 1 && writeEvents[0].verified === 'ok' && writeEvents[0].channelHeld === true;
        check(
          arm,
          read.status === 200 && offered && shape === true && door.counts.writes === 1 && signedOk && (reread === null || reread === 404),
          `the session offers ${J(s?.end)} with the Mac's confirm (${String(door.endConfirmFrom)}); the one POST answered ${String(got.status)}${got.error ? ` (${got.error})` : ''} ${got.body.slice(0, 120)}; ${String(door.counts.writes)} write(s) counted, verified over its body with the client identity: ${String(signedOk)}${reread === null ? '' : `; the read after it answered ${String(reread)}`}`
        );
        continue;
      }
      if (HOSTILE_ARMS[arm].reply === true) {
        // THE REPLY ARMS (Phase 318): the session offers what the verb needs,
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
          spec.verb === 'choose'
            ? s?.reply?.question === HOSTILE_QUESTION && s?.reply?.mark === HOSTILE_MARK && Array.isArray(s?.reply?.pressable) && s.reply.pressable.length > 0 && s.reply.canSay === false && Array.isArray(s?.choices) && s.choices.length > 0
            : s?.reply?.canSay === true && s?.reply?.question === null && s.reply.pressable.length === 0;
        const id = randomBytes(16).toString('hex');
        const fields = spec.verb === 'choose'
          ? { mark: HOSTILE_MARK, marker: s?.reply?.pressable?.[0] ?? '1', question: HOSTILE_QUESTION, session: door.sessionToOpen, write: id }
          : { session: door.sessionToOpen, text: 'p316 hostile message', write: id };
        const got = await signedPost(phone, d, `/v1/${spec.verb}`, fields, { timeoutMs: arm === 'reply-late' ? 2_000 : 20_000 });
        let said = null;
        try {
          said = JSON.parse(got.body);
        } catch {
          said = null;
        }
        const changed = door.replyWords?.LIFECYCLE_SESSION_CHANGED;
        const shape = {
          'reply-other-id': got.status === 200 && said?.write !== id && /^[0-9a-f]{32}$/.test(said?.write ?? '') && said?.outcome === 'done' && said?.verb === 'choose',
          'reply-refused-changed': got.status === 200 && said?.write === id && said?.outcome === 'refused' && said?.reason === 'changed' && said?.sentence === changed,
          'reply-unknown-reason': got.status === 200 && said?.write === id && said?.outcome === 'refused' && said?.reason === 'sideways' && said?.verb === 'say',
          'reply-cut': got.status === 0,
          'reply-cut-reread-refused': got.status === 0,
          'reply-404': got.status === 404 && got.body === '',
          'reply-late': got.status === 0 && /timed out/.test(got.error ?? ''),
          'reply-say-done': got.status === 200 && said?.write === id && said?.outcome === 'done' && said?.verb === 'say'
        }[arm];
        const reread = arm === 'reply-cut-reread-refused' ? (await signedGet(phone, d, sessionTarget)).status : null;
        const writeEvents = events.filter((e) => e.kind === 'request' && e.write !== undefined);
        const signedOk = writeEvents.length === 1 && writeEvents[0].verified === 'ok' && writeEvents[0].channelHeld === true && writeEvents[0].verb === spec.verb && writeEvents[0].echoed === true;
        check(
          arm,
          read.status === 200 && offered && shape === true && door.counts.writes === 1 && signedOk && (reread === null || reread === 404),
          `the session offers ${J(s?.reply)}; the one POST /v1/${spec.verb} answered ${String(got.status)}${got.error ? ` (${got.error})` : ''} ${got.body.slice(0, 120)}; ${String(door.counts.writes)} write(s) counted, verified over its body with the client identity and its offer echoed: ${String(signedOk)}${reread === null ? '' : `; the read after it answered ${String(reread)}`}`
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
          // Phase 318: an honest press and an honest message are answered done
          // with their own ids, each counted once.
          const pressId = randomBytes(16).toString('hex');
          const sayId = randomBytes(16).toString('hex');
          const honestPress = await signedPost(phone, d, '/v1/choose', { mark: HOSTILE_MARK, marker: '1', question: HOSTILE_QUESTION, session: door.sessionToOpen, write: pressId });
          const honestSay = await signedPost(phone, d, '/v1/say', { session: door.sessionToOpen, text: 'p316 honest message', write: sayId });
          const repliesHold = honestPress.status === 200 && JSON.parse(honestPress.body).write === pressId && JSON.parse(honestPress.body).verb === 'choose' && honestSay.status === 200 && JSON.parse(honestSay.body).write === sayId && JSON.parse(honestSay.body).verb === 'say';
          const writesHold = honestWrite.status === 200 && JSON.parse(honestWrite.body).write === writeId && forgedWrite.status === 404 && repliesHold && door.counts.writes === 4;
          // Phase 316.7: the honest /v1/sessions, drawn by the phone's own
          // refusals, every row one the door's /v1/session answers for.
          const sessionsRead = await readSessions(phone, d, {});
          const known = new Set([...(body?.rows ?? []), ...(body?.others ?? [])].map((r) => r.sessionId));
          const sessionsProblems = sessionsRead.answer === null ? ['no answer'] : sessionsAnswerProblems(sessionsRead.answer, askedOf({}));
          const sessionsHold = sessionsRead.status === 200 && sessionsProblems.length === 0 && sessionsRead.answer.rows.length > 0 && sessionsRead.answer.rows.every((r) => known.has(r.sessionId)) && sessionsRead.answer.rows.some((r) => r.sessionId === door.sessionToOpen);
          // Phase 337.1: the honest Screen offers the door's history, and an honest page of it is one the phone joins.
          {
            const screen = await screenRead(phone, d, door.sessionToOpen);
            const sc = screen.answer?.screen ?? null;
            const ask = { from: HOSTILE_HISTORY_DEPTH - 108, count: 108, depth: HOSTILE_HISTORY_DEPTH, wrap: sc?.cols ?? 120, keep: 'bottom' };
            const page = await scrollbackRead(phone, d, door.sessionToOpen, ask);
            const problems = page.answer === null ? ['no answer'] : scrollbackAnswerProblems(page.answer, ask);
            const rowsHold = page.answer !== null && page.answer.rows.every((row, k) => screenRowText(row) === historyLineOf(ask.from + k + 1).slice(0, ask.wrap));
            const refusedQuery = await signedGet(phone, d, `${scrollbackTarget(door.sessionToOpen, ask)}&cols=80`);
            check('honest (scrollback)', sc?.depth === HOSTILE_HISTORY_DEPTH && sc?.space === HOSTILE_SPACE && page.status === 200 && problems.length === 0 && rowsHold && page.answer?.space === sc?.space && refusedQuery.status === 404, `the Screen offers a history of ${J(sc?.depth)} in space ${J(sc?.space)}; a page of 108 answered ${String(page.status)}, refused for ${J(problems)}, its rows the numbered lines: ${String(rowsHold)}; a seventh name answered ${String(refusedQuery.status)}`);
          }
          check(
            arm,
            blocked.status === 200 && body !== null && paged.ok && all.length === door.turnCount && contiguous && indexes[0] === 0 && verified && mtls && bareEvent?.clientPin === null && bareEvent?.channelHeld === false && writesHold && sessionsHold,
            `paired (a proof by another key refused), the list read, the conversation paged to the first turn: ${String(all.length)} of ${String(door.turnCount)} turns, contiguous ${String(contiguous)}; every signature verified; every read over TLS 1.3 with the client identity and the name: ${String(mtls)}; a read without the identity is recorded as such; an honest write answered ${String(honestWrite.status)} with its id and the same signature over a changed body ${String(forgedWrite.status)}; an honest press and message answered ${String(honestPress.status)} and ${String(honestSay.status)} with their ids; /v1/sessions answered ${String(sessionsRead.status)} with ${String(sessionsRead.answer?.rows?.length ?? 0)} row(s), refused for ${J(sessionsProblems)}, the session a conversation arm opens ${sessionsRead.answer?.rows?.some((r) => r.sessionId === door.sessionToOpen) ? 'among them' : 'NOT among them'}${certNote}`
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
