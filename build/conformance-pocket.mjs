#!/usr/bin/env node
/**
 * `npm run conformance:pocket`. The cheap gate on the door (Phase 313).
 *
 * WHAT IT IS FOR. `src/main/pocket/` is the first thing in Tortie that anything
 * outside this Mac can ask a question. Every promise that makes that safe is
 * ONE clause in one module — one `listen`, one address, one closed table, one
 * refusal before a header is read — and every one of them is a line a later
 * round can delete with every other gate in this repository still green. This
 * file is the executable half of those promises, in about a second.
 *
 * WHAT IT STARTS. Nothing. No Electron, no tmux, no ssh, no agent, no token,
 * no Tailscale, and NOT ONE SOCKET: it binds nothing, it opens nothing, it
 * reads nothing under the person's home and it writes no file. The attack
 * beside it, `build/p313/hostile-client.mjs`, is the half that drives a live
 * door, and it binds loopback on a port it found for itself and closes it in a
 * `finally`. U5 reads `out/` when a build left one there, and says
 * `skipped: no build` when none did.
 *
 * PHASE 330 MOVED THE DOOR (build/p330/SPEC.md §6.1). The listener left
 * Electron main for its own `utilityProcess` (`src/main/pocket/door-process.ts`
 * over `src/main/pocket/door/`), it binds `127.0.0.1` on an ephemeral port, and
 * Tailscale Funnel publishes it to the internet through a child Tortie runs.
 * So the bind rules (L1 to L5), the spawn rule (R3), the queue (Q1), refusal 7
 * (A4), the QR (F2), the credential that left (K2) and the bridge (B1) were
 * rewritten, S2 and S4 left with `isSelfOrigin` (every Funnel connection
 * arrives from 127.0.0.1, so a self-origin refusal refuses every phone), and
 * twelve rules joined: the Funnel child's argv, program and death (U1 to U4),
 * the built door's imports (U5), mutual TLS (M1), the hash (M2), the PROXY
 * source (P1), the length on every answer (C1), `/pair`'s three answers (N3),
 * the menu row (MENU1) and the door's own import wall (W2).
 *
 * PHASE 332 ASKS DNS ABOUT HIS MAC'S NAME (build/p332/SPEC.md §7.1). Before a
 * code shows, `src/main/pocket/public-name.ts` asks the `ts.net` zone's own
 * servers, in main, over `node:dgram`, and parses answers anyone on the path
 * can forge. Eight rules joined for it, D1 to D8: `node:dgram` in that module
 * alone and no `node:dns` (D1), the zone question non-recursive, connected
 * and authoritative (D2), the refused ranges named once (D3), the check
 * started only at a counted start and stopped first in every unpublish, with
 * no clock (D4), reason words only in its log lines (D5), `pairable` one
 * predicate (D6), the override loopback or nothing and never a fallback to
 * the search (D7), and no real server outside Electron (D8). T1 now reads
 * `build/p332/` too, and treats the `address` a `bind(` is handed as a host.
 * D9 joined in the round after his ruling of 2026-09-30: the push seam
 * (`src/main/harness/push-seam.ts`), the one caller of `beginPairing` outside
 * a test and one D8 does not cover because it runs in Electron, refuses to
 * pair without the loopback name stand-in and waits for `pairable`, because a
 * verifier deleted each and every gate stayed green.
 *
 * PHASE 316.5 COMPOSES THE ALERTS FOR A PERSON (build/p3165/SPEC.md §6.1), and
 * the Apple push key reaches Settings then Phone through a port the host is
 * handed and never implements. One rule joined, K3: THE PUSH KEY NEVER ENTERS
 * THE DOOR. B1 counts thirteen channels, and R3 refuses the alerts'
 * composition, the file panel and the key's store by name.
 *
 * PHASE 332.1 DRAWS THE NAME CHECK (build/p3321/SPEC.md §8.1). The round now
 * hands the host each server's answer, kinds only, the host stamps its run on
 * a monotonic clock, and one status field, `nameProgress`, carries four
 * numbers and booleans to the Pair card. One rule joined, D10: THE PROGRESS
 * DECIDES NOTHING AND CARRIES NOTHING. Its contract is four members and no
 * string, the run's stamps and `nameShown` are read by `nameProgressNow`
 * alone and written only where the SPEC's table puts them, `nameProgressNow`
 * is called by `status()` alone, and the sheet's `pairingStage`,
 * `pairAfterAllowNext` and `onPair` name no `nameProgress`. D4 still refuses
 * the wall clock and now fences the one monotonic clock to four methods, with
 * `performance.now()` its one shipping body; D5 holds every log line of
 * `settleNameRound` behind a change of verdict, of `opened` or the
 * confirmation; D6 lets the sheet compare `nameCheck` with `'confirmed'` too,
 * never in the three Pair functions. Fifty-three rules in all.
 *
 * PHASE 317 GAVE THE DOOR ONE WRITE (build/p317/SPEC.md §6.1): `POST /v1/end`,
 * a signed JSON body parsed in main alone, behind a ledger, one write in
 * flight a phone and a session, and a last check with nothing between it and
 * the act. R2 now reads a CLOSED write list (exactly `end`, a signed POST with
 * its own body cap), R4's pin moved on purpose (ad9ce821… to d1fefb71…), N1 is
 * "no route names the push" with Phase 313's pin gone, G1's words gained text,
 * message, words, label, typed and reply and its scope
 * src/main/sessions/pocket-writes.ts, A4 reads that an acted answer is never
 * replaced, and twelve rules joined: X1 the order, X2 the strict parse, X3 the
 * ledger, X4 one in flight, X5 `PocketWrites` and its one implementation, X6
 * the answer, X7 never 404 after the act, X8 the door never parses a write, X9
 * a phone is removed by Remove alone, X10 the revoked socket, X11 one log line,
 * X12 the lines say it. Sixty-five rules in all. ITS FIX ROUND TOOK A SECOND
 * WRITE OUT, `POST /v1/unpair` (the phone waited on it before it could forget a
 * Mac that did not answer, which made Unpair slower than today), with its
 * `dropPhone`, its `after` and the clauses that read them; X9 now holds that
 * nothing but Remove takes a phone out of the store.
 *
 * PHASE 318 GAVE THE DOOR TWO MORE WRITES (build/p318/SPEC.md §6.1):
 * `POST /v1/choose` (one tap on a numbered question) and `POST /v1/say` (one
 * message), to 317's one write path and its ledger. R2 now reads exactly end,
 * choose and say; R4's pin moved on purpose (d1fefb71… to 0e8c9f46…); R3
 * refuses main/reply/ by name; X1 to X12 read all three verbs (the order and
 * no 404 after the act over each, the three strict parses, the verb in the
 * ledger key, one in flight across verbs, PocketWrites exactly end, choose and
 * say, sentences from src/shared/reply-copy.ts too, the joined line and the
 * honesty sentence naming the three). And eighteen rules joined, Y1 to Y18,
 * over the module that TYPES, src/main/reply/, which sits outside this
 * directory and is reached only through what src/main/capabilities.ts hands
 * the door: the caps (Y1), still (Y2), the argv element for element (Y3), the
 * text's one sink (Y4), the final check then the act with nothing awaited
 * (Y5), the one status call (Y6), the pure compiled tables (Y7), errors by
 * code (Y8), no log (Y9), the remote arm first and no stdin to another machine
 * (Y10), the door naming nothing of the writer (Y11), G1 over the reply (Y12),
 * who moves the question id (Y13), the reader's one way and the field composed
 * field by field (Y14), nothing stripped (Y15), the optional fields (Y16),
 * pane reports moving nothing (Y17) and a message only at an idle prompt
 * (Y18).
 *
 * PHASE 316.7 GAVE THE PHONE EVERY SESSION (build/p3167/SPEC.md §8.1): one more
 * signed read, `GET /v1/sessions`, whose answer main composes for five closed
 * words the phone sends, so R4's pin moved on purpose again (0e8c9f46… to
 * d95ecd27…, over 318's seven routes and this read) and fourteen rules
 * joined, one per clause. O2a to O2m: the answer
 * is synchronous (a), reads the session list once (b), reads each of its four
 * bounds from the contract once and re-spells none (c), clips every string main
 * does not already cap at ONE function that never splits a surrogate pair (d),
 * says how many rows the caps left out (e), indexes a row's group where the
 * group is pushed (f), reads the query by equality and one character at a
 * time (g), shows what the gates' own partition keeps (h), groups by the
 * sheet's own functions and builds no key of its own (i), says a creation clock
 * as one (j), CHOOSES what the caps keep in today's priority and EMITS in the
 * order he asked for (k, the adversary's F2: a cut in display order dropped a
 * waiting session in a late group), never draws an attentionRows row's since
 * (l, F1: that since is the creation clock and drew 20728d), and offers only
 * ids the query reads and filters by the groups' own machine (m, F8 and F9).
 * O3: it reads no conversation. With Phase 318's Y1 to Y18, ninety-seven
 * rules in all.
 *
 * HOW IT READS. The source, parsed with the TypeScript compiler's own parser,
 * so a comment, a string and a call are each read as what they are. A rule
 * that could be satisfied by a word in a comment is not a rule, and three of
 * the rules below exist because their earlier draft was exactly that.
 *
 * WHAT IT FAILS ON. Every failure is printed as `[p313 <rule>]`, which is what
 * `npm run ablation:p313` reads to prove each rule can go red ON ITS OWN. A
 * rule nothing can redden is decoration and the ablation says so by name.
 *
 * A NOTE ON A MISSING MODULE. Half of this domain is written by one builder and
 * half by another, and a gate that passed while a module was absent would be
 * the worst possible answer: it would go green on the day the door does not
 * exist. So a missing module FAILS the rule that needed it, by name, and says
 * which module and which builder owns it.
 *
 *   node build/conformance-pocket.mjs            the gate
 *   node build/conformance-pocket.mjs --list     the rules, and nothing run
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[conformance:pocket]';
const t0 = Date.now();

/**
 * The rules. `owner` is the clause of `build/p313/SPEC.md` or of Phase 313's
 * backlog entry that the rule is the executable half of.
 */
const RULES = [
  // PHASE 330 rewrote the bind: the one listen is the door process's own, on
  // loopback, on an ephemeral port, and the phone is told the PUBLIC port.
  ['L1', 'build/p330/SPEC.md §6.1', 'exactly ONE listen call in the whole domain, and it is the door process’s own net.Server in door/listener.ts'],
  ['L2', 'build/p330/SPEC.md §6.1', 'the string 0.0.0.0 is nowhere in the domain, and the one listen’s host is the literal 127.0.0.1, in door/listener.ts alone'],
  ['L3', 'build/p330/SPEC.md §6.1, §4.2.4', 'the Funnel target’s host is the literal 127.0.0.1 and its port is the listener’s REPORTED localPort, spelled once, and never a stored field or a setting'],
  ['L4', 'build/p330/SPEC.md §6.1, §3 row 8', 'the local port is ephemeral, listen(0) and nothing else, and a confirmed public port that is taken refuses port-taken: 443 is never named'],
  ['R1', 'SPEC §2', 'the route table is CLOSED: frozen, every path an exact string, no pattern, no wildcard, no default arm (read in door/table.ts, where Phase 330 moved it, and in routes.ts, which re-exports it)'],
  ['R2', 'SPEC §2, entry mechanism 4; build/p317/SPEC.md §6.1; build/p318/SPEC.md §6.1; build/p337/SPEC.md §6.1', 'every row is a read (reads: true, a GET or the one pairing row, window-only and unsigned) or a write (reads: false, POST, signed: true, windowOnly: false); the writes are EXACTLY end, choose, say and keys, the contract’s POCKET_WRITE_ROUTE_IDS says the same, and each has its own cap in POCKET_WRITE_BODY_CAPS'],
  ['R4', 'the fix round, 2026-09-22; build/p337/SPEC.md D1; build/p3371/SPEC.md D1', 'the table’s MEMBERSHIP is pinned: the exact set of method-and-path pairs, by sha256, so a fourth route is a visible edit rather than a green build'],
  ['R5', 'entry, mechanism 4', 'the turn limit is clamped AT THE DOOR against the overview store’s own MAX_TURN_LIMIT, which is imported and never re-spelled'],
  ['R3', 'entry, mechanism 4; build/p330/SPEC.md §6.1; build/p318/SPEC.md §6.1; build/p337/SPEC.md §6.1; build/p3331/SPEC.md §6.1', 'the domain names no write verb, no status setter, no credential read and nothing of the reply writer (main/reply/) or of the Screen (main/screen/), and starts NO process but funnel.ts’s spawn of the resolved program, its execFile of that program and of /bin/ps, and bind.ts’s one utilityProcess.fork, and two LaunchServices opens a person’s press makes, Tailscale’s download page and the Tailscale app (SU3)'],
  ['A1', 'entry, mechanism 5', 'no Authorization header and no cookie is read or written anywhere in the domain'],
  ['A2', 'entry, mechanism 5, research 127 §7', 'no secret is in a path or a query: no route path interpolates and no 32-hex token is matched out of one'],
  ['A3', 'entry, mechanism 3', '/pair is dead outside its window, and the window is checked before anything is read off the request'],
  ['S1', 'entry, mechanism 5', 'Referrer-Policy: no-referrer is emitted from exactly ONE place'],
  ['W1', 'the fix round, 2026-09-22', 'every file and directory this domain creates names an owner-only mode, so one write in it cannot drift looser than its sibling'],
  ['B1', 'the judge, 2026-09-22; build/p330/SPEC.md §4.11; build/p3165/SPEC.md §6.1; build/p3331/SPEC.md §6.1', 'the bridge and the registrar move together, and they carry the same FIFTEEN pocket channels the contract declares (pocket:recheck and pocket:setupAction since Phase 333.1)'],
  ['S3', 'entry, proof; hooks.ts:256-316', 'the disposer owns the door: admission closes on the first line of every stop, before any await, in main AND in the door process, and the stop ends the process and closes the listener'],
  ['G1', 'entry, proof; hooks.ts:368-385; build/p317/SPEC.md §6.1', 'no token, no body, no header value, no message, no typed text and no line of conversation is reachable from any log call in the domain or in src/main/sessions/pocket-writes.ts'],
  ['T1', 'the operator, 2026-09-22', 'nothing in this repository binds a real interface: every test and every gate drives the door on loopback'],
  ['H1', 'his ruling, 2026-09-22 (“lets skip the web app”)', 'this domain composes NO HTML document and names no text/html content type: the page was built, could not be reached under mechanism 5’s own refusals, and was removed on his ruling, so a later round that wants one asks him rather than rebuilding it under a green gate'],
  ['N1', 'Phase 314, build/p314/SPEC.md §1.1 row 3; build/p317/SPEC.md §6.1', 'NO ROUTE NAMES THE PUSH: no route id, path or contract id names push, apns, notify, device, token or alert (Phase 317 dropped the second pin on Phase 313’s membership; R4 holds the membership)'],
  ['N2', 'Phase 314, build/p314/SPEC.md §6.2', 'THE DEVICE TOKEN HAS ONE DOOR IN AND NONE OUT: the presentation parser takes apt as bounded hex and ape as one of two words or refuses, no renderer-facing type carries a field named like a token, and PocketPushDestination lives in main alone'],
  ['K3', 'build/p3165/SPEC.md §6.1, §5.2.2', 'THE PUSH KEY NEVER ENTERS THE DOOR: PocketAlertsPort is exactly five members answering string | null, string | null, Promise<PocketPushKeyResult>, Promise<void> and void; PocketPushKeyResult is exactly kept and refusal; status() reads keyId() and sentence() of the port and nothing else, and alertsCanSend(), which /pair’s answer asks (research 136), reads keyId() alone; the two handlers call only host.choosePushKey(event.sender) and host.forgetPushKey(), which call only the port; the domain imports nothing of main/alerts; and PocketHostDeps.alerts is handed by src/main/capabilities.ts and tests alone'],
  ['K2', 'build/p330/SPEC.md §6.1 (K1 became K2)', 'NO TAILNET KEY ANYWHERE UNDER src/: no tailnetKey, no tk and no tskey- in any production file, because the code carries no credential at all now'],
  ['O1', 'build/p316/SPEC.md §4 S1 mechanism 4; his ruling of 2026-09-22', '`others` is exactly the listed sessions that are not blocked: composed from the same session list and the same blocked set as `rows`, capped at POCKET_OTHERS_MAX imported from the contract and never re-spelled, with the omitted count said'],
  ['F2', 'build/p330/SPEC.md §4.8.1 (F1 became F2)', 'the QR is v:3 and holds EXACTLY the eight keys v, host, port, fp, dk, dx, ps and exp, in that order, with no tk and no address; fp pins the LISTENING door’s public key and no window opens while there is nothing to pin'],
  ['T2', 'build/p316/SPEC.md §4 S1 mechanisms 2 and 3', 'every turn the door reads is preceded by the refresh through the one read path (`sessionActivity`), and every turn it answers passes through `toTurnView` once and is built nowhere else'],
  ['L5', 'build/p330/SPEC.md §6.1; CLAUDE.md refusal 8', 'the one fork of the door process and the one spawn of the Funnel child are reached only from openNow or recoverNow, behind the gate, each with the last-press check as the statement IMMEDIATELY before it; the launch step asks for enabled AND bindAtLaunch; a switch-off counts itself before its first await'],
  ['A4', 'build/p316/SPEC.md §4 S1 Method B; build/p330/SPEC.md §4.5.3; build/p317/SPEC.md §6.1', 'refusal 7 BY GENERATION: main keeps each door process’s admission by generation, refuses a request for a generation that is not the door’s or has begun to stop before a handler sees it, and asks again after the answer is composed with nothing awaited before the post, never replacing an answer marked acted; the handler asks the verified phone and the door instance again before it answers; a Remove writes the store before its first await'],
  ['H2', 'build/p316/SPEC.md §4 S1 mechanism 1, §2 rows 17 and 20', 'no `ssh` hand-off: the kind is gone from the contract, no module in the door composes an ssh link or a tmux attach, and the hand-off answers null for every session in 316'],
  ['Q1', 'his ruling, 2026-09-23 (“Yes, fix and land.”); build/p330/SPEC.md §4.3', 'THE SWITCH HANDLES ONE PRESS AT A TIME: every start and stop of the door AND of the Funnel child runs inside ONE serial queue on PocketHost that chains each job on one tail and never lets a failed job stop the next; both halves of setDoor count themselves before their first await; a superseded start stops waiting on the sessions'],
  // PHASE 330, the door on the internet (build/p330/SPEC.md §6.1).
  ['U1', 'build/p330/SPEC.md §4.2.4; research 132 §9 condition 5', 'THE FUNNEL ARGV, EXACTLY: funnel --tcp=<publicPort> --proxy-protocol=2 tcp://<target>, status only with --json and --peers=false, serve only as serve status --json, and no --bg, reset, off, clear, --https, --http, --tls-terminated-tcp, --set-path, --yes or --service anywhere in src/'],
  ['U2', 'build/p330/SPEC.md §4.2.1', 'THE PROGRAM comes from resolveTailscale alone, no Tailscale path is a literal in the domain, and an override that is set but did not resolve REFUSES override-unusable rather than falling back to his real Tailscale'],
  ['U3', 'build/p330/SPEC.md §4.2.6; research 132 §7.4', 'THE CHILD’S DEATH: its SIGKILL is inside a finally of the stop, the record is written 0o600 in a 0o700 directory of its own that is narrowed to 0o700 even when it already exists, and the orphan sweep signals only when the start time AND the command line both equal the record, and only after the record is shown to name the argv Tortie spawns (funnelArgv over FUNNEL_PORTS); a record naming anything else is removed and its process left alone'],
  ['U4', 'build/p330/SPEC.md §5.2 item 3', 'the tailscale and door deps, and the in-process door, are handed to PocketHost only by tests and push-seam.ts: production forks the real process and runs the real program'],
  ['U5', 'build/p330/SPEC.md §6.1', 'THE BUILT DOOR: out/main/pocket-door.js and every chunk it requires name no electron module and no builtin but net, tls, http and crypto, and reach no credentials, logins, push or sessions code (read only when out/ exists)'],
  ['M1', 'research 132 §9 condition 1; build/p330/SPEC.md §4.6', 'MUTUAL TLS: TLS 1.3, requestCert, and the HTTP parser handed a socket only inside the secureConnection handler, AFTER the server name and the key pin, with no data listener on a TLS socket before it; no certificate means POST /pair alone, inside a window'],
  ['M2', 'research 132 §9 condition 4; build/p330/SPEC.md §4.4', 'THE HASH covers the Funnel program, the tailnet, the public name and the public port and every phone’s clientKey, holds no bindAddress, port or address, and is sha256-pocket-exec-v3'],
  ['P1', 'research 132 §9 condition 3; build/p330/SPEC.md §4.6 step 2', 'THE PROXY SOURCE IS A RATE-LIMIT KEY ONLY: its bytes are read in door/limits.ts alone, it is on no DoorRequest and in no log call, and no socket address is read anywhere in the domain'],
  ['C1', 'build/p330/SPEC.md §4.6 step 6', 'EVERY ANSWER CARRIES AN EXPLICIT Content-Length, 0 included, from the one writer, and nothing in the domain names Transfer-Encoding or streams a body'],
  ['N3', 'build/p330/SPEC.md §4.8.3; research 136 (Phase 316.5)', '/pair answers exactly three states, the certificate ONLY with allowed, and alerts ONLY with pending and only as the literal true; main composes the answer field by field and never serialises what the pairing owner handed it'],
  ['MENU1', 'the entry, "Unchanged on purpose"', 'Pair a Phone… is still the row directly under Settings…, and it opens Settings at the Phone section'],
  ['W2', 'research 132 §9 condition 2; build/p330/SPEC.md §6.1', 'THE DOOR PROCESS’S IMPORT WALL, re-derived here: door-process.ts and door/** import node:net, node:tls, node:http, node:crypto, src/shared/ and door/ itself, and NOTHING else'],
  ['E1', 'the Phase 330 fix round (lens 2, measured with ps -E); build/p330/SPEC.md §10 concern 3', 'THE DOOR PROCESS’S ENVIRONMENT IS ITS OWN: the one utilityProcess.fork names an env object literal of at least one plain string variable, never {} (Electron reads it as unset and hands the door main’s whole environment), never a spread and never process.env; and door-process.ts and door/** read no process.env'],
  // PHASE 332, the Mac's public name (build/p332/SPEC.md §7.1).
  ['D1', 'build/p332/SPEC.md §4.2, §4.3', 'node:dgram is imported by public-name.ts ALONE across src/, no production file under src/main/pocket/ names node:dns, public-name.ts imports node:dgram, node:crypto and node:net and nothing else, and every createSocket in it passes a lookup declared in the same file'],
  ['D2', 'build/p332/SPEC.md §4.2 to §4.5', 'the zone question is built with recursion false and true is set only in findZoneServers; the id comes from node:crypto and Math.random is nowhere; every send passes the buffer and a callback inside a connect callback; the size cap is compared before a byte is read; a record needs the AA bit and the byte-for-byte question; a loopback server binds the literal 127.0.0.1; the message handler compares rinfo.address and rinfo.port with the server’s'],
  ['D3', 'build/p332/SPEC.md §4.5', 'NAME_REFUSED_V4 is declared once, in public-name.ts, holds [100, 64, 0, 0, 10] and the seven other ranges, isPublicV4 is its only reader, and no other file under src/main/pocket/ spells any of the eight'],
  ['D4', 'build/p332/SPEC.md §4.9; build/p3321/SPEC.md §8.1', 'beginNameCheck is called ONCE, in openNow, after closeNowUnlessConfirmed; stopNameCheck is the first statement of unpublish and unexpectedlyDown; status, nameCheckNow, pairable, nameProgressNow, openAtLaunch and the pocket:status and pocket:pairingState handlers start nothing; the timer is armed through armFunnelRestart alone; no name-check method reads the wall clock, and the monotonic one is read in four methods only, for the sheet, as this.names.monotonic(), with () => performance.now() its one shipping body; and names: is handed to PocketHost only by tests'],
  ['D5', 'build/p332/SPEC.md §4.14; build/p3321/SPEC.md §8.1', 'public-name.ts names no log call, every log call in a name-check method of ipc.ts interpolates only a verdict or a reason, never the public name, a target, an address, the servers, the tailnet or the bytes, and every log call in settleNameRound sits behind an if whose condition names last, opened or confirmed: a line per change, never a line per round'],
  ['D6', 'build/p332/SPEC.md §4.11, §4.12 and its fix round; build/p3321/SPEC.md §8.1; build/p3331/SPEC.md §6.1 (r2 §Attack F25)', 'pairable is ONE method of PocketHost, status() answers pairable: this.pairable(), beginPairing asks this.pairable() before stillPublished() and AGAIN after it and before its one this.pairing.open(), and PhoneSection.tsx reads .pairable in pairingStage, pairAfterAllowNext and onPair; EVERY file of the sheet’s surface compares nameCheck only with unreadable or confirmed, never inside those three, and phone/steps.ts and the step frame (phone/StepsCard.tsx) name no nameCheck and no nameProgress at all'],
  ['D7', 'build/p332/SPEC.md §4.8', 'GMUX_POCKET_NAME_SERVERS is read in nameServersFrom alone, which answers the search for a packaged build before it looks, matches every entry against a pattern anchored on ^127\\.0\\.0\\.1:, answers refused for anything else and never the search; and askNameRound returns override-unusable for a refused source before it names findZoneServers'],
  ['D8', 'build/p332/SPEC.md §4.3 step 1', 'the shipping transport answers an error for a server that is not 127.0.0.1 unless process.versions.electron is a string, BEFORE it creates a socket: no test and no script reaches a real DNS server through it'],
  ['D9', 'build/p332/SPEC.md §4.13; after his ruling, 2026-09-30', 'THE PUSH SEAM PAIRS NOTHING WITHOUT THE NAME STAND-IN: nameStandInOnly answers nameServersFrom(…).kind === \'fixed\' alone, openDoorForPairing returns false on it before it first calls its host, waits a bounded time for host.status().pairable after the switch and before every return true, with the wait’s answer deciding a return false, and the seam presses beginPairing only on openDoorForPairing’s true'],
  ['X1', 'build/p317/SPEC.md §5.3.4, D3, D4; build/p318/SPEC.md §5.1.4; build/p337/SPEC.md §5.5', 'THE WRITE ORDER, over all four verbs: the parse, the ledger, the in-flight claim, the last check, the act and the outcome appear in that order; nothing sits between the last check and the act, whose ONE statement starts end, choose, say or keys through a settle function that calls it at once; every 404 precedes the act; after it every return is marked acted: true; before it only the ledger’s returns are marked, a recorded hit with its own acted and the busy for a pending entry of the same write id'],
  ['X2', 'build/p317/SPEC.md §5.3.4 step 1, D2; build/p318/SPEC.md §5.1.2; build/p337/SPEC.md §5.5', 'THE STRICT PARSE, four of them: one JSON.parse in the write path, inside a try, reached by the parse functions alone; each key set compared exactly (batch,session,write; mark,marker,question,session,write; session,text,write; dialog,keys,session,turn,write); the write id, the session id, the question id, the mark and the marker read one character at a time, and no pattern'],
  ['X3', 'build/p317/SPEC.md D5, §3 row 18; build/p318/SPEC.md D4; build/p337/SPEC.md D24', 'THE LEDGER: keyed on the verified phone, THE VERB and the write id, joined by a newline no part can hold; each entry stores its acted; its lifetime is 2 * POCKET_CLOCK_SKEW_MS imported from ./pairing; caps of 2,048 and 8,192 compared against; no entry evicted but by its lifetime or, pending and never acted, in the finally; the pending entry made at the in-flight claim; no node:fs'],
  ['X4', 'build/p317/SPEC.md §5.3.4 step 3; build/p318/SPEC.md D4', 'ONE IN FLIGHT, ACROSS VERBS: a claim per phone and per session, each asked first and never under a branch on the verb, claimed before the act and released in the finally of the try that holds the act, so an End and a message can never overlap on one session'],
  ['X5', 'build/p317/SPEC.md §5.4, D7, D14; build/p318/SPEC.md §5.1.5; build/p337/SPEC.md §5.4', 'POCKETWRITES: declared once, in routes.ts, with exactly end, choose, say and keys; implemented once, in src/main/sessions/pocket-writes.ts, whose choose and say pass through to deps.reply and keys to deps.keys, and nothing else; built in src/main/capabilities.ts alone; end asks endRefusal( and .canEnd of sessionActionGates( with DOOR_GATE_ENV before its first await, which is killSession(; the batch arm calls the injected machineKnown( and nothing reads .answering; the production machineKnown is machineRow( from src/main/machines/store.ts; no other lifecycle verb and no status setter; PocketFacts.endOffer is optional'],
  ['X6', 'build/p317/SPEC.md §5.3.1, §5.4, research 135 §4.8; build/p318/SPEC.md D19, D20; build/p337/SPEC.md §5.4', 'THE ANSWER: PocketWriteAnswer is exactly verb, write, outcome, reason and sentence; every sentence the write path, pocket-writes.ts, src/main/reply or src/main/screen sets is a named constant from lifecycle-words.ts, src/shared/reply-copy.ts, src/shared/screen-copy.ts, endRefusal’s own, or POCKET_WRITE_SENTENCES; no .message is read; a caught error is told apart by isGmuxError(, by code, and nothing else'],
  ['X7', 'build/p317/SPEC.md D4, §5.3.2', 'NEVER 404 AFTER THE ACT: bind.ts posts nothing for an acted answer that fails validation; the listener’s late-answer timer cuts a write (writesCut) before it could answer 404; no refusal follows the forward, and every other 404 is a refusal before it or the read half of a choice that cuts a forwarded write'],
  ['X8', 'build/p317/SPEC.md D2, §5.3.1, §5.3.2', 'THE DOOR NEVER PARSES A WRITE: JSON.parse in the door process is presentationOfBody’s, reached by the pairing route alone; a write’s target is url.pathname, a write with a query is refused route, and doorRequestOf refuses a target that is not the write’s path; the cap is read from POCKET_WRITE_BODY_CAPS on both sides'],
  ['X9', 'build/p317/SPEC.md "§Fix round"', 'A PHONE IS REMOVED BY REMOVE ALONE: the one store write that filters a phone out is in removePhone, before its first await; no write route reaches it (the write path’s deps are exactly shuttingDown, stillPaired, writes and now, and name nothing that drops a phone), and no answer carries a step to run after it (DoorAnswer has no after, and nothing in bind.ts, ipc.ts or writes.ts runs one)'],
  ['X10', 'build/p317/SPEC.md §5.3.2, §14 finding 22', 'THE REVOKED SOCKET: applyPins marks it revoked and destroys it at once unless it is answering a write (writes === 0); a forwarded write is counted on its socket and the socket is cut when that answer finishes or closes; handleRequest refuses a revoked socket before anything else'],
  ['X11', 'build/p317/SPEC.md §5.3.4 step 7; build/p318/SPEC.md §5.1.4 step 7', 'ONE LOG LINE PER WRITE, whatever its verb: exactly one log call in the write path, after the act, interpolating the verb and the outcome word, with the session id as its one field, never the body, the write id, a header, a sentence, the question id, the mark, the marker or the text'],
  ['X12', 'build/p317/SPEC.md D19, §5.6; build/p318/SPEC.md §5.1.7, D28; build/p337/SPEC.md D35', 'THE LINES SAY IT: describePocketDoor derives “Lets an allowed phone …” from fields.routes through a compiled map keyed by PocketWriteRouteId, whose clauses are exactly end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac, joined as a list; POCKET_DOOR_HONESTY names the screen, the keys and the three, and no longer says it can change nothing else; POCKET_READ_ONLY_HONESTY is named nowhere'],
  // PHASE 318, the reply (build/p318/SPEC.md §6.1).
  ['Y1', 'build/p318/SPEC.md D3, §Revision R18; build/p337/SPEC.md D17', 'THE CAPS: POCKET_WRITE_BODY_CAPS is frozen and exactly end 512, choose 512, say 32,768 and keys 16,384, keyed by the closed write list'],
  ['Y2', 'build/p318/SPEC.md D5, §5.1.4 step 4', 'STILL: the write path builds still from exactly the three asks of its own last check and hands it to writes.choose( and writes.say( as their second argument; a message’s text reaches writes.say( and nothing else'],
  ['Y3', 'build/p318/SPEC.md D8, D9, §5.6, §Revision R19 b', 'THE ARGV, element for element: writer.ts and reader.ts compose only the press’s two control lines and its spawned list, load-buffer -b <name> -, the paste list, delete-buffer -b <name>, list-panes … -F PANE_FORMAT, display-message for the cursor and capture-pane -p [-e]; the press and the paste aim at the reading’s pane and never the session list-panes reads; -l only before -- and the marker; no Enter but the paste list’s'],
  ['Y4', 'build/p318/SPEC.md §5.6.2, research 135 §4.8', 'THE TEXT’S ONE SINK: no argv element is derived from a message’s text, which reaches textRefusal( and load-buffer’s stdin alone; the buffer is named tortie-say- and an id the writer mints (randomBytes(16)), never the phone’s write id; delete-buffer sits in a finally'],
  ['Y5', 'build/p318/SPEC.md D5, D8, §5.6.1 steps 4 and 5, §Revision R15, R19 a', 'THE FINAL CHECK, THEN THE ACT: in choose and say, still(, then the phone’s bump(, then onLastCheck?.(, then the act (the press’s Promise.allSettled([…]) of two sendCommand( lines or its spawned list; the say’s paste list), with no await between the first still( and the act; and readReply’s last awaited read is the capture'],
  ['Y6', 'build/p318/SPEC.md D16 (as the fix round of 2026-10-04 amended it), D17, §5.6.1 step 8, §Revision R11; CLAUDE.md refusal 5', 'ONE STATUS CALL: noteUserInput( once in src/main/reply, in choose, after the read-back and only when no hook came since the press and the read-back screen draws no choice; never guarded by the id’s count, which a tick’s choice-gone moves; no other status setter named there'],
  ['Y7', 'build/p318/SPEC.md D11, §5.4.3, §5.3; CLAUDE.md refusal 5', 'THE PURE MODULES: press-shapes, input-row, text-rules, gate, hook-says and question-id import no configuration, settings, overlay or agent registry, no node:fs, no child_process and no tmux module; question-id imports node:crypto alone; the shape tables are Object.freeze’d literals'],
  ['Y8', 'build/p318/SPEC.md §5.6, research 135 §4.8', 'ERRORS BY CODE ALONE: nothing in src/main/reply reads .message, and a caught value is told apart by isGmuxError( and nothing else'],
  ['Y9', 'build/p318/SPEC.md §5.6', 'NO LOG CALL anywhere in src/main/reply: the one line per write is writes.ts’s'],
  ['Y10', 'build/p318/SPEC.md §5.4.1, D22', 'THE REMOTE ARM FIRST: replyGate( precedes every tmux call in choose and say, and refuses a row on another machine before it reads the status; spawnTmux throws for a stdin on a remote context before tmuxCommand( composes anything'],
  ['Y11', 'build/p318/SPEC.md §6.1, §6.5', 'THE DOOR NAMES NOTHING OF THE WRITER: no file under src/main/pocket imports src/main/reply'],
  ['Y12', 'build/p318/SPEC.md §3 row 20; build/p337/SPEC.md §6.1', 'G1 OVER THE REPLY AND THE SCREEN: no log argument in src/main/reply, src/main/screen or remote-screen.ts names a message, a screen, a mark, a marker or any of G1’s words'],
  ['Y13', 'build/p318/SPEC.md D6, D7, §5.3, §Revision R2, R16; build/p337/SPEC.md D21', 'WHO MOVES THE QUESTION ID: replyTurns.hook( twice in core.ts (onEvent, onSessionEnd), replyTurns.bump( in core.ts with desk, choice-${kind} and status (the last guarded by !== needs_input), writer.ts’s phone bump twice, src/main/screen/keys.ts’s phone bump once, and nowhere else; the prefix randomBytes(8) once; the id composed as a string'],
  ['Y14', 'build/p318/SPEC.md D13, D18, §5.4.2, §5.2', 'THE READER READS ONE WAY: reader.ts calls detectDialogRows( and choiceMarkOf( and none of detectDialog(, detectShapes(, noteForeground(, foregroundToRead(, agentHoldsTerminal(; routes.ts composes reply field by field, in one place, with a fresh pressable array'],
  ['Y15', 'build/p318/SPEC.md D15, §5.5', 'NOTHING STRIPS A MESSAGE: text-rules.ts and writer.ts call no .replace(, .trim, .normalize( or .slice( on the text; REPLY_TEXT_MAX_BYTES is declared once'],
  ['Y16', 'build/p318/SPEC.md §5.2', 'THE OPTIONAL FIELDS: PocketFacts.replyOffer and PocketSessionDetail.reply are optional; POCKET_NO_REPLY is frozen, its pressable a frozen empty array'],
  ['Y17', 'build/p318/SPEC.md D23, §Revision R14', 'PANE REPORTS MOVE NOTHING: attach-host.ts calls onInput?.( once, after client.pty.write(, under req.machine === undefined and !isPaneReport( of the same chunk; isPaneReport, isFocusReport, isColorReport and isDeviceReport are declared once each, in src/shared/pane-report.ts'],
  ['Y18', 'build/p318/SPEC.md D14, §Revision R15; his ruling of 2026-10-02', 'ONLY WHEN IDLE AT ITS PROMPT: no working or busy literal in gate.ts, reader.ts or writer.ts, and the reply compares the native reading’s .state with idle'],
  // PHASE 316.7, the phone's Sessions tab (build/p3167/SPEC.md §8.1): one
  // read, composed in main for the words the phone asks with, and bounded.
  ['O2a', 'build/p3167/SPEC.md §6.2 step 3, D1', 'THE SESSIONS ANSWER IS MAIN’S AND SYNCHRONOUS: createPocketRoutes’s sessions member is not async, and neither it nor any routes.ts function it reaches holds an await'],
  ['O2b', 'build/p3167/SPEC.md §6.2 step 3.2', 'sessions reads facts.sessions() exactly ONCE, so every row, group, count and total is cut from one list'],
  ['O2c', 'build/p3167/SPEC.md D4, D5', 'POCKET_SESSIONS_MAX, POCKET_SESSIONS_BUDGET_BYTES, POCKET_SESSIONS_CLIP_CHARS and POCKET_SESSIONS_CHOICES_MAX are imported from the contract, each read ONCE in routes.ts, and none is re-spelled as a number'],
  ['O2d', 'build/p3167/SPEC.md D5', 'ONE clipSessionText, reading the clip once and comparing a unit with 0xD800 and 0xDBFF, clips a row’s name and machine, a group’s label, folder and machine, and every agent and machine choice’s label'],
  ['O2e', 'build/p3167/SPEC.md §6.2 step 9', 'the answer’s omitted is the kept count minus the rows the answer carries'],
  ['O2f', 'build/p3167/SPEC.md §6.2 step 9, §15 F16', 'a row’s group is the length of groups read where its group is pushed, never a count of rows'],
  ['O2g', 'build/p3167/SPEC.md D3, §6.2 step 3', 'readSessionsQuery compares the words with the contract’s three lists, reads an id one character at a time through isSessionsId, and holds no regular expression literal and no RegExp, test, match or exec call'],
  ['O2h', 'build/p3167/SPEC.md D8, §6.2 step 3.3', 'Show is lifecycleKeeps( over sessionActionGates( with DOOR_GATE_ENV, both imported from @shared/, and the only status literal the answer names is needs_input'],
  ['O2i', 'build/p3167/SPEC.md D6, D7', 'the groups come from collectSessionGroups( (or sessionGroupIdentity(), sessionGroupLabel( and compareSessionGroups( imported from @shared/session-list, and routes.ts builds no key from targetKey('],
  ['O2j', 'build/p3167/SPEC.md D11', 'a creation age is drawn through createdOld( from @shared/age around formatAge(, every formatAge( of a createdAt is inside one, and formatAge is the only formatter'],
  ['O2k', 'build/p3167/SPEC.md §6.2 step 9, §15 F2, F4', 'THE CUT CHOOSES BY PRIORITY AND EMITS IN DISPLAY ORDER: the loop that measures the bytes walks an order built from attentionRows( and othersOrder( that reads neither the sort nor the group word, the loop that fills rows walks an order that does, and a group’s omitted is its kept rows minus its chosen rows'],
  ['O2l', 'build/p3167/SPEC.md D11, §15 F1', 'NO CLOCK DRAWN AS ANOTHER: no age is composed from the since of an attentionRows( row, and a waiting row’s age reads the stamp map facts.blockedSince() answered'],
  ['O2m', 'build/p3167/SPEC.md §6.2 step 5, §15 F8, F9', 'ONE isSessionsId, called by the query reader AND by the agent choices, and the machine filter and choices read the group identity’s target.machineId, never a session’s .machine'],
  ['O3', 'build/p3167/SPEC.md §6.2 step 3, §8.1', 'THE SESSIONS ANSWER READS NO CONVERSATION: it names none of facts.refresh, catchUp, lastTurn or turns, and routes.ts imports nothing from ../overview/ but MAX_TURN_LIMIT'],
  ['D10', 'build/p3321/SPEC.md §5.3, §5.4, §8.1', 'THE PROGRESS DECIDES NOTHING AND CARRIES NOTHING: PocketNameAnswer is exactly record, negative and unreadable; PocketNameProgress is exactly answers, asking, elapsedMs and nextInMs and no string; PocketStatus.nameProgress is PocketNameProgress | null; in ipc.ts the run’s startedAt, nextAt, endedAt and answers, and this.nameShown, are read inside nameProgressNow alone and written only in beginNameCheck, stopNameCheck, armNameRound and settleNameRound; nameProgressNow is called once, in status(), as nameProgress: this.nameProgressNow(); and PhoneSection.tsx’s pairingStage, pairAfterAllowNext and every live onPair name no nameProgress'],
  // PHASE 337, the Screen (build/p337/SPEC.md §6.1): a read that holds a
  // request, and a write that types every key.
  ['Z1', 'build/p337/SPEC.md D1, §5.1', 'THE TWO ROWS: screen a signed GET read and keys a signed POST write, neither window-only, exactly one row each; SIGNED_ROUTES and WRITE_ROUTES in door/wire.ts each gain exactly that id'],
  ['Z2', 'build/p337/SPEC.md D17, §14 M15', 'THE KEYS CAP: POCKET_WRITE_BODY_CAPS is exactly end 512, choose 512, say 32,768 and keys 16,384 (Y1 widened), and keys is at least twice the worst legal-shape keys body THIS GATE composes, so a C0 text is answered in words rather than dropped'],
  ['Z3', 'build/p337/SPEC.md D17, §5.5, §Attack A1', 'THE KEYS PARSE: parseKeysBody compares the keys with dialog,keys,session,turn,write; holds 1 to POCKET_KEYS_MAX_ITEMS items, each exactly one own key t or k; compares a name with === against POCKET_SCREEN_KEY_NAMES; takes a named key other than BSpace only as the one item; reads turn by isQuestionId and dialog as null or isMark; and trims, normalises and replaces nothing'],
  ['Z4', 'build/p337/SPEC.md §5.4, D19, D21', 'THE KEYS VERB’S ORDER: the text rule, the gate, ONE awaited readFresh(, then the final check’s still(, bump(, onLastCheck?.( and the act, with nothing awaited from still( to the act, and the act’s lines written in ONE statement over the control client'],
  ['Z5', 'build/p337/SPEC.md D16, D21, D22', 'THE ONE REFUSAL: asking is the status needs_input OR detectDialogRows( .atChoice in one function the verb asks; while asking, or when the body’s dialog is not null, the verb compares the turn with turns.current( and the dialog with the fresh one and refuses changed with SCREEN_QUESTION_MOVED; hashScreen(readBackWindowOf( is spelled once, in windowMarkOf, which the verb calls'],
  ['Z6', 'build/p337/SPEC.md D18, D19, D20', 'THE ACT’S ARGV: locally only copy-mode -q -t <pane>, send-keys -t <pane> -H <hex> and send-keys -t <pane> <name>; never -l; never send-keys without -t; hex as two lowercase digits; on another machine only typePhoneKeys(, handed in by capabilities.ts as typeRemote'],
  ['Z7', 'build/p337/SPEC.md D18, D41', 'NO TEXT IN AN ARGV, NO .message, NO LOG: a text item reaches tmux only as its bytes; nothing in src/main/screen or remote-screen.ts reads an error’s .message or logs'],
  ['Z8', 'build/p337/SPEC.md D23; CLAUDE.md refusal 5', 'ONE STATUS CALL: noteUserInput( exactly once in src/main/screen, in keys.ts, after the act and after the final check; no other status setter named there, and needs_input never written'],
  ['Z9', 'build/p337/SPEC.md D5, D6, D7, §5.3.3', 'THE READS: read.ts sends only display-message -p -t <x> SCREEN_FORMAT and capture-pane -p -e -t <x>; remote-screen.ts makes ONE execOn( of exactly capture-pane -p -e -t <x> ; display-message -p -t <x> SCREEN_FORMAT; SCREEN_FORMAT declared once and equal to the spec’s; nothing this phase adds names refresh-client, resize-window, resize-pane, attach-session, new-session, switch-client, -x or -y'],
  ['Z10', 'build/p337/SPEC.md D3, §Attack A7', 'THE HOLD: SCREEN_HOLD_MS + SCREEN_TICK_MS <= ANSWER_TIMEOUT_MS - 2,000, 2 * SCREEN_TICK_MS < DOOR_STOP_JOIN_MS and the local read deadline <= the remote one, as arithmetic over the declared constants; every read raced against its deadline; a poll answered from its own timer, whose callback asks closing( and awaits nothing'],
  ['Z11', 'build/p337/SPEC.md D13, D15', 'THE ANSWER FIELD BY FIELD: routes.ts’s screenOf composes the screen answer with no spread, no clone and fresh arrays; the five caps imported from the contract, each read once, and equal to the spec’s; why exactly ended, unreachable or large'],
  ['Z12', 'build/p337/SPEC.md §5.3.4, §Attack A16', 'THE COMPOSER IS PURE: sgr, cells, cell-widths, palette and compose import no fs, child_process, tmux, settings, config or registry and read no clock; compose.ts imports nothing outside src/main/screen and src/shared but ../activity/screen and ../reply/reader; windowMarkOf declared once, in compose.ts, the one readBackWindowOf( in src/main/screen; the width table and the palette are frozen literals'],
  ['Z13', 'build/p337/SPEC.md D3, §5.3.1', 'CLOSING HANDED TO THE READ: server.ts calls deps.answer( once, with refusal 1’s own closing, deps.shuttingDown() || door.stopping(), as its third argument'],
  ['Z14', 'build/p337/SPEC.md D32; conformance:manager T23', 'THE SCREEN ROW: /v1/session’s screen is set in ONE place, facts.screen !== undefined && screenLive(session); screenLive is declared once, in routes.ts, and answers sessionActionGates(…).live, the one live partition, naming no status; and the watcher asks screenLive( and names no status list'],
  ['Z15', 'build/p337/SPEC.md D35', 'THE WORDS AT ALLOW: WRITE_CLAUSES.keys is type into any session as you would at this Mac, and POCKET_DOOR_HONESTY names the screen and typing and no longer says the phone can change nothing else'],
  ['Z16', 'build/p337/SPEC.md §5.3.2, D15', 'ONE WATCHER A SESSION: entries in one Map, an entry dropped when its last poll is answered, and the duty cycle Math.max( over the tick and four times the last compose'],
  ['Z17', 'build/p337/SPEC.md D8, §14 M3', 'A BLOCK ENDS ONLY ON ITS OWN GUARD: TmuxControlClient.handleLine closes an open block on an end or command-error only when its commandNumber and timestamp equal the ones the block recorded at its begin'],
  ['Z18', 'build/p337/SPEC.md D24, §5.2', 'THE CAPS ON KEYS: the ledger caps 2,048 and 8,192, and POCKET_KEYS_MAX_ITEMS (64) and POCKET_KEYS_MAX_TEXT_BYTES (1,024) declared once, in the contract, and imported where the parse and the verb read them'],
  ['Z19', 'build/p337/SPEC.md D40, §Attack A13', 'THE NONCE MEMORY: POCKET_NONCE_MEMORY is 4,096 and at least (2 * POCKET_CLOCK_SKEW_MS / 1000) * (1000 / SCREEN_MIN_ANSWER_GAP_MS + 20), as arithmetic over the declared constants; SCREEN_MIN_ANSWER_GAP_MS is 250 and measured against a poll’s arrival'],
  ['Z20', 'build/p337/SPEC.md D42, §Attack A1', 'THE GAP: SCREEN_KEYS_GAP_MS is 50, declared once, in keys.ts; the verb awaits its remainder ONCE, after the gate and before its one readFresh(; and the last-act time is written after the act'],
  ['Z21', 'build/p337/SPEC.md D3, D4, D5, §Attack A6, A7, A8', 'THE SETTLE AND THE SLOT: nudge(sessionId, before) takes the act’s window mark; a settling session is answered by a read whose windowMarkOf( differs or that starts SCREEN_SETTLE_MS (300, longer than SCREEN_NUDGE_MS) after the nudge; one read in flight per session, its slot given back in a finally; the local down path ONE spawned list per read'],
  ['Z22', 'build/p337/SPEC.md D43, §Attack A11', 'THE LOG LINE, BOUNDED: writes.ts holds one log call; a keys write answered done reaches it only through the KEYS_LOG_QUIET_MS (60,000) condition, and every other verb and outcome reaches it unconditionally'],
  // PHASE 337.1, terminal first (build/p3371/SPEC.md §6.1): the Screen scrolls
  // back through one more signed read, and two of 337's rules that only a
  // vitest held (D5's pane clause, the remote cadence) get a gate.
  ['Z23', 'build/p3371/SPEC.md D5, D36, §5.4', 'THE TWO DISPLAYS AND THE PANE: agree is declared once, exported from read.ts, and compares exactly paneId, cols, rows, alternate and history with ===; it is the one comparison readScreenLocal, splitRemoteRead and scrollback.ts call, and no second spelling of it exists; readScreenLocal calls its attempt exactly twice, serves the second attempt when the first did not agree, framed by its second display, with steady never a literal true; and keys.ts aims every -t at the fresh reading’s display.paneId and at no pane named anywhere else'],
  ['Z24', 'build/p3371/SPEC.md D36, §5.4, §Attack B22', 'THE CADENCE: SCREEN_TICK_MS is 100, SCREEN_TICK_REMOTE_MS 400 and at least four times it; tickOf is declared once and answers SCREEN_TICK_REMOTE_MS for a row with a machine or a core whose control client is not connected, SCREEN_TICK_MS otherwise; outside tickOf no read is scheduled at either tick but through tickOf(, and SCREEN_TICK_MS is otherwise only a poll’s own interval; no numeric literal schedules a read; and the ONE other delay a read is scheduled at is SCREEN_NUDGE_MS, behind the settle (settles.has( or a settles.get( guard) or in nudge( alone'],
  ['Z25', 'build/p3371/SPEC.md D7, D8, §5.3.1', 'THE PAGE ROUTE: readScrollbackQuery takes exactly id, from, count, depth, wrap and keep, each once, refuses with the six words, reads every number by a character walk with no pattern and in D7’s bounds read from the contract’s constants, holds from + count <= depth, and compares keep with ===; the route answers a refusal, an unknown id, an absent facts.scrollback, a rejection and a session removed while read as null; and scrollbackOf composes field by field with fresh arrays, why one of four words with main’s own sentence, and holds from + rows <= depth, cells <= wrap, the page’s own styles, a 12-hex space, the row cap and the byte cap'],
  ['Z26', 'build/p3371/SPEC.md D9, D10, D14, §5.3.5, §Attack B1, B2, B3, B10', 'THE PAGE READ: scrollback.ts’s constants (overscan 128, 3 attempts, floors 250 and SCREEN_TICK_REMOTE_MS, queue 4); its order (the row by screenLive(; the turn, a queue bounded by SCROLLBACK_QUEUE_MAX answering busy past it, the floor Math.max( of the session’s floor and SCREEN_DUTY_FACTOR times the last compose, the wait asking closing( on a SCREEN_TICK_MS timer; then per attempt closing( first, ONE three-line statement with no display-only round, the agreement through read.ts’s agree(, the refusals, the cover, compose); attempt 1’s h0 the ask’s depth and later ones the previous display’s history; a = from − SCROLLBACK_OVERSCAN − h0 with no Math.max( around from − SCROLLBACK_OVERSCAN, the first index Math.max(0, a + h1); at most SCROLLBACK_ATTEMPTS; and every exec raced against closing( on a timer as well as its deadline; and (the fix round) the page composed through composePageSteps a step at a time, never composePage whole, the event loop handed back once the steps have held it PAGE_SLICE_MS (at most 8 ms) with closing( asked after each hand-back'],
  ['Z27', 'build/p3371/SPEC.md D11, §5.3.4, §Attack B10', 'THE PAGE’S ROWS: composePage is declared once, in compose.ts, reads the WHOLE capture’s pens before it cuts and builds runs only for the kept rows, keeps keep’s end past a cap, and builds the page’s own style table; the page answer’s space comes from spaceOf( over the agreed display, and its rows are bounded by from + rows <= depth; and (the fix round) composePage drives the one generator composePageSteps, which stops inside its reading of the pens and inside its building of the runs, PAGE_STEP_ROWS (at most 16) rows a stop'],
  ['Z28', 'build/p3371/SPEC.md D3, D4, §5.3.4, §Attack B8, B16', 'THE LIVE DEPTH AND SPACE: SCREEN_FORMAT is declared once with #{history_size} its eighth and last field, read as WHOLE9, at most nine digits; composeScreen sets depth and space together, from the display only when the reading is steady, not the alternate screen and the history at most POCKET_SCROLLBACK_MAX_INDEX, and both null otherwise; spaceOf is declared once, in compose.ts, and imports nothing of watch.ts'],
  ['Z29', 'build/p3371/SPEC.md D12, §Attack B1', 'MOVED, AND NOTHING SENT: moved is answered for exactly D12’s conditions over each attempt’s AGREED frame (the alternate screen, cols !== wrap, h1 < depth, h1 below the previous attempt’s display, from >= h1), each BEFORE anything is composed, and the capture of a refused attempt reaches no answer, no log and no store'],
  ['Z30', 'build/p3371/SPEC.md D35', 'THE HONESTY SENTENCE names what a session’s terminal shows AND what it printed before, still typing and ending, and never says the phone can change nothing else; the Allow line’s route list is still derived from the table'],
  // PHASE 333.1, a stranger's first run (build/p3331/SPEC.md §6.1): a return
  // to the window reads Tailscale with no press, three setup presses open a
  // page, an app or the clipboard, and the sheet draws three steps.
  ['SU1', 'build/p3331/SPEC.md D7 to D9, §5.2.3; r2 §Attack F18 to F20', 'THE RETURN: rechecks(held) is ONE method holding every clause of D7 in order, (a) the switch as the person last left it (readStore()?.enabled !== true || this.switchedOffThisRun), (b) published, (c) opening !== held, (d) funnel not idle, (e) a restart armed, (f) the quit, (i) returnForked, (g) a read word of RETURN_READ_WORDS (exactly no-tailscale, not-running, signed-out) or not-approved on the start’s arm, (h) confirmed or pressedOnThisRun; status() answers rechecks: this.rechecks(), and recheck alone asks it again; recheck counts no press, asks rechecks() and returnMayRun before opening += 1, runs its job inside serially with if (!this.rechecks(1)) return; right after the superseded check and returnMayRun again before anything runs, opens only through openNow(…, { returned: true }) on confirmed fields and readOnReturn under pressedOnThisRun otherwise; readOnReturn returns on its read’s own last-press check (this.superseded(press), the statement right after the read) before it writes anything, writes a port only from 0 and keeps every refusal in readRefusal; openNow stops a return after not-approved while approval is asked, and sets returnForked once, before the fork and never as the statement before it; switchedOffThisRun and pressedOnThisRun move only with the switch, the off after let saved = true;'],
  ['SU2', 'build/p3331/SPEC.md D10, D16', 'NO TIMER AND NO READ AT OPEN: the sheet’s surface calls recheck( exactly twice, once in an onWindowLooked( callback and once under document.hasFocus(), in ONE effect that hands back the unsubscribe; onWindowLooked is imported from machines/remote-writes and is the only listener (no focus or visibilitychange listener of the surface’s own); no setInterval, setTimeout or requestAnimationFrame callback names it; rechecks()’s first statement asks the switch and recheck’s first statement asks rechecks()'],
  ['SU3', 'build/p3331/SPEC.md D11 to D13, §5.2.3; r2 §Attack F23', 'THE SETUP PRESSES: POCKET_SETUP_ACTIONS is exactly get-tailscale, open-tailscale and copy-admin-link; setupAction’s first statement after the parse returns false under isHarnessLaunch(process.env); each act once, after setupActionsNow(, the page TAILSCALE_DOWNLOAD_PAGE, the app TAILSCALE_APP_BUNDLE and the held link after approvalOpens(, written as funnel.ts’s one approvalCopyText( spells it (null unless approvalOpens(, else new URL(…).href beginning https://login.tailscale.com/, never the printed text; the 333.1 reverify); the press’s word reaches no act; shell.openExternal only in openApproval and electronSetupSeam, shell.openPath and clipboard only in electronSetupSeam, each read inside an arrow’s body; open-tailscale listed only for a pinned, non-override program at TAILSCALE_APP_PROGRAM; PocketHostDeps.setup handed by tests alone'],
  ['SU4', 'build/p3331/SPEC.md D2, D3', 'THE STAT: status() calls this.funnel.resolve() exactly once, reaches the program only through funnelProgramOf( and hands the same resolution to setupActionsNow(, and names no readTailnet(, readServe(, exec, spawn or sweepFunnelOrphan(; tailscale is this.tailscaleNow( called once, in status(), and its body names no tailnetFacts, readStore(, facts( or fields('],
  ['SU5', 'build/p3331/SPEC.md D4, D30', 'DRAWN AND NEVER HASHED: no account in PocketExecutionFields, NORMALIZE, PocketStore, facts.ts, routes.ts, door/**, any contract type but PocketStatus, or any log call’s arguments in the domain; POCKET_EXECUTION_HASH_ALGORITHM is sha256-pocket-exec-v3 and POCKET_ROUTE_IDS the eleven routes it was'],
  ['SU6', 'build/p3331/SPEC.md D18; his ruling 2, “Keep today’s block”', 'THE CONFIRM UNCHANGED: the one element carrying data-phone-confirm holds the confirmLines, POCKET_CONFIRM_WARNING, POCKET_DOOR_HONESTY, POCKET_FUNNEL_RIGHT_WARNING under funnel.asksApproval and confirm-door, and none of it sits inside a <details>; confirmDoor hands linesRead: current.confirmLines and hashRead: current.confirmHash, unsliced and unmapped'],
  ['SU7', 'build/p3331/SPEC.md D17; r2 §Attack F11, F27', 'THE CODE ASKED FOR: setPairAfterAllow(\'pressed\') is called exactly twice outside onPair, in the live onSetDoor and the live onRetryDoor, each under a condition holding status !== null && status.phones.length === 0; pairAfterAllowNext reads .rechecks and names no nameProgress and no nameCheck'],
  ['SU8', 'build/p3331/SPEC.md D6; §Attack F9', 'THE ADMIN LINK: adminLink is assigned a URL exactly once, in the start’s not-approved arm, under approvalOpens(; no adminText exists; status() names no adminLink, which is read in setupActionsNow and in setupAction’s copy-admin-link arm alone; it is never cleared in readOnReturn or recheck, and sweepAndRead clears it only under !read.asksApproval; approvalText is composed from this.approvalUrl as today'],
  ['SU9', 'build/p3331/SPEC.md D29; research 140 §10; his answer (3)', 'THE WORDS: no string literal, template text or JSX text in PhoneSection.tsx, phone/** or src/shared/ipc/pocket.ts, nor PUSH_PUBLISHER_ONLY’s value, says beta, TestFlight, remote desktop, mirror, stream or SSH, word-bounded and case-insensitive; comments are not read']
];

if (process.argv.includes('--list')) {
  for (const [id, owner, title] of RULES) {
    process.stdout.write(`${id.padEnd(5)} ${owner.padEnd(34)} ${title}\n`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The domain, read
// ---------------------------------------------------------------------------

const DOMAIN = join(ROOT, 'src', 'main', 'pocket');
const rel = (path) => relative(ROOT, path);

const failures = new Map(RULES.map(([id]) => [id, []]));
const checks = new Map(RULES.map(([id]) => [id, 0]));
const fail = (id, text) => failures.get(id).push(text);
const checked = (id, n = 1) => checks.set(id, checks.get(id) + n);

/** Every .ts under a directory, tests excluded. */
function sourcesUnder(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name !== '__tests__') walk(path);
        continue;
      }
      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
    }
  };
  walk(dir);
  return out.sort();
}

const parsed = new Map();
function astOf(path) {
  let sf = parsed.get(path);
  if (sf === undefined) {
    sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(path, sf);
  }
  return sf;
}

function nodesOf(path) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(astOf(path));
  return out;
}

function where(path, node) {
  const sf = astOf(path);
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${rel(path)}:${String(line + 1)}`;
}

/** The name a call is made BY: `foo(` and `a.b.foo(` both answer `foo`. */
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/** Every call expression in a file. */
function callsOf(path) {
  return nodesOf(path).filter((n) => ts.isCallExpression(n));
}

/**
 * Every string a file holds AS CODE — literals and template pieces — with
 * comments deliberately excluded, because a rule a comment can satisfy is not a
 * rule and a rule a comment can BREAK is worse: this domain's modules explain
 * their own refusals by quoting the thing they refuse.
 */
function codeStringsOf(path) {
  return nodesOf(path)
    .filter(
      (n) =>
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)
    )
    .map((n) => ({ node: n, text: n.text }));
}

/** The source with every comment blanked, for the rules that read text. */
function codeTextOf(path) {
  const text = readFileSync(path, 'utf8');
  const sf = astOf(path);
  const spans = [];
  const collect = (node) => {
    const full = node.getFullStart();
    const start = node.getStart(sf);
    if (full < start) {
      for (const r of ts.getLeadingCommentRanges(text, full) ?? []) spans.push(r);
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);
  const chars = [...text];
  for (const span of spans) {
    for (let i = span.pos; i < span.end && i < chars.length; i += 1) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  }
  return chars.join('');
}

const domainFiles = sourcesUnder(DOMAIN);

/** A module this gate needs, or null with the rule failed by name. */
function moduleNamed(basename, ruleId, whoOwnsIt) {
  const direct = join(DOMAIN, `${basename}.ts`);
  if (existsSync(direct)) return direct;
  const found = domainFiles.find((f) => f.endsWith(`/${basename}.ts`));
  if (found !== undefined) return found;
  fail(
    ruleId,
    `src/main/pocket/${basename}.ts does not exist, so this rule read nothing. ` +
      `It is ${whoOwnsIt}. A gate that passed here would go green on the day the door does not exist.`
  );
  return null;
}

// ---------------------------------------------------------------------------
// L — the bind (Phase 330: the one listen is the door process's own)
// ---------------------------------------------------------------------------

/** Every `listen(` call in the domain, wherever it is. */
function listenCalls() {
  const out = [];
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      if (calleeName(call) === 'listen') out.push({ file, call });
    }
  }
  return out;
}

function bindRules() {
  if (domainFiles.length === 0) {
    for (const id of ['L1', 'L2', 'L4']) {
      fail(id, 'src/main/pocket/ holds no source file at all');
    }
    return;
  }
  const listener = moduleNamed('listener', 'L1', "Phase 330 builder door's (src/main/pocket/door/listener.ts)");

  // L1. One listen, and it is the door process's.
  const listens = listenCalls();
  checked('L1', listens.length + 1);
  if (listens.length === 0) {
    fail('L1', 'the domain holds NO listen call, so there is no door and nothing to hold to one');
  } else if (listens.length > 1) {
    fail(
      'L1',
      `the domain holds ${String(listens.length)} listen calls: ${listens.map((l) => where(l.file, l.call)).join(', ')}. ` +
        'One door means one listener, and a second one is a second address, a second port and a second set of refusals.'
    );
  } else if (listener !== null && listens[0].file !== listener) {
    fail(
      'L1',
      `the one listen is at ${where(listens[0].file, listens[0].call)}, not in ${rel(listener)}. ` +
        'The door process is the only thing that may listen: a listener in main would parse a stranger’s bytes in the process that writes his credentials (research 132 §7.1).'
    );
  }

  // L2. The wildcard, by name, and the one host, by literal.
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('L2');
      if (text === '0.0.0.0' || text === '::' || text.includes('0.0.0.0')) {
        fail(
          'L2',
          `${where(file, node)} names ${JSON.stringify(text)} as a VALUE. The door binds 127.0.0.1 and never a wildcard.`
        );
      }
    }
  }
  for (const { file, call } of listens) {
    checked('L2', 2);
    const host = call.arguments[1];
    if (host === undefined || ts.isFunctionLike(host)) {
      fail(
        'L2',
        `${where(file, call)} calls listen with no host argument, which binds EVERY interface. That is 0.0.0.0 spelled by omission.`
      );
    } else if (!ts.isStringLiteral(host) || host.text !== '127.0.0.1') {
      fail(
        'L2',
        `${where(file, call)} binds ${JSON.stringify(host.getText(astOf(file)))}. The door binds the LITERAL 127.0.0.1: the macOS Tailscale variants forward only to loopback (research 132 §3.8), and a host that is computed is a host nobody can read here.`
      );
    }
  }

  // L4. The local port is ephemeral, and the public port refuses rather than moves.
  for (const { file, call } of listens) {
    checked('L4');
    const port = call.arguments[0];
    if (port === undefined || !ts.isNumericLiteral(port) || port.text !== '0') {
      fail(
        'L4',
        `${where(file, call)} listens on ${JSON.stringify(port === undefined ? '(nothing)' : port.getText(astOf(file)))}, not 0. ` +
          'The local port is ephemeral: the phone is told the PUBLIC port Funnel serves, and only the Funnel child is told this one, so a chosen local port is a setting nothing needs and something could squat.'
      );
    }
  }
  const funnel = moduleNamed('funnel', 'L4', "Phase 330 builder owner's");
  if (funnel !== null) {
    checked('L4', 2);
    if (!codeStringsOf(funnel).some(({ text }) => text === 'port-taken')) {
      fail('L4', `${rel(funnel)} names no port-taken refusal, so a confirmed public port that is taken has no answer of its own and could move under a phone that was told it.`);
    }
    for (const node of nodesOf(funnel)) {
      if (ts.isNumericLiteral(node) && Number(node.text.replace(/_/g, '')) === 443) {
        fail('L4', `${where(funnel, node)}: the literal 443. Port 443 is his (research 132 §9 condition 6): the door takes 8443, then 10000.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// L3 — the Funnel target is loopback and the listener's own port
// ---------------------------------------------------------------------------

/** The name of the identifier or property a node reads, or null. */
function readsName(node) {
  if (node === undefined) return null;
  let n = node;
  while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n)) n = n.expression;
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n)) return n.name.text;
  if (ts.isCallExpression(n) && calleeName(n) === 'String' && n.arguments.length === 1) return readsName(n.arguments[0]);
  return null;
}

function funnelTargetRule() {
  const funnel = moduleNamed('funnel', 'L3', "Phase 330 builder owner's");
  if (funnel === null) return;
  // Every spelling of a `tcp://` target, in the whole domain.
  const sites = [];
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      const text = ts.isTemplateExpression(node)
        ? node.head.text
        : ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
          ? node.text
          : null;
      if (text !== null && text.startsWith('tcp://')) sites.push({ file, node });
    }
  }
  checked('L3', sites.length + 1);
  if (sites.length !== 1 || sites[0].file !== funnel) {
    fail('L3', `the Funnel target is spelled at ${sites.map((x) => where(x.file, x.node)).join(', ') || 'no site at all'}. It is spelled ONCE, in ${rel(funnel)}, so what the child forwards to has one answer.`);
    return;
  }
  const site = sites[0].node;
  checked('L3');
  if (!ts.isTemplateExpression(site) || site.templateSpans.length !== 1 || site.templateSpans[0].literal.text !== '') {
    fail('L3', `${where(funnel, site)}: the target is not one \`tcp://\${…}\` template with nothing after its one part, so what it names cannot be read here`);
    return;
  }
  // `tcp://127.0.0.1:${localPort}`, or `tcp://${target(localPort)}` whose
  // function answers `127.0.0.1:${localPort}`.
  const span = site.templateSpans[0].expression;
  let hostText = site.head.text.slice('tcp://'.length);
  let portRead = readsName(span);
  if (hostText === '' && ts.isCallExpression(span) && ts.isIdentifier(span.expression)) {
    const fn = functionsNamed(funnel, span.expression.text)[0];
    const param = fn?.parameters?.[0]?.name;
    const argument = readsName(span.arguments[0]);
    let answered = null;
    const walk = (n) => {
      if (answered !== null) return;
      if (ts.isReturnStatement(n) && n.expression !== undefined && ts.isTemplateExpression(n.expression)) answered = n.expression;
      ts.forEachChild(n, walk);
    };
    if (fn?.body !== undefined) walk(fn.body);
    if (
      answered !== null &&
      answered.templateSpans.length === 1 &&
      answered.templateSpans[0].literal.text === '' &&
      param !== undefined &&
      ts.isIdentifier(param) &&
      readsName(answered.templateSpans[0].expression) === param.text
    ) {
      hostText = answered.head.text;
      portRead = argument;
    } else {
      hostText = '(unreadable)';
    }
  }
  checked('L3', 2);
  if (hostText !== '127.0.0.1:') {
    fail('L3', `${where(funnel, site)}: the Funnel target's host is ${JSON.stringify(hostText)}, not the literal 127.0.0.1. The listener binds loopback alone, and a target anywhere else forwards the internet to something that is not the door.`);
  }
  if (portRead !== 'localPort') {
    fail('L3', `${where(funnel, site)}: the Funnel target's port reads ${JSON.stringify(portRead)}, not the listener's reported localPort.`);
  }
  // THE PORT IS THE LISTENER'S, NEVER A SETTING. Every `localPort` the host
  // hands on is read off the door, never off the store.
  const ipc = moduleNamed('ipc', 'L3', "Phase 330 builder owner's");
  if (ipc === null) return;
  let handed = 0;
  for (const node of nodesOf(ipc)) {
    if (!(ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node))) continue;
    if (memberName(node) !== 'localPort') continue;
    handed += 1;
    checked('L3');
    const value = ts.isShorthandPropertyAssignment(node) ? 'localPort' : codeOfNode(ipc, node.initializer);
    if (/store|Store|settings|Settings|fields|confirmed|record/.test(value)) {
      fail('L3', `${where(ipc, node)}: localPort is ${JSON.stringify(value)}. The port the child forwards to is the one the listener REPORTED, never a stored or confirmed field.`);
    }
  }
  checked('L3');
  if (handed === 0) {
    fail('L3', `${rel(ipc)} hands no localPort anywhere, so nothing here reads where the Funnel child's port comes from`);
  }
}

// ---------------------------------------------------------------------------
// R — the route table
// ---------------------------------------------------------------------------

/**
 * The `POCKET_ROUTES` initialiser, or null. Since Phase 330 the table lives in
 * `door/table.ts`, so the door process can refuse a path before main is told
 * anything; `routes.ts` re-exports it.
 */
function routeTable() {
  const routes = moduleNamed('table', 'R1', "Phase 330 builder door's (src/main/pocket/door/table.ts)");
  if (routes === null) return null;
  for (const node of nodesOf(routes)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
    return { file: routes, init: node.initializer ?? null };
  }
  fail(
    'R1',
    `${rel(routes)} declares no POCKET_ROUTES. The table is what makes the door closed, and a gate cannot read a table that has no name.`
  );
  return null;
}

function routeRules() {
  const table = routeTable();
  if (table === null) {
    fail('R2', 'there is no POCKET_ROUTES to read, so nothing proves the routes are reads');
    return;
  }
  const { file, init } = table;
  checked('R1');
  if (init === null) {
    fail('R1', `${rel(file)}'s POCKET_ROUTES has no initialiser`);
    return;
  }
  // Frozen. A closed table a later round can push onto is not closed.
  const frozen =
    ts.isCallExpression(init) &&
    calleeName(init) === 'freeze' &&
    ts.isPropertyAccessExpression(init.expression) &&
    ts.isIdentifier(init.expression.expression) &&
    init.expression.expression.text === 'Object';
  checked('R1');
  if (!frozen) {
    fail(
      'R1',
      `${where(file, init)}: POCKET_ROUTES is not Object.freeze(...). A table anything can push a route onto at run time is not a closed table, and "the route table is closed" is one of this phase's promises.`
    );
  }
  const array = frozen ? init.arguments[0] : init;
  checked('R1');
  if (array === undefined || !ts.isArrayLiteralExpression(array)) {
    fail('R1', `${where(file, init)}: POCKET_ROUTES is not an array literal, so its rows cannot be read here`);
    return;
  }

  const rows = [];
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      checked('R1');
      fail('R1', `${where(file, element)}: a row of POCKET_ROUTES is not an object literal`);
      continue;
    }
    const row = {};
    for (const prop of element.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
      row[prop.name.text] = prop.initializer;
    }
    rows.push({ node: element, row });
  }
  checked('R1');
  if (rows.length === 0) fail('R1', `${rel(file)}: POCKET_ROUTES is empty`);

  /** The rows that declare reads: false, with their literal ids (Phase 317). */
  const writeRows = [];
  for (const { node, row } of rows) {
    checked('R1', 2);
    const path = row['path'];
    if (path === undefined || !ts.isStringLiteral(path)) {
      fail(
        'R1',
        `${where(file, node)}: a row's path is not an exact string literal. A pattern, a template or a computed path is a table nothing can enumerate.`
      );
    } else if (path.text.includes('*') || path.text.includes(':') || path.text.includes('$')) {
      fail(
        'R1',
        `${where(file, node)}: the path ${JSON.stringify(path.text)} holds a wildcard or a parameter. The session id rides in the QUERY so the table stays a set of exact strings.`
      );
    }
    // R2. A ROW IS A READ OR A WRITE, AND THE TABLE SAYS WHICH IN ITS OWN
    // FIELDS (Phase 317 widened the promise from "zero write routes" to a
    // CLOSED write list). A read declares `reads: true` and is a GET, but for
    // the pairing route, which is the only row allowed to be unsigned or
    // window-only — which is what makes "/pair is dead outside its window" a
    // property of the table rather than of a branch somebody has to find. A
    // write declares `reads: false`, is a POST, is signed and is alive outside
    // any window; the set of them is checked below.
    checked('R2', 3);
    const method = row['method'];
    const reads = row['reads'];
    const signed = row['signed'];
    const windowOnly = row['windowOnly'];
    const isPair =
      path !== undefined && ts.isStringLiteral(path) && path.text === '/pair';
    const pathText = path === undefined || !ts.isStringLiteral(path) ? '?' : path.text;
    if (reads === undefined || (reads.kind !== ts.SyntaxKind.TrueKeyword && reads.kind !== ts.SyntaxKind.FalseKeyword)) {
      fail(
        'R2',
        `${where(file, node)}: the row does not declare reads as a literal true or false. A row that does not say whether it is a read or a write is one nobody can check.`
      );
    } else if (reads.kind === ts.SyntaxKind.FalseKeyword) {
      const id = row['id'];
      writeRows.push({ node, id: id !== undefined && ts.isStringLiteral(id) ? id.text : null });
      if (method === undefined || !ts.isStringLiteral(method) || method.text !== 'POST') {
        fail('R2', `${where(file, node)}: the write ${JSON.stringify(pathText)} is not a POST. A write is a signed POST with a body, and a GET that changes something is a write a link can trigger.`);
      }
      if (signed === undefined || signed.kind !== ts.SyntaxKind.TrueKeyword) {
        fail('R2', `${where(file, node)}: the write ${JSON.stringify(pathText)} is not signed: true. Every write is signed by an allowed phone, over its method, its path and its body.`);
      }
      if (windowOnly === undefined || windowOnly.kind !== ts.SyntaxKind.FalseKeyword) {
        fail('R2', `${where(file, node)}: the write ${JSON.stringify(pathText)} does not declare windowOnly: false. A write lives outside the pairing window, and the pairing window is the one place a write can never be.`);
      }
      if (isPair) fail('R2', `${where(file, node)}: the pairing route is declared a write`);
    } else {
      if (method === undefined || !ts.isStringLiteral(method)) {
        fail('R2', `${where(file, node)}: a row declares no method as a literal`);
      } else if (method.text !== 'GET' && !isPair) {
        fail(
          'R2',
          `${where(file, node)}: the method is ${JSON.stringify(method.text)} on ${JSON.stringify(pathText)}, which declares reads: true. ` +
            'A read is a GET; the only read that is not is the pairing route, and a POST that says it is a read is a write nobody counted.'
        );
      }
      if (isPair) {
        if (windowOnly === undefined || windowOnly.kind !== ts.SyntaxKind.TrueKeyword) {
          fail('R2', `${where(file, node)}: the pairing row is not windowOnly: true, so /pair is a route for the door's whole life`);
        }
        if (signed === undefined || signed.kind !== ts.SyntaxKind.FalseKeyword) {
          fail('R2', `${where(file, node)}: the pairing row does not declare signed: false, and a phone that has not paired has no key to sign with`);
        }
      } else {
        if (signed === undefined || signed.kind !== ts.SyntaxKind.TrueKeyword) {
          fail(
            'R2',
            `${where(file, node)}: ${JSON.stringify(pathText)} is not signed: true. Every route but the pairing one is signed, and there is no bearer to fall back on.`
          );
        }
        if (windowOnly !== undefined && windowOnly.kind === ts.SyntaxKind.TrueKeyword) {
          fail('R2', `${where(file, node)}: a read route is windowOnly, which would make the door answer nothing once the window shuts`);
        }
      }
    }
  }
  checked('R2');
  const pairRows = rows.filter(
    ({ row: r }) => r['path'] !== undefined && ts.isStringLiteral(r['path']) && r['path'].text === '/pair'
  );
  if (pairRows.length > 1) {
    fail('R2', `the table holds ${String(pairRows.length)} pairing rows; there is one window and one route into it`);
  }
  // THE WRITE LIST IS CLOSED: exactly end, choose, say and keys, in the table
  // and in the contract alike, each with its own body cap (Phase 317,
  // build/p317/SPEC.md §6.1, its fix round having taken `unpair` out; Phase
  // 318, build/p318/SPEC.md §6.1, adding the press and the message; Phase 337,
  // build/p337/SPEC.md D1, adding the keys on his ruling of 2026-10-05,
  // "Every key, including Ctrl-C"). Sorted, because both sides are compared
  // sorted.
  const WRITE_IDS = ['choose', 'end', 'keys', 'say'];
  const tableWrites = writeRows.map((w) => w.id ?? '(no literal id)').sort();
  checked('R2', 3);
  if (tableWrites.join(',') !== WRITE_IDS.join(',')) {
    fail('R2', `${rel(file)}: the table's writes are ${JSON.stringify(tableWrites)}; they are EXACTLY ${JSON.stringify(WRITE_IDS)}. A write added here is a change to what a phone can do to this Mac, and it is its own phase with its own ruling.`);
  }
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const contractWrites = (() => {
    if (!existsSync(contract)) return null;
    for (const n of nodesOf(contract)) {
      if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.name.text !== 'POCKET_WRITE_ROUTE_IDS') continue;
      let init = n.initializer;
      while (init !== undefined && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
      if (init === undefined || !ts.isArrayLiteralExpression(init)) return null;
      return init.elements.filter((e) => ts.isStringLiteral(e)).map((e) => e.text).sort();
    }
    return null;
  })();
  if (contractWrites === null || contractWrites.join(',') !== WRITE_IDS.join(',')) {
    fail('R2', `src/shared/ipc/pocket.ts: POCKET_WRITE_ROUTE_IDS is ${JSON.stringify(contractWrites)}; it is exactly ${JSON.stringify(WRITE_IDS)}, the table's own write list`);
  }
  const limits = join(DOMAIN, 'door', 'limits.ts');
  const caps = (() => {
    if (!existsSync(limits)) return null;
    for (const n of nodesOf(limits)) {
      if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.name.text !== 'POCKET_WRITE_BODY_CAPS') continue;
      let init = n.initializer;
      if (init !== undefined && ts.isCallExpression(init) && calleeName(init) === 'freeze') init = init.arguments[0];
      while (init !== undefined && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
      if (init === undefined || !ts.isObjectLiteralExpression(init)) return null;
      const out = {};
      for (const p of init.properties) {
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) out[p.name.text] = ts.isNumericLiteral(p.initializer) ? Number(p.initializer.text.replace(/_/g, '')) : null;
      }
      return out;
    }
    return null;
  })();
  if (caps === null) {
    fail('R2', `${rel(limits)}: no POCKET_WRITE_BODY_CAPS object literal, so no write has a body cap of its own`);
  } else {
    const keys = Object.keys(caps).sort();
    if (keys.join(',') !== WRITE_IDS.join(',')) fail('R2', `${rel(limits)}: POCKET_WRITE_BODY_CAPS caps ${JSON.stringify(keys)}; it caps exactly the writes, ${JSON.stringify(WRITE_IDS)}`);
    for (const k of keys) {
      if (!(typeof caps[k] === 'number' && caps[k] > 0)) fail('R2', `${rel(limits)}: POCKET_WRITE_BODY_CAPS.${k} is not a positive number literal`);
    }
  }

  // No pattern dispatch anywhere in the table's module, or in the module that
  // re-exports it and answers the routes: the lookup is an exact match.
  const reexport = join(DOMAIN, 'routes.ts');
  for (const module of [file, ...(existsSync(reexport) ? [reexport] : [])]) {
    const text = codeTextOf(module);
    for (const [needle, why] of [
      ['startsWith(', 'a prefix match admits every path under it'],
      ['RegExp(', 'a pattern is not a closed table'],
      ['.test(', 'a pattern is not a closed table'],
      ['default:', 'a default arm is the wildcard a closed table exists to refuse']
    ]) {
      checked('R1');
      if (text.includes(needle)) {
        fail('R1', `${rel(module)} holds ${JSON.stringify(needle)}: ${why}.`);
      }
    }
  }
  // And there is ONE table: routes.ts re-exports it and declares none of its own.
  checked('R1');
  if (existsSync(reexport) && reexport !== file && /\bPOCKET_ROUTES\s*[:=]/.test(codeTextOf(reexport))) {
    fail('R1', `${rel(reexport)} declares a POCKET_ROUTES of its own beside ${rel(file)}'s. Two tables agree until the day one grows a row.`);
  }
}

// ---------------------------------------------------------------------------
// R4 — the table's MEMBERSHIP, pinned
// ---------------------------------------------------------------------------

/**
 * The exact set of routes, by sha256 of its sorted `METHOD path` lines.
 *
 * WHY A PIN AND NOT ANOTHER SHAPE RULE. R1 pins the table's SHAPE — frozen,
 * exact strings, no wildcard — and R2 pins each row's FIELDS. Neither says
 * which paths exist, and the fix round measured what that costs: a fourth GET
 * added to the table under an existing route id left `conformance:pocket`,
 * `conformance:pocket:hostile` AND `gate:contract` all green, because
 * `pocketRouteIdsAgree()` compares only the id SET. "The route table is closed"
 * is a promise about WHICH PATHS EXIST, so the set of them is what has to be
 * pinned.
 *
 * Moving a route is then a two-line edit — the table and this constant — in one
 * commit, which is the point. `node build/conformance-pocket.mjs
 * --write-route-pin` rewrites the constant below on purpose, the way
 * `conformance:arch --write-skeleton-pin` regenerates its drafted bytes.
 *
 * PHASE 317 MOVED IT ON PURPOSE, from Phase 313's
 * `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080` to the
 * value below, by the one write row `POST /v1/end` (build/p317/SPEC.md
 * §5.3.1): five sorted lines, `--write-route-pin`'s method. (Its build had
 * pinned `e1f86589…` over six lines, `POST /v1/unpair` too, which its fix
 * round took out.)
 *
 * PHASE 318 MOVED IT ON PURPOSE, from Phase 317's
 * `d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6` (five
 * lines) to `0e8c9f46733b7fe7b706f071fa68bbedf135145757cef2e39d686feb9f5a7841`,
 * by its two write rows `POST /v1/choose` and `POST /v1/say`
 * (build/p318/SPEC.md D29): seven sorted lines, `--write-route-pin`'s method,
 * re-derived by the proof builder with `printf | shasum -a 256` over the seven
 * lines and equal to research 135 §4.1's.
 *
 * PHASE 316.7 MOVED IT ON PURPOSE AGAIN, landing second, from Phase 318's
 * `0e8c9f46733b7fe7b706f071fa68bbedf135145757cef2e39d686feb9f5a7841` (seven
 * lines) to the value below, by the one read row `GET /v1/sessions`
 * (build/p3167/SPEC.md §3 row 1, §8.1): eight sorted lines, written by
 * `--write-route-pin` and re-derived by `printf '<lines>' | shasum -a 256`,
 * both equal to `d95ecd27…`, the value 318's spec predicted. (316.7 alone, over
 * six lines, had pinned `a6c1bb3c…`.)
 *
 * PHASE 337 MOVED IT ON PURPOSE, from Phase 316.7's
 * `d95ecd272da5fbab8eadd9379ecce4eace9fd69c963be996aa6726ae7a22cf77` (eight
 * lines) to the value below, by its read row `GET /v1/screen` and its write row
 * `POST /v1/keys` (build/p337/SPEC.md D1, his ruling of 2026-10-05): ten sorted
 * lines, re-derived by the proof builder two ways, `printf '<ten lines>' |
 * shasum -a 256` and node's `createHash('sha256')` over the same ten lines
 * sorted, both `16115392…`, the value the spec's step measured (§14 M14).
 *
 * PHASE 337.1 MOVED IT ON PURPOSE, from Phase 337's
 * `16115392e007ad274fc815f4c8456624f58fd534558be4eaad7d154c59e9b061` (ten
 * lines) to the value below, by its one read row `GET /v1/scrollback`
 * (build/p3371/SPEC.md D1, his ruling "Yes, scroll back on the Screen"):
 * eleven sorted lines, re-derived by the gates builder two ways before the
 * table held the row, node's `createHash('sha256')` over the eleven lines
 * sorted and joined by a newline (`--write-route-pin`'s method), and
 * `printf '<eleven lines>' | LC_ALL=C sort | shasum -a 256` with the final
 * newline taken off, both `ea5930e0…`, the value the spec step measured (§14
 * M13) and the adversary re-derived (BM3).
 */
const ROUTE_PIN = 'ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14';

/** The `METHOD path` line of every row of POCKET_ROUTES, sorted. */
function routeLines(file) {
  const lines = [];
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
    let init = node.initializer ?? null;
    if (init !== null && ts.isCallExpression(init) && calleeName(init) === 'freeze') {
      init = init.arguments[0] ?? null;
    }
    if (init === null || !ts.isArrayLiteralExpression(init)) return null;
    for (const element of init.elements) {
      if (!ts.isObjectLiteralExpression(element)) return null;
      let method = null;
      let path = null;
      for (const prop of element.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
        if (prop.name.text === 'method' && ts.isStringLiteral(prop.initializer)) {
          method = prop.initializer.text;
        }
        if (prop.name.text === 'path' && ts.isStringLiteral(prop.initializer)) {
          path = prop.initializer.text;
        }
      }
      if (method === null || path === null) return null;
      lines.push(`${method} ${path}`);
    }
    return lines.sort();
  }
  return null;
}

function routeMembershipRule() {
  const routes = moduleNamed('table', 'R4', "Phase 330 builder door's (src/main/pocket/door/table.ts)");
  if (routes === null) return;
  const lines = routeLines(routes);
  checked('R4');
  if (lines === null) {
    fail('R4', `${rel(routes)}: POCKET_ROUTES could not be read as a list of literal method/path rows, so its membership cannot be pinned`);
    return;
  }
  checked('R4');
  if (lines.length === 0) {
    fail('R4', `${rel(routes)}: POCKET_ROUTES is empty`);
    return;
  }
  const got = createHash('sha256').update(lines.join('\n')).digest('hex');
  if (process.argv.includes('--write-route-pin')) {
    const self = fileURLToPath(import.meta.url);
    const text = readFileSync(self, 'utf8');
    writeFileSync(self, text.replace(`const ROUTE_PIN = '${ROUTE_PIN}'`, `const ROUTE_PIN = '${got}'`));
    process.stdout.write(`${TAG} route pin rewritten: ${got}\n  ${lines.join('\n  ')}\n`);
    process.exit(0);
  }
  checked('R4', lines.length);
  if (got !== ROUTE_PIN) {
    fail(
      'R4',
      `${rel(routes)}: the route table's membership moved. It now holds ${String(lines.length)} route(s):\n` +
        lines.map((l) => `      ${l}`).join('\n') +
        `\n    Its pin is ${got} and this gate holds ${ROUTE_PIN}. ` +
        'A route added, removed or re-pathed is a change to what the phone can ask for, and it is meant to be a visible edit to this gate in the same commit. ' +
        'If the move is deliberate: node build/conformance-pocket.mjs --write-route-pin'
    );
  }
}

// ---------------------------------------------------------------------------
// R5 — the turn limit is clamped at the door
// ---------------------------------------------------------------------------

/**
 * The one route that answers a person's own conversation caps what it asks for.
 *
 * MEASURED IN THE FIX ROUND, which is why this rule exists: the door computed
 * `Math.floor(asked)` for any finite positive number and handed it straight on —
 * `?limit=999999999` answered 999999999 — while the module's own comment said
 * "the store clamps it". The store does not. `listTurns` puts the number into a
 * SQL `LIMIT ?` unchanged and `MAX_TURN_LIMIT` is applied in
 * `src/main/overview/service.ts` and `timeline.ts`, neither of which this door
 * goes through. Nothing else in this phase's proof list would have caught it.
 */
function turnLimitRule() {
  const routes = moduleNamed('routes', 'R5', "Builder B's");
  if (routes === null) return;
  let imported = false;
  for (const node of nodesOf(routes)) {
    if (!ts.isImportDeclaration(node)) continue;
    if (!ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!/overview\/turn-view$/.test(node.moduleSpecifier.text)) continue;
    const clause = node.importClause?.namedBindings;
    if (clause === undefined || !ts.isNamedImports(clause)) continue;
    if (clause.elements.some((e) => e.name.text === 'MAX_TURN_LIMIT')) imported = true;
  }
  checked('R5');
  if (!imported) {
    fail(
      'R5',
      `${rel(routes)} does not import MAX_TURN_LIMIT from ../overview/turn-view. ` +
        'The ceiling belongs to the module that owns it; a second literal here is a second answer to the same question, and the one that drifts is the one on the network.'
    );
  }
  let clamped = 0;
  for (const call of callsOf(routes)) {
    if (calleeName(call) !== 'min') continue;
    const e = call.expression;
    if (!ts.isPropertyAccessExpression(e) || !ts.isIdentifier(e.expression) || e.expression.text !== 'Math') continue;
    if (call.arguments.some((a) => ts.isIdentifier(a) && a.text === 'MAX_TURN_LIMIT')) clamped += 1;
  }
  checked('R5');
  if (clamped === 0) {
    fail(
      'R5',
      `${rel(routes)} never calls Math.min(..., MAX_TURN_LIMIT). A limit taken from a query and passed on unclamped lets one request read a whole session into memory, ` +
        'and "one wide range cannot read a whole session into memory" is the protection this phase claims on the one route that answers a person’s own words.'
    );
  }
  // And the number is not re-spelled: no literal 200 in the module.
  checked('R5');
  for (const node of nodesOf(routes)) {
    if (!ts.isNumericLiteral(node)) continue;
    if (node.text !== '200') continue;
    fail('R5', `${where(routes, node)}: the literal 200 is the ceiling written a second time. Import MAX_TURN_LIMIT instead.`);
  }
}

// ---------------------------------------------------------------------------
// W1 — nothing this domain creates is wider than its owner
// ---------------------------------------------------------------------------

/**
 * Every write and every mkdir in the domain names a mode.
 *
 * THE ASYMMETRY IS THE DEFECT, not the bytes. `tls.ts` wrote its sealed
 * identity at `0o600` and `pairing.ts` wrote the sealed phone store beside it
 * with no mode at all — measured at `0o644` under the operator's umask, with
 * the directory at `0755`. Both payloads are safeStorage ciphertext behind the
 * login keychain's ACL, so under his own uid the mode changes nothing today;
 * what it changes is tomorrow, when one unexplained looser write in a domain is
 * the precedent the next write copies. Dropping `mode: 0o600` from `tls.ts` left
 * both gates green, which is the reason this rule is here rather than in a
 * comment.
 */
const MODE_CALLS = new Set(['writeFileSync', 'appendFileSync', 'mkdirSync', 'createWriteStream', 'openSync']);

function fileModeRule() {
  if (domainFiles.length === 0) {
    fail('W1', 'src/main/pocket/ holds no source file at all');
    return;
  }
  let seen = 0;
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !MODE_CALLS.has(name)) continue;
      seen += 1;
      checked('W1');
      const options = call.arguments.find((a) => ts.isObjectLiteralExpression(a));
      const mode =
        options === undefined
          ? undefined
          : options.properties.find(
              (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'mode'
            );
      if (mode === undefined) {
        fail(
          'W1',
          `${where(file, call)}: ${name}(...) names no mode. Every file and directory this door creates holds key material or a person’s agreement, and one write in the domain that is looser than its sibling is the one a later round copies.`
        );
        continue;
      }
      const value = mode.initializer;
      checked('W1');
      const octal = ts.isNumericLiteral(value) ? value.getText(astOf(file)) : '';
      if (!/^0o[0-7]{3}$/.test(octal)) {
        fail('W1', `${where(file, call)}: ${name}(...) declares a mode that is not an octal literal (${JSON.stringify(value.getText(astOf(file)))}).`);
        continue;
      }
      const digits = octal.slice(2);
      if (digits[1] !== '0' || digits[2] !== '0') {
        fail(
          'W1',
          `${where(file, call)}: ${name}(...) declares mode ${octal}, which grants the group or the world. Everything under this door's directory is owner-only.`
        );
      }
    }
  }
  checked('W1');
  if (seen === 0) {
    fail(
      'W1',
      'no write or mkdir was found anywhere in src/main/pocket/. This door seals an identity and a phone store to disk, so a rule that reads nothing has stopped reading rather than found nothing to read.'
    );
  }
}

// ---------------------------------------------------------------------------
// B1 — the bridge and the registrar move together
// ---------------------------------------------------------------------------

/**
 * `window.gmux.pocket` exists exactly when main serves the `pocket:*` channels.
 *
 * THIS RULE IS THE JUDGE'S, and it is the one thing the round did that was
 * measurably worse than the build before it: the preload installed a `pocket`
 * member carrying nine methods while `registerPocketIpc` was called from
 * nowhere, so all eight invokes rejected in the running app with "No handler
 * registered for pocket:status". The existing ipc-invoke-closure check cannot
 * see that, because it counts `handle(` calls inside a function nobody calls.
 *
 * It is asserted in BOTH directions, so neither half of the wiring round can
 * land on its own, and it reads three files: the preload's assembly, the shared
 * contract's `InstalledGmuxApi` (which is what MAKES the member compulsory) and
 * every call site under src/main/.
 */
function bridgeRule() {
  const preload = join(ROOT, 'src', 'preload', 'index.ts');
  const shared = join(ROOT, 'src', 'shared', 'ipc', 'index.ts');
  const ipcModule = join(DOMAIN, 'ipc.ts');
  checked('B1');
  if (!existsSync(preload) || !existsSync(shared)) {
    fail('B1', 'src/preload/index.ts or src/shared/ipc/index.ts is missing, so this rule read nothing');
    return;
  }

  // 1. Does the bridge INSTALL the member? An import of './pocket' in the
  //    assembly, or a `pocket` key in an object literal there.
  let installs = false;
  for (const node of nodesOf(preload)) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './pocket') {
      installs = true;
    }
    if ((ts.isShorthandPropertyAssignment(node) || ts.isPropertyAssignment(node)) && ts.isIdentifier(node.name) && node.name.text === 'pocket') {
      installs = true;
    }
  }

  // 2. Does the shared contract make it COMPULSORY?
  const declared = /GmuxPocketExtras/.test(codeTextOf(shared));

  // 3. Does anything under src/main/ CALL the registrar, other than the module
  //    that declares it?
  const mainDir = join(ROOT, 'src', 'main');
  let registered = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name !== '__tests__' && name !== 'node_modules') walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      if (path === ipcModule) continue;
      if (/\bregisterPocketIpc\s*\(/.test(codeTextOf(path))) registered += 1;
    }
  };
  if (existsSync(mainDir)) walk(mainDir);

  checked('B1', 3);
  if (installs && registered === 0) {
    fail(
      'B1',
      'src/preload/index.ts installs a `pocket` member on window.gmux and nothing under src/main/ calls registerPocketIpc. ' +
        'Every invoke on that member rejects at run time with "No handler registered", which is a bridge advertising a surface that throws — strictly worse than not having it. ' +
        'The member and the registration land in one commit.'
    );
  }
  if (!installs && registered > 0) {
    fail(
      'B1',
      `${String(registered)} file(s) under src/main/ call registerPocketIpc and src/preload/index.ts installs no \`pocket\` member. ` +
        'Handlers nothing can reach are the same drift the other way round.'
    );
  }
  if (installs !== declared) {
    fail(
      'B1',
      `src/preload/index.ts ${installs ? 'installs' : 'does not install'} the pocket member while src/shared/ipc/index.ts ${declared ? 'names' : 'does not name'} GmuxPocketExtras. ` +
        'The annotation on the preload’s `api` const is what makes the member compulsory, so the two lines move together or the type is describing a bridge that is not there.'
    );
  }

  // PHASE 330: THE SAME CHANNELS IN ALL THREE PLACES. The contract declares
  // them, the preload invokes them and the host registers them, and
  // `pocket:openApproval` joined all three in one commit. THIRTEEN since
  // Phase 316.5, whose `pocket:choosePushKey` and `pocket:forgetPushKey` joined
  // all three in one commit too. FIFTEEN since Phase 333.1 (build/p3331/SPEC.md
  // §6.1): `pocket:recheck`, the window coming back to the front, and
  // `pocket:setupAction`, one setup press by one closed word.
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const bridge = join(ROOT, 'src', 'preload', 'pocket.ts');
  const declaredChannels = new Set();
  if (existsSync(contract)) {
    const map = interfaceOf(contract, 'PocketInvokeChannelMap');
    for (const member of map?.members ?? []) {
      const name = memberName(member);
      if (name !== null && name.startsWith('pocket:')) declaredChannels.add(name);
    }
  }
  const matched = (file, pattern) =>
    existsSync(file) ? new Set([...codeTextOf(file).matchAll(pattern)].map((m) => m[1])) : new Set();
  const bridged = matched(bridge, /\binvoke\(\s*'(pocket:[A-Za-z]+)'/g);
  const served = matched(ipcModule, /\bhandle\(\s*\w+\s*,\s*'(pocket:[A-Za-z]+)'/g);
  const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  checked('B1', 3);
  if (declaredChannels.size !== 15) {
    fail('B1', `src/shared/ipc/pocket.ts's PocketInvokeChannelMap declares ${String(declaredChannels.size)} channel(s), not fifteen (${[...declaredChannels].join(', ')})`);
  }
  checked('B1', 2);
  for (const channel of ['pocket:recheck', 'pocket:setupAction']) {
    if (!declaredChannels.has(channel)) fail('B1', `src/shared/ipc/pocket.ts's PocketInvokeChannelMap declares no ${channel} (Phase 333.1, build/p3331/SPEC.md §5.1)`);
  }
  if (!same(declaredChannels, bridged)) {
    fail('B1', `the preload invokes ${[...bridged].sort().join(', ') || 'nothing'} where the contract declares ${[...declaredChannels].sort().join(', ')}. A channel one side has and the other does not is a button that throws.`);
  }
  if (!same(declaredChannels, served)) {
    fail('B1', `the host registers ${[...served].sort().join(', ') || 'nothing'} where the contract declares ${[...declaredChannels].sort().join(', ')}.`);
  }
}

/** The words a read-only door may not name, and why each one is here. */
const FORBIDDEN = [
  ['killSession', 'a write verb'],
  ['removeSession', 'a write verb'],
  ['restartSession', 'a write verb'],
  ['resumeInPlace', 'a write verb'],
  ['createSession', 'a write verb, and refusal 8: nothing may start a process'],
  ['renameSession', 'a write verb'],
  ['restoreSession', 'a write verb'],
  ['noteHookEvent', 'a status setter, and CLAUDE.md refusal 5'],
  ['noteUserInput', 'a status setter, and CLAUDE.md refusal 5'],
  ['applyDetectedStatus', 'a status setter, and CLAUDE.md refusal 5'],
  ['sendInput', 'attach bytes, which a phone can never be the sender of'],
  ['send-keys', 'typing into a pane, which is the reply writer’s in src/main/reply/ (Phase 318) and never the door’s'],
  ['paste-buffer', 'a paste into a pane, which is the reply writer’s in src/main/reply/ (Phase 318) and never the door’s'],
  // PHASE 318. The door reaches the press and the message only through the
  // PocketWrites and PocketFacts members it is handed, and names nothing of
  // the module that types (Y11 holds the imports; these hold the words).
  ['main/reply/', 'the reply writer, the one module outside the door that types into a session'],
  ['../reply/', 'the reply writer, written the way a sibling import is'],
  ['createReplyVerbs', 'the reply writer’s factory, which only src/main/capabilities.ts builds'],
  ['replyTurns', 'the question id, which the hook, the desk, the monitor and the writer move and the door never does'],
  // PHASE 337. The door reaches the Screen's read and its keys only through
  // PocketFacts.screen and PocketWrites.keys, which src/main/capabilities.ts
  // hands it, and names nothing of the module that reads a screen and types.
  ['main/screen/', 'the Screen’s read and its keys, the second module outside the door that types into a session (Phase 337)'],
  ['../screen/', 'the Screen’s read and its keys, written the way a sibling import is (Phase 337)'],
  // BOTH SPELLINGS. `build/assert-import-boundaries.mjs`'s wall row matches on
  // the src-relative path, so it catches either; a text rule that named only
  // the absolute-looking form would miss `../credentials/vault`, which is how
  // the import would actually be written from inside this domain.
  ['main/credentials/', 'the credential wall'],
  ['main/logins/', 'the credential wall'],
  ['../credentials/', 'the credential wall, written the way a sibling import is'],
  ['../logins/', 'the credential wall, written the way a sibling import is'],
  ['@shared/logins', 'the credential wall: the login vocabulary is not this door\u2019s'],
  ['safeStorage', 'a credential read; the seal is reached through config/seal.ts alone'],
  // PHASE 314. The door speaks to a phone and nothing else, and cannot name the
  // sender that speaks to Apple. The push reads the door's CONFIRMED fields
  // through a narrow host method; the door never reaches the other way.
  ['main/push/', 'the push sender: the door speaks to a phone and nothing else'],
  ['../push/', 'the push sender, written the way a sibling import is'],
  ['node:http2', 'the client Apple is reached with; this door opens no connection outward'],
  ['push.apple.com', 'Apple\u2019s host, which only the sender in main/push/ may spell'],
  // PHASE 316.5. The door reaches the alerts through the port it is handed and
  // never by name: not the composition that holds the sender and the key, not
  // the file panel the key is chosen through, and not the key's sealed store.
  ['main/alerts/', 'the alerts\u2019 composition, which holds the sender and the Apple push key'],
  ['../alerts/', 'the alerts\u2019 composition, written the way a sibling import is'],
  ['showOpenDialog', 'the file panel the Apple push key is chosen through, which main/alerts/ opens'],
  ['apnsKeyStore', 'the Apple push key\u2019s sealed store, which only main/alerts/ and the push seam name']
];

function forbiddenRules() {
  if (domainFiles.length === 0) {
    fail('R3', 'src/main/pocket/ holds no source file at all');
    return;
  }
  for (const file of domainFiles) {
    const text = codeTextOf(file);
    for (const [word, why] of FORBIDDEN) {
      checked('R3');
      if (text.includes(word)) {
        fail(
          'R3',
          `${rel(file)} names ${JSON.stringify(word)} in its CODE, which is ${why}. ` +
            'A door that only answers may not spell it, comments excepted.'
        );
      }
    }
  }
  processRule();
}

/**
 * PHASE 330: THE DOMAIN STARTS EXACTLY TWO KINDS OF PROCESS, and each in one
 * module. `funnel.ts` runs the program `resolveTailscale` answered (its spawn,
 * and its `execFile` of the two reads) and `/bin/ps` (the orphan record); and
 * `bind.ts` forks the door process with `utilityProcess.fork`, once. Refusal 8
 * is why the list is closed: a process that starts is a thing a person
 * confirmed, by hash, and a spawn anywhere else is a start nobody confirmed.
 */
const PROCESS_CALLS = new Set(['spawn', 'spawnSync', 'execSync', 'execFile', 'execFileSync', 'fork']);

function processRule() {
  const funnel = domainFiles.find((f) => f.endsWith(`${join('pocket', 'funnel.ts')}`)) ?? null;
  const bind = domainFiles.find((f) => f.endsWith(`${join('pocket', 'bind.ts')}`)) ?? null;
  // Which local names are bound to child_process, and who imports it.
  const childNames = new Map();
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const spec = node.moduleSpecifier.text;
      if (spec !== 'node:child_process' && spec !== 'child_process') continue;
      checked('R3');
      if (file !== funnel) {
        fail('R3', `${where(file, node)} imports ${spec}. Only src/main/pocket/funnel.ts may start a program, and only the one resolveTailscale answered and /bin/ps.`);
        continue;
      }
      const clause = node.importClause?.namedBindings;
      if (clause !== undefined && ts.isNamedImports(clause)) {
        for (const e of clause.elements) childNames.set(e.name.text, (e.propertyName ?? e.name).text);
      }
      if (clause !== undefined && ts.isNamespaceImport(clause)) {
        fail('R3', `${where(file, node)} imports the whole of ${spec}. Name the two functions this module runs, so a third is a visible edit.`);
      }
    }
  }
  for (const [local, imported] of childNames) {
    checked('R3');
    if (imported !== 'execFile' && imported !== 'spawn') {
      fail('R3', `${rel(funnel)} imports ${imported} from child_process (as ${local}). It runs a program with execFile and spawn, never through a shell.`);
    }
  }
  let forks = 0;
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const e = call.expression;
      const name = calleeName(call);
      const bare = ts.isIdentifier(e) ? e.text : null;
      const receiver = ts.isPropertyAccessExpression(e) ? e.expression.getText(astOf(file)) : null;
      const isProcess =
        (name !== null && PROCESS_CALLS.has(name)) ||
        (bare !== null && childNames.has(bare) && file === funnel) ||
        (name === 'exec' && receiver !== null && /(?:^|\.)deps$/.test(receiver));
      if (!isProcess) continue;
      checked('R3');
      const first = call.arguments[0];
      const firstText = first === undefined ? '' : first.getText(astOf(file));
      if (file === bind && receiver === 'utilityProcess' && name === 'fork') {
        forks += 1;
        continue;
      }
      if (file === funnel) {
        const imported = bare !== null ? childNames.get(bare) : undefined;
        // The shipping seam: child_process's own two functions, each run on the
        // `file` its wrapper was handed, which the checks below trace.
        if (imported === 'execFile' && enclosingName(call) === 'execReal' && firstText === 'file') continue;
        if (imported === 'spawn' && firstText === 'file') continue;
        // Through the deps: the program `resolveTailscale` answered.
        if (receiver !== null && /(?:^|\.)deps$/.test(receiver) && (name === 'exec' || name === 'spawn') && /\bprogram\b/.test(firstText)) continue;
      }
      fail(
        'R3',
        `${where(file, call)} starts a process (${call.expression.getText(astOf(file))}(${firstText.slice(0, 40)}…)). ` +
          'The domain starts the program resolveTailscale answered and /bin/ps from funnel.ts, and the door process from bind.ts, and nothing else (CLAUDE.md refusal 8).'
      );
    }
  }
  checked('R3');
  if (forks !== 1) {
    fail('R3', `bind.ts calls utilityProcess.fork ${String(forks)} time(s). The door process is forked in exactly one place.`);
  }
  // The wrapper around child_process's execFile runs /bin/ps and nothing else
  // by name: every call of it names /bin/ps, and the deps' exec is it.
  if (funnel !== null) {
    for (const call of callsOf(funnel)) {
      if (calleeName(call) !== 'execReal') continue;
      checked('R3');
      const first = call.arguments[0];
      if (first === undefined || !ts.isStringLiteral(first) || first.text !== '/bin/ps') {
        fail('R3', `${where(funnel, call)}: execReal is called on ${JSON.stringify(first?.getText(astOf(funnel)) ?? '')}. By name it runs /bin/ps alone; the program runs through deps.exec, on what resolveTailscale answered.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// A — what proves who is asking, and what never travels
// ---------------------------------------------------------------------------

function admissionRules() {
  if (domainFiles.length === 0) {
    for (const id of ['A1', 'A2', 'A3']) fail(id, 'src/main/pocket/ holds no source file at all');
    return;
  }
  for (const file of domainFiles) {
    const text = codeTextOf(file).toLowerCase();
    for (const [needle, why] of [
      ['authorization', 'research 127 §10 forbids a bearer outright'],
      ['bearer', 'research 127 §10 forbids a bearer outright'],
      ['set-cookie', 'the door sets no cookie'],
      ['cookie', 'the door reads and sets no cookie']
    ]) {
      checked('A1');
      if (text.includes(needle)) {
        fail(
          'A1',
          `${rel(file)} names ${JSON.stringify(needle)} in its CODE. ${why}: a credential a request carries whole is captured by whoever holds the port next.`
        );
      }
    }
  }

  // A2. Nothing secret in a URL. A route path that interpolates, or a matcher
  // that pulls a long hex run out of a path, is the shape research 127 §7
  // measured leaking through a referrer and a log.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isTemplateExpression(node)) continue;
      const head = node.head.text;
      if (!head.startsWith('/')) continue;
      // A VALUE IN THE QUERY IS THE DESIGN. The table is a set of exact paths
      // BECAUSE every value rides in the query, so `/v1/session?id=${…}` is the
      // shape this phase chose and `/v1/session/${…}` is the shape it refuses.
      if (head.includes('?')) continue;
      checked('A2');
      fail(
        'A2',
        `${where(file, node)} builds a path by interpolation (${JSON.stringify(`${head}\${…}`)}). ` +
          'Every route path is an exact string and every value rides in the query, so nothing secret can be in a path by construction.'
      );
    }
    // A TOKEN MATCHER IS A REGEX LITERAL, NOT A STRING, and the first draft of
    // this rule read only strings — so `const TOKEN_PATH = /^\/h\/([0-9a-f]{32})$/`
    // was invisible to it and the ablation that plants exactly that shape left
    // this rule green. Both kinds are read now.
    const tokenish = [
      ...codeStringsOf(file),
      ...nodesOf(file)
        .filter((n) => n.kind === ts.SyntaxKind.RegularExpressionLiteral)
        .map((n) => ({ node: n, text: n.getText(astOf(file)) }))
    ];
    for (const { node, text } of tokenish) {
      checked('A2');
      if (/\/h\/|\/u\//.test(text) && /[0-9a-f]/i.test(text) && /\{(?:16|32|64)\}/.test(text)) {
        fail(
          'A2',
          `${where(file, node)} matches the hook server's token-in-the-path shape (${JSON.stringify(text.slice(0, 60))}). ` +
            'That is the one design this door replaced: a URL-borne secret leaves by Referer the first time a client follows an outbound link, and a signature in a URL cannot be taken back once it has been sent somewhere else.'
        );
        continue;
      }
      if (/\[0-9a-f\]\{(?:16|32|64)\}/.test(text) || /\[a-f0-9\]\{(?:16|32|64)\}/.test(text)) {
        fail(
          'A2',
          `${where(file, node)} matches a long hex run out of a URL (${JSON.stringify(text)}), which is the hook server's token-in-the-path shape. This door has no token in any URL.`
        );
      }
    }
  }

  // A3. The window gate comes first, WHEREVER THE DISPATCH IS.
  //
  // The rule does not name a module, because the route table and the thing that
  // answers a request are two files and either could hold the branch. It finds
  // the dispatch by its one identifying call — whatever asks the table for a
  // row — and reads the ORDER inside it. The first draft asked `pairing.ts` for
  // the literal `/pair`, which that module has no reason to hold: the path is in
  // the table and the window predicate is what pairing owns.
  // PHASE 330: the dispatch is the door process's request handler, and a
  // module can subscribe to `data` for another reason (the PROXY header is
  // read that way), so the order is read inside the FUNCTION that asks the
  // table for a row, not across the whole file.
  const dispatchers = [];
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      if (calleeName(call) !== 'matchPocketRoute') continue;
      let fn = call.parent;
      while (fn !== undefined && !ts.isFunctionLike(fn)) fn = fn.parent;
      if (fn !== undefined) dispatchers.push({ file, text: codeOfNode(file, fn) });
    }
  }
  checked('A3');
  if (dispatchers.length === 0) {
    fail(
      'A3',
      'no module in the domain asks the route table for a row, so nothing dispatches and the window gate cannot be placed at all'
    );
  }
  for (const { file, text } of dispatchers) {
    checked('A3', 2);
    const windowAt = text.search(/windowOnly/);
    if (windowAt === -1) {
      fail(
        'A3',
        `${rel(file)} dispatches but never reads a route's windowOnly flag, so the pairing route is live for the door's whole life`
      );
      continue;
    }
    // Everything that touches the request's PAYLOAD must come after it. A dead
    // route reads nothing, because reading is what an attacker measures.
    for (const [pattern, what] of [
      [/readBody\(|readCapped\(/, 'the body is read'],
      [/\.on\(\s*'data'/, "the request's data event is subscribed"],
      [/JSON\.parse\(|presentationOfBody\(/, 'a body is parsed']
    ]) {
      const at = text.search(pattern);
      if (at !== -1 && at < windowAt) {
        fail(
          'A3',
          `${rel(file)}: ${what} at offset ${String(at)}, BEFORE the windowOnly test at ${String(windowAt)}. Outside its window /pair is not a route and reads nothing.`
        );
      }
    }
  }

  // And the window's own owner must be able to shut, and must destroy the
  // secret when it does: a window that only expires leaves the one-shot secret
  // in memory for a photographed screen to be worth something.
  const pairing = moduleNamed('pairing', 'A3', "Builder B's");
  if (pairing === null) return;
  const text = codeTextOf(pairing);
  checked('A3', 2);
  if (!/windowOpen|windowIsOpen|isWindowOpen/.test(text)) {
    fail('A3', `${rel(pairing)} exports no predicate saying whether the window is open, so the dispatch has nothing to ask`);
  }
  if (!/POCKET_PAIRING_WINDOW_MS|WINDOW_MS|windowMs/.test(text)) {
    fail('A3', `${rel(pairing)} names no window length, so the window is unbounded`);
  }
}

// ---------------------------------------------------------------------------
// S — the shape of every answer, and the shutdown
// ---------------------------------------------------------------------------

function serverRules() {
  if (domainFiles.length === 0) {
    for (const id of ['S1', 'S3', 'G1']) fail(id, 'src/main/pocket/ holds no source file at all');
    return;
  }

  // S1. One place emits it.
  const sites = [];
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      if (text.toLowerCase() === 'referrer-policy') sites.push({ file, node });
    }
  }
  checked('S1', sites.length + 1);
  if (sites.length === 0) {
    fail(
      'S1',
      'no module in the domain emits Referrer-Policy. A header emitted nowhere is a header the one route that forgot it does not send, and every answer this door writes goes through one function so that it cannot be forgotten.'
    );
  } else if (sites.length > 1) {
    fail(
      'S1',
      `${String(sites.length)} places emit Referrer-Policy (${sites.map((s) => where(s.file, s.node)).join(', ')}). ` +
        'One header, one place: two is how a route gets added without one.'
    );
  }
  const values = [];
  for (const file of domainFiles) {
    for (const { text } of codeStringsOf(file)) {
      if (text === 'no-referrer') values.push(text);
    }
  }
  checked('S1');
  if (sites.length > 0 && values.length === 0) {
    fail('S1', 'Referrer-Policy is emitted but its value is not the literal no-referrer');
  }

  // S3. EVERY STOP CLOSES ADMISSION ON ITS FIRST LINE, before any await, in
  // main (bind.ts: the door's stop and its quit-time half) AND in the door
  // process (door/listener.ts's stop). Since Phase 330 the door is two
  // processes, and a stop that closed admission in one and awaited before the
  // other would answer a request the person had already switched off.
  const bind = moduleNamed('bind', 'S3', "Phase 330 builder door's");
  const listener = moduleNamed('listener', 'S3', "Phase 330 builder door's");
  const CLOSES = /(?:shuttingDown|shutdown|admission|quitting)\s*=\s*true/i;
  const shutdowns = [];
  for (const file of [bind, listener]) {
    if (file === null) continue;
    for (const node of nodesOf(file)) {
      // EVERY FUNCTION THAT CLOSES ADMISSION, whatever its shape: a method, a
      // declaration, or an arrow held in a const (the listener's `stop`).
      let name = null;
      let body = null;
      if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name !== undefined && ts.isIdentifier(node.name)) {
        name = node.name.text;
        body = node.body ?? null;
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
        name = node.name.text;
        body = ts.isBlock(node.initializer.body) ? node.initializer.body : null;
      }
      if (name === null || body === null) continue;
      // The functions that END something. A start that gives up also sets the
      // flag, inside a branch, and is not a shutdown.
      if (!/^(?:stop|beginShutdown|beginPocketShutdown|joinPocketDoor|kill)$/.test(name)) continue;
      if (!CLOSES.test(body.getText(astOf(file)))) continue;
      shutdowns.push({ file, name, node, body });
    }
  }
  for (const { file, name, node, body } of shutdowns) {
    checked('S3', 2);
    // THE PROMISE IS "BEFORE ANY AWAIT", not "on line one". A clock read, or a
    // guard that the stop already ran, is neither a yield nor a touch of the
    // listener or of an accepted request.
    const sf = astOf(file);
    const statements = body.statements;
    const closesAt = statements.findIndex((st) => CLOSES.test(st.getText(sf)));
    if (closesAt === -1) {
      fail('S3', `${where(file, node)}: ${name}() closes admission only inside a nested block, so it is not the first thing it does`);
      continue;
    }
    for (let i = 0; i < closesAt; i += 1) {
      const text = statements[i].getText(sf);
      if (/\bawait\b|this\.server|this\.inFlight|this\.child|\bpost\(|\breq\b|\bsocket\b|netServer|pending/.test(text)) {
        fail(
          'S3',
          `${where(file, statements[i])}: ${JSON.stringify(text.slice(0, 80))} runs BEFORE ${name}() closes admission. ` +
            'Anything that can yield, or that reads the listener, the process or an accepted request, before that line is work the shutdown did not stop.'
        );
      }
    }
    const text = codeOfNode(file, body);
    const joins = /\bawait\b/.test(text);
    if (joins && file === listener && !/\.close\(/.test(text)) {
      fail('S3', `${where(file, node)}: the door process's ${name}() joins but never closes its listener, so a stopped door is still bound`);
    }
    if (joins && file === bind && name === 'stop' && (!/kind:\s*'stop'/.test(text) || !/this\.kill\(\)/.test(text))) {
      fail('S3', `${where(file, node)}: ${name}() joins but does not both tell the process to stop and kill it, so a door process that never answers outlives the quit`);
    }
  }
  checked('S3', 3);
  if (bind !== null && !shutdowns.some((x) => x.file === bind && x.name === 'stop')) {
    fail('S3', `${rel(bind)} declares no stop() that closes admission, so nothing in the ordered disposer owns the door process`);
  }
  if (bind !== null && !shutdowns.some((x) => x.file === bind && x.name === 'beginPocketShutdown')) {
    fail('S3', `${rel(bind)}: beginPocketShutdown() does not close admission on its first line, so a request forwarded during the quit's own first lines is answered`);
  }
  if (listener !== null && !shutdowns.some((x) => x.file === listener && x.name === 'stop')) {
    fail('S3', `${rel(listener)} has no stop that closes admission before it awaits, so the door process answers while it is being stopped`);
  }

  // G1. Nothing that could be a secret, a body or a line of conversation is an
  // argument to a log call.
  //
  // THE TWO PRECISIONS ARE THE RULE. A CONSTANT STRING is never a value that
  // came off the wire — a refusal sentence is a reason and the log's whole job
  // is to carry one — so a literal argument is skipped, and the first draft of
  // this rule failed `pairing.ts`'s honest sentence about the OS keystore on
  // the letters `key` inside the word. And the words are matched at WORD
  // BOUNDARIES for the same reason: `keyId` names a key and is not one.
  // PHASE 314 widened it by six: a device token, the provider key's PEM, the
  // JWT signed with it and the bearer it travels as, and the pairing
  // presentation's own key for the token, `apt`. PHASE 317 widened it by six
  // more (build/p317/SPEC.md §6.1), for the door that now takes a person's
  // writes and, in 318, his typed words: an error's `message` (a failed tmux
  // command's text holds its argv, research 135 §4.8), `text`, `words`,
  // `label`, `typed` and `reply`. `word` alone is NOT poison: a refusal's
  // reason travels as a WORD and the log's whole job is to carry one. And its
  // scope gained the one write implementation outside this directory,
  // src/main/sessions/pocket-writes.ts.
  const LOGGABLE_POISON =
    /\b(?:tokens?|secrets?|keys?|signatures?|nonces?|body|payload|question|answer|prompt|transcript|contents|authorization|jwt|bearer|pem|apt|pushToken|deviceToken|texts?|messages?|words|labels?|typed|repl(?:y|ies))\b/i;
  const pocketWrites = join(ROOT, 'src', 'main', 'sessions', 'pocket-writes.ts');
  for (const file of [...domainFiles, ...(existsSync(pocketWrites) ? [pocketWrites] : [])]) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !/^(?:debug|info|warn|error|log)$/.test(name)) continue;
      for (const arg of call.arguments) {
        checked('G1');
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;
        if (ts.isBinaryExpression(arg) && ts.isStringLiteral(arg.left) && ts.isStringLiteral(arg.right)) {
          continue;
        }
        const text = arg.getText(astOf(file));
        // A joined pair of literals, which is how a long sentence is written.
        if (/^(?:'[^']*'|"[^"]*")(?:\s*\+\s*(?:'[^']*'|"[^"]*"))*$/s.test(text.trim())) continue;
        const hit = LOGGABLE_POISON.exec(text);
        if (hit !== null) {
          fail(
            'G1',
            `${where(file, call)} hands ${JSON.stringify(text.slice(0, 80))} to ${name}(), which names ${JSON.stringify(hit[0])}. ` +
              'The log takes a reason and never a value: 500 anonymous posts wrote 500 lines in 47 ms on the hook route, and app.log holds 2 MiB with one archive.'
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// T — nothing binds a real interface
// ---------------------------------------------------------------------------

/**
 * A host that is not loopback, anywhere a pocket file names one.
 *
 * THE RULE IS ABOUT A HOST AND NOT ABOUT A DOTTED QUAD, and the first draft of
 * it was the other thing: it read every four-octet run in the text and failed
 * `tls.ts` on the OIDs `2.5.29.17` and `1.3.6.1.5.5.7.3.1`, which are X.509
 * extension identifiers and not addresses, and failed this gate on its own
 * refusal sentences. So a literal is judged by WHERE IT IS: an argument to
 * `listen`, `connect`, `createConnection` or `request`, or the value of a
 * property or variable called host, hostname, address or bind. Everything else
 * — a certificate's subject alternative name, a documented range, a sentence —
 * is a value and not a bind.
 */
function loopbackRule() {
  const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']);
  // `host` and `hostname` only. `address` and `bindAddress` are DATA FIELDS —
  // an interface row, a confirm field, a phone's recorded address — and reading
  // them as bind targets failed seven fixtures that bind nothing. What actually
  // binds is a call, and that is caught below.
  const HOST_NAMES = /^(?:host|hostname)$/i;
  // PHASE 332 ADDED `bind`: a UDP socket is held to an interface by what it
  // binds, and the DNS stand-in and the name check each bind one.
  const HOST_CALLS = new Set(['listen', 'connect', 'createConnection', 'request', 'get', 'netConnect', 'tlsConnect', 'bind']);
  const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const roots = [join(ROOT, 'build'), join(ROOT, 'src', 'main', 'pocket')];
  const seen = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const walk = (d) => {
      for (const name of readdirSync(d)) {
        const path = join(d, name);
        if (statSync(path).isDirectory()) {
          if (name !== 'node_modules' && name !== 'vendor') walk(path);
          continue;
        }
        if (!/\.(?:mjs|mts|ts)$/.test(name)) continue;
        // THE PATH, NOT THE BASENAME. `build/p313/hostile-client.mts` names
        // neither word in its file name and was skipped by the first draft, so
        // the one check that actually dials the door sat outside this rule —
        // the ablation found it by pointing that client at a real address and
        // watching this gate stay green.
        // The REPOSITORY-RELATIVE path, because the absolute one holds the
        // worktree's own name and a worktree called `wt-p313` made this rule
        // read all 1,346 production files and fail on a fixture's example URL.
        // Phase 332 widened it to `p332`, where the DNS stand-in and its probe live.
        if (!/pocket|p313|p330|p332/i.test(rel(path))) continue;
        seen.push(path);
      }
    };
    walk(root);
  }
  checked('T1');
  if (seen.length === 0) {
    fail('T1', 'no pocket file was found under build/ or src/main/pocket/, so this rule read nothing');
    return;
  }
  /**
   * Is this string literal in a position that decides what a socket binds?
   *
   * A `{ host, port }` pair is a bind target. An `{ address, family, netmask,
   * internal }` row is what `os.networkInterfaces()` ANSWERS, and a fixture of
   * those is what every unit test of the chooser is made of — that is a value
   * being judged, not an address being dialled, and the first draft of this
   * rule failed six of them.
   */
  const isHostPosition = (node) => {
    const parent = node.parent;
    if (parent === undefined) return false;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      // `bind({ address: '…', port })` (Phase 332): `address` is a bind target
      // when, and only when, its object literal is handed to `bind(`.
      const obj = parent.parent;
      const call = obj?.parent;
      if (
        parent.name.text === 'address' &&
        obj !== undefined &&
        ts.isObjectLiteralExpression(obj) &&
        call !== undefined &&
        ts.isCallExpression(call) &&
        calleeName(call) === 'bind' &&
        call.arguments.includes(obj)
      ) {
        return true;
      }
      return HOST_NAMES.test(parent.name.text);
    }
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return HOST_NAMES.test(parent.name.text);
    }
    if (ts.isCallExpression(parent)) {
      const name = calleeName(parent);
      return name !== null && HOST_CALLS.has(name) && parent.arguments.includes(node);
    }
    return false;
  };
  for (const path of seen) {
    for (const { node, text } of codeStringsOf(path)) {
      // An ADDRESS, not any string with a colon in it. A URL is not a bind
      // host, and reading one as a host failed a fixture's `https://api.example`.
      if (!IPV4.test(text) && text !== 'localhost' && !/^(?:\[?[0-9a-f:]+\]?)$/i.test(text)) continue;
      checked('T1');
      if (LOOPBACK.has(text)) continue;
      if (!isHostPosition(node)) continue;
      fail(
        'T1',
        `${where(path, node)} hands ${JSON.stringify(text)} to something that binds or dials. ` +
          'Every test and every gate drives the door on 127.0.0.1, and nothing in this repository may bind a real interface.'
      );
    }
  }
}

function noHtmlRule() {
  // H1. No HTML document, no text/html. His ruling of 2026-09-22 — "lets skip
  // the web app" — made a property of the tree rather than a paragraph in it.
  // P2 and P3 asserted this as a side effect of judging the page's own
  // stylesheet and markup, and they left with the page they judged, so nothing
  // said it any more: a later round could have reintroduced a page with every
  // gate green. Now it cannot.
  for (const file of domainFiles) {
    checked('H1');
    const code = codeTextOf(file);
    if (/<!doctype|<html[\s>]/i.test(code)) {
      fail(
        'H1',
        `${rel(file)} composes an HTML document. The page this phase built could not be ` +
          'reached under mechanism 5 and was removed on his ruling of 2026-09-22; a round ' +
          'that wants one asks him for an admission a browser can satisfy first.'
      );
    }
    if (/text\/html/i.test(code)) {
      fail(
        'H1',
        `${rel(file)} names the text/html content type. Every answer this door writes is ` +
          'application/json, and a page is not this phase to serve.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// N — the push (Phase 314): no route for it, and one door in for the token
// ---------------------------------------------------------------------------

/**
 * The words a route may not carry. A route that names any of them is the push
 * reaching the door, and Phase 314 refuses that outright: the device token
 * arrives inside the sealed pairing presentation, and nothing about the push is
 * a thing a phone can ASK for.
 */
const PUSH_ROUTE_WORDS = /push|apns|notify|device|token|alert/i;

/*
 * Phase 314 held the table to Phase 313's membership pin a second time here,
 * so a route added for the push had to move two pins. PHASE 317 REMOVED THAT
 * SECOND PIN (build/p317/SPEC.md §6.1, 318's amendment, which 316.7 also
 * plans): the door gained two writes, so the membership moved on purpose, and
 * R4 alone holds it now. What N1 keeps is the promise itself, read as words:
 * no route names the push.
 */

/** Every string element of the `POCKET_ROUTE_IDS` array literal in a file, or null. */
function contractRouteIds(file) {
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTE_IDS') continue;
    let init = node.initializer ?? null;
    while (init !== null && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
    if (init === null || !ts.isArrayLiteralExpression(init)) return null;
    return init.elements.filter((e) => ts.isStringLiteral(e)).map((e) => ({ node: e, text: e.text }));
  }
  return null;
}

function noPushRouteRule() {
  const routes = moduleNamed('table', 'N1', "Phase 330 builder door's (src/main/pocket/door/table.ts)");
  if (routes !== null) {
    // Every id and every path of the table.
    for (const node of nodesOf(routes)) {
      if (!ts.isVariableDeclaration(node)) continue;
      if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
      for (const lit of nodesOf(routes).filter(
        (n) =>
          ts.isStringLiteral(n) &&
          n.getStart() >= node.getStart() &&
          n.getEnd() <= node.getEnd() &&
          ts.isPropertyAssignment(n.parent) &&
          ts.isIdentifier(n.parent.name) &&
          (n.parent.name.text === 'id' || n.parent.name.text === 'path')
      )) {
        checked('N1');
        if (PUSH_ROUTE_WORDS.test(lit.text)) {
          fail(
            'N1',
            `${where(routes, lit)}: the route ${lit.parent.name.text} ${JSON.stringify(lit.text)} names the push. ` +
              'The token rides inside the sealed pairing presentation and nothing about the push is a route a phone can ask for.'
          );
        }
      }
    }
    checked('N1');
    if (routeLines(routes) === null) {
      fail('N1', `${rel(routes)}: POCKET_ROUTES could not be read as literal rows, so nothing says no push route was added`);
    }
  }
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('N1');
  if (!existsSync(contract)) {
    fail('N1', 'src/shared/ipc/pocket.ts does not exist, so the contract’s route ids cannot be read');
    return;
  }
  const ids = contractRouteIds(contract);
  if (ids === null) {
    fail('N1', `${rel(contract)} declares no POCKET_ROUTE_IDS array literal`);
    return;
  }
  for (const { node, text } of ids) {
    checked('N1');
    if (PUSH_ROUTE_WORDS.test(text)) {
      fail('N1', `${where(contract, node)}: the contract names a route ${JSON.stringify(text)}, which names the push.`);
    }
  }
}

/** The types a renderer is handed, and nothing on them may be named like a token. */
const RENDERER_FACING = [
  'PocketStatus',
  'PocketPhoneView',
  'PocketPairingView',
  'PocketBlockedRow',
  'PocketSessionDetail',
  'PocketAllowResult'
];
const TOKEN_LIKE = /token|jwt|bearer|secret|^apt$|^ape$|^p8$|pem$/i;

function tokenDoorRule() {
  const pairing = moduleNamed('pairing', 'N2', "Phase 313's");
  if (pairing !== null) {
    // (a) The presentation parser READS apt and ape, and hands them to a check
    // that is bounded hex and two words, and refuses the whole body when it
    // answers null.
    let opener = null;
    for (const node of nodesOf(pairing)) {
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'openPresentation') {
        opener = node;
      }
    }
    checked('N2');
    if (opener === null || opener.body === undefined) {
      fail('N2', `${rel(pairing)} declares no openPresentation method, so nothing reads what a phone presented`);
    } else {
      // COMMENTS BLANKED, so a sentence about the call is not the call.
      const text = codeTextOf(pairing).slice(opener.body.getStart(astOf(pairing)), opener.body.getEnd());
      checked('N2');
      if (!/presentedPush\s*\(\s*inner\s*\)/.test(text) || !/if\s*\(\s*push\s*===\s*null\s*\)\s*return null;/.test(text)) {
        fail(
          'N2',
          `${where(pairing, opener)}: openPresentation does not hand the inner body to presentedPush and refuse the WHOLE presentation on its null. ` +
            'A token that is not the shape must be refused with the one word every other refusal answers, never kept beside a good label.'
        );
      }
    }
    const fnText = (name) => {
      for (const node of nodesOf(pairing)) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body !== undefined) {
          return codeTextOf(pairing).slice(node.getStart(astOf(pairing)), node.getEnd());
        }
      }
      return null;
    };
    const presented = fnText('presentedPush');
    const shape = fnText('pushFieldsOf');
    checked('N2', 2);
    if (presented === null || !/'apt'/.test(presented) || !/'ape'/.test(presented)) {
      fail('N2', `${rel(pairing)}: presentedPush does not read the presentation's 'apt' and 'ape' keys`);
    }
    const regexText = codeTextOf(pairing);
    const bounded = /const PUSH_TOKEN_RE = \/\^\[0-9a-fA-F\]\{32,256\}\$\/;/.test(regexText);
    checked('N2');
    if (!bounded) {
      fail('N2', `${rel(pairing)}: PUSH_TOKEN_RE is not /^[0-9a-fA-F]{32,256}$/, so a device token is not held to bounded hex`);
    }
    checked('N2');
    if (
      shape === null ||
      !/PUSH_TOKEN_RE\.test\(token\)/.test(shape) ||
      !/environment !== 'development' && environment !== 'production'\) return null;/.test(shape)
    ) {
      fail(
        'N2',
        `${rel(pairing)}: pushFieldsOf does not test the token against PUSH_TOKEN_RE and refuse any environment but 'development' and 'production'.`
      );
    }
    // (c) The destination, which carries the token, is declared here.
    checked('N2');
    const declares = nodesOf(pairing).some(
      (n) => ts.isInterfaceDeclaration(n) && n.name.text === 'PocketPushDestination'
    );
    if (!declares) {
      fail('N2', `${rel(pairing)} declares no PocketPushDestination, so the one type that carries the token lives somewhere this gate does not read`);
    }
  }
  // (b) and (c): the shared contract.
  const shared = join(ROOT, 'src', 'shared');
  const sharedFiles = sourcesUnder(shared);
  for (const file of sharedFiles) {
    checked('N2');
    if (/\bPocketPushDestination\b/.test(codeTextOf(file))) {
      fail('N2', `${rel(file)} names PocketPushDestination. The type carries the token and lives in src/main/pocket/pairing.ts alone.`);
    }
  }
  const contract = join(shared, 'ipc', 'pocket.ts');
  if (!existsSync(contract)) {
    fail('N2', 'src/shared/ipc/pocket.ts does not exist, so the renderer-facing types cannot be read');
    return;
  }
  const found = new Set();
  for (const node of nodesOf(contract)) {
    if (!ts.isInterfaceDeclaration(node) || !RENDERER_FACING.includes(node.name.text)) continue;
    found.add(node.name.text);
    for (const member of node.members) {
      checked('N2');
      const name = member.name !== undefined && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
        ? member.name.text
        : null;
      if (name !== null && TOKEN_LIKE.test(name)) {
        fail(
          'N2',
          `${where(contract, member)}: ${node.name.text}.${name} is named like a token. ` +
            'The device token decides where his words go and never reaches the renderer; the sheet reads `alerts` and nothing more.'
        );
      }
    }
  }
  for (const name of RENDERER_FACING) {
    checked('N2');
    if (!found.has(name)) fail('N2', `${rel(contract)} declares no interface ${name}, so this rule read nothing for it`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 316.1 — the door switched on
// ---------------------------------------------------------------------------

/**
 * Every declaration of a function called `name` in a file, whatever its shape:
 * a function, a class method, an object method, or a property or variable
 * whose value is an arrow or a function expression. Answers the node whose
 * text is the function (for a property, the initializer).
 */
function functionsNamed(file, name) {
  const out = [];
  for (const node of nodesOf(file)) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name !== undefined) {
      const n = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
      if (n === name && node.body !== undefined) out.push(node);
      continue;
    }
    if ((ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) && node.initializer !== undefined) {
      const n = node.name !== undefined && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : null;
      if (n !== name) continue;
      let init = node.initializer;
      while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) init = init.expression;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) out.push(init);
    }
  }
  return out;
}

/** The method `name` of class `className` in a file, or null. */
function methodOf(file, className, name) {
  for (const node of nodesOf(file)) {
    if (!ts.isClassDeclaration(node) || node.name?.text !== className) continue;
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name !== undefined && ts.isIdentifier(member.name) && member.name.text === name && member.body !== undefined) {
        return member;
      }
    }
  }
  return null;
}

/** The comment-blanked text of one node. */
function codeOfNode(file, node) {
  return codeTextOf(file).slice(node.getStart(astOf(file)), node.getEnd());
}

/** The nearest enclosing function-like declaration's name, or null. */
function enclosingName(node) {
  let n = node.parent;
  while (n !== undefined) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name)) {
      return n.name.text;
    }
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent !== undefined) {
      const p = n.parent;
      if ((ts.isPropertyAssignment(p) || ts.isVariableDeclaration(p)) && ts.isIdentifier(p.name)) return p.name.text;
    }
    n = n.parent;
  }
  return null;
}

/** An interface declared in a file, or null. */
function interfaceOf(file, name) {
  for (const node of nodesOf(file)) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) return node;
  }
  return null;
}

/** A member's name, whatever it is spelled as. */
const memberName = (member) =>
  member.name !== undefined && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : null;

/** The numeric value a `const NAME = <number>` in a file holds, or null. */
function constNumber(file, name) {
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== name) continue;
    const init = node.initializer;
    if (init !== undefined && ts.isNumericLiteral(init)) return Number(init.text.replace(/_/g, ''));
  }
  return null;
}

/** Every file of the renderer's Settings then Phone surface (Phase 316.1 builder C). */
function phoneSurfaceFiles() {
  const out = [];
  const section = join(ROOT, 'src', 'renderer', 'settings', 'PhoneSection.tsx');
  if (existsSync(section)) out.push(section);
  out.push(...sourcesUnder(join(ROOT, 'src', 'renderer', 'settings', 'phone')));
  return out;
}

// ---------------------------------------------------------------------------
// K2 — no tailnet key anywhere under src/ (Phase 330: K1 became K2)
// ---------------------------------------------------------------------------

/**
 * Phase 316.1's K1 guarded HIS TAILNET KEY on its one path, from the sheet's
 * password field through the window's bytes into the QR. Phase 330 removed the
 * path: the phone never joins the tailnet, so the code carries no credential
 * at all, and the rule becomes the stronger one: NOTHING under src/ names the
 * key, the QR field that carried it, or the prefix it was checked against. A
 * later round that brings a tailnet credential back has to delete this rule to
 * do it, in the open.
 *
 * Read as the AST of every production file whose text could hold one (a cheap
 * prefilter first, so this stays a second-long gate): a comment that tells the
 * history is not a key, and a property named `tk` is one.
 */
const KEY_IDENTIFIER = /tailnet_?key/i;

function noTailnetKeyRule() {
  const files = sourcesUnder(join(ROOT, 'src'));
  checked('K2');
  if (files.length === 0) {
    fail('K2', 'no production file was found under src/, so this rule read nothing');
    return;
  }
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    if (!/tskey-|tailnet_?key|\btk\b/i.test(raw)) continue;
    for (const { node, text } of codeStringsOf(file)) {
      checked('K2');
      if (/tskey-/i.test(text)) {
        fail('K2', `${where(file, node)} names ${JSON.stringify(text.slice(0, 40))}, a Tailscale auth key's prefix. Tortie holds no Tailscale credential of any kind (research 128 §3.2, and Phase 330 took the last one out).`);
      }
    }
    for (const node of nodesOf(file)) {
      if (ts.isIdentifier(node) && KEY_IDENTIFIER.test(node.text)) {
        checked('K2');
        fail('K2', `${where(file, node)} names ${node.text}. The phone never joins the tailnet, so no code carries its key.`);
        continue;
      }
      const named =
        ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node) ||
        ts.isPropertySignature(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isBindingElement(node);
      const property = named ? memberName(node) ?? (ts.isBindingElement(node) && node.propertyName !== undefined && ts.isIdentifier(node.propertyName) ? node.propertyName.text : null) : null;
      const element =
        ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : null;
      const accessed = ts.isPropertyAccessExpression(node) ? node.name.text : null;
      if (property === 'tk' || element === 'tk' || accessed === 'tk') {
        checked('K2');
        fail('K2', `${where(file, node)} names \`tk\`, the QR field that carried his tailnet key. The v:3 code has no such field.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// O1 — others is exactly the listed sessions that are not blocked
// ---------------------------------------------------------------------------

/** The method `name` of the object literal a function returns, or null. */
function returnedMethod(file, factoryName, name) {
  for (const fn of functionsNamed(file, factoryName)) {
    let found = null;
    const walk = (n) => {
      if (found !== null) return;
      if (ts.isReturnStatement(n) && n.expression !== undefined && ts.isObjectLiteralExpression(n.expression)) {
        for (const p of n.expression.properties) {
          if (memberName(p) !== name) continue;
          if (ts.isMethodDeclaration(p) && p.body !== undefined) found = p;
          if (ts.isPropertyAssignment(p) && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))) found = p.initializer;
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(fn.body ?? fn);
    if (found !== null) return found;
  }
  return null;
}

/**
 * HIS RULING, 2026-09-22: "Yes it should be able to open anything." A phone
 * that may open any session needs to FIND any session, and the blocked list
 * names only the ones waiting on him. `others` is the rest, and "the rest" is a
 * set identity that one careless line breaks two ways: a second read of the
 * session list (two lists that disagree about a session that moved between
 * them), or a filter that is not the complement of the blocked set (a session
 * drawn twice, or never). And it is bounded, by the contract's own number.
 * The hostile client drives the shipping composer over 205 sessions; this reads
 * that no source can take either promise back.
 */
function othersRule() {
  const routes = moduleNamed('routes', 'O1', "Phase 316.1 builder A's");
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('O1');
  if (!existsSync(contract) || constNumber(contract, 'POCKET_OTHERS_MAX') !== 200) {
    fail('O1', 'src/shared/ipc/pocket.ts does not declare POCKET_OTHERS_MAX = 200, so the cap on others is nowhere a phone and the Mac both read');
  }
  if (routes === null) return;
  // The cap is IMPORTED from the contract, never re-spelled.
  let imported = false;
  for (const node of nodesOf(routes)) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!/shared\/ipc\/pocket$/.test(node.moduleSpecifier.text)) continue;
    const clause = node.importClause?.namedBindings;
    if (clause !== undefined && ts.isNamedImports(clause) && clause.elements.some((e) => e.name.text === 'POCKET_OTHERS_MAX')) imported = true;
  }
  checked('O1');
  if (!imported) {
    fail('O1', `${rel(routes)} does not import POCKET_OTHERS_MAX from the contract, so the cap a phone is told and the cap the door applies can drift apart`);
  }
  const blocked = returnedMethod(routes, 'createPocketRoutes', 'blocked');
  checked('O1');
  if (blocked === null) {
    fail('O1', `${rel(routes)}: createPocketRoutes answers no blocked() this rule can read`);
    return;
  }
  const text = codeOfNode(routes, blocked.body);
  // ONE read of the session list, for both lists.
  const reads = (text.match(/facts\.sessions\(\)/g) ?? []).length;
  checked('O1');
  if (reads !== 1) {
    fail('O1', `${where(routes, blocked)}: blocked() reads facts.sessions() ${String(reads)} time(s). Both lists are cut from ONE read, or a session that moves between two reads is drawn twice or never.`);
  }
  // The complement: a set filled in the rows loop, and a filter that is its
  // negation by id.
  const sets = [...text.matchAll(/(\w+)\.add\(\s*\w+\.id\s*\)/g)].map((m) => m[1]);
  const complement = sets.some((set) =>
    new RegExp(`\\.filter\\(\\s*\\(?\\s*(\\w+)\\s*\\)?\\s*=>\\s*!\\s*${set}\\.has\\(\\s*\\1\\.id\\s*\\)\\s*\\)`).test(text)
  );
  checked('O1');
  if (!complement) {
    fail('O1', `${where(routes, blocked)}: others is not the complement of the blocked set by id (a set filled as the rows are built, and a filter that is its negation), so a session can be in both lists or in neither`);
  }
  checked('O1', 2);
  if (!/\.slice\(\s*0\s*,\s*POCKET_OTHERS_MAX\s*\)/.test(text)) {
    fail('O1', `${where(routes, blocked)}: others is not cut to POCKET_OTHERS_MAX, so a person with a thousand sessions is handed an answer of unbounded size`);
  }
  if (!/othersOmitted\s*:\s*\w+\.length\s*-\s*\w+\.length/.test(text)) {
    fail('O1', `${where(routes, blocked)}: othersOmitted is not the count the cap left out, so a phone cannot say how many it is not showing`);
  }
}

// ---------------------------------------------------------------------------
// T2 — fresh before read, and one turn shape
// ---------------------------------------------------------------------------

/**
 * The overview store is written only when Catch Me Up opens a project, the fold
 * runs or the session manager asks for counts (`../overview/service.ts`), so a
 * bare read answers stale for exactly the sessions a phone asks about
 * (build/p316/SPEC.md §2 row 7). The route asks the refresh FIRST; the one
 * production composer supplies it through `sessionActivity`, the one read path;
 * and every turn it answers goes through `toTurnView`, where the clip lives, so
 * clipping stays in one place. `probe:p313` T2 appends a turn to a real record
 * and reads it back through the door; this reads that no source can skip it.
 */
function turnReadRule() {
  const routes = moduleNamed('routes', 'T2', "Phase 316.1 builder A's");
  const facts = moduleNamed('facts', 'T2', "Phase 316.1 builder A's");
  if (routes !== null) {
    for (const [name, reads] of [
      ['session', /facts\.(?:catchUp|lastTurn)\(/],
      ['turns', /facts\.turns\(/]
    ]) {
      const method = returnedMethod(routes, 'createPocketRoutes', name);
      checked('T2');
      if (method === null) {
        fail('T2', `${rel(routes)}: createPocketRoutes answers no ${name}() this rule can read`);
        continue;
      }
      const text = codeOfNode(routes, method.body);
      const refreshAt = text.search(/await\s+refresh\(/);
      const readAt = text.search(reads);
      checked('T2');
      if (readAt === -1) {
        fail('T2', `${where(routes, method)}: ${name}() reads no conversation, so this rule cannot place the refresh before it`);
      } else if (refreshAt === -1 || refreshAt > readAt) {
        fail(
          'T2',
          `${where(routes, method)}: ${name}() reads the store before it awaits refresh(). The store is written only when Catch Me Up, the fold or the counts ask, so this answers what the conversation WAS.`
        );
      }
    }
    // The route's refresh asks the composer's.
    const helper = functionsNamed(routes, 'refresh');
    checked('T2');
    if (helper.length === 0 || !helper.some((fn) => /facts\.refresh\(/.test(codeOfNode(routes, fn)))) {
      fail('T2', `${rel(routes)} declares no refresh() that asks facts.refresh(), so the route's refresh brings nothing up to date`);
    }
  }
  if (facts === null) return;
  // The production composer SUPPLIES the refresh, through the one read path.
  const refresh = returnedMethod(facts, 'createPocketFacts', 'refresh');
  checked('T2');
  if (refresh === null) {
    fail('T2', `${rel(facts)}: createPocketFacts supplies no refresh, and the member is optional on PocketFacts, so the routes would read the store as they find it`);
  } else if (!/\bsessionActivity\(\s*[\w.]+\s*,\s*\{\s*sessionIds:\s*\[\s*\w+\s*\]\s*\}\s*\)/.test(codeOfNode(facts, refresh.body))) {
    fail('T2', `${where(facts, refresh)}: the composer's refresh does not call sessionActivity(deps, { sessionIds: [id] }), the one read path that brings a row up to date`);
  }
  // Every function that reads turns out of the store shapes them through
  // toTurnView, directly or through the one function that does.
  const shapers = new Set(['toTurnView']);
  for (const node of nodesOf(facts)) {
    if (!ts.isFunctionDeclaration(node) || node.name === undefined || node.body === undefined) continue;
    const calls = (codeOfNode(facts, node.body).match(/\btoTurnView\(/g) ?? []).length;
    if (calls === 1) shapers.add(node.name.text);
  }
  checked('T2');
  if (!shapers.has('pocketTurnOf')) {
    fail('T2', `${rel(facts)}: pocketTurnOf does not call toTurnView exactly once, so the turns the phone reads are clipped somewhere else, or twice, or not at all`);
  }
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name !== 'listTurns' && name !== 'listTurnsBetween') continue;
      checked('T2');
      // Walk up to the nearest function and ask whether it shapes what it read.
      let fn = call.parent;
      while (fn !== undefined && !ts.isFunctionLike(fn)) fn = fn.parent;
      const body = fn === undefined ? '' : codeOfNode(file, fn);
      const shaped = [...shapers].some((s) => new RegExp(`\\b${s}\\(`).test(body));
      const isProbe = /\.length\s*>\s*0/.test(call.parent?.getText?.(astOf(file)) ?? '') || /,\s*1\s*\)\s*\.length/.test(body);
      if (!shaped && !(isProbe && name === 'listTurnsBetween')) {
        fail('T2', `${where(file, call)}: ${name}() is read in a function that shapes nothing through toTurnView, so a turn reaches the phone unclipped`);
      }
    }
  }
  // No turn is BUILT anywhere else: an object carrying askText is composed only
  // by a function that shapes through toTurnView.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isObjectLiteralExpression(node)) continue;
      if (!node.properties.some((p) => memberName(p) === 'askText')) continue;
      checked('T2');
      const owner = enclosingName(node);
      if (owner === null || !shapers.has(owner) || owner === 'toTurnView') {
        if (owner !== null && shapers.has(owner)) continue;
        fail('T2', `${where(file, node)}: a turn is built in ${owner ?? 'module scope'}, which does not shape it through toTurnView. One definition clips the conversation.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// F2 — the QR is v:3, exactly eight keys, and pins the key (F1 became F2)
// ---------------------------------------------------------------------------

/** The QR's keys, in `JSON.stringify`'s order, and no others (SPEC §4.8.1). */
const QR_KEYS = ['v', 'host', 'port', 'fp', 'dk', 'dx', 'ps', 'exp'];

/**
 * The QR pins the door's PUBLIC KEY, from the door that is LISTENING, and it
 * carries nothing else a phone needs and nothing it must not have.
 *
 * v:1 carried `fp` from the certificate's hash, which a renewal moves (316.1);
 * v:2 carried `tk`, his tailnet key, in plain JSON that iOS's Camera shows to
 * whatever it offers to do with text (research 132 §10 item 1). v:3 carries
 * the public name and port a phone dials, the key pin, the Mac's two keys, the
 * one-shot secret and the deadline, and no credential and no address. The
 * hostile client re-derives the pin from the leaf the door serves; this reads
 * that no source can add a ninth key.
 */
function qrPinRule() {
  const pairing = moduleNamed('pairing', 'F2', "Phase 330 builder owner's");
  if (pairing === null) return;
  const open = methodOf(pairing, 'PocketPairing', 'open');
  checked('F2');
  if (open === null) {
    fail('F2', `${rel(pairing)}: PocketPairing declares no open(), so nothing composes the QR`);
    return;
  }
  // The payload literal is the argument of the JSON.stringify inside open().
  let payload = null;
  const walk = (n) => {
    if (ts.isCallExpression(n) && calleeName(n) === 'stringify' && n.arguments[0] !== undefined && ts.isObjectLiteralExpression(n.arguments[0])) {
      payload = n.arguments[0];
    }
    if (payload === null) ts.forEachChild(n, walk);
  };
  walk(open.body);
  checked('F2');
  if (payload === null) {
    fail('F2', `${where(pairing, open)}: open() composes no JSON.stringify({...}) payload this rule can read`);
    return;
  }
  // EXACTLY THE EIGHT KEYS, IN ORDER, and no spread that could add a ninth.
  const keys = payload.properties.map((p) => (ts.isSpreadAssignment(p) ? '...' : memberName(p) ?? '?'));
  checked('F2', 2);
  if (keys.join(',') !== QR_KEYS.join(',')) {
    fail('F2', `${where(pairing, payload)}: the QR's keys are ${JSON.stringify(keys)}, not ${JSON.stringify(QR_KEYS)} in that order. A key a phone does not read is a key somebody put there for another reason, and the vectors pin the order byte for byte.`);
  }
  for (const key of keys) {
    if (/^(?:tk|address|addr|ip|host4)$/i.test(key)) {
      fail('F2', `${where(pairing, payload)}: the QR carries \`${key}\`. v:3 carries no credential and no address.`);
    }
  }
  const prop = (name) =>
    payload.properties.find((p) => ts.isPropertyAssignment(p) && memberName(p) === name) ?? null;
  const v = prop('v');
  const fp = prop('fp');
  checked('F2', 2);
  const vValue =
    v === null
      ? null
      : ts.isNumericLiteral(v.initializer)
        ? Number(v.initializer.text)
        : ts.isIdentifier(v.initializer)
          ? constNumber(pairing, v.initializer.text)
          : null;
  if (vValue !== 3) {
    fail('F2', `${where(pairing, payload)}: the QR's v is ${JSON.stringify(vValue)}, not 3. A phone reads v to know the code names a public host and carries no key; a v:2 phone must refuse it rather than read a field that is not there.`);
  }
  if (fp === null) {
    fail('F2', `${where(pairing, payload)}: the QR carries no fp, so a phone has nothing to pin`);
    return;
  }
  const fpText = fp.initializer.getText(astOf(pairing));
  checked('F2');
  if (/certificate/i.test(fpText)) {
    fail('F2', `${where(pairing, fp)}: the QR's fp is ${JSON.stringify(fpText)}, the CERTIFICATE's hash. It is renewed every 397 days and every paired phone would stop trusting the door.`);
  }
  // The fp is a value that was asked of the door and refused when null, BEFORE
  // the window exists.
  const openText = codeOfNode(pairing, open.body);
  const pinVar = /const\s+(\w+)\s*=\s*this\.deps\.publicKeyPin\(\)/.exec(openText)?.[1] ?? null;
  checked('F2', 2);
  if (pinVar === null) {
    fail('F2', `${where(pairing, open)}: open() never asks this.deps.publicKeyPin(), so the QR's pin does not come from the listening door's key`);
  } else {
    if (fpText !== pinVar) {
      fail('F2', `${where(pairing, fp)}: fp is ${JSON.stringify(fpText)}, not the pin open() asked the door for (${pinVar})`);
    }
    const guard = new RegExp(`if\\s*\\(\\s*${pinVar}\\s*===\\s*null\\s*\\)\\s*throw\\b`).exec(openText);
    const windowAt = openText.search(/this\.window\s*=\s*\{/);
    if (guard === null || windowAt === -1 || guard.index > windowAt) {
      fail('F2', `${where(pairing, open)}: open() does not refuse a null pin before it makes the window, so a QR could carry fp: null and a phone would pin nothing`);
    }
  }
  // Nothing in the module can reach the certificate's hash any more.
  checked('F2');
  if (/certificateFingerprint/.test(codeTextOf(pairing))) {
    fail('F2', `${rel(pairing)} still names certificateFingerprint in its code. The pairing owner pins the key and has no use for the certificate's hash.`);
  }
  // The wiring: the host hands the pairing owner the LISTENING door's key pin.
  const ipc = moduleNamed('ipc', 'F2', "Phase 316.1 builder B's");
  if (ipc === null) return;
  let wiring = null;
  for (const node of nodesOf(ipc)) {
    if (ts.isPropertyAssignment(node) && memberName(node) === 'publicKeyPin') wiring = node;
  }
  checked('F2');
  if (wiring === null) {
    fail('F2', `${rel(ipc)} hands the pairing owner no publicKeyPin, so the QR's pin comes from nowhere this rule reads`);
  } else {
    const text = codeOfNode(ipc, wiring.initializer);
    if (/certificate/i.test(text) || !/publicKeyFingerprint/.test(text) || !/listening/.test(text) || !/spkiPinOf\(/.test(text)) {
      fail(
        'F2',
        `${where(ipc, wiring)}: publicKeyPin is ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 120))}. It must be spkiPinOf(the door's publicKeyFingerprint), and null unless the door is listening.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// L5 — the launch step binds only on confirmed fields
// ---------------------------------------------------------------------------

/** Every non-test .ts under src/main. */
function mainSources() {
  return sourcesUnder(join(ROOT, 'src', 'main'));
}

/**
 * CLAUDE.md refusal 8: nothing may cause a process to start on a
 * configuration change alone. Binding a listener a person confirmed is not
 * that; binding one because a file says `bindAtLaunch: true` is exactly that.
 * So the launch step asks THREE things — the switch, the at-launch flag and a
 * confirmed hash — and the one function that binds asks the gate again before
 * it reaches a socket. A later round that "simplifies" either half away turns
 * a hand-edited store into a door on his tailnet.
 */
/** The statement a call sits in, and the statement just before it, or null. */
function statementBefore(call) {
  let st = call;
  while (st.parent !== undefined && !(ts.isBlock(st.parent) || ts.isSourceFile(st.parent))) st = st.parent;
  const list = st.parent?.statements;
  if (list === undefined) return null;
  const at = list.indexOf(st);
  return at > 0 ? list[at - 1] : null;
}

/** Is this statement `if (this.superseded(<press>)) { … return … }`? */
function isLastPressCheck(file, statement) {
  if (statement === null || !ts.isIfStatement(statement)) return false;
  if (!/^this\.superseded\(\s*\w+\s*\)$/.test(codeOfNode(file, statement.expression).trim())) return false;
  const then = statement.thenStatement;
  if (ts.isReturnStatement(then)) return true;
  return ts.isBlock(then) && then.statements.some((x) => ts.isReturnStatement(x));
}

/**
 * CLAUDE.md refusal 8: nothing may cause a process to start on a
 * configuration change alone. Since Phase 330 the door starts TWO: its own
 * `utilityProcess` and the Funnel child that publishes it. So each is started
 * from one place, the host's queued start (or its restart), behind the gate a
 * person's confirmed hash answers, and the LAST PRESS is asked as the
 * statement immediately before each: an earlier ask reads the same today, and
 * it is the first thing a later round puts an await after. The launch step
 * asks the switch and the at-launch flag before it queues anything. A later
 * round that "simplifies" either half away turns a hand-edited store into a
 * door on the internet.
 */
function launchRule() {
  const ipc = moduleNamed('ipc', 'L5', "Phase 330 builder owner's");
  if (ipc === null) return;
  const STARTERS = ['openNow', 'recoverNow'];
  const gates = ['assertPocketDoorMayBind'];
  for (const node of nodesOf(ipc)) {
    if (!ts.isMethodDeclaration(node) || node.body === undefined || !ts.isIdentifier(node.name)) continue;
    if (/\bassertPocketDoorMayBind\(/.test(codeOfNode(ipc, node.body))) gates.push(`this.${node.name.text}`);
  }

  // (a) THE FORK AND THE SPAWN, each reached only from the queued start.
  for (const [starter, what] of [
    ['startPocketDoor', 'the fork of the door process'],
    ['startFunnel', 'the spawn of the Funnel child']
  ]) {
    const sites = [];
    for (const file of mainSources()) {
      for (const call of callsOf(file)) {
        if (calleeName(call) === starter) sites.push({ file, call });
      }
    }
    checked('L5', sites.length + 1);
    if (sites.length === 0) {
      fail('L5', `nothing in src/main calls ${starter}, so ${what} has no site this rule can read`);
    }
    for (const { file, call } of sites) {
      checked('L5', 3);
      const owner = enclosingName(call);
      if (file !== ipc || !STARTERS.includes(owner ?? '')) {
        fail(
          'L5',
          `${where(file, call)}: ${what} is reached from ${owner ?? 'module scope'}${file !== ipc ? ` in ${rel(file)}` : ''}. ` +
            'It is reached only from PocketHost.openNow() or recoverNow(), which run inside the switch’s one queue behind the gate.'
        );
        continue;
      }
      // (b) BEHIND THE GATE: the method asks it before the call.
      const method = methodOf(ipc, 'PocketHost', owner);
      const text = method === null ? '' : codeTextOf(ipc).slice(method.getStart(astOf(ipc)), call.getStart(astOf(ipc)));
      if (!gates.some((gate) => new RegExp(`${gate.replace('.', '\\.')}\\(`).test(text))) {
        fail('L5', `${where(ipc, call)}: ${owner}() does not ask the gate (${gates.join(', ')}) before ${starter}, so a door nobody confirmed could start a process`);
      }
      // For the FORK, nothing is awaited between the LAST time the gate is
      // asked and the fork: the read of Tailscale can move a hashed field (it
      // writes the facts it observed), so a gate asked before it answers for
      // a world that may have moved.
      if (starter === 'startPocketDoor') {
        let last = -1;
        let lastEnd = -1;
        for (const gate of gates) {
          for (const m of text.matchAll(new RegExp(`${gate.replace('.', '\\.')}\\(`, 'g'))) {
            if (m.index > last) {
              last = m.index;
              lastEnd = m.index + m[0].length;
            }
          }
        }
        if (last !== -1 && /\bawait\b/.test(text.slice(lastEnd).replace(/await\s*$/, ''))) {
          fail('L5', `${where(ipc, call)}: something is awaited between the last time ${owner}() asks the gate and the fork, so the gate's answer is about a world the await may have moved (the read of Tailscale writes the facts it observed, which moves the hash)`);
        }
      }
      // (c) THE LAST PRESS, as the statement immediately before.
      const before = statementBefore(call);
      if (!isLastPressCheck(ipc, before)) {
        fail(
          'L5',
          `${where(ipc, call)}: the statement immediately before ${starter} is not \`if (this.superseded(press)) … return\` ` +
            `(it is ${JSON.stringify(before === null ? '(nothing)' : codeOfNode(ipc, before).replace(/\s+/g, ' ').slice(0, 100))}), so a start already past its gate starts ${what.replace(/^the /, 'a ')} after the person switched the door off`
        );
      }
    }
  }
  const start = methodOf(ipc, 'PocketHost', 'openNow');
  checked('L5');
  if (start === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no openNow(), the start as it runs inside the switch's queue`);
  }

  // (e) THE SWITCH-OFF, the 316.1 fix round (the attack's X1). A start that
  // was already past its gate when the switch went off used to re-read the
  // switch inside the off's own stop, find it still on, and bind a door the
  // sheet then called off. So the off counts itself as the LAST PRESS and
  // writes the store BEFORE its first await, and openNow() asks whether a
  // later press arrived with nothing awaited between the asking and the bind.
  const setDoor = methodOf(ipc, 'PocketHost', 'setDoor');
  checked('L5', 2);
  if (setDoor === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no setDoor(), so this rule cannot read the switch-off`);
  } else {
    const offBranch = nodesOf(ipc).find(
      (n) =>
        ts.isIfStatement(n) &&
        n.pos >= setDoor.pos &&
        n.end <= setDoor.end &&
        /^!\s*on$/.test(codeOfNode(ipc, n.expression).trim())
    );
    const offText = offBranch === undefined ? '' : codeOfNode(ipc, offBranch.thenStatement);
    const firstAwait = offText.search(/\bawait\b/);
    const counted = offText.search(/this\.pressed\(\)/);
    const written = offText.search(/writePocketStore\(|this\.writeStore\(/);
    if (offBranch === undefined) {
      fail('L5', `${where(ipc, setDoor)}: setDoor() has no \`if (!on)\` branch, so this rule cannot read where the switch-off is recorded`);
    } else if (counted === -1 || written === -1 || firstAwait === -1 || counted > firstAwait || written > firstAwait) {
      fail(
        'L5',
        `${where(ipc, offBranch)}: the switch-off does not both count itself as the last press (this.pressed()) and write the store BEFORE its first await, so a switch-on already waiting on the sessions re-reads a switch that still says on and binds a door the sheet calls off`
      );
    }
  }
  // (c) the launch step: it returns before start() unless the person turned
  // the door on AND asked for it at launch. The CONFIRMED hash is (b)'s, and
  // (b) holds on every path to the bind, this one included.
  const launch = methodOf(ipc, 'PocketHost', 'openAtLaunch');
  checked('L5');
  if (launch === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no openAtLaunch(), so there is no launch step this rule can read`);
  } else {
    const statements = launch.body.statements;
    const startAt = statements.findIndex((s) => /\bthis\.start\(/.test(codeOfNode(ipc, s)));
    const before = startAt === -1 ? [] : statements.slice(0, startAt);
    const guards = before.filter((s) => ts.isIfStatement(s) && /\breturn\b/.test(codeOfNode(ipc, s.thenStatement)));
    const guardText = guards.map((g) => codeOfNode(ipc, g.expression)).join('\n');
    checked('L5', 2);
    if (startAt === -1) {
      fail('L5', `${where(ipc, launch)}: openAtLaunch() never reaches this.start() at its top level, so this rule cannot read what guards it`);
    } else if (!/!\s*[\w.?]*\benabled\b/.test(guardText) || !/!\s*[\w.?]*\bbindAtLaunch\b/.test(guardText)) {
      fail(
        'L5',
        `${where(ipc, launch)}: the launch step does not return before start() unless BOTH enabled and bindAtLaunch are true, so a door a person turned off, or never asked for at launch, would open when Tortie starts`
      );
    }
  }

  // (d) the capability calls the launch step and nothing that skips it.
  const capabilities = join(ROOT, 'src', 'main', 'capabilities.ts');
  checked('L5');
  if (!existsSync(capabilities)) {
    fail('L5', 'src/main/capabilities.ts does not exist');
  } else {
    const text = codeTextOf(capabilities);
    if (!/\.openAtLaunch\(/.test(text)) {
      fail('L5', 'src/main/capabilities.ts never calls openAtLaunch(), so the door never comes up with the app however a person set it');
    }
    if (/\bstartPocketDoor\s*\(/.test(text) || /\b\w*(?:pocket|host)\w*\.start\(/i.test(text)) {
      fail('L5', 'src/main/capabilities.ts starts the door directly rather than through openAtLaunch(), which is the one launch path that asks for a confirmed hash');
    }
  }
}

// ---------------------------------------------------------------------------
// A4 — refusal 7, by generation (the 316.1 fix round, rebuilt by Phase 330)
// ---------------------------------------------------------------------------

/**
 * The attack's R1 of 316.1: a phone removed while its request was inside the
 * refresh still got its answer, read from the store AFTER the person pressed
 * Remove. Since Phase 330 the request crosses a process boundary twice, so the
 * last ask is made in TWO places: the handler (server.ts) asks the verified
 * phone and the door instance once the answer is composed, and main's side of
 * the wire (bind.ts) asks that request's GENERATION again before it posts, with
 * nothing awaited between. A request for a generation that is not the door's,
 * or whose door has begun to stop, never reaches a handler at all.
 */
function answerReadmitRule() {
  // (a) server.ts: between the answer's await and the one 200 it returns, the
  // verified phone and the door instance are asked, and nothing is awaited.
  const server = moduleNamed('server', 'A4', "Phase 330 builder door's");
  if (server !== null) {
    const handler = nodesOf(server).find(
      (n) =>
        (ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isArrowFunction(n)) &&
        /await\s+deps\.answer\(/.test(codeOfNode(server, n)) &&
        !nodesOf(server).some(
          (inner) =>
            inner !== n &&
            inner.pos >= n.pos &&
            inner.end <= n.end &&
            (ts.isFunctionExpression(inner) || ts.isArrowFunction(inner)) &&
            /await\s+deps\.answer\(/.test(codeOfNode(server, inner))
        )
    );
    checked('A4', 3);
    if (handler === undefined) {
      fail('A4', `${rel(server)}: no request handler awaits deps.answer(, so this rule cannot read what is asked before the answer leaves`);
    } else {
      const text = codeOfNode(server, handler);
      const answerAt = text.search(/await\s+deps\.answer\(/);
      let sendAt = -1;
      for (const m of text.matchAll(/return\s*\{\s*status:\s*200\b/g)) sendAt = m.index;
      const between = sendAt > answerAt ? text.slice(answerAt, sendAt).replace(/^await\s+deps\.answer\(/, '') : '';
      if (sendAt === -1 || sendAt < answerAt) {
        fail('A4', `${where(server, handler)}: the composed answer is not returned with a 200 after deps.answer(, so this rule cannot read the last ask`);
      } else {
        if (!/deps\.stillPaired\(\s*\w+\s*\)/.test(between)) {
          fail('A4', `${where(server, handler)}: nothing between the composed answer and its return asks deps.stillPaired( of the phone the request was verified for, so a phone Removed while its request was in flight is answered from the store as it stood after the press`);
        }
        if (!/\.stopping\(\)|\bclosing\(\)/.test(between) || !/door\?\.stopping\(\)|door\.stopping\(\)/.test(text)) {
          fail('A4', `${where(server, handler)}: nothing between the composed answer and its return asks the door INSTANCE that accepted the request whether it has begun to stop, so an answer composed inside a switch-off's join leaves a door the person closed`);
        }
        if (/\bawait\b/.test(between)) {
          fail('A4', `${where(server, handler)}: something is awaited between the last ask and the return, so the ask answers for a world that may have moved before the answer leaves`);
        }
      }
      checked('A4');
      if (!/\w+\s*=\s*verdict\.phoneId\b/.test(text)) {
        fail('A4', `${where(server, handler)}: the handler never keeps the phone its verify answered (verdict.phoneId), so the last ask cannot be about the phone this request came from`);
      }
    }
  }

  // (b) bind.ts: BY GENERATION. The dispatch asks the request's generation's
  // admission before any handler sees it, hands the handler THAT admission, and
  // asks it again after the handler answers with nothing awaited before the post.
  const bind = moduleNamed('bind', 'A4', "Phase 330 builder door's");
  if (bind !== null) {
    const text = codeTextOf(bind);
    checked('A4', 5);
    if (!/stopping\s*:\s*\(\)\s*=>\s*this\.shuttingDown\b/.test(text)) {
      fail('A4', `${rel(bind)}: the admission a door hands its handlers does not answer from THIS door's shuttingDown, so a stop that drops the module's door first leaves the handler asking about nothing`);
    }
    if (!/admissions\.set\(\s*this\.generation\s*,\s*this\.admission\s*\)/.test(text)) {
      fail('A4', `${rel(bind)}: no door process records its admission by its generation, so a request cannot be asked about the door that accepted it`);
    }
    const handles = callsOf(bind).filter((c) => calleeName(c) === 'handle');
    if (handles.length !== 1 || handles[0].arguments.length !== 2) {
      fail('A4', `${rel(bind)}: the handler is called ${String(handles.length)} time(s)${handles[0] !== undefined ? ` with ${String(handles[0].arguments.length)} argument(s)` : ''}. It is called once, with the request and the admission of the generation that forwarded it.`);
    } else {
      const call = handles[0];
      let fn = call.parent;
      while (fn !== undefined && !(ts.isMethodDeclaration(fn) && fn.name !== undefined && ts.isIdentifier(fn.name))) fn = fn.parent;
      const body = fn === undefined ? '' : codeOfNode(bind, fn);
      const callAt = body.search(/await\s+handle\(/);
      const beforeCall = callAt === -1 ? '' : body.slice(0, callAt);
      if (!/admissions\.get\(\s*generation\s*\)/.test(beforeCall) || !/\.stopping\(\)/.test(beforeCall) || !/generation\s*!==\s*this\.generation/.test(beforeCall)) {
        fail('A4', `${where(bind, call)}: before the handler runs, the dispatch does not ask for the request's generation's admission, compare the generation with this door's and ask whether that door is stopping, so a request stamped for a stopped or foreign door reaches a handler`);
      }
      const afterCall = callAt === -1 ? '' : body.slice(callAt).replace(/^await\s+handle\(/, '');
      const postAt = afterCall.search(/this\.post\(\s*\{\s*kind:\s*'answer'/);
      const between = postAt === -1 ? '' : afterCall.slice(0, postAt);
      if (postAt === -1 || !/\.stopping\(\)/.test(between) || /\bawait\b/.test(between)) {
        fail('A4', `${where(bind, call)}: after the handler answers, the dispatch does not ask the admission again with nothing awaited before it posts the answer, so an answer composed as the door began to stop is posted`);
      }
      // PHASE 317 (build/p317/SPEC.md D4, §6.1). The replace is guarded by
      // `acted`: the door stopping after a write acted does not make the act
      // not have happened, and a 404 would tell the phone it had not.
      if (fn !== undefined && ts.isMethodDeclaration(fn)) {
        const post = descendantsOf(fn).find((n) => ts.isCallExpression(n) && calleeName(n) === 'post' && /^\s*\{\s*kind:\s*'answer'/.test(n.arguments[0]?.getText() ?? '') && n.getStart() > call.getStart());
        const replaces = descendantsOf(fn).filter(
          (n) =>
            ts.isIfStatement(n) &&
            n.getStart() > call.getStart() &&
            (post === undefined || n.getStart() < post.getStart()) &&
            /\banswer\s*=\s*REFUSED\b/.test(n.thenStatement.getText())
        );
        checked('A4', 2);
        if (replaces.length === 0) {
          fail('A4', `${where(bind, call)}: no replace of the answer by REFUSED is read between the handler and the post`);
        }
        for (const r of replaces) {
          const cond = r.expression.getText();
          if (!/\.stopping\(\)/.test(cond) || !/\.acted\s*!==\s*true/.test(cond)) {
            fail('A4', `${where(bind, r)}: the answer is replaced by a 404 on ${JSON.stringify(cond)} without asking answer.acted !== true, so the door stopping after a write acted tells the phone nothing was done`);
          }
        }
      }
    }
  }

  // (c) ipc.ts: the host answers the phone question from its store, and the
  // verify it hands the handler names the phone.
  const ipc = moduleNamed('ipc', 'A4', "Phase 316.1 builder B's");
  if (ipc !== null) {
    // ONE answer reads the store; since Phase 317 the handler and the write
    // path are each handed it, so every other stillPaired is a one-line
    // delegate to that one, and nothing answers the question a second way.
    const paired = functionsNamed(ipc, 'stillPaired');
    const delegate = (fn) => {
      const body = ts.isBlock(fn.body) ? (fn.body.statements.length === 1 && ts.isReturnStatement(fn.body.statements[0]) ? fn.body.statements[0].expression : undefined) : fn.body;
      const param = fn.parameters[0] !== undefined && ts.isIdentifier(fn.parameters[0].name) ? fn.parameters[0].name.text : null;
      return body !== undefined && param !== null && body.getText().replace(/\s+/g, '') === `this.stillPaired(${param})`;
    };
    const readers = paired.filter((fn) => !delegate(fn));
    checked('A4', 2);
    if (readers.length !== 1) {
      fail('A4', `${rel(ipc)} declares ${String(readers.length)} stillPaired answers that are not a delegate to this.stillPaired(; the host answers the question exactly one way`);
    } else {
      const body = codeOfNode(ipc, readers[0]);
      if (!/\bphones\b/.test(body) || !/readStore\(|fields\(/.test(body) || !/phoneId/.test(body)) {
        fail('A4', `${where(ipc, readers[0])}: stillPaired does not look the phone up in the store's phones (${JSON.stringify(body.replace(/\s+/g, ' ').slice(0, 90))}), so the last ask answers something other than "is this phone still allowed"`);
      }
    }
    if (!/phoneId\s*:\s*verdict\.phone\.id\b/.test(codeTextOf(ipc))) {
      fail('A4', `${rel(ipc)}: the verify the host hands the handler does not name the phone it verified (phoneId: verdict.phone.id)`);
    }
    // (d) the premise: a Remove writes the store before its first await, so
    // the handler's last ask already sees the phone gone. (Phase 317's build
    // moved the write into a dropPhone its unpair shared; the fix round took
    // the unpair out and put removePhone back as it was.)
    const remove = methodOf(ipc, 'PocketHost', 'removePhone');
    checked('A4');
    if (remove === null) {
      fail('A4', `${rel(ipc)}: PocketHost declares no removePhone()`);
    } else {
      const text = codeOfNode(ipc, remove);
      const writeAt = text.search(/writePocketStore\(|this\.writeStore\(/);
      const awaitAt = text.search(/\bawait\b/);
      if (writeAt === -1 || (awaitAt !== -1 && awaitAt < writeAt)) {
        fail('A4', `${where(ipc, remove)}: removePhone() awaits before it writes the phone out of the store, so a request in flight is asked about a phone that is still there`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// H2 — no ssh hand-off
// ---------------------------------------------------------------------------

/**
 * The phone's tailnet node is private to the app, so no other app on the phone
 * can dial through it, and the grant he pastes allows only the door's port: an
 * `ssh://` link could never reach anything (build/p316/SPEC.md §2 row 17). And
 * "Open in Claude" is unmeasured (§2 row 20), so the hand-off answers null.
 */
function handoffRule() {
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const handoff = existsSync(contract) ? interfaceOf(contract, 'PocketHandoff') : null;
  checked('H2');
  if (handoff === null) {
    fail('H2', 'src/shared/ipc/pocket.ts declares no PocketHandoff, so nothing here reads its kinds');
  } else {
    const kind = handoff.members.find((m) => memberName(m) === 'kind');
    const kinds = [];
    const collect = (n) => {
      if (ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)) kinds.push(n.literal.text);
      ts.forEachChild(n, collect);
    };
    if (kind?.type !== undefined) collect(kind.type);
    checked('H2');
    if (kinds.includes('ssh')) {
      fail('H2', `${where(contract, kind)}: PocketHandoff.kind still admits 'ssh'. Nothing on the phone can dial ssh through the app's own node, and the grant allows the door's port alone.`);
    }
  }
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('H2');
      if (/ssh:\/\//i.test(text) || /\battach(?:-session)?\s+-t\b/.test(text)) {
        fail('H2', `${where(file, node)} composes ${JSON.stringify(text.slice(0, 60))}, an ssh or tmux hand-off. The door hands off nothing in Phase 316.`);
      }
    }
  }
  const facts = moduleNamed('facts', 'H2', "Phase 316.1 builder A's");
  if (facts === null) return;
  const answers = functionsNamed(facts, 'handoff');
  checked('H2');
  if (answers.length === 0) {
    fail('H2', `${rel(facts)} answers no handoff member, so this rule cannot read that it is null`);
    return;
  }
  for (const fn of answers) {
    checked('H2');
    const body = fn.body;
    const isNull = (e) => e !== undefined && e.kind === ts.SyntaxKind.NullKeyword;
    const answersNull =
      body !== undefined &&
      (isNull(body) ||
        (ts.isBlock(body) &&
          body.statements.length === 1 &&
          ts.isReturnStatement(body.statements[0]) &&
          isNull(body.statements[0].expression)));
    if (!answersNull) {
      fail('H2', `${where(facts, fn)}: the hand-off answers ${JSON.stringify(codeOfNode(facts, fn).replace(/\s+/g, ' ').slice(0, 100))}. It answers null for every session in Phase 316: "Open in Claude" waits for a phase that measures where the URL is recorded.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Q1 — the switch handles one press at a time (his ruling, 2026-09-23)
// ---------------------------------------------------------------------------

/**
 * The 316.1 reverify: on, off, on, off inside one turn left the sealed store
 * and the sheet saying OFF and the door LISTENING, and a paired phone read 200.
 * The second on waited inside `./bind.ts` for the first on's socket, the second
 * off found no door to stop, and the second on bound after it. His ruling was
 * one narrow fix: every start and stop goes through ONE serial queue owned by
 * PocketHost, and the last press decides. Every clause below is one line a
 * later "simplification" deletes with every unit test that does not interleave
 * presses still green, which is why each is read here rather than trusted.
 */
function switchQueueRule() {
  const ipc = moduleNamed('ipc', 'Q1', "Phase 316.1 builder B's");
  if (ipc === null) return;
  const serially = methodOf(ipc, 'PocketHost', 'serially');
  const openNow = methodOf(ipc, 'PocketHost', 'openNow');
  const closeNow = methodOf(ipc, 'PocketHost', 'closeNow');
  const closeNowUnless = methodOf(ipc, 'PocketHost', 'closeNowUnlessConfirmed');
  const pressed = methodOf(ipc, 'PocketHost', 'pressed');
  const setDoor = methodOf(ipc, 'PocketHost', 'setDoor');
  checked('Q1', 6);
  for (const [name, node] of [
    ['serially', serially],
    ['openNow', openNow],
    ['closeNow', closeNow],
    ['closeNowUnlessConfirmed', closeNowUnless],
    ['pressed', pressed],
    ['setDoor', setDoor]
  ]) {
    if (node === null) fail('Q1', `${rel(ipc)}: PocketHost declares no ${name}(), so there is no switch this rule can read`);
  }
  if (serially === null || openNow === null || closeNow === null || closeNowUnless === null || pressed === null || setDoor === null) return;

  // (a) THE QUEUE. The job is chained on ONE tail, and the tail is replaced by
  // one that swallows the job's rejection, so a failed press cannot stop the
  // next one. A queue that ran the job at once is no queue at all.
  const job = serially.parameters[0]?.name;
  const jobName = job !== undefined && ts.isIdentifier(job) ? job.text : null;
  const body = codeOfNode(ipc, serially.body);
  const chained = jobName === null ? null : new RegExp(`const\\s+(\\w+)\\s*=\\s*this\\.(\\w+)\\.then\\(\\s*${jobName}\\s*\\)`).exec(body);
  checked('Q1');
  if (chained === null) {
    fail('Q1', `${where(ipc, serially)}: serially() does not chain its job on the queue's tail (\`const run = this.<tail>.then(job)\`), so two presses can be inside the door at once`);
  } else {
    const [, run, tail] = chained;
    const replaced = new RegExp(`this\\.${tail}\\s*=\\s*${run}\\.then\\(\\s*\\(\\)\\s*=>\\s*undefined\\s*,\\s*\\(\\)\\s*=>\\s*undefined\\s*\\)`).test(body);
    const returned = new RegExp(`return\\s+${run}\\b`).test(body);
    const assignedElsewhere = nodesOf(ipc).filter(
      (n) =>
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(n.left) &&
        n.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
        n.left.name.text === tail &&
        !(n.pos >= serially.pos && n.end <= serially.end)
    );
    checked('Q1', 3);
    if (!replaced) fail('Q1', `${where(ipc, serially)}: serially() does not replace the tail with one that swallows the job's rejection, so one failed press would stop every press after it`);
    if (!returned) fail('Q1', `${where(ipc, serially)}: serially() does not answer the job itself, so a caller cannot wait for its own press`);
    for (const n of assignedElsewhere) fail('Q1', `${where(ipc, n)}: the queue's tail (this.${tail}) is assigned outside serially(), which cuts the queue in two`);
  }

  // (b) THE STOPS, of the door process and of the Funnel child, and the
  // child's start and the orphan sweep, are each called only from a method
  // that runs inside a queued job (Phase 330: the child is started and
  // stopped beside the door, never beside the queue).
  // PHASE 333.1 (build/p3331/SPEC.md §6.1, §Attack F1): readOnReturn, the
  // return's read on unconfirmed fields, runs only inside recheck()'s queued
  // job and calls this.sweepAndRead(), so it is a job; without it Q1 reads the
  // correct code red.
  const JOBS = new Set(['openNow', 'recoverNow', 'closeNow', 'closeNowUnlessConfirmed', 'unpublish', 'sweepAndRead', 'readAtPress', 'readOnReturn']);
  const inQueue = (call) => {
    let n = call.parent;
    while (n !== undefined) {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        n.expression.name.text === 'serially' &&
        n.arguments.some((a) => call.pos >= a.pos && call.end <= a.end)
      ) {
        return 'queue';
      }
      if (ts.isMethodDeclaration(n) && n.name !== undefined && ts.isIdentifier(n.name)) {
        return JOBS.has(n.name.text) ? 'job' : `method ${n.name.text}()`;
      }
      n = n.parent;
    }
    return 'module scope';
  };
  const sitesOf = (name) => {
    const out = [];
    for (const file of mainSources()) {
      if (file.endsWith(join('pocket', 'bind.ts')) || file.endsWith(join('pocket', 'funnel.ts'))) continue;
      for (const call of callsOf(file)) if (calleeName(call) === name) out.push({ file, call });
    }
    return out;
  };
  for (const name of ['stopPocketDoor', 'startFunnel', 'sweepFunnelOrphan']) {
    const sites = sitesOf(name);
    checked('Q1', sites.length + 1);
    if (sites.length === 0) fail('Q1', `nothing in src/main calls ${name}, so this rule cannot read that it runs inside the queue`);
    for (const { file, call } of sites) {
      const verdict = file === ipc ? inQueue(call) : `${rel(file)}`;
      if (verdict !== 'queue' && verdict !== 'job') {
        fail('Q1', `${where(file, call)}: ${name} is called from ${verdict}, outside the switch's queue, so it can run beside another press`);
      }
    }
  }
  // The Funnel child's own stop: every `.stop()` on a run the host holds.
  for (const call of callsOf(ipc)) {
    if (calleeName(call) !== 'stop' || call.arguments.length !== 0) continue;
    const e = call.expression;
    if (!ts.isPropertyAccessExpression(e) || !/\brun\b/i.test(e.expression.getText(astOf(ipc)))) continue;
    checked('Q1');
    const verdict = inQueue(call);
    if (verdict !== 'queue' && verdict !== 'job') {
      fail('Q1', `${where(ipc, call)}: the Funnel child is stopped from ${verdict}, outside the switch's queue, so a start can be publishing a child the stop does not know about`);
    }
  }

  // (c) REACHED ONLY FROM INSIDE A QUEUED JOB. Every call of the start, the
  // restart and the stops is an argument of this.serially(...), or is made by
  // a method that itself only ever runs inside one.
  const viaQueue = { openNow: 0, closeNow: 0, closeNowUnlessConfirmed: 0, recoverNow: 0, unpublish: 0, sweepAndRead: 0, readAtPress: 0, readOnReturn: 0 };
  for (const call of callsOf(ipc)) {
    const e = call.expression;
    if (!ts.isPropertyAccessExpression(e) || e.expression.kind !== ts.SyntaxKind.ThisKeyword) continue;
    const name = e.name.text;
    if (!(name in viaQueue)) continue;
    checked('Q1');
    const verdict = inQueue(call);
    if (verdict === 'queue') viaQueue[name] += 1;
    else if (verdict !== 'job') {
      fail('Q1', `${where(ipc, call)}: this.${name}() is called from ${verdict} outside this.serially(...), so a start or a stop can run beside another press`);
    }
  }
  checked('Q1', 2);
  if (viaQueue.openNow === 0 && viaQueue.recoverNow === 0) fail('Q1', `${rel(ipc)}: nothing reaches openNow() or recoverNow() through this.serially(...), so the queue holds no start and this rule proved nothing`);
  if (viaQueue.closeNow === 0) fail('Q1', `${rel(ipc)}: nothing reaches closeNow() through this.serially(...), so the queue holds no stop and this rule proved nothing`);
  checked('Q1');
  if (viaQueue.readOnReturn === 0) fail('Q1', `${rel(ipc)}: nothing reaches readOnReturn() through this.serially(...) (Phase 333.1), so the return's read on unconfirmed fields runs outside the queue, beside another press, or not at all`);

  // (d) BOTH HALVES OF THE SWITCH count themselves as the last press before
  // their first await, and their first await is the queue.
  const offBranch = nodesOf(ipc).find(
    (n) => ts.isIfStatement(n) && n.pos >= setDoor.pos && n.end <= setDoor.end && /^!\s*on$/.test(codeOfNode(ipc, n.expression).trim())
  );
  checked('Q1', 2);
  if (offBranch === undefined) {
    fail('Q1', `${where(ipc, setDoor)}: setDoor() has no \`if (!on)\` branch, so this rule cannot read the two halves of the switch`);
  } else {
    const halves = [
      ['the off', codeOfNode(ipc, offBranch.thenStatement)],
      ['the on', codeTextOf(ipc).slice(offBranch.getEnd(), setDoor.body.getEnd())]
    ];
    for (const [half, text] of halves) {
      const counted = text.search(/this\.pressed\(\)/);
      const firstAwait = text.search(/\bawait\b/);
      // PHASE 330: the on half queues its start and does NOT await it, so no
      // IPC answer waits on Tailscale's approval (SPEC §4.3); an await it does
      // make is the queue's own, or inside the queued job.
      if (counted === -1 || (firstAwait !== -1 && counted > firstAwait)) {
        fail('Q1', `${where(ipc, setDoor)}: ${half} half of setDoor() does not count itself as the last press (this.pressed()) before its first await, so a start of an earlier press cannot tell it no longer decides`);
      } else if (firstAwait !== -1 && !/^await\s+this\.serially\(/.test(text.slice(firstAwait)) && !/this\.serially\(\s*async/.test(text.slice(0, firstAwait))) {
        fail('Q1', `${where(ipc, setDoor)}: ${half} half of setDoor() awaits something other than this.serially(...) first, so it reaches the door outside the queue`);
      }
    }
  }

  // (e) THE LAST PRESS DECIDES. pressed() settles the previous press before it
  // replaces it; openNow() races the wait on the sessions against its press, and
  // after the bind a superseded press closes what it opened before its job ends.
  const pressedText = codeOfNode(ipc, pressed.body);
  const settles = pressedText.search(/\.supersede\(\)/);
  const replaces = pressedText.search(/this\.\w+\s*=\s*pressNumbered\(/);
  checked('Q1', 3);
  if (settles === -1 || replaces === -1 || settles > replaces) {
    fail('Q1', `${where(ipc, pressed)}: pressed() does not settle the previous press (supersede()) before it replaces it, so a start waiting on the sessions keeps waiting after a later press arrived`);
  }
  const openText = codeTextOf(ipc).slice(openNow.body.getStart(astOf(ipc)), openNow.body.getEnd());
  if (!/Promise\.race\(\s*\[\s*this\.deps\.beforeOpen\(\)\s*,\s*press\.superseded\s*\]\s*\)/.test(openText)) {
    fail('Q1', `${where(ipc, openNow)}: openNow() does not race the wait on the sessions against its press's superseded promise, so every press queued behind a start waits for the sessions to come up`);
  }
  const bindAt = openText.search(/startPocketDoor\(/);
  const after = bindAt === -1 ? '' : openText.slice(bindAt);
  const askAfter = after.search(/if\s*\(\s*this\.superseded\(\s*press\s*\)\s*\)/);
  const stopAfter = after.search(/stopPocketDoor\(|this\.closeNow\(/);
  const refusalAfter = after.search(/this\.startRefusal\s*=|this\.lastRefusal\s*=/);
  if (askAfter === -1 || stopAfter === -1 || stopAfter < askAfter || (refusalAfter !== -1 && stopAfter > refusalAfter)) {
    fail('Q1', `${where(ipc, openNow)}: after startPocketDoor, openNow() does not ask whether a later press arrived and stop what it forked before it says anything, so a door process that started under a superseded press is still answering when the next press runs`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 330 — the door on the internet (build/p330/SPEC.md §6.1)
// ---------------------------------------------------------------------------

/** The production sources of the processes that can start one. */
function processSources() {
  return [
    ...sourcesUnder(join(ROOT, 'src', 'main')),
    ...sourcesUnder(join(ROOT, 'src', 'shared')),
    ...sourcesUnder(join(ROOT, 'src', 'preload'))
  ];
}

/** A string element's text, or null. */
const literalText = (node) =>
  node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

/** Is this a `head${one part}` template with nothing after its one part? */
const isOnePartTemplate = (node, head) =>
  node !== undefined &&
  ts.isTemplateExpression(node) &&
  node.head.text === head &&
  node.templateSpans.length === 1 &&
  node.templateSpans[0].literal.text === '';

// ---------------------------------------------------------------------------
// U1 — the Funnel argv, exactly
// ---------------------------------------------------------------------------

/**
 * The flags and subcommands that would make the child something other than a
 * foreground, raw, loopback publish of the door. `--bg` outlives Tortie and
 * comes back after every reboot; the TLS-terminating modes cannot be pinned
 * (`ipn/ipnlocal/cert.go:646`); `reset`, `off` and `clear` would take down
 * whatever HE serves (research 132 §9 condition 5).
 */
const FORBIDDEN_TAILSCALE_FLAGS = ['--bg', '--https', '--http', '--tls-terminated-tcp', '--set-path', '--yes', '--service'];
const FORBIDDEN_SUBCOMMANDS = ['reset', 'off', 'clear'];

function funnelArgvRule() {
  const funnel = moduleNamed('funnel', 'U1', "Phase 330 builder owner's");
  // (a) No forbidden flag, as a token, anywhere a process could be started
  // from. The renderer starts nothing, and names `--yes` for agents' own
  // command lines, so it is not read here.
  for (const file of processSources()) {
    const raw = readFileSync(file, 'utf8');
    if (!/--(?:bg|https?|tls-terminated-tcp|set-path|yes|service)\b/.test(raw)) continue;
    for (const { node, text } of codeStringsOf(file)) {
      checked('U1');
      const tokens = text.split(/\s+/);
      const hit = FORBIDDEN_TAILSCALE_FLAGS.find((flag) => tokens.some((t) => t === flag || t.startsWith(`${flag}=`)));
      if (hit !== undefined) {
        fail('U1', `${where(file, node)} names ${JSON.stringify(hit)}. The Funnel child is foreground, raw TCP and loopback, and nothing in src/ may ask Tailscale for anything else.`);
      }
    }
  }
  // (b) Every argv that names `funnel` or `serve` is one of the two shapes,
  // with the subcommand first: the program is the spawn's FILE, never an
  // element a later round can put a flag in front of.
  let funnelShapes = 0;
  for (const file of processSources()) {
    const raw = readFileSync(file, 'utf8');
    if (!/'(?:funnel|serve)'/.test(raw)) continue;
    for (const node of nodesOf(file)) {
      if (!ts.isArrayLiteralExpression(node)) continue;
      const texts = node.elements.map(literalText);
      const at = texts.findIndex((t) => t === 'funnel' || t === 'serve');
      if (at === -1) continue;
      checked('U1', 2);
      const e = node.elements;
      const sub = texts[at];
      for (const word of FORBIDDEN_SUBCOMMANDS) {
        if (texts.includes(word)) fail('U1', `${where(file, node)}: an argv that names ${sub} also names ${JSON.stringify(word)}. Tortie never resets, turns off or clears his serve config.`);
      }
      if (at !== 0 || file !== funnel) {
        fail('U1', `${where(file, node)}: an argv names ${JSON.stringify(sub)} ${at !== 0 ? `at position ${String(at)}, not first` : `outside ${funnel === null ? 'funnel.ts' : rel(funnel)}`}. The two Tailscale argv are spelled in funnel.ts alone, subcommand first.`);
        continue;
      }
      if (sub === 'funnel') {
        funnelShapes += 1;
        const exact =
          e.length === 4 &&
          isOnePartTemplate(e[1], '--tcp=') &&
          texts[2] === '--proxy-protocol=2' &&
          e[3] !== undefined &&
          ts.isTemplateExpression(e[3]) &&
          e[3].head.text.startsWith('tcp://');
        if (!exact) {
          fail('U1', `${where(file, node)}: the funnel argv is ${JSON.stringify(node.getText(astOf(file)).replace(/\s+/g, ' '))}, not exactly ['funnel', \`--tcp=\${port}\`, '--proxy-protocol=2', \`tcp://\${target}\`]. Raw TCP with a PROXY v2 header is what keeps TLS inside Tortie and gives the limiter its key.`);
        }
      } else if (texts.join(' ') !== 'serve status --json' || e.length !== 3) {
        fail('U1', `${where(file, node)}: the serve argv is ${JSON.stringify(node.getText(astOf(file)).replace(/\s+/g, ' '))}, not exactly ['serve', 'status', '--json']. Tortie reads his serve config and never writes it.`);
      }
    }
  }
  checked('U1');
  if (funnelShapes !== 1) {
    fail('U1', `${String(funnelShapes)} funnel argv found. There is exactly one, in ${funnel === null ? 'funnel.ts' : rel(funnel)}.`);
  }
  // (c) The status read asks for this node alone: `--json --peers=false`, so
  // the answer never carries the names of his other devices (SPEC §3 row 14).
  if (funnel !== null) {
    let statusReads = 0;
    for (const node of nodesOf(funnel)) {
      if (!ts.isArrayLiteralExpression(node) || literalText(node.elements[0]) !== 'status') continue;
      statusReads += 1;
      checked('U1');
      const texts = node.elements.map(literalText);
      if (texts.join(' ') !== 'status --json --peers=false' || node.elements.length !== 3) {
        fail('U1', `${where(funnel, node)}: the status read is ${JSON.stringify(node.getText(astOf(funnel)))}, not exactly ['status', '--json', '--peers=false'].`);
      }
    }
    checked('U1');
    if (statusReads !== 1) fail('U1', `${rel(funnel)} holds ${String(statusReads)} status argv; the Funnel read is exactly one.`);
  }
}

// ---------------------------------------------------------------------------
// U2 — the program comes from resolveTailscale, and a bad override refuses
// ---------------------------------------------------------------------------

const TAILSCALE_PATH = /Tailscale\.app|\/usr\/local\/bin\/tailscale|\/opt\/homebrew\/bin\/tailscale|\/Applications\//i;

function funnelProgramRule() {
  const funnel = moduleNamed('funnel', 'U2', "Phase 330 builder owner's");
  if (funnel === null) return;
  // (a) resolveTailscale, imported from the one resolver and called here.
  let imported = false;
  for (const node of nodesOf(funnel)) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!/machines\/tailscale$/.test(node.moduleSpecifier.text)) continue;
    const clause = node.importClause?.namedBindings;
    if (clause !== undefined && ts.isNamedImports(clause) && clause.elements.some((x) => (x.propertyName ?? x.name).text === 'resolveTailscale')) imported = true;
  }
  const calls = callsOf(funnel).filter((c) => calleeName(c) === 'resolveTailscale');
  checked('U2', 2);
  if (!imported || calls.length === 0) {
    fail('U2', `${rel(funnel)} does not import and call resolveTailscale from ../machines/tailscale. Funnel runs the same pinned program Add Machine does, and a second resolver is a second answer to what runs.`);
  }
  for (const file of domainFiles) {
    if (file === funnel) continue;
    for (const call of callsOf(file)) {
      if (calleeName(call) !== 'resolveTailscale') continue;
      checked('U2');
      fail('U2', `${where(file, call)} resolves the Tailscale program outside funnel.ts, which is the one module that runs it.`);
    }
  }
  // (b) No Tailscale path is a literal anywhere in the domain.
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('U2');
      if (TAILSCALE_PATH.test(text)) {
        fail('U2', `${where(file, node)} names ${JSON.stringify(text.slice(0, 60))}, a Tailscale program's path. The path is resolveTailscale's answer, hashed as a confirmed field, and never written down here.`);
      }
    }
  }
  // (c) THE OVERRIDE REFUSAL: an override that is set and did not resolve to
  // a dev-override answers override-unusable, and never falls back to the
  // pinned program — which on his Mac is HIS Tailscale, on HIS tailnet.
  let refuses = false;
  for (const node of nodesOf(funnel)) {
    if (!ts.isIfStatement(node)) continue;
    const condition = codeOfNode(funnel, node.expression);
    if (!/!==\s*'dev-override'/.test(condition)) continue;
    const then = codeOfNode(funnel, node.thenStatement);
    if (/\breturn\b/.test(then) && /'override-unusable'/.test(then)) refuses = true;
  }
  checked('U2', 2);
  if (!refuses) {
    fail('U2', `${rel(funnel)}: no branch returns override-unusable when the override is set and the answer is not 'dev-override'. A probe whose wrapper path was wrong would then run his real Tailscale.`);
  }
  if (!codeStringsOf(funnel).some(({ text }) => text === 'GMUX_TAILSCALE_BIN')) {
    fail('U2', `${rel(funnel)} never reads GMUX_TAILSCALE_BIN, so it cannot know an override was set and did not resolve`);
  }
  // (d) The host hands the child the CONFIRMED program, the hashed field.
  const ipc = moduleNamed('ipc', 'U2', "Phase 330 builder owner's");
  if (ipc === null) return;
  const handed = nodesOf(ipc).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'program');
  checked('U2');
  if (handed.length === 0 || handed.some((n) => !/\.funnelProgram\b/.test(codeOfNode(ipc, n.initializer)))) {
    fail('U2', `${rel(ipc)}: the program handed to the Funnel start is ${handed.map((n) => JSON.stringify(codeOfNode(ipc, n.initializer))).join(', ') || 'nothing'}, not the confirmed funnelProgram field. What runs is what the person confirmed, by hash.`);
  }
}

// ---------------------------------------------------------------------------
// U3 — the child's death, and the orphan
// ---------------------------------------------------------------------------

/** Is a node inside the finally block of some try? */
function insideFinally(node) {
  let n = node;
  while (n.parent !== undefined) {
    if (ts.isTryStatement(n.parent) && n.parent.finallyBlock === n) return true;
    n = n.parent;
  }
  return false;
}

function funnelDeathRule() {
  const funnel = moduleNamed('funnel', 'U3', "Phase 330 builder owner's");
  if (funnel === null) return;
  // (a) EVERY SIGKILL IS INSIDE A finally, and the stop has one.
  const kills = codeStringsOf(funnel).filter(({ text }) => text === 'SIGKILL');
  checked('U3', kills.length + 1);
  if (kills.length === 0) fail('U3', `${rel(funnel)} never sends SIGKILL, so a child that ignores SIGINT and SIGTERM outlives the stop`);
  for (const { node } of kills) {
    if (!insideFinally(node)) {
      fail('U3', `${where(funnel, node)}: a SIGKILL outside a finally. The last step of a stop runs whatever happened before it, or a throw leaves the child publishing.`);
    }
  }
  const stops = functionsNamed(funnel, 'stop');
  checked('U3');
  if (stops.length === 0 || !stops.some((fn) => /\bfinally\b[\s\S]*'SIGKILL'/.test(codeOfNode(funnel, fn)))) {
    fail('U3', `${rel(funnel)}: no stop() ends in a finally that sends SIGKILL`);
  }
  // (b) THE RECORD, at 0o600 in a 0o700 directory.
  let writes = 0;
  for (const call of callsOf(funnel)) {
    const name = calleeName(call);
    if (name !== 'writeFileSync' && name !== 'mkdirSync') continue;
    writes += 1;
    checked('U3');
    const text = codeOfNode(funnel, call);
    const want = name === 'writeFileSync' ? '0o600' : '0o700';
    if (!new RegExp(`mode:\\s*${want}\\b`).test(text)) {
      fail('U3', `${where(funnel, call)}: ${name} does not name mode ${want}. The record names a pid Tortie will signal at its next launch, and only he may write it.`);
    }
  }
  checked('U3');
  if (writes === 0) fail('U3', `${rel(funnel)} writes no record, so nothing proves at the next launch which process Tortie started`);
  // (d) THE RECORD'S DIRECTORY IS ITS OWN AND IS NARROWED (the Phase 330 fix
  // round): `mkdirSync`'s mode applies only when it creates, and the verifier
  // measured the record at 0600 in `<userData>/gmux` at 0755. So the record
  // writer narrows its directory with chmodSync(dirname(path), 0o700) every
  // time, and the directory is one the record owns, never `gmux` itself.
  const writer = functionsNamed(funnel, 'writeFunnelRecord')[0];
  checked('U3', 2);
  if (writer === undefined) {
    fail('U3', `${rel(funnel)} declares no writeFunnelRecord, so nothing this rule can read writes the record`);
  } else {
    const body = codeOfNode(funnel, writer).replace(/\s+/g, ' ');
    if (!/chmodSync\(\s*dirname\(\s*path\s*\)\s*,\s*0o700\s*\)/.test(body)) {
      fail('U3', `${where(funnel, writer)}: the record's directory is not narrowed with chmodSync(dirname(path), 0o700). mkdirSync's mode applies only when it creates, so an existing directory keeps whatever it was (measured: <userData>/gmux at 0755).`);
    }
  }
  const recordPaths = codeStringsOf(funnel).filter(({ text }) => /\.json$/.test(text) && /record|funnel/i.test(text));
  if (!codeTextOf(funnel).includes("'pocket-funnel', 'record.json'")) {
    fail('U3', `${rel(funnel)}: the record is not at <userData>/gmux/pocket-funnel/record.json, a directory of its own. Narrowing the directory the record sits in must never narrow the directory everything else of Tortie's sits in (${JSON.stringify(recordPaths.map((r) => r.text))}).`);
  }
  // (c) THE SWEEP SIGNALS ONLY ON BOTH: the start time AND the command line.
  const sweep = functionsNamed(funnel, 'sweepFunnelOrphan')[0];
  checked('U3', 2);
  if (sweep === undefined) {
    fail('U3', `${rel(funnel)} declares no sweepFunnelOrphan, so nothing ends a child a crashed run left behind`);
    return;
  }
  const signals = nodesOf(funnel).filter(
    (n) =>
      ts.isCallExpression(n) &&
      n.pos >= sweep.pos &&
      n.end <= sweep.end &&
      /^(?:endPid|kill|stop)$/.test(calleeName(n) ?? '')
  );
  if (signals.length === 0) {
    fail('U3', `${where(funnel, sweep)}: the sweep signals nothing, so an orphan Tortie proved it started keeps publishing`);
  }
  // (e) A RECORD THAT NAMES NO FUNNEL CHILD IS NO PROOF (the fix round after
  // his ruling of 2026-09-29). The record is a file on his disk, and `ps`
  // agreeing with it proves only that it describes a running process. So the
  // sweep asks `recordNamesFunnelChild(record.command)` before any signal, in
  // an `if (!…)` that removes the record and returns, and that function
  // compares the command against `funnelArgv` itself over `FUNNEL_PORTS`, so
  // the argv Tortie spawns is spelled in one place.
  const namesChild = functionsNamed(funnel, 'recordNamesFunnelChild')[0];
  checked('U3', 2);
  if (namesChild === undefined) {
    fail('U3', `${rel(funnel)} declares no recordNamesFunnelChild, so the sweep would end any process its record names whose start time and command ps confirms, a shell of his included`);
  } else {
    const body = codeOfNode(funnel, namesChild);
    if (!/\bfunnelArgv\s*\(/.test(body) || !/\bFUNNEL_PORTS\b/.test(body)) {
      fail('U3', `${where(funnel, namesChild)}: recordNamesFunnelChild does not compare the command against funnelArgv over FUNNEL_PORTS, so a record naming another program could pass it`);
    }
  }
  for (const signal of signals) {
    let argvFirst = false;
    for (const node of nodesOf(funnel)) {
      if (!ts.isIfStatement(node) || node.pos < sweep.pos || node.end > signal.pos) continue;
      const cond = codeOfNode(funnel, node.expression).replace(/\s+/g, ' ').trim();
      const then = codeOfNode(funnel, node.thenStatement);
      if (/^!\s*recordNamesFunnelChild\s*\(\s*[A-Za-z_$][\w$]*\s*\.\s*command\s*\)$/.test(cond) && /\breturn\b/.test(then) && /\bdeleteRecord\s*\(/.test(then)) argvFirst = true;
    }
    if (!argvFirst) {
      fail('U3', `${where(funnel, signal)}: the sweep signals a pid without first requiring its record to name the argv Tortie spawns (if (!recordNamesFunnelChild(record.command)) { remove the record; return }). A record naming anything else would let the sweep end that process whenever ps agrees with the file.`);
    }
  }
  for (const signal of signals) {
    // Guarded by `if (a.lstart !== b.lstart || a.command !== b.command) return`
    // before it, or inside `if (a.lstart === b.lstart && a.command === b.command)`.
    let guarded = false;
    for (const node of nodesOf(funnel)) {
      if (!ts.isIfStatement(node) || node.pos < sweep.pos || node.end > sweep.end) continue;
      const cond = codeOfNode(funnel, node.expression).replace(/\s+/g, ' ');
      const both = (op, join) =>
        new RegExp(`lstart\\s*${op}[^|&]*${join}[^|&]*command\\s*${op}|command\\s*${op}[^|&]*${join}[^|&]*lstart\\s*${op}`).test(cond);
      if (both('!==', '\\|\\|') && node.end <= signal.pos && /\breturn\b/.test(codeOfNode(funnel, node.thenStatement))) guarded = true;
      if (both('===', '&&') && signal.pos >= node.thenStatement.pos && signal.end <= node.thenStatement.end) guarded = true;
    }
    if (!guarded) {
      fail('U3', `${where(funnel, signal)}: the sweep signals a pid without first requiring its start time AND its command line to equal the record. Fewer than both, and it could end a process Tortie did not start.`);
    }
  }
}

// ---------------------------------------------------------------------------
// U4 — the injected deps are the tests' and the push seam's alone
// ---------------------------------------------------------------------------

function injectedDepsRule() {
  const files = sourcesUnder(join(ROOT, 'src'));
  const allowed = (file) => file.endsWith(join('harness', 'push-seam.ts'));
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    if (!/inProcessDoor|new PocketHost\(/.test(raw)) continue;
    for (const node of nodesOf(file)) {
      if (ts.isIdentifier(node) && node.text === 'inProcessDoor') {
        const declaring = file.endsWith(join('door', 'in-process.ts'));
        checked('U4');
        if (!declaring && !allowed(file)) {
          fail('U4', `${where(file, node)} names inProcessDoor. Production forks the real door process; only tests and push-seam.ts run the listener in-process.`);
        }
      }
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'PocketHost') {
        const arg = node.arguments?.[0];
        if (arg === undefined || !ts.isObjectLiteralExpression(arg)) continue;
        for (const p of arg.properties) {
          const name = memberName(p);
          if (name !== 'tailscale' && name !== 'door') continue;
          checked('U4');
          if (!allowed(file)) {
            fail('U4', `${where(file, p)}: PocketHost is handed \`${name}\` outside a test and push-seam.ts. Production runs the real program and the real process, which is what the person confirmed.`);
          }
        }
      }
    }
  }
  // And the host itself falls back to the real ones, and hands the door
  // spawner only from its deps.
  const ipc = moduleNamed('ipc', 'U4', "Phase 330 builder owner's");
  if (ipc === null) return;
  const text = codeTextOf(ipc);
  checked('U4', 2);
  if (!/deps\.tailscale\s*\?\?\s*defaultFunnelDeps\(\)/.test(text)) {
    fail('U4', `${rel(ipc)} does not fall back from deps.tailscale to defaultFunnelDeps(), so what production runs is not what this rule reads`);
  }
  const spawns = nodesOf(ipc).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'spawn');
  if (spawns.some((n) => !/deps\.door\b/.test(codeOfNode(ipc, n.initializer)))) {
    fail('U4', `${rel(ipc)} hands the door a spawner that is not deps.door: ${spawns.map((n) => JSON.stringify(codeOfNode(ipc, n.initializer))).join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// K3 — the push key never enters the door (Phase 316.5)
// ---------------------------------------------------------------------------

/** The port's five members and what each may answer, exactly (build/p3165/SPEC.md §5.2.2). */
const PORT_MEMBERS = new Map([
  ['keyId', 'string | null'],
  ['sentence', 'string | null'],
  ['chooseKey', 'Promise<PocketPushKeyResult>'],
  ['forgetKey', 'Promise<void>'],
  ['changed', 'void']
]);

/** The names every call in a node is made BY, in order. */
function calleesIn(root) {
  const out = [];
  const visit = (n) => {
    if (ts.isCallExpression(n)) out.push(calleeName(n));
    ts.forEachChild(n, visit);
  };
  visit(root);
  return out;
}

/** Every `this.deps.<name>` a node reads, by name. */
function depsReadIn(root) {
  const out = [];
  const visit = (n) => {
    if (
      ts.isPropertyAccessExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      n.expression.name.text === 'deps'
    ) {
      out.push(n.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
  return out;
}

/** Does a specifier, from a file under src/main/pocket/, name src/main/alerts? */
function namesAlerts(file, spec) {
  if (!spec.startsWith('.')) return false;
  const target = relative(join(ROOT, 'src', 'main'), resolve(dirname(file), spec)).split('\\').join('/');
  return target === 'alerts' || target.startsWith('alerts/');
}

function pushKeyPortRule() {
  const ipc = moduleNamed('ipc', 'K3', "Phase 316.5 builder mac's");
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  if (ipc === null) return;
  const sf = astOf(ipc);

  // (a) THE PORT: five members, and none answers key material.
  const port = interfaceOf(ipc, 'PocketAlertsPort');
  checked('K3');
  if (port === null) {
    fail('K3', `${rel(ipc)} declares no PocketAlertsPort, so nothing says what the alerts may hand the door`);
  } else {
    const seen = new Set();
    for (const member of port.members) {
      checked('K3');
      const name = memberName(member);
      const want = name === null ? undefined : PORT_MEMBERS.get(name);
      if (!ts.isMethodSignature(member) || want === undefined) {
        fail('K3', `${where(ipc, member)}: PocketAlertsPort.${String(name)} is not one of its five methods (${[...PORT_MEMBERS.keys()].join(', ')}). A member the door can ask is a member that can answer the key.`);
        continue;
      }
      seen.add(name);
      const got = member.type === undefined ? '(none)' : member.type.getText(sf).replace(/\s+/g, ' ');
      if (got !== want) {
        fail('K3', `${where(ipc, member)}: PocketAlertsPort.${name} answers ${got}, not ${want}. No member of the port answers key material: an id that is public, a sentence, whether a key was kept, and nothing.`);
      }
    }
    checked('K3');
    if (port.members.length !== PORT_MEMBERS.size || seen.size !== PORT_MEMBERS.size) {
      fail('K3', `PocketAlertsPort has ${String(port.members.length)} member(s) (${[...seen].join(', ') || 'none of the five'}); it has exactly the five the SPEC pins`);
    }
  }

  // (b) THE RESULT: kept and refusal, exactly.
  checked('K3');
  const result = existsSync(contract) ? interfaceOf(contract, 'PocketPushKeyResult') : null;
  if (result === null) {
    fail('K3', 'src/shared/ipc/pocket.ts declares no PocketPushKeyResult, so what a choose answers is not read');
  } else {
    const names = result.members.map((m) => memberName(m)).sort();
    const types = new Map(result.members.map((m) => [memberName(m), m.type?.getText(astOf(contract)).replace(/\s+/g, ' ')]));
    if (JSON.stringify(names) !== JSON.stringify(['kept', 'refusal']) || types.get('kept') !== 'boolean' || types.get('refusal') !== 'string | null') {
      fail('K3', `PocketPushKeyResult is { ${result.members.map((m) => m.getText(astOf(contract))).join(' ')} }; it is exactly kept: boolean and refusal: string | null, and a choose answers nothing of the key`);
    }
  }

  // (c) STATUS READS TWO THINGS OF THE PORT.
  const status = methodOf(ipc, 'PocketHost', 'status');
  checked('K3');
  if (status === null) {
    fail('K3', `${rel(ipc)}: PocketHost has no status() method to read`);
  } else {
    const reads = [];
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const receiver = n.expression.expression.getText(sf).replace(/\?/g, '');
        if (receiver === 'this.deps.alerts') reads.push(n.expression.name.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(status);
    const all = depsReadIn(status).filter((d) => d === 'alerts').length;
    if (JSON.stringify([...reads].sort()) !== JSON.stringify(['keyId', 'sentence']) || all !== 2) {
      fail('K3', `${where(ipc, status)}: status() reads ${reads.join(', ') || 'nothing'} of the port (${String(all)} read(s) of this.deps.alerts); it reads keyId() and sentence() and nothing else`);
    }
  }

  // (c2) RESEARCH 136: whether this Mac can send is asked by /pair's answer,
  // which the internet reaches while a window is open, so it reads the port's
  // public key id and NOTHING ELSE of it.
  const canSend = methodOf(ipc, 'PocketHost', 'alertsCanSend');
  checked('K3');
  if (canSend === null) {
    fail('K3', `${rel(ipc)}: PocketHost has no alertsCanSend() method, so nothing says what /pair may tell a phone about alerts`);
  } else {
    const asked = [];
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const receiver = n.expression.expression.getText(sf).replace(/\?/g, '');
        if (receiver === 'this.deps.alerts') asked.push(n.expression.name.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(canSend);
    const reads = depsReadIn(canSend).filter((d) => d === 'alerts').length;
    if (JSON.stringify(asked) !== JSON.stringify(['keyId']) || reads !== 1) {
      fail('K3', `${where(ipc, canSend)}: alertsCanSend() asks ${asked.join(', ') || 'nothing'} of the port (${String(reads)} read(s) of this.deps.alerts); it asks keyId() once and nothing else`);
    }
  }

  // (d) THE TWO HANDLERS, and the two host methods they reach.
  const register = functionsNamed(ipc, 'registerPocketIpc')[0] ?? null;
  const handlerBody = (channel) => {
    if (register === null) return null;
    let found = null;
    const visit = (n) => {
      if (ts.isCallExpression(n) && calleeName(n) === 'handle' && n.arguments.length === 3) {
        const [, ch, fn] = n.arguments;
        if (ts.isStringLiteral(ch) && ch.text === channel && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
          found = fn.body.getText(sf).replace(/\s+/g, ' ');
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(register);
    return found;
  };
  const want = [
    ['pocket:choosePushKey', 'host.choosePushKey(event.sender)'],
    ['pocket:forgetPushKey', 'host.forgetPushKey()']
  ];
  for (const [channel, body] of want) {
    checked('K3');
    const got = handlerBody(channel);
    if (got !== body) {
      fail('K3', `${rel(ipc)}: the ${channel} handler is ${JSON.stringify(got)}, not ${JSON.stringify(body)}. The renderer hands main nothing but the press.`);
    }
  }
  const methods = [
    ['choosePushKey', new Set(['chooseKey'])],
    ['forgetPushKey', new Set(['forgetKey', 'status'])]
  ];
  for (const [name, allowed] of methods) {
    const method = methodOf(ipc, 'PocketHost', name);
    checked('K3');
    if (method === null) {
      fail('K3', `${rel(ipc)}: PocketHost has no ${name}() method`);
      continue;
    }
    const calls = calleesIn(method.body);
    const deps = depsReadIn(method.body);
    const stray = calls.filter((c) => !allowed.has(c ?? ''));
    if (stray.length > 0 || deps.some((d) => d !== 'alerts') || !calls.some((c) => c === 'chooseKey' || c === 'forgetKey')) {
      fail('K3', `${where(ipc, method)}: ${name}() calls ${calls.join(', ') || 'nothing'} and reads this.deps.${deps.join(', this.deps.') || '(nothing)'}; it calls the port and nothing else`);
    }
  }

  // (e) THE DOMAIN IMPORTS NOTHING OF THE ALERTS, bare directory included.
  for (const file of domainFiles) {
    for (const { node, text } of specifiersOf(file)) {
      checked('K3');
      if (namesAlerts(file, text)) {
        fail('K3', `${where(file, node)} imports ${JSON.stringify(text)}. The door reaches the alerts only through the port it is handed; a door that can name them can reach the key.`);
      }
    }
  }

  // (f) THE PORT IS HANDED BY THE COMPOSITION AND BY TESTS, AND NOWHERE ELSE.
  const deps = interfaceOf(ipc, 'PocketHostDeps');
  checked('K3');
  const member = deps?.members.find((m) => memberName(m) === 'alerts');
  if (member === undefined || member.questionToken === undefined || member.type?.getText(sf) !== 'PocketAlertsPort') {
    fail('K3', `${rel(ipc)}: PocketHostDeps has no optional alerts: PocketAlertsPort`);
  }
  const capabilities = join(ROOT, 'src', 'main', 'capabilities.ts');
  let handedByComposition = 0;
  for (const file of sourcesUnder(join(ROOT, 'src'))) {
    if (!/new PocketHost\(/.test(readFileSync(file, 'utf8'))) continue;
    for (const node of nodesOf(file)) {
      if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'PocketHost') continue;
      const arg = node.arguments?.[0];
      if (arg === undefined || !ts.isObjectLiteralExpression(arg)) continue;
      for (const p of arg.properties) {
        if (memberName(p) !== 'alerts' && !(ts.isShorthandPropertyAssignment(p) && p.name.text === 'alerts')) continue;
        checked('K3');
        if (file === capabilities) {
          handedByComposition += 1;
          continue;
        }
        fail('K3', `${where(file, p)}: PocketHost is handed an alerts port outside src/main/capabilities.ts and a test. The port reaches the key's store; only the composition that holds the sender hands it in.`);
      }
    }
  }
  checked('K3');
  if (handedByComposition !== 1) {
    fail('K3', `src/main/capabilities.ts hands PocketHost an alerts port ${String(handedByComposition)} time(s); it hands the one port exactly once`);
  }
}

// ---------------------------------------------------------------------------
// U5 — the BUILT door process imports nothing it may not
// ---------------------------------------------------------------------------

const BUILT_BUILTINS = new Set(['node:net', 'node:tls', 'node:http', 'node:crypto', 'net', 'tls', 'http', 'crypto']);

function builtDoorRule() {
  // The entry is declared, whether or not a build is here.
  const config = join(ROOT, 'electron.vite.config.ts');
  checked('U5');
  if (!existsSync(config) || !/'pocket-door'\s*:\s*resolve\(\s*__dirname\s*,\s*'src\/main\/pocket\/door-process\.ts'\s*\)/.test(codeTextOf(config))) {
    fail('U5', 'electron.vite.config.ts declares no pocket-door entry resolving src/main/pocket/door-process.ts, so the build emits no door process for bind.ts to fork');
  }
  const outMain = join(ROOT, 'out', 'main');
  const entry = join(outMain, 'pocket-door.js');
  if (!existsSync(entry)) {
    process.stdout.write(`${TAG} U5 skipped: no build${existsSync(outMain) ? ' of the door process in out/main (a build from before Phase 330, or none)' : ''}\n`);
    return;
  }
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    checked('U5');
    for (const m of text.matchAll(/\brequire\(\s*(["'])([^"']+)\1\s*\)|\bfrom\s*(["'])([^"']+)\3|\bimport\(\s*(["'])([^"']+)\5\s*\)/g)) {
      const spec = m[2] ?? m[4] ?? m[6];
      checked('U5');
      if (spec.startsWith('.')) {
        const next = resolve(dirname(file), spec);
        if (existsSync(next)) queue.push(next);
        else fail('U5', `${rel(file)} requires ${spec}, which is not in the build`);
        continue;
      }
      if (!BUILT_BUILTINS.has(spec)) {
        fail('U5', `${rel(file)}, reached from out/main/pocket-door.js, requires ${JSON.stringify(spec)}. The built door process may require net, tls, http and crypto and its own chunks, and nothing else${spec === 'electron' ? ': Electron in the door process is the whole of main within reach of a stranger' : ''}.`);
      }
    }
    if (/main[\\/](?:credentials|logins|push|sessions)[\\/]/.test(text)) {
      fail('U5', `${rel(file)}, reached from out/main/pocket-door.js, names a credentials, logins, push or sessions path.`);
    }
  }
  process.stdout.write(`${TAG} U5 read ${String(seen.size)} built file(s) from out/main/pocket-door.js\n`);
}

// ---------------------------------------------------------------------------
// M1 — mutual TLS, and the one hand-over to HTTP after the pin
// ---------------------------------------------------------------------------

/**
 * Research 132 §9 condition 1: outside a pairing window, a connection whose
 * client key is not a paired phone's is destroyed at the end of the
 * handshake, BEFORE AN HTTP BYTE IS PARSED. `rejectUnauthorized` is false in
 * the listener because there is no authority to chain a phone's certificate
 * to; the pin is the verification and it is not optional. This rule is what
 * makes it not optional: the only hand-over to the HTTP parser is inside the
 * secureConnection handler, after the server name and the pin have each
 * destroyed what they refuse.
 */
function mutualTlsRule() {
  const listener = moduleNamed('listener', 'M1', "Phase 330 builder door's");
  if (listener === null) return;
  const sf = astOf(listener);
  // (a) The TLS server's options.
  let tlsOptions = null;
  for (const call of callsOf(listener)) {
    const e = call.expression;
    if (!ts.isIdentifier(e) || !/tls/i.test(e.text) || !/create/i.test(e.text)) continue;
    const arg = call.arguments[0];
    if (arg !== undefined && ts.isObjectLiteralExpression(arg)) tlsOptions = arg;
  }
  checked('M1', 3);
  if (tlsOptions === null) {
    fail('M1', `${rel(listener)} creates no TLS server whose options this rule can read`);
  } else {
    const option = (name) => tlsOptions.properties.find((p) => ts.isPropertyAssignment(p) && memberName(p) === name)?.initializer;
    if (option('requestCert')?.kind !== ts.SyntaxKind.TrueKeyword) {
      fail('M1', `${where(listener, tlsOptions)}: the TLS server does not set requestCert: true, so no phone is asked for its certificate and the pin has nothing to check`);
    }
    const min = option('minVersion');
    if (min === undefined || !ts.isStringLiteral(min) || min.text !== 'TLSv1.3') {
      fail('M1', `${where(listener, tlsOptions)}: the TLS server's minVersion is not 'TLSv1.3'. Under TLS 1.2 the client certificate crosses Funnel's relay in the clear and hands Tailscale a stable identifier for the phone.`);
    }
  }
  // (b) The one hand-over, and where it is.
  const handovers = callsOf(listener).filter(
    (c) =>
      calleeName(c) === 'emit' &&
      literalText(c.arguments[0]) === 'connection' &&
      ts.isPropertyAccessExpression(c.expression) &&
      /http/i.test(c.expression.expression.getText(sf))
  );
  checked('M1', 2);
  if (handovers.length !== 1) {
    fail('M1', `${rel(listener)} hands a socket to the HTTP parser ${String(handovers.length)} time(s). There is one hand-over, after the pin.`);
    return;
  }
  const handover = handovers[0];
  // The function registered for secureConnection.
  let handlerName = null;
  for (const call of callsOf(listener)) {
    if (calleeName(call) !== 'on' || literalText(call.arguments[0]) !== 'secureConnection') continue;
    const h = call.arguments[1];
    if (h !== undefined && ts.isIdentifier(h)) handlerName = h.text;
  }
  const handler = handlerName === null ? undefined : functionsNamed(listener, handlerName)[0];
  if (handler === undefined || !(handover.pos >= handler.pos && handover.end <= handler.end)) {
    fail('M1', `${where(listener, handover)}: the hand-over to HTTP is not inside the function registered for secureConnection${handlerName === null ? ' (no function is registered for it by name)' : ` (${handlerName})`}. Before the handshake ends there is no key to check, so a hand-over anywhere else is a stranger's bytes reaching the parser.`);
    return;
  }
  // (c) Inside it, BEFORE the hand-over: the server name, the pin over the
  // KEY, and each refusal destroying the socket and returning.
  const text = codeTextOf(listener).slice(handler.getStart(sf), handover.getStart(sf));
  checked('M1', 5);
  for (const [word, why] of [
    ['server-name', 'a handshake for another name'],
    ['unknown-key', 'a certificate over a key that is not a paired phone’s'],
    ['no-certificate', 'no certificate outside a window']
  ]) {
    const refusal = new RegExp(`refuseSocket\\([^)]*'${word}'\\)\\s*;\\s*return\\s*;`).test(text);
    if (!refusal) {
      fail('M1', `${where(listener, handler)}: before the hand-over, ${why} is not destroyed and returned with '${word}'. It would reach the HTTP parser.`);
    }
  }
  if (!/pins\.get\(/.test(text)) {
    fail('M1', `${where(listener, handler)}: before the hand-over nothing asks the pins, so every certificate is somebody's`);
  }
  if (!/getPeerX509Certificate\(\)/.test(codeTextOf(listener)) || !/\.publicKey\.export\(\s*\{\s*type:\s*'spki'/.test(codeTextOf(listener))) {
    fail('M1', `${rel(listener)}: the pin is not taken over the peer certificate's PUBLIC KEY (publicKey.export({ type: 'spki' })). A pin over the certificate would move with every certificate the Mac issues.`);
  }
  if (!/windowOpen/.test(text)) {
    fail('M1', `${where(listener, handler)}: the certificate-less branch does not ask whether a window is open`);
  }
  // (d) No data or readable listener on a TLS socket anywhere in the module:
  // the only reader of a TLS socket's bytes is the HTTP parser.
  for (const call of callsOf(listener)) {
    const name = calleeName(call);
    if (name !== 'on' && name !== 'once' && name !== 'addListener' && name !== 'prependListener') continue;
    const event = literalText(call.arguments[0]);
    if (event !== 'data' && event !== 'readable') continue;
    const e = call.expression;
    const receiver = ts.isPropertyAccessExpression(e) ? e.expression.getText(sf) : '';
    checked('M1');
    if (/tls/i.test(receiver) || (handler !== undefined && call.pos >= handler.pos && call.end <= handler.end)) {
      fail('M1', `${where(listener, call)}: a ${event} listener on ${receiver}. Nothing reads a TLS socket's bytes but the HTTP parser, and the parser only after the pin.`);
    }
  }
  // (e) A connection with no certificate reaches POST /pair and nothing else.
  checked('M1');
  if (!/channel\s*===\s*null\s*&&\s*route\.id\s*!==\s*'pair'\)\s*return\s+refuseRequest\(\s*res\s*,\s*'route'\s*\)/.test(codeTextOf(listener))) {
    fail('M1', `${rel(listener)}: a request on a connection that presented no certificate is not refused 'route' unless it is POST /pair. Without it the window would open every route to anybody holding the code.`);
  }
}

// ---------------------------------------------------------------------------
// M2 — the hash covers what runs, where, and whose key
// ---------------------------------------------------------------------------

function hashFieldsRule() {
  const pairing = moduleNamed('pairing', 'M2', "Phase 330 builder owner's");
  if (pairing === null) return;
  const fields = interfaceOf(pairing, 'PocketExecutionFields');
  const phone = interfaceOf(pairing, 'PocketPhoneFields');
  const names = (iface) => new Set((iface?.members ?? []).map(memberName).filter((n) => n !== null));
  const f = names(fields);
  const p = names(phone);
  checked('M2', 4);
  for (const need of ['funnelProgram', 'tailnet', 'publicName', 'publicPort']) {
    if (!f.has(need)) fail('M2', `${rel(pairing)}: PocketExecutionFields has no ${need}. Research 132 §9 condition 4: what runs, on whose tailnet, at which name and port, are each a field a person confirmed.`);
  }
  for (const gone of ['bindAddress', 'port', 'address']) {
    if (f.has(gone)) fail('M2', `${rel(pairing)}: PocketExecutionFields still has ${gone}. The door binds loopback on an ephemeral port, which is a constant and not a choice.`);
  }
  checked('M2', 2);
  if (!p.has('clientKey')) fail('M2', `${rel(pairing)}: PocketPhoneFields has no clientKey, so the key a phone's handshake completes with is outside the agreement`);
  if (p.has('address')) fail('M2', `${rel(pairing)}: PocketPhoneFields still has address. Behind Funnel every source is this Mac, and an address pins nothing.`);
  // NORMALIZE names every field, and each phone row emits its clientKey.
  let normalize = null;
  for (const node of nodesOf(pairing)) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'NORMALIZE' && node.initializer !== undefined && ts.isObjectLiteralExpression(node.initializer)) normalize = node.initializer;
  }
  checked('M2', 2);
  if (normalize === null) {
    fail('M2', `${rel(pairing)} declares no NORMALIZE object literal, so nothing here reads what the hash is made of`);
  } else {
    const keys = new Set(normalize.properties.map(memberName));
    for (const need of ['funnelProgram', 'tailnet', 'publicName', 'publicPort']) {
      if (!keys.has(need)) fail('M2', `${where(pairing, normalize)}: NORMALIZE has no line for ${need}`);
    }
    const phones = normalize.properties.find((x) => memberName(x) === 'phones');
    if (phones === undefined || !/\.clientKey\b/.test(codeOfNode(pairing, phones))) {
      fail('M2', `${where(pairing, normalize)}: the phones line of NORMALIZE does not emit each phone's clientKey, so a phone whose key moved hashes the same`);
    }
  }
  let algorithm = null;
  for (const node of nodesOf(pairing)) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'POCKET_EXECUTION_HASH_ALGORITHM') algorithm = literalText(node.initializer);
  }
  checked('M2');
  if (algorithm !== 'sha256-pocket-exec-v3') {
    fail('M2', `${rel(pairing)}: POCKET_EXECUTION_HASH_ALGORITHM is ${JSON.stringify(algorithm)}, not 'sha256-pocket-exec-v3'. Every record written before Phase 330 must read changed and ask again.`);
  }
}

// ---------------------------------------------------------------------------
// P1 — the PROXY source is a rate-limit key and nothing else
// ---------------------------------------------------------------------------

function proxySourceRule() {
  const limits = moduleNamed('limits', 'P1', "Phase 330 builder door's");
  const wire = moduleNamed('wire', 'P1', "Phase 330 builder door's");
  const listener = moduleNamed('listener', 'P1', "Phase 330 builder door's");
  // (a) The address block's bytes are READ in limits.ts alone.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isPropertyAccessExpression(node) || node.name.text !== 'addressBlock') continue;
      checked('P1');
      if (file !== limits) {
        fail('P1', `${where(file, node)} reads a PROXY header's address block. door/limits.ts is its one reader, and it is a rate-limit key only: any process on this Mac can write the header naming any address (research 132 §7.3).`);
      }
    }
  }
  // (b) Nothing that crosses to main can carry it.
  if (wire !== null) {
    for (const node of nodesOf(wire)) {
      if (!(ts.isPropertySignature(node) || ts.isPropertyAssignment(node))) continue;
      const name = memberName(node) ?? '';
      checked('P1');
      if (/source|address|proxy|remote|^ip$/i.test(name)) {
        fail('P1', `${where(wire, node)}: the wire names a field \`${name}\`. A request main is handed carries no address of any kind.`);
      }
    }
    checked('P1');
    if (/\bProxyHeader\b/.test(codeTextOf(wire))) fail('P1', `${rel(wire)} names ProxyHeader, so the header could cross to main`);
  }
  for (const name of ['bind', 'server', 'ipc', 'pairing']) {
    const file = domainFiles.find((f) => f.endsWith(join('pocket', `${name}.ts`)));
    if (file === undefined) continue;
    checked('P1');
    if (/proxy-v2|\bProxyHeader\b|\breadProxyV2\b/.test(codeTextOf(file))) {
      fail('P1', `${rel(file)} names the PROXY reader or its header. Main never sees the header.`);
    }
  }
  // (c) The listener hands the header to the limiter and to nothing else.
  if (listener !== null) {
    for (const node of nodesOf(listener)) {
      if (!ts.isPropertyAccessExpression(node) || node.name.text !== 'header') continue;
      checked('P1');
      const call = node.parent;
      const toLimiter = call !== undefined && ts.isCallExpression(call) && calleeName(call) === 'admit' && call.arguments.includes(node);
      if (!toLimiter) {
        fail('P1', `${where(listener, node)}: the PROXY header is used for something other than the limiter's admit(). It is a rate-limit key only.`);
      }
    }
  }
  // (d) No socket address is read anywhere in the domain, and no log call names one.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isPropertyAccessExpression(node) || !/^remote(?:Address|Port|Family)$/.test(node.name.text)) continue;
      checked('P1');
      fail('P1', `${where(file, node)} reads ${node.name.text}. Every Funnel connection arrives from 127.0.0.1, so a socket's address names nothing, and reading one invites a check that means nothing.`);
    }
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !/^(?:debug|info|warn|error|log)$/.test(name)) continue;
      for (const arg of call.arguments) {
        checked('P1');
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;
        const text = arg.getText(astOf(file));
        if (/\baddressBlock\b|\bheader\b|\bsource\b|proxy/i.test(text)) {
          fail('P1', `${where(file, call)} hands ${JSON.stringify(text.slice(0, 60))} to ${name}(). The PROXY source is in no log line.`);
        }
      }
    }
  }
  checked('P1');
  if (limits !== null && !/\.addressBlock\b/.test(codeTextOf(limits))) {
    fail('P1', `${rel(limits)} never reads the header's address block, so the limiter has no key and every source is one source`);
  }
}

// ---------------------------------------------------------------------------
// C1 — an explicit Content-Length on every answer
// ---------------------------------------------------------------------------

function contentLengthRule() {
  const send = moduleNamed('send', 'C1', "Phase 330 builder door's");
  if (send === null) return;
  const fns = functionsNamed(send, 'sendPocket');
  checked('C1', 2);
  if (fns.length !== 1) {
    fail('C1', `${rel(send)} declares ${String(fns.length)} sendPocket function(s). There is one writer.`);
    return;
  }
  const fn = fns[0];
  // The length is set at the TOP LEVEL of the one writer, for every answer:
  // not inside a branch a body-less refusal could skip.
  const top = ts.isBlock(fn.body) ? fn.body.statements : [];
  const sets = top.filter((st) => /setHeader\(\s*'Content-Length'/i.test(codeOfNode(send, st)));
  if (sets.length !== 1 || !ts.isExpressionStatement(sets[0])) {
    fail('C1', `${where(send, fn)}: sendPocket does not set Content-Length as one statement of its own body, for every answer. The phone's reader requires the length and refuses any transfer coding (SPEC §4.12.3).`);
  }
  // Nothing in the domain names a transfer coding, streams, or writes a head.
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('C1');
      if (/transfer-encoding|chunked/i.test(text)) {
        fail('C1', `${where(file, node)} names ${JSON.stringify(text)}. The door never sends a transfer coding.`);
      }
    }
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      const e = call.expression;
      const receiver = ts.isPropertyAccessExpression(e) ? e.expression.getText(astOf(file)) : '';
      if (!(receiver === 'res' || /\.res$/.test(receiver))) continue;
      checked('C1');
      if (name === 'write' || name === 'writeHead' || name === 'flushHeaders') {
        fail('C1', `${where(file, call)}: ${receiver}.${name}(). An answer is written whole by sendPocket, never streamed, so its length is known before a byte leaves.`);
      }
      if ((name === 'end' || name === 'setHeader') && file !== send) {
        fail('C1', `${where(file, call)}: ${receiver}.${name}() outside door/send.ts. One writer, so every answer carries the same headers and its length.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// N3 — /pair answers three states, and the certificate only with allowed
// ---------------------------------------------------------------------------

function pairAnswerRule() {
  const server = moduleNamed('server', 'N3', "Phase 330 builder door's");
  if (server !== null) {
    let states = 0;
    for (const node of nodesOf(server)) {
      if (!ts.isObjectLiteralExpression(node)) continue;
      const keys = node.properties.map(memberName);
      if (!keys.includes('state')) continue;
      states += 1;
      checked('N3');
      const extra = keys.filter((k) => k !== 'state' && k !== 'cert' && k !== 'alerts');
      if (extra.length > 0) {
        fail('N3', `${where(server, node)}: /pair's answer carries ${JSON.stringify(extra)} beside its state. It says a state, a certificate only with allowed, and that this Mac can send only with pending.`);
      }
      const state = node.properties.find((x) => memberName(x) === 'state');
      const value = state !== undefined && ts.isPropertyAssignment(state) ? literalText(state.initializer) : null;
      // RESEARCH 136 (Phase 316.5): `alerts` rides with pending alone, and it is
      // the literal true, so what leaves is decided HERE and never forwarded.
      const alerts = node.properties.find((x) => memberName(x) === 'alerts');
      if (alerts !== undefined) {
        checked('N3');
        if (value !== 'pending') {
          fail('N3', `${where(server, node)}: alerts rides with the state ${JSON.stringify(value)}. It is said only while a phone is pending, before it could be asked.`);
        }
        if (!ts.isPropertyAssignment(alerts) || alerts.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
          fail('N3', `${where(server, alerts)}: alerts is ${JSON.stringify(codeOfNode(server, alerts))}, not the literal true. Main says the one word itself and never forwards a value.`);
        }
      }
      if (value === null) {
        fail('N3', `${where(server, node)}: /pair's state is ${JSON.stringify(state === undefined ? '' : codeOfNode(server, state))}, not a literal. Main composes the answer field by field and never forwards what the pairing owner handed it.`);
      }
      if (keys.includes('cert') && value !== 'allowed') {
        fail('N3', `${where(server, node)}: a certificate rides with the state ${JSON.stringify(value)}. It is handed to the allowed phone alone.`);
      }
    }
    checked('N3');
    const said = new Set(
      nodesOf(server)
        .filter((n) => ts.isObjectLiteralExpression(n) && n.properties.some((x) => memberName(x) === 'state'))
        .map((n) => {
          const s = n.properties.find((x) => memberName(x) === 'state');
          return s !== undefined && ts.isPropertyAssignment(s) ? literalText(s.initializer) : null;
        })
    );
    if (states === 0 || !['pending', 'refused', 'allowed'].every((x) => said.has(x))) {
      fail('N3', `${rel(server)} does not compose each of pending, refused and allowed itself (${[...said].join(', ') || 'none'})`);
    }
    // What the pairing owner answers is never serialised whole.
    for (const call of callsOf(server)) {
      if (calleeName(call) !== 'stringify') continue;
      const arg = call.arguments[0];
      checked('N3');
      if (arg !== undefined && ts.isIdentifier(arg)) {
        const decl = nodesOf(server).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === arg.text);
        if (decl !== undefined && /deps\.present\(/.test(codeOfNode(server, decl))) {
          fail('N3', `${where(server, call)}: what deps.present() answered is serialised whole. A field the pairing owner grows would reach every presenter.`);
        }
      }
    }
  }
  const pairing = moduleNamed('pairing', 'N3', "Phase 330 builder owner's");
  if (pairing === null) return;
  let declared = null;
  for (const node of nodesOf(pairing)) {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'PocketPairAnswer') declared = node.type;
  }
  checked('N3');
  if (declared === null || !ts.isUnionTypeNode(declared)) {
    fail('N3', `${rel(pairing)}: PocketPairAnswer is not a union this rule can read`);
    return;
  }
  for (const member of declared.types) {
    if (!ts.isTypeLiteralNode(member)) continue;
    const names = member.members.map(memberName);
    const stateType = member.members.find((m) => memberName(m) === 'state');
    const text = stateType?.type?.getText(astOf(pairing)) ?? '';
    checked('N3');
    if (names.includes('cert') && text.replace(/\s/g, '') !== "'allowed'") {
      fail('N3', `${where(pairing, member)}: PocketPairAnswer carries a cert with the state ${text}. Only allowed carries one.`);
    }
    // Research 136: alerts only beside pending, and only as `true`.
    const alertsType = member.members.find((m) => memberName(m) === 'alerts');
    if (alertsType !== undefined) {
      checked('N3');
      if (text.replace(/\s/g, '') !== "'pending'" || alertsType.type?.getText(astOf(pairing)) !== 'true') {
        fail('N3', `${where(pairing, member)}: PocketPairAnswer carries alerts with the state ${text} as ${alertsType.type?.getText(astOf(pairing)) ?? '(no type)'}. Only pending carries it, and only as true.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// MENU1 — Pair a Phone… is still under Settings…
// ---------------------------------------------------------------------------

function menuRowRule() {
  const menu = join(ROOT, 'src', 'main', 'menu.ts');
  checked('MENU1');
  if (!existsSync(menu)) {
    fail('MENU1', 'src/main/menu.ts does not exist, so this rule read nothing');
    return;
  }
  const labelOf = (n) => {
    if (n === undefined || !ts.isObjectLiteralExpression(n)) return null;
    const p = n.properties.find((x) => ts.isPropertyAssignment(x) && memberName(x) === 'label');
    return p !== undefined ? literalText(p.initializer) : null;
  };
  let found = false;
  for (const node of nodesOf(menu)) {
    if (!ts.isArrayLiteralExpression(node)) continue;
    const at = node.elements.findIndex((e) => labelOf(e) === 'Pair a Phone…');
    if (at === -1) continue;
    found = true;
    checked('MENU1', 2);
    if (labelOf(node.elements[at - 1]) !== 'Settings…') {
      fail('MENU1', `${where(menu, node.elements[at])}: the row directly above Pair a Phone… is ${JSON.stringify(labelOf(node.elements[at - 1]))}, not Settings…. The row opens the window Settings… opens, at the Phone section, and it did not move (the entry’s "Unchanged on purpose").`);
    }
    const row = node.elements[at];
    const click = row.properties.find((x) => memberName(x) === 'click');
    if (click === undefined || !/openSettingsWindow\(\s*'phone'\s*\)/.test(codeOfNode(menu, click))) {
      fail('MENU1', `${where(menu, row)}: Pair a Phone… does not call openSettingsWindow('phone').`);
    }
  }
  if (!found) fail('MENU1', 'src/main/menu.ts has no Pair a Phone… row');
}

// ---------------------------------------------------------------------------
// W2 — the door process's import wall, re-derived
// ---------------------------------------------------------------------------

const DOOR_BUILTINS = new Set(['node:net', 'node:tls', 'node:http', 'node:crypto']);

function doorImportRule() {
  const entry = join(DOMAIN, 'door-process.ts');
  const doorDir = join(DOMAIN, 'door');
  const files = [...(existsSync(entry) ? [entry] : []), ...sourcesUnder(doorDir)];
  checked('W2');
  if (!existsSync(entry) || sourcesUnder(doorDir).length === 0) {
    fail('W2', 'src/main/pocket/door-process.ts or src/main/pocket/door/ does not exist, so the door process has no wall this rule can read');
  }
  const shared = join(ROOT, 'src', 'shared');
  for (const file of files) {
    const specifiers = [];
    for (const node of nodesOf(file)) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push({ node, spec: node.moduleSpecifier.text });
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || calleeName(node) === 'require')) {
        const spec = literalText(node.arguments[0]);
        specifiers.push({ node, spec: spec ?? '(computed)' });
      }
    }
    for (const { node, spec } of specifiers) {
      checked('W2');
      if (DOOR_BUILTINS.has(spec)) continue;
      const target = spec.startsWith('@shared/')
        ? join(shared, spec.slice('@shared/'.length))
        : spec.startsWith('.')
          ? resolve(dirname(file), spec)
          : null;
      if (target !== null && (target.startsWith(`${shared}/`) || target.startsWith(`${doorDir}/`) || target === doorDir)) continue;
      fail('W2', `${where(file, node)} imports ${JSON.stringify(spec)}. The door process may import node:net, node:tls, node:http, node:crypto, src/shared/ and src/main/pocket/door/, and nothing else: what it needs from main arrives as a message.`);
    }
  }
}

// ---------------------------------------------------------------------------
// E1 — the door process's environment is its own (the Phase 330 fix round)
// ---------------------------------------------------------------------------

/**
 * `utilityProcess.fork(..., { env: {} })` LOOKS like an empty environment and
 * is not one: Electron 43 reads an empty object as "not set" and the child
 * inherits main's whole environment. Lens 2 measured it in the running app
 * (`ps -E` on the door process: HOME, GMUX_TAILSCALE_BIN and a variable set
 * only on main) and in a standalone fork (4,458 bytes for `{}`, 884 for one
 * named variable), with every gate green, because `env: {}` read as text is
 * exactly what a rule would have asked for. So this rule asks for the thing
 * that is measured to work: an object literal holding at least one variable,
 * each a plain string, and nothing that carries main's environment in.
 */
function doorEnvRule() {
  const bind = domainFiles.find((f) => f.endsWith(join('pocket', 'bind.ts'))) ?? null;
  checked('E1');
  if (bind === null) {
    fail('E1', 'src/main/pocket/bind.ts does not exist, so nothing forks the door process this rule can read');
    return;
  }
  const forks = callsOf(bind).filter(
    (c) =>
      calleeName(c) === 'fork' &&
      ts.isPropertyAccessExpression(c.expression) &&
      c.expression.expression.getText(astOf(bind)) === 'utilityProcess'
  );
  checked('E1');
  if (forks.length === 0) fail('E1', `${rel(bind)} forks no utilityProcess, so there is no door environment this rule can read`);
  for (const call of forks) {
    checked('E1');
    const options = call.arguments[2];
    if (options === undefined || !ts.isObjectLiteralExpression(options)) {
      fail('E1', `${where(bind, call)}: the fork names no options object literal, so the door process inherits main's whole environment`);
      continue;
    }
    const envs = options.properties.filter(
      (p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText(astOf(bind)) === 'env'
    );
    checked('E1');
    if (envs.length !== 1 || !ts.isPropertyAssignment(envs[0]) || !ts.isObjectLiteralExpression(envs[0].initializer)) {
      fail('E1', `${where(bind, call)}: the fork's env is not one object literal, so what the door process holds cannot be read here (a missing env inherits main's)`);
      continue;
    }
    const vars = envs[0].initializer.properties;
    checked('E1');
    if (vars.length === 0) {
      fail('E1', `${where(bind, call)}: env: {} — Electron reads an EMPTY object as "not set" and hands the door process main's whole environment (measured: HOME, GMUX_TAILSCALE_BIN and a main-only variable in its ps -E). Name one variable of the door's own.`);
    }
    for (const v of vars) {
      checked('E1');
      if (!ts.isPropertyAssignment(v) || !ts.isStringLiteral(v.initializer)) {
        fail('E1', `${where(bind, v)}: ${JSON.stringify(v.getText(astOf(bind)).slice(0, 60))} is not a name with a plain string. A spread, a shorthand or a computed value is main's environment carried in.`);
      }
    }
    checked('E1');
    if (/process\.env/.test(codeOfNode(bind, options))) {
      fail('E1', `${where(bind, call)}: the fork's options name process.env, which is main's environment, the thing the door process must not hold`);
    }
  }
  // The door process reads nothing from its environment.
  const doorFiles = [join(DOMAIN, 'door-process.ts'), ...sourcesUnder(join(DOMAIN, 'door'))].filter((f) => existsSync(f));
  for (const file of doorFiles) {
    checked('E1');
    if (/\bprocess\s*\.\s*env\b/.test(codeTextOf(file))) {
      fail('E1', `${rel(file)} reads process.env. The door process holds one variable of its own and reads none: what it needs from main arrives as a message.`);
    }
  }
}

// ---------------------------------------------------------------------------
// D — the Mac's public name (Phase 332, build/p332/SPEC.md §7.1)
// ---------------------------------------------------------------------------

/**
 * PHASE 332 SENDS HIS MAC'S PUBLIC NAME TO SERVERS TORTIE NEVER TALKED TO
 * BEFORE, and parses their answers, which anyone on the path can forge, in
 * main. Every promise that keeps that small is one clause of
 * `src/main/pocket/public-name.ts` or of the host that runs it
 * (`src/main/pocket/ipc.ts`), and each is a line a later round can delete
 * with every test green: the non-recursive question, the connected socket,
 * the authoritative bit, the refused ranges, the check that starts only at a
 * counted start, the override that is loopback or nothing, and the guard that
 * keeps every test and script off the internet. These eight rules are those
 * clauses, read as code. A missing `public-name.ts` fails every one by name.
 *
 * PHASE 332.1 DRAWS THE CHECK and adds D10 beside them (build/p3321/SPEC.md
 * §8.1): what the sheet is told is four numbers and booleans that nothing
 * decides from, so Pair stays `pairable` alone. A missing `public-name.ts`
 * fails D10 too, because the progress is that module's answers.
 */

const NAME_MODULE = 'public-name';
const NAME_MODULE_OWNER = "Phase 332 builder names's (src/main/pocket/public-name.ts)";
const D_RULES = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D10'];

/** The name module, or null with EVERY D rule failed by name, once each. */
let nameModuleRead;
function nameModule() {
  if (nameModuleRead !== undefined) return nameModuleRead;
  const direct = join(DOMAIN, `${NAME_MODULE}.ts`);
  nameModuleRead = existsSync(direct) ? direct : null;
  if (nameModuleRead !== null) return nameModuleRead;
  for (const id of D_RULES) {
    fail(
      id,
      `src/main/pocket/${NAME_MODULE}.ts does not exist, so this rule read nothing. It is ${NAME_MODULE_OWNER}. ` +
        'A gate that passed here would go green on the day the Mac’s name check does not exist.'
    );
  }
  return null;
}

/** Every module specifier a file names: static imports and exports, `import()` and `require()`. */
function specifiersOf(file) {
  const out = [];
  for (const node of nodesOf(file)) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ node, text: node.moduleSpecifier.text });
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      const isImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (isImport || isRequire) out.push({ node, text: node.arguments[0].text });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      out.push({ node, text: node.moduleReference.expression.text });
    }
  }
  return out;
}

/** The one function declared as `name` in a file (a declaration, a method, or a const arrow), or null. */
function oneFunction(file, name) {
  const found = functionsNamed(file, name);
  return found.length === 1 ? found[0] : null;
}

/** Is `node` inside a function-like node that is an argument of a call named `callee`? */
function insideCallbackOf(node, callee) {
  for (let n = node.parent; n !== undefined; n = n.parent) {
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent !== undefined && ts.isCallExpression(n.parent) && n.parent.arguments.includes(n) && calleeName(n.parent) === callee) {
      return true;
    }
  }
  return false;
}

/** Every descendant of `root`, `root` included. */
function descendantsOf(root) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(root);
  return out;
}

/** The object literal a `return` hands back, unwrapped, or null. */
function returnedObject(ret) {
  let e = ret.expression;
  while (e !== undefined && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e))) e = e.expression;
  return e !== undefined && ts.isObjectLiteralExpression(e) ? e : null;
}

/** `{ kind: 'x', … }`'s `x`, or null. */
function kindOf(obj) {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && memberName(p) === 'kind' && ts.isStringLiteralLike(p.initializer)) return p.initializer.text;
  }
  return null;
}

/** The returns of a function body, nested functions excluded. */
function ownReturnsOf(fn) {
  const out = [];
  const visit = (n) => {
    if (n !== fn && (ts.isFunctionLike(n) || ts.isClassLike(n))) return;
    if (ts.isReturnStatement(n)) out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(fn);
  return out;
}

/** The nearest IfStatement whose then-branch holds `node`, or null. */
function guardingIf(node) {
  for (let n = node; n.parent !== undefined; n = n.parent) {
    const p = n.parent;
    if (ts.isIfStatement(p) && p.thenStatement === n) return p;
    if (ts.isFunctionLike(p)) return null;
  }
  return null;
}

/** Every production `.ts`/`.tsx` file under `src/`, `__tests__/` and `*.test.*` excluded. */
function productionSources() {
  return sourcesUnder(join(ROOT, 'src'));
}

function nameImportRule() {
  // D1. node:dgram in public-name.ts alone; no node:dns in the domain; the
  // module's own imports; and every socket with a lookup of its own.
  const file = nameModule();
  if (file === null) return;
  const DGRAM = new Set(['node:dgram', 'dgram']);
  const DNS = new Set(['node:dns', 'dns', 'dns/promises', 'node:dns/promises']);
  for (const src of productionSources()) {
    for (const { node, text } of specifiersOf(src)) {
      if (!DGRAM.has(text)) continue;
      checked('D1');
      if (src !== file) {
        fail('D1', `${where(src, node)} imports ${JSON.stringify(text)}. The Mac’s name check is the one thing in Tortie that sends a datagram, and it lives in ${rel(file)} alone.`);
      }
    }
  }
  for (const src of domainFiles) {
    for (const { node, text } of specifiersOf(src)) {
      checked('D1');
      if (DNS.has(text)) {
        fail('D1', `${where(src, node)} imports ${JSON.stringify(text)}. node:dns is c-ares, a C parser of bytes anyone on the path can forge, inside main, and it can neither clear the recursion bit nor read the authoritative one (SPEC §4.2).`);
      }
    }
  }
  const allowed = new Set(['node:dgram', 'node:crypto', 'node:net']);
  const own = specifiersOf(file);
  checked('D1', own.length + 1);
  if (!own.some((s) => s.text === 'node:dgram')) fail('D1', `${rel(file)} does not import node:dgram, so the transport this rule guards is somewhere else`);
  for (const { node, text } of own) {
    if (!allowed.has(text)) {
      fail('D1', `${where(file, node)} imports ${JSON.stringify(text)}. The name module imports node:dgram, node:crypto and node:net and NOTHING else: no electron, no logger, no file, nothing under src/.`);
    }
  }
  const declared = new Set();
  for (const n of nodesOf(file)) {
    if (ts.isFunctionDeclaration(n) && n.name !== undefined) declared.add(n.name.text);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) declared.add(n.name.text);
  }
  const sockets = callsOf(file).filter((c) => calleeName(c) === 'createSocket');
  checked('D1');
  if (sockets.length === 0) fail('D1', `${rel(file)} creates no socket, so there is no shipping transport this rule can read`);
  for (const call of sockets) {
    checked('D1');
    const options = call.arguments[0];
    const lookup = options !== undefined && ts.isObjectLiteralExpression(options) ? options.properties.find((p) => memberName(p) === 'lookup') : undefined;
    const named = lookup === undefined ? null : ts.isShorthandPropertyAssignment(lookup) ? lookup.name.text : ts.isPropertyAssignment(lookup) && ts.isIdentifier(lookup.initializer) ? lookup.initializer.text : null;
    if (named === null || !declared.has(named)) {
      fail('D1', `${where(file, call)} creates a socket with no lookup of this file's own, so Node's dgram asks dns.lookup for every bind and connect (measured, SPEC §2): the system resolver is reached by the check that exists not to reach it.`);
    }
  }
}

function nameQueryRule() {
  // D2. The question, the id, the send, the size, the verdict, the bind and the source.
  const file = nameModule();
  if (file === null) return;
  const src = astOf(file);
  const encodes = callsOf(file).filter((c) => calleeName(c) === 'encodeNameQuery');
  checked('D2', encodes.length + 1);
  let zoneFalse = 0;
  for (const call of encodes) {
    const rec = call.arguments[3];
    const inSearch = enclosingName(call) === 'findZoneServers';
    if (rec !== undefined && rec.kind === ts.SyntaxKind.FalseKeyword) {
      if (!inSearch && call.arguments[1] !== undefined && ts.isStringLiteralLike(call.arguments[2]) && call.arguments[2].text === 'A') zoneFalse += 1;
      continue;
    }
    if (rec === undefined || rec.kind !== ts.SyntaxKind.TrueKeyword) {
      fail('D2', `${where(file, call)} builds a question whose recursion is ${JSON.stringify(rec === undefined ? '(nothing)' : rec.getText(src))}, not a literal. Whether a question asks for recursion must be readable here.`);
    } else if (!inSearch) {
      fail('D2', `${where(file, call)} asks for RECURSION outside the server search. A recursive question for the Mac's name makes a resolver on his network fetch it and plant the 300 s miss the phone then meets (SPEC §4.2); only findZoneServers's two questions to NAME_SEARCH_RESOLVERS may set RD.`);
    }
  }
  if (zoneFalse === 0) fail('D2', `${rel(file)} builds no A question with recursion false outside the search, so the zone question this rule guards is not the one sent`);

  const text = codeTextOf(file);
  checked('D2', 2);
  if (/\bMath\s*\.\s*random\b/.test(text)) fail('D2', `${rel(file)} names Math.random. The question's id is the one thing an off-path forger must guess, and it comes from node:crypto.`);
  const cryptoNames = specifiersOf(file)
    .filter((s) => s.text === 'node:crypto' && ts.isImportDeclaration(s.node))
    .flatMap((s) => {
      const b = s.node.importClause?.namedBindings;
      return b !== undefined && ts.isNamedImports(b) ? b.elements.map((e) => e.name.text) : [];
    })
    .filter((n) => ['randomInt', 'randomBytes', 'randomFillSync', 'getRandomValues'].includes(n));
  if (cryptoNames.length === 0 || !callsOf(file).some((c) => cryptoNames.includes(calleeName(c)))) {
    fail('D2', `${rel(file)} takes no id from node:crypto (randomInt, randomBytes or randomFillSync, imported and called).`);
  }

  const sends = callsOf(file).filter((c) => calleeName(c) === 'send' && ts.isPropertyAccessExpression(c.expression));
  checked('D2', sends.length + 1);
  if (sends.length === 0) fail('D2', `${rel(file)} sends nothing, so there is no send this rule can read`);
  for (const call of sends) {
    if (call.arguments.length !== 2 || !ts.isFunctionLike(call.arguments[1])) {
      fail('D2', `${where(file, call)} sends with ${String(call.arguments.length)} argument(s). A connected socket sends the buffer and a callback and NOTHING ELSE: a port or an address here is a datagram to wherever it names, and the kernel's peer filter is gone.`);
    }
    if (!insideCallbackOf(call, 'connect')) {
      fail('D2', `${where(file, call)} sends outside a connect callback. The socket is connected BEFORE it sends, so the kernel delivers only its peer's datagrams.`);
    }
  }

  const handlers = callsOf(file).filter(
    (c) => calleeName(c) === 'on' && ts.isStringLiteralLike(c.arguments[0]) && c.arguments[0].text === 'message' && c.arguments[1] !== undefined && ts.isFunctionLike(c.arguments[1])
  );
  checked('D2', handlers.length + 1);
  if (handlers.length === 0) fail('D2', `${rel(file)} has no message handler, so the datagram filter this rule guards is not there`);
  for (const call of handlers) {
    const fn = call.arguments[1];
    const body = codeOfNode(file, fn);
    if (!/\bNAME_REPLY_MAX_BYTES\b/.test(body)) {
      fail('D2', `${where(file, call)}: the message handler does not compare a datagram's size with NAME_REPLY_MAX_BYTES before it keeps it, so 64 KB of anybody's bytes reach the parser.`);
    }
    const info = fn.parameters[1];
    const infoName = info !== undefined && ts.isIdentifier(info.name) ? info.name.text : null;
    const compares = (field) =>
      descendantsOf(fn).some((n) => {
        if (!ts.isBinaryExpression(n) || ![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.operatorToken.kind)) return false;
        const side = (e) => ts.isPropertyAccessExpression(e) && e.name.text === field && ts.isIdentifier(e.expression) ? e.expression.text : null;
        const l = side(n.left);
        const r = side(n.right);
        return (l === infoName && r !== null && r !== infoName) || (r === infoName && l !== null && l !== infoName);
      });
    if (infoName === null || !compares('address') || !compares('port')) {
      fail('D2', `${where(file, call)}: the message handler does not compare rinfo.address AND rinfo.port with the server's. A datagram from any other source must be dropped before it is read.`);
    }
  }
  const reader = oneFunction(file, 'readNameReply');
  checked('D2', 2);
  if (reader === null) {
    fail('D2', `${rel(file)} declares no single readNameReply`);
  } else {
    const body = codeOfNode(file, reader);
    const cap = body.search(/\bNAME_REPLY_MAX_BYTES\b/);
    const firstRead = body.search(/\.read(?:U?Int\d+(?:BE|LE)?)\s*\(|\breply\s*\[/);
    if (cap < 0 || (firstRead >= 0 && firstRead < cap)) {
      fail('D2', `${where(file, reader)}: readNameReply reads a byte before it compares the reply's length with NAME_REPLY_MAX_BYTES. It trusts reply.length and nothing else (SPEC §4.4).`);
    }
    const equalsGuard = descendantsOf(reader).some(
      (n) => ts.isCallExpression(n) && calleeName(n) === 'equals' && (() => { const g = guardingIfOfExpression(n); return g !== null && /'question'/.test(codeOfNode(file, g.thenStatement)); })()
    );
    if (!equalsGuard) {
      fail('D2', `${where(file, reader)}: readNameReply does not refuse 'question' on a byte-for-byte .equals( of the question it sent. A compressed, case-changed, retyped or reclassed question must be refused.`);
    }
    if (!/0x04\b/.test(body)) fail('D2', `${where(file, reader)}: readNameReply does not read the AA bit (0x04) out of the header.`);
  }
  const judge = oneFunction(file, 'judgeZoneAnswer');
  checked('D2');
  if (judge === null) {
    fail('D2', `${rel(file)} declares no single judgeZoneAnswer`);
  } else {
    const aaGuard = descendantsOf(judge).some(
      (n) => ts.isIfStatement(n) && /\.aa\b|0x04/.test(codeOfNode(file, n.expression)) && /'not-authoritative'/.test(codeOfNode(file, n.thenStatement))
    );
    if (!aaGuard) {
      fail('D2', `${where(file, judge)}: judgeZoneAnswer does not refuse 'not-authoritative' on the AA bit. A cache, an interceptor and a referral all land there; without it any of them can confirm the name.`);
    }
  }
  const binds = callsOf(file).filter((c) => calleeName(c) === 'bind' && ts.isPropertyAccessExpression(c.expression));
  checked('D2', binds.length + 1);
  if (binds.length === 0) fail('D2', `${rel(file)} binds nothing, so a loopback server's socket is not held to 127.0.0.1`);
  for (const call of binds) {
    const a0 = call.arguments[0];
    const address = a0 !== undefined && ts.isObjectLiteralExpression(a0) ? a0.properties.find((p) => memberName(p) === 'address') : undefined;
    const literal = address !== undefined && ts.isPropertyAssignment(address) && ts.isStringLiteralLike(address.initializer) ? address.initializer.text : call.arguments[1] !== undefined && ts.isStringLiteralLike(call.arguments[1]) ? call.arguments[1].text : null;
    if (literal !== '127.0.0.1') {
      fail('D2', `${where(file, call)} binds ${JSON.stringify(literal ?? '(no literal address)')}. A loopback server is asked from a socket bound to the LITERAL 127.0.0.1, so no test, probe or development run binds an interface.`);
    }
  }
}

/** The IfStatement whose CONDITION holds `node`, or null. */
function guardingIfOfExpression(node) {
  for (let n = node; n.parent !== undefined; n = n.parent) {
    const p = n.parent;
    if (ts.isIfStatement(p)) return p.expression === n ? p : null;
    if (ts.isStatement(p) || ts.isFunctionLike(p)) return null;
  }
  return null;
}

const REFUSED_TUPLES = [
  [0, 0, 0, 0, 8],
  [10, 0, 0, 0, 8],
  [100, 64, 0, 0, 10],
  [127, 0, 0, 0, 8],
  [169, 254, 0, 0, 16],
  [172, 16, 0, 0, 12],
  [192, 168, 0, 0, 16],
  [224, 0, 0, 0, 3]
];
const RANGE_TEXT = /(?:^|[^0-9.])(?:100\.64|169\.254|172\.16|192\.168)(?:[./]|$)|(?:^|[^0-9.])(?:0|10|127|224)(?:\.0){0,3}\/(?:3|8)\b/;

/** A numeric array literal's numbers, or null. */
function numbersOf(node) {
  if (!ts.isArrayLiteralExpression(node) || node.elements.length === 0) return null;
  const out = [];
  for (const e of node.elements) {
    if (!ts.isNumericLiteral(e)) return null;
    out.push(Number(e.text.replace(/_/g, '')));
  }
  return out;
}

function nameRangesRule() {
  // D3. The refused ranges, once, read by one function, and spelled nowhere else.
  const file = nameModule();
  if (file === null) return;
  const decls = [];
  for (const src of productionSources()) {
    for (const n of nodesOf(src)) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'NAME_REFUSED_V4') decls.push({ src, n });
    }
  }
  checked('D3', decls.length + 1);
  if (decls.length !== 1 || decls[0].src !== file) {
    fail('D3', `NAME_REFUSED_V4 is declared ${String(decls.length)} time(s) (${decls.map((d) => where(d.src, d.n)).join(', ') || 'nowhere'}); it is declared ONCE, in ${rel(file)}.`);
  } else {
    let init = decls[0].n.initializer;
    while (init !== undefined && (ts.isAsExpression(init) || ts.isParenthesizedExpression(init) || (ts.isCallExpression(init) && calleeName(init) === 'freeze'))) {
      init = ts.isCallExpression(init) ? init.arguments[0] : init.expression;
    }
    const tuples = init !== undefined && ts.isArrayLiteralExpression(init) ? init.elements.map(numbersOf) : null;
    if (tuples === null || tuples.some((t) => t === null)) {
      fail('D3', `${where(file, decls[0].n)}: NAME_REFUSED_V4 is not an array of numeric tuples this rule can read.`);
    } else {
      const key = (t) => t.join(',');
      const have = new Set(tuples.map(key));
      for (const t of REFUSED_TUPLES) {
        checked('D3');
        if (!have.has(key(t))) {
          fail('D3', `${where(file, decls[0].n)}: NAME_REFUSED_V4 does not hold [${t.join(', ')}]${key(t) === '100,64,0,0,10' ? ', MagicDNS’s range: the Mac’s own resolver answers his name with a 100.x address, and a check that accepted it would confirm a name no phone can reach' : ''}.`);
        }
      }
      if (tuples.length !== REFUSED_TUPLES.length) fail('D3', `${where(file, decls[0].n)}: NAME_REFUSED_V4 holds ${String(tuples.length)} tuple(s), not SPEC §4.5's eight.`);
    }
  }
  for (const src of productionSources()) {
    if (!/NAME_REFUSED_V4/.test(readFileSync(src, 'utf8'))) continue;
    for (const n of nodesOf(src)) {
      if (!ts.isIdentifier(n) || n.text !== 'NAME_REFUSED_V4') continue;
      if (ts.isVariableDeclaration(n.parent) && n.parent.name === n) continue;
      if (ts.isImportSpecifier(n.parent) || ts.isExportSpecifier(n.parent)) continue;
      checked('D3');
      if (src !== file || enclosingName(n) !== 'isPublicV4') {
        fail('D3', `${where(src, n)} reads NAME_REFUSED_V4 outside isPublicV4. The ranges are judged in ONE place, so an answer cannot be refused one way here and accepted another way there.`);
      }
    }
  }
  for (const src of domainFiles) {
    if (src === file) continue;
    for (const { node, text } of codeStringsOf(src)) {
      checked('D3');
      if (RANGE_TEXT.test(text)) fail('D3', `${where(src, node)} spells ${JSON.stringify(text)}, one of the refused ranges. They are named once, in ${rel(file)}.`);
    }
    for (const n of nodesOf(src)) {
      const nums = numbersOf(n);
      if (nums === null || nums.length < 2) continue;
      checked('D3');
      const pair = `${String(nums[0])},${String(nums[1])}`;
      if (['100,64', '169,254', '172,16', '192,168'].includes(pair) || (nums.length === 5 && REFUSED_TUPLES.some((t) => t.join(',') === nums.join(',')))) {
        fail('D3', `${where(src, n)} spells [${nums.join(', ')}], one of the refused ranges, in a second list. They are named once, in ${rel(file)}.`);
      }
    }
  }
}

/** A class method of PocketHost by name, or null. */
const hostMethod = (ipc, name) => methodOf(ipc, 'PocketHost', name);

function nameStartRule() {
  // D4. Started at the counted start alone, stopped first in every unpublish,
  // armed on the quit-cleared timer, no clock, and the seam the tests' alone.
  const file = nameModule();
  const ipc = moduleNamed('ipc', 'D4', "Phase 332 builder host's (src/main/pocket/ipc.ts)");
  if (file === null || ipc === null) return;
  const src = astOf(ipc);
  const begins = callsOf(ipc).filter((c) => calleeName(c) === 'beginNameCheck');
  checked('D4', begins.length + 1);
  const openNow = hostMethod(ipc, 'openNow');
  if (begins.length !== 1) {
    fail('D4', `${rel(ipc)} calls beginNameCheck ${String(begins.length)} time(s) (${begins.map((c) => where(ipc, c)).join(', ') || 'never'}). It is called from ONE place, the end of a counted start: the sheet opening, a read and a launch with the door off start nothing.`);
  } else if (openNow === null || enclosingName(begins[0]) !== 'openNow') {
    fail('D4', `${where(ipc, begins[0])}: beginNameCheck is called outside openNow, so something that is not a counted start starts the check.`);
  } else {
    const confirm = callsOf(ipc).find((c) => calleeName(c) === 'closeNowUnlessConfirmed' && enclosingName(c) === 'openNow');
    if (confirm === undefined || confirm.getStart(src) > begins[0].getStart(src)) {
      fail('D4', `${where(ipc, begins[0])}: beginNameCheck comes before openNow's closeNowUnlessConfirmed(), so a door the confirm gate is about to shut starts a check.`);
    }
  }
  for (const name of ['unpublish', 'unexpectedlyDown']) {
    const m = hostMethod(ipc, name);
    checked('D4');
    const first = m?.body?.statements[0];
    const isStop = first !== undefined && ts.isExpressionStatement(first) && ts.isCallExpression(first.expression) && calleeName(first.expression) === 'stopNameCheck';
    if (!isStop) {
      fail('D4', `${m === null ? rel(ipc) : where(ipc, m)}: the first statement of ${name} is not stopNameCheck(). Every way the door stops publishing stops the check first, or a timer outlives the door and asks about a name nothing publishes.`);
    }
  }
  const STARTERS = /\b(?:beginNameCheck|nameRoundNow|askNameRound|armFunnelRestart|exchange)\b/;
  const quiet = [];
  // Phase 332.1: what the sheet is told is read on every status() and starts nothing either.
  for (const name of ['status', 'nameCheckNow', 'pairable', 'nameProgressNow', 'openAtLaunch']) {
    const m = hostMethod(ipc, name);
    if (m === null) {
      fail('D4', `${rel(ipc)} has no PocketHost.${name}, so this rule cannot say it starts nothing`);
      continue;
    }
    quiet.push([`PocketHost.${name}`, m]);
  }
  for (const channel of ['pocket:status', 'pocket:pairingState']) {
    const reg = callsOf(ipc).find((c) => calleeName(c) === 'handle' && c.arguments.some((a) => ts.isStringLiteralLike(a) && a.text === channel));
    if (reg === undefined) fail('D4', `${rel(ipc)} registers no ${channel} handler this rule can read`);
    else quiet.push([`the ${channel} handler`, reg]);
  }
  for (const [what, node] of quiet) {
    checked('D4');
    const hit = STARTERS.exec(codeOfNode(ipc, node));
    if (hit !== null) {
      fail('D4', `${where(ipc, node)}: ${what} names ${hit[0]}. A read of the status, the sheet opening and a launch with the door off reach no timer, no socket and no question.`);
    }
  }
  const nameMethods = [];
  for (const n of nodesOf(ipc)) {
    if (!ts.isClassDeclaration(n) || n.name?.text !== 'PocketHost') continue;
    for (const m of n.members) {
      if (ts.isMethodDeclaration(m) && m.body !== undefined && ts.isIdentifier(m.name) && (/name/i.test(m.name.text) || m.name.text === 'pairable')) nameMethods.push([m.name.text, ipc, m]);
    }
  }
  const streak = oneFunction(file, 'nextNameStreak');
  if (streak === null) fail('D4', `${rel(file)} declares no single nextNameStreak`);
  else nameMethods.push(['nextNameStreak', file, streak]);
  checked('D4');
  if (!nameMethods.some(([n]) => n === 'nameRoundNow')) fail('D4', `${rel(ipc)} has no PocketHost.nameRoundNow, so the name check's rounds are not where this rule reads them`);
  for (const [name, f, m] of nameMethods) {
    checked('D4', 2);
    const body = codeOfNode(f, m);
    const clock = /\bDate\s*\.\s*now\b|\bnow\s*\(|\bperformance\b|\bnew\s+Date\b/.exec(body);
    if (clock !== null) {
      fail('D4', `${where(f, m)}: ${name} names ${JSON.stringify(clock[0])}. Nothing in the name check reads a clock: its gaps are timers, which are monotonic, so a wall clock moved a day either way changes no gap and causes no burst.`);
    }
    const timer = /\b(?:setTimeout|setInterval|setImmediate)\s*\(/.exec(body);
    if (timer !== null && f === ipc) {
      fail('D4', `${where(f, m)}: ${name} arms ${JSON.stringify(timer[0])}. The name timer is armed through armFunnelRestart alone, which the quit's first line clears (beginFunnelShutdown), so a timer can never outlive the quit.`);
    }
  }
  checked('D4');
  if (!nameMethods.some(([name, f, m]) => f === ipc && /name/i.test(name) && /\barmFunnelRestart\s*\(/.test(codeOfNode(f, m)))) {
    fail('D4', `${rel(ipc)}: no name-check method arms its timer through armFunnelRestart, so the quit does not clear it.`);
  }
  nameClockFence(file, ipc);
  for (const s of productionSources()) {
    if (!/new PocketHost\(/.test(readFileSync(s, 'utf8'))) continue;
    for (const n of nodesOf(s)) {
      if (!ts.isNewExpression(n) || !ts.isIdentifier(n.expression) || n.expression.text !== 'PocketHost') continue;
      const arg = n.arguments?.[0];
      if (arg === undefined || !ts.isObjectLiteralExpression(arg)) continue;
      for (const p of arg.properties) {
        checked('D4');
        if (memberName(p) === 'names' || ts.isSpreadAssignment(p)) {
          fail('D4', `${where(s, p)}: PocketHost is handed ${ts.isSpreadAssignment(p) ? 'a spread, which can carry' : ''} \`names\` outside a test. Production and push-seam.ts take public-name.ts's own deps, which only GMUX_POCKET_NAME_SERVERS in a development build points at a stand-in.`);
        }
      }
    }
  }
}

/**
 * D4's fence on the ONE clock (Phase 332.1, build/p3321/SPEC.md §5.2, §8.1).
 * The wall clock is still refused above, by the regex every name-check method
 * is read with. The monotonic clock the sheet's progress needs is read ONLY as
 * `this.names.monotonic()`, ONLY in the four methods §5.3's table names, and
 * public-name.ts names `performance` only inside defaultNameCheckDeps, whose
 * `monotonic` is exactly `() => performance.now()`, with no wall clock
 * anywhere in the file. Nothing in the check decides from this clock, and a
 * read anywhere else is the first step towards something that does.
 */
const NAME_CLOCK_READERS = new Set(['beginNameCheck', 'armNameRound', 'settleNameRound', 'nameProgressNow']);
function nameClockFence(file, ipc) {
  const sf = astOf(ipc);
  const clockCalls = callsOf(ipc).filter((c) => calleeName(c) === 'monotonic');
  checked('D4', clockCalls.length + 1);
  if (clockCalls.length === 0) {
    fail('D4', `${rel(ipc)} reads the names deps' monotonic clock nowhere, so the sheet's progress has no clock and this fence reads nothing (build/p3321/SPEC.md §5.3).`);
  }
  for (const call of clockCalls) {
    const spelled = codeOfNode(ipc, call).replace(/\s+/g, '');
    const inside = enclosingName(call);
    if (spelled !== 'this.names.monotonic()' || call.arguments.length !== 0) {
      fail('D4', `${where(ipc, call)} reads the clock as ${JSON.stringify(spelled.slice(0, 80))}. The one clock is read as this.names.monotonic() and nothing else, so a test's hand-moved clock is the clock every read sees.`);
    } else if (inside === null || !NAME_CLOCK_READERS.has(inside)) {
      fail('D4', `${where(ipc, call)}: ${String(inside)} reads the monotonic clock. It is read in ${[...NAME_CLOCK_READERS].join(', ')} alone, only to tell the sheet how long the check has run and when it asks next; nothing in the check decides from it.`);
    }
  }
  // A reference that is not called is a clock handed somewhere this fence cannot follow.
  for (const n of nodesOf(ipc)) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'monotonic') continue;
    checked('D4');
    if (!(ts.isCallExpression(n.parent) && n.parent.expression === n)) {
      fail('D4', `${where(ipc, n)} takes the monotonic clock without calling it (${JSON.stringify(n.parent.getText(sf).slice(0, 60))}), so a read this fence cannot see can follow.`);
    }
  }
  const deps = oneFunction(file, 'defaultNameCheckDeps');
  checked('D4', 3);
  if (deps === null) {
    fail('D4', `${rel(file)} declares no single defaultNameCheckDeps, so the shipping clock is not where this fence reads it`);
    return;
  }
  const props = descendantsOf(deps).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'monotonic');
  if (props.length !== 1 || codeOfNode(file, props[0].initializer).replace(/\s+/g, '') !== '()=>performance.now()') {
    fail('D4', `${where(file, props[0] ?? deps)}: defaultNameCheckDeps's monotonic is ${props.length === 1 ? JSON.stringify(codeOfNode(file, props[0].initializer).trim().slice(0, 60)) : `declared ${String(props.length)} time(s)`}, not () => performance.now(). Node's performance clock is monotonic and never moved by setting the clock; a wall clock would draw an elapsed time that jumps an hour or goes backwards.`);
  }
  const text = codeTextOf(file);
  const start = deps.getStart(astOf(file));
  const end = deps.getEnd();
  for (const m of text.matchAll(/\bperformance\b/g)) {
    if (m.index >= start && m.index < end) continue;
    const { line } = astOf(file).getLineAndCharacterOfPosition(m.index);
    fail('D4', `${rel(file)}:${String(line + 1)} names performance outside defaultNameCheckDeps. The name module reads one clock, in its shipping deps, and only for the sheet.`);
  }
  const wall = /\bDate\s*\.\s*now\b|\bnew\s+Date\b/.exec(text);
  if (wall !== null) {
    const { line } = astOf(file).getLineAndCharacterOfPosition(wall.index);
    fail('D4', `${rel(file)}:${String(line + 1)} names ${JSON.stringify(wall[0])}. The name module reads no wall clock anywhere: the deadline is a setTimeout, the schedule is gaps, and the one clock is monotonic.`);
  }
}

function nameLogRule() {
  // D5. The name module logs nothing; the host logs fixed words, a verdict and a reason.
  const file = nameModule();
  const ipc = moduleNamed('ipc', 'D5', "Phase 332 builder host's (src/main/pocket/ipc.ts)");
  if (file === null || ipc === null) return;
  const isLog = (c) => /^(?:debug|info|warn|error|log|trace)$/.test(calleeName(c) ?? '');
  for (const call of callsOf(file)) {
    checked('D5');
    if (isLog(call)) fail('D5', `${where(file, call)} is a log call. The name module logs nothing: it answers reason words and the host logs those.`);
  }
  const POISON = /\b(?:publicName|target|address|servers|tailnet|bytes)\b/;
  for (const n of nodesOf(ipc)) {
    if (!ts.isClassDeclaration(n) || n.name?.text !== 'PocketHost') continue;
    for (const m of n.members) {
      if (!ts.isMethodDeclaration(m) || m.body === undefined || !ts.isIdentifier(m.name) || !/name/i.test(m.name.text)) continue;
      for (const call of descendantsOf(m).filter((x) => ts.isCallExpression(x) && isLog(x))) {
        for (const arg of call.arguments) {
          checked('D5');
          // A literal is a fixed sentence and never a value: only what is
          // interpolated, or passed as an expression, is read.
          const spans = ts.isTemplateExpression(arg) ? arg.templateSpans.map((s) => s.expression) : ts.isStringLiteralLike(arg) ? [] : [arg];
          for (const e of spans) {
            const text = codeOfNode(ipc, e);
            const hit = POISON.exec(text);
            const ok = hit === null && ((ts.isIdentifier(e) && /^(?:verdict|reason)$/.test(e.text)) || (ts.isPropertyAccessExpression(e) && /^(?:verdict|reason)$/.test(e.name.text) && ts.isIdentifier(e.expression)));
            if (!ok) {
              fail(
                'D5',
                `${where(ipc, call)} hands ${JSON.stringify(text.slice(0, 80))} to ${calleeName(call)}()${hit === null ? '' : `, which names ${JSON.stringify(hit[0])}`}. ` +
                  'A name-check log line interpolates a verdict or a reason and nothing else: no log line names the public name, the tailnet, a server, an answered address or a packet.'
              );
            }
          }
        }
      }
    }
  }
  // A LINE PER CHANGE, NEVER A LINE PER ROUND (Phase 332.1, build/p3321/SPEC.md
  // §5.3, §8.1). The progress pushes two statuses a round and logs nothing:
  // every log call in settleNameRound sits in the THEN branch of an if, inside
  // the method, whose condition names `last` (a change of verdict), `opened`
  // (pairing opened anyway) or `confirmed`. An else branch does not count,
  // because the else of a change is every round that did not change.
  const settle = hostMethod(ipc, 'settleNameRound');
  checked('D5');
  if (settle === null) {
    fail('D5', `${rel(ipc)} has no PocketHost.settleNameRound, so where a round's answer is logged is not where this rule reads it`);
    return;
  }
  const CHANGE = /\b(?:last|opened|confirmed)\b/;
  for (const call of descendantsOf(settle).filter((x) => ts.isCallExpression(x) && isLog(x))) {
    checked('D5');
    let behind = false;
    for (let n = call; n !== settle && n.parent !== undefined; n = n.parent) {
      const p = n.parent;
      if (ts.isIfStatement(p) && p.thenStatement === n && CHANGE.test(codeOfNode(ipc, p.expression))) {
        behind = true;
        break;
      }
    }
    if (!behind) {
      fail('D5', `${where(ipc, call)}: settleNameRound logs with no if around it whose condition names last, opened or confirmed. A round is asked every 20 to 60 s; a line per round fills app.log with the same words, which is why the log says a verdict once, when it changes.`);
    }
  }
}

function pairableRule() {
  // D6. `pairable` is main's one predicate; beginPairing and the sheet read it.
  const file = nameModule();
  const ipc = moduleNamed('ipc', 'D6', "Phase 332 builder host's (src/main/pocket/ipc.ts)");
  if (file === null || ipc === null) return;
  const src = astOf(ipc);
  const decls = [];
  for (const n of nodesOf(ipc)) {
    if (!ts.isClassDeclaration(n) || n.name?.text !== 'PocketHost') continue;
    for (const m of n.members) if ((ts.isMethodDeclaration(m) || ts.isPropertyDeclaration(m) || ts.isGetAccessor(m)) && memberName(m) === 'pairable') decls.push(m);
  }
  checked('D6');
  if (decls.length !== 1 || !ts.isMethodDeclaration(decls[0])) fail('D6', `PocketHost declares pairable ${String(decls.length)} time(s); it is ONE method.`);
  const status = hostMethod(ipc, 'status');
  checked('D6');
  const answered = status === null ? [] : descendantsOf(status).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'pairable');
  if (answered.length !== 1 || codeOfNode(ipc, answered[0].initializer).replace(/\s+/g, '') !== 'this.pairable()') {
    fail('D6', `${status === null ? rel(ipc) : where(ipc, status)}: status() does not answer pairable: this.pairable(). The sheet draws Pair on main's one predicate and never works it out again.`);
  }
  const begin = hostMethod(ipc, 'beginPairing');
  checked('D6');
  if (begin === null) {
    fail('D6', `${rel(ipc)} has no PocketHost.beginPairing`);
  } else {
    const calls = descendantsOf(begin).filter((n) => ts.isCallExpression(n));
    const ask = calls.find((c) => calleeName(c) === 'pairable' && ts.isPropertyAccessExpression(c.expression) && c.expression.expression.kind === ts.SyntaxKind.ThisKeyword);
    const still = calls.find((c) => calleeName(c) === 'stillPublished');
    if (ask === undefined || still === undefined || ask.getStart(src) > still.getStart(src)) {
      fail('D6', `${where(ipc, begin)}: beginPairing does not ask this.pairable() before stillPublished(). A code shown before the Mac's name is on the internet is the failed first scan this phase exists to stop.`);
    }
    // AND AGAIN AFTER THE READ (the fix round): a switch-on round can answer no
    // while stillPublished() reads Tailscale, and a verifier opened a window on
    // the answer from before the read (ATK-T1).
    checked('D6');
    const asks = calls.filter((c) => calleeName(c) === 'pairable' && ts.isPropertyAccessExpression(c.expression) && c.expression.expression.kind === ts.SyntaxKind.ThisKeyword);
    const opens = calls.filter((c) => calleeName(c) === 'open' && ts.isPropertyAccessExpression(c.expression) && /^this\s*\.\s*pairing$/.test(c.expression.expression.getText(src)));
    const again = still === undefined || opens.length !== 1 ? undefined : asks.find((a) => a.getStart(src) > still.getStart(src) && a.getStart(src) < opens[0].getStart(src));
    if (again === undefined) {
      fail('D6', `${where(ipc, begin)}: beginPairing does not ask this.pairable() AGAIN after stillPublished() and before its one this.pairing.open(). A switch-on round that answers no while Tailscale is read takes Pair away, and a window opened on the answer from before the read sends a phone to a name that is gone, whose miss it keeps for five minutes.`);
    }
  }
  const phone = join(ROOT, 'src', 'renderer', 'settings', 'PhoneSection.tsx');
  checked('D6');
  if (!existsSync(phone)) {
    fail('D6', 'src/renderer/settings/PhoneSection.tsx does not exist, so the sheet this rule reads is not there');
    return;
  }
  const readsPairable = (node) => descendantsOf(node).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'pairable');
  for (const name of ['pairingStage', 'pairAfterAllowNext']) {
    checked('D6');
    const fn = oneFunction(phone, name);
    if (fn === null || !readsPairable(fn)) fail('D6', `${fn === null ? rel(phone) : where(phone, fn)}: ${name} does not read .pairable. Whether a code may show is main's word, read and never worked out.`);
  }
  const onPairs = nodesOf(phone).filter((n) => ts.isJsxAttribute(n) && n.name.getText(astOf(phone)) === 'onPair' && n.initializer !== undefined && ts.isJsxExpression(n.initializer) && n.initializer.expression !== undefined && ts.isFunctionLike(n.initializer.expression));
  const live = onPairs.filter((n) => !/^\(\)\s*=>\s*undefined$/.test(n.initializer.expression.getText(astOf(phone)).trim()));
  checked('D6', live.length + 1);
  if (live.length === 0) fail('D6', `${rel(phone)} wires no onPair this rule can read`);
  for (const n of live) {
    if (!readsPairable(n)) fail('D6', `${where(phone, n)}: onPair does not read .pairable, so a press decides from something main did not say.`);
  }
  // WIDENED BY PHASE 332.1 (build/p3321/SPEC.md §8.1): `Your Mac’s name is
  // live` needs main's own 'confirmed', so the sheet may compare with it too,
  // and with nothing else, and never where it decides Pair.
  const NAME_WORDS = new Set(['unreadable', 'confirmed']);
  const pairDeciders = [oneFunction(phone, 'pairingStage'), oneFunction(phone, 'pairAfterAllowNext'), ...live.map((n) => n.initializer.expression)].filter((x) => x !== null);
  const insideDecider = (node) => pairDeciders.some((d) => node.getStart(astOf(phone)) >= d.getStart(astOf(phone)) && node.getEnd() <= d.getEnd());
  // WIDENED BY PHASE 333.1 (build/p3331/SPEC.md §6.1, r2 §Attack F25): the
  // sheet is now PhoneSection.tsx AND phone/steps.ts and phone/StepsCard.tsx, which
  // compose and draw its three steps, so this clause reads EVERY file of the
  // sheet's surface. Read over PhoneSection.tsx alone, the composer could
  // decide a face from nameCheck with this rule green.
  for (const file of phoneSurfaceFiles()) {
    for (const n of nodesOf(file)) {
      if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'nameCheck') continue;
      checked('D6');
      const p = n.parent;
      const ok =
        p !== undefined &&
        ts.isBinaryExpression(p) &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind) &&
        ((p.left === n && ts.isStringLiteralLike(p.right) && NAME_WORDS.has(p.right.text)) || (p.right === n && ts.isStringLiteralLike(p.left) && NAME_WORDS.has(p.left.text)));
      if (!ok) fail('D6', `${where(file, n)} reads nameCheck other than to compare it with 'unreadable' or 'confirmed'. The sheet reads it for the lines it draws above Pair and decides nothing else from it.`);
      else if (file === phone && insideDecider(n)) fail('D6', `${where(phone, n)} compares nameCheck inside pairingStage, pairAfterAllowNext or onPair. Whether Pair shows, and whether a carried press asks for the code, is main's pairable and nothing the sheet works out from the name.`);
    }
  }
  // AND THE STEPS NAME THE NAME CHECK NOT AT ALL (D19): the name block is drawn
  // inside the pair card's body, which is PhoneSection.tsx's, so the composer
  // and the frame have no reason to read either field. It is read over EVERY
  // file under phone/, so the frame is held whatever it is called: the SPEC
  // named it Steps.tsx, which sits beside steps.ts and differs from it by the
  // case of one letter on a volume that folds case. A missing composer or
  // frame fails by name: the split is the phase's (D19), and a rule over a
  // file that is not there would go green on the day the steps do not exist.
  const phoneDir = join(ROOT, 'src', 'renderer', 'settings', 'phone');
  const stepFiles = sourcesUnder(phoneDir);
  checked('D6', 2);
  if (!stepFiles.some((f) => f === join(phoneDir, 'steps.ts'))) {
    fail('D6', 'src/renderer/settings/phone/steps.ts does not exist (build/p3331/SPEC.md D19, the sheet builder\'s), so whether the step composer decides anything from the name check is not read');
  }
  if (!stepFiles.some((f) => f.endsWith('.tsx') && !/\/Qr\.tsx$/.test(f) && /\bcheckListOf\b|\bStepFace\b/i.test(readFileSync(f, 'utf8')))) {
    fail('D6', 'no .tsx under src/renderer/settings/phone/ draws a StepFace (build/p3331/SPEC.md D19, the step frame), so whether the frame decides anything from the name check is not read');
  }
  for (const file of stepFiles) {
    for (const n of nodesOf(file)) {
      const text = ts.isIdentifier(n) || ts.isPrivateIdentifier(n) || ts.isStringLiteralLike(n) ? n.text : null;
      if (text !== 'nameCheck' && text !== 'nameProgress') continue;
      checked('D6');
      fail('D6', `${where(file, n)} names ${text}. The three steps draw the name block inside the pair card, which is PhoneSection.tsx's, and decide nothing from the name check (build/p3331/SPEC.md §6.1, r2 §Attack F25).`);
    }
  }
}

// ---------------------------------------------------------------------------
// D10 — the progress decides nothing and carries nothing (Phase 332.1)
// ---------------------------------------------------------------------------

/** The four members the sheet is told, and their exact types (build/p3321/SPEC.md §5.4). */
const PROGRESS_MEMBERS = new Map([
  ['answers', 'readonly PocketNameAnswer[]'],
  ['asking', 'boolean'],
  ['elapsedMs', 'number'],
  ['nextInMs', 'number | null']
]);
/** The run's stamps (§5.3), read by nameProgressNow alone. */
const PROGRESS_STAMPS = new Set(['startedAt', 'nextAt', 'endedAt', 'answers']);
/** Where §5.3's table writes each, and nowhere else. */
const PROGRESS_WRITERS = new Map([
  ['startedAt', new Set()],
  ['nextAt', new Set(['armNameRound'])],
  ['endedAt', new Set(['settleNameRound'])],
  ['answers', new Set(['settleNameRound'])],
  ['nameShown', new Set(['beginNameCheck', 'stopNameCheck'])]
]);

/** Is `n` (a property access or element access) the left side of an assignment? */
function assignedTo(n) {
  let child = n;
  let p = n.parent;
  while (p !== undefined && ts.isParenthesizedExpression(p)) {
    child = p;
    p = p.parent;
  }
  return p !== undefined && ts.isBinaryExpression(p) && p.left === child && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}

function nameProgressRule() {
  // D10. What the sheet is told: four members and no string, read in one
  // method, called from one place, and named by nothing that decides Pair.
  const file = nameModule();
  const ipc = moduleNamed('ipc', 'D10', "Phase 332.1 builder main's (src/main/pocket/ipc.ts)");
  if (file === null || ipc === null) return;

  // (1) THE CONTRACT: the answer's three kinds, the progress's four members, the field.
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('D10');
  if (!existsSync(contract)) {
    fail('D10', 'src/shared/ipc/pocket.ts does not exist, so the contract this rule reads is not there');
  } else {
    const csf = astOf(contract);
    const alias = nodesOf(contract).find((n) => ts.isTypeAliasDeclaration(n) && n.name.text === 'PocketNameAnswer');
    checked('D10');
    const kinds = alias === undefined || !ts.isUnionTypeNode(alias.type) ? null : alias.type.types.map((t) => (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : null));
    if (kinds === null || JSON.stringify([...kinds].sort()) !== JSON.stringify(['negative', 'record', 'unreadable'])) {
      fail('D10', `${alias === undefined ? rel(contract) : where(contract, alias)}: PocketNameAnswer is ${alias === undefined ? 'not declared' : JSON.stringify(alias.type.getText(csf))}, not exactly 'record' | 'negative' | 'unreadable'. A dot is one of three kinds and never a word of a server's.`);
    }
    const progress = interfaceOf(contract, 'PocketNameProgress');
    checked('D10');
    if (progress === null) {
      fail('D10', `${rel(contract)} declares no PocketNameProgress, so what the sheet is told is not read`);
    } else {
      const seen = new Set();
      for (const m of progress.members) {
        checked('D10');
        const name = memberName(m);
        const want = name === null ? undefined : PROGRESS_MEMBERS.get(name);
        const got = ts.isPropertySignature(m) && m.type !== undefined ? m.type.getText(csf).replace(/\s+/g, ' ') : '(not a property)';
        if (want === undefined) {
          fail('D10', `${where(contract, m)}: PocketNameProgress.${String(name)} is not one of its four members (${[...PROGRESS_MEMBERS.keys()].join(', ')}). The sheet is told durations, a flag and three kinds of answer, and NOTHING ELSE: no name, server, address, port or reason word.`);
          continue;
        }
        seen.add(name);
        if (got !== want || /\bstring\b/.test(got)) {
          fail('D10', `${where(contract, m)}: PocketNameProgress.${name} is ${got}, not ${want}. No member of the progress is a string.`);
        }
      }
      if (progress.members.length !== PROGRESS_MEMBERS.size || seen.size !== PROGRESS_MEMBERS.size) {
        fail('D10', `${where(contract, progress)}: PocketNameProgress has ${String(progress.members.length)} member(s) (${[...seen].join(', ') || 'none of the four'}); it has exactly the four the SPEC pins`);
      }
    }
    const statusType = interfaceOf(contract, 'PocketStatus');
    const field = statusType?.members.find((m) => memberName(m) === 'nameProgress');
    checked('D10');
    const fieldType = field !== undefined && ts.isPropertySignature(field) && field.type !== undefined ? field.type.getText(csf).replace(/\s+/g, ' ') : null;
    if (fieldType !== 'PocketNameProgress | null') {
      fail('D10', `${field === undefined ? rel(contract) : where(contract, field)}: PocketStatus.nameProgress is ${fieldType === null ? 'not declared' : fieldType}, not PocketNameProgress | null`);
    }
  }

  // (2) THE STAMPS: read in nameProgressNow alone, written where §5.3's table puts them.
  const isStampAccess = (n) =>
    (ts.isPropertyAccessExpression(n) && PROGRESS_STAMPS.has(n.name.text)) ||
    (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && PROGRESS_STAMPS.has(n.argumentExpression.text));
  const stampOf = (n) => (ts.isPropertyAccessExpression(n) ? n.name.text : n.argumentExpression.text);
  const isShownAccess = (n) =>
    (ts.isPropertyAccessExpression(n) && n.name.text === 'nameShown' && n.expression.kind === ts.SyntaxKind.ThisKeyword) ||
    (ts.isElementAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'nameShown');
  /** THE ONE EXEMPT READ: `run.answers = round.answers;` in settleNameRound, whose object is the NameRound parameter. */
  const exemptRead = (n) => {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'answers' || !ts.isIdentifier(n.expression) || n.expression.text !== 'round') return false;
    const p = n.parent;
    return (
      p !== undefined &&
      ts.isBinaryExpression(p) &&
      p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      p.right === n &&
      ts.isPropertyAccessExpression(p.left) &&
      p.left.name.text === 'answers' &&
      enclosingName(n) === 'settleNameRound'
    );
  };
  let sawRead = false;
  for (const n of nodesOf(ipc)) {
    const stamp = isStampAccess(n);
    const shown = !stamp && isShownAccess(n);
    const bound = ts.isBindingElement(n) && [n.propertyName, n.name].some((x) => x !== undefined && ts.isIdentifier(x) && (PROGRESS_STAMPS.has(x.text) || x.text === 'nameShown'));
    if (!stamp && !shown && !bound) continue;
    checked('D10');
    const what = bound ? `a destructured ${n.getText(astOf(ipc))}` : stamp ? `.${stampOf(n)}` : 'this.nameShown';
    const inside = enclosingName(n);
    if (!bound && assignedTo(n)) {
      const allowed = PROGRESS_WRITERS.get(stamp ? stampOf(n) : 'nameShown');
      if (inside === null || !allowed.has(inside)) {
        fail('D10', `${where(ipc, n)}: ${String(inside)} writes ${what}. It is written in ${allowed.size === 0 ? "beginNameCheck's run literal alone" : [...allowed].join(' and ')} (build/p3321/SPEC.md §5.3's table), so what the sheet draws moves only when the check does.`);
      }
      continue;
    }
    if (exemptRead(n)) continue;
    if (inside === 'nameProgressNow') {
      sawRead = true;
      continue;
    }
    fail('D10', `${where(ipc, n)}: ${String(inside)} reads ${what}. The progress is read by nameProgressNow alone, so nothing in main decides Pair, a round or a log line from what the sheet is drawn.`);
  }
  checked('D10');
  if (!sawRead) fail('D10', `${rel(ipc)}: nameProgressNow reads none of the run's stamps nor this.nameShown, so this rule's fence reads nothing`);

  // (3) nameProgressNow: declared once, called once, in status(), as the field.
  const progressNow = hostMethod(ipc, 'nameProgressNow');
  checked('D10');
  if (progressNow === null) fail('D10', `${rel(ipc)} has no PocketHost.nameProgressNow, so what the sheet is told has no one place`);
  const calls = callsOf(ipc).filter((c) => calleeName(c) === 'nameProgressNow');
  checked('D10', calls.length + 1);
  const fieldOk = (c) =>
    codeOfNode(ipc, c).replace(/\s+/g, '') === 'this.nameProgressNow()' &&
    c.parent !== undefined &&
    ts.isPropertyAssignment(c.parent) &&
    memberName(c.parent) === 'nameProgress' &&
    enclosingName(c) === 'status';
  if (calls.length !== 1 || !fieldOk(calls[0])) {
    fail('D10', `${calls.length === 0 ? rel(ipc) : where(ipc, calls[0])}: nameProgressNow is called ${String(calls.length)} time(s)${calls.length === 1 ? ', not as status()’s nameProgress: this.nameProgressNow()' : ''}. It is called from ONE place, status(), as the field the sheet reads.`);
  }
  for (const n of nodesOf(ipc)) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'nameProgressNow') continue;
    checked('D10');
    if (!(ts.isCallExpression(n.parent) && n.parent.expression === n)) fail('D10', `${where(ipc, n)} takes nameProgressNow without calling it, so a caller this rule cannot see can follow.`);
  }

  // (4) THE SHEET: nothing that decides Pair names the progress.
  const phone = join(ROOT, 'src', 'renderer', 'settings', 'PhoneSection.tsx');
  checked('D10');
  if (!existsSync(phone)) {
    fail('D10', 'src/renderer/settings/PhoneSection.tsx does not exist, so the sheet this rule reads is not there');
    return;
  }
  const psf = astOf(phone);
  const namesProgress = (node) => descendantsOf(node).some((x) => (ts.isIdentifier(x) || ts.isStringLiteralLike(x)) && x.text === 'nameProgress');
  for (const name of ['pairingStage', 'pairAfterAllowNext']) {
    checked('D10');
    const fn = oneFunction(phone, name);
    if (fn === null) fail('D10', `${rel(phone)} declares no single ${name}, so whether it names nameProgress is not read`);
    else if (namesProgress(fn)) fail('D10', `${where(phone, fn)}: ${name} names nameProgress. Pair follows main's pairable alone; the dots are drawn and decide nothing.`);
  }
  const onPairs = nodesOf(phone).filter((n) => ts.isJsxAttribute(n) && n.name.getText(psf) === 'onPair' && n.initializer !== undefined && ts.isJsxExpression(n.initializer) && n.initializer.expression !== undefined && ts.isFunctionLike(n.initializer.expression));
  const live = onPairs.filter((n) => !/^\(\)\s*=>\s*undefined$/.test(n.initializer.expression.getText(psf).trim()));
  checked('D10', live.length + 1);
  if (live.length === 0) fail('D10', `${rel(phone)} wires no onPair this rule can read`);
  for (const n of live) {
    if (namesProgress(n)) fail('D10', `${where(phone, n)}: onPair names nameProgress, so a press decides from the dots rather than from main's pairable.`);
  }
}

function nameOverrideRule() {
  // D7. The override: read in one function, ignored when packaged, loopback
  // or refused, and a refusal never reaches the search.
  const file = nameModule();
  if (file === null) return;
  const from = oneFunction(file, 'nameServersFrom');
  checked('D7');
  if (from === null) {
    fail('D7', `${rel(file)} declares no single nameServersFrom`);
    return;
  }
  const envConsts = new Set(
    nodesOf(file)
      .filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && ts.isStringLiteralLike(n.initializer) && n.initializer.text === 'GMUX_POCKET_NAME_SERVERS')
      .map((n) => n.name.text)
  );
  let readsInside = 0;
  for (const s of productionSources()) {
    const raw = readFileSync(s, 'utf8');
    if (!/GMUX_POCKET_NAME_SERVERS|NAME_SERVERS_ENV/.test(raw)) continue;
    for (const n of nodesOf(s)) {
      const read =
        (ts.isElementAccessExpression(n) && ((ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'GMUX_POCKET_NAME_SERVERS') || (ts.isIdentifier(n.argumentExpression) && (envConsts.has(n.argumentExpression.text) || n.argumentExpression.text === 'NAME_SERVERS_ENV')))) ||
        (ts.isPropertyAccessExpression(n) && n.name.text === 'GMUX_POCKET_NAME_SERVERS');
      if (!read) continue;
      checked('D7');
      if (s === file && enclosingName(n) === 'nameServersFrom') readsInside += 1;
      else fail('D7', `${where(s, n)} reads GMUX_POCKET_NAME_SERVERS outside nameServersFrom. The override is read in ONE function, which a packaged build answers with the search before it looks.`);
    }
  }
  checked('D7');
  if (readsInside === 0) fail('D7', `${where(file, from)}: nameServersFrom does not read GMUX_POCKET_NAME_SERVERS, so the override is somewhere this rule does not read.`);
  const returns = ownReturnsOf(from)
    .map((r) => ({ r, obj: returnedObject(r) }))
    .filter((x) => x.obj !== null);
  const search = returns.filter((x) => kindOf(x.obj) === 'search');
  const packagedFirst = search.find((x) => {
    const g = guardingIf(x.r);
    return g !== null && /\bpackaged\b/.test(codeOfNode(file, g.expression));
  });
  const firstRead = descendantsOf(from).find((n) => ts.isElementAccessExpression(n));
  checked('D7', 3);
  if (packagedFirst === undefined || (firstRead !== undefined && packagedFirst.r.getStart(astOf(file)) > firstRead.getStart(astOf(file)))) {
    fail('D7', `${where(file, from)}: nameServersFrom does not answer { kind: 'search' } for a packaged build before it reads the variable. A packaged Tortie ignores GMUX_POCKET_NAME_SERVERS, as it ignores GMUX_TAILSCALE_BIN.`);
  }
  for (const x of search) {
    if (x === packagedFirst) continue;
    const g = guardingIf(x.r);
    const cond = g === null ? '' : codeOfNode(file, g.expression);
    if (!/===\s*undefined/.test(cond) || !/trim\(\)\s*===\s*''/.test(cond)) {
      fail('D7', `${where(file, x.r)}: nameServersFrom answers the search for something that is neither a packaged build nor an unset or blank value. A value that is set and unusable REFUSES and never falls back: from a probe, the search is real DNS.`);
    }
  }
  if (!returns.some((x) => kindOf(x.obj) === 'refused')) {
    fail('D7', `${where(file, from)}: nameServersFrom never answers { kind: 'refused' }, so an unusable override has nowhere to go but the search.`);
  }
  const anchored = new Set(
    nodesOf(file)
      .filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && n.initializer.kind === ts.SyntaxKind.RegularExpressionLiteral && n.initializer.text.startsWith('/^127\\.0\\.0\\.1:') && /\$\/[a-z]*$/.test(n.initializer.text))
      .map((n) => n.name.text)
  );
  const matchers = descendantsOf(from).filter(
    (n) =>
      ts.isCallExpression(n) &&
      ['exec', 'test'].includes(calleeName(n) ?? '') &&
      ts.isPropertyAccessExpression(n.expression) &&
      ((ts.isIdentifier(n.expression.expression) && anchored.has(n.expression.expression.text)) || (n.expression.expression.kind === ts.SyntaxKind.RegularExpressionLiteral && n.expression.expression.text.startsWith('/^127\\.0\\.0\\.1:')))
  );
  checked('D7');
  if (matchers.length === 0) {
    fail('D7', `${where(file, from)}: nameServersFrom does not match each entry against a pattern anchored on ^127\\.0\\.0\\.1: and ending in $, so an override can name a server that is not loopback.`);
  }
  const round = oneFunction(file, 'askNameRound');
  checked('D7');
  if (round === null) {
    fail('D7', `${rel(file)} declares no single askNameRound`);
  } else {
    const src = astOf(file);
    const refusal = descendantsOf(round).find((n) => ts.isIfStatement(n) && /'refused'/.test(codeOfNode(file, n.expression)) && /'override-unusable'/.test(codeOfNode(file, n.thenStatement)));
    const search = descendantsOf(round).find((n) => ts.isIdentifier(n) && n.text === 'findZoneServers');
    if (refusal === undefined || (search !== undefined && search.getStart(src) < refusal.getStart(src))) {
      fail('D7', `${where(file, round)}: askNameRound does not return override-unusable for a refused source BEFORE it names findZoneServers, so a refused override can reach the search, which from a probe is real DNS.`);
    }
  }
}

function nameElectronRule() {
  // D8. Outside Electron, the shipping transport sends to 127.0.0.1 alone.
  const file = nameModule();
  if (file === null) return;
  const src = astOf(file);
  const sockets = callsOf(file).filter((c) => calleeName(c) === 'createSocket');
  checked('D8', sockets.length + 1);
  if (sockets.length === 0) fail('D8', `${rel(file)} creates no socket, so there is no shipping transport this rule can read`);
  for (const call of sockets) {
    let fn = call.parent;
    while (fn !== undefined && !(ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && (ts.isVariableDeclaration(fn.parent) || ts.isPropertyAssignment(fn.parent))))) fn = fn.parent;
    if (fn === undefined) {
      fail('D8', `${where(file, call)} creates a socket outside any named function`);
      continue;
    }
    const guard = descendantsOf(fn).find((n) => {
      if (!ts.isIfStatement(n) || n.getStart(src) > call.getStart(src)) return false;
      const cond = codeOfNode(file, n.expression);
      return /process\s*\.\s*versions\s*\.\s*electron/.test(cond) && /'127\.0\.0\.1'/.test(cond) && /\berror\b|EXCHANGE_ERROR/i.test(codeOfNode(file, n.thenStatement));
    });
    if (guard === undefined) {
      fail('D8', `${where(file, call)}: the transport that creates this socket does not first answer an error for a server that is not 127.0.0.1 unless process.versions.electron is a string. Vitest, tsx and plain node are not Electron, so this one check is what keeps every test and script that forgets to inject its deps off the internet.`);
    }
  }
}

/** Unwrap parentheses, `as` and `await` around an expression. */
function unwrapped(e) {
  let n = e;
  while (n !== undefined && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isAwaitExpression(n) || ts.isNonNullExpression(n))) n = n.expression;
  return n;
}

/** Does this statement (or block) hold a `return false`, nested functions excluded? */
function returnsFalse(statement) {
  return ownReturnsOf(statement).some((r) => r.expression !== undefined && r.expression.kind === ts.SyntaxKind.FalseKeyword);
}

/** A const's numeric initializer, read through one identifier, or null. */
function numberOf(file, e) {
  const n = unwrapped(e);
  if (n === undefined) return null;
  const literal = (x) => (ts.isNumericLiteral(x) ? Number(x.text.replace(/_/g, '')) : null);
  if (ts.isNumericLiteral(n)) return literal(n);
  if (!ts.isIdentifier(n)) return null;
  const decls = nodesOf(file).filter((d) => ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === n.text && d.initializer !== undefined);
  if (decls.length !== 1 || !ts.isNumericLiteral(unwrapped(decls[0].initializer))) return null;
  return literal(unwrapped(decls[0].initializer));
}

/** The longest the push seam may wait for main's word before it pairs nothing. */
const SEAM_PAIRABLE_WAIT_MAX_MS = 120_000;

function seamNameRule() {
  // D9 (the round after his ruling of 2026-09-30). The push seam is the one
  // caller of beginPairing outside a test, and it runs in a development
  // Electron, where D8 does not apply: a door it publishes checks its name, and
  // without the loopback stand-in that check is the real ts.net search for a
  // made-up name. A verifier deleted the refusal, and then the wait, and every
  // gate stayed green. So: nameStandInOnly answers nameServersFrom's `fixed`
  // alone; openDoorForPairing refuses on it before the switch is touched; it
  // waits, a bounded time, for main's pairable before it answers true; and the
  // seam presses Pair only on that true.
  const seam = join(ROOT, 'src', 'main', 'harness', 'push-seam.ts');
  checked('D9');
  if (!existsSync(seam)) {
    fail('D9', 'src/main/harness/push-seam.ts does not exist, so this rule read nothing. It is Phase 314’s harness seam, which Phase 332 taught to wait for the Mac’s name.');
    return;
  }
  const src = astOf(seam);
  const at = (n) => n.getStart(src);

  // (a) the predicate: the override's own reader, and `fixed` alone.
  const only = oneFunction(seam, 'nameStandInOnly');
  checked('D9');
  if (only === null) {
    fail('D9', `${rel(seam)} declares no single nameStandInOnly, so the seam has no word for "the Mac’s name is asked of the loopback stand-in".`);
  } else {
    const returns = ownReturnsOf(only);
    const reads = descendantsOf(only).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'nameServersFrom');
    const shape = /^return\s*nameServersFrom\s*\([\s\S]*\)\s*\.\s*kind\s*===\s*'fixed'\s*;?$/;
    if (reads.length !== 1 || returns.length !== 1 || !shape.test(codeOfNode(seam, returns[0]).trim())) {
      fail('D9', `${where(seam, only)}: nameStandInOnly does not answer exactly nameServersFrom(…).kind === 'fixed'. Only a development build whose GMUX_POCKET_NAME_SERVERS names loopback servers is 'fixed'; the search and a refused value are the real ts.net servers or nothing, and the seam pairs over neither.`);
    }
  }

  // (b) the refusal, before the switch is touched, and (c) the wait, before true.
  const open = oneFunction(seam, 'openDoorForPairing');
  checked('D9');
  if (open === null) {
    fail('D9', `${rel(seam)} declares no single openDoorForPairing, so the seam's pairing is somewhere this rule does not read.`);
    return;
  }
  const hostParam = open.parameters[0] !== undefined && ts.isIdentifier(open.parameters[0].name) ? open.parameters[0].name.text : null;
  const calls = descendantsOf(open).filter((n) => ts.isCallExpression(n));
  const hostCalls = calls.filter((c) => ts.isPropertyAccessExpression(c.expression) && ts.isIdentifier(c.expression.expression) && c.expression.expression.text === hostParam);
  const firstSwitch = hostCalls.find((c) => calleeName(c) === 'setDoor');
  checked('D9');
  if (hostParam === null || firstSwitch === undefined) {
    fail('D9', `${where(seam, open)}: openDoorForPairing never switches its host's door on (host.setDoor), so this rule cannot say the refusal comes first.`);
    return;
  }
  const refusals = descendantsOf(open).filter(
    (n) => ts.isIfStatement(n) && /^!\s*nameStandInOnly\s*\(\s*\)$/.test(codeOfNode(seam, n.expression).trim()) && returnsFalse(n.thenStatement)
  );
  checked('D9');
  const firstHostCall = hostCalls.reduce((a, c) => (a === null || at(c) < at(a) ? c : a), null);
  if (refusals.length === 0 || at(refusals[0]) > at(firstHostCall)) {
    fail('D9', `${where(seam, open)}: openDoorForPairing does not return false on !nameStandInOnly() BEFORE it first calls its host. Its Electron is not vitest, so D8 lets its door ask real servers: without the loopback name stand-in the check would ask the real ts.net servers about the stand-in's made-up name every minute.`);
  }
  // The wait: a function of this file that reads .pairable off host.status().
  const waiters = new Set(
    nodesOf(seam)
      .filter((n) => ts.isFunctionDeclaration(n) && n.name !== undefined && n.body !== undefined)
      .filter((fn) => descendantsOf(fn).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'pairable'))
      .filter((fn) => descendantsOf(fn).some((n) => ts.isCallExpression(n) && calleeName(n) === 'status'))
      .map((fn) => fn.name.text)
  );
  const waits = calls.filter((c) => ts.isIdentifier(c.expression) && waiters.has(c.expression.text));
  const trues = ownReturnsOf(open).filter((r) => r.expression !== undefined && r.expression.kind === ts.SyntaxKind.TrueKeyword);
  checked('D9', 2);
  const wait = waits.find((w) => at(w) > at(firstSwitch) && trues.length > 0 && trues.every((r) => at(r) > at(w)));
  if (wait === undefined) {
    fail('D9', `${where(seam, open)}: openDoorForPairing answers true without first waiting for main's word (a function here that reads host.status().pairable), called after the switch and before every return true. A listening door is not a pairable one: beginPairing refuses until the name answers, and a seam that pressed Pair on "listening" alone was what the four probes and this seam did before Phase 332.`);
  } else {
    const bound = wait.arguments.length >= 2 ? numberOf(seam, wait.arguments[1]) : null;
    if (bound === null || bound <= 0 || bound > SEAM_PAIRABLE_WAIT_MAX_MS) {
      fail('D9', `${where(seam, wait)}: the wait for main's word is not bounded by a constant of at most ${String(SEAM_PAIRABLE_WAIT_MAX_MS)} ms (read ${bound === null ? 'nothing' : String(bound)}). A name stand-in that never answers must end in "no phone was paired", not in a probe that hangs.`);
    }
    let holder = wait.parent;
    while (holder !== undefined && (ts.isAwaitExpression(holder) || ts.isParenthesizedExpression(holder))) holder = holder.parent;
    const bound2 = holder !== undefined && ts.isVariableDeclaration(holder) && ts.isIdentifier(holder.name) ? holder.name.text : null;
    const gated =
      bound2 !== null &&
      descendantsOf(open).some(
        (n) => ts.isIfStatement(n) && at(n) > at(wait) && trues.every((r) => at(n) < at(r)) && new RegExp(`^!\\s*${bound2}\\s*\\.\\s*ok$`).test(codeOfNode(seam, n.expression).trim()) && returnsFalse(n.thenStatement)
      );
    if (!gated) {
      fail('D9', `${where(seam, wait)}: the wait's answer does not decide a return false (if (!<answer>.ok) return false) before openDoorForPairing answers true, so a wait that timed out still pairs.`);
    }
  }

  // (d) the seam presses Pair only on openDoorForPairing's true.
  const opened = new Set(
    nodesOf(seam)
      .filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined)
      .filter((n) => {
        const init = unwrapped(n.initializer);
        return init !== undefined && ts.isCallExpression(init) && calleeName(init) === 'openDoorForPairing';
      })
      .map((n) => n.name.text)
  );
  const presses = callsOf(seam).filter((c) => calleeName(c) === 'beginPairing');
  checked('D9', presses.length + 1);
  if (presses.length === 0) fail('D9', `${rel(seam)} presses Pair nowhere, so there is no press this rule can hold to the wait.`);
  for (const press of presses) {
    let held = false;
    for (let n = press.parent; n !== undefined && !held; n = n.parent) {
      if (ts.isForOfStatement(n)) {
        const e = unwrapped(n.expression);
        held =
          e !== undefined &&
          ts.isConditionalExpression(e) &&
          ts.isIdentifier(unwrapped(e.condition)) &&
          opened.has(unwrapped(e.condition).text) &&
          ts.isArrayLiteralExpression(unwrapped(e.whenFalse)) &&
          unwrapped(e.whenFalse).elements.length === 0;
      } else if (ts.isIfStatement(n)) {
        const c = unwrapped(n.expression);
        held = c !== undefined && ts.isIdentifier(c) && opened.has(c.text) && descendantsOf(n.thenStatement).includes(press);
      }
      if (ts.isFunctionLike(n)) break;
    }
    if (!held) {
      fail('D9', `${where(seam, press)}: the seam presses Pair on a path that openDoorForPairing's true does not decide. Both refusals and the wait are nothing if the press does not wait for their answer.`);
    }
  }
}

// ---------------------------------------------------------------------------
// X — the two writes (Phase 317, build/p317/SPEC.md §5.3 to §5.6, §6.1)
// ---------------------------------------------------------------------------

/**
 * THE DOOR GREW ONE WRITE, and every clause below is one line a later round
 * can delete with the phone still ending sessions. They are read with the
 * parser, against the names build/p317/SPEC.md pins: `./writes.ts`'s
 * `createPocketWriteHandler` and `parseEndBody`;
 * `src/main/sessions/pocket-writes.ts`'s `endVerdict` and `createPocketWrites`;
 * `PocketHost.removePhone`; `DoorAnswer`; the listener's `applyPins` and
 * `handleRequest`; `describePocketDoor`'s `WRITE_CLAUSES`.
 */
const POCKET_WRITES_FILE = join(ROOT, 'src', 'main', 'sessions', 'pocket-writes.ts');
const POCKET_WRITES_OWNER = "Phase 317 builder door's (src/main/sessions/pocket-writes.ts)";
const WRITES_OWNER = "Phase 317 builder door's (src/main/pocket/writes.ts)";

/** The one implementation of the phone's End, or null with the rule failed by name. */
function pocketWritesFile(ruleId) {
  if (existsSync(POCKET_WRITES_FILE)) return POCKET_WRITES_FILE;
  fail(
    ruleId,
    `${rel(POCKET_WRITES_FILE)} does not exist, so this rule read nothing. It is ${POCKET_WRITES_OWNER}. ` +
      'A gate that passed here would go green on the day the phone’s End has no implementation.'
  );
  return null;
}

/** Strip parentheses, `as` and `satisfies` off an expression. */
function bare(e) {
  let n = e;
  while (n !== undefined && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression?.(n) || ts.isNonNullExpression(n))) n = n.expression;
  return n;
}

/** Does `inner` sit inside `outer`? */
function inside(inner, outer) {
  return inner.getStart() >= outer.getStart() && inner.getEnd() <= outer.getEnd();
}

/** The const a name is declared as in a file, or null. */
function constNamed(file, name) {
  for (const node of nodesOf(file)) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer !== undefined) {
      return node;
    }
  }
  return null;
}

/** Every object literal a return hands back, through `?:` and `&&`. */
function returnedObjects(expr) {
  const e = bare(expr);
  if (e === undefined) return [];
  if (ts.isObjectLiteralExpression(e)) return [e];
  if (ts.isConditionalExpression(e)) return [...returnedObjects(e.whenTrue), ...returnedObjects(e.whenFalse)];
  return [];
}

/** An object literal's property initializer by name (shorthand answers the identifier), or undefined. */
function propOf(obj, name) {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && memberName(p) === name) return p.initializer;
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === name) return p.name;
  }
  return undefined;
}

/** The function `createPocketWriteHandler` returns: the write path itself. */
function writeHandlerOf(file) {
  const factory = oneFunction(file, 'createPocketWriteHandler');
  if (factory === null) return null;
  for (const ret of ownReturnsOf(factory)) {
    const e = bare(ret.expression);
    if (e !== undefined && (ts.isFunctionExpression(e) || ts.isArrowFunction(e))) return e;
  }
  return null;
}

/**
 * The anchors of the write path, by position: the parse, the ledger's read,
 * the in-flight check and claim, the pending entry, the last check, the act's
 * statement and the act's call, and the outcome's record.
 */
function writePathAnchors(file, handler) {
  const sf = astOf(file);
  const nodes = descendantsOf(handler);
  const calls = nodes.filter((n) => ts.isCallExpression(n));
  const receiver = (call) => (ts.isPropertyAccessExpression(call.expression) ? call.expression.expression.getText(sf) : '');
  const at = (n) => (n === undefined ? -1 : n.getStart(sf));
  // PHASE 318: the parse dispatches by the verb (parseWriteBody), or names one
  // of the three parses directly.
  const parse = calls.find((c) => /^(?:parseWriteBody|parseEndBody|parseChooseBody|parseSayBody|parseKeysBody)$/.test(calleeName(c) ?? ''));
  const ledgerGet = calls.find((c) => calleeName(c) === 'get' && /ledger/i.test(receiver(c)));
  const ledgerSet = calls.find((c) => calleeName(c) === 'set' && /ledger/i.test(receiver(c)));
  const lastChecks = nodes.filter((n) => ts.isIfStatement(n) && descendantsOf(n.expression).some((m) => ts.isCallExpression(m) && calleeName(m) === 'stillPaired'));
  const lastCheck = lastChecks.length === 1 ? lastChecks[0] : undefined;
  let actStatement;
  if (lastCheck !== undefined && ts.isBlock(lastCheck.parent)) {
    const list = lastCheck.parent.statements;
    actStatement = list[list.indexOf(lastCheck) + 1];
  }
  // PHASE 318: the ONE statement after the last check starts whichever of the
  // three verbs the body names, each through its settle function.
  const actCalls =
    actStatement === undefined
      ? []
      : descendantsOf(actStatement).filter(
          (n) =>
            ts.isCallExpression(n) &&
            /^(?:end|choose|say|keys)$/.test(calleeName(n) ?? '') && /writes/.test(receiver(n))
        );
  const actCall = actCalls[0];
  const inflightCheck = nodes.find(
    (n) => ts.isIfStatement(n) && descendantsOf(n.expression).some((m) => ts.isCallExpression(m) && calleeName(m) === 'has')
  );
  const adds = calls.filter((c) => calleeName(c) === 'add');
  const outcome = nodes.find(
    (n) =>
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(n.left) &&
      n.left.name.text === 'acted' &&
      n.right.kind === ts.SyntaxKind.TrueKeyword
  );
  const known = (() => {
    if (ledgerGet === undefined) return null;
    const decl = ledgerGet.parent;
    return decl !== undefined && ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) ? decl.name.text : null;
  })();
  const phoneParam = handler.parameters[2] !== undefined && ts.isIdentifier(handler.parameters[2].name) ? handler.parameters[2].name.text : null;
  return {
    sf,
    parse,
    ledgerGet,
    ledgerSet,
    lastChecks,
    lastCheck,
    actStatement,
    actCall,
    actCalls,
    inflightCheck,
    adds,
    outcome,
    known,
    phoneParam,
    at
  };
}

/** Is `node`'s own `if` chain, up to `stop`, guarded by a condition that names `name`? */
function guardedByName(node, stop, name) {
  for (let n = node; n !== undefined && n !== stop; n = n.parent) {
    const p = n.parent;
    if (p !== undefined && ts.isIfStatement(p) && (p.thenStatement === n || p.elseStatement === n)) {
      if (new RegExp(`\\b${name}\\b`).test(p.expression.getText())) return true;
    }
    if (p !== undefined && ts.isConditionalExpression(p) && (p.whenTrue === n || p.whenFalse === n)) {
      if (new RegExp(`\\b${name}\\b`).test(p.condition.getText())) return true;
    }
  }
  return false;
}

/** X1 to X4, X11: the write path in `./writes.ts`. */
function writePathRules() {
  const writes = moduleNamed('writes', 'X1', WRITES_OWNER);
  if (writes === null) {
    for (const id of ['X2', 'X3', 'X4', 'X11']) fail(id, `src/main/pocket/writes.ts does not exist, so there is no write path to read. It is ${WRITES_OWNER}.`);
    return;
  }
  const handler = writeHandlerOf(writes);
  checked('X1');
  if (handler === null) {
    fail('X1', `${rel(writes)}: createPocketWriteHandler returns no function, so the write path’s order cannot be read`);
    for (const id of ['X3', 'X4']) fail(id, `${rel(writes)}: no write path to read`);
  } else {
    const a = writePathAnchors(writes, handler);
    // X1, THE ORDER: parse, ledger, claim, last check, act, outcome.
    checked('X1', 6);
    if (a.lastChecks.length !== 1) {
      fail('X1', `${where(writes, handler)}: the write path makes ${String(a.lastChecks.length)} checks that ask stillPaired(; it makes ONE, the last before the act`);
    }
    const order = [
      ['the strict parse (parseWriteBody, by the verb)', a.parse],
      ['the ledger’s read (ledger.get)', a.ledgerGet],
      ['the in-flight claim (.add)', a.adds[0]],
      ['the last check (stillPaired)', a.lastCheck],
      ['the act (writes.end, writes.choose, writes.say or writes.keys)', a.actCall],
      ['the outcome recorded (.acted = true)', a.outcome]
    ];
    for (const [what, node] of order) {
      if (node === undefined) fail('X1', `${where(writes, handler)}: the write path names no ${what}`);
    }
    if (order.every(([, node]) => node !== undefined)) {
      for (let i = 1; i < order.length; i += 1) {
        if (a.at(order[i - 1][1]) >= a.at(order[i][1])) {
          fail('X1', `${where(writes, order[i][1])}: ${order[i][0]} comes before ${order[i - 1][0]}; the order is research 135 §4.11’s, held as code`);
        }
      }
    }
    // Nothing between the last check and the act.
    if (a.lastCheck !== undefined) {
      checked('X1', 4);
      if (descendantsOf(a.lastCheck.expression).some((n) => ts.isAwaitExpression(n))) {
        fail('X1', `${where(writes, a.lastCheck)}: the last check awaits inside its own condition`);
      }
      if (a.lastCheck.elseStatement !== undefined) fail('X1', `${where(writes, a.lastCheck)}: the last check has an else arm; it refuses and returns, and the act is the next statement`);
      const then = a.lastCheck.thenStatement;
      const thenReturn = ts.isReturnStatement(then) ? then : ts.isBlock(then) && then.statements.length === 1 && ts.isReturnStatement(then.statements[0]) ? then.statements[0] : null;
      const refusal = thenReturn === null ? [] : returnedObjects(thenReturn.expression);
      if (refusal.length !== 1 || bare(propOf(refusal[0], 'status'))?.getText() !== '404') {
        fail('X1', `${where(writes, a.lastCheck)}: the last check’s refusal is not one return of status 404; it is the door’s refusal and nothing was done`);
      }
      if (a.actStatement === undefined || a.actCall === undefined || !inside(a.actCall, a.actStatement)) {
        fail('X1', `${where(writes, a.lastCheck)}: the statement right after the last check does not start the act; nothing may sit between the two`);
      } else {
        // PHASE 318: that one statement starts every verb the closed list
        // names, so no verb's act sits anywhere but right after the check.
        const verbs = new Set(a.actCalls.map((c) => calleeName(c)));
        checked('X1');
        for (const v of ['end', 'choose', 'say', 'keys']) {
          if (!verbs.has(v)) fail('X1', `${where(writes, a.actStatement)}: the act's one statement starts no writes.${v}(; every verb's act is that statement, right after the last check (build/p318/SPEC.md §5.1.4; build/p337/SPEC.md §5.5)`);
        }
        const awaitsFirst = descendantsOf(a.actStatement).some((n) => ts.isAwaitExpression(n) && n.getStart() < a.actCall.getStart());
        if (awaitsFirst) fail('X1', `${where(writes, a.actStatement)}: something is awaited inside the act’s statement before the act is called`);
        // An act handed to a local settle function must be CALLED by it at once.
        for (const act of a.actCalls) for (let n = act.parent; n !== undefined && n !== a.actStatement; n = n.parent) {
          if (!(ts.isArrowFunction(n) || ts.isFunctionExpression(n)) || !ts.isCallExpression(n.parent)) continue;
          const settle = calleeName(n.parent);
          const fn = settle === null ? null : oneFunction(writes, settle);
          checked('X1');
          if (fn === null) {
            fail('X1', `${where(writes, n)}: the act is handed to ${String(settle)}(, which is not declared once in ${rel(writes)}, so nothing proves it starts the act at once`);
            continue;
          }
          const param = fn.parameters[n.parent.arguments.indexOf(n)];
          const pname = param !== undefined && ts.isIdentifier(param.name) ? param.name.text : null;
          const startCall = pname === null ? undefined : descendantsOf(fn).find((m) => ts.isCallExpression(m) && ts.isIdentifier(m.expression) && m.expression.text === pname);
          const awaitBefore = startCall !== undefined && descendantsOf(fn).some((m) => ts.isAwaitExpression(m) && m.getStart() < startCall.getStart());
          if (startCall === undefined || awaitBefore) {
            fail('X1', `${where(writes, fn)}: ${settle}( does not call the act it is handed before anything is awaited, so the act does not start in the statement after the last check`);
          }
        }
      }
    }
    // Every 404 before the act; after it, every return marked acted; before
    // it, only the ledger's returns marked.
    const returns = ownReturnsOf(handler);
    const actAt = a.at(a.actStatement);
    for (const ret of returns) {
      const objects = returnedObjects(ret.expression);
      const is404 = objects.some((o) => bare(propOf(o, 'status'))?.getText() === '404');
      checked('X1');
      if (actAt !== -1 && ret.getStart() > actAt) {
        if (objects.length === 0) {
          fail('X1', `${where(writes, ret)}: a return after the act hands back something this rule cannot read as an answer`);
        } else if (is404) {
          fail('X1', `${where(writes, ret)}: a 404 AFTER THE ACT. A 404 tells the phone nothing was done, and something was`);
        }
        for (const o of objects) {
          if (propOf(o, 'acted')?.kind !== ts.SyntaxKind.TrueKeyword) {
            fail('X1', `${where(writes, o)}: an answer after the act is not marked acted: true, so the door stopping could replace it with a 404`);
          }
        }
      } else if (actAt !== -1) {
        const marked = objects.some((o) => propOf(o, 'acted') !== undefined);
        if (marked && (a.known === null || !guardedByName(ret, handler, a.known))) {
          fail('X1', `${where(writes, ret)}: an answer before the act is marked acted, and it is not the ledger’s; only a recorded hit and the busy for a pending entry of the same write id speak for an act`);
        }
      }
    }
    if (a.known !== null && actAt !== -1) {
      const before = returns.filter((r) => r.getStart() < actAt && guardedByName(r, handler, a.known));
      checked('X1', 2);
      if (!before.some((r) => new RegExp(`\\b${a.known}\\.acted\\b`).test(r.getText()))) {
        fail('X1', `${where(writes, handler)}: the ledger’s recorded hit does not answer with its own recorded acted (${a.known}.acted), so a recorded answer to a write that acted could be replaced with a 404 (§14 finding 9)`);
      }
      if (!before.some((r) => /busy/.test(r.getText()) && returnedObjects(r.expression).some((o) => propOf(o, 'acted')?.kind === ts.SyntaxKind.TrueKeyword))) {
        fail('X1', `${where(writes, handler)}: the busy a duplicate of a write still in flight gets is not marked acted: true; the write it duplicates may be acting now, and a 404 would say it was not`);
      }
    }

    // X3, the pending entry is made AT THE CLAIM: after the in-flight check and
    // before the last check (§3 row 18).
    checked('X3', 2);
    if (a.ledgerSet === undefined) {
      fail('X3', `${where(writes, handler)}: the write path never records a pending entry (ledger.set)`);
    } else {
      if (a.lastCheck !== undefined && a.ledgerSet.getStart() > a.lastCheck.getStart()) {
        fail('X3', `${where(writes, a.ledgerSet)}: the pending entry is made AFTER the last check; two requests with one write id could both pass the ledger`);
      }
      if (a.inflightCheck !== undefined && a.ledgerSet.getStart() < a.inflightCheck.getStart()) {
        fail('X3', `${where(writes, a.ledgerSet)}: the pending entry is made before the in-flight check; it is made AT the claim`);
      }
      // Keyed on the verified phone AND the write id. A name is resolved to
      // its declaration INSIDE the write path first (Phase 337: parseKeysBody
      // declares a `key` of its own, which a file-wide lookup found first).
      const localConst = (name) => {
        const inHandler = descendantsOf(handler).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer !== undefined);
        return inHandler.length === 1 ? inHandler[0] : constNamed(writes, name);
      };
      for (const call of [a.ledgerSet, a.ledgerGet].filter((c) => c !== undefined)) {
        let key = call.arguments[0];
        if (key !== undefined && ts.isIdentifier(key)) key = localConst(key.text)?.initializer ?? key;
        const text = key === undefined ? '' : key.getText();
        checked('X3');
        if (a.phoneParam === null || !new RegExp(`\\b${a.phoneParam}\\b`).test(text) || !/\.write\b/.test(text)) {
          fail('X3', `${where(writes, call)}: the ledger’s key is ${JSON.stringify(text.slice(0, 60))}, not the verified phone and the write id; a write id is the phone’s own`);
        }
        // PHASE 318 (D4): and the verb, so the same write id under another verb
        // is its own write and never another's recorded answer.
        if (!/\bverb\b|\broute\.id\b|\.verb\b/.test(text)) {
          fail('X3', `${where(writes, call)}: the ledger’s key is ${JSON.stringify(text.slice(0, 60))}, which holds no verb; the same write id under another verb would read another write's recorded answer (build/p318/SPEC.md D4)`);
        }
      }
      // The key joins its parts with a newline no part can hold (Phase 318, D4).
      const keyOf = constNamed(writes, 'keyOf');
      const keyFn = keyOf === null ? undefined : bare(keyOf.initializer);
      checked('X3');
      if (keyFn === undefined || !(ts.isArrowFunction(keyFn) || ts.isFunctionExpression(keyFn)) || keyFn.parameters.length !== 3 || (keyFn.body.getText().match(/\\n/g) ?? []).length !== 2) {
        fail('X3', `${rel(writes)}: keyOf is not a function of the phone, the verb and the write id joined by two newlines; a ledger key a part could forge by holding the separator is two writes' key (build/p318/SPEC.md D4)`);
      }
      // Each entry stores its acted.
      let entry = a.ledgerSet.arguments[1];
      if (entry !== undefined && ts.isIdentifier(entry)) entry = localConst(entry.text)?.initializer ?? entry;
      checked('X3');
      if (entry === undefined || !ts.isObjectLiteralExpression(bare(entry)) || propOf(bare(entry), 'acted') === undefined) {
        fail('X3', `${where(writes, a.ledgerSet)}: the ledger’s entry does not store acted, so a recorded hit cannot say whether its write acted`);
      }
    }

    // X4, one in flight per phone and per session: checked, claimed before
    // the act, released in a finally that holds the act.
    const sets = new Map();
    for (const add of a.adds) {
      if (!ts.isPropertyAccessExpression(add.expression) || !ts.isIdentifier(add.expression.expression)) continue;
      if (a.lastCheck !== undefined && add.getStart() > a.lastCheck.getStart()) {
        fail('X4', `${where(writes, add)}: an in-flight claim is made after the last check; it is made before the act, at the claim`);
      }
      sets.set(add.expression.expression.text, add.arguments[0]?.getText() ?? '');
    }
    checked('X4', 2);
    if (sets.size < 2) {
      fail('X4', `${where(writes, handler)}: the write path claims ${String(sets.size)} in-flight set(s); it claims one per phone and one per session`);
    }
    if (a.phoneParam !== null && ![...sets.values()].includes(a.phoneParam)) {
      fail('X4', `${where(writes, handler)}: no in-flight claim is of the verified phone (${a.phoneParam})`);
    }
    if (![...sets.values()].some((arg) => arg !== a.phoneParam && arg !== '')) {
      fail('X4', `${where(writes, handler)}: no in-flight claim is of anything but the phone, so two phones can end one session at once`);
    }
    const tryOfAct = (() => {
      for (let n = a.actStatement; n !== undefined; n = n.parent) {
        if (ts.isTryStatement(n.parent) && n.parent.tryBlock === n) return n.parent;
      }
      return null;
    })();
    // PHASE 318 (D4): ACROSS VERBS. No claim and no check of one is under a
    // branch on the verb, so an End and a message share one claim a session.
    for (const n of descendantsOf(handler).filter((m) => ts.isCallExpression(m) && /^(?:has|add)$/.test(calleeName(m) ?? '') && ts.isPropertyAccessExpression(m.expression) && sets.has(m.expression.expression.getText()))) {
      checked('X4');
      if (guardedByName(n, handler, 'verb') || /route\.id|parsed\.verb/.test(guardingIf(n)?.expression.getText() ?? '')) {
        fail('X4', `${where(writes, n)}: an in-flight claim is asked or made under a branch on the verb; one write is in flight per phone and per session ACROSS verbs, so an End and a message can never overlap on one session (build/p318/SPEC.md D4)`);
      }
    }
    for (const name of sets.keys()) {
      checked('X4', 2);
      const has = descendantsOf(handler).some((n) => ts.isCallExpression(n) && calleeName(n) === 'has' && n.expression.getText().startsWith(`${name}.`));
      if (!has) fail('X4', `${where(writes, handler)}: ${name} is claimed without being asked first (.has), so a second write would claim it again`);
      const released =
        tryOfAct !== null &&
        tryOfAct.finallyBlock !== undefined &&
        descendantsOf(tryOfAct.finallyBlock).some((n) => ts.isCallExpression(n) && calleeName(n) === 'delete' && n.expression.getText().startsWith(`${name}.`));
      if (!released) fail('X4', `${where(writes, handler)}: ${name}’s claim is not released in the finally of the try that holds the act, so a refusal or a throw holds it forever`);
    }

    // X11, ONE log line, the verb and the outcome word, the session its one field.
    const logs = callsOf(writes).filter((c) => /^(?:debug|info|warn|error|log)$/.test(calleeName(c) ?? '') && /log/i.test(ts.isPropertyAccessExpression(c.expression) ? c.expression.expression.getText() : ''));
    checked('X11', 3);
    if (logs.length !== 1) {
      fail('X11', `${rel(writes)} makes ${String(logs.length)} log call(s); the write path writes ONE line per write`);
    } else {
      const call = logs[0];
      const [message, field, ...rest] = call.arguments;
      const spans = message !== undefined && ts.isTemplateExpression(message) ? message.templateSpans.map((s) => s.expression.getText()) : null;
      if (spans === null || spans.length !== 2 || !/\bverb$/.test(spans[0]) || !/\boutcome$/.test(spans[1])) {
        fail('X11', `${where(writes, call)}: the line interpolates ${JSON.stringify(spans)}; it names the verb and the outcome word and nothing else, never the body, the write id, a header or a sentence`);
      }
      const fields = field === undefined ? [] : returnedObjects(field);
      const onlySession =
        rest.length === 0 &&
        (field === undefined || fields.length > 0) &&
        fields.every((o) => o.properties.length === 1 && propOf(o, 'session') !== undefined);
      if (!onlySession) {
        fail('X11', `${where(writes, call)}: the line’s field is ${JSON.stringify(field?.getText().slice(0, 60) ?? '(none)')}; its one field is the session id`);
      }
      if (a.actStatement !== undefined && call.getStart() < a.actStatement.getStart()) {
        fail('X11', `${where(writes, call)}: the line is written before the act; it says the outcome, so it is written after it`);
      }
    }
  }

  // X2, THE STRICT PARSE.
  const parses = callsOf(writes).filter((c) => c.expression.getText() === 'JSON.parse');
  const parseFns = ['parseEndBody', 'parseChooseBody', 'parseSayBody', 'parseKeysBody'].map((name) => [name, oneFunction(writes, name)]);
  checked('X2', 3);
  for (const [name, fn] of parseFns) if (fn === null) fail('X2', `${rel(writes)} declares no single ${name}`);
  if (parses.length !== 1) {
    fail('X2', `${rel(writes)} holds ${String(parses.length)} JSON.parse calls; a write body is parsed ONCE, in the parse function`);
  }
  const inParse = (node) => parseFns.some(([, fn]) => fn !== null && inside(node, fn));
  for (const call of parses) {
    let n = call;
    let inTry = false;
    while (n.parent !== undefined && !ts.isFunctionLike(n.parent)) {
      if (ts.isTryStatement(n.parent) && n.parent.tryBlock === n) inTry = true;
      n = n.parent;
    }
    if (!inTry) fail('X2', `${where(writes, call)}: JSON.parse is not inside a try, so a body that does not parse throws past the parse`);
    if (inParse(call)) continue;
    const owner = n.parent;
    const ownerName = owner === undefined ? null : enclosingName(call);
    const users = ownerName === null ? [] : callsOf(writes).filter((c) => calleeName(c) === ownerName);
    if (ownerName === null || users.length === 0 || !users.every((c) => inParse(c))) {
      fail('X2', `${where(writes, call)}: JSON.parse sits in ${String(ownerName)}, which something other than the parse function calls`);
    }
  }
  const KEY_SETS = { parseEndBody: 'batch,session,write', parseChooseBody: 'mark,marker,question,session,write', parseSayBody: 'session,text,write', parseKeysBody: 'dialog,keys,session,turn,write' };
  for (const [name, fn] of parseFns) {
    if (fn === null) continue;
    checked('X2');
    const exact = descendantsOf(fn).some((n) => {
      if (!ts.isBinaryExpression(n)) return false;
      const op = n.operatorToken.kind;
      if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken && op !== ts.SyntaxKind.ExclamationEqualsEqualsToken) return false;
      const sides = [n.left, n.right];
      const keys = sides.find((s) => /Object\.keys\(/.test(s.getText()) && /\.sort\(\)/.test(s.getText()) && /\.join\(/.test(s.getText()));
      const other = sides.find((s) => s !== keys);
      if (keys === undefined || other === undefined) return false;
      let lit = bare(other);
      if (ts.isIdentifier(lit)) lit = bare(constNamed(writes, lit.text)?.initializer);
      return lit !== undefined && ts.isStringLiteralLike(lit) && lit.text === KEY_SETS[name];
    });
    if (!exact) fail('X2', `${where(writes, fn)}: ${name} does not compare the body’s sorted keys with exactly ${JSON.stringify(KEY_SETS[name])}, so a fourth key could ride along`);
  }
  // Read one character at a time, never by a pattern.
  checked('X2');
  for (const n of nodesOf(writes)) {
    if (n.kind === ts.SyntaxKind.RegularExpressionLiteral || (ts.isCallExpression(n) || ts.isNewExpression(n)) && n.expression.getText() === 'RegExp') {
      fail('X2', `${where(writes, n)}: a pattern in the write path; the write id and the session id are read one character at a time`);
    }
  }
  const loopsReachedFrom = (fn) => {
    const seen = new Set();
    const loops = new Set();
    const walk = (f) => {
      if (seen.has(f)) return;
      seen.add(f);
      if (descendantsOf(f).some((n) => n !== f && (ts.isForOfStatement(n) || ts.isForStatement(n) || ts.isWhileStatement(n)))) loops.add(f);
      for (const c of descendantsOf(f).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression))) {
        const g = oneFunction(writes, c.expression.text);
        if (g !== null) walk(g);
      }
    };
    walk(fn);
    return loops.size;
  };
  // PHASE 318: choose reads three values by hand (the write id, the session
  // id and the question id's count beside the hex its mark shares), say two.
  // PHASE 337: keys reads the write id, the session id and the question id
  // (its turn) the same way, and its dialog by the one mark reader.
  const READS = { parseEndBody: [2, 'the write id and the session id'], parseChooseBody: [3, 'the write id, the session id and the question id'], parseSayBody: [2, 'the write id and the session id'], parseKeysBody: [3, 'the write id, the session id and the question id'] };
  for (const [name, fn] of parseFns) {
    if (fn === null) continue;
    const [want, what] = READS[name];
    checked('X2');
    if (loopsReachedFrom(fn) < want) {
      fail('X2', `${where(writes, fn)}: ${name} reaches ${String(loopsReachedFrom(fn))} function(s) that read a value one character at a time; it reads ${what} that way`);
    }
  }

  // X3, THE LEDGER'S CONSTANTS AND ITS EVICTION.
  const text = codeTextOf(writes);
  checked('X3', 5);
  const lifetime = nodesOf(writes).find(
    (n) => ts.isVariableDeclaration(n) && n.initializer !== undefined && /^(?:2\s*\*\s*POCKET_CLOCK_SKEW_MS|POCKET_CLOCK_SKEW_MS\s*\*\s*2)$/.test(n.initializer.getText().trim())
  );
  if (lifetime === undefined) fail('X3', `${rel(writes)}: no ledger lifetime is declared as 2 * POCKET_CLOCK_SKEW_MS`);
  const skewImported = nodesOf(writes).some(
    (n) => ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text === './pairing' && /\bPOCKET_CLOCK_SKEW_MS\b/.test(n.getText())
  );
  if (!skewImported) fail('X3', `${rel(writes)} does not import POCKET_CLOCK_SKEW_MS from ./pairing; the ledger’s lifetime is the signature clock’s, never re-spelled`);
  for (const n of nodesOf(writes)) {
    if (ts.isNumericLiteral(n) && Number(n.text.replace(/_/g, '')) === 120_000) fail('X3', `${where(writes, n)}: the literal 120000; the lifetime is 2 * POCKET_CLOCK_SKEW_MS, imported`);
  }
  // PHASE 337 (D24): the caps rose from 512 and 4,096 to 2,048 and 8,192,
  // because the phone sends a keys write at most every 100 ms, which is at most
  // 1,200 in a ledger life (2 * POCKET_CLOCK_SKEW_MS = 120 s).
  for (const cap of [2048, 8192]) {
    const decl = nodesOf(writes).find((n) => ts.isVariableDeclaration(n) && n.initializer !== undefined && ts.isNumericLiteral(n.initializer) && Number(n.initializer.text.replace(/_/g, '')) === cap && ts.isIdentifier(n.name));
    if (decl === undefined) {
      fail('X3', `${rel(writes)}: no ledger cap of ${String(cap)} is declared`);
      continue;
    }
    const name = decl.name.text;
    const compared = nodesOf(writes).some(
      (n) => ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.GreaterThanEqualsToken || n.operatorToken.kind === ts.SyntaxKind.GreaterThanToken) && n.right.getText() === name
    );
    if (!compared) fail('X3', `${where(writes, decl)}: the cap ${name} is never compared against, so the ledger can grow past it`);
  }
  if (lifetime !== undefined && ts.isIdentifier(lifetime.name)) {
    const lifetimeName = lifetime.name.text;
    const deleters = new Set(['delete']);
    for (const n of nodesOf(writes)) {
      if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) && descendantsOf(n).some((m) => ts.isCallExpression(m) && calleeName(m) === 'delete' && /ledger/i.test(m.expression.getText()))) {
        const name = enclosingName(descendantsOf(n).find((m) => ts.isCallExpression(m) && calleeName(m) === 'delete'));
        if (name !== null && name !== 'createPocketWriteHandler') deleters.add(name);
      }
    }
    for (const call of callsOf(writes)) {
      const name = calleeName(call);
      if (!deleters.has(name)) continue;
      if (name === 'delete' && !/ledger/i.test(call.expression.getText())) continue;
      const fn = enclosingName(call);
      if (deleters.has(fn) && fn !== 'delete') continue;
      checked('X3');
      const byLifetime = guardedByName(call, null, lifetimeName);
      const pendingDrop = insideFinally(call) && /'pending'/.test(guardingIf(call)?.expression.getText() ?? '');
      if (!byLifetime && !pendingDrop) {
        fail('X3', `${where(writes, call)}: an entry is dropped without asking whether it outlived ${lifetimeName}; a live entry is never evicted, and a pending one is dropped only in the finally when it never acted`);
      }
    }
  }
  for (const { node, text: spec } of specifiersOf(writes)) {
    checked('X3');
    if (/^(?:node:)?fs(?:\/promises)?$/.test(spec)) fail('X3', `${where(writes, node)}: the write path imports ${spec}; the ledger is memory and a write is never queued for later`);
  }
  void text;
}

/** The interface or type alias a file declares under a name, or null. */
function declaredType(file, name) {
  for (const node of nodesOf(file)) {
    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === name) return node;
  }
  return null;
}

/** X5 and X6: the one implementation, the interface it fills, and the answer. */
function pocketWritesRules() {
  const routes = moduleNamed('routes', 'X5', "Phase 317 builder door's (src/main/pocket/routes.ts)");
  // PocketWrites: declared once, in routes.ts, with exactly `end`.
  if (routes !== null) {
    const iface = interfaceOf(routes, 'PocketWrites');
    checked('X5', 2);
    if (iface === null) {
      fail('X5', `${rel(routes)} declares no interface PocketWrites`);
    } else {
      const members = iface.members.map(memberName);
      if ([...members].sort().join(',') !== 'choose,end,keys,say') fail('X5', `${where(routes, iface)}: PocketWrites holds ${JSON.stringify(members)}; it holds exactly end, choose, say and keys (build/p318/SPEC.md §5.1.5; build/p337/SPEC.md §5.4), and a fifth member is a verb the door can reach`);
    }
    const facts = interfaceOf(routes, 'PocketFacts');
    const endOffer = facts?.members.find((m) => memberName(m) === 'endOffer');
    if (endOffer === undefined || endOffer.questionToken === undefined) {
      fail('X5', `${rel(routes)}: PocketFacts.endOffer is ${endOffer === undefined ? 'absent' : 'required'}; it is optional, and absent reads { state: 'none' }, because the push seam’s and the tests’ facts offer no End (§14 finding 8)`);
    }
  }
  const declaredElsewhere = [];
  const implementers = [];
  const handedBy = [];
  for (const file of productionSources()) {
    const src = readFileSync(file, 'utf8');
    if (!/PocketWrites|createPocketWrites/.test(src)) continue;
    for (const n of nodesOf(file)) {
      if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text === 'PocketWrites' && file !== routes) declaredElsewhere.push(where(file, n));
      // An implementation answers a whole PocketWrites; the reply verbs answer a
      // Pick<PocketWrites, 'choose' | 'say'>, which pocket-writes.ts composes.
      if ((ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) && n.type !== undefined && /\bPocketWrites\b/.test(n.type.getText()) && !/\b(?:Pick|Omit|Partial)<\s*PocketWrites\b/.test(n.type.getText())) implementers.push({ file, n });
      if (ts.isCallExpression(n) && calleeName(n) === 'createPocketWrites') handedBy.push({ file, n });
    }
  }
  checked('X5', 3);
  for (const at of declaredElsewhere) fail('X5', `${at} declares a second PocketWrites; it is declared once, in routes.ts`);
  if (implementers.length !== 1 || implementers[0].file !== POCKET_WRITES_FILE) {
    fail('X5', `PocketWrites is implemented by ${implementers.length === 0 ? 'nothing' : implementers.map((i) => where(i.file, i.n)).join(', ')}; it is implemented ONCE, in ${rel(POCKET_WRITES_FILE)}`);
  }
  const capabilities = join(ROOT, 'src', 'main', 'capabilities.ts');
  for (const { file, n } of handedBy) {
    if (file !== capabilities) fail('X5', `${where(file, n)} builds the phone’s writes; production builds them in src/main/capabilities.ts alone`);
  }
  if (!handedBy.some((h) => h.file === capabilities)) fail('X5', 'src/main/capabilities.ts never builds the phone’s writes, so the door has none');
  // And only capabilities.ts hands a PocketHost any writes: the push seam's
  // host has none, so its door answers both write routes 404.
  for (const file of productionSources()) {
    if (!readFileSync(file, 'utf8').includes('new PocketHost(')) continue;
    for (const n of nodesOf(file)) {
      if (!ts.isNewExpression(n) || n.expression.getText() !== 'PocketHost') continue;
      const arg = n.arguments?.[0] === undefined ? undefined : bare(n.arguments[0]);
      checked('X5');
      const handsWrites = arg !== undefined && (!ts.isObjectLiteralExpression(arg) || propOf(arg, 'writes') !== undefined || arg.properties.some((p) => ts.isSpreadAssignment(p)));
      if (handsWrites && file !== capabilities) {
        fail('X5', `${where(file, n)} hands a PocketHost something that may carry writes; the phone’s writes reach a host from src/main/capabilities.ts alone`);
      }
    }
  }

  const impl = pocketWritesFile('X5');
  if (impl !== null) {
    // end(): both gates before its first await, which is the verb.
    const factory = oneFunction(impl, 'createPocketWrites');
    const end = factory === null ? null : descendantsOf(factory).find((n) => ts.isMethodDeclaration(n) && memberName(n) === 'end' || ts.isPropertyAssignment(n) && memberName(n) === 'end' && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)));
    checked('X5', 4);
    if (end === undefined || end === null) {
      fail('X5', `${rel(impl)}: createPocketWrites answers no end`);
    } else {
      const awaits = descendantsOf(end).filter((n) => ts.isAwaitExpression(n));
      const first = awaits[0];
      const firstIsVerb = first !== undefined && ts.isCallExpression(bare(first.expression)) && calleeName(bare(first.expression)) === 'killSession';
      if (!firstIsVerb) fail('X5', `${where(impl, end)}: end’s first await is ${first === undefined ? 'nothing' : JSON.stringify(first.getText().slice(0, 50))}; it is the verb, killSession(, and nothing is awaited before it`);
      const reach = new Set();
      const walk = (f) => {
        for (const c of descendantsOf(f).filter((n) => ts.isCallExpression(n))) {
          if (first !== undefined && c.getStart() > first.getStart() && inside(c, end)) continue;
          const name = calleeName(c);
          if (name === null || reach.has(name)) continue;
          reach.add(name);
          const g = ts.isIdentifier(c.expression) ? oneFunction(impl, name) : null;
          if (g !== null) walk(g);
        }
      };
      walk(end);
      if (!reach.has('endRefusal')) fail('X5', `${where(impl, end)}: end does not ask main’s gate, endRefusal(, before the verb`);
      if (!reach.has('sessionActionGates')) fail('X5', `${where(impl, end)}: end does not ask the shared gate, sessionActionGates(, before the verb`);
    }
    const gateCalls = callsOf(impl).filter((c) => calleeName(c) === 'sessionActionGates');
    checked('X5', 2);
    for (const c of gateCalls) {
      const readsCanEnd = ts.isPropertyAccessExpression(c.parent) && c.parent.name.text === 'canEnd';
      if (!readsCanEnd || c.arguments[2]?.getText() !== 'DOOR_GATE_ENV') {
        fail('X5', `${where(impl, c)}: the shared gate is asked as ${JSON.stringify(c.parent.getText().slice(0, 80))}; the door reads .canEnd of sessionActionGates( with DOOR_GATE_ENV, and nothing else`);
      }
    }
    if (gateCalls.length === 0) fail('X5', `${rel(impl)} never asks sessionActionGates(`);
    // The batch arm reads the injected machineKnown, never answering.
    checked('X5', 3);
    for (const n of nodesOf(impl)) {
      if ((ts.isPropertyAccessExpression(n) && n.name.text === 'answering') || (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === 'answering')) {
        fail('X5', `${where(impl, n)} reads .answering. A machine that is not answering already reads unknown; the batch narrows by the machine ROW (§14 finding 1)`);
      }
    }
    if (!callsOf(impl).some((c) => calleeName(c) === 'machineKnown')) fail('X5', `${rel(impl)} never calls machineKnown(, so the batch’s narrowing is not the Mac batch’s`);
    const rowImported = specifiersOf(impl).some(({ node, text: spec }) => /(?:^|\/)machines\/store$/.test(spec) && /\bmachineRow\b/.test(node.getText()));
    if (!rowImported || !callsOf(impl).some((c) => calleeName(c) === 'machineRow')) {
      fail('X5', `${rel(impl)}: the production machineKnown is not machineRow( from src/main/machines/store.ts`);
    }
    // PHASE 318: choose and say pass through to the reply verbs it is handed,
    // and nothing else, so PocketWrites stays implemented in one place and this
    // module names nothing that types.
    // PHASE 337: and keys passes through to the screen's keys verb it is
    // handed, deps.keys.keys(, the same way (build/p337/SPEC.md §5.4).
    for (const [verb, callee] of [['choose', 'deps.reply.choose'], ['say', 'deps.reply.say'], ['keys', 'deps.keys.keys']]) {
      const member = factory === null ? undefined : descendantsOf(factory).find((n) => (ts.isPropertyAssignment(n) && memberName(n) === verb && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) || (ts.isMethodDeclaration(n) && memberName(n) === verb));
      checked('X5');
      const fn = member === undefined ? null : ts.isPropertyAssignment(member) ? member.initializer : member;
      const calls = fn === null ? [] : descendantsOf(fn).filter((n) => ts.isCallExpression(n));
      const passes = calls.length === 1 && calls[0].expression.getText().replace(/\s+/g, '') === callee;
      if (!passes) fail('X5', `${rel(impl)}: createPocketWrites's ${verb} is ${member === undefined ? 'absent' : JSON.stringify(member.getText().slice(0, 80))}; it passes the call to ${callee}( and does nothing else (build/p318/SPEC.md §5.1.5; build/p337/SPEC.md §5.4)`);
    }
    // No other lifecycle verb, no status setter.
    const NOT_THE_DOORS = /^(?:restoreSession|restorePastSession|discardSession|removeSession|restartSession|renameSession|createSession|resumeInPlace|discard|restore|restart|rename|noteHookEvent|noteUserInput|applyDetectedStatus|setStatus|setSessionStatus|updateStatus|writeStatus|markStatus)$/;
    for (const c of callsOf(impl)) {
      checked('X5');
      const name = calleeName(c);
      if (name !== null && NOT_THE_DOORS.test(name)) fail('X5', `${where(impl, c)} calls ${name}(; the phone’s End names one verb, killSession, and no status setter (refusal 5)`);
    }
  }

  // X6, THE ANSWER: five fields, named sentences, no message, errors by code.
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('X6');
  const answerType = existsSync(contract) ? interfaceOf(contract, 'PocketWriteAnswer') : null;
  if (answerType === null) {
    fail('X6', 'src/shared/ipc/pocket.ts declares no interface PocketWriteAnswer');
  } else {
    const fields = answerType.members.map(memberName).sort();
    if (fields.join(',') !== 'outcome,reason,sentence,verb,write') {
      fail('X6', `${where(contract, answerType)}: PocketWriteAnswer holds ${JSON.stringify(fields)}; it holds exactly verb, write, outcome, reason and sentence, and nothing that could claim Face ID happened (D13)`);
    }
  }
  const writes = moduleNamed('writes', 'X6', WRITES_OWNER);
  // PHASE 318: the reply's verbs say sentences too, and theirs are held the same way.
  // PHASE 337: and the Screen's keys verb, whose sentences are
  // src/shared/screen-copy.ts's (build/p337/SPEC.md §5.4).
  for (const file of [writes, impl, ...sourcesUnder(join(ROOT, 'src', 'main', 'reply')), ...sourcesUnder(join(ROOT, 'src', 'main', 'screen'))].filter((f) => f !== null)) {
    const fromWords = new Set();
    for (const n of nodesOf(file)) {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && /^@shared\/(?:lifecycle-words|reply-copy|screen-copy)$/.test(n.moduleSpecifier.text) && n.importClause?.namedBindings !== undefined && ts.isNamedImports(n.importClause.namedBindings)) {
        for (const el of n.importClause.namedBindings.elements) fromWords.add(el.name.text);
      }
    }
    // A lookup table every value of which is a named sentence (`SENTENCES[reason]`).
    const sentenceTables = new Set();
    for (const n of nodesOf(file)) {
      if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.initializer === undefined) continue;
      let init = bare(n.initializer);
      if (init !== undefined && ts.isCallExpression(init) && init.expression.getText() === 'Object.freeze') init = bare(init.arguments[0]);
      if (init === undefined || !ts.isObjectLiteralExpression(init) || init.properties.length === 0) continue;
      const allNamed = init.properties.every((p) => ts.isPropertyAssignment(p) && ((ts.isIdentifier(bare(p.initializer)) && fromWords.has(bare(p.initializer).text)) || (ts.isPropertyAccessExpression(bare(p.initializer)) && bare(p.initializer).expression.getText() === 'POCKET_WRITE_SENTENCES')));
      if (allNamed) sentenceTables.add(n.name.text);
    }
    // A name every value of which is main's own refusal sentence (or null):
    // `const refused = endRefusal(record)`, or a `let` assigned only from it.
    const refusalBound = new Set();
    {
      const values = new Map();
      const note = (name, value) => values.set(name, [...(values.get(name) ?? []), value]);
      for (const n of nodesOf(file)) {
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined) note(n.name.text, n.initializer);
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) note(n.left.text, n.right);
      }
      for (const [name, list] of values) {
        const fromMain = (v) => ts.isCallExpression(bare(v)) && calleeName(bare(v)) === 'endRefusal';
        if (list.some(fromMain) && list.every((v) => fromMain(v) || bare(v).kind === ts.SyntaxKind.NullKeyword)) refusalBound.add(name);
      }
    }
    const isNamedSentence = (expr, at) => {
      const e = bare(expr);
      if (e === undefined) return false;
      if (e.kind === ts.SyntaxKind.NullKeyword) return true;
      if (ts.isIdentifier(e)) {
        if (fromWords.has(e.text) || refusalBound.has(e.text)) return true;
        // A parameter named sentence relays a sentence its caller chose.
        const fn = (() => {
          for (let n = at; n !== undefined; n = n.parent) if (ts.isFunctionLike(n)) return n;
          return null;
        })();
        return fn !== null && fn.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === e.text && e.text === 'sentence');
      }
      if (ts.isPropertyAccessExpression(e)) {
        if (e.expression.getText() === 'POCKET_WRITE_SENTENCES') return true;
        if (sentenceTables.has(e.expression.getText())) return true;
        if (e.name.text === 'sentence') return true;
      }
      if (ts.isElementAccessExpression(e) && sentenceTables.has(e.expression.getText())) return true;
      if (ts.isConditionalExpression(e)) return isNamedSentence(e.whenTrue, at) && isNamedSentence(e.whenFalse, at);
      // A local function every return of which is a named sentence.
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) {
        const helper = oneFunction(file, e.expression.text);
        if (helper !== null && helper !== at) {
          const rets = ownReturnsOf(helper);
          if (rets.length > 0 && rets.every((r) => r.expression !== undefined && isNamedSentence(r.expression, helper))) return true;
        }
      }
      return false;
    };
    for (const n of nodesOf(file)) {
      let value;
      if (ts.isPropertyAssignment(n) && memberName(n) === 'sentence') value = n.initializer;
      else if (ts.isShorthandPropertyAssignment(n) && n.name.text === 'sentence') value = n.name;
      else if (ts.isCallExpression(n) && calleeName(n) === 'writeAnswer' && n.arguments.length === 5) value = n.arguments[4];
      if (value === undefined) continue;
      checked('X6');
      if (!isNamedSentence(value, n)) {
        fail('X6', `${where(file, n)}: a sentence set as ${JSON.stringify(value.getText().slice(0, 70))}. Every sentence the write path says is a named constant from lifecycle-words.ts, endRefusal’s own, or POCKET_WRITE_SENTENCES`);
      }
    }
    // PHASE 318: a local function that relays a parameter named sentence
    // (`refused(reason, sentence)`, `failed(sentence)`) is held at its CALLERS:
    // every call hands it a named sentence, so a literal cannot ride through it.
    for (const fn of nodesOf(file).filter((n) => (ts.isFunctionDeclaration(n) && n.name !== undefined) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isArrowFunction(bare(n.initializer)) || ts.isFunctionExpression(bare(n.initializer)))))) {
      const name = ts.isFunctionDeclaration(fn) ? fn.name.text : fn.name.text;
      const params = ts.isFunctionDeclaration(fn) ? fn.parameters : bare(fn.initializer).parameters;
      const at = params.findIndex((q) => ts.isIdentifier(q.name) && q.name.text === 'sentence');
      if (at === -1) continue;
      for (const call of callsOf(file).filter((c) => ts.isIdentifier(c.expression) && c.expression.text === name)) {
        const arg = call.arguments[at];
        checked('X6');
        if (arg === undefined || !isNamedSentence(arg, call)) {
          fail('X6', `${where(file, call)}: ${name}( is handed the sentence ${JSON.stringify(arg?.getText().slice(0, 70) ?? '(none)')}. Every sentence the phone is told is a named constant from lifecycle-words.ts, src/shared/reply-copy.ts or POCKET_WRITE_SENTENCES, and a relay is held at its callers`);
        }
      }
    }
    for (const n of nodesOf(file)) {
      if (ts.isPropertyAccessExpression(n) && n.name.text === 'message') {
        fail('X6', `${where(file, n)} reads .message. An error’s text can hold its argv (research 135 §4.8), and nothing it says reaches the phone or a log`);
      }
    }
    // A caught error is told apart by isGmuxError(, by code, and nothing else.
    for (const clause of nodesOf(file).filter((n) => ts.isCatchClause(n) && n.variableDeclaration !== undefined)) {
      const name = ts.isIdentifier(clause.variableDeclaration.name) ? clause.variableDeclaration.name.text : null;
      if (name === null) continue;
      const uses = descendantsOf(clause.block).filter((n) => ts.isIdentifier(n) && n.text === name);
      for (const use of uses) {
        checked('X6');
        const call = use.parent;
        if (ts.isCallExpression(call) && call.arguments.includes(use)) {
          const callee = calleeName(call);
          if (callee === 'isGmuxError') continue;
          const helper = callee === null ? null : oneFunction(file, callee);
          const param = helper?.parameters[call.arguments.indexOf(use)];
          const pname = param !== undefined && ts.isIdentifier(param.name) ? param.name.text : null;
          const ok =
            pname !== null &&
            descendantsOf(helper)
              .filter((m) => ts.isIdentifier(m) && m.text === pname && m.parent !== param)
              .every((m) => ts.isCallExpression(m.parent) && calleeName(m.parent) === 'isGmuxError' && m.parent.arguments[0] === m);
          if (ok) continue;
        }
        fail('X6', `${where(file, use)}: the caught ${name} is read as ${JSON.stringify(use.parent.getText().slice(0, 60))}; it is told apart by isGmuxError(, by its code, and nothing else`);
      }
    }
  }
  if (impl !== null && !callsOf(impl).some((c) => calleeName(c) === 'isGmuxError')) {
    checked('X6');
    fail('X6', `${rel(impl)} never asks isGmuxError(, so a thrown End is told apart some other way or not at all`);
  }
}

/** X7, X8, X10: the door process never 404s a write it forwarded, never parses one, and lets a revoked socket finish one. */
function doorWriteRules() {
  const listener = moduleNamed('listener', 'X7', "Phase 317 builder door's (src/main/pocket/door/listener.ts)");
  const bind = moduleNamed('bind', 'X7', "Phase 317 builder door's");
  const wire = moduleNamed('wire', 'X8', "Phase 317 builder door's");
  const limits = moduleNamed('limits', 'X8', "Phase 317 builder door's");

  // X7 (bind): an acted answer that fails validation is not replaced.
  if (bind !== null) {
    const post = methodOf(bind, 'PocketDoor', 'post');
    checked('X7');
    const refusals = post === null ? [] : descendantsOf(post).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'post' && /\.\.\.REFUSED\b/.test(n.getText()));
    if (post === null || refusals.length === 0) {
      fail('X7', `${rel(bind)}: PocketDoor.post posts no REFUSED answer for a message that fails validation, so this clause reads nothing`);
    }
    for (const r of refusals) {
      if (!/\bacted\b/.test(guardingIf(r)?.expression.getText() ?? '')) {
        fail('X7', `${where(bind, r)}: an answer that fails validation is replaced by a 404 whether or not it is acted; an acted answer posts nothing and the door process’s timer cuts the connection (D4)`);
      }
    }
  }
  if (listener !== null) {
    const handleRequest = oneFunction(listener, 'handleRequest');
    checked('X7');
    if (handleRequest === null) {
      fail('X7', `${rel(listener)} declares no single handleRequest`);
    } else {
      // The late answer for a write cuts; it never answers 404.
      const timers = descendantsOf(handleRequest).filter(
        (n) => (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && ts.isCallExpression(n.parent) && calleeName(n.parent) === 'setTimeout' && /pending\.delete\(/.test(n.getText())
      );
      checked('X7', 2);
      if (timers.length !== 1) fail('X7', `${where(listener, handleRequest)}: ${String(timers.length)} late-answer timers; there is one, and it decides between a cut and a 404`);
      const writeVar = descendantsOf(handleRequest).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && bare(n.initializer).getText().replace(/\s/g, '') === '!route.reads');
      const isWriteTest = (expr) => {
        const t = bare(expr).getText().replace(/\s/g, '');
        return t === '!route.reads' || (writeVar !== undefined && t === writeVar.name.text);
      };
      for (const timer of timers) {
        const body = ts.isBlock(timer.body) ? timer.body.statements : [];
        const send404 = descendantsOf(timer).find((n) => ts.isCallExpression(n) && calleeName(n) === 'sendPocket' && n.arguments[1]?.getText() === '404');
        const cut = body.find((s) => ts.isIfStatement(s) && isWriteTest(s.expression) && /\.destroy\(\)/.test(s.thenStatement.getText()) && /\breturn\b/.test(s.thenStatement.getText()) && /writesCut/.test(s.thenStatement.getText()));
        if (cut === undefined || send404 === undefined || cut.getStart() > send404.getStart()) {
          fail('X7', `${where(listener, timer)}: the late-answer timer does not cut a WRITE (destroy, count writesCut, return) before it answers 404; main may be acting on that write, and a 404 says it is not`);
        }
      }
      // Nothing after the forward answers 404: every refusal precedes it.
      const forward = descendantsOf(handleRequest).find((n) => ts.isCallExpression(n) && calleeName(n) === 'send' && /kind:\s*'request'/.test(n.getText()));
      checked('X7');
      if (forward === undefined) {
        fail('X7', `${where(listener, handleRequest)}: no forward to main (send({ kind: 'request', … })) is read`);
      } else {
        for (const n of descendantsOf(handleRequest).filter((m) => ts.isCallExpression(m) && calleeName(m) === 'refuseRequest')) {
          if (n.getStart() > forward.getStart()) fail('X7', `${where(listener, n)}: a refusal after the request was forwarded`);
        }
      }
    }
    // Every other 404 in the listener is a refusal before the forward, or the
    // read half of a choice that cuts a forwarded write.
    for (const call of callsOf(listener)) {
      if (calleeName(call) !== 'sendPocket' || call.arguments[1]?.getText() !== '404') continue;
      checked('X7');
      const owner = enclosingName(call);
      if (owner === 'refuseRequest') continue;
      const ifs = guardingIf(call);
      let elseOf = null;
      for (let n = call; n.parent !== undefined && !ts.isFunctionLike(n); n = n.parent) {
        if (ts.isIfStatement(n.parent) && n.parent.elseStatement === n) {
          elseOf = n.parent;
          break;
        }
      }
      const inTimer = (() => {
        for (let n = call.parent; n !== undefined; n = n.parent) {
          if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && ts.isCallExpression(n.parent) && calleeName(n.parent) === 'setTimeout') return true;
          if (ts.isFunctionLike(n)) return false;
        }
        return false;
      })();
      if (elseOf !== null && /forwardedWrite|\bwrite\b/.test(elseOf.expression.getText())) continue;
      if (inTimer) continue;
      void ifs;
      fail('X7', `${where(listener, call)}: a 404 that is neither a refusal before the forward nor the read half of a choice that cuts a forwarded write`);
    }

    // X8: no JSON.parse reaches a write body; a write's target is its path;
    // the cap is its row's own.
    const doorFiles = domainFiles.filter((f) => f.includes(`${join('pocket', 'door')}/`) || f.endsWith(join('pocket', 'door-process.ts')));
    for (const file of doorFiles) {
      for (const c of callsOf(file)) {
        if (c.expression.getText() !== 'JSON.parse') continue;
        checked('X8');
        const owner = enclosingName(c);
        if (owner !== 'presentationOfBody') {
          fail('X8', `${where(file, c)}: JSON.parse in the door process outside presentationOfBody; the door never parses a write body (D2), and main verifies its signature over the exact bytes before anything reads it`);
        }
      }
    }
    for (const c of callsOf(listener).filter((m) => calleeName(m) === 'presentationOfBody')) {
      checked('X8');
      if (!/route\.id\s*===\s*'pair'/.test(guardingIf(c)?.expression.getText() ?? '')) {
        fail('X8', `${where(listener, c)}: presentationOfBody( is reached by something other than the pairing route`);
      }
    }
    const listenerCode = codeTextOf(listener);
    checked('X8', 3);
    const targetPick = nodesOf(listener).find(
      (n) => ts.isConditionalExpression(n) && n.condition.getText() === 'route.reads' && bare(n.whenFalse).getText() === 'url.pathname'
    );
    if (targetPick === undefined) fail('X8', `${rel(listener)}: a write’s target is not chosen as url.pathname alone (route.reads ? … : url.pathname); its target is its path, exactly`);
    const queryRefusal = nodesOf(listener).find(
      (n) => ts.isIfStatement(n) && /!route\.reads/.test(n.expression.getText()) && /url\.search\s*!==\s*''/.test(n.expression.getText()) && /includes\('\?'\)/.test(n.expression.getText()) && /refuseRequest\(res,\s*'route'\)/.test(n.thenStatement.getText())
    );
    if (queryRefusal === undefined) fail('X8', `${rel(listener)}: a write with a query string (url.search, or a raw '?') is not refused route`);
    if (!/POCKET_WRITE_BODY_CAPS\[/.test(listenerCode)) fail('X8', `${rel(listener)}: a write’s body cap is not read from POCKET_WRITE_BODY_CAPS`);
  }
  if (wire !== null) {
    const fn = oneFunction(wire, 'doorRequestOf');
    checked('X8', 2);
    const text = fn === null ? '' : codeOfNode(wire, fn);
    if (!/write\s*&&\s*target\s*!==\s*writePathOf\(/.test(text)) fail('X8', `${rel(wire)}: doorRequestOf does not refuse a write whose target is not its route’s path byte for byte`);
    if (!/POCKET_WRITE_BODY_CAPS\[/.test(text)) fail('X8', `${rel(wire)}: doorRequestOf does not bound a write’s body by POCKET_WRITE_BODY_CAPS`);
  }
  if (limits !== null) {
    const caps = constNamed(limits, 'POCKET_WRITE_BODY_CAPS');
    checked('X8');
    if (caps === null) fail('X8', `${rel(limits)} declares no POCKET_WRITE_BODY_CAPS`);
  }

  // X10, THE REVOKED SOCKET.
  if (listener !== null) {
    const applyPins = oneFunction(listener, 'applyPins');
    checked('X10', 2);
    if (applyPins === null) {
      fail('X10', `${rel(listener)} declares no single applyPins`);
    } else {
      if (!descendantsOf(applyPins).some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /\.revoked$/.test(n.left.getText()) && n.right.kind === ts.SyntaxKind.TrueKeyword)) {
        fail('X10', `${where(listener, applyPins)}: applyPins does not mark a socket whose pin moved as revoked`);
      }
      for (const d of descendantsOf(applyPins).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'destroy')) {
        checked('X10');
        if (!/\.writes\s*===\s*0/.test(guardingIf(d)?.expression.getText() ?? '')) {
          fail('X10', `${where(listener, d)}: applyPins destroys a socket without asking whether it is answering a write (writes === 0); a Remove cuts every socket answering only reads at once, and lets a write’s answer out first`);
        }
      }
    }
    const handleRequest = oneFunction(listener, 'handleRequest');
    if (handleRequest !== null) {
      const statements = ts.isBlock(handleRequest.body) ? handleRequest.body.statements : [];
      const firstRefusal = statements.findIndex((s) => /refuseRequest\(/.test(s.getText()));
      const revokedAt = statements.findIndex((s) => /\brevoked\b|cutIfRevoked\(/.test(s.getText()));
      checked('X10', 3);
      if (revokedAt === -1 || (firstRefusal !== -1 && revokedAt > firstRefusal)) {
        fail('X10', `${where(listener, handleRequest)}: handleRequest does not refuse a revoked socket before anything else is asked of the request`);
      }
      const text = codeOfNode(listener, handleRequest);
      if (!/\.writes\s*\+=\s*1|\.writes\+\+/.test(text) || !/\.writes\s*-=\s*1|\.writes--/.test(text)) {
        fail('X10', `${where(listener, handleRequest)}: a forwarded write is not counted on its socket (writes += 1, and -= 1 when its answer is out)`);
      }
      if (!/res\.once\(\s*'finish'/.test(text) || !/res\.once\(\s*'close'/.test(text)) {
        fail('X10', `${where(listener, handleRequest)}: a revoked socket is not cut when its last write’s response finishes or closes`);
      }
    }
    for (const fnName of ['cutIfRevoked']) {
      const fn = oneFunction(listener, fnName);
      if (fn === null) continue;
      for (const d of descendantsOf(fn).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'destroy')) {
        checked('X10');
        if (!/\.writes\s*===\s*0/.test(guardingIf(d)?.expression.getText() ?? '')) {
          fail('X10', `${where(listener, d)}: ${fnName} destroys a revoked socket that may be answering a write`);
        }
      }
    }
  }
}

/**
 * X9 (the fix round): A PHONE IS REMOVED BY REMOVE ALONE. Phase 317's build
 * let the signing phone remove its own row through `POST /v1/unpair`, by a
 * `dropPhone` both callers shared and an `after` its answer carried. The phone
 * waited on that write before it could forget a Mac that did not answer, which
 * made Unpair slower than today, so the fix round took all of it out. What
 * this holds is that it STAYS out: the one store write that filters a phone
 * out of the store is in `removePhone`, before its first await; the write
 * path's deps are exactly the four it needs and name nothing that drops a
 * phone; and no answer carries a step to run after it.
 */
function phoneRemovalRules() {
  const writes = moduleNamed('writes', 'X9', WRITES_OWNER);
  const ipc = moduleNamed('ipc', 'X9', "Phase 317 builder door's");
  const bind = moduleNamed('bind', 'X9', "Phase 317 builder door's");
  const runsAfter = (c) => calleeName(c) === 'after' || (ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === 'after');
  if (writes !== null) {
    const deps = interfaceOf(writes, 'PocketWriteDeps');
    const names = (deps?.members ?? []).map((m) => memberName(m)).filter((n) => n !== null).sort();
    checked('X9', 2);
    if (deps === null || deps === undefined || names.join(',') !== 'now,shuttingDown,stillPaired,writes') {
      fail('X9', `${rel(writes)}: PocketWriteDeps holds ${JSON.stringify(names)}; it holds exactly now, shuttingDown, stillPaired and writes, so no write route can reach anything that drops a phone`);
    }
    for (const c of callsOf(writes)) {
      if (runsAfter(c) || /unpair|dropPhone|removePhone/i.test(calleeName(c) ?? '')) fail('X9', `${where(writes, c)}: the write path calls ${String(calleeName(c))}(; it ends a session through PocketWrites and does nothing else`);
    }
  }
  if (bind !== null) {
    const answer = interfaceOf(bind, 'DoorAnswer');
    const names = (answer?.members ?? []).map((m) => memberName(m)).filter((n) => n !== null).sort();
    checked('X9', 2);
    if (names.join(',') !== 'acted,body,status') fail('X9', `${rel(bind)}: DoorAnswer holds ${JSON.stringify(names)}; it holds exactly status, body and acted, so no answer carries a step to run after it`);
    for (const c of callsOf(bind)) if (runsAfter(c)) fail('X9', `${where(bind, c)}: bind.ts runs after( on an answer; nothing follows an answer`);
  }
  if (ipc !== null) {
    checked('X9', 3);
    const remove = methodOf(ipc, 'PocketHost', 'removePhone');
    if (remove === null) fail('X9', `${rel(ipc)}: PocketHost declares no removePhone()`);
    const filters = callsOf(ipc).filter((c) => calleeName(c) === 'filter' && /\.phones$/.test(ts.isPropertyAccessExpression(c.expression) ? c.expression.expression.getText() : ''));
    if (filters.length === 0) fail('X9', `${rel(ipc)}: nothing filters a phone out of the store, so Remove removes nothing`);
    for (const f of filters) {
      checked('X9');
      if (remove === null || !inside(f, remove)) fail('X9', `${where(ipc, f)}: a phone is filtered out of the store outside removePhone; Remove is the ONE thing that takes a phone out`);
    }
    for (const c of callsOf(ipc)) {
      if (runsAfter(c) || /^(?:dropPhone|unpairSigningPhone)$/.test(calleeName(c) ?? '')) {
        checked('X9');
        fail('X9', `${where(ipc, c)}: ipc.ts calls ${String(calleeName(c))}(; the phone's own unpair was taken out, and Remove runs its steps itself`);
      }
    }
    const handlerCall = callsOf(ipc).find((c) => calleeName(c) === 'createPocketWriteHandler');
    checked('X9');
    if (handlerCall === undefined) fail('X9', `${rel(ipc)} never makes the write path, so this rule cannot read what it is handed`);
    else if (/unpair|dropPhone|removePhone|forget/i.test(handlerCall.getText())) {
      fail('X9', `${where(ipc, handlerCall)}: the write path is handed something that names a phone's removal; it is handed the quit, stillPaired, the writes and the clock`);
    }
  }
}

/** Is `n` inside a function nested in `outer` (not `outer` itself)? */
function insideNested(n, outer) {
  for (let p = n.parent; p !== undefined && p !== outer; p = p.parent) {
    if (ts.isFunctionLike(p)) return true;
  }
  return false;
}

/** X12: the lines say what the writes do, derived; the sheet's sentence is true. */
function writeLinesRule() {
  const pairing = moduleNamed('pairing', 'X12', "Phase 317 builder door's");
  if (pairing !== null) {
    const map = nodesOf(pairing).find(
      (n) => ts.isVariableDeclaration(n) && n.type !== undefined && /^(?:Readonly<)?Record<PocketWriteRouteId,\s*string>>?$/.test(n.type.getText().replace(/\s+/g, ' '))
    );
    const describe = oneFunction(pairing, 'describePocketDoor');
    checked('X12', 3);
    if (map === undefined || !ts.isIdentifier(map.name)) {
      fail('X12', `${rel(pairing)}: no compiled map keyed by PocketWriteRouteId says what each write lets a phone do, so a write added without words is no compile error`);
    }
    if (describe === null) {
      fail('X12', `${rel(pairing)} declares no single describePocketDoor`);
    } else if (map !== undefined && ts.isIdentifier(map.name)) {
      const text = codeOfNode(pairing, describe);
      const push = descendantsOf(describe).find((n) => ts.isCallExpression(n) && calleeName(n) === 'push' && /Lets an allowed phone/.test(n.getText()));
      const pushed = push?.arguments[0];
      const derived = pushed !== undefined && ts.isTemplateExpression(pushed) && pushed.head.text.startsWith('Lets an allowed phone ');
      if (!derived) fail('X12', `${where(pairing, describe)}: the write line is not a template composed from the clauses; it is derived from the hashed route list, never spelled`);
      if (!new RegExp(`\\b${map.name.text}\\b`).test(text) || !/fields\.routes/.test(text)) {
        fail('X12', `${where(pairing, describe)}: describePocketDoor does not read ${map.name.text} over fields.routes, so the line is not the hashed facts`);
      }
    }
  }
  // PHASE 318: the clauses are exactly the three, joined as a list.
  if (pairing !== null) {
    const map = nodesOf(pairing).find((n) => ts.isVariableDeclaration(n) && n.type !== undefined && /Record<PocketWriteRouteId,\s*string>/.test(n.type.getText()));
    let init = map === undefined ? undefined : bare(map.initializer);
    if (init !== undefined && ts.isCallExpression(init) && calleeName(init) === 'freeze') init = bare(init.arguments[0]);
    const got = {};
    if (init !== undefined && ts.isObjectLiteralExpression(init)) for (const p of init.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer)) got[memberName(p)] = p.initializer.text;
    // PHASE 337 (D35): and keys, in the plainest true words for a write that
    // can run a command in a shell.
    const want = { end: 'end a session', choose: 'answer a numbered question', say: 'send a session one message', keys: 'type into any session as you would at this Mac' };
    checked('X12', 2);
    if (JSON.stringify(Object.keys(got).sort().map((k) => [k, got[k]])) !== JSON.stringify(Object.keys(want).sort().map((k) => [k, want[k]]))) {
      fail('X12', `${rel(pairing)}: the write clauses are ${JSON.stringify(got)}; they are exactly ${JSON.stringify(want)}, so the line reads "Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac" (build/p318/SPEC.md §5.1.7; build/p337/SPEC.md D35)`);
    }
    const describe = oneFunction(pairing, 'describePocketDoor');
    const text = describe === null ? '' : codeOfNode(pairing, describe);
    if (/clauses\.join\(\s*' and '\s*\)/.test(text)) fail('X12', `${rel(pairing)}: describePocketDoor joins every clause with " and "; three clauses read as a list, commas between all but the last two and " and " before the last (build/p318/SPEC.md §5.1.7)`);
  }
  checked('X12', 2);
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const honesty = existsSync(contract) ? constNamed(contract, 'POCKET_DOOR_HONESTY') : null;
  if (honesty === null) {
    fail('X12', 'src/shared/ipc/pocket.ts declares no POCKET_DOOR_HONESTY; the sheet’s sentence says what the door lets a phone do');
  } else {
    const parts = [];
    const collect = (e) => {
      const b = bare(e);
      if (b !== undefined && ts.isStringLiteralLike(b)) parts.push(b.text);
      else if (b !== undefined && ts.isBinaryExpression(b) && b.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        collect(b.left);
        collect(b.right);
      } else parts.push('\u0000');
    };
    collect(honesty.initializer);
    const said = parts.join('');
    // PHASE 337 (D35): the old sentence's "It can change nothing else on this
    // Mac" is false once a phone can type into a shell, and "what … shows"
    // because the Screen is not redacted (D41).
    // PHASE 337.1 (build/p3371/SPEC.md D35): the phone names it Terminal, and
    // it can read what a session printed BEFORE, which his Phase 316 ruling
    // refused until his ruling "Yes, scroll back on the Screen"; no write
    // clause moved. Z30 holds the new half on its own.
    const WANT = 'A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
    if (said !== WANT) fail('X12', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says ${JSON.stringify(said)}; it says ${JSON.stringify(WANT)}, which names the terminal, what it printed before, the keys and the three writes and no Face ID (build/p318/SPEC.md §5.1.7, D28; build/p337/SPEC.md D35; build/p3371/SPEC.md D35)`);
  }
  for (const file of productionSources()) {
    if (!readFileSync(file, 'utf8').includes('POCKET_READ_ONLY_HONESTY')) continue;
    for (const n of nodesOf(file)) {
      if (ts.isIdentifier(n) && n.text === 'POCKET_READ_ONLY_HONESTY') {
        fail('X12', `${where(file, n)} names POCKET_READ_ONLY_HONESTY; a constant named read only, drawn under a door that ends sessions, is false in code and on screen`);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Y — the reply (Phase 318, build/p318/SPEC.md §6.1)
// ---------------------------------------------------------------------------

/**
 * PHASE 318 TYPES INTO A RUNNING AGENT FROM OUTSIDE THE MAC, and the module
 * that types is OUTSIDE the door's directory: `src/main/reply/`, which the
 * door reaches only through the `PocketWrites` and `PocketFacts` members
 * src/main/capabilities.ts hands it. Every clause below is one line a later
 * round could delete with the phone still answering questions, read with the
 * parser against the names build/p318/SPEC.md §5 pins (`createReplyVerbs`,
 * `readReply`, `replyGate`, `readPress`, `promptIsEmpty`, `textRefusal`,
 * `hookBashOf`, `replyTurns`, `onInput`, `isPaneReport`). A module that is not
 * there FAILS the rule that needed it, by name, and says which builder owns it.
 */
const J = JSON.stringify;
const REPLY_DIR = join(ROOT, 'src', 'main', 'reply');
const REPLY_OWNER = "Phase 318 builder verbs's (src/main/reply/)";
const replyFiles = sourcesUnder(REPLY_DIR);
/** PHASE 337: the Screen's read and its keys (build/p337/SPEC.md §5.3, §5.4), outside the door like the reply. */
const SCREEN_DIR = join(ROOT, 'src', 'main', 'screen');
const screenFiles = sourcesUnder(SCREEN_DIR);
const REMOTE_SCREEN = join(ROOT, 'src', 'main', 'machines', 'remote-screen.ts');
const Y_RULES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', 'Y14', 'Y15', 'Y16', 'Y17', 'Y18'];

/** A reply module, or null with the rule failed by name. */
function replyModule(basename, ruleId) {
  const path = join(REPLY_DIR, `${basename}.ts`);
  if (existsSync(path)) return path;
  fail(ruleId, `src/main/reply/${basename}.ts does not exist, so this rule read nothing. It is ${REPLY_OWNER}. A gate that passed here would go green on the day the phone types with no rule around it.`);
  return null;
}

/** Every function in a file named `name` that calls `still(` (a verb), the longest first. */
function verbFunction(file, name) {
  const found = functionsNamed(file, name).filter((fn) => descendantsOf(fn).some((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'still'));
  found.sort((a, b) => b.getEnd() - b.getStart() - (a.getEnd() - a.getStart()));
  return found[0] ?? null;
}

/** Is `n` inside a function nested in `fn` (not `fn` itself)? */
function nestedIn(n, fn) {
  for (let p = n.parent; p !== undefined && p !== fn; p = p.parent) {
    if (ts.isFunctionLike(p)) return true;
  }
  return false;
}

/** The tmux commands a reply argv may begin with, and the ones it may not. */
const TMUX_COMMANDS = new Set([
  'attach-session', 'bind-key', 'break-pane', 'capture-pane', 'choose-buffer', 'clear-history', 'command-prompt', 'confirm-before', 'copy-mode',
  'delete-buffer', 'detach-client', 'display-message', 'display-popup', 'has-session', 'if-shell', 'join-pane', 'kill-pane', 'kill-server',
  'kill-session', 'kill-window', 'list-buffers', 'list-panes', 'list-sessions', 'list-windows', 'load-buffer', 'new-session', 'new-window',
  'paste-buffer', 'pipe-pane', 'resize-pane', 'respawn-pane', 'respawn-window', 'run-shell', 'save-buffer', 'select-pane', 'select-window',
  'send-keys', 'send-prefix', 'set-buffer', 'set-environment', 'set-option', 'set-window-option', 'show-buffer', 'source-file', 'split-window',
  'switch-client', 'wait-for'
]);

/**
 * An array literal as its argv shape: a string literal is its text, the
 * PANE_FORMAT constant is `PANE_FORMAT`, any other expression is `<expr>` with
 * its text kept beside it.
 */
function argvShape(file, array) {
  return array.elements.map((e) => {
    const b = bare(e);
    if (b !== undefined && ts.isStringLiteralLike(b)) return { lit: b.text, text: b.getText(astOf(file)) };
    // A module const holding one string literal is that literal (CURSOR_FORMAT).
    if (b !== undefined && ts.isIdentifier(b) && b.text !== 'PANE_FORMAT') {
      const d = constNamed(file, b.text);
      const v = d === null ? undefined : bare(d.initializer);
      if (v !== undefined && ts.isStringLiteralLike(v)) return { lit: v.text, text: b.text };
    }
    if (b !== undefined && ts.isSpreadElement(b)) return { lit: null, text: `...${b.expression.getText(astOf(file))}`, spread: true };
    return { lit: null, text: b === undefined ? '' : b.getText(astOf(file)) };
  });
}

/** The allowed argv shapes, `null` a non-literal element (build/p318/SPEC.md Y3). */
const REPLY_ARGV = Object.freeze({
  'press control: copy-mode': ['copy-mode', '-q', '-t', null],
  'press control: send-keys': ['send-keys', '-t', null, '-l', '--', null],
  'press list': ['copy-mode', '-q', '-t', null, ';', 'send-keys', '-t', null, '-l', '--', null],
  'load-buffer': ['load-buffer', '-b', null, '-'],
  'paste list': ['copy-mode', '-q', '-t', null, ';', 'paste-buffer', '-p', '-d', '-b', null, '-t', null, ';', 'send-keys', '-t', null, 'Enter'],
  'delete-buffer': ['delete-buffer', '-b', null],
  'list-panes': ['list-panes', '-t', null, '-F', 'PANE_FORMAT'],
  'display-message': ['display-message', '-p', '-t', null, '#{cursor_x}\t#{cursor_y}'],
  'capture-pane': ['capture-pane', '-p', '-t', null],
  'capture-pane styled': ['capture-pane', '-p', '-e', '-t', null]
});

/** Which allowed shape an argv is, or null. */
function replyArgvKind(shape) {
  for (const [kind, want] of Object.entries(REPLY_ARGV)) {
    if (want.length !== shape.length) continue;
    let ok = true;
    for (let i = 0; i < want.length; i += 1) {
      const el = shape[i];
      if (el.spread === true) ok = false;
      else if (want[i] === null) ok = ok && el.lit === null;
      else if (want[i] === 'PANE_FORMAT') ok = ok && el.lit === null && el.text === 'PANE_FORMAT';
      else ok = ok && el.lit === want[i];
    }
    if (ok) return kind;
  }
  return null;
}

/** Every tmux argv array literal in a file: its node, its shape and its kind. */
function tmuxArgvsOf(file) {
  const out = [];
  for (const n of nodesOf(file)) {
    if (!ts.isArrayLiteralExpression(n) || n.elements.length === 0) continue;
    const first = bare(n.elements[0]);
    if (first === undefined || !ts.isStringLiteralLike(first) || !TMUX_COMMANDS.has(first.text)) continue;
    const shape = argvShape(file, n);
    out.push({ node: n, shape, kind: replyArgvKind(shape) });
  }
  return out;
}

/** The statement list a node's statement sits in, and that statement. */
function statementOf(node) {
  for (let n = node; n.parent !== undefined; n = n.parent) {
    if (ts.isBlock(n.parent) || ts.isSourceFile(n.parent)) return { list: n.parent.statements, statement: n };
  }
  return null;
}

function replyRules() {
  // -------------------------------------------------------------------------
  // Y1, THE CAPS, keyed by the closed write list (§Revision R18, D3).
  // -------------------------------------------------------------------------
  {
    const limits = join(DOMAIN, 'door', 'limits.ts');
    const caps = existsSync(limits) ? constNamed(limits, 'POCKET_WRITE_BODY_CAPS') : null;
    checked('Y1', 2);
    if (caps === null) {
      fail('Y1', `${rel(limits)} declares no POCKET_WRITE_BODY_CAPS`);
    } else {
      let init = bare(caps.initializer);
      if (init !== undefined && ts.isCallExpression(init) && calleeName(init) === 'freeze') init = bare(init.arguments[0]);
      const got = {};
      if (init !== undefined && ts.isObjectLiteralExpression(init)) {
        for (const p of init.properties) {
          if (ts.isPropertyAssignment(p) && memberName(p) !== null) got[memberName(p)] = ts.isNumericLiteral(p.initializer) ? Number(p.initializer.text.replace(/_/g, '')) : null;
        }
      }
      // PHASE 337 widened it (Z2 holds the keys cap's arithmetic).
      const want = { choose: 512, end: 512, keys: 16_384, say: 32_768 };
      if (J(Object.keys(got).sort().map((k) => [k, got[k]])) !== J(Object.keys(want).sort().map((k) => [k, want[k]]))) {
        fail('Y1', `${where(limits, caps)}: POCKET_WRITE_BODY_CAPS is ${J(got)}; it is exactly end 512, choose 512, say 32,768 and keys 16,384. The say cap holds a 4,096-byte text of C0 controls escaped \\u00XX (24,771 bytes), so the Mac answers it refused character rather than the door dropping it oversized (D3, §Revision R10, R18; build/p337/SPEC.md D17)`);
      }
      if (!(caps.initializer !== undefined && ts.isCallExpression(bare(caps.initializer)) && calleeName(bare(caps.initializer)) === 'freeze')) {
        fail('Y1', `${where(limits, caps)}: POCKET_WRITE_BODY_CAPS is not Object.freeze(...)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Y2, STILL: the door's last check handed to the reply's verbs (D5).
  // -------------------------------------------------------------------------
  const writesFile = join(DOMAIN, 'writes.ts');
  if (!existsSync(writesFile)) {
    fail('Y2', `src/main/pocket/writes.ts does not exist. It is ${WRITES_OWNER}.`);
  } else {
    const handler = writeHandlerOf(writesFile);
    const still = handler === null ? null : descendantsOf(handler).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'still');
    checked('Y2', 4);
    if (still === null || still === undefined) {
      fail('Y2', `${rel(writesFile)}: the write path builds no const still, so the verbs that read before they type have nothing to ask again before the keystroke (D5)`);
    } else {
      const fn = bare(still.initializer);
      const body = fn !== undefined && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) ? fn.body : null;
      const asks = body === null ? [] : descendantsOf(body).filter((n) => ts.isCallExpression(n)).map((c) => c.expression.getText(astOf(writesFile)));
      const lastCheck = descendantsOf(handler).find((n) => ts.isIfStatement(n) && /stillPaired\(/.test(n.expression.getText()));
      const lastAsks = lastCheck === undefined ? [] : descendantsOf(lastCheck.expression).filter((n) => ts.isCallExpression(n)).map((c) => c.expression.getText(astOf(writesFile)));
      const want = ['deps.shuttingDown', 'door.stopping', 'deps.stillPaired'];
      if (J([...asks].sort()) !== J([...want].sort())) fail('Y2', `${where(writesFile, still)}: still asks ${J(asks)}; it asks exactly the quit, this door instance stopping and the signing phone still paired, the same three as the last check`);
      if (J([...lastAsks].sort()) !== J([...asks].sort())) fail('Y2', `${where(writesFile, still)}: still asks ${J(asks)} and the last check ${J(lastAsks)}; they are one question asked twice, so a press can never type where the door would have refused it`);
      const handed = (verb) =>
        descendantsOf(handler).some((n) => ts.isCallExpression(n) && calleeName(n) === verb && /writes/.test(ts.isPropertyAccessExpression(n.expression) ? n.expression.expression.getText() : '') && n.arguments[1] !== undefined && bare(n.arguments[1]).getText() === 'still');
      if (!handed('choose') || !handed('say')) fail('Y2', `${rel(writesFile)}: writes.choose( and writes.say( are not each handed still as their second argument (D5)`);
    }
    // The text reaches writes.say( and nowhere else (the parse aside).
    const sayParse = oneFunction(writesFile, 'parseSayBody');
    for (const n of nodesOf(writesFile)) {
      if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'text') continue;
      if (sayParse !== null && inside(n, sayParse)) continue;
      checked('Y2');
      let ok = false;
      for (let p = n.parent; p !== undefined; p = p.parent) {
        if (ts.isCallExpression(p) && calleeName(p) === 'say' && /writes/.test(ts.isPropertyAccessExpression(p.expression) ? p.expression.expression.getText() : '')) {
          ok = p.arguments.some((a) => inside(n, a));
          break;
        }
        if (ts.isFunctionLike(p) && p === handler) break;
      }
      if (!ok) fail('Y2', `${where(writesFile, n)}: a message's text is read as ${J(n.parent.getText().slice(0, 60))}; in the write path it reaches writes.say( and nothing else, so no log line, answer or ledger entry can carry it`);
    }
  }

  // -------------------------------------------------------------------------
  // Y3, THE ARGV, element for element; Y4, the text's one sink.
  // -------------------------------------------------------------------------
  const writer = replyModule('writer', 'Y3');
  const reader = replyModule('reader', 'Y3');
  if (writer === null) for (const id of ['Y4', 'Y5', 'Y6', 'Y10', 'Y13']) fail(id, `src/main/reply/writer.ts does not exist. It is ${REPLY_OWNER}.`);
  if (reader === null) for (const id of ['Y5', 'Y14']) fail(id, `src/main/reply/reader.ts does not exist. It is ${REPLY_OWNER}.`);
  const argvs = [];
  for (const file of [writer, reader].filter((f) => f !== null)) for (const a of tmuxArgvsOf(file)) argvs.push({ file, ...a });
  for (const file of replyFiles.filter((f) => f !== writer && f !== reader)) {
    for (const a of tmuxArgvsOf(file)) {
      checked('Y3');
      fail('Y3', `${where(file, a.node)} composes a tmux argv (${J(a.shape.map((e) => e.lit ?? e.text).slice(0, 4))}); only writer.ts and reader.ts speak to tmux in the reply domain`);
    }
  }
  const kinds = new Map();
  for (const a of argvs) {
    checked('Y3');
    if (a.kind === null) {
      fail('Y3', `${where(a.file, a.node)}: the tmux argv ${J(a.shape.map((e) => e.lit ?? `<${e.text}>`))} is none of the shapes build/p318/SPEC.md Y3 names, element for element. The press is copy-mode -q then send-keys -t <pane> -l -- <marker>, never an Enter; the message is load-buffer, one paste list ending in send-keys Enter, and delete-buffer`);
      continue;
    }
    kinds.set(a.kind, [...(kinds.get(a.kind) ?? []), a]);
    if (a.file === reader && !/^(?:list-panes|display-message|capture-pane)/.test(a.kind)) fail('Y3', `${where(a.file, a.node)}: reader.ts composes the ${a.kind}; the reader reads and never types`);
    if (a.file === writer && /^(?:list-panes|display-message|capture-pane)/.test(a.kind) && reader !== null && !tmuxArgvsOf(reader).some((r) => r.kind === a.kind)) {
      fail('Y3', `${where(a.file, a.node)}: writer.ts reads the screen itself (${a.kind}) where the reader does not; the offer and the press read one way, through readReply`);
    }
  }
  // The press and the paste aim at the reading's pane, never the session.
  const targets = (kind, positions) => (kinds.get(kind) ?? []).flatMap((a) => positions.map((i) => a.shape[i].text));
  const sessionTargets = new Set(targets('list-panes', [2]));
  const typed = [
    ...targets('press control: copy-mode', [3]),
    ...targets('press control: send-keys', [2]),
    ...targets('press list', [3, 7]),
    ...targets('paste list', [3, 11, 15])
  ];
  checked('Y3', 2);
  for (const t of typed) {
    if (sessionTargets.has(t)) fail('Y3', `the press or the paste aims at ${J(t)}, the target list-panes reads the SESSION by; it aims at the %-pane the reading captured (§Revision R19 b), because a window made from the Mac would take a keystroke aimed at the session`);
  }
  for (const a of [...(kinds.get('press list') ?? []), ...(kinds.get('paste list') ?? [])]) {
    const ts_ = a.kind === 'press list' ? [a.shape[3].text, a.shape[7].text] : [a.shape[3].text, a.shape[11].text, a.shape[15].text];
    if (new Set(ts_).size !== 1) fail('Y3', `${where(a.file, a.node)}: the ${a.kind}'s commands aim at ${J(ts_)}; one list aims at one pane`);
  }
  for (const a of [...(kinds.get('press control: send-keys') ?? []), ...(kinds.get('press list') ?? [])]) {
    const marker = a.shape[a.shape.length - 1].text;
    if (!/(?:^|\.)marker$/.test(marker)) fail('Y3', `${where(a.file, a.node)}: the press types ${J(marker)}; it types the marker the phone named and the reading holds, one digit`);
  }
  checked('Y3', 3);
  if (writer !== null) {
    if ((kinds.get('press control: send-keys') ?? []).length !== 1 || (kinds.get('press control: copy-mode') ?? []).length !== 1) fail('Y3', `${rel(writer)}: the press's two control lines are composed ${String((kinds.get('press control: copy-mode') ?? []).length)} and ${String((kinds.get('press control: send-keys') ?? []).length)} time(s); once each (D8)`);
    if ((kinds.get('press list') ?? []).length !== 1) fail('Y3', `${rel(writer)}: the spawned press list is composed ${String((kinds.get('press list') ?? []).length)} time(s); once, the fallback when the control client is not connected (D8)`);
    if ((kinds.get('paste list') ?? []).length !== 1 || (kinds.get('load-buffer') ?? []).length !== 1) fail('Y3', `${rel(writer)}: the message's load-buffer and paste list are composed ${String((kinds.get('load-buffer') ?? []).length)} and ${String((kinds.get('paste list') ?? []).length)} time(s); once each (D9)`);
  }
  // Every Enter, -l and send-keys literal in the domain sits in a shape above.
  const inArgv = (n) => argvs.some((a) => inside(n, a.node) && a.kind !== null);
  for (const file of replyFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      if (!['Enter', 'C-m', 'KPEnter', '-l', 'send-keys', 'paste-buffer'].includes(text)) continue;
      checked('Y3');
      if (!inArgv(node)) fail('Y3', `${where(file, node)} spells ${J(text)} outside the argv shapes Y3 names. An Enter is the paste list's alone, -l is the press's alone, and nothing else in the reply domain may compose a keystroke`);
    }
  }

  // Y4: no argv element is the text; its one sink is stdin; the buffer is the writer's own; delete-buffer in a finally.
  if (writer !== null) {
    for (const a of argvs) {
      for (const el of a.shape) {
        checked('Y4');
        if (/\btext\b/.test(el.text)) fail('Y4', `${where(a.file, a.node)}: an argv element is ${J(el.text)}; no argv element in src/main/reply is derived from a message's text, whose one sink is load-buffer's stdin (research 135 §3.1, §4.8: a failed tmux command's text holds its argv)`);
      }
    }
    const textReads = nodesOf(writer).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'text' && /input|parsed|body/.test(n.expression.getText()));
    checked('Y4', 2);
    if (textReads.length === 0) fail('Y4', `${rel(writer)} never reads input.text, so where a message goes cannot be read`);
    let sinks = 0;
    for (const n of textReads) {
      let ok = false;
      for (let p = n.parent; p !== undefined && !ts.isFunctionLike(p); p = p.parent) {
        if (ts.isCallExpression(p) && calleeName(p) === 'textRefusal') {
          ok = true;
          break;
        }
        if (ts.isPropertyAssignment(p) && memberName(p) === 'stdin') {
          ok = true;
          sinks += 1;
          break;
        }
      }
      if (!ok) fail('Y4', `${where(writer, n)}: the text is read as ${J(n.parent.getText().slice(0, 60))}; it reaches textRefusal( and the stdin of load-buffer, and nothing else`);
    }
    if (sinks !== 1) fail('Y4', `${rel(writer)}: the text reaches a stdin ${String(sinks)} time(s); once, load-buffer's`);
    for (const kind of ['load-buffer', 'paste list', 'delete-buffer']) {
      for (const a of kinds.get(kind) ?? []) {
        const at = kind === 'paste list' ? 9 : 2;
        const name = a.shape[at].text;
        const decl = ts.isIdentifier(bare(a.node.elements[at])) ? constNamed(writer, name) : null;
        // The initializer, with every module const it names read in beside it
        // (`BUFFER_PREFIX + randomBytes(16).toString('hex')`).
        const init = decl === null ? '' : [decl.initializer.getText(astOf(writer)), ...descendantsOf(decl.initializer).filter((m) => ts.isIdentifier(m)).map((m) => constNamed(writer, m.text)).filter((d) => d !== null && d !== decl).map((d) => d.initializer.getText(astOf(writer)))].join(' ');
        checked('Y4');
        if (decl === null || !/tortie-say-/.test(init) || /\binput\b|\bparsed\b|\.write\b/.test(init)) {
          fail('Y4', `${where(a.file, a.node)}: the ${kind}'s buffer is ${J(name)}${decl === null ? ', not a const of the writer' : ` = ${J(init.slice(0, 60))}`}; it is 'tortie-say-' and an id the writer mints itself, and the phone's write id never names a tmux object`);
        }
      }
    }
    checked('Y4', 2);
    if (!callsOf(writer).some((c) => calleeName(c) === 'randomBytes' && c.arguments[0]?.getText() === '16')) fail('Y4', `${rel(writer)} mints no 32-hex id of its own (randomBytes(16)) for the buffer`);
    for (const a of kinds.get('delete-buffer') ?? []) {
      if (!insideFinally(a.node)) fail('Y4', `${where(a.file, a.node)}: delete-buffer is not in a finally, so a refusal or a throw after load-buffer leaves his words in the private server`);
    }
    if ((kinds.get('delete-buffer') ?? []).length === 0) fail('Y4', `${rel(writer)} never deletes the buffer, so a message refused after load-buffer stays in the private server`);
  }

  // -------------------------------------------------------------------------
  // Y5, THE FINAL CHECK, THEN THE BUMP, THEN THE ACT, nothing awaited between.
  // -------------------------------------------------------------------------
  if (writer !== null) {
    for (const verb of ['choose', 'say']) {
      const fn = verbFunction(writer, verb);
      checked('Y5');
      if (fn === null) {
        fail('Y5', `${rel(writer)} declares no ${verb} that asks still(, so the final check cannot be read`);
        continue;
      }
      const own = descendantsOf(fn).filter((n) => !nestedIn(n, fn));
      const firstStill = own.find((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'still');
      const bump = own.find((n) => ts.isCallExpression(n) && calleeName(n) === 'bump' && n.arguments.some((x) => ts.isStringLiteralLike(x) && x.text === 'phone'));
      const onLast = own.find((n) => ts.isCallExpression(n) && calleeName(n) === 'onLastCheck');
      const actKinds = verb === 'choose' ? ['press list', 'press control: send-keys'] : ['paste list'];
      const actArrays = actKinds.flatMap((k) => kinds.get(k) ?? []).filter((a) => a.file === writer && inside(a.node, fn));
      const allSettled = own.find((n) => ts.isCallExpression(n) && n.expression.getText() === 'Promise.allSettled');
      const actAt = Math.min(...actArrays.map((a) => a.node.getStart()), ...(verb === 'choose' && allSettled !== undefined ? [allSettled.getStart()] : []));
      checked('Y5', 5);
      if (firstStill === undefined || bump === undefined || onLast === undefined || !Number.isFinite(actAt)) {
        fail('Y5', `${where(writer, fn)}: ${verb} names ${J({ still: firstStill !== undefined, bump: bump !== undefined, onLastCheck: onLast !== undefined, act: Number.isFinite(actAt) })}; it asks still( in its final check, then bumps the question id for the phone, then onLastCheck?.(, then the act`);
        continue;
      }
      if (!(firstStill.getStart() < bump.getStart() && bump.getStart() < onLast.getStart() && onLast.getStart() < actAt)) {
        fail('Y5', `${where(writer, fn)}: ${verb}'s still(, bump(, onLastCheck?.( and act are not in that order; the id moves before the keystroke so a desk keystroke racing it is told apart, and the measurement's stamp is the last thing before the act`);
      }
      // The act's own await is the act (`await run([…paste list…])`); any OTHER
      // await between the final check and the act is the window.
      const actNodes = [...actArrays.map((a) => a.node), ...(verb === 'choose' && allSettled !== undefined ? [allSettled] : [])];
      const awaited = own.filter((n) => ts.isAwaitExpression(n) && n.getStart() > firstStill.getStart() && n.getStart() < actAt && !actNodes.some((x) => inside(x, n.expression)));
      for (const w of awaited) fail('Y5', `${where(writer, w)}: ${verb} awaits ${J(w.getText().slice(0, 50))} between its final check and its act. Nothing is awaited there: a press reads the screen before it types, and that read is the window a Removed phone or a moved question would type through (D5, §Revision R15)`);
      if (verb === 'choose' && allSettled !== undefined) {
        const lines = descendantsOf(allSettled).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'sendCommand');
        if (lines.length !== 2) fail('Y5', `${where(writer, allSettled)}: Promise.allSettled( holds ${String(lines.length)} sendCommand( call(s); the press is two control lines written in one statement (D8, §Revision R19 a)`);
        const stmt = statementOf(allSettled);
        const promiseAll = own.find((n) => ts.isCallExpression(n) && n.expression.getText() === 'Promise.all');
        if (promiseAll !== undefined) fail('Y5', `${where(writer, promiseAll)}: choose names Promise.all; a refused copy-mode line beside a resolved send-keys line would read "could not type" while the digit landed. The outcome is the send-keys line's (Promise.allSettled, §Revision R19 a)`);
        void stmt;
      } else if (verb === 'choose') {
        fail('Y5', `${where(writer, fn)}: choose names no Promise.allSettled([…]) of its two control lines (D8)`);
      }
    }
  }
  if (reader !== null) {
    const fn = oneFunction(reader, 'readReply');
    checked('Y5');
    if (fn === null) {
      fail('Y5', `${rel(reader)} declares no single readReply, the one reading the offer and the press share`);
    } else {
      const awaits = descendantsOf(fn).filter((n) => ts.isAwaitExpression(n) && !nestedIn(n, fn));
      const last = awaits[awaits.length - 1];
      const capturesIn = (node) => {
        const text = codeOfNode(reader, node);
        if (/'capture-pane'/.test(text)) return true;
        const call = descendantsOf(node).find((m) => ts.isCallExpression(m) && ts.isIdentifier(m.expression));
        const helper = call === undefined ? null : oneFunction(reader, call.expression.text);
        return helper !== null && /'capture-pane'/.test(codeOfNode(reader, helper));
      };
      if (last === undefined || !capturesIn(last)) {
        fail('Y5', `${where(reader, fn)}: readReply's last awaited read is ${J(last?.getText().slice(0, 60) ?? 'nothing')}; it is the capture, so the screen is the youngest thing the final check reads (§Revision R15: the process reads take a ps each, tens of milliseconds)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Y6, ONE STATUS CALL, the desk's own funnel, after a read-back that saw it answered.
  // -------------------------------------------------------------------------
  {
    const calls = [];
    for (const file of replyFiles) {
      for (const c of callsOf(file)) {
        const name = calleeName(c);
        if (name === 'noteUserInput') calls.push({ file, c });
        checked('Y6');
        if (name !== null && /^(?:noteHookEvent|applyDetectedStatus|setStatus|setSessionStatus|updateStatus|onStatus|commit|noteChoiceGone|noteForeground)$/.test(name)) {
          fail('Y6', `${where(file, c)} calls ${name}(. No route and no verb sets a status (CLAUDE.md refusal 5); the one call in src/main/reply is noteUserInput, the desk's funnel, after a read-back that saw the question answered`);
        }
      }
    }
    checked('Y6', 3);
    if (calls.length !== 1) fail('Y6', `src/main/reply calls noteUserInput( ${String(calls.length)} time(s); once, in choose, on the answered branch (D16)`);
    for (const { file, c } of calls) {
      const fn = writer === null ? null : verbFunction(writer, 'choose');
      if (file !== writer || fn === null || !inside(c, fn)) {
        fail('Y6', `${where(file, c)}: noteUserInput( is called outside writer.ts's choose; a message is refused on every needs_input row, so there is nothing for it to release (D17)`);
        continue;
      }
      const readBack = descendantsOf(fn).find((n) => (ts.isIdentifier(n) && n.text === 'REPLY_READ_BACK_MS') || (ts.isCallExpression(n) && calleeName(n) === 'sleep'));
      if (readBack === undefined || readBack.getStart() > c.getStart()) fail('Y6', `${where(file, c)}: noteUserInput( is not after the read-back (REPLY_READ_BACK_MS); answered is decided by the screen or the agent's hook, never by the keystroke`);
      const guard = guardingIf(c) ?? guardingIfOfExpression(c);
      const cond = guard?.expression?.getText() ?? (ts.isConditionalExpression(c.parent) ? c.parent.condition.getText() : '');
      // THE FIX ROUND OF 2026-10-04. The guard is "no hook since the press"
      // AND "no choice on the read-back screen", and never the id's count: a
      // tick inside the 300 ms read-back answers `choice-gone` for the very
      // question the press answered and moves the count, and a release skipped
      // there left the Mac at needs input with nothing on the phone to clear
      // it (both real agents go to idle after a decline with no hook, and
      // needs_input to idle is refused).
      if (!/\.hooks\s*===\s*[\w.]*\.hooks\b/.test(cond)) fail('Y6', `${where(file, c)}: noteUserInput( is not guarded by no hook having come since the press (later.hooks === at.hooks); a hook since the press spoke for the status, and Claude's PermissionRequest is the NEXT question (§Revision R11)`);
      if (!/!\s*[\w.]*\.atChoice\b/.test(cond)) fail('Y6', `${where(file, c)}: noteUserInput( is not guarded by the read-back screen drawing no choice (!rows.atChoice); a choice drawn there is a question the monitor's own tick speaks for (§Revision R11)`);
      if (/\.n\s*[!=]==\s*[\w.]*\.n\b/.test(cond)) fail('Y6', `${where(file, c)}: noteUserInput( is guarded by the id's count; a tick's choice-gone inside the read-back moves it for the question the press answered, and the release skipped there left the Mac at needs input (the fix round of 2026-10-04)`);
    }
  }

  // -------------------------------------------------------------------------
  // Y7, THE PURE MODULES: compiled, configured by nothing, touching nothing.
  // -------------------------------------------------------------------------
  {
    const pure = ['press-shapes', 'input-row', 'text-rules', 'gate', 'hook-says', 'question-id'];
    for (const name of pure) {
      const file = replyModule(name, 'Y7');
      if (file === null) continue;
      for (const { node, text: spec } of specifiersOf(file)) {
        checked('Y7');
        if (/(?:^|\/)(?:config|settings|overlay)(?:\/|$)|agent-overlay|agents\/registry|^(?:node:)?fs(?:\/promises)?$|^(?:node:)?child_process$|(?:^|\/)tmux(?:\/|$)|exec-plane|supervisor/.test(spec)) {
          fail('Y7', `${where(file, node)} imports ${spec}. ${name}.ts is a pure, compiled table: no configuration, settings, overlay or agent registry reaches it (refusal 5: a press shape is compiled, never configured), and it reads no file, starts no process and speaks to no tmux`);
        }
        if (name === 'question-id' && spec !== 'node:crypto') fail('Y7', `${where(file, node)}: question-id.ts imports ${spec}; it imports node:crypto and nothing else (§5.3)`);
      }
      if (name === 'press-shapes' || name === 'input-row') {
        const sf = astOf(file);
        for (const st of sf.statements) {
          if (!ts.isVariableStatement(st)) continue;
          for (const d of st.declarationList.declarations) {
            const init = d.initializer === undefined ? undefined : bare(d.initializer);
            if (init === undefined || !(ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init))) continue;
            checked('Y7');
            fail('Y7', `${where(file, d)}: the table ${d.name.getText()} is a bare literal; every shape table is Object.freeze(…)d, so nothing can push a shape onto it at run time`);
          }
        }
        const frozen = nodesOf(file).filter((n) => ts.isCallExpression(n) && n.expression.getText() === 'Object.freeze').length;
        checked('Y7');
        if (frozen === 0) fail('Y7', `${rel(file)} freezes no table; its shapes are compiled constants held as Object.freeze'd literals`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Y8, ERRORS BY CODE ALONE; Y9, NO LOG CALL.
  // -------------------------------------------------------------------------
  for (const file of replyFiles) {
    // One check per file read for `.message`, so a rule over a directory that
    // holds no such read still says how much it read (it said "0 check(s)").
    checked('Y8');
    for (const n of nodesOf(file)) {
      if (ts.isPropertyAccessExpression(n) && n.name.text === 'message') {
        checked('Y8');
        fail('Y8', `${where(file, n)} reads .message. A failed tmux command's text holds its argv, and a message's argv is never his words only because of Y4; nothing an error says reaches an outcome (research 135 §4.8)`);
      }
    }
    // And one per catch clause: a clause that binds nothing reads nothing, which
    // is the shape every catch in src/main/reply has today.
    for (const clause of nodesOf(file).filter((n) => ts.isCatchClause(n))) {
      checked('Y8');
      void clause;
    }
    for (const clause of nodesOf(file).filter((n) => ts.isCatchClause(n) && n.variableDeclaration !== undefined)) {
      const name = ts.isIdentifier(clause.variableDeclaration.name) ? clause.variableDeclaration.name.text : null;
      if (name === null) continue;
      for (const use of descendantsOf(clause.block).filter((n) => ts.isIdentifier(n) && n.text === name)) {
        checked('Y8');
        const call = use.parent;
        if (ts.isCallExpression(call) && calleeName(call) === 'isGmuxError' && call.arguments[0] === use) continue;
        fail('Y8', `${where(file, use)}: the caught ${name} is read as ${J(use.parent.getText().slice(0, 60))}; it is told apart by isGmuxError(, by its code, and nothing else`);
      }
    }
    for (const c of callsOf(file)) {
      const name = calleeName(c);
      const recv = ts.isPropertyAccessExpression(c.expression) ? c.expression.expression.getText() : '';
      checked('Y9');
      if ((name !== null && /^(?:debug|info|warn|error|log|trace)$/.test(name) && /log|console/i.test(recv)) || name === 'getLog') {
        fail('Y9', `${where(file, c)} logs (${c.expression.getText()}). Nothing in src/main/reply logs: the one line per write is writes.ts's, and it carries the verb, the outcome word and the session id`);
      }
    }
    for (const { node, text: spec } of specifiersOf(file)) {
      checked('Y9');
      if (/(?:^|\/)log(?:\/|$)|\/log$/.test(spec)) fail('Y9', `${where(file, node)} imports ${spec}; nothing in src/main/reply logs`);
    }
  }

  // -------------------------------------------------------------------------
  // Y10, THE REMOTE AND AGENT ARM FIRST; and no stdin to another machine.
  // -------------------------------------------------------------------------
  if (writer !== null) {
    for (const verb of ['choose', 'say']) {
      const fn = verbFunction(writer, verb);
      if (fn === null) continue;
      const gate = descendantsOf(fn).find((n) => ts.isCallExpression(n) && calleeName(n) === 'replyGate');
      const tmuxCalls = descendantsOf(fn).filter((n) => ts.isCallExpression(n) && /^(?:run|sendCommand|readReply)$/.test(calleeName(n) ?? ''));
      checked('Y10', 1 + tmuxCalls.length);
      if (gate === undefined) {
        fail('Y10', `${where(writer, fn)}: ${verb} never asks replyGate(, so a row on another machine is not refused before a tmux call is composed`);
        continue;
      }
      for (const c of tmuxCalls) if (c.getStart() < gate.getStart()) fail('Y10', `${where(writer, c)}: ${verb} calls ${calleeName(c)}( before replyGate(; a row on another machine is refused before any tmux call is composed`);
    }
  }
  {
    const gateFile = replyModule('gate', 'Y10');
    const fn = gateFile === null ? null : oneFunction(gateFile, 'replyGate');
    checked('Y10');
    if (gateFile !== null && fn === null) fail('Y10', `${rel(gateFile)} declares no single replyGate`);
    if (fn !== null) {
      const text = codeOfNode(gateFile, fn);
      const remote = text.search(/\.machine\s*!==\s*undefined/);
      const status = text.search(/needs_input|'running'|'idle'/);
      if (remote === -1 || (status !== -1 && remote > status)) fail('Y10', `${where(gateFile, fn)}: replyGate does not refuse a row on another machine (machine !== undefined) before it reads the status; the remote and agent arm is first (§5.4.1)`);
    }
    const plane = join(ROOT, 'src', 'main', 'machines', 'exec-plane.ts');
    const spawn = existsSync(plane) ? oneFunction(plane, 'spawnTmux') : null;
    checked('Y10', 2);
    if (spawn === null) {
      fail('Y10', 'src/main/machines/exec-plane.ts declares no single spawnTmux, so the stdin refusal cannot be read');
    } else {
      const compose = descendantsOf(spawn).find((n) => ts.isCallExpression(n) && calleeName(n) === 'tmuxCommand');
      // EXACTLY the two asks, joined by &&: a stdin is given, and the context is
      // remote. A third conjunct (`&& false`) is a refusal that never fires.
      const twoAsks = (e) => {
        const b = bare(e);
        if (b === undefined || !ts.isBinaryExpression(b) || b.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return false;
        const sides = [bare(b.left), bare(b.right)].map((x) => x.getText().replace(/\s+/g, ' '));
        const given = sides.some((t) => /^[\w.]*\.stdin !== undefined$|^undefined !== [\w.]*\.stdin$/.test(t));
        const remote = sides.some((t) => /^[\w.]*\.kind === 'remote'$|^'remote' === [\w.]*\.kind$/.test(t));
        return given && remote;
      };
      const refusal = descendantsOf(spawn).find((n) => ts.isIfStatement(n) && twoAsks(n.expression) && /\bthrow\b/.test(n.thenStatement.getText()));
      if (refusal === undefined || compose === undefined || refusal.getStart() > compose.getStart()) {
        fail('Y10', `${where(plane, spawn)}: spawnTmux does not throw for a stdin on a remote context BEFORE tmuxCommand( composes anything; his words never travel to another machine (D22)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Y11, THE DOOR NAMES NOTHING OF THE WRITER; Y12, G1 OVER THE REPLY.
  // -------------------------------------------------------------------------
  for (const file of domainFiles) {
    for (const { node, text: spec } of specifiersOf(file)) {
      checked('Y11');
      if (/(?:^|\/)reply(?:\/|$)|main\/reply/.test(spec)) fail('Y11', `${where(file, node)} imports ${spec}. The door reaches the reply only through the PocketWrites and PocketFacts members src/main/capabilities.ts hands it, so it cannot name the writer, its argv or its reader`);
    }
  }
  {
    const POISON = /\b(?:tokens?|secrets?|keys?|signatures?|nonces?|body|payload|question|answer|prompt|transcript|contents|authorization|jwt|bearer|pem|apt|pushToken|deviceToken|texts?|messages?|words|labels?|typed|repl(?:y|ies)|marks?|markers?|stdin|screen|capture|styled)\b/i;
    // PHASE 337: G1's scope gains src/main/screen/** and remote-screen.ts,
    // which read whole screens (build/p337/SPEC.md §6.1; Z7 holds that they
    // log nothing at all).
    for (const file of [...replyFiles, ...screenFiles, ...(existsSync(REMOTE_SCREEN) ? [REMOTE_SCREEN] : [])]) {
      for (const call of callsOf(file)) {
        const name = calleeName(call);
        if (name === null || !/^(?:debug|info|warn|error|log)$/.test(name)) continue;
        for (const arg of call.arguments) {
          checked('Y12');
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;
          const text = arg.getText(astOf(file));
          const hit = POISON.exec(text);
          if (hit !== null) fail('Y12', `${where(file, call)} hands ${J(text.slice(0, 80))} to ${name}(), which names ${J(hit[0])}. G1's scope is src/main/pocket/**, pocket-writes.ts, src/main/reply/** and src/main/screen/**: no message, screen, mark or marker reaches a log`);
        }
      }
    }
    checked('Y12');
    if (replyFiles.length === 0) fail('Y12', `src/main/reply/ holds no source file, so G1 read nothing of it. It is ${REPLY_OWNER}.`);
    checked('Y12');
    if (screenFiles.length === 0) fail('Y12', `src/main/screen/ holds no source file, so G1 read nothing of it. It is Phase 337 builders screen's and keys's (build/p337/SPEC.md §10).`);
  }

  // -------------------------------------------------------------------------
  // Y13, WHO MOVES THE QUESTION ID, and nowhere else.
  // -------------------------------------------------------------------------
  {
    const core = join(ROOT, 'src', 'main', 'sessions', 'core.ts');
    const qid = replyModule('question-id', 'Y13');
    const sites = [];
    for (const file of productionSources()) {
      const src = readFileSync(file, 'utf8');
      if (!/replyTurns|\.bump\(|\.hook\(/.test(src)) continue;
      for (const c of callsOf(file)) {
        const name = calleeName(c);
        if (name !== 'bump' && name !== 'hook') continue;
        const recv = ts.isPropertyAccessExpression(c.expression) ? c.expression.expression.getText() : '';
        if (!/replyTurns|(?:^|\.)turns$/.test(recv)) continue;
        sites.push({ file, c, name, recv, cause: c.arguments[1] === undefined ? null : bare(c.arguments[1]).getText() });
      }
    }
    const at = (file) => sites.filter((s) => s.file === file);
    checked('Y13', 6);
    // PHASE 337 (build/p337/SPEC.md §6.1, D21): and the Screen's keys verb,
    // once, with the cause 'phone', as the statement before its act.
    const screenKeys = join(SCREEN_DIR, 'keys.ts');
    for (const s of sites) {
      if (s.file !== core && s.file !== writer && s.file !== screenKeys) fail('Y13', `${where(s.file, s.c)} moves the question id (${s.recv}.${s.name}(); only core.ts's hook, onInput, onChoiceMoved and onStatus wiring, writer.ts's two acts and src/main/screen/keys.ts's one act do`);
    }
    checked('Y13');
    if (!existsSync(screenKeys)) {
      fail('Y13', `src/main/screen/keys.ts does not exist, so the keys verb's bump was not read. It is Phase 337 builder keys's.`);
    } else {
      const k = at(screenKeys);
      if (k.length !== 1 || k[0].name !== 'bump' || k[0].cause !== "'phone'") {
        fail('Y13', `src/main/screen/keys.ts moves the question id as ${J(k.map((x) => `${x.name}(${String(x.cause)})`))}; it bumps 'phone' exactly once, before its act, and never names hook( (build/p337/SPEC.md D21)`);
      }
    }
    const coreHooks = at(core).filter((s) => s.name === 'hook');
    const coreBumps = at(core).filter((s) => s.name === 'bump');
    if (coreHooks.length !== 2) fail('Y13', `src/main/sessions/core.ts calls replyTurns.hook( ${String(coreHooks.length)} time(s); twice, in the hook's onEvent and in onSessionEnd (§5.3 item 1)`);
    const causes = coreBumps.map((s) => s.cause).sort();
    if (J(causes) !== J(["'desk'", "'status'", '`choice-${kind}`'].sort())) fail('Y13', `src/main/sessions/core.ts bumps with ${J(causes)}; it bumps exactly 'desk' (onInput), \`choice-\${kind}\` (onChoiceMoved) and 'status' (onStatus), once each (§5.3 items 2, 3, 5)`);
    for (const s of coreBumps.filter((x) => x.cause === "'status'")) {
      const g = guardingIf(s.c);
      if (g === null || !/!==\s*'needs_input'/.test(g.expression.getText())) fail('Y13', `${where(core, s.c)}: the 'status' bump is not guarded by status !== 'needs_input'; a waiting status must never clear the hook's question it belongs to (§Revision R16)`);
    }
    if (writer !== null) {
      const w = at(writer);
      if (w.length !== 2 || !w.every((s) => s.name === 'bump' && s.cause === "'phone'")) fail('Y13', `${rel(writer)} moves the question id as ${J(w.map((s) => `${s.name}(${String(s.cause)})`))}; it bumps 'phone' twice, once before each act, and never names hook(`);
    }
    if (qid !== null) {
      const rb = callsOf(qid).filter((c) => calleeName(c) === 'randomBytes');
      if (rb.length !== 1 || rb[0].arguments[0]?.getText() !== '8') fail('Y13', `${rel(qid)} calls randomBytes ${J(rb.map((c) => c.getText()))}; the prefix is randomBytes(8), chosen once per process (§5.3)`);
      const asString = nodesOf(qid).some((n) => ts.isTemplateExpression(n) && n.templateSpans.length === 2 && n.templateSpans[0].literal.text === '-');
      if (!asString) fail('Y13', `${rel(qid)} composes no \`\${prefix}-\${n}\` id; the id is a string on the wire, never a number, so the phone's rule (k) never reaches it`);
    }
  }

  // -------------------------------------------------------------------------
  // Y14, THE READER READS THE SCREEN ONE WAY; routes.ts composes reply field by field.
  // -------------------------------------------------------------------------
  if (reader !== null) {
    const names = new Set(callsOf(reader).map((c) => calleeName(c)));
    checked('Y14', 7);
    for (const want of ['detectDialogRows', 'choiceMarkOf']) if (!names.has(want)) fail('Y14', `${rel(reader)} never calls ${want}(; the reader reads the rows and the mark the monitor reads (§5.4.2)`);
    for (const refused of ['detectDialog', 'detectShapes', 'noteForeground', 'foregroundToRead', 'agentHoldsTerminal']) {
      if (names.has(refused)) fail('Y14', `${rel(reader)} calls ${refused}(; the reader reads detectDialogRows and the foreground fresh, and never ${refused} (D13: agentHoldsTerminal answers false for every Codex session, and conformance:choices pins noteForeground and foregroundToRead to one call site)`);
    }
  }
  {
    const routes = join(DOMAIN, 'routes.ts');
    const FIVE = J(['canSay', 'command', 'mark', 'pressable', 'question']);
    const composers = existsSync(routes)
      ? nodesOf(routes).filter((n) => ts.isObjectLiteralExpression(n) && J(n.properties.map((p) => memberName(p) ?? '?').sort()) === FIVE && n.parent !== undefined && ts.isReturnStatement(n.parent))
      : [];
    checked('Y14', 3);
    if (composers.length !== 1) {
      fail('Y14', `${rel(routes)} returns ${String(composers.length)} object literal(s) of exactly question, mark, pressable, command and canSay; the reply is composed FIELD BY FIELD in one place, so nothing else the reader held can leave`);
    }
    for (const obj of composers) {
      const fn = (() => {
        for (let p = obj.parent; p !== undefined; p = p.parent) if (ts.isFunctionLike(p)) return p;
        return null;
      })();
      const fresh = (e) => {
        const b = bare(e);
        if (b === undefined) return false;
        if (ts.isArrayLiteralExpression(b)) return b.elements.every((x) => !ts.isSpreadElement(x) || true);
        if (ts.isConditionalExpression(b)) return fresh(b.whenTrue) && fresh(b.whenFalse);
        if (ts.isCallExpression(b)) return /\.slice\(\)$|\.map\(|^Array\.from\(/.test(b.getText());
        if (ts.isIdentifier(b) && fn !== null) {
          const d = descendantsOf(fn).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === b.text);
          return d !== undefined && d.initializer !== undefined && ts.isArrayLiteralExpression(bare(d.initializer));
        }
        return false;
      };
      const pressable = propOf(obj, 'pressable');
      if (pressable === undefined || !fresh(pressable)) fail('Y14', `${where(routes, obj)}: reply.pressable is ${J(pressable?.getText() ?? null)}; it is a fresh array of strings, never the reader's own array`);
    }
    const handed = existsSync(routes) && nodesOf(routes).some((n) => (ts.isPropertyAssignment(n) && memberName(n) === 'reply') || (ts.isShorthandPropertyAssignment(n) && n.name.text === 'reply'));
    if (!handed) fail('Y14', `${rel(routes)}: /v1/session's answer sets no reply field, so the press and the box are drawn nowhere`);
  }

  // -------------------------------------------------------------------------
  // Y15, NOTHING STRIPS, TRIMS OR NORMALIZES A MESSAGE.
  // -------------------------------------------------------------------------
  {
    for (const name of ['text-rules', 'writer']) {
      const file = name === 'writer' ? writer : replyModule(name, 'Y15');
      if (file === null) continue;
      for (const c of callsOf(file)) {
        if (!ts.isPropertyAccessExpression(c.expression)) continue;
        const m = c.expression.name.text;
        if (!/^(?:replace|replaceAll|trim|trimStart|trimEnd|normalize|slice|substring|substr|toWellFormed)$/.test(m)) continue;
        const recv = c.expression.expression.getText();
        checked('Y15');
        if (/(?:^|\.)text$|\btext\b/.test(recv)) fail('Y15', `${where(file, c)} calls .${m}( on ${J(recv)}. A message is exactly his bytes: nothing is stripped, trimmed or normalized, ever; what Tortie does not send is refused, with its sentence (§5.5)`);
      }
    }
    const decls = [];
    for (const file of productionSources()) {
      if (!readFileSync(file, 'utf8').includes('REPLY_TEXT_MAX_BYTES')) continue;
      for (const n of nodesOf(file)) if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'REPLY_TEXT_MAX_BYTES') decls.push(where(file, n));
    }
    checked('Y15');
    if (decls.length !== 1) fail('Y15', `REPLY_TEXT_MAX_BYTES is declared ${String(decls.length)} time(s) (${decls.join(', ') || 'nowhere'}); once, in src/main/reply/text-rules.ts`);
  }

  // -------------------------------------------------------------------------
  // Y16, THE OPTIONAL FIELDS, AND THE FROZEN EMPTY OFFER.
  // -------------------------------------------------------------------------
  {
    const routes = join(DOMAIN, 'routes.ts');
    const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
    const facts = existsSync(routes) ? interfaceOf(routes, 'PocketFacts') : null;
    const replyOffer = facts?.members.find((m) => memberName(m) === 'replyOffer');
    checked('Y16', 3);
    if (replyOffer === undefined || replyOffer.questionToken === undefined) fail('Y16', `${rel(routes)}: PocketFacts.replyOffer is ${replyOffer === undefined ? 'absent' : 'required'}; it is optional, and absent reads POCKET_NO_REPLY, because the push seam's and the tests' facts offer no reply`);
    const detail = existsSync(contract) ? interfaceOf(contract, 'PocketSessionDetail') : null;
    const reply = detail?.members.find((m) => memberName(m) === 'reply');
    if (reply === undefined || reply.questionToken === undefined) fail('Y16', `src/shared/ipc/pocket.ts: PocketSessionDetail.reply is ${reply === undefined ? 'absent' : 'required'}; it is optional, and absent reads POCKET_NO_REPLY on both sides`);
    const none = existsSync(contract) ? constNamed(contract, 'POCKET_NO_REPLY') : null;
    const init = none === null ? undefined : bare(none.initializer);
    const frozen = init !== undefined && ts.isCallExpression(init) && init.expression.getText() === 'Object.freeze';
    if (!frozen) fail('Y16', 'src/shared/ipc/pocket.ts: POCKET_NO_REPLY is not Object.freeze(…); the empty offer every refusal reads cannot be edited at run time');
    else {
      const obj = bare(init.arguments[0]);
      const pressable = obj !== undefined && ts.isObjectLiteralExpression(obj) ? propOf(obj, 'pressable') : undefined;
      const fr = pressable !== undefined && ts.isCallExpression(bare(pressable)) && bare(pressable).expression.getText() === 'Object.freeze';
      checked('Y16');
      if (!fr) fail('Y16', 'src/shared/ipc/pocket.ts: POCKET_NO_REPLY.pressable is not a frozen empty array; one push onto it would make every refused session pressable');
    }
  }

  // -------------------------------------------------------------------------
  // Y17, PANE REPORTS MOVE NOTHING (§Revision R14).
  // -------------------------------------------------------------------------
  {
    const host = join(ROOT, 'src', 'main', 'attach', 'attach-host.ts');
    checked('Y17', 3);
    if (!existsSync(host)) {
      fail('Y17', 'src/main/attach/attach-host.ts does not exist');
    } else {
      const calls = callsOf(host).filter((c) => calleeName(c) === 'onInput' && ts.isPropertyAccessExpression(c.expression) && /(?:^|\.)(?:opts|options)$/.test(c.expression.expression.getText()));
      if (calls.length !== 1) fail('Y17', `${rel(host)} calls onInput ${String(calls.length)} time(s); exactly once, in the input listener, after the write (D23)`);
      for (const c of calls) {
        if (c.questionDotToken === undefined) fail('Y17', `${where(host, c)}: onInput is called without ?.; it is optional, and a host built without it types exactly as today`);
        const g = guardingIf(c);
        const cond = g?.expression.getText() ?? '';
        const fnOf = (() => {
          for (let p = c.parent; p !== undefined; p = p.parent) if (ts.isFunctionLike(p)) return p;
          return null;
        })();
        const write = fnOf === null ? undefined : descendantsOf(fnOf).find((n) => ts.isCallExpression(n) && calleeName(n) === 'write' && /pty$/.test(ts.isPropertyAccessExpression(n.expression) ? n.expression.expression.getText() : ''));
        const data = write?.arguments[0]?.getText() ?? null;
        if (!/\.machine\s*===\s*undefined/.test(cond)) fail('Y17', `${where(host, c)}: onInput is not guarded by req.machine === undefined; a keystroke on another machine's session never moves this Mac's question id`);
        if (data === null || !new RegExp(`!\\s*isPaneReport\\(\\s*${data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`).test(cond)) fail('Y17', `${where(host, c)}: onInput is not guarded by !isPaneReport( of the very chunk written (${J(data)}); a focus report, a colour report or a device-attributes answer would clear a waiting Claude dialog's question for good (§Revision R14)`);
        if (write === undefined || write.getStart() > c.getStart()) fail('Y17', `${where(host, c)}: onInput is not after client.pty.write(; the write is forwarded exactly as today and the id moves in the same synchronous handler`);
      }
    }
    const shared = join(ROOT, 'src', 'shared', 'pane-report.ts');
    const want = ['isPaneReport', 'isFocusReport', 'isColorReport', 'isDeviceReport'];
    const declared = new Map(want.map((w) => [w, []]));
    for (const file of productionSources()) {
      const src = readFileSync(file, 'utf8');
      if (!want.some((w) => src.includes(w))) continue;
      for (const n of nodesOf(file)) {
        const name = (ts.isFunctionDeclaration(n) && n.name !== undefined ? n.name.text : null) ?? (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isArrowFunction(bare(n.initializer)) || ts.isFunctionExpression(bare(n.initializer))) ? n.name.text : null);
        if (name !== null && declared.has(name)) declared.get(name).push(file);
      }
    }
    for (const [name, files] of declared) {
      checked('Y17');
      if (files.length !== 1 || files[0] !== shared) fail('Y17', `${name} is declared in ${J(files.map(rel))}; it is declared once, in src/shared/pane-report.ts, and the renderer's four files re-export it, so the attach host's filter and the renderer's reader are one predicate`);
    }
  }

  // -------------------------------------------------------------------------
  // Y18, A MESSAGE ONLY WHILE THE AGENT READS IDLE (his ruling 4, §Revision R15).
  // -------------------------------------------------------------------------
  {
    let idleCompared = 0;
    for (const name of ['gate', 'reader', 'writer']) {
      const file = name === 'writer' ? writer : name === 'reader' ? reader : join(REPLY_DIR, 'gate.ts');
      if (file === null || !existsSync(file)) continue;
      for (const { node, text } of codeStringsOf(file)) {
        checked('Y18');
        if (text === 'working' || text === 'busy') fail('Y18', `${where(file, node)} spells ${J(text)}. A message is offered and sent only while the agent's own reader reads idle; a working agent draws a permission question at a moment of its own, and the paste's Return would approve it (his ruling of 2026-10-02, "Only when idle at its prompt"; §Revision R15)`);
      }
      for (const n of nodesOf(file)) {
        if (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || n.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) && [n.left, n.right].some((s) => ts.isStringLiteralLike(s) && s.text === 'idle') && [n.left, n.right].some((s) => /\.state$/.test(s.getText()))) idleCompared += 1;
      }
    }
    checked('Y18');
    if (idleCompared === 0) fail('Y18', 'src/main/reply compares no native reading\'s .state with \'idle\', so what makes a session sayable is not the agent\'s own reader reading idle (D14)');
    // The OFFER's canSay asks the same: its value, or the local function it
    // calls, compares the native reading's .state with 'idle' itself.
    const idleIn = (file, node) => descendantsOf(node).some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && [n.left, n.right].some((x) => ts.isStringLiteralLike(x) && x.text === 'idle') && [n.left, n.right].some((x) => /\.state$/.test(x.getText())));
    let offers = 0;
    for (const file of [reader, writer].filter((f) => f !== null)) {
      for (const p of nodesOf(file).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'canSay')) {
        const v = bare(p.initializer);
        if (v === undefined || v.kind === ts.SyntaxKind.FalseKeyword) continue;
        offers += 1;
        checked('Y18');
        const helper = ts.isCallExpression(v) && ts.isIdentifier(v.expression) ? oneFunction(file, v.expression.text) : null;
        if (!(idleIn(file, v) || (helper !== null && idleIn(file, helper)))) fail('Y18', `${where(file, p)}: the offer's canSay is ${J(v.getText().slice(0, 60))}, which compares no native reading's .state with 'idle'; the box is drawn only while the agent's own reader reads idle (D14)`);
      }
    }
    checked('Y18');
    if (reader !== null && offers === 0) fail('Y18', `${rel(reader)} sets no canSay that is not false, so the offer's message half cannot be read`);
  }
}

// ---------------------------------------------------------------------------
// O2, O3 — the sessions answer (Phase 316.7, build/p3167/SPEC.md §8.1)
// ---------------------------------------------------------------------------

/**
 * THE SESSIONS ANSWER IS MAIN'S AND IT IS BOUNDED. `GET /v1/sessions` is the
 * first read on a door that faces the internet whose answer is shaped by words
 * the phone sends, and the first that can carry every session Tortie lists
 * rather than the waiting ones and 200 more. Each clause below is one line a
 * later round can take back with every other gate green: a second read of the
 * list, a cap re-spelled, a clip that splits a surrogate pair, a cut that drops
 * a session waiting on him while an idle one is drawn (§15 F2), a creation
 * clock drawn as a wait (§15 F1), a choice offered that the query refuses (§15
 * F8), a filter that disagrees with its own groups (§15 F9).
 *
 * WHAT "THE ANSWER" IS, READ. The `sessions` member `createPocketRoutes`
 * returns, and every function of routes.ts it reaches BY NAME, transitively:
 * a helper the door builder factors out is read as part of the answer, and a
 * function the answer never reaches (`blocked`, `rowOf`, `refresh`) is not.
 * The query reader is the part reached from `readSessionsQuery`, and the
 * order rules (O2k) never read through it, because the words it answers are
 * what those rules look for.
 *
 * HOW A NAME IS FOLLOWED. Lexically, the way the language binds it: the
 * nearest enclosing parameter, loop variable, block-scoped declaration or
 * function. A value is then read through its initializer AND through every
 * write to it (`xs.push(…)`, `m.set(…)`, `s.add(…)`, `x = …`), with the loop it
 * is written inside, because `const rows = []` says nothing of where the rows
 * came from and the loop that fills it says everything.
 */

/** Every function-like declaration of routes.ts, by the name it is called with. */
function localFunctionsOf(file) {
  const out = new Map();
  for (const node of nodesOf(file)) {
    let name = null;
    let fn = null;
    if (ts.isFunctionDeclaration(node) && node.name !== undefined && node.body !== undefined) {
      name = node.name.text;
      fn = node;
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      let init = node.initializer;
      while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) init = init.expression;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        name = node.name.text;
        fn = init;
      }
    }
    if (name === null) continue;
    if (!out.has(name)) out.set(name, []);
    out.get(name).push(fn);
  }
  return out;
}

/** Every node under a root, the root included. */
function subtree(root) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(root);
  return out;
}

/** Whether a binding name (an identifier or a pattern) binds `name`. */
function bindsName(bindingName, name) {
  if (bindingName === undefined) return false;
  if (ts.isIdentifier(bindingName)) return bindingName.text === name;
  if (ts.isObjectBindingPattern(bindingName) || ts.isArrayBindingPattern(bindingName)) {
    return bindingName.elements.some((el) => !ts.isOmittedExpression(el) && bindsName(el.name, name));
  }
  return false;
}

/** An identifier that is a REFERENCE: not a property name, not a declaration's own name. */
function isReference(n) {
  const p = n.parent;
  if (p === undefined) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === n) return false;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)) && p.name === n) return false;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isBindingElement(p)) && p.name === n) return false;
  if (ts.isBindingElement(p) && p.propertyName === n) return false;
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isTypeReferenceNode(p) || ts.isQualifiedName(p)) return false;
  return true;
}

/**
 * What a reference names, lexically: `{ kind: 'var', decl, init }`, `{ kind:
 * 'param', param }`, `{ kind: 'loop', decl, walks }`, `{ kind: 'fn', fn }`, or
 * null for an import or a global.
 */
function resolveName(id) {
  const name = id.text;
  for (let a = id.parent; a !== undefined; a = a.parent) {
    if (ts.isFunctionLike(a) && a.parameters !== undefined) {
      const param = a.parameters.find((p) => bindsName(p.name, name));
      if (param !== undefined) return { kind: 'param', param };
    }
    if ((ts.isForOfStatement(a) || ts.isForInStatement(a)) && ts.isVariableDeclarationList(a.initializer)) {
      const decl = a.initializer.declarations.find((d) => bindsName(d.name, name));
      if (decl !== undefined) return { kind: 'loop', decl, walks: a.expression };
    }
    if (ts.isForStatement(a) && a.initializer !== undefined && ts.isVariableDeclarationList(a.initializer)) {
      const decl = a.initializer.declarations.find((d) => bindsName(d.name, name));
      if (decl !== undefined) return { kind: 'var', decl, init: decl.initializer ?? null };
    }
    if (ts.isBlock(a) || ts.isSourceFile(a) || ts.isModuleBlock(a) || ts.isCaseClause(a) || ts.isDefaultClause(a)) {
      for (const st of a.statements) {
        if (ts.isVariableStatement(st)) {
          const decl = st.declarationList.declarations.find((d) => bindsName(d.name, name));
          if (decl !== undefined) return { kind: 'var', decl, init: decl.initializer ?? null };
        }
        if (ts.isFunctionDeclaration(st) && st.name?.text === name && st.body !== undefined) return { kind: 'fn', fn: st };
      }
    }
  }
  return null;
}

/** The function a reference names, when it names one: a declaration or a function-valued const. */
function functionNamed(id) {
  const r = resolveName(id);
  if (r === null) return null;
  if (r.kind === 'fn') return r.fn;
  if (r.kind === 'var' && r.init !== null) {
    const init = unwrap(r.init);
    if (init !== undefined && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) return init;
  }
  return null;
}

/**
 * The roots reached from `start` by name: `start` itself, then every function
 * of the file a reference in it names (a call, or a function handed on as a
 * value), transitively. Answers the function-like nodes, `start` first.
 */
function reachedFrom(start, skip = new Set()) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const fn = queue.shift();
    for (const n of subtree(fn)) {
      if (!ts.isIdentifier(n) || !isReference(n)) continue;
      const target = functionNamed(n);
      if (target === null || seen.has(target) || skip.has(target)) continue;
      seen.add(target);
      queue.push(target);
    }
  }
  return [...seen];
}

const O_RULES = ['O2a', 'O2b', 'O2c', 'O2d', 'O2e', 'O2f', 'O2g', 'O2h', 'O2i', 'O2j', 'O2k', 'O2l', 'O2m', 'O3'];

/** The sessions member and what it reaches, or null with every O rule failed by name. */
function sessionsAnswer(routes) {
  const member = returnedMethod(routes, 'createPocketRoutes', 'sessions');
  if (member === null) {
    for (const id of O_RULES) {
      fail(id, `${rel(routes)}: createPocketRoutes answers no sessions member this rule can read. GET /v1/sessions is composed THERE (build/p3167/SPEC.md §6.2), and a gate that passed with no composer would go green on the day the route answers nothing.`);
    }
    return null;
  }
  const readers = functionsNamed(routes, 'readSessionsQuery');
  const readerRoots = readers.length === 0 ? [] : reachedFrom(readers[0]);
  const readerNodes = new Set(readerRoots.flatMap((r) => subtree(r)));
  const roots = reachedFrom(member);
  const nodes = [...new Set(roots.flatMap((r) => subtree(r)))];
  return { member, roots, nodes, readers, readerRoots: new Set(readerRoots), readerNodes };
}

function unwrap(e) {
  let x = e;
  while (x !== undefined && x !== null && (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || (ts.isSatisfiesExpression !== undefined && ts.isSatisfiesExpression(x)))) x = x.expression;
  return x;
}

/** The property of an object literal by name, as its value expression (a shorthand answers its identifier). */
function propValue(obj, name) {
  for (const p of obj.properties) {
    if (memberName(p) !== name) continue;
    if (ts.isPropertyAssignment(p)) return p.initializer;
    if (ts.isShorthandPropertyAssignment(p)) return p.name;
  }
  return null;
}
const hasProps = (obj, names) => names.every((n) => obj.properties.some((p) => memberName(p) === n));

/** The writes to a declared value inside `scope`: what each write hands it, and the loops it sits in. */
function writesTo(decl, scope) {
  const out = [];
  for (const n of scope) {
    if (!ts.isIdentifier(n) || !isReference(n)) continue;
    const r = resolveName(n);
    if (r === null || (r.kind !== 'var' && r.kind !== 'loop') || r.decl !== decl) continue;
    const p = n.parent;
    let handed = [];
    let at = null;
    if (ts.isPropertyAccessExpression(p) && p.expression === n && ['push', 'unshift', 'set', 'add', 'splice'].includes(p.name.text) && p.parent !== undefined && ts.isCallExpression(p.parent) && p.parent.expression === p) {
      handed = [...p.parent.arguments];
      at = p.parent;
    } else if (ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      handed = [p.right];
      at = p;
    }
    if (at === null) continue;
    // The loops and the conditions the write sits in, up to the declaration.
    for (let a = at.parent; a !== undefined && a !== decl.parent; a = a.parent) {
      if (ts.isForOfStatement(a) || ts.isForInStatement(a)) handed.push(a.expression);
      if (ts.isIfStatement(a)) handed.push(a.expression);
      if (ts.isCallExpression(a) && ts.isPropertyAccessExpression(a.expression) && a.arguments.some((x) => ts.isArrowFunction(x) || ts.isFunctionExpression(x))) {
        handed.push(a.expression.expression);
      }
    }
    out.push(...handed);
  }
  return out;
}

/**
 * Everything an expression is made from: every name in it followed to its
 * initializer and its writes, and every function of the file it calls followed
 * into its body, transitively — but never into the query reader, whose words
 * are what the order rules look for. Answers the nodes.
 */
function derivation(answer, expr) {
  const seen = new Set();
  const out = [];
  const queue = [expr];
  while (queue.length > 0) {
    const root = queue.shift();
    if (root === undefined || root === null || seen.has(root)) continue;
    seen.add(root);
    for (const n of subtree(root)) {
      if (answer.readerNodes.has(n)) continue;
      out.push(n);
      if (!ts.isIdentifier(n) || !isReference(n)) continue;
      const r = resolveName(n);
      if (r === null) continue;
      if (r.kind === 'fn') {
        if (!answer.readerRoots.has(r.fn)) queue.push(r.fn);
      } else if (r.kind === 'var') {
        const init = unwrap(r.init);
        if (init !== undefined && init !== null && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && answer.readerRoots.has(init)) continue;
        queue.push(r.init);
        queue.push(...writesTo(r.decl, answer.nodes));
      } else if (r.kind === 'loop') {
        queue.push(r.walks);
      }
    }
  }
  return out;
}

/** A property READ named `name` that is not the callee of a call: `asked.sort`, never `xs.sort(`. */
const readsWord = (nodes, name) =>
  nodes.some(
    (n) =>
      ts.isPropertyAccessExpression(n) &&
      n.name.text === name &&
      !(n.parent !== undefined && ts.isCallExpression(n.parent) && n.parent.expression === n)
  );
const callsNamed = (nodes, name) => nodes.filter((n) => ts.isCallExpression(n) && calleeName(n) === name);

/** The answer's own object literal: the one that carries asked, rows, groups and total. */
function answerLiteral(answer) {
  return answer.nodes.find((n) => ts.isObjectLiteralExpression(n) && hasProps(n, ['asked', 'rows', 'groups', 'total'])) ?? null;
}

/** The identifier an answer property holds, or null. */
function propIdentifier(obj, name) {
  const v = unwrap(propValue(obj, name) ?? undefined);
  return v !== undefined && v !== null && ts.isIdentifier(v) ? v.text : null;
}

/** Every loop (or array method's callback) under a set of nodes, with what it walks. */
function loopsIn(nodes) {
  const out = [];
  for (const n of nodes) {
    if (ts.isForOfStatement(n) || ts.isForInStatement(n)) {
      out.push({ node: n, body: n.statement, walks: n.expression });
    } else if (ts.isForStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) {
      // An index loop walks the array it indexes: `xs[i]` in its body.
      const indexed = subtree(n.statement).find((m) => ts.isElementAccessExpression(m) && ts.isIdentifier(unwrap(m.expression)));
      out.push({ node: n, body: n.statement, walks: indexed === undefined ? null : indexed.expression });
    } else if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ['forEach', 'some', 'every', 'find', 'filter', 'map', 'reduce', 'flatMap'].includes(n.expression.name.text) &&
      n.arguments.some((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a))
    ) {
      const cb = n.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
      out.push({ node: n, body: cb.body, walks: n.expression.expression });
    }
  }
  return out;
}

/** Whether a root reaches a call named `name`, directly or through a function of the file it calls. */
const reachesCall = (root, name) => reachedFrom(root).some((fn) => callsNamed(subtree(fn), name).length > 0) || callsNamed(subtree(root), name).length > 0;

/** The interface or type a declaration is annotated with, by name, or null. */
function annotatedType(r) {
  const node = r === null ? null : r.kind === 'param' ? r.param : r.kind === 'var' || r.kind === 'loop' ? r.decl : null;
  const type = node?.type;
  return type !== undefined && ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName) ? type.typeName.text : null;
}

/** Every object literal of the file written AS a type: annotated, asserted or returned as it. */
function literalsOfType(file, typeName) {
  const out = [];
  const isType = (t) => t !== undefined && ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && t.typeName.text === typeName;
  for (const n of nodesOf(file)) {
    if (ts.isVariableDeclaration(n) && isType(n.type) && n.initializer !== undefined) {
      const init = unwrap(n.initializer);
      if (ts.isObjectLiteralExpression(init)) out.push(init);
    }
    if ((ts.isAsExpression(n) || (ts.isSatisfiesExpression !== undefined && ts.isSatisfiesExpression(n))) && isType(n.type)) {
      const inner = unwrap(n.expression);
      if (ts.isObjectLiteralExpression(inner)) out.push(inner);
    }
    if (ts.isFunctionLike(n) && isType(n.type) && n.body !== undefined) {
      for (const m of subtree(n.body)) {
        if (ts.isReturnStatement(m) && m.expression !== undefined && ts.isObjectLiteralExpression(unwrap(m.expression))) out.push(unwrap(m.expression));
      }
      if (!ts.isBlock(n.body) && ts.isObjectLiteralExpression(unwrap(n.body))) out.push(unwrap(n.body));
    }
  }
  return out;
}

/**
 * Whether an expression is CLIPPED: the one clip called on it, a function of
 * the file that calls the one clip, null, a choice between clipped values, a
 * name whose value is clipped, or a property of a value whose type's every
 * literal clips that property and every write to it does too.
 */
function clipped(file, answer, expr, depth = 0) {
  const e = unwrap(expr);
  if (e === undefined || e === null || depth > 8) return false;
  if (e.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isConditionalExpression(e)) return clipped(file, answer, e.whenTrue, depth + 1) && clipped(file, answer, e.whenFalse, depth + 1);
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    return clipped(file, answer, e.left, depth + 1) && clipped(file, answer, e.right, depth + 1);
  }
  if (ts.isCallExpression(e)) {
    if (calleeName(e) === 'clipSessionText') return true;
    if (ts.isIdentifier(e.expression)) {
      const fn = functionNamed(e.expression);
      return fn !== null && callsNamed(subtree(fn), 'clipSessionText').length > 0;
    }
    return false;
  }
  if (ts.isIdentifier(e)) {
    const r = resolveName(e);
    if (r === null || r.kind !== 'var' || r.init === null) return false;
    return clipped(file, answer, r.init, depth + 1) && writesTo(r.decl, answer.nodes).every((w) => clipped(file, answer, w, depth + 1));
  }
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) {
    const prop = e.name.text;
    const r = resolveName(e.expression);
    const writes = answer.nodes
      .filter((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.name.text === prop)
      .map((n) => n.right);
    if (!writes.every((w) => clipped(file, answer, w, depth + 1))) return false;
    // A value whose initializer is one object literal.
    if (r !== null && r.kind === 'var' && r.init !== null && ts.isObjectLiteralExpression(unwrap(r.init))) {
      const v = propValue(unwrap(r.init), prop);
      return v !== null && clipped(file, answer, v, depth + 1);
    }
    // A value of a type declared here: every literal of that type clips it.
    const typeName = annotatedType(r);
    if (typeName === null) return false;
    const lits = literalsOfType(file, typeName);
    return lits.length > 0 && lits.every((lit) => {
      const v = propValue(lit, prop);
      return v !== null && clipped(file, answer, v, depth + 1);
    });
  }
  return false;
}

/** Names bound to `facts.<member>()` in the answer, e.g. the stamp map, as their declarations. */
function boundTo(answer, member) {
  const out = new Set();
  for (const n of answer.nodes) {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.initializer === undefined) continue;
    const init = unwrap(n.initializer);
    if (ts.isCallExpression(init) && ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === member && init.expression.expression.getText() === 'facts') {
      out.add(n);
    }
  }
  return out;
}

/** Whether a file imports `name` from a specifier `test` accepts. */
function importsName(file, name, test) {
  return nodesOf(file).some(
    (n) =>
      ts.isImportDeclaration(n) &&
      ts.isStringLiteral(n.moduleSpecifier) &&
      test(n.moduleSpecifier.text) &&
      n.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(n.importClause.namedBindings) &&
      n.importClause.namedBindings.elements.some((el) => (el.propertyName ?? el.name).text === name)
  );
}

/** The reads of an identifier in a file: every reference but its import binding. */
function readsOfName(file, name) {
  return nodesOf(file).filter((n) => ts.isIdentifier(n) && n.text === name && isReference(n));
}

/** A numeric literal or a product of them, as a number; null for anything else. */
function constantValue(e) {
  const x = unwrap(e);
  if (x === undefined || x === null) return null;
  if (ts.isNumericLiteral(x)) return Number(x.text.replace(/_/g, ''));
  if (ts.isBinaryExpression(x)) {
    const a = constantValue(x.left);
    const b = constantValue(x.right);
    if (a === null || b === null) return null;
    if (x.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return a * b;
    if (x.operatorToken.kind === ts.SyntaxKind.AsteriskAsteriskToken) return a ** b;
    if (x.operatorToken.kind === ts.SyntaxKind.LessThanLessThanToken) return a << b;
  }
  return null;
}

/**
 * Whether an object a property is read off is a SESSION: named `session` or
 * `s`, a `.session` of something, or a name declared as a `Session` or walked
 * out of a list of sessions.
 */
function isSessionObject(e) {
  const x = unwrap(e);
  if (x === undefined || x === null) return false;
  if (ts.isPropertyAccessExpression(x)) return x.name.text === 'session';
  if (!ts.isIdentifier(x)) return false;
  if (x.text === 'session' || x.text === 's') return true;
  const r = resolveName(x);
  if (annotatedType(r) === 'Session') return true;
  if (r !== null && r.kind === 'loop') return /sessions/i.test(r.walks.getText());
  return false;
}

function sessionsAnswerRules() {
  const routes = moduleNamed('routes', 'O2a', "Phase 316.7 builder door's (src/main/pocket/routes.ts)");
  if (routes === null) {
    for (const id of O_RULES.filter((r) => r !== 'O2a')) fail(id, 'src/main/pocket/routes.ts does not exist, so this rule read nothing');
    return;
  }
  const answer = sessionsAnswer(routes);
  if (answer === null) return;
  const sf = astOf(routes);
  const text = (n) => n.getText(sf);
  const contract = (spec) => /shared\/ipc\/pocket$/.test(spec);

  // (a) Synchronous: no async modifier, no await anywhere it reaches.
  checked('O2a', 2);
  const asyncMember = (answer.member.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
  if (asyncMember) fail('O2a', `${where(routes, answer.member)}: sessions is async. The answer is composed synchronously on main from what main already holds (§6.2 step 3), so a read cannot wait on anything a Remove can change under it.`);
  for (const n of answer.nodes) {
    if (ts.isAwaitExpression(n) || ((ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) && (n.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword))) {
      fail('O2a', `${where(routes, n)}: the sessions answer awaits (or declares an async function) here. Nothing it composes is awaited.`);
      break;
    }
  }

  // (b) One read of the list.
  const listReads = answer.nodes.filter(
    (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'sessions' && text(n.expression.expression) === 'facts'
  );
  checked('O2b');
  if (listReads.length !== 1) {
    fail('O2b', `${where(routes, answer.member)}: the sessions answer reads facts.sessions() ${String(listReads.length)} time(s). Every row, group, count and total is cut from ONE read, or a session that moves between two reads is counted in one and drawn in the other.`);
  }

  // (c) The four numbers: imported, read once each, never re-spelled.
  const NUMBERS = [
    ['POCKET_SESSIONS_MAX', 2000],
    ['POCKET_SESSIONS_BUDGET_BYTES', 1_048_576],
    ['POCKET_SESSIONS_CLIP_CHARS', 200],
    ['POCKET_SESSIONS_CHOICES_MAX', 64]
  ];
  const contractFile = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  for (const [name, value] of NUMBERS) {
    checked('O2c', 3);
    if (!existsSync(contractFile) || constNumber(contractFile, name) !== value) {
      fail('O2c', `src/shared/ipc/pocket.ts does not declare ${name} = ${String(value)}, so the phone and the Mac do not read one number (build/p3167/SPEC.md §6.1)`);
    }
    if (!importsName(routes, name, contract)) fail('O2c', `${rel(routes)} does not import ${name} from the contract, so the bound a phone is told and the bound the door applies can drift apart`);
    const reads = readsOfName(routes, name);
    if (reads.length !== 1) fail('O2c', `${rel(routes)} reads ${name} ${String(reads.length)} time(s); it is read ONCE, so there is one place the bound is applied`);
  }
  for (const n of nodesOf(routes)) {
    const v = ts.isNumericLiteral(n) || ts.isBinaryExpression(n) ? constantValue(n) : null;
    if (v === null) continue;
    // A literal inside a product that is itself a re-spelling is reported once, at the product.
    if (ts.isNumericLiteral(n) && n.parent !== undefined && ts.isBinaryExpression(n.parent) && constantValue(n.parent) !== null) continue;
    const hit = NUMBERS.find(([, value]) => value === v);
    checked('O2c');
    if (hit !== undefined) fail('O2c', `${where(routes, n)}: ${text(n)} is ${hit[0]} written a second time. Import it from the contract instead.`);
  }

  // (d) The one clip, and what it clips.
  const clips = functionsNamed(routes, 'clipSessionText');
  checked('O2d', 2);
  if (clips.length !== 1) {
    fail('O2d', `${rel(routes)} declares clipSessionText ${String(clips.length)} time(s); there is ONE clip (D5), or the name and the label are clipped by two rules`);
  } else {
    const inside = subtree(clips[0]);
    const comparesUnit = (value) =>
      inside.some(
        (n) =>
          ts.isBinaryExpression(n) &&
          [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken].includes(n.operatorToken.kind) &&
          [n.left, n.right].some((side) => constantValue(side) === value)
      );
    if (!comparesUnit(0xd800) || !comparesUnit(0xdbff)) {
      fail('O2d', `${where(routes, clips[0])}: clipSessionText does not compare a unit with both 0xD800 and 0xDBFF, so a cut can land between the two halves of a surrogate pair and the phone is handed a lone half`);
    }
    if (!inside.some((n) => ts.isIdentifier(n) && n.text === 'POCKET_SESSIONS_CLIP_CHARS')) {
      fail('O2d', `${where(routes, clips[0])}: clipSessionText does not read POCKET_SESSIONS_CLIP_CHARS, so the clip is not the contract's`);
    }
  }
  const literals = answer.nodes.filter((n) => ts.isObjectLiteralExpression(n));
  const rowLits = literals.filter((o) => hasProps(o, ['sessionId', 'statusDot']));
  const groupLits = literals.filter((o) => hasProps(o, ['collapsed', 'count']));
  const choiceLits = literals.filter((o) => o.properties.length === 2 && hasProps(o, ['id', 'label']));
  const mustClip = [
    ...rowLits.flatMap((o) => [['a row’s name', o, 'name'], ['a row’s machine', o, 'machine']]),
    ...groupLits.flatMap((o) => [['a group’s label', o, 'label'], ['a group’s folder', o, 'folder'], ['a group’s machine', o, 'machine']]),
    ...choiceLits.map((o) => ['a choice’s label', o, 'label'])
  ];
  checked('O2d', 3);
  if (rowLits.length === 0) fail('O2d', `${where(routes, answer.member)}: no row literal (sessionId, statusDot) was read in the sessions answer, so what it clips cannot be read`);
  if (groupLits.length === 0) fail('O2d', `${where(routes, answer.member)}: no group literal (count, collapsed) was read in the sessions answer`);
  if (choiceLits.length === 0) fail('O2d', `${where(routes, answer.member)}: no choice literal ({ id, label }) was read in the sessions answer`);
  for (const [what, obj, prop] of mustClip) {
    checked('O2d');
    const v = propValue(obj, prop);
    if (v === null) {
      fail('O2d', `${where(routes, obj)}: ${what} is missing from its literal`);
    } else if (!clipped(routes, answer, v)) {
      fail('O2d', `${where(routes, v)}: ${what} is ${text(v).slice(0, 80)}, which is not clipped by clipSessionText. Every string main does not already cap is clipped at the one function (D5).`);
    }
  }

  // (e) The answer's omitted.
  const lit = answerLiteral(answer);
  const rowsName = lit === null ? null : propIdentifier(lit, 'rows');
  const groupsName = lit === null ? null : propIdentifier(lit, 'groups');
  checked('O2e', 2);
  if (lit === null || rowsName === null) {
    fail('O2e', `${where(routes, answer.member)}: no answer literal holding asked, rows (a name), groups and total was read, so omitted cannot be read`);
  } else {
    const omitted = unwrap(propValue(lit, 'omitted'));
    const named = omitted !== undefined && omitted !== null && ts.isIdentifier(omitted) ? resolveName(omitted) : null;
    const resolved = named !== null && named.kind === 'var' ? unwrap(named.init) : omitted;
    const isDifference =
      resolved !== undefined &&
      resolved !== null &&
      ts.isBinaryExpression(resolved) &&
      resolved.operatorToken.kind === ts.SyntaxKind.MinusToken &&
      ts.isPropertyAccessExpression(unwrap(resolved.left)) &&
      unwrap(resolved.left).name.text === 'length' &&
      text(unwrap(resolved.right)) === `${rowsName}.length`;
    if (!isDifference) {
      fail('O2e', `${where(routes, lit)}: the answer's omitted is ${omitted === undefined || omitted === null ? 'missing' : text(omitted).slice(0, 80)}; it is the kept count minus ${rowsName}.length, or a phone is told nothing was left out of a list the caps cut`);
    }
  }

  // (f) A row's group index is read off groups where its group is pushed.
  checked('O2f', 2);
  if (groupsName === null) {
    fail('O2f', `${where(routes, answer.member)}: the answer's groups is not a name this rule can follow`);
  } else {
    const readAtPush = answer.nodes.some((n) => {
      if (!(ts.isPropertyAccessExpression(n) && n.name.text === 'length' && text(n.expression) === groupsName)) return false;
      // The statement it sits in, and the block that holds that statement.
      let stmt = n;
      while (stmt.parent !== undefined && !ts.isBlock(stmt.parent) && !ts.isSourceFile(stmt.parent)) stmt = stmt.parent;
      const block = stmt.parent;
      if (block === undefined || !ts.isBlock(block)) return false;
      const at = block.statements.indexOf(stmt);
      return block.statements.slice(at + 1).some((later) => callsNamed(subtree(later), 'push').some((c) => text(c.expression) === `${groupsName}.push`));
    });
    if (!readAtPush) {
      fail('O2f', `${where(routes, answer.member)}: no ${groupsName}.length is read in the block that pushes the group, before the push. A row's group is that index, or a row names a group that is not the one drawn over it.`);
    }
    for (const o of literals.filter((x) => propValue(x, 'group') !== null && (hasProps(x, ['sessionId']) || x.properties.some((p) => ts.isSpreadAssignment(p))))) {
      const v = propValue(o, 'group');
      const lengths = subtree(v).filter((m) => ts.isPropertyAccessExpression(m) && m.name.text === 'length');
      if (lengths.some((m) => text(m.expression) !== groupsName)) {
        fail('O2f', `${where(routes, v)}: a row's group is ${text(v).slice(0, 60)}, a length of something that is not ${groupsName}`);
      }
    }
  }

  // (g) The query reader.
  checked('O2g', 4);
  if (answer.readers.length !== 1) {
    fail('O2g', `${rel(routes)} declares readSessionsQuery ${String(answer.readers.length)} time(s); the query has ONE reader`);
  } else {
    if (!answer.nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'readSessionsQuery')) {
      fail('O2g', `${where(routes, answer.member)}: the sessions answer never calls readSessionsQuery(, so the words it composes for were read by something else`);
    }
    const readerNodes = [...answer.readerNodes];
    for (const list of ['POCKET_SESSIONS_SHOW', 'POCKET_SESSIONS_GROUP', 'POCKET_SESSIONS_SORT']) {
      if (!readerNodes.some((n) => ts.isIdentifier(n) && n.text === list) || !importsName(routes, list, contract)) {
        fail('O2g', `${where(routes, answer.readers[0])}: the reader does not compare with the contract's ${list}, so the words it takes and the words the phone sends are two lists`);
      }
    }
    if (!readerNodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'isSessionsId')) {
      fail('O2g', `${where(routes, answer.readers[0])}: the reader never calls isSessionsId(, so an id is not read one character at a time`);
    }
    for (const n of readerNodes) {
      const pattern =
        n.kind === ts.SyntaxKind.RegularExpressionLiteral ||
        (ts.isCallExpression(n) && ['test', 'match', 'exec', 'matchAll'].includes(calleeName(n) ?? '') && ts.isPropertyAccessExpression(n.expression)) ||
        ((ts.isCallExpression(n) || ts.isNewExpression(n)) && ts.isIdentifier(n.expression) && n.expression.text === 'RegExp');
      if (pattern) fail('O2g', `${where(routes, n)}: the query reader holds ${text(n).slice(0, 60)}. A word is compared for equality and an id is read one character at a time; a pattern is the thing a closed reader refuses (R1's reason).`);
    }
  }
  const ids = functionsNamed(routes, 'isSessionsId');
  checked('O2g');
  if (ids.length === 1) {
    const walk = subtree(ids[0]);
    const loops = walk.some((n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n));
    const perChar = walk.some((n) => ts.isCallExpression(n) && ['charAt', 'charCodeAt', 'codePointAt'].includes(calleeName(n) ?? '')) || walk.some((n) => ts.isForOfStatement(n)) || walk.some((n) => ts.isElementAccessExpression(n));
    if (!loops || !perChar) fail('O2g', `${where(routes, ids[0])}: isSessionsId does not read the id one character at a time`);
  }

  // (h) Show is the shared partition, asked with the door's environment.
  checked('O2h', 5);
  if (!importsName(routes, 'lifecycleKeeps', (s) => s === '@shared/session-list')) fail('O2h', `${rel(routes)} does not import lifecycleKeeps from @shared/session-list`);
  if (!importsName(routes, 'sessionActionGates', (s) => s === '@shared/session-gates')) fail('O2h', `${rel(routes)} does not import sessionActionGates from @shared/session-gates`);
  if (!importsName(routes, 'DOOR_GATE_ENV', (s) => s === '@shared/session-gates')) fail('O2h', `${rel(routes)} does not import DOOR_GATE_ENV from @shared/session-gates`);
  const keeps = callsNamed(answer.nodes, 'lifecycleKeeps');
  if (keeps.length === 0) fail('O2h', `${where(routes, answer.member)}: Show never calls lifecycleKeeps(, so the door's Active and the sheet's Active are two rules`);
  const gateCalls = callsNamed(answer.nodes, 'sessionActionGates');
  if (gateCalls.length === 0 || !gateCalls.every((c) => c.arguments.length === 3 && ts.isIdentifier(c.arguments[2]) && c.arguments[2].text === 'DOOR_GATE_ENV')) {
    fail('O2h', `${where(routes, answer.member)}: the sessions answer does not ask sessionActionGates( with DOOR_GATE_ENV at every call`);
  }
  const statuses = (() => {
    const TYPES = join(ROOT, 'src', 'shared', 'types.ts');
    const decl = nodesOf(TYPES).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'SESSION_STATUSES');
    return new Set(decl === undefined ? [] : subtree(decl).filter((n) => ts.isStringLiteral(n)).map((n) => n.text));
  })();
  checked('O2h');
  if (statuses.size < 7) fail('O2h', `SESSION_STATUSES read ${String(statuses.size)} statuses out of src/shared/types.ts; the alphabet has seven`);
  for (const n of answer.nodes) {
    if (!(ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) continue;
    if (!statuses.has(n.text) || n.text === 'needs_input') continue;
    fail('O2h', `${where(routes, n)}: the sessions answer names the status ${JSON.stringify(n.text)}. Show reads the gates' partition and names no status of its own; the one status it names is needs_input, the waiting row's own predicate.`);
  }

  // (i) The groups are the sheet's.
  checked('O2i', 4);
  const fromList = (s) => s === '@shared/session-list';
  const collects = importsName(routes, 'collectSessionGroups', fromList) || importsName(routes, 'sessionGroupIdentity', fromList);
  const collectCalls = callsNamed(answer.nodes, 'collectSessionGroups').length + callsNamed(answer.nodes, 'sessionGroupIdentity').length;
  if (!collects || collectCalls === 0) fail('O2i', `${where(routes, answer.member)}: the groups are not collected by collectSessionGroups( or sessionGroupIdentity( from @shared/session-list, so a door group and a sheet group can be two different sets of sessions`);
  for (const name of ['sessionGroupLabel', 'compareSessionGroups']) {
    if (!importsName(routes, name, fromList) || callsNamed(answer.nodes, name).length === 0) {
      fail('O2i', `${where(routes, answer.member)}: the sessions answer does not call ${name}( from @shared/session-list`);
    }
  }
  for (const n of nodesOf(routes)) {
    if (ts.isIdentifier(n) && n.text === 'targetKey') {
      fail('O2i', `${where(routes, n)}: routes.ts names targetKey. A group's key is the shared identity's, built in one place, and a second key here is the door's own grouping`);
      break;
    }
  }

  // (j) Ages: createdOld around formatAge, and no other formatter.
  checked('O2j', 3);
  if (!importsName(routes, 'createdOld', (s) => s === '@shared/age')) fail('O2j', `${rel(routes)} does not import createdOld from @shared/age`);
  const olds = callsNamed(answer.nodes, 'createdOld');
  if (olds.length === 0) fail('O2j', `${where(routes, answer.member)}: the sessions answer never calls createdOld(, so a creation clock is drawn bare, as if it were a wait or a last output`);
  for (const c of olds) {
    const arg = unwrap(c.arguments[0]);
    if (arg === undefined || !ts.isCallExpression(arg) || calleeName(arg) !== 'formatAge') {
      fail('O2j', `${where(routes, c)}: createdOld( is handed ${arg === undefined ? 'nothing' : text(arg).slice(0, 60)}, not a formatAge( call`);
    }
  }
  for (const c of callsNamed(answer.nodes, 'formatAge')) {
    const first = c.arguments[0];
    if (first === undefined || !subtree(first).some((m) => (ts.isPropertyAccessExpression(m) && m.name.text === 'createdAt') || (ts.isIdentifier(m) && m.text === 'createdAt'))) continue;
    const parent = c.parent;
    const wrapped = parent !== undefined && ts.isCallExpression(parent) && calleeName(parent) === 'createdOld';
    checked('O2j');
    if (!wrapped) fail('O2j', `${where(routes, c)}: a createdAt is aged by formatAge( outside createdOld(, so a creation clock reads as one of the other two`);
  }
  const locals = localFunctionsOf(routes);
  for (const c of answer.nodes.filter((n) => ts.isCallExpression(n))) {
    const name = calleeName(c);
    if (name === null || name === 'formatAge' || name === 'createdOld' || locals.has(name)) continue;
    if (/^age[A-Z]|^age$|Age(?:[A-Z].*)?$/.test(name)) {
      fail('O2j', `${where(routes, c)}: the sessions answer formats an age with ${name}(; formatAge is the one formatter the phone's ages come from`);
    }
  }

  // (k) Choose by priority, emit in display order.
  const loops = loopsIn(answer.nodes);
  const cuts = loops.filter((l) => reachesCall(l.body, 'byteLength'));
  const emits = rowsName === null ? [] : loops.filter((l) => callsNamed(subtree(l.body), 'push').some((c) => text(c.expression) === `${rowsName}.push`));
  checked('O2k', 4);
  if (cuts.length === 0) {
    fail('O2k', `${where(routes, answer.member)}: no loop in the sessions answer measures a row with byteLength(, so nothing holds it to POCKET_SESSIONS_BUDGET_BYTES`);
  }
  if (emits.length === 0) {
    fail('O2k', `${where(routes, answer.member)}: no loop pushes onto ${String(rowsName)}, so the emission order cannot be read`);
  }
  const wordsOf = (nodes) => readsWord(nodes, 'sort') || readsWord(nodes, 'group');
  for (const cut of cuts) {
    if (cut.walks === null || cut.walks === undefined) {
      fail('O2k', `${where(routes, cut.node)}: the loop that measures rows walks nothing this rule can follow`);
      continue;
    }
    const made = derivation(answer, cut.walks);
    const fromAttention = callsNamed(made, 'attentionRows').length > 0;
    const fromOthers = callsNamed(made, 'othersOrder').length > 0;
    if (!fromAttention || !fromOthers) {
      fail('O2k', `${where(routes, cut.node)}: the loop that stops at the caps walks ${text(cut.walks)}, which is not built from attentionRows( and othersOrder(. The caps keep rows in today's priority, waiting first, whatever the words drawn (§15 F2).`);
    }
    if (wordsOf(made)) {
      fail('O2k', `${where(routes, cut.node)}: the loop that stops at the caps walks ${text(cut.walks)}, which reads the sort or group word. It walks the DISPLAY order, so under Project, Name or Oldest first a session waiting on him in a late group falls past the cap while idle rows are drawn (§15 F2).`);
    }
    for (const emit of emits) {
      if (emit.walks !== null && emit.walks !== undefined && text(emit.walks) === text(cut.walks)) {
        fail('O2k', `${where(routes, cut.node)}: the cut and the emission walk one order, ${text(cut.walks)}; the cut chooses in the priority and the rows leave in the order the words ask for`);
      }
    }
  }
  for (const emit of emits) {
    if (emit.walks === null || emit.walks === undefined || !wordsOf(derivation(answer, emit.walks))) {
      fail('O2k', `${where(routes, emit.node)}: the loop that fills ${String(rowsName)} walks an order that reads neither the sort nor the group word, so the rows do not leave in the order he asked for`);
    }
  }
  // A group's omitted: its kept rows minus its chosen rows.
  const groupOmitted = [
    ...groupLits.map((o) => propValue(o, 'omitted')).filter((v) => v !== null),
    ...answer.nodes
      .filter((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.name.text === 'omitted')
      .map((n) => n.right)
  ].map((v) => unwrap(v));
  const minus = (v) => v !== undefined && ts.isBinaryExpression(v) && v.operatorToken.kind === ts.SyntaxKind.MinusToken;
  checked('O2k');
  if (groupLits.length > 0 && !groupOmitted.some(minus)) {
    fail('O2k', `${where(routes, groupLits[0])}: a group's omitted is never its kept rows minus its chosen rows, so a header can count fifty over ten rows with nothing beside it to say so (§15 F4)`);
  }

  // (l) No since of an attentionRows row is drawn; the stamp map is.
  checked('O2l', 2);
  for (const n of answer.nodes) {
    const since =
      (ts.isPropertyAccessExpression(n) && n.name.text === 'since') ||
      (ts.isBindingElement(n) && ((n.propertyName !== undefined && ts.isIdentifier(n.propertyName) && n.propertyName.text === 'since') || (n.propertyName === undefined && ts.isIdentifier(n.name) && n.name.text === 'since')));
    if (since) {
      fail('O2l', `${where(routes, n)}: the sessions answer reads an attentionRows row's since. That since falls back to createdAt (src/main/tray/attention.ts), so it draws a creation clock as a wait, and 20728d for a createdAt of 0 (§15 F1). It orders; it never labels.`);
    }
  }
  const stampDecls = boundTo(answer, 'blockedSince');
  const stampRead = answer.nodes.some((n) => {
    if (!ts.isCallExpression(n) || calleeName(n) !== 'get' || !ts.isPropertyAccessExpression(n.expression) || !ts.isIdentifier(n.expression.expression)) return false;
    const r = resolveName(n.expression.expression);
    return r !== null && r.kind === 'var' && stampDecls.has(r.decl);
  });
  if (stampDecls.size === 0 || !stampRead) {
    fail('O2l', `${where(routes, answer.member)}: no stamp map bound to facts.blockedSince() is read with .get( in the sessions answer, so a waiting row's age is not its wait`);
  }

  // (m) One id reader, used twice; the machine is the identity's.
  const idDecls = functionsNamed(routes, 'isSessionsId');
  checked('O2m', 4);
  if (idDecls.length !== 1) fail('O2m', `${rel(routes)} declares isSessionsId ${String(idDecls.length)} time(s); there is ONE`);
  const composerNodes = answer.nodes.filter((n) => !answer.readerNodes.has(n));
  if (callsNamed([...answer.readerNodes], 'isSessionsId').length === 0) fail('O2m', `${rel(routes)}: the query reader never calls isSessionsId(`);
  // The agent choices are what the answer's `agents` is made from, read
  // through every write to it and the condition each write sits under.
  const agentsValue = lit === null ? null : propValue(lit, 'agents');
  if (agentsValue === null || callsNamed(derivation(answer, agentsValue), 'isSessionsId').length === 0) {
    fail('O2m', `${where(routes, lit ?? answer.member)}: the answer's agents are not made under an isSessionsId( check, so the menu can offer an id the query refuses, and choosing it reads as a Mac older than this phase (§15 F8)`);
  }
  for (const n of composerNodes) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'machine' || !isSessionObject(n.expression)) continue;
    fail('O2m', `${where(routes, n)}: the sessions answer reads ${text(n)}, a session's own machine. The machine a row is on is its group identity's target.machineId, or the filter and the groups disagree for a machine whose id is local (§15 F9).`);
  }
  if (!composerNodes.some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'machineId' && /target$/.test(text(n.expression)))) {
    fail('O2m', `${where(routes, answer.member)}: the sessions answer never reads a target's machineId, so the machine filter is not the groups' own rule`);
  }

  // O3. No conversation.
  checked('O3', 2);
  for (const n of answer.nodes) {
    if (ts.isPropertyAccessExpression(n) && ['refresh', 'catchUp', 'lastTurn', 'turns'].includes(n.name.text) && text(n.expression) === 'facts') {
      fail('O3', `${where(routes, n)}: the sessions answer names facts.${n.name.text}. It reads no conversation: a list of every session is not a reason to read anybody's words.`);
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'refresh') {
      fail('O3', `${where(routes, n)}: the sessions answer calls the refresh, which reads a conversation through the one read path`);
    }
  }
  for (const n of nodesOf(routes)) {
    if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier)) continue;
    const spec = n.moduleSpecifier.text;
    if (!/(^|\/)overview\//.test(spec) || spec.startsWith('@shared/')) continue;
    const names = n.importClause?.namedBindings !== undefined && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements.map((e) => (e.propertyName ?? e.name).text) : ['(default or namespace)'];
    if (spec !== '../overview/turn-view' || names.join(',') !== 'MAX_TURN_LIMIT' || n.importClause?.name !== undefined) {
      fail('O3', `${where(routes, n)}: routes.ts imports ${names.join(', ')} from ${spec}. It keeps MAX_TURN_LIMIT from ../overview/turn-view and nothing else of the overview, so no route composes a conversation it was not asked for.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Z — the Screen (Phase 337, build/p337/SPEC.md §6.1)
// ---------------------------------------------------------------------------

/**
 * THE DOOR GREW A READ THAT HOLDS A REQUEST AND A WRITE THAT TYPES EVERY KEY.
 * `GET /v1/screen` answers one session's own screen, composed in main and held
 * as a long poll; `POST /v1/keys` types into a running session, on this Mac or
 * another machine, through 317's one write path. Every clause below is one
 * line a later round can delete with the phone still drawing a screen and
 * still typing, and they are read with the parser against the names
 * build/p337/SPEC.md §5 pins: `src/main/screen/{keys,watch,read,compose,sgr,
 * cells,cell-widths,palette}.ts`, `src/main/machines/remote-screen.ts`,
 * `TmuxControlClient.handleLine`, `parseKeysBody`, `screenOf`, `SCREEN_LIVE`,
 * `KEYS_LOG_QUIET_MS`, `SCREEN_KEYS_GAP_MS`, `windowMarkOf` and `nudge`.
 *
 * Five builders write these files in one round, and a missing module FAILS
 * the rule that needed it, by name, with its owner: a gate that passed while
 * `src/main/screen/keys.ts` was absent would go green on the day nothing
 * checks a key.
 */
const Z_RULES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12', 'Z13', 'Z14', 'Z15', 'Z16', 'Z17', 'Z18', 'Z19', 'Z20', 'Z21', 'Z22'];
const Z_OWNER = {
  door: "Phase 337 builder door's",
  screen: "Phase 337 builder screen's",
  keys: "Phase 337 builder keys's",
  door3371: "Phase 337.1 builder door's",
  screen3371: "Phase 337.1 builder screen's"
};

/** The page reader (Phase 337.1, build/p3371/SPEC.md §5.3.5). */
const SCROLLBACK = join(ROOT, 'src', 'main', 'screen', 'scrollback.ts');

/**
 * The ONE format (build/p3371/SPEC.md D4): 337's seven fields, then the
 * history size LAST, so the seven keep their places.
 */
const SCREEN_FORMAT_8 = '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}\t#{history_size}';

/**
 * An argv expression as a flat list of element spellings: a string literal
 * as `'text'`, anything else as its source text, with a spread of a local
 * array-returning function (or of a const array) expanded in place, so a
 * composer written as `[...displayArgv(t), ';', …]` reads the same as one
 * written out. Null when the expression is not an argv this can read.
 */
function flatArgvOf(file, expr) {
  const arr = arrayOfArg(file, expr);
  if (arr === null) return null;
  const out = [];
  for (const e of arr.elements) {
    if (ts.isSpreadElement(e)) {
      const inner = flatArgvOf(file, e.expression);
      if (inner === null) return null;
      const fn = ts.isCallExpression(bare(e.expression)) && ts.isIdentifier(bare(e.expression).expression) ? oneFunction(file, bare(e.expression).expression.text) : null;
      // A spread helper's own parameter stands for the argument it was handed.
      const params = fn === null ? [] : fn.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null));
      const args = fn === null ? [] : bare(e.expression).arguments.map((a) => a.getText());
      out.push(...inner.map((x) => {
        const at = params.indexOf(x);
        return at === -1 || args[at] === undefined ? x : args[at];
      }));
      continue;
    }
    out.push(ts.isStringLiteral(e) ? `'${e.text}'` : e.getText());
  }
  return out;
}

/** A file this phase pins, or null with the rule failed by name and owner. */
function zFile(relPath, ruleId, owner) {
  const path = join(ROOT, relPath);
  if (existsSync(path)) return path;
  fail(ruleId, `${relPath} does not exist, so this rule read nothing. It is ${owner} (build/p337/SPEC.md §10). A gate that passed here would go green on the day the Screen does not exist.`);
  return null;
}

/** The numeric value of `const NAME = <literal>` in a file, `_` separators allowed, or null. */
function zNumber(file, name) {
  if (file === null) return null;
  const decls = nodesOf(file).filter((d) => ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === name && d.initializer !== undefined);
  if (decls.length !== 1) return null;
  const init = unwrapped(decls[0].initializer);
  return init !== undefined && ts.isNumericLiteral(init) ? Number(init.text.replace(/_/g, '')) : null;
}

/** How many times a name is DECLARED as a const or a function across a list of files. */
function declarationsOf(files, name) {
  const out = [];
  for (const file of files) {
    for (const n of nodesOf(file)) {
      if ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && n.name.text === name) out.push({ file, n });
    }
  }
  return out;
}

/** Every identifier reference to a name in a file, its declaration and import bindings excluded. */
function referencesOf(file, name) {
  return nodesOf(file).filter((n) => {
    if (!ts.isIdentifier(n) || n.text !== name) return false;
    const p = n.parent;
    if (p !== undefined && (ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p)) && p.name === n) return false;
    if (p !== undefined && (ts.isImportSpecifier(p) || ts.isExportSpecifier(p))) return false;
    if (p !== undefined && ts.isPropertyAccessExpression(p) && p.name === n) return false;
    if (p !== undefined && (ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n) return false;
    return true;
  });
}

/** The names a file imports from a specifier, `type` imports included. */
function importedNames(file, specTest) {
  const out = new Set();
  for (const n of nodesOf(file)) {
    if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier) || !specTest(n.moduleSpecifier.text)) continue;
    const b = n.importClause?.namedBindings;
    if (b !== undefined && ts.isNamedImports(b)) for (const el of b.elements) out.add((el.propertyName ?? el.name).text);
  }
  return out;
}

/** The local functions a root reaches by calling them by name, the root included, transitively. */
function reachedFunctions(file, root) {
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length > 0) {
    const f = queue.shift();
    for (const c of descendantsOf(f).filter((n) => ts.isCallExpression(n))) {
      const name = ts.isIdentifier(c.expression) ? c.expression.text : null;
      if (name === null) continue;
      for (const g of functionsNamed(file, name)) {
        if (!seen.has(g)) {
          seen.add(g);
          queue.push(g);
        }
      }
    }
  }
  return [...seen];
}

/** The verb a factory answers: a method or arrow on its returned object, or a shorthand naming a local function. */
function verbOf(file, factoryName, name) {
  const direct = returnedMethod(file, factoryName, name);
  if (direct !== null) return direct;
  for (const fn of functionsNamed(file, factoryName)) {
    for (const ret of ownReturnsOf(fn)) {
      const e = ret.expression === undefined ? undefined : bare(ret.expression);
      if (e === undefined || !ts.isObjectLiteralExpression(e)) continue;
      for (const p of e.properties) {
        if (ts.isShorthandPropertyAssignment(p) && p.name.text === name) {
          const local = descendantsOf(fn).filter((n) => (ts.isFunctionDeclaration(n) && n.name?.text === name) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer !== undefined && (ts.isArrowFunction(bare(n.initializer)) || ts.isFunctionExpression(bare(n.initializer)))));
          if (local.length === 1) return ts.isVariableDeclaration(local[0]) ? bare(local[0].initializer) : local[0];
        }
      }
    }
  }
  return null;
}

/**
 * The array literal an argv expression is: the literal itself, a const that
 * holds one, or the one array a local function's returns hand back (a builder
 * that composes its argv in a named function is read the same as one that
 * writes it inline). Null when it is none of those.
 */
function arrayOfArg(file, expr) {
  const e = expr === undefined ? undefined : bare(expr);
  if (e === undefined) return null;
  if (ts.isArrayLiteralExpression(e)) return e;
  if (ts.isIdentifier(e)) {
    const decl = constNamed(file, e.text);
    return decl === null ? null : arrayOfArg(file, decl.initializer);
  }
  if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) {
    const fn = oneFunction(file, e.expression.text);
    if (fn === null) return null;
    const rets = ownReturnsOf(fn).map((r) => (r.expression === undefined ? null : bare(r.expression))).filter((r) => r !== null && ts.isArrayLiteralExpression(r));
    return rets.length === 1 ? rets[0] : null;
  }
  return null;
}

/** A call's position, or -1: `at(undefined)` reads as absent. */
const zAt = (n) => (n === undefined || n === null ? -1 : n.getStart());

/**
 * THE KEYS VERB'S ANCHORS (Z4, Z5, Z8, Z20). The verb itself and every local
 * function it reaches are read as one body in source order, a helper's call
 * site standing for what the helper does, so a verb split into named steps is
 * read the same as one written inline.
 */
function keysAnchors(file) {
  const verb = verbOf(file, 'createScreenKeys', 'keys');
  if (verb === null) return null;
  const helpers = reachedFunctions(file, verb).filter((f) => f !== verb);
  /** The position in the verb that stands for a node: the node, or the call of the helper holding it. */
  const standIn = (node) => {
    if (inside(node, verb)) return node;
    for (const h of helpers) {
      if (!inside(node, h)) continue;
      const hname = ts.isFunctionDeclaration(h) ? h.name?.text : enclosingName(descendantsOf(h)[1] ?? h);
      const call = descendantsOf(verb).find((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === hname || functionsNamed(file, n.expression.text).includes(h)));
      if (call !== undefined) return call;
    }
    return undefined;
  };
  const scope = [verb, ...helpers];
  const callsNamed = (name) => scope.flatMap((f) => descendantsOf(f).filter((n) => ts.isCallExpression(n) && calleeName(n) === name));
  const first = (name) => {
    const all = callsNamed(name).map((c) => ({ c, at: zAt(standIn(c)) })).filter((x) => x.at !== -1).sort((a, b) => a.at - b.at);
    return all[0];
  };
  const textRule = first('textRefusal');
  const readFresh = callsNamed('readFresh');
  const fresh = first('readFresh');
  const stillCalls = callsNamed('still').map((c) => ({ c, at: zAt(standIn(c)) })).filter((x) => fresh !== undefined && x.at > fresh.at).sort((a, b) => a.at - b.at);
  const still = stillCalls[0];
  const bump = first('bump');
  const lastCheck = (() => {
    const all = scope.flatMap((f) => descendantsOf(f).filter((n) => ts.isCallExpression(n) && /onLastCheck/.test(n.expression.getText()))).map((c) => ({ c, at: zAt(standIn(c)) })).sort((a, b) => a.at - b.at);
    return all[0];
  })();
  const ACT = /^(?:sendCommand|typeRemote|run|execTmux|spawnTmux)$/;
  const acts = scope
    .flatMap((f) => descendantsOf(f).filter((n) => ts.isCallExpression(n) && ACT.test(calleeName(n) ?? '')))
    .map((c) => ({ c, at: zAt(standIn(c)) }))
    .filter((x) => x.at !== -1)
    .sort((a, b) => a.at - b.at);
  const act = lastCheck === undefined ? acts[0] : acts.find((x) => x.at >= lastCheck.at) ?? acts[0];
  const awaits = scope.flatMap((f) => descendantsOf(f).filter((n) => ts.isAwaitExpression(n))).map((a) => ({ a, at: zAt(standIn(a)) }));
  return { verb, helpers, scope, standIn, callsNamed, textRule, readFresh, fresh, still, bump, lastCheck, act, acts, awaits };
}

function screenRules() {
  // -------------------------------------------------------------------------
  // Z1, THE TWO ROWS.
  // -------------------------------------------------------------------------
  {
    const table = zFile('src/main/pocket/door/table.ts', 'Z1', Z_OWNER.door);
    if (table !== null) {
      const rows = [];
      for (const n of nodesOf(table)) {
        if (!ts.isObjectLiteralExpression(n)) continue;
        const row = {};
        for (const p of n.properties) {
          if (!ts.isPropertyAssignment(p) || memberName(p) === null) continue;
          const v = bare(p.initializer);
          row[memberName(p)] = ts.isStringLiteral(v) ? v.text : v.kind === ts.SyntaxKind.TrueKeyword ? true : v.kind === ts.SyntaxKind.FalseKeyword ? false : null;
        }
        if (typeof row['id'] === 'string' && typeof row['path'] === 'string') rows.push(row);
      }
      const WANT = {
        screen: { id: 'screen', method: 'GET', path: '/v1/screen', reads: true, windowOnly: false, signed: true },
        keys: { id: 'keys', method: 'POST', path: '/v1/keys', reads: false, windowOnly: false, signed: true },
        // PHASE 337.1 (build/p3371/SPEC.md D1, §5.1): one page of a session's
        // history, a one-shot signed read alive outside any window.
        scrollback: { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true }
      };
      for (const [id, want] of Object.entries(WANT)) {
        checked('Z1');
        const found = rows.filter((r) => r['id'] === id);
        if (found.length !== 1 || J(found[0]) !== J(want)) {
          fail('Z1', `${rel(table)}: the ${id} row is ${J(found)}; it is exactly ${J(want)} (build/p337/SPEC.md D1, build/p3371/SPEC.md D1): ${id === 'keys' ? 'a signed POST write through the one write path, alive outside any window' : 'a signed GET read, alive outside any window'}`);
        }
      }
    }
    const wire = zFile('src/main/pocket/door/wire.ts', 'Z1', Z_OWNER.door);
    if (wire !== null) {
      for (const [name, want] of [['SIGNED_ROUTES', ['blocked', 'screen', 'scrollback', 'session', 'sessions', 'turns']], ['WRITE_ROUTES', ['choose', 'end', 'keys', 'say']]]) {
        checked('Z1');
        const decl = constNamed(wire, name);
        const init = decl === null ? undefined : bare(decl.initializer);
        const got = init !== undefined && ts.isArrayLiteralExpression(init) ? init.elements.map((e) => (ts.isStringLiteral(e) ? e.text : '?')).sort() : null;
        if (got === null || J(got) !== J(want)) {
          fail('Z1', `${rel(wire)}: ${name} is ${J(got)}; it is exactly ${J(want)} (build/p337/SPEC.md §5.1; build/p3371/SPEC.md §5.1 adds scrollback to the signed reads and nothing to the writes). The door hands main a signed read or a write only for an id on its own list.`);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z2, THE KEYS CAP, re-derived here from the worst legal body.
  // -------------------------------------------------------------------------
  {
    const limits = zFile('src/main/pocket/door/limits.ts', 'Z2', Z_OWNER.door);
    const caps = limits === null ? null : constNamed(limits, 'POCKET_WRITE_BODY_CAPS');
    checked('Z2', 2);
    let init = caps === null ? undefined : bare(caps.initializer);
    if (init !== undefined && ts.isCallExpression(init) && calleeName(init) === 'freeze') init = bare(init.arguments[0]);
    const got = {};
    if (init !== undefined && ts.isObjectLiteralExpression(init)) {
      for (const p of init.properties) if (ts.isPropertyAssignment(p) && memberName(p) !== null) got[memberName(p)] = ts.isNumericLiteral(bare(p.initializer)) ? Number(bare(p.initializer).text.replace(/_/g, '')) : null;
    }
    const want = { choose: 512, end: 512, keys: 16_384, say: 32_768 };
    if (J(Object.keys(got).sort().map((k) => [k, got[k]])) !== J(Object.keys(want).sort().map((k) => [k, want[k]]))) {
      fail('Z2', `${limits === null ? 'src/main/pocket/door/limits.ts' : rel(limits)}: POCKET_WRITE_BODY_CAPS is ${J(got)}; it is exactly end 512, choose 512, say 32,768 and keys 16,384 (build/p337/SPEC.md D17, Y1 widened)`);
    }
    // The worst legal-shape keys body, composed HERE by this gate rather than
    // read from the spec: the longest session id the parse takes (128), a
    // question id of 16 hex and 16 digits, a mark, a write id, and 1,024 bytes
    // of C0 text (each escaped \u00XX by JSON) in one item and spread over 64,
    // and 64 names. The cap is at least twice the worst, so a body of the right
    // shape reaches main and is answered in words rather than dropped.
    const c0 = (n) => String.fromCharCode(1).repeat(n);
    const body = (keys) => JSON.stringify({ dialog: 'a'.repeat(12), keys, session: 's'.repeat(128), turn: `${'f'.repeat(16)}-${'9'.repeat(16)}`, write: '0'.repeat(32) });
    const worst = Math.max(
      Buffer.byteLength(body([{ t: c0(1024) }])),
      Buffer.byteLength(body(Array.from({ length: 64 }, () => ({ t: c0(16) })))),
      Buffer.byteLength(body(Array.from({ length: 64 }, () => ({ k: 'BSpace' }))))
    );
    if (!(typeof got['keys'] === 'number' && got['keys'] >= 2 * worst)) {
      fail('Z2', `the keys cap is ${String(got['keys'])}; the worst legal-shape keys body this gate composes is ${String(worst)} bytes, and the cap is at least twice it, so a C0 text of the right shape is answered refused character rather than dropped oversized (build/p337/SPEC.md D17, §14 M15)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z3, THE KEYS PARSE.
  // -------------------------------------------------------------------------
  {
    const writes = zFile('src/main/pocket/writes.ts', 'Z3', Z_OWNER.door);
    const parse = writes === null ? null : oneFunction(writes, 'parseKeysBody');
    checked('Z3');
    if (writes !== null && parse === null) fail('Z3', `${rel(writes)} declares no single parseKeysBody, so the keys body is not parsed in the one place a write body is read (build/p337/SPEC.md §5.5)`);
    if (parse !== null) {
      const reach = reachedFunctions(writes, parse);
      const text = reach.map((f) => codeOfNode(writes, f)).join('\n');
      const nodes = reach.flatMap((f) => descendantsOf(f));
      checked('Z3', 9);
      const keysConst = constNamed(writes, 'KEYS_KEYS');
      const keysValue = keysConst === null ? null : bare(keysConst.initializer);
      if (keysValue === undefined || keysValue === null || !ts.isStringLiteralLike(keysValue) || keysValue.text !== 'dialog,keys,session,turn,write' || !/\bKEYS_KEYS\b/.test(codeOfNode(writes, parse))) {
        fail('Z3', `${where(writes, parse)}: parseKeysBody does not compare the body's keys with KEYS_KEYS = 'dialog,keys,session,turn,write' (build/p337/SPEC.md D17)`);
      }
      const maxRef = nodes.find((n) => ts.isBinaryExpression(n) && /\bPOCKET_KEYS_MAX_ITEMS\b/.test(n.getText()) && /\.length\b/.test(n.getText()) && n.operatorToken.kind === ts.SyntaxKind.GreaterThanToken);
      const minRef = nodes.find((n) => ts.isBinaryExpression(n) && /\.length\b/.test(n.left.getText()) && ((n.operatorToken.kind === ts.SyntaxKind.LessThanToken && n.right.getText() === '1') || (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && n.right.getText() === '0')));
      if (maxRef === undefined || minRef === undefined) {
        fail('Z3', `${where(writes, parse)}: parseKeysBody does not hold the items to 1 through POCKET_KEYS_MAX_ITEMS (a length < 1 and a length > POCKET_KEYS_MAX_ITEMS); an empty write or a 65th key would reach the verb`);
      }
      const oneKey = nodes.some((n) => ts.isBinaryExpression(n) && /length$/.test(n.left.getText()) && n.right.getText() === '1' && (n.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken || n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) && /Object\.keys\(|\bown\b|\bkeys\b/.test(n.left.getText()));
      const tk = ['t', 'k'].every((k) => nodes.some((n) => ts.isStringLiteral(n) && n.text === k));
      if (!oneKey || !tk) fail('Z3', `${where(writes, parse)}: an item is not held to EXACTLY one own key, t or k; an item with two keys could carry a text and a name at once`);
      const namesRef = nodes.filter((n) => ts.isIdentifier(n) && n.text === 'POCKET_SCREEN_KEY_NAMES');
      const byIdentity = nodes.some((n) => ts.isForOfStatement(n) && n.expression.getText() === 'POCKET_SCREEN_KEY_NAMES' && descendantsOf(n.statement).some((m) => ts.isBinaryExpression(m) && m.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken)) ||
        nodes.some((n) => ts.isCallExpression(n) && /POCKET_SCREEN_KEY_NAMES\s*(?:as[^)]*\))?\s*\.\s*(?:includes|some|find)$/.test(n.expression.getText().replace(/\s+/g, ' ').replace(/\(\s*/, '')) );
      if (namesRef.length === 0 || !byIdentity) fail('Z3', `${where(writes, parse)}: a key name is not compared with === against POCKET_SCREEN_KEY_NAMES, the contract's 35 (build/p337/SPEC.md D17); a name read any other way (a lookup, a prefix, a pattern) can admit M-x or C-Up`);
      for (const bad of ['in POCKET_SCREEN_KEY_NAMES', 'hasOwnProperty', '.toLowerCase(', '.toUpperCase(', '.startsWith(', 'RegExp(']) {
        if (text.includes(bad)) fail('Z3', `${where(writes, parse)}: the keys parse reads with ${J(bad)}; a name is one of the 35 by identity and nothing else`);
      }
      const alone = nodes.some((n) => (ts.isIfStatement(n) || ts.isBinaryExpression(n)) && /'BSpace'/.test(n.getText()) && /\.length\s*(?:>|!==|>=)\s*[12]\b/.test(n.getText()));
      if (!alone) fail('Z3', `${where(writes, parse)}: nothing holds a named key other than BSpace to be the write's ONE item (build/p337/SPEC.md D17, §Attack A1): Escape followed by anything in the same read is read as Meta`);
      const turnRead = nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'isQuestionId');
      const dialogRead = nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'isMark') && nodes.some((n) => ts.isBinaryExpression(n) && /dialog/.test(n.left.getText()) && n.right.kind === ts.SyntaxKind.NullKeyword);
      if (!turnRead || !dialogRead) fail('Z3', `${where(writes, parse)}: the turn is not read by isQuestionId( and the dialog as null or isMark( (build/p337/SPEC.md D17)`);
      for (const n of nodes) {
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^(?:trim|trimStart|trimEnd|normalize|replace|replaceAll)$/.test(n.expression.name.text)) {
          fail('Z3', `${where(writes, n)}: the keys parse calls .${n.expression.name.text}(; nothing a phone sends is trimmed, normalised or rewritten before the verb judges it`);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z4, Z5, Z6, Z7, Z8, Z20: the keys verb.
  // -------------------------------------------------------------------------
  const keysFile = zFile('src/main/screen/keys.ts', 'Z4', Z_OWNER.keys);
  if (keysFile === null) for (const id of ['Z5', 'Z6', 'Z8', 'Z20']) fail(id, `src/main/screen/keys.ts does not exist. It is ${Z_OWNER.keys}.`);
  const k = keysFile === null ? null : keysAnchors(keysFile);
  checked('Z4');
  if (keysFile !== null && k === null) {
    for (const id of ['Z4', 'Z5', 'Z8', 'Z20']) fail(id, `${rel(keysFile)}: createScreenKeys answers no keys verb, so nothing of its order can be read (build/p337/SPEC.md §5.4)`);
  }
  if (k !== null) {
    // Z4, THE ORDER.
    checked('Z4', 8);
    if (k.readFresh.length !== 1) fail('Z4', `${rel(keysFile)} calls readFresh( ${String(k.readFresh.length)} time(s); the verb makes ONE fresh read, its capture the last thing awaited before the final check`);
    else if (!ts.isAwaitExpression(k.readFresh[0].parent) && !ts.isAwaitExpression(bare(k.readFresh[0].parent) ?? k.readFresh[0])) {
      const awaited = k.awaits.some((x) => inside(k.readFresh[0], x.a));
      if (!awaited) fail('Z4', `${where(keysFile, k.readFresh[0])}: the fresh read is not awaited, so the final check could judge a screen that has not been read`);
    }
    const order = [
      ['the text rule (textRefusal)', k.textRule],
      ['the one fresh read (readFresh)', k.fresh],
      ['the final check (still)', k.still],
      ['the question id moved for the phone (bump)', k.bump],
      ['the measurement hook (onLastCheck?.)', k.lastCheck],
      ['the act (sendCommand, the spawned list, or typeRemote)', k.act]
    ];
    for (const [what, x] of order) if (x === undefined) fail('Z4', `${where(keysFile, k.verb)}: the keys verb names no ${what} (build/p337/SPEC.md §5.4)`);
    if (order.every(([, x]) => x !== undefined)) {
      for (let i = 1; i < order.length; i += 1) {
        if (order[i - 1][1].at >= order[i][1].at) fail('Z4', `${where(keysFile, order[i][1].c)}: ${order[i][0]} comes before ${order[i - 1][0]}; the order is the spec's §5.4 steps 1 to 5, held as code`);
      }
      // Nothing awaited from the first still( to the act: an await whose
      // operand holds the act is the act's own (Promise.allSettled of it).
      for (const { a, at } of k.awaits) {
        if (at <= k.still.at || at >= k.act.at) continue;
        if (inside(k.act.c, a)) continue;
        fail('Z4', `${where(keysFile, a)}: ${J(a.getText().slice(0, 60))} is awaited between the final check and the act. The check is synchronous to the act: a key judged against one screen lands on that screen or not at all (D21)`);
      }
    }
    // The act's lines are written in ONE statement over the control client.
    const sends = k.scope.flatMap((f) => descendantsOf(f).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'sendCommand'));
    const statements = new Set(sends.map((c) => statementOf(c)?.statement));
    checked('Z4');
    if (sends.length === 0) fail('Z4', `${rel(keysFile)}: the keys verb writes nothing over the control client (sendCommand); locally its lines go over core.control, one command per line (build/p337/SPEC.md D19)`);
    if (statements.size > 1) fail('Z4', `${rel(keysFile)}: the act's lines are written by ${String(statements.size)} statements; they are written in ONE synchronous statement, so nothing runs between a key's lines (D19)`);
    for (const c of sends) {
      for (let n = c.parent; n !== undefined && !inside(k.verb, n); n = n.parent) {
        if ((ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n)) && descendantsOf(n).some((m) => ts.isAwaitExpression(m))) {
          fail('Z4', `${where(keysFile, c)}: a line of the act is written inside a loop that awaits, so the act's lines are not one statement`);
        }
      }
    }

    // Z5, THE ONE REFUSAL.
    const screenFilesNow = sourcesUnder(join(ROOT, 'src', 'main', 'screen'));
    const verbText = k.scope.map((f) => codeOfNode(keysFile, f)).join('\n');
    // Asking, read over the FRESH screen in the verb (its own steps and the
    // helpers it calls) and over the composed screen in the answer: the row
    // waiting on him (needs_input) OR a numbered question drawn
    // (detectDialogRows( … ).atChoice), both halves in each place.
    const asksBoth = (text) => /status\s*===\s*'needs_input'|'needs_input'\s*===/.test(text) && /detectDialogRows\(/.test(text) && /\.atChoice\b/.test(text) && /\|\|/.test(text);
    const composeFile = join(ROOT, 'src', 'main', 'screen', 'compose.ts');
    // The asking functions compose.ts declares: each reads both halves.
    const askers = existsSync(composeFile)
      ? nodesOf(composeFile).filter((n) => (ts.isFunctionDeclaration(n) || (ts.isVariableDeclaration(n) && n.initializer !== undefined && ts.isArrowFunction(bare(n.initializer)))) && ts.isIdentifier(n.name) && asksBoth(n.getText())).map((n) => n.name.text)
      : [];
    const verbAsks = asksBoth(verbText) || askers.some((name) => new RegExp(`\\b${name}\\(`).test(verbText));
    checked('Z5', 4);
    if (!verbAsks) fail('Z5', `${rel(keysFile)}: the verb does not read asking as the status needs_input OR detectDialogRows( .atChoice over its fresh read, itself or through compose.ts's one asking function (build/p337/SPEC.md D16); the refusal would compare nothing while a question is drawn`);
    if (existsSync(composeFile)) {
      const composeText = codeTextOf(composeFile);
      const answerAsks = askers.some((name) => (composeText.match(new RegExp(`\\b${name}\\(`, 'g')) ?? []).length >= 2) || (askers.length === 0 && asksBoth(composeText));
      if (!answerAsks) fail('Z5', `src/main/screen/compose.ts: the answer's asking is not the status needs_input OR detectDialogRows( .atChoice through one function it calls itself (D16), so the phone and the verb could disagree on what a question is`);
    }
    const comparesTurn = /\bcurrent\(/.test(verbText) && /\.turn\s*(?:!==|===)|(?:!==|===)\s*[A-Za-z_.]*\.turn\b/.test(verbText);
    const comparesDialog = /\.dialog\s*(?:!==|===)\s*(?!null\b)[A-Za-z_]/.test(verbText) || /(?:!==|===)\s*[A-Za-z_.]*\.dialog\b/.test(verbText.replace(/\.dialog\s*(?:!==|===)\s*null/g, ''));
    const nullGate = /\.dialog\s*!==\s*null/.test(verbText);
    if (!comparesTurn) fail('Z5', `${rel(keysFile)}: the verb does not compare the body's turn with turns.current( — keys meant for a question reach that question or nothing (D21)`);
    if (!comparesDialog || !nullGate) fail('Z5', `${rel(keysFile)}: the verb does not compare the body's dialog with the fresh read's, or does not take a non-null dialog as a picture that was asking (D21, D22); the id alone moves on the phone's own key`);
    const refuses = k.scope.some((f) => descendantsOf(f).some((n) => ts.isIdentifier(n) && n.text === 'SCREEN_QUESTION_MOVED')) && /'changed'/.test(verbText);
    if (!refuses) fail('Z5', `${rel(keysFile)}: the refusal is not refused changed with SCREEN_QUESTION_MOVED (build/p337/SPEC.md D21)`);
    const markSites = screenFilesNow.flatMap((file) => nodesOf(file).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'hashScreen' && n.arguments[0] !== undefined && ts.isCallExpression(bare(n.arguments[0])) && calleeName(bare(n.arguments[0])) === 'readBackWindowOf').map((n) => ({ file, n })));
    checked('Z5', 2);
    if (markSites.length !== 1 || enclosingName(markSites[0].n) !== 'windowMarkOf') {
      fail('Z5', `src/main/screen spells hashScreen(readBackWindowOf( ${String(markSites.length)} time(s)${markSites.length === 1 ? ` in ${String(enclosingName(markSites[0].n))}` : ''}; it is spelled ONCE, in windowMarkOf, which the answer's dialog and the verb's check both call (build/p337/SPEC.md §5.3.4)`);
    }
    if (!/\bwindowMarkOf\(/.test(verbText)) fail('Z5', `${rel(keysFile)}: the verb never calls windowMarkOf(, so its dialog is not the answer's window mark`);

    // Z6, THE ACT'S ARGV.
    const strings = codeStringsOf(keysFile).map((s) => s.text);
    const joined = strings.join('\u0000');
    checked('Z6', 5);
    const tmuxHeads = strings.filter((s) => /^(?:[a-z]+-[a-z]+)(?:\s|$)/.test(s) && /^(?:send-keys|copy-mode|paste-buffer|load-buffer|set-buffer|send-prefix|resize-|refresh-client|display-message|capture-pane|new-|kill-|respawn-|run-shell|if-shell)/.test(s));
    for (const head of tmuxHeads) {
      if (!/^(?:copy-mode -q -t |send-keys -t |copy-mode$|send-keys$)/.test(head)) {
        fail('Z6', `${rel(keysFile)}: the act composes ${J(head.slice(0, 50))}; it composes only copy-mode -q -t <pane>, send-keys -t <pane> -H <hex>… and send-keys -t <pane> <name> (build/p337/SPEC.md D18, D19)`);
      }
    }
    if (strings.some((s) => s === '-l' || /\s-l(?:\s|$)/.test(s))) fail('Z6', `${rel(keysFile)}: the act names send-keys -l. NEVER -l: over the control client it EXPANDED $HOME, and as an argv it dropped a trailing ; (§14 M4)`);
    if (!strings.some((s) => s === '-H' || /\s-H(?:\s|$)/.test(s))) fail('Z6', `${rel(keysFile)}: text is not sent as send-keys -H <hex>; it arrives as the exact bytes typed only that way (D18)`);
    const sendKeysWithoutTarget = strings.some((s) => /^send-keys(?:\s+(?!-t\b)\S|$)/.test(s) && s !== 'send-keys');
    const argvSendKeys = nodesOf(keysFile).filter((n) => ts.isArrayLiteralExpression(n)).some((arr) => arr.elements.some((e, i) => ts.isStringLiteral(e) && e.text === 'send-keys' && !(arr.elements[i + 1] !== undefined && ts.isStringLiteral(arr.elements[i + 1]) && arr.elements[i + 1].text === '-t')));
    if (sendKeysWithoutTarget || argvSendKeys) fail('Z6', `${rel(keysFile)}: a send-keys without -t <pane> right after it; a key goes to the pane the fresh read named and nowhere else`);
    if (!/toString\(16\)/.test(codeTextOf(keysFile)) || !/padStart\(2,\s*'0'\)/.test(codeTextOf(keysFile))) fail('Z6', `${rel(keysFile)}: text bytes are not written as two lowercase hex digits each (toString(16).padStart(2, '0')), so an element of -H is not ^[0-9a-f]{2}$`);
    const names = new Set(['POCKET_SCREEN_KEY_NAMES', ...importedNames(keysFile, (s) => /ipc\/pocket$/.test(s))]);
    void names;
    // The carriage's byte bound (TYPED_BYTES_PER_COMMAND) is a number and may
    // be read; nothing that writes to another machine may be named.
    const remoteValueImports = specifiersOf(keysFile).filter(({ node, text }) => {
      if (!/machines\//.test(text) || (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true)) return false;
      const b = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined;
      const named = b !== undefined && ts.isNamedImports(b) ? b.elements.filter((e) => !e.isTypeOnly).map((e) => (e.propertyName ?? e.name).text) : null;
      return !(/scroll-shapes$/.test(text) && named !== null && named.every((n) => n === 'TYPED_BYTES_PER_COMMAND'));
    });
    checked('Z6');
    for (const { node, text } of remoteValueImports) fail('Z6', `${where(keysFile, node)}: the keys verb imports ${text} by value; on another machine it reaches the far session ONLY through typePhoneKeys(, handed in as typeRemote (build/p337/SPEC.md §5.4 step 5)`);
    const caps = join(ROOT, 'src', 'main', 'capabilities.ts');
    if (existsSync(caps)) {
      checked('Z6');
      const handed = nodesOf(caps).some((n) => ts.isCallExpression(n) && calleeName(n) === 'createScreenKeys' && n.arguments[0] !== undefined && /typeRemote\s*:\s*(?:typePhoneKeys\b|\([^)]*\)\s*=>\s*typePhoneKeys\()/.test(n.arguments[0].getText()));
      if (!handed) fail('Z6', 'src/main/capabilities.ts does not hand createScreenKeys typeRemote: typePhoneKeys, so a key on another machine does not go through the carriage’s one composer (build/p337/SPEC.md D20)');
    }

    // Z8, THE ONE STATUS CALL.
    const notes = screenFilesNow.flatMap((file) => callsOf(file).filter((c) => calleeName(c) === 'noteUserInput').map((c) => ({ file, c })));
    checked('Z8', 3);
    if (notes.length !== 1 || notes[0].file !== keysFile) {
      fail('Z8', `src/main/screen calls noteUserInput( ${String(notes.length)} time(s) (${notes.map((x) => where(x.file, x.c)).join(', ')}); exactly once, in keys.ts, after the act (build/p337/SPEC.md D23)`);
    } else if (k.act !== undefined && zAt(k.standIn(notes[0].c)) <= k.act.at) {
      fail('Z8', `${where(keysFile, notes[0].c)}: noteUserInput( comes before the act; a key answers what the session was waiting on only once it has been typed`);
    } else if (k.still !== undefined && zAt(k.standIn(notes[0].c)) <= k.still.at) {
      fail('Z8', `${where(keysFile, notes[0].c)}: noteUserInput( is reached on a path before the final check, so a refused write could move the status`);
    }
    const SETTERS = /^(?:noteHookEvent|applyDetectedStatus|setStatus|setSessionStatus|updateStatus|writeStatus|markStatus|noteForeground|raiseNeedsInput)$/;
    for (const file of screenFilesNow) {
      for (const c of callsOf(file)) {
        checked('Z8');
        if (SETTERS.test(calleeName(c) ?? '')) fail('Z8', `${where(file, c)} calls ${calleeName(c)}(; nothing in src/main/screen names a status setter but noteUserInput, the desk's own funnel (refusal 5)`);
      }
      for (const s of codeStringsOf(file)) {
        if (s.text === 'needs_input' && file === keysFile && !/=== 'needs_input'|!== 'needs_input'|includes\(/.test(s.node.parent.getText())) {
          fail('Z8', `${where(file, s.node)}: keys.ts writes needs_input other than by comparing; a key never raises needs_input`);
        }
      }
    }

    // Z20, THE GAP.
    const gapDecls = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'SCREEN_KEYS_GAP_MS');
    checked('Z20', 4);
    if (gapDecls.length !== 1 || gapDecls[0].file !== keysFile || zNumber(keysFile, 'SCREEN_KEYS_GAP_MS') !== 50) {
      fail('Z20', `SCREEN_KEYS_GAP_MS is declared ${String(gapDecls.length)} time(s) (${gapDecls.map((d) => rel(d.file)).join(', ')}) with ${String(zNumber(keysFile, 'SCREEN_KEYS_GAP_MS'))}; it is 50, declared once, in keys.ts (build/p337/SPEC.md D42)`);
    }
    const gapRefs = k.scope.flatMap((f) => descendantsOf(f).filter((n) => ts.isIdentifier(n) && n.text === 'SCREEN_KEYS_GAP_MS')).map((n) => zAt(k.standIn(n)));
    // The gate: the first read of a row's status in the verb, by a literal of
    // the four, a module constant holding them, or the status itself.
    const gateAt = (() => {
      const holders = new Set(nodesOf(keysFile).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && /'unknown'/.test(n.initializer.getText()) && /'exited'/.test(n.initializer.getText())).map((n) => n.name.text));
      const lits = k.scope
        .flatMap((f) => descendantsOf(f).filter((n) => (ts.isStringLiteral(n) && /^(?:unknown|exited|restorable|discarded)$/.test(n.text)) || (ts.isIdentifier(n) && holders.has(n.text))))
        .map((n) => zAt(k.standIn(n)))
        .filter((x) => x !== -1);
      return lits.length === 0 ? -1 : Math.min(...lits);
    })();
    const gapAwait = k.awaits.filter((x) => k.fresh !== undefined && x.at < k.fresh.at && x.at > gateAt && !inside(k.fresh.c, x.a));
    if (gateAt === -1) fail('Z20', `${rel(keysFile)}: no gate on the row's status (unknown, exited, restorable, discarded) was found before the gap`);
    if (gapRefs.length === 0 || gapAwait.length !== 1) {
      fail('Z20', `${rel(keysFile)}: the verb awaits the gap ${String(gapAwait.length)} time(s) between the gate and its one fresh read; it awaits the remainder of SCREEN_KEYS_GAP_MS ONCE, after the gate and before readFresh(, so two writes reach a busy reader as two reads (D42, §Attack AM2)`);
    } else if (!gapRefs.some((at) => at > gateAt && at <= gapAwait[0].at)) {
      fail('Z20', `${where(keysFile, gapAwait[0].a)}: the await before the fresh read is not the gap's: SCREEN_KEYS_GAP_MS is not read between the gate and it`);
    }
    const lastWrite = k.scope.flatMap((f) => descendantsOf(f).filter((n) => (ts.isCallExpression(n) && calleeName(n) === 'set' && /last|act/i.test(n.expression.getText())) || (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /last|act/i.test(n.left.getText()))));
    if (k.act !== undefined && !lastWrite.some((n) => zAt(k.standIn(n)) > k.act.at)) {
      fail('Z20', `${rel(keysFile)}: the session's last-act time is not written after the act, so the next write's gap is measured from the wrong moment`);
    }
  }

  // Z7, NO TEXT IN AN ARGV, NO .message, NO LOG — over the whole screen domain.
  {
    const files = [...sourcesUnder(join(ROOT, 'src', 'main', 'screen')), ...(existsSync(REMOTE_SCREEN) ? [REMOTE_SCREEN] : [])];
    checked('Z7');
    if (files.length === 0) fail('Z7', `src/main/screen/ holds no source file, so nothing of Z7 was read. It is ${Z_OWNER.screen} and ${Z_OWNER.keys}.`);
    // PHASE 337.1 (build/p3371/SPEC.md D15, §6.1): the page reader is read
    // here with the rest, and its absence is a failure rather than a file
    // quietly left out of the walk.
    checked('Z7');
    if (!existsSync(SCROLLBACK)) fail('Z7', `src/main/screen/scrollback.ts does not exist, so the page read's logs and errors were not read. It is ${Z_OWNER.screen3371}.`);
    for (const file of files) {
      for (const n of nodesOf(file)) {
        if (ts.isPropertyAccessExpression(n) && n.name.text === 'message') {
          checked('Z7');
          fail('Z7', `${where(file, n)} reads .message. An error's text can hold its argv and the screen it read; nothing in src/main/screen reads it`);
        }
        if (ts.isCallExpression(n)) {
          const name = calleeName(n);
          const recv = ts.isPropertyAccessExpression(n.expression) ? n.expression.expression.getText() : '';
          if ((/^(?:debug|info|warn|error|log|trace)$/.test(name ?? '') && /log|console/i.test(recv)) || name === 'getLog') {
            checked('Z7');
            fail('Z7', `${where(file, n)} logs (${n.expression.getText().slice(0, 40)}); nothing in src/main/screen or remote-screen.ts logs: a screen is whatever a terminal shows, secrets included (D41)`);
          }
        }
      }
      for (const { node, text } of specifiersOf(file)) {
        checked('Z7');
        if (/(?:^|\/)log(?:\/|$)/.test(text)) fail('Z7', `${where(file, node)} imports the logger (${text}); src/main/screen logs nothing`);
      }
    }
    if (keysFile !== null) {
      // A text item's .t reaches the argv only as bytes, through Buffer.from.
      for (const n of nodesOf(keysFile)) {
        if (!ts.isPropertyAccessExpression(n) || n.name.text !== 't') continue;
        checked('Z7');
        for (let p = n.parent; p !== undefined && !ts.isStatement(p); p = p.parent) {
          if (ts.isCallExpression(p) && /^(?:from|byteLength|textRefusal)$/.test(calleeName(p) ?? '')) break;
          if (ts.isTemplateExpression(p) || ts.isArrayLiteralExpression(p) || (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
            fail('Z7', `${where(keysFile, n)}: a text item's characters reach ${ts.isTemplateExpression(p) ? 'a command line' : ts.isArrayLiteralExpression(p) ? 'an argv' : 'a joined string'} directly; text reaches tmux only as its hex bytes (build/p337/SPEC.md D18)`);
            break;
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z9, THE READS, AND NOTHING SIZES ANYTHING.
  // -------------------------------------------------------------------------
  {
    const read = zFile('src/main/screen/read.ts', 'Z9', Z_OWNER.screen);
    // PHASE 337.1 (D4): the eighth field, the history size, LAST, so the seven
    // keep their places. Z28 reads its parse.
    const FORMAT = SCREEN_FORMAT_8;
    // Within the Screen's own modules: src/main/conformance/screen-class.ts has
    // a SCREEN_FORMAT of its own (Phase 331's screen class), which is not this.
    const formatDecls = declarationsOf([...sourcesUnder(join(ROOT, 'src', 'main', 'screen')), ...(existsSync(REMOTE_SCREEN) ? [REMOTE_SCREEN] : [])], 'SCREEN_FORMAT');
    checked('Z9', 2);
    if (formatDecls.length !== 1 || (read !== null && formatDecls[0].file !== read)) {
      fail('Z9', `SCREEN_FORMAT is declared ${String(formatDecls.length)} time(s) (${formatDecls.map((d) => rel(d.file)).join(', ')}); it is declared ONCE, in src/main/screen/read.ts (build/p337/SPEC.md D6)`);
    } else {
      const v = bare(formatDecls[0].n.initializer);
      const value = v !== undefined && ts.isStringLiteralLike(v) ? v.text : null;
      if (value !== FORMAT) fail('Z9', `${where(formatDecls[0].file, formatDecls[0].n)}: SCREEN_FORMAT is ${J(value)}; it is exactly ${J(FORMAT)} (build/p3371/SPEC.md D4: the seven fields of 337 and #{history_size} last): no caller string is ever a format, because a format on a long-lived connection can run programs (D6)`);
    }
    if (read !== null) {
      for (const { node, text } of codeStringsOf(read)) {
        if (!/^(?:[a-z]+-[a-z]+)\b/.test(text) || !/^(?:display-message|capture-pane|send-keys|copy-mode|resize|refresh-client|new-|attach-|switch-|run-shell|if-shell|set-|list-)/.test(text)) continue;
        checked('Z9');
        if (!/^(?:display-message -p -t |capture-pane -p -e -t |display-message$|capture-pane$)/.test(text)) {
          fail('Z9', `${where(read, node)}: the read composes ${J(text.slice(0, 50))}; it sends only display-message -p -t <x> SCREEN_FORMAT and capture-pane -p -e -t <x> (build/p337/SPEC.md D5, D7)`);
        }
      }
      // The spawned down path: ONE list per read, the three joined by `;`.
      const spawned = callsOf(read).filter((c) => /^(?:execTmux|run|spawn|spawnTmux|execFile)$/.test(calleeName(c) ?? ''));
      checked('Z21');
      if (spawned.length !== 1) {
        fail('Z21', `${rel(read)} starts ${String(spawned.length)} spawned tmux call(s); when the control client is down a read is ONE spawned tmux carrying the three as a ; list (build/p337/SPEC.md D5, §Attack A8)`);
      } else {
        const list = arrayOfArg(read, spawned[0].arguments[0]);
        const semis = list === null ? 0 : list.elements.filter((e) => ts.isStringLiteral(e) && e.text === ';').length;
        if (semis !== 2) fail('Z21', `${where(read, spawned[0])}: the down path's one spawn carries ${String(semis)} ; separator(s); it carries the three commands as ONE list, display ; capture ; display, so a down client costs one spawn a read and never three`);
      }
    }
    // THE FAR READS (build/p3371/SPEC.md D6, D10, §5.3.3, §5.3.5). Every
    // execOn( is handed remoteScreenArgv( (the live picture) or
    // remoteScrollbackArgv( (one page's attempt), and each of the two composes
    // ONE exec of THREE commands, display ; capture ; display, the page's
    // capture carrying -S and -E and nothing else.
    const remote = zFile('src/main/machines/remote-screen.ts', 'Z9', Z_OWNER.screen);
    if (remote !== null) {
      const execs = callsOf(remote).filter((c) => calleeName(c) === 'execOn');
      checked('Z9', 3);
      const builders = new Map([['remoteScreenArgv', []], ['remoteScrollbackArgv', []]]);
      if (execs.length === 0) fail('Z9', `${rel(remote)} calls execOn( nowhere; a far read is ONE execOn( an attempt (build/p337/SPEC.md §5.3.3)`);
      for (const c of execs) {
        const arg = bare(c.arguments[1]);
        const name = arg !== undefined && ts.isCallExpression(arg) && ts.isIdentifier(arg.expression) ? arg.expression.text : null;
        if (name === null || !builders.has(name)) {
          fail('Z9', `${where(remote, c)}: execOn( is handed ${J(arg?.getText().slice(0, 60) ?? null)}; every far exec is handed remoteScreenArgv( or remoteScrollbackArgv(, the two composers no caller string reaches (build/p3371/SPEC.md D6, D10)`);
          continue;
        }
        builders.get(name).push(c);
      }
      for (const [name, calls] of builders) {
        if (calls.length > 1) fail('Z9', `${rel(remote)} hands ${name}( to execOn( ${String(calls.length)} times; once, in its one reader, so an attempt is ONE exec`);
      }
      if (builders.get('remoteScreenArgv').length !== 1) fail('Z9', `${rel(remote)}: the far live read does not hand remoteScreenArgv( to one execOn(`);
      const T = 'TARGET';
      const DISPLAY = ["'display-message'", "'-p'", "'-t'", T, 'SCREEN_FORMAT'];
      const wants = {
        remoteScreenArgv: [...DISPLAY, "';'", "'capture-pane'", "'-p'", "'-e'", "'-t'", T, "';'", ...DISPLAY],
        remoteScrollbackArgv: [...DISPLAY, "';'", "'capture-pane'", "'-p'", "'-e'", "'-t'", T, "'-S'", 'START', "'-E'", 'END', "';'", ...DISPLAY]
      };
      for (const [name, want] of Object.entries(wants)) {
        const fn = oneFunction(remote, name);
        checked('Z9');
        if (fn === null) {
          fail('Z9', `${rel(remote)} declares no single ${name}; ${name === 'remoteScreenArgv' ? 'the far live read' : 'a far page attempt'} is composed by it alone (build/p3371/SPEC.md §5.3.3, §5.3.5)`);
          continue;
        }
        const target = fn.parameters[0] !== undefined && ts.isIdentifier(fn.parameters[0].name) ? fn.parameters[0].name.text : null;
        const rets = ownReturnsOf(fn).map((r) => (r.expression === undefined ? null : flatArgvOf(remote, r.expression))).filter((r) => r !== null);
        if (rets.length !== 1) {
          fail('Z9', `${where(remote, fn)}: ${name} answers ${String(rets.length)} argv literal(s); it answers ONE, three commands in one exec`);
          continue;
        }
        const shape = rets[0].map((e, i, all) => {
          if (/^'/.test(e)) return e;
          if (target !== null && e === target) return T;
          if (all[i - 1] === "'-S'") return 'START';
          if (all[i - 1] === "'-E'") return 'END';
          return e;
        });
        if (J(shape) !== J(want)) fail('Z9', `${where(remote, fn)}: ${name}'s argv is ${J(rets[0])}; it is exactly ${J(want)}: the display, the capture, the display, in ONE exec, the one format and nothing a caller wrote (build/p3371/SPEC.md D6, D10)`);
      }
    }
    // THE LOCAL PAGE READ (build/p3371/SPEC.md D9, D15, §5.3.5): scrollback.ts
    // names no tmux verb but display-message and capture-pane, no flag but
    // -p, -e, -t, -S and -E, and every -S and -E value is String( of a name it
    // checked whole with Number.isSafeInteger( (a number tmux cannot read
    // silently starts at the visible top, §14 M1).
    const page = existsSync(SCROLLBACK) ? SCROLLBACK : null;
    checked('Z9');
    if (page === null) fail('Z9', `src/main/screen/scrollback.ts does not exist, so the page read's verbs were not read. It is ${Z_OWNER.screen3371} (build/p3371/SPEC.md §10).`);
    else {
      const VERB = /^(?:[a-z]+-[a-z]+)(?:\s|$)/;
      const TMUX_VERBS = /^(?:display-message|capture-pane|send-keys|copy-mode|resize-\w+|refresh-client|new-\w+|attach-\w+|switch-\w+|run-shell|if-shell|set-\w+|list-\w+|kill-\w+|respawn-\w+|load-buffer|paste-buffer|clear-history|select-\w+|split-window|show-\w+)(?:\s|$)/;
      for (const { node, text } of codeStringsOf(page)) {
        if (!VERB.test(text) || !TMUX_VERBS.test(text)) continue;
        checked('Z9');
        if (!/^(?:display-message|capture-pane)(?:$| -p -t | -p -e -t )/.test(text)) fail('Z9', `${where(page, node)}: the page read composes ${J(text.slice(0, 50))}; its only verbs are display-message -p … SCREEN_FORMAT and capture-pane -p -e … -S <int> -E <int> (build/p3371/SPEC.md D15)`);
      }
      for (const arr of nodesOf(page).filter((n) => ts.isArrayLiteralExpression(n) && n.elements.some((e) => ts.isStringLiteral(e) && /^(?:display-message|capture-pane)$/.test(e.text)))) {
        for (const [i, e] of arr.elements.entries()) {
          if (!ts.isStringLiteral(e) || !/^-/.test(e.text)) continue;
          checked('Z9');
          if (!/^-(?:p|e|t|S|E)$/.test(e.text)) fail('Z9', `${where(page, e)}: the page read's argv names the flag ${J(e.text)}; it names -p, -e, -t, -S and -E alone (no -a, no -J, nothing that sizes, D15)`);
          if (e.text === '-S' || e.text === '-E') {
            const v = bare(arr.elements[i + 1]);
            const named = v !== undefined && ts.isCallExpression(v) && ts.isIdentifier(v.expression) && v.expression.text === 'String' && v.arguments.length === 1 && ts.isIdentifier(bare(v.arguments[0])) ? bare(v.arguments[0]).text : null;
            const checkedWhole = named !== null && nodesOf(page).some((n) => ts.isCallExpression(n) && /^Number\.isSafeInteger$/.test(n.expression.getText()) && n.arguments[0] !== undefined && bare(n.arguments[0]).getText() === named);
            if (named === null || !checkedWhole) fail('Z9', `${where(page, e)}: the value after ${e.text} is ${J(v?.getText().slice(0, 50) ?? null)}; it is String( of a name scrollback.ts checks with Number.isSafeInteger(, so no number tmux cannot read is ever sent (build/p3371/SPEC.md D9, §14 M1)`);
          }
        }
      }
      for (const { node, text } of codeStringsOf(page)) {
        if (/#\{/.test(text)) fail('Z9', `${where(page, node)} spells a format of its own (${J(text.slice(0, 40))}); the page read's one format is SCREEN_FORMAT, imported from ./read (D15)`);
      }
    }
    const phaseFiles = [...sourcesUnder(join(ROOT, 'src', 'main', 'screen')), ...(existsSync(REMOTE_SCREEN) ? [REMOTE_SCREEN] : [])];
    for (const file of phaseFiles) {
      for (const { node, text } of codeStringsOf(file)) {
        checked('Z9');
        const word = /\b(refresh-client|resize-window|resize-pane|attach-session|new-session|switch-client)\b/.exec(text)?.[1] ?? (text === '-x' || text === '-y' || /(?:^|\s)-[xy](?:\s|$)/.test(text) ? text.trim() : null);
        if (word !== null) fail('Z9', `${where(file, node)} names ${J(word)}. Nothing this phase adds sizes anything: the phone never changes the size of a session on his Mac (his ruling 2, D7)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z10, THE HOLD.
  // -------------------------------------------------------------------------
  const watch = zFile('src/main/screen/watch.ts', 'Z10', Z_OWNER.screen);
  if (watch === null) for (const id of ['Z16', 'Z19', 'Z21']) fail(id, `src/main/screen/watch.ts does not exist. It is ${Z_OWNER.screen}.`);
  {
    const limits = join(DOMAIN, 'door', 'limits.ts');
    const hold = zNumber(watch, 'SCREEN_HOLD_MS');
    const tick = zNumber(watch, 'SCREEN_TICK_MS');
    const local = zNumber(watch, 'SCREEN_LOCAL_READ_DEADLINE_MS');
    const remoteDeadline = zNumber(watch, 'SCREEN_REMOTE_READ_DEADLINE_MS');
    const answerTimeout = zNumber(existsSync(limits) ? limits : null, 'ANSWER_TIMEOUT_MS');
    const stopJoin = zNumber(existsSync(limits) ? limits : null, 'DOOR_STOP_JOIN_MS');
    checked('Z10', 3);
    const missing = Object.entries({ SCREEN_HOLD_MS: hold, SCREEN_TICK_MS: tick, SCREEN_LOCAL_READ_DEADLINE_MS: local, SCREEN_REMOTE_READ_DEADLINE_MS: remoteDeadline, ANSWER_TIMEOUT_MS: answerTimeout, DOOR_STOP_JOIN_MS: stopJoin }).filter(([, v]) => v === null).map(([n]) => n);
    if (missing.length > 0) {
      if (watch !== null) fail('Z10', `the hold's constants are not each one numeric literal declared once: ${missing.join(', ')} (build/p337/SPEC.md §5.3.2)`);
    } else {
      if (!(hold + tick <= answerTimeout - 2_000)) fail('Z10', `SCREEN_HOLD_MS + SCREEN_TICK_MS is ${String(hold + tick)}, and ANSWER_TIMEOUT_MS - 2,000 is ${String(answerTimeout - 2_000)}: a held poll would reach the door's own 404 (D3)`);
      if (!(2 * tick < stopJoin)) fail('Z10', `2 * SCREEN_TICK_MS is ${String(2 * tick)}, not under DOOR_STOP_JOIN_MS (${String(stopJoin)}): a poll under a stopping door would outlive the stop's join (D3, §Attack A7)`);
      if (!(local <= remoteDeadline)) fail('Z10', `SCREEN_LOCAL_READ_DEADLINE_MS (${String(local)}) is over SCREEN_REMOTE_READ_DEADLINE_MS (${String(remoteDeadline)})`);
    }
    if (watch !== null) {
      // EVERY READ RACED AGAINST ITS DEADLINE: each call of the watcher's read
      // (readLocal(, readRemote() sits in a function that races it, through
      // Promise.race( or a local step that does, against the deadline that is
      // its own (the local one for readLocal(, the remote one for readRemote().
      const raced = (fn) => /Promise\.race\(/.test(fn.getText()) || descendantsOf(fn).some((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && functionsNamed(watch, n.expression.text).some((g) => /Promise\.race\(|setTimeout\(/.test(g.getText())));
      const readCalls = callsOf(watch).filter((c) => /^(?:readLocal|readRemote)$/.test(calleeName(c) ?? '') && ts.isIdentifier(c.expression));
      checked('Z10');
      if (readCalls.length === 0) fail('Z10', `${rel(watch)}: no readLocal( or readRemote( call, so nothing of the read's deadline can be read`);
      for (const c of readCalls) {
        checked('Z10');
        let fn = c.parent;
        while (fn !== undefined && !(ts.isFunctionLike(fn) && fn.parent !== undefined && !ts.isCallExpression(fn.parent) && !ts.isConditionalExpression(fn.parent))) fn = fn.parent;
        const own = calleeName(c) === 'readLocal' ? 'SCREEN_LOCAL_READ_DEADLINE_MS' : 'SCREEN_REMOTE_READ_DEADLINE_MS';
        if (fn === undefined || !raced(fn) || !new RegExp(`\\b${own}\\b`).test(fn.getText())) {
          fail('Z10', `${where(watch, c)}: ${calleeName(c)}( is not raced against ${own} in the function that starts it, so a read past its deadline is still waited on (D3, §Attack A7)`);
        }
      }
      // A poll answered from its own timer, whose callback asks closing( and awaits nothing.
      // The callback is read with every local function it reaches, so a tick
      // that hands the poll to a named step is read as the step.
      const timers = callsOf(watch).filter((c) => /^(?:setInterval|setTimeout)$/.test(calleeName(c) ?? '') && c.arguments[0] !== undefined && (ts.isArrowFunction(bare(c.arguments[0])) || ts.isFunctionExpression(bare(c.arguments[0]))));
      const reachOf = (c) => reachedFunctions(watch, bare(c.arguments[0]));
      const pollTimer = timers.find((c) => calleeName(c) === 'setInterval' && reachOf(c).some((f) => /\bclosing\(\)/.test(f.getText())));
      checked('Z10', 2);
      if (pollTimer === undefined) {
        fail('Z10', `${rel(watch)}: no interval's callback asks closing(); a waiting poll is answered from its OWN timer, which asks closing(, the hold's end and the session's latest reading on every tick (D3, §Attack A7)`);
      } else {
        const reached = reachOf(pollTimer);
        const asyncOne = reached.find((f) => f.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) === true || descendantsOf(f).some((n) => ts.isAwaitExpression(n)));
        if (asyncOne !== undefined) fail('Z10', `${where(watch, asyncOne)}: the poll's tick reaches a step that awaits; it never awaits a read, so a remote read in flight can never hold a poll past the door's stop join (D3)`);
        const period = pollTimer.arguments[1]?.getText() ?? '';
        if (period !== 'SCREEN_TICK_MS') fail('Z10', `${where(watch, pollTimer)}: the poll's own timer runs every ${J(period)}; it runs every SCREEN_TICK_MS on this Mac and on another machine alike (D3)`);
        if (!reached.some((f) => /SCREEN_HOLD_MS/.test(f.getText()))) fail('Z10', `${where(watch, pollTimer)}: the poll's tick does not ask the hold's end (SCREEN_HOLD_MS), so a poll could outlive the door's answer timer`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z11, THE ANSWER COMPOSED FIELD BY FIELD.
  // -------------------------------------------------------------------------
  {
    const routes = zFile('src/main/pocket/routes.ts', 'Z11', Z_OWNER.door);
    const fn = routes === null ? null : oneFunction(routes, 'screenOf');
    checked('Z11');
    if (routes !== null && fn === null) fail('Z11', `${rel(routes)} declares no single screenOf; the screen answer is re-composed field by field, so nothing else on the watcher's object can leave (D13)`);
    if (fn !== null) {
      const reach = reachedFunctions(routes, fn);
      const nodes = reach.flatMap((f) => descendantsOf(f));
      for (const n of nodes) {
        if (ts.isSpreadAssignment(n) || ts.isSpreadElement(n)) {
          checked('Z11');
          fail('Z11', `${where(routes, n)}: the screen answer spreads ${J(n.getText().slice(0, 40))}; it is composed field by field, so a field the watcher added cannot ride along`);
        }
        if (ts.isPropertyAssignment(n) && ts.isPropertyAccessExpression(bare(n.initializer)) && /^(?:lines|styles|screen|cursor)$/.test(bare(n.initializer).name.text)) {
          checked('Z11');
          fail('Z11', `${where(routes, n)}: ${J(n.getText().slice(0, 50))} hands the watcher's own ${bare(n.initializer).name.text} on; the arrays and objects are fresh (D13)`);
        }
        if (ts.isCallExpression(n) && /JSON\.parse|structuredClone|Object\.assign/.test(n.expression.getText())) {
          checked('Z11');
          fail('Z11', `${where(routes, n)}: the screen answer is copied with ${n.expression.getText()}; it is composed field by field`);
        }
      }
      // PHASE 337.1 (build/p3371/SPEC.md §5.3.1): the page answer holds the
      // byte cap (and may hold the width, styles and runs caps) in its own
      // composer, so "read once" is read over the SCREEN answer's reach, and a
      // cap read anywhere else in routes.ts is read inside the page answer's
      // reach (scrollbackOf, readScrollbackQuery), once.
      const pageReach = ['scrollbackOf', 'readScrollbackQuery'].flatMap((n) => {
        const f = oneFunction(routes, n);
        return f === null ? [] : reachedFunctions(routes, f);
      });
      for (const cap of ['POCKET_SCREEN_MAX_COLS', 'POCKET_SCREEN_MAX_ROWS', 'POCKET_SCREEN_MAX_STYLES', 'POCKET_SCREEN_MAX_RUNS', 'POCKET_SCREEN_MAX_BYTES']) {
        checked('Z11');
        const imported = importedNames(routes, (s) => /@shared\/ipc\/pocket$/.test(s)).has(cap);
        const all = referencesOf(routes, cap);
        const inScreen = all.filter((r) => reach.some((f) => inside(r, f)));
        const elsewhere = all.filter((r) => !reach.some((f) => inside(r, f)));
        const strays = elsewhere.filter((r) => !pageReach.some((f) => inside(r, f)));
        if (!imported || inScreen.length !== 1) fail('Z11', `${rel(routes)}: ${cap} is ${imported ? `read ${String(inScreen.length)} time(s) by the screen answer` : 'not imported from @shared/ipc/pocket'}; each cap is imported from the contract and read ONCE there (D15)`);
        if (strays.length > 0 || elsewhere.length > pageReach.length) fail('Z11', `${where(routes, strays[0] ?? elsewhere[0])}: ${cap} is read outside the screen answer${strays.length > 0 ? ' and outside the page answer' : ' more often than the page answer has functions'}; a cap is read where an answer is composed, and nowhere else`);
      }
    }
    const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
    const absence = existsSync(contract) ? declaredType(contract, 'PocketScreenAbsence') : null;
    checked('Z11');
    const words = absence === null ? [] : descendantsOf(absence.type ?? absence).filter((n) => ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)).map((n) => n.literal.text).sort();
    if (J(words) !== J(['ended', 'large', 'unreachable'])) fail('Z11', `src/shared/ipc/pocket.ts: PocketScreenAbsence is ${J(words)}; why is exactly ended, unreachable or large (D13)`);
    for (const name of ['POCKET_SCREEN_MAX_COLS', 'POCKET_SCREEN_MAX_ROWS', 'POCKET_SCREEN_MAX_STYLES', 'POCKET_SCREEN_MAX_RUNS', 'POCKET_SCREEN_MAX_BYTES']) {
      const want = { POCKET_SCREEN_MAX_COLS: 512, POCKET_SCREEN_MAX_ROWS: 200, POCKET_SCREEN_MAX_STYLES: 1_024, POCKET_SCREEN_MAX_RUNS: 16_384, POCKET_SCREEN_MAX_BYTES: 1_048_576 }[name];
      checked('Z11');
      const got = existsSync(contract) ? zNumber(contract, name) : null;
      if (got !== want) fail('Z11', `src/shared/ipc/pocket.ts: ${name} is ${String(got)}; it is ${String(want)} (build/p337/SPEC.md §5.2, D15)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z12, THE COMPOSER IS PURE, AND THE MARK IS SPELLED ONCE.
  // -------------------------------------------------------------------------
  {
    const pure = ['sgr', 'cells', 'cell-widths', 'palette', 'compose'].map((b) => [b, zFile(`src/main/screen/${b}.ts`, 'Z12', Z_OWNER.screen)]);
    for (const [base, file] of pure) {
      if (file === null) continue;
      for (const { node, text } of specifiersOf(file)) {
        checked('Z12');
        if (/^(?:node:)?(?:fs|fs\/promises|child_process|net|http|https|dgram)$/.test(text) || /(?:^|\/)(?:tmux|settings|config|agents)(?:\/|$)|registry$/.test(text) || text === 'electron') {
          fail('Z12', `${where(file, node)}: ${base}.ts imports ${text}. The composer reads no clock, no file and no process (build/p337/SPEC.md §5.3.4)`);
        }
        // PHASE 337.1 (build/p3371/SPEC.md §5.3.4): spaceOf hashes the pane id
        // in compose.ts, so node:crypto, which reads no clock, no file and no
        // process, is the one module it may add; watch.ts is never imported
        // (it imports compose.ts).
        if (base === 'compose' && !(text.startsWith('./') || text.startsWith('@shared/') || text === '../activity/screen' || text === '../reply/reader' || text === 'node:crypto')) {
          fail('Z12', `${where(file, node)}: compose.ts imports ${text}; it imports nothing outside src/main/screen and src/shared but ../activity/screen, ../reply/reader and node:crypto (§5.3.4, §Attack A16; build/p3371/SPEC.md §5.3.4)`);
        }
        if (base === 'compose' && /^\.\/watch$/.test(text)) {
          fail('Z12', `${where(file, node)}: compose.ts imports ./watch, which imports compose.ts; spaceOf is declared in compose.ts in screenRevisionOf's construction rather than borrowed (build/p3371/SPEC.md §5.3.4)`);
        }
      }
      for (const c of callsOf(file)) {
        if (/^(?:now|hrtime|setTimeout|setInterval|spawn|execFile|readFileSync|readFile)$/.test(calleeName(c) ?? '') || /^(?:Date\.now|performance\.now|process\.hrtime)/.test(c.expression.getText())) {
          checked('Z12');
          fail('Z12', `${where(file, c)}: ${base}.ts calls ${c.expression.getText()}(; the composer is pure`);
        }
      }
    }
    const compose = pure.find(([b]) => b === 'compose')?.[1] ?? null;
    // PHASE 337.1: composePage is pure as the rest of compose.ts is (the file
    // walk above reads it), and the page reader times it from OUTSIDE, so no
    // clock is read inside it; it is declared once, there.
    if (compose !== null) {
      checked('Z12');
      const pages = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'composePage');
      if (pages.length !== 1 || pages[0].file !== compose) fail('Z12', `composePage is declared ${String(pages.length)} time(s) (${pages.map((d) => rel(d.file)).join(', ')}); ONCE, in compose.ts, where the live screen's pens are read (build/p3371/SPEC.md §5.3.4)`);
      checked('Z12');
      const steps = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'composePageSteps');
      if (steps.length !== 1 || steps[0].file !== compose) fail('Z12', `composePageSteps is declared ${String(steps.length)} time(s) (${steps.map((d) => rel(d.file)).join(', ')}); ONCE, in compose.ts, the page's composition a step at a time (the fix round)`);
    }
    if (compose !== null) {
      checked('Z12');
      const decls = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'windowMarkOf');
      if (decls.length !== 1 || decls[0].file !== compose) fail('Z12', `windowMarkOf is declared ${String(decls.length)} time(s) (${decls.map((d) => rel(d.file)).join(', ')}); ONCE, in compose.ts (§5.3.4)`);
      const sites = sourcesUnder(join(ROOT, 'src', 'main', 'screen')).flatMap((file) => nodesOf(file).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'readBackWindowOf').map((n) => ({ file, n })));
      if (sites.length !== 1 || sites[0].file !== compose) fail('Z12', `src/main/screen calls readBackWindowOf( ${String(sites.length)} time(s); once, inside windowMarkOf in compose.ts, the one spelling of the window's mark`);
    }
    for (const [base, name] of [['cell-widths', null], ['palette', 'SCREEN_PALETTE']]) {
      const file = pure.find(([b]) => b === base)?.[1] ?? null;
      if (file === null) continue;
      checked('Z12');
      const frozen = nodesOf(file).some((n) => ts.isVariableDeclaration(n) && (name === null || (ts.isIdentifier(n.name) && n.name.text === name)) && n.initializer !== undefined && ts.isCallExpression(bare(n.initializer)) && bare(n.initializer).expression.getText() === 'Object.freeze' && (name !== null || (bare(n.initializer).arguments[0] !== undefined && ts.isArrayLiteralExpression(bare(bare(n.initializer).arguments[0])) && bare(bare(n.initializer).arguments[0]).elements.length >= 900)));
      if (!frozen) fail('Z12', `${rel(file)}: ${name ?? 'the width table'} is not a frozen literal${name === null ? ' of the generated ranges (925 at tmux 3.7b)' : ''}; it is data, never computed at run time (D10, D12)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z13, CLOSING HANDED TO THE READ.
  // -------------------------------------------------------------------------
  {
    const server = zFile('src/main/pocket/server.ts', 'Z13', Z_OWNER.door);
    if (server !== null) {
      const calls = callsOf(server).filter((c) => calleeName(c) === 'answer' && /deps\.answer$/.test(c.expression.getText()));
      checked('Z13', 2);
      if (calls.length !== 1 || calls[0].arguments.length !== 3 || !ts.isIdentifier(calls[0].arguments[2])) {
        fail('Z13', `${rel(server)}: deps.answer( is called ${String(calls.length)} time(s)${calls.length === 1 ? ` with ${String(calls[0].arguments.length)} argument(s)` : ''}; once, handed closing as its third, so a held poll ends when the quit starts or this door stops (D3)`);
      } else {
        const name = calls[0].arguments[2].text;
        const decl = descendantsOf(astOf(server)).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer !== undefined && inside(calls[0], n.parent.parent.parent ?? n));
        const body = decl === undefined ? '' : decl.initializer.getText();
        if (!/shuttingDown\(\)/.test(body) || !/stopping\(\)/.test(body)) fail('Z13', `${where(server, calls[0])}: the ${name} handed to the read is ${J(body.slice(0, 60))}; it is refusal 1's own, deps.shuttingDown() || door.stopping() (D3)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z14, THE SCREEN ROW ON /v1/session.
  // -------------------------------------------------------------------------
  {
    const routes = zFile('src/main/pocket/routes.ts', 'Z14', Z_OWNER.door);
    if (routes !== null) {
      const sets = nodesOf(routes).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'screen' && !ts.isArrowFunction(bare(n.initializer)) && !ts.isFunctionExpression(bare(n.initializer)));
      const decls = declarationsOf([routes], 'screenLive');
      checked('Z14', 4);
      const literal = sets.filter((n) => /screenLive/.test(n.initializer.getText()));
      if (literal.length !== 1 || !/^facts\.screen\s*!==\s*undefined\s*&&\s*screenLive\(\s*session\s*\)$/.test(literal[0].initializer.getText().trim())) {
        fail('Z14', `${rel(routes)}: the session answer's screen is set ${String(literal.length)} time(s) from screenLive; ONCE, as facts.screen !== undefined && screenLive(session) (D32)`);
      }
      // The one live partition (conformance:manager T23): the gates' own
      // `live`, and no status literal of this phase's.
      const fn = decls.length === 1 && ts.isFunctionDeclaration(decls[0].n) ? decls[0].n : null;
      const fnText = fn?.body?.getText() ?? '';
      const statusWords = ['running', 'idle', 'needs_input', 'exited', 'restorable', 'unknown', 'discarded'];
      const named = fn === null ? [] : nodesOf(routes).filter((n) => ts.isStringLiteral(n) && statusWords.includes(n.text) && n.pos >= fn.pos && n.end <= fn.end).map((n) => n.text);
      if (fn === null || !/^\{\s*return\s+sessionActionGates\(\s*session\s*,\s*session\.status\s*,\s*DOOR_GATE_ENV\s*\)\.live\s*;\s*\}$/.test(fnText) || named.length > 0) {
        fail('Z14', `${rel(routes)}: screenLive is declared ${String(decls.length)} time(s)${named.length > 0 ? `, naming ${J(named)}` : ''}; once, as a function answering sessionActionGates(session, session.status, DOOR_GATE_ENV).live and naming no status (D32, T23)`);
      }
      if (declarationsOf(productionSources(), 'screenLive').length !== 1) fail('Z14', 'screenLive is declared outside routes.ts too; the Screen asks the one partition through one function');
      const watch = zFile('src/main/screen/watch.ts', 'Z14', Z_OWNER.screen);
      if (watch !== null) {
        const asks = nodesOf(watch).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'screenLive');
        const lists = nodesOf(watch).filter((n) => ts.isArrayLiteralExpression(n) && n.elements.filter((e) => ts.isStringLiteral(e) && statusWords.includes(e.text)).length >= 2);
        if (asks.length < 1) fail('Z14', `${rel(watch)}: the watcher never asks screenLive(, so whether a row has a screen is decided somewhere else (D32)`);
        if (lists.length > 0) fail('Z14', `${where(watch, lists[0])}: the watcher holds a list of statuses; it asks screenLive( (T23)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z15, THE WORDS AT ALLOW.
  // -------------------------------------------------------------------------
  {
    const pairing = zFile('src/main/pocket/pairing.ts', 'Z15', Z_OWNER.door);
    checked('Z15', 2);
    if (pairing !== null) {
      const map = nodesOf(pairing).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'WRITE_CLAUSES');
      let init = map === undefined ? undefined : bare(map.initializer);
      if (init !== undefined && ts.isCallExpression(init)) init = bare(init.arguments[0]);
      const clause = init !== undefined && ts.isObjectLiteralExpression(init) ? propOf(init, 'keys') : undefined;
      if (clause === undefined || !ts.isStringLiteralLike(bare(clause)) || bare(clause).text !== 'type into any session as you would at this Mac') {
        fail('Z15', `${rel(pairing)}: WRITE_CLAUSES.keys is ${J(clause?.getText() ?? null)}; it is 'type into any session as you would at this Mac', the plainest true words for a write that can run a command in a shell (D35)`);
      }
    }
    const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
    const honesty = existsSync(contract) ? constNamed(contract, 'POCKET_DOOR_HONESTY') : null;
    const said = honesty === null ? '' : (() => {
      const parts = [];
      const collect = (e) => {
        const b = bare(e);
        if (b !== undefined && ts.isStringLiteralLike(b)) parts.push(b.text);
        else if (b !== undefined && ts.isBinaryExpression(b)) {
          collect(b.left);
          collect(b.right);
        }
      };
      collect(honesty.initializer);
      return parts.join('');
    })();
    // PHASE 337.1 (build/p3371/SPEC.md D21, D35): the phone names the Screen
    // Terminal, so the sentence may name either; Z30 holds its new half.
    if (!/screen|terminal/.test(said) || !/type into/.test(said) || /change nothing else/.test(said)) {
      fail('Z15', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says ${J(said)}; it names the screen (or, since Phase 337.1, the terminal) and typing, and no longer says the phone can change nothing else (D35)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z16, ONE WATCHER A SESSION.
  // -------------------------------------------------------------------------
  if (watch !== null) {
    const text = codeTextOf(watch);
    checked('Z16', 3);
    const maps = nodesOf(watch).filter((n) => ts.isNewExpression(n) && n.expression.getText() === 'Map');
    if (maps.length === 0) fail('Z16', `${rel(watch)}: no Map of entries keyed by session; ONE entry per session with a poll waiting (build/p337/SPEC.md §5.3.2)`);
    // An if on an empty waiting list whose branch deletes the entry, itself or
    // through a local step that deletes from a Map.
    const deleters = new Set(nodesOf(watch).filter((n) => (ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && /\.delete\(/.test(n.getText()) && (ts.isFunctionDeclaration(n) || ts.isArrowFunction(bare(n.initializer)))).map((n) => n.name.text));
    const dropped = nodesOf(watch).some(
      (n) =>
        ts.isIfStatement(n) &&
        /(?:size|length)\s*===\s*0|(?:size|length)\s*<\s*1/.test(n.expression.getText()) &&
        descendantsOf(n.thenStatement).some((m) => ts.isCallExpression(m) && (calleeName(m) === 'delete' || (ts.isIdentifier(m.expression) && deleters.has(m.expression.text))))
    );
    if (!dropped) fail('Z16', `${rel(watch)}: no entry is dropped when its last poll is answered (a .delete( guarded by an empty waiting list); nothing is read for a session nobody is looking at`);
    // Four times the last compose, as the literal 4 or a const that is 4.
    const fours = new Set(nodesOf(watch).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && ts.isNumericLiteral(bare(n.initializer)) && Number(bare(n.initializer).text) === 4).map((n) => n.name.text));
    const timesFour = (text) => /\b4\s*\*|\*\s*4\b/.test(text) || [...fours].some((f) => new RegExp(`\\b${f}\\s*\\*|\\*\\s*${f}\\b`).test(text));
    const duty = nodesOf(watch).some((n) => ts.isCallExpression(n) && n.expression.getText() === 'Math.max' && n.arguments.some((a) => /TICK|tick/.test(a.getText())) && n.arguments.some((a) => timesFour(a.getText())));
    if (!duty) fail('Z16', `${rel(watch)}: no duty cycle Math.max( over the tick and four times the last compose (D15): a pathological screen could take main's loop`);
    void text;
  }

  // -------------------------------------------------------------------------
  // Z17, A BLOCK ENDS ONLY ON ITS OWN GUARD.
  // -------------------------------------------------------------------------
  {
    const client = zFile('src/main/tmux/control-client.ts', 'Z17', Z_OWNER.keys);
    const handle = client === null ? null : methodOf(client, 'TmuxControlClient', 'handleLine');
    checked('Z17', 3);
    if (client !== null && handle === null) fail('Z17', `${rel(client)}: TmuxControlClient has no handleLine`);
    if (handle !== null) {
      const closes = descendantsOf(handle).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'closeBlock');
      const guarded = closes.filter((c) => {
        const g = guardingIf(c);
        if (g === null) return false;
        const cond = g.expression.getText();
        return /commandNumber\s*===\s*[A-Za-z_.]+/.test(cond) && /timestamp\s*===\s*[A-Za-z_.]+/.test(cond);
      });
      const inBlock = closes.filter((c) => {
        const g = guardingIf(c);
        return g !== null && /'end'|'command-error'/.test(g.expression.getText());
      });
      if (inBlock.length === 0 || guarded.length !== inBlock.length) {
        fail('Z17', `${where(client, handle)}: inside a block, an end or command-error closes it without comparing its commandNumber AND timestamp with the block's own; a guard-shaped row a screen draws would end another command's answer (build/p337/SPEC.md D8, §14 M3: 20 of 20 at the parent)`);
      }
      const begins = descendantsOf(handle).filter((n) => ts.isObjectLiteralExpression(n) && /event\.commandNumber/.test(n.getText()) && /event\.timestamp/.test(n.getText()));
      if (begins.length === 0) fail('Z17', `${where(client, handle)}: the block does not record its %begin's commandNumber and timestamp, so nothing can be compared`);
      const anyClose = descendantsOf(handle).filter((n) => ts.isIfStatement(n) && /'end'|'command-error'/.test(n.expression.getText()) && /\bblock|open\b/.test(n.expression.getText()) && !/commandNumber/.test(n.expression.getText()));
      if (anyClose.length > 0) fail('Z17', `${where(client, anyClose[0])}: a branch closes the open block on any end or error`);
    }
  }

  // -------------------------------------------------------------------------
  // Z18, THE CAPS ON KEYS, DECLARED ONCE.
  // -------------------------------------------------------------------------
  {
    const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
    for (const [name, want, readers] of [['POCKET_KEYS_MAX_ITEMS', 64, ['src/main/pocket/writes.ts']], ['POCKET_KEYS_MAX_TEXT_BYTES', 1_024, ['src/main/screen/keys.ts']]]) {
      const decls = declarationsOf(sourcesUnder(join(ROOT, 'src')), name);
      checked('Z18', 2);
      if (decls.length !== 1 || decls[0].file !== contract || zNumber(contract, name) !== want) {
        fail('Z18', `${name} is declared ${String(decls.length)} time(s) (${decls.map((d) => rel(d.file)).join(', ')}) as ${String(existsSync(contract) ? zNumber(contract, name) : null)}; it is ${String(want)}, declared ONCE in src/shared/ipc/pocket.ts (build/p337/SPEC.md §5.2)`);
      }
      for (const r of readers) {
        const path = join(ROOT, r);
        if (!existsSync(path)) {
          fail('Z18', `${r} does not exist, so it cannot read ${name}`);
          continue;
        }
        if (!importedNames(path, (s) => /@shared\/ipc\/pocket$/.test(s)).has(name) || referencesOf(path, name).length === 0) fail('Z18', `${r} does not import and read ${name} from the contract; the ${r.endsWith('writes.ts') ? 'parse' : 'verb'} holds the bound it names`);
      }
    }
    const writes = join(DOMAIN, 'writes.ts');
    checked('Z18', 2);
    if (existsSync(writes)) {
      if (zNumber(writes, 'POCKET_WRITE_LEDGER_PER_PHONE') !== 2_048 || zNumber(writes, 'POCKET_WRITE_LEDGER_MAX') !== 8_192) {
        fail('Z18', `${rel(writes)}: the ledger caps are ${String(zNumber(writes, 'POCKET_WRITE_LEDGER_PER_PHONE'))} and ${String(zNumber(writes, 'POCKET_WRITE_LEDGER_MAX'))}; they are 2,048 a phone and 8,192 in all, because a phone types a keys write at most every 100 ms (D24)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z19, THE NONCE MEMORY AND THE ANSWER FLOOR.
  // -------------------------------------------------------------------------
  {
    const pairing = join(DOMAIN, 'pairing.ts');
    const memory = existsSync(pairing) ? zNumber(pairing, 'POCKET_NONCE_MEMORY') : null;
    const skew = existsSync(pairing) ? zNumber(pairing, 'POCKET_CLOCK_SKEW_MS') : null;
    const gap = zNumber(watch, 'SCREEN_MIN_ANSWER_GAP_MS');
    checked('Z19', 3);
    if (memory !== 4_096) fail('Z19', `src/main/pocket/pairing.ts: POCKET_NONCE_MEMORY is ${String(memory)}; it is 4,096 (build/p337/SPEC.md D40)`);
    // PHASE 337.1 (build/p3371/SPEC.md D29): a phone on a Terminal also asks
    // up to one page a SCROLLBACK_MIN_GAP_MS (the Mac's own floor) and one
    // status re-read a second, so the budget is 4 + 20 + 4 + 1 = 29 a second.
    const pageGap = zNumber(existsSync(SCROLLBACK) ? SCROLLBACK : null, 'SCROLLBACK_MIN_GAP_MS');
    checked('Z19');
    if (pageGap === null) fail('Z19', `src/main/screen/scrollback.ts declares no single numeric SCROLLBACK_MIN_GAP_MS, so the page term of the nonce budget cannot be read (build/p3371/SPEC.md D29). It is ${Z_OWNER.screen3371}.`);
    else if (!(pageGap >= 250)) fail('Z19', `SCROLLBACK_MIN_GAP_MS is ${String(pageGap)}; it is at least 250, the floor the nonce budget assumes (build/p3371/SPEC.md D14, D29)`);
    if (gap !== 250) {
      if (watch !== null) fail('Z19', `${rel(watch)}: SCREEN_MIN_ANSWER_GAP_MS is ${String(gap)}; it is 250, declared once (D40)`);
    } else if (memory !== null && skew !== null) {
      const pages = pageGap === null || pageGap <= 0 ? Infinity : 1000 / pageGap;
      const need = (2 * skew / 1000) * (1000 / gap + 20 + pages + 1);
      if (!(memory >= need)) fail('Z19', `POCKET_NONCE_MEMORY (${String(memory)}) is under (2 * POCKET_CLOCK_SKEW_MS / 1000) * (1000 / SCREEN_MIN_ANSWER_GAP_MS + 20 + 1000 / SCROLLBACK_MIN_GAP_MS + 1) = ${String(need)}: a phone's own traffic (polls, keys, pages and the status re-read) would evict a nonce still inside its window (build/p3371/SPEC.md D29)`);
    }
    if (watch !== null) {
      const compares = referencesOf(watch, 'SCREEN_MIN_ANSWER_GAP_MS').filter((r) => {
        for (let p = r.parent; p !== undefined && !ts.isStatement(p); p = p.parent) {
          if (ts.isBinaryExpression(p) && [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(p.operatorToken.kind)) return true;
          if (ts.isCallExpression(p) && /Math\.(?:max|min)$/.test(p.expression.getText())) return true;
        }
        return false;
      });
      checked('Z19');
      if (compares.length === 0) fail('Z19', `${rel(watch)}: SCREEN_MIN_ANSWER_GAP_MS is never measured against a poll's arrival, so a spinner is answered ten times a second to each phone (D40)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z21, THE SETTLE AND THE SLOT.
  // -------------------------------------------------------------------------
  if (watch !== null) {
    const settle = zNumber(watch, 'SCREEN_SETTLE_MS');
    const nudgeMs = zNumber(watch, 'SCREEN_NUDGE_MS');
    checked('Z21', 4);
    if (settle !== 300 || nudgeMs === null || !(settle > nudgeMs)) fail('Z21', `${rel(watch)}: SCREEN_SETTLE_MS is ${String(settle)} and SCREEN_NUDGE_MS ${String(nudgeMs)}; the settle is 300 and longer than the nudge (D4)`);
    const nudge = verbOf(watch, 'createScreenWatch', 'nudge');
    if (nudge === null || nudge.parameters.length !== 2) {
      fail('Z21', `${rel(watch)}: createScreenWatch answers no nudge(sessionId, before); the keys write hands the window mark of its own fresh read, so the answer waits for the redraw (D4, §Attack A6)`);
    }
    const text = codeTextOf(watch);
    // The settle ends on a read whose window mark is not the nudge's `before`,
    // or on one SCREEN_SETTLE_MS after it; the mark is windowMarkOf('s, in the
    // watcher or in the composed screen it reads.
    const comparesBefore = nodesOf(watch).some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken && /\bbefore\b/.test(n.getText()) && /mark/i.test(n.getText()));
    const settleTimed = referencesOf(watch, 'SCREEN_SETTLE_MS').some((r) => {
      for (let p = r.parent; p !== undefined && !ts.isStatement(p); p = p.parent) if (ts.isBinaryExpression(p) && [ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanToken].includes(p.operatorToken.kind)) return true;
      return false;
    });
    const composeFile = join(ROOT, 'src', 'main', 'screen', 'compose.ts');
    const markIsWindow = /windowMarkOf\(/.test(text) || (existsSync(composeFile) && /\bmark\s*[:=]\s*windowMarkOf\(/.test(codeTextOf(composeFile)));
    if (!comparesBefore || !settleTimed || !markIsWindow) {
      fail('Z21', `${rel(watch)}: a settling session is not answered only by a read whose window mark (windowMarkOf() differs from the nudge's before${comparesBefore ? '' : ' [no mark compared with before]'}, or by a read SCREEN_SETTLE_MS after it${settleTimed ? '' : ' [SCREEN_SETTLE_MS never compared]'}${markIsWindow ? '' : ' [the mark is not windowMarkOf(]'} (D4, §Attack A6)`);
    }
    // One read in flight: a set taken before the read, asked before a read
    // starts, and given back when the read SETTLES (a .then( or .finally( on
    // it, or a finally), whether or not it settled in time.
    const flightSets = nodesOf(watch).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'add' && /inFlight|reading|busy/i.test(n.expression.getText())).map((n) => n.expression.expression.getText());
    const name = flightSets[0];
    // Asked where a read STARTS: in the function that starts the read (the
    // one calling readLocal( or readRemote(, or the one calling it), an if on
    // the slot that returns, before the start. A has( elsewhere (a prune) is
    // not the guard.
    const starters = nodesOf(watch).filter((n) => (ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && (ts.isFunctionDeclaration(n) || (n.initializer !== undefined && ts.isArrowFunction(bare(n.initializer)))) && /\b(?:readLocal|readRemote)\(/.test(n.getText())).map((n) => n.name.text);
    const startCalls = nodesOf(watch).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (starters.includes(n.expression.text) || /^(?:readLocal|readRemote)$/.test(n.expression.text)));
    const asked = name !== undefined && startCalls.some((c) => {
      let fn = c.parent;
      while (fn !== undefined && !ts.isFunctionLike(fn)) fn = fn.parent;
      if (fn === undefined) return false;
      return descendantsOf(fn).some((n) => ts.isIfStatement(n) && n.getStart() < c.getStart() && new RegExp(`\\b${name}\\.has\\(`).test(n.expression.getText()) && !new RegExp(`!\\s*${name}\\.has\\(`).test(n.expression.getText()) && descendantsOf(n.thenStatement).some((m) => ts.isReturnStatement(m)));
    });
    const givenBack = name !== undefined && nodesOf(watch).some((n) => ts.isCallExpression(n) && calleeName(n) === 'delete' && n.expression.getText() === `${name}.delete` && (() => {
      for (let p = n.parent; p !== undefined; p = p.parent) {
        if (ts.isCallExpression(p) && /\.(?:then|finally)$/.test(p.expression.getText())) return true;
        if (ts.isTryStatement(p.parent ?? p) && (p.parent ?? p).finallyBlock === p) return true;
      }
      return false;
    })());
    if (!asked || !givenBack) fail('Z21', `${rel(watch)}: no read slot (${String(name ?? 'none')}) is asked before a read starts and given back only when the read settles; reads of one session could overlap (D3, §Attack A7)`);
  }

  // -------------------------------------------------------------------------
  // Z22, THE LOG LINE, BOUNDED.
  // -------------------------------------------------------------------------
  {
    const writes = zFile('src/main/pocket/writes.ts', 'Z22', Z_OWNER.door);
    if (writes !== null) {
      const quiet = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'KEYS_LOG_QUIET_MS');
      checked('Z22', 3);
      if (quiet.length !== 1 || quiet[0].file !== writes || zNumber(writes, 'KEYS_LOG_QUIET_MS') !== 60_000) {
        fail('Z22', `KEYS_LOG_QUIET_MS is declared ${String(quiet.length)} time(s) with ${String(zNumber(writes, 'KEYS_LOG_QUIET_MS'))}; 60,000, once, in writes.ts (build/p337/SPEC.md D43)`);
      }
      const logs = callsOf(writes).filter((c) => /^(?:debug|info|warn|error|log)$/.test(calleeName(c) ?? '') && /log/i.test(ts.isPropertyAccessExpression(c.expression) ? c.expression.expression.getText() : ''));
      if (logs.length !== 1) {
        fail('Z22', `${rel(writes)} makes ${String(logs.length)} log call(s); one, as Phase 317 left it`);
      } else {
        const g = guardingIf(logs[0]);
        const cond = g === null ? null : g.expression;
        const helperText = cond === null ? '' : descendantsOf(cond).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression)).map((c) => functionsNamed(writes, c.expression.text).map((f) => f.getText()).join('\n')).join('\n');
        const all = `${cond?.getText() ?? ''}\n${helperText}`;
        if (cond === null) {
          fail('Z22', `${where(writes, logs[0])}: the one log line is written for every write; a keys write answered done is logged only when it is the session's first done keys write for KEYS_LOG_QUIET_MS, or typing rotates the diagnosis log out in about twenty minutes (D43, §Attack A11)`);
        } else if (!/KEYS_LOG_QUIET_MS/.test(all) || !/'keys'/.test(all) || !/'done'/.test(all)) {
          fail('Z22', `${where(writes, g)}: the log line's condition (${J(cond.getText().slice(0, 80))}) does not read the keys verb, the done outcome and KEYS_LOG_QUIET_MS; every other verb and outcome is logged every time, and only a keys done is quieted (D43)`);
        } else if (g.elseStatement !== undefined) {
          fail('Z22', `${where(writes, g)}: the log line's condition has an else arm; it decides whether the one line is written and nothing else`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Z23 to Z30 — the Screen scrolls back (Phase 337.1, build/p3371/SPEC.md §6.1)
// ---------------------------------------------------------------------------

/**
 * THE SCREEN SCROLLS BACK, AND TWO OF 337'S RULES GET A GATE. Phase 337.1 adds
 * ONE signed read, `GET /v1/scrollback`, answered at once and never held, a
 * page reader in main (`src/main/screen/scrollback.ts`), an eighth display
 * field (`#{history_size}`), a `depth` and a `space` on every live picture,
 * and a three-command far read. And the main session folded into it two of
 * 337's rules that only a vitest held: D5's agreement and pane clause, and the
 * 400 ms remote cadence.
 *
 * Two of these rules DRIVE the shipping code in-process rather than only read
 * it (Z23's readScreenLocal and splitRemoteRead, Z24's tickOf), because each
 * is a rule about what a function ANSWERS, and a reading of its text can be
 * satisfied by a spelling nobody has written yet. They load the module through
 * the TypeScript compiler's own transpiler, with the modules that would reach
 * tmux or another machine stood in by objects that throw, so nothing is
 * started, nothing is opened and nothing under the person's home is read.
 */

/** Is `name` exported from `file`, by its declaration's modifier or an `export { … }`? */
function zExported(file, name) {
  for (const n of nodesOf(file)) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === name && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) {
      const stmt = n.parent?.parent;
      if (stmt !== undefined && ts.isVariableStatement(stmt) && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
    }
    if (ts.isExportDeclaration(n) && n.moduleSpecifier === undefined && n.exportClause !== undefined && ts.isNamedExports(n.exportClause)) {
      if (n.exportClause.elements.some((e) => e.name.text === name)) return true;
    }
  }
  return false;
}

/** The one expression a function answers: an arrow's expression body, or its one own return. */
function zAnswered(fn) {
  if (fn === null || fn === undefined) return null;
  if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return bare(fn.body);
  const rets = ownReturnsOf(fn).filter((r) => r.expression !== undefined);
  return rets.length === 1 ? bare(rets[0].expression) : null;
}

/** The operands of an `&&` chain, parentheses taken off. */
function zAnds(e) {
  const b = bare(e);
  if (b !== undefined && ts.isBinaryExpression(b) && b.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return [...zAnds(b.left), ...zAnds(b.right)];
  return [b];
}

/** Every call named `name` inside a list of functions. */
const zCallsIn = (fns, name) => fns.flatMap((f) => descendantsOf(f).filter((n) => ts.isCallExpression(n) && calleeName(n) === name));

/** Is `node` inside a loop that sits inside `fn`? */
function zInLoop(node, fn) {
  for (let p = node.parent; p !== undefined && p !== fn; p = p.parent) {
    if (ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) return true;
  }
  return false;
}

/**
 * A TypeScript module loaded IN THIS PROCESS for a rule to drive: transpiled
 * by the compiler's own transpiler to CommonJS, its relative and `@shared/`
 * imports loaded the same way, Node's built-ins required as they are, and
 * every module named in `stubs` (by its path under `src/`, extension off)
 * answered by the object given, so nothing reaches tmux, a machine or a file.
 * Throws when a module cannot be found or loaded; the rule says so by name.
 */
function zLoad(path, stubs) {
  const cache = new Map();
  const nodeRequire = createRequire(import.meta.url);
  const resolveTs = (from, spec) => {
    let base;
    if (spec.startsWith('@shared/')) base = join(ROOT, 'src', 'shared', spec.slice('@shared/'.length));
    else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
    else return null;
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) if (existsSync(candidate)) return candidate;
    throw new Error(`${relative(ROOT, from)} imports ${spec}, which resolves to no .ts file`);
  };
  const load = (file) => {
    const seen = cache.get(file);
    if (seen !== undefined) return seen.exports;
    const text = readFileSync(file, 'utf8');
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file }).outputText;
    const module = { exports: {} };
    cache.set(file, module);
    const req = (spec) => {
      if (spec === 'electron') return stubs['electron'] ?? {};
      const target = resolveTs(file, spec);
      if (target === null) return nodeRequire(spec);
      const key = relative(join(ROOT, 'src'), target).replace(/\.tsx?$/, '').replace(/\/index$/, '');
      if (Object.prototype.hasOwnProperty.call(stubs, key)) return stubs[key];
      return load(target);
    };
    new Function('require', 'module', 'exports', js)(req, module, module.exports);
    return module.exports;
  };
  return load(path);
}

/** A promise's outcome within one turn of the queue, for a driven async function that awaits only fakes. */
async function zSettle(promise) {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** The five fields D5's agreement compares (build/p3371/SPEC.md D5). */
const AGREE_FIELDS = ['alternate', 'cols', 'history', 'paneId', 'rows'];

/** One display line in SCREEN_FORMAT's eight fields. */
const zDisplay = ({ pane = '%1', cols = 120, rows = 3, x = 0, y = 2, visible = 1, alternate = 0, history = 500 } = {}) =>
  [pane, cols, rows, x, y, visible, alternate, history].map(String).join('\t');

/**
 * Z23, DRIVEN: readScreenLocal over a fake control client. Each case scripts
 * the two displays of each attempt; the read answers its three lines as one
 * statement, so a display line is answered from the script and a capture
 * with its rows.
 */
async function zDriveReadLocal(read) {
  const mod = zLoad(read, {
    'main/tmux': {
      execTmux: () => Promise.reject(new Error('the gate stands in for tmux; nothing is spawned')),
      quoteTmuxArg: (s) => (/^[A-Za-z0-9_%$#{}\-.,:\/=]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`)
    },
    'main/manifest': {}
  });
  const readScreenLocal = mod.readScreenLocal;
  if (typeof readScreenLocal !== 'function') return { error: 'read.ts exports no readScreenLocal' };
  const run = async (displays) => {
    const queue = [...displays];
    let sends = 0;
    let attempts = 0;
    const core = {
      control: {
        connected: true,
        sendCommand: (line) => {
          sends += 1;
          if (/^display-message\b/.test(line)) {
            const next = queue.shift();
            if (next === undefined) return Promise.resolve([zDisplay()]);
            return Promise.resolve([zDisplay(next)]);
          }
          attempts += 1;
          return Promise.resolve(['row one', 'row two', 'row three']);
        }
      },
      listSessions: () => [],
      tmuxIdOf: () => '$1',
      manifest: { getSession: () => undefined },
      activity: { noteUserInput: () => {} }
    };
    const got = await zSettle(readScreenLocal(core, '$1'));
    return { ...got, sends, attempts };
  };
  const out = [];
  // A: the first attempt agrees: one attempt, steady, framed by its second display.
  out.push({ name: 'agree at once', want: { attempts: 1, steady: true, pane: '%1', history: 500 }, got: await run([{}, {}]) });
  // B: the history alone moves under the first attempt, the second agrees.
  out.push({ name: 'history moves once', want: { attempts: 2, steady: true, pane: '%1', history: 520 }, got: await run([{ history: 500 }, { history: 510 }, { history: 520 }, { history: 520 }]) });
  // C to G: each of the five fields disagreeing in BOTH attempts: two attempts and no third, the second's second display served, steady false.
  const moves = {
    paneId: [{ pane: '%1' }, { pane: '%2' }, { pane: '%2' }, { pane: '%3' }],
    cols: [{ cols: 120 }, { cols: 100 }, { cols: 100 }, { cols: 90 }],
    rows: [{ rows: 3 }, { rows: 4 }, { rows: 4 }, { rows: 5 }],
    alternate: [{ alternate: 0 }, { alternate: 1 }, { alternate: 1 }, { alternate: 0 }],
    history: [{ history: 500 }, { history: 600 }, { history: 600 }, { history: 700 }]
  };
  for (const [field, script] of Object.entries(moves)) {
    const last = script[3];
    out.push({
      name: `${field} disagrees twice`,
      want: { attempts: 2, steady: false, pane: last.pane ?? '%1', history: last.history ?? 500 },
      got: await run(script)
    });
  }
  return { cases: out };
}

/** Z23, DRIVEN: splitRemoteRead over three answers, each split by count. */
function zDriveSplitRemote(remote) {
  const throwing = () => {
    throw new Error('the gate stands in for the machine; nothing is reached');
  };
  const mod = zLoad(remote, {
    'main/tmux': { execTmux: () => Promise.reject(new Error('no tmux')), quoteTmuxArg: (s) => s },
    'main/manifest': {},
    'main/machines/exec-plane': { execOn: throwing },
    'main/machines/ready-context': { readyRemoteContext: throwing },
    'main/machines/remote-sessions': { remoteScrollAddress: () => ({ kind: 'gone' }) },
    // scroll-shapes reaches the control client and the supervisor; the far
    // read takes its target pattern alone from it.
    'main/machines/scroll-shapes': { SCROLL_TARGET: /^\$(0|[1-9][0-9]{0,8})$/ }
  });
  const split = mod.splitRemoteRead;
  if (typeof split !== 'function') return { error: 'remote-screen.ts exports no splitRemoteRead' };
  const three = (a, b) => [zDisplay(a), 'row one', 'row two', 'row three', zDisplay(b), ''].join('\n');
  const cases = [];
  const one = (name, stdout, want) => {
    let value;
    try {
      value = split(stdout);
    } catch (err) {
      value = { threw: err instanceof Error ? err.message : String(err) };
    }
    cases.push({ name, want, value });
  };
  one('agreeing displays', three({}, {}), { steady: true });
  for (const [field, a, b] of [['paneId', { pane: '%1' }, { pane: '%2' }], ['history', { history: 500 }, { history: 530 }], ['cols', { cols: 120 }, { cols: 80 }], ['rows', { rows: 3 }, { rows: 4 }], ['alternate', { alternate: 0 }, { alternate: 1 }]]) {
    // The capture's count follows the FIRST display (split by count), so a
    // moved rows field is answered with its own count.
    const rows = a.rows ?? 3;
    const stdout = [zDisplay(a), ...Array.from({ length: rows }, (_, i) => `row ${String(i)}`), zDisplay(b), ''].join('\n');
    one(`${field} disagrees`, stdout, { steady: false });
  }
  return { cases };
}

/**
 * Z24, DRIVEN: tickOf, lifted out of createScreenWatch's closure with every
 * declaration it names from watch.ts, transpiled, and asked about four rows.
 */
function zDriveTickOf(watch) {
  const decls = functionsNamed(watch, 'tickOf');
  if (decls.length !== 1) return { error: `watch.ts declares tickOf ${String(decls.length)} time(s)` };
  const wanted = new Set(['tickOf']);
  const texts = new Map();
  const queue = ['tickOf'];
  const declOf = (name) => nodesOf(watch).find((n) => (ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && n.name.text === name && (ts.isFunctionDeclaration(n) || n.initializer !== undefined));
  while (queue.length > 0) {
    const name = queue.shift();
    const d = declOf(name);
    if (d === undefined) continue;
    const text = ts.isFunctionDeclaration(d) ? d.getText() : `const ${d.getText()};`;
    texts.set(name, text);
    const fn = ts.isFunctionDeclaration(d) ? d : bare(d.initializer);
    const bound = new Set(ts.isFunctionLike(fn) ? fn.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : '')) : []);
    for (const id of descendantsOf(d).filter((n) => ts.isIdentifier(n) && n !== d.name)) {
      if (wanted.has(id.text) || bound.has(id.text)) continue;
      const p = id.parent;
      if (p !== undefined && ((ts.isPropertyAccessExpression(p) && p.name === id) || (ts.isPropertyAssignment(p) && p.name === id) || ts.isTypeReferenceNode(p) || ts.isQualifiedName(p))) continue;
      const decl = declOf(id.text);
      if (decl === undefined) continue;
      // Only module-level literals and the closure's own local functions: a
      // name the factory's deps hand in is not read here.
      const init = ts.isFunctionDeclaration(decl) ? decl : bare(decl.initializer);
      if (!(ts.isFunctionLike(init) || ts.isNumericLiteral(init) || ts.isStringLiteralLike(init))) continue;
      wanted.add(id.text);
      queue.push(id.text);
    }
  }
  const order = [...texts.keys()].reverse();
  const source = `${order.map((n) => texts.get(n)).join('\n')}\nreturn tickOf;`;
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText;
  let tickOf;
  try {
    tickOf = new Function(js)();
  } catch (err) {
    return { error: `tickOf could not be lifted out of watch.ts: ${err instanceof Error ? err.message : String(err)}` };
  }
  const tick = zNumber(watch, 'SCREEN_TICK_MS');
  const far = zNumber(watch, 'SCREEN_TICK_REMOTE_MS');
  const connected = { control: { connected: true } };
  const down = { control: { connected: false } };
  const local = { id: 's1', status: 'running' };
  const remote = { id: 's2', status: 'running', machine: { id: 'm1', label: 'far' } };
  const cases = [
    ['a row on this Mac, the control client connected', connected, local, tick],
    ['a row on another machine, the control client connected', connected, remote, far],
    ['a row on this Mac, the control client down', down, local, far],
    ['a row on another machine, the control client down', down, remote, far],
    ['no core at all', null, local, far]
  ];
  const out = [];
  for (const [name, core, row, want] of cases) {
    let got;
    try {
      got = tickOf(core, row);
    } catch (err) {
      got = `threw: ${err instanceof Error ? err.message : String(err)}`;
    }
    out.push({ name, want, got });
  }
  return { cases: out };
}

async function scrollbackRules() {
  const READ = join(ROOT, 'src', 'main', 'screen', 'read.ts');
  const KEYS = join(ROOT, 'src', 'main', 'screen', 'keys.ts');
  const WATCH = join(ROOT, 'src', 'main', 'screen', 'watch.ts');
  const COMPOSE = join(ROOT, 'src', 'main', 'screen', 'compose.ts');
  const ROUTES = join(DOMAIN, 'routes.ts');
  const CONTRACT = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const screenDomain = [...sourcesUnder(join(ROOT, 'src', 'main', 'screen')), ...(existsSync(REMOTE_SCREEN) ? [REMOTE_SCREEN] : [])];
  const has = (p, id, owner) => {
    if (existsSync(p)) return p;
    fail(id, `${rel(p)} does not exist, so this rule read nothing. It is ${owner} (build/p3371/SPEC.md §10). A gate that passed here would go green on the day the scrollback does not exist.`);
    return null;
  };

  // -------------------------------------------------------------------------
  // Z23, THE TWO DISPLAYS AND THE PANE.
  // -------------------------------------------------------------------------
  {
    const read = has(READ, 'Z23', Z_OWNER.screen3371);
    const decls = declarationsOf(screenDomain, 'agree');
    checked('Z23', 3);
    let agreeFn = null;
    if (decls.length !== 1 || read === null || decls[0].file !== read) {
      fail('Z23', `agree is declared ${String(decls.length)} time(s) (${decls.map((d) => rel(d.file)).join(', ') || 'nowhere'}); ONCE, in src/main/screen/read.ts, the one comparison of two displays (build/p3371/SPEC.md §5.3.2, D5)`);
    } else {
      agreeFn = ts.isFunctionDeclaration(decls[0].n) ? decls[0].n : bare(decls[0].n.initializer);
      if (!zExported(read, 'agree')) fail('Z23', `${where(read, decls[0].n)}: agree is not exported, so scrollback.ts and remote-screen.ts would spell a second comparison (§5.3.2: EXPORTED once for both)`);
      const params = (agreeFn.parameters ?? []).map((p) => (ts.isIdentifier(p.name) ? p.name.text : null));
      const answered = zAnswered(agreeFn);
      const operands = answered === null ? [] : zAnds(answered);
      const fields = [];
      let shapeOk = answered !== null && params.length === 2 && params.every((p) => p !== null);
      for (const o of operands) {
        if (!ts.isBinaryExpression(o) || o.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) {
          shapeOk = false;
          continue;
        }
        const l = bare(o.left);
        const r = bare(o.right);
        if (!ts.isPropertyAccessExpression(l) || !ts.isPropertyAccessExpression(r) || l.name.text !== r.name.text) {
          shapeOk = false;
          continue;
        }
        const sides = [l.expression.getText(), r.expression.getText()].sort();
        if (J(sides) !== J([...params].sort())) shapeOk = false;
        fields.push(l.name.text);
      }
      if (!shapeOk || J([...fields].sort()) !== J(AGREE_FIELDS) || fields.length !== AGREE_FIELDS.length) {
        fail('Z23', `${where(read, agreeFn)}: agree answers ${J(answered?.getText().replace(/\s+/g, ' ').slice(0, 160) ?? null)}; it is ONE && chain of exactly five === comparisons of its two displays, paneId, cols, rows, alternate and history (build/p3371/SPEC.md D5: the history size disagreed in 16 of 400 blocks at a flood, §14 M4)`);
      }
    }
    // The one comparison: readScreenLocal, splitRemoteRead and scrollback.ts call it.
    if (read !== null) {
      const local = oneFunction(read, 'readScreenLocal');
      checked('Z23');
      if (local === null) fail('Z23', `${rel(read)} declares no single readScreenLocal`);
      else if (zCallsIn(reachedFunctions(read, local), 'agree').length === 0) fail('Z23', `${where(read, local)}: readScreenLocal never calls agree(, so its two displays are not compared by the one comparison (D5)`);
    }
    const remote = has(REMOTE_SCREEN, 'Z23', Z_OWNER.screen3371);
    if (remote !== null) {
      const split = oneFunction(remote, 'splitRemoteRead');
      checked('Z23', 2);
      if (!importedNames(remote, (sp) => /(?:^|\/)screen\/read$/.test(sp)).has('agree')) fail('Z23', `${rel(remote)} does not import agree from ../screen/read; the far read compares its two displays by the one comparison (D6)`);
      if (split === null || zCallsIn(reachedFunctions(remote, split), 'agree').length === 0) fail('Z23', `${rel(remote)}: splitRemoteRead does not call agree(, so a far picture is not steady by D5's rule (D6)`);
    }
    const page = has(SCROLLBACK, 'Z23', Z_OWNER.screen3371);
    if (page !== null) {
      checked('Z23', 2);
      if (!importedNames(page, (sp) => /^\.\/read$/.test(sp)).has('agree')) fail('Z23', `${rel(page)} does not import agree from ./read; a page's two displays are compared by the one comparison (build/p3371/SPEC.md D9)`);
      if (callsOf(page).filter((c) => calleeName(c) === 'agree').length === 0) fail('Z23', `${rel(page)} never calls agree(, so a page could be served from two frames (D9)`);
    }
    // NO SECOND SPELLING: no a.F === b.F (or !==) of one of the five fields
    // outside agree, in read.ts, remote-screen.ts or scrollback.ts.
    for (const file of [read, remote, page].filter((f) => f !== null)) {
      for (const n of nodesOf(file)) {
        if (!ts.isBinaryExpression(n) || ![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind)) continue;
        const l = bare(n.left);
        const r = bare(n.right);
        if (!ts.isPropertyAccessExpression(l) || !ts.isPropertyAccessExpression(r) || l.name.text !== r.name.text || !AGREE_FIELDS.includes(l.name.text)) continue;
        if (agreeFn !== null && inside(n, agreeFn)) continue;
        checked('Z23');
        fail('Z23', `${where(file, n)}: ${J(n.getText().slice(0, 60))} compares two displays' ${l.name.text} outside agree; a second spelling of the agreement drifts from the first (§5.3.2)`);
      }
    }
    // readScreenLocal: the attempt exactly twice, never in a loop, the second served.
    if (read !== null) {
      const local = oneFunction(read, 'readScreenLocal');
      if (local !== null) {
        const localArrows = descendantsOf(local).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isArrowFunction(bare(n.initializer)) || ts.isFunctionExpression(bare(n.initializer))));
        const attemptNames = new Set([...localArrows.map((n) => n.name.text), ...nodesOf(read).filter((n) => ts.isFunctionDeclaration(n) && n.name !== undefined && /^attempt/i.test(n.name.text)).map((n) => n.name.text)]);
        const own = localArrows.map((n) => bare(n.initializer));
        const calls = descendantsOf(local).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && attemptNames.has(n.expression.text) && !own.some((f) => inside(n, f)) && !localArrows.some((d) => d.name === n.expression));
        checked('Z23', 3);
        if (calls.length !== 2) fail('Z23', `${where(read, local)}: readScreenLocal calls its attempt ${String(calls.length)} time(s); exactly twice, once and once more on a disagreement, and a second disagreement is served (D5; a third read would wait on a flood)`);
        for (const c of calls) if (zInLoop(c, local)) fail('Z23', `${where(read, c)}: an attempt is called inside a loop; readScreenLocal reads at most twice`);
        const second = calls.length === 2 ? calls[1] : null;
        let holder = null;
        for (let p = second?.parent; p !== undefined && p !== local; p = p.parent) {
          if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
            holder = p.name.text;
            break;
          }
        }
        const served = holder !== null && ownReturnsOf(local).some((r) => r.expression !== undefined && descendantsOf(r.expression).some((n) => ts.isIdentifier(n) && n.text === holder) && !(ts.isBinaryExpression(bare(r.expression)) && /===|!==/.test(bare(r.expression).operatorToken.getText())));
        if (!served) fail('Z23', `${where(read, local)}: no return of readScreenLocal serves the second attempt's reading; a second disagreement is served with the second's values, steady false, never dropped (D5)`);
      }
      // Framed by the attempt's SECOND display, the youngest.
      const displays = nodesOf(read).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'display' && ts.isPropertyAccessExpression(bare(n.initializer)));
      checked('Z23');
      if (displays.length === 0 || displays.some((n) => bare(n.initializer).name.text !== 'second')) {
        fail('Z23', `${rel(read)}: a reading's display is ${J(displays.map((n) => n.initializer.getText()))}; it is the attempt's SECOND display, the youngest, so the keys aim at the pane the read last saw (D5)`);
      }
      const steadyTrue = nodesOf(read).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'steady' && bare(n.initializer).kind === ts.SyntaxKind.TrueKeyword);
      for (const n of steadyTrue) {
        checked('Z23');
        fail('Z23', `${where(read, n)}: a reading is made with steady: true as a literal; steady is what agree( answered for the attempt served (§5.3.2)`);
      }
    }
    // DRIVEN: what readScreenLocal and splitRemoteRead answer.
    if (read !== null) {
      let driven;
      try {
        driven = await zDriveReadLocal(read);
      } catch (err) {
        driven = { error: err instanceof Error ? err.message : String(err) };
      }
      checked('Z23');
      if (driven.error !== undefined) fail('Z23', `readScreenLocal could not be driven in-process: ${driven.error}`);
      else {
        for (const c of driven.cases) {
          checked('Z23');
          const v = c.got.ok ? c.got.value : null;
          const got = { attempts: c.got.attempts, steady: v?.steady ?? null, pane: v?.display?.paneId ?? null, history: v?.display?.history ?? null };
          if (J(got) !== J(c.want)) fail('Z23', `readScreenLocal, driven, "${c.name}": answered ${c.got.ok ? J(got) : `a throw (${String(c.got.error)})`}; it answers ${J(c.want)} (D5: a disagreement on any of the five fields is read once more, a second is served from the second attempt's second display with steady false, and no third read)`);
        }
      }
    }
    if (remote !== null) {
      let driven;
      try {
        driven = zDriveSplitRemote(remote);
      } catch (err) {
        driven = { error: err instanceof Error ? err.message : String(err) };
      }
      checked('Z23');
      if (driven.error !== undefined) fail('Z23', `splitRemoteRead could not be driven in-process: ${driven.error}`);
      else {
        for (const c of driven.cases) {
          checked('Z23');
          const steady = c.value !== null && typeof c.value === 'object' ? c.value.steady : undefined;
          if (steady !== c.want.steady) fail('Z23', `splitRemoteRead, driven, "${c.name}": answered ${J(c.value === null ? null : { steady, threw: c.value.threw })}; a far picture is steady exactly when its two displays agree on the five fields (D6)`);
        }
      }
    }
    // THE KEYS' PANE (D5's pane clause): every -t aims at the fresh reading's display.paneId.
    const keys = has(KEYS, 'Z23', Z_OWNER.keys);
    if (keys !== null) {
      const fresh = nodesOf(keys).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && descendantsOf(n.initializer).some((m) => ts.isCallExpression(m) && calleeName(m) === 'readFresh')).map((n) => n.name.text);
      const isFreshPane = (e) => {
        const b = bare(e);
        return b !== undefined && ts.isPropertyAccessExpression(b) && b.name.text === 'paneId' && ts.isPropertyAccessExpression(b.expression) && b.expression.name.text === 'display' && ts.isIdentifier(b.expression.expression) && fresh.includes(b.expression.expression.text);
      };
      const paneVars = nodesOf(keys).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && isFreshPane(n.initializer)).map((n) => n.name.text);
      checked('Z23', 2);
      if (fresh.length === 0) fail('Z23', `${rel(keys)}: no reading is taken from readFresh(, so the act's pane cannot be the fresh read's`);
      for (const n of nodesOf(keys).filter((m) => ts.isPropertyAccessExpression(m) && m.name.text === 'paneId')) {
        checked('Z23');
        if (!isFreshPane(n)) fail('Z23', `${where(keys, n)}: ${J(n.getText())} names a pane other than the fresh reading's display.paneId; the act aims at the pane the fresh read named and nowhere else (D5)`);
      }
      const targets = [];
      for (const arr of nodesOf(keys).filter((n) => ts.isArrayLiteralExpression(n))) {
        arr.elements.forEach((e, i) => {
          if (ts.isStringLiteral(e) && e.text === '-t') targets.push({ arr, at: i, value: arr.elements[i + 1] });
        });
      }
      if (targets.length === 0) fail('Z23', `${rel(keys)}: no argv names -t, so nothing of the act's pane can be read`);
      for (const t of targets) {
        checked('Z23');
        const v = t.value === undefined ? undefined : bare(t.value);
        if (v === undefined || !ts.isIdentifier(v)) {
          fail('Z23', `${where(keys, t.arr)}: -t is followed by ${J(v?.getText() ?? null)}; it is followed by the fresh reading's pane`);
          continue;
        }
        let fn = t.arr.parent;
        while (fn !== undefined && !ts.isFunctionLike(fn)) fn = fn.parent;
        const at = fn === undefined ? -1 : fn.parameters.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === v.text);
        // Scope first: a parameter of the function holding the argv shadows
        // any const of the same name, so it is read through its call sites.
        if (at === -1) {
          const decl = nodesOf(keys).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === v.text && n.initializer !== undefined && isFreshPane(n.initializer) && n.parent?.parent?.parent !== undefined && inside(t.arr, n.parent.parent.parent));
          if (decl !== undefined) continue;
        }
        const fname = fn === undefined ? null : ts.isFunctionDeclaration(fn) ? fn.name?.text ?? null : enclosingName(descendantsOf(fn)[1] ?? fn);
        const sites = fname === null ? [] : callsOf(keys).filter((c) => ts.isIdentifier(c.expression) && c.expression.text === fname);
        const ok = at !== -1 && sites.length > 0 && sites.every((c) => {
          const a = bare(c.arguments[at]);
          return a !== undefined && ((ts.isIdentifier(a) && paneVars.includes(a.text)) || isFreshPane(a));
        });
        if (!ok) fail('Z23', `${where(keys, t.arr)}: -t ${v.text} is not the fresh reading's display.paneId at every call of ${String(fname)}; the keys write aims at the pane the fresh read's display names (build/p3371/SPEC.md D5, keys.ts:296)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z24, THE CADENCE.
  // -------------------------------------------------------------------------
  {
    const watch = has(WATCH, 'Z24', Z_OWNER.screen);
    if (watch !== null) {
      const tick = zNumber(watch, 'SCREEN_TICK_MS');
      const far = zNumber(watch, 'SCREEN_TICK_REMOTE_MS');
      checked('Z24', 3);
      if (tick !== 100) fail('Z24', `${rel(watch)}: SCREEN_TICK_MS is ${String(tick)}; it is 100, one numeric literal declared once (build/p337/SPEC.md D3)`);
      if (far !== 400) fail('Z24', `${rel(watch)}: SCREEN_TICK_REMOTE_MS is ${String(far)}; it is 400 (build/p337/SPEC.md §Attack A8: an exec to another machine costs ten times a local read)`);
      if (tick !== null && far !== null && !(far >= 4 * tick)) fail('Z24', `SCREEN_TICK_REMOTE_MS (${String(far)}) is under four times SCREEN_TICK_MS (${String(tick)}); a far machine is read at most a quarter as often as this Mac (D36)`);
      const tickOfs = functionsNamed(watch, 'tickOf');
      const tickOfDecls = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'tickOf');
      checked('Z24');
      if (tickOfs.length !== 1 || tickOfDecls.length !== 1) fail('Z24', `tickOf is declared ${String(tickOfDecls.length)} time(s); ONCE, in watch.ts, the one place a read's cadence is decided (D36)`);
      else {
        const driven = zDriveTickOf(watch);
        if (driven.error !== undefined) fail('Z24', `${rel(watch)}: ${driven.error}`);
        else {
          for (const c of driven.cases) {
            checked('Z24');
            if (c.got !== c.want) fail('Z24', `tickOf, driven, for ${c.name}: answered ${J(c.got)}; it answers ${J(c.want)} (SCREEN_TICK_REMOTE_MS for a row with a machine or a core whose control client is not connected, SCREEN_TICK_MS otherwise, D36)`);
          }
        }
        const body = tickOfs[0];
        const scheduleFn = oneFunction(watch, 'schedule');
        // Outside tickOf, SCREEN_TICK_REMOTE_MS is read nowhere, and
        // SCREEN_TICK_MS only as a poll's own interval.
        for (const r of referencesOf(watch, 'SCREEN_TICK_REMOTE_MS')) {
          checked('Z24');
          if (!inside(r, body)) fail('Z24', `${where(watch, r)}: SCREEN_TICK_REMOTE_MS is read outside tickOf; a read's cadence is asked of tickOf( alone`);
        }
        for (const r of referencesOf(watch, 'SCREEN_TICK_MS')) {
          if (inside(r, body)) continue;
          checked('Z24');
          const call = r.parent !== undefined && ts.isCallExpression(r.parent) ? r.parent : null;
          const pollInterval = call !== null && calleeName(call) === 'setInterval' && call.arguments[1] === r;
          if (!pollInterval) fail('Z24', `${where(watch, r)}: SCREEN_TICK_MS is read outside tickOf other than as a poll's own interval (${J(r.parent?.getText().slice(0, 60) ?? '')}); a read is scheduled at tickOf( alone (D36)`);
        }
        // pump, startRead and the answer's freshness test each name tickOf(,
        // and the read loop writes no number but 0 and 1 (a count and an
        // emptiness test), so no cadence is spelled inside it.
        for (const name of ['pump', 'startRead']) {
          const fn = oneFunction(watch, name);
          checked('Z24');
          if (fn === null || !descendantsOf(fn).some((n) => ts.isCallExpression(n) && calleeName(n) === 'tickOf')) fail('Z24', `${rel(watch)}: ${name} ${fn === null ? 'is not declared once' : 'names no tickOf('}; its cadence is tickOf('s (D36)`);
          for (const lit of fn === null ? [] : descendantsOf(fn).filter((n) => ts.isNumericLiteral(n) && !/^[01]$/.test(n.text))) {
            checked('Z24');
            fail('Z24', `${where(watch, lit)}: ${name} writes the number ${lit.text}; no numeric literal paces a read, a tick is tickOf('s (D36)`);
          }
        }
        const answer = verbOf(watch, 'createScreenWatch', 'answer');
        const fresh = answer === null ? [] : descendantsOf(answer).filter((n) => ts.isBinaryExpression(n) && [ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.LessThanToken].includes(n.operatorToken.kind) && /\blatest\b/.test(n.left.getText()));
        checked('Z24');
        if (fresh.length === 0 || fresh.some((n) => !(ts.isCallExpression(bare(n.right)) && calleeName(bare(n.right)) === 'tickOf'))) {
          fail('Z24', `${rel(watch)}: the answer's freshness test (a reading younger than a tick) is ${J(fresh.map((n) => n.getText()))}; it compares against tickOf( (D36)`);
        }
        // No numeric literal schedules a read.
        const schedules = callsOf(watch).filter((c) => ts.isIdentifier(c.expression) && c.expression.text === 'schedule');
        const timers = callsOf(watch).filter((c) => /^(?:setTimeout|setInterval)$/.test(calleeName(c) ?? '') && !(scheduleFn !== null && inside(c, scheduleFn)));
        const nexts = nodesOf(watch).filter((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /\.nextReadAt$/.test(n.left.getText()));
        for (const [what, list, argOf] of [['schedule(', schedules, (c) => c.arguments[1]], ['a timer', timers, (c) => c.arguments[1]], ['nextReadAt =', nexts, (n) => n.right]]) {
          for (const x of list) {
            checked('Z24');
            const arg = argOf(x);
            const lits = arg === undefined ? [] : descendantsOf(arg).filter((n) => ts.isNumericLiteral(n));
            if (lits.length > 0) fail('Z24', `${where(watch, x)}: ${what} is handed ${J(arg.getText().slice(0, 60))}, which holds the number ${lits[0].text}; no numeric literal schedules a read, a tick is tickOf('s and a nudge SCREEN_NUDGE_MS (D36)`);
          }
        }
        // SCREEN_NUDGE_MS: in nudge( alone, or behind the settle.
        const nudge = verbOf(watch, 'createScreenWatch', 'nudge');
        const settleVars = new Set(nodesOf(watch).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && /\bsettles\.get\(/.test(n.initializer.getText())).map((n) => n.name.text));
        const behindSettle = (r) => {
          for (let p = r.parent, child = r; p !== undefined; child = p, p = p.parent) {
            if (ts.isConditionalExpression(p) && p.whenTrue === child && /\bsettles\.has\(/.test(p.condition.getText())) return true;
            if (ts.isIfStatement(p) && p.thenStatement === child) {
              const cond = p.expression.getText();
              if (/\bsettles\.has\(/.test(cond) || [...settleVars].some((v) => new RegExp(`^${v}\\s*!==\\s*undefined$|^${v}$`).test(cond.trim()))) return true;
            }
            if (ts.isFunctionLike(p)) return false;
          }
          return false;
        };
        for (const r of referencesOf(watch, 'SCREEN_NUDGE_MS')) {
          checked('Z24');
          if (nudge !== null && inside(r, nudge)) continue;
          if (behindSettle(r)) continue;
          fail('Z24', `${where(watch, r)}: a read is scheduled at SCREEN_NUDGE_MS outside nudge( and outside the settle (${J(r.parent?.getText().slice(0, 70) ?? '')}); the nudge is 337 D4's ONE named exception, brought forward after a keys write, and a second cannot hide behind it (build/p3371/SPEC.md §Attack B22)`);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z25, THE PAGE ROUTE.
  // -------------------------------------------------------------------------
  {
    const routes = has(ROUTES, 'Z25', Z_OWNER.door3371);
    if (routes !== null) {
      const q = oneFunction(routes, 'readScrollbackQuery');
      checked('Z25');
      if (q === null) fail('Z25', `${rel(routes)} declares no single readScrollbackQuery, the one reader of a page's query (build/p3371/SPEC.md §5.3.1)`);
      else {
        const reach = reachedFunctions(routes, q);
        const nodes = reach.flatMap((f) => descendantsOf(f));
        const literals = new Set(nodes.filter((n) => ts.isStringLiteral(n)).map((n) => n.text));
        // The names, from the reach or a const array it reads.
        const arrays = nodes.filter((n) => ts.isIdentifier(n)).map((n) => constNamed(routes, n.text)).filter((d) => d !== null && ts.isArrayLiteralExpression(bare(d.initializer)));
        for (const d of arrays) for (const e of bare(d.initializer).elements) if (ts.isStringLiteral(e)) literals.add(e.text);
        const NAMES = ['count', 'depth', 'from', 'id', 'keep', 'wrap'];
        checked('Z25', 6);
        const nameLists = [...nodes.filter((n) => ts.isArrayLiteralExpression(n)), ...arrays.map((d) => bare(d.initializer))].map((a) => a.elements.filter((e) => ts.isStringLiteral(e)).map((e) => e.text).sort()).filter((l) => l.length >= 2 && l.every((x) => /^[a-z]+$/.test(x)));
        if (!nameLists.some((l) => J(l) === J(NAMES))) fail('Z25', `${where(routes, q)}: readScrollbackQuery holds no list of exactly id, from, count, depth, wrap and keep (lists read: ${J(nameLists)}); a page's query names those six and nothing else (D7)`);
        for (const word of ['parameter', 'repeated', 'id', 'number', 'range', 'keep']) {
          if (!literals.has(word)) fail('Z25', `${where(routes, q)}: readScrollbackQuery never refuses with ${J(word)}; a refusal is one of the six words, never a value (§5.3.1)`);
        }
        for (const n of nodes) {
          if (n.kind === ts.SyntaxKind.RegularExpressionLiteral || (ts.isNewExpression(n) && n.expression.getText() === 'RegExp') || (ts.isCallExpression(n) && /^(?:RegExp|parseInt|parseFloat)$|^Number\.(?:parseInt|parseFloat)$/.test(n.expression.getText()))) {
            checked('Z25');
            fail('Z25', `${where(routes, n)}: readScrollbackQuery reads with ${J(n.getText().slice(0, 40))}; every number is read by a character walk with no pattern, so a sign, a space, a leading zero or an exponent is refused (D7, R1)`);
          }
        }
        const walks = nodes.some((n) => ts.isBinaryExpression(n) && /^'0'$|^'9'$/.test(n.right.getText()) && /[<>]=?/.test(n.operatorToken.getText())) || nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'charCodeAt');
        checked('Z25');
        if (!walks) fail('Z25', `${where(routes, q)}: no character walk over the digits ('0' to '9', or charCodeAt) in readScrollbackQuery's reach; a number is read one character at a time (D7)`);
        const refs = new Set(nodes.filter((n) => ts.isIdentifier(n)).map((n) => n.text));
        for (const c of ['POCKET_SCROLLBACK_MAX_COUNT', 'POCKET_SCROLLBACK_MAX_INDEX', 'POCKET_SCREEN_MAX_COLS']) {
          checked('Z25');
          if (!refs.has(c) || !importedNames(routes, (sp) => /@shared\/ipc\/pocket$/.test(sp)).has(c)) fail('Z25', `${where(routes, q)}: readScrollbackQuery does not read ${c} from the contract; D7's bounds (count 1 to 128, an index 0 to 100,000, wrap 1 to 512) are the contract's constants, never re-spelled`);
        }
        const sum = nodes.some((n) => ts.isBinaryExpression(n) && [ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanEqualsToken].includes(n.operatorToken.kind) && /\bfrom\b[^<>]*\+[^<>]*\bcount\b|\bcount\b[^<>]*\+[^<>]*\bfrom\b/.test(n.getText()) && /\bdepth\b/.test(n.getText()));
        checked('Z25');
        if (!sum) fail('Z25', `${where(routes, q)}: readScrollbackQuery does not hold from + count <= depth; a page past the top of the phone's own index space is no page (build/p3371/SPEC.md D7, §Attack B1)`);
        const strict = [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken];
        const keepEq = ['top', 'bottom'].every((w) => nodes.some((n) => ts.isBinaryExpression(n) && strict.includes(n.operatorToken.kind) && (n.left.getText() === `'${w}'` || n.right.getText() === `'${w}'`)));
        checked('Z25');
        if (!keepEq) fail('Z25', `${where(routes, q)}: keep is not compared strictly (=== or !==) with 'top' and 'bottom'; it is exactly one of the two words, never cased or trimmed (D7)`);
        for (const n of nodes) {
          if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^(?:toLowerCase|toUpperCase|trim|trimStart|trimEnd|normalize|localeCompare)$/.test(n.expression.name.text)) {
            checked('Z25');
            fail('Z25', `${where(routes, n)}: readScrollbackQuery calls .${n.expression.name.text}(; a query value is compared exactly as the phone sent it (D7)`);
          }
        }
      }
      // The route: null for every refusal, absence, rejection and removal.
      const verb = returnedMethod(routes, 'createPocketRoutes', 'scrollback') ?? verbOf(routes, 'createPocketRoutes', 'scrollback');
      checked('Z25', 5);
      if (verb === null) fail('Z25', `${rel(routes)}: createPocketRoutes answers no scrollback verb (build/p3371/SPEC.md §5.3.1)`);
      else {
        const text = codeOfNode(routes, verb);
        if (!/\breadScrollbackQuery\(/.test(text) || !/!\s*\w+\.ok\)\s*return null|\.ok\s*(?:===|!==)\s*(?:false|true)/.test(text)) fail('Z25', `${where(routes, verb)}: the route does not read its query through readScrollbackQuery( and answer a refusal null (§5.3.1)`);
        if (!/facts\.scrollback\s*===\s*undefined\)\s*return null/.test(text)) fail('Z25', `${where(routes, verb)}: an absent facts.scrollback is not answered null; ABSENT IS THE ROUTE NOT EXISTING (§5.3.1)`);
        const catches = descendantsOf(verb).filter((n) => ts.isCatchClause(n) && /\breturn null\b/.test(n.block.getText()));
        if (catches.length === 0 && !/\.catch\(\s*\(\)\s*=>\s*null\s*\)/.test(text)) fail('Z25', `${where(routes, verb)}: a reader that rejects is not answered null; every page is answered, never left hanging`);
        const lookups = descendantsOf(verb).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'sessionById');
        const firstAwait = descendantsOf(verb).find((n) => ts.isAwaitExpression(n));
        if (lookups.length < 2 || firstAwait === undefined || !lookups.some((c) => c.getStart() > firstAwait.getEnd())) fail('Z25', `${where(routes, verb)}: the session is not looked up again after the read; a session removed while its page was read is answered as an id nobody has (§5.3.1)`);
        if (!/\bscrollbackOf\(/.test(text)) fail('Z25', `${where(routes, verb)}: the page is not re-composed through scrollbackOf(`);
      }
      // scrollbackOf, field by field.
      const of = oneFunction(routes, 'scrollbackOf');
      checked('Z25');
      if (of === null) fail('Z25', `${rel(routes)} declares no single scrollbackOf; the page answer is re-composed field by field (§5.3.1)`);
      else {
        const reach = reachedFunctions(routes, of);
        const nodes = reach.flatMap((f) => descendantsOf(f));
        const text = reach.map((f) => codeOfNode(routes, f)).join('\n');
        for (const n of nodes) {
          if (ts.isSpreadAssignment(n) || ts.isSpreadElement(n)) {
            checked('Z25');
            fail('Z25', `${where(routes, n)}: the page answer spreads ${J(n.getText().slice(0, 40))}; it is composed field by field, so nothing else on the reader's object can leave`);
          }
          if (ts.isPropertyAssignment(n) && ts.isPropertyAccessExpression(bare(n.initializer)) && /^(?:rows|styles)$/.test(bare(n.initializer).name.text)) {
            checked('Z25');
            fail('Z25', `${where(routes, n)}: ${J(n.getText().slice(0, 50))} hands the reader's own ${bare(n.initializer).name.text} on; the arrays are fresh`);
          }
          if (ts.isCallExpression(n) && /JSON\.parse|structuredClone|Object\.assign/.test(n.expression.getText())) {
            checked('Z25');
            fail('Z25', `${where(routes, n)}: the page answer is copied with ${n.expression.getText()}; it is composed field by field`);
          }
        }
        // Read through the module consts the reach names (a sentence map), one level.
        const refs = new Set(nodes.filter((n) => ts.isIdentifier(n)).map((n) => n.text));
        for (const name of [...refs]) {
          const d = constNamed(routes, name);
          if (d !== null && d.initializer !== undefined && !ts.isFunctionLike(bare(d.initializer))) for (const m of descendantsOf(d.initializer)) if (ts.isIdentifier(m)) refs.add(m.text);
        }
        for (const [name, why] of [['SCREEN_ENDED', 'ended'], ['SCREEN_UNREACHABLE', 'unreachable'], ['SCROLLBACK_MOVED', 'moved'], ['SCROLLBACK_BUSY', 'busy'], ['POCKET_SCROLLBACK_MAX_COUNT', 'the row cap'], ['POCKET_SCREEN_MAX_BYTES', 'the byte cap']]) {
          checked('Z25');
          if (!refs.has(name)) fail('Z25', `${where(routes, of)}: scrollbackOf does not read ${name} (${why}); ${/^SCR/.test(name) ? 'why is one of four words with main’s own sentence' : 'the page holds the contract’s cap'} (§5.3.1)`);
        }
        const words = ['ended', 'unreachable', 'moved', 'busy'];
        checked('Z25');
        if (!words.every((w) => nodes.some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && (n.left.getText() === `'${w}'` || n.right.getText() === `'${w}'`)) || nodes.some((n) => ts.isPropertyAssignment(n) && n.name.getText() === w))) {
          fail('Z25', `${where(routes, of)}: why is not compared for equality with ended, unreachable, moved and busy; a word the reader made up never leaves (§5.3.1)`);
        }
        const bounded = /\bfrom\b[^;\n]*\+[^;\n]*\.length[^;\n]*>[^;\n]*\bdepth\b|\.length[^;\n]*\+[^;\n]*\bfrom\b[^;\n]*>[^;\n]*\bdepth\b|\bdepth\b[^;\n]*<[^;\n]*\bfrom\b[^;\n]*\+/.test(text);
        checked('Z25', 4);
        if (!bounded) fail('Z25', `${where(routes, of)}: scrollbackOf does not hold from + rows.length <= depth; rows past the reader's own history size are no page (§5.3.1)`);
        if (!/\bwrap\b/.test(text) || !/\bcells\b/.test(text)) fail('Z25', `${where(routes, of)}: scrollbackOf does not hold every row's cells to at most wrap (§5.3.1)`);
        if (!/isLowerHexOf\(\s*[^,]*space[^,]*,\s*(?:12|SCREEN_REVISION_CHARS|SCREEN_MARK_CHARS|\w*SPACE\w*)\s*\)/.test(text)) fail('Z25', `${where(routes, of)}: scrollbackOf does not read space as 12 lowercase hex, one character at a time (§5.3.1, §Attack B8)`);
        if (!/Buffer\.byteLength\(\s*JSON\.stringify\(/.test(text)) fail('Z25', `${where(routes, of)}: scrollbackOf does not measure the whole answer's bytes against POCKET_SCREEN_MAX_BYTES, as the door will send them`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z26, THE PAGE READ; Z27, THE PAGE'S ROWS; Z29, MOVED.
  // -------------------------------------------------------------------------
  const page = has(SCROLLBACK, 'Z26', Z_OWNER.screen3371);
  if (page === null) {
    for (const id of ['Z27', 'Z29']) fail(id, `src/main/screen/scrollback.ts does not exist. It is ${Z_OWNER.screen3371}.`);
  } else {
    const consts = { SCROLLBACK_OVERSCAN: 128, SCROLLBACK_ATTEMPTS: 3, SCROLLBACK_MIN_GAP_MS: 250, SCROLLBACK_QUEUE_MAX: 4 };
    for (const [name, want] of Object.entries(consts)) {
      const decls = declarationsOf(sourcesUnder(join(ROOT, 'src')), name);
      checked('Z26');
      if (decls.length !== 1 || decls[0].file !== page || zNumber(page, name) !== want) fail('Z26', `${name} is declared ${String(decls.length)} time(s) (${decls.map((d) => rel(d.file)).join(', ')}) as ${String(zNumber(page, name))}; it is ${String(want)}, declared once, in scrollback.ts (build/p3371/SPEC.md §5.3.5)`);
    }
    const farFloor = constNamed(page, 'SCROLLBACK_MIN_GAP_REMOTE_MS');
    checked('Z26');
    if (farFloor === null || bare(farFloor.initializer).getText() !== 'SCREEN_TICK_REMOTE_MS' || !importedNames(page, (sp) => /^\.\/watch$/.test(sp)).has('SCREEN_TICK_REMOTE_MS')) {
      fail('Z26', `${rel(page)}: SCROLLBACK_MIN_GAP_REMOTE_MS is ${J(farFloor?.initializer.getText() ?? null)}; it is SCREEN_TICK_REMOTE_MS, imported from ./watch: a far page costs the far machine an exec, so its floor is the far poll's tick (§Attack B2)`);
    }
    const verb = verbOf(page, 'createScreenScrollback', 'page');
    checked('Z26');
    if (verb === null) {
      fail('Z26', `${rel(page)}: createScreenScrollback answers no page verb (build/p3371/SPEC.md §5.3.5)`);
      for (const id of ['Z27', 'Z29']) fail(id, `${rel(page)}: createScreenScrollback answers no page verb, so nothing of the page could be read`);
    } else {
      const reach = reachedFunctions(page, verb);
      // The factory's own local arrows the verb hands work to are reached
      // through their names; anything in the file the verb's reach never
      // calls is not the page read.
      const nodes = reach.flatMap((f) => descendantsOf(f));
      const text = reach.map((f) => codeOfNode(page, f)).join('\n');
      const refs = new Set(nodes.filter((n) => ts.isIdentifier(n)).map((n) => n.text));
      // (1) The row.
      checked('Z26');
      if (!nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'screenLive')) fail('Z26', `${where(page, verb)}: the page read never asks screenLive( of the row it re-read by id; a session not running is ended, read from the row and never from tmux (§5.3.5 step 1)`);
      // (2) The turn: one in flight, a queue bounded, busy past it.
      const queueGuard = nodes.filter((n) => ts.isIfStatement(n) && /\bSCROLLBACK_QUEUE_MAX\b/.test(n.expression.getText()) && /\bbusy\b|SCROLLBACK_BUSY/.test(n.thenStatement.getText()));
      checked('Z26');
      if (queueGuard.length === 0) fail('Z26', `${where(page, verb)}: no guard answers busy once SCROLLBACK_QUEUE_MAX pages wait on one session; the queue is bounded (build/p3371/SPEC.md D14, §Attack B3)`);
      // (3) The floor: Math.max( of the session's floor and the duty cycle.
      const duty = nodes.some((n) => ts.isCallExpression(n) && n.expression.getText() === 'Math.max' && n.arguments.some((a) => /\bSCREEN_DUTY_FACTOR\b/.test(a.getText())) && n.arguments.some((a) => /SCROLLBACK_MIN_GAP|floor|gap/i.test(a.getText()) && !/\bSCREEN_DUTY_FACTOR\b/.test(a.getText())));
      checked('Z26', 2);
      if (!duty) fail('Z26', `${where(page, verb)}: no Math.max( of the session's floor and SCREEN_DUTY_FACTOR times its last page's compose; a page of per-cell colours composes in tens of ms, so a page starts no sooner than four composes after the last (§Attack B10)`);
      const picks = nodes.some((n) => ts.isConditionalExpression(n) && /\bSCROLLBACK_MIN_GAP_REMOTE_MS\b/.test(n.getText()) && /\bSCROLLBACK_MIN_GAP_MS\b/.test(n.getText()));
      if (!picks || !refs.has('SCROLLBACK_MIN_GAP_REMOTE_MS')) fail('Z26', `${where(page, verb)}: the floor is not chosen as SCROLLBACK_MIN_GAP_REMOTE_MS on another machine and SCROLLBACK_MIN_GAP_MS here (one ?: over both); a far session's floor is the far poll's tick (§Attack B2)`);
      // (4) closing() on a SCREEN_TICK_MS timer, the wait and the exec alike.
      const closingTimers = callsOf(page).filter((c) => /^(?:setInterval|setTimeout)$/.test(calleeName(c) ?? '') && c.arguments[1] !== undefined && bare(c.arguments[1]).getText() === 'SCREEN_TICK_MS' && c.arguments[0] !== undefined && (ts.isArrowFunction(bare(c.arguments[0])) || ts.isFunctionExpression(bare(c.arguments[0]))) && reachedFunctions(page, bare(c.arguments[0])).some((f) => descendantsOf(f).some((m) => ts.isCallExpression(m) && /\bclosing$/.test(m.expression.getText()))));
      checked('Z26', 2);
      if (closingTimers.length === 0 || !importedNames(page, (sp) => /^\.\/watch$/.test(sp)).has('SCREEN_TICK_MS')) fail('Z26', `${rel(page)}: no timer at SCREEN_TICK_MS (imported from ./watch) asks closing(; a page waiting its turn, its floor or its exec answers unreachable within one tick of the door stopping, inside the stop join (build/p3371/SPEC.md D14, §Attack B3)`);
      // EVERY WAIT OF THE PAGE ASKS closing() ON A TICK (§Attack B3): each
      // await in the page verb's own body awaits a local function whose reach
      // holds one of those timers (the turn, the floor and the exec alike).
      const timerHolders = nodesOf(page).filter((n) => ts.isFunctionLike(n) && n.body !== undefined && closingTimers.some((c) => inside(c, n)));
      const reachesTimer = (call) => {
        const callee = ts.isIdentifier(call.expression) ? call.expression.text : null;
        if (callee === null) return false;
        return functionsNamed(page, callee).some((g) => reachedFunctions(page, g).some((f) => timerHolders.includes(f) || timerHolders.some((h) => inside(h, f))));
      };
      const ownAwaits = descendantsOf(verb).filter((n) => ts.isAwaitExpression(n) && (() => {
        for (let p = n.parent; p !== undefined; p = p.parent) {
          if (p === verb) return true;
          if (ts.isFunctionLike(p)) return false;
        }
        return false;
      })());
      checked('Z26');
      if (ownAwaits.length === 0) fail('Z26', `${where(page, verb)}: the page verb awaits nothing, so nothing of its waits can be read`);
      for (const a of ownAwaits) {
        checked('Z26');
        const e = bare(a.expression);
        if (!(ts.isCallExpression(e) && reachesTimer(e))) fail('Z26', `${where(page, a)}: the page awaits ${J(a.getText().slice(0, 70))}, which asks closing() on no SCREEN_TICK_MS timer; a page waiting its turn, its floor or its exec answers unreachable within one tick of the door stopping (build/p3371/SPEC.md D14, §Attack B3)`);
      }

      for (const d of ['SCREEN_LOCAL_READ_DEADLINE_MS', 'SCREEN_REMOTE_READ_DEADLINE_MS']) {
        checked('Z26');
        if (!refs.has(d)) fail('Z26', `${where(page, verb)}: the page read does not race its attempts against ${d}, 337's own deadline (D14)`);
      }
      // (5) The attempts: a loop under SCROLLBACK_ATTEMPTS, closing( first, ONE statement.
      const loops = nodes.filter((n) => (ts.isForStatement(n) && n.condition !== undefined && /\bSCROLLBACK_ATTEMPTS\b/.test(n.condition.getText())) || (ts.isWhileStatement(n) && /\bSCROLLBACK_ATTEMPTS\b/.test(n.expression.getText())));
      checked('Z26', 2);
      let loop = null;
      if (loops.length !== 1) fail('Z26', `${where(page, verb)}: the attempts are ${String(loops.length)} loop(s) bounded by SCROLLBACK_ATTEMPTS; ONE loop of at most SCROLLBACK_ATTEMPTS attempts (D9)`);
      else {
        loop = loops[0];
        const first = descendantsOf(loop.statement).find((n) => ts.isCallExpression(n) && /\bclosing$/.test(n.expression.getText()));
        const reads = descendantsOf(loop.statement).filter((n) => ts.isAwaitExpression(n));
        if (first === undefined || reads.length === 0 || first.getStart() > reads[0].getStart()) fail('Z26', `${where(page, loop)}: an attempt does not ask closing() before it reads; true answers unreachable at once and reads nothing more (§5.3.5 step 3)`);
      }
      // ONE statement, no display-only round: every function of the file
      // that composes a display also composes the capture, and the control
      // client is written to in ONE statement of exactly three lines.
      for (const fn of nodesOf(page).filter((n) => ts.isFunctionLike(n) && n.body !== undefined)) {
        const own = descendantsOf(fn).filter((m) => ts.isStringLiteral(m));
        const displays = own.filter((m) => m.text === 'display-message' || /^display-message /.test(m.text));
        if (displays.length === 0) continue;
        checked('Z26');
        if (!own.some((m) => m.text === 'capture-pane' || /^capture-pane /.test(m.text)) && !descendantsOf(fn).some((m) => ts.isCallExpression(m) && /capture/i.test(calleeName(m) ?? ''))) {
          fail('Z26', `${where(page, fn)}: a display is composed with no capture beside it, a display-only round; an attempt is ONE statement of display, capture and display, numbered by main and never by a separate first read (build/p3371/SPEC.md D9, §Attack B1)`);
        }
      }
      // Over the control client an attempt is ONE statement of three lines:
      // written here, or through read.ts's statementOverControl, the live
      // read's own statement, which then writes exactly three in one.
      const sends = callsOf(page).filter((c) => calleeName(c) === 'sendCommand');
      const statements = new Set(sends.map((c) => statementOf(c)?.statement));
      const viaShared = importedNames(page, (sp) => /^\.\/read$/.test(sp)).has('statementOverControl') && callsOf(page).some((c) => calleeName(c) === 'statementOverControl');
      checked('Z26', 2);
      if (sends.length > 0 && (sends.length !== 3 || statements.size !== 1 || viaShared)) fail('Z26', `${rel(page)} writes ${String(sends.length)} line(s) to the control client in ${String(statements.size)} statement(s)${viaShared ? ' beside read.ts’s statementOverControl' : ''}; an attempt is ONE statement of exactly three lines, with no display-only round before it (D9, §Attack B1)`);
      if (sends.length === 0 && !viaShared) fail('Z26', `${rel(page)} writes no line to the control client and calls no statementOverControl; a page round on this Mac is one control-client statement while the client is connected (D9)`);
      if (viaShared && existsSync(join(ROOT, 'src', 'main', 'screen', 'read.ts'))) {
        const readFile = join(ROOT, 'src', 'main', 'screen', 'read.ts');
        const shared = oneFunction(readFile, 'statementOverControl');
        const own = shared === null ? [] : descendantsOf(shared).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'sendCommand');
        const one = new Set(own.map((c) => statementOf(c)?.statement));
        if (shared === null || own.length !== 3 || one.size !== 1) fail('Z26', `src/main/screen/read.ts: statementOverControl writes ${String(own.length)} line(s) in ${String(one.size)} statement(s); the one statement is exactly three lines, display, capture and display, in one tick (D9)`);
      }
      const spawns = callsOf(page).filter((c) => /^(?:execTmux|spawn|spawnTmux|execFile)$/.test(calleeName(c) ?? ''));
      checked('Z26');
      if (spawns.length > 1) fail('Z26', `${rel(page)} starts ${String(spawns.length)} spawned tmux call(s); with the control client down an attempt is ONE spawned list of the three (D9)`);
      for (const c of spawns) {
        const list = arrayOfArg(page, c.arguments[0]);
        const semis = list === null ? 0 : list.elements.filter((e) => ts.isStringLiteral(e) && e.text === ';').length;
        if (semis !== 2) fail('Z26', `${where(page, c)}: the down path's spawn carries ${String(semis)} ; separator(s); it carries the three commands as ONE ; list (D9)`);
      }
      if (callsOf(page).some((c) => calleeName(c) === 'execOn')) fail('Z26', `${rel(page)} calls execOn( itself; a far page reaches the machine through remote-screen.ts's readScrollbackRemote alone (D10, condition 124)`);
      // h0: the ask's depth first, the previous display's history after.
      const h0s = nodes.filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && /\.depth\b/.test(n.initializer.getText()) && (n.parent.flags & ts.NodeFlags.Let) !== 0).map((n) => n.name.text);
      const h0 = h0s.find((name) => nodes.some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText() === name && /\.history\b/.test(n.right.getText())));
      checked('Z26', 3);
      if (h0 === undefined) fail('Z26', `${where(page, verb)}: no h0 starts as the ask's depth and becomes the previous attempt's display's history; attempt 1 numbers its lines by the phone's newest depth and attempts 2 and 3 by the frame main just read (D9, §Attack B1)`);
      const aExpr = nodes.find((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.MinusToken && h0 !== undefined && bare(n.right).getText() === h0 && /\bSCROLLBACK_OVERSCAN\b/.test(n.left.getText()) && /\bfrom\b/.test(n.left.getText()));
      if (aExpr === undefined) fail('Z26', `${where(page, verb)}: the capture's start is not a = from − SCROLLBACK_OVERSCAN − h0; it may name a line above the oldest on purpose (D9)`);
      for (const n of nodes) {
        if (ts.isCallExpression(n) && n.expression.getText() === 'Math.max' && n.arguments.some((a) => /\bSCROLLBACK_OVERSCAN\b/.test(a.getText()))) {
          checked('Z26');
          fail('Z26', `${where(page, n)}: ${J(n.getText().slice(0, 60))} keeps the start from reaching above the oldest line; that is the read that never served the OLDEST page while output scrolled (§Attack B1: 0 and 1 of 60)`);
        }
      }
      const firstIndex = nodes.some((n) => ts.isCallExpression(n) && n.expression.getText() === 'Math.max' && n.arguments.length === 2 && n.arguments[0].getText() === '0' && ts.isBinaryExpression(bare(n.arguments[1])) && bare(n.arguments[1]).operatorToken.kind === ts.SyntaxKind.PlusToken);
      if (!firstIndex) fail('Z26', `${where(page, verb)}: the capture's first index is not Math.max(0, a + h1); a start above the oldest begins at the oldest, index 0 (D9)`);

      // ---------------------------------------------------------------------
      // Z29, MOVED, AND NOTHING SENT.
      // ---------------------------------------------------------------------
      const movedIfs = nodes.filter((n) => ts.isIfStatement(n) && /\bmoved\b|SCROLLBACK_MOVED/.test(n.thenStatement.getText()));
      const conds = movedIfs.map((n) => n.expression.getText().replace(/\s+/g, ' ')).join(' || ');
      const clauses = [
        ['the alternate screen', /\.alternate\b/],
        ['another width (cols !== wrap)', /\.cols\s*!==\s*[\w.]*wrap\b|\bwrap\s*!==\s*[\w.]*\.cols\b/],
        ['a history below the phone’s depth', /(?:\.history|\bh1)\s*<\s*[\w.]*depth\b|\b[\w.]*depth\s*>\s*(?:[\w.]*\.history|h1)\b/],
        ['a history below the previous attempt’s display', /(?:\.history|\bh1)\s*<\s*(?!\s*[\w.]*depth\b)[\w.]+|\b(?!\w*depth\b)[\w.]+\s*>\s*(?:[\w.]*\.history|h1)\b/],
        ['from at or past the history', /\bfrom\s*>=\s*(?:[\w.]*\.history|h1)\b|(?:[\w.]*\.history|\bh1)\s*<=\s*[\w.]*\bfrom\b/]
      ];
      checked('Z29', clauses.length);
      if (movedIfs.length === 0) fail('Z29', `${where(page, verb)}: no branch of the page read answers moved; a trim, a clear, a rewrap, another width or the alternate screen moves the phone's index space (D12)`);
      for (const [what, re] of clauses) if (!re.test(conds)) fail('Z29', `${where(page, verb)}: moved is not answered for ${what} (the moved branches read ${J(conds.slice(0, 200))}); D12's conditions are read over each attempt's AGREED frame`);
      const composes = nodes.filter((n) => ts.isCallExpression(n) && (calleeName(n) === 'composePage' || calleeName(n) === 'composePageSteps'));
      checked('Z29', 2);
      if (composes.length === 0) fail('Z29', `${where(page, verb)}: the page read never calls composePageSteps( (or composePage()`);
      for (const m of movedIfs) {
        const later = composes.filter((c) => c.getStart() < m.getStart() && statementOf(c) !== undefined);
        // A moved branch after a compose in the SAME function composed first.
        const fnOf = (x) => {
          let p = x.parent;
          while (p !== undefined && !ts.isFunctionLike(p)) p = p.parent;
          return p;
        };
        if (later.some((c) => fnOf(c) === fnOf(m))) fail('Z29', `${where(page, m)}: moved is decided after composePage( in the same function; nothing is composed for a refused attempt (D12)`);
        const branch = m.thenStatement;
        for (const x of descendantsOf(branch)) {
          if (ts.isIdentifier(x) && /^(?:styled|capture|captured|lines|text)$/.test(x.text)) {
            checked('Z29');
            fail('Z29', `${where(page, x)}: the moved branch names ${x.text}; the capture of a refused attempt reaches no answer, log or store (D12)`);
          }
          if (ts.isCallExpression(x) && /^(?:set|push|unshift|add)$/.test(calleeName(x) ?? '') && /capture|styled|rows|lines/i.test(x.getText())) {
            checked('Z29');
            fail('Z29', `${where(page, x)}: the moved branch keeps something of the capture; a refused attempt's capture is dropped unsent and unkept (D12)`);
          }
        }
      }

      // ---------------------------------------------------------------------
      // Z27, THE PAGE'S ROWS (the reader's half).
      // ---------------------------------------------------------------------
      const answers = nodes.filter((n) => ts.isObjectLiteralExpression(n) && propOf(n, 'space') !== undefined && propOf(n, 'rows') !== undefined);
      checked('Z27', 2);
      if (answers.length === 0) fail('Z27', `${where(page, verb)}: no page answer of the reader carries space and rows`);
      for (const a of answers) {
        const sp = bare(propOf(a, 'space'));
        if (sp.kind === ts.SyntaxKind.NullKeyword) continue;
        if (!descendantsOf(sp).some((m) => ts.isCallExpression(m) && calleeName(m) === 'spaceOf') && !(ts.isIdentifier(sp) && nodes.some((m) => ts.isVariableDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === sp.text && m.initializer !== undefined && /\bspaceOf\(/.test(m.initializer.getText())))) {
          fail('Z27', `${where(page, a)}: the page's space is ${J(sp.getText())}; it is spaceOf( over the agreed display's pane, the same hash the live picture carries (§Attack B8)`);
        }
      }
      if (!importedNames(page, (sp) => /^\.\/compose$/.test(sp)).has('spaceOf') || !importedNames(page, (sp) => /^\.\/compose$/.test(sp)).has('composePageSteps')) fail('Z27', `${rel(page)} does not import spaceOf and composePageSteps from ./compose; the page is composed and named by the live screen's own composer, a step at a time (the fix round)`);

      // ---------------------------------------------------------------------
      // Z26, THE COMPOSITION IN STEPS (the 337.1 fix round). A page of per-cell
      // truecolor at 300 columns composed in 80 to 98 ms in ONE block, about
      // three a second while a phone paged, and main's lag rose to a p99 of
      // 62 ms where the phone's door had never cost it more than 30 (Lens 1's
      // measurement beside the parent). The verb composes through
      // composePageSteps and never composePage whole; a function of the file
      // steps the generator (`.next(`), hands the event loop back only behind
      // PAGE_SLICE_MS, and asks closing() after the hand-back; PAGE_SLICE_MS
      // is declared once, here, and is at most 8 ms.
      // ---------------------------------------------------------------------
      {
        checked('Z26', 4);
        const slice = zNumber(page, 'PAGE_SLICE_MS');
        const sliceDecls = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'PAGE_SLICE_MS');
        if (sliceDecls.length !== 1 || sliceDecls[0].file !== page || slice === null || !(slice >= 1 && slice <= 8)) fail('Z26', `PAGE_SLICE_MS is declared ${String(sliceDecls.length)} time(s) as ${String(slice)}; once, in scrollback.ts, at most 8 ms: the most a page's composition holds main before it hands the event loop back (the fix round)`);
        if (!nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'composePageSteps')) fail('Z26', `${where(page, verb)}: the page verb does not compose through composePageSteps(; a page composed whole holds main for the whole of a dense capture (the fix round)`);
        for (const n of nodes) if (ts.isCallExpression(n) && calleeName(n) === 'composePage') fail('Z26', `${where(page, n)}: the page verb composes a page whole with composePage(, in one block; it composes a step at a time (composePageSteps) and hands the loop back between steps (the fix round)`);
        const steppers = nodesOf(page).filter((f) => ts.isFunctionLike(f) && f.body !== undefined && descendantsOf(f).some((m) => ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === 'next'));
        const handsBack = steppers.some((f) =>
          descendantsOf(f).some((i) => {
            if (!ts.isIfStatement(i) || !/\bPAGE_SLICE_MS\b/.test(i.expression.getText())) return false;
            const inner = descendantsOf(i.thenStatement);
            const waits = inner.filter((m) => ts.isAwaitExpression(m));
            const asks = inner.filter((m) => ts.isCallExpression(m) && /\bclosing$/.test(m.expression.getText()));
            return waits.length > 0 && asks.some((c) => c.getStart() > waits[0].getStart());
          })
        );
        if (!handsBack) fail('Z26', `${rel(page)}: no step of the page's composition hands the event loop back once the steps have held it PAGE_SLICE_MS, asking closing() after the hand-back (an await inside an if on PAGE_SLICE_MS, a closing( after it); a dense page then holds main in one block, or outlives the door's stop (the fix round)`);
      }
      const cut = nodes.some((n) => ts.isCallExpression(n) && n.expression.getText() === 'Math.min' && n.getText().includes('- from') || (ts.isCallExpression(n) && n.expression.getText() === 'Math.min' && /-\s*[\w.]*from\b/.test(n.getText())));
      checked('Z27');
      if (!cut) fail('Z27', `${where(page, verb)}: composePage is not asked for min(count, h1 − from) rows; a page is never served from the live screen, rows at indices at or past the history size are not in it (D12)`);
    }
  }
  {
    const compose = has(COMPOSE, 'Z27', Z_OWNER.screen3371);
    const fn = compose === null ? null : oneFunction(compose, 'composePage');
    // The page's composition a step at a time (the fix round): composePage
    // drives the one generator composePageSteps, and the body below is read
    // over everything composePage reaches, the generator included.
    const stepsFn = compose === null ? null : oneFunction(compose, 'composePageSteps');
    checked('Z27', 3);
    if (compose !== null && fn === null) fail('Z27', `${rel(compose)} declares no single composePage (build/p3371/SPEC.md §5.3.4)`);
    if (compose !== null && (stepsFn === null || !ts.isFunctionDeclaration(stepsFn) || stepsFn.asteriskToken === undefined)) fail('Z27', `${rel(compose)} declares no single generator composePageSteps, the page's composition a step at a time (the fix round)`);
    if (fn !== null && stepsFn !== null && !descendantsOf(fn).some((n) => ts.isCallExpression(n) && calleeName(n) === 'composePageSteps')) fail('Z27', `${where(compose, fn)}: composePage does not drive composePageSteps(; a page composed whole and a page composed in steps would be two compositions (the fix round)`);
    if (stepsFn !== null && ts.isFunctionDeclaration(stepsFn)) {
      const loops = descendantsOf(stepsFn).filter((n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n));
      const stops = (l) => descendantsOf(l.statement).some((n) => ts.isYieldExpression(n));
      const pens = loops.find((l) => ts.isForOfStatement(l) && ts.isCallExpression(bare(l.expression)) && calleeName(bare(l.expression)) === 'styledRows');
      const runs = loops.find((l) => ts.isForStatement(l) && /\bwant\b/.test(`${l.initializer?.getText() ?? ''};${l.condition?.getText() ?? ''}`));
      checked('Z27', 3);
      if (pens === undefined || !stops(pens)) fail('Z27', `${where(compose, stepsFn)}: composePageSteps does not stop inside its reading of the pens (a yield in the loop over styledRows(…)); a dense capture is read in one block again (the fix round: 80 to 98 ms)`);
      if (runs === undefined || !stops(runs)) fail('Z27', `${where(compose, stepsFn)}: composePageSteps does not stop inside its building of the asked rows' runs (a yield in the loop over want's rows) (the fix round)`);
      const step = zNumber(compose, 'PAGE_STEP_ROWS');
      if (step === null || !(step >= 1 && step <= 16)) fail('Z27', `${rel(compose)}: PAGE_STEP_ROWS is ${String(step)}; one constant, 1 to 16 rows a stop (the fix round)`);
    }
    if (fn !== null) {
      const reach = reachedFunctions(compose, fn);
      const nodes = reach.flatMap((f) => descendantsOf(f));
      const head = stepsFn ?? fn;
      const first = head.parameters[0] !== undefined && ts.isIdentifier(head.parameters[0].name) ? head.parameters[0].name.text : null;
      const reads = nodes.filter((n) => ts.isCallExpression(n) && (calleeName(n) === 'readStyledRows' || calleeName(n) === 'styledRows'));
      checked('Z27', 4);
      if (reads.length === 0 || !reads.some((c) => c.arguments[0] !== undefined && bare(c.arguments[0]).getText() === first)) {
        fail('Z27', `${where(compose, fn)}: composePage does not read the WHOLE capture's pens (styledRows(${String(first)}) or readStyledRows(${String(first)})); tmux writes each cell's style as a change from the cell before it, across rows, so a row cut before its pens are read can lose its pen (D11)`);
      }
      if (nodes.some((n) => ts.isCallExpression(n) && calleeName(n) === 'composeRows')) fail('Z27', `${where(compose, fn)}: composePage calls composeRows(, which builds runs for every row of the capture; runs are built for the kept rows only, through composeRows' per-row body, shared (§Attack B10)`);
      const keptLoop = nodes.some((n) => (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n)) && /\b(?:from|count|want)\b/.test((ts.isForStatement(n) ? `${n.initializer?.getText() ?? ''};${n.condition?.getText() ?? ''}` : ts.isForOfStatement(n) ? n.expression.getText() : n.expression.getText())));
      if (!keptLoop) fail('Z27', `${where(compose, fn)}: no loop over the asked rows (from, count) builds the runs; the rows it drops cost the reading and not the composing (§Attack B10)`);
      const refs = new Set(nodes.filter((n) => ts.isIdentifier(n)).map((n) => n.text));
      for (const cap of ['POCKET_SCREEN_MAX_STYLES', 'POCKET_SCREEN_MAX_RUNS', 'POCKET_SCREEN_MAX_BYTES']) {
        checked('Z27');
        if (!refs.has(cap)) fail('Z27', `${where(compose, fn)}: composePage does not hold the kept rows to ${cap}; past a cap it keeps the longest run from keep's end that fits (D11)`);
      }
      const keepRead = nodes.some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && /'top'|'bottom'/.test(n.getText()));
      if (!keepRead) fail('Z27', `${where(compose, fn)}: composePage never reads keep ('top' or 'bottom'); an older page keeps its bottom and a newer one its top (D11)`);
    }
  }

  // -------------------------------------------------------------------------
  // Z28, THE LIVE DEPTH AND SPACE.
  // -------------------------------------------------------------------------
  {
    const read = has(READ, 'Z28', Z_OWNER.screen3371);
    if (read !== null) {
      const parse = oneFunction(read, 'parseScreenDisplay');
      checked('Z28', 3);
      if (parse === null) fail('Z28', `${rel(read)} declares no single parseScreenDisplay`);
      else {
        const eight = descendantsOf(parse).some((n) => ts.isBinaryExpression(n) && /\.length$/.test(n.left.getText()) && n.right.getText() === '8' && /^(?:!==|===)$/.test(n.operatorToken.getText()));
        if (!eight) fail('Z28', `${where(read, parse)}: parseScreenDisplay does not read exactly eight fields; the eighth is the history size (D4)`);
        const whole9 = nodesOf(read).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && bare(n.initializer).kind === ts.SyntaxKind.RegularExpressionLiteral && bare(n.initializer).getText() === '/^(0|[1-9][0-9]{0,8})$/').map((n) => n.name.text);
        const used = whole9.some((name) => descendantsOf(parse).some((n) => ts.isIdentifier(n) && n.text === name));
        if (!used) fail('Z28', `${where(read, parse)}: the history field is not read by WHOLE9, /^(0|[1-9][0-9]{0,8})$/, declared once in read.ts: a display that fails to parse fails the whole LIVE read, so a far history deeper than six digits must never cost him the terminal he has today (§Attack B16)`);
        if (!/\bhistory\b/.test(parse.getText())) fail('Z28', `${where(read, parse)}: parseScreenDisplay answers no history`);
      }
    }
    const compose = has(COMPOSE, 'Z28', Z_OWNER.screen3371);
    if (compose !== null) {
      const spaces = declarationsOf(sourcesUnder(join(ROOT, 'src')), 'spaceOf');
      checked('Z28', 2);
      if (spaces.length !== 1 || spaces[0].file !== compose) fail('Z28', `spaceOf is declared ${String(spaces.length)} time(s) (${spaces.map((d) => rel(d.file)).join(', ')}); ONCE, in compose.ts (§5.3.4)`);
      else {
        const fn = oneFunction(compose, 'spaceOf');
        const reachText = fn === null ? '' : reachedFunctions(compose, fn).map((f) => f.getText()).join('\n');
        if (!/'space'/.test(reachText) || !/sha256/.test(reachText) || !/\b12\b/.test(reachText)) fail('Z28', `${rel(compose)}: spaceOf is not 12 lowercase hex of sha256 over the length-prefixed parts 'space' and the pane id (§5.3.4: screenRevisionOf's construction, so no tmux id crosses the wire)`);
      }
      const cs = oneFunction(compose, 'composeScreen');
      checked('Z28', 2);
      if (cs === null) fail('Z28', `${rel(compose)} declares no single composeScreen`);
      else {
        const reach = reachedFunctions(compose, cs);
        const nodes = reach.flatMap((f) => descendantsOf(f));
        const gateOf = (name) => {
          const props = nodes.filter((n) => (ts.isPropertyAssignment(n) && memberName(n) === name) || (ts.isShorthandPropertyAssignment(n) && n.name.text === name));
          const out = [];
          for (const p of props) {
            let init = ts.isShorthandPropertyAssignment(p) ? p.name : bare(p.initializer);
            if (ts.isIdentifier(init)) {
              const d = nodes.find((m) => ts.isVariableDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === init.text && m.initializer !== undefined);
              if (d !== undefined) init = bare(d.initializer);
            }
            if (init.kind === ts.SyntaxKind.NullKeyword) continue;
            if (!ts.isConditionalExpression(init) || bare(init.whenFalse).kind !== ts.SyntaxKind.NullKeyword) {
              out.push({ p, cond: null, value: init.getText() });
              continue;
            }
            let cond = bare(init.condition);
            if (ts.isIdentifier(cond)) {
              const d = nodes.find((m) => ts.isVariableDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === cond.text && m.initializer !== undefined);
              if (d !== undefined) cond = bare(d.initializer);
            }
            out.push({ p, cond: cond.getText().replace(/\s+/g, ' '), value: bare(init.whenTrue).getText() });
          }
          return out;
        };
        const depth = gateOf('depth');
        const space = gateOf('space');
        if (depth.length === 0 || space.length === 0) fail('Z28', `${where(compose, cs)}: composeScreen sets ${depth.length === 0 ? 'no depth' : 'no space'}; the live picture carries both, null together (D3)`);
        for (const g of [...depth, ...space]) {
          if (g.cond === null) {
            fail('Z28', `${where(compose, g.p)}: ${J(g.p.getText().slice(0, 60))} is not "<condition> ? <value> : null"; depth and space are set from the display only when the reading is steady, not the alternate screen, and the history at most POCKET_SCROLLBACK_MAX_INDEX (D3)`);
            continue;
          }
          for (const [what, re] of [['steady', /\bsteady\b/], ['not the alternate screen', /!\s*[\w.]*alternate\b|alternate\s*===\s*false|alternate\s*!==\s*true/], ['the history at most POCKET_SCROLLBACK_MAX_INDEX', /\bPOCKET_SCROLLBACK_MAX_INDEX\b/]]) {
            if (!re.test(g.cond)) fail('Z28', `${where(compose, g.p)}: ${J(g.p.getText().slice(0, 40))} is gated by ${J(g.cond.slice(0, 120))}, which does not ask ${what} (D3, D5)`);
          }
        }
        if (depth.length > 0 && space.length > 0 && J([...new Set(depth.map((g) => g.cond))]) !== J([...new Set(space.map((g) => g.cond))])) {
          fail('Z28', `${where(compose, cs)}: depth is gated by ${J(depth.map((g) => g.cond))} and space by ${J(space.map((g) => g.cond))}; the two are set TOGETHER, so a space never rides a null depth (§Attack B8)`);
        }
        for (const g of depth) if (g.cond !== null && !/\.history\b/.test(g.value)) fail('Z28', `${where(compose, g.p)}: depth is ${J(g.value)}; it is the display's history size`);
        for (const g of space) if (g.cond !== null && !/\bspaceOf\(/.test(g.value)) fail('Z28', `${where(compose, g.p)}: space is ${J(g.value)}; it is spaceOf( over the display's pane`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Z30, THE HONESTY SENTENCE.
  // -------------------------------------------------------------------------
  {
    const honesty = existsSync(CONTRACT) ? constNamed(CONTRACT, 'POCKET_DOOR_HONESTY') : null;
    const parts = [];
    const collect = (e) => {
      const b = bare(e);
      if (b !== undefined && ts.isStringLiteralLike(b)) parts.push(b.text);
      else if (b !== undefined && ts.isBinaryExpression(b)) {
        collect(b.left);
        collect(b.right);
      }
    };
    if (honesty !== null) collect(honesty.initializer);
    const said = parts.join('');
    checked('Z30', 4);
    if (!/session’s terminal shows/.test(said)) fail('Z30', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says ${J(said)}; it names what a session’s terminal shows (D35, his word "Terminal")`);
    if (!/what it printed before/.test(said)) fail('Z30', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says ${J(said)}; it says the phone can see what a session printed BEFORE, which his Phase 316 ruling refused until now (D35)`);
    if (!/type into/.test(said) || !/end a session/.test(said)) fail('Z30', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says ${J(said)}; it still names typing and ending (D35: no write clause moves)`);
    if (/change nothing else/.test(said)) fail('Z30', `src/shared/ipc/pocket.ts: POCKET_DOOR_HONESTY says the phone can change nothing else, which has not been true since Phase 317`);
    const pairing = join(DOMAIN, 'pairing.ts');
    if (existsSync(pairing)) {
      checked('Z30');
      const describe = oneFunction(pairing, 'describePocketDoor');
      const line = describe === null ? '' : codeOfNode(pairing, describe);
      if (!/Answers these and nothing else: \$\{\[\.\.\.fields\.routes\]\.sort\(\)\.join\(', '\)\}/.test(line)) fail('Z30', `${rel(pairing)}: the Allow line's route list is not derived from the hashed fields.routes; it names scrollback because the table does, never by a list written here (D35)`);
      for (const { node, text } of codeStringsOf(pairing)) {
        if (/\bscrollback\b/.test(text)) {
          checked('Z30');
          fail('Z30', `${where(pairing, node)} spells scrollback; the route line is derived from the table, never written (D35)`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SU — a stranger's first run (Phase 333.1, build/p3331/SPEC.md §6.1)
// ---------------------------------------------------------------------------
//
// THE FIRST THING IN TORTIE THAT READS TAILSCALE WITH NO PRESS. A return to the
// Settings window (`pocket:recheck`) reads Tailscale while a refusal a read can
// see finished is pending, and on confirmed fields forks the door process and
// spawns the Funnel child. Three setup presses open Tailscale's download page,
// open the Tailscale app, or write the admin's approval link to the clipboard.
// Each promise that keeps that inside his ruling and refusal 8 is ONE clause:
// the switch as he last left it (r2 §Attack F18), the job asking the predicate
// again (F19, F20), a return forking at most once per press (F5), the program
// he allowed and no other (F6), the harness that opens nothing, and the seam
// that reads Electron's shell only when called (F23). Every clause below is
// read with the TypeScript parser and has its own arm in `ablation:p313`.

const SU_IPC_OWNER = "Phase 333.1 builder main's (src/main/pocket/ipc.ts)";
/** D7 (g): the READ's refusals a return re-checks, and never shields-up. */
const RETURN_READ_SET = ['no-tailscale', 'not-running', 'signed-out'];
/** D11: the three setup words, in this order. */
const SETUP_WORDS = ['get-tailscale', 'open-tailscale', 'copy-admin-link'];
/** POCKET_ROUTE_IDS as it was before this phase (D30): no route moves. */
const ROUTES_BEFORE_3331 = ['pair', 'blocked', 'session', 'turns', 'end', 'choose', 'say', 'sessions', 'screen', 'keys', 'scrollback'];
/** SU9 and conformance:ios av6 (D29): word-bounded, case-insensitive. */
const REFUSED_DRAWN_WORDS = [/\bbeta\b/i, /\btestflight\b/i, /\bremote desktop\b/i, /\bmirror(?:s|ed|ing)?\b/i, /\bstream(?:s|ed|ing)?\b/i, /\bssh\b/i];

const squash = (s) => s.replace(/\s+/g, '');

/** Every member of class PocketHost named `name`: methods, properties and accessors. */
function hostMembers(ipc, name) {
  const out = [];
  for (const n of nodesOf(ipc)) {
    if (!ts.isClassDeclaration(n) || n.name?.text !== 'PocketHost') continue;
    for (const m of n.members) if (memberName(m) === name) out.push(m);
  }
  return out;
}

/** The ONE method of PocketHost named `name`, or null with SU<id> failed by name. */
function oneHostMethod(ipc, name, id) {
  const found = hostMembers(ipc, name);
  checked(id);
  if (found.length === 1 && ts.isMethodDeclaration(found[0]) && found[0].body !== undefined) return found[0];
  fail(id, `PocketHost declares ${name} ${String(found.length)} time(s)${found.length === 1 ? ', not as a method with a body' : ''}; it is ONE method (build/p3331/SPEC.md §5.2.3). It is ${SU_IPC_OWNER}.`);
  return null;
}

/** The PocketHost method a node sits in, by name, or null. */
function hostMethodOf(node) {
  for (let n = node.parent; n !== undefined; n = n.parent) {
    if (ts.isMethodDeclaration(n) && n.name !== undefined && ts.isIdentifier(n.name)) {
      const cls = n.parent;
      return cls !== undefined && ts.isClassDeclaration(cls) && cls.name?.text === 'PocketHost' ? n.name.text : null;
    }
  }
  return null;
}

/** `this.<prop> = <rhs>` everywhere in a file. */
function thisAssigns(file, prop) {
  return nodesOf(file).filter(
    (n) =>
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(n.left) &&
      n.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
      n.left.name.text === prop
  );
}

/**
 * The conditions that must hold for `node` to run, read outward to `stop`
 * (excluded), each squashed: an if's condition for its then-branch, the
 * negation for its else, a ternary's for its true arm, the left of an `&&`
 * for its right, and a case's own expression.
 */
function guardsOf(file, node, stop = null) {
  const out = [];
  for (let n = node; n.parent !== undefined && n !== stop; n = n.parent) {
    const p = n.parent;
    if (p === stop) break;
    if (ts.isIfStatement(p) && p.thenStatement === n) out.push(squash(codeOfNode(file, p.expression)));
    else if (ts.isIfStatement(p) && p.elseStatement === n) out.push(`!(${squash(codeOfNode(file, p.expression))})`);
    else if (ts.isConditionalExpression(p) && p.whenTrue === n) out.push(squash(codeOfNode(file, p.condition)));
    else if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && p.right === n) out.push(squash(codeOfNode(file, p.left)));
    else if (ts.isCaseClause(p)) out.push(`case:${squash(codeOfNode(file, p.expression))}`);
  }
  return out;
}

/** `if (<cond>) return <x>;` (or a one-statement block), as its squashed condition, or null. */
function earlyReturnCond(file, st, wantFalse = false) {
  if (st === undefined || !ts.isIfStatement(st) || st.elseStatement !== undefined) return null;
  const then = st.thenStatement;
  const ret = ts.isReturnStatement(then) ? then : ts.isBlock(then) && then.statements.length === 1 && ts.isReturnStatement(then.statements[0]) ? then.statements[0] : null;
  if (ret === null) return null;
  if (wantFalse && (ret.expression === undefined || ret.expression.kind !== ts.SyntaxKind.FalseKeyword)) return null;
  return squash(codeOfNode(file, st.expression));
}

/** The calls in a subtree whose callee is named `name`. */
const callsIn = (root, name) => descendantsOf(root).filter((n) => ts.isCallExpression(n) && calleeName(n) === name);

/** Is `n` the object-literal value `{ returned: true }` and nothing else? */
function isReturnedTrue(n) {
  return (
    n !== undefined &&
    ts.isObjectLiteralExpression(n) &&
    n.properties.length === 1 &&
    ts.isPropertyAssignment(n.properties[0]) &&
    memberName(n.properties[0]) === 'returned' &&
    n.properties[0].initializer.kind === ts.SyntaxKind.TrueKeyword
  );
}

/** The `if (!on)` branch of setDoor, as the switch rules read it, or undefined. */
function setDoorOffBranch(ipc, setDoor) {
  return nodesOf(ipc).find((n) => ts.isIfStatement(n) && n.pos >= setDoor.pos && n.end <= setDoor.end && /^!\s*on$/.test(codeOfNode(ipc, n.expression).trim()));
}

// ---- SU1, the return ------------------------------------------------------

function returnRule(ipc) {
  const sf = astOf(ipc);
  const at = (n) => n.getStart(sf);

  // (1) ONE rechecks, taking held, holding every clause of D7 in order.
  const rechecks = oneHostMethod(ipc, 'rechecks', 'SU1');
  if (rechecks !== null) {
    const p = rechecks.parameters;
    checked('SU1');
    if (p.length !== 1 || !ts.isIdentifier(p[0].name) || p[0].name.text !== 'held') {
      fail('SU1', `${where(ipc, rechecks)}: rechecks takes (${p.map((x) => x.name.getText(sf)).join(', ')}); it takes ONE parameter, held, the openings the caller's own job holds (0 for a return arriving, 1 inside its own job)`);
    }
    const stmts = rechecks.body.statements;
    const conds = stmts.map((s) => earlyReturnCond(ipc, s, true));
    const CLAUSES = [
      ['a', '(a) the switch', ['this.readStore()?.enabled!==true']],
      ['a2', "(a) the person's own off press in this run (r2 §Attack F18: an off whose save failed leaves the held store saying on)", ['this.switchedOffThisRun']],
      ['b', '(b) the door published', ['this.published()']],
      ['c', '(c) an opening the caller does not hold (a return arriving while a start is queued or waiting on approval)', ['this.opening!==held']],
      ['d', "(d) the funnel not idle (recoverNow's window between its timer and its opening += 1)", ["this.funnelState!=='idle'"]],
      ['e', '(e) a restart armed', ['this.restartCancel!==null']],
      ['f', '(f) the quit', ['pocketShutdownStarted()', 'funnelShutdownStarted()']],
      ['i', '(i) a return that already forked this press (D8b)', ['this.returnForked']]
    ];
    const index = new Map();
    for (const [key, what, texts] of CLAUSES) {
      checked('SU1');
      const k = conds.findIndex((c) => c !== null && texts.every((t) => c.includes(t)));
      if (k === -1) fail('SU1', `${where(ipc, rechecks)}: rechecks() holds no \`if (…${texts.join('…')}…) return false;\`, so clause ${what} is gone and a return reads Tailscale, or forks and spawns, where D7 says it may not`);
      else index.set(key, k);
    }
    checked('SU1', 2);
    // The clause keys by name, because T1 reads a one-letter hex-shaped literal
    // handed to a `get(` as an address.
    const SWITCH = CLAUSES[0][0];
    const OFF_PRESS = CLAUSES[1][0];
    if (index.has(SWITCH) && index.get(SWITCH) !== 0) fail('SU1', `${where(ipc, stmts[index.get(SWITCH)])}: rechecks()'s first statement does not ask the switch; clause (a) comes first, so nothing after it runs for a door that is off`);
    if (index.has(SWITCH) && index.has(OFF_PRESS) && index.get(SWITCH) !== index.get(OFF_PRESS)) fail('SU1', `${where(ipc, rechecks)}: the off press in this run is asked in another statement than the stored switch; both are clause (a), the switch as the person last left it`);
    // (g): the refusal, the read's words or the start's not-approved.
    const conditional = descendantsOf(rechecks.body).find(
      (n) =>
        ts.isConditionalExpression(n) &&
        squash(codeOfNode(ipc, n.condition)) === 'this.readRefusal!==null' &&
        squash(codeOfNode(ipc, n.whenTrue)) === 'RETURN_READ_WORDS.has(this.readRefusal)' &&
        squash(codeOfNode(ipc, n.whenFalse)) === "this.startRefusalWord==='not-approved'"
    );
    checked('SU1');
    let gAt = -1;
    if (conditional === undefined) {
      fail('SU1', `${where(ipc, rechecks)}: rechecks() holds no \`this.readRefusal !== null ? RETURN_READ_WORDS.has(this.readRefusal) : this.startRefusalWord === 'not-approved'\`, so clause (g), which refusals a return re-checks, is not the one D7 pins`);
    } else {
      const home = stmts.findIndex((s) => conditional.pos >= s.pos && conditional.end <= s.end);
      const decl = conditional.parent !== undefined && ts.isVariableDeclaration(conditional.parent) && ts.isIdentifier(conditional.parent.name) ? conditional.parent.name.text : null;
      if (conds[home] !== null) gAt = home;
      else if (decl !== null && conds[home + 1] === `!${decl}`) gAt = home + 1;
      if (gAt === -1) fail('SU1', `${where(ipc, conditional)}: clause (g)'s answer does not end rechecks() with return false when no re-checked refusal is pending`);
    }
    // (h): the last statement, confirmed or pressed in this run.
    const last = stmts[stmts.length - 1];
    const lastText = last !== undefined && ts.isReturnStatement(last) && last.expression !== undefined ? squash(codeOfNode(ipc, last.expression)) : '';
    checked('SU1', 2);
    if (!lastText.includes("pocketConfirmStatus(this.fields()).state==='confirmed'")) fail('SU1', `${where(ipc, rechecks)}: rechecks() does not end by asking the gate (pocketConfirmStatus(this.fields()).state === 'confirmed'), clause (h)`);
    if (!lastText.includes('this.pressedOnThisRun') || !lastText.includes('||')) fail('SU1', `${where(ipc, rechecks)}: rechecks()'s last clause (h) is not \`confirmed || this.pressedOnThisRun\`, so an unconfirmed door is read on a return in a run whose switch nobody pressed, or never in the run that pressed it (D8)`);
    // The order D7 pins: a, b, c, d, e, f, i, g, h.
    const order = ['a', 'b', 'c', 'd', 'e', 'f', 'i'].map((k) => index.get(k)).filter((k) => k !== undefined);
    if (gAt !== -1) order.push(gAt);
    checked('SU1');
    if (order.some((k, j) => j > 0 && k <= order[j - 1])) fail('SU1', `${where(ipc, rechecks)}: rechecks()'s clauses are not in D7's order (a, b, c, d, e, f, i, g, h), which build/p3331/SPEC.md §5.2.3 pins so the gate and the ablations read one text`);
  }

  // (2) RETURN_READ_WORDS: declared once, exactly the three READ words.
  const sets = nodesOf(ipc).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'RETURN_READ_WORDS');
  checked('SU1');
  if (sets.length !== 1) {
    fail('SU1', `${rel(ipc)} declares RETURN_READ_WORDS ${String(sets.length)} time(s); it is declared once, beside RETRIED`);
  } else {
    let init = sets[0].initializer;
    while (init !== undefined && (ts.isAsExpression(init) || ts.isParenthesizedExpression(init))) init = init.expression;
    const list = init !== undefined && ts.isNewExpression(init) && init.arguments?.[0] !== undefined && ts.isArrayLiteralExpression(init.arguments[0]) ? init.arguments[0].elements.map((e) => (ts.isStringLiteralLike(e) ? e.text : null)) : null;
    if (list === null || JSON.stringify([...list].sort()) !== JSON.stringify([...RETURN_READ_SET].sort())) {
      fail('SU1', `${where(ipc, sets[0])}: RETURN_READ_WORDS is ${list === null ? 'not a Set of literals' : JSON.stringify(list)}, not exactly ${JSON.stringify(RETURN_READ_SET)}${list?.includes('shields-up') ? '. shields-up is seen only by a spawn of the Funnel child (funnel.ts), so a return there forks and spawns on every focus (§Attack F4)' : ''}`);
    }
  }

  // (3) status() answers it; recheck asks it twice; nothing else calls it.
  const status = hostMethod(ipc, 'status');
  checked('SU1');
  const answered = status === null ? [] : descendantsOf(status).filter((n) => ts.isPropertyAssignment(n) && memberName(n) === 'rechecks');
  if (answered.length !== 1 || squash(codeOfNode(ipc, answered[0].initializer)) !== 'this.rechecks()') {
    fail('SU1', `${status === null ? rel(ipc) : where(ipc, status)}: status() does not answer rechecks: this.rechecks(). The sheet keeps a first setup's wish on main's one predicate (D7, D17)`);
  }
  let inStatus = 0;
  const inRecheck = [];
  for (const call of callsOf(ipc).filter((c) => calleeName(c) === 'rechecks')) {
    checked('SU1');
    const owner = hostMethodOf(call);
    const text = squash(codeOfNode(ipc, call));
    if (owner === 'status' && text === 'this.rechecks()') inStatus += 1;
    else if (owner === 'recheck') inRecheck.push(text);
    else fail('SU1', `${where(ipc, call)}: ${owner ?? 'module scope'} calls rechecks. It is answered in status() and asked by recheck() and nowhere else, so nothing else starts on its answer`);
  }
  checked('SU1', 2);
  if (inStatus !== 1) fail('SU1', `status() calls this.rechecks() ${String(inStatus)} time(s); once, as the field`);
  if (JSON.stringify([...inRecheck].sort()) !== JSON.stringify(['this.rechecks()', 'this.rechecks(1)'])) {
    fail('SU1', `recheck() asks ${JSON.stringify(inRecheck)}; it asks this.rechecks() once before it queues and this.rechecks(1) once inside its own job (r2 §Attack F19, F20)`);
  }
  for (const n of nodesOf(ipc)) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'rechecks') continue;
    checked('SU1');
    if (!(ts.isCallExpression(n.parent) && n.parent.expression === n)) fail('SU1', `${where(ipc, n)} takes rechecks without calling it, so a caller this rule cannot see can follow`);
  }
  // recheck itself is reached from the registrar's handler alone (arm 9).
  const recheckCalls = callsOf(ipc).filter((c) => calleeName(c) === 'recheck');
  checked('SU1', recheckCalls.length + 1);
  if (recheckCalls.length === 0) fail('SU1', `${rel(ipc)}: nothing calls recheck(), so pocket:recheck reaches no return`);
  for (const call of recheckCalls) {
    const e = call.expression;
    const receiver = ts.isPropertyAccessExpression(e) ? e.expression.getText(sf) : null;
    if (enclosingName(call) !== 'registerPocketIpc' || receiver !== 'host') {
      fail('SU1', `${where(ipc, call)}: recheck() is called from ${enclosingName(call) ?? 'module scope'}. A return is the window coming back to the front, reached through pocket:recheck's handler and nothing else: a status that reads Tailscale is a poll`);
    }
  }

  // (4) returnMayRun (D7b): the stat finds a program, and on confirmed fields
  // it is the program the person allowed.
  const mayRun = oneHostMethod(ipc, 'returnMayRun', 'SU1');
  if (mayRun !== null) {
    const body = squash(codeOfNode(ipc, mayRun.body));
    checked('SU1', 2);
    if (!/\.ok\b/.test(body)) fail('SU1', `${where(ipc, mayRun)}: returnMayRun does not read the stat's .ok, so a return sweeps and reads while nothing is there to read`);
    if (!/\.path===this\.fields\(\)\.funnelProgram/.test(body) || !body.includes('pocketConfirmStatus(')) {
      fail('SU1', `${where(ipc, mayRun)}: returnMayRun does not compare the program's .path with this.fields().funnelProgram on confirmed fields, so a Tailscale that appeared at another pinned path runs on a focus rather than on a press (§Attack F6)`);
    }
  }

  // (5) recheck's shape (D9).
  const recheck = oneHostMethod(ipc, 'recheck', 'SU1');
  if (recheck !== null) {
    const stmts = recheck.body.statements;
    const openingAt = stmts.findIndex((s) => squash(codeOfNode(ipc, s)) === 'this.opening+=1;');
    const seriallyCalls = callsIn(recheck.body, 'serially').filter((c) => ts.isPropertyAccessExpression(c.expression) && c.expression.expression.kind === ts.SyntaxKind.ThisKeyword);
    const seriallyAt = seriallyCalls.length === 0 ? -1 : stmts.findIndex((s) => seriallyCalls[0].pos >= s.pos && seriallyCalls[0].end <= s.end);
    const before = openingAt === -1 ? [] : stmts.slice(0, openingAt);
    const guardsBefore = before.map((s) => earlyReturnCond(ipc, s)).filter((c) => c !== null);
    checked('SU1', 6);
    if (openingAt === -1) fail('SU1', `${where(ipc, recheck)}: recheck() does not hold an opening (this.opening += 1) as a start does, so a second return while its job is queued is queued too rather than dropped`);
    if (!guardsBefore.includes('!this.rechecks()')) fail('SU1', `${where(ipc, recheck)}: recheck() does not return before this.opening += 1 unless rechecks() holds`);
    if (!guardsBefore.some((c) => c.startsWith('!this.returnMayRun('))) fail('SU1', `${where(ipc, recheck)}: recheck() does not return before this.opening += 1 unless returnMayRun(…) holds, so a return sweeps and reads while nothing is there to read (D7b)`);
    if (seriallyCalls.length !== 1) fail('SU1', `${where(ipc, recheck)}: recheck() calls this.serially( ${String(seriallyCalls.length)} time(s); its one job runs inside the switch's one queue`);
    if (openingAt !== -1 && seriallyAt !== -1 && openingAt > seriallyAt) fail('SU1', `${where(ipc, recheck)}: recheck() queues its job before it holds an opening`);
    if (seriallyAt !== -1 && stmts.slice(0, seriallyAt).some((s) => /\bawait\b/.test(codeOfNode(ipc, s)))) fail('SU1', `${where(ipc, recheck)}: recheck() awaits before it queues, so a press can arrive between its predicate and its job`);
    // It counts no press (arm 3).
    for (const call of callsIn(recheck, 'pressed')) {
      checked('SU1');
      fail('SU1', `${where(ipc, call)}: recheck() calls pressed(). A return is not a press: counted as one, it supersedes the start a person's press is running`);
    }
    // Nothing else that starts or reads.
    for (const name of ['startPocketDoor', 'startFunnel', 'start', 'queueStart', 'recoverNow', 'readAtPress', 'sweepAndRead', 'setDoor', 'readTailnet']) {
      for (const call of callsIn(recheck, name)) {
        checked('SU1');
        fail('SU1', `${where(ipc, call)}: recheck() calls ${name}(. It opens only through openNow(…, { returned: true }) on confirmed fields and reads only through readOnReturn on unconfirmed ones`);
      }
    }
    const job = seriallyCalls[0]?.arguments[0];
    if (job !== undefined && (ts.isArrowFunction(job) || ts.isFunctionExpression(job)) && ts.isBlock(job.body)) {
      const first = job.body.statements[0];
      const tried = first !== undefined && ts.isTryStatement(first) ? first : null;
      const jobStmts = tried === null ? job.body.statements : tried.tryBlock.statements;
      checked('SU1', 4);
      if (tried === null || tried.finallyBlock === undefined || !squash(codeOfNode(ipc, tried.finallyBlock)).includes('this.opening-=1')) {
        fail('SU1', `${where(ipc, job)}: recheck()'s job does not give its opening back (this.opening -= 1) in a finally, so one failed read drops every return after it`);
      }
      if (!isLastPressCheck(ipc, jobStmts[0] ?? null)) fail('SU1', `${where(ipc, job)}: recheck()'s job does not begin with \`if (this.superseded(press)) return;\`, so a return whose press is no longer the last one still runs`);
      const second = jobStmts[1];
      const secondCond = earlyReturnCond(ipc, second);
      if (secondCond !== '!this.rechecks(1)') {
        fail('SU1', `${second === undefined ? where(ipc, job) : where(ipc, second)}: the statement right after the superseded check is not \`if (!this.rechecks(1)) return;\` (it is ${JSON.stringify(second === undefined ? '(nothing)' : codeOfNode(ipc, second).replace(/\s+/g, ' ').slice(0, 80))}). A return queued behind a restart whose timer just fired, or behind a close a Remove and an Allow followed, runs a second start while published (r2 §Attack F19, F20)`);
      }
      const firstRunner = [...callsIn(job, 'openNow'), ...callsIn(job, 'readOnReturn')].sort((x, y) => at(x) - at(y))[0];
      const mayRunAgain = callsIn(job, 'returnMayRun').find((c) => second !== undefined && at(c) > second.getEnd() && (firstRunner === undefined || at(c) < at(firstRunner)));
      if (mayRunAgain === undefined) fail('SU1', `${where(ipc, job)}: recheck()'s job does not ask returnMayRun( again after rechecks(1) and before it runs anything, so a program swapped in while the return waited its turn runs on a focus (D7b, D9)`);
      const opens = callsIn(job, 'openNow');
      checked('SU1', 2);
      if (opens.length !== 1) fail('SU1', `${where(ipc, job)}: recheck()'s job calls openNow ${String(opens.length)} time(s); once, on confirmed fields`);
      for (const call of opens) {
        if (!isReturnedTrue(call.arguments[2])) fail('SU1', `${where(ipc, call)}: recheck() calls openNow without exactly { returned: true } as its third argument, so its start cannot stop after not-approved nor count its one fork (D8b, D9)`);
        if (!guardsOf(ipc, call, job).some((g) => g.includes("pocketConfirmStatus(this.fields()).state==='confirmed'"))) fail('SU1', `${where(ipc, call)}: recheck() starts the door on fields the gate does not say are confirmed`);
      }
      const reads = callsIn(job, 'readOnReturn');
      checked('SU1', 2);
      if (reads.length !== 1) fail('SU1', `${where(ipc, job)}: recheck()'s job calls readOnReturn ${String(reads.length)} time(s); once, on unconfirmed fields`);
      for (const call of reads) {
        if (!guardsOf(ipc, call, job).some((g) => g.includes('this.pressedOnThisRun') && !g.startsWith('!'))) {
          fail('SU1', `${where(ipc, call)}: recheck() reads unconfirmed fields without requiring pressedOnThisRun again, so a door nobody allowed is read because a window came forward on a later day (D8)`);
        }
      }
    } else if (seriallyCalls.length === 1) {
      checked('SU1');
      fail('SU1', `${where(ipc, seriallyCalls[0])}: recheck()'s job is not a function with a body this rule can read`);
    }
  }
  // Every other start passes no options: the return is the only caller that marks itself.
  for (const call of callsOf(ipc).filter((c) => calleeName(c) === 'openNow')) {
    if (hostMethodOf(call) === 'recheck') continue;
    checked('SU1');
    if (call.arguments.length > 2) fail('SU1', `${where(ipc, call)}: ${hostMethodOf(call) ?? 'module scope'} hands openNow options; only recheck() does (§5.2.3)`);
  }

  // (6) readOnReturn (D9, §Attack F3).
  const ror = oneHostMethod(ipc, 'readOnReturn', 'SU1');
  if (ror !== null) {
    checked('SU1', 4);
    if (callsIn(ror, 'sweepAndRead').length !== 1) fail('SU1', `${where(ipc, ror)}: readOnReturn does not read through this.sweepAndRead() once, the orphan sweep and the read in their order`);
    const portWrites = descendantsOf(ror.body).filter(
      (n) =>
        ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && memberName(n) === 'publicPort') ||
        (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.name.text === 'publicPort')
    );
    if (portWrites.length === 0) fail('SU1', `${where(ipc, ror)}: readOnReturn writes no public port, so a first setup's return never chooses one and no lines can be drawn`);
    for (const w of portWrites) {
      checked('SU1');
      if (!guardsOf(ipc, w, ror).some((g) => /publicPort===0\b/.test(g) && !g.startsWith('!'))) {
        fail('SU1', `${where(ipc, w)}: readOnReturn writes the public port outside the branch where the stored port is 0. A return never moves a stored port: a phone may have been told it, and only a person's switch chooses again`);
      }
    }
    for (const prop of ['startRefusal', 'startRefusalWord']) {
      for (const a of thisAssigns(ipc, prop).filter((n) => n.pos >= ror.pos && n.end <= ror.end)) {
        checked('SU1');
        if (a.right.kind !== ts.SyntaxKind.NullKeyword) fail('SU1', `${where(ipc, a)}: readOnReturn keeps a refusal in this.${prop}. A return's refusal is a READ's, kept in readRefusal, so confirmable is false and no Allow is drawn over a held port (§Attack F3)`);
      }
    }
    const readWords = thisAssigns(ipc, 'readRefusal').filter((n) => n.pos >= ror.pos && n.end <= ror.end && ts.isStringLiteralLike(n.right)).map((n) => n.right.text);
    for (const word of ['port-taken', 'funnel-ports']) {
      checked('SU1');
      if (!readWords.includes(word)) fail('SU1', `${where(ipc, ror)}: readOnReturn never keeps ${JSON.stringify(word)} in this.readRefusal, so a stored port it may not take is drawn as one a person can allow (§Attack F3)`);
    }
    // THE READ'S OWN LAST-PRESS CHECK (the 333.1 reverify, 2026-10-08): the
    // statement right after the read returns when its press was superseded,
    // so a person's off that arrived while the read was out wins, and nothing
    // the read found is written after it. Dropping that clause left this rule
    // and every vitest file green until p3331-return.test.ts's "an off press
    // while its read is out".
    const rorStmts = ror.body.statements;
    const readAt = rorStmts.findIndex((s) => callsIn(s, 'sweepAndRead').length > 0);
    const afterRead = readAt === -1 ? undefined : rorStmts[readAt + 1];
    const lastPress = afterRead !== undefined && ts.isIfStatement(afterRead) ? squash(codeOfNode(ipc, afterRead.expression)).split('||') : [];
    const returnsThen = afterRead !== undefined && ts.isIfStatement(afterRead) && descendantsOf(afterRead.thenStatement).some((x) => ts.isReturnStatement(x));
    checked('SU1', 2);
    if (!lastPress.includes('this.superseded(press)') || !returnsThen) {
      fail('SU1', `${where(ipc, afterRead ?? ror)}: the statement right after readOnReturn's read is not \`if (… || this.superseded(press)) { …; return; }\`, so a person's off that arrives while the read is out is overruled by the read: it writes a port or keeps a refusal after the off (D8, the 333.1 reverify)`);
    }
    for (const w of [...portWrites, ...thisAssigns(ipc, 'readRefusal').filter((n) => n.pos >= ror.pos && n.end <= ror.end)]) {
      checked('SU1');
      if (afterRead === undefined || w.pos < afterRead.end) fail('SU1', `${where(ipc, w)}: readOnReturn writes before its read's last-press check, so a superseded read still lands`);
    }
  }

  // (7) openNow: the return's stop after not-approved, and its one fork.
  const openNow = hostMethod(ipc, 'openNow');
  checked('SU1');
  if (openNow === null) {
    fail('SU1', `${rel(ipc)}: PocketHost declares no openNow(), so the return's start cannot be read`);
  } else {
    const params = openNow.parameters.map((x) => x.name.getText(sf));
    checked('SU1');
    if (params[2] !== 'options') fail('SU1', `${where(ipc, openNow)}: openNow takes (${params.join(', ')}); its third parameter is options, handed by recheck() alone`);
    const fork = callsIn(openNow, 'startPocketDoor')[0];
    const stop = descendantsOf(openNow.body).find((n) => {
      if (!ts.isIfStatement(n)) return false;
      const c = squash(codeOfNode(ipc, n.expression));
      return c.includes('options.returned') && c.includes("this.startRefusalWord==='not-approved'") && c.includes('read.asksApproval') && descendantsOf(n.thenStatement).some((x) => ts.isReturnStatement(x));
    });
    checked('SU1', 2);
    if (stop === undefined || fork === undefined || at(stop) > at(fork)) {
      fail('SU1', `${where(ipc, openNow)}: openNow does not return before startPocketDoor when options.returned, this.startRefusalWord === 'not-approved' and read.asksApproval all hold, so a return before the admin approves forks the door process and spawns the Funnel child on every focus (D9)`);
    }
    const marks = thisAssigns(ipc, 'returnForked').filter((a) => a.right.kind === ts.SyntaxKind.TrueKeyword);
    if (marks.length !== 1) {
      fail('SU1', `${rel(ipc)} sets this.returnForked = true ${String(marks.length)} time(s); once, in openNow, before the fork (D8b)`);
    } else {
      const m = marks[0];
      const home = statementBefore(fork ?? m);
      const markStatement = (() => {
        let s = m;
        while (s.parent !== undefined && !ts.isBlock(s.parent) && !ts.isSourceFile(s.parent)) s = s.parent;
        return s;
      })();
      if (hostMethodOf(m) !== 'openNow' || !guardsOf(ipc, m, openNow).some((g) => g.includes('options.returned')) || fork === undefined || at(m) > at(fork)) {
        fail('SU1', `${where(ipc, m)}: this.returnForked = true is not set in openNow under options.returned before startPocketDoor, so a start that refuses again with Funnel's capabilities present forks and spawns on every focus (§Attack F5)`);
      } else if (home === markStatement) {
        fail('SU1', `${where(ipc, m)}: this.returnForked = true is the statement immediately before startPocketDoor. The last-press check is that statement (L5): an ask placed earlier is the first thing a later round puts an await after`);
      }
    }
  }

  // (8) returnForked = false: setDoor's two arms, confirmDoor and the counted start.
  const setDoor = hostMethod(ipc, 'setDoor');
  const off = setDoor === null ? undefined : setDoorOffBranch(ipc, setDoor);
  const offText = off === undefined ? '' : codeOfNode(ipc, off.thenStatement);
  const offStart = off === undefined ? -1 : at(off.thenStatement);
  const inOff = (n) => off !== undefined && n.pos >= off.thenStatement.pos && n.end <= off.thenStatement.end;
  const inOn = (n) => setDoor !== null && off !== undefined && n.pos >= off.end && n.end <= setDoor.end;
  checked('SU1');
  if (setDoor === null || off === undefined) fail('SU1', `${rel(ipc)}: setDoor() or its \`if (!on)\` branch is missing, so the switch's own clauses cannot be read`);
  const clears = thisAssigns(ipc, 'returnForked').filter((a) => a.right.kind === ts.SyntaxKind.FalseKeyword);
  for (const a of thisAssigns(ipc, 'returnForked')) {
    if (a.right.kind !== ts.SyntaxKind.FalseKeyword && a.right.kind !== ts.SyntaxKind.TrueKeyword) {
      checked('SU1');
      fail('SU1', `${where(ipc, a)}: this.returnForked is set to ${codeOfNode(ipc, a.right)}; it is true in one place and false in four`);
    }
  }
  const confirm = hostMethod(ipc, 'confirmDoor');
  const countedBlock = openNow === null ? undefined : descendantsOf(openNow.body).find((n) => ts.isBlock(n) && n.statements.some((s) => /\bthis\.adopt\(/.test(codeOfNode(ipc, s))) && n.statements.some((s) => squash(codeOfNode(ipc, s)) === 'this.startRefusal=null;'));
  for (const [where_, ok] of [
    ["setDoor()'s off arm", clears.some(inOff)],
    ["setDoor()'s on arm", clears.some(inOn)],
    ['confirmDoor() when it records an agreement', confirm !== null && clears.some((a) => a.pos >= confirm.pos && a.end <= confirm.end && guardsOf(ipc, a, confirm).some((g) => g.includes('record!==null')))],
    ["openNow()'s counted start, beside this.startRefusal = null", countedBlock !== undefined && clears.some((a) => countedBlock.statements.some((s) => a.pos >= s.pos && a.end <= s.end))]
  ]) {
    checked('SU1');
    if (!ok) fail('SU1', `${rel(ipc)}: this.returnForked = false is not written in ${where_}, so after one return-started start the next press is not today's (D8b)`);
  }

  // (9) switchedOffThisRun and pressedOnThisRun move with the switch alone (D8).
  const savedAt = offText.search(/\blet\s+saved\s*=\s*true\s*;/);
  const firstAwait = offText.search(/\bawait\b/);
  for (const [prop, value, arm, why] of [
    ['switchedOffThisRun', true, 'off', "after a person's off, nothing but their next on press starts or reads the door in this run, saved or not (r2 §Attack F18)"],
    ['switchedOffThisRun', false, 'on', 'an on press clears it'],
    ['pressedOnThisRun', true, 'on', 'an unconfirmed door is read on a return only in the run whose press started the setup'],
    ['pressedOnThisRun', false, 'off', 'an off press clears it']
  ]) {
    const all = thisAssigns(ipc, prop);
    const these = all.filter((a) => a.right.kind === (value ? ts.SyntaxKind.TrueKeyword : ts.SyntaxKind.FalseKeyword));
    checked('SU1', these.length + 1);
    if (these.length === 0) fail('SU1', `${rel(ipc)} never sets this.${prop} = ${String(value)}; ${why} (D8)`);
    for (const a of these) {
      if (arm === 'off' ? !inOff(a) : !inOn(a)) {
        fail('SU1', `${where(ipc, a)}: this.${prop} = ${String(value)} is written outside setDoor()'s ${arm} arm; ${why} (D8)`);
      } else if (arm === 'off') {
        const k = at(a) - offStart;
        if (savedAt === -1 || k < savedAt) fail('SU1', `${where(ipc, a)}: this.${prop} = ${String(value)} is written before \`let saved = true;\` in the off arm. D8 places it after: between \`this.pressed();\` and \`let saved = true;\` it splits the two lines L5's off arm reads together (build/ablation-p313.mjs, L5e; r2 §Attack F26)`);
        if (firstAwait !== -1 && k > firstAwait) fail('SU1', `${where(ipc, a)}: this.${prop} = ${String(value)} is written after the off arm's first await, so a return queued while the off waits still reads the switch as on`);
      } else if (prop === 'pressedOnThisRun') {
        const onText = codeTextOf(ipc).slice(off.getEnd(), setDoor.body.getEnd());
        const pressedAt = onText.search(/this\.pressed\(\)/);
        if (pressedAt === -1 || at(a) - off.getEnd() < pressedAt) fail('SU1', `${where(ipc, a)}: this.pressedOnThisRun = true is written before the on press is counted (const press = this.pressed()), so a press refused above it would count as the run's press (D8)`);
      }
    }
    for (const a of all.filter((x) => x.right.kind !== ts.SyntaxKind.TrueKeyword && x.right.kind !== ts.SyntaxKind.FalseKeyword)) {
      checked('SU1');
      fail('SU1', `${where(ipc, a)}: this.${prop} is set to ${codeOfNode(ipc, a.right)}; it is true or false, by the switch alone`);
    }
  }
}

// ---- SU2, no timer and no read at open ------------------------------------

function returnSurfaceRule(ipc) {
  const surface = phoneSurfaceFiles();
  const calls = [];
  for (const file of surface) for (const call of callsOf(file)) if (calleeName(call) === 'recheck') calls.push({ file, call });
  checked('SU2', 2);
  if (calls.length !== 2) {
    fail('SU2', `the sheet's surface calls recheck( ${String(calls.length)} time(s) (${calls.map((x) => where(x.file, x.call)).join(', ') || 'nowhere'}); exactly twice, once for each return the helper hears and once at mount with focus (D16)`);
  }
  const looked = calls.filter((x) => insideCallbackOf(x.call, 'onWindowLooked'));
  const focused = calls.filter((x) => guardsOf(x.file, x.call).some((g) => g === 'document.hasFocus()'));
  if (looked.length !== 1) fail('SU2', `${String(looked.length)} recheck( call(s) sit inside an onWindowLooked( callback; one, so every return the helper hears is one recheck`);
  if (focused.length !== 1) fail('SU2', `${String(focused.length)} recheck( call(s) sit under \`if (document.hasFocus())\`; one, at mount, so a sheet opened in front reads once and a sheet opened behind reads nothing`);
  const effectOf = (node) => {
    for (let n = node.parent; n !== undefined; n = n.parent) {
      if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent !== undefined && ts.isCallExpression(n.parent) && calleeName(n.parent) === 'useEffect' && n.parent.arguments[0] === n) return n;
    }
    return null;
  };
  const effects = new Set(calls.map((x) => effectOf(x.call)));
  checked('SU2');
  if (effects.has(null) || effects.size !== 1) fail('SU2', `the sheet's recheck( calls are not in ONE useEffect, so the return and the mount read could be wired twice or never unwired (D16)`);
  const subscribes = [];
  for (const file of surface) for (const call of callsOf(file)) if (calleeName(call) === 'onWindowLooked') subscribes.push({ file, call });
  checked('SU2', 2);
  if (subscribes.length !== 1) fail('SU2', `the sheet's surface subscribes to onWindowLooked ${String(subscribes.length)} time(s); once (D16)`);
  for (const { file, call } of subscribes) {
    const effect = effectOf(call);
    const decl = call.parent !== undefined && ts.isVariableDeclaration(call.parent) && ts.isIdentifier(call.parent.name) ? call.parent.name.text : null;
    const hands = effect !== null && ownReturnsOf(effect).some((r) => r.expression !== undefined && ((decl !== null && ts.isIdentifier(r.expression) && r.expression.text === decl) || r.expression === call));
    if (!hands) fail('SU2', `${where(file, call)}: the effect does not hand back onWindowLooked's unsubscribe, so the listener outlives the section and lookedListenerCount() never returns to where it was`);
  }
  // onWindowLooked is the existing helper, not a second one.
  const imports = [];
  for (const file of surface) {
    for (const n of nodesOf(file)) {
      if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier)) continue;
      const named = n.importClause?.namedBindings;
      if (named !== undefined && ts.isNamedImports(named) && named.elements.some((e) => (e.propertyName ?? e.name).text === 'onWindowLooked')) imports.push({ file, n, spec: n.moduleSpecifier.text });
    }
  }
  checked('SU2');
  if (imports.length === 0 || imports.some((x) => !/(?:^|\/)machines\/remote-writes$/.test(x.spec))) {
    fail('SU2', `onWindowLooked is ${imports.length === 0 ? 'imported by no surface file' : `imported from ${imports.map((x) => x.spec).join(', ')}`}; it is the existing helper in src/renderer/machines/remote-writes.ts, one bus for every return (CLAUDE.md: grep for an existing helper)`);
  }
  for (const file of surface) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === 'setInterval' || name === 'setTimeout' || name === 'requestAnimationFrame' || name === 'queueMicrotask') {
        checked('SU2');
        if (descendantsOf(call).some((n) => (ts.isIdentifier(n) && n.text === 'recheck') || (ts.isPropertyAccessExpression(n) && n.name.text === 'recheck'))) {
          fail('SU2', `${where(file, call)}: a ${name} callback names recheck. A return is the window coming back and nothing else: a timer that reads Tailscale is a poll`);
        }
      }
      if (name === 'addEventListener') {
        const first = call.arguments[0];
        checked('SU2');
        if (first !== undefined && ts.isStringLiteralLike(first) && ['focus', 'focusin', 'visibilitychange'].includes(first.text)) {
          fail('SU2', `${where(file, call)}: the sheet listens for ${JSON.stringify(first.text)} itself. onWindowLooked is the only listener, so every return is heard once (D10, D16)`);
        }
      }
    }
  }
  // Main: the predicate asks the switch first, and recheck asks the predicate first.
  const rechecks = hostMethod(ipc, 'rechecks');
  const recheck = hostMethod(ipc, 'recheck');
  checked('SU2', 2);
  const firstCond = rechecks === null ? null : earlyReturnCond(ipc, rechecks.body.statements[0], true);
  if (firstCond === null || !firstCond.includes('this.readStore()?.enabled!==true')) fail('SU2', `${rechecks === null ? rel(ipc) : where(ipc, rechecks)}: rechecks()'s first statement does not ask the switch, so a sheet opened with the door off is asked anything at all`);
  if (recheck === null || earlyReturnCond(ipc, recheck.body.statements[0]) !== '!this.rechecks()') fail('SU2', `${recheck === null ? rel(ipc) : where(ipc, recheck)}: recheck()'s first statement is not \`if (!this.rechecks()) return …\`, so a return while a job holds an opening is not dropped before anything else is asked`);
}

// ---- SU3, the setup presses -------------------------------------------------

function setupPressRule(ipc) {
  const sf = astOf(ipc);
  const at = (n) => n.getStart(sf);
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('SU3');
  const words = existsSync(contract)
    ? (() => {
        const d = nodesOf(contract).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'POCKET_SETUP_ACTIONS');
        let e = d?.initializer;
        while (e !== undefined && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e))) e = e.expression;
        return e !== undefined && ts.isArrayLiteralExpression(e) ? e.elements.map((x) => (ts.isStringLiteralLike(x) ? x.text : null)) : null;
      })()
    : null;
  if (JSON.stringify(words) !== JSON.stringify(SETUP_WORDS)) fail('SU3', `src/shared/ipc/pocket.ts's POCKET_SETUP_ACTIONS is ${JSON.stringify(words)}, not exactly ${JSON.stringify(SETUP_WORDS)} (D11): one closed word per press, never a URL or a path`);

  const action = oneHostMethod(ipc, 'setupAction', 'SU3');
  if (action !== null) {
    const stmts = action.body.statements;
    const param = action.parameters[0]?.name;
    const paramName = param !== undefined && ts.isIdentifier(param) ? param.text : null;
    checked('SU3');
    if (action.parameters.length !== 1 || paramName === null) fail('SU3', `${where(ipc, action)}: setupAction takes ${String(action.parameters.length)} parameter(s); ONE, the press's word`);
    // The harness first after the parse (D12; the precedent of conformance:push P3).
    const harnessAt = stmts.findIndex((s) => earlyReturnCond(ipc, s, true) === 'isHarnessLaunch(process.env)');
    checked('SU3', 2);
    if (harnessAt === -1) {
      fail('SU3', `${where(ipc, action)}: setupAction does not return false under isHarnessLaunch(process.env), so a probe or a smoke that reached it would open his browser or his Tailscale, or write his clipboard (D12, D35)`);
    } else {
      const parse = stmts.slice(0, harnessAt);
      const acting = ['setupActionsNow', 'resolve', 'openExternal', 'openPath', 'writeClipboard', 'approvalOpens', 'funnelProgramOf'];
      for (const s of parse) {
        for (const name of acting) {
          if (callsIn(s, name).length > 0) fail('SU3', `${where(ipc, s)}: setupAction calls ${name}( before it asks isHarnessLaunch(process.env); the harness is its first statement after the parse`);
        }
      }
      // The parse: the word by membership in POCKET_SETUP_ACTIONS, or a throw.
      const reached = [...parse, ...parse.flatMap((s) => callsOf(ipc).filter((c) => c.pos >= s.pos && c.end <= s.end).flatMap((c) => (calleeName(c) === null ? [] : functionsNamed(ipc, calleeName(c)))))];
      const parseText = reached.map((n) => codeOfNode(ipc, n)).join('\n');
      if (!/\bPOCKET_SETUP_ACTIONS\b/.test(parseText) || !/\bthrow\b/.test(parseText)) fail('SU3', `${where(ipc, action)}: setupAction does not read its input by membership in POCKET_SETUP_ACTIONS, throwing otherwise, before the harness check (D12)`);
    }
    // Each act once, after setupActionsNow(, with its one constant.
    const asked = callsIn(action, 'setupActionsNow');
    checked('SU3');
    if (asked.length === 0) fail('SU3', `${where(ipc, action)}: setupAction never asks setupActionsNow(, so a press acts on a word main does not list now`);
    const firstAsk = asked.length === 0 ? Infinity : Math.min(...asked.map(at));
    const localInit = (id) => {
      const d = descendantsOf(action.body).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === id);
      return d?.initializer === undefined ? null : squash(codeOfNode(ipc, d.initializer));
    };
    // A local's name reads as its initializer, two levels deep, so
    // `copied = approvalCopyText(link)` over `link = this.adminLink` reads as
    // approvalCopyText(this.adminLink) and a bare `link` as this.adminLink.
    const resolved = (text) => {
      let t = text;
      for (let i = 0; i < 2; i += 1) {
        const whole = /^[A-Za-z_$][\w$]*$/.test(t) ? localInit(t) : null;
        if (whole !== null) {
          t = whole;
          continue;
        }
        t = t.replace(/\(([A-Za-z_$][\w$]*)\)/g, (all, id) => {
          const init = localInit(id);
          return init === null ? all : `(${init})`;
        });
      }
      return t;
    };
    for (const [name, constant, why] of [
      ['openExternal', 'TAILSCALE_DOWNLOAD_PAGE', 'Get Tailscale opens the download page and nothing else'],
      ['openPath', 'TAILSCALE_APP_BUNDLE', 'Open Tailscale opens the app bundle, never the command line program'],
      // The 333.1 reverify: the held link as approvalCopyText spells it, never
      // the text the program printed, which two parsers can read as two hosts.
      ['writeClipboard', 'approvalCopyText(this.adminLink)', 'Copy link writes the held link as approvalCopyText spells it (new URL’s serialization, which every parser reads as login.tailscale.com) and nothing else, never the text the program printed (the 333.1 reverify: `https://login.tailscale.com\\@evil.example/f/funnel` is evil.example to an RFC 3986 parser)']
    ]) {
      const acts = callsIn(action, name);
      checked('SU3', acts.length + 1);
      if (acts.length !== 1) fail('SU3', `${where(ipc, action)}: setupAction calls ${name}( ${String(acts.length)} time(s); once (D12)`);
      for (const call of acts) {
        const arg = call.arguments[0];
        const argText = arg === undefined ? '' : squash(codeOfNode(ipc, arg));
        const ok = resolved(argText) === constant;
        if (!ok) fail('SU3', `${where(ipc, call)}: ${name}( is handed ${JSON.stringify(argText)}, not ${constant}; ${why}`);
        if (at(call) < firstAsk) fail('SU3', `${where(ipc, call)}: ${name}( runs before setupActionsNow( is asked, so it acts on a word main does not list`);
        if (paramName !== null && descendantsOf(call).some((n) => ts.isIdentifier(n) && n.text === paramName)) fail('SU3', `${where(ipc, call)}: the press's word reaches ${name}(. Nothing takes a URL or a path from the renderer`);
        const receiver = ts.isPropertyAccessExpression(call.expression) ? call.expression.expression.getText(sf) : '';
        if (receiver === 'shell' || receiver === 'clipboard') fail('SU3', `${where(ipc, call)}: setupAction calls Electron's ${receiver} itself; it acts through the seam (this.deps.setup ?? electronSetupSeam)`);
        if (name === 'writeClipboard') {
          let block = call.parent;
          while (block !== undefined && !ts.isBlock(block) && !ts.isCaseClause(block)) block = block.parent;
          const asks = block === undefined ? [] : callsIn(block, 'approvalOpens').filter((c) => at(c) < at(call));
          if (asks.length === 0) fail('SU3', `${where(ipc, call)}: Copy link writes the held link without asking approvalOpens( again in the same branch, so a link Tortie refuses to open could be handed to a person to send to someone (§Attack F9)`);
        }
      }
    }
  }

  // What Copy link writes (the 333.1 reverify, 2026-10-08): funnel.ts's ONE
  // approvalCopyText answers null unless approvalOpens passes the text, and
  // otherwise new URL's serialization, and only one that begins
  // https://<FUNNEL_APPROVAL_HOST>/, so every parser ends the authority at
  // that slash. The text the program printed is never the answer.
  const funnelFile = domainFiles.find((f) => f.endsWith(join('pocket', 'funnel.ts'))) ?? null;
  const copyFns = funnelFile === null ? [] : functionsNamed(funnelFile, 'approvalCopyText');
  checked('SU3', 4);
  if (copyFns.length !== 1) {
    fail('SU3', `${funnelFile === null ? 'src/main/pocket/funnel.ts' : rel(funnelFile)} declares approvalCopyText ${String(copyFns.length)} time(s); once, the one spelling Copy link writes (the 333.1 reverify)`);
  } else {
    const fn = copyFns[0];
    const p0 = fn.parameters[0]?.name;
    const pn = p0 !== undefined && ts.isIdentifier(p0) ? p0.text : null;
    const body = squash(codeOfNode(funnelFile, fn.body));
    const stmts = fn.body.statements;
    const first = stmts[0] === undefined ? '' : squash(codeOfNode(funnelFile, stmts[0]));
    if (fn.parameters.length !== 1 || pn === null || first !== `if(${pn}===null||!approvalOpens(${pn}))returnnull;`) {
      fail('SU3', `${where(funnelFile, fn)}: approvalCopyText's first statement is not \`if (${String(pn)} === null || !approvalOpens(${String(pn)})) return null;\`, so a link Tortie refuses to open could be copied for a person to send to someone (§Attack F9, the 333.1 reverify)`);
    }
    const hrefOf = body.match(/const(\w+)=newURL\((\w+)\)\.href;/);
    if (hrefOf === null || hrefOf[2] !== pn) {
      fail('SU3', `${where(funnelFile, fn)}: approvalCopyText does not take new URL(${String(pn)}).href, so what is copied is the text the program printed, which two parsers can read as two hosts (the 333.1 reverify)`);
    }
    const name = hrefOf === null ? '\\w+' : hrefOf[1];
    if (!new RegExp(`return${name}\\.startsWith\\(\`https://\\$\\{FUNNEL_APPROVAL_HOST\\}/\`\\)\\?${name}:null;$`).test(body.replace(/}$/, ''))) {
      fail('SU3', `${where(funnelFile, fn)}: approvalCopyText's last statement is not \`return ${name}.startsWith(\`https://\${FUNNEL_APPROVAL_HOST}/\`) ? ${name} : null;\`, so a copied link need not end its authority at the host's own slash (the 333.1 reverify)`);
    }
    if (descendantsOf(fn.body).some((n) => ts.isReturnStatement(n) && n.expression !== undefined && ts.isIdentifier(n.expression) && n.expression.text === pn)) {
      fail('SU3', `${where(funnelFile, fn)}: approvalCopyText returns ${String(pn)} itself, the text the program printed (the 333.1 reverify)`);
    }
  }

  // The doors: Electron's shell and clipboard, read at call time, in two places.
  const seam = nodesOf(ipc).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'electronSetupSeam');
  checked('SU3', 2);
  let seamInit = seam?.initializer;
  while (seamInit !== undefined && (ts.isAsExpression(seamInit) || ts.isSatisfiesExpression?.(seamInit) || ts.isParenthesizedExpression(seamInit))) seamInit = seamInit.expression;
  if (seamInit === undefined || !ts.isObjectLiteralExpression(seamInit) || JSON.stringify(seamInit.properties.map(memberName).sort()) !== JSON.stringify(['openExternal', 'openPath', 'writeClipboard'])) {
    fail('SU3', `${rel(ipc)} declares no electronSetupSeam of exactly openExternal, openPath and writeClipboard, so what production presses is not what this rule reads`);
  }
  if (!/\bthis\.deps\.setup\s*\?\?\s*electronSetupSeam\b/.test(codeTextOf(ipc))) fail('SU3', `${rel(ipc)} does not fall back from this.deps.setup to electronSetupSeam, so what production presses is not what this rule reads`);
  const inSeam = (n) => seam !== undefined && n.pos >= seam.pos && n.end <= seam.end;
  const inArrowBody = (n) => {
    for (let p = n.parent; p !== undefined && p !== seam; p = p.parent) if (ts.isArrowFunction(p) || ts.isFunctionExpression(p)) return n.pos >= p.body.pos && n.end <= p.body.end;
    return false;
  };
  for (const file of domainFiles) {
    for (const n of nodesOf(file)) {
      if (!ts.isIdentifier(n) || (n.text !== 'shell' && n.text !== 'clipboard')) continue;
      let p = n.parent;
      while (p !== undefined && !ts.isImportDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      if (p !== undefined && ts.isImportDeclaration(p)) continue;
      const parent = n.parent;
      // A NAME, not a read: `x.shell`, `{ shell: false }` (execFile's own
      // option, funnel.ts), a declared member.
      if (ts.isPropertyAccessExpression(parent) && parent.name === n) continue;
      if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent) || ts.isBindingElement(parent)) && parent.name === n) continue;
      checked('SU3');
      const member = ts.isPropertyAccessExpression(parent) && parent.expression === n ? parent.name.text : null;
      const method = hostMethodOf(n);
      const allowed =
        file === ipc &&
        ((inSeam(n) && inArrowBody(n)) || (n.text === 'shell' && member === 'openExternal' && method === 'openApproval'));
      if (!allowed) {
        fail(
          'SU3',
          `${where(file, n)} names ${n.text}${member === null ? '' : `.${member}`} ${inSeam(n) ? 'in electronSetupSeam outside an arrow’s body, so it is read when the module loads and three test files whose electron mock has no shell or clipboard go red (r2 §Attack F23)' : 'outside electronSetupSeam and openApproval'}. Electron's shell opens Tailscale's approval page in openApproval and the setup presses' page and app through the seam; its clipboard is written through the seam alone`
        );
      }
    }
  }
  // The seam's own two opens, everywhere in the host, take their one constant.
  for (const call of callsOf(ipc)) {
    const name = calleeName(call);
    if (name !== 'openExternal' && name !== 'openPath') continue;
    const receiver = ts.isPropertyAccessExpression(call.expression) ? call.expression.expression.getText(sf) : '';
    if (receiver === 'shell') continue;
    checked('SU3');
    const want = name === 'openExternal' ? 'TAILSCALE_DOWNLOAD_PAGE' : 'TAILSCALE_APP_BUNDLE';
    const arg = call.arguments[0];
    const argText = arg === undefined ? '' : squash(codeOfNode(ipc, arg));
    if (argText !== want) fail('SU3', `${where(ipc, call)}: the seam's ${name}( is handed ${JSON.stringify(argText)}, not ${want}; nothing the seam opens is worked out at the press`);
  }

  // Which presses main lists (D11).
  const now = oneHostMethod(ipc, 'setupActionsNow', 'SU3');
  if (now !== null) {
    const nodes = descendantsOf(now.body);
    const literal = (word) => nodes.filter((n) => ts.isStringLiteralLike(n) && n.text === word);
    const isAppChain = (text) => /!(?:\w+\.)*overrideSet/.test(text) && /source==='pinned'/.test(text) && /path===TAILSCALE_APP_PROGRAM/.test(text);
    const chains = nodes.filter((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isAppChain(squash(codeOfNode(ipc, n))) && !(n.parent !== undefined && ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isAppChain(squash(codeOfNode(ipc, n.parent)))));
    const names = chains.map((c) => (c.parent !== undefined && ts.isVariableDeclaration(c.parent) && ts.isIdentifier(c.parent.name) ? c.parent.name.text : null)).filter((x) => x !== null);
    const opens = literal('open-tailscale');
    checked('SU3', 3);
    if (opens.length !== 1) fail('SU3', `${where(ipc, now)}: setupActionsNow names open-tailscale ${String(opens.length)} time(s); once`);
    for (const o of opens) {
      const guards = guardsOf(ipc, o, now);
      const guarded = guards.some((g) => isAppChain(g) || names.some((nm) => new RegExp(`(?:^|[^\\w.!])${nm}(?![\\w])`).test(g)));
      if (!guarded) fail('SU3', `${where(ipc, o)}: open-tailscale is listed without asking !overrideSet && source === 'pinned' && path === TAILSCALE_APP_PROGRAM, so under a development override a probe's press could open his real Tailscale (D11, D35)`);
    }
    for (const g of literal('get-tailscale')) {
      checked('SU3');
      if (!guardsOf(ipc, g, now).some((x) => /missing|no-tailscale/.test(x))) fail('SU3', `${where(ipc, g)}: get-tailscale is listed while Tailscale is not missing (D11)`);
    }
    for (const c of literal('copy-admin-link')) {
      checked('SU3');
      if (!guardsOf(ipc, c, now).some((x) => x.includes('this.adminLink!==null'))) fail('SU3', `${where(ipc, c)}: copy-admin-link is listed without main holding an admin link (this.adminLink !== null, D6, D11)`);
    }
  }
  // PocketHostDeps.setup is the tests' alone (U4's rule; D12).
  for (const file of sourcesUnder(join(ROOT, 'src'))) {
    if (!/new PocketHost\(/.test(readFileSync(file, 'utf8'))) continue;
    for (const node of nodesOf(file)) {
      if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'PocketHost') continue;
      const arg = node.arguments?.[0];
      if (arg === undefined || !ts.isObjectLiteralExpression(arg)) continue;
      for (const p of arg.properties) {
        if (memberName(p) !== 'setup') continue;
        checked('SU3');
        fail('SU3', `${where(file, p)}: PocketHost is handed \`setup\` outside a test. Production takes Electron's shell and clipboard, so what a person's press opens is what this rule reads`);
      }
    }
  }
}

// ---- SU4, the stat ------------------------------------------------------------

function statRule(ipc) {
  const status = hostMethod(ipc, 'status');
  checked('SU4');
  if (status === null) {
    fail('SU4', `${rel(ipc)}: PocketHost declares no status()`);
    return;
  }
  const resolves = callsIn(status, 'resolve').filter((c) => ts.isPropertyAccessExpression(c.expression) && squash(codeOfNode(ipc, c.expression.expression)) === 'this.funnel');
  checked('SU4', 3);
  if (resolves.length !== 1) fail('SU4', `${where(ipc, status)}: status() calls this.funnel.resolve() ${String(resolves.length)} time(s); once, handed to step 1 and to the setup presses (D3): an unusable override warns once per call`);
  if (callsIn(status, 'funnelProgramOf').length === 0) fail('SU4', `${where(ipc, status)}: status() reaches the program through no funnelProgramOf(`);
  if (callsIn(status, 'setupActionsNow').length !== 1) fail('SU4', `${where(ipc, status)}: status() does not hand its one resolution to setupActionsNow( once (D3)`);
  for (const name of ['readTailnet', 'readServe', 'sweepFunnelOrphan', 'exec', 'execFile', 'execReal', 'spawn', 'startFunnel', 'readAtPress', 'sweepAndRead']) {
    for (const call of callsIn(status, name)) {
      checked('SU4');
      fail('SU4', `${where(ipc, call)}: status() calls ${name}(. A status is a stat and the fields already held; a status that runs Tailscale is a poll every push`);
    }
  }
  const field = descendantsOf(status).filter((n) => (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && memberName(n) === 'tailscale');
  const tsCalls = callsOf(ipc).filter((c) => calleeName(c) === 'tailscaleNow');
  checked('SU4', 2);
  const fieldFrom = (() => {
    if (field.length !== 1) return null;
    const f = field[0];
    if (ts.isPropertyAssignment(f)) return f.initializer;
    const d = descendantsOf(status).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'tailscale');
    return d?.initializer ?? null;
  })();
  if (fieldFrom === null || !ts.isCallExpression(fieldFrom) || squash(codeOfNode(ipc, fieldFrom.expression)) !== 'this.tailscaleNow') {
    fail('SU4', `${where(ipc, status)}: status()'s tailscale is not this.tailscaleNow(…), the one place step 1's state is composed`);
  }
  if (tsCalls.length !== 1 || hostMethodOf(tsCalls[0]) !== 'status') fail('SU4', `${rel(ipc)} calls tailscaleNow ${String(tsCalls.length)} time(s)${tsCalls.length === 1 ? ` from ${String(hostMethodOf(tsCalls[0]))}` : ''}; once, in status()`);
  const now = oneHostMethod(ipc, 'tailscaleNow', 'SU4');
  if (now !== null) {
    checked('SU4', 2);
    if (now.parameters.length !== 2) fail('SU4', `${where(ipc, now)}: tailscaleNow takes ${String(now.parameters.length)} parameter(s); two, the stat's program and the switch status() already read`);
    for (const n of descendantsOf(now.body)) {
      const named = ts.isIdentifier(n) ? n.text : null;
      if (named === 'tailnetFacts') fail('SU4', `${where(ipc, n)}: tailscaleNow names tailnetFacts. A tailnet an earlier run wrote is no proof Tailscale runs now (D2)`);
      if (ts.isCallExpression(n) && ['readStore', 'facts', 'fields'].includes(calleeName(n) ?? '')) fail('SU4', `${where(ipc, n)}: tailscaleNow calls ${calleeName(n)}(; it reads the stat and this run's last read, and takes the switch as a parameter (D2)`);
    }
  }
}

// ---- SU5, drawn and never hashed ---------------------------------------------

function accountRule() {
  const pairing = join(DOMAIN, 'pairing.ts');
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('SU5', 2);
  if (!existsSync(pairing) || !existsSync(contract)) {
    fail('SU5', 'src/main/pocket/pairing.ts or src/shared/ipc/pocket.ts is missing, so what is hashed cannot be read');
    return;
  }
  const namesAccount = (root) => descendantsOf(root).filter((n) => (ts.isIdentifier(n) || ts.isStringLiteralLike(n) || ts.isPrivateIdentifier(n)) && n.text === 'account');
  for (const [what, node] of [
    ['PocketExecutionFields', interfaceOf(pairing, 'PocketExecutionFields')],
    ['PocketStore', interfaceOf(pairing, 'PocketStore')],
    ['NORMALIZE', nodesOf(pairing).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'NORMALIZE') ?? null]
  ]) {
    checked('SU5');
    if (node === null) {
      fail('SU5', `src/main/pocket/pairing.ts declares no ${what}, so whether the account is hashed or stored cannot be read`);
      continue;
    }
    for (const n of namesAccount(node)) fail('SU5', `${where(pairing, n)}: ${what} names account. The account is drawn on step 1 and nothing else: no hashed field, no store (D4)`);
  }
  const algo = nodesOf(pairing).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'POCKET_EXECUTION_HASH_ALGORITHM');
  checked('SU5');
  if (algo?.initializer === undefined || !ts.isStringLiteralLike(algo.initializer) || algo.initializer.text !== 'sha256-pocket-exec-v3') {
    fail('SU5', `src/main/pocket/pairing.ts's POCKET_EXECUTION_HASH_ALGORITHM is ${algo?.initializer === undefined ? 'not declared' : codeOfNode(pairing, algo.initializer)}, not 'sha256-pocket-exec-v3'. No hashed field moves in this phase, so no paired phone is asked to Allow again (D30)`);
  }
  const routes = nodesOf(contract).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'POCKET_ROUTE_IDS');
  let rinit = routes?.initializer;
  while (rinit !== undefined && (ts.isAsExpression(rinit) || ts.isParenthesizedExpression(rinit))) rinit = rinit.expression;
  const ids = rinit !== undefined && ts.isArrayLiteralExpression(rinit) ? rinit.elements.map((e) => (ts.isStringLiteralLike(e) ? e.text : null)) : null;
  checked('SU5');
  if (JSON.stringify(ids) !== JSON.stringify(ROUTES_BEFORE_3331)) fail('SU5', `src/shared/ipc/pocket.ts's POCKET_ROUTE_IDS is ${JSON.stringify(ids)}, not the eleven it was (${ROUTES_BEFORE_3331.join(', ')}): this phase adds no door route (D30; 318.1 waits for 333.12)`);
  // The contract: account is a member of PocketStatus and of no other type.
  for (const n of nodesOf(contract)) {
    if (!(ts.isPropertySignature(n) || ts.isPropertyDeclaration(n)) || memberName(n) !== 'account') continue;
    checked('SU5');
    const owner = n.parent !== undefined && ts.isInterfaceDeclaration(n.parent) ? n.parent.name.text : null;
    if (owner !== 'PocketStatus') fail('SU5', `${where(contract, n)}: ${owner ?? 'a type literal'} carries account. It is PocketStatus's alone, drawn on step 1; no door answer, pairing view or other type carries it (D4)`);
  }
  // The door's own modules: never the word.
  const doorSide = domainFiles.filter((f) => /\/pocket\/(?:facts|routes)\.ts$/.test(f) || f.includes(`${join('pocket', 'door')}/`) || f.endsWith(join('pocket', 'door-process.ts')));
  checked('SU5', doorSide.length);
  for (const file of doorSide) for (const n of namesAccount(astOf(file))) fail('SU5', `${where(file, n)} names account. The door answers no account: it is drawn on the Mac's own Settings window and leaves it never (D4)`);
  // Every log call in the domain: never the account.
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const e = call.expression;
      if (!ts.isPropertyAccessExpression(e)) continue;
      const recv = e.expression.getText(astOf(file));
      if (!/(?:^|\.)(?:\w*[lL]og|console)$/.test(recv)) continue;
      checked('SU5');
      for (const a of call.arguments) {
        const hit = descendantsOf(a).find((n) => (ts.isIdentifier(n) && /^account$/i.test(n.text)) || (ts.isPropertyAccessExpression(n) && n.name.text === 'account'));
        if (hit !== undefined) fail('SU5', `${where(file, call)}: a log line names the account. No log line holds who is signed in to Tailscale on this Mac (D4, §5.2.3)`);
      }
    }
  }
}

// ---- SU6, the confirm unchanged ------------------------------------------------

function confirmBlockRule() {
  const surface = phoneSurfaceFiles();
  const blocks = [];
  for (const file of surface) {
    for (const n of nodesOf(file)) {
      if (!ts.isJsxAttribute(n) || n.name.getText(astOf(file)) !== 'data-phone-confirm') continue;
      // JsxAttribute → JsxAttributes → the opening (or self-closing) element → the element.
      let el = n.parent;
      while (el !== undefined && !ts.isJsxElement(el) && !ts.isJsxSelfClosingElement(el)) el = el.parent;
      if (el !== undefined) blocks.push({ file, el });
    }
  }
  checked('SU6');
  if (blocks.length !== 1) {
    fail('SU6', `the sheet's surface holds ${String(blocks.length)} element(s) carrying data-phone-confirm; one, today's confirm block (D18)`);
  }
  const tagOf = (el) => (ts.isJsxElement(el) ? el.openingElement.tagName.getText() : ts.isJsxSelfClosingElement(el) ? el.tagName.getText() : null);
  for (const { file, el } of blocks) {
    const nodes = descendantsOf(el);
    const has = (pred) => nodes.some(pred);
    for (const [what, ok] of [
      ['the confirmLines', has((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'confirmLines')],
      ['POCKET_CONFIRM_WARNING', has((n) => ts.isIdentifier(n) && n.text === 'POCKET_CONFIRM_WARNING')],
      ['POCKET_DOOR_HONESTY', has((n) => ts.isIdentifier(n) && n.text === 'POCKET_DOOR_HONESTY')],
      ['confirm-door', has((n) => ts.isStringLiteralLike(n) && n.text === 'confirm-door')]
    ]) {
      checked('SU6');
      if (!ok) fail('SU6', `${where(file, el)}: the confirm block holds no ${what}. The confirm at Allow is today's block, byte for byte (his ruling 2, "Keep today's block")`);
    }
    const right = nodes.filter((n) => ts.isIdentifier(n) && n.text === 'POCKET_FUNNEL_RIGHT_WARNING');
    checked('SU6');
    if (right.length !== 1 || !guardsOf(file, right[0], el).some((g) => /funnel\.asksApproval$/.test(g) || /funnel\.asksApproval/.test(g))) {
      fail('SU6', `${where(file, el)}: POCKET_FUNNEL_RIGHT_WARNING is ${right.length === 0 ? 'not in' : 'not under funnel.asksApproval in'} the confirm block; when Funnel asks approval it is read at rest before Allow (D18)`);
    }
    // None of it behind a disclosure.
    checked('SU6');
    for (let p = el.parent; p !== undefined; p = p.parent) {
      if ((ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) && tagOf(p) === 'details') fail('SU6', `${where(file, el)}: the confirm block sits inside a <details>. Nothing of it goes behind a disclosure (his ruling 2)`);
    }
    for (const n of nodes) {
      if (n !== el && (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && tagOf(n) === 'details') fail('SU6', `${where(file, n)}: a <details> inside the confirm block hides part of it; every line, both warnings and the honesty sentence are at rest (his ruling 2)`);
    }
  }
  // The lines and the hash handed back unedited.
  const sends = [];
  for (const file of surface) {
    for (const call of callsOf(file)) {
      if (calleeName(call) !== 'confirmDoor' || !ts.isPropertyAccessExpression(call.expression)) continue;
      const arg = call.arguments[0];
      if (arg !== undefined && ts.isObjectLiteralExpression(arg)) sends.push({ file, call, arg });
    }
  }
  checked('SU6');
  if (sends.length === 0) fail('SU6', 'the sheet never hands confirmDoor the lines and the hash it drew');
  for (const { file, call, arg } of sends) {
    const prop = (name) => arg.properties.find((p) => memberName(p) === name);
    const lines = prop('linesRead');
    const hash = prop('hashRead');
    const text = (p) => (p !== undefined && ts.isPropertyAssignment(p) ? squash(codeOfNode(file, p.initializer)) : '');
    checked('SU6', 2);
    if (text(lines) !== 'current.confirmLines') fail('SU6', `${where(file, call)}: confirmDoor is handed linesRead: ${text(lines) || '(nothing)'}, not current.confirmLines unsliced and unmapped; the lines a person read are the lines main hashes`);
    if (text(hash) !== 'current.confirmHash') fail('SU6', `${where(file, call)}: confirmDoor is handed hashRead: ${text(hash) || '(nothing)'}, not current.confirmHash`);
  }
}

// ---- SU7, the code asked for -------------------------------------------------

function wishRule() {
  const phone = join(ROOT, 'src', 'renderer', 'settings', 'PhoneSection.tsx');
  checked('SU7');
  if (!existsSync(phone)) {
    fail('SU7', 'src/renderer/settings/PhoneSection.tsx does not exist');
    return;
  }
  const psf = astOf(phone);
  const liveHandler = (name) =>
    nodesOf(phone).filter(
      (n) =>
        ts.isJsxAttribute(n) &&
        n.name.getText(psf) === name &&
        n.initializer !== undefined &&
        ts.isJsxExpression(n.initializer) &&
        n.initializer.expression !== undefined &&
        ts.isFunctionLike(n.initializer.expression) &&
        !/^\(\)\s*=>\s*undefined$/.test(n.initializer.expression.getText(psf).trim())
    );
  const handlers = { onSetDoor: liveHandler('onSetDoor'), onRetryDoor: liveHandler('onRetryDoor'), onPair: liveHandler('onPair') };
  const inside = (n, list) => list.some((h) => n.pos >= h.pos && n.end <= h.end);
  const wishes = callsOf(phone).filter((c) => calleeName(c) === 'setPairAfterAllow' && c.arguments[0] !== undefined && ts.isStringLiteralLike(c.arguments[0]) && c.arguments[0].text === 'pressed');
  const outside = wishes.filter((c) => !inside(c, handlers.onPair));
  checked('SU7', 3);
  if (outside.length !== 2) fail('SU7', `${rel(phone)} calls setPairAfterAllow('pressed') ${String(outside.length)} time(s) outside onPair (${outside.map((c) => where(phone, c)).join(', ') || 'nowhere'}); exactly twice, once by the switch's on press and once by Try again (D17, §Attack F11)`);
  for (const [name, list] of [['onSetDoor', handlers.onSetDoor], ['onRetryDoor', handlers.onRetryDoor]]) {
    const here = outside.filter((c) => inside(c, list));
    checked('SU7');
    if (list.length === 0) {
      fail('SU7', `${rel(phone)} wires no live ${name}`);
      continue;
    }
    if (here.length !== 1) fail('SU7', `the live ${name} sets the wish ${String(here.length)} time(s); once`);
    for (const c of here) {
      const guarded = guardsOf(phone, c).some((g) => g.includes('status!==null&&status.phones.length===0'));
      if (!guarded) fail('SU7', `${where(phone, c)}: ${name} sets the wish without \`status !== null && status.phones.length === 0\`. His paired Mac is never handed a code it did not ask for, and a status not loaded yet is not "no phones" (r2 §Attack F27)`);
    }
  }
  const next = oneFunction(phone, 'pairAfterAllowNext');
  checked('SU7', 2);
  if (next === null) {
    fail('SU7', `${rel(phone)} declares no single pairAfterAllowNext`);
  } else {
    const nodes = descendantsOf(next);
    if (!nodes.some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'rechecks')) fail('SU7', `${where(phone, next)}: pairAfterAllowNext does not read .rechecks, so a first setup that meets a refusal a return re-checks loses its wish and still needs Pair (D17)`);
    for (const n of nodes) {
      if ((ts.isIdentifier(n) || ts.isStringLiteralLike(n)) && (n.text === 'nameProgress' || n.text === 'nameCheck')) fail('SU7', `${where(phone, n)}: pairAfterAllowNext names ${n.text}; the carried press follows main's pairable and rechecks alone (D10, D6)`);
    }
  }
}

// ---- SU8, the admin link ------------------------------------------------------

function adminLinkRule(ipc) {
  const sf = astOf(ipc);
  const sets = thisAssigns(ipc, 'adminLink');
  const urls = sets.filter((a) => a.right.kind !== ts.SyntaxKind.NullKeyword);
  checked('SU8');
  if (urls.length !== 1) {
    fail('SU8', `${rel(ipc)} assigns this.adminLink a URL ${String(urls.length)} time(s); once, in the start's not-approved arm (D6)`);
  }
  for (const a of urls) {
    const guards = guardsOf(ipc, a).join('\n');
    checked('SU8');
    if (hostMethodOf(a) !== 'openNow' || !guards.includes('approvalOpens(') || !guards.includes("'not-approved'")) {
      fail('SU8', `${where(ipc, a)}: this.adminLink is kept ${hostMethodOf(a) === 'openNow' ? '' : `in ${String(hostMethodOf(a))} `}without asking the start refused not-approved AND approvalOpens(…) of the URL, so a link Tortie refuses to open could be handed to a person to send to someone (§Attack F9)`);
    }
  }
  // No adminText anywhere: a link that does not open is not kept at all.
  for (const file of [...domainFiles, join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), ...phoneSurfaceFiles()]) {
    if (!existsSync(file)) continue;
    for (const n of nodesOf(file)) {
      if ((ts.isIdentifier(n) || ts.isStringLiteralLike(n)) && n.text === 'adminText') {
        checked('SU8');
        fail('SU8', `${where(file, n)} names adminText. A URL that fails approvalOpens is not kept at all (D6, §Attack F9)`);
      }
    }
  }
  // Read in setupActionsNow and setupAction's copy-admin-link arm alone.
  const action = hostMethod(ipc, 'setupAction');
  const copyBlock = (() => {
    const call = action === null ? undefined : callsIn(action, 'writeClipboard')[0];
    let b = call?.parent;
    while (b !== undefined && !ts.isBlock(b) && !ts.isCaseClause(b)) b = b.parent;
    return b === action?.body ? undefined : b;
  })();
  for (const n of nodesOf(ipc)) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'adminLink' || n.expression.kind !== ts.SyntaxKind.ThisKeyword) continue;
    const p = n.parent;
    if (p !== undefined && ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) continue;
    checked('SU8');
    const owner = hostMethodOf(n);
    const ok = owner === 'setupActionsNow' || (owner === 'setupAction' && copyBlock !== undefined && n.pos >= copyBlock.pos && n.end <= copyBlock.end);
    if (!ok) fail('SU8', `${where(ipc, n)}: ${owner ?? 'module scope'} reads this.adminLink. It is read only to list Copy link and to write it, and it never crosses to the renderer (D6)`);
  }
  const status = hostMethod(ipc, 'status');
  checked('SU8');
  if (status !== null && descendantsOf(status).some((n) => ts.isIdentifier(n) && n.text === 'adminLink')) fail('SU8', `${where(ipc, status)}: status() names adminLink; the link is main's alone and never crosses to the renderer (D6)`);
  // Never cleared by a return's read that still lacks Funnel's capabilities.
  const clears = sets.filter((a) => a.right.kind === ts.SyntaxKind.NullKeyword);
  for (const a of clears) {
    const owner = hostMethodOf(a);
    checked('SU8');
    if (owner === 'readOnReturn' || owner === 'recheck') fail('SU8', `${where(ipc, a)}: ${owner} drops the admin link. A return before the admin approves keeps Copy link (D6, the entry's attack)`);
    if (owner === 'sweepAndRead' && !guardsOf(ipc, a).some((g) => g === '!read.asksApproval')) fail('SU8', `${where(ipc, a)}: sweepAndRead drops the admin link on a read that still asks approval; only a read that shows Funnel's two capabilities (!read.asksApproval) drops it (D6)`);
  }
  const sweep = hostMethod(ipc, 'sweepAndRead');
  checked('SU8');
  if (sweep === null || !clears.some((a) => hostMethodOf(a) === 'sweepAndRead' && guardsOf(ipc, a).some((g) => g === '!read.asksApproval'))) {
    fail('SU8', `${sweep === null ? rel(ipc) : where(ipc, sweep)}: sweepAndRead never drops the admin link on a read that shows Funnel's two capabilities, so Copy link outlives the approval (D6)`);
  }
  // approvalText from this.approvalUrl, as today.
  if (status !== null) {
    const prop = descendantsOf(status).find((n) => ts.isPropertyAssignment(n) && memberName(n) === 'approvalText');
    checked('SU8');
    if (prop === undefined) fail('SU8', `${where(ipc, status)}: status() answers no approvalText`);
    else {
      const ids = descendantsOf(prop.initializer).filter((n) => ts.isIdentifier(n)).map((n) => n.text);
      const locals = ids.map((id) => descendantsOf(status).find((d) => ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === id)).filter((d) => d?.initializer !== undefined);
      const text = [codeOfNode(ipc, prop.initializer), ...locals.map((d) => codeOfNode(ipc, d.initializer))].join('\n');
      if (!/\bthis\.approvalUrl\b/.test(text) || /adminLink/.test(text)) fail('SU8', `${where(ipc, prop)}: approvalText is not composed from this.approvalUrl alone, as today (D6: the wait's own text arm is unchanged)`);
    }
  }
  void sf;
}

// ---- SU9, the words ------------------------------------------------------------

function drawnWordsRule() {
  const files = [...phoneSurfaceFiles(), join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts')];
  let read = 0;
  const judge = (file, node, text) => {
    for (const re of REFUSED_DRAWN_WORDS) {
      const m = re.exec(text);
      if (m !== null) fail('SU9', `${where(file, node)} says ${JSON.stringify(m[0])}. Every word says "terminal", and never beta, TestFlight, remote desktop, mirror, stream or SSH (his answer (3); research 140 §10)`);
    }
  };
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const { node, text } of codeStringsOf(file)) {
      read += 1;
      judge(file, node, text);
    }
    for (const n of nodesOf(file)) {
      if (!ts.isJsxText(n)) continue;
      read += 1;
      judge(file, n, n.text);
    }
  }
  const push = join(ROOT, 'src', 'shared', 'push-copy.ts');
  const decl = existsSync(push) ? nodesOf(push).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'PUSH_PUBLISHER_ONLY') : undefined;
  checked('SU9', read + 1);
  if (decl?.initializer === undefined) {
    fail('SU9', 'src/shared/push-copy.ts declares no PUSH_PUBLISHER_ONLY, the Alerts card\'s line (D14), so its words are not read');
  } else {
    for (const s of descendantsOf(decl.initializer).filter((n) => ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n))) judge(push, s, s.text);
  }
  if (read === 0) fail('SU9', 'no string of the sheet or the contract was read, so this rule asserts nothing');
}

function setupRules() {
  const ipc = moduleNamed('ipc', 'SU1', SU_IPC_OWNER);
  if (ipc === null) {
    for (const id of ['SU2', 'SU3', 'SU4', 'SU8']) fail(id, `src/main/pocket/ipc.ts does not exist, so this rule read nothing. It is ${SU_IPC_OWNER}.`);
  } else {
    for (const [id, run] of [
      ['SU1', returnRule],
      ['SU2', returnSurfaceRule],
      ['SU3', setupPressRule],
      ['SU4', statRule],
      ['SU8', adminLinkRule]
    ]) {
      try {
        run(ipc);
      } catch (err) {
        fail(id, `could not be read: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  for (const [id, run] of [
    ['SU5', accountRule],
    ['SU6', confirmBlockRule],
    ['SU7', wishRule],
    ['SU9', drawnWordsRule]
  ]) {
    try {
      run();
    } catch (err) {
      fail(id, `could not be read: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const PHASES = [
  ['the bind', bindRules, 'L1'],
  ['the Funnel target', funnelTargetRule, 'L3'],
  ['the route table', routeRules, 'R1'],
  ['the table’s membership', routeMembershipRule, 'R4'],
  ['the turn limit', turnLimitRule, 'R5'],
  ['the forbidden words', forbiddenRules, 'R3'],
  ['admission', admissionRules, 'A1'],
  ['the server', serverRules, 'S1'],
  ['the file modes', fileModeRule, 'W1'],
  ['the bridge', bridgeRule, 'B1'],
  ['no html', noHtmlRule, 'H1'],
  ['the loopback rule', loopbackRule, 'T1'],
  ['no push route', noPushRouteRule, 'N1'],
  ['the token’s one door', tokenDoorRule, 'N2'],
  ['no tailnet key', noTailnetKeyRule, 'K2'],
  ['the push key never enters the door', pushKeyPortRule, 'K3'],
  ['the others', othersRule, 'O1'],
  ['the QR', qrPinRule, 'F2'],
  ['the turn reads', turnReadRule, 'T2'],
  ['the launch step', launchRule, 'L5'],
  ['the last ask before a send', answerReadmitRule, 'A4'],
  ['no ssh hand-off', handoffRule, 'H2'],
  ['one press at a time', switchQueueRule, 'Q1'],
  ['the Funnel argv', funnelArgvRule, 'U1'],
  ['the Funnel program', funnelProgramRule, 'U2'],
  ['the Funnel child’s death', funnelDeathRule, 'U3'],
  ['the injected deps', injectedDepsRule, 'U4'],
  ['the built door', builtDoorRule, 'U5'],
  ['mutual TLS', mutualTlsRule, 'M1'],
  ['the hash', hashFieldsRule, 'M2'],
  ['the PROXY source', proxySourceRule, 'P1'],
  ['the length on every answer', contentLengthRule, 'C1'],
  ['/pair’s three answers', pairAnswerRule, 'N3'],
  ['the menu row', menuRowRule, 'MENU1'],
  ['the door’s import wall', doorImportRule, 'W2'],
  ['the door’s environment', doorEnvRule, 'E1'],
  ['the name module’s imports', nameImportRule, 'D1'],
  ['the name question', nameQueryRule, 'D2'],
  ['the refused ranges', nameRangesRule, 'D3'],
  ['when the name check runs', nameStartRule, 'D4'],
  ['the name check’s log lines', nameLogRule, 'D5'],
  ['the one pairable', pairableRule, 'D6'],
  ['the name servers override', nameOverrideRule, 'D7'],
  ['no real server outside Electron', nameElectronRule, 'D8'],
  ['the push seam waits for the name', seamNameRule, 'D9'],
  ['the progress decides nothing', nameProgressRule, 'D10'],
  // PHASE 317, the one write (build/p317/SPEC.md §6.1).
  ['the write path', writePathRules, 'X1'],
  ['the phone’s writes and the answer', pocketWritesRules, 'X5'],
  ['the door and a write', doorWriteRules, 'X7'],
  ['a phone removed by Remove alone', phoneRemovalRules, 'X9'],
  ['the lines say it', writeLinesRule, 'X12'],
  // PHASE 318, the reply (build/p318/SPEC.md §6.1).
  ['the reply', replyRules, 'Y1'],
  // PHASE 316.7, the sessions answer (build/p3167/SPEC.md §8.1).
  ['the sessions answer', sessionsAnswerRules, 'O2a'],
  // PHASE 337, the Screen (build/p337/SPEC.md §6.1).
  ['the Screen', screenRules, 'Z1'],
  // PHASE 337.1, the Screen scrolls back (build/p3371/SPEC.md §6.1). Its
  // rules drive two functions in-process, so this phase is awaited.
  ['the scrollback', scrollbackRules, 'Z23'],
  // PHASE 333.1, a stranger's first run (build/p3331/SPEC.md §6.1).
  ['a stranger’s first run', setupRules, 'SU1']
];

for (const [name, run, onError] of PHASES) {
  try {
    await run();
  } catch (err) {
    fail(onError, `${name} could not be read: ${err instanceof Error ? err.message : String(err)}`);
  }
}

let red = 0;
let total = 0;
for (const [id, owner, title] of RULES) {
  const n = checks.get(id);
  total += n;
  const ok = failures.get(id).length === 0;
  if (!ok) red += 1;
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(5)} ${String(n).padStart(4)} check(s)  ${owner}: ${title}\n`);
}
const seconds = ((Date.now() - t0) / 1000).toFixed(2);
if (red > 0) {
  process.stdout.write('\n');
  for (const [id, owner] of RULES) {
    for (const f of failures.get(id)) process.stdout.write(`  - [p313 ${id}] ${owner}: ${f}\n`);
  }
  process.stdout.write(`\n${TAG} FAIL: ${String(red)} of ${String(RULES.length)} rules red, ${String(total)} checks, ${seconds} s.\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS: ${String(RULES.length)} rules, ${String(total)} checks, ${seconds} s. ` +
    'No Electron, no tmux, no ssh, no agent, no socket, nothing under the person’s home.\n'
);
process.exit(0);
