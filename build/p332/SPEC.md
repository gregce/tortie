# Phase 332 — pairing waits for the Mac's public name — SPEC

Written by the spec step on 2026-09-30 in `/private/tmp/wt-p332` at `3fae3d87` (origin/main). Between Phase 330's
landing `a8e06fe7` and this head there are three `docs(backlog)` commits and they touch only `docs/BACKLOG.md`, so the
product is byte for byte `a8e06fe7`, and **`a8e06fe7` is the parent build for every "before" measurement**. Every
`file:line` below was re-read at this head.

Read with it, whole: the Phase 332 entry (`grep -n "^## Phase 332 " docs/BACKLOG.md`, to the running log), the
running-log lines of 2026-09-29 ("PHASE 332 REQUESTED") and 2026-09-30 ("PHASE 332 QUEUED AND STARTING") at the end of
`docs/BACKLOG.md`, and `build/p330/SPEC.md` §2 (M5, O1, O2, O4), §3 row 7, §4.9 and its three "§As built" sections.
Where this file and the entry disagree, §3 says so and this file wins.

**His request, 2026-09-29:** "tortie automatically checks dns for a user until their mac's public address is
reachable? similar to what we did and then _allows_ phone pairing? and stops checking this once its confirmed or starts
again if they clear the setting, etc".

**The hard rules for every step of this phase, stated once.** No test, probe or agent asks real DNS for his name
(`gregs-macbook-pro.tail2ddfe1.ts.net`) or loops on a real DNS server; every test and probe reaches a LOOPBACK stand-in
through `GMUX_POCKET_NAME_SERVERS` (development builds only) or through injected deps. One verifier may send one
hand-run question for a made-up `ts.net` name (§8.5 method 3) and says so. No `tailscale funnel`, no Tailscale command
that changes his tailnet, no LocalAPI: the Funnel child is always Phase 330's stand-in. No real interface is bound in a
test. Builders and the integrator launch no Electron and boot no Simulator.

---

## 1. The answer first

**What gets built.** A new module in main, `src/main/pocket/public-name.ts`, writes and reads DNS packets itself over
`node:dgram`: one non-recursive `A` question for the Mac's public name to each of the `ts.net` zone's own servers, and a
bounded JavaScript parser for the answer. `PocketHost` (`src/main/pocket/ipc.ts`) runs it on the quit-aware timer only
while the door is PUBLISHED and the name is not confirmed, remembers a confirmation in the sealed store per tailnet,
name and port, and exposes one predicate, `pairable`. `beginPairing` refuses until it is true, and the sheet draws a
`naming` face in place of the Pair button. Nothing else about the door changes.

**What a person sees.**

1. Settings → Phone, **Pair**, **Allow**, exactly as today. The switch line reads `Answering at https://…`.
2. Under **Pair a phone**: `Pair opens once your Mac’s name is on the internet, which can take a few minutes.` and no
   button, while Tortie asks the name's own servers (at once, then after 20, 30, 45 and 60 s, then every 60 s).
3. When the name answers twice in a row, the line goes and **Pair** appears. A Pair pressed while the door was off is
   carried through, so the code then shows by itself. The window is still 3:00, and the first scan works, because the
   phone's resolver first meets the name after it exists.
4. The next launch, or the next Allow after a Remove, shows **Pair** at once and asks once in the background.
5. On a network where the check cannot be read at all, **Pair** appears after three unreadable rounds with
   `Tortie could not check your Mac’s name, so a first scan may fail.` above it, which is Phase 330's behaviour.
6. A person who never turns the door on gets nothing new: no timer, no socket, no question.

**The seams, decided (§4 gives each reason).**

| Seam | Decision |
| --- | --- |
| The query | Hand-built, 12-byte header, RD=0 for the name, RD=1 only for the server search; one question; no EDNS; id from `node:crypto`. §4.2 |
| The transport | One `udp4` socket per question, bound to `127.0.0.1` only for a loopback server, CONNECTED before it sends, with a literal-only `lookup` so `node:dns` is never reached, a 2 s deadline, first id-matching reply decides. Outside Electron it sends to 127.0.0.1 alone. §4.3 |
| The parser | Trusts nothing but `reply.length`: ≤ 512 bytes, the question echoed byte for byte, at most 32 records, labels ≤ 63, names ≤ 255, pointers strictly backward and at most 8 per name, no trailing byte. §4.4 |
| The verdict | `record` needs AA, the exact name (RFC 4343 case rule), only `A`/`IN`, and every address public. `negative` is an authoritative NXDOMAIN or NOERROR with no answer. Everything else is `unreadable`. §4.5 |
| The servers | `NS ts.net` and the NS hosts' `A` from 1.1.1.1 and 8.8.8.8, once per run, at most four addresses. No question in the search names his name or his tailnet. §4.6 |
| The confirm rule | A round asks every kept server at once: any negative is `no`, else any record is `yes`, else `unreadable`. Two `yes` rounds in a row confirm. §4.7 |
| The override | `GMUX_POCKET_NAME_SERVERS`, development only, `127.0.0.1:<port>` × 1..4; anything else refuses and NEVER falls back to the search; a packaged build ignores it. §4.8 |
| The schedule | Starts only at the end of a counted start, stops in every unpublish, timer through `armFunnelRestart`, gaps measured from the end of a round, a wake brings the next round forward, every answer written only after a synchronous guard. §4.9 |
| The store | `nameConfirmed: { tailnet, publicName, publicPort } \| null`, not hashed; cleared by the off write, a read that asks approval, an approval wait, and a re-ask that answers no. §4.10 |
| The contract | `PocketNameCheck`, `nameCheck` and `pairable` on `PocketStatus`, `POCKET_NAME_SENTENCES`, and `PocketFunnelView.publishedAt` removed. No new channel. §4.11 |
| The sheet | `pairingStage` gains `naming`; `ready` draws the unreadable line; the carried press and `onPair` read `pairable`; `CODE_FIRST_NAME` only for a code shown while `unreadable`. §4.12 |

**What does not change:** every route, the confirm hash (`sha256-pocket-exec-v3`, `NORMALIZE` at
`src/main/pocket/pairing.ts:286`), the door process, the Funnel child and its argv, the match and Allow on the Mac, the
window (`POCKET_PAIRING_WINDOW_MS`, 3:00, `pairing.ts:1056`), the phone app, the native menus (`Pair a Phone…` stays at
`src/main/menu.ts:615`), and the channel count (eleven, `conformance:pocket` B1).

---

## 2. The tree at this head, re-read

