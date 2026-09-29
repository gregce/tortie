# 132. The simplest pairing: scan one code on the Mac, and the phone never joins the tailnet

Phase 329. Written 2026-09-29 against the tree at `7d14342d` ("docs(backlog): the first TestFlight build,
landed"). **No `tailscale` command was run, the Mac's Tailscale LocalAPI was never called, his admin console
was never opened and his tailnet was never changed.** Nothing was installed, no Electron and no Simulator was
started, and no keychain, credential, APNs key or conversation store was read. Every Tailscale claim is a
quotation from a page read on 2026-09-29 (URL and "last validated" date given) or a `file:line` in the source
the vendoring build compiles: `tailscale.com v1.94.1`, fetched from the Go module proxy, whose dirhash
`h1:0dAst/ozTuFkgmxZULc3oNwR9+qPIt5ucvzH7kaM0Jw=` equals the line in libtailscale `59d4bb82`'s `go.sum:294`,
and libtailscale itself, whose tarball sha256 `471b8be3…` equals `build/tailscalekit-release.json`. Files that
matter to Funnel were also fetched at `v1.102.2`, the line his Mac runs (research 127 §2 read his app as
Standalone 1.102.2, bundle id `io.tailscale.ipn.macsys`), and diffed against the pin. The copies are under the
session's scratchpad (`scratchpad/p329/{src,a-pages,a-v1102,c,docs}`) and are not in the tree.

**The round.** Three investigators each owned a route: A, Funnel on the Mac with the phone off the tailnet; B,
a sign-in on the phone instead of a minted key; C, the Mac doing the joining, and no Tailscale on the phone at
all. Two adversaries attacked all four before a word of this was written, one for security and one for
simplicity, and a judge ruled on every disagreement and re-read the source the ruling rested on. §6 records
what the attack killed so no later round re-derives it.

This answers his question of 2026-09-29, in his words: *"i want it to be THE ABSOLUTE SIMPLEST experience for a
user, preferably just scan a QR code from their mac to pair with the phone having already configured tailscale
on their mac."* The starting point is a person who already has Tailscale signed in on the Mac and Tortie
installed. The target is Settings → Phone → a code; install the app; scan; paired, with no key minted by hand,
no policy edited, no second app, no VPN profile and, if at all possible, no sign-in.

## 1. The answer first

**Build Route 1: Tailscale Funnel on the Mac, and the phone never joins the tailnet.** Tortie runs the Mac's
own Tailscale program to publish the door as raw TCP, so the encryption passes through Tailscale untouched and
still ends inside Tortie with the key the code already pins. The phone becomes an ordinary app that opens one
pinned connection to `https://<mac>.<tailnet>.ts.net:8443`. Nobody mints a key, pastes a policy, signs in on
the phone or installs a second app. The first time on a tailnet, Tailscale's own web page asks once to approve
Funnel.

**It is about 14 to 21 actions the first time and 9 to 11 after, against about 30 to 38 today.** It cannot be
zero. His own rulings keep a floor of about 11: the door's hash-bound Allow, the six-group match and its Allow,
the App Store install and its confirm, and the camera prompt. "Just scan" can mean no Tailscale steps; it
cannot mean no Tortie steps.

**He has to accept two trades, and he has to make one five-minute measurement no agent may make.**

1. **The door answers the internet, not only his tailnet.** The phone is confined more strongly than today,
   because it has no tailnet identity at all. But anyone who knows the Mac's name can now reach the door, and
   only Tortie's own mutual TLS and signatures stand in front of it.
2. **Approving Funnel is tailnet-wide.** It lets any process on any device signed in as him, agents
   included, publish a local port to the internet with no further prompt. Tailscale cannot narrow that to one
   untagged Mac.

The measurement is needed because Tailscale's own pages contradict each other about whether Funnel works on
his Standalone build (§3.1). It settles that, how many clicks the approval page takes and how long the Mac's
public name takes to resolve.

**If he says no, or the measurement fails, the fallback is Route 2B:** a Tailscale sign-in inside the phone
app that asks for `tag:tortie-phone`. It keeps every ruling and needs no key, but it adds a sign-in screen on
the phone and still needs today's one-time policy paste for anyone who has not made it.

What else the round found:

1. **Route 1 keeps every standing ruling in its letter** (§8.2). The phone is confined by construction. Tortie
   runs no relay: the relay is Tailscale's, and it cannot decrypt raw TCP (`ipn/ipnlocal/serve.go:669-701`).
   There is no second app and no credential anywhere; `tk` leaves the code. The phone's Tailscale logs
   question disappears with the node. It removes TailscaleKit (about 23 MB), Go, the vendor step, the
   local-network prompt and checklist rows 3, 4, 10 and 15.
2. **It is acceptable only with conditions the investigator did not draw** (§7). Mutual TLS pinned to each
   paired phone outside the pairing window, so a stranger never reaches Tortie's HTTP parser. The listener in
   its own Tortie-owned process that holds no credential, because today it runs inside Electron's main
   process, which also holds the credentials domain and spawns every agent. The tailnet name, public name and
   port in the door's confirm hash. Never `--bg`, and a crashed Tortie's orphan ended at the next launch.
3. **Route 2A, a plain sign-in with no tag, breaks "the phone is confined to Tortie's door"** (§4). On his
   tailnet as narrowed today, an untagged phone is a member device and quietly undoes the grant he pasted.
4. **Route 3 does not exist** (§5). No LocalAPI route and no CLI command mints a key, approves a device,
   shares a machine or sends an invite. Two readers enumerated the route set independently. Research 128's
   refusal of a held Tailscale credential stands on the two new facts found since.
5. **Route 4 is ranked, not pursued** (§5.3). iroh matches Route 1's count only by hiding a relay somebody has
   to run or pay for. Same Wi-Fi fails away from home. CloudKit needs fewer steps than the floor because it has
   no door and no per-phone confirm, which makes it a different product.
6. **Three defects in today's build were found on the way** (§10), none fixed here. Today's code carries the
   tailnet key as plain JSON text that the iPhone's own Camera can read. The key checklist row 10 mints lasts
   up to 90 days unless used. Row 4 protects nothing on the Free plan.
7. **His "the upload failed" message reached this round without its image**, so it is not diagnosed here
   (§10).

## 2. What a person does, route by route, beside today's sixteen rows

One action is one tap, click or confirm. Reading and comparing are named, not counted. The start is Tailscale
signed in on the Mac and Tortie installed; the end is the phone showing Sessions. Every count was derived from
the tree, `build/p316/CHECKLIST.md` and the documented flows. **None was driven.**

**Today** counts checklist rows 2, 3, 4, 10 and 11 plus the phone. Rows 1 and 5 to 9 are his as the developer
building the app, and are left out.

| Step | Today, as built | Route 1, Funnel (chosen) | Route 2B, sign-in with a tag (fallback) |
| --- | --- | --- | --- |
| Open pairing on the Mac | App menu, Pair a Phone… (2) | same (2) | same (2) |
| Switch the door on | Switch, read the lines, Allow (2); maybe macOS's incoming-connections prompt (0 to 1) | Read the lines, which now name the internet, then one press that allows the door and shows the code (1 to 2); no incoming-connections prompt, because the door binds loopback (believed, not measured) | as today (2 to 3) |
| Tailscale, once per tailnet | Row 3: copy the grant, open the console, JSON editor, paste, merge sections, change `src` to `autogroup:member`, rule preview, save (about 10 to 12). Row 4: Logs, Network flow logs (2) | Tailscale's own approval page: Open Tailscale (1), sign in if the browser holds no Tailscale session (0 to about 6), Approve (1), maybe a certificate-log acknowledgement (0 to 1), back to Tortie (1). Only an admin of the tailnet can pass it | For him: nothing, his policy already defines the tag. For a new person: today's row 3 (about 10 to 12) |
| Tailscale, every install | Row 10: Keys, Generate auth key…, four toggles, the tag, Generate, Copy (about 6 to 9). Row 11: paste, Pair (2 to 3) | nothing | One sign-in sheet on the phone: Sign in (1), iOS's "wants to use tailscale.com" Continue (1), provider (1), credentials and a second factor (2 to 6, never shortened by a Safari session, because the sheet must be ephemeral) |
| Install the app | Get, confirm, open (3) | same (3) | same (3) |
| Scan | Camera prompt (1), scan, local-network prompt (1), a join of up to about 40 s | Camera prompt (1), scan; no local-network prompt, no join | Camera prompt (1), scan, local-network prompt (1), join |
| Match and allow | Compare six groups; Allow on the Mac (1) | same (1) | same (1) |
| **First pairing** | **about 30 to 38 actions, about 12 screens, 4 or 5 of them in Tailscale's admin console** | **about 14 to 21, 0 admin-console pages**; the first scan can wait on public DNS (§3.4) | **about 19 to 30 for him; plus about 10 to 12 for anyone else** |
| **Every later pairing** (new phone, reinstall, Remove and pair again) | Rows 10 and 11 again, about 15 to 18, and a stale tagged `tortie-phone` left for him to delete by hand | **about 9 to 11**; no device is added to his tailnet | the sign-in again, about 14 to 20 |
| Every 180 days | nothing (a tagged node never expires) | nothing | nothing, if the tag held |

The other routes, counted the same way:

| Route | First pairing | What it hides or breaks |
| --- | --- | --- |
| 2A, sign-in with no tag | about 19 to 30, then a sign-in every 180 days or 3 console clicks to turn expiry off | Breaks "confined to Tortie's door" (§4.2) |
| 3, the Mac mints, approves, shares or invites | none, because it cannot be built | Its credential variants add console setup rather than remove it (§5.1) |
| 4, iroh | about 11 to 13, the floor plus a probable local-network prompt | A relay somebody must run or pay for (§5.3) |
| 4, same Wi-Fi only | the floor plus a certain local-network prompt | Fails checklist row 14, "Leave the house" |
| 4, CloudKit | about 3, with no code and no match | No door and no per-phone confirm; conversation text in iCloud |

**The floor his rulings keep in every route, about 11 actions:** the app menu (2), the door's Allow, which
refusal 8 binds to a hash (1 to 2), Pair (1, folded into the Allow on a first pairing), the install and its
confirm (3), the camera prompt (1), the six-group comparison, and Allow on the Mac (1). The scanner starts as
soon as the pairing screen appears (`ios/Tortie/Screens/PairingScreen.swift:143`, `:182`), so no tap comes
before the camera prompt. Investigator C's figure of "5 or 6 actions" for his target left out the door's
confirm and the install, and is not reachable under his rulings.

**The person's steps under Route 1, as they would read after the build:**

1. On the Mac, open the Tortie menu and choose **Pair a Phone…**. Settings opens on Phone.
2. Read the lines. They say the door answers on the internet at `https://<mac>.<tailnet>.ts.net:8443`, through
   Tailscale Funnel, and only to a phone you pair. Press the one button that allows the door and shows the
   code.
3. **Only the first time on this tailnet:** Tortie says Tailscale needs your OK and offers **Open Tailscale**.
   Your browser opens Tailscale's own page. Sign in if it asks, then approve. Tortie carries on by itself.
4. A code appears with "Shuts in 3:00". There is no key field and nothing to paste.
5. On the iPhone, install Tortie and open it. Allow the camera and point it at the code.
6. Compare the six groups on both screens, then press **Allow** on the Mac.
7. The phone shows your sessions. The very first time, the Mac's public name can take a few minutes to be
   found; the phone keeps trying while the code is open.

## 3. Route 1: Funnel on the Mac, and the phone never joins the tailnet

### 3.1 Whether Funnel of a port exists on his Standalone Tailscale

**Tailscale's pages contradict each other, and the source sides with the newer, more specific sentences.
Nobody has driven it, and his measurement is the build's first gate.**

- **The variants table says no.** https://tailscale.com/docs/concepts/macos-variants (last validated
  Jan 5, 2026) has the row `Funnel | no | no | yes` across App Store, Standalone and open-source tailscaled.
  This is the row research 127 §2 relied on.
