# 128. The phone before any Swift: what it costs, whether it is legal, and how it reaches him

Phase 315. Written 2026-09-21 against the tree at `a31999fc` ("docs(backlog): the phone, queued as seven
phases, with its screens in the tree"). Nothing was installed, enrolled, minted, signed into, booted or run:
every Apple and Tailscale claim is a quotation from a published page with the URL and the date read, every
repository claim is from a named file at `main` on the day, and Tortie and Superset were read from disk with
nothing executed. No Tailscale command was run and his admin console was not opened, so nothing here names a
device of his. No secret was found, read or written in any tree. Four investigators answered four disjoint
questions, two adversaries tried to refute them before a word of this was written, and a judge ruled on every
disagreement; §6 records what the attack killed so no later round re-derives it.

This answers the operator's own question of 2026-09-21, in his words: *"i would want to embed tailscale
because it should be -- download Tortie phone app and it works"*. That sentence moved research 127 §2's
recommendation from "the Tailscale app plus Tortie's door" to a tailnet node inside the Tortie app, and §8 of
that document said plainly that two things rode with the choice and neither was measured. This phase measures
those two, plus two more an adversary's re-cut of the plan found: whether an embedded userspace node needs an
Apple entitlement on iOS, whether Tortie may hold a Tailscale API credential to mint the pairing key, what
App Review makes of an app that controls a computer, and what it takes to put the app on **his own** phone as
against anyone else's. It ships before any Swift and it is allowed to change Phase 316; §8 is that change,
item by item.

## 1. The answer first

**Phase 316 keeps its shape.** No Apple entitlement is required for an app-private userspace tailnet node on
iOS, so research 127 §2's row 2 stands, the embedded node is the design, the door does not change, the
pairing QR still carries three things and four screens is still four screens; the $99 is already paid and one
membership covers the iPhone as well as the Mac, so there is no D-U-N-S number, no organisation enrolment and
no lead time; and because the app goes to his own phone and not to the store, the rejection Superset got does
not reach it. Three things changed. **The first nobody asked:** a phone joined to his tailnet reaches every
device on his tailnet, because Tailscale's default policy is `src: ["*"], dst: ["*:*"]`, so "download and it
works" today also means the phone can open any port on anything he owns — fixable by one rule he pastes into
his own admin console, enforced by Tailscale on every device rather than by Tortie's manners, and Tortie will
never hold the credential that could edit that policy. **The second:** Tortie holds no Tailscale API
credential, because the OAuth client secret *is* a reusable pre-approved auth key that never expires until
revoked by hand and it would sit on the machine that runs all his agents; instead he mints one one-off,
pre-approved, tagged, **not ephemeral** key by hand per phone install and pastes it into the Mac's pairing
sheet, which leaves the phone experience exactly as he described it — download, scan, in — and costs a second
hand-minted key on the rare reinstall. **The third:** the internal TestFlight build he asked for costs a
little more than nothing — an App Store Connect app record, an export-compliance determination that is his
and not an agent's, and a build that expires after 90 days — none of which is review, a product page or
waiting. And one measurement must be taken in 316's first hour, before item 4's Info.plist rules can be
written at all: whether the phone can open a connection to Tortie's own self-signed certificate under App
Transport Security, which Tailscale's own iOS example ships an exception for, and which one `xcodebuild` and
one Simulator run settles in minutes.

## 2. The entitlement

**No Apple entitlement is required for an app-private userspace tsnet node on iOS — and no Apple page says
so, because no Apple page addresses it.** That is the honest form and the document keeps it. What is measured
is an ABSENCE in Apple's catalog plus two existence proofs; two independent searches of developer.apple.com
found no Apple statement about a userspace network stack in either direction. Practically the answer is no,
and Phase 316 proceeds on it.

| # | The support | Read |
| --- | --- | --- |
| i | `com.apple.developer.networking.networkextension` ("The APIs an app can use to customize networking features", iOS 9.0+) has twelve values and every one is a provider the system runs for other apps or the whole device: `dns-proxy`, `app-proxy-provider`, `content-filter-provider`, `packet-tunnel-provider`, the four `-systemextension` variants, `dns-settings`, `app-push-provider`, `relay`, `url-filter-provider`. **None describes an app opening its own sockets.** Read independently by an investigator and an adversary, same result | Apple's DocC JSON for that key, 2026-09-21 |
| ii | `com.apple.security.network.client` and `.server` are **macOS 10.7+** App Sandbox keys by their own pages, with no iOS counterpart. **On iOS there is nothing to declare** | Apple, 2026-09-21 |
| iii | `tailscale/aperture-plus` (owner login `tailscale`, type `Organization`, public) sets `CODE_SIGN_ENTITLEMENTS` twice in its 31,526-byte `project.pbxproj`, lines 442 and 484, both `MacApp/ApertureMac.entitlements` — four App Sandbox keys, no NetworkExtension, no VPN. The iOS configurations carry no entitlements key and no iOS entitlements file exists. Its `README.testflight.md` records a completed App Store Connect pipeline whose IPA carries only `get-task-allow=false` and `beta-reports-active=true`, the automatic TestFlight pair | GitHub, 2026-09-21 |
| iv | NovaScale, Built for Tailscale (GalaxNet Ltd., Utilities, iOS 15.0+, 85.8 MB, v1.6.0): *"Access your Tailscale network directly from your device - no VPN permission required."* **Marketing copy, not an entitlement measurement** — its IPA was not fetched — but a review-outcome data point: App Review accepted a Utilities app whose page claims a tailnet with no VPN permission | https://apps.apple.com/us/app/id6749938291, 2026-09-21 |

**The one request-gated networking capability is multicast, and Tortie does not ask for it.**
`com.apple.developer.networking.multicast`: *"This entitlement requires permission from Apple before you can
use it in your app"* (iOS 14.0+, https://developer.apple.com/contact/request/networking-multicast, read
2026-09-21). `tsnet` compiles a port mapper in and UPnP discovery is SSDP multicast, but a multicast send
without the entitlement fails and does not crash; NAT-PMP and PCP are unicast to the gateway and DERP and
STUN reach public addresses. Asking Apple's permission for a capability the design does not need is a
reviewer question volunteered for nothing, and the cost is that UPnP port mapping is unavailable, which can
mean a relayed path instead of a direct one — research 28's 150–400 ms band, which four screens do not feel.
One correction the adversary forced: "Aperture declares no entitlements and functions" is not a proof,
because nothing was run; the ruling stands on the request sentence instead.

**There IS an entitlements file on the iOS target, and the rule is about KEYS.** Apple's `aps-environment`
page (https://developer.apple.com/documentation/bundleresources/entitlements/aps-environment, read
2026-09-21): *"To add this entitlement to your app, enable the Push Notifications capability in Xcode"*,
values `development` and `production`. Phase 316 item 8 ships push, so the target must carry one. Tailscale's
own reference project carries one too: `TailscaleKitHello`'s iOS configurations (lines 431 and 466 of its
`project.pbxproj`, read 2026-09-21) set `CODE_SIGN_ENTITLEMENTS =
HelloFromTailscale/HelloFromTailscale.entitlements`, holding only macOS App Sandbox keys. So
`conformance:ios` asserts **no key** under `com.apple.developer.networking.*`, no
`com.apple.developer.networking.vpn.api`, and no `NEVPNManager`, `NEPacketTunnelProvider` or
`NETunnelProvider*` symbol and no VPN string anywhere in the Swift. This repository's own analogy argues for
exactly that shape: `build/entitlements.mac.plist` is a file that EXISTS and omits one key on purpose.

