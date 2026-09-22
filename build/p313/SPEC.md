# Phase 313 — the door's surface, pinned

This file is not prose about the door. It is the **surface the proof binds to**: the module names, the
export names, the route table, the headers and the canonical string that `build/conformance-pocket.mjs`,
`build/ablation-p313.mjs` and `build/p313/hostile-client.mjs` read. The operator's rule of 2026-09-22 is
that **the gate and the hostile client define the surface and the implementation is renamed to match**,
because a proof that has to chase an implementation's spelling is not a proof.

Everything below is the Phase 313 entry in `docs/BACKLOG.md` and research 127 §5 made into names. Where
this file and research 127 §5.1 disagree, this file and the entry win: §5.1 predates research 128 (which
struck the tailnet key minter) and predates the entry's refusal of `tailscale serve`.

## 1. The modules

| Module | What it owns |
| --- | --- |
| `src/main/pocket/bind.ts` | `pocketBindAddress(interfaces)` — the first IPv4 in `100.64.0.0/10` from `os.networkInterfaces()`, or `null`. The **only** function in the repository that may produce a bind host. |
| `src/main/pocket/tls.ts` | The certificate and the key sealed by `sealText`; `pocketCertificateFingerprint()`. |
| `src/main/pocket/pairing.ts` | The window, `/pair`, the confirm fields and their hash, the paired set, `verifySignature`. |
| `src/main/pocket/routes.ts` | `POCKET_ROUTES` — the closed table. |
| `src/main/pocket/server.ts` | `createPocketServer(deps)` — **the one `listen(` call in the whole repository's pocket domain**. |
| ~~`src/main/pocket/page/`~~ | **REMOVED on the operator's ruling of 2026-09-22.** It was built, could not be reached under §3's own refusals, and came off the disk rather than staying unwired. See "§As built — the page, ruled out" at the end of this file. |
| `src/shared/status-words.ts` | `statusVisual`'s label table, moved out of `src/renderer/app/status.ts` by mechanism 8. |

## 2. The route table

`POCKET_ROUTES` is **frozen** (`Object.freeze`) and every `path` is an **exact string**. There is no
pattern, no wildcard, no regular expression, no `startsWith` dispatch and no default arm. A request whose
method and path are not a row is refused `404` with the reason `route`.

| # | Method | Path | Answers | Kind |
| --- | --- | --- | --- | --- |
| 1 | `GET` | `/` | the blocked list and everything else | `html` |
| 2 | `GET` | `/session` | one session, `?id=` | `html` |
| 3 | `GET` | `/v1/blocked` | `attentionRows`'s order | `json` |
| 4 | `GET` | `/v1/session` | one session, `?id=` | `json` |
| 5 | `GET` | `/v1/turns` | that session's turns, `?id=`, `?limit=` | `json` |

**Zero write routes. Every row is `GET`.** The session id rides in the QUERY and never in the path, so
the table is literally a set of five strings and the refusal "no token in any path" is true by
construction rather than by inspection.

**`/pair` is not in this table.** It is handled by `pairing.ts` before the table is consulted and exists
only while the window the person opened on the Mac is open. Outside that window it is not a route at all
and answers `404` with the reason `route`, indistinguishable from any other path that is not a row.

## 3. Admission — the two ways, and there is no third

Every request must prove the paired identity in exactly one of two ways. `POCKET_ADMISSIONS` is frozen
and holds exactly these two members.

- **`mtls`** — a TLS client certificate whose sha256 fingerprint is in the paired set. This is how a
  browser reaches the page: a browser cannot sign a request, and the alternatives are a cookie, a bearer
  or a token in a URL, all three of which this phase refuses by name.
- **`signature`** — `X-Tortie-Key-Id`, `X-Tortie-Timestamp`, `X-Tortie-Nonce`, `X-Tortie-Signature`.

**No `Authorization` header is read or written anywhere in the domain. No cookie is set or read. No
secret is ever in a path or a query.**

### The canonical string

```
<METHOD> \n <request target, query included> \n <sha256 of the body, lowercase hex> \n <timestamp> \n <nonce>
```

