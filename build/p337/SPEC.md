# Phase 337 — the Screen: a session's own terminal on the phone, typed into with every key — SPEC

Written by the spec step on 2026-10-05 in `/private/tmp/wt-p337`, a detached worktree at origin/main `aebb4ce9`
("docs(backlog): queue the Screen"). Every `file:line` below was re-read at `aebb4ce9` on this date. **The spec step MEASURED
before it wrote** (§14 holds every measurement, its command, its exit code and its numbers): on scratch tmux servers of its own
(`-L p337s-<pid>-37b` and `-36a`, each under its own `TMUX_TMPDIR`, never `-L gmux` and never the default server), with the
vendored tmux 3.7b and Homebrew's 3.6a, stand-ins that draw the committed captures and record every byte they read, the
SHIPPING `TmuxControlClient` and the SHIPPING door listener run through the pinned tsx, and a loopback machine of its own. It
started no Electron, no Simulator, no agent and no model turn; it read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his
keychain or his live Tortie profile; and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `732999 1791229874` and
`23166 1790702242` before and after every command that started a shell, a server or a far session.

Read with it, whole: `docs/BACKLOG.md` "## Phase 337" (the entry, 2026-10-05), `docs/research/139-a-live-session-on-the-phone.md`
(binds: §4 what Tortie holds and what was measured, §6.1 the mechanism, §2 to §3 how ten products do it),
`build/p318/SPEC.md` and its two "§As built" sections (the write door, the ledger, the reply's reader and writer this phase
types beside), `build/p317/SPEC.md` "§As built" (End, which moves), `build/p3167/SPEC.md` (the read route shape),
`build/p316/SPEC.md` "§As built — 316.2" to "316.4" (the phone, its harness and its rules), and Paseo's native terminal
renderer at `getpaseo/paseo` `2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93` (Apache-2.0), read only, under the session's
scratchpad at `r139/repos/paseo/packages/app/src/terminal/native-renderer/` and `r139/repos/paseo/docs/terminal-performance.md`.

**The order of authority.** His four rulings of 2026-10-05 override the entry and research 139 wherever they differ. The tree
at `aebb4ce9` overrides the entry's picture of it. Where this file departs from the entry or the research for any other
reason, §3 says so row by row and gives the reason.

His rulings, in his words where the harness relayed them, and what each moves:

1. **"Yes, for a session's screen."** Research 136's "no raw terminal on the phone, ever" (§7; research 136 §12's drafts say
   "It never shows or streams a terminal screen") is LIFTED for a session's own screen, reached from inside a session, with
   Conversation the first-run default. The store text says "the session's screen", never SSH or remote desktop. See a Sample
   shows a canned Screen. His earlier ruling on the Phase 316 entry stands beside it, "the full CONVERSATION yes, the raw
   terminal scrollback no" (`docs/BACKLOG.md:33393`): the Screen is the screen tmux shows now, never its scrollback.
2. **"Never."** The phone never changes the size of a session on his Mac. It draws the Mac's width; he zooms, pans or turns
   the phone sideways. Nothing attaches as a sized client.
3. **"Every key, including Ctrl-C."** Every key: the printable keyboard, dictation, and a key bar (Esc, Tab, Shift-Tab, the
   arrows, Ctrl, Return). No Face ID on any key; Face ID stays on End alone. On this Mac and on another machine, so a
   named-key shape joins Phase 320.1's carriage as his yes (`src/main/machines/scroll-shapes.ts:160-165`).
