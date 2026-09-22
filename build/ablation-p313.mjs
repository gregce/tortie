#!/usr/bin/env node
/**
 * `npm run ablation:p313`. The attack on the door's two checks (Phase 313).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:pocket` asserts
 * twenty rules about `src/main/pocket/` — one `listen`, the address from the
 * allowlist function alone, the closed table, the refusals, the disposer owning
 * the listener — and `conformance:pocket:hostile` drives a live door. Every one
 * of those rules is a clause a later round can delete in one line. THIS SCRIPT
 * BREAKS ONE CLAUSE AT A TIME IN THE SHIPPING SOURCE AND PROVES IT REDDENS THE
 * RULE THAT OWNS IT.
 *
 * THE PAGE'S ARMS WERE REMOVED ON 2026-09-22, and this is the one place a later
 * round will look for them. `src/main/pocket/page/` was built, could not be
 * reached under this phase's own mechanism 5 — no script, no cookie, no bearer,
 * no URL token, so nothing a browser can do satisfies it — and the operator
 * ruled "lets skip the web app". Five arms went with it (`P1`, `P1b`, `P2`,
 * `P3`, `P3b`) and so did the page attack they ran. Do not restore them without
 * the page, and do not restore the page without a ruling.
 *
 * An ablation that leaves the check green is a hole in the check. An ablation
 * that reddens only rules OTHER than its own is a finding about the check
 * rather than about the build, and it is printed as one.
 *
 * ## THE ONES THAT MATTER MOST, SAID FIRST
 *
 * This domain is the first thing in Tortie that anything outside the Mac can
 * ask a question, and three of the entries below are the whole of the defence:
 *
 *   - `L2`, the bind. A door on `0.0.0.0` is a door on his home Wi-Fi, his
 *     hotel Wi-Fi and every network he ever joins. It is ONE STRING.
 *   - `R2`, the read-only table. A row whose method is not GET is a write
 *     however its handler is written today, and this phase has zero writes.
 *   - `S2`, the self refusal. Research 127 §7 item 10: a local process of his
 *     own user reaches this port and sends whatever header it likes, so the
 *     socket is destroyed before a header is read.
 *
 * ## IT NEVER WRITES INTO THE WORKING TREE
 *
 * Several builders work in one worktree during a phase and a harness that
 * writes into `src/` even for the second a check takes can lose another
 * builder's edit. So it builds a CLONE, the shape of `build/p293/ablation.mjs`:
 * `cp -Rc` (APFS clonefile) of `src/` and `build/` under
 * `/private/tmp/p313-ablation-<pid>`, every tsconfig and `package.json` copied,
 * `node_modules` symlinked, and every check run there with that directory as
 * its cwd. Each edited file is put back and CHECKED BY SHA256 against the
 * worktree's bytes before the next entry, and the clone is removed in a
 * `finally` and on a signal. Nothing under the operator's home is touched, and
 * the run ends by asserting the worktree's own bytes never moved.
 *
 * ## IT STARTS NOTHING BUT THE CHECKS
 *
 * No Electron, no tmux, no ssh, no agent, no token. `conformance:pocket` binds
 * nothing at all; the hostile client binds LOOPBACK on a port it found for
 * itself and closes it in its own `finally`, and this harness runs it inside
 * the clone exactly as the battery runs it.
 *
 * ## THE DELTA RULE
 *
 * The base's red rules are recorded first and each ablation must make its OWN
 * rule NEWLY red. That proves the ablation CAUSED the reddening rather than
 * inheriting it, and it lets this run while a sibling's half is not landed. A
 * red base is still reported and still fails the run unless
 * `P313_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/ablation-p313.mjs
 *   P313_ONLY=L2,R2,S2 node build/ablation-p313.mjs        named entries only
 *   P313_ALLOW_RED_BASE=1 node build/ablation-p313.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p313-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

const BIND = 'src/main/pocket/bind.ts';
const SERVER = 'src/main/pocket/server.ts';
const ROUTES = 'src/main/pocket/routes.ts';
const PAIRING = 'src/main/pocket/pairing.ts';
const TLS = 'src/main/pocket/tls.ts';
const PRELOAD = 'src/preload/index.ts';
const HOSTILE = 'build/p313/hostile-client.mts';

/**
 * The checks this harness runs inside the clone, in order. Each prints its
 * findings as `[p313 <rule>]`, which is what the delta below reads.
 */
