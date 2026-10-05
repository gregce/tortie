# 139. A live session on the phone: what ten agent apps do, and how Tortie should do it

Written 5 October 2026 against the tree at `b7bd1e1a` ("docs(backlog): queue a place to type in every
conversation"). This is research only. Nothing of any other product was installed, built or run, and no
Electron, no Simulator, no screenshot and no model turn was used. Two scratch tmux servers were started on
sockets of their own (`r139map-<pid>` and `r139map2-<pid>`, never `-L gmux` and never the default server), and
both were ended in a `finally`. Nothing of his was read or sent anywhere.

It answers his questions of 5 October 2026, in his words: "fully native, see what is running on a terminal
session that we're connected to (for any of our supported providers) ... connecting to a session behaves as if
i'm in that session on my mac and I can interact with it from my phone", and "look at checkouts of their
public repos and determine from that actually how we should approach adding it ... also look to understand if
there are ideal rendering libraries we can use for agent chats or how we'd accomplish this to make it feel like
we're natively interacting with the terminal we're connected to running on our mac". Earlier he asked to
"evaluate how to achieve this coherently within our current design".

Which products. The comparison catalog behind tortie.sh (`/Users/gdc/tortiedotsh/src/data/comparison-catalog.ts`
at `a9148a4`) lists every product with a phone client. Ten have public source and were read: cmux (line 989),
Orca (1134), Paseo (1189), Superset (1198), Happy (2290), Happier (2309), VibeTunnel (2323), Omnara (2338),
Termix (2418) and CC Pocket (2721). Superset was read in his own checkout. Omnara's phone app exists only in
its history, and Termix's phone app lives in a second repository. Section 10 gives every commit.

The round. One investigator read each product's source, one surveyed rendering libraries for Swift, and one
mapped what Tortie already has and measured tmux on a scratch server. A synthesis ranked the options. By his
instruction there was no adversary round. The writer then checked the claims this document leans on hardest
against the clones and the tree, and found four things the synthesis had wrong or missed (section 9.2). The
largest is that the phone's own rule (z1) refuses `NSAttributedString`, so a TextKit text view needs his
ruling.

## 1. The answer first

Give every session a Screen beside its Conversation. The Screen is that session's real terminal screen. The Mac
reads it from Tortie's private tmux server and sends it to the phone as rows of styled text, and the phone
draws the rows with Apple's own text drawing. You type through 318.1's message box, with dictation and
autocorrect, and through a small key bar: Esc, Tab, Shift-Tab, the arrows, Return and digits. Each key is a
signed write. The phone never changes the size of your Mac's session. It draws the Mac's width, and you zoom,
pan or turn the phone sideways.

This works the same for every agent, for a plain shell and for sessions on another machine, because tmux
already holds every session's screen. It fits the door as built: one new signed read and one new signed write,
and every answer still goes out whole with a `Content-Length`.

Why this shape. The two products that built a native chat as their phone's main surface, cmux and Superset,
deleted it and kept the terminal. The products whose phone is only a chat get that chat by taking the agent
away from its terminal through Anthropic's or OpenAI's interfaces, which Tortie's tmux rule forbids. And the
App Store approves this shape today: Paseo, Happier, Orca, Superset and Termix are all live with a terminal of
the person's own computer reached over the internet. That contradicts research 136's "No raw terminal, ever" as
something review requires, so the first step is his ruling on that line.

Start without a terminal library. tmux is the emulator, and drawing rows takes a small amount of Apple-framework
code. Measure the round trip through Funnel first. If the Screen then feels like a picture rather than a
terminal, the upgrade is a live byte stream from a tmux viewer client into SwiftTerm (MIT), copied into the app
as source, which needs his rulings on four of the phone's rules.

For chat, keep Tortie's own markdown parser and change how answers are drawn: one text view per answer, inside
a list that only builds the rows on screen. No Swift markdown library both passes the phone's rules and fixes
the memory cost Phase 316.6 measured.

## 2. How each product does it

### 2.1 Side by side: what the phone shows and where it comes from

| Product (commit, licence) | Phone app | What the phone shows | Where the content comes from | In the store |
| --- | --- | --- | --- | --- |
| cmux (`dda24fbd`, GPL-3.0-or-later, server parts BUSL-1.1) | Native Swift, about 234,600 lines | A live mirror of the Mac's terminal, plus a Feed of decisions. Its chat pane was deleted on 23 August 2026 | Raw PTY bytes from a tee before the Mac's parser, plus styled grid frames for attach and resync. The Feed comes from agent hooks | TestFlight only. Three third-party cmux remotes are live |
| Superset (`3dd63ff11`, Elastic-2.0) | React Native, iOS only | A live terminal per session, a native composer and quick keys. Its chat was deleted on 12 August 2026 | Raw PTY bytes through a Cloudflare relay, with an `epoch:seq` catch-up. Status from hooks | Live, 1.1.2, iOS 26 |
| Orca (`17ecee63`, MIT) | React Native | A live terminal or a Chat UI, per tab | Terminal: a serialised headless xterm, then numbered output frames. Chat: the agent's transcript file plus hooks | Live, 0.0.52 |
| Paseo (`2f0cb2f`, Apache-2.0) | React Native | Agents as a chat; Terminals as a live terminal. A terminal agent never becomes a chat | Chat: each vendor's programmatic interface. Terminal: node-pty bytes, parsed on the phone | Live, 0.10.3 |
| Happier (`51f8ac63`, MIT) | React Native | A chat first, and a Terminal tab that attaches to the agent's real TUI | Claude Agent SDK by default; an optional Claude TUI in tmux read through transcript, hooks and the screen; Codex app-server shared with the TUI | Live, 0.2.11 |
| Happy (`dafe9a5`, MIT) | React Native | A chat only | Claude transcript file while you are at the Mac; the Agent SDK once the phone sends anything | Live, 1.7.0 |
| CC Pocket (`8354ffd`, MIT) | Flutter | A chat only | The Agent SDK and Codex app-server, owned by its own bridge process | Live, 1.140.0 |
| VibeTunnel (`f78324f`, MIT) | Native Swift around a web view | A live terminal; a scraped Chat Mode on the web only | Raw PTY bytes from its own forwarder, replayed from a cast file | No listing; its README says not for production |
| Termix (`6c342f3` and Mobile `f43aee4`, Apache-2.0) | React Native | A raw SSH terminal, and remote desktop | An SSH channel the Termix server owns | Live, 1.5.1 |
| Omnara (`3e9edc1`; phone at `500a82ad`, Apache-2.0) | React Native, now deleted | A chat or a terminal per session, never both | Chat: transcript plus screen scraping. Terminal: PTY bytes through a relay | Was live with a terminal in 1.4.5 (2025); now a closed successor |

### 2.2 Side by side: drawing, size, typing and suspension

| Product | Terminal drawing | Who sets the size | Typing | After iOS suspends the app |
| --- | --- | --- | --- | --- |
| cmux | Its own fork of libghostty, drawn with Metal | "Fit everyone" by default, which shrinks the Mac. Other modes draw the Mac's grid scaled, with pinch and pan | A full keyboard to the PTY, a key bar, and a composer that pastes then submits | Redials and resumes from cursors |
| Superset | xterm.js in a web view | The smallest visible client, so the Mac shrinks while the phone looks | Composer and quick keys only. The keyboard never types into the PTY directly | Paints a cached screen, then asks for the missed bytes |
| Orca | xterm.js in a web view | Phone-fit by default, shown on the desktop as "Your phone is in control". A desktop mode scales instead | Direct keystrokes by default, or a command box. A key bar | Reconnects and re-snapshots |
| Paseo | A native grid of styled text runs, fed by a headless xterm on the phone | The last client to tap claims it. Looking alone never resizes, but clips the right-hand columns | A hidden text field and a key bar | Reconnects and re-snapshots |
| Happier | xterm.js in a web view | The phone, through tmux's default rule | A composer for the TUI, and four quick keys in the terminal | Disconnects, catches up on return |
| Happy | None | Not applicable | A chat composer that takes over the Mac's session | Re-fetches everything |
| CC Pocket | None | Not applicable | A chat composer | Asks for the events since a sequence number |
| VibeTunnel | ghostty-web (WASM) in a web view | The last resize wins | A key bar with fixed byte sequences | Resets and replays |
| Termix | xterm.js in a web view | One owner at a time; the other device is evicted | A native text field and a key bar with fixed byte sequences | Reattaches; the server replays up to 512K characters |
| Omnara | xterm.js loaded from jsDelivr at run time | The last writer wins, on one shared PTY | The web view's own keyboard and a five-key bar | The terminal never reconnects |

### 2.3 Each product in a paragraph

cmux is the only product that runs a real terminal engine natively on the phone. The Mac tees the PTY's bytes
before its own parser and also exports styled grid frames carrying revision and epoch numbers, because "a byte
tail is not a complete screen state for TUIs" (`Sources/Mobile/MobileTerminalByteTee.swift:14-17`). The phone
replays a grid frame into its own libghostty as synthesised escape codes
(`Packages/Shared/CMUXMobileCore/Sources/CMUXMobileCore/MobileTerminalRenderGridReplay.swift:3-36`). It drops
everything its own emulator writes back, because forwarding focus reports "made the Mac type a literal [O[I"
(`GhosttySurfaceView.swift:6267-6292`). cmux built a native chat pane and removed it, about 110 files, "so it
can never be discovered again" (`CHANGELOG.md:792`, PR #10576). Approvals live in a Feed fed by hooks that waits
up to 120 seconds and then lets the agent ask in its own terminal (`docs/feed.md:139-143`).

Superset is terminal-first by deletion. It shipped a chat on 9 July 2026 (`b279769dd`) and removed it on 12
August (`b5dd42ce7`, "terminal-first — delete chat stacks, terminals as sessions"). That chat drove Superset's
own in-process agent runtime, not the command-line agents in its terminals. The phone keyboard never types
into the PTY: "All typing goes through the composer and quick keys" (`apps/mobile/scripts/generate-terminal-html.ts:701-709`).
The host brackets a paste only when the program asked for it, then sends Enter as a separate write 500 ms later
(`packages/host-service/src/terminal/terminal.ts:1166-1190`). Sizing the PTY to the smallest visible client
pinned every desktop pane at 45 columns when a phone vanished, until a liveness ping was added (`ca1d178f9`).

Orca offers both a terminal and a Chat UI and lets the person choose per tab. Its own docs say "The terminal
remains the source of truth; Chat UI is a structured transcript + composer for the same PTY", and "Prefer the
raw TUI when you need every OSC/status detail" (`docs/site/content/docs/agents/native-chat.mdx:8, 33-34`). It
says approvals over a TUI have "no structured permission event on mobile"
(`mobile/src/session/mobile-native-chat-permission.ts:7-12`). Its table of per-agent typing traps is the most
useful fact sheet in the set (`src/shared/agent-prompt-injection.ts:6-25`).

Paseo has two kinds of session and two surfaces. Agents it drives through vendor interfaces appear as a chat.
Agents run by hand in its terminals appear only as a terminal. Since 0.3.0 its phone terminal is a native grid,
not a web view: a headless xterm parses on the phone, and each visible row is drawn as runs of styled text,
cached by a hash of the row (`packages/app/src/terminal/native-renderer/terminal-row-model.ts:49, 62-71`). It
left the web view because text could not be selected and links could not be tapped (issue #2393). Research 137
described the old web view, and this corrects it.

Happier is a fork of Happy that adds a real-terminal attach and an optional "unified terminal" for Claude Code
in tmux. Its draft guard reads the agent's prompt before every write and holds a message it cannot place, with
the words "Terminal draft is blocking delivery". It "never clears a draft it did not write without you
asking" (`apps/docs/content/docs/sessions/claude-unified-terminal.mdx:40-53`). When Claude draws a dialog Happier
does not know, the chat shows a card whose one button opens the live terminal
(`apps/ui/sources/text/translations/en.ts:6752-6757`).

Happy shows a chat built from Claude's transcript while you are at the Mac. The moment the phone sends a
message, it stops the Mac's Claude TUI and relaunches the conversation under the Agent SDK
(`packages/happy-cli/src/claude/claudeLocalLauncher.ts:75-90`). The Mac then shows a placeholder until someone
presses space twice (`packages/happy-cli/src/ui/ink/RemoteModeDisplay.tsx:223, 228`).

CC Pocket is the agent host itself: Claude through the Agent SDK and Codex through `codex app-server`. It
stopped at two providers and refused a third because of "the substantial implementation and ongoing maintenance
cost of a third full-stack provider integration" (issue #10). It ships claude.ai sign-in switched off, because
Anthropic does not allow third parties to offer it through the Agent SDK unless previously approved
(`packages/bridge/src/sdk-process.ts:124-137`). It tried a shared Codex app-server that the TUI joins with
`--remote`, and shelved it (`docs/design/shared-app-server.md:355-406`).

VibeTunnel runs ghostty-web, a WASM build of Ghostty's emulator, in a web view on the phone and in the browser,
and headless on the server. Its web Chat Mode scrapes the terminal with about 40 hard-coded Claude Code and
Gemini strings (`web/src/client/components/terminal-chat-view.ts:642-720`). Its keys are fixed byte strings
whatever cursor mode the program asked for (`ios/VibeTunnel/Models/TerminalData.swift:100-157`).

Termix is a general SSH and remote desktop app, not an agent product. Even so, it took the keyboard away from
its web-view terminal and typed through a native text field
(`modules/terminal-ime-input/ios/TerminalImeInputModule.swift:4-177` in the Mobile repository). Its phone becomes
the single owner of a session and resizes it to about 47 columns, evicting the desktop
(`plugins/ssh-terminal/src/backend/session-manager.ts:374-388`).

Omnara's phone app showed a chat or a terminal, never both, chosen when the session started
(`apps/mobile/src/screens/dashboard/InstanceDetailScreen.tsx:59-60, 457-465` at `500a82ad`). Its own post-mortem
says wrapping the Claude Code command line "became unfeasible to maintain with Claude Code's constant updates"
(`README.md:5` at `500a82ad`). The repository is now an unrelated agents API.

## 3. The patterns

### 3.1 A terminal emulator on the phone, fed the session's raw bytes

Who: cmux natively, and VibeTunnel, Orca, Superset, Happier, Termix and Omnara through a web view.

The computer sends the PTY's bytes, and the phone's emulator parses them. On attach something must seed the
screen first: cmux replays a styled grid, Orca serialises a headless xterm and trims scrollback in tiers from
1,000 lines to 0 (`src/main/runtime/rpc/methods/terminal/terminal-snapshot-publication.ts:240-273`), Superset
keeps a 2 MiB catch-up ring keyed by `epoch:seq` (`terminal.ts:259-306`), and Termix and VibeTunnel replay a
raw buffer.

It works for every agent and shell with no per-agent code, and it shows permission dialogs, pickers and slash
menus that no transcript carries. Its costs: most of the code is glue rather than emulation (Orca's phone
terminal is about 11,700 lines; Termix's `Terminal.tsx` is 1,818 lines plus about 2,595 of keyboard code;
cmux's `GhosttySurfaceView.swift` is 6,671 lines). An emulator that only displays still answers the terminal's
queries, and those answers must not reach the agent. Everyone except cmux uses a web view, which Tortie's rule
(g) refuses.

### 3.2 A native grid drawn from a screen parsed elsewhere

Who: Paseo by default, cmux's grid frames, and VibeTunnel's session thumbnails.

A parser turns escape codes into a grid of cells, on the phone (Paseo) or on the computer (cmux). The phone
draws only the visible rows, as runs of same-styled text. Text can be selected and links tapped natively, and
no web view is needed. The trap is sending the whole grid as objects on every update: Paseo's grid snapshots
caused "spiky lag and GC hitches" (`docs/terminal-performance.md:26`), so it now sends a full grid only on
attach and when a client falls far behind. One view per cell is the expensive shape (VibeTunnel's
`TerminalBufferPreview.swift:16-35`).

### 3.3 A chat built by owning the agent's programming interface

Who: Happy, CC Pocket, Happier's default, Paseo's Agents, Orca's structured sessions, and Omnara's headless mode
and its closed successor.

The host launches the agent through its SDK, app-server or ACP and receives typed events: text deltas, tool
calls and permission callbacks (`packages/bridge/src/sdk-process.ts:818-863, 1507-1571` in CC Pocket). It gives
real structured approvals and token streaming. But the agent is no longer the terminal session: Happy kills the
Mac's TUI to give the phone control. Every provider needs its own full stack. For Tortie it inverts the founding
rule that sessions live in tmux.

### 3.4 A chat derived from a live terminal session

Who: Orca's Chat UI for 7 agents (`src/shared/native-chat-agent-support.ts:7-15`), Happy's local mode, Happier's
unified terminal (Claude only, 37,521 lines), Omnara's chat mode, VibeTunnel's web Chat Mode, and Tortie's own
Conversation today.

It reads the agent's transcript and hooks beside the running TUI and leaves the TUI in place. It is good for
reading at length. Updates arrive a block at a time, not token by token: Orca's live bubble is the hook's
`lastAssistantMessage`. Approvals become keystrokes plus guesswork. Scraping breaks with every agent release.

### 3.5 Terminal first, with structured decisions beside it

Who: cmux (the Feed), Superset (a "Needs you" state from hooks, `packages/host-service/src/events/map-event-type.ts:66-77`)
and Happier (an unknown dialog becomes a card that opens the terminal).

The terminal is the session. Hooks supply status and, where it is safe, answers. Anything unstructured is
answered in the terminal. Two teams built a chat and removed it, which is a strong product signal, and the
shape matches Tortie's existing hooks and numbered-choice reading. Agents without a blocking hook keep their
approvals in the TUI; cmux says so of Codex (`docs/feed.md:135-137`).

### 3.6 A composer that pastes into the TUI, plus a key bar

Composers: cmux pastes bracketed, chooses the submit key per agent and waits 150 ms. Superset brackets only when
the program asked, then sends Enter 500 ms later. Orca sends Claude's Enter in a separate write 50 ms after the
paste, keeps Codex's typed text out of the paste's write, and types slash commands one key per write. Happier
holds a message rather than merge it with a draft. Tortie's Phase 318 pastes bracketed, then presses Return
(`src/main/reply/writer.ts:25-31`).

Key bars: Paseo has Esc, Tab, Ctrl, Alt and Shift as one-shot modifiers, the arrows, Paste and Enter. Orca adds
Shift-Tab, Ctrl letters and repeating arrows. Superset has esc, return, tab, shift-tab, the arrows and ^C.
Happier has only Esc, ^C, ^D and Enter.

Prose through a native text field keeps dictation and autocorrect, which a keystroke-at-a-time path has to
discard (Paseo throws autocorrect replacements away, `terminal-input.native.tsx:46-80`). Fixed escape-byte tables
ignore the program's cursor-key mode (VibeTunnel, and Termix's native app at `terminalInputMapping.ts:20-121`).

### 3.7 Who decides the size of the session

The phone resizes: Termix (one owner), Omnara (last writer), VibeTunnel (last resize), Happier (tmux's default),
Superset (smallest visible client), Orca by default (phone-fit, held until someone restores it), cmux by default
("Fit everyone"). The phone defers: cmux's other modes, which scale the Mac's grid with pinch and pan
(`GhosttySurfaceView+ScaledGrid.swift:6-12`), Orca's desktop mode, and Paseo while you only look, which clips
the right-hand columns.

Resizing makes text readable on the phone, but it reflows the agent on the Mac and leaves old scrollback laid
out at the old width. Deferring leaves the Mac alone and needs zoom and pan. Tortie's tmux config sets no
`window-size`, so tmux's default `latest` applies (section 4.2 measures what that does).

### 3.8 Reconnecting after iOS suspends the app

None of the ten keeps a terminal socket alive in the background. Paseo, Orca, Superset and cmux take a
snapshot, then stream with sequence numbers. Termix, VibeTunnel and Omnara replay a raw buffer, and Omnara's
terminal never reconnects at all. CC Pocket and Happy catch up on structured events. Most open bugs live here:
Paseo's scrollback cut to about 200 lines after a re-attach (#6137, opened 5 October 2026), Orca's half-open
sockets that "look alive, ignore input" (`mobile/issue-5049-unresponsive-session-findings.md:12-62`), and cmux
rebuilt its transport because relay credentials expired while iOS had the app suspended
(`docs/irx-transport-design.md:1-20`).

## 4. What Tortie already holds

### 4.1 The pieces a Screen would reuse

| Need | What exists | Where |
| --- | --- | --- |
| Every session's screen, visible or hidden | tmux's private server holds it, and main already captures styled screens with `capture-pane -e` | `src/main/capture/service.ts:11`; `src/main/reply/input-row.ts:1-40` reads a styled prompt row |
| A remote session's screen | `capture-pane` is a ledger verb on the exec plane, classed as a safe read | `src/main/machines/exec-plane.ts:29-33` |
| Typing into a local session | 318's one writer, a bracketed paste and Return, with a ledger and `noteUserInput` | `src/main/reply/writer.ts:1-40`; `src/main/activity/monitor.ts:535` |
| Typing into a remote session | 320.1's `type-bytes` row: `send-keys -H` with literal bytes. An eighth row needs his yes | `src/main/machines/scroll-shapes.ts:43-60, 160-165` |
| A late Return is dangerous | A Return about 200 ms or more after a digit approved the next, unseen dialog 8 of 8 | research 135 §2.3 |
| The door's shape | One listener, one request per connection from the phone, timers of 15 s, 4 connections per source and 32 in all, a 5 s keep-alive the server already allows | `src/main/pocket/door/limits.ts:21-35`; `ios/Tortie/Door/DoorClient.swift:36` |
| What Allow confirms | The route list is a hashed field, and each write route adds a clause shown at Allow | `src/main/pocket/pairing.ts:342, 406, 445` |
| The route table | Two reads and three writes for a session today | `src/main/pocket/door/table.ts:78-84` |
| The attach host, for a stream later | One node-pty per visible session, with flow control at 256 KB | `src/main/attach/attach-host.ts:1-20, 93` |
| The terminal palette | `terminalTheme`, from DESIGN.md §1.6. It is not in `tokens.css` | `src/renderer/terminal/theme.ts:27-35` |
| The Mac's highlighter | Shiki 4.4.3 | `package.json:318, 355` |
| tmux sizing | No `window-size` line, so `latest` applies | `resources/gmux-tmux.conf` |

### 4.2 What was measured on a scratch tmux server

Measured in this round with Homebrew tmux 3.6a, on sockets named `r139map-<pid>` and `r139map2-<pid>`, each
killed in a `finally`. Tortie vendors tmux 3.7b, which was not measured here. The scripts and their output are in
the session's scratchpad under `r139/tortie-map/`.

| Question | Result |
| --- | --- |
| A full styled 120 by 40 screen through `capture-pane -p -e` over a control client | 5,234 bytes with control-mode framing (3,979 bytes as plain text); 0.2 ms median and 0.25 ms at p90 over 30 runs |
| The same through a spawned `tmux` | 4.3 ms median, 4.9 ms at p90 |
| Does a control client change the window's size? | No: 120x40 stayed 120x40, with plain and with `read-only,ignore-size` flags |
| Two ordinary clients under `latest`, a 160x45 "Mac" and a 50x30 "phone" | The window followed whichever pressed a key last: 160x44, then 50x29, then back. The lost row is the status line, which Tortie turns off |
| An ordinary "phone" client attached with `-f ignore-size` pressing a key | The window stayed 160x44 |
| A control client attached `read-only` sending `send-keys` | The keys still reached the pane ("ABC"). The read-only flag stops typed keys, not commands sent over control mode |

The committed styled captures of real Claude Code 2.1.287 and Codex 0.160.0 screens
(`build/fixtures/reply/*.ansi`, 16 files) use 464 basic, 283 256-colour and 38 24-bit colour codes between them.
A Screen that maps colours onto a 16-colour palette will lose shades on real agent screens.

## 5. Rendering libraries

### 5.1 The phone's rules every library meets

| Rule | What it refuses | Where |
| --- | --- | --- |
| (f) | A Swift package in the project, because no rule reads its sources | `build/conformance-ios.mjs:1350` |
| (g) | `JSContext`, `JavaScriptCore`, `WKWebView`, `import WebKit`, `dlopen`, `evaluateJavaScript` | `build/conformance-ios.mjs:81-82, 1364` |
| (c) | `URLSession` and other URL loading anywhere in the app | `build/conformance-ios.mjs:23-32, 971` |
| (z1) | `AsyncImage` and `NSAttributedString` outside DEBUG, as "the attributed string that imports HTML" | `build/conformance-ios.mjs:280-281, 4481` |
| (a) | Any colour literal outside `Style/Tokens.swift`, which must mirror the dark base of `tokens.css` | `build/conformance-ios.mjs:17-19` |
| (b) | Any user-visible string outside `Style/Copy.swift` | `build/conformance-ios.mjs:20-22` |
| (k) | Trapping arithmetic on a number the door sends | `build/conformance-ios.mjs:92` |

The app targets iOS 18.1 (`ios/Tortie.xcodeproj/project.pbxproj:342`) and is 14,473 lines of Swift under
`ios/Tortie`. Markdown is off by his ruling of 2 October 2026: `MarkdownCaps.pieces` is pinned at 0
(`ios/Tortie/Markdown/Caps.swift:110-115`).

No renderer changes the App Store question. That depends on what a reviewer sees, not on how it is drawn.

### 5.2 A live terminal

| Option | Licence and upkeep | On iOS | What the Mac must send |
| --- | --- | --- | --- |
| SwiftTerm (`15fed4f`) | MIT. 591 commits in the last year; v1.20.0 on 18 August 2026. An optional Metal renderer since March 2026. Used by Secure ShellFish, La Terminal and CodeEdit. 59,522 lines of Swift without the Mac files, four times the app | iOS 14 and later, Swift tools 6.2. Full `UITextInput` with marked text, hardware keys, an accessory bar, selection handles. No network code and no JavaScript | Bytes into `feed(byteArray:)` (`Sources/SwiftTerm/Apple/AppleTerminalView.swift:1203`). The emulator's own query answers leave through `send(source:data:)`, which is `open` (`Sources/SwiftTerm/iOS/iOSTerminalView.swift:1821`), so a subclass can drop them |
| Full libghostty with Metal (what cmux does) | MIT. Upstream stopped building it for iOS on 12 August 2026: "lib-vt is the only thing we still build for iOS" (`src/build/Config.zig:809-811` at `35a81a9`). cmux maintains a fork with manual I/O (`docs/ghostty-fork.md:1914-1933`). Lakr233's package carries 18 patches and a prebuilt binary | The highest fidelity, at 18,192 lines of glue in cmux. `process_output` blocks and was killed by the watchdog on the main thread (`GhosttySurfaceView.swift:3808-3812`) | PTY bytes in manual I/O mode |
| libghostty-vt plus your own renderer | MIT. The official build has an iOS slice, but the API is "definitely going to change" (`include/ghostty/vt.h:9-11`). A Swift Metal renderer was announced in July 2026 and is not in the tree | State, render state with dirty rows, key and mouse encoders. No renderer. Needs Zig | Bytes, or its own checksummed snapshot format |
| xterm.js, ghostty-web or hterm in a web view | MIT, MIT, archived. Blink, which uses hterm, is GPL-3.0 | Breaks rule (g). Known IME and predictive-text problems | Bytes |
| The Mac sends rows, the phone draws them | No library | Glyph widths, box drawing, selection and input become Tortie's code | tmux is already the emulator |

Recommendation. For the first Screen, use no library: tmux composes and the phone draws rows. If the stream is
ever earned, copy SwiftTerm into `ios/` as source at a pinned commit, start with its CoreGraphics renderer, and
override `send(source:data:)` so only keys the person meant to send leave the phone. Watch libghostty-vt: if the
Swift renderer lands upstream as source, it becomes the strongest long-term core. Refuse any web-view terminal
and any libghostty fork or patch stack.

### 5.3 Agent chat

Phase 316.6 found that the drawing, not the parsing, cost the memory. Each block was its own view in a stack
that is not lazy (`ios/Tortie/Screens/ConversationScreen.swift:300-310`). A paragraph cost 38 to 49 KB and a
one-line code block 347 KB (`build/p3166/SPEC.md:1310-1314`). The parent build drew one `Text` per answer and
its page grew 0 to 8 MB whatever it held (`:1316`). A lazy conversation was measured and not shipped
(`:1387`).

| Library | Status | What adopting it would change |
| --- | --- | --- |
| MarkdownUI (`8371aeb`) | MIT, in maintenance mode | One view per block, so the same cost |
| Textual (`01b5187`) | MIT, iOS 18 | One view per block. Prism inside `JSContext` breaks (g); `URLSession` for images breaks (c) |
| Apple swift-markdown (`392b73b`) | Apache-2.0, active | A parse tree only. It changes no drawing cost |
| Down (`e754ab1`) | Last commit 2021, no GFM tables | Effectively dead |
| enriched-markdown-ios (`181bfcc`) | MIT, iOS 16, new in August 2026 | The design that fits: one TextKit 2 text view per document (`packages/enriched-markdown-ios/Sources/EnrichedMarkdown/Views/MarkdownTextView.swift:10`), code grounds drawn as decorations, tables as attachments. Its image downloader uses `URLSession` (`Utils/ImageDownloader.swift:15`) |
| Lakr233 MarkdownView (`d7c76ef`) | MIT, UIKit, active | Built for streaming; not full CommonMark by design |

Highlighters: Highlightr and HighlightSwift run highlight.js in `JSContext`, which breaks (g). Splash knows only
Swift and has been idle since 2022. Neon with SwiftTreeSitter is accurate but needs a C grammar package per
language. The Mac already ships Shiki, so it can send token spans and the phone runs no code.

Recommendation. Keep Tortie's own parser, which is bounded and tested against hostile input. Draw each answer
into one text view, with code grounds and quote rules as decorations and tables as attachments, inside the lazy
conversation 316.6 measured. Take enriched-markdown-ios as the design, not the package. Highlight on the Mac.
Send diffs and tool calls as structured records and draw them as native rows. Whether one text view per answer
brings the cost back near the parent build's is a hypothesis to measure.

A text view needs a ruling. A TextKit 2 text view takes an `NSAttributedString`, and rule (z1) refuses that word
anywhere outside DEBUG. The rule names the HTML import as its reason. The same applies to a TextKit Screen. A
SwiftUI `Text` built from an `AttributedString` needs no change, but on iOS it offers only whole-text copy, not
range selection. Question 4 asks him.

## 6. The options for Tortie, ranked

### 6.1 Option 1, recommended: the session's own screen, composed on the Mac and drawn natively

What he gets. Open a session and switch between Conversation, as today, and Screen. Screen shows that
session's real terminal with its colours, updating while it works, on this Mac and on another machine, for
every agent and for a plain shell. It is drawn at the Mac's width: pinch to zoom, drag to pan, or turn the
phone sideways. By estimate a 120-column session fits whole at about 10 to 12 pt in landscape and at about 5.6
pt in portrait, from a character width of 0.6 em. Type in the box, with dictation and autocorrect, and the words
land at the agent's prompt as if pasted at the desk. Esc interrupts. The arrows and Return move through a
picker, Tab and Shift-Tab work, and digits answer a numbered menu. The Mac's window never changes size.

How it works on the Mac.
- One new signed read, for example `/v1/screen`, answered by main outside the door process, like the other
  facts.
- Main runs `capture-pane -p -e` and a `display-message` for the cursor, width, height and alternate-screen
  state in one command block through the existing control client. Measured: 0.2 ms and about 5 KB for a full
  styled 120 by 40 screen.
- Remote sessions use the exec plane's `capture-pane`, already a safe read.
- Main turns the colour codes into rows of styled runs, widening `input-row.ts`'s reader into one module. It
  maps colours to palette token names and stamps a revision from a hash of the screen.
- Nothing attaches as a sized client, so nothing resizes. A control client was measured not to.

How it works through the door.
- A long poll: the phone sends the revision it has, and main holds the answer until the screen changes or
  about 10 s passes, inside the 15 s answer timer. The answer still goes out whole with a `Content-Length`.
- One read route and one write route (`keys`). The route table's hash and the contract baseline move. Because
  the route list is a confirmed field, every paired phone needs Allow again once, and the new write needs its
  own clause on the Allow sheet (`pairing.ts:342, 445`).
- The phone may reuse its connection under the server's existing 5 s keep-alive instead of a new mutual-TLS
  handshake per read. That is new phone code and a new hostile-door arm.

How keys work.
- A closed vocabulary sent by tmux key name (`send-keys -t %id Escape`, `Up`, `BTab`, `Enter`), so tmux encodes
  each key for the program's current mode, which fixed byte tables get wrong.
- Each key carries the revision and any question id the person was looking at. The door refuses it if a
  numbered question has appeared since: research 135 measured a late Return approving an unseen dialog 8 of 8.
- Every key goes through `noteUserInput`, and the at-most-once ledger works as it does today.
- Remote keys: 320.1's `type-bytes` carries literal bytes, not key names. Either main reads the pane's
  cursor-key mode and chooses the bytes (an inference, not measured), or named keys become an eighth ledger
  row, which needs his yes (`scroll-shapes.ts:160-165`).

How it works on the phone.
- A Screen view built only from Apple frameworks: each row one SwiftUI `Text` from an `AttributedString` in a
  monospaced font, with the cursor drawn, scaled with pinch and pan. About 40 views for a screen; at 316.6's 38
  to 49 KB per `Text` that is roughly 2 MB, an extrapolation and not a measurement. If he narrows (z1), one
  TextKit 2 view gives native range selection.
- The key bar sits above the keyboard, and 318.1's box under the screen.
- New tokens for the 16 terminal colours plus foreground, background and dim. Rule (a) makes `Tokens.swift`
  mirror `tokens.css`, and the terminal palette lives today in `theme.ts`, so it moves into `tokens.css` first.
- New words in `Copy.swift`. Nothing stored on disk, logged or put in an alert. No background work: coming
  back means one read.

App Review. Moderate, and it needs his ruling first, because research 136 refuses exactly this
(`docs/research/136-the-phone-in-peoples-hands.md:327, 353-361`). Evidence that it passes: Paseo 0.10.3 ("Open
a terminal in any workspace"), Happier 0.2.11 ("Run the real Claude Code TUI in a terminal you can drive from
your phone"), Orca 0.0.52 ("Live desktop terminal mirroring"), Superset 1.1.2 (rejected once under 4.3(a) for
identity and cured by identity, `apps/mobile/RELEASE.md:163-184`), Termix 1.5.1, three third-party cmux remotes,
and Omnara 1.4.5 in 2025. None records a 4.2.7 rejection, but no app's review notes show how a reviewer used
the terminal.

The framing matters more than research 136 allowed. Guideline 4.2.7's clauses bind an app that "acts as a
mirror of specific software or services rather than a generic mirror of the host device", and clause (a) then
requires a local network. The apps that show a terminal over the internet describe themselves as a terminal of
the person's own computer: Superset's notes say "in the same class as an SSH or remote desktop client"
(`apps/mobile/store.config.js:14`). Since Phase 330 Tortie has no local route, so if the Screen were read as a
mirror of specific software it could not be cured by going local. That is an interpretation, not a ruling, and
it is his call (question 1). Whatever the framing, keep Conversation as the first-run default, keep the Screen
inside a session and never a bare host shell, and let See a Sample show a canned Screen so a reviewer sees all
of it.

Cost and phases.
1. Phase 318.1 as queued, with the adjustments in section 7. Its box becomes the Screen's composer.
2. Research: his ruling on research 136's line. Measure a signed read's round trip and a held long poll through
   Funnel with the connection reused. Measure `capture-pane -e` fidelity on committed fixtures (wide
   characters, box drawing, the alternate screen, 24-bit colour) and the colour loss under a 16-token map, row
   alignment in SwiftUI and TextKit 2, tmux 3.7b's sizing, and remote capture timing. Set the bar for the last
   step.
3. Build, Tier 3: the read-only Screen. `/v1/screen`, the composer in main, the phone view with zoom, pan and
   landscape, local and remote. Independent methods: a hostile phone, and a byte comparison of the drawn rows
   against `capture-pane`.
4. Build, Tier 3: the key bar. `/v1/keys`, the closed vocabulary, the compare-and-set, `noteUserInput`, local
   and remote. The attack is a key aimed at a dialog that appeared after the picture.
5. Decision: if the measured feel misses his bar, take option 2's stream. Otherwise stop.

Risks.
- Feel. Funnel's round trip is unmeasured; Tailscale publishes no figure (research 132 §3.4). At a few hundred
  milliseconds the Screen updates like a picture and typed words echo late. Option 2 is the way out.
- Width. Portrait is only a glance; landscape is the reading posture.
- Colour. Agents draw in 256 and 24-bit colour, and a palette map loses shades such as diff backgrounds.
- A key against an out-of-date picture. The compare-and-set is the defence and the thing to attack.
- Secrets. The phone sees whatever the terminal shows. It travels over the same mutual TLS as the
  Conversation and is never stored.
- Door capacity. A held poll holds one of 4 connections per source and 32 in all. Budget one per phone.

### 6.2 Option 2: a live byte stream from a tmux viewer client into SwiftTerm

What he gets. Everything option 1 gives, but smooth: output appears as it is written, typed words echo at
network speed, scrollback scrolls on the phone itself, and a direct typing mode can sit beside the box, as
Orca's two modes do.

How it works. For each phone viewing a session, the attach host starts one more client of the private server
with `-f read-only,ignore-size`, its PTY sized to the window and following it. Read-only, so keys still arrive
through the signed write; ignore-size, so the Mac never moves (measured in section 4.2). tmux redraws the whole
screen into a client when it attaches (`src/main/capture/service.ts:13-14` says an attach "redraws the current
screen only"), so a reconnect is a new client, with no catch-up ring. The door gains a long-lived framed stream
in `door/wire.ts`, exempt from the 15 s timers, with flow control that pauses the viewer as the attach host
already does at 256 KB. On the phone, SwiftTerm is fed through `feed(byteArray:)` and its `send(source:data:)`
is overridden to drop the emulator's own answers.

Libraries. SwiftTerm, copied into `ios/` at a pinned commit. Not libghostty, and not a web view.

What changes. About 59,500 lines of copied Swift, which need written exemptions from rules (f), (k), (a) and
(b), with a pinned hash. Rules (c) and (g) still hold: a grep of its sources finds no `URLSession`, `JSContext`,
`WKWebView` or `dlopen`. On the Mac: viewer clients, a stream route, framing, flow control, new door timers, a
changed rule C1 and phone rule (t), and a per-viewer carriage for remote machines.

Cost. Four to five phases: research on framing and flow through Funnel, his ruling on copying the source, the
Mac stream, the phone's emulator and input, and the remote carriage. Then keeping a 59,000-line copy current.

Risks. The largest change to the door since Phase 330. What tmux sends to a client whose terminal never answers
its queries is unmeasured. Most of the work is input glue, on the evidence of Termix and Orca.

### 6.3 Option 3: a fuller Conversation, and no screen

What he gets. Today's Conversation with tool calls as rows, the turn in progress, a live "working on" line from
hooks, 318.1's box and buttons for numbered questions. No terminal screen.

How. Richer slots in the overview's keep-map for each of the 14 providers, a long poll on `/v1/turns`, and a
reader for transcripts on other machines, which does not exist.

Cost and risks. Two to three phases, plus work for every provider each time a slot is added. It cannot show
what only the terminal draws: permission dialogs, pickers, slash menus, Codex approvals or a shell. Remote stays
thinner than local, which breaks "remote feels identical to local". The two teams that built this as their main
surface deleted it.

### 6.4 Option 4, not recommended: take the agent over through its SDK or app-server

Launch Claude through the Agent SDK and Codex through `codex app-server` instead of inside tmux, as Happy and CC
Pocket do. It gives token streaming and structured approval cards, for two agents only. It breaks the founding
rule that sessions live in tmux and survive quit, crash and reboot, brings Anthropic's policy on claude.ai
sign-in through the Agent SDK, and costs a full stack per provider. Codex's `--remote` join is worth one
research note against CC Pocket's five conditions for reopening it (`docs/design/shared-app-server.md:438-446`),
and nothing more.

### 6.5 The recommendation

Take option 1 in stages, with a measured decision at the end on whether option 2 is ever needed. It is "the Mac
composes, the phone draws". tmux already holds the live screen of every session, local or remote, any agent,
shells included. The door keeps its shape. The phone's rules hold, except the one text-view question. The Mac is
never resized, which keeps "no regression against today"; Superset shows the alternative, a phone that vanished
and left every desktop pane at 45 columns. Remote is nearly free, because the exec plane's capture and 320.1's
typing already exist.

Not option 2 first, because it changes the door's nature, needs four exemptions to copy in 59,500 lines, and
needs a remote carriage, while every team that built a phone terminal spent most of its code on input and glue.
If it is ever earned, it should come from a viewer client attached read-only and ignore-size.

Keep both faces. A chat cannot show dialogs and pickers, and a screen is a poor way to read a long answer.
Conversation stays the first-run default, and the phone can remember which face was last used per session.

Licences decide reuse. cmux is GPL-3.0 and Superset Elastic-2.0, so take ideas only. Paseo and Termix are
Apache-2.0, and Orca, Happy, Happier, VibeTunnel and CC Pocket are MIT, but their code is TypeScript, React
Native or Dart, so the reuse is the facts they measured. The most valuable is Orca's table of input quirks.

## 7. What 318.1 should become

Keep Phase 318.1 and land it first. Its message box is the input half of every option, and every product that
shipped a phone terminal converged on the same thing: a native composer that pastes, then presses Return.

Five adjustments:

1. Keep one more refusal: unsent words at the Mac's prompt. If the prompt already holds words typed at the
   desk, a paste and Return submits them merged with the phone's message, and that cannot be taken back.
   Happier holds the message and never clears a draft it did not write. So refuse when a numbered question is
   drawn or when the prompt visibly holds unsent words, and name those words in the sentence. Allow everything
   else, a working agent included. Note that Happier also holds while the screen is generating; whether a
   working Claude Code or Codex takes a paste safely is for the spec to measure. Whether a prompt row that
   cannot be read (a full-screen Claude from before Phase 331) should be allowed is also the spec's to measure.
2. Build the box as the session's composer, not a Conversation-only widget. The Screen will later sit above the
   same component.
3. Measure paste then Return once on the real Claude Code and Codex, idle and working, not only on stand-ins.
   Orca found Claude needs Return as a separate write about 50 ms after the paste; Superset waits 500 ms; cmux
   150 ms. Research 135 measured Tortie's path only at an idle prompt.
4. Keep keys out. Esc, the arrows and Ctrl-C would be a fourth write, and each needs its own Tier 3 attack with a
   compare-and-set against what the person saw.
5. Keep "No live terminal screen on the phone" in its What is NOT section, and name the research phase that
   follows, so the end of the backlog says where the queue goes next.

The remote condition stays as written. 320.1 measured `type-bytes` for keystrokes, not for a bracketed paste.

## 8. Questions for him, with recommended answers

1. Research 136 says "No raw terminal, ever". Do you lift that, so the phone may show a session's own screen
   and send keys into it?

   Recommended: yes, for a session's screen reached from inside that session, with Conversation still the
   first-run default and a canned Screen in See a Sample. Decide too how the review notes describe it. The
   approved precedents call it a terminal of the person's own computer, and research 136 forbade the words
   "SSH" and "remote desktop"; given 4.2.7's preamble, describing it plainly as a terminal of sessions on your
   own Mac may be the safer line.

2. When the phone shows a session, may it ever change the size of your Mac's session?

   Recommended: never. The phone draws your Mac's width, and you zoom, pan or turn it sideways. This keeps "no
   regression against today" and avoids Superset's 45-column bug. Paseo and Orca do let a tap narrow the Mac,
   and Orca then shows "Your phone is in control" until someone takes it back.

3. Which keys may the phone send without Face ID?

   Recommended: Esc, Tab, Shift-Tab, the arrows, Return and digits, freely. In the first phase, no Ctrl-C, no
   Ctrl-D and no keystroke-at-a-time typing. Ctrl-C twice ends an agent, which would step round End's Face ID.
   Ctrl-C can come later behind Face ID, if you want it for shells.

4. May the phone's drawing rules narrow for the Screen and for answers?

   Recommended: narrow rule (z1) to the HTML document import it was written against, so a TextKit 2 text view
   may take an `NSAttributedString` built from Tortie's own `AttributedString`. Keep rule (a): the Mac maps every
   colour to the terminal palette's tokens, and the research phase measures what that loses. Without (z1)
   narrowed, the Screen draws rows as SwiftUI `Text` and copies the whole screen rather than a range.

## 9. What could not be confirmed

### 9.1 Corrections to earlier research

| Earlier claim | What this round found |
| --- | --- |
| Research 137: Paseo's phone terminal "is xterm.js in a web view" | Since 0.3.0 (PR #1607, merged 3 August 2026) it is a native grid of styled text; the web view is an opt-in legacy setting, off by default (`packages/app/src/components/terminal-emulator.native.tsx:27-42`) |
| Research 136 §7: "No raw terminal, ever" reads as something review requires | Five apps with a terminal of the person's own computer over the internet are live. None of their review notes is public, so this is evidence against the necessity, not proof of approval |
| Research 136 §7 cites Superset's store notes at `store.config.js:13` | At `3dd63ff11` the sentence is on line 14 |

### 9.2 What the writer changed in the round's own synthesis

| The synthesis said | What the writer found |
| --- | --- |
| Draw the Screen and each answer with one non-editable TextKit 2 text view, and "the iPhone app's rules all hold" | A TextKit view takes an `NSAttributedString`, which rule (z1) refuses outside DEBUG (`build/conformance-ios.mjs:4481`). Added question 4 and a SwiftUI `Text` fallback |
| Mapping 24-bit colour onto palette tokens loses shades | True, and the committed captures show how much is at stake: 283 256-colour and 38 24-bit codes against 464 basic ones. Also, the terminal palette is in `theme.ts`, not `tokens.css`, so rule (a) needs it moved first |
| The committed Claude and Codex screens are 0.45 to 3.3 KB | The 16 `.ansi` captures are 824 to 4,263 bytes as stored, with each escape byte written out as text and a comment header, so smaller on the wire |
| Remote keys go through 320.1's `type-bytes` | `type-bytes` carries literal bytes, not key names, so remote arrows meet the cursor-mode problem unless main reads the mode or he allows an eighth row |
| The tmux sizing measurements apply to Tortie | They were taken on tmux 3.6a. Tortie vendors 3.7b, which was not measured |
| A viewer client attached `read-only` cannot type | A read-only control client still delivered `send-keys`. For option 2 the viewer is an ordinary client on a PTY, where read-only stops typed keys; that case was not measured |

### 9.3 Not settled

- The round trip of a signed read, and of a held long poll, through Funnel with the connection reused. This
  one number decides whether option 1 feels live or like a picture.
- What `capture-pane -e` produces for wide characters, emoji, box drawing and the alternate screen on real
  agent screens, and how much colour a 16-token map loses.
- Whether SwiftUI `Text` rows, or a TextKit 2 view, keep box drawing and double-width characters aligned.
- Readability at the Mac's width. The 5.6 pt portrait and 10 to 12 pt landscape figures are estimates from a
  0.6 em character width.
- Whether tmux's `send-keys` by key name encodes the arrows in the pane's cursor-key mode for every supported
  agent. tmux's design says it should; it was not measured.
- Whether Esc interrupts every supported agent, not only Claude Code.
- How the real Claude Code and Codex take a bracketed paste and Return while working, and the gap each needs.
- Whether any approved app's review notes exposed the terminal to the reviewer. No 4.2.7 rejection was found
  for any product, and silence is not evidence.
- Whether exec-plane capture is fast enough to hold a remote long poll.
- Option 2 only: what tmux sends to an attached viewer client nobody answers; what SwiftTerm costs against
  rules (k), (a) and (b); whether libghostty-vt's Swift renderer lands upstream as source.
- Whether Codex's app-server with `--remote` is stable enough to research. CC Pocket shelved it, and the
  upstream README at `2635431e` still lists remote peers (`codex-rs/app-server/README.md:181`).
- Whether the App Store builds of any product match the commits read. None publishes the commit a store build
  came from.
- The Play listings of Omnara and Termix could not be read.

## 10. Evidence

Every page was read on 5 October 2026 unless a date is given. Clones are shallow and read-only, under the
session's scratchpad at `r139/repos/` and `r139/libs/`. Omnara's history and Termix's Mobile repository were
cloned into the scratchpad by their investigators without running anything.

### 10.1 The products

| Repo and commit | File and lines | What it shows |
| --- | --- | --- |
| manaflow-ai/cmux `dda24fbd` | `LICENSE:5-22`; `THIRD_PARTY_LICENSES.md:47-51` | GPL-3.0-or-later apps, BUSL-1.1 servers; Ghostty MIT |
| | `Sources/Mobile/MobileTerminalByteTee.swift:12-22` | The byte tee; a byte tail is not a complete screen |
| | `Packages/Shared/CMUXMobileCore/Sources/CMUXMobileCore/MobileTerminalRenderGrid.swift:13-110`; `MobileTerminalRenderGridReplay.swift:3-36` | Grid frames with revision and epoch, replayed as escape codes |
| | `Packages/iOS/CmuxMobileTerminal/Sources/CmuxMobileTerminal/GhosttySurfaceView.swift:3808-3812, 6228-6242, 6267-6292` | Off the main thread; manual I/O; the mirror drops its own answers |
| | `Packages/iOS/CmuxMobileTerminal/Sources/CmuxMobileTerminal/GhosttySurfaceView+ScaledGrid.swift:6-12` | The scaled grid with pinch and pan |
| | `Packages/Shared/CmuxTerminalSizing/Sources/CmuxTerminalSizing/TerminalSizingTypes.swift:130-137`; `docs/shared-terminal-sizing.md:66-99, 285-292` | Fit everyone by default; the other modes |
| | `docs/ghostty-fork.md:1914-1933` | Manual I/O exists only in the fork |
| | `CHANGELOG.md:792`; https://github.com/manaflow-ai/cmux/pull/10576 | The chat pane removed, 23 August 2026 |
| | `docs/feed.md:13-50, 135-143` | The Feed, the 120 s soft wait, Codex approvals in its TUI |
| | `Packages/iOS/CmuxMobileShellUI/Sources/CmuxMobileShellUI/TerminalComposerView.swift:3-17`; `docs/ios-feed-session-scope.md:89-92` | Paste then submit; per-agent submit key; 150 ms |
| | `docs/irx-transport-design.md:1-20` | Transport rebuilt after relay credentials expired in suspension |
| | `ios/AppStoreReview/reviewer-setup.md:77-85` | 2.5.2 and 2.1(a) cleared; no 4.2.7 record |
| superset-sh/superset `3dd63ff11` (his checkout) | `LICENSE.md`; `package.json:21` | Elastic-2.0 |
| | `git show b279769dd`, `b5dd42ce7`, `1a81cc8e8`, `ca1d178f9` | Chat added, chat deleted, smallest-client sizing, liveness ping |
| | `apps/mobile/screens/(authenticated)/workspace/[id]/WorkspaceScreen/WorkspaceScreen.tsx:106-120` | "The workspace IS the terminal" |
| | `apps/mobile/scripts/generate-terminal-html.ts:20-25, 401-415, 701-709, 1233` | xterm.js addons; malformed mouse reports; the keyboard kept out; no zoom |
| | `packages/host-service/src/terminal/terminal.ts:259-306, 329-342, 484-487, 1166-1190, 1630-1680` | `epoch:seq`, the ping, Enter 500 ms after a bracketed paste, smallest visible client |
| | `packages/host-service/src/events/map-event-type.ts:15-77` | Hook events normalised to "Needs you" |
| | `apps/mobile/screens/(authenticated)/workspace/[id]/components/TerminalComposer/constants.ts:34-46` | Quick keys |
| | `apps/mobile/store.config.js:14, 28`; `apps/mobile/RELEASE.md:52-55, 163-184` | Review notes; the 4.3(a) rejection and its cure |
| stablyai/orca `17ecee63` | `LICENSE:1-3` | MIT |
| | `docs/site/content/docs/agents/native-chat.mdx:8, 33-34` | The terminal is the source of truth |
| | `src/shared/native-chat-agent-support.ts:5-59`; `mobile/src/session/mobile-native-chat-permission.ts:7-72` | Chat-capable agents; heuristic approvals |
| | `src/shared/agent-prompt-injection.ts:6-25`; `src/shared/agent-tui-command-typing.ts:6-36`; `mobile/src/session/mobile-native-chat-send.ts:125-136` | Per-agent typing traps |
| | `src/main/runtime/orca-runtime-apply-mobile-display-mode.ts:70-83`; `src/renderer/src/components/terminal-pane/MobileDriverOverlay.tsx:98-110, 139, 147`; `src/shared/default-global-settings.ts:240` | Phone-fit, "Your phone is in control", held indefinitely |
| | `mobile/src/terminal/document/fit-scale.ts:42-46`; `viewport-transform.ts:52-77` | Why the phone never reflows locally; desktop-mode scaling |
| | `src/main/runtime/rpc/methods/terminal/terminal-snapshot-publication.ts:240-273`; `mobile/src/transport/terminal-stream-protocol.ts:1-14` | The snapshot tiers; the frame header |
| | `mobile/issue-5049-unresponsive-session-findings.md:12-62` | Half-open sockets |
| | `mobile/src/terminal/terminal-key-definitions.ts:97-143`; `mobile/mobile-terminal-direct-input-default.md:5-13` | The key bar; direct typing by default |
| getpaseo/paseo `2f0cb2f` | `LICENSE:1-8` | Apache-2.0 |
| | `packages/app/src/components/terminal-emulator.native.tsx:27-42`; `packages/app/src/hooks/use-settings/storage.ts:144` | The native grid by default; the web view as legacy |
| | `packages/app/src/terminal/native-renderer/headless-terminal-state.ts:1-6`; `terminal-row-model.ts:49, 62-71`; `terminal-grid-view.native.tsx:91-100, 102-221` | Parsing on the phone; row runs cached by hash; clipped columns |
| | `packages/app/src/terminal/native-renderer/terminal-input.native.tsx:46-80` | Autocorrect discarded |
| | `docs/architecture.md:308`; `docs/terminal-performance.md:26`; `packages/server/src/terminal/terminal-size-ownership.ts:11-30` | Last interacting client wins; grid snapshots caused lag |
| | `packages/app/src/runtime/host-runtime.ts:2556-2565` | No background mode |
| | `fastlane/metadata/android/en-US/full_description.txt:24` | "Open a terminal in any workspace" |
| happier-dev/happier `51f8ac63` | `LICENCE:1-3` | MIT |
| | `apps/docs/content/docs/sessions/claude-unified-terminal.mdx:8, 40-53` | Off by default; the draft guard |
| | `apps/cli/src/integrations/tmux/typeText.ts:152, 203-212, 242`; `apps/cli/src/integrations/tmux/control.ts:108` | Paste through tmux buffers; screen reading |
| | `apps/cli/src/terminal/attachment/tmuxSingleWindowAttachPlan.ts:1-43` | Attach through a linked window; no window sizing |
| | `apps/ui/sources/components/terminal/xterm/webview/XtermWebViewSurface.native.tsx:160-234`; `apps/ui/sources/components/terminal/embedded/EmbeddedTerminalPane.native.tsx:16-21` | xterm.js in a web view; four quick keys |
| | `apps/ui/sources/text/translations/en.ts:6752-6757` | Unknown dialog card that opens the terminal |
| | `apps/cli/src/backends/codex/appServer/createCodexSharedAppServer.ts:86-93`; `localControl/createCodexSharedAttachArgs.ts:7-12` | Codex app-server shared with `codex --remote` |
| | `apps/ui/patches/react-native-enriched-markdown+0.5.0.patch`; `apps/ui/patches/@legendapp+list+3.3.3.patch` | 3,386 and 6,626 lines of patches |
| slopus/happy `dafe9a5` | `LICENSE` | MIT |
| | `packages/happy-cli/src/claude/claudeLocalLauncher.ts:75-90`; `packages/happy-cli/src/ui/ink/RemoteModeDisplay.tsx:223, 228` | A phone message stops the Mac's TUI |
| | `packages/happy-app/sources/components/ChatFooter.tsx:44` | "Permissions shown in terminal only" |
| | `docs/roadmap.md:36` | "Terminal embedded in app" on the wishlist |
| K9i-0/ccpocket `8354ffd` | `LICENSE:1-3` | MIT |
| | `packages/bridge/src/sdk-process.ts:124-137, 818-863, 1507-1571` | Claude sign-in off; the SDK; permission callbacks |
| | `docs/design/shared-app-server.md:355-406, 438-446` | The shared Codex app-server shelved, and the conditions to reopen |
| | issue #10, https://github.com/K9i-0/ccpocket/issues/10 | A third provider refused for cost |
| amantus-ai/vibetunnel `f78324f` | `LICENSE:1-3`; `README.md:170` | MIT; the iOS app not for production |
| | `ios/VibeTunnel/Views/Terminal/GhosttyWebView.swift:65-84, 401-407` | ghostty-web in a web view |
| | `ios/VibeTunnel/Views/Terminal/TerminalBufferPreview.swift:16-35` | One SwiftUI `Text` per cell |
| | `web/src/client/components/terminal-chat-view.ts:642-720, 892-899` | Chat by scraping; invented buttons |
| | `ios/VibeTunnel/Models/TerminalData.swift:100-157` | Fixed key bytes |
| Termix-SSH/Termix `6c342f3`; Termix-SSH/Mobile `f43aee4` | Termix `LICENSE:1-5`; Mobile `README.md:210-212` | Apache-2.0, stated by reference |
| | Mobile `app/tabs/sessions/terminal/Terminal.tsx:426-440, 453-497, 1370-1381` | xterm.js with typing taken away; output batched |
| | Mobile `modules/terminal-ime-input/ios/TerminalImeInputModule.swift:4-177`; `app/tabs/sessions/terminal/keyboard/terminalInputMapping.ts:20-121` | Native text input; fixed escape table |
| | Termix `plugins/ssh-terminal/src/backend/session-manager.ts:7-8, 374-388` | 512K replay; one owner |
| omnara-ai/omnara `3e9edc1`; phone at `500a82ad` | `README.md:5` at `500a82ad`; `LICENSE:1-3` | The post-mortem; Apache-2.0 |
| | `apps/mobile/src/screens/dashboard/InstanceDetailScreen.tsx:59-60, 457-465` at `500a82ad` | Chat or terminal, never both |
| | `apps/mobile/src/components/terminal/TerminalMobileTerminal.tsx:96-99, 149-150, 566-581` at `500a82ad` | xterm.js from jsDelivr; no reconnect |
| | `src/omnara/session_sharing.py:628-713, 751-800` at `500a82ad` | Rewriting cursor reports; stepwise resize |

### 10.2 The libraries

| Repo and commit | File and lines | What it shows |
| --- | --- | --- |
| migueldeicaza/SwiftTerm `15fed4f` | `Sources/SwiftTerm/Apple/AppleTerminalView.swift:1162, 1203`; `Sources/SwiftTerm/iOS/iOSTerminalView.swift:1821` | `send(data:)`, `feed(byteArray:)`, and the `open` `send(source:data:)` |
| ghostty-org/ghostty `35a81a9` | `src/build/Config.zig:809-811`; `include/ghostty/vt.h:9-11` | Only lib-vt still builds for iOS; its API will change |
| manaflow-ai/ghostty `9e0f0bb`; Lakr233/libghostty-spm `7199bd7` | `Patches/ghostty/README.md` in libghostty-spm | The fork and the patch stack |
| coder/ghostty-web `1858a59`; blink `a90b442` | `README.md`; `COPYING` | ghostty-web MIT; Blink GPL-3.0 |
| gonzalezreal/swift-markdown-ui `8371aeb`; textual `01b5187` | `Sources/MarkdownUI/Views/Blocks/BlockSequence.swift:26-27`; textual `Sources/Textual/Internal/Image/ImageLoader.swift:20` | One view per block; `URLSession` for images |
| swiftlang/swift-markdown `392b73b`; Down `e754ab1` | `README.md` | A parse tree only; Down idle since 2021 |
| software-mansion-labs/react-native-enriched-markdown `181bfcc` | `packages/enriched-markdown-ios/Sources/EnrichedMarkdown/Views/MarkdownTextView.swift:10`; `Views/Layout/CodeBlockBackgroundDrawer.swift:3-15`; `Utils/ImageDownloader.swift:15` | One TextKit view per document; grounds as decorations; `URLSession` |
| raspu/Highlightr `da9bb2e`; HighlightSwift `99c431b`; Splash `2e3f17c`; Neon `38cf4a6`; Lakr233/MarkdownView `d7c76ef` | Their READMEs and sources | highlight.js in `JSContext`; Swift only; tree-sitter grammars; a streaming UIKit renderer |

### 10.3 Pages

| Page | What it shows |
| --- | --- |
| https://apps.apple.com/us/app/paseo-remote-coding-agents/id6758887924 | Paseo 0.10.3, and a user review naming the terminal |
| https://apps.apple.com/app/happier-claude-codex-opencode/id6758554297 | Happier 0.2.11, "a live terminal" |
| https://apps.apple.com/us/app/orca-ide/id6766130217 | Orca 0.0.52, "Live desktop terminal mirroring", same-Wi-Fi framing |
| https://apps.apple.com/us/app/id6788926383 | Superset 1.1.2, iOS 26 |
| https://apps.apple.com/us/app/id6752672071 | Termix 1.5.1 |
| https://apps.apple.com/us/app/happy-claude-code-client/id6748571505 | Happy 1.7.0 |
| https://apps.apple.com/us/app/cc-pocket-code-anywhere/id6759188790 | CC Pocket 1.140.0 |
| https://apps.apple.com/us/app/omnara-claude-codex-mobile/id6748426727 | Omnara's history, 1.4.5's "Terminal view for sessions!" |
| https://apps.apple.com/us/app/cmux-remote/id6769380881, https://apps.apple.com/us/app/telecmux/id6771283805; `itunes.apple.com/lookup?id=6783338052` | Third-party cmux remotes live; cmux's own app not listed |
| https://developer.apple.com/app-store/review/guidelines/ | 4.2.7's preamble and clause (a) |
| https://code.claude.com/docs/en/agent-sdk | Third parties may not offer claude.ai sign-in unless previously approved |
| https://github.com/getpaseo/paseo/pull/1607, /issues/2393, /issues/6137 | The native grid; why the web view went; scrollback after re-attach |
| https://github.com/migueldeicaza/SwiftTerm | MIT, its users |
| https://mitchellh.com/writing/libghostty-is-coming, https://x.com/mitchellh/status/2072724957902381319 | libghostty-vt and the announced Swift renderer (the post was read from a search snippet) |
| https://github.com/xtermjs/xterm.js/issues/2403, https://github.com/isontheline/pro.webssh.net/issues/1451 | IME problems in web-view terminals |
| https://raw.githubusercontent.com/openai/codex/main/codex-rs/app-server/README.md at `2635431e` | Remote peers still listed |
| `man tmux` (3.6a), https://man.openbsd.org/tmux | `window-size latest`, `attach-session -f ignore-size` |

### 10.4 Tortie's tree and the scratch measurements

At `b7bd1e1a`: `docs/BACKLOG.md:39745-39800` (Phase 318.1), `docs/research/136-the-phone-in-peoples-hands.md:327,
353-361`, `docs/research/135-the-reply-door.md:121-140`, `docs/research/132-the-simplest-pairing.md:226-245`,
`docs/research/137-paseo-and-the-phone.md:191`, `build/conformance-ios.mjs:17-32, 81-82, 92, 280-281, 971, 1350,
1364, 4481`, `build/p3166/SPEC.md:1305-1316, 1387`, `ios/Tortie.xcodeproj/project.pbxproj:342`,
`ios/Tortie/Markdown/Caps.swift:110-115`, `ios/Tortie/Screens/ConversationScreen.swift:300-310`,
`ios/Tortie/Door/DoorClient.swift:36`, `src/main/pocket/door/limits.ts:21-35`, `src/main/pocket/door/table.ts:70-84`,
`src/main/pocket/pairing.ts:324, 336-345, 406, 445`, `src/main/reply/writer.ts:1-40`,
`src/main/reply/input-row.ts:1-40`, `src/main/activity/monitor.ts:535`, `src/main/machines/exec-plane.ts:29-33`,
`src/main/machines/scroll-shapes.ts:43-60, 155-165`, `src/main/attach/attach-host.ts:1-20, 93`,
`src/main/capture/service.ts:11-14`, `src/renderer/terminal/theme.ts:27-35`, `package.json:318, 355`,
`resources/gmux-tmux.conf`, `build/fixtures/reply/*.ansi`.

tortie.sh's catalog at `a9148a4`: `src/data/comparison-catalog.ts:989, 1134, 1189, 1198, 2290, 2309, 2323, 2338,
2418, 2721`.

The scratch measurements: `r139/tortie-map/probe.py` and `probe-out.json` (sizing, control clients, capture
timing), and `r139/tortie-map/probe2.py` and `probe2-out.json` (a read-only control client, a full styled
screen), under the session's scratchpad. Neither is in the tree.