- **The same Funnel page says both.** https://tailscale.com/kb/1223/funnel (last validated Jan 20, 2026) says
  "To use Funnel on macOS, you must use one of the open source variants". A few lines later it says "You can
  only use Funnel to share ports if you installed Tailscale for macOS from the App Store or as a Standalone
  variant system extension".
- **The CLI page says ports work.** https://tailscale.com/kb/1311/tailscale-funnel (last validated
  Jan 26, 2026): "If you've installed Tailscale on macOS through the Mac App Store or as a Standalone variant
  system extension, you can use Funnel to share ports but not files or directories."
- **The source refuses only two things on the macOS extensions.** At v1.94.1 those are path serving
  (`cmd/tailscale/cli/serve_v2.go:1167-1169`) and a non-localhost target (`:1136-1137`, where
  `shouldWarnRemoteDestCompatibility` checks `IsMacAppStore() || IsMacSysExt()`). `NodeCanFunnel` has no
  variant check (`ipn/serve.go:610-618`), and neither does the ingress path (`ipn/ipnlocal/serve.go:443-503`).
  The same two refusals, and nothing more, sit at v1.102.2 (`serve_v2.go:1223-1224`, `:1254-1256`).
- **A third party drives Funnel from macOS.** gbrain (MIT) runs `tailscale funnel --bg`. Its issue of
  2026-09-28 shows a macOS node on 1.102.4 carrying `funnel`, `https` and `funnel-ports?ports=443,8443,10000`
  after "Add Funnel to policy" (https://github.com/garrytan/gbrain/issues/5599, read through
  api.github.com). The macOS variant is not named, and no traffic was shown to flow.

