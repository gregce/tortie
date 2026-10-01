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
  ['R2', 'SPEC §2, entry mechanism 4', 'every route is a read, and the ONE route that is not a GET is the pairing route, window-only and unsigned'],
  ['R4', 'the fix round, 2026-09-22', 'the table’s MEMBERSHIP is pinned: the exact set of method-and-path pairs, by sha256, so a fourth route is a visible edit rather than a green build'],
  ['R5', 'entry, mechanism 4', 'the turn limit is clamped AT THE DOOR against the overview store’s own MAX_TURN_LIMIT, which is imported and never re-spelled'],
  ['R3', 'entry, mechanism 4; build/p330/SPEC.md §6.1', 'the domain names no write verb, no status setter and no credential read, and starts NO process but funnel.ts’s spawn of the resolved program, its execFile of that program and of /bin/ps, and bind.ts’s one utilityProcess.fork'],
  ['A1', 'entry, mechanism 5', 'no Authorization header and no cookie is read or written anywhere in the domain'],
  ['A2', 'entry, mechanism 5, research 127 §7', 'no secret is in a path or a query: no route path interpolates and no 32-hex token is matched out of one'],
  ['A3', 'entry, mechanism 3', '/pair is dead outside its window, and the window is checked before anything is read off the request'],
  ['S1', 'entry, mechanism 5', 'Referrer-Policy: no-referrer is emitted from exactly ONE place'],
  ['W1', 'the fix round, 2026-09-22', 'every file and directory this domain creates names an owner-only mode, so one write in it cannot drift looser than its sibling'],
  ['B1', 'the judge, 2026-09-22; build/p330/SPEC.md §4.11; build/p3165/SPEC.md §6.1', 'the bridge and the registrar move together, and they carry the same THIRTEEN pocket channels the contract declares'],
  ['S3', 'entry, proof; hooks.ts:256-316', 'the disposer owns the door: admission closes on the first line of every stop, before any await, in main AND in the door process, and the stop ends the process and closes the listener'],
  ['G1', 'entry, proof; hooks.ts:368-385', 'no token, no body, no header value and no line of conversation is reachable from any log call'],
  ['T1', 'the operator, 2026-09-22', 'nothing in this repository binds a real interface: every test and every gate drives the door on loopback'],
  ['H1', 'his ruling, 2026-09-22 (“lets skip the web app”)', 'this domain composes NO HTML document and names no text/html content type: the page was built, could not be reached under mechanism 5’s own refusals, and was removed on his ruling, so a later round that wants one asks him rather than rebuilding it under a green gate'],
  ['N1', 'Phase 314, build/p314/SPEC.md §1.1 row 3', 'NO PUSH ROUTE EXISTS: no route id, path or contract id names push, apns, notify, device, token or alert, and the table’s membership is still Phase 313’s, byte for byte'],
  ['N2', 'Phase 314, build/p314/SPEC.md §6.2', 'THE DEVICE TOKEN HAS ONE DOOR IN AND NONE OUT: the presentation parser takes apt as bounded hex and ape as one of two words or refuses, no renderer-facing type carries a field named like a token, and PocketPushDestination lives in main alone'],
  ['K3', 'build/p3165/SPEC.md §6.1, §5.2.2', 'THE PUSH KEY NEVER ENTERS THE DOOR: PocketAlertsPort is exactly five members answering string | null, string | null, Promise<PocketPushKeyResult>, Promise<void> and void; PocketPushKeyResult is exactly kept and refusal; status() reads keyId() and sentence() of the port and nothing else, and alertsCanSend(), which /pair’s answer asks (research 136), reads keyId() alone; the two handlers call only host.choosePushKey(event.sender) and host.forgetPushKey(), which call only the port; the domain imports nothing of main/alerts; and PocketHostDeps.alerts is handed by src/main/capabilities.ts and tests alone'],
  ['K2', 'build/p330/SPEC.md §6.1 (K1 became K2)', 'NO TAILNET KEY ANYWHERE UNDER src/: no tailnetKey, no tk and no tskey- in any production file, because the code carries no credential at all now'],
  ['O1', 'build/p316/SPEC.md §4 S1 mechanism 4; his ruling of 2026-09-22', '`others` is exactly the listed sessions that are not blocked: composed from the same session list and the same blocked set as `rows`, capped at POCKET_OTHERS_MAX imported from the contract and never re-spelled, with the omitted count said'],
  ['F2', 'build/p330/SPEC.md §4.8.1 (F1 became F2)', 'the QR is v:3 and holds EXACTLY the eight keys v, host, port, fp, dk, dx, ps and exp, in that order, with no tk and no address; fp pins the LISTENING door’s public key and no window opens while there is nothing to pin'],
  ['T2', 'build/p316/SPEC.md §4 S1 mechanisms 2 and 3', 'every turn the door reads is preceded by the refresh through the one read path (`sessionActivity`), and every turn it answers passes through `toTurnView` once and is built nowhere else'],
  ['L5', 'build/p330/SPEC.md §6.1; CLAUDE.md refusal 8', 'the one fork of the door process and the one spawn of the Funnel child are reached only from openNow or recoverNow, behind the gate, each with the last-press check as the statement IMMEDIATELY before it; the launch step asks for enabled AND bindAtLaunch; a switch-off counts itself before its first await'],
  ['A4', 'build/p316/SPEC.md §4 S1 Method B; build/p330/SPEC.md §4.5.3', 'refusal 7 BY GENERATION: main keeps each door process’s admission by generation, refuses a request for a generation that is not the door’s or has begun to stop before a handler sees it, and asks again after the answer is composed with nothing awaited before the post; the handler asks the verified phone and the door instance again before it answers'],
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
  ['D6', 'build/p332/SPEC.md §4.11, §4.12 and its fix round; build/p3321/SPEC.md §8.1', 'pairable is ONE method of PocketHost, status() answers pairable: this.pairable(), beginPairing asks this.pairable() before stillPublished() and AGAIN after it and before its one this.pairing.open(), and PhoneSection.tsx reads .pairable in pairingStage, pairAfterAllowNext and onPair and compares nameCheck only with unreadable or confirmed, never inside those three'],
  ['D7', 'build/p332/SPEC.md §4.8', 'GMUX_POCKET_NAME_SERVERS is read in nameServersFrom alone, which answers the search for a packaged build before it looks, matches every entry against a pattern anchored on ^127\\.0\\.0\\.1:, answers refused for anything else and never the search; and askNameRound returns override-unusable for a refused source before it names findZoneServers'],
  ['D8', 'build/p332/SPEC.md §4.3 step 1', 'the shipping transport answers an error for a server that is not 127.0.0.1 unless process.versions.electron is a string, BEFORE it creates a socket: no test and no script reaches a real DNS server through it'],
  ['D9', 'build/p332/SPEC.md §4.13; after his ruling, 2026-09-30', 'THE PUSH SEAM PAIRS NOTHING WITHOUT THE NAME STAND-IN: nameStandInOnly answers nameServersFrom(…).kind === \'fixed\' alone, openDoorForPairing returns false on it before it first calls its host, waits a bounded time for host.status().pairable after the switch and before every return true, with the wait’s answer deciding a return false, and the seam presses beginPairing only on openDoorForPairing’s true'],
  ['D10', 'build/p3321/SPEC.md §5.3, §5.4, §8.1', 'THE PROGRESS DECIDES NOTHING AND CARRIES NOTHING: PocketNameAnswer is exactly record, negative and unreadable; PocketNameProgress is exactly answers, asking, elapsedMs and nextInMs and no string; PocketStatus.nameProgress is PocketNameProgress | null; in ipc.ts the run’s startedAt, nextAt, endedAt and answers, and this.nameShown, are read inside nameProgressNow alone and written only in beginNameCheck, stopNameCheck, armNameRound and settleNameRound; nameProgressNow is called once, in status(), as nameProgress: this.nameProgressNow(); and PhoneSection.tsx’s pairingStage, pairAfterAllowNext and every live onPair name no nameProgress']
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
    // R2. THE PROMISE IS "ZERO WRITE ROUTES", and the table says so in its own
    // fields rather than in a comment: every row declares `reads: true`. The
    // one row that is not a GET is the pairing route, and it is the only row
    // allowed to be unsigned or window-only — which is what makes "/pair is
    // dead outside its window" a property of the table rather than of a branch
    // somebody has to find.
    checked('R2', 3);
    const method = row['method'];
    const reads = row['reads'];
    const signed = row['signed'];
    const windowOnly = row['windowOnly'];
    const isPair =
      path !== undefined && ts.isStringLiteral(path) && path.text === '/pair';
    if (reads === undefined || reads.kind !== ts.SyntaxKind.TrueKeyword) {
      fail(
        'R2',
        `${where(file, node)}: the row does not declare reads: true. Phase 313 has ZERO write routes, and a row that does not say it is a read is one nobody can check.`
      );
    }
    if (method === undefined || !ts.isStringLiteral(method)) {
      fail('R2', `${where(file, node)}: a row declares no method as a literal`);
    } else if (method.text !== 'GET' && !isPair) {
      fail(
        'R2',
        `${where(file, node)}: the method is ${JSON.stringify(method.text)} on ${JSON.stringify(path === undefined ? '?' : path.text)}. ` +
          'The only non-GET row this door has is the pairing route.'
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
          `${where(file, node)}: ${JSON.stringify(path === undefined ? '?' : path.text)} is not signed: true. Every route but the pairing one is signed, and there is no bearer to fall back on.`
        );
      }
      if (windowOnly !== undefined && windowOnly.kind === ts.SyntaxKind.TrueKeyword) {
        fail('R2', `${where(file, node)}: a read route is windowOnly, which would make the door answer nothing once the window shuts`);
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
 */
const ROUTE_PIN = 'ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080';

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
  // all three in one commit too.
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
  if (declaredChannels.size !== 13) {
    fail('B1', `src/shared/ipc/pocket.ts's PocketInvokeChannelMap declares ${String(declaredChannels.size)} channel(s), not thirteen (${[...declaredChannels].join(', ')})`);
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
  ['send-keys', 'typing into a pane, which is not in this phase'],
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
  // presentation's own key for the token, `apt`.
  const LOGGABLE_POISON =
    /\b(?:tokens?|secrets?|keys?|signatures?|nonces?|body|payload|question|answer|prompt|transcript|contents|authorization|jwt|bearer|pem|apt|pushToken|deviceToken)\b/i;
  for (const file of domainFiles) {
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

/**
 * The membership pin Phase 313 landed, spelled a second time on purpose. R4
 * holds the table to `ROUTE_PIN`, which `--write-route-pin` rewrites; this
 * holds it to Phase 313's own value, which nothing rewrites. So a route added
 * for the push has to move BOTH, in the same commit, and says so twice.
 */
const PHASE_313_ROUTE_PIN = 'ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080';

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
    const lines = routeLines(routes);
    checked('N1');
    if (lines === null) {
      fail('N1', `${rel(routes)}: POCKET_ROUTES could not be read as literal rows, so nothing says no push route was added`);
    } else {
      const got = createHash('sha256').update(lines.join('\n')).digest('hex');
      if (got !== PHASE_313_ROUTE_PIN) {
        fail(
          'N1',
          `${rel(routes)}: the table's membership is no longer Phase 313's (${got.slice(0, 12)} against ${PHASE_313_ROUTE_PIN.slice(0, 12)}). ` +
            'Phase 314 adds no route, no write route and no token-refresh route; a later route is its own entry with its own tier.'
        );
      }
    }
    checked('N1');
    if (ROUTE_PIN !== PHASE_313_ROUTE_PIN) {
      fail('N1', `R4's pin is ${ROUTE_PIN.slice(0, 12)}, not Phase 313's ${PHASE_313_ROUTE_PIN.slice(0, 12)}, so the route table was re-pinned after Phase 313.`);
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
    }
  }

  // (c) ipc.ts: the host answers the phone question from its store, and the
  // verify it hands the handler names the phone.
  const ipc = moduleNamed('ipc', 'A4', "Phase 316.1 builder B's");
  if (ipc !== null) {
    const paired = functionsNamed(ipc, 'stillPaired');
    checked('A4', 2);
    if (paired.length !== 1) {
      fail('A4', `${rel(ipc)} declares ${String(paired.length)} stillPaired answers where the host hands the handler exactly one`);
    } else {
      const body = codeOfNode(ipc, paired[0]);
      if (!/\bphones\b/.test(body) || !/readStore\(|fields\(/.test(body) || !/phoneId/.test(body)) {
        fail('A4', `${where(ipc, paired[0])}: stillPaired does not look the phone up in the store's phones (${JSON.stringify(body.replace(/\s+/g, ' ').slice(0, 90))}), so the last ask answers something other than "is this phone still allowed"`);
      }
    }
    if (!/phoneId\s*:\s*verdict\.phone\.id\b/.test(codeTextOf(ipc))) {
      fail('A4', `${rel(ipc)}: the verify the host hands the handler does not name the phone it verified (phoneId: verdict.phone.id)`);
    }
    // (d) the premise: a Remove writes the store before its first await, so
    // the handler's last ask already sees the phone gone.
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
  const JOBS = new Set(['openNow', 'recoverNow', 'closeNow', 'closeNowUnlessConfirmed', 'unpublish', 'sweepAndRead', 'readAtPress']);
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
  const viaQueue = { openNow: 0, closeNow: 0, closeNowUnlessConfirmed: 0, recoverNow: 0, unpublish: 0, sweepAndRead: 0, readAtPress: 0 };
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
  for (const n of nodesOf(phone)) {
    if (!ts.isPropertyAccessExpression(n) || n.name.text !== 'nameCheck') continue;
    checked('D6');
    const p = n.parent;
    const ok =
      p !== undefined &&
      ts.isBinaryExpression(p) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind) &&
      ((p.left === n && ts.isStringLiteralLike(p.right) && NAME_WORDS.has(p.right.text)) || (p.right === n && ts.isStringLiteralLike(p.left) && NAME_WORDS.has(p.left.text)));
    if (!ok) fail('D6', `${where(phone, n)} reads nameCheck other than to compare it with 'unreadable' or 'confirmed'. The sheet reads it for the lines it draws above Pair and decides nothing else from it.`);
    else if (insideDecider(n)) fail('D6', `${where(phone, n)} compares nameCheck inside pairingStage, pairAfterAllowNext or onPair. Whether Pair shows, and whether a carried press asks for the code, is main's pairable and nothing the sheet works out from the name.`);
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
  ['the progress decides nothing', nameProgressRule, 'D10']
];

for (const [name, run, onError] of PHASES) {
  try {
    run();
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