**App Transport Security is the one thing that could still stop the door, and it is unmeasured.** Research
127 §5's door terminates its own TLS with a sealed key and the app pins the fingerprint from the QR. Apple's
*Performing Manual Server Trust Authentication* (read 2026-09-21,
https://developer.apple.com/documentation/foundation/performing-manual-server-trust-authentication) says
both of these on one page: *"You cannot loosen server trust requirements for an ATS-protected domain, but
you can tighten them, using the manual evaluation technique shown in this article"*, and, as its own use
case, *"your app makes a secure connection to a development server that uses a self-signed certificate,
which would ordinarily not match anything in the system's trust store."* Those two sentences are in tension,
and research 127 §5 cites the second as its precedent. Tailscale ships the exception rather than relying on
it: `swift/Examples/TailscaleKitHello/HelloFromTailscale/Info_iOS.plist` (read in full, 2026-09-21) is
nothing but `NSAppTransportSecurity` → `NSExceptionDomains` → `ts.net` → `NSExceptionAllowsInsecureHTTPLoads`
true, `NSIncludesSubdomains` true, with **no** `NSAllowsArbitraryLoads`. **So "connect by MagicDNS name and
no ATS key is needed" is not established** and item 4 may not assert it. The phase chooses in the open
between a narrowly scoped `NSExceptionDomains` entry for the tailnet domain only and no `URLSession` on the
door path; `NSAllowsArbitraryLoads` is refused either way, because it is a blanket key a reviewer asks about
and Tortie's door is one pinned name. One `xcodebuild` and one Simulator run answers it.

**The privacy manifest is an upload rejection no green build predicts, and it is not fixed upstream today.**
Apple (https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api, read
2026-09-21): *"Starting May 1, 2024, apps that don't describe their use of required reason API in their
privacy manifest file aren't accepted by App Store Connect"*, and the obligation is per executable or dynamic
library, not per app. `tailscale/libtailscale` at `main` holds **no `PrivacyInfo.xcprivacy` anywhere in its
137 paths** (GitHub trees API, truncated false, read 2026-09-21), and PR #57, "swift: make the built
xcframework distributable to the App Store", is still **OPEN** (`merged_at: null`, created 2026-08-26,
updated 2026-08-31). Its body carries the error verbatim — `ITMS-91053: Missing API declaration`, "Nothing
surfaces at build time; the first signal is a rejection email minutes after submission" — and a second
failure mode that raises the cost: error `90238`, because the manifest must sit inside the framework's sealed
`Versions/A/Resources` and the target re-signs after injecting. **Injecting a manifest is a signing step, not
a file copy.** Whether an all-empty manifest is *accurate* for an embedded Go runtime calling file-timestamp
APIs stays flagged in §7. Good news, measured: Apple's third-party SDK list
(https://developer.apple.com/support/third-party-SDK-requirements/, 86 SDKs needing a manifest and a
signature, read 2026-09-21) names Tailscale, libtailscale, TailscaleKit and WireGuard nowhere — while
**Capacitor, Flutter and hermes are all on it**, so research 127 §5's routes 2, 3 and 4 each import an SDK
with the stricter obligation and route 1 imports none.

**Local network privacy is a usage string and a prompt, never an entitlement.** Apple TN3179, *Understanding
local network privacy* (read 2026-09-21): *"A local network is an IP network associated with a
broadcast-capable network interface. Such interfaces include Wi-Fi and Ethernet, but not cellular (WWAN) or
VPN"*, and its table makes **sending a UDP unicast** a local-network operation. A userspace node creates no
VPN interface, so magicsock's direct path to a Mac on the same Wi-Fi is a UDP unicast on Wi-Fi and iOS
prompts. `NSLocalNetworkUsageDescription` is one honest sentence in Info.plist, and denial degrades to DERP
rather than breaking. Tailscale's own Aperture omits it — its 837-byte `Info.plist` was read in full — which
is why its users get an unexplained prompt.