joined by a single `\n`, signed `HMAC-SHA256` under the phone→Mac key pairing derived, and carried
base64url in `X-Tortie-Signature`. The **target includes the query**, so moving `?id=` moves the
signature. `timestamp` is integer seconds and must be within `POCKET_CLOCK_WINDOW_SECONDS` (120). A
`nonce` already seen inside that window is refused. An empty body hashes as the sha256 of zero bytes and
is signed like any other.

### The refusal reasons, and every one is one word

`route`, `method`, `unpaired`, `signature`, `timestamp`, `nonce`, `body`, `loopback`, `window`,
`revoked`, `id`. They are the vocabulary of the bounded per-reason log, on `hooks.ts:368-385`'s pattern:
**at most one line per reason per process, and never a token, a body or a line of conversation.**

## 4. The seams every test drives, and the rule that makes them safe

`createPocketServer(deps)` takes:

| Dep | Why it is a dep |
| --- | --- |
| `host` | **Every test and every gate passes `127.0.0.1` and port `0`.** The interface-derived address reaches the server from exactly ONE production call site, and nothing in this repository may bind a real interface. |
| `port` | `0` in every test. In production a taken port **refuses** rather than moving — deliberately the opposite of `hooks.ts:230-243`, because a phone was told a number. |
| `peerIdentity(socket)` | Answers the paired fingerprint or `null`. It is what lets the hostile client drive every admission arm over loopback with no certificate machinery. The TLS handshake itself is `tls.ts`'s and is proved by `probe:p313`, not by the hostile client, and that limit is stated rather than hidden. |
| `now()` | So the clock window and the nonce window are driven rather than waited for. |
| `readers` | The three read functions. No write verb is reachable from here. |

`createPocketServer` answers `{ port, close() }`. `close()` is the disposer's, sets admission closed on
its first line before any await, and joins what it accepted — `hooks.ts:256-316`'s shape.

## 5. What the page is, and what it is not

**THIS SECTION DESCRIBES A THING THAT IS NO LONGER IN THE TREE.** It is kept as written because it is what
the builders were given and because the last section of this file is the account of why it went. Read it
as history, not as a description of disk.

It is **a page a person bookmarks in mobile Safari**. It is NOT research 127 §5's fifth route, the
home-screen web app: no web app manifest, no `apple-mobile-web-app-capable`, no service worker, no web
push, no key minted in a browser, no storage, no cookie, and **no script of any kind**. Navigation is
ordinary links to rows 1 and 2 of the table above. The entry's mechanism 6 is why: the certificate a
browser reaches is one a browser cannot pin, so everything that would need a browser to hold a secret
stays refused.

---

## §As built — the integrator's round, 2026-09-22

This section is written AFTER the three builders and it is the only part of this file that describes the
tree rather than the intention. **Where §1 to §5 above and this section disagree, this section is what is
on disk.** Two of the sections above were written before the builders split the work and did not survive
it, and saying so here is cheaper than a later round re-deriving it from the code.

### What §1 to §5 got wrong about the tree

| Where | It says | The tree |
| --- | --- | --- |
| §1 | `bind.ts` owns only `pocketBindAddress` | `bind.ts` owns the whole listener: the address, the connection caps, the TLS server, the self-origin refusal on `connection`, and the joined stop. `server.ts` is the REQUEST HANDLER it is started with (`createPocketHandler(deps)`), and there is still exactly one `listen(` in the domain |
| §1 | `server.ts` holds `createPocketServer(deps) → { port, close() }` | There is no `createPocketServer`. The lifecycle is `startPocketDoor({ handle, port })` / `stopPocketDoor()` / `joinPocketDoor()` in `bind.ts`, and the disposer in `src/main/capabilities.ts` owns it |
| §1 | `src/shared/status-words.ts` holds the moved label table | **It does not exist.** Mechanism 8 was not built. The status word reaches the routes INJECTED, as `PocketFacts.statusWord`, so there is still one spelling — but the renderer's table has not moved and the door is handed main's answer rather than reading a shared one |
| §2 | Five routes, two of them `html` (`GET /` and `GET /session`), and `/pair` outside the table | **Four routes, all JSON, and `/pair` is IN the table** as its own row with `windowOnly: true, signed: false`. There is no html route at all, and `sendPocket` in `server.ts` writes `application/json` on every answer |
| §3 | Two admissions, `POCKET_ADMISSIONS` frozen, `mtls` being how a browser reaches the page | **There is no `POCKET_ADMISSIONS` and no mTLS.** `bind.ts` calls `createServer` with no `requestCert`, so no client certificate is ever asked for or read. Admission is the signature alone, plus the window for `/pair` |
| §3 | The canonical string is `HMAC-SHA256` under a key pairing derived | It is **Ed25519** over the same five lines, with an X25519+HKDF `binding` mixed in that is never transmitted, so a signature for this door cannot be replayed at another |
| §3 | Eleven refusal reasons | Twelve, and the set in `pairing.ts` is the one the log and the hostile client read |
| §4 | `peerIdentity(socket)` is a dep | There is no such dep, because there is no mTLS |