const CHECKS = [
  ['gate', ['build/conformance-pocket.mjs']],
  ['hostile', ['build/p313/hostile-client.mjs']]
];

/**
 * The ablations. `rule` is the check rule that must go NEWLY red. `why` is what
 * the clause is FOR, in the words of the entry or the research that produced
 * it, so a reader of a failure knows what was lost rather than only that
 * something moved.
 */
const ABLATIONS = [
  // -------------------------------------------------------------------------
  // The bind. Mechanism 1, and the step change away from hooks.ts.
  // -------------------------------------------------------------------------
  {
    n: 'L1',
    rule: 'L1',
    name: 'a second listen call in the domain',
    why: 'two listeners is two binds, and the second one is the one nobody reviewed. The whole safety argument of this door rests on there being one address, decided in one place.',
    file: BIND,
    from: '        // THE ONE BIND CALL IN THIS MODULE.',
    to: "        server.listen(0, '127.0.0.1');\n        // THE ONE BIND CALL IN THIS MODULE."
  },
  {
    n: 'L2',
    rule: 'L2',
    name: 'the bind falls back to every interface when the address is empty',
    why: 'THIS IS THE ONE THAT MATTERS MOST. A door on 0.0.0.0 is a door on his home Wi-Fi, his hotel Wi-Fi and every network he ever joins. The entry says never 0.0.0.0, never a name resolved at run time, never a literal in a setting — and no address means NO DOOR rather than a wider one.',
    file: BIND,
    from: 'server.listen(input.port, address, () => {',
    to: "server.listen(input.port, address === '' ? '0.0.0.0' : address, () => {"
  },
  {
    n: 'L3',
    rule: 'L3',
    name: 'the tailnet range widened to a private range',
    why: "the address is READ, never chosen, and what it is read against is Tailscale's documented 100.64.0.0/10. Widened to 10.0.0.0/8 the door binds whatever his router handed him, which is his LAN — the home Wi-Fi bind the entry defers to a later phase with his ruling.",
    file: BIND,
    from: "export const TAILNET_IPV4_RANGE = '100.64.0.0/10';",
    to: "export const TAILNET_IPV4_RANGE = '10.0.0.0/8';"
  },
  {
    n: 'L4',
    rule: 'L4',
    name: "a taken port falls back to an ephemeral one, hooks.ts's own behaviour",
    why: 'hooks.ts:230-243 moves to an ephemeral port when its preferred one is taken, and that is right for a server whose clients are told its port by the process that started them. A phone was TOLD a number. A door that silently moves is a door the phone can no longer find and, worse, a port another process now holds.',
    file: BIND,
    from: '        const onError = (err: NodeJS.ErrnoException): void => {\n          resolve({ ok: false, code: err.code ?? \'\' });\n        };',
    to: '        const onError = (err: NodeJS.ErrnoException): void => {\n          server.listen(0, address);\n          resolve({ ok: false, code: err.code ?? \'\' });\n        };'
  },
  // -------------------------------------------------------------------------
  // The table. Mechanism 4, and CLAUDE.md refusals 5 and 8 read into a domain.
  // -------------------------------------------------------------------------
  {
    n: 'R1',
    rule: 'R1',
    name: 'the route table unfrozen',
    why: 'a closed table that anything can push a row onto at run time is not closed. The freeze is what makes "no route but these" a property of the object rather than a promise about the file.',
    file: ROUTES,
    from: 'export const POCKET_ROUTES: readonly PocketRoute[] = Object.freeze([',
    to: 'export const POCKET_ROUTES: readonly PocketRoute[] = (['
  },
  {
    n: 'R2',
    rule: 'R2',
    name: 'a read route turned into a POST',
    why: 'THE PHASE HAS ZERO WRITE ROUTES. No End, no message, no "seen it", no status, no rename, no restore, no remove. A method that is not GET is a write however its handler is written today, which is exactly why the method is in the table rather than in a handler.',
    file: ROUTES,
    from: "{ id: 'blocked', method: 'GET', path: '/v1/blocked', reads: true, windowOnly: false, signed: true }",
    to: "{ id: 'blocked', method: 'POST', path: '/v1/blocked', reads: true, windowOnly: false, signed: true }"
  },
  {
    n: 'R2b',
    rule: 'R2',
    name: 'a route declares reads: false',
    why: "the `reads` field exists so that adding a write is a VISIBLE EDIT TO THE TABLE rather than a quiet change inside a handler. A field nothing reads is a comment.",
    file: ROUTES,
    from: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: true",
    to: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: false"
  },
  {
    n: 'R3',
    rule: 'R3',
    name: 'the domain names a status setter',
    why: "CLAUDE.md refusal 5 read into this door: no configuration mechanism may set a session's status, and a phone is the least accountable configuration there is. `applyDetectedStatus` is one of the three names that would let it.",
    file: ROUTES,
    from: 'export const POCKET_ROUTES',
    to: "const seen = 'applyDetectedStatus';\nexport const POCKET_ROUTES"
  },
  {
    n: 'R3b',
    rule: 'R3',
    name: 'the domain imports the credentials domain',
    why: "research 127 §5's door table promises an import wall row forbidding main/credentials/ and main/logins/: a door that can read a credential is a door that can hand one out.",
    file: ROUTES,
    from: "import { attentionRows } from '../tray/attention';",
    to: "import { attentionRows } from '../tray/attention';\nimport type { VaultSeal } from '../credentials/vault';"
  },
  // -------------------------------------------------------------------------
  // Admission. Mechanism 5, and the adversary's first blocker.
  // -------------------------------------------------------------------------
  {
    n: 'A1',
    rule: 'A1',
    name: 'the door sets a cookie',
    why: "research 127 §5's door table lists 'set a cookie' among the things this door can never do, and a cookie is the one credential a browser sends to whoever holds the origin next — which, while Tortie is down, is any process of his own user.",
    file: SERVER,
    from: "  res.setHeader('Cache-Control', 'no-store');",
    to: "  res.setHeader('Cache-Control', 'no-store');\n  res.setHeader('Set-Cookie', 'tortie=1');"
  },
  {
    n: 'A1b',
    rule: 'A1',
    name: 'the door reads an Authorization header',
    why: 'mechanism 5 answers the adversary by REMOVING THE THING: there is no bearer anywhere, because research 127 §7 item 11 measured that a bearer on a port is captured by whoever holds the port next.',
    file: SERVER,
    from: "const from = normalisePocketAddress(req.socket.remoteAddress);",
    to: "const bearer = req.headers['authorization'];\n    const from = normalisePocketAddress(req.socket.remoteAddress);"
  },
  {
    n: 'A2',
    rule: 'A2',
    name: "the hook server's token-in-the-path shape appears on this door",
    why: 'a URL-borne secret leaves by Referer the first time a client follows an outbound link, and a signature that has been sent somewhere else cannot be taken back. The table is a set of exact strings BECAUSE every value rides in the query.',
    file: ROUTES,
    from: "export function matchPocketRoute(",
    to: "const TOKEN_PATH = /^\\/h\\/([0-9a-f]{32})$/;\nexport function matchPocketRoute("
  },
  // A3 IS ABOUT THE HANDLER'S ORDER, NOT ABOUT THE TABLE'S FIELD, and this arm
  // was aimed at the field until the integrator's round. Flipping the table's
  // `windowOnly` to false reddens R2, which owns that field, and the hostile
  // client — so the arm passed through A3 without ever testing it, and Builder C
  // reported A3 as decoration. It is not: A3's sentence is "the window is checked
  // BEFORE anything is read off the request", which lives in `server.ts`. This
  // arm now reads the body first and asks the window afterwards, which is the one
  // shape A3 exists to refuse: a dead route that has already read a stranger's
  // bytes has told them it is there.
  {
    n: 'A3',
    rule: 'A3',
    name: 'the body is read before the pairing window is asked',
    why: 'mechanism 3: /pair is dead outside a window of a few minutes, and a dead route reads nothing, because reading is what an attacker measures. A handler that reads the body first has done work for a request that does not exist.',
    file: SERVER,
    from: `    if (route.windowOnly && !deps.pairingWindowOpen()) {
      return refuse(res, 'window');
    }`,
    to: `    const preRead = await readBody(req, POCKET_PAIR_BODY_CAP_BYTES);
    if (preRead === null) return refuse(res, 'oversized');
    if (route.windowOnly && !deps.pairingWindowOpen()) {
      return refuse(res, 'window');
    }`
  },
  // And the field itself, which R2 owns. It is kept as its own arm, under the
  // rule that actually goes red, so the pair of them says which file each half
  // of "/pair is dead outside its window" lives in.
  {
    n: 'A3t',
    rule: 'R2',
    name: '/pair stops being window-only in the table',
    why: 'mechanism 3: /pair is dead outside a window of a few minutes and the window is the only time it exists. A permanently live /pair is a permanently open door on a machine that runs many agent processes at once.',
    file: ROUTES,
    from: "{ id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: true, signed: false }",
    to: "{ id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: false, signed: false }"
  },
  // -------------------------------------------------------------------------
  // The socket, the shutdown and the log.
  // -------------------------------------------------------------------------
  {
    n: 'S1',
    rule: 'S1',
    name: 'Referrer-Policy emitted from a second place',
    why: 'it is emitted on EVERY response from ONE place. A second emitter is a response that forgot, and the response that forgets is always the refusal nobody drew.',
    file: SERVER,
    from: "  res.setHeader('Referrer-Policy', 'no-referrer');",
    to: "  res.setHeader('Referrer-Policy', 'no-referrer');\n  if (status >= 400) res.setHeader('Referrer-Policy', 'no-referrer');"
  },
  {
    n: 'S2',
    rule: 'S2',
    name: 'the self-origin socket refusal deleted',
    why: 'THIS IS ONE OF THE FOUR THAT MATTER. Research 127 §7 item 10: a local process of his own user connects to this port directly and sends whatever header it likes, so identity in a header is worth nothing against it. The socket is destroyed before a header is read, which is the only place the question can be asked honestly.',
    file: BIND,
    from: '      if (this.refuseSelf && isSelfOrigin(socket.remoteAddress, address)) {\n        socket.destroy();\n      }',
    to: '      if (false) {\n        socket.destroy();\n      }'
  },
  {
    n: 'S2b',
    rule: 'S2',
    name: 'the self-origin branch kept and its destroy taken out',
    why: 'the question is still asked and its answer is thrown away. The rule asked the whole file for a destroy until the checker read it, and the shutdown arm and the clientError listener each hold one, so this shape was green under the gate that exists to catch it.',
    file: BIND,
    from: '      if (this.refuseSelf && isSelfOrigin(socket.remoteAddress, address)) {\n        socket.destroy();\n      }',
    to: '      if (this.refuseSelf && isSelfOrigin(socket.remoteAddress, address)) {\n        void socket;\n      }',
    needs: ['gate']
  },
  {
    n: 'S3',
    rule: 'S3',
    name: 'shutdown admission set AFTER an await instead of on the first line',
    why: "hooks.ts:256-281 is the shape and the order is the point: admission closes on the FIRST LINE of the stop, before any await, and that is what makes this a resource owner rather than a socket somebody closed. One await before it and a request accepted in that window composes an answer from a door that is going away.",
    file: BIND,
    from: '    this.shuttingDown = true;',
    to: '    await Promise.resolve();\n    this.shuttingDown = true;',
    all: false
  },
  {
    n: 'G1',
    rule: 'G1',
    name: "a refusal's log line carries the body",
    why: "hooks.ts's rule, with its own measurement behind it: never a token, a body or a conversation line in the log. This door's bodies are his own words and the agent's, and app.log is capped at 2 MiB with one archive.",
    file: SERVER,
    from: 'pocketLog.warn(`refused a request on the tailnet door: ${reason}`);',
    to: 'pocketLog.warn(`refused a request on the tailnet door: ${reason}`, { body });'
  },
  // -------------------------------------------------------------------------
  // THE FOUR THE FIX ROUND ADDED, and each one of them was GREEN under every
  // gate in this repository on 2026-09-22, which is why they are here. An
  // ablation that leaves the check green is a hole in the check, and these four
  // were the holes.
  // -------------------------------------------------------------------------
  {
    n: 'S4',
    rule: 'S4',
    name: "the self-origin comparison inverted, one character",
    why: 'S2 reads WHERE the destroy is and not which way the comparison points, so `===` to `!==` left the gate AND the hostile client green while a live door admitted the local socket — the drive went from a dead socket to a 404 with the whole handler run. This is the refusal that keeps every agent Tortie runs on this Mac off the door, and it is one character.',
    file: BIND,
    from: '  return stripped === bound;',
    to: '  return stripped !== bound;',
    needs: ['gate', 'hostile']
  },
  {
    n: 'S4b',
    rule: 'S4',
    name: 'the unknown-source guard fails OPEN instead of closed',
    why: 'a source address the door could not read is treated as THIS MACHINE, never as a stranger. Flipped, a socket whose remote address node did not give us is admitted — and that is exactly the socket nobody can reason about.',
    file: BIND,
    from: "  if (remote === undefined || remote.length === 0) return true; // fail closed",
    to: "  if (remote === undefined || remote.length === 0) return false; // fail closed"
  },
  {
    n: 'W1',
    rule: 'W1',
    name: 'the sealed identity written with no mode',
    why: "the two sealed files in this domain were written at different modes — 0o600 and, measured, 0o644 — and dropping the stricter one left both gates green. The payload is safeStorage ciphertext behind the keychain's ACL so today it changes nothing; what it changes is the precedent the next write in the domain copies.",
    file: TLS,
    from: "  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\\n`, {\n    encoding: 'utf8',\n    mode: 0o600\n  });",
    to: "  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\\n`, 'utf8');"
  },
  {
    n: 'R4',
    rule: 'R4',
    name: 'a FOURTH read route added under an existing route id',
    why: '"the route table is closed" is a promise about WHICH PATHS EXIST. R1 pins the table\'s shape and R2 pins each row\'s fields, and neither reads its membership: a fourth GET added under an existing id left conformance:pocket, the hostile client and gate:contract all green, because pocketRouteIdsAgree() compares only the id SET.',
    file: ROUTES,
    from: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true }",
    to: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true },\n  { id: 'turns', method: 'GET', path: '/v1/everything', reads: true, windowOnly: false, signed: true }",
    needs: ['gate']
  },
  {
    n: 'R5',
    rule: 'R5',
    name: 'the turn limit handed on unclamped',
    why: "the one route that answers a person's own conversation. Unclamped, ?limit=999999999 was measured going straight through to the store, whose listTurns puts it into a SQL LIMIT ? with no clamp of its own — so the entry's own protection, that one wide range cannot read a whole session into memory, rested on a clamp that was nowhere. Nothing else in this phase's proof list would have caught it.",
    file: ROUTES,
    from: '          ? Math.min(Math.floor(asked), MAX_TURN_LIMIT)',
    to: '          ? Math.floor(asked)',
    needs: ['gate']
  },
  {
    n: 'B1',
    rule: 'B1',
    name: 'the bridge installs a pocket member main does not serve',
    why: 'the one thing the build round did that was measurably WORSE than the build before it. window.gmux went 60 to 61 keys and all eight invokes rejected in the running app with "No handler registered for pocket:status", because registerPocketIpc is called from nowhere. The preload is the one part of this domain the bundler does not tree-shake, so it shipped.',
    file: PRELOAD,
    from: '// PHASE 313 IS NOT INSTALLED HERE, ON PURPOSE.',
    to: "import { pocket } from './pocket';\n// PHASE 313 IS NOT INSTALLED HERE, ON PURPOSE.",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // The rule the operator added on 2026-09-22.
  // -------------------------------------------------------------------------
  {
    n: 'T1',
    rule: 'T1',
    name: 'a check drives the door on a tailnet address instead of loopback',
    why: "his rule: nothing in this repository binds a real interface. A check that passed a tailnet address would open his door on his own tailnet for as long as the check ran, on a machine that runs many agent processes at once — and it would do it on every commit.",
    file: HOSTILE,
    from: "'127.0.0.1'",
    to: "'100.64.0.1'"
  },
  // -------------------------------------------------------------------------
  // His ruling of 2026-09-22, "lets skip the web app".
  // -------------------------------------------------------------------------
  {
    n: 'H1a',
    rule: 'H1',
    name: 'the door composes an HTML document again',
    why: 'the page this phase built could not be reached: mechanism 5 asks every read for a signature a browser cannot make without script, a cookie or a token in the URL, and it refuses all three. He ruled it out. Without this arm a later round could rebuild the page with every gate green, because the rules that used to notice left with the page they judged.',
    file: SERVER,
    from: "  res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    to: "  const page = '<!doctype html><title>Tortie</title>';\n  void page;\n  res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    needs: ['gate']
  },
  {
    n: 'H1b',
    rule: 'H1',
    name: 'an answer served as text/html',
    why: 'every answer this door writes is JSON for the phone app. An answer served as text/html is a page by another name, and it is the first step of the same rebuild.',
    file: SERVER,
    from: "  res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    to: "  res.setHeader('Content-Type', 'text/html; charset=utf-8');",
    needs: ['gate']
  }
];

