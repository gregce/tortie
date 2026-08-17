# Tortie performance and simplification map

Date: 2026-08-17

## Outcome

The product does not need a rewrite. Durability is already in tmux and SQLite. The window is a disposable client. The five fixes below cut wait time on these actions.

- First paint of the window
- First useful session list
- First git paint
- Restore all

None of them change what the user sees. None of them move session ownership out of tmux.

The largest measured wait is the login-shell PATH probe. Four packaged boots on this machine recorded 1509 ms, 1907 ms, 4012 ms, and 4161 ms. `sessions:list` waits for that probe because `getGmuxCore()` waits for `ensureServer()`. The window chrome can appear first. The session list cannot.

The P6 claim of a cold start under 1.5 s is already missed by that one probe. There is no production `performance.mark` and no CI gate that checks the claim.

## What this audit is for

The 16 August architecture audit mapped owners and lifecycle gaps. This audit maps cost.

The question is where time goes on first load, on restore after a reboot, and on the actions a person takes every minute. The constraint is that visible behaviour must not change, and the durability promise must not weaken.

The method was:

1. Read the architecture authority and the boot, restore, attach, git, activity, and renderer owners.
2. Count what the built renderer loads before the first React paint.
3. Read the live packaged `app.log` PATH times.
4. Read the live manifest and snapshot directory (read only).
5. Time `zsh -lic` against `zsh -lc` on this machine.
6. Time `git status` on this repo.
7. Time one isolated `GMUX_SMOKE=basic` launch against the built `out/` tree.

The architecture P0s from 16 August are still open. This audit does not replace them. Those are correctness. These five are speed.

## The five fixes

Do these in this order. The first one is most of the win.

| Rank | Fix | What the user feels | Measured cost today | Safe because |
|---|---|---|---|---|
| 1 | Do not wait for the login-shell PATH before listing sessions or attaching a live pane | The session list and the first terminal appear 1.5 to 4.2 s sooner on a warm machine | 1509, 1907, 4012, 4161 ms in packaged `app.log`. 8740 ms on a loaded isolated smoke | PATH is required before a new pane is spawned. It is not required to read SQLite or to attach a session that already exists |
| 2 | Split Pierre, unused sidebar views, and the always-mounted overlays out of the first JS parse | The dark chrome appears after less parse work | Boot JS is 3,240,081 + 719,248 bytes (712,459 + 142,138 gzip). Isolated smoke: 335 ms from app-ready to renderer loaded | Monaco is already lazy. Editor tabs do not persist across launch. The default sidebar is Source Control, not Explorer |
| 3 | Stop asking git for every open project from the title bar | The first SCM paint does one status, not six | Title bar calls `ensureStatus` for each of 6 open projects. Each `git status --untracked-files=all` on this repo is 0.11 to 0.17 s. Tabs do not show branch or dirty | Source Control already loads status for the active project. Tabs only show name and attention |
| 4 | Restore all in parallel with reserved names, and do not walk the selection | After a reboot, Restore all finishes in one wave instead of one session after another | 23 live sessions on this profile. Restore all is a `for` plus `await`. Each restore is 7 to 10 tmux processes. Each success calls `setActiveSession` and mounts then unmounts a PTY | Name clashes are a reservation problem, not a reason to wait. The journal is per session |
| 5 | Do not run the twelve-agent version scan until a surface needs it | First seconds of CPU stay free for attach and git | `useSettingsStore.init` calls `agents:list` on every window. Core also warms the same scan. Each probe may run 10 s. Gemini has been measured over 4 s | Create Session and Settings need the scan. The title bar and the first terminal do not |

The rest of this file is the map, the numbers, the rejected ideas, and the attack on each of the five.

## How the app is shaped

Tortie is one Electron window in front of a private tmux server on socket `-L gmux`. The app can die. The sessions stay.

