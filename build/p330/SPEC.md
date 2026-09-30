# Phase 330 — the phone never joins the tailnet — SPEC

Written by the spec step on 2026-09-29 in `/private/tmp/wt-p330` at `217f47e5` (origin/main). Between the entry's
parent `7d14342d` and this head there are four `docs(...)` commits and they touch only `docs/BACKLOG.md` and
`docs/research/132-the-simplest-pairing.md`, so every `file:line` below was re-read at this head and the product is
byte for byte the entry's parent. The parent build for every "before" measurement is `217f47e5`.

Read with it, whole: the Phase 330 entry (`grep -n "^## Phase 330 " docs/BACKLOG.md`, to the running log),
`docs/research/132-the-simplest-pairing.md` (§3, §7, §9, §10), the running-log lines of 2026-09-29 at the end of
`docs/BACKLOG.md` (his ruling, "ok lets do that", and his measurement), and `build/p316/SPEC.md`'s four "§As built"
sections and "Owed to S5". Where this file and the entry disagree, this file says so in §3 and wins.

**No agent runs `tailscale funnel`, or any `tailscale` command that changes his tailnet, and none calls the
LocalAPI.** Everything below that drives Funnel drives a stand-in program at an injected path (§6.3). The real
program's behaviour is his measurement plus the pinned source research 132 read (`tailscale.com v1.94.1`, unpacked
at `scratchpad/p329/src/ts/tailscale.com@v1.94.1`, and the four v1.102.2 files beside it). The `file:line`s into
Tailscale below are from that copy.

---

## 1. The answer first

**What gets built.** The door stops binding his tailnet address and binds `127.0.0.1` on an ephemeral port, inside
a Tortie-owned `utilityProcess` that imports nothing but Node's `net`, `tls`, `http` and `crypto` and `src/shared/`.
Tortie runs his Mac's own Tailscale program, resolved by the existing `resolveTailscale`, as a foreground child:

```
<program> funnel --tcp=<publicPort> --proxy-protocol=2 tcp://127.0.0.1:<localPort>
```

That publishes the door as raw TCP at `https://<publicName>:<publicPort>`, so TLS still ends inside Tortie under the
key the QR pins. Outside a pairing window, a connection whose client certificate is not a paired phone's is destroyed
at the end of the handshake, before an HTTP byte is parsed. The phone becomes an ordinary pinned TLS client over
`NWConnection`, with a hand-written, bounded HTTP/1.1 exchange. TailscaleKit, `Tailnet/Node.swift`, Go, the vendoring
step, the no-logs patch, the local-network string, the ATS key and the `tk` field all leave.

**What a person does, the first time.**

1. Settings → Phone (or Tortie → Pair a Phone…).
2. Press **Pair**. Tortie reads Tailscale once and draws the door's lines, which name the internet.
3. Press **Allow**. That confirms the hash, starts the door process and the Funnel child, and shows the code once
   Tailscale is publishing.
4. The first time on a tailnet only: **Open Tailscale**, then approve on Tailscale's page (one click, his
   measurement).
5. On the iPhone: install, open, scan, compare six groups. Then press **Allow** on the Mac.

**The four seams, decided (§4 gives the reasons):**

| Seam | Decision |
| --- | --- |
| The door process | `utilityProcess.fork`, entry `out/main/pocket-door.js`, `env: {}`, `stdio: 'ignore'`, `serviceName: 'Tortie Door'`. Main hands it the TLS key and certificate, the paired phones' client-key pins, the public name and port, and whether a window is open. It hands main a parsed, bounded request and never a raw byte stream. |
| Mutual TLS | TLS 1.3 only, `requestCert: true`, and the check is a pin rather than a chain. On Allow the Mac issues each phone's client certificate over the P-256 key the phone presented, using `tls.ts`'s own DER writer. Revoking is Remove, which already withdraws the agreement and closes the door. |
| The Funnel child | It runs only inside the 316.1 switch queue. It starts at the door's confirmed Allow, or at launch on a confirmed `bindAtLaunch`, and never at Pair. It is stopped with SIGINT, then SIGTERM, then SIGKILL in a `finally`. Its pid, `ps` start time and `ps` command line go in `<userData>/gmux/pocket-funnel.json`, and at the next start an orphan matching all three is ended. |
| The hash | `sha256-pocket-exec-v3`. It loses `bindAddress` and `port`, and every phone loses `address`. It gains `funnelProgram`, `tailnet`, `publicName`, `publicPort`, and each phone's `clientKey`. |

**What does not change:** every route the door answers, every status, the manifest, the tmux layer, the push path
(Phase 314), the native menus (`Pair a Phone…` stays at `src/main/menu.ts:615-616`), the request signature
(`canonicalRequestText`, `pairing.ts:1401-1411`), and the 3:00 pairing window (§4.9 says why, and what his
measurement now owes).

---

## 2. His measurement, and what it settled

From the running-log line of 2026-09-29 ("HIS FUNNEL MEASUREMENT PASSED"). This was his Standalone Tailscale 1.102.2
(`io.tailscale.ipn.macsys`), with a throwaway `CN=funnel-test` server on `127.0.0.1:9443` and
`tailscale funnel --tcp=8443 tcp://127.0.0.1:9443` in the foreground.

### 2.1 Settled, and what each one lets this build rely on

| # | What he measured | What the build relies on |
| --- | --- | --- |
| M1 | One click on Tailscale's page approved Funnel. It added `funnel`, `https` and `funnel-ports 443,8443,10000` to his node, and they stay. | The first-time count is at the low end of research 132 §2 (about 14). **Nothing Tortie does can undo the standing right**: his tailnet now lets any member device publish a port. That is the trade he accepted. |
| M2 | Through the public ingress `209.177.145.137` the handshake presented `CN=funnel-test`. His iPhone over cellular saw `funnel-test`. | Raw `--tcp` passes TLS untouched (`ipn/ipnlocal/serve.go:669-701`, as driven). The phone pins the door's own key, and `spkiPinOf` (`pairing.ts:969-974`) keeps its meaning. |
| M3 | Research 127 §2's "Funnel is unavailable on his variant" is refuted. | Route 1 proceeds, and Route 2B is not written. |
| M4 | crt.sh lists 0 certificates for the Mac's name. | Raw forwarding issues no certificate for the name (`GetCertPEM` is only on the `TerminateTLS` arm, `serve.go:680-696`). The name is in public DNS but not in Certificate Transparency. |
| M5 | The public name resolved from 1.1.1.1 and 8.8.8.8 **about 8 minutes after the approval**. | This is more than the 3:00 window, and §4.9 is what follows from it. |
| M6 | The command ran from his Terminal with no prompt from the closed extension. | The serve-config write needs no human beyond the approval page. From a Tortie child it is believed, not measured (§2.2 O5). |

### 2.2 Left open, and who measures each

| # | Open | Why it matters | Where it is measured |
| --- | --- | --- | --- |
| O1 | **The second ingress, `199.38.181.54`, did not answer from the Mac within 12 s.** It could be dead, hairpin-only (a node dialling its own Funnel), or slow. | If a phone's resolver hands it the dead address first, a client that dials one address waits out its whole timeout. | Nothing in Tortie may pin or choose an ingress address. The phone dials the NAME and lets Network.framework race the resolved addresses (`NWEndpoint.hostPort`; §4.12). The checklist times five pulls over cellular and notes any that stall (step 8). No agent can reach a real ingress. |
| O2 | Whether the public DNS record outlives the funnel. His funnel was stopped after the measurement. | If it does not, every start of the door pays the DNS wait again, not only the first. | Checklist step 6: quit Tortie, reopen it, and time the first pull. A verifier may run `dig +short <his name> @1.1.1.1` read-only and must say so. |
| O3 | The approval URL's host. He saw it but it was not recorded. | **Open Tailscale** opens only an `https:` URL on `login.tailscale.com` (§4.2.5). | His tailnet is already approved, so he will not see the page again. The checklist asks a second person, or records "not seen again". The stand-in prints a made-up URL of that shape and says it is made up. |
| O4 | How long a phone remembers a miss. **Measured by this spec step on 2026-09-29:** `dig SOA tail00000.ts.net` answers NXDOMAIN with `ts.net. 300 IN SOA ns1.dnsimple.com. … 300`, so a resolver that honours RFC 2308 keeps a miss for 5 minutes. The `ts.net` NS set is dnsimple's. | A phone that asks before the record exists keeps failing for up to 5 more minutes after the record appears. | Recorded here. It feeds the owed window change (§4.9). |
| O5 | Whether the CLI, **run as a child of Tortie** rather than of Terminal, can write the serve config without a prompt. | This is the build's first live step. | Believed. The macsys CLI reaches the network extension over XPC (`safesocket/safesocket_darwin.go:55-63`), and Add Machine's `status --json` has run as a child of Tortie since Phase 68. Checklist step 1 measures it. |
| O6 | Whether the foreground funnel survives a sleep and wake, and a Sparkle update of Tailscale. | Tortie restarts it on exit (§4.2.7) and re-reads on wake (§4.3). | Checklist step 5. |
| O7 | Latency and reliability through the relay. The bandwidth limits are unpublished. | Whether a pull feels worse than it does today. | Checklist step 8. |
| O8 | Whether `NWConnection` presents a client identity on iOS 18.3 and 26.3 from a Keychain key (the Simulator), and from a Secure Enclave key (a device). | This is research 132 §9 condition 1, on the phone. | The Simulator half is the verifiers' `test:ios` rows, under the lock (§7.3). The device half is checklist step 3. **If neither client can present an identity on iOS 18.3, the phase STOPS and goes to him**, as the entry says. |

---

## 3. Where the entry is wrong or stale at this head

| # | The entry says | What is true | What this spec does |
| --- | --- | --- | --- |
| 1 | S0: the ATS and client-identity runs are "the builders', in the Simulator" | This run's rules forbid builders and the integrator to boot a Simulator. Only verifiers may, under the lock. | **The client is `NWConnection`**, which is research 132 §9 condition 8's default. Only a Simulator run could move it, and that run is not the builders'. The identity rows become `test:ios` rows that the verifiers run on 18.3 and 26.3 (§7.3). The URLSession-on-a-name arm is recorded by a verifier for the record, and it cannot change this round. Builders measure the Swift client on macOS instead, against a loopback Node door, with an in-memory identity (§5.3 item 4). |
| 2 | S1.4: the sentences live in `src/shared/ipc/pocket.ts` "beside `DOOR_SENTENCES`" | `DOOR_SENTENCES` is in `src/main/pocket/bind.ts:274-286`, not in the contract | The Funnel sentences go in the contract as `POCKET_FUNNEL_SENTENCES`, because the sheet draws them. The listener's sentences stay in `bind.ts`, cut down to the refusals that still exist (§4.5). |
| 3 | S6.2: "The Go runtime's two categories leave `ios/Tortie/PrivacyInfo.xcprivacy`" | The app's own manifest already declares `NSPrivacyAccessedAPITypes` empty. The Go categories live in TailscaleKit's own manifest, which `build/build-tailscalekit.mjs` writes into each slice. | The app's manifest loses only its comment about the Go runtime (lines 4-12). Rule (o) loses its framework half. |
| 4 | S6.7: Copy loses "the four tailnet sentences" | There are **five**. `tailnetUnavailable` (`Copy.swift:244`) goes too. And `pairPrivateNetwork` ("Tortie brings its own private network…", `:190`) becomes FALSE. | All five go. `pairPrivateNetwork` becomes "There is nothing else to install." The approved mock's line (`docs/design/phone/Pairing.html:59`) and `build/p311/copy-drift.mjs:289-292` move with it, as 316.2 moved one mock line and named it. |
| 5 | Parent-commit measurement: Settings → Phone's rectangles "are equal" | They cannot be. The entry deletes the disclosure drawn at rest (`PhoneSection.tsx:503-523`), and the Pair card's resting face changes from a line to a **Pair** button (§4.10). | The measurement asserts that, for a person who never turns the door on, the rectangles differ by exactly those two elements and nothing else moves, beyond the shift they cause. Tailscale program spawns, listening sockets and Tortie's own utility processes are all zero, and quit time is equal. |
| 6 | S5.2: "When the door is off, `Pair a Phone…` draws the door's lines with ONE button" | The lines name the public name, the tailnet, the port and the program, and none of them is known without reading Tailscale. The parent measurement forbids a spawn from merely opening the sheet. | **Pair** is the press that reads Tailscale and draws the lines. **Allow** is the ONE press that confirms, starts and shows the code. That is two presses on the Mac, which is research 132 §2's own "1 to 2". |
| 7 | "What is NOT in this phase: No longer pairing window. It grows only if his measurement shows public DNS beyond 3 minutes, and then as its own change" | His measurement shows about 8 minutes (M5), so the condition has fired | **The window stays 3:00 here, because the entry refuses the change inside this phase.** The phone says exactly why a first scan fails, and the Mac's line says to press Pair again. The change is owed as its own entry, carrying his 8 minutes and the 5-minute negative cache measured in O4. The main session queues it (§4.9). |
| 8 | S3.1: the door "listens on `127.0.0.1:<doorPort>`" with bind.ts's rule 2 (a taken port refuses) implied | The phone is now told the PUBLIC port, never the local one. Rule 2's reason was "a phone was told this number". | The local port is **ephemeral** (`listen(0)`), and the Funnel target is the port the listener reported. The public port keeps rule 2: a confirmed `publicPort` that is taken refuses and never moves. `conformance:pocket` L4 is rewritten to match (§6.1). |
| 9 | S2.2: the hash "gains … `publicPort`" | The hash also still carries `port` (`pairing.ts:215`), which would be the ephemeral local port | `port` leaves with `bindAddress`, and the store's `port` becomes `publicPort`. |
| 10 | S4.5: "A v:2 phone reads 'This iPhone is not paired with a Mac.'" | That holds for the NEW app with an old record: record `pairing-v1` is refused, removed, and the phone draws `notPaired`. Today's TestFlight build scanning a v:3 code reads "That is not a Tortie pairing code." (`unsupportedCode` → `Copy.pairNotACode`). | The checklist says both. |
| 11 | S7: `build/p313/hostile-client.mjs` "dials through the stand-in funnel" | The hostile client runs in the ordinary battery and starts no process | It drives the listener **in-process** and writes each PROXY v2 header itself, honest or forged, with its own encoder. That encoder is a second spelling on the attacker's side, which is the point. The real stand-in carries traffic in `probe:p330`, `probe:p313`, `probe:p314` and `probe:p316`. |
| 12 | (not named) `src/main/harness/push-seam.ts`, `build/probe-p313.mjs`, `build/probe-p314.mjs`, `build/p316/probe-p316.mjs`, `build/p316/node-phone.mjs`, `build/p316/hostile-door.mjs`, `build/p316/vectors.mjs`, `build/p311/copy-drift.mjs`, `DEVELOPMENT.md` | Each one names `GMUX_POCKET_LOOPBACK`, `tk`, the address pin or `present(body, from)` (`push-seam.ts:111`, `:623-625`, `:699`, `:705`, `:714`; `probe-p314.mjs:1263`; `probe-p313.mjs:734`; `probe-p316.mjs:1020`) | Each has an owner (§5). All four probes run their Tortie against the stand-in. **`probe:p314` is owed a re-run**, because its seam changed (316.1's precedent, and his standing ruling on its two model turns). |
| 13 | (not named) `vendor:tailscalekit` is the only script `gate:checks` clause 8 finds that runs Go (`build/verification-checks.mjs:241`, `:600-607`) | Deleting it leaves the Go harness type with no user | Builder `proof` removes the type and clause 8's requirement together, or keeps a zero-user type if the gate allows one. It says which, and the gate stays green by construction rather than by a floor of zero. |
| 14 | S1.1: `[path, 'status', '--json']` | Tortie needs `Self` and `CurrentTailnet` only | `[path, 'status', '--json', '--peers=false']`. The flag is at `cmd/tailscale/cli/status.go:56` and `:82`, and asks the LocalAPI for StatusWithoutPeers, so the answer never carries the names of his other devices. The CLI's own funnel path makes the same call (`serve_v2.go:447`). |
| 15 | `TAILSCALE_CANDIDATES` at `tailscale.ts:57-61` | It is at `:56-60` | Cited correctly below. |

---

## 4. The design, seam by seam

### 4.1 The pieces, and who talks to whom

```
 iPhone (NWConnection, TLS 1.3, pins fp, presents its client identity)
   │  https://<publicName>:<publicPort>        publicPort ∈ {8443, 10000}
   ▼
 Tailscale Funnel ingress (cannot decrypt: raw TCP)
   ▼
 his tailscaled ──PROXY v2 header, then the TLS bytes──►  127.0.0.1:<localPort>  (ephemeral)
   ▲ serve config: Foreground[<sid>].TCP[publicPort] = {TCPForward: "127.0.0.1:<localPort>", ProxyProtocol: 2}
   │
 the Funnel child   <program> funnel --tcp=<publicPort> --proxy-protocol=2 tcp://127.0.0.1:<localPort>
   ▲ spawned, read, stopped by           src/main/pocket/funnel.ts   (Electron main)
   │
 PocketHost (src/main/pocket/ipc.ts, main): the queue, the gate, the store, the verifier, the answers
   │  postMessage (typed, validated both ways: src/main/pocket/door/wire.ts)
   ▼
 the door process (utilityProcess "Tortie Door", out/main/pocket-door.js)
   net.Server 127.0.0.1:0 → PROXY v2 (limiter key only) → tls.Server (never listens) → pin check
   → http.Server (never listens) → refusals 1-5 → forwards a parsed request → writes main's answer
```

What crosses from main to the door process: the TLS key and certificate PEM, the pins
`{ phoneId, spkiSha256 }[]`, `{ publicName, publicPort }`, `windowOpen`, each answer, and shutdown and stop.

What crosses from the door process to main: `listening { localPort }`, a request (§4.5.2), refusal WORDS for main's
bounded log, and `stopped`.

What never crosses to main: a raw byte from a stranger, the PROXY source address, a header value other than the four
`x-tortie-*`, and the `/pair` body as text (the door process parses its outer JSON; §4.7.2).

### 4.2 The Funnel child — new `src/main/pocket/funnel.ts` (builder `owner`)

**4.2.1 The program.** From `resolveTailscale({ packaged: app.isPackaged, env: process.env })`
(`src/main/machines/tailscale.ts:93-131`). There is no second resolver and no literal path in the domain. The header
of `tailscale.ts` (`:1-32`) gains its second caller and says why: Funnel runs the same pinned program Add Machine
does, for the same reason.

**The development-override refusal. This is new, and it is what stops an agent's run touching his tailnet.** In a
development build, a `GMUX_TAILSCALE_BIN` that is set but not an absolute executable file makes `resolveTailscale`
warn and fall back to the pinned path (`:107-120`). For Add Machine's read that is harmless. For Funnel it would run
HIS REAL Tailscale on his tailnet the moment a probe's wrapper path was wrong. So `funnel.ts` refuses with
`'override-unusable'` whenever the override is set and `source !== 'dev-override'`, and it never falls back. A
packaged build ignores the variable, as today. `conformance:pocket` U2 holds this rule, and every probe also
preflights its wrapper (§6.3).

**4.2.2 The status read.** One `execFile`, no shell, `timeout: TAILSCALE_DEADLINE_MS` and
`maxBuffer: TAILSCALE_MAX_OUTPUT` (`tailscale.ts:43`, `:46`):

```
[program, 'status', '--json', '--peers=false']
[program, 'serve', 'status', '--json']
```

The environment is inherited, exactly as Add Machine's read inherits it (`tailscale.ts:221-238`). The macsys CLI
finds its daemon over XPC and needs `HOME`. A narrowed environment is unmeasured against it, and no agent may run the
real CLI to measure one.

It reads:
- from status: `BackendState`, which must be `Running`. `Stopped` → `not-running`. `NeedsLogin` or
  `NeedsMachineAuth` → `signed-out`.
- `Self.DNSName`, with the trailing dot dropped and lowercased, as `publicName`. Empty → `no-name`.
- `CurrentTailnet.Name` as `tailnet`. A missing `CurrentTailnet` → `signed-out`.
- whether the keys of `Self.CapMap` hold `"https"` and `"funnel"` (`ipn/ipnstate/ipnstate.go:296-299`, `:350-352`).
  That decides `asksApproval`, which draws the standing-right warning beside the lines.
- the `"https://tailscale.com/cap/funnel-ports?ports=…"` key, when present, parsed to a port list.
- from `serve status --json`: which of 8443 and 10000 are held, being any key of `TCP`, any `Web` key ending
  `:<port>`, and the same in every `Foreground[*]` entry. JSON `null` means nothing is served.

A read that fails to parse → `unreadable`. No program → `no-tailscale`.

**When it reads.** At a person's press (the switch on, **Pair**, **Allow**, **Try again**). At the start of every
door job that starts or restarts the child. At `openAtLaunch` only once the store says `enabled` and `bindAtLaunch`.
On wake while the door is on (§4.3). **Never** on opening Settings → Phone, and never on a timer. That keeps
research 127 §7 item 16 in its spirit: nothing about the network is read at bind time without a person or a confirmed
start behind it.

**4.2.3 Choosing the public port.** Keep the stored `publicPort` when it is 8443 or 10000 and not held. Otherwise
take 8443 if it is free, else 10000, else refuse `ports-taken`. Never 443. The port is chosen BEFORE the lines are
drawn, because it is hashed. It is written to the store only by the press that confirms it (switch on, Allow); a
launch never writes it. A confirmed port that is later held refuses `port-taken` and never moves, which is
`bind.ts:15-21` rule 2 carried to the port a phone is now told.

**4.2.4 The argv, exactly.**

```ts
[program, 'funnel', `--tcp=${publicPort}`, '--proxy-protocol=2', `tcp://127.0.0.1:${localPort}`]
```

It is spawned with `shell: false`, `stdio: ['ignore', 'pipe', 'pipe']` and `detached: false`, with the environment
inherited (the reason is in §4.2.2). The flags exist at the pin: `--tcp` at `serve_v2.go:248`, and `--proxy-protocol`
at `:250`, validated as 1 or 2 at `:433-436`. **Never** `--bg`, `reset`, `off`, `clear`, `--https`, `--http`,
`--tls-terminated-tcp`, `--set-path`, `--yes`, `--service`, or any `serve` subcommand other than `serve status --json`,
anywhere in `src/`. The TLS-terminating modes cannot be pinned (`ipn/ipnlocal/cert.go:646`).

**4.2.5 What counts as a start, and every other ending.** Both pipes are read as lines, and each stream keeps at most
64 KiB. Nothing from either stream is logged: they carry the node name and the URL. Only a reason WORD is logged.

- **A counted start.** The child printed `Available on the internet:` (`msgFunnelAvailable`, `serve_v2.go:950`), and
  then a fresh `serve status --json` shows a `Foreground[*]` entry whose `TCP["<publicPort>"]` is
  `{ "TCPForward": "127.0.0.1:<localPort>", "ProxyProtocol": 2 }` with no `TerminateTLS`, and whose
  `AllowFunnel["<publicName>:<publicPort>"]` is `true` (`serve_v2.go:1245`, `ipn/serve.go:432-444`). The read-back is
  tried up to 3 times, 250 ms apart. The whole start, not counting an approval wait, has a 20 s deadline
  (`FUNNEL_START_DEADLINE_MS`).
- **Approval.** A trimmed stdout line that parses as a URL (the CLI prints it after nine spaces,
  `serve_legacy.go:814-818`) puts the start into `approval`. `approvalOpens` is true only when it is
  `new URL(line)` with protocol `https:`, hostname exactly `login.tailscale.com`, no port, no username and no
  password. Otherwise `approvalText` carries the URL as text and Tortie never opens it. The wait is bounded at
  10 minutes (`FUNNEL_APPROVAL_WAIT_MS`) and races the press's `superseded` promise. `Success.` (`serve_legacy.go:863`)
  followed by a counted start ends it.
- Any exit before a counted start is a refusal. **An exit with code 0 is a refusal too.** The rules are applied in
  this order, and the first to match wins:

| Seen | `PocketFunnelRefusal` | Source |
| --- | --- | --- |
| stderr has `shields-up` | `shields-up` | `ipn/ipnlocal/serve.go:329-331` |
| stderr has `is not allowed for funnel`, or `Funnel not available` | `funnel-ports` (the first), `not-approved` (the second) | `ipn/serve.go:612-628` |
| stderr has `listener already exists for port`, `foreground listener already exists`, `is already serving`, or `already serving web` | `port-taken` | `ipn/ipnlocal/serve.go:1686`, `:1695`, `:1709`; `serve_v2.go:1230` |
| stderr has `Another client is changing the serve config` | `busy` | `serve_v2.go:536-537` |
| exit 0, and a URL was printed | `not-approved` | `serve_legacy.go:820-826` (a non-admin lands here) |
| the approval wait passed 10 minutes | `approval-timeout` | — |
| anything else, exit 0 included | `failed` | — |

**4.2.6 Stopping, and the orphan.**
- **Stop.** SIGINT, which is the child's documented exit (`serve_v2.go:395`) and makes tailscaled delete the
  foreground session (`ipn/ipnlocal/local.go:3181`, `serve.go:421-431`). Wait up to 2 s. Then SIGTERM, wait 1 s,
  then SIGKILL by pid. It runs inside a `finally` of every door job that started a child, and inside `joinFunnel()`
  at quit. A SIGKILLed CLI still ends its session: the bus watch closes and tailscaled's deferred delete runs.
- **The record.** Straight after the spawn, `/bin/ps -p <pid> -o lstart=` and `/bin/ps -p <pid> -ww -o command=` are
  run through `execFile`, with `env: { LC_ALL: 'C', TZ: 'UTC0' }` so both reads format alike.
  `{ pid, lstart, command, argv, at }` is written to `<userData>/gmux/pocket-funnel.json` at 0o600, with its directory
  at 0o700 (`conformance:pocket` W1). The COMMAND AS `ps` PRINTS IT is what is matched. The spawn argv is kept for the
  log only, because a stand-in run through `/bin/sh` and the real CLI print differently. The record is deleted after
  a clean stop.
- **The sweep.** It runs at the start of every door job that would spawn, so also at launch before anything starts.
  If the record exists, its command must first END IN THE ARGV TORTIE SPAWNS, `funnelArgv(publicPort, localPort)`
  with the public port in `FUNNEL_PORTS` (` funnel --tcp=8443` or `10000`, `--proxy-protocol=2`,
  `tcp://127.0.0.1:<port>`), compared by `recordNamesFunnelChild` against `funnelArgv` itself (added in the fix round
  after his ruling of 2026-09-29). A record naming anything else is no proof, whatever `ps` would say of its pid: it
  is removed, `ps` is not asked, nothing is signalled, and the log says
  `left a process alone: its record names no Funnel child`. Otherwise `ps` reads the pid. When `lstart` and `command` both equal the record, the process is ended
  by the stop above, and the log says `ended a Funnel child a previous run left behind`. When fewer match, nothing is
  signalled and the log says `left a process alone: it does not match the record`. The record is deleted either way,
  unless a matched process is still alive after the SIGKILL. That record is kept, and the start refuses
  `port-taken`.
  No record means no `ps` at all, so a person who never turned the door on spawns nothing.