The judge ruled that the specific sentences and the code agree and the table is the outlier: "probably yes,
not settled".

### 3.2 Raw TCP keeps Tortie's own TLS and today's key pin, end to end

`tailscale funnel --tcp=8443 tcp://127.0.0.1:<port>` sets up a raw forwarder. In `ipn/serve.go:142-159`,
`TerminateTLS` is "only used if TCPForward is non-empty". `tcpHandlerForServe` wraps the connection in
`tls.Server` only when `TerminateTLS` is set, and otherwise copies bytes to the target
(`ipn/ipnlocal/serve.go:669-701`; the TLS arm is `:680-696`). Funnel's ingress connections reach that same
handler (`:488-502`). Tailscale's page agrees: "Funnel relay servers do not decrypt the traffic between public
devices and your device" (kb/1223).

**So the phone still pins the door's own public key, and the pin still fails closed.** Today's measurement of
that pin holds unchanged: a wrong pin, and the door served 0 requests (`build/p316/SPEC.md` §3.2). The
TLS-terminating modes, `--https` and `--tls-terminated-tcp`, **cannot be pinned**, because tailscaled makes a
fresh key for every certificate it gets (`ipn/ipnlocal/cert.go:646`, `ecdsa.GenerateKey` inside every
issuance).

Research 127 §7 item 11 refused `tailscale serve` because TLS ends in tailscaled, so a same-user process that
takes the port owns what the phone trusts (`docs/research/127-the-phone.md:987-995`). **That reason does not
carry over to raw TCP.** A squatter on the loopback port receives only TLS handshakes, and the phone's pin
refuses them. Item 10, that identity headers mean nothing, is irrelevant because nothing reads them.

### 3.3 What Funnel needs from a default Free tailnet, and whether a person can switch it on without JSON

**Funnel needs three things from the tailnet:**

- **the `https` capability.** `NodeCanFunnel` refuses with "Funnel not available; HTTPS must be enabled"
  (`ipn/serve.go:612`).
- **the `funnel` node attribute.** Without it the refusal is "\"funnel\" node attribute not set" (`:615`).
- **the port in `funnel-ports`.** `CheckFunnelPort` (`:623`) checks it.