4. **"Screen first", then "Yes: simple delivery first."** The Mac composes the screen and the phone fetches it with a long
   poll. No stream and no terminal emulator on the phone (Phase 338, only if his own use finds this one laggy). End moves to
   the top right of the Session screen and the bottom End bar goes. Phase 318.1's message box is NOT in this phase.

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p …/scratchpad/electron.phone-wait && echo p337 > …/electron.phone-wait/p337-<role>`, then
  `zsh …/scratchpad/lock.sh try p337 phone` (prints the slot or exits 1; retry every 60 s in a NEW command), remove the wait
  file once a slot is held, and release with `zsh …/scratchpad/lock.sh release <dir>` on the same command line.
- `/Users/gdc/gmux`, `/Users/gdc/tortiedotsh`, `/Users/gdc/superset` and every clone under `…/scratchpad/r139/repos` are read
  only. Nobody but the committer commits, stages or stashes. `git diff aebb4ce9` in this worktree is exactly 337's delta.
  Install nothing. Paseo's clone is never built or run.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid: a process
  is ended by the pid its starter holds, in a `finally`.
- No real Tailscale, DNS or APNs: the door is published only through `build/p330/tailscale-standin.mjs` and names only
  `build/p332/dns-standin.mjs`. His keychain, credentials, APNs key, `~/.ssh`, conversation stores (`~/.claude`, `~/.codex`,
  his Claude Code and Codex logs) and live Tortie profile are never read. Real data means the committed captures
  (`build/fixtures/**`, `src/main/activity/__tests__/fixtures/**`, `docs/research/assets/63-fixtures`).
- **No model turn.** Every agent is a stand-in (`build/p318/stand-in.mjs`, `build/p321/stand-in.mjs`, or a `/bin/sh`
  drawing committed captures). `smoke:remote` is NOT run. Gemini, Qwen, Antigravity and Grok are never started; a scratch
  `agents.json` renames their binaries (and Droid's) before every launch.
- **His shell history**: before and after every command that starts a shell, a far session, a Simulator or the app, record
  ONLY `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves. Any shell a test starts runs with a
  scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- **Far sessions only through the loopback machine with `SCRATCH_MACHINE_QUIET_SHELL=1` AND, new in this phase,
  `SCRATCH_MACHINE_NO_OWN_KEYS=1`** (D37): today `build/scratch-machine.mjs:103-138, 373` reads `~/.ssh/*.pub` and asks his
  agent for its public keys (`ssh-add -L`) to write the far side's `authorized_keys`, which this phase's rules forbid. Until
  the proof builder's option exists no role runs the loopback machine; the spec step used a loopback sshd of its own that
  trusts one key made for the run (§14 M9).
- Simulators only through `build/simulator-run.mjs`. Every `xcodebuild` uses
  `-derivedDataPath …/scratchpad/p337/dd-<role>`, deleted before the role returns. No screenshot and no recording: a visual
  claim is a frame, a label or a number read.
- No raw control byte, bidi, zero-width or BOM character in any committed file (the committed captures' real U+00A0 after
  Claude Code's `❯` excepted, build/p318/SPEC.md §As built). Test texts that need one build it from a code point at run time.
- **Keep out of Phase 336.1's files**: `src/shared/remote-write-folder.ts`, the far prelude
  (`src/main/machines/remote-scripts.ts`, `remote-file.ts`, `remote-copy.ts`), `build/p336/**`. **336.1 LANDED while this
  spec was attacked** (`47c3c79e`, then `b989a0ed` on origin/main; `/private/tmp/wt-p3361` is gone), so 337 lands second and
  replays onto `b989a0ed` (§4.2, §Attack A17). Four files are shared and merge by blocks at landing:
  `build/conformance-machines.mjs`, `build/scratch-machine.mjs`, `CHANGELOG.md` and, only if 337 edits it,
  `build/machines-conformance-probe.mts`.
- Describe any weakness by its class, never as a recipe.

---

## 1. The answer first

**What a person can do after this phase.**

1. On the iPhone, a running session's page has a **Screen** row under **Conversation**. It opens that session's own screen as
   his Mac shows it now: the agent's rows, its colours, its boxes and its cursor, for every agent, for a shell, on this Mac
   and on another machine. It updates while the agent works. Conversation stays the first row and the session still opens on
   its page, as today.
2. The Screen is drawn at the Mac's width and height. In portrait it fits the width, a glance; he pinches to zoom, drags to
   pan, double-taps between the fitted size and a readable one, or turns the phone sideways, where the Screen alone may go
   landscape. **The Mac's window never changes size** (his ruling 2): nothing attaches, and every read and every key the Mac
   sends for the phone was measured leaving a 160x45 Mac client at 160x45 (§14 M13).
3. A tap on the Screen raises the keyboard with a **key bar**: esc, tab, ⇧tab, the four arrows, ctrl (one shot), return, and
   one to put the keyboard away. Letters, digits, symbols, emoji, dictation and the CJK keyboards type into the session
   exactly as typed; ctrl then a letter sends that control key, Ctrl-C included. **Nothing asks Face ID** (his ruling 3).
4. **The one refusal.** While the session is asking a numbered question (or waiting on him), keys go one batch per screen: a
   key sent against a screen that no longer shows the question he was looking at, because a new question appeared or someone
   typed at the Mac, is refused with nothing typed, and the phone says so. Anywhere else keys flow as they arrive.
5. A long press selects text on the Screen and **Copy** puts it on the iPhone's clipboard. The Screen holds the picture it was
   selecting on until the selection is copied or cleared.
6. **End moves to the top right** of the session's page, behind Face ID exactly as in Phase 317; the bar at the bottom is gone.
7. His Mac asks him to allow the phone door once more after the update: the route list (a hashed field) gains `screen` and
   `keys`, and the confirm line now says the phone can "type into any session as you would at this Mac".

**Where the lifted refusal lived.** No conformance rule spells "no raw terminal": it lived in research 136 §7 and §12's
drafts (§11 moves them), in `Copy.terminalStaysOnMac` (D31), and in `ConversationScreen.swift`'s header (its comment
follows). The rules that keep the phone honest about what it draws stand whole; (ah) to (an) are added.

**Nothing else changes for a person on the Mac.** No Mac surface is added, renamed or removed; `src/main/menu.ts` does not
move and the gate asserts it. The Conversation, the lists, the alerts, the press and the message box are as Phase 318 left
them. One sentence on the phone changes, because it would be false: `The terminal’s own output stays on your Mac.` above a
conversation becomes `The terminal’s scrollback stays on your Mac.` (D31).

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **Two rows on the closed table**: `{ id: 'screen', method: 'GET', path: '/v1/screen', reads: true, windowOnly: false, signed: true }` and `{ id: 'keys', method: 'POST', path: '/v1/keys', reads: false, windowOnly: false, signed: true }`. The write list becomes `end, choose, say, keys` (its order is the confirm line's). R4's pin moves on purpose from `d95ecd27…` to **`16115392e007ad274fc815f4c8456624f58fd534558be4eaad7d154c59e9b061`** (ten sorted lines; re-derived two ways, §14 M14) | his ruling 4; the entry; `src/main/pocket/door/table.ts:76-85`; `build/conformance-pocket.mjs:882` |
| D2 | **`GET /v1/screen?id=<session>[&since=<revision>]`**: the query names one session and, optionally, the revision the phone holds; anything else in it (another key, a repeat, a `since` that is not 12 lowercase hex) is answered as an unknown id is, 404. A signed read like `/v1/session` | `src/main/pocket/routes.ts:681-708` (`readSessionsQuery`'s refusal shape); 316.7 D3 |
| D3 | **The long poll, inside the door's 15 s timer.** Main answers AT ONCE when `since` is absent or is not the session's current revision; otherwise it holds the request, re-reading every `SCREEN_TICK_MS` (100 ms on this Mac, 400 ms on another machine), and answers the moment the revision moves, or at `SCREEN_HOLD_MS` (10,000) with `unchanged: true` and nothing else. **A waiting poll is answered from ITS OWN 100 ms timer and never awaits a read** (§Attack A7): each tick of that timer asks `closing()` (the quit, the door that accepted the request stopping), the hold's end and the session's latest reading, so a remote read in flight (deadline 2 s) can never hold a poll past the door's stop join (`DOOR_STOP_JOIN_MS` 1,000, `door/limits.ts:37`). Every read has a deadline (`SCREEN_LOCAL_READ_DEADLINE_MS` 1,000, `SCREEN_REMOTE_READ_DEADLINE_MS` 2,000; a read past it counts as not read) and **one read is in flight per session at a time** (a tick while one is in flight starts nothing; a read past its deadline keeps the slot until it settles), so reads never pile up. The answer leaves by `SCREEN_HOLD_MS + SCREEN_TICK_MS` at the latest. MEASURED on the shipping listener: a read main held 10 s answered at 10,003 ms; one held 16 s was the door's 404 at 15,005 ms (§14 M10) | `src/main/pocket/door/limits.ts:31-37`; `src/main/pocket/door/listener.ts:544-557`; `src/main/pocket/bind.ts:508`; research 139 §6.1 |
| D4 | **One shared watcher per session.** However many polls wait on a session, ONE reader reads it, at most once a tick, and every waiting poll is answered from its reading. **The keys write nudges it, and the answer waits for the redraw** (§Attack A6): `nudge(sessionId, before)` carries the window mark (`hashScreen(readBackWindowOf(plain))`, the last 24 inked rows) of the keys verb's own fresh read; the session's next read is 30 ms after the keys are handed to tmux, and no poll of it, held or stale, is answered until the FIRST read whose window mark differs from `before`, or the first read that starts `SCREEN_SETTLE_MS` (300) or more after the act, whichever comes first. So a picture that answers a key shows the agent's redraw when it redraws within 300 ms, and is never the moved question id over the old window, which the next key inside a question would be refused against | one phone's screen should cost one capture a tick; agents redraw later than 30 ms (Ink and ratatui throttle their frames), and a turn-only picture inside a question turns the next arrow into a false `changed` |
| D5 | **One read is three control-client lines written in one tick**: `display-message -p -t <$id> <SCREEN_FORMAT>`, `capture-pane -p -e -t <$id>`, `display-message -p -t <$id> <SCREEN_FORMAT>` (the session's active pane, which both displays name), each one command per line (a `;` list desyncs the client's queue, `src/main/sessions/core.ts:2721-2727`), through the core's control client (`core.control`, the path the monitor and the press already use). The two displays must agree on the pane, width, height and the alternate screen, or the read is taken once more; a second disagreement is served with the second display's values, and the keys act aims at the `%pane` they name. MEASURED: 0.116 to 0.122 ms p50, 0.25 to 0.33 ms p99 for the three lines (a full styled capture alone: 0.062 to 0.065 ms p50; as a spawned `tmux`: 2.22 to 2.77 ms p50, 6.6 to 7.8 ms p99) (§14 M2). **When the control client is down: ONE spawned `tmux` per read** carrying the three as a `;` list (a spawned list does not desync anything: its output is split by count, the first line the display, then exactly the first display's `rows` lines of capture, then the second display), and the tick for that session rises to `SCREEN_TICK_REMOTE_MS` (400) while the client is down, so a down client costs 2.5 spawns a second per watched session rather than 30 (§Attack A8) | the entry; research 139 §4.2 ("0.2 ms") re-measured on 3.7b and 3.6a |
| D6 | **`SCREEN_FORMAT` is one constant**: `#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}`. No caller string is ever a format (a format on a long-lived connection can run programs: `src/main/machines/scroll-shapes.ts:24-33`) | Phase 320.1's rule |
| D7 | **Nothing sizes anything.** No module this phase adds names `refresh-client`, `resize-window`, `resize-pane`, `attach-session`, `new-session`, `switch-client`, `-x` or `-y`, and the phone sends no size: its screen target is exactly `id` and `since`, its keys body exactly `dialog, keys, session, turn, write`. MEASURED: with a 160x45 "Mac" client attached in a pty, 100 three-line reads and 150 key commands over a control client left the window 160x45 on both builds; a second ordinary client at 50x30 shrank it to 50x30 the moment it attached, which is the control, and why the phone never attaches (§14 M13) | his ruling 2; research 139 §4.2 |
| D8 | **The shared control client ends a block only on its own guard.** `TmuxControlClient.handleLine` closes an open block only on a `%end` or `%error` whose command number and time equal the `%begin` that opened it; any other line, guard-shaped or not, is body. MEASURED at `aebb4ce9` with the SHIPPING client: a pane drawing two guard-shaped rows, read pipelined with three other panes, handed the next pane's answer to the wrong command in **20 of 20** trials on both builds, and later commands stayed shifted in 10 of 20 (3.7b) and 1 of 20 (3.6a) trials after it (§14 M3). tmux writes a captured row raw inside the block (§14 M2, `-C` escapes nothing printable), and its own `%begin` and `%end` carry the same number, time and flags (201 of 201 pairs on both builds, §14 M16), so matching them costs a real answer nothing. **This is today's defect** (the monitor captures over this client on every tick, `src/main/activity/monitor.ts:1339-1346`, `src/main/sessions/core.ts:1239`), and this phase closes it because the Screen reads untrusted screens through the same client ten times a second | no scenario worse than today; a class of hostile screen content stated, not a recipe |
| D9 | **The composer** (NEW `src/main/screen/compose.ts`, pure): the styled capture → cells by tmux's own widths (D10) → runs of one style, **a cell wider or narrower than one column always its own run** → styles resolved to sRGB (D12) → rows of `{ text, style, cells }` and a style table, trailing default-ground blanks dropped. MEASURED over the 16 committed `.ansi` real captures redrawn into a 120x40 pane and captured again, on both builds: every row's text and every run's style identical to the original's composition (40 of 40 rows each); over those 16 and the 40 committed `.txt` screens (Claude Code, Codex, Gemini, Qwen, Antigravity, Cursor, OpenCode, Muse, Pi, a shell: 1,600 rows), the composed text equals `capture-pane -p` byte for byte (§14 M7). Real screens compose in 0.040 ms p50 and 0.227 ms p99, at most 3,782 bytes, 180 runs and 13 styles (§14 M12) | the entry ("rows of styled runs"); the byte comparison the proof asks for |
| D10 | **Cell widths are tmux's, measured, not a hand table.** A width per code point from a frozen table GENERATED from tmux 3.7b's own answer for every code point U+0020 to U+3FFFF (260,031; 925 ranges), plus seven sequence rules measured on 281 sequences (VS16 widens to 2; VS15 keeps the base's width; a ZWJ joins the next code point into the cell; a regional-indicator pair is one cell of 2; a skin tone joins an emoji-presentation base and is its own cell of 2 after any other; a keycap is 2; Hangul medial and final jamo join the syllable). A hand table measured 387 of 7,844 code points wrong; the generated table IS tmux 3.7b's answer for each of the 260,031, and with the rules the composer agrees with tmux on all 281 sequences and on five mixed rows read by tmux's own cursor (§14 M5, M6, M7). **The builds differ** on 4,515 code points, every one assigned in Unicode 16 or 17 (CJK Extension J, new combining marks, 7 newest emoji): a session on a machine running Homebrew's 3.6a can draw one column off on a row holding one of them | Tortie runs the vendored 3.7b; stated rather than guessed |
| D11 | **One SGR reader** (NEW `src/main/screen/sgr.ts`): every attribute and colour form tmux writes (`38;5;n`, `38:5:n`, `38;2;r;g;b`, `38:2::r:g:b`, `4:3`, `58;…`, 39, 49, 22 to 29, 53, 55), the pen carried across rows (tmux does not reset at a row's end), and an escape it does not know marks its row unreadable. `src/main/reply/input-row.ts` reads its rows through it with a projection that answers what it answers at `aebb4ce9`, byte for byte; 318's input-row tests run unedited | the entry ("widening input-row.ts's reader into one module"); one reader of tmux's styles, not two |
| D12 | **Colours are resolved on the Mac, exactly as the Mac's own dark terminal draws them at its DEFAULT appearance** (the Mac's live ground and ink follow `--bg-canvas` and the chrome theme, `src/renderer/terminal/theme.ts:319-333`, so a chosen chrome hue or the light base is not carried to the phone, which is dark only; stated, §Attack A14): the 16 ANSI slots, the default foreground and the cursor from the Mac's dark `terminalTheme` (`src/renderer/terminal/theme.ts:27-53`, spelled once more in NEW `src/main/screen/palette.ts` and held equal to it by a vitest that reads the renderer file as text); 16 to 231 by xterm's cube (levels 0, 95, 135, 175, 215, 255), 232 to 255 by xterm's greys (8 + 10n); 24-bit passed through; inverse swapped FIRST, the default ground standing in for a default background, and then bold on slots 0 to 7 takes 8 to 15 for the ink alone (xterm's default and its order: `@xterm/addon-webgl` 0.19.0 swaps before `_getForegroundColor` brightens, and fills an inverse cell's ground with the pen's foreground slot as written; amended by the fix round of 2026-10-06, which the verify found brightening first, bold inverse red drawn on `#f07e78` where the Mac draws `#e5655e`); hidden drawn in its ground; the default background null (the ground). **Ruled, with the evidence**: the 16 committed real captures carry **0** basic colour codes (no 30 to 37, 40 to 47, 90 to 97 or 100 to 107 anywhere), **283** 256-colour codes (9 distinct indices) and **38** 24-bit codes (8 distinct values) (§14 M7, re-derived with an SGR reader of this step's own; research 139 §4.2's "464 basic" are not colour codes). A map onto 16 tokens would change every coloured cell an agent draws; resolving keeps every one. **Rule (a) still holds on the phone**: the phone writes no colour literal; a colour the door names is DATA and becomes a `Color` in ONE function in `Style/Tokens.swift` (`Token.drawn(_:)`), and the colours the phone chooses (the page around the grid, the selection) are tokens | his ruling 1 ("as if I'm in that session on my Mac"); `build/conformance-ios.mjs:870-895` |
| D13 | **The answer** (`PocketScreenAnswer`, §5.2): `revision`, `unchanged`, and either `screen` (cols, rows, cursor, alternate, ground, ink, caret, styles, lines, `turn`, `asking`, `dialog`, `typable`) or `why` (`ended`, `unreachable`, `large`) with main's sentence. Composed field by field. Sent whole with a `Content-Length`, never streamed (C1) | the entry; `src/main/pocket/door/send.ts:12-18` |
| D14 | **The revision** is 12 lowercase hex of sha256 over the raw styled capture, the second display line, the question id, `asking` and `typable`; the composer runs only when it moves | composing an unchanged screen is waste; Paseo `docs/terminal-performance.md:26` (whole snapshots on every update were its spiky lag) |
| D15 | **Caps**: cols ≤ 512, rows ≤ 200, styles ≤ 1,024, runs ≤ 16,384, the composed answer ≤ 1,048,576 bytes; over any one the answer is `why: 'large'` and no rows. **A duty cycle**: after a read that composed, the next is not before `max(tick, 4 × compose ms)`. MEASURED worst cases, every cell its own colour pair: 120x40 composes to 243,884 bytes in 6.2 ms p50; 250x70 to 899,442 bytes in 24.7 ms; 400x120 to 1,823,246 bytes in 66.7 ms and is refused (§14 M8) | main's event loop and the phone's 2 MiB cap (`ios/Tortie/Door/DoorClient.swift:163-174`) |
| D16 | **`asking` and `dialog`.** `asking` is true when the session's status is `needs_input` or a numbered question is drawn: `detectDialogRows(normalizeCapture(plain)).atChoice` over the plain text of the same capture (the composed rows' text, which equals `capture-pane -p`, D9). `dialog` is, while asking, `hashScreen(readBackWindowOf(plain))` (`src/main/reply/reader.ts:172-177`, the last 24 inked rows), else null. `turn` is the session's question id now (`replyTurns.current(id).id`, `src/main/reply/question-id.ts:126-129`) | the entry ("the question id he was looking at"); research 135 §2.3 |
| D17 | **`POST /v1/keys`**, body exactly `{ dialog, keys, session, turn, write }` (sorted keys): `keys` 1 to 64 items, each exactly `{ "t": <text> }` or `{ "k": <name> }`; text 1 or more characters, the items' text at most 1,024 UTF-8 bytes in all; a name one of `POCKET_SCREEN_KEY_NAMES` (35: `Escape`, `Tab`, `BTab`, `Enter`, `BSpace`, `Up`, `Down`, `Left`, `Right`, `C-a` to `C-z`); `turn` the question id's shape; `dialog` null or 12 lowercase hex. **A named item other than `BSpace` is the ONLY item of its write** (§Attack A1): a write is text and `BSpace` items in any order, or exactly one other named key and nothing else, because a program reads one write as one input, and `Escape` followed by anything in the same read is read as Meta (MEASURED: `Escape` then `b` in one statement reached the program as ONE read `1b62`, and `Escape` then `Up` as `1b1b5b41`, 3 of 3 on both builds and through the spawned list; 100 ms apart, two reads). `BSpace` is `7f`, never the start of a sequence, so a CJK rewrite stays one write. Anything else is `refused malformed` (318's echo rule). A text holding a C0 or C1 control, DEL or a lone surrogate is `refused character` with nothing typed. Body cap **16,384**: the worst legal-shape body is 7,359 bytes (1,024 bytes of C0 escaped `\u00XX`), so the Mac answers it in words rather than the door dropping it (§14 M15) | his ruling 3; 318 D3's reasoning |
| D18 | **Keys by tmux's own key encoding.** A name goes as `send-keys -t <%pane> <Name>`, so tmux encodes it for the program's current mode exactly as it encodes the same key typed at the desk (MEASURED: `Up` is `ESC [ A` normally and `ESC O A` in application cursor mode; `C-c` is `03`, and `ESC [ 2 7 ; 5 ; 9 9 ~` under modifyOtherKeys 2; `BTab` is `ESC [ Z`; both builds, §14 M4). Text goes as `send-keys -t <%pane> -H <hh> …`, at most 256 bytes a command, so it arrives as the exact bytes typed. **Never `-l`**: MEASURED, `send-keys -l` over the control client EXPANDED `$HOME` (the shipping `quoteTmuxArg` leaves `$` unquoted, `src/main/tmux/control-client.ts:590-599`), and as an argv dropped a trailing `;` (§14 M4) | the entry ("printable text as literal keys and every other key by tmux key name"); measured, not assumed |
| D19 | **The act, local**: `copy-mode -q -t <%pane>` then each item's lines, written in ONE synchronous statement over the core's control client, one command per line (318 D8's shape); one spawned list only when the client is down. MEASURED: a control-client key reaches the program in 0.075 to 0.143 ms p50, 0.74 to 0.82 ms p99 (§14 M4). Leaving copy mode first is what the desk does (`src/renderer/terminal/TerminalPane.tsx:419-425`, "Typing ALWAYS returns to live output first") | the desk's own rule; 318's press |
| D20 | **The act, on another machine** (his ruling 3): an **eighth carriage row**, `type-key` = `send-keys -t $N <one of POCKET_SCREEN_KEY_NAMES>`, composed only by NEW `namedKeySequence` in `scroll-shapes.ts`, and text through the existing `type-bytes` row (`typedSequence`, `scroll-shapes.ts:347-356`). NEW `typePhoneKeys` in `scroll-order.ts` writes one `cancel`, every item's commands and the road's read, in one tick, on the machine's live connection, so the road's park state stays true. A machine with no live connection: `refused unreachable`, nothing held, nothing typed later. MEASURED on a loopback machine: `Up` arrives `ESC O A` in application cursor mode through the carriage, `cancel` + `-H 61` lands in 0.095 to 0.097 ms p50 (§14 M9) | his ruling 3; Phase 320.1's own table and composer |
| D21 | **The final check**, synchronous after ONE fresh read whose capture is the last thing awaited: `still()` (the door's three asks, 318 D5); the row still listed, its status not `unknown`, `exited`, `restorable` or `discarded`; the same `$`-id (local) or the same live address (remote); then **the one refusal**: when the fresh read is asking, OR the picture the keys were sent against was asking (the body's `dialog` is not null), the body's `turn` must equal the question id now AND its `dialog` must equal the fresh read's `dialog`, else `refused changed` with `SCREEN_QUESTION_MOVED` and nothing typed: keys meant for a question reach that question or nothing, so a Return meant for a question answered at the Mac does not submit what someone has since typed at the prompt. When neither is asking, the echo is not compared. Then `replyTurns.bump(id, 'phone')`, the act in the very next statement, `noteUserInput(id)`, the watcher's nudge | research 135 §2.3 (a late Return approved an unseen dialog 8 of 8); 318's press shape |
| D22 | **Why `dialog` and not the question id alone.** A key the phone sends bumps the id, and the long poll then answers at once with the new id while the agent may still be drawing: a second Return pressed on that picture would carry the new id onto a question drawn a moment later with no hook (Codex) and no tick between. The window's hash is what changes when a new question is drawn; the id is what changes when someone typed or a hook fired. Both are asked | §13 item 2 states what remains |
| D23 | **noteUserInput after every keys act that typed**, as the desk calls it on every keystroke (`src/renderer/terminal/TerminalPane.tsx:433-441` → `activity:noteInput` → `src/main/activity/monitor.ts:535-541`): a key answers whatever the session was waiting on. It never raises `needs_input`; nothing in this phase names any other status setter. A session reading `unknown` takes no key (`paneRefusesInput`, `TerminalPane.tsx:102-104`) | the status rule in CLAUDE.md; the desk's own path |
| D24 | **The one write path and its ledger**: `/v1/keys` goes through `src/main/pocket/writes.ts`'s seven steps; one write in flight per phone and per session ACROSS verbs; at most once. **The ledger's caps rise** from 512 per phone and 4,096 in all to **2,048** and **8,192**, because the phone sends a keys write at most every 100 ms (D30), which is at most 1,200 in a ledger life (`2 × POCKET_CLOCK_SKEW_MS` = 120 s); X3 is widened on purpose | `src/main/pocket/writes.ts:89-93`; `build/conformance-pocket.mjs:222` |
| D25 | **The phone's two kept lines.** The Screen holds two connections of its own, one for the poll and one for keys, each sending `Connection: keep-alive` and reused while it has been idle less than `DoorLine.freshFor` (4 s). **A line idle `freshFor` is closed by the phone, and the Screen's disappearing closes both** (§Attack A12): at rest a Screen holds ONE connection, two while typing, so two phones behind one public address (one PROXY source, cap 4) on two Screens leave room for the rest of either app. A line whose answer said `Connection: close`, or that carried any byte past an answer's `Content-Length`, is closed and never reused. MEASURED on the shipping listener: two requests on one connection were both answered (2 ms each); an idle kept connection was closed at 6,003 ms (`keepAliveTimeout` 5 s and Node's grace); a fifth connection from one source was refused `source-cap` (§14 M10). A READ that ends before an answer on a reused line is asked once more on a new line; a WRITE is never retried and is only sent on a line idle under 4 s. Every other exchange keeps `Connection: close` | research 139 §6.1; `src/main/pocket/door/limits.ts:23, 33` |
| D26 | **The phone draws the Screen with Apple's own drawing and no package** (rules f and g): a SwiftUI `Canvas` per row inside a lazy, two-axis scroll view, each run drawn in a box exactly `cells × cellWidth` wide at its column, a wide cell's glyph centred and scaled down to fit its two columns, box drawing and block elements drawn as paths and rectangles, the cursor drawn as a block at 0.45 opacity, every row an accessibility element whose label is its text. **A cell whose character the cell font does not hold is drawn ALONE in its cells' box** (§Attack A2): the phone splits a run at every such character (`CTFontGetGlyphsForCharacters` false), asks for text presentation (U+FE0E after a width-1 emoji-capable code point, built from the code point at draw time), measures the glyph with `GraphicsContext.ResolvedText.measure(in:)` and scales it DOWN to the box, never up. MEASURED: 18 of the 69 distinct non-ASCII characters in the committed captures are not in SF Mono, and fall back to fonts whose advance is 0.81 to 2.29 times the cell (Claude Code's `⏺` as a colour emoji 2.29 cells wide, `⎿` 1.49); they sit on 118 of 2,325 rows and 32 of 56 screens (21 of Claude Code's), and in one `Text` per run every cell after one drifts. **The box and block shapes are Tortie's own**, derived from each code point's Unicode name for the whole of U+2500 to U+259F (§Attack A3), because Paseo's 55-glyph table lacks nine that agents draw: `╌` (1,676 times, Claude Code's dashed rule), `═ ║ ╔ ╗ ╚ ╝`, `░ ▓`. **Ported from Paseo's design** (§5.8), never its code or its tables | his ruling 4 ("no emulator"); research 139 §5.1; rule (z1) refuses `NSAttributedString` and his rulings did not narrow it, so no TextKit view |
| D27 | **Zoom, pan, landscape.** The grid fits the view's width at first; `MagnifyGesture` scales the font between that and 18 pt, **by a transform while the fingers move, the font set once when the gesture ends** (a font change redraws every row's `Canvas`); **the top is clamped so `cols × cellWidth × displayScale ≤ 8,192` px** (a row of 512 columns at 18 pt is about 17,000 px at 3x, past the GPU's 16,384 px texture bound; §Attack A24); a double tap toggles fitted and 12 pt (or the clamp); the scroll view pans both ways, **the rows at the top of a frame at least the view's size, every gesture on that whole frame** (the fix round of 2026-10-06: a two-axis scroll view centres smaller content, so the line drawn under the grid when a selection began moved the rows under a still finger, four rows on a fitted screen; `conformance:ios` (aq)). Landscape is allowed while the Screen is on top and nowhere else: Info.plist lists portrait and both landscapes, and `AppDelegate.application(_:supportedInterfaceOrientationsFor:)` answers portrait unless `OrientationGate.screenOnTop` | his ruling 2; Info.plist is portrait only today (`ios/Tortie/Info.plist:36-39`) |
| D28 | **The keyboard is a hidden text view.** A `UITextView` subclass, transparent and one point square, first responder while the person types: autocorrection, spell checking, smart quotes, smart dashes and smart insert off, capitalisation none, the default keyboard (an ASCII-capable one drops the globe key, Paseo `terminal-input.native.tsx:309-311`); nothing sent while `markedTextRange` is non-nil (IME composition and dictation in progress); a committed append sent as text, a CJK composition rewrite as `BSpace` items and the new text, any other replacement swallowed until the field resets (Paseo `terminal-input.native.tsx:68-93, 105-183`); **a replacement that is exactly `\n` is `Enter`, and any other replacement holding `\n` or `\r` is swallowed whole** (Paseo `:148-152`; §Attack A9: as written, a pasted or dictated block of lines became each line and an `Enter`, so every line ran in a shell), **asked of the text's Unicode scalars** (the fix round of 2026-10-06: `"\r\n"` is ONE `Character`, which neither `"\n"` nor `"\r"` equals, so `String.contains` missed a Windows line break and `test:ios` read it red on both runtimes); **the field takes no paste and no drop** (`canPerformAction` false for `paste(_:)` and its kin, `pasteConfiguration = nil`, a `textDropDelegate` that refuses), `inlinePredictionType = .no`, `writingToolsBehavior = .none`; **nothing is sent while dictation is running** (`textInputMode?.primaryLanguage == "dictation"`, or a dictation placeholder in the field), and its text goes once when it ends; `deleteBackward` as `BSpace` even on an empty field; the field emptied after each `Enter` and once it holds 256 characters, never while text is marked. The key bar is its `inputAccessoryView` | his ruling 3 (dictation); Paseo's input state machine |
| D29 | **Inside a numbered question, one batch per picture, decided by the turn.** While the picture the phone draws is `asking`: after a batch answered `done`, the next batch is sent only against a picture whose `turn` is NOT the turn that batch carried (the Mac moves the turn at the act, so such a picture was read after it, whichever of the two lines delivered first; §Attack A5: "arrived after the answer" lost the race to the poll's own answer and then waited up to the 10 s hold); after `changed`, only against a picture whose revision differs from the refused batch's; after any other outcome the lock is released. Keys typed while the lock holds are not sent and the line says `Waiting for the screen to redraw.`. Outside a question keys are gathered while a write is in flight and go in the next write, under D17's rule (a named key other than `BSpace` alone) | D21 and D22 on the phone's side. Paseo's `docs/terminal-performance.md:22` is about OUTPUT coalescing; Paseo sends input as typed |
| D30 | **The sender** (NEW `Screens/ScreenKeys.swift`): one write in flight, at most one every 0.1 s, at most 64 items or 1,024 text bytes a write, **a named key other than `BSpace` alone in its write** (D17), the rest waiting in memory; registered with the app and stopped by `AppModel.wentAway()` (a write whose bytes were not handed is withheld; waiting keys are dropped); nothing persisted, nothing retried; no owner check | 317 D6, 318 D24; his ruling 3 |
| D31 | **The sentence above a conversation changes**: `Copy.terminalStaysOnMac` from `The terminal’s own output stays on your Mac.` to `The terminal’s scrollback stays on your Mac.`, and `docs/design/phone/Conversation.html:75` with it | the old sentence is false once the Screen shows the terminal's output; the new one is his 316 ruling, still true |
| D32 | **The Session screen**: a `Screen` row under the `Conversation` row, drawn only when the session answer's NEW `screen` field is `true` (a running session on a Mac with this phase; absent from an older Mac, so no row and nothing to refuse). Nothing remembers which face he used last: no new stored key, rule (aa) unchanged | his ruling 1 ("Conversation the first-run default"); 316.7's three stored words |
| D33 | **End in the top bar**: `EndBar` becomes the toolbar's trailing item, the same `EndModel`, owner check, the Mac's own confirmation dialog and `ID.sessionEnd` Button with `.disabled(row == .off)`, now in the navigation bar; its line moves under the status block; the bottom `.safeAreaInset` keeps 318's message strip alone | his ruling 4; `ios/Tortie/Screens/SessionScreen.swift:227-238`; `build/conformance-ios.mjs` (ac) |
| D34 | **Selection** (NEW `Screens/ScreenSelection.swift`, Paseo's gesture classifier): a long press of 450 ms starts it, a drag extends it, a tap clears it; the long press is **UIKit's `UILongPressGestureRecognizer`** through `ScreenLongPress: UIGestureRecognizerRepresentable` (the fix round of 2026-10-06: as a SwiftUI `LongPressGesture` sequenced before a `DragGesture` it held every touch on iOS 26.3 and a zoomed Screen could not pan; UIKit arbitrates its long press with the scroll view's pan, a finger that moves first pans and one held still 450 ms selects; `conformance:ios` (aq)); while a selection exists the Screen draws the picture it began on; **Copy** writes `UIPasteboard.general.string` and nothing in the app ever reads the pasteboard | the task's "native selection"; Paseo issue #2393 (why it left the web view) |
| D35 | **The confirm line and the honesty sentence**: `WRITE_CLAUSES.keys = 'type into any session as you would at this Mac'`, so the line reads `Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac`; the route line `Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns`; `POCKET_DOOR_HONESTY` becomes `A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.` ("what … shows", because the Screen is not redacted, D41). The hash moves by the route list; `sha256-pocket-exec-v3` does not | refusal 8; the old sentence ("It can change nothing else on this Mac") is false once a phone can type into a shell |
| D36 | **`gate:contract` does not move.** The route ids are not IPC channels, environment names, manifest columns, storage keys or smoke modes (`docs/audits/contract-baseline.txt:165-177` names `pocket:*` channels only), and this phase adds none. The entry's "the contract baseline move[s] on purpose" is corrected here (§3 row 5); the integrator asserts it byte for byte | `docs/audits/contract-baseline.txt` |
| D37 | **The loopback machine trusts only the run's key**: `build/scratch-machine.mjs` gains `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which writes `authorized_keys` from the run's key alone and asks no agent, off by default so every other harness is byte for byte what it was; every 337 remote arm sets it with the quiet shell. The app still signs in: the yard already hands the command its own agent holding the run's key (`build/with-scratch-machine.mjs:190`, `build/scratch-machine.mjs:383-397`). **Stated, not closed** (§Attack A18): the `ssh` the APP spawns takes `~` from the account record, not `HOME`, so it opens the account's own ssh client configuration as every remote probe since Phase 69 has; no role reads it | his rule: never read `~/.ssh` |
| D38 | **The phone's build number is 7** in all six configurations; `PHONE_BUILD = '7'` | the entry |
| D39 | **See a Sample's canned Screen** is a committed fixture, `build/fixtures/screen/sample-claude-2.1.287.json`, composed by the SHIPPING composer from `build/fixtures/reply/claude-prompt-after-decline-2.1.287.ansi`, decoded by the phone's own decoder in a test. Phase 333.3, which builds See a Sample, answers the Screen read from it (§11) | his ruling 1; 333.3 is queued and not built |
| D40 | **The nonce memory and the request rate.** Every poll and every keys write is a signed request whose nonce the Mac remembers for the clock window (`POCKET_CLOCK_SKEW_MS` = 60 s), at most `POCKET_NONCE_MEMORY` per phone (512 today, `src/main/pocket/pairing.ts:1703`, evicting the oldest past it, `:1904-1924`). A phone on a Screen sends at most four polls a second (a held poll is answered no sooner than `SCREEN_MIN_ANSWER_GAP_MS`, 250, after it ARRIVED, unless by a key's settled answer; a stale `since` answers at once, so a second phone's poll never waits on the first's answer, §Attack A13), one more for each keys write's settled answer, and ten keys writes a second (D30): 24 a second, 1,440 in a 60 s window and 2,880 in the 120 s a skewed clock can stretch it to (§11), so the memory rises to **4,096**: a phone's own traffic never evicts a nonce still inside its window. Nothing else in the verifier moves | defence in depth under the channel binding; the budget is arithmetic over the phase's own rates |
| D41 | **The Screen is not redacted, and the phone keeps none of it** (§Attack A10). Any redaction would move cells and make the phone's rows differ from the Mac's, and he asked for the session's own screen; so the Screen shows what the Conversation's redaction would hide, the honesty sentence says "what any session's screen shows" (D35), and nothing of it is stored: no log (Z7), no file, no pasteboard but his own Copy, and **no app-switcher picture**: iOS photographs an app as it leaves the foreground and keeps that picture on the device, so `Screens/Screen.swift` draws a plain `Tokens.bgCanvas` cover (no text, no rows) whenever `scenePhase` is not `.active` | his ruling 1; 316's "nothing on disk"; rule (ao) |
| D42 | **The Mac keeps keys writes apart** (§Attack A1): `SCREEN_KEYS_GAP_MS = 50`; the keys verb starts no act on a session sooner than 50 ms after that session's previous keys act, by awaiting the remainder BEFORE its fresh read (the final check stays synchronous). MEASURED with the shipping tmux: an idle reader read two writes 1 ms apart as two reads (10 of 10), but a reader busy 25 ms after its previous input (an agent drawing) read writes up to 10 ms apart as ONE read (10 of 10) and 20 ms or more apart as two (0 of 10). The phone's 100 ms pacing is the usual gap; this is the Mac's own floor for two phones, a retry, or a phone that does not pace | a program parses one read as one input; Meta-Enter inserts a line rather than submitting |
| D43 | **The keys write's log line, bounded** (§Attack A11): `writes.ts`'s one log call stays one, but a keys write answered `done` is logged only when it is the session's first `done` keys write for `KEYS_LOG_QUIET_MS` (60,000); every other outcome of every verb is logged every time. One line a write (about 176 bytes in `buildLogLine`'s shape, `src/main/log/format.ts`) at ten a second fills `app.log`'s 2 MiB (`LOG_MAX_BYTES`, `src/main/log/transport.ts:23`, the pair 4 MiB) in about 20 minutes of typing and rotates every other line out of the log | the log is his diagnosis record; the at-most-once ledger, not the log, is the record of the writes |

**Subject.** `feat(pocket): see a session's own screen on the phone and type into it`

**First body line.** `Phase 337: the Screen, composed on the Mac and drawn natively`

**Semver.** Minor, unreleased: he can watch any session's terminal on the phone and type into it with every key. The iPhone
app 1.0.0, build 7. Nothing ships until his own TestFlight use; Phase 338 (a stream) follows only if that use finds this
laggy.

**Tier 3**, on four of CLAUDE.md's questions: it types into running sessions from outside the Mac, so it can lose or corrupt
his work (Ctrl-C ends an agent, a shell runs whatever is typed); it sends his screens (whatever a terminal shows, secrets
included) over the public internet behind Funnel; it adds a read and a write to the door on the internet and lifts a standing
refusal; and it claims to work across every agent and on another machine, so the evidence is a per-provider matrix. The
independent methods are §7.9: four, one an attack, plus the parent measurement.

**Menus.** No change. No Mac surface is added, renamed or removed; Settings then Phone draws one changed sentence and one
changed confirm line, which are words on an existing surface. `src/main/menu.ts` is asserted unchanged.

---

## 2. The tree at this head, re-read

| What | At `aebb4ce9` | Note |
| --- | --- | --- |
| The closed table | `src/main/pocket/door/table.ts:76-85`, eight rows | 337 adds `screen` after `sessions` and `keys` after `say` |
| Door limits | `src/main/pocket/door/limits.ts:21-35` (32 connections, 4 per source, 15 s request, 5 s keep-alive, 15 s answer), `:69` (`POCKET_WRITE_BODY_CAPS`) | the request timer covers the body only (`listener.ts:501-503`); the answer timer is main's (`:544-557`) |
| The wire | `src/main/pocket/door/wire.ts:113` (`DoorWriteRoute`), `:279-280` (`SIGNED_ROUTES`, `WRITE_ROUTES`), `:297-330` (`doorRequestOf`) | both lists gain one id |
| The listener | `src/main/pocket/door/listener.ts:633` (`http.keepAliveTimeout`), `:597` (the headers wait re-armed when a kept socket goes idle) | needs no edit |
| Main's handler | `src/main/pocket/server.ts:99` (`answer(route, query)`), `:197-205` (the read and refusal 7) | `answer` gains `closing` |
| The read composer | `src/main/pocket/ipc.ts:518-555`, the exhaustive switch | `case 'screen'` and `case 'keys'` |
| Routes and facts | `src/main/pocket/routes.ts:205-313` (`PocketFacts`, every member a read; `replyOffer?` `:308`), `:353-365` (`PocketWrites`), `:816` (`replyFor`), `:876-933` (`session()`) | `screen?` beside `replyOffer?`; `keys` beside `say`; a `screen` field |
| The one write path | `src/main/pocket/writes.ts:89-93` (ledger caps), `:239-278` (the three parses), `:382` (`keyOf`), `:403-417` (route guard and parse dispatch), `:457-472` (`still`, the last check, the act), `:483` (the one log line) | `parseKeysBody`; the caps; the verb |
| Confirm lines | `src/main/pocket/pairing.ts:324` (`sha256-pocket-exec-v3`), `:406-410` (`WRITE_CLAUSES`), `:440` (route line), `:445-446` (write line) | one clause |
| The contract | `src/shared/ipc/pocket.ts:47-68` (header: "nothing reaches a session on another machine", false after this phase), `:90-121`, `:656-669` (`PocketWriteReason`), `:703-707`, `:1025-1027` (`POCKET_DOOR_HONESTY`) | |
| The wiring | `src/main/capabilities.ts:376-405` (`createReplyVerbs`, `createPocketWrites`, `createPocketFacts`) | the screen watch and keys built beside the reply |
| End's one implementation | `src/main/sessions/pocket-writes.ts:163-213` | gains a `keys` pass-through |
| The shared control client | `src/main/tmux/control-client.ts:431-444` (`handleLine`: inside a block ANY `%end`/`%error` closes it), `:482-497` (`closeBlock`), `:590-599` (`quoteTmuxArg`: `$`, `%`, `@`, `=` unquoted); `src/main/tmux/control-parser.ts:86` (`GUARD_RE` reads the number) | D8 |
| Who reads screens through it | `src/main/sessions/core.ts:1239` (the monitor's `run` is `runScrollCommand`), `:2721-2737`; `src/main/activity/monitor.ts:1322-1348` (`captureScreens`, pipelined with `Promise.all`) | today's exposure to D8's class |
| The reply | `src/main/reply/reader.ts:172-177` (`readBackWindowOf`), `:198-200` (`replyMarkOf`); `writer.ts:238-250` (the press's two control lines); `question-id.ts:126-156` (`current`, `hook`, `bump`); `input-row.ts:71-221` (its SGR reader) | read and reused; `input-row.ts` reads through D11's reader |
| The status funnel | `src/main/activity/monitor.ts:535-541` (`noteUserInput`) | called, not changed |
| The remote read precedent | `src/main/machines/remote-pane-history.ts:171-193` (`remoteScrollAddress` live, `readyRemoteContext`, `execOn`); `exec-plane.ts:270-305` (`display-message` and `capture-pane`, safe reads) | NEW `remote-screen.ts` in its shape |
| The carriage | `src/main/machines/scroll-shapes.ts:86-93` (seven ids), `:155` (256 bytes a command), `:167-229` (the table), `:300-332` (`admitScrollArgv`), `:347-356` (`typedSequence`); `scroll-order.ts:812-859` (`writeTyped`), `:1095-1145` (`routeKey`); `control-plane.ts:839-860` (`remoteScrollRunner`) | the eighth row and `typePhoneKeys` |
| The Mac's terminal palette | `src/renderer/terminal/theme.ts:27-53` (dark), `:67-92` (light, never read by the phone) | spelled once more in main, held equal by a test |
| The phone's network file | `ios/Tortie/Door/DoorClient.swift:36-41` (one request per connection), `:163-174` (`DoorLimits`, 2 MiB, 15 s), `:351-425` (`signedGet`, `signedPost`), `:449-483` (`connect`), `:733-786` (`DoorHTTP.request`, `Connection: close` at `:782`), `:960-1110` (`DoorExchange`) | `DoorLine` added |
| The phone's seams | `ios/Tortie/Screens/DoorWords.swift:57-73` (`DoorReading`), `:91-105` (`DoorWriting`); `ios/Tortie/App/TortieApp.swift:104-113` (`Route`), `:158-161` (the runner registries), `:330-339` (`wentAway`), `:622-645` (`destination`), `:653-687` (`SessionRoute`), `:717-770` (`PairedReader`) | |
| The Session screen | `ios/Tortie/Screens/SessionScreen.swift:151-246` (the view; the bottom inset `:230-238`), `:331-349` (the Conversation row) | |
| End | `ios/Tortie/Screens/EndBar.swift:282-361` (the bar), `:206-276` (`EndModel`, unchanged) | |
| Words, colours | `ios/Tortie/Style/Copy.swift:231-235` (`terminalStaysOnMac`); `ios/Tortie/Style/Tokens.swift:38-98` (19 names, 15 hexes) | |
| Orientation | `ios/Tortie/Info.plist:36-39` (portrait only); `ios/Tortie/App/AppDelegate.swift:17-24` | |
| Phone gates | `build/conformance-ios.mjs:870-895` (rule a), `:1091` (`PINNED_PLIST_KEYS`), `:1508-1540` (`ARITHMETIC_NAMED`), `:1558-1564` (`ARITHMETIC_SCOPES`), `:2960` (`PHONE_BUILD = '6'`), `:4652` (`OWNER_CHECK_ABSENT`); rule letters taken (a) to (ag) | 337 takes (ah) to (an) |
| Door gates | `build/conformance-pocket.mjs:222` (X3 pins 512 and 4,096), `:233` (Y1), `:882` (`ROUTE_PIN`); rule ids A to Y taken | 337 takes Z1 to Z19 |
| Machine gates | `build/conformance-machines.mjs:11640-11700` (condition 102: exactly SEVEN rows); conditions run to 121 | 337 widens 102, 103 and adds 122 to 124 |
| Floors | `HELPER_USER_FLOOR = 166` (`build/assert-electron-teardown.mjs:431`); `SIMULATOR_USER_FLOOR = 2` | 167 for `probe:p337` |
| See a Sample | not built: Phase 333.3 is queued (`docs/BACKLOG.md:37736`) | D39 |
| Store text | `docs/research/136-the-phone-in-peoples-hands.md:555` ("It never shows or streams a terminal screen") and `:608` ("It shows records of the conversation and never a terminal") | false after this phase; §11 |

---

## 3. Where the entry, the research and his rulings are reconciled

| # | The entry or research says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "`capture-pane -p -e` and the cursor, size and alternate-screen state in one control-client command block" | a `;` list over the control client desyncs its queue (`core.ts:2721-2727`), and tmux writes captured rows raw inside the block (§14 M2) | three one-command lines in one tick (D5), and the client matches its own guards (D8) |
| 2 | "remote sessions through the exec plane's `capture-pane`" | right; the carriage has no capture row, and his ruling 3 grants a named-KEY row only | the exec plane, one `;` list per exec (both verbs are ledger reads), 9 to 10 ms p50 on loopback (D6, §14 M9); a capture row on the carriage is NOT in this phase |
| 3 | "answers when the screen changes or about 10 s passes" | measured on the shipping listener: 10 s answered, 16 s cut by the door's 404 (§14 M10) | `SCREEN_HOLD_MS = 10,000`, ticks of 100 ms and 400 ms, and the hold ends on `closing()` (D3) |
| 4 | "a key carrying the question id he was looking at is refused if a numbered question has appeared since" | the question id moves on the phone's own key, so on its own it would refuse a second arrow in a picker, and after a Return the poll hands back the new id before the next question is drawn (D22) | the id AND the window's hash, compared only while a question is drawn (D16, D21); the phone sends one batch per picture inside a question (D29) |
| 5 | "R4's pin and the contract baseline move on purpose" | R4 moves (`16115392…`); the baseline names IPC channels, env names, columns, storage keys and smoke modes, and this phase adds none | the baseline does NOT move (D36) |
| 6 | "Allow is asked again once with a clause for the write (`pairing.ts:342, 406, 445`)" | right; `:342` is now the empty fields' `routes` (`pairing.ts:338-347`) | one clause, `keys` (D35) |
| 7 | "Terminal colours: the spec rules how 256- and 24-bit colours meet rule (a)'s tokens" | rule (a) refuses colour LITERALS outside `Tokens.swift`; the captures hold no basic colour code at all | resolved on the Mac; one constructor in `Tokens.swift` for the door's colours; the phone's own colours tokens (D12) |
| 8 | Research 139: "each row one SwiftUI `Text` from an `AttributedString`" | a `Text` lays a wide character out at its font fallback's advance, not two cells, so a row with one drifts; 316.6 measured 38 to 49 KB a `Text` | a `Canvas` per row, each run in its own box (D26); Paseo's own fix for the same drift is the fixed-width run box (`terminal-grid-view.native.tsx:102-130`) |
| 9 | Research 139: "Paseo ... parses on the phone" | his ruling 4: no emulator on the phone | Paseo's DRAWING is ported; its headless xterm is not (§5.8) |
| 10 | Research 139 §6.1: "the phone can remember which face was last used per session" | not his ruling; rule (aa) allows exactly three stored words | nothing remembered (D32); NOT in this phase |
| 11 | The entry: "See a Sample shows a canned Screen" | See a Sample does not exist yet (333.3) | the canned Screen is a committed fixture and 333.3 is sent it (D39, §11) |
| 12 | Research 139 Q4: narrow rule (z1) for a TextKit view | his rulings did not answer it | (z1) stands; SwiftUI `Canvas` and a gesture selection (D26, D34) |
| 13 | The entry: "`noteUserInput` like a keystroke at the desk" | the desk calls it on EVERY keystroke that is not a pane report | once per keys write that typed (D23) |
| 14 | The entry: "through 318's write path and ledger" | the ledger holds 512 per phone for 120 s; keys at 10 a second fill it in under a minute | caps 2,048 and 8,192, the phone paced at 0.1 s (D24, D30) |
| 15 | Research 139 §4.2: "464 basic, 283 256-colour and 38 24-bit colour codes" | re-derived with an SGR reader of this step's own: no basic colour code at all (no 30 to 37, 40 to 47, 90 to 97 or 100 to 107), 283 and 38 | §14 M7; the ruling of D12 rests on the re-derived counts |
| 16 | The task: "remote capture and key timing through the loopback machine" with the quiet shell | `build/scratch-machine.mjs` reads `~/.ssh/*.pub` and his agent's keys | measured through a loopback sshd of this step's own (§14 M9); D37 gives the shared machine an option that reads neither |
| 17 | The entry: "End's move to the top right moves into this phase" from 318.1 | 318.1 is held | End moves here (D33); 318.1's message box does not |

---

## 4. The base, and the replay

### 4.1 The base

`/private/tmp/wt-p337`'s `HEAD` is `aebb4ce9`, detached, with `node_modules` and `build/vendor` copied in. 337's work goes on
top, UNCOMMITTED, so `git diff aebb4ce9` plus the untracked files is exactly 337's delta. The integrator's first act is to
check that: `git rev-parse HEAD` reads `aebb4ce9…`, nothing is staged, and `git diff --stat aebb4ce9` names only files §10
assigns.

### 4.2 What moves under it

- **Phase 336.1 LANDED** as `47c3c79e` ("fix(machines): save in a project directly inside your home on another machine")
  and `b989a0ed` (its docs commit), both on origin/main after this worktree's `aebb4ce9`. It changed, besides its own files,
  `build/conformance-machines.mjs` (condition 116's far-depth clauses, about `:13093`), `build/machines-conformance-probe.mts`,
  `build/scratch-machine.mjs` (the quiet-shell comment, about `:198-206`) and `CHANGELOG.md`. 337 edits conditions 102 and 103
  (about `:11640-11700`) and appends 122 to 124, edits `scratch-machine.mjs` at the key reader (`:103-138`, `:373`), and leaves
  the probe driver alone unless 122 to 124 need its readings: disjoint regions. **337 lands second**: the committer replays
  337's delta onto `b989a0ed` by blocks and runs the full battery on the merged tree; a conflict or a red gate stops the replay
  and goes to the operator. `git diff aebb4ce9` stays the delta's definition until then.
- **Phase 318.1** is held. If it is restarted after this phase it builds on 337's Session screen (End is already in the top
  bar, and the message box sits alone in the bottom inset).
- **The landing cleans up after itself** (his rule of 2026-10-01): once the follow-up docs commit is pushed and no running
  process names the path, the worktree is removed (`git worktree remove --force`, `prune`), every parent or clone the
  verifiers made, `…/scratchpad/p337*` with every DerivedData, and the stale `p337*` socket files whose server is gone. Never
  a path another phase in flight uses, never under `/Users/gdc`. The landing report says the space freed, `df -k
  /private/tmp` before and after.

---

## 5. The design

### 5.1 The two rows on the door

`src/main/pocket/door/table.ts`, frozen with the rest, the header's write sentence widened to "exactly `end`, `choose`, `say`
and `keys`", and one paragraph each:

```ts
{ id: 'screen', method: 'GET', path: '/v1/screen', reads: true, windowOnly: false, signed: true },
{ id: 'keys', method: 'POST', path: '/v1/keys', reads: false, windowOnly: false, signed: true }
```

`door/limits.ts`: `POCKET_WRITE_BODY_CAPS = Object.freeze({ end: 512, choose: 512, say: 32_768, keys: 16_384 } as const)`,
the comment naming the keys worst case (7,359 bytes, §14 M15).

`door/wire.ts`: `DoorWriteRoute = Extract<PocketRouteId, 'end' | 'choose' | 'say' | 'keys'>`; `SIGNED_ROUTES` gains
`'screen'`; `WRITE_ROUTES` gains `'keys'`. Nothing else in `door/**` moves: the listener's cap lookup, query refusal on a
write, target rule, late-write cut, revoked-socket rule and keep-alive are generic.

`src/shared/ipc/pocket.ts`: `POCKET_ROUTE_IDS` gains `'screen'` and `'keys'` with one-line comments;
`POCKET_WRITE_ROUTE_IDS = ['end', 'choose', 'say', 'keys']`; the header's write paragraph gains `keys` and loses "nothing
reaches a session on another machine" (false: keys do, his ruling 3).

### 5.2 The contract — `src/shared/ipc/pocket.ts` (appended)

```ts
/** The 35 key names the phone may send, by tmux's own name (D17, D18). Frozen; the phone's enum mirrors it (rule ai). */
export const POCKET_SCREEN_KEY_NAMES = [
  'Escape', 'Tab', 'BTab', 'Enter', 'BSpace', 'Up', 'Down', 'Left', 'Right',
  'C-a', 'C-b', 'C-c', 'C-d', 'C-e', 'C-f', 'C-g', 'C-h', 'C-i', 'C-j', 'C-k', 'C-l', 'C-m',
  'C-n', 'C-o', 'C-p', 'C-q', 'C-r', 'C-s', 'C-t', 'C-u', 'C-v', 'C-w', 'C-x', 'C-y', 'C-z'
] as const;
export type PocketScreenKeyName = (typeof POCKET_SCREEN_KEY_NAMES)[number];