```text
macOS
  Tortie.app (main)
    preload  ->  window.gmux
    renderer (one BrowserWindow)
    Settings (second BrowserWindow, own HTML)
    quickopen-worker   (first Cmd-P)
    symbols-worker x N (first Cmd-Shift-O)
    node-pty attach clients  (visible panes only)
    tmux -C control client
        |
        v
  tmux server  -L gmux   (lives across quit)
    one tmux session per Tortie session
        |
        v
  <userData>/gmux/manifest.db     (who we own)
  <userData>/gmux/snapshots/      (saved scrollback)
```

Main owns disk, git, processes, and durable sessions. The renderer owns presentation. The preload is one typed bridge. That split is correct. Do not move durability into the renderer to make the window feel faster.

### Main subsystems

| Folder | What it owns | On first load? |
|---|---|---|
| `sessions/` | Boot, reconcile, create, restore, attach, snapshots | Yes. `getGmuxCore()` |
| `tmux/` | Private server, PATH capture, exec, control client | Yes. PATH then server |
| `manifest/` | SQLite rows, harvest, backup ring, reconcile | Yes. Open after PATH |
| `attach/` | One `tmux attach` PTY per visible leaf | After hydrate, visible only |
| `restore/` | Recreate, `cat` snapshot, arm resume | Only when the user asks |
| `activity/` | 1 Hz status for every live session | After core boot |
| `git/` | One `GitService` per repo, lazy watcher | First `git:status` |
| `fs/` | One-directory `readdir` | Explorer only |
| `search/` | Vendored ripgrep per query | First search |
| `quickopen/` | Ranking worker | First Cmd-P, or idle warm |
| `symbols/` | Tree-sitter pool and `symbols.db` | First Cmd-Shift-O |
| `context/` | Disk scan of agent config | Context view, or create snapshot |
| `agents/` | Registry and version probes | Settings init and a core warm |
| `specstory/` | Wrap argv, flush on end | Create and restore wrap. Not a boot wait |
| `updates/` | First check 30 s after launch | No |
| `preview/` | `gmux-preview:` HTML frame | First HTML preview |
| `power/` | Sleep snapshot, wake reconcile | Event only |

### Renderer surfaces

| Surface | When its JS is parsed | When it mounts work |
|---|---|---|
| Shell, title bar, activity bar | First paint | First paint |
| Source Control | First paint | Default view after hydrate |
| Explorer / FileTree | First paint | Only if that view is selected |
| Search, Context | First paint | Only if that view is selected |
| Terminal (xterm + WebGL) | First paint | Visible running leaf only |
| Pierre diffs and trees | First paint | First file or Explorer |
| Every modal and palette | First paint | They render null |
| Monaco | First File-mode tab | Dynamic import |
| Markdown renderer | First markdown Preview | Dynamic import |
| Shiki highlight pool | First Diff tab | Dynamic import |
| Settings window | Own HTML | Own window |

There is no `React.lazy` in `src/renderer`. Monaco, markdown, and the highlight pool are the only production `import()` splits.

## First load, step by step

```text
process start
  identity, logging, crash reporter, single-instance lock
  userData migrate (first launch after a rename only)
  register gmux-asset: and gmux-preview:
        |
app.whenReady
  install every IPC registrar (closures only)
  log boot sequence (sentinel, crash dumps, prune)
  refuse a too-new manifest (no window)
  read agents.json (sync half)
  await proveNativeModules     << diagnostic PTY, blocks the window
        |
        +-- createWindow (show false) -- load 4 MB JS -- ready-to-show
        |
        +-- getGmuxCore()  (not awaited)
              await getUserPath()        << 1.5 to 4.2 s in app.log
              start tmux, set options
              open SQLite, reconcile
              start 1 Hz activity poll
        |
renderer first paint
  dark chrome, empty lists (ready is still false)
        |
hydrate
  projects:list + sessions:list   << both wait on getGmuxCore
  ready = true
  attach the visible live pane
  title bar starts git status on every open project
  settings store starts agents:list
```

What boot does not do:

- It does not replay scrollback.
- It does not type a resume command.
- It does not attach a PTY for a hidden session.
- It does not start Quick Open, symbols, search, or the updater check.

A session that is still in tmux is rebound by identity and then attached when its pane mounts. A session that is gone stays `restorable` until the user asks.

### Numbers on this machine

Packaged PATH captures, from `~/Library/Application Support/Tortie/logs/app.log`:

| Boot time (UTC) | PATH capture |
|---|---|
| 2026-08-16 18:40 | 1509 ms |
| 2026-08-16 20:37 | 1907 ms |
| 2026-08-17 03:19 | 4012 ms |
| 2026-08-17 03:20 | 4161 ms |

Same probe, run from this audit (the machine was already loaded):

| Command | min | mean | max |
|---|---|---|---|
| `zsh -lic` (what Tortie runs) | 8070 ms | 9873 ms | 12984 ms |
| `zsh -lc` | 142 ms | 202 ms | 269 ms |

The source already records that on this machine `zsh -lc` and `zsh -lic` returned the same set of PATH directories (24 ms versus 957 ms on 2026-08-11). `-i` is kept because `.zshrc` is where nvm and rbenv usually live. That is a correctness choice. It is also why the probe must not sit on the list path.

Isolated `GMUX_SMOKE=basic` against `out/`, profile `/tmp/tortie-perf-audit2-*`, Vite URL unset:

| Mark | Time from process start |
|---|---|
| app ready | 490 ms |
| window + renderer + preload loaded | 825 ms |
| native modules OK | 916 ms (91 ms for the PTY proof) |
| PATH capture finished | 9636 ms (8740 ms of probe) |
| tmux reachable | 10425 ms |

That smoke used the live socket `-L gmux` because `GMUX_TMUX_SOCKET` was not set. It created and killed one session named `__gmux_smoke_<pid>`. It did not kill the server. Other sessions were present. The PATH 8740 ms is from this loaded session. The 335 ms window load and the 91 ms native proof are still usable.

Live profile, read only:

| Fact | Value |
|---|---|
| Open projects | 6 |
| Live sessions | 23 (21 idle, 2 running) |
| Discarded rows | 25 |
| Rows with `envPassthrough` | 0 |
| Snapshot files | 94, 2,039,175 bytes |
| Latest snapshot per session | 26 sessions, 677,919 bytes, max 261,783 |

Built renderer, eager files (what `index.html` loads):

| File | raw bytes | gzip |
|---|---|---|
| `index-BaMLSJyr.js` | 3,240,081 | 712,459 |
| `globals-B3ZJnfUg.js` | 719,248 | 142,138 |
| `index-BkUqaRBw.css` | 238,776 | 61,457 |
| `globals-DVhkjeKR.css` | 118,202 | 27,674 |

The 416 JS files under `out/renderer/assets` are mostly Monaco and Shiki language chunks on disk. They are not the boot graph. The boot graph is the two JS files above. That graph contains Pierre `FileDiff` / `Virtualizer`, xterm, FileTree, and the overlay modules. Monaco itself is a later 26,022,901 byte chunk.

`git status --untracked-files=all` on this repo: 0.17 s, 0.11 s, 0.12 s on later runs. `--untracked-files=normal` was 0.11 s. The cost of six projects is the six processes, not the flag, on a repo this size. A larger dirty tree will make `--untracked-files=all` the expensive one. The code already measured `--ignored` on the same call at 0.218 s and 1.45 MB.

## Restore and attach

These are different machines.

| Path | Trigger | Recreates tmux? | Attaches a PTY? |
|---|---|---|---|
| Reconcile | Boot, tmux events | No | No |
| Restore | Button, Restore all, Past Sessions | Yes. New shell, `cat` snapshot, arm resume | Later, when the row is live and visible |
| Attach | Visible pane mounts | No | Yes. One client |

Restore all is serial on purpose. The comment says parallel `new-session` races name dedupe. Each success also calls `setActiveSession`, so the renderer mounts a PTY, then tears it down when the next row becomes active.