### The route table on disk

| id | method | path | reads | windowOnly | signed |
| --- | --- | --- | --- | --- | --- |
| `pair` | POST | `/pair` | true | **true** | false |
| `blocked` | GET | `/v1/blocked` | true | false | true |
| `session` | GET | `/v1/session?id=` | true | false | true |
| `turns` | GET | `/v1/turns?id=&limit=&from=&to=` | true | false | true |

`Object.freeze`d, matched by equality on method AND path, every id also a member of `POCKET_ROUTE_IDS`
in `src/shared/ipc/pocket.ts` and hashed into the confirmed fields. Every session id rides in the QUERY,
so each path stays one exact string and "no secret in a path" is true by construction.

### THE ONE THING THIS PHASE DOES NOT DO THAT ITS OWN FIRST BODY LINE CLAIMS

**RESOLVED 2026-09-22 — HE RULED, AND THE PAGE CAME OUT. The account below is what the integrator's round
found; the last section of this file is what was done about it.**

**`src/main/pocket/page/` is not served.** It renders the list, one session, the not-paired sentence and
the no-such-session sentence, it is escaped on every slot and its ten-arm attack passes — and **no module
outside itself imports it.** There is no html route, `sendPocket` never writes `text/html`, and every
read route requires an Ed25519 signature, which **a browser cannot produce** without a script, a cookie,
a bearer or a token in a URL, all four of which this phase refuses by name.

So "usable from a phone's browser before a line of Swift exists" is NOT true of the tree. §3 above had
already answered it — mTLS, which needs no script and carries no secret in a URL — and that answer was
never built. The alternative Builder C found, HTTP Digest (RFC 7616), needs no profile install at all but
is unmeasured against iOS Safari. **This is a ruling, not a fix**, because a browser admission built in
an integration round and driven by no browser is assurance rather than evidence.

### Also owed, and named so nobody re-derives it

- **Mechanism 9 in full.** There is no Settings → Phone, no confirm sheet, no pairing panel and no row in
  `src/main/menu.ts`. `registerPocketIpc` is never called, so the eight channels the contract declares and
  the preload installs have no handler at run time. Nothing switches the door on.
- **Mechanism 8.** `statusVisual`'s label table has not moved to `src/shared/`.
- **The Catch Me Up line.** `buildProjectLine` and its outcome copy are in `src/renderer/overview/`, which
  main cannot import, so `PocketFacts.catchUp` has no composer yet.
- **`probe:p313`.** It does not exist, and `HELPER_USER_FLOOR` therefore stands at 148.

### What the round did prove, run rather than read

`conformance:pocket` 18 rules / 2,467 checks; `conformance:pocket:hostile` 33 arms; `conformance:pocket:page`
10 arms (that script left with the page on his ruling; the last section has the counts that stand); `ablation:p313` 24 arms, **every one red on the rule that owns it**, worktree restored and proved
by sha256. The A3 arm was re-aimed in this round: it had been flipping the table's `windowOnly` field,
which R2 owns, so it never tested A3's own sentence — it now reads the body before asking the window,
which is the one shape A3 exists to refuse, and the table flip stands beside it as `A3t` under R2.

## §As built — the fix round, 2026-09-22

The verification round's verdict was `needs_work` on five blocking problems. This section says what the fix
round changed, at the place each problem was named, and what it deliberately did not change.

### 1. The bridge, and it is the one thing that read WORSE than the build before it

`window.gmux` went 60 keys to 61 and the new `pocket` member carried nine methods whose eight invokes all
rejected in the running app — "No handler registered for pocket:status", measured over CDP — because
`registerPocketIpc` is called from nowhere. The preload is the one part of this domain the bundler does not
tree-shake, so it shipped: `out/preload/index.js` grew 976 bytes for it.

