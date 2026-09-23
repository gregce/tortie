# Phase 316 — the iPhone app — SPEC

Written 2026-09-22 at `ce754649` (origin/main), after Phase 313 landed at `38346773` and while Phase 314 is
being built in `/private/tmp/wt-p314`. Inputs: the Phase 316 entry (`docs/BACKLOG.md:33385-33483`) and his
ruling at its end, research 127 and research 128 (all of §8 and §9), the seven approved screens in
`docs/design/phone/`, Phase 313 as built (`src/main/pocket/`, `build/p313/SPEC.md`), the Phase 314 entry, two
investigators and one adversary. Where the adversary refuted an investigator, the adversary's answer is
used unless this document shows otherwise. It does so twice, in §2 rows 20 and 29.

**This file is what 316's builders build from.** Every step in §4 re-reads its own section against the
tree at its own head before a builder starts. The tree has moved before, and a number written here can go
stale.

---

## 1. The answer first

1. Phase 316 is the Tortie iPhone app. It has three screens he reads: every session, with the ones waiting
   on him first; one session's progress; and that session's whole conversation, paged back from the newest
   turn. It also has a pairing screen. It works over a tailnet node carried inside the app, so the phone
   needs no Tailscale app and no VPN profile.
2. Before any Swift is written, the first step switches on the door Phase 313 built but never connected.
   Today nothing calls `registerPocketIpc`, nothing sets `enabled`, there is no Settings → Phone, and the
   conversation store would give the phone out-of-date turns. That first step touches only the Mac.
3. His Mac keeps the Tailscale it already runs. Five things leave 316: the Mac-side node, the code
   generator, web push (which never existed), the message box and both "Open in…" buttons. The push sender
   stays with Phase 314, and 316 builds only the phone's half of it.
4. Agents measure everything the phone draws in the Simulator on his Mac. The door runs on loopback, each
   run creates and deletes its own Simulator, and XCUITest reads frames and labels. The App Transport
   Security question was answered today: `URLSession` plus one exception for `100.64.0.0/10`.
5. It ends in two TestFlight builds that he installs himself. The first reads his sessions over his
   tailnet; the second adds the alert. Each comes with a checklist in his words. The tailnet node, the
   camera pairing and the alert are first tried on his phone, because no agent may mint a key or join his
   tailnet.

### Where the phone phases stand, at `ce754649`

| Phase | What it is | State | Commit | What it leaves for the phone |
| --- | --- | --- | --- | --- |
| 311 | The row says what the agent is asking | Landed | `a6aec811` + `d27acd8e` | Nothing. The question is on the feed |
| 312 | The choices the agent drew | Landed | `e4746fdd` | Nothing. The options are on the row, drawn but not pressable |
| 313 | The read-only door on the tailnet | Landed, **not switched on** | `38346773` | Everything that turns it on: the registrar call, the facts, Settings → Phone, `probe:p313` (S1 below) |
| 314 | The alert, sent from the Mac | Being built in `wt-p314`, not landed | — | A device token to send to, which only 316's app can produce (S5 below) |
| 315 | The research before any Swift | Delivered as research 128 | `dbf176a8` + `e4edb34f` (+ `e13109c7` edits 127) | Its §8 edits to 316, reconciled in §2 below |
| 316 | The iPhone app | Queued. This file | — | — |
| 317 | End from the phone, behind Face ID | Queued | — | Starts after 316 |
| 318 | The reply door (buttons and one typed message) | Named, not queued | — | Gets 316's dropped message box design |
| Release | — | None since 0.109.0 (`0375c8a9`), by his rule | — | Waits until the phone works end to end on his phone |

---

## 2. Every place the entry is wrong or stale

"Entry" means `docs/BACKLOG.md:33385-33483`. Line numbers are at `ce754649`.

