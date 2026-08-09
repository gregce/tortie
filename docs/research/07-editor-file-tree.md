# gmux research 07 — Click-to-view/edit (P4) and the file tree (P3 adjacency)

**Dimension:** the editor pane and file-tree component for gmux — a macOS "shell for agentic coding" whose editing profile is *glance at what the agent changed (often a diff), tweak a file, save*. Not a full IDE. Verified against project state as of **August 2026**.

**Framing constraint that drives everything below:** for gmux, *diff rendering is as important as editing*. The user's dominant P4 gesture is "click a file the agent touched → see what changed → maybe fix two lines → save". A component that ships a good diff view for free is worth more than one with better IntelliSense.

---

## 1. Web-stack editors (Electron, or Tauri via webview)

### 1.1 Monaco Editor (VS Code's editor, standalone)

- **What it is:** the exact editor component from VS Code, published standalone as [`monaco-editor` on npm](https://www.npmjs.com/package/monaco-editor).
- **License:** MIT ([repo](https://github.com/microsoft/monaco-editor)).
- **Maintenance (verified):** latest stable **0.56.0, published 2026-07-20** (npm registry); repo pushed 2026-08-07; ~46.5k stars. Microsoft ships dev builds continuously ([libraries.io](https://libraries.io/npm/monaco-editor)). Healthy.
- **Weight:** npm install size ~**72.6 MB** ([libraries.io](https://libraries.io/npm/monaco-editor)); what reaches the page is roughly 5–10 MB of JS uncompressed / ~2–5 MB gzipped with languages ([PkgPulse 2026 comparison](https://www.pkgpulse.com/guides/monaco-editor-vs-codemirror-6-vs-sandpack-in-browser-2026)). Replit measured Monaco + related libs at **51 MB of bundle, ~5 MB parsed+gzipped** before they migrated away ([Replit: Betting on CodeMirror](https://blog.replit.com/codemirror)). Also requires **web workers** for its language services.
- **Capabilities relevant to gmux:**
  - **Built-in diff editor** (`monaco.editor.createDiffEditor`) — side-by-side and inline diff with intra-line highlighting, the same widget VS Code uses. This is Monaco's single biggest gift to gmux: P4's "glance at diffs" is a solved problem out of the box.
  - Syntax highlighting for ~80 languages via **Monarch** (regex tokenizer). Note: standalone Monaco does **not** use VS Code's TextMate grammars, and does not use tree-sitter; getting VS Code-fidelity highlighting requires wiring `vscode-textmate` + oniguruma WASM yourself.
  - Full VS Code keybindings, find/replace, multi-cursor, minimap, folding — familiar muscle memory for a Cursor refugee.
- **Caveats:**
  - AMD build deprecated; ESM + bundler config with worker plumbing (`MonacoEnvironment.getWorker`) is required, and this is the classic pain point in Tauri/webview contexts ([monaco worker discussion](https://github.com/microsoft/monaco-editor/discussions/4486)).
  - **WKWebView history:** old versions broke on macOS ≤ 10.15 ([#2457](https://github.com/microsoft/monaco-editor/issues/2457)) and Catalyst webviews had copy/paste/scroll event issues ([#2205](https://github.com/microsoft/monaco-editor/issues/2205)). On modern macOS (13+) WKWebView Monaco works, but Tauri users must serve workers via the custom protocol correctly. In Electron (Chromium) none of this applies — Monaco is exactly at home there (VS Code *is* Electron+Monaco).

### 1.2 CodeMirror 6

- **What it is:** modular, extensible editor library by Marijn Haverbeke; the editor under Replit, Sourcegraph, Chrome DevTools, Obsidian plugins, etc.
- **License:** MIT (all `@codemirror/*` packages; verified via npm registry metadata).
- **Maintenance (verified, important 2026 event):** CodeMirror **migrated off GitHub to a self-hosted Forgejo at code.haverbeke.berlin in April 2026**; the GitHub repos (e.g. [codemirror/dev](https://github.com/codemirror/dev), [codemirror/merge](https://github.com/codemirror/merge)) were archived 2026-04-15 ([migration announcement](https://discuss.codemirror.net/t/codemirrors-migration-to-forgejo/9706), [new home](https://code.haverbeke.berlin/codemirror/dev/)). Development continues actively: **`@codemirror/view` 6.43.8 published 2026-08-04**, `@codemirror/merge` 6.12.2 published 2026-06-09 (npm registry). Not abandonment — just don't judge it by archived GitHub mirrors.
- **Weight:** tree-shakeable; a basic editor is ~**50–150 kB min**, ~300 kB with a language and batteries ([Replit](https://blog.replit.com/codemirror), [npm-compare](https://npm-compare.com/codemirror,monaco-editor)). Roughly **10–30× smaller** than Monaco. No web workers required.
- **Diffs:** [`@codemirror/merge`](https://github.com/codemirror/merge) (MIT) provides **both side-by-side (`MergeView`) and unified (`unifiedMergeView`) diff views**, with chunk accept/revert controls. Actively released through June 2026. Covers gmux's diff-glance need, though with less polish than Monaco's diff editor (no intra-line character diff shading as refined, simpler gutter UX).
- **Syntax:** native parsing is **Lezer** (Haverbeke's incremental parser, *inspired by* tree-sitter but not tree-sitter — [lezer.codemirror.net](https://lezer.codemirror.net/)). ~30 first-party `@codemirror/lang-*` packages plus a large community set (`@replit/codemirror-lang-*`, legacy modes). **Tree-sitter bridges exist** in the community (feeding [`web-tree-sitter`](https://www.npmjs.com/package/web-tree-sitter) — 0.26.12, MIT, published 2026-08-08 — into CodeMirror decorations; see e.g. [discussion](https://discuss.codemirror.net/t/performance-vs-tree-sitter-for-non-web-based-use/3317)), but they're DIY glue, not a first-party path. For gmux's language set (TS/JS, Python, Rust, Go, Swift, Markdown, JSON, YAML, shell) first-party Lezer coverage is complete — the bridge is unnecessary.
- **Editing UX:** excellent for "tweak a file": multi-cursor, search panel, bracket matching, autocomplete framework. What it lacks vs Monaco is the built-in LSP-grade language smarts — irrelevant for gmux's editing profile.

### 1.3 Web-stack comparison table

| | Monaco 0.56 | CodeMirror 6 |
|---|---|---|
| License | MIT | MIT |
| Last release (verified) | 2026-07-20 | @codemirror/view 2026-08-04 |
| Payload | ~5 MB gz w/ languages, + workers | ~150–300 kB, no workers |
| Diff view | Built-in, VS Code-quality, side-by-side + inline | `@codemirror/merge`: split + unified, accept/revert chunks |
| Highlighting | Monarch (regex); TextMate = extra WASM plumbing | Lezer (incremental parse tree); optional web-tree-sitter bridge |
| Mobile/webkit quirks | Worker setup pain in Tauri/WKWebView | None notable; runs anywhere |
| Feel | Exactly VS Code | Configurable to ~90% of it |
| Fit in Electron | Perfect (native habitat) | Great |
| Fit in Tauri (WKWebView) | Works, with worker/protocol care | **Best fit** |

---

## 2. Native Swift (AppKit/SwiftUI) editor components

### 2.1 CodeEdit's components — `CodeEditSourceEditor` / `CodeEditTextView`

- **The parent project:** [CodeEdit](https://github.com/CodeEditApp/CodeEdit) is the community "native Xcode-like editor for macOS" — MIT, ~23k stars, **still pre-1.0** (latest release v0.3.6, 2025-08-26; repo pushed 2026-08-04; README still says "not yet recommended for production use"). The *app* is a curiosity; the *packages* are the useful part.
- **[`CodeEditSourceEditor`](https://github.com/CodeEditApp/CodeEditSourceEditor)** (MIT, 713★): Xcode-inspired source editor view, SwiftUI + AppKit APIs, **tree-sitter-powered highlighting**, themes, find/replace, minimap, bracket matching, inline diagnostics, code-completion hooks. Verified activity: **v0.15.2 released 2025-09-16, repo pushed 2026-04-20** — alive but slow-cadence, and its own README carries a "not ready for production use" warning.
- **[`CodeEditTextView`](https://github.com/CodeEditApp/CodeEditTextView)** (MIT, 180★): the underlying TextKit-2-style text view (fast layout, large-document support). v0.12.1, 2025-07-30; pushed 2026-04-20.
- **[`CodeEditLanguages`](https://github.com/CodeEditApp/CodeEditLanguages)**: a bundled collection of prebuilt **tree-sitter grammars** (dozens of languages) — this is the piece that makes tree-sitter practical in Swift without building each grammar yourself. Last pushed 2025-06-11.
- **Standalone usability:** genuinely designed as standalone SwiftPM packages (CodeEdit consumes them the same way you would). Realistic assessment: the most complete *drop-in* native code-editor view in the Swift OSS world, but pre-1.0 with breaking changes between minors, and **no diff view** — you'd build the diff presentation yourself (or render diffs in a different pane).

### 2.2 STTextView

- [`STTextView`](https://github.com/krzyzanowskim/STTextView) (Marcin Krzyżanowski): performant TextKit 2 NSTextView/UITextView replacement — line numbers, multi-cursor, search/replace, plugin architecture. macOS 14+, iOS 16+.
- **Maintenance (verified):** extremely active — **v2.3.12 released 2026-08-01**, repo pushed 2026-08-03, 1.5k★.
- **License — the catch:** **dual-licensed GPL v3.0 or paid commercial** ([README](https://github.com/krzyzanowskim/STTextView/blob/main/README.md)); GitHub reports `NOASSERTION`. For an OSS-permissive or closed-source gmux, GPL v3 is viral for a linked Swift package — you'd either GPL gmux or buy a license. Syntax highlighting comes via [STTextView-Plugin-Neon](https://github.com/krzyzanowskim/STTextView-Plugin-Neon) (tree-sitter through Neon). Technically the best-maintained native text view; legally the most encumbered.

### 2.3 Runestone

- [`Runestone`](https://github.com/simonbs/Runestone) (Simon Støvring): MIT, 3.2k★, tree-sitter-based editor. Verified: v0.5.2 released 2026-03-25 — maintained.
- **Disqualifier for gmux:** it is a **UIKit component for iOS/iPadOS**; the README says Mac Catalyst support is "mostly" working and "isn't fully tested" ([README](https://github.com/simonbs/Runestone/blob/main/README.md)). gmux wants a real AppKit app. Not a fit; listed for completeness.

### 2.4 Neon + SwiftTreeSitter (the highlighting layer, not an editor)

- [`Neon`](https://github.com/ChimeHQ/Neon) (ChimeHQ / Matt Massicotte): **BSD-3-Clause**, a content-based text-styling engine with a **tree-sitter token source** and a `TreeSitterClient` that runs `highlights.scm` queries with low-latency multi-pass styling. Verified: last tagged release 0.6.0 (2024-01), but repo pushed 2026-04-18 — main is ahead of tags; pre-1.0 API.
- **SwiftTreeSitter became official:** ChimeHQ's Swift bindings were adopted upstream as [`tree-sitter/swift-tree-sitter`](https://github.com/tree-sitter/swift-tree-sitter) (BSD-3-Clause, pushed 2026-08-05). Tree-sitter in Swift is now a first-party, actively-maintained path.
- Role for gmux: if you build the editor from `STTextView` or a plain `NSTextView`, Neon+SwiftTreeSitter is how you paint it. If you use `CodeEditSourceEditor`, this layer is already inside it.

### 2.5 Swift file tree

There is **no dominant third-party file-tree package** in the Swift ecosystem; the platform components are the answer:

- **`NSOutlineView`** (AppKit) — exactly what Finder/Xcode use; lazy children, cheap for 100k files; wrap in `NSViewRepresentable` if the shell is SwiftUI.
- **SwiftUI `List(children:)` / `OutlineGroup`** — fine for moderate trees; historically weaker at very large trees and fine-grained reload control.
- Watch with **FSEvents/DispatchSource**; git-status decorations (P3) are DIY: run `git status --porcelain=v2` (or libgit2) per repo and map paths → badge/color, the same architecture VS Code uses. CodeEdit's file navigator does exactly this but is **not** packaged standalone — it lives inside the app target.

Cost estimate: an NSOutlineView file tree with git decorations is ~1–2 weeks of focused work; there is no shortcut package to buy it.

---

## 3. Rust / Tauri-native and Rust-GUI options

### 3.1 The webview route (the realistic one for Tauri)

Tauri's answer for P4 is the same as Electron's: run CodeMirror 6 (or Monaco) in the WKWebView. CodeMirror is the smoother fit — no worker plumbing, tiny payload, no WKWebView quirks (see §1.3; Monaco's worker loading needs custom-protocol care in Tauri, per [monaco discussions](https://github.com/microsoft/monaco-editor/discussions/4486) and Tauri's [webview docs](https://v2.tauri.app/reference/webview-versions/)). Optionally, run **native tree-sitter (Rust crate, MIT) on the Rust side** and ship decorations over IPC — but for gmux's languages, in-webview Lezer is simpler and fast enough.

### 3.2 Zed's crates

- **[`gpui`](https://crates.io/crates/gpui)**: Zed's GPU-accelerated UI framework, **Apache-2.0**, now published on crates.io (0.2.2, 2025-10-22, ~194k downloads) and explicitly offered for building your own apps ([Zed open-source announcement](https://zed.dev/blog/zed-is-now-open-source)). Pre-1.0, breaking changes between versions.
- **Zed's `editor` crate**: **GPL-3.0** (Zed's split: GPL for app crates, AGPL for collab server, Apache-2.0 only for gpui and reuse-intended crates — [zed repo](https://github.com/zed-industries/zed)). It is not published to crates.io, drags in a large web of GPL workspace crates (`text`, `multi_buffer`, `project`, …), and would make gmux GPL-3.0. **Practical verdict: Zed's editor is not reusable for gmux** unless gmux itself is GPL — and even then, extraction effort is high because the crates assume Zed's app model.
- Building gmux *on gpui* with a from-scratch editor is a real (Apache-licensed) option but means hand-rolling text editing — months, not weeks.

### 3.3 Lapce / Floem

- [Lapce](https://github.com/lapce/lapce) (Apache-2.0) builds on [`floem`](https://github.com/lapce/floem) (**MIT**, 4.2k★, pushed 2026-06-21), a reactive native-Rust UI toolkit. Floem ships a built-in [`views::editor`](https://lapce.dev/floem/floem/views/editor/struct.Editor.html) widget backed by a rope (`lapce-xi-rope`), with a syntax-highlighting example. It's the most credible "native Rust editor widget you can actually embed", but small community, sparse docs, and highlighting/diff views are assembly-required.

### 3.4 egui / iced editors

- [`egui_code_editor`](https://github.com/p4ymak/egui_code_editor) (MIT/Apache): line numbers + **keyword-set syntax highlighting** — toy-grade coloring, no tree-sitter/parse tree. Below the bar for gmux.
- [`iced-code-editor`](https://github.com/LuDog71FR/iced-code-editor) (new in 2025–26): canvas-based editor for iced with syntect highlighting. Young, single-maintainer, unproven at scale.
- Verdict: the pure-Rust-GUI editor ecosystem in 2026 is still where Swift's was in 2021. If gmux goes Tauri, put the editor in the webview; don't fight this front.

---

## 4. File-tree components per stack

| Stack | Component | License / status (verified) | Notes |
|---|---|---|---|
| Web (React) | [`react-arborist`](https://github.com/jameskerr/react-arborist) | MIT; 3.7k★; pushed 2026-07-25 (moved from brimdata to jameskerr) | Virtualized (fine for huge repos), inline rename, DnD, keyboard nav, custom node renderers — ideal for git-status badge decorations |
| Web (React) | [`react-complex-tree`](https://github.com/lukasbach/react-complex-tree) | MIT; 1.4k★; pushed 2026-06-24 | Accessibility-first alternative; heavier API |
| Web | VS Code's own tree/SCM widgets | n/a | **Not extractable** — the workbench tree isn't published standalone (old `monaco-tree` extractions are dead). You rebuild the look with react-arborist + codicons |
| Swift | `NSOutlineView` / SwiftUI `OutlineGroup` | Platform | The real answer; no dominant third-party package; git decorations DIY (§2.5) |
| Rust-native | floem virtual list / community egui tree widgets | MIT | Hand-rolled tree on top of a virtual list; most assembly required |

In every stack the **git-status decoration layer is custom**: a `git status --porcelain=v2` (or libgit2/git2-rs) watcher mapping paths → colors/badges. No stack gives it away; the web stack merely makes the rendering easiest.

---

## 5. Tree-sitter as the common denominator — with one asterisk

Tree-sitter is the shared substrate across almost every serious 2026 editor component:

- **Swift:** CodeEditSourceEditor (via CodeEditLanguages grammar bundle), Neon/`TreeSitterClient`, STTextView-Plugin-Neon, Runestone — and the Swift bindings are now the **official** [`tree-sitter/swift-tree-sitter`](https://github.com/tree-sitter/swift-tree-sitter) (BSD-3, active Aug 2026).
- **Rust:** tree-sitter is a native Rust crate (MIT); Zed and Lapce both highlight with it.
- **Web:** [`web-tree-sitter`](https://www.npmjs.com/package/web-tree-sitter) WASM (0.26.12, 2026-08-08, MIT) works in any webview.

**The asterisk:** the two best web editors don't use it natively. CodeMirror uses **Lezer** (same incremental-parsing idea, different grammar format — [lezer.codemirror.net](https://lezer.codemirror.net/)) and Monaco uses **Monarch** regex tokenizers. So "tree-sitter everywhere" is only literally true on the native paths; on the web path you accept Lezer/Monarch (fine — quality is comparable for mainstream languages) or wire a community web-tree-sitter bridge. This should not drive the stack decision: highlighting quality is a solved problem on every path; the *diff view* and *component maturity* are the real differentiators.

---

## 6. Right-weight assessment for gmux's editing profile

gmux's P4 is "glance at diffs, tweak a file, save". Scoring what each candidate gives you *for free* against that:

| Need | Monaco | CodeMirror 6 + merge | CodeEditSourceEditor | STTextView | floem/egui/iced |
|---|---|---|---|---|---|
| Side-by-side / inline diff | ✅ built-in, best-in-class | ✅ built-in package | ❌ DIY | ❌ DIY | ❌ DIY |
| Syntax highlighting | ✅ | ✅ | ✅ (tree-sitter) | ✅ (plugin) | ⚠️ weak/DIY |
| Basic editing + find/replace | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| License friction | none (MIT) | none (MIT) | none (MIT) | **GPLv3/commercial** | none |
| Maturity for production | high | high | **pre-1.0, self-declared not production-ready** | high | low |
| Weight | heavy (~5 MB gz + workers) | light (~300 kB) | native, light | native, light | native, light |

Two observations fall out:

1. **Only the web stack ships the diff view.** On any native path, the single most important P4 feature for gmux is a build-it-yourself project. That's the strongest editor-dimension argument for an Electron/Tauri shell.
2. Monaco's extra weight buys VS Code muscle-memory and the best diff widget; CodeMirror's lightness buys startup speed and zero WKWebView risk. In **Electron**, Monaco's weight is noise (the runtime already costs more) — take Monaco. In **Tauri**, CodeMirror keeps the "lightweight" story honest and avoids worker plumbing — take CodeMirror 6 + `@codemirror/merge`, and upgrade to Monaco later only if diff polish demands it (both can even coexist; several shipping apps lazy-load Monaco only for diff views).

---

## Bottom line for gmux

- **If gmux is Electron:** use **Monaco (MIT, 0.56.0, actively shipped by Microsoft)** for both the editor and the diff view, plus **react-arborist (MIT, active)** for the file tree with custom git-status decorations. This is literally the VS Code parts bin — maximum familiarity for a Cursor user, near-zero editor engineering.
- **If gmux is Tauri:** use **CodeMirror 6 + `@codemirror/merge` (MIT, releases through Aug 2026 despite the April 2026 move to code.haverbeke.berlin)** in the webview, react-arborist for the tree. ~300 kB, no workers, no WKWebView landmines. Don't attempt a native-Rust editor widget; and Zed's editor crate is off the table (GPL-3.0, unpublished, deeply entangled) even though gpui itself is Apache-2.0.
- **If gmux is native Swift:** the honest choice is **CodeEditSourceEditor + CodeEditTextView + CodeEditLanguages (all MIT, tree-sitter-based)** — accept pre-1.0 churn and its own "not production ready" disclaimer, and budget building the diff view and an NSOutlineView file tree (with `git status --porcelain` decorations) yourself; keep **Neon + official swift-tree-sitter (BSD-3)** as the fallback substrate if you outgrow it. **Avoid STTextView unless you're willing to GPL gmux or buy a commercial license**, and skip Runestone (iOS-first).
- **Dimension verdict:** the editor + file-tree dimension favors the **web-stack paths strongly** — they're the only ones where P4's diff-centric workflow is free, mature, and MIT across the board. If other dimensions (terminal durability, memory) push gmux native-Swift, P4 is *achievable* but becomes roughly 3–6 weeks of extra engineering (diff view + tree + decorations) on pre-1.0 foundations.