**Under the operator's no-regression rule a scenario that reads worse is REMOVED rather than repaired.** So
the `pocket` import and the `pocket` member are out of `src/preload/index.ts`, and `GmuxPocketExtras` is out
of `InstalledGmuxApi`'s intersection in `src/shared/ipc/index.ts` — that annotation is what MAKES the member
compulsory, so the two lines move together in whichever direction the wiring goes. `src/preload/pocket.ts`,
`src/shared/ipc/pocket.ts` and `src/main/pocket/ipc.ts` all stay on disk, unchanged, for the wiring round.

**The 8 channels could NOT be taken back out of the contract baseline, and the judge's fix said to.**
`GmuxInvokeChannelMap` is the type `handle` and `invoke` are both generic over, so dropping
`PocketInvokeChannelMap` from it was measured at **28 typecheck errors** — 11 in `src/main/pocket/ipc.ts`, 17
in `src/preload/pocket.ts` — and the only way to reach `count=235` is to delete both files. That is a bigger
removal than the defect and it contradicts the same verdict's instruction to keep them. So the baseline
stands at **243 invoke channels and 115 env names**, `node build/contract-inventory.mjs --check` matches it
byte for byte, and the declared-but-unregistered channels are held honest by rule `B1` instead.

### 2. The turn limit was clamped nowhere, on the one route that returns his conversation

`routes.ts` computed `Math.floor(asked)` for any finite positive number and handed it straight to
`facts.turns`. Its own comment said "the store clamps it", which is false: `listTurns`
(`src/main/overview/store/store.ts:687-694`) passes its limit into a SQL `LIMIT ?` with no clamp, and
`MAX_TURN_LIMIT` is enforced at `src/main/overview/service.ts:115` and `timeline.ts:219,226`, neither of
which this door goes through. Nothing under `src/main/pocket/` imported `MAX_TURN_LIMIT` at all.

Now: `Math.min(Math.floor(asked), MAX_TURN_LIMIT)`, with `MAX_TURN_LIMIT` imported from
`../overview/turn-view` so the number is still spelled once. The comment says the door holds the cap. Rule
`R5` reads the import, the `Math.min` and the absence of a second literal `200`, and two vitest cases drive
the real composer over a facts stub that records the range it is handed: `201`, `1e9`, `999999999`,
`9007199254740993` and `200` all arrive as 200, and `-5`, `Infinity`, `NaN`, `''`, `0` and absent all arrive
as the default 20.

### 3. Three refusals no gate could redden, and one arm that was a word

Each was driven red on the shipping source before the rule existed, and each is now an ablation arm.

- **`S4`, the direction of `isSelfOrigin`'s comparison.** Inverting one `===` to `!==` left
  `conformance:pocket` AND `conformance:pocket:hostile` green, and a live door then ADMITTED the local
  socket. `S2` reads WHERE the destroy is, not which way the comparison points. `S4` reads the function's
  returns: the first must be `true`, so an unreadable source fails closed, and the last must be a `===`
  binary expression, with no `!==` anywhere in the function.
- **`W1`, the file modes.** Dropping `mode: 0o600` from `tls.ts` was green, and the sibling write in
  `pairing.ts` never had it — measured at `0o644` under umask 022, with `<userData>/gmux/` at `0755`. Both
  writes now name `0o600` and both `mkdirSync` calls name `0o700`, and `W1` requires every
  `writeFileSync`, `appendFileSync`, `mkdirSync`, `createWriteStream` and `openSync` in the domain to name
  an octal mode whose group and world digits are `0`.
- **`R4`, the table's MEMBERSHIP.** A fourth GET added under an existing route id left both gates and
  `gate:contract` green, because `R1` pins the table's shape, `R2` pins each row's fields and
  `pocketRouteIdsAgree()` compares only the id SET. `R4` pins the sorted `METHOD path` lines by sha256 —
  today `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080` over `GET /v1/blocked`,
  `GET /v1/session`, `GET /v1/turns`, `POST /pair` — with `--write-route-pin` as the deliberate escape.
