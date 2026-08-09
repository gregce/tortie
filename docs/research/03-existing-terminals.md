# Existing terminal apps vs the gmux bar

**Research dimension:** existing terminal apps — how close each gets to the gmux bar, both as inspiration and as fork candidates.
**Date:** August 2026. All claims below were verified against primary sources (GitHub repos, official docs, release notes) in August 2026, not recalled from training data.

The bar being measured (from the gmux brief):

- **P1** — durable NAMED terminal sessions: survive app restarts (reattach to live processes) and ideally reboots (restore layout + relaunch agent, e.g. `claude --resume`)
- **P2** — built-in Git GUI (branch, stage/commit, history, copy SHA)
- **P3** — file explorer with git-status decorations
- **P4** — click-to-view/edit files with syntax highlighting
- **P5** — tabs across multiple projects in one window
- **P6** — lightweight (native vs Electron vs Tauri weighed elsewhere; here we note each app's stack)

---

## Scorecard at a glance

| App | Stack | License | P1 sessions survive app restart? | P1 survive reboot? | P2 Git GUI | P3 file tree | P4 editor | P5 multi-project tabs | Active in 2026? |
|---|---|---|---|---|---|---|---|---|---|
| iTerm2 | Obj-C, AppKit (macOS only) | GPL-2.0 | **Yes** (session-server daemons; also tmux -CC) | Layout/contents only, processes die | No | No | No | Tabs, but not project-scoped | Yes (3.7 betas, Jul 2026) |
| Wave Terminal | Electron + Go (`wavesrv`) | Apache-2.0 | SSH remotes only (Durable Sessions); **local terminals die** | Layout/blocks persist, processes die | No | Preview widget only | Yes (editor block) | Workspaces + tabs | Yes (0.14.5 Apr 2026, commits Jul 2026) |
| Tabby | Electron + Angular | MIT | No (restores tab *definitions* only) | Tab definitions only | No | No | No | Tabs + profiles | Barely (14-month release gap) |
| WezTerm | Rust (wgpu GUI + mux server) | MIT | **Yes** (built-in `wezterm-mux-server`, unix domains) | No (mux dies with machine) | No | No | No | Workspaces/domains | Nightlies only; no stable since Feb 2024 |
| Ghostty | Zig core (libghostty) + Swift/AppKit macOS app | MIT | No (window state only) | No | No | No | No | Tabs/splits only | Very (1.3.1 Mar 2026) |
| Kitty | C/Python/Go, custom GPU renderer | GPL-3.0 | No (session files = startup layout only) | Layout relaunch via session files | No | No | No | Tabs/os-windows | Very (0.48.2 Jul 2026) |
| Hyper | Electron + React/xterm.js | MIT | No | No | No | No | No | Tabs | **Effectively dead** (last stable Jan 2024) |
| Rio | Rust (sugarloaf/wgpu) | MIT | No | No | No | No | No | Tabs/splits | Yes (0.2.20 Jun 2026) |
| Zed (terminal panel) | Rust + GPUI + `alacritty_terminal` | GPL-3.0 (editor) | No — RFC open, unimplemented | No | **Yes** | **Yes** | **Yes** | Multiple worktrees per window | Very |
| Warp | Rust, custom GPU UI (client now open source) | MIT (warpui) + AGPL-3.0 (rest) | **Relaunch-style restore** (cwd/env/agent panes), no process reattach | Same relaunch restore | Partial (AI-driven) | No | Limited | Tabs + sessions | Very (open-sourced 2026) |

Nobody clears the whole bar. The two structural gaps across the entire field: (a) *local* durable named sessions done end-to-end, and (b) any real Git/SCM sidebar. Zed is the only one with P2–P4 and it has no P1; the terminals with P1 machinery (iTerm2, WezTerm) have nothing for P2–P4.

---

## iTerm2 — the P1 architecture to steal, GPL codebase to avoid

- **Stack:** Objective-C, AppKit, macOS-only. Huge, ~15-year-old codebase. [github.com/gnachman/iTerm2](https://github.com/gnachman/iTerm2)
- **License:** GPL-2.0 — a fork would be GPL; fine for personal use, viral for distribution.
- **Maintenance:** very active. 3.5.11 shipped Jan 2, 2025 (security fix); **3.7.0beta6 built July 3, 2026** ([appcast](https://iterm2.com/appcasts/testing_changes3.txt), [downloads](https://iterm2.com/downloads.html)).

**Session restoration (the deep dive gmux needs).** iTerm2's ["Session Restoration"](https://iterm2.com/documentation-restoration.html) is the canonical local implementation of P1's first half:

- Jobs do **not** run as children of the iTerm2 process. Each session's processes run under a **long-lived per-session server process** (`iTermServer`). When iTerm2 crashes, upgrades, or force-quits, the servers keep running; on relaunch iTerm2 finds the orphaned servers and **reattaches**, restoring live shells with their running jobs.
- Explicit caveat in the docs: **reboot kills the jobs** — only window contents/scrollback are restored (via macOS window restoration). Cmd-Q by default terminates jobs too (configurable).
- **Window arrangements**: named, saved layouts (windows/tabs/panes + profiles) that can be restored on demand or at launch — layout persistence, not process persistence.

**tmux -CC integration — how deep it goes.** [Documentation](https://iterm2.com/documentation-tmux-integration.html). iTerm2 speaks tmux's *control mode* (`tmux -CC attach`): instead of rendering tmux's text UI, tmux streams structured commands and iTerm2 maps tmux windows→native windows/tabs and tmux panes→native split panes. Native scrolling, selection, and profiles apply; the tmux "gateway" session gets buried. Sessions are **named** (tmux session names), survive iTerm2 restarts *and* detaches, and with tmux-resurrect/continuum can survive reboots. This is the deepest tmux GUI integration that exists and is the proof-of-concept that a GUI can present a mux's sessions as native UI. Limits: it's tied to tmux's model (no per-pane metadata beyond tmux's, some tmux features unsupported in control mode), and it is ~tens of thousands of lines of gnarly Obj-C protocol handling.

**Verdict:** *Inspiration only.* GPL-2.0 + a giant Obj-C monolith makes forking unattractive. But its two architectures — per-session server processes for crash/upgrade reattach, and tmux -CC for named durable sessions rendered natively — are exactly the two candidate P1 mechanisms for gmux.

---

## Wave Terminal — closest product shape, Apache-licensed, but local sessions aren't durable

- **Stack:** Electron/React frontend + **Go backend** (`wavesrv`); block-based UI where every tab is a layout of "blocks" (terminal, file preview, editor, web, AI chat). [github.com/wavetermdev/waveterm](https://github.com/wavetermdev/waveterm)
- **License:** **Apache-2.0** — fully forkable.
- **Maintenance:** active. v0.14.5 released Apr 16, 2026; commits through Jul 31, 2026 ([releases](https://github.com/wavetermdev/waveterm/releases)).

**Persistence story.** Wave has a *persistent workspace model*: all blocks/tabs/layout live in an object store and are restored on restart — names, layout, widget state all persist. But for terminals the picture splits:

- **[Durable Sessions](https://docs.waveterm.dev/durable-sessions)** (v0.14, 2026) — **SSH remotes only**. A job-manager process on the remote host owns the shell via Unix domain sockets; shell state, running programs, and history survive network drops, Wave restarts, and laptop sleeps. Orphan cleanup is automatic. Configurable globally (`"term:durable": true`), per-connection, or per-block.
- **Local terminals: explicitly excluded.** The docs state durable sessions are "for remote SSH connections only. Local terminals and WSL connections use standard sessions" — i.e., local agent processes die when Wave quits. There's a long-standing issue asking for local persistence ([#747](https://github.com/wavetermdev/waveterm/issues/747)).

**Against the rest of the bar:** no Git GUI, no git-status file tree (file preview widget only), but it *does* have an editor block, workspaces, multi-project tabs, and first-class AI integration (BYO keys for Claude/OpenAI/Ollama). It is the closest existing product to "shell for agentic coding."

**Verdict:** *Realistic fork candidate — the strongest of the Electron options.* The wavesrv/job-manager pattern already built for SSH is architecturally the exact mechanism needed for local durable sessions (point the job manager at localhost). Apache-2.0, active, and the block model would host a git sidebar naturally. Cost: it's Electron (P6 tension), and you inherit a large product surface you don't need.

---

## Tabby — MIT Electron veteran, drifting into maintenance mode

- **Stack:** Electron + Angular + TypeScript; xterm.js-family rendering; SSH/serial/Telnet built in. [github.com/Eugeny/tabby](https://github.com/Eugeny/tabby)
- **License:** MIT.
- **Maintenance:** fading. v1.0.234 May 17, **2025** → v1.0.235 Jul 22, **2026** — a 14-month gap between releases ([releases](https://github.com/Eugeny/tabby/releases)). Plugin ecosystem has slowed.
- **Sessions:** "Remembers your tabs" — it restores tab *definitions* (profile, cwd) on launch, not running processes. No daemon, no reattach. Serial/SSH profiles reconnect, which is reconnection, not persistence.
- **Weight:** the README itself says it is not lightweight and points RAM-sensitive users elsewhere.

**Verdict:** *Inspiration only* (its profile/connection manager UX is decent). Wrong framework generation (Angular), no P1 machinery, and the release cadence says the energy has left the project.

---

## WezTerm — the only OSS GUI terminal with a real built-in mux; maintenance is the worry

- **Stack:** Rust; custom wgpu-based GUI; Lua configuration; and crucially a **built-in multiplexer** that can run as a detached `wezterm-mux-server`. [github.com/wezterm/wezterm](https://github.com/wezterm/wezterm)
- **License:** MIT.
- **Maintenance:** the red flag. **Last stable release: 20240203** (Feb 2024). Nightlies continue into 2026 (e.g. build 20260117) but users are openly asking for stable releases again ([#7825](https://github.com/wezterm/wezterm/issues/7825), [#6816](https://github.com/wezterm/wezterm/issues/6816)); a Mar 2026 issue documents the mux control plane hanging under load ([#7692](https://github.com/wezterm/wezterm/issues/7692)).

**P1 machinery — genuinely built in.** The [multiplexer architecture](https://wezterm.org/config/lua/wezterm.mux/index.html): panes live in a Mux owned by a *domain*; a **unix domain** runs panes under `wezterm-mux-server`, a headless process independent of the GUI. Kill the GUI, relaunch, `wezterm connect unix` — panes, scrollback, running processes are all still there. Domains also come in SSH and TLS flavors for remote persistence. Named **workspaces** group windows. This is tmux-grade durability with a GUI-native data model, in MIT-licensed Rust. Reboot survival: no — mux server dies with the machine (same as tmux); layout resurrection is DIY via Lua (`mux-startup` event).

**Verdict:** *Realistic foundation — but as a backend, not as an app shell.* Two ways to use it:
1. **Fork the whole app** — you get mux + terminal + tabs, but you must build sidebars/editor inside its bespoke wgpu GUI toolkit (no native widgets), and you adopt a project whose stable-release process has stalled.
2. **Use `wezterm-mux-server` as gmux's session daemon** — a native macOS frontend speaking WezTerm's codec RPC (Rust crates in-repo) gets durable named sessions "for free." The protocol is internal/unversioned, so vendor the crates and pin a revision.

---

## Ghostty & libghostty — the embeddable core, and a MIT Swift app to crib from

- **Stack:** core terminal (VT, fonts, Metal/OpenGL rendering, input) in **Zig**, exposed as a C-ABI library (**libghostty**); the macOS app is **Swift + AppKit/SwiftUI linking the libghostty C API**; the Linux app is Zig + GTK4 ([About](https://ghostty.org/docs/about)). [github.com/ghostty-org/ghostty](https://github.com/ghostty-org/ghostty)
- **License:** MIT.
- **Maintenance:** top-tier. **1.3.0 released Mar 9, 2026** (2,858 commits, 180 contributors, 6 months of work: scrollback search, scrollbars, AppleScript automation); 1.3.1 Mar 13, 2026 ([release notes](https://ghostty.org/docs/install/release-notes/1-3-0)).

**Is libghostty actually consumable by third parties in 2026?** The honest answer: *partially, and improving fast.*

- **libghostty-vt** — shipped. A zero-dependency VT/ANSI parser + terminal-state library extracted from Ghostty's core, usable **today from Zig and C** on macOS/Linux/Windows/WASM ([Mitchell Hashimoto, "Libghostty Is Coming", Sep 22, 2025](https://mitchellh.com/writing/libghostty-is-coming); [C API docs](https://ghostty-org-ghostty.mintlify.app/api/overview)). No tagged version yet; API signatures still in flux though the functionality is battle-proven. Ecosystem is forming: Go bindings ([mitchellh/go-libghostty](https://github.com/mitchellh/go-libghostty)), and **Ghostel.el** — an Emacs terminal built on libghostty-vt — shipped publicly in July 2026, proof that third parties can build real terminals on it at the VT layer.
- **The full embedding API** (app/surface lifecycle: `ghostty_init()` → `ghostty_app_t` → `ghostty_surface_t` → `ghostty_surface_draw()`, with Metal rendering and input handling) exists and is what the macOS app uses — and **OrbStack already embeds it commercially** — but the docs warn it "is not yet stabilized for general-purpose embedding" and may change between releases. Roadmap: input, GPU rendering, and GTK/**Swift frameworks** as future libraries.
- **How the macOS app embeds it:** Ghostty's build produces the Zig core as a static library wrapped in an XCFramework (GhosttyKit); the Swift app in `macos/` links it and drives surfaces via the C API, with AppKit/SwiftUI providing all chrome (tabs, windows, quick terminal). This is a working, MIT-licensed template for "native Swift shell around a C-ABI terminal engine."

**Sessions:** Ghostty itself has none of P1 — no daemon, processes die on quit; macOS window restoration restores window/tab layout only. No sidebar surfaces (deliberately minimal: "platform-native UI," zero IDE ambitions).

**Verdict:** *Foundation at the component level, and the macOS app is a legitimate starting codebase.* Forking Ghostty's `macos/` Swift app gives gmux a best-in-class Metal terminal view inside a native AppKit/SwiftUI shell under MIT — add sidebars, tabs-across-projects, and a session daemon around it. Risk: you ride an unstable internal C API and a Zig build dependency until libghostty stabilizes (the maintainer's stated plan is to stabilize it).

---

## Kitty — excellent, fast, GPLv3, and structurally single-process

- **Stack:** C + Python + Go (kittens), custom GPU renderer. [github.com/kovidgoyal/kitty](https://github.com/kovidgoyal/kitty)
- **License:** **GPL-3.0** — copyleft; forking means a GPL app.
- **Maintenance:** extremely active — 0.48.0 Jul 18, 2026; 0.48.2 Jul 30, 2026 ([changelog](https://sw.kovidgoyal.net/kitty/changelog/)).
- **Sessions:** *session files* define startup layouts (tabs/windows/cwd/commands) — relaunch-style, no reattach; quitting kitty kills all processes. The powerful **remote-control protocol** (`kitten @ ls` now exposes `session_name`, focus history; full programmatic window/tab control over a socket) is great prior art for scripting a terminal from an outer app, but kitty is not embeddable as a widget and the author does not aim it at that use.

**Verdict:** *Inspiration only* — specifically its remote-control protocol design and session-file format (a good model for gmux's reboot-restore manifest).

---

## Hyper — dead

- **Stack:** Electron + React + xterm.js. [github.com/vercel/hyper](https://github.com/vercel/hyper)
- **License:** MIT.
- **Maintenance:** last stable **v3.4.1, Jan 8, 2024**; last activity of note is 4.0.0-canary.5 (Jul 2024) ([releases](https://github.com/vercel/hyper/releases)). A 2026 issue titled *"Is Hyper dead? Stopped working with latest beta of macOS 26"* ([#8101](https://github.com/vercel/hyper/issues/8101)) sums it up: broken on current macOS betas with no stable release in over two years. Vercel's attention is elsewhere.

**Verdict:** *Not a foundation, barely inspiration.* Its one legacy — a CSS/JS plugin ecosystem — is also the cautionary tale: web-tech extensibility didn't save it from performance complaints and abandonment.

---

## Rio — fast solo-maintainer Rust terminal, no session story

- **Stack:** Rust; sugarloaf renderer on wgpu (Metal/Vulkan); also runs in browsers. [github.com/raphamorim/rio](https://github.com/raphamorim/rio)
- **License:** MIT.
- **Maintenance:** active — v0.2.20 Jun 20, 2026, plus nightlies ([releases](https://github.com/raphamorim/rio/releases)).
- **Bar fit:** splits/tabs exist; zero persistence, no mux, no sidebar surfaces, effectively one core maintainer.

**Verdict:** *Inspiration only* (rendering performance; proof a small Rust terminal is tractable). Too thin a base for gmux's app-shell ambitions.

---

## Zed's built-in terminal — the mirror image of the problem

- **Stack:** Rust + GPUI; terminal built on the **`alacritty_terminal`** crate (PTY + VTE parsing) with a custom GPUI renderer ([crates/terminal](https://github.com/zed-industries/zed/blob/main/crates/terminal/src/terminal.rs)).
- **License:** Zed editor is GPL-3.0 (GPUI itself is permissively licensed; `alacritty_terminal` is Apache-2.0).
- **Bar fit:** Zed *has* P2 (git panel with staging/commits), P3 (project tree with git decorations), P4 (world-class editor), P5 (multiple worktrees). It's the inverse of the terminals above — everything but P1.
- **P1 status:** terminals die on restart because Zed owns the PTY master fd. An RFC (**Mar 3, 2026**, [discussion #50584](https://github.com/zed-industries/zed/discussions/50584)) proposes a **`pty-host` daemon**: a separate Rust process owning PTYs, headless alacritty instance tracking state, Unix-socket binary protocol to the editor, scrollback + processes surviving editor restarts. As of Aug 2026: one community +1, **no maintainer response, unimplemented**. Users are told to use tmux/zellij, with all the nesting friction that implies.

**Verdict:** *Inspiration, twice over.* (1) The pty-host RFC is a ready-made design doc for gmux's session daemon. (2) Zed's existence sharpens gmux's positioning: gmux is "Zed's sidebars grafted onto iTerm2's session model," and Zed shows the sidebar half is commodity; the daemon half is the differentiator. Watch this RFC — if Zed ships it, Zed becomes gmux's closest competitor.

---

## Warp — now (mostly) open source, and the best UX study for agentic workflows

- **Stack:** Rust, GPU-accelerated custom UI. In 2026 Warp **open-sourced its client**: [github.com/warpdotdev/warp](https://github.com/warpdotdev/warp) — the `warpui`/`warpui_core` UI-framework crates are **MIT**, everything else **AGPL-3.0**, with OpenAI as "founding sponsor" and GPT models powering the agent features. Positioning: "the agentic development environment" with Agent Mode + cloud agents ("Oz") ([newsroom, Mar 31, 2026](https://www.warp.dev/newsroom/2026/3/31/introducing-the-warp-terminal-with-ai-superpowers)).
- **Session/agent UX — what it gets right:** blocks (command+output as a unit), named sessions, agent panes as first-class objects with per-agent status, and **session recovery**: on relaunch Warp restores agent panes, working directories, and environment variables automatically. Note what it does *not* do: reattach to still-running local processes — and its own tracker records a feature request for exactly gmux's P1 second half: *"Opt-in auto-restoration for specific persistent CLI sessions (e.g., Claude, Codex, REPLs, AI agents)"* ([#10185](https://github.com/warpdotdev/warp/issues/10185), closed 2026-06-02 **without shipping**, as overlapping the earlier requests #4763/#7712 — GitHub displays it as "completed" only because the author closed it). Warp's restore is relaunch-style, and users have repeatedly asked for the `claude --resume` pattern by name. gmux's P1 is a validated, unmet demand.
- **Forkability:** legally possible now, but AGPL-3.0 on the interesting parts (copyleft, network clause), deep coupling to Warp's cloud/accounts, and a very large codebase optimized for their product. The MIT `warpui` crates are the more interesting extraction target.

**Verdict:** *Primary UX inspiration; fork not recommended.* Study its agent-pane management and session-recovery flow; don't inherit its AGPL core and cloud coupling.

---

## Cross-cutting: the three P1 architectures that exist in the wild

1. **Reattach via daemon-owned PTYs** — processes never belong to the GUI. Implementations: iTerm2's per-session servers, WezTerm's `wezterm-mux-server`, tmux/zellij, Wave's remote job manager, Zed's unimplemented pty-host RFC. Survives app restarts/crashes/upgrades. Does **not** survive reboots.
2. **Relaunch via serialized session manifest** — persist name + cwd + command (+ resume token), re-exec on startup. Implementations: Warp session recovery, kitty session files, Tabby tab restore, iTerm2 arrangements. Survives reboots, loses live process state.
3. **Delegate to tmux, render natively** — iTerm2's `tmux -CC` control mode is the only deep implementation. Gets 1 for free, gets 2 via tmux-resurrect, at the cost of tmux's model as your ceiling.

No shipping product combines 1 + 2 for *local* sessions with *named* identity and agent-aware relaunch (`claude --resume`, `codex resume`). That combination is gmux's opening. The building blocks all exist and are proven separately.

---

## Bottom line for gmux

**Realistic foundations (in order):**

1. **Ghostty's macOS app + libghostty (MIT)** — fork or heavily crib the `macos/` Swift/AppKit/SwiftUI app that already embeds a world-class Metal terminal via a C API (the same path OrbStack took commercially). Best-fit with P6 (native, lightweight) and leaves gmux owning the shell where P2–P5 live. Accept: unstable embedding API until libghostty stabilizes, Zig in the build.
2. **WezTerm as session backend (MIT)** — `wezterm-mux-server` + unix domains is the only OSS GUI-terminal mux with true reattach; usable headless behind any frontend by vendoring its Rust codec crates. Accept: internal protocol, stalled stable-release cadence (nightlies only since Feb 2024).
3. **Wave Terminal (Apache-2.0)** — the only fork where gmux's *product* shape (blocks, workspaces, persistence layer, AI) already exists; extend its Go job-manager from SSH-only to local sessions and add a git sidebar. Accept: Electron weight, large inherited surface.

**Inspiration only:** iTerm2 (steal the session-server + tmux -CC architectures; GPL-2.0 Obj-C monolith), Warp (agent-pane and session-recovery UX; AGPL core), Zed (pty-host RFC as design doc; proof sidebars are commodity), kitty (remote-control protocol + session-file format; GPL-3.0), Rio (rendering), Tabby and Hyper (cautionary tales — Electron terminals that lost momentum).

**The competitive fact worth pinning to the wall:** in August 2026, every actively developed terminal either has durable-session machinery with no IDE-style sidebars (iTerm2, WezTerm) or sidebars with no durable sessions (Zed), and the two agentic terminals (Warp, Wave) both stop short of local process reattach — with user demand for exactly what P1 specifies on record in both trackers (Warp's request closed unshipped as overlapping earlier requests; Wave's closed as not-planned). The bar is unclaimed.