A single restore is about 7 to 10 one-shot tmux processes, plus a login-shell env probe when the row names `envPassthrough`. This profile has zero such rows. The code says the restore itself is hundreds of milliseconds in tmux.

After a reboot the 23 live rows become restorable. Restore all then walks them one by one.

Hidden sessions have no xterm and no attach PTY. That rule is already the right one. Keep it.

## What runs after the window is idle

| Loop | Cadence | Keep? |
|---|---|---|
| Activity T1 `list-panes -a` | 1 s focused, 2 s unfocused | Yes. Claimed 2.75 ms CPU for 16 panes. Needed for hidden sessions |
| Activity T2 `ps` and T3 `capture-pane` | Only while a session is still ambiguous | Yes. Cap of 6 captures per tick |
| Git watcher | Event, 300 ms flush | Yes |
| Manifest backup ring | Take at most every 5 min | Yes |
| Updater | First check at 30 s | Yes |
| Quick Open idle warm | 3 s after first project | Move to first Cmd-P if you want less background work. Not in the five |

Search, symbols, and the Context scan do not run until those surfaces open. That is already correct.

## Fix 1. PATH off the list path

### What to change

`ensureServer` awaits `getUserPath()` before it starts tmux. `GmuxCore.boot` awaits `ensureServer`. `sessions:list` awaits `getGmuxCore`. Hydrate awaits `sessions:list`.

Split that.

1. Open the manifest and list the last known rows without waiting for PATH.
2. Start the bundled tmux (packaged) or resolve tmux from the process PATH (dev) without waiting for the login shell.
3. Reconcile and attach live panes.
4. Keep the login-shell probe. Write `process.env.PATH` when it returns.
5. Any `createSession` or `restoreSession` waits for that probe if it has not finished.
6. Persist the last good PATH under userData. Use it as the first answer on the next launch. Refresh it in the background.

### How to prove it

Log four marks: `path.started`, `path.ready`, `sessions.listed`, `first.attach`. After the change, `sessions.listed` must not wait for `path.ready`. A create that fires before `path.ready` must still use the captured PATH, not the GUI PATH.

Compare five packaged cold starts before and after. The PATH line in `app.log` stays. The time from process start to the session list toast must drop by about the PATH number.

### Attack

Dropping `-i` would make the probe fast. It would also drop `.zshrc`. A user whose `claude` is only on an nvm PATH would see "agent not found". Do not drop `-i`.

Starting tmux before PATH is fine for a packaged build. The binary is inside the bundle. A dev build may find tmux only after the login shell answers. Dev can wait. Packaged must not.

Showing last-known rows before reconcile can flash a stale status. The code already does that when the first refresh fails. Reconcile then corrects it. That flash already exists.

A create in the first seconds could run before PATH returns. The create path must await the same cached promise. If it does not, a pane gets the GUI PATH and the agent dies with exit 127. That is the one way this fix can break durability of a new session. Put the wait on create and restore only, and add a test that fires create during a delayed probe.

A persisted PATH can be a day old. A tool installed this morning would be missing until the refresh finishes. Same rule: create waits for the refresh if the persisted PATH cannot resolve the binary. List and attach do not wait.

`set-environment -g PATH` does not give a pane its PATH. The comments already measured that. The load-bearing write is `process.env.PATH` in this process. Do not delete that write. Just stop blocking list on it.

## Fix 2. Split the first JS parse

### What to change

`App.tsx` statically imports Editor, terminal, tree, SCM, search, context, every modal, Quick Open, and Symbols. `EditorPanel` statically imports `PierreDiff`. `theme-bridge.ts` registers a Shiki theme at import time and pulls `@pierre/diffs` and `@pierre/trees`. `QuickOpenPalette` is always mounted and pulls `file-icons.generated.ts`.