- **Hostile arm 15 is DRIVEN, not stated.** It used to record the word `stated` on the argument that under
  loopback every client is the bind address. That was backwards: it makes a loopback door with the refusal
  turned ON the cheapest place to drive it. The arm now stands up a second `PocketDoor` on its own
  ephemeral loopback port with `refuseSelfOrigin: true`, speaks TLS to it by hand, and requires
  `refused-socket` with **zero bytes and no HTTP status** — plus arm `15b`, that the handler it was given
  never ran, which a status alone cannot prove. Against the inverted build it reads
  `answered-96-bytes` / `reached` and fails. The second door is stopped inside the arm and again in the
  `finally`.
- **And `bind.ts`'s header now says this refusal is not the boundary.** A local process can choose another
  local source address; what actually stops it is that it has no key, and `pairing.ts:1146`'s
  `phone.address !== input.from` pin is what the hostile client goes red on when it is removed.

### 4. Three sentences that were not true

`routes.ts`'s refusal 4 said the self-origin check is `./server.ts`'s "on the first line of its handler" —
it is `bind.ts`'s, on the `connection` event, and `server.ts`'s own header already said so the right way
round. `page/index.ts` said "the route table reaches the page through this module and nothing else"; the
route table does not reach the page at all, and that header now opens by saying so and naming the ruling the
page waits on. `POCKET_DEFAULT_TURN_LIMIT`'s comment said the store clamps the limit.

### 5. The release item is held out

`## Unreleased → ### Added` is byte-identical to `e0121336`. Nothing user-visible landed, so the honest entry
is no entry, and the round that makes the door reachable writes one fresh.

### What this round did NOT fix, and why

- **Mechanism 7, the page's admission.** It needs the operator's ruling between mTLS and Digest. §3 above
  and the `page/index.ts` header both carry the question. **ANSWERED THE SAME DAY — see the last section
  of this file. There is no third option to build, because he chose neither.**
- **Mechanisms 8 and 9.** `src/shared/status-words.ts`, Settings → Phone, the menu row and `probe:p313` are
  the wiring round's, and `HELPER_USER_FLOOR` stays at 148 until `probe:p313` exists.
- **The route scope.** `/v1/session` and `/v1/turns` answer any session id, not one the phone was told
  about. That is the operator's scope question and widening or narrowing it inside a fix round would be
  answering it for him. It is written into the backlog entry as question 2.
- **The QR pinning the certificate rather than the public key.** Moving it changes a confirmed field's hash
  and the pairing tests assert the current value, so it lands with the panel that draws it.
- **`hasTailnetUla` ordering candidates without admitting them**, so a `/32` in range with no ULA is still
  bound. Making the ULA an admission test turns the door off for anybody with IPv6 disabled, which is his
  call, not a fix round's.
- **The signature covering the re-serialized request target**, `readBody` draining rather than destroying an
  oversized body, `start()` defaulting to a real interface, and `doorAddressIsStale` having no caller. All
  four are named as residuals in the backlog entry with what each one costs.
- **Research 127 §5.1's struck minter row and its "five new things"**, which is a docs follow-up on a
  research file rather than a defect in this tree.
- **`ipc-invoke-closure` gaining a rule that a declared registrar nothing calls must be red.** That rule
  would be red at this commit, because `registerPocketIpc` is exactly that and it stays on disk for the
  wiring round. `B1` covers the half that matters — the bridge never advertises what main does not serve —
  and the other half belongs in the commit that wires it.

### What the fix round ran, with its numbers

`npm run -s typecheck` exit 0, 1,352 production files, 7,647 imports, 0 violations, 3 directory walls, 0
cycles. `conformance:pocket` exit 0, **23 rules / 2,508 checks in 0.83 s** (was 18 / 2,467; this is the fix
round's reading and the page's removal moved it — the last section carries the count that stands).
`conformance:pocket:hostile` exit 0, **34 arms in 0.85 s** (was 33), two loopback listeners both closed.
`ablation:p313` exit 0, **30 arms in 128.6 s** (was 24 / 103.8 s), every one newly red on the rule that owns
it, every clone file restored and proved by sha256, worktree bytes unmoved. `npx vitest run --no-cache
src/main/pocket src/shared/ipc src/preload` exit 0, 7 files / 137 tests. `node
build/contract-inventory.mjs --check` exit 0, byte for byte at `count=243`. The regex in
`ablation-p313.mjs`'s delta reader was widened to accept a lowercase tag, because it demanded a leading
capital and so never saw `[p313 hostile]` — which is why the `S4` arm now reports `newly red S4, hostile`
and the earlier arms driven by the client reported only their gate rule.

