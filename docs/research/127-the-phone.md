# 127. The phone: the sessions on my machines, from my pocket

Phase 309. Written 2026-09-21 against the tree at `88b874e0` ("docs(backlog): a phone that answers
what needs me now, queued"). Nothing was installed and nothing was run: every product was read from
its repository at a named commit or from its vendor's page on the day, Tortie was read from this
tree, and his Mac was read only far enough to learn which Tailscale it carries. Anything not readable
that way is marked unmeasured in §8 with the reason.

This answers the operator's question of 2026-09-21, in his words: "how can i have a phone app (mac)
that allows me understand and manage the sessions that are running on my machine? like, I want it to
be built into tortie and be something I can use to check the sessions that are running in tortie
(whether they be local or on another mac) but control them" — ranked on whether it "fits with the
zen of tortie, is simple, has our aesthetic and would work exceptionally well wihtout reinventing the
wheel", and refusing anything that is "just like using one of those existing products". Minutes after
queueing he settled the shape: "I expect you should be able to install something, this would be a
tortie app for your phone" — "err ios app". So this document ranks the ways to build a Tortie iOS
app; the relay products are ranked for what they teach and as hosts Tortie could speak to, and none
is the deliverable. His four columns are used in his order everywhere below: the Zen
(`docs/ZEN-OF-TORTIE.md`: "What needs me now?", only a question, decision or failure rises), simple
(what a person installs, confirms and remembers), Tortie's aesthetic (`DESIGN.md` §0: "neutral,
dense, and native", colour spent on state alone) and assembled rather than reinvented.

## 1. The answer first

Build the Tortie iOS app in Swift and SwiftUI: three screens fed by a door in Tortie main, with push
from the Mac's own process through Apple. The app is a thin face, because the Mac already computes
everything it would draw — the status word (`src/renderer/app/status.ts:296-352`), the session
sheet's copy, the Catch Me Up line, and `sessionActionGates` once it moves from
`src/renderer/state/resume.ts` to `src/shared/` — and a build step generates the token values, the
copy strings and the contract types from `src/shared/` so the phone and the desktop say the same
words in the same colours. Screen 1 is ⌘J carried to the pocket: the sessions blocked on him first,
newest-blocked first, each row dot · agent · name · project · machine · the agent's question · age,
the rest below in the sheet's words. Screen 2, on a tap, is "is it done?": the Catch Me Up line and
the agent's last answer. Screen 3 is End and End these, behind Face ID, with the shipped confirm
sentence. The door is bound to the Mac's own tailnet address read from the interface table (never
`0.0.0.0`, no process started at bind), Tortie terminating its own TLS with a key sealed under
`safeStorage` and its fingerprint in the pairing QR; pairing establishes keys each way with a short
fingerprint the person matches on the Mac, every request is signed and no reusable secret crosses
the wire, and every write is a core verb by id re-read at the press behind
`src/main/sessions/lifecycle-gate.ts`. Push is APNs from Tortie main with Ita Vero's provider key
held on the operator's own Mac only, sealed, never shipped; the alert carries the status word, the
name, the agent, the project and the machine, and never a conversation byte in the clear. It reaches
the phone over Tailscale, which is already on his Mac, free for him, and needs no relay Tortie runs
and no account Tortie holds. Distribution is TestFlight first, then the App Store under Ita Vero,
LLC, at $99 a year (Apple's enrolment page), with a privacy page and a demo mode approved in advance
because a reviewer has no Mac running Tortie; if the membership lapses, installed apps keep working
and updates stop (Apple's renewal page). Refusal 1 does not bind the iOS app by its letter; its
spirit binds in one sentence the phase carries as a rule: no code arrives in the phone app at run
time, and the door hands the app data and never code.

What it does not do, said as refusals and not apologies. No terminal, no keystrokes, no free text, no
screen bytes, no image drop: App Store guideline 4.2.7 turns a mirrored terminal into a store
refusal and its LAN-only clause forbids the away case, and a surface that mirrors nothing is why
this can be three screens and why it is not "one of those products". Nothing while the laptop lid
is closed, because the sender is asleep. No `needs input`, no digest and no push for the Mac Pro's
sessions until Tortie runs there or he rules that the remote feed may read claude's registry over
ssh (`src/main/machines/remote-sessions.ts:1031-1034` calls that the one status rule Tortie does not
break). No push for anyone but the operator until he rules on the key (§6). No Restore, no Remove,
no Restart from the pocket: one relaunches an agent with its safeguards off, one deletes saved
output. And no reply to a prompt in v1: a Claude row carries the Remote Control hand-off instead,
and the structured reply is v2, queued only after one fact is measured (§8, first item) and he
answers §11's second question.

## 2. Can a phone reach the sessions with no relay Tortie runs

Yes, for the sessions on the Mac that runs Tortie. The method is Tailscale, which is already on his
Mac: the Standalone variant, version 1.102.2, read from `/Applications/Tailscale.app/Contents/Info.plist`
(bundle id `io.tailscale.ipn.macsys`) with no Tailscale command run. The phone runs the Tailscale
iOS app from the App Store — a VPN profile and an SSO login (https://tailscale.com/kb/1020/install-ios)
— on the Personal plan, "$0 Free forever", unlimited devices (https://tailscale.com/pricing, read
2026-09-21). Node keys expire after 180 days unless "Disable Key Expiry" is set per device, and the
iOS app pushes when a re-auth is due (https://tailscale.com/kb/1028/key-expiry). The phone connects
by the MagicDNS name `<mac>.tail2ddfe1.ts.net`, so no App Transport Security exception is needed;
connecting by address would need a compile-time `100.64.0.0/10` entry, because "In iOS 17, iPadOS 17,
and macOS 14, ATS no longer allows connections to IP addresses by default" (Apple's
`NSAllowsLocalNetworking` page). Research 48 §7's "no cloud component" does not bind Tailscale, a
network he owns that research 28 already names as the boring answer, nor Apple's push service.

`tailscale serve` is NOT the door for the app, for four reasons the boundary attack found in
Tailscale's own source and pages (§7). Serve IS how the home-screen web app, the fallback, gets a
real certificate with no certificate work, once "HTTPS certificates" is enabled on the tailnet — a
one-time admin click that publishes the machine name to a certificate log
(https://tailscale.com/kb/1153/enabling-https); whether it is enabled on his tailnet is unmeasured.
Funnel is unavailable on his variant ("Funnel: no \| no \| yes" across App Store, Standalone and
open-source tailscaled, https://tailscale.com/docs/concepts/macos-variants) and would put a door on
the public internet anyway.

| Reach method | The phone installs | The Mac does | Hotel wifi | Laptop lid closed | Where the bytes go | Cost to keep working | Refusal it brushes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tailscale app on the phone, Tortie's own door on the Mac's tailnet address (recommended) | Tailscale (VPN profile, SSO login) and the Tortie app | Tailscale is already there; Tortie binds its door on the `100.x` address read from `os.networkInterfaces()` | Works once the captive portal is done; with UDP blocked, traffic relays through DERP over 443 in research 28's 150–400 ms band, which a list does not feel and a terminal does (https://tailscale.com/kb/1082/firewall-ports) | Dead: nothing on the laptop answers and no push is sent; the Mac Pro's sessions keep running with nobody watching | WireGuard end to end; relayed through DERP only when direct fails, and "it's impossible for a DERP server to decrypt your traffic" (https://tailscale.com/kb/1232/derp-servers) | Nothing yearly to Tailscale; a re-auth every 180 days or the expiry switched off; two app updates a year each side | None of the eight; guideline 4.2.3(i) if the app needs the Tailscale app to do anything, which is §11's third question |
| Same, with the tailnet node inside the Tortie app (TailscaleKit, libtailscale, BSD-3-Clause, github.com/tailscale/libtailscale `59d4bb82`) | Only the Tortie app; a Tailscale login inside it | As above | As above | As above | As above | As above, plus a Go runtime Tortie must keep updating inside the app | Refusal 6 read literally; a third party's node key and SSO login inside a Tortie-branded app; entitlement and review category unmeasured |
| Tailscale Funnel (public HTTPS) | Nothing but the app | Not available on his variant (table above) | Works anywhere | Dead | TLS ends on the Mac; "Funnel traffic ... does not include identity headers" (https://tailscale.com/kb/1312/serve) | A variant swap | A Tortie door on the public internet behind one secret; not a candidate |
| Home Wi-Fi only, Bonjour, a pinned self-signed certificate | The Tortie app; one local-network prompt (Apple TN3179) | Tortie generates a key pair once; the app pins the hash, confirmed on the Mac the way `src/main/machines/confirm.ts` confirms a machine | Unreachable: a LAN is "a broadcast-capable network interface ... not cellular (WWAN) or VPN" (TN3179) | Dead | Encrypted, on the LAN only | Nothing | None; it is the honest answer to 4.2.3(i) and a widening of the charter's bind that is his to rule |
| An ssh tunnel from Blink (source GPL-3.0, `COPYING` at `a90b4423`), Termius or SSHHIP | An SSH app and a key | Remote Login on; Tailscale SSH server is not available on his variant ("Can be a Tailscale SSH server: no \| no \| yes") | Works wherever ssh works | Dead | SSH-encrypted | The tunnel dies when the app leaves the foreground: Termius "stop[s] background activity almost immediately, usually within 20 to 30 seconds" (docs.termius.com FAQ); Blink's answer is location tracking | It is one of "those products" by construction; no push, nothing while the phone is in a pocket |
| A self-hosted relay the person runs (Happy Server, Happier, VibeTunnel's own) | Their app | Their daemon, which owns or wraps the agent | As row 1 | Dead if the relay is on the laptop | Session content encrypted to the relay; every push but VibeTunnel's and handmux's goes through a cloud the person does not run (§6) | Their relay and their daemon, kept alive by hand | Refusal 4 on arrival for Happy, Happier and CC Pocket; the phone is their app, which is the refusal he named |

The Mac Pro through his Mac. The laptop's Tortie can list a Mac Pro row as `running`, `idle`, `not
running` or `unreachable` and can End or Remove it, but `needs input`, the Catch Me Up line and a push
are never produced for a remote row: `remoteRowStatus` reads `#{window_activity}` deltas at 5,000 ms
focused and 30,000 ms idle (`src/main/machines/remote-sessions.ts:414-456, 1040-1056`), and the
header at `:1031-1034` says why. So a phone reaches the Mac Pro's sessions and cannot be told they
need him until Tortie runs on the Mac Pro too — it is already a tailnet node
(`gregs-mac-pro.tail2ddfe1.ts.net`, from the entry), and the phone would pair with each Tortie — or
he rules that the remote feed may read claude's registry over ssh, which the harvest already does for
an agent's store (`src/main/machines/remote-harvest.ts:8-12`). Whether Tortie runs on the Mac Pro is
unmeasured, because his machines file is off limits.

What it costs a person: the Tailscale app and an SSO login, the Tortie app, one pairing confirmed on
the Mac; nothing yearly to Tailscale; a re-auth every 180 days or the expiry switched off; and the
Tailscale app is needed to do anything away from home, which is guideline 4.2.3(i)'s shape ("Your app
should work on its own without requiring installation of another app to function",
https://developer.apple.com/app-store/review/guidelines/) and the reason the Wi-Fi bind is a question
for him.

Tailscale's licence per component, read from the files and https://tailscale.com/opensource:
`tailscaled`, the CLI, `tsnet` and `libtailscale`/TailscaleKit BSD-3-Clause (the repository's LICENSE
at `3014ad82`); DERP relays open source in the same repository; the iOS app's GUI, both macOS GUIs and
the coordination server closed ("where the operating system is closed, the daemon is open source and
the GUI is closed source"; "Tailscale's own hosted coordination server remains proprietary").

## 3. The sixteen and the ones the catalog missed

Ranked on his four columns in his order, for what each teaches and whether Tortie could speak to it as
a host. Licences are read from LICENSE files, never badges. Commits: Happy `f3ee9216`, Happier
`bef99a4a`, VibeTunnel `f78324f5`, CC Pocket `2ef8c85a`, Omnara `7eed4404`, sshx `3604e8e`, Upterm
`4ec9e0e`, Termix `dc8287c`, ttyd `2922cb8`, tmate `985ab61`, code-server `8a7bf87`,
openvscode-server `2bfb814`, handmux `4746364`, all shallow clones read 2026-09-21.

| Rank | Product | Licence | Zen | Simple | Aesthetic | Assembled | Refusal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Claude Code Remote Control | Proprietary; Claude Code itself is the host | Pushes exactly on a permission or a question, holds the prompt open, skips push while you type at the desk — but its list marks online, not waiting, so it answers "now answer it" and never "what needs me now across everything" at a glance | Nothing to install but the Claude app; `/rc` in a pane Tortie already owns; Pro/Max/Team only; `remoteControlAtStartup` lives in `~/.claude/settings.json`, not in the `--settings` file Tortie writes | Anthropic's | Entirely: a launch flag, a QR the pane already prints, a link on the row | The transcript is stored on Anthropic servers; one agent only; research 48's word is about Tortie's cloud, not the vendor's |
| 2 | Happier | MIT (root LICENCE, `apps/ui/LICENSE`) | An Inbox of what is waiting and a PermissionRequest hook held open 7 days (experimental by its own matrix); the ready push carries the reply preview by default | No: an account, a relay, a 458k-line daemon, a 775k-line client, alpha | "Warm and Fluid Companion" — not Tortie's | Only by running their code; the protocol docs and the hook-answer shape teach | Refusal 4: take-over respawns a second Claude on the same conversation; push through Expo's cloud |
| 3 | Happy | MIT (root, `packages/happy-app/LICENSE`) | Push on permission, question and done is right; in local mode the phone gets no permission card and the switch kills the TUI; its Inbox is a friends feed | App + `npm i -g happy` + QR + an account | Expo default | The wire schemas and encryption docs are reusable; using them makes the phone the Happy app | Refusal 4: must own the process; push title and body go to `exp.host` in the clear |
| 4 | CC Pocket | MIT (root; bridge) | Approval and AskUserQuestion cards are the right two things to rise | `npx` bridge on `0.0.0.0:8765` with no key by default, QR, Tailscale for away | Flutter Material | It IS the agent process (Agent SDK), so it can never see a Tortie session | Refusal 4 on arrival; push through the author's Firebase function with the question or 120 characters of result, against its own SECURITY.md |
| 5 | Shunt | Proprietary freeware ("The source code is not provided", Terms); publisher Limelyte | On paper the closest model — and a dashboard of every pane, which the Zen refuses | One binary, one QR — that by default self-updates, writes Claude hook, MCP and skills entries on start, and connects outbound to Limelyte's gateway | Flutter app; not Tortie's | No source, so nothing can be assembled; cannot see `-L gmux` (no socket setting exists) | A closed self-updating binary that rewrites the agent's configuration is the opposite of "a person confirms the bytes" |
| 6 | VibeTunnel | MIT (root LICENSE covers web, mac, ios) | No — it can say a bell rang or a command ended, never that an agent asked | Yes on a tailnet; binds `0.0.0.0` by default | A terminal in a browser | Its VAPID manager (keys generated and stored 0600 on the Mac) and its `tailscale serve` recipe are the one relay-free push shape worth copying | Attaches by name on the DEFAULT socket with bare `tmux`; the thing he refused |
| 7 | handmux (missed by the catalog) | AGPL-3.0-only (`server/package.json:6`) | An inbox of waiting panes and approvals in a PWA — already more than a terminal | Node 22 server, QR with token; iOS push only as a home-screen PWA | Its own | AGPL rules out vendoring; reads panes over `-C` control mode and `capture-pane`, the way Tortie already does | Default socket only; resizes the desktop to the phone by design; installs its own Claude hooks beside Tortie's |
| 8 | ttyd | MIT | 0 — no session, no status word, no push | One binary, one command, one URL; one port per session; a certificate for a secure context | Renders the agent's own TUI and nothing else | C + xterm.js, unchanged since 2016 | `ttyd -W tmux -L gmux attach -t '$id'` works as argv and is a terminal; `-a` is a `;` command injection, never enabled |
| 9 | SSHHIP | Proprietary, App Store, $29.99 lifetime after a free month | No — a terminal with no push by design | An SSH host and a saved tmux session name; Mosh first | Theirs | Nothing to assemble | None on the boundary; one of "those products" by construction |
| 10 | Upterm | Apache-2.0; the relay's forwarder is a vendored MIT extract of cmoog/sshproxy | 0 | An SSH app, a key, and a relay that on his tailnet adds nothing sshd does not | The SSH app's | Yes | The relay terminates and re-opens SSH (`server/sshstock.go:203`, `sshforward.go:507-515`): every session is decrypted at the relay |
| 11 | sshx | MIT | 0 | `curl \| sh` and a wrapper script (`--shell` is argv[0] only); the relay "cannot be self-hosted" | A pan-and-zoom canvas | Yes | Content encrypted end to end, relay at sshx.io only; a terminal |
| 12 | code-server / VS Code Remote Tunnels / OpenVSCode Server | MIT / proprietary ("cannot build ... on top of") / MIT, Linux binaries only | 0 | Password plus an iOS certificate profile plus a domain name, seven documented keyboard defects on iPad; tunnels need a Microsoft or GitHub sign-in; OpenVSCode in Docker cannot see `-L gmux` | VS Code's | Yes / cannot be / yes | An IDE in Safari around an integrated terminal; mobile Safari support is a 2019 open issue (microsoft/vscode #85254) |
| 13 | Termix | Apache-2.0 | 0 — notifications are metric alerts | A Docker server holding the Mac's SSH credential, a separate app, daily telemetry on by default | White-label fleet chrome | Yes | On every attach it writes five global tmux options including `mouse on` (`src/backend/hosts/tmux/helper.ts:121-131`) against `resources/gmux-tmux.conf`; default socket only |
| 14 | tmate | tmux's per-file ISC/BSD; tmate-ssh-server MIT | 0 (webhook on join/leave only) | `tmate.io` and `ssh.tmate.io` returned no A record from two resolvers on 2026-09-21; self-host needs `SYS_ADMIN` | The SSH app's | Yes | A different tmux server: it cannot attach to `-L gmux` at all, only nest a client in a pane; pane bytes reach the relay in the clear |
| 15 | Omnara | Apache-2.0 at HEAD; the remote product is gone from the tree | n/a | n/a | n/a | n/a | The vendor's own blog (2026-03-02) marks the remote coding product historical; not a candidate |
| 16 | The rest of the sweep: Orca, MobileCLI, Moshi, CloudCLI, clauder, tap-to-tmux, CloudeCode, 247-claude-code-remote; the vendors Codex in ChatGPT and Cursor for iOS | Orca MIT (Expo app, Orca-run relay); MobileCLI daemon MIT, app proprietary; Moshi proprietary; CloudCLI AGPL; clauder, tap-to-tmux, CloudeCode, 247 MIT; the vendors proprietary | Orca and MobileCLI carry a "waiting on input" state; Moshi an approval inbox; tap-to-tmux is Claude hooks → ntfy → Blink; the vendors carry approvals in their own apps | Each wraps or launches its own agents or needs its own relay; none attaches to an existing `-L gmux` session | Theirs | Orca's "desktop hosts a mobile RPC server" is the closest architectural twin; nothing is vendorable | Refusal 4 for all but tap-to-tmux; every push path but tap-to-tmux's self-hosted ntfy runs through a cloud |

Claude Code Remote Control is first because it is the thing the phone app must beat, and the honest
comparator for tonight. From https://code.claude.com/docs/en/remote-control (read 2026-09-21): an
existing session joins with `/remote-control` after a one-time confirmation and "you can type messages
locally while the session is also available remotely"; "Claude Code keeps permission prompts and
AskUserQuestion questions open until you answer them"; push is skipped "while you are typing in or
focused on the connected terminal"; the local session "makes outbound HTTPS requests only and never
opens inbound ports"; "the session transcript, including your messages, Claude's responses, and tool
activity, is stored on Anthropic servers"; "API keys are not supported". Its `--settings` refusal is
for server mode only, so `/rc` in a pane Tortie launched is not blocked by the flag Tortie passes
(`src/main/activity/hooks.ts:946-957`); whether the interactive `--remote-control` flag starts beside
`--settings` is unmeasured. Its list "show[s] a computer icon with a green status dot when online" —
online, not waiting. Installed tonight, it is the one product that shows a Tortie session, and only a
Claude Code one.

Happier is the closest working model of a phone answering a TUI's prompt. It installs a
`PermissionRequest` hook (matcher `*`) and a `PreToolUse` hook (matcher `AskUserQuestion`) answered by
returning `hookSpecificOutput.decision`, with the command-hook timeout set to seven days
(`apps/cli/src/backends/claude/utils/generateHookSettings.ts:224-241`,
`utils/permissionHookTimeout.ts:8`). Its own matrix calls it "the experimental local permission
bridge" (`docs/claude-feature-matrix.md:32`). Take-over of a foreign session respawns a second Claude
on the same conversation; follow-only is a read of `~/.claude/projects/**.jsonl`. Its README sends
you to "Tailscale Serve (as long as your computer is running)" (`README.md:299`).

Happy sees only sessions launched as `happy claude`; its tmux helper addresses the default socket
(`packages/happy-cli/src/utils/tmux.ts:745-790`, the `-S socketPath` parameter has no caller); in
local mode the only hook installed is `SessionStart`
(`packages/happy-cli/src/claude/utils/generateHookSettings.ts:34`), so no permission card reaches the
phone; the phone/desktop switch sends SIGTERM to the TUI and relaunches through the Agent SDK
(`claudeLocalLauncher.ts:144`, `loop.ts:77-110`). Its Inbox is a friends feed
(`sources/components/InboxView.tsx:13,113`). What it teaches is in `docs/protocol.md`,
`docs/encryption.md` and `@slopus/happy-wire`: sequence-numbered updates for reconnect, opaque
encrypted payloads, presence as ephemeral events.

CC Pocket is the store precedent for a Flutter app of this shape and for LAN-first pairing (App Store
id6759188790; "Tailscale is the recommended setup" for away). It is the agent process itself
(`@anthropic-ai/claude-agent-sdk`, `packages/bridge/src/sdk-process.ts:167-171`; zero occurrences of
`tmux` under the bridge or the app), so there is nothing to attach to.

Shunt reads well and can bear out none of it. Its site bundle (v1.23.70, 2026-09-16) says "One
Flutter app covers iPhone, iPad, Android, and macOS" and "TestFlight (the Mac app shares the iPhone
bundle id)"; the daemon's defaults are "auto_update: background self-update (default on)",
"manage_claude_hooks: write Claude / Grok hook entries on start (default on)", MCP and skills writes,
and an outbound connection to `wss://gateway.shunt.app`. No source; the GitLab project answers 404.

VibeTunnel is the precedent for "every Mac is its own push provider": a `web-push` VAPID key pair
generated and stored 0600 on the Mac (`web/src/server/utils/vapid-manager.ts:21-32`), documented over
`tailscale serve` (`docs/push-notification.md:108-140`). Its attach is
`['tmux','attach-session','-t', target]` with bare `tmux` (`web/src/server/services/tmux-manager.ts:238`).
Its iOS app "is still work in progress and not recommended for production use yet" (`README.md:170`).

handmux, which the catalog does not carry, is shipped code that claims iOS web push from a self-hosted
process: its client gates push on standalone mode (`web/src/push.ts:109-113, 191`) and its server sends
VAPID push (`server/src/push.ts:1-3`). It reads panes over `-C` control mode and `capture-pane`
(`server/src/tmux/paneOutputCapture.ts:81`, `commands.ts:149`), with no socket flag (`commands.ts:75`),
and `resize-window -x` sets `window-size manual`, which "applies to every client on this window —
including the PC" (`commands.ts:300-314`). AGPL-3.0-only, so a design and not a dependency.

ttyd is the only honest escape hatch: `build_args` copies the fixed argv then the per-connection URL
args (`src/protocol.c:115-129`) into `spawn_process`, so `ttyd -W tmux -L gmux attach -t '$id'` is a
real attach client per connection. One port per session; issue #191 "Mobile Browser Layout" closed
not planned 2023-11-10. Never a recommendation.

What the research found that the catalog says differently, handed to tortiedotsh and not edited
here (`/Users/gdc/tortiedotsh/src/data/comparison-catalog.ts` line numbers):

- Shunt `remote-native-ios` (`:2341`) says "Native SwiftUI client is distributed through TestFlight";
  its own bundle says Flutter, zero occurrences of `SwiftUI`.
- Shunt `source: "unknown"` (`:2339`): the Terms say "The source code is not provided"; proprietary
  freeware, publisher Limelyte.
- Shunt hosting boundary, relay deployment, transport security and encryption are Unknown in the
  audit; the Privacy page answers all four (outbound to `wss://gateway.shunt.app` by default, self-host
  or `--relay`, ECDH P-256 + AES-256-GCM through the gateway, port tunnels in plaintext, LAN ports
  9847/9848). Worth a note: the daemon self-updates and writes Claude hook, MCP and skills entries.
- Happy `remote-terminal-input` (`:2297`) "built-in — Switch control between phone and desktop": the
  app has no terminal (`xterm` is not a dependency; the `terminal/` route is pairing) and "switch" is a
  SIGTERM and an SDK relaunch. Should read Not available.
- Happy `remote-existing-session` built-in (`:2291`): only a `happy claude` session is reachable;
  `remote-approvals` built-in: remote mode only, local mode installs `SessionStart` alone;
  `remote-supported-harnesses` (`:2296`): the source also carries gemini, openclaw and agy runners.
- Happy encryption / transport: push title and body go to `https://exp.host/--/api/v2/push/send` in
  the clear (`packages/happy-server/sources/app/push/pushSend.ts:7`); the README's "encrypted, we can't
  see the content" is not true of the push.
- Happy `remote-relay-deployment` (`:2304`) cites `slopus/happy-server`, archived 2026-02-14; the live
  code is `packages/happy-server` in `slopus/happy`; the default relay is `api.cluster-fluster.com`.
- Happier `remote-existing-session` built-in: holds as follow; take-over respawns a second process.
- Happier `remote-transport-security` "End-to-end encrypted by default": the ready push carries the
  reply preview through Expo unless `readyIncludeMessageText === false`
  (`packages/protocol/src/push/readyNotificationContent.ts:26`); the bridge is "experimental".
- VibeTunnel `remote-notifications` is remain-unknown in the audit; `docs/push-notification.md`
  documents web push plus five native kinds. Closable as built-in with "not agent-aware".
- VibeTunnel `remote-existing-session` built-in: true on the default socket only; `remote-native-ios`
  limited confirmed (not on the store; "Create Xcode Project" in `ios/README.md`).
- CC Pocket native iOS/Android Unknown: App Store id6759188790 and Play `com.k9i.ccpocket`, Flutter.
  Boundary, relay and transport Unknown: `0.0.0.0:8765`, plain `ws://`, optional `BRIDGE_API_KEY`, push
  through `us-central1-ccpocket-ca33b.cloudfunctions.net/relay`. Encryption Unknown: none at the
  application layer, and SECURITY.md's "no data is sent to external servers" is contradicted by that
  relay. `remote-existing-session` is SDK resume by id, never an attach.
- Upterm `remote-transport-security` can be said harder: the relay decrypts every session.
- Termix `remote-notifications` built-in is true of metric alerts, not agent state; and it rewrites
  five global tmux options on every attach.
- tmate: the public relay names resolve to nothing today (NOERROR, zero A records, two resolvers).
- Omnara "pivoted" confirmed by the vendor's blog; App Store id6748426727 still exists, what it talks
  to unmeasured.
- SSHHIP: add Mosh-first, "$29.99 lifetime" after one free month, iOS 17+, and its own guide's "There
  is no push when the agent finishes and the app is closed".
- Remote Control: interactive `/rc` keeps the TUI typable; server mode `claude remote-control` with
  `--spawn worktree` and `--capacity`; `remoteControlAtStartup` and `disableRemoteControl`; sessions
  resumable about four hours after the server stops; the list's dot means online; Zero-Data-Retention
  orgs cannot enable it.
- Candidates the catalog does not carry: handmux, MobileCLI (App Store id6757689455), Orca
  (id6766130217), Moshi (id6757859949), CloudCLI/claudecodeui, clauder, tap-to-tmux, CloudeCode,
  247-claude-code-remote, plus the vendors Codex in ChatGPT and Cursor for iOS.

## 4. What a Tortie phone surface is that a relay is not

A relay carries bytes; Tortie holds a session. The site's own ledger says the inverse: eight of the
sixteen "do[] not document push or out-of-app attention notifications"
(`/Users/gdc/tortiedotsh/src/data/unknown-audit-remote-companions.json`), and every terminal relay's
input model is raw terminal input (`comparison-catalog.ts:2332,2400,2412,2422,2433,2448`). What
survived the attack, as screens, with the words the app already ships:

The list of who is blocked (screen 1). One row per session that needs him, newest-blocked first:
pulsing amber dot · agent icon · name · project · machine · the agent's question · age since blocked;
every other session below in the sheet's words — `working`, `idle`, `ended`, `failed (exit 1)`, `not
running`, `unreachable` (`src/renderer/app/status.ts:296-352`) — and the empty state "Nothing needs
you — all agents are working or idle." It is ⌘J (`docs/DESIGN-SPEC.md:725-740`, S7) and the menu-bar
sentinel (`src/main/tray/attention.ts:1-11`, "exactly the sessions that are BLOCKED on a human,
across every project, newest-blocked first") carried to a phone, and no product has it. Two
conditions. The question must come from the `PermissionRequest` hook body (`tool_name`,
`tool_input`) for Claude and from the QUEST row `detectDialog` already finds
(`src/main/activity/screen.ts:62`) for codex, gemini and qwen — never the last screen line, which
for every committed Claude fixture is the hint row (§7). And a Mac Pro row says `running`, `idle`,
`not running` or `unreachable` and never `needs input` until Tortie runs there.

The push that carries the status word (the lock screen). `needs input · <name> · <agent> · <project>
· <machine>`, sent from the Mac's own process through Apple only when a row joins the blocked list;
nothing rises for `working` or `idle`. Tapping it opens the row, which reads the question from the
door. Its limits ride with it: nothing is sent while the laptop sleeps, and the question travels in
the push only encrypted under the pairing key (§6).

"Is it done?" on a tap (screen 2). The Catch Me Up line for idle and ended rows — `you asked "…".
Done, and git agrees` / `The agent says it is done. git has no record of it` / `Stopped before the
agent answered` (`src/renderer/overview/line.ts`, `copy.ts:52-79`) — the two cells (`Messages 41 · 20
you · 21 agent`, `Last message 2m ago · Agent reply`, `src/renderer/session-manager/copy.ts:379-505`)
and the agent's last answer, which the overview store already holds redacted and clipped to 4,000
characters (`OverviewTurnView.answerText`, `src/shared/overview.ts:27-40`). Pull, never pushed. Local
sessions only: a Mac Pro row answers "This session runs on another machine. Its record is there"
(`copy.ts:78-79`). The `needs_input` arm of `buildProjectLine` must be written before the line is
drawn on a phone, because today that row falls to "The agent's answer is not in the record" (§7).

End, and End these (screen 3). The one pocket verb from the gate set, behind Face ID, with the shipped
sentence `End '<name>'?` (`src/renderer/state/resume.ts:994-1016`), the targets fixed at open and
re-read by id at the press (`conformance:manager`), and main's own refusals drawn as written: "This
session was removed, so there is nothing to end. Nothing was changed."
(`src/main/sessions/lifecycle-gate.ts:66-67`), "Tortie cannot see whether this session is running,
so it cannot end it." (`copy.ts:205-206`), "This session changed. Nothing was done." (`copy.ts:616`).
It is the kill switch for a runaway agent, works on a Mac Pro row too (ruling R11,
`lifecycle-gate.ts:42-49`), and is the only write in v1.

The hand-off, named on the row. A Claude session with Remote Control on links to its session in the
Claude app (the vendor posts the URL in the conversation; whether it lands in the JSONL Tortie parses
is unmeasured); any other session offers an `ssh://` link that a terminal app he already owns opens
onto `tmux -L gmux attach -t =<name> -f ignore-size`, which never reflows the desktop (his tmux 3.6a
man page: "ignore-size — the client does not affect the size of other clients"). The tail —
interrupt, a prose reply, a new instruction — goes to the vendor's surface or his own SSH app, and
costs Tortie no terminal, no bytes and no new door.

The structured reply (v2, on the row). Allow or deny for a Claude permission through the
`PermissionRequest` hook Tortie already receives (`src/main/activity/hooks.ts:526-535`), held open
until the phone answers with `decision.behavior` (the hooks reference, saved copy `hooks.md:1933-1960`);
a numbered option for the dialogs `detectDialog` recognises on codex, gemini and qwen, typed as one
digit and Enter with the screen read before and after (`src/main/machines/remote-arm.ts` rule 4), one
press at a time; an AskUserQuestion answered through `PreToolUse`'s `updatedInput`. Free text into a
pane stays refused (`remote-arm.ts` rule 1). Not built until one fact is measured — whether Claude's
terminal dialog and a pending http hook coexist — and until he rules whether a paired phone may press
the buttons the agent drew.

The honest inverse. A phone that only tells him is less than Remote Control gives him tonight for any
Claude Code session: `/rc` in the pane he already has shows the prompt with its options, holds it
open, takes a reply, pushes when actions are required, keeps working through laptop sleep, and
reaches the Mac Pro's Claude sessions. What Remote Control cannot do and Tortie can: one glance
across every agent and every session that says who is blocked, with the age; End as a kill switch;
the same words for codex, gemini and qwen; and no transcript on anyone's server. Anthropic's own
reminder text — "Approve tool calls from your phone", "Check in from your phone" (vendor page, lines
141-142 of the saved copy) — says why a list that cannot act stops being opened, why v1 carries End
and the Remote Control hand-off rather than a read-only list, and why the reply is v2 and not never.

## 5. The Tortie iOS app: the ways to build it, ranked

Two facts frame the ranking. Every store route pays the same push cost, because APNs needs Ita
Vero's provider key on the sender (§6). And the phone is a thin face fed by main: no component under
`src/renderer/session-manager/` imports cleanly (each binds the store or `window.gmux`), and the
renderer's CSP has no `connect-src` and `build/assert-preview-containment.mjs:242-250` fails the build
if one appears, so on every route what transfers byte for byte is `tokens.css`, `status.ts`'s switch,
the copy strings, `format.ts`, `line.ts` and the gate once moved to `src/shared/`. The screens are
new code on every route.

| Rank | Way to build it | Runs on the phone | Loads at run time | Cost beyond the store's | Refusal it brushes | One line |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Swift + SwiftUI, written by Tortie, Apple's frameworks and nothing else in the bundle | Tortie's own Swift | Nothing; no run-time code path exists to refuse | A second language and Xcode gates beside the vitest ones; a codegen step for the ~40 token values, the copy strings and the contract types | None of the eight, even refusal 6 read literally; refusal 7 does not arise | The full native notification kit with no bridge, native lists and sheets for "neutral, dense, and native", the lowest review risk of the four, and the one route the refusals accept without a ruling |
| 2 | Capacitor / WKWebView around a NEW Tortie React page with Tortie's tokens, bundled in the app and never fetched from the Mac | WebKit running Tortie's own bundle; Capacitor's Swift bridge (MIT, `ionic-team/capacitor` `5e0f6787`); a Swift extension anyway for Live Activities or a decrypting notification | Nothing if the bundle ships in the app | `tokens.css` untouched and the same language and test runner; the page must ship in the bundle (guidelines 2.5.2, 4.2); Appflow and Capgo Live Updates refused in writing; a served CSP whose `connect-src` names the paired door only | None if the bundle ships in the app; a shell that loads its page from the Mac is downloaded code every open and inherits the PWA's port-squatter problem | The most reuse of any route and the same page IS the home-screen fallback byte for byte — second because guideline 4.2 ("repackaged website") is a real reviewer's question with no precedent in this set, and because "dense and native" is argued in a web view rather than given |
| 3 | React Native / Expo, JavaScript compiled to Hermes bytecode at build time | Hermes, React Native and Expo modules (MIT) running Tortie's TypeScript | Nothing, unless expo-updates is added | Expo's cloud build optional (15 free iOS builds a month, https://expo.dev/pricing; a local Xcode build needs none); expo-updates, EAS Update and CodePush refused in writing; tokens re-typed as styles | Refusal 1 does not bind by its letter and the spirit is kept by "no OTA channel"; refusal 6 read literally forbids it | Happy on the store (id6748571505, `"expo": "~55.0.8"`) proves the reviewer accepts the shape; shares Tortie's language; the most third-party code in the bundle for three screens |
| 4 | Flutter, Dart compiled to machine code, Impeller drawing its own controls | The Flutter engine (BSD-3-Clause) | Nothing, unless Shorebird is added | A Dart toolchain joins the tree; tokens re-typed in a second language; Shorebird refused in writing | Refusal 6 read literally forbids it; not native by construction ("Flutter has its own implementations of each UI control") | CC Pocket on the store proves acceptance; nothing of Tortie's transfers and nothing is drawn natively — last of the app routes with no Zen gain to offset it |
| 5 | Home-screen web app served by Tortie on the tailnet — the fallback only, by his ruling | Safari's engine; the page comes from the Mac every open; `tailscale serve` supplies the certificate | Everything, from the Mac | No account, no review, no yearly fee ("You don't need to join the Apple Developer Program to send web push notifications", Apple's web push page); Safari revokes push permission if a push is not shown; no Bonjour browse; HTTPS certificates must be enabled on the tailnet | Brushes none of the eight — and on the boundary it is the least safe: a same-uid port squatter owns the origin and its storage, it cannot pin a certificate, and a write cannot sit behind Face ID | The only route whose push is Tortie's process to Apple with no key, no account and an encrypted payload; the fallback for the boundary's reason as well as his |

The recommended way in detail.

What runs where. On the phone, Tortie's own Swift and Apple's frameworks; on the Mac, a door in Tortie
main under a new `src/main/pocket/`; between them, Apple's push service. The app draws what the door
hands it and computes nothing of its own: the status word, the sheet's copy, the Catch Me Up line and
the per-row verb gates all arrive from main, and the build step emits the token values (`DESIGN.md`
§1.1 and §1.3, `#131417` canvas, `#F5B84A` attention, the eight neutrals and the five state hues), the
copy strings and the contract types from `src/shared/` so a word changed on the desktop changes on
the phone in the same commit.

What it loads at run time: nothing. That is the one sentence refusal 1's spirit binds the app with.
Refusal 1's letter names main, the renderers, the preload, a worker and a `utilityProcess`
(`CLAUDE.md`), which are Electron process kinds on the Mac, so it does not bind an iOS bundle; the
boundary sentence ("Configuration selects from choices the compiled world already contains") does,
and it is kept by no over-the-air bundle, no page loaded from the Mac, and a door that hands the app
data and never code. Refusal 6's stated reason is a macOS entitlement
(`com.apple.security.cs.disable-library-validation`) with no iOS analogue, but read literally it
leaves Swift as the only route; the recommendation satisfies it either way, and §11 puts the reading
to him because it decides what a later round may propose.

How it is distributed and reviewed. TestFlight first: up to 100 internal and 10,000 external testers,
"Builds are available for testing for up to 90 days", and the first build to an external group goes
through Beta App Review (https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview).
Then the App Store under Ita Vero, LLC. The clauses that bite, from
https://developer.apple.com/app-store/review/guidelines/ read 2026-09-21: 2.1(a) — a reviewer has no
Mac running Tortie, so "you may include a built-in demo mode in lieu of a demo account with prior
approval by Apple"; 5.1.1(i) — a privacy policy linked in the metadata and in the app; 4.2.3(i) —
"Your app should work on its own without requiring installation of another app to function", which
is the Wi-Fi question in §11; 4.2.7 — does not bite a surface that mirrors no screen, and would bite
the moment a later round streams the terminal. 2.5.2 ("may not download, install, or execute code")
and PLA 3.3.1(B) bite only an over-the-air channel, which Swift has none of.

What the person installs, confirms and remembers: the Tortie app; the Tailscale app for away from
home; one pairing, confirmed on the Mac.

How it pairs. Settings → Phone → Pair a phone opens a window of a few minutes, the shape of the
machine test flow, during which the door's `/pair` accepts one code. The Mac shows a QR carrying the
door's name, port, the fingerprint of Tortie's own TLS certificate and a one-time 128-bit secret
(`randomBytes(16)`, the hook server's own mint, `src/main/activity/hooks.ts:926`; a six-digit code is
a million guesses and is not used). The phone makes a fresh key pair; both sides show a short
fingerprint of the phone's public key and the sheet asks the person to match it, so what is confirmed
is a key and not a name a poster typed. The person presses Confirm; the acknowledgement sentence is
supplied in main by the click handler and never by the renderer or a file
(`src/main/machines/confirm.ts:655-666`, `machines/ipc.ts:693-704`). The record is sealed under
`safeStorage` in `<userData>/gmux/config-confirmations.json` under a third key prefix beside the two
that exist (`src/main/config/confirm-record.ts:20-27`), with the fields that decide what runs hashed
the way `confirm.ts:141-215` hashes a machine's; the live phone set is kept in a keychain item
through the runner `conformance:credentials` already pins, because a sealed file can be put back by
a same-uid process (`src/main/config/seal.ts:37-43`) and a removed phone's record is exactly such an
approval.

What it costs yearly to keep working: $99 per membership year to Ita Vero, LLC, with organisation
enrolment (a D-U-N-S number, "a legal entity that can enter into contracts with Apple", a work email
on the domain, a public website — https://developer.apple.com/programs/enroll/). If it lapses, "your
apps will still function for users who have already installed or downloaded them" and updates stop
(https://developer.apple.com/help/account/membership/renewal/). Nothing yearly to Tailscale. A free
account cannot carry it: "You can register up to 3 devices, which expire after 7 days"
(https://developer.apple.com/support/compare-memberships/).

The door on Tortie's side, on the hook server's precedent (`src/main/activity/hooks.ts`, research 18
§3) and the machine confirm's, corrected by the boundary attack:

| Part | Design | Precedent |
| --- | --- | --- |
| Where it binds | The Mac's own tailnet address, read from `os.networkInterfaces()` against Tailscale's documented `100.64.0.0/10` and `fd7a:115c:a1e0::/48`, no process started; never `0.0.0.0`; a LAN interface only if he rules it (§11). If Tailscale is off the address is absent, the door does not bind and says so. A door that cannot bind its confirmed port refuses rather than silently moving | `hooks.ts:237,241` bind loopback; `src/main/machines/tailscale.ts:26-31` promises its spawn is on no boot path, which rules out `tailscale status` at bind |
| TLS | Tortie terminates its own, with a key sealed under `safeStorage`; its fingerprint rides in the pairing QR and the app pins it | `src/main/config/seal.ts`; Apple's manual server trust page names a self-signed development server as its own example |
| The credential | No bearer, ever. Pairing establishes keys each way (X25519, Ed25519, HKDF, AES-GCM, all in `node:crypto`); every request is signed; the phone's private key never leaves its keychain; nothing reusable crosses the wire | Refutes the charter's token-per-phone, because a bearer is captured by whoever holds the port next (§7) |
| The confirmed hash | Bind address, port, `bindAtLaunch`, the enabled verb set, and per phone its id, label and public key. Any change moves the hash and the door refuses to bind until confirmed again. Reading the record never binds | `confirm.ts:141-215`; `whileReadingConfig`, `src/main/config/confirm.ts:512-541` |
| Refusal 8 and the boot bind | Binding a listener is not starting a process, and Tortie already signs in to confirmed machines at launch; `bindAtLaunch` stays a confirmed field so an agent cannot flip it | The machine gate carries the same seal-replay residual |
| Reads | The session list as `core.listSessions()` plus the machine views plus per-row gates from the moved `sessionActionGates`; per row the question, since-when, the handback and the digest from the overview store, already redacted; a stream fed from `onSessionsBroadcast` turned from a single slot into a listener list (`src/main/sessions/core.ts:878-884`) | `core.ts:2590`, `src/main/overview/service.ts:98-119` |
| Writes in v1 | End → `killSession(id)`; End these → ids named at open, re-read by id per call. Every write re-reads the row by id at the press and asks `endRefusal` first (`lifecycle-gate.ts:76-81`, above the remote branch at `core.ts:2826-2829`) | `src/renderer/session-manager/actions.ts:19-29`'s rule of the press, moved behind the door |
| Writes not in v1 | Restore (relaunches with safeguards off, `src/main/agents/registry.ts:541,703`), Remove (deletes saved output, `lifecycle-gate.ts:14-24`), Restart, Rename, Resume in place, Create, attach bytes, any reply text | `remote-arm.ts` rules 1 and 3 |
| What it can never do | Set a status (no import of `noteHookEvent`, `noteUserInput`, `applyDetectedStatus`; a "seen it" button is refused); start a process on a configuration change (no route reaches `createSession`, `restartSession`, `resumeInPlace`); read a credential (an import wall row in `build/assert-import-boundaries.mjs` forbidding `main/credentials/`, `main/logins/`, the settings writers); reach an unconfirmed machine (it composes no ssh); serve a request whose source address is its own bind address (refused before any header is read); accept an unpaired phone (`/pair` is dead outside the window); set a cookie; widen (a closed route table with no default) | Refusals 4, 5, 8; `hooks.ts:368-380` logs a refusal once per reason |
| Logs | Never a token, a body or a conversation line | `hooks.ts`'s rule |
| A lost phone | Settings → Phone lists phones; Remove drops it from the keychain set at once and the others stand; until Remove, an unlocked phone can press End on every row, and the pairing sheet says so | |
| Shutdown | Joins accepted requests, bounded, keys cleared last, in the ordered disposer | `hooks.ts:255-316`, `src/main/capabilities.ts` |

## 6. Push

For the recommended app: APNs from Tortie main on his Mac, token-based, `apns-priority: 10`, with Ita
Vero's provider key held on the operator's own Mac only — sealed under `safeStorage` in the
credentials domain, pinned by `conformance:credentials`, never inside the app and never on another
Mac. Apple's rule is that the key "must remain private to prevent anyone else from generating those
tokens" and its remedy for a leak is "revoke it and request a new one"
(https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).
The alert carries the status word, the session name, the agent, the project and the machine; it never
carries the question or the excerpt in the clear, because a native alert is JSON Apple reads, where a
web push payload is encrypted to the phone's subscription before Apple sees it ("build and encrypt
the payload for each push notification", Apple's web push page). A native app can match that only
with a Notification Service Extension decrypting a `mutable-content` payload under the pairing key —
allowed, and more Swift. The badge is the count of blocked rows.

This is the only push in the whole set that goes from the person's own process to Apple with no third
party in the path and carries a status word rather than "your terminal printed something". Happy and
Happier go through Expo with the title or the reply preview in the clear
(`packages/happy-server/sources/app/push/pushSend.ts:7`; Happier's `readyNotificationContent.ts:26`),
CC Pocket through the author's Firebase function (`packages/bridge/src/push-relay.ts:30`), Shunt
through FCM, Remote Control through Anthropic, and a self-hosted ntfy needs `upstream-base-url:
https://ntfy.sh` for instant iOS delivery — only the message id and a topic hash go upstream, but it
is a cloud in the path and a second app on the phone, and without it "delivery can take hours"
(ntfy `docs/config.md` at `10cb6506`). "A relay the person runs" is a cloud component the moment it
pushes. Only VibeTunnel and handmux push with no vendor between the Mac and Apple, and both are
terminals.

Failure modes, from Apple's own words: best effort ("APNs may reorder notifications ... may also get
throttled, saved in storage, and in some cases, not delivered"), one stored notification per bundle id
while the phone is offline, and no latency number documented anywhere — not by Apple, Expo, Firebase
or Anthropic. Nothing at all while the Mac is asleep, because the sender is asleep. A push arrives
without a tailnet and the app then cannot reach the door.

The sentence this document must carry: a native Tortie app's push works for the operator's phone and
for nobody else's until he rules that the key ships inside the app the way Bark does, or a relay
exists, which research 48 refuses. Bark (github.com/Finb/bark-server, MIT, "Copyright (c) 2018
Feng", commit `3df8990`) embeds its APNs private key at `apns/apns_certs.go:4` with the bundle's
topic, key id and team id at `apns/apns.go:42-44`, and the Swift Bark app has been on the App Store
since 2018 — so "the key cannot ship" is refuted as an impossibility and stands as a ruling at a
named cost: one extraction lets anyone push to any device token they obtain, one revocation breaks
every install. For the operator alone the key never ships, because he is Ita Vero. iOS web push from
a home-screen web app is the only push with no key, no account, no yearly fee and an encrypted
payload, which is why the web app stays the fallback and never a second install beside the app.

## 7. What was refuted

Each of these was upheld by the judge after an adversary refuted an investigator's claim, so nobody
re-derives it.

1. The phone row's line is not the agent's question. `excerptFromCapture`
   (`src/main/activity/screen.ts:100-108`) returns the last non-empty line; in the committed fixture
   `src/main/activity/__tests__/fixtures/claude-permission-prompt.txt` that is line 23, "Esc to cancel
   · Tab to amend", and the question is line 18; `claude-workspace-trust.txt` ends "Enter to confirm ·
   Esc to cancel". The question already reaches main twice and is dropped twice: the `PermissionRequest`
   hook body is answered 200 and forwarded as only `(sessionId, state, event)` at `hooks.ts:438-440`,
   and `detectDialog`'s QUEST regex (`screen.ts:62`) finds the question row and returns a boolean.
2. The Catch Me Up line misleads for the one row the phone exists for. `buildProjectLine`
   (`src/renderer/overview/line.ts:101-130`) reaches `OUTCOME_NO_ANSWER` for a `needs_input` session,
   because the still-working arm requires `status === 'running'`; no test covers that arm.
3. Shunt is Flutter, not SwiftUI, and on TestFlight, not the store (its bundle v1.23.70). Dropped from
   the Swift precedent cell; handed to tortiedotsh.
4. Shunt's second place falls to fifth on its own defaults: self-update on, Claude hook, MCP and skills
   writes on start, outbound to Limelyte's gateway, no source, no tmux socket setting, a dashboard of
   every pane.
5. CC Pocket ranks above VibeTunnel, because the Zen column comes first: VibeTunnel's kinds are
   Session Started, Your Turn, Command Failed, Bell (`docs/push-notification.md:14-37`); CC Pocket
   carries approval and AskUserQuestion cards.
6. A Capacitor shell does not get Tortie's components byte for byte: `src/renderer/index.html`'s CSP
   has no `connect-src` and `build/assert-preview-containment.mjs:242-250` fails the build if one
   appears; every session-manager component binds the store or `window.gmux`.
7. iOS App Transport Security no longer allows connections by IP address by default since iOS 17
   (Apple's `NSAllowsLocalNetworking` page); the investigator's sentence covered iOS 10 through 16.
   The app connects by name; by address needs a compile-time CIDR entry.
8. "A native app's push needs a secret that cannot sit on every Mac" is refuted as an impossibility
   by Bark (§6); it stands as a ruling at a named cost.
9. `tailscale serve` survives a reboot with `--bg` ("Serve automatically resumes sharing",
   https://tailscale.com/kb/1242/tailscale-serve); without it you restart it by hand.
10. The Tailscale identity header is worth nothing against a local agent: `addTailscaleIdentityHeaders`
    (tailscale/tailscale `ipn/ipnlocal/serve.go:1082-1100`) sets the headers only inside the reverse
    proxy and returns with none for "traffic from outside of Tailnet (funneled or local machine)";
    Serve proxies only to `http://127.0.0.1`, so a local process connects to the port directly and
    sends whatever header it likes.
11. A bearer token on a port is captured by whoever holds the port next. Under Serve, TLS ends in
    tailscaled, so the phone cannot tell Tortie from an agent's `python -m http.server`; `hooks.ts:230-236`
    already treats a taken port as routine by falling to an ephemeral one. With 10 and 12, this ends
    the charter's own door (Serve on loopback with a token per phone) and gives §5's corrected one.
12. "Remove revokes at once" is true only until a same-uid process writes an old sealed copy back
    (`src/main/config/seal.ts:37-43`); the door keeps the live phone set in a keychain item.
13. A native APNs alert is JSON Apple reads; a web push payload is encrypted before Apple sees it. A
    native push may not carry the question or the excerpt in the clear.
14. Every non-Swift runtime has a mainstream over-the-air code path that must be refused in writing:
    Shorebird for Flutter (https://docs.shorebird.dev/code-push/), expo-updates, EAS Update and
    CodePush for React Native, Appflow and Capgo Live Updates for Capacitor. "Flutter loads nothing"
    was incomplete.
15. Restore is not a safe pocket verb and Remove is the one verb that loses work: the resume argv
    re-appends `--dangerously-skip-permissions` / `--dangerously-bypass-approvals-and-sandbox`
    (`src/main/agents/registry.ts:541,703`), so a stolen phone pressing Restore relaunches an agent
    with safeguards off and leaves it at a prompt nobody is in front of; Remove deletes saved output.
16. Variant B must not read `tailscale status` at bind time (`src/main/machines/tailscale.ts:26-31`);
    the address comes from the interface table.
17. "A relay the person runs" is a cloud component the moment it pushes (§6).
18. Pairing confirmation must bind to a key, not a name: the name on the sheet is whatever the first
    poster of the secret typed, and a QR on a screen can be photographed. Both sides show a short
    fingerprint and the person matches it.
19. Upterm's relay adds nothing on his tailnet, but not because of Tailscale SSH: "Tailscale SSH
    server: no \| no \| yes" and his Mac is Standalone, so only macOS Remote Login is available to him.
20. handmux is shipped code that claims iOS web push from a self-hosted process, not measured proof;
    nothing was measured in this phase.
21. Happier's local permission bridge is evidence the shape exists, not proof it works: "the
    experimental local permission bridge", and "the local subprocess still needs a restart for some
    spawn-time flag changes" (`docs/claude-feature-matrix.md:32`).
22. The escape hatch's desktop reflow is not inherent: attach-session `-f ignore-size` on his tmux
    3.6a man page. It remains a real cost of every product that attaches without the flag.
23. Remote Control's list marks online, not waiting ("a computer icon with a green status dot when
    online", vendor page line 152); it answers one push at a time, for one agent, on a subscription.
24. Installing Happy tonight shows none of his Tortie sessions; the one product that shows one is
    Remote Control, and only a Claude Code one.
25. Only End survives as a pocket verb from the gate set, and a read-only v1 is not the surface he
    asked for ("control them"); v1 carries End, the reply is v2.

Refutations the judge did not adopt, so the reasoning is on record: Bark's way as Tortie's way (the
key stays on the operator's Mac; the everyone-else question goes to him, §11); "reads and push in
v1, no write" (its objection was bearer capture, which the corrected door removes, and End is the one
verb a pocket has a use for); "End is the wrong tool for a dangerous prompt" (a kill switch is the
right tool for a runaway agent, a different event; the prompt's tool is the v2 reply); the reflow as
a fact about any phone client (narrowed to clients without `-f ignore-size`); and "the phone token is
what stands between an agent and End" (narrowed: with signed requests it is a key that never leaves
the phone, and loopback reachability is then a denial-of-service surface only).

## 8. What was not measured and why

- Whether Claude Code still draws its terminal permission dialog while an http `PermissionRequest`
  hook is pending, and which side wins if both answer. Decides whether the structured reply is a
  Tortie surface or a second dialog fighting the first. Needs a running agent; nothing here ran one.
- Which screen line the ⌘J excerpt lands on for codex, gemini and qwen dialogs; only Claude's captures
  are committed, and both end on the hint row.
- Whether Tortie runs on his Mac Pro. His machines file is off limits.
- Whether HTTPS certificates are enabled on his tailnet, and the Mac's tailnet name. The admin console
  and `tailscale status` are off limits; it is the precondition for the fallback web app only.
- Whether `claude --remote-control` starts when `--settings <path>` is also on the argv, and whether
  the Remote Control session URL lands in the transcript JSONL Tortie's overview reader parses. The
  first needs a running claude; the second needs his `~/.claude`, which is forbidden.
- Any push latency number. Apple documents best effort only; Expo and Firebase document none in the
  repositories read; ntfy gives a range only for the no-upstream case.
- Whether an APNs `.p8` key keeps signing after the $99 membership lapses. Apple's renewal page names
  loss of "Certificates, Identifiers & Profiles" and nothing about tokens signed from an existing key.
- Whether a free Personal Team can use the Push Notifications capability at all; only forum threads
  say no.
- Whether App Review accepts an app that only works with the Tailscale app installed (4.2.3(i)), a
  WKWebView shell whose whole purpose is a list from a bridge on the person's own Mac (4.2), or a
  canned demo mode for Beta App Review. Each is a reviewer's call; CC Pocket's LAN-first answer is the
  only precedent read.
- Whether iOS keeps a home-screen web app's push subscription alive across months unopened, and
  whether Safari revalidates its service worker on every launch.
- Whether a `tailscale serve` entry keeps proxying to whatever later binds Tortie's port (believed
  yes), whether reading loopback or utun traffic on macOS needs root (believed yes), whether
  Electron's hardened runtime stops a same-uid process reading main's memory, and whether
  `safeStorage`'s keychain item prompts when another process reads it. The seal and the machine gate
  already accept these; none was measured here.
- Whether TailscaleKit in-process needs a Network Extension entitlement or a VPN review category
  (read from libtailscale's README only); how the Tailscale node behaves across a lid close and a wake
  (only GitHub issue reports); the real DERP-relayed latency from hotel wifi (research 28's band).
- How often a blocked session is a prose question rather than a dialog: an agent that asks in prose
  and ends its turn is `idle`, never `needs_input`, so the list will not raise it. Only his own
  sessions would say, and they are off limits.
- Interrupt as a pocket verb (a Ctrl-C into the pane): every agent-aware product has stop or abort;
  Tortie has only End. It is the same door class as the numbered reply and nobody costed it.
- Whether Node's http server defaults (`headersTimeout`, `requestTimeout`, `maxHeaderSize`) are enough
  for a door that parses untrusted network bytes inside main — a Tier 3 hardening item for the build.
- Shunt's ability to watch a non-default socket, how its Approve reaches a pane, its FCM push body;
  SSHHIP's socket naming; Omnara's former wrapper; Happy's current store build against `f3ee9216`;
  Orca's relay encryption; Moshi's push path and `moshi-hook` licence. No source, or not cloned
  (Happier's clone was 282 MB after trimming and Orca's 383 MB, over the 200 MB cap; Orca was read
  once and deleted).
- The 6-inch usability of anything: nothing was driven on a phone; every tap count and legibility
  claim is read off docs and screenshots.

## 9. What this recommends against

Five things the charter said or assumed, said plainly. First, "whether they be local or on another
mac" is not true of the two things that carry the Zen: today the phone can list a Mac Pro session as
running, idle, not running or unreachable and can End it; it cannot be told the session needs him,
cannot digest it and cannot push for it, until Tortie runs on the Mac Pro too or he overturns the
sentence at `remote-sessions.ts:1031-1034`. Second, a phone that only tells him is less than Remote
Control gives him tonight for any Claude Code session, so the honest v1 does not rebuild the reply: it
builds the one thing Remote Control cannot do and hands a Claude row off to Remote Control for the
answer. Third, the charter's own door — `tailscale serve` on loopback with a token per phone — is
refuted on the boundary and is not the door (§7, items 10 to 12). Fourth, "the ⌘J excerpt is real" is
true of the mechanism and wrong about the dialog: for every Claude prompt the excerpt is the hint
row, and the question main already receives is thrown away twice. Fifth, "simple" costs more than the
charter's sentence: the Tailscale app and an SSO login, the Tortie app and one pairing, $99 a year to
Ita Vero, organisation enrolment, a privacy page and a demo mode for review, the Tailscale app on the
phone to do anything away from home, nothing while the lid is closed, and push for the operator alone
until he rules on the key.

Two of the charter's client shapes are recommended against outright. A client for an OSS relay's
protocol with Tortie as host (Happy's or Happier's) makes the phone their app, which is the refusal he
named; their protocol docs are what teach, and their hosts must own the process. ntfy with no client
puts ntfy.sh in the path and a second app on the phone, and carries no verb. And the home-screen web
app is the fallback for the boundary's reason as well as his: on a Serve origin a same-uid port
squatter owns the origin and its storage, the page cannot pin a certificate, and a write cannot sit
behind Face ID.

## 10. The phase this would queue

Subject: `feat(pocket): the sessions on my machines, from my pocket`. First body line: `Phase N: the
Tortie iOS app, v1 — the list, the push, and End`. Semver: minor on the desktop (a new settings
surface, a door in main, new contract channels), and the first version of a second product, the iOS
app, under its own version.

Tier 3, for three reasons from CLAUDE.md's table: it holds his credential (Ita Vero's APNs key and
the phone keys, under `conformance:credentials`), it sends his status words to Apple, and End can
lose work. It spawns nothing. Two independent methods, one of which is an attack on the door with a
scripted hostile phone; a per-agent matrix for the question line over claude, codex, gemini and qwen
captures; and the parent-commit measurement of the excerpt (the hint row) against the question.

The refusals it carries, each pinned in the bundle the way `confirm.ts:88-110` pins the machine
gate's: no code arrives in the phone app at run time; the door hands data and never code; never
`0.0.0.0`; no bearer on the wire; no route that sets a status, starts a process or reads a
credential; no cookie; a source address equal to the bind address refused before any header; no
token, body or conversation line in any log; the route table closed; the APNs key never in the app
and never on another Mac; no Restore, Remove or Restart from the pocket; no free text into a pane.

Files it touches, read from this tree. New: `src/main/pocket/{bind,tls,pairing,server,routes,verbs,ipc}.ts`;
`src/main/push/apns.ts` beside the credentials domain; `src/shared/ipc/pocket.ts` behind
`src/shared/ipc/index.ts`; `src/shared/session-gates.ts` (the gate moved out of
`src/renderer/state/resume.ts` with `hasRestoreMaterial`, `offersBareRecovery`, `showsResumeVerb`);
`src/renderer/settings/PhoneSection.tsx` and its css; `build/conformance-pocket.mjs`;
`build/ablation-p<N>.mjs`; `build/p<N>/probe.mjs`; the iOS project under `ios/` with the codegen step
that emits tokens, copy and contract types from `src/shared/`. Edited: `src/main/sessions/core.ts`
(`onSessionsBroadcast` to a listener list); `src/main/activity/hooks.ts` and `monitor.ts` (keep the
`PermissionRequest` body's question beside the status instead of dropping it at `:438-440`, and the
QUEST row from `screen.ts`); `src/renderer/overview/line.ts` (the `needs_input` arm);
`src/main/config/confirm-record.ts` (third key prefix); `src/main/ipc.ts`; `src/main/capabilities.ts`
(disposer order); `src/main/menu.ts` (Settings → Phone, per the UI rule that a new surface updates
the native menus); `src/preload/index.ts` (derived from the contract); `src/renderer/state/resume.ts`
and `src/renderer/session-manager/actions.ts`, `projection.ts` (import the moved gate);
`docs/audits/contract-baseline.txt` (regenerated, the new channels and any `GMUX_POCKET_*` harness
override named in the body); `build/assert-import-boundaries.mjs` (a wall row for `main/pocket/`);
`build/assert-bundle-refusals.mjs`; `package.json`; the CLAUDE.md gate table; `docs/BACKLOG.md`.

Gates it adds or moves: `conformance:pocket` (~1 s, no Electron: one `listen` call, host from the
allowlist function only, no import of the monitor's commit paths, every write route names a core verb
and re-reads by id, closed route table, no bearer, `/pair` dead outside the window, acknowledgement
supplied in main only, the phone set in the keychain and never in the sealed file alone);
`ablation:p<N>` reddening each rule once; `conformance:manager` re-pointed at the shared gate;
`conformance:credentials` widened to the APNs key; `gate:contract` for the new channels;
`gate:background` for any probe that starts the door; and `probe:p<N>`, one Electron over a scratch
HOME with the door forced to loopback and a scripted phone that pairs, lists, ends a scratch session,
is refused with a stale key, and is refused a status write. A fix round, then an independent reverify.

## 11. The ruling it needs from him

Six questions, in his words, and the document ends with them.

1. "Should my phone be able to end a session, or only tell me one is waiting?" End in v1 behind Face
   ID is the recommendation; Restore and Remove stay out because one relaunches an agent with its
   safeguards off and the other deletes saved output.
2. "May a phone I paired press the buttons the agent drew — allow or deny, 1 or 2 — or only tell me?
   And may it ever type a line into a session?" The structured reply is v2 and needs one measurement
   first (whether Claude's terminal prompt and a pending hook coexist); free text is the remote arm's
   rule 1 and stays refused unless he says otherwise.
3. "Should the door answer on my home Wi-Fi too, so the app works without Tailscale, or only on the
   tailnet?" The tailnet alone is the charter's line and needs the Tailscale app for everything,
   which is guideline 4.2.3(i)'s shape; Wi-Fi over Bonjour is CC Pocket's answer and a widening made
   tolerable only by the corrected door.
4. "Does 'no third-party native code inside the signed bundle' cover the iPhone app too?" Its stated
   reason is a macOS entitlement with no iOS analogue, but read literally it leaves Swift as the only
   route; the recommendation is Swift either way, so the answer changes nothing built and everything
   a later round may propose.
5. "Is Tortie going onto the Mac Pro, or may the laptop read claude's registry over ssh so the phone
   can be told a Mac Pro session needs me?" Today it cannot be told, and the second answer overturns a
   sentence the code calls the one status rule Tortie does not break.
6. "For people who are not me, does the push key ship inside the app the way Bark does, or do they
   get no push?" The key stays on his Mac in v1 and nobody else has push until he answers.
