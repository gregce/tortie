# 08 — App-Shell Architecture: Native Swift vs Electron vs Tauri

**Research date:** August 9, 2026
**Dimension:** Which application shell should gmux be built on, given that it must host: many live PTYs running CLI coding agents, a VS Code-class git sidebar, a file tree with git-status decorations, a real (but not IDE-grade) editor, and multi-project tabs in a single window — while staying lightweight and being buildable by ONE senior developer working primarily through AI coding agents.

---

## 1. The three stacks as of August 2026

| | Electron | Tauri | Native Swift (AppKit/SwiftUI) |
|---|---|---|---|
| Current version | **43.3.0** (Aug 4, 2026), Chromium 150, Node 24.18.1; 44 in beta ([releases.electronjs.org](https://releases.electronjs.org/)) | Core **2.11.5** (Jul 1, 2026); CLI 2.11.4 ([tauri.app/release](https://tauri.app/release/)) | Xcode 26.x, Swift 6.x; Swift extension now live in Cursor/VSCodium/Kiro via Open VSX ([swift.org blog](https://www.swift.org/blog/expanding-swift-ide-support/)) |
| License | MIT | MIT OR Apache-2.0 ([github.com/tauri-apps/tauri](https://github.com/tauri-apps/tauri)) | n/a (platform SDK) |
| Release cadence / health | New major every 8 weeks, very healthy ([schedule](https://releases.electronjs.org/schedule)) | Steady 2.x patch/minor stream through 2026 (2.8.0 Jan 2026 → 2.11.5 Jul 2026), healthy | Evergreen |
| Renderer | Bundled Chromium (identical everywhere) | System WKWebView on macOS (wry) | AppKit/SwiftUI + whatever you draw |
| Backend language | Node.js (TS) | Rust | Swift |

Key 2026 context: the four apps closest to gmux's shape split evenly across stacks — **Wave** (Electron + Go), **GitButler** (Tauri + Rust + Svelte), **Warp** (Rust + custom GPU UI, open-sourced April 2026), **Ghostty** (Zig core + native Swift macOS app). Details in §8.

---

## 2. Footprint: memory / CPU / battery

### Memory (measured data, not vibes)

- **Hopp's April 2025 benchmark** (identical app both ways, macOS): bundle **8.6 MiB (Tauri) vs 244 MiB (Electron)**; with 6 windows open, **~172 MB (Tauri) vs ~409 MB (Electron)** RSS. Startup delta < 500 ms — negligible ([gethopp.app/blog/tauri-vs-electron](https://www.gethopp.app/blog/tauri-vs-electron)).
- Idle single-window figures across multiple 2025–2026 comparisons: **Tauri ~30–40 MB, Electron ~200–300 MB** ([dev.to summary](https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4), [tech-insider 2026 roundup](https://tech-insider.org/tauri-vs-electron-2026/)). Caveat: Tauri's WKWebView memory is partly billed to shared WebKit daemon processes, so "Tauri uses 10x less" claims overstate; a Tauri issue thread documents cases where careless measurement flipped the result ([tauri#5889](https://github.com/tauri-apps/tauri/issues/5889)).
- **Real terminal apps:** Wave Terminal (Electron + Go) measures **400–800 MB** in day-to-day use in 2026 reviews ([moltamp review](https://moltamp.com/blog/wave-terminal-review-2026/)). **Ghostty (native)** idles at **24–45 MB** vs iTerm2's 78–185 MB and Warp's ~340 MB ([devtoolreviews](https://www.devtoolreviews.com/reviews/best-terminal-emulators-2026), [tech-insider](https://tech-insider.org/ghostty-vs-iterm2-2026/)).

**The mitigating fact for gmux:** P5 says ONE window with tabs. Electron's memory scales per `BrowserWindow` (each is a renderer process); a single-window gmux pays the Chromium baseline once (~250–400 MB with panels loaded), not per project. And the baseline it *replaces* is multiple full Cursor windows (each an Electron app with an extension host, language servers, etc.) — so even Electron gmux is a large net reduction for this user.

### CPU / battery

- WebKit/WKWebView is Apple-tuned for efficiency on M-series (Safari is the consistent battery-life winner on macOS, though one 2024 test had Chrome within ~9%) ([macobserver](https://www.macobserver.com/macos/best-browsers-maximize-battery-life-macos/), [supasidebar 2026 test](https://supasidebar.com/blog/best-browser-mac-battery-life-2026)).
- **WKWebView gotcha that matters for terminals:** on macOS 13–15, WKWebView caps `requestAnimationFrame` at 60 fps regardless of ProMotion; the cap was only removed in macOS 26 Tahoe ([tauri#11822](https://github.com/tauri-apps/tauri/issues/11822)). Users also report scroll micro-jank in Tauri/WKWebView that Safari doesn't show ([tauri discussion #8436](https://github.com/tauri-apps/tauri/discussions/8436)).
- Raw terminal throughput: native GPU renderers win decisively — Ghostty benches ~3x iTerm2 on byte-stream rendering ([devtoolreviews](https://www.devtoolreviews.com/reviews/ghostty-terminal-review-2026)). xterm.js with its WebGL renderer is the fastest web option and is what VS Code ships.

---

## 3. PTY handling per stack

### Electron: node-pty (the industry default)

- **[microsoft/node-pty](https://github.com/microsoft/node-pty)** — MIT, actively maintained by the VS Code team (~1,400 commits; powers VS Code, Hyper, Theia). Unix side is `forkpty(3)`; Windows uses ConPTY. Minimum Node 16 / Electron 19.
- Native module → must be rebuilt per Electron ABI. This is routine (`electron-rebuild`/Forge does it), and prebuilt forks exist if you want to skip toolchains: [@homebridge/node-pty-prebuilt-multiarch](https://www.npmjs.com/package/@homebridge/node-pty-prebuilt-multiarch) shipped prebuilds for current Electron majors as recently as July 2025 (MIT).
- Battle-tested at exactly gmux's workload: dozens of concurrent PTYs feeding xterm.js, with a documented flow-control recipe (§4).

### Tauri/Rust: portable-pty

- **[portable-pty](https://crates.io/crates/portable-pty)** — MIT, part of the WezTerm monorepo by Wez Furlong; v0.9.0 (Feb 11, 2025), actively maintained. Clean cross-platform trait-based API; used by mprocs, tattoy, and the community [tauri-terminal example](https://github.com/marc2332/tauri-terminal).
- A ready-made Tauri 2 plugin exists: [tauri-plugin-pty](https://github.com/Tnze/tauri-plugin-pty) (wires portable-pty to xterm.js through Tauri events). Works, but inherits Tauri's IPC constraints (§4) — fine for a couple of shells, risky for many agent firehoses.

### Swift: openpty / Foundation Process + SwiftTerm

- **[SwiftTerm](https://github.com/migueldeicaza/SwiftTerm)** — MIT, Miguel de Icaza, ~1,100 commits, actively maintained. `TerminalView` (NSView) + **`LocalProcessTerminalView`** gives you PTY spawn + VT100/xterm emulation + rendering in one control ([LocalProcess docs](https://migueldeicaza.github.io/SwiftTerm/Classes/LocalProcess.html)). Production users: Secure Shellfish, La Terminal, **CodeEdit**.
- Underneath it's `forkpty`/`openpty` — the same primitive as everyone else; no ABI/prebuild story needed at all.
- **libghostty is the 2026–2027 wildcard:** Mitchell Hashimoto extracted Ghostty's terminal core as an embeddable C-ABI library. `libghostty-vt` (zero-dependency VT parser/state) shipped its Zig/C API starting Sept 2025 ([mitchellh.com/writing/libghostty-is-coming](https://mitchellh.com/writing/libghostty-is-coming)), and in December 2025 he showed **a pure-Swift Metal renderer + Swift bindings** — "drop a package into your Swift/Xcode projects and get a full blown terminal" ([announcement](https://x.com/mitchellh/status/2072724957902381319)); a community SPM package already exists ([libghostty-spm](https://swiftpackageregistry.com/Lakr233/libghostty-spm)). Ghostty itself is MIT, 1.3.0 released Mar 9, 2026, 1.4 due Sept 2026 ([ghostty.org](https://ghostty.org/docs/about), [webteractive overview](https://webteractive.co/blog/ghostty-and-libghostty-the-terminal-core-quietly-reshaping-the-ecosystem)). This makes the *native* terminal story dramatically better than it was in 2024 — but the full "Swift framework that handles the entire terminal view" tier is still labeled alpha/coming.

---

## 4. IPC: streaming PTY output at high throughput

This is where the stacks genuinely differ for gmux, because a CLI coding agent in "dump the whole diff" mode is a fast producer, and xterm.js only absorbs **5–35 MB/s** with a hardcoded **50 MB** input buffer ([xterm.js flow-control guide](https://xtermjs.org/docs/guides/flowcontrol/)).

### Electron — proven at VS Code scale

- Pattern: PTYs live in a **separate pty-host process**, not the renderer and not the main process. VS Code did this for stability (a node-pty crash no longer kills the window) and throughput, with **flow control to back-pressure fast producers** over IPC ([João Moreno, "Persistent terminal sessions in VS Code"](https://medium.com/@joaomoreno/persistent-terminal-sessions-in-vs-code-8fc469ed6b41), [vscode#175335 — pty host on utilityProcess](https://github.com/microsoft/vscode/issues/175335)).
- Electron's **`utilityProcess`** API is purpose-built for this: a Node-capable child process with **MessagePorts** to the renderer, so PTY bytes go pty-host → renderer directly without transiting the main process ([electronjs.org/docs/latest/api/utility-process](https://www.electronjs.org/docs/latest/api/utility-process)).
- Flow control is a documented, copyable recipe: watermark-based `pty.pause()`/`pty.resume()` with HIGH ≤ 500 KB, ack-callbacks every ~100 KB ([xtermjs.org/docs/guides/flowcontrol](https://xtermjs.org/docs/guides/flowcontrol/)).
- xterm.js itself: **6.0.0 shipped ~Jan 2026** (MIT) — WebGL renderer standard (canvas addon removed), synchronized output (DEC mode 2026), VS Code base platform integration ([releases](https://github.com/xtermjs/xterm.js/releases)).

### Tauri — the weak joint, with a known workaround

- Tauri's `invoke`/event IPC serializes through the webview's message pipe. Measured pain: **~200 ms to move a 3 MB payload**; the v2 raw-binary channel helped commands but **events still can't carry ArrayBuffers** ([tauri#13405](https://github.com/tauri-apps/tauri/issues/13405), [discussion #7146 — "send data at extremely high rate"](https://github.com/tauri-apps/tauri/discussions/7146), [IPC improvements meta-discussion](https://github.com/orgs/tauri-apps/discussions/5690)). One binary-IPC micro-benchmark: 10 MB in ~5 ms on macOS but ~200 ms on Windows — wildly platform-dependent.
- The community-standard workaround is to **bypass Tauri IPC entirely for PTY bytes**: run a localhost WebSocket (or custom-protocol stream) from the Rust core and speak the xterm.js websocket flow-control protocol (client acks; server pauses PTY reads at ~128 KB high-water, resumes at ~16 KB). Works, but you're now maintaining your own transport + backpressure + auth-on-localhost, per terminal.
- Also macOS-specific webview risk for a terminal-heavy app: the WKWebView 60 fps rAF cap pre-Tahoe (§2) and an active xterm.js dead-key input bug that hits WKWebView but not Chromium ([xterm.js#5894](https://github.com/xtermjs/xterm.js/issues/5894)).

### Native Swift — no IPC boundary at all

- SwiftTerm's `LocalProcess` reads the PTY fd on a DispatchQueue and feeds the terminal view directly; zero serialization, zero bridge. Throughput is bounded only by the renderer. This is the cleanest possible data path — the flow-control problem largely evaporates.
- The cost shows up elsewhere: every *other* panel (git UI, tree, editor) must be built with Swift-native components (§7 of the git/editor research docs), or bridged into a WKWebView island where you re-inherit the bridge problem (WKWebView `postMessage` is JSON-serialized and slower than Electron IPC — fine for git status updates, wrong for PTY streams).

---

## 5. P1 (durable named sessions) — what each stack changes, and what it doesn't

**Load-bearing architectural finding: session durability is orthogonal to the shell stack, and NO existing app fully solves it locally.** Evidence:

- **VS Code** has the best shipped local story: *process reconnection* (window reload reattaches to live PTYs because the pty-host process outlives the renderer) and *process revive* (across full app restart, scrollback is restored but the shell is **relaunched**, not reattached — the processes died with the app) ([VS Code terminal docs](https://code.visualstudio.com/docs/terminal/advanced), [test plan #117265](https://github.com/microsoft/vscode/issues/117265)).
- **Wave** v0.14 "Durable Sessions" keep shells alive across app restarts **only for SSH remotes** — a Go job manager on the remote host, tmux-style. The docs are explicit: "Local terminals … use standard sessions" ([docs.waveterm.dev/durable-sessions](https://docs.waveterm.dev/durable-sessions)).
- **Zed** doesn't have it at all — it's an open RFC ([zed discussion #50584](https://github.com/zed-industries/zed/discussions/50584)).

So for gmux's killer feature, the shell must delegate PTY *ownership* to something that outlives the app process:

1. **App-restart survival (true reattach):** a small **detached session daemon** (launchd agent or self-spawned detached process) owns all PTYs; the UI is a client that attaches/detaches. This works identically under Electron (a Node `utilityProcess` does NOT survive app quit — the daemon must be a separately-spawned detached process, à la Wave's `wavesrv`), Tauri (detached Rust daemon), or Swift (launchd agent). Alternative: shell out to **tmux control mode** as the daemon (covered in research doc 03).
2. **Reboot survival (restore + relaunch):** stack-independent by definition — persist layout + per-session metadata (name, cwd, agent command, `claude --resume <session-id>` / `codex resume`) and replay on launch. This is VS Code's "process revive" generalized to agents.

**Stack implication:** Electron gets a small edge only because the exact blueprint (pty-host + reconnection + revive + flow control) exists as documented, MIT-licensed prior art in VS Code, and Wave proves the detached-Go-daemon variant in an Electron app. Nothing in Tauri or Swift blocks the same design; you just write more of it from scratch.

---

## 6. Signing, notarization, updates

| | Electron | Tauri | Native Swift |
|---|---|---|---|
| Signing/notarization | electron-builder automates Developer ID signing + notarization + stapling; mature but config-heavy ([electron.build/docs/mac](https://www.electron.build/docs/mac/)) | Built into `tauri build`: signs when `APPLE_SIGNING_IDENTITY` set, notarizes via App Store Connect API creds, staples automatically ([v2.tauri.app/distribute/sign/macos](https://v2.tauri.app/distribute/sign/macos/)) | `codesign` + `notarytool` directly or via Xcode; simplest surface (one binary, no helper zoo) — but Sparkle + sandbox + hardened runtime has sharp edges ([Steinberger, "Sparkle and Tears", 2025](https://steipete.me/posts/2025/code-signing-and-notarization-sparkle-and-tears)) |
| Auto-update | **electron-updater** (electron-builder, MIT, maintained through 2026): Squirrel.Mac under the hood, requires dmg+zip targets and a signed app; turnkey with GitHub Releases ([electron.build/docs/features/auto-update](https://www.electron.build/docs/features/auto-update/)) | **Updater plugin** (MIT/Apache): its own minisign-style signature layer on top of OS code signing; solid but younger ([v2.tauri.app/plugin/updater](https://v2.tauri.app/plugin/updater/)) | **Sparkle 2** (MIT-style, actively maintained: 2.8.0 added macOS Tahoe support, latest 2.9.5) — EdDSA-signed appcasts, delta updates, the 20-year macOS standard ([sparkle-project.org](https://sparkle-project.org/), [releases](https://github.com/sparkle-project/Sparkle/releases)) |

Verdict: all three are solved problems. Electron is the most turnkey for a GitHub-Releases solo workflow; Tauri is close; native+Sparkle is mature but the most manual assembly.

---

## 7. Dev velocity — including how well AI agents handle each stack

This matters unusually much here: the builder will write most of gmux *through* Claude Code/Codex.

- **TypeScript/web is where agents are strongest.** It has the largest training corpus and the densest ecosystem of examples; 2026 practitioner writing consistently ranks agent competence TS/web ≫ Rust > Swift/SwiftUI ([Level Up Coding, "One Language, Every Layer", Jul 2026](https://levelup.gitconnected.com/one-language-every-layer-the-stack-decision-that-decides-how-much-ai-can-do-for-you-4ff98e2dee34)). Every component gmux needs (xterm.js, CodeMirror/Monaco, tree views, diff views) has thousands of in-training-data integrations.
- **Swift/SwiftUI is agents' documented weak spot**: models emit deprecated APIs and code that doesn't compile against current SDKs; a whole ecosystem of corrective agent-skills has appeared to compensate ([Hacking with Swift on the SwiftUI agent skill](https://www.hackingwithswift.com/articles/282/swiftui-agent-skill-claude-codex-ai), [swift-agent-skills](https://github.com/twostraws/swift-agent-skills), [Better Stack "AI Showdown: Swift"](https://betterstack.com/community/guides/ai/ai-showdown-swift/)). Xcode 26.3's Claude/Codex integration helps, but the feedback loop (xcodebuild, simulators, signing) is slower and less scriptable than `npm run dev`.
- **Rust (Tauri) sits between**: agents write competent Rust, but the borrow checker + 80 s initial compiles ([Hopp benchmark](https://www.gethopp.app/blog/tauri-vs-electron): 80.9 s vs 15.8 s Electron) lengthen the agent iteration loop, and you're running a two-language project (TS frontend + Rust core) — every feature that crosses the boundary needs types, serde, and permissions plumbed through Tauri's capability system.
- **One-language leverage:** Electron lets a single agent session work the entire stack (pty-host, git layer via CLI, UI) in TypeScript. That is a real multiplier for a solo dev whose "team" is agents.

---

## 8. Precedents — what the closest apps actually chose

| App | Stack | License | Status (Aug 2026) | Lesson for gmux |
|---|---|---|---|---|
| **VS Code / Cursor** | Electron | MIT (Code – OSS) | Dominant | The exact panel set gmux wants already proven in Electron; pty-host + flow-control blueprint is public |
| **Wave Terminal** | Electron UI + Go backend (`wavesrv`), WSH RPC | Apache-2.0 | Active, v0.14.x ([github](https://github.com/wavetermdev/waveterm)) | Detached backend process = the P1 pattern; but 400–800 MB shows undisciplined Electron cost; local durability still unsolved |
| **GitButler** | Tauri + Rust + Svelte | **Fair Source (FSL — not OSS; converts to MIT after 2 yrs)** | Very active; a16z Series A 2026 ([github](https://github.com/gitbutlerapp/gitbutler)) | Proof a polished git-heavy desktop app works on Tauri; license blocks forking it as a base |
| **Warp** | Rust + custom GPU UI | **Open-sourced Apr 30, 2026: AGPLv3 core, MIT `warpui`/`warpui_core` crates** ([warp.dev blog](https://www.warp.dev/blog/warp-is-now-open-source), [fossforce](https://fossforce.com/2026/05/after-years-of-teasing-warp-finally-goes-open-source/)) | Active; OpenAI founding repo sponsor | A whole agentic terminal + editor in Rust exists now — but forking a 5-year, VC-scale AGPL codebase solo is a trap; its existence validates the product thesis |
| **Zed** | Rust + GPUI | Editor GPL-3.0; GPUI Apache-2.0 (with an open GPL-contamination issue [#55470](https://github.com/zed-industries/zed/issues/55470)) | 1.0.0 Apr 29, 2026 ([wikipedia](https://en.wikipedia.org/wiki/Zed_(text_editor))) | Custom GPU UI frameworks (GPUI pre-1.0, breaking changes) are a multi-year, team-scale bet — not solo territory; and Zed still lacks persistent terminals |
| **Ghostty** | Zig core (libghostty) + native Swift macOS app | MIT | 1.3.0 Mar 2026; libghostty Swift bindings emerging | The best native macOS terminal architecture; the future embed target for a native/hybrid gmux |
| **CodeEdit** | Swift/AppKit/SwiftUI | MIT | Community project, active (updated Apr 2026) but **still pre-1.0 after 4+ years** ([github](https://github.com/CodeEditApp/CodeEdit)) | Sobering datapoint: an IDE-shaped native Swift app with a large volunteer team is *still* not 1.0 — a solo native build of gmux's scope is a multi-year risk |
| **Hyper** | Electron | MIT | **Stalled** ([hyper.is](https://hyper.is/)) | Electron terminals die from neglect, not from Electron |
| **Tabby** | Electron | MIT | Maintained | Electron handles serious multi-session terminal apps fine |

---

## 9. The hybrid pattern: native shell + WKWebView islands

Architecture: Swift/AppKit window chrome, tabs, and terminal panes (SwiftTerm or libghostty — native data path for PTYs), with **WKWebView islands** for the panels where web components are unbeatable (Monaco/CodeMirror editor, diff views, possibly the git panel), bridged via `WKScriptMessageHandler`.

- **Pro:** best-of-both on paper — native footprint and PTY path (the two things web is worst at), web components for editor/git UI (the things Swift is worst at). WKWebView is a mature embed with a real process model and JS↔native bridge ([WWDC WKWebView enhancements](https://developer.apple.com/videos/play/wwdc2020/10188/)).
- **Con:** you now maintain **two UI ecosystems + a bridge layer**: theming, focus, keyboard shortcuts, context menus, and drag-drop must be reconciled across the boundary; the `postMessage` bridge is JSON-serialized (fine for git/file events, unusable for PTY streams — keep terminals native); and agent-driven development is split across the agent's strongest (web) and weakest (Swift) domains. Tauri's own multi-webview-in-one-window support — the closest packaged version of this idea — is still behind an `unstable` flag with open positioning/resize bugs ([tauri#8280](https://github.com/tauri-apps/tauri/pull/8280), [#10420](https://github.com/tauri-apps/tauri/issues/10420)), which is a signal about how fiddly the pattern is even for a framework team.
- Verdict: the *right* long-term shape for a native gmux 2.0, premature for a solo v1.

---

## 10. Decision matrix

Scoring 1–5 against gmux's requirements. "Solo+agents velocity" = how fast one developer ships this with AI agents doing most of the typing.

| Criterion (weight) | Electron | Tauri | Native Swift | Hybrid (native + WKWebView islands) |
|---|---|---|---|---|
| P1 durable named sessions (×2) | **5** — node-pty + VS Code pty-host/reconnect/revive blueprint; Wave proves detached daemon in Electron | 4 — portable-pty solid; daemon same; PTY→UI transport needs custom WebSocket layer | 4 — cleanest PTY path; but zero prior art for reconnect/revive, all bespoke | 4 — native PTY path + bespoke everything |
| P2 git GUI (VS Code-class) | 5 — web component ecosystem, SCM-view patterns abundant | 5 — same frontend ecosystem | 2 — no reusable native SCM components; hand-build | 4 — web island |
| P3 file tree + git decorations | 5 | 5 | 3 — NSOutlineView, hand-built decorations | 4 |
| P4 click-to-edit editor | 5 — Monaco/CodeMirror drop-in | 4 — CodeMirror fine; WKWebView quirks | 3 — STTextView/CodeEditSourceEditor exist, thinner | 4 — Monaco island |
| P5 multi-project tabs, one window | 5 — DOM tabs, single BrowserWindow | 5 — same, single webview | 4 — native tabs fine, more code | 4 |
| P6 lightweight (×2) | **2** — ~250–400 MB realistic single-window; Wave shows 400–800 MB if sloppy | **4** — ~100–200 MB realistic; WKWebView shared with OS | **5** — Ghostty-class possible (< 100 MB) | 4 |
| Solo+agents velocity (×2) | **5** — one language (TS), agents strongest, fastest loop | 3.5 — two languages, Rust compile loop, capability plumbing | 2 — agents weakest on Swift/SwiftUI; CodeEdit's 4-year pre-1.0 arc is the cautionary tale | 2.5 — two ecosystems + bridge |
| Signing/notarization/updates | 5 — electron-builder turnkey | 4 — built-in, younger | 4 — Sparkle mature, manual assembly | 4 |
| PTY streaming architecture risk | 5 — documented flow control, MessagePorts | 3 — IPC unfit for firehoses; WebSocket workaround is on you | 5 — no IPC boundary | 4 |
| **Weighted total (/60)** | **54** | **49** | **43** | **45** |

Per-criterion weighted arithmetic (double-weighted rows ×2, others ×1): Electron 10+5+5+5+5+4+10+5+5 = **54**; Tauri 8+5+5+4+5+8+7+4+3 = **49**; Native 8+2+3+3+4+10+4+4+5 = **43**; Hybrid 8+4+4+4+4+8+5+4+4 = **45**. (Totals corrected 2026-08-09 from an earlier arithmetic slip — the previously printed 51 / 46.5 / 38 / 39.5 could not be reproduced from the row scores. The ranking is unchanged: **Electron > Tauri > Hybrid > Native**.)

---

## Bottom line for gmux

**Recommendation: Electron — but built like VS Code, not like a typical Electron app.** Specifically:

1. **Single `BrowserWindow`, project tabs in DOM** (P5) — pay the Chromium baseline exactly once. Target < 400 MB with 10+ live sessions; that's a fraction of the multiple Cursor windows it replaces.
2. **PTYs never live in the UI process.** A small **detached session daemon** (spawned detached or as a launchd agent; Node is fine, Go/Rust fine too — Wave's `wavesrv` is the model, [Apache-2.0 and readable](https://github.com/wavetermdev/waveterm)) owns node-pty sessions keyed by *persistent names*. The Electron app is a reattaching client. This — not the shell framework — is what delivers P1's app-restart survival; reboot survival is layout persistence + `claude --resume`/`codex resume` replay (see research docs 03/04 for the session-restore specifics).
3. **xterm.js 6 + WebGL renderer with the documented watermark flow control** (HIGH ≤ 500 KB, ~100 KB ack chunks) over MessagePorts ([flow-control guide](https://xtermjs.org/docs/guides/flowcontrol/)); adopt VS Code's reconnection/revive semantics wholesale ([docs](https://code.visualstudio.com/docs/terminal/advanced)).
4. Everything else (git sidebar, decorated tree, CodeMirror/Monaco editor) is commodity web componentry — maximum agent leverage, one language end-to-end.

**Runner-up: Tauri**, if the ~150–250 MB memory savings is judged worth (a) writing and owning a localhost WebSocket PTY transport with custom backpressure because Tauri IPC measurably cannot carry many PTY firehoses ([#7146](https://github.com/tauri-apps/tauri/discussions/7146), [#13405](https://github.com/tauri-apps/tauri/issues/13405)), (b) WKWebView's terminal-hostile quirks on pre-Tahoe macOS (60 fps rAF cap, xterm.js dead-key bug [#5894](https://github.com/xtermjs/xterm.js/issues/5894)), and (c) a two-language codebase with a slower agent loop. GitButler proves Tauri ships polished git tooling; nobody has yet shipped a many-PTY terminal workhorse on it.

**Not recommended as the v1 shell: native Swift** — it wins footprint and PTY purity, but P2/P3/P4 have no reusable native components at VS Code quality, AI agents are demonstrably weakest at Swift/SwiftUI, and CodeEdit (a whole community) is still pre-1.0 on the same scope. **Revisit as "gmux 2.0" once libghostty's Swift terminal framework ships** ([timeline](https://mitchellh.com/writing/libghostty-is-coming)) — a native shell with libghostty terminals + a Monaco WKWebView island is the plausible endgame if gmux earns a rewrite.

**License notes for the chosen path:** Electron (MIT), node-pty (MIT), xterm.js (MIT), electron-builder/updater (MIT), Wave as architectural reference (Apache-2.0) — all fork/embed-safe. Avoid building *on* GitButler (Fair Source, non-OSS for 2 years) and Warp's core (AGPLv3) unless gmux itself goes AGPL; Warp's MIT `warpui` crates are only useful in a Rust UI, which is out of scope here.