## §As built — the page, ruled out (2026-09-22)

**HIS WORDS: "lets skip the web app."** This section exists so that a later round reads the ruling before
it reads the gap, and does not helpfully rebuild the page it names.

### What he was asked, and what he chose

The integrator's round above found the contradiction and correctly refused to resolve it in a build. Put
to him in plain words, with three options and their real costs:

| Option | What it costs him |
| --- | --- |
| Wait for the app | Nothing is browsable from a phone until Phase 316's Swift screens exist. The door is still built, proved and attacked. |
| Mutual TLS | A `.p12` client certificate installed on the phone through Settings → General → VPN & Device Management. That is a profile install, not a bookmark. |
| HTTP Digest (RFC 7616) | No install, no script, no cookie and no URL token — and **whether iOS Safari accepts SHA-256 Digest is unmeasured**, so it is a build with an unknown at the bottom of it. |

He chose the first. **The page is therefore REMOVED rather than left on disk unwired**, because the
judge's earlier suggestion to keep the modules was written while the page was DEFERRED. A deferred thing
waits; a skipped thing that stays behind a gate still asserting rules about it reads as maintained, and
the next round pays to keep it true.

### What came out, in one change

- `src/main/pocket/page/` — `copy.ts`, `index.ts`, `render.ts`, `style.ts`. No test imported them.
- `build/p313/page-attack.mjs` and `.mts`, its `conformance:pocket:page` script in `package.json`, and its
  classification in `build/verification-checks.mjs`.
- `conformance:pocket` rules `P1`, `P2` and `P3`, with `pageFiles`, `BROWSER_ASKS` and `pageRules`.
  **20 rules / 1,550 checks, from 23 / 2,521.** The door's own rules are unchanged in text; their check
  counts fell only because four files left the domain they read.
- `ablation:p313` arms `P1`, `P1b`, `P2`, `P3` and `P3b`, and the `page` check from its `CHECKS` table.
  **25 arms, from 30.**
- `build/p311/copy-drift.mjs`'s two rules for `Open in Terminal` and `Open in Claude` went back to `owed`
  by Phase 316, byte for byte against `origin/main`. They had been moved to `owned` naming
  `page/copy.ts` only because the page existed.

### The design is not lost

`docs/design/phone/` holds the seven screens he approved, unchanged, and they are what Phase 316's Swift
screens are built from. The page implemented that design in HTML; the design outlived it.

### Do not rebuild it by accident

Mechanism 5 has not moved. It refuses a script, a cookie, a bearer and a URL token **by name**, so any
future page needs an admission a browser can satisfy, which is mTLS or Digest, which is the question he
was asked and declined. A round that finds "there is no way to see this from a phone" has found the
ruling, not a defect.

### The ruling is now a rule, and the count that stands

The checker of the removal found that nothing executable held the ruling: `P2` and `P3` had asserted no
HTML in the domain as a side effect of judging the page's own markup, and they left with it. **`H1`** now
says it outright — no module under `src/main/pocket/` composes an HTML document or names `text/html` —
and `ablation:p313`'s `H1a` (a `<!doctype` planted in `server.ts`) and `H1b` (an answer served as
`text/html`) are each red on it.

The same checker found `S2`'s destroy clause asked the whole FILE for a `socket.destroy()`. The shutdown
arm and the `clientError` listener each hold one, so a self-origin branch that asked the question and
threw the answer away was green. `S2` now requires the destroy inside the `if` whose condition calls
`isSelfOrigin`, found as a call rather than as text; `S2b` keeps the branch and takes its destroy out, and
it is red at this tree and would be green under the old clause (the mutated `bind.ts` still holds two
`socket.destroy()` calls).

**`conformance:pocket` 21 rules / 1,556 checks. `ablation:p313` 28 arms, every one newly red on the rule
that owns it, every clone file restored and proved by sha256.** The 2,508 of the fix round and the
2,521 read immediately before the removal were taken at different points in the same day and the 13
checks between them were not attributed; neither is the count that stands.
