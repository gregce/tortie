#!/usr/bin/env node
/**
 * `npm run ablation:p313`. The attack on the door's two checks (Phase 313;
 * re-aimed at the door on the internet by Phase 330, and at the Mac's public
 * name by Phase 332).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:pocket` asserts
 * sixty-five rules (fifty-three before Phase 317) about `src/main/pocket/` — one `listen`, on loopback, in the
 * door process; the Funnel child's argv, program and death; mutual TLS before
 * the parser; the closed table; the refusals; the disposer owning the door;
 * and since Phase 332 the name check's non-recursive, connected, authoritative
 * question, the override that is loopback or nothing, and the push seam that
 * pairs nothing until the name stand-in answers, and since Phase 316.5 the
 * Apple push key that reaches the sheet through a port and never the door,
 * and since Phase 332.1 the name check's progress, which is drawn on the one
 * monotonic clock and decides nothing —
 * and `conformance:pocket:hostile` drives a live door. Every one
 * of those rules is a clause a later round can delete in one line. THIS SCRIPT
 * BREAKS ONE CLAUSE AT A TIME IN THE SHIPPING SOURCE AND PROVES IT REDDENS THE
 * RULE THAT OWNS IT.
 *
 * THE SELF-ORIGIN ARMS WERE REMOVED BY PHASE 330 (`S2`, `S2b`, `S4`, `S4b`), with
 * the rules they proved and the `isSelfOrigin` they broke: behind Funnel every
 * connection arrives from 127.0.0.1, so a self-origin refusal refuses every
 * phone. The tailnet-range arm (`L3`) and the tailnet-key arms (`K1a` to `K1d`)
 * went with the address and the key; `L3` and `K2a` to `K2c` are new arms
 * under the rules that replaced them.
 *
 * THE PAGE'S ARMS WERE REMOVED ON 2026-09-22, and this is the one place a later
 * round will look for them. `src/main/pocket/page/` was built, could not be
 * reached under this phase's own mechanism 5 — no script, no cookie, no bearer,
 * no URL token, so nothing a browser can do satisfies it — and the operator
 * ruled "lets skip the web app". Five arms went with it (`P1`, `P1b`, `P2`,
 * `P3`, `P3b`) and so did the page attack they ran. Do not restore them without
 * the page, and do not restore the page without a ruling.
 *
 * PHASE 332.1 ADDED TEN ARMS (build/p3321/SPEC.md §8.2), 153 in all: `D4f` to
 * `D4i` break the fence on the one clock the sheet's progress reads, `D5b` logs
 * every round, `D6d` decides the carried press from `nameCheck`, and `D10a` to
 * `D10d` let the progress carry a string or decide Pair or `nameCheck`.
 *
 * PHASE 317 ADDED SIXTY-FOUR (build/p317/SPEC.md §6.1), 217 in all, one for
 * every new or widened clause of the two writes: `R2c` to `R2e` the closed
 * write list, `G1b` and `G1c` G1's new word and its new scope, `A4j` to `A4n`
 * the acted guard, the `after` that starts after the post unawaited and the
 * Remove's store write, and `X1a` to `X12c` the twelve X rules (the hostile
 * client's own arms are `X1` and `X2`, which is why these carry a letter). The
 * two arms that planted text above `pocketTableIsReadOnly()`, which Phase 317
 * replaced, plant it above `pocketWriteRouteIds()`; `R4` no longer reddens
 * `N1`, whose second pin on Phase 313's membership is gone; and `A4e`, which
 * blanked the host's stillPaired, blanks the one method the host now answers
 * it with (the handler and the write path each delegate to it); `A4c` removes
 * the acted-guarded last ask, and `P1c` plants its source on the local `word`
 * the refusal's log line now reads (G1, Phase 317).
 *
 * An ablation that leaves the check green is a hole in the check. An ablation
 * that reddens only rules OTHER than its own is a finding about the check
 * rather than about the build, and it is printed as one.
 *
 * ## THE ONES THAT MATTER MOST, SAID FIRST
 *
 * Since Phase 330 this domain answers the internet, through a Funnel child it
 * starts itself, and five of the entries below are the whole of the defence:
 *
 *   - `L2`, the bind. A door on `0.0.0.0` is a door on his home Wi-Fi, his
 *     hotel Wi-Fi and every network he ever joins. It is ONE STRING.
 *   - `R2`, the table's reads and its CLOSED write list. A row that says it
 *     is a read and is not a GET is a write nobody counted, and since Phase
 *     317 the writes are exactly `end` (its fix round took `unpair` out).
 *   - `M1c`, THE PIN. `rejectUnauthorized` is false because the key pin is the
 *     verification; without the pin every certificate a stranger makes reaches
 *     the HTTP parser (research 132 §9 condition 1).
 *   - `U1a`, `--bg`. The door published after Tortie quits, after every
 *     reboot, with nobody holding it.
 *   - `U2a`, the override that falls back. A probe's wrong wrapper path would
 *     run HIS Tailscale and publish on HIS tailnet.
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
const HOSTILE = 'build/p313/hostile-client.mts';
const IPC = 'src/main/pocket/ipc.ts';
const SHARED = 'src/shared/ipc/pocket.ts';
const FACTS = 'src/main/pocket/facts.ts';
const CAPABILITIES = 'src/main/capabilities.ts';
// PHASE 330: the door process's modules, the Funnel child, the bridge's
// pocket member, the menu and the build's entry.
const TABLE = 'src/main/pocket/door/table.ts';
const LISTENER = 'src/main/pocket/door/listener.ts';
const SEND = 'src/main/pocket/door/send.ts';
const LIMITS = 'src/main/pocket/door/limits.ts';
const WIRE = 'src/main/pocket/door/wire.ts';
const DOOR_PROCESS = 'src/main/pocket/door-process.ts';
const FUNNEL = 'src/main/pocket/funnel.ts';
const PRELOAD_POCKET = 'src/preload/pocket.ts';
const MENU = 'src/main/menu.ts';
const VITE = 'electron.vite.config.ts';
// PHASE 332: the Mac's name check, the sheet that draws its answer, and the
// DNS stand-in every door probe runs.
const NAMES = 'src/main/pocket/public-name.ts';
const PHONE_SECTION = 'src/renderer/settings/PhoneSection.tsx';
const DNS_STANDIN = 'build/p332/dns-standin.mjs';
// The round after his ruling of 2026-09-30: the push seam, the one caller of
// beginPairing outside a test, waits for the name too (D9).
const SEAM = 'src/main/harness/push-seam.ts';
// PHASE 317: the one write path in the door's domain, and the one write
// implementation outside it.
const WRITES = 'src/main/pocket/writes.ts';
const POCKET_WRITES = 'src/main/sessions/pocket-writes.ts';
// PHASE 316.5: the key's port lives in ipc.ts; the bridge member is the
// preload's; the push seam is the one other composer of a PocketHost.

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
  // The bind. Since Phase 330 the one listen is the door process's own, on
  // loopback, on an ephemeral port.
  // -------------------------------------------------------------------------
  {
    n: 'L1',
    rule: 'L1',
    name: 'a second listen call in the domain',
    why: 'two listeners is two binds, and the second one is the one nobody reviewed. The door process is the only thing that listens, because a listener anywhere else parses a stranger’s bytes somewhere that holds his credentials.',
    file: LISTENER,
    from: '    // THE ONE LISTEN IN THE DOMAIN.',
    to: "    server.listen(0, '127.0.0.1');\n    // THE ONE LISTEN IN THE DOMAIN.",
    needs: ['gate']
  },
  {
    n: 'L2',
    rule: 'L2',
    name: 'the door binds every interface',
    why: 'THIS IS ONE OF THE ONES THAT MATTER MOST. A door on 0.0.0.0 is a door on his home Wi-Fi, his hotel Wi-Fi and every network he ever joins, beside the one Funnel publishes. It is ONE STRING.',
    file: LISTENER,
    from: "server.listen(0, '127.0.0.1', () => {",
    to: "server.listen(0, '0.0.0.0', () => {",
    needs: ['gate']
  },
  {
    n: 'L2b',
    rule: 'L2',
    name: 'the host is computed rather than the literal 127.0.0.1',
    why: 'a host that is computed is a host nobody can read here, and the macOS Tailscale variants forward only to loopback (research 132 §3.8).',
    file: LISTENER,
    from: "server.listen(0, '127.0.0.1', () => {",
    to: 'server.listen(0, host.name, () => {',
    needs: ['gate']
  },
  {
    n: 'L3',
    rule: 'L3',
    name: 'the Funnel target is not loopback',
    why: 'the child forwards the internet to its target. A target that is not the listener’s 127.0.0.1 forwards it to something that is not the door.',
    file: FUNNEL,
    from: '  return `127.0.0.1:${String(localPort)}`;',
    to: '  return `127.0.0.2:${String(localPort)}`;',
    needs: ['gate']
  },
  {
    n: 'L3b',
    rule: 'L3',
    name: 'the Funnel target’s port is a stored field rather than the one the listener reported',
    why: 'the local port is ephemeral and the listener reports it; a stored port is a port something else may hold, and the child would publish that instead.',
    file: IPC,
    from: '          localPort: door.localPort',
    to: '          localPort: fields.publicPort',
    needs: ['gate']
  },
  {
    n: 'L4',
    rule: 'L4',
    name: 'the listener takes a fixed port',
    why: 'the phone is told the PUBLIC port; the local one is told to the Funnel child alone, and a fixed one is a setting nothing needs that something can squat.',
    file: LISTENER,
    from: "server.listen(0, '127.0.0.1', () => {",
    to: "server.listen(8443, '127.0.0.1', () => {",
    needs: ['gate']
  },
  {
    n: 'L4b',
    rule: 'L4',
    name: 'port 443 becomes one of the door’s',
    why: 'research 132 §9 condition 6: 8443, then 10000, and 443 is his.',
    file: FUNNEL,
    from: 'export const FUNNEL_PORTS: readonly number[] = POCKET_PUBLIC_PORTS;',
    to: 'export const FUNNEL_PORTS: readonly number[] = [443, ...POCKET_PUBLIC_PORTS];',
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // The table, in door/table.ts since Phase 330.
  // -------------------------------------------------------------------------
  {
    n: 'R1',
    rule: 'R1',
    name: 'the route table unfrozen',
    why: 'a closed table that anything can push a row onto at run time is not closed.',
    file: TABLE,
    from: 'export const POCKET_ROUTES: readonly PocketRoute[] = Object.freeze([',
    to: 'export const POCKET_ROUTES: readonly PocketRoute[] = (['
  },
  {
    n: 'R1b',
    rule: 'R1',
    name: 'the module that re-exports the table grows a prefix match',
    why: 'routes.ts answers the routes and re-exports the table; a prefix match there is the wildcard a closed table exists to refuse, whichever file it is in.',
    file: ROUTES,
    from: 'export function pocketWriteRouteIds(): readonly PocketWriteRouteId[] {',
    to: "export const nearly = (p: string): boolean => p.startsWith('/v1');\nexport function pocketWriteRouteIds(): readonly PocketWriteRouteId[] {",
    needs: ['gate']
  },
  {
    n: 'R2',
    rule: 'R2',
    name: 'a read route turned into a POST',
    why: 'A ROW THAT SAYS IT IS A READ IS A GET. A POST that declares reads: true is a write nobody counted, however its handler is written today (the closed write list is end, Phase 317).',
    file: TABLE,
    from: "{ id: 'blocked', method: 'GET', path: '/v1/blocked', reads: true, windowOnly: false, signed: true }",
    to: "{ id: 'blocked', method: 'POST', path: '/v1/blocked', reads: true, windowOnly: false, signed: true }"
  },
  {
    n: 'R2b',
    rule: 'R2',
    name: 'a read route declares reads: false',
    why: 'the `reads` field exists so that adding a write is a VISIBLE EDIT TO THE TABLE, and the write list is closed: end (Phase 317).',
    file: TABLE,
    from: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: true",
    to: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: false"
  },
  {
    n: 'R3',
    rule: 'R3',
    name: 'the domain names a status setter',
    why: "CLAUDE.md refusal 5 read into this door: no configuration mechanism may set a session's status.",
    file: TABLE,
    from: 'export const POCKET_ROUTES',
    to: "const seen = 'applyDetectedStatus';\nexport const POCKET_ROUTES",
    needs: ['gate']
  },
  {
    n: 'R3b',
    rule: 'R3',
    name: 'the domain imports the credentials domain',
    why: 'a door that can read a credential is a door that can hand one out.',
    file: ROUTES,
    from: "import { attentionRows, blockedAge, type WakeWindow } from '../tray/attention';",
    to: "import { attentionRows, blockedAge, type WakeWindow } from '../tray/attention';\nimport type { VaultSeal } from '../credentials/vault';"
  },
  {
    n: 'R3c',
    rule: 'R3',
    name: 'the door imports the push engine',
    why: 'the door speaks to a phone and nothing else; a door that can name the sender is one edit away from sending.',
    file: IPC,
    from: "import { createPocketHandler } from './server';",
    to: "import { createPocketHandler } from './server';\nimport '../push/engine';",
    needs: ['gate']
  },
  {
    n: 'R3d',
    rule: 'R3',
    name: 'main’s door module imports child_process',
    why: 'CLAUDE.md refusal 8: the domain starts the program resolveTailscale answered and /bin/ps from funnel.ts, and the door process from bind.ts, and nothing else.',
    file: BIND,
    from: "import { join } from 'node:path';",
    to: "import { join } from 'node:path';\nimport { execFile } from 'node:child_process';\nvoid execFile;",
    needs: ['gate']
  },
  {
    n: 'R3e',
    rule: 'R3',
    name: 'the Funnel child is spawned on a program that is not the one resolved',
    why: 'THE SPAWN IS THE CONFIRMED FIELD. What runs is resolveTailscale’s answer, hashed; a literal program is a start nobody confirmed.',
    file: FUNNEL,
    from: '    child = deps.spawn(input.program, argv);',
    to: "    child = deps.spawn('/bin/sh', argv);",
    needs: ['gate']
  },
  {
    n: 'R3f',
    rule: 'R3',
    name: 'the ps wrapper runs something that is not /bin/ps',
    why: 'the record’s two reads are the one other program the domain runs, by its absolute path.',
    file: FUNNEL,
    from: "  const started = await execReal('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { env });",
    to: "  const started = await execReal('/bin/sh', ['-p', String(pid), '-o', 'lstart='], { env });",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // Admission.
  // -------------------------------------------------------------------------
  {
    n: 'A1',
    rule: 'A1',
    name: 'the door sets a cookie',
    why: 'a cookie is the one credential a browser sends to whoever holds the origin next.',
    file: SEND,
    from: "  res.setHeader('Cache-Control', 'no-store');",
    to: "  res.setHeader('Cache-Control', 'no-store');\n  res.setHeader('Set-Cookie', 'tortie=1');",
    needs: ['gate']
  },
  {
    n: 'A1b',
    rule: 'A1',
    name: 'the door reads an Authorization header',
    why: 'there is no bearer anywhere, because a bearer on a port is captured by whoever holds the port next.',
    file: LISTENER,
    from: '    // REFUSAL 2. Before the path, before the query, before the body.',
    to: "    const bearer = req.headers['authorization'];\n    void bearer;\n    // REFUSAL 2. Before the path, before the query, before the body.",
    needs: ['gate']
  },
  {
    n: 'A2',
    rule: 'A2',
    name: "the hook server's token-in-the-path shape appears on this door",
    why: 'a URL-borne secret leaves by Referer the first time a client follows an outbound link.',
    file: TABLE,
    from: 'export function matchPocketRoute(',
    to: 'const TOKEN_PATH = /^\\/h\\/([0-9a-f]{32})$/;\nexport function matchPocketRoute(',
    needs: ['gate']
  },
  {
    n: 'A3',
    rule: 'A3',
    name: 'the body is read before the pairing window is asked',
    why: 'mechanism 3: /pair is dead outside a window, and a dead route reads nothing, because reading is what an attacker measures.',
    file: LISTENER,
    from: "    if (route.windowOnly && !windowOpen) return refuseRequest(res, 'window');",
    to: "    const early = await readCapped(req, POCKET_PAIR_BODY_CAP_BYTES);\n    void early;\n    if (route.windowOnly && !windowOpen) return refuseRequest(res, 'window');",
    needs: ['gate']
  },
  {
    n: 'A3t',
    rule: 'R2',
    name: '/pair stops being window-only in the table',
    why: 'a permanently live /pair is a permanently open door.',
    file: TABLE,
    from: "{ id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: true, signed: false }",
    to: "{ id: 'pair', method: 'POST', path: '/pair', reads: true, windowOnly: false, signed: false }"
  },
  // -------------------------------------------------------------------------
  // The one writer, the shutdown and the log.
  // -------------------------------------------------------------------------
  {
    n: 'S1',
    rule: 'S1',
    name: 'Referrer-Policy emitted from a second place',
    why: 'one header, one place: a second emitter is a response that forgot.',
    file: SEND,
    from: "  res.setHeader('Referrer-Policy', 'no-referrer');",
    to: "  res.setHeader('Referrer-Policy', 'no-referrer');\n  if (status >= 400) res.setHeader('Referrer-Policy', 'no-referrer');",
    needs: ['gate']
  },
  {
    n: 'S3',
    rule: 'S3',
    name: 'main’s stop closes admission AFTER an await',
    why: 'hooks.ts:256-281 is the shape: admission closes on the FIRST LINE of the stop, before any await. One await before it and a request forwarded in that window composes an answer from a door that is going away.',
    file: BIND,
    from: "    const startedAt = Date.now();\n    this.shuttingDown = true;\n    this.post({ kind: 'shutdown' });",
    to: "    const startedAt = Date.now();\n    await Promise.resolve();\n    this.shuttingDown = true;\n    this.post({ kind: 'shutdown' });",
    needs: ['gate']
  },
  {
    n: 'S3b',
    rule: 'S3',
    name: 'the door process’s stop closes admission AFTER an await',
    why: 'the door is two processes now, and a stop that closed admission in one and awaited before the other would answer a request the person had switched off.',
    file: LISTENER,
    from: '    stopping = true;\n    shuttingDown = true;',
    to: '    stopping = true;\n    await Promise.resolve();\n    shuttingDown = true;',
    needs: ['gate']
  },
  {
    n: 'G1',
    rule: 'G1',
    name: "a refusal's log line carries the body",
    why: "never a token, a body or a conversation line in the log: app.log is capped at 2 MiB with one archive.",
    file: SERVER,
    from: 'pocketLog.warn(`refused a request at the door: ${reason}`);',
    to: 'pocketLog.warn(`refused a request at the door: ${reason}`, { body: reason });',
    needs: ['gate']
  },
  {
    n: 'W1',
    rule: 'W1',
    name: 'the sealed identity written with no mode',
    why: 'one write in the domain that is looser than its sibling is the one a later round copies.',
    file: TLS,
    from: "  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\\n`, {\n    encoding: 'utf8',\n    mode: 0o600\n  });",
    to: "  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\\n`, 'utf8');",
    needs: ['gate']
  },
  {
    n: 'R4',
    rule: 'R4',
    name: 'a FOURTH read route added under an existing route id',
    why: '"the route table is closed" is a promise about WHICH PATHS EXIST, and R4 pins the set by sha256.',
    file: TABLE,
    from: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true }",
    to: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true },\n  { id: 'turns', method: 'GET', path: '/v1/everything', reads: true, windowOnly: false, signed: true }",
    needs: ['gate']
  },
  {
    n: 'R5',
    rule: 'R5',
    name: 'the turn limit handed on unclamped',
    why: "one wide range must not read a whole session into memory.",
    file: ROUTES,
    from: '          ? Math.min(Math.floor(asked), MAX_TURN_LIMIT)',
    to: '          ? Math.floor(asked)',
    needs: ['gate']
  },
  {
    n: 'B1',
    rule: 'B1',
    name: 'the bridge installs a pocket member main no longer serves',
    why: 'every invoke on that member rejects at run time with "No handler registered", which is a bridge advertising a surface that throws.',
    file: CAPABILITIES,
    from: '  registerPocketIpc(ipcMain, pocketHost);\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'B1b',
    rule: 'B1',
    name: 'the bridge drops pocket:openApproval while the contract and the host keep it',
    why: 'eleven channels in three places: the one that is missing is the Open Tailscale button that throws.',
    file: PRELOAD_POCKET,
    from: "  openApproval: () => invoke('pocket:openApproval'),",
    to: "  openApproval: () => Promise.resolve(false),",
    needs: ['gate']
  },
  {
    n: 'B1c',
    rule: 'B1',
    name: 'the bridge drops pocket:choosePushKey while the contract and the host keep it (Phase 316.5)',
    why: 'thirteen channels in three places: the one that is missing is the Choose… button that answers something main never said.',
    file: PRELOAD_POCKET,
    from: "  choosePushKey: () => invoke('pocket:choosePushKey'),",
    to: '  choosePushKey: () => Promise.resolve({ kept: false, refusal: null }),',
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // K3: the push key never enters the door (Phase 316.5).
  // -------------------------------------------------------------------------
  {
    n: 'K3a',
    rule: 'K3',
    name: 'a port member answers the p8',
    why: 'the port is how the key reaches the sheet, so it is also how the key would reach the door: an id that is public, a sentence, whether a key was kept, and nothing else.',
    file: IPC,
    from: '  chooseKey(sender: WebContents): Promise<PocketPushKeyResult>;',
    to: '  chooseKey(sender: WebContents): Promise<PocketPushKeyResult & { p8: string }>;',
    needs: ['gate']
  },
  {
    n: 'K3b',
    rule: 'K3',
    alsoRed: ['R3'],
    name: 'ipc.ts imports the alerts’ composition',
    why: 'a door that can name the composition holding the sender and the Apple push key can be made to read the key; it reaches them through the port it is handed.',
    file: IPC,
    from: "import { createPocketHandler } from './server';",
    to: "import { createPocketHandler } from './server';\nimport { createPhoneAlerts } from '../alerts/index';\nvoid createPhoneAlerts;",
    needs: ['gate']
  },
  {
    n: 'K3d',
    rule: 'K3',
    name: 'whether this Mac can send asks the port for more than the key id (research 136)',
    why: '/pair’s answer asks it while a window is open, and /pair is reached from the internet: it may read the public key id and nothing else of the port.',
    file: IPC,
    from: '    return (this.deps.alerts?.keyId() ?? null) !== null;',
    to: "    return (this.deps.alerts?.keyId() ?? null) !== null && this.deps.alerts?.sentence() !== 'p3165';",
    needs: ['gate']
  },
  {
    n: 'K3c',
    rule: 'K3',
    name: 'the push seam hands the host an alerts port',
    why: 'the port reaches the key’s store; only the composition that holds the production sender hands it in, and a harness that did would carry a second sender’s port into the sheet.',
    file: SEAM,
    from: '  const host = new PocketHost({ facts });',
    to: '  const host = new PocketHost({ facts, alerts: undefined });',
    needs: ['gate']
  },
  {
    n: 'T1',
    rule: 'T1',
    name: 'a check dials the door on a tailnet address instead of loopback',
    why: "his rule: nothing in this repository binds or dials a real interface. The arm is read from the source and never run, so no packet leaves.",
    file: HOSTILE,
    from: "netConnect(localPort, '127.0.0.1')",
    to: "netConnect(localPort, '100.64.0.1')",
    needs: ['gate']
  },
  {
    n: 'H1a',
    rule: 'H1',
    name: 'the door composes an HTML document again',
    why: 'his ruling, "lets skip the web app": a page is not this phase to serve.',
    file: SEND,
    from: "  if (bytes !== null) res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    to: "  const page = '<!doctype html><title>Tortie</title>';\n  void page;\n  if (bytes !== null) res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    needs: ['gate']
  },
  {
    n: 'H1b',
    rule: 'H1',
    name: 'an answer served as text/html',
    why: 'every answer this door writes is JSON for the phone app.',
    file: SEND,
    from: "  if (bytes !== null) res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    to: "  if (bytes !== null) res.setHeader('Content-Type', 'text/html; charset=utf-8');",
    needs: ['gate']
  },
  {
    n: 'N1',
    rule: 'N1',
    alsoRed: ['R4'],
    name: 'a push route added to the table',
    why: 'the device token rides inside the sealed pairing presentation, so no route is added for the push.',
    file: TABLE,
    from: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true }",
    to: "  { id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true },\n  { id: 'push', method: 'GET', path: '/v1/push', reads: true, windowOnly: false, signed: true }",
    needs: ['gate']
  },
  {
    n: 'N2',
    rule: 'N2',
    name: 'a device token put on the view the renderer is handed',
    why: 'the token is an address at Apple and stays in main.',
    file: SHARED,
    from: "  alerts: 'none' | 'on' | 'stopped';",
    to: "  alerts: 'none' | 'on' | 'stopped';\n  pushToken: string;",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // K2: no tailnet key anywhere under src/ (K1 became K2 in Phase 330).
  // -------------------------------------------------------------------------
  {
    n: 'K2a',
    rule: 'K2',
    name: 'the sheet’s view carries a tailnet key again',
    why: 'the phone never joins the tailnet, so no code carries its key; a field for one is the first line of bringing it back.',
    file: SHARED,
    from: 'export interface PocketPairingView {\n  state: PocketPairingState;',
    to: 'export interface PocketPairingView {\n  state: PocketPairingState;\n  tailnetKey: string | null;',
    needs: ['gate']
  },
  {
    n: 'K2b',
    rule: 'K2',
    alsoRed: ['F2'],
    name: 'the QR carries a tk again',
    why: 'the v:2 code carried his tailnet key as plain JSON the iPhone Camera shows to whatever it offers to do with text (research 132 §10 item 1).',
    file: PAIRING,
    from: '      exp: expiresAt\n    });',
    to: '      exp: expiresAt,\n      tk: null\n    });',
    needs: ['gate']
  },
  {
    n: 'K2c',
    rule: 'K2',
    name: 'a tskey- prefix spelled in a production file',
    why: 'Tortie holds no Tailscale credential of any kind (research 128 §3.2).',
    file: ROUTES,
    from: 'export function pocketWriteRouteIds(): readonly PocketWriteRouteId[] {',
    to: "export const KEY_SHAPE = 'tskey-auth-';\nexport function pocketWriteRouteIds(): readonly PocketWriteRouteId[] {",
    needs: ['gate']
  },
  {
    n: 'O1a',
    rule: 'O1',
    name: 'others is no longer capped',
    why: 'an answer of unbounded size on a phone on a train.',
    file: ROUTES,
    from: '        .slice(0, POCKET_OTHERS_MAX)',
    to: '        .slice(0)'
  },
  {
    n: 'O1b',
    rule: 'O1',
    name: 'others stops being the complement of the blocked set',
    why: 'a waiting session drawn twice, once in each list.',
    file: ROUTES,
    from: '        .filter((s) => !blockedIds.has(s.id))',
    to: '        .filter((s) => s.id.length > 0)'
  },
  // -------------------------------------------------------------------------
  // F2: the QR (F1 became F2).
  // -------------------------------------------------------------------------
  {
    n: 'F2a',
    rule: 'F2',
    name: 'the QR pins the CERTIFICATE again',
    why: 'the certificate is renewed every 397 days, so a certificate pin un-pairs every phone.',
    file: IPC,
    from: 'spkiPinOf(door.publicKeyFingerprint)',
    to: 'spkiPinOf(door.certificateFingerprint)',
    needs: ['gate']
  },
  {
    n: 'F2b',
    rule: 'F2',
    name: 'the QR says v:2',
    why: 'a v:2 reader would look for fields v:3 does not carry and dial a name as if it were an address.',
    file: PAIRING,
    from: 'export const POCKET_QR_VERSION = 3;',
    to: 'export const POCKET_QR_VERSION = 2;',
    needs: ['gate']
  },
  {
    n: 'F2c',
    rule: 'F2',
    name: 'a window opens with nothing to pin',
    why: 'a QR carrying fp: null tells a phone to trust whatever answers.',
    file: PAIRING,
    from: "    if (pin === null) throw gmuxError('INVALID_INPUT', NO_DOOR_TO_PIN);\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'F2d',
    rule: 'F2',
    name: 'the QR’s keys reordered',
    why: 'the vectors pin the code byte for byte; the order is part of the format the phone was built against.',
    file: PAIRING,
    from: '      host: fields.publicName,\n      port: fields.publicPort,',
    to: '      port: fields.publicPort,\n      host: fields.publicName,',
    needs: ['gate']
  },
  {
    n: 'T2a',
    rule: 'T2',
    name: '/v1/turns reads the store without the refresh',
    why: 'a bare read answers what the conversation WAS.',
    file: ROUTES,
    from: '      await refresh(sessionId);\n      // AGAIN, after the yield (see `session`).',
    to: '      // AGAIN, after the yield (see `session`).'
  },
  {
    n: 'T2b',
    rule: 'T2',
    name: 'a turn built without toTurnView',
    why: 'toTurnView holds the one clip.',
    file: FACTS,
    from: "  const view = toTurnView(turn, turn.gitVerdict ?? 'nothing-to-check', false);",
    to: "  const view = { ...turn, git: 'nothing-to-check' as const, namedOnlyOutside: false, askClipped: false, answerClipped: false };"
  },
  {
    n: 'T2c',
    rule: 'T2',
    name: 'the composer’s refresh stops going through the one read path',
    why: 'the production composer must refresh through sessionActivity.',
    file: FACTS,
    from: '      const answer = await sessionActivity(deps.overview, { sessionIds: [sessionId] });',
    to: '      const answer = { sessions: [] as OverviewSessionActivity[] };',
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // L5: the fork and the spawn, from the queued start, behind the gate, each
  // right after the last-press check.
  // -------------------------------------------------------------------------
  {
    n: 'L5a',
    rule: 'L5',
    name: 'the launch step stops asking for bindAtLaunch',
    why: 'CLAUDE.md refusal 8: a door switched on for the session would open every time Tortie starts.',
    file: IPC,
    from: "    if (store === null || !store.enabled || !store.bindAtLaunch) return 'off';",
    to: "    if (store === null || !store.enabled) return 'off';",
    needs: ['gate']
  },
  {
    n: 'L5b',
    rule: 'L5',
    name: 'the fork no longer follows the last-press check',
    why: 'a start already past its gate forks a door process after the person switched the door off.',
    file: IPC,
    from: "    this.setFunnel('starting');\n    if (this.superseded(press)) {\n      this.setFunnel('idle');\n      return 'stopped';\n    }\n    const door = await startPocketDoor({",
    to: "    this.setFunnel('starting');\n    const door = await startPocketDoor({",
    needs: ['gate']
  },
  {
    n: 'L5b2',
    rule: 'L5',
    name: 'the spawn no longer follows the last-press check',
    why: 'a start already past its gate spawns the Funnel child — publishing the door to the internet — after the person switched it off.',
    file: IPC,
    from: "      if (this.superseded(press)) {\n        outcome = 'stopped';\n        return outcome;\n      }\n      const started = await startFunnel(",
    to: '      const started = await startFunnel(',
    needs: ['gate']
  },
  {
    n: 'L5c',
    rule: 'L5',
    name: 'the capability starts the door rather than the launch step',
    why: 'openAtLaunch is the one launch path that asks for enabled AND bindAtLaunch.',
    file: CAPABILITIES,
    from: '  void pocketHost.openAtLaunch();',
    to: '  void pocketHost.start();',
    needs: ['gate']
  },
  {
    n: 'L5d',
    rule: 'L5',
    name: 'the gate is not asked again after Tailscale is read',
    why: 'the read writes the facts it observed, which moves the hash; a fork on the gate’s answer from before the read opens a door on fields nobody confirmed.',
    file: IPC,
    from: "    if (!this.mayOpen()) {\n      this.setFunnel('idle');\n      return 'stopped';\n    }\n    const fields = this.fields();",
    to: '    const fields = this.fields();',
    needs: ['gate']
  },
  {
    n: 'L5e',
    rule: 'L5',
    alsoRed: ['Q1'],
    name: 'the switch-off yields before it records itself',
    why: 'the attack’s X1: a switch-on waiting in the queue reads a switch that still says on.',
    file: IPC,
    from: '      this.pressed();\n      let saved = true;',
    to: '      await this.serially(() => this.closeNow());\n      this.pressed();\n      let saved = true;',
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // A4: refusal 7, by generation.
  // -------------------------------------------------------------------------
  {
    n: 'A4a',
    rule: 'A4',
    alsoRed: ['hostile'],
    name: 'the handler stops asking whether the verified phone is still paired',
    why: 'the attack’s R1: a phone Removed while its request was inside the refresh was answered from the store as it stood after the press.',
    file: SERVER,
    from: "    if (!deps.stillPaired(verifiedPhone)) return refuse('unpaired');\n",
    to: '',
    needs: ['gate', 'hostile']
  },
  {
    n: 'A4s',
    rule: 'hostile',
    name: 'the phone is still asked about, but never when it matters (the text of A4 holds)',
    why: 'a guard whose condition can never be true reads exactly like a guard; only a live door with a phone removed mid-request tells them apart.',
    file: SERVER,
    from: "    if (!deps.stillPaired(verifiedPhone)) return refuse('unpaired');",
    to: "    if (verifiedPhone.length === 0 && !deps.stillPaired(verifiedPhone)) return refuse('unpaired');",
    needs: ['gate', 'hostile']
  },
  {
    n: 'A4b',
    rule: 'A4',
    name: 'the handler stops asking the door that accepted it after the answer is composed',
    why: 'the first of the two last asks; bind.ts’s generation check is the second, and each is one line a later round deletes.',
    file: SERVER,
    from: "    if (!deps.stillPaired(verifiedPhone)) return refuse('unpaired');\n    if (closing()) return refuse('shutdown');",
    to: "    if (!deps.stillPaired(verifiedPhone)) return refuse('unpaired');",
    needs: ['gate']
  },
  {
    n: 'A4c',
    rule: 'A4',
    name: 'main posts a composed answer without asking its generation’s door again',
    why: 'the second last ask, with nothing awaited before the post: an answer composed as its door began to stop is refused.',
    file: BIND,
    from: '      if (admission.stopping() && answer.acted !== true) answer = REFUSED;\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'A4d',
    rule: 'A4',
    name: 'a request for another generation, or a stopping door, reaches a handler',
    why: 'a stopped door is never revived, and a request it forwarded is answered by nobody.',
    file: BIND,
    from: '    if (generation !== this.generation || admission === undefined || admission.stopping()) {',
    to: '    if (admission === undefined) {',
    needs: ['gate']
  },
  {
    n: 'A4e',
    rule: 'A4',
    name: 'the host answers every phone as still paired',
    why: 'the handler’s last ask is only as good as the answer the host composes.',
    file: IPC,
    from: '    return this.readStore()?.phones.some((p) => p.id === phoneId) === true;',
    to: '    return true;',
    needs: ['gate']
  },
  {
    n: 'A4f',
    rule: 'A4',
    name: 'a Remove awaits before it writes the phone out of the store',
    why: 'the last ask reads the store; a Remove that yields first lets a request in flight be asked about a phone that is still there.',
    file: IPC,
    from: '    const kept = store.phones.filter((p) => p.id !== phoneId);',
    to: '    await Promise.resolve();\n    const kept = store.phones.filter((p) => p.id !== phoneId);',
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // Q1: one press at a time, and the Funnel child inside the queue too.
  // -------------------------------------------------------------------------
  {
    n: 'Q1a',
    rule: 'Q1',
    name: 'the switch’s queue runs each job at once',
    why: 'one press at a time is the whole of his ruling of 2026-09-23.',
    file: IPC,
    from: '    const run = this.doorJobs.then(job);',
    to: '    const run = job();',
    needs: ['gate']
  },
  {
    n: 'Q1b',
    rule: 'Q1',
    name: 'the Funnel child is stopped from outside the queue',
    why: 'a stop beside a start is a start publishing a child the stop does not know about.',
    file: IPC,
    from: "    if (this.readStore()?.enabled !== true) return;\n    this.setFunnel('restarting');",
    to: "    if (this.readStore()?.enabled !== true) return;\n    void this.run?.stop();\n    this.setFunnel('restarting');",
    needs: ['gate']
  },
  {
    n: 'Q1c',
    rule: 'Q1',
    name: 'the door process is stopped from outside the queue',
    why: 'the reverify’s X1c, with a process instead of a socket.',
    file: IPC,
    from: '    forgetPocketDoor();\n    await this.stop();',
    to: '    forgetPocketDoor();\n    await stopPocketDoor();\n    await this.stop();',
    needs: ['gate']
  },
  {
    n: 'H2a',
    rule: 'H2',
    name: 'the contract admits an ssh hand-off again',
    why: 'a kind that can never work is a button that fails on his phone.',
    file: SHARED,
    from: "  kind: 'claude';",
    to: "  kind: 'ssh' | 'claude';",
    needs: ['gate']
  },
  {
    n: 'H2b',
    rule: 'H2',
    name: 'the composer hands off an ssh link',
    why: 'the hand-off answers null for every session.',
    file: FACTS,
    from: '    handoff: () => null,',
    to: "    handoff: (session) => ({ kind: 'claude', url: `ssh://p313.invalid/${session.id}`, label: session.name }),"
  },
  // -------------------------------------------------------------------------
  // PHASE 330: the Funnel child (U1 to U5), mutual TLS (M1), the hash (M2),
  // the PROXY source (P1), the length (C1), /pair (N3), the menu (MENU1) and
  // the door's own import wall (W2). Each clause broken on its own.
  // -------------------------------------------------------------------------
  {
    n: 'U1a',
    rule: 'U1',
    name: 'the funnel argv asks for --bg',
    why: 'THIS IS ONE OF THE ONES THAT MATTER MOST. --bg outlives Tortie and comes back after every reboot: the door on the internet with nobody holding it.',
    file: FUNNEL,
    from: "  return ['funnel', `--tcp=${String(publicPort)}`,",
    to: "  return ['funnel', '--bg', `--tcp=${String(publicPort)}`,",
    needs: ['gate']
  },
  {
    n: 'U1b',
    rule: 'U1',
    name: 'the status read carries his other devices’ names',
    why: '--peers=false asks for this node alone; without it every read carries the names of his other devices.',
    file: FUNNEL,
    from: "['status', '--json', '--peers=false']",
    to: "['status', '--json']",
    needs: ['gate']
  },
  {
    n: 'U1c',
    rule: 'U1',
    name: 'the serve read becomes serve reset',
    why: 'research 132 §9 condition 5: never funnel reset or serve reset, which would take down whatever HE serves.',
    file: FUNNEL,
    from: "['serve', 'status', '--json']",
    to: "['serve', 'reset']",
    needs: ['gate']
  },
  {
    n: 'U1d',
    rule: 'U1',
    name: 'a TLS-terminating flag spelled in main',
    why: 'the TLS-terminating modes cannot be pinned: tailscaled makes a fresh key for every certificate (ipn/ipnlocal/cert.go:646).',
    file: IPC,
    from: "import { createPocketHandler } from './server';",
    to: "import { createPocketHandler } from './server';\nexport const TERMINATE = '--https=443';",
    needs: ['gate']
  },
  {
    n: 'U2a',
    rule: 'U2',
    name: 'a set but unusable override falls back instead of refusing',
    why: 'THIS IS THE ONE THAT KEEPS AN AGENT OFF HIS TAILNET. A probe whose wrapper path was wrong would run his real Tailscale and publish on his tailnet.',
    file: FUNNEL,
    from: "  if (resolved.overrideSet && resolved.resolution.source !== 'dev-override') {",
    to: "  if (resolved.overrideSet && resolved.resolution.source === 'missing') {",
    needs: ['gate']
  },
  {
    n: 'U2b',
    rule: 'U2',
    name: 'a Tailscale program path written down in the domain',
    why: 'the path is resolveTailscale’s answer, hashed as a confirmed field, and never a literal.',
    file: FUNNEL,
    from: "const MSG_SUCCESS = 'Success.';",
    to: "const MSG_SUCCESS = 'Success.';\nexport const PINNED = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';",
    needs: ['gate']
  },
  {
    n: 'U2c',
    rule: 'U2',
    name: 'the host hands the child a program that is not the confirmed field',
    why: 'what runs is what the person confirmed, by hash.',
    file: IPC,
    from: '          program: fields.funnelProgram,',
    to: "          program: 'tailscale',",
    needs: ['gate']
  },
  {
    n: 'U3a',
    rule: 'U3',
    name: 'the child’s SIGKILL moved out of the finally',
    why: 'a throw inside the stop would leave the child publishing a port nobody holds.',
    file: FUNNEL,
    from: "      } finally {\n        if (!ended) {\n          this.signal('SIGKILL');",
    to: "      } catch {\n        /* ablated */\n      }\n      {\n        if (!ended) {\n          this.signal('SIGKILL');",
    needs: ['gate']
  },
  {
    n: 'U3b',
    rule: 'U3',
    alsoRed: ['W1'],
    name: 'the orphan record written wider than its owner',
    why: 'the record names a pid Tortie will signal at its next launch; only he may write it.',
    file: FUNNEL,
    from: 'mode: 0o600 });',
    to: 'mode: 0o644 });',
    needs: ['gate']
  },
  {
    n: 'U3c',
    rule: 'U3',
    name: 'the sweep ends a process that matches the start time alone',
    why: 'fewer than both and it could end a process Tortie did not start: the orphan class CLAUDE.md records from 2026-09-02, the other way round.',
    file: FUNNEL,
    from: '  if (now.lstart !== record.lstart || now.command !== record.command) {',
    to: '  if (now.lstart !== record.lstart) {',
    needs: ['gate']
  },
  {
    n: 'U3d',
    rule: 'U3',
    name: 'the record’s directory is no longer narrowed when it already exists',
    why: 'mkdirSync’s mode applies only when it creates: the first build’s record sat at 0600 in a 0755 directory (lens 2, the Phase 330 fix round).',
    file: FUNNEL,
    from: '  chmodSync(dirname(path), 0o700);\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'U3e',
    rule: 'U3',
    name: 'the record moved back beside everything else in <userData>/gmux',
    why: 'narrowing the record’s directory must never narrow the directory the rest of Tortie’s state sits in, so the record has a directory of its own.',
    file: FUNNEL,
    from: "'gmux', 'pocket-funnel', 'record.json')",
    to: "'gmux', 'pocket-funnel.json')",
    needs: ['gate']
  },
  {
    n: 'U3f',
    rule: 'U3',
    name: 'the sweep no longer asks whether its record names the argv Tortie spawns',
    why: 'the record is a file on his disk: one naming his shell, with its real start time and command, would have that shell ended at the next launch (the fix round after his ruling of 2026-09-29).',
    file: FUNNEL,
    from: "  if (!recordNamesFunnelChild(record.command)) {\n    log.warn('left a process alone: its record names no Funnel child');\n    deleteRecord(path);\n    return 'left-alone';\n  }\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'U4a',
    rule: 'U4',
    name: 'production hands PocketHost a door spawner',
    why: 'production forks the real door process; an injected one is a door nobody confirmed the shape of.',
    file: CAPABILITIES,
    from: '  pocketHost = new PocketHost({',
    to: '  pocketHost = new PocketHost({\n    door: undefined,',
    needs: ['gate']
  },
  {
    n: 'U4b',
    rule: 'U4',
    name: 'the host stops falling back to the real Funnel deps',
    why: 'what production runs must be what this gate reads.',
    file: IPC,
    from: 'deps.tailscale ?? defaultFunnelDeps()',
    to: '(deps.tailscale as ReturnType<typeof defaultFunnelDeps>)',
    needs: ['gate']
  },
  {
    n: 'U5a',
    rule: 'U5',
    name: 'the build’s door entry points at main’s own module',
    why: 'the door process is built from door-process.ts, which imports nothing but Node and the door; an entry at bind.ts would carry Electron into it.',
    file: VITE,
    from: "'pocket-door': resolve(__dirname, 'src/main/pocket/door-process.ts')",
    to: "'pocket-door': resolve(__dirname, 'src/main/pocket/bind.ts')",
    needs: ['gate']
  },
  {
    n: 'M1a',
    rule: 'M1',
    alsoRed: ['hostile'],
    name: 'the door stops asking for a client certificate',
    why: 'THIS IS ONE OF THE ONES THAT MATTER MOST. Research 132 §9 condition 1: without the certificate there is no key to pin, and a stranger’s bytes reach the HTTP parser.',
    file: LISTENER,
    from: '      requestCert: true,',
    to: '      requestCert: false,',
    needs: ['gate', 'hostile']
  },
  {
    n: 'M1b',
    rule: 'M1',
    name: 'the door accepts TLS 1.2',
    why: 'under 1.2 the client certificate crosses Funnel’s relay in the clear and hands Tailscale a stable identifier for the phone.',
    file: LISTENER,
    from: "      minVersion: 'TLSv1.3',",
    to: "      minVersion: 'TLSv1.2',",
    needs: ['gate']
  },
  {
    n: 'M1c',
    rule: 'M1',
    alsoRed: ['hostile'],
    name: 'THE PIN CHECK REMOVED: any certificate is somebody’s',
    why: 'rejectUnauthorized is false because the pin IS the verification. Without it every certificate, including one a stranger made, reaches the parser and names a channel.',
    file: LISTENER,
    from: "      const phoneId = pins.get(spki);\n      if (phoneId === undefined) {\n        refuseSocket(tlsSocket, 'unknown-key');\n        return;\n      }\n      channel = phoneId;",
    to: "      const phoneId = pins.get(spki);\n      channel = phoneId ?? 'unpinned';",
    needs: ['gate', 'hostile']
  },
  {
    n: 'M1d',
    rule: 'M1',
    alsoRed: ['hostile'],
    name: 'the socket handed to HTTP before the pin',
    why: 'the hand-over is the moment a stranger’s bytes meet llhttp; before the pin, every stranger meets it.',
    file: LISTENER,
    from: "    counts.handshakes += 1;\n    tlsSocket.on('error', () => undefined);",
    to: "    counts.handshakes += 1;\n    httpServer?.emit('connection', tlsSocket);\n    tlsSocket.on('error', () => undefined);",
    needs: ['gate', 'hostile']
  },
  {
    n: 'M1e',
    rule: 'M1',
    alsoRed: ['hostile'],
    name: 'a certificate-less connection reaches every route inside a window',
    why: 'the window opens POST /pair to whoever holds the code, and nothing else.',
    file: LISTENER,
    from: "    if (state.channel === null && route.id !== 'pair') return refuseRequest(res, 'route');\n",
    to: '',
    needs: ['gate', 'hostile']
  },
  {
    n: 'M2a',
    rule: 'M2',
    name: 'the tailnet leaves the hash',
    why: 'research 132 §7.5: a profile switch could publish the door on another tailnet; the tailnet is a field a person confirmed.',
    file: PAIRING,
    from: '  tailnet: (v) => v,\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'M2b',
    rule: 'M2',
    name: 'the algorithm stays v2',
    why: 'every record written before Phase 330 must read changed and ask again.',
    file: PAIRING,
    from: "export const POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v3';",
    to: "export const POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v2';",
    needs: ['gate']
  },
  {
    n: 'M2c',
    rule: 'M2',
    name: 'a phone’s client key leaves the hash',
    why: 'the key its handshake completes with is part of what the person allowed.',
    file: PAIRING,
    from: '        p.clientKey,\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'P1a',
    rule: 'P1',
    name: 'the listener reads the PROXY source',
    why: 'any process on this Mac can write the header naming any address; read anywhere but the limiter, it becomes an identity it is not.',
    file: LISTENER,
    from: '      const release = limiter.admit(read.header);',
    to: '      void read.header.addressBlock;\n      const release = limiter.admit(read.header);',
    needs: ['gate']
  },
  {
    n: 'P1b',
    rule: 'P1',
    name: 'a request main is handed carries a source',
    why: 'research 132 §9 condition 3: the address leaves the hash and the verifier; it never reaches main.',
    file: WIRE,
    from: "      /** The phoneId whose pin completed THIS connection's handshake. */\n      readonly channel: string;",
    to: "      /** The phoneId whose pin completed THIS connection's handshake. */\n      readonly channel: string;\n      readonly source: string;",
    needs: ['gate']
  },
  {
    n: 'P1c',
    rule: 'P1',
    name: 'a log line names a source',
    why: 'the source is in no log line.',
    file: BIND,
    from: 'log.warn(`refused a connection at the door: ${word}`);',
    to: 'log.warn(`refused a connection at the door: ${word}`, { source: word });',
    needs: ['gate']
  },
  {
    n: 'P1h',
    rule: 'hostile',
    name: 'the per-source cap raised out of reach',
    why: 'three idle sockets a second keep the phone out when one source can hold every connection.',
    file: LIMITS,
    from: 'export const PER_SOURCE_MAX = 4;',
    to: 'export const PER_SOURCE_MAX = 400;',
    needs: ['gate', 'hostile']
  },
  {
    n: 'C1a',
    rule: 'C1',
    name: 'the length set only when there is a body',
    why: 'the phone’s reader requires a length on every answer, a 404 included, and refuses any transfer coding.',
    file: SEND,
    from: "  res.setHeader('Content-Length', String(bytes === null ? 0 : bytes.length));",
    to: "  if (bytes !== null) res.setHeader('Content-Length', String(bytes.length));",
    needs: ['gate']
  },
  {
    n: 'C1b',
    rule: 'C1',
    name: 'the door names a transfer coding',
    why: 'the door never sends one; the phone refuses any.',
    file: SEND,
    from: "  res.setHeader('Cache-Control', 'no-store');",
    to: "  res.setHeader('Cache-Control', 'no-store');\n  res.setHeader('Transfer-Encoding', 'chunked');",
    needs: ['gate']
  },
  {
    n: 'N3a',
    rule: 'N3',
    name: 'main serialises what the pairing owner answered, whole',
    why: 'a field the owner grows would reach every presenter.',
    file: SERVER,
    from: '      return { status: 200, body: pairBody(answer) };',
    to: '      return { status: 200, body: JSON.stringify(answer) };',
    needs: ['gate']
  },
  {
    n: 'N3b',
    rule: 'N3',
    name: 'a certificate rides with pending',
    why: 'the certificate is handed to the allowed phone alone.',
    file: SERVER,
    // Phase 316.5 split the pending line in two (research 136's `alerts`).
    from: "      : JSON.stringify({ state: 'pending' });",
    to: "      : JSON.stringify({ state: 'pending', cert: '' });",
    needs: ['gate']
  },
  {
    n: 'N3c',
    rule: 'N3',
    name: 'the word that this Mac can send rides with a refusal (research 136)',
    why: 'it is said only while a phone is pending, before it could be asked; a refused presentation is told nothing.',
    file: SERVER,
    from: "  return JSON.stringify({ state: 'refused' });",
    to: "  return JSON.stringify({ state: 'refused', alerts: true });",
    needs: ['gate']
  },
  {
    n: 'N3d',
    rule: 'N3',
    name: 'the word is forwarded from what the host handed, not said as the literal true (research 136)',
    why: 'main says the one word itself; a value forwarded is a value a later field can ride in.',
    file: SERVER,
    from: "      ? JSON.stringify({ state: 'pending', alerts: true })",
    to: "      ? JSON.stringify({ state: 'pending', alerts: answer.alerts })",
    needs: ['gate']
  },
  {
    n: 'MENU1a',
    rule: 'MENU1',
    name: 'Pair a Phone… opens Settings at the top rather than at Phone',
    why: 'the row is where a person finds the pairing; landing anywhere else is a row that does not do what it says.',
    file: MENU,
    from: "          click: () => openSettingsWindow('phone')",
    to: '          click: () => openSettingsWindow()',
    needs: ['gate']
  },
  {
    n: 'MENU1b',
    rule: 'MENU1',
    name: 'Pair a Phone… moved from under Settings…',
    why: 'the entry’s "Unchanged on purpose": the native menus did not move.',
    file: MENU,
    from: "          ...glyph('settings-gear'),\n          click: () => openSettingsWindow()\n        },",
    to: "          ...glyph('settings-gear'),\n          click: () => openSettingsWindow()\n        },\n        { type: 'separator' },",
    needs: ['gate']
  },
  {
    n: 'W2a',
    rule: 'W2',
    name: 'the listener imports Electron',
    why: 'research 132 §9 condition 2: the process a stranger reaches holds no credential and no Electron.',
    file: LISTENER,
    from: "import { createHash } from 'node:crypto';",
    to: "import { createHash } from 'node:crypto';\nimport { app } from 'electron';\nvoid app;",
    needs: ['gate']
  },
  {
    n: 'W2b',
    rule: 'W2',
    name: 'the door process imports main’s logger',
    why: 'a logger is electron-log, and electron-log is main’s alone.',
    file: DOOR_PROCESS,
    from: "import { createDoorListener } from './door/listener';",
    to: "import { createDoorListener } from './door/listener';\nimport { getLog } from '../log';\nvoid getLog;",
    needs: ['gate']
  },
  {
    n: 'W2c',
    rule: 'W2',
    name: 'the limiter imports a builtin it does not need',
    why: 'the wall is an allow-list: a builtin nobody listed is refused, not waved through.',
    file: LIMITS,
    from: "import type { ProxyHeader } from './proxy-v2';",
    to: "import type { ProxyHeader } from './proxy-v2';\nimport { readFileSync } from 'node:fs';\nvoid readFileSync;",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // E1, the door process's environment (the Phase 330 fix round). Electron 43
  // reads `env: {}` as unset, and lens 2 measured main's whole environment in
  // the running door process with every gate green.
  // -------------------------------------------------------------------------
  {
    n: 'E1a',
    rule: 'E1',
    name: 'the door is forked with env: {}',
    why: 'THE SHAPE THAT SHIPPED IN THE FIRST BUILD. Electron reads an empty object as unset, so the door process held HOME, GMUX_TAILSCALE_BIN and, under npm run dev, every variable of his shell: in the one process the internet reaches.',
    file: BIND,
    from: "    env: { TORTIE_DOOR: '1' },",
    to: '    env: {},',
    needs: ['gate']
  },
  {
    n: 'E1b',
    rule: 'E1',
    name: 'main’s environment spread into the door’s',
    why: 'a spread of process.env is main’s environment by another spelling, one variable added to it.',
    file: BIND,
    from: "    env: { TORTIE_DOOR: '1' },",
    to: "    env: { ...process.env, TORTIE_DOOR: '1' },",
    needs: ['gate']
  },
  {
    n: 'E1c',
    rule: 'E1',
    name: 'the door process reads its environment',
    why: 'the door holds one variable of its own and reads none: what it needs from main arrives as a message, where it is validated.',
    file: DOOR_PROCESS,
    from: "const parentPort = (process as unknown as { parentPort?: ParentPortLike }).parentPort;",
    to: "const parentPort = (process as unknown as { parentPort?: ParentPortLike }).parentPort;\nvoid process.env['HOME'];",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // PHASE 332: the Mac's public name (build/p332/SPEC.md §7.2). The check
  // sends his Mac's name to servers Tortie never talked to before and parses
  // their forgeable answers in main, and every clause below is one line.
  // -------------------------------------------------------------------------
  {
    n: 'D1a',
    rule: 'D1',
    name: 'the name module imports node:dns',
    why: 'node:dns is c-ares, a C parser of bytes anyone on the path can forge, inside main, and it cannot clear the recursion bit or read the authoritative one.',
    file: NAMES,
    from: "import { isIPv4 } from 'node:net';",
    to: "import { isIPv4 } from 'node:net';\nimport { lookup } from 'node:dns';\nvoid lookup;",
    needs: ['gate']
  },
  {
    n: 'D1b',
    rule: 'D1',
    name: 'the host imports node:dgram',
    why: 'the name check is the one thing in Tortie that sends a datagram, and it lives in one module a gate can read whole.',
    file: IPC,
    // Phase 316.5 added `type WebContents` to this line (the push key's panel).
    from: "import { app, shell, type IpcMain, type WebContents } from 'electron';",
    to: "import { app, shell, type IpcMain, type WebContents } from 'electron';\nimport 'node:dgram';",
    needs: ['gate']
  },
  {
    n: 'D1c',
    rule: 'D1',
    name: 'the socket loses its own lookup',
    why: 'measured by the spec step: without a lookup of its own, dgram asks dns.lookup for every bind and connect, which is the system resolver the check exists not to reach.',
    file: NAMES,
    from: "createSocket({ type: 'udp4', lookup: literalLookup })",
    to: "createSocket({ type: 'udp4' })",
    needs: ['gate']
  },
  {
    n: 'D2a',
    rule: 'D2',
    name: 'the zone question asks for recursion',
    why: 'THIS IS THE ONE THAT MATTERS MOST HERE. A recursive question for his name makes a resolver on his network fetch it and plant the 300 s miss his phone then meets: the failed first scan this phase exists to stop, caused by the check itself.',
    file: NAMES,
    from: "const query = encodeNameQuery(deps.id(), name, 'A', false);",
    to: "const query = encodeNameQuery(deps.id(), name, 'A', true);",
    needs: ['gate']
  },
  {
    n: 'D2b',
    rule: 'D2',
    name: 'the question id from Math.random',
    why: 'the id is the one thing an off-path forger must guess; Math.random is not a secret.',
    file: NAMES,
    from: 'id: () => randomInt(0, 0x10000),',
    to: 'id: () => Math.floor(Math.random() * 0x10000),',
    needs: ['gate']
  },
  {
    n: 'D2c',
    rule: 'D2',
    name: 'send is handed the port and the address',
    why: 'a connected socket sends the buffer alone; a port and an address on the send are a datagram to wherever they say.',
    file: NAMES,
    from: 'sock.send(packet, (sendErr: Error | null) => {',
    to: 'sock.send(packet, server.port, server.address, (sendErr: Error | null) => {',
    needs: ['gate']
  },
  {
    n: 'D2d',
    rule: 'D2',
    name: 'the authoritative bit is no longer required',
    why: 'a cache, an interceptor and a referral all lack it; without the check, any of them can confirm a name no phone can reach.',
    file: NAMES,
    from: "    if (!parsed.aa) return unreadable('not-authoritative');\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D2e',
    rule: 'D2',
    name: 'the question is no longer compared byte for byte',
    why: 'a compressed, case-changed, retyped or reclassed question is an answer to something else.',
    file: NAMES,
    from: '      reply.length < 12 + question.length ||\n      !reply.subarray(12, 12 + question.length).equals(question)\n',
    to: '      reply.length < 12 + question.length\n',
    needs: ['gate']
  },
  {
    n: 'D3a',
    rule: 'D3',
    name: 'MagicDNS’s range leaves the refused list',
    why: 'the running log measured it: his Mac’s own resolver answers his name with a 100.x address, and a check that accepted it would confirm a name no phone can reach.',
    file: NAMES,
    from: '  [100, 64, 0, 0, 10],\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'D3b',
    rule: 'D3',
    name: 'the host spells 100.64 in a second list',
    why: 'two lists drift: an answer refused one way here is accepted another way there.',
    file: IPC,
    from: "const pocketLog = getLog('pocket');",
    to: "const pocketLog = getLog('pocket');\nexport const TAILNET_RANGES = [[100, 64, 0, 0, 10]] as const;",
    needs: ['gate']
  },
  {
    n: 'D4a',
    rule: 'D4',
    name: 'reading the status starts a check',
    why: 'a person who never turns the door on sees and spawns nothing new: opening the sheet reads the status, and a read may start no timer, socket or question.',
    file: IPC,
    from: '      nameCheck: this.nameCheckNow(),',
    to: "      nameCheck: (this.beginNameCheck('start'), this.nameCheckNow()),",
    needs: ['gate']
  },
  {
    n: 'D4b',
    rule: 'D4',
    name: 'unpublish no longer stops the check',
    why: 'a timer that outlives the door asks about a name nothing publishes, every minute, until the quit.',
    file: IPC,
    from: '  private async unpublish(): Promise<void> {\n    this.stopNameCheck();\n',
    to: '  private async unpublish(): Promise<void> {\n',
    needs: ['gate']
  },
  {
    n: 'D4c',
    rule: 'D4',
    name: 'the name timer is a plain setTimeout',
    why: 'armFunnelRestart’s timers are the set the quit’s first line clears; a timer outside it fires into a quit.',
    file: IPC,
    from: '    run.cancel = armFunnelRestart(this.names, gapMs, () => {\n      run.cancel = null;\n      this.nameRoundNow(run);\n    });',
    to: '    const timer = setTimeout(() => {\n      run.cancel = null;\n      this.nameRoundNow(run);\n    }, gapMs);\n    run.cancel = () => clearTimeout(timer);',
    needs: ['gate']
  },
  {
    n: 'D4d',
    rule: 'D4',
    name: 'a round reads the wall clock',
    why: 'a wall clock moved a day either way must change no gap and cause no burst; the gaps are timers, which are monotonic.',
    file: IPC,
    from: '    run.cancel = null;\n    run.inFlight = true;',
    to: '    run.cancel = null;\n    if (Date.now() < 0) return;\n    run.inFlight = true;',
    needs: ['gate']
  },
  {
    n: 'D4e',
    rule: 'D4',
    name: 'production hands the host its own name deps',
    why: 'only a development build’s GMUX_POCKET_NAME_SERVERS may point the check at anything but the real zone servers, and only at loopback.',
    file: CAPABILITIES,
    from: '    onResume: (cb) => wakes.onResume(() => cb())\n  });',
    to: '    onResume: (cb) => wakes.onResume(() => cb()),\n    names: undefined\n  });',
    needs: ['gate']
  },
  // PHASE 332.1 (build/p3321/SPEC.md §8.2): the one clock the sheet's progress
  // reads, fenced; the progress that decides nothing; the log that says a
  // change once.
  {
    n: 'D4f',
    rule: 'D4',
    name: 'the progress reads the wall clock',
    why: 'a wall clock moves when it is set, by NTP, by hand or by travel, so the minutes the card draws could go backwards or jump an hour; the progress reads the monotonic clock nobody can set.',
    file: IPC,
    from: '    const now = this.names.monotonic();',
    to: '    const now = Date.now();',
    needs: ['gate']
  },
  {
    n: 'D4g',
    rule: 'D4',
    name: 'pairable reads the monotonic clock',
    why: 'the clock is read ONLY to tell the sheet how long the check has run; a read in pairable is the first step to Pair deciding from time rather than from the round rule.',
    file: IPC,
    from: '    const check = this.nameCheckNow();',
    to: "    const check = this.names.monotonic() < 0 ? 'none' : this.nameCheckNow();",
    needs: ['gate']
  },
  {
    n: 'D4h',
    rule: 'D4',
    name: 'the shipping clock is the wall clock',
    why: 'performance.now() is monotonic and never moved by setting the clock; Date.now() is, and the elapsed time drawn from it can go backwards.',
    file: NAMES,
    from: '    monotonic: () => performance.now(),',
    to: '    monotonic: () => Date.now(),',
    needs: ['gate']
  },
  {
    n: 'D4i',
    rule: 'D4',
    name: 'reading the progress starts a round',
    why: 'nameProgressNow runs on every status() read, which the sheet makes on every push; a read that starts a round asks the zone a question every time Settings is open.',
    file: IPC,
    from: '    const now = this.names.monotonic();',
    to: '    this.nameRoundNow(run);\n    const now = this.names.monotonic();',
    needs: ['gate']
  },
  {
    n: 'D5a',
    rule: 'D5',
    name: 'a name-check log line carries the public name',
    why: 'no log line names the public name, the tailnet, a server, an answered address or a packet: app.log is read by the people he sends it to.',
    file: IPC,
    from: 'pocketLog.info(`the Mac’s name check read ${verdict}: ${reason}`);',
    to: 'pocketLog.info(`the Mac’s name check read ${verdict}: ${reason} for ${run.target.publicName}`);',
    needs: ['gate']
  },
  {
    n: 'D5b',
    rule: 'D5',
    name: 'a log line every round',
    why: 'the progress pushes two statuses a round and logs nothing; a line per round, every 20 to 60 s for as long as the name flaps, buries the one line per change of verdict that app.log keeps.',
    file: IPC,
    from: '    run.last = verdict;',
    to: "    run.last = verdict;\n    pocketLog.info('the Mac’s name check asked a round');",
    needs: ['gate']
  },
  {
    n: 'D6a',
    rule: 'D6',
    name: 'beginPairing asks for a confirmation instead of pairable',
    why: 'pairable is main’s ONE predicate: a second spelling locks a person on a network that blocks DNS out of the pairing the unreadable rule opens.',
    file: IPC,
    from: '    if (!this.pairable()) {\n      throw gmuxError(',
    to: "    if (this.nameCheckNow() !== 'confirmed') {\n      throw gmuxError(",
    needs: ['gate']
  },
  {
    n: 'D6b',
    rule: 'D6',
    name: 'the sheet decides the stage from nameCheck',
    why: 'the sheet draws Pair on main’s word and never works it out again, as with confirmable.',
    file: PHONE_SECTION,
    from: "  return status.pairable ? 'ready' : 'naming';",
    to: "  return status.nameCheck === 'confirmed' ? 'ready' : 'naming';",
    needs: ['gate']
  },
  {
    n: 'D6c',
    rule: 'D6',
    name: 'beginPairing no longer asks pairable again after its read of Tailscale',
    why: 'the fix round’s own clause: a switch-on round that answers no while Tailscale is read takes Pair away, and a window opened on the answer from before the read sends a phone to a name that is gone (a verifier’s ATK-T1).',
    file: IPC,
    from: "    // AND AGAIN AFTER THE READ (the fix round): a switch-on round that answers\n    // no while Tailscale is read takes Pair away, and the window must not open\n    // on the answer from before it.\n    if (!this.pairable()) {\n      throw gmuxError('INVALID_INPUT', `${POCKET_NAME_SENTENCES.checking} No code was shown.`);\n    }\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D6d',
    rule: 'D6',
    name: 'the carried press decides from nameCheck',
    why: 'a carried press asks for the code once, on main’s pairable; a sheet that works it out from the name again is a second spelling of the rule, which locks out a network that blocks DNS.',
    file: PHONE_SECTION,
    from: "  if (status.pairable) return { phase: 'no', pair: true };",
    to: "  if (status.nameCheck === 'confirmed' || status.pairable) return { phase: 'no', pair: true };",
    needs: ['gate']
  },
  {
    n: 'D7a',
    rule: 'D7',
    name: 'a packaged build honours the override',
    why: 'the override is a development seam: in a packaged Tortie anything in his environment would decide which servers are asked about his name.',
    file: NAMES,
    from: "  if (input.packaged) return { kind: 'search' };\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D7b',
    rule: 'D7',
    name: 'an unusable override falls back to the search',
    why: 'THE FALLBACK IS REAL DNS. A probe with a wrong value would ask the real ts.net servers about a name every minute, which is what the override exists to prevent.',
    file: NAMES,
    from: "      if (!Number.isInteger(port) || port < 1 || port > 65_535) return { kind: 'refused' };",
    to: "      if (!Number.isInteger(port) || port < 1 || port > 65_535) return { kind: 'search' };",
    needs: ['gate']
  },
  {
    n: 'D8a',
    rule: 'D8',
    name: 'the shipping transport asks a real server outside Electron',
    why: 'vitest, tsx and plain node are not Electron: this one check is what keeps a test that forgets to inject its deps from sending packets to the internet.',
    file: NAMES,
    from: "  if (server.address !== '127.0.0.1' && typeof process.versions.electron !== 'string') {\n    return Promise.resolve(EXCHANGE_ERROR);\n  }\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D9a',
    rule: 'D9',
    name: 'the push seam pairs without the name stand-in',
    why: 'the seam runs in a development Electron, where D8 does not apply: a door it publishes checks its name, and without GMUX_POCKET_NAME_SERVERS naming loopback that check asks the real ts.net servers about the stand-in’s made-up name every minute.',
    file: SEAM,
    from: "  if (!nameStandInOnly()) {\n    print(`${PUSH_SEAM_TAG} pairing needs the name stand-in (GMUX_POCKET_NAME_SERVERS), so no phone was paired`);\n    return false;\n  }\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D9b',
    rule: 'D9',
    name: 'the push seam answers true on listening alone',
    why: 'a listening door is not a pairable one: beginPairing refuses until the name answers, and pressing Pair on listening was what the seam and the four probes did before Phase 332.',
    file: SEAM,
    from: "  const waited = await pairableWithin(host, PAIRABLE_WAIT_MS);\n  if (!waited.ok) {\n    print(`${PUSH_SEAM_TAG} the Mac’s name never answered (${waited.nameCheck}), so no phone was paired`);\n    return false;\n  }\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'D9c',
    rule: 'D9',
    name: 'the seam counts the real search as a stand-in',
    why: 'only a fixed list of loopback servers is a stand-in; the search is the real ts.net servers, and the seam must refuse it.',
    file: SEAM,
    from: "  return nameServersFrom({ packaged, env: process.env }).kind === 'fixed';",
    to: "  return nameServersFrom({ packaged, env: process.env }).kind !== 'refused';",
    needs: ['gate']
  },
  {
    n: 'D9d',
    rule: 'D9',
    name: 'the seam presses Pair whatever the door answered',
    why: 'both refusals and the wait are nothing if the press does not wait for their answer.',
    file: SEAM,
    from: '  for (const phone of doorOpen ? seed.phones : []) {',
    to: '  for (const phone of seed.phones) {',
    needs: ['gate']
  },
  {
    n: 'D9e',
    rule: 'D9',
    name: 'the wait’s answer no longer decides anything',
    why: 'a wait that timed out must end in “no phone was paired”, not in a press that beginPairing refuses.',
    file: SEAM,
    from: '  if (!waited.ok) {',
    to: '  if (waited === null) {',
    needs: ['gate']
  },
  {
    n: 'D10a',
    rule: 'D10',
    name: 'the progress carries a server',
    why: 'the sheet is told four numbers and booleans and three kinds of answer; a string member is the door through which a server, an address or a reason word reaches the renderer.',
    file: SHARED,
    from: '  nextInMs: number | null;',
    to: '  nextInMs: number | null;\n  server: string;',
    needs: ['gate']
  },
  {
    n: 'D10b',
    rule: 'D10',
    name: 'Pair reads the progress',
    why: 'Pair is pairable alone, which is the round rule; a pairable that waits on the dots holds a person on a network that blocks DNS behind a progress that never answers.',
    file: IPC,
    from: '    if (!pocketDoorStatus().listening || !this.published() || this.readStore()?.enabled !== true) return false;',
    to: '    if (!pocketDoorStatus().listening || !this.published() || this.readStore()?.enabled !== true || this.nameShown?.answers.length === 0) return false;',
    needs: ['gate']
  },
  {
    n: 'D10c',
    rule: 'D10',
    name: 'the sheet’s stage reads the progress',
    why: 'the stage that draws Pair follows main’s pairable; a stage that waits for a round to answer hides Pair for the length of a round main has already opened it for.',
    file: PHONE_SECTION,
    from: "  return status.pairable ? 'ready' : 'naming';",
    to: "  return status.pairable && status.nameProgress?.asking !== true ? 'ready' : 'naming';",
    needs: ['gate']
  },
  {
    n: 'D10d',
    rule: 'D10',
    name: 'a stamp decides nameCheck',
    why: 'the stamps exist for the sheet’s minutes; nameCheck read from one is a rule of when Pair opens that nobody wrote down, and a run that confirmed would read none.',
    file: IPC,
    from: "    if (run === null) return 'none';",
    to: "    if (run === null || run.endedAt !== null) return 'none';",
    needs: ['gate']
  },
  {
    n: 'T1c',
    rule: 'T1',
    name: 'the DNS stand-in binds a real interface',
    why: 'the stand-in every door probe runs answers on loopback alone; one on 10.0.0.1 answers anybody on his network.',
    file: DNS_STANDIN,
    from: "    socket.bind({ address: '127.0.0.1', port: 0 }, () => {",
    to: "    socket.bind({ address: '10.0.0.1', port: 0 }, () => {",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // PHASE 317, the one write (build/p317/SPEC.md §6.1). One arm per new or
  // widened clause, each red on the rule that owns it. Arms that edit a file
  // the door builder writes anchor on its shipping text; a RegExp anchor is
  // used where a stray space should not decide whether a clause is proven.
  // -------------------------------------------------------------------------
  {
    n: 'R2c',
    rule: 'R2',
    alsoRed: ['R4'],
    name: 'a second write row (the unpair the fix round took out, back)',
    why: 'THE WRITE LIST IS CLOSED: end. A second write is a new thing a phone can do to this Mac, and it is its own phase with its own ruling; the unpair this phase built was taken out because it made Unpair slower than today.',
    file: TABLE,
    from: "  { id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: true }",
    to: "  { id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: true },\n  { id: 'unpair', method: 'POST', path: '/v1/unpair', reads: false, windowOnly: false, signed: true }",
    needs: ['gate']
  },
  {
    n: 'R2d',
    rule: 'R2',
    name: 'a write row that is not signed',
    why: 'a write the signature does not cover is a write anyone who can reach the door can make.',
    file: TABLE,
    from: "{ id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: true }",
    to: "{ id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: false }",
    needs: ['gate']
  },
  {
    n: 'R2e',
    rule: 'R2',
    name: 'a write with no body cap of its own',
    why: 'the door process checks a write’s size before main reads a byte of it; a write with no cap of its own is one the door bounds by somebody else’s number.',
    file: LIMITS,
    from: 'export const POCKET_WRITE_BODY_CAPS = Object.freeze({ end: 512 } as const);',
    to: 'export const POCKET_WRITE_BODY_CAPS = Object.freeze({} as const);',
    needs: ['gate']
  },
  {
    n: 'G1b',
    rule: 'G1',
    name: 'a refusal’s log line names the message it came in (the widened word)',
    why: 'an error’s or a message’s own text can carry whatever it was handed, and a failed tmux command’s holds its argv (research 135 §4.8). Phase 317 widened G1 by message, text, words, label, typed and reply.',
    file: BIND,
    from: '          log.warn(`refused a connection at the door: ${word}`);',
    to: '          log.warn(`refused a connection at the door: ${message.word}`);',
    needs: ['gate']
  },
  {
    n: 'G1c',
    rule: 'G1',
    name: 'the phone’s End logs a session’s label (G1’s scope: pocket-writes.ts)',
    why: 'the one write implementation lives outside the door’s directory, and a line it logs is still a line the door wrote.',
    file: POCKET_WRITES,
    from: '        await core.killSession(sessionId);',
    to: "        console.info('ending from the phone', { label: session?.name });\n        await core.killSession(sessionId);",
    needs: ['gate']
  },
  {
    n: 'A4j',
    rule: 'A4',
    name: 'an acted answer is replaced by a 404 when the door stops',
    why: 'the door stopping after the act does not make the act not have happened, and a 404 tells the phone nothing was done (D4, §14 finding 9).',
    file: BIND,
    from: '      if (admission.stopping() && answer.acted !== true) answer = REFUSED;',
    to: '      if (admission.stopping()) answer = REFUSED;',
    needs: ['gate']
  },
  {
    n: 'A4n',
    rule: 'A4',
    name: 'the handler is handed a second answer to "is this phone still paired"',
    why: 'two answers to one question agree until the day one of them is edited; the handler and the write path are each handed the one that reads the store.',
    file: IPC,
    from: '      stillPaired: (phoneId) => this.stillPaired(phoneId),\n      write,',
    to: '      stillPaired: () => true,\n      write,',
    needs: ['gate']
  },
  {
    n: 'X1a',
    rule: 'X1',
    name: 'something awaited between the last check and the act',
    why: 'research 135 §4.11 and the security adversary’s gap: a request forwarded before a Remove still ran, because the world moved between the check and the act.',
    file: WRITES,
    from: /(\n)(\s*)(const acting = )/,
    to: (m, nl, sp, rest) => nl + sp + 'await Promise.resolve();' + nl + sp + rest,
    needs: ['gate']
  },
  {
    n: 'X1b',
    rule: 'X1',
    name: 'a 404 after the act',
    why: 'after the act nothing replaces the answer: a 404 tells the phone nothing was done, and something was.',
    file: WRITES,
    from: '      const done = await acting;',
    to: '      const done = await acting;\n      if (door.stopping()) return { status: 404, body: null };',
    needs: ['gate']
  },
  {
    n: 'X1c',
    rule: 'X1',
    name: 'the act’s answer is not marked acted',
    why: 'an unmarked answer to a write that acted is one bind.ts may replace with a 404 when the door stops.',
    file: WRITES,
    from: '      return { status: 200, body: answer, acted: true };',
    to: '      return { status: 200, body: answer };',
    needs: ['gate']
  },
  {
    n: 'X1d',
    rule: 'X1',
    name: 'the full ledger’s busy is marked acted',
    why: 'only an answer that speaks for a write that acted, or may be acting, is marked; a busy for a write that never acted, marked, is never replaced and says nothing true.',
    file: WRITES,
    from: "      // Full: a live entry is never evicted to make room, and this write never acted.\n      return { status: 200, body: writeAnswer(verb, parsed.write, 'busy', null, POCKET_WRITE_SENTENCES.busy) };",
    to: "      // Full: a live entry is never evicted to make room, and this write never acted.\n      return { status: 200, body: writeAnswer(verb, parsed.write, 'busy', null, POCKET_WRITE_SENTENCES.busy), acted: true };",
    needs: ['gate']
  },
  {
    n: 'X1e',
    rule: 'X1',
    name: 'a duplicate of a write still in flight gets an unmarked busy',
    why: 'the write it duplicates may be acting now, and a 404 in place of its busy would say it was not (§14 finding 9).',
    file: WRITES,
    from: /(body: writeAnswer\(verb, parsed\.write, 'busy', null, POCKET_WRITE_SENTENCES\.busy\)),\n\s*acted: true\n\s*\};/,
    to: (m, body) => body + '\n      };',
    needs: ['gate']
  },
  {
    n: 'X1f',
    rule: 'X1',
    name: 'a recorded hit forgets whether its write acted',
    why: 'a recorded answer to a write that acted, replayed while the door stops, would be replaced by a 404 (§14 finding 9).',
    file: WRITES,
    from: '      return known.acted ? { status: 200, body: known.body, acted: true } : { status: 200, body: known.body };',
    to: '      return { status: 200, body: known.body };',
    needs: ['gate']
  },
  {
    n: 'X2a',
    rule: 'X2',
    name: 'a second JSON.parse in the write path',
    why: 'a write body is read in ONE place, the strict parse; a second reader is a second idea of what a body says.',
    file: WRITES,
    from: '    // STEP 1. The strict parse.',
    to: "    const peek: unknown = JSON.parse(body.toString('utf8'));\n    void peek;\n    // STEP 1. The strict parse.",
    needs: ['gate']
  },
  {
    n: 'X2b',
    rule: 'X2',
    name: 'the end body’s keys are no longer compared exactly',
    why: 'an unknown or missing key refuses the body whole (D2); a fourth key that rides along is a field nobody signed off on.',
    file: WRITES,
    from: "Object.keys(value).sort().join(',') !== END_KEYS",
    to: "!Object.keys(value).includes('session')",
    needs: ['gate']
  },
  {
    n: 'X2c',
    rule: 'X2',
    name: 'the write id read by a pattern',
    why: 'R1 refuses a pattern in this domain, and the strict parse reads one character at a time.',
    file: WRITES,
    from: /function isWriteId\(value: unknown\): value is string \{[\s\S]*?\n\}/,
    to: 'function isWriteId(value: unknown): value is string {\n  return typeof value === \'string\' && /^[0-9a-f]{32}$/.test(value);\n}',
    needs: ['gate']
  },
  {
    n: 'X2d',
    rule: 'X2',
    name: 'the parse outside a try',
    why: 'a body that does not parse would throw past the parse instead of answering refused malformed.',
    file: WRITES,
    from: /  try \{\n    value = JSON\.parse\(body\.toString\('utf8'\)\);\n  \} catch \{\n    return null;\n  \}/,
    to: "  value = JSON.parse(body.toString('utf8'));",
    needs: ['gate']
  },
  {
    n: 'X3a',
    rule: 'X3',
    name: 'the ledger’s lifetime re-spelled as a number',
    why: 'the lifetime is twice the signature clock, imported; a second spelling of the clock drifts the day the clock moves.',
    file: WRITES,
    from: 'export const POCKET_WRITE_LEDGER_MS = 2 * POCKET_CLOCK_SKEW_MS;',
    to: 'export const POCKET_WRITE_LEDGER_MS = 120_000;',
    needs: ['gate']
  },
  {
    n: 'X3b',
    rule: 'X3',
    name: 'the per-phone ledger cap raised past 512',
    why: 'D5: at most 512 entries a phone; one phone could otherwise fill the whole ledger.',
    file: WRITES,
    from: 'export const POCKET_WRITE_LEDGER_PER_PHONE = 512;',
    to: 'export const POCKET_WRITE_LEDGER_PER_PHONE = 100_000;',
    needs: ['gate']
  },
  {
    n: 'X3c',
    rule: 'X3',
    name: 'a live entry evicted',
    why: 'a ledger that evicts an entry younger than its lifetime lets a replay act twice: research 135 §4.4 measured it, 512 reads later.',
    file: WRITES,
    from: "      if (entry.state === 'recorded' && at - entry.at >= POCKET_WRITE_LEDGER_MS) forget(key, entry);",
    to: "      if (entry.state === 'recorded') forget(key, entry);",
    needs: ['gate']
  },
  {
    n: 'X3d',
    rule: 'X3',
    name: 'the pending entry made after the last check',
    why: 'two requests with one write id (a replay under a fresh nonce) would both pass the ledger before either recorded anything (§3 row 18).',
    file: WRITES,
    from: /    ledger\.set\(key, pending\);\n([\s\S]*?)(      if \(deps\.shuttingDown\(\)[^\n]*\n)/,
    to: (m, mid, check) => mid + check + '      ledger.set(key, pending);\n',
    needs: ['gate']
  },
  {
    n: 'X3e',
    rule: 'X3',
    name: 'the ledger keyed on the write id alone',
    why: 'a write id is the phone’s own; keyed without the phone, one phone’s write id answers another’s.',
    file: WRITES,
    from: '    const key = keyOf(verifiedPhone, parsed.write);',
    to: "    const key = keyOf('', parsed.write);",
    needs: ['gate']
  },
  {
    n: 'X3f',
    rule: 'X3',
    name: 'the write path imports node:fs',
    why: 'the ledger is memory, and a write is never queued for later (D6).',
    file: WRITES,
    from: "import { getLog } from '../log';",
    to: "import { getLog } from '../log';\nimport { writeFileSync } from 'node:fs';\nvoid writeFileSync;",
    needs: ['gate']
  },
  {
    n: 'X4a',
    rule: 'X4',
    name: 'no claim per session',
    why: 'two phones could end one session at once.',
    file: WRITES,
    from: '    sessionsInFlight.add(session);\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'X4b',
    rule: 'X4',
    name: 'the phone’s claim not released in the finally',
    why: 'a refusal or a throw would hold the phone’s claim forever, and every later write from it would read busy.',
    file: WRITES,
    from: '      phonesInFlight.delete(verifiedPhone);\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'X5a',
    rule: 'X5',
    name: 'PocketWrites grows a second member',
    why: 'Restore and Remove stay on the Mac (research 127 §5); a member on the interface is a verb the door can reach.',
    file: ROUTES,
    from: '  end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome>;\n}',
    to: '  end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome>;\n  restore(input: { sessionId: string }): Promise<PocketEndOutcome>;\n}',
    needs: ['gate']
  },
  {
    n: 'X5b',
    rule: 'X5',
    name: 'the push seam builds the phone’s writes',
    why: 'the seam’s door answers every write 404; a seam with writes is a harness that can end a session.',
    file: SEAM,
    from: "import { createPocketRoutes, type PocketFacts } from '../pocket/routes';",
    to: "import { createPocketRoutes, type PocketFacts } from '../pocket/routes';\nimport { createPocketWrites } from '../sessions/pocket-writes';\nexport const seamWrites = createPocketWrites({ core: () => null });",
    needs: ['gate']
  },
  {
    n: 'X5c',
    rule: 'X5',
    name: 'the batch narrows by answering',
    why: 'an arm on answering never fires (a machine that stops answering reads unknown), and misses the one case the Mac batch narrows (§14 finding 1).',
    file: POCKET_WRITES,
    from: 'if (batch && session.machine !== undefined && !machineKnown(session.machine.id)) {',
    to: 'if (batch && session.machine !== undefined && !session.machine.answering) {',
    needs: ['gate']
  },
  {
    n: 'X5d',
    rule: 'X5',
    name: 'something awaited before the verb',
    why: 'the row is re-read and both gates asked with nothing awaited before the verb; an await between is a window for the row to change under the press.',
    file: POCKET_WRITES,
    from: '        const session = core.listSessions().find((s) => s.id === sessionId);',
    to: '        await Promise.resolve();\n        const session = core.listSessions().find((s) => s.id === sessionId);',
    needs: ['gate']
  },
  {
    n: 'X5e',
    rule: 'X5',
    name: 'the production machine question is not the store’s machineRow',
    why: 'main’s spelling of the Mac batch’s machineKnown is machineRow(id) !== null; any other answer narrows a different set of rows.',
    file: POCKET_WRITES,
    from: '  return machineRow(machineId) !== null;',
    to: "  return machineId !== '';",
    needs: ['gate']
  },
  {
    n: 'X5f',
    rule: 'X5',
    name: 'PocketFacts.endOffer made required',
    why: 'the push seam’s and the tests’ facts would stop compiling for a field neither needs (§14 finding 8).',
    file: ROUTES,
    from: '  endOffer?(session: Session): PocketEndOffer;',
    to: '  endOffer(session: Session): PocketEndOffer;',
    needs: ['gate']
  },
  {
    n: 'X5g',
    rule: 'X5',
    name: 'the phone’s End sets a status',
    why: 'refusal 5: no route sets a status. The verb writes exited, exactly as the desk’s End does.',
    file: POCKET_WRITES,
    from: '        await core.killSession(sessionId);',
    to: '        await core.killSession(sessionId);\n        (core as unknown as { applyDetectedStatus(id: string): void }).applyDetectedStatus(sessionId);',
    needs: ['gate']
  },
  {
    n: 'X5h',
    rule: 'X5',
    name: 'the shared gate asked with an environment that is not the door’s',
    why: 'the door asks canEnd with DOOR_GATE_ENV and nothing else; a richer environment is a door that reads fields canEnd should never need.',
    file: POCKET_WRITES,
    from: 'sessionActionGates(session, session.status, DOOR_GATE_ENV).canEnd',
    to: 'sessionActionGates(session, session.status, { canRestore: true, canDiscard: true, shellPathReady: true, handback: undefined }).canEnd',
    needs: ['gate']
  },
  {
    n: 'X5i',
    rule: 'X5',
    name: 'the phone’s End stops asking main’s gate',
    why: 'main’s gate is what catches a row another window removed a moment ago; without it the door writes exited over a tombstone.',
    file: POCKET_WRITES,
    from: '  const refused = endRefusal(record);',
    to: '  const refused: string | null = record === undefined ? null : null;',
    needs: ['gate']
  },
  {
    n: 'X5j',
    rule: 'X5',
    name: 'the push seam hands its PocketHost a write',
    why: 'the seam’s door answers both write routes 404 because its host has no writes; a seam host with one is a harness that can end a session.',
    file: SEAM,
    from: '  const host = new PocketHost({ facts });',
    to: "  const host = new PocketHost({ facts, writes: { end: () => Promise.resolve({ outcome: 'done' as const }) } });",
    needs: ['gate']
  },
  {
    n: 'X6a',
    rule: 'X6',
    name: 'the write answer gains a field',
    why: 'the answer is five fields composed field by field; a sixth is something the phone could be told that nobody decided it should be, and D13 refuses any field that claims Face ID happened.',
    file: SHARED,
    from: /(export interface PocketWriteAnswer \{[\s\S]*?)\n\}/,
    to: (m, body) => body + '\n  faceId?: boolean;\n}',
    needs: ['gate']
  },
  {
    n: 'X6b',
    rule: 'X6',
    name: 'a sentence spelled as a literal in the write implementation',
    why: 'every sentence the phone reads has one owner; a literal here is a second spelling that drifts from the Mac’s.',
    file: POCKET_WRITES,
    from: "      if (core === null) return { outcome: 'failed', sentence: END_FAILED };",
    to: "      if (core === null) return { outcome: 'failed', sentence: 'Tortie could not end this session.' };",
    needs: ['gate']
  },
  {
    n: 'X6c',
    rule: 'X6',
    name: 'an error’s message reaches the phone',
    why: 'a failed tmux command’s message holds its argv (research 135 §4.8); nothing an error says reaches the phone or a log.',
    file: POCKET_WRITES,
    from: "  if (isGmuxError(err, 'SESSION_NOT_FOUND')) {",
    to: "  if (err instanceof Error && err.message.length > 0 && isGmuxError(err, 'SESSION_NOT_FOUND')) {",
    needs: ['gate']
  },
  {
    n: 'X6d',
    rule: 'X6',
    name: 'a thrown End told apart by what it says',
    why: 'by code only: what an error says is not a contract, and reading it is how its argv reaches somebody.',
    file: POCKET_WRITES,
    from: '        return thrownOutcome(err, core, sessionId);',
    to: "        if (String(err).includes('not found')) return { outcome: 'failed', sentence: END_FAILED };\n        return thrownOutcome(err, core, sessionId);",
    needs: ['gate']
  },
  {
    n: 'X7a',
    rule: 'X7',
    name: 'a late answer to a write is answered 404',
    why: 'main may be acting on that write; a 404 tells the phone nothing was done. The connection is cut, and the phone reads no answer, which is true.',
    file: LISTENER,
    from: /        if \(write\) \{\n[\s\S]*?counts\.writesCut \+= 1;\n\s*tlsSocket\.destroy\(\);\n\s*return;\n\s*\}\n/,
    to: '',
    needs: ['gate']
  },
  {
    n: 'X7b',
    rule: 'X7',
    name: 'a handler that throws after forwarding a write answers 404',
    why: 'a write main was handed is never answered 404 by the door process, from any path.',
    file: LISTENER,
    from: /if \(mark\.forwardedWrite\) tlsSocket\.destroy\(\);\n\s*else sendPocket\(res, 404, null\);/,
    to: 'sendPocket(res, 404, null);',
    needs: ['gate']
  },
  {
    n: 'X7c',
    rule: 'X7',
    name: 'main posts a 404 for an acted answer that fails validation',
    why: 'an acted answer is never replaced: nothing is posted, and the door process’s write timer cuts the connection (D4).',
    file: BIND,
    from: "      if (message.kind === 'answer' && !answer.acted) {",
    to: "      if (message.kind === 'answer') {",
    needs: ['gate']
  },
  {
    n: 'X8a',
    rule: 'X8',
    name: 'the door process parses a write body',
    why: 'D2: the door process never parses a write body; it holds no credential and should hold no session vocabulary, and main verifies the signature over the exact bytes first.',
    file: LISTENER,
    from: "      // A write's target is its path alone; a read's carries its query.",
    to: "      if (!route.reads) void JSON.parse(body.toString('utf8'));\n      // A write's target is its path alone; a read's carries its query.",
    needs: ['gate']
  },
  {
    n: 'X8b',
    rule: 'X8',
    name: 'a write’s target carries its query',
    why: 'everything a write says is in its signed body; a target with a query is a second place to say it.',
    file: LISTENER,
    from: /const target = route\.reads \? `\$\{url\.pathname\}\$\{url\.search\}` : url\.pathname;/,
    to: 'const target = `${url.pathname}${url.search}`;',
    needs: ['gate']
  },
  {
    n: 'X8c',
    rule: 'X8',
    name: 'a write with a query string is no longer refused',
    why: 'refusal 3 for a write: a query on /v1/end is refused route and never forwarded.',
    file: LISTENER,
    from: /    if \(!route\.reads && \(url\.search !== '' \|\| raw\.includes\('\?'\)\)\) return refuseRequest\(res, 'route'\);\n/,
    to: '',
    needs: ['gate']
  },
  {
    n: 'X8d',
    rule: 'X8',
    name: 'a write’s body bounded by the read cap',
    why: 'each write has its own cap, computed from its worst legal body; a write under another route’s number is bounded by nobody’s arithmetic.',
    file: LISTENER,
    from: '  return POCKET_WRITE_BODY_CAPS[route.id as DoorWriteRoute];',
    to: '  return POCKET_READ_BODY_CAP_BYTES;',
    needs: ['gate']
  },
  {
    n: 'X8e',
    rule: 'X8',
    name: 'main stops refusing a write whose target is not its path',
    why: 'the wire is validated on both sides; a target main does not check is one the door process alone vouches for.',
    file: WIRE,
    from: '  if (write && target !== writePathOf(route as DoorWriteRoute)) return null;\n',
    to: '',
    needs: ['gate']
  },
  {
    n: 'X9a',
    rule: 'X9',
    name: 'the write path handed a way to drop a phone (the unpair the fix round took out)',
    why: 'a write route that reaches a phone’s removal is the unpair this phase built and took out: the phone waited on it before it could forget a Mac that did not answer.',
    file: IPC,
    from: '      stillPaired: (phoneId) => this.stillPaired(phoneId),\n      ...(deps.writes !== undefined ? { writes: deps.writes } : {}),',
    to: '      stillPaired: (phoneId) => this.stillPaired(phoneId),\n      unpairSigningPhone: (phoneId: string) => this.removePhone(phoneId),\n      ...(deps.writes !== undefined ? { writes: deps.writes } : {}),',
    needs: ['gate']
  },
  {
    n: 'X9b',
    rule: 'X9',
    name: 'the write path’s deps grow a member',
    why: 'the write path is handed exactly the quit, stillPaired, the writes and the clock; a fifth member is a door into something else, and the last one was a phone’s removal.',
    file: WRITES,
    from: '  writes?: PocketWrites;\n',
    to: '  writes?: PocketWrites;\n  forgetPhone?(phoneId: string): void;\n',
    needs: ['gate']
  },
  {
    n: 'X9c',
    rule: 'X9',
    name: 'an answer carries a step to run after it',
    why: 'a step that follows an answer is how the unpair cut the phone’s socket and closed the door from inside its own handler, and lost its answer in 1 of 3 live unpairs.',
    file: BIND,
    from: '  readonly acted?: true;\n}',
    to: '  readonly acted?: true;\n  readonly after?: () => Promise<void>;\n}',
    needs: ['gate']
  },
  {
    n: 'X9d',
    rule: 'X9',
    name: 'the write path calls something that removes a phone',
    why: 'the write path ends a session through PocketWrites and does nothing else.',
    file: WRITES,
    from: '      const done = await acting;',
    to: '      const done = await acting;\n      (deps as unknown as { dropPhone(id: string): void }).dropPhone(verifiedPhone);',
    needs: ['gate']
  },
  {
    n: 'X9e',
    rule: 'X9',
    name: 'a second store write that removes a phone',
    why: 'Remove is the ONE thing that takes a phone out of the store, before its first await.',
    file: IPC,
    from: '  private stillPaired(phoneId: string): boolean {\n',
    to: '  private forgetQuietly(phoneId: string): void {\n    const store = this.readStore();\n    if (store !== null) this.writeStore({ ...store, phones: store.phones.filter((p) => p.id !== phoneId) });\n  }\n\n  private stillPaired(phoneId: string): boolean {\n',
    needs: ['gate']
  },
  {
    n: 'X10a',
    rule: 'X10',
    name: 'a Remove cuts a socket answering a write',
    why: 'an answer cut after main acted tells the phone nothing happened; only a socket answering a write main was handed finishes first.',
    file: LISTENER,
    from: '      state.revoked = true;\n      if (state.writes === 0) tlsSocket.destroy();',
    to: '      state.revoked = true;\n      tlsSocket.destroy();',
    needs: ['gate']
  },
  {
    n: 'X10b',
    rule: 'X10',
    name: 'a revoked socket is asked about after the first refusal',
    why: 'a revoked socket takes no further request, and nothing of one is read: it is refused before anything else is asked of it.',
    file: LISTENER,
    from: /    if \(cutIfRevoked\(tlsSocket, state\)\) return;\n(    \/\/ REFUSAL 1\.)/,
    to: (m, rest) => rest,
    needs: ['gate']
  },
  {
    n: 'X10c',
    rule: 'X10',
    name: 'a revoked socket is not cut when its write’s answer finishes',
    why: 'a socket whose phone was removed would stay open after its answer left, a connection for a phone that is no longer allowed.',
    file: LISTENER,
    from: "      res.once('finish', () => settle(true));\n",
    to: '',
    needs: ['gate']
  },
  {
    n: 'X11a',
    rule: 'X11',
    name: 'a second log line in the write path',
    why: 'one line per write: app.log is capped at 2 MiB with one archive, and 500 posts wrote 500 lines in 47 ms on the hook route.',
    file: WRITES,
    from: '    // STEP 1. The strict parse.',
    to: "    pocketLog.info('a phone write arrived');\n    // STEP 1. The strict parse.",
    needs: ['gate']
  },
  {
    n: 'X11b',
    rule: 'X11',
    name: 'the line names the write id',
    why: 'the line says the verb and the outcome word, never the body, the write id, a header or a sentence.',
    file: WRITES,
    from: "pocketLog.info(`the phone's ${verb}: ${done.outcome}`,",
    to: "pocketLog.info(`the phone's ${verb}: ${done.outcome} (${parsed.write})`,",
    needs: ['gate']
  },
  {
    n: 'X11c',
    rule: 'X11',
    name: 'the line carries a second field',
    why: 'the session id is its one field.',
    file: WRITES,
    from: "pocketLog.info(`the phone's ${verb}: ${done.outcome}`, { session });",
    to: "pocketLog.info(`the phone's ${verb}: ${done.outcome}`, { session, phone: verifiedPhone });",
    needs: ['gate']
  },
  {
    n: 'X12a',
    rule: 'X12',
    name: 'the write line spelled rather than derived',
    why: 'the lines are exactly the hashed facts; a spelled line stays the same when the route list moves.',
    file: PAIRING,
    from: /  if \(clauses\.length > 0\) lines\.push\(`Lets an allowed phone \$\{clauses\.join\(' and '\)\}`\);/,
    to: "  if (clauses.length > 0) lines.push('Lets an allowed phone end a session');",
    needs: ['gate']
  },
  {
    n: 'X12b',
    rule: 'X12',
    name: 'the clauses keyed by any string',
    why: 'keyed by the closed write list, a write added without its words is a compile error rather than a route the lines never mention.',
    file: PAIRING,
    from: 'const WRITE_CLAUSES: Readonly<Record<PocketWriteRouteId, string>> = Object.freeze({',
    to: 'const WRITE_CLAUSES: Readonly<Record<string, string>> = Object.freeze({',
    needs: ['gate']
  },
  {
    n: 'X12c',
    rule: 'X12',
    name: 'the read-only sentence comes back',
    why: 'a constant named read only, drawn under a door that ends sessions, is false in code and on screen (D19).',
    file: SHARED,
    from: 'export const POCKET_DOOR_HONESTY =',
    to: "export const POCKET_READ_ONLY_HONESTY = 'This door only answers questions.';\nexport const POCKET_DOOR_HONESTY =",
    needs: ['gate']
  },
  // -------------------------------------------------------------------------
  // THE HOSTILE CLIENT'S OWN: clauses the source reads cannot tell from a guard.
  // -------------------------------------------------------------------------
  {
    n: 'X1',
    rule: 'hostile',
    name: 'the server-name check inverted (the refusal is still written)',
    why: 'M1 reads that the refusal is there; only a handshake for another name tells whether it fires.',
    file: LISTENER,
    from: '    if (tlsSocket.servername !== host.name) {',
    to: '    if (tlsSocket.servername === `${host.name}.`) {',
    needs: ['gate', 'hostile']
  },
  {
    n: 'X2',
    rule: 'hostile',
    name: 'the Host check inverted',
    why: 'a request addressed to somebody else is not this door’s.',
    file: LISTENER,
    from: "    if (req.headers.host !== `${host.name}:${String(host.port)}`) return refuseRequest(res, 'host');",
    to: "    if (req.headers.host === 'nobody.invalid') return refuseRequest(res, 'host');",
    needs: ['gate', 'hostile']
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
  // AND electron.vite.config.ts, whose door entry conformance:pocket U5 reads
  // (Phase 330).
  for (const name of ['package.json', 'electron.vite.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))]) {
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
  if (entry.file === ROUTES || entry.file === PAIRING || entry.file === FACTS || entry.file === TABLE) return ['gate', 'hostile'];
  return ['gate'];
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

/**
 * One exact replacement inside the clone; a function replacer, so `$&` stays
 * literal. Since Phase 317 `from` may be a RegExp, for an arm on a file another
 * builder writes in the same round whose spacing this harness should not pin,
 * and `to` may then be a function of the match and its groups.
 */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (from instanceof RegExp) {
    from.lastIndex = 0;
    if (!from.test(text)) return false;
    from.lastIndex = 0;
  } else if (!text.includes(from)) {
    return false;
  }
  writeFileSync(path, text.replace(from, typeof to === 'function' ? to : () => to), 'utf8');
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
          `${(entry.from instanceof RegExp ? String(entry.from) : JSON.stringify(entry.from)).slice(0, 180)}`
      );
      table.push([entry.n, entry.rule, 'SHAPE MISSING', '']);
      continue;
    }
    ran += 1;
    // THE ARM'S OWN RESTORE IS IN A FINALLY (Phase 317), so an arm whose check
    // throws still leaves the clone as the worktree is, proved by sha256,
    // before the next arm reads it.
    try {
      const out = runChecks(checksFor(entry));
      const newlyRed = out.red.filter((r) => !baseRed.has(r));
      // `alsoRed` names rules the SAME clause owns a second half of (Phase 314's
      // push route is both a new word in the table and a moved membership pin), and
      // every one of them must go newly red too, or the arm proves only one half.
      const own = [entry.rule, ...(entry.alsoRed ?? [])].every((r) => newlyRed.includes(r));
      table.push([entry.n, entry.rule, out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', newlyRed.join(',')]);
      say(`${entry.n.padEnd(4)} ${entry.rule.padEnd(4)} ${entry.name}: exit ${String(out.code)}, newly red ${newlyRed.join(', ') || 'nothing'}`);
      if (out.code === 0) {
        problems.push(
          `${entry.n} "${entry.name}": the checks stayed GREEN. ${entry.why} Nothing notices, so ${entry.rule} is decoration.`
        );
      } else if (!own) {
        const lines = out.text.split('\n').filter((l) => l.includes('[p313 ')).slice(0, 3).map((l) => l.trim().slice(0, 220));
        problems.push(
          `${entry.n} "${entry.name}": something went red but ${[entry.rule, ...(entry.alsoRed ?? [])].join(' and ')} did not all (red instead: ` +
            `${newlyRed.join(', ') || 'nothing numbered'}). ${lines.join(' // ')}`
        );
      }
    } finally {
      restore(entry.file);
    }
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
    "listener but the door process's own, which the hostile client runs in-process on loopback and closes in its own finally.\n"
);
