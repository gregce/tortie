# Phase 337.1 — terminal first: the session opens on its terminal, the terminal scrolls back, and the phone's Conversation becomes Catch Me Up — SPEC

Written by the spec step on 2026-10-06 in `/private/tmp/wt-p3371`, a detached worktree at origin/main `e3837139` ("docs(backlog):
the late Prepare, landed"), with Phase 337 (`d3d59055`) and Phase 340.1 (`b23135e3`) under it. Every `file:line` below was re-read
at `e3837139` on this date. **The spec step MEASURED before it wrote** (§14 holds every measurement, its command, its exit code
and its numbers): on scratch tmux servers of its own (`-L p3371s-<pid>-37b` and `-36a`, each under its own `TMUX_TMPDIR`, never
`-L gmux` and never the default server), with the vendored tmux 3.7b and Homebrew's 3.6a, a drawer that writes numbered lines and
the committed captures, the SHIPPING `TmuxControlClient` and the SHIPPING composer run through the pinned tsx; through the
loopback machine `build/with-scratch-machine.mjs` starts, with `SCRATCH_MACHINE_QUIET_SHELL=1` and `SCRATCH_MACHINE_NO_OWN_KEYS=1`;
and, under the lock (phone slot, taken as `p3371-spec` and released), the SHIPPING app and its SHIPPING UI test against the
hostile door's honest arm on an iPhone 16 Pro Simulator on iOS 26.3 and on 18.3, made and deleted only by
`build/simulator-run.mjs`. It started no Electron, no agent and no model turn; it read nothing under `~/.ssh`, `~/.claude`,
`~/.codex`, his keychain or his live Tortie profile; and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `733568
1791306712` and `23166 1790702242` before and after every command that started a shell, a server, a far session or a Simulator.

**Revised by the adversary on 2026-10-06, before any builder started** (§Attack at the end of this file). Every row it moved
names its finding as `§Attack Bn`; the rows it did not name stand as the spec step wrote them. Its measurements (§Attack, BM1
to BM3) were run on scratch tmux servers of its own (`-L p3371a-<pid>-37b` and `-36a`), with the SHIPPING control client and
the SHIPPING composer, and started no Electron, no Simulator, no agent and no model turn.

Read with it, whole: `docs/BACKLOG.md` "## Phase 337.1" and the running-log lines of 2026-10-05 and 2026-10-06 that amend it (his
rulings below; the main session's decision of 2026-10-06 that folds 337's keyboard glitch and its two missing gates into this
phase); `build/p337/SPEC.md` with its "§Attack", "§As built — 337" and "§As built — the fix round" (the Screen, its door rows,
its watcher, its composer and its phone views are what this phase changes); `docs/research/139-a-live-session-on-the-phone.md`
§3.5 and §3.8; and Paseo's scrollback at `getpaseo/paseo` `2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93` (Apache-2.0), read only,
under the session's scratchpad at `r139/repos/paseo/packages/app/src/terminal/native-renderer/headless-terminal-state.ts`,
`terminal-scrollback.test.ts` and `packages/server/src/terminal/terminal-capture.ts`.

**The order of authority.** His rulings override the entry and research 139 wherever they differ. The tree at `e3837139`
overrides the entry's picture of it. Where this file departs from either for any other reason, §3 says so row by row.

His rulings, in his words where the harness relayed them, and what each moves:

1. **"Yes, scroll back on the Screen."** His Phase 316 ruling "the full CONVERSATION yes, the raw terminal scrollback no"
   (`docs/BACKLOG.md:33393`, build/p337/SPEC.md ruling 1) is LIFTED for the Screen: the terminal scrolls back through what the
   session printed, as far as tmux keeps it.
2. **"Yes, rename it."** The phone's Conversation is **Catch Me Up**, the record the Mac's Catch Me Up reads.
3. **"lets do B."** Tapping a session in a list opens its live terminal at once, full screen. The status line (status,
   agent, project) sits under the title. Catch Me Up is an ICON in the top bar beside End, which stays top right behind Face
   ID. The terminal is named **Terminal** in the app (his word); the store text still says "the session's screen". He asked
   that Catch Me Up not be prominent, "as most people will want to use their terminal", and for icons rather than full-width
   rows. The main session settled what keeps today's behaviour whole: an ended session (no terminal) opens on Catch Me Up; the
   numbered-question buttons and End stay reachable from the terminal page; 318.1's message box later sits under the terminal.
4. **"i don't think we need paste to start."** No paste.
5. **The main session, under his delegation (the log line of 2026-10-06):** 337's iOS 26.3 glitch (after the keyboard is
   raised and put away the rows sit about 135 pt low until the first long press) is fixed here, with the scroll view this
   phase rebuilds; and 337's D5 pane clause and its 400 ms remote cadence get their gates here. The phone's build number stays
   7 (never uploaded).

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p …/scratchpad/electron.phone-wait && echo p3371 > …/electron.phone-wait/p3371-<role>`, then
  `zsh …/scratchpad/lock.sh try p3371 phone` (prints the slot or exits 1; retry every 60 s in a NEW command), remove the wait
  file once a slot is held, and release with `zsh …/scratchpad/lock.sh release <dir>` on the same command line.
- `/Users/gdc/gmux` and every clone under `…/scratchpad/r139/repos` are read only. Nobody but the committer commits, stages or
  stashes. `git diff e3837139` in this worktree is exactly 337.1's delta. Install nothing. Paseo's clone is never built or run.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid: a process
  is ended by the pid its starter holds, in a `finally`.
- No real Tailscale, DNS or APNs: the door is published only through `build/p330/tailscale-standin.mjs` and names only
  `build/p332/dns-standin.mjs`. His keychain, credentials, APNs key, `~/.ssh`, conversation stores (`~/.claude`, `~/.codex`,
  his Claude Code and Codex logs) and live Tortie profile are never read. Real data means the committed captures
  (`build/fixtures/**`, `src/main/activity/__tests__/fixtures/**`, `docs/research/assets/63-fixtures`).
- **No model turn.** Every agent is a stand-in. `smoke:remote` and `smoke:machines` are NOT run. Gemini, Qwen, Antigravity and
  Grok are never started; a scratch `agents.json` renames their binaries (and Droid's) before every launch.
- **His shell history**: before and after every command that starts a shell, a far session, a Simulator or the app, record
  ONLY `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves. Any shell a test starts runs with a
  scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- Far sessions only through the loopback machine with `SCRATCH_MACHINE_QUIET_SHELL=1` and `SCRATCH_MACHINE_NO_OWN_KEYS=1`.
  A far tmux command a script composes itself quotes every word that starts with `=` (the far login shell is zsh, whose `=`
  expansion read `=name:` as a command lookup in the spec step's first remote run, §14 M10).
- Simulators only through `build/simulator-run.mjs`. Every `xcodebuild` uses `-derivedDataPath …/scratchpad/p3371/dd-<role>`,
  deleted before the role returns. No screenshot and no recording: a visual claim is a frame, a label or a number read.
- No raw control byte, bidi, zero-width or BOM character in any committed file (the committed captures' U+00A0 after Claude
  Code's `❯` excepted). Test texts that need one build it from a code point at run time.
- **Phase 340.1 landed under this base** (`b23135e3`: `src/main/machines/host-record.ts`, `ipc.ts`'s confirm,
  `remote-sessions.ts`). Its rules stand as they are; nothing here edits those three files.
- A gate that spawns a probe with `spawnSync` sets `maxBuffer` when the probe's output can grow. Under load a failing timing
  test is re-run alone before it is called a failure. No scenario may be worse than today. Describe any weakness by its class,
  never as a recipe.

---

## 1. The answer first

**What a person can do after this phase.**

1. On the iPhone, tapping a running session in either list opens **its terminal at once**, full screen, as the Mac shows it
   now. Under the title one line says how it is going: the status in its colour, then `agent · project`, then the machine's
   badge for a session on another machine. Top right: the **Catch Me Up** icon, then **End** (Face ID, as in Phase 317).
2. **He scrolls up and the terminal scrolls back** through what the session printed, as far as the Mac keeps it (25,000 lines
   by default, the Scrollback depth setting), while the live rows at the bottom keep updating. A page arriving never moves
   what he is reading. A button brings him back to the live bottom, and typing a key does too, as at the desk.
3. A full-screen program (the alternate screen: vim, less, a picker drawn full screen) scrolls back nothing, as the Mac's own
   terminal shows nothing above it; the terminal simply stops at its top.
4. While the session asks a numbered question the Mac can press (Claude Code's, Codex's), the options are **buttons under the
   terminal**, pressed exactly as Phase 318 presses them, no Face ID. He can still type the digit or the arrows himself.
5. The Catch Me Up icon opens **Catch Me Up**: the session's conversation, oldest at the top, and at the bottom, where the page
   opens, where things stand now: the status, Catch Me Up's card (the outcome, the question, `you asked “…”`), the options, the
   two counts, and Phase 318's message box when the session waits at its own empty prompt. Everything the session page drew in
   337 is on one of these two pages.
6. **An ended session opens on Catch Me Up**, because it has no terminal; so does a session on a Mac without this phase.
7. Raising the keyboard and putting it away no longer leaves the rows 135 pt low on iOS 26.3, so a long press selects the row
   under the finger.
8. His Mac asks him to allow the phone door once more after the update: the route list (a hashed field) gains `scrollback`, and
   the honesty sentence says the phone can see what a session's terminal shows **and what it printed before**.

**Nothing else changes for a person on the Mac.** No Mac surface is added, renamed or removed; `src/main/menu.ts` does not move.
Settings then Phone draws one longer route line and one longer honesty sentence, words on an existing surface. **Menus: none
move** (the phone is not a Mac surface; the Mac's View then Catch Me Up row is the word the phone now borrows).

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **One new row on the closed table**: `{ id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true }`, after `screen`. Its own route, not a range on `/v1/screen` | A page of history is a one-shot read that is never held, and `/v1/screen` is a long poll whose watcher, slot and floor (337 D3, D4, D40) a page must not share; a separate row leaves 337's watcher byte for byte as verified; and the Allow line then names the new read, so the person who allows the phone sees that it can now read a session's history, which his 316 ruling refused until now. R4's pin moves on purpose from `16115392…` to **`ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14`** (eleven sorted `METHOD path` lines; §14 M13, two methods). The contract baseline does NOT move (337 D36: route ids are none of what it lists) |
| D2 | **The index space is tmux's own, numbered from the OLDEST line it holds**: line `i` (0 = oldest) is tmux line `i − history_size`, and the live screen's top row is index `history_size`. A line keeps its index while lines scroll in under it; only a trim at the limit, a clear or a rewrap moves it | MEASURED, both builds: over 3,000 numbered lines every probe index (0, 1, 500, h−100) held exactly `L(i+1)`; new lines append at the bottom (§14 M1). The Mac's own copy already numbers lines this way (Phase 209, `src/main/capture/service.ts:166-189`, `clampHistoryRange` in `src/main/tmux/scroll.ts:846-858`). Paseo's absolute rows are the same idea (`headless-terminal-state.ts` `oldestRow`) |
| D3 | **The live answer carries `depth` and `space`**: `PocketScreen.depth: number \| null`, tmux's `#{history_size}` at that read, so the phone knows where the live top row sits in the index space; and `PocketScreen.space: string \| null`, 12 lowercase hex naming WHICH PANE that index space belongs to (`screenRevisionOf(['space', display.paneId])`, the watcher's own hash, so no tmux id crosses the wire). Both NULL together when the screen is the alternate screen, when the read's two displays did not agree (lines scrolled during the read, D5), or when the history exceeds `MAX_SCROLLBACK_LINES` (100,000, `src/shared/settings.ts:787`) | the first page of history adjoins the live screen and has no other way to know which index the live top row is; a null offers no scrollback for that one picture, and the next picture (≤ 250 ms) offers it again. `space` is §Attack B8: a session's active pane can change (no line of `resources/gmux-tmux.conf` unbinds the prefix, so a person at the Mac's attached terminal can split or switch panes; a program in the session can too), and MEASURED (BM2, arm P, both builds) a first page asked after the switch was served from the OTHER pane with the width equal and the depth check passing, so nothing but the pane can tell the two index spaces apart; the overlap check (D13) cannot either when its rows are blank |
| D4 | **`SCREEN_FORMAT` gains its eighth field, `#{history_size}`, LAST** (`src/main/screen/read.ts:43-45`): `#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}\t#{history_size}`. `parseScreenDisplay` reads exactly eight fields, the eighth a whole number of at most NINE digits (`WHOLE9`, `^(0\|[1-9][0-9]{0,8})$`, the bound `PANE_ID` already uses); the remote read uses the same constant | one format, one spelling (337 D6); last, so the seven fields keep their places. Nine digits, not six (§Attack B16): a display line that fails to parse fails the whole LIVE read, so a history deeper than six digits (a far server's own limit) must never cost him the terminal he has today; a history past `POCKET_SCROLLBACK_MAX_INDEX` is read and answered `depth: null` (D3) |
| D5 | **The two displays agree on pane, width, height, alternate screen AND history size** (`agree`, `read.ts:126-128`), or the read is taken once more; a second disagreement is served with the second display's values and `steady: false`, which makes `depth` null (D3). **The keys act still aims at the `%pane` the fresh read's display names** (`keys.ts:296`). This is 337 D5's pane clause, now gated (Z23) | MEASURED: the three-line block over the control client is not atomic under a flood: the two displays disagreed on the history size in 16 of 400 blocks (3.7b) and 3 of 400 (3.6a) at full speed, 0 or 1 of 381 to 400 at 100 and 1,000 lines a second, and a page read inside a disagreeing block sat in neither display's frame (2 and 1 pages wrong, every one in a disagreeing block, §14 M4) |
| D6 | **The remote live read is three commands in one exec** (`remoteScreenArgv`, `src/main/machines/remote-screen.ts:47-50`): `display-message -p -t $N SCREEN_FORMAT ; capture-pane -p -e -t $N ; display-message -p -t $N SCREEN_FORMAT`, split by count (first line, then the first display's `rows` lines, then the last line), so a far picture is `steady` by the same rule | a far picture needs `depth` as a local one does; MEASURED over the loopback machine: the two displays agreed in 60 of 60 page reads, and an exec of three commands took 9.97 to 10.28 ms p50 (§14 M10), the same as 337's two-command exec (8.97 to 10.33 ms, build/p337/SPEC.md §14 M9). One exec is one tmux command list, which the far server runs with no pane output between its commands, so the count always holds for an honest far tmux; an answer whose count does not hold is NOT `unreachable` (a false sentence over a server that answered): it is read as today's (the last line the display, the rest the capture) and served with `steady: false` (§Attack B16) |
| D7 | **`GET /v1/scrollback?id=<s>&from=<i>&count=<n>&depth=<h>&wrap=<c>&keep=<top\|bottom>`**: each name exactly once and nothing else; `id` 1 to 128 characters (as `/v1/screen`'s); `from` 0 to 100,000; `count` 1 to `POCKET_SCROLLBACK_MAX_COUNT` (128); `depth` 0 to 100,000, the largest history size the phone has seen in its index space; `from + count ≤ depth` (a page past the top of the phone's own index space is no page, §Attack B1); `wrap` 1 to 512, the width that index space was read at; `keep` exactly `top` or `bottom`. Anything else is answered as an unknown id is, 404. **No name is a size of the Mac**: `wrap` is an echo the Mac compares and never acts on (337 rule (ah) widened); `depth` is the phone's newest reading of the history size, which main uses only as its FIRST GUESS of where line numbers stand (D9) and as the floor under which the index space has moved (D12) | 337 D2's refusal shape; `cols` and `rows` are names rule (ah) refuses in any request, so the echo is named for what it is, the width tmux wrapped the history at |
| D8 | **The answer** (`PocketScrollbackAnswer`, §5.2): `from` (the index of the first row sent), `depth`, `wrap` and `space` as read now, the page's own `styles` table and `rows` (runs, exactly as the live screen's), and `why` with main's sentence: `ended`, `unreachable`, `moved` or `busy`. Sent whole with a `Content-Length`, never streamed (C1). The phone joins a page only when its `space` is the space it holds (D13); main does not compare it, because both panes are the same session's and the phone may see either | a page is drawn the way the live rows are; four absences, each with what the phone does next (§5.6) |
| D9 | **Main's page read is ONE statement per attempt, numbered by main, never by tmux, with no separate first round** (§Attack B1, B2): each attempt is ONE statement of three control-client lines, the display, `capture-pane -p -e -t $id -S <a> -E <b>`, the display, with `a = from − SCROLLBACK_OVERSCAN − h0` and `b = min(from + count, h0) − 1 − h0`, where `h0` is, at attempt 1, the ask's `depth` (the newest history size the phone saw) and at attempts 2 and 3 the previous attempt's last display. `a` may name a line above the oldest ON PURPOSE: tmux then starts at the oldest line, whose index is 0. The page is accepted only when the two displays agree (D5's five fields); its true first index is `max(0, a + h1)` where `h1` is the agreed history size, and it is covered when that index is at most `from` and the capture reaches `min(from + count, h1) − 1`; the requested rows are cut from it by index. Up to **3** attempts (`SCROLLBACK_ATTEMPTS`); none steady and covering is `busy`. When the control client is down, each attempt is one spawned `tmux` with the same lines as a `;` list, split by count from its FIRST display (one command list runs with no pane output between its commands, so the first display's history is the capture's: `b + h − max(a, −h) + 1` lines) | MEASURED by the adversary (BM2, both builds, the SHIPPING control client): the spec step's read as first written (a separate round 1, `a = max(0, from − 128) − h0`, a start above the oldest refused) served the OLDEST page (`from` 0) in 0 and 1 of 60 trials at 100 lines a second and 0 of 60 at 1,000 when its two rounds were 10 ms apart, as two execs on another machine are, every other trial `busy` after 3 attempts, because any line arriving between the rounds moves the oldest line's relative number and the start was forbidden from reaching above it; this read served 60 of 60 at `from` 0, 30 and 100 at both rates on both builds (1 `busy` of 360 on 3.6a at 1,000 lines a second, `from` 100), and 177 of 177 on each build with `h0` the phone's depth read 300 ms before the page at 100 and 1,000 lines a second and a flood: **0 wrong of the 1,073 pages it served** (and 0 wrong of all 2,276 pages any read in BM2 served). The spec step's own M5 and M10 were already this shape (each trial's `h0` the previous block's display, with no round 1), so their 2,399 of 2,400 and 180 of 180 stand for it. Without the overscan a page asked by a separate display read's numbers was the page asked in only 13 and 10 of 400 at a flood (§14 M4). A number tmux cannot read silently starts at the VISIBLE TOP (`-S abc`, §14 M1), so every `-S` and `-E` is `String()` of a whole number main checked |
| D10 | **On another machine the same attempts, ONE exec each** (`remoteScrollbackArgv`), through `execOn` alone, the far `$N` from the session's LIVE address (`remoteScrollAddress`, as 337's far read) | ONE exec a page whenever fewer lines than the overscan arrived since the phone's newest picture, which is every page while the agent is quiet or prints under about 400 lines a second (the phone's depth is at most a poll's 250 ms old); a second exec only past that. The read as first written cost two execs every page, so at 250 ms a page a far machine saw 8 execs a second on top of the poll's 2.5 (§Attack B2). MEASURED over the loopback machine (far tmux 3.6a): a 100-row page in 10.12 ms p50, 11.5 ms p99, 200 rows 10.28 and 12.2 ms; 60 of 60 numbered pages exact (§14 M10) |
| D11 | **A page is composed WHOLE, then cut**: the composer reads the whole capture (the overscan included) for every cell's pen, resolves styles exactly as the live screen's (337 D9 to D12), and builds runs ONLY for rows `[from, from + count)` by index (§Attack B10: the rows it drops cost it the reading and not the composing); when the kept rows pass a cap (styles 1,024, runs 16,384, the answer 1 MiB), it keeps the longest run of them from the end `keep` names that fits, and builds the page's own style table from those rows alone | tmux writes each cell's style as a change from the cell before it, across rows (`cmd-capture-pane.c` hands `grid_string_cells` one `gc` for the whole capture), so a row cut from the middle of a capture before composing could lose its pen. MEASURED: 111,469 rows (12 providers, both builds) composed from captures that start where the page starts and from captures starting up to 60 rows earlier: 0 style differences (§14 M3). The worst page (every cell its own colour pair, 120 columns) fits 5 rows (595 styles, 83 KB) and not 10 (§14 M11); a single row always fits (512 styles at most) |
| D12 | **`moved` is answered, and nothing composed or sent, when** the AGREED frame of an attempt is the alternate screen, its width is not `wrap`, its history size is below `depth` or below the previous attempt's display (a trim at the limit, a clear or a rewrap shrank it; main SAW it shrink), or `from` is at or past its history size. With no separate first round the capture of that attempt has been read, and it is dropped in main unsent, unlogged and unkept (§Attack B1: the same exec count as a display-only round, one exec). A page is never served from the live screen: rows at indices ≥ the history size are not in it | MEASURED: a trim at the limit frees `hlimit/10` lines and every index then holds the line 10 percent of the limit later (at a limit of 1,000, indices 600 to 649 held `L601` to `L650` before the trim and `L701` to `L750` after it); `clear-history` and `ESC [ 3 J` empty the history (461 to 0); a rewrap from 120 to 80 columns took 761 lines to 1,161 and index 100 to another line (§14 M6, M8, M9). Live rows change under the agent's redraw; history rows do not |
| D13 | **The phone verifies every page it joins to rows it holds by OVERLAP**: an older page asks for the 8 rows it already holds at its bottom too, a newer page the 8 at its top, and the page is joined only when its `space` and `wrap` are the held ones, its `depth` is at least the phone's depth, and those rows' text equals the held rows' text; otherwise the phone treats the index space as `moved`. The first page (nothing held) is checked by `space`, `depth` and `wrap` alone | a content anchor caught the trim at the limit in the spec step's run (§14 M6) and costs 8 rows a page; the size check catches a shrink; a history that repeats itself exactly at a period dividing the trim (122 of 122 anchors at a 10-line period) fools any content anchor, which is stated, not closed (§13 item 3) |
| D14 | **Main paces and bounds its own work**: one page read in flight per session (others wait their turn, FIFO), at most `SCROLLBACK_QUEUE_MAX` (4) waiting per session (one more is answered `busy` at once); a start no sooner than `max(floor, SCREEN_DUTY_FACTOR × the session's last page compose ms)` after that session's previous start, the floor `SCROLLBACK_MIN_GAP_MS` (250) on this Mac and `SCROLLBACK_MIN_GAP_REMOTE_MS` (= `SCREEN_TICK_REMOTE_MS`, 400) on another machine; every attempt raced against 337's deadlines (1,000 ms here, 2,000 ms on another machine); and **`closing()` asked at the poll's own tick (`SCREEN_TICK_MS`) while a page waits its turn, its floor or its exec**, so it answers `unreachable` within one tick of the quit or the door stopping and never outlives the stop join, the exec left to settle on its own with the session's slot held until it does (337 D3, the watcher's own rule) | a paired phone that does not pace cannot keep main busy; the floor is the phone's own pacing (D27); 250 ms keeps the nonce budget under its memory (D29). §Attack B3: as first written `closing()` was asked only before each attempt, so a page waiting its turn behind others (up to 32 connections' worth, 8 s) or awaiting a far exec (2 s) outlived the door's 1,000 ms stop join, which is 337 §Attack A7's class. §Attack B2: a far page costs the far machine an exec, so its floor is the far poll's tick. §Attack B10: a page of per-cell colours composes in tens of ms on main (BM1: 200 such rows 24.9 ms p50, 30.4 ms at worst with the SHIPPING composer), so the page floor takes 337 D15's duty cycle as the watcher does |
| D15 | **The page read writes nothing, sets no status, logs nothing and reads no error's text**; it names no tmux verb but `display-message -p` and `capture-pane -p -e`, and no format but `SCREEN_FORMAT`; nothing sizes anything (337 D7) | the Screen's own rules (Z7, Z9) |
| D16 | **Option B: one route, two faces.** A session route (`Route.session`, `Route.alerted`) reads `/v1/session` once, then draws the **Terminal** when the answer's `screen` is true and this reader has a screen door, else **Catch Me Up**; the face is decided at the first answer and then kept for the route's life, so nothing he is looking at swaps under him (a session that ends while he watches says `This session is not running, so it has no terminal.` where the rows were, with the Catch Me Up icon still there). Until an answer decides it the route draws the session's name and the loading view; a first read that fails draws the failure view whose Try again reads again, and a refusal goes where the session page's refusal goes today (`DoorWords.consequence`, the alerted route's own sentence for a session the Mac no longer has). The route's outer container is `ID.sessionScreen` (`screen-session`) WHICHEVER face it draws, with the face's own container inside it (§Attack B12) | his ruling 3; "an ended session (no terminal) opens on Catch Me Up"; a Mac without this phase answers no `screen`, so the phone opens on Catch Me Up, which holds everything the 337 session page held |
| D17 | **The Terminal page** (`TerminalPage`): the principal title is the session's name; under the navigation bar ONE status line, `● <status> · <agent · project>` in the dot's colour and the secondary colour, the machine badge after it for a session on another machine, one line, its tail truncated; End's line under it when End has said anything; then the terminal, filling the rest; the top bar's trailing items are Copy (only while a selection is held), the Catch Me Up icon, then End, End rightmost. The status line re-reads `/v1/session` when a drawn picture's `turn` or `asking` differs from the values at the last read, at most once a second and one read in flight, and on appear and on return to the foreground | his ruling 3; `turn` moves on every committed status but `needs_input`, and `asking` covers that one, so the line follows every status change within about a second of the picture that showed it, with no timer of its own (CLAUDE.md's reply row; build/p318/SPEC.md §5.3 to §5.6) |
| D18 | **The Catch Me Up icon** is SF Symbols' `text.bubble`, in the accent, its accessibility label `Catch Me Up` | his ruling named `clock.arrow.circlepath` or `text.bubble`; the Mac draws Catch Me Up with the `comment` codicon (`src/main/menu.ts:1132`, `src/renderer/settings/SettingsApp.tsx:110`), a speech bubble, and `text.bubble` is its match |
| D19 | **The question tray**: while the last session answer offers presses (318's `reply` offer, Claude Code's and Codex's numbered questions), the Terminal draws the PRESSABLE options as buttons under the grid, each with its marker chip and its text WHOLE (318's rule: a person never presses what he could not read), at most 40 percent of the page tall and scrolling inside itself past that, the press line under them; pressed through 318's `ReplyModel.press` exactly as the session page pressed, no Face ID; hidden while the keyboard is up. Options the Mac does not offer to press are not drawn in the tray: they are on the terminal and he types them. **The tray and the now card (D20) carry the identifiers the 318 session page gave these controls** (`session-choice-<n>`, `session-choice-press-<n>`, `session-command`, `session-reply-line`, `session-choices-note`): an identifier names the control, not the page, and only one face is on screen at a time, so Phase 318's press arms run on the Terminal unedited and prove the press did not move (§Attack B6) | "the numbered-question buttons … stay reachable from the terminal page"; one press path |
| D20 | **The Catch Me Up page** is the 337 Conversation page renamed and widened, drawn bottom-anchored as today (`ConversationScreen.swift:301-325`, `.defaultScrollAnchor(.bottom)` at `:322`): the turns, oldest at the top, paged back as before; then, after the newest turn, **the now card**: the status block, End's line, Catch Me Up's card (outcome, question, command, `you asked`), the options (buttons where offered, the 318 note where not), the press line and the two cells; the agent's last answer only when there are no turns (it IS the newest turn's answer, `src/main/pocket/routes.ts:1195`); 318's message box in the bottom inset when the session waits at its own empty prompt; End top right when offered. The principal title is two lines: the session's name, and `Catch Me Up` under it | nothing the 337 session page drew is lost (§7.10); the page opens at its bottom, so the first thing he sees is where things stand now, with the conversation above it, as the Mac's Catch Me Up reads (`src/renderer/settings/fold-copy.ts:101-104`) |
| D21 | **The rename**: every word the phone draws for the history is `Catch Me Up` (`Copy.catchMeUp`, owned by the Mac's own word, `src/main/menu.ts:1132` `item('Catch Me Up', …`); `Copy.conversation` and `Copy.screen` are gone; the feature the Screen was is named **Terminal** in every phone word that names it (`Copy.terminal = "Terminal"`, the grid's accessibility label); the accessibility identifiers that spelled `conversation` spell `catch-up` (§5.5.7); the Swift file and type names (`ConversationScreen.swift`, `ConversationModel`) stay, their headers saying they draw Catch Me Up | his ruling 2 and 3; renaming two files the gates name in six lists buys a reader nothing the header does not |
| D22 | **`Copy.terminalStaysOnMac` is removed**, and the line above the conversation with it (`ConversationScreen.swift:289-290`) | 337 D31 made it `The terminal’s scrollback stays on your Mac.`; after this phase it is false |
| D23 | **The Mac's screen sentences say terminal where they name the feature** (`src/shared/screen-copy.ts`): `SCREEN_ENDED` `This session is not running, so it has no terminal.`; `SCREEN_TOO_LARGE` `This terminal is too large to show on your phone.`; `SCREEN_QUESTION_MOVED` `The question on this session changed since your terminal was drawn. Nothing was typed.`; and the phone's own `screenWaitForRedraw` `Waiting for the terminal to redraw.`, `screenHeldWhileSelecting` `Showing the terminal as it was when you started selecting.`, `screenNotAnswering` `Your Mac is not answering. This is what the terminal last showed.` New: `SCROLLBACK_MOVED` `Earlier lines changed on your Mac. Go back to the live terminal to read them again.` and `SCROLLBACK_BUSY` `Tortie could not read this session’s earlier lines just now.` | his ruling 3 ("named Terminal in the app"); the store text keeps "the session's screen". `busy` is also the answer past `SCROLLBACK_QUEUE_MAX` (D14), so its sentence must be true of both causes; "printing too fast" was not (§Attack B14) |
| D24 | **THE SCROLL VIEW IS REBUILT ON UIKIT** (NEW `Screens/ScreenScroller.swift`): one `UIScrollView` (two axes) in a `UIViewRepresentable`, `contentInsetAdjustmentBehavior = .never`, `alwaysBounceVertical = true`, its frame the page's area under the status line whatever the keyboard does. **The opt-out is the PAGE'S, once, at `ScreenPage`'s root** (`.ignoresSafeArea(.keyboard, edges: .bottom)` on the outermost stack, and on nothing inside it), because a child that does not touch the bottom edge (the scroller has the line and the tray below it) cannot opt out of a keyboard its parent avoids: its frame would still follow the keyboard and the inset below would count the keyboard twice (§Attack B4). The keyboard's overlap is computed in ONE function, `keyboardOverlap(_:)`, from `UIResponder.keyboardWillChangeFrameNotification` (and `WillHide`) converted into the scroll view's own coordinates, in the keyboard's animation; it is applied as `contentInset.bottom` and the indicators', and PUBLISHED once to the page, which places the line (D23's words) and the back-to-live button just above it, and hides the tray while it is above 0. When the keyboard goes the overlap is 0 and the offset is clamped to the content in the same pass. Content shorter than the view sits at its top, because a `UIScrollView` never centres and D25's pad keeps the live rows' top where it was | **THE MEASURED CAUSE (§14 M12)**: on iOS 26.3 the 337 build's row 0 sat at y 116 before the keyboard and while it was up, at **250.7** after it was put away (134.7 pt low), still there 2 s and 3 s later, and back at 116 after the first long press; on iOS 18.3 it never moved (100.3 throughout). The 337 grid is a two-axis SwiftUI `ScrollView` whose content is framed `minHeight: proxy.size.height` (`ScreenGrid.swift:108-126`), and a two-axis SwiftUI scroll view CENTRES content smaller than itself (the 337 fixer's own finding): when the keyboard went, the view grew back but the content kept its keyboard-up height until the next state change re-laid it, so the rows sat centred, half the difference low, and a long press hit-tested against rows that then moved. A UIKit scroll view has no centring and no stale frame: the frame never follows the keyboard, and the inset this code sets is the only thing that does |
| D25 | **The terminal's rows are laid out by index, over a RESERVED range** (§Attack B5): the layout covers indices `[top, H)` of history, then the live rows at `[H, H + rows)`, then a PAD of `max(0, visible − rows × cellHeight)` blank points below the live rows, where `H` is the live picture's `depth`, `visible` the view's height less the keyboard's overlap, and `top ≤ lo`. Of the history rows, `[lo, hi)` are HELD (fetched) and every other one is RESERVED, drawn as the ground until its page lands; every row is one cell tall, so a row's place is `(index − top) × cellHeight`. Rows are drawn by the 337 painter (`ScreenRowView`, `ScreenRowPainter`, unchanged), only those in view plus one screen above and below. In `following` nothing is held and `top = H` (the live rows and the pad alone, which is today's picture: the rows at the top of the view, Screen.html's) | Paseo's absolute rows (`headless-terminal-state.ts` `extractBufferWindow`) and 337's "only visible rows" (D26); equal row heights make every offset arithmetic. THE PAD: as first written the content was the rows alone and sat at the top while shorter than the view, and then no offset could keep the live rows still when rows were added above: at the 337 build's own measured geometry (§14 M12: a 40-row screen fitted at 6.67 pt a row, 267 pt, in a 758 pt view) a first page of 100 rows wants the offset at 667 pt where the content's bottom allows 175, so the live rows would have jumped 492 pt up under his eyes. With the pad below the live rows the offset can always grow by exactly what was added above (content and offset grow by the same amount), and `following` (the offset at its maximum) shows the live rows at the top while they are shorter than the view and the live bottom above the keyboard when they are taller |
| D26 | **A page never moves what he is reading**: rows are RESERVED above before they are fetched, never inserted where he looks: entering `scrolled` reserves the first page's rows `[max(0, H − 100), H)` at once, and whenever the view's top comes within one page of `top` (and `top > 0`) the next 100 are reserved; each reservation grows the content above him and the content offset by exactly the rows reserved times the cell height, in the same layout pass (`layoutSubviews`, applied as a DELTA to the current offset, so a drag or a fling under way continues from where it is); a page then FILLS reserved rows and moves nothing; the live picture growing `H` grows the reserved rows between `hi` and the live rows, below him, and moves nothing while he is scrolled back; eviction (D28) turns held rows back into reserved ones and moves nothing; and a change of cell size (a pinch, a turn of the phone) keeps the row at the top of the view, or the pinch's focal row, where it was | the entry: "A new page never moves what he is reading; the live rows keep updating below"; Paseo's test "scrolled state is preserved when new output arrives" (`terminal-scrollback.test.ts:104-128`). Reserving first also means the drag that entered `scrolled` keeps going into the rows it reserved, so the first pull shows the history arriving rather than a bounce and a second pull (§Attack B5) |
| D27 | **Two modes, Paseo's design**: `following` (the offset at its maximum: the live rows at the top while shorter than the view, the live bottom row above the keyboard when taller; nothing held) and `scrolled` (his place kept). Dragging up past the live top enters `scrolled` (and reserves, D26); a drag or a fling that ENDS at the offset's maximum, the **back-to-live button** (`arrow.down.to.line`, label `Back to the live terminal`) or **sending any key** returns to `following` and drops every held and reserved row (the offset corrected by the same delta, so the live rows do not move); pages are fetched only for reserved rows in view and one page beyond each edge of them, each page ADJOINING held rows when any are held (so D13's overlap applies), one in flight per Screen, at least 0.25 s apart, 100 rows a page plus the 8 overlap rows. While `scrolled`, every live picture's numeric `depth` raises the phone's depth (`depthSeen`), which is what makes a trim visible within one picture (§Attack B13) | Paseo's `following`/`scrolled` and its bottom affordance (`terminal-scrollback.test.ts:104-173`); typing returns to live output as the desk does (`src/renderer/terminal/TerminalPane.tsx:419-425`, 337 D19); a fling does not fetch every page it passed |
| D28 | **The phone holds at most 3,000 history rows**, evicting the rows farthest from the view first; an evicted row becomes reserved again (the layout does not shrink, so nothing moves) and is fetched again, by overlap, if he returns to it | 337's grid cost (`ScreenGridCostTests`, a 64 MB ceiling); 3,000 rows of real agents are about 270 KB of composed answer (§14 M2) |
| D29 | **The nonce budget** (337 D40, Z19): a phone on a Terminal sends at most 4 polls a second, 20 for keys and their settled answers, 4 pages (the Mac's own floor, D14) and 1 status re-read: 29 a second, 3,480 in the 120 s a skewed clock stretches the window to, under `POCKET_NONCE_MEMORY` (4,096), which does not move | the arithmetic Z19 reads, widened |
| D30 | **The connections** (337 D25): the poll's kept line; the keys' kept line while typing; and a third kept line, **the side line**, which carries the pages AND the Terminal's status re-reads, one exchange at a time (the second waits for the first); each closed by the phone once idle 4 s. A press is one-shot, as in 318. At rest one connection; typing two; scrolling back or a status re-read two; everything at once with a press, four, which is the door's per-source cap (`PER_SOURCE_MAX`, `src/main/pocket/door/limits.ts`) | one phone never passes the cap; two phones behind one public address, each scrolling back while typing, can be refused a fifth connection, which reads as not answering and is retried for a read (a write is never retried): the class 337 D25 stated, widened by one line |
| D31 | **The selection** keeps 337's gesture classifier and long press (UIKit's `UILongPressGestureRecognizer`, now on the `UIScrollView`), with points hit-tested by arithmetic in the content view's own coordinates (row = `y / cellHeight`, column = `x / cellWidth`) over held history rows and live rows alike, and **a point named by its ABSOLUTE index** (a history index, or `H + r` for live row `r` of the held picture), never by its place in the layout, so a reservation above moves no selection; while a selection is held the live picture is held (337 D34) and no row is evicted, while pages still FILL reserved rows (they move nothing, D26); **Copy is drawn only while every selected row is drawn** (held or live), so a selection that reaches reserved rows waits for them and never copies a blank line where a line of his was (§Attack B11); Copy writes `UIPasteboard.general.string` and nothing reads it | 337 D34 and rule (al); hit-testing against the scroll view's own content coordinates is what the 26.3 glitch broke. As first written paging stopped while selecting, so a selection over rows not yet fetched would have copied blank lines silently |
| D32 | **Zoom** keeps 337 D27's law: the pinch scales by a transform while the fingers move and sets the font once when they lift, between the fitted size and 18 pt, the top clamped to 8,192 px a row; the double tap toggles fitted and 12 pt; the row under the pinch's centre stays under it when the font is set | 337 D27; the rebuilt view keeps the focal row by arithmetic |
| D33 | **Landscape** on the Terminal page alone (337 D27, `OrientationGate`), still set by `ScreenPage`'s appear and disappear in `Screens/Screen.swift`, which the Terminal page is built from, so rule (an) holds as written; Catch Me Up pushed over it is portrait because the Terminal's disappear clears the flag (§Attack B15) | the Terminal is the session's page now |
| D34 | **The phone's build number stays 7** in all six configurations; `PHONE_BUILD = '7'` (`build/conformance-ios.mjs:2985`) | the main session: build 7 was never uploaded, and it is the TestFlight build after this phase |
| D35 | **The honesty sentence** (`POCKET_DOOR_HONESTY`, `src/shared/ipc/pocket.ts:1054-1056`) becomes `A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.` The Allow line's route list gains `scrollback` by derivation (`src/main/pocket/pairing.ts:445`); no write clause moves; the hash moves by the route list; `sha256-pocket-exec-v3` does not | refusal 8; the sentence must say what a phone can now see |
| D36 | **Two new gates for 337's unguarded rules**: Z23, D5's agreement and pane clause in `src/main/screen/read.ts` and `keys.ts`; Z24, the cadence in `src/main/screen/watch.ts` (`tickOf` answers `SCREEN_TICK_REMOTE_MS` for a row on another machine and for a row on this Mac while the control client is down, `SCREEN_TICK_MS` otherwise, and every schedule goes through it, with ONE stated exception, 337 D4's nudge, which brings one read forward to `SCREEN_NUDGE_MS` after a keys write on any row: so while he types on a far session its reads follow his keys rather than the 400 ms tick, which is 337's design and is named in the gate rather than hidden from it, §Attack B22) | the main session's decision of 2026-10-06; 337's fix round proved each by a vitest that its own ablation turned red (V14, V16), which no conformance gate reads |

**Subject.** `feat(pocket): open a session on its terminal, scroll it back, and call the history Catch Me Up`

**First body line.** `Phase 337.1: terminal first, scrollback, and Catch Me Up on the phone`

**Semver.** Minor, unreleased: tapping a session opens its terminal, which scrolls back through what it printed, and the
phone's history reads Catch Me Up as on the Mac. The iPhone app 1.0.0, build 7.

**Tier 3**, on CLAUDE.md's questions: it sends a new read of a person's terminal (everything it printed, secrets included) off
the Mac over the public internet; it claims to work for every agent, a shell and another machine, so the evidence is a
per-provider matrix; and it rebuilds the view a person types into. The rename is Tier 1 inside it. The independent methods are
§7.9: four, one an attack, and the parent measurement.

**Menus.** No change. `src/main/menu.ts` is asserted unchanged.

---

## 2. The tree at this head, re-read

| What | At `e3837139` | Note |
| --- | --- | --- |
| The closed table | `src/main/pocket/door/table.ts:89-100`, ten rows | `scrollback` after `screen` |
| Signed reads | `src/main/pocket/door/wire.ts:281` (`SIGNED_ROUTES`) | gains `scrollback` |
| The route pin | `build/conformance-pocket.mjs:916` (`ROUTE_PIN = '16115392…'`) | `ea5930e0…` |
| Main's screen route | `src/main/pocket/routes.ts:850-852` (`screenLive`), `:854-873` (query names, refusal words), `:907-922` (`readScreenQuery`), `:959-1015` (`screenBodyOf`), `:1026-1056` (`screenOf`), `:1213` (`session()`'s `screen`), `:1549-1567` (`screen()`) | `readScrollbackQuery`, `scrollbackOf`, `scrollback()` beside them |
| Facts | `src/main/pocket/facts.ts:123-127` (`screen?`), `:347` (pass-through) | `scrollback?` beside it |
| The read switch | `src/main/pocket/ipc.ts:543` (`case 'screen'`), `:556` (`case 'keys'`) | `case 'scrollback'` |
| `closing` | `src/main/pocket/server.ts:163-208` (handed to every read) | needs no edit |
| The wiring | `src/main/capabilities.ts:396-429` | the page reader built beside the watcher |
| One screen read | `src/main/screen/read.ts:43-45` (`SCREEN_FORMAT`), `:102-123` (`parseScreenDisplay`, seven fields, tab or `_`), `:126-128` (`agree`), `:226-244` (`readScreenLocal`) | eighth field; `steady` |
| The watcher | `src/main/screen/watch.ts:242-245` (`remoteRow`, `tickOf`), `:392-433` (`startRead`), `:436-461` (`pump`) | unchanged; Z24 reads it |
| The composer | `src/main/screen/compose.ts:179-251` (`composeRows`, pen carried across rows), `:269-300` (`composeScreen`) | `depth`; `composePage` |
| The keys' pane | `src/main/screen/keys.ts:291-296` (`fresh.display.paneId`) | unchanged; Z23 reads it |
| The far read | `src/main/machines/remote-screen.ts:47-71` (`capture ; display`, split from the end) | three commands, split by count; the page read |
| The Mac's sentences | `src/shared/screen-copy.ts:18, 27, 33` | D23 |
| The history limit | `resources/gmux-tmux.conf` (`history-limit 25000`); `src/shared/settings.ts:787` (`MAX_SCROLLBACK_LINES = 100_000`) | the depth's bound |
| The phone's routes | `ios/Tortie/App/TortieApp.swift:114-124` (`Route`), `:464-472` (`openConversation`, `openScreen`), `:661-698` (`destination`), `:700-742` (`SessionRoute`), `:744-777` (`ScreenRoute`), `:779-799` (`ConversationRoute`), `:864-896` (`PairedScreenDoor`, two kept lines) | one session route, two faces; a third line |
| The Session page | `ios/Tortie/Screens/SessionScreen.swift:163-266` (the view, End at `:264`), `:269-...` (`SessionBody`), `:432-451` (the Conversation row), `:453-470` (the Screen row) | becomes `TerminalPage` and the now card |
| The conversation | `ios/Tortie/Screens/ConversationScreen.swift:235-325` (the header with the terminal line at `:289`, the bottom-anchored turns at `:301-325`) | Catch Me Up |
| The Screen | `ios/Tortie/Screens/Screen.swift:183-344` (`ScreenPage`), `ScreenGrid.swift:89-148` (the two-axis SwiftUI `ScrollView` in a `GeometryReader` at `:108`, `.frame(minWidth:minHeight:)` at `:126`), `:237-…` (`ScreenLongPress`), `ScreenRows.swift:117-196` | the scroll view rebuilt; `ScreenPage` given its header, tray and trailing items |
| The door seam | `ios/Tortie/Screens/DoorWords.swift:123-134` (`ScreenDoor`); `ios/Tortie/Door/DoorClient.swift:226` (`session`), `:294` (`screen`), `:397` (`signedGet(…, line:)`), `:1085-1295` (`DoorLine`, `freshFor` 4) | `scrollback(…)` |
| The decoder | `ios/Tortie/Door/Contract.swift:1155-1286` (`PocketScreen`, `PocketScreenAnswer`) | `depth`; `PocketScrollbackAnswer` |
| Words | `ios/Tortie/Style/Copy.swift:211-213` (`conversation`), `:231-237` (`terminalStaysOnMac`), `:566-591` (`screen`, `screenNotAnswering`, `screenWaitForRedraw`, `screenHeldWhileSelecting`) | D21 to D23 |
| Identifiers | `ios/Tortie/Screens/Identifiers.swift:216` (`screen-conversation`), `:257-268` (`session-open-conversation`, `conversation-*`), `:354-368` (`session-open-screen`, `screen-*`) | §5.5.7 |
| Phone gates | `build/conformance-ios.mjs:9570-9670` (rule (aq), the 337 fix round's SwiftUI scroll view), `:2985` (`PHONE_BUILD = '7'`); rule letters taken (a) to (aq) | (aq) rewritten; (ar) to (au) added |
| Door gates | `build/conformance-pocket.mjs:270-291` (`Z1` to `Z22`), `:8223` (`Z_RULES`) | `Z23` to `Z30` |
| Machine gates | `build/conformance-machines.mjs`, conditions to 139 (Phase 340 and 340.1 took 125 to 139), condition 124 (the far screen read) | 124 widened; 140, 141 |
| Floors | `HELPER_USER_FLOOR = 169` (`build/assert-electron-teardown.mjs:457`); `SIMULATOR_USER_FLOOR = 2` | neither moves: no new script reaches either helper |
| Mocks | `docs/design/phone/Session.html` (the 337 page, its two rows at `:71-84`), `Screen.html`, `Conversation.html`, `index.html:80`, `Link.html` | §5.5.8 |

---

## 3. Where the entry, the research and his rulings are reconciled

| # | The entry or research says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "`capture-pane -p -e -S <from> -E <to>` through the control client locally and the exec plane remotely" | right; but the numbers are relative to the history size AT EXECUTION, which moves under scrolling output by 20 to 99 lines between two reads at a flood, and a number tmux cannot read starts at the visible top (§14 M1, M4) | the index space of D2, an overscan and a two-display agreement (D9); integers only |
| 2 | "Whether this rides `/v1/screen` with a range or is its own read is the spec's to decide" | `/v1/screen` is a held long poll with one shared watcher per session (337 D3, D4) | its own read, never held (D1) |
| 3 | "Full-screen programs (the alternate screen) have no tmux history" | tmux KEEPS the normal screen's history while the alternate screen is up (261 lines stayed 261 while the program scrolled 160 rows of its own), and a capture above the alternate screen returns the lines from BEFORE the program (§14 M7) | the Screen offers none while the alternate screen is up (`depth: null`, a page `moved`), which is what the Mac's own terminal shows (`src/main/tmux/scroll.ts:33-36`): the lines above belong to a screen the program has covered |
| 4 | "up to the session's `history-limit` (25,000 lines)" | the limit is the Scrollback depth setting, 25,000 by default and up to 100,000 (`src/shared/settings.ts:787`); at the limit tmux frees the oldest tenth at once (§14 M6) | the index bound is 100,000; a trim is `moved` (D12) |
| 5 | "Catch Me Up … still first on the session page" (the rename ruling) | his later ruling, option B, puts the terminal first and Catch Me Up behind an icon | option B (D16 to D20) |
| 6 | "`Copy.terminalStaysOnMac` (337 D31) becomes true of a Screen that now scrolls back" | the sentence says the terminal's scrollback stays on the Mac, which this phase makes false | removed (D22) |
| 7 | "drawn above the live rows" | right, with a reserved gap between the held rows and the live rows for the lines that scrolled in since (D25) | D25, D26 |
| 8 | The log line: "the rows sit about 135 pt low until the first long press snaps them" | MEASURED: 134.7 pt on iOS 26.3, 0 on 18.3, the rows centred in a view grown back from the keyboard (§14 M12) | the scroll view rebuilt on UIKit (D24) |
| 9 | 337 D25: "at rest a Screen holds ONE connection, two while typing" | a third kept line while scrolling back | D30 |
| 10 | 337's rule (ah): no request carries `cols` or `rows` | the page request echoes the width its index space was read at | named `wrap`, compared and never acted on (D7) |
| 11 | The task: "Paseo's scrollback … the design reference, ported, never copied" | Paseo keeps the whole buffer in a headless xterm on the device and advances `oldestRow` on its trim event; Tortie has no emulator on the phone (his 337 ruling 4) and tmux reports no trim | ported: absolute rows, `following` and `scrolled`, the place kept under new output, the bottom affordance (D25 to D27); not ported: the headless xterm, the trim listener (tmux has none: `depth` and the overlap stand in, D12, D13), its 1,000-line default |

---

## 4. The base, and the replay

### 4.1 The base

`/private/tmp/wt-p3371`'s `HEAD` is `e3837139`, detached, with `node_modules` and `build/vendor` copied in. 337.1's work goes
on top, UNCOMMITTED, so `git diff e3837139` plus the untracked files is exactly 337.1's delta. The integrator's first act is to
check that: `git rev-parse HEAD` reads `e3837139…`, nothing is staged, and `git diff --stat e3837139` names only files §10
assigns. If origin/main has moved, the committer replays by blocks and runs the battery on the merged tree; a conflict or a red
gate stops the replay and goes to the main session.

### 4.2 After it lands

TestFlight build 7 (the main session's). The landing cleans up after itself (his rule of 2026-10-01): the worktree, every
parent or clone a verifier made, `…/scratchpad/p3371*` with every DerivedData, and stale `p3371*` sockets whose server is gone;
never a path another phase uses, never under `/Users/gdc`; `df -k /private/tmp` before and after in the landing report.

---

## 5. The design

### 5.1 The row on the door

`src/main/pocket/door/table.ts`, frozen with the rest, one paragraph beside `screen`'s:

```ts
{ id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },
```

`door/wire.ts`: `SIGNED_ROUTES` gains `'scrollback'`. Nothing else in `door/**` moves: the listener's target rule, query
handling, keep-alive and revoked-socket rule are generic. `src/shared/ipc/pocket.ts`: `POCKET_ROUTE_IDS` gains `'scrollback'`
with a one-line comment.

### 5.2 The contract — `src/shared/ipc/pocket.ts` (appended)

```ts
/** The most rows one page of history may ask for (D7): 100 and the 8 overlap rows fit. */
export const POCKET_SCROLLBACK_MAX_COUNT = 128;
/** The deepest index a page may name: the Scrollback depth setting's maximum (src/shared/settings.ts). */
export const POCKET_SCROLLBACK_MAX_INDEX = MAX_SCROLLBACK_LINES;   // imported from '../settings', not re-spelled
/** Which end of a page matters when it cannot all be sent (D11): an older page keeps its bottom, a newer one its top. */
export type PocketScrollbackKeep = 'top' | 'bottom';
export type PocketScrollbackAbsence = 'ended' | 'unreachable' | 'moved' | 'busy';
export interface PocketScrollbackAnswer {
  sessionId: string;
  at: number;
  /** The index of rows[0] (0 = the oldest line tmux holds); null exactly with `why`. */
  from: number | null;
  /** tmux's history size and the width it is wrapped at, as this read found them; null exactly with `why`. */
  depth: number | null;
  wrap: number | null;
  /** Which pane this index space is (D3, §Attack B8): 12 lowercase hex, as `PocketScreen.space`; null exactly with `why`. */
  space: string | null;
  /** The page's own style table, colours resolved on the Mac as the live screen's (337 D12). */
  styles: PocketScreenStyle[];
  /** One entry per row, runs exactly as PocketScreen.lines; empty exactly with `why`. */
  rows: PocketScreenRun[][];
  why: PocketScrollbackAbsence | null;
  sentence: string | null;
}
```

`PocketScreen` gains `depth: number | null` and `space: string | null` (D3), both REQUIRED and null together: the one composer
always sets them, and only this phase's phone reads them. Required means every `PocketScreen` literal in a test or a harness
gains both (`src/main/pocket/__tests__/routes.test.ts`, `src/main/screen/__tests__/{compose,keys,sample}.test.ts`,
`build/p313/hostile-client.mts`, `build/p337/drive-screen.mts`), each owned in §10. `POCKET_DOOR_HONESTY` per D35.

### 5.3 Main's side

#### 5.3.1 The route — `src/main/pocket/routes.ts`

`PocketFacts` gains ONE optional read member beside `screen?`:

```ts
/**
 * One page of a session's history (Phase 337.1, build/p3371/SPEC.md §5.3). Answered at once, never held. A READ: it writes
 * nothing, sets no status and types nothing. OPTIONAL, AND ABSENT IS THE ROUTE NOT EXISTING (404).
 */
