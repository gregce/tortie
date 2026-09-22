# 130. Scrolling a session on another machine: why it stops at one screen, and how it scrolls like one on this Mac

Phase 320. Written 2026-09-22 against the tree at `55dab8b1` ("docs(backlog): the push's app run goes to real
agents, and Phase 319 starts"). **No real remote machine was reached.** No ssh was run, none of the operator's
machines was contacted, his `-L gmux` server and his default tmux server were never touched, and no Electron was
started. Every far-side string below was composed by Tortie's own pure functions through the repository's pinned
tsx and then run, with the ssh hop replaced by a local shell (`/bin/zsh -f -c`, `/bin/sh -c`, or a relay process
that adds a fixed delay each way), against scratch tmux servers named `p320-*` and booted row by row the way
`ensureRemoteServer` boots one. Two tmux builds were run: the vendored 3.7b and this Mac's 3.6a. Two investigators
answered disjoint questions, two adversaries tried to refute them before a word of this was written, and a judge
ruled on every disagreement and re-measured the two claims nobody had measured end to end. §6 records what the
attack killed, so no later round re-derives it. The scratch harnesses named below lived under the session's
scratchpad (`scratchpad/p320/{invA,invB,adv1,adv2,judge}/`) and are not in the tree.

This answers GitHub issue 31, "No scrolling in a remote session", filed 2026-09-21 by Jake Levirne
(`jakelevirne`, on a Mac with a trackpad):

> Setup a machine in Tortie. Open Folder On a Machine. Start a Claude session, ask something. If the response takes
> up more than a screen, try scrolling back (for me I'm on a mac trying to scrollback with my trackpad). Expect it to
> scroll just like a local session does. Instead, nothing scrolls. Click "Read last lines". Still can't see more than
> a screen full of history even if you click "1,000 lines" or "10,000 lines". Even if you could see more, this dialog
> is not a good way to interact with history.

The operator asked for the research, and his standing rule binds its answer: **a remote session must feel
identical to a local one**, with no explanatory text on a remote surface just because it is remote. So the
question is not only why Read last lines stops at a screen. It is how a session on another machine scrolls exactly
like one on this Mac, and that question runs straight into research 57 §3.1 and §12, which refused a real remote
scrollbar. §4 re-examines that refusal reason by reason.

## 1. The answer first

**Two things are wrong, and neither is the command Read last lines sends.**

1. **The wheel is thrown away before it leaves the renderer.** For a session on another machine, main answers every
   scroll call with `NO_PANE_HERE`, because `scrollTarget` reads only this Mac's bindings
   (`src/main/sessions/core.ts:2506-2508`). The scroll surface then latches `noPane`
   (`src/renderer/terminal/scroll/surface.ts:563-570`) and `handleWheel` returns false for every wheel event after
   that (`surface.ts:281`), which cancels xterm on both of its wheel paths
   (`node_modules/@xterm/xterm/src/browser/CoreBrowserTerminal.ts:642` and `:810`). That line is Phase 95's, and
   its reason is sound for the case it was written for. It is wrong for the reporter's case.
2. **The far pane really does hold one screen, and the panel then says something false about it.** The reporter's
   far Claude is almost certainly drawing with Claude Code's fullscreen renderer, which lives on the alternate
   screen, keeps the conversation in its own memory, and clears with `CSI 2J CSI 3J CSI H`. tmux treats `CSI 3J` as
   clear-history. So tmux holds exactly one screen, `capture-pane` returns exactly one screen at every depth, and
   the panel draws "That is everything this session has kept." (`src/renderer/machines/read-lines.ts:122`), which is
   not true. Its button's tooltip, "Tortie cannot scroll back through a session on another machine…"
   (`read-lines.ts:38-40`), is explanatory text that exists only because the session is remote.

**The design that makes a remote session scroll exactly like a local one is the local mechanism, unchanged, run
over each machine's existing control connection through one closed door.** It lands in two slices.

- **Slice 1 fixes the reporter and touches no refusal.** When main has no pane to answer for, the wheel is handed
  to xterm if, and only if, the far program has asked for the mouse (`term.modes.mouseTrackingMode !== 'none'`).
  The far tmux client already mirrors the program's mouse modes into xterm, so the wheel travels to the program as
  an ordinary mouse report on the attach, exactly as it does on this Mac. The two false sentences are deleted. Three
  typing fixes ride along, and all three fix defects that exist on this Mac today.
- **Slice 2 gives every other remote pane the local scroll.** The functions in `src/main/tmux/scroll.ts` already
  take an injected runner. A runner that writes to the machine's control connection, and refuses anything outside
  a closed table of six command shapes, gives a remote pane the same thumb, drag, parked hold, resize anchoring and
  hand-off that Phase 292 built locally. Pipelined, a wheel notch paints in about one round trip, the same cost as a
  typed character echoing on that session. Five preconditions keep it from eating a single keystroke, measured at
  0 lost from 0 to 120 ms round trip on both tmux builds.

**Research 57's refusal is narrowed, not overturned.** Its reasons against the exec plane all still hold and the
exec plane gets no scroll. Its reason against the control connection, "the one carriage with no gate", was a true
description of the tree, and the design answers it by giving that carriage its first gate rather than by using it
ungated. Its latency reason priced a 25,000-line capture as though it were a wheel notch and is withdrawn for the
control connection. Because slice 2 reverses a written refusal, it waits for the operator's word; slice 1 does not.

**One limit no scroll design removes, stated rather than hidden.** A fullscreen agent's transcript is never in
tmux. Capture, saved output and Read last lines hold one screen of it, on this Mac and on a machine alike. Nobody
notices locally because the wheel reaches the program there.

**One limit of the chosen design.** The control connection opens only on tmux 3.6a, 3.7b and 3.7c
(`src/main/tmux/version.ts`, `decideRemoteControlGate`), and it takes no acceptance by design. A machine on any
other version gets slice 1, so a program that asked for the mouse scrolls there, and a plain shell or a classic
agent there still does not. The reporter's machine is Linux and its tmux version is unknown.

## 2. The defect behind Read last lines

### 2.1 The command is right

Read last lines sends `<tmux> -L <sock> -f /dev/null capture-pane -p -e -J -t '$N' -S -<n>`, composed by
`remoteCaptureArgs` (`src/main/machines/remote-capsule.ts:141-152`) and sent through `execOn` by
`src/main/machines/remote-lines.ts:236`. Investigator A composed that string, and every other far-side string on
the path (`attachPlan`, `tmuxCommand`, `clampSessionLineDepth`, `remoteBootArgs`, `remoteBootOptions`,
`remoteCreateArgs`), through Tortie's own functions and ran them under `/bin/zsh -f -c` against servers booted the
way `ensureRemoteServer` boots one (`src/main/machines/remote-server.ts:140-199`). Adversary 1 repeated it under
POSIX `/bin/sh -c` with its own composer. Both read back every boot option equal, `history-limit` 25000 included.

Lines returned by Tortie's exact capture string, at the four depths the panel offers, the same on tmux 3.6a and
3.7b and the same for both reproductions:

| The pane | depth 0 | 1,000 | 10,000 | 25,000 | tmux's own reading |
| --- | --- | --- | --- | --- | --- |
| A shell that printed `seq 1 5000` | 24 | 1,024 | 5,001 | 5,001 | history 4,977 |
| A program with a scroll region (rows 1 to rows−4, and 3 to rows−4) | 24 | 1,024 | 5,024 | 5,024 | history 5,000 |
| A fullscreen stand-in (1049 plus mouse 1000/1002/1006, 5,000 lines held in its own memory) | 24 | 24 | 24 | 24 | `alternate_on=1`, history 0 |
| A shell that printed 5,000 lines, then `CSI 3J` | 24 | 24 | 24 | 24 | history 0 |
| 300 lines, then the alternate screen, then Claude's own clear | 24 at −10,000 | | | | history 0, no pre-program line |

Each read took 6 to 22 ms on loopback. The 8,388,608-byte ceiling (`cutToCeiling`, `remote-lines.ts:133`) was
never approached. There is no dropped `-S`, no `-J` or `-E` mistake, no cap in the exec door and no missing
`history-limit` on a server Tortie booted.

### 2.2 What makes one screen

**The alternate screen, or `CSI 3J`, and nothing else measured.** A program on the alternate screen writes nothing
into tmux's history, and tmux honours `CSI 3J` as clear-history, which the tree already records at
`src/main/restore/command.ts:83-85`. On tmux 3.6a, a pane that printed 5,000 lines and then entered the alternate
screen kept 4,977 lines of history, and `-S -1000` returned 1,024; after the program sent `CSI 2J CSI 3J CSI H` from
inside the alternate screen, the history fell to 0 and the same read returned 24. The judge re-measured it with a
stand-in that uses Claude's own clear sequence (`judge/fs.py`): a 30-row pane returned 30 rows at depth 1,000 on
both builds, and the 271 lines printed before the program started were gone.

**Claude Code's fullscreen renderer does exactly that.** Read from the installed Claude Code 2.1.280 bundle, not
run: its mode table asks for `1049` (alternate screen) and for the mouse as `1000+1002+1003+1006` or `1000+1006`,
optionally plus `1016`; its clear on the alternate screen is `CSI 2J` + `CSI 3J` + `CSI H` (`clearTerminal`:
`altScreen ? WMr() : hNt(viewportRows)`, with `WMr()` = `PS+Kot+bh`). Its main-screen renderer (class `Hr`) keeps
its lines in tmux history, and its only `CSI 3J`, on a width change or a height shrink, is followed by a replay of
up to 10,000 lines (`dn=1e4`). Adversary 1 ran that replay technique as a stand-in (`adv1/prog2.py pump`): 5,000
lines, the clear, the replay through `DECSTBM 1;2`, and tmux held 5,000 lines of history afterwards and returned
5,024 at −10,000, starting at the first replayed line.

**The reporter's own video agrees.** The issue links a recording; its transcript at 00:26 reads "you can see it
only goes as far back as what's on the screen, no matter what I click here". That is the history-zero signature:
the same rows at every depth.

### 2.3 Why his remote Claude and not the operator's

Which renderer a Claude gets is decided per machine, and the tree sets none of the switches. From the 2.1.280
bundle, read and not run: `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` or `NO_FLICKER=false` turns fullscreen off,
`NO_FLICKER=true` turns it on, and the settings key `tui` (`'fullscreen'` or `'default'`) decides next. When `tui`
is unset, investigator A read a fresh-install rule (`firstStartVersion` defined and `fullscreenUpsellSeenCount`
below 3 gives fullscreen). **Adversary 1 corrected it and the judge upheld the correction:** that branch returns
false whenever GrowthBook is on (`d(){…if(EI())return!1;…}`, with `EI()` true unless telemetry or GrowthBook is
off), and then two server-side gates decide (`tengu_amber_creek`, `tengu_pewter_brook`). So a newly set-up machine
is not guaranteed fullscreen; it depends on that machine's settings, environment and gates. On this Mac,
`~/.claude/settings.json` has `tui: 'default'`, which is why the operator's sessions are classic and why
`src/main/tmux/scroll.ts:13-17` measured claude in the normal buffer. A grep of `src/` and `build/` for
`NO_FLICKER`, `DISABLE_ALTERNATE_SCREEN` and `CLAUDE_CODE_TUI` finds nothing.

**The reporter's own Claude configuration was not observed.** One still frame of his video (`adv1/thumb.jpg`) shows
a Claude tab on a machine badged `jakemail-remo…` whose far paths are `/home/jakedevnull/…` and which holds a
systemd unit, so **his far machine is Linux**. A still frame cannot show which renderer Claude was in. The ruling
does not depend on it: §7's design works for both renderers.

### 2.4 The causes ruled out, each by a measurement

| Suspect | What it produces | Measured by |
| --- | --- | --- |
| A far server started without Tortie's boot (tmux defaults) | `history-limit` 2,000: 24 / 1,024 / 2,001 / 2,001 lines. A count, not one screen | adversary 1, both builds |
| A far tmux older than 3.6 | `copy-mode-position-format` first appears in 3.6; an unknown option exits 1 ("invalid option"), so the boot throws before its last row and leaves 2,000 lines, not zero | adversary 1, with a bogus option name on 3.6a and 3.7b |
| Far login files | The capture runs through a non-interactive shell with no pty; a login file can only add lines to stdout | read, and the results under `sh` matched `zsh -f` |
| Claude's classic renderer clearing on resize | Its replay puts 5,000 lines back | adversary 1, the renderer's own technique |
| A Settings scrollback of 0 | Would empty local panes too, which contradicts "local scrolls" | reasoning |
| Normal output, then a fullscreen program (investigator A's "case D", 1,024 stale lines) | Does not survive the program's first clear | adversary 1, `prealt_e3`, both builds |

### 2.5 What the panel then says

- **"That is everything this session has kept."** (`READ_LINES_ALL_THERE`, `read-lines.ts:122`) is drawn whenever
  fewer lines came back than were asked for (`showsAllThere`, `src/renderer/app/RemoteLinesModal.tsx:134-139`,
  drawn at `:282-284`). Under a fullscreen agent it claims the session kept nothing more while the whole
  conversation sits in the agent's memory. The count line above it (`readLinesCount`, `:277`) already says what came
  back, so the sentence adds only the false part.
- **The tooltip** `READ_LAST_LINES_HERE_TITLE` ("Tortie cannot scroll back through a session on another machine.
  Open this to read the last lines it printed.", `read-lines.ts:38-40`) sits on a button drawn only for remote
  sessions (`showsReadLastLines`, `src/renderer/app/session-actions.tsx:329-331`; the title at `:368`). It is
  explanatory text on a remote surface because it is remote, which is what the operator's rule forbids, and it
  becomes false the moment a fullscreen agent scrolls.

### 2.6 The same limit on this Mac

The local Capture Last N Lines composes the same flags (`src/main/tmux/sessions.ts:316-323`), so a local fullscreen
agent is exactly as unreadable by capture, and so are the saved-output capsules. Nobody notices locally because the
wheel reaches the program. This is a property of the agent's renderer, not of Tortie, and no depth setting changes
it.

## 3. The wheel, on this Mac and on another machine

### 3.1 On this Mac there are three routes

Every session, on any machine, mounts through one terminal (`new Terminal(`, `src/renderer/terminal/TerminalPane.tsx:254`)
and one wheel handler (`TerminalPane.tsx:315-317`: `new ScrollSurface(sessionId, term)` and
`attachCustomWheelEventHandler`). The surface reads tmux's own state for the pane (`STATE_FORMAT` in
`src/main/tmux/scroll.ts:134`, which carries `#{alternate_on}` and `#{mouse_any_flag}`) and decides per event:

1. **The pane is a normal-buffer program (a shell, classic Claude, codex): the wheel is Tortie's.** `viewOf` sets
   `owned = !innerAlt && !innerMouse` (`surface.ts:181`), travel is coalesced for 16 ms (`WHEEL_COALESCE_MS`,
   `surface.ts:75`, `:296-303`) and `scrollBy` (`:323-328`) goes through `preload/terminal.ts` and
   `main/ipc.ts` to `core.ts`, where `scrollPaneBy` (`scroll.ts:402-433`) sends `copy-mode -e`, then
   `send-keys -X -N <n> scroll-up`, then `send-keys -X top-line`, then a `display-message` read, each over the
   local control client (`runScrollCommand`, `core.ts:2482-2490`).
2. **The program asked for the mouse or took the alternate screen: the wheel is the program's.** The handler returns
   true (`surface.ts:286`), xterm sends a mouse report (or, with no mouse mode, alternate-scroll arrow keys), and
   tmux, whose `mouse` is off (`src/main/tmux/server-options.ts:85`), forwards it to the program.
   `resources/gmux-tmux.conf:59-62` says it in the tree's own words: "`off` does NOT take the mouse away from
   applications: a TUI inside the pane … that requests mouse tracking still has that request forwarded out to the
   attach client".
3. **Nothing to scroll: the wheel is dropped.** Phase 95's `noPane` line (`surface.ts:276-281`), for a session with
   no pane on this Mac.

Investigator A measured the protocol by the tmux CLI on both builds: `copy-mode -e` then `send-keys -X -N 30
scroll-up` put a classic pane at `scroll_position` 30 over a history of 4,961, and put a fullscreen pane at 0 over
0. **Copy mode cannot scroll a fullscreen agent, even on this Mac.** Route 2 is how a local fullscreen Claude
scrolls.

### 3.2 On another machine there is one route, and it ends at `surface.ts:281`

The surface's first poll calls `api.state`, which reaches `GmuxCore.scrollState`
(`core.ts:2510`). `scrollTarget` reads `this.liveIds` (`core.ts:2506-2508`), and `liveIds` is written only by local
bindings (`create-local.ts:682`; `core.ts:1753`, `:2035`, `:2047`, `:3130`), so a remote id is null and the answer
is `NO_PANE_HERE` (`core.ts:579-589`). `apply` sets `noPane` and stops the poll (`surface.ts:563-570`), and every
wheel after that returns false at `:281`. The unit test pins it: `p95-scroll-stops.test.ts:256-271`, "swallows the
wheel rather than handing it to xterm", 8 of 8 passing when investigator A ran the file.

Phase 95's reason is in the comment at `surface.ts:276-280`: true hands the event to xterm, whose alternate-scroll
branch emits `ESC O A` and `ESC O B`, and claude and codex read those as prompt-history navigation. **That reason
holds exactly while xterm's mouse tracking is off.** When the far program has asked for the mouse, xterm takes its
mouse-report path instead, and no arrow key is ever produced.

### 3.3 The route to a remote fullscreen program already exists

This is the claim nobody had measured end to end until the judge did (`judge/modes.mts`, `judge/modes-results.json`).
Tortie's remote attach argv (`remoteTmuxArgv(ctx, ['-u', 'attach-session', '-t'])` plus the quoted target,
`src/main/attach/attach-plan.ts:175-186`) ran in a pty with the ssh hop replaced by a local shell, and its bytes were
fed into a real `@xterm/xterm` 6.0.0 `Terminal`. Across both tmux builds, both of Claude's mouse sets, and an attach
made before or after the program went fullscreen:

| Moment | xterm's own `mouseTrackingMode` | What tmux holds |
| --- | --- | --- |
| Before fullscreen | `none` | the shell's lines |
| During fullscreen, `1000+1002+1003+1006` | `any` | `alternate_on=1`, `mouse_any_flag=1`, history 0 |
| During fullscreen, `1000+1006` | `vt200` | the same |
| After the program leaves | `none` | |

During fullscreen, three wheel-up events generated by xterm's own `CoreMouseService.triggerMouseEvent`, which is
the call `CoreBrowserTerminal` makes when the custom handler returns true, were encoded by xterm as
`ESC[<64;20;10M`, and all three reached the far program, moving its view from 4,972 to 4,963 (tmux 3.7b, attach
first). After the program left fullscreen, `triggerMouseEvent` returned false and xterm sent nothing. Investigator
A and adversary 1 had measured the halves separately: the far client asks its outer terminal for `1049` plus
`1000/1002/1006` when attached to a fullscreen pane and for `1049` alone when attached to a normal one, and typed
SGR wheel reports reach the program through the remote-shape attach exactly as through the local-shape one.

So `mouseTrackingMode !== 'none'` is exactly the condition under which handing the wheel to xterm is right, and it
needs no tmux command, no copy mode and no control connection: the report travels on the attach like a keystroke.
`typings/xterm.d.ts:1932` declares the field; nothing under `src/renderer` reads it today.

One gap against this Mac remains under the pass-through alone. A far program on the alternate screen that did NOT
ask for the mouse (`less`, a `vim` with no mouse) scrolls locally through route 2's alternate-scroll arrow keys,
because the surface reads `innerAlt` from tmux. xterm cannot tell such a program apart from a plain shell, because
the tmux attach puts xterm in the alternate buffer in both cases, so under slice 1 its wheel stays swallowed.
Slice 2 closes it, because the carriage runner reads `innerAlt` the way the local one does.

### 3.4 Where the history is, local and remote alike

xterm holds no scrollback for any session: the attach puts it in the alternate buffer (`TerminalPane.tsx:310-314`,
and both attach shapes sent `1049` to the outer pty in every measurement). All history is tmux's or the program's.
The far server never reads `resources/gmux-tmux.conf` (every remote command passes `-f /dev/null`,
`REMOTE_CONF_PATH`, `src/main/machines/context.ts:213`), but `ensureRemoteServer` writes every row of
`SERVER_OPTIONS` (`src/main/tmux/server-options.ts:64-107`), `history-limit` included, at sign in
(`prepare.ts:418`), at restore (`remote-restore.ts:324`) and before a create that carries environment names
(`remote-sessions.ts:1590`).

## 4. Research 57's reasons, one by one

Research 57 §3.1 refused a real remote scrollbar over the exec plane and over the control connection, and §12
repeated it as "Never in this shape". Research 57 investigator 5 (`docs/research/57-i5-scrollback-on-another-machine.md`)
carried the detail. The refusal is written into the gate as condition 54b of `build/conformance-machines.mjs`
(`:4562-4572`), which fails if `src/main/machines/remote-lines.ts` names either scroll verb, and it is restated in
`docs/BACKLOG.md` at lines 7868, 7878, 7894, 8669, 9015, 9580 and 10267.

Every reason was re-read against the tree at `55dab8b1`.

| # | Research 57's reason | Still true of the tree? | Ruling |
| --- | --- | --- | --- |
| 1 | `copy-mode` is not on the verb ledger | Yes. `REMOTE_VERB_LEDGER` (`src/main/machines/exec-plane.ts:259-360`) still has 12 rows and no `copy-mode`; `VERBS_THIS_RUNG_REFUSES` (`:377-381`) is still `kill-server`, `attach-session`, `respawn-pane` | **Kept for the exec plane.** The ledger governs the exec plane only: `assertRemoteVerbAllowed` is called by `execOn` and `sendArmedResumeText` (`:595`, `:731`) and never by `tmuxCommand` (`context.ts:267`), which composes the control carriage. No ledger row is added |
| 2 | `send-keys -X` is the one unsafe row, and an open family of `-X` commands cannot fit Phase 89's five-element `-l` door without undoing it | Yes. `composeArmedResumeArgv` still returns `['send-keys', '-t', target, '-l', text]` (`exec-plane.ts:508`), `ARMED_RESUME_GUARD` is module private (`:245`), one product call site | **Kept, and proved right.** Investigator B measured `send-keys -X copy-pipe-and-cancel 'touch …'` in copy mode running a program on both builds. An open family is a way to run programs on the far machine. The design opens no family and does not touch Phase 89's door |
| 3 | The control connection is "the one carriage with no gate", and a scroll would be its first interactive write path | Yes. `control-plane.ts` still exports no command sender (its exports run from `:98` to `:716`); its `clients` map is private; the only production `sendCommand` caller is the LOCAL runner (`core.ts:2484`). `new-session` and `refresh-client` already cross it ungated | **Overturned for the control connection only, by giving it a gate.** See the safety below |
| 4 | Latency: 25,000 lines in 0.51 s, "32 times too slow for a wheel notch" against `WHEEL_COALESCE_MS` | The exec plane is still one ssh per command, 0.07 s median and 0.36 s worst on a 6 ms LAN (research 57 §3.2) | **Kept for the exec plane, withdrawn for the control connection.** The 0.51 s priced a capture, not a notch. Research 57 itself measured the persistent pipe at 6.1 to 7.3 ms median and said it clears the 16 ms budget. Pipelined over it, a notch paints in about one round trip (§5) |

**A premise research 57 did not state, and which is false.** Research 57 i5 assumed that scrolling a remote session
means tmux copy mode, building on `scroll.ts:13-17`, which measured claude in the normal buffer. For a fullscreen
agent that is false: its history is unreachable by any tmux verb and it scrolls only on mouse reports or its own
keys (§3.1, §3.3). So the refusal never covered the case the reporter hit, and slice 1 needs no change to it.

**A fact research 57 listed as unmeasured, now measured.** A person can already put a remote pane into copy mode.
On a server shaped like a remote one, `show-options -gv prefix` reads `C-b`; neither `resources/gmux-tmux.conf` nor
`server-options.ts` touches it; writing `\x02[` into the far attach gave `pane_mode=copy-mode`, and PageUp then
gave `scroll_position` 27, on both builds (investigator B, `invB/kb.mjs`). By reading, `src/renderer/terminal/keys/index.ts`
does not intercept Ctrl+B; that was not driven in the app. So the safety to keep was never "no copy mode ever happens
on a machine". It is "Tortie composes only closed commands there". The UI rules still forbid ever telling a person
to press it.

### The safety reason 3 protected, and how the design keeps it

Research 57 §1.1: "a proposal that reaches for it to get low latency is reaching past every check in this
document". The safety is that **nothing interactive crosses to a machine unless some gate has read it.** The
design keeps it by making the carriage more governed than it is today:

- `sendCommand` and the `clients` map stay private to `src/main/machines/control-plane.ts`. It exports exactly one
  new function, a scroll runner for one machine, and that runner writes only after checking every argv against a
  closed table.
- **The table is six shapes, all targeting `$N`, integer arguments only**, and nothing else can pass:
  `display-message -p -t $N -F <STATE_FORMAT>` with the compiled constant and never a caller's string;
  `copy-mode -e -t $N`; `send-keys -t $N -X -N <1..2000> scroll-up|scroll-down` (2,000 is `SCROLL_CHUNK_LINES`,
  `scroll.ts:224`); `send-keys -t $N -X goto-line <int>`; `send-keys -t $N -X top-line`; `send-keys -t $N -X cancel`.
  No `-l`, no key names, no `-H`, `-K` or `-M`, no `copy-pipe*`, no `;`.
- **The format is pinned because the carriage would otherwise run programs.** Investigator B sent
  `display-message -p -t $0 '#(touch <scratch>/ran-by-format-over-control)'` over the emulated control carriage and
  it created the file on both builds; the same command from a one-shot client did not within 1.2 s. A
  caller-supplied `-F` on this long-lived connection is a way to run a program on the far machine.
- **None of the five `-X` forms can put a byte in front of the program.** On a pane running `stty raw -echo; cat >
  typed.txt`, `-X -N 5 scroll-up`, `-X goto-line 100` and `-X top-line` with no mode active each exited 1 with "not
  in a mode" and `typed.txt` stayed at 0 bytes; the control, `send-keys -l abc`, wrote 3 bytes. Both builds.
- **Argument injection is already closed on this carriage.** `sendCommand` refuses a newline
  (`src/main/tmux/control-client.ts:346-350`), and `quoteTmuxArg` single-quotes every argument outside a safe class
  and refuses `'` (`:543-552`), so `;` and `#{…}` arrive as literals.
- **The table fits the code that already ships.** Every argv the unmodified `scroll.ts` emitted in investigator B's
  runs, 2,224 on 3.7b and 1,144 on 3.6a, matched one of the six shapes, with 0 violations and one format containing
  no `#(`.
- **Every shape's repeat behaviour is written down**, because research 57's at-least-once principle still governs
  ("Tortie can never know whether a command that failed ran or not", `exec-plane.ts:12-17`). Measured: `copy-mode
  -e` twice kept position 100; `goto-line 100` twice gave 100 and 100; a second `cancel` answers "not in a mode".
  `scroll-up` and `scroll-down -N` are the only shapes that are not idempotent, their only effect is where the view
  sits, and they are never retried. On a disconnect `TmuxControlClient` rejects its pending commands (`failPending`)
  and resends nothing.
- **The target is read per operation from a live row on the current connection**, never from a gone row, because
  tmux ids restart after a far server restart and the far socket is named `gmux`, the same name any Tortie on that
  machine uses (`activeTmuxSocket()`, `context.ts:487`; the comment at `:45-51`). A stale `$N` would park somebody
  else's pane.
- **The gate pins it.** Condition 66 of `build/conformance-machines.mjs` (`:1547-1565`) fixes the files under
  `src/main/machines/` that may name `send-keys` at exactly three; the new table module becomes a fourth BY NAME in
  the same commit, so a later round still cannot open a route without editing a named list. New conditions pin the
  single export, the six shapes, the pinned format and the target rule, each with an ablation that must go red.

What a hostile caller could do through the closed door is deny input: park a `$N` pane or cancel one. That is less
than Phase 89's own door can do, which types text.

## 5. Every candidate design and what it costs

| Design | Scrolls his fullscreen Claude? | Scrolls a classic agent or a shell? | Identical to local? | New door | Ruling |
| --- | --- | --- | --- | --- | --- |
| **Mouse pass-through** (slice 1) | Yes, any tmux | No | For mouse programs only | None | **Adopted, first** |
| **(b) The local mechanism over the control connection** (slice 2) | Yes, by the same local route 2 | Yes | Yes, on 3.6a, 3.7b and 3.7c | One closed runner on the carriage | **Adopted, held for his word** |
| (a) The local mechanism over the exec plane | Yes, with pass-through | Yes | No: one ssh per operation | A `copy-mode` ledger row and a second guarded `send-keys` door | **Stays refused** |
| (c) Capture history into xterm's own scrollback | No (tmux holds one screen) | Yes, after a load | No: a second scroll model | None | **Rejected** |
| (d) Fix Read last lines only | No | No | No | None | **Rejected as the answer**; its false sentence is still deleted |
| (e) Turn on the far tmux's own `mouse` | Yes | Yes | No: clicks and drags go to tmux | A mutating option | **Rejected** |
| (f) In-band scroll keys bound at boot, sent on the attach | Partly | Partly | No | A boot `bind-key` on every server | **Rejected** |

**The pass-through.** One condition in `handleWheel`, reading a mode xterm already holds. It works on every tmux
version and every machine, carriage or not, and it touches nothing research 57 protected. It does not satisfy the
operator's rule alone, because classic Claude, codex and shells on a machine would still not scroll.

**(b) The control connection.** Investigator B drove the UNMODIFIED `scrollPaneBy`, `scrollPaneTo`, `readPaneScroll`
and `exitPaneScroll` through the UNMODIFIED `TmuxControlClient`, with the carriage
`node relay-pipe.mjs D zsh -c '<tmux> -L p320-invB-* -f /dev/null -C new-session -A -s gmux-control'` standing in
for ssh and D ms added each way, and with row 0 of a real xterm fed by a far pty running the remote attach as the
ruler.

| Reading (tmux 3.7b unless named) | RTT 0 | 6 ms | 50 ms | 120 ms |
| --- | --- | --- | --- | --- |
| One `display-message` over the carriage, median | 0.1 ms | 7.6 ms | 54.5 ms | 124.7 ms |
| One 5-line notch, shipped serial `scrollPaneBy`, time to paint | 1.9 ms | 17.4 ms | 111.3 ms | 251.9 ms |
| The same four commands written back to back, time to paint | 2.5 ms | 8.8 ms | 57.5 ms | 128.9 ms |
| A 1 s trackpad fling (60 flushes of 3 lines), shipped chain, drained after the last flush | 0 | 0.87 s | 12.1 s | 29.2 s |
| The same fling coalesced and pipelined | 0 | 0 | 69 ms | 195 ms |
| Back to live (`exitPaneScroll`), time to paint | 0.9 ms | 9.2 ms | 55.9 ms | 124.9 ms |

tmux 3.6a gave the same shape (pipelined paint 9.8 ms at 6 ms and 55.5 ms at 50 ms; the shipped chain 1.0 s and
12.0 s late; coalesced 0 and 38 ms). Every Phase 292 behaviour held over the carriage at every delay on both builds:
parked 100 lines back while 79 to 90 lines printed over 5 s, row 0 never changed; a resize from 100 to 130 to 100
columns kept the same line; killing the attach and attaching again kept the same line and the pane stayed in copy
mode; `scrollPaneTo 1500` gave 1,500; a relative 2,500 was clamped to the history; the chunked fallback, forced by
refusing `goto-line` once, clamped the same way. On 3.7b `frameHistory` was tmux's own frame depth, so the thumb
gets exact numbers; on 3.6a it was null and the renderer infers it, as it does locally. The operator's Mac Pro runs
3.7c, which takes the `frameHistory` path. The attach carries the redraws: 0.74 to 1.1 KB per 3- or 5-line notch,
about 10.5 KB per 44-line page and about 6 KB to enter or leave copy mode, on a 150 by 45 pane. At depth the link
carries nothing more: on a 90,959-line pane, net of an 11 ms one-shot baseline, `copy-mode -e` cost about 22 ms,
`goto-line` about 0 and a notch about 1 ms (adversary 2, `adv2/deep.sh`).

**(a) The exec plane.** It needs a `copy-mode` ledger row plus a second guarded `send-keys` door with its own
composer and guard token, which is exactly what research 57 refused, and it costs one ssh per operation: 0.07 s
median and 0.36 s worst on a 6 ms LAN. At best one `;`-chained invocation per coalesced operation gives about 14
updates a second on a LAN, and the 250 ms parked poll alone would start four ssh processes a second per pane. Its
one use would be a machine with no live carriage, and the judge ruled against it even there (§7).

**(c) Capture into xterm's own scrollback.** Measured on a 200-column pane of agent-like coloured lines: 25,000
lines is 4,039,202 bytes, 104 to 112 ms of tmux time and 55 ms of xterm parsing, plus about 300 ms of transfer at
research 57's 13.5 MB/s, so about half a second before the first notch at full depth on a LAN; 250 lines is 48,308
bytes. It holds 25 to 37 MB of xterm array buffers per session in the renderer (`invB/mem.mjs`), against none for
(b). It is a second scroll model with its own thumb, drag, selection, copy and resize anchoring, it brings back the
stitching race Phase 295 records, and it cannot reach a fullscreen agent at all, because tmux holds one screen of
it.

**(d) Read last lines alone.** The reporter wrote that "this dialog is not a good way to interact with history",
and the far pane holds one screen anyway.

**(e) The far tmux's mouse.** After `set-option -t $0 mouse on` the attach stream carried `?1000h`, `?1002h` and
`?1006h`, one wheel-up entered copy mode and three reached position 10, because tmux's default binding scrolls 5
lines per event. Every click and drag then goes to tmux, which loses drag-to-select in xterm and the native
right-click menu, which is the cost `resources/gmux-tmux.conf:51-58` gives for `mouse off`.

**(f) In-band keys.** Adversary 2's alternative: fixed tmux user keys bound once at boot, triggered by bytes on the
attach, so scroll and typing share one ordered stream. On 3.7b it worked (3 UP keys scrolled exactly 3 lines,
painted in 10.6 / 55.6 / 127.6 ms at RTT 0 / 50 / 120; 0 of 55 characters lost under momentum). It is not universal:
on 3.6a a burst of 10 UP keys applied 3, and every user key after the first in one read leaked into the program, 20
of 20 times; an escape-prefixed key split across two reads leaked raw on both builds, because `escape-time` is 0;
absolute seek has no clean form (`send -FX goto-line '#{@tseek}'` does not expand, and `run -C` re-parsed an
injected `'7 ; set -p @injected yes'` as a second command on both builds); and a server without the definitions
passes the bytes straight to the program. The judge rejected it as the mechanism.

## 6. What the attack killed

Each was upheld by the judge after an adversary refuted an investigator's claim, or after the judge's own
measurement, so nobody re-derives it.

1. **"Fullscreen is Claude's default on every fresh install" is wrong.** It is the default only when GrowthBook or
   telemetry is off; otherwise two server-side gates decide. The remote-versus-local difference is per machine and
   cannot be predicted. Nothing rests on it.
2. **"Normal output then a fullscreen program returns stale lines" (case D) does not survive** Claude's first
   fullscreen clear, whose `CSI 3J` erases the earlier normal-screen history too. The real symptom is exactly one
   screen at every depth.
3. **Investigator B's design as proposed eats typing, and the loss grows with the round trip.** Adversary 2 ran the
   SHIPPED `ScrollSurface`, `scroll.ts` and `TmuxControlClient` over the relay (`adv2/attack.mts`) against a raw-mode
   recorder pane. The renderer decides where a keystroke goes from its last answer (`surface.ts:376-383`), while
   the notch's `copy-mode` lands on the far pane half a round trip after it is sent. One 3-line notch, then "fix the
   bug" typed at 60 ms per character, starting δ ms later; characters lost:

   | RTT | δ = 0 | 40 | 100 | 200 | 400 | 800 |
   | --- | --- | --- | --- | --- | --- | --- |
   | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
   | 6 ms | 0 | 2 | 0 | 0 | 0 | 0 |
   | 50 ms | 3 | 4 | 3 | 2 | 0 | 0 |
   | 120 ms | 3 | 4 | 4 | 4 | 2 | 0 |

4. **Typing during trackpad momentum loses characters ON THIS MAC TODAY.** A flick of 50 wheel events 16 ms apart
   with typing from 250 ms: adversary 2 measured 4 of 55 characters lost at RTT 0, and the judge's same-session
   control measured 9 of 55 ("fix bg", "fix bug"). The keystroke leaves on the attach while the next wheel
   operation re-enters copy mode on the other channel. On a link it is worse: 18 of 55 at 50 ms and 38 of 55 at
   120 ms, with the surface draining up to 15.9 s after the last key (adversary 2; a surface disposed mid-operation
   leaked keys into the next run, so per-run attribution at 6 and 120 ms is noisy and the totals stand).
5. **A carriage drop while parked wedges typing for the life of the mount.** With the pane parked, the relay killed
   and the carriage back in 1.8 to 1.9 s, nothing typed during the outage or after it reached the agent, the pane
   stayed parked, and the surface held the keys forever: when `api.live` rejects, the held keys are never flushed
   and every later keystroke sees `alreadyDraining` and returns (`surface.ts:384-393`). A remount recovered. Locally
   this needs a failing exec to trigger, because the runner falls back to `execTmux` (`core.ts:2489`); for a remote
   runner a dropped carriage is routine.
6. **The control client hands `refresh-client`'s empty answer to the first command after every connect, locally
   too.** `start()` enqueues `refresh-client -f no-output` with no pending slot (`control-client.ts:312`), and
   `closeBlock` hands the next answer to the first pending caller (`:447`). The judge sent one command the instant
   `connected` fired, which is exactly what the local runner's `this.control.connected` guard allows
   (`judge/misattr2.mts`): the shipped client answered `[]` in 10 of 10 trials, the local shape with no relay
   included, and in 2 of 5 local trials the NEXT command then received the previous command's answer. With a
   placeholder pending entry pushed beside `refresh-client`, 20 of 20 were correct. For `readPaneScroll` an empty
   answer parses as live, so after a reconnect the renderer believes a parked pane is live and types into copy mode.
7. **"The first keystroke after scrolling costs one extra round trip" is wrong for the shipped serial calls.**
   Parked, then typing: the first byte reached the program after 2 to 3 ms at RTT 0, 21 ms at 6, 181 ms at 50 and
   309 ms at 120 (adversary 2). Pipelined it is about 1.5 round trips: 13 / 84 / 187 ms on 3.7b and 84 / 185 ms on
   3.6a (the judge).
8. **A scrollbar drag over a slow link arrives tens of seconds late.** Every pointermove calls `scrollTo`
   (`TerminalScrollbar.tsx:127`, `:135`) and each is queued serially (`surface.ts:342-347`). A one-second drag of 60
   moves from 2,900 to 50 arrived 0.6 ms, 19.0 s and 47.0 s after the pointer stopped at RTT 0, 50 and 120. The
   final position was right every time. Coalescing only the relative scrolls, as investigator B proposed, does not
   reach the drag; it must be latest-wins.
9. **One module-level `goto-line` latch shared by every server is a hazard.** `seekSupport` (`scroll.ts:232`) is
   set to `'no'` by the first failed `goto-line` on any server (`seekPaneTo`). A stand-in remote runner that failed
   its first `goto-line` through a dropped carriage made this Mac's next `scrollPaneTo(2800)` send `-N 2000` and
   `-N 800 scroll-up` and no `goto-line`. At depth that fallback is slow: `-N 2000 scroll-up` cost 436 ms of server
   time on a 90,959-line pane.
10. **The design reaches only three tmux versions.** `TESTED_REMOTE_TMUX_VERSIONS` has three rows, all
    `control: true`, and `decideRemoteControlGate` "TAKES NO ACCEPTANCE, AND IT NEVER WILL" (`version.ts:261-280`),
    because an untested control dialect hangs rather than fails. A machine whose version was accepted for the exec
    plane under Phase 83 never gets a carriage.
11. **In-band keys are not a universal replacement** (§5 (f)).
12. **Several attacks did not land, and the design is not blamed for them.** A resize 60 to 450 ms after a notch at
    RTT 120 gave no `rows − 1` jump; the only difference from RTT 0 was which side of the resize the notch applied
    to. A second client typing 300 ms after the first parked lost 4 of 11 at RTT 0 and at RTT 120 alike, which is set
    by the 1 Hz live poll and not by the link. A 100,000-line history never crosses the link.

**The five preconditions that answer items 3 to 9.** The judge built a copy of the shipped surface with five
changes (`judge/judge-surface.ts`) and ran it over a pipelined bridge in adversary 2's own harness:

- **P1.** A keystroke is held while any scroll that may park the pane is unanswered.
- **P2.** A keystroke ends the wheel gesture: travel not yet sent is dropped, and wheel events are swallowed until
  the wheel has been quiet for 150 ms (the judge's value; the build measures its own).
- **P3.** A held keystroke is flushed only after an answer says the pane is live; the cancel is retried with backoff
  and never wedges.
- **P4.** The `scroll.ts` sequences are pipelined, relative scrolls are coalesced with one in flight, and the drag
  is latest-wins.
- **P5.** `refresh-client -f no-output` gets its own pending slot.

Results, on 3.7b at RTT 0, 6, 50 and 120 ms and on 3.6a at 0, 50 and 120 ms (`judge/results-b37-judge-D0-25.json`,
`results-b37-judge-D3-60.json`, `results-s36-judge.json`): **0 characters lost** after a notch at every δ; **0 of 55**
under momentum in every one of five runs; 0 lost typing while parked; with the carriage dropped while parked,
nothing reached the agent during the outage and every key arrived in order once it was back, with the pane live
afterwards; and the drag settled 0.2 / 18.4 / 289 / 708 ms after the pointer stopped, against 19.0 s for the shipped
surface at RTT 50. The shipped surface, re-run as the control in the same session (`judge/results-b37-shipped.json`),
lost 9 of 55 under momentum at RTT 0 and 23 of 55 at RTT 50 and left the pane parked, and lost 2 to 4 characters
after a notch at RTT 50.

## 7. The design, in two slices

### Slice 1: no tmux verb, no refusal touched

1. **The wheel.** In `handleWheel` (`src/renderer/terminal/scroll/surface.ts:281`), when `noPane` is set, return
   `this.term.modes.mouseTrackingMode !== 'none'` in place of `false`. A far program that asked for the mouse gets
   the wheel as xterm's own mouse report on the attach; a far program that did not keeps Phase 95's swallow, so
   classic Claude still never receives `ESC O A`. The Phase 95 test (`p95-scroll-stops.test.ts:256-271`) is
   restated for mode `none`, and a new one pins `any` and `vt200`.
2. **The two sentences.** `READ_LAST_LINES_HERE_TITLE` and `READ_LINES_ALL_THERE` are deleted from
   `src/renderer/machines/read-lines.ts`, with `showsAllThere` and its paragraph in `RemoteLinesModal.tsx`, and the
   two tests that read them (`src/renderer/app/__tests__/p100-remote-lines.test.tsx`, `p95-strip-note.test.tsx`)
   are rewritten to assert their absence.
3. **P5**, in `src/main/tmux/control-client.ts` (`start()` at `:312` and `closeBlock` at `:447`).
4. **P2 and P3**, in `src/renderer/terminal/scroll/surface.ts`. Both fix loss that happens on this Mac today.

### Slice 2: the carriage door, held for the operator's word

1. `src/main/machines/control-plane.ts` keeps `sendCommand` and its clients private and exports one scroll runner
   for a machine. A new pure module under `src/main/machines/` holds the six shapes and each one's repeat reasoning.
2. `scrollTarget` in `src/main/sessions/core.ts` resolves a remote session to that runner and its `$N`, read from a
   LIVE row on the current carriage connection and never from a gone row (`remoteSessionRow`,
   `src/main/machines/remote-sessions.ts:1068`, also returns gone rows). A carriage that is down answers a transient
   error, which the surface already treats as retry (`enqueue`'s catch, `surface.ts:439-452`), and never
   `NO_PANE_HERE`, whose latch would disable scrolling for the rest of the mount. `NO_PANE_HERE` is kept for a
   machine with no carriage this run, which keeps slice 1's pass-through.
3. **P1**, in `surface.ts`.
4. **P4**: pipelining in `scroll.ts`, coalescing and latest-wins in `surface.ts`. **Pipelining is valid only on an
   ordered carriage.** The local runner falls back to `execTmux`, one process per command
   (`core.ts:2489`), and commands written without awaiting each other there could land out of order. So the runner
   says whether it is ordered, and an unordered one stays serial. This is the writer's reading of the code, not a
   measurement.
5. **The `goto-line` latch** (`scroll.ts:232`) becomes per server.
6. **The drag-select copy** (`src/renderer/terminal/capture/history-copy.ts`) is routed to the machine through
   `capture-pane` and `display-message`, which are already ledger reads.
7. **The band button goes.** The read stays where it already is, in the terminal's context menu at the place this
   Mac's capture items take (`Read Last Lines…`, `src/renderer/terminal/terminal-menu.ts:240`), so that menu keeps
   local's shape and no menu changes.
8. **The refusal is amended in the same commit**: research 57 §3.1 and §12's rows, the BACKLOG lines named in §4 by
   an edit that points here, the wording of condition 54b, the paragraph at `read-lines.ts:19-25` ("there is not
   going to be one"), and `TerminalScrollState.hasPane`'s comment in `src/shared/ipc/terminal.ts:324-338`, which
   names "a session that runs on another machine" as an ordinary no-pane case.

### What it costs, stated

- One read a second per mounted remote pane, four a second while parked (`LIVE_POLL_MS`, `SCROLLED_POLL_MS`,
  `surface.ts:52`, `:73`), on the pipe that already exists.
- About 1.5 round trips before the first keystroke after a scroll: 13 / 84 / 187 ms at RTT 6 / 50 / 120.
- A drag that settles 18 / 289 / 708 ms after the pointer stops at RTT 6 / 50 / 120.
- Slice 2 only on tmux 3.6a, 3.7b and 3.7c. No exec-plane fallback.
- One behaviour change on this Mac from P2: a trackpad momentum tail still running when a person types is dropped
  rather than applied. Today it keeps re-entering copy mode and eats their keys.

## 8. What was not measured and why

- **A real ssh hop.** No ControlMaster framing, TCP head-of-line blocking, jitter, packet loss or relayed path; the
  delay was a fixed D each way in separate processes. Real coalescing is exactly what would put two writes in one
  far read. `ssh -t` pty allocation, `TERM` forwarding and far login rc files were not reproduced.
- **The operator's tmux 3.7c, and any Linux tmux.** The vendored 3.7b and this Mac's 3.6a were run. The reporter's
  version is unknown. Which tmux versions common Linux distributions ship was not measured, and it decides how many
  machines slice 2 reaches.
- **A real far `history-limit` read back from a machine.** The emulation read back 25,000.
- **A real Claude Code.** Its renderer choice, clear sequence, mouse modes and replay were read from the 2.1.280
  bundle and replayed by stand-ins. The stand-ins did not send `1003` or `1016`; the judge's covered `1003`. The
  reporter's Claude settings, environment and gates were not observed, and a still frame cannot show the renderer.
- **The app.** No Electron was started in this phase. A remote session in the app needs
  `build/with-scratch-machine.mjs`, which starts sshd and an ssh agent and writes a `TMUX_TMPDIR` under `/tmp`
  because of the 104-byte socket path limit, which was outside this research's write limits. So the renderer arms of
  `probe:p292` were not driven over a remote session: the thumb against the honest formula, the held drag, the pane
  reports routed by `src/renderer/terminal/keys/pane-report.ts`, and soft-wrapped reflow. They are renderer- or
  tmux-side and unchanged by the design, but they are unmeasured on a remote session, and they are the build's
  proof.
- **xterm generating a real trackpad wheel.** The judge drove xterm's own `triggerMouseEvent`; the other
  measurements typed the SGR bytes. Whether a real momentum tail overlaps typing on his trackpad is assumed.
- **Whether Ctrl+B reaches the far client through the real renderer.** Read from `keys/index.ts`, not driven.
- **What the far tmux does with outer mouse modes while the pane is in a copy mode the person entered by hand.**
- **Whether P2's 150 ms quiet window is right for a real trackpad.** It is the judge's value.
- **Whether the pane's identity should ride on every read.** A `$N` reused after a far restart is caught by reading
  the target per operation on the current connection. Whether `STATE_FORMAT` should also carry the session's identity
  option so a reused `$N` is caught at the next poll was raised by adversary 2 and not ruled on; the build's spec
  step decides.
- **In-band keys over a real link on 3.6a**, where two writes coalesced into one far read would leak a key.

## 9. Found on the way, and not this phase

- **A create after a far server has ended can start a server with tmux's defaults.** `createRemoteSession` runs
  `ensureRemoteServer` only when the agent carries pass-through names (`remote-sessions.ts:1590`), the feed counts
  `no-server` as answering (`:738`, `:2476-2478`), and `remoteCreateArgs` sends a bare `new-session -d … -f
  /dev/null`. A server started that way (`adv1/born.sh`, both builds) had `status=on` (tmux's own status bar),
  `history-limit` 2,000, `extended-keys=off`, `exit-empty=on`, `remain-on-exit=off`, `allow-passthrough=off` and a
  yellow `mode-style`. It gives 2,000 lines, not one screen, so it is not issue 31. Reachability was read from the
  code and not driven. It is a correctness item for its own entry.
- **Claude's own hint may leak tmux vocabulary into a Tortie pane.** From the bundle, not observed: when fullscreen
  is active, `TMUX` is set and `tmux show -Av mouse` is not `on`, Claude prints "tmux detected · scroll with
  PgUp/PgDn · or add 'set -g mouse on' to ~/.tmux.conf for wheel scroll". Tortie's servers set `mouse off`
  (`server-options.ts:85`) and read `-f`, so the advice would not help. It would appear locally too. Its own entry
  if it is ever observed.
- **A fullscreen agent's transcript is never in tmux** (§2.6), so capture, saved output and Read last lines hold one
  screen of it everywhere. A stated limit rather than a defect.

## 10. The rulings it needs from him

1. **"Narrow research 57's refusal of a real remote scrollbar?"** The change allows one closed door on each
   machine's control connection: six fixed command shapes, whole numbers only, a pinned read format, targets taken
   from live rows, pinned by conformance with an ablation per clause. It adds no exec-plane ledger row and no open
   `send-keys -X` family, and Phase 89's typing door is untouched. **What the build does without an answer:** slice 1
   ships, being the mouse pass-through, the two deleted sentences and the three typing fixes, which also fix this
   Mac. Slice 2 is not built until he says yes.
2. **"Measure the control connection on the tmux versions Linux distributions ship?"** Today it opens only on 3.6a,
   3.7b and 3.7c, and the reporter's machine is Linux with an unknown version. **What the build does without an
   answer:** no such research is queued. On any unmeasured version, sessions whose program asked for the mouse,
   fullscreen Claude among them, scroll after slice 1, and ordinary-screen sessions there stay without a wheel, with
   no exec-plane fallback.