export const POCKET_SCREEN_MAX_COLS = 512;
export const POCKET_SCREEN_MAX_ROWS = 200;
export const POCKET_SCREEN_MAX_STYLES = 1_024;
export const POCKET_SCREEN_MAX_RUNS = 16_384;
export const POCKET_SCREEN_MAX_BYTES = 1_048_576;
export const POCKET_KEYS_MAX_ITEMS = 64;
export const POCKET_KEYS_MAX_TEXT_BYTES = 1_024;

/** One style: colours already resolved on the Mac to `#rrggbb` (D12). */
export interface PocketScreenStyle {
  fg: string;            // '#rrggbb'
  bg: string | null;     // '#rrggbb', or null for the ground
  bold: boolean; dim: boolean; italic: boolean; underline: boolean; strike: boolean;
}
/** One run: text of one style, and the columns it covers. */
export interface PocketScreenRun { text: string; style: number; cells: number }
export interface PocketScreen {
  cols: number; rows: number;
  cursor: { x: number; y: number; visible: boolean };
  alternate: boolean;
  /** The Mac's own terminal colours: its ground, its default ink and its cursor. */
  ground: string; ink: string; caret: string;
  styles: PocketScreenStyle[];
  /** Exactly `rows` rows; a row with nothing on it is []. */
  lines: PocketScreenRun[][];
  /** The question id now, echoed by a keys write. */
  turn: string;
  /** A numbered question is drawn, or the session waits on him. */
  asking: boolean;
  /** The window's mark while asking (12 hex), echoed by a keys write; null otherwise. */
  dialog: string | null;
  /** Keys are taken now: live, not unknown, and on another machine a live connection. */
  typable: boolean;
}
export type PocketScreenAbsence = 'ended' | 'unreachable' | 'large';
export interface PocketScreenAnswer {
  sessionId: string;
  revision: string;             // 12 lowercase hex
  at: number;
  unchanged: boolean;           // true: `since` was current; nothing else is carried
  screen: PocketScreen | null;  // null exactly when `unchanged` or `why`
  why: PocketScreenAbsence | null;
  sentence: string | null;      // main's words for `why`, null otherwise
}
export type PocketKeyItem = { t: string } | { k: PocketScreenKeyName };
```

`PocketSessionDetail` gains `screen?: boolean`, OPTIONAL for 317's reason (hand-built literals in files no builder owns);
absent reads false on both sides; the door's one composer always sets it. `PocketWriteReason` gains nothing: the keys verb
answers `gone`, `changed`, `unreachable`, `character`, `stopped` and `malformed`, every one already a word.
`POCKET_DOOR_HONESTY` per D35.

### 5.3 Main's side of the read

#### 5.3.1 The route — `src/main/pocket/routes.ts`

`PocketFacts` gains ONE optional read member, beside `replyOffer?`:

```ts
/**
 * One session's screen, composed in main (Phase 337, build/p337/SPEC.md §5.3): answered at once when `since` is null or
 * not current, else held until the screen moves or SCREEN_HOLD_MS passes, ending at once when `closing()` holds. A READ:
 * it writes nothing, sets no status and types nothing. OPTIONAL, AND ABSENT IS THE ROUTE NOT EXISTING (404): the push seam
 * and the tests build their own facts.
 */
screen?(session: Session, since: string | null, closing: () => boolean): Promise<PocketScreenAnswer>;
```

`createPocketRoutes(facts)` gains `screen(query: URLSearchParams, closing)`: read `id` and `since` (exactly those keys, each at
most once, `since` absent or 12 lowercase hex, `id` by `isSessionsId`'s rule), else null; the session by id (unknown, null);
`facts.screen` absent, null; else `await facts.screen(session, since, closing)`, its answer re-composed FIELD BY FIELD
(`screenOf`), so nothing else can leave. A rejection is null. `session()` sets `screen: facts.screen !== undefined &&
SCREEN_LIVE.includes(session.status)` where `SCREEN_LIVE = ['running', 'idle', 'needs_input']`.

`src/main/pocket/server.ts:99` becomes `answer(route, query, closing: () => boolean)`, and `:197` passes `closing`, the very
`closing()` refusal 1 builds (`deps.shuttingDown() || door.stopping()`). `src/main/pocket/ipc.ts:518`: `case 'screen':
return routes.screen(query, closing);` and `case 'keys':` joins the writes' `return null`. `src/main/pocket/facts.ts`
passes `screen` through as it passes `replyOffer`.

#### 5.3.2 The watcher — NEW `src/main/screen/watch.ts`

```ts
export interface ScreenWatchDeps {
  core(): ScreenCore | null;            // listSessions, tmuxIdOf, control, manifest (structural; GmuxCore satisfies it)
  turns: QuestionIds;                   // replyTurns
  readLocal?: (core: ScreenCore, tmuxId: string) => Promise<ScreenReading | null>;   // tests inject
  readRemote?: (sessionId: string) => Promise<ScreenReading | 'unreachable'>;        // tests inject
  now?(): number; sleep?(ms: number): Promise<void>;
}
export interface ScreenWatch {
  answer(session: Session, since: string | null, closing: () => boolean): Promise<PocketScreenAnswer>;
  /**
   * A keys write just reached this session: read it 30 ms from now, and answer its waiting polls at the first read
   * whose window mark is not `before` (the keys verb's own fresh read's), or at the first read starting
   * SCREEN_SETTLE_MS or more after now (D4).
   */
  nudge(sessionId: string, before: string): void;
  /** For the keys verb's final check: one fresh reading, never cached. */
  readFresh(session: Session): Promise<ScreenReading | 'unreachable' | null>;
}
export const SCREEN_TICK_MS = 100;
export const SCREEN_TICK_REMOTE_MS = 400;
export const SCREEN_HOLD_MS = 10_000;
export const SCREEN_NUDGE_MS = 30;
export const SCREEN_SETTLE_MS = 300;
export const SCREEN_MIN_ANSWER_GAP_MS = 250;
export const SCREEN_LOCAL_READ_DEADLINE_MS = 1_000;
export const SCREEN_REMOTE_READ_DEADLINE_MS = 2_000;
export function createScreenWatch(deps: ScreenWatchDeps): ScreenWatch;
```

`ScreenCore` is structural, as 318's `ReplyCore` is (`src/main/reply/writer.ts:87-108`): `listSessions()`, `tmuxIdOf(id)`,
`manifest.getSession(id)`, `control` (`connected`, `sendCommand`) and `activity.noteUserInput(id)`; `GmuxCore` satisfies it as
it stands, so no new export is needed.

- **One entry per session with a poll waiting**: its last reading, its revision, its composed screen (composed only when the
  revision moved), the time of its last read and its last compose's cost, and the polls waiting on it. An entry with no poll
  waiting is dropped at once: nothing is read for a session nobody is looking at.
- **A read** (`read.ts`, §5.3.3) at most once per tick per session, never before `lastRead + max(tick, 4 × lastComposeMs)`
  (D15), and **never while another read of that session is in flight**. A **nudge** sets the session's next read to
  `SCREEN_NUDGE_MS` after it and allows none before, and marks the SESSION settling with the nudge's `before` and its time
  (D4): while it settles, NO poll of that session is answered, held or stale (a poll arriving with the revision from before
  the act is stale only because the turn moved), until the first read whose window mark differs from `before`, or the first
  read starting `SCREEN_SETTLE_MS` or more after the nudge; `closing()` and the hold's end still answer at once. Every read races its
  deadline; one past it counts as not read, the entry keeps its last reading, and the slot stays taken until it settles.
- **The hold** is each poll's OWN timer, `SCREEN_TICK_MS` (100 ms) on this Mac and on another machine alike, and it never
  awaits a read (D3): each of its ticks asks `closing()`, the hold's end and whether the session's latest reading answers it;
  `closing()` true answers what was last read at once. So the answer leaves by `SCREEN_HOLD_MS + SCREEN_TICK_MS` at the
  latest, under the door's 15 s, and a poll under a shutdown answers within one tick even while a remote read hangs. A vitest
  holds both with a read that never settles.
- **The answer**: an `ended` row (status not in `SCREEN_LIVE`) answers `why: 'ended'` with `SCREEN_ENDED` at once; a remote
  row whose read answers `unreachable` answers `why: 'unreachable'` with `SCREEN_UNREACHABLE`; a composed screen over a cap
  answers `why: 'large'` with `SCREEN_TOO_LARGE`; a live row with no reading at all by the hold's end answers `why:
  'unreachable'`; otherwise the screen. The revision covers all of it (D14).
- **A floor between answers**: a HELD poll (its `since` current) is answered no sooner than `SCREEN_MIN_ANSWER_GAP_MS` (250)
  after it arrived, so a screen that changes every tick (a spinner) is answered about four times a second to each phone, not
  ten (D40); a poll whose `since` is stale is answered at once whatever any other phone was answered (§Attack A13). The one
  exception is the answer that ends a settling (a key's), which goes at once, so a typed key's echo is never held for the floor.
- It logs nothing, reads no error's `.message`, and holds nothing on disk.

#### 5.3.3 One read — NEW `src/main/screen/read.ts`

```ts
export const SCREEN_FORMAT = '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}';
export interface ScreenDisplay { paneId: string; cols: number; rows: number; cursorX: number; cursorY: number; cursorVisible: boolean; alternate: boolean }
export interface ScreenReading { styled: string; display: ScreenDisplay; displayLine: string }
export async function readScreenLocal(core: ScreenCore, tmuxId: string): Promise<ScreenReading | null>;
export function parseScreenDisplay(line: string): ScreenDisplay | null;   // seven fields, each whole and bounded
```

Locally: the three lines of D5, each aimed at the session's `$`-id (`core.tmuxIdOf(id)`), written in one statement over
`core.control` when `core.control.connected`, or, when not, ONE spawned `execTmux` of the three as a `;` list, split by
count (the first display's `rows`), with the session's tick at `SCREEN_TICK_REMOTE_MS` while the client is down (D5). Two displays that disagree on the pane,
`cols`, `rows` or `alternate`: once more; then the second's. Null on any failure, which the watcher answers as `ended` when
the row says so and otherwise re-reads at the next tick.

On another machine — NEW `src/main/machines/remote-screen.ts`, in `remote-pane-history.ts`'s shape:
`remoteScrollAddress(sessionId)` must be `live` (else `'unreachable'`), `readyRemoteContext(machineId)`, then ONE
`execOn(ctx, ['capture-pane', '-p', '-e', '-t', $N, ';', 'display-message', '-p', '-t', $N, SCREEN_FORMAT], { timeoutMs:
SCREEN_REMOTE_READ_DEADLINE_MS })`: the last line is the display, the rest the capture. Both verbs are
ledger reads (`exec-plane.ts:270-305`), the format is the one constant, no caller string reaches the argv. A failure is
`'unreachable'`. MEASURED: 8.97 and 10.33 ms p50 per exec on the loopback machine (§14 M9). The remote tick is 400 ms.

#### 5.3.4 The composer — NEW `src/main/screen/{sgr,cells,cell-widths,palette,compose}.ts` (pure)

- `sgr.ts` — `readStyledRows(styled: string): StyledRow[]`, each row `{ cells: { ch: string; pen: Pen }[], readable }`, the
  pen `{ fg: Colour | null; bg: Colour | null; bold; dim; italic; underline; blink; inverse; hidden; strike; overline }` with
  `Colour = { kind: 'basic'; n: 0..15 } | { kind: 'index'; n: 0..255 } | { kind: 'rgb'; r; g; b }` (SGR 30 to 37 and 90 to 97
  are `basic`, `38;5;n` is `index`, so `input-row.ts`'s grey test keeps its two spellings apart). An OSC is skipped to its
  terminator; any other escape, an SGR parameter list it cannot follow, or a C0/C1 cell marks the row unreadable. It is the
  ONE reader of tmux's styles in main.
- `input-row.ts` (318's) reads its rows through `readStyledRows` with a projection: `dim = pen.dim`, `grey = fg is basic 8 ||
  fg is index 240..250`, `inverse = pen.inverse`, `readable` as before. Its tests run unedited and must read what they read at
  `aebb4ce9`; the screen builder adds a parity test over every committed `.ansi` (§7.2).
- `cell-widths.ts` — `cellWidthOf(cp: number): 0 | 1 | 2` over a frozen array of `[start, end, width]` ranges GENERATED from
  `build/fixtures/screen/tmux-widths.json`'s 3.7b table (925 ranges), with a header naming the generator
  (`node build/p337/measure-screen.mjs --widths`); outside the scanned span, 1.
- `cells.ts` — `cellsOf(text: string): { text: string; w: 1 | 2 }[]` with the seven measured sequence rules (D10).
- `palette.ts` — `SCREEN_PALETTE = { ground: '#131417', ink: '#d8dbe2', caret: '#e8eaed', ansi: [16 values] }` and
  `xterm256(n)`; a vitest reads `src/renderer/terminal/theme.ts` AS TEXT and holds the 16, `TERMINAL_FOREGROUND` and
  `cursor` equal, case-folded.
- `compose.ts` — `composeScreen(reading: ScreenReading, extra: { turn: string; status: SessionStatus; typable: boolean }):
  ComposedScreen | 'large'`: rows from `readStyledRows`, cells from `cellsOf`, styles resolved per D12 into a deduplicated
  table, runs (a run holds width-1 cells of one style, or one cell of another width), trailing cells that are a blank in a
  null ground with no underline, strike or overline dropped, `asking` and `dialog` per D16 over the plain text
  (`normalizeCapture` of the rows' text), and the caps of D15. A row the reader marks unreadable is drawn as its text in the
  default style. It reads no clock, no file and no process. It exports `windowMarkOf(plain)` =
  `hashScreen(readBackWindowOf(plain))`, the ONE spelling of the window's mark, which the answer's `dialog` (while asking),
  the keys verb's check (D21) and the nudge's `before` (D4) all call. For it, `compose.ts` imports `readBackWindowOf` from
  `src/main/reply/reader.ts` and `normalizeCapture`, `detectDialogRows` and `hashScreen` from `src/main/activity/screen.ts`,
  and nothing else outside `src/main/screen` and `src/shared` (Z12 reads its direct imports; `reader.ts` reaches the monitor
  by import and runs nothing at import time, as 318's own tests load it).

### 5.4 The keys verb — NEW `src/main/screen/keys.ts`

`PocketKeysInput` lives in `src/main/pocket/routes.ts` beside 318's `PocketSayInput` (the door builder's), and
`PocketWrites` gains `keys(input: PocketKeysInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>`; this module
imports both types.

```ts
// src/main/pocket/routes.ts (door): export interface PocketKeysInput { sessionId: string; keys: readonly PocketKeyItem[]; turn: string; dialog: string | null }
export interface ScreenKeysDeps {
  core(): ScreenCore | null;
  turns: QuestionIds;
  watch: Pick<ScreenWatch, 'readFresh' | 'nudge'>;
  noteUserInput(sessionId: string): void;         // core.activity.noteUserInput
  typeRemote?: (sessionId: string, keys: readonly PocketKeyItem[]) => 'carriage' | 'unreachable';   // scroll-order.ts's typePhoneKeys
  run?: (args: readonly string[]) => Promise<string>;   // the spawned fallback; tests inject
  onLastCheck?: (sessionId: string) => void;     // measure:p337 only
}
export function createScreenKeys(deps: ScreenKeysDeps): {
  keys(input: PocketKeysInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
};
```

In this order, named in the code:

1. **The text rule**: every text item's characters through 318's `textRefusal` (`src/main/reply/text-rules.ts`) with LF
   refused too (a newline is `Enter`), and the total at most `POCKET_KEYS_MAX_TEXT_BYTES`; a refusal is `refused character`
   with `SCREEN_KEY_CHARACTER`, nothing read.
2. **The gate**: the row by id (none: `gone`, `SESSION_NOT_FOUND` or `LIFECYCLE_SESSION_CHANGED` as 318 says them); status
   `unknown`, `exited`, `restorable` or `discarded`: `refused unreachable` with `SCREEN_NOT_TYPABLE`; local with no `$`-id:
   the same.
2a. **The gap** (D42): `SCREEN_KEYS_GAP_MS = 50`, declared here; when the session's previous keys act was less than 50 ms
   ago, await the remainder. Nothing after this await is read from before it.
3. **One fresh read**, its capture last (`watch.readFresh`), awaited; a remote `unreachable` read refuses as step 2.
4. **The final check, synchronous** (no `await` from here to the act): `still()` (false: `stopped`,
   `POCKET_WRITE_SENTENCES.stopped`); the row re-read by id still live and on the same machine; local, `core.tmuxIdOf(id)`
   the `$`-id step 2 read; then asking over the fresh read (D16): (asking or `input.dialog !== null`) and (`input.turn !==
   turns.current(id).id` or `input.dialog !== dialog`) refuses `changed` with `SCREEN_QUESTION_MOVED`.
5. **`turns.bump(id, 'phone')`, `onLastCheck?.(id)`, then the act in the very next statement**: locally, the lines of D19
   aimed at the reading's `%pane` (`copy-mode -q -t P`, then per item `send-keys -t P -H <hex…>` in chunks of 256 bytes or
   `send-keys -t P <Name>`), every line written in that one statement through `core.control.sendCommand`, each one command,
   collected with `Promise.allSettled`; when the client is down, one spawned list `copy-mode -q -t P ; send-keys -t P … ;
   …` (no element of it is text: hex bytes and names only). On another machine, `typeRemote(id, keys)`; `unreachable` answers
   `refused unreachable` (the carriage went away between the check and the act; nothing was written, D20).
6. **The outcome**: every `send-keys` line fulfilled, `done`; any rejected, `failed` with `REPLY_FAILED` (some keys may have
   reached the session; the sentence does not claim otherwise).
7. `noteUserInput(id)` when the act wrote anything (D23), then `watch.nudge(id, windowMarkOf(fresh plain))`, and the session's
   last-act time for step 2a.

**The sentences** — NEW `src/shared/screen-copy.ts`, importing nothing, each constant one line with its reason above it;
none names a tmux word (a vitest holds it):

```ts
/** Keys sent while a question is drawn, against a screen whose question id or window has moved since (D21). */
export const SCREEN_QUESTION_MOVED = 'The question on this session changed since your screen was drawn. Nothing was typed.';
/** Not running, unknown, or on a machine with no live connection now. */
export const SCREEN_NOT_TYPABLE = 'This session cannot take keys now. Nothing was typed.';
/** A text item holding a control character, DEL or a lone surrogate. */
export const SCREEN_KEY_CHARACTER = 'That holds a character Tortie does not send. Nothing was typed.';
/** `why: 'ended'`. */
export const SCREEN_ENDED = 'This session is not running, so it has no screen.';
/** `why: 'unreachable'`. */
export const SCREEN_UNREACHABLE = 'Tortie cannot reach this session’s machine now.';
/** `why: 'large'`. */
export const SCREEN_TOO_LARGE = 'This screen is too large to show on your phone.';
```

A keys act that fails says 318's `REPLY_FAILED` (`Tortie could not type into this session.`), which is true whether or not
some keys landed.

Nothing in `src/main/screen` logs, reads an error's `.message`, derives an argv element from text except its hex bytes, or
names a status setter but `noteUserInput`. `src/main/sessions/pocket-writes.ts` gains `keys: (input, still) =>
deps.keys.keys(input, still)`; `src/main/capabilities.ts` builds `createScreenWatch({ core: () => pocketCore, turns:
replyTurns })` and `createScreenKeys({ core: () => pocketCore, turns: replyTurns, watch, noteUserInput: (id) =>
pocketCore?.activity.noteUserInput(id), typeRemote: typePhoneKeys })` once, beside the reply's verbs, and hands `screen` to
`createPocketFacts` and `keys` to `createPocketWrites`, each as an arrow.

### 5.5 The one write path, widened — `src/main/pocket/writes.ts`

- `KEYS_KEYS = 'dialog,keys,session,turn,write'`; `parseKeysBody(body)`: the object through the one `objectOf`, its keys
  exactly that set; `write` and `session` as end's; `turn` by `isQuestionId`; `dialog` null or `isMark`; `keys` an array of
  1 to `POCKET_KEYS_MAX_ITEMS` plain objects each with exactly one own key, `t` (a non-empty string) or `k` (a member of
  `POCKET_SCREEN_KEY_NAMES`, compared with `===`), and **a `k` other than `BSpace` only when it is the array's one item**
  (D17); else `{ ok: false, write }`. Nothing is trimmed or normalised.
- Step 7's one log call is conditional for one case (D43): a `keys` write whose outcome is `done` is logged only when the
  session's previous logged `done` keys write is `KEYS_LOG_QUIET_MS` (60,000) or more ago; a map of session id to that time,
  bounded by the ledger's own pruning. Every other outcome of every verb is logged as today.
- Step 1's dispatch reads the verb; step 5 calls `replySettled(() => writes.keys({ sessionId, keys, turn, dialog }, still))`.
- `POCKET_WRITE_LEDGER_PER_PHONE = 2_048`, `POCKET_WRITE_LEDGER_MAX = 8_192`, the comment naming D24's arithmetic.
- Step 7's one log line's words are unchanged: `the phone's keys: <outcome>` with `{ session }`, under D43's condition. Never
  a key, a text, the turn or the dialog.

### 5.6 The carriage, widened — `src/main/machines/scroll-shapes.ts`, `scroll-order.ts`

- `ScrollShapeId` gains `'type-key'`; `SCROLL_SHAPES` gains, LAST, `{ id: 'type-key', argv: [word('send-keys'), word('-t'),
  TARGET, { kind: 'one-of', words: POCKET_SCREEN_KEY_NAMES }], idempotent: false, repeat: 'NOT idempotent: it TYPES a key,
  and a repeat types it twice. It is never retried; a key whose answer was lost is left as it is.' }`. Four elements, so it
  cannot be read as any other `send-keys` row (`scroll-lines` 7, `goto-line` 6, `top-line` and `cancel` 5, `type-bytes` 5 to
  260). The header's "THE SEVENTH ROW" paragraph gains "THE EIGHTH ROW, `type-key`, ON HIS WORD OF 2026-10-05 ("Every key,
  including Ctrl-C")".
- NEW `namedKeySequence(target: string, name: PocketScreenKeyName): string[][]` → `[['send-keys', '-t', target, '-X',
  'cancel'], ['send-keys', '-t', target, name]]`, every argv one the table admits.
- NEW in `scroll-order.ts`, `typePhoneKeys(sessionId, keys): 'carriage' | 'unreachable'`: `source.address` live and
  `source.carriage` live, else `'unreachable'` with nothing written; then, in one tick and no await, ONE `cancel`, each item's
  commands (`typedSequence`'s `-H` chunks without its leading cancel, or `namedKeySequence`'s second argv), and the road's read,
  through `stampedRunner` and `noteWritten`, settled like `writeTyped` (`:812-859`); never `hold`. It is the one production
  caller of `namedKeySequence` and of the `type-key` row.

### 5.7 The shared control client — `src/main/tmux/control-client.ts`

`blockLines` becomes `block: { lines: string[]; number: number; time: number } | null`. On `begin`, the block remembers the
guard's `commandNumber` and `timestamp` (`control-parser.ts:86` already reads them). Inside a block, an `end` or
`command-error` event closes it ONLY when its `commandNumber` and `timestamp` equal the block's; any other line, guard-shaped
or not, is pushed as body. Nothing else in the class moves: the greeting, the outbox, the own slot, the deadline and the
reconnect are byte for byte. A vitest drives a scripted control stream through the class's transport seam: two forged guard
rows inside a capture's block, four commands pipelined, each answer its own; and the parent's behaviour is the arm the
proof's parent measurement reads (§7.9).

### 5.8 The phone — `ios/`

Every drawn word is `Copy.swift`'s or the door's. No `print(`, no log, no package, no web view, no `NSAttributedString`, no
`URLSession`, no `LocalAuthentication` outside `App/OwnerCheck.swift`.

#### 5.8.1 Paseo's design, ported — what is taken from which file, and what is not

**The frameworks, and why each.** SwiftUI `Canvas` draws the rows: one immediate-mode drawing per row, so a screen costs about
forty views rather than a view per run (316.6 measured 38 to 49 KB a `Text`), and every run is placed at its own column, which
a `Text` of the whole row cannot do for a wide cell. UIKit's `UITextView` is the hidden keyboard field, because it is the one
Apple text input that gives IME composition, dictation and `markedTextRange` without a web view or `UITextInput` written by
hand. CoreText reads the font's own advance for the cell. `UIPasteboard` is written for Copy. Network.framework stays in its one
file. No package, no web view, no JavaScript and no attributed string (rules f, g and z1).


| Paseo file (`2f0cb2f`, Apache-2.0) | What is taken | Swift home | What is NOT taken, and why |
| --- | --- | --- | --- |
| `terminal-row-model.ts:49-71, 99-146, 182-243` | rows as runs of identical style; a run's `cellCount`; the row hash that lets an unchanged row skip its redraw | `ScreenRows.swift` (`ScreenRowModel: Equatable, Hashable`) | the runs are built on the Mac (D9), so the phone does not build them from cells; its `WIDE_CHAR_RANGES` guess (`:8-19`) is replaced by tmux's own widths, sent as each run's `cells` |
| `terminal-grid-view.native.tsx:39-42, 80-100, 102-130, 232-293, 359-374` | a MEASURED cell metric snapped to the pixel (Paseo measures a probe string; the phone reads the font's own advance); only visible rows; each run in a box exactly `cells × cellWidth` wide that clips its text; the cursor as a block at 0.45 opacity; a row's accessibility label as its text | `ScreenGrid.swift` (a `Canvas` per row in a `LazyVStack`) | its column clipping (`resolveVisibleCols`, `:91-100`): the phone pans instead of clipping; React views per run: one `Canvas` per row draws them |
| `terminal-custom-glyph.ts:21-119` | the DESIGN: box drawing and block elements drawn as strokes and rectangles in cell units, not as font glyphs | `ScreenGlyphs.swift` | **its table**: it holds 55 code points and lacks nine agents draw (`╌` 1,676 times in the captures, `═ ║ ╔ ╗ ╚ ╝`, `░ ▓`), and a transcribed table is a derivative that would carry Apache-2.0's notice duties into the shipped app; Tortie derives every shape of U+2500 to U+259F from the code point's Unicode name (§5.8.4) |
| `terminal-grid-metrics.ts:30-68` | the cell metric from a measured width over a probe length; the cursor offset | `ScreenGrid.swift` | |
| `colors.ts:27-113, 145-152` | the 256 cube levels and the greys; inverse swapping foreground and ground | the Mac's `palette.ts` and `compose.ts` (D12) | resolving on the phone: the Mac resolves; dim's 0.65 opacity (`:182-184`) is replaced by xterm's 0.5, which the Mac's own terminal draws |
| `terminal-selection-gesture.ts:38-108` | tap tolerance 8 px, long press 450 ms, vertical scroll threshold 12 px; the press, pending, select and scroll intents; the release actions | `ScreenSelection.swift` | the scroll intent drives the scroll view, not a terminal's scrollback |
| `terminal-selection.ts` (normalise, `TERMINAL_WORD_SEPARATORS`, the hit test, the rects, the selected text) | the selection model | `ScreenSelection.swift` | its coordinate epoch: the Screen holds its picture while selecting (D34) |
| `terminal-input.native.tsx:46-183, 308-333` | the hidden input; autocorrect, spell check and capitalisation off; no ASCII-capable keyboard (keeps the globe key); the append, Backspace, Enter and CJK composition rules; a change holding a line break swallowed whole (`:148-152`); swallowing other replacements until a reset | `ScreenKeyField.swift` (`ScreenTextView: UITextView`) | its guess at composition from the committed script: UIKit tells the phone `markedTextRange`, so nothing is sent while it is set |
| `terminal-key-events.ts:1-40` | arrows as named keys | the key bar's buttons | |
| `terminal-resize-policy.ts:1-119` | the split between measuring the local viewport and claiming the remote size | `ScreenGrid.swift` keeps the measure | **the claim, whole**: the phone never sizes the Mac (his ruling 2) |
| `docs/terminal-performance.md:26, 31` | whole snapshots only on change; "terminal size has one claimant" | the Mac's revision (D14) | its headless xterm on the device: his ruling 4. Its `:22` is OUTPUT coalescing and is not the design of the key sender: Paseo sends input as typed, and Tortie's sender gathers keys only under D17's rule |

Each Swift file whose design is taken says so in its header, naming the Paseo file and commit, that the design is taken
from Paseo (Apache-2.0, the Paseo authors), and that no Paseo code is copied.

#### 5.8.2 The client — `Door/DoorClient.swift`, `Door/Contract.swift`

- NEW `final class DoorLine` in `DoorClient.swift` (rule c: the one network file): one `NWConnection` made by the same
  `DoorClient.parameters(...)` (TLS 1.3, the name as SNI, the pin, the identity), used for ONE exchange at a time; its
  request carries `Connection: keep-alive`; the same bounded `DoorResponseReader` reads each answer; it is reused only while
  it has been idle less than `DoorLine.freshFor = 4` seconds and its last exchange ended with a whole answer; a read whose
  reused line ended before an answer is asked once more on a new line; a write is sent only on a line idle under `freshFor`
  and never again. `close()` cancels the connection. The exchange's 15 s timeout covers one request on it. **A line idle
  `freshFor` closes itself** (a timer, not the next use), an answer carrying `Connection: close` closes it, and **any byte
  read past an answer's `Content-Length` closes it** and is never read as the next answer (a kept line must not desync,
  §Attack A12). Cancelling the Swift task that waits on an exchange closes that exchange's line.
- `DoorClient.screen(_ sessionId: String, since: String?, line: DoorLine, door: PairedDoor) async throws ->
  PocketScreenAnswer`: target `"/v1/screen?id=\(queryValue(id))"` plus `"&since=\(since)"` when non-nil, signed as every read.
- `DoorClient.keys(_ sessionId: String, keys: [KeyItem], turn: String, dialog: String?, line: DoorLine, door: PairedDoor)
  async -> WriteResult`: `WriteRoute.keys(...)`, target `/v1/keys`, body `KeysBody { dialog, keys, session, turn, write }`
  with sorted keys, through `signedPost` (now taking an optional line), a fresh write id, never a kept one.
- `Contract.swift`: `PocketScreenAnswer` decoded strictly: `revision` 12 lowercase hex; `unchanged` true exactly when
  `screen` and `why` are null; `cols` 1…512, `rows` 1…200, `cursor.x` 0…cols, `cursor.y` 0..<rows, every `style` index
  0..<styles.count, every run's `cells` 1…cols and the cells of a row summing to at most `cols`, `lines.count == rows`,
  `styles.count ≤ 1,024`, every colour exactly `#` and six lowercase hex digits read by `UInt32(_, radix: 16)` after that
  shape check (no arithmetic), `dialog` null or 12 hex, `turn` 16 hex, `-`, digits; every whole number through `DoorNumber`
  (rule k). Anything else refuses the answer whole (`.malformed`). `PocketSessionDetail.screen` decoded as an optional Bool.
  `KeyItem` encodes as `{"t": …}` or `{"k": …}`; `ScreenKeyName` is a closed enum whose raw values are the Mac's 35 names.
  `PocketWriteAnswer.Verb` gains `keys`.

#### 5.8.3 The seams — `Screens/DoorWords.swift`, `App/TortieApp.swift`

- `DoorReading` gains the REQUIREMENT `func screenDoor(_ sessionId: String) -> (any ScreenDoor)?` with an extension default
  of nil (a reader with none: the tests' fakes and 333.3's sample until it answers one).
- NEW `protocol ScreenDoor: AnyObject, Sendable` (in `DoorWords.swift`): `func read(since: String?) async throws ->
  PocketScreenAnswer`, `func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult`, `var
  writes: Bool { get }`, `func close()`. `PairedReader.screenDoor(_:)` answers a `PairedScreenDoor` holding a poll line and a
  keys line.
- `DoorWords.screenSentence(for: DoorFailure) -> String` and `keysSentence(for: WriteResult) -> String`, non-optional and
  never empty (rule v).
- `TortieApp.swift`: `Route.screen(id: String, name: String)`; `SessionRoute` hands `openScreen`; NEW `ScreenRoute` holds a
  `ScreenModel` and a `ScreenKeySender` (nil when the door writes nothing); `AppModel` gains `registerKeys(_:)`,
  `releaseKeys(_:)` and `liveKeys`, and `wentAway()` stops every key sender and closes every screen door's lines.

#### 5.8.4 The Screen — NEW `Screens/Screen.swift`, `ScreenGrid.swift`, `ScreenRows.swift`, `ScreenGlyphs.swift`, `ScreenSelection.swift`

- `ScreenModel` (`@MainActor @Observable`): `phase` (`loading`, `drawn(ScreenPicture)`, `absent(String)`, `failed(String)`),
  `revision`, a `line` (the not-answering line, the waiting line, the held-picture line). One stored `Task` runs the poll loop
  while the Screen is on top and the app is in the foreground: `read(since: revision)`; a new revision draws; `unchanged` asks
  again at once; a failure keeps the last picture, draws `Copy.screenNotAnswering`, and asks again after 1, 2, 4 then 8 s; a
  404 takes `DoorWords.consequence(of:reading: .oneSession)` as the Session screen does. Cancelled on disappear, on
  `wentAway`, and when `foregroundTick` moves it restarts.
- `ScreenPicture`: the decoded screen as `ScreenRowModel`s, styles mapped once to `ScreenStyle` (a `Color` from
  `Token.drawn`, the font weight and the decorations).
- `ScreenGrid`: a two-axis `ScrollView` holding a `LazyVStack(spacing: 0)` of `ScreenRowView`s, each an `.equatable()` `Canvas`
  of height `cellHeight`, drawing each run's ground rectangle, then its text with `context.draw(context.resolve(Text(verbatim:
  run.text).font(.system(size:, weight:, design: .monospaced))…), at:, anchor: .leading)` inside a clip of its box, a wide
  cell's glyph measured and scaled down to its two columns, box and block characters as `ScreenGlyphs` paths, then the cursor
  and the selection. `fontSize` starts at the size whose cell width times `cols` fits the view's width, and `MagnifyGesture` and
  the double tap move it (D27): during a pinch the grid is scaled by `scaleEffect` and the font is set once at the gesture's
  end; the top size is clamped so the row's width in pixels (`cols × cellWidth × displayScale`) is at most 8,192.
  **`ScreenLayout`** (pure, in `ScreenRows.swift`) turns a row's runs into boxes: a run is split at every character the cell
  font does not hold (`CTFontGetGlyphsForCharacters` false), each such character its own box of its run's cells for it (a
  width-1 emoji-capable code point drawn with U+FE0E after it, built from the code point), and a box's glyph is measured with
  `ResolvedText.measure(in:)` and scaled down, never up, to its box (D26). The cell is MEASURED, never assumed: its width the advance of the digit zero in
  `UIFont.monospacedSystemFont(ofSize:weight: .regular)`, read through CoreText (`CTFontGetGlyphsForCharacters`,
  `CTFontGetAdvancesForGlyphs`), its height the font's line height, each snapped to the display's pixel; no string is drawn
  to measure it (rule b), and nothing names an attributed string (rule z1). The page around the grid is `Tokens.bgCanvas`; the grid's ground is the Mac's `ground`.
- `ScreenGlyphs`: `shape(for: Unicode.Scalar) -> Glyph?` for every code point of U+2500 to U+259F, DERIVED from
  `scalar.properties.name` once into a dictionary (Tortie's own rule, not Paseo's table, §5.8.1). MEASURED with Swift's own
  `properties.name` over the 160 code points: the names use 37 words. `LIGHT`, `HEAVY`, `DOUBLE`, `SINGLE` and `UP`, `DOWN`,
  `LEFT`, `RIGHT`, `HORIZONTAL`, `VERTICAL` give each arm and its weight, a weight word binding to the direction beside it
  (`DOWN SINGLE AND RIGHT DOUBLE`, `LIGHT LEFT AND HEAVY RIGHT`; a double arm is two strokes a third of the cell apart);
  `DOUBLE`, `TRIPLE` or `QUADRUPLE` directly before `DASH` is a dash count, not a weight (`LIGHT DOUBLE DASH HORIZONTAL` is
  `╌`); `ARC` a quarter circle; `DIAGONAL` and `CROSS` the diagonals; `UPPER`, `LOWER`, `LEFT`, `RIGHT` with `HALF`, `FULL`,
  the eighths (`ONE` to `SEVEN`, `EIGHTH(S)`) and `QUARTER(S)`, and `QUADRANT`, give the block rectangles; `LIGHT SHADE`, `MEDIUM SHADE`, `DARK SHADE` fill the cell with the ink at 25, 50 and 75 percent. A name the rule
  does not read draws the font's glyph, and `ScreenGlyphTests` lists which, by code point, as a frozen set of none.
- `ScreenCover` (D41): while `scenePhase` is not `.active` the Screen draws a `Tokens.bgCanvas` plate over the grid, no text
  and no rows, so the app-switcher picture holds nothing of the screen; `ID.screenCover`.
- `ScreenSelection`: the gesture classifier and the selection model of §5.8.1; Copy writes `UIPasteboard.general.string =
  text`; the Screen holds `heldPicture` while a selection exists and draws `Copy.screenHeldWhileSelecting`.
- `OrientationGate` (NEW `App/Orientation.swift`): `@MainActor enum` with `static var screenOnTop = false`, set true in the
  Screen's `onAppear` and false in `onDisappear`, which then asks the window scene for portrait
  (`requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))`) and
  `setNeedsUpdateOfSupportedInterfaceOrientations()`. `AppDelegate` gains `application(_:supportedInterfaceOrientationsFor:)`
  answering `.allButUpsideDown` when it holds and `.portrait` otherwise. Info.plist's `UISupportedInterfaceOrientations` lists
  portrait, landscape left and landscape right.

#### 5.8.5 The keyboard — NEW `Screens/ScreenKeyField.swift`, `Screens/ScreenKeys.swift`

- `ScreenTextView: UITextView` (D28) with `deleteBackward()` overridden to emit `.key(.bSpace)`, `canPerformAction(_:withSender:)`
  false for `paste(_:)`, `pasteAndMatchStyle(_:)`, `pasteAndGo(_:)` and `pasteAndSearch(_:)`, `pasteConfiguration = nil`, a
  `textDropDelegate` answering cancel, `inlinePredictionType = .no` and `writingToolsBehavior = .none`; `ScreenInputState`
  swallows a replacement holding `\n` or `\r` unless it is exactly `\n` (Enter), and sends nothing while dictation runs; a
  `UIViewRepresentable`
  places it one point square and transparent behind the grid; a tap on the grid makes it first responder; its delegate turns
  committed changes into `KeyItem`s through `ScreenInputState` (Paseo's machine, pure and tested).
- The key bar (`ScreenKeyBar`, SwiftUI hosted as the text view's `inputAccessoryView`): `esc`, `tab`, `⇧tab`, `←`, `↑`, `↓`,
  `→`, `ctrl` (one shot; drawn in `Tokens.accent` while armed; the next letter typed, either case, becomes `C-<letter>`,
  anything else is sent as typed and disarms it), `return`, and a button that puts the keyboard away. Each has an
  accessibility label in `Copy`. No key auto-repeats. While the picture is not `typable` the keyboard is not raised and the
  line reads `Copy.screenCannotType`.
- `ScreenKeySender` (D29, D30): `pending: [KeyItem]`, one `inFlight` task, `minGap = 0.1`, and the LOCK, `lastTurn` (the
  turn the last batch carried), `lastRevision` (the revision it was sent against) and `lastOutcome`; `send(_:)` appends; a
  flush starts a write only when nothing is in flight, at least `minGap` has passed since the last started, the picture is
  `typable`, and, when the picture is `asking`: after `done`, the picture's `turn` is not `lastTurn`; after `changed`, its
  revision is not `lastRevision`; after anything else, no condition. A write takes the leading text and `BSpace` items, at
  most 64 items or 1,024 text bytes, or, when the first pending item is any other named key, that key alone (D17), and passes
  the picture's `turn` and `dialog`. Keys that arrive while a question's picture is
  spent are dropped and the line reads `Copy.screenWaitForRedraw`. An answer's non-`done` outcome draws
  `DoorWords.keysSentence(for:)`. Registered with the app at the Screen's appear; `stop()` drops `pending` and cancels
  `inFlight` (withheld when its bytes were not handed).

#### 5.8.6 The Session screen and End — `Screens/SessionScreen.swift`, `Screens/EndBar.swift`

- `SessionBody` draws, under the Conversation row, a `Screen` row of the same shape (54 tall, the label in the accent, a
  chevron, `ID.sessionOpenScreen`) when `drawing.screen` is true.
- `EndBar` becomes `EndTopControl`, placed by `SessionScreen` in `.toolbar { ToolbarItem(placement: .topBarTrailing) }`: the
  owner glyph and `Copy.endTop` (`End`) in `Tokens.error`, or `Tokens.textMuted` and `.disabled(row == .off)` when off, the
  `ID.sessionEnd` Button, and the same `.confirmationDialog` over the Mac's own confirmation. `EndBarDrawing`, `EndModel`,
  `EndRunner` and their rules do not move. The End line (`ID.sessionEndLine`) is drawn under the status block. The bottom
  `.safeAreaInset` draws 318's `MessageStrip` alone.

#### 5.8.7 Words, colours, identifiers, build

- `Copy.swift`, each `/// Phone:` with its reason: `screen = "Screen"`, `endTop = "End"`, `copy = "Copy"`,
  `screenNotAnswering = "Your Mac is not answering. This is the last screen it sent."`, `screenWaitForRedraw = "Waiting for
  the screen to redraw."`, `screenHeldWhileSelecting = "Showing the screen as it was when you started selecting."`,
  `screenCannotType = "Keys cannot reach this session now."`, `keyEsc = "esc"`, `keyTab = "tab"`, `keyBackTab = "⇧tab"`,
  `keyCtrl = "ctrl"`, `keyReturn = "return"`, and the accessibility labels `Escape`, `Tab`, `Shift Tab`, `Left`, `Up`,
  `Down`, `Right`, `Control`, `Return`, `Hide keyboard`; `terminalStaysOnMac` per D31. The Mac's sentences reach the phone
  through the door and are drawn verbatim.