- **Named residual.** A crash in the milliseconds between the spawn and the record leaves a child Tortie cannot
  prove it started. The next start then refuses `port-taken` with its sentence.

**4.2.7 Restart after an unexpected exit.** It happens only while the door is on and a counted start had happened,
and only from inside a queued job whose press is still the last press. Each attempt does a fresh read, and it must
return exactly the confirmed `funnelProgram`, `tailnet`, `publicName` and `publicPort`. **A moved field never
restarts: the door closes (child, then door process), the gate reads `changed`, and the sheet draws the new lines.**
Attempts are spaced from 2 s, doubling to 60 s (`FUNNEL_RESTART_FLOOR_MS`, `FUNNEL_RESTART_CAP_MS`). A counted start
resets the spacing. While the child is down, `status.funnel.state` is `restarting` and the sheet draws
`POCKET_FUNNEL_RESTARTING`. The timer is cleared by every stop and by `beginFunnelShutdown()`. The door process
exiting unexpectedly takes the same path: the child is stopped first, then the whole door restarts.

### 4.3 The child's life against the switch queue (Phase 316.1)

The queue stays the only way the door starts or stops (`ipc.ts:497-513`, `serially`). It now carries three things.

**`openNow(press)`** does the following in order:
1. superseded? return.
2. `mayOpen()`: the gate is asked first.
3. `beforeOpen`, raced against the press.
4. superseded? `mayOpen()` again.
5. The orphan sweep.
6. `readTailnet()`. Its fields must equal the confirmed ones, or it records `changed` and returns.
7. superseded?
8. `startPocketDoor` (the door process listens on `127.0.0.1:0`).
9. superseded? Then stop the door process and return.
10. `startFunnel` with `localPort`, raced against the press. The approval wait lives here.
11. superseded, or refused? The child's stop and the door's stop run in a `finally`.
12. The counted start: `publishedAt = now`, and the state is `listening`.
13. `closeNowUnlessConfirmed()`, as today (`ipc.ts:607`).

`closeNow()` stops the child first (to unpublish), then the door process, then clears the verifier and cancels the
window (`ipc.ts:637-642`). `recoverNow(press)` is §4.2.7.

**No IPC answer waits on Tailscale's approval.** `setDoor({on:true})` and `confirmDoor` return once the start is
QUEUED and `status.state` is `opening`. The sheet follows `pocket:changed`. That keeps the renderer's `busy` short,
and leaves the switch pressable during an approval: an off press supersedes the start and ends the child at once. A
test helper `host.idle()` resolves at the queue's tail, so `switch-queue.test.ts` still asserts after the last press
settles. Other presses (Remove, the alerts switch, **Allow**) wait their turn behind a start that is waiting on
approval, bounded at 10 minutes. That is stated as a limit.

**Wake.** `WakeMark` already composes `powerMonitor` (`capabilities.ts:343-344`). While the door is on, a resume
queues one check job: `serve status --json` must still show the foreground entry. If it does not, recovery runs. It
spawns only when the door is on.

**`beginPairing`** re-reads `serve status --json` before it opens a window, and refuses with the restart path if the
entry is gone. A code is never drawn for a door Tailscale stopped publishing. `beginPairing` becomes `async`.

### 4.4 The confirm hash — `src/main/pocket/pairing.ts` (builder `owner`)

```ts
export interface PocketPhoneFields {
  readonly id: string;            // phoneIdOf(signingKey), unchanged
  readonly label: string;
  readonly signingKey: string;    // Ed25519 SPKI b64u
  readonly exchangeKey: string;   // X25519 SPKI b64u
  readonly clientKey: string;     // P-256 SPKI b64u, NEW — the key its TLS handshake must complete with
  readonly pushToken: string;
  readonly pushEnvironment: '' | 'development' | 'production';
}                                 // `address` is GONE (pairing.ts:183-184)

export interface PocketExecutionFields {
  readonly funnelProgram: string; // the absolute path the child runs (resolveTailscale's answer)
  readonly tailnet: string;       // CurrentTailnet.Name
  readonly publicName: string;    // Self.DNSName, no trailing dot, lowercase
  readonly publicPort: number;    // 8443 | 10000
  readonly bindAtLaunch: boolean;
  readonly routes: readonly PocketRouteId[];
  readonly phones: readonly PocketPhoneFields[];
  readonly pushAlerts: boolean;
}                                 // `bindAddress` and `port` are GONE (pairing.ts:213-215)
```

- `NORMALIZE` (`:249-271`) gets one line per field. The mapped type makes a missing line a compile error. Each phone
  row emits `[id, label, signingKey, exchangeKey, clientKey, pushToken, pushEnvironment]`.
- `POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v3'`. Every record written today reads `changed` and asks
  again, which is the safe direction.
- `EMPTY_POCKET_FIELDS` gets `''`, `''`, `''` and `0` for the four new fields.
- The store (`PocketStore`, `:584-602`): `port` becomes `publicPort`, and `0` means none chosen. A phone row without
  a valid P-256 `clientKey`, including every row written by 316, is dropped WHOLE (`phoneRowOf`, `:722-756`).
  `readPocketStore` answers how many it dropped. `PocketStatus.droppedPhones` carries the count, and the sheet draws
  `PHONES_DROPPED` once.
- **The store also keeps the last successful read's facts**, as `tailnetFacts: { funnelProgram, tailnet, publicName }`.
  None of them is secret, and the store is sealed.
  - `fields()` uses this run's read when there is one, and otherwise the stored facts.
  - A read that answers different facts replaces both, which moves the hash, and the gate asks again.
  - **Why:** Phase 314's `pushDestinations` reads the confirmed fields and never the socket (`ipc.ts:949-968`). Without
    stored facts, a relaunch with Tailscale off would hash to something nobody confirmed, and would silently stop
    every alert. The sheet would also say the door "changed" when Tailscale is merely off.
  - The facts are observations, not choices: writing them confirms nothing. The start still re-reads before it spawns
    (§4.3 step 6).
- **The pair fingerprint covers all three keys.** It is `tortie-pocket-fp-v2\n<ek>\n<xk>\n<ck>`, six groups of four
  as today (`:886-891`). That way the six groups a person compares cover every key the Mac will trust. Binding `ck`
  only by a signature would be a property that only the code checks. `pairFingerprint(signingKey, exchangeKey,
  clientKey)` is exported, and the Swift `DoorSignature.pairFingerprint` matches it through the vectors.
- `describePocketDoor` (`:355-394`) draws these lines, in this order, one each:

```
Answers on the internet at https://<publicName>:<publicPort>, through Tailscale Funnel on <tailnet>
Publishes it with <funnelProgram>
Starts answering when Tortie starts | Answers only after you turn it on
Answers these and nothing else: blocked, pair, session, turns
<the push line, unchanged>
Allows the phone "<label>", key <pairFingerprint(ek, xk, ck)>        (no address)
<the per-phone push line, unchanged>
Allows no phone yet                                                  (when none)
```

`neverConfirmedRefusal`, `changedRefusal` and `sealUnknownRefusal` (`:412-433`) say "publish this door" where they
said "answer from your tailnet". Everything else about them is unchanged.

### 4.5 The door process — `src/main/pocket/door-process.ts`, `src/main/pocket/door/**`, `src/main/pocket/bind.ts` (builder `door`)

**4.5.1 Build and fork.** `electron.vite.config.ts` gains a main input `'pocket-door': resolve(__dirname,
'src/main/pocket/door-process.ts')`, emitted as `out/main/pocket-door.js`. It sits beside the two workers at `:70-96`,
and that comment gains a line: a `utilityProcess` is a process and not a thread, so it is outside research 19 §O5's
worker budget.

`bind.ts` forks it with `utilityProcess.fork(join(__dirname, 'pocket-door.js'), [], { env: {}, stdio: 'ignore',
serviceName: 'Tortie Door' })`. `allowLoadingUnsignedLibraries` stays at its default, false (refusal 6).
`serviceName` names the process in `app.getAppMetrics()`. The probes count it from `ps` instead (§7.2 arm 1).

`DOOR_SENTENCES` (`bind.ts:274-286`) keeps `bind-failed`, `no-certificate` and `quitting`. It gains `door-exited`:
"The door stopped unexpectedly, so nothing is answering. Tortie is trying again."


Tests and the hostile client use `inProcessDoor`, from `door/in-process.ts`. It runs the same `createDoorListener`
in the calling process, behind the same `DoorSpawner` interface. That is how vitest, which has no `utilityProcess`,
drives a real TLS door.

**4.5.2 The wire** — `src/main/pocket/door/wire.ts`. Types and validators only, and both sides validate every
message. A message that does not validate is dropped and counted, never half-read.

```ts
export interface DoorPin { readonly phoneId: string; readonly spkiSha256: string }   // base64url sha256 of the SPKI DER
export interface DoorSignatureHeaders {
  readonly 'x-tortie-phone': string; readonly 'x-tortie-timestamp': string;
  readonly 'x-tortie-nonce': string; readonly 'x-tortie-signature': string;
}
export interface DoorPresentation { readonly iv: string; readonly ct: string; readonly tag: string; readonly ek: string; readonly sig: string }

export type ToDoor =
  | { kind: 'start'; generation: number; tls: { key: string; cert: string }; pins: DoorPin[];
      host: { name: string; port: number }; windowOpen: boolean }
  | { kind: 'update'; pins?: DoorPin[]; windowOpen?: boolean }
  | { kind: 'answer'; id: number; status: 200 | 404; body: string | null }
  | { kind: 'shutdown' }                       // admission closes, synchronously on arrival
  | { kind: 'stop' };                          // close, join bounded, then 'stopped'

export type DoorRequest =
  | { route: 'pair'; presentation: DoorPresentation }
  | { route: 'blocked' | 'session' | 'turns'; method: 'GET'; target: string; headers: DoorSignatureHeaders;
      body: Uint8Array; channel: string }      // channel = the phoneId whose pin completed THIS handshake

export type FromDoor =
  | { kind: 'listening'; localPort: number }
  | { kind: 'refused'; reason: 'bind-failed' }
  | { kind: 'request'; id: number; generation: number; request: DoorRequest }
  | { kind: 'refusal'; word: DoorRefusalWord }
  | { kind: 'stopped'; accepted: number; joined: boolean; waitedMs: number };

export type DoorRefusalWord = 'proxy' | 'source-cap' | 'capacity' | 'handshake' | 'no-certificate'
  | 'unknown-key' | 'server-name' | 'host' | 'route' | 'window' | 'oversized' | 'malformed' | 'shutdown';
```

The bounds, checked by both validators: `target` ≤ 1,024 characters. Each header: phone 1-64, timestamp 1-20,
nonce 16-64 (`pairing.ts:1498-1499`), signature 1-128. `body` ≤ `POCKET_READ_BODY_CAP_BYTES`, which is 1,024
(`server.ts:92`). Each presentation field is base64url, with `iv` 16 characters, `tag` 22, `ek` ≤ 128, `sig` 86, and
`ct` ≤ 4,096. An answer's `body` ≤ 2 MiB.

**4.5.3 `bind.ts` keeps the door's life and loses the listener.** It keeps and exports:

```ts
export interface DoorStartInput {
  readonly handle: DoorRequestHandler;              // server.ts's
  readonly publicHost: { readonly name: string; readonly port: number };
  readonly pins: readonly DoorPin[];
  readonly windowOpen: boolean;
  readonly identity?: (options: IdentityOptions) => IdentityOutcome;   // tests; default ensureDoorIdentity
  readonly identityPath?: string;
  readonly spawn?: DoorSpawner;                    // tests: inProcessDoor; default: the utilityProcess
}
export type DoorStartResult =
  | { ok: true; localPort: number; certificateFingerprint: string; publicKeyFingerprint: string; shortFingerprint: string }
  | { ok: false; reason: DoorRefusalReason; sentence: string };
export type DoorRefusalReason = 'bind-failed' | 'no-certificate' | 'quitting' | 'door-exited';
export type DoorRequestHandler = (request: DoorRequest, door: DoorAdmission) => Promise<DoorAnswer>;
export interface DoorAnswer { readonly status: 200 | 404; readonly body: string | null }

export function startPocketDoor(input: DoorStartInput): Promise<DoorStartResult>;
export function updatePocketDoor(update: { pins?: readonly DoorPin[]; windowOpen?: boolean }): void;
export function stopPocketDoor(): Promise<DoorStopReport>;
export function pocketDoorStatus(): DoorStatus;   // { listening, localPort, certificateFingerprint, publicKeyFingerprint, shortFingerprint, lastRefusal, sentence }
export function onPocketDoorExit(cb: () => void): () => void;   // the process died unasked
export function beginPocketShutdown(): void;       // sync: quitting = true, posts {kind:'shutdown'}
export function pocketShutdownStarted(): boolean;
export function pocketDoorShuttingDown(): boolean;
export function joinPocketDoor(): Promise<DoorStopReport>;
```

The identity is ensured with `names: { addresses: [], dnsNames: [publicName] }`. `ensureDoorIdentity` renews from the
same key when the names change (`tls.ts:412-421`), so a new public name never moves the pin.
`IDENTITY_SENTENCES['no-subject-names']` (`tls.ts:159-160`) becomes "Tortie has no name to put in the door's
certificate, so there is nothing to serve."

**Deleted:** `TAILNET_IPV4_RANGE`, `TAILNET_ULA_PREFIX`, `TAILNET_NETMASK`, `isTailnetIpv4`, `tailnetCandidates`,
`chooseTailnetAddress`, `pocketBindAddress`, `doorAddressIsStale`, `addressIsStale`, `isSelfOrigin`,
`HARNESS_LOOPBACK_ENV` and `harnessLoopback`, and the `no-tailnet-address`, `address-unavailable`, `port-taken` and
`invalid-port` refusals.

The header's rule 1 is rewritten: **the door binds `127.0.0.1` on an ephemeral port and nothing else, and it is
reached from outside only through the Funnel a person confirmed.** Rule 2 moves to `funnel.ts` for the public port.

The stop keeps `GmuxHookServer`'s shape (`bind.ts:59-69`). Admission closes on the first line: main refuses every
forwarded request from then on, and posts `shutdown`. Main then posts `stop`, the process joins its accepted requests
for up to `DOOR_STOP_JOIN_MS` (1 s) and closes for up to `DOOR_STOP_CLOSE_MS` (1 s), and replies `stopped`. Main
`kill()`s the process 2 s after `stop` if it has not exited. A stopped door is never revived: a new start forks a new
process with a new `generation`.

**Refusal 7 by instance.** Main keeps a map from `generation` to the `DoorAdmission` of that process. `stopping()` is
true from the first line of that process's stop. A request is answered only if its generation's door has not begun to
stop, with nothing awaited between that question and the post (`server.ts:252-263` today).

**4.5.4 Logging.** The door process imports no logger: `electron-log` is `main/log/`'s alone
(`build/assert-import-boundaries.mjs:175-182`). It posts refusal WORDS. Main writes one line per word per process,
`refused a connection at the door: <word>`, beside its own `refused a request at the door: <word>`
(`server.ts:176-181`). No address, no name, no header value and no byte is ever in a line.

### 4.6 The listener — `src/main/pocket/door/listener.ts`, `door/proxy-v2.ts`, `door/send.ts`, `door/table.ts` (builder `door`)

In order. Every step destroys the socket on refusal and posts the word.

0. **Capacity.** `net.createServer`, **THE ONE `listen` IN THE DOMAIN**: `listen(0, '127.0.0.1')`. Its
   `maxConnections` is `MAX_CONNECTIONS` (32, `bind.ts:99`, which moves to `door/limits.ts`).
1. **PROXY v2** (`door/proxy-v2.ts`, pure). The first 16 bytes must be the v2 signature
   `0D 0A 0D 0A 00 0D 0A 51 55 49 54 0A`, then `0x21` (version 2, PROXY; LOCAL and everything else are refused), then
   family `0x11` (TCP4) or `0x21` (TCP6), then a big-endian length of at least 12 or 36 and at most 216. The whole
   header is read within 5 s (`PROXY_HEADER_TIMEOUT_MS`), and anything else is `proxy`. A connection with no header
   is refused `proxy`. That is not a security property, because any local process can write one. It is so the
   limiter always has a key. Tailscale formats this header with `go-proxyproto` and no TLVs
   (`ipn/ipnlocal/serve.go:710-765`); TLVs within the length are skipped, never read.
2. **The limiter** (`door/limits.ts`) is **THE ONLY READER OF THE PROXY SOURCE.** At most 4 open connections per
   source IP (`PER_SOURCE_MAX`), counted from the header to the close, else `source-cap`. The source never reaches
   `DoorRequest`, a log line, the hash or the verifier (`conformance:pocket` P1).
3. **TLS.** `tlsServer.emit('connection', socket)` into a `tls.createServer` that never listens, with
   `{ key, cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false, handshakeTimeout: 10_000 }`.
   - **TLS 1.3 only, and why:** under 1.2 the client certificate crosses Funnel's relay in the clear, which would
     hand Tailscale a stable identifier for the phone. Under 1.3 it is encrypted.
   - **Why `rejectUnauthorized: false`, and what replaces it.** There is no certificate authority to chain a phone's
     certificate to. If OpenSSL were asked to verify a chain, it would refuse every phone, or it would need the door
     to act as a CA. **The pin in step 4 IS the verification, and it is not optional.** Every socket either completes
     the pin check or is destroyed, before the HTTP server is handed it. A certificate-less socket is the one
     exception: it is admitted only while a person holds a pairing window open, and only to `POST /pair`. No other
     code path may call `httpServer.emit('connection', …)`. `conformance:pocket` M1 pins that shape, and an ablation
     that removes the pin check must go red. The same reasoning is `tls.ts`'s and the phone's since Phase 313: the
     key pin replaces the chain in both directions.
   - **Measured, not assumed:** bytes the header read already buffered (the ClientHello in the same TCP segment)
     must reach TLS. The listener tests drive the header and the ClientHello in ONE write and byte by byte. If
     handing the `net.Socket` over loses buffered bytes, the fallback is a `stream.Duplex` that replays them first.
     The builder says which one measured.
4. **At `secureConnection`, before any other listener sees the socket.** In this order:
   - SNI (`tlsSocket.servername`) must equal `publicName`, else `server-name`.
   - `peer = tlsSocket.getPeerX509Certificate()`.
   - With a peer: `sha256(peer.publicKey.export({type:'spki', format:'der'}))` in base64url must be a pin, else
     `unknown-key`. `channel` becomes that pin's `phoneId`.
   - With no peer: allowed only while `windowOpen`, else `no-certificate`, and then `channel = null`.
   - **Only then** `httpServer.emit('connection', tlsSocket)`, into an `http.createServer` that never listens.
   - **No `data`, `readable` or `on('connection')` HTTP handling is attached to a TLS socket before this point**
     (`conformance:pocket` M1).
   - A pins `update` destroys every open socket whose `channel` is no longer pinned.
5. **HTTP.** `maxHeaderSize: 8192`, `headersTimeout` 10 s, `requestTimeout` 15 s, `keepAliveTimeout` 5 s. Refusals
   1-5 move here from `server.ts:193-221`:
   - (1) shutdown.
   - (2) `Host` must equal exactly `<publicName>:<publicPort>`, else `host`.
   - (3) the method and path, by equality, against the closed table, else `route`.
   - (4) `/pair` needs `windowOpen`, else `window`. A connection with `channel === null` may reach `POST /pair` and
     nothing else, else `route`.
   - (5) the body cap, dropped whole, else `oversized`.
   - For `/pair`, the outer JSON is parsed here, strictly: an object with exactly `iv`, `ct`, `tag`, `ek` and `sig`,
     each base64url within the bounds of §4.5.2, else `malformed`. So main never runs `JSON.parse` on a stranger's
     bytes.
6. **Forward** the `DoorRequest`, await `answer`, and write it through `sendPocket` (`door/send.ts`, moved from
   `server.ts:149-164`). It is the ONE writer. It sets `Referrer-Policy: no-referrer`, `Cache-Control: no-store`,
   `X-Content-Type-Options: nosniff`, `Content-Type: application/json; charset=utf-8` on a body, and **always an
   explicit `Content-Length`, `0` included**. It never sets `Transfer-Encoding` and never streams. The phone's parser
   relies on this (`conformance:pocket` C1).

**The closed table moves** to `door/table.ts` (`POCKET_ROUTES`, `matchPocketRoute`, `PocketRoute`, byte for byte from
`routes.ts:105-158`). `routes.ts` re-exports it, so no importer moves. `conformance:pocket` R1 and R4 are re-pointed at
the new file, with R4's membership sha256 unmoved.

**Main's side** — `src/main/pocket/server.ts`. `createPocketHandler(deps)` returns a `DoorRequestHandler`. It keeps
refusal 1 again, then 6 and 7, and composes. `normalisePocketAddress`, `readBody` and `sendPocket` leave it. Its deps:

```ts
export interface PocketHandlerDeps {
  shuttingDown(): boolean;
  pairingWindowOpen(): boolean;
  present(presentation: DoorPresentation): PocketPairAnswer;
  verify(input: { method: string; target: string; body: Buffer; channel: string | null; headers: DoorSignatureHeaders }):
    { ok: true; phoneId: string } | { ok: false; reason: PocketRefusalReason };
  stillPaired(phoneId: string): boolean;
  answer(route: PocketRoute, query: URLSearchParams): Promise<unknown | null>;
}
```

`/pair` is answered `200 { "state": … }`, with the certificate only on `allowed` (§4.8.3). Every refusal is
`404, null`, exactly as today.

### 4.7 Identity at the handshake (builder `owner` on the Mac, builder `phone` on the iPhone)