| What | Where | Note |
| --- | --- | --- |
| The counted start | `src/main/pocket/ipc.ts:893-900` (`this.publishedAt = this.now()` at `:895`) | The check begins after step 13 (`:913`), see §4.9 |
| `openNow` and its three callers | `ipc.ts:771`; called at `:691` (`start`), `:975` (`recoverNow`), `:1232` (`setDoor`'s job) | `recoverNow` is the only restart |
| `closeNow` | `ipc.ts:1065-1074` | reaches `unpublish` (`:1046-1054`) |
| `unexpectedlyDown` | `ipc.ts:934-939` | the pause point |
| `recoverNow` | `ipc.ts:965-986` | calls `unpublish` directly, never `closeNow` |
| `wakeCheck` | `ipc.ts:992-1000`, subscribed at `:410` | the wake |
| `sweepAndRead` | `ipc.ts:719-752`; `this.read = read` at `:732`, `const store` at `:733` | the approval-asking read |
| `onApproval` | `ipc.ts:868-871` | the approval wait |
| The off write | `ipc.ts:1181-1183` | `saved = this.writeStore({ ...store, enabled: false, bindAtLaunch: false })` |
| `identityNow`'s store literal | `ipc.ts:462-471` | must carry the new field |
| `beginPairing` | `ipc.ts:1282-1299`; the restart refusal at `:1292` | the refusal's shape |
| `status()` | `ipc.ts:579-630`; `publishedAt: this.publishedAt` at `:621` | |
| `dropPushToken` | `ipc.ts:1482-1493` | the precedent for a store write held for the run when the seal refuses |
| `PocketHostDeps` | `ipc.ts:178-210` | `tailscale` and `door` are TESTS AND `push-seam.ts` ONLY (U4) |
| The quit-aware timer | `src/main/pocket/funnel.ts:1340-1356` (`armFunnelRestart`), cleared by `beginFunnelShutdown` (`:1363`), called on the quit's first line (`src/main/capabilities.ts:541`) | it sleeps through `deps.sleep` |
| `FunnelDeps` | `funnel.ts:186-197`; the shipping `sleep` at `:288-292` (`setTimeout`, unref) | monotonic |
| `PocketTailnetFacts` / `PocketStore` | `pairing.ts:642-646` / `:650-675` | observations, not hashed |
| `readPocketStore` | `pairing.ts:741-801`; its store literal at `:781-790` | |
| `PocketFunnelView.publishedAt` | `src/shared/ipc/pocket.ts:379-384` | its one reader is `PhoneSection.tsx:692` |
| `PocketStatus` | `pocket.ts:414-477` | |
| `POCKET_FUNNEL_SENTENCES`, `pocketFunnelSentence` | `pocket.ts:647-669`, `:672-675` | the new sentences go after `:675` |
| The sheet | `src/renderer/settings/PhoneSection.tsx`: `CODE_EXPIRED` `:77`, `CODE_FIRST_NAME` `:84-85`, `FIRST_NAME_MS` `:100`, `expiredNotice` `:146-154`, `pairingStage` `:202-217`, `pairAfterAllowNext` `:232-242`, `waiting` face `:390-397`, the expiry effect `:686-697`, `onPair` `:804-814` | |
| The push seam's pairing | `src/main/harness/push-seam.ts:652-660` (`standInOnly`), `:667-688` (`openDoorForPairing`), `:755` (`host.beginPairing()`) | pairs as soon as the door listens |
| The probes that pair | `build/probe-p313.mjs:733-746`, `build/p316/probe-p316.mjs:405-432`, `build/p330/probe-p330.mjs:1346-1347` and `:1425-1426`, `build/probe-p314.mjs:1289` (the seam's env) | each calls `beginPairing` on `listening` |
| The stand-in's name | `build/p330/tailscale-standin.mjs:140`, `p330-mac.tail00000.ts.net.` | made up |
| `HELPER_USER_FLOOR` | `build/assert-electron-teardown.mjs:337`, 154 | |
| `conformance:pocket` T1's file set | `build/conformance-pocket.mjs:1438`, `/pocket\|p313\|p330/i` | does not read `build/p332/` |
| L2 | `conformance-pocket.mjs:291-300`: any string literal containing `0.0.0.0` in the domain fails | the refused ranges are written as numbers (§4.5) |
| P1 (d) | `conformance-pocket.mjs:3392-3398`: `remoteAddress`, `remotePort`, `remoteFamily` property reads fail | the UDP reply's source is read as `rinfo.address`/`rinfo.port`, never `socket.remoteAddress()` |
| `node:dns` / `node:dgram` under `src/` | none at this head | `build/real-machine.mjs:90` and `build/p314/push-conformance.mts:43` name `node:dns`, outside `src/` |
| The phone's retry | `ios/Tortie/Door/Pairing.swift:299` (`presentEvery` = 2 s), `:405-408` (`nameNotFound` retried inside the window) | unchanged |
| The phone's words | `ios/Tortie/Style/Copy.swift:230` (`pairNameNotYet`), `:241` (`pairNameNotFound`, which `/// Names:` `BTN_PAIR`) | unchanged, byte for byte |
| The contract baseline | `docs/audits/contract-baseline.txt:401`, `[env.names] count=115` | the only section this phase moves |

**Measured by this step** (loopback only, one socket bound to `127.0.0.1` and closed): a default
`dgram.createSocket('udp4')` calls `dns.lookup` on `bind({ address: '127.0.0.1' })` (one call), and a socket created
with its own `lookup` option calls that function instead, with `(host, family: number, cb)`, and never `dns.lookup`.
So without a `lookup` of the module's own, the entry's "`dns.lookup` spies fail the test" would fire on every socket.

---

## 3. Where the entry is wrong or stale at this head

| # | The entry says | What is true | What this spec does |
| --- | --- | --- | --- |
| 1 | N5.3: the baseline is regenerated "for the status fields, `publishedAt`'s removal, `POCKET_NAME_SENTENCES` and `GMUX_POCKET_NAME_SERVERS`" | `build/contract-inventory.mjs` lists invoke channels, SQLite, localStorage keys, `GMUX_*` names, harness modes and bundle refusals. Types and constants are not in it (the Phase 330 fix round found the same for `confirmable`). | Exactly one section moves: `[env.names] count=115` → `116`, adding `GMUX_POCKET_NAME_SERVERS`. Any other move is a finding. |
| 2 | Method 2: the stand-in answers NXDOMAIN "until 60 s after the counted start", and H1 reads rounds "at 20, 30, 45 and 60 s" | With the record at 60 s, the round at 95 s already answers yes, so the 60 s gap is never seen | The record arrives **110 s** after the probe sees `listening`: rounds at 0, 20, 50, 95 read no, 155 and 175 read yes. Gaps 20, 30, 45, 60, then 20. The parent still fails: its phone caches the miss from about 2 s until about 302 s, past the window's 180 s. |
| 3 | (not named) | Four probes and the push seam call `beginPairing` the moment the door listens (§2). At HEAD that refuses until `pairable`, and with no override their development app would run the REAL server search and ask the real `ts.net` servers for the stand-in's made-up name every 60 s. | §4.13: each starts the loopback DNS stand-in, passes `GMUX_POCKET_NAME_SERVERS`, and waits for `pairable`. The seam refuses to pair without a loopback override. |
| 4 | (not named) | `ipc.test.ts:393` and `switch-queue.test.ts:301` construct `PocketHost` and publish. With default deps they would reach the real search. | `PocketHostDeps.names` (tests only), plus rule D8: outside Electron the shipping transport sends to `127.0.0.1` alone, so a test that forgets gets unreadable rounds and no packet. |
| 5 | N2.3: the check stops in `closeNow`, "which every off, forget, Remove and quit reaches" | An unexpected exit's restart unpublishes through `recoverNow` → `unpublish` (`ipc.ts:970`), never `closeNow`, and the quit reaches neither | It stops in `unpublish()` (so `closeNow` and `recoverNow` both stop it) and in `unexpectedlyDown()`; the quit's first line clears its timer through `beginFunnelShutdown`, and the write guard refuses once the quit began. |
| 6 | N2.6 and H3: "A switch-on with the confirmation kept" | The off write clears the confirmation (N3.3), so the switch can never turn on with one kept | "Switch-on" means every counted start that is not a restart: a launch, and the Allow after a Remove, an alerts change or a withdrawal. H3 drives Remove + Allow and withdraw + Allow. |
| 7 | N3.4: "`NORMALIZE` and `sha256-pocket-exec-v3` (`:322`)" | `NORMALIZE` is at `pairing.ts:286`; `:322` is the algorithm's name | Cited correctly here. |
| 8 | N4.1: "`PocketFunnelView.publishedAt` loses its one reader and is removed" | The private `PocketHost.publishedAt` (`ipc.ts:308`, written `:895`) then has no reader, and `noUnusedLocals` (`tsconfig.main.json:9`) fails the build on it | Both go. |
| 9 | N2.2: the timer is "set through `armFunnelRestart`" | It sleeps through `deps.sleep` of the `FunnelDeps` it is handed (`funnel.ts:1350`); handed `this.funnel`, the name timer's sleeps land in `ipc.test.ts`'s Funnel fake (`ts.sleeps`, `:337-340`), whose restart tests filter by duration (`:974`) | `armFunnelRestart`'s first parameter becomes `Pick<FunnelDeps, 'sleep'>` and the host hands it the names deps. Same set, same quit, separate clock in tests. |
| 10 | N1.3: "a fixed number of pointers" | A strictly backward pointer alone does not end a loop: a name can pass a label and meet a later pointer back into its own earlier bytes | Strictly backward, never into the header, AND at most 8 per name (§4.4). |
| 11 | N1.4: the refused ranges as CIDR text | `conformance:pocket` L2 fails any string literal in the domain containing `0.0.0.0` | Written as numeric tuples (§4.5), with the CIDR form only in comments. |
| 12 | D1-D6 | Nothing holds the override to loopback, and nothing stops a test reaching real DNS | D7 (the override) and D8 (Electron only) are added, and T1 is widened to `build/p332/` (§7.1). |
| 13 | H1: "within 1 s" of 20, 30, 45 and 60 s | The timer is armed when a round's verdict lands, so a round that times out adds its 2 s deadline | Gaps are measured from the END of a round. H1's rounds are answered at once; H6's are graded 22, 32 s. |
| 14 | (not named) | `GMUX_POCKET_NAME_SERVERS` set to anything unusable could, in a careless build, fall back to the search, which from a probe is real DNS | D7: set and unusable refuses (`override-unusable`, every round unreadable, no packet), never falls back, exactly as `funnel.ts` refuses `override-unusable` for `GMUX_TAILSCALE_BIN` (`funnel.ts:17-27`). No live arm drives a bad override, because a failing build would itself send real packets (§8.3). |

---

## 4. The design, seam by seam

### 4.1 The pieces, and the one API every builder codes against

```
 PocketHost (ipc.ts, main)
   counted start ──► beginNameCheck(why) ──► nameRoundNow(run) ──► askNameRound(names, publicName, run.cache)
        ▲                     │ timer: armFunnelRestart(names, gap, …)            │  (public-name.ts)
        │                     ▼                                                    ▼
   unpublish / unexpectedlyDown ──► stopNameCheck()        findZoneServers ─► exchange (udp4, connected)
                                                           encodeNameQuery ─► readNameReply ─► judgeZoneAnswer
   status(): nameCheck, pairable      beginPairing: refuses unless pairable()
```

`src/main/pocket/public-name.ts` exports exactly these (builder `names`); `host` and `proof` code against the names:

```ts
// constants: §9
export const NAME_SEARCH_ZONE: string;                     // 'ts.net'
export const NAME_SEARCH_RESOLVERS: readonly string[];     // ['1.1.1.1', '8.8.8.8']
export const NAME_SERVERS_ENV: string;                     // 'GMUX_POCKET_NAME_SERVERS'
export const NAME_REFUSED_V4: readonly (readonly [number, number, number, number, number])[];
export const NAME_CHECK_GAPS_MS: readonly number[];        // [20_000, 30_000, 45_000, 60_000]
export const NAME_CHECK_AFTER_YES_MS: number;              // 20_000
export const NAME_UNREADABLE_ROUNDS: number;               // 3
// … and the caps of §9

export type NameVerdict = 'yes' | 'no' | 'unreadable';
export type NameAnswer = 'record' | 'negative' | 'unreadable';
export type NameReason =
  | 'record' | 'nxdomain' | 'no-record'
  | 'timeout' | 'socket' | 'too-long' | 'malformed' | 'id' | 'not-reply' | 'opcode' | 'truncated'
  | 'servfail' | 'refused' | 'rcode' | 'question' | 'counts' | 'pointer' | 'label' | 'name-long' | 'trailing'
  | 'not-authoritative' | 'other-owner' | 'cname' | 'type' | 'class' | 'private-address'
  | 'no-servers' | 'override-unusable' | 'bad-name' | 'outside-zone' | 'error';
export interface NameServer { readonly address: string; readonly port: number }
export type NameServerSource =
  | { readonly kind: 'search' }
  | { readonly kind: 'fixed'; readonly servers: readonly NameServer[] }
  | { readonly kind: 'refused' };
export type NameExchange = { readonly kind: 'reply'; readonly bytes: Buffer } | { readonly kind: 'timeout' } | { readonly kind: 'error' };
export interface NameCheckDeps {
  readonly source: NameServerSource;
  exchange(server: NameServer, packet: Buffer): Promise<NameExchange>;  // never rejects
  id(): number;                                                          // 0..65535
  sleep(ms: number): Promise<void>;
}
export interface NameRoundCache { servers: readonly NameServer[] | null }
export interface NameRoundResult { readonly verdict: NameVerdict; readonly reason: NameReason }
export interface NameStreak { readonly rounds: number; readonly yes: number; readonly unreadable: number; readonly opened: boolean }
export const NAME_STREAK_START: NameStreak;                // { rounds: 0, yes: 0, unreadable: 0, opened: false }

export function nameServersFrom(input: { packaged: boolean; env: NodeJS.ProcessEnv }): NameServerSource;
export function encodeNameQuery(id: number, name: string, type: 'A' | 'NS', recursion: boolean): Buffer | null;
export function readNameReply(query: Buffer, reply: Buffer): ParsedNameReply | { readonly ok: false; readonly reason: NameReason };
export function judgeZoneAnswer(query: Buffer, reply: Buffer, name: string): { readonly answer: NameAnswer; readonly reason: NameReason };
export function isPublicV4(octets: readonly number[]): boolean;
export function roundVerdictOf(answers: readonly { readonly answer: NameAnswer; readonly reason: NameReason }[]): NameRoundResult;
export function findZoneServers(deps: NameCheckDeps): Promise<readonly NameServer[] | null>;  // never rejects
export function askNameRound(deps: NameCheckDeps, publicName: string, cache: NameRoundCache): Promise<NameRoundResult>;  // never rejects
export function nextNameStreak(streak: NameStreak, verdict: NameVerdict): { readonly streak: NameStreak; readonly confirmed: boolean; readonly gapMs: number };
export function defaultNameCheckDeps(input: { packaged: boolean; env: NodeJS.ProcessEnv }): NameCheckDeps;
```

`ParsedNameReply` is `{ ok: true; id; aa: boolean; rcode: number; answers: readonly NameRecord[] }`, where a
`NameRecord` is `{ owner: readonly Buffer[]; type: number; klass: number; rdata: Buffer; rdataOffset: number }` (the
offset is kept so an NS target can be decoded with pointers into the whole packet). The module imports `node:dgram`,
`node:crypto` and `node:net` and NOTHING else: no `electron`, no logger, no `node:fs`, nothing under `src/` (D1). It
logs nothing; it answers reason words and the host logs them (D5).

`src/main/pocket/__tests__/dns-fixtures.ts` (builder `names`, landed first) is the tests' own writer of REPLIES, a
second spelling that shares no code with the parser: `replyTo(query, { rcode, aa, tc, answers, authority, raw })` and
`fakeNameDeps({ answer(qname, qtype): … | 'silent' | 'hold', sleep })`, which returns a `NameCheckDeps` whose sleeps and
held answers a test releases by hand. `ipc.test.ts` and `switch-queue.test.ts` (builder `host`) import it.

### 4.2 The query, byte for byte — `encodeNameQuery`

**Why hand-built, and why not `node:dns`.** `node:dns` cannot clear the recursion-desired bit or report the
authoritative bit, and the confirm rule rests on both (§4.5). And it is c-ares, a C parser of bytes anyone on the path
can forge, inside main, which is exactly why the door process left main (`build/assert-import-boundaries.mjs:344-359`).
A JavaScript parser that meets a bad packet throws or answers a reason word, and both read as `unreadable`. No DNS
library is in the tree and none is added.

**The name.** Lowercased; one trailing dot dropped; split on `.`; at least 2 labels; each label 1 to 63 bytes matching
`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`; the wire length (Σ(1 + label) + 1) at most 255. Anything else answers `null`, and
the round reads `unreadable` with `bad-name` and sends nothing. For the `A` question the name must also end in
`.ts.net` with at least 3 labels, else `outside-zone` and nothing is sent: the servers asked are `ts.net`'s, and a
question for another zone at them is a question they cannot answer honestly.

**The bytes.**

| Offset | Bytes | Value |
| --- | --- | --- |
| 0-1 | id | `deps.id()`, big-endian. The shipping id is `randomInt(0, 0x10000)` from `node:crypto`; `Math.random` appears nowhere (D2) |
| 2 | flags high | `recursion ? 0x01 : 0x00`: QR 0, OPCODE 0, AA 0, TC 0, RD. **RD is 0 for every question naming his name**, and 1 only for the two search questions (§4.6) |
| 3 | flags low | `0x00`: RA 0, Z 0, AD 0, CD 0, RCODE 0 |
| 4-5 | QDCOUNT | 1 |
| 6-11 | AN/NS/ARCOUNT | 0, 0, 0: no OPT record (no EDNS), no DNSSEC OK bit, no cookie |
| 12… | QNAME | each label as one length byte and its bytes, then `0x00`; never compressed |
| then | QTYPE, QCLASS | `A` = `00 01` or `NS` = `00 02`; `IN` = `00 01` |

Worked, for the probes' made-up name `p330-mac.tail00000.ts.net`, id `0x1234`, RD 0 (43 bytes):

```
12 34 00 00 00 01 00 00 00 00 00 00 08 70 33 33 30 2d 6d 61 63 09 74 61 69 6c 30 30 30 30 30
02 74 73 03 6e 65 74 00 00 01 00 01
```

The search's `NS ts.net`, id `0xbeef`, RD 1 (24 bytes):

```
be ef 01 00 00 01 00 00 00 00 00 00 02 74 73 03 6e 65 74 00 00 02 00 01
```

His own name would be 53 bytes. It is never written into a test, a fixture or a probe.

**Why RD=0 matters.** A resolver on his network that intercepts port 53 answers a non-recursive question from its cache
or refuses; it never goes and fetches the name. So a check can never plant the 300 s negative cache (O4) that the phone
would then meet, and an intercepted answer lacks the authoritative bit and reads `unreadable`.

### 4.3 The transport — the shipping `exchange`

One socket per question, closed on every way out. In order:

1. **Electron only, for anything but loopback (D8).** If `server.address !== '127.0.0.1'` and
   `typeof process.versions.electron !== 'string'`, answer `{ kind: 'error' }` before any socket exists. Vitest, `tsx`
   and plain `node` are not Electron, so no test and no script can reach a real server through the shipping transport,
   whatever it forgets to inject. A hand-run verifier who must ask a real server writes their own socket (§8.5).
2. `server.address` must pass `isIPv4` and `server.port` must be an integer 1..65535, else `error`.
3. `createSocket({ type: 'udp4', lookup: literalLookup })`. `literalLookup(host, _family, cb)` answers
   `process.nextTick(cb, null, host, 4)` for an `isIPv4` host and an error otherwise. Node's dgram calls the socket's
   `lookup` for `bind` and `connect` (measured, §2), so `node:dns` is never reached; the module does not import it.
4. `socket.on('error', …)` and `socket.on('message', …)` are attached before anything else. A deadline of
   `NAME_QUERY_DEADLINE_MS` (2 s) answers `timeout`. The timer and the socket are both `unref()`ed, so a question in
   flight never holds a quit.
5. **A loopback server binds `127.0.0.1` first** (`socket.bind({ address: '127.0.0.1', port: 0 }, …)`), so no test, no
   probe and no development run binds an interface. A real server is connected without an explicit bind; Node binds the
   wildcard implicitly, and the domain never spells the wildcard (L2).
6. `socket.connect(server.port, server.address, (err) => …)`, and only inside that callback
   `socket.send(packet, (err) => …)`: the buffer and a callback, no port and no address (D2). A connected UDP socket is
   delivered only its peer's datagrams by the kernel.
7. **Every datagram is filtered before it is read.** It is dropped, silently and without ending the wait, unless
   `rinfo.address === server.address && rinfo.port === server.port` (read from `rinfo`, never
   `socket.remoteAddress()`, which P1 (d) refuses), its length is 12..512 (`NAME_REPLY_MAX_BYTES`), its first two bytes
   equal the question's id, and its QR bit is 1. The first datagram that passes is copied (`Buffer.from`) and answered
   as `{ kind: 'reply', bytes }`. So an off-path sprayer can make a question time out, and nothing it sends can end one
   early or be parsed.
8. Settling runs once: the timer cleared, the listeners removed, `socket.close()` in a `try`. The whole body is in a
   `try` whose `catch` answers `error`: nothing thrown leaves the module.

### 4.4 The parser — `readNameReply(query, reply)`

It trusts `reply.length` and nothing else. Every read is checked against it before it is made. In order, the first
failure answers its reason word:

1. `reply.length` is 12..512, else `too-long` (above) or `malformed` (below).
2. The id (`readUInt16BE(0)`) equals the query's, else `id`.
3. QR is 1, else `not-reply`; OPCODE (`(reply[2] >> 3) & 0x0f`) is 0, else `opcode`; TC is 0, else `truncated` (no
   retry over TCP); RCODE (`reply[3] & 0x0f`): 0 and 3 go on, 2 is `servfail`, 5 is `refused`, any other is `rcode`.
4. QDCOUNT is 1, and `reply.subarray(12, 12 + q.length).equals(q)` where `q = query.subarray(12)`, else `question`.
   Byte for byte, so a compressed, case-changed, retyped or reclassed question is refused.
5. ANCOUNT + NSCOUNT + ARCOUNT ≤ `NAME_RECORDS_MAX` (32), else `counts`.
6. From `12 + q.length`, for every record of all three sections: the owner by `decodeName`; then 10 bytes must remain
   (TYPE, CLASS, TTL, RDLENGTH), else `malformed`; then RDLENGTH bytes must remain, else `malformed`. Answer-section
   records are kept; the other two sections are bounded and walked, never read further.
7. The cursor must end exactly at `reply.length`, else `trailing`.

**`decodeName(buf, start)`**, the one name reader, used for owners and for NS targets:

- `L = buf[pos]`, with `pos < buf.length` checked first (`malformed`).
- `L === 0`: the root. The running wire length gains 1. The name ends; `next` is `pos + 1` if no pointer was followed.
- `(L & 0xc0) === 0xc0`: a pointer. `pos + 1 < buf.length` (`malformed`); `target = ((L & 0x3f) << 8) | buf[pos + 1]`
  must satisfy `12 <= target < pos` (strictly backward, never into the header), and the name may follow at most
  `NAME_POINTERS_MAX` (8) pointers, else `pointer`. `next` is `pos + 2` at the first pointer.
- `(L & 0xc0)` is `0x40` or `0x80`: an extended or reserved label type, `label`. A 64-byte label is `0x40` and lands
  here.
- Otherwise `L` is 1..63: `pos + 1 + L <= buf.length` (`malformed`), the running wire length gains `1 + L` and must stay
  at or below 255 counting the root, else `name-long` before the next byte is read.

Why both pointer rules: strictly backward stops a pointer naming itself or anything later, and the cap of 8 ends the
one loop strictly backward still allows, a name that passes a label and meets a later pointer back into its own bytes.
Real answers use one pointer per name (the owner points at offset 12).

**Comparing names** (RFC 4343): the same number of labels, each the same length, bytes equal after folding `A-Z` to
`a-z` only; every other byte compared exactly.

### 4.5 The verdict — `judgeZoneAnswer(query, reply, name)` and the refused ranges

For the question to a zone server (§4.7), after `readNameReply` succeeds:

1. **AA is 1** (`reply[2] & 0x04`), else `unreadable` / `not-authoritative`. A cache, an interceptor and a referral all
   land here.
2. RCODE 3 → **negative** / `nxdomain`.
3. RCODE 0 with no answer record → **negative** / `no-record` (the name exists without an `A`, or NODATA).
4. RCODE 0 with answers: every answer must be owned by exactly the asked name (`other-owner`), be TYPE `A` (`cname` for
   5, `type` otherwise), CLASS `IN` (`class`), RDLENGTH 4 (`malformed`), and hold a public address (`private-address`).
   All pass → **record** / `record`. One record failing makes the whole answer `unreadable`.

**`NAME_REFUSED_V4`**, named once (D3), as numeric tuples because L2 refuses the wildcard's text in the domain:

| Tuple | Range | Why |
| --- | --- | --- |
| `[0, 0, 0, 0, 8]` | 0.0.0.0/8 | unspecified |
| `[10, 0, 0, 0, 8]` | 10/8 | private: a split-horizon or captive resolver |
| `[100, 64, 0, 0, 10]` | 100.64.0.0/10 | carrier-grade NAT, and **MagicDNS's answer for his name** (the running log: his Mac's own resolver answers `100.81.28.106`) |
| `[127, 0, 0, 0, 8]` | 127/8 | loopback |
| `[169, 254, 0, 0, 16]` | 169.254/16 | link-local |
| `[172, 16, 0, 0, 12]` | 172.16/12 | private |
| `[192, 168, 0, 0, 16]` | 192.168/16 | private |
| `[224, 0, 0, 0, 3]` | 224/3 | multicast and reserved, 255.255.255.255 included |

`isPublicV4(octets)` is the only reader, a 32-bit mask comparison. The documentation ranges (192.0.2/24,
198.51.100/24, 203.0.113/24) are deliberately NOT refused: no real resolver answers them, and they are what the tests and
probes answer with, so no fixture names a real host. **The address is never compared with anything else, never stored
and never dialled** (O1: an ingress may not answer from the Mac, so a probe of it proves nothing).

### 4.6 Finding the zone servers — `findZoneServers`, without naming his name

1. Both resolvers in `NAME_SEARCH_RESOLVERS` are asked `NS ts.net`, RD 1, a fresh id each, at once.
2. A reply is readable when `readNameReply` succeeds, RCODE is 0 (AA is not required: it is a recursive answer), and
   every answer is NS/IN owned by `ts.net` whose target, decoded by `decodeName` from its rdata offset, ends exactly at
   the rdata's end and passes §4.2's name rule with at least 2 labels. The first readable reply in resolver order wins
   (1.1.1.1 first). None → `null`.
3. At most `NAME_SERVERS_MAX` (4) distinct targets, in answer order.
4. Each target is asked `A <target>`, RD 1, at the resolver whose reply won, all at once. A reply counts only with RCODE
   0 and `A`/`IN` answers owned by exactly that target (no CNAME is followed); the first public address is kept. A
   target with none is dropped.
5. Distinct addresses, port 53, at most 4, are the run's servers. None → `null`.

At most 6 packets and two 2 s deadlines in sequence. **No question in the search names his name or his tailnet**: the
two public resolvers learn that this Mac asked about `ts.net`'s servers. The result lives in the run's `cache`, so a
run searches once; a round in which every kept server was unreadable drops the cache and the next round searches again
(a renumbered server is found without a restart).

**A later sub-delegation.** At this head the record answers from `ts.net`'s own servers (the running log: the record
answered from `ns1.dnsimple.com` and `ns2.dnsimple-edge.net`, and a miss carries `ts.net`'s own SOA, so there is no
cut at the tailnet). If Tailscale ever delegates a tailnet, the zone servers answer a referral without AA, every round
reads `unreadable`, and §4.9's no-lock-out rule makes Pair available with its line. It is stated rather than solved.