scrollback?(session: Session, ask: PocketScrollbackAsk, closing: () => boolean): Promise<PocketScrollbackAnswer>;
```

`PocketScrollbackAsk` (in `routes.ts`): `{ from, count, depth, wrap, keep }`, every number whole. `readScrollbackQuery(query)`
in the shape of `readScreenQuery` (`:907-922`): exactly the six names, each once, `id` 1 to 128 characters, every number by a
character walk with no pattern (R1 refuses a pattern in this module) and in its bounds (D7), `from + count ≤ depth`, `keep`
compared with `===`; a refusal is a word (`parameter`, `repeated`, `id`, `number`, `range`, `keep`) and the route answers it as
an unknown id. The route
`scrollback(query, closing)`: the query; the session by id; `facts.scrollback` absent, null; a rejection, null; removed while
read, null (as `screen()` does, `:1549-1567`); else `scrollbackOf(answer, session.id, now())`, which re-composes FIELD BY FIELD
with fresh arrays and holds the invariants HERE whatever the reader says: `why` one of the four words with main's own sentence
and nothing else carried; otherwise `from`, `depth`, `wrap` whole numbers in bounds, `space` 12 lowercase hex, `from + rows.length ≤ depth`, every row's
cells summing to at most `wrap`, every style index in the page's table, every colour `#` and six lowercase hex, at most
`POCKET_SCROLLBACK_MAX_COUNT` rows, and the whole answer at most `POCKET_SCREEN_MAX_BYTES`; a value of the wrong shape is null.
`src/main/pocket/ipc.ts`: `case 'scrollback': return routes.scrollback(query, closing);`. `facts.ts` passes `scrollback`
through as it passes `screen`.

