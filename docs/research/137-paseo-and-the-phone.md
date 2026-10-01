# 137. Paseo and the phone: how its mobile app compares with Tortie's

Written 1 October 2026 against the tree at `0699e08d` ("docs(backlog): his rulings on remote scrolling's two
questions"). This is documents only. Nothing was installed, cloned into his home, signed into, paired or run,
and no Electron and no Simulator was started. Nothing of his was sent anywhere.

Paseo was read in public only, on 1 October 2026: its site, its docs, its App Store and Google Play listings,
its GitHub issues, Hacker News, and its source at `getpaseo/paseo` commit
`b5b43edd65cc1253493b13cca3941dd390df6ef3` (committed 1 October 2026, 14:35 UTC) and `getpaseo/paseo-relay`
commit `3fc41c96c8c63f3a7109e832899cc57d473c4531` (22 August 2026). Copies of the fetched files are in the
session's scratchpad under `r137/`, and are not in the tree. Every Tortie claim is a `file:line` in the tree at
`0699e08d`.

The round. Four investigators each owned a lens: Paseo as a product, Paseo's transport and keys, what people
say about Paseo's phone app, and Tortie's phone as built. Two adversaries then attacked the four reports, one
against every Paseo claim and one against every Tortie claim. They fetched pages again, read the code again
and checked DNS. This document uses only claims an adversary confirmed or corrected. The writer also checked 3
things: the plugin code in Paseo's phone app, from the saved source, and issues #3464, #949 and #3521 on
GitHub. Section 6 lists what the attack refuted and what nobody could confirm, so no later round re-derives
it.

This answers his question of 1 October 2026, in his words: "how, compared to paseo does our phone app
implementation compare / contrast". Paseo is one of the names in the tweet research 70 quotes
(`docs/research/70-spreading-the-word.md:88`). Tortie's own phone research never examined it: research 127's
table has 16 named products and a 17th row for the rest of the sweep, and Paseo is in neither
(`docs/research/127-the-phone.md:194-215`).

## 1. The answer first

Paseo and Tortie give the phone opposite jobs. Paseo's phone app is most of its desktop app on a small screen:
it starts, stops and talks to agents, answers their permission requests with buttons, and shows diffs, files
and a terminal, on iPhone, iPad, Android and the web. Tortie's phone app only reads today, showing what is
waiting on you, how each session is going and its conversation, and nobody but the operator can install it
yet. Paseo is ahead on reach and breadth: it is free on both app stores with no account, one phone can watch
several computers, and its relay needs no Tailscale and no open port. Tortie is ahead on trust: each phone is
paired inside a 3 minute window, holds its own key, is approved on the Mac and can be removed alone, while a
Paseo pairing link is a lasting password that gives whoever holds it full control, with no list of devices
and no way to remove one. Tortie's alert names the session and never what the agent said, while Paseo sends
up to 220 characters of the agent's reply or the tool's input through Expo to Apple or Google, and sends no
alert at all if any client was active in the last 3 minutes. Paseo's phone also runs plugin JavaScript that
the computer sends it, which Tortie's first refusal rules out. Against Tortie: its door answers the public
internet through Tailscale Funnel, a tailnet admin must approve that, and the first pairing takes 14 to 21
steps and can wait minutes.

## 2. Which Paseo

Several products are called Paseo. The agent tool is `getpaseo/paseo`, at paseo.sh, made by one person,
Mohamed Boudra (Ziani). It is the one he means, for 3 reasons:

- its own description is "Orchestrate multiple coding agents from desktop and mobile"
- its App Store listing is "Paseo - Remote Coding Agents", sold by Mohamed Boudra Ziani
- its own site has comparison pages for Orca, Conductor, Superset and Happy Coder, the same field as the
  tweet's list (omniagent, paseo, orca, t3code, herdr, cmux)

The others are a step counter on F-Droid (`ca.chancehorizon.paseo`), a residents' app for an Austin apartment
block (Paseo ATX) and audio-tour apps. A Hacker News commenter, not the author, pointed out the F-Droid clash.
The many GitHub repositories called `paseo` are forks of `getpaseo/paseo`.

What Paseo is. A daemon runs on the computer and manages the agents. A desktop app, a phone app, a web app and
a command line connect to it. The phone app is an Expo (React Native) app built for iOS, Android and the web
from one codebase, and the desktop app is an Electron wrapper around the web build that bundles the daemon
(`docs/architecture.md:37-39`).

## 3. Side by side

| | Paseo (read at `b5b43ed`, App Store 0.10.2) | Tortie (tree at `0699e08d`, TestFlight 1.0.0 (3)) |
| --- | --- | --- |
| Install | Free on the App Store (iOS 15.1 or later, 4.9 from 90 ratings) and Google Play (10K+ downloads, 4.9 from 241 reviews), an APK on every GitHub release, and a public TestFlight beta. Needs the Paseo daemon running on the computer, which the desktop app bundles | Internal TestFlight only, uploaded by the operator. No public Mac release carries the door: the latest is v0.110.0 (21 September 2026) and the iPhone items are under Unreleased. The plan is a public TestFlight link, then the App Store (research 136) |
| Pairing | Scan a QR code or paste a link holding the server id and the daemon's lasting public key. It has no expiry, no one-use secret and no approval on the computer. Paseo's own words: "Anyone with it can access this daemon." Since 0.11.0-beta.1 (1 October 2026, not yet in the store build) the phone asks before it connects to a new or changed host | One QR code on the Mac, open for 3 minutes, with a one-use 128-bit secret. Both screens show 6 groups of 4 characters to match, then Allow on the Mac, which confirms a hash of what the door may do. The first time takes about 14 to 21 steps across the Mac, Tailscale's page and the phone, and can wait minutes for the Mac's public name (about 7 in his case) |
| Transport | Two routes. The relay, off on new installs since 0.3.0: `relay.paseo.sh`, which today resolves to an Elixir relay on Fly.io, encrypted end to end with NaCl box, the daemon only dialling out. Or a direct WebSocket, usually over Tailscale with "Use SSL" off, with no encryption of Paseo's own. The phone makes a new key for every connection, so the daemon cannot tell phones apart | The door listens on 127.0.0.1. Tortie runs the Mac's own `tailscale funnel` in raw TCP mode, so TLS ends inside Tortie. Mutual TLS 1.3 with a pinned key for each phone, made in the Secure Enclave where the phone has one, and every request signed with a one-use nonce. One request per connection and nothing streams. The phone needs no Tailscale. The door is reachable from the public internet |
| Who can read what | The relay sees addresses, timing, sizes, the server id and the phone's public key, but not content. Whoever holds the link gets full ("owner") control. There is no password by default, and a relay client that sends none is still let in when one is set. Expo and Apple or Google receive alert text. The phone keeps hosts, keys and any password in plain app storage, not the Keychain | Tailscale's ingress carries bytes it cannot decrypt, and sees addresses, timing and sizes. The Mac's name is public in DNS. Only a paired phone's key gets as far as HTTP, and Remove on the Mac ends one phone. Apple receives each alert's session name, project, machine, agent, status and id. Answers reach the phone redacted by pattern and clipped at 4,000 characters |
| What the phone can do | Nearly what the desktop does: list agents, start, interrupt and stop them, chat, answer permission requests and questions with Accept, Deny and option lists, view diffs and files, open a terminal, dictate, and use a voice mode. Browser tabs and SSH hosts are desktop only. Downloading a file over a direct Tailscale connection fails on iOS (#3521) | Reads only. A list with sessions waiting on you first, then up to 200 others. One session's status, Catch Me Up, the agent's question and its options, shown but not pressable. The conversation paged back, for sessions on this Mac only. Never a terminal. Queued, none built: End behind Face ID (317), then answering a choice and sending a message (318) |
| Alerts | The daemon posts to Expo's push service, which passes them to Apple or Google. Two kinds: "Agent finished" and "Agent needs permission". The body is up to 220 characters of the agent's last reply or the request's details, falling back to the tool input as JSON. None is sent if any client was active in the last 180 seconds, Mac keyboard and mouse included (#2622, open). Every phone registered in the last 48 hours gets each one. No action buttons | The Mac sends straight to Apple with the operator's own key, only when a session starts waiting on you. Nothing for finished, working or idle sessions, or for another machine's. The alert names the session and never the question. No rule holds an alert back because you seem to be at the Mac. Several at once become one alert. Works for the operator alone today, and nothing is sent while the Mac sleeps |
| Agents supported | Drives agents through their programmatic interfaces, not their screens. Built in: Claude Code through the Claude Agent SDK, Codex through its app-server, OpenCode, Pi, Antigravity (full access only) and Muse Code. 37 more through ACP, including Cursor, Gemini CLI, Copilot, Qwen Code, Grok and Droid. Agents are children of the daemon and close when it shuts down | Every session the Mac has is on the list, because the phone reads the Mac's own view of its tmux sessions. "Needs input" comes from numbered choices and two measured dialog shapes, and Cursor, OpenCode and Antigravity questions are not detected. Only Claude Code's question is written from its hook. Sessions on another machine never read as waiting, and their conversation cannot be read from the phone |
| Platforms | Phone app on iPhone, iPad, Apple silicon Macs, visionOS and Android, plus a web app. Daemon and desktop on macOS 13 or later, Windows and Linux | iPhone only, iOS 18.1 or later, portrait, dark, English. One Mac per phone. The Mac app is for Apple silicon |
| Price and accounts | Free, with no account for the app, the daemon or the relay. An optional Hub that starts agents from GitHub, Slack and Discord: Free (50 runs a month, 1 seat), Pro at $15 per seat per month, or self-hosted for free. Agents use your own sign-ins | No Tortie account. The Mac needs a Tailscale account, Funnel approved by a tailnet Owner, Admin or Network admin, and incoming connections allowed. Agents use your own sign-ins |
| Open source | Apache-2.0 since 0.7.0 (31 August 2026), AGPL before. One maintainer. About 19,180 GitHub stars. Five stable releases between 22 and 29 September 2026 | Apache-2.0. The iPhone app's source is in the same repository, under `ios/` |

## 4. Where each design is stronger, and why

### 4.1 Where Paseo is stronger

It is in people's hands. Both store listings rate it 4.9, Google Play counts more than 10,000 downloads, and a
roundup of 13 August 2026 called it the "Best phone-first remote control" (Nimbalyst). One user wrote that the
mobile app "pretty much has feature parity with its desktop app" (Hacker News, 11 August 2026). Tortie's phone
has one user, and research 136 says even App Review cannot pair with it yet.

The phone can act. Paseo receives an agent's question as a structured object from the agent's own interface,
so the phone draws a form and sends the answer back as data. It never reads a screen. Tortie reads the
terminal screen, so each dialog shape must be measured for each agent version, and 318's press is pinned to
Claude Code 2.1.285 and Codex 0.159.1.

One phone sees several computers. The phone keeps a list of hosts, and a plugin can ask for a client on any of
them (`packages/app/src/plugins/evaluate.ts:449`). Tortie pairs one phone with one Mac, and a phone paired
with a second Mac still gets the first Mac's alerts until Remove is pressed on the first
(`build/p3165/SPEC.md:1127`).

It reaches more devices. Paseo runs on iPad, Android and the web as well as iPhone, and its daemon runs on
Windows and Linux.

Setup needs no network administration. In relay mode the daemon only dials out, and the phone needs no
Tailscale. Tortie needs Tailscale on the Mac, a person who may approve Funnel for the whole tailnet, and
shields-up off. Someone on a tailnet they do not administer may not be able to use Tortie's phone at all
(`docs/research/132-the-simplest-pairing.md:210-219`).

It says when an agent finishes. Tortie's alert rises only when a session starts waiting on you, by design.

### 4.2 Where Tortie is stronger

Pairing is a decision on the Mac, not a password. Each Tortie phone holds its own key, the person presses
Allow on the Mac after matching 6 groups, and Remove ends one phone. A Paseo pairing link carries the daemon's
lasting public key and nothing that expires. Every client it admits becomes "owner", there is no device list,
no way to remove one phone and no command to change the key, and any client can fetch the link again
(`operation-permissions.ts:71`). Paseo's own triage bot wrote on issue #4087 (open, p0): "a leaked pairing link
grants full daemon control, and setting a password cannot take it back." The phone stores that link material
in plain app storage (#358, open, p0). In direct mode there is no password by default, so every device that
can reach the address gets full control (`public-docs/security.md:87`).

Alerts keep the words on the Mac. Tortie's alert reads 7 fields of a row: the session id, name, project,
machine, agent, status and whether it was seen at a wake (`src/main/push/alert.ts:1-9`). Paseo's alert body
is the agent's own text or the tool's input, and its terminal alerts also carry the terminal's working
directory, which can hold a username and a project name. All of it passes through Expo and then Apple or
Google. Paseo's privacy policy (last updated 29 August 2026) names neither push nor Expo, and both store
labels say no data is collected.

Alerts are not suppressed by presence. Paseo sends no alert while any client has been active in the last 180
seconds, and on a Mac that includes system idle time, so typing at the Mac stops alerts to the phone. Issue
#2622 has been open since 29 July 2026 and is its most-reported push problem. Tortie has no such rule, and
coalesces the alerts from a sleep into one.

No code arrives at run time. Paseo's phone app runs plugin client bundles that the daemon sends, with
`globalThis.eval` (`evaluate.ts:464-466`), and gives that code a client for the other computers the phone is
paired with. Its terminal, Mermaid diagrams and HTML preview run in web views. Tortie's phone uses Apple
frameworks only, has no Swift packages and no web view, and `conformance:ios` checks that on every build.

Requests cannot be replayed. Every Tortie request carries a one-use nonce and a signature from the phone's
own key. Paseo has no replay protection inside a live relay session (`SECURITY.md:39`, issue #359, open, p0),
although its public security page lists replay as protected.

Sessions outlive the app. Tortie's sessions live in a private tmux server, and the phone reads what the Mac
runs. Paseo's agents are children of its daemon, and work held inside an agent's process dies with it
(`docs/agent-lifecycle.md:13-37`). This is not a phone feature, but it decides what the phone finds after a
crash.

### 4.3 Trades that cut both ways

The open port. Tortie's door answers the public internet, defended by mutual TLS and the pairing gate. During
his first real pairing the Mac refused one stranger at the handshake, most likely a scanner
(`docs/BACKLOG.md:40244`). Paseo's relay mode opens no port, but its direct mode puts a plain WebSocket on the
tailnet with no password by default.

Who sees the traffic's shape. Both put a third party in the path that sees addresses, timing and sizes and
cannot read content: Fly.io for Paseo's relay, Tailscale's ingress for Tortie. Paseo's relay also checks no
identity on a socket, so anyone who learns a server id can knock that daemon off the relay, though they cannot
read or forge its traffic (`paseo-relay` `connection.ex:14-28`, `ownership.ex:336-341`).

Live or not. Paseo keeps a live connection, which is also where its open phone complaints cluster: the app
reconnects on every unlock (#949, closed as a feature request), a command sent while the app is in the
background waits until it is reopened (#3464, open), the relay drops (#1330, open, p1), long chats and images
go over the relay's message size limit (#4239, #2668, #2220), and an iPhone report says 30% of the battery for
an hour of use (#3971). Tortie's phone makes one request per connection and reads only when a screen appears,
the app comes forward or the person pulls. It avoids that class of fault, and nothing on it is live.

The computer must be on. Tortie's Mac must be awake with Tortie open. Paseo's daemon must be running too, but
it can run on an always-on server.

## 5. What Tortie might take from Paseo

Each is a candidate with its cost, not a decision. The tests are CLAUDE.md's refusals, research 127's rule
that no code arrives in the phone app at run time, research 48 and 136's refusal of a relay Ita Vero runs,
and refusal 8: whatever the door may do is bound to the hash the Mac's Allow confirms.

| Candidate | What Paseo shows | Cost | Refusals |
| --- | --- | --- | --- |
| Draw a question from the agent's own record where one exists | Paseo's forms come from structured requests, so the words and options are exact | Claude Code only today, through its hook. The press in 318 stays a keystroke on a measured shape. The hook's shape can move between versions | None: it is data the Mac already reads |
| Several Macs on one phone | Many hosts on one phone is the feature its users name most after parity | A pairing record per Mac, alerts that name their Mac, a merged list, and an Allow and a Funnel on each Mac | None. Each Mac keeps its own hash-bound Allow |
| iPad | Paseo runs on iPad, and App Review tests iPhone-only apps on an iPad anyway (research 136) | Wider layouts and a second test device | None |
| A "finished" alert, off by default | Paseo tells you when an agent finishes | A second trigger in the push engine, a per-agent rule for "finished", more noise, and a question for the Zen, which raises only what needs you | None, if the alert still names the session and nothing more |
| The keyboard's own dictation in 318's message box, instead of a voice mode | Paseo's voice mode runs speech models on the computer and a hidden agent session | Nothing beyond 318's text field (inference, not measured). Nothing is spoken back. Research 48 found every shipped voice form needs third-party code or a hosted service | None for keyboard dictation. A voice mode like Paseo's would break refusal 1 or need a hosted service |
| A probe arm for writes sent as the app goes to the background | Paseo's #3464: a command sent in the background waits until the app is reopened | One arm in 318's probe. 318 already makes each write happen at most once, with a 128-bit write id and a read-back | None |
| A transport relay that cannot read content | Paseo's relay needs no Tailscale and no open port, which would remove Tortie's largest setup cost | Ita Vero runs a service and sees metadata. Paseo's own relay shows the faults that come with one: unauthenticated sockets, drops (#1330), size limits (#2668) and reach (#1668, unusable from mainland China until it moved). Research 48 and 136 refuse a relay Ita Vero runs | Needs his ruling to overturn research 48 and 136. The relay's address would be a hashed field under refusal 8 |
| Alerts for other people through a relay that carries no words | Paseo's choice, content through Expo, is the cost of the other way | Already his deferred ruling, "Yours alone now, relay later": a blank wake push, then the phone reads the words from its own Mac. Ita Vero would hold device tokens, and the App Privacy answers change | Needs his ruling on research 48. A relay that carried alert text would be refused |

Not candidates, each named with what refuses it:

- Plugins that run on the phone: research 127's rule for the phone (no code arrives at run time) and refusal 2
  (no SDK and no contribution-point registry).
- Driving agents through their SDKs or ACP instead of their terminals: the architecture invariant that
  sessions live in the private tmux server and the app is a disposable client. Paseo's own docs say
  Antigravity can only run that way with its permission checks off.
- A raw terminal on the phone: a standing refusal, tied to App Store guideline 4.2.7 (research 136 section 2).

## 6. What could not be confirmed

### 6.1 Refuted or corrected, and not used as first stated

| Claim before the attack | What the attack found |
| --- | --- |
| Paseo's phone app "has full feature parity with desktop" (its landing page) | Its own docs say browser tabs are desktop only and SSH tunnelling is desktop and command line only |
| `relay.paseo.sh` is a Cloudflare Worker that forwards to Fly.io | Live DNS on 1 October 2026 resolves it straight to Fly.io, and the relay answers with Fly headers. The Worker config in the repository is stale, and issue #1668 calls it legacy |
| Pairing invitations are "expiring, single-use" (`docs/permissions.md`) | A design only. The code admits every client as owner, and issue #416 on per-device keys is open |
| "The mobile app is built in React Native, not a webview" | The main interface is React Native. The terminal, Mermaid diagrams and HTML preview run in web views |
| The author confirmed the F-Droid name clash | A commenter did |
| A direct client with no credential is refused | Only when a password is set. There is none by default |
| Paseo's permission alerts carry Approve and Deny buttons (a rival's review) | The push payload names no category, so there are no buttons. You approve inside the app |
| Paseo pushes "Agent needs attention" for errors | Errors are never pushed |
| Issue #358 is p1 | Its label read p0 on 1 October 2026 |
| Tortie: "Pairing. One QR." | One QR is scanned, but the first pairing is about 14 to 21 steps |
| Tortie: the phone opens one TLS connection | It opens a new one for every request and closes it after one answer |
| Tortie: Allow hashes the program, tailnet, name, port and phone keys | It also hashes the route list, every phone's push token and the alert switch, so every Mac update that adds a route, every Remove and every alert toggle closes the door to every phone until he presses Allow again |
| Tortie: 316.6 adds a signed "unpair" verb | Neither 316.6 nor 317 has it. The 317 entry does not name it yet |
| Tortie: the Mac composes every word | The Mac composes every data word. The phone draws its own fixed chrome words, checked against the Mac by `conformance:phonecopy`, and formats turn times itself |

### 6.2 Could not be confirmed

- Whether the App Store build 0.10.2 contains the plugin code read at `b5b43ed`. Paseo does not publish the
  commit a store build was made from.
- Whether Paseo's Expo project requires an access token for pushes. The daemon sends none, which suggests
  not, but Paseo's Expo settings are not public.
- Whether the hosted Hub stores the daemon public key it receives when a daemon enrols. That key and the
  server id are what a pairing link carries.
- How long Expo keeps alert contents, and how long Fly.io keeps relay logs.
- What conversation data Paseo's phone app keeps on the phone. It includes `expo-sqlite` and
  `expo-file-system`.
- Paseo's iOS App Transport Security settings as built.
- The number of open Android issues. The rate limit stopped the recount.
- Anything said on Reddit, X or Paseo's Discord. None could be reached.
- Other reception claims from the investigator (input bugs, Android memory and heat, missing features, and
  more quotes) were not re-checked by an adversary and are left out.
- Tortie: Funnel's bandwidth and latency, which Tailscale does not publish and nobody has measured.
- Tortie: whether 316.6's verifiers approved. The tree records only that they were resumed.

### 6.3 Where Paseo's docs disagree with its code

This document follows the code in each case.

- `public-docs/why.md:17` says the clients are "separate native clients". `docs/architecture.md:39` says the
  desktop app wraps the web app.
- `public-docs/security.md:46` refers to "your phone's private key". `SECURITY.md:36` and the code say the
  phone's key is new for each connection.
- `public-docs/security.md:49` lists replay as protected. `SECURITY.md:39` says it is not, within a session.

## 7. Evidence

Every page below was read on 1 October 2026.

### 7.1 Paseo's source

At `getpaseo/paseo` commit `b5b43edd65cc1253493b13cca3941dd390df6ef3`, under
https://github.com/getpaseo/paseo/blob/b5b43edd65cc1253493b13cca3941dd390df6ef3/:

| File and lines | What it shows |
| --- | --- |
| `README.md:21, 32, 42, 48, 60, 76, 200` | What Paseo is, no forced log-ins, one maker |
| `LICENSE:1-10`, `CHANGELOG.md:445` | Apache-2.0, changed from AGPL in 0.7.0 |
| `CHANGELOG.md:22, 35` | 0.11.0-beta.1: the phone asks before a link connects to a new or changed host |
| `CHANGELOG.md:130-131` | 0.10.0: relay passwords checked; "a follow-up release will require the password" |
| `CHANGELOG.md:318-322, 708, 748` | 0.8.0 plugins; 0.3.0 relay made opt-in |
| `SECURITY.md:22-23, 28, 36, 39, 43, 45` | Daemon key, what the relay sees, the phone's key per connection, no replay protection within a session, the link as a password, the optional password |
| `docs/architecture.md:37-39` | One Expo client for iOS, Android and web; Electron wraps it |
| `docs/agent-lifecycle.md:13-37` | Agents close on daemon shutdown; work inside a process dies with it |
| `docs/permissions.md:14-16` | Expiring single-use invitations, as a design |
| `docs/plugins.md:350-357` | The daemon transports a plugin's compiled client bundle; plugins across several hosts |
| `docs/terminal-activity.md:50-54` | Claude Code hooks in raw terminals |
| `docs/android.md:145` | The F-Droid build has no QR scanning or push |
| `public-docs/security.md:26-28, 46, 49, 87, 95-98` | Relay off on new installs; anyone who can reach the address connects by default |
| `public-docs/connectivity.md:11, 56-120` | Pairing steps; SSH desktop and command line only; Tailscale direct with "Use SSL" off |
| `public-docs/browser.md:45-47` | Browser tabs desktop only |
| `public-docs/claude-code.md:11, 15`, `public-docs/supported-providers.md:13-33, 61-100` | Agent SDK, app-server and ACP; Antigravity full access only; the ACP catalogue |
| `public-docs/voice.md:15, 21-30` | Speech models on the daemon's computer |
| `packages/protocol/src/connection-offer.ts:9-17` | The pairing offer's only fields |
| `packages/server/src/server/connection-offer.ts:30-50`, `pairing-offer.ts:34-46` | The link's shape |
| `packages/server/src/server/session-admission-auth.ts:18-36` | Every client admitted as owner; the relay password exception |
| `packages/server/src/server/operation-permissions.ts:71` | Fetching the pairing link needs only owner rights |
| `packages/server/src/server/daemon-keypair.ts:24-68` | One lasting key pair in a 0600 JSON file, remade only if missing |
| `packages/relay/src/encrypted-channel.ts:154-171, 227-291`, `crypto.ts:134-181` | A new phone key per connection; the daemon accepts any client key; NaCl box |
| `packages/server/src/server/push/push-service.ts:9-15, 24, 64-71`, `push/index.ts:8` | Posts to `exp.host` with no access token and no category; 48-hour token lease |
| `packages/protocol/src/agent-attention-notification.ts:1, 105-137, 172-212` | Alert titles and the 220-character body |
| `packages/server/src/server/agent-attention-policy.ts:3, 51-80` | The 180-second presence rule; errors never pushed |
| `packages/server/src/server/websocket-server.ts:2595-2616, 2707-2718` | Alerts sent; terminal alerts carry the working directory |
| `packages/server/src/server/bootstrap.ts:1240`, `hub/relationship-remote.ts:110` | The Hub receives the daemon public key |
| `packages/app/src/plugins/evaluate.ts:449, 464-466` | Plugin bundles run with `globalThis.eval`, with a client for other hosts |
| `packages/app/src/components/terminal-emulator-webview.native.tsx:18, 30, 114` | The terminal is xterm.js in a web view |
| `packages/app/src/components/question-form-card.tsx:25-70` | Questions drawn as forms |
| `packages/app/src/runtime/host-runtime.ts:1407, 2231`, `types/host-connection.ts:65` | Hosts and passwords in AsyncStorage |
| `packages/app/src/runtime/host-confirmation.ts:57-97` | The 0.11 confirmation and its 8-plus-8 character fingerprint |
| `packages/app/src/i18n/resources/en.ts:1792-1793` | "Anyone with it can access this daemon." |
| `packages/app/app.config.js:128-129, 192-196`, `packages/app/package.json` | Android cleartext allowed; the EAS owner; no `expo-updates`, no `expo-secure-store` |
| `packages/website/src/components/landing-page.tsx:1142, 1204-1207` | The parity claim; "Paseo is free and open source" |
| `packages/website/src/routes/privacy.tsx:17-66` | The privacy policy's text |

At `getpaseo/paseo-relay` commit `3fc41c96c8c63f3a7109e832899cc57d473c4531`:
`lib/paseo_relay/connection.ex:14-28` (admission by query parameters alone) and
`lib/paseo_relay/ownership.ex:336-341` (a new server socket closes the old one).

### 7.2 Paseo's pages and listings

| Source | What it shows |
| --- | --- |
| https://paseo.sh/, https://paseo.sh/download | Platforms and current stable v0.10.2 |
| https://paseo.sh/hub | Hub plans and prices |
| https://paseo.sh/privacy | "Last Updated: August 29, 2026"; no mention of push or Expo |
| https://paseo.sh/docs/security | Relay off on new installs; the link treated like a password |
| https://apps.apple.com/us/app/paseo-remote-coding-agents/id6758887924 | Version 0.10.2, free, iOS 15.1, 4.9 from 90, Data Not Collected, iPad, Mac and visionOS |
| https://play.google.com/store/apps/details?id=sh.paseo | 4.9 from 241, 10K+, no data collected or shared |
| https://api.github.com/repos/getpaseo/paseo and its releases | Created 13 October 2025; about 19,180 stars; release dates; an APK on each release |
| `dig relay.paseo.sh`, https://relay.paseo.sh/health | CNAME to `paseo-relay-next.fly.dev`; Fly response headers |
| https://docs.expo.dev/push-notifications/sending-notifications/ | Expo passes pushes to APNs and FCM; tokens alone can send by default |
| https://f-droid.org/en/packages/ca.chancehorizon.paseo/ | The unrelated step counter |
| https://nimbalyst.com/blog/open-source-agent-workspace-alternatives-2026/ | "Best phone-first remote control: Paseo" (13 August 2026) |

### 7.3 Paseo's issues and discussions

Under https://github.com/getpaseo/paseo/issues/: #358 (pairing data in AsyncStorage, open, p0), #359 (no replay
protection, open, p0), #362 (the confirmation, merged 30 September 2026, not in 0.10.2), #416 (per-device keys,
open), #949 (reconnects on every unlock, closed, 12 May 2026), #1330 (relay drops, open, p1), #1668 (mainland
China, closed 31 July 2026), #2220, #2668 and #4239 (relay size limits), #2622 (presence suppresses pushes,
open, p2, since 29 July 2026), #3464 (background commands wait for the foreground, open, p2, 16 August 2026),
#3521 (iOS download over Tailscale fails with ATS error -1022), #3971 (battery), #4087 (relay clients skip the
password, open, p0), #4408 (Android out of memory, open, p1), #5218 (iOS loses its connection over a tailnet).

Hacker News, read through https://hn.algolia.com: thread 48377250 (launch, 3 June 2026), items 48379279 (the
F-Droid clash, a commenter), 48380144 (author: "team of one"), 48380161 (author on the credit pool),
49260865, 49901613, 48396843 and 48378603.