### 4.7 The round and the confirm rule

**`askNameRound(deps, publicName, cache)`**, never rejecting:

1. §4.2's name rule and zone rule (`bad-name`, `outside-zone`), before anything is sent.
2. `deps.source.kind === 'refused'` → `unreadable` / `override-unusable`, nothing sent.
3. The servers: `fixed` → its list; `search` → `cache.servers ?? (cache.servers = await findZoneServers(deps))`; `null`
   → `unreadable` / `no-servers`.
4. Every server at once: a fresh `deps.id()`, `encodeNameQuery(id, name, 'A', false)`, `deps.exchange`, then
   `judgeZoneAnswer`; a `timeout` is `unreadable` / `timeout`, an `error` is `unreadable` / `socket`.
5. `roundVerdictOf(answers)`: **any negative → `no`** (its reason); else **any record → `yes`** (`record`); else
   `unreadable` (the first reason in server order). The anycast reason for "any negative wins": a new record can reach
   one node before another, so one server still saying NXDOMAIN means a phone may still be told NXDOMAIN.
6. A `catch` around the whole answers `unreadable` / `error`.

**`nextNameStreak(streak, verdict)`**, pure, the whole schedule rule (the host never spells it again):

| Verdict | Next streak | Confirmed | Gap to the next round |
| --- | --- | --- | --- |
| `yes` | `yes + 1`, `unreadable` 0, `opened` kept | when `yes + 1 >= 2` (`NAME_CONFIRM_YES_ROUNDS`) | `NAME_CHECK_AFTER_YES_MS`, 20 s |
| `no` | `yes` 0, `unreadable` 0, `opened` **false** | no | `NAME_CHECK_GAPS_MS[min(rounds - 1, 3)]` |
| `unreadable` | `yes` 0, `unreadable + 1`, `opened` true once `unreadable + 1 >= 3` | no | the same schedule |

`rounds` counts this round. So a run's gaps are 20, 30, 45, 60, 60… s, and 20 s after any yes. **Two `yes` rounds in a
row confirm**, and a `yes` then an `unreadable` then a `yes` does not.

### 4.8 The development override — `nameServersFrom`, and the Electron guard

- **A packaged build ignores `GMUX_POCKET_NAME_SERVERS`** and answers `{ kind: 'search' }`, as `resolveTailscale`
  ignores `GMUX_TAILSCALE_BIN` (`src/main/machines/tailscale.ts:114-121`).
- In a development build, unset or blank → `search`, which is the product (his `npm run dev` checklist asks the real
  servers for his real name, and that is his run of the product).
- Set → split on `,`; 1 to 4 entries; each, trimmed, must match `^127\.0\.0\.1:([1-9][0-9]{0,4})$` with the port at most
  65535. All pass → `{ kind: 'fixed', servers }`, and the search is skipped. **Anything else refuses the whole value:
  `{ kind: 'refused' }`, every round `unreadable` / `override-unusable`, nothing sent, and it never falls back to the
  search** (D7). A probe with a wrong value then waits out three rounds and shows the unreadable line; it never asks
  real DNS.
- The host reads `packaged` as `funnel.ts:199-205` does (`app.isPackaged`, false outside Electron) and passes it in:
  `public-name.ts` does not import `electron`.

### 4.9 When it runs — `PocketHost` in `src/main/pocket/ipc.ts` (builder `host`)

**New state.** `private readonly names: NameCheckDeps` (from `deps.names ?? defaultNameCheckDeps({ packaged, env:
process.env })` in the constructor), `private nameRun: NameRun | null = null`, and `private nameRuns = 0`:

```ts
interface NameRun {
  readonly n: number;                       // this run's number
  readonly target: PocketNameConfirmed;     // tailnet, publicName, publicPort, as fields() said at its start
  mode: 'reask' | 'checking';
  streak: NameStreak;
  readonly cache: NameRoundCache;
  cancel: (() => void) | null;              // the armed timer
  inFlight: boolean;
}
```

`PocketHostDeps` gains `names?: NameCheckDeps`, documented **TESTS ONLY** (D4): not `push-seam.ts`, which uses the
shipping deps through the override, and not `capabilities.ts`.

**The methods, and exactly where each is called.**

1. **`beginNameCheck(why: 'start' | 'restart')`**, called from ONE place: the end of `openNow`, after step 13's
   `await this.closeNowUnlessConfirmed()` (`ipc.ts:913`), as `if (this.published()) this.beginNameCheck(why);`, before
   the existing `this.changed()`. `openNow` gains a second parameter `why: 'start' | 'restart' = 'start'`, and
   `recoverNow` (`:975`) passes `'restart'`. It is not called when the sheet opens, while the door is off, from
   `status()`, from a read channel, or from `openAtLaunch` before its `start()`. Its body:
   - `this.stopNameCheck()` (defensive), then `fields = this.fields()` and `target = nameTargetOf(fields)`;
   - `counts = nameConfirmedCounts(store.nameConfirmed, fields)` (§4.10);
   - `counts && why === 'restart'` → return: a restart after an unexpected exit is not a switch-on and asks nothing;
   - otherwise a new run numbered `++this.nameRuns`, mode `reask` when `counts` (**the switch-on round**: every counted
     start that is not a restart, so a launch and every Allow) and `checking` otherwise, streak `NAME_STREAK_START`,
     an empty cache; one log line (§4.14); then `this.nameRoundNow(run)` at once.
2. **`stopNameCheck()`**: `const run = this.nameRun; this.nameRun = null; run?.cancel?.();`. Called as the FIRST line
   of `unpublish()` (`:1046`, so `closeNow` and `recoverNow` both stop it) and as the FIRST line of
   `unexpectedlyDown()` (`:934`, above its `if (funnelShutdownStarted() …)`, so the two lines
   `if (this.readStore()?.enabled !== true) return;` and `this.setFunnel('restarting');` stay adjacent for the
   `ablation:p313` arm at `build/ablation-p313.mjs:786`). A round in flight is not cancelled; its answer is dropped by
   the guard below. **This is the pause**: the restart's counted start calls `beginNameCheck('restart')`.
3. **`nameRoundNow(run)`**, the launcher, returning `void`:
   - `if (this.nameRun !== run || run.inFlight) return;`
   - `if (funnelShutdownStarted() || pocketShutdownStarted() || !this.published()) return;` (no timer is re-armed: a
     paused run stays paused until the next counted start replaces it);
   - `run.cancel = null; run.inFlight = true;`, then `askNameRound(this.names, run.target.publicName, run.cache)`.
   - **THE WRITE GUARD**, synchronous, with nothing awaited between it and the write: when the round answers,
     `run.inFlight = false`, then the answer is DROPPED unless `this.nameRun === run`, the quit has not begun
     (`funnelShutdownStarted()`, `pocketShutdownStarted()`), `this.published()`, and
     `nameConfirmedCounts(run.target, this.fields())` (the one predicate, read here as "the run's tailnet, name and port
     are still the door's"). An answer that lands after an off, a Remove, a quit, a restart or a moved field writes
     nothing and arms nothing.
   - **Applying it.** Mode `reask`: `no` → `forgetNameConfirmed()`, mode becomes `checking`, streak
     `nextNameStreak(NAME_STREAK_START, 'no')`, and the timer is armed at its gap; `yes` or `unreadable` → the run ends
     (`this.nameRun = null`), the confirmation kept. Mode `checking`: `step = nextNameStreak(run.streak, verdict)`;
     `confirmed` → `rememberNameConfirmed(run.target)` and the run ends; otherwise the timer is armed at `step.gapMs`.
   - **The timer**: `run.cancel = armFunnelRestart(this.names, gapMs, () => { run.cancel = null; this.nameRoundNow(run); })`.
     `armFunnelRestart`'s first parameter becomes `Pick<FunnelDeps, 'sleep'>` (`funnel.ts:1340`, a type and a doc line,
     nothing else), so the name timer sits in the same quit-cleared set and sleeps on the names deps' own clock. The
     gap is measured from the END of the round. **Nothing in the name check reads a clock** (`Date.now`, `now()`,
     `performance`): the sleeps are `setTimeout`, which is monotonic, so a wall clock moved a day either way changes no
     gap and causes no burst (D4).
   - `this.changed()` only when `nameCheckNow()` or `pairable()` differs from before the round.
4. **`nameCheckSoon()`**, the wake: called in `wakeCheck()` (`:992`) straight after its first `return` guard. If a run
   is in mode `checking` with no round in flight, its timer is cancelled and `nameRoundNow(run)` runs now. A Mac that
   slept through a gap does not wait out the rest of it, because `setTimeout` does not count the sleep.
5. **`nameCheckNow(): PocketNameCheck`**: `'confirmed'` when `nameConfirmedCounts(store.nameConfirmed, fields())`;
   else `'none'` with no run; else `run.streak.opened ? 'unreadable' : 'checking'`.
6. **`pairable(): boolean`** — THE ONE PREDICATE (D6): `pocketDoorStatus().listening && this.published()` and
   `nameCheckNow()` is `'confirmed'` or `'unreadable'`. `status()` answers `pairable: this.pairable()` and
   `nameCheck: this.nameCheckNow()`; `beginPairing` asks it; the sheet reads the field and never works it out.
7. **`forgetNameConfirmed()` / `rememberNameConfirmed(target)`**: write `{ ...store, nameConfirmed: null | target }`
   with `writePocketStore` and set `this.store = next` whatever the seal answered, which is `dropPushToken`'s precedent
   (`:1482-1493`): a confirmation the seal cannot keep still holds for this run, so a refusing keystore never locks
   anyone out, and the next launch asks again.

**The no-lock-out rule.** `NAME_UNREADABLE_ROUNDS` (3) unreadable rounds in a row set `opened`, which makes `pairable`
true with the unreadable line (§4.12): Phase 330's behaviour, on a network that blocks outbound port 53, an intercepting
captive portal, a referral, or a broken override. Checking goes on at 60 s; a later `no` clears `opened` and takes Pair
away (a code already showing runs to its deadline: nothing in the name check opens, shuts or shortens a window), and
two `yes` rounds confirm.

**What a run costs.** At most 6 search packets once per run, then one packet per kept server per round: about 4 a
minute while a name that never publishes is checked, until the door goes off.

### 4.10 What is remembered — `src/main/pocket/pairing.ts` (builder `host`)

1. `export interface PocketNameConfirmed { readonly tailnet: string; readonly publicName: string; readonly publicPort: number }`,
   and `PocketStore` gains `readonly nameConfirmed: PocketNameConfirmed | null`, documented as an OBSERVATION beside
   `tailnetFacts`: writing it confirms nothing, it decides only whether a code may show, and the phone must still be
   matched and allowed on the Mac.
2. `readPocketStore` reads it through `nameConfirmedOf(raw)`: two non-empty strings and `isPublicPort(publicPort)`,
   else `null`, meaning ask again. A store written before this phase reads `null`.
3. **THE ONE PREDICATE**, `export function nameConfirmedCounts(confirmed: PocketNameConfirmed | null, fields: PocketExecutionFields): boolean`:
   non-null and equal to `fields`' tailnet, public name and public port. A moved field stops it counting without anyone
   clearing it. `export function nameTargetOf(fields): PocketNameConfirmed` is its partner. Nothing else compares them.
4. **Every event that clears it**, each a write of `nameConfirmed: null`:
   - **the off write** (`ipc.ts:1181-1183`): `{ ...store, enabled: false, bindAtLaunch: false, nameConfirmed: null }`,
     and its condition widens to `store.enabled || store.bindAtLaunch || store.nameConfirmed !== null`. This is "starts
     again if they clear the setting";
   - **a read that asks approval**: in `sweepAndRead`, straight after `this.read = read;` (`:732`) and before
     `const store = this.readStore();` (`:733`), `if (read.asksApproval) this.forgetNameConfirmed();`;
   - **a start that waited on approval**: the first line of the `onApproval` callback (`:868`);
   - **a switch-on round that answers `no`** (§4.9 item 3).
   A withdrawal (`forgetDoor`), a Remove and an alerts change do NOT clear it: the name did not move, and the next Allow
   re-asks once.
5. `identityNow`'s store literal (`:462-471`) carries `nameConfirmed: store?.nameConfirmed ?? null`.
6. **It is not hashed.** `NORMALIZE` (`:286`), `PocketExecutionFields` and `sha256-pocket-exec-v3` (`:322`) do not move,
   so his confirmed door stays confirmed. The servers asked are not execution fields either: nothing starts because of
   them (refusal 8), no setting names them, and they decide nothing about who the door answers. Hashing them would
   make him confirm again whenever dnsimple renumbers.

### 4.11 The contract — `src/shared/ipc/pocket.ts` (builder `host`)

1. `export type PocketNameCheck = 'none' | 'checking' | 'confirmed' | 'unreadable';` beside `PocketFunnelView`.
2. `PocketStatus` gains, after `confirmable`:
   - `nameCheck: PocketNameCheck`: whether the Mac's public name answers from the internet, as Tortie last read it;
   - `pairable: boolean`: MAIN'S ONE PREDICATE, the door listening and the name `confirmed` or `unreadable`; the sheet
     draws Pair on it and never spells it again, as with `confirmable`.
3. `PocketFunnelView.publishedAt` (`:379-384`) is removed, with its doc comment.
4. After `pocketFunnelSentence` (`:672-675`):

   ```ts
   export const POCKET_NAME_SENTENCES: Readonly<Record<'checking' | 'unreadable', string>> = {
     checking: 'Pair opens once your Mac’s name is on the internet, which can take a few minutes.',
     unreadable: 'Tortie could not check your Mac’s name, so a first scan may fail.'
   };
   ```

   Both apostrophes are U+2019, the house's, as `CODE_FIRST_NAME` writes it.
5. **`beginPairing`** (`ipc.ts:1282`), between the `NOT_PUBLISHED` refusal and `stillPublished()`:
   `if (!this.pairable()) throw gmuxError('INVALID_INPUT', `${POCKET_NAME_SENTENCES.checking} No code was shown.`);`,
   the shape of the restart refusal at `:1292`. It spawns nothing and opens no window. The channel's doc comment gains
   "and the Mac's name answers".
6. No channel, no event and no preload change (`src/preload/pocket.ts` is untouched; `export * from './pocket'` at
   `src/shared/ipc/index.ts:236` carries the new names).

### 4.12 The sheet — `src/renderer/settings/PhoneSection.tsx` (builder `host`)

1. `PairingStage` gains `'naming'`. `pairingStage`: `match` and `showing` as today; `status === null` → `waiting`;
   `off` → `start`; not `listening` → `waiting`; listening → `status.pairable ? 'ready' : 'naming'`.
2. **The `naming` face**, like `waiting` (`:390-397`): `data-phone-stage="naming"`, the notice if any, and one
   `phone-line` with `POCKET_NAME_SENTENCES.checking`. No button.
3. **The `ready` face** gains, above the Pair button and only when `status.nameCheck === 'unreadable'`, one
   `phone-line` with `data-phone-name-unreadable` and `POCKET_NAME_SENTENCES.unreadable`. That is the only place the
   sheet reads `nameCheck`.
4. `pairAfterAllowNext` (`:232-242`): `if (status.pairable) return { phase: 'no', pair: true };` in place of the
   `listening` line; a door that listens and is not pairable keeps the wish (`on`). The other lines stand.