#### 5.3.2 The live read, widened — `src/main/screen/read.ts`

`SCREEN_FORMAT` per D4. `ScreenDisplay` gains `history: number`; `parseScreenDisplay` reads eight fields (the eighth `WHOLE9`,
`^(0|[1-9][0-9]{0,8})$`, §Attack B16), tab or `_` as today. `agree` compares pane, cols, rows, alternate and history, and is
EXPORTED once from this file for `scrollback.ts` and `remote-screen.ts` to call (Z23: one comparison). `ScreenReading` gains
`steady: boolean`, true when the attempt served agreed. `readScreenLocal` keeps its shape: once, and once more on disagreement,
the second's values served with `steady: false`. `splitSpawnedRead` is unchanged (it splits by the first display's `rows`).

#### 5.3.3 The far live read, widened — `src/main/machines/remote-screen.ts`

`remoteScreenArgv(tmuxId)` = `['display-message', '-p', '-t', $N, SCREEN_FORMAT, ';', 'capture-pane', '-p', '-e', '-t', $N, ';',
'display-message', '-p', '-t', $N, SCREEN_FORMAT]` (D6); `splitRemoteRead` splits by count, as `splitSpawnedRead` does, and
answers `steady` by D5's agreement (one exec, no second attempt: a far picture that did not agree has `depth: null` and the
next tick reads again). An answer whose count does not hold falls back to today's split (the last line the display, the rest
the capture) with `steady: false`, so it is still a picture and never `unreachable` (D6, §Attack B16).

#### 5.3.4 The composer — `src/main/screen/compose.ts`

- `composeScreen` sets `depth` and `space` together: the display's `history` and `spaceOf(display.paneId)` when
  `reading.steady`, the screen is not the alternate screen and the history is at most `POCKET_SCROLLBACK_MAX_INDEX`, else both
  null. `spaceOf(paneId)` is declared ONCE, in `compose.ts`, in `screenRevisionOf`'s construction (sha256 over the
  length-prefixed parts `space` and the pane id, 12 lowercase hex); it does not import `watch.ts`, which imports `compose.ts`.
  `scrollback.ts` and the far page reader call it over the agreed display. The revision already covers the display
  line (337 D14), which now holds the history size.