**4.7.1 The client key** is minted by the phone when a code is scanned (`begin`). It is a P-256 key created by
`SecKeyCreateRandomKey` with:
- `kSecAttrIsPermanent: true`;
- `kSecAttrApplicationTag` = `tortie.client.<random 16 hex>` (one tag per attempt);
- `kSecAttrTokenIDSecureEnclave` when `SecureEnclave.isAvailable`, else a software key;
- ThisDeviceOnly BY CONSTRUCTION ON BOTH PATHS (`conformance:ios` n), restated on **his ruling of 2026-09-29,
  "Accept it, land 330"**:
  - **the enclave path**: an access control asking `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` with
    `.privateKeyUsage`, made inside the `if` on `SecureEnclave.isAvailable` and nowhere else. The promise is the
    enclave token (`kSecAttrTokenID` = `com.apple.setoken`) and an access control whose protection is
    ThisDeviceOnly: `cku` or `aku`, never a class without "ThisDeviceOnly", never synchronisable. On the Simulator
    (iOS 26.3.1 and 18.3.1, where `SecureEnclave.isAvailable` is true) it reads back
    `<SecAccessControlRef: cku;dacl(true)>`, usable after the first unlock since restart and on this device only,
    and its `kSecAttrAccessible` attribute reads `dk`. He accepted that protection, so the enclave key is no longer
    promised `aku`;
  - **the software path**: `kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, said by the key
    itself, which reads back `aku`. `test:ios` forces this path through a DEBUG-only seam on the store
    (`softwareKeyDebugSeam`, held by `conformance:ios` d), because the Simulator has an enclave.

Its SPKI (the 26-byte header, `SPKI.p256Header`, plus the 65-byte point) is `ck`. **Every pairing attempt that ends
without being paired deletes its key by tag**, and a test counts the app's `tortie.client.` items after each failure
path. `forget()` and a fresh install delete the key and certificate with the record.

**4.7.2 The presentation proves the key it names.** It is sealed under `ps` as today (`pairing.ts:1175-1216`) and
also signed:

```
inner  = {"ck":…,"ek":…,"label":…,"xk":…[,"ape":…,"apt":…]}          (keys sorted, as today's encoder)
key    = HKDF-SHA256(ps, salt = empty, info = "tortie-pocket-pair-v1", 32)          (unchanged)
(iv, ct, tag) = AES-256-GCM(key, fresh 12-byte iv, inner)
challenge = base64url(HKDF-SHA256(ps, salt = empty, info = "tortie-pocket-challenge-v1", 32))
proof  = "tortie-pocket-present-v1\n" + challenge + "\n" + iv + "\n" + ct + "\n" + tag   (the base64url strings)
body   = {"ct":…,"ek":<Ed25519 SPKI b64u>,"iv":…,"sig":<b64u Ed25519(ek_priv, proof)>,"tag":…}
```

**4.7.3 `present(presentation)` on the Mac.**
- No window → `refused`.
- `ek` must be an Ed25519 SPKI, and `sig` must verify over `proof`, with the window's `challenge` computed at `open`
  and **kept past the shred until the deadline**. Otherwise → `refused`.
- If the window is allowed → `allowed` with the certificate, only when `ek` is the allowed phone's; else `refused`.
- Otherwise the seal is opened with the secret. The inner `ek` must equal the outer `ek`. `ck` must be a P-256 SPKI
  (`createPublicKey`: `asymmetricKeyType === 'ec'`, `namedCurve === 'prime256v1'`) and must not be a paired phone's
  `clientKey`. The push fields are as today. Then it is `pending`, and a second presenter replaces the first
  (`:1166-1172`, unchanged).

`presentedFrom` and the `from` argument are deleted.

**4.7.4 The certificate.** `allow` (`:1294-1330`) records the agreement, saves the phones, updates the door process's
pins (`updatePocketDoor`) and then issues:

```ts
// src/main/pocket/tls.ts
export function issueClientCertificate(doorKeyPem: string, clientKeySpkiB64u: string, now: number): Buffer; // DER
```

Built with the same `der*` helpers (`tls.ts:565-643`):
- v3, a 16-byte positive serial, `ecdsa-with-SHA256`;
- issuer CN `Tortie`, subject CN `Tortie phone`;
- notBefore `now - 5 min`, notAfter `99991231235959Z` (RFC 5280 §4.1.2.5, "no well-defined expiration"; the Mac
  never reads the dates, because the pin is the check);
- extensions: basicConstraints critical `cA` false, keyUsage critical `digitalSignature`, and extKeyUsage
  `clientAuth` (`1.3.6.1.5.5.7.3.2`);
- signed by the door's key, taken from `pocketTlsMaterial()` (`tls.ts:390`).

The window keeps it until the deadline, so every `allowed` answer carries the same certificate. It is public
material, so it is not zeroed, and it is never stored on the Mac.

**4.7.5 The pin and the channel.** `clientKeyPinOf(clientKey) = base64url(sha256(DER))` in `pairing.ts`. The door
process's pins are `fields().phones.map(p => ({ phoneId: p.id, spkiSha256: clientKeyPinOf(p.clientKey) }))`.

In the verifier (`:1480-1541`), the address check (`:1506`) becomes
`if (input.channel !== phone.id) return { ok: false, reason: 'channel' }`, asked straight after the phone is found.
`PocketRefusalReason` loses `'source-is-door'` and `'address'` and gains `'channel'`. A thief now needs the client key
(Secure Enclave, non-extractable where the device has one) AND the signing key, so there are still two secrets.

**4.7.6 Revoking** is Remove, unchanged in meaning. The store write comes before the first await, then
`forgetPocketDoor()`, then `closeUnlessConfirmed()`, which stops the child and the door process (`ipc.ts:868-887`).
The next Allow restarts both, with the removed phone's pin gone.

### 4.8 The wire formats, byte for byte

**4.8.1 QR v:3.** `POCKET_QR_VERSION = 3`. Key order is `JSON.stringify`'s, in this order:

```json
{"v":3,"host":"<publicName>","port":<publicPort>,"fp":"<spkiPinOf(door)>","dk":"<Mac Ed25519 SPKI>","dx":"<Mac X25519 SPKI>","ps":"<16-byte secret b64u>","exp":<epoch ms>}
```

There is no `tk` and no address. The phone refuses a code unless all of these hold:
- `v === 3`;
- `host` is lowercase, at most 253 characters, ends `.ts.net`, has at least three labels, and every label is
  `[a-z0-9-]{1,63}` and does not start or end with `-`;
- `port` is 8443 or 10000;
- `fp` decodes to 32 bytes and re-encodes to itself;
- `dk` and `dx` are keys of their kind;
- `ps` is 16 to 64 bytes;
- `exp` is finite and positive.

**4.8.2 The presentation** is §4.7.2.

**4.8.3 `/pair`'s answer** is one of `{"state":"pending"}`, `{"state":"refused"}` and
`{"state":"allowed","cert":"<b64u DER>"}`. `PocketPairAnswer` in `pairing.ts` is
`{ state: 'pending' | 'refused' } | { state: 'allowed'; cert: string }`.

**4.8.4 The request signature, the binding, the phone id and the nonce rules are unchanged** (`:1357-1435`). A signed
read now needs, in addition, a connection whose client key is the phone's (§4.7.5).

**4.8.5 The exported names the vectors call.** Builder `phone`'s `vectors.mjs` imports these, and builder `owner`
exports them under exactly these names:
- `pairFingerprint(ek, xk, ck)`
- `phoneIdOf`
- `pairingBinding`
- `canonicalRequestText`
- `signAsPhone`
- `pairingChallengeOf(secret: Buffer): string`
- `presentationProofText(challenge, iv, ct, tag): string`
- `sealPresentationAsPhone(offerPayload, { label, signingKey, exchangeKey, clientKey, pushToken?, pushEnvironment? }, signingPrivateKey: KeyObject): Buffer`
- `clientKeyPinOf(clientKey): string`
- `spkiPinOf`
- `PocketPairing` (for `open`)
- `issueClientCertificate` (from `tls.ts`)

### 4.9 The pairing window, and what his 8 minutes owes

`POCKET_PAIRING_WINDOW_MS` stays at 3 minutes (`pairing.ts:909`), because the entry refuses a longer window inside
this phase (§3 row 7).

What this phase does about M5 and O4:

- **The phone says what is happening.** A DNS failure (`NWError.dns`) while presenting is retried inside the window,
  as research 132 §3.4 asked. It is **not silent**: the foot line becomes `Copy.pairNameNotYet`. If the window shuts
  while the name still has not resolved, the failure is `PairingFailure.nameNotFound`, drawn as
  `Copy.pairNameNotFound`, which says to press Pair on the Mac again in a few minutes.
- **The Mac says it too.** When a window expires with no presenter within 15 minutes of `publishedAt`,
  `CODE_EXPIRED` is followed by `CODE_FIRST_NAME`: "The first time, your Mac's name can take several minutes to reach
  your phone. Press Pair again." This costs no new state beyond `publishedAt`, which is §4.3 step 12.
- **Owed, as its own entry, for the main session to queue:** "the first code after Tailscale starts publishing lasts
  long enough for the name to reach a phone". The numbers are his 8 minutes (M5), Tailscale's documented 10 minutes
  (kb/1223), and ts.net's 300-second negative cache (O4, measured here). The shape this spec would propose: a window
  opened within 15 minutes of `publishedAt` lasts until `publishedAt + 15 min`, and every other window lasts 3:00.
  The cost is a longer life for a leaked code during a first pairing only, against the card flip and the six-group
  match (research 132 §7.7).

### 4.10 Settings → Phone — `src/renderer/settings/PhoneSection.tsx` (builder `owner`)

**Faces.**

- **The door card.**
  - The switch **Let my phone reach this Mac**, with `doorLine`:
    - `off` → `DOOR_OFF`;
    - `opening` → `DOOR_OPENING`, or `POCKET_FUNNEL_RESTARTING` while restarting;
    - `listening` → `doorListening(publicName, publicPort)` = `Answering at https://<name>:<port>`;
    - otherwise the confirm-needed line or `status.refusal`.
  - When `doorNeedsConfirm`, which is now `state !== 'off' && publicName !== null && confirmState !== 'confirmed'`:
    the lines, `POCKET_CONFIRM_WARNING`, `POCKET_READ_ONLY_HONESTY`, `POCKET_FUNNEL_RIGHT_WARNING` when
    `funnel.asksApproval`, and **Allow**.
  - While `funnel.state === 'approval'`: `POCKET_FUNNEL_APPROVAL` and the button **Open Tailscale**
    (`pocket:openApproval`). When `approvalOpens` is false instead: `POCKET_FUNNEL_APPROVAL_ELSEWHERE`, with
    `approvalText` drawn as selectable text and never as a link.
  - **Try again** when `doorMayRetry`.
- **Pair a phone.**
  - `start` (the door is off): a **Pair** button. It sets `pairAfterAllow` and calls `setDoor({on:true})`.
  - `waiting` (on, not listening): `PAIR_WAITING`.
  - `ready` (listening): the notice and **Pair**. There is no key field.
  - `showing`: the code, `SCAN_LINE`, `CODE_PRIVATE`, the countdown and **Cancel**.
  - `match`: unchanged.
  - When a `pocket:changed` push shows `listening` while `pairAfterAllow` is set, the sheet calls
    `beginPairing()` once and clears the flag. It is also cleared by off, by a refusal, and by leaving the section.
- **Phones.** Each row is the label, the three-key fingerprint, the alerts chip and **Remove**. There is no address.
  `PHONES_DROPPED` is drawn when `droppedPhones > 0`.
- **Alerts.** Unchanged.
- **The disclosure is deleted**: `GRANT_*`, `NARROW_*`, `NAMES_RESIDUAL`, and the use of `POCKET_ORIGIN_HONESTY` and
  `POCKET_TAILNET_GRANT_HONESTY`.

**The two items owed from 316.4.**
1. The stale "Paired with iPhone." after Remove (`PhoneSection.tsx:719`, `:729-733`). The notice now carries the
   phone id it names. It is drawn only while that id is in `status.phones`, and `onRemovePhone` clears it. A test
   renders the notice with the phone removed and finds no `Paired with`.
2. Nothing refused DEBUG in Release. `conformance:ios` gains (u) and `test-ios.mjs --read-app` looks for the seams'
   argument strings (§4.12.7). That is builder `phone`'s.

**Words.** A word marked "quoted by the phone" is quoted by `Copy.swift` through `/// Names:` or `/// Mac:`, so it
must not move by a byte.

| Constant | Text | Note |
| --- | --- | --- |
| `PHONE_TITLE` | `Phone` | quoted by the phone |
| `BTN_PAIR` | `Pair` | quoted by the phone |
| `BTN_TRY_AGAIN` | `Try again` | quoted by the phone |
| `CODE_EXPIRED` | `The code expired. Nothing was paired.` | quoted by the phone |
| `DOOR_OPENING` | `Starting Tailscale Funnel…` | new |
| `BTN_OPEN_TAILSCALE` | `Open Tailscale` | new |
| `PAIR_WAITING` | `The code shows once this Mac is answering.` | replaces `PAIR_CLOSED` |
| `SCAN_LINE` | `Scan it with Tortie on your iPhone.` | changed |
| `CODE_PRIVATE` | `Do not show this code on a shared screen.` | new (research 132 §7.7) |
| `CODE_FIRST_NAME` | `The first time, your Mac’s name can take several minutes to reach your phone. Press Pair again.` | new |
| `PHONES_DROPPED` | `Phones paired before this version must pair again.` | new |
| `KEY_LABEL`, `KEY_HINT`, `PAIR_CLOSED`, `GRANT_SUMMARY`, `GRANT_COPY_LABEL`, `GRANT_NO_ADDRESS`, `NARROW_LEAD`, `NARROW_FROM`, `NARROW_TO`, `NARROW_PREVIEW`, `NAMES_RESIDUAL` | — | deleted |

**The contract's sentences** (`src/shared/ipc/pocket.ts`, builder `owner`):

| Name | Text |
| --- | --- |
| `POCKET_CONFIRM_WARNING` | `This lets a phone you allow ask this Mac what your sessions are doing, over the internet. It reads your session names, your project names and what your agents are saying.` |
| `POCKET_REACH_HONESTY` (caption) | `Your phone reaches this Mac through Tailscale Funnel. Only a phone you pair gets an answer.` |
| `POCKET_FUNNEL_RIGHT_WARNING` | `Approving Funnel lets any device signed in to your tailnet publish to the internet, not only this Mac.` |
| `POCKET_FUNNEL_APPROVAL` | `Tailscale needs your OK to publish this door.` |
| `POCKET_FUNNEL_APPROVAL_ELSEWHERE` | `Tailscale asked for approval at a page Tortie does not open. Approve it there, then try again:` |
| `POCKET_FUNNEL_RESTARTING` | `Tailscale stopped publishing the door. Tortie is trying again.` |
| `POCKET_FUNNEL_SENTENCES['no-tailscale']` | `Tortie found no Tailscale program on this Mac. Install Tailscale and sign in, then try again.` |
| `['override-unusable']` | `GMUX_TAILSCALE_BIN does not name a program Tortie can run, so Tortie published nothing.` |
| `['not-running']` | `Tailscale is not running on this Mac. Open Tailscale, then try again.` |
| `['signed-out']` | `Tailscale on this Mac is signed out. Sign in, then try again.` |
| `['no-name']` | `Tailscale has not given this Mac a name, so there is nothing for a phone to reach. Turn on MagicDNS for your tailnet, then try again.` |
| `['unreadable']` | `Tortie could not read what Tailscale answered, so it published nothing.` |
| `['ports-taken']` | `Tailscale on this Mac already uses ports 8443 and 10000, so Tortie has no port to publish on.` |
| `['port-taken']` | `Tailscale on this Mac already uses port PORT for something else. Tortie will not take it over.` (`PORT` is replaced by `pocketFunnelSentence`, the one composer) |
| `['not-approved']` | `Tailscale did not turn Funnel on. An admin of your tailnet must approve it.` |
| `['shields-up']` | `Tailscale is set to refuse incoming connections on this Mac. Allow incoming connections in Tailscale, then try again.` |
| `['funnel-ports']` | `Your tailnet’s policy does not allow Funnel on the ports Tortie needs. An admin can allow ports 443, 8443 and 10000.` |
| `['approval-timeout']` | `Tailscale’s approval did not arrive, so Tortie published nothing.` |
| `['busy']` | `Tailscale was changing its settings at the same moment. Try again.` |
| `['failed']` | `Tailscale did not publish the door. Nothing was published.` |

`POCKET_ORIGIN_HONESTY`, `POCKET_TAILNET_GRANT_HONESTY`, `POCKET_TAILNET_GRANT_TEMPLATE` and `pocketGrantText` are
deleted.

### 4.11 The contract — `src/shared/ipc/pocket.ts`, `src/preload/pocket.ts` (builder `owner`)

- `PocketDoorState`: `'off' | 'opening' | 'listening' | 'refused'`, and `'no-address'` goes.
- `PocketStatus`: `address` and `port` become `publicName: string | null` and `publicPort: number`. It loses
  `grant`. It gains `droppedPhones: number` and `funnel: PocketFunnelView`:

  ```ts
  { state: 'idle' | 'reading' | 'starting' | 'approval' | 'publishing' | 'restarting';
    asksApproval: boolean; approvalOpens: boolean; approvalText: string | null }
  ```

- `PocketPhoneView` loses `address`.
- `status().refusal`, when the door is not listening, uses this order: the last failed Tailscale read's sentence
  (`POCKET_FUNNEL_SENTENCES`), then the gate's refusal, then the last start's (the listener's `DOOR_SENTENCES`, or
  Funnel's). So Tailscale being off is never drawn as "this door changed".
- `PocketPairingInput` is deleted.
- `'pocket:beginPairing': { req: []; res: PocketPairingOffer }`.
- NEW `'pocket:openApproval': { req: []; res: boolean }`. Main opens only the URL it holds, and checks it again
  (§4.2.5) before `shell.openExternal`.
- `GmuxPocketExtras.pocket` gains `openApproval()`, and `beginPairing()` takes no argument.
- `conformance:pocket` B1 holds the bridge and the registrar together, now at eleven channels.
- **`gate:contract` moves, as expected:**
  - `[ipc.invoke.channels] count=245` → `246`, adding `pocket:openApproval`.
  - `[env.names] count=116` → `115`, removing `GMUX_POCKET_LOOPBACK` (baseline line 471).
  - The integrator regenerates with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, and
    the commit body names every moved line. Any other move is a finding.

### 4.12 The phone — `ios/**` (builder `phone`)

**4.12.1 What leaves.**
- `ios/Tortie/Tailnet/Node.swift` and the `Tailnet` group, and `ios/TortieTests/TailnetNodeTests.swift`.
- `ios/TortieTests/P316ATSTests.swift`, which is replaced by `P330TransportTests.swift`.
- In `project.pbxproj`: the TailscaleKit build files, the file reference, the Frameworks and Embed entries, and the
  "TailscaleKit is vendored" phase (`:10-11`, `:38`, `:50`, `:90`, `:126`, `:148`, `:283-300`).
- `DoorRoute.socks5` and every SOCKS and `ProxyConfiguration` line.
- `DoorTransport.reaches` and `prepareToPair`.
- The five tailnet `PairingFailure` cases (`Pairing.swift:175-186`) and their five `Copy` sentences.
- In `Info.plist`: `NSAppTransportSecurity` WHOLE (`:24-34`) and `NSLocalNetworkUsageDescription` (`:37-38`).
- The Go paragraph of the `PrivacyInfo.xcprivacy` comment.

`InstallMark` and `forgetOnFreshInstall` STAY, with their reason restated: the Keychain outlives the app's deletion,
and a pairing a person deleted with the app must not come back. Its old reason ("its tailnet node is gone") is gone.

**4.12.2 The client — `ios/Tortie/Door/DoorClient.swift`, still THE ONE NETWORK FILE.**
- `NWConnection(to: .hostPort(host: NWEndpoint.Host(name), port: NWEndpoint.Port(port)), using: NWParameters(tls:
  tlsOptions, tcp: .init()))`.
- The TLS options: `sec_protocol_options_set_min_tls_protocol_version(.TLSv13)`,
  `sec_protocol_options_set_tls_server_name(publicName)`, and a verify block that compares `DoorPin.of(leaf)`
  (`DoorClient.swift:375-396`, unchanged) to the pin and calls `complete(false)` otherwise.
- Once paired, `sec_protocol_options_set_local_identity(sec_identity_create(identity))` on **every** connection.
- **One request per connection, `Connection: close`.**
- It dials the NAME and never an address, so Network.framework races the resolved addresses (O1).
- `.waiting(error)` is a failure and is never waited on: `NWError.dns` becomes `DoorFailure.nameNotFound`, and
  anything else becomes `unreachable`. For a paired phone's reads, `DoorWords.sentence` draws `nameNotFound` as
  `Copy.cannotReachMac`. The name-specific sentences are the pairing screen's alone.
- The 15 s whole-exchange timer and the 2 MiB cap are unchanged (`:104-117`), and the pin is exactly as before.

**4.12.3 The HTTP/1.1 exchange, hand-written and bounded** (research 132 §9 condition 8, and the entry S0).
- **It writes** `<METHOD> <target> HTTP/1.1\r\nHost: <name>:<port>\r\n` plus the four `x-tortie-*` lines,
  `Content-Type: application/json` and `Content-Length: <n>` for `/pair`, then `Connection: close\r\n\r\n`.
- **It reads** until `\r\n\r\n`, within at most 16 KiB and 64 header lines. The status line must be exactly
  `HTTP/1.1 <3 digits> …`, and 200 or 404, else `unexpectedStatus`.
- **`Content-Length` is required.** It must be digits only, with one header, not over 2 MiB, and it goes through
  `DoorNumber` (rule k). Any `Transfer-Encoding` is `malformed`.
- It reads exactly that many bytes. Early EOF is `malformed`. A 200 whose `Content-Type` is not JSON is `malformed`.
- Case-insensitive header names, no folding, no second `Content-Length`.

**4.12.4 Keys** (`Door/Keys.swift`). The record becomes `pairing-v2`. It holds the door (name, port, pin), the Mac's
two keys, the label, `pairedAt`, the two Curve25519 private keys (unchanged), and the client key's tag and the issued
certificate's DER. `load()` removes a leftover `pairing-v1` item and answers nil. The identity comes from
`SecItemCopyMatching(kSecClassIdentity)`, for the certificate added under the same tag with `ThisDeviceOnly`.

**4.12.5 Pairing** (`Door/Pairing.swift`).
- `PairingOffer.version = 3`, and the host and port rules of §4.8.1. `hostIsReachable` and its `100.64/10` test are
  deleted.
- `begin` mints the client key (§4.7.1).
- `run` seals and signs (§4.7.2) every 2 s. On `allowed` it takes `cert`, builds the identity, and makes the first
  signed read over a connection presenting it. Only a whole answer saves `pairing-v2`.
- `nameNotFound` retries inside the window and reports `.findingName`.
- Every other ending deletes the key.

**4.12.6 Words** (`Style/Copy.swift`, `Screens/DoorWords.swift`, `Screens/PairingScreen.swift`) — **the phone always
draws a sentence** (his no-key finding). Pressing Pair with the key field empty showed nothing at all on the phone.
That was because `read` sets `line = nil` (`PairingScreen.swift:81`) and a `nil` sentence (`DoorWords.swift:157`)
left the foot empty. Now:
- `pairingSentence(for:)` returns `String` and never nil. `.cancelled` is `Copy.notPaired`.
- Every `PairingStep` has a line. A test drives every step and every failure and asserts a non-empty foot line.
- `conformance:ios` (v) holds it as text.

| Copy | Text |
| --- | --- |
| `pairPrivateNetwork` | `There is nothing else to install.` (also `Pairing.html:59` and `copy-drift.mjs:289-292`) |
| `pairReaching` (`.presenting`) | `Reaching your Mac.` |
| `pairNameNotYet` (`.findingName`) | `Your Mac’s name is not on the internet yet. The first time, this can take several minutes.` |
| `pairWaitingForAllow` (`.waitingForMac`) | `Waiting for you to allow this iPhone on your Mac.` |
| `pairConfirming` (`.confirming`) | `Checking with your Mac.` |
| `pairNameNotFound` | `Your Mac’s name did not reach the internet before the code shut. Press Pair on your Mac again in a few minutes.` (`/// Names:` `BTN_PAIR`) |
| `tailnetNoKey`, `tailnetKeyRefused`, `tailnetFlowLogs`, `tailnetUnreachable`, `tailnetUnavailable` | deleted, with their two `/// Names: … KEY_LABEL` lines |

**4.12.7 DEBUG seams**, all inside `#if DEBUG` (rule d):
- `-TortieDebugPairingPayload` and `-TortieDebugForgetPairing`, unchanged.
- `-TortieDebugStill`, unchanged.
- **NEW `-TortieDebugDoorEndpoint 127.0.0.1:<port>`.** It dials that loopback endpoint while keeping SNI and `Host`
  as the code's name, which is how the Simulator reaches the stand-in's forwarder on the Mac. It accepts `127.0.0.1`
  only.

`DoorTransports.shipping` (`Transport.swift:62-69`) becomes the name-dialling transport in Release, and the loopback
mapping only in DEBUG.

`test-ios.mjs --read-app` greps the built Release binary for the ARGUMENT strings `-TortieDebugPairingPayload`,
`-TortieDebugForgetPairing`, `-TortieDebugStill` and `-TortieDebugDoorEndpoint`, which survive optimisation (316.4
owed item 2). Its pass line becomes "none links NetworkExtension or TailscaleKit, none carries code coverage, no
DEBUG seam".

**4.12.8 The build number.** App Store Connect refuses a second upload under a build number it already holds, and
he uploaded Tortie 1.0.0 (1) on 2026-09-29. So `CURRENT_PROJECT_VERSION` moves from 1 to 2 in both configurations,
which rule (s) still holds as one version. `MARKETING_VERSION` stays 1.0.0. The checklist names "Tortie 1.0.0 (2)".
Nothing about the Mac's version moves, under his ruling of 2026-09-21 that nothing is released until the phone works.

### 4.13 Quit and launch — `src/main/capabilities.ts` (builder `owner`)

The disposer's first synchronous lines gain `beginFunnelShutdown()` beside `beginPocketShutdown()` (`:529`). That
refuses new starts and clears the restart timer.

Before `joinPocketDoor()` (`:604`) comes `await joinFunnel()`: SIGINT, SIGTERM, SIGKILL, bounded at 3 s, then the
record is deleted. Unpublishing comes first, and the listener second. Both are above `shutdownGmuxCore()`, where the
door already is. The one log line carries counts and booleans only.

At launch nothing new runs. `openAtLaunch` (`ipc.ts:675-687`) keeps its first line (`off` unless `enabled` and
`bindAtLaunch`), then sweeps, reads and asks the gate. A person who never turned the door on pays one read of a file
that is not there. That is the parent measurement's zero.

---

## 5. Builders, disjoint files, and who owns what is shared

Four builders. Nothing outside a builder's list may be edited by that builder. Where a builder needs another's
interface, it codes against §4's exact names, and the integrator reconciles.

| Builder | Owns |
| --- | --- |
| **door** — the door process and the Mac's door gates | `src/main/pocket/door/**` (new: `listener.ts`, `proxy-v2.ts`, `limits.ts`, `send.ts`, `table.ts`, `wire.ts`, `in-process.ts`); `src/main/pocket/door-process.ts` (new); `src/main/pocket/bind.ts`; `src/main/pocket/server.ts`; `src/main/pocket/routes.ts` (the table's move and re-export only); `electron.vite.config.ts`; `src/main/pocket/__tests__/{bind,server,routes}.test.ts` and new `door-*.test.ts`; `build/assert-import-boundaries.mjs`; `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/p313/hostile-client.mts` and `.mjs` |
| **owner** — Funnel, the hash, pairing, the host, the contract, the sheet | `src/main/pocket/funnel.ts` (new); `src/main/pocket/pairing.ts`; `src/main/pocket/tls.ts`; `src/main/pocket/ipc.ts`; `src/shared/ipc/pocket.ts` (and `src/shared/ipc/index.ts` if a new type needs the facade); `src/preload/pocket.ts`; `src/main/capabilities.ts`; `src/main/machines/tailscale.ts` (header only); `src/main/harness/push-seam.ts`; `src/renderer/settings/PhoneSection.tsx`; `src/renderer/settings/phone-section.css`; `src/main/pocket/__tests__/{ipc,pairing,switch-queue,tls,disposer}.test.ts` and new `funnel.test.ts`; `src/renderer/settings/__tests__/p316-phone-section.test.tsx` |
| **phone** — the iPhone app and its gates | `ios/**` (the app, `TortieTests`, `TortieUITests`, the project, the plists, `ios/TortieTests/Fixtures/vectors.json`); `build/conformance-ios.mjs`; `build/p316/ablation-ios.mjs`; `build/p316/test-ios.mjs`; `build/p316/vectors.mjs`; `build/p311/copy-drift.mjs`; `docs/design/phone/Pairing.html` (line 59 only) |
| **proof** — the stand-in, the probes, the retirement and the paper | `build/p330/**` except this SPEC (new: `tailscale-standin.mjs`, `probe-p330.mjs`, `CHECKLIST.md`); `build/probe-p313.mjs`; `build/probe-p314.mjs`; `build/p316/probe-p316.mjs`; `build/p316/node-phone.mjs`; `build/p316/hostile-door.mjs`; deleting `build/build-tailscalekit.mjs` and `build/tailscalekit-release.json`; `.gitignore` (the `build/vendor/tailscalekit/` line); `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 153 → 154); `build/background-fixtures.mjs` (only if a new shape needs it); `build/verification-checks.mjs`; `package.json`; `CLAUDE.md`; `CHANGELOG.md`; `DEVELOPMENT.md` |

**Shared files, and their one owner.**
- `src/shared/ipc/pocket.ts` and `src/preload/pocket.ts` belong to **owner**. `door` reads `PocketRouteId` from them
  and adds nothing.
- `package.json`, `build/verification-checks.mjs`, `CLAUDE.md`, `CHANGELOG.md` and `DEVELOPMENT.md` belong to
  **proof**. `door` and `phone` write their needs in their hand-off, and proof edits.
- `ios/TortieTests/Fixtures/vectors.json` belongs to **phone**. **The integrator** regenerates it once every builder
  is in (`node build/p316/vectors.mjs`, then `--check`).
- `docs/audits/contract-baseline.txt` belongs to **the integrator**.
- `docs/BACKLOG.md` belongs to no builder. The main session writes the running log.
- `build/p330/SPEC.md` is this file, and the integrator appends "§As built".

### 5.1 Builder `door` — what to build

1. Build `door/` and `door-process.ts` to §4.5 and §4.6, and cut `bind.ts` and `server.ts` down to §4.5.3.
2. **Tests, run rather than read.** They run on real loopback TLS, with client certificates made by `tls.ts`'s
   `issueClientCertificate`, which owner lands first (§5.2 item 0). Each is driven in-process:
   - the PROXY header, honest, forged, malformed, split byte by byte, and in one write with the ClientHello (report
     which hand-over measured);
   - a source over the cap;
   - no certificate outside and inside a window;
   - an unpaired key;
   - SNI and Host mismatches;
   - a certificate-less request to a signed route;
   - `/pair`'s outer JSON strictness;
   - the body cap;
   - `Content-Length` on every answer, 404 included;
   - a pins update cutting a live socket;
   - shutdown on the first line;
   - generation-based refusal 7;
   - **a counter proving zero bytes reached the HTTP parser** for every refusal before step 5.
3. **`conformance:pocket`** (§6.1). It removes S2 and S4 with the thing they read, and the commit body says so. Each
   new clause gets its ablation arm in `ablation-p313.mjs`, red on the rule that owns it.
4. **The hostile client** (§6.2).
5. **The import wall** (§6.1 W2).
6. **Runs, and nothing else:** `typecheck`, the vitest files it owns plus `server` and `routes`,
   `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`, and `node build/assert-import-boundaries.mjs`.
   No Electron and no Simulator.

### 5.2 Builder `owner` — what to build

0. **Land these first, because door's and phone's tests import them:**
   - `issueClientCertificate` in `tls.ts`;
   - the §4.8.5 names in `pairing.ts`;
   - `PocketPairAnswer` and `PocketRefusalReason`.

   The builders share this one worktree, so they appear to the others as soon as they are written.
1. Build `funnel.ts` to §4.2. Every process goes through injected deps (`FunnelDeps`: `resolve`, `exec`, `spawn`,
   `ps`, `recordPath`, `now`, `sleep`), and **the tests never exec a real program**.
2. Build `pairing.ts`, `tls.ts`, `ipc.ts`, the contract, the preload, `capabilities.ts`, the push seam and the sheet
   to §4.3, §4.4, §4.7-§4.11 and §4.13.
3. `PocketHostDeps` loses `bindAddress` and gains `tailscale?: FunnelDeps` and `door?: DoorSpawner`. Only tests and
   `push-seam.ts` pass either (`conformance:pocket` U4).
4. **The push seam** walks the sheet's order for real against the stand-in: switch on, read, Allow, `listening`,
   `beginPairing()`, then `present` with a proof, then Allow, then off. It refuses with one line unless
   `resolveTailscale` answers `dev-override`, so a harness can never run the real program.
5. **Tests:**
   - every §4.2.5 ending over a fake child;
   - the orphan sweep ending a full match and leaving a decoy whose `lstart` differs;
   - the override refusal;
   - the restart's floor and the moved-field refusal;
   - every §4.4 field moving the hash (drop a `NORMALIZE` line and the build fails);
   - v2 store rows dropped and counted;
   - the presentation proof with a wrong key, a stale challenge after the deadline, and `allowed` to the allowed key
     alone;
   - `channel` refusals;
   - the certificate parsing under `new X509Certificate` with the right SPKI;
   - the switch queue's 34 tests re-pointed through `inProcessDoor` and a fake Funnel, with `host.idle()`;
   - the sheet's faces, including the Remove notice.
6. **Runs:** `typecheck`, its vitest files, and `conformance:pocket` (read-only, to see its own clauses go green).
   `smoke:t1` launches an Electron, so it is the verifiers'.

### 5.3 Builder `phone` — what to build

1. Build §4.12. Delete what §4.12.1 lists.
2. **Rewrite `vectors.mjs`** for v:3, the three-key fingerprint, the challenge, the proof, the sealed presentation v2,
   the client certificate (the Swift must build a `SecCertificate` from the DER and read back `ck`), and `/pair`'s
   three answers. `DoorVectorTests.swift` follows.
3. **Gates:** `conformance-ios.mjs` per §6.4, `ablation-ios.mjs` with one plant per new or changed clause, and
   `test-ios.mjs` per §4.12.7 and §7.3, with no TailscaleKit preflight and no `vendor:tailscalekit` sentence.
4. **The macOS harness, the builders' substitute for S0.** In scratch, not the tree, following 316.2's `run-mac.sh`:
   compile `Door/*.swift` with swiftc and XCTest on macOS, and drive the SHIPPING `DoorClient` over `NWConnection`
   against a loopback Node door that requests a client certificate. Build the identity **in memory** with
   `SecPKCS12Import` and `kSecImportToMemoryOnly` (macOS 15 SDK, `SecImportExport.h:652-711`), from a PKCS#12 made by
   `/usr/bin/openssl` in scratch. **Never write his login keychain.** Report 200 with the pinned key presented, and
   the refusals for a wrong door key, a missing identity, and every hostile HTTP answer of §6.4 (t).
5. **Runs:** `xcodebuild build` and `build-for-testing` for the Simulator SDK, and an unsigned device archive, each
   with `-derivedDataPath /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p330/dd-phone`,
   ad hoc, no team. Also `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, the macOS harness, and
   `vectors.mjs --check` once owner's `pairing.ts` is in. **No Simulator is booted.**

### 5.4 Builder `proof` — what to build

1. **The stand-in** (§6.3).
2. **`probe:p330`** (§7.2).
3. **Re-point `probe:p313`, `probe:p314` and `probe:p316`** from `GMUX_POCKET_LOOPBACK` to the stand-in: a scratch
   wrapper in `GMUX_TAILSCALE_BIN`, the forwarder port read from the stand-in's state, and the node phone dialling
   the forwarder with SNI and `Host` set to the public name.
   - `probe:p316` passes `P330_DOOR_ENDPOINT` to the UI test, which passes `-TortieDebugDoorEndpoint`.
   - `node-phone.mjs` gains v:3, the proof, the client key and certificate, and mutual TLS.
   - `probe:p313` imports it rather than carrying its own copy.
   - Its key-scan arm becomes a scan for the window's `ps` and for any PEM private key under the profile and HOME.
   - `hostile-door.mjs` serves the §6.4 (t) hostile HTTP answers over TLS 1.3 with the pinned key.
4. **Retire vendoring:** delete `build/build-tailscalekit.mjs` and `build/tailscalekit-release.json`; remove the
   `vendor:tailscalekit` and `pin:tailscalekit:check` scripts (`package.json:261`, `:265`); remove their
   `verification-checks.mjs` classifications (`:52-60`, `:220`, `:222`, `:241`, `:600-607`, `:796-804`), handling the
   Go type as §3 row 13 says; and remove the `.gitignore` line.
   - Add `probe:p330` to `package.json` and classify it.
   - `HELPER_USER_FLOOR` 153 → 154.
5. **`CLAUDE.md`:**
   - rewrite the pocket row (`:316`) and the ios row (`:321`);
   - delete the `pin:tailscalekit:check` (`:322`) and `vendor:tailscalekit` (`:349`) rows;
   - edit the `gate:checks` row's "today `build/build-tailscalekit.mjs`" (`:324`), the `probe:p313`, `probe:p314`,
     `test:ios` and `probe:p316` rows (`:344`, `:345`, `:347`, `:348`), and the gates prose at `:275-276` if it names
     vendoring;
   - add a `probe:p330` row;
   - one line each, as the section's own rule asks.
6. **`CHANGELOG.md`:** rewrite the iPhone item under `## Unreleased`, keeping its existing commit links. It says:
   switch it on in Settings then Phone, approve Funnel once on Tailscale's page, scan and match. The limits, in one
   clause: the Mac must be awake with Tortie open, and the first time the Mac's name can take several minutes to
   reach the phone. No commit link for this phase: the follow-up docs commit adds it.
7. **`DEVELOPMENT.md`:** drop the TailscaleKit paragraphs (`:55-75`) and the `vendor:tailscalekit` row (`:114`).
8. **`build/p330/CHECKLIST.md`** (§7.5).
9. **Runs:** the stand-in's `--self-test`, `node build/assert-electron-teardown.mjs`,
   `node build/assert-background-teardown.mjs`, `node build/verification-checks.mjs` / `gate:checks`, and
   `node build/p330/probe-p330.mjs --grader-self-test` (graders over recorded fixtures, no Electron).

---

## 6. The gates, clause by clause

### 6.1 `conformance:pocket` (builder `door`)

**Rewritten:**
- `L1`: one `listen` in the domain, the door process's `net.Server`.
- `L2`: `0.0.0.0` is nowhere, and `'127.0.0.1'` is the listen host literal in `door/listener.ts` alone.
- `L3` becomes: the funnel target's host is the literal `127.0.0.1`, and its port is the listener's reported
  `localPort`, never a setting.
- `L4`: `listen(0, …)` only; a confirmed `publicPort` that is taken refuses and never moves.
- `L5`: the one fork of the door process and the one spawn of the child are each reached only from `openNow` or
  `recoverNow`, behind the gate, with the last-press check the statement IMMEDIATELY before each.
- `R3`: no spawn in the domain except `funnel.ts`'s spawn of the resolved program, its `execFile` of the same program
  and of `/bin/ps`, and `bind.ts`'s one `utilityProcess.fork`.
- `Q1`: the child's start and stop only inside queued jobs.
- `A4`: refusal 7 by generation.
- `F1` becomes `F2`: QR v:3, exactly the eight keys, no `tk`, no address.
- `K1` becomes `K2`: no `tailnetKey`, `tk` or `tskey-` anywhere under `src/`.
- `B1`: eleven channels.

**Removed:** `S2` and `S4`, with `isSelfOrigin`.

**New:**
- `U1`, the argv exactly. There are no forbidden flags or subcommands anywhere in `src/` (§4.2.4), `status` only with
  `--json` and `--peers=false`, and `serve` only as `serve status --json`.
- `U2`, the program only from `resolveTailscale`, no Tailscale path literal in the domain, and the override refusal
  present.
- `U3`, the child's kill inside a `finally` of the stop. The record is 0o600. The sweep signals only on `lstart` AND
  `command` equal.
- `U4`, `tailscale` and `door` deps passed only by tests and `push-seam.ts`.
- `M1`, mutual TLS: `requestCert: true`, `minVersion: 'TLSv1.3'`, and the http server handed a socket only inside the
  `secureConnection` handler, after the pin check. No HTTP listener before it. No certificate means `/pair` only,
  inside a window.
- `M2`, the hash: the four fields and `clientKey`, no `bindAddress` or `address`, `v3`.
- `P1`, the PROXY source read only in `door/limits.ts`. It is not on `DoorRequest` and not in a log call.
- `C1`, `Content-Length` explicit in `sendPocket`, and no `Transfer-Encoding`.
- `N3`, `/pair` answers the three states and `cert` only with `allowed`.
- `MENU1`, `Pair a Phone…` still directly under `Settings…`, calling `openSettingsWindow('phone')`.
- `W2`, `door-process.ts` and `door/**` import only `node:net`, `node:tls`, `node:http`, `node:crypto`,
  `src/shared/` and `door/` itself. It is also held by `assert-import-boundaries.mjs`, as a new allow-only wall
  beside the forbid-lists at `:251-294`, with fixtures.
- `U5`, `out/main/pocket-door.js` and every chunk it requires name no `electron` module and no
  `main/{credentials,logins,push,sessions}` path. It is read only when `out/` exists, and prints `skipped: no build`
  otherwise.

### 6.2 `conformance:pocket:hostile` (builder `door`)

It keeps every honest arm, and adds arms each asserted on its REASON WORD and, where it applies, on the parser
counter:
- no certificate outside a window;
- an unpaired key;
- a paired phone's signature over another phone's connection (`channel`);
- a forged PROXY header claiming a paired phone's source;
- no PROXY header;
- five concurrent from one source;
- a replay;
- a second presenter with the code from another source (card flip, then the old hash refused);
- an `allowed` poll with no proof, with a wrong key's proof, and after the deadline;
- SNI and Host wrong;
- `/pair` outer JSON with a sixth key;
- a stop with a request in composition.

The arms that read `isSelfOrigin` and the address go, and the header names them.

### 6.3 The stand-in — `build/p330/tailscale-standin.mjs` (builder `proof`)

**Its surface.** It answers only these, and refuses any other argv with exit 2 and a line in its log:
- `status --json [--peers=false]`, from its state, shaped by `ipn/ipnstate/ipnstate.go:36-80` and `:286-352`:
  `BackendState`, `Self` with `DNSName` ending in a dot, `CapMap` with `https`, `funnel` and the `funnel-ports` URL
  key, `CurrentTailnet {Name, MagicDNSSuffix, MagicDNSEnabled}`, and `Peer: null`;
- `serve status --json`, printing `null` or a `ServeConfig` with `Foreground[<sid>]` while its funnel runs;
- `funnel --tcp=<p> --proxy-protocol=2 tcp://127.0.0.1:<q>`.

`--bg`, `reset`, `off`, `--https`, `--tls-terminated-tcp` and `serve reset` are each **refused and recorded**, so a
probe fails on sight.

**Its funnel mode.** It prints `Available on the internet:` and the tcp lines of `serve_v2.go:1055-1063`, then
`Press Ctrl+C to exit.` It listens on `127.0.0.1:0` as the forwarder, writing its port to `<dir>/funnel.json`. On
each connection it writes a PROXY v2 TCP4 header whose source is the scenario's (default `203.0.113.7`, from the
documentation range), then pipes both ways to `127.0.0.1:<q>`. It exits 0 on SIGINT, removing its state entry.

**Scenarios** come from `<dir>/scenario.json`, rewritten by the probe between arms:
- `approval: 'wait'` prints a made-up text and `https://login.tailscale.com/f/funnel?node=nMADEUP` after nine spaces,
  then waits for `<dir>/approve`, then prints `Success.`;
- `approval: 'exit0'` prints them and exits 0;
- `refuse`: `shields-up` | `ports443` | `port-taken` | `busy`, printing the pinned messages of §4.2.5 to stderr and
  exiting 1;
- `backendState` and `tailnet` values, with `tailnetAfterReads: {n, name}` for the profile-switch arm;
- `servedPorts` for the port choice.

**How it is run.** Through a `/bin/sh` wrapper that the probe writes in scratch, with the state directory baked in:
`exec <node> <repo>/build/p330/tailscale-standin.mjs "$@"`. It never calls any real `tailscale`, never opens a
non-loopback socket, and writes only under `<dir>`.

It also exports `makeStandin({ dir, scenario })`, which returns `{ binPath, readLog(), readFunnel(), setScenario(),
approve(), pids() }`, for the four probes. A `--self-test` drives every scenario on loopback, and ends every process
it started in a `finally`.

**Every probe's preflight refuses to launch** unless `GMUX_TAILSCALE_BIN` is the wrapper, the wrapper is executable,
and its target's sha256 is the stand-in's. After the run, **the stand-in's log must hold every Tailscale
invocation the app made.** `ps` samples are taken through the run, and one showing a process under
`/Applications/Tailscale.app`, `/usr/local/bin/tailscale` or `/opt/homebrew/bin/tailscale` makes it a FAILED run.

### 6.4 `conformance:ios` (builder `phone`)

- `(c)`: `NWConnection`, `NWParameters` and `sec_protocol_options_*` appear only in `Door/DoorClient.swift`. There is
  no `URLSession`, `URLRequest` or `ProxyConfiguration` anywhere in the app. Only the client sends.
- `(d)`: the four DEBUG seams inside `#if DEBUG`, including `-TortieDebugDoorEndpoint` and its `127.0.0.1`. After his
  ruling of 2026-09-29 it also holds the client key store's `softwareKeyDebugSeam`, a field (no launch argument) a
  test sets so the software path runs on a Simulator that has a Secure Enclave (§4.7.1).
- `(n)`: the client key is ThisDeviceOnly by construction on both paths (§4.7.1): the access control is made only
  inside the `if` on `SecureEnclave.isAvailable`, and the software key names its own `kSecAttrAccessible`.
- `(e)`: `Info.plist` has NO `NSAppTransportSecurity` and NO `NSLocalNetworkUsageDescription`. The rest is unchanged,
  still read by `plutil`.
- `(l)`, `(m)` and `(q)` become ONE rule `(l)`. There is no `Tailnet` directory, no `TailscaleKit` import, name,
  framework reference or build phase, no `.xcframework` in the project, and no `tailscale_` symbol name in Swift.
  `(m)` and `(q)` are retired, with their fixtures.
- `(o)`: the app's manifest only.
- `(p)`: no `tk`, `tailnetKey` or `tskey-` under `ios/`. The one-shot `secret` is written to no Keychain item and no
  file, and `PairingOffer` mirrors itself without it.
- NEW `(t)`:
  - the client sets a local identity on every connection of the paired path;
  - the verify block compares `DoorPin.of` to the pin and completes false otherwise;
  - TLS 1.3 is the minimum;
  - the code's host is a `.ts.net` name and its port 8443 or 10000;
  - the HTTP parser requires `Content-Length` and refuses `Transfer-Encoding`;
  - `hostile-door.mjs`'s HTTP arms are named: chunked, no length, two lengths, over 2 MiB, a 20 KiB header, not
    `HTTP/1.1`, early close, and a 200 that is not JSON. Each must end in a drawn sentence.
- NEW `(u)`: no Release configuration defines `DEBUG` in `SWIFT_ACTIVE_COMPILATION_CONDITIONS`, `OTHER_SWIFT_FLAGS`
  or `GCC_PREPROCESSOR_DEFINITIONS`, in the project or any xcconfig.
- NEW `(v)`: `pairingSentence` returns a non-optional `String`, and `PairingModel` never assigns `line = nil`.
- `(k)`: the parser's arithmetic goes through `DoorNumber` or is named.

---

## 7. The proof, run rather than read

**Tier 3.** The door is on the public internet, it holds pairing keys, and it spawns a process (refusal 8: the
confirm hash). So the proof is:
- the gates;
- one app run (`probe:p330`) plus the three re-pointed probes;
- the Simulator runs;
- two independent methods, one of them an attack (§7.4);
- the parent-commit measurement, which his no-regression rule makes mandatory.

**No agent's run proves Funnel itself.** His checklist (§7.5) does, and no verdict may imply otherwise.

Verifiers take THE LOCK before any Electron or Simulator. `npm run shot` is forbidden. Every process a run starts,
the stand-in's children and the decoy included, ends in a `finally`.

### 7.1 Gates

- **The integrator runs:** `typecheck`; `build` (which runs `conformance:ios`, `gate:contract`, `gate:electron`,
  `gate:background`, `gate:checks` and `gate:simulator`); `test`; `conformance:pocket`; `conformance:pocket:hostile`;
  `ablation:p313`; `ablation:p316`; `conformance:phonecopy`; `package`.
- **The verifiers run:** `smoke:t1`, `smoke` and `smoke:t3`, because they launch an Electron.
- **The obligations:** `HELPER_USER_FLOOR` 154. The contract regenerated, with the moved lines named.
- **No raw control bytes** in any touched text file (tabs only in `project.pbxproj` and plists).

### 7.2 `probe:p330` — the app run (builder `proof` writes it; verifiers run it under THE LOCK)

`build/p330/probe-p330.mjs`, through `build/electron-run.mjs`. It uses a scratch profile, a scratch `HOME`, its own
tmux socket `gmux-p330-<pid>`, a development build, and `GMUX_TAILSCALE_BIN` set to the stand-in wrapper. Its phone
is `node-phone.mjs`, dialling the forwarder. It runs ONE app for arms 1 to 10, then two launches one after the other,
never at once.

1. **The door off.** There is no child, no stand-in invocation in its log, and no listening socket of the app.
   There is also no door process. Chromium's own network service is a utility process too, so the count is of the
   app's `ps` descendants whose command line carries `--utility-sub-type=node.mojom.NodeService`, Electron's spelling
   for a `utilityProcess` (the verifier confirms that spelling on the first run with the door on), compared with the
   parent build.
2. **Pair pressed.** The stand-in log shows `status --json --peers=false` and `serve status --json`, and nothing
   else. The lines name `https://<name>:8443`, the tailnet and the program. `asksApproval` draws the warning.
3. **Allow** with `approval: 'wait'`. The sheet draws **Open Tailscale**, enabled, with `funnel.approvalOpens`
   true and `approvalText` null. **The probe never presses it**, because that would open a browser on his Mac to a
   made-up page. The URL check itself is owner's unit test over `https:`, `http:`, another host, a port, a username,
   and `login.tailscale.com.evil`. Then `approve`, then `listening`, then the code shows without another press. That
   is the one press.
4. **The exact argv**, read from `ps -ww` for the child's pid, byte for byte with §4.2.4, and the record file equal
   to `ps`.
5. **The pair and every read** by the node phone through the forwarder, with mutual TLS, including a page back to the
   first turn.
6. **Every refusal sentence**, one arm each, by scenario: shields-up, ports443, port-taken, busy, exit0, not-running,
   signed-out, no program (a wrapper path that does not exist, which must refuse `override-unusable` and **must not**
   fall back), and ports-taken.
7. **Remove.** The child and the door process end, and the forwarder goes with the child. **Allow** again, and the
   door restarts without the removed phone's pin. The removed phone's next connection is closed straight after the
   handshake, with no HTTP byte answered. `unknown-key` appears in `app.log` (one line per word per process). The
   remaining phone reads.
8. **A profile switch.** `tailnetAfterReads` changes the tailnet and the probe SIGINTs the child. There must be NO
   restart, the gate reads `changed`, and the new lines are drawn.
9. **An unexpected exit** with the fields unchanged. The probe SIGKILLs the child. The sheet shows the restarting
   line, the restart happens at the floor, it counts, and the phone reads again.
10. **Quit.** The child and the door process end inside the quit, and the record is deleted.
11. **THE ORPHAN, two launches.**
    - Launch A: the door is on and publishing. The probe SIGKILLs the app's MAIN pid, never the shim. The stand-in
      child must survive, reparented, and must still be in the record.
    - Between launches, the probe starts a DECOY: the same wrapper and argv, a different start time.
    - Launch B: exactly the recorded child is ended, the decoy survives, a new child starts, and the log names both
      decisions.
    - Every stand-in pid, the decoy and every forwarder are ended in the probe's `finally` by pid
      (`gate:background`).

Arms 1 and 2 at the parent build `217f47e5` are the parent measurement (§7.4). `P330_PARENT_CHECKOUT` points arm 1
at it.

### 7.3 The phone, on the Simulator (verifiers, under THE LOCK)

- **`test:ios`** in Debug and Release, on iOS 26.3 AND 18.3 (`P316_RUNTIME=18.3`). It adds `P330TransportTests`:
  `test-ios.mjs` stands up an in-process Node door on loopback that requests a certificate and records the peer's
  SPKI pin, ending it in a `finally`. The XCTest row makes a Keychain identity in the Simulator and dials it through
  the SHIPPING `DoorClient` with the DEBUG endpoint mapping. It must answer 200, with the recorded pin equal to the
  identity's key. A second row, with the wrong door key, must see zero requests served. **This IS S0's
  client-identity measurement.** If it fails on 18.3, the phase stops and goes to him.
- **`probe:p316`**, re-pointed. The order, the list, a conversation paged back whole, and Remove, on 26.3. The floor
  arm on 18.3. The transport arm through the stand-in's forwarder on both. The hostile door's HTTP arms.
- **For the record only:** a verifier may measure `URLSession` to a `.ts.net` name under a `ts.net` subdomain
  exception through a DEBUG SOCKS stand-in, exactly as `build/p316/SPEC.md` §3.2 did. The number is written down. It
  does not change this round.

### 7.4 The independent methods (Tier 3: two, one of them an attack, plus the parent measurement)

**Method 1, the attack.** Lens 1. Every arm of §6.2, plus the ones that need the app:
- a flood of 200 no-certificate handshakes through the forwarder, against the parent's door on loopback. Main's
  event-loop delay must be no worse at HEAD, because the handshakes now cost the door process and not main.
- a forged PROXY header from a local process straight to the local port, which reaches no identity;
- a stranger with the code from another source;
- a wrong pin on the phone, with zero requests served;
- the crash orphan (§7.2 arm 11).

Each arm is asserted on its REASON and on the parser counter.

**Method 2, the re-derivation.** Lens 2. **This is written by the verifier in scratch, never by a builder**, because a
re-derivation the builder wrote is the builder's own check. It is a standalone node script with its own reader and
its own TLS stack. From what the sheet draws and the app answers, it recomposes:
- the canonical hash text (`sha256-pocket-exec-v3`, the eight keys sorted);
- the v:3 payload;
- the client-key pin.

It completes a pair (the proof, the certificate) and a read. It must go red when a field is dropped from `NORMALIZE`,
in a clone, and when the pin is taken over the certificate rather than the key.

**The parent-commit measurement**, at `217f47e5` and at HEAD, for a person who never turns the door on:
- Tailscale program spawns (0 and 0);
- listening sockets (0 and 0);
- Tortie's own utility processes, being `node.mojom.NodeService` descendants (0 and 0);
- quit time (equal);
- Settings → Phone's rectangles, equal except exactly the removed disclosure and the Pair card's resting face (§3
  row 5).

A second arm plants a 316 store and a `v2` confirm record. The door stays shut, with the `changed` sentence and
`PHONES_DROPPED`, and there is no error.

**Also:** the verifier reads the built `out/main/pocket-door.js` require graph (U5's subject) with their own reader.

### 7.5 HIS CHECKLIST — `build/p330/CHECKLIST.md`, the only proof of Funnel itself

In the shape of `build/p316/CHECKLIST.md`. Every label is quoted from the tree. Row 1 is his `git pull --rebase
--autostash origin main`, then `npm run dev`, as 316.4 row 1.

1. Settings → Phone, **Pair**, read the lines, **Allow**. Record whether macOS or Tailscale asked anything, which is
   O5. His tailnet is already approved, so no page should open.
2. If a page opens, count its clicks and write down its host (O3).
3. Archive and upload this build, Tortie 1.0.0 (2), exactly as `build/p316/CHECKLIST.md` rows 5 to 9 do, then run
   `node build/p316/test-ios.mjs --read-app` on the archive, which must pass with "no DEBUG seam". Then install it
   from TestFlight, scan, and match six groups. On a device with a Secure Enclave the key is made there (O8).
4. Read the list, a session and a conversation with Wi-Fi off.
5. Sleep the Mac, wake it, and pull (O6).
6. Quit Tortie and confirm the phone says it cannot reach the Mac. Reopen, and time the first pull (O2).
7. Remove, then pair again.
8. If today's TestFlight build is on the phone, time one pull on each build. Over cellular, make five pulls and note
   any that stalls (O1, O7).
9. Look the Mac's name up on crt.sh (M4, again).

It ends by telling him three things:
- The tag, the grant and the narrowed default rule he pasted on 2026-09-29, and any `tortie-phone` on his Machines
  page, are no longer used. Removing them is his, and Tortie never writes his policy.
- The TestFlight build 1.0.0 (1) says "That is not a Tortie pairing code." to a new code.
- A first scan can fail with "Your Mac's name did not reach the internet…". Pressing Pair again a few minutes later
  is expected until the owed window change lands (§4.9).

---

## 8. Constants

| Name | Value | Where | Source |
| --- | --- | --- | --- |
| `FUNNEL_PORTS` | 8443, then 10000 | `funnel.ts` | research 132 §9 item 6; kb/1223 |
| `FUNNEL_START_DEADLINE_MS` | 20 s | `funnel.ts` | this spec |
| `FUNNEL_APPROVAL_WAIT_MS` | 10 min | `funnel.ts` | this spec |
| Stop | SIGINT, 2 s, SIGTERM, 1 s, SIGKILL | `funnel.ts` | `serve_v2.go:395` |
| `FUNNEL_RESTART_FLOOR_MS` / `CAP` | 2 s, doubling to 60 s | `funnel.ts` | entry S1.6 |
| Output kept per stream | 64 KiB | `funnel.ts` | this spec |
| `MAX_CONNECTIONS` | 32 | `door/limits.ts` | `bind.ts:99` |
| `PER_SOURCE_MAX` | 4 | `door/limits.ts` | this spec |
| `PROXY_HEADER_TIMEOUT_MS` | 5 s | `door/limits.ts` | this spec |
| PROXY v2 length | 12 or 36 to 216 | `door/proxy-v2.ts` | the PROXY protocol v2 spec; `go-proxyproto` |
| Handshake / headers / request / keep-alive | 10 / 10 / 15 / 5 s | `door/limits.ts` | `bind.ts:102-108` |
| `maxHeaderSize` | 8 KiB | `door/listener.ts` | this spec |
| Stop join / close / kill | 1 s / 1 s / 2 s | `bind.ts` | `bind.ts:111-113` |
| `POCKET_PAIRING_WINDOW_MS` | 3 min, unchanged | `pairing.ts:909` | the entry's refusal (§4.9) |
| Client certificate notAfter | `99991231235959Z` | `tls.ts` | RFC 5280 §4.1.2.5 |
| Phone: the answer cap, the timeout | 2 MiB, 15 s, unchanged | `DoorClient.swift` | 316.2 |
| Phone: header bytes and lines | 16 KiB, 64 | `DoorClient.swift` | this spec |

---

## 9. What is NOT in this phase

- **No Tailscale credential of any kind**, and no LocalAPI call from Tortie. Research 128 §3.2 stands.
- **No `--bg`, no `funnel reset`, no `serve reset`, no port 443, and no TLS-terminating mode.**
- **No longer pairing window** (§4.9). It is owed as its own entry with his number.
- **No DNS query from Tortie** to a public resolver or to `ts.net`'s nameservers to learn when the name is live. That
  would be new outbound traffic with an unmeasured topology. It is named here so a later round weighs it rather than
  adds it.
- **Tortie writes nothing in his policy file**, and reverting his 316.4 edits is his.
- **No tailnet node on the phone and no sign-in on it.** Route 2B is not built.
- **No universal link, no page on tortie.sh**, no home Wi-Fi bind, no iroh, no CloudKit.
- **No refused-connection counter on the sheet.** The bounded log stays.
- **No write route.** Phase 317 and 316.5 ride on this door unchanged.
- **No keep-alive on the phone**, one request per connection. A later round may measure whether it is worth adding.
- **No App Store submission and no release.** His ruling of 2026-09-21 holds, and phases 311 to 317 and this one
  accumulate unreleased.
- **Nothing about the upload failure** (research 132 §13 question 3).

---

## 10. Open concerns handed to the verifiers

1. **The hand-over of buffered bytes** (§4.6 step 3). Read the builder's measurement, and attack it with a header
   and a ClientHello coalesced by a real forwarder, the stand-in.
2. **`utilityProcess` from `app.asar`** is unmeasured. The workers were measured from the packaged archive
   (`electron.vite.config.ts:73-86`), but no agent may drive a packaged Tortie to a Funnel start, because a packaged
   build ignores the override and would run the real program. Read Electron's documentation and the packaged
   archive's layout, and say what was and was not shown.
3. **`env: {}` for the door process** is unmeasured until the first app run.
4. **The approval URL's host** (O3) is the stand-in's made-up shape until a person sees the real page.
5. **Refusal 7 by generation** and the join. Place a Remove inside a composition, as 316.1's `Rm6` and `probe:p313`
   A3 do.
6. **`probe:p314` is owed a re-run**, because its seam changed. It spends two real model turns under his standing
   ruling.
7. **The profile switch** is modelled as the child exiting. Whether a real profile switch ends the child is
   unmeasured. The wake re-read and the `beginPairing` re-read are the backstops, and the checklist cannot drive it
   either. Say so rather than imply it.

---

## §As built — 330

Written by the integrator in `/private/tmp/wt-p330` at `217f47e5` (origin/main), over four builders' work (door, owner,
phone, proof), on 2026-09-29. A first integrator ran from 14:33 to about 14:45 and was cut off by a usage limit; this
section says what it left. **Nothing was committed, staged or stashed. No Electron was launched, no Simulator booted,
no `tailscale` command run and no LocalAPI called by the integrator.** Every listener the integrator started was
`127.0.0.1:0`, and every process it started (the stand-in included) was ended in a `finally`.

### What the first integrator left

It left no edit in this file: there was no half-appended section. Every tree edit it made after 14:33 was found
complete and green, and nothing was undone:

- `build/assert-hermetic-checks.mjs`: its own form of proof's patch (`scratchpad/p330/proof/assert-hermetic-checks.patch`).
  Clause 7's Go half is removed, but **clause 8 is kept as a ceiling of zero** ("nothing under `build/` runs Go"). Its
  reader is proved on five fixtures, and a script that brings Go back fails until it restores the seven settings. Proof's
  patch deleted clause 8 whole. The ceiling is kept (decision 1 below).
- `docs/audits/contract-baseline.txt`, regenerated. It moved exactly the two §4.11 lines, and nothing else.
- `ios/TortieTests/Fixtures/vectors.json`, regenerated at 14:38. `vectors.mjs --check` passes against it.
- `src/main/pocket/routes.ts`: the header's item 4 now describes the door process's pin check rather than
  `isSelfOrigin` (door's hand-off).
- `src/main/pocket/pairing.ts`: the unused second `POCKET_PAIR_BODY_CAP_BYTES` is gone. It is defined once now, at
  `door/limits.ts:41`.
- `CLAUDE.md` and `build/p330/CHECKLIST.md`. The checklist's citation table was re-read, and `pairFingerprint` moved from
  996 to 997, as its own paragraph says. `build/p316/probe-p316.mjs`, `disposer.test.ts` and `tls.test.ts` share a
  14:44:34 mtime with those two files. Their content is complete, and every gate below is green on it.
- `build/vendor/` was copied from his checkout at 14:35. It is untracked and ignored. The copy is what cured
  `gate:contract`'s ENOENT on the dangling `build/vendor/tmux/work/libevent-2.1.12-stable/.libs/libevent.la` that proof
  and phone both hit. `out/` was also built, and it is ignored too.
- Its logs are under `scratchpad/p330/integ/`: a green typecheck, 3,572 targeted tests, every gate,
  `ablation:p313` at 102/102, `ablation:p316` at 137/137, an unsigned device archive, and a reader of the door's import
  graph.

### What this spec got wrong, found by the builders and the integrator

| # | The spec says | What is true | What was built |
| --- | --- | --- | --- |
| 1 | §5 proof: remove "the `.gitignore` line" for `build/vendor/tailscalekit/` | There is no such line: `build/vendor/` has been ignored whole since Phase 15 (`.gitignore:22`) | Nothing to remove |
| 2 | §3 row 13: clause 8 is in `verification-checks.mjs` | Clause 8 and clause 7's Go half live in `build/assert-hermetic-checks.mjs`, which no builder owned | The integrator's ceiling of zero (above) |
| 3 | §6.3: any process under `/Applications/Tailscale.app` fails the run | His Tailscale app runs there all day, so every run on his Mac would fail | Proof's sampler flags a real Tailscale only under this run's app, or as a command-line call |
| 4 | §4.6 step 5: `headersTimeout` 10 s, `requestTimeout` 15 s | Both do nothing on an `http.Server` that never listens. Door measured a half-sent header still open at 6 s against a 1.5 s bound | The listener's own timers. `keepAliveTimeout` works, measured and proved by mutation |
| 5 | §4.6 step 4 / §4.12: a stranger is "destroyed at the end of the handshake" | Under TLS 1.3 the phone has already written its request when the door destroys the socket. It sees a close with nothing answered, not a TLS failure | Phone's `DoorFailure.closedBeforeAnswer`, measured on macOS (no identity at door A, and 5 of 5 at a door that no longer pins the key) and drawn by `DoorWords` |
| 6 | §4.7.4: record, save, then issue | Issuing first means a door with no key to sign with refuses before anything is written | Owner issues first (`pairing.ts` `allow`) |
| 7 | §4.5.4: "one line per word per process" | Door reads "process" as MAIN's process: `loggedWords` is module-wide and `bind.test.ts` holds it | `probe:p330` A7 accepts 1 to N unknown-key lines for N door processes |
| 8 | §4.2.7: when the door process dies, "the child is stopped first" | The child is stopped when the restart runs (the 2 s floor), not at once. In between, Funnel forwards to a closed local port. A phone pins the door's key, so nothing can answer as the door | Left as built, and said here |
| 9 | §4.13 "sweeps, reads, asks the gate" against §4.3's gate-first order | The two disagree | Launch sweeps first, then follows `openNow`'s order, so a door that cannot open never runs Tailscale |
| 10 | §4.8.1: a `ck` is "a P-256 SPKI" | OpenSSL accepts the hybrid point forms (`0x06`/`0x07`) and trailing bytes, which would give one key two pins | `isP256SpkiDer` takes exactly the 91-byte uncompressed form (owner, measured) |
| 11 | §4.11: `PocketFunnelView`'s four fields | §4.9's `CODE_FIRST_NAME` needs the renderer to know `publishedAt` | `publishedAt` added |

### Decisions the integrator took, and where each comes from

1. **The hermetic clause 8 stays a ceiling of zero.** §3 row 13 asks for "green by construction rather than by a floor
   of zero". A ceiling proved on fixtures is that, and it keeps 316.3's reason alive: a Go script cannot come back
   without the seven settings. **Proved able to fail in an APFS clone.** Unplanted, it exits 0. A top-level
   `spawnSync('go', …)` exits 1 with the sentence, and a `GOTOOLCHAIN` in a subdirectory also exits 1. The clone was then
   removed.
2. **Four comments said "the tailnet door".** They were corrected in `src/shared/ipc/pocket.ts:60`,
   `src/shared/ipc/index.ts:235` and `:329`, and `src/preload/pocket.ts:6-9`. Only comments changed, so
   `gate:contract` is unmoved.
3. **The push seam's own refusal had no test** (owner's hand-off). `standInOnly` in `src/main/harness/push-seam.ts` is
   now exported for the test alone. `src/main/harness/__tests__/push-seam.test.ts` gains an `isPackaged` getter on its
   Electron mock and four rows:
   - no override refuses;
   - an override that is not an absolute executable refuses and never falls back;
   - a packaged build refuses;
   - a development build with an executable override pairs.

   Two one-clause mutations were each run and restored by sha256. `!== 'missing'` for `=== 'dev-override'` turned 3 rows
   red, and `packaged = false` turned 1 row red.
4. **`npm run package` ran with `CSC_IDENTITY_AUTO_DISCOVERY=false`**, which is `electron-builder.yml:20-23`'s unsigned
   lane. With it, neither electron-builder nor `build/sign-nested-binaries.cjs:123` asks his keychain for an identity.
   The log says `skipped macOS application code signing … CSC_IDENTITY_AUTO_DISCOVERY=false`.
5. **Not changed, and handed to the verifiers:** the TLS resumption finding, the `ps` record race under the probe's
   wrapper, and the 64-pin wire bound. All three are below.

### Commands, as run by the integrator

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` (after the integrator's edits) | 0 | 33 s; import boundaries 75 fixtures, 1,375 files, 0 violations (the allow-only wall included); 0 runtime cycles |
| `npx vitest run` (the whole suite) | 0 | 1,012 files passed, 1 skipped; 17,444 tests passed, 7 skipped; 63 s |
| `npx vitest run src/main/harness/__tests__/push-seam.test.ts` | 0 | 64 tests (60 + the 4 new) |
| `npm run -s conformance:pocket` | 0 | 41 rules, 8,547 checks; with `out/` present, U5 read 2 built files |
| `npm run -s conformance:pocket:hostile` | 0 | 87 arms, 1.4 s |
| `npm run -s conformance:push` | 0 | 23 rules, 2,255 checks |
| `npm run -s conformance:ios` | 0 | 20 rules over 19 app files, 17 test files, 45 files under `ios/` |
| `npm run -s conformance:phonecopy` | 0 | `phonecopy OK` |
| `gate:checks`, `gate:contract`, `gate:electron`, `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 each | 238 check scripts, 2 Xcode harness entries, 0 of 490 scripts run Go; the contract byte for byte; 154 reach `electron-run.mjs` against a floor of 154; 3 long-lived starts, each in a `finally`; 2 reach `simulator-run.mjs`; 19 reach `ssh-run.mjs` |
| `npm run -s build` | 0 | 36 s; `out/main/pocket-door.js` requires `node:crypto`, `node:http`, `node:net`, `node:tls` and one chunk, which requires nothing |
| `npm run -s ablation:p313` | 0 | **102 of 102** arms red on the rule that owns them, 227 s |
| `npm run -s ablation:p316` | 0 | **137 of 137**, every rule (a) to (v) able to fail, 83 s, the working tree unmoved |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 50 s; `release/Tortie-0.110.0-arm64.{dmg,zip}`, unsigned; `app.asar` holds `/out/main/pocket-door.js` and `/out/main/chunks/table-BJMk5hUE.js` beside the two workers, none unpacked |
| `xcodebuild archive … -configuration Release -destination generic/platform=iOS … -derivedDataPath …/dd-integrator2 CODE_SIGNING_ALLOWED=NO` | 0 | 19 s; the one `warning:` is `appintentsmetadataprocessor`'s; "not signed at all"; `CFBundleVersion` 2, `CFBundleShortVersionString` 1.0.0; no `Frameworks/` directory; the binary links system libraries only (Network, Security and CryptoKit among them) |
| `node build/p316/test-ios.mjs --read-app <that .xcarchive>` | 0 | 1 Mach-O file; "none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam" |
| `node build/p330/tailscale-standin.mjs --self-test`; `probe-p330.mjs --grader-self-test`; `hostile-door.mjs --self-test`; `probe-p316.mjs --grader-self-test`; `vectors.mjs --check` | 0 each | 36 checks; 12 graders, 86 clauses; 23 arms; 17 dumps; 5 signed requests, 2 pins, 1 client certificate, 2 seals, 2 QR payloads, 3 `/pair` answers |
| `node --check` on the four probes, the stand-in, the node phone, the hostile door, `test-ios.mjs`, `vectors.mjs` | 0 each | — |
| raw control bytes over the 94 touched text files (5 more are deletions); `git diff --check` | — / 0 | 0, and tabs only in `project.pbxproj` and the plists |

### The seams, read

- **Main and the door process.** `bind.ts` posts `start`, `update`, `answer`, `shutdown` and `stop` through
  `toDoorOf`, the validator the door runs itself. `dispatch` refuses by generation and asks `stopping()` again with
  nothing awaited before the post. `server.ts` asks refusals 1, 4, 6 and 7, with `stillPaired` before the door. The
  door's `DoorPresentation` is owner's `PocketSealedPresentation` field for field.
- **The window across Allow.** `allow()` leaves the window open until its deadline, so the phone's certificate-less
  poll still reaches `/pair`. `savePhones` posts the new pins before `allow` returns. A re-paired phone's row is
  replaced by id, never duplicated. The pins' `phoneId` and the verifier's `channel` check are both `p.id`.
- **Funnel and the stand-in.**
  - The argv (`funnelArgv`) is the stand-in's one accepted funnel shape.
  - `Available on the internet:` is printed after the per-pid entry is written, and the entry holds exactly what
    `servesThisDoor` asks for.
  - `readFunnelOf` drops dead pids, so a SIGKILLed child frees its port for arm 9.
  - The approval URL is printed after nine spaces, as the CLI prints it.
  - The four refusal texts match `classifyFunnelExit`'s substrings.
- **`Host` and SNI.** The listener requires SNI `== publicName` and `Host == <publicName>:<publicPort>`. The Swift
  client (`DoorClient.parameters`, `DoorHTTP.request`) and the node phone (`node-phone.mjs:340-350`) send exactly those.
- **The QR.** `pairing.ts` `open()` emits exactly the eight keys of §4.8.1. Its one secret is `ps`, the window's
  one-shot, which is shredded at Allow and at the deadline. It carries no credential and no address.
- **The probe and the sheet.** `probe-p330` finds `section[aria-label="Phone"]` and `[data-phone-id]` rows, which
  `PhoneSection.tsx:447`, `:461` and `:544` draw. It reads the button words from the sheet's own constants.
- **The quit.** `beginFunnelShutdown()` sits beside `beginPocketShutdown()` before the first await, and
  `await joinFunnel()` (`capabilities.ts:623`) comes before `await joinPocketDoor()` (`:634`), both above
  `shutdownGmuxCore()`. `disposer.test.ts` holds that order.
- **Words.** Every sentence in §4.10's two tables and §4.12.6's table is in the tree byte for byte. The one exception is
  `door’s`, which is written with the house's typographic apostrophe. Every name marked deleted is gone from `src/` and
  `ios/`. `PocketFunnelRefusal` and `POCKET_FUNNEL_SENTENCES` are a closed union and a `Record` over it, so a refusal
  with no sentence does not compile. On the phone, `pairingSentence` and `stepSentence` answer a non-optional `String`
  for all 13 failures and all 4 steps.
- **The checklist.** Every `file:line` in its table was printed and read against the word it cites: all 37 land. The
  `--read-app` words it quotes are `test-ios.mjs:172`'s `PASS_WORDS`, byte for byte.
- **The door process's graph.** From the source, the runtime files are only `door-process.ts` and `door/**`. The
  builtins are `node:crypto`, `node:http`, `node:net` and `node:tls`. `shared/ipc/pocket.ts` is imported for types
  only, and `send.ts`'s `node:http` import is for types only. From the built bundle, the integrator's own grep agrees,
  and neither file names `electron`, credentials or logins.

### Measured by the integrator, beyond the builders

- **The buffered-bytes hand-over through the REAL forwarder** (§10 concern 1). The stand-in (`makeStandin`, its wrapper,
  `funnel --tcp=8443 --proxy-protocol=2`) was run in front of the SHIPPING `createDoorListener`, in-process on loopback,
  with a client certificate from `issueClientCertificate`:
  - coalesced: 20 of 20 mutual-TLS reads answered 200, with `handedBuffered` 20. Every ClientHello rode with the header
    and was handed to TLS by `unshift`.
  - `coalesce: false`: 20 of 20 answered 200, with `handedBuffered` 0.
  - The stand-in was ended, with 0 pids left.
  (`scratchpad/p330/integ2/forwarder.mts`.)
- **TLS 1.3 session resumption, on the door's side** (`scratchpad/p330/integ2/resume.mts`, the SHIPPING listener and
  Node's own client). The listener issues TLS 1.3 tickets, which is OpenSSL's default: nothing in `listener.ts` names a
  ticket or a session.
  - A client that resumes a ticket from a CERTIFICATE-LESS session, while presenting an identity, reaches the door with
    NO peer certificate. With the window shut the door refused it `no-certificate` (row D). With the window open it was
    admitted with `channel = null`, so a signed route is refused.
  - A client resuming a ticket from a session that DID carry a certificate keeps that certificate. After its pin was
    removed it was refused `unknown-key` (row F), so revocation holds under resumption.
  - Tickets die with the door process, because each process has its own ticket keys.

### Open concerns for the verifiers

1. **Whether the phone ever resumes its certificate-less `/pair` session into a signed read.** The door side is
   measured above. Here is the phone side so far:
   - On macOS, Network.framework did NOT: in the phone builder's harness (`scratchpad/p330/phone-mac/last-run.log`,
     lines 17 to 18), a certificate-less `/p330/issue` to door A ran just before `/p330/whoami` with an identity, and
     that read presented the right pin.
   - On iOS it is unmeasured. `P330TransportTests.testAKeychainIdentityIsPresentedAndPinned` makes exactly that sequence
     against a Node door that issues tickets, so **`test:ios` on 26.3 and 18.3 answers it**. `probe:p316`'s M1 counts
     `no-certificate` lines after a real pair and read.
   - If iOS resumes, the fix is the phone's:
     `sec_protocol_options_set_tls_resumption_enabled(options, false)` in `DoorClient.parameters`. The Mac cannot
     tell a resumed certificate-less session from a stranger, and it should not try.
2. **The orphan record under the probe's `/bin/sh` wrapper.** `FunnelRun.record()` runs `ps` straight after the spawn.
   The real program (`/Applications/Tailscale.app/Contents/MacOS/Tailscale`, the first candidate) does not `exec`, so
   its command line never changes. The probe's wrapper `exec`s node, though. A `ps` that landed before that `exec` would
   record `/bin/sh <wrapper> …`, and launch B's sweep would then "leave a process alone". That is unlikely, since a
   `/bin/ps` start is slower than a shell's `exec`, but if arm 11 fails that way, it is this race, not the sweep.
3. **The wire's 64-pin bound** (`door/wire.ts` `DOOR_PINS_MAX`) has no matching cap on paired phones. A 65th phone
   makes `toDoorOf` refuse every `start` and `update`, so the door would time out as `bind-failed`. Nobody will pair 65
   phones, but the failure would be misnamed.
4. **`utilityProcess` from `app.asar`** (§10 concern 2). The packaged archive holds `/out/main/pocket-door.js` and its
   chunk inside `app.asar`, with none unpacked. That is exactly where the two `worker_threads` entries sit, and those
   were measured working from the asar. A `utilityProcess` entry inside the asar was NOT run: no agent may drive a
   packaged Tortie to a Funnel start.
5. §10 concerns 3 (`env: {}`), 5 (refusal 7 by generation with a Remove inside a composition), 6 (`probe:p314` is owed
   a re-run, with its two real model turns) and 7 (the profile switch is modelled as the child exiting) stand unchanged.
6. **Door could not test** a client whose `CertificateVerify` is signed by a key that does not match its certificate.
   Node refuses to build such a client, so that rests on OpenSSL.
7. **Owner's stated limit:** `pocket:removePhone` and the alerts switch can wait up to 10 minutes behind a start that
   is waiting on Tailscale's approval.
8. **Door's log wording moved.** It now reads "refused a request at the door: <word>" and "refused a connection at the
   door: <word>". Every probe in the tree greps the new words; `probe-p313.mjs:963-964` accepts both.

---

## §As built — 330, the fix round

Written by the fixer in `/private/tmp/wt-p330` at `217f47e5`, on 2026-09-29, from the two verdicts: lens 1 approved
with three nits, lens 2 answered `needs_work` with five majors, one minor and one nit. **The fix runs once**; the
reverify is not this step's. **Nothing was committed, staged or stashed. The fixer launched no Electron, booted no
Simulator, ran no `tailscale` command and called no LocalAPI.** Every process it started was a gate, a test, an
`xcodebuild` build or archive (ad hoc, no team, `-derivedDataPath scratchpad/p330/dd-fixer`), or the stand-in's
own self-test, and every one ended.

No row of either verdict's no-regression table read worse, for a person who never turns the door on or for one who
does, so nothing was removed; every fix below is a repair.

### What was fixed, and where

| # | The verdict | The fix | The proof, run |
| --- | --- | --- | --- |
| 1 | Lens 2, major: the door process held main's WHOLE environment, because Electron 43 reads `env: {}` as unset (measured with `ps -E` and a standalone fork) | `bind.ts`'s one fork passes `env: { TORTIE_DOOR: '1' }`: one variable of the door's own, which Electron treats as a replacement. The door reads nothing from its environment. New `conformance:pocket` rule **E1**: the fork's `env` is an object literal of at least one plain string, never `{}`, never a spread, never `process.env`, and `door-process.ts` and `door/**` read no `process.env`. `probe:p330` gains **A13**: `ps -E` on the running door must show `TORTIE_DOOR` and no `HOME`, no `GMUX_TAILSCALE_BIN` and no `P330_MAIN_MARKER`, the variable the probe gives main alone, with main's own `ps -E` showing the marker as the control | `bind.test.ts` pins the literal; the one-clause mutation back to `env: {}` turned it red; `ablation:p313` arms `E1a` (`env: {}`), `E1b` (a spread of `process.env`) and `E1c` (the door reading `process.env`). **The running door's environment needs an Electron and is the reverify's: `probe:p330` A13** |
| 2 | Lens 2, major: while the lines could not be agreed to, the sheet drew them with Allow instead of the refusal. Both ports held on a first Pair drew `https://<name>:0`; Allow recorded that and forked a door with port 0, reported 14 s later as `bind-failed`. Tailscale stopped with the gate never or changed drew the stored lines instead of "Tailscale is not running…" | ONE predicate in main, `PocketHost.confirmable(fields)`: a public name, a public port in `FUNNEL_PORTS`, and no Tailscale read or port choice that failed since. `PocketStatus` gains `confirmable: boolean`. `confirmDoor` refuses without it, synchronously and before the record, with the read's own sentence or `NOTHING_TO_ALLOW` ("Tortie has not read Tailscale for this door yet, so there is nothing to allow. Press Try again. Nothing was changed."). `openNow` asks it again after its read and before the fork (a record over port 0 can no longer be written, but a launch would otherwise fork onto one). `status().refusal` puts that sentence first. The sheet's `doorNeedsConfirm` requires `status.confirmable`, and `doorMayRetry` also offers **Try again** when it is false, so a face that refuses always has the press that reads Tailscale again | `ipc.test.ts` +4 (the first Pair with both ports held; a confirm before the read lands; Tailscale stopped with nothing agreed to, then Try again; a planted port-0 agreement forks nothing at launch); the sheet test +4 (three refusal faces and the face that allows again); 4 one-clause mutations each red. `probe:p330` gains **A12**, the first Pair with both ports held, through the sheet and the bridge |
| 3 | Lens 2, major: `test:ios` red on 26.3 and 18.3, Debug and Release: the minted client key read back `kSecAttrAccessible` `dk` (Always), not `aku` | `ios/Tortie/Door/Keys.swift`: the access control is made ONLY on the enclave path (`WhenUnlockedThisDeviceOnly`, `.privateKeyUsage`); the software path names `kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly` itself. `conformance:ios` (n) now refuses an access control that can have no flags and requires the software path's own accessibility inside the function that makes the key (the certificate's add does not count for it), with 3 new scanner fixtures; `ablation:p316` re-aims `n4` and `n6` and adds `n9` (THE SHAPE THAT SHIPPED) and `n10` | `conformance:ios` PASS; `ablation:p316` 139 of 139; `xcodebuild build-for-testing` for the Simulator SDK and an unsigned device archive, both green. **Whether the key now reads back `aku` is a Simulator measurement and is the reverify's: `test:ios` on 26.3 and 18.3.** The explanation of `dk` is not measured here, only the fix the verifier proposed; the enclave key's own read-back class stays a device measurement |
| 4 | Lens 2, major: `probe:p330` red. A2 graded the lines the switch answered with, before the read (`https://:0`); A4's record held `/bin/sh <wrapper> …` because the record was taken before the wrapper's `exec`, 2 of 2; the record's directory was `<userData>/gmux` at 0755; A10 pressed Allow before the lines were read and graded the child it never had as alive | The probe: `linesReady(name)` (main's `confirmable`, the name in the first line, no read under way) before A2 is graded and before every Allow; `allowDoor` presses the confirm block's own Allow once it is enabled; A10 with no child is UNREADABLE, never alive. `funnel.ts`: the record is taken straight after the spawn, AGAIN at the child's first line of output, and AGAIN at the counted start, chained so the last `ps` reading is the one on disk, and never once a stop has begun. The record moved to a directory of its own, `<userData>/gmux/pocket-funnel/record.json`, narrowed with `chmodSync(dirname(path), 0o700)` every time, because `mkdirSync`'s mode applies only when it creates. `conformance:pocket` U3 gains clause (d) for both | `funnel.test.ts` +3 (an exec'ing program's record follows `ps`; an existing 0755 directory narrowed and the one above it left alone; no write after a stop began), each red under its one-clause mutation; `ablation:p313` arms `U3d` (no chmod) and `U3e` (the record back in `gmux`). **`probe:p330` itself is the reverify's** |
| 5 | Lens 2, major: `probe:p316` red at D1, confirming lines over empty fields | `confirmListening` waits for `confirmable`, lines naming the stand-in's name and no read under way before it confirms; main refuses such a confirm anyway (row 2). The same race was in `build/probe-p313.mjs` D1, whose wait (`confirmLines.length > 0`) was true before any read: fixed the same way | `node --check` and both graders' self-tests. **The probes themselves are the reverify's** |
| 6 | Lens 2, minor: the counts left out the likely first-time wait | `build/p330/CHECKLIST.md` gains "What the first pairing costs, counted": about 9 actions on his approved tailnet, about 12 to 18 on a fresh one, and a probable failed first scan plus a wait of several minutes and 2 more actions until the owed window change lands; row 4 asks him to write down the minutes | — |
| 7 | Lens 2, nit: stale "tailnet key" comments | `src/renderer/settings/phone/Qr.tsx` (and its sizes, re-measured over `v: 3` with the vendored encoder: 290 bytes and version 13 for a 25-character name, 513 bytes and version 18 for a 248-character one) and `src/main/capabilities.ts:163` | — |
| 8 | Lens 1, nit: 64 pins on the wire and no cap on pairing | `PocketPairing.allow` refuses a phone that would make more than `DOOR_PINS_MAX` (imported from `door/wire.ts`, never re-spelled), before anything is signed or written, with its own sentence | `pairing.test.ts` +1 (the 65th refused and nothing signed, the 64th allowed), red under its mutation |
| 9 | Lens 1, nit: "one line per word per process" | The comment on `loggedWords` in `bind.ts` now says what ships: one line per word per MAIN process, across every door it forks | — |

**Not changed, and why:** lens 1's third nit, the Funnel child stopped at the restart rather than at once when the
door process dies. It is an availability window of up to the 2 s floor during which Funnel forwards to a closed local
port, and nothing can answer as the door because the phone pins its key; §As built row 8 already records it. Stopping
the child earlier means a new job in the switch queue beside the restart, which this round did not want to add
without a verifier looking at it.

### What this round got wrong about the SPEC, said here

- §4.2.6 "Straight after the spawn, `ps` … is written": straight after the spawn is not enough for a program that
  `exec`s. The record is now taken three times (row 4).
- §4.2.6 "its directory at 0o700": true only for a directory the record owns. It is `<userData>/gmux/pocket-funnel/`
  now, not `<userData>/gmux/`.
- §4.5.1 and §1 "`env: {}`": wrong for Electron 43, measured by lens 2. It is `env: { TORTIE_DOOR: '1' }`.
- §4.10 `doorNeedsConfirm` = "`state !== 'off' && publicName !== null && confirmState !== 'confirmed'`": it also needs
  main's `confirmable`, and `doorMayRetry` also offers Try again when that is false.
- §4.7.1 "access control … with `.privateKeyUsage` on the enclave path": the access control is the ENCLAVE's only;
  the software key names its accessibility itself.

### Commands, as run by the fixer

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries 75 fixtures, 1,375 files, 0 violations; 0 runtime cycles |
| `npm run -s build` | 0 | 31 s; `gate:electron` 154 against a floor of 154, `gate:background` 3 starts each in a `finally`, `gate:simulator` 2 against 2, `gate:knownhosts` 19, `gate:checks` 238 scripts, `conformance:ios` 20 rules PASS, `gate:contract` byte for byte (the new `confirmable` field is a type, which the inventory does not list); the built `out/main/index.js` carries `env: { TORTIE_DOOR: "1" }` |
| `npx vitest run` | 0 | 1,012 files passed, 1 skipped; 17,456 tests passed (17,444 before, +12), 7 skipped; 46 s |
| one-clause mutations of the fix, in the tree, each restored by sha256 (`scratchpad/p330/fixer/mutate.mjs`) | 0 | 9 of 9 red: confirmDoor over unconfirmable fields (3 tests), openNow onto port 0 (1), the sheet ignoring confirmable (3), Try again only for an agreed door (3), no re-record (1), no chmod (1), a record after the stop began (1), no pin cap (1), `env: {}` (1) |
| `npm run -s conformance:pocket` | 0 | 42 rules, 8,660 checks; E1 15 checks; U5 read the fresh build |
| `npm run -s conformance:pocket:hostile` | 0 | 87 arms |
| `npm run -s conformance:push` / `conformance:phonecopy` | 0 / 0 | 23 rules, 2,256 checks / `phonecopy OK` |
| `npm run -s ablation:p313` | 0 | **107 of 107** red on the rule that owns them, 254 s: the 102 before and `U3d`, `U3e`, `E1a`, `E1b`, `E1c`, each newly red on its own rule |
| `npm run -s ablation:p316` | 0 | 139 of 139 red, every rule (a) to (v), 101 s, the working tree unmoved |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 62 s; unsigned `release/Tortie-0.110.0-arm64.{dmg,zip}`; `app.asar` holds `/out/main/pocket-door.js` and its one chunk, now `table-CJTYFW-T.js` (the hash moved because `pairing.ts` now imports `DOOR_PINS_MAX` from `door/wire.ts`, so the shared chunk carries it); the door still requires `node:crypto`, `node:http`, `node:net`, `node:tls` and that chunk, which requires nothing |
| `xcodebuild build-for-testing … -destination 'generic/platform=iOS Simulator' … CODE_SIGNING_ALLOWED=NO` | 0 | TEST BUILD SUCCEEDED; 0 Simulators booted |
| `xcodebuild archive … Release … generic/platform=iOS … CODE_SIGNING_ALLOWED=NO` | 0 | 17 s; "not signed at all"; `CFBundleVersion` 2 |
| `node build/p316/test-ios.mjs --read-app <that .xcarchive>` | 0 | 1 Mach-O file; "none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam" |
| the stand-in's `--self-test`; `probe-p330.mjs --grader-self-test`; `hostile-door.mjs --self-test`; `probe-p316.mjs --grader-self-test`; `vectors.mjs --check` | 0 each | 36 checks; **14 graders, 100 clauses** (A12 and A13 added, each clause red on its own break); 23 arms; 17 dumps; the vectors unchanged |
| `node --check` over the four probes, the stand-in, the node phone, the hostile door, `test-ios.mjs`, `vectors.mjs` and the four gate scripts edited | 0 each | — |
| `git diff --check`; raw control bytes over 95 touched text files | 0 / — | 0 |

### Handed to the reverify, live, because only an app run or a Simulator can show them

1. `probe:p330` whole, under THE LOCK, and specifically **A13** (the running door's `ps -E`), **A12** (both ports
   held on a first Pair), **A2**, **A4** (the record equal to `ps` after the wrapper's `exec`, 0600 in a 0700
   directory), **A6** (every sheet draws its sentence, ports-taken and no program included), **A10** and **A11**.
2. `test:ios` on iOS 26.3 and 18.3, Debug and Release: `DoorKeychainTests.testAClientKeyIsMintedAndDeletedByItsTag`
   must read `aku`. If it still reads `dk`, the software key's accessibility is not what this round believed, and
   that is the operator's.
3. `probe:p316` unmodified from the tree: D1 and every phone arm.
4. `probe:p313` D1 and D2, whose wait had the same race.
5. The faces lens 2 drew by hand (F1, F2, F4, F4b) through the sheet, if the reverifier's method reaches them
   again.

### For the main session, not this step's to write

- **Queue the owed window entry now** (§4.9): the first code after Tailscale starts publishing lasts long enough for
  the name to reach a phone. His 8 minutes (M5), the 5-minute negative cache (O4), and now the checklist's own
  minutes from row 4.
- The entry's "What a person notices" and research 132 §2's counts leave out the probable failed first scan; the
  checklist now says it (row 6 above). `docs/BACKLOG.md` and the research are not this step's to edit.

## §As built — 330, after his ruling

Written by the fixer in `/private/tmp/wt-p330` at `217f47e5`, on 2026-09-29, after the second `needs_work` and **his
ruling, "Accept it, land 330"**. This is the one fix round after the ruling, and it did four things and nothing wider.
A first run of this round was paused part-way (its edits to `Keys.swift`, `DoorKeychainTests.swift`,
`conformance-ios.mjs`, `ablation-ios.mjs`, §4.7.1, `probe-p330.mjs` and `funnel.ts` were found in the tree, read
against the reverify's clone of 17:49 and kept); this run finished it. **Nothing was committed, staged or stashed.
No Electron was launched, no Simulator booted, no `tailscale` command run and no LocalAPI called.** Every process
started was a gate, a test, an `xcodebuild` build for testing (generic Simulator destination, no device,
`-derivedDataPath scratchpad/p330/dd-fixer-ruling-{Debug,Release}`), or the reverify's own sweep attack, whose one
sleeper it ends in its `finally`.

### What his ruling changed, and where

| # | What | The change | The proof, run |
| --- | --- | --- | --- |
| 1 | The key test, to his ruling | `ios/TortieTests/DoorKeychainTests.swift`: `testAClientKeyIsMintedAndDeletedByItsTag` is the ENCLAVE row. It fails when the runtime reports no Secure Enclave, then asserts `kSecAttrTokenID` = `kSecAttrTokenIDSecureEnclave` (`com.apple.setoken`) and that the key's access control's protection, read from its description the way the reverify's experiment read it (`<SecAccessControlRef: cku;dacl(true)>` reads `cku`), is `aku` or `cku`, and never synchronisable. It no longer asserts `kSecAttrAccessible == aku`. The docstring that said the Simulator has no enclave is gone. NEW `testASoftwareClientKeyIsThisDeviceOnly` (inside `#if DEBUG`) forces the SOFTWARE path through the store's DEBUG seam and asserts no token and `kSecAttrAccessible` = `aku`. NEW `testAReleaseStoreHasNoSoftwareSeam` (the `#else`) asserts a Release store has no stored field at all. `ios/Tortie/Door/Keys.swift`: `KeychainClientKeys.softwareKeyDebugSeam` inside `#if DEBUG`, read through `softwareOnly`, which is `false` in Release; the false comment (the claim that a key under a flag-less access control read back `dk`) is removed. **The software path's own `kSecAttrAccessible` is kept, and it is LOAD-BEARING**: the second reverify measured a software key made without it reading back `ak` (WhenUnlocked, not ThisDeviceOnly) on both runtimes, and `aku` with it (corrected by the main session at landing; the fix round had called it harmless). `build/conformance-ios.mjs` (n): the clause refusing a flag-less access control is REMOVED, because its reason was false; it is restated as what is true, ThisDeviceOnly by construction on both paths: an access control is made only inside the `if` on `SecureEnclave.isAvailable` (read by one helper, `insideEnclaveIf`, which the enclave-token clause now shares, and which reads only the block's own `if` and refuses a negated one), and the software key names its own accessibility. (d)'s header names the new seam, which its `Debug`-declaration clause already holds | `conformance:ios` PASS, 20 rules, with 5 new (n) fixtures (a shared access control made before the `if`; one on the software path; one under `if !enclave`; an earlier binding not taken for the block's own `if`; and the control that a flag-less access control INSIDE the enclave's `if` is no longer refused). `ablation:p316` **140 of 140**: `n9` re-aimed to the shape before the fix round (one access control for both paths, made before the `if`, the software line kept), red on (n) alone; NEW `d6` (the seam taken out of `#if DEBUG`), red on (d). `xcodebuild build-for-testing` Debug and Release (`ENABLE_TESTABILITY=YES`, as `test:ios` passes it): both TEST BUILD SUCCEEDED. The built Release app names no `softwareKeyDebugSeam` in any executable file and the Debug app does (the control); `test-ios.mjs --read-app` on the Release app: no DEBUG seam. **The keys themselves are a Simulator measurement and the reverify's** |
| 2 | The A13 control | `build/p330/probe-p330.mjs`: the reverify's diff applied. The control is a SIBLING of the door that main started with its whole environment, the `--utility-sub-type=network.mojom.NetworkService` descendant, because Electron's main empties its own environment when it renames itself `Tortie`. The clause reads "a sibling of the door reads main’s environment (the control)" and requires the control's pid to be neither main's nor the door's, its parent to be the door's parent, it to be the network service, and its `ps -E` to show `P330_MAIN_MARKER`. The fixture table gains `refused`, readings that must NOT be accepted as the control, each red on that clause: a control read from main after the rename with its environment emptied, and one read from main that still showed the marker | `probe-p330.mjs --grader-self-test` PASS: 14 graders, 100 clauses, and the two refused readings each red on the control clause (119 lines). **The live A13 is the reverify's** |
| 3 | The orphan sweep | `src/main/pocket/funnel.ts`: `recordNamesFunnelChild(command)` reads the command's last ` funnel ` and requires the tail to be exactly `funnelArgv(publicPort, localPort).join(' ')` with the public port in `FUNNEL_PORTS` and a local port in 1 to 65535, so the argv is spelled once. `sweepFunnelOrphan` asks it before `ps`: a record naming anything else is removed, nothing is signalled, `ps` is not asked, and the log says `left a process alone: its record names no Funnel child`. §4.2.6 is restated. `conformance:pocket` U3 gains clause (e): `recordNamesFunnelChild` exists and compares against `funnelArgv` over `FUNNEL_PORTS`, and every signal in the sweep follows an `if (!recordNamesFunnelChild(<record>.command))` that removes the record and returns. `ipc.test.ts` and `switch-queue.test.ts`: their fake `ps` printed `standin <pid>`, which no `ps` prints for a process spawned with the Funnel argv; it now prints the program and the argv the fake was spawned with, as `ps` does | `funnel.test.ts` +2: a record naming `/bin/zsh -l`, which `ps` confirms exactly, is left alone with no `ps` call, no signal and the record gone; and `recordNamesFunnelChild` over 3 honest shapes (the stand-in after its wrapper's `exec`, the wrapper before it, the real CLI) and 12 refused ones. `ablation:p313` NEW `U3f` (the guard removed) newly red on U3. One-clause mutations in the tree, each restored by sha256: the guard removed, the comparison returning true, the port check removed, each red. The reverify's own `sweep-attack.mts`, re-run with the SHIPPING `ps` and `kill` and its own sleeper: V1 (a record naming a node sleeper exactly) now reads `left-alone`, the sleeper alive after, the record gone; V2 `left-alone` |
| 4 | The nit | `src/main/pocket/ipc.ts` `status()`: `readSentence` is `null` when `state === 'off'`, so a door that is off composes no Tailscale sentence; `confirmable` is still computed | `ipc.test.ts` +1: Tailscale stopped, on, then off: the refusal is not the not-running sentence. Red under its one-clause mutation |

### What the earlier rounds got wrong, said here

- §As built — 330, the fix round, row 3, and `conformance:ios` (n) as it stood: the `dk` the first `test:ios` read was
  **the enclave key's own `kSecAttrAccessible`**, not a software key made under a flag-less access control. The
  Simulator has a Secure Enclave (`SecureEnclave.isAvailable` true on iOS 26.3.1 and 18.3.1), so the shipping mint
  never took the software path there; a software key under either spelling reads `aku`.
- The same section's hand-off item 2 ("must read `aku`") asked the enclave key for a class it does not carry. His
  ruling replaced that promise (§4.7.1): the enclave token, and an access control whose protection is ThisDeviceOnly.
- §4.2.6's sweep proved only that a record file describes a running process. It now also requires the record to
  name the argv Tortie spawns.
- `probe:p330` A13's control read main's own `ps -E`, which Electron empties when main renames itself.

### Commands, as run by this fixer

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries 75 fixtures, 1,375 files, 0 violations; 0 runtime cycles |
| `npx vitest run src/main/pocket` | 0 | 13 files, 428 tests (425 before this run: +2 funnel, +1 ipc) |
| one-clause mutations (`scratchpad/p330/fixer2/mutate.mjs`), each restored by sha256 | 0 | 4 of 4 red: the sweep's guard removed, the comparison returning true, the port check removed, the read sentence composed while off |
| `npm run -s conformance:pocket` | 0 | 42 rules, 8,701 checks before the build (U3 +2) |
| `npm run -s conformance:pocket:hostile` | 0 | 87 arms |
| `npm run -s ablation:p313` | 0 | **108 of 108** red on the rule that owns them, 258 s: the 107 before and `U3f`, newly red on U3 |
| `npm run -s conformance:ios` | 0 | 20 rules PASS |
| `npm run -s ablation:p316` | 0 | 140 of 140 red on the rule that owns them (`d6` new, `n9` re-aimed), the tree unmoved |
| `npm run -s gate:simulator` / `gate:checks` / `gate:electron` / `gate:background` | 0 each | 2 against a floor of 2; 0 of 490 scripts run Go; 154 against 154; 3 starts, each in a `finally` |
| `node build/p330/probe-p330.mjs --grader-self-test` | 0 | 14 graders, 100 clauses, and the 2 refused control readings |
| `xcodebuild build-for-testing` Debug, then Release | 0, then 65, then 0 | the first Release build omitted `ENABLE_TESTABILITY=YES`, which `test:ios` passes, and could not import the app; with it, TEST BUILD SUCCEEDED |
| `node build/p316/test-ios.mjs --read-app` on the Release app | 0 | no DEBUG seam; `softwareKeyDebugSeam` in 0 of its executable files, and in the Debug app's (the control) |
| the reverify's `sweep-attack.mts` under the pinned `tsx` | 0 | V1 and V2 `left-alone`; no sleeper left |
| `node --check` over the five scripts edited; `git diff --check`; raw control bytes over the 13 files touched | 0 | 0 |
| `npm run -s build` | 0 | 32 s; `gate:electron` 154 against 154, `gate:background` 3 starts, `gate:simulator` 2 against 2, `gate:checks` 238 scripts, `conformance:ios` 20 rules PASS, `gate:contract` byte for byte |
| `npm run -s conformance:pocket`, after the build | 0 | 42 rules, 8,706 checks; U5 read the fresh build |
| `npx vitest run` | 0 | 1,012 files passed, 1 skipped; 17,459 tests passed (17,456 before, +3), 7 skipped; 50 s |

### Handed to the reverify, live, because only a Simulator or an app run can show them

1. `test:ios` on iOS 26.3 and 18.3, Debug and Release. Debug: the enclave row reads the token `com.apple.setoken` and
   a protection of `cku` (or `aku`), and the software row reads no token and `aku`. Release: the store has no field,
   and every other test passes.
2. `probe:p330` whole, under THE LOCK: A13 with the sibling control (the network service shows the marker; the door
   holds `TORTIE_DOOR` alone), and **A11**, the crash orphan, because the sweep now also requires the record to name
   the Funnel argv: the stand-in's record after its wrapper's `exec` must still be ended.
3. The reverify's `sweep-attack.mts` again, as its own run.