Keep the shell, title bar, activity bar, and the default Source Control view in the boot chunk. Load Pierre, Explorer, Search, Context, the closed modals, and the icon maps on first use. Keep xterm in the boot chunk if a live session will attach on the first frame. If the first paint is FirstRun (no projects), xterm can wait too.

Monaco stays behind `monaco-loader.ts`. Do not pull it forward.

### How to prove it

Report boot JS raw and gzip before and after. Isolated smoke mark "window created, renderer + preload loaded" must fall. A screenshot of the first frame must match. Opening a modified file must still open the Pierre diff. Opening Explorer must still show the tree.

### Attack

First file open will wait for a chunk. That is the right time to pay. The panel already has an opening skeleton.

First Cmd-P will wait for the palette chunk and the icon map. Today the palette is parsed even when it is closed. A hitch on first open of about 50 ms is better than 335 ms on every launch.

xterm in a later chunk would hitch the first attach. If a project with a live session is the common boot, keep xterm eager. Measure both.

Vite workers must stay single-chunk IIFEs because the renderer is `file://`. Do not break that while splitting the app graph.

This is not a reason to rewrite the store or to add a new state library.

## Fix 3. Git only the project that is on screen

### What to change

`Titlebar.tsx` calls `ensureStatus` for every open project so status is "ready the moment a tab is switched to". The same file says branch and dirty live in the sidebar header, never on the tab.

Remove the title-bar loop. Let Source Control load status for the active project. Warm the next project when the pointer is over that tab, or when the tab is selected.

Keep `--untracked-files=all` for the SCM view. The tree decorations need untracked files. Do not add `--ignored` to that call. That was already measured and rejected.

### How to prove it

Log `git.status` invocations for the first two seconds after hydrate. Before: one per open project. After: one (the active project). Switching tabs still shows branch and dirty without a visible empty state, or shows the existing skeleton for one status.

### Attack

The first tab switch will wait for git. On this repo that is about 0.12 s. The alternative is six waits at launch. Pay on switch.

A user who looks at the activity-bar dirty badge for a hidden project would see it later. That badge reads the same store. If the badge is considered visible functionality, warm only the projects that have a badge consumer, still not from the title bar at hydrate.

Do not start a watcher for a project nobody has looked at. Closing a project already stops its watcher. Opening six projects today starts six watchers at launch.

## Fix 4. Restore all as one wave

### What to change

In `sessions-slice.ts`, Restore all does `for (const t of targets) await restoreSession(t.id)`. Each call also focuses the restored session.

1. Reserve unique tmux names for the whole set first.
2. Restore with a concurrency limit of 4. Journal and identity stay per session.
3. Do not call `setActiveSession` until the set is done. Then focus the first restored row once.
4. Keep one toast per session, or replace that with one toast that names the count. The second is calmer. The first is today's copy. If copy must not change, keep one toast per session and still restore in parallel.

### How to prove it

A profile with N restorable rows. Time from click to last `idle`. Before: about N times one restore. After: about N/4 times one restore, plus the name reservation. No two rows share a tmux name. No foreign session is adopted. Armed resume is still unexecuted.

### Attack

Unbounded parallel `new-session` can stall the private server. Use a limit. Four is a starting point. Measure 8 and 4 on 20 rows.

Name reservation must use the same dedupe as `createSession`. If reservation is wrong, two restores can collide and one fails. That is the original reason for serial. The fix is reservation, not a queue of the whole restore.

Walking `setActiveSession` attaches a PTY for a pane the user is not looking at, then tears it down. That is extra work and extra flicker. Focusing once at the end is the same end state.

A restore with `envPassthrough` still needs a login-shell env probe. This profile has none. If a later row has names, share one probe across the wave. Do not spawn 23 login shells.

## Fix 5. Agent version scan on demand

### What to change

`useSettingsStore.init` runs on every main-window mount. It calls `settingsGet`, `agentFlagPresets`, `agentsList`, and `config.rows`. `agentsList` is the twelve-agent detection scan. Core also calls `listDetectedAgents()` at the end of boot, unawaited.

