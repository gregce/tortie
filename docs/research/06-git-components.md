# Research: VS Code-grade Git experience (P2) + status decorations (P3)

Dimension research for **gmux** — the git sidebar (branch always visible, stage/unstage/commit, history with copy-SHA) and file-tree git-status decorations. Researched August 2026; all maintenance/license claims verified against live sources (GitHub API, npm registry, release pages) on 2026-08-09.

---

## 1. How VS Code actually does it (the reference implementation)

VS Code's git support is **not** libgit2 or any binding — it is a built-in extension (`extensions/git` in [microsoft/vscode](https://github.com/microsoft/vscode/blob/main/extensions/git/README.md), MIT) that **spawns the system `git` CLI** and parses its output. This is the single most important finding of this dimension: the best-regarded git UX in the industry is a process-spawning wrapper around `git`, not a library integration.

### 1.1 Execution model (`extensions/git/src/git.ts`)

Verified directly from [git.ts on main](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/git.ts):

- Executes via `cp.spawn(this.path, args, options)` (Node `child_process`).
- Finds the binary per-platform: on macOS it runs `which git`; validates every candidate by spawning `git --version`.
- **Status**: `['status', '-z']` plus `-uall`/`-uno` and optional `--ignore-submodules`. The `-z` NUL-termination makes parsing robust against weird filenames. A hand-rolled `GitStatusParser` turns entries into typed change objects.
- **History**: `['log', '--format=<custom>', '-z']` parsed by `parseGitCommits()` (full SHA is a format field → copy-SHA is free).
- **Refs/branch**: `['for-each-ref', '--format=...']` via `parseRefs()`.
- Diff: `['diff', '--name-status', '-z', '--diff-filter=ADMR']`.
- Credential prompts are handled by pointing `GIT_ASKPASS` at a bundled script that IPCs back to the app (askpass.sh + askpass-main.ts) — a pattern gmux should copy verbatim for HTTPS remotes.
- Git ≥ 2.15 supports `--no-optional-locks` / `GIT_OPTIONAL_LOCKS=0`, added specifically so background `git status` from IDEs never takes the index lock and never fights the user's (or an agent's!) foreground git commands. Any background poller gmux runs should set it.

### 1.2 Refresh model (`repository.ts`, `watch.ts`)

Verified from [repository.ts](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/repository.ts) and [watch.ts](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/watch.ts):