5. `onPair` (`:804-814`): `status?.pairable === true` → `beginPairing()`; otherwise the carried press as today.
6. `expiredNotice(shownUnreadable: boolean, presented: boolean)`: `CODE_FIRST_NAME` follows `CODE_EXPIRED` only when no
   phone presented AND the code was shown while `nameCheck` read `unreadable`. The section records that in a ref when
   `beginPairing` answers, from the latest status. `FIRST_NAME_MS` (`:100`) and its doc lines are removed.
   `CODE_FIRST_NAME`'s text does not move.
7. The header comment (`:1-30`) names the `naming` face in one line. **Just enough words**: the resting face gains one
   line, and only while the name is checked.

### 4.13 The push seam and the four probes that pair (the entry's omission, §3 rows 3 and 4)

**The push seam** (`src/main/harness/push-seam.ts`, builder `host`):
- `export function nameStandInOnly(): boolean`: `nameServersFrom({ packaged, env: process.env }).kind === 'fixed'`,
  with `packaged` read as `standInOnly` reads it (a throw is `true`, so it refuses).
- `openDoorForPairing` refuses, before `setDoor`, unless `standInOnly() && nameStandInOnly()`, printing
  `${PUSH_SEAM_TAG} pairing needs the name stand-in (GMUX_POCKET_NAME_SERVERS), so no phone was paired`. After it reads
  `listening`, it polls `host.status().pairable` every 250 ms for up to 90 s, and on a timeout prints
  `${PUSH_SEAM_TAG} the Mac’s name never answered (<nameCheck>), so no phone was paired` and answers false.

**The probes** (builder `proof`): `build/probe-p313.mjs`, `build/probe-p314.mjs`, `build/p316/probe-p316.mjs` and
`build/p330/probe-p330.mjs` each:
1. start `makeDnsStandin({ name: <the Tailscale stand-in's name>, mode: 'record' })` from `build/p332/dns-standin.mjs`
   in the world setup, and `await dns.close()` in the `finally`;
2. pass `GMUX_POCKET_NAME_SERVERS: dns.servers` in every launch's env (a parent build ignores it);
3. extend their preflight: the value names `127.0.0.1` only, and `dns.preflight()` answers;
4. wait, wherever they waited for `state === 'listening'` before a `beginPairing` or the sheet's code, for
   `s.pairable === true || (s.pairable === undefined && s.state === 'listening')`, with 45 s more on the wait (the
   parent answers no `pairable`);
5. at HEAD, add one grader clause: every question in `dns.log()` was an `A` question, RD 0, for the stand-in's name.

`probe:p330`'s A3 (`codeShown`, 20 s at `:1347`) waits 60 s. `probe:p313`'s K1 (`:733-746`) and `probe:p316`'s
`confirmListening` (`:405-432`) wait for `pairable`. Each grader self-test still passes.

### 4.14 What is logged (D5)

`public-name.ts` logs nothing. The host logs, through `pocketLog`, only fixed words, a verdict and a reason word:
`checking the Mac’s name before pairing` and `asking once whether the Mac’s name still answers` at a run's start;
`the Mac’s name check read ${verdict}: ${reason}` on the first round of a run and whenever the verdict differs from
the previous round's (so a name that never publishes costs one line, not one a minute); `the Mac’s name answers, so
pairing is open` at a confirmation; `the Mac’s name could not be checked, so pairing is open` when `opened` turns true.
No log line names the public name, the tailnet, a server, an answered address or a packet.

### 4.15 What leaves the Mac, and to whom

- To 1.1.1.1 and 8.8.8.8, once per run: `NS ts.net` and `A` for up to four NS host names. They learn that this Mac asked
  about Tailscale's zone.
- To `ts.net`'s own servers (dnsimple's at this head), once a minute at most while checking: one non-recursive `A`
  question for his Mac's public name, which those servers already publish. An on-path observer already sees the name in
  any phone's lookup; nothing new is exposed to it.
- Nothing about the phone, the tailnet key (there is none), the door's key or the port is sent. Nothing is sent while
  the door is off.

---

## 5. Side by side with today (`a8e06fe7`), which the verifier re-measures

| Scenario | Today | After this phase | Reading |
| --- | --- | --- | --- |
| Never turns the door on | nothing | nothing: no timer, socket or question (H0) | same |
| First pairing on a tailnet whose name is not yet public (his 8 minutes, M5) | code at once; the phone caches the miss for 300 s (O4); the window shuts; "Press Pair again" | the checking line; the code shows by itself once the name answers twice; the first scan works (P1 vs H1) | better |
| Relaunch the same day (the record outlived the funnel by about 5.5 hours) | Pair at once | Pair at once, one round in the background (H4) | same |
| Relaunch the next morning, the record gone (O2) | Pair at once; a scan fails until the name returns | Pair at once for one round (under 2 s), then the checking line until the name returns | same or better |
| Door switched off, then on, while the name is still public | Pair at once, scan works | the checking line about 20 s, then Pair (two rounds) | **slower by about 20 s, by his request**: "starts again if they clear the setting". Keeping the confirmation across an off would remove the 20 s and contradict his words, so it is not removed. |
| A network that blocks outbound port 53, with no confirmation kept | Pair at once | Pair after three unreadable rounds, about 55 s, with the unreadable line | **slower by about 55 s** on that network. The three rounds are the entry's guard against a transient failure reopening the very failure this phase fixes (a first round lost to a Wi-Fi hiccup on a fresh tailnet would show the code early). Named, measured in H6, and put before him by the main session rather than removed here. |
| The name never publishes (Funnel broken) | codes shown, every scan fails | the checking line, no code | neither pairs; better words |

**His ruling, 2026-09-30: "Keep it, re-test and land".** The reverify's second `needs_work` put the rows above that
are slower than today to him, with numbers, and he accepted the wait as the cost of a first scan that works. The table
above is the spec step's; the fix round changed three of its numbers (§As built — 332, the fix round), and these are
the rows as ruled. They are no longer regressions to remove. They are the accepted behaviour, and the reverify
measures that each stays within its number:

| Row | Today (`a8e06fe7`) | Accepted | The number the reverify holds it to |
| --- | --- | --- | --- |
| Pair withheld while the name is checked (a name not yet public) | code at once, and the first scan fails | the checking line, no Pair, until a round answers the record | the code shows by itself within one round of the record answering |
| A network that blocks DNS, nothing remembered | Pair at once | Pair with the warning line after the first round | about 2 s with loopback servers, about 2 to 4 s packaged (the search's 2 s deadline, plus the zone's when the search answers) |
| A public name not yet remembered | Pair at once | the checking line for one round trip, then Pair | about 0.16 s on a real network (search 91 ms and question 71 ms, measured once by the reverify) |
| The door switched off and on | Pair at once | a re-check before Pair | at most one round; as built the off keeps the name, so Pair shows at once and one question is asked behind it |
| A network that answers every `ts.net` question with an authoritative "no such name" (the round after this ruling, §As built — 332, after his ruling) | Pair at once | the checking line, then Pair with the warning line after the 18th round of `no` | about 935 s (15½ minutes) from the first round, and a later `yes` confirms as on any other network |

---

## 6. Builders, disjoint files, and who owns what is shared

Three builders. Nothing outside a builder's list may be edited by that builder. Where one needs another's interface, it
codes against §4.1's exact names and the integrator reconciles.

| Builder | Owns |
| --- | --- |
| **names** — the packet half | `src/main/pocket/public-name.ts` (new); `src/main/pocket/__tests__/public-name.test.ts` (new); `src/main/pocket/__tests__/dns-fixtures.ts` (new) |
| **host** — the wiring, the store, the contract, the sheet | `src/main/pocket/ipc.ts`; `src/main/pocket/pairing.ts`; `src/main/pocket/funnel.ts` (`armFunnelRestart`'s parameter type and its doc comment ONLY); `src/shared/ipc/pocket.ts`; `src/renderer/settings/PhoneSection.tsx`; `src/main/harness/push-seam.ts`; `src/main/pocket/__tests__/{ipc,switch-queue,pairing,funnel}.test.ts`; `src/main/harness/__tests__/push-seam.test.ts`; `src/renderer/settings/__tests__/p316-phone-section.test.tsx` |
| **proof** — the gates, the probes, the paper | `build/p332/probe-p332.mjs` (new); `build/p332/dns-standin.mjs` (new); `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/probe-p313.mjs`; `build/probe-p314.mjs`; `build/p316/probe-p316.mjs`; `build/p330/probe-p330.mjs`; `build/p330/CHECKLIST.md`; `build/assert-electron-teardown.mjs`; `build/verification-checks.mjs`; `package.json`; `CLAUDE.md`; `CHANGELOG.md`; `DEVELOPMENT.md` |

**Shared files, and their one owner.**
- `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `CLAUDE.md`, `CHANGELOG.md`
  and `DEVELOPMENT.md` belong to **proof**. `names` and `host` write their needs in their hand-off.
- `src/shared/ipc/pocket.ts` belongs to **host**.
- `docs/audits/contract-baseline.txt` belongs to **the integrator**, who regenerates it once every builder is in.
- `build/p332/SPEC.md` is this file; the integrator appends "§As built — 332".
- `docs/BACKLOG.md` belongs to no builder; the main session writes the running log.
- `capabilities.ts`, `src/preload/pocket.ts`, `ios/**`, `menu.ts` and every other file: nobody, this phase.

### 6.1 Builder `names`