- NEW `composePage(styled: string, firstLine: number, cols: number, want: { from: number; count: number; keep: PocketScrollbackKeep }):
  ComposedPage` — pure: `readStyledRows` over the WHOLE capture (its rows are lines `firstLine …`, every cell's pen carried as
  the live screen's is), then RUNS built only for the rows of `[want.from, want.from + want.count)` by index (§Attack B10:
  `composeRows`' per-row body, shared, never copied), then, when they pass a cap, the longest run of them from `keep`'s end that
  fits (a single row always does), then a fresh style table from the kept rows alone. Answers `{ from, styles, rows, bytes }`.
  It reads no clock, no file and no process (Z12 widened); the reader times it for D14's duty cycle.

#### 5.3.5 The page reader — NEW `src/main/screen/scrollback.ts`

```ts
export const SCROLLBACK_OVERSCAN = 128;
export const SCROLLBACK_ATTEMPTS = 3;
export const SCROLLBACK_MIN_GAP_MS = 250;
/** A far session's floor between page starts: the far poll's own tick (§Attack B2). */
export const SCROLLBACK_MIN_GAP_REMOTE_MS = SCREEN_TICK_REMOTE_MS;
/** The most pages one session holds waiting their turn; one more is `busy` at once (§Attack B3). */
export const SCROLLBACK_QUEUE_MAX = 4;
export interface ScreenScrollbackDeps {
  core(): ScreenCore | null;
  /** Tests inject. Production: one control-client statement, or one spawned list when the client is down. */
  readLocalRounds?: …;
  /** Tests inject. Production: execOn through remote-screen.ts. */
  readRemoteRounds?: …;
  now?(): number;
}
export interface ScreenScrollback {
  page(session: Session, ask: PocketScrollbackAsk, closing: () => boolean): Promise<PocketScrollbackAnswer>;
}
export function createScreenScrollback(deps: ScreenScrollbackDeps): ScreenScrollback;
```

In this order, named in the code:

1. **The row**: re-read by id; not `screenLive` (`routes.ts:850`): `ended` with `SCREEN_ENDED`. Local with no `$`-id: the same.
2. **The turn**: one page read in flight per session; a page asked while one is in flight waits for it, FIFO, behind at most
   `SCROLLBACK_QUEUE_MAX − 1` others (one more is `busy` with `SCROLLBACK_BUSY` at once); then a start no sooner than
   `max(floor, SCREEN_DUTY_FACTOR × the session's last page compose ms)` after the session's previous start, the floor
   `SCROLLBACK_MIN_GAP_MS` here and `SCROLLBACK_MIN_GAP_REMOTE_MS` on another machine (D14). **The wait asks `closing()` at
   every `SCREEN_TICK_MS`** (a timer of its own, as the watcher's polls have, 337 D3): true answers `unreachable` with
   `SCREEN_UNREACHABLE` at once and leaves the queue.
3. **The attempts**, at most `SCROLLBACK_ATTEMPTS`, each asking `closing()` first (true: `unreachable` with
   `SCREEN_UNREACHABLE`, nothing more read), with NO separate first round (D9, §Attack B1):
   - **h0**: at attempt 1 the ask's `depth`; at attempts 2 and 3 the previous attempt's last display's history;
   - **the statement**: ONE statement of three lines, the display, `capture-pane -p -e -t $id -S <a> -E <b>` with
     `a = from − SCROLLBACK_OVERSCAN − h0` and `b = min(from + count, h0) − 1 − h0` (each `String()` of a whole number main
     computed and checked, `b ≤ −1`; `a` may be below `−h0`, which starts the capture at the oldest line), the display;
     raced against its deadline AND against `closing()` at every `SCREEN_TICK_MS` (true: `unreachable` at once, the round
     left to settle with the session's slot held until it does);
   - **the agreement** (D5's five fields, `agree` from `read.ts`): a disagreement is the next attempt;
   - **the refusals** (D12), over the agreed frame `h1`: the alternate screen, `cols ≠ wrap`, `h1 < depth`, `h1` below the
     previous attempt's display, or `from ≥ h1`: `moved` with `SCROLLBACK_MOVED`, the capture dropped unsent;
   - **the cover**: the capture's first index is `max(0, a + h1)`; it covers when that is at most `from` and the capture holds
     `min(from + count, h1) − from` rows from there; otherwise the next attempt;
   - **compose**: `composePage(capture, max(0, a + h1), h1's cols, { from, count: min(count, h1 − from), keep })`, timed for
     the duty cycle.
4. **No attempt agreed and covered**: `busy` with `SCROLLBACK_BUSY`.
5. **The answer**: `{ from, depth: h1, wrap: cols, space: spaceOf(paneId), styles, rows, why: null, sentence: null }`.

Every attempt races its deadline (337's `SCREEN_LOCAL_READ_DEADLINE_MS`, `SCREEN_REMOTE_READ_DEADLINE_MS`); an attempt past it
is `unreachable` for a far session and the next attempt locally. When the control client is down each attempt is ONE spawned
`tmux` carrying its three commands as a `;` list, split by count from its first display (one command list runs with no pane
output between its commands): the first display, then exactly `(b + h) − max(a + h, 0) + 1` capture lines where `h` is that
display's history, then the last display; any other count is the next attempt.

**On another machine** (`remote-screen.ts`, NEW `remoteScrollbackArgv(tmuxId, a, b)` and `readScrollbackRemote`): the
session's live address (`remoteScrollAddress`, as 337's far read; anything else `unreachable`), `readyRemoteContext`, and each
attempt ONE `execOn` of the three as a `;` list (D10), the verbs ledger reads (`exec-plane.ts:270-305`), split by count as the
down path is; a failure is `unreachable`. Its whole-number check is the one `remote-pane-history.ts` already makes
(`wholeNumber`, Phase 320.1): shared, or matched clause for clause, never a looser second spelling ("grep for an existing
helper before writing one").

It logs nothing, reads no error's `.message`, names no status setter and holds nothing.

`src/main/capabilities.ts` builds `createScreenScrollback({ core: () => pocketCore })` once beside the watcher and hands
`scrollback: (session, ask, closing) => screenScrollback.page(session, ask, closing)` to `createPocketFacts`.

#### 5.3.6 What does not move on the Mac

337's watcher, its tick, its floor, its settle and its slot; the keys verb and its gap; the control client; the carriage; the
monitor; `menu.ts`; the IPC contract and its baseline; every write; `/v1/blocked`, `/v1/session`, `/v1/turns`, `/v1/sessions`.

### 5.4 The two new gates on 337's rules (D36)

- **Z23 THE TWO DISPLAYS AND THE PANE** (`src/main/screen/read.ts`, `keys.ts`): `agree` compares exactly `paneId`, `cols`,
  `rows`, `alternate` and `history` with `===`, and is the one comparison `readScreenLocal` and `splitRemoteRead` and
  `scrollback.ts` use; `readScreenLocal` calls its attempt at most twice and returns the second's values when the first did
  not agree, `steady` false; `keys.ts`'s act aims at the fresh reading's `display.paneId` and at no pane named anywhere else.
- **Z24 THE CADENCE** (`src/main/screen/watch.ts`): `SCREEN_TICK_REMOTE_MS` is 400 and at least four times `SCREEN_TICK_MS`
  (100), read as arithmetic over the declared constants; `tickOf` is declared once and answers `SCREEN_TICK_REMOTE_MS` when the
  row has a `machine` or the core's control client is not connected, `SCREEN_TICK_MS` otherwise; `pump`, `startRead` and the
  answer's freshness test name no tick but `tickOf(`, and no numeric literal schedules a read; the ONE other delay a read is
  scheduled at is `SCREEN_NUDGE_MS`, and only behind `settles.has(` or in `nudge(` (337 D4's settle, named so a second
  exception cannot hide behind it, §Attack B22).

Each gets ablation arms (§6.1); `measure:p337`'s new arm D drives the pane clause on real tmux (§7.6).

### 5.5 The phone — `ios/`

Every drawn word is `Copy.swift`'s or the door's. No `print(`, no log, no package, no web view, no `NSAttributedString`, no
`URLSession`, no `LocalAuthentication` outside `App/OwnerCheck.swift`; nothing persisted.

#### 5.5.1 Paseo's design, ported — what is taken from which file, and what is not

| Paseo file (`2f0cb2f`, Apache-2.0) | What is taken | Swift home | What is NOT taken, and why |
| --- | --- | --- | --- |
| `headless-terminal-state.ts:197-219, 228-250` (`extractBufferWindow`, `extractBufferBounds`) | rows by ABSOLUTE index from the oldest held row; a window of rows by start and count; the bounds (oldest, newest, the bottom viewport) | `Screens/ScreenScrollback.swift` (`ScrollbackLayout`) | the headless xterm that holds the buffer: the Mac holds it (his 337 ruling 4); the `onTrim` listener and its `oldestRow` advance: tmux reports no trim, so `depth` and the overlap stand in (D12, D13) |
| `terminal-scrollback.test.ts:81-173` | the four behaviours as tests: scrolling up moves into history; the scrolled place is kept when output arrives; the bottom affordance returns to the tail and resumes following; following tracks the bottom | `ScrollbackModelTests` (the same four, over the Swift model) | its 1,000-line default and its benchmark payload |
| `terminal-capture.ts:24-71` | nothing but the confirmation that a capture names lines by index over history and screen | — | its negative indexes from the newest line: they move under scrolling output (§14 M4), so Tortie numbers from the oldest (D2) |

Each Swift file whose design is taken says so in its header, naming the Paseo file and commit, that the design is taken from
Paseo (Apache-2.0, the Paseo authors), and that no Paseo code is copied.

#### 5.5.2 The client — `Door/DoorClient.swift`, `Door/Contract.swift`

- `DoorClient.scrollback(_ sessionId: String, from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep, line:
  DoorLine, door: PairedDoor) async throws -> PocketScrollbackAnswer`: target
  `"/v1/scrollback?id=\(queryValue(id))&from=\(from)&count=\(count)&depth=\(depth)&wrap=\(wrap)&keep=\(keep.rawValue)"`, in
  that order, signed as every read, on the given kept line (337's `signedGet(…, line:)`, `:397`), asked once more on a new line
  when a reused line ended before an answer (337 D25).
- `Contract.swift`: `PocketScreen.depth` decoded as an optional whole number 0…100,000 through `DoorNumber` and
  `PocketScreen.space` as an optional 12 lowercase hex, absent or null together (a Mac older than this phase sends neither, and
  its Terminal simply has no scrollback); `PocketScrollbackAnswer` decoded strictly: `from`, `depth`, `wrap` whole numbers in
  bounds and `space` 12 lowercase hex, or all null exactly with `why`;
  `rows.count ≤ 128`; every run's `cells` 1…`wrap` and a row's cells summing to at most `wrap` through `DoorNumber`'s checked add;
  every style index in range; every colour `#` and six lowercase hex; `from + rows.count ≤ depth`; `why` one of the four words
  with a non-empty sentence exactly when set. Anything else refuses the answer whole (`.malformed`).

#### 5.5.3 The seams — `Screens/DoorWords.swift`, `App/TortieApp.swift`

- `ScreenDoor` gains `func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep) async throws ->
  PocketScrollbackAnswer` and `func session() async throws -> PocketSessionAnswer`. `PairedScreenDoor`
  (`TortieApp.swift:868-896`) gains `private let side = DoorLine(keeps: true)` and ONE gate that lets one exchange at a time
  onto it (a page and a status re-read never overlap; the second waits), the two pass-throughs, and `close()` closes all three
  lines. `DoorClient.session(_:door:)` gains an optional `line:` (its `signedGet` already takes one, `DoorClient.swift:397`).
- `DoorWords.scrollbackSentence(for: DoorFailure) -> String`, non-optional and never empty (rule v).
- **The routes** (`TortieApp.swift`): `Route.screen` is removed; `Route.conversation` becomes `Route.catchUp(id: String,
  honestLine: String?)`; `AppModel.openScreen` is removed and `openConversation` becomes `openCatchUp`. `Route.session` and
  `Route.alerted` keep their shape. `SessionRoute` reads the session once and draws `SessionFace` (D16): `TerminalPage` or
  `CatchUpPage`, decided at the first answer and kept. The key sender is made, registered and released by the Terminal face
  as 337's `ScreenRoute` did (`:744-777`), which goes.

#### 5.5.4 The terminal — `Screens/Screen.swift`, `ScreenGrid.swift`, NEW `ScreenScroller.swift`, NEW `ScreenScrollback.swift`, `ScreenRows.swift`, `ScreenSelection.swift`, `ScreenKeys.swift`

The model's file is `ScreenScrollback.swift`, not `Scrollback.swift` (§Attack B15): every Screen rule of `conformance:ios`
finds its files by `Screens/Screen*.swift` (`isScreenFile`, `build/conformance-ios.mjs:8928`) or by the lists `SCREEN_FILES`
and `OWNER_CHECK_ABSENT`, so a file outside the family would have been outside rules (ah), (al) and the owner-check wall.

- **`ScrollbackModel`** (`@MainActor @Observable`, in `ScreenScrollback.swift`) and **`ScrollbackLayout`** (pure): `mode`
  (`following`, `scrolled`), the reserved range's `top`, the held rows by index `[lo, hi)` (`ScreenRowModel`s with their page's
  styles), `depthSeen`, `wrap` and `space` (the index space), `edge` (`nil`, `moved(String)`, `atOldest`), and the one fetch in
  flight. From a live picture with `depth = H` (non-null) the layout is D25's; with a null `depth` the terminal is the live rows
  alone in `following`, and in `scrolled` the live rows stay at the last numeric `H` (a picture whose `alternate` is true while
  `scrolled` returns to `following`: the history is covered by the program). While `scrolled` every live picture's numeric
  `depth` raises `depthSeen` (D27). `reserve(visibleTop:)` extends `top` by one page when the view's top is within one page of
  it (D26) and answers the rows reserved, for the offset delta. `want(visible:)` answers the ONE next page to ask, or none (D27:
  reserved rows in view and one page beyond, a page ADJOINING the held rows when any are held): an older page
  `from = max(top, lo − 100)`, `count = (lo − from) + min(8, hi − lo)`, `keep = bottom`; a newer page
  `from = hi − min(8, hi − lo)`, `count = min(100, H − hi) + min(8, hi − lo)`, `keep = top`; the first page (nothing held)
  `from = max(0, H − 100)`, `count = H − from`, `keep = bottom`; every ask carries `depth = depthSeen`, `wrap` and is checked
  `from + count ≤ depthSeen` before it is sent. `accept(page:)` joins a page only when its `space` and `wrap` are the held ones,
  its `depth ≥ depthSeen`, and its overlap rows' text equals the held rows' text (D13), and sets `depthSeen` to the larger; it
  FILLS reserved rows and never changes the layout's height. Anything else sets `edge = .moved` and fetches no more until
  `following`. A page answering `moved` sets the edge with main's sentence; `busy` and a failed read wait 1, 2 then 4 s before
  the same page is asked again; `ended` and `unreachable` stop paging and leave the live picture's own line to say why.
  `evict(around:)` keeps at most 3,000 rows (D28), turning the farthest back into reserved rows. `follow()` drops every held and
  reserved row and answers the rows dropped above the live rows, for the offset delta.
- **`ScreenScroller`** (`ScreenScroller.swift`): `UIViewRepresentable` over `ScreenScrollView: UIScrollView` (D24), holding a
  content `UIView` sized `columns × cellWidth` by `layout.rowCount × cellHeight + pad` (D25's pad, computed in `layoutSubviews`
  from the scroll view's own bounds and the keyboard's overlap, never from a SwiftUI geometry), and ONE `UIHostingController`
  (its view `isUserInteractionEnabled = false`, so every touch is the scroll view's recognizers') whose root view draws the rows
  of the window in view plus one screen above and below with 337's `ScreenRowView` (equatable, unchanged), placed at the
  window's first row; the window is recomputed in `scrollViewDidScroll` and moved only when the view nears its edge. It owns:
  the keyboard's overlap (D24, ONE function, `keyboardOverlap(_:)`, published to the page), `following`'s pin (the offset at its
  maximum, in the same pass as a new picture or a new overlap), D26's offset delta (`apply(above:)`, applied in
  `layoutSubviews` to the CURRENT offset without animation, for a reservation, a follow and an eviction alike), the pinch (D32;
  recognised together with the scroll view's pan), the double tap, the single tap (raise the keyboard, clear a selection; it
  `require(toFail:)` the double tap) and the long press (D31), all `UIGestureRecognizer`s on the scroll view, every point read
  with `location(in: contentView)`. It never centres.
- **The live rows** keep their identifiers `screen-row-<n>` (`n` 0 to rows − 1); a history row is `screen-history-<i>` (`i` its
  index); every row is one accessibility element whose label is its text; the grid's container carries `Copy.terminal` as its
  label. The cursor is drawn on the live rows only.
- **`ScreenPage`** (`Screen.swift`) becomes generic over the page that holds it:
  `ScreenPage<Header: View, Tray: View, Trailing: ToolbarContent>(model:keys:name:isTop:foregroundTick:header:tray:trailing:)`.
  It draws the header (the Terminal's status line), the scroller, the line (D23's words, or the scrollback edge's), the tray when
  the keyboard's overlap is 0, the back-to-live button over the bottom right while `scrolled` (`arrow.down.to.line`,
  `Copy.backToLive`), and its toolbar: the principal title, then Copy while a selection is held, then `trailing`. Its ROOT
  carries the page's one keyboard opt-out (D24); the line and the button are placed just above the published overlap, so
  both stay above the keyboard while it is up. `ScreenCover` (D41 of 337), the poll, the key field and `OrientationGate` (still
  set in this file's appear and disappear, D33) stay as 337 built them.
- **`ScreenKeySender`** (`ScreenKeys.swift`): every batch it sends first calls `onSend`, which `ScreenPage` points at
  `scrollback.follow()` (D27, the desk's rule).
- **`ScreenSelection.swift`**: `ScreenPoint.row` is an ABSOLUTE index (a history index, or `H + r` for live row `r` of the held
  picture), never a place in the layout (D31); `ScreenSelecting.text` reads the held rows and the live rows by index; Copy is
  drawn only while every selected row is drawn; while selecting, `ScrollbackModel` evicts nothing and still fills reserved
  rows.

#### 5.5.5 The Terminal page — `Screens/SessionScreen.swift`

`TerminalPage`: `ScreenPage` with `header` = `StatusLine` (D17, the dot, the status title in the dot's colour, `·`, the agent
line in the secondary colour, the machine badge; one line, tail truncated; `ID.terminalStatus`) and `EndLine`; `tray` =
`ChoiceTray` (D19: `OptionRow`s for the pressable options with 318's own `ID.sessionChoice(n)`, `ID.sessionChoicePress(n)`,
the command `ID.sessionCommand` and the press line `ID.sessionReplyLine`, §Attack B6); `trailing` = the Catch Me Up icon
(`ID.sessionOpenCatchUp`, D18) then `EndTopItem` (unchanged, rightmost).
Its `SessionModel` reads per D17, through `ScreenDoor.session()` on the side line (D30): `SessionModel` gains an optional read
handed at its making, which the Terminal face hands and every other caller leaves out. A session that ends while the Terminal is up keeps the Terminal (D16), whose poll then says
`SCREEN_ENDED` where the rows were.

#### 5.5.6 The Catch Me Up page — `Screens/ConversationScreen.swift`, `Screens/SessionScreen.swift`

`CatchUpPage` (in `SessionScreen.swift`) is `ConversationScreen` handed a `NowCard` and the session's `SessionModel`, `EndModel`
and `ReplyModel`: the header's terminal line goes (D22) and the no-clock note stays; after the newest turn, `NowCard` (D20) built
from 337's `SessionBody` pieces less its two rows; the last answer only when `pages.turns` is empty; `MessageStrip` in the bottom
inset per 318's `boxDrawn`; `EndTopItem` in the toolbar; the principal title two lines (the name, then `Copy.catchMeUp` in the
secondary colour). A pull reads both models; a return to the foreground reads both while it is on top.

#### 5.5.7 Words, identifiers, build

- `Copy.swift`: `catchMeUp = "Catch Me Up"` with `/// Mac: src/main/menu.ts ⟦item('Catch Me Up', 'show-overview'⟧`;
  `terminal = "Terminal"` (`/// Phone:`, the accessibility label); `backToLive = "Back to the live terminal"`; D23's three
  phone sentences; `scrollbackMoved`, the Mac's `SCROLLBACK_MOVED` byte for byte (`/// Mac: src/shared/screen-copy.ts`), drawn
  when the phone's own overlap, depth or wrap check refuses a page; `conversation`, `screen` and `terminalStaysOnMac` deleted.
- `Identifiers.swift`: `sessionOpenCatchUp = "session-open-catch-up"`, `catchUpScreen = "screen-catch-up"`, and every
  `conversation-*` string becomes `catch-up-*` under a `catchUp…` name; `sessionOpenConversation` and `sessionOpenScreen` deleted;
  the SESSION ROUTE's outer container is `ID.sessionScreen` (`screen-session`) whichever face it draws (D16), so a drive that
  waits for a session's page still finds it; inside it the Terminal keeps `ID.screen` (`screen-screen`) and every `screen-*`
  identifier 337 gave it, and Catch Me Up as a face carries `screen-catch-up`; a `Route.catchUp` pushed by the icon carries
  `screen-catch-up` alone. The tray and the now card keep 318's `session-choice-*`, `session-command`, `session-reply-line`
  and `session-choices-note` (D19). NEW `terminalStatus` (`terminal-status`), `screenHistoryRow(i)` (`screen-history-<i>`),
  `screenToLive` (`screen-to-live`), `screenScrollbackLine` (`screen-scrollback-line`).
- `project.pbxproj`: the two new app files and the seven new test files referenced (pages adds every reference, so no other
  builder edits it); `CURRENT_PROJECT_VERSION = 7` unchanged in all six configurations.

#### 5.5.8 The mocks — `docs/design/phone/`

`Session.html` is redrawn as the Terminal at rest with a question tray (the sample screen's rows, the status line, the icon then
End top right); `Screen.html` as the Terminal with the keyboard up (its title the session's name, not `Screen`); `Conversation.html`
as Catch Me Up (the turns, then the now card at the bottom, the two-line title, no terminal line); `index.html` and `Link.html`
follow. The file names stay (conformance:phonecopy keys its ledger by file). Each mock's comment names this spec's D-row.

**The words each redrawn mock draws, pinned so `CopyTests` (pages) and the mocks (gates) agree** (§Attack B7): `Session.html`
draws `Copy.endTop`, the status line's words composed from its own sample (a status title, then `Copy.joined([agent label,
project])`), the icon with `aria-label="Catch Me Up"` and no visible word, and the tray's options as the agent's own words;
it no longer draws `Copy.screen`, `Copy.youAsked(…)`, `Copy.messages`, `Copy.lastMessage`, `Copy.messageCounts(…)`,
`Copy.yourPromptWord` or the raised `Copy.agentLabel`. `Conversation.html` draws `Copy.catchMeUp` and every word `Session.html`
gave up (the card, the two cells, the counts, the prompt word, the raised agent label), plus `Copy.endTop`, and no longer
draws `Copy.conversation` or `Copy.terminalStaysOnMac`. `CopyTests`' `drawn` list moves those pairs to `conversation` and adds
`(conversation, Copy.catchMeUp)`, `(session, Copy.endTop)` stays, `(session, Copy.screen)` goes. `Choice.html`,
`Answer.html`, `Composer.html`, `Idle.html` and `End.html` draw the page the session page was; under option B that drawing is
Catch Me Up's now card (and, for `Answer.html`, the Terminal's tray too). No word in them is false, so none moves; each gains
one comment line naming where its drawing now lives.

### 5.6 What the phone does with each answer

| Answer | What the phone does |
| --- | --- |
| A page that joins | its rows fill the reserved rows at their indices; nothing moves (D26) |
| `moved`, or a page whose overlap does not match, or a `depth` below `depthSeen`, or another `wrap` or `space`; or, while `scrolled`, a live picture whose `depth` is below `depthSeen`, whose `cols` is not `wrap` or whose `space` is not the held one | the held rows stay as they are; the edge where paging stopped draws main's `SCROLLBACK_MOVED` (`Copy.scrollbackMoved` for the phone's own refusal, the same words); nothing more is fetched until `following` |
| `busy`, or a read that failed | the same page asked again after 1, 2, then 4 s; nothing drawn |
| `ended`, `unreachable` | paging stops; the live picture's line says why |
| A page with `from` 0 | the oldest line tmux holds is drawn; above it nothing (the terminal simply stops) |
| A live picture with `depth: null` | no paging starts from it; held rows stay, and the live rows stay placed at the last `depth` that was a number (for at most a tick under a flood the seam between the last reserved row and the live rows can repeat or skip the lines that scrolled during that one read, §13 item 9); a picture whose `alternate` is true returns to `following` |

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own against a green base, restored by sha256 in a
`finally`; an arm whose anchor text is absent FAILS by name.

### 6.1 `conformance:pocket` and `ablation:p313`

- **R1, R2 unchanged; R3** `FORBIDDEN` unchanged (`main/screen/` already); **R4** re-pinned to `ea5930e0…` with
  `--write-route-pin`, the comment naming `16115392…` and both methods; **Z1 widened**: `SIGNED_ROUTES` gains exactly
  `scrollback`, the row a signed GET read alive outside any window; **Z7, Z9, Z12 widened** over `src/main/screen/scrollback.ts`
  (no log, no `.message`, no status setter; its only verbs `display-message -p … SCREEN_FORMAT` and `capture-pane -p -e … -S
  <int> -E <int>`, every `-S`/`-E` value `String(` of a name main checked whole; `composePage` pure); **Z19 widened** (D29):
  `POCKET_NONCE_MEMORY ≥ (2 * POCKET_CLOCK_SKEW_MS / 1000) * (1000 / SCREEN_MIN_ANSWER_GAP_MS + 20 + 1000 / SCROLLBACK_MIN_GAP_MS + 1)`.
- **NEW**, read with the TypeScript parser:

| Rule | Holds |
| --- | --- |
| Z23 | D5's agreement and pane clause (§5.4) |
| Z24 | the cadence (§5.4) |
| Z25 | THE PAGE ROUTE: `readScrollbackQuery` takes exactly the six names, each once, every number by a character walk and in D7's bounds read from the contract's constants, `from + count ≤ depth`, `keep` by `===`; the route answers a refusal, an unknown id, an absent `facts.scrollback`, a rejection and a session removed while read as null; `scrollbackOf` composes field by field with fresh arrays and holds §5.3.1's invariants |
| Z26 | THE PAGE READ (§5.3.5, §Attack B1 to B3): `scrollback.ts`'s order (row; turn, queue and floor, the wait asking `closing(` on a `SCREEN_TICK_MS` timer; then per attempt `closing(`, ONE statement of three lines with no display-only round before it, the agreement through `read.ts`'s exported `agree(`, D12's refusals over the agreed frame, the cover, compose); attempt 1's `h0` the ask's `depth` and later attempts' the previous attempt's display; `a = from − SCROLLBACK_OVERSCAN − h0` with no `max(0, …)` around `from − SCROLLBACK_OVERSCAN`, and the first index `max(0, a + h1)`; at most `SCROLLBACK_ATTEMPTS` (3) attempts; one read in flight per session, at most `SCROLLBACK_QUEUE_MAX` (4) waiting, `busy` past it; between starts at least `SCROLLBACK_MIN_GAP_MS` (250) here and `SCROLLBACK_MIN_GAP_REMOTE_MS` (`= SCREEN_TICK_REMOTE_MS`) far, and at least `SCREEN_DUTY_FACTOR` times the last page's compose; every exec raced against `closing(` as well as its deadline |
| Z27 | THE PAGE'S ROWS: `composePage` reads the whole capture's pens before it cuts and builds runs for the kept rows only (§Attack B10), keeps `keep`'s end past a cap, builds the page's own style table; the answer's `from + rows.length ≤ depth` and its `space` from `spaceOf(` over the agreed display |
| Z28 | THE LIVE DEPTH AND SPACE: `composeScreen` sets `depth` and `space` together from the display only when `steady`, not alternate and at most `POCKET_SCROLLBACK_MAX_INDEX`, else both null; `spaceOf` declared once; `SCREEN_FORMAT` declared once with `#{history_size}` its eighth and last field, read as at most nine digits (§Attack B16) |
| Z29 | `moved` is answered for exactly D12's conditions over each attempt's AGREED frame (the alternate screen, `cols ≠ wrap`, `h1 < depth`, `h1` below the previous attempt's display, `from ≥ h1`), before anything is composed, and the capture of a refused attempt reaches no answer, log or store |
| Z30 | THE HONESTY SENTENCE names what the terminal shows and what it printed before (D35); the route line is derived (unchanged code) |

`ablation:p313` gains one arm per new or widened clause (about 30), each red on the rule that owns it: among them `agree`
without `paneId`, without `history`, a third attempt in `readScreenLocal`, the keys aimed at the first display's pane, `tickOf`
answering 100 for a remote row, a literal 100 in `pump`, `SCREEN_TICK_REMOTE_MS` 300, the overscan dropped, the agreement
skipped, `-S` built from a string, a fourth attempt, the floor removed, a cut before composing, `depth` set when not steady,
`moved` for a shallower history skipped, and the honesty sentence unchanged; and since the adversary's round (§Attack B1 to
B3, B8, B10, B16, B22): a display-only round put back before the statement, `max(0, from − SCROLLBACK_OVERSCAN)` put back,
`a + h1` without its `max(0, …)`, the queue bound removed, the wait not asking `closing(`, an exec not raced against
`closing(`, the far floor set to the local one, the duty cycle removed, runs built for the dropped overscan rows, `space` set
when `depth` is null, the eighth field read as six digits, and a second `SCREEN_NUDGE_MS` schedule outside the settle.

### 6.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

In-process over a recording fake `facts.scrollback`: an honest page (200, the fake asked once with the parsed ask); each name
missing, repeated, unknown, a number with a sign, a leading zero, 100,001, a `count` of 0 and 129, a `wrap` of 513, `keep` of
`middle` and `TOP` (each 404 `route`, the fake never asked); a `/v1/screen` signature on `/v1/scrollback` (404 `signature`);
another phone's connection (`channel`); a held page while the door stops (answered or cut, never after the join); a page while
its phone is Removed (cut, no byte after); 50 page reads from one phone over its 4 connections in 2 s (each answered or refused
at the source cap, never a crash, the fake never asked twice at once for one session); a page main answers with a row past
`wrap`, a style index out of range, `from + rows > depth`, a `space` that is not 12 lowercase hex, a `why` with rows (each
answered as an unknown id: `scrollbackOf` refuses it); a query with `from + count > depth` (404 `route`, the fake never asked).
And over the SHIPPING `createScreenScrollback` with a scripted core whose statement never answers (§Attack B3): a page waiting
its turn behind three others and a page inside its exec, each answered `unreachable` within one `SCREEN_TICK_MS` of the door
stopping and before `DOOR_STOP_JOIN_MS`; a fifth page waiting on one session answered `busy` at once.

### 6.3 `conformance:machines` and `ablation:p320`

- **Condition 124 widened**: `remote-screen.ts` reaches the machine through `execOn(` alone, its live read three commands
  (D6), its page rounds `remoteScrollbackArgv`'s, the verbs `display-message` and `capture-pane` only, `SCREEN_FORMAT` the only
  format.
- **NEW 140**: `remoteScrollbackArgv` composes `-S` and `-E` only from whole numbers it checks (a non-integer throws before
  composing; the check is `remote-pane-history.ts`'s `wholeNumber` or matches it clause for clause), aimed at a `$N` matching
  `SCROLL_TARGET`; no caller string reaches its argv; it composes ONE exec of the three commands and nothing composes a
  display-only page round (§Attack B2).
- **NEW 141**: the far page reader asks the live address (`remoteScrollAddress`) before it composes, and names no carriage row,
  no `send-keys` and no `copy-mode`.
- `ablation:p320` gains one arm per clause (about 6).

### 6.4 `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, `test:ios`, the vectors

- **(aq) REWRITTEN, THE TERMINAL PANS, A PAGE NEVER MOVES IT, AND A LONG PRESS SELECTS**: no SwiftUI `ScrollView`,
  `LongPressGesture`, `DragGesture` or `MagnifyGesture` in any `Screens/Screen*.swift`; `ScreenScrollView` a `UIScrollView` with
  `contentInsetAdjustmentBehavior = .never`; its gestures `UILongPressGestureRecognizer` (`minimumPressDuration =
  ScreenGesture.longPressSeconds`), `UIPinchGestureRecognizer`, `UITapGestureRecognizer`s, each added to the scroll view and
  reading `location(in:` the content view; the single tap `require(toFail:` the double tap; the hosting view
  `isUserInteractionEnabled = false`; `apply(above:` adds its delta to the CURRENT `contentOffset` inside `layoutSubviews` (the
  pass that grows or shrinks the content), inside `UIView.performWithoutAnimation`, and nothing else writes `contentOffset` but
  `following`'s pin and the overlap's clamp; the content's height is the layout's rows plus D25's pad, computed from the scroll
  view's own `bounds` and the overlap, with no SwiftUI geometry (§Attack B5).
- **NEW (ar) THE KEYBOARD NEVER MOVES THE TERMINAL'S FRAME** (D24, §Attack B4): `ScreenPage`'s ROOT stack carries
  `.ignoresSafeArea(.keyboard` and no other view in any `Screens/Screen*.swift` or in `TerminalPage` does; `contentInset` and
  `verticalScrollIndicatorInsets` written in `keyboardOverlap(` alone, from `keyboardWillChangeFrameNotification` (and
  `WillHide`), converted with `convert(` into the scroll view; the same function clamps the offset and publishes the overlap;
  the line and the back-to-live button are padded by that published overlap and by nothing else; no `GeometryReader` frames
  the rows. Its fixtures include the shape that passed the first draft: the opt-out on the representable alone inside a stack
  with a view below it, which must read red.
- **NEW (as) THE SCROLLBACK CLIENT** (D7, D13, D25 to D28, D31): the scrollback target spells exactly `id`, `from`, `count`,
  `depth`, `wrap`, `keep` in that order, and rule (ah) is widened to refuse `cols`, `rows`, `resize`, `width` and `height` in
  it; one page in flight, `ScrollbackModel.minGap` at least 0.25 and declared once, 100 rows and 8 overlap rows from constants
  declared once; `accept(` compares `space`, `wrap`, `depth` and the overlap rows' text before it joins, and changes no layout
  height; a live picture raises `depthSeen` while `scrolled`; `reserve(` is the one place `top` moves; `ScreenPoint` carries an
  absolute index and Copy is guarded by every selected row being drawn; at most 3,000 rows held; nothing persisted (`PERSISTS`
  over the new files); the sender's `onSend` returns the model to `following`; every arithmetic operator on a door integer
  through `DoorNumber` or named (rule (k) widened).
- **NEW (at) TERMINAL FIRST** (D16 to D20): `SessionRoute` draws `TerminalPage` exactly when the answer's `screen` is true and
  `screenDoor(` answers a door, else `CatchUpPage`, the choice stored once; `TerminalPage`'s trailing items are exactly the Catch
  Me Up icon (`Image(systemName: "text.bubble")`, `ID.sessionOpenCatchUp`, `Copy.catchMeUp` its label) then `EndTopItem`; the
  tray's presses go through `ReplyModel.press` alone, draw every option with `lines: nil` (rule (ae) widened) and carry 318's
  `ID.sessionChoicePress(` (§Attack B6); the status line reads `SessionDrawing` fields alone; the session route's container is
  `ID.sessionScreen` over both faces; no `Route.screen`, no `openScreen`, no `ID.sessionOpenScreen`.
- **NEW (au) THE RENAME** (D21 to D23): no `Copy` word equals `Conversation` or `Screen`; `Copy.catchMeUp` owned by
  `src/main/menu.ts`'s word byte for byte; no drawn string literal anywhere in the app is `Conversation`; no accessibility
  identifier string spells `conversation`; `terminalStaysOnMac` absent.
- **Widened**: (ah) as above; (ak) the third kept line (`side`) in `PairedScreenDoor`, closed by `close()`, one exchange at a
  time through its one gate, carrying `scrollback` and `session` alone; (t) the hostile
  door's scrollback arms named (`scrollback-extra-rows`, `scrollback-from`, `scrollback-colour`, `scrollback-overlap-lie`,
  `scrollback-space`, `scrollback-chunked`, `scrollback-never`, `scrollback-404`, pinned here so the two builders agree); (v)
  `scrollbackSentence(for:)`; (k); (ae); `SCREEN_FILES` and `OWNER_CHECK_ABSENT` gain `Screens/ScreenScrollback.swift` and
  `Screens/ScreenScroller.swift` (both inside `isScreenFile`'s family, §Attack B15); (s) build 7 unchanged.
- `ablation:p316` gains one arm per new or widened clause (about 35): among them a SwiftUI `ScrollView` put back, the inset
  written outside `keyboardOverlap(`, the root's opt-out moved onto the representable alone, the line not padded by the
  overlap, the offset delta outside `layoutSubviews`, the pad removed, the single tap not waiting for the double, `cols` in the
  scrollback target, the overlap check removed, the `space` check removed, two pages in flight, `minGap` 0.1, a point by its
  layout row, Copy unguarded, the tray on new identifiers, `Route.screen` put back, End before the icon, a `Conversation`
  word put back, the model's file named outside the `Screen*` family.
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): `Catch Me Up` owned by `Copy.catchMeUp`; `Terminal` by
  `Copy.terminal`; D23's sentences; the redrawn mocks judged; the Session mock's rows judged as data against the sample;
  self-test mutations: `Catch Me Up` cased differently in `Copy.swift`, `Conversation` put back in a mock, each red.
- **`test:ios`** (`build/p316/test-ios.mjs`): its Node door answers `GET /v1/scrollback` over a history it composes from the
  numbered-lines fixture (signature verified by `node-phone.mjs`'s `verifySigned`), and its screen answers carry `depth` and
  `space`. NEW `P3371ScrollbackTransportTests` drive the
  SHIPPING `DoorClient` and `DoorLine`: two pages on one kept line count one handshake; a page on a line the door closed is asked
  once more and answered; a page and a poll at once ride two lines; a page and a status re-read asked at once go one after the
  other on the side line, never two connections.
- **The vectors** (`build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`): a `/v1/scrollback` read, signed as Swift
  writes it, accepted by the shipping verifier, one with a byte changed refused `signature`; the `screen-sample` answer regenerated
  with `depth` and `space`.

### 6.5 The other gates

- **`conformance:choices`**, **`conformance:handback`**, **`conformance:manager`**, **`conformance:push`**: not edited; each runs
  and reads what it read at `e3837139` (`routes.ts` is in `conformance:manager`'s reach; the page reader asks `screenLive`, the
  gates' one live set).
- **`build/assert-import-boundaries.mjs`**: unchanged (the `main/pocket/` wall already forbids `main/screen/`).
- **`gate:electron`**, **`gate:simulator`**: no new script reaches either helper; the floors stay 169 and 2.
- **`gate:background`**, **`gate:checks`**: every server, stand-in, sshd and node phone the extended probes start is ended in
  a `finally` that names it; no new npm script.
- **`gate:knownhosts`**: the remote arms reach ssh only through `build/scratch-machine.mjs` and `build/ssh-run.mjs`.
- **`gate:contract`**: unchanged, byte for byte.
- **`probe:controldeadline`**: not triggered (`control-client.ts` does not move).
- **CLAUDE.md** (the integrator): the pocket row names the `scrollback` row, R4's `ea5930e0…` and Z23 to Z30; the Screen row
  names `scrollback.ts`, the eighth display field and the two new gates; the ios row names (aq) rewritten, (ar) to (au) and the
  widenings; the machines row names condition 124 widened and 140, 141; the `probe:p337`, `measure:p337` and `probe:p316` rows
  each gain one sentence for the arms below; each one line in the house style.

---

## 7. The proof, run rather than read

### 7.1 The battery

`typecheck`, `build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`, `gate:background`,
`gate:checks`, `gate:knownhosts`), `test`, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`; `conformance:pocket`,
`conformance:pocket:hostile`, `ablation:p313`, `conformance:machines`, `ablation:p320`, `conformance:choices`,
`conformance:handback`, `conformance:manager`, `conformance:phonecopy`, `conformance:push`, `ablation:p316`,
`node build/p316/vectors.mjs --check`, `measure:p337 -- --check`; every grader self-test (`probe:p317`, `probe:p318` and
`probe:p3167` among them, whose route lines move, §Attack B7); `test:ios` in Debug and Release on iOS 26.3 and 18.3
(verifiers, under the lock); `smoke:t1`, `smoke`, `smoke:t3` at landing (they launch the app). `git diff e3837139 --
src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity src/renderer/terminal src/main/attach src/main/tmux
src/main/machines/host-record.ts src/main/machines/remote-sessions.ts` is empty, and under `src/renderer` only
`src/renderer/settings/__tests__/p316-phone-section.test.tsx` moves.

### 7.2 Vitest (the builders')

- `read.test.ts`: eight fields, tab and `_`; a seventh field missing, a ninth, a history of ten digits refused and of seven to
  nine read (§Attack B16); the agreement over each of the five fields (a disagreement on the history alone read twice, served
  `steady: false`).
- `p337-remote-screen.test.ts` widened: three commands, split by count, a forged display-shaped row inside the capture, a count
  that does not hold read as today's split with `steady: false` (never `unreachable`); the page argv (ONE exec of three
  commands); a non-integer `-S` throws.
- `compose.test.ts` widened: `depth` and `space` null together for alternate, unsteady and over 100,000; `space` the same for
  one pane and different for two; `composePage` reads every pen before it cuts (a pen opened in the overscan carried into the
  first kept row) and builds no run for a dropped row, keeps the bottom or the top past each cap, a single row of 512 styles
  kept, the page's own table.
- NEW `scrollback.test.ts` over a fake core and scripted statements: D9's numbers (attempt 1 at the ask's `depth`, later
  attempts at the previous display); the overscan; the OLDEST page (`from` 0, 30, 100) with lines arriving between the phone's
  depth and the statement, served from the oldest line by `max(0, a + h1)` (§Attack B1); an agreement failing then succeeding;
  a cover failing at a flood then succeeding with the newer frame; three failures `busy`; each of D12's `moved`, a frame
  shallower than the previous attempt's among them; `closing()` before an attempt, AND while waiting its turn, its floor and an
  exec, each answering within one `SCREEN_TICK_MS` on a fake clock (§Attack B3); a fifth waiting page `busy`; one in flight per
  session, 250 ms between local starts and 400 ms between far ones, and the duty cycle after a slow compose; no log, no status
  setter; remote `unreachable`.
- `sample.test.ts`: the sample regenerated with `depth` and `space` (`P337_WRITE_SAMPLE=1`), and the committed file held equal.
- `src/shared/__tests__/screen-copy.test.ts`: D23's moved sentences and the two new ones pinned byte for byte (it pins
  `SCREEN_ENDED`, `SCREEN_TOO_LARGE` and `SCREEN_QUESTION_MOVED` today, so it moves with them, §Attack B7).
- `routes.test.ts`, NEW `p3371-scrollback-route.test.ts`: `readScrollbackQuery` every refusal; `scrollbackOf` every invariant;
  absent `facts.scrollback` 404; `pairing.test.ts`: the route line and the moved hash; `p316-phone-section.test.tsx`: the
  honesty sentence.

### 7.3 XCTest (the phone's)

`ScrollbackModelTests` (Paseo's four behaviours over the model; each request shape of §5.5.4, none past `depthSeen`; overlap
mismatch, a smaller depth, another wrap and another space each `moved`; a live picture raising `depthSeen` while scrolled and a
trimmed one moving it; reservation one page at a time and never below 0; a page filling reserved rows with the layout's height
unchanged; the 3,000 cap and eviction farthest first, back to reserved; one in flight and 0.25 s; `onSend` to `following`;
selection points by absolute index across a reservation; Copy withheld over a reserved row), `ScreenScrollerTests` (the
overlap from a keyboard frame converted into the view, published once; the offset clamped when it goes; D25's pad: the live
rows of a 40-row screen at the 337 build's measured 6.67 pt in a 758 pt view stay at the same on-screen y within half a point
when 100 rows are reserved above, and `following` puts them at the top; `apply(above:)` keeps the first visible row's
on-screen y within half a point over 1,000 random reservations, follows and evictions, including while the scroll view's
offset is being changed by a scripted drag; a change of cell size keeps the top row), `ScrollbackDecodeTests` (every bound of §5.5.2, each refused whole),
`TerminalRouteTests` (the face decided once; ended to Catch Me Up; no screen door to Catch Me Up), `CatchUpPageTests` (the now card
after the newest turn; the last answer only without turns; the message box per `boxDrawn`), `StatusLineTests` (a re-read on a
moved turn or asking, never two in a second, one in flight, through the side line's read alone), `P3371ScrollbackTransportTests` (§6.4), `CopyTests` and
`EndTopTests` widened, and 337's `ScreenSelectionTests`, `ScreenRowsTests`, `ScreenDecodeTests`, `ScreenGridCostTests` (now with
3,000 history rows held at the fitted size and the top size, the same 64 MB ceiling) kept green.

### 7.4 The committed fixtures

`build/fixtures/screen/sample-claude-2.1.287.json` regenerated (`depth`), written ONLY by the screen builder's `sample.test.ts`.
No other fixture is committed: the measure and the probes draw their histories from the committed captures and from numbered
lines they generate.

### 7.5 The stand-ins

NEW `build/p3371/history-stand-in.mjs` (the proof builder's): run inside a pane, it draws a history by mode and then sleeps,
reading nothing but the files it is named: `--lines N` numbered lines (`L000001 …`); `--stack <file>` every committed capture
named in a list file, rows joined by CR LF with no reset between files; `--rate R --total N` numbered lines at R a second (0: as
fast as it can); `--counter` one numbered line a second at the bottom after its history, so a live row keeps changing; `--alt`
its history, then the alternate screen. 337's stand-ins (`build/p318/stand-in.mjs`, `build/p321/stand-in.mjs`,
`build/p337/key-recorder.mjs`) are used as they are.

### 7.6 `measure:p337` — arms H and D (`build/p337/measure-screen.mjs` → `drive-screen.mts`)

| Arm | Holds |
| --- | --- |
| H1 | 3,000 numbered lines: the SHIPPING page reader answers every page of 100 by index exactly (`L(i+1)` at index `i`), first, middle and last |
| H2 | **The matrix**: the committed captures stacked by provider (Claude Code `.ansi` and `.txt`, Codex `.ansi` and `.txt`, Gemini, Qwen, Antigravity, Cursor, OpenCode, Muse, Pi, a shell), the whole history paged by the SHIPPING reader: every row's text equal to `capture-pane -p` for the same index range and every run's style equal to the measure's own SGR reader's (never `sgr.ts`), 0 mismatches graded on both builds |
| H3 | **While output scrolls**: 100, 1,000 lines a second and a flood, 400 pages each, `depth` read 300 ms before each page as the phone's is (§Attack B1): wrong 0 graded, `busy` at most 1 percent at the flood and 0 below it, p99 under 5 ms; and the OLDEST pages (`from` 0, 30, 100, 60 each at 100 and 1,000 lines a second) through the SHIPPING reader with a 10 ms delay injected before each statement, as a far machine's round trip: 0 wrong and 0 `busy` graded, the arm that the spec's first draft failed (BM2: 0 to 1 of 60 served) |
| H4 | `moved`: a limit of 1,000 trimmed under a held `depth`; `clear-history`; `ESC [ 3 J`; a width change; the alternate screen; each `moved`, nothing composed |
| H5 | The worst page (every cell its own colours): the rows nearest `keep` that fit, 5 at 120 columns, both ends; and the SHIPPING reader's compose time for a whole 236-row worst capture printed, with the next start of that session at least `SCREEN_DUTY_FACTOR` times it later graded (§Attack B10) |
| H6 | The live picture's `depth`: equal to `#{history_size}` at rest, null on the alternate screen, and never a value off by a line from the agreed frame under the flood |
| D | **D5's pane clause on real tmux**: a window of two panes whose active pane is switched between the two displays of a read by a second client: read once more, the second's pane served, and a keys write after it reaching that pane alone (the recorder in each pane) |
| DS | **The space** (§Attack B8): the same two panes of different histories, the live picture read on one, the active pane switched, a first page read through the SHIPPING reader: the page's `space` differs from the picture's (graded), which is what D13's check on the phone refuses (PSH's `scrollback-space` arm proves the phone's half); the parent build has no `space` and is printed, not graded |

`--self-test` grades recorded fixtures of H and D, each clause shown red on its own break.

### 7.7 `probe:p337` — arms SB (`build/p337/probe-p337.mjs`, ONE Electron, the same harness)

| Arm | Holds |
| --- | --- |
| SB0 | The door reads `changed`; the route line holds `scrollback`; the honesty sentence D35's; Allow |
| SB1 | `/v1/scrollback` paged over the whole history of: Claude Code inline after the committed screens stacked, Codex inline the same, a `/bin/sh` shell with 3,000 numbered lines, Gemini's and Qwen's screens stacked, and the loopback machine's shell: every row's text equal to the probe's own `capture-pane -p` of the same index range, byte for byte, and its styles to the probe's own reader; the window's size before and after: unchanged |
| SB2 | While a stand-in prints 200 and 2,000 lines a second: 100 pages each verified by number, `busy` counted, and the live poll's change-to-answer p99 still under 250 ms while paging |
| SB3 | **The attack**: every refused query of §6.2 live (404 with nothing composed, main's own log read); `wrap` not the width, `depth` above the history, a `from` past it, the alternate screen (each `moved`); 200 page reads from one phone in 2 s over its connections: every answer in its form, at most `SCROLLBACK_QUEUE_MAX` waiting per session and the rest `busy`, main's event-loop lag p99 under 50 ms, starts per session 250 ms or more apart by main's own stamps, and on a worst-colour history (`--worst`) at least `SCREEN_DUTY_FACTOR` times the last compose apart; a page on a session ended between query and read (`ended`); and the door switched off from Settings then Phone while pages wait: every one answered or cut before the stop join, by the door's own log (§Attack B3) |
| SB4 | A scratch session with history-limit 1,000 trimmed under a held `depth`: `moved`; `clear` in the shell (E3): `moved` |
| SB5 | The loopback machine's connection stopped: `unreachable`; back: paged again |
| SB6 | `app.log`, every file under the profile and HOME and `ps -ww` sampled through SB1 to SB5: no row text of any page |
| RP | With `P337_PARENT_CHECKOUT` (`e3837139`), a second Electron after the first, never at once: `/v1/scrollback` 404 `route`; the screen answer carries no `depth`; the route line names no `scrollback` |

`--grader-self-test` gains SB's cases, each clause shown red on its own break.

### 7.8 `probe:p316`, arm group `screen` — the phone

`P316DriveUITests.swift` gains the steps `terminal-open` (a list row tapped, the Terminal waited for), `catch-up` (the icon
pressed), `scroll-up:<n>` (n drags up, a reading after each), `scroll-hold` (the finger lifted, readings until a page lands),
`fling-up`, `to-live`, `keyboard-glitch` (the reading before the keyboard, with it up, after the bar's hide key, 2 s later, then
a long press and drag along row 3 and Copy) and `tray-press:<n>`; the `conversation` step presses the icon; `open:` waits for
`screen-session` (the Terminal or Catch Me Up); 337's `screen-open` becomes a wait for the grid.

**OPTION B MOVES EVERY EARLIER ARM GROUP THAT OPENED A SESSION, and they are run, not assumed** (§Attack B6). A live session's
page is now the Terminal, so the steps that read the session page's card, counts, last answer, message strip or Conversation
row (`reply-say`, `reply-refused`, `reply-again`, `reply-edit`, `reply-home:say:`, `reply-focus`, `reply-none`, `markdown`,
`link:`, `conversation`, `first`, `idle:`, `end-read`, the alert taps' reads) press the Catch Me Up icon first when the Terminal
is the face (ONE helper, `toCatchUp()`, which does nothing when Catch Me Up already is), and say in their line which face they
read. `reply-press:<n>` presses 318's `session-choice-press-<n>` wherever it is drawn, which on a live session is now the
Terminal's tray. `end`, `end-cancel`, `end-home` press End in the top bar of whichever face is up. Every grader keeps its
clauses; a grader that read a frame of the old page's layout (the strip docked above an End bar, 318's P5) reads the same
frame on Catch Me Up. The verifiers run `P316_ARMS=screen,end,reply,markdown` at HEAD on iOS 26.3 and those groups' floor
arms on 18.3, and the alert taps (N4 to N7) once; each group's PASS is the regression proof of a row of §7.10.

| Arm | Simulator | Holds |
| --- | --- | --- |
| PS10 | 26.3 | **Terminal first**: a list row opens the grid at once (the tap-to-first-row time printed, which includes the one session read that decides the face); no `session-open-catch-up` row-shaped element, no `Conversation` or `Screen` label anywhere; the status line's labels equal the door's `statusTitle` and agent line; the icon then End in the navigation bar's trailing half, End rightmost, both hittable, and with a selection held Copy, the icon and End all hittable |
| PS11 | 26.3 | **Ended opens on Catch Me Up**: an ended session from Sessions (Show all) lands on the two-line title with the turns and the now card, no grid |
| PS12 | 26.3 | **The tray**: Codex's committed question on a stand-in: the tray's buttons are the pressable options, whole; `tray-press:2` puts exactly `32` at the stand-in, no owner check up |
| PS13 | 26.3 and 18.3 | **Scrollback**: a stand-in with 3,000 numbered lines and a live counter: the FIRST drag up from rest shows history rows during that same drag (D26's reservation; a bounce with nothing above fails); ten drags up; every drawn `screen-history-<i>` label equals the probe's `capture-pane -p` of index `i`; the counter row's label changes while scrolled back; across at least three landings of OLDER pages, each read with the finger lifted (`scroll-hold`) while the view's top is within one page of the oldest held row, the first visible history row's label and frame are unchanged within half a point (the door's page events counted, a gap page not counted); one `fling-up` across at least one landing, after which every drawn history row's label still equals tmux's at its index and the rows are contiguous; `to-live` returns the counter row to the bottom with the live rows' top where it was at rest; a key typed while scrolled back returns it too |
| PS14 | 26.3 and 18.3 | **The keyboard**: live row 0's frame equal within half a point before the keyboard, after it is put away, 2 s later and after the first long press; the grid's own frame equal before, with and after the keyboard (the frame never follows it, D24); while the keyboard is up the line under the terminal and, while scrolled back, the back-to-live button sit above the keyboard's top; the long press along row 3 copies row 3's label (the pasteboard read through the helper on the run's own device); and 337's own PS3 (pinch, swipe, slow drag, swipe up, the turn) and PS6 (the selection) run on the rebuilt view on both runtimes, graded as 337 graded them |
| PS15 | 26.3 | **Catch Me Up**: the icon opens it; the now card after the newest turn; 318's message box on an idle stand-in; End top right; back returns to the Terminal |
| PS16 | 26.3 | **Full screen**: an alternate-screen stand-in: drags up draw no `screen-history-` element and no line |
| PSH | 26.3 | `build/p316/hostile-door.mjs`'s scrollback arms (named in §6.4): a page with more rows than asked, a `from` not asked, a colour not `#rrggbb`, overlap rows that lie (the phone draws the moved line and asks nothing more), a page of another `space` (the same), a chunked page, a page that never comes (asked again after its back-off, the live rows still updating), a 404 page: each ends with the live terminal drawn and the app in the foreground |
| PSP | 26.3, with `P316_PARENT_IOS` (`e3837139`'s `ios/`) | the parent's rows sit 134.7 pt low after the keyboard (printed; graded as the parent's defect, the arm that proves PS14 can fail); a list row opens the session page, not a terminal |

`probe-p316.mjs --grader-self-test` gains the cases, each clause shown red on its own break. 18.3 is the floor: PS13 and PS14
run there because the scroll view is new code on both runtimes.

### 7.9 The independent methods (four, one an attack) and the parent

1. **The attack**, live: SB3, SB4, PSH and the hostile client, and the verifier's own: a page asked while the program enters the
   alternate screen; a page whose overlap is all blank rows across a trim; two phones paging one session while a third types;
   a fling to the oldest line and back; a selection begun in history and dragged into the live rows, and one reaching rows not
   yet fetched (Copy must wait); the keyboard raised during a page landing; and from the adversary's round: the OLDEST page of a
   session on the loopback machine while its shell prints 100 and 1,000 lines a second (§Attack B1), the door switched off
   while pages wait (§Attack B3), and the active pane switched at the Mac while the phone is scrolled back (§Attack B8). Each
   asserted on the drawn label or the door's own log, never on the reader's report.
2. **Re-derive the pages**: the verifier's own reader of a styled capture (importing nothing of `src/main/screen`) over every
   page SB1 read, compared cell for cell with the door's answer.
3. **Re-derive the index space**: the verifier's own numbered stand-in and its own index arithmetic over tmux, without the
   reader, compared with what the phone drew at each `screen-history-<i>` (PS13).
4. **The per-provider matrix**: H2 and SB1 by row: Claude Code inline, Codex inline, Gemini, Qwen, Antigravity, Cursor,
   OpenCode, Muse, Pi, a shell, a full-screen program (none offered), and a shell on another machine; columns: page text equals
   `capture-pane -p`; styles round trip; the phone drew it (PS13 for the rows a Simulator arm drives).
5. **The parent**: RP, PSP, and `measure:p337`'s arms at `P337_PARENT_CHECKOUT` where they read the parent at all (H has nothing
   to read there; D reads 337's pane clause, which the parent holds too).

### 7.10 No regression against today

| Scenario | Today (`e3837139`) | At HEAD | Verdict |
| --- | --- | --- | --- |
| Opening a running session on the phone | the session page; the Screen one row down | the Terminal at once | his ruling 3 |
| The card, the counts, the last answer, the message box | on the session page | on Catch Me Up, one tap (the icon) | his ruling 3; nothing removed |
| A numbered question | buttons on the session page | buttons under the Terminal, and on Catch Me Up | same, one tap fewer; 318's `reply` arms, run on the Terminal's tray (§7.8) |
| One message to an idle session | the box on the session page | the box on Catch Me Up, one tap (the icon); or typed straight into the Terminal | same; 318's `reply-say` arms on Catch Me Up |
| End | top right | top right on both faces | same; 317's `end` arms on both faces |
| End these | the Sessions tab's Select | unchanged | same; `end` group's E4 |
| Tapping an alert | the session page | the Terminal (the question's buttons in its tray), or Catch Me Up if the session ended | same; N4 to N7 |
| An ended session | the session page, then the Conversation row | Catch Me Up, with the conversation and the card | same, one tap fewer |
| A Mac without this phase | the session page (no Screen row) | Catch Me Up, which holds the same | same |
| Reading what a session printed earlier | the conversation's turns only | the terminal's own lines too | better |
| iOS 26.3 after the keyboard | rows 134.7 pt low, a long press selects the wrong row | rows where they were | better (PS14, PSP) |
| A paired phone after the update | reads, types, ends, presses | the door asks Allow once | the cost every route-adding phase pays; the CHANGELOG says it |
| The Mac while a phone pages | — | at most four page reads a second per session here and 2.5 on another machine, each under 5 ms local, none closer than four composes apart | S12 of 337, SB2 and SB3 measure it |
| Another machine while a phone pages | — | one exec a page while the agent prints under about 400 lines a second, two past it, at most 2.5 pages a second | D10, D14 (§Attack B2) |
| A far picture | two commands an exec | three | one display more, measured the same exec time (D6); a count that does not hold is still a picture, as today |
| The door stopping while pages wait | — | every page answered or cut within one tick, inside the stop join | SB3, the hostile client (§Attack B3) |

---

## 8. The CHANGELOG item

Under `## Unreleased`, `### Added`; the follow-up docs commit adds the link.

- `- On the iPhone, tapping a session now opens its terminal straight away, with how it is going under its name and Catch Me Up, the session's conversation with where it stands now, behind an icon at the top beside End, and you can scroll the terminal back through what the session printed while the screen below keeps updating. A full-screen program scrolls back nothing, an ended session opens on Catch Me Up, and your Mac asks you to allow the phone door again once after this update`

No other item moves. (337's item still says "open a session's own screen", which stays true; the integrator raises it for his
rewording and edits nothing.)

---

## 9. His checklist — `build/p337/CHECKLIST.md`, rewritten for build 7 (the proof builder's)

One checklist for the one TestFlight build, its rows in his words, each saying what to open, press and see, then "Not covered
yet" and the table of where every word was found. Rows 1 and 2 change; rows 9 to 12 are new:

1. **The Mac.** Settings then Phone: the door asks again; the route line ends `…say, screen, scrollback, session, sessions,
   turns`; the honesty sentence is D35's. Allow.
2. **Terminal first.** Tap a running Claude Code session. **You should see** its terminal at once, one line under the name with the
   status in its colour, then `Claude Code · <project>`, and a speech-bubble icon then `End` at the top right.
9. **Scroll back.** In a session that has printed a lot, drag down on the terminal. **You should see** older lines arrive above
   while the bottom keeps changing, and what you are reading stay still. Press the arrow at the bottom right: back to live.
10. **Catch Me Up.** Press the speech bubble. **You should see** `Catch Me Up` under the session's name, the conversation, and at
    the bottom where things stand. Back returns to the terminal.
11. **An ended session.** In Sessions, Show all, open an ended session. **You should see** Catch Me Up, not a terminal.
12. **The keyboard.** Tap the terminal, then put the keyboard away with the bar's last key. Long press a row and Copy. **You
    should see** that row's text in Notes.

**Not covered yet**: how paging feels through Funnel; a history past 25,000 lines with a deeper Scrollback depth; an iPad.

---

## 10. Builders, disjoint files, and who owns what is shared

Six builders in `/private/tmp/wt-p3371` at once, on `e3837139`, each coding against the names pinned in §5. No file is in two
lists. Builders run `npm run -s typecheck` and the vitest files they own (or `xcodebuild build-for-testing` with
`-derivedDataPath …/scratchpad/p3371/dd-<role>`, deleted before returning); they launch no Electron, boot no Simulator, run no
probe and no whole `npm test`; they never commit, stage or stash. The adversary split the spec step's one **proof** builder
into **gates** and **probes** (§Attack B9): it carried three conformance gates and their three ablation scripts, every
probe and harness the phase moves, the UI drive and its re-pointing of four earlier arm groups, the checklist and the mocks,
which is more than the four other lists together.

| Builder | Owns |
| --- | --- |
| **door** (the door, the contract, the composition) | `src/main/pocket/door/table.ts`, `door/wire.ts`; `src/main/pocket/routes.ts`, `facts.ts`, `ipc.ts`; `src/shared/ipc/pocket.ts`; `src/main/capabilities.ts` (the page reader's wiring only); tests `src/main/pocket/__tests__/{routes,facts,ipc,door-wire,pairing,server}.test.ts`, NEW `p3371-scrollback-route.test.ts`, `src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `build/p313/hostile-client.mts` (and `hostile-client.mjs` if its list of arms is there), its new arms over the SHIPPING `createScreenScrollback` included (§6.2); `build/p316/node-phone.mjs` (`scrollbackRead`) |
| **screen** (the Mac's reads and composition) | `src/main/screen/read.ts`, `compose.ts`; NEW `src/main/screen/scrollback.ts`; `src/main/machines/remote-screen.ts`; `src/shared/screen-copy.ts`; tests `src/main/screen/__tests__/{read,compose,sample}.test.ts`, NEW `scrollback.test.ts`, `src/main/machines/__tests__/p337-remote-screen.test.ts`, `src/shared/__tests__/screen-copy.test.ts` (§Attack B7), and `src/main/screen/__tests__/watch.test.ts` and `keys.test.ts` only where the eighth display field or a `PocketScreen` literal's `depth` and `space` move them; `build/fixtures/screen/sample-claude-2.1.287.json` (through `sample.test.ts` alone) |
| **terminal** (the phone's terminal) | `ios/Tortie/Screens/{Screen,ScreenGrid,ScreenRows,ScreenSelection,ScreenKeys}.swift`, NEW `ScreenScroller.swift`, NEW `ScreenScrollback.swift`; `ios/Tortie/Door/DoorClient.swift`, `Door/Contract.swift`; `ios/Tortie/Screens/DoorWords.swift`; tests NEW `ios/TortieTests/{ScrollbackModelTests,ScreenScrollerTests,ScrollbackDecodeTests,P3371ScrollbackTransportTests}.swift`, and `ScreenDecodeTests`, `ScreenRowsTests`, `ScreenSelectionTests`, `ScreenKeysTests` (its `ScriptedScreenDoor` gains the two new requirements), `ScreenGridCostTests`, `P337ScreenTransportTests`, `DoorClientTests`, `DoorContractTests`, `ScreenCoverTests` (it reads `struct ScreenPage: View {` from the source, which the generic signature moves, §Attack B7) and `ScreenColourTests` (its list of Screen files gains the two new ones) |
| **pages** (option B, Catch Me Up, the words) | `ios/Tortie/Screens/{SessionScreen,ConversationScreen,EndBar,Identifiers}.swift`; `ios/Tortie/App/TortieApp.swift` (routes, `SessionRoute`, `PairedScreenDoor`'s third line and pass-through, §5.5.3); `ios/Tortie/Style/Copy.swift`; `ios/Tortie.xcodeproj/project.pbxproj` (every new app and test file referenced, the other builders' included); tests NEW `ios/TortieTests/{TerminalRouteTests,CatchUpPageTests,StatusLineTests}.swift`, and `CopyTests` (its `drawn` list as §5.5.8 pins it), `EndTopTests`, `EndTests`, `ScreensModelTests`, `ScreensDrawingTests`, `ScreensFixtures`, `TabsTests`, `ReplyTests`, `AlertsTests` and `UnpairTests` (each names `Route.conversation`, §Attack B7) where the rename or the routes move them |
| **gates** (the gates and their attacks, the words, the mocks, the vectors) | `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `build/conformance-machines.mjs` (124 and the appended 140, 141; 125 to 139 are Phases 340 and 340.1's and are not touched), `build/p3201/ablation.mjs`, `build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`; `docs/design/phone/{Session,Screen,Conversation,index,Link}.html` redrawn and `docs/design/phone/{Choice,Answer,Composer,Idle,End}.html` given their one comment line (§5.5.8) |
| **probes** (the app runs, the measure, the harnesses) | `build/p316/{test-ios,hostile-door,probe-p316}.mjs`, `ios/TortieUITests/P316DriveUITests.swift` (the new steps and the re-pointing of the earlier groups, §7.8); `build/p337/{probe-p337.mjs,measure-screen.mjs,drive-screen.mts,CHECKLIST.md}`; NEW `build/p3371/history-stand-in.mjs`; `build/p317/probe-p317.mjs`, `build/p318/probe-p318.mjs`, `build/p3167/probe-p3167.mjs` (each pins the ten-id `ROUTE_LINE`, which gains `scrollback`, with its self-test, §Attack B7) |

**Shared files and their one owner.** `src/shared/ipc/pocket.ts` and `src/main/pocket/routes.ts` are **door**'s; `read.ts`'s
`ScreenDisplay`, `ScreenReading.steady` and `scrollback.ts`'s `createScreenScrollback` are **screen**'s and door codes against
them; `Copy.swift`, `Identifiers.swift`, `TortieApp.swift` and `project.pbxproj` are **pages**'s, who adds every name §5.5.7 pins
so terminal can code against them; `ScreenPage`'s generic signature (§5.5.4) is **terminal**'s and pages codes against it;
the hostile door's scrollback arm names (§6.4) are pinned here, so **probes** writes them and **gates**' rule (t) reads them;
the words each mock draws (§5.5.8) are pinned here, so **gates** draws them and **pages**' `CopyTests` reads them;
**`CHANGELOG.md`, `CLAUDE.md` and `docs/audits/contract-baseline.txt` are the integrator's** (the last must not move); this file is
the spec's, and the integrator appends "§As built — 337.1"; **`docs/BACKLOG.md` belongs to the main session**.

**The integrator** checks the base first (§4.1); reconciles the pinned names across the six (`createScreenScrollback`,
`PocketScrollbackAsk`, `PocketScrollbackAnswer`, `POCKET_SCROLLBACK_MAX_COUNT`, `POCKET_SCROLLBACK_MAX_INDEX`, `SCROLLBACK_*`,
`spaceOf`, `agree`, `composePage`, `remoteScrollbackArgv`, `ScreenDoor.scrollback`, `ScrollbackModel`, `ScrollbackLayout`, `ScreenScroller`,
`ScreenPage`'s generics, `TerminalPage`, `CatchUpPage`, `NowCard`, `ChoiceTray`, `StatusLine`, every `ID` and `Copy` name);
runs §7.1 whole except what needs the lock or launches the app; `xcodebuild build-for-testing` Debug and Release (with
`ENABLE_TESTABILITY=YES`) for the Simulator SDK and an unsigned Release device archive read by `test-ios.mjs --read-app`; scans
the delta for control, bidi, zero-width and BOM characters and for duplicated blocks of ten lines or more; writes the CHANGELOG
item and the CLAUDE.md rows; appends "§As built — 337.1".

**The verifiers** (two lenses, each under the lock, phone slot first): Lens 1, the attack and the re-derivations (§7.9 methods 1
to 3, `conformance:pocket:hostile`, `measure:p337` H, D and DS on both builds, SB3, SB4, RP); Lens 2, the app runs (`probe:p337`
SB, `probe:p316` `screen,end,reply,markdown` on 26.3 with their floor arms on 18.3, the alert taps once, PSP, `test:ios` Debug
and Release on both). Each names the step it did that the builders did not.

---

## 11. What this sends to other phases and the main session

- **318.1 (the message box)**: the Terminal is the page it will sit under; Catch Me Up keeps 318's box until then.
- **333.3 (See a Sample)**: its sample reader answers `screenDoor(_:)` as before, and `scrollback` with `moved` (a sample has no
  history), so a reviewer's Terminal simply stops at its top. The main session records it in a running-log line.
- **338 (the stream)**: what it would replace is still the watcher and the picture; the scrollback, the index space and the
  page reader stay.
- **Owed, named and not queued**: the remote execution ledger's in-memory list grows by one entry per far read (337's §As built
  named it), and a far page adds two; the main session to queue or set aside.

---

## 12. What is NOT in this phase

**The refusals that stand.**

- **No change to the Mac's own scrollback, its history limit or its copy mode**; the phone never puts a pane in copy mode.
- **No search** in the terminal's history.
- **No paste** (his ruling 4), and no pasteboard read.
- **No live byte stream and no terminal emulator on the phone** (337 ruling 4; Phase 338 only if needed).
- **No change to the size of any session**, no attach, and no size in any request.
- **No history for a full-screen program**, and no `capture-pane -a`.
- **No history kept on the phone past the Terminal**: nothing written, no cache across visits, at most 3,000 rows while it is up.
- **No message box under the terminal** (318.1), **no markdown** (still off), **no face remembered** per session.
- **No release.**

**The designs set aside.** `/v1/screen` with a range (D1); a format in `-S`/`-E` (`#{e|-|:i,#{history_size}}` expands on 3.7b and
3.6a, §14 M1, but a far tmux that cannot expand it starts silently at the visible top, and D6 of 337 keeps formats to one
constant); negative indexes from the newest line (they move under output, §14 M4); reserving the whole history's height up front
(a fling would cross thousands of rows no overlap can check; D26 reserves one page at a time as he nears the top); a SwiftUI fix
of the keyboard glitch (the centring is the framework's, and 337's fix round already fought it once); renaming the Swift files;
and, from the adversary's round: a display-only round before each page (two execs a page on another machine, and the oldest page
never served while output scrolls there, §Attack B1, B2); a start never above the oldest line (the same finding); inserting rows
above where he looks when a page lands rather than reserving them first (with the rows shorter than the view the offset cannot
follow, §Attack B5); the pane's own id on the wire (a hash of it, `space`, names the index space instead, §Attack B8); and
stopping the pages while he selects (a selection could then copy blank lines where his were, §Attack B11).

---

## 13. Open concerns handed to the verifiers

1. **Paging through Funnel is unmeasured** by rule; a page is one round trip on a kept line.
2. **A page at a flood can be `busy`** (1 of 2,400 trials locally); the phone asks again after its back-off.
3. **Two shapes the checks cannot see**, both needing a trim at the history limit while the phone reads: a history that repeats
   itself exactly at a period dividing the trim passes the overlap check (§14 M6), and the FIRST page (it has no overlap) passes
   the depth check when more than a tenth of the limit was printed between the picture and the page, so the history was trimmed
   and grew back past the picture's depth. Either can draw lines from the wrong place; nothing is typed and nothing lost, and the
   next return to live reads again. Stated, not closed.
4. **The far tmux's own history limit** is the far server's; a far history over 100,000 lines offers none (`depth: null`).
5. **A width change while he reads** stops paging (`moved`); the held rows keep their old width until he returns to live.
6. **Two phones behind one public address** each scrolling back while typing can meet the door's per-source cap (D30).
7. **The Terminal's status line** follows the picture's turn; a status that changes with no picture change (no screen change,
   no turn) waits for the next one. The turn moves on every committed status but `needs_input`, which `asking` covers.
8. **The question tray** draws only what the Mac offers to press; other agents' options are answered on the terminal itself.
9. **The seam under a flood** (§Attack B13): a live picture whose two displays disagreed carries no `depth`, so for at most one
   tick the live rows stay placed at the last numeric depth and the seam above them can repeat or skip the lines that scrolled
   during that one read. Nothing is typed and nothing kept; the next steady picture places them.
10. **Rows that leave the live screen while he is scrolled back** become reserved rows until their page lands (at most a floor
    and a round trip): the region just above the live rows can show the ground for that long while output scrolls. Nothing
    he is reading above that region moves or blanks. Stated, not designed away: carrying the live rows across as provisional
    history would put rows the agent may since have redrawn beside the overlap check.
11. **A first guess that is stale** (§Attack B1): attempt 1 places its capture by the phone's depth, so when more lines than the
    overscan arrived since the phone's newest picture (above about 400 a second) it is a wasted capture and attempt 2 reads at
    the fresh frame. MEASURED (BM2) at 1,000 lines a second: 0 of 120 served at attempt 1, every one by attempt 3, and 1 `busy`
    of 360 oldest-end trials on 3.6a, which the phone asks again after its back-off.
12. **The trim residual** (item 3) is narrower than it reads: while scrolled back every live picture raises the phone's depth
    (D27), so a trim is caught within one picture of it unless more than a tenth of the history limit is printed between two
    pictures, which is a flood at the limit.
13. **A far session's pages follow the 400 ms floor** and the far exec's round trip, so paging a far session is slower than a
    local one by design (D14); through Funnel and Tailscale both add to it, and neither is measured here.
14. **The status line's re-read while he types**: every keys write moves the question id, so the Terminal re-reads
    `/v1/session` about once a second while he types (D17's cap). Each re-read refreshes the session's counts from its own log
    (`sessionActivity`, local sessions only, serialised with the Mac's own reads) and reads its pane once for the reply offer.
    Measured nowhere yet; SB2's change-to-answer clause is the Mac's guard.

---

## 14. What the spec step measured, how, and the numbers

Every script is under `…/scratchpad/p3371/spec/`, every output under `…/scratchpad/p3371/spec/out/`: `drawer.mjs` (writes numbered
lines, stacked committed captures, a rate, the alternate screen, the worst colours or wrapped lines into a pane, then sleeps),
`m-hist.mts` (the SHIPPING control client and composer under the pinned tsx), `run-local.mjs` (one scratch server per build,
`-L p3371s-<pid>-<label>` under its own `TMUX_TMPDIR`, a copy of `resources/gmux-tmux.conf`, killed and removed in a `finally`),
`m-remote.mjs` (through the loopback machine), `bench-kb.mjs` (the Simulator bench). Every pane ran with a scratch `HOME` and
`ZDOTDIR`, `HISTFILE=/dev/null`, `LANG=en_US.UTF-8`. History before and after every run: `733568 1791306712 | 23166
1790702242`, unmoved.

| # | Command | Exit | What it measured |
| --- | --- | --- | --- |
| M1 | `ARMS=S BUILDS=37b node run-local.mjs`, then within the full run | 0 | 3,000 numbered lines in 120x40: `%2 120 40 2961 25000 0 39`; `-S -100 -E -1` exactly `L2862`…`L2961`; index `i` at line `i − h` held `L(i+1)` for i = 0, 1, 500, h−100; `-S -99999` started at the oldest; `-E 999` stopped at the bottom; `-S -5 -E -10` swapped; `-S abc -E 0` returned ONE row, `L002962`, the visible top; `-S '#{e|-|:0,#{history_size}}'` expanded on 3.7b and 3.6a (`L1`…`L3`); a three-line control block of a 100-row capture 0.61 ms |
| M2 | `ARMS=S,P,M,R,T,A,X,Wr node run-local.mjs` (P read; M stopped on this script's own command length), both builds | 0 | Page cost, 3.7b / 3.6a: numbered 100 rows: control block p50 0.43 / 0.48 ms, p99 0.49 / 0.55, spawned list 2.57 / 3.09, capture 10,099 B, composed 13,702 B, compose 1.69 / 1.71 ms; 200 rows 0.77 / 0.88 ms, 27,302 B, 3.37 / 3.40 ms; the agents' stacked captures 100 rows 0.20 / 0.21 ms, 8,931 B composed, 130 runs, 7 styles, compose 0.58 / 0.60 ms; 200 rows 0.29 / 0.32 ms, 15,994 B, 19 styles; the whole 4,161-line history in one capture 4.0 / 4.2 ms, 151,849 B |
| M3 | `ARMS=M,G node run-local.mjs`, both builds | 0 | **The matrix**: 12 groups (Claude Code `.ansi` and `.txt`, Codex `.ansi` and `.txt`, Gemini, Qwen, Antigravity, Cursor, OpenCode, Muse, Pi, shell), each stacked to 8,025 to 12,423 history lines and paged by 100: **112,669 rows per build, 0 text differences** from `capture-pane -p` of the same range, **111,469 rows style-compared** against a capture starting up to 60 rows earlier, **0 differences**, 0 `large` |
| M4 | `ARMS=M,R,T,A,X,Wr node run-local.mjs`, both builds (its M not counted: this script's style column compared nothing) | 0 | **While output scrolls**, a display read then the three-line block asking a page by the read's history: the block's two displays agreed 381 of 381 / 380 of 381 at 100 lines a second, 400 of 400 at 1,000, **384 / 397 of 400 at a flood**; lines scrolled between the read and the block p50 0, p99 1 or 2 below a flood, **p50 20, p99 30, max 99 / 81 at a flood**; pages exact as asked 376, 359 / 371, **13 / 10 at a flood**; every other page exact in the block's agreed frame; **2 / 1 pages wrong, each in a block whose displays disagreed** |
| M5 | `ARMS=G node run-local.mjs`, both builds | 0 | **The proposed read** (overscan 128, the five-field agreement, up to 3 attempts; each trial's first `h0` the PREVIOUS block's display, with no display-only round before it, which is the read D9 now specifies, §Attack B1): 100 lines a second 400 / 400 served at the first attempt; 1,000 a second 400 / 400 (1 / 3 needed a second); flood 400 of 400 (370 first, 23 second, 7 third) and 399 of 400 (366, 31, and 1 not served in 3); **0 wrong of 2,399 served**; p99 0.58 to 0.83 ms. (The run before, `ARMS=M,G`, failed every 100-a-second trial on this script's own defect, an overscan asking a line above the oldest, which tmux clamps; the read in §5.3.5 never asks one) |
| M6 | within M4's run, the trim arm | 0 | history-limit 1,000 at 400 lines a second: a snapshot at 981 / 986; at the trim the history fell from 1,000 to 904; index 600 to 649 held `L601`…`L650` before and **`L701`…`L750` after, a shift of 100**; the size check and an 8-row content anchor each detected it; a 10-line repeating pattern (480 blank of 961 rows) fooled a 1-row and an 8-row anchor at a shift of 100 in **122 of 122** places |
| M7 | the alternate arm | 0 | 300 numbered lines then the alternate screen with 160 rows scrolled inside it: `history_size` **261 while the alternate screen was up**; `-S -5 -E -1` returned `L257`…`L261`, lines from before the program; `-a -S -3 -E 2` returned the saved screen `L262`… |
| M8 | the clear arm | 0 | 461 lines: `clear-history` → 0; `ESC [ 3 J` from a program → 0; `ESC [ H ESC [ 2 J` → 500 (tmux scrolled the cleared screen into the history) |
| M9 | the rewrap arm | 0 | 400 lines of 200 columns in a 120-column pane, then `resize-window -x 80` on the scratch session: history 761 → 1,161; index 100 to 103 read `L000051`, its wrapped half, `L000052`, its wrapped half before, and two wrapped pieces then `L000035`'s head at index 102 after |
| M10 | (its "proposed read" too took `h0` from the previous exec's display, one exec a page) `env -u TERM_SESSION_ID HISTFILE=/dev/null GMUX_CONFIG_ROOT=<scratch> GMUX_TMUX_SOCKET=p3371w-<pid> SCRATCH_MACHINE_QUIET_SHELL=1 SCRATCH_MACHINE_NO_OWN_KEYS=1 node build/with-scratch-machine.mjs --carriage c.json -- node m-remote.mjs`, twice | 0, 0 | The loopback machine (far tmux `/opt/homebrew/bin/tmux` 3.6a on its own `-L p3371f-<pid>`, ssh through `build/ssh-run.mjs` with `-F /dev/null`, a scratch known-hosts file and the yard's own agent, one ControlMaster ended in a `finally`): three commands an exec, a 100-row page **p50 10.12 ms, p90 10.9, p99 11.5**; 200 rows p50 10.28, p99 12.2; **60 of 60 numbered pages exact; the two displays agreed 60 of 60**; the proposed read at 100, 1,000 lines a second and a flood on the far side: 60, 60 and 60 served at the first attempt, 0 wrong. The first run's two named sessions were not the ones its reads reached: the far login shell is zsh, and its `=` expansion read this script's unquoted `=num:` as a command lookup; the second run quoted it |
| M11 | `ARMS=P BUILDS=37b node run-local.mjs` | 0 | The worst page (every cell its own colour pair, 120 columns): 5 rows compose (595 styles, 595 runs, 83,217 B, 0.75 ms); 10 rows pass the 1,024-style cap |
| M12 | `node bench-kb.mjs` under the lock (phone slot `electron.lock`, released after), `xcodebuildRun` build-for-testing Debug into `…/p3371/dd-spec` (deleted), then `withSimulator` on iOS 26.3 and 18.3, the hostile door's honest arm as its own process, steps `pair, list, open, screen-open, screen-wait:a, screen-key:esc, screen-key:hide, screen-wait:b, screen-wait:c, screen-select:3, screen-wait:d` of the SHIPPING `P316DriveUITests` | 0 | **iOS 26.3**: row 0 at y **116** (open, a, keyboard up), **250.7 after the hide key**, 250.7 at b and c (2 and 3 s later), **116 after the long press** and at d; row 39 376 → 510.7 → 376; the grid element 0,0,402,874 throughout. **iOS 18.3**: row 0 at **100.3 at every step**. 0 devices named `p316-` left (`xcrun simctl list devices`) |
| M13 | `node -e` (sha256 of the sorted `METHOD path` lines) and `printf … \| LC_ALL=C sort \| shasum -a 256` | 0, 0 | ten lines `16115392…`, equal to the gate's pin; eleven with `GET /v1/scrollback` **`ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14`** both ways |

**Not measured here, each named where it is owed**: paging through Funnel (§13 item 1); the rebuilt scroll view (§7.8 PS13, PS14);
the phone's memory with 3,000 rows held (`ScreenGridCostTests`); the real Claude Code and Codex (no model turn; the committed
captures stand for them).

---

## 15. Questions for him

None blocks the build. One is his when he next looks: **the icon** is `text.bubble`, the Mac's own speech bubble for Catch Me Up
(D18); `clock.arrow.circlepath` is a one-word change.

---

## §Attack — the adversary's round, 2026-10-06

Written by the adversary in `/private/tmp/wt-p3371` before any builder started, and then folded into the sections above IN
PLACE: every row it moved names its finding (`§Attack Bn`, B for this file, so no number collides with build/p337/SPEC.md's
A1 to A25). It edited nothing but this file; it started no Electron, no Simulator, no agent and no model turn; it read
nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or his live profile; its scratch tmux servers were
`-L p3371a-<pid>-37b`, `-L p3371a-<pid>-36a` and `-L p3371a-<pid>-pfx`, each under its own `TMUX_TMPDIR`, killed and removed
in a `finally` (or on the same command line); never `-L gmux` and never the default server. `stat -f '%z %m' ~/.zsh_history
~/.bash_history` read `733568 1791306712` and `23166 1790702242` before and after every command that started a shell or a
server, and at the end. Weaknesses are stated by class.

### What it did that the spec step did not

It ran the page read AS THE SPEC WROTE IT (a separate first round, a start never above the oldest line) at the OLDEST end of
a history while lines arrived, with the two rounds as far apart as a far machine's two execs, beside the revision (BM2); it
read the spec step's own measurement scripts and found that M5 and M10 had measured a different read from the one D9 described;
it timed the SHIPPING composer over a whole capture of per-cell colours (BM1); it switched a session's active pane between a
picture and a page (BM2, arm P) and checked whether a phone key can do so (BM4); it worked D24 to D27's geometry through at the
337 build's own measured row height (§14 M12); and it read every file the phase's renames and new required fields reach, the
probes and tests no builder had been given among them.

### The findings, and where each was folded

| # | Weight | Class | Evidence | Folded into |
| --- | --- | --- | --- | --- |
| B1 | major | The OLDEST page of a session on another machine is never served while output scrolls: a start forbidden from reaching above the oldest line cannot cover `from` 0 once any line arrives between the read that numbered it and the read that captured it | BM2: the first draft's read, its two rounds 10 ms apart as two far execs are, served 1 and 0 of 60 at 100 lines a second and 0 and 0 of 60 at 1,000 (3.7b, 3.6a), every other trial `busy`; the same read with no delay served 60 of 60 locally, which is why the spec step's local runs never saw it. The revision (no separate round; attempt 1 at the phone's depth; `a = from − overscan − h0` allowed above the oldest; first index `max(0, a + h1)`) served 60 of 60 at `from` 0, 30 and 100, both rates, both builds, 0 wrong. The spec step's own M5 and M10 already took `h0` from the previous block, so they had measured the revision's shape, not D9's | D7 (`from + count ≤ depth`), D9, D10, D12, §5.3.1, §5.3.5, Z25, Z26, Z29, `scrollback.test.ts`, H3, §7.9, §12, §13 items 11, 12, §14 M5, M10 |
| B2 | moderate | A far machine paid two execs a page, 8 a second at the 250 ms floor, on top of the far poll's 2.5 | D9 and D10 as first written (round 1 a far `display-message` exec of its own); 337 set the far poll at 400 ms because a far exec costs more | D9, D10, D14 (`SCROLLBACK_MIN_GAP_REMOTE_MS` = `SCREEN_TICK_REMOTE_MS`), Z26, condition 140, §7.10 |
| B3 | major | A page outlived the door's stop join: `closing()` was asked only before each attempt, so a page waiting its turn (a FIFO bounded only by the door's 32 connections, about 8 s at 250 ms a start) or awaiting a far exec (2 s) held its request past `DOOR_STOP_JOIN_MS` (1,000), which is 337 §Attack A7's class | §5.3.5 as first written; `bind.ts`'s join and `door/limits.ts:37`; the watcher's own polls carry a timer of their own for exactly this | D14 (`SCROLLBACK_QUEUE_MAX`, the wait and each exec raced against `closing()` at `SCREEN_TICK_MS`), §5.3.5, Z26, §6.2 (two arms over the SHIPPING reader), SB3, §7.10 |
| B4 | major | The keyboard fix could ship absent with its gate green: `.ignoresSafeArea(.keyboard)` on the representable alone does not opt it out when a view sits below it in the same stack (the line, the tray), so its frame would still follow the keyboard and the inset would count the keyboard twice; the line and the back-to-live button had no place above the keyboard; rule (ar) read only the representable | `Screen.swift:197-209` (the grid's `VStack` with the line under it); D24 and (ar) as first written | D24 (the opt-out at `ScreenPage`'s root, the overlap published once, the line and the button above it), §5.5.4, (ar) with a fixture of the first draft's shape, `ablation:p316`, PS14 (the grid's frame, the line and the button) |
| B5 | major | A page moved what he was reading: with the rows at the top of a view taller than them (D24) and nothing below them, the offset cannot grow by what a page adds above, so the live rows jump; and D27 said the opposite of D24 about where `following` puts them | At the 337 build's measured geometry (§14 M12: 40 rows at 6.67 pt, 267 pt, in a 758 pt view), a first page of 100 rows wants an offset of 667 pt where the content allows 175: a 492 pt jump. Also, adding rows above only when a page LANDS means the drag that entered `scrolled` bounces, and the history appears only to a second pull | D24, D25 (the pad below the live rows; the reserved range), D26 (reserve first, fill later, every offset change a delta in `layoutSubviews`), D27, D28, §5.5.4, §5.6, (aq), `ScreenScrollerTests`, PS13 (the first drag, older-page landings with the finger lifted, a fling) |
| B6 | major | Option B's regression proof was not run: every earlier `probe:p316` group that opened a session (318's presses and message, 317's End, 316.6's conversation, the alert taps) now lands on the Terminal; the spec ran only the `screen` group, and its new tray identifiers would have made 318's press arms miss | `P316DriveUITests.swift:1602-1708` (`replyPress`, `replySay` read `session-choice-press-<n>` and the strip on `screen-session`); §7.8 as first written | D19 (the tray and the now card keep 318's identifiers), §5.5.5, §5.5.7, (at), §7.8 (`toCatchUp()`, the groups re-pointed and RUN at HEAD), §7.10 (four new rows), §10 (Lens 2) |
| B7 | major | Files no builder owned would have turned the battery red: `src/shared/__tests__/screen-copy.test.ts` pins the three sentences D23 moves; `probe-p317.mjs:172`, `probe-p318.mjs:209` and `probe-p3167.mjs:165` pin the ten-id `ROUTE_LINE` (337 §Attack A25's class); `ScreenCoverTests.swift:39` reads `struct ScreenPage: View {`, which the generic signature changes; `AlertsTests.swift:510` and `UnpairTests.swift:31` name `Route.conversation`; `CopyTests` and the mocks had to move the same words with no pinned list between their two owners; the required `depth` reaches every `PocketScreen` literal | each file read at `e3837139` | §5.2, §5.5.8 (the words each mock draws), §7.1, §7.2, §10 (each file given its one owner) |
| B8 | moderate | A page could join another pane's history: the agreement compares the two displays of one read and nothing compares them with the pane the phone's index space came from; the width and depth checks pass between two panes of one window, and the overlap check passes when its rows are blank | BM2 arm P (both builds): picture on `%7` (history 581), active pane switched, the first page served from `%8` (its own lines) at the second attempt, width equal, depth check passing; BM4: a phone key cannot switch panes (`send-keys C-b o` left `%0` active), so only the desk or a program can | D3 (`space`), D8, D13, §5.2, §5.3.4 (`spaceOf`), §5.5.2, §5.5.4, §5.6, Z27, Z28, (as), PSH `scrollback-space`, measure arm DS, vectors |
| B9 | moderate | One builder carried more than the other four together (three conformance gates and their three ablations, every probe, the UI drive and its re-pointing, the checklist, the mocks) | §10 as first written | §10: **gates** and **probes** |
| B10 | moderate | A page of per-cell colours costs main tens of milliseconds, and the page floor had no duty cycle: the composer built runs for the overscan rows it then dropped | BM1, the SHIPPING composer: 200 such rows 24.89 ms p50, 30.44 ms at worst uncapped (100 rows 13.45 / 22.93), where 200 numbered rows cost 4.95 ms; a page's capture is up to 236 rows with the overscan | D11 (runs for kept rows only), D14 (`max(floor, SCREEN_DUTY_FACTOR × compose)`), §5.3.4, Z26, Z27, H5, SB3 |
| B11 | moderate | A selection could copy blank lines where his lines were: paging stopped while selecting, so rows not yet fetched stayed blank inside a selection; and a point named by its place in the layout would jump when rows were added above | D31 and §5.5.4 as first written | D31 (absolute indices; pages still fill; Copy only while every selected row is drawn), §5.5.4, (as), `ScrollbackModelTests` |
| B12 | minor | The face's first read had no failure face, and a drive waiting for `screen-session` would not find an ended session's Catch Me Up | D16 and §5.5.7 as first written | D16, §5.5.7, (at) |
| B13 | minor | The phone's depth rose only with pages, so a trim between pages was caught later than it could be; a null-depth picture's seam was unstated | §5.5.4, §5.6 | D27, §5.5.4, §5.6, §13 items 9, 12 |
| B14 | minor | `SCROLLBACK_BUSY` said "printing too fast", false for a queue past its bound | D23 | D23 |
| B15 | minor | `Screens/Scrollback.swift` sat outside `isScreenFile`'s `Screens/Screen*.swift` family and outside `SCREEN_FILES` and `OWNER_CHECK_ABSENT`, so rules (ah), (al) and the owner-check wall would not have read it; D33 said the landscape flag would move to `TerminalPage`, which rule (an) refuses | `build/conformance-ios.mjs:4677-4692, 8919-8928, 9368-9381` | §5.5.1, §5.5.4 (`ScreenScrollback.swift`), §6.4 "Widened" (`SCREEN_FILES`, `OWNER_CHECK_ABSENT`), D33 |
| B16 | minor | Two ways the live terminal could get worse than today: a history of seven or more digits would fail the WHOLE display parse, and a far answer whose count did not hold would read as `unreachable` where today it is a picture | D4 (`WHOLE6`), D6 as first written; `remote-screen.ts:52-60` (today's split from the end) | D4 (`WHOLE9`), D6, §5.3.2, §5.3.3, Z28, `read.test.ts`, `p337-remote-screen.test.ts` |
| B22 | minor | Z24 would have read 337's nudge as a violation or let a second exception hide behind it: a nudge brings one read forward to 30 ms on any row, far rows included | `watch.ts` `nudge` and `pump` | D36, §5.4 Z24, `ablation:p313` |

(B17 to B21 are below, with what held.)

### Attacked, and it held

- **Rows duplicated or dropped at a page seam while output scrolls.** The index space is tmux's own from the oldest line, and
  a history line does not change once it has scrolled off, so two pages that share an index share a line; every page is placed
  by the agreed frame of its own statement, and BM2's reads served 2,276 pages under 100 and 1,000 lines a second and a flood,
  1,073 of them by the revised read, with 0 wrong (B17). The only seam that can repeat or skip is the live one under a picture with no depth, for one tick (§13 item 9).
- **A session the door did not offer.** The page route finds the session through the same `sessionById` as `/v1/screen`, the
  reader re-reads the row by id and asks `screenLive` (the gates' one live set, T23), aims at the immutable `$`-id, and a session
  removed while read is answered as an id nobody has; the far reader reaches only the live address. No query names a pane, a
  window or a target (B18).
- **The nonce memory and the per-source cap.** At most 4 polls, 20 keys and answers, 4 pages (2.5 on a far session) and 1
  status read a second: 29 × 120 = 3,480 ≤ 4,096 (D29). A Screen's three kept lines all close when Catch Me Up is pushed over it
  (`ScreenModel.stop()` closes the door, `Screen.swift:91-96`), so Catch Me Up's own reads never meet the cap behind them; the
  side line's one gate is needed and present, because a second exchange on a busy `DoorLine` cancels the first
  (`DoorClient.swift:1137-1141`) (B19).
- **The route pin.** Re-derived: ten sorted lines `16115392…`, eleven with `GET /v1/scrollback`
  `ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14` (BM3), equal to D1.
- **The keys and a phone-sent prefix.** A phone key cannot change the active pane (BM4), so the keys' pane clause is about the
  desk and programs, as 337 D5 says, and Z23 and arm D test the right thing (B20).
- **Phase 340.1's files.** Nothing here edits `host-record.ts`, `ipc.ts`'s confirm or `remote-sessions.ts`; the far page reader
  imports `remoteScrollAddress` from the last read-only, as 337's far read does; `conformance:machines` 125 to 139 are left as
  they are and 140, 141 are appended (B21).
- **The contract baseline and the menus.** No route id, type or constant of `src/shared/ipc/pocket.ts` is in the inventory
  (337's integrator, item 5), and no Mac surface moves.

### The measurements, run rather than read

Scripts and outputs under `…/scratchpad/p3371/adversary/` (`a-compose.mts`, `a-drawer.mjs`, `a-page.mts`, `a-run.mjs`,
`out-page-OGP-1791311364839.json`).

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| BM1 | `node -e "…tsxCli()… a-compose.mts"` (the SHIPPING `plainOf`, which composes with no caps, and `composeScreen`, over synthetic rows; scratch `HOME`; no process started) | 0 | per-cell colours, 120 columns: 100 rows 13.45 ms p50 / 22.93 max uncapped, 8.29 / 10.98 capped; 200 rows 24.89 / 30.44 uncapped, 15.70 / 42.44 capped. Numbered plain rows: 100 rows 2.69 / 4.22, 200 rows 4.95 / 8.09 |
| BM2 | `ARMS=O,G,P node a-run.mjs` (vendored 3.7b and Homebrew 3.6a, each on `-L p3371a-<pid>-<build>` under its own `TMUX_TMPDIR`, the SHIPPING `TmuxControlClient`, a drawer of numbered lines, history-limit 100,000) | 0 | **O**, 60 trials each, the first draft's read / the same with 10 ms between its rounds / the revision: `from` 0 at 100 lines a second 60 / **1** / 60 (3.7b) and 60 / **0** / 60 (3.6a); at 1,000 a second 60 / **0** / 60 on both; `from` 30 and 100: 60 served in all three on both (one 3.6a revision trial `busy` at 1,000 a second, `from` 100). **G**, the revision with `h0` the phone's depth read 300 ms before (30 ms at the flood): 57 of 57 at 100 a second (all at attempt 1), 60 of 60 at 1,000 (58 and 60 at attempt 2), 60 of 60 at the flood, both builds. **0 wrong** in every arm. **P**: picture on `%7`, 120x20, history 581; after the switch `%8`, 120x19, history 1,982; the first page served at attempt 2 from `%8`'s own lines; width equal, depth check passing |
| BM3 | `node -e` (sha256 of the sorted `METHOD path` lines, `routeLines`' method) | 0 | ten `16115392e007ad27…`, eleven `ea5930e0f87bba2d…` |
| BM4 | vendored 3.7b on `-L p3371a-<pid>-pfx`: two panes, `select-pane -t p:0.0`, `send-keys -t p C-b o`, then `display-message -p '#{pane_id} #{pane_index}'`; `kill-server` and the directory removed on the same command line | 0 | before `%0 0`, after `%0 0`: a key sent to a pane is not the client's prefix |

**Not measured here, and owed**: the rebuilt scroll view and its offset deltas during a real fling (PS13, PS14,
`ScreenScrollerTests`); the far machine's own CPU per exec (the loopback machine shares this Mac); the status line's re-read
cost while typing (§13 item 14); paging through Funnel.

### The builders and the commands after this round

Six builders, disjoint files, as §10 lists: **door**, **screen**, **terminal**, **pages**, **gates**, **probes**. The
integrator's commands are §7.1's battery with the additions this round made: the grader self-tests of `probe:p317`,
`probe:p318` and `probe:p3167`; `measure:p337 -- --check` with H3's oldest-end pages, H5's compose and the new arm DS; the
hostile client's two arms over the SHIPPING reader; and the base check of §4.1 first. The verifiers' Lens 2 runs `probe:p316`
with `P316_ARMS=screen,end,reply,markdown` at HEAD on 26.3, those groups' floor arms on 18.3, the alert taps once and PSP at
the parent.

---

## §As built — 337.1 (the integrator, 2026-10-06)

Written by the integrator in `/private/tmp/wt-p3371` after the six builders returned (two of them, **terminal** and
**gates**, stopped early on a move of his shell history, below). It started no Electron, booted no Simulator, ran no probe,
no agent and no model turn, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or his live profile, never
named `-L gmux`, and committed, staged and stashed nothing. `git rev-parse HEAD` read `e3837139…` and nothing was staged,
before and after.

### The base and the delta

`git diff --stat e3837139`: 90 tracked files changed (12,946 insertions, 1,581 deletions) and 15 new files, every one in a §10
list or the integrator's own (`CHANGELOG.md`, `CLAUDE.md`, this section, and those named under "What the integrator changed"). `git diff e3837139 --
src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity src/renderer/terminal src/main/attach src/main/tmux
src/main/machines/host-record.ts src/main/machines/remote-sessions.ts` is empty (0 lines); under `src/renderer` only
`src/renderer/settings/__tests__/p316-phone-section.test.tsx` moves. The local `origin/main` ref (no fetch: the operator's
checkout is read only) is `b22cf903`, one `docs/BACKLOG.md` commit past `e3837139`, which this delta does not touch, so the
replay is clean. The phone's build is 7 in all six configurations (`grep -c 'CURRENT_PROJECT_VERSION = 7;'` reads 6) and
`PHONE_BUILD = '7'`; the unsigned archive's `CFBundleVersion` reads 7.

### What each builder decided beyond the letter, kept

- **door.** `scrollbackOf(answer, id, at, ask)` takes the ask as a fourth parameter, so a page must sit inside the rows
  asked, carry the asked `wrap` and a `depth` at least the asked one; `readScrollbackQuery`'s own `from` bound is implied by
  `from + count ≤ depth ≤ 100,000` and kept so every name meets its bound where it is read (its one ablation arm stays
  green by construction and says so); a `why` that comes with rows, styles or a number is refused whole.
- **screen.** An unsteady reading's `displayLine` holds both display lines, so the watcher's revision moves when the next
  steady picture of the same screen arrives and `depth` is offered again (D3's "the next picture offers it again"); the
  page reader and the live read share ONE display, capture, display statement (`statementOverControl`).
- **terminal.** The overlap shrinks to one row after a page the caps cut to its overlap rows, so a page of per-cell colours
  cannot be asked forever; a refused page (404, or a connection the door closed before an answer, which the app reads as a
  refusal everywhere) stops paging with `scrollbackSentence`, and every other failure backs off 1, 2, then 4 s (§5.6);
  `ScrollbackEdge` has a `.stopped` case for `ended` and `unreachable`; following's pin applies only when the view was at
  the bottom, on entering `following` or on the first layout, so reading the upper rows of a tall live screen is not pulled
  down by each picture (today's behaviour); the line is an overlay on the canvas, so no row moves when it appears; a scroll
  view made afresh over held history opens on its live rows; a selection over rows no longer held is let go on return to
  live. Stated residual: the first page is placed at the live top it was asked at, so if `H` grows a great deal before it
  lands it is not in view; later pages catch up.
- **pages.** The Terminal's status line does not re-read on its first appear (the route's own read just decided the face);
  the Terminal holds its own `SessionModel` on the side line and draws the route's answer until its first read lands; Catch
  Me Up does not repeat the session's own empty line where the now card says the same outcome; the tray's 40 percent cap is
  `pageHeight * 0.4`.
- **gates.** `Z11` counts the screen caps inside `screenOf`'s reach (because `scrollbackOf` reads them too), `Z15` accepts
  "terminal" beside "screen", `X12`'s pinned sentence is D35's, and `Z26` admits read.ts's shared `statementOverControl` and
  holds it to three lines in one statement.
- **probes.** SB3 turns the door off through the bridge call Settings' switch makes and times the stop with the phone's
  clock (the door logs no line for its stop join); PSP reads `P3371_PARENT_IOS` first and falls back to `P316_PARENT_IOS`;
  `tray-press:1` presses the option whose marker is `2`; PS13 with fewer than three older-page landings is UNREADABLE.

### What the integrator changed

1. **The page reader's floor, asked again on waking** (`src/main/screen/scrollback.ts`). The door builder measured starts
   248.8 to 249.7 ms apart over six hostile runs: a timer counts whole milliseconds on the loop's own clock and can fire a
   millisecond before `performance.now()` reaches the floor. The wait is now a loop that waits again until `now()` has
   reached `lastStartAt + gap`, so no start is earlier than the floor by the clock it is stamped with. The hostile client's
   SBS1 then read a least gap of 249.8 ms between the scripted core's own statement stamps, which sit a fraction of a
   millisecond after main's stamp and inside its stated 2 ms grain; probe:p337's SB3 grades main's own stamps with its own
   stated slack.
2. **`conformance:ios`, finished** (the gates builder stopped before it). (aq) rewritten and (ar) to (au) integrated from its
   draft, with five corrections found by their own fixtures: (ar)'s overlap clause now requires the scroll view's `$0` and
   nothing more (the draft passed `$0 + 20`); (au) reads `Copy.catchMeUp`'s owner from its own doc block and never from a
   `/// Mac:` line farther up; (at)'s status line counts stored members only (its computed `body` was read as a field);
   (as) reads what the target's six interpolations are handed (the id through `queryValue(…)`, four whole numbers by name,
   `keep.rawValue`), because the lexer blanks an interpolation in `bare`; and (as) gains a clause that `ScrollbackModel`,
   `ScrollbackLayout` and `ScreenScrollView` are declared in their own `Screen*` files and nowhere else (§Attack B15).
   Widened: (ah) reads `scrollbackTarget` as a request builder and holds `ScreenDoor` to exactly `read`, `keys`,
   `scrollback(from:count:depth:wrap:keep:)`, `session()` and `close`; (ai) counts `minGap` outside `ScrollbackModel`; (ak)
   holds the side line (`ruleSideLine`: three kept lines, one `OneExchange` gate, the side line carrying `scrollback` and
   `session` alone inside it, `close()` closing all three); (t) holds the eight scrollback arms §6.4 pins, the two lies
   marked `stops: true`; (v) holds `scrollbackSentence(for:)`; (x) admits the keyboard's own `UIResponder.keyboard…UserInfoKey`
   reads inside `keyboardOverlap(_:)` in `Screens/ScreenScroller.swift` alone, with four fixtures; `SCREEN_FILES` and
   `OWNER_CHECK_ABSENT` gain the two new files. 45 rules, PASS, every new clause proved on fixtures of its own, (ar)'s
   first-draft shape among them.
3. **`ablation:p316`**: 46 arms (aq1 to aq10, ar1 to ar6, as1 to as13, at1 to at7, au1 to au3, ak8, ak9, ah4, ai9, x20, v30,
   t30), the fix round's four SwiftUI (aq) arms removed with the view they planted into; 388 arms in all.
4. **The vectors** (`build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`): a `/v1/scrollback` read signed as
   Swift writes it and read back by the shipping `readScrollbackQuery`, a `scrollbackTampered` vector (one byte of the
   target changed, refused `signature`), the `screen-sample` answer regenerated with `depth` and `space`, and the two
   tampered-target vectors folded into one helper. `ios/TortieTests/DoorVectorTests.swift` gains the two tests that read
   them (the target equal to `DoorClient.scrollbackTarget`'s, CryptoKit refusing the tampered one).
5. **The mocks and `conformance:phonecopy`.** `Session.html` is the Terminal at rest with Answer.html's four options as its
   tray, `Screen.html` the Terminal with the keyboard up, `Conversation.html` Catch Me Up (two-line title, End, the turn,
   then the now card at the bottom), `Link.html` and `index.html` follow, and Choice, Answer, Composer, Idle and End each
   gain one comment line. The ledger owns `Catch Me Up` and `Terminal` (Copy.swift), drops `Conversation`, `Screen`, the
   scrollback line and the agent's last answer card, and its owned-rule floor moves from 90 to 89, named in its comment;
   three self-test mutations moved to the new words. `ios/TortieTests/TokensTests.swift` reads the chrome's colours from
   eleven mocks, without `Session.html`, whose rows are the session's own colours as `Screen.html`'s are.
6. **One extraction.** The two Screen test files' `row()` factory is `src/main/screen/__tests__/session-row.ts`. The other
   10-line duplicates the scan found are left as the house pattern they already were: `cdpForMain` in nine probes, each
   transport test's `paired(_:)`, the hostile client's mirror of `ipc.ts`'s read switch, and the route id list a test pins.

7. **`measure:p337`'s history arms, on their first live run** (the probes builder ran none live). Five first-run defects,
   each fixed in `build/p337/drive-screen.mts` or `measure-screen.mjs` and each re-run on both builds: a served page's `why`
   (null) was read as `'not asked'` (`page?.why ?? …`), which failed H5 and DS on pages that were served; H4's trim and H6's
   flood set the global `history-limit` back the moment their pane was made, and tmux 3.7b applies a changed limit to the
   panes that exist (3.6a did not), so the trim never came and the flood's pane trimmed at 25,000; H6's flood and H3's flood
   waves counted a stand-in that had not begun printing as a still depth and stopped before their flood began (6 reads; 342
   and 334 pages); H2 stacked five groups 2 to 4 percent short of its 2,000-line floor; and H5 pinned the worst page at 5 rows,
   §14 M11's measured lower bound, where D11 keeps the LONGEST run that fits: 8 rows of 952 pens at 120 columns (9 would be
   1,071, past the 1,024-style cap), so H5 now holds the run kept to be between M11's 5 and 10, inside the cap, with one row
   more past it. The flood waves are four sessions, as the rate arms are.
8. **The hostile door's `scrollback-extra-rows` row** (`build/p316/hostile-door.mjs`) said the phone asks such a page again;
   the phone does not join a well-formed page holding rows it did not ask (§5.5.4: anything else sets `edge = .moved`), so it
   draws the moved line and asks no more. The row says so (`ends: 'sentence'`, `scrollbackMoved`, `stops: true`); PSH would
   have failed it.

### Commands, exit codes and numbers

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` was read before and after every command below; see "His shell history".

| Command | Exit | Numbers |
| --- | --- | --- |
| `git rev-parse HEAD`; `git diff --cached --stat` | 0 | `e3837139…`; nothing staged |
| `npm run -s typecheck` (first and final) | 0, 0 | import boundaries, runtime cycles and shared types included |
| `node build/conformance-ios.mjs` (as the work went) | 1, 1, 1, 0 | finally 45 rules over 47 app files, 61 test files, 119 files under `ios/` |
| `node build/p316/vectors.mjs`, then `--check` | 0, 0 | 46 signed requests, 2 tampered targets, 3 tampered write bodies, 11 answers |
| `node build/p311/copy-drift.mjs`, then `--self-test` | 0, 0 | 18 screens, 586 segments, 89 owned rules matched (floor 89); every mutation red, the three new among them |
| `conformance:pocket`, `:pocket:hostile`, `:machines`, `:choices`, `:handback`, `:manager`, `:phonecopy`, `:push` | 0 each | pocket 127 rules, 17,999 checks; hostile 270 arms in 16.8 s (SBS1 13 pages, 37 refused at the source cap by the door's own count, at most 1 statement in flight, least gap 249.8 ms by the scripted core's stamps; SBS2 5 pending pages `unreachable`, the latest 60 ms after the stop); manager 64 rules; push 26 rules |
| `npm run build` (twice) | 0, 0 | 45 s and 34 s; `gate:electron` 169 of 169, `gate:simulator` 2 of 2, `gate:background` 3 starts each in a `finally`, `gate:knownhosts`, `gate:checks` 262 scripts, `conformance:ios` PASS, `gate:contract` byte for byte |
| `npm test` (scratch `HOME`, `ZDOTDIR`, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`) | 0 | 1,108 files passed, 2 skipped; 20,471 tests passed, 14 skipped; 83 s |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`, then `rm -rf release` | 0 | 59 s; zip and dmg built unsigned; `release/` removed |
| `npm run ablation:p316` in its own `cp -Rc` clone | 0 | 388 of 388 arms red on their own rule, 1,089 s (the 46 new ones first, alone: 46 of 46) |
| `npm run ablation:p313` in its own clone | 0 | 413 ablations, every one red on its own rule, 2,474.7 s |
| `npm run ablation:p320` in its own clone | 0 | 123 ablations, every one red on its own condition, 1,907.5 s |
| the grader self-tests: `probe:p337`, `probe:p316`, `probe:p317`, `probe:p318`, `probe:p3167`, `measure-screen`, `test-ios`, `hostile-door` | 0 each | 24 graders and 99 clauses; every probe:p316 group; 13/61; 25/80; 9/33; 14/53; 66 checks; 89 arms |
| `xcodebuild build-for-testing` Debug, Simulator SDK, `-derivedDataPath …/p3371/dd-integrator` | 0 | 21 s, no Swift warning |
| the same, Release, `ENABLE_TESTABILITY=YES` | 0 | 51 s, no Swift warning |
| `xcodebuild archive` Release, `generic/platform=iOS`, unsigned; `test-ios.mjs --read-app` on it | 0, 0 | 1 Mach-O read: no NetworkExtension or TailscaleKit, no coverage, no DEBUG seam, asks Apple for its alert address; `CFBundleVersion` 7; `dd-integrator` deleted |
| `npm run measure:p337 -- --check` (first, under two ablations, load averages 11 to 72) | 1 | 1,112 s; W, F, K, L, C, S, Z, H1 and D passed on both builds; H2 to H6 and DS failed on the defects of item 7 |
| `P337_ARMS=H2,H4,H5,H6,DS` after the fixes | 0 | 210 s; every one PASS on both builds: H2 33,126 rows, 0 text and 0 style differences; H4 all five `moved`; H5 8 rows of 952 pens, the next start 251.0 and 250.5 ms after a 29.6 and 27.9 ms compose; H6 239 and 257 flood pictures, 0 a line off; DS two spaces |
| `npm run measure:p337 -- --check` (second, load averages 7 to 25) | 1 | 843 s; every arm on both builds PASS but H3's timing clause: 0 wrong, 0 busy, 400 or more pages at every rate and the oldest pages 60 of 60 at every `from` and rate, but page time p99 12.7 to 21.0 ms against 5 |
| `P337_ARMS=H3` alone (load averages 19 to 43) | 1 | the same clause: p50 5.4 to 13.2 ms, p99 10.7 to 18.9 ms, everything else green |
| the SHIPPING `composePage` alone over a 228-row plain capture, 100 rows kept, 400 times (load 30 to 43) | 0 | p50 1.89 ms, p99 5.41 ms: at this load the compose a page includes is past 5 ms at p99 by itself |
| the delta scanned for control, bidi, zero-width and BOM characters | — | 8 U+00A0, all in `vectors.json`'s `screen-sample` answer, the committed capture's character after Claude Code's `❯` (the parent file held the same two lines) |
| the delta scanned for repeated blocks of ten lines or more | — | item 6 above |
| `git diff e3837139 -- src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity src/renderer/terminal src/main/attach src/main/tmux src/main/machines/host-record.ts src/main/machines/remote-sessions.ts` | 0 | empty |

### Open for the verifiers and the main session

- **H3's timing clause** ("p99 page time under 5 ms at every rate") is red on this machine at load averages of 7 to 72,
  with every correctness clause green on both builds. What it times is the whole SHIPPING `page()`: the statement, the
  compose of a 228-row capture (whose own p99 measured 5.41 ms at that load), and four sessions paging on one event loop
  over one control client that also parses their output. The spec's 5 ms came from §14 M5, which timed the read block
  alone (p99 0.58 to 0.83 ms). The integrator did not move the bound: Lens 1 runs `measure:p337` H on a quiet machine,
  and if it is still red there the main session decides whether the bound or the thing timed is wrong. The user-facing
  guards are probe:p337's SB2 (the live poll's change-to-answer p99 under 250 ms while paging) and SB3 (main's event-loop
  lag p99 under 50 ms).
- **337's CHANGELOG item** still says "open a session's own screen", which stays true; it is left for his rewording.
- **Not run here, by rule**: `test:ios` on iOS 26.3 and the 18.3 floor, `probe:p337`, `probe:p316` (the integrator boots
  no Simulator and launches no Electron), `smoke:t1`, `smoke`, `smoke:t3`.

### His shell history

`~/.bash_history` read `23166 1790702242` throughout. `~/.zsh_history` moved three times today, never inside a bracketed
command: `733568 1791306712` → `733653 1791314529` at 15:22:09 (85 bytes, during the builders' round, which is why
**terminal** and **gates** stopped), → `733729 1791325477` at 18:24:37 (76 bytes) and → `733966 1791325581` at 18:26:21
(237 bytes), both between two of the integrator's commands. Three tool shells started back to back left it unmoved, and no
process the integrator started reads or writes it, so the moves are another shell's, most likely his own interactive one;
it read `733966 1791325581` before and after every command from 18:26 to the end. The file was never read, only its size
and time.

### The integrator's second pass (2026-10-06, 23:01 to 23:50)

The first pass above ended at 20:17 without its report reaching the workflow, so the integrator was started again on the same
worktree. It found the tree as the first pass left it (only this file newer than the last battery run at 19:45), re-ran what a
later edit could have moved, and changed four things. Same refusals as the first pass: no Electron, no Simulator, no probe, no
agent, no model turn, nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or his live profile, no `-L gmux`, nothing
committed, staged or stashed; `HEAD` read `e3837139…` with nothing staged.

1. **`dd-integrator` had not been deleted.** The first pass's table says it was; the folder (893 MB, the 18:40 archive in it)
   was still there at 23:01. Nothing named it in the process table; it is removed, and so is this pass's own.
2. **Two fake answers still carried the Mac's old sentence.** `ios/TortieTests/ScreenKeysTests.swift:48` and
   `build/p313/hostile-client.mts:2448` stand in for main's `SCREEN_QUESTION_MOVED` and said `…since your screen was drawn…`,
   which D23 changed to `…since your terminal was drawn…`. Neither assertion compares the words (the Swift test compares the line
   with the answer it was handed, SK11 counts outcomes and log lines), so both passed; they now say what the Mac says. No other
   copy of the three old D23 sentences is left outside `build/p337/SPEC.md`, which records 337 as it was.
3. **The local `origin/main` is now `543824e0`**, three documentation commits past `e3837139` (`docs/BACKLOG.md`,
   `docs/research/136-…` and the new `docs/research/140-the-public-beta-beside-the-release.md`), none touching a file of this
   delta, so the replay stays clean. Research 140 rules that build 7 goes up through Xcode's "App Store Connect" and never
   "TestFlight Internal Only"; `build/p337/CHECKLIST.md` starts with build 7 already installed and names no upload step, so
   nothing here contradicts it, and the upload line belongs to the main session's hand-off note as that research says.
4. **The history stand-in outlived its pane** (`build/p3371/history-stand-in.mjs`, a defect `gate:background` cannot see,
   because tmux starts the stand-in, not the script). At 23:28, 33 stand-ins from the first pass's `measure:p337` runs
   (started 19:03 to 19:43, parent 1) were still running, each stopped in the same place: a write to a pane that had gone
   raised an error nothing listened for, Node's fatal report opened the hung-up terminal again for its error stream, and
   that open never returned, so the stand-in's own signal handlers and its 30-minute limit could not run. Reproduced by the
   integrator's own trial (a scratch tmux on its own socket, the pane killed while the stand-in printed 1,000 lines a
   second, every pid ended in a `finally`): 5 of 10, 6 of 10 and 11 of 20 still running 5 s after their pane, each one
   sampled in that open. The stand-in now ends on a write error and on any uncaught error, writing nothing (two lines,
   inside its entry block, so nothing that imports it changes): 0 of 20 by the same trial, and 0 left after
   `P337_ARMS=H3,H6 npm run measure:p337 -- --check` on both builds (404 s). The 33 were ended by pid, start time and
   whole command line read again before each signal: SIGTERM ended every one. Two other pane stand-ins of earlier phases
   that write on timers, `build/p318/stand-in.mjs` and `build/p321/stand-in.mjs`, have no such handler either; they are
   outside this phase's files, were not measured, and are named for the main session.

| Command (this pass) | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | boundaries 1,420 files, 0 violations; 0 runtime cycles |
| `npm run build` | 0 | 38 s; `gate:electron` 169 of 169, `gate:simulator` 2 of 2, `gate:background` 3 starts in a `finally`, `gate:knownhosts`, `gate:checks` 262 scripts, `conformance:ios` 45 rules, `gate:contract` byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`) | 0 | 1,108 files passed, 2 skipped; 20,471 tests passed, 14 skipped; 70 s |
| `vectors.mjs --check`; the grader self-tests of `probe:p337`, `probe:p316` (all seven groups), `probe:p317`, `probe:p318`, `probe:p3167`, `measure-screen`, `test-ios`, `hostile-door`; `copy-drift --self-test` | 0 each | 46 signed requests; 24/99; 17, 189, 119, 110, 65, 177, 142; 13/61; 25/80; 9/33; 14/53; 66 checks; 89 arms |
| `conformance:pocket`, `:pocket:hostile`, `:machines`, `:choices`, `:handback`, `:manager`, `:phonecopy`, `:push` | 0 each | pocket 127 rules, 17,999 checks; hostile 270 arms, SBS1 13 pages, 37 refused at the source cap by the door's count, least gap 249.9 ms, at most 1 at once; SBS2 5 pages `unreachable`, the latest 60 ms after the stop; choices 27 clauses; manager 64 rules; phonecopy 18 screens, 586 segments, 89 owned rules (floor 89); push 26 rules |
| `npm run ablation:p316` in its own clone (the first pass's clone predated the 18:50 hostile-door row and the 18:59 edit to the ablation) | 0 | 388 of 388 arms red on their own rule, (a) to (au); 931 s |
| after item 2: `conformance:pocket:hostile`, `conformance:pocket`, `conformance:ios` | 0, 0, 0 | 270 arms (SK11 19 done, 1 refused); 127 rules; 45 rules |
| `xcodebuild build-for-testing` Debug and Release (`ENABLE_TESTABILITY=YES`), Simulator SDK, `-derivedDataPath …/p3371/dd-integrator` | 0, 0 | 20 s and 57 s, no Swift warning |
| `xcodebuild archive` Release, `generic/platform=iOS`, unsigned; `test-ios.mjs --read-app`; `rm -rf dd-integrator` | 0, 0, 0 | 1 Mach-O read: no NetworkExtension or TailscaleKit, no coverage, no DEBUG seam, asks Apple for its alert address; `CFBundleVersion` 7, `CFBundleShortVersionString` 1.0.0 |
| the integrator's hang-up trial (`node …/integrator2/hangup-trial.mjs`, vendored tmux 3.7b, `-L p3371-int-hup-<pid>`) over the stand-in as found, then fixed, then as found | 0, 0, 0 | still running 5 s after the pane: 5 of 10 (one sampled in `ReportFatalException` → `uv_tty_init` → `open`), then 0 of 20, then 11 of 20 |
| after item 4: the grader self-tests of `probe:p337`, `probe:p316`, `measure-screen`, `test-ios`, `hostile-door`; `npm run build` | 0 each; 0 | as above; 34 s, `gate:background` 3 starts in a `finally`, `conformance:ios` 45 rules, `gate:contract` byte for byte |
| `P337_ARMS=H3,H6 npm run measure:p337 -- --check` (load 18 to 22) | 1 | 404 s; W, H6 PASS on both builds; H3 0 wrong, 0 busy, 400 or more pages at every rate, the oldest pages 60 of 60 at every `from` and rate, p99 15.0 to 17.9 ms against 5 (the open clause); 0 stand-ins running afterwards |
| the delta scanned again for control, bidi, zero-width and BOM characters | — | 19,784 added lines and 15 new files: only the 8 U+00A0 in `vectors.json`'s committed capture |
| the delta scanned again for repeated blocks of ten lines or more | — | two, both the house patterns named in item 6 above: `cdpForMain` in `probe-p337.mjs` and each transport test's `paired(_:)` (`P3371ScrollbackTransportTests.swift:75` beside `P337ScreenTransportTests.swift:78`) |
| `git diff e3837139 --` the eight paths that must not move | 0 | empty; under `src/renderer` only `p316-phone-section.test.tsx` |
| the delta's files against §10's lists | — | 105 files; outside the lists only the integrator's own `DoorVectorTests.swift`, `TokensTests.swift` and `src/main/screen/__tests__/session-row.ts`, and `CHANGELOG.md`, `CLAUDE.md` |

Not re-run, because nothing they read moved after they ran: `npm run package` (18:46, after the last `src/` change at 18:25),
`ablation:p313` and `ablation:p320` (their clones predate only the 18:43 test-file extraction, which neither reads, and item 2's
string, which no arm grades), and `measure:p337 -- --check` (the second full run, after the last edit to `drive-screen.mts` at
19:18). `H3`'s timing clause stays open as above, with one fact added for whoever judges it: its rate arms page FOUR sessions at
once, each in its own loop, through one page reader over one control client on one event loop, and time a page from the call
to the answer, so a page's time includes the other sessions' statements and composes queued ahead of it; §14 M5's 5 ms was one
session's read block with no compose. The load here was 18 to 79 (a virtual machine at 200 percent, Chrome, Spotlight and
media analysis, none of them this run's), so the one H3 this pass ran (for item 4) is no quiet-machine reading. His shell history read `733966 1791325581` and
`23166 1790702242` before and after every command of this pass.

## §As built — 337.1's fix round (2026-10-07)

Written by the fixer in `/private/tmp/wt-p3371` after the two verify lenses (Lens 1 approved with one minor and four nits,
Lens 2 needs_work with three majors and five minors). The fix ran once. It started no Electron, no agent and no model turn;
its Simulators were made and ended by `build/simulator-run.mjs` alone, under the lock's phone slot (`electron.lock2`, taken
as `p3371-fixer`), every `xcodebuild` into `…/scratchpad/p3371/dd-fixer/…`; it read nothing under `~/.ssh`, `~/.claude`,
`~/.codex`, his keychain or his live profile, never named `-L gmux`, and committed, staged and stashed nothing. `HEAD` read
`e3837139…` with nothing staged before and after. His shell history: below.

### What each finding came to

**Lens 2, major 1: the app froze when the keyboard rose over the question's tray.** Cause, confirmed: `ScreenKeyField`'s
`updateUIView` called `becomeFirstResponder()` (and `resignFirstResponder()`) inside SwiftUI's own update; the keyboard's
notifications and SwiftUI's focus change ran synchronously inside that update and wrote the page's state (the overlap, which
hides the tray), and with the tray drawn the view graph re-entered itself (the verifier's main-thread sample:
`FocusBridge` → `AG::Graph::print_cycle`). Fix: `updateUIView` names neither call and hands the change to
`DispatchQueue.main.async`, where `Coordinator.settle(_:)` takes or gives back the keyboard as `typing` says THEN
(`ios/Tortie/Screens/ScreenKeyField.swift`). Gate: rule (aj) gains the clause (updateUIView names neither call and hands the
change to the main queue; `becomeFirstResponder(` in the Terminal's files only in `Coordinator.settle`), `ablation:p316` arm
`aj13`. Drive: the new UI step `tray-keyboard` and probe:p316's arm **PS12k** (a step that began and never ended is FAIL, one
that never began UNREADABLE; seven self-test cases).

**Lens 2, minor 4: on iOS 26.3 the page stayed at its keyboard-up height after the keyboard went.** The fixer's drives showed
it was the SAME cause as major 1: the element dumps put the whole route, `screen-session`, at `[0,0,402,478]` after the hide
(the verifier's own snapshot), so the route's frame kept a layout SwiftUI made while the field resigned inside its update.
With the first-responder change outside the update the grid reads 645 pt before, with and after the keyboard, 2.5 s later
included, and the back-to-live button sits at y 747 after the hide (run e1 `k0a0`, `kwill`; run e4 `t263`). A first draft
that told the page the keyboard had gone only on `keyboardDidHide` was measured, found unneeded (`kwill` was already right),
and taken out.

**Lens 2, minor 5: the overlap was measured once, before the tray hid.** `ScreenScrollView` keeps the keyboard's last
notification while it covers the view; `layoutSubviews` calls `remeasureKeyboard()`, which, when the view's height changed
under it, hands that notification back to `keyboardOverlap(_:)` on the main queue after the pass, never inside it, so every
write stays in the one keyboard function (rule (ar), (x)). Measured (instrumented copy, 26.3): 106.67 pt, then 269 pt once
the view had grown to 645; the button back to live then sits at y 478, just above the key bar at 522 (run e2 `trayre`, e4
`tray263`). Rule (ar) gains the clause, `ablation:p316` arm `ar7`, and `ScreenScrollerTests` the test. Beside it, the tray
is now also hidden while the keyboard is WANTED (`overlap == 0, !typing`): on iOS 18.3 a tray tall enough to fill the
space below the keyboard's top left the terminal itself uncovered, so its overlap read 0 and the tray stayed drawn under
the keyboard (`tray183`: 2 buttons up; `tray183b`: 0, and 0 on 26.3 too).

**Lens 2, major 2: `test:ios` red in two `ScreenScrollerTests` cases.** Cause, confirmed as the verifier measured: setting
`contentSize` clamps an offset UIKit is not tracking (a pull to -40 read 0) before the delta was added. Fix in
`layoutSubviews`: the offset as it was before the size was set is what the delta moves (`held`, `clamped`), applied only
when rows were added or taken above, so UIKit's clamp still brings an offset left past the content back inside it;
`keepAnchor` reads the pre-size offset too. The first test's expectation was also wrong for the design: the layout pass's own
report, its view 94 rows into the page just reserved, reserves the NEXT page too (D26), so the offset grows by every page
reserved; the test now reads the reserved rows from the layout (200, not 100) and the 40 pt pull kept. Unit runs through
the helper: 26.3 `ScreenScrollerTests`, `ScrollbackModelTests`, `ScreenKeysTests`, `ScreenSelectionTests`,
`ScreenGridCostTests`, `TerminalRouteTests` 76 of 76; 18.3 the first two, 33 of 33; the delta test's drift 9e-13 and 5e-13
pt over 814 and 804 checks.

**Lens 2, major 3: `screen-screen` never reached the tree.** Measured, not assumed (run e1): with the face as the route's one
accessibility child, SwiftUI folded the face's container into the route's, and it did so for Catch Me Up as a face too
(`fc0`: only `screen-session`); a `Color.clear` sibling (no accessibility node) did not help (`a2`, `fc2`); moving the face's
container inward helped only while the face had another child (`fc1` with the message strip yes, `fc3` without it no). A
second accessibility child of the route does: `SessionRoute` draws, beside its face, a zero-size `Color.clear` identified
`ID.sessionRouteMark` (`session-route-mark`), hidden from VoiceOver, taking no touch. With it every dump holds
`screen-session` with `screen-screen` (the Terminal, 26.3 and 18.3) or `screen-catch-up` (the Catch Me Up face, with and
without the strip, forced in a scratch copy only by a flag file) (runs e2 `tanchor`, `fc4`, `fc5`; e4 `t263`, `fc263`,
`fcs263`, `fling183`, `tray183`). Rule (at) gains the clause (the mark beside the face, ahead of its switch, hidden) with two
fixture checks; `ablation:p316` arm `at8`. A hidden element still reaches the test framework's tree (the next item), which
is why the mark can be hidden from VoiceOver and still keep the two containers apart.

**Lens 2, minor 6: iOS 18.3 log quarantine while scrolling.** The two crash reports were read, frame by frame: both are
`XCElementSnapshot children` → `_fetchSimpleValueForKey:` (and `-[XCTAccessibilityFramework attributesForElement:…]`) →
`_os_log_impl` → `__LIBTRACE_CLIENT_QUARANTINED_DUE_TO_HIGH_LOGGING_VOLUME__` → `runtime_issue_os_log_fault_callback` →
`strcmp(NULL)`. The volume was the TEST FRAMEWORK's own logging as it fetched elements, not the app's runtime issues, and it
grows with the elements: every row of the window (about 300 scrolled back, where 337 had 40) was one. Fix: only the rows in
view are elements (`ScreenScrollView.spoken`, marked whenever the window is drawn and again as a scroll comes to rest); a
row out of view is an empty container with no name and no label. Measured: `.accessibilityHidden(true)` ALONE left every row
in the test framework's tree (263 + 31 rows in a snapshot, run e2 `vis`); the empty container takes them out (97 and 98,
runs e3 `vis2`, e4). Run e4 `fling183`, the verifier's own crashing sequence on 18.3 (fling to the oldest line among it),
ran to its end: index 0 reached, no Tortie crash report (the two in DiagnosticReports are the verifier's of 01:08 and
02:04), the app in the foreground, the copies the verifier read (history row 467, the drag from row 597 into the live rows).
Rule (aq) gains clause aq8 with three fixture checks; `ablation:p316` arm `aq11`. Not done, and why: moving observed-state
writes out of the layout and scroll callbacks, which the verifier suggested; the stacks name no SwiftUI runtime issue.

**Lens 2, minor 7: probe:p337 SB5 and SB3.** SB5 reads a served page's `why` (null) as itself, never through `??`. SB3's
worst-colour history now ends under a plain live screen (`history-stand-in.mjs --quiet-after N`, a new tail: N plain
numbered lines `Q000001…`), so the picture carries a depth and pages are asked; when fewer than three gaps are still seen
the arm says `SB3-worst` UNREADABLE by its own name and the clause does not count it as a pass or a fail. Self-tests: two
refused cases added (two gaps with no word saying why; a short gap beside an unread word), and measure-screen's self-test
pins the new tail and its two refusals.

**Lens 2, minor 8: probe:p316 tooling.** E4's Select: the drive's `reveal()` handed back a row under End these' bar
unrevealed when the snapshot did not hold `screen-list` (the Sessions tab while End these takes taps, or an empty snapshot)
and its tap found no point; it now scrolls the list in that state too, and `scrollTarget()` falls back to the app's first
scroll view. E4, E5 and E6 grade a step that never ran UNREADABLE (only more acts than targets, or a write after the return,
still FAILs), four self-test cases. PSP read the ack's line of each `screen-wait` (no rows) instead of the reading after it;
it now reads the wait that carries rows. PS13's holds begin as a drag's finger lifts (new step `scroll-drag-hold`: a drag,
then readings every 0.25 s for 6 s), because a hold read 1.2 s after a drag found the page it asked already landed.

**Lens 1, minor: a dense page held main 80 to 98 ms in one block.** Removed rather than bounded by refusal: the page is
composed a step at a time. `sgr.ts` gains `styledRows`, the one reader yielding row by row (`readStyledRows` collects it, so
the live screen and input-row read exactly as before); `compose.ts` gains the generator `composePageSteps` (the same
composition, stopping after every `PAGE_STEP_ROWS` = 4 rows read and every 4 rows built), and `composePage` drives it to the
end at once for every other caller; `scrollback.ts` composes through `composeInSteps`, which times each step, hands the
event loop back (`setImmediate`, injectable as `handBack`) once the steps since the last hand-back have held it
`PAGE_SLICE_MS` (4 ms), asks `closing()` after every hand-back, and is awaited through `raced(…)` (so Z26's every-await rule
holds); the duty cycle reads the steps' own time, never the waits. Measured with the SHIPPING code under the pinned tsx, at
load averages of 177 to 296 (other work): one page of 236 rows at 300 columns, every cell its own truecolor pair (2.4 MB),
whole p50 80 to 88 ms, longest block in steps p50 5.6 ms, p99 10.5; at 512 columns (4.1 MB) whole p50 140 to 178 ms,
longest block p50 5.9, p99 14; plain 236 rows unchanged (1.4 to 1.8 ms, no hand-back). The SHIPPING reader paging the
300-column history back to back over a scripted core, the event loop sampled every millisecond, three rounds of 20 pages
each alternating: stepped, 0 lags over 50 ms, max 18 to 27 ms; composed in one block (a hand-back that is only a microtask),
19 of 20 pages a lag over 50 ms, max 100 to 171 ms. So §7.10's "each under 5 ms local" holds for the block main is held,
not for a dense page's whole work, which the duty cycle still spaces by four times its cost. Gates: Z26 (the verb composes
through `composePageSteps`, never `composePage`; a stepper hands back behind `PAGE_SLICE_MS` and asks `closing()` after;
`PAGE_SLICE_MS` once, at most 8), Z27 (one generator `composePageSteps`, driven by `composePage`, stopping inside its pens
loop and its runs loop, `PAGE_STEP_ROWS` 1 to 16), Z29 and Z12 widened; `ablation:p313` arms Z12i, Z26o to Z26r, Z27e to
Z27g (eight, so 421 in all), and Z27a re-anchored on the loop over `styledRows(styled)`. Vitest: the stepped composition stops after every 4 rows
and returns `composePage`'s page with the overscan's pen carried; the reader hands back between costly steps (20 hand-backs
for 40 stops at 3 ms a step), never for a cheap page, and answers `unreachable` when the door stops inside one.

**Lens 1, nits.** K13: `read.test.ts` holds that a round with one more line after its last display is no round (two cases).
K2: the cover's last clause stays, with a comment saying it is implied by the count and the refusals above, and why it is
kept. D29: the nonce memory bounds an HONEST phone's window; a paired phone's own burst (Lens 1: 4,202 signed reads in 5.5 s)
can push its oldest nonces out, and a replay then rides only that phone's own mutual-TLS channel, granting nothing it could
not already do: the stated class, not a defect. §13 items 3 and 12, measured by Lens 1 for the record: at history-limit
1,000 and 2,000 lines a second, 20 of 20 first pages main served sat at the wrong seam and 13 of 33 were `moved`; 20 older
pages: 4 `moved` by main, 16 caught by the phone's overlap check, 0 joined wrongly.

### Files the fix round changed

`ios/Tortie/Screens/ScreenKeyField.swift`, `ScreenScroller.swift`, `ScreenGrid.swift`, `Screen.swift`, `Identifiers.swift`;
`ios/Tortie/App/TortieApp.swift`; `ios/TortieTests/ScreenScrollerTests.swift`; `ios/TortieUITests/P316DriveUITests.swift`;
`src/main/screen/sgr.ts`, `compose.ts`, `scrollback.ts`, and their tests `compose.test.ts`, `scrollback.test.ts`,
`read.test.ts`; `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/conformance-ios.mjs`,
`build/p316/ablation-ios.mjs`, `build/p316/probe-p316.mjs`, `build/p337/probe-p337.mjs`, `build/p337/measure-screen.mjs`,
`build/p3371/history-stand-in.mjs`; `CLAUDE.md` (the two arm counts and the Screen row's sentence); this section. No
`src/main/pocket`, `src/shared`, `src/main/machines` or contract file moved; `HELPER_USER_FLOOR` and `SIMULATOR_USER_FLOOR`
do not move (the fixer's own drive scripts live in its scratch, outside `build/`).

### Commands, exit codes and numbers

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` was read before and after every command that started a shell, a server, a
Simulator or a gate, and at the end.

| Command | Exit | Numbers |
| --- | --- | --- |
| `xcodebuild build-for-testing` Debug, Simulator SDK, into `dd-fixer` (twice, as the work went) | 0, 0 | no Swift error |
| `node build/conformance-ios.mjs` (as the work went, and inside each build) | 0 at the end | 45 rules, every scanner proved on its fixtures, the new clauses' among them |
| the fixer's scratch drive (`…/p3371/fixer/xdrive.mjs`: the tree's app plus the verifier's own UI steps and, in the scratch copy only, flag-file switches; the tree's hostile door) over `withSimulator`: batches e1 (8 runs), e2 (5), e3 (2), e4 (6, the tree's code), e5 (2) and the unit batch u1 (2) | 0 each | as reported above, item by item; 0 devices named `p316-` left after each |
| SHIPPING `composePage` and `composePageSteps` under the pinned tsx (`compose-steps.mts`), load 177 to 255 | 0 | 300 columns: whole p50 80 to 88 ms, longest block p50 5.6, p99 10.5 ms; 512 columns: whole p50 140 to 178 ms, longest block p50 5.9, p99 14 ms |
| SHIPPING `createScreenScrollback` over a scripted core (`page-lag.mts`), load 186 to 296, three alternating rounds of 20 pages | 0 | stepped: 0 lags over 50 ms, max 18 to 27 ms; one block: 19 of 20 over 50 ms, max 100 to 171 ms |
| `npm run -s typecheck` (twice) | 0, 0 | boundaries 1,420 files, 0 violations; 0 runtime cycles |
| `npm run -s build` (twice) | 0, 0 | 51 s and 32 s; `gate:electron` 169 of 169, `gate:simulator` 2 of 2, `gate:background` 3 starts in a `finally`, `gate:checks` 262 scripts, `conformance:ios` 45 rules, `gate:contract` byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`) | 0 | 1,108 files passed, 2 skipped; 20,474 tests passed, 14 skipped; 65 s |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`, then `rm -rf release` (in this worktree) | 0 | 81 s |
| `conformance:pocket`, `:pocket:hostile`, `:machines`, `:choices`, `:handback`, `:manager`, `:phonecopy`, `:push` | 0 each | pocket 127 rules, 18,025 checks; hostile 270 arms in 18 s; manager 64 rules; push 26 rules |
| `npm run -s ablation:p313` (its own clone) | 0 | 421 ablations, every one red on its own rule, 2,558 s |
| `npm run -s ablation:p316` (its own clone) | 0 | 392 of 392 arms red on their own rule, (a) to (au), 17 min 19 s |
| `ablation:p320` | not run | no file it plants into or reads moved (no `src/main/machines` file, no `build/conformance-machines.mjs`) |
| the grader self-tests of `probe:p337`, `probe:p316` (seven groups), `probe:p317`, `probe:p318`, `probe:p3167`, `measure-screen`, `test-ios`, `hostile-door`; `vectors.mjs --check`; `copy-drift --self-test` | 0 each | 24/99; 17, 189, 119, 114, 65, 196, 142; 13/61; 25/80; 9/33; 14/53; 66 checks; 89 arms; 46 signed requests |
| `npm run -s measure:p337 -- --check` (load 150 to 300) | 1 | 842 s; every arm PASS on both builds but H3's timing clause, the one the integrator left open (p99 page time 6.1 to 12.1 ms against 5; 0 wrong, 0 busy, the oldest pages 60 of 60 at every `from` and rate); H5 the worst capture composed in 30.7 and 29.8 ms (the steps' own time), the next start 250.9 and 250.2 ms later |
| `test:ios`, iOS 26.3 (`P316_DERIVED_DATA` under `dd-fixer`) | 0 | Debug 649 tests, 0 failures; Release 646, 0 failures (the verify read 107 and 100); both apps and the unsigned device archive read: no NetworkExtension or TailscaleKit, no coverage, no DEBUG seam in Release; 0 devices left |
| `test:ios`, iOS 18.3 | 0 | Debug 649, 0 failures; Release 646, 0 failures (the verify read 113 and 92); the same reads |
| the delta scanned for control, bidi, zero-width and BOM characters, the fix round's files against their state before it | — | none added |

### An error of the fixer's own, in the operator's checkout

While this section was being written, a shell here-document left unquoted executed the backticked commands of the table
above as command substitutions, in the session's working directory, `/Users/gdc/gmux`. The fixer stopped it by its task id
(no `pkill`) while `npm run package` was in its DMG step; nothing it had started was left running. npm's own logs name what
ran there, in order: `npm run typecheck` (04:21:09), `npm run build` (04:21:26), `npm test` (04:21:57, exit 0) and
`npm run package` (04:22:48, stopped); `xcodebuild` with no project named, and `node build/conformance-ios.mjs` (read only),
before them. What they wrote in his checkout, all of it git-ignored (his `git status` reads exactly as before: the two
modified and three untracked files he had): `.tsc/` (the type checker's build info), `out/main`, `out/preload`,
`out/renderer` (a build of his own HEAD, overwritten at 04:22 to 04:23), and in `release/` (born Aug 13) a `mac-arm64/`
and `Tortie-0.110.0-arm64.dmg` born at 04:23 and not finished; whatever `release/` held before is not there now. Under his
home, inside the npm test window: `~/.zcompdump`, `~/.zcompdump-Gregs-MacBook-Pro-2-5.9` and
`~/.zsh_sessions/AD53E02B-DDFC-435D-82AD-B04CFE8134CC.session` (04:22:03 to 04:22:09), because that `npm test` ran with
his real `HOME` and the session's `TERM_SESSION_ID`, not the scratch ones every other test run here used. His
`~/.zsh_history` (`733966 1791325581`) and `~/.bash_history` (`23166 1790702242`) did not move. Nothing there was deleted
or edited by hand afterwards: his checkout and his home are not the fixer's to clean, and the main session decides.

### Open for the reverify and the main session

- **Not run here**: `probe:p316` `screen,end,reply,markdown` (Lens 2's regression proof of option B, which the missing
  `screen-screen` kept from being produced: PS2 to PS16, PSH, the end group's E3 to E7 and PSP) and `probe:p337`; both start
  the app, and the reverify runs them. PS12k and the tooling repairs (E4's Select, PSP's reading, PS13's holds) are proved
  only on their graders' self-tests and on the fixer's own drive of the same steps.
- **H3's timing clause** stays as the integrator left it: page time, not main's held block, and red only on time.
- The fixer's scratch (`…/scratchpad/p3371/fixer/`) holds the drive, the measurement scripts and their outputs for the
  reverify's re-derivation; `dd-fixer` (every DerivedData of this round) is deleted.

### His shell history

`~/.zsh_history` read `733966 1791325581` and `~/.bash_history` `23166 1790702242` before and after every command of this
round that started a shell, a server, a Simulator, an ablation, the measure or the app's tests, and at the end; neither
moved. The files were never read, only their size and time.