- Two watchers per repo: a **working-tree watcher** (events filtered to exclude `.git/`) and a **dotgit watcher** on `.git` itself (ignoring `index.lock` and fsmonitor cookie files). `.git/HEAD` changes are how branch switches are detected instantly.
- Any relevant event funnels into a **`@throttle`d `status()`** — rapid agent-driven file churn collapses into single status runs. Decoration recomputation is additionally `@debounce(500)`.
- Huge-repo guard: above a change-count limit (`git.statusLimit`, default 10 000) it degrades gracefully ("Too many changes were detected. Only the first N…").
- The watcher primitive underneath VS Code core is **[@parcel/watcher](https://github.com/microsoft/vscode/wiki/File-Watcher-Internals)** (recursive, native FSEvents on macOS) since the old nsfw watcher was replaced ([vscode#133753](https://github.com/microsoft/vscode/issues/133753)).

### 1.3 Decoration model (`decorationProvider.ts`)

Verified from [decorationProvider.ts](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/decorationProvider.ts): three `FileDecorationProvider`s (git status, gitignored files, incoming changes). Each maps a URI → `{badge, tooltip, ThemeColor}`: **M** modified, **A** added, **D** deleted, **R** renamed, **U** untracked, plus colors like `gitDecoration.modifiedResourceForeground`. Providers re-fire on `repository.onDidRunGitStatus`. Decorations **propagate up parent folders** in the tree in the workbench UI. The entire "decorations" concept is just: *after each status run, publish a map of path → (letter, color) and repaint the tree*. This is trivially replicable in any UI stack.

### 1.4 The SCM API model (worth copying conceptually)

The extension pushes state into VS Code's SCM framework as **resource groups**: *Merge Changes*, *Staged Changes*, *Changes*, *Untracked* — each a list of resource states with click actions (open diff) and context actions (stage/unstage/discard). The input box + commit button and the branch name in the status bar complete P2. gmux needs exactly these four groups and nothing more to feel "VS Code-grade."

### 1.5 Can the code be reused outside VS Code?

- **License**: yes — the whole vscode repo including `extensions/git` is MIT.
- **Verbatim reuse** requires a VS Code-compatible extension host. That's how Eclipse Theia does it: [eclipse-theia/vscode-builtin-extensions](https://github.com/eclipse-theia/vscode-builtin-extensions) packages the builtins as `.vsix` (the `vscode.git` extension is consumed from OpenVSX). Embedding a whole extension host (Theia, code-oss, openvscode-server) contradicts P6 (lightweight) — **not recommended** for gmux.
- **Porting reuse** is very practical: `git.ts` + the parsers (`GitStatusParser`, `parseGitCommits`, `parseRefs`) are nearly dependency-free TypeScript. In an Electron/Node gmux, lifting these files (~2–3k LOC, MIT attribution) gives battle-tested git plumbing for free. In Swift/Rust, they serve as an exact spec for which commands to run and how to parse them.

---

## 2. Library options, by app stack

### 2.1 JavaScript/TypeScript (Electron)

| Library | What it is | License | Status (verified 2026-08) | Verdict for gmux |
|---|---|---|---|---|
| [simple-git](https://www.npmjs.com/package/simple-git) | Fluent wrapper that spawns system `git` | MIT | v3.36.0, published 2026-04; repo active (pushed 2026-08-09), 3.9k★ | ✅ Fine convenience layer; or skip it and port VS Code's `git.ts` |
| [dugite](https://github.com/desktop/dugite) | GitHub Desktop's git layer; **bundles its own git binaries** (dugite-native) | MIT | v3.2.2 (2026-04-14); maintained by GitHub Desktop team | ✅ Best if you don't want to depend on the user's git install; heavier download |
| [isomorphic-git](https://github.com/isomorphic-git/isomorphic-git) | Pure-JS reimplementation of git | MIT | v1.41.0 published 2026-08-08; maintainers are volunteers doing mostly review | ⚠️ No shell-out needed, but incomplete git semantics (config, hooks, fsmonitor, credential helpers); wrong tool when git CLI is guaranteed present |
| [nodegit](https://github.com/nodegit/nodegit) | libgit2 native bindings | MIT | **Last stable 0.27.0 (2020)**; has been stuck on `0.28.0-alpha.*` for 4+ years (alpha.38, 2026-04-23). Native rebuilds against each Electron ABI are a recurring pain | ❌ Avoid — effectively life-support maintenance |

### 2.2 Rust (Tauri)

| Library | What it is | License | Status | Verdict |
|---|---|---|---|---|
| [git2-rs](https://github.com/rust-lang/git2-rs) | Bindings to libgit2 (rust-lang org) | MIT/Apache-2.0 (libgit2 itself: GPLv2 **with linking exception** — safe to link into proprietary apps, [libgit2.org](https://libgit2.org/), v1.9.6 2026-07-18) | v0.20.4 (Feb 2026), repo active 2026-07 | ✅ Solid for reads (status, log, refs); writes still better through git CLI |
| [gitoxide / gix](https://github.com/GitoxideLabs/gitoxide) | Pure-Rust git; powers `cargo` | MIT/Apache-2.0 | v0.56.0 (2026-07-23), very active (11.8k★, pushed daily) | ✅ Fastest status/log via parallelism; but push/merge/rebase/hooks still incomplete — pair with git CLI for mutations |
| GitButler's crates | See §3.1 | FSL-1.1-MIT | active | ⚠️ Reference only (license) |

### 2.3 Swift (native AppKit/SwiftUI)

| Library | License | Status | Verdict |
|---|---|---|---|
| [SwiftGit2](https://github.com/SwiftGit2/SwiftGit2) (libgit2 bindings) | MIT | Last push 2025-11-24; 704★; small-team, slow cadence | ⚠️ Usable but thin bus factor; libgit2 vendoring on Apple Silicon is on you |
| [objective-git](https://github.com/libgit2/objective-git) | MIT | **Dormant — last push 2023-09-17** | ❌ Avoid |
| Shell out via `Process` | n/a | git ships with Xcode CLT on every dev Mac | ✅ The pragmatic choice; implement VS Code's command set directly |

**Cross-stack conclusion:** on every stack, the robust core is *spawn `git`, parse porcelain output*; libraries are at best an optimization for hot read paths. This is also what SourceGit (below) and GitHub Desktop (via dugite) do. Shelling out inherits the user's hooks, config, credential helpers, signing setup, and fsmonitor — all things libgit2/isomorphic-git reimplement imperfectly. Note for gmux's audience specifically: coding agents run `git` in the same working tree, so a GUI that goes through the same CLI (honoring `index.lock`, `--no-optional-locks`) is *safer* than one holding libgit2 handles to the index.

---

## 3. Existing OSS git UIs — what's reusable

### 3.1 GitButler

[gitbutlerapp/gitbutler](https://github.com/gitbutlerapp/gitbutler) — Tauri 2 + SvelteKit/TS frontend, Rust backend using **git2 + gix together**, SQLite (rusqlite) for app state. 21.5k★, extremely active (pushed 2026-08-09).

- **License is the catch**: [FSL-1.1-MIT](https://github.com/gitbutlerapp/gitbutler/blob/master/LICENSE.md) (Functional Source License) — free for any "Permitted Purpose" but **excludes "Competing Use"** (offering a substitute product). Each release converts to MIT **two years after** it ships. gmux (a terminal-first agent shell) is arguably not a GitButler substitute, but its git sidebar overlaps enough that depending on FSL code is legal gray area. 
- **Verdict**: treat as *architecture reference* (the git2+gix hybrid pattern, Tauri IPC design, their virtual-branch diffing) — do not vendor its crates. Code ≥2 years old is already MIT if something specific is truly needed.

### 3.2 lazygit (the cheap path to full git power)

[jesseduffield/lazygit](https://github.com/jesseduffield/lazygit) — Go TUI, **MIT**, 81k★, monthly releases ([v0.64.0, 2026-08-04](https://github.com/jesseduffield/lazygit/releases) — notably shipped "a completely overhauled concurrency model"). It also shells out to git.

- It is a full-screen TUI, not a library — but **gmux is a terminal app by construction (P1)**. Embedding lazygit is: run `lazygit -p <repo>` in a dedicated persistent pane per project. Zero integration code buys staging (including line-level), interactive rebase, stash, cherry-pick, bisect, PR-check status — power the custom sidebar will never match. LazyVim/Neovim ecosystems have normalized exactly this embed pattern.
- Not a replacement for P2/P3 (no always-visible branch chrome, no tree decorations, keyboard-only) — a complement.

### 3.3 SourceGit

[sourcegit-scm/sourcegit](https://github.com/sourcegit-scm/sourcegit) — C#/Avalonia desktop git GUI, **MIT**, 5.7k★, very active (v2026.17, 2026-07-31). Verified via [DeepWiki](https://deepwiki.com/sourcegit-scm/sourcegit): it **spawns git CLI processes** (`SourceGit.Commands.Command`), MVVM, commit-DAG rendering, multi-mode diff viewer. Wrong UI stack to embed in gmux, but it is the best *complete, MIT-licensed, current* reference for a VS Code-grade git panel built on CLI shelling — its command classes enumerate exactly the git invocations needed.

### 3.4 gitu and gitui (TUI alternatives to lazygit)

- [gitu](https://github.com/altsem/gitu): Magit-style Rust TUI, MIT, 2.8k★, v0.43.0 (2026-07-11), active. Great if the user has Magit muscle memory.
- [gitui](https://github.com/gitui-org/gitui): Rust TUI, MIT, 22.4k★; governance moved to gitui-org in Dec 2024; v0.28.1 (2026-03-21) — alive but slower cadence than lazygit.
- **Verdict**: lazygit remains the default embed; gmux could simply make the "git power pane" command user-configurable (`lazygit` | `gitu` | `gitui`) since all are MIT single-binary TUIs.

---

## 4. Live status: file watching + fsmonitor

Two separate problems: **(a)** when should the app re-run `git status`, and **(b)** how fast does that status run return.

### 4.1 App-side watching (trigger)

| Option | Notes |
|---|---|
| **FSEvents (macOS, native)** | The primitive everything else wraps. Free, recursive, coalesced. In Swift: `FSEventStreamCreate` directly. In Rust: `notify` crate uses it. |
| [@parcel/watcher](https://www.npmjs.com/package/@parcel/watcher) | MIT, v2.6.0 (2026-07-20). Native C++ addon over FSEvents; **what VS Code itself uses** for recursive watching ([File Watcher Internals](https://github.com/microsoft/vscode/wiki/File-Watcher-Internals)). The right choice for Electron. |
| [chokidar](https://github.com/paulmillr/chokidar) | MIT, v5.0.0 (2026-05), active. Fine, but slower on huge trees; @parcel/watcher is strictly better for this use. |
| [watchman](https://github.com/facebook/watchman) | MIT, active (pushed 2026-08). External daemon — operational overhead gmux doesn't need on macOS-only; FSEvents already scales. |

Copy VS Code's exact recipe: watch working tree (excluding `.git/`) + watch `.git` (excluding `index.lock` and fsmonitor cookies; `.git/HEAD` → branch display update), throttle status runs, debounce decoration repaint ~500 ms.

### 4.2 Git-side speed (fsmonitor)

For agent-heavy repos, `git status` cost matters because agents touch files constantly. Git ≥ 2.37 has a **built-in fsmonitor daemon on macOS** (FSEvents-backed): set `core.fsmonitor=true` per repo and status stops scanning the worktree — GitHub measured 3.2 s → 0.15 s on a 50k-file repo ([GitHub blog](https://github.blog/engineering/infrastructure/improve-git-monorepo-performance-with-a-file-system-monitor/), [git-fsmonitor--daemon docs](https://git-scm.com/docs/git-fsmonitor--daemon), [InfoQ on 2.37](https://www.infoq.com/news/2022/06/git-2-37-released/)). Because gmux shells out to the same git the daemon serves, **gmux gets this speedup for free** — and can offer a one-click "enable fast status for this repo" that runs `git config core.fsmonitor true`. (VS Code itself doesn't enable it for you; it just benefits when set.) Caveat: local volumes only (not network mounts).

---

## 5. Cheapest path to each P2/P3 feature (via git CLI)

| Feature | Command | Notes |
|---|---|---|
| Branch + ahead/behind (always-visible chrome) | `git status --porcelain=v2 --branch -z` | One call yields branch, upstream, ahead/behind AND all file states |
| Tree decorations (P3) | same call | Map XY codes → badge/color exactly as VS Code's `decorationProvider.ts`; propagate to parent dirs |
| Stage / unstage | `git add -- <p>` / `git restore --staged -- <p>` | Per-file; line-level staging can be deferred to the lazygit pane |
| Commit | `git commit -m <msg>` (`-F <file>` for multi-line) | Inherits user's hooks + signing — a libgit2 commit would not run hooks |
| History + copy-SHA | `git log --format=%H%x00%h%x00%an%x00%at%x00%s -z -n 200` | Full SHA is field one; copy-SHA is a clipboard write |
| Diff on click | `git diff [--cached] -- <p>` | Feed any diff renderer |
| Background safety | `GIT_OPTIONAL_LOCKS=0` on all read-only calls | Never contend with agents' git commands |

Total surface: ~6 git invocations + one parser + one watcher. This is a small, well-trodden amount of code on any stack.

---

## Bottom line for gmux

1. **Shell out to the git CLI everywhere.** It's what VS Code (MIT, `cp.spawn` + `status -z`), GitHub Desktop (dugite), SourceGit, and lazygit all do. It inherits hooks/config/credentials/signing/fsmonitor and coexists safely with agents running git in the same worktree (use `GIT_OPTIONAL_LOCKS=0` for background reads). Do **not** build on nodegit (stable release is from 2020) or objective-git (dormant since 2023); don't use isomorphic-git when a real git is guaranteed present.
2. **Recommended git stack per app-stack choice:**
   - **Electron/Node**: port VS Code's `extensions/git` plumbing (`git.ts`, `GitStatusParser`, `parseGitCommits`, `decorationProvider.ts` logic — MIT) or use simple-git v3.36+; watch with **@parcel/watcher** (what VS Code uses). dugite if bundling git binaries is desired.
   - **Tauri/Rust**: spawn git via `std::process` for all mutations; optionally **gix (gitoxide)** for hot read paths (status/log) — the GitButler-proven hybrid. Watch via `notify` (FSEvents).
   - **Swift native**: `Process`-spawn git + raw **FSEvents**. Skip SwiftGit2 unless a compelling need appears (low bus factor).
3. **Replicate VS Code's model, not its code host**: four resource groups (merge/staged/changes/untracked), throttled status on watcher events, dotgit watcher for instant branch updates, path→(badge,color) decoration map with parent propagation, `git.statusLimit`-style huge-repo guard. Embedding a VS Code extension host (Theia-style) to reuse `vscode.git` verbatim fails P6.
4. **Embed lazygit (MIT, v0.64.0 Aug 2026) in a dedicated persistent terminal pane** as the escape hatch for everything beyond the sidebar (interactive rebase, line staging, stash, bisect). Since gmux's core is durable terminal panes (P1), this costs ~zero code and instantly exceeds VS Code's SCM depth. Make the TUI command configurable (lazygit/gitu/gitui — all MIT).
5. **Turn on git's built-in fsmonitor** (`core.fsmonitor=true`, git ≥ 2.37, FSEvents-backed on macOS) per repo — offered as a one-click optimization — so `git status` stays sub-100 ms even while agents churn thousands of files.
6. **GitButler is a reference, not a dependency** (FSL-1.1-MIT restricts competing use; converts to MIT per-release after 2 years). SourceGit (MIT, active) is the best full reference implementation of a CLI-shelling git GUI to crib command details from.

### Key sources

- VS Code git extension source: https://github.com/microsoft/vscode/tree/main/extensions/git (git.ts, repository.ts, watch.ts, decorationProvider.ts, MIT)
- VS Code file watcher internals: https://github.com/microsoft/vscode/wiki/File-Watcher-Internals
- Theia's reuse of vscode builtins: https://github.com/eclipse-theia/vscode-builtin-extensions
- lazygit: https://github.com/jesseduffield/lazygit/releases (v0.64.0, 2026-08-04, MIT)
- GitButler + license: https://github.com/gitbutlerapp/gitbutler · https://github.com/gitbutlerapp/gitbutler/blob/master/LICENSE.md (FSL-1.1-MIT)
- SourceGit: https://github.com/sourcegit-scm/sourcegit (MIT, v2026.17) · https://deepwiki.com/sourcegit-scm/sourcegit
- gitu: https://github.com/altsem/gitu (MIT, v0.43.0) · gitui: https://github.com/gitui-org/gitui (MIT, v0.28.1)
- gitoxide: https://github.com/GitoxideLabs/gitoxide (v0.56.0) · git2-rs: https://github.com/rust-lang/git2-rs · libgit2: https://libgit2.org/ (GPLv2 + linking exception, v1.9.6)
- SwiftGit2: https://github.com/SwiftGit2/SwiftGit2 · objective-git: https://github.com/libgit2/objective-git
- dugite: https://github.com/desktop/dugite · simple-git: https://www.npmjs.com/package/simple-git · isomorphic-git: https://github.com/isomorphic-git/isomorphic-git · nodegit: https://github.com/nodegit/nodegit
- fsmonitor: https://git-scm.com/docs/git-fsmonitor--daemon · https://github.blog/engineering/infrastructure/improve-git-monorepo-performance-with-a-file-system-monitor/
- @parcel/watcher: https://www.npmjs.com/package/@parcel/watcher · chokidar: https://github.com/paulmillr/chokidar · watchman: https://github.com/facebook/watchman
