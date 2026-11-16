# Phase 368 — "the fix to issue 44" — SPEC

Written by the spec step on 2026-11-16 in `/private/var/tmp/tortie-wt/wt-p368`, a detached worktree at origin/main
`8497c34c` ("docs(backlog): 368 starts ahead of 360 and 325.1"; Phases 359 and 364 landed since the entry was read at
`8645875e`). **`git diff 8497c34c` in the worktree must be exactly Phase 368's delta**, this file included. origin/main
moves while the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The
charter is `docs/BACKLOG.md` "## Phase 368" (`:45297`), research 145 (`docs/research/145-issue-44-redraw-copy-and-links.md`,
§1, §6, §7 and §10 bind; §3 to §5 hold the measurements; §12 the evidence), GitHub issue 44 and the reporter's comment of
2026-11-10 as research 145 quotes them, bound by research 134 and 133 (Claude Code and Codex stay inline, Phase 331),
research 142 §2.3 and §2.4, research 115 §4 and Phase 337's measured width table, except where §0.1 says the tree or a
measurement wins. **His word of 2026-11-16: this phase goes FIRST, ahead of Phases 360 and 325.1** (the entry's "starts
after 360 and 325.1" is superseded); their uncommitted deltas in `wt-p360` and `wt-p3251` are rebuilt on top of this
phase after it lands. His word of 2026-11-14: "you can run real harnesses / claude code and codex to test the fix to
issue 44". His standing rulings bind: **no regression against today** (a scenario worse than the parent is a defect: fix
it or drop the part, and name which); Tortie never ends a session on its own; just enough words; no tmux vocabulary in
anything a person reads; nothing released, tagged, version-bumped, archived or uploaded; refusal 1 (no third-party code
Tortie did not choose: this phase adds none, and its one extract is an attributed MIT copy of code already in the bundle,
§4.5); his session count is allowed (`build/electron-run.mjs`'s read-only census).

| | |
| --- | --- |
| Subject | `fix(terminal): draw agent replies cleanly, copy what is drawn and open agent links` (the entry's) |
| First body line | `Phase 368: issue 44, clean redraws, faithful copies and links that open` (the entry's) |
| Semver | Minor: a link an agent prints becomes something a person can click. Three CHANGELOG items under `## Unreleased` (§5); the follow-up docs commit adds each commit link |
| Lane | Build: Spec → Build (SEVEN builders, disjoint files, §9) → Integrate → Verify (two lenses, §10) → [Fix once → Reverify] → Commit |
| Tier | **3**, for all four of the entry's reasons: it changes how every session is created and attached (tmux and the session lifecycle, `CLAUDE.md:270`); it claims to serve every agent (`:271`), so the evidence is a per-agent matrix over real data; the operator relayed a person's report (`:272`), so the parent measurement is mandatory (§2 is the spec step's; each lens takes its own); it hands addresses an agent printed to the person's browser (`:273`) |
| Menus | **No row added, renamed or removed.** The hover is not a menu, and Copy keeps its rows. The commit body says so |
| Contract | **`gate:contract` reads byte for byte** (§0.1 item 3): the baseline lists invoke channel names, not request shapes, and this phase adds no channel and no `GMUX_*` name |
| `HELPER_USER_FLOOR` | **189 → 190**: `build/p368/probe-p368.mjs` reaches `build/electron-run.mjs` (obligation 1) |
| New gate | `conformance:terminal` (`build/conformance-terminal.mjs`), its ablations inside it (§7.1); its CLAUDE.md row (§4.7) |
| New probe | `probe:p368` (§8); its CLAUDE.md row (§4.7) |
| CHANGELOG | Three items (§5): the redraw, the copy and the links, with no commit link |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- **THIS IS A BUILD.** Builders write and test code; verifiers verify code that exists and refuse a build that holds none.
  The operator may ask the main session unrelated questions while a role runs; those are answered there.
- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p368/<role>/`, never under `/private/tmp`; a probe's `TMPDIR` points there too,
  and for `npm test` it is spelled through `/var/tmp/…`. **Not yours**: `wt-p360*`, `wt-p3251*` (his waiting work,
  uncommitted), `wt-p369*`, `wt-docs`, and the scratch folders `p360`, `p3251`, `p369`, `p364`, `rounds`, `owed-*` and
  `release-0114`. Research 145's folder `/private/var/tmp/tortie-wt/scratch/r145` is READ ONLY: copy what you need.
- **THE PARENT** is `/private/var/tmp/tortie-wt/wt-p368-parent` (`8497c34c`, the same `node_modules`), built once by the
  spec step (`npm run build`, exit 0, 60 s, `gate:electron` 189 of 189). Never edit, install or rebuild anything in it:
  run its harness lines directly, never an npm script that begins with `npm run build` (`smoke:quit`,
  `smoke:quitdoors`, `probe:p167`, `probe:p209`). **`probe:p292` writes its readings into the checkout's `out/p292/`**:
  after a parent run, move that folder into your scratch so the parent's `out/` holds only its build (the spec step did).
- **INSTALL NOTHING**: no `npm install` or update, no new dependency (the entry refuses a Unicode addon and any new
  dependency), no brew, nothing global, nothing under his home. `build/build-tmux-version.mjs` may build a far tmux it
  pins by hash (3.5a, 3.6, 3.6b, 3.7c today; it writes only under `build/vendor/tmux-probe/`, which is ignored); say what
  it fetched. A version the pin file lacks (3.2a, 3.3a, 3.4) is read from source on GitHub, never built.
- **REAL AGENTS**, his word of 2026-11-14: real Claude Code (`/Users/gdc/.local/bin/claude`) and real Codex
  (`/Users/gdc/.local/bin/codex`) only, each version read once with `--version` and reported; every other agent is judged
  from its committed recordings (`build/fixtures/**`) and research 145's, never run. Each runs as the pane's own command in
  a scratch tmux server (`build/vendor/tmux` or Homebrew's 3.6a, each with a copy of `resources/gmux-tmux.conf`), on a
  socket under your scratch (`-S <path>`), never `-L gmux` and never his default server, in a scratch project folder, with
  `HOME=/Users/gdc` for the agent process ONLY and every other process on a scratch HOME, never through an interactive
  shell. Prompts ask for long Markdown replies (headings, numbered steps, emoji, code blocks, long shell commands and
  prose that wraps, links, a link whose words differ from its target) and forbid tools: Claude with `--safe-mode --tools
  ""` (research 145 §12.4), Codex with `-s read-only -a never` and `-c check_for_update_on_startup=false`; read each
  CLI's own `--help` and say which you used; answer Claude's folder question for the scratch folder. **At most 12 real
  turns per role**, counted and reported. NEVER read `~/.claude`, `~/.codex` or any conversation store. A real agent needs
  his HOME, which the app must not have, so its bytes reach the app by RECORD and REPLAY (§8); its create and attach code
  is exercised without the app by driving the shipping modules through the pinned tsx against the scratch server.
- **A CLICK NEVER REACHES HIS BROWSER.** Every app run that clicks or activates a link first replaces `shell.openExternal`
  in MAIN with a recorder through main's inspector (`--inspect=0`; §8 shows how) and grades by that recorder. Stubbing
  `window.open` in the page alone would skip main's gate, which is the decision under test. A browser window or tab
  opening is a defect reported at once.
- **A COPY NEVER TOUCHES HIS PASTEBOARD** in `probe:p368`: main's `capture:writeRich` handler is replaced through the same
  inspector with a recorder that does not call the original. (`probe:p209` keeps its own save-and-restore.)
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Never `pkill`, `killall`,
  a `pgrep` pattern or a negative pid; end only pids you started, each read again by `ps -p <pid> -o command=` right
  before its signal; every process you start ends in a `finally`; never signal a probe while its own teardown runs. **His
  Tortie (a bare `Tortie` process, pid 94808 today) has the same bundle id as every build you run**: never an Apple
  Event, `osascript` or `open`; a quit is pressed through the native Quit row in main (`item.click()`), `app.emit` or the
  harness.
- Never open, copy, read or stat-for-content his live Tortie profile, his keychain, credentials, `~/.ssh`, `~/Keys`,
  `~/.claude`, `~/.codex` or any agent's or conversation store. **His crash reports**: count
  `~/Library/Logs/DiagnosticReports` by NAME and mtime only, before and after every run that can crash, name what your run
  added, never open one (45 entries at the spec step's start and end).
- **His shell history is never written by us.** Every command that does not launch an Electron, a real agent or need
  `/bin/ps` or `lsof` runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. **In the block,
  `npm test` fails twelve tests by environment, not four** (§2.7): the four `/bin/ps` tests (`process-table.native` ×1,
  `ps.native` ×2, `p269-env-names` ×1) and eight FSEvents native tests (`store-watch.native` ×1, `p365-process.native` ×3,
  `repo-watcher.native` ×4); name each as it fails. What needs Electron, `/bin/ps`, `lsof` or a real agent runs outside
  it under `zsh -f` with `HOME` and `ZDOTDIR` in scratch (a real agent's own process excepted, as above),
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, and `TERM_SESSION_ID`, `TERM_PROGRAM*`, `GH_TOKEN`, `GITHUB_TOKEN`,
  `SSH_AUTH_SOCK`, `TMUX`, `TMUX_PANE` unset; say so. Record ONLY `stat -f '%z %m' ~/.zsh_history ~/.bash_history`
  before and after every run (`746321 1794670684` and `23166 1790702242` at every reading of the spec step). A move across
  an unblocked run: start nothing for 3 minutes and stat again; moved again while nothing of yours ran is his; still moved
  means STOP and report.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, HOME and
  socket (the two quit smokes through `build/quit-smoke.mjs`). `smoke`, `smoke:t1`, `smoke:t3` and the full
  `conformance:resume` and `conformance:resume:capture` start Electron outside the helper: they are the MAIN SESSION's
  alone, at landing. `smoke:quit` and `smoke:quitdoors` may be run, each under a lock slot. **Pass
  `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling` to
  any app run that drives a layout change** (§0.1 item 6). No Simulator (nothing on the phone moves). No real Tailscale,
  DNS or APNs; ssh only to the loopback machine of `build/scratch-machine.mjs` (`scratchYard` and `scratchMachine`, the
  quiet shell, the scratch far home; never `build/with-scratch-machine.mjs`); never `smoke:remote` or `smoke:machines`.
  Never import a `build/` script to inspect it; read it as text (importing `withElectron` and `build/hidden-agents.mjs`
  to USE them is how a probe launches). Every agent row a run needs other than real Claude Code and Codex is a stand-in,
  and every run hides the probed rows it does not need (`writeHiddenAgents(profile, prefix,
  hiddenAgentsBesides([...]))`, then `standInsOnlyVerdict` over `agents:list` before any step).
- **The lock has three slots, shared**: `zsh /private/var/tmp/tortie-ops/lock.sh try p368-<role>` prints the slot or
  exits 1 (retry every 60 s in a NEW command); release it from a trap, ONCE, and only while the slot's `owner` file is
  still yours (`lock.sh release` checks nothing). Every probe, smoke, package or Electron run holds one, no longer than the
  run. `df -h /` before any build or clone; under 8 GB free, wait and report (81 GB free at the spec step).
- **PACKAGING IS UNSIGNED, ALWAYS** (only the integrator packages): `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*`,
  `APPLE_*`, `GH_TOKEN` and `GITHUB_TOKEN` unset, `npm run package -- -c.mac.identity=null` with `HOME` a scratch home
  holding a `cp -Rc` of `/private/var/tmp/tortie-ops/pkg-home-43.8.7/Library/Caches/electron` (read it, never write it)
  and `ELECTRON_BUILDER_CACHE=/Users/gdc/Library/Caches/electron-builder` (read only). A package log naming
  `identityName=Developer ID` is a defect reported at once; `release/` is removed after.
- **Reads off the machine**: tmux's and xterm's sources and release notes on GitHub, unauthenticated (`curl` or WebFetch,
  read only, post nothing); never `gh`.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

1. **The tree moved under the entry's line numbers** (read at `8645875e`; Phases 364 and 359 landed since). At `8497c34c`:
   - `src/main/sessions/core.ts`: `attachSession` `:3917-3921`; the LOCAL attach `:3975-3982` (the entry's `:3974-3979`).
     **The entry missed two more attaches with no size**: `attachListedRemote` `:3990-4016` (its `attachHost.attach` at
     `:4010-4015`) and `attachFarUnbound` `:4034-4059`, which ends in `attachListedRemote`. All three spawn at 80 by 24.
     `lastGeometry` `:905`; `detachSession` deletes it `:4077`; `resizeSession` `:4093-4100`; `createSession` `:3472-3474`;
     `restoreSession` `:1983-1993`, its local arm `restoreSessionInTmux` at `:2085` and its remote arm
     `restoreRemoteSession` at `:2029`; `listSessions` `:3306`.
   - `src/main/attach/attach-host.ts`: `DEFAULT_COLS`/`DEFAULT_ROWS` `:114-115` (the entry's `:107-108`); `AttachRequest`'s
     `cols`/`rows` `:207-208` (`:199-201`); the spawn's size `:272-273` (`:263-266`); `resize` `:498-506`; the sanitizers
     `:588-605`.
   - Unchanged: `src/shared/ipc/base.ts:48` and `:143`, `src/preload/sessions.ts:21`, `src/main/ipc.ts:135-136`, every
     `TerminalPane.tsx` line the entry names (`:254`, `:371-374`, `:468-472`, `:523-525`, `:589-597`),
     `src/main/tmux/sessions.ts:186`, `src/main/sessions/create-local.ts:709`, `src/main/restore/restore.ts:1113`,
     `src/main/tmux/scroll.ts:368` and `:459-465`, `capture/index.ts:184-209`, `:260-297`, `:722`,
     `capture/history-copy.ts:107`, `:127-146`, `:182-215`, `capture/history-selection.ts:73-79`,
     `capture/serialize.ts:318`, `src/main/attach/attach-plan.ts:156-186` (local argv `:158-171`, far call `:177`),
     `src/main/security/trusted-window.ts:60-65`, `:135-137`, `src/renderer/editor/markdown/markdown-impl.tsx:244-258`.
   - `src/renderer/terminal/scroll/drag-select.ts:380` is `holdHistorySelection` inside `hold()`. The releases item 7
     changes are `onSelectionChange` `:231-234` (xterm changed the selection), the begin `:252`, the teardown `:278` and
     `stop()` `:425` (a drag that never took over).
2. **The entry missed creates and copy paths.**
   - The remote create has two composition sites, `remoteCreateArgs` (`src/main/machines/remote-sessions.ts:881-960`)
     called by `remoteCreate` `:1894` (from `create-local.ts:239`) and by `restoreRemoteSession`
     (`src/main/machines/remote-restore.ts:545`). Harness creates (`src/main/harness/**`, `migrate/smoke.ts:311`) pass no
     size and keep today's.
   - **A fourth copy path.** The Edit menu's `role:'copy'` (`src/main/menu.ts:828`) chosen with the mouse fires a DOM
     `copy` event on the focused terminal, which xterm answers itself with its own unbounded `selectionText`
     (`node_modules/@xterm/xterm/src/browser/CoreBrowserTerminal.ts:334-341`, `Clipboard.ts:32-38`). ⌘C never reaches it
     (`keys/index.ts:160-169` prevents the default).
   - The third terminal (`capture/index.ts:722`) is `rasterizeRows`, shared by Capture Last N Lines and a history
     selection's capture.
   - Links are read from cells in three places today: `WebLinksAddon` (`TerminalPane.tsx:370-376`), `PathLinkProvider`
     (`:387-410`, reading xterm's own cell widths through `cellColumns`, `src/shared/path-spans.ts:665-679`, so it follows
     whatever widths xterm uses), and xterm's built-in OSC 8 provider, which registers nothing today because no link
     reaches the terminal. The phone draws a link's words only (`src/main/screen/sgr.ts:242-257`); unchanged.
3. **The contract baseline does not move.** `docs/audits/contract-baseline.txt` lists invoke channel NAMES
   (`[ipc.invoke.channels] count=250`, `sessions:attach` at `:208`), not request shapes
   (`build/contract-inventory.mjs` reads the names off `GmuxInvokeChannelMap`). `sessions:attach` gaining an argument, a
   create or restore gaining a size and a session row gaining a field move no line. It would move only for a new channel
   or a new `GMUX_*` name, and this spec adds neither: `probe:p368` uses the existing `GMUX_TMUX_SOCKET`,
   `GMUX_HARNESS_DIR`, `GMUX_PROBES`, `GMUX_TMUX_BIN`, `GMUX_CONFIG_ROOT` and `GMUX_SPECSTORY_NO_CLOUD`, its own knobs are
   `P368_*`, and main is driven through its inspector rather than a harness knob. The commit body says the baseline did
   not move and why (the entry's "names the moved line" is corrected).
4. **`term.unicode` is a proposed API**: it throws unless the terminal was made with `allowProposedApi: true`
   (`node_modules/@xterm/xterm/src/browser/public/Terminal.ts:91-92`). The pane's terminal (`TerminalPane.tsx:254-275`)
   does not set it today; the two capture terminals do (`history-copy.ts:107-112`, `capture/index.ts:722-735`). The
   provider interface is `{ version, wcwidth(cp), charProperties(cp, preceding) }`
   (`typings/xterm.d.ts:1871-1902`), where a property is `(state << 3) | (width << 1) | shouldJoin`
   (`UnicodeService.ts:20-31`), and xterm's `print` widens a joined cell (`InputHandler.ts:544-621`), so tmux's seven
   joining rules (`src/main/screen/cells.ts:12-21`) fit it.
5. **Research 145's "project switch" arm never left the project.** `__gmuxP95.select` calls `setActiveSession`, which sets
   the active session of the ACTIVE project only (`src/renderer/state/sessions-slice.ts:989-998`). A real project switch
   is the menu's `next-project` / `prev-project`. Measured now (§2.1): 4 of 4 real project returns sent the pane no size.
6. **An app window behind his other windows runs no `requestAnimationFrame`**, so the ResizeObserver's fit
   (`TerminalPane.tsx:523-525`) never runs and a layout step sends nothing. The spec step's second census run read 0 sizes
   for the sidebar, the orientation and a 50-step window drag; with the three flags of §0 the same steps read one size
   each and 50. Zoom (which calls `fit()` directly) and full screen (which makes the window visible) read the same
   either way.
7. **Arm (c)'s "HEAD sends no size" is corrected.** Research 145's 8 ms and 60 ms transients were the window's viewport
   made 5 rows shorter, which is the window class the entry leaves as today ("a person's own window drag is left as
   today"). The census (§2.1) finds **no Tortie surface that makes a transient on its own** besides the late attach and
   the 80 by 24 create. So at HEAD a viewport or a layout bar held 8 or 60 ms still sends the parent's two sizes (graded
   equal to the parent), and arm (c) grades instead that HEAD sends no size at a return, a new session or a restore. A
   layout settle is §14 Q12, not built.
8. **Item 7's guard is not adopted** (§2.6): honouring a wrap mark only where the marked row has ink in its last column is
   worse than `-J` on a real wrap at a written space (G6; research 142 counted 777 of 2,113 marked rows ending in a space)
   and on a wide character pushed off the edge (G7). `capture-pane -T` cannot tell a cleared cell from a written space,
   and 3.6a has no `-F` at all.
9. **`-T` arrived in tmux 3.2 and `hyperlinks` in 3.4** (§2.5): 3.1c's getopt has no `T` and an unknown flag exits 1
   through `usage()`; 3.2a and 3.3a accept `-T hyperlinks` and ignore the unknown name; from 3.4 `hyperlinks` is index 4
   of the feature table in 3.4, 3.5a, 3.6a and 3.7b (3.7b adds `progressbar` later in the table). The client sends the
   features as a bitmask by that index, so a 3.4+ program speaking to a 3.2a/3.3a server would set that server's index 4,
   which is `cstyle`. So the far flag needs BOTH the far program and the far server at 3.4 or later.
10. **The widths are a build's, not only a version's** (§2.4). The vendored 3.7b links utf8proc 2.10.0 statically;
    Homebrew's 3.6a links `/opt/homebrew/opt/utf8proc/lib/libutf8proc.3.dylib` (2.11.3 today), so its widths follow
    whatever utf8proc brew installs. The committed `build/fixtures/screen/tmux-widths.json` already holds both builds
    (925 and 937 ranges, measured 2026-10-05); `measure:p337 --check` re-measured both equal today.
11. **The quit smokes run short at the parent** (§2.7): `smoke:quit` 5 s (held, then the teardown leg's real quit exit 0
    after 1,842 ms) and `smoke:quitdoors` 2 s (9 of 9). Their lens rows compare per leg, not by the whole wall.
12. **`probe:p209` arm D fails at the parent** in the spec step's run ("copied 10 lines for a drag over 7, so the anchor
    moved", exit 1, 61 s). It is a baseline, not this phase's: a lens runs it at both builds in one session and grades
    HEAD against the parent's arm by arm.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | Attach at the fitted size | `sessions:attach` carries the pane's fitted columns and rows; all three attach branches spawn at it; a pane with no size waits up to 500 ms for its first fit, then takes the window's last fitted size, then main's; never 80 by 24 when a size is known |
| 2 | Create at the shown size | `new-session` gains `-x`/`-y` on this Mac and on another machine, on create and on restore, from the request's size or main's last fitted size; none known keeps today's |
| 3 | No size Tortie does not need | The census (§2.1): Tortie's only own sizes are the late attach and the 80 by 24 create, both removed by 1 and 2; a bundled font's first mount fits after the face loads; deliberate changes and the window drag stay as today |
| 4 | tmux's widths | The measured tables (3.7b and Homebrew's 3.6a) and the seven joining rules move to `src/shared/`; one provider through xterm's own interface on all three terminals, chosen by this Mac's server version; another machine's sessions keep today's widths (§14 Q11) |
| 5 | Scrollback between frames | Entering the scrollback while `#{synchronized_output_flag}` reads 1 re-freezes the view in place once the frame closes (bounded by tmux's own 1 s sync timer), this Mac's server alone |
| 6 | Copy holds what is drawn | Every copied row read within the terminal's columns, every copied line ending at its last non-blank cell: Copy, ⌘C, the menu's snapshot, Copy as HTML, the Edit menu's Copy and the history path |
| 7 | A scrolled-back copy joins what tmux joins | **Taken back out by the fix round** (§As built): held as history positions, a selection that never scrolled was composed through `-J`, which glued rows a program redrew apart under a stale wrap mark (4 lines where the screen draws 11, the parent 11), and the ink guard still glues G2, so a selection that never scrolled is xterm's own again; only a drag that scrolled is held, as before the phase |
| 8 | No join of an agent's own breaks | No new join rule anywhere |
| 9 | Links reach the terminal | `-T hyperlinks` on the local attach; on another machine only when its program and server are both 3.4 or later |
| 10 | A click opens what it says | A `linkHandler`: a path the pane offers on the clicked cell opens through the path provider's own link, as before (the fix round, rule 0); the words' address when today's reading finds one (question 4's default), the whole target for a URL the agent cut only when the rows spell it exactly (the fix round), the target otherwise (http and https only, no user part, at most 2,048 bytes); a hover line shows a web address with an ASCII host; one route per kind, `window.open` for a web address so main decides |
| 11 | Never `FORCE_HYPERLINK` | Pinned by the gate |
| 12 | A gate pins it | `conformance:terminal`, nine rules, an ablation each |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | The size travels as `TerminalSize { cols, rows }` (new `src/shared/terminal-size.ts`), validated in main by `sanitizeTerminalSize` against the attach host's own bounds (columns 2 to 1,000, rows 1 to 500, `attach-host.ts:588-605`); anything else is no size | The entry's item 1; one validator for attach, create and restore |
| D2 | **Where main learns the size for a create and a restore: the request's size first, then main's last fitted size** (`GmuxCore.lastFittedSize`, set by every `resizeSession` and every attach that carried a size), then none (no `-x`/`-y`, today's 80 by 24). The renderer's request carries the active visible pane's own fitted size when exactly one pane is on screen in the active project, else the window's last fitted size (`src/renderer/terminal/tab-size.ts`), else none. A split's create carries the same tab size | The entry's item 2 leaves the choice to the spec. The renderer knows the tab it will draw in; main's fallback covers a request with no size (an older renderer, a restart, a harness). A split's new leaf is half a tab, which the renderer cannot know before layout; its attach then fits it, one size, as today's 80 by 24 start does |
| D3 | `-x`/`-y` go right after `-s <name>` on both `new-session` lines, this Mac's (`tmux/sessions.ts:186`) and another machine's (`remoteCreateArgs`) | `new-session -d -x W -y H` sizes the window and sets the session's `default-size` (`cmd-new-session.c:216-279`, 3.7b; every far version from 3.2a has both flags) |
| D4 | The first fit waits at most **500 ms** (`FIRST_FIT_WAIT_MS`) for a container that has no size, then takes the window's last fitted size, then lets main decide. **Amended by the fix round**: the terminal is put at that size before the attach (`settleForAttach`), and the attach names the terminal's own size, never one it is not at; with nothing known that is its own 80 by 24, as before the phase | The entry's "bounded"; the census never met a pane with no size; an occluded window delivers no ResizeObserver callback (§0.1 item 6), so the bound is what ends the wait there. The attack lens met one: a pane mounted under Catch Me Up or the editor's fill, attached at the window's size beside xterm's 80 by 24, 34 of 39 rows garbled |
| D5 | **No layout settle.** A deliberate layout change (sidebar, orientation, focus mode, zoom, full screen) keeps today's one size; the window drag keeps today's size per frame | The census (§2.1): each deliberate change sends exactly one size and no surface makes a transient on its own; a settle would delay every deliberate change by its window. Q10 and Q12 |
| D6 | The bundled-font first mount waits for the face before its first fit (`loadWorkAreaFace`, bounded by `FIRST_FIT_WAIT_MS`) | Item 3's "removed where it starts": with JetBrains Mono or Source Code Pro the first mount of a launch fits with the fallback's cell and the font effect re-fits after the face loads (`TerminalPane.tsx:723-759`), a second size right after the attach. Not driven by the spec step; Lens A measures it at both builds |
| D7 | **The widths are chosen by THIS MAC's server version** (`'3.7b'` → the vendored table, `'3.6a'` → Homebrew's table) and carried on each local `Session` row as `cellWidths`; a session on another machine carries none and keeps today's widths | §0.1 item 10: a table is a build's; this Mac's two builds are measured; another machine's build is not, so "no code point worse than today" can be promised only there. Q11 |
| D8 | ONE spelling of the seven joining rules: `nextCell` in `src/shared/cells.ts`, which `clusterCells` (the phone) and the provider's `charProperties` (the Mac) both call | The entry: "one table for main and renderer"; the gate holds one declaration |
| D9 | The phone's composer keeps the 3.7b table byte for byte | The entry: "Nothing on the phone" |
| D10 | Item 5's re-freeze waits for the flag to read 0, polling every 50 ms for at most **1,100 ms** (tmux 3.7b's own sync timer is 1 s, `screen-write.c:978-989`), then re-freezes only if the pane is still in copy mode and Phase 294's guard holds (`frameHistory` known, not the alternate screen, below the trim band) | The entry's item 5; Phase 294's guard reused as written |
| D11 | Copy's bound is ONE function, `drawnSelectionText` (`capture/drawn-text.ts`): rows within `term.cols`; trailing U+0020 removed at the end of each LINE only, never at the end of a row the next row continues | A wrapped row is full to the last column, so a space there is real (G6); trimming it would glue words |
| D12 | The Edit menu's Copy is routed to `copySelection` by a capture-phase `copy` listener on the pane's mount | §0.1 item 2; the same text as ⌘C |
| D13 | Item 7's held range uses today's history path (`-J`), unchanged; the guard is not adopted. **Superseded by the fix round**: item 7 is taken back out, and a selection that never scrolled is xterm's own | §2.6; the fix round's measurement |
| D14 | Links: the WebLinksAddon stays as it is; the `linkHandler` handles xterm's OSC 8 links. On a click it opens **W, the address today's web-links reading finds on the clicked cells, when there is one (no new refusal: today it opens)**, except when the target T is W continued on the next row (a URL the agent cut), where it opens T; with no W it opens T if T is http or https, has no user part and is at most 2,048 bytes of UTF-8; anything else opens nothing. **Amended by the fix round**: (0) when no address of the reading holds the pointer's cell, a path the pane's path provider offers on that cell opens through the provider's own link; (3) a cut is T equal to W, W reaching its row's last cell, followed by the rows after it spelling the rest exactly (each row's first word a piece, a middle piece filling its row, the last a whole word or one less closing punctuation), never a prefix of eight characters; and a later row of a cut-looking link whose rows do not spell T opens nothing | The entry's item 10 and question 4's default (open the words); no link that works today stops working. The fix round: a file an agent linked to a web page opened the web page where the parent opened the file, and eight matching characters sent a click to a host the screen did not show |
| D15 | The web-links reading is an attributed MIT extract of `@xterm/addon-web-links` 0.12.0's `strictUrlRegex` (`src/WebLinksAddon.ts:21`) and `LinkComputer` (`src/WebLinkProvider.ts:58-199`) | "Assemble, never reimplement"; it must find exactly what today's addon finds |
| D16 | The hover line shows `new URL(address).href` (the host as `xn--` ASCII, every non-ASCII and bidi character percent-encoded), inside `term.element` with the `xterm-hover` class, removed on leave; a refused address shows none | The entry; xterm's own instruction for a hover (`xterm.d.ts:1362-1371`) |
| D17 | xterm still underlines an http or https OSC link it offers; a refused target shows no hover line and its click opens nothing | xterm offers the link before the handler is asked (`OscLinkProvider.ts:72-82`); the handler cannot veto the underline |
| D18 | The far flag: `-T hyperlinks` when `farPairOf(machineId)` (its server current, `far-tmux.ts:200-205`) names a server AND a program both in `HYPERLINK_FAR_VERSIONS = ['3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']`; anything unknown or older keeps today's argv | §0.1 item 9; the program parses `-T` and the server reads the bitmask |
| D19 | No new `GMUX_*` name; the probe drives main through its inspector | §0.1 item 3 |
| D20 | `probe:p368` replays redacted recordings committed under `build/fixtures/p368/` (≤ 600 KB in all) | A probe the main session can run after research 145's scratch is gone; the banner names his plan tier and a path (`r145/redraw/runs/c1-claude-inline-120x30/screen-0.txt:2-3`), which is redacted |

## 2. What the spec step measured, how, and the numbers

Every reading below is in `/private/var/tmp/tortie-wt/scratch/p368/spec/` (`runs/`, `logs/`, `bin/`). The instruments
are kept: read them, copy what you need, do not import them. No real turn was spent (0 of 6): research 145's recordings
held every shape the design needs.

### 2.1 Measurement 1: the census at the parent (`runs/census-parent-38654/report.json`)

ONE Electron of the parent (`bin/census.mjs`, 217 s, exit 0) through `withElectron` inside `harness-socket.mjs`, scratch
profile, HOME and `TMUX_TMPDIR`, the three flags of §0, the `claude` row a stand-in that only watches its own size
(`bin/winch-standin.mjs`: start, every SIGWINCH, a 1 ms ioctl poll), every other probed row hidden and `agents:list`
read back ("nothing resolved in the app's own scan but the stand-ins claude"). Counted at the SERVER by
`client-resized`, `client-attached` and `client-detached` hooks on the scratch server (perl-stamped), and at the PANE by
the stand-in. Main was driven through its inspector (menu actions, window sizes, full screen). Window 1300 by 820; the
pane 124 by 39; tmux 3.7b.

| Step (each settled 1.8 to 3.5 s) | Sizes at the server for the pane's client | What the pane's program saw |
| --- | --- | --- |
| New session (claude stand-in) | attached, 124x39 at +95 ms | **80x24 at start (+76 ms), then 124x39 (+83 ms)** |
| Tab away and back, 8 times (150 ms to 2 s away) | each return: attached and 124x39 within 0 to 3 ms | nothing, 8 of 8 |
| Project away and back, 4 times (`next-project`/`prev-project`) | each return: attached and 124x39 | nothing, 4 of 4 |
| Sidebar off, on | 162x39; 124x39 | one size each |
| Editor toggle with no file | none (no panel opens) | nothing |
| Sessions on the right, then on top | 97x39; 124x39 | one size each |
| New Session sheet, the ⌘J list, Shortcuts: open and close | none | nothing |
| Catch Me Up open and close | none (the work area is `display: none`, so the fit proposes nothing) | nothing |
| Session focus on, off | 169x41; 124x39 | one size each |
| Zoom in, out | 109x36; 124x39 | one size each |
| Window drag: 25 `setSize` steps 16 ms apart out and 25 back | **50 sizes**, one per frame | **5** (+19, +270, +521, +772, +1023 ms: tmux's 250 ms timer) |
| Viewport 5 rows shorter for 8 ms, for 60 ms | 124x34 then 124x39, each | 124x34 at once, 124x39 about 250 ms later, each |
| A 90 px bar in the work area for 8 ms, for 60 ms | 124x34 then 124x39, each | the same |
| Another session ended under the visible one | none | nothing |
| Split (Split Session through the native menu) | not driven: the popup intercept did not produce a split in this run | the verifier drives it (§10.1 A3) |
| Restored session (its tmux session killed, `sessions.restore`) | attached, 124x39 | **80x24 at start, 124x39 about 100 ms later** |
| Full screen on, off | 152x45; 124x39 | one size each |

### 2.2 Measurement 2: the attach with the push held back (the same run)

Main's `sessions:resize` invoke handler wrapped with a 15 ms and a 30 ms delay through the inspector
(`ipcMain._invokeHandlers`), four returns each. **15 ms: 1 of 4 returns lost the race** (the program saw 80x24 at +28 ms
and the fitted 124x39 at +279 ms). **30 ms: 4 of 4 lost** (80x24 for 243 to 252 ms each). A new session and a restored
session start at 80x24 whatever the push does (§2.1 rows 1 and 16), because the window is made at tmux's `default-size`.

### 2.3 Earlier passes, disclosed

Two earlier census runs (`census-parent-64987`, `census-parent-2606`) are not evidence: the first never left the first
project (§0.1 item 5) and both ran with the window occluded (§0.1 item 6). Their tab-return and held-push rows agree
with §2.1 and §2.2 (8 of 8 returns clean; 30 ms 4 of 4 lost; 15 ms 3 of 4 lost in run 2606).

### 2.4 Measurement 3: the widths (`logs/measure-p337-w.log`, `bin/widths3.py`)

`P337_ARMS=NONE node build/p337/measure-screen.mjs --check` at the parent (history block, one slot, exit 0, 9 s):
**PASS 37b W, widths equal the fixture (925 ranges, tally 0: 2,332, 1: 135,461, 2: 122,238), sequences equal; PASS 36a
W, widths equal the fixture (937 ranges, tally 0: 2,374, 1: 130,946, 2: 126,711), sequences equal.** Its report
(`logs/p337-measure-70769.json`) was moved out of `/private/tmp`.

xterm's Unicode 6 (ported from `UnicodeV6.ts`) against both, over the fixture's 260,031 code points:

| Code points | Unicode 6 | 3.6a | 3.7b | Example |
| --- | --- | --- | --- | --- |
| 112,738 | 2 | 2 | 2 | U+1100 |
| 74,533 | 1 | 1 | 1 | U+0020 |
| 56,252 | 2 | 1 | 1 | U+2E9A (unassigned in a range Unicode 6 calls wide) |
| **9,498** | **1** | **2** | **2** | U+231A, ✅ ❌ ⚡ ✨ 🚀 📝 🔧 🧠 (every emoji) |
| 4,316 | 2 | 2 | 1 | U+2B73A (CJK, assigned in Unicode 16 or 17) |
| 1,644 | 1 | 0 | 0 | U+0487 |
| 687 | 0 | 0 | 0 | U+0300 |
| 161 | 0 | 1 | 1 | U+1160 |
| 157 | 1 | 2 | 1 | U+16FF2 |
| 42 | 1 | 0 | 1 | U+1ACF |
| 3 | other | | | U+302E, U+302F (0, 2, 2); U+3164 (2, 0, 0) |

Unicode 6 against 3.7b differs on 71,874 code points, against 3.6a on 67,757; **3.6a against 3.7b on 4,515** (4,473
where 3.6a says 2 and 3.7b 1, 42 where 3.6a says 0 and 3.7b 1). **The 3.7b table on a 3.6a server would be worse than
today on 4,316 code points; the 3.6a table on a 3.7b server on 199.** So the table is chosen by the server (D7). A
"consensus" table (the two builds' width where they agree, Unicode 6 where they do not) is worse than today on neither,
and is noted as Q11's other choice. All 281 committed joining sequences agree between 3.6a and 3.7b
(`tmux-sequences.json`), so only the per-code-point table differs. None of the agents' own glyphs differs (⏺ ✻ ⎿ ❯ ● ─ │
› ⚠ ℹ ✔ ⚙ are 1 in all three).

### 2.5 Measurement 4: `-T hyperlinks` (`bin/tflag.py`, `logs/tflag.log`, sources under `src/`)

A Python pty client attached `tmux -u [-T …] -S <scratch> -f <copy of gmux-tmux.conf> attach-session -t =p` to a pane
printing an OSC 8 link every 500 ms; 2.5 s read; `#{client_termfeatures}` from `list-clients`:

| Server, client | no flag | `-T hyperlinks` | `-T nosuch,hyperlinks` | `-T hyperlinks,nosuch` |
| --- | --- | --- | --- | --- |
| 3.7b, 3.7b | no feature, 0 links, words only | `hyperlinks` on, 14 links, target seen | feature lost, 0 links | on, 12 links |
| 3.6a, 3.6a | 0 | on, 14 | lost, 0 | on, 12 |
| 3.6a, 3.7b (the tested local pair) | 0 | on, 12 | lost, 0 | on, 12 |

The client stayed attached in all twelve. By source (`src/tmux-*/tmux.c` getopt, `tty-features.c`): 3.1c's getopt is
`"2c:Cdf:lL:qS:uUvV"` (no `-T`; `usage()` exits 1); 3.2a, 3.3a and 3.4 are `"2c:CDdf:lL:NqS:T:uUvV"`; `hyperlinks` is
absent from 3.2a's and 3.3a's tables and at index 4 in 3.4, 3.5a, 3.6a and 3.7b; index 4 is `cstyle` in 3.2a and 3.3a.
Not read: 3.6, 3.6b and 3.7c (pinned and buildable; Lens B builds and measures them).

### 2.6 Measurement 5: item 7's guard (`bin/wrapcases.py`, `runs/wrap/cases.json`)

A 40-column pane on each build, research 142's cases redrawn with output processing off, plus three of the spec step's;
`capture-pane -p -F -N -T` (3.7b; 3.6a refuses `-F`: "command capture-pane: unknown flag -F") and `-p -J`:

| Case | tmux's marks (rows 0, 1) | `-J` (today's history path) | Guard "a glyph in the last column" | Against `-J` |
| --- | --- | --- | --- | --- |
| G1a: 100 `A`s | W, W | one line, right | joins, right | same |
| G1b: row 0 rewritten `status: ok`, cleared to the end | W (40 cells used, ends in spaces), W | `status: ok` + 30 spaces + `A`s, wrong | rejects row 0 | better |
| G2: row 0 overwritten with 40 `B`s, no erase | W, W | `B…B` + `short line two`, wrong | joins, wrong | same |
| G3: row 0 cleared whole, then text | -, W | `status: ok` alone | no join | same |
| G5: progress bar redrawn with CR | W | `progress 50%P…`, as drawn | joins | same |
| G6: 39 `a`, a written space at column 40, then `bbbbbbbbbb` | W | `a…a bbbbbbbbbb`, right | **rejects: two lines** | **worse** |
| G7: 39 `a`, then `日本` pushed to the next row | W (39 cells used), X | `a…a日本ccccc`, right | **rejects** | **worse** |
| G8: 38 `a` + `日` filling the row | W | right | joins | same |
| G9: 40 `x` + ` tail` | W | right | joins | same |

`-T` reads G1b's cleared row as 40 used cells on both builds, so no capture separates a cleared cell from a written
space. The guard is not adopted (D13). The agents' committed screens carry no marks by construction (research 142 §2.5),
so the guard changes nothing there either way.

### 2.7 Measurement 6: the parent's baselines (`logs/baselines.txt`)

| Row | Command at the parent | Exit, wall | Reading |
| --- | --- | --- | --- |
| `conformance:pathdoors` | `node build/conformance-pathdoors.mjs` (block) | 0, 13 s | every rule passed |
| `conformance:pocket` | `node build/conformance-pocket.mjs` (block) | 0, 14 s | PASS: 192 rules, 25,806 checks, 14.22 s |
| `npm test` | block, scratch HOME, `TMPDIR` through `/var` | 1, 86 s | 22,990 passed, 12 failed (the environmental twelve of §0), 24 skipped of 23,026; 1,201 files passed, 6 failed, 4 skipped |
| `probe:p292` | `node build/harness-socket.mjs --fresh gmux-p292 'node build/p292/probe-p292.mjs'` (slot) | 0, 133 s | 0 findings on a, b, c, d, e, f, g, h (h is Phase 295's history-copy arm); readings moved out of `out/p292/` |
| `probe:p209` | `node build/probe-p209-selection.mjs` (slot) | 1, 61 s | FINDING D ("copied 10 lines for a drag over 7"); E identical (418 bytes from history and screen); pasteboard restored (1 item) |
| `smoke:quit` | `node build/harness-socket.mjs gmux-smoke-quit 'node build/quit-smoke.mjs quit'` (slot) | 0, 5 s | PASS 2 of 2 legs; teardown exit 0 after 1,842 ms |
| `smoke:quitdoors` | `node build/harness-socket.mjs gmux-p144-doors 'node build/quit-smoke.mjs quit-doors'` (slot) | 0, 2 s | PASS 1 of 1 leg; 9 of 9 doors |

Not run by the spec step: `probe:p167` (it begins `npm run build`; at the parent run its harness line, minutes),
`measure:p3471`, `conformance:machines`, `measure:p337 -- --check`'s full arms (14 to 19 minutes), `gate:contract` at the
parent (inside its build, which read "matches byte for byte").

### 2.8 The spec step's commands, exit codes and numbers

- `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before, between and after every run: `746321 1794670684`,
  `23166 1790702242`, unmoved.
- `npm run build` at the parent (block, scratch HOME): exit 0, 60 s; `gate:electron` "189 of them reach
  build/electron-run.mjs … against a floor of 189"; contract "matches byte for byte".
- Three census runs (slot `electron.lock` each): `census-parent-64987` 229 s, `census-parent-2606` 223 s,
  `census-parent-38654` 217 s, each exit 0, each teardown "ended 1 process the teardown found still running" (the app,
  by design of a held launch).
- `measure-screen.mjs --check` with `P337_ARMS=NONE` (block, slot): exit 0, 9 s.
- `bin/tflag.py` twice (block): the first run's pane printer was broken by the spec step's own quoting and read no text;
  the second is §2.5. `bin/wrapcases.py` twice (the first used `=w` as a pane target, which tmux refuses for panes): §2.6.
- `curl -sS -f` of `tmux.c`, `tty-features.c` and `CHANGES` at tags 3.1c, 3.2a, 3.3a, 3.4, 3.5a, 3.6a from
  raw.githubusercontent.com (block), each exit 0.
- §2.7's seven rows; the first chained attempt of three of them exited 127 on the spec step's own quoting (`$SB` unsplit
  in `zsh -f`) and was re-run directly.
- At the end: the Electron count (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad"`) showed his
  Tortie (94808), its crash handler (94828) and other apps' crash handlers only; no `gmux-p368*` socket left; 45
  DiagnosticReports before and after, identical by name and mtime; every slot free.

## 3. The tree at this head: the paths each item touches

| Item | Paths (all read at `8497c34c`) |
| --- | --- |
| 1 | `src/shared/ipc/base.ts:48`, `:143`; `src/preload/sessions.ts:21`; `src/main/ipc.ts:135-136`; `src/main/sessions/core.ts:3917-4059`, `:4093-4100`; `src/main/attach/attach-host.ts:207-208`, `:272-273`; `src/renderer/terminal/TerminalPane.tsx:587-604` |
| 2 | `src/shared/types.ts:537-616` (`CreateSessionInput`); `src/shared/ipc/sessions.ts:53-80` (`CaptureChoice`), `:82` (`sessions:restore`); `src/main/tmux/sessions.ts:58-82`, `:164-218`; `src/main/sessions/create-local.ts:175`, `:239`, `:709-717`; `src/main/restore/restore.ts:943`, `:1113-1129`; `src/main/machines/remote-sessions.ts:881-960`, `:1770`, `:1894-1900`; `src/main/machines/remote-restore.ts:294`, `:545`; the renderer's create and restore funnels in `src/renderer/state/sessions-slice.ts` |
| 3 | `TerminalPane.tsx:254-275`, `:508-525`, `:575-604`, `:723-759`; `src/renderer/theme/work-fonts.ts` (`loadWorkAreaFace`) |
| 4 | `src/main/screen/cell-widths.ts`, `cells.ts`, `compose.ts:92`, `__tests__/cells.test.ts`; `build/fixtures/screen/`; `build/conformance-pocket.mjs:487`, `:10685-10735` (Z12); `build/ablation-p313.mjs` (Z12 arms); `src/main/tmux/version.ts:676-681`, `:877`; `TerminalPane.tsx:254`; `capture/history-copy.ts:101-119`; `capture/index.ts:705-745` |
| 5 | `src/main/tmux/scroll.ts:184-307`, `:346-371`, `:459-465`, `:787-829`, `:846-905` |
| 6 | `capture/index.ts:184-209`, `:260-297`, `:307-345`; `capture/serialize.ts:305-330`; `capture/history-copy.ts:127-146`; `src/main/menu.ts:828` (read only) |
| 7 | `scroll/drag-select.ts:231-254`, `:278`, `:376-425`; `capture/history-selection.ts:73-79`; `src/main/capture/ipc.ts:9` (a stale comment) |
| 9 | `src/main/attach/attach-plan.ts:156-186`; `attach-host.ts:443-476` (`planFor`); `src/main/machines/far-tmux.ts:162-205` (read only); `src/main/machines/context.ts:222-234` (read only) |
| 10 | `TerminalPane.tsx:254-275`, `:370-376`; `src/main/security/trusted-window.ts:60-65`, `:135-137` (read only); `node_modules/@xterm/addon-web-links/src/{WebLinksAddon.ts:21,WebLinkProvider.ts:58-199}` (read only) |

## 4. The design, item by item (real paths; the builder named on each)

### 4.0 The shared contract (integrator: existing files; the named builder: new files)

Builders build against this text as written. Until the integrator applies the existing-file edits, `npm run typecheck`
fails only on the members named here; a builder reports those errors as the seam and does not work around them.

- **NEW `src/shared/terminal-size.ts`** (builder `sizes`): `export interface TerminalSize { readonly cols: number;
  readonly rows: number }`; `export const TERMINAL_SIZE_BOUNDS = Object.freeze({ minCols: 2, maxCols: 1000, minRows: 1,
  maxRows: 500 })`; `export function sanitizeTerminalSize(value: unknown): TerminalSize | null` (whole numbers inside the
  bounds, else null; pure, imports nothing).
- **NEW `src/shared/cell-widths.ts`** and **NEW `src/shared/cells.ts`** (builder `widths`, §4.2), exporting among the rest
  `export type CellWidthTable = '3.7b' | '3.6a'`.
- **`src/shared/types.ts`** (integrator): `CreateSessionInput` gains, APPENDED with the house comment, `size?:
  TerminalSize` ("Phase 368: the size of the terminal this session will be shown in; absent lets main use the last size
  it fitted, and none keeps tmux's 80 by 24"); `Session` gains `cellWidths?: CellWidthTable` ("Phase 368: the width table
  of the server that draws this session, set for this Mac's server alone; absent keeps xterm's Unicode 6").
- **`src/shared/ipc/sessions.ts`** (integrator): `CaptureChoice` gains `size?: TerminalSize` (the restore's size, the
  same comment).
- **`src/shared/ipc/base.ts`** (integrator): `:48` becomes `'sessions:attach': { req: [sessionId: string, size?:
  TerminalSize]; res: void };` and `:143` `attach(sessionId: string, size?: TerminalSize): Promise<void>;`.

### 4.1 The redraw: items 1, 2 and 3 (builder `sizes`)

**Item 1, main.**
- `src/main/ipc.ts:135-136`: `handle('sessions:attach', async (e, sessionId, size) => (await
  getGmuxCore()).attachSession(sessionId, e.sender, size))`. `src/preload/sessions.ts:21`: `attach: (sessionId, size) =>
  invoke('sessions:attach', sessionId, size)`.
- `core.ts`: `attachSession(sessionId, sender, size?: unknown)` → `attachSessionAdmitted(…, size)`. One private
  `attachSizeFor(size)`: `sanitizeTerminalSize(size) ?? this.lastFittedSize ?? null`; a valid given size also becomes
  `this.lastFittedSize`. Every `this.attachHost.attach({…})` (the local `:3977`, `attachListedRemote` `:4010`, and through
  it `attachFarUnbound`) spreads `cols`/`rows` from it when not null. `attachListedRemote` and `attachFarUnbound` gain the
  size parameter; nothing awaited moves (Phase 326's ticket and Phase 342's synchronous `assertFarPairUsable` stay
  directly before the spawn).
- `resizeSession` (`:4093-4100`) also sets `this.lastFittedSize = sanitizeTerminalSize(input)` when it is not null. The
  attach host's own default and sanitizers are untouched.

**Item 1, renderer** (`TerminalPane.tsx`, the mount effect's open-and-attach block `:575-604`):
1. After `term.open(container)` and the WebGL attach, `doFit()` as today, then `const dims = fit.proposeDimensions()`.
2. When `dims` is undefined (the container has no size), await `firstFit()`: a promise the ResizeObserver's `doFit`
   resolves the first time `proposeDimensions()` answers, raced against `FIRST_FIT_WAIT_MS` (500) and against
   `disposed`.
3. `const size = fitted ? { cols: term.cols, rows: term.rows } : lastWindowFit()` (`tab-size.ts`), and
   `await gmux.sessions.attach(sessionId, size ?? undefined)`.
4. Today's post-attach `doFit()` and explicit `sessions.resize` push stay (a no-op when the size did not move: the
   kernel signals SIGWINCH only on a change), and so does the pre-attach push through `term.onResize`, whose answer from
   main finds no client.
5. Every size this pane pushes (`term.onResize` `:468-472`, the post-attach push) also calls `noteFit(cols, rows)`.

**`src/renderer/terminal/tab-size.ts`** (new): `noteFit(cols, rows)` keeps the window's last fitted size;
`lastWindowFit(): TerminalSize | null`; `tabSizeForCreate(): TerminalSize | null` answers the visible pane's own
`term.cols`/`term.rows` when `useApp.getState().visibleSessionIds` holds exactly one session of the active project (its
terminal from `getTerminal`, `src/renderer/terminal/drop/registry.ts`), else `lastWindowFit()`.

**Item 2, main.**
- `src/main/tmux/sessions.ts`: `CreateTmuxSessionInput` gains `size?: TerminalSize`; after `'-s', tmuxName` (`:186`)
  `createSession` pushes `'-x', String(cols), '-y', String(rows)` when `sanitizeTerminalSize(input.size)` is not null.
- `remoteCreateArgs` (`remote-sessions.ts:881`): the same input field and the same two pairs after `'-s', input.tmuxName`.
- `create-local.ts`: `createLocalSession` resolves `const size = sanitizeTerminalSize(input.size) ??
  deps.lastFittedSize() ?? undefined` once and passes it to `tmux.createSession` (`:709`) and to `remoteCreate` (`:239`);
  `remoteCreate` passes it to `remoteCreateArgs` (`:1894`). `createDeps` gains `lastFittedSize()`.
- `restoreSession` (`core.ts:1983`): the same resolution from `options.size`; `restoreSessionInTmux` (`restore.ts:943`)
  and `restoreRemoteSession` (`remote-restore.ts:294`) take it and hand it to `tmux.createSession` (`restore.ts:1113`)
  and `remoteCreateArgs` (`remote-restore.ts:545`).
- Restart (`src/main/restart/restart.ts:228`) composes its own input and gets main's last fitted size through the same
  fallback; it is not edited.

**Item 2, renderer.** The ONE place each funnel composes its request adds `size: tabSizeForCreate() ?? undefined`: the
store's `createSession` (`sessions-slice.ts`) and its restore verb (`restoreSessionNow`, through which the restore
buttons, the session manager and Restore all go; the builder confirms by `grep -rn "sessions.restore(\|sessions.create("
src/renderer` and names any other caller). `splitSession` (`terminal-menu.ts:69-81`) goes through the same funnel (D2).

**Item 3** (D5, D6). Nothing else sends a size Tortie made on its own (§2.1). The mount effect awaits
`loadWorkAreaFace(workAreaFontRef.current, fontSize)` (bounded by `FIRST_FIT_WAIT_MS`) before `term.open` when the preset
names a face, and then marks `appliedFontRef` so the Phase 78 effect does not re-fit the same face again; with System it
resolves at once and nothing changes. The window drag, every deliberate layout change, zoom and full screen keep today's
path byte for byte.

**Also in `TerminalPane.tsx`, at the seams (§9.2):** `allowProposedApi: true` in the Terminal options and
`registerTmuxWidths(term, sessionRow()?.cellWidths ?? null)` right after the constructor (`widths`); `linkHandler:
links.handler` in the options and `links.bind(term)` after the constructor (`links`); `routePaneCopy(container,
sessionId, term)` beside the right-button swallow, its disposer in the cleanup (`copy`).

**Local session rows** (`core.ts:3306`, `listSessions`): a row on this Mac carries `cellWidths: localCellWidths()`
(seam, `widths`); a row on another machine carries none (D7).

**Tests** (new): `src/main/sessions/__tests__/p368-attach-size.test.ts` (all three branches spawn at a given size; an
invalid size falls back to the last fitted, then to none; the fallback is learnt from `resizeSession`);
`src/main/tmux/__tests__/p368-create-size.test.ts` (`-x`/`-y` after `-s`, absent without a size, both bounds);
`src/main/machines/__tests__/p368-remote-create-size.test.ts` (the far line, create and restore);
`src/renderer/terminal/__tests__/p368-first-fit.test.ts` (no size: waits, then the window's last; a size: attaches at
once with it). Every existing test that pins a `new-session` argv or the attach call is updated, each named.

### 4.2 The widths: item 4 (builder `widths`)

- **`src/shared/cell-widths.ts`** (new): `src/main/screen/cell-widths.ts` moved verbatim (its header, `SCANNED`,
  `PLANE_14_ZERO`, `SCANNED_LAST`, `cellWidthOf`, all unchanged, so the phone reads the same 3.7b table), plus
  `SCANNED_36A`, the 937 ranges of `build/fixtures/screen/tmux-widths.json`'s `3.6a` build flattened the same way and
  frozen, with a header saying it is Homebrew's 3.6a over utf8proc 2.11.3 (§0.1 item 10), generated, never hand-edited;
  `cellWidthIn(table: CellWidthTable, cp): 0 | 1 | 2` (plane 14 the same for both); `cellWidthsForServer(version: string
  | null): CellWidthTable | null` (`'3.7b'` and `'3.6a'` exactly, else null); `CELL_WIDTH_TABLES` gains `scanned36a`.
- **`src/shared/cells.ts`** (new): `src/main/screen/cells.ts` moved, with ONE spelling of the seven rules in
  `nextCell(state: CellState, cp: number, table: CellWidthTable): { join: boolean; width: 0 | 1 | 2; state: CellState }`,
  where `CellState` is a small integer (ZWJ pending, regional indicator open, a Hangul lead, an Emoji_Presentation base,
  the open cell's width). `clusterCells(points, table = '3.7b')` and `cellsOf(text, table = '3.7b')` are rebuilt on
  `nextCell` and answer byte for byte what they answer today for 3.7b (the moved tests and `compose.test.ts` hold it). A
  zero-width code point with no open cell is dropped, as today.
- **Deleted**: `src/main/screen/cell-widths.ts`, `src/main/screen/cells.ts`; `src/main/screen/__tests__/cells.test.ts`
  moves to `src/shared/__tests__/cells.test.ts` and also holds `SCANNED_36A` to the fixture range for range and code
  point for code point. `src/main/screen/compose.ts:92` imports from `@shared/cells` (Z12's allowlist admits
  `@shared/`).
- **`src/renderer/terminal/tmux-widths.ts`** (new): `tmuxWidthsProvider(table)` implements xterm's
  `IUnicodeVersionProvider` with `version` `tmux-<table>`: `wcwidth(cp)` is `cellWidthIn`; `charProperties(cp,
  preceding)` decodes the preceding state (`preceding >> 3`), asks `nextCell`, and answers
  `UnicodeService.createPropertyValue`'s encoding (`(state << 3) | (width << 1) | join`), where a joining code point's
  width is the open cell's new width (VS16 widens to 2, xterm moves the cell, `InputHandler.ts:560-621`).
  `registerTmuxWidths(term, table | null)`: null does nothing (Unicode 6, today); otherwise registers the provider and
  makes it active. It throws nothing on a terminal without `allowProposedApi` (it checks and does nothing, logged once).
- **`src/main/tmux/version.ts`**: where the version gate is decided, the server version it read is recorded;
  `lastLocalServerVersion(): string | null` and `localCellWidths(): CellWidthTable | null =
  cellWidthsForServer(lastLocalServerVersion())`. Nothing else in the file moves.
- **The two capture terminals** call `registerTmuxWidths` too (the `copy` builder, at its seam): `bufferTerminal`
  (`history-copy.ts:101`) and `rasterizeRows` (`capture/index.ts:705`), each with the session row's `cellWidths`.
- **`build/conformance-pocket.mjs`** (Z12): the pure list reads `src/main/screen/{sgr,palette,compose}.ts` and
  `src/shared/{cells,cell-widths}.ts`; the frozen-literal check holds both literals (`SCANNED` 925 ranges and
  `SCANNED_36A` 937); the purity rules unchanged. **`build/ablation-p313.mjs`**: every Z12 arm naming the moved files
  names their new paths; the arm count does not change.
- **Tests** (new): `src/renderer/terminal/__tests__/p368-widths.test.ts`: an unopened xterm (`allowProposedApi`) with the
  provider writes every one of the 281 committed sequences and a sample of every class of §2.4's table, and the cursor's
  advance equals the fixture's measured width for that build, both tables; the Unicode 6 default still answers when the
  table is null; `nextCell` driven over the fixture's sequences equals `clusterCells`.

### 4.3 Scrollback between frames: item 5 (builder `frames`)

`src/main/tmux/scroll.ts`, this Mac's runner alone (`isThisMacsRunner`, `:306-308`), every other runner byte for byte:
- `FRAME_READ_FORMAT = '#{pane_in_mode}\t#{synchronized_output_flag}'` (its own constant; `STATE_FORMAT` and
  `REMOTE_STATE_FORMAT` do not move, `conformance:machines` condition 103 holds them).
- An ENTRY is a gesture that finds the pane not in copy mode: `scrollPaneBy` with `n > 0` (`:846-905`) and `scrollFrom`
  with `now.inMode === false` and a target above 0 (`:787-829`). Before its `copy-mode -e` it reads `FRAME_READ_FORMAT`
  once; when the pane was not in mode, after the entry and the cursor step it reads the flag once more. Either read
  answering `1` starts `settleOpenFrame(run, target)`, not awaited.
- `settleOpenFrame`: one flight per target (a module map; a second start for the same target joins the first). It reads
  `REFREEZE_READ_FORMAT` plus the flag every 50 ms (`FRAME_POLL_MS`) for at most 1,100 ms (`FRAME_SETTLE_MS`, D10). The
  first read with the flag `0`: if `pane_in_mode` and `frameHistory !== null && !innerAlt && historyLimit !== null &&
  !isDiscarding(history, historyLimit)`, it sends `refreeze` (`:368`) and then `cursorToTopRow`; otherwise nothing. A read
  that fails, a pane out of mode, or the bound ends it with nothing sent. It never re-freezes while the flag reads `1`.
- tmux 3.6a answers the flag empty, which is never `1`, so nothing changes there; another machine never reaches it
  (`refresh-from-pane` is not in the closed table, `scroll-shapes.ts`).
- **Tests** (new) `src/main/tmux/__tests__/p368-frames.test.ts`: a scripted runner — an entry with the flag `1`
  re-freezes once after it reads `0`; with `0` both times, no extra command; the bound ends a flag that never clears; a
  pane that left copy mode, the alternate screen, the trim band and a remote runner each send nothing; a gesture during
  the wait joins rather than starting a second flight.

### 4.4 The copy: items 6, 7 and 8 (builder `copy`)

- **`src/renderer/terminal/capture/drawn-text.ts`** (new): `drawnSelectionText(term, range?: IBufferRange): string`,
  xterm's `selectionText` (`SelectionService.ts:203-262`, normal mode; column mode never happens on this Mac because
  `macOptionClickForcesSelection` is on) over the public buffer API with two changes: every row is read only up to
  `term.cols` (`translateToString(true, start, Math.min(end ?? line.length, term.cols))`), and every LINE (a row whose
  next row is not `isWrapped`, or the selection's last row) has its trailing U+0020 removed. Non-breaking spaces become
  spaces as xterm does; lines join with `\n`. A property test: equal to `term.getSelection()` over random buffers whose
  rows are no longer than `term.cols` and whose lines end in no space.
- **`capture/index.ts`**: `snapshotSelection` (`:184-209`), `copySelection`'s live branch (`:288-296`) and
  `copySelectionAsHtml`'s text (`:341`) use `drawnSelectionText`; no `term.getSelection()` remains in the file.
  `routePaneCopy(container, sessionId, term)` (new export): a capture-phase `copy` listener on the mount that, when the
  terminal has a selection or a history range is held, calls `preventDefault()` and `stopPropagation()` and `void
  copySelection(sessionId)`; it returns its disposer (D12). `rasterizeRows` (`:705`) registers the session's widths.
- **`capture/serialize.ts:318`**: `const to = Math.min(line.length, colEnd, term.cols);` (trailing default cells were
  already dropped, `:300-330`).
- **`capture/history-copy.ts`**: `composeText` (`:127-146`) removes trailing U+0020 from each joined line (the history
  path's `-J` keeps trailing spaces, `cmd-capture-pane.c:237-240`); `bufferTerminal` (`:101-119`) takes the session's
  table and registers it (the re-wrap must put a wide character where the pane did); `composeHistorySelection`'s callers
  pass the session row they already hold.
- **Item 7** (TAKEN BACK OUT by the fix round, §As built; drag-select.ts's code is the parent's again and its header
  says why) (`scroll/drag-select.ts`): `onSelectionChange` (`:231-234`), when the change is not ours and the view is
  parked (`surface.view.position > 0` or in copy mode), owned (`surface.view.owned`) and not on the alternate screen,
  converts xterm's selection (`term.getSelectionPosition()`) to a history range through `toHistory` and the frame's own
  depth (`frameDepth`) and HOLDS it (`hold`) instead of releasing it; live, or not owned, it releases as today. A drag
  that is taking over is unchanged. The held range composes through today's path with `-J` (D13).
- **`src/main/capture/ipc.ts:9`**: the stale comment ("no -J") says the range read uses `-J` and Capture Last N Lines
  does not.
- **Item 8**: no new join rule; `drawnSelectionText` joins only rows xterm marked wrapped, as xterm does.
- **Tests** (new): `capture/__tests__/p368-drawn-text.test.ts` (the property; a buffer narrowed from 140 to 96 holds no
  cell past 96; trailing spaces gone at a line's end and kept at a wrapped row's end; G6's and G7's rows),
  `p368-serialize-bound.test.ts`, `p368-history-trim.test.ts`, `scroll/__tests__/p368-parked-selection.test.ts` (a click,
  a double click and ⌘A while parked are held; live and the alternate screen are not), `p368-edit-copy.test.ts`.

### 4.5 The links: items 9, 10 and 11 (builder `links`)

- **`src/main/attach/attach-plan.ts`**: the local argv (`:158-171`) becomes `['-u', '-T', 'hyperlinks', '-L', socket,
  '-f', confPath, 'attach-session', '-t', wanted]`. `AttachTarget`'s remote kind gains `hyperlinks: boolean`; true makes
  the far call `remoteTmuxArgv(ctx, ['-u', '-T', 'hyperlinks', 'attach-session', '-t'])`, false keeps `:177` byte for
  byte. The import allowlist test stays green (nothing new imported).
- **`src/main/attach/hyperlinks-gate.ts`** (new): `HYPERLINK_FAR_VERSIONS` (D18) and `farAttachTakesHyperlinks(pair: {
  server: string; program: string | null } | null): boolean`, pure; `farAttachHyperlinks(machineId)` reads `farPairOf`.
  **`attach-host.ts`** `planFor` (`:443-450`) passes `hyperlinks: farAttachHyperlinks(req.machine.machineId)`.
- **`src/renderer/terminal/links/web-reading.ts`** (new, D15): the extract, with the MIT notice and the source path and
  version in its header; `webAddressesOn(term, y): { address: string; range: IBufferRange }[]`.
- **`src/renderer/terminal/links/link-rules.ts`** (new, pure): `openedAddress({ target, range }, reading, nextRowText):
  string | null` implementing D14 exactly: (1) W = the reading's address whose range intersects the clicked link's range;
  (2) if W exists and is not cut, W; (3) "cut" means T starts with W, is longer, and the next row with its leading spaces
  removed begins with the first `min(8, rest.length)` characters of `rest = T.slice(W.length)`, and then T is checked by
  (4); (4) with no W, T when `targetOffered(T)` (parses with `new URL`, protocol `http:` or `https:`, empty
  `username` and `password`, UTF-8 length ≤ 2,048), else null. `hoverText(address) = new URL(address).href`.
- **`src/renderer/terminal/links/pane-link-handler.ts`** (new): `paneLinks()` answers `{ handler: ILinkHandler; bind(term)
  }`. `activate(event, text, range)`: `const a = openedAddress(…)`; when not null, `window.open(a, '_blank',
  'noopener,noreferrer')` and nothing else. `hover`: a `div.xterm-hover.gmux-terminal-link-hover` inside `term.element`
  holding `hoverText(a)` as text (never HTML), one at a time; `leave` removes it. `allowNonHttpProtocols` is never set.
- **`src/renderer/terminal/links/link-hover.css`** (new): tokens only (`tokens.css`), a single line at the pane's bottom
  left, ellipsis past the pane's width, `pointer-events: none` except as xterm's hover class needs.
- **Item 11**: nothing names `FORCE_HYPERLINK` under `src/` (the gate holds it).
- **Tests** (new): `src/main/attach/__tests__/p368-hyperlinks.test.ts` (the local argv; the far gate over every pair of
  the nine far versions and null; the far argv with and without), and the goldens of `attach-plan.test.ts:92-260`
  updated; `src/renderer/terminal/links/__tests__/p368-link-rules.test.ts` (research 145 §5.5's cases: words that are
  another address open the words; a cut URL opens the whole target; `Foo_(bar)` exact; Codex's echo opens what today
  opens; a right-to-left override, `аpple.com`, `www.google.com@evil.example`, `https:example.com`, 3,000 and 65,536
  bytes, `javascript:`, `data:`, `file:`, `vscode:` refused as a target; the hover's text for each);
  `p368-web-reading.test.ts` (the extract finds exactly what the addon's own `LinkComputer` finds, over the same buffers,
  the addon imported in the test only).

### 4.6 The gate: item 12 (builder `gate`)

`build/conformance-terminal.mjs` (`npm run conformance:terminal`), §7.1.

### 4.7 The probe (builder `probe`) and what the integrator writes

`build/p368/probe-p368.mjs` and its graders, stand-in and fixtures, §8. The integrator writes (exact text):

- **CLAUDE.md**, the path-triggered table, a new row:
  `| src/main/attach/attach-plan.ts, src/main/attach/hyperlinks-gate.ts, the attach and create sizes in
  src/main/sessions/core.ts, create-local.ts, src/main/tmux/sessions.ts, src/main/restore/restore.ts,
  remoteCreateArgs and src/main/machines/remote-restore.ts, src/renderer/terminal/{TerminalPane.tsx,tab-size.ts,
  tmux-widths.ts}, src/renderer/terminal/links/**, src/renderer/terminal/capture/{index,drawn-text,serialize,
  history-copy}.ts, src/shared/{cells,cell-widths,terminal-size}.ts, the frame re-freeze in src/main/tmux/scroll.ts |
  conformance:terminal | ~1 s, spawns nothing | Issue 44 (Phase 368): every attach and every create carries the size the
  pane will draw at, never tmux's 80 by 24 when one is known; one width provider from the shared tables on all three
  terminals, chosen by this Mac's server; every copied row within the terminal's columns; the link handler's one route
  and its refusals; -T hyperlinks on the local attach and on another machine only from 3.4; never allowNonHttpProtocols
  or FORCE_HYPERLINK. Each rule has an ablation inside the gate that turns it red |`
- **CLAUDE.md**, the probes table, a new row: `| probe:p368 | the paths conformance:terminal names, or build/p368/** |
  about 6 to 10 minutes a build (not yet measured), the parent first (P368_PARENT_CHECKOUT); ONE Electron at a time
  through the helper on a scratch profile, HOME and socket, main driven through its inspector with shell.openExternal and
  capture:writeRich replaced by recorders before anything is clicked or copied, the three background flags, every probed
  row hidden but the stand-ins, research 145's redacted recordings replayed by build/p368/stand-in.mjs; arms a to f of
  build/p368/SPEC.md §8; no agent, no token. --grader-self-test grades recorded fixtures and starts nothing. Verifiers
  only, under the lock |`
- **CLAUDE.md**, `conformance:pocket`'s row: the Z12 sentence names `src/shared/{cells,cell-widths}.ts` beside the
  composer's files; `conformance:pathdoors`' row is unchanged (the path links read xterm's own cell widths).
- **CHANGELOG.md**, §5. **package.json**: `"conformance:terminal": "node build/conformance-terminal.mjs"` and
  `"probe:p368": "node build/harness-socket.mjs --fresh gmux-p368 'node build/p368/probe-p368.mjs'"`.
  **build/verification-checks.mjs**: classify both (the gate beside `conformance:pathdoors`, the probe beside
  `probe:p365`). **build/assert-electron-teardown.mjs**: `HELPER_USER_FLOOR` 189 → 190.

## 5. Words

Three CHANGELOG items under `## Unreleased`, in his style (one or two sentences, what a person can now do, a limit in one
clause, no file or gate names), with no commit link (the follow-up adds them):

- `A long agent reply no longer draws over itself when you switch to a session or start or restore one, and emoji in a session on this Mac take the same room in Tortie's terminal as in the session itself; a session started before Tortie has shown one, and resizing the window or a panel mid-reply, can still make the agent repaint.`
- `Copying from a session now copies what you see: nothing from past the right edge after the session narrows, and no trailing spaces; a command the agent itself drew over several lines still copies as it was drawn.`
- `Links an agent prints now open in your browser when you click them, and hovering one shows where it goes; when a link's words are an address or a file in the project, a click still opens that address or file.`

(The fix round narrowed the first two and widened the third: see §As built, "The fix round".)

The hover line shows only the address. No other new string a person reads. No tmux word anywhere.

## 6. What moves on purpose

A session is created and attached at the size it is shown; a resumed agent paints its first frame at that size; emoji
and every code point the server draws wide take two cells in the terminal on this Mac's server; the local attach argv
gains `-T hyperlinks` and the far one from 3.4; a link an agent prints is underlined, hovered and opened; copies end at
the terminal's edge and their lines lose trailing spaces; the width table and joining rules live in `src/shared/`; `conformance:pocket` Z12 reads the new paths;
`HELPER_USER_FLOOR` 190. Nothing in the contract baseline, the menus, the phone, any agent's launch, the server's
options, `server-options.ts` or the far exec shapes moves.

## 7. The gates

### 7.1 `conformance:terminal` (`build/conformance-terminal.mjs`, builder `gate`), new

Read with the TypeScript parser over the tree, comments blanked; spawns nothing; about a second. Each rule is asked again
over an in-memory copy with that rule broken (its ablation), and every ablation must read red on the rule that owns it,
beside a control copy that must read green. Prints the rule and ablation counts.

| Rule | What it holds | Its ablation (must turn it red) |
| --- | --- | --- |
| T1 | The attach carries a size: the `sessions:attach` tuple names `size`; the preload forwards it; `ipc.ts` hands it to `attachSession`; every `attachHost.attach({` in `core.ts` (three) spreads cols and rows from one `attachSizeFor(`; `TerminalPane.tsx`'s `sessions.attach(` call has two arguments | drop the size from one of the three attach calls; the preload forwards one argument |
| T2 | The create carries a size: `tmux/sessions.ts`' `new-session` line and `remoteCreateArgs` push `-x`/`-y` from `sanitizeTerminalSize(`; the four production creates (`create-local.ts`, `restore.ts`, `remote-sessions.ts`' `remoteCreate`, `remote-restore.ts`) pass a size | delete the `-x` push from either line; drop the size from `restore.ts`' call |
| T3 | One width provider from the shared tables on all three terminals: one `charProperties` implementation under `src/renderer` (in `tmux-widths.ts`), importing `@shared/cell-widths` and `@shared/cells`; `registerTmuxWidths(` called in `TerminalPane.tsx`, `history-copy.ts` and `capture/index.ts`, each Terminal there made with `allowProposedApi: true`; `nextCell` declared once; `src/main/screen/{cells,cell-widths}.ts` absent; no `@xterm/addon-unicode` in `package.json` or under `src/` | remove the registration from `history-copy.ts`; declare a second `nextCell`; add `@xterm/addon-unicode11` to a copy of `package.json` |
| T4 | Copy bounded by the width: `drawnSelectionText` declared once and called by `snapshotSelection`, `copySelection` and `copySelectionAsHtml`; no `.getSelection()` call in `capture/index.ts`; `serialize.ts`' row end names `term.cols`; `composeText` trims line ends; `routePaneCopy(` called in `TerminalPane.tsx` | put `term.getSelection()` back in `copySelection`; drop `term.cols` from `serialize.ts` |
| T5 | The handler's one route: `TerminalPane.tsx`'s Terminal options name `linkHandler`; `pane-link-handler.ts` calls `window.open(` once, with `'_blank'` and `'noopener,noreferrer'`, and names no `shell`, `location`, `fetch`, `XMLHttpRequest` or `openExternal`; `link-rules.ts` checks the protocol, `username`, `password` and 2,048 | a second `window.open(`; the `username` check removed; the 2,048 bound removed |
| T6 | Never `allowNonHttpProtocols`: the name appears nowhere under `src/` outside tests | set it in a copy of `pane-link-handler.ts` |
| T7 | `-T hyperlinks` on the local argv; the far argv adds it only behind `hyperlinks: true`, which only `farAttachHyperlinks(` decides; `HYPERLINK_FAR_VERSIONS` holds no version below 3.4 | drop `-T` from the local argv; add `'3.3a'` to the list |
| T8 | Never `FORCE_HYPERLINK`: the name appears nowhere under `src/` outside tests | plant it in a copy of `registry.ts`' claude row |
| T9 | The frame re-freeze is this Mac's alone: `synchronized_output_flag` named only in `scroll.ts`, read only after `isThisMacsRunner(`; `refresh-from-pane` sent only by `refreeze` | read the flag in the remote branch of a copy |

**The fix round widened four rules** (§As built), each clause with ablations of its own, the attack lens's three
plants among them: **T1** the pane attaches only with `settleForAttach(`'s answer, which moves the terminal to the size
it is handed and answers the terminal's own (ablations: the attach with the wanted size; the settle answering what it
was handed; the settle never moving the terminal); **T3** `cellWidths` set on a row once, only in the branch for rows on
this Mac (ablations: another machine's row given the table; the branch's condition made `true`); **T4** drag-select
never reads `getSelectionPosition(` and its selection change handler releases and holds nothing (ablations: the
conversion put back; a change held); **T5** one `.activate(` of the path link `pathFor(` hands, only `pathUnder(`'s
answer after `pathMayDecide(`, and the hover line drawn only from `openedAddress(`'s answer (ablations: the raw target
on the line; `hoverText(` handed something else; the first path offered; a second `.activate(`; `pathMayDecide(`
skipped). 84 ablations and 32 controls in all.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gates |
| --- | --- |
| `src/main/attach/**`, `remoteCreateArgs`, `src/main/machines/remote-restore.ts`, `src/main/tmux/version.ts` | `conformance:machines` (the far create and attach argv; condition 103 holds `STATE_FORMAT`); `conformance:farattach` (`attachSessionAdmitted`, `attachFarUnbound`, `attachListedRemote`) |
| `src/main/sessions/core.ts`, `create-local.ts`, `src/main/restore/restore.ts` | `conformance:resume:capture` (MAIN SESSION only: it starts Electron outside the helper; with `GMUX_CONF_AGENTS=claude,codex`, and only if its header shows it reads no store); `conformance:endtree` (its rules name `core.ts`' End path, untouched; it is run because the file moved) |
| `src/main/screen/**`, `src/shared/{cells,cell-widths}.ts` | `conformance:pocket`, `conformance:pocket:hostile`, `measure:p337 -- --check` (the main session, 14 to 19 minutes; the W arm alone in 9 s with `P337_ARMS=NONE`) |
| `src/main/tmux/scroll.ts` | `probe:p292`, `conformance:machines` (103) |
| `src/renderer/terminal/**` (`TerminalPane.tsx`, `capture/**`, `scroll/drag-select.ts`) | `probe:p292`, `probe:p209`, `probe:p167`, `conformance:pathdoors`, `measure:p3471` |
| `src/renderer/terminal/capture/serialize.ts` | `conformance:hue` (no Electron; CLAUDE.md budgets about 13 minutes; its path list names `capture/serialize.ts`; one line moves, §4.4) |
| `package.json`, `build/verification-checks.mjs`, a new test file | `gate:checks` (inside `npm run build`) |
| `build/` (a script reaching `electron-run.mjs`) | `gate:electron` (inside the build; the floor 190), `gate:background` |
| The shared contract | `gate:contract` (byte for byte, §0.1 item 3) |

## 8. The app run: `probe:p368` (builder `probe`)

`build/p368/probe-p368.mjs`, `build/p368/graders.mjs` (pure, `--grader-self-test` over `build/p368/fixtures/graders/`,
every clause shown red on its own break, starts nothing), `build/p368/stand-in.mjs` (writes a recording's bytes at their
recorded times, raw mode, logs every size it is given at start, on SIGWINCH and by a 1 ms poll, as the spec step's
`bin/winch-standin.mjs` and research 145's `standin.mjs` do), and `build/fixtures/p368/` (D20). Header in the house shape:
what it drives, what it refuses, its environment (`P368_PARENT_CHECKOUT` required for the parent arms, `P368_ARMS`,
`P368_KEEP`, `P368_TMUX_36A` for the 3.6a arm, default `/opt/homebrew/bin/tmux`), and every process it starts ended in a
`finally`.

**Fixtures** (`build/fixtures/p368/`, ≤ 600 KB, each `{ source, redactions, size, chunks: [{ t, b }] }`): Claude Code's
emoji reply (`r145/redraw/runs/c4-claude-inline-120x30-wide/pane.rec`), its plain long reply (`c1-…/pane.rec`), a Claude
reply with OSC 8 links including words that are another address and a URL it cut (from `r145/links/runs/claude*` or
`adv-links/runs/claude-c*`), and a Codex reply with links and emoji (`links/runs/codex1` or `adv-links/runs/codex-x1`).
**Redaction**: every banner row naming a plan, an account or a path is replaced, cell for cell, by fixed text of the same
width; the redactions are listed; a fixture holding `/Users/`, `@` before a domain outside the reply's own text, or the
words `Ultra`, `Max` or `Pro` beside the model name fails the self-test.

**Every launch**: `withElectron` with `--remote-debugging-port=0 --inspect=0 --use-mock-keychain` and the three
background flags; the stand-in `claude`/`codex` on the scratch login PATH; `writeHiddenAgents(profile, 'p368',
hiddenAgentsBesides(['claude', 'codex']))` and `standInsOnlyVerdict` before any arm; through main's inspector,
BEFORE anything is clicked or copied: `require('electron').shell.openExternal = (url) => { record(url); return
Promise.resolve(); }` and `ipcMain._invokeHandlers.set('capture:writeRich', …)` recording `{ text, html }` without calling
the original; the scratch server's `client-resized`, `client-attached` and `client-detached` hooks logging as §2.1 did.
The parent first, on its own profile, then HEAD, never at once.

| Arm | Drives | Parent reads | HEAD must read |
| --- | --- | --- | --- |
| a | `sessions:resize` delayed 15 and 30 ms in main, four returns each | the pane at 80 by 24 in at least 1 of 4 at 15 ms and 4 of 4 at 30 ms (§2.2) | the pane never at 80 by 24 (0 of 8); the attach client's first size is the fitted one |
| b | a new claude session; a restored one (its tmux session killed, `sessions.restore`); a replay of a restored Claude (research 145's `cold1` shape) | the program starts at 80 by 24, then the fitted size; the replayed restore leaves items twice | the program starts at the fitted size, no later size; no item twice |
| c | §2.1's census rows plus a split and a bundled-font first mount (JetBrains Mono chosen before the launch) | §2.1's numbers | every row equal to the parent's except three: a new session, a restore and a held-back return each show the program no size but the fitted one, and the bundled font's first mount sends one size; the drag and the 8 and 60 ms rows equal the parent's (§0.1 item 7) |
| d | Claude's and Codex's emoji replies replayed; the terminal's rows against `capture-pane -p` at 30 marks, cell by cell; then the same with `GMUX_TMUX_BIN` naming Homebrew's 3.6a | rows that differ (research 145 §3.3: 2,811 readings with today's widths over Claude's emoji reply; on 3.6a letters in the gaps, 118 of 177) | differing readings no more than the no-emoji floor (294 in research 145), and on 3.6a no letter in a gap |
| e | a Claude pane narrowed 140 → 96 then the reply copied; a Codex URL and a long shell line copied while scrolled back (a click, a double click and a drag that did not scroll); the reporter's command copied at a steady width | cells past 96 in the copy; the URL and the line broken; the command over three lines | no cell past 96, no trailing space at a line end; the URL and the line whole; the command exactly as the parent copies it |
| f | Claude's and Codex's linked replies replayed; the OSC links xterm holds read; each link hovered and clicked; research 145 §5.5's hostile targets in a stand-in stream, each drawn under words that hold no address, so the target rule is the one asked | no OSC link registered; a click on Claude's words opens nothing (the recorder empty); Codex's drawn address opens through the web-links reading | Claude's and Codex's links registered; each hover shows `new URL(a).href`; each click records exactly D14's address; every hostile target records nothing; no browser opened |
| RUN | the history stats, the reports folder, the census of his `-L gmux` sessions around each launch (the helper's), no `gmux-p368*` socket left | | |

Its exit: 0 when every arm reads as HEAD must, 1 on a finding, 2 when an arm could not be read (a parent that was not
given, a recording that did not replay, a stand-in that did not start), which is never a pass.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `sizes` | `src/shared/terminal-size.ts` (new); `src/main/sessions/core.ts`; `src/main/ipc.ts`; `src/preload/sessions.ts`; `src/main/tmux/sessions.ts`; `src/main/sessions/create-local.ts`; `src/main/restore/restore.ts`; `src/main/machines/remote-sessions.ts`; `src/main/machines/remote-restore.ts`; `src/renderer/terminal/TerminalPane.tsx`; `src/renderer/terminal/tab-size.ts` (new); `src/renderer/state/sessions-slice.ts` (and the one restore funnel if it is elsewhere, named); §4.1's new tests; every existing test that pins a `new-session` argv, the attach call or `CreateSessionInput` |
| `widths` | `src/shared/cell-widths.ts` (new), `src/shared/cells.ts` (new), `src/shared/__tests__/cells.test.ts` (moved); `src/main/screen/cell-widths.ts`, `src/main/screen/cells.ts`, `src/main/screen/__tests__/cells.test.ts` (deleted); `src/main/screen/compose.ts` (the import line); `src/main/tmux/version.ts`; `src/renderer/terminal/tmux-widths.ts` (new); `src/renderer/terminal/__tests__/p368-widths.test.ts` (new); `build/conformance-pocket.mjs` (Z12); `build/ablation-p313.mjs` (Z12 arms) |
| `frames` | `src/main/tmux/scroll.ts`; `src/main/tmux/__tests__/p368-frames.test.ts` (new) |
| `copy` | `src/renderer/terminal/capture/index.ts`, `serialize.ts`, `history-copy.ts`, `drawn-text.ts` (new), `history-selection.ts`; `src/renderer/terminal/scroll/drag-select.ts`; `src/main/capture/ipc.ts` (the comment); §4.4's tests |
| `links` | `src/main/attach/attach-plan.ts`, `src/main/attach/attach-host.ts`, `src/main/attach/hyperlinks-gate.ts` (new), `src/main/attach/__tests__/attach-plan.test.ts`; `src/renderer/terminal/links/**` (new); §4.5's tests |
| `gate` | `build/conformance-terminal.mjs` (new; its run is its test) |
| `probe` | `build/p368/probe-p368.mjs`, `build/p368/graders.mjs`, `build/p368/stand-in.mjs`, `build/p368/fixtures/**`, `build/fixtures/p368/**` (all new) |
| integrator | `CLAUDE.md`, `CHANGELOG.md`, `package.json` (two scripts), `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 189 → 190), `docs/audits/contract-baseline.txt` (only if a line moves, which none should), `src/shared/types.ts`, `src/shared/ipc/base.ts`, `src/shared/ipc/sessions.ts` (§4.0), every other existing file under `src/shared/`, any file two builders both need, and this file's §As built |

### 9.2 The seams, stated exactly so the seven build at once

- **`TerminalPane.tsx` is `sizes`' alone.** It adds the other builders' calls at exactly these places: `allowProposedApi:
  true` and `linkHandler: links.handler` in the Terminal options (`:254-275`), `const links = paneLinks()` above the
  constructor; `registerTmuxWidths(term, sessionRow()?.cellWidths ?? null)` and `links.bind(term)` right after it;
  `const unroute = routePaneCopy(container, sessionId, term)` beside the right-button swallow (`:303-304`), `unroute()` in
  the cleanup beside `pathLinks.dispose()`.
- Exports each builder promises: `widths`: `registerTmuxWidths(term: Terminal, table: CellWidthTable | null): void`,
  `localCellWidths(): CellWidthTable | null` (version.ts), `CellWidthTable`, `cellWidthsForServer`. `links`: `paneLinks():
  { handler: ILinkHandler; bind(term: Terminal): void }`. `copy`: `routePaneCopy(container: HTMLElement, sessionId:
  string, term: Terminal): () => void`, `drawnSelectionText(term, range?)`. `sizes`: `TerminalSize`,
  `sanitizeTerminalSize`, `tabSizeForCreate()`, `lastWindowFit()`.
- `core.ts` is `sizes`' alone: it calls `localCellWidths()` in `listSessions` for rows on this Mac.
- `copy` calls `registerTmuxWidths` in `history-copy.ts` and `capture/index.ts` with the session row's `cellWidths`.
- `links` changes `attach-host.ts`' `planFor` only; `sizes` changes no line of `attach-host.ts`.
- `gate` reads every name above; it builds against §4 as written, and where a builder's shape differs, the integrator
  reconciles. `probe` reads the shipped behaviour only.
- Until §4.0's existing-file edits land, `npm run typecheck` fails only on `CreateSessionInput.size`,
  `CaptureChoice.size`, `Session.cellWidths` and the `sessions:attach` tuple; each builder lists those errors and no
  other.

### 9.3 The builders' briefs

- **`sizes`**: §4.1 and §4.0's new file. Run the new tests, `src/main/attach/__tests__`, `src/main/sessions/__tests__`,
  `src/main/tmux/__tests__`, `src/main/machines/__tests__`, `src/main/restore/__tests__` and
  `src/renderer/terminal/__tests__` by directory, then the whole suite. Then drive the shipping `tmux.createSession` and
  `attachPlan` through the pinned tsx against a scratch 3.7b server with **real Claude Code and real Codex** as the pane's
  command (§0's real-agent rules; at most 12 turns): a session made at 124 by 39 starts its program at 124 by 39 (read
  from `#{pane_width}x#{pane_height}` and the agent's first frame), and an attach client spawned at that size causes no
  resize (`client-resized` hook count 0). Report the turns.
- **`widths`**: §4.2. Run the moved and new tests, `src/main/screen/__tests__`, `conformance:pocket`,
  `conformance:pocket:hostile`, and `P337_ARMS=NONE node build/p337/measure-screen.mjs --check` (9 s), then
  `node build/ablation-p313.mjs` with `P313_ARMS` limited to the Z12 arms if it takes them (read its header).
- **`frames`**: §4.3, then a scratch 3.7b server with a stand-in that holds a synchronized frame open 600 ms
  (`ESC [ ? 2026 h`, a row half written, the rest after 600 ms, `ESC [ ? 2026 l`): the shipping `scrollPaneBy` entering
  inside the frame leaves a view whose rows equal `capture-pane -p` of the closed frame after the settle, and at the
  parent's code it does not.
- **`copy`**: §4.4. Run its tests and `src/renderer/terminal/**/__tests__` by directory.
- **`links`**: §4.5, then the shipping `attachPlan` argv attached through a pty to scratch 3.7b and 3.6a servers (§2.5's
  rig) reading `client_termfeatures`; `conformance:machines`.
- **`gate`**: §7.1; report the rule and ablation counts; each ablation red on its own rule, the control green.
- **`probe`**: §8; `--grader-self-test`, and one HEAD-only dry launch under a lock slot that reaches the first arm and
  ends cleanly (its readings not graded).

Every builder runs `npm run typecheck` and `npm test` (history block; the twelve environmental failures named) before
it returns, and returns every file it changed with its line counts, its commands with exit codes, and its real turns.

## 10. The proof, run rather than read (Tier 3)

Both lenses work at the parent (`wt-p368-parent`, never rebuilt) and at HEAD (`wt-p368`, built by the integrator), the
parent first in every pair, one Electron at a time, each pair in ONE session (record `os.loadavg()` at each run's
start). §2's numbers are the spec step's; a lens measures the parent again and does not copy them. **Each lens names the
independent method it used that no builder used.**

### 10.1 Lens A: the behaviour (Method 1 the parent; Method 2 real agents)

- **A1, the gates once at HEAD**: `npm run typecheck`, `npm run build`, `npm test` (block), `conformance:terminal`,
  `conformance:pocket`, `conformance:pocket:hostile`, `conformance:pathdoors`, `conformance:machines`,
  `conformance:farattach`, `gate:contract` (byte for byte). Once; then the methods below.
- **A2, `probe:p368` at both builds** (§8, arms a to f), parent first.
- **A3, the census by the lens's OWN driver** (not §2's `census.mjs` and not the probe's): every surface of §2.1 plus the
  split and the bundled-font first mount, at both builds, counted at the server and at the pane; HEAD's table against the
  parent's row by row.
- **A4, Method 2, real agents (his word of 2026-11-14)**: real Claude Code and Codex in scratch tmux, the vendored 3.7b
  and Homebrew's 3.6a, at the parent's and HEAD's create and attach code (driven through the pinned tsx: the shipping
  `tmux.createSession` and `attachPlan` of each checkout), each giving a long Markdown reply with emoji, code blocks,
  long commands and links, with tab returns, a transient and a drag mid-reply; the lens's OWN ledger check over
  `capture-pane -p -S - -E -` for duplicated, lost, cut and letter-in-gap rows; the recordings replayed into the app for
  A2's arms d to f. At most 12 turns; versions read once.
- **A5, every other agent by its recordings**: the committed screens (`build/fixtures/**`) drawn into panes for items 4,
  6 and 7 at both builds; research 145 §7.1's table filled in per row, each cell marked measured or read.

### 10.2 Lens B: the attack (Method 3)

- **B1, the attach under load and a resize storm**: CPU load in the renderer (a busy loop through CDP during the
  attach) and 100 sizes in 2 s from the window; HEAD's pane never at 80 by 24; the program's last size equals the pane's.
- **B2, the far side**: the loopback scratch machine (`build/scratch-machine.mjs`) on 3.6a and 3.7b: the far attach argv
  with and without `-T hyperlinks` read from the process table; links reaching the attach client; a far program and
  server below 3.4 (3.5a is buildable; below that, a stand-in program whose `-V` says `3.3a`) keep today's argv; a far
  session's widths are today's (D7). 3.6, 3.6b and 3.7c built by `build/build-tmux-version.mjs` and measured as §2.5 did.
- **B3, a hostile fixture of the lens's own**: link targets research 145 did not try (a right-to-left override inside the
  host, a zero-width joiner in the host, an IPv6 literal with a user part, a 2,048- and a 2,049-byte address, a
  `javascript:` with leading spaces and mixed case, an OSC 8 with an empty target, a target that is the words with one
  character changed) and copy rows (a wide character in the last column, a row of 81 written spaces, a tab at the edge,
  a selection that ends inside a wide character): every refusal by the recorder; every copy byte by byte against a hand
  derivation.
- **B4, a full-screen agent's pane for item 7**: a stand-in on the alternate screen (Qwen's committed screen) scrolled
  and selected: xterm's path, unchanged at both builds.
- **B5, the wide character at the edge** (G7) and the stale marks (G1b, G2): history copies at both builds against
  `capture-pane -J`.
- **B6, item 5 under a real frame**: real Claude mid-reply (3.7b), the scrollback entered 30 times inside open frames
  (`#{synchronized_output_flag}` read at entry): HEAD's view after the settle holds no half-drawn row; the parent's does.

### 10.3 Not run, and why

`smoke`, `smoke:t1`, `smoke:t3`, the full `conformance:resume` and `conformance:resume:capture` (each starts Electron
outside the helper: the main session's, at landing); a signed package (his keychain); the phone and the Simulator
(nothing there moves); a real Tailscale, DNS, APNs or ssh host; any agent other than Claude Code and Codex live.

### 10.4 No regression (both builds, one session)

| Row | What | Parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | `npm test` in the block | 22,990 passed, 12 failed (the environmental twelve), 24 skipped of 23,026 | the same twelve failures, every new test passing |
| N2 | `probe:p292` | 0 findings, a to h | 0 findings |
| N3 | `probe:p209` | finding D at the spec step (§0.1 item 12) | no arm worse than the parent's in the same session |
| N4 | `probe:p167` | its plateau verdicts and rulers | PASS, no ruler worse |
| N5 | `conformance:pathdoors`, `measure:p3471` | every rule passed; its corpora | the same |
| N6 | `conformance:pocket`, `measure:p337 -- --check` | PASS, 192 rules; W both equal | PASS (Z12 at its new paths); W both equal; every other arm equal |
| N7 | `smoke:quit`, `smoke:quitdoors` | PASS; teardown 1,842 ms; doors 9 of 9 | PASS on every leg, each leg within 250 ms of the parent's in the same session or explained |
| N8 | `conformance:machines`, `conformance:farattach` | PASS | PASS, the far attach argv moved only where D18 says |
| N9 | the census (A3) | §2.1 | §8 arm c |
| N10 | the WebLinksAddon on a drawn address with no OSC link | opens it | opens the same address |
| N11 | path links on an emoji row | (measured) | the link's columns on the drawn path, never fewer links than the parent |

A row worse than the parent is a defect: fixed, or the part dropped and named.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command; every `gmux-p368*` socket gone or with no server answering; the history
stats; the reports folder by name and mtime; every lock slot this role took released; real turns counted.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `git -C /private/var/tmp/tortie-wt/wt-p368 diff --stat 8497c34c` (only the files of §9.1); apply §4.0's edits to
   `src/shared/types.ts`, `src/shared/ipc/base.ts`, `src/shared/ipc/sessions.ts`.
2. `npm run typecheck` (zero errors).
3. `node build/contract-inventory.mjs --check` (byte for byte).
4. `npm test` (block, scratch HOME, `TMPDIR` through `/var`; the twelve environmental failures named, every other green).
5. The CLAUDE.md rows, CHANGELOG items, `package.json` scripts, `verification-checks.mjs` classifications and
   `HELPER_USER_FLOOR` 190 of §4.7.
6. `npm run build` (`gate:electron` 190 of 190; `gate:checks` classifies both new scripts; the contract byte for byte).
7. `npm run conformance:terminal` (nine rules and every ablation red on its own rule).
8. `npm run conformance:pocket`, `npm run conformance:pocket:hostile`, `npm run conformance:pathdoors`,
   `npm run conformance:machines`, `npm run conformance:farattach`, `npm run conformance:endtree`, and
   `npm run conformance:hue` (no Electron; CLAUDE.md budgets about 13 minutes; for `serialize.ts`).
9. `P337_ARMS=NONE node build/p337/measure-screen.mjs --check` (block, slot; both W equal).
10. `node build/p368/probe-p368.mjs --grader-self-test` (block).
11. `npm run smoke:quit` and `npm run smoke:quitdoors`, each under a lock slot.
12. `npm run package -- -c.mac.identity=null` under a lock slot (§0's environment; the log names no Developer ID), then
    `release/` removed.
13. `git diff --stat 8497c34c` again; this file's §As built (what moved, the seams reconciled, every command's numbers);
    the Electron count, the sockets, the history stats, the reports folder.

## 12. What is NOT in this phase

- No change to how any agent is launched: Claude and Codex stay inline (Phase 331), no full screen, no
  `FORCE_HYPERLINK`.
- No join of rows an agent broke itself, no Copy as One Line, and no ink guard on the history path (§2.6).
- No history path for a selection that never scrolled (the fix round took item 7 back out: `-J` glues rows a
  program redrew apart under a stale wrap mark, and no guard measured is never worse than xterm's own path).
- No OSC 52 handler.
- No `file:`, `vscode:` or relative link, and no path door for a link's target.
- No change to tmux's resize timer, no `window-size manual`, no tmux patch, no server option and no change to
  `src/main/tmux/server-options.ts`.
- No layout settle and no settled window drag (Q10, Q12).
- No width table for another machine's sessions (Q11).
- No Unicode addon or any other new dependency.
- Nothing on the phone.
- Nothing only Anthropic or OpenAI can fix: Claude's scrollback damage with no size change, its early return on an
  unchanged size, and Codex's partial link targets. These are reported upstream on his word.

## 13. For the main session at landing

1. The battery at HEAD (`typecheck`, `build`, vitest, `package` unsigned, `smoke:t1`, `smoke`, `smoke:t3`) and
   `measure:p337 -- --check` whole (14 to 19 minutes) and `conformance:resume:capture` with `GMUX_CONF_AGENTS=claude,codex`
   (its header read first).
2. The commit body names that `gate:contract` did not move and why (§0.1 item 3), that no menu row moved, and the four
   measurements the lenses re-took.
3. Phases 360 and 325.1 are rebuilt on top of this phase: both touch `src/main/sessions/core.ts`, `create-local.ts`
   and `src/main/tmux/sessions.ts`, which this phase changes.
4. Cleanup after the follow-up commit: the worktree, `wt-p368-parent`, `/private/var/tmp/tortie-wt/scratch/p368/`, any
   `build/vendor/tmux-probe/` the lenses built, the probe sockets, and the `p209-*` and `gmux-smoke-quit-*` run folders
   the probes left under `/private/var/folders/…/T/`.
5. The reply to the reporter (Q1) and the upstream reports (Q9) are his word.

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **Reply to the reporter now** with research 145 §11's draft? Default: asked of him; nothing posted without his word.
2. **One phase in three parts, or three phases?** Default: one.
3. **Links by the attach's client flag `-T hyperlinks`, or the server option's indexed element?** Default: the client flag.
4. **A link whose words are an address and whose target is another**: open the words, as today (default); open the
   target with the address on hover; or ask first naming the host.
5. **Claude's addresses as plain text by `FORCE_HYPERLINK=0`?** Default: no.
6. **An agent's own copy to this Mac's clipboard (OSC 52)?** Default: not in 368; a Tier 3 phase of its own.
7. **A "Copy as One Line" item?** Default: no.
8. **Claude full screen instead of inline?** Default: no, Phase 331 stands.
9. **Report upstream to Anthropic and OpenAI?** Default: on his word.
10. **A person's own window drag reaching tmux as one size when it stops?** Default: only if measured no worse than
    today; not built here (the drag sent 50 sizes and the agent saw 5, §2.1).
11. **(new) Widths for sessions on another machine.** Default: today's widths there, because a far machine's tmux build
    is not measured and a measured table can be worse than today on code points assigned in Unicode 16 and 17 (4,316 for
    3.7b's table over 3.6a's build). Other choices: the far version's measured table (right on every emoji when the far
    build matches), or the consensus table (§2.4), worse than today on neither measured build.
12. **(new) A layout settle** that sends no size for a layout change that comes back within about 100 ms. Default: not
    built, because the census found no Tortie surface that makes one, and a settle would delay every deliberate change.

## §As built (the integrator, 2026-11-16, 13:28 to 14:08)

Every reading below is under `/private/var/tmp/tortie-wt/scratch/p368/integrator/` (`logs/`, `bin/`). Every command
that needed neither Electron nor `/bin/ps` ran under the history block with `HOME` and `TMPDIR` in that scratch; the
smokes, the packaged launches and one diagnostic probe run ran outside it through `bin/unblocked.sh`, which starts them
with an EMPTY environment but for `PATH`, the user's names, a UTF-8 locale, a scratch `HOME` and `ZDOTDIR`,
`HISTFILE=/dev/null` and `SHELL=/bin/sh` (so no `CLAUDE_CODE_*`, `GMUX_SESSION_ID`, `GMUX_MANAGED`, `SSH_AUTH_SOCK`,
`TMUX` or `TERM_*` reached them). No real agent ran: 0 turns.

### What moved

48 tracked files (+1,518, −752) and 24 new files or folders, `git diff --stat 8497c34c`:

- **The seven builders' files**, each in its own §9.1 list: sizes (`src/shared/terminal-size.ts`, `core.ts`,
  `ipc.ts`, the preload, `tmux/sessions.ts`, `create-local.ts`, `restore.ts`, `remote-sessions.ts`,
  `remote-restore.ts`, `TerminalPane.tsx`, `tab-size.ts`, `sessions-slice.ts`, four tests, and the three existing
  tests it named: `unreachable-boundary`, `p350-pi-bare-name`, `attach-host`), widths (`src/shared/{cell-widths,cells}.ts`
  and their test, the three deleted `src/main/screen` files, `compose.ts`, `version.ts`, `tmux-widths.ts` and its
  test, `conformance-pocket.mjs`, `ablation-p313.mjs`), frames (`scroll.ts` and its test), copy (`capture/{index,
  serialize,history-copy,drawn-text}.ts`, `drag-select.ts`, `src/main/capture/ipc.ts`, five tests), links (the attach
  plan, host and gate, `src/renderer/terminal/links/**`, their tests), gate (`build/conformance-terminal.mjs`), probe
  (`build/p368/**` but this file, `build/fixtures/p368/`).
- **The integrator's**: §4.0 in `src/shared/types.ts` (`CreateSessionInput.size`, `Session.cellWidths`, two type
  imports and the header's note of them), `src/shared/ipc/sessions.ts` (`CaptureChoice.size`), `src/shared/ipc/base.ts`
  (`'sessions:attach': { req: [sessionId: string, size?: TerminalSize] }` and `attach(sessionId, size?)`, the tuple
  member and the parameter both named `size`, which T1 reads); §4.7 below; and the seams below.

### The seams reconciled

| Seam | Who named it | What the integrator did |
| --- | --- | --- |
| `compose.test.ts` mocked `'../cells'`, which the move deleted | widths, sizes, frames, gate | `vi.mock('@shared/cells', …)` and its `typeof import`; the file was in no list |
| `src/main/screen/sgr.ts:34` named `./cells.ts` | widths | the comment names `src/shared/cells.ts` |
| `scroll.test.ts:767-769` required every read on this Mac's way up to be `STATE_FORMAT` | frames | it admits `FRAME_READ_FORMAT` too, the entry's one frame read, imported |
| the local attach argv golden, `attach-host.test.ts:506` | links | sizes had already added `-T hyperlinks`; its comment cited D18 and now cites §4.5 item 9 |
| `conformance:machines` condition 19, the local attach argv against `b660df9` (8 findings at every builder's run) | links, sizes, widths, frames | `build/machines-conformance-probe.mts`' golden gains `'-T', 'hyperlinks'` after `-u`, and its remote plan says `hyperlinks: false`, so condition 20 still reads today's far argv; `build/conformance-machines.mjs`' header, condition 19's heading and message and its table heading say "b660df9 with Phase 368's -T hyperlinks". Neither file was in a list |
| six existing tests whose fakes had no `cols` or buffer, or that expected trailing spaces | copy | `scratch/p368/copy/patches/p368-copy-existing-tests.patch` applied as written (`git apply --check` 0): `selection`, `terminal-menu` (a fake buffer that draws the selection), `serialize`, `capture-contrast` (`cols`), `drag-select-history` (`getSelectionPosition`), `history-copy` (the line ends trimmed, D11, on purpose) |
| T1 says "three" `attachHost.attach({` sites | sizes | there are two: `attachFarUnbound` reaches the spawn through `attachListedRemote`. T1 reads the code, not a count, and is green with 9 ablations red |
| §9.3's "`client-resized` count 0" | sizes | impossible at any build: tmux sends a resize on every attach (`client.c:664`, `server-client.c:2242-2258`). The measure is `window-resized` 0 and the program's own size: HEAD 0, the parent 1, for a stand-in, real Codex 0.167.1 and real Claude Code 2.1.325 (sizes' run) |
| §4.1 step 4 "today's push stays" | gate | sizes pushes after the attach only when the pane has a box, because a pane with no box would push xterm's unfitted 80 by 24 over the attach's size, which is worse than the parent. Accepted: with a box the push is today's byte for byte |
| D10 as written re-freezes mid-frame | frames | built: entering copy mode ends tmux's hold on the frame when a client is attached (`screen-redraw.c:1325`), so the settle re-freezes at the first read of 0 and once more at the first 0 at least 1,000 ms after its start (tmux's own sync timer), then `list-clients` and `refresh-client -t <client>` for each client, a full redraw with no size. Measured by frames: parent 0 of 4 synthetic and 0 of 4 real replays, HEAD 4 of 4 and 4 of 4. Research 145 §3.6's 451 and 651 ms frames were terminators split across two reads; the longest real frames are 200 ms (Claude) and 51 ms (Codex) |
| `capture:writeRich` | copy, probe | the channel is `clipboard:writeRich`; the probe records that one; the CLAUDE.md row names it |
| §0.1 item 1's `:252` and `:278` | copy | the labels are swapped: `:278` is the begin and `:252` the teardown |
| the probe's `e.line` FAIL at HEAD, which the probe builder read as a defect in `drag-select.ts` for a drag from the first column | probe | **a probe artifact, measured three ways.** (1) The copy builder's rig with the press at column 0 (a temporary copy of `p368-parked-selection.test.ts` with `press(0, 10)`, removed at once) holds the range: 1 of 1. (2) The probe scrolls through MAIN (`window.__gmuxP95.by` is the scroll bridge), not through the pane's scroll surface, so the window learns the pane is parked only at the surface's next poll (`LIVE_POLL_MS` 1,000 ms, `scroll/surface.ts:147`); a person's wheel goes through the surface, which applies the scroll's answer at once. (3) Arm e alone at HEAD (`P368_HEAD_ONLY=1 P368_ARMS=e`, one slot, 81 s, exit 2 as a HEAD-only run must) from a temporary copy of the probe whose only change was the wait after that scroll, 900 to 1,600 ms (removed at once): `ok e.line.head-whole: HEAD copied the long shell line whole on one line while scrolled back (drag)`, with the URL, the narrowing, the Edit menu's Copy and the trailing spaces all `ok`. So `build/p368/probe-p368.mjs:1421` now waits 1,600 ms and says why; the parent never holds a selection, so its reading does not depend on the wait |
| the hostile targets: D14 offers a look-alike host, a bidi override in a path, `https:` with no slashes, backslashes and a zero-width character in a host, while §4.5's test list and §8 call them refused | links, probe | settled for the build on D14 and the entry, which refuse only a user part, more than 2,048 bytes and every scheme but http and https, and show the address a click opens with its host in ASCII: each of those opens exactly `new URL(t).href`, which the hover shows (`https://xn--pple-43d.com/`, `https://example.com/%E2%80%AEgpj.exe`). The probe accepts either outcome only when what opens is what the hover said (`HOSTILE_EITHER`). A lens attacks it; his answer to question 4 does not cover it |
| **words that are a project path under an http(s) target** | links | **open, for the lens and the main session.** xterm asks its own OSC provider first and drops a later provider's link that intersects it (`Linkifier.ts:183-210`, `_removeIntersectingLinks`), so at HEAD such words open the target in the browser where the parent opened the file in the editor. A path elsewhere on the same row still opens (the fallback loop, `Linkifier.ts:200-210`), and a non-http target (a relative or `file:` link) is not offered by xterm at all (`OscLinkProvider.ts:71-82`), so the path link still takes it. Making the handler open the file instead would be a second route, which T5 refuses; question 4's default speaks of words that are an address, not a path |
| far links | links | only where `farPairOf` holds both a server and a program from 3.4 on: a warm far server from 3.6 on records no program (`prepare.ts:643`), so its attach keeps today's argv until a set-up starts its server |
| the cold path's version | widths | `ensureServer`'s cold path records the version too, so the first launch after a reboot does not keep Unicode 6 |

### §4.7 as written

- **CLAUDE.md**: a `conformance:terminal` row after `conformance:pathdoors` (§4.7's text, "Nine rules (T1 to T9)"); a
  `probe:p368` row after `probe:p364` (§4.7's text with `clipboard:writeRich`, the recorders the probe really installs,
  the 120 to 96 narrowing, about 10 minutes a build from the probe builder's 442 s and 152 s parent launches,
  `P368_TMUX_36A`, `P368_REPORT`, `P368_HEAD_ONLY` and `P368_HEAD_CHECKOUT`); the `src/main/screen/**` row names
  `src/shared/{cells,cell-widths}.ts` and says the table lives there beside 3.6a's, Z12 holds both literals and Z7 to Z9
  read both files; the `conformance:pocket` row's arm count reads 825 since Phase 368, naming the seven.
- **CHANGELOG.md**: §5's three items, last under `## Unreleased` / `### Fixed` (the commit is a `fix`, and one commit
  goes in one section), with no commit link. **One addition to §5's text, for the main session to keep or drop**: each
  ends `Reported by [Jack Shaw](https://github.com/jackcshaw) in [#44](https://github.com/gregce/tortie/issues/44)`,
  the house shape of #33, #40 to #43 (the issue's author and display name read from api.github.com, unauthenticated,
  read only, nothing posted).
- **package.json**: `conformance:terminal` beside `conformance:pathdoors`, `probe:p368` beside `probe:p364`.
- **build/verification-checks.mjs**: `pure('conformance:terminal')` and `electron('probe:p368', …)` naming the parent
  checkout and Homebrew's 3.6a it needs. **build/assert-electron-teardown.mjs**: `HELPER_USER_FLOOR` 189 → 190, with
  the paragraph naming `build/p368/probe-p368.mjs`.
- **Native menus**: no change. **The contract**: no line moved (below).

### Commands, in order, with exit codes and numbers

| # | Command | Exit, wall | Reading |
| --- | --- | --- | --- |
| 1 | `git diff --stat 8497c34c` | 0 | 29 files at the start, every one in a §9.1 list |
| 2 | `npm run typecheck` (after §4.0 and the seams) | 0, 25 s | zero errors; import boundaries 0 violations over 1,456 files; no runtime cycles over 1,453; shared types OK |
| 3 | `node build/contract-inventory.mjs --check` | 0, 1 s | byte for byte |
| 4 | `npm test` (block) | 1, 106 s | 23,242 passed, 13 failed, 24 skipped of 23,279: the environmental twelve and `resolve.test.ts`' "hung shell that forks" at a load average of 13 to 21, which passed alone at once (40 of 40) and is in no file this phase changed |
| 5 | §4.7 | | above |
| 6 | `npm run build` | 0, 68 s | `gate:electron` "190 of them reach build/electron-run.mjs … against a floor of 190"; `gate:checks` 291 check scripts classified; `gate:background`, `gate:simulator`, `gate:docker`, `gate:knownhosts` PASS; the contract byte for byte |
| 7 | `npm run conformance:terminal` | 0, 1.5 s | PASS: 9 rules; 68 of 68 ablations red on the rule that owns each (T1 9, T2 10, T3 13, T4 10, T5 10, T6 3, T7 5, T8 3, T9 5); 24 of 24 controls green |
| 8 | `npm run conformance:pocket` | 0, 18 s | PASS: 192 rules, 25,845 checks (the parent 25,806: N2 +3, Z8 +24, Z9 +11, Z12 +1) |
| 8 | `npm run conformance:pocket:hostile` | 0, 18 s | PASS: 363 arms |
| 8 | `npm run conformance:pathdoors` | 0, 13 s | every rule passed |
| 8 | `npm run conformance:machines` | 0, 38 s | PASS (condition 19 against the new golden; 20 to the far argv unchanged) |
| 8 | `npm run conformance:farattach` | 0, 1 s | PASS: 11 rules |
| 8 | `npm run conformance:endtree` | 0, 2 s | PASS: 16 rules, 84 self-tests |
| 8 | `npm run conformance:hue` | **1**, 13 min 54 s | **19 failures, every one rule 26 on `src/main/screen/palette.ts`'s 19 colour literals**, a file and a gate this phase does not touch: both are byte identical at the parent (sha256 `5729b958…` and `8213fc21…` at both, 19 literals at both), last changed by `d3d59055` (Phase 337) and `bb3e00c3`. So the parent fails the same 19, red since Phase 337 and unseen because `palette.ts` triggers no hue run. Every other rule held; rule 29 (the capture floor the serializer calls) green, and its ablation red |
| 9 | `P337_ARMS=NONE node build/p337/measure-screen.mjs --check` (block, one slot) | 0, 9 s | PASS 37b W (925 ranges, tally 0: 2,332, 1: 135,461, 2: 122,238) and PASS 36a W (937 ranges, tally 0: 2,374, 1: 130,946, 2: 126,711), both equal the fixture, sequences equal; its report moved out of `/private/tmp` to `logs/p337-measure-6301.json` |
| 10 | `node build/p368/probe-p368.mjs --grader-self-test` (block) | 0, under 1 s | PASS: 7 recorded readings, 68 breaks each turning its own clause; 6 fixtures, 595,338 of 600,000 bytes; 5 planted redaction breaks refused |
| 11 | `npm run smoke:quit` (one slot, unblocked) | 0, 116 s with its build | PASS 2 of 2 legs: held (SIGKILL by design at 4,800 ms, 0 dumps, 0 reports), teardown exit 0 after 4,060 ms (the spec step's parent read 1,842 ms at a quiet load; this ran beside `conformance:hue` at a load average near 25, so the lens compares in one session) |
| 11 | `npm run smoke:quitdoors` (one slot, unblocked) | 0, 109 s with its build | PASS 1 of 1 leg, 9 of 9 doors |
| 12 | `npm run package -- -c.mac.identity=null` (one slot, `bin/package.sb`: the history block plus no write to `ELECTRON_BUILDER_CACHE` or the shared pkg home) | 0, 57 s | `skipped macOS code signing reason=identity explicitly is set to null`; "Developer ID" 0 times and `identityName` 0 times in the log; the nested `specstory`, `rg` and `tmux` ad-hoc with the runtime; 27 Mach-O files, every one arm64; 7 externalized requires present; the Electron zip in the scratch home not fetched again (123,832,592 bytes, mtime `1794241373`, as the shared copy); DMG 166,641,512 and ZIP 166,282,443 bytes; the bundled tmux says 3.7b. `release/` (781 MB) removed |
| 12 | the packaged launch (`bin/pkg-launch.mjs`, below; one slot each) | 1, 1, **0**; 22, 21, 23 s | below |
| 13 | the closing battery (block): `npm run typecheck`, `npm run build`, `npm test` | 0 (3 s), 0 (114 s), 1 (106 s) | the build as at 6; the tests 23,243 passed, **exactly the environmental twelve failed** (`process-table.native` 1, `ps.native` 2, `p269-env-names` 1, `store-watch.native` 1, `p365-process.native` 3, `repo-watcher.native` 4), 24 skipped of 23,279: 253 tests more than the parent's 23,026, all passing, at a load average of 75 to 88 |
| 13 | `node build/contract-inventory.mjs --out logs/contract-regenerated.txt`, `cmp` with the baseline | 0 | byte identical: 590 lines, 0 moved. The baseline lists invoke channel NAMES (`[ipc.invoke.channels] count=250`, `sessions:attach` at `:208`), `[env.names] count=119`, `[harness.smoke.modes] count=39`; the attach's new argument, the create's and restore's size and the row's `cellWidths` move none, and no channel or `GMUX_*` name was added |
| 13 | `git diff --stat 8497c34c` | 0 | 48 files, +1,518, −752, and the 24 new entries |

### The packaged launch

`node build/harness-socket.mjs --fresh gmux-p368pk 'node <scratch>/bin/pkg-launch.mjs'`: ONE Electron, the package's
own `Contents/MacOS/Tortie` (`program: 'packaged'`), through `withElectron` with the run's socket as its `tmuxSocket`,
every probed agent row hidden (`hiddenAgentsBesides([])`) and `agents:list` read back before anything ran ("nothing
resolved in the app's own scan", 15 rows), in `GMUX_SHOT` mode (an isolated harness launch: no version probe, no
updater, its own exit after one window capture into the run's folder) with a scratch folder as its launch argument.
Its one `GMUX_SHOT_JS` adds that folder, creates a SHELL session there with `size: { cols: 101, rows: 31 }`, waits 2 s,
attaches it at 101 by 31, waits 5 s and detaches; this script read the run's own server every 100 ms with the vendored
3.7b and `/bin/ps`. Run 3, exit 0, 22.4 s from launch to the app's own exit:

| ms | The created session's window | Its attach clients |
| --- | --- | --- |
| 14,454 | 101x31, no client (item 2, the create's size, with the package's own tmux) | none |
| 14,599 | 142x42 | the window's own pane attached the session the app made active, at its own fit, never 80 by 24 (item 1) |
| 14,710 | 142x42 | `/dev/ttys022` 142x42, features `bpaste,ccolour,clipboard,hyperlinks,cstyle,focus,RGB,title`; its command `…/Tortie.app/Contents/Resources/bin/tmux -u -T hyperlinks -L gmux-p368pk-… -f …/Resources/gmux-tmux.conf attach-session -t =$1` (item 9) |
| 16,667 | 101x31 | `/dev/ttys023` 101x31, the same features: the expression's own attach at 101 by 31 replaced the pane's client |
| 21,637 | 101x31 | none (detached); the app exited 0 by its shot |

Runs 1 and 2 graded FAIL by this script's own first two readings, not the app's: run 1 took the app's control client
(`gmux-control`, 80 wide) for the attach client, and run 2 required the first client at the expression's size when the
window's own pane attaches first at its own fit. The app read the same in all three. **What this does not prove**: an
unsigned app carries no hardened runtime and no entitlements; a signed launch needs his identity, which the hard
rules keep out of reach.

### Not run, and why

- `smoke`, `smoke:t1`, `smoke:t3`: the main session's alone.
- `conformance:resume` and `conformance:resume:capture`: `npm run conformance:resume` starts `electron .` inside
  `build/harness-socket.mjs`, outside `build/electron-run.mjs`, so §0 gives both to the main session at landing, with
  `GMUX_CONF_AGENTS=claude,codex`. Its header (`src/main/conformance/resume.ts:20`) says capture mode asserts "gmux
  captured an agent session id + a resume argv INTO THE" manifest: the main session should read whether that capture
  reads an agent's own store before running it.
- `measure:p337 -- --check` whole (14 to 19 minutes): the main session's; its W arm ran (9).
- `probe:p368` at both builds, `probe:p292`, `probe:p209`, `probe:p167`, `measure:p3471`, the census, real agents and
  the far side: the lenses' (§10). The one probe launch here was the diagnosis above, HEAD only, arm e.

### At the end

- **Electrons** (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`): his
  Tortie (94808) and its crash handler (94828), and the crash handlers of Slack, Granola, Cursor, Claude and Chrome.
  Nothing from this worktree or its package.
- **Sockets**: no `gmux-p368*`, `gmux-smoke-quit-*` or `gmux-p144-doors-*` socket under `/private/tmp/tmux-501/`.
- **Slots**: `electron.lock` taken and released by a trap eight times (the width measurement, the two smokes, the
  package, the three packaged launches, the diagnosis), one at a time; every slot free at the end.
- **DiagnosticReports**: 28 entries before the first Electron (13:47) and 28 after (14:07), identical by name and mtime.
- **His history**: `746658 1794849980` and `23166 1790702242` at 13:28. The zsh file grew once, by 155 bytes, at 13:43:30,
  while every process of this role was inside the history block (the hue gate, the width measurement, the grader self
  test); nothing was started for the next 3 minutes and it did not move again (13:46:51); it then read
  `746813 1794854610` and `23166 1790702242` through every unblocked run to the last reading at 14:07:27. The builders
  saw it grow at 11:34:40, 12:03:07, 12:03:51, 12:11:09, 12:26:06 and 12:26:20, each while their own processes were
  blocked.
- **Strays, disclosed**: the first `cd`, `cat > …claude-rows.mjs` (a quoted heredoc into this scratch) and some
  `grep`/`tail` pipelines after blocked commands ran in the tool's own non-interactive shell rather than under the
  block; `npm test`'s first run went through `npx --no-install vitest run`, the same `vitest run`.

### The fix round (the fixer, 2026-11-16, 16:18 to 17:44)

Both lenses answered `needs_work`. The fix ran once, in this worktree, over the integrator's tree; every reading is
under `/private/var/tmp/tortie-wt/scratch/p368/fixer/`. No real agent ran: **0 turns of the 6 allowed**, because every
fix is the renderer's and the recordings in `build/fixtures/p368/` (real Claude Code 2.1.325 and Codex 0.167.1 bytes)
carry every shape the fixes touch; the create and attach code Lens A drove with real agents is not touched by this round.

| # | Problem (lens, severity) | Fixed, dropped or narrowed | What changed |
| --- | --- | --- | --- |
| 1 | A pane mounted while the work area is hidden (Catch Me Up, the editor's fill) spawned its client at the window's last fitted size beside xterm's unfitted 80 by 24: 34 of 39 and 34 of 42 rows garbled until a window resize, the parent clean (B, major) | **Fixed** | `settleForAttach` (`src/renderer/terminal/tab-size.ts`) puts the terminal at the size the attach will name BEFORE the client is spawned and answers the terminal's own size; with nothing known that is its own 80 by 24, the parent's behaviour. `TerminalPane.tsx` calls it between `sizeForAttach` and `gmux.sessions.attach`, with nothing awaited between. D4 amended. Main's own fallback (the last size it heard) is no longer reached by a pane, because it is a size the pane's terminal was never put at |
| 2 | Words that are a project path under an https target opened the web page where the parent opened the file in the editor (A and B, major) | **Fixed** | D14 rule 0 (`link-rules.ts` `pathMayDecide` and `pathUnder`; `pane-link-handler.ts` `pathFor` and `paths`; `TerminalPane.tsx` hands the pane's own `PathLinkProvider` to the handler). When no address the web reading finds holds the pointer's cell, the handler asks the path provider for the clicked row, and a path link holding that cell opens through the provider's own `activate` (its door asked again), as the parent's click did. One route per kind: `window.open` for a web address, the path provider's link for a path. A path draws no hover line, as a path link draws none |
| 3 | A cut link compared 8 characters of the continuation: `https://good.ex` above `ample.com/login`, linked to `https://good.example.co.evil.io/x`, opened that host from both rows (B, major) | **Fixed** | D14 rule 3: a cut is W reaching its row's last cell (`endsAtEdge`) and the rows after it spelling the rest of T EXACTLY (`isCutAddress`: each row's first word a piece, a middle piece filling its row, the last a whole word or one less closing punctuation); a later row of a cut-looking link whose rows do not spell T opens nothing (`cutFirstRow`), as the parent's click there did. `CUT_PROBE_CHARS` is gone |
| 4 | Item 7 held a selection that never scrolled as history, composed through `-J`: over research 142's stale wrap marks 4 lines where the screen draws 11, three of them rows drawn apart glued (B, major) | **Dropped** | `drag-select.ts`'s code is the parent's again, byte for byte; its header records the measurement and the refusal (the ink guard still glues G2, which the parent copies as drawn, so no rule measured is never worse). `drag-select-history.test.ts` is the parent's again; `p368-parked-selection.test.ts` now pins the parent's behaviour (7 tests). D13 superseded, §1 item 7 and §12 say so |
| 5 | A double or triple click on a wrapped line while scrolled back copied its first row, against CHANGELOG item 2 (A, minor) | **Narrowed** | With 4 the claim is gone: CHANGELOG item 2 and §5 no longer say a line copied while scrolled back stays one line |
| 6 | The first session a launch creates, before any pane has a size, is made at 80 by 24 (A, minor) | **Narrowed** | CHANGELOG item 1 and §5 now say "a session started before Tortie has shown one ... can still make the agent repaint". Not built: its size is a terminal that does not exist yet, which only xterm's own cell measure answers, and a measuring terminal is a fourth renderer terminal the phase does not need; the entry's item 2 already says a create with no size known keeps today's |
| 7 | The gate stayed green with the hover showing the raw target, item 7 holding live selections and another machine's row carrying this Mac's table (B, minor) | **Fixed** | `build/conformance-terminal.mjs`: T1 (`settleForAttach`), T3 (D7: `cellWidths` once, only under the branch for rows on this Mac), T4 (item 7 stays out) and T5 (the path route and D16's hover) widened, 12 ablations and 4 controls more (§7.1's note). The attack lens's own three plants, re-applied by its own edits to a `cp -Rc` copy, now each read red on the rule that owns it |
| 8 | The probe's graders: the parent losing 3 of 4 races at 30 ms read UNREAD; a detach hook across a step boundary read `c.tab-away-1`, `c.tab-back-1` and `c.split-partner-ended` red; arm d compared text, 8 rows at the parent where cells give 94 (A, minor) | **Fixed** | `a.parent-lost-race` true at one lost race at either delay; the census compares the program's sizes and the sizes the client was given, attaches and detaches printed beside; arm d compares CELLS (`tmuxColumns` and `cellDiffs` in `graders.mjs`, the committed widths and the seven rules written again from their words; the probe's kit reads `cellRows`), the text count kept beside it |
| 9 | The census FAILED when the probe's own PATH held no tmux (A, nit) | **Fixed in the grader** | A census whose tmux could not be run reads UNREAD; the probe's header and its CLAUDE.md row say to keep a tmux on the outer PATH |
| 10 | `-T hyperlinks` on the local argv fails a development build on a tmux before 3.2 (B, nit) | **Documented** | DEVELOPMENT.md already asks for tmux 3.6 or newer; it now says why older fails |

Arm e's grader follows 4 (each scrolled-back copy that never scrolled must equal the parent's, line ends trimmed, by
`e.url.head-as-parent` and `e.line.head-as-parent`; `e.url.dbl-whole`, `e.*.head-whole` and the two `no-worse` rows
are gone, and the parent's broken copy is printed). Arm f gained `f.head-pathword` and `f.head-cut` over two rows drawn
in the hostile session at 120 columns: a project file (`README.md`, written into the project) linked to
`https://example.com/readme-elsewhere`, read by main's recorder and the editor's tab strip polled for 8 s; and two
links cut at the pane's edge, one whose target is not what its rows draw, one honest, each clicked on both rows. Every
click now records what D14's mirror needs (whether W reaches the edge, the rows around it), and the hover and the open
are polled (1.5 s and 2 s) because rule 0 can wait on the path door.

#### Commands, in order, with exit codes and numbers

| # | Command | Exit, wall | Reading |
| --- | --- | --- | --- |
| 1 | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` at 16:18:02 | 0 | `746902 1794858458` and `23166 1790702242` |
| 2 | `find ~/Library/Logs/DiagnosticReports -type f` by name and mtime | 0 | 45 entries before anything ran |
| 3 | vitest `p368-first-fit`, `p368-parked-selection`, `drag-select-history` (block) | 0, 0.3 s | 43 of 43 (28, 7, 8) |
| 4 | vitest `src/renderer/terminal/links` (block) | 0, 8.7 s | 52 of 52 (`p368-link-rules` 35, `p368-web-reading` 17) |
| 5 | `npm run typecheck` (block), twice | 0, 0 | zero errors; import boundaries 0 violations over 1,456 files; no runtime cycles over 1,453 |
| 6 | `node build/conformance-terminal.mjs` (block) | 0, 1.1 to 1.5 s | PASS: 9 rules, **84 of 84 ablations red** (T1 13, T2 10, T3 16, T4 13, T5 16, T6 3, T7 5, T8 3, T9 5), **32 of 32 controls green** (the integrator's 68 and 24) |
| 6 | `node build/conformance-terminal.mjs --root <the parent>` | 1 | FAILED, 8 of 9 rules red, as it must |
| 7 | `node build/p368/probe-p368.mjs --grader-self-test` (block) | 0, under 1 s | PASS: 7 recorded readings, **91 breaks** each turning its own clause (the integrator's 68; 92 after row 16's control); D14 reference 18 cases, `tmuxColumns` 8, `cellDiffs` 2, `letterInGap` 4; 6 fixtures, 595,338 of 600,000 bytes |
| 8 | vitest `src/renderer/terminal src/shared` (block) | 0, 4.3 s | 77 files, 1,304 tests |
| 9 | `npm test` (block, scratch HOME, `TMPDIR` through `/var`), 16:55:35 to 16:57:18 | 1, 103 s | 23,252 passed, **12 failed**, 24 skipped of 23,288 (1,215 files passed, 6 failed, 4 skipped of 1,225), at a load average of 228 to 291. The six failing files run alone fail exactly the environmental twelve: `process-table.native` 1, `ps.native` 2, `p269-env-names` 1, `store-watch.native` 1, `p365-process.native` 3, `repo-watcher.native` 4 |
| 10 | `npm run build` (block), 16:58:12 to 16:59:35 | 0, 83 s | `gate:electron` 190 of 190 against a floor of 190; `gate:checks` 291 check scripts classified; `gate:background`, `gate:simulator`, `gate:docker`, `gate:knownhosts`, `conformance:ios`, `conformance:harnessprobes` PASS; the contract byte for byte |
| 11 | `npm run conformance:pathdoors` (block) | 0 | every rule passed (the path provider's registration in the pane moved into a const) |
| 12 | `bin/lens-ablations.mjs` (block) over a `cp -Rc` copy of `src/`, `package.json`, `resources/` | 0 | the attack lens's three plants (the remote row's edit verbatim; the hover's and item 7's rewritten for the fixed code, the same effect) and the hidden pane's shape: the hover showing the target **T5 red**, item 7 put back **T4 red**, another machine's row given the table **T3 red**, the attach with the wanted size **T1 red**; the untouched copy PASS 84 of 84 and 32 of 32; every file restored, sha256 equal to the worktree |
| 13 | `bin/run-attack.sh` (the attack lens's own driver, copied and repointed; one slot, unblocked, `env -i`, scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `SHELL=/bin/sh`), parent then HEAD, 17:00:14 to 17:09 | 0 | below; his history `746902 1794858458` and `23166 1790702242` before and after |
| 14 | `smoke:quit` and `smoke:quitdoors` by their harness lines (one slot, unblocked, the same environment; `out/` the fix round's build, no source newer) | 0 in 5 s, 0 in 2 s | PASS 2 of 2 legs (held: SIGKILL by design after 2,427 ms, 0 dumps, 0 reports; teardown: the real quit exit 0 after 1,939 ms) and PASS 1 of 1 leg, 9 of 9 doors (SIGKILL after 1,757 ms by design) |
| 15 | `probe:p368` at the parent and HEAD, all arms (`bin/run-probe.sh`: one slot, unblocked, the same environment, Homebrew's folder on the outer PATH for the census, `P368_KEEP=1`), 17:08:27 to 17:32:07 | 1, 23 min 40 s (parent 607 s and 158 s, HEAD 510 s and 144 s, load average 75 to 520) | 113 rows: 98 ok, 2 FAIL, 2 UNREAD, 11 info. Every clause of arms a, b, d and f ok, `f.head-pathword` and `f.head-cut` among them (below). FAIL `c.fullscreen-on`: the parent's client told 60x33 twice, 7 ms apart, HEAD's once, the program nothing at either, which the census now reads as one size (16); FAIL `e.command.as-parent`: HEAD's drag landed one row below the reporter's command (17, 18). UNREAD `c.viewport-8ms` and `c.fullscreen-off`: the parent's window took neither step under this load, as Lens A met |
| 16 | the graders over run 15's recorded readings, the census comparing the DISTINCT sizes a client was given (pure, block) | 1 | 113 rows: 99 ok, 1 FAIL (`e.command.as-parent`), 2 UNREAD (the parent's two steps); `c.fullscreen-on`, `c.tab-away-1`, `c.tab-back-1` and `c.split-partner-ended` equal; the self-test then PASS at 92 breaks |
| 17 | `probe:p368` arm e alone at both builds, unchanged, 17:33:52 to 17:36:31 | 1, 2 min 39 s | the same: HEAD's copy of the command began one row low (`--verbose …`), the parent's whole; every other arm e clause ok. Reproducible, so diagnosed: the stand-in logs a mark the moment it has WRITTEN its chunk, and the probe read the rows and placed its drag within milliseconds, racing the redraw |
| 18 | `probe:p368` arm e alone at both builds, the rows read until two reads 250 ms apart agree before the drag (both builds), what xterm selected recorded, 17:37:50 to 17:41:48 | **0**, 4 min | **PASS, 15 of 15 clauses**: `e.command.as-parent` ok, both builds' selections the same cells (row 18 column 2 to row 20 column 100, alternate screen, viewport 0), the copy 3 lines exactly as the parent's; `e.url.head-as-parent` (drag, select all, double and triple click) and `e.line.head-as-parent` ok |
| 19 | a temporary vitest file (removed at once) printing 751,247 bytes of agent-shaped text into an unopened xterm, four times each | 0 | Unicode 6 median 30.1 ms (18.2 to 67.6), tmux 3.7b's table median 23.7 ms (18.4 to 126.4, the first a warm-up): the width provider costs the print path nothing measurable, so 17 was the probe's race and not a slower HEAD |

**The attack re-run, the parent beside HEAD** (one Electron at a time, 3.7b, recorders on `shell.openExternal`,
`openPath`, Electron's clipboard writers and `clipboard:writeRich` before the first click; load average 85 to 520 from
his own work):

| Item | Parent | HEAD before the fix (the lens) | HEAD now |
| --- | --- | --- | --- |
| Catch Me Up open, another session chosen, closed (H) | hidden: xterm 80x24, client 80x24; shown: 0 of 39 rows wrong; program 80x24 then 124x39 | 34 of 39 wrong | hidden: xterm 124x39, client 124x39; shown: **0 of 39 wrong**; program given **no size** |
| Catch Me Up and the menu bar's session row (H2) | 0 wrong; program 80x24 then 124x39 | clean, once with a 167x40 detour | **0 wrong**; program **no size** |
| The editor filling the row and the menu bar's row, 1800 by 1000 (H3) | hidden: xterm 80x24; shown 0 of 42 wrong; program 80x24 then 103x42 | 34 of 42 wrong | hidden: xterm 103x42, client 103x42; shown **0 of 42 wrong**; program **one size**, 103x42 |
| Catch Me Up opened and closed six times over a visible pane | 0 sizes | 0 | 0 |
| L17, `notes/guide.md` linked to a GitHub address | no browser; the file opens (late under load, seen in L18's tab strip) | the GitHub address to the browser, no tab | **no browser; the file opens** (late under load, seen in L18's tab strip, as the parent) |
| L19, `https://good.ex` above `ample.com/login`, target `https://good.example.co.evil.io/x` | row 1 `https://good.ex/`, row 2 nothing | the other host from both rows | row 1 **`https://good.ex/`**, row 2 **nothing** |
| L16, drawn `…/xyVISIBLE`, target `…/xyHIDDEN` | row 1 `https://good.example/a/`, row 2 nothing | the hidden target | row 1 **`https://good.example/a/`**, row 2 **nothing** |
| L14, an honest cut | row 1 its first part, row 2 nothing | the whole target from both | the whole target from both rows, hover the same |
| L15, `https://good.example` above `.evil.example/x`, target exactly those rows joined | row 1 `https://good.example/`, row 2 nothing | the whole target from both | the whole target from both rows, `https://good.example.evil.example/x`, hover the same: the host the rows spell across their end |
| Hostile targets (L03 to L09, L07 2,049 bytes) | nothing | nothing | nothing, no hover, no `confirm()` |
| Plain words over an https target, a shell's `printf` OSC 8 | nothing | the target, hover honest | the target, hover honest |
| Stale marks scrolled back, a drag that does not scroll (G) | 11 lines, 0 joined reads | 4 lines, 1 joined read | **11 lines, 0 joined reads, byte for byte the parent's** |
| Stale marks scrolled back, select all | 42 lines, 0 joined | (glued) | **42 lines, 0 joined, equal to the parent's** |
| Live edge rows by a drag, select all, a drag ending inside a wide character (C) | 669 and 1,146 bytes, `ab` | equal to the parent | **byte for byte the parent's** |
| 100 window sizes in 2 s, a re-attach mid-storm, main busy 60 ms per attach (S, 1800 by 1000) | program saw 80x24 (10 sizes); all end 190x42; grid 0 | never 80x24 | **never 80x24** (10 sizes); all end 190x42; grid 0 |

#### What is still worse than the parent

**Nothing measured is worse than the parent after the fix round.** Each regression the lenses named now reads as the
parent: the hidden pane 0 of 39 and 0 of 42 rows wrong (the parent 0 and 0; before the fix 34 and 34); the stale-mark copy
11 lines, byte for byte the parent's (before the fix 4); the project file under a web link opens the file and hands the
browser nothing, in the attack run and in `f.head-pathword` (before the fix the browser got the web page); the
cut-looking links open the first row's words and nothing from their second row, as the parent, never the other host
(before the fix the other host from both rows); `f.head-cut` holds the same on the probe's own rows.

Said so he can rule, because they differ from the parent without measuring worse:

- **A link cut at the pane's edge whose rows spell its target exactly opens the whole target from both rows**: the honest
  cut (L14) and `https://good.example` above `.evil.example/x` linked to `https://good.example.evil.example/x` (L15),
  where the parent opened the first row's text from the first row and nothing from the second. The host opened is the one
  the rows spell read across their end, and the hover line shows it before the click. A target that only begins like
  the rows opens the words.
- **Words with no address over an http or https target open the target, with an honest hover**, where the parent opened
  nothing: Claude's link labels, plain words, a shell's own `printf` of OSC 8. Unchanged from the integrator's build;
  both lenses read it as not worse.

Given back, so equal to the parent rather than better: **a selection made while scrolled back that never scrolled** (a
drag, select all, a double or triple click) copies as the parent does, a wrapped Codex address over 2 lines and the
long shell line over 3 (item 7 is out); **the first session a launch creates before any pane has a size** is made at 80
by 24, as the parent's. CHANGELOG items 1 and 2 say so.

Not re-measured by this round, because nothing it changed reaches them, and each lens's reading stands: `probe:p167`,
`probe:p209`, `probe:p292` (drag-select.ts is the parent's code again), `measure:p3471`, `conformance:hue`,
`conformance:machines`, `conformance:pocket`, `conformance:farattach`, `conformance:endtree`, `measure:p337`, the
far side, a package, and real agents (0 turns). Two census rows stayed unread at the parent under this load (the 8 ms
viewport and full screen off: the parent's window took neither step), as they did for Lens A.

#### At the end

- **His history**: `746902 1794858458` and `23166 1790702242` at 16:18:02 and at every reading after: before and after
  the attack re-run, the full probe, both arm e runs and the quit smokes, and last at 17:43:31. Unmoved.
- **DiagnosticReports**: 45 entries before anything ran and 45 at 17:43, identical by name and mtime; this round added none.
- **Electrons** (CLAUDE.md's command): his Tortie (94808) and its crash handler (94828), and the crash handlers of Slack,
  Granola, Cursor, Claude and Chrome; no process names a profile of this round.
- **Sockets**: no `gmux-p368*`, `gmux-p368fix*`, `gmux-smoke-quit*` or `gmux-p144-doors*` socket under
  `/private/tmp/tmux-501/`.
- **Slots**: `electron.lock` four times (the attack re-run, the quit smokes, the two arm e runs) and `electron.lock2` once
  (the full probe: it started beside the attack driver's idle tail once its Electrons had ended, and the quit smokes ran on
  `electron.lock` during it, two of this round's runs at once), each released by its own trap;
  every slot free at the end.
- **The delta**: `git diff --stat 8497c34c` 48 files, +1,462, −756, and the same 24 new entries; the parent checkout clean.
- **Strays, disclosed**: the history stats, `ps`, `uptime`, `memory_pressure`, the lock's status and `tail`s of this
  round's own logs ran in the tool's non-interactive shell outside the block, as did the run scripts by design; one
  `/bin/sh -c` heredoc failed on its own quoting and wrote only into this round's scratch; a temporary benchmark file
  under `src/renderer/terminal/__tests__/` (row 19) was removed the moment it had printed.