// ---------------------------------------------------------------------------
// The clone, and the checks run inside it
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join('/private/tmp', `p313-ablation-${String(process.pid)}-`));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function buildClone() {
  for (const name of ['src', 'build']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
  }
  // EVERY tsconfig: tsx resolves project references out of tsconfig.json and a
  // clone holding one alone dies on a missing sibling (ablation:p275's lesson).
  for (const name of ['package.json', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))]) {
    writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/**
 * Run the named checks inside the clone and answer the rules that went red.
 *
 * EACH ENTRY NAMES WHICH CHECKS IT NEEDS, and that is a cost decision with a
 * measurement behind it: the read gate takes about a tenth of a second and the
 * hostile client stands up a TLS listener and shakes hands, which is seconds.
 * Running both for every entry cost 205 s measured on 2026-09-22 with the page's
 * five arms still in, and an entry that edits only the bind's own module learns
 * nothing from the door's handshake. The base is run with the UNION, once, so
 * every delta below is still against one base.
 */
function runChecks(which = CHECKS.map(([name]) => name)) {
  const red = new Set();
  let code = 0;
  let text = '';
  for (const [name, argv] of CHECKS) {
    if (!which.includes(name)) continue;
    const r = spawnSync(process.execPath, argv.map((a) => join(scratch, a)), {
      cwd: scratch,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120_000
    });
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    text += out;
    if ((r.status ?? 1) !== 0) code = 1;
    // LOWERCASE TAGS COUNT TOO. The hostile client prints `[p313 hostile]` and
    // the first draft of this regex demanded a leading capital, so every arm
    // driven by the client was invisible here: the S4 entry below reddens the
    // read gate AND arm 15, and only the gate was ever reported.
    for (const m of out.matchAll(/\[p313 ([A-Za-z]+[0-9a-z]*)\]/g)) red.add(m[1]);
  }
  return { code, red: [...red], text };
}

/**
 * Which checks an entry needs.
 *
 * A `hostile` finding belongs to the live client, so an entry whose rule is not
 * one of its needs the read gate alone. An entry that touches the route table,
 * the pairing window or the client itself runs both, because those are the
 * clauses where a read of the source and a drive of a live door can disagree.
 */
function checksFor(entry) {
  if (entry.needs !== undefined) return entry.needs;
  if (entry.file === HOSTILE) return ['gate', 'hostile'];
  if (entry.file === ROUTES || entry.file === PAIRING) return ['gate', 'hostile'];
  return ['gate'];
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

/** One exact replacement inside the clone; a function replacer, so `$&` stays literal. */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) return false;
  writeFileSync(path, text.replace(from, () => to), 'utf8');
  return true;
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

// The worktree's bytes for every file an entry touches, BEFORE anything runs,
// so the report can say the worktree was never written.
const touched = [...new Set(ABLATIONS.map((a) => a.file))].filter((f) => existsSync(join(REPO, f)));
const before = new Map(touched.map((f) => [f, sha(readFileSync(join(REPO, f)))]));

const problems = [];
const table = [];
let ran = 0;
const started = Date.now();

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  const base = runChecks();
  const baseRed = new Set(base.red);
  if (base.code === 0) {
    say('base: the three checks are green, 0 rules red');
  } else {
    say(`base: ALREADY RED on ${baseRed.size === 0 ? 'no numbered rule, so a check failed to run' : [...baseRed].join(', ')}`);
    for (const line of base.text.split('\n').filter((l) => l.includes('[p313 ')).slice(0, 8)) {
      say(`  base failure: ${line.trim().slice(0, 220)}`);
    }
    if (process.env['P313_ALLOW_RED_BASE'] !== '1') {
      problems.push(
        'the checks were red before any ablation ran. Every reading below is still a DELTA against that base, ' +
          'but re-run with P313_ALLOW_RED_BASE=1 once you know why.'
      );
    }
  }

  const only = (process.env['P313_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const entry of ABLATIONS) {
    if (only.length > 0 && !only.includes(entry.n)) continue;
    if (!ablate(entry.file, entry.from, entry.to)) {
      problems.push(
        `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this ` +
          `entry moves with it in the same commit, or it is gone and ${entry.rule} is unproven. It looked for: ` +
          `${JSON.stringify(entry.from).slice(0, 180)}`
      );
      table.push([entry.n, entry.rule, 'SHAPE MISSING', '']);
      continue;
    }
    ran += 1;
    const out = runChecks(checksFor(entry));
    const newlyRed = out.red.filter((r) => !baseRed.has(r));
    const own = newlyRed.includes(entry.rule);
    table.push([entry.n, entry.rule, out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', newlyRed.join(',')]);
    say(`${entry.n.padEnd(4)} ${entry.rule.padEnd(4)} ${entry.name}: exit ${String(out.code)}, newly red ${newlyRed.join(', ') || 'nothing'}`);
    if (out.code === 0) {
      problems.push(
        `${entry.n} "${entry.name}": the checks stayed GREEN. ${entry.why} Nothing notices, so ${entry.rule} is decoration.`
      );
    } else if (!own) {
      const lines = out.text.split('\n').filter((l) => l.includes('[p313 ')).slice(0, 3).map((l) => l.trim().slice(0, 220));
      problems.push(
        `${entry.n} "${entry.name}": something went red but ${entry.rule} did not (red instead: ` +
          `${newlyRed.join(', ') || 'nothing numbered'}). ${lines.join(' // ')}`
      );
    }
    restore(entry.file);
  }

  const after = runChecks();
  if (after.code !== base.code) {
    problems.push(
      `after every file was restored the checks exited ${String(after.code)} where the base exited ` +
        `${String(base.code)}, so a restore did not land.`
    );
  } else {
    say(`restored: every touched clone file matches the worktree by sha256, and the checks are back where they started (exit ${String(after.code)})`);
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

// The worktree was never written: every file an entry names has the bytes it had.
for (const [file, was] of before) {
  const now = sha(readFileSync(join(REPO, file)));
  if (now !== was) {
    problems.push(
      `${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness ` +
        'writes only its clone, so another process wrote it'
    );
  }
}

process.stdout.write('\n');
for (const [n, rule, verdict, red] of table) {
  process.stdout.write(`${TAG}   ${n.padEnd(5)} ${rule.padEnd(5)} ${verdict.padEnd(15)} ${red}\n`);
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} ablations, one clause each, and every one reddened THE RULE THAT ` +
    'OWNS IT, measured as a DELTA against the base. Every clone file was restored and proved by sha256, the ' +
    'worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token, and no ' +
    "listener but the two the hostile client opens on loopback and closes in its own finally.\n"
);