- `Tokens.swift`: `case bgCanvas` (`0x131417`, `--bg-canvas`; the hex the table already holds for
  `statusAttentionBadgeFg`, so no new hex), and `static func drawn(_ rgb: ScreenColor) -> Color`, the one constructor of a
  colour the door names, `Color(.sRGB, red:, green:, blue:, opacity: 1)` over its three bytes.
- `Identifiers.swift`: `sessionOpenScreen`, `screen`, `screenGrid`, `screenRow(n)`, `screenCursor`, `screenLine`,
  `screenKeyField`, `screenKeyBar`, `screenKey(name)`, `screenCopy`, `screenSelection`, `screenCover`.
- `project.pbxproj`: `CURRENT_PROJECT_VERSION = 7` in all six configurations; the new files referenced.

### 5.9 What does not change

`killSession`, End and End these; the manifest and its schema; every status rule (refusal 5: no route and no verb sets a
status; `noteUserInput` is the desk's funnel); `menu.ts`; the IPC contract and its baseline; `/v1/blocked`, `/v1/turns`,
`/v1/sessions` and every list answer; `/v1/choose` and `/v1/say` and the reply's reader and writer (the keys bump the question
id the press reads, which is the desk's rule); the signature, the nonce memory and the clock; the QR; Funnel; the door
process's import wall (W2); the push and the alerts; Phase 89's typing door and the remote arm's rule 1; the numbered verdict
and `conformance:choices`; Face ID on End; the Conversation and its pages; the attach host and the Mac's terminal.

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own against a green base, restored by sha256 in a
`finally`; an arm whose anchor text is absent FAILS by name.

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`) and `ablation:p313`

- **R2 widened**: the write ids are exactly `end`, `choose`, `say`, `keys`. **R3**: `FORBIDDEN` gains `main/screen/` and
  `../screen/`. **R4**: re-pinned to `16115392…` with `--write-route-pin`, the comment naming `d95ecd27…` and both methods.
  **X1 to X12 widened** over the four verbs (X5: `PocketWrites` exactly `end`, `choose`, `say`, `keys`, implemented once in
  `pocket-writes.ts`); **X3** the caps 2,048 and 8,192. **Y12** (G1's scope) gains `src/main/screen/**`. **Y13 widened**:
  `replyTurns`' `bump(` is also called exactly once in `src/main/screen/keys.ts`, with the cause `'phone'`, as the statement
  before the act.
- **NEW Z1 to Z19**, over `src/main/screen/**`, `src/main/machines/remote-screen.ts`, `src/main/tmux/control-client.ts` and
  the pocket files, with the TypeScript parser:

| Rule | Holds |
| --- | --- |
| Z1 | The two rows: `screen` a signed GET read, `keys` a signed POST write, neither window-only; `SIGNED_ROUTES` and `WRITE_ROUTES` each gain exactly one id |
| Z2 | `POCKET_WRITE_BODY_CAPS` exactly end 512, choose 512, say 32,768, keys 16,384 (Y1 widened) |
| Z3 | `parseKeysBody`: the key set `dialog,keys,session,turn,write`; 1 to `POCKET_KEYS_MAX_ITEMS` items; each item exactly one own key `t` or `k`; `k` compared with `===` against `POCKET_SCREEN_KEY_NAMES`; **a `k` other than `BSpace` only as the one item** (D17); `turn` by `isQuestionId`, `dialog` null or `isMark`; no `.trim`, `.normalize(`, `.replace(` on any value |
| Z4 | The keys verb's order: text rule, gate, ONE awaited `readFresh(`, then the final check's statements, `bump(`, `onLastCheck?.(`, the act, with no `await` between the first `still(` of the final check and the act's writes; the act's lines written in one statement |
| Z5 | The one refusal: asking reads the row's status `needs_input` OR `detectDialogRows(` `.atChoice` over the fresh read's plain text; while asking, or when the body's `dialog` is not null, the verb compares `input.turn` with `turns.current(` and `input.dialog` with the fresh `dialog`; `dialog` computed by `hashScreen(readBackWindowOf(` in one function both the answer and the verb call |
| Z6 | The act's argv: locally only `copy-mode -q -t <pane>`, `send-keys -t <pane> -H <hex>…` (1 to 256 hex elements, each `^[0-9a-f]{2}$`) and `send-keys -t <pane> <name>` with `<name>` from `POCKET_SCREEN_KEY_NAMES`; never `-l`, never `send-keys` without `-t`; on another machine only `typePhoneKeys(` |
| Z7 | No argv element in `src/main/screen` is derived from a text item except its hex bytes; no `.message` of a caught value; no log call in `src/main/screen` or `remote-screen.ts` |
| Z8 | `noteUserInput(` called exactly once in `src/main/screen`, in `keys.ts`, after the act, on a path that wrote; no other status setter named there |
| Z9 | The reads: `read.ts` sends only `display-message -p -t <x> SCREEN_FORMAT` and `capture-pane -p -e -t <x>`; `remote-screen.ts` only its one `execOn(` argv; `SCREEN_FORMAT` declared once and compared with `===`; no module of this phase names `refresh-client`, `resize-window`, `resize-pane`, `attach-session`, `new-session`, `switch-client`, `-x` or `-y` (D7) |
| Z10 | The hold: `SCREEN_HOLD_MS + SCREEN_TICK_MS <= ANSWER_TIMEOUT_MS - 2_000`, `2 * SCREEN_TICK_MS < DOOR_STOP_JOIN_MS` and `SCREEN_LOCAL_READ_DEADLINE_MS <= SCREEN_REMOTE_READ_DEADLINE_MS`, read as arithmetic over the imported constants; every read raced against its deadline; a poll answered from its own timer, whose callback asks `closing(` and awaits nothing (D3) |
| Z11 | `routes.ts` composes the screen answer field by field (`screenOf`), with fresh arrays; the caps imported from the contract and each read once; `why` exactly `ended`, `unreachable`, `large` |
| Z12 | `sgr.ts`, `cells.ts`, `cell-widths.ts`, `palette.ts` and `compose.ts` import no `node:fs`, `child_process`, tmux, settings or registry module, and `compose.ts` nothing outside `src/main/screen` and `src/shared` but `../activity/screen` and `../reply/reader` (§5.3.4); `windowMarkOf` declared once, in `compose.ts`, and the only `hashScreen(readBackWindowOf(` in `src/main/screen`; the width table and the palette are frozen literals |
| Z13 | `server.ts` hands `answer(` a `closing` built from `deps.shuttingDown()` and `door.stopping()` |
| Z14 | `session()` sets `screen` in one place, from `facts.screen !== undefined` and the status list `SCREEN_LIVE` declared once |
| Z15 | `WRITE_CLAUSES.keys` is D35's clause; `POCKET_DOOR_HONESTY` names the screen and typing and no longer says "change nothing else" |
| Z16 | The watcher: one entry per session; an entry with no poll waiting is dropped; no read for a session with no poll; the duty cycle `max(` over the tick and four times the last compose |
| Z17 | `control-client.ts`: inside a block, an `end` or `command-error` closes it only when its `commandNumber` and `timestamp` equal the block's own; the block records both at `begin` |
| Z18 | The ledger caps 2,048 and 8,192 (X3's widening), and `POCKET_KEYS_MAX_ITEMS` and `POCKET_KEYS_MAX_TEXT_BYTES` declared once in the contract and read where the verb and the parse read them |
| Z19 | `POCKET_NONCE_MEMORY` is 4,096 and at least `(2 * POCKET_CLOCK_SKEW_MS / 1000) * (1000 / SCREEN_MIN_ANSWER_GAP_MS + 20)`, read as arithmetic over the imported constants; a held poll is answered no sooner than `SCREEN_MIN_ANSWER_GAP_MS` after it arrived except the answer that ends a settling, and a stale `since` at once outside a settling |
| Z20 | The gap (D42): `SCREEN_KEYS_GAP_MS` is 50, declared once, in `keys.ts`; the verb's one await of it comes before its one `readFresh(` and after the gate; the last-act time is written after the act |
| Z21 | The settle and the slot (D4, D3): `nudge(` takes the act's window mark; while a session settles no poll of it, held or stale, is answered but by a read whose window mark differs from it, a read that started `SCREEN_SETTLE_MS` or more after the nudge, `closing(` or the hold's end; `SCREEN_SETTLE_MS` is 300 and greater than `SCREEN_NUDGE_MS`; no read starts for a session while one is in flight; the local down path spawns ONE list per read |
| Z22 | The log (D43): `writes.ts` holds one log call; a `keys` outcome `done` reaches it only through the `KEYS_LOG_QUIET_MS` (60,000) condition; every other verb and outcome reaches it unconditionally |

`ablation:p313` gains one arm per Z clause and per widened clause (about 37), each red on the rule that owns it.

### 6.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

In-process, the shipping door over a recording fake `PocketWrites.keys` (it records its input and asks `still()`) and a fake
`facts.screen` whose answers the arms choose. Each arm asserted on its reason or outcome and on the recorder: an honest
`/v1/screen` (200, the fake asked once) and an honest `keys` (done, one call); `/v1/screen` with `since` of 11 or 13 hex,
upper case, twice, an unknown parameter, no `id` (404 `route`, the fake never asked); the same keys bytes again (404
`replay`); the same write id fresh-signed (the recorded body, one call); a keys body with 65 items, an item with two keys, an
unknown name (`M-x`, `F1`, `C-Up`, `C-c;`), a non-string text, an extra top-level key, `[{t:"a"},{k:"Enter"}]`,
`[{k:"Escape"},{t:"b"}]` and `[{k:"Up"},{k:"Up"}]` (each `refused malformed`, echoed; `[{k:"BSpace"},{t:"x"}]` is `done`);
over 16,384 bytes (404 `oversized`, never forwarded); a query on `/v1/keys` (404 `route`); a GET signature on the POST (404
`signature`); another phone's connection (404 `channel`); an `end` and a `keys` on one session at once (`busy`); the phone
removed before the act (404) and during it (the fake's `still()` false: `refused stopped`, 200); a screen poll held while the
door stops (answered or cut, never after the stop's join); a screen poll held while its phone is Removed (cut, and no
screen byte leaves after the Remove: the listener destroys a revoked socket with no write in flight, `listener.ts:666-672`,
and refusal 7 asks the phone again after main answers, `server.ts:197-205`); twenty `done` keys writes on one session in
2 s (ONE log line, D43) and a `refused` one among them (its own line); a screen answer main holds past the bound (the door's 404, the
connection kept alive and usable for the next request).

### 6.3 `conformance:machines` (`build/conformance-machines.mjs`) and `ablation:p320`

- **Condition 102 widened**: `SCROLL_SHAPES` holds exactly the seven and `type-key`; the not-idempotent rows are exactly
  `scroll-lines`, `type-bytes` and `type-key`; `type-key`'s slots `['send-keys', '-t', 'target', 'one-of:<the 35 names>']`.
- **Condition 103 widened**: no row but `read-state` carries a format; `type-key`'s words are the contract's list, imported,
  not re-spelled.
- **NEW 122**: `namedKeySequence` is the one composer of a `type-key` argv, its first argv the `cancel`; its one production
  caller is `typePhoneKeys`.
- **NEW 123**: `typePhoneKeys` writes no command before asking the address and the carriage live; writes one `cancel` first;
  every argv it writes is admitted by `admitScrollArgv`; no `await` before its last write; it never calls `hold(`.
- **NEW 124**: `remote-screen.ts` reaches the machine through `execOn(` alone, with `capture-pane` and `display-message` as
  its only verbs and `SCREEN_FORMAT` as its only format.
- `ablation:p320` gains one arm per clause (about 9).

### 6.4 `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, `test:ios`, the vectors

- **NEW (ah) THE SCREEN NEVER SIZES THE MAC.** No request the app composes carries a size: `DoorClient.screen`'s target has
  exactly `id` and `since`; `KeysBody` exactly `dialog, keys, session, turn, write`; no `resize`, `cols` or `rows` in any
  `Door/` request builder or `Screens/Screen*.swift` write.
- **NEW (ai) THE KEYS.** `ScreenKeySender` the one caller of the writer's `keys(`; one write in flight; `minGap` declared once
  and at least 0.1; at most 64 items and 1,024 text bytes a write, read from constants declared once; `ScreenKeyName`'s raw
  values exactly `POCKET_SCREEN_KEY_NAMES` read from `src/shared/ipc/pocket.ts` as text; text items filtered of C0, C1 and DEL
  by one function; a named key other than `BSpace` alone in its write; the lock inside a question read off the TURN (while
  the picture is `asking`, after `done` a write starts only against a picture whose `turn` is not `lastTurn`, after `changed`
  only against one whose revision is not `lastRevision`; no arrival-order clock); registered before its first write and stopped by
  `AppModel.wentAway()`; nothing persisted
  (`PERSISTS` over the new files); `OWNER_CHECK_ABSENT` gains every `Screens/Screen*.swift`.
- **NEW (aj) THE INPUT FIELD.** `ScreenTextView` sets `autocorrectionType`, `spellCheckingType`, `smartQuotesType`,
  `smartDashesType`, `smartInsertDeleteType` off and `autocapitalizationType` none; no `keyboardType` of `.asciiCapable`;
  nothing is sent while `markedTextRange` is non-nil or dictation runs; `deleteBackward` emits `.bSpace`; **widened by the
  attack (A9)**: `canPerformAction` false for the paste actions, `pasteConfiguration = nil`, a `textDropDelegate`,
  `inlinePredictionType = .no`, `writingToolsBehavior = .none`, and `ScreenInputState` the one place a line break becomes
  `Enter`, only for a replacement that is exactly `\n`.
- **NEW (ak) THE KEPT LINES.** `DoorLine` lives in `Door/DoorClient.swift`; `Connection: keep-alive` is written only by a
  line's request; `freshFor` declared once, at most 4; a write is sent only on a line under it; a read's one retry is on a new
  line after `closedBeforeAnswer` on a reused one; a write is never retried; **widened by the attack (A12)**: a line closes
  itself once idle `freshFor`, on an answer's `Connection: close`, and on any byte past an answer's `Content-Length`. **(t)
  widened**: every other exchange still writes `Connection: close`, and hostile-door.mjs names the screen and keys arms (§7.8
  PSH).
- **NEW (al) THE PASTEBOARD IS WRITTEN AND NEVER READ.** `UIPasteboard` named only in `Screens/ScreenSelection.swift`; only
  `UIPasteboard.general.string =`; no read of `.string`, `.strings`, `.items`, `hasStrings`, `detectPatterns` or
  `.changeCount` anywhere in the app. **(p) narrowed, or it is red** (§Attack A4): `CODE_SOURCES`
  (`build/conformance-ios.mjs:2383`) counts `UIPasteboard`, read OR written, as a place a pairing code enters, and requires
  it bound to a `KEY_NAMES_IN` name, so the Copy statement fails (p) as written. (p) skips exactly one shape, an assignment
  TO `UIPasteboard.general.string` in `Screens/ScreenSelection.swift`; every other mention anywhere stays a code source. Its
  self-test: that write green; a read of the pasteboard in the same file red; the same write in any other file red.
- **NEW (am) A COLOUR THE DOOR NAMES.** `Token.drawn(` declared once, in `Style/Tokens.swift`, its argument a `ScreenColor`;
  `ScreenColor` made only by `Contract.swift`'s seven-character `#rrggbb` reader; rule (a)'s other half unchanged.
- **NEW (ao) THE SCREEN LEAVES NO PICTURE** (D41). `Screens/Screen.swift` reads `scenePhase` and draws `ScreenCover`
  whenever it is not `.active`; `ScreenCover` holds no `Text`, no row and no run.
- **NEW (ap) THE SHAPES ARE TORTIE'S** (D26). `Screens/ScreenGlyphs.swift` derives every shape from
  `properties.name` and holds no string or character literal of U+2500 to U+259F; `ScreenLayout` splits a run at a
  character the cell font does not hold (`CTFontGetGlyphsForCharacters`) and scales a glyph down only (`min(1,`).
- **NEW (an) LANDSCAPE ON THE SCREEN ALONE.** Info.plist lists exactly portrait, landscape left and landscape right
  (`PINNED_PLIST_KEYS` gains `UISupportedInterfaceOrientations`); `application(_:supportedInterfaceOrientationsFor:)` in
  `App/AppDelegate.swift` alone, answering `.portrait` unless `OrientationGate.screenOnTop`; that flag set only in
  `Screens/Screen.swift`'s appear and disappear.
- **Widened**: (a) `bgCanvas` and `drawn`; (ab) `signedPost` called by `end`, `choose`, `say` and `keys` alone, bodies
  `EndBody`, `ChooseBody`, `SayBody`, `KeysBody`; (ac) `ID.sessionEnd` is a `Button` in `Screens/EndBar.swift` in a
  `ToolbarItem(placement: .topBarTrailing)` with `.disabled(row == .off)`, and `ID.sessionEndBar` is gone; (k) every operator
  in the Screen files is proved off door integers or named in `ARITHMETIC_NAMED`: the layout is `CGFloat`, which never traps,
  a run's column is accumulated in `CGFloat` from `CGFloat(run.cells)` and never in `Int`, and the decoder's one integer sum
  (a row's cells against `cols`) goes through `DoorNumber`'s checked add; (s) build 7; (v) `screenSentence(for:)` and `keysSentence(for:)`
  non-optional and never empty.
- `ablation:p316` gains one arm per new or widened clause (about 36).
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): the new words owned by `Copy.swift`; `terminalStaysOnMac` judged
  against `Conversation.html`'s new sentence; NEW `Screen.html`'s terminal rows judged as data (an agent's own text) with that
  reason; `End` judged in `Session.html`'s top bar; the floors rise to what the run matches; two self-test mutations (`Screen`
  renamed in the mock; `scrollback` changed by one letter in `Copy.swift`), each red.
- **`test:ios`** (`build/p316/test-ios.mjs`): its Node door answers `GET /v1/screen` and `POST /v1/keys` (signature verified
  by `node-phone.mjs`'s `verifySigned`), keeps connections alive with `keepAliveTimeout` 5 s, and can close a kept connection
  after N requests. NEW `P337ScreenTransportTests` drive the SHIPPING `DoorClient` and `DoorLine`: two reads on one line count
  ONE handshake; a line idle 4.5 s is not reused; a read on a line the door closed is asked once more and answered; a keys
  write whose line the door closed is NOT retried (one POST counted, `.noAnswer` or `.notSent` as handed); an answer followed
  by stray bytes on a kept line: the next read opens a NEW line (two handshakes) and is answered; a line left idle 4 s is
  closed by the phone (the door counts the close before its own 5 s). NEW `ScreenGridCostTests`: the sample screen mounted in
  a hosting window at the fitted size and at the top size, its memory read with `XCTMemoryMetric` and printed; a peak growth
  over 64 MB at the top size is needs_work for the verifier (the 316.6 class), and a design that draws only the visible
  window in one `Canvas` is the named way out.
- **The vectors** (`build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`): a `/v1/screen` read with `since`, and
  a `/v1/keys` write whose items hold `"`, `\`, `/`, an emoji and every key name, each body as Swift writes it, accepted by
  the shipping verifier; one with a body byte changed refused `signature`.

### 6.5 The other gates

- **`conformance:choices`**, **`conformance:handback`**, **`conformance:manager`**: not edited; each runs and reads what it read
  at `aebb4ce9` (`pocket-writes.ts` is in `conformance:manager`'s trigger list, so it runs).
- **`build/assert-import-boundaries.mjs`**: the `main/pocket/` wall's `forbidden` gains `main/screen/`.
- **`gate:electron`**: `HELPER_USER_FLOOR` 166 → **167** for `build/p337/probe-p337.mjs`, in the same commit.
- **`gate:simulator`**: no new script reaches the helper; `SIMULATOR_USER_FLOOR` stays 2 (`probe:p316`'s `screen` group);
  the helper's one new read (PS6's pasteboard) names the run's own device and never `booted` or `all`, with a fixture each way.
- **`gate:background`**, **`gate:checks`**: `probe:p337` and `measure:p337` classified in `build/verification-checks.mjs`;
  every server, stand-in, recorder, sshd and node phone they start is ended in a `finally` that names it.
- **`gate:knownhosts`**: the remote arms reach ssh only through `build/scratch-machine.mjs` and `build/ssh-run.mjs`.
- **`gate:contract`**: unchanged, byte for byte (D36).
- **`conformance:push`**: green; the push seam's facts have no `screen` and its host no `keys`.
- **`probe:controldeadline`** (CLAUDE.md's trigger for `control-client.ts`): run once by a verifier.
- **CLAUDE.md** (the integrator): the pocket row names the two rows, Z1 to Z19, `src/main/screen/**`; a NEW path-triggered
  row for `src/main/screen/**`, `src/main/machines/remote-screen.ts`, `src/main/tmux/control-client.ts`'s block matching,
  `scroll-shapes.ts`'s eighth row and `scroll-order.ts`'s `typePhoneKeys` (`conformance:pocket`,
  `conformance:pocket:hostile`, `conformance:machines`, `measure:p337 --check`); the ios row names (ah) to (an) and build 7;
  the machines row names the eighth row and conditions 122 to 124; the probes table gains `probe:p337` and `measure:p337`,
  and `probe:p316`'s row one sentence for its `screen` group; each one line in the house style.

---

## 7. The proof, run rather than read

### 7.1 The battery

`typecheck`, `build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`, `gate:background`,
`gate:checks`, `gate:knownhosts`), `test`, `smoke:t1`, `smoke`, `smoke:t3`, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run
package`; `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`, `conformance:machines`, `ablation:p320`,
`conformance:choices`, `conformance:handback`, `conformance:manager`, `conformance:phonecopy`, `conformance:push`,
`ablation:p316`, `node build/p316/vectors.mjs --check`, `measure:p337 --check`; `test:ios` in Debug and Release on iOS 26.3
and 18.3 (verifiers, under the lock); `probe:controldeadline` once; `probe:p318` once (the press shares the question id the
keys now bump, and its writer shares the control client this phase hardens). `git diff aebb4ce9 -- src/main/menu.ts
docs/audits/contract-baseline.txt src/main/activity src/renderer/terminal src/main/attach` is empty, and under `src/renderer`
only `src/renderer/settings/__tests__/p316-phone-section.test.tsx` moves.

### 7.2 Vitest (the builders')

- `src/main/screen/__tests__/sgr.test.ts`: every SGR form of D11, pen carried across rows, unknown escapes unreadable.
  `input-row-parity.test.ts`: over every committed `.ansi` and a corpus of 2,000 generated rows (the projection's four
  attributes in every order, every grey index 230 to 255, unknown modes), `promptIsEmpty` reads exactly what the PARENT's
  reader reads, the parent's `rowsOf` and `applySgr` copied VERBATIM into the test file with their source commit named (a
  deliberate copy, the oracle; the integrator's duplicate scan names it and leaves it).
- `cells.test.ts` over `build/fixtures/screen/tmux-widths.json` (every code point of both builds: 3.7b equal, the 4,515
  3.6a differences listed exactly) and `tmux-sequences.json` (all 281 sequences, 3.7b equal).
- `palette.test.ts`: `SCREEN_PALETTE` equals `theme.ts`'s dark values read as text; `xterm256` for 16, 17, 231, 232 and 255
  against literal xterm values.
- `compose.test.ts`: over every committed `.ansi` and `.txt` capture, the composed text equals the capture's text with
  trailing blanks dropped; a wide cell its own run; every run's style reproduced by an SGR reader of the TEST'S own
  (independent of `sgr.ts`); the caps (a 513-column screen, 1,025 styles, an answer over 1 MiB: `large`); `asking` and
  `dialog` over Claude's and Codex's committed question screens.
- `watch.test.ts`: one read a tick however many polls; no read with none waiting; the duty cycle; the nudge; the hold
  answering `unchanged` at the bound and at once on a new revision; a poll under `closing()` answered within one tick WHILE A
  READ NEVER SETTLES, and the hold's end likewise; one read in flight per session (a read held 2 s at a 400 ms tick starts no
  second); the settle (a nudge whose next read shows the same window and a moved turn answers NOTHING, a held poll or one
  arriving stale with the revision from before the act, until the window moves or 300 ms pass); a held poll answered no sooner than 250 ms after it arrived while a stale `since` answers at once; the
  down path one spawn per read, split by count with a forged display-shaped row inside the capture; a remote `unreachable`.
- `sample.test.ts` (screen): composes `build/fixtures/screen/sample-claude-2.1.287.json` from the committed `.ansi` with a
  fixed display and holds the committed file equal byte for byte; `P337_WRITE_SAMPLE=1` writes it. It is the ONE writer of
  that file.
- `keys.test.ts`, over a fake core, a recording control client and a fake watch: the exact lines for every item kind; text
  only in `-H` hex; the one statement; each final-check refusal writes nothing; the one refusal both ways (a changed `turn`,
  a changed `dialog`, each with and without a question drawn); `noteUserInput` once on a path that wrote; a rejected
  `send-keys` line is `failed`; `still()` false is `stopped`; remote `unreachable` writes nothing; the gap (two writes handed
  0 ms apart: the second's first line written 50 ms or more after the first's, on a fake clock); `nudge` handed the fresh
  read's window mark.
- `src/main/tmux/__tests__/p337-control-guards.test.ts`: a scripted stream with forged guard rows inside a block, four
  commands pipelined, each answer its own; a real `%error` still rejects its own command.
- `src/main/machines/__tests__/p337-type-key.test.ts`: `admitScrollArgv` admits every `namedKeySequence` argv and refuses
  `send-keys -t $1 M-x`, `… C-Up`, `… Up Down`, `… -l Up`, a `%` target; `typePhoneKeys` writes cancel first, admits every
  argv, writes nothing on a carriage that is not live.
- `src/main/pocket/__tests__/`: `writes.test.ts` (the keys parse, a named key not alone refused and `BSpace` with text
  taken, the ledger caps, D43's log: twenty `done` keys writes on one session in a minute log once, a second session once
  more, a refusal every time, and `end`, `choose` and `say` every time), `p337-body-caps.test.ts` (the keys worst
  bodies under 16,384), `routes.test.ts` (`screenOf` field by field; `screen` on `/v1/session`; absent `facts.screen` is
  404), `pairing.test.ts` (the line and the moved hash; 1,500 signed requests from one phone inside one clock window, then a
  replay of the first: still refused `replay`, D40), `ipc.test.ts` (the switch), `server.test.ts` (`closing` handed).
- `src/renderer/settings/__tests__/p316-phone-section.test.tsx` follows the honesty sentence.

### 7.3 XCTest (the phone's)

`ScreenDecodeTests` (every bound of §5.8.2 one at a time, each refused whole; the sample fixture decodes),
`ScreenRowsTests` (the row model, its equality and hash; `ScreenLayout` over every distinct character of every committed
capture: each box's measured glyph width at most its `cells × cellWidth` plus 0.5 pt, every column at `col × cellWidth`, and
the 18 characters SF Mono lacks each its own box), `ScreenGlyphTests` (every code point of U+2500 to U+259F has a derived shape,
the frozen set of font-drawn ones is empty, and `╌`, `═`, `╔`, `░`, `▓`, `▙` each the shape its name says),
`ScreenSelectionTests` (Paseo's gesture table row for row; selected text over wide cells), `ScreenInputTests` (append,
Backspace on empty, return, marked text held, a CJK composition rewrite, an autocorrect replacement swallowed until reset; a
replacement of two lines swallowed whole and `\n` alone an `Enter`; a dictation sequence of placeholder, partial, revision
and end sending its text once; `canPerformAction(paste)` false),
`ScreenKeysTests` (gathering, pacing, the 64 and 1,024 caps, a named key alone in its write, the lock inside a question by
the turn, the race in which the poll's settled picture arrives BEFORE the keys answer and the next batch still goes against
it, `changed` waiting for a new revision, `wentAway` withholding and dropping, no owner check), `ScreenCoverTests` (the cover
drawn for `.inactive` and `.background`, none for `.active`), `ScreenGridCostTests` (§6.4), `P337ScreenTransportTests` (§6.4), `EndTopTests` (End is a toolbar item and its states),
`CopyTests` (the new words; the refused ones), `TokensTests` (`bgCanvas` adds no hex), `SettingsTests` (`1.0.0 (7)`),
`DoorVectorTests` (the two vectors), and `ScreenColourTests` (the sample fixture's styles through `Token.drawn`, each read
back as the same three bytes).

### 7.4 The committed fixtures — NEW `build/fixtures/screen/`

- `tmux-widths.json`, `tmux-sequences.json`, `keys-encoding.json`: the spec step's measurements, written in its scratch at
  `…/scratchpad/p337/spec/fixtures/` (sha256 `ae96c8ec…`, `e4857e6e…`, `5ca195b1…`), copied VERBATIM by the screen builder;
  `measure:p337 --check` measures them again and fails on any difference.
- `sample-claude-2.1.287.json`: the shipping composer over `claude-prompt-after-decline-2.1.287.ansi`, written ONLY by the
  screen builder's `sample.test.ts` (`P337_WRITE_SAMPLE=1`); `measure:p337 --check` and the phone's `ScreenDecodeTests` read
  it (the phone through `#filePath`, beside the checkout, as `EndWordsTests` reads its fixture). A screen answer the phone
  decodes (D39).
- `forged-guards.ctl` (the KEYS builder's file, §10): a recorded control stream for the D8 test (two forged guard rows inside
  a capture's block, four commands' blocks after it), printable ASCII committed as text.

### 7.5 The stand-ins

`build/p318/stand-in.mjs` (Claude Code 2.1.287 and Codex 0.160.0's committed real screens; every byte it reads logged with a
monotonic stamp and the serial of the screen drawn) gains, appended, an op `alt` that draws its screen inside the alternate
screen with mouse tracking on (the full-screen Claude Code row of the matrix) and an op `ask` that draws a second, identical
question 60 ms after a commit with no hook. `build/p321/stand-in.mjs` draws Gemini's and Qwen's committed screens and echoes
typed input into its row. NEW `build/p337/key-recorder.mjs` asks its terminal for a named mode (application cursor keys,
keypad, bracketed paste, modifyOtherKeys 1 and 2) and logs every byte (the spec step's `recorder.mjs`, §14 M4). A shell is
`/bin/sh` under the scratch HOME.

### 7.6 `measure:p337` — the shipping Mac side, outside Electron (`build/p337/measure-screen.mjs` → `drive-screen.mts`)

The pinned tsx runs the SHIPPING `src/main/screen/**`, `remote-screen.ts`'s argv, the keys verb, `TmuxControlClient` and
`typePhoneKeys`' composer against scratch servers `-L p337-v-<pid>-37b` (vendored) and `-36a` (Homebrew's; else that row is
UNREADABLE), each under a copy of `resources/gmux-tmux.conf`, killed and unlinked in a `finally`. No Electron, no door.

| Arm | Holds |
| --- | --- |
| W | `--widths` writes, and `--check` re-measures and compares, both width fixtures and the sequences (the spec step's two-column method, §14 M5, M6) |
| F | Every committed `.ansi` and `.txt` capture drawn into a 120x40 pane and read by the SHIPPING read and composer: text equal to `capture-pane -p` row for row; styles equal to the measure's own SGR reader's; zero `large` |
| K | Every key name in every recorder mode through the SHIPPING verb: bytes equal `keys-encoding.json`; text as typed; check-to-land p50, p99 and max over at least 200 keys per build, **p99 under 15 ms** graded; **the attack's arms**: two writes `[Escape]` and `[t:"b"]` handed 0 ms apart reach a reader busy 25 ms after each input as TWO reads (the gap, D42; the parent's shape, both in one statement, printed as ONE read `1b62`), and a body with a named key not alone refused before anything is read |
| L | The long poll through the SHIPPING watcher: 100 changes per build, change-to-answer p50 and p99 printed and **p99 under 250 ms** graded; a held poll ends within two ticks of `closing()` |
| C | The SHIPPING `TmuxControlClient` with a pane drawing forged guard rows, four reads pipelined, 20 trials per build: **0** misattributed at HEAD; with `P337_PARENT_CHECKOUT` the parent's client reads the same arm and prints its count (§14 M3 measured 20 of 20) |
| S | The worst screens of §14 M8: the answer `large` past the caps; compose times printed |
| Z | Window size of every pane before and after every arm, with a sized client attached in a pty (§14 M13's shape): unchanged |

### 7.7 `probe:p337` — the Mac side, ONE Electron (`build/p337/probe-p337.mjs`)

`node build/harness-socket.mjs --fresh gmux-p337 '… node build/with-scratch-machine.mjs -- node build/p337/probe-p337.mjs'`
with `SCRATCH_MACHINE_QUIET_SHELL=1 SCRATCH_MACHINE_NO_OWN_KEYS=1`. One Electron through `withElectron`, a scratch profile,
`HOME` and socket `gmux-p337-<pid>`; the stand-in Tailscale behind its preflight and per-second sampler; the DNS stand-in in
the probe's own process; the `agents.json` renames read back through `agents:list`; two node phones (`node-phone.mjs`, which
gains `screenRead` and `sendKeys`). Sessions: Claude inline, Claude full screen, Codex, Gemini's and Qwen's recorded screens,
a key recorder in each mode, a `/bin/sh` shell, and a shell on the loopback machine. A desk keystroke is typed through CDP so
it passes the attach host. Every child is ended by pid in a `finally`.

| Arm | Holds |
| --- | --- |
| S0 | The door reads `changed`; its lines hold the route line with `keys` and `screen` and D35's write line; the confirm block draws D35's honesty sentence; Allow |
| S1 | `/v1/screen` for every session of the matrix: the answer's rows' text equal the session's `capture-pane -p` read by the probe on the scratch socket, byte for byte; `cols`, `rows`, `cursor`, `alternate` equal `display-message`'s; the window's size read before and after: unchanged |
| S2 | The long poll: `since` current is held at least 9.5 s and answered `unchanged`; a change drawn mid-hold is answered within 250 ms; `since` malformed is 404 |
| S3 | Keys into the shell: `echo p337` then `Enter` runs; `C-c` into `sleep 1000` ends that pid (the process table); `C-d` ends a `cat` |
| S4 | Keys into the recorder in each mode: every name's bytes equal `keys-encoding.json`'s; text arrives as the exact bytes |
| S5 | **The one refusal**: (a) a picture with no question, then the stand-in draws one, then keys with the picture's `turn` and `dialog`: refused `changed`, zero bytes at the stand-in; (b) a picture of a question, a desk keystroke through CDP, then keys: refused; (c) a picture of Codex's question, `Enter` accepted, the stand-in draws an identical question 60 ms later with no hook, a second `Enter` with the picture the poll handed back: refused, the second question's log holds no byte; (d) Claude's hook commits `needs_input` before its dialog is drawn, keys with a picture taken before: refused; (e) arrows in a picker, one batch per picture: every byte landed on the picture it was sent for; **(f)** a picker whose stand-in redraws 120 ms after each key, ten `Down`s each sent against the picture the poll handed back after the last: ZERO `changed` (the settle, D4), every `Down` landed; **(g)** `Escape` then `Enter` from the node phone 20 ms apart: two reads at the stand-in, 50 ms or more apart (D42) |
| S6 | Replays: the same bytes again (404); the same write id fresh-signed (the recorded body, one act by the log); a session id nobody has (`gone`, nothing typed); phone B Removed (refused before HTTP) |
| S7 | Hostile bodies: 65 items, 1,025 text bytes, a C0 text, `M-x`, an extra key: each refused for its own reason, the stand-ins' logs unmoved |
| S8 | **The machine**: the loopback machine's shell: its screen equals its far `capture-pane -p`; `echo far` and `Enter` reach it; `Up` in a far key recorder in application cursor mode arrives `ESC O A` through `type-key`; the far window's size unchanged; the machine's connection stopped: keys refused `unreachable`, nothing typed after it returns |
| S9 | Status: a stand-in at `needs_input`, a phone key: its status leaves `needs_input` as the desk's would; a dialog-shaped echo of the phone's keys **reads as the same echo typed at the desk, at HEAD and at the parent** (narrowed by the fix round of 2026-10-06: the clause first read "raises no `needs_input` for 10 s", which the verify measured false, 20 of 20 samples; the keys verb names no status setter but `noteUserInput`, which only releases an existing `needs_input`, and whatever reads a question off the screen reads the same rows whoever typed them, both unchanged by this phase, so the clause was a promise about the monitor and the arm now compares; without the parent the arm is UNREADABLE. After the parent's launch the scratch HOME's Claude registry files whose process is gone are swept, as `probe:p318` sweeps them: the registry reader keys by pane id and keeps the file it read last, and a parent's stand-in left `waiting` on a pane id HEAD reuses reads HEAD's session at needs input whatever was typed, the likeliest class of the verify's 20 of 20, which this round's three runs did not reproduce) |
| S10 | D8 live: a session drawing forged guard rows beside four others for 60 s while the monitor and a phone's poll read them: every session's status and every screen answer are its own (each stand-in names its session in its screen) |
| S11 | `app.log`, every file under the profile and HOME except the sessions' own saved screens, and `ps -ww` sampled every 500 ms through S3 to S8: no byte of any typed canary; keys log lines exactly D43's (one per session per quiet minute of `done`, one per other outcome) |
| S12 | `/v1/session` p50 at the parent and HEAD, and the monitor's tick time with one phone watching a dense screen, each printed; `/v1/session` within 50 ms of the parent's p50 |
| S13 | **The desk scrolled back**: the desk's own wheel through CDP parks a session in copy mode; a phone key: the pane leaves copy mode, the desk's scrollbar reads live by its next poll (its own state read through CDP), and the next desk wheel scrolls back as before (§13 item 5) |
| RN | **No regression**: ⌘J's rows and Catch Me Up's lines for the same sessions read the same at the parent and at HEAD (318's RN normalisation). Its projects sit under `/private/tmp/p337rn-<pid>` (the fix round of 2026-10-06): the stand-in cuts every row to its pane's width, and under the harness directory Claude Code's second option was 160 columns, so it lost `from this project` at the parent's 142 and not at HEAD's wider pane |
| RP | With `P337_PARENT_CHECKOUT` (`aebb4ce9`), a second Electron after the first, never at once: `/v1/screen` and `/v1/keys` 404 `route`; the stand-ins' logs gain no byte; the lines name neither; S10's forged rows misattribute at the parent (printed) |

`--grader-self-test` grades recorded fixtures of every arm, each clause shown red on its own break, and starts nothing.

### 7.8 `probe:p316`, arm group `screen` — the phone (`P316_ARMS=screen`)

Its machinery: one Electron, the stand-in Tailscale, the relay, Simulators one at a time by `withSimulator`.
`ios/TortieUITests/P316DriveUITests.swift` gains the steps `screen-open`, `screen-zoom`, `screen-rotate`, `screen-type`,
`screen-ctrl`, `screen-question`, `screen-select`, `screen-home`, `end-top`. Sessions are §7.7's.

| Arm | Simulator | Holds |
| --- | --- | --- |
| PS1 | 26.3 | A session's page: End's frame inside the navigation bar's trailing half, `ID.sessionEndBar` absent, the Conversation row above the Screen row |
| PS2 | 26.3 | The Screen over Claude inline, Codex and the shell: every row's accessibility label equals the Mac's `capture-pane -p` row (trailing blanks dropped); the drawn rows at the fitted size are the view's width to the pixel (a cell within half a point under the fit); the cursor's frame at (x × cell, y × cell) **from row 0's corner** (the fix round of 2026-10-06: the grid's element is the whole Screen, so the first grade compared the container with the window) |
| PS3 | 26.3 | Pinch out: the cell width grows; a swipe, a SLOW drag (pressed 0.1 s, moved at 300 pt/s) and a swipe up each move the content (the drags the verify's bisect used; the swipe up graded when the zoomed rows are taller than the view); landscape (`XCUIDevice.shared.orientation`), on a Screen opened afresh at its fitted size (a chosen zoom is kept sideways): the fitted ROWS grow; back on the session page: portrait |
| PS4 | 26.3 | Tap, type `echo hi`, return: the shell's pane holds `hi` on the next picture, the bytes in the probe's read of the pane exact; ctrl then `c` into a recorder: `03`; esc, tab, ⇧tab and the arrows: their bytes |
| PS5 | 26.3 | Codex's question: ↓ then ↓ pressed 50 ms apart: the stand-in's log holds ONE Down's bytes before the next picture reached the phone, the line `Waiting for the screen to redraw.` is drawn, and the second Down is not sent until a press after that picture |
| PS6 | 26.3 | Long press and drag over a row, Copy: the Simulator's pasteboard, read by the probe through `build/simulator-run.mjs` on the run's own device (never `booted`), holds the row's text (the helper gains that one read if it has none; without it the arm is UNREADABLE, never a pass); while selecting, a change on the Mac does not redraw the grid, and clearing the selection draws it |
| PS7 | 26.3 | Type, then Home at once with the relay holding the keys line before its handshake: nothing reaches the recorder in 20 s; back in the app the Screen reads again |
| PS8 | 26.3 | No owner check for any key (no `end-auth-up` event through PS2 to PS7); End top right: press, the Mac's confirmation, Face ID matched through `notifyutil`, the session reads Ended |
| PS9 | 18.3, the floor | PS1, PS2 (shell), PS3's drags (shell), PS4 (shell) and PS6 (shell): the drags and PS6 since the fix round of 2026-10-06, when the selection's long press became UIKit's on both runtimes |
| PSH | 26.3, hostile | `build/p316/hostile-door.mjs` screen and keys arms: a screen answer with a run past `cols`, a style index out of range, a colour not `#rrggbb`, `cols` 513, a `cursor.y` equal to `rows`, `unchanged` with a screen, a chunked answer, an answer that never comes (the line, then the next poll), a kept connection closed after its first answer (the read asked once more and drawn), an answer followed by a second unasked answer on the kept line (the line closed, the stray answer never drawn), an answer saying `Connection: close` (the next read on a new line), a 404 for keys (`Your Mac did not take it…`), a keys answer with another write id: each ends in its drawn line, the hostile door counting one POST per batch |
| PSP | 26.3, with `P337_PARENT_IOS` (`aebb4ce9`'s `ios/`) | no Screen row; End at the bottom |

`probe-p316.mjs --grader-self-test` gains the `screen` group's cases, each clause shown red on its own break.

### 7.9 The independent methods (four, one an attack) and the parent

1. **The attack**, live: S5 to S8, the hostile client's arms, PSH, and the verifier's own: a keys body whose `dialog` is a
   valid mark of ANOTHER session's window; a picture from before a resize; 64 `C-c` items (refused `malformed`, D17) and 64 single `C-c` writes as fast as the door takes them (each 50 ms or more apart at the pane, D42); `BTab` into a full-screen program
   in mouse mode; a `since` from another session; two phones polling one session while a third types; a poll held across a
   door switched off and on. Each asserted on the REASON and on the stand-in's or recorder's own log, never on the verb's
   report.
2. **Re-derive the screen**: the verifier's own reader of a styled capture (importing nothing of `src/main/screen`) and its
   own width check by tmux's cursor (print each row's text alone into a scratch pane and read `#{cursor_x}`, §14 M7's last
   arm), over every session S1 read: its rows, columns and colours equal the door's answer, cell for cell.
3. **Re-derive the keys**: a raw recorder of the verifier's own (not `key-recorder.mjs`) logs every byte S3, S4 and S8 send;
   each byte-compared with the encoding table the verifier derives from tmux by typing the same key names itself.
4. **The per-provider matrix**: rows Claude Code 2.1.287 inline, Claude Code full screen, Codex 0.160.0, Gemini (committed
   trust gate), Qwen (committed permission and idle), Antigravity, Cursor, OpenCode, Muse, Pi (committed screens), a shell,
   and a shell on another machine; columns: the Mac's composed text equals `capture-pane -p`; the styles round trip; the
   phone's drawn rows equal the Mac's (PS2, for the rows the Simulator arms drive); keys reach (live rows only). §14 M7
   fills the first two columns for every committed row at this step.
5. **The parent**: RP and PSP, and `measure:p337 C` at the parent (D8's 20 of 20 against HEAD's 0).

### 7.10 No regression against today

| Scenario | Today (`aebb4ce9`) | At HEAD | Verdict |
| --- | --- | --- | --- |
| A person who never pairs a phone | — | the control client compares two numbers per guard line; nothing else runs | same; S10 and RN measure it |
| A screen holding guard-shaped rows | answers misattributed on the shared client (§14 M3) | each answer its own | better |
| A paired phone after the update | reads, ends, presses, says | the door asks Allow once | the cost every route-adding phase pays; the CHANGELOG says it |
| `/v1/session` | refresh, reads, the reply's offer | plus one Boolean | S12 |
| The Session screen | End at the bottom | End top right; a Screen row | End's flow is 317's (PS8) |
| The monitor | captures over the shared client | the same, plus a phone's poll reads at most ten a second per watched session | S12 prints the tick time |
| A conversation's top line | "own output stays on your Mac" | "scrollback stays on your Mac" | a true sentence for a false one |
| `app.log` while a phone types | one line per write, writes rare | one line per session per quiet minute of typing, every refusal (D43) | same; without D43 typing would rotate the log in about 20 minutes |
| The desk scrolled back when a phone types | (no phone typing) | the pane leaves copy mode, as when the desk types | S13 measures the desk's own scroll state after it |
| A dialog-shaped echo of typed text (the fix round of 2026-10-06) | typed at the desk: needs input in 0 of 20 samples (three runs) | typed from the phone, and at HEAD's desk: 0 of 20 each (three runs) | S9 compares the three in every run; a status rule this phase does not move |

---

## 8. The CHANGELOG item

Under `## Unreleased`, `### Added`; the follow-up docs commit adds the link.

- `- From the iPhone app you can now open a session's own screen, the same rows and colours your Mac shows, and type into it with the keyboard, dictation and keys for Escape, Tab, the arrows, Control and Return, on this Mac or another machine, with Face ID only to end a session, which has moved to the top right. The phone shows the session at your Mac's width and never resizes it, so you zoom, scroll or turn the phone sideways to read it; keys sent while a numbered question is showing go one screen at a time and are refused if a new question has appeared, and your Mac asks you to allow the phone door again once after this update`

**Sentences this phase makes false, his to reword** (the integrator raises them; the smallest true edits are proposed, and
the commit body says the wording is his): Phase 316's item, "It only reads and ends sessions, so you still answer them on the
Mac" (already false since 318), proposed "Your Mac must be awake with Tortie open"; Phase 318's item, "Other agents'
questions and sessions on other machines are still answered on your Mac", proposed "Other agents' questions and sessions on
other machines show no buttons, and you answer them from the session's screen".

---

## 9. His checklist — NEW `build/p337/CHECKLIST.md` (the proof builder's)

For the ONE TestFlight build after this phase, in his words, each row saying what to open, press and see, then "Not covered
yet" and a table of where every word it names was found:

1. Run Tortie from main after 337, open Settings then Phone. **You should see** the door ask again, naming `keys` and `screen`,
   and `…and type into any session as you would at this Mac`. Allow.
2. On the iPhone, open a running Claude Code session. **You should see** `End` at the top right and no bar at the bottom, and
   a `Screen` row under `Conversation`. Open Screen. **You should see** the session as your Mac shows it, small; pinch it,
   drag it, turn the phone sideways.
3. Tap the screen, type a word, and press return. **You should see** it reach the session, on the phone and on the Mac, with
   no Face ID. Press ctrl then c in a shell running `sleep 100`. **You should see** the sleep stop.
4. Hold the microphone key and dictate a sentence. **You should see** it typed once, when you finish.
5. Ask Claude Code to run `ls` in a scratch folder and open its Screen. Press ↓ twice quickly. **You should see** one move,
   `Waiting for the screen to redraw.`, then the next.
6. Open a session on another machine's Screen and type into it. **You should see** it reach that machine, and your Mac's
   window for it keep its size.
7. Long press a row, drag, Copy, and paste into Notes. **You should see** that text.

8. Open a shell's Screen, type `exit` and press return. **You should see** the session end with no Face ID: End asks for Face
   ID, typing does not, as at your Mac.

**Not covered yet**: how it feels through Funnel (no stand-in can say; Phase 338 is built only if it feels laggy);
dictation's own behaviour (no Simulator has a microphone); a hardware keyboard on the iPhone; an iPad (333.4); the iOS
font cascade for the characters SF Mono lacks (a unit test measures each box; no picture is taken).

---

## 10. Builders, disjoint files, and who owns what is shared

Five builders in `/private/tmp/wt-p337` at once, on `aebb4ce9`. Each codes against the names pinned in §5. No file is in two
lists. Builders run `npm run -s typecheck` and the vitest files they own (or `xcodebuild build-for-testing` with
`-derivedDataPath …/scratchpad/p337/dd-<role>`, deleted before returning); they launch no Electron, boot no Simulator, run no
probe and no whole `npm test`; they never commit, stage or stash.

| Builder | Owns |
| --- | --- |
| **door** (the door, the contract, the composition) | `src/main/pocket/door/table.ts`, `door/limits.ts`, `door/wire.ts`; `src/main/pocket/writes.ts`, `routes.ts`, `facts.ts`, `pairing.ts`, `ipc.ts`, `server.ts`; `src/shared/ipc/pocket.ts`; `src/main/sessions/pocket-writes.ts`; `src/main/capabilities.ts` (the pocket, reply and screen wiring only); tests `src/main/pocket/__tests__/{writes,routes,pairing,facts,door-wire,server,ipc}.test.ts`, NEW `p337-body-caps.test.ts`, `src/main/pocket/__tests__/p318-body-caps.test.ts` (its `toEqual({ end: 512, choose: 512, say: 32_768 })` gains `keys: 16_384`, §Attack A25), `src/main/sessions/__tests__/p317-pocket-writes.test.ts`, `src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `build/p313/hostile-client.mts` and `hostile-client.mjs`; `build/p316/node-phone.mjs` (`screenRead`, `sendKeys`) |
| **screen** (the Mac's read and composition) | NEW `src/main/screen/{sgr,cells,cell-widths,palette,compose,read,watch}.ts` and their tests under `src/main/screen/__tests__/` (keys.test.ts excepted), NEW `src/main/screen/__tests__/sample.test.ts` (the one writer of the sample); `src/main/reply/input-row.ts` (D11's projection only; keep `RULES` frozen, conformance:pocket Y7) and NEW `src/main/screen/__tests__/input-row-parity.test.ts`; NEW `src/main/machines/remote-screen.ts` and its test; NEW `src/shared/screen-copy.ts` and its test; NEW `build/fixtures/screen/**` EXCEPT `forged-guards.ctl` |
| **keys** (the Mac's typing and the client fix) | NEW `src/main/screen/keys.ts` and `src/main/screen/__tests__/keys.test.ts`; `src/main/tmux/control-client.ts` (§5.7 only) and NEW `src/main/tmux/__tests__/p337-control-guards.test.ts` with NEW `build/fixtures/screen/forged-guards.ctl`; `src/main/machines/scroll-shapes.ts`, `scroll-order.ts` (§5.6 only) and NEW `src/main/machines/__tests__/p337-type-key.test.ts`; `src/main/machines/__tests__/p3201-scroll-shapes.test.ts` (it pins "seven rows ... exactly two not idempotent", `:119-131`; it becomes eight and three, §Attack A25) |
| **phone** (the Swift app) | `ios/Tortie/Door/DoorClient.swift`, `Door/Contract.swift`; `ios/Tortie/Screens/{DoorWords,SessionScreen,EndBar,Identifiers}.swift`, `Screens/ConversationScreen.swift` (its header comment only, which says nothing on the phone can type and the terminal's output is not here); NEW `ios/Tortie/Screens/{Screen,ScreenGrid,ScreenRows,ScreenGlyphs,ScreenSelection,ScreenKeyField,ScreenKeys}.swift`; `ios/Tortie/App/{TortieApp,AppDelegate}.swift`, NEW `App/Orientation.swift`; `ios/Tortie/Info.plist`; `ios/Tortie/Style/{Copy,Tokens}.swift`; `ios/Tortie.xcodeproj/project.pbxproj`; tests NEW `ios/TortieTests/{ScreenDecodeTests,ScreenRowsTests,ScreenGlyphTests,ScreenSelectionTests,ScreenInputTests,ScreenKeysTests,ScreenCoverTests,ScreenGridCostTests,P337ScreenTransportTests,EndTopTests,ScreenColourTests}.swift`, and `CopyTests.swift`, `TokensTests.swift`, `SettingsTests.swift`, `DoorVectorTests.swift`, `EndTests.swift` (for End's move), `InfoPlistTests.swift` (it pins portrait alone, `:51`) and `DoorClientTests.swift` (the one-shot request's `Connection: close`, kept) (§Attack A25) |
| **proof** (the gates, the probes, the words) | `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `build/conformance-machines.mjs` (appended conditions and the 102/103 widening), `build/p3201/ablation.mjs`, `build/machines-conformance-probe.mts` (only if 122 to 124 need its readings), `build/p316/{test-ios,hostile-door,probe-p316,vectors}.mjs`, `ios/TortieTests/Fixtures/vectors.json`, `ios/TortieUITests/P316DriveUITests.swift`; NEW `build/p337/{probe-p337.mjs,measure-screen.mjs,drive-screen.mts,key-recorder.mjs,CHECKLIST.md}`; `build/p318/stand-in.mjs` (the two appended ops); `build/scratch-machine.mjs` (D37); `build/simulator-run.mjs` (one read of its own device's pasteboard, for PS6, with `gate:simulator`'s fixtures if a new shape appears); `build/assert-electron-teardown.mjs` (167), `build/assert-import-boundaries.mjs` (the wall), `build/background-fixtures.mjs` if a new shape appears; `package.json` (`probe:p337`, `measure:p337`), `build/verification-checks.mjs`; `docs/design/phone/{Session,End,Conversation,index}.html`, `Link.html` (it draws the old sentence D31 replaces, `:64`, and `conformance:phonecopy` reads every mock), `Choice.html`, `Answer.html` and `Idle.html` (each draws `End session…` in the bottom bar D33 removes), and NEW `Screen.html`; `build/p318/probe-p318.mjs`, `build/p317/probe-p317.mjs` and `build/p3167/probe-p3167.mjs`, their HEAD `ROUTE_LINE`, `WRITE_LINE` and honesty constants only (each self-test reads the tree's `POCKET_ROUTE_IDS` and goes red on purpose when a route is added, and §7.1 runs `probe:p318`; their parent constants stay) (§Attack A25); `docs/research/136-the-phone-in-peoples-hands.md` (`:555` and `:608`, each edited in place to a bracketed `[337: …]` sentence pointing to research 139 and this spec, §11) |

**Shared files and their one owner.** `src/shared/ipc/pocket.ts` and `src/main/pocket/routes.ts` are **door**'s;
`src/main/screen/watch.ts`'s `ScreenWatch` and `readFresh` are **screen**'s and `keys.ts` codes against them; `Copy.swift`,
`Tokens.swift` and `project.pbxproj` are **phone**'s; `package.json`, `build/verification-checks.mjs` and the mocks are
**proof**'s; **`CHANGELOG.md`, `CLAUDE.md` and `docs/audits/contract-baseline.txt` are the integrator's** (the last must not
move); this file is the spec's, and the integrator appends "§As built — 337"; **`docs/BACKLOG.md` belongs to the main
session**.

**The integrator** checks the base first (§4.1); reconciles the pinned names across the five (`createScreenWatch`,
`ScreenWatch`, `readFresh`, `nudge`, `createScreenKeys`, `PocketKeysInput`, `PocketScreenAnswer`, `PocketScreen`,
`PocketScreenStyle`, `PocketScreenRun`, `PocketKeyItem`, `POCKET_SCREEN_KEY_NAMES`, the caps, `SCREEN_FORMAT`,
`SCREEN_TICK_MS`, `SCREEN_HOLD_MS`, `SCREEN_SETTLE_MS`, `SCREEN_KEYS_GAP_MS`, `KEYS_LOG_QUIET_MS`, `windowMarkOf`,
`nudge(sessionId, before)`, `typePhoneKeys`, `namedKeySequence`, the sentence names, `ScreenDoor`, `DoorLine`, `KeysBody`,
`ScreenKeyName`, `ScreenLayout`, `ScreenCover`); runs §7.1 whole except what needs the lock; `xcodebuild build-for-testing` Debug and Release for
the Simulator SDK and an unsigned Release device archive with `test-ios.mjs --read-app`; scans the delta for control, bidi,
zero-width and BOM characters and for duplicated blocks of ten lines or more; writes CHANGELOG's item and CLAUDE.md's rows;
appends "§As built — 337".

**The verifiers** (two lenses, each under the lock, phone slot first): Lens 1, the attack and the re-derivations (§7.9
methods 1 to 3, `conformance:pocket:hostile`, `measure:p337` including C at the parent, RP); Lens 2, the app runs
(`probe:p337`, `probe:p316` `screen` on 26.3 and 18.3, `test:ios` in Debug and Release on both, `probe:p318` and
`probe:controldeadline` once each). Each names the step it did that the builders did not.

---

## 11. What this sends to other phases and the main session

- **333.3 (See a Sample)**: its sample reader answers `screenDoor(_:)` with a door whose `read` decodes
  `build/fixtures/screen/sample-claude-2.1.287.json` through `Contract.swift`, whose `keys` acts on nothing and answers
  `done`, and every sample screen says it is a sample, the Screen included. The main session records this in a running-log
  line (333.3 is queued, so its entry is not edited in place).
- **333.6 and 333.9 (the store)**: research 136 §12.3's "It never shows or streams a terminal screen." becomes `[337: Inside a
  session it can also show that session's screen, drawn natively from text Tortie for Mac sends, and type into it.]`, and
  §12.4's "It shows records of the conversation and never a terminal." becomes `[337: • open a session's screen and type into
  it]`. Neither names SSH, remote desktop or remote control. The review notes add: "Open See a sample, a session, then
  Screen".
- **338 (the stream)**: built only if his own use finds this laggy. What it would replace is §5.3.2's watcher and §5.8.4's
  picture; the keys, the door's write, the refusal and the drawing stay.
- **318.1 (the message box)**: when it restarts, End is already in the top bar and the strip sits alone at the bottom.
- **Owed, named and not queued**: today's shared-client exposure (D8) is closed here; its CLAUDE.md row says so. The Claude
  registry reader's pid question (318's fix round) is unchanged. A class found while budgeting D40, pre-existing and not this
  phase's: the nonce memory prunes by the Mac's clock while a request's acceptance follows the phone's timestamp, so a phone
  whose clock runs ahead leaves its requests acceptable a little longer than they are remembered; the channel binding still
  holds every request to the paired phone's own connection. For the main session to queue or set aside.

---

## 12. What is NOT in this phase

**The refusals that stand.**

- **No live byte stream and no terminal emulator on the phone** (his ruling 4; Phase 338, only if needed).
- **No change to the size of any session**, no attach, no "take control", no claim of the size by the phone (his ruling 2).
- **No scrollback on the phone.** The Screen is the screen tmux shows now; the conversation is the history (his 316 ruling).
- **No mouse, wheel or trackpad events into a program**, and no Page Up, Page Down, Home, End, function keys or Alt: the key
  names are the 35 of D17.
- **No paste key and no pasteboard read**; Copy writes only, and the hidden field refuses the system's own paste and drop
  (D28), so a block of lines can never arrive as lines and Returns.
- **No redaction on the Screen** and no copy of it kept on the phone (D41).
- **No message box** (Phase 318.1), **no markdown** in the Conversation (still off), and **no face remembered** per session.
- **No Face ID on any key** (his ruling 3), and no switch for it.
- **No second write path, ledger or gate**; no field on `/v1/blocked` or any list answer.
- **No capture row on the carriage**: a remote screen is read through the exec plane.
- **No auto-repeat** on the key bar, and no hardware-keyboard shortcuts beyond what the hidden field receives.
- **No release.**

**The designs set aside.** A delta of changed rows per answer (whole answers are 0.5 to 4 KB on real screens); a
per-session memory of the last face; holding keys typed against a stale picture and sending them later (that is the late
Return research 135 measured); a TextKit view (rule z1 stands); resolving colours on the phone.

---

## 13. Open concerns handed to the verifiers

1. **The feel through Funnel is unmeasured** by rule (no real Tailscale). Echo time is the keys write's round trip plus at
   most one tick (the nudge) plus the poll's answer. His TestFlight use decides 338.
2. **The residual window of the one refusal**: between the final check's capture and the key landing. **Restated by the fix
   round of 2026-10-06 with the attack lens's in-app numbers**: the window is not only the control client's write (0.74 to
   0.82 ms p99 outside the app, §14 M4) but also main's latency between the capture's answer and the act and tmux's own lag
   in reading the program's output, and both grow with load. A key sent against a picture with no question was typed into a
   numbered question the program had already drawn 0.18 to 0.61 ms after the draw on a quiet Mac (4 of 57 and 3 of 115
   trials) and 1.35 to 27 ms after it at a load average near 200 (15 of 115); the trials were packed at the boundary on
   purpose, so these are window widths, not rates, and every key sent once the question was in tmux's screen was refused.
   On another machine the network's one-way time is added, during which a far agent can draw a question unseen, as it can
   under the desk's own typing over a far attach. The class is the desk's, whose window is a person's reaction time. Stated,
   not closed; a tmux-side guard on the act (comparing the fresh read's numbers at execution) is a later round's to
   weigh, and `src/main/screen/keys.ts`'s header says the same.
3. **Widths on another tmux**: 4,515 code points (Unicode 16 and 17 additions, 7 of them emoji) draw one column off on a
   machine running a tmux whose width table is newer than 3.7b's (D10), and a far tmux OLDER than 3.6a, which may take its
   widths from the system's own tables, can differ on more; the far side's own widths are not read.
4. **Dictation** cannot be driven in a Simulator. `ScreenInputTests` hold the marked-text rule; his checklist row 4 is the
   live check.
5. **A key into copy mode** leaves copy mode first (D19, as the desk does), so typing on the phone brings a scrolled-back Mac
   back to live, and the Mac's scroll state reads it at its next poll.
6. **Two phones** may type into one session; one write in flight per session holds them in turn, and each is refused inside a
   question once the other's keys moved the id.
7. **A full-screen program in mouse mode** gets no wheel from the phone; arrows and the keys it reads work.
8. **The duty cycle** caps a pathological screen's cost on main at about a fifth of a core per watched session; S12 prints it.
9. **`input-row.ts` through the new reader** (D11): its parity test copies the parent's reader verbatim; a verifier should
   re-run 318's `probe:p318` R5, R6 and R13 (the message gate) once.
10. **Face ID guards End and nothing else** (his ruling 3): typing `exit` and Return, or Ctrl-D, in a shell ends that session
    from the phone with no Face ID, as it would at the desk. His checklist says so (§9), so End's Face ID is not read as more
    than it is.
11. **A question only a named shape reads** (Qwen's; Claude Code's while its registry file is absent; Phase 321) reaches the
    one refusal only through the row's status, which moves on the monitor's tick (up to 2 s while the window is blurred);
    `conformance:choices` clause 19 keeps `detectShapes` to its one call site, so the keys verb cannot ask it. A key sent in
    that gap lands, as a key typed at the desk in the same gap would. Agents whose dialogs no reader knows (Gemini,
    Antigravity, OpenCode, Cursor) are never refused. Stated, not closed.
12. **The Screen is not redacted** (D41): it shows what the Conversation's redaction would hide, a pasted token or a printed
    secret included, behind the same mutual TLS, and the phone keeps none of it (no file, no log, no app-switcher picture).
13. **Typing inside a question is one key per picture** (D29): letters typed faster than the round trip into a question's own
    text field are not sent, and the line says so; outside a question nothing is dropped.

---

## 14. What the spec step measured, how, and the numbers

Every script is under `…/scratchpad/p337/spec/`, every output under `…/scratchpad/p337/spec/out/`. Each server was
`-L p337s-<pid>-<build>` under `TMUX_TMPDIR=/private/tmp/p337s-<pid>-<build>`, its pane commands run through `/bin/sh` with
`HOME` and `ZDOTDIR` scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `LANG=en_US.UTF-8`, no `TERM_SESSION_ID`, killed and its
directory removed in a `finally`. The stand-ins: `drawer.mjs` (writes a file of bytes, optionally inside the alternate
screen) and `recorder.mjs` (asks its terminal for named modes and logs every byte read with `process.hrtime.bigint()`).
History before and after every run: `732999 1791229874 | 23166 1790702242`, unmoved.

| # | Command | Exit | What it measured |
| --- | --- | --- | --- |
| M1 | `node m1-widths.mjs` | 0 | 57 characters agents draw: both builds agree on every width; ZWSP and a lone VS16 are width 0 and absent from the capture; `capture-pane -p` drops trailing blanks; `-e` keeps a styled trailing run and drops after it; `-N` pads to the line's allocated cells, not the pane width |
| M2 | `node m2-control.mjs` | 0 | A control client changes no size (120x40 throughout); the display read `0 39 1 120 40 0 0 0 0 0 0`; a full styled capture over the client p50 0.0646/0.0617 ms, p99 0.296/0.197 ms (3.7b/3.6a); spawned p50 2.219/2.765 ms, p99 7.80/6.57 ms; display+capture+display in one tick p50 0.122/0.116 ms, p99 0.333/0.253 ms; a captured row `%end 1 1 1` is written RAW inside the block on both builds, and `-C` does not escape it |
| M3 | `tsx m3-shipping-control.mts` (the shipping `TmuxControlClient`) | 0 | Four panes read pipelined, one drawing two guard-shaped rows: 20 of 20 trials misattributed on both builds (B read A's forged body, C read B, D read C); the control afterwards misattributed 10 of 20 (3.7b) and 1 of 20 (3.6a) |
| M4 | `node m4-keys.mjs` | 0 | 33 key names in 7 modes, both builds identical: arrows `ESC [ x` normally, `ESC O x` in application cursor mode; `C-<letter>` its control byte, `ESC [ 2 7 ; 5 ; n ~` under modifyOtherKeys 2; `BTab` `ESC [ Z`; kitty's push changes nothing. Text: `-H` exact for all 12 samples; `-l` over the control client exact except `$HOME`, which tmux EXPANDED (the quoting leaves `$` bare); `-l` as an argv dropped `x;`'s `;`. Key to read over the client p50 0.143/0.075 ms, p99 0.741/0.820 ms; size unchanged |
| M5 | `node m5-widthscan.mjs` | 0 | 8,013 cases in a two-column pane: builds differ on 7 (newest emoji); 281 sequences, the seven rules of D10; four `✌`/`☝` plus tone cases read as separate cells |
| M6 | `node m6-fullscan.mjs` | 0 | Every code point U+0020 to U+3FFFF but controls and surrogates, 260,031: 3.7b 925 ranges (2,332 zero, 135,461 one, 122,238 two), 3.6a 937 ranges; 4,515 differ in 22 runs, every one Unicode 16 or 17 (largest: U+323B0 to U+33479, 4,298). A hand table missed 387 of 7,844; the measured table is tmux's answer for each code point by construction, and with the rules the prototype composer matched 281 of 281 sequences (`check-widths.mjs`, `check-seq.mjs`) |
| M7 | `node m7-fidelity.mjs` | 0 | The census over the 16 committed `.ansi`: 0 basic, 283 256-colour (indices 1, 6, 16, 174, 211, 231, 237, 244, 246), 38 24-bit (8 values); every `.ansi` redrawn and re-captured: 40 of 40 rows equal in text and style, plain equal to `capture-pane -p`, composed 772 to 3,782 bytes, at most 180 runs and 13 styles; the 40 `.txt` screens: 1,600 of 1,600 rows equal, none over 120 cells; the alternate screen captured with `alternate_on` 1; five rows of CJK, emoji, ZWJ, flags, VS16, box, blocks, braille, Devanagari, Hangul jamo, a keycap and every attribute: the composer's cells equal tmux's cursor (22, 29, 51, 51, 21) |
| M8 | `node m8-worst.mjs` | 0 | Every cell its own colours: 120x40 styled 132,861 bytes, composed 243,884, capture 1.92 ms, compose 6.20 ms p50; 250x70 500,261/899,442, 6.31 ms, 24.7 ms; 400x120 1,378,867/1,823,246, 17.1 ms, 66.7 ms |
| M9 | `node m9-remote.mjs` (a loopback sshd of its own: one key made for the run, `AuthorizedKeysFile` scratch, `PermitUserRC no`, `UsePAM no`, `SetEnv ZDOTDIR=<scratch> HISTFILE=/dev/null TMUX_TMPDIR=<scratch>`; the client `-F /dev/null -o IdentitiesOnly=yes -o IdentityAgent=none -i <scratch key> -o UserKnownHostsFile=<scratch>`) | 0 | The far environment read `ZDOTDIR` the scratch `zdot`, `HISTFILE` `/dev/null`, `TMUX_TMPDIR` the scratch `tt`, `SHELL` `/bin/zsh`; an exec capture over the shared connection p50 8.97/10.33 ms, p90 13.3/11.9 ms; the control carriage's capture p50 0.105/0.120 ms; `cancel` + `-H 61` p50 0.097/0.095 ms, p99 0.443/0.485 ms; named keys through the carriage in application cursor mode: `Up` `1b4f41`, `Escape` `1b`, `Enter` `0d`, `BTab` `1b5b5a`, `C-c` `03`, `Tab` `09`, `BSpace` `7f`; the far window 120x40 throughout; no process of the run left |
| M10 | `tsx m10-keepalive.mts` (the shipping `createDoorListener` with a fake main; throwaway `openssl` keys) | 0 | Two requests on one TLS connection: both 200 in 2 ms, `Connection: keep-alive`, `Keep-Alive: timeout=5`; idle close at 6,003 ms; a read held 10 s answered at 10,003 ms; held 16 s, the door's 404 at 15,005 ms with the connection still kept; a fifth connection from one source refused `source-cap` |
| M11 | `node m11-copymode.mjs` | 0 | With the pane in copy mode scrolled back 20, `capture-pane -p` returns the live screen on both builds |
| M12 | `node m12-composecost.mjs` | 0 | Compose over the 16 real captures ×200: p50 0.040 ms, p99 0.227 ms |
| M13 | `node m13-sized.mjs` (a "Mac" client: `tmux attach` in a 160x45 pty by `attach-pty.py`) | 0 | 80x24 → 160x45 when the Mac attached; 160x45 after 100 three-line reads and 150 key commands over a control client; 50x30 the moment a second ordinary client attached at 50x30 (the control) |
| M14 | `node -e` (sha256 of the ten sorted `METHOD path` lines) and `printf … \| shasum -a 256` | 0, 0 | `16115392e007ad274fc815f4c8456624f58fd534558be4eaad7d154c59e9b061` both ways; the current eight lines `d95ecd27…`, equal to the gate's pin |
| M15 | `node -e` (`JSON.stringify` of the worst keys bodies) | 0 | 1,024 C0 bytes in one item 7,359 bytes; in 64 items 6,981; 256 astral characters escaped as pairs 4,287; 64 names 1,221 |
| M16 | `node m16-guards.mjs` (200 commands over a control client, a `run-shell -b` among every ten) | 0 | 201 guard pairs on each build (the greeting's and the 200): every `%end` carried its `%begin`'s number, time and flags |

The fixtures of §7.4 were written from M4, M5 and M6 by one `node -e` (exit 0): `fixtures/tmux-widths.json` (29,626 bytes),
`fixtures/tmux-sequences.json` (13,898), `fixtures/keys-encoding.json` (14,971, the scratch HOME's expansion replaced by a
placeholder).

**Not measured here, each named where it is owed**: Funnel's round trip (§13 item 1); the phone's drawing, memory and gestures
(§7.3, §7.8); dictation (§13 item 4); the real Claude Code and Codex (no model turn; the committed captures stand for them);
the loopback machine through `build/scratch-machine.mjs` (D37 first).

---

## 15. Questions for him

None blocks the build. Two are his when he next looks:

1. **Copy writes the screen's text to the iPhone's clipboard**, which Universal Clipboard can carry to his Mac. Default: yes,
   as built; a person selects and presses Copy each time.
2. **The confirm line's clause**, `type into any session as you would at this Mac`, is the plainest true sentence for a write
   that can run a command in a shell. Default: as written.

---

## §Attack — the adversary's round, 2026-10-05

Written by the adversary in `/private/tmp/wt-p337` before any builder started, and then folded into the sections above IN
PLACE: every row it moved names the finding (`§Attack An`). It started no Electron, no Simulator, no agent and no model turn;
it read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or his live profile; its scratch tmux servers were
`-L p337a-<pid>-<build>` and `-L p337g-<pid>`, each under its own `TMUX_TMPDIR`, killed and removed in a `finally`; and
`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `732999 1791229874` and `23166 1790702242` before and after every
command that started a shell or a server. Weaknesses are stated by class.

### What it did that the spec step did not

It measured how a PROGRAM reads keys written together (AM1, AM2), measured the phone's own font against every character the
committed captures hold (AM3 to AM6), compared Paseo's glyph table with what agents draw (AM7), read the gates that the new
files will meet (rule (p), Y7, `conformance:choices` 3 and 19, the 318 and 320.1 tests, the probes' route self-tests), and
followed the door's stop, revoke and log paths to their bounds.

### The findings, and where each was folded

| # | Weight | Class | Evidence | Folded into |
| --- | --- | --- | --- | --- |
| A1 | major | Keys written together are read as one input, so `Escape` then a key becomes Meta-key (and `Escape` then `Enter` Meta-Enter, which inserts a line rather than submitting) | AM1: `Escape` + `-H 62` in one statement read as ONE `1b62`, `Escape` + `Up` as `1b1b5b41`, 3 of 3 on 3.7b and 3.6a and through the spawned list; 100 ms apart, two reads. AM2: a reader busy 25 ms after its previous input reads writes up to 10 ms apart as one (10 of 10), 20 ms or more apart as two (0 of 10). The spec gathered up to 64 items a write (D29, D30) and cited Paseo's OUTPUT coalescing for it | D17 (a named key other than `BSpace` alone), D29, D30, NEW D42 (`SCREEN_KEYS_GAP_MS` 50), Z3, Z20, K, S5(g) |
| A2 | major | Characters the phone's cell font lacks draw at their fallback font's width, so every cell after one in a run drifts | AM4 to AM6: 18 of 69 distinct non-ASCII characters in the captures are not in SF Mono; advances 0.81 to 2.29 cells (`⏺` a colour emoji 2.29 cells wide, `⎿` 1.49); 118 of 2,325 rows, 32 of 56 screens, 21 of them Claude Code's. Paseo's renderer splits runs on style and its own glyphs only, so it has the same class | D26, §5.8.4 `ScreenLayout`, (ap), `ScreenRowsTests` |
| A3 | major | The ported glyph table misses box and block characters agents draw, which would then mix font glyphs with drawn shapes | AM7: Paseo's 55 code points lack `╌` (1,676 occurrences, the second most common non-ASCII character in the captures), `═ ║ ╔ ╗ ╚ ╝`, `░ ▓`; a transcribed table is also a derivative carrying Apache-2.0's notice duties into the shipped app | D26, §5.8.1, §5.8.4 (shapes derived from Unicode names; AM8: 160 names, 37 words), (ap), `ScreenGlyphTests` |
| A4 | major | A gate that is red as specified: rule (p) counts any `UIPasteboard` mention, written or read, as a pairing code entering, and requires a watched name | `build/conformance-ios.mjs:2383` (`CODE_SOURCES`), `:2504-2520` | (al) and (p) narrowed to the one Copy statement, with self-tests both ways |
| A5 | major | The question lock on the phone depended on which of two connections delivered first, and could wait out the whole 10 s hold | D29 as written: "a picture that ARRIVED after the last batch's answer"; the poll's answer to the act can beat the keys answer, and is then ignored until the screen changes again | D29 (the lock reads the `turn` the Mac moves at the act), §5.8.5, (ai), `ScreenKeysTests` (the race) |
| A6 | major | A 30 ms nudge answers before agents redraw, handing the phone a turn-only picture whose next key inside a question is refused as `changed` | D4 as written; Ink and ratatui throttle frames past 30 ms; the revision covers the turn (D14) | D4 (answer at the first read whose window mark moved, or 300 ms), §5.3.2, Z21, `watch.test.ts`, S5(f) |
| A7 | moderate | A held poll awaited its session's read, so a remote read (deadline 2 s) outlasted the door's stop join, and reads could overlap | `src/main/pocket/bind.ts:461-508` joins every request within `DOOR_STOP_JOIN_MS` 1,000 (`door/limits.ts:37`); 400 ms ticks against a 2 s deadline allow five reads at once | D3, §5.3.2 (each poll's own 100 ms timer, one read in flight), Z10, Z21 |
| A8 | moderate | The control client being down turned every read into three process spawns, 30 a second per watched session | D5 as written | D5, §5.3.3 (one spawned list per read, split by count, tick 400 ms), Z21 |
| A9 | moderate | Text with line breaks became lines and Returns, so a paste or a dictated block would run line by line in a shell | D28 as written (`\n` as `Enter` for any replacement); Paseo swallows any change holding a line break (`terminal-input.native.tsx:148-152`); the field took the system's paste | D28, §5.8.5, (aj), §12, `ScreenInputTests` |
| A10 | moderate | The Screen is unredacted, and iOS keeps a picture of an app leaving the foreground on the device | the Conversation's redaction does not reach the Screen; the app draws no cover today (no `scenePhase` cover anywhere in `ios/Tortie`) | NEW D41, (ao), `ScreenCoverTests`, D35's sentence, §12, §13 item 12 |
| A11 | moderate | One log line per keys write rotates the diagnosis log out in about 20 minutes of typing | AM9: 176 bytes a line in `buildLogLine`'s shape; `LOG_MAX_BYTES` 2 MiB (`src/main/log/transport.ts:23`); `writes.ts:483` logs every write | NEW D43, §5.5, Z22, hostile arm, S11, §7.10 |
| A12 | moderate | Kept lines held door slots while idle, and a kept line could read stray bytes as its next answer | M10: an idle kept connection closed at 6,003 ms; the per-source cap is 4, and Funnel makes one network one source; D25 had no rule for bytes past `Content-Length` | D25, §5.8.2, (ak), PSH, `P337ScreenTransportTests` |
| A13 | minor | A per-session answer floor made one phone's poll wait on another's answer | §5.3.2 as written ("per session") | D40, §5.3.2, Z19 |
| A14 | minor | "Exactly as the Mac draws" holds at the default appearance only | `src/renderer/terminal/theme.ts:319-333` takes `--bg-canvas` and the chrome theme's ink | D12 |
| A15 | minor | Two files had a writer other than their owner | the sample JSON (screen's) written by proof's `measure:p337 --sample`; `forged-guards.ctl` (screen's) read by keys' test | §7.4, §10 (screen's `sample.test.ts` writes it; keys owns the stream) |
| A16 | minor | The composer's window mark comes from a module that reaches the monitor | `src/main/reply/reader.ts:41-61` imports `../activity/monitor` | §5.3.4 (`windowMarkOf` once, the two imports named), Z12 |
| A17 | info | Phase 336.1 landed under this worktree's base | `47c3c79e`, `b989a0ed` on origin/main; `/private/tmp/wt-p3361` gone; its four shared files edited in regions 337 does not touch | §0, §4.2 (337 lands second, replays by blocks) |
| A18 | info | D37 stops the harness reading his keys, not the app's own ssh reading his ssh client configuration | `build/scratch-machine.mjs:103-128` reads `~/.ssh/*.pub` and `ssh-add -L`; OpenSSH takes `~` from the account record | D37 (stated) |
| A22 | info | End's Face ID can be stepped around by typing | his ruling 3: no Face ID on keys; `exit` or Ctrl-D in a shell ends it | §13 item 10, his checklist row 8 |
| A23 | info | A question only a named shape reads reaches the refusal one monitor tick late | `conformance:choices` clause 19 holds `detectShapes` to one call site; the row's status moves on the tick | §13 item 11 (stated, not closed) |
| A24 | moderate | A row at the top zoom could pass the GPU's texture bound, and a font change mid-pinch redraws every row | 512 columns × 11.1 pt × 3 is about 17,000 px against 16,384 | D27, §5.8.4, `ScreenGridCostTests` (memory owed, with a stated ceiling) |
| A25 | major | Files no builder owned would turn the battery red | `src/main/pocket/__tests__/p318-body-caps.test.ts:76` pins the caps without `keys`; `src/main/machines/__tests__/p3201-scroll-shapes.test.ts:119-131` pins seven rows; `ios/TortieTests/InfoPlistTests.swift:51` pins portrait; `docs/design/phone/Link.html:64` draws the old sentence and `conformance:phonecopy` reads every mock; `probe-p318.mjs:205-206, 553, 822-825` (and p317's, p3167's) pin the route line and go red on purpose when a route is added | §10 (door, keys, phone, proof each gain theirs) |

A19 to A21 are below, with what held.

### Attacked, and it held

- **Anything that could resize his Mac's session.** The shipping control client is attached to its own `gmux-control`
  session with no size (`CONTROL_ATTACH_ARGS`, `src/main/tmux/control-client.ts:113-125`; it never sends `refresh-client
  -C`), and tmux ignores a control client's size until it sets one, so a `send-keys` it sends for another session's pane
  cannot make that window follow it; the far carriage uses the same arguments; M13's control client was on its own session
  too, and the Mac client stayed 160x45. `copy-mode -q`, `capture-pane` and `display-message` size nothing. The only resize
  left is a person typing tmux's own resize command into a shell inside the session, which is his act (A19).
- **A Remove during a held poll.** The listener destroys a revoked socket that has no write in flight at once
  (`listener.ts:666-672`), and refusal 7 asks the phone again after main answers (`server.ts:197-205`), so no screen leaves
  after a Remove; a hostile arm now holds it (A20).
- **D8 on other tmux builds.** tmux writes one item's time and number on both its guards; the match is on number and time,
  not flags, so it costs a real answer nothing on any build that frames blocks this way (A21).
- **Door capacity overall.** Thirty-two connections hold sixteen phones each typing on a Screen; main reads each watched
  session at most ten times a second however many phones wait on it.
- **The poll keeping the Mac busy.** About 0.12 ms of control-client time a read and 0.04 ms of composing on real screens
  (M2, M12); the watcher stops reading within one hold of the last poll; remote reads are 2.5 execs a second for a watched
  session on another machine, the exec plane's own ledger reads (`exec-plane.ts:405-440`, `:595-607`).
- **The App Review framing.** Every new word says "screen"; none says SSH, remote desktop or terminal app; the Screen is
  reached only inside a session and Conversation stays first; See a Sample is handed a canned Screen (§11). Nothing here
  moves that framing.
- **The lifted refusal kept by a gate.** No conformance rule spells "no raw terminal"; the words that did (`Copy`, the
  honesty sentence, research 136's drafts, the mocks) are each owned by a builder now, Link.html included (A25).

### The measurements, run rather than read

Scripts and outputs under `…/scratchpad/p337/adversary/`.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| AM1 | `node a1-escape.mjs` (vendored 3.7b and Homebrew 3.6a, a raw-mode reader logging each read) | 0 | `Escape` + `-H 62` in one statement: `["1b62"]` 3 of 3 each build; `Escape` + `Up`: `["1b1b5b41"]` 3 of 3; with `copy-mode -q` first: `["1b62"]`; 100 ms apart: `["1b","62"]`; spawned `send-keys … Escape ; send-keys … -H 62`: `["1b62"]` |
| AM2 | `node a2-gaps.mjs` (3.7b; ten trials a gap, an `x` written 5 ms before each pair) | 0 | idle reader, one read: gap 0 ms 9/10, 1, 5, 10, 20, 30, 50, 100 ms 0/10; reader busy 25 ms after each read: 0, 1, 5, 10 ms 10/10, 20, 30, 50, 100 ms 0/10 |
| AM3 | `node -e` census of `.txt` and `.ansi` under `build/fixtures` and `src/main/activity/__tests__/fixtures` | 0 | 56 screens, 71 distinct non-ASCII characters (top: U+2500 6,298, U+254C 1,676, U+00A0 574, U+2588 422) |
| AM4 | `xcrun swift glyphs.swift chars.json` (CoreText, `NSFont.monospacedSystemFont` 12 pt, macOS's SF Mono) | 0 | cell 7.418 pt; 69 checked (U+00A0 and U+FE0E skipped); 18 not in the font, 18 advances off the cell, 125 occurrences: U+23FA, U+23F8, U+2714, U+26A0, U+23F3, U+2139 Apple Color Emoji 17.0 pt (2.292); U+23BF Hiragino 11.08 (1.494); U+280F AppleBraille (1.106); U+23F5 STIX (0.814); U+276F, U+273B, U+25D0, U+25C6, U+279C, U+25A3, U+25B3, U+21C6 Menlo (0.974); U+2234 Monaco (0.971) |
| AM5 | `xcrun swift vs15.swift` | 0 | with U+FE0E: U+23FA and U+23F8 STIX 7.56 pt, U+23F3 STIX 7.27, U+2714, U+26A0, U+276F Menlo 7.22, U+2139 Apple Symbols 7.92, U+23BF still Hiragino 11.08 (so the scale-down stays) |
| AM6 | `node -e` row census for the 18 | 0 | 118 of 2,325 rows; 32 of 56 screens (Claude Code 21, Cursor 3, Qwen 3, Codex 2, Gemini 1, OpenCode 1, shell 1) |
| AM7 | `node -e` over Paseo's `terminal-custom-glyph.ts` (read only) | 0 | 55 code points; missing among those agents draw: U+254C, U+2591, U+2550, U+2551, U+255D, U+255A, U+2557, U+2554, U+2593 |
| AM8 | `xcrun swift names.swift` | 0 | U+2500 to U+259F: 160 names, 37 distinct words |
| AM9 | `node -e` one keys log line in `buildLogLine`'s shape | 0 | 176 bytes; 2 MiB at ten a second in 19.9 minutes |

**Not measured here, and owed**: the iOS font cascade (the phone's own fallbacks differ from macOS's; `ScreenRowsTests` on the
Simulator measures every box), the grid's memory (`ScreenGridCostTests`), how real Claude Code and Codex parse a burst holding
`Enter` (no real agent may run; D17 keeps every named key alone, so no burst holds one), and dictation (§13 item 4).

---

## §As built — 337 (the integrator, 2026-10-05)

Written by the integrator in `/private/tmp/wt-p337` after the five builders returned. It started no Electron, booted no
Simulator, ran no probe, no agent and no model turn, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain or
his live profile, and committed, staged and stashed nothing. `git rev-parse HEAD` read `aebb4ce9…` and nothing was staged
before and after.

### The base and the delta

`git diff --stat aebb4ce9`: 86 tracked files changed (10,836 insertions, 840 deletions) and 55 new files, every one in a §10
list or the integrator's own (`CHANGELOG.md`, `CLAUDE.md`, this section) or named below. `git diff aebb4ce9 -- src/main/menu.ts
docs/audits/contract-baseline.txt src/main/activity src/renderer/terminal src/main/attach` is empty (0 lines), and under
`src/renderer` only `src/renderer/settings/__tests__/p316-phone-section.test.tsx` moves. **The replay (§4.2)**: origin/main
moved while this role ran, to `75c53409`: 336.1's `47c3c79e` and `b989a0ed`, `c10a5892` (a machines fix in
`src/main/machines/tailscale.ts`, its tests and `add-machine.test.tsx`, none of them in this delta) and five backlog commits,
two of which record his rulings of 2026-10-05 (the session page opening on the terminal, folded into 337.1 and not into
this phase; and his delegation of the 337, 337.1, build 7 chain to the main session). A three-way `git merge-file` of the
four shared files, this delta against `aebb4ce9` and origin/main, merged with **0 conflicts** each, against `7b610f7d` and
again against `75c53409`: `build/conformance-machines.mjs`,
`build/machines-conformance-probe.mts`, `build/scratch-machine.mjs` and `CHANGELOG.md` (the 337 item sits right after 318's
item, with one unchanged item between it and the line 336.1 reworded). The replay itself and the battery on the merged tree
are the committer's.

### What the integrator changed, and why each

1. **`conformance:manager` T23 was RED at the builders' tree, and no builder had run it** (`src/main/sessions/pocket-writes.ts`
   is in its trigger list). §5.3.1 and Z14 prescribed `SCREEN_LIVE = ['running', 'idle', 'needs_input']` in `routes.ts`, a
   second live-status set; T23 (Phase 303, re-pointed by 316.7) holds `routes.ts` and the session domain to ONE, the gates'
   `live`, because a second spelling is one more place for the two to drift. The spec was wrong, not the gate, so the gate is
   unedited and the Screen now asks the gates: `screenLive(session)` in `src/main/pocket/routes.ts` answers
   `sessionActionGates(session, session.status, DOOR_GATE_ENV).live` and names no status; `session()` sets `screen:
   facts.screen !== undefined && screenLive(session)`; `src/main/screen/watch.ts` asks `screenLive(row)` at its two sites; the
   `SessionStatus` import `routes.ts` no longer needs is dropped; `routes.test.ts` holds `screenLive` true exactly for running,
   idle and needs_input over all seven statuses. **Z14 is rewritten** in `build/conformance-pocket.mjs` (the one assignment,
   `screenLive` declared once as that one return naming no status, the watcher asking it and holding no status list), and
   `build/ablation-p313.mjs` re-anchors `Z14a` and adds `Z14b` (the live test spelled as a status list) and `Z14c` (the watcher
   deciding by its own list), each red on Z14 alone (`P313_ONLY=Z14a,Z14b,Z14c`, PASS in 53.2 s). The behaviour does not move:
   the gates' `live` is exactly the three statuses.
2. **`CopyTests` would have been red on the Simulator.** It asserts `Session.html` draws `>Screen<`; the proof builder's mock
   drew the word on its own line inside the row's anchor (`>\n    Screen\n    <svg`). Proved on the Mac with the shipping
   `CopyTests.swift`, `Copy.swift` and `StyleSource.swift` compiled by `xcrun swiftc` under a ten-line XCTest stand-in: the
   builders' mock FAILS "the mock does not draw Screen" (1 failure), the fixed one passes all nine tests. `docs/design/phone/
   Session.html` now draws `<span>Screen</span>`, and `build/p311/copy-drift.mjs`'s self-test mutation "the Screen row renamed
   in the mock" is re-anchored on the span (it went red as "produced no finding naming Terminal" until it was).
3. **`gate:simulator` gains rule 9, the handle's pasteboard** (§6.5's "a fixture each way", which the proof builder handed on):
   `build/assert-simulator-teardown.mjs` refuses `pbpaste`, `pbcopy` and `pbsync` in any file under `build/` that names
   `simctl` and a whole `simctl pbpaste|pbcopy|pbsync …` command line anywhere, holds the handle's `pasteboard()` to no
   parameter, exactly `['simctl', 'pbpaste', udid]`, an owned child, and the verb nowhere else in the helper, with five new
   fixtures (three caught: an argv read, a whole command line naming the booted device, an argv write; two left alone: the
   handle's own `sim.pasteboard()` and the Mac's own `pbpaste` in a file that never names `simctl`) and five helper
   ablations (a caller-named device, the booted device, not owned, a write, no `pasteboard()`). PASS: 16 of 16 bad fixtures
   caught, 13 controls left alone, 33 of 33 helper ablations red; each new scanner clause, removed in a scratch copy, left its
   own fixture uncaught.
4. **`CHANGELOG.md`**: §8's item, verbatim, under `## Unreleased` → `### Added`, with no link (the follow-up docs commit adds
   it). **`CLAUDE.md`**: the pocket row names `src/main/screen/**` and the two rows; a NEW row for the Screen and the keys
   (`conformance:pocket`, `conformance:pocket:hostile`, `conformance:machines`, `measure:p337 -- --check`); the machines row
   the eighth carriage row and conditions 122 to 124; the ios row (ah) to (ap), the widened (ab), (ac), (k), (v) and build 7;
   `probe:p316`'s row one sentence for `P316_ARMS=screen`; and NEW probe rows for `probe:p337` and `measure:p337`.
5. **`docs/audits/contract-baseline.txt` is NOT regenerated.** The task's computed text asked for it "(the route list moves
   on purpose)", but D36 and §3 row 5 say the route ids are none of what the inventory names, and the same task's own check
   requires that file's diff empty; `gate:contract` reads it byte for byte (inside `npm run build`), so nothing moved.

### The builders' departures, kept, each with its reason

- **door**: the screen query's `id` is 1 to 128 characters compared for equality, not `isSessionsId` (whose lowercase-first,
  32-character rule would refuse every UUID Tortie mints; 128 is the writes' bound); `PocketReplyRefusal` gained `unreachable`
  (internal; the wire's `PocketWriteReason` is unchanged); the quiet-minute map is pruned at the ledger's 120 s life so
  `logs()` alone decides the 60 s boundary; M15's 7,359 bytes re-derived as one 1,024-control-byte item plus 63 `BSpace`.
  `POCKET_SCREEN_KEY_NAMES` is `[…] as const` and read-only by type, not `Object.freeze`d at run time (the spec's comment said
  "Frozen"); every reader compares with `===` and nothing writes it.
- **screen**: a tab is a cell of its own run spanning to the next multiple of 8 with the text `\t`, so composed text equals
  `capture-pane -p` (tmux 3.7b prints a tab literally; a program that moves its tab stops draws one span off), while
  `input-row.ts`'s projection still reads a tab as unreadable, as at the parent; the display separator is a tab or `_` (tmux
  under `LANG=C`, and Phase 320.1 measured the same over a machine's own sshd); three plane-14 zero-width ranges beyond the
  spec's scan; the revision hashes the session id and the `needs_input` bit (asking follows from the capture and that bit);
  `typable` is true on every composed screen (stated: on another machine the carriage can be down while the exec works, so
  the keyboard can rise and a key be refused `unreachable` with `SCREEN_NOT_TYPABLE`); the composer stops early past a cap;
  `58;5;n`/`58;2;…` read as colour, not attributes, which only makes the message gate fail closed, named by its own test and
  kept out of the parity corpus.
- **keys**: the gap's last-act time is written after the act and the verb does not serialise two calls on one session itself;
  the door's step 3 does (one write in flight per phone AND per session across verbs, `writes.ts`, read by the integrator),
  so a second keys write on a busy session is answered `busy`; an empty text answers `empty` and an oversized one `long`
  (the door's parse stops both first); a screen over 512 columns or 200 rows takes no key (`unreachable`); `typePhoneKeys` also
  refuses a connection whose first read could not be read (320.1 D10) and checks every argv before the first write.
- **phone**: the key sender lives as long as the Screen, so `stop()` (from `wentAway` or the Screen going away) pairs with
  `resume()` when the Screen is back on top, and keys dropped by a stop never come back; two identifiers beyond §5.8.7,
  `screen-loading` and `screen-failure`; `Copy.copy` owned by `src/renderer/terminal/terminal-menu.ts`'s `label: 'Copy',`.
- **proof**: S5(g) and arm K grade the verb's own gap (its `onLastCheck` stamps) at 50 ms exactly and the reads at the
  recorder 50 − `LANDING_SLACK_MS` (2) ms, the slack measured and written in the file, because a key's landing varies by about
  a millisecond while the Mac's gap does not; `P316DriveUITests` raises the keyboard before the key bar's steps, waits 5 s
  before PS7's Home and presses PS5's two Downs as one `doubleTap()` (each correct by reading only; the 26.3 run is the
  verifier's); rule (t) of `conformance:ios` widened to every `connect(` presenting `door.identity`.

### Checked and left, each by its class

- **Duplicated blocks of ten lines or more** (a scan of every added line of the delta against `src/`, `build/` and `ios/`):
  the input-row parity oracle (the named exception, the parent's reader copied verbatim; `sgr.ts` and the unchanged half of
  `input-row.ts` match it by construction); `DoorWords.keysSentence` repeating `replySentence`'s switch, which rule (v) asks for
  by reading each sentence function's own arms; `conformance-machines.mjs`'s block-scoped `bodyOf` (the file's convention,
  one copy at the parent); and the probe, measure, hostile-door and node-phone harness blocks shared with `probe-p317`,
  `probe-p318`, `probe-p3167`, `probe-p330`, `probe-p332` and `drive-writer.mts`, which already repeat them among themselves.
  None extracted.
- **Control, bidi, zero-width and BOM characters**: 0 new in all 141 delta files. One new U+00A0 per line on two lines of
  `ios/TortieTests/Fixtures/vectors.json`, inside the screen answer composed from Claude Code's committed capture: the
  capture's own U+00A0 after `❯`, §0's named exception.
- **Owed, not this phase's to close** (for the main session to queue or set aside): the remote execution ledger's
  in-memory list of settled executions grows without a bound for as long as Tortie runs, and a phone watching a far
  session adds one entry per remote read (2.5 a second), so watching a far Screen for an hour adds about nine thousand small
  records to main's memory; and a far read that keeps failing with a live address writes one ledger log line per failed exec
  (as every remote reader already does), so a far Screen whose exec fails on every tick writes about 2.5 lines a second until
  the phone stops watching. Both are classes of the shared ledger, present before this phase, which this phase uses more
  often while a phone watches.
- **Sentences his to reword** (§8, the integrator raises them and edits neither): Phase 316's item, "It only reads and ends
  sessions, so you still answer them on the Mac", false since 318 (proposed: drop that clause, keeping "your Mac must be awake
  with Tortie open"); Phase 318's item, "Other agents' questions and sessions on other machines are still answered on your
  Mac", false after this phase (proposed: "Other agents' questions and sessions on other machines show no buttons, and you
  answer them from the session's screen").

### The battery, run on the integrated tree

Every command from the worktree, in this order, with the history read before and after each that started a shell or a
server. The three ablations run in `cp -Rc` clones; edits to the worktree while one runs reach its restores, so the first
runs of `ablation:p313` and `ablation:p320`, started before the T23 fix, were ended (by the pids the integrator started, the
clone removed after its last check exited) and run again on the final tree.

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries 0 violations over 1,414 production files; no runtime cycles; run before and after the T23 fix (the fix's first typecheck was red on the unused `SessionStatus` import, then 0) |
| `npm run build` | 0 | 41 s. `gate:electron` 167 against a floor of 167; `gate:background` 3 starters, 19 of 19 fixtures; `gate:simulator` 531 scripts, 2 against a floor of 2, 16 of 16 bad fixtures caught, 13 controls, 33 of 33 helper ablations red; `gate:knownhosts` 561 files; `gate:checks` 259 check scripts classified; `conformance:ios` 40 rules over 45 app files, 54 test files, 110 files; `gate:contract` byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | 0 | 61 s; 1,086 files passed, 2 skipped; 19,839 tests passed, 14 skipped |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` | 0 | 49 s; `release/` 850 MB, removed |
| `conformance:pocket` | 0 | 119 rules, 17,114 checks (17,131 before Z14's rewrite) |
| `conformance:pocket:hostile` | 0 | 221 arms, 13.2 s, before and after the fix |
| `ablation:p313` | 0 | 352 of 352 (350 and Z14b, Z14c), 1,840.7 s |
| `conformance:machines` | 0 | 20.6 s |
| `ablation:p320` | 0 | 114 of 114, 1,452.3 s |
| `conformance:manager` | 1, then 0 | RED at the builders' tree, T23 (1 of 64 rules); 64 rules, 2,688 checks after the fix |
| `conformance:choices`, `conformance:handback`, `conformance:push` | 0, 0, 0 | 27 clauses; handback PASS; 26 rules, 2,369 checks |
| `conformance:phonecopy` | 1, then 0 | the self-test red on the re-anchored mock until the mutation followed it; then OK |
| `ablation:p316` | 0 | 339 of 339, every rule (a) to (ap) proved able to fail, 806 s. A first run threw `ENOSPC` (below) and is not counted |
| `node build/p316/vectors.mjs --check` | 0 | 45 signed requests, 38 writes |
| `npm run measure:p337 -- --check` | 0 | 207 s, both builds, every arm PASS. W: 3.7b 925 ranges `{0:2332,1:135461,2:122238}`, 3.6a 937 ranges, sequences equal. K: 245 keys, 175 compared; check to land p50/p99/max 0.106/0.855/2.00 ms (3.7b) and 0.436/2.27/3.10 ms (3.6a); the gap, 5 trials each: two reads 50.20 to 50.63 ms apart (3.7b) and 49.88 to 50.89 ms (3.6a), the verb's acts 50.37 to 50.99 ms apart, and the parent's one statement one read `1b62` 3 of 3. L: change to answer p50/p99 83.1/92.3 ms and 83.5/87.6 ms, none missed of 100; a held poll answered 1.4 ms and 0.34 ms after `closing()`. C: 0 misattributed of 20 on each build. S: worst screens `large`, composed in 6.8, 20.7, 48.3 ms (3.7b) and 9.2, 21.1, 44.9 ms (3.6a). Z: 160x45 before and after, the control 50x30 |
| grader self-tests | 0 each | `probe:p318` 80 clauses, `probe:p317` 61, `probe:p3167` 33, `probe:p337` 17 graders and 69 clauses, `probe:p316` 142 cases, `measure:p337 --self-test` 24 clauses, `test-ios --self-test` 47 checks, `hostile-door --self-test` 80 arms |
| `xcodebuild build-for-testing` Debug, iphonesimulator, `CODE_SIGNING_ALLOWED=NO` | 0 | 20 s, no Swift warning |
| the same in Release | 65 | `TortieTests/AlertsTests.swift` (Phase 316.5's): `Unable to find module dependency: 'Tortie'`, a `@testable import` without testability; `test:ios` builds Release with `ENABLE_TESTABILITY=YES` |
| the same in Release with `ENABLE_TESTABILITY=YES` | 0 | 43 s, no Swift warning |
| `xcodebuild archive` Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO` | 0 | 19 s |
| `node build/p316/test-ios.mjs --read-app <that archive>` | 0 | 1 Mach-O file; no NetworkExtension or TailscaleKit, no code coverage, no DEBUG seam; the archive and every DerivedData under `…/scratchpad/p337/dd-integrator` deleted |
| `CopyTests` on the Mac (`xcrun swiftc`, the shipping files) | 0 | 9 tests, 0 failures; 1 failure on the builders' mock |

**The disk filled once.** At about 22:26 the data volume read 100 percent (1.2 GB free of 971 GB, nearly all of it outside
this phase's files); the integrator's DerivedData (Debug, Release and the archive) was the largest thing of its own, and
the running `ablation:p316` and `ablation:p320` each threw `ENOSPC` writing a clone file. The DerivedData was deleted at once,
the free space then rose to 10 and 24 GB as something outside this phase freed its own, and both ablations were run again
from fresh clones and passed; `package` ran only after that, with 25 GB free. A later role should delete its DerivedData as
soon as its build is read.

### For the verifiers

Under the lock, phone slot first: `test:ios` in Debug and Release on iOS 26.3 and `P316_RUNTIME=18.3` (no new XCTest has run
on a Simulator yet; `CopyTests` was run on the Mac as above, nothing else), `probe:p337` with `SCRATCH_MACHINE_QUIET_SHELL=1
SCRATCH_MACHINE_NO_OWN_KEYS=1`, `P316_ARMS=screen npm run probe:p316`, `probe:p318` once, `probe:controldeadline` once,
`measure:p337` arm C with `P337_PARENT_CHECKOUT`, RP and PSP at the parent, and §7.9's four methods. The keyboard bar's
height as an `inputAccessoryView`, a long press then a drag inside the two-axis scroll view, and `ScreenGridCostTests`'
memory at the top zoom against the 64 MB ceiling are the phone builder's three named watch items. `smoke:t1`, `smoke` and
`smoke:t3` were not run here: they launch the app, and the landing battery runs them.

**His shell history.** `~/.zsh_history` read `732999 1791229874` (mtime 15:51:14 EDT) for the spec step, the adversary and
builders 1 to 4, before and after their runs. It then moved TWICE while this phase was being built: to `733025 1791244365`
(26 bytes, mtime 19:52:45 EDT), which the proof builder found at its first reading, and to `733190 1791250793` (165 bytes
more, mtime 21:39:53 EDT), which the proof builder found at its last and stopped on, as the rule says. `~/.bash_history`
never moved (`23166 1790702242`, 2026-09-29). Nothing the builders started is known to have written it (every pane ran
`/bin/sh` with a scratch `HOME` and `ZDOTDIR` and `HISTFILE=/dev/null`; the tool's own `zsh -c` is not interactive), and
appends of that shape are what an interactive shell writes, but that is not proved. The integrator read `733190 1791250793`
and `23166 1790702242` at 21:46:23, before its first command, and the same before and after every command of its own that
started a shell, a server or a far session through the last, at 22:52:16. **Both moves are the operator's to rule on**; the
file was never read, only its size and time.

## §As built — the fix round (the fixer, 2026-10-06)

Written by the fixer in `/private/tmp/wt-p337` at `aebb4ce9`, with nothing committed, staged or stashed. Lens 1 (the attack)
answered `approved` with three minors; lens 2 (the run) answered `needs_work` with four majors, five minors and a nit. Every
major and every minor is answered below by a change and a proof that was run; the fix ran once. Nothing was found worse than
today, so nothing was removed. The menus do not move: `git diff aebb4ce9 -- src/main/menu.ts docs/audits/contract-baseline.txt
src/main/activity src/renderer/terminal src/main/attach` is still empty, R4's route pin and the contract baseline do not move,
and `HELPER_USER_FLOOR` stays 167 (no new script reaches `build/electron-run.mjs`). The delta is still 116 status entries
(86 tracked files and the same new ones); every file this round touched was already in it.

### 1. A block of lines with a Windows line break went as one line of text (lens 2, major): fixed

`ScreenInputState.replacing` and `changed(to:)` asked `text.contains("\n") || text.contains("\r")`, and Swift compares those
by `Character`: `"\r\n"` is ONE grapheme, equal to neither, so a pasted or dictated block holding it was neither swallowed nor
read as a line break, and went as text with both bytes stripped by `KeyItem.typed` (the lines joined, no Enter). `test:ios`
read `testABlockOfLinesIsSwallowedWhole` red in Debug and Release on both runtimes. **Now** both ask
`ScreenInputState.holdsLineBreak(text)`, which asks the text's Unicode scalars for `lineBreakScalars`, the scalars of
`lineFeed` and `carriageReturn` (`ios/Tortie/Screens/ScreenKeyField.swift`). Proved: a standalone `xcrun swiftc -O` program
over `a\r\nb`, `\r\n`, `a\n`, `a\rb`, an emoji then `\r\n`, plain text and the empty string read the old test false on the
three CRLF shapes and the new one true on every line-break shape and false on the two without (exit 0); `ScreenInputTests`
gains the four CRLF shapes through `changed(to:)` and `holdsLineBreak`; `conformance:ios` (aj) now requires both functions
to ask `Self.holdsLineBreak(text)`, `holdsLineBreak` to read `unicodeScalars` and `lineBreakScalars`, the set to be made of
both constants' scalars, and refuses any `.contains(lineFeed|carriageReturn)` in the file; `ablation:p316` re-anchors aj6
and adds aj6b (the Character search put back), aj6c (the carriage return left out) and aj6d (the field's check made
`== lineFeed`), each red on (aj) alone.

### 2. A zoomed Screen could not be panned on iOS 26.3 (lens 2, major): fixed, and a second defect it uncovered

**The pan.** The selection was a SwiftUI `LongPressGesture(0.45 s).sequenced(before: DragGesture(minimumDistance: 0))` on
the scroll view's content, which on iOS 26.3 held every touch (the verify's bisect). It is now **UIKit's
`UILongPressGestureRecognizer`**, handed to SwiftUI by `struct ScreenLongPress: UIGestureRecognizerRepresentable`
(`ios/Tortie/Screens/ScreenGrid.swift`, iOS 18.0 and later; the app's floor is 18.1): UIKit arbitrates it with the scroll
view's pan by its own rule, so a finger that moves before 450 ms fails the press and pans, and a press held still for 450 ms
begins and the pan is not given the touch, as a text view's selection behaves. Each `.began` and `.changed` hands the
location in the grid's own coordinates, `.ended`, `.cancelled` and `.failed` end the selection; `Screen.swift`'s
`selected` and Paseo's release table are unchanged.

**The rows sat in the middle, and a selection jumped four rows (found by this round's bench, both runtimes).** A two-axis
scroll view centres content smaller than itself. When a long press begins, `Screen.swift` draws `Showing the screen as it
was when you started selecting.` under the grid; the view shrank by that line, the centred rows moved up about 25 pt under a
finger that had not moved, and a long press then a drag along row 1 of a fitted Claude Code screen copied FIVE rows. The
rows now sit at the TOP of a frame at least the view's size (`.frame(minWidth: proxy.size.width, minHeight:
proxy.size.height, alignment: .topLeading)`, `.contentShape(Rectangle())`), which is where `docs/design/phone/Screen.html`
draws them, directly under the bar; a line appearing under the grid or the keyboard rising no longer moves a row. The pinch,
both taps and the long press are on that whole frame, so a pinch or a tap below the last row still reaches them (a point
outside the rows is no cell, `ScreenSelecting.hit`, and a tap raises the keyboard as before). Without that second half the
pinch fell below the rows and did nothing: the bench read it.

**The gate.** `conformance:ios` gains rule **(aq)**, "the Screen pans, and a long press selects": no `LongPressGesture` or
`DragGesture` in any Screen file; `ScreenLongPress` a `UIGestureRecognizerRepresentable` making a
`UILongPressGestureRecognizer` with `minimumPressDuration = minimumDuration`, built by `selectPress` at
`ScreenGesture.longPressSeconds`; and the top-anchored frame, then `contentShape`, then the pinch and the long press, in that
order. Six scanner fixtures prove it both ways; `ablation:p316` adds aq1 (the SwiftUI gesture put back), aq2 (the rows
centred), aq3 (the gestures on the rows alone) and aq4 (a tap recogniser), each red on (aq) alone. D27 and D34 are amended in
place.

### 3. S9's echo held needs input (lens 2, major): measured at the desk and at the parent, S9 narrowed, a stale file swept

The verify read the phone's dialog-shaped echo hold `needs_input` in 20 of 20 samples. Whatever raised it, the phone cannot:
the keys verb names no status setter but `noteUserInput`, which only releases an existing `needs_input`
(`src/main/activity/monitor.ts:535-541`; `git diff aebb4ce9 -- src/main/activity` is empty), and anything that reads a
question off the screen reads the same rows whoever typed them. So the spec's clause "raises no `needs_input` for 10 s" was a
promise about the monitor, which this phase does not own. The verify's first option is taken, and needs no ruling to land:
`probe:p337` now types the SAME three rows AT THE DESK (TerminalPane's keystroke, `noteTerminalInput` then
`term.sendInput`, the session fronted first) into a second Claude stand-in at HEAD, and into one at the parent inside RP's
launch, and samples each for 10 s (`echoAndSample`). S9's second clause is now "the phone's echo reads as the same echo typed
at the desk", and a third, "the desk's echo reads at HEAD as at the parent (today's class, stated)"; with no parent S9 is
UNREADABLE, as RN and S12 are. Eight refusal fixtures, the phone held where the desk was not among them. §7.7's S9 row and
§7.10 say so.

**Run, with the parent first** (`P337_PARENT_CHECKOUT` an `aebb4ce9` tree taken by `git archive` into scratch and built
there, exit 0): three runs of `probe:p337`, 17 of 17 each. S9 read needs input in 0 of 20 samples after the phone's echo,
0 of 20 after HEAD's desk echo and 0 of 20 after the parent's, in all three, with `drawnAsAChoice` true (the Mac's own Screen
read the echo as a numbered question). The verify's 20 of 20 did not come back in this round. Its likeliest class is the one
probe:p318's fixer found and owed (§As built of build/p318/SPEC.md): each launch ends the scratch tmux server, so HEAD numbers
its panes from the start again; a parent's Claude stand-in ended at `waiting` leaves `<pid>.json` on a pane id HEAD's first
Claude session is then given; and Tortie's registry reader keys by pane id, asks no pid and keeps the file it read last,
which by name is the parent's whenever the two pids cross a digit. `probe:p337` now sweeps the scratch HOME's registry files
whose process is gone after the parent's launch, as probe:p318 does (the third run swept 2). A session reading needs input
from a stale registry file is the parent's code and a status rule, and is owed, not this phase's.

### 4. probe:p316's `end` group read a bar this phase removed (lens 2, major): fixed

`P316DriveUITests.emitBar` reads End's glyph from one snapshot by its own identifier's prefix (`session-end-glyph-`) and
prints the navigation bar's frame beside End's; `bar` stays in the line (null on this build). `gradeE1` (and E10) places End
inside the navigation bar's trailing half (PS1's rule), refuses an End bar still drawn at the bottom, reads Face ID's mark,
and after the match refuses End's press still drawn on the ended session (`endAfter`, read as `session-end` in the last dump);
the 50-tall row clause is gone with the row. The `.reread` wait after an owner check asks End's PRESS (`!has(sessionEnd) ||
has(sessionEndLine)`), which is the bar's own question asked of what is drawn now: as left, `!has(sessionEndBar)` was true at
once, so EH write-late read the screen before the phone's 15 s. E1's 23 self-test cases cover the new clauses (End under the bar, in its leading half, a bar at the bottom, End left on the ended session, no End read, no bar read).

### 5. iOS 26's Slide to Type introduction covered the key bar (lens 2, minor): passed by its own Continue

`passKeyboardIntroduction()` in the UI test looks for the view UIKit names `UIContinuousPathIntroductionView` (2 s the first
time in a run, 0.3 s after), presses its `Continue`, waits up to 5 s for it to leave and prints `keyboard-introduction` with
what it saw; `screenType`, `raiseKeys` (also when the bar is already up) and `screenHome` call it after the keyboard rises.
Neither word is Tortie's.

### 6. PSH screen-chunked never reached the Screen (lens 2, minor): fixed

`build/p316/hostile-door.mjs` answered `/v1/blocked` raw for ANY raw arm, so pairing's first read of the screen-chunked arm
was chunked and the phone rightly refused to pair. The raw list answer is now for list arms alone
(`raw === true && list === true`), and the hostile door's self-test reads `/v1/blocked` for every screen arm before its
first screen read and requires an honest 200 with rows (80 arms, PASS; the old line, run in a copy, threw on this arm).

### 7. PS2 and PS3 graded the container (lens 2, minor): graded against the drawn rows

PS2 places the cursor from ROW 0's own frame and holds the drawn rows' width to the view's within one pixel a column (a cell
within half a point under the fit); PS3 grades a swipe, a SLOW drag (0.1 s, then 300 pt a second) and a swipe up (the
verify's bisect's drags; the swipe up when the zoomed rows are taller than the view), each on a row both readings hold,
refuses a selection left by a drag, and reads the turn by row 0's width on a Screen opened afresh at its fitted size (a chosen
zoom is kept sideways: run 1 below read 880 pt both ways). The floor (PS9) now drives PS3's drags and PS6 on iOS 18.3 too.
Self-test: 94 Screen cases, among them the verify's own iOS 26.3 reading (the cursor exactly on row 0 of rows centred at
y 337.67), which passes.

### 8. RN read a wrap no code made (lens 2, minor): fixed

The suffixes were already one length (`parent`, `headrn`); the difference was the PANE: the stand-in cuts every row to its
pane's width, Claude Code's second option names the project folder, and under the harness directory that row was 160
columns, cut at the parent's 142 and whole at HEAD's wider pane. RN's projects now sit under `/private/tmp/p337rn-<pid>`
(removed in the probe's `finally`), so the row is under 90 columns.

### 9. Bold inverse on slots 0 to 7 (lens 2, minor): fixed

`styleOf` (`src/main/screen/compose.ts`) now swaps first and brightens the ink after, as `@xterm/addon-webgl` 0.19.0 does
(`TextureAtlas._drawToCache` swaps colours and modes before `_getForegroundColor` brightens; `RectangleRenderer._updateRectangle`
fills an inverse cell with the pen's foreground slot as written), read in `node_modules/@xterm/addon-webgl/src`. The test's
own reader in `compose.test.ts` carries the background's slot and swaps first too; new cases: `1;7;31` (ground the red slot,
never 9), `1;7;31;44` (ink bright blue), `1;7;38;5;2;48;5;3`, a 24-bit foreground under inverse, `1;7` alone, and all eight
slots both ways. With the old order put back the test is red (1 of 22), restored by sha256. The committed captures hold no
basic colour, so no committed screen, sample or vector moved (`vectors.mjs --check` PASS).

### 10. Lens 1's three minors

- **§13 item 2** is restated with the attack's in-app numbers (0.18 to 0.61 ms quiet, 1.35 to 27 ms at a load near 200,
  window widths not rates, every key sent once the question was in tmux's screen refused), and `src/main/screen/keys.ts`'s
  header says the same under "WHAT THE ONE REFUSAL CANNOT CLOSE". Stated, not closed.
- **D5's pane clause**: `read.test.ts` gains "a disagreement on the PANE alone … is read once more, and the keys aim at the
  second's pane". With `a.paneId === b.paneId` taken out of `agree` (V14), that test is red (1 of 14), restored by sha256.
- **The 400 ms remote cadence**: `watch.test.ts` gains a far session with the control client UP and reads that settle at
  once: 9 to 11 reads in 4 s, each at least `SCREEN_TICK_REMOTE_MS` apart, with a local row beside it still read at the
  local tick. With remote rows read at the local tick (V16) it is red (1 of 33), restored by sha256.

### 11. The nit: the lock and the leftovers

`lock.sh` was present when this round began. `electron.lock` held `p337-verify-drive 23:28:08` from the killed instance of
lens 2 (the pid an owner file names is the `lock.sh` shell's own, which exits at once, so a dead pid proves nothing); its
holder had been ended three and a half hours before, so the fixer released that slot and took it, as `p337-fixer`, and wrote
and removed its phone-wait file. The leftovers of that killed instance (Simulator `p316-4472-14` booted, tmux
`-L gmux-p316-4472` pid 4828 with its stand-ins, crashpad pid 4815, `/private/tmp/p316-probe-4472`) are not this round's and
were left alone: they are the main session's to end by their recorded pids and device.

### Not this phase's, seen again and stated

- **E7 read UNREADABLE** in this round's run as in the verify's and in `battery-p317-ios.log`: Home was pressed before row
  one read Ended and the batch ran in the order Phase 316.7's list draws, not the one the probe names. A harness premise of
  Phase 317's arm since 316.7; no End code moved in this round.
- **`src/renderer/terminal/capture/serialize.ts`** (the Mac's own capture serializer, Phase 213) brightens before it swaps,
  the order this round took out of the composer; it draws saved scrollback, not the live terminal, and is not this phase's.

### Files this round changed

`ios/Tortie/Screens/ScreenKeyField.swift`, `ios/Tortie/Screens/ScreenGrid.swift`, `ios/TortieTests/ScreenInputTests.swift`,
`ios/TortieUITests/P316DriveUITests.swift`, `src/main/screen/compose.ts`, `src/main/screen/keys.ts` (its header),
`src/main/screen/__tests__/compose.test.ts`, `read.test.ts`, `watch.test.ts`, `build/conformance-ios.mjs`,
`build/p316/ablation-ios.mjs`, `build/p316/probe-p316.mjs`, `build/p316/hostile-door.mjs`, `build/p337/probe-p337.mjs`,
`CLAUDE.md` (the ios row's (aq); `probe:p316`'s and `probe:p337`'s rows) and this file (D12, D27, D28, D34, §7.7 S9 and RN,
§7.8 PS2, PS3 and PS9, §7.10, §13 item 2, each marked "the fix round of 2026-10-06", and this section).

### The commands, each run by this round

The live runs held lock slot `electron.lock` from 03:27:57, released once the last of them was done. Every `xcodebuild` derived data
was under `…/scratchpad/p337/dd-fixer*` and is deleted, and so are the parent's tree and the bench's scratch. History was read
before and after every command that started a shell, a server, a far session, a Simulator or the app (below).

| Command | Exit | What it read |
| --- | --- | --- |
| `xcrun swiftc -O crlf.swift` (scratch), run | 0 | the Character search false on `a\r\nb`, `\r\n` and an emoji then `\r\n`; the scalar search true on every line-break shape, false on plain text and the empty string |
| `P316_ONLY=aj6,aj6b,aj6c,aj6d npm run ablation:p316`, then `P316_ONLY=aq1,aq2,aq3,aq4` | 0, 0 | 4 of 4 and 4 of 4 red on (aj) and (aq) |
| the three new vitest cases with their clause taken out (read's pane clause, the remote tick, the old colour order), each file restored by sha256 | red, red, red | 1 of 14 (`read.test.ts`), 1 of 33 (`watch.test.ts`), 1 of 22 (`compose.test.ts`) failed; restored and green |
| the fixer's gesture bench, `…/scratchpad/p337/fixer/bench-gesture.mjs` (not a deliverable: `hostile-door.mjs`'s honest arm as its own process, the shipping UI test's own steps, devices made and ended only by `withSimulator`, no Electron), four runs on 26.3 and 18.3 | 0 each | run 1 (UIKit press, rows centred): both runtimes pan, swipe x 0 → -699 / -664, slow drag +191, swipe up 116 → -63; run 2: the selection along row 1 copied FIVE rows on both; run 3 (rows at the top, gestures on the rows): one row copied, but the pinch below the rows did nothing; run 4 (as shipped): pinch 400 → 1320 pt, swipe 0 → -699 (26.3) and 0 → -647 (18.3), slow drag +191, swipe up 116 → -63 and 100 → -63, one row copied with Copy drawn and the held line, the Slide to Type introduction pressed and gone on 26.3, five keys POSTs on each |
| `test:ios`, iOS 26.3 | 0 | Debug 559 tests, 0 failures; Release 556, 0; the built apps and the device archive read clean (no NetworkExtension or TailscaleKit, no coverage, no Release DEBUG seam, unsigned) |
| `P316_RUNTIME=18.3 test:ios` | 0 | Debug 559, 0 failures; Release 556, 0; the same reads |
| `P316_ARMS=screen,end probe:p316`, run 1 (03:55 to 04:31) | 1 | 56 passed, 1 failed, 1 unreadable, 0 model turns. E1, E2, E3, E4, E5, E6, E10 and every EH arm (write-late among them) PASS; PS1, PS2, PS4 to PS8, PS+, PS9 (PS1, PS2, PS3's drags, PS4, PS6 on 18.3) and all 13 PSH arms (screen-chunked and keys-404 among them) PASS. FAIL: PS3's turn clause, 880 pt both ways, because the drive turned a Screen it had just zoomed (staging, fixed: the turn now reads a fresh Screen). UNREADABLE: E7, as above |
| `P316_ARMS=screen probe:p316`, run 2 (04:31 to 04:49) | 1 | 40 passed, 1 failed, 0 unreadable, 0 model turns: **PS1 to PS9, PS+ and every PSH arm PASS**, PS3 whole (pinch, swipe, slow drag, swipe up, the turn, upright again). FAIL: N9 (Phase 316.5's alerts arm), "only 14998 ms were waited, under 15000": the 15 s sleep measured by `Date.now()` 2 ms short; it passed at 15,004 ms in run 1. `QUIET_SLACK_MS` (100) now sleeps past both quiet floors (N2, N9); not run again |
| `P337_PARENT_CHECKOUT=<aebb4ce9 in scratch> probe:p337`, three runs (04:49 to 05:05) | 0, 0, 0 | 17 of 17 each: RP, S0 to S13, RN, RUN. S9 0 of 20 at the phone, HEAD's desk and the parent's desk in each; RN equal (the option whole at both builds); S12 p50 parent 76.0, 47.9, 43.6 ms against HEAD 47.9, 76.3, 48.2 ms; the third run swept 2 dead registry files after the parent |
| `npm run -s typecheck` | 0 | 1,414 production files, 0 import violations, 0 runtime cycles |
| `npm run build`, twice (after the live runs, and after the last edit) | 0, 0 | 32 s; `gate:electron` 167 against 167; `gate:background` 3 starters, 19 of 19; `gate:simulator` 2 against 2; `gate:knownhosts` 561 files; `gate:checks` 259 scripts; **`conformance:ios` 41 rules** over 45 app files, 54 test files and 110 files; `gate:contract` byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | 1, then 0 | first run 68 s: 1,085 files and 19,840 tests passed, 1 failed: `src/main/symbols/__tests__/store.test.ts`'s time budget (92.54 ms against 92.35) at a load average near 88, no symbol file being in this phase's delta; that file alone three times, 15 of 15 each; the whole suite again once the machine was quiet (load 9.5), after the last edit: **1,086 files and 19,841 tests passed, 2 and 14 skipped, 0 failed**, 55 s |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` | 0 | 49 s; `release/` 831 MB, removed |
| `conformance:pocket`, `:pocket:hostile`, `:machines`, `:manager`, `:choices`, `:handback`, `:push`, `:phonecopy` | 0 each | 119 rules and 17,121 checks; 221 arms; PASS; 64 rules, 2,688 checks; 27 clauses; PASS; 26 rules, 2,369 checks; OK |
| `ablation:p313` | 0 | 352 of 352, 1,689 s |
| `ablation:p320` | 0 | 114 of 114, 1,335 s |
| `ablation:p316` | 0 | **346 of 346**, every rule (a) to (aq) proved able to fail, 693 s |
| `vectors.mjs --check`; the grader self-tests (`probe:p318` 80 clauses, `probe:p317` 61, `probe:p3167` 33, `probe:p337` 17 graders and 70 clauses, `probe:p316` every group, its Screen group 94 cases and End 110); `measure-screen.mjs --self-test` 26 clauses; `test-ios.mjs --self-test` 48 checks; `hostile-door.mjs --self-test` 80 arms | 0 each | |
| `npm run measure:p337 -- --check` | 0 | 207 s, every arm on both builds; K p50/p99 0.178/0.748 ms (3.7b) and 0.375/1.766 ms (3.6a); L 84.0/87.8 and 85.2/88.8 ms, none missed; C 0 misattributed of 20 each; Z 160x45 throughout |

The integrator's separate `xcodebuild` builds (Debug, Release with testability, the device archive and its read) and its
`CopyTests` on the Mac are inside `test:ios` above, on both runtimes.

### His shell history

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `733353 1791256765` and `23166 1790702242` at 03:09, before this
round's first command, and the same before and after every command that started a shell, a server, a far session, a
Simulator or the app (the four bench runs, both `test:ios` runs, both `probe:p316` runs, all three `probe:p337` runs,
`measure:p337`, `npm test`), through the last. It never moved. The file was never read, only its size and time.

### For the reverifier

Re-run live, at least: `P316_ARMS=screen,end probe:p316` (PS3 whole and PS6 on 26.3; PS9's drags and PS6 on 18.3; E1, E3,
E10 and EH write-late; PSH screen-chunked and keys-404); `test:ios` on both runtimes; `probe:p337` WITH its parent (S9's three
readings, RN); and attack where this round is thinnest: (1) a long press then a drag on a Screen already ZOOMED and scrolled,
on both runtimes, and a pinch, a tap and a long press below the last row of a short screen; (2) a selection begun while the
keyboard is up, and the keyboard raised while a selection is held; (3) the top-anchored rows against the mock and the
landscape fit; (4) a block holding U+2028, U+0085 or a lone `\r` dictated or typed; (5) S9 with the parent's and HEAD's
stand-in pids made to cross a digit, with the sweep and without it (the class this round names but did not reproduce).
The p4472 leftovers above are still on the machine and are not this round's.