**No background mode for the node, ever.** Guideline 2.5.4
(https://developer.apple.com/app-store/review/guidelines/, read 2026-09-21): *"Multitasking apps may only use
background services for their intended purposes: VoIP, audio playback, location, task completion, local
notifications, etc."* A tailnet node is none of those, so the node is up while the app is up and the phone
learns things while closed only through APNs, which is already research 127 §6's design. Named so no later
round proposes a background mode to keep the tunnel warm.

**Guideline 5.4 is what the userspace node keeps Tortie out of.** Apple's own UK PDF of the guidelines
(https://developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf,
read 2026-09-21), first sentence of 5.4: *"Apps offering VPN services must utilise the NEVPNManager API and
may only be offered by developers enrolled as an organisation."* Had question (a) come back "entitlement
required", the app would be creating a tunnel, 5.4 would become arguable and Individual enrolment would stop
being available, which would have collapsed §5's cheap path. It did not. The product page must never call the
app a VPN, and `conformance:ios`'s fourth text rule is the cheap Node-only guard that keeps it that way.

**And one cost that is not about entitlements at all: Go joins Xcode on the bench.**
`TailscaleKit.xcframework` is not published as a binary — `aperture-plus`'s README says it "is **not checked
into git** — it's built from the `libtailscale` submodule", needing **Go 1.26.5**, and
`libtailscale/swift/README.md` gives `make ios` / `ios-sim` / `ios-fat` from `/swift` with Xcode 16.1 or
newer, adding that the separated `ios` framework "is free of any simulator segments and is suitable for
app-store submissions" (both read 2026-09-21). So Phase 316's sixth check type is an **Xcode AND Go
harness**. Both toolchains are on his machine and on no CI runner this repository configures, and committing
a prebuilt xcframework would be a third-party binary blob in git and a worse answer.

## 3. The tailnet credential, and what a phone on his tailnet can reach

### 3.1 The reach, which nobody asked and which is the biggest finding of the round

**A phone joined to his tailnet reaches every device on it, today, and that is the tailnet's default rather
than anything Tortie does.** Tailscale's shipped default policy is `{"action":"accept","src":["*"],
"dst":["*:*"]}` (https://tailscale.com/kb/1192/acl-samples, read 2026-09-21); `*` is *"All traffic
originating from Tailscale devices in your tailnet, any approved subnets and `autogroup:shared`"*
(https://tailscale.com/docs/reference/syntax/policy-file); and *"Omitting the `acls` field ... is not the
equivalent of a 'deny all' policy."* So "download the Tortie phone app and it works" does, today, also mean
the phone can open any port on his Mac Pro, his NAS and everything else he owns.

**It is fixable, and Tailscale enforces the fix rather than Tortie's manners.**
https://tailscale.com/kb/1018/acls (read 2026-09-21): *"A device enforces incoming connections based on the
access rules distributed to all devices in your tailnet. Rule enforcement happens on each device directly,
without further involvement from Tailscale's coordination server."* The grant is one rule — `"src":
["tag:tortie-phone"]`, `"dst": ["<mac>:<door port>"]` — and Tailscale's samples page ships a sample of exactly
that shape, a tag confined to one port. **The win is symmetric and it is the best argument in this
document:** it bounds a lost, unlocked phone, which then reaches the door and nothing else and is refused
there for want of pairing keys, and it bounds any future credential leak, because a minted node could open
one TCP port on one Mac.

**But the grant is additive and buys nothing until the default allow-all is narrowed.** The cheapest
narrowing is one word: `src: ["*"]` → `src: ["autogroup:member"]`, which is *"any user who is a direct member
(including all invited users) of the tailnet"*, and a tagged device has no user — *"Applying a tag to a
device removes any user-based authentication"* and *"a device cannot simultaneously have a user and a tag"*
(https://tailscale.com/kb/1068/tags, read 2026-09-21), which is why `autogroup:tagged` exists as a separate
selector. **That last step is an inference from two of Tailscale's definitions and not a quoted sentence**,
so it is checked in the admin console's rule preview before he saves rather than trusted; its one risk is
that it also cuts off any OTHER tagged device he already owns, which is why §9 asks him.

**Two things survive the fix and must be said out loud.** First, **a grant bounds packets, not knowledge.**
Tailscale's device-visibility page (https://tailscale.com/docs/concepts/device-visibility, read 2026-09-21)
lists what a device's network map holds and its fourth clause is *"All devices that can connect to your
device, even if you aren't permitted to connect to them."* Under the default allow-all every device can
connect to the phone, so the phone's node holds a map naming his whole tailnet whatever a one-way grant says
— on a thing he can lose. Confining the phone needs the allow-all narrowed in both directions, not one rule
added. Second, **the app's reach is not the door's reach.** TailscaleKit's ergonomic Swift path builds its
`URLSession` over `ProxyConfiguration(socksv5Proxy: endpoint)` from `node.loopback()`
(`swift/TailscaleKit/URLSession+Tailscale.swift`, read 2026-09-21), and upstream documents
`tailscale_loopback` as *"a SOCKS5 proxy onto the tailnet"* that also *"serves the LocalAPI on /localapi"*.
So if the door client is a `URLSession` — the obvious Swift choice, and the one ATS and HTTP/2 come with — a
general proxy onto his whole tailnet and a control endpoint for the node exist inside the app for its whole
lifetime. **`conformance:ios`'s rule (c), "no network call outside the door client", is theatre unless it
also names `loopback(` and `tailscaleSession(`** and not merely `tailscale_loopback`. The alternative is
`OutgoingConnection`/dial with a hand-written HTTP client, whose cost nobody has priced. Either way the
app's confinement is a property of Tortie's own code, and only the ACL grant is enforced by somebody else.

**Two consequences bind Phase 316.** **Tortie must never hold `policy_file`** — by Tailscale's own scope
table that scope drags `devices:posture_attributes` and `devices:core:read` with it, and the edit touches
every device he owns. The product answer is that **Settings → Phone shows him the recommended `tagOwners`
entry and the grant as TEXT to paste into his admin console, and says plainly what is true until he does.**
And the ORDERING: the policy edit comes before the credential question, because it bounds every other failure
— the lost phone, a leaked secret, and the netmap. The phase does not block on it; the phone works without it
and reaches more than it should, and the surface says so.

**One free win rides along.** *"When you apply a tag to a device for the first time and authenticate it, the
tagged device's key expiry is disabled by default"* (kb/1068, and https://tailscale.com/kb/1028/key-expiry
says it too; announced 2022-03-10 at https://tailscale.com/blog/tagged-key-expiry). A tagged phone never has
to re-authenticate. An untagged one dies silently at 180 days — *"By default, node keys automatically expire
every 180 days"* (https://tailscale.com/kb/1085/auth-keys, read 2026-09-21) — carrying HIS user identity
until it does, which is the other reason the tag is not optional.

### 3.2 Tortie does not hold a Tailscale API credential in Phase 316

Research 127 §2 wrote "The first is the design", meaning the OAuth client. **That is overruled, for four
reasons in order of weight.**

**(1) The leaked artefact is not a 90-day key, it is a standing key-minter.** Tailscale's own example is
`tailscale up --auth-key='${OAUTH_CLIENT_SECRET}?ephemeral=false&preauthorized=true'`
(https://tailscale.com/docs/features/oauth-clients.md, "Last validated: Jun 30, 2026", read 2026-09-21) — the
client secret *functions as a reusable, pre-approved auth key*, good until he revokes the client by hand.
"An API access token expires after one hour" is about the derived token and gives no comfort about the
secret, whose only documented guidance is "Store the client secret securely". It would live on a machine that
runs many agent processes at once, several deliberately launchable with their safeguards off, all with write
access to the home directory. That is CLAUDE.md refusal 8's own reasoning applied to a network credential.

**(2) It buys almost nothing, because the key is consumed once.** tsnet's `Server.AuthKey` field
documentation (https://pkg.go.dev/tailscale.com/tsnet, read 2026-09-21): *"If the node is already created
(from state previously stored in Store), then this field is not used."* With the tag, node-key expiry is off.
So the credential would be a permanent risk bought for a once-per-phone convenience.

**(3) The widening is measured and it is not small.** Counted in `/Users/gdc/gmux` at `a31999fc` on
2026-09-21: `build/conformance-credentials.mjs` is **3,075 lines**, `build/credentials-conformance-probe.mts`
is **3,434 lines**, and `src/main/credentials/` is **5,124 lines across 14 modules** (`wc -l
src/main/credentials/*.ts`, which holds no tests). The nearest precedent is Phase 304, commit `09c2ff56`, at
**50 files, +9,366 / −751** (`git show --stat`). That is an upper bound, because 304 also migrated an
existing store, and it is the only measured number in hand — but the phase entry's own adversary question,
"that one more credential in the credentials domain is a small thing", is refuted by it.

**(4) There is a path that gives him byte for byte the experience he asked for.** The QR is generated on the
Mac and scanned by the phone, so a key pasted into **Settings → Phone → Pair a phone** — a sheet he already
has to open, on a machine with a keyboard — leaves the phone exactly as ruled: download the app, scan, in.
**Nothing is ever typed on the phone.** He rejected pasting a key on the PHONE; this is a different paste and
the document says so in those words.

**The cost of this ruling, named rather than hidden.** The credential's one remaining advantage is
RE-PAIRING. tsnet's field doc is conditional, so if the app's stored state is gone — delete and reinstall, a
restore onto a new phone, a state directory under `Caches` — the key IS needed again, and TailscaleKit's only
other path is the interactive web sign-in (*"watch the ipn bus (see the example) for the `browseToURL` field
for interactive web-based auth"*, https://raw.githubusercontent.com/tailscale/libtailscale/main/swift/README.md,
read 2026-09-21). So "download and it works" is true **once per INSTALL, not once per phone**. For one man
with one phone, minting a second key in the admin console on a rare reinstall is acceptable. If he ever pairs
more than about three devices, or reinstall proves common, the credential becomes worth its cost — and that
is a new backlog entry with its own tier, never a quiet widening inside 316.

**The accounting correction the attack forced.** BOTH paths need the same one-time policy-file edit, because
the tag is what disables node-key expiry and only a tag owner can apply a tag. A key minted untagged to dodge
that edit kills the phone silently at 180 days with no auth key left anywhere to re-register. So the
hand-paste does not avoid setup — it avoids the credential.

**Ephemeral is the wrong choice, and it is specified in three places today** — research 127 §2, §5.1's Mac
table, and Phase 316 item 4. *"Ephemeral devices are auto-removed anywhere normally from 30 to 60 minutes
after the last activity"* and they are for "containers, cloud functions, or CI/CD systems"
(https://tailscale.com/kb/1111/ephemeral-nodes, read 2026-09-21). A phone in a pocket is offline for an hour
many times a day; the node is then deleted while the app's stored state still names it. **Worse, the wrong
value is the DEFAULT** — for keys minted from an OAuth client, `ephemeral` "defaults to `true`"
(oauth-clients) — so a build that simply omits it ships the broken behaviour green. **The correct shape is
one-off, pre-approved, tagged, NOT ephemeral**, and the Mac's pairing sheet says exactly those four words
when it tells him which key to mint.

**Written as refusals, so a later round does not widen them.** Tortie never holds a Tailscale API credential;
never `devices:core`; never `policy_file`. Revoking a key does not deauthorize the node — *"Revoking a key
does not deauthorize nodes using the key. To deauthorize a node, delete it from the Machines page"*
(kb/1085) — and deleting a device needs Owner, Admin or IT admin, which by the scope table is `devices:core`.
Per-device revocation is not Tortie's job, because it is not the revocation that matters: research 127 §5's
door table already says "Remove drops it from the keychain set at once and the others stand", and a phone
still on the tailnet with its pairing record gone reaches a door that refuses it. Deleting the tailnet node
is his click, and buying `devices:core` would roughly double the blast radius for tidying.

**The 90-day cap is reframed.** *"between 1 and 90 inclusive"* days (kb/1085) binds the freshness of the
pairing WINDOW, not the phone's membership, and a one-off key self-revokes on use — *"Tailscale automatically
revokes one-off keys after they are used"*. Research 127 §2 and §8 are corrected wherever they imply a
recurring cost. One discrepancy recorded rather than resolved: §2's attributed sentence *"the iOS app pushes
when a re-auth is due"* was not found on `kb/1028` when that page was re-read on 2026-09-21. It is moot under
a tag.

**The scope table, for the record.** https://tailscale.com/docs/reference/trust-credentials.md ("Last
validated: Jan 30, 2026", read 2026-09-21) holds exactly two auth-key scopes, `auth_keys:read` and
`auth_keys` ("read or modify"), so **`auth_keys` is the floor and there is no create-only variant** — and a
credential holding it can also modify and revoke keys other automation depends on, which is a denial of
service rather than only a leak. A narrower scope, `auth_keys:create:once`, is named only on
https://tailscale.com/docs/features/oauth-apps/device-provisioning.md, is absent from that scope table, and
is browser-bound by construction ("the user re-authorizes through the consent screen for each new device"),
which is the cost the operator's ruling exists to avoid. The discrepancy in the vendor's own sources is
recorded in §7.

**If he overrules this ruling**, the design is a **second sealed store in the credentials domain** on Phase
304's `sealedVault`/`VaultSeal` seam (`src/main/credentials/vault.ts:258`), never the agent-login slot
namespace — `LOGIN_PROVIDERS` is `['claude', 'codex']` (`src/shared/logins.ts:39`, read 2026-09-21) and
widening `LoginProviderId` for a network vendor collides with `conformance:logins`' rule that no file in that
domain may name a vendor location. Scope `auth_keys`. Seven clauses beside `conformance:credentials`' rule
22, each red under its own ablation: the round trip and secrecy at rest; no argv on any put or hit; **the QR
carries the MINTED key and never the client secret, driven rather than scanned**; the scope pinned as text
with one ablation per forbidden scope; **the mint body pinned as text with `ephemeral: false` red when
flipped OR omitted**; no secret byte in a log line, an IPC answer, a refusal or the record file; and the
credential reached only from the pairing window the person opened. Clauses 3 and 5 are the two a later round
could break in one line.

**And one thing lands in 316 regardless of this ruling.** The import-wall row `{ dir: 'main/pocket/',
forbidden: ['main/credentials/', 'main/logins/'] }`, because research 127 §5's door table already promises
it. `DIRECTORY_WALLS` in `build/assert-import-boundaries.mjs:238-254` holds exactly two entries today,
`main/arch/` and `renderer/state/` (read 2026-09-21), so this is a third of the same shape and it is cheap.

## 4. App Review

**The framing first, because the framing is what would have cost real work.** Phase 316 item 9 has already
decided: development-signed or internal TestFlight, and its refusals read "No App Store submission, no
external TestFlight, no Beta App Review, no demo mode, no privacy page, no Organization enrolment and no
D-U-N-S." **Everything in this section is therefore the price of the store on the day he wants it —
inherited by 316, not executed by it.** It is written down in full so a future submission phase finds it
rather than discovers it. Every clause below is quoted from
https://developer.apple.com/app-store/review/guidelines/ or Apple's own UK PDF of the same guidelines, both
read 2026-09-21.

**No demo mode in Phase 316, and the clause analysis that corrects research 127 §5.** No reviewer exists on a
development-signed install or an internal TestFlight group, so nothing binds. And when the store IS on the
table the operative clause is **2.3.1(a)** — *"All new features, functionality, and product changes must be
described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be
rejected) and accessible for review"* — and **not 2.1(a)**, whose demo-mode sentence is conditioned on *"if
your app includes a login"* and offers a built-in demo mode only *"in lieu of a demo account"* with *"prior
approval by Apple"*. Tortie's phone app has no account and no login, so nothing is in lieu of anything and
the prior-approval thread is saved; research 127 §5's "a demo mode approved in advance" is corrected. The
sample mode, the privacy page, the screenshots and the metadata rules are DEFERRED and LABELLED, not deleted
— a sample good enough to satisfy "accessible for review" is real product work and not a stub, and 316 must
not build it.

**2.3.1(a) is also the clause most likely to bite a future submission, ahead of 4.3.** Its first sentence is
*"Don't include any hidden, dormant, or undocumented features in your app; your app's functionality should be
clear to end users and App Review."* Phase 316 item 6 ships the composer HELD, on purpose — a visibly
present, deliberately inert control is **dormant in Apple's own word**, and it is a build property that no
reply in a thread can cure, where 4.3 is a reviewer's pattern-match that identity evidence can. 4.3(b)'s own
enumerated targets are "dating, flashlight, sound effects, wallpaper, simple timers, and fortune telling",
consumer categories rather than desktop-companion clients. **This does not change what 316 builds — the held
composer is the right product call and it ships — but it is recorded as a liability that attaches the moment
the store is on the table.**

**The 4.3(a)-against-4.3(b) discrepancy, recorded as a discrepancy exactly as the phase instructed.** On
Apple's live page, in Apple's own UK PDF, and in an independent adversary's read of both, **4.3(b)** is
*"Don't submit apps that are indistinguishable from what's already widely available…"* and **4.3(a)** is the
multiple-Bundle-IDs rule (*"for example, submitting a separate map app for every city in the world"*).
`/Users/gdc/superset/apps/mobile/RELEASE.md:163`, re-read at its own head, heads its section `Guideline
4.3(a), "Spam" (similar binary, metadata, or concept)` — the wording of Apple's Resolution Center letter,
which is forum-corroborated and is not Apple's page. Both are true. Apple's news item of **June 8, 2026**
(https://developer.apple.com/news/?id=a233fmpw) records that the last revision touched both letters, so the
page as read is the page that was live at Superset's August 2026 rejection; that the canned categories lag
the page is **inference and is marked as one**. The practical ruling: any reply to Apple writes "4.3" with no
letter and answers the substance of (b).

**4.2.7 is not switched off; it is structurally fatal if it fires, and that makes "no terminal" a review
decision.** Its preamble is conditional — *"If your remote desktop app acts as a mirror of specific software
or services rather than a generic mirror of the host device, it must comply with the following"* — and
Tortie's transcript is structured records drawn in native SwiftUI, never screen bytes, so it never fires. But
the condition is judged on what a reviewer SEES and the mechanism is invisible. If it ever fires it is
UNSATISFIABLE: *"(a) … both the host device and client must be connected on a local and LAN-based network"*,
and TN3179 defines a local network as *"not cellular (WWAN) or VPN"*. **So "no raw terminal" and "works from
anywhere" are the same decision.** Research 127 §11's third question — the home-Wi-Fi bind he was weighing
for reach — is the *only* configuration that could ever satisfy 4.2.7(a). Either refusal alone is fine; both
cannot be given up at once.

**4.7 arrives with Phase 318, not 316, and its answer is pre-written.** Guideline 4.7's preamble names
"chatbots" among software *"not embedded in the binary"* and makes the developer "responsible for all such
software offered in your app"; 4.7.1 requires "a method for filtering objectionable material, a mechanism to
report content … and the ability to block abusive users", and 4.7.4 "an index of software … universal links
that lead to all of the software offered in your app". Those duties are unsatisfiable for an agent a person
installed on their own Mac. The defence is one sentence: the agent is not software Tortie offers; the person
installed it on their own computer, and the app neither hosts it, distributes it, indexes it nor takes a cut.
Counter-evidence recorded: Superset's phone app lets a user chat with an agent (its own review notes,
`/Users/gdc/superset/apps/mobile/store.config.js:13`) and shipped with no 4.7 finding.

**Push is pinned by two clauses, not one.** 4.5.4: *"Push Notifications must not be required for the app to
function, and should not be used to send sensitive personal or confidential information."* 5.1.2(i): *"Your
app may not require users to enable system functionalities (e.g. push notifications, location services,
tracking) in order to access functionality, content, use the app."* Phase 316 item 8's "every screen works
with notifications denied" is a rule stated twice over. The same clause's first sentence is the only AI
sentence in the guidelines — *"You must clearly disclose where personal data will be shared with third
parties, including with third-party AI, and obtain explicit permission before doing so"* — and it is a
question for 318 and not 316: in 316 the app shares nothing and merely DRAWS words the Mac already sent to a
third-party AI; in 318 the phone becomes the surface through which his words reach one.

| Clause | Risk | Why |
| --- | --- | --- |
| 2.3.1(a) hidden or dormant features | **Highest** | The composer ships visibly held on purpose. A build property, not a reply |
| 4.3 spam / indistinguishable | **Moderate-high** | The nearest shipped product was rejected on it in August 2026; cured by identity evidence, of which Tortie has less |
| 4.2.3(i) works on its own | **Low-moderate** | The embedded node removes the second **iOS** app; whether a **Mac** app counts is UNMEASURED |
| 4.2 minimum functionality | **Low** | Four native screens with real utility |
| 4.2.7 remote desktop | **Low while nothing mirrors, fatal if anything ever does** | Above |
| 2.5.2 downloaded code | **Very low** | No over-the-air channel of any kind; where Swift beats the other three routes outright |
| 5.1.1 / 5.1.2 privacy | **Low, one deliverable** | Collects nothing, but a privacy page must exist and be linked and does not today |
| 2.3.7 / 5.2.1 metadata and marks | **Low if the product-page rules hold** | His own tree carries the worked example of getting it wrong |
| 5.4 VPN | **Off, and kept off by §2's text rule** | Organisation-only if it ever fired |
| 4.7 chatbots | **Arrives with 318** | Defence pre-written above |
| 3.1.x, 4.8, 5.1.1(v) | **None** | Free app, no IAP, no login, no account |

**The Superset record, re-read at its own head, with two findings research 127 §8 did not have.**
`RELEASE.md:165-168` records "the rejection we got on the first 1.0 submission (build 13, Aug 2026)" and that
"the reviewer pattern-matched us against the pile of 'remote control for Claude Code / Codex' apps in the
category"; `:170-184` is the four-step remedy (reply about identity and not features, fix the product page
because "Generic metadata is what the reviewer matched on", ask for a call because "4.3(a) is a judgment
call", resubmit only after the first two); `:55` reads "Reviewers will not install the desktop app."; `:208`
warns against "Any copy that reads as 'build and run apps on your phone'." **First: the headed review notes
were the CURE, not a failed prevention** — they arrived in commit `52df88219` (2026-08-22), whose message
says `store.config.js` "now mirrors what is live in App Store Connect **after the 4.3(a) rejection on build
13**", so nobody has evidence that notes of this shape PREVENT a 4.3 rejection. **Second: an independent
metadata finding**, commit `acc66bb4c` (2026-08-16), "fix(mobile): drop third-party marks from App Store
keywords", removing `claude`, `codex`, `mistral`, `kimi`, `grok` and `xai` as "other vendors' product names,
and a standard metadata rejection" — 2.3.7 and 5.2.1 exactly. **The licence line, so the runbook is not read
as permission to take code:** Superset is Elastic License 2.0, source-available and not OSI (research 127
§3.1), and the conclusion is unchanged — **do not vendor, copy approaches freely.**

**The review notes and the product page, inherited with two cuts.** The draft loses its "Apache 2.0"
attribution unless `LICENSE` is re-read at its own head, because a licence stated to Apple deserves the bar
the phase sets for the Superset citations; and it loses "We answer same day", because 2.3.7 warns about
unverifiable claims and one person cannot keep it through a phase workflow. Its deliberate omission survives:
never say the app is "in the same class as an SSH or remote desktop client", which Superset's own notes say
and which is a written invitation to 4.2.7. The product-page rules survive intact — the title is the brand
alone; the subtitle names Tortie and never the agents; the first description sentence says the app is useless
without the Mac app BY NAME, because that limitation is the 4.3 defence; no vendor marks in title, subtitle
or keywords; agent names only in a body paragraph with a non-affiliation line; both URLs at tortie.sh; a
privacy page written first; screenshots of four POPULATED screens and never the pairing screen; the
desktop-plus-phone recording as a review-notes link and never a store preview, since 2.3.4 allows "only …
video screen captures of the app itself"; and a seller name matching whoever owns the intellectual property
under 5.2.1.

**One sourcing discipline, recorded for every later round.** Guidelines 5.5 and 5.6 were reached only through
Apple's Japanese-language page and summarised in English, which is not verbatim Apple English and is marked
as such; 5.5 restricts MDM services to organisations and does not reach Tortie. And an exhaustive word-sweep
of the guidelines page for "remote, host device, terminal, automation, agent, AI" MISSED 5.1.2(i)'s
"including with third-party AI", which the same agent had already quoted verbatim from that same URL. **The
sweep's silence is not evidence, and no round may write "nothing else in the guidelines bites" on the
strength of one.**

## 5. Getting it onto his phone

**The $99 is already paid, and research 127 §5 prices work that is already done.** Apple's comparison
(https://developer.apple.com/support/compare-memberships/, read 2026-09-21) puts "Mac software
notarization", "Certificates, Identifiers & Profiles", "App Store Connect" and "TestFlight" in the
member-only column, and gives the free tier only "On-device testing using Xcode", "up to 3 devices, which
expire after 7 days", and profiles that "expire 7 days from issuance". `docs/BACKLOG.md:143` records the
release lane as shipped on 2026-08-13 and the running log records notarized, stapled releases from v0.62.1
through v0.104.0, which needs exactly that member-only column. One membership covers every platform
(https://developer.apple.com/programs/whats-included/: the tools "to build and upload apps for iPhone, iPad,
Mac, Apple TV, Apple Vision Pro, and Apple Watch"). **So iOS App IDs, development certificates, device
registration, the APNs key, App Store Connect and TestFlight are available today at zero marginal dollars and
zero lead time**, and the entire free-Apple-ID column is moot. Research 127 §5's "organisation enrolment (a
D-U-N-S number…)" is struck as a cost of the phone; it survives only as a seller-name question on the store
row, which is deferred with the store.

| Target | Minimum, measured | Review | How long it lasts | Cost and lead time |
| --- | --- | --- | --- | --- |
| **0. His Simulator** — iPhone 16 Pro, 16 Pro Max, 16e, Xcode 26.3 (17C529) | Nothing. No account, no signing. Push is `xcrun simctl push` only, payload "4096 bytes or less", "Only application remote push notifications are supported" | None | Indefinite | $0, immediate |
| **1. HIS OWN PHONE, development-signed** | The membership he already has: an iOS App ID with Push Notifications, an APNs `.p8`, the phone registered by Xcode on first Run, Developer Mode on | **None of any kind** — *"you can distribute builds to a limited set of testers on known devices without having to go through beta app review"* (Apple's registered-devices page, 2026-09-21) | **UNMEASURED** — Apple states no duration for a normal development certificate or profile. What it DOES state is the PPQ check-in on first launch | $0 marginal, immediate. No App Store Connect, no product page. No over-the-air install: an exported `.ipa` goes through Device Hub or Apple Configurator with the phone paired |
| **2. INTERNAL TESTFLIGHT — the build he asked for** | An App Store Connect **app record created before the first upload**; an **export-compliance answer**; internal testers are App Store Connect users with a role, up to 100 of them on up to 30 devices | **No TestFlight App Review.** *"Ready to Submit — Your build can be distributed to internal testers, or can be submitted to TestFlight App Review for external testing"* | **90 days.** *"Internal testers can download and test all builds for 90 days"* | $0 marginal. Hands a tester access to his App Store Connect content |
| **2b. One other person, no Connect** | Their UDID, one of "up to 100 … devices, per product family, per membership year"; disabling one "won't increase your number of available devices" | None | As row 1 | $0 + their UDID + a device slot |
| **3. The store** | Everything in §4, plus full App Review, plus a privacy page; and, if the seller must read Ita Vero, LLC, an entity migration needing a D-U-N-S number | Full | Until pulled | D-U-N-S free, "up to 5 business days" from D&B plus "up to 2 business days for Apple"; organisation verification has no stated duration |

**Internal TestFlight is the target, and that is his own ruling, not a preference.** At the foot of the Phase
316 entry, verbatim: *"when we start to build the swift app, definitely use simulator on my mac until we get
a testflight build ready for me to try it end to end on my phone with a dev build of tortie"*, and the
entry's next sentence — "Its last step is a TestFlight build he installs on his own phone." So
development-signed is the fallback and the thing to build first; row 2 is the finish. **Four of the
adversary's six deletions survive and two do not**: no demo mode, no guideline-4.3 exposure, no Organization
enrolment or D-U-N-S or lead time, and no second Apple credential beyond the APNs key all survive; "no App
Store Connect upload step" and "no 90-day build treadmill" do not, because both arrive with the build he
asked for.

**Item 9's wording is corrected: development-signed deletes everything; internal TestFlight deletes the
REVIEW EVENT and not the guidelines.** Guideline 2.2, Apple's own words: *"Any app submitted for beta
distribution via TestFlight should be intended for public distribution and should comply with the App Review
Guidelines."* And the citation discipline: the TestFlight overview page's Step 3 is loose prose written for a
reader doing both audiences and says both "If you invite external testers, your beta build may require
review" and, unqualified, that the first build "gets sent to App Review". The per-status reference page names
the audience in every clause and is the one to cite
(https://developer.apple.com/help/app-store-connect/reference/app-build-statuses, read 2026-09-21).

**The APNs environment flip is mandatory, not prudent, because his own trial spans both arms.** Apple's
`aps-environment` page (read 2026-09-21): *"Xcode sets the value of the entitlement based on your app's
current provisioning profile… Production provisioning profile and Prerelease Versions and Beta Testers use
`production`… The `development` environment is also referred to as the `sandbox` environment"*, and the hosts
differ — `api.sandbox.push.apple.com` against `api.push.apple.com`. His stated trial is a Simulator and Xcode
arm (development) and then a TestFlight build (production), both against the same dev build of Tortie. **A
sender pinned to either host fails silently on the other arm.** `src/main/push/apns.ts` selects the host from
the build's `aps-environment`, the phone reports which environment its token was minted in, and the hostile
door gains **a token minted for the wrong environment**.

**Export compliance, named by nobody in the investigation and raised independently by both adversaries.**
Apple (https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds/
and https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations, both
read 2026-09-21): compliance must be provided for TestFlight beta builds or the build is marked **"Missing
Compliance"**; the required role is Account Holder, Admin or App Manager; and **the page does not distinguish
internal testers from external**. The exemption is narrow: *"the use of encryption that's built into the
operating system—for example, when your app makes HTTPS connections using URLSession—is exempt from export
documentation upload requirements, whereas the use of proprietary encryption is not"*, with
`ITSAppUsesNonExemptEncryption` set to NO only if the app "including any third-party libraries it links
against" uses no encryption or only exempt forms, and a possible year-end self-classification report
besides. **A Go WireGuard and Noise stack compiled into the bundle is not the operating system's encryption,
so `false` is a determination Tortie must make and justify, not a default** — and Tailscale's own Aperture
answering `false` in its Info.plist is a data point, not a ruling. This is a legal determination and it goes
to him. Development-signed installs never upload and escape it entirely, which is a real, newly-priced
difference between the fallback and the build he asked for.

**And the first launch of each build needs the open internet, not merely the tailnet.** Apple's
provisioning-profile-updates page (read 2026-09-21): memberships created after June 6, 2021 "require
development- and ad-hoc-signed apps for iOS, iPadOS, and tvOS to check in with the PPQ service when the app
is first launched", and "If the device can't successfully make a connection, the app may not launch."

**Which membership he holds is his to check and changes nothing in 316.** `electron-builder.yml:9` records
the discovered signing identity as `"Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)"`, a
personal-name team. `DEVELOPMENT.md:21-22` and `electron-builder.yml:53` say Tortie ships under Ita Vero, and
that sentence is about the BUNDLE ID, not the enrolment. Either reading leaves every row above already paid.

## 6. What was refuted

Each of these was upheld by the judge after an adversary refuted an investigator's claim, so nobody
re-derives it.

1. **"No `.entitlements` file on the iOS target at all" must not be written as a rule.** `aps-environment` is
   an entitlement, item 8 ships push, and Tailscale's own reference project carries one. The rule is KEYS.
2. **"Connect by MagicDNS name and no ATS key is needed" is not established.** Apple says you cannot loosen
   server trust for an ATS-protected domain, and Tailscale's own iOS example ships an exception for `ts.net`.
3. **The word "measured" is struck from the entitlement answer.** No Apple page addresses a userspace network
   stack in either direction; the answer is an absence plus two existence proofs.
4. **"No sentence on that page requires a request to Apple" is imprecise.** The NetworkExtension page does
   describe a Certificates, Identifiers & Profiles step, for macOS Developer ID distribution only. Enabling a
   capability in the portal is not requesting permission; multicast's "requires permission from Apple" is.
5. **"Aperture declares no entitlements and functions" is not a proof**, because nothing was run and its
   public listing was not found. The multicast ruling survives on the request sentence instead.
6. **NovaScale's "no VPN permission required" is marketing copy**, not an entitlement measurement. It is a
   review-outcome data point and the document does not let the two blur.
7. **"An ACL tag confines the phone to the door and nothing else" is half true.** A grant bounds packets, not
   the network map, and it buys nothing until the default allow-all is narrowed.
8. **The app's reach is not the door's reach.** TailscaleKit's `URLSession` path opens a SOCKS5 proxy onto the
   whole tailnet plus the node's LocalAPI, so `conformance:ios` rule (c) must name `loopback(` and
   `tailscaleSession(`.
9. **"One more credential in the credentials domain is a small thing" is refuted by measurement**: 3,075 and
   3,434 gate lines, 5,124 domain lines, against Phase 304's 50 files and +9,366/−751.
10. **The hand-paste does not avoid setup, it avoids the credential.** Both paths need the same one-time
    policy-file edit, because only a tag owner can apply the tag that disables key expiry.
11. **Ephemeral is wrong and its wrong value is the vendor's default** for OAuth-minted keys, so a build that
    omits the field ships the broken behaviour green.
12. **"Download and it works" is true once per INSTALL, not once per phone.** tsnet consults the auth key only
    when its stored state is gone.
13. **A demo mode is not needed in 316, and when it is needed the clause is 2.3.1(a), not 2.1(a)**, whose
    demo-mode sentence is conditioned on a login this app does not have.
14. **4.3 is not the clause most likely to bite; 2.3.1(a) is**, because a deliberately inert control is
    "dormant" in Apple's own word and is a build property no reply can cure.
15. **4.2.7 is not a low risk that is switched off; it is a fatal risk that is cheap to keep from firing**, and
    its LAN clause is unsatisfiable over a tailnet.
16. **"Internal TestFlight deletes guideline 4.3 entirely" is too strong.** Guideline 2.2 says a TestFlight
    build "should comply with the App Review Guidelines". It deletes the review event.
17. **"Row 1 is the only target" is refuted by his own ruling**, which names a TestFlight build he installs on
    his own phone.
18. **"Internal TestFlight is $0 with nothing else" is refuted** by the app record, the export-compliance
    answer and the 90-day build clock.
19. **A personal-name signing certificate does not prove Individual enrolment.** It proves the release is
    signed by a personal-name team; either reading leaves the phone's rows paid for.
20. **An exhaustive word-sweep of the guidelines page is not evidence of absence.** One such sweep missed
    5.1.2(i)'s own AI sentence, which the same agent had already quoted from that URL.

## 7. What was not measured and why

- **The door's TLS against ATS — the biggest gap, and one `xcodebuild` plus one Simulator run answers it.**
  Whether the phone can open a connection to Tortie's pinned self-signed certificate at all, over
  `URLSession` or over Network.framework, with or without an exception; and whether ATS binds
  Network.framework's own TLS. **Item 4's Info.plist rules cannot be written until it is taken.**
- **Any Apple statement on a userspace network stack, in either direction.** Two independent searches of
  developer.apple.com found none.
- **Whether an all-empty `PrivacyInfo.xcprivacy` is ACCURATE for an embedded Go runtime calling file-timestamp
  APIs, as against merely PRESENT.** And whether a statically linked TailscaleKit is covered by the app-level
  manifest at the bundle root or needs its own — Apple's rule is per executable or dynamic library, and the
  linkage was not determined.
- **The lowest iOS deployment target an embedded node supports.** Three inconsistent numbers in the sources:
  Aperture sets iOS 26.0, a third-party reference implementation reports the framework's floor moved to iOS
  17, NovaScale's store page says iOS 15. 316 measures its own and promises none.
- **The binary-size cost of an embedded TailscaleKit.** The only number anywhere is NovaScale's 85.8 MB, which
  is a whole app with a terminal, SFTP, a proxy and container monitoring. One `xcodebuild` gives the real
  number, and it decides whether the app is a 15 MB download or a 90 MB one.
- **Whether another process on the same iPhone can reach the loopback SOCKS5 port and the `/localapi`
  endpoint.** The difference between an in-process convenience and a device-wide hole. The stated bounds are
  the proxy credential and the LocalAPI's basic auth plus its `Sec-Tailscale: localapi` header.
- **Where TailscaleKit's state directory should live on iOS so the node survives an app update, and what the
  app does when it does not.** This decides whether re-pairing is a designed screen or an accident, and it is
  the hinge of the hand-paste-versus-credential trade.
- **App Store Connect's non-guideline requirements for an INTERNAL-TestFlight-only build** — whether Test
  Information, a beta app description, a feedback email or a privacy policy URL are required at upload. It
  fell between two investigators; it is one page-read away and it belongs to Phase 316's first hour.
- **How long a development-signed build keeps working on his phone.** Apple states no duration for a normal
  development certificate or profile; the "one year" figure is forum- and archive-sourced only. Apple's pages
  give durations for Enterprise (12 months), Developer ID (18 years) and the offline profile (7 days, 30-day
  bound) and nothing else.
- **Guideline 5.5's English text and the remainder of 5.4 after its first sentence.** Both official English
  copies truncate at 5.4's opening; 5.5 and 5.6 were reached only through Apple's Japanese-language page.
- **Whether a MAC app counts as "another app" under guideline 4.2.3(i).** Apple's text is unscoped to the
  device; the shipped category of desktop-companion apps is the only counter-evidence and it is not Apple's
  statement. The embedded node removes the iOS app the clause unambiguously covers, which is the part that
  matters.
- **Whether a tailnet counts as "a local and LAN-based network" under 4.2.7(a).** No Apple statement found
  either way. Moot while nothing mirrors a screen, fatal if anything ever does.
- **Whether `auth_keys:create:once` is obtainable by a client-credentials OAuth client** rather than only by
  the browser authorization-code flow. It is named only on Tailscale's device-provisioning page and is absent
  from the trust-credentials scope table — a discrepancy in the vendor's own sources. If it is obtainable it
  is strictly narrower than `auth_keys` and would reopen §3.2.
- **The minimum accepted `expirySeconds` on the create-key call, and the API shape for revoking a minted
  key.** Tailscale's interactive API reference is JavaScript-rendered and was not readable. Moot for a one-off
  key, which self-revokes on use.
- **Apple's own wording for `ASWebAuthenticationSession`.** The page is JavaScript-rendered; only its title
  came back. It bounds how the web-sign-in fallback would look if stored state is ever lost.
- **Any App Review decision on a userspace-tsnet app**, and whether Tailscale's own shipped iOS client
  declares the multicast entitlement. NovaScale shipping is an outcome; the reasoning is not public, and
  reading its entitlements would need its IPA. Whether `aperture-plus` is publicly listed at all was searched
  for and not found; its own repository calls itself "Experimental".
- **Nothing was installed, enrolled, minted, signed into, booted or run in this phase**, and no secret was
  found, read or written in any tree. Every statement about how a review or a join would go is a reading of a
  published page or a record of somebody else's submission, and no part of it is experience.

## 8. What this changes in Phase 316's entry

**A precondition that is not Tortie's work.** A `tag:tortie-phone` entry in `tagOwners`, a grant confining it
to the Mac's door, and the default `*` → `*:*` rule narrowed so the grant means anything. Tortie never holds
`policy_file`. 316 ships **Settings → Phone showing him the recommended policy as text to paste**, with a
sentence saying what is true until he pastes it. The phase does not block on it.

**AND THE RESIDUAL THE GRANT DOES NOT CLOSE, added 2026-09-22 by Phase 313's builder C, because it belongs
beside the grant's own sentence rather than three sections away.** A grant bounds PACKETS, not KNOWLEDGE. A
node's network map lists, in Tailscale's own words on its device-visibility page, "All devices that can
connect to your device, even if you aren't permitted to connect to them" — so a paired phone still learns
the NAMES of every device on his tailnet whatever a one-way rule says, and it learns them on a thing he can
leave in a taxi. The grant is still worth pasting: it is the difference between a lost phone that can open
any port on his Mac Pro and one that can open a single port on the Mac and be refused there for want of a
pairing key. But the sentence on the Settings surface must not promise more than the grant delivers, and
**this residual is the one thing the confinement ruling does not fix.** Closing it at all would mean
`--shields-up`, a second tailnet, or not putting the phone on this tailnet — each its own decision and none
of them this phase's.

**A measurement 316 takes in its first hour.** The door's TLS against ATS (§2, §7). Until it is taken, item
4's Info.plist rules cannot be written, and the phase chooses in the open between a narrowly scoped
`NSExceptionDomains` entry for the tailnet domain only and no `URLSession` on the door path.
`NSAllowsArbitraryLoads` is refused either way.

**Item 4, the embedded node.** *Unchanged:* the userspace node is the design, no VPN profile, no second app,
no Tailscale login screen; the Mac side still adds `<appId>.tailscale` to `NESTED_BINARIES` and
`mac.signIgnore` in the same commit; `build/entitlements.mac.plist` keeps its three keys and its comment.
*Changed:* (i) there IS an `.entitlements` file on the iOS target and the rule is about KEYS — no
`com.apple.developer.networking.*`, no `.vpn.api`, no NetworkExtension or `NEVPNManager` symbol and no VPN
string anywhere in the Swift; (ii) `NSLocalNetworkUsageDescription`, one honest sentence; (iii) no multicast
entitlement is requested, at the cost of a possibly relayed path in research 28's 150–400 ms band; (iv) a
`PrivacyInfo.xcprivacy` for the app and, until `libtailscale` #57 lands, injected into the framework's iOS
slices **and re-signed**; (v) the key is one-off, pre-approved, tagged and **`ephemeral: false`** — ephemeral
is struck from item 4, from research 127 §2 and from §5.1's Mac table; (vi) no deployment target is promised.

**Item 4a — the tailnet key minter is CUT.** Research 127 §5.1's Mac table loses that row and its five new
Mac things become four; `conformance:credentials` widens ONCE, for the APNs `.p8`, and not twice. The key is
minted by him in the admin console once per phone install and pasted into **Settings → Phone → Pair a
phone**, on the Mac, with a keyboard, never on the phone, and the sheet names the four properties it must
have. The QR still carries three things and the sentence describing it gains "the minted key, never a client
secret". Written as refusals: Tortie holds no Tailscale API credential, never `devices:core`, never
`policy_file`; per-device revocation is the pairing record; deleting the tailnet node is his click. **The
cost, named:** re-pairing after a delete-and-reinstall needs a second hand-minted key, so 316 owes a
**designed re-pair path** and must decide where TailscaleKit's state directory lives on iOS. **The import
wall lands regardless:** `{ dir: 'main/pocket/', forbidden: ['main/credentials/', 'main/logins/'] }`, a third
entry beside `main/arch/` and `renderer/state/`.

**Item 6, the composer.** Unchanged — it ships HELD, and that is the right product call. Recorded beside it:
a visibly present, deliberately inert control is "dormant" in guideline 2.3.1(a)'s own word, which is a
liability that attaches the moment the store is on the table.

**Item 7, the harness.** The sixth check type is an **"Xcode AND Go harness"**, because
`TailscaleKit.xcframework` is built from the submodule with Go. `conformance:ios` gains a **fourth text
rule** — no NetworkExtension symbol, no `NEVPNManager`, no VPN string — as the cheap Node-only guard that
keeps the app out of guideline 5.4 forever. And its **rule (c) is widened** to name `loopback(` and
`tailscaleSession(`, not only `tailscale_loopback`, or TailscaleKit's own `URLSession` path leaves a SOCKS5
proxy onto his whole tailnet inside the app while the gate stays green.

**Item 8, push.** `src/main/push/apns.ts` **selects its host from the build's `aps-environment`** —
`api.sandbox.push.apple.com` for the Xcode and Simulator arm, `api.push.apple.com` for the TestFlight arm —
because his own stated trial spans both and a pinned sender fails silently on one. The hostile door gains **a
token minted for the wrong environment**. And "every screen works with notifications denied" is pinned by two
clauses, 4.5.4 and 5.1.2(i), and is stated as a rule.

**Item 9, distribution.** The target is **internal TestFlight** on the membership he already holds, with
development-signed as the fallback and the thing built first. The $99, the Organization enrolment, the
D-U-N-S and the entity migration are **struck from the phase's cost**. What TestFlight adds and item 9 must
budget: an app record created before the first upload, an export-compliance answer, and a 90-day build clock.
The wording is corrected — development-signed deletes everything; internal TestFlight deletes the review
event and not the guidelines. The citation is the per-status reference page, never the overview. And the first
launch of each build needs the open internet for the PPQ check-in.

**Item 9a, NEW — export compliance.** Apple marks a build "Missing Compliance" without it and does not
distinguish internal testers from external. `ITSAppUsesNonExemptEncryption` is a determination, not a
default, for a bundle carrying WireGuard and Noise inside a Go framework. **It goes to him, because it is a
legal question.** Development-signed never uploads and escapes it.

**The refusals.** "No raw terminal scrollback" keeps its product reason and gains a review one: 4.2.7 is
structurally fatal if it fires and its LAN clause is unsatisfiable over a tailnet, so **"no terminal" and
"works from anywhere" are the same decision.** "No App Store submission, no demo mode, no privacy page" all
stand, with §4's whole store runbook inherited and explicitly labelled as not-today's-work, and the demo mode
refused for the right reason. **New: no background mode for the node, ever** — 2.5.4 admits VoIP, audio,
location and task completion and a tailnet node is none of them.

**One sentence for Phase 318, so it is not re-derived.** Guideline 4.7 names "chatbots" as software not
embedded in the binary and attaches duties — filtering, reporting, blocking, an index with universal links —
that are unsatisfiable for an agent a person installed on their own Mac. In 316 the app shares nothing and
merely draws words the Mac already sent to a third-party AI; in 318 the phone becomes the surface through
which his words reach one, and 5.1.2(i)'s disclosure sentence attaches there. The defence is one sentence and
it is pre-written: the agent is not software Tortie offers.

## 9. The rulings it needs from him

Nine, in his words where he has already used them, and the document ends with them. The first two are about
his tailnet and they come before everything else.

1. **"Does the phone get to reach everything on my tailnet, or do I confine it?"** Today Tailscale's default
   is `src: ["*"], dst: ["*:*"]`, so "download the app and it works" also means the phone can open any port
   on his Mac Pro, his NAS and everything else he owns — and its node holds a map naming all of them, on a
   thing he can lose. The fix is his and Tailscale enforces it on every device: a `tag:tortie-phone` in
   `tagOwners`, a grant confining that tag to the Mac's door, and the default rule narrowed so the grant
   means something. Tortie will show him the text to paste and will never hold `policy_file`. **This should
   be answered before the phone exists rather than after.**
2. **"Do I already own any TAGGED device?"** It decides whether the cheapest narrowing — `src: ["*"]` →
   `src: ["autogroup:member"]` — is safe or whether it silently cuts off something of his. One glance at his
   Machines page, and the admin console's rule preview shows the effect before he saves. The reasoning behind
   that one-word change is an inference from two of Tailscale's definitions rather than a quoted sentence, so
   it is checked rather than trusted.
3. **"Do I accept pairing with no credential — I mint one key by hand per phone install, paste it into the
   Mac's pairing sheet, and the phone still only scans?"** The recommendation is yes. The credential Tortie
   would otherwise hold is not a 90-day thing: the OAuth client secret is itself a reusable pre-approved auth
   key that never expires until revoked by hand, and it would sit on the machine running all his agents. The
   honest cost is that a delete-and-reinstall, or a restore onto a new phone, means a second hand-minted key.
   If he expects to pair more than about three devices, or reinstalls often, he should overrule it — and then
   it is a new backlog entry with its own tier, never a quiet widening inside 316.
4. **"Is `ITSAppUsesNonExemptEncryption = false` the right answer for this app?"** Apple's exemption is for
   "encryption that's built into the operating system"; a Go WireGuard and Noise stack inside the bundle is
   not that. The build is marked "Missing Compliance" without an answer, and the page does not distinguish
   internal TestFlight testers from external, so it reaches the exact build he asked for. A development-signed
   install escapes it entirely. **This is a legal determination and an agent must not make it.** Tailscale's
   own Aperture answers `false`; that is a data point, not a ruling.
5. **"Which Apple membership do I hold — Individual or Organization — and is it current?"** The Mac release is
   signed `Developer ID Application: Gregory Ceccarelli`, a personal-name team. Either way the phone's rows
   are already paid for and nothing in 316 is blocked. It decides only the seller name if the store is ever on
   the table and — through guideline 5.4, which forbids a VPN app from an Individual enrolment — it is the one
   place where a future misreading of the app as a VPN would cost more than an argument. One sign-in to
   developer.apple.com answers it, and it is his to run.
6. **"Is the App Store on the table at all, ever?"** 316 does not need it and does not ask for it. The answer
   decides whether two things are liabilities to design around now or documents to inherit later: the composer
   that ships visibly held, which guideline 2.3.1(a) calls "dormant", and guideline 4.7's duties for
   "chatbots", which arrive with Phase 318's reply door. The store runbook in §4 is written and waiting either
   way.
7. **"Should the door answer on my home Wi-Fi too, or only on the tailnet?"** — research 127 §11's third
   question, now a review question as well as a reach one. Guideline 4.2.7 does not fire while nothing mirrors
   a screen, and if it ever fires its LAN-only clause is unsatisfiable over a tailnet, so the home-Wi-Fi bind
   is the ONLY configuration that could ever satisfy it. Either refusal alone is fine; both cannot be given
   up at once.
8. **"Is device approval on for my tailnet?"** Harmless either way — passing `preauthorized: true` costs
   nothing if it is off — but it decides whether "pre-approved" means anything at all in the pairing
   sentence. His admin console, not an agent's.
9. **Two commands that are still his and still unqueued, restated so they are not lost:** whether Superset's
   desktop has ever registered lifecycle hooks in his agents' global configs, since a Tortie-launched codex
   session could be invoking `~/.superset/hooks/notify.sh` right now. His home is off limits to an agent and
   this phase did not look.