0. **Land first**: the §4.1 exports with their types, and `dns-fixtures.ts`, because `host` imports both.
1. Build `public-name.ts` to §4.2-§4.8 and §9. Imports: `node:dgram`, `node:crypto`, `node:net`, nothing else.
2. `public-name.test.ts`, run rather than read, against an in-process loopback stand-in of the test's own
   (`createSocket` bound to `127.0.0.1:0`, closed in `afterEach`), with `dns.lookup`, `dns.promises.lookup` and every
   `dns.resolve*` spied to FAIL the test if called:
   - the bytes: the two worked examples of §4.2 byte for byte; every name the rule refuses (`bad-name`, `outside-zone`);
   - **lies**: an authoritative `A` of `100.81.28.106`, `10.0.0.1`, `127.0.0.1`, `169.254.1.1` → `unreadable` /
     `private-address`; a public address without AA → `not-authoritative`;
   - **another name**: the question not echoed, a case-changed question, an answer owned by another name, a CNAME → each
     `unreadable` with its word;
   - **spoofing**: a reply with a wrong id, and a reply sent from ANOTHER socket on another port, each ending at the
     deadline as `timeout`, with the id-matching reply arriving after the deadline ignored;
   - **silence**: timeout, SERVFAIL, REFUSED, TC → `timeout`, `servfail`, `refused`, `truncated`;
   - **malformed**: a pointer loop, a pointer to itself, a pointer forward, a pointer into the header, a pointer past the
     end, nine pointers, a 64-byte label, a 256-byte name, counts past the packet, 33 records, a trailing byte, a
     12-byte header alone, a 513-byte and a 65,507-byte datagram (both dropped, so `timeout`), a QR-0 datagram, each
     `unreadable` within the deadline with no throw leaving the module;
   - **the verdicts**: NXDOMAIN with AA → `negative` / `nxdomain`; NOERROR, AA, no answer → `no-record`; a compressed
     honest `A` at `203.0.113.10` → `record`;
   - **flapping**, by `roundVerdictOf` and `nextNameStreak`: a server alternating record and NXDOMAIN never gives two
     `yes` rounds; two servers that disagree in one round read `no`; yes, unreadable, yes does not confirm; three
     unreadables open and a `no` closes;
   - **the search**, with deps whose `exchange` answers the two resolver addresses from `dns-fixtures.ts` and opens no
     socket: NS answers with a CNAME, a bad target, five targets (four kept), a private NS address (dropped), both
     resolvers silent (`null`), 1.1.1.1 silent and 8.8.8.8 answering (8.8.8.8's servers kept); a round whose every
     server is unreadable drops the cache and the next round searches again;
   - **the override**: unset, blank, one and four loopback entries, five entries, `10.0.0.1:53`, `localhost:53`,
     `127.0.0.1:0`, `127.0.0.1:65536`, `127.0.0.2:53`, and a packaged build with each (always `search`);
   - **D8**: `exchange` to `203.0.113.10:53` outside Electron answers `error` with `createSocket` spied at zero calls;
   - the gaps: `nextNameStreak` over every row of §4.7's table.
3. **Runs, and nothing else:** `npm run -s typecheck`; `npx vitest run src/main/pocket/__tests__/public-name.test.ts`;
   `node build/conformance-pocket.mjs` read only, once `proof` has landed D1-D3, D7, D8. No Electron; no socket to
   anything but `127.0.0.1`.

### 6.2 Builder `host`

1. §4.9 in `ipc.ts`, §4.10 in `pairing.ts`, §4.11 in the contract, §4.12 in the sheet, §4.13's seam half, and the
   one-line `funnel.ts` change. Keep every `from:` string `build/ablation-p313.mjs` names in `ipc.ts` byte for byte
   (listed by `awk '/file: IPC,/{getline a; print a}' build/ablation-p313.mjs`); where one must move, say so in the
   hand-off and `proof` re-aims the arm.
2. **Every existing test that constructs a `PocketHost` passes `names`** from `fakeNameDeps` (`ipc.test.ts:393`,
   `switch-queue.test.ts:301`), answering the record, so every pairing test still pairs: `switch-queue.test.ts` with a
   `sleep` that resolves at once, `ipc.test.ts` with sleeps released by hand.
3. **Tests, in `ipc.test.ts`** (the attack's host half):
   - H-shaped rows: the checking run starts at the counted start and nowhere else (the sheet's status read, a launch
     with the door off, `pocket:pairingState`: zero `exchange` calls and zero timers);
   - `beginPairing` refused with `${POCKET_NAME_SENTENCES.checking} No code was shown.` and `pairing.view().state` still
     `idle`; allowed after two `yes`; allowed with the unreadable line after three unreadables; refused again after a
     later `no`;
   - **the door toggled mid-check**: an off with a round held open writes nothing when the answer is released and
     asks nothing more across every sleep; on, off, on inside one gap leaves one armed timer and exactly one round per
     gap; a Remove mid-round drops the answer; `beginFunnelShutdown()` with a timer armed fires nothing and a round held
     across it writes nothing;
   - **a clock that jumps**: `Date.now` moved a day forward and back mid-check (`vi.spyOn`) changes no sleep's
     duration and causes no extra round;
   - the wake brings the round forward once; a restart pauses (no round while restarting) and resumes at its counted
     start with no re-ask when confirmed;
   - **the switch-on round**: with a confirmation kept, `pairable` is true before the held answer, exactly one round
     runs, `no` forgets it and starts checking at 20 s; `yes` and `unreadable` keep it and arm nothing;
   - the store: written at two `yes` for exactly the run's target; cleared by the off write, a read with
     `asksApproval`, `onApproval`, and a re-ask `no`; not cleared by `forgetDoor`, Remove or the alerts; a moved
     tailnet, name or port reads `checking`; a refusing seal still holds the confirmation for the run;
   - `status()`: `pairable === (listening && (confirmed || unreadable))` in every row; `funnel` has no `publishedAt`;
   - the confirm hash is equal with `nameConfirmed` null and set.
4. `pairing.test.ts`: `nameConfirmed` round-trips; every invalid shape reads `null`; a store written before this phase
   reads `null`; `nameConfirmedCounts` over the three fields. `funnel.test.ts`: `armFunnelRestart` over a bare
   `{ sleep }`. `push-seam.test.ts`: `nameStandInOnly` unset, `10.0.0.1:53`, `127.0.0.1:5353`, and packaged. The sheet
   test: the `naming` face (the line, no `pair` button), `ready` with and without the unreadable line,
   `pairAfterAllowNext` on `pairable`, `onPair`'s branch, `expiredNotice`'s two arms, and no `FIRST_NAME_MS`.
5. **Runs:** `typecheck`; `npx vitest run src/main/pocket src/main/harness/__tests__/push-seam.test.ts
   src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `node build/conformance-pocket.mjs` read only. No
   Electron.

### 6.3 Builder `proof`

1. **`build/p332/dns-standin.mjs`**, the loopback zone server and the phone's resolver model, run inside the caller's
   process, with an encoder of its OWN (it imports nothing from `src/`):
   - `makeDnsStandin({ name, mode = 'record', address = '203.0.113.10' })` binds `udp4` `127.0.0.1:0` and answers
     `{ servers: '127.0.0.1:<port>', port, setMode(mode, options), release(), log(), preflight(), close() }`;
   - modes: `record` (AA, the question echoed, one `A` whose owner is the pointer `c0 0c`, TTL 60); `nx` (AA,
     NXDOMAIN, one SOA owned by `ts.net` as a pointer into the question, minimum 300); `{ nxUntil: epochMs }`; `silent`;
     `hold` (answers each held query with the then-current mode on `release()`); `servfail`; `refused`;
   - `log()` rows are `{ at, id, rd, qname, qtype, answered }`;
   - `makeResolverModel({ zoneAnswers: (at) => boolean, negativeTtlMs: 300_000 })` with `lookup(name)` answering
     `answer` or `miss` and caching a miss for 300 s, the RFC 2308 behaviour O4 measured;
   - `--self-test`: every mode answered and read back by a minimal reader of its own, on loopback, closed in a `finally`.
2. **`build/p332/probe-p332.mjs`** (§8.3), through `build/electron-run.mjs`, with `--grader-self-test`.
3. **§4.13's probe half** for `probe:p313`, `probe:p314`, `probe:p316` and `probe:p330`.
4. **`conformance:pocket`**: D1-D8 and T1's widening (§7.1); the header's rule count and its Phase 332 paragraph.
5. **`ablation:p313`**: the arms of §7.2, each newly red on its own rule; re-aim any arm `host` reports moved.
6. **The obligations**: `HELPER_USER_FLOOR` 154 → 155 (`build/assert-electron-teardown.mjs:337`), and the commit body
   names `build/p332/probe-p332.mjs`; `"probe:p332": "node build/p332/probe-p332.mjs"` in `package.json`, classified
   `electron('probe:p332')` in `build/verification-checks.mjs` with a comment in the house shape.
7. **The paper** (§7.3, §7.4): `CLAUDE.md`, `CHANGELOG.md`, `DEVELOPMENT.md`, `build/p330/CHECKLIST.md`.
8. **Runs:** `node build/p332/dns-standin.mjs --self-test`; `node build/p332/probe-p332.mjs --grader-self-test`; the
   grader self-tests of the four re-pointed probes; `node --check` over every script edited;
   `node build/assert-electron-teardown.mjs`; `node build/assert-background-teardown.mjs`;
   `node build/verification-checks.mjs`; `node build/conformance-pocket.mjs`; and `npm run -s ablation:p313` once
   `names` and `host` are in. No Electron.

### 6.4 The integrator

Reconcile the three against §4.1's names; regenerate the contract (`node build/contract-inventory.mjs --out
docs/audits/contract-baseline.txt`) and confirm it moved exactly `[env.names] count=115` → `116` and one added line,
`GMUX_POCKET_NAME_SERVERS`; run §8.1's integrator gates; append "§As built — 332" with every file, decision and
command.

---

## 7. The gates, clause by clause

### 7.1 `conformance:pocket` (builder `proof`)

Each new rule fails as `[p313 D<n>]`, and a missing `public-name.ts` fails every D rule by name, as the file's own
rule for a missing module says.

- **D1.** Across the production files of `src/` (`__tests__/` excluded, where the stand-ins bind and the spies
  watch), `node:dgram` is imported by `src/main/pocket/public-name.ts` alone; no production file under
  `src/main/pocket/` names `node:dns`, `dns`, `dns/promises` or `node:dns/promises`; `public-name.ts` imports
  `node:dgram`, `node:crypto` and `node:net` and nothing else (no `electron`, no logger, no `node:fs`, no relative or
  alias path); and every `createSocket(` in it passes a `lookup` naming a function declared in the same file.
- **D2.** The question to a zone server is built with recursion `false`, and `true` appears only in the search's two
  questions to `NAME_SEARCH_RESOLVERS`; the id comes from `node:crypto` and `Math.random` is nowhere in the file; every
  `.send(` passes exactly the buffer and a callback and sits inside a `connect(` callback; the reply-size cap is compared
  before `readNameReply` is called; a `record` requires the AA bit and the byte-for-byte question comparison
  (`.equals(`), each read in `judgeZoneAnswer`/`readNameReply`; a loopback server is bound to the literal
  `127.0.0.1`; and the message handler compares `rinfo.address` and `rinfo.port` with the server's.
- **D3.** `NAME_REFUSED_V4` is declared once, in `public-name.ts`, holds the tuple `[100, 64, 0, 0, 10]` and the seven
  others of §4.5, and `isPublicV4` is its only reader; no other file under `src/main/pocket/` spells `100.64` or any
  of the eight ranges.
- **D4.** In `ipc.ts`: `beginNameCheck(` is called exactly once, in `openNow`, after its `closeNowUnlessConfirmed()`;
  `stopNameCheck()` is the first statement of `unpublish` and of `unexpectedlyDown`; `status`, `nameCheckNow`,
  `pairable`, the `pocket:status` and `pocket:pairingState` handlers and `openAtLaunch` name none of `beginNameCheck`,
  `nameRoundNow`, `askNameRound`, `armFunnelRestart` or `exchange`; the name timer is armed only through
  `armFunnelRestart`; no method whose name contains `Name` (`beginNameCheck`, `nameRoundNow`, `nameCheckSoon`,
  `nameCheckNow`, `pairable`) nor `nextNameStreak` names `Date.now`, `now(`, `performance` or `new Date`; and
  `names:` is handed to `PocketHost` only in files under `__tests__/`.
- **D5.** `public-name.ts` names no log call; in `ipc.ts`, every log call inside a method whose name contains `Name`
  interpolates only identifiers named `verdict` or `reason` and never names `publicName`, `target`, `address`,
  `servers`, `tailnet` or `bytes`.
- **D6.** `pairable()` is one method of `PocketHost`; `status()` answers `pairable: this.pairable()`; `beginPairing`
  calls `this.pairable()` before `stillPublished()`; `PhoneSection.tsx` reads `.pairable` in `pairingStage`,
  `pairAfterAllowNext` and `onPair`, and compares `nameCheck` only with `'unreadable'`.
- **D7.** `GMUX_POCKET_NAME_SERVERS` is read in `nameServersFrom` alone; the function answers `search` when
  `packaged`; every entry is matched against a pattern anchored on `127\.0\.0\.1:`; a refused value answers
  `{ kind: 'refused' }`, and no path from `refused` reaches `findZoneServers` (the round returns `override-unusable`
  before the search is named).
- **D8.** The shipping `exchange` answers `error` for a server that is not `127.0.0.1` unless
  `process.versions.electron` is a string, and that check precedes its `createSocket(`.
- **T1, widened.** The file set gains `p332` (`/pocket|p313|p330|p332/i`), and `bind` joins the host calls, with an
  `address:` property of an object literal passed to `bind(` read as a host position. So the DNS stand-in and the probe
  are held to loopback.

### 7.2 `ablation:p313` (builder `proof`)

At least one arm per new rule, each NEWLY red on its own rule in the clone, the tree unmoved by sha256:

| Arm | Rule | The break |
| --- | --- | --- |
| `D1a` | D1 | `public-name.ts` gains `import { lookup } from 'node:dns';` |
| `D1b` | D1 | `ipc.ts` gains `import 'node:dgram';` |
| `D1c` | D1 | the `lookup` option removed from `createSocket` |
| `D2a` | D2 | the zone question's recursion `false` → `true` |
| `D2b` | D2 | the id from `Math.random` |
| `D2c` | D2 | `send` given the port and the address |
| `D2d` | D2 | the AA check removed from `judgeZoneAnswer` |
| `D2e` | D2 | the question comparison removed |
| `D3a` | D3 | `[100, 64, 0, 0, 10]` removed |
| `D3b` | D3 | `ipc.ts` spells `100.64` in a second list |
| `D4a` | D4 | `status()` calls `this.beginNameCheck('start')` |
| `D4b` | D4 | `stopNameCheck()` removed from `unpublish` |
| `D4c` | D4 | the timer armed with `setTimeout` |
| `D4d` | D4 | `nameRoundNow` reads `Date.now()` |
| `D4e` | D4 | `capabilities.ts` passes `names:` |
| `D5a` | D5 | a name-check log line interpolates `run.target.publicName` |
| `D6a` | D6 | `beginPairing` asks `nameCheckNow() === 'confirmed'` instead of `pairable()` |
| `D6b` | D6 | `pairingStage` decides from `status.nameCheck` |
| `D7a` | D7 | the packaged branch removed |
| `D7b` | D7 | a refused override falls back to `{ kind: 'search' }` |
| `D8a` | D8 | the Electron check removed |
| `T1c` | T1 | `dns-standin.mjs` binds `10.0.0.1` |

### 7.3 `gate:contract`

`[env.names] count=115` → `count=116`, and `GMUX_POCKET_NAME_SERVERS` added in its sorted place. Nothing else moves.
The commit body names both lines and why (§3 row 1).

### 7.4 The paper (builder `proof`)

- **`CLAUDE.md`**: the pocket row (`CLAUDE.md:316`) gains one sentence for D1-D8 and T1's widening ("Since Phase 332 the
  name check: `node:dgram` in `public-name.ts` alone and no `node:dns` (`D1`), the zone question non-recursive,
  connected and authoritative (`D2`), the refused ranges once (`D3`), started only at the counted start and stopped in
  every unpublish with no clock (`D4`), reason words only in its logs (`D5`), `pairable` one predicate (`D6`), the
  override loopback-only and never a fallback (`D7`), and no real server outside Electron (`D8`)"); the four probe rows
  (`:343`, `:344`, `:347`, `:348`) each gain one clause, "and `GMUX_POCKET_NAME_SERVERS` naming the in-process DNS
  stand-in (`build/p332/dns-standin.mjs`), so no probe asks real DNS"; a new row for `probe:p332` (When:
  `src/main/pocket/public-name.ts`, the name check in `ipc.ts`, the `naming` face of `PhoneSection.tsx`, or
  `build/p332/**`; Cost: about 15 min at HEAD and 5 at a parent, ONE Electron at a time; what it drives, in one line).
- **`CHANGELOG.md`**, the iPhone item under `## Unreleased` (line 12): its clause "the first time your Mac's name can
  take several minutes to reach the phone" becomes **"the first code shows once your Mac's name is on the internet,
  which can take several minutes"**. The item keeps its links; the follow-up docs commit adds this phase's. No new item.
- **`DEVELOPMENT.md`**, after the Funnel paragraph (`:72-78`), one paragraph: `GMUX_POCKET_NAME_SERVERS` (development
  builds only) names up to four `127.0.0.1:<port>` DNS servers the name check asks in place of `ts.net`'s; any other
  value asks nothing and never falls back; every probe that switches the door on points it at
  `build/p332/dns-standin.mjs`; a packaged build ignores it.
- **`build/p330/CHECKLIST.md`**: row 2's "the code appear on its own" becomes "`Pair opens once your Mac’s name is on
  the internet…` under Pair a phone, then the code on its own; write down how long the line showed"; "What the first
  pairing costs" loses "Expect the first scan to fail once" and says the code waits for the name instead; the closing
  note about "until the owed window change lands" goes; and two rows are added: **(a)** after a night with Tortie quit,
  relaunch and write down whether Pair showed at once and, if the checking line came back, for how many minutes (O2 on
  the Mac); **(b)** turn the door off and on again and write down the seconds before Pair (§5's by-request row).

---

## 8. The proof, run rather than read

**Tier 3**, because CLAUDE.md's fourth question answers yes (main sends his Mac's public name to servers Tortie never
talked to, and parses answers anyone on the path can forge) and the third does too (he asked for it, so the parent
measurement is mandatory). Two independent methods, one of them an attack, plus the parent measurement, plus real data
once by hand. A `needs_work` verdict gets one fix round and an independent reverify.

### 8.1 Gates

- **The integrator runs:** `npm run -s typecheck`; `npm run -s build` (which runs `gate:electron`, `gate:background`,
  `gate:checks`, `gate:contract`, `gate:simulator`, `gate:knownhosts` and `conformance:ios`); `npx vitest run`;
  `conformance:pocket`; `conformance:pocket:hostile`; `ablation:p313`; `conformance:push` (the seam is touched);
  `conformance:phonecopy` (`Copy.swift` quotes `PhoneSection.tsx`, whose quoted words must not move);
  `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`; the self-tests of §6.3 item 8; raw control bytes over every
  touched text file and `git diff --check`.
- **The verifiers run:** `smoke:t1`, `smoke` and `smoke:t3`; `probe:p332` at the parent and at HEAD; the re-pointed
  probes of §8.4. **No `ios/` file changes, so `test:ios` is not owed.**

### 8.2 Vitest

§6.1 item 2 and §6.2 items 3 and 4. Every row that sends a packet sends it to `127.0.0.1`; every stand-in socket is
closed in `afterEach`.

### 8.3 `probe:p332` — the parent measurement and the app run (builder `proof` writes it; verifiers run it under THE LOCK)

`build/p332/probe-p332.mjs`, through `build/electron-run.mjs`'s `withElectron`, one Electron at a time.

**The world.** `RUN=/private/tmp/p332-probe-<pid>` with `home/`, `harness/profile/`, `project/`; the tmux socket
`gmux-p332-<pid>` (never `gmux`); `GMUX_CONFIG_ROOT` under the profile; `--use-mock-keychain`; every inherited
`CLAUDE*` variable stripped, as `probe-p330.mjs:977` does. **Before every launch it writes
`<profile>/gmux/config/agents.json`** renaming the `gemini`, `qwen`, `antigravity`, `grok` and `droid` binaries to
names that do not exist (each row's `binaries` and `launch.argv[0]` the same made-up name), so detection never runs
their `--version`, and after the launch reads `agents:list` back and refuses to go on unless those five are not
installed. Tailscale is `makeStandin` behind `preflightStandin` and `watchForRealTailscale`, exactly as `probe:p330`.
The phone is `build/p316/node-phone.mjs`, unedited. The DNS stand-in is `makeDnsStandin` in the probe's own process on
`127.0.0.1`, named by `GMUX_POCKET_NAME_SERVERS`, closed in the `finally`. **A UDP sampler** reads
`lsof -a -p <main pid> -iUDP -n -P` every 2 s through the run: any UDP peer that is not `127.0.0.1` fails the run at
once and ends the app, which limits a broken build to one sample of real traffic.

**The phone's resolver.** `makeResolverModel({ zoneAnswers: (at) => at >= recordAt, negativeTtlMs: 300_000 })`. Once
the probe holds a code, the phone asks the model every 2 s (`Pairing.swift:299`'s cadence) and dials the stand-in's
forwarder only after an `answer`; a `miss` is cached for 300 s, as a phone's resolver does (O4).

**How it gets a code.** The sheet's carried press shows the code; the moment `[data-phone-stage="showing"]` appears,
the probe calls `pocket:beginPairing` through the bridge for a payload of its own (a fresh 3:00 from that moment) and
the phone uses it; Allow is pressed on the sheet when the pairing presents, as `probe-p330.mjs`'s `allowFromSheet`.

**The arms.** `P332_ARMS` picks; the parent runs `H0,P1`, HEAD runs `H0,P1,H2,H3,H4,H5,H6`. At HEAD, P1 is graded as
H1.

- **H0, both builds — nothing for a person who never turns the door on.** A fresh profile; Settings → Phone opened; 30 s
  idle. The DNS stand-in's log is empty; main's UDP socket list is recorded, and at HEAD it equals the parent's
  (`out/p332/probe-p332-parent.json`). At HEAD `nameCheck` is `none` and `pairable` false.
- **P1 at the parent / H1 at HEAD — the same script.** The DNS stand-in is `{ nxUntil: null }` (NXDOMAIN) until the
  probe first sees `listening`, then `recordAt = that moment + 110 s`. Pair pressed with the door off, Allow pressed on
  the sheet once main says the lines are ready.
  - **P1 graded (parent):** the code shows within 5 s of `listening`; the phone's first lookup, within 3 s of the code,
    is a `miss`; every lookup after `recordAt` is still a `miss` (the 300 s cache); nothing presents; the window shuts;
    the sheet's notice is `${CODE_EXPIRED} ${CODE_FIRST_NAME}`; the DNS stand-in was asked nothing. **This is the failed
    first scan, reproduced.**
  - **H1 graded (HEAD):** from `listening` until `pairable`, the sheet wears `naming` with the checking sentence and no
    `pair` button; five seconds after `listening`, `pocket:beginPairing` through the bridge is refused with
    `${POCKET_NAME_SENTENCES.checking} No code was shown.` and `pocket:pairingState` is `idle`; the stand-in's log
    holds one `A` question per round, every one RD 0 for the stand-in's name, round-to-round gaps 20, 30, 45 and 60 s
    and then 20 s (each within 1 s), `no` for the rounds before `recordAt` and `yes` for the two after; `pairable` true
    within 1 s of the second `yes`; the code shows with no other press; the phone's first lookup is an `answer`, it
    presents on its first attempt, Allow pairs it, and `/v1/blocked` answers 200 through the forwarder.
- **H2 (HEAD) — an off with a round held open.** Switch off (the confirmation goes), the stand-in in `record`; switch
  on (the door's agreement is untouched by an off, so the door publishes and checking starts); the first round answers
  `yes`, and the probe then sets `hold`; while the second round is held, press the switch off, and `release()` 0.5 s
  later, inside the app's 2 s deadline. Graded: no
  question reaches the stand-in in the next 120 s; then on again, and `nameCheck` reads `checking`, not `confirmed`
  (a late write after the off would have kept a confirmation). Then on, off, on inside 5 s: the next 60 s of the log
  hold exactly one question per round at 0, 20 and 50 s, never two within 1 s.
- **H3 (HEAD) — the switch-on round.** From a confirmed, paired door: **Remove** the phone on the sheet (the door
  closes), the stand-in in `hold`, then **Allow**: `pairable` is true within 1 s of `listening` and before the held
  answer; exactly one question; release `record`; no further question in 30 s. Then `pocket:forgetDoor` through the
  bridge, the stand-in in `nx`, then **Allow**: one question answered NXDOMAIN, `nameCheck` becomes `checking`, the
  Pair button leaves; the stand-in in `record`: two rounds 20 s apart, then `pairable`.
- **H4 (HEAD) — a relaunch.** Quit, the stand-in in `hold`, launch again on the same profile: the door publishes with no
  press, `pairable` is true within 1 s of `listening`, exactly one question; release `record`.
- **H5 (HEAD) — a moved tailnet.** The Tailscale stand-in's `tailnetAfterReads` moves the tailnet and the probe
  SIGKILLs the Funnel child by pid (never the shim, never the app); the restart's read finds the move, the gate reads
  `changed`, the sheet draws the new lines; **Allow**: `nameCheck` is `checking` (the old confirmation no longer
  counts) and Pair waits for two rounds.
- **H6 (HEAD) — silence.** Switch off, the stand-in `silent`, switch on: three questions, round to round 22 and 32 s
  (each within 1 s: the 2 s deadline plus the gap), then `pairable` true with `nameCheck` `unreadable`, and the sheet's
  `ready` face with `[data-phone-name-unreadable]` reading the unreadable sentence above Pair.
- **At the end, both builds:** `app.log` holds neither the stand-in's public name nor `203.0.113.10`; the Tailscale
  stand-in's log holds every call and no forbidden argv; no real Tailscale was sampled; the UDP sampler saw no peer
  but `127.0.0.1`; every stand-in pid is ended by pid in the `finally`; no Electron of the run is left (counted once,
  CLAUDE.md's command).

**No live arm drives a broken override.** D7's refusal is proved by `public-name.test.ts`, the gate and `D7b`; a live
arm would, on a build that fails it, itself send real packets.

**The parent.** `P332_PARENT_CHECKOUT=<a built checkout at a8e06fe7>` runs `H0,P1` against that build and writes
`out/p332/probe-p332-parent.json`; the HEAD run reads it for H0's comparison and prints the side-by-side of P1 and H1.
The parent ignores `GMUX_POCKET_NAME_SERVERS`, so its DNS stand-in stays silent, which H0 and P1 both assert.
`P332_KEEP=1` keeps the scratch world. `--grader-self-test` grades recorded fixtures, every clause shown red on its own
break, and starts nothing. Exit 0 all passed, 1 an arm failed, 2 could not run or could not read an arm, which is never
a pass. Expected cost: about 5 minutes at the parent, about 15 at HEAD (two launches).

### 8.4 The re-pointed probes (verifiers, under THE LOCK)

`probe:p330` with `P330_ARMS=1,2,3,5,7` and `probe:p313` whole, at HEAD: each pairs through the DNS stand-in, and each
grader's new clause reads every question non-recursive and for the stand-in's name. `probe:p316` and `probe:p314` are
owed the same run; `probe:p314` spends two real model turns and `probe:p316` needs Simulators, so a verifier short of
budget runs their `--grader-self-test` and says which live runs were not made.

### 8.5 The independent methods

**Method 1, the attack (lens 1).** Written by the verifier in scratch, never by a builder: a hostile DNS server with an
encoder of the verifier's own, on `127.0.0.1`. It drives the SHIPPING `askNameRound` and `exchange` through every shape
of §6.1 item 2 plus any the verifier invents (a pointer chain of exactly 8 and of 9, a label of 63 and 64, a name of
255 and 256, an `A` with RDLENGTH 5, an answer whose owner differs only in case, a reply from the right port with the
wrong id followed by the right one, a burst of 1,000 datagrams before the answer), reading each verdict and reason word
and that nothing throws. Then ONE app run at HEAD with `GMUX_POCKET_NAME_SERVERS` pointed at it: lies (an authoritative
`100.81.28.106`; a public address without AA; another owner) never make `nameCheck` `confirmed`, and Pair opens only
by the unreadable rule; the door toggled while a round is held writes nothing.

**Method 2, the parent measurement (lens 2).** `probe:p332` P1 and H0 at `a8e06fe7`, H0-H6 at HEAD, and §5's table
filled with the numbers.

**Method 3, real data, once, by hand.** One verifier writes a scratch script that imports the SHIPPING
`encodeNameQuery`, `readNameReply`, `judgeZoneAnswer` and `findZoneServers`, and hands `findZoneServers` an `exchange` of
the verifier's own over `node:dgram` (the shipping one refuses outside Electron, D8). It runs once, not in a loop,
never in a test or probe: the server search (at most 6 questions, to 1.1.1.1 and 8.8.8.8, naming only `ts.net` and the
NS hosts), then **ONE** `A` question, RD 0, for a made-up `p332-<8 random hex>.tail00000.ts.net`, to ONE kept server.
It records the kept servers, the reply's AA bit, RCODE, the SOA's owner and minimum (read with the verifier's own
reader), and the shipping verdict, expected `negative` / `nxdomain`. It never asks for his name. The verdict says the
questions were sent and to whom.

### 8.6 His checklist

§7.4's two new rows are the only proof on his Mac, over his network, against dnsimple's real anycast: how long the
checking line shows the first time, after a night quit, and after an off and on.

---

## 9. Constants

| Name | Value | Where | Source |
| --- | --- | --- | --- |
| `NAME_SEARCH_ZONE` | `'ts.net'` | `public-name.ts` | O4 (the zone's SOA is `ts.net.`) |
| `NAME_SEARCH_RESOLVERS` | `1.1.1.1`, `8.8.8.8` | `public-name.ts` | the entry N1.2; the running log's read-only measurement used both |
| `NAME_DNS_PORT` | 53 | `public-name.ts` | RFC 1035 |
| `NAME_SERVERS_MAX` | 4 | `public-name.ts` | the entry N1.2 |
| `NAME_QUERY_DEADLINE_MS` | 2 s | `public-name.ts` | the entry N1.3 |
| `NAME_REPLY_MAX_BYTES` | 512 | `public-name.ts` | RFC 1035 §4.2.1, no EDNS sent |
| `NAME_LABEL_MAX` / `NAME_WIRE_MAX` | 63 / 255 | `public-name.ts` | RFC 1035 §2.3.4 |
| `NAME_POINTERS_MAX` | 8 | `public-name.ts` | this spec (§4.4) |
| `NAME_RECORDS_MAX` | 32 | `public-name.ts` | this spec: a real answer holds a handful |
| `NAME_CHECK_GAPS_MS` | 20, 30, 45, 60 s, then 60 s | `public-name.ts` | the entry N2.2 |
| `NAME_CHECK_AFTER_YES_MS` | 20 s | `public-name.ts` | the entry N1.5 |
| `NAME_CONFIRM_YES_ROUNDS` | 2 | `public-name.ts` | the entry N1.5 |
| `NAME_UNREADABLE_ROUNDS` | 3 | `public-name.ts` | the entry N2.7 |
| `NAME_SERVERS_ENV` | `'GMUX_POCKET_NAME_SERVERS'` | `public-name.ts` | the entry N1.6 |
| `NAME_REFUSED_V4` | the eight tuples of §4.5 | `public-name.ts` | the entry N1.4 |
| `POCKET_PAIRING_WINDOW_MS` | 3 min, unchanged | `pairing.ts:1056` | `build/p330/SPEC.md` §4.9, closed here |
| The stand-in's answer | `203.0.113.10`, TTL 60; NXDOMAIN SOA minimum 300 | `build/p332/dns-standin.mjs` | RFC 5737; O4 |
| The phone model's negative cache | 300 s | `build/p332/dns-standin.mjs` | O4 |
| The probe's record delay | 110 s after `listening` | `build/p332/probe-p332.mjs` | §3 row 2 |

---

## 10. What is NOT in this phase

- **No TLS or HTTP probe of the public name from the Mac.** Tortie never dials its own name or an ingress (O1).
- **No question to a recursive resolver about his name, and none to the system resolver about anything.** No
  `node:dns`, no `getaddrinfo`, no c-ares.
- **No `AAAA` question, no EDNS, no DNSSEC, no TCP fallback, and no DNS over TLS or HTTPS.** An IPv6-only network, a
  truncated answer and a referral read `unreadable`, and the Mac pairs as it does today after three rounds.
- **No setting, no field for servers, and no override in a packaged build.**
- **No longer pairing window.** This phase answers `build/p330/SPEC.md` §4.9's owed entry another way and closes it:
  the code waits for the name, so a leaked code still lives 3:00.
- **No change to the phone and no TestFlight build.** `Copy.pairNameNotYet` and `Copy.pairNameNotFound` stay byte for
  byte; if his checklist meets a phone still holding a miss from an older build's code, its words get their own entry.
- **Nothing for a paired phone.** The morning after a quit, while the name is gone, its reads are not explained.
- **No new hashed field, no change to `NORMALIZE` or the algorithm, and no status set** (refusal 5).
- **No new channel, no menu change and no release.** Phases 311 onward stay unreleased.
- **No keeping the confirmation across an off** (his words), and **no fewer than three unreadable rounds** (§5): both
  are one-constant changes if he rules otherwise.

---

## 11. Open concerns handed to the verifiers

1. **dnsimple's real answer**: the AA bit, the SOA's place, the compression shape and whether it answers a
   non-recursive question from any source. Method 3 reads it once; nothing else in this phase has seen it.
2. **Anycast lag between nodes** is why two rounds confirm; how long it actually is, and whether 20 s covers it, is his
   checklist's row, not an agent's.
3. **A network that intercepts port 53** (a captive portal, a corporate proxy) answers without AA or refuses: three
   unreadable rounds, then Pair with its line. Nobody here can measure that network.
4. **The UDP sampler's granularity**: a leak shorter than 2 s between samples is not caught by the probe; D7, D8 and
   their ablations are the structural guard.
5. **The phone model is a model**: RFC 2308's 300 s negative cache, as O4 measured the zone's SOA. iOS's own resolver
   is measured only by his checklist.
6. **The two slower rows of §5** (off then on, about 20 s; a DNS-blocking network, about 55 s): the verifier measures
   both and the main session puts them to him; this spec keeps them as the entry and his words set them.
7. **Electron's `process.versions.electron`** is what D8 reads; the verifier confirms in the app run that the name
   check sends through the shipping transport (the stand-in's log fills), which it cannot do unless D8 lets it.

## §As built — 332

Written by the integrator on 2026-09-30 in `/private/tmp/wt-p332`, over the three builders' trees at `3fae3d87`.
Nothing was committed, staged or stashed. No Electron was launched, no Simulator was booted, no DNS packet left
127.0.0.1, and nothing was installed.

### The files

| Owner | File | What |
| --- | --- | --- |
| names | `src/main/pocket/public-name.ts` (new, 884 lines) | §4.1 exactly, plus three type exports §4.1's prose names: `NameRecord`, `ParsedNameReply` and `NameReplyRefusal`. Imports `node:dgram`, `node:crypto` and `node:net` only, and logs nothing. |
| names | `src/main/pocket/__tests__/dns-fixtures.ts` (new, 440 lines) | The reply writer and `fakeNameDeps`, a superset of §4.1's: answers may be a reply spec, raw bytes, `'silent'`, `'error'` or `'hold'`, with `sleep: 'hand' \| 'now' \| fn`. It imports only types from `../public-name`. |
| names | `src/main/pocket/__tests__/public-name.test.ts` (new) | 46 tests. `node:dgram` is fenced to 127.0.0.1 and every `node:dns` entry point is spied to fail the test. |
| host | `src/main/pocket/ipc.ts` | §4.9: the run, the methods, the write guard and the refusal. See "The integrator's fix" below. |
| host | `src/main/pocket/pairing.ts` | §4.10: `PocketNameConfirmed`, `nameConfirmed`, `nameConfirmedOf`, `nameConfirmedCounts`, `nameTargetOf`. Not hashed. |
| host | `src/main/pocket/funnel.ts` | `armFunnelRestart(deps: Pick<FunnelDeps, 'sleep'>, …)` and its doc line. Nothing else changed. |
| host | `src/shared/ipc/pocket.ts` | §4.11: `PocketNameCheck`, `nameCheck`, `pairable`, `POCKET_NAME_SENTENCES`. `publishedAt` is removed. No channel. |
| host | `src/renderer/settings/PhoneSection.tsx` | §4.12: the `naming` face, the unreadable line, `pairable` in the stage, the carried press and `onPair`. `expiredNotice(shownUnreadable, presented)`. `FIRST_NAME_MS` is removed. |
| host | `src/main/harness/push-seam.ts` | `nameStandInOnly()`, then a wait of up to 90 s for `pairable`, polled every 250 ms. |
| host | the tests `ipc`, `switch-queue`, `pairing`, `funnel`, `push-seam` and `p316-phone-section` | Every `PocketHost` a test makes gets `names` from `fakeNameDeps`. |
| proof | `build/p332/dns-standin.mjs` (new, 772 lines), `build/p332/probe-p332.mjs` (new) | The loopback zone server with an encoder of its own, the phone's resolver model, the agents guard (`writeQuietAgents`, `quietAgentsHeld`) and the one grader clause (`nameQuestionsVerdict`). The probe is §8.3's. |
| proof | `build/conformance-pocket.mjs` (D1 to D8, T1 widened, fifty rules), `build/ablation-p313.mjs` (the 22 arms of §7.2, 130 in all), `build/probe-p313.mjs`, `build/probe-p314.mjs`, `build/p316/probe-p316.mjs`, `build/p330/probe-p330.mjs`, `build/p330/CHECKLIST.md`, `build/assert-electron-teardown.mjs` (floor 155), `build/verification-checks.mjs`, `package.json` (`probe:p332`), `CLAUDE.md`, `CHANGELOG.md`, `DEVELOPMENT.md` | §4.13, §7 and §7.4. |
| integrator | `docs/audits/contract-baseline.txt` | Regenerated. Exactly `[env.names] count=115` became `count=116`, and `GMUX_POCKET_NAME_SERVERS` was added in its sorted place. Nothing else moved. |
| integrator | `src/main/pocket/ipc.ts`, `src/main/pocket/__tests__/ipc.test.ts` | The off window, below. |
| integrator | `build/probe-graders.mjs` (new), `build/p330/probe-p330.mjs`, `build/p332/probe-p332.mjs` | The shared grader self-test loop, below. |
| integrator | `build/p332/dns-standin.mjs` | One fixture string in its self-test: his real name replaced by a made-up one (below). |
| integrator | `build/p332/SPEC.md` | This section. |

### The seams, read from both sides

- **§4.1's names.** Every name `host` and `proof` import from `public-name.ts` exists with §4.1's signature. `ipc.ts`
  imports `NAME_STREAK_START`, `askNameRound`, `defaultNameCheckDeps`, `nextNameStreak` and five types. `push-seam.ts`
  imports `nameServersFrom`. The tests import `fakeNameDeps`, and each reply writer they use exists in
  `dns-fixtures.ts`.
- **The probes and the contract.** All five probes read `pairable` and `nameCheck`, the field names
  `PocketStatus` carries. Each waits for `pairable === true || (pairable === undefined && state === 'listening')`.
  Each passes `GMUX_POCKET_NAME_SERVERS: dns.servers` and closes the DNS stand-in inside the run's outer `finally`.
  `probe-p332.mjs` reads the two sentences from the checkout's own `src/shared/ipc/pocket.ts`, falling back to
  §4.11's text and naming that fallback.
- **The agents guard, read by the shipping parser.** No probe can run here, so the file `writeQuietAgents` writes was
  handed to the shipping `parseAgentOverlay` and `mergeAgentOverlay` through the pinned tsx. It was checked twice:
  the five-agent file, and probe:p314's four-agent file, which keeps Gemini. Both gave zero problems, and in both the
  merged table names only `p332-absent-<id>` in `binaries` and in `launch.argv[0]`. So detection has no real binary
  to ask for its version. `agents:list` is still read back after each launch, which is the runtime proof.

### The integrator's fix: an answer or a gap that lands between an off and its close

The `proof` builder raised this concern (its item 1). The integrator confirmed it with two tests that failed on the
builders' tree:

- `an off queued behind another door job: a late yes writes nothing…` failed with `nameConfirmed` equal to the
  target. The confirmation had been remembered again AFTER the off.
- `…a gap that ends before the close asks nothing` failed with 3 questions where 2 were expected. A question went
  out after the switch was off.

**The cause.** The off writes `enabled: false` before its first await. The check stops only when the off's
`closeNow` reaches the switch queue, and that can wait behind a job already in it. With an idle queue the gap is a
few microtasks; with a wake's read of Tailscale in the queue, it lasts as long as that read.

- In that window a held round's answer passed the §4.9 write guard, which reads `published()`, and that was still
  true.
- A gap's timer that ended asked a question.
- `pairable()` answered true for a door opened by the unreadable rule while `status().state` already read `off`.
  That broke the contract's own reading, the tests' `pairableIsTheRule`.

**The fix.** It adds three clauses to `ipc.ts` and moves nothing else. Each clause reads the switch the off wrote:

1. `nameRoundNow`: `if (this.readStore()?.enabled !== true) return;`
2. The write guard in `settleNameRound`: `this.readStore()?.enabled !== true ||`
3. `pairable()`: `|| this.readStore()?.enabled !== true`

`enabled` is written `false` in one place only, the off write. Every counted start requires it to be true
(`mayOpen`), so no legitimate round is refused.

**The tests.** Three tests in `ipc.test.ts` under "the door moves under a round". Each first lets a wake's read of
Tailscale reach its held `exec`, so the queue really is held, and asserts `door.listening` is still true inside the
window. The third drives the unreadable rule. `beginPairing` in the window is refused with the checking sentence,
and no window opens.

**The ablations** (`scratchpad/p332/integrator/ablate-int.mjs`). Each clause was removed alone from the worktree's
`ipc.ts`, and each went red on exactly its own test:

- I1, `nameRoundNow`: the gap test.
- I2, the write guard: the late yes test.
- I3, `pairable`: the unreadable test.

The control stayed green, and the file was restored and proved by sha256 (`904a058b…`).

**What this does not hold.** Suppose the off's seal write fails. `writeStore` then keeps `enabled: true` in memory
and the confirmation is not cleared, which is the off write's existing behaviour since Phase 316.1. The check still
stops at the close, but these three clauses do not see the off.

### His name, taken out of a fixture

`build/p332/dns-standin.mjs`'s self-test wrote his Mac's real public name as the "another name" the question
grader must refuse. It was never sent anywhere, but §4.2 says his name "is never written into a test, a fixture
or a probe". It is now `p332-other-mac.tail00000.ts.net`, which is made up. The stand-in's self-test, `conformance:pocket`
and the one ablation arm that touches the file (T1c) were run again afterwards, all green. After the change, no file
under `src/`, `build/p332/`, `build/p330/`, `build/p316/` or the five pocket scripts names his name. The two older
probes that do (`build/probe-p234-arch.mjs` and `build/probe-p235-nits.mjs`, his other Mac, for remote SSH) are
outside this phase.

### The duplicated-block scan (`scratchpad/p332/integrator/dupscan.mjs`)

The scan read every 10-line window, whitespace normalised and comments dropped, across `src/` and `build/`, and
reported the ones that touch a line this phase added. **29 windows** were found, all between
`build/p330/probe-p330.mjs` and `build/p332/probe-p332.mjs`.

- **Extracted: the grader self-test loop.** It is about 40 lines, pure, and starts nothing. It is now
  `gradeFixtures` in `build/probe-graders.mjs`, and both probes call it.
  - probe-p332 gains probe-p330's stricter refused-clause check: a refused edit must name one of the grader's own
    clauses.
  - Both `--grader-self-test` outputs are byte-identical before and after the extraction: 131 lines for p330, 79 for
    p332.
  - An eight-case hostile check found exactly one finding per broken case and none for the honest one. The cases
    were: a break that does not redden its clause, a clause with no break, a break naming no clause, a refused edit
    naming no clause, a refused edit that does not redden its clause, a failing honest reading, and no fixtures.
- **Not extracted: 13 windows.**
  - The first group is the live attach path: `targets`, `attachMain` and `attachSettings`. Their readiness
    expressions differ (p330 waits for `__gmuxP93` and `__gmuxP202` and reads `agents:list` inside the attach; p332
    reads it after). Every probe in `build/` carries its own attach loop around the shared `cdp-target.mjs` and
    `cdp-client.mjs`.
  - The second group is the `arm` and `cannotRead` report helpers, which close over each probe's module state.
  - Changing how a probe drives the app, when nobody in this round may launch it before the verifiers do, is a risk
    the scan does not earn.

### Commands, run by the integrator

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | before and after every edit; about 5 s |
| `npx vitest run src/main/pocket src/renderer/settings src/shared src/main/harness/__tests__/push-seam.test.ts` | 0 | 73 files, 1,630 tests on the builders' tree; 1,633 after the three new tests |
| the three new tests on the builders' `ipc.ts` | 1 | 2 failed (a late yes remembered, 3 questions for 2), before the fix |
| `node build/conformance-pocket.mjs` | 0 | 50 rules, 11,926 checks, D1 to D8 green |
| `node build/p313/hostile-client.mjs` | 0 | 87 arms |
| `node build/ablation-p313.mjs` | 0 | 130 of 130 arms each turned their own rule red, measured as a change from the base; worktree never written; 365 s. After the stand-in fix below, `P313_ONLY=T1c` was run again: exit 0, T1 red, 10 s |
| `node build/p311/copy-drift.mjs --self-test` | 0 | phonecopy OK |
| `node build/conformance-push.mjs` | 0 | 23 rules, 2,268 checks |
| `node build/contract-inventory.mjs --check` | 1, then 0 | red on the builders' tree, as expected; green after `--out` moved exactly the two lines above |
| `assert-hermetic-checks`, `assert-electron-teardown`, `assert-background-teardown`, `assert-simulator-teardown`, `assert-known-hosts-scoped`, `verification-checks` | 0 each | electron: 155 users against the floor of 155; background: 19 of 19 fixtures |
| `node build/p332/dns-standin.mjs --self-test` | 0 | 52 checks |
| `--grader-self-test` of probe:p332, p330, p316, p313 and p314 | 0 each | 9 graders and 62 clauses; 14 and 103; 17 dumps; the N1 clause; the P12 clause |
| `node --check` over the ten edited or new scripts and `build/probe-graders.mjs` | 0 | |
| `node build/p332/dns-standin.mjs --self-test`, after the stand-in fix | 0 | 52 checks, "the question grader goes red on another name" among them |
| the shipping overlay parser over the quiet-agents files | 0 | zero problems, only absent binaries |
| raw control bytes and trailing whitespace over all 33 touched text files, and `git diff --check` | 0 | none |
| `npx vitest run` (whole suite, once, after every source edit) | 0 | 1,013 files passed, 1 skipped; 17,572 tests passed, 7 skipped; 48 s |
| `npm run -s build` (once, last) | 0 | 32 s. Every gate inside it green: electron (155 against the floor of 155), background (19 of 19), simulator, known hosts, hermetic checks (239 scripts), `conformance:ios` (20 rules) and the contract |

**Not run by the integrator.**

- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` (§8.1). It was not in this round's list. electron-builder
  fetches an Electron build when its cache lacks one, and this round installs nothing. The main session runs it.
- `smoke:t1`, `smoke`, `smoke:t3` and every live probe. These are the verifiers', under the lock.

### Where the entry and this spec were wrong or loose, found while building

1. **§4.2.** The `A` question need not end in `.ts.net`. That holds only for the question about the Mac's name,
   because the search also asks `A` for the NS hosts. The zone rule is enforced in `askNameRound` (names).
2. **§6.1's 65,507-byte datagram** is never sent on macOS, whose default datagram limit is 9,216 bytes, unless the
   sender raises its send buffer to 131,072 bytes. Without that the test passes vacuously. A verifier's hostile
   server must raise it the same way (names).
3. **§4.4's two 255-byte checks** give the same answer for any name that ends. Only a name that never ends tells
   them apart, and the test now carries one (names).
4. **§4.3 step 7's source filter** cannot be shown red by a test on macOS, because a connected socket already drops
   strangers. D2 holds it as text (names).
5. **§4.3 step 8's "listeners removed"** needs a no-op `error` listener attached afterwards. A late error on a
   closing socket would otherwise be an uncaught exception in main (names).
6. **§4.12 items 3 and 6 disagree.** Item 3 calls the ready face "the only place the sheet reads nameCheck", but item
   6 adds a second read, the ref set when a code is shown. Both compare with `'unreadable'` only, which is what D6
   holds (host).
7. **§4.9's write guard reads `published()`**, which stays true until the off's close runs. It had to read the
   switch as well (above).
8. **§4.13** says each grader self-test "still passes", but probe:p313 and probe:p314 had none. Proof added one to
   each. §8.3's rule against starting agents was not in the spec's text for the other four probes (proof).
9. **§8.4 and §8.1 owe probe:p314 a live run.** Its trust-question arm starts the real Gemini CLI, which this round's
   rules forbid, so it gets its `--grader-self-test` only.

### The open concerns handed to the verifiers

1. **The off window, live.** H2 releases a held round 0.5 s after the off. With an idle queue the close lands within
   microseconds, so H2 alone may never exercise the window. The vitest rows hold it. An attack that holds the queue
   live (a wake's read, or a confirm in flight, across the off) is the independent method this fix earns.
2. **dnsimple's real answer** (§11 concern 1, method 3). An authoritative NXDOMAIN carries its SOA in the authority
   section, with a pointer into the question. Whether the real one parses, with its AA bit, compression and any
   additional records, has not been seen by anyone this round. Neither has 1.1.1.1's `NS ts.net` answer through
   `findZoneServers`.
3. **`pairable` is true during the switch-on round, before its answer** (§4.9 item 1, by design). The morning after
   a quit, when the record may be gone (O2), a code pressed within those first two seconds can still send a phone to
   a missing name, and that miss is cached for 300 s. `beginPairing` also asks `pairable()` before
   `await stillPublished()` and not after it, so a `no` that lands during that read does not stop the window it
   opens.
4. **The two slower rows of §5**: about 20 s after an off and on, and about 55 s on a network that blocks DNS. These
   are measured by H2, H6 and his checklist rows 11 and 12, and put to him.
5. **The `rinfo` source filter and the `unref` calls** are held as text only (D2), not by behaviour (names' ablation
   M06 and M86).
6. **The UDP sampler's 2 s granularity** (§11 concern 4). D7, D8 and their ablations are the structural guard.
7. **A run whose fields stop counting mid-run** keeps its place with no timer, reading `checking`, until the next
   counted start. The integrator found no path that moves the name, tailnet or port while the door stays published:
   the reads that write them run only in a start or a press whose door is not published and confirmed, and a moved
   hashed field closes the door. A verifier who finds such a path has found a lock-out.
8. **probe:p314 and probe:p316.** probe:p314 cannot run live under this round's rules. probe:p316 needs Simulators.
   Say which live runs were made.

## §As built — 332, the fix round

Written by the fixer on 2026-09-30 in `/private/tmp/wt-p332`. Both verifiers answered `needs_work`. The fix ran
once, and the reverify decides. Nothing was committed, staged or stashed, and nothing was installed. No DNS packet
left 127.0.0.1.

### An earlier fixer run's edits, found in the tree

An earlier fixer run edited 13 files between 03:28 and 03:36 and stopped before its gates, its paper and this
section. Its scratch kept the pre-fix sha256 of seven files and its two edit scripts. The pre-fix versions were
rebuilt from the builders' and the integrator's scratch copies, whose hashes match the verifiers' tree
(`ipc.ts` `904a058b…`, `public-name.ts` `cfe687e3…`, `PhoneSection.tsx` `693fdea7…`). Each diff was read against
them. All of it was kept, and this round finished it: doc comments, the probe comments in four probes, a new H2
clause, `CLAUDE.md`, the checklist, this section and every gate below.

### The rows that were worse than today, and what removed each

| Row (the verifiers' numbers) | Before the fix | After the fix | The change |
| --- | --- | --- | --- |
| A network that blocks DNS, nothing remembered | Pair 55.98 s after listening (parent 0 ms) | Pair when the first round's 2 s deadline ends, with the unreadable line | `NAME_UNREADABLE_ROUNDS` 3 → 1 |
| Door off, then on, name public | Pair 20.1 s after listening (parent 9 ms) | Pair at once, and one question in the background | The off write KEEPS `nameConfirmed`, so the next counted start is the switch-on round (`reask`). A `no` there forgets it and checking starts |
| The name is public and nothing is remembered: the first launch of this build with the door on, after Tailscale's approval was asked again, or after a re-ask's `no` when the name then returns | Pair after two `yes` rounds, 20 s apart | Pair after the first `yes` round, one round trip | `NAME_CONFIRM_YES_ROUNDS` 2 → 1 |
| A network that forges an authoritative NXDOMAIN (ATK-T2) | Pair never opened | Pair with the unreadable line after the 18th round, 935 s after the first | `NAME_OPEN_AFTER_ROUNDS` = 18, read in `nextNameStreak`'s `no` branch |
| A switch-on round that answers `no` while `beginPairing` reads Tailscale (ATK-T1) | The window opened | Refused with the checking sentence, and no window opens | `beginPairing` asks `this.pairable()` again after `await this.stillPublished()` and before `this.pairing.open()`. `conformance:pocket` D6 holds it, and `ablation:p313` gained arm `D6c` |
| The push seam's refusal without the name stand-in, and its wait for `pairable` (V23, V24) | Held by nothing | Held by six rows in `push-seam.test.ts` | `openDoorForPairing` is exported for that test alone |

`POCKET_NAME_SENTENCES.unreadable` now says "Tortie could not confirm your Mac’s name, so a first scan may fail."
It said "check". The line now also stands over a `no` that lasted 18 rounds, and "could not check" would be false
there. The sheet draws it where it did. `pocketLog` says `the Mac’s name still does not answer, so pairing is open`
when the 18th round opens Pair. That is fixed words only, which D5 requires.

### What each change costs, stated

- **One `yes` confirms.** The second round guarded against anycast lag (§11 concern 2). A first `yes` from the
  node this Mac reaches can come before another node has the record. A phone's resolver that meets that other node
  keeps the miss for 300 s. That is today's failed first scan, not a worse one. Any negative in a round still makes
  it `no`.
- **One unreadable round opens Pair.** A first round lost to a transient failure on a fresh tailnet shows Pair early,
  with the unreadable line. That is today's behaviour plus a warning. §5 named this cost.
- **The off keeps the name.** "Starts again if they clear the setting" is now read as the next switch-on asking
  again, not as the off forgetting. After the record has gone (O2), a switch-on shows Pair for one round. A Pair
  pressed while the door was off is carried, so it can show a code in that round, which is today's behaviour for
  that one code. The round's `no` then takes Pair away and checking starts. §10's bullet "No keeping the
  confirmation across an off" is reversed by the no-regression rule, and this goes to him with the rest.
- **The bound.** A name that never publishes (Funnel broken) gets Pair with the line after about 15½ minutes, and
  its codes then fail as they do today. The bound is half as long again as Tailscale's documented 10 minutes
  (kb/1223), and his measured 8 minutes sits inside it.

### What is still worse than today, and cannot be removed without removing the phase

- **A network that blocks DNS:** Pair waits for the first round's answer. With the stand-in that is the 2 s deadline.
  In a packaged build the server search's own 2 s deadline answers `no-servers` first, so it is about 2 s. It can
  be up to about 4 s when the NS search answers and the zone servers do not. It is never 0, because showing Pair
  before any answer is the failed first scan this phase removes.
- **The name is public and nothing is remembered:** one round trip, which is the search's two exchanges and the
  question.
- **A forged authoritative negative:** 15½ minutes. A forged `no` and a name not yet published are the same packet,
  so waiting out one means waiting out the other.

Every other row of §5 is now the same as today or better. The verifier's "never turns the door on" row is untouched:
no timer, socket or question.

### The statements in this spec the fix round replaces

- §1 items 3 to 5. The code shows after one `yes`. The next Allow and a switch-on after an off both show Pair at
  once. Pair appears after one unreadable round, or after the 18th round of `no`.
- §4.7's table. `yes` confirms at 1. `unreadable` opens at 1. `no` opens from the 18th round of the run and stays
  open.
- §4.9's no-lock-out paragraph, with the same numbers.
- §4.10 item 4. The off write no longer clears. What clears it is a read that asks approval, a start that waited
  on approval, and a switch-on round's `no`.
- §4.11 item 4's `unreadable` text.
- §5's rows 5 and 6, and the name-never-publishes row after 15½ minutes.
- §8.3's H1, H2, H3, H5 and H6 expectations. The probe's header says the new ones. H2 gained two clauses, graded
  on a held question: off then on while the name answers shows Pair within 1 s of `listening`, and asks once and
  nothing in the 25 s after.
- §9's `NAME_CONFIRM_YES_ROUNDS` (1) and `NAME_UNREADABLE_ROUNDS` (1), and the new `NAME_OPEN_AFTER_ROUNDS` (18).
- §10's last bullet.

### The files the fix round changed

| File | What |
| --- | --- |
| `src/main/pocket/public-name.ts` | The three constants and `nextNameStreak`'s bound, with their reasons |
| `src/main/pocket/ipc.ts` | The off write keeps the name; `beginPairing`'s second ask; the log line for the bound; doc comments |
| `src/main/pocket/pairing.ts`, `src/shared/ipc/pocket.ts`, `src/renderer/settings/PhoneSection.tsx` | Doc comments, and the `unreadable` sentence |
| `src/main/harness/push-seam.ts` | `openDoorForPairing` exported for its test; comments |
| `src/main/pocket/__tests__/public-name.test.ts`, `ipc.test.ts`, `src/main/harness/__tests__/push-seam.test.ts`, `src/renderer/settings/__tests__/p316-phone-section.test.tsx` | The rows below, and the existing rows moved to one `yes` and one unreadable round |
| `build/conformance-pocket.mjs`, `build/ablation-p313.mjs` | D6's second ask, and arm `D6c` |
| `build/p332/probe-p332.mjs` | H1 to H6 moved to the new rules; H2's two new clauses; the fallback `unreadable` words |
| `build/probe-p313.mjs`, `build/probe-p314.mjs`, `build/p316/probe-p316.mjs`, `build/p330/probe-p330.mjs` | Comments only: one round, not two |
| `CLAUDE.md`, `build/p330/CHECKLIST.md` | The `probe:p332` row, D6, row 12, and "Three things to know" |

The rows that hold the fix, in `ipc.test.ts`:

- one unreadable round opens Pair;
- a `no` lasting 18 rounds opens Pair and a later `yes` still confirms;
- off then on keeps the name, shows Pair at once, and a `no` forgets it;
- a switch-on round answering `no` while `beginPairing` reads Tailscale opens no window;
- a Remove during the switch-on round drops a late `no`.

`push-seam.test.ts` holds four refusal rows (unset, blank, `10.0.0.1:53`, `127.0.0.1:0`), the wait, and the
timed-out wait.

### The fix round's ablations (`scratchpad/p332/fixer/ablate-fix.mjs`)

These ran in a `cp -Rc` clone of the worktree, one clause at a time. Every file was restored and proved by
sha256.

| Arm | The break | Red |
| --- | --- | --- |
| F0 | none (the control) | green: 216 tests and `conformance:pocket` |
| F1 | `NAME_UNREADABLE_ROUNDS` back to 3 | 6 tests |
| F2 | `NAME_CONFIRM_YES_ROUNDS` back to 2 | 13 tests |
| F3 | a lasting `no` never opens | 3 tests |
| F4 | the bound moved to 1000 rounds | 3 tests |
| F5 | the off write clears the name again | 3 tests |
| F6 | `beginPairing`'s second ask removed | 1 test and `conformance:pocket` D6 |
| F7 | the seam's name stand-in refusal removed | 4 tests |
| F8 | the seam's wait for `pairable` removed | 2 tests |

### Commands, run by the fixer

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 5 s |
| `npm run -s build` | 0 | 30 s, every gate inside it green; electron 155 against the floor of 155 |
| `npx vitest run` | 0 | 1,013 files passed, 1 skipped; 17,582 tests passed, 7 skipped; 43 s |
| `node build/conformance-pocket.mjs` | 0 | 50 rules, 11,972 checks |
| `node build/p313/hostile-client.mjs` | 0 | 87 arms |
| `node build/ablation-p313.mjs` | 0 | 131 of 131 arms each reddened their own rule (`D6c` new); 378 s |
| `node build/conformance-push.mjs` | 0 | 23 rules, 2,268 checks |
| `node build/p311/copy-drift.mjs --self-test` | 0 | phonecopy OK |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte; the fix round moved no contract line |
| `assert-hermetic-checks`, `assert-electron-teardown`, `assert-background-teardown`, `assert-simulator-teardown`, `assert-known-hosts-scoped`, `verification-checks` | 0 each | |
| `node build/p332/dns-standin.mjs --self-test` | 0 | 52 checks |
| `--grader-self-test` of probe:p332, p330, p316, p313 and p314 | 0 each | p332: 9 graders and 64 clauses (62 before H2's two) |
| `node --check` over the eleven edited or new scripts | 0 | |
| control bytes and trailing whitespace over the 33 touched files, with a planted control file; `git diff --check` | 0 | none; the control was caught |
| the fix round's ablations F0 to F8 | 0 | above |

### Not done, and why

- **The nits.** The unreadable line is still drawn only on the `ready` face, not the `showing` face. §4.12 says so,
  and a carried press shows the code by itself. The four defensive clauses (V04, V13, V14, V18) stay unheld: each
  is equivalent under today's callers. The smoke run's `chrome_crashpad_handler` outliving `npm run smoke` is outside
  this phase and should be queued.
- **`CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`**: not run, as in the integrator's round. It can fetch an
  Electron build, and this round installs nothing.

## §As built — 332, after his ruling

Written by the fixer on 2026-09-30 in `/private/tmp/wt-p332`, after the reverify's second `needs_work` went to him and
he ruled "Keep it, re-test and land". His ruling is stated in §5. This round is the one narrow round on the three
minors the first verifier's lens named, and nothing wider. Nothing was committed, staged or stashed. Nothing was
installed. No Electron was launched. No DNS packet left 127.0.0.1.

### What the tree already held

The tree at the start of this round was byte for byte the tree the reverify read: all 33 hashes of
`scratchpad/p332/reverify/tree-sha.txt` matched. The fix round had already repaired two of the three minors, and this
round kept both as they were:

1. **An authoritative negative no longer locks Pair out.** `NAME_OPEN_AFTER_ROUNDS` (18,
   `src/main/pocket/public-name.ts:132`) is read in `nextNameStreak`'s `no` branch (`:580`): from the 18th round of a
   run, a `no` keeps `opened` true. The host then answers `nameCheck: 'unreadable'` and `pairable: true`, the sheet
   draws `Tortie could not confirm your Mac’s name, so a first scan may fail.` above Pair, and the log says
   `the Mac’s name still does not answer, so pairing is open`, once. Checking goes on every 60 s, and a later `yes`
   confirms as on any other network.
2. **`beginPairing` asks `this.pairable()` again after `await this.stillPublished()`** and before
   `this.pairing.open()` (`src/main/pocket/ipc.ts:1599`; the first ask is `:1585`). `conformance:pocket` D6 and
   `ablation:p313` arm `D6c` hold it.

The third minor was half done. Rows in `push-seam.test.ts` held the seam's refusal and its wait, but no gate did,
and the row for the most likely case did not test what it named (below). This round added the gate (D9) and repaired
that row.

### The bound on negatives, decided

**18 rounds, about 15½ minutes.** The rounds come at 0, 20, 50, 95 and 155 s, then every 60 s, so the 18th ends
about 935 s after the first. That was re-derived by the reverify from the shipping `nextNameStreak`, with 5 ms rounds
on loopback. The reasons:

- **It is well past Tailscale's documented publish time.** kb/1223 says "Public DNS records can take up to 10
  minutes to show up for your tailnet domain" (research 132 §3.4). 15½ minutes is half as long again. His own name
  took about 8 minutes (`build/p330/SPEC.md` M5).
- **Why not 10 minutes.** A fresh tailnet at Tailscale's documented limit would then open Pair with the warning in
  the same minute its record lands. A phone that scans in that minute can still meet the miss and keep it for 300 s
  (O4), which is the failed first scan this phase removes.
- **Why rounds, not a clock.** Nothing in the name check reads a clock (D4). The schedule's gaps are the clock, and
  they are timers, so a wall clock moved a day changes nothing.
- **A forged "no" and an unpublished name are the same packet.** Any bound that opens Pair for one opens it for the
  other.

**The stated limit.** The count belongs to a run. Every counted start begins a new run: a launch, a switch-on, an
Allow, and a restart after an unexpected exit when no name is remembered. So on a network that forges negatives, a
Funnel child that dies more often than every 15½ minutes would keep Pair closed. It was not changed here. Carrying
the count across a restart changes the restart's own schedule, which the live arms are about to measure, and this
round was to be narrow. It needs two rare things at once.

### D9: the push seam, held by a gate as well as its tests

`src/main/harness/push-seam.ts` is the one caller of `beginPairing` outside a test. It runs in a development
Electron, where D8 does not apply. So a door it publishes without the loopback name stand-in would ask the real
`ts.net` servers about the stand-in's made-up name every minute. `conformance:pocket` gains rule **D9**, read with
the TypeScript parser (`seamNameRule`, 51 rules in all), with these clauses:

- `nameStandInOnly` answers exactly `nameServersFrom(…).kind === 'fixed'`.
- `openDoorForPairing` returns false on `!nameStandInOnly()` before it first calls its host.
- It waits for `host.status().pairable`, through a function of the seam that reads both. The wait is after the switch
  and before every `return true`, and it is bounded by a constant of at most 120 s (90 s today).
- The wait's answer decides a `return false` (`if (!waited.ok)`).
- Every `beginPairing` in the seam is reached only through `openDoorForPairing`'s true.

`ablation:p313` gains five arms, each newly red on D9 alone:

- `D9a`: the refusal removed.
- `D9b`: the wait removed.
- `D9c`: `nameStandInOnly` accepting the search.
- `D9d`: the press no longer gated on `doorOpen`.
- `D9e`: the wait's answer ignored.

`CLAUDE.md`'s pocket row names D9, and its trigger paths gain `nameStandInOnly` and `openDoorForPairing` in
`push-seam.ts`, so a change to them runs this gate.

### The seam's "unset" row did not test unset

The row `refuses with GMUX_POCKET_NAME_SERVERS null` is for the most likely mistake, a probe that forgets the
override. Run with the rest of its file, it saw the value `127.0.0.1:5353,10.0.0.1:53`, which the predicate rows had
stubbed last. That value is refused anyway, so the row passed whatever `nameStandInOnly` said about an unset value.

The cause is vitest 4.1.10 itself. `vi.stubEnv(name, undefined)` and `vi.unstubAllEnvs()` both unset a variable with
`delete` through the `import.meta.env` proxy (`node_modules/vitest/dist/chunks/init.k9zZ9sLh.js:174-194`). That proxy
has `get` and `set` traps but no `deleteProperty` trap, so the delete lands on the proxy's target and `process.env`
keeps the last value.

`scratchpad/p332/ruling/r7-probe.mjs` measured it in a clone, with `nameStandInOnly` accepting the search:

- **Before the repair**, the unset row printed `127.0.0.1:5353,10.0.0.1:53` and passed. 3 of 75 rows went red.
- **After it**, the row printed `undefined` and failed, as it must. 4 of 75 rows went red.

The file's two Phase 332 describes now set and unset the variable on `process.env` itself (`setNameServers`), assert
what they set, and put back its value from load time before and after every row (`restoreNameServers`).
`GMUX_TAILSCALE_BIN` is still stubbed through `vi.stubEnv`, whose `set` trap works. No other file under `src/` calls
`vi.stubEnv`.

### Each clause proved red by removal (`scratchpad/p332/ruling/remove.mjs`)

These ran in a `cp -Rc` clone of the worktree, one clause at a time, never in the worktree. Every file was restored
and proved by sha256 against the worktree's bytes. The results are in `remove-results.json`.

| Arm | Item | The break | Tests red | Gate |
| --- | --- | --- | --- | --- |
| R0 | control | nothing | 0 of 216 | green, 51 rules |
| R1 | 1 | a lasting `no` never opens (`opened: false`) | 3 of 141 (`public-name` 2, `ipc` 1) | not asked |
| R2 | 1 | the bound moved to 1000 rounds | 3 of 141 | not asked |
| R3 | 1 | a `no` after the bound closes Pair again (`rounds === 18`) | 3 of 141 | not asked |
| R4 | 2 | the ask after `await this.stillPublished()` removed | 1 of 95 (`ipc`, ATK-T1's row) | D6 red |
| R5 | 3 | the seam's name stand-in refusal removed | 4 of 75 (the four refusal rows) | D9 red |
| R6 | 3 | the seam's wait for `pairable` removed | 2 of 75 (the wait and the timed-out wait) | D9 red |
| R7 | 3 | `nameStandInOnly` accepts the search | 4 of 75, the unset call-level row among them (3 before its repair) | D9 red |
| R8 | 3 | the wait's answer ignored | 1 of 75 (the timed-out wait) | D9 red |

### Found on the way, not in the three items, and not changed

- **The seam's Phase 330 refusal is held by nothing.** R9 in the same script removed `if (!standInOnly())` from
  `openDoorForPairing`. All 75 seam tests and `conformance:pocket` stayed green, because every
  `openDoorForPairing` row sets `GMUX_TAILSCALE_BIN` in its `beforeEach`. That refusal is what keeps the seam's
  Electron off his real Tailscale. Holding it takes one more clause in D9, one arm, and one test row that unsets the
  variable. It is Phase 330's clause, so it is named for the main session rather than widened into this round.
- **The reverify's nit** is not in the three items. That is a carried press refused during a switch-on round's `no`,
  whose refusal is drawn beside the naming line and drops the wish.

### The files this round changed

| File | What |
| --- | --- |
| `build/conformance-pocket.mjs` | Rule D9 (the `RULES` row, `seamNameRule` and its helpers `unwrapped`, `returnsFalse`, `numberOf` and `SEAM_PAIRABLE_WAIT_MAX_MS`, and the `PHASES` row), and the header's count, now fifty-one |
| `build/ablation-p313.mjs` | `SEAM`, arms `D9a` to `D9e`, and the header's count |
| `src/main/harness/__tests__/push-seam.test.ts` | The name servers set and put back on `process.env` itself, so the unset row tests unset |
| `CLAUDE.md` | The pocket row: the D9 clause, and the seam's two functions as trigger paths |
| `build/p332/SPEC.md` | His ruling in §5, and this section |

No production file changed in this round. The one file under `src/` is a test.

### Commands, run by the fixer

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | before the test repair, and again after it |
| `node node_modules/vitest/vitest.mjs run src/main/pocket src/main/harness src/renderer/settings` | 0 | 63 files and 1,454 tests, before the test repair and again after it |
| `node build/conformance-pocket.mjs` | 0 | 51 rules and 12,011 checks, D9 green with 9 checks |
| `node build/p313/hostile-client.mjs` | 0 | 87 arms |
| `P313_ONLY=D9a,D9b,D9c,D9d,D9e node build/ablation-p313.mjs` | 0 | 5 of 5 newly red on D9 alone, 24 s |
| `npm run -s ablation:p313` | 0 | 136 of 136 arms each newly red on the rule that owns it (131 before, and the five D9 arms), 398 s; the worktree never written |
| `node build/conformance-push.mjs` | 0 | 23 rules and 2,268 checks |
| `node build/p311/copy-drift.mjs --self-test` | 0 | phonecopy OK |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte; this round moved no contract line |
| `gate:checks`, `gate:simulator`, `gate:electron`, `gate:background`, and `node build/verification-checks.mjs` | 0 each | electron: 155 against the floor of 155; background: 19 of 19 fixtures |
| `node scratchpad/p332/ruling/remove.mjs` | 0 | R0 to R9 as in the table above, every file restored and proved by sha256, the clone removed |
| `node scratchpad/p332/ruling/r7-probe.mjs` | 0 | the unset row's value before and after the test repair, the clone removed |
| `npm run -s build` | 0 | about 25 s, run last; every gate inside it green |
| control bytes and trailing whitespace over the five touched files, proved on a planted control byte first; `git diff --check`; `node --check` on the two scripts | 0 | none |

### Not done, and why

- **Every live run.** The fixer launches no Electron. The reverify owns `probe:p332` at the parent and HEAD, and the
  reverify's `rv332.mjs` arms. The numbers in §5's ruling table are what it holds the build to.
- **`CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`.** It was not in this round's list, as in both earlier
  rounds.
