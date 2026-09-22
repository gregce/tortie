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
- no alerts (S5);
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