Keep the core warm if you want Create to have a version on the first click. Drop the renderer call at init. Load the scan when Settings opens, or when the Create Session modal opens, or when the home AgentGrid mounts.

`settingsGet` is already called from `initAppearance`. Do not fetch it twice.

### How to prove it

Log `agents:list` and `versionProbeCount()` for the first five seconds. After the change, a boot into an existing project must not start a version probe until Create or Settings. The Create modal must still show which agents are installed.

### Attack

The home screen AgentGrid needs the scan. A first-run user opens that screen. Loading there is correct.

A create that uses `peekDetectedAgents()` must not start a probe. That rule is already tested by `conformance:agents`. Keep it. This fix only stops the extra renderer call at init.

A 10 s Gemini probe that starts at boot steals CPU from the first attach. Moving it to Settings does not change the Settings row. It changes when the CPU is spent.

## Rejected ideas

| Idea | Verdict | Why |
|---|---|---|
| Drop `-i` from the PATH probe | Reject | Faster. Can lose nvm and rbenv. Correctness bug |
| Rewrite in Tauri or Swift | Reject | Wrong audit. Durability already lives outside the window |
| Attach every session at boot | Reject | Hidden sessions have no PTY on purpose. That is the scale lever |
| Lazy Monaco is unfinished | Reject | Monaco is already lazy. First File tab loads 26 MB. Leave it |
| Cut the activity poll | Reject | Hidden sessions would freeze on "working". Phase 13 exists because of that |
| `--untracked-files=no` for SCM | Reject | Untracked files would vanish from Changes |
| Walk the whole tree at project open | Reject | The tree is already lazy per directory |
| Move sessions into the app process | Reject | Breaks the core promise |
| Await proveNativeModules still, but later | Small yes | 91 ms typical. Move it off `createWindow` as part of fix 2's main-side companion. Do not spend a phase on it alone |
| Delay Quick Open warm until Cmd-P | Later | First keystroke was measured at 322 to 384 ms without prewarm. That is a visible hitch. Not in the five |

## What is not true

- The 416 renderer JS files are not all parsed at start.
- Boot does not restore dead sessions and does not arm resume.
- The title bar does not show git, even though it fetches git.
- `set-environment -g PATH` is not what a pane uses for PATH.
- P6's 1.5 s cold start is not measured in CI.
- This audit did not drive the packaged UI with screenshots.
- This audit did not time Restore all on 23 live rows. The serial loop is in the source. The per-restore cost is the comment "hundreds of milliseconds in tmux" plus 7 to 10 tmux processes.
- The isolated smoke used the live `-L gmux` socket. It did not kill the server.

## What must stay

- Private tmux on `-L gmux`.
- Identity by `@gmux-id` and `GMUX_SESSION_ID`. Never adopt a stranger.
- Manifest declaration before spawn.
- Resume armed, never auto-fired.
- Visible-only attach PTYs and WebGL.
- One typed preload bridge.
- No third-party code in any Tortie process.
- The 16 August lifecycle repairs (suspend generation, quit singleton, awaited worker dispose).

## How a later phase should measure

Add four log lines, nothing in the UI:

1. `boot.window_shown` (ready-to-show)
2. `boot.sessions_listed` (hydrate list returned)
3. `boot.path_ready` (login-shell probe settled)
4. `boot.first_attach` (first `sessions:attach` returned)

A phase that claims a speed win prints those four numbers on five packaged launches against the same profile, before and after. No adjectives.

## Companion to the 16 August audit

| 16 August item | This audit |
|---|---|
| Suspend never takes a manifest generation | Still open. Correctness. Do it first if a sleep can lose a generation |
| Quit clears the core singleton early | Still open. Can start a second core. Correctness |
| Worker dispose not awaited | Still open. Quit crash risk |
| Broad file splits | Do not combine with these five. Speed first, then seams |

A phase that lands fix 1 should not also split `core.ts`. A phase that lands fix 2 should not also redesign the shell.