**None of them needs a JSON edit.** Tailscale's documented default policy has no funnel attribute
(https://tailscale.com/kb/1192/acl-samples: `acls` and `ssh` only). When one is missing, `tailscale funnel`
fetches an approval URL from Tailscale and waits:

1. `verifyFunnelEnabled` calls `enableFeatureInteractive("funnel", …)` (`cmd/tailscale/cli/funnel.go:139-162`).
2. That asks LocalAPI `query-feature`, which forwards to Tailscale's `/machine/feature/query`
   (`ipn/localapi/localapi.go:1464-1510`).
3. The CLI prints the answer's text and URL (`cmd/tailscale/cli/serve_legacy.go:814-818`), then watches the
   IPN bus until both capabilities arrive.

kb/1223 says: "The command triggers a web interface that prompts you to approve enabling Funnel. After you
approve it, Tailscale will create valid HTTPS certificates for your tailnet and add a funnel node attribute".
MagicDNS is already on for anyone whose tailnet was made after 20 October 2022 ("Tailnets created on or after
October 20, 2022 have MagicDNS enabled by default", https://tailscale.com/kb/1081/magicdns). It is on for him,
because his Mac is `<mac>.tail2ddfe1.ts.net` (research 127 §2).

**Four traps, each needing its own sentence in Tortie:**

1. **Exit 0, having published nothing.** When the server says not to wait, the CLI prints the text and calls
   `os.Exit(0)` (`serve_legacy.go:820-826`). A person who is not an admin of the tailnet lands here, because
   only an Owner, Admin or Network admin may modify the policy (kb/1223).
2. **Shields-up.** With "Allow incoming connections" off, the configuration is refused: "Unable to turn on
   Funnel while shields-up is enabled" (`ipn/ipnlocal/serve.go:329-331`).
3. **Port 443 is checked even for `--tcp=8443`.** The CLI calls `verifyFunnelEnabled(ctx, 443)`
   (`serve_v2.go:410`, the same line at v1.102.2). A `funnel-ports` attribute that leaves 443 out refuses,
   although the default allows all three ports.
4. **The feature flow serves only two features.** "2023-08-09: The only valid feature values are \"serve\"
   and \"funnel\"" (`serve_legacy.go:786`). No approval page can create a tag. That matters to Route 2B,
   not here.

### 3.4 Limits, terms and time

These quotations are from kb/1223 unless another source is named.

- **Ports:** "Funnel can only listen on ports 443, 8443, and 10000." A port a person's own Serve already uses
  refuses another type ("want to serve %q, but port %d is already serving %q", `ipn/ipnlocal/serve.go:1709`).
  Tortie therefore takes 8443, with 10000 as the fallback, and leaves 443 to him.
- **Bandwidth:** Funnel "is subject to non-configurable bandwidth limits". No figure is published.
- **Beta:** "Tailscale Funnel is currently in beta." Beta has "no technical support obligations", and breaking
  changes happen "Yes, but with some warning" (https://tailscale.com/kb/1167/release-stages).
- **Plans:** "Tailscale Funnel is available for all plans." The Personal plan is "$0 Free forever" and "only
  suitable for non-commercial use" (https://tailscale.com/pricing). That condition is the same for today's
  design.
- **DNS:** "Public DNS records can take up to 10 minutes to show up for your tailnet domain." The code's
  window is 3 minutes (`POCKET_PAIRING_WINDOW_MS`, `src/main/pocket/pairing.ts:909`). The Mac cannot check
  public resolution itself, because MagicDNS answers the same name locally. This is a first-time cost as far
  as is known.
- **Terms:** https://tailscale.com/terms and https://tailscale.com/tailscale-aup say nothing specific to
  Funnel.

### 3.5 Tortie can drive it without holding any credential

Tortie already runs the pinned Tailscale program at an absolute path with no shell, for Add Machine
(`TAILSCALE_CANDIDATES`, `src/main/machines/tailscale.ts:57-61`, the app bundle's copy first). That program
reads the LocalAPI token itself: `safesocket/safesocket_darwin.go:65-80` sources the port and token from the
`sameuserproof` file. The serve-config write needs `PermitWrite` (`ipn/localapi/serve.go:45-49`), and the
admin-only path check is skipped on sandboxed macOS (`:85-91`).

**No auth key, API key or OAuth secret exists anywhere, and `tk` leaves the code.** Research 128 §3.2's refusal
therefore stands untouched rather than being re-examined. What is not in open source is whether the closed
macOS extension grants the command line that write without a prompt. The docs and gbrain say
`tailscale funnel` runs without sudo, and his measurement shows it.

### 3.6 The public port lives exactly as long as the child that asked for it

Run in the foreground (no `--bg`), the CLI puts its configuration under `sc.Foreground[sessionID]`
(`serve_v2.go:490-508`). `WatchNotifications` defers `DeleteForegroundSession(sessionID)`
(`ipn/ipnlocal/local.go:3181`), which removes the entry and rewrites the configuration
(`ipn/ipnlocal/serve.go:421-431`). The child ends on SIGINT (`serve_v2.go:395`, `signal.NotifyContext(ctx,
os.Interrupt)`) or when its bus connection closes. **So the door is on the internet exactly while Tortie holds
the child.** With `--bg` it would come back after every reboot ("Funnel will automatically resume sharing", the
CLI reference).

Two edges follow:

- **Nothing in the child watches for its parent's death** (§7.4).
- **A person's own `tailscale funnel reset` cancels foreground sessions** (`ipn/ipnlocal/serve.go:378-394`), so
  Tortie sees its child exit and must say so.

### 3.7 Serve alone can never reach a phone off the tailnet

`ServeConfig.TCP` is "the list of TCP port numbers that tailscaled should handle for the Tailscale IP
addresses" (`ipn/serve.go:52-54`). The only way in from outside is Funnel's ingress. That is peerapi
`/v0/ingress` (`ipn/ipnlocal/serve.go:1399-1466`), which refuses a peer without the ingress capability
(`peerapi.go:595-596`) and a target with no funnel entry (`serve.go:457-461`).

### 3.8 What it does to the door, the phone and what Tailscale sees

**The door must bind 127.0.0.1**, because the macOS extensions refuse a non-localhost target
(`serve_v2.go:1136-1137`). Three Phase 313 invariants go with that, and the signature becomes the whole
boundary, which `src/main/pocket/bind.ts`'s own header already concedes it is:

- **The tailnet `/32` bind goes.** It is `bind.ts:6-13`. Today loopback is a harness-only mode that a
  packaged build refuses (`HARNESS_LOOPBACK_ENV`, `bind.ts:121`, `:647-650`).
- **The self-origin refusal goes** (`bind.ts:254`). Every Funnel connection arrives from 127.0.0.1 through
  `SystemDial` (`ipn/ipnlocal/serve.go:673`).
- **The phone's address pin goes.** It is `address` in the hashed phone fields (`pairing.ts:183-184`), and the
  verifier's `phone.address !== input.from` (`:1506`).

**The phone loses its whole network stack:**

- TailscaleKit, about 23.2 MB of device binary (`build/tailscalekit-release.json`,
  `deviceBinaryBytesApprox: 23245688`), and `ios/Tortie/Tailnet/Node.swift`, 899 lines.
- The Go build and vendor step, the no-logs patch and the flow-log refusal.
- The local-network key.

The one App Transport Security key changes from `100.64.0.0/10`, or the client moves to `NWConnection`, which
needs no key (§9, item 8). Refusal 6 had been read literally and bent by 316.3 to carry Go inside the phone
app; it is whole again.

**The phone is confined by construction, and more strongly than today.** Today its node holds a map of the
whole tailnet under the default policy, and TailscaleKit's loopback is "a SOCKS5 proxy onto the tailnet"
(`docs/research/128-the-phone-before-any-swift.md:180-199`). Under Route 1 it resolves one public name and
opens one TLS connection to Funnel's relay. His tag, grant and narrowed default rule (checklist row 3) become
unnecessary. Reverting them is his, never Tortie's.

**What Tailscale still sees.** Every byte crosses Funnel's relay. With TLS passing through, the relay sees the
phone's public address, the Mac's name in the SNI, timing and sizes, and no content (kb/1223; the relay passes
`Tailscale-Ingress-Src` and `-Target`, `ipn/ipnlocal/serve.go:1427-1443`). Turning HTTPS on means
acknowledging that "your machine names and your tailnet DNS name will be published on a public ledger", though
"only devices where you run tailscale cert will have their certificate in the public ledger"
(https://tailscale.com/kb/1153/enabling-https). Raw forwarding never calls `GetCertPEM` (`serve.go:680-696`), so
no certificate should be issued for the Mac. Whether one is, is unmeasured (§9). The Mac's name becomes
publicly resolvable either way.

**The Mac's 1.102 line matches the pin on everything Funnel uses.** `NodeCanFunnel` is unchanged (`ipn/serve.go:654-662`
at v1.102.2). It adds `unix:` socket targets for TCP (`serve_v2.go:1306`), with PROXY refused on them
(`:1316`). Whether the sandboxed extension can reach a socket in his home is unmeasured and not needed.

## 4. Route 2: the phone signs in instead of using a minted key

### 4.1 What the pinned code already supports

Leaving the auth key empty starts web authentication, and `up()` blocks until the login succeeds (libtailscale
`59d4bb82` `swift/TailscaleKit/TailscaleNode.swift:13`, `:131-133`). The auth URL is readable from tsnet's
in-memory LocalAPI without the SOCKS proxy (`:141-165`; `AuthURL` at `ipn/ipnstate/ipnstate.go:48`; tsnet
calls `StartLoginInteractive` on `NeedsLogin`, `tsnet/tsnet.go:763-767`). Tailscale's tsnet page says the start
"will result in creation and display of a Tailscale authentication URL"
(https://tailscale.com/docs/features/tsnet.md). The URL can be completed in any browser (Tailscale's QR login
how-to, validated Sep 30, 2025), so the app can show it in Apple's `ASWebAuthenticationSession` and close the
sheet itself when the node reaches Running. Today's `Node.swift` refuses a start with no key on purpose (rule
(d), `:26-29`, `:554`).

### 4.2 Route 2A, no tag: the simplest sign-in, and it breaks the confinement ruling

**Without a policy edit, Tailscale cannot confine a signed-in phone.** It is a device of his own identity, and
the default policy "lets all devices in the tailnet access all other devices in the tailnet"
(https://tailscale.com/docs/reference/examples/acls.md). Tags need a policy edit ("Before assigning a tag to a
device, you must create the tag in the tailnet policy file", https://tailscale.com/docs/features/tags.md).
`autogroup:self` is itself a policy selector, and it would confine the phone to all his devices rather than to
the door.

**On his tailnet as he edited it on 2026-09-29, an untagged phone undoes his grant.** His narrowed default rule
(`src: autogroup:member`) covers every member's devices, and a phone signed in as him is one. The grant confines
only `tag:tortie-phone` (`build/p316/CHECKLIST.md` row 3). This is an inference from Tailscale's definitions; the
console's rule preview would show it.

**A user-owned phone also learns more.** Its map names "all devices authenticated with the same user identity"
(https://tailscale.com/docs/concepts/device-visibility.md). It also expires after 180 days by default
(https://tailscale.com/docs/features/access-control/key-expiry.md), and today's `Node.swift` would treat that as
a lost node and discard its state (`:292`, `:432-449`, `:626-633`).

**Tailscale's own guidance points the other way.** It says not to use tags to "authenticate end-user devices,
such as laptops or mobile devices" (tags.md). Its stated risk is a multi-user tailnet, which matters little on
his one-person tailnet.

### 4.3 Route 2B, a sign-in that asks for the tag

tsnet has `AdvertiseTags` (`tsnet/tsnet.go:164-168`, copied into prefs at `:750`, sent as `RequestTags` at
`ipn/ipnlocal/local.go:5562`). libtailscale's C API does not expose it (`tailscale.h:65-76`), so 2B needs a
second Tortie-authored patch beside `NO_LOGS_PATCH` (`build/build-tailscalekit.mjs:427-467`).

An Owner, Admin or Network admin "can apply any tag". A tagged device's "key expiry is disabled by default".
But "advertising a tag on the client doesn't guarantee that the control server will allow the node to adopt
that tag" (`tsnet.go:166-167`). **For a new person 2B still needs today's policy paste**, because only the
policy file can create a tag (§3.3, trap 4).

### 4.4 What a sign-in on the phone costs that the investigator missed

- **A sign-in that leaves Tortie is lost.** The new node key lives only in memory until the login completes
  (`control/controlclient/direct.go:779-786`), and a restart makes a new URL (`:565-567`). The node stops when
  the app goes to the background (`Node.swift` rule (a), `:397`). A second factor that switches apps, such as
  a Google prompt, GitHub Mobile, Microsoft Authenticator or an e-mail link, therefore starts the sign-in
  again.
- **Device approval makes `Up` wait forever.** It waits in `NeedsMachineAuth` and never fails
  (`tsnet/tsnet.go:379-429`, `ipn/ipnlocal/local.go:5798-5800`). An interactive sign-in cannot be pre-approved;
  only an auth key can
  (https://tailscale.com/docs/features/access-control/device-management/device-approval.md).
- **It adds a login screen.** App Review guideline 2.1(a)'s demo-account sentence would then apply at store
  time, which research 128 §4 said it did not (`docs/research/128-the-phone-before-any-swift.md:332`).

## 5. Routes 3 and 4

### 5.1 Route 3: the Mac's signed-in Tailscale does the joining

**It cannot be built.** The whole LocalAPI route set at v1.94.1 is the static table
(`ipn/localapi/localapi.go:70-91`) plus every `Register` call, which Investigator C and the simplicity adversary
listed independently and agree on. None of them mints, approves, shares or invites. The two that look close
work only under Tailnet Lock: `tka/wrap-preauth-key` wraps an existing key, and `tka/sign` signs a node key.
The CLI's subcommands (`cmd/tailscale/cli/cli.go:245-282`, and the current reference, validated Jul 30, 2026)
have none either. Device approval is console-only, and sharing starts on the Machines page (sharing.md lines
21-22 and 36).

**The only key minting in the client spends a credential an admin made in the console**
(`cmd/tailscale/cli/up.go:101-104`, `:605-636`; `feature/identityfederation/identityfederation.go:59-80`;
`client/tailscale/keys.go:102-108`). Both of its paths default to ephemeral (`identityfederation.go:92-95`,
`oauthkey.go:31-32`).

**Two facts are new since research 128, and neither reaches the target:**

- **Workload identity federation keyed to the Mac node's own ID token.** The token exists
  (`/localapi/v0/id-token`, `localapi.go:147`, `:348-388`). Its CLI is hidden and needs
  `TAILSCALE_USE_WIP_CODE=1` (`cmd/tailscale/cli/id-token.go:18-25`). No source or page names its issuer.
  Setting it up is an extra console form, and the tag edit stays (trust credentials "must select one or more
  tags"). Behind a token every admin-group process can read, it would make every agent a key minter
  (`safesocket_darwin.go:236-264`).
- **OAuth apps with `auth_keys:create:once`.** The feature is alpha, makes user-owned devices "that carry the
  full identity of the consenting user", and needs an admin token and a `tskey-app-…` secret Tortie would hold
  (https://tailscale.com/docs/features/oauth-apps/device-provisioning.md, validated Jun 24, 2026).

**Node sharing would confine the phone to one Mac with no policy edit**, but "only users can accept machine
shares" (sharing.md line 36), so the phone would have to be a user on another tailnet.

### 5.2 Route 4, same Wi-Fi

Research 127 ranked this and Phase 313 refused it ("No home Wi-Fi bind", `docs/BACKLOG.md:33274`; `bind.ts:8-14`,
`:24-35`). It fails row 14. As a first step in front of Tailscale it saves nothing, because a key or a sign-in
is still needed.

### 5.3 Route 4, iroh and CloudKit

**iroh** dials an Ed25519 key rather than an address and ships an MIT or Apache-2.0 Swift xcframework
(https://github.com/n0-computer/iroh-ffi; https://docs.iroh.computer/concepts/endpoints). Every connection's
setup passes through a relay ("When two endpoints first connect, they exchange network information through the
relay"), and n0's public relays are "suitable for development and testing", "rate-limit traffic" and "carry no
uptime or performance guarantees" (https://docs.iroh.computer/concepts/relays). So a shipped Tortie would pay
n0 or run a relay: "no mandatory cloud relay run by Tortie" broken in its letter. A NodeID in the code is also
a permanent address.

**CloudKit** needs no code at all when both devices share an Apple ID. It replaces the door with records in
iCloud, readable by Apple unless Advanced Data Protection is on (Apple's `CKRecord.encryptedValues` page), and
has no per-phone confirm. It is named to rank it, not proposed.

## 6. What the attack killed

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| Research 127 §2: Funnel is "not available on his variant … not a candidate" | The variants table is contradicted by kb/1223, kb/1311 and the source (§3.1) | Overturned on the variant fact, kept on the public-internet fact, which is now a trade put to him |
| A: the door is a loopback listener in Electron main, and PROXY v2 recovers the phone's address | The security adversary: a pre-signature parser in the process that holds credentials, on the public internet (§7.1); PROXY is forgeable by any local process (§7.3) | Mutual TLS and a separate process are build conditions; PROXY is a rate-limit key only |
| A: first-scan failure is "pull to retry" | The simplicity adversary: public DNS up to 10 minutes against a 3-minute window (§3.4) | The funnel starts at the door's Allow, not at Pair; the phone retries silently inside the window; the window grows only if his measurement says so |
| A: he habitually runs `tailscale serve` on 443 | Nothing in research 127 or the backlog shows it | Struck. 8443 stands on its own |
| C: his target is about 5 or 6 actions | The simplicity adversary: the door's confirm and the install were left out | The floor is about 11 (§2) |
| B: route 2 is 11 to 16 actions, with a Safari-shared sign-in sheet | The install confirm and a second factor were left out; the shared sheet leaves a `login.tailscale.com` session on the phone | 19 to 30, with an ephemeral sheet |
| B: 2B keeps every ruling | Control may ignore an advertised tag, and then 2B silently becomes 2A (`tsnet.go:166-167`) | Kept only if the phone reads `Self.Tags` after Running and refuses without the tag |
| B: 2B is simple | The feature-approval flow serves only serve and funnel (`serve_legacy.go:786`) | Simple for him alone; anyone else pastes the policy |
| C: iroh ranks first on taps | The count ties Route 1 only by hiding a relay contract | Below 2B, not pursued |

**Held under attack:**

- The pass-through pin defeats the relay, DNS spoofing and a local process redirecting the funnel.
- The signature binds each request to a secret that never crosses the wire (`pairing.ts:1401-1440`).
- A nonce is spent only after a valid signature (`pairing.ts:1537-1539`).
- Route 3 does not exist, and research 128's refusal stands.

## 7. What the security adversary found in Route 1, and what the build must do about it

### 7.1 A parser that runs before any signature, inside Electron main, on the internet

The door is `node:https`'s `createServer` inside main (`src/main/pocket/bind.ts:480-500`).
`src/main/capabilities.ts` imports `./credentials` (`:51`) and the pocket door (`:119-121`) into the same
process. `src/main/pocket/server.ts`'s refusals 2 to 5 (the `Host` header, `new URL`, the route table, and the
`/pair` body up to 4 KiB) all run before refusal 6, the signature (`server.ts:197-236`). Under Funnel, any host
that knows the name reaches them. A flaw in Node's TLS, llhttp, URL parsing or `JSON.parse` would then be code
execution in the process that writes Claude Code's keychain item.

**The judge made two conditions of the build.** Mutual TLS outside the pairing window, so no stranger's byte
reaches llhttp. And the listener in its own Tortie-owned process that imports nothing from credentials. A
`utilityProcess` running Tortie's own code is within refusal 1.

### 7.2 Cheap denial of service

The door caps connections at 32 (`MAX_CONNECTIONS`, `bind.ts:99`) and gives 10 s each to the handshake and the
headers (`:102-108`). Every Funnel connection arrives from 127.0.0.1, so no limit per source is possible without
PROXY v2. About three new idle sockets a second keep the phone out. Every handshake costs an ECDSA P-256
signature on main's thread (`tls.ts:448`, `generateKeyPairSync('ec', …)`). The refusal log writes one line per
reason per process (`server.ts:175-181`). Moving the listener out of main keeps a flood off the thread that draws
his UI.

### 7.3 Two of the three layers that refuse a local agent go, and PROXY cannot restore them

Behind a loopback bind:

- every source is 127.0.0.1;
- `/pair` answers `allowed` to `w.presentedFrom === from` (`pairing.ts:1162`);
- the verifier's address check (`:1506`) passes for any process on the Mac.

Any local process that connects to the loopback port writes a PROXY header itself, and a cellular address moves
anyway.

**So PROXY is a rate-limit key only.** The address leaves the hash and the verifier. The `/pair` poll is keyed
on proof of the presenter's key. The verifier asks instead that the request's phone is the phone whose client
key completed this connection's handshake.

### 7.4 The orphan

A foreground funnel ends only on SIGINT or when its bus watch closes. Nothing watches its parent. So a crashed
or SIGKILLed Tortie leaves the child publishing a public port that forwards to a loopback port where nothing
listens, and any process running as him could bind that port. The next launch's funnel is refused while the
port is held ("listener already exists for port %d", `ipn/ipnlocal/serve.go:1686`).

A squatter on the dead port receives only handshakes the phone's pin refuses, so this is a denial of service,
not a breach. **The build records the child's pid, start time and argv, and at launch ends an orphan it can
prove it started. It never uses `--bg`.** This is the orphan class CLAUDE.md records from 2026-09-02.

### 7.5 A profile switch could publish the door on another tailnet

The serve configuration is stored per profile (`ipn/ipnlocal/serve.go:370-373`). Today the hash includes
`bindAddress`, so a different tailnet's 100.x address asks again by accident of design. Under Route 1, the
tailnet name, the public name and the port go into the hash. The child refuses to start or restart when any of
them has moved.

### 7.6 The standing Funnel right

Approving Funnel adds `nodeAttrs funnel` for `autogroup:member` ("By default, it lets any users in the
autogroup:member autogroup to use Funnel", kb/1223). A `nodeAttrs` target is "a tag …, user …, group …, or `*`",
never one device (https://tailscale.com/docs/reference/syntax/policy-file). Once approved,
`enableFeatureInteractive` returns at once (`serve_legacy.go:804-806`). So any process on any of his devices can
later publish a port with no human step. On the Mac, the token file that allows it is readable by the admin
group (`safesocket_darwin.go:236-264`). This is the second trade put to him, and Tortie never causes it without
the door's Allow naming it.

### 7.7 A leaked code, compared honestly

Under Route 1 anyone who sees the code can present from anywhere during its 3 minutes. That includes a screen
share, or a screenshot synced to Photos. A second presenter replaces the first (`pairing.ts:1170`), and the real
phone re-presents every 2 s (`ios/Tortie/Door/Pairing.swift:289`), so the Mac's card flips. The Allow is bound
to the hash of the card drawn (`pairing.ts:527`). Only the six-group comparison refuses a card that did not
change.

**Against today this is an improvement.** Today's code carries `tk`, a pre-approved tagged key that lasts up to
90 days because row 10 sets no expiry (§10). Route 1's code carries no credential. The pairing screen should say
the code is not for a shared screen.

## 8. The judge's ranking, choice and rulings

### 8.1 The ranking

| Rank | Route | First pairing | Verdict |
| --- | --- | --- | --- |
| 1 | **Funnel on the Mac, the phone off the tailnet** | about 14 to 21, then 9 to 11 | **Chosen**, on his yes to the trades and his measurement, with §9's conditions |
| 2 | Sign-in with `tag:tortie-phone` (2B) | about 19 to 30 for him; more for anyone else | **Fallback**, with the security adversary's three conditions: read `Self.Tags` and refuse without the tag, an ephemeral sheet, and the node's state under `NSFileProtectionComplete` |
| 3 | Sign-in with no tag (2A) | about 19 to 30, then 180-day expiry | **Refused** unless he trades "confined to Tortie's door" |
| 4 | iroh | about 11 to 13 | **Not pursued**: a relay somebody must run |
| 5 | Same Wi-Fi | the floor plus a prompt | **Refused**: fails row 14 and Phase 313's refusal |
| 6 | CloudKit | about 3 | **Refused** as a different product: no door, no per-phone confirm |
| 7 | The Mac mints, approves, shares or invites | none | **Refused**: it does not exist; its credential variants were refused by research 128 |

### 8.2 Route 1 against his standing rulings

| Ruling | Kept? | What he trades |
| --- | --- | --- |
| "Phone confined to tortie" (2026-09-21, `docs/BACKLOG.md:36700`) | **Kept, more strongly**: the phone has no tailnet identity, map or proxy | The DOOR's audience grows from his tailnet to the internet; his ruling's reason, "Tailscale enforces the grant … rather than the app being trusted to behave", now holds for the phone and not for the door |
| The phone reads records, never the terminal | Kept | Nothing |
| Embed rather than require a second app | Kept, with nothing left to embed | Nothing |
| No mandatory cloud relay run by Tortie | Kept: the relay is Tailscale's, as DERP already is | A mandatory hop through a beta service whose bandwidth limits are unpublished |
| Refusal 1, no third-party code in a Tortie process | Kept | Tailscale's CLI runs as a child process, as tmux and ssh do |
| Refusal 6, no third-party native code in the bundle | Restored for the phone app | Nothing |
| Refusal 8, a human confirms the bytes, bound to a hash | Kept, if the tailnet name, public name, port and program path are hashed | Tortie becomes a writer of his serve configuration, which he owns |
| Never hold a credential it does not need | Improved: no key anywhere | Nothing |
| Tailscale's logs off on the phone | Moot: no Tailscale code on the phone | Nothing |
| "Tortie never writes his policy file" | Kept in its letter: he approves on Tailscale's page | Tortie starts the change, and it covers every member device |

### 8.3 The rulings on each disagreement

1. **Does Funnel of a port exist on his Standalone 1.102.x?** Probably yes, not settled. His measurement is
   the first gate (§3.1).
2. **How many actions is his target?** The simplicity adversary is right: about 11. "Just scan" means no
   Tailscale steps, not no Tortie steps.
3. **Does Route 1 break "phone confined to tortie"?** No, it keeps it more strongly. The ruling is about what
   the phone can reach. The wider audience of the door is a separate trade, and the door's Allow must name
   the internet.
4. **Is "no mandatory cloud relay run by Tortie" kept?** Yes. The relay is Tailscale's and cannot decrypt raw
   TCP.
5. **Is the pre-signature parser in Electron main a blocker?** For Route 1 as Investigator A drew it, yes.
   Mutual TLS and a separate process are conditions, not options.
6. **PROXY v2: identity or rate limit?** A rate-limit key only. The address pin leaves the hash and the
   verifier.
7. **Is a leaked code worth more under Route 1?** Against 2B yes; against today no, because today's code
   carries a key.
8. **Does Route 1 lower the bar for stealing the phone's keys from two secrets to one?** True in its letter,
   small in fact: today's second secret, the node state, has no file-protection class (§10). A client TLS key
   that cannot be extracted restores two, if it measures as working.
9. **The standing Funnel right?** Unavoidable in Route 1, and the second trade. Tortie takes 8443 (10000 as
   the fallback) and never sends `funnel reset` or `serve reset`.
10. **Exit 0 with nothing published?** Confirmed. Any exit that did not leave a live session is a refusal with
    its own sentence.
11. **How long does the child live?** As long as Tortie holds it, and longer after a crash. The build handles
    the orphan.
12. **Public DNS against the 3-minute window?** Real, and first-time as far as known. The funnel starts at
    the door's Allow, the phone retries silently, and the window grows only if he measures more than
    3 minutes.
13. **App Transport Security on a name that differs for every person?** The build measures a `ts.net`
    subdomain exception on the iOS 18.3 Simulator the way `build/p316/SPEC.md` §3.2 did. If it fails, the
    client moves to `NWConnection` with a verify block, which answered 200 under every plist there.
14. **Route 3?** It does not exist.
15. **iroh?** Below 2B, not pursued.
16. **2B's three conditions?** Adopted in full if 2B is ever built. The file-protection point applies to
    today's build and becomes moot under Route 1.
17. **The upload failure?** Not diagnosed. No route choice rests on it.

## 9. The conditions the build must meet

These come from the judge, and none of them adds a tap:

1. **Mutual TLS outside the pairing window.** A connection whose client key is not a paired phone's is
   destroyed at the end of the handshake, before an HTTP byte is parsed. A connection with no client
   certificate reaches `/pair` alone, and only while a window is open.
2. **The listener runs in a Tortie-owned `utilityProcess` that imports nothing from credentials.** Main keeps
   the seals, the verifier and the answers.
3. **PROXY v2 is a rate-limit key only.** The address pin leaves the hash and the verifier, and the `/pair`
   poll is keyed on proof of the presenter's key.
4. **The tailnet name, public name, port and the Tailscale program's path go into the confirm hash.** The child
   refuses to start or restart when any of them has moved.
5. **Never `--bg`, never `funnel reset` or `serve reset`.** The child ends in a `finally`. An orphan Tortie
   can prove it started is ended at launch.
6. **Port 8443, with 10000 as the fallback.** 443 is left to the person.
7. **Each Tailscale refusal gets its own sentence:** an approval needed, an exit 0 with nothing published,
   shields-up, `funnel-ports` missing 443, a port taken, Tailscale not running.
8. **The phone's client uses `NWConnection`** unless the `ts.net` exception and a client identity both measure
   as working through `URLSession` on the iOS 18.3 Simulator.
9. **The funnel starts at the door's Allow, not at Pair.** The phone retries silently inside the window. On a
   first pairing, the door's Allow and Pair are one press.

## 10. Found on the way, and not this phase

1. **Today's code is raw JSON that carries `tk`, the tailnet key, as plain text.** The code is built at
   `src/main/pocket/pairing.ts:1095-1105`. The app registers no URL scheme or associated domain (a grep of
   `ios/Tortie` finds none), so pointing the iPhone's own Camera at it cannot open Tortie. It does show the text
   to whatever the Camera offers to do with text. What iOS offers was not measured.
2. **The key checklist row 10 mints has no expiry set, so it lasts Tailscale's maximum of 90 days if the real
   phone does not spend it first** (research 127 §2 quotes "between 1 and 90 inclusive",
   https://tailscale.com/kb/1085/auth-keys). Setting the expiry to 1 day in row 10 closes most of that at no
   cost in taps, for as long as today's build is used.
3. **Row 4, which checks that network flow logs are off, is always a no-op on the Free plan.** Flow logs are a
   Premium feature (https://tailscale.com/pricing).
4. **The phone's node state has no file-protection class.** It sits in `Application Support/tailnet`
   (`ios/Tortie/Tailnet/Node.swift:16-21`, `:174`), `ios/Tortie/Tortie.entitlements` is an empty dict, and the
   pairing keys are `WhenUnlockedThisDeviceOnly` (`ios/Tortie/Door/Keys.swift:164`). This is moot under
   Route 1, and it binds 2B.
5. **The upload failure.** His relayed message, "separately the upload failed [Image #9]", reached no agent
   with its image. Two facts were read, and neither is a diagnosis:
   - TailscaleKit's minimum iOS is 18.1, which equals the app's deployment target.
   - The vendored device framework's `Info.plist`, read in his checkout, carries `CFBundleIdentifier`
     `io.tailscale.Tailscale`, version `1.0` (`1`) and `CFBundleSupportedPlatforms` `iPhoneOS`.

   Route 1 would remove the framework, but the failure is not blamed on it until the Organizer's error text is
   read.

## 11. What stays unmeasured, and the one measurement for each

| Unmeasured | Why it matters | The one measurement |
| --- | --- | --- |
| Whether Funnel of a port works on his Standalone 1.102.x | Every Route 1 count depends on it | **His five minutes (§13, question 2)**: `openssl s_server` on `127.0.0.1:9443` with a throwaway certificate, `/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --tcp=8443 tcp://127.0.0.1:9443` in the foreground, then Safari on the iPhone over cellular to `https://<mac>.<tailnet>.ts.net:8443`. A certificate warning naming `CN=funnel-test` proves it, and proves TLS ends at the local listener |
| What Tailscale's approval page shows, and how many clicks | The first-time count | The same run: count the clicks |
| Whether the CLI may write the serve configuration without a prompt from the closed extension | Tortie must drive it unattended after the Allow | The same run |
| Public DNS time for his Mac's name, and how long a phone caches a first miss | Whether the first scan outlives 3 minutes | The same run: minutes from Approve until the phone resolves; `dig SOA ts.net` from any machine gives the negative-cache time |
| Whether a raw `--tcp` Funnel issues any certificate for the Mac | Whether the name lands in Certificate Transparency | After the run, look the name up on crt.sh |
| Latency and reliability through Funnel's relay, from cellular and hotel Wi-Fi | Whether a pull feels worse than today | Phase 330's checklist times a pull on each build side by side, if today's build is on his phone |
| Whether the foreground funnel survives Tailscale's Sparkle update and a sleep and wake | Whether Tortie must re-run the child, and says so | Phase 330's checklist: sleep the Mac, wake it, pull on the phone |
| `URLSession` to a `ts.net` name under a subdomain exception on iOS 18.x | The client choice | Phase 330's first step, on the iOS 18.3 Simulator, the way `build/p316/SPEC.md` §3.2 measured it |
| A client identity for mutual TLS through `URLSession` or `NWConnection` on iOS 18 | Condition 1 | The same first step; the Secure Enclave on his device, in the checklist |
| Funnel's relay limits in front of a node, and what scanners do to a public door | How cheap §7.2's denial of service is | Only after exposure: the door's refusal log |
| Whether today's node can reach the Mac over a shared Wi-Fi with no internet | If it can, Route 1 is worse there | Not measured; named so it is not assumed |
| Route 2's items: whether the sign-in sheet backgrounds the app, and what control does with an advertised tag | Decides 2B | Only if 2B is built: a debug build that presents the auth URL and logs the lifecycle |
| iroh's size, relay limits and price; CloudKit's latency and entitlement | Ranking only | Not pursued |

## 12. What this queues

**Phase 330, the build that delivers Route 1.** Its full entry is written in the house shape and appended to
`docs/BACKLOG.md` by the main session. It does not start until he answers §13's first question yes and his
measurement shows the `CN=funnel-test` warning. If either fails, Route 2B is written as its own entry with the
security adversary's three conditions.

## 13. The rulings it needs from him

1. **Do you accept Route 1's trades?**
   - The phone stays confined, since it has no tailnet at all, but the door moves from your tailnet to the
     internet at `<mac>.<tailnet>.ts.net:8443`. Only Tortie's mutual TLS and signatures stand in front of it,
     in a separate process that holds no credential.
   - Approving Funnel once lets any process on any device signed in as you, agents included, publish a port to
     the internet with no further prompt, and Tailscale cannot scope that to one Mac without tagging it.
   - The phone depends on Funnel, which Tailscale labels beta and whose bandwidth limits it does not publish.

   **Default:** if you say no, Route 2B is built instead. With no answer, nothing starts, because the
   measurement below itself approves Funnel on your tailnet.
2. **If yes, run the one measurement no agent may run, about five minutes.** Run each command in Terminal:
   - `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout /tmp/k.pem -out /tmp/c.pem -subj /CN=funnel-test -days 1`
   - `openssl s_server -accept 127.0.0.1:9443 -cert /tmp/c.pem -key /tmp/k.pem -www`
   - in a second tab: `/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --tcp=8443 tcp://127.0.0.1:9443`

   Approve on Tailscale's page if it prints a URL. Then, on the iPhone with Wi-Fi off, open Safari to
   `https://<mac>.<tailnet>.ts.net:8443`. Please report:
   - whether a warning naming `CN=funnel-test` appears;
   - how many clicks the approval page took;
   - how many minutes passed before the phone could resolve the name;
   - whether crt.sh lists a new certificate for the Mac's name.

   Press Control-C in the funnel tab when done. **Default:** Phase 330 starts with your report as its first
   gate. If the warning does not appear, it stops and Route 2B is written.
3. **The upload failed, and your screenshot did not reach any agent.** Could you paste the Organizer's error
   text, or attach the image again? **Default:** nothing about the upload changes in this decision.
4. **Should the code become a universal link on tortie.sh (`https://tortie.sh/pair#<payload>`)?** Then the
   iPhone's own Camera opens Tortie straight into pairing, which saves the in-app camera prompt and the step of
   opening Tortie. It needs an `apple-app-site-association` file on your site. The payload stays in the
   fragment, which never reaches the server. If the app is not installed, Safari opens the page, and the
   one-shot secret sits in Safari's history for its 3 minutes. **Default:** not in Phase 330; the in-app
   scanner stays.
