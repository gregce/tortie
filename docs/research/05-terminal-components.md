# Research Dimension 05 — Embeddable Terminal-Emulator Components

**Project:** gmux — lightweight macOS "shell for agentic coding"
**Date researched:** 2026-08-09 (all versions/dates verified against live registries and repos on this date)
**Question:** If we build our own UI, which terminal widget/engine do we embed — and what does that choice look like per stack (Electron vs Swift/AppKit vs Tauri/Rust)?

---

## Why this dimension matters for gmux

P1 (durable named sessions) is mostly a *process architecture* problem, not a widget problem — but the widget determines (a) whether we can replay/serialize buffers for reattach, (b) rendering cost with MANY concurrent sessions, (c) whether OSC 133 prompt marks work (useful for "jump to last agent prompt" UX with Claude Code/Codex), and (d) which app stack is even viable. VS Code's terminal is the existence proof that this whole category works at scale, and its persistence machinery is documented below because it is the reference design gmux should copy — and improve on.

---

## 1. xterm.js + node-pty (the Electron/web path)

### xterm.js

- **Repo:** https://github.com/xtermjs/xterm.js — 21,034 stars, pushed 2026-08-09 (same-day activity). **License: MIT.**
- **Releases (verified via npm registry `@xterm/xterm`):** latest stable **6.0.0, published 2025-12-22**; the 6.1.0 beta train is extremely active — **6.1.0-beta.300 published 2026-08-09** (literally today). This is one of the most actively maintained projects in this entire survey.
- **v6.0.0 highlights** ([releases](https://github.com/xtermjs/xterm.js/releases)): OSC 52 clipboard support, synchronized output (DEC mode 2026), the canvas renderer was *removed* (DOM + WebGL renderers remain), shadow-DOM support in the WebGL renderer, ligature improvements, IME duplicate-input fixes.
- **Rendering:** the [`@xterm/addon-webgl`](https://github.com/xtermjs/xterm.js/blob/master/addons/addon-webgl/README.md) renderer (0.19.0, ~April 2026) is a WebGL2 shader pipeline with a texture-atlas glyph cache (now multi-page, no 1024×1024 cap). It is what VS Code ships. It "scales much better with really large viewports" than the old canvas path.
- **Many concurrent sessions:** one WebGL context per visible terminal. Browsers/WebViews cap live WebGL contexts (order of 8–16), so the standard pattern — the one VS Code uses — is: only *visible* terminals get a WebGL renderer; backgrounded terminals hold state but don't render; the addon survives context loss. For gmux's "many named sessions, few visible at once" model this is a non-issue if we do the same.
- **Scrollback:** in-memory, configurable via the `scrollback` option (VS Code defaults to 1000). Unlimited scrollback is not practical in-renderer; persistence is handled server-side (see §2).
- **Hyperlinks / OSC:** OSC 8 hyperlinks native since v5.0. **OSC 133 is not interpreted by core** — instead xterm.js exposes `registerOscHandler(ident, cb)` on its parser plus a markers + `registerDecoration` API ([IParser docs](https://xtermjs.org/docs/api/terminal/interfaces/iparser/)); VS Code's `ShellIntegrationAddon` builds OSC 633/133 prompt-mark semantics entirely on those hooks. gmux would do the same (or lift VS Code's addon — MIT).
- **IME/Unicode:** long-standing composition-view IME support (with continued fixes in 6.0.0), emoji/CJK width handling, Unicode addon for grapheme handling.
- **Who ships it:** VS Code, Hyper, Tabby, JupyterLab, Theia, and effectively every web-based terminal.

### node-pty

- **Repo:** https://github.com/microsoft/node-pty — Microsoft-maintained, pushed 2026-08-07. **License: MIT** (per npm).
- **Releases (npm registry):** stable **1.1.0 published 2025-12-22** (same day as xterm.js 6.0 — they release in lockstep for VS Code); **1.2.0-beta.15 published 2026-08-03**. Active.
- `fork()`/`exec` PTYs on macOS/Linux, ConPTY on Windows. This is the PTY layer under VS Code's terminal.

**Fit:** the proven pair. MIT + MIT, both in active lockstep development, battle-tested at VS Code scale (dozens of terminals per window is a supported, tested scenario).

---

## 2. VS Code's terminal internals — the persistence reference design (prior art for P1)

VS Code ALREADY does a large part of gmux's P1, and all of this code is MIT. How it works, from [Terminal Advanced docs](https://code.visualstudio.com/docs/terminal/advanced), [test plan #117265](https://github.com/microsoft/vscode/issues/117265), [revive test plan #133516](https://github.com/microsoft/vscode/issues/133516), and [`ptyService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts):

1. **Pty host process.** Shell processes are NOT owned by the window (renderer). They're owned by a separate "pty host" process, which wraps each shell in a `TerminalProcess` (node-pty) and talks to windows over IPC. The pty host is monitored and auto-restarted if it crashes or becomes unresponsive.
2. **Headless buffer replica.** For every terminal, the pty host keeps a **`@xterm/headless`** instance — a DOM-less xterm.js — that consumes the same PTY output and maintains the scrollback buffer *outside the window*.
3. **Process reconnection (window reload).** "When reloading a window … **reconnect** to the previous process and restore its content." The shell keeps running (it lives in the pty host); on reattach, the pty host serializes the headless buffer via the **serialize addon** (ANSI-preserving) and replays it into the window's fresh xterm.js. Names, icons, and colors are restored too.
4. **Process revive (app restart).** "When restarting VS Code, a terminal's content is restored and the process is **relaunched** using its original environment." On shutdown, per-terminal `ISerializedTerminalState` (serialized buffer + cwd + env) is written to disk; on next launch `IPtyService.reviveTerminalProcesses(workspaceId, state, …)` restores buffers (marked "History restored") and spawns fresh shells with the original cwd/env.
5. **Settings:** `terminal.integrated.enablePersistentSessions`, `terminal.integrated.persistentSessionScrollback` (how much scrollback is serialized), `terminal.integrated.persistentSessionReviveProcess`.

**What survives what:**

| Event | Shell process | Buffer/scrollback | Terminal name |
|---|---|---|---|
| Window reload | **survives** (lives in pty host) | replayed (serialize addon) | survives |
| Full app quit + relaunch | dies; **relaunched** with original cwd/env | restored from disk | survives |
| Machine reboot | dies; relaunched | restored from disk | survives |

**The gmux lesson:** VS Code's only real limitation is that the pty host is a child of the app, so a full quit kills the shells. gmux can copy this architecture but promote the pty host to a **user daemon (launchd)** so sessions survive app quits outright — and layer "relaunch the agent" (`claude --resume`, `codex resume`) on top of the revive path for reboots. Every widget in this survey can sit on top of that architecture; xterm.js is the only one that gives us the serialize/headless-replica machinery for free.

---

## 3. SwiftTerm (the native Swift path)

- **Repo:** https://github.com/migueldeicaza/SwiftTerm — 1,650 stars, pushed 2026-08-09. **License: MIT.**
- **Releases:** **v1.16.0 on 2026-08-07**, v1.15.0 (2026-07-19), v1.14.0 (2026-07-10) — steady, active cadence; 7 years / ~1,100 commits of history.
- **What it is:** a VT100/xterm terminal *engine* (headless-capable) plus first-party views: `TerminalView` as an AppKit **NSView** for macOS, a UIKit view for iOS/visionOS, and `LocalProcessTerminalView`, which bundles PTY spawning of a local process — so on macOS it's a complete drop-in terminal widget, PTY included.
- **Who ships it:** commercial SSH clients **Secure Shellfish** and **La Terminal** (Miguel's own iOS terminal), plus **CodeEdit** ([README](https://github.com/migueldeicaza/SwiftTerm/blob/main/README.md)). Production-proven on Apple platforms specifically.
- **VT/OSC coverage (verified in source, `Sources/SwiftTerm/Terminal.swift` as of 2026-08-09):**
  - **OSC 8 hyperlinks** — yes, with explicit + implicit link detection modes.
  - **OSC 133 semantic prompts — yes, and unusually deep**: the source has a full "OSC 133 semantic prompts" subsystem including prompt-group tracking and *click-to-move-cursor routing to the active OSC 133 prompt* (the Ghostty 1.3 marquee feature, in a library).
  - OSC 1337 iTerm2 images, **Sixel**, Kitty raw-RGB images; ANSI/256/truecolor; synchronized output (DEC 2026, added 2026); BiDi per the terminal-wg spec; grapheme clusters/emoji.
- **IME (verified in `Sources/SwiftTerm/Mac/MacTerminalView.swift`):** `TerminalView` implements **`NSTextInputClient`** with marked-text storage and an overlay — real macOS IME (CJK, dictation) support, which is the hardest thing to get right in any DIY renderer.
- **Rendering & many sessions:** CoreText (CPU) rendering into the NSView, with optional Metal-accelerated rendering per the README. Not a GPU shader pipeline like Ghostty/xterm-WebGL, but only visible views draw, and AppKit views are cheap when hidden. For dozens of *named* sessions with a handful visible, this is fine; sustained `cat`-a-gigabyte throughput will trail Ghostty/Rio.
- **Quality signals:** fuzzed; runs esctest + borrowed xterm.js/Ghostty test cases; README candidly notes selection/accessibility as areas where xterm.js is still ahead.

**Fit:** the obvious widget for a native Swift gmux. Mature, MIT, active this week, ships in real products, and already has the two OSC features gmux cares about most (8 + 133) plus real IME.

---

## 4. libghostty (the "watch this space" engine)

- **Repo:** https://github.com/ghostty-org/ghostty — 59,404 stars, pushed 2026-08-09. **License: MIT.** Ghostty app itself: 1.3.1 (2026-03-13) current ([release notes](https://ghostty.org/docs/install/release-notes/1-3-1)).
- **Status of the embeddable story in mid-2026** ([Mitchell's announcement, Sept 2025](https://mitchellh.com/writing/libghostty-is-coming); [C API docs](https://ghostty-org-ghostty.mintlify.app/api/overview)):
  - **libghostty-vt** — the first extracted component: a **zero-dependency (not even libc)** VT parser + terminal-state library (cursor, styles, reflow, scrollback) with **Zig and C APIs**, targeting macOS/Linux/Windows/WASM. Usable today, but **no tagged release yet** and "API signatures still in flux" (a tagged version was still only *targeted* as of an April 2026 status). Coder already ships [Node-API bindings](https://github.com/coder/libghostty-vt-node); the official [ghostling](https://github.com/ghostty-org/ghostling) demo (MIT) is a single-file C terminal on libghostty-vt + raylib, macOS/Linux.
  - **The full libghostty embedding API** (`ghostty_app_t` / `ghostty_surface_t`, Metal rendering, input) is real — Ghostty's own macOS Swift app is built on it — but the docs are explicit: it is "**not yet stabilized for general-purpose embedding**" and can break between releases; you build it from the Ghostty source tree with Zig.
  - Planned components: input handling, GPU rendering (Metal/OpenGL), GTK widgets, and **Swift frameworks** — i.e., the eventual "SwiftTerm competitor with Ghostty's renderer" does not exist yet.
- **VT quality:** best-in-class (Ghostty implements OSC 8, OSC 133 incl. click-to-move, Kitty graphics, etc.), but note some features (Kitty graphics, OSC clipboard) aren't yet exposed through the library API.

**Fit:** not a today choice. libghostty-vt is only the parser/state layer (you'd still build renderer + input + PTY glue), and the full surface API is explicitly unstable. Re-evaluate in 6–12 months; the Swift framework, when it lands, could become the best native option.

---

## 5. alacritty_terminal (the Zed-proven Rust crate)

- **Crate:** https://crates.io/crates/alacritty_terminal — **0.26.0, published 2026-04-06**, 1.03M downloads. **License: Apache-2.0** (crate metadata; the alacritty repo is Apache-2.0, 65,298 stars, pushed 2026-08-03).
- **What it is:** Alacritty's headless core: `Term<T>` grid + scrollback (up to 100k lines), VTE parsing, selection, search, vi-mode, damage tracking, and a `tty` module for PTY spawning. **No renderer** — you draw the grid yourself.
- **Proof of embeddability:** **Zed's terminal is built on it** — "leverages the alacritty_terminal crate for PTY management and VTE parsing while providing a custom GPUI-based rendering layer" ([Zed source](https://github.com/zed-industries/zed/blob/main/crates/terminal/src/terminal.rs), [DeepWiki](https://deepwiki.com/zed-industries/zed/9-terminal-and-task-execution)). That's a GPU-accelerated, editor-embedded, many-tabs terminal in production.
- **OSC:** OSC 8 hyperlinks yes. **OSC 133: no** — [issue #5850 "Consider adding OSC 133"](https://github.com/alacritty/alacritty/issues/5850) verified still **open** as of 2026-08-09 (filed 2022). No image protocols (no sixel/Kitty graphics) — by design.
- **Maintenance:** steady but deliberately conservative (Alacritty's philosophy); releases roughly twice a year.

**Fit:** the safe Rust engine if gmux goes native-Rust rendering. Costs: bring-your-own renderer + IME, no OSC 133 (would require patching or handling upstream of the crate), no images.

---

## 6. WezTerm's crates (wezterm-term, portable-pty)

- **Repo:** https://github.com/wezterm/wezterm — 28,278 stars, pushed 2026-08-05. **License: MIT** (verified from LICENSE.md; GitHub shows NOASSERTION).
- **wezterm-term** ([README](https://github.com/wezterm/wezterm/blob/main/term/README.md)): the richest Rust terminal model — escape parsing, keyboard/mouse encoding, scrollback grid, **sixel + iTerm2 images, OSC 8 hyperlinks**, and **semantic zones (OSC 133)** — it's the engine behind WezTerm's [shell integration](https://wezterm.org/shell-integration.html). No GUI, no PTY; you feed bytes via `advance_bytes`.
- **Catch #1 — not on crates.io:** [issue #6663](https://github.com/wezterm/wezterm/issues/6663) requests publishing `wezterm-term`; today you consume it as a git dependency or via the community fork [`tattoy-wezterm-term`](https://crates.io/crates/tattoy-wezterm-term).
- **Catch #2 — maintenance risk:** last stable release **20240203** (Feb 2024, 2.5 years ago); development continues on nightly, but the community is openly asking "[Is this project no longer being updated?](https://github.com/wezterm/wezterm/issues/7451)" (Dec 2025). WezTerm is a one-maintainer spare-time project.
- **portable-pty** (https://crates.io/crates/portable-pty): **0.9.0 (2025-02-11), 10.7M downloads, MIT** — the de-facto cross-platform PTY crate for Rust regardless of which terminal engine we pick. Worth using even if we don't touch wezterm-term.

**Fit:** feature-wise the best Rust model (only one with OSC 133 *and* images), but the unpublished-crate + maintenance-cadence risk makes it hard to bet a new product on. `portable-pty` is a keeper either way.

---

## 7. Rio's components: rio-vt, librio/RioKit, sugarloaf (the new contender)

- **Repo:** https://github.com/raphamorim/rio — 7,284 stars, pushed 2026-08-09. **License: MIT** (crates verified MIT on crates.io). Hyper-active: 0.5.11→0.5.19 all shipped 2026-08-05 → 2026-08-07 ([changelog](https://rioterm.com/changelog)).
- **Announced 2026-07-27** ([blog: "rio-vt and librio: Rio's terminal engine, now embeddable"](https://rioterm.com/blog/2026/07/27/rio-vt-and-librio), [HN thread](https://news.ycombinator.com/item?id=49084236)):
  - **rio-vt** (https://crates.io/crates/rio-vt, 0.5.19, MIT): dependency-light Rust crate — VT state machine, ANSI parser, grid + scrollback, selection, search, **PTY driver included**, sixel/Kitty/iTerm2 **image protocols**, damage tracking, no GPU/font deps. Their Criterion numbers vs alacritty_terminal 0.26: ~3.0× faster plain-ASCII parsing (835 MiB/s), ~2.1× faster alt-screen redraw, 45× faster resize (alacritty wins on wide-unicode churn).
  - **librio**: a **C ABI** over the engine — create engine → create surface (spawns the PTY) → write input → pull damage-tracked render state per cell. **Each GitHub release ships a prebuilt `RioKit.xcframework` for Swift plus `librio.a` + `librio.h`** — embedding in a Swift/macOS app with *no Rust toolchain*. macOS/Linux/Windows (ConPTY).
  - **sugarloaf** (https://crates.io/crates/sugarloaf, 0.5.19): Rio's wgpu/WebGPU renderer as a separate crate, if we want GPU text rendering in Rust.
  - Production signal: "rio-vt is already used in production by companies like Lovable."
- **Caveats:** the embeddable API is *two weeks old* at research time — expect churn; **OSC 133 semantic-prompt support is not documented/confirmed** for rio-vt (I could not verify it in the exposed API); you still bring your own renderer + IME when using rio-vt/librio directly (render state in, pixels out is your job).

**Fit:** the most interesting new option for a native app that wants a faster engine than SwiftTerm's without writing a parser — but young, and it's an *engine*, not a widget.

---

## Comparison matrix

| Component | Type | License | Latest ship (verified) | Maintenance | OSC 8 | OSC 133 marks | Images (sixel/kitty/iTerm2) | IME | PTY included | Renderer included | Proven embedder |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **xterm.js 6 + node-pty** | full widget (web) | MIT | 6.0.0 2025-12-22; beta 2026-08-09 | ★★★ (daily) | ✅ | via hooks (VS Code addon exists, MIT) | addon-image | ✅ mature | node-pty 1.1.0 | ✅ WebGL2 | VS Code, Hyper, Tabby |
| **VS Code pty host pattern** | architecture | MIT | continuous | ★★★ | — | ✅ (OSC 633/133 addon) | — | — | ✅ | — | VS Code itself |
| **SwiftTerm** | full widget (NSView) | MIT | v1.16.0 2026-08-07 | ★★★ (weekly) | ✅ | ✅ incl. click-to-cursor | ✅ all three | ✅ NSTextInputClient | ✅ LocalProcessTerminalView | ✅ CoreText (+opt. Metal) | La Terminal, Secure Shellfish, CodeEdit |
| **libghostty / -vt** | engine (C/Zig) | MIT | untagged; Ghostty 1.3.1 2026-03 | ★★★ core / API unstable | core ✅ | core ✅ | core ✅ (not all exposed) | ❌ (BYO) | ❌ (-vt) | ❌ (-vt) | Ghostty macOS app only |
| **alacritty_terminal** | engine (Rust) | Apache-2.0 | 0.26.0 2026-04-06 | ★★ (steady) | ✅ | ❌ (#5850 open) | ❌ | ❌ (BYO) | ✅ tty module | ❌ | **Zed** |
| **wezterm-term** | engine (Rust) | MIT | git only; last release 2024-02 | ★ (nightly-only, 1 maintainer) | ✅ | ✅ semantic zones | ✅ | ❌ (BYO) | via portable-pty | ❌ | WezTerm, Tattoy |
| **rio-vt / librio** | engine (Rust + C ABI/xcframework) | MIT | 0.5.19 2026-08-07 | ★★★ (weekly+) | ✅ | unconfirmed | ✅ all three | ❌ (BYO) | ✅ built-in driver | ❌ (sugarloaf separate) | Rio, Lovable |

(★★★ = multiple releases/commits per week in 2026; BYO = bring your own.)

---

## Bottom line for gmux

**Per stack, the best terminal widget:**

1. **Electron → xterm.js 6 + node-pty, and clone VS Code's pty-host design.** This is the lowest-risk path by a wide margin: MIT + MIT, both released in lockstep 2025-12-22 and in daily development, and — decisively for P1 — the *entire persistence stack already exists as prior art*: pty host process, `@xterm/headless` buffer replicas, serialize-addon replay on reattach, `reviveTerminalProcesses` state-on-disk for restarts. gmux's one architectural upgrade over VS Code: run the pty host as a **launchd user daemon** instead of an app child process, so named sessions survive app quits (not just window reloads), and wire the revive path to `claude --resume` / `codex resume` after reboots. Use only-visible-terminals-get-WebGL to stay well under WebView context limits with many sessions.

2. **Swift/AppKit native → SwiftTerm.** It is the only *complete native widget* in the survey: NSView + PTY + OSC 8 + genuinely deep OSC 133 (including click-to-move-cursor) + real `NSTextInputClient` IME, MIT, shipped in App Store products, released 2026-08-07. Durability again comes from architecture, not the widget: keep PTYs in a small daemon (SwiftTerm's engine is headless-capable, so a daemon-side buffer replica + replay-on-attach mirrors VS Code's design). **Upgrade path:** if raw throughput ever becomes the bottleneck, `librio`/RioKit.xcframework drops a faster Rust engine behind a C ABI into the same Swift app — and **libghostty's planned Swift framework is the thing to re-evaluate in 2027**, not to bet on now (API explicitly unstable, untagged).

3. **Tauri/Rust → two viable shapes, both with trade-offs.**
   - *Webview terminal:* xterm.js in the WKWebView + **portable-pty** (0.9.0, 10.7M downloads, MIT) in the Rust backend, streaming over Tauri IPC/WebSocket. You keep the xterm.js ecosystem but hand-roll the pty-host/persistence layer that Electron would have shared with node-pty/VS Code patterns (no `@xterm/headless` on the Rust side — you'd run serialization in the webview or embed a headless JS runtime, which is awkward).
   - *Native-rendered terminal:* **alacritty_terminal** (Zed-proven, Apache-2.0, but no OSC 133/images) or **rio-vt** (faster, images included, MIT, but 2 weeks old) + the **sugarloaf** wgpu renderer — at the cost of building font shaping, selection UX, and macOS IME yourself, which is months of work SwiftTerm/xterm.js give for free.

**Cross-cutting verdict for P1:** no terminal widget provides durable sessions by itself — durability = (daemon-owned PTYs) + (server-side buffer replica) + (serialize/replay on attach) + (relaunch-with-`--resume` after reboot). xterm.js/VS Code is the only stack where all four pieces already exist under MIT; every other stack re-implements them around its chosen engine. That asymmetry — more than raw renderer performance — is the strongest technical argument this dimension contributes to the Electron-vs-native decision, and it should be weighed against the app-weight findings of the framework dimension (P6).

**Avoid for now:** wezterm-term (best-on-paper Rust model, but unpublished on crates.io, stable releases stalled since Feb 2024, single spare-time maintainer) and full libghostty embedding (explicitly not stabilized for third parties; Zig build required).

---

## Sources

- xterm.js repo/releases: https://github.com/xtermjs/xterm.js · https://github.com/xtermjs/xterm.js/releases · WebGL addon: https://github.com/xtermjs/xterm.js/blob/master/addons/addon-webgl/README.md · parser API: https://xtermjs.org/docs/api/terminal/interfaces/iparser/ · npm registry (versions/dates verified): registry.npmjs.org/@xterm/xterm
- node-pty: https://github.com/microsoft/node-pty · registry.npmjs.org/node-pty
- VS Code persistence: https://code.visualstudio.com/docs/terminal/advanced · https://github.com/microsoft/vscode/issues/117265 · https://github.com/microsoft/vscode/issues/133516 · https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts · shell integration sequences: https://code.visualstudio.com/docs/terminal/shell-integration
- SwiftTerm: https://github.com/migueldeicaza/SwiftTerm · releases (v1.16.0 2026-08-07 via GitHub API) · source verification of OSC 133/OSC 8/NSTextInputClient in `Sources/SwiftTerm/Terminal.swift` and `Sources/SwiftTerm/Mac/MacTerminalView.swift` (main branch, 2026-08-09)
- libghostty: https://mitchellh.com/writing/libghostty-is-coming · https://ghostty-org-ghostty.mintlify.app/api/overview · https://github.com/ghostty-org/ghostling · https://github.com/coder/libghostty-vt-node · Ghostty 1.3.x: https://ghostty.org/docs/install/release-notes/1-3-1
- alacritty_terminal: https://crates.io/crates/alacritty_terminal (0.26.0, Apache-2.0 verified via crates.io API) · OSC 133 issue (open, verified via GitHub API 2026-08-09): https://github.com/alacritty/alacritty/issues/5850 · Zed usage: https://github.com/zed-industries/zed/blob/main/crates/terminal/src/terminal.rs
- wezterm: https://github.com/wezterm/wezterm/blob/main/term/README.md · publish request: https://github.com/wezterm/wezterm/issues/6663 · maintenance concern: https://github.com/wezterm/wezterm/issues/7451 · https://crates.io/crates/tattoy-wezterm-term · https://crates.io/crates/portable-pty · shell integration: https://wezterm.org/shell-integration.html · MIT license verified from repo LICENSE.md
- Rio: https://rioterm.com/blog/2026/07/27/rio-vt-and-librio · https://rioterm.com/changelog · https://crates.io/crates/rio-vt · https://crates.io/crates/sugarloaf · HN discussion: https://news.ycombinator.com/item?id=49084236
- Repo star/push/license metadata: GitHub REST API, queried 2026-08-09.