| # | The entry says | What is true, and the proof | Reconciled |
| --- | --- | --- | --- |
| 1 | Semver: "a codegen step, one new gate, a fourth nested binary and a push sender" | The codegen is not needed (row 13). A Mac-side node contradicts the bind (row 11). The sender is Phase 314's, mechanisms 1-7 at `BACKLOG.md:33294-33310` | Semver: minor on the desktop (Settings → Phone, the door switched on), and 1.0.0 of the iOS app. No nested binary. No sender |
| 2 | "with web push retired in the same commit so nothing double-notifies" (Semver and item 8) | There has never been web push. A grep for `web-push`, `webpush`, `vapid`, `serviceWorker`, `pushManager` and `PushSubscription` over `src/`, `build/`, `package.json` and `electron-builder.yml` finds only `src/main/preview/protocol.ts:129` and fixtures. `git log -S` finds nothing. `src/main/push/` does not exist | Struck from the Semver and from item 8 |
| 3 | Tier 3 because of the APNs key, "the Tailscale API credential" and "it spawns a process on the Mac" | The APNs key is Phase 314's. Research 128 §3.2 rules the Tailscale API credential out, and the `main/pocket/` import wall enforces it. No process is spawned on the Mac (row 11) | Tier 3 has two reasons. It sends his words off the Mac over a network for the first time. And the pairing sheet handles his hand-minted tailnet key. `conformance:credentials` does not widen in 316 |
| 4 | The first independent method re-derives the codegen output | There is no codegen (row 13) | Each step names its own two methods in §4 |
| 5 | Hostile door arm: "a bad signature" | The door signs no answer. `sendPocket` (`src/main/pocket/server.ts:127-141`) sets only `Referrer-Policy`, `Cache-Control`, `X-Content-Type-Options` and `Content-Type`. Signatures are on requests only (`src/main/pocket/pairing.ts:1110-1170`) | Replaced with three arms: a public key that does not match the pin, a `/pair` answer that is not one of `pending`, `allowed` or `refused` (`pairing.ts:702`), and (S5) a token minted for the wrong environment |
| 6 | Charter: "315 may change the transport, the pairing QR and the enrolment" | Settled. Research 128 landed at `dbf176a8` and `e4edb34f` | The Charter cites research 128 §8 as written |
| 7 | "The transcript is cheap because both halves already exist" | Only the reading half exists. `src/main/overview/service.ts:426-429`: "The store is written only when Catch Me Up opens a project or the fold runs … so a bare SELECT would answer stale". The store has exactly three writers: `overview/ipc.ts:116,119`, `sessions/fold-wiring.ts:87` and `overview/activity.ts:178` | S1 brings the row up to date first, with `sessionActivity(deps, {sessionIds:[id]})` (`overview/activity.ts:70`). That same call also returns the counts that `Session.html` draws |
| 8 | Item 3: the turns route "calls the store's own `listTurns` and `listTurnsBetween`" | The route only passes the call on: `routes.ts:333-352` clamps the limit and calls `facts.turns`, and nothing implements `facts.turns`. The rule for `more` is only a type comment | S1 writes the reader (§4, S1 mechanism 3) |
| 9 | Item 3 and Semver: every turn with "its git mark" | `PocketTurn` (`src/shared/ipc/pocket.ts:173-184`) has no `git` field | The git mark leaves 316. No field is added |
| 10 | Item 3: the absence sentences are `answerAbsence`'s | `answerAbsence` (`src/renderer/overview/TurnBlock.tsx:44-50`) needs the session's raw status, and the door sends only the label and the dot | Main writes the sentence. `answerAbsence` and its three sentences move to `src/shared/`, and each `PocketTurn` gains `absence: string \| null` |
| 11 | Item 4: the Mac adds a fourth nested binary, `<appId>.tailscale` | The door reads its address from `os.networkInterfaces()` and "No such address means NO DOOR" (`src/main/pocket/bind.ts:1-14`, refusal at `:433-435`). A userspace node creates no interface. Routing the door through a Mac-side node would make every source `127.0.0.1`, which breaks `isSelfOrigin` (`bind.ts:254`) and the per-phone address pin (`pairing.ts:1146`). His Mac already has a tailnet interface (§3.9) | The Mac-side node is deferred to a new phase, "a Mac without Tailscale", which is a redesign of the bind and not a vendoring job. `NESTED_BINARIES` and `mac.signIgnore` stay at three entries |
| 12 | Item 4 and research 128 §8: "the QR still carries three things … the minted key" | The QR carries no tailnet key, and the header says so (`pairing.ts:47-58`). `pocket:beginPairing` takes no input (`pocket.ts:435`) | QR v:2 has an OPTIONAL key field `tk`, pasted on the Mac and held only in the window's memory. `beginPairing` takes it. The header is rewritten |
| 13 | Item 5: a generator emits tokens, copy and contract types; `gate:ios-codegen` | The door already sends main's words (`statusLabel` and `statusDot`, `pocket.ts:101-104`). The three screens 316 builds use 14 hex colours, and every one is a `tokens.css` value. "The screen specification's 36 colour rows" names no committed file. `copy-drift.mjs` already compares every drawn string, byte for byte, with the module that owns it | The generator and its gate are deleted. Instead there is one hand-written `Tokens.swift` and one `Copy.swift`, checked as text by `conformance:ios`, and hand-written `Codable` types proved by tests and the hostile door. `raisedLabel` still moves to `src/shared/`, but for the door, which now sends the raised word |
| 14 | Item 1: an `ios/` row in `assert-import-boundaries.mjs`'s wall | `targetPath` returns null for anything outside `src/` (`build/assert-import-boundaries.mjs:285-292`), so such a row can never match anything. TypeScript cannot import Swift | No wall row |
| 15 | Item 2: four screens, the composer shipping HELD | There is no delivery door until 318. Research 128 §4 says a visibly inert control is "dormant" under guideline 2.3.1(a) | The message box leaves 316 (§6, decision 2). `Composer.html` and the Session screen's message strip stay the approved design for 318 |
| 16 | Item 2: the list is ⌘J, meaning blocked rows only | `Main.html` draws "Everything else (9)", Mac Pro rows included, and that line is owed by 316 (`build/p311/copy-drift.mjs:496-499`). `/v1/blocked` answers `attentionRows` only (`routes.ts:285-300`). Without the rest, a WORKING session's conversation cannot be reached from the phone | `/v1/blocked` gains `others`: every listed session that is not blocked (`core.listSessions()` already merges remote rows, `src/main/sessions/core.ts:2604-2625`). No route id moves (§6, decision 1) |
| 17 | `PocketHandoff` `kind: 'ssh'`, "Open in Terminal" | The node is private to the app, so no other app on the phone can use it, and the ruled grant allows only `tcp:PORT` | `'ssh'` is removed from the union |
| 18 | Item 7: the sixth check type exists because no type admits a toolchain outside `package-lock.json` | "adapter integration test" already admits a real local tool (codesign, git, `/bin/sh`, and `hdiutil` for `conformance:samefolder`). What sets Xcode and Go apart is that they need the network for Go modules, write Simulator state under his home, and exist on no CI runner | The sixth type is named "Xcode and Go harness", for that reason. `probe:p209`'s needs line is corrected to name `swiftc` |
| 19 | Proof: "`gate:background` for the Simulator's teardown" | `gate:background` looks for a detached spawn, shell loop or sleeper (`build/assert-background-teardown.mjs:20-40`). `simctl boot` returns at once and the device runs under launchd. An investigator found a SIGTERM skipped a `finally` and left a Simulator booted | New helper `build/simulator-run.mjs` (`withSimulator`) and a new text gate `gate:simulator`, built like `gate:electron` |
| 20 | **The adversary** keeps "Open in Claude" | Research 127:653-654 says of the Remote Control URL: "whether it lands in the JSONL Tortie parses is unmeasured". No module under `src/` names a Remote Control URL (only `machines/control-plane.ts`'s unrelated `remoteControlTransport`). `handoff()` has no composer | **Overruled.** 316 draws no hand-off. `handoff` answers null. "Open in Claude" stays owed to a later phase that first measures where the URL is recorded |
| 21 | Item 10: "the push switch and the pairing rows live in the Settings → Phone section the door phase already added" | That section does not exist. `SECTIONS` (`src/renderer/settings/SettingsApp.tsx:66-128`) has no phone entry. `registerPocketIpc` (`src/main/pocket/ipc.ts:478`) is never called, and `capabilities.ts:114` imports only `beginPocketShutdown` and `joinPocketDoor`. `build/p313/SPEC.md` §As built says mechanisms 8 and 9 were not built | Item 10 is deleted. S1 builds Settings → Phone, the menu row (§6, decision 5), and 314's push switch if 314 has landed it |
| 22 | (not in the entry) | **Nothing can turn the door on even once it is registered.** None of the eight channels (`pocket.ts:433-447`) writes `enabled`, which is only read (`ipc.ts:243,298`). `start()` (`ipc.ts:327`) has no caller. The QR's `fp` comes from `pocketDoorStatus()` and is null while no door is listening (`bind.ts:658-665`) | S1 adds `pocket:setDoor` and a launch step, and fixes the order: turn on → confirm → listening → pair |
| 23 | (not in the entry) | **The door's "blocked since" map would be empty in every harness run.** `since` changes only in the tray's `refresh`, which returns at once when there is no tray (`src/main/tray/index.ts:174-176`). `installTray` runs after `dispatchHarness` has returned (`src/main/index.ts:501, 666-668`). A missing row silently falls back to `createdAt` | S1 reads the age from Phase 314's single age function (its mechanism 2), never from the tray. The probe asserts `blockedSince > createdAt` for a session that blocked after it was created |
| 24 | Item 4: pin the certificate fingerprint | `fp` is the certificate's hash (`pairing.ts:780`), and the certificate lives 397 days (`src/main/pocket/tls.ts:87`). `pocketPublicKeyFingerprint` already exists (`tls.ts:385`) | QR v:2 pins the public key (SPKI sha256, base64url). Measured today: the Swift SPKI hash equals `tls.ts`'s in 112 of 112 cases |
| 25 | Research 128 §2 and §8(iv): the framework's privacy manifest goes in `Versions/A/Resources`, and "ephemeral" is struck | The iOS framework is shallow (Headers, `Info.plist`, Modules, the binary; no `Versions/A`). The word "ephemeral" does not appear in the entry at all | The manifest goes at the framework root and Embed & Sign re-signs it. The key is written as NOT ephemeral |
| 26 | `POCKET_REACH_HONESTY` (`pocket.ts:363-365`): "Your phone reaches this Mac through the Tailscale app" | Once S3 lands this is false for the phone and still true for the Mac | Rewritten in S1 to say the Mac still uses the Tailscale app. S3 makes the phone's half true |
| 27 | `POCKET_TAILNET_GRANT_HONESTY` (`pocket.ts:390-393`) reads as if pasting the grant confines the phone | The grant only adds a rule, and it confines nothing until the default `*` is narrowed (his ruling of 2026-09-21; research 128 §3.1). The residual (a node still learns every device's NAME) appears on no surface | Settings → Phone shows the grant, then the narrowing (`"src": ["*"]` → `["autogroup:member"]`) with "read the rule preview first", then the residual in one line |
| 28 | Stale numbers | `HELPER_USER_FLOOR` is 148 at `build/assert-electron-teardown.mjs:282` (not 147 at `:272`). `gate:contract` is at `package.json:262` (not `:255`) and `shot` at `:244` (not `:237`). `listTurns` is at `store.ts:687` and `listTurnsBetween` at `:704-723`. `build/p313/SPEC.md` §3 describes HMAC and `X-Tortie-Key-Id`, but as built the request is signed with Ed25519, with headers `x-tortie-phone`, `x-tortie-timestamp`, `x-tortie-nonce` and `x-tortie-signature` over a seven-line canonical text that ends in the X25519 binding (`pairing.ts:998-1075`) | Read every floor at the step's own head. The Swift client is built from `pairing.ts`, never from p313 SPEC §3 |
| 29 | **The adversary** puts a hands-on trial between S3 and TestFlight: the Simulator pairs over his real tailnet | The Simulator has no camera, and the QR payload is shown only as a QR on the Mac. Nothing carries the payload text into a Simulator he runs himself unless a new desktop surface is added. His own ruling goes from Simulator straight to TestFlight | **Dropped.** The node is first used on his phone at S4. A defect found there costs one more upload |
| 30 | (not in the entry) | **No QR encoder exists anywhere.** Measured by this writer: no module under `src/` names a QR encoder, and neither this worktree's `node_modules` (419 entries) nor the operator's has a `qr*` package. The page that might have needed one was removed | S1 vendors Project Nayuki's QR Code generator (TypeScript, MIT) as one file with its licence header, and credits it where the About panel credits codicons (Phase 134) |
| 31 | The copy ledger | `copy-drift.mjs` still owes 6 pairing rows to Phase 313, which has landed, and 1 to Phase 315, which is research (`:567-600`). It owes the 4 message-box rows and both "Open in…" rows to 316 (`:501-529`) | S2 owns the pairing rows and "Everything else". The message-box rows move to 318, "Open in Terminal" is removed, and "Open in Claude" and "Enter a code instead" move to later phases |
| 32 | Phase 317 leaves "the composer field held exactly as Phase 316 ships it" | 316 ships no message box (row 15) | 317's sentence is edited when 317 is queued |

---

## 3. What was measured on his Mac today

Nothing was installed, signed, uploaded or committed. No `tailscale` command was run and no real interface
was bound. Every Simulator was created and deleted inside a `finally`. At the end: 0 `p316` devices listed,
0 booted and no `Simulator.app` process.

### 3.1 The toolchain, as it is

| What | Reading |
| --- | --- |
| `xcodebuild -version` | Xcode 26.3 (17C529) |
| Simulator runtimes | iOS 26.3 (23D8133) and iOS 18.3 |
| `go version` | go1.26.0 darwin/arm64 (`/opt/homebrew/bin/go`) |
| node | v22.23.1 |
| xcodegen | 2.44.1 is present. It was used for the probes only. **316 does not depend on it** (S2 commits the `.xcodeproj`) |
| Free disk | 59 GiB (94 percent used) |

### 3.2 App Transport Security against Tortie's own certificate

The door certificate was issued by `src/main/pocket/tls.ts` itself (sha256 of the file `9c62d6bc…`, with two
imports stubbed): P-256, self-signed, 397 days. It was served by node https with `minVersion: 'TLSv1.2'`, the
way `bind.ts:456-462` sets it. A loopback SOCKS5 stand-in reproduced TailscaleKit's `URLSession+Tailscale.swift`
(`ProxyConfiguration(socksv5Proxy:)` plus `applyCredential`). The device was an iPhone 16 Pro on iOS 26.3.

| Case | No ATS keys | `100.64.0.0/10` + `NSExceptionAllowsInsecureHTTPLoads` | Exact host entry | Measured by |
| --- | --- | --- | --- | --- |
| **URLSession → `100.64.0.1` through SOCKS (ATYP=1), SAN = that IP, SPKI pin correct** | **-1200 (stream -9802)** | **200** | 200 (`100.64.0.1`) | Adversary |
| URLSession → `192.0.2.10` through SOCKS | -1200 | -1200 | — | Adversary |
| URLSession → `door.tail00000.ts.net` through SOCKS (ATYP=3), pin correct | -1200 | -1200 | 200 (`door.tail00000.ts.net`) | Both |
| URLSession → `127.0.0.1` / `localhost` direct | 200 (ATS's built-in local allowance; the log reads `ATSAllowsLocalNetworking`) | 200 | — | Both |
| NWConnection with a TLS verify block, through SOCKS to `100.64.0.1` or a name | 200 under every plist, including none | 200 | 200 | Both |
| Wrong pin | URLSession -999; NWConnection -9808. **The door served 0 requests** | same | same | Both |

Investigator B also measured a MagicDNS name: `ts.net` with `NSIncludesSubdomains` reached a host two labels
down. That contradicts Apple's own page, it does not apply to the tree (the door is dialled by IPv4), and it
is not relied on.

**The choice this settles for S2: `URLSession` plus exactly one key**, `NSAppTransportSecurity →
NSExceptionDomains → "100.64.0.0/10" → NSExceptionAllowsInsecureHTTPLoads = YES`. The address arrives in
the QR, so an exact-IP entry cannot be compiled in. The cost is that the key also allows plain `http://` to
tailnet addresses, so `conformance:ios` requires the door client to build `https` URLs only. Apple asks for a
justification of that key at App Store review. There is no App Store review in 316.
`NSAllowsArbitraryLoads` stays refused. NWConnection remains the option that needs no key, at the cost of a
hand-written HTTP/1.1 client facing a hostile door. It is not built.

Apple's pages:
- https://developer.apple.com/documentation/security/preventing-insecure-network-connections ("When ATS is
  enabled, you can no longer loosen trust evaluation requirements"; "ATS doesn't apply to … the Network
  framework")
- https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionallowsinsecurehttploads
- https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsexceptiondomains
- https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking
  ("In iOS 17 … ATS no longer allows connections to IP addresses by default. Add … CIDR ranges in the
  NSExceptionDomains dictionary.")

**Not measured:** the same key on an iOS 18.x device. S2's floor arm runs it on the iOS 18.3 Simulator
runtime.

### 3.3 Pins

In 112 of 112 challenges, the leaf's sha256 over `SecCertificateCopyData` equalled `tls.ts`
`certificateFingerprint`. The SPKI sha256 (the 26-byte P-256 header
`3059301306072a8648ce3d020106082a8648ce3d030107034200` plus `SecKeyCopyExternalRepresentation`'s 65 bytes)
equalled `tls.ts` `publicKeyFingerprint`. The server negotiated TLSv1.3 with TLS_AES_256_GCM_SHA384. The
Swift check is about ten lines and needs no library.

### 3.4 The Simulator harness

| What | Reading |
| --- | --- |
| `simctl create` | 147-173 ms |
| boot + `bootstatus` | 17.1-20.7 s (investigator B); 51.1 s (adversary's run) |
| `xcodebuild test` (XCUITest) | exit 0 in 24.5 s, test case 7.07 s, 46 s wall. Values read: window 402×874, title frame {16, 78, 96.67, 24.33}, row labels and row count |
| A frame assertion fails honestly | Run 1 exited 65 on a real defect: a measured gutter of 24.17 pt instead of 16 pt |
| shutdown / delete | 3.2-3.4 s / 0.10-0.12 s; `deviceStillListed=false` |
| `Simulator.app` | Never started |

**Pitfalls, each measured:**
- (a) `simctl launch --stdout=<path>` wrote no file. Results come back through XCUITest labels, `xcodebuild`
  output or the app container.
- (b) A door in the same process starved when `execFileSync` ran beside it. Door I/O never shares an event
  loop with a synchronous exec.
- (c) SIGTERM skipped a `finally` and left device `7182EA58…` booted. The teardown must also run on SIGINT,
  SIGTERM and SIGHUP.
- (d) `simctl delete` leaves `~/Library/Logs/CoreSimulator/<udid>` behind (156-184 KB each; 14 such
  directories now).
- (e) `xcodebuild test` touched `~/Library/Caches/org.swift.swiftpm/package-collection.db-shm` even with
  `-derivedDataPath`.

### 3.5 libtailscale and TailscaleKit

| What | Reading |
| --- | --- |
| Pin | `github.com/tailscale/libtailscale` at `59d4bb82744915815178e0f0776d60026a397ee7` (2026-08-31, main's head). `go.mod`: go 1.25.5, `tailscale.com v1.94.1` |
| `make ios-fat` from `swift/` | exit 0, real 50.30 s, user 120.58 s. 42 modules downloaded. `GOTOOLCHAIN=local` (the machine's 1.26.0 is enough) |
| Device framework | 23,245,688 B, arm64 dylib, **unsigned**, `minos 18.1`, sdk 26.2, bundle id `io.tailscale.Tailscale`. It links Foundation, libobjc, libSystem, Combine, CoreFoundation, Network, Security, UIKit (weak) and the Swift runtime |
| Simulator framework / xcframework | 48,364,592 B (x86_64 + arm64) / 72 MB |
| An unsigned Release app embedding it | `.app` 22,796 KB, of which the framework is 22,708 KB. Zipped: 8,016,559 B |
| A Simulator app embedding it (Embed & Sign, ad hoc) | Installed, and was still running 4 s after launch (launchctl status 0) |
| **The app's iOS floor** | **18.1**, set by the framework |

### 3.6 Privacy manifest and licences

- No `PrivacyInfo.xcprivacy` exists in the clone or its products. Upstream PR #57 is still open.
- `nm -u` on the device framework shows `_stat`, `_fstat`, `_lstat`, `_mach_absolute_time`, `_sysctl` and
  `_clock_gettime`, all from the Go runtime (`go.o`). Apple lists the first three under FileTimestamp and
  `mach_absolute_time` under SystemBootTime:
  - https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype
  - https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- So an empty manifest would be inaccurate.
- `go list -tags ios -deps` lists 43 modules: 17 BSD-3-Clause, 19 Apache-2.0 (13 of them AWS SDK modules
  carrying NOTICE files), 2 BSD-2-Clause and 5 MIT. No licence text ships inside the framework.

### 3.7 Keeping Go out of his home

With `GOTELEMETRY=off` exported, `cmd/go` still wrote 7 telemetry files. They went into the redirected
`HOME`; his own `~/Library/Application Support/go` had 0 new files. **The Go half must redirect `HOME` as well
as `GOPATH`, `GOMODCACHE` and `GOCACHE`.** A cold build fills about 1.43 GiB of cache (GOMODCACHE 250,916 KB,
GOCACHE 1,249,356 KB). The caches were removed with `go clean -modcache`, `go clean -cache` and `rm -rf`;
`du` afterwards read 0.

### 3.8 Signing

- Every probe app, the UI test runner and the size probe were built with `DEVELOPMENT_TEAM=''`,
  `CODE_SIGN_STYLE=Manual` and `CODE_SIGN_IDENTITY='-'`. `codesign -dv` reads `Signature=adhoc` and
  `TeamIdentifier=not set`.
- A device build with `CODE_SIGNING_ALLOWED=NO` exits 0.
- **The whole Simulator arm needs no team, no Apple account and no keychain.** His team id, `4GRQMF5T5U`, is
  already written at `electron-builder.yml:9`.

Apple's pages:
- https://developer.apple.com/documentation/bundleresources/entitlements/aps-environment
- https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases
- https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution (the bundle id cannot
  change after the first upload; an app icon is required)
- https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device (not needed for
  TestFlight)
- https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption

### 3.9 His Mac, and the tree

| What | Reading |
| --- | --- |
| Tailnet interface | `utun4` carries an IPv4 in 100.64.0.0/10 (netmask `0xffffffff`) and one `fd7a:115c:a1e0` address. There are 3 host routes and no `100.64/10` route. No address is recorded here |
| Tailscale.app | `io.tailscale.ipn.macsys` 1.102.2, read from its plist |
| Application firewall | Disabled, with block-all and stealth off |
| Door | 4 frozen routes: `POST /pair` and 3 signed GETs. 0 write routes. Port 8823 (`ipc.ts:110`). Default turn limit 20 (`routes.ts:219`), `MAX_TURN_LIMIT` 200 (`turn-view.ts:24`) |
| Contract baseline | 243 invoke channels, 8 of them `pocket:*`, 0 registered at run time |
| `conformance:pocket` | 21 rules / 1,556 checks. `ablation:p313` 28 arms |
| `CHECK_TYPES` | 5 entries (`build/verification-checks.mjs:168-174`) |
| `HELPER_USER_FLOOR` | 148 |
| `tokens.css` | 698 lines, 193 declarations, 134 distinct names. **The three screens 316 builds use 14 distinct hex colours, and each equals a token.** Across all seven screens: 18, of which the 2 non-token ones are `Lock.html`'s wallpaper |
| Master icon | `docs/brand/tortie/master/tortie-master-1024.png` is 1024×1024 and reads `hasAlpha: yes` (sips). Apple refuses an app icon with an alpha channel at upload, so S4 flattens it |
| Schema since 0.109.0 | `git log 0375c8a9..HEAD -- src/main/manifest src/main/db` is empty |

---

## 4. The build, in ordered steps

### 4.0 Rules every step keeps

- **Each step is one workflow of the full build lane.** Spec (this section, re-read against the tree at
  that step's head) → builders on disjoint files → integrator → verifier with **two independent methods, one
  of them an attack**, both named in the verdict → one fix round if the verdict is `needs_work` → an
  **independent reverify** of the fix → commit. A second `needs_work` stops the workflow, and the verdict goes
  to him. Verdicts are typed (`verdict`, `evidence`, `problems`).
- **Labels.** Each step's subject is `type(scope): summary`. Its first body line is `Phase 316.N: …`. No
  trailers. The main session adds one running-log line per landing, and edits the 316 entry in place against
  this file when S1 starts.
- **Minimum gates at every commit:** `npm run typecheck && npm run build && npm run smoke:t1`. The integrator
  runs the full battery (`test`, `smoke`, `smoke:t3`, `package`) plus each step's own gates. `gate:contract`
  is regenerated in any step that moves a channel, and the body says which lines moved.
- **Floors.** `HELPER_USER_FLOOR` goes up by one for each new script that reaches `build/electron-run.mjs`,
  read at that step's head (148 today, 149 if `probe:p314` lands first). `gate:simulator` has its own floor.
- **Simulators.** Only through `withSimulator`. A device is named `p316-<run id>`, created from the iPhone 16
  Pro device type, and shut down and deleted in a `finally` and in SIGINT, SIGTERM and SIGHUP handlers. Never
  touch a device you did not create. Result bundles and derived data go under scratch and are deleted in the
  `finally`. UI test plans turn automatic screenshots and screen recording OFF (`uiTestingScreenshotsEnabled:
  false`, attachment lifetimes `keepNever`), because a screenshot is a photograph. Every visual claim is a
  frame or a label read by XCUITest.
- **Go.** Every Go command sets `HOME`, `GOPATH`, `GOMODCACHE` and `GOCACHE` under one directory the script
  owns, plus `GOTOOLCHAIN=local`, `GOTELEMETRY=off` and `GOFLAGS=-modcacherw`. The cache is deleted in a
  `finally` when the script made it.
- **End-of-run count, once.** Run
  `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`, then
  `xcrun simctl list devices | grep -c p316-` (must read 0), and check that nothing is booted.
- **Words.** Every string the phone draws either comes from main in the door's answer, or is a chrome label
  in `ios/Tortie/Style/Copy.swift` that `build/p311/copy-drift.mjs` judges byte for byte against the desktop
  module that owns it. It may also be declared as phone-owned in the ledger. Just enough words.
- **What the phone draws in 316.** The Swift code does no arithmetic on status, age or ordering. Dark only.
  iPhone, portrait. Deployment target 18.1. It refreshes on appear, on return to the foreground and on pull.
  There is no timer and no background mode.

---

### S1 — Phase 316.1: the door switched on (Mac only)

- **Subject.** `feat(pocket): switch the door on from Settings then Phone`
- **First body line.** `Phase 316.1: the door switched on, and it answers every session`
- **Tier 3.** His words leave the Mac over a network for the first time. The sheet handles his hand-minted
  tailnet key. A launch step binds a listener (refusal 8).
- **Starts when.** Phase 314 has landed. Start from its head, and read its as-built for three owners:
  - the status-word table and `raisedLabel` in `src/shared/`;
  - the ONE age function its mechanism 2 creates;
  - the push switch as a confirmed field.

  If 314 did not build one of them, S1 builds it once in `src/shared/` (the words) or `src/main/` (the age),
  names it in the body, and 314 does not get a second copy. The age function is never the tray's private map.

**Files** (builders get disjoint sets):

| Builder | Files |
| --- | --- |
| A, facts and routes | NEW `src/main/pocket/facts.ts`; `src/main/pocket/routes.ts`; `src/shared/ipc/pocket.ts` (the answer types); the moves: `src/renderer/overview/{line,clock,copy}.ts` → `src/shared/overview-line.ts`, `overview-clock.ts`, `overview-copy.ts`; `answerAbsence` plus `NOT_ANSWERED_YET`, `STOPPED_BEFORE_ANSWER` and `ANSWER_NOT_IN_RECORD` into `src/shared/overview-copy.ts`, with every importer re-pointed, not copied; the one age formatter the desktop draws ages with, moved to `src/shared/` if it lives in the renderer |
| B, the door's lifetime and pairing | `src/main/pocket/ipc.ts` (`setDoor`, the launch step, `grant` in status); `src/main/pocket/pairing.ts` (QR v:2, the key held in the window, the header rewritten); `src/main/capabilities.ts` (`registerPocketIpc(ipcMain, host)` beside `registerMachinesIpc`, and the launch step); `src/preload/index.ts` and `src/shared/ipc/index.ts` (the `pocket` member and `GmuxPocketExtras`, together, per B1) |
| C, the surface | NEW `src/renderer/settings/PhoneSection.tsx`, `phone-section.css`, `src/renderer/settings/phone/qrcodegen.ts` (vendored, MIT, header kept), `phone/Qr.tsx`; `SettingsApp.tsx` (phone before Diagnostics); `src/main/menu.ts` (one row, §6 decision 5); the About panel credit |
| D, the gates | `build/conformance-pocket.mjs`, `build/p313/hostile-client.mjs`, `build/ablation-p313.mjs`, NEW `build/probe-p313.mjs`, `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (floor +1), `build/p311/copy-drift.mjs` (re-pointed owners), `docs/audits/contract-baseline.txt` |

**Mechanism.**

1. **The facts composer** (`facts.ts`) implements `PocketFacts` in full:
   - `sessions`/`projects` come from core.
   - `blockedSince` comes from 314's age owner.
   - `activity(id)` (the question and the choices) comes from a main-side read of the value that is today
     broadcast only to the renderer (`core.ts:936, :1012`). Add one map written beside that broadcast, unless
     the monitor already holds the current value.
   - `statusWord` comes from the shared table.
   - `agentLabel` comes from the registry's display name, and `machineLabel` from the machines layer.
   - `emptyLine` is the tray's string (`src/main/tray/index.ts:96`), moved to one main-side constant both
     read.
   - `catchUp` is the shared `buildProjectLine` over main's own session view.
   - `lastTurn` and `turns` come from the store, after the refresh in 2 below.
   - `handoff` always answers null in 316.
2. **Fresh before read.** `/v1/session` and `/v1/turns` each call `sessionActivity(deps, {sessionIds:[id]})`
   first. That call is serialised, yields, and brings the row up to date through the one read path. Its
   answer is the `activity` field. A remote row's conversation is not on this Mac: `turns` answers `[]` with
   `note` set to main's existing `OUTCOME_REMOTE` sentence.
3. **The turns reader.**
   - No `from` and no `to`: `listTurns(id, limit)`.
   - With `to`: `listTurnsBetween(id, from ?? 0, to, limit)`.
   - `more` is `listTurnsBetween(id, 0, first − 1, 1).length > 0`. This reuses an existing reader and adds
     no new SQL.
   - Every turn passes once through `turn-view.ts`'s `toTurnView`, so clipping and redaction stay in one
     place, and then gains `absence`.
4. **The answer shapes** (`src/shared/ipc/pocket.ts`):
   - `PocketBlockedRow` gains `statusTitle` (main's raised word, e.g. `Needs input`, `Failed (exit 1)`) and
     `ageText` (main's own age, e.g. `2m`, composed at `at`).
   - `PocketBlockedAnswer` gains `others` (every listed session that is not blocked, at most
     `POCKET_OTHERS_MAX = 200`, newest activity first, rows main cannot read last), `othersOmitted`, and
     `ageNote` (Phase 314's sentence "Ages start again when Tortie restarts on your Mac or when your Mac
     wakes", spelled once, by 314's module).
   - `PocketSessionDetail` gains `activity: OverviewSessionActivity | null` and `lastMessageText: string |
     null`.
   - `PocketTurn` gains `absence`. `PocketTurnsAnswer` gains `note`.
   - `PocketHandoff` loses `'ssh'`.
   - No route id moves, so R4's sha256 and the route set in the confirm hash stay put.
5. **Switching it on.**
   - `pocket:setDoor({ on })`: turning on writes `enabled: true` and `bindAtLaunch: true` together. That
     moves the confirmed fields, so the sheet draws the confirm lines, and `pocket:confirmDoor` then starts
     the door. Turning off stops the door and writes both false.
   - The launch step in `capabilities.ts` calls `start()` only when `enabled` is true AND `bindAtLaunch` is a
     CONFIRMED field. A file edited by hand moves the hash, and the door refuses to open with a sentence.
   - `PocketStatus` gains `grant` (`pocketGrantText` for the bound address, or null).
6. **Pairing, QR v:2.** `pocket:beginPairing({ tailnetKey: string | null })`. The key must start with
   `tskey-auth-` and be at most 256 characters. It is held in the window object beside `ps` and zeroed on
   cancel, on expiry and on allow. **It is never written to `pocket.json`, never logged, and never in any IPC
   answer.** The payload is
   `{v:2, host, port, fp: <SPKI sha256, base64url>, dk, dx, ps, exp, tk?}`. The pairing tests move with it.
   `beginPairing` refuses unless the door is `listening`, so `fp` can never be null. The window stays 3
   minutes, and its line says the phone must join and present inside it.
7. **Settings → Phone** has just enough words. From top to bottom:
   - the switch "Let my phone reach this Mac" and its state line;
   - Pair a phone: a password field for the key, then the QR, the countdown, the fingerprint to match, the
     lines and Allow;
   - the phones, each with Remove;
   - Phase 314's push switch, if it has landed;
   - behind one disclosure, "Keep the phone to this door": the grant text with a copy button, the one-word
     narrowing with "Read the rule preview in your admin console before you save", and the residual in one
     line.

   `POCKET_REACH_HONESTY` becomes: the phone carries its own connection; this Mac still uses the Tailscale
   app. `POCKET_TAILNET_GRANT_HONESTY` stops implying that the grant alone confines the phone. **The QR is
   dark ink on a light ground in both themes**, because a scanner needs that. Its two colours are one small
   constants file. If a gate refuses a literal there, they go into `tokens.css` and `conformance:hue` is
   budgeted (about 13 minutes).
8. **Menus.** One row, `Pair a Phone…`, beside `Settings…` (`menu.ts:590-598`). It opens Settings → Phone. The
   brief says so (§6, decision 5).

**Gates.**
- The minimum, and the full battery at the integrator.
- `conformance:pocket` gains six rules, each with an ablation in `ablation:p313`:
  - K1: the key reaches no file, log or answer.
  - O1: `others` is exactly the listed sessions that are not blocked, capped.
  - F1: `fp` is the public key's hash.
  - T1: every turn read is preceded by the refresh and passes through `toTurnView`.
  - L1: the launch step binds only on confirmed fields.
  - H2: no `'ssh'` hand-off.
- `conformance:pocket:hostile` (new arms below), `conformance:phonecopy`, `conformance:manager` (because
  `src/renderer/session-manager/copy.ts` moves), `gate:contract` regenerated (243 → 244 plus 314's, read at
  head), and `gate:checks` for `probe:p313`.

**Proof.**
- **`probe:p313`, one app run.**
  - One Electron through `withElectron`, with a scratch profile, a scratch `HOME`, its own tmux socket and
    `GMUX_POCKET_LOOPBACK=1`.
  - Shell sessions only, plus one pane printing a committed Phase 312 dialog fixture, so it reads
    `needs_input` with no agent and no token. A committed capture fixture is planted as one session's record
    in the scratch `HOME`.
  - A node phone client drives the whole order:
    - turn on → confirm → `listening` → `beginPairing` with a made-up `tskey-auth-…` string;
    - present → read the fingerprint on both sides → Allow;
    - `/v1/blocked` with its `others`, then `/v1/session`, then `/v1/turns` paged back to the first turn,
      where the count drawn must equal `countTurns`;
    - **append one turn to the planted record, and the next `/v1/turns` must show it**;
    - relaunch the app and check the door is `listening` with no press;
    - then scan every file under the scratch profile, plus the log, for the key's bytes, which must be
      absent.
  - The probe also asserts `blockedSince > createdAt` for the session that blocked after it was created.
- **Method A, re-derive.** An independent reader opens the scratch overview SQLite read-only, together with
  the manifest. It computes the blocked set and its order, `others`, every page and its `more`, and every
  `absence`, then byte-compares them with the door's answers. It shares no code with `facts.ts`.
- **Method B, attack.** These arms go into the hostile client:
  - a pairing key reused after its window;
  - a 10 KB key, and a key that does not start `tskey-auth-`;
  - page indexes that go backwards, overlap, are negative, or are 2^53;
  - a 4,000-character one-word ask;
  - the id of a removed session, and a remote row's turns (which must give `note`, never an error);
  - `bindAtLaunch: true` written into the store by hand with no confirm, where the relaunch must NOT bind
    and must say why;
  - `setDoor` during quit;
  - a Remove while the phone's request is in flight.

  Each arm is asserted on its refusal reason.
- **Parent measurement.** At the parent: 0 pocket channels registered at run time, 0 write routes, and the
  door unreachable. After: 9 registered, 0 write routes.

**Ends committable when** the gates are green, `probe:p313` PASSes, and the reverify agrees. **No CHANGELOG
item**, because nobody can pair yet. S4 writes it.

**Not in S1:** any Swift; any new route; any push code.

---

### S2 — Phase 316.2: the app in the Simulator

- **Subject.** `feat(ios): the Tortie app reads the door in the Simulator`
- **First body line.** `Phase 316.2: the list, the session, the conversation and pairing, driven in the Simulator`
- **Tier 3.** It holds a pairing's private keys, and it draws his words from a network answer it must not
  trust.
- **Starts when.** S1 has landed. The harness half (builder D below) may be built while S1 is in progress,
  because its files are disjoint, but it commits with S2.

**Files.**

| Builder | Files |
| --- | --- |
| A, the door client | `ios/Tortie/Door/Contract.swift` (hand-written `Codable` mirrors of the answer shapes in `src/shared/ipc/pocket.ts`, unknown fields ignored); `Door/DoorClient.swift` (**the ONE network user**: `URLSession`, SPKI pin in the delegate, `https` only, answers capped at 2 MiB, 15 s timeout); `Door/Signing.swift` (the canonical text `tortie-pocket-req-v1`, then method, target, body sha256, timestamp in epoch ms, nonce (16-64 characters) and binding, `pairing.ts:1041-1051`; the binding is HKDF-SHA256 over the X25519 secret, salt `<Mac xpub>\n<phone xpub>`, info `tortie-pocket-bind-v1`, `:1054-1075`; Ed25519 from CryptoKit; `x-tortie-phone` = the first 32 hex characters of sha256(`tortie-pocket-id-v1\n` + the phone's SPKI in base64url), `:674-679`); `Door/Pairing.swift` (parse QR v:2; seal `{label, ek, xk}` with AES-256-GCM under HKDF-SHA256(`ps`, empty salt, `tortie-pocket-pair-v1`), outer `{iv, ct, tag}`, `:837-865`; present again every 2 s until `allowed` or the window ends); `Door/Keys.swift` (Keychain, `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`); `Door/Transport.swift` (a protocol whose DEBUG direct-to-loopback transport sits under `#if DEBUG`) |
| B, the screens | `ios/Tortie/App/TortieApp.swift`; `Screens/ListScreen.swift` (`Main.html`: "Needs your input (n)" then "Everything else (n)", each row with its dot, name, the machine badge only when the session is elsewhere, `ageText`, and a second line of project and question (or status title), and "read <time>" plus `ageNote` at the foot); `Screens/SessionScreen.swift` (`Session.html` without the message strip and without "Open in Claude": status title, agent · project, the catch-up line, Messages / you / agent / Last message with a null drawn as the desktop draws a null and never as 0, and the last answer; plus `Choice.html`'s options, drawn unpressable with "Answer this in the session."); `Screens/ConversationScreen.swift` (§6 decision 3: in the Session screen's style, `TurnBlock`'s parts, the ask through `Text(verbatim:)` and never as markdown, the answer as inline markdown only (`AttributedString(markdown:)`, whitespace kept, no HTML path), `absence` when there is no answer, `notice` when present, older pages on scroll, and one line saying the terminal's own output is not here and is on the Mac); `Screens/PairingScreen.swift` (`Pairing.html` without "Enter a code instead": an AVFoundation QR scanner in Release, and a DEBUG-only payload given as a launch argument) |
| C, style, copy and project | `ios/Tortie.xcodeproj` (committed; targets `Tortie`, `TortieTests` and `TortieUITests`; the Simulator SDK signs ad hoc with no team; a test plan with screenshots off); `Style/Tokens.swift` (the 14 colours, each named as its `tokens.css` token); `Style/Copy.swift`; `Info.plist` (the one ATS key from §3.2, `NSCameraUsageDescription` in one sentence, portrait, no `UIBackgroundModes`); `Tortie.entitlements` (empty) |
| D, the harness and gates | NEW `build/simulator-run.mjs` (`withSimulator`); NEW `build/assert-simulator-teardown.mjs` (`gate:simulator`: only the helper names `simctl create` or `simctl boot`, its teardown is in a `finally` found by matching braces, signal handlers are present, and a floor); NEW `build/conformance-ios.mjs`; NEW `build/p316/vectors.mjs` (emits signing, binding, id, fingerprint and seal vectors from the SHIPPING TypeScript functions into `ios/TortieTests/Fixtures/vectors.json`, with a `--check` mode); NEW `build/p316/probe.mjs` and `build/p316/hostile-door.mjs`; `build/verification-checks.mjs` (sixth type "Xcode and Go harness", its needs and skip rows, and the entries); `build/assert-hermetic-checks.mjs` (both "five" messages); `build/p311/copy-drift.mjs` (reads `Copy.swift`; owns the pairing rows and "Everything else"; re-points the rest per §2 row 31); `package.json` (`test:ios`, `probe:p316`, `conformance:ios`, `gate:simulator`; the last two added to `build`); `build/assert-electron-teardown.mjs` (floor +1); `DEVELOPMENT.md` (one paragraph on which toolchain each check needs); `CLAUDE.md` (the gate-table rows for `ios/**`) |

**`conformance:ios`** reads the Swift as text, in plain node, inside `npm run build`. It has one ablation per
rule:
- (a) `Tokens.swift` maps each name to the hex `tokens.css` holds for that name, and there is no colour
  literal anywhere else;
- (b) there is no user-visible string literal outside `Copy.swift`;
- (c) `URLSession`, `URLRequest`, `NWConnection`, `ProxyConfiguration`, `loopback(` and
  `tailscaleSession(` appear only in `DoorClient.swift` (and, from S3, in `Tailnet/Node.swift`), and the
  door client builds only `https` URLs;
- (d) both DEBUG seams (the direct transport and the payload injection) sit inside `#if DEBUG`;
- (e) `Info.plist` has exactly the one ATS exception, no `NSAllowsArbitraryLoads` and no
  `UIBackgroundModes`;
- (f) no `import NetworkExtension`, no `NEVPNManager`, no `com.apple.developer.networking.*` key and no VPN
  string;
- (g) nothing fetched is ever run as code: no `JSContext`, no `WKWebView`, no `dlopen`, no
  `evaluateJavaScript`;
- (h) `askText` reaches only `Text(verbatim:`;
- (i) the UI test plan has screenshots off;
- (j) `vectors.mjs --check` matches.

**Proof.**
- **`test:ios`.** XCTest over decoding, the page arithmetic (including a refusal when indexes go backwards or
  overlap, and a stop when `more` is true on a page that adds nothing), the pin, and every vector from the
  TypeScript side.
- **`probe:p316`, one run.**
  - One Electron (S1's setup, with the door on loopback) and one Simulator from `withSimulator` on iOS 26.3.
  - `xcodebuild test` runs `TortieUITests` with the QR payload passed in. The UI test prints the
    fingerprint it draws. The node side reads it live from `xcodebuild`'s output, compares it with the Mac
    sheet's fingerprint, and presses Allow.
  - It then drives the list, taps a working session, opens the conversation and pages it to the first turn
    (the count drawn equals `countTurns`), and then Removes the phone on the Mac, after which the app must
    draw its unpaired line.
  - Frames are read, not photographed: a 16 pt gutter, 28 pt section headers, row padding of 6/16, from the
    mocks' own CSS.
  - **The floor arm** repeats pairing and the list on the iOS 18.3 runtime.
  - **The ATS arm** runs a unit test hosted in the app, so it runs under the SHIPPING `Info.plist`. It dials
    `100.64.0.1` through a loopback SOCKS stand-in that maps to the loopback door (ATYP=1, `allowFailover`
    off, so no packet goes to 100.x). It must answer 200 with the key and -1200 with the key removed.
- **Method A, re-derive.** The probe's own node client reads the door, computes what each screen must say
  (the strings and their order), and compares that with the labels XCUITest read. The Swift code is not the
  judge of the Swift code. An ask containing `**x**` must read back with its asterisks; an answer containing
  `**x**` must not.
- **Method B, attack.** `hostile-door.mjs`, paired through the DEBUG injection, serves:
  - a 10 MiB row;
  - an unknown status word and an unknown dot name;
  - a public key that does not match the pin (URLSession -999, 0 requests served);
  - a `/pair` answer that is not one of its three words;
  - pages that go backwards or overlap;
  - `more: true` forever;
  - a 4,000-character one-word ask;
  - malformed JSON and missing fields;
  - an answer that never completes.

  Each must end in a drawn sentence, with the app's process still alive and no half-drawn screen.
- **Parent measurement.** There is no `ios/` directory at the parent. After: 3 screens and pairing, 0 write
  routes used.

**Menus:** no change. **Ends committable when** everything above is green and the reverify agrees. The
Release build has no transport yet (it arrives in S3), and says "not paired". Nothing is uploaded.

**Not in S2:** TailscaleKit, push, icon and signing.

---

### S3 — Phase 316.3: the tailnet node inside the app

- **Subject.** `feat(ios): carry a tailnet node inside the app`
- **First body line.** `Phase 316.3: TailscaleKit, pinned, built from source and embedded`
- **Tier 3.** It puts a network node on his phone that holds his tailnet's state.
- **Starts when.** S2 has landed.

**Files.**

| Builder | Files |
| --- | --- |
| A, vendoring | NEW `build/build-tailscalekit.mjs`, in the shape of `build/build-tmux.mjs`: it builds from pinned source into `build/vendor/tailscalekit/`, which is already git-ignored, with its Go caches and redirected `HOME` under `build/vendor/tailscalekit/.cache/`. It runs `make ios-fat`, writes `PrivacyInfo.xcprivacy` at each slice's framework root (FileTimestamp and SystemBootTime, with the reasons from §6 decision 8), and refuses with one sentence when Go or Xcode is missing. NEW `build/tailscalekit-release.json`: the commit `59d4bb82…`, the source tarball's sha256 recorded on the first fetch and checked on every fetch after it, and the 43-module list with licences. The script refuses if the module list drifts. `package.json` gains `vendor:tailscalekit` |
| B, the node | NEW `ios/Tortie/Tailnet/Node.swift`, the second and last network file (a) it starts on foreground and stops on background, with no background mode ever; (b) its state lives in `Application Support/tailnet/` with `isExcludedFromBackup = true`; (c) its hostname is `tortie-phone`, and it is never ephemeral; (d) when there is no state, it joins with the QR's `tk` and refuses with one sentence if the QR has none; (e) it hands `DoorClient` a `URLSessionConfiguration` with its SOCKS5 loopback proxy (`loopback(` / `tailscaleSession(`). A fresh install (no marker file) deletes the pairing's Keychain items first, so a reinstall never reuses keys whose node is gone. When the door answers `unpaired` or `revoked`, or the node is gone, the phone goes to Pairing with one line. The project embeds and signs `TailscaleKit.xcframework` from `build/vendor/`, and a build phase that only CHECKS it is present and names `npm run vendor:tailscalekit` when it is not. The app's own `PrivacyInfo.xcprivacy`. `NSLocalNetworkUsageDescription` in one sentence |
| C, gates | `conformance:ios` gains (k) the node is started only in `Node.swift`, (l) the state directory is excluded from backup, (m) Keychain items are `ThisDeviceOnly`, (n) both privacy manifests exist and declare the categories, and (c) is widened to `Node.swift`. `gate:checks` gets entries, and `DEVELOPMENT.md` and `CLAUDE.md` rows are updated |

**Proof.** **No agent-run node ever contacts Tailscale's servers, and no agent holds a real key.**
- **Build and launch.** Build for the Simulator and for the device (unsigned). Embed, launch on the Simulator,
  and start the node with no state and no key: it must draw its sentence within 5 s and must not crash. Read
  the backup-exclusion flag and the Keychain accessibility back from the running app.
- **Method A, re-derive.** An independent reader inspects the BUILT products with `plutil`, `nm`, `otool`
  and `codesign`, and checks them against the source rules:
  - the compiled `Info.plist`'s ATS keys equal the source;
  - there is no `NEVPNManager` symbol;
  - both manifests are present at the right paths with the declared categories;
  - the framework's `minos` is ≤ the app's deployment target (18.1 = 18.1);
  - `go list -m all` equals the pinned list.
- **Method B, attack.**
  - A missing xcframework must give the named sentence, not a linker wall.
  - The state directory is deleted while the app runs.
  - The QR carries `tk` while state already exists, and the key must be ignored and never stored.
  - A planted `import NetworkExtension` and a planted `UIBackgroundModes` must each turn `conformance:ios`
    red.
  - For a join refused by a bad key: if TailscaleKit's configuration exposes a control URL, the node is
    pointed at a loopback control stand-in that refuses. If it does not, the arm is recorded as not run and
    the refusal is driven by injecting the node's error into `Node.swift`.
- **Parent measurement.** App size before and after: about 23 MB unzipped and about 8 MB zipped at this pin.

**Menus:** no change. **Not in S3:** a join to his tailnet, which is his, at S4.

---

### S4 — Phase 316.4: the first TestFlight build

- **Subject.** `build(ios): the first TestFlight build and its checklist`
- **First body line.** `Phase 316.4: the app on his phone, reading his sessions over his tailnet`
- **Tier 2.** No new state, and none of his words are sent anywhere. The upload is his.
- **Starts when.** S3 has landed.

**Agent files:**
- the Release configuration: his team `4GRQMF5T5U` in Release only, the bundle id from §6 decision 6,
  display name `Tortie`, `MARKETING_VERSION 1.0.0`, `CURRENT_PROJECT_VERSION 1`;
- `Assets.xcassets` with the 1024 icon flattened onto an opaque ground from
  `docs/brand/tortie/master/tortie-master-1024.png`;
- no `ITSAppUsesNonExemptEncryption` key unless he has answered (§6 decision 7);
- the CHANGELOG item under `## Unreleased`, written fresh and covering the door and the app;
- the checklist below, copied into the Phase 316 entry's closing section.

**Proof.**
- **Method A, re-derive.** An unsigned `xcodebuild archive … CODE_SIGNING_ALLOWED=NO` is read back by an
  independent reader:
  - bundle id, versions and display name;
  - the ATS key;
  - the icon reads `hasAlpha: no`;
  - the entitlements are empty.
- **Method B, attack.**
  - The Release binary has no DEBUG seam: `nm` and `strings` show no direct transport and no
    payload-injection argument.
  - The Release build launched on the Simulator WITH the injection argument must pair with nothing.
  - The precondition is checked at this commit: no manifest or db schema change since 0.109.0 (§3.9), so he
    can go back to 0.109.0.

**Menus:** no change.

**THE CHECKLIST, in his words.** Before starting: §5 rows 2 to 6 are done.

1. **Build the Mac side.** Quit Tortie. Your sessions keep running, because tmux holds them. In the checkout
   at this commit, run `npm run package`. It signs with your certificate, so it has to be you. Open
   `dist/mac-arm64/Tortie.app`.
2. **Turn the door on.** Open Settings → Phone and switch on "Let my phone reach this Mac". Read the lines and
   press Allow. **You should see** "Listening" with your Mac's tailnet address and port 8823.
3. **Keep the phone to this door**, if you have not already. Open the disclosure, copy the grant into your
   Tailscale admin console, make the one-word narrowing, read the rule preview, then save.
4. **Build the app.** Run `npm run vendor:tailscalekit` (about a minute, and it needs the internet). Open
   `ios/Tortie.xcodeproj` in Xcode and choose the Tortie scheme and "Any iOS Device". Choose Product →
   Archive. In the Organizer, choose Distribute App → TestFlight Internal Only. **You should see** the upload
   finish. Processing takes minutes.
5. **Answer Apple.** In App Store Connect → TestFlight, if the build says "Missing Compliance", answer it
   there.
6. **Install.** Open TestFlight on your iPhone and install Tortie.
7. **Pair.** On the Mac, open Settings → Phone → Pair a phone, paste the key you minted and press Pair. A QR
   code appears for 3 minutes. On the phone, open Tortie and point it at the code. **You should see** the
   same four groups of characters on both screens. Press Allow on the Mac.
8. **Read.** **You should see** "Needs your input (n)" first and "Everything else (n)" under it, with ages and
   Mac Pro rows marked. Tap a working session to see its status, the catch-up line, the message counts and
   the last answer. Open the conversation to see the newest turns: your words plain and the agent's
   formatted. Scroll up to load older turns, all the way to the first.
9. **Watch progress.** Ask that session something on the Mac, then pull down on the phone. **You should see**
   the new turn.
10. **Leave the house.** Turn Wi-Fi off and pull down. **You should see** the list, reached over cellular.
11. **Remove it.** Remove the phone in Settings → Phone. **You should see** the phone go back to Pairing with
    one line.
12. **Check Tailscale.** On your Machines page, the phone appears as `tortie-phone` with the tag
    `tag:tortie-phone`, and its key expiry reads Disabled (Tailscale's default for a tagged device). Check
    this rather than trusting it.

**Not covered yet:**
- no alerts (S5): the Alerts switch in Settings → Phone sends nothing before then, so leave it off;
- no End (317);
- no buttons and no typing (318);
- nothing answers while the Mac is asleep or Tortie is quit;
- a Mac without Tailscale is not supported;
- the terminal's own output is not on the phone, by design;
- if you reinstall the app or move to a new phone, you mint a new key and pair again;
- a TestFlight build expires after 90 days.

**Completion is his to declare from this list.** `probe:p316` passing is the floor, not the finish.

---

### S5 — Phase 316.5: the alert opens the session it names

- **Subject.** `feat(ios): the alert opens the session it names`
- **First body line.** `Phase 316.5: the phone's half of the push, on Phase 314's sender`
- **Tier 3.** It sends a device token to the Mac, which then sends to Apple.
- **Starts when.** S4's checklist passes on his phone, and 314 has landed. Its spec step reads 314 as built:
  where the sender reads device tokens from, the alert's JSON (it must carry the session id as the thread id
  and a custom key), and whether it picks `api.sandbox.push.apple.com` or `api.push.apple.com` from each
  token's environment. If it does not choose the host per token, S5 edits `apns.ts` and says so.

**Files.**
- `src/main/capabilities.ts`: **compose Phase 314's engine in production, because nothing else does** (the
  316.1 fix round, verifier lens 1). `createPushEngine` over the pocket host's `pushDestinations`,
  `apnsKeyStoreForApp`, and the ONE `WakeMark` 316.1 already builds, registered with the ordered disposer
  (`beginShutdown()` then `join()`), and inert until a person turns the switch on and confirms. Until this
  lands, Settings → Phone's "Alert my phone when a session waits" records a confirmed field and sends nothing:
  314 left the composition to 316, and 316.1 was forbidden push code. The push seam
  (`src/main/harness/push-seam.ts`) stays the harness's and is not what ships.
- `src/main/pocket/pairing.ts`: the sealed presentation gains optional `pt` (hex, at most 200 characters) and
  `pe` (`development` or `production`). Both are validated, and one bad field drops the presentation whole.
  They are stored with the phone, so they are in the confirmed hash and go with Remove.
- `conformance:pocket` gains P1 (a token only through `/pair`; write routes still 0) and its ablation.
- `ios/Tortie/Tortie.entitlements` gains `aps-environment`. The profile gives `development` for the Xcode
  arm and `production` for TestFlight.
- The pairing flow asks for notification permission before it presents. A denial still pairs.
- Tapping an alert opens its session. A session that no longer exists draws main's own sentence.
- On each launch, if the token has changed, the app draws one line: "Pair again to get alerts".
- `conformance:ios` gains a rule that `UIBackgroundModes` is still absent, and one that `aps-environment` is
  the only entitlement.

**Proof.**
- **Method A, re-derive.** A second writer builds 314's alert JSON from the same rows. It is delivered with
  `xcrun simctl push <udid> <bundle> <file>`, and the tap must open that exact session.
- **Method B, attack.**
  - A push naming a session that does not exist.
  - Notifications denied, after which every screen must still work (guidelines 4.5.4 and 5.1.2(i)).
  - A presentation with a 10 KB token, a token that is not hex, or an environment that is not one of the
    two words, each refused whole.
  - A token for the wrong environment, which must go to the matching host.
- **His observation.** One real alert on his phone, timestamped at both ends, reported as an observation and
  never as a rate.
- **Ends at** TestFlight build 2 (`CURRENT_PROJECT_VERSION 2`), and the checklist gains three rows. (a) Allow
  alerts when asked, pair again, and see a session that starts waiting arrive as one alert. (b) Tap it, and
  see that session. (c) Turn alerts off in iOS Settings, and see the app still work.

---

## 5. What he must do, and at which step

| When | What, in his words | Why it is his |
| --- | --- | --- |
| 1. Before S1 starts (the first point) | Answer §6 decisions 1 to 5, or say "take the defaults" | Scope and product calls |
| 2. Any time before S4 | Tell us the iOS version on your iPhone. It must be 18.1 or later | The tailnet library's floor |
| 3. Before S4 | In your Tailscale admin console, add `tag:tortie-phone` to `tagOwners`, paste the grant Settings → Phone shows, and narrow `"src": ["*"]` to `["autogroup:member"]` after reading the rule preview. Check first whether you own any tagged device the narrowing would cut off | Tortie never edits your tailnet policy |
| 4. At S4, just before pairing | Mint ONE auth key: one-off (not reusable), pre-approved, tagged `tag:tortie-phone`, NOT ephemeral | No agent may mint a key |
| 5. Before S4 | At developer.apple.com and in App Store Connect: register the explicit bundle id (§6 decision 6), create the app record with that id (if "Tortie" is taken as a store name, pick another; the Home Screen name comes from the app, not the record), sign Xcode in to your Apple Account, and add yourself as an internal tester | Your account and your team |
| 6. At S4 | Run the S4 checklist: `npm run package`, the archive, the upload, the compliance answer, the install, pairing and reading | Signing, uploading and legal answers are yours |
| 7. Before S5 | Turn on the Push Notifications capability for the app's id (Xcode's automatic signing does it when asked). The APNs `.p8` key is Phase 314's, and you give it to 314 | Your account and your credential |
| 8. At S5 | Archive and upload build 2, pair again (so the token travels), and run the three alert rows | The same |
| 9. When you are done | Keep the dev build, or quit it and reopen 0.109.0 (possible because no schema moved, as checked at S4). The door's files stay behind, unread | Your machine |

---

## 6. Decisions that are genuinely his

| # | The question, in his words | Default if he does not answer | What an answer the other way changes |
| --- | --- | --- | --- |
| 1 | "May the phone list every session, not only the ones waiting on me?" (This also settles 313's open question: the phone may open any session Tortie lists.) | **ANSWERED 2026-09-22, yes: "Yes it should be able to open anything."** The approved `Main.html` already draws "Everything else", and `/v1/session` already answers any listed id | No: `others` is not built, and a working session's conversation cannot be reached from the phone |
| 2 | "Can the message box stay off the phone until it can actually send?" | **Yes, it stays off until 318** | No: it ships as a box that does nothing (Apple's word is "dormant"), plus four strings |
| 3 | "The conversation screen has no approved mock. Approve one first, or judge it on the phone?" | **Draw it in the Session screen's style from the desktop's turn block, and judge it at S4** | A mock is added to `docs/design/phone/` and approved before S2's screens builder starts |
| 4 | "When alerts arrive, how does my phone's alert address reach the Mac?" | **(a) Inside the pairing message — and Phase 314's own spec (`build/p314/SPEC.md` §1 row 3) independently chose the same and is building the Mac's half: two optional sealed keys, `apt` and `ape`, in the `/pair` presentation.** The phone never writes to the Mac. If the address changes, the phone says "pair again" | (b) A signed route whose only job is to record it. That is the phone's first write, and it needs its own rules |
| 5 | "Should Settings → Phone get its own menu item?" | **Yes: `Pair a Phone…` beside `Settings…`.** 313 promised it, and the UI rule asks for it | No: the brief says the menus did not change, and why |
| 6 | "What is the iPhone app's bundle id?" It cannot change after the first upload | **`com.itavero.tortie.phone`** | Any other id, set before S4 |
| 7 | "Is `ITSAppUsesNonExemptEncryption = false` right for an app carrying WireGuard?" A legal call, and research 128 §9 q4 | **The key is left out.** You answer Apple's questions in App Store Connect when the build asks | Your answer is written into `Info.plist` at S4, and the question stops on every later upload |
| 8 | "Do I accept the privacy reasons C617.1 (files in the app container) and 35F9.1 (elapsed time) for the tailnet library, or wait for Tailscale's own manifest (PR #57)?" | **Declare them.** They describe what the Go runtime does | S3 waits for upstream |
| 9 | "Is the Mac's own tailnet node deferred?" Your Mac already runs Tailscale, and the door binds its address | **Deferred**, to a later phase, "a Mac without Tailscale" (a redesign of the bind) | That phase is queued now and 316 does not wait for it |

The door client (`URLSession` plus one key) is not his decision. §3.2 measured it, and the build takes it.


### His answers, 2026-09-22

| # | His answer | What the build does |
| --- | --- | --- |
| 1 | "Yes it should be able to open anything." | The app lists every session; `others` is built in 316.1 |
| 2 | Keep the message box off | No box, no send control, no strings for it until Phase 318 |
| 3 | Build the conversation screen, judge it on the phone | Drawn in the Session screen's style from the desktop's turn block; he judges it at 316.4 |
| 4 | (the default, and Phase 314 is already building the Mac's half) | The token rides inside the pairing message |
| 5 | Yes, add `Pair a Phone…` | The menu row lands in 316.1 beside `Settings…` |
| — | **His iPhone runs iOS 18.1 to 18.x** | Above the tailnet library's 18.1 floor. **The ATS exception was measured on iOS 26.3 only (§3.2), so 316.2's floor arm on the iOS 18.3 runtime is MANDATORY, not optional**, and a failure there changes the door client before 316.4 |
| 6 to 9 | Not asked; the defaults stand | Bundle id `com.itavero.tortie.phone`; the export-compliance key left out and answered by him in App Store Connect; privacy reasons C617.1 and 35F9.1 declared; the Mac-side node deferred |

---

## 7. What is NOT in 316

| Not in 316 | Where it goes | Why |
| --- | --- | --- |
| The message box, the reply, pressing a choice | Phase 318 (the reply door) | There is no delivery door, and a visible control that does nothing is "dormant" |
| End, and "Select" on the list | Phase 317 | His ruling, behind Face ID and its own gates |
| "Open in Terminal" (ssh) | Removed | The app's node is private to the app, and the grant allows only the door's port |
| "Open in Claude" | A later phase that first measures where the Remote Control URL is recorded | Research 127:653-654 says it is unmeasured, and nothing in `src/` has it |
| "Enter a code instead" | A later phase | The payload is several hundred characters and no short-code design exists. His phone has a camera. The Simulator uses a DEBUG injection |
| The Mac-side tailnet node | "A Mac without Tailscale" | It is a redesign of the bind and admission, not a vendoring job (§2 row 11) |
| The code generator and `gate:ios-codegen` | Deleted | Main sends the words, and 14 colours are checked as text (§2 row 13) |
| Web push | Never existed | §2 row 2 |
| The git mark on a turn | A later phase, if wanted | Not in the door's turn shape. Adding it is a contract change for a fourth part nobody asked for on a phone |
| Licence acknowledgements for the 43 Go modules | The first phase that ships to anyone but him | Notice duties attach to redistribution. The module list is pinned now, so a change is noticed |
| App Store, external TestFlight, review, demo mode, privacy page | Unchanged refusals (research 128 §4) | Internal TestFlight only |
| A timer, background refresh, a background mode | Never, for the node (research 128 §8) | Guideline 2.5.4, and simplest |
| Live Activity, widget, Dynamic Island, the question inside an alert | Later entries | Research 127 §6, and 314's own list |
| Raw terminal scrollback, screen bytes | Never | His answer: "the full CONVERSATION yes, the raw terminal scrollback no" |
| Light mode, iPad, landscape, more than one Mac per phone | Later, if asked | The approved screens are dark iPhone portrait, with one Mac |
| The door answering on home Wi-Fi | His research 128 §9 q7 | The door binds the tailnet address only |
| `needs input` for a Mac Pro row | Its own queued phase (his ruling of 2026-09-21) | `remoteRowStatus` cannot produce it |
| Push for anybody but him | His ruling (research 127 §11.6) is still open | — |
| A trial on the Simulator over his real tailnet | Dropped (§2 row 29) | Nothing carries the payload into a camera-less Simulator |
| A release | After the phone works end to end, by his rule | — |

---

## §As built — 316.1

Written by the integrator at `89458498` (origin/main, Phases 313 and 314 landed), over four builders' work in
`/private/tmp/wt-p316`. Every row is a place the tree differs from §4 S1 as written, and why. Nothing here
was committed, staged or stashed; no Electron ran.

### What S1 got wrong about the tree at this head

| # | S1 says | What is true | What was built |
| --- | --- | --- | --- |
| 1 | "Starts when": read 314's shared status-word table and `raisedLabel` in `src/shared/` | 314 REUSED the door's injected `PocketFacts.statusWord` and built no shared table (`build/p314/SPEC.md` §1.1 row 1). Nothing in main spelled the table | S1 built it once: `statusVisual` and its helpers moved byte for byte to `src/shared/status-words.ts` (the name 313 mechanism 8 pinned), with `raisedLabel`. `src/renderer/app/status.ts` imports and RE-EXPORTS them, so about 25 renderer importers did not move. Only `raisedLabel` left `src/renderer/session-manager/copy.ts`, which now imports it |
| 2 | Mechanism 1: the question and choice are broadcast at `core.ts:936, :1012` | `:936` is the resume publish and carries no question or choice. Only the monitor's `onActivity` broadcast does. The monitor keeps only a HASH of the choice | One map, `src/main/sessions/activity-now.ts`, written in `core.ts` from the same updates just before the one `activity:changed` broadcast, read through `GmuxCore.activityOf`. It also keeps `lastActivityAt`, which orders `others`. Bounded at 1,000 sessions, least recently updated dropped first; it never drops a removed session's entry otherwise |
| 3 | Mechanism 1: move `emptyLine` to one main-side constant | 314 already did (`NOTHING_NEEDS_YOU` in `src/main/tray/attention.ts`) | Read from there |
| 4 | Mechanism 1: `catchUp` is `buildProjectLine` "over main's own session view" | Main has no session view that does not run git: `sessionsOverview` runs git on every call | `facts.ts` builds the view from the overview store and hands `toTurnView` the STORED git verdict, as the story's turn read does. A phone's question starts no process. Limit: the line reads "Answered" rather than "Done, and git agrees" until Catch Me Up has stored a verdict |
| 5 | Mechanism 4: `ageNote` is "Ages start again when Tortie restarts on your Mac or when your Mac wakes" | 314 shipped a corrected sentence (`build/p314/SPEC.md` §1.2 row 10) | `ageNote` is 314's `POCKET_AGE_HONESTY`: "Waits first seen after your Mac wakes or Tortie restarts are timed from then." |
| 6 | Mechanism 3 names two query shapes | A `from` with no `to` is a third | Read as "from there up to the newest": `listTurnsBetween(id, from, MAX_SAFE_INTEGER, limit)`. An index is digits only, no leading zero, a safe integer; anything else, and a `from` past its `to`, refuses the page (answered as an unknown id), read one character at a time because `conformance:pocket` R1 refuses any pattern in `routes.ts` |
| 7 | Mechanism 5 names `pocket:setDoor` only; gates say "243 → 244 plus 314's" | 314 added no channel and left its push switch's channel to 316. The sheet cannot reach 314's switch without one | Two channels: `pocket:setDoor` and `pocket:setPushAlerts`. `gate:contract` 243 → 245; the baseline moved exactly three lines (the count and the two names). Ten `pocket:*` channels register at run time, not nine |
| 8 | Mechanism 5: `PocketStatus` gains `grant` | The sheet had no way to confirm the door: no lines and no hash reached it | `PocketStatus` also gains `confirmLines` and `confirmHash` |
| 9 | Mechanism 6: the key "is never in any IPC answer" | The QR is drawn in the renderer, and its payload carries `tk` | Exactly one exception, `beginPairing`'s own answer (`payload`). `K1` allows that one and no other. Residual, stated in `pairing.ts`: the pasted string and that payload are JavaScript strings, which cannot be zeroed |
| 10 | Mechanism 6: zeroed "on expiry" | There is no timer | Zeroed at the first touch after the deadline (every read sweeps; the sheet reads once a second while a code shows), and at quit by the ordered disposer. Also zeroed on cancel, allow, a replacing window and any refused open after the key was read |
| 11 | Mechanism 6: "its line says the phone must join and present inside it" | No builder wrote it (B: surface copy; C: not in the list) | The integrator wrote it: `SCAN_LINE`, "Scan it with Tortie on your iPhone. The phone must join and pair before this code shuts." |
| 12 | Mechanism 7: QR colours in "one small constants file"; tokens if a gate refuses a literal | A hex literal there is refused by `conformance:hue` rule 26, and tokens would move rule 25's pinned dark digest and owe the 13-minute run | `src/renderer/settings/phone/qr-colors.ts` names CSS system colours, `Canvas` and `CanvasText`, under `color-scheme: light` pinned on the SVG. No literal, no token; `tokens.css` is untouched, so no `conformance:hue` is owed. UNMEASURED IN ELECTRON (see concerns) |
| 13 | Mechanism 8: the row opens Settings → Phone | Settings had never opened to a section, and `src/main/settings/window.ts` was in no builder's set | `openSettingsWindow(section?: 'phone')`: a new window loads at `#phone`; an open one gets a fragment-only load unless it is already there. `sectionFromHash` in `SettingsApp.tsx` accepts only ids on the rail, and `replaceState` keeps the hash in step with the rail |
| 14 | Files: `src/shared/ipc/pocket.ts` is builder A's | B and C had to edit it for the channels, the status fields and the two honesty sentences | Three builders edited disjoint sections of one file; every edit survived |
| 15 | Gates: rules "T1" and "L1" | Both ids were taken | Named `T2` and `L5`, as the SPEC already did with `H2` |
| 16 | 4.0: `HELPER_USER_FLOOR` 148, "149 if probe:p314 lands first" | It was 149 at this head | 150 (`probe:p313`) |
| 17 | Files: the hostile arms go in `build/p313/hostile-client.mjs` | The arms live in the `.mts`; the `.mjs` is the runner | 75 arms in `hostile-client.mts` |
| 18 | Method B: every arm in the hostile client | Three need a real host with a sealed store | `bindAtLaunch` with no confirm is probe arm L1; `setDoor` during quit is A4; Remove in flight is A3, plus composer-level `Rm4`/`Rm5` in the hostile client |
| 19 | (not said) A Remove answers the phone's next request with a 404 | B enforced 313's own sentence ("the door asks again before it answers anything"): every press that moves a hashed field closes a LISTENING door until the person confirms again | Remove, flipping alerts, and an allow that recorded but could not save all close a listening door. The next request gets a dead socket; probe A3 asserts that. Removing one phone shuts the door for every other phone until Allow |
| 20 | Parent measurement: "After: 9 registered" | See row 7 | 10 registered, 0 write routes |
| 21 | S4 checklist: the fingerprint is "four groups" | `pairFingerprint` draws six groups of four | Not changed here; S4's to correct |

### Decisions the builders and the integrator took, and where each comes from

- **The age** (S1 "starts when", §2 row 23). `blockedSince` is 314's blocked feed (`src/main/tray/blocked-feed.ts`), installed by the facts composer the first time the core answers, never the tray's map. `seenAtWake` is `blockedAge`'s answer for a WAITING row only; any other row is handed no wakes, because its stamp is not a waiting stamp (at head it was computed from `createdAt`). `ageText` is `formatAge`, moved from `src/renderer/format.ts` to `src/shared/age.ts` with every importer re-pointed. A waiting row is aged from `blockedSince`, any other from its last output, else its creation.
- **Fresh before read** (mechanism 2). `refresh` is an OPTIONAL member of `PocketFacts`: the push seam and the tests read no conversation. The production composer always supplies it; `T2` pins that it is awaited before any store read. Both routes look the session up again after the yield, so a Remove in flight answers as an unknown id. A read that throws answers null, because `bind.ts` swallows a rejected handler without ending the response. A remote row's turns answer `[]` with `note: OUTCOME_REMOTE`, and nothing is refreshed or read for it.
- **The launch step** (mechanism 5, refusal 8). `openAtLaunch` returns unless the sealed store says `enabled` AND `bindAtLaunch` AND the gate says `confirmed`; otherwise the sheet says why in the gate's own sentence. `start()` asks the gate, awaits `beforeOpen`, asks the gate AGAIN, refuses if the confirmed address is not the one `bind.ts` would bind (`ADDRESS_NOT_BOUND`), and binds with nothing awaited between the last ask and `startPocketDoor`. `setDoor({on:true})` opens at once only when those exact fields were confirmed before.
- **Integrator: the door is never what boots the core.** As the builders left it, `beforeOpen` called `getGmuxCore()` from `installMainCapabilities`, which runs at `whenReady` BEFORE `src/main/index.ts` asks the manifest whether a newer Tortie owns it (Phase 21: "the FIRST thing normal startup does") and before the agent overlay read, which must happen "BEFORE the core boots" (Phase 23). With the door on and confirmed, every launch would have booted the core first. `beforeOpen` now waits for the first window, which normal startup opens only after it has kicked the boot, and then joins that boot. This is `push-seam.ts`'s own rule. The refusal screen is a dialog and opens no window, so on that path the door never asks for the core.
- **Composition** (B). `capabilities.ts` builds the host from `createPocketFacts` (the core the door's `beforeOpen` resolved, `overviewStore`, `foldChosenNow`) and a `WakeMark` over Electron's `powerMonitor` (314 left that to 316), registers beside `registerMachinesIpc`, calls `void pocketHost.openAtLaunch()`, and at quit shreds an open pairing window and disposes the `WakeMark`. The door's overview reads build their own deps rather than sharing `registerOverviewIpc`'s resolve cache, which keeps its deps private.
- **QR v:2** (mechanism 6, §2 row 24, and his ruling that the QR pins the public key). `{v:2, host, port, fp, dk, dx, ps, exp, tk?}`, `fp` from `spkiPinOf(publicKeyFingerprint)` only while the door listens; no window opens with no pin. The key must start `tskey-auth-`, be at most 256 characters after trimming (anything over 1,024 raw is refused before it is walked), and be printable ASCII. Refusal sentences never repeat it; `holdsTailnetKey()` answers a boolean.
- **The sheet** (mechanism 7). Just enough words: labels and one line each, the grant, the one-word narrowing, the preview line, the names residual and `POCKET_ORIGIN_HONESTY` behind one disclosure. The key field is an uncontrolled `type="password"` input, read and emptied in the same press, never React state, never logged, no browser storage. Turning alerts OFF confirms again in the same press only when the door was confirmed before and exactly one confirm line moved (314 §1.1 row 2); turning them ON waits for the person's Allow. The alert switch cannot be turned on while the door is off.
- **The QR encoder** (§2 row 30). Project Nayuki's `qrcodegen.ts` vendored from commit `8329a710`, MIT header kept byte for byte, namespace made ES exports and 30 type-only `!`s added; 832 symbols and 9,475,166 modules checked identical to upstream. Credited in the About panel (a fourth line) and in `NOTICE` with the full MIT text.
- **The menu** (§6 decision 5). Tortie → "Pair a Phone…" directly under Settings…, no mark (`device-mobile` is not in the closed menu set, and adding it regenerates the committed bitmaps with an Electron) and no accelerator.
- **Integrator: Phase 314's push seam.** `beginPairing` now takes an input and refuses on a door that is not listening, and 314's seam "never calls `host.start()`". The seam now walks the sheet's order on LOOPBACK for the pairing alone (switch on, confirm, listening, pair with `tailnetKey: null`) and switches the door off before the engine starts, so every push it drives is still one "while the door is down" and its final confirmed fields are the ones 314's seam always confirmed. It opens the door only when the field address is `127.0.0.1`, which is the harness loopback override; otherwise it pairs nothing and says so, and `start()` would refuse the bind anyway. `probe:p314`'s launch env gains `GMUX_POCKET_LOOPBACK=1`. The seam still spells `SEAM_STATUS_WORD`, the second spelling `conformance:push` S1 holds equal to the shared table; retiring it changes 314's gate and was left.
- **Re-pointed, not copied.** `build/conformance-push.mjs` S1, `build/probe-p143-story.mjs`, `build/p311/copy-drift.mjs` (every needle unchanged), and `build/p303/rederive.mjs` (reads `src/shared/status-words.ts` when it exists, the renderer file in a parent checkout).

### Open concerns for the verifiers

1. **The push switch has nothing behind it in production.** No production code composes Phase 314's engine: 314 §"No production composition" left it to 316, S1 says "no push code", and S5 names no composition either. Settings → Phone draws the switch because the brief says so; turning it on records a confirmed field and nothing is ever sent. No phone can hold a token before S5, so nothing false can be observed in 316.1, but the step that composes the engine has no owner.
2. **`probe:p313` has not run.** It is the one app run and it owns every live claim: the order, the relaunch listening with no press (now AFTER the first window, see the integrator's launch-step change), the unconfirmed relaunch that must not bind, `setDoor` during quit, the Remove in flight, `blockedSince > createdAt`, the appended turn, and the key scan. Method A's independent reader is the verifier's to write (`P313_KEEP=1` keeps the answers).
3. **`probe:p314` must be re-run** because the push seam changed. It spends two real model turns (Gemini CLI and Claude Code), which is the operator's standing ruling for that probe; the seam's new pairing path has no other live proof. Its door binds 127.0.0.1:8823 while the phones pair, so it must not run beside `probe:p313`.
4. **The QR's colours are unmeasured.** Read `getComputedStyle` on `[data-qr-part=ground]` and `[data-qr-part=ink]` in both schemes; `fill` should be `rgb(255, 255, 255)` and `rgb(0, 0, 0)`. If Chromium resolves `Canvas`/`CanvasText` by the window's scheme rather than the SVG's own, the fallback is literals plus a named exemption in `build/conformance-hue.mjs`, which owes the 13-minute run.
5. **The menu row's fragment load is unmeasured.** With Settings open on another section, "Pair a Phone…" must move it to Phone WITHOUT a reload (a browser-initiated fragment-only `loadFile`, which the trusted-window lock never sees because `will-navigate` is not emitted for it). With Settings already on Phone it must only focus.
6. **Two `PocketHost`s share one store in a `probe:p314` run**: the production host (whose `openAtLaunch` reads no store and stays `off`) and the seam's. The production host caches the store the first time it reads a non-null one, so its Settings view could go stale if a harness drove both. Nothing drives both today.
7. **`probe:p313` dials `pocket:setDoor({on:false})` in its channel census on launch 1**, which is benign on a fresh profile; a verifier reusing a profile should know it.
8. **Named limits carried forward:** an agent id the registry does not know (including `shell`) is labelled with the id itself, not `Shell`; the Catch Me Up line reads "Answered" until a git verdict is stored; a store read that fails answers as an unknown id; the activity map is bounded but does not drop a removed session's entry; S2 must reconcile the phone mock's "press Pair a phone" with the Mac's heading and button.
9. **Five `src/main` tests fail and are not this phase's**: `config/__tests__/store-watch.native.test.ts` (1) and `watcher/__tests__/repo-watcher.native.test.ts` (4), which need the native FSEvents stream. Every other `src/main` test passes (9,546).

### The fix round (one pass, after lens 1 approved and lens 2 answered needs_work)

Written by the fixer in `/private/tmp/wt-p316` at `89458498`. Nothing was committed, staged or stashed, and no
Electron ran. Every major and minor finding was fixed at the place it was named. The reverify is independent.

| Finding | Where it was fixed | What changed | Proof, run rather than read |
| --- | --- | --- | --- |
| **Lens 2, major.** A phone removed while its request was in flight still got its answer, read from the store after the press. Method B names this arm. | `src/main/pocket/server.ts`, `bind.ts`, `ipc.ts` | **Refusal 7.** After the answer is composed, and with nothing awaited before the send, the handler asks three things again: the quit, whether the phone it VERIFIED is still paired (`unpaired`), and whether the door INSTANCE that accepted the request has begun to stop (`shutdown`). `bind.ts` passes each handler that instance as a `DoorAdmission`, which is a third argument, because a stop drops the module's door before it joins. `verify` now names the phone (`phoneId`). The host answers `stillPaired` from its store, and `removePhone` already writes the store before its first await. The same instance check is also asked at the two earlier admission points. | `server.test.ts`: a control that answers, a phone removed inside the held composition refused with the log reason `unpaired`, and a stopping door refused with `shutdown`. Both refusals went red with the check removed, and the file was restored byte for byte. `ipc.test.ts`, through the SHIPPING owner (its handler, verifier and store) with the phone's half spelled in the test: a control at 200, then removal inside the held refresh refused with `unpaired`. The hostile client now has 78 arms. `Rm6` holds the refresh, removes the phone and reads `refused-404-composed-unpaired`. `Rm6b` shows the phone reads again. Arm `14` now stops the door with a request inside its composition: `14` reads `true-1` and `14c` reads `refused-404-composed`. The hostile deps now hand the quit flag alone, as `ipc.ts` does, so `14c` proves the instance and not the dependency. `conformance:pocket` gains `A4` (30 rules). **probe:p313 A3 no longer accepts a 200.** It holds the request's one signed byte of body, so the request is accepted and in flight when Remove is pressed on every run. The exact compose window is the hostile client's `Rm6`, because the app's timing cannot place it. |
| **Lens 2, minor (X1).** A switch-on and a switch-off in one macrotask left the door listening while the store and the sheet said off. | `src/main/pocket/ipc.ts` `setDoor` and `start` | The switch-off counts itself (`switchedOff`) and writes both fields false BEFORE its first await, then stops. The stop still happens when the write fails, and the refusal is said after it. `start()` takes the count on entry and compares it with nothing awaited before `startPocketDoor`. It compares again after the bind returns, so a refusal the off caused is not shown to the person. After a bind that succeeded, `start()` also runs the same `closeUnlessConfirmed` that every hashed-field press runs. This covers a Remove or an alerts flip that landed while the socket was opening, which found nothing listening to close. It is the same class of defect, found while fixing X1. | `ipc.test.ts`: lens 2's X1 k=0 interleaving, now deterministic, binds nothing. A store that can be read but not written (the off cannot save) binds nothing, and only the count stops it. An alerts flip inside the listen closes the door that opened. The old "stops FIRST" test now asserts the store says off before the first await. Four clause ablations each reddened their own test and were restored by hash. `L5` gains clause (e), and `L5d` and `L5e` are its ablations. |
| **Lens 2, nit (X2).** A stop within one tick of a start left an orphaned listener on the port. | `src/main/pocket/bind.ts` | Fixed because the X1 fix depends on it. After the listen, a door whose `stop()` ran inside it closes the new server and refuses. `startPocketDoor` no longer joins a start whose door has since been stopped. It waits for that start to release the port, then starts afresh. A person's stop inside an opening no longer sets the module's last refusal to "quitting". | `bind.test.ts`, real loopback. A stop inside the opening frees the port, which a squatter takes at once, and `lastRefusal` stays null. A start after such a stop gets a fresh door, not `port-taken`. A handler sees `stopping()` false, then true across the stop, while the module already reports not listening. Without each clause, its test went red. |
| **Lens 1, minor.** The Alerts switch is drawn, and nothing in production composes Phase 314's engine. | `build/p316/SPEC.md` S5 **Files** and the S4 checklist | The composition now has an owner: S5's first file row names `src/main/capabilities.ts` composing `createPushEngine`. S4's "Not covered yet" tells him to leave the switch off until then. S1's code is unchanged. Mechanism 7 draws the switch, "Not in S1" forbids push code, and lens 1 said S1 need not change to commit. Hiding the group was the other option, and it would contradict mechanism 7 and the brief. | None, because no code changed here. The reverifier can confirm that outside tests, `createPushEngine` is still named only by its own module (`src/main/push/engine.ts`, `index.ts`) and by `src/main/harness/push-seam.ts`. |

**Nothing was removed** under the no-regression rule. None of the changed code runs for a person who never
switches the door on. The off path runs only on a press, `start()` only when the door is `enabled`, the handler
only on a request, and the listener only once started. The launch step still returns `off` after one read of a
file that is not there.

**Not fixed, and why.**
- **Lens 2 nit P2b** (after Allow, `/pair` answers `allowed` to any presenter from the allowed phone's address).
  This is Phase 313 behaviour and nothing leaks, because that presenter's signed reads are refused `unpaired`.
  Changing it moves `probe:p313`'s P2 arm, which asserts exactly this answer, and the pairing tests. The first
  thing to consume the answer is S2's pairing screen, so S2's spec step should decide it. It is left for the
  operator.
- **Lens 1 nits.** Building concurrently in one `out/` is a workflow matter and not code. The live world covers
  one absence sentence and only "now" ages. That is optional and does not block S1. The Catch Me Up line reads
  "Answered" until git has run, which is the stated limit in row 4 above.

**What this round did not run**: `probe:p313` (it starts an Electron, so it belongs to the reverifier), `npm run build`, `npm test`
whole, the smokes, `package`, and `probe:p314`. The integrator's concern 3 still stands. `probe:p314` must be
re-run, because this round changed `setDoor`'s off path and `start()`, and the push seam calls both.

### The serial switch (one fix, after the reverify answered needs_work; his ruling of 2026-09-23)

Written by the fixer in `/private/tmp/wt-p316` at `89458498`. Nothing was committed, staged or stashed. His ruling:
"Yes, fix and land." ONE narrow fix: the door's switch handles one press at a time. Nothing changed outside
`src/main/pocket/`, its tests, `probe:p313`, and the `conformance:pocket` and `ablation:p313` arms that pin it. No
new surface, route, channel or contract line (`contract-inventory --check` is byte for byte), and `bind.ts` is
unchanged. With the queue in place no start of the host's is ever inside `startPocketDoor`'s wait loop, so no start
there needs cancelling.

| Finding | Where it was fixed | What changed | Proof, run rather than read |
| --- | --- | --- | --- |
| **Reverify, minor 1** (X1b, X1c, X1d, X2b). On, off, on, off inside one turn ended with the store `enabled:false`, the sheet `off`, and the door LISTENING, and a paired phone read 200. A start waiting in `startPocketDoor`'s loop was not cancelled by an off that landed while it waited, because `stopPocketDoor` found `current === null`. | `src/main/pocket/ipc.ts` | **One serial queue on `PocketHost`** (`serially`). Every start (`openNow`) and every stop (`closeNow`, `closeNowUnlessConfirmed`) runs only inside a queued job. The public `start()`, `stop()` and the hashed-field close take their turn in the queue. **The last press decides.** Each accepted `setDoor` counts itself with `pressed()` before its first await. An off counts even when it cannot be saved; an on counts only once it has changed something. A start whose press is no longer the last one does four things. It stops waiting on the sessions, because the wait races the press's `superseded` promise. It binds nothing: `if (this.superseded(press)) return;` is the statement right before the bind. If it bound anyway, it closes that door inside its own job, before the next press runs. And it never shows the listen's refusal to the person. `switchedOff` is gone. | `src/main/pocket/__tests__/switch-queue.test.ts`, 34 tests, a REAL loopback TLS door, a real phone paired through the shipping window and reading with a real signature. After the last press settles, each test asserts that the sealed store, the sheet's state, the module, the socket and the phone agree. **The reverify's four shapes** (X1b; X1c with a phone; X1d at 3 and 4 microtasks; X2b with the off placed inside the first start's real listen): all 5 are red with the queue removed (`ipc.ts` swapped for the reverify snapshot's pre-queue file in a scratch clone, 10 of 34 red). **Serialization alone removed** (`serially` runs the job at once): 3 red, being on-on, on-off-on-off-on at 4 microtasks, and "closes a door that bound under it before the next press runs". **Supersession alone removed**: 3 red, being "stops waiting on the sessions", "on, on binds ONCE", and "closes a door that bound under it". The 19-row sweep around the shapes is coverage: 3 of its rows were red before the queue, as the reverify found. |
| **Reverify, nit 2.** `probe:p313` A3 held the body byte, so the Remove landed before verify, the request was refused `shutdown`, and the arm passed at the pre-fix build too. | `build/probe-p313.mjs` A3 | **A3 now places the Remove AFTER verify and BEFORE the answer is written**, using nothing but the app's own paths. The composition's refresh is `sessionActivity`, whose calls run one at a time on a chain that yields between the rows of a call. So the renderer floods `overview:activity` for the two conversations, calibrated per machine to hold the chain about 1 s (`P313_A3_HOLD_MS`). The request is sent TWICE with one nonce. The door spends a nonce only after the signature holds, so when main prints `refused … : replay`, the other sending is inside the composition. The Remove is pressed only after that line, and only with exactly one sending still in flight. The arm asserts the composed request is refused 404 or cut, never answered, and that main prints `refused … : unpaired`. That is refusal 7's own reason: a request refused before verify says `shutdown`, because the Remove stops the door in the same task. A run that cannot place the Remove is UNREADABLE, never a pass. The unused held-body helper was removed. | **Head:** PASS, the composed request refused 404, `unpaired` printed (run 3; run 2 PASS with the request cut by the stop's 1 s join; run 1 UNREADABLE on a placement proof that was too strict, because main prints the replay line before that 404 reaches the client, since corrected). **Pre-fix** (an APFS clone of the reverify's kept snapshot `p316v/head`, with no `stillPaired` in its source or bundle, running this tree's probe file): FAIL every time. With a 0.7 s hold the composed request was **answered 200** after the Remove landed past verify, the major itself. With the 1.2 s and 2 s holds it was cut, and no refusal 7 reason was printed. |
| **Reverify, nit 3.** `probe:p314` had not been re-run since the push seam and `setDoor`/`start` changed. | none | Re-run under the lock, exactly as its header says (two real model turns under his own sign-in, through its wrapper). | **PASS, exit 0**, every arm P0 to P9. P0: the seam paired A and B through the queued `setDoor` and `confirmDoor` on loopback and switched the door off (`door: off`, `confirm: confirmed`). P2 and P3: the real Claude Code permission requests. No Electron and no agent process of the run left. `model turns spent: 2`. |

**The gates this round moved.**
- `conformance:pocket` gains **`Q1`** (31 rules): the queue chains each job on ONE tail and swallows a failed job's
  rejection. `stopPocketDoor` has one call site, in `closeNow`. Every call of `openNow`, `closeNow` and
  `closeNowUnlessConfirmed` is an argument of `this.serially(...)` or is made from inside `openNow` or
  `closeNowUnlessConfirmed`. Both halves of `setDoor` press before their first await, and that first await is the
  queue. `pressed()` settles the previous press before replacing it. The sessions wait races the press. After the
  bind, a superseded press closes before anything is said. Nine clause ablations in a scratch clone each reddened
  `Q1` alone.
- **`L5`** now reads `openNow` (the one bind site) and `this.pressed()` / `this.superseded(press)`. Its clause (e) now
  requires the statement IMMEDIATELY before the bind to be the last-press check. The first full `ablation:p313` run
  showed `L5d` GREEN, because an earlier check with no await after it satisfied the old textual clause. That clause
  was decoration until it was tightened.
- **`ablation:p313`**: `L5b`, `L5d` and `L5e` were re-pointed at the new text (`L5e` now also reddens `Q1`), and a
  new arm, **`Q1a`**, makes the queue run each job at once. Full run: PASS, 57 of 57 arms red on their own rule.
- `src/main/pocket/__tests__/ipc.test.ts`: "closes a door that opened while a press withdrew the agreement" now waits
  until the start is inside its listen before it flips the alerts, and it does not await the flip until the listen
  is released. Under the queue, the old order made the flip land before the start's job ran, so the test passed
  without testing its sentence.

**What a person sees that changed.** Nothing changes for a person who never turns the door on: the launch step
still returns `off` after one read of a file that is not there, and nothing queues. With the door on, an off pressed
while the sessions are still coming up is answered at once. It no longer waits for them, and the start it
supersedes never binds. A Remove, an alerts flip, a forget or a confirm now waits its turn behind a start in
progress. When the sessions are already up, that wait is one listen, milliseconds. At launch, before the first
window, it can be as long as the boot. Only the IPC answer waits: the phone is refused `unpaired` from the store
write, before any await.

**Named limits.** Each `PocketHost` has its own queue, and the door is a module singleton. Two hosts that both drive
the door are still not serialized with each other. Nothing drives two today (concern 6 above). The module-level
shape the reverify also ran against `bind.ts` directly (start, stop, start, stop, with no host) still binds after
the last stop. Only `PocketHost` calls `startPocketDoor` and `stopPocketDoor`, and `L5`/`Q1` pin that each has one
call site, inside the queue. So the product cannot reach that shape. Measured: the reverify's own harness
(`p316rv/rv-attack.test.ts.keep`), run unchanged against this tree in a scratch clone, reads 51 of 52. The one red row
is that module-level X2b (`a: quitting, b: ok, tcpAfterLastStop: true`). At the reverify's head it read 47 of 52 (X1b
k0, X1c, X1d k3 and k4, X2b). If he wants it closed too, `startPocketDoor` would need a stop counter checked after its
wait loop. That is a change to `bind.ts`, which this ruling did not ask for, and it would make the host-level tests
above unable to tell the queue from it.

---

## §As built — 316.2

Written by the integrator at `02c6b318` (origin/main, 313, 314 and 316.1 landed), over four builders' work in
`/private/tmp/wt-p316`. Nothing was committed, staged or stashed. No Electron ran and no Simulator was created
or booted; every iOS claim below is a BUILD for the Simulator SDK, a macOS XCTest run of the Door code, or a
text gate. What the phone DOES on iOS is the verifiers' to measure under the lock.

### What S2 got wrong about the tree at this head

| # | S2 says | What is true | What was built |
| --- | --- | --- | --- |
| 1 | Files: builder D writes `build/p316/probe.mjs` and `vectors.mjs` | The task assigned `vectors.mjs` to A, and named the probe `probe-p316.mjs` | `build/p316/probe-p316.mjs` (D), `build/p316/vectors.mjs` (A, reruns itself under the pinned tsx, `--check`). D added `build/p316/node-phone.mjs` (a phone written from the wire format, Method A's reader) and `build/p316/test-ios.mjs` (the runner behind `test:ios`) |
| 2 | Proof: the probe runs `TortieUITests` and an ATS unit test hosted in the app | No row of the Files table owned either, and `ios/TortieUITests/` did not exist. Every probe arm would have read UNREADABLE | The integrator wrote both, to the line protocol in the probe's header: `ios/TortieUITests/P316DriveUITests.swift` (`testDrive`: launch with the code, then `pair`, `list`, `open:<id>`, `conversation`, `first`, `unpaired`, each printing labels and frames from ONE accessibility snapshot, never a photograph, asserting nothing) and `ios/TortieTests/P316ATSTests.swift` (`testDialThroughSocks`: the SHIPPING `DoorClient` with a `.socks5` route to the stand-in, one `POST /pair`, one line). Both `XCTSkip` unless `P316_RUN` is set, so `test:ios` counts the ATS test as skipped |
| 3 | Builder B: "a DEBUG-only payload given as a launch argument" in `PairingScreen.swift` | A put the argument reading in `Door/Pairing.swift` | `PairingDebugSeam` (`-TortieDebugPairingPayload`, `-TortieDebugForgetPairing`) inside `#if DEBUG` in `Door/Pairing.swift`, read once by `AppModel.launch()` inside `#if DEBUG`. The page arithmetic is A's `TurnPages` in `Door/Contract.swift`, not a screen |
| 4 | "Both DEBUG seams" | A THIRD is needed. XCUITest waits for the app to go idle before and after every tap, and the attention dot's pulse repeats forever | `MotionDebugSeam` (`-TortieDebugStill`) inside `#if DEBUG` in `Screens/Pieces.swift`: the dot does not pulse, exactly as under Reduce Motion. It moves an opacity and nothing the probe reads. The Release binary holds none of the three (`strings`: 0 of `TortieDebug`, `MotionDebugSeam`, `PairingDebugSeam`, `DirectLoopbackTransport`, `127.0.0.1`; the Debug binary 6, 2, 2, 2, 2). An ablation moving it out of `#if DEBUG` reddens rule (d) on both the declaration and the read |
| 5 | C: "the 14 colours" | 14 HEXES under 16 token names (`accent` and `statusWorking` share `#4d9de8`; `statusIdle` and `statusExited` share `#8b93a1`); 12 are drawn in S2 | `Tokens.swift` keeps all 16 names so the table matches the mocks; rule (a) reads 16 names onto 14 hexes of the dark base |
| 6 | Signing: vectors "byte for byte" | CryptoKit's Ed25519 is randomized (A measured two signatures of one message differ); Node's is deterministic | The vectors hold the CANONICAL TEXT byte for byte, CryptoKit verifies Node's signature, and the door's own verifier accepts CryptoKit's (A's live run: 9 signed reads accepted) |
| 7 | Method B: an unknown status word and an unknown dot "must end in a drawn sentence" | The status word and its title are MAIN's words (§4.0: every string the phone draws comes from main) and the phone computes nothing from them. Refusing the list over a word the phone has not seen would make every status word a later Mac adds a phone-breaking change | DRAWN, NOT REFUSED: the word is drawn as sent, an unknown dot as a ring with no colour of its own (`StatusDot.unknown`). `hostile-door.mjs` marks both arms `ends: 'drawn'` and exports `UNKNOWN_STATUS_TITLE`; the probe grades them as the list drawn, a dot on every row, main's unknown word on the dot's label, no failure sentence, the app alive. Every other hostile arm still ends in a sentence |
| 8 | Method B: "each must end in a drawn sentence" (paging arms) | The conversation says a refused page of older turns in `conversation-older-line`, with the turns already read kept above it; the probe's sentence reader looked only for `*-failure` and `pairing-line` | The probe's `drawnSentence` also reads `conversation-older-line` |
| 9 | Files, D: `build/p311/copy-drift.mjs` "reads Copy.swift; owns the pairing rows and Everything else; re-points the rest per §2 row 31" | Not built by any builder (the task did not give it to D) | The integrator built it. Six owed rows are OWNED by `ios/Tortie/Style/Copy.swift` now (the five pairing lines and "Everything else (9)"); the four message-box rows are owed to Phase 318; "Open in Terminal" is owed to no phase (removed, §7); "Open in Claude" to the phase that measures where the Remote Control URL is recorded; "Enter a code instead" to a later phase; "Tortie brings its own private network…" to 316.3. `OWNED_RULE_FLOOR` 26 → 33. And the gate READS `Copy.swift`: one owner line per word, every `/// Mac:` word the quoted module's word byte for byte (33 words, floor 30), every `/// Names:` control still said (3, floor 3), with six in-memory ablations in `--self-test`. It ports the rules `ios/TortieTests/CopyTests.swift` holds under XCTest, so a Mac with no Xcode still judges the phone's words |
| 10 | 316.1 concern 8: "S2 must reconcile the phone mock's 'press Pair a phone'" | "Pair a phone" is the Mac sheet's GROUP HEADING (`PAIR_GROUP`) and cannot be pressed; the button is `BTN_PAIR = 'Pair'` | `docs/design/phone/Pairing.html` line 21 now reads "…open Settings then Phone and press Pair." — the phone's `Copy.pairStepOnMac` byte for byte, whose three nouns are pinned to the Mac by `/// Names:`. `CopyTests.testTheComposedLinesAreTheMocksLines` now holds that line too. One sentence of an approved mock changed; nothing else in `docs/design/phone/` moved |
| 11 | §3.8: "the whole Simulator arm needs no team" | The SIGNATURE has none (`codesign -dv`: `Signature=adhoc`, `TeamIdentifier=not set`), but Xcode reads his team id from its own preferences and writes it into the Simulator build's SIMULATED entitlements even with `DEVELOPMENT_TEAM=''`: `Tortie.app-Simulated.xcent` holds `application-identifier` `<team>.com.itavero.tortie.phone`, the UI test runner's adds `keychain-access-groups`, and the Debug binary's `__TEXT,__entitlements` carries the id (4 `strings` hits) | Not changed. The id is his, already public at `electron-builder.yml:9`, and it is probably what lets the Keychain work in the Simulator. Named here because §3.8 said otherwise |
| 12 | §3.4 pitfall (e) | Still happens. `~/Library/Caches/org.swift.swiftpm/package-collection.db-shm` moved at 14:38:30 during the integrator's own Release build (plain `xcodebuild`, derived data in scratch); D saw it move through `xcodebuildRun`, which passes every package-cache flag xcodebuild has | Named in `build/simulator-run.mjs`'s header rather than claimed away |
| 13 | (not said) Xcode 26.3 | Builds Debug as a stub plus `Tortie.debug.dylib` and a previews dylib by default | `ENABLE_DEBUG_DYLIB = NO`, `ENABLE_PREVIEWS = NO` on the app target |
| 14 | A: "a declared length over the cap is refused before its first byte" | URLSession holds back the response while it sniffs content when an answer has NO `Content-Type`, so such a 10 MiB answer ends at the 15 s timeout, not at once (A measured) | The door always sends `Content-Type` (`server.ts:162`), and the hostile door does too. Limit stated, not fixed |
| 15 | (c) "a SOCKS proxy it builds never fails over" | `allowFailover` is ALREADY false by default (A measured), so taking the line out cannot redden a test | Held as text by rule (c) instead |
| 16 | `seenAtWake`'s comment in `pocket.ts`: a client draws "since your Mac woke" | 316.1 moved every age into main (`ageText`, and `ageNote` for the wake) | The phone draws main's `ageText` and `ageNote` and no age of its own; the comment is stale and is the contract's to correct |
| 17 | S4's checklist: fingerprint "four groups"; the mock draws three groups with dots | `pairFingerprint` draws six groups of four with spaces, on both screens | The probe compares the 24 hex digits; the drawn string is the Mac's six groups |
| 18 | `DEVELOPMENT.md` (D's paragraph): the per-device log folder stays behind | `withSimulator` removes `~/Library/Logs/CoreSimulator/<own udid>` | The sentence says so |

### Decisions the builders and the integrator took, and where each comes from

- **Paired only after the first signed read** (316.1 nit P2b, the brief). `PairingFlow.run` presents every 2 s inside the window; on `allowed` it reads `/v1/blocked` SIGNED and writes the Keychain only when that answer comes back whole. `allowed` then a 404 ends `.notAccepted` with nothing kept (A's live run). The list draws that first answer without reading again (B). No Mac code changed.
- **One network file** (§4 S2, rule c). `Door/DoorClient.swift`: https to an IPv4 literal only, the SPKI pin in the session delegate (a non-P-256 key cancels the challenge), 2 MiB counted as it arrives, 15 s request and resource timeouts, no redirect, cookie, cache or credential store, an empty proxy dictionary on the direct route, `allowFailover = false` on the SOCKS route. Every failure is a `DoorFailure` case with no words; `Screens/DoorWords.swift` is the one place a case becomes a `Copy` sentence.
- **Release says "not paired"** (§4 S2). `DoorTransports.shipping` is nil outside DEBUG, so `LiveDoor` holds no client and the pairing screen draws `Copy.notPaired`.
- **A 404 on the list goes to Pairing; a 404 on one session goes back to the list** (B, from S3's "goes to Pairing with one line"): the door's 404 does not say why, and the list's read decides. The kept pairing is NOT deleted on a 404, because a door that is quitting answers 404 too.
- **Keychain** (§4 S2 builder A). One generic-password item, `WhenUnlockedThisDeviceOnly`, not synchronizable, written whole or removed whole; a record that does not read back is removed.
- **Words** (§4.0). 55 words in `Copy.swift`: 33 the Mac's (each quoting its module byte for byte), 22 the phone's with a reason. Left out on purpose: the message box, "Open in …", "Enter a code instead", "Select", and the private-network line (false until 316.3).
- **The probe's two channels** (integrator). Whether xcodebuild relays a test runner's stdout AS IT HAPPENS is unmeasured, and P1's Allow is a reaction to a line the UI test prints while it waits. So every line is written unbuffered to stdout AND appended to a scratch file the probe names (`P316_LINES`); each object carries `seq` and is read once from whichever channel brought it first. The file is read with `fs/promises`, never synchronously (pitfall b).
- **The probe's reads bracket the app's** (integrator). The list step prints `list-before`, the probe reads the door, the app pulls to refresh, the app dumps, the probe reads again, so an age that ticks over a minute during the app's read is one of the ages the probe saw. The session is read by the node reader at the moment the app dumps it, not after the run. The list grader follows `Main.html`'s two row shapes (a waiting row `project · question`, every other row `status · project`) and counts `othersOmitted` in the second header.
- **Ignored**: `ios/**/xcuserdata/` and `ios/**/*.xcuserstate` (C's hand-off; Xcode writes them the moment anybody opens the project).

### Commands, as run by the integrator

| Command | Exit | Reading |
| --- | --- | --- |
| `xcodebuild … -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath …/dd-integrator build` (ad hoc, no team) | 0 | 9.4 s; BUILD SUCCEEDED; 0 Swift warnings (one `appintentsmetadataprocessor` note) |
| the same, `build-for-testing`, before and after the two new test files | 0, 0 | TEST BUILD SUCCEEDED both times, 0 Swift warnings; `P316DriveUITests` in the runner and `P316ATSTests` in `TortieTests.xctest` (nm) |
| the same, `-configuration Release build` | 0 | `codesign -dv`: adhoc, `TeamIdentifier=not set`; the built plist holds exactly the one ATS exception; 0 seam strings (row 4) |
| `node build/p316/vectors.mjs --check` | 0 | 0.64 s; 5 signed requests (+1 tampered), 2 pins, 2 seals, 3 QR payloads, 8 answers |
| `npm run -s conformance:ios` | 0 | rules (a) to (j); 19 app files, 14 test files, 39 files under `ios/`; (d) finds three injection reads, all inside `#if DEBUG` |
| `npm run -s ablation:p316` | 0 | 10.8 s; 20 of 20 arms red on their own rule; the clone removed, the tree unmoved |
| the integrator's own ablation: `MotionDebugSeam` out of `#if DEBUG`, in a clone, `conformance-ios.mjs --root` | 1, as it must | (d) red on the declaration (line 268) and the launch-argument read (line 270); clone removed |
| `npm run -s gate:simulator` | 0 | 0.27 s; 2 users against a floor of 2; 8 of 8 bad fixtures, 6 of 6 helper ablations |
| `node build/p311/copy-drift.mjs --self-test` | 0 | 55 words, 33 judged against the Mac (floor 30), 22 the phone's, 3 named controls (floor 3); 33 owned rules matched (floor 33); 24 owed strings printed; 15 mutations red (6 of the mock, 6 of Copy.swift, 3 of the log rule) and the control green. An on-disk ablation (`messages` re-typed as `Message`) went red and `Copy.swift` was restored by sha256 |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 3.5 s; 15 arms serve what they claim; every listener closed |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 9 of 9 dumps graded as they must be, after the two grader changes above |
| `npm run -s typecheck` | 0 | tsc, import boundaries (58 fixtures, the `ios/` wall), no cycles, shared types |
| `node build/assert-hermetic-checks.mjs` | 0 | the sixth type "Xcode and Go harness" |
| `node build/assert-electron-teardown.mjs` | 0 | 152 of 152 (`HELPER_USER_FLOOR` 151 → 152 for `probe-p316.mjs`) |
| `node build/assert-background-teardown.mjs` | 0 | 2 long-lived starts, both ended in a `finally`; 19 of 19 fixtures |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte; no channel moved in 316.2 |
| `node build/assert-known-hosts-scoped.mjs` | 0 | — |
| `npm run -s build` | 0 | 38.8 s; `gate:simulator` and `conformance:ios` ran inside it |
| A's macOS XCTest harness over `ios/Tortie/Door/*.swift` and `ios/TortieTests/Door*.swift`, rerun | 0 | 63 tests, 0 failures (no Simulator, no keychain: `DoorKeychainTests` is iOS only) |
| raw control bytes, over all 60 touched files | — | 0 files; tabs only in `project.pbxproj` (1,872) and `Info.plist` (64), Xcode's own formats, as in `build/entitlements.specstory.plist` |
| end count | — | 0 devices named `p316-`, none booted; no Electron started |

### The seams, read

- `Door/Contract.swift` against `src/shared/ipc/pocket.ts`, field by field: `PocketBlockedRow` 14 of 14, `PocketSessionDetail` 6 more, `OverviewSessionActivity` 9 of 9, `PocketTurn` 11 of 11, the three answers and `{state}` of `/pair` (`server.ts:248`). Every field the contract always sends is required even when it may be null.
- The signing input against `pairing.ts:1401-1411` and `server.ts:235` (`url.pathname + url.search`): seven lines, the method raised, the body's sha256, epoch ms, a 32-hex nonce inside 16 to 64, the binding (HKDF-SHA256 over X25519, salt `<dx>\n<phone xk>`, info `tortie-pocket-bind-v1`); `phoneIdOf` and `pairFingerprint` (`:886-899`).
- The sealed presentation against `openPresentation` (`:1175-1213`): HKDF-SHA256(`ps`, empty salt, `tortie-pocket-pair-v1`), AES-256-GCM, iv 12 and tag 16, `{label, ek, xk}` inside `{iv, ct, tag}`, no `apt`/`ape` (so `presentedPush` answers no push).
- `Copy.swift` against the Mac modules (now `conformance:phonecopy`), and `Tokens.swift` against the first `:root` of `tokens.css` (rule a).
- Every accessibility identifier `probe-p316.mjs` and `P316DriveUITests.swift` read, checked against `Screens/Identifiers.swift` by script: all present.

### Open concerns for the verifiers

1. **Nothing has run on iOS.** Not `test:ios`, not one probe arm, not the Keychain. `DoorKeychainTests` and pairing's `store.save` depend on the Keychain working in a Simulator app signed ad hoc; if it does not, pairing ends `.couldNotSave` and draws "not paired" (row 11 is the likely reason it will work).
2. **The live line.** P1 presses Allow when the UI test prints the fingerprint. If the Simulator's test runner cannot write the `P316_LINES` file AND xcodebuild does not relay stdout live, P1 cannot happen, and the arm reads a list that never came. The probe's report says `lines` per run; a zero there with a nonzero exit is this.
3. **XCUITest and idle.** `-TortieDebugStill` removes the one animation that never ends; `ProgressView` spinners remain (list, conversation paging, the pairing foot). If a tap waits long for idle, the per-step `P316_WAIT_S` absorbs it; if it never returns, that is this concern.
4. **Frames.** The 16 pt gutter, 28 pt headers and 6/16 row padding are from `Pieces.swift`'s `Frame`, and `RaisedLabel`'s accessibility label is the stored word, unraised: both are claims until `L1` reads them. `lineBox` sizes single lines to the mock's line box; the row's hairline sits inside the row's frame (1 pt, within the grader's 1.5 pt).
5. **The unknown-word arms are graded as drawn** (row 7). A verifier who reads §4 S2 literally should attack that ruling rather than the arm.
6. **The mock was edited** (row 10): one sentence of `Pairing.html`. It is the approved screen; he may prefer the phone to say something else, but the phone and the mock now agree and a gate holds both.
7. **Named limits carried from the builders.** Pages whose indexes skip (a gap) are not refused, only ones that go backwards, overlap, repeat or run negative; `.inlineOnly` and `.inlineOnlyPreservingWhitespace` render the same characters on every input B measured, so no characters test tells them apart (a switch to `.full` is caught); removing `allowFailover = false` reddens only rule (c).
8. **The attention dot's pulse under Reduce Motion is untested on a device**, and so is the camera scanner (the Simulator has none; S4 is where it is first used).
9. **`probe:p316` has never run end to end.** Its first run is the verifier's. It needs `out/` (built here at 38.8 s) and the lock, and it takes two `build-for-testing` builds, one Electron, and three Simulators one after another.

### The fix round (one pass, after lens 1 and lens 2 both answered needs_work)

Written by the fixer in `/private/tmp/wt-p316` at `02c6b318`. Nothing was committed, staged or stashed. **No Electron
ran.** The fixer took the lock twice (owner `p316`, released on the same command line both times) to drive the
DEBUG app in Simulators made by `withSimulator`, against `hostile-door.mjs` on loopback, with a scratch driver
that is not a repository file (`scratchpad/p316-2/fixer/fixer-drive.mjs`), and to run `test:ios`. That is the
fixer checking its own fix, **not the reverify**: `probe:p316` against the real door is the reverifier's.

| Finding | Where it was fixed | What changed | What was run |
| --- | --- | --- | --- |
| **Lens 1, major.** The conversation never loaded an older page. The spinner sat on screen and no page was asked for, so a conversation of more than 20 turns showed its newest 20 | `ios/Tortie/Screens/ConversationScreen.swift` | The GeometryReader preference (`TopEdge`, `coordinateSpace`, `onPreferenceChange`) is gone. The spinner now carries `.onScrollVisibilityChange(threshold: 0.01)` (iOS 18.0, inside the 18.1 floor), which calls the unchanged `model.top(visible:)`. `ConversationModel` and `TurnPages` did not change | Honest door, 45 turns, 3 pages: **45 of 45 drawn on iOS 26.3.1 and on 18.3.1**, `/v1/turns` asked 3 times each. At the parent it was 20 of 45 and 1 ask. `pages-backwards`, `pages-overlap`, `more-forever` and `more-negative` each drew `conversation-older-line` = `Copy.earlierTurnsUnreadable` with the turns already read kept above it (26.3; `pages-backwards` on 18.3 too). The app was alive (state 4) in every run |
| Lens 1, major, second half: T1 passed on one page | `build/p316/probe-p316.mjs` D0 and T1 | D0 appends `PLANTED_TURNS` = 41 turns: the `**x**` turn first, which puts it on the OLDEST page, then 40 turns whose answers carry `**n**`. Timestamps are distinct, rising and inside the last minute. T1 now fails when the door holds the conversation on fewer than 2 pages | Not run: T1 needs the Electron. Verifier A's harness planted 47 turns in the same line shape, and the door read 47 |
| **Lens 1, major.** L1 and F1 failed on a list that matches `Main.html` | `build/p316/probe-p316.mjs` `gradeList` and its `--grader-self-test` | The Swift is unchanged, because the layout is right. XCUITest reports a header container by the union of its children, which here is the 15.67 pt text, and a Text by its glyph box. The grader now works from positions. A header is `2 × (next row top − hairline − text centre)` = 28, with the words at x 16. A row's height is `6+22+2+20+6` plus the 1 pt hairline, so 57, or 56 for the very last row. The name's centre is at +17 and the second line's at +40. `rowGap`, `hairline`, `nameLine` and `secondLine` are read from `Main.html` at run time, as the others already were | `--grader-self-test`: 15 dumps. The honest one is verifier A's real iOS 26.3 frames, so a header container drawn as a text-sized box is green. The 24.17 pt gutter, a 30 pt header, a 26 pt header, a name 4 pt low, a second line 3 pt low, a missing hairline, a hairline on the last row and 8/16 padding are each red. **The new grader over verifier A's four REAL list dumps** (`va-run`, `va-run1`, `va-run5` on 26.3, and `va-run3` on 18.3) gave all four GREEN, with headers 28/28, rows 57/57/57/56, dots 16 in, and centres 17 and 40 |
| **Lens 1, minor.** The four list arms served their body on pairing's first signed read, so they only ever drove the pairing screen, and `answerTooLarge` and `answerUnreadable` were never drawn | `build/p316/hostile-door.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `build/p316/probe-p316.mjs`, `ios/Tortie/Style/Copy.swift`, `ios/Tortie/Door/Pairing.swift`, `ios/TortieTests/DoorPairingTests.swift` | `huge-row`, `malformed`, `missing-fields` and `never-completes` are now `list: true`. They answer the FIRST signed `/v1/blocked` honestly (the event carries `honestFirst`) and every later one with their body, so the app pairs and the list's pull to refresh meets the body. The UI test gains a `sentence` step that waits for a sentence, because `never-completes` is said only after the client's 15 s. Every sentence arm names `at` (the element) and `expect` (its `Copy.swift` word), and the probe judges both, keeping the word's name and never its text. **Decision** (the verifier's "decide whether"): a first read that is too large or unreadable still ends pairing as `strangeAnswer` → `pairAnswerUnknown`. The phone is not paired, and the list's words are a paired phone's. `Copy.swift`'s comment and a comment at the mapping now say so | On iOS 26.3.1, each arm drew `list-failure` with 0 rows beside it, after an honest first read: `huge-row` `answerTooLarge` (also on 18.3.1), `malformed` `answerUnreadable`, `missing-fields` `answerUnreadable`, `never-completes` `macDidNotAnswer`. New XCTest `testAFirstReadThatCannotBeReadEndsItUnpaired`, over 4 failures after `allowed`: green, and red when `.tooLarge` was mapped to `.unreachable` in a clone. `hostile-door.mjs --self-test`: 15 of 15, and the list arms read honestly first |
| Found while fixing: `more-negative` could never go below zero for the app | `build/p316/hostile-door.mjs` | The arm cut each page to the honest page's length, so an app asking 20 at a time reached index 0 and stopped quietly with no sentence. Every page is now the `limit` asked for, so the page below index 20 runs from −15 to 4 | 40 turns drawn, then refused with `earlierTurnsUnreadable`. The self-test pages it at 7 and again at the app's 20: 39 and 75 turns below zero |
| Lens 1, nit: the `-L gmux` guard can raise a false alarm during a 17-minute run | `build/p316/probe-p316.mjs` header | One sentence: run it while he is not creating or ending sessions. `build/electron-run.mjs` is unchanged | — |

**Not fixed, and why.**
- **Lens 2, major: the Method B lens was never carried out.** That is a missing verification, not a defect in the
  code. It cannot be fixed by the fixer, whose runs are not proof. The reverifier must run the hostile arms
  itself, with `conformance:ios`, `ablation:p316` and the grep sweep.
- **Lens 2, minor: two `npm run build` runs racing in one `out/`.** This is a workflow matter and no code
  changed. This round ran exactly one build.
- **Lens 1, nit: one CDP pocket call stalled 90 s after Remove.** It did not reproduce. It is recorded here and
  nothing changed.

**Nothing regressed for a person who never pairs.** No file under `src/` changed. The Swift change touches one
view's paging trigger, and the rest is probe, door, test and comment text.

**Commands this round, with exit codes.**

| Command | Exit | Reading |
| --- | --- | --- |
| `xcodebuild … build-for-testing` (Simulator SDK, ad hoc, no team, `dd-fixer`), twice | 0, 0 | TEST BUILD SUCCEEDED; 0 Swift warnings |
| builder A's macOS XCTest harness over `Door/*.swift` and `Door*Tests.swift` | 0 | 64 tests, 0 failures (was 63); the ablation clone exited 1 on the new test |
| `node fixer-drive.mjs run 26.3 honest,pages-backwards,pages-overlap,more-forever,more-negative,huge-row,malformed,missing-fields,never-completes` (lock) | 0 | 9 of 9; 322 s; the device shut down and deleted; 0 `p316-` left |
| `node fixer-drive.mjs run 18.3 honest,pages-backwards,huge-row` (lock) | 0 | 3 of 3; 141 s; 0 `p316-` left |
| `P316_DERIVED_DATA=…/dd-fixer npm run -s test:ios` (lock, iOS 26.3.1) | 0 | 144 tests, 0 failures, 1 skipped (ATS), 35.4 s |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 15 of 15 |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 15 of 15, 3.7 s |
| `node build/p316/vectors.mjs --check` | 0 | 5 signed requests (+1 tampered), 2 pins, 2 seals, 3 QR payloads, 8 answers |
| `npm run -s conformance:ios` | 0 | 10 rules; 19 app files, 14 test files, 39 files under `ios/` |
| `npm run -s ablation:p316` | 0 | 20 of 20 red, 19 s |
| `npm run -s gate:simulator` | 0 | 2 users, floor 2 |
| `node build/p311/copy-drift.mjs --self-test` | 0 | phonecopy OK |
| `node build/assert-hermetic-checks.mjs`, `assert-electron-teardown.mjs`, `assert-background-teardown.mjs`, `assert-import-boundaries.mjs`, `assert-known-hosts-scoped.mjs`, `contract-inventory.mjs --check` | 0 each | 152 of 152 (floor unchanged: no new script reaches `electron-run.mjs`); contract byte for byte |
| `npm run -s typecheck` | 0 | — |
| `npm run -s build` | 0 | 61 s; `gate:simulator` and `conformance:ios` inside it |
| raw control bytes over the 8 files this round touched | — | 0 |

**For the reverifier.** Re-run `probe:p316` whole. L1, F1, T1 (now at least 3 pages), H honest and the four
paging arms must be green, and the four list arms must name `list-failure` and their `Copy` word. Then run the
Method B lens that lens 2 never ran.

### The overflow round (his ruling of 2026-09-23: "Yes, fix and land.")

Written by the fixer in `/private/tmp/wt-p316` at `02c6b318`. Nothing was committed, staged or stashed. **No Electron
ran.** The fixer took the lock four times (owner `p316`, released on the same command line every time) for
`test:ios` on both runtimes and for the reverifier's own overflow arms. No Mac code moved and nothing of S3.

The reverify found two things that ended the app, with checked-in code, on both runtimes: `othersOmitted = Int.max`
on the list's refresh (`ListScreen.swift:88`, `others.count + max(0, answer.othersOmitted)`), and
`userMessages = Int.max` on opening a session (`ActivityCells.swift:74`, `counts.user + replies`). Swift's `+` on an
`Int` traps on overflow, and a trap ends the app.

#### Every whole number the door sends, and what is done with it

| Number | Where the app uses it | Before | Now |
| --- | --- | --- | --- |
| `othersOmitted` | the second header's count; `> 0`; `Copy.othersOmitted` (`String(n)`) | `others.count + max(0, n)`: a trap at `Int.max`; a negative count drawn as none | `DoorNumber.sum(others.count, n)`; nil throws `DoorFailure.malformed`, drawn as `Copy.answerUnreadable` |
| `userMessages`, `agentMessages` | the Messages cell's total, the Last message cell's "anything said"; `grouped(n)`, `String(n)`, `== 0` | `counts.user + replies` and `counts.user + $0`: traps at `Int.max + 1` and `Int.min + -1`; `-1` drawn as `-1` | `counts` refuses a count outside the bound and `together` takes the sum through `DoorNumber.sum`; both cells THROW, `SessionDrawing.init` throws, `SessionModel` draws `Copy.answerUnreadable` |
| `index` (a turn's) | `TurnPages`: comparisons, `olderBound`, the refresh's "turn after the newest held"; identifiers (`String(index)`); `&to=` in the page request | `heldLast.index + 1`: a trap once a page holding `Int.max` was held; `first.index - 1` (guarded `> 0`, could not trap) | `DoorNumber.sum(heldLast.index, 1)` and `DoorNumber.difference(first.index, 1)`; `check` refuses any index outside the bound, so a page holding one is refused |
| `turnCount` | decoded, never used in arithmetic | — | decoded through the bound |
| Epoch milliseconds (`at`, `blockedSince`, `lastMessageAt`, `readAt`, the QR's `exp`) | `/ 1000` into a `Date`, then formatted | Doubles, which never trap | Unchanged. Measured on macOS: `Date(timeIntervalSince1970:)` of ±1.797e308 ms and ±9.3e18 formats without a trap (an absurd clock is drawn). Named here as a limit; not an integer |
| `Content-Length` (`expectedContentLength`, `Int64`) | compared with the 2 MiB cap | compare only | Unchanged |
| The QR's `port` and `v` | range and equality checks; `UInt16(clamping:)` | compare only | Unchanged |

Searched by grep over `ios/Tortie/` for `+`, `-`, `*`, `/`, `%`, their compound forms, `Int(`, `Int64(`, `UInt`,
`...`, `..<`, `.count` and subscripts. No range, subscript, `Int(…)` of a Double, `abs`, `prefix(n)` or
`repeating:count:` takes a door number.

**THE BOUND.** Every whole number the contract carries is a count or an index, and main writes it with
`JSON.stringify` from a JavaScript number, so the largest it can write exactly is `Number.MAX_SAFE_INTEGER`,
9,007,199,254,740,991. `DoorNumber.largest` is that number, and `conformance:ios` compares the line with JavaScript's
own constant rather than a second copy. A number outside `0...largest` refuses the WHOLE answer at decode
(`KeyedDecodingContainer.doorNumber(forKey:)` and `nullableDoorNumber(forKey:)`, `Door/Contract.swift:57-69`),
exactly as a missing field does, so the existing `DoorFailure.malformed` path draws the existing sentence. The same
bound is asked again at every site, so a value that reaches a screen another way (a test, a later decoder) is refused
there too. **One behaviour changed on purpose:** a negative `othersOmitted` was drawn as "none" (`max(0, n)`); it is
now an unreadable answer, because no count is negative and main never sends one (`routes.ts:486`).

**THE ONE CHECKED HELPER.** `enum DoorNumber` (`Door/Contract.swift:101`): `isCount`, `sum` with
`addingReportingOverflow`, `difference` with `subtractingReportingOverflow`, each answering nil when an operand is
outside the bound or the result overflows (and `difference` when it goes below zero). Inside the bound no sum can
overflow (2 × largest is 2^54 − 2); the reporting forms are there so the property is local to the helper rather than
depending on the decoder.

**WHAT AN OVERFLOW DRAWS.** The screen's existing unreadable sentence, from `Copy.swift`:

| Where | Sentence |
| --- | --- |
| the list (refresh, or the pairing's first read adopted) | `list-failure` = `Copy.answerUnreadable`, no row beside it |
| one session | `session-failure` = `Copy.answerUnreadable`, no cell beside it |
| the newest page of a conversation | `conversation-failure` = `Copy.answerUnreadable` |
| an older page | `conversation-older-line` = `Copy.earlierTurnsUnreadable`, the turns already read kept (the existing line for a refused older page) |
| pairing's first signed read | `Copy.pairAnswerUnknown`, nothing kept (the decision the first fix round recorded for an unreadable first read) |

#### What changed

| File | Change |
| --- | --- |
| `ios/Tortie/Door/Contract.swift` | `doorNumber(forKey:)`, `nullableDoorNumber(forKey:)`, `enum DoorNumber`; the five whole-number fields decoded through them; `TurnPages.check` refuses an index outside the bound; `olderBound` and `acceptNewest` take their difference and sum through `DoorNumber` (the refresh's "start again" moved into `startAgain(from:)`, same behaviour) |
| `ios/Tortie/Screens/ListScreen.swift` | the second header's count through `DoorNumber.sum`; nil throws `DoorFailure.malformed` |
| `ios/Tortie/Screens/ActivityCells.swift` | `counts` refuses a count outside the bound; `together` sums through `DoorNumber.sum`; `messages` and `lastMessage` throw |
| `ios/Tortie/Screens/SessionScreen.swift` | `SessionDrawing.init` throws; `SessionModel.load` draws `Copy.answerUnreadable` when it does |
| `ios/TortieTests/DoorContractTests.swift` | `testAWholeNumberNoDoorCouldSendRefusesTheAnswer`, `testTheCheckedArithmeticNeverTraps`, `testAnIndexNoDoorCouldSendIsRefused` |
| `ios/TortieTests/ScreensDrawingTests.swift` | `testAnOmittedCountNoDoorCouldSendIsUnreadable`, `testCountsNoDoorCouldSendAreUnreadable`; the existing cell and session tests take `try` |
| `ios/TortieTests/ScreensModelTests.swift` | `testAnOmittedCountNoDoorCouldSendIsOneSentence`, `testCountsNoDoorCouldSendAreOneSentence`, `testAnIndexNoDoorCouldSendIsOneSentence` |
| `build/conformance-ios.mjs` | rule (k); the lexer records where each interpolation's code sits (`holes`), which only (k) reads |
| `build/p316/ablation-ios.mjs` | arms `k1` to `k5`; every rule (a) to (k) must be proved |
| `build/p316/probe-p316.mjs` | `gradeList` measures the right gutter; two self-test dumps at 24 pt |
| `build/verification-checks.mjs` | the comment on `conformance:ios` and `ablation:p316` names (k) and 25 plants; no classification moved |

#### The XCTest rows, per site, with `Int.max`, `Int.min` and `-1`

| Site | Test | Values | Must |
| --- | --- | --- | --- |
| decode, all five fields | `testAWholeNumberNoDoorCouldSendRefusesTheAnswer` | `Int.max`, `Int.min`, `-1`, `2^53` as JSON digits; controls `0`, `3`, `2^53 − 1`, `null` | refuse the whole answer for each field; decode each control |
| `DoorNumber` | `testTheCheckedArithmeticNeverTraps` | `Int.max`, `Int.min`, `-1`, `2^53` as either operand of `sum` and `difference`; the bound itself | nil, never a trap; `largest + largest` sums |
| the list's sum | `testAnOmittedCountNoDoorCouldSendIsUnreadable`, `testAnOmittedCountNoDoorCouldSendIsOneSentence` | `Int.max`, `Int.min`, `-1`, `2^53`, with and without rows; the adopted first read | `DoorFailure.malformed`; `ListModel` state `.failed(Copy.answerUnreadable)`; no route to pairing; the bound itself drawn |
| the session's sums | `testCountsNoDoorCouldSendAreUnreadable`, `testCountsNoDoorCouldSendAreOneSentence` | eleven pairs of `Int.max`, `Int.min`, `-1`, `2^53` and nil, `complete` and `partial` | both cells throw `.malformed`; `SessionDrawing` throws; `SessionModel` `.failed(Copy.answerUnreadable)`; two counts at the bound drawn |
| the paging sum and difference | `testAnIndexNoDoorCouldSendIsRefused`, `testAnIndexNoDoorCouldSendIsOneSentence` | `Int.max`, `Int.min`, `-1`, `2^53` on the newest page, an older page and a refresh; the bound itself | refused, nothing kept, paging stopped; the newest page `Copy.answerUnreadable`, an older page `Copy.earlierTurnsUnreadable` with `[4, 5]` kept; a refresh at the bound keeps the older turns |

The Door rows were proved able to fail: in a scratch clone with the two bound checks in the decoders and the one in
`TurnPages.check` taken out, the macOS XCTest harness exited 1 with `testAWholeNumberNoDoorCouldSendRefusesTheAnswer`
and `testAnIndexNoDoorCouldSendIsRefused` red on every out-of-bound value; the clone was removed.

#### `conformance:ios` rule (k), and why it names every operator

Text cannot follow a value. The session's trap was `counts.user + replies`: `counts` is a tuple a helper built from
`userMessages`, and `replies` was bound from it, so no door field is written on the line that trapped. A rule that
looked for door fields next to a `+` passes that defect. So (k) reads it the other way round, and that is what can be
read honestly as text:

- (k1) every whole-number field of the door's answers (`let x: Int` / `Int?` in `Contract.swift`) is assigned from
  `doorNumber(` or `nullableDoorNumber(`, each of which asks `DoorNumber.isCount`; no `Int.self` (or `Int64.self`, …)
  is decoded in `Contract.swift` anywhere else; the fields are DERIVED from those assignments (5, floor 5);
- (k2) `DoorNumber` is declared once, holds no arithmetic operator of its own, calls `addingReportingOverflow` and
  `subtractingReportingOverflow`, and its `largest` is `Number.MAX_SAFE_INTEGER` as node reads it;
- (k3) EVERY arithmetic operator in `ios/Tortie/` (`+ - * / %`, the compound and wrapping forms, a prefix `-` on
  anything but a literal, inside `\(…)` interpolations too) is proved off the integers by its own text (an operand
  that is a string literal, `String(…)`, `Double(…)`/`Float(…)`/`CGFloat(…)`, a `static let NAME = "…"` constant, a
  floating literal, or two integer literals), or NAMED in `ARITHMETIC_NAMED` by file and line with how many
  operators the line holds and why; each entry must match exactly that many, so the table can neither rot nor wave a
  new operator through; and an operand naming a door field as a member (or bare, inside the contract) is red whatever
  the table says.

At this tree: 77 operators in 19 files, 42 proved by their text, 35 named in 32 entries, none on a door number.
Twenty-three new scanner fixtures prove (k) before any file is read, including both shipped defects, an alias, an
interpolation, a named line that grew an operator, a stale entry, and a door field a named line tries to launder.

**Measured at the parent.** The four app files were rebuilt in a scratch clone from this round's edits in reverse,
and their sha256 matched the pre-fix digests recorded before the first edit (`Contract.swift` `a1f22bb4…`,
`ListScreen.swift` `07bc1220…`, `ActivityCells.swift` `0c9602f9…`, `SessionScreen.swift` `f4a797a4…`). The new gate
over that clone (`--root`) exited 1 with (k) red on 19 findings: `ListScreen.swift:88`, `ActivityCells.swift:74` and
`:114`, `Contract.swift:416` and `:431`, the five unbounded `Int.self` decodes, the five unbounded fields, no bounded
decoder and no helper. The clone was removed.

**What (k) does not read**, stated rather than claimed away: a range over a door number (`a...b` traps when a > b), a
subscript, `Int(…)` of a Double, `abs`, `prefix(n)`. None exists in the app today (the audit above), and the decode
bound keeps every door number a non-negative count.

`ablation:p316`: 25 of 25 arms red on the rule that owns them, 12.5 s. `k1` puts the list's trap back as it shipped,
`k2` the session's (`counts.user + replies`, the alias), `k3` takes the paging sum bare, `k4` decodes
`othersOmitted` with no bound, `k5` makes the helper add bare; each reddened (k) and nothing else.

#### Item 2: the right gutter

`gradeList` now measures each row's right gutter: the window's width less the rightmost of the row's parts (dot,
name, machine badge, age, second line), which is the age. The row's own frame spans the window because the whole row
is the tap target, so its words, not its frame, are what the mock's `.row { padding: 6px 16px }` places 16 pt in. A
row with no age is a problem by name. The frames report carries `rightGutter`. Two self-test dumps: every row's
words ending 24 pt from the edge, and one row only; both red, 17 of 17 graded as they must be. Over verifier A's four
REAL list dumps (three on iOS 26.3, one on 18.3, the real door) every row reads `rightGutter` 16 and all four stay
green. The reverifier's own paging arm read `lineRight` 16/16/16 on both runtimes against this build.

#### The reverifier's own overflow arms, against this build

The reverifier's door (`rv/rv-door.mjs`, unchanged) and a copy of its driver (`fx/rv-drive-fx.mjs`: derived data
`dd-fixer2`, outputs in `fx/rv-out`, and STRICTER graders for the two overflow arms, which must now draw
`Copy.answerUnreadable` with the app alive, not merely stay alive). The door answers `othersOmitted`
`9223372036854775807` on the list's refresh, and `userMessages` `9223372036854775807` with `agentMessages` 1 on
`/v1/session`, as the digits the reverifier wrote.

| Runtime | Arm | App state at the end | Drawn | Beside it | Hostile answers served |
| --- | --- | --- | --- | --- | --- |
| iOS 26.3.1 | `list-overflow` | 4 (running, foreground) | `list-failure` = `Copy.answerUnreadable` | 0 rows, no second header | 1 |
| iOS 26.3.1 | `session-overflow` | 4 | `session-failure` = `Copy.answerUnreadable` (the `session` dump, not `session-missing`) | no Messages cell | 1 |
| iOS 18.3.1 | `list-overflow` | 4 | `list-failure` = `Copy.answerUnreadable` | 0 rows, no second header | 1 |
| iOS 18.3.1 | `session-overflow` | 4 | `session-failure` = `Copy.answerUnreadable` | no Messages cell | 1 |

At the parent the same four read state 1 (not running) with nothing drawn (`rv/results-263-38143.json`,
`rv/results-183-91041.json`).

Controls, all PASS: `paging` on both runtimes (57 of 57 turns paged to the first, the list's frames
28/28 and 57/57/56 with 16 pt on both sides, and the session's Messages cell `113`, `57 you · 56 agent`, taken
through the checked sum from the real door's answer); and, in a third run, `older-negative`, `older-backwards` and
`list-malformed` on 26.3 (a negative index is now refused at decode rather than by `check`, and still draws `Copy.earlierTurnsUnreadable`
with the turns read kept).

#### Commands this round, with exit codes

| Command | Exit | Reading |
| --- | --- | --- |
| `swift dates.swift` (scratch; `Date` of ±1.797e308, ±9.3e18, 1e300, 0 ms, formatted two ways) | 0 | no trap on any |
| builder A's macOS XCTest harness over `Door/*.swift` and `Door*Tests.swift` | 0 | 67 tests, 0 failures (was 64) |
| the same over a clone with the three bound checks taken out | 1, as it must | the two new Door rows red on every out-of-bound value |
| `xcodebuild build-for-testing` (Simulator SDK, ad hoc, no team, `dd-fixer2`, no device) | 0 | TEST BUILD SUCCEEDED, 11.9 s, 0 warnings, 0 errors |
| `npm run -s conformance:ios` | 0 | 11 rules; (k): 5 door numbers bounded, 77 operators, 42 proved, 35 named in 32 entries |
| `node build/conformance-ios.mjs --root <parent clone>` | 1, as it must | (k) red, 19 findings |
| `npm run -s ablation:p316` | 0 | 25 of 25 arms red on their own rule, the clone removed, the tree unmoved |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 17 of 17 |
| the grader over verifier A's four real list dumps | 0 | 4 green, `rightGutter` 16 on every row |
| `node build/p316/vectors.mjs --check` | 0 | 5 signed requests (+1 tampered), 2 pins, 2 seals, 3 QR payloads, 8 answers |
| `npm run -s typecheck` | 0 | — |
| `assert-simulator-teardown`, `assert-hermetic-checks` (twice, the second after the comment edit), `assert-electron-teardown`, `assert-background-teardown`, `contract-inventory --check`, `assert-import-boundaries`, `assert-known-hosts-scoped`, `copy-drift --self-test`, `hostile-door --self-test` | 0 each | floors unchanged (152 Electron users, 2 Simulator users); contract byte for byte |
| `P316_DERIVED_DATA=…/dd-fixer2 npm run -s test:ios` (lock, iOS 26.3.1) | 0 | 152 tests, 0 failures, 1 skipped (ATS), 32.2 s |
| the same with `P316_RUNTIME=18.3` (lock) | 0 | 152 tests, 0 failures, 1 skipped, 29.9 s |
| `node fx/rv-drive-fx.mjs 26.3 list-overflow,session-overflow,paging` (lock) | 0 | 3 of 3, 130 s; the device shut down and deleted |
| `node fx/rv-drive-fx.mjs 18.3 list-overflow,session-overflow,paging` (lock) | 0 | 3 of 3, 110 s; the device shut down and deleted |
| `node fx/rv-drive-fx.mjs 26.3 older-negative,older-backwards,list-malformed` (lock) | 0 | 3 of 3, 122 s |
| raw control bytes over the 11 files this round touched | — | 0 |
| end count | — | 0 devices named `p316-`, 0 booted, the lock released; no Electron started by this round |

**Not done, and why.** `probe:p316` was not re-run (it needs the Electron; the only probe change is the grader's
right gutter, proved above on real dumps). `hostile-door.mjs` gained no overflow arm, because the ruling named the
XCTest rows and the gate; the reverifier's own door carried the live arms. `npm run -s build` was not run, so that no
second build races in `out/`; the two gates it runs for the phone (`conformance:ios`, `gate:simulator`) were run
directly. The gate index in `CLAUDE.md` still describes `conformance:ios` as "rules a to j" with "20 plants"; it is
now (a) to (k) with 25, and that row is left for the main session to change. An absurd epoch (±1e308 ms) is drawn
as a nonsense clock rather than refused; it cannot trap, and it is not an integer.