### 7.4 Tortie's tree

At `0699e08d`: `ios/Tortie.xcodeproj/project.pbxproj:342, 417, 427, 437`, `ios/Tortie/Tortie.entitlements`,
`ios/Tortie/Info.plist`, `ios/Tortie/Door/DoorClient.swift:12-40, 146, 660`, `ios/Tortie/Door/Keys.swift:20-29,
175-206`, `ios/Tortie/Screens/ListScreen.swift:1-15`, `ios/Tortie/Screens/SessionScreen.swift:1-16`,
`ios/Tortie/Screens/ConversationScreen.swift:1-28`, `ios/Tortie/Style/Copy.swift:1-30`,
`src/main/pocket/door/listener.ts:510-519, 545`, `src/main/pocket/door/table.ts:56-61`,
`src/main/pocket/funnel.ts:574-592`, `src/main/pocket/pairing.ts:24-73, 286-306, 1053-1069, 1124, 1130,
1336-1345`, `src/main/pocket/ipc.ts:47-53`, `src/main/pocket/routes.ts:511-516`,
`src/main/pocket/server.ts:24-41`, `src/main/push/alert.ts:1-27, 94-117`, `src/main/push/engine.ts:1-32`,
`src/main/push/apns.ts:76-80`, `src/main/overview/turn-view.ts:27`, `src/main/overview/redact.ts:1-20`,
`src/main/machines/remote-sessions.ts:118-119, 1041-1044`, `src/shared/ipc/pocket.ts:89, 282`,
`src/shared/overview-copy.ts:123`, `CHANGELOG.md:7-30`, `LICENSE`, `README.md:1-20`,
`docs/BACKLOG.md:33732-33800, 38031, 38655-39129, 40108, 40242-40276`, `build/p330/SPEC.md:73, 76`,
`build/p3165/SPEC.md:1127`, research 48 (lines 80 and 324), research 70 (line 88), research 127 (lines 34-87
and 194-215), research 132 (lines 33-48 and 210-219), research 135 section 1, and research 136 sections 1,
2, 9 and 12.5.
