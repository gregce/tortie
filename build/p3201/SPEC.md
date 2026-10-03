# Phase 320.1, the second build: a session on another machine scrolls like one on this Mac (SPEC)

Subject: `feat(machines): a session on another machine scrolls like one on this Mac`
First body line: `Phase 320.1: the local scroll over each machine's own control connection`
Semver: Minor. Tier 3. Rewritten 2026-09-30 in `/private/tmp/wt-p3201` over the first attempt's uncommitted work at
`d8f5c261`. The first attempt's spec, with its three `§As built` sections, is kept byte for byte at
`scratchpad/p3201r/spec/SPEC-first-attempt.md` (sha256 `38cd1d10…48ec9`); everything in it that still binds is
restated below, so a builder never needs it.

Charter, in his words. Issue 31, Jake Levirne: "Expect it to scroll just like a local session does." His standing
rules: a remote session feels identical to a local one with no explanatory text because it is remote; a phase lands
only when a side by side against today shows no scenario worse, and the part that regresses is REMOVED, not repaired.
His ruling of 2026-09-23 approved the carriage door (research 130 §4, narrowing research 57 §3). His words of
2026-09-29: "to test 320.1 u can attach to my mac pro to drive sessions and verify". **His ruling of 2026-09-30, on the
first attempt's second needs_work: "Redesign and rebuild" — "a corrected plan: the wheel follows what the program
asked for at that moment, no typing delay on remote sessions, and settings that also work on Linux machines; another
full build and test round, with your Mac Pro in the tests again."**

Binding sources: this file; the Phase 320 entry (`docs/BACKLOG.md:33792-34169` at this head, its 320.1 parts);
research 130 whole; research 131 §3.3 and §3.5; the first attempt's three verdicts in
`subagents/workflows/wf_c59975f4-7f0/journal.jsonl` (`verify:attack`, `verify:parent-and-typing`, `reverify:p3201`),
which are the ground truth for what failed; and the running-log line of 2026-09-30 on `origin/main`.

**ONE QUESTION IS HIS AND BLOCKS §6.4 (the operatorQuestion).** The design below sends keystrokes typed over a
scrolled-back remote session through the control connection, which is a SEVENTH command shape, and the door he
approved on 2026-09-23 had six that could only move the view. §5 D7 says why nothing else meets "no typing delay"
without losing keys, and §6.4b is the build if he says no. Everything outside §6.4 is the same under either answer.

## 0. Why this round exists, in numbers

The first attempt's reverify measured, in the app, at `d8f5c261` (the parent) and at the first attempt's HEAD:

| Row | Today | First attempt | Verdict |
| --- | --- | --- | --- |
| Typing through a fast flick on THIS Mac (T1, the M3 shape) | 15 of 440 characters lost | 0 of 440 (Fisher two-sided p = 5.4e-5) | better; KEPT |
| The reporter's case: wheel over a far full-screen program that asked for the mouse, within ~1 s of it asking (R1, R1X, FS2) | 20/20, 60/60, 80/80 on loopback; 60/60 on his Mac Pro | 0/20, 0/60, 0/70; Mac Pro 0/10 and 40/60; the pane then stuck in copy mode (0 of 5 notches 3 s later) | WORSE; replaced (D1) |
| Typing through a flick on his Mac Pro over Tailscale (round trips 6.4 to 96.8 ms) | 0 of 220 | 4 of 220 (`fix h bug`), K1 1 of 90 | WORSE; replaced (D6, D7) |
| A key typed over a parked remote session, then another session chosen at once (T3, LEAVE) | every key (50/50, 4/4) | 0 of 20 at δ 0 and 0.5 ms (loopback, both tmux); 0 of 30 at δ ≤ 5 ms (Mac Pro) | WORSE; replaced (D7, D8) |
| A far control client with no UTF-8 locale | nothing parks | before the fix round: tabs read as `_`, the read failed open, 115 of 330 characters lost in the rig | FIXED by the fix round and CONFIRMED FIXED by the reverify in the app (32 clients with no locale, 8 of 8 operations equal to the far server's own reading; a garbling far tmux fails closed, 0 of 126 lost); KEPT (D10) |
| His far `~/.zsh_history` on the Mac Pro | untouched | modified time moved on every real-row run (size unchanged, content never read) | the proof's defect; fixed (D12) |

The running-log line of 2026-09-30 lists the locale as its fourth worse row. That row is the FIRST verify's finding
(`verify:attack`), which the fix round answered and the reverify measured fixed; the reverify's own problem list does
not carry it. It is kept here as a requirement (D10), not as an open defect.

## 1. The design in one paragraph

Main answers the renderer's four scroll calls for a session on another machine by running this Mac's own
`src/main/tmux/scroll.ts` over that machine's existing control connection, through the closed door of the first
attempt (a table checked before a byte is written, targets from live rows on the current connection, a locale-proof
read that fails closed). What changes: **the wheel follows the program as it is at that moment** — the renderer asks
xterm's own mouse mode, which the far tmux mirrors onto the attach within a millisecond of the program's request
(measured, §4 M1), before it asks main's once-a-second read, and main reads the far pane immediately before it parks
it and never parks a pane whose program has taken the screen or the mouse; **keystrokes to a remote session are never
held or fenced in the renderer**: main decides, key by key, which of the two roads to the far pane a keystroke takes,
the attach (the person's own terminal, as today) or the control connection (behind a `cancel`, in the one order tmux
keeps, measured 600 of 600), and the two roads never overlap: a road is taken only once the other has been quiet for
`ROAD_QUIET_MS`. So a key over a parked pane goes out at once and in order, a switch to another session cannot strand
it, and a flick while typing cannot overtake a key. This Mac keeps the first attempt's measured typing half unchanged.

## 2. What held, and is KEPT as built (each with what held it)

| Kept | Where | What held it |
| --- | --- | --- |
| The carriage door: `admitScrollArgv`, the table, `guardedScrollRunner` with its ONE copy of the caller's list (`Array.from`), the 5,000 ms caller deadline, `INVALID_INPUT`/`TMUX_UNREACHABLE` refusals with zero sends | `src/main/machines/scroll-shapes.ts` | attack: 323 hostile argvs in 11 categories refused with 0 bytes on 3.6a, 3.7b and his 3.7c; 6 Proxy/getter shapes wrote nothing or exactly the bytes checked; 200,000 fuzzed argvs, 0 disagreements with an independent checker; far tee saw only the six shapes plus `refresh-client` (9,914 lines in the reverify's app run, 0 unexpected) |
| `remoteScrollRunner(machineId)` → `none`/`waiting`/`live`, the private `generations` and `dialectRefused`, `clients` and `sendCommand` private | `src/main/machines/control-plane.ts:226,238,786` | attack: a runner made before a reconnect refused with 0 writes (generations 1 → 2); a far server restarted with `$0` reused never parked (A1 on 3.6a and 3.7b) |
| D4's addressing: `controlEpoch`/`rowsEpoch`, `scrollAddressOf`, `remoteScrollAddress`, never `remoteSessionRow` | `src/main/machines/remote-sessions.ts:638,1132,1143` | reverify TGT: only the pane shown parks, on loopback and 3.7c |
| The not-reachable-now VALUE (`unreachable?: boolean`), never a throw; `NO_PANE_HERE` for no carriage this run | `src/shared/ipc/terminal.ts`, `core.ts:594,617` | reverify: 0 scroll error lines at either build; A2 (unmeasured tmux) identical to the parent |
| The locale-proof read: `REMOTE_STATE_FORMAT` (the eight fields joined by ONE SPACE), strict `parseRemoteState` throwing `UnreadableScrollAnswer`, `proveRemoteRead` once per connection (an unreadable connection answers `NO_PANE_HERE` and writes nothing else) | `src/main/tmux/scroll.ts:211,282`, `core.ts:2706` | reverify: 32 far clients with no locale, all 8 operations equal to the far server; a garbling far tmux: nothing parks, 10/10 reports, 0 of 126 lost; this spec's M2 (§4) |
| `STATE_FORMAT` for this Mac, byte identical to the parent (tab separated) | `scroll.ts:179` | M2: every client this Mac starts carries `LANG=en_US.UTF-8`, and a UTF-8 client reads tabs intact on both versions |
| The pipelined sequences for ordered runners with a server; the `goto-line` latch this Mac's alone | `scroll.ts:458,647` | integrator and attack: no unhandled rejection; a machine's failed seek walks nothing |
| The drag-select copy read on the machine: `remote-pane-history.ts` (NOT `remote-history.ts`, Phase 107's module), space-separated `REMOTE_EXTENT_FORMAT`, strict `parseExtent`, `clampHistoryRange` in `scroll.ts`, routed in `src/main/capture/ipc.ts` | as named | reverify C1: 665 bytes, 74 rows from the machine, no local text (the grade itself is repaired, D13) |
| The band button removed; `Read Last Lines…` kept in the terminal menu; no menu change | `session-actions.tsx`, `SessionStrip.tsx`, `TerminalRegion.tsx`, `app.css`, `read-lines.ts` | reverify R5 |
| This Mac's typing half: P1 hold, P2 32 ms key fence, P3 retry and one final call at dispose, P4 coalescing and latest-wins | `surface.ts:656-934` | reverify, in the app, alternating blocks: T1 HEAD 0/440 vs parent 15/440; K 0/168 vs 8/168; T2 60 lines both; T3 and T4 equal |
| `ablation:p320`'s shape and its 42 arms, `conformance:machines` conditions 66 and 101 to 108 | `build/p3201/ablation.mjs`, `build/conformance-machines.mjs` | fix round: 42 of 42 red on their owners |

## 3. What failed, and is REPLACED

1. **The wheel route read main's once-a-second poll as the truth about the far program** (`handleWheel`,
   `surface.ts:421`, `owned` from `viewOf`). For up to a second after a far program asked for the mouse the wheel went
   to copy mode, parked the pane, and Phase 292's "a parked pane keeps its wheel" then kept every later notch there.
   The same race exists on this Mac at the parent (R1X local 0 of 60 at both builds), so Phase 292's own rule carried
   a local defect to machines where it did not exist. Replaced by D1 to D3.
2. **The remote typing path held keys in the renderer and fenced scrolls by 32 ms** (P1 `mustHold`, P2
   `awaitKeyFence`, the drain). A held key is delivered only on a `live` answer, which arrives after the attach has
   detached when the person leaves at once (T3 0/20); and a fence only delays, it does not order two roads, so on a
   real link a scroll written 32 ms after a key still landed first (Mac Pro T1 4/220). §4 M3 shows why no fence can
   be the answer: the two roads reorder on one Mac with no network at all. Replaced for remote sessions by D5 to D9;
   this Mac keeps P1 to P4 (§2).
3. **The proof's tools**: `probe:p320` could not finish a default run (R3 after R3L left the local project showing,
   and every arm after the throw printed PASS); T2 graded 30 lines where the flick moves 60 on both builds; C1 read
   "not byte equal" on 665 bytes a side; `real-machine.mjs` let the far server start his login shell, missed
   `/usr/local/bin/node`, and so never ran R1 there. Replaced by D12 and D13.
4. **D15's claim** ("keys held through an outage are delivered in order when it comes back") failed at both builds
   (T5: "f" of "fix"; OUT 12 of 72 at HEAD, 1 of 18 at the parent). Struck; the outage row is graded against the
   parent only (§9).

## 4. Measured for this spec (loopback only, no Electron, no ssh to any other machine)

All four under `scratchpad/p3201r/spec/`, scratch servers `-L p3201r-spec-<tag>-<pid>`, `-f /dev/null`, `SHELL=/bin/sh`,
`HISTFILE=/dev/null`, an empty `ZDOTDIR`, every server ended by its own pid in a `finally`, 0 left at the end.
Versions: 3.6a (`/opt/homebrew/bin/tmux`) and 3.7b (`build/vendor/tmux/bin/tmux`). 3.7c has no binary on this Mac
(research 131's builds were cleaned); its row is the verifier's, on his Mac Pro.

**M1, how soon each reader learns a program asked for the mouse** (`m1-mouse.mjs`, 20 trials a version; a stand-in
writes `CSI ? 1049 h`, `1000/1002/1003/1006 h` on a byte and the reverse on another; the attach is a node-pty
`tmux -u attach-session`, the reader a pipelined control read of `#{mouse_any_flag}`):

| | 3.6a | 3.7b |
| --- | --- | --- |
| The attach's terminal receives the mouse request, after the program wrote it | median 0.10 ms, max 1.78 | median 0.14 ms, max 2.59 |
| A control read first answers 1 | median 0.11 ms, max 1.83 | median 0.15 ms, max 2.63 |
| The same for giving the mouse back | 0.09 / 0.10 ms median | 0.12 / 0.13 ms median |
| A format subscription (`refresh-client -B 'mm:%N:#{mouse_any_flag}'`), accepted | never fired in 20 trials | never fired in 20 trials |
| While the pane is in copy mode | the attach turns OFF 1006, 1000, 1002, 1003 on its terminal; `#{mouse_any_flag}` still reads 1 | the same |
| At `cancel` | the attach turns all four back ON | the same |

So the "about a second" is the renderer's own `LIVE_POLL_MS` and nothing in tmux. Read in 3.7b's source
(`control.c:880-925`, `:1042-1056`): a subscription is checked on a ONE SECOND timer and only for a pane whose window
is linked into the control client's own session, which the carriage's `gmux-control` session never is; so
subscriptions can never help, on any version. `%pane-mode-changed` is sent to every control client
(`control-notify.c:31-39`) but only when a pane enters or leaves a mode (`window.c:1254`, `:1290`), never on a mouse or
alternate-screen change. **Neither is used.** xterm's own `mouseTrackingMode` is the fastest reader Tortie has, and it
reads `none` over a parked pane whatever the program asked.

**M2, the locale of `-F` separators** (`m2-locale.mjs`; a server started with and without `LANG`/`LC_*`; control and
command clients with and without; `-u` on and off; a pane holding 1,977 lines of history):

| Client | Tab format | Space format | Extent, tab | Extent, space | `#{client_utf8}` |
| --- | --- | --- | --- | --- | --- |
| UTF-8 locale (any server locale) | `0\t\t1977\t24\t0\t0\t80\t` | `0  1977 24 0 0 80 ` | `1977\t24` | `1977 24` | 1 |
| NO locale, control client (any server locale) | `0__1977_24_0_0_80_` | `0  1977 24 0 0 80 ` | `1977_24` | `1977 24` | 0 |
| NO locale, command client (the exec plane's shape) | `0__1977_24_0_0_80_` | intact | `1977_24` | intact | — |
| NO locale, control client with `-u` | tabs intact | intact | intact | intact | 1 |

The CLIENT's locale alone decides; the server's changes nothing; a space survives every client on both versions. The
fix round's separator is right and `-u` stays unused (it would change `CONTROL_ATTACH_ARGS`, shared with this Mac and
pinned since `ab94847`).

**M3, ordering between the two roads to one pane** (`m3b-order.mjs`; a raw recorder in the pane whose reading never
waits on its own output, the load printed by a child sharing its terminal; the attach a node-pty
`tmux -u attach-session`; the control client in Tortie's line shape; every key a Latin Extended character, which the
emacs copy-mode table does not bind, so an eaten key has no side effect; three loads: none, 40 lines every 5 ms, and
200 lines every 1 ms with the attach's reader paused 20 ms in every 40, the way the attach host pauses under flow
control).

Each cell is 100 trials, every key a character unique for the whole run and attributed by what it is (0 duplicates;
an earlier version that attributed by two processes' clocks read 12 reversed where identity reads 91, and is
discarded):

| Loopback scratch server, no ssh | 3.6a none | 3.6a 40/5 ms | 3.6a heavy | 3.7b none | 3.7b 40/5 ms | 3.7b heavy |
| --- | --- | --- | --- | --- | --- | --- |
| i. parked; `cancel` then `send-keys -H`, ONE control connection: delivered | 100 | 100 | 100 | 100 | 100 | 100 |
| ii. parked; `cancel` + `-H` byte on the control connection, then a byte on the attach at once: reversed / attach byte eaten | 91 / 0 | 76 / 2 | 19 / 1 | 91 / 0 | 76 / 1 | 11 / 6 |
| iii. parked; `cancel` on the control connection, then the byte on the attach at once: eaten | 0 | 5 | 2 | 0 | 5 | 10 |
| iv. live; a byte on the attach, a park on the control connection in the same tick: eaten | 1 | 3 | 5 | 1 | 2 | 17 |
| iv. the same, the park 1, 2, 5 or 16 ms later: eaten | 0 of 400 | 0 of 400 | 0 of 400 | 0 of 400 | 0 of 400 | 0 of 400 |

Read together: **one control connection keeps order every time; the two roads do not, even on one Mac with no
network**, in every direction a design could rely on: a key sent on the control connection and then one on the
attach arrive reversed; a `cancel` on the control connection and then a key on the attach loses the key; a key on the
attach and a park written in the same tick loses the key. A fence can shrink these windows and cannot close them,
which is exactly what the Mac Pro measured at 32 ms. §4 M4 is what the stand-in bytes look like on each road.

**M4, what a byte becomes on each road** (`m3-order.mjs` part v, pane live, 3.6a and 3.7b alike): `send-keys -H` of
xterm's bytes and the same bytes typed on the attach reach the program identically for `a`, `é`, `日本`, `😀`, Enter,
Backspace, Ctrl-C, `ESC [ A`, Escape, Tab and Alt-b. Three differ, because on the attach tmux parses keys and encodes
them for the program's own modes and `-H` does not: `ESC O A` (the attach delivered `ESC [ A` to a program not in
application cursor mode), `ESC [ 13 ; 2 u` (the attach delivered `\r` to a program that did not ask for extended
keys), and a bracketed paste (the attach stripped the markers for a program that did not ask for them). Over a parked
pane xterm's own modes follow copy mode's screen, so xterm sends the plain forms; the one difference a person can meet
is a cursor or keypad key typed as the first key after scrolling back into a program in application cursor mode,
which then receives `ESC [ A` rather than `ESC O A` (§5 D7, a stated limit).

## 5. Decisions, each with its reason

**D1. The wheel asks xterm first (renderer, every pane).** In `handleWheel`, after the `noPane || unreachable` branch
(unchanged) and when the pane is NOT parked (`!state.inMode`): `wheelReachesProgram(term.modes.mouseTrackingMode)`
true → return true (the program's report, on the attach). Reason: M1, the attach's terminal learns the request within
0.1 ms of the program (median) where the read can be a second old. It applies on this Mac too: the surface does not
know machines, the local race is the same race (R1X 0/60 at the parent), and the change only ever sends the wheel
where the program asked for it at that moment. A parked pane keeps Phase 292's rule first, because xterm reads `none`
over a parked pane (M1).

**D2. A read that says the program asked, over a terminal that says it no longer does, sends nothing (renderer).** Not
parked, xterm's mode not a reporting one, and the last read says `innerMouse`: return false and ask for a read now
(`refresh()` from the handler, at most once per `LIVE_POLL_MS`). Reason: the read is stale in one direction or the
other, and handing the event to xterm with mode `none` types `ESC O A` into a program that just left full screen, which
is Phase 95's defect; the parent's remote route swallowed it too. A read that says alternate screen WITHOUT the mouse
(`less`, a vim with no mouse) keeps route 2 (return true), unchanged. Everything else is ours, unchanged.

**D3. Main never parks a pane whose program has taken the screen or the mouse (remote runners only).** For an
operation that may park a remote pane that main does not know to be parked (`by` with lines > 0, `to` with position >
0): first ONE read; if it says `inMode`, go on as today; if it says `innerAlt` or `innerMouse`, answer that read and
write nothing else; otherwise run the pipelined sequence, and if ITS read says the pane is now in copy mode over a
program with `innerAlt` or `innerMouse`, the program took the screen while the park was on its way: send `cancel` and
answer the read after it. Reason: D1 closes the window only as fast as the attach carries the request, and over a
loaded link the read can know first; this is the only rule that makes "never parked" true at the far side. A pane
the person parked on ordinary lines keeps Phase 292's measured exception when its program later takes the screen (the
reader is reading real lines; leaving copy mode would throw them to live, a regression on this Mac and there). Cost:
one round trip before the first notch of a gesture paints (notches while parked stay one round trip). This Mac's
scroll path stays byte identical: its attach is local, D1 closes its window, and `probe:p292` pins it.

**D4. No format subscription and no `%pane-mode-changed` reader.** M1: a subscription is a one-second timer and never
fires for the carriage's session; the notification says nothing about the mouse. Main's per-session knowledge of a
parked pane comes from the answers to the operations it ran, as this Mac's does.

**D5. On a remote session the renderer neither holds nor fences a keystroke.** Every answer main gives for a session
on another machine (a live answer and the not-reachable-now value alike) carries `keysOrderedInMain: true`; a surface
that has seen it sends every keystroke straight through `term.sendInput`, arms no key fence, and runs no drain. Reason:
his ruling ("no typing delay on remote sessions"); M3 (a renderer cannot order two roads); and T3 (a held key dies
with the mount). P1 to P3 stay this Mac's, where they measured better.

**D6. Main chooses the road for each remote keystroke, and the two roads never overlap.** A new pure-state module,
`src/main/machines/scroll-order.ts`, keeps per remote session: `parked` (the last answer's `inMode`, set true when a
parking sequence is written), `mayBeParked` (a parking sequence that settled without a readable answer),
`inFlight` (carriage sequences written and unanswered for this session that can leave the pane parked or that type:
a park and D3's read before it, a return to live, a typed key; NOT the poll's read of a pane not known parked, which
would otherwise flip a keystroke typed at rest onto the other road), `lastCarriageAt` (when the last of those
settled) and `lastAttachKeyAt`. The attach host calls
`routeKey(sessionId, data)` synchronously for every keystroke to a REMOTE client, before `pty.write`:
- the key takes the CONTROL CONNECTION when `parked || mayBeParked || inFlight > 0 || now − lastCarriageAt <
  ROAD_QUIET_MS`, and the session has a live address and a live carriage;
- otherwise it takes the ATTACH, as today, and `lastAttachKeyAt = now`.
And an operation that may park a pane main does not know to be parked waits, before its first write, until
`now − lastAttachKeyAt ≥ ROAD_QUIET_MS`; a key typed during that wait takes the attach (nothing is on the carriage yet)
and restarts the wait. `ROAD_QUIET_MS = 200`. Reason: M3's three reorderings are all a SWITCH of road with the old
road's bytes still travelling; with both switches forbidden until the other road has been quiet, the only order
that matters is within one road, which tmux keeps (M3 i). 200 ms is twice the slowest round trip measured to his Mac
Pro (96.8 ms), and here a park written 1 ms or more after a key on the attach never took it (0 of 2,400, M3 iv) while one
written in the same tick took up to 17 of 100; the verifier measures the same window on his Mac Pro under a flick (§9, the skew arm) and the phase
fails if any key is lost at 200 ms. What it costs, stated: a scroll begun within 200 ms of typing on a remote session
starts up to 200 ms later (this Mac: 32 ms); no keystroke ever waits. In the reverifier's M3 shape (flick first,
typing into it) no scroll waits at all, because every key typed into a moving flick takes the control connection.

**D7. A key over a possibly parked pane goes out on the control connection at once, behind a `cancel` (THE SEVENTH
SHAPE, his to approve).** `send-keys -t $N -H <hh> …` — one to `TYPED_BYTES_PER_COMMAND = 256` elements, each exactly
two lowercase hex digits — carrying the UTF-8 bytes of the `term:input` chunk, preceded by `send-keys -t $N -X cancel`
(tolerated "not in a mode") and followed by the read, all written in the same tick the chunk arrived. Reason: it is
the only arrangement measured to deliver a key over a parked pane with no wait and no loss (M3 i: 600 of 600
delivered, on both versions, at every load; one client's commands run in the order written); `-H` names no key, binding or command (`cmd-send-keys.c:116-121`:
each argument is one byte, `KEYC_LITERAL`), cannot reach `copy-pipe*` once the `cancel` ahead of it has run on the
same connection, and carries exactly what the attach would have carried from the same renderer, which can already type
anything into that session. Its limit, stated (M4): a cursor or keypad key typed as the first key after scrolling back
into a program in application cursor mode arrives as `ESC [ A` rather than `ESC O A`. It widens the door he approved as
six shapes that could only move the view, and research 130 §4's line "none of the five `-X` forms can put a byte in
front of the program" stops being the whole truth of the door, so **it waits for his word** (§6.4, §6.4b).

**D8. A switch to another session cannot strand a key.** Under D6 and D7 the key is written to the far pane (on one
road or the other) inside the `term:input` listener, before the renderer's unmount can reach main (one IPC pipe, in
order). Nothing about delivery depends on a mount. The renderer's `settleHeldOnDispose` never runs for a remote
session, because nothing is held there.

**D9. Every carriage failure fails toward today.** A typed sequence that is refused (`waiting`, a moved generation, a
dead client) is written to the attach instead, which is what today does; a typed sequence that was written and then
failed or timed out is never retried (at most once, research 57's principle) and sets `mayBeParked`; a parking
sequence whose answer cannot be read sets `mayBeParked`, so the next keys take the control connection, whose `cancel`
leaves copy mode whatever Tortie believed. Stated limit (as the first attempt's §5): a pane left parked when its
machine's control connection goes away for good keeps copy mode, and keys typed there reach copy mode; the outage row
is graded against the parent (§9).

**D10. Locale-proof reads on every far machine: kept as built (§2), required, and extended to the new read.** Every
read main makes of a far pane uses `REMOTE_STATE_FORMAT` and `parseRemoteState`, the typed sequence's closing read and
D3's read included; an unreadable answer fails closed (`NO_PANE_HERE` for the connection when it is the first,
`mayBeParked` and the not-reachable-now value after); `STATE_FORMAT` for this Mac byte identical. Reason: M2, and a
Linux sshd without `AcceptEnv LANG` is exactly the no-locale row.

**D11. Kept whole: the carriage door, D4's addressing, the drag-select copy on the machine, the band button's removal,
this Mac's typing half (§2).** Nothing in them failed a measurement.

**D12. The far machines write nothing outside their scratch directory.**
- His Mac Pro (`build/p3201/real-machine.mjs`): the wrapper `bin/tmux` exports `SHELL=/bin/sh`,
  `HISTFILE=/dev/null`, `ZDOTDIR=<run dir>/zdot` (made empty, mode 0700) and `TMUX_TMPDIR=<run dir>` before it execs
  tmux, so the scratch server's global environment and `default-shell` carry them; the proof step, BEFORE any session
  is made, reads back `show-options -gv default-shell` = `/bin/sh` and `show-environment -g ZDOTDIR` = the run's
  `zdot`, beside the socket proof it already makes (which accepts the `/private` spelling). macOS's `/etc/zshrc` sets
  `HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history`, so even a far session whose argv names zsh writes its history inside the
  run directory. Node is found BY PATH: `P3201_REAL_NODE` if set, else `dirname(P3201_REAL_TMUX)/node`
  (`/usr/local/bin/node`, v22.16.0, on his Mac Pro), and the report names which. Before the first contact and after
  the last: size and modified time (never content) of `~/.zsh_history`, `~/.bash_history` and `~/.zshrc`, and
  printed-only `~/.zcompdump*`; **the run FAILS if any of the three moved.**
- The loopback machine (`build/scratch-machine.mjs`): opt-in `SCRATCH_MACHINE_QUIET_SHELL=1` appends
  `ZDOTDIR=<yard>/zdot HISTFILE=/dev/null` to the one `SetEnv` line beside `TMUX_TMPDIR` (default off, so every other
  probe is byte identical). `probe:p320` and `probe:p292:remote` set it. Reason: the loopback far shell is HIS zsh with
  HIS rc files on THIS Mac (the oh-my-zsh prompt stopped `type` in 3 of 4 of the reverify's 3.6a runs) and it can
  write HIS local `~/.zsh_history`; the same census runs on this Mac's three files and fails the run the same way.

**D13. The proof's tools are repaired before they are believed.**
- `probe:p320`: the remote arms run BEFORE any local arm, and any arm after a stage that threw prints `not run`
  (never `PASS`), in `probe-p320.mjs` and `probe-p292.mjs` alike; R3 re-opens the remote project before it shows its
  session.
- T2 is graded against the lines the SAME flick moves on this Mac in the same invocation (60 for 30 one-line events at
  both builds), within one line, and the delay to the first moved line is graded against D6's bound (§9).
- C1 keeps the far text it compared in the readings; the grader derives the expected rows with the SHIPPING
  `clampHistoryRange` over the extent the far server reports at the copy, and resolves the reverify's unexplained
  one-row offset before it grades.
- The rig (`build/p3201/typing-rig.mts`) imports the SHIPPING `scroll-order.ts` for every decision this spec adds and
  sends its keys through `routeKey`; the thin part of core it still restates (which runner, the read proof) is listed
  in its header. It adds S7 (a key, then the session left at once) and a 16 KB paste over a parked pane (byte exact).

**D14. No second version gate, no change to `decideRemoteControlGate`, `TESTED_REMOTE_TMUX_VERSIONS` or
`CONTROL_ATTACH_ARGS`.** `-H` exists on every tmux the carriage opens on (measured 3.6a and 3.7b; 3.7c is the
verifier's). If Phase 324 adds 3.6 and 3.6b, 320.1 reaches them unedited.

**D15. `HELPER_USER_FLOOR` does not move.** No new script reaches `build/electron-run.mjs`; the new
`build/p3201/skew.mjs` is node only. The worktree reads 153; main reads 155 (Phases 330 and 331); after the rebase it
is main's.

## 6. Main side (builder A)

### 6.1 The contract, `src/shared/ipc/terminal.ts` (FIRST, append-only)

On `TerminalScrollState`, after `unreachable`:

```ts
  /**
   * Phase 320.1. Main orders this pane's keystrokes against its scrolls (a session on another machine): send every
   * keystroke straight, hold none, and put no key fence in front of a scroll.
   */
  keysOrderedInMain?: boolean;
```

No channel is added. `gate:contract` is expected unmoved; if it moves, regenerate
(`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, builder C's file) and name the lines.

### 6.2 `src/main/machines/scroll-order.ts` (new)

Pure state and decisions; imports `scroll-shapes.ts`, `control-plane.ts`'s `remoteScrollRunner`,
`remote-sessions.ts`'s `remoteScrollAddress` and `../tmux/scroll`'s readers; names neither `'send-keys'` nor
`'copy-mode'` (argvs come from `scroll-shapes.ts`, so condition 66 stays at four files). Exports, each a named
function the ablation can reach:
- `ROAD_QUIET_MS = 200`, `TYPED_BYTES_PER_COMMAND = 256` (the second may live in `scroll-shapes.ts`).
- `routeKey(sessionId, data, now?) → 'attach' | 'carriage'`: D6's rule; on `'carriage'` it has ALREADY written the
  typed sequence (`cancel`, the `-H` chunks, the read) before it returns, synchronously, through the live runner.
- `awaitRoadQuiet(sessionId, now?)`: D6's wait for an operation that may park a pane not known parked; re-checked
  after every wake.
- `readBeforePark(run, target, op)` and `undoRacedPark(run, target, answer)`: D3.
- `noteAnswer(sessionId, state | 'unreadable' | 'failed')`, `noteWritten(sessionId)`, `noteSettled(sessionId)`: the
  bookkeeping every remote operation calls.
- `forgetSession(sessionId)` (called where a remote session is removed or ends) and `resetScrollOrderForTests()`.
- No log call names `data`, a byte of it, or a far answer; one line per machine per connection on a failure, as D10
  of the first attempt.

### 6.3 `src/main/machines/scroll-shapes.ts`

- The seventh row `type-bytes`: `send-keys -t $N -H <hh>{1,256}`, each `^[0-9a-f]{2}$` (lowercase only: one spelling),
  NOT idempotent (it types), never retried. Exactly two rows not idempotent (`scroll-lines`, `type-bytes`).
- `typedSequence(target, bytes: Uint8Array): string[][]`: the `cancel` argv then the chunks; the ONE composer of the
  shape.
- The header's "WHAT A HOSTILE CALLER COULD STILL DO" becomes: park, cancel, or type into a live-row `$N`, which is what
  the same renderer's attach can already do to that session and what Phase 89's door does; nothing runs a program.
- Refused, and added to the corpus: `-H` with 0 or 257 elements, `6`, `061`, `6A`, `0x61`, `-1`, `100`, a key name
  after `-H`, `-H` with `-l`/`-K`/`-M`/`-R`/`-X`, `-H` before `-t`, a name/`%`/`=` target.

### 6.4 The key router (PENDING HIS YES TO D7)

- `src/main/attach/attach-host.ts`: `AttachHostOptions.routeRemoteInput?: (sessionId: string, data: string) =>
  boolean`; in the `term:input` listener (`:278-288`), after the sender and `cleaned` checks and only for
  `client.kind === 'remote'`, `if (this.opts.routeRemoteInput?.(id, data) === true) return;` then `pty.write` as
  today. Nothing else in the file moves; this Mac's path is byte identical.
- `src/main/sessions/core.ts`: passes `routeRemoteInput: (id, data) => routeKey(id, data) === 'carriage'` where it
  builds the host (`core.ts:985`).

### 6.4b If he says no to the seventh shape (the build that replaces §6.4 and D7)

`type-bytes` is not added. `routeKey` returns `'hold'` where it would return `'carriage'`: it writes the `cancel` and
the read on the control connection, keeps the chunk in a per-session queue, and the attach host writes the queue to
the pty, in order, when the `cancel` answers (a writer the host hands the hook); a remote client's `detach` waits for
its queue to empty or for `REMOTE_SCROLL_DEADLINE_MS`, whichever is first, before it kills the pty. The rest of this
spec stands. The CHANGELOG item is unchanged. Stated cost: the first key typed after scrolling back on another machine
waits one round trip (6.4 to 96.8 ms to his Mac Pro), which is the "typing delay" his ruling excluded, so this is only
built on his word.

### 6.5 `src/main/sessions/core.ts` (`remoteScroll`, `:2623`)

- Every remote answer (live, not-reachable-now) carries `keysOrderedInMain: true`; `NO_PANE_HERE` does not.
- Parking operations from a pane not known parked, in this order: `awaitRoadQuiet` (nothing written yet, so a key
  in the wait takes the attach and restarts it), then `noteWritten`, then `proveRemoteRead` when the connection is new,
  then `readBeforePark`, then the operation, then `undoRacedPark`, then `noteAnswer` and `noteSettled`. A key typed
  after `noteWritten` takes the control connection and lands, in the carriage's order, before the `copy-mode`.
- Where a remote session is removed or ends, `forgetSession`.

### 6.6 Main tests (new files, `p3201-` prefixed)

- `src/main/machines/__tests__/p3201-scroll-order.test.ts`: D6's table row by row; the typed sequence reaches a
  recording client's stdin BEFORE `routeKey` returns; `é😀\r` crosses as `c3 a9 f0 9f 98 80 0d`; a 600-byte chunk is
  three commands in order; carriage refused → `'attach'`; a key in the wait restarts it; a key during a park's read
  takes the carriage and is written after the read and before `copy-mode`; D3's three outcomes; a raced park is
  cancelled; a failed typed sequence is not retried and sets `mayBeParked`; `forgetSession` empties the maps.
- `p3201-scroll-shapes.test.ts` gains the seventh row and the `-H` corpus.
- `src/main/attach/__tests__/p3201-route-remote-input.test.ts`: the hook runs for remote clients only, before
  `pty.write`, and a `true` writes nothing to the pty.
- `p3201-remote-scroll.test.ts`: `keysOrderedInMain` on every remote answer and never on this Mac's.

## 7. Renderer side (builder B), `src/renderer/terminal/scroll/surface.ts`

- `handleWheel` (`:421`): after `noPane || unreachable` (unchanged) and `scrollBridge() === null` (unchanged), a named
  private `wheelFollowsProgram(): 'program' | 'nothing' | 'ours'` implementing D1 and D2 in this order: parked
  (`state.inMode`) → `'ours'`; `wheelReachesProgram(mode)` → `'program'`; `state.innerMouse` → `'nothing'` (and one
  `refresh()`); `state.innerAlt` → `'program'`; else `'ours'`.
- `keysOrderedInMain` is latched from any answer that carries it (before `noteUnreachable` returns); when it first
  latches with keys already held (P1 can hold before a surface's first answer), they are sent straight at once, in
  order; and while it is set: `sendInput` delivers straight through `gmux.term.sendInput` with no fence (`keysGoStraight()`), no drain starts,
  `dispatchTravel` does not await the key fence, and after a key over a pane whose last answer said parked, one
  `refresh()` so the thumb follows. The door half (unreachable handling, P4 coalescing, latest-wins) is unchanged.
- This Mac's P1 to P3 unchanged. The first attempt's `p292-honest-thumb.test.ts` edit stays (P2 stays local).
- Tests: `src/renderer/terminal/scroll/__tests__/p3201-wheel-follows.test.ts` (the route table over xterm's four
  modes × read states × parked, both directions of the race, the refresh throttled), and `p3201-remote-surface.test.ts`
  extended (a remote surface never holds, never fences, never drains, sends a key typed in the same tick as `dispose`).
  `p95-scroll-stops.test.ts`, `p320-wheel-reaches-program.test.ts`, `p292-honest-thumb.test.ts`, both drag-select
  tests and `p3201-typing.test.ts` (local) stay green unedited, or each edit is named with its reason.

## 8. Gates and tools (builder C)

### 8.1 `conformance:machines` (data `build/machines-conformance-probe.mts`, checks `build/conformance-machines.mjs`)

Header paragraph "PHASE 320.1's SECOND BUILD APPENDED 109 TO 111". Conditions 102 and 103 read seven rows (exactly two
not idempotent; the `-H` corpus refused). **109, the typed shape:** `typedSequence` composes `cancel` then chunks of at
most 256 lowercase hex pairs whose concatenation is the input's UTF-8 bytes (driven, including a 600-byte input and
four-byte characters); `scroll-shapes.ts` is its one composer and `scroll-order.ts` its one production caller.
**110, the router:** `attach-host.ts` calls `routeRemoteInput` only on the remote branch, before `pty.write`, with no
`await` between the listener's entry and the call; `routeKey` has no `await` before its write (read by matching
braces); no log call in `scroll-order.ts` names `data`; `scroll-order.ts` names neither `'send-keys'` nor `'copy-mode'`
(66 stays four files). **111, the park gate:** driven over a scripted runner and an injected clock: a park waits for
`ROAD_QUIET_MS` after an attach key and restarts on another; D3's read comes before `copy-mode`; a read saying
`innerAlt`/`innerMouse` writes nothing else; a raced park writes `cancel`. The gate header's table of clauses only
vitest owns is extended for the new ones.

### 8.2 `ablation:p320` (`build/p3201/ablation.mjs`)

New arms, each red on its owner: a `-H` element in uppercase admitted (102); 257 elements admitted (102); a key name
after `-H` admitted (102); `typedSequence` without its `cancel` (109); `routeKey` writing after an `await` (110); the
hook on the local branch (110); `routeKey` logging `data` (110); `awaitRoadQuiet` a no-op (111); `readBeforePark`
removed (111); `undoRacedPark` removed (111); renderer: `wheelFollowsProgram` without the xterm term, without the
`'nothing'` arm, `keysGoStraight` ignored (a remote surface holding), `dispatchTravel` fencing remote travel. The 42
existing arms are kept, re-pointed where a line moved.

### 8.3 `build/p3201/skew.mjs` (new, node only, no Electron)

Over a far machine (the loopback machine inside `with-scratch-machine.mjs`, or his Mac Pro through `real-machine.mjs`),
one scratch session running `build/p320/recorder.mjs` with a printing child for load, one attach (`ssh -t` in a
node-pty) and one control client sharing ONE ControlMaster, exactly the product's two roads: (a) a key on the attach
then a park on the control connection Δ ∈ {0, 1, 2, 5, 16, 32, 64, 128, 200} ms later, at three loads, 50 each: eaten;
(b) `cancel` plus `-H` then a key on the attach at once: order; (c) `cancel` then `-H` on one connection: delivered;
(d) M4's encoding table through both roads. Every key a character unique for the run, attributed from the whole log
by what it is, as M3b (never by either side's clock: the first try at M3 did that and misread 91 reversals as 12). Every
process ended by pid in a `finally`; `gate:background` and `gate:knownhosts` fixtures updated if it walks past either.
Registered as `probe:p320:skew` (classified `remote` in `build/verification-checks.mjs`).

### 8.4 `probe:p320`, `probe:p292`, `probe:p95`, the rig and the helper

D12 and D13 as written; §9's arms and grades; `probe:p95` unchanged from the first attempt.

## 9. The proof, run rather than read

Verifiers only, under the lock, HEAD and the parent (`d8f5c261`, or main's tip on the day, one Electron at a time).
Far tmux: 3.6a and 3.7b on the loopback machine; 3.7c on his Mac Pro. "Today" is the parent in the same run.

| Arm | Drives | Graded at HEAD |
| --- | --- | --- |
| R1 (wait sweep) | a far stand-in asks for the mouse; 10 notches at 0, 100, 250, 500, 1,000, 1,500 ms after, 5 runs each | reports reaching the program ≥ the parent's at every wait (pooled); 0 runs left in copy mode over a program that asked, read on the far server after a 1 s settle; loopback 3.6a, 3.7b; Mac Pro |
| R7 (the program lets go) | the stand-in gives the mouse back and leaves its alternate screen; notches at 0, 100, 250, 500 ms after | 0 arrow-key bytes (`1b5b41`, `1b4f41`, `1b5b42`, `1b4f42`) reach the shell; ≤ the parent |
| R1L, R7L | the same two on THIS Mac | ≥ and ≤ the parent (D1 applies here too) |
| R2, R3 (run before any local arm), R3L, R5, R6, A1, A2 | as the first attempt | as the first attempt; R3 equals R3L's bytes |
| T1 remote | the M3 shape | 0 lost, 0 prompts left open: loopback 40 a version, Mac Pro 20 |
| T2 remote | one key, then 30 one-line events at G ∈ {0, 40, 100} ms | every key delivered; lines moved = this Mac's for the same flick ± 1; first movement ≤ 200 + 16 + 2 × the slowest carriage round trip in the run + 50 ms |
| T3 remote | parked 100 back, `x`, another session at δ ∈ {0, 0.5, 5, 25, 80} ms | every key delivered at every δ (the parent 50 of 50) |
| T4 remote (printed) and local (graded) | clock, tree, options mode, `bc` typed | local: the same bytes as the parent; remote: delivered ≥ the parent |
| T5 remote | the carriage dropped while parked, `fix` typed | delivered ≥ the parent (D9's limit); no claim of in-order delivery |
| T6 remote | over a parked pane: `a`, `é`, `日本`, `😀`, Enter, Backspace, Tab, Esc, Ctrl-C, Alt-b | the bytes a live pane receives through the attach, byte for byte; application-cursor arrows printed as D7's limit |
| C1 | the hostile same-named local session | byte equal to the far rows the shipping clamp names; none of the local text |
| Local T1 to T4 | as the first attempt | HEAD no worse than the parent (pooled Fisher, one-sided) |
| `probe:p292` local a to g; `probe:p292:remote` a to g on 3.6a (arm f three runs), 3.7b; a, c, d, e, f on the Mac Pro | as the first attempt | every arm green |
| `probe:p320:skew` | §8.3 on loopback 3.6a, 3.7b and on his Mac Pro | (c) N of N; (a) 0 eaten at Δ = 200 ms at every load; (b) printed; the table printed whole |
| Rig S1 to S7 | D ∈ {0, 3, 25, 60}, J ∈ {0, 10, 30}, both locales | 0 lost, order kept, the pane live afterwards; the unguarded control loses (the rig can see a loss) |

**The removal rule.** A remote row worse than the parent removes the part that owns it, not a repair: a wheel row →
D1/D2's renderer arms come out and the remote pane keeps Phase 320's pass-through while not parked; a remote typing row
→ the phase does not land remote parking (the carriage door answers `NO_PANE_HERE` for every remote session, which is
today exactly) and goes to him. A local row worse → D1/D2 come out for this Mac (a local flag), and the rest lands. A
second needs_work on one problem goes to him.

**Gates for the commit.** `npm run typecheck && npm run build && npm run smoke:t1`; the integrator's full battery;
`conformance:machines`; `ablation:p320`; `conformance:remoteclose` (`remote-sessions.ts`, core's remove path);
`conformance:manager` (`session-actions.tsx`); `probe:controldeadline` (`control-plane.ts`) with the shim that refuses
`-L gmux`; `gate:contract`; the probes above at HEAD and parent.

## 10. The two far machines

**(a) The loopback machine** (`build/with-scratch-machine.mjs` with `SCRATCH_MACHINE_QUIET_SHELL=1`) for builders, the
integrator and every verifier. **(b) His Mac Pro, `gregs-mac-pro.tail2ddfe1.ts.net`, VERIFIERS ONLY**, through the
repaired `build/p3201/real-machine.mjs` (D12): `P3201_REAL_TMUX=/usr/local/bin/tmux`, node beside it; every file
under one `/tmp/p3201-<pid>/` (`/private/tmp/…` accepted), removed in a `finally`; the far tmux server ONLY the probe's
own scratch socket, proved (socket path, `default-shell`, `ZDOTDIR`) before any session; NEVER `-L gmux` or his default
server, except the one count-only read of his `-L gmux` sessions before and after, which must be equal; his three
dotfiles' size and modified time equal before and after or the run fails; install nothing; no model turn; ssh only
through `build/ssh-run.mjs` with his agent (a scratch agent loaded with his key BY PATH, ended in the verifier's
`finally`) and only his Mac Pro's PUBLIC host key in a scratch known-hosts file.

## 11. Builders, disjoint files

- **builder-a-main**: `src/shared/ipc/terminal.ts` (first, append-only), `src/main/machines/scroll-order.ts` (new),
  `src/main/machines/scroll-shapes.ts`, `src/main/machines/control-plane.ts`, `src/main/machines/remote-sessions.ts`,
  `src/main/machines/remote-pane-history.ts`, `src/main/tmux/scroll.ts`, `src/main/tmux/index.ts`,
  `src/main/sessions/core.ts`, `src/main/attach/attach-host.ts`, `src/main/capture/ipc.ts`,
  `src/main/capture/service.ts`, and the main-side tests of §6.6 plus every existing `p3201-*` and `p95-scroll-no-pane`
  test under `src/main`.
- **builder-b-renderer**: `src/renderer/terminal/scroll/surface.ts`, `src/renderer/terminal/capture/history-copy.ts`,
  `src/renderer/terminal/capture/index.ts`, `src/renderer/app/session-actions.tsx`, `src/renderer/app/SessionStrip.tsx`,
  `src/renderer/app/TerminalRegion.tsx`, `src/renderer/styles/app.css`, `src/renderer/machines/read-lines.ts`, and every
  test under `src/renderer` §7 names or the first attempt edited.
- **builder-c-proof**: `build/machines-conformance-probe.mts`, `build/conformance-machines.mjs`, `build/p3201/*`
  except this file, `build/p320/*`, `build/p292/probe-p292.mjs`, `build/probe-p95-scroll.mjs`,
  `build/scratch-machine.mjs`, `src/renderer/terminal/p95-scroll-drive.ts` (comment only),
  `docs/research/57-remote-parity.md`, `docs/research/130-remote-scrollback.md` (the one pointer of §13, only if D7 is
  approved), the seven in-place `docs/BACKLOG.md` lines of the first attempt, and the shared files.

**Shared files, owned by builder-c-proof:** `package.json` (`probe:p320:skew` beside the first attempt's three),
`build/verification-checks.mjs` (every new script classified both ways), `build/assert-electron-teardown.mjs`
(unchanged, D15), `CLAUDE.md` (the `src/main/machines/**` row names 109 to 111 and `ROAD_QUIET_MS`, and its Touching
column adds `src/main/attach/attach-host.ts`'s remote input hook, which condition 110 reads; the `probe:p320` row adds
`probe:p320:skew`),
`CHANGELOG.md`, `docs/audits/contract-baseline.txt` (expected unmoved), `build/background-fixtures.mjs` and
`build/known-hosts-fixtures.mjs` (only if a new shape walks past either gate).

Every builder: no Electron; no `-L gmux`; scratch tmux only, ended by pid in a `finally`; no raw control bytes in any
file (escapes as `\x1b`); no commit, stage or stash; `npm run -s typecheck` and its own vitest files, exits and counts
reported. Builder A writes §6.1 before anything else; builders B and C code against it.

## 12. The verifier's brief (Tier 3)

Independent methods, at least two, one an attack: (1) **re-derive** with its own shape checker over every line a far
tee records (the typed shape included) and its own ordering measurement on his Mac Pro, not `skew.mjs`; (2)
**attack**: keys typed continuously while a flick runs (the wait must never stop the typing and the scroll must start
after the pause), a key in the same tick as the unmount, a program that asks for the mouse in the round trip between
D3's read and the park, a `-H` corpus of its own through the live runner, a carriage that drops mid typed sequence;
(3) **real data**: his Mac Pro row, reported with `tmux -V`, node, both session counts and the three dotfiles'
before/after; (4) **the parent measured** in every arm. Report once, at the end, the Electrons, tmux servers, far
directories and ControlMasters left.

## 13. Words and documents

**CHANGELOG, `## Unreleased` → `### Added`, one line, no commit link yet:**

`- A session on another machine now scrolls back like one on your Mac, with the scrollbar, dragging, and your place held while the agent keeps writing, on machines running tmux 3.6a, 3.7b or 3.7c; on any other tmux only full-screen programs that use the mouse scroll. Reported by [Jake Levirne](https://github.com/jakelevirne) in [#31](https://github.com/gregce/tortie/issues/31)`

No typing clause for remote sessions. The versions are read from `TESTED_REMOTE_TMUX_VERSIONS` on the day. Phase 320's
Fixed item keeps its link and its limit clause is narrowed to "on a machine whose tmux Tortie has not measured", as the
first attempt wrote it. Only if this Mac's T1 again reads HEAD below the parent, under `### Fixed`:
`- Typing while a scroll is still moving no longer loses characters`.

**Research 57, BACKLOG's seven lines, condition 54b**: as the first attempt edited them, plus one clause each where they
say the door only moves the view: "and, on his word of <date>, types the keys a person types over a scrolled-back
session" (only if D7 is approved). Research 130 §4's "none of the five `-X` forms can put a byte in front of the
program" gains the same pointer in the same commit.

## 14. What is NOT in this phase

- No exec plane scroll, no `copy-mode` ledger row, no change to Phase 89's door, `ARMED_RESUME_GUARD` or
  `REMOTE_VERB_LEDGER`; no open `-X` family; no caller-supplied format; no `-l`, key names, `-K`, `-M` or `-R` on the
  carriage.
- No `-u` on the control client and no change to `CONTROL_ATTACH_ARGS`; no format subscription; no reader of
  `%pane-mode-changed`.
- No change to `decideRemoteControlGate`, `TESTED_REMOTE_TMUX_VERSIONS` or Prepare.
- No far `mouse on`, no in-band keys, no capture into xterm's scrollback, no renderer switch for any agent.
- No change to this Mac's scroll path in `scroll.ts`, nor to this Mac's typing half.
- No held-key age limit; no claim of in-order delivery through an outage (D9).
- No new setting, no new string, no change to how the scrollbar looks, no native menu change.
- Nothing of Phases 326, 331 or 332.

## 15. What the entry, the first spec and the first attempt got wrong

1. The entry's P1 ("hold keystrokes behind an unanswered scroll") is a typing delay on a remote session and dies with
   the mount (T3 0/20); it stays this Mac's only.
2. The first spec's D13 ("both roads leave on one TCP stream in the order written, so the fence only has to outlast
   process scheduling") is false: M3 reorders them on one Mac with no network, and his Mac Pro lost keys at 32 ms.
3. The first spec took main's poll as the program's state (D12's routes); xterm's mode is 0.1 ms fresh (M1).
4. The entry and research 130 §7 say "Phase 292's local mechanism unchanged": that mechanism has the same race on this
   Mac (R1X local 0/60 at both builds), which D1 now fixes there too.
5. The first spec's D15 (in-order delivery through an outage) failed at both builds; struck.
6. The first spec's T2 grade (30 lines) and C1 grade were wrong; the helper let the far server start his login shell,
   missed node, and so left R1 unmeasured on 3.7c.
7. The running-log line of 2026-09-30 lists the locale as a live worse row; the reverify measured it fixed (§0).
8. The loopback machine runs his own zsh and rc files on this Mac; nothing said so (D12).
9. The first spec's D18 said the remote typing bar is zero because the parent never parks a remote pane; that bar
   stands. This design meets it by ordering every key that meets a scroll on ONE road, with a single timed boundary
   left, D6's 200 ms at the start of a scroll after typing, which the skew arm measures on his Mac Pro.

## 16. Attack first

- D6's 200 ms against his Mac Pro under a flick (`probe:p320:skew` (a) at load, and T2 at G = 0).
- A key typed in the round trip of D3's read, and a program asking for the mouse inside it.
- A paste of 16 KB over a parked pane (byte exact, in order, and the next key after it on the right road).
- A remote session restored and mounted before its carriage connects: keys take the attach and nothing parks.
- Two Torties on one far machine: `$N` from our own live rows only, and our `cancel` never sent to a pane we did not
  address.

## §As built (integrator, second build, 2026-09-30, against `d8f5c261`; nothing committed, staged or stashed)

The integrate step ran in two sessions. The first stopped at a session limit at 13:14, after its two fixes, its
own drive of (a) to (d), the full `ablation:p320` and the whole vitest suite. The second read the first's transcript
and scratch directory (`scratchpad/p3201r/integrator/`), read every seam again from both sides, and ran what was
left. Both are "the integrator" below.

### What landed where the spec named something else

1. **`src/shared/pane-report.ts` is new** (the integrator). The report predicate (focus, colour and device-attribute
   answers) moved there from `src/renderer/terminal/keys/`, because main's `routeKey` now asks it too. The three
   regular expressions and two constants are byte for byte the renderer's; the four renderer files re-export them,
   so every existing import and test is unchanged.
2. **`LEAVING_SHAPE` in `scroll-shapes.ts`** (the integrator): the `cancel` row by id, so `scroll-order.ts` can
   classify a written `cancel` without spelling a verb. Condition 66 still counts four files.
3. **`noteAnswer(sessionId, answer, stamp?)`** (builder A). §6.2 had no stamp. `stampedRunner` numbers every read,
   park and `cancel` in the order written, and an answer older than one already applied is ignored. Without it a
   stale "live" applied after a newer "parked" routes a key to the attach over a parked pane, and it is lost.
4. **More exports than §6.2 lists** (builder A): `roadFacts`, `stampedRunner`, `noteWithdrawn`,
   `noteUnreadableConnection`, and `resetScrollOrderForTests(clock?, source?)`, which the gate, the rig and the
   integrator's driver use to drive the SHIPPING `routeKey` over their own carriage.
5. **The renderer's read after a key** (builder B, `followKey`) also asks when a scroll that may park the pane is
   still unanswered, and keeps one read on the chain however many keys are typed.
6. **Condition 105 allows two callers of `remoteScrollRunner`**: core's `remoteScroll` and `routeKey` (builder C). The
   spec said one.
7. **`-H 41` is now a valid argv** and moved out of the hostile lists in the gate and the rig (builder C).
8. **`build/p320/clamp.mts`** (builder C) lets the plain-node probe call the shipping `clampHistoryRange` for C1's
   grade. The first attempt's one-row offset was its grader: it indexed a `-J` dump, which joins a wrapped line.
9. **The rig's S1 grade at δ 0** (the integrator's ruling on builder C's report, in `typing-rig.mts`'s header and its
   grade). A key typed inside the notch's 16 ms coalescing window reaches main before the scroll, takes the attach,
   and D6's wait holds the park until the typing has paused for `ROAD_QUIET_MS`. The pane is then parked after the
   typing, by the person's own notch. §12's "the scroll must start after the pause" is the design; §9's "live
   afterwards" was written for keys that follow a park. δ 0 is graded for loss and order and prints its end state;
   δ 40 and above are graded live as before. Open concern 3 says what this costs against this Mac.
10. **`HELPER_USER_FLOOR` stays 153** in the worktree. Main now reads **156**, not the 155 §5 D15 says.

### What the integrator changed, and the defect each closes

- **A report the pane sends about itself was routed as a keystroke** (`src/main/machines/scroll-order.ts`,
  `routeKey`). Over a parked remote pane, a focus change, a resize's colour answer or a return's device-attribute
  answer took the control connection: its `cancel` threw the reader to live and its bytes were TYPED into the
  program, which is Phase 205's and Phase 292's defect on the far side. Measured by the integrator's driver (K5, a
  clone with the clause removed, tmux 3.6a, D 25): the reader went from `1 100` to `0` and the program received 49
  bytes (`ESC [ O`, `ESC [ I`, both DA answers, the OSC 10 answer). At the integrated tree, on 3.6a and 3.7b: the
  reader held at `1 100` and the program received nothing, all five on the attach. Fix: `isPaneReport(data)` is
  asked first and a report goes to the attach, as today, and does not count as a key on the attach (a focus change
  holds back no scroll). New cases in `p3201-scroll-order.test.ts`; ablation arm `i1`.
- **A `cancel` written left the pane believed parked** until the typed key's own read came back
  (`stampedRunner`). A wheel notch in that round trip was taken for a scroll of a pane KNOWN parked, so core skipped
  D3's read and parked the pane without asking whether its program had just taken the mouse. Fix: a written `cancel`
  marks the pane live at its write stamp and clears `mayBeParked`, because everything written after it on one
  connection reaches a live pane until the next park. New cases; ablation arm `i2`.
- **Staleness lists**: `probe-p320.mjs` and `probe-p292.mjs` refuse a stale `out/` when `scroll-order.ts`,
  `attach-host.ts` or `src/shared/pane-report.ts` is newer than the build.
- **Documents**: the gate header's table of clauses only vitest owns gains `i1` and `i2`; CLAUDE.md's machines row
  says 64 arms and its `probe:p292` row names `src/shared/pane-report.ts`.
- **Nothing of the first attempt was left to remove.** Its wheel route (`view.owned` from main's poll) is replaced by
  `wheelFollowsProgram`; `view.owned` remains only for `drag-select.ts` (open concern 6). Its held-key path runs only
  for a surface that has never seen `keysOrderedInMain`, which main never sends for this Mac. No comment, document or
  CHANGELOG line still claims in-order delivery through an outage.
- **No duplicated block of 10 or more lines** was added to production code. A scan of every 10-line window this
  round added, against every non-test file under `src/` and `build/`, found three, all build scripts in the house
  pattern each probe and ablation already repeats (`cdpForMain`, the ablation's text replace, its import list).

### The integrator's own drive of (a) to (d), at runner level

`scratchpad/p3201r/integrator/int-drive.mts`, written without reading builder C's rig. SHIPPING and imported: the
`TmuxControlClient` (its child a `tmux -C` with NO locale, behind a relay adding D each way), `guardedScrollRunner`,
`scroll.ts`, `scroll-order.ts` (every key through `routeKey`), and the renderer's `ScrollSurface`, given a terminal
whose mouse mode is parsed from the attach's own bytes. RESTATED: the live-row branch of core's `remoteScroll`, and
its twelve steps are checked against `core.ts` as text, in order, before anything runs. The attach is a node-pty
`tmux attach` behind its own delay line. Scratch servers `-L p3201int-<pid>-<n>` with the product's conf, `/bin/sh`,
`HISTFILE=/dev/null` and an empty `ZDOTDIR`, each ended by its pid in a `finally`. tmux 3.6a and 3.7b.

| Cell | What | Result, both versions |
| --- | --- | --- |
| W, (a) | a far program takes the mouse, then a 10-notch flick 0, 50, 200 or 1,000 ms later; D 25; 3 runs each | 0 runs left in copy mode; 0 arrow bytes; the program received exactly what the parent's route sends: 8 of 10 at 0 ms (the first two notches precede the mode's arrival over the 25 ms line, so the parent cannot send them either), 10 of 10 at 50, 200 and 1,000 ms |
| R, (a) | the program takes the screen and mouse BY ITSELF before command 0 to 5 of a park | before commands 0 to 4: never left in copy mode (D3's read refuses, or `undoRacedPark` cancels); after the park answered (5): parked, Phase 292's exception by design |
| K1, (b) | parked 100 back, "fix the bug" at 35 ms a key; D 0 and 25; 3 runs | every key, in order; the first key's lag equals a key at rest (1 ms at D 0, 26 to 28 ms at D 25); the pane live afterwards |
| K2, (b) | the reverifier's M3 shape, typing into a 30-notch flick | "fix the bug" whole in 12 of 12 runs, all 11 keys on the control connection |
| K3, (c) | parked, `x`, and the session left 0, 0.5 or 5 ms later (the attach's line cancelled) | `x` delivered at every δ, D 0 and 25 |
| K4 | 20 keys at 60 ms, a notch at 100 ms | every key on the attach; the park 205 to 300 ms after the last key; the wait never stopped the typing |
| K5 | five reports over a parked pane | the reader held; nothing typed (see i1 above) |
| L1, (d) | a no-locale control client reads live, parked 123, live again, and a program with the screen and mouse | the shipping read equals the far server's own reading in all four |
| L2, (d) | a relay garbling every answer | fails closed: no pane, nothing parked, 3 keys on the attach, 0 on the carriage |
| L3, (d) | the exec plane's extent read from a no-locale command client | `678 24`, equal to a UTF-8 client; the tab format reads `678_24` |

Timings: L 9 s, R 14 s, W 59 s, K 101 s.

**Ctrl-B, measured by the integrator** (`int-prefix.mjs`, 3.6a and 3.7b, the product's conf, which leaves tmux's
prefix at its default). On the attach, Ctrl-B then `z` then `k` reached the program as `k` only: tmux took Ctrl-B as
its prefix and `z` as a command. Through the seventh shape, the same three reached the program as `02 7a 6b`. And a
prefix armed on the attach survives a key sent the other way: Ctrl-B on the attach, `a` through `-H`, then `?` on the
attach put the pane in `view-mode` (tmux's key list). See open concern 4.

### Commands

Every command below ran on the integrated tree. "First session" marks a run made before the session limit; no source
file has changed since it (only `CLAUDE.md` and the rig's header and grade, both after the runs they do not affect).

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 2 s; import boundaries 0 violations over 1,370 files and 7,772 imports; 0 runtime cycles over 1,367 files |
| vitest over `src/main/{machines,sessions,attach,tmux,capture}`, `src/shared`, `src/renderer/{terminal,app,machines}` | 0 | 270 files passed, 1 skipped; 5,614 tests passed, 7 skipped; 20 s |
| vitest over `src/main src/shared src/preload src/renderer` (first session, 13:14) | 0 | 1,020 files passed, 1 skipped; 17,780 tests passed, 7 skipped; 40 s |
| `npm run -s conformance:machines` | 0 | 8 s; 7 shapes admit 66 argvs `scroll.ts` emits and refuse 80 hostile ones; 32 address facts; conditions 109 to 111 green |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s conformance:manager` | 0 | 58 rules, 2,310 checks |
| `node build/p3201/ablation.mjs` (first session, whole) | 0 | 212 s; 64 of 64 arms red on the condition or case that owns them; base green (machines, 284 main cases, 150 renderer cases); every clone file restored by sha256. `P320_ONLY=i1,i2` alone: 7.5 s, 2 of 2 |
| `npm run -s probe:controldeadline`, with a `tmux` shim first on PATH that exits 1 for `-L gmux`, `-L default` and any call naming no socket | 0 | 38 s; deadline 10,000 ms, fallback at 10,001 ms; a healthy far side greeted in 15 ms; the ablated build did not fall back. The shim refused `-L gmux` three times, so the probe's "0 before and 0 after" is the shim's, never a read of his server |
| `npm run -s build` | 0 | 45 s; every gate inside it green: electron 153 of floor 153, background 489 files and 19 of 19 fixtures, simulator, known-hosts 517 files, checks, `conformance:ios` 19 rules, contract byte for byte and unmoved |
| `gate:knownhosts`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:simulator` | 0 each | inside the build above, and each alone in the first session |
| `probe:p320:rig` on the integrated tree: tmux 3.6a and 3.7b, D 0 and 25 ms, J 0, the carriage with NO locale, arms S1, S2, S3, S7, S8 | 0 | 44 min; 288 door runs, 0 characters lost, 0 findings. Door against the unguarded control, every world: S1 0 of 330 against 115; S2 0 of 220 against 185 to 220; S3 0 of 55 against 55; S7 (a key, then the session left) 0 of 15 against 15; S8 (16 KB paste, then a key) 0 of 32,770 against 32,770 on 3.6a and 104 on 3.7b. S1 at δ 0: the door's pane parked afterwards in 20 of 20 runs (item 9 above), the control's live. Builder C's rig runs predate the integrator's two fixes; this one does not |
| the integrator's drive, `int-drive.mts` (L, R, W, K) | 0 | 0 findings over 92 rows (L 12, R 12, W 24, K 44); the table above |
| the integrator's Ctrl-B measurement, `int-prefix.mjs` | 0 | above |
| self-tests after the integrator's edits (first session): `probe-p292` 79, `probe-p320` 95, `rig` 21 fixtures | 0 each | |
| the duplicate scan (`dupscan2.mjs`) | 0 | see above |

Counted once at the end: no tmux server, relay, recorder, sshd or scratch directory of this step's is left; 22
Electron-family processes are running, none of them this step's (his Tortie, and two other workflows' probes started
15 and 24 minutes before the count). The Electron lock was never taken.

### Not done by the integrator, and why

- `smoke:t1`, `smoke`, `smoke:t3`, `package`, and every probe that launches an Electron (`probe:p320`,
  `probe:p292`, `probe:p292:remote`, `probe:p95`): the integrator launches none. They are the verifiers', under the
  lock.
- `probe:p320:skew` and the rig's worlds other than those in the table: builder C ran skew on loopback 3.6a and 3.7b;
  the rig at D 3 and 60, J 10 and 30, and with a UTF-8 carriage, is the verifiers'.
- His Mac Pro row: verifiers only.
- `ablation:p320` was not run a second time: the first session ran it whole at 13:10 on the tree as it is now (no
  source file has changed since), 64 of 64 red on their owners.

### Main has moved since `d8f5c261` (19 commits at the time of writing)

Six files are changed on both sides. A trial three-way merge (`git merge-file`, in the scratch directory, nothing
written to the worktree): `build/verification-checks.mjs`, `CLAUDE.md`, `docs/BACKLOG.md` and `src/main/tmux/scroll.ts`
merge clean (main's change to `scroll.ts` is one header comment); `CHANGELOG.md` (main reworded the iPhone item beside
this phase's new line) and `package.json` (`probe:p330` and `probe:p332` beside `probe:p320`) conflict by adjacency
only, keep both. Main moved `contract-baseline.txt` by five lines (a pocket channel and an environment name) and
`HELPER_USER_FLOOR` to 156; this phase moves neither. **Phase 331 (`2751062d`) now launches Claude Code with
`CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` and Codex in its scrollback mode**, so after the rebase a Tortie-launched
agent on another machine usually prints ordinary lines and scrolls through this phase's copy mode, not through its
own mouse reports. The reporter's full-screen case still exists (an agent launched by hand, or any program that asks
for the mouse), and every R arm's far program is a stand-in, so no arm changes.

### Open concerns for the verifiers

1. **D6's 200 ms is the one timed boundary left, and his Mac Pro decides it.** Over the loopback ssh a park on the
   control connection ate keys typed on the attach up to 5 ms before it (builder C's skew: up to 17 of 50 at Δ 1),
   and none from Δ 16 at any load. The spec's single-Mac M3 said 1 ms was enough; over ssh it is not. `probe:p320:skew`
   on his Mac Pro, at load, must read 0 eaten at Δ 200, or the phase fails.
2. **What the design costs in time.** A scroll begun within 200 ms of typing on a remote session starts up to 200 ms
   later. The first notch of a gesture on a live remote pane costs two round trips before it paints (D3's read, then
   the pipelined park), and a drag's first position three (`scrollPaneTo` reads again after D3's read; builder A left
   `scroll.ts` untouched rather than add a variant). T2's bound (200 + 16 + 2 × the slowest round trip + 50 ms) is for
   the wheel; a drag has no timed grade.
3. **Typing that outlasts a scroll gesture ends parked on a remote session and live on this Mac.** On this Mac a
   scroll waits at most P2's 32 ms behind a key, parks, and the next key returns the pane to live, so whenever the
   typing outlasts the gesture the pane ends live. On a remote session D6 holds a scroll that would park a live pane
   until the typing has paused for 200 ms (§12: "the scroll must start after the pause"), so the gesture lands after
   the typing and the view jumps back once when the person stops. Two readings of it: the rig's S1 at δ 0 (a notch,
   then typing from the same 16 ms), parked afterwards in 20 of 20 door runs over 3.6a and 3.7b at D 0 and 25 with
   "fix the bug" whole every time; and the integrator's K4, parked 205 to 300 ms after the last of 20 keys. Builder C's
   rig graded the first a failure; the integrator's ruling (item 9) grades it for loss and order only. Nothing is lost
   either way, and the parent never parks a remote pane. The other design, dropping a park whose wait a key restarted,
   would end live like this Mac but contradicts §12. Drive it in the app on both and judge it against the removal
   rule.
4. **Ctrl-B is tmux's prefix on the attach and a byte through the seventh shape** (measured above). Typed over a
   parked remote pane it now reaches the program (a shell's back-one-character), where on a live pane the attach eats
   it and runs the next key as a tmux command, which is today's behaviour on this Mac too. And a prefix armed on the
   attach stays armed across keys sent the other way, so a later key on the attach runs a tmux command (`d` detaches
   the attach, `x` asks to end the pane, `c` opens a window). Not in D7's stated limit and not in M4's table. Add
   Ctrl-B to T6. Whether the far server should drop the prefix is not this phase's to decide:
   `resources/gmux-tmux.conf` is one of the identifiers live sessions are bound to.
5. **His far `~/.zsh_history` and the app's own ssh.** The helper now keeps every far shell it starts off his history
   (D12), but `probe:p320` with `P320_FAR=real` drives the app, and the app's own commands to the Mac Pro (the remote
   environment probe runs his login shell) are not the helper's. If his three dotfiles' census moves on a real-row
   run, find which process moved it before calling the run failed for the phase's reason (builder C's item 8).
6. **Drag-select still reads main's poll** (`view.owned` in `drag-select.ts`), so a drag held at a pane's edge within
   a second of a program asking for the mouse can still ask to park. On a remote pane D3's read refuses the park; on
   this Mac it is the parent's behaviour. Not this phase's surface; stated.
7. **D9's limit, unchanged.** A pane parked when its machine's connection goes away for good keeps copy mode, and
   keys typed then go down the attach into copy mode's key table. T5 is graded against the parent only.
8. **A paste over a parked pane is written whole, at once.** 16 KB was measured (S8, 64 commands, byte exact). Nothing
   caps the count of typed commands, and each carries the 5 s caller deadline; a large paste over a slow link that
   times out is not sent again (D9) and leaves the pane possibly parked. Nothing larger than 16 KB was measured.
9. **A session that ends on its machine by itself** keeps its entry in `scroll-order.ts`'s map until Tortie quits
   (`forgetSession` runs on Remove and End). Memory only; the id never comes back.
10. **S2 ends parked by design**: the flick outlasts the typing, so the rig's door reads 10 or 20 of 20 in copy mode
    after the settle, with 0 prompts left open and 0 characters lost.

## §As built (the fixer, the fix round of the second build, 2026-09-30, against `d8f5c261`; nothing committed, staged or stashed)

Both verifiers answered needs_work (`verify-attack` and `verify-parent-typing`, the typed verdicts in this round's
journal). Every row they measured worse than the parent is answered below by taking out the part that made it so; the
two rows a removal cannot reach without removing remote parking itself are stated in "Two rows for him", as
questions for him. His
rule bound every choice: a remote session feels like a local one, no typing delay on a remote session, and a scenario
worse than today loses the part that owns it.

### The worse rows, and what came out

| Row (who measured it) | Today | Second build | Owner | Fix round |
| --- | --- | --- | --- | --- |
| Wheel over a remote alternate-screen program with no mouse: Codex 0.158's full screen view (both) | 0 cursor keys | one `ESC O A` per notch, 25 of 25 (3.6a, 3.7b), 15 of 15 (Mac Pro); 199 and 205 for a program toggling its mouse | route 4 of `wheelFollowsProgram` reached by a remote pane | REMOVED for a pane on another machine: rule 4 answers `nothing` there, which is Phase 320's swallow; this Mac keeps route 4. R3 is graded against the parent now (0 bytes), not against R3L |
| A far program takes the screen and the mouse after the person scrolled back (PT; RACE at 120 and 500 ms) | 50 of 50 notches reach it, never stuck | 0 of 50, stuck in copy mode 5 of 5 / 10 of 10 | D3 kept Phase 292's exception on another machine | REMOVED there: F3 below. A pane Tortie parked goes back to its program at the next read once the program takes the screen or the mouse; copy mode Tortie did not enter is still left alone |
| Typing that outlasts a wheel gesture (O; the integrator's open concern 3; K4) | nothing moves | the view jumps 50 lines back 214 to 336 ms after the last key, 18 of 18 | D6's restartable wait (§12 "the scroll must start after the pause") | REMOVED: F2 below. A key typed after a scroll began drops it. The integrator's item 9 ruling is reversed and the rig's S1 is graded live at every δ again |
| The far control connection dies alone with keys on it (RECON) | 0 lost of 2,300 | 42 of 700 in bursts, 1 of 900 at 25 ms, 60 of 700 over a 50 ms link | keys kept on that connection for `ROAD_QUIET_MS` after its last answer | NARROWED: F1 below. Keys leave the control connection the moment nothing is in flight on it, so typing slower than one round trip goes back to the attach after its first key; typing faster than one round trip stays on it until it slows. What is left is stated in "Two rows for him" |
| The carriage dropped while parked, `fix` typed (T5) | 3 of 9 (`f`), the pane live | 0 of 27, the pane still parked after the connection returned | D9 wrote a key whose connection was down to the attach, into copy mode | REPLACED: F4 below. The key is held in main and written behind a `cancel` when the connection is back |
| A notch, a key and a switch before a fresh remote surface's first answer (EARLY, minor) | 13 of 14 (50 ms link) | 0 of 14 | P1 held the key until the first answer latched `keysOrderedInMain` | the pane says it is on another machine AT MOUNT (`new ScrollSurface(id, term, { onAnotherMachine })`, from the session row's `machine` in `TerminalPane.tsx`), so nothing is ever held there |

### The four rules, each with its reason (`src/main/machines/scroll-order.ts`, `src/main/sessions/core.ts`)

**F1. The way back from the control connection to the attach is an ANSWER, never a clock.** `carriageBusy` is
`inFlight > 0` and nothing else; `lastCarriageAt` is gone. Reason: tmux runs one client's commands in the order
written and answers a read only after it has run everything written before it, so once every counted sequence is
answered, a key written to the attach afterwards reaches the far server after all of them, causally, whatever the two
links do (§4 M3's reorderings all need the old road's bytes still travelling). The clock kept a typist on the control
connection for as long as the keys came less than 200 ms apart; the answer releases them after one round trip (the
integrator's K1, keys 35 ms apart, now reads 1 key of the 11 on the carriage and 10 on the attach at D 0, "fix the bug" whole
on both versions; at D 25, a 50 ms round trip, every key comes inside the round trip of the one before and all 11 stay
on the carriage, whole, which is the window "Two rows for him" measures). The other direction, attach to control connection, has no answer to wait for and keeps `ROAD_QUIET_MS`
(his Mac Pro: 0 of 150 keys eaten at 128 and at 200 ms).

**F2. A key typed after a scroll began wins over it.** `awaitRoadQuiet` resolves `false` when a keystroke is routed
while it waits, and the core then writes a read and nothing else (`wanted`); `readBeforePark` takes a `stillWanted`
hook (`keysSoFar(sessionId) === keysAtStart`, the count taken when main received the scroll) and answers `dropped`
after its read when a key was typed in its round trip; a park asked while keys are HELD (F4) is dropped too. A key
typed BEFORE the scroll began only delays it (a swipe right after a key still scrolls, the S cell and T2 unchanged).
A key typed after the park is written is behind it on the same connection and its own `cancel` returns the pane to
live. Reason: on this Mac a key always ends a gesture live (P1 holds it, then `live`); the second build parked after
the typing instead, which the parent verifier measured as worse than today in 18 of 18 runs.

**F3. A pane Tortie parked goes back to its program when the program takes the screen or the mouse.** `noteParkedByUs`
is called by `readBeforePark`'s `parking` hook just before an honest park (the read said live, neither screen nor
mouse); a `cancel` written or a live answer ends it. `leaveForProgram`, asked on every COUNTED operation (the 250 ms
poll of a parked pane, a notch, a drag), writes `cancel` and answers the read after it when that pane's own fresh read
says `inMode` with `innerAlt` or `innerMouse`. Copy mode found already there (`already`, the person's own prefix and
`[`, or one left from before a relaunch) is never left: the parent never read such a pane, so cancelling it under
them would be worse than today. Reason: his plan's (a), "a parked pane whose program starts asking for it leaves copy
mode", which D3 did not do; at the parent a remote pane is never parked over such a program at all. The integrator's
R cell at "take before command 5" (after the park answered) now reads live after one read on both versions, where the
second build left it parked. This Mac keeps Phase 292's exception untouched.

**F4. A key over a parked pane is never typed into a connection that is down.** `routeKey` answers a third road,
`'held'`: when the pane is parked, may be parked or has a sequence in flight AND its machine's carriage is `waiting`
or its row is not yet listed on the current connection, the key is kept in main, in order, and every later key queues
behind it; one loop per session (`flushWhenBack`, 50 ms for 2 s then 250 ms) writes them behind ONE `cancel` the
moment both are back. A typed sequence whose connection CLOSED before its `cancel` was answered (`TMUX_UNREACHABLE` and
a moved generation, never a timeout on the same connection, whose bytes may still run) is kept as `unanswered`, and on
the new connection is sent again ONCE, ahead of the held keys, only when the pane still reads `inMode` and no park was
written after it: one connection runs its commands in order, so a pane still in copy mode proves that `cancel` never
ran, and so neither did the bytes behind it. Anything else is not sent again (research 57's at most once). A row that
ended drops them; a machine whose carriage turns `none` drops them, said once with no byte of them; more than 1 MiB
held is not kept past that. The core hands the host `routeKey(...) !== 'attach'`, so a held key is never written to
the attach as well (condition 110). A machine with no carriage this run (`none`), a row that ended or that no machine
holds, and an unreadable connection still take the attach, as today.

### What the spec said that this round changes

- D3's "a pane the person parked on ordinary lines keeps Phase 292's measured exception": on another machine, only
  for copy mode Tortie did not enter (F3).
- D6's "a road is taken only once the other has been quiet for `ROAD_QUIET_MS`": for the attach to the control
  connection only; the way back is an answer (F1). "A key typed during that wait ... restarts the wait": it drops the
  park (F2). §12's "the scroll must start after the pause" is withdrawn.
- D9's "a typed sequence that is refused (`waiting` ...) is written to the attach instead": it is held (F4); "a typed
  sequence that was written and then failed ... is never retried": except the one provable case of F4.
- D2/§7 rule 4: `'program'` on this Mac, `'nothing'` on another machine. §9's R3 grade: 0 bytes, equal to the parent,
  not R3L's bytes. §13's CHANGELOG: Phase 320's Fixed item now says a program like less does not scroll there on any
  machine, and a plain shell or a printing agent does not on an unmeasured tmux.
- The integrator's item 9 and open concern 3 are reversed; open concern 7 (D9's limit) is replaced by F4.

### The gate, the attack and the tools

- `conformance:machines` gains **condition 112** (F1 to F4 driven over a scripted runner and the module's own clock,
  then read in the core: `stillWanted` from `keysSoFar`, the `parking` hook, `leaveForProgram` on counted operations
  before `noteAnswer`, the `wanted` drop); 111 (ii) reads the drop where it read a restart; 110 requires
  `!== 'attach'`. The gate header's table of clauses only vitest owns gains x11, x13, x14, x15, x17 to x21.
- `ablation:p320`: 81 arms (64 kept, `o2`, `o4`, `o5`, `o6` and `o8` re-pointed where their lines moved; 17 new:
  `f1` to `f4b`, and `x11` to `x21`, the five clauses the attack verifier's own ablations left green everywhere now
  each owned by a case: a `cancel` answering "not in a mode" is an answer, an operation on a pane that may be parked
  is counted, an empty `pane_in_mode` is refused, a device answer with a key after it is a keystroke, a park or
  `cancel` written clears "may be parked"; plus a lost sequence sent again only over a pane still parked, rule 4 on
  another machine, and the mount flag).
- `build/p3201/real-machine.mjs`: `quoteArg` quotes a word BEGINNING with `=` or `~` (zsh's EQUALS and tilde
  expansion turned `-t =rec-none:` into `rec-none: not found` on his Mac Pro, so `probe:p320:skew` could not run
  there); an assignment keeps its bare `=`. Self-test fixture added (91).
- `probe:p320`: C1 is graded on the far pane's OWN text, the copy found as a contiguous run in one
  `capture-pane -p -J -S - -E -` (`farRunOf`), because the index arithmetic through a second `#{history_size}` read was
  one row early at both builds; the shipping clamp's answer is printed beside it. R3 regraded (above). T6's Alt-b is
  typed as `ESC b` (a CDP key event with Alt composes nothing on this Mac, so its live reference was empty at both
  builds). `--compare` names the owner of each finding under §9 (`ownerOfFinding`). 101 self-test fixtures.
- `probe:p292`: a far session that has drawn nothing 20 s after it is shown is shown again by way of a warm-up
  session, once, before the type step (Phase 326's `SESSION_NOT_FOUND`, the same at the parent, stopped every 3.7b run
  there); arm a watches 15 s by default with `P292_MACHINE=real` (8 s printed 87 lines, below its own 100).
- `probe:p95`: the app gets a scratch HOME with its own `.zshrc`, `probe:p95` runs the loopback machine with
  `SCRATCH_MACHINE_QUIET_SHELL=1`, and his three dotfiles on this Mac are read before and after (size and modified time
  only) and fail the run if they moved: step 7 types a loop into a LOCAL zsh, which wrote his `~/.zsh_history` (the
  parent verifier: +66 bytes at 20:02:16, exactly one extended-history entry for that line).
- The rig (`typing-rig.mts`) restates the new core (`wanted`, the hooks, `leaveForProgram`), routes `!== 'attach'`,
  mounts the door's surface with `onAnotherMachine`, and grades S1 live at every δ.

### The fix round's second session (2026-09-30 23:05 onward; nothing committed, staged or stashed)

The fix round's first session stopped at 22:44 when the run was paused: after every source change above, the gates in
"Commands" below that are marked so, the integrator's drive re-run against the fixed core (`scratchpad/p3201r/fix/int/`,
L and R 24 rows, W and K 68 rows, 0 findings), and two of the rig's four worlds; the rig stopped inside its third world
and its findings file was never written. This session read that scratch directory and the three `*.before.ts` copies
it kept, read every changed seam again against both verdicts, measured, and finished this section. It works under
`scratchpad/p3201r/fixer/`.

**What it changed.** Four edits, none of them to behaviour:

1. `build/p320/probe-p320.mjs`: `shown()` escapes DEL. The parent verifier's nit said T6's Backspace "reads empty both
   ways without being graded". Its own readings (`verify-parent-typing/out/21-*`) hold DEL live and parked at HEAD,
   which `JSON.stringify` leaves bare, so the reading printed as an empty string. Backspace was graded and equal all
   along. Fixture 102.
2. `src/main/machines/scroll-order.ts`: the header's sentence on the one limit left said "the first round trip of
   typing over a pane just returned to live"; the measurement below shows it is every key typed within one round trip
   of the one before it. Comment only.
3. `CLAUDE.md`, the machines row: "so one dying alone strands no stream of typing" is not true over a slow link; the
   clause now says a key stays on that connection only while a sequence of that session is unanswered there.
4. This file: the fix round's RECON row said a stream of typing is never stranded on the control connection, and its
   F1 paragraph counted the integrator's K1 at D 25 as 1 key on the carriage; both corrected in place above (at D 25,
   keys 35 ms apart, all 11 keys of "fix the bug" stay on the carriage, whole).

### The verdicts' rows on the fixed tree, measured with the attack verifier's OWN harness

The attack verifier's harness, run rather than restated, against a scratch clone of the fixed worktree
(`fixer/atk/clone`, `cp -Rc`, `node_modules` linked, the verifier's stdin recorder copied into the clone's
`control-client.ts` and nowhere else). `atk2.test.ts` is theirs with four changes, each marked `THE FIXER'S COPY` in the
file: the restated host writes nothing to the attach for `'held'` (the core hands it `routeKey(...) !== 'attach'`); the
HEAD surface is mounted with `onAnotherMachine`, as `TerminalPane.tsx` mounts a remote row; RECON waits one second more
after the connection is back, for keys F4 held; and one RECON variant of mine, `kill-at-1`: the far control client
SIGKILLed right after the FIRST key over a parked pane, with five more keys in the same tick. The parent and
second-build columns are the verifier's own runs (`verify-attack/runs/b2-*`, `v2*`), on the same Mac with the same
harness; the parent's code has not changed since. Every far server a scratch socket under the loopback machine, ended
by pid in the harness's `finally`; five runs, exit 0 each: `f-head36a` 688 s, `f-head37b` 687 s, `f-head37b-d25` (a 50 ms
round trip) 477 s, `f-head36a-d25` 60 s, `f-head36a-r100` (keys 100 ms apart).

| Cell | Parent | Second build | Fixed tree |
| --- | --- | --- | --- |
| Codex 0.158's shape (alternate screen, application cursor keys, no mouse), 5 notches × 5, 3.6a / 3.7b / 3.6a over 50 ms | 0 / 0 / – cursor keys | 25 `ESC O A` / 25 / – | 0 / 0 / 0 |
| `less`'s shape | 0 / 0 | 25 / 25 | 0 / 0 / 0 |
| A program toggling its mouse every 3, 17, 60 ms under 30 notches, × 5 each, 3.6a / 3.7b | 0 / 0 cursor keys, 0 stuck; reports 208 / 207 of 450 | 199 / 205 cursor keys | 0 / 0 cursor keys, 0 stuck; reports 198 / 195 of 450 (per period, two-sided permutation p = 0.25, 1.0, 0.13 over both versions) |
| The reporter's case (the program asks in the same ms as a 10-notch flick), 3.6a / 3.7b / 3.7b over 50 ms | 45 / 45 / 40 of 50; later 25 of 25; 0 stuck | 44 / 45 / 40 | 45 / 45 / 40; later 25 of 25 each; 0 stuck |
| The program takes the mouse 120 / 500 ms after the first notch, 3.7b over 50 ms, × 5 (PT and RACE) | 0 stuck; later 25 / 25 of 25 | stuck 5 / 5 of 5; later 0 / 0 of 25 | 0 stuck; later 25 / 25 of 25 |
| The same race, reports within the first flick, at 60 / 120 / 500 ms | 21 / 5 / 0 of 50 (4 or 5 a run at 60) | 8 / 0 / 0 | 11 / 0 / 0 (2 or 3 a run at 60); see "Two rows for him" |
| A notch, a key and a switch before a fresh surface's first answer (EARLY), over 50 ms, 3.6a / 3.7b | 4 of 4 / 9 of 10 | 0 of 4 / 0 of 10 | 10 of 10 / 10 of 10 |
| A switch in the middle of a burst, 3.6a / 3.7b / 3.7b over 50 ms | 25 / 25 / 30 of 30 exact | 30 / 30 / 30 | 26 / 27 / 30 (the misses are keys on the ATTACH, as the parent's: the harness ends the attach's pty in the same tick, harsher than the app, where the parent verifier read 20 of 20 at both builds) |
| RECON, the verifier's five variants, keys 25 ms apart, loopback, 3.6a / 3.7b | 0 / 0 lost of 800 | 23 / 20 lost | 0 / 0 lost of 800 |
| RECON at 100 ms a key, three variants, 3.6a | 0 of 475 | 7 | 0 of 475 |
| RECON, the five variants, keys 25 ms apart, 3.7b over a 50 ms round trip | 0 of 800 | 70 lost (`f` 5, `l` 5, `f12345` 10) | **70 lost, the same keys**; see "Two rows for him" |
| RECON `kill-at-1` (mine), 3.6a / 3.7b at 25 ms, 3.6a at 100 ms, 3.7b over 50 ms | not run (no key ever rides the control connection) | not run | 11 / 20 / 17 / 0 lost of 175 |
| STALL, the far sshd stopped 1.5 s and 6.5 s, × 5 each version | 'abcdef' 20 of 20 | 20 of 20, parked after | 20 of 20, parked after (by design: the scroll 250 ms after the typing) |
| GARBLE, three modes × 5 each version | 30 of 30 | 30 of 30 | 30 of 30, 0 left parked |
| Every line the control connection was written, by the verifier's own shape checker | | 0 unlisted | 0 unlisted of 2,066 / 2,107 / 2,188 / 52 / 675 |

### Two rows for him

Both are measured above, both are worse than today, and neither can be taken out by removing a part smaller than the
phase's remote half, so the removal rule (§9) sends them to him rather than to another fix.

1. **A key that rides the control connection is lost when that connection ALONE dies before it is answered.** The
   fix round's F1 sends typing back to the attach as soon as the control connection has nothing unanswered, which
   took the verifier's loopback RECON from 43 of 1,600 keys lost (and 7 of 475 at 100 ms a key) to 0.
   Over a 50 ms round trip, keys typed 25 ms apart come faster than each one is answered, so they ride the control connection for as long as the typing lasts, and a far
   `tmux -C` killed by itself mid-burst loses the key or keys on their way: the same 70 of 800 the second build lost,
   where the parent loses none (its keys never leave the attach). `kill-at-1` shows the same window on loopback, the
   kill landing inside the first key's own round trip: 11 to 20 of 175 lost. Why no part of D6 to D9 can remove it:
   a key typed while a sequence is on its way must not take the attach (§4 M3: reversed 11 to 91 of 100, eaten up to
   17), so it must ride the control connection or wait; and when that connection dies, a sequence whose `cancel` ran
   but whose answer never came may or may not have typed its bytes, which no read Tortie may make can tell (the
   state format reads no input), so sending it again would type it twice. What reaches it in the product: the far
   `tmux -C` process ending by itself, or its one ssh channel failing while the attach's stays up, inside one round
   trip of a key typed over a scrolled-back pane, or for as long as typing outruns the round trip. A network outage
   takes both roads, as today. His three choices: (a) accept it as D9's at-most-once limit, stated; (b) the §6.4b
   shape for the keys typed while a sequence is unanswered (they wait in main up to one round trip and then take the
   attach), which narrows it to the one key that leaves copy mode, at the cost of up to one round trip of delay
   on the keys typed right after it, a typing delay his ruling excluded; (c) §9's removal: remote parking does not land.
2. **A program that takes the mouse while a wheel gesture that began over a far shell is still moving gets fewer of
   that gesture's notches.** At 60 ms into a 10-notch flick over a 50 ms round trip, 2 or 3 notches reach it where
   the parent's 4 or 5 do (11 against 21 of 50); at 120 ms, 0 against 1 a run. The flick's first notch parked the
   shell (the program had neither the screen nor the mouse when D3 read it, so this is the feature itself), the
   program's request then races the park, and `undoRacedPark` or F3 returns the pane to the program one round trip
   later; the notches in between scrolled the shell. Never stuck, and every notch after the gesture reaches the
   program (25 of 25 at both builds). On this Mac the same gesture parks the shell at both builds and Phase 292's exception keeps it
   parked over the program (the parent verifier's PT, local: 0 of 50 at both builds). §9's R1 grades notches
   AFTER the request and is unaffected; no verifier raised this row, and it is stated so that it is his to judge.

### What the reverify should know

- **His `~/.zsh_history` on THIS Mac moved once during this session**: at 23:31:57, +32 bytes, inside `f-head37b`'s
  RECON cell (the harness's own census caught it, and it is that run's one "problem"). The identical cells on 3.6a
  before it, and the three runs after it, left all three files unchanged, and a size and modified-time watch kept from
  23:38 to 00:46 (`fixer/histwatch.log`, once a second, content never read) saw no further move, through both rigs,
  the ablation and the build. 32 bytes is one short zsh extended-history entry. Not attributed: his own terminals were open, and no process of this
  session runs an interactive zsh. The parent verifier saw the same kind of unexplained move at 18:18:18.
- The two STALL rows end parked after the typing at HEAD (as in the second build): the scroll 250 ms after the typing
  is the person's own scroll, and nothing is lost.
- `probe:p320`'s T5 drops the carriage with `detach-client -s gmux-control` while the pane is parked. F4 holds "fix"
  in main until the connection and the row are back; the rig's own outage arm (S4) now reads 0 lost of 12 and 9 on
  both versions, and its 15 s outage, printed, delivered "fix" 93 and 109 ms after the carriage came back. Those keys
  wait for the connection, which is a delay only over a scrolled-back pane whose connection is down; the in-app T5
  is the verifiers'.

### Commands

"First session" marks a run of the fix round's first session (`scratchpad/p3201r/fix/`), made after its last source
edit; this session's are under `scratchpad/p3201r/fixer/`. This session's four edits came after the first session's
runs and change no behaviour; every gate they could touch was run again after them.

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p3201/ablation.mjs` (first session, 21:20) | 0 | 241 s; 81 arms, each red on the condition or case that owns it |
| `npm run -s conformance:machines`, `conformance:manager`, `conformance:remoteclose`, `probe:controldeadline` behind the shim, `npm run -s build` (first session, 21:36 to 21:38) | 0 each | as below |
| the integrator's drive over the fixed core, `fix/int/int-drive.mts` (first session) | 0 | L and R: 24 rows, 0 findings, 24 s; W and K: 68 rows, 0 findings, 173 s (K4: the pane never parks after 20 keys and a notch; K1 at D 25: all 11 keys on the carriage, whole) |
| `npm run -s typecheck` | 0 | 1,370 production files, 7,772 imports, 0 violations; 0 runtime cycles over 1,367 files |
| vitest over `src/main src/shared src/preload src/renderer` | 1 | 1,019 files passed, 1 failed, 1 skipped; 17,807 tests passed, 1 failed, 7 skipped; 44 s. The one failure is `src/main/symbols/__tests__/store.test.ts`'s timing budget (193.9 ms against 97.7 ms with the load average at 10 from a virtual machine that is not this workflow's); the file is untouched by this phase, and alone it passes, 15 of 15 |
| vitest over `src/main/machines`, `src/main/attach` and `p3201-remote-scroll.test.ts`, after the comment edit | 0 | 85 files, 2,272 tests |
| self-tests: `probe-p292`, `probe-p320`, `real-machine.mjs`, `rig.mjs`, `skew.mjs`, `relay.mjs` | 0 each | 79, 101 (102 after the `shown()` fixture), 91, 21 fixtures, PASS in 39 s, 8 |
| `npm run -s conformance:machines` (after the comment edit) | 0 | 5.4 s; 7 shapes admit 66 argvs `scroll.ts` emits and refuse 80 hostile ones; 32 address facts; 109 to 112 green |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s conformance:manager` | 0 | 58 rules, 2,310 checks |
| `npm run -s probe:controldeadline`, a `tmux` shim first on PATH refusing `-L gmux` and any call naming no socket | 0 | 38 s; fallback 10,002 ms after spawn; a healthy far side greeted in 13 ms; the ablated build did not fall back; "0 before and 0 after" is the shim's refusal, never a read of his server |
| the attack verifier's harness at the fixed tree, five runs (above) | 0 each | the table above; every far line one of the seven shapes |
| `probe:p320:rig`, tmux 3.7b then 3.6a, D 0 and 25, J 0, carriage with no locale, arms S1, S2, S3, S4, S7, S8 | 0, 0 | 1,516 s and 1,510 s; 151 door runs each, 0 characters lost, order kept, live wherever graded, 0 findings. S1 now graded LIVE at every δ, δ 0 included: 60 of 60 door runs live on each version, 0 lost. Door against the unguarded control: S1 0 of 330 against 115; S2 0 of 220 against 168 to 220; S3 0 of 55 against 55; S4 0 of 12 and 9 against 12 and 9; S7 0 of 15 against 15; S8 0 of 32,770 against 104 (3.7b) and 32,770 (3.6a) |
| `node build/p3201/ablation.mjs`, on the final tree | 0 | 285 s; 81 arms, every one red on the condition or case that owns it; every clone file restored by sha256; the worktree never written |
| `npm run -s build`, on the final tree | 0 | 31 s; electron 153 of floor 153, background 489 files and 19 of 19 fixtures, simulator, known-hosts 517 files, checks 241 scripts, `conformance:ios` 19 rules, contract byte for byte and unmoved |

Counted once at the end: no process of this session is left (the batch scripts, the harness runs, both rigs and the
history watch each ended by themselves or by its stop file, checked by pid); no tmux server, relay, sshd, ssh agent or
scratch directory of this session's. The first session's rig, stopped by the pause, had left
`/tmp/p3201-rig-FgrV27` (three world directories, their relays and servers already gone, checked by pid and by
command line); this session removed it. Left alone because they are not this role's: `/tmp/p3201-dbg-BBvoRn` (19:03,
the parent verifier's skew debugging), `/tmp/wt-p3201-parent`, and another workflow's scratch machine (`gmux-p306v`)
that started during the final count. 16 Electron-family processes are running, none of this session's; the Electron
lock was never taken. Worktree: the same 62 entries as at the start, nothing staged, committed or stashed.

### Not done by the fix round, and why

- Every Electron run: `smoke:t1`, `smoke`, `smoke:t3`, `package`, `probe:p320` (T5, T6, C1, R1 to R7 in the app),
  `probe:p292`, `probe:p292:remote`, `probe:p95`, and the parent verifier's own PT, CX, O, S and L cells. The fixer
  launches no Electron; they are the reverify's, under the lock.
- His Mac Pro: verifiers only. `probe:p320:skew` with `P3201_SKEW_FAR=real` now quotes `=rec-none:` (fixture 91) and
  is the reverify's to run there.
- The rig at D 3 and 60, J 10 and 30, and with a UTF-8 carriage.
- "Two rows for him" above: neither can be removed without removing the phase's remote half, so neither was.

### What the verdicts, and the fix round's first session, got wrong

1. The parent verifier's nit that T6's Backspace reads empty: it read DEL, printed bare (item 1 of this session).
2. The fix round's first session wrote that F1 leaves no stream of typing on the control connection, and that the
   integrator's K1 at D 25 put 1 key there. Over a round trip longer than the gap between keys, every key rides it,
   and the verifier's 50 ms RECON loses exactly what it lost at the second build (corrected above, and now "Two rows
   for him", 1).
3. The attack verifier proposed "keep keys on the attach whenever the pane is known live and quiet on the far side"
   for RECON. F1 does exactly that, and it is why every loopback RECON variant now reads 0; it cannot reach a key
   typed while the far side is NOT yet quiet, because a key on the attach then overtakes or is eaten (§4 M3).

## §As built, the move onto e1d15287 (integrator, 2026-10-01; nothing committed, staged or stashed)

The main session moved this phase's uncommitted work onto origin/main `e1d15287` with `git apply --3way`. Phases
316.5, 323, 324, 326, 331, 332 and 332.1 had landed beneath it. Five files came back unmerged. The main session
resolved `CHANGELOG.md`, `package.json` and `build/verification-checks.mjs`, and this round checked each of them
against a fresh `git merge-file` of the three stages. Each keeps both sides and drops nothing. `CHANGELOG.md` keeps
main's three items and this phase's scroll item, and drops this phase's stale iPhone line. `package.json` keeps main's
`probe:p330`, `probe:p332` and `probe:p3321`, and this phase's new `probe:p320`, `probe:p320:rig` and
`probe:p320:skew`, with no key twice. `build/verification-checks.mjs` keeps Phase 326's `probe:p326` before this
phase's `probe:p292:remote` and `probe:p320:skew`. This round resolved `build/conformance-machines.mjs` and
`CLAUDE.md`. **The index still holds stages 1 to 3 for all five files, because nothing may be staged.** Whoever
commits must `git add` them.

### The numbering: Phase 324 keeps 100, and this phase moves up by one

Phase 324 landed condition 100 (100a to 100e) first. Its number is written once, as `P324_CONDITION`, which
`ablation:p324` reads. It did not move. This phase's conditions were 100 to 111. They are now 101 to 112, each n
becoming n + 1. 66 and 54b keep their numbers.

| Was | Now | What it pins |
|---|---|---|
| 100 | 101 | `control-plane.ts` adds one export |
| 101 | 102 | the table of seven shapes and the hostile corpus |
| 102 | 103 | the one pinned read format |
| 103 | 104 | the live-row target on the current connection |
| 104 | 105 | one call site for the runner (two callers) and one for its composer |
| 105 | 106 | checked before written, refused when the connection moved |
| 106 | 107 | the copy on a machine |
| 107 | 108 | the locale-proof read and the read proof |
| 108 | 109 | the typed shape |
| 109 | 110 | the router |
| 110 | 111 | the park gate |
| 111 | 112 | the fix round's four rules (F1 to F4) |

Where the numbers were moved:

- **`build/conformance-machines.mjs`**: the three header paragraphs, placed after 324's; the block, placed after 324's
  block; the probe's JSON read from its last line; 66's list of four files; 54b's sentence (now "conditions 101 to
  112"); and every `condition N:` failure line and `cantJudge(N, …)` call.
  - The prior attempt at this round made the move by script and left it in the worktree. This round re-derived it
    another way, before trusting it. Main's diff to the merge was compared with this phase's diff to the base, with
    every 100 to 111 moved up by one. The only lines that differ are the two notes saying the numbers moved, the
    corrected range "101 to 112", and `17 of 100`, which is a measurement and was rightly left alone.
- **`build/p3201/ablation.mjs`**: all 44 owner tags C100 to C111 are now C101 to C112 (`C66` is unchanged), along
  with the header and section comments and three self-test fixtures. One fixture was added: a Phase 324 line
  (`  - 100a: …`) is owned by none of these conditions.
- **`build/machines-conformance-probe.mts`**: 21 comments.
- **`build/verification-checks.mjs`**: the three numbers in `ablation:p320`'s comment.
- **`src/main/machines/scroll-shapes.ts`**: two comments.
- **`CLAUDE.md`**: one merged `conformance:machines` row. The Touching column is 324's, plus `attach-host.ts`'s hook,
  "which condition 110 reads". The last column is 324's text, then this phase's with the new numbers. Its cost is now
  "~5 s", measured at 5.29 s and 5.62 s here.
- **This file**: lines 75, 417, 418, 421, 424, 431 to 434, 520, 521, 621, 703, 854, 873, 875 and 1020. The dated
  as-built records above now use the new numbers too, so a reader who looks up a number finds the condition that
  carries it today.

These were not moved:

- `control-plane.ts:63`'s "condition 100", which is 324's own sentence.
- Every number that is data: `17 of 100`, `-H byte 100`, `position 100`, `Phase 107`.
- No vitest file names a condition number, and neither does `docs/BACKLOG.md`. Phase 327's queued entry still says
  "condition 100". It takes 113 when it is built.
- The gate's comment beside `P324_CONDITION` said "whoever lands second moves this one constant". It now also says
  that 324 landed first, that this phase took 101 to 112, and that 327 takes the next free number.

### What the move broke, and the fix for each

1. **`ablation:p324` arm 17 was not applied**, so the result was 28 of 29 with one finding. The arm's fourth edit
   looks for `  noControlThisRun.clear();\n  sink = null;\n}` in `resetControlPlanesForTests`, and this phase had put
   `dialectRefused.clear();` and `generations.clear();` between those two lines. This phase's two lines now stand
   above `noControlThisRun.clear();`. These are three independent clears in a reset for tests, so changing their
   order changes no behaviour. After the change: 29 of 29.
2. **`gate:background` was red on `build/conformance-machines.mjs` lines 10397 and 10437.**
   - The cause: 324's failure sentences contain the text `spawn(` inside strings. The gate reads that as a call, and
     from inside a string its argument text runs on for 97,356 and 77,383 characters, into this phase's block. That
     block contains `while ((m = call.exec(code)) !== null)`, and its sentences use "while" and "until".
   - Neither file is red alone. Measured in a scratch copy of `build/`, main's file exits 0, this phase's exits 0, and
     the merged file exits 1.
   - The fix: 324's three strings now spell `spawn(`, which prints the same bytes. `conformance:machines`
     produced the same output before and after (compared with diff).
   - The scanner's limit is reported here and was not fixed, because `build/assert-background-teardown.mjs` belongs
     to another phase. Any block appended after 324's (Phase 327's, for example) would have turned the gate red the
     same way.

### Phase 326's far attach and this phase's core agree (read)

- **Attach.** `attachSessionAdmitted` sends a listed remote row, and a far record that no list has reported yet
  (`attachFarUnbound`, after `awaitFarBinding`), through one composition, `attachListedRemote`, to
  `attachHost.attach({ …, machine })`. Every remote attach therefore makes a `client.kind === 'remote'` client, and
  that is the one branch where the attach host asks `routeRemoteInput`, which is
  `routeKey(sessionId, data) !== 'attach'`. Until the far binding arrives, no client exists, so no keystroke reaches
  the router.
- **Scroll.** In `remoteScroll`, an id that no machine lists answers from the manifest, through the same
  `remoteRecordOf` and `isRemoteRecord` that 326 uses. A record on a machine with a carriage this run answers the
  not-reachable-now value, so a pane waiting on 326's bind is asked again rather than drawn as having no scrollback.
  It never reaches this Mac's server. 326's rule FA8 still holds, because `remoteScroll` calls `remoteRecordOf(`.
- **Ending a session.** 326 invalidates the attach ticket on detach. This phase forgets a session's roads only when
  the session is ended or removed (`forgetScrollRoads` in `killSessionAdmitted` and `removeSession`), never on detach, so a pane still parked on the
  far side keeps its road through a detach and a reattach.
- `conformance:farattach` passes (11 of 11), `ablation:p326` passes (25 of 25, its 4 behaviour arms red), and the three
  p326 vitest files pass beside this phase's.

### Two things the verifiers should know, which this round did not change

1. **Phase 324 gives 3.6 and 3.6b a measured control dialect**, so `remoteScrollRunner` answers `live` there, and
   this phase's door now runs on two tmux versions it never measured. It measured 3.6a, 3.7b and 3.7c. The CHANGELOG
   item still names those three, and says that on any other tmux only full-screen programs scroll, which is no longer
   true for 3.6 and 3.6b.
   - One fix: a verifier measures the door on 3.6 and 3.6b and the item names them. Their pins are in
     `build/tmux-probe-versions.json`, and `build/build-tmux-version.mjs` builds them. This worktree has no such build.
   - The other fix: the door is narrowed to the three measured versions.
   - Either is a decision for the operator, so this round made neither.
2. **Phase 324's 100b allows exactly one remote `TmuxControlClient`**, built over
   `remoteControlTransport(machineId)` in `openControlPlane`. The GONE fix's option of "a fresh control client used
   for nothing but those shapes" would be a second remote client, and 100b refuses it as built. That fix must reuse
   the one site, or move 324's clause and say so.

### Commands (all in `/private/tmp/wt-p3201`, none launching Electron)

| Command | Exit | Numbers |
|---|---|---|
| `npm run -s typecheck` | 0, then 0 | 16.3 s; 4.5 s on the final tree; boundaries 0 violations, 0 runtime cycles |
| `npm run -s conformance:machines` | 0, then 0 | 5.3 s and 5.6 s; output identical across the escape; "the carriage door holds: … 7 shapes admit 66 argvs … refuse 80 hostile ones … 32 address facts"; 324's "far control child is spawned only after its precheck" |
| `node build/p324/ablation.mjs` in an APFS clone (`.git` removed), before the arm 17 fix | 1 | 147 s; 28 of 29, arm 17 not applied |
| the same, after | 0 | 159 s; 29 of 29 red on the clause of 100 that owns them; 3 arms also redden another rule beside their owner (twice 101, the export count, when an arm adds an export; once the rule that no file but the ledger calls `execRemoteShell`) |
| `node build/p3201/ablation.mjs --self-test` | 0 | 10 fixtures |
| `node build/p3201/ablation.mjs`, after the merge and again on the final tree | 0, 0 | 283.6 s and 286.9 s; 81 of 81 red on their owners; base green (machines, 308 main cases, 154 renderer cases); every clone file back by sha256 |
| `node build/p326/ablation.mjs` | 0 | 9.0 s; 25 of 25, the 4 behaviour arms red on their p326 file |
| `vitest run`, the 12 p3201 files, the 3 p326 files and the six other tests this phase edits | 0 | 21 files, 762 tests, 2.0 s |
| `vitest run`, the whole suite, under a scratch `HOME` with `ZDOTDIR` scratch and `HISTFILE=/dev/null` | 0 | 1,039 files passed and 2 skipped; 18,485 tests passed and 14 skipped; 41 s |
| `npm run -s conformance:farattach` | 0 | 11 rules, 217 ms |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s gate:checks`, `gate:electron`, `gate:simulator` | 0 each | electron 159 against a floor of 159 |
| `npm run -s gate:background` | 1, then 0 | red on 324's two strings (above); then "4 start a process … every one … ends it inside a finally block", 19 of 19 fixtures |
| `npm run -s gate:contract` | 0 | byte for byte; not regenerated, because nothing of this phase's moves the inventory |
| `npm run -s build` | 0 | 32 s, every gate inside it green |

### Not done by this round, and why

- Every Electron run, and anything on his Mac Pro. The integrator launches none of these; they belong to the reverify,
  under the lock.
- GONE, O, the `probe:p292:remote` warm-up count, the mouse-report NIT and `ROAD_QUIET_MS`: they belong to the fix
  round. This round only moved the tree.
- Finding the 74 bytes. Read statically, every probe and rig of this phase that types into a shell runs it under a
  scratch `HOME` or the quiet `ZDOTDIR`. `/etc/zshrc` sets `HISTFILE` from `ZDOTDIR` (falling back to `HOME`), so
  history lands there. Nothing exports `ZDOTDIR` or `HISTFILE` in this account's environment.
  - Not this phase's, but seen: the whole vitest suite starts at least one interactive zsh. Under the scratch
    `ZDOTDIR` it made `.zsh_sessions` and a 0-byte `.zsh_history`. Under his real `HOME` it would touch
    `~/.zsh_sessions`.

## §As built, the ruled round (the fixer, 2026-10-01, on the tree moved onto `e1d15287`; nothing committed, staged or stashed)

His rulings of 2026-10-01 bound this round: the at-most-once loss when a far control connection dies on its own
mid-burst is a stated limit (his ruling 1); the seventh shape is approved (ruling 2); and, after the second
needs_work, "One narrow fix round": fix GONE and O, accept CB and MID as stated limits, and keep the exec plane's
refusal (research 57 §3, `REMOTE_VERB_LEDGER` unmoved). The fix ran once. The scratch work is under
`scratchpad/p3201r3/fixer/`.

### GONE: a key asks the machine's own connection once more

**The defect, reproduced first.** A pane Tortie scrolled back, then the machine's control connection dropped and its
reconnect missed Phase 83's 10 s greeting deadline. The machine went onto Phase 83's set for the rest of the run, so
`remoteScrollRunner` answered `none`, `routeKey` sent every later key down the attach into copy mode, the held-key
loop dropped what it held, and the core answered `NO_PANE_HERE`, so the surface stopped asking.

**The doors, weighed.** Only a control client can leave copy mode for that pane:
- The attach cannot. No key leaves copy mode in both far key tables without typing into a program that is not in copy
  mode after all (`q` and `C-c` both cancel there, and on a live pane they are typed or interrupt); a mouse event does
  nothing in copy mode while the far server has `mouse off`.
- The exec plane may not (his ruling).
- So the door is the machine's OWN control connection, opened again through `openControlPlane`, with Phase 324's
  precheck and gate in front of it. That is the one construction site condition 100b allows. It is not a second client
  and adds no shape: what crosses is the same seven shapes. The "fresh control client used for nothing but those
  shapes" option would have been a second construction site (100b refuses it) and would have needed rows listed on its
  own connection, which none of the seven shapes can read (D4).

**What changed.**
- `src/main/machines/control-plane.ts`:
  - `openControlPlane(machineId, ask = {})`: `ask.keystroke` goes past the Phase 83 set ONCE and leaves the set as it
    is. The precheck, the gate and every other step run unchanged.
  - The `connected` handler takes a machine off the set when its connection greets.
  - `remoteScrollRunner` answers `waiting`, not `none`, while that client waits for its greeting. `none` is now a
    refused dialect, or a missed greeting with no client in the map.
  - No new export. Condition 101 still reads 28 names.
- `src/main/machines/scroll-order.ts`:
  - The source gains `mayReopen` (`missedGreetingThisRun`) and `reopen` (`openControlPlane(m, { keystroke: true })`).
    A rig's own source has neither, so it behaves as it did.
  - `askReopen` makes one ask per machine. Every key typed while it is being handed over joins it.
  - `routeKey` at `none`, over a pane that is or may be parked: if the machine may be asked, the key is HELD and the
    machine asked; otherwise the attach, as today.
  - The held keys' loop waits for that ask at `none` (`reopenStillComing`). It drops them, said once with no byte,
    only when the ask they waited on is over and the connection is still not there. **Changed by his ruling of
    2026-10-02:** from that moment the machine falls back to today, and every later key there takes the attach and
    nothing asks it again (see "§As built, his rulings of 2026-10-02" below). The next key no longer asks again.
  - `awaitsReopen` tells the core whether a pane on such a machine is still one only that connection can return.
- `src/main/sessions/core.ts`, `remoteScroll`: at `none`, `awaitsReopen` → the not-reachable-now value, so the surface
  keeps the pane and is itself again the moment a key brings the connection back; otherwise `NO_PANE_HERE`, as before.

Nothing retries on a timer. Only a keystroke asks, one ask in flight per machine, and the gate holds it to one file
(condition 112, F5). A machine that never greets costs one ssh child per ask, and asks only happen while somebody types
over a pane Tortie scrolled back there.

**Measured** (`fixer/gone/gone-drive.test.ts`, run only inside an APFS clone of the worktree). Shipping: the control
plane with Phase 83's real 10 s greeting timer, `scroll-order.ts`, `scroll.ts`, the guarded runner and the core's
`remoteScroll`. Mocked: the machine context, the precheck's read (run against the scratch server), and the feed.
The far side is a scratch server on tmux 3.6a and 3.7b, its control child behind the reverifier's own hang wrapper
(`exec /bin/sleep 15` while a `hang` file exists). The attach is a node-pty `tmux attach`.

The sequence: park 20 back, `detach-client -s gmux-control` with the hang on, wait for `none` (10.51 to 10.57 s every
run), lift the hang (except `never`), then type three keys no copy-mode table binds (`ā ē ī`), 100 ms apart.

| Arm | 3.6a | 3.7b | Pane after | The poll before the keys |
| --- | --- | --- | --- | --- |
| parent (nothing parked: today) | 3/3, 3/3 | 3/3, 3/3 | live | no pane |
| before (this round's rule off: the source without the ask) | 0/3 × 3 | 0/3 × 3 | copy mode, 6 of 6 | no pane |
| fixed | 3/3 in order × 3, then × 5 | 3/3 in order × 3, then × 5 | live, 16 of 16 | not reachable now; live after |
| never (the hang never lifted) | 0/3 × 2 | 0/3 × 2 | copy mode, 4 of 4 | not reachable now |

The first key's wait in `fixed` was 57 to 72 ms on loopback (10 runs), against 0 to 7 ms for the parent's attach. That
time is one precheck, one spawn and one greeting. Over a real link it is a few of that link's round trips, and it is
paid by the first key after the connection was lost and only by it.

An earlier pass typed `q w e`. There the `before` arm delivered 2 of 3 and left copy mode, because copy mode's own `q`
cancels it. That is why the table uses keys no table binds; the reverifier's keys were fresh letters too.

**The residual, for him.** A machine whose live connection will not open again at all (every new control client
hangs, as the `never` arm does). Keys typed over a pane Tortie scrolled back there wait for each ask, at most the 5 s
precheck plus the 10 s greeting, and are dropped when it fails; the pane stays scrolled back. Before this round those
keys were lost too, down the attach into copy mode (0 of 3 there as well), but there a typed `q` or Escape left copy
mode through copy mode's own key table; now a key is held and dropped, so typing cannot leave it. Today never parks
such a pane, so neither build matches today. No approved door reaches it: the attach cannot know the pane is still in
copy mode, and the exec plane is refused. The one realistic cause is a far tmux upgraded in place, whose new client
hangs against the old server (Phase 41's measurement); the attach, the same new client, then fails too. Choices for
him: accept it as stated; or, after a failed ask, send later keys down the attach (the road into copy mode before
this round), which loses every key typed before the person leaves copy mode with `q` or Escape, as before this round.

**Ruled on 2026-10-02: "Fall back to today", the second choice.** See "§As built, his rulings of 2026-10-02" below.

### O: a key on a remote surface wins over wheel travel made before it

**The cause, read and then measured.** Main's F2 counts a scroll's keys from the moment main RECEIVES the scroll.
Wheel travel waits in the renderer in three places:
- `pendingLines`, the 16 ms coalescing;
- `queuedLines`, behind a scroll on the chain;
- a scroll handed to the chain but not yet sent, waiting behind a poll or a read.

Travel made before a key, and sent after it, was counted by main as made after it. It waited out the quiet, then parked
the pane after the typing stopped.

**What changed** (`src/renderer/terminal/scroll/surface.ts`, a remote surface only):
- A key sent straight zeroes `pendingLines` and `queuedLines` and counts itself (`keysSent`).
- `dispatchTravel` drops a relative scroll whose count moved between its hand-over and its send, writes nothing, and
  does not mark the pane possibly parked.
- Travel made after the key is kept.
- A drag's latest place (`pendingTo`) is left alone, as the reverifier proposed: the thumb is still under the pointer,
  and its next move sends it again.
- This Mac's P1 to P4 are untouched. `keysSent` moves only on the `keysGoStraight` branch, and a case pins that a key
  here still lets the travel queued before it go after the key and its fence.

**"Main must not park on a travel older than the last key."** This holds by construction, not with a new field.
- The renderer never SENDS a relative scroll made before a key it has already sent.
- Its keys and its scrolls cross one IPC pipe in the order sent (D8 rests on the same fact).
- So main receives every scroll made before a key ahead of that key, and F2's count, taken at receipt, is the count at
  the gesture.

A gesture time carried with each scroll was weighed and not built. It is a contract field, and the two processes'
clocks would drop a scroll made within one IPC hop after a key.

**Measured** (`fixer/o/o-drive.mts`: the integrator's runner-level drive with an O cell added). The SHIPPING surface,
`scroll-order.ts` and `scroll.ts`, the core's steps restated and checked against `core.ts` as text, the carriage a
shipping `TmuxControlClient` behind a delay line of D each way, and the attach a node-pty behind its own. The
reverifier's shape: 31 keys 35 ms apart, and 25 one-line wheel events 16 ms apart from 300 ms. Read 1.5 s after the
last key. The "before" tree is a clone with exactly this round's two surface edits taken out.

| Tree | 3.6a D 25 | 3.6a D 50 | 3.7b D 25 | 3.7b D 50 | Keys lost |
| --- | --- | --- | --- | --- | --- |
| before this round | 0 of 10 left scrolled back | **9 of 10**, 1 to 3 lines, parked 364 to 401 ms after the last key | 0 of 10 | **10 of 10**, 1 to 3 lines, 359 to 391 ms after | 0 of 1,240 |
| this round | 0 of 10 | 0 of 10 | 0 of 10 | 0 of 10 | 0 of 1,240 |

At D 50, a 100 ms round trip like his Mac Pro's slowest, that is 19 of 20 against 0 of 20 (Fisher one-sided
p = 1.5e-10). At D 25 neither tree shows it, as the reverifier's loopback runs did not.

### probe:p292:remote and the warm-up session

`build/p292/probe-p292.mjs`:
- `panesOfThisRun` (exported, pure) leaves the warm-up session out of the one pane the run measures. The warm-up's
  name is one constant, `WARM_SESSION`.
- Three self-test fixtures: the control session left out, the warm-up left out, and two sessions of the run still
  counted as two.
- Self-test: 82 fixtures, PASS.
- In a scratch clone with the exclusion taken out, two of the three fixtures read BAD.
- The 3.7b matrix itself is the reverifier's to run: it launches Electron.

### CB and MID: stated, no code change

- **CB.** A tmux prefix armed on the attach survives keys sent the other way. Ctrl-B is tmux's prefix in every Tortie
  session, on this Mac and on another machine. Ctrl-B, then a scroll back before the next key, then a key, leaves the
  prefix armed, and a later key on the attach runs a tmux command (`t` opened clock-mode). Add it to D7's stated limit
  and to T6.
- **MID.** A program that takes the mouse in the middle of a flick gets fewer of that flick's notches (his Mac Pro: 15
  and 10 against 18 and 12 today). It is never stuck, and later notches arrive (15 of 15).
- **CHANGELOG.** Neither goes into the item. The operator's rule keeps a limit nobody will hit in ordinary use out of
  it, and both need an unusual sequence inside one gesture. They are stated here and belong in the commit body. If he
  judges otherwise, a one-clause addition is "and a Ctrl-B typed just before scrolling back can leave tmux waiting for
  a command".

### The two NITs, reported and not changed

- **Mouse reports and D7.** `isPaneReport` names focus, colour and device answers, not SGR or X10 mouse reports. A
  wheel report xterm sends while a sequence is in flight therefore crosses as `-H` bytes behind a `cancel`, where the
  attach would have had tmux parse it. It reaches only a program that asked for the mouse, which reads the same bytes.
  The stated limit beside D7: such a report is typed rather than re-encoded, so a program whose pane is not at the
  window's origin would read the coordinates of the attach's screen. A Tortie session is one pane with no status line.
- **`ROAD_QUIET_MS = 200` on his Mac Pro** (the reverifier's `probe:p320:skew`, 3.7c, N = 50): 0 eaten at 200 ms at
  every load, 1 of 50 at 128 ms (no load and heavy), and 7 of 50 at 64 ms heavy. The margin is about 1.5 times. A
  machine further away than his Mac Pro needs it measured again.

### His shell history

Before the first command of this round and after the last, `~/.zsh_history`, `~/.bash_history` and `~/.zshrc` were
statted only (size and modified time).

Every shell this round started had a scratch HOME, an empty ZDOTDIR and `HISTFILE=/dev/null`, or was not a shell:
- the vitest runs;
- the GONE drive, whose scratch server's `default-shell` is `/bin/sh` and whose wrapper exports the quiet shell;
- the O drive, which is the integrator's world, and whose recorder sessions run a command rather than a shell;
- the ablation's clones.

Read, not changed:
- The committed probes prove the far shell's `ZDOTDIR` before they make a session.
- The rig's panes run the recorder and the watchdog through the scratch server's `default-shell`. That is his
  `$SHELL -c`, which reads `~/.zshenv` and writes no history.

The 74 bytes stay unattributed.

### Gates, tests and arms

- Condition 112 gains F5, driven in the probe:
  - two keys and a second session's key over parked panes on a machine that missed its greeting are held, ONE ask is
    made, and nothing is written while there is no connection;
  - once it is back, each session's keys go behind one cancel;
  - a machine that may not be asked keeps the attach and is not asked.
- Condition 112 also reads three things in the source:
  - the core's `none` branch answers through `awaitsReopen`;
  - exactly one production file writes `keystroke: true`;
  - `askReopen` is called only from `routeKey` and the held keys' loop.
- `ablation:p320`: 95 arms.
  - 14 new: `g1` to `g10` for GONE, and `r13` to `r16` for O.
  - `e10` re-pointed where the runner's missed-greeting rule moved.
  - The gate header's table of vitest-owned clauses gains the ten that a plain probe cannot drive.
- `e6` would have been lost, and an accidental full run caught it first: the new `noControlThisRun.delete` had been
  placed between the generation line and the feed's notice. It now stands above both.
- New and changed cases:
  - `p3201-scroll-order.test.ts`: seven GONE cases.
  - `p3201-control-scroll.test.ts`: five keystroke-ask cases.
  - `p3201-remote-scroll.test.ts`: five not-reachable cases.
  - `p3201-remote-surface.test.ts`: six O cases.
  - The case "send a key straight past a coalesced scroll, and the travel after it" asserted the defect itself (travel
    made before the key, sent after it). It now types the key between the two and asserts that only the travel made
    after the key leaves.
- One clause has no arm, because nothing can see it: a dropped remote scroll does not mark the pane possibly parked
  (`!overtaken`). On a remote surface that mark feeds only `mustHold` and the drain, and the mount-time latch keeps both
  unreachable there. It is kept because it is true, since nothing was sent.

**What the census read.**
- `~/.bash_history` and `~/.zshrc` did not move.
- `~/.zsh_history` moved once: +122 bytes, modified 15:47:57. That is inside the first arm of the GONE drive's lag run,
  whose processes had a scratch HOME and ZDOTDIR and started no zsh at all (the scratch server's shell is `/bin/sh`,
  its panes run the recorder, and the control child is a `/bin/sh` wrapper).
- About twenty runs after that moment, among them the whole vitest suite, the build, both ablations and the deadline
  probe, left the file as it was. The move is not attributed. His own terminals were open.

**A path that CAN write it, found and not this phase's.**
- The environment these agents run in carries `TERM_PROGRAM=Apple_Terminal` and his Terminal tab's `TERM_SESSION_ID`.
- macOS's `/etc/zshrc_Apple_Terminal` gives an interactive zsh started there an exit hook: it appends that session's
  pending `.historynew` to `$HISTFILE`, which is `${ZDOTDIR:-$HOME}/.zsh_history`.
- The whole vitest suite starts such a shell. `src/main/tmux/__tests__/resolve.test.ts`'s `userPathEpoch` case calls
  the real `getUserPath()`, and under a scratch ZDOTDIR the run left `.zsh_sessions/<his session id>.history`,
  `.historynew` and `.session` there.
- Run without a scratch HOME or ZDOTDIR, the suite goes through his own files.
- Every vitest run of this round had a scratch HOME and ZDOTDIR.
- Not changed: the test and `resolve.ts` belong to Phases 48 and 276.

### Commands (all in `/private/tmp/wt-p3201`, or in a scratch APFS clone where named; none launches Electron)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,388 production files, 7,865 imports, 0 violations; 0 runtime cycles |
| vitest, the phase's files and their neighbours (22 files), under a scratch HOME | 0 | 818 tests |
| vitest, the whole suite, under a scratch HOME and ZDOTDIR with `HISTFILE=/dev/null` | 0 | 1,039 files passed and 2 skipped; 18,508 tests passed and 14 skipped; 51 s |
| `npm run -s conformance:machines` | 0 | 5.7 s; 112 with F5 green; "7 shapes admit 66 argvs … refuse 80 hostile ones … 32 address facts" |
| `node build/p3201/ablation.mjs --self-test` | 0 | 10 fixtures |
| `node build/p3201/ablation.mjs`, final tree | 0 | 306.6 s; 95 of 95 red on their owners; base green (machines, 325 main cases, 160 renderer cases); every clone file back by sha256 |
| the same, the 15 new or re-pointed arms alone before the final tree | 1, then 0 | `g3` stayed green (the gate's drive had one session, so a second ask never reached `askReopen`) and `r13`'s case was too weak (the travel waited behind the read the key asks); the drive gained a second session and the case answers that read; then both red |
| an accidental full run while editing (an `import()` of the ablation module runs it) | 1 | it caught `e6`'s shape missing, which is fixed above; it was stopped by its own end, its clone removed |
| `node build/p324/ablation.mjs`, in an APFS clone | 0 | 151.9 s; 29 of 29 |
| `node build/p326/ablation.mjs` | 0 | 8.7 s; 25 of 25 |
| `npm run -s conformance:farattach` | 0 | 11 rules |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `gate:checks`, `gate:electron`, `gate:simulator`, `gate:background`, `gate:contract`, `gate:knownhosts` | 0 each | electron 159 against a floor of 159; background 513 files, 19 of 19 fixtures; contract byte for byte |
| `npm run -s build` | 0 | 33 s, every gate inside it green, `conformance:ios` 22 rules |
| `npm run -s probe:controldeadline`, behind a `tmux` shim first on PATH that refuses `-L gmux` and any call naming no socket | 0 | 37.8 s; fallback 10,002 ms after spawn; a healthy far side greeted in 19 ms; the ablated build did not fall back. Its "0 before and 0 after" is the shim's refusal, never a read of his server |
| `probe-p292.mjs --self-test`, `probe-p320.mjs --self-test` | 0, 0 | 82 and 102 fixtures |
| the GONE drive (`fixer/gone/`), in an APFS clone, 3.6a and 3.7b, four arms | 0 | the table above; 36 runs, 0 children left after any run |
| the O drive (`fixer/o/`), the worktree and a clone without the O edits | 0, 1 | the table above; the clone's exit 1 is its 19 findings |

Counted once at the end:
- Every tmux server, socket, relay, recorder, attach, scratch directory and clone of this round is gone, checked by
  pid, by command line and by name.
- Two of them leaked on the way. The GONE drive's first try handed its control child the test process's own
  environment, so the child started a server at the default `TMUX_TMPDIR` under `-L p3201fx-<pid>`; two such servers
  were left. Both were ended by pid and their sockets removed. No personal tmux configuration exists for such a server
  to have read.
- The wrapper now refuses unless this run's own socket is already there, and passes `-f /dev/null`.
- 18 Electron-family processes are running, none of this round's. The Electron lock was never taken.

### Not done, and why

- Every Electron run and his Mac Pro: the reverifier's, under the lock.
  - `probe:p320`: GONE in the app, T5 and T6.
  - `probe:p292:remote` on 3.7b with the warm-up fix.
  - The reverifier's own O and GONE cells, with the parent beside them.
- 3.6 and 3.6b, which Phase 324 made measured control dialects. This worktree has no build of either. The CHANGELOG's
  "on any other tmux only full-screen programs that use the mouse scroll" is still false for them (the move's open
  item 1); that is the main session's call.
- The never-greets residual and the CB and MID clauses: his.

## §As built, his rulings of 2026-10-02 (the amender, on the tree moved onto `e1d15287`; nothing committed, staged or stashed)

Two rulings, given after the ruled round's fix and before its reverify, bind this round. Ruling 1, "Fall back to
today", changes code. Ruling 2, "Measure 3.6 and 3.6b too", changes none: it is checked here and measured by the final
check. No Electron was launched and his Mac Pro was not touched. The scratch work is under `scratchpad/p3201r3/amender/`.

### Ruling 1: once a keystroke's ask has failed, today

**What he ruled.** On a machine whose live connection can never open again, the ruled round held every key and
dropped it, so nothing typed could leave the scrolled-back view, where today a typed `q` does. Once the keystroke's own
ask for a connection has FAILED, keys go down the attach exactly as today. The successful path stays: keys held, then
delivered behind one cancel.

**What changed** (`src/main/machines/scroll-order.ts`, memory only, no new door, no new shape, no new export):
- `askFailed`, a set of machines. A machine joins it when the ask its held keys waited on is over and there is still
  no connection (`reopenStillComing`, through `fallBack`), which is either outcome of a failed ask: the precheck or the
  gate refused it, or the connection it opened missed its greeting too. `fallBack` says so once, naming the machine and
  no key.
- `routeKey` at `none`: a machine in the set takes the attach (`byAttach`) before anything asks. Every key there goes
  down the attach as before the ruled round, so copy mode's own key table takes them; a `q` leaves copy mode.
- `awaitsReopen` answers false for a machine in the set, so the core's `remoteScroll` answers `NO_PANE_HERE`, as it
  does for every machine with no connection today, and the surface stops asking.
- `sawConnection`, called wherever a carriage is read for a keystroke (`routeKey`) or for held keys (the loop). A
  carriage that is not `none` (a connection being opened or live) takes the machine out of the set: no key asks a
  machine that has fallen back, so that connection is Prepare's or Phase 83's own, and a later miss is a new one that
  a key may ask about once. When the carriage is live, or a fall back ends, the last ask is RETIRED: its number moves
  on with nothing in flight.
- `resetScrollOrderForTests` clears the set.

**Decisions, and where each comes from.**
- **The keys held while the ask was in flight are dropped, not written down the attach.** His words: "keys typed
  before that are lost, as today". And the router has no way to write to the attach after the fact: the host writes a
  key only inside its synchronous `term:input` listener (D8), so delivering held keys there later would be a new write
  path, which this round does not add. A person who typed `q` during the ask types it again once it has failed.
- **Nothing asks a fallen-back machine again, until a connection to it is seen.** Asking again on the next key is the
  behaviour he ruled out: each ask holds keys for up to the 5 s precheck plus the 10 s greeting and then drops them.
- **The retire closes a hole the fall back would have widened.** Before this round, an ask that a live connection had
  answered stayed recorded as the one a session's keys waited on. When that connection later dropped and its reconnect
  missed its greeting, the held keys read the old ask as over and were dropped without asking. With the fall back that
  would also have put the machine back on the attach without any ask in that episode. Retiring the ask on a live
  connection makes a later miss a new one, which asks once, as the ruled round meant.
- **Escape, stated exactly.** The ruling says `q` and Escape leave copy mode. `q` cancels copy mode in both of tmux's
  copy mode key tables. Escape cancels it in the emacs table, tmux's default, and only clears a selection in the vi
  table, which a far server chooses when its `EDITOR` or `VISUAL` names vi. Tortie's configuration sets no
  `mode-keys`. The comments say `q`; the log line names no key.
- **No guard without a reader.** A check in `reopenStillComing` for a machine already fallen back was written and then
  taken out: no sequence reaches it, because every key that could start a held-key loop there either takes the attach
  or sees a connection first, which ends the fall back.

**What the reverifier should expect in the app** (the GONE `never` arm, a far wrapper that hangs every new control
client): keys typed from the first key after the connection is lost until the ask fails (up to the 10 s greeting after
a precheck) are lost; the app then logs the fall back once; the next `q` leaves copy mode and every key after it
arrives, as at the parent; the wheel and the scrollbar behave as for any machine with no connection today (`no pane`).
The `fixed` arm (the hang lifted) is unchanged: 3 of 3 in order, live.

**Tests, each red with its clause removed** (`ablation:p320`, below):
- `p3201-scroll-order.test.ts`. The case "when it does not open … and the next key asks again" asserted the behaviour
  he ruled out; it now reads "… the next key takes the attach, as today, with nothing asked", types `q` and `x`, and
  asserts one ask, both keys on the attach and `awaitsReopen` false. Three cases are new: the asked connection misses
  its greeting too; a fall back ends when a connection is seen again, and the next miss asks once more; an ask a live
  connection answered is not the one a later miss waits on.
- `p3201-remote-scroll.test.ts`. One new case drives the shipping core: not reachable now while the ask is in flight;
  after it fails, the key takes the attach and every verb answers `NO_PANE_HERE`, with one ask and nothing written.

**Arms.** `ablation:p320` has 100 arms: `g11` to `g15` are new (the router's fall back, `awaitsReopen`'s, the failed
ask recorded, the retire, the fall back's end), each red on the main suite case that owns it. `g9` was re-pointed
where its clause became the fall back's block. The gate header's table of vitest-owned clauses gains the five rows,
and the CLAUDE.md row says the rule and the count.

### Ruling 2: 3.6 and 3.6b

**Nothing on the scroll path refuses them** (read, not measured):
- The only refusal is `remoteScrollRunner`'s `dialectRefused`, written where `decideRemoteControlGate` says no.
  `TESTED_REMOTE_TMUX_VERSIONS` measures a live connection for 3.6, 3.6a, 3.6b, 3.7b and 3.7c (Phase 324), so the gate
  admits all five.
- No other file of the scroll path reads a version. Every field of `STATE_FIELDS` exists in all five. The 3.6 family
  answers `#{copy_position_limit}` empty, which takes the same inference as 3.6a. `send-keys -H` dates from tmux 3.0.
- The probes take any tmux by path (`P320_FAR_TMUX`, `P3201_RIG_TMUX`, `P3201_SKEW_TMUX`, `GMUX_TMUX_BIN`) and hold no
  version list.

**Not measured here.** Neither build is in this worktree or in his checkout (`build/vendor/tmux-probe` is absent).
`node build/build-tmux-version.mjs 3.6` and `3.6b` make them from the pinned tarballs. That is the final check's step.

**The CHANGELOG item** now reads "on machines running tmux 3.6, 3.6a, 3.6b, 3.7b or 3.7c". The final check confirms
the wording against what it measures.

### His shell history

**How an interactive zsh writes it on this Mac** (read in `/etc/zshrc` and `/etc/zshrc_Apple_Terminal`):
- `/etc/zshrc` sets `HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history` for EVERY interactive zsh. An environment's
  `HISTFILE=/dev/null` does not survive it, so only a scratch `ZDOTDIR` or `HOME` keeps a zsh off his file.
- It then sources `/etc/zshrc_$TERM_PROGRAM`. Inside a tmux pane `TERM_PROGRAM` is `tmux` (measured: a scratch 3.7b
  server started with `TERM_PROGRAM=Apple_Terminal` gave its pane `TERM_PROGRAM=tmux`), so Apple's hook never runs
  in a pane. It does run in a zsh started directly by a process that carries his Terminal's `TERM_PROGRAM` and
  `TERM_SESSION_ID`. On exit, when his history options allow, that hook appends the session's `.historynew` to
  `$HISTFILE` and rewrites the file once more to trim it (`fc -p … && fc -P`).

**Found in this phase, and closed.** `build/p3201/typing-rig.mts` started its scratch server with his `SHELL` and
`HOME`. Its control client's `-C new-session -A -s gmux-control` names no command, so that pane ran his `/bin/zsh` as a
login shell, reading his rc files, with `HISTFILE` at his `~/.zsh_history`. Nothing types into that pane, so it is not
shown to be the 74 or the 122 bytes, but it could write there. Now the rig's server has `SHELL=/bin/sh`,
`HISTFILE=/dev/null`, `HOME` and `ZDOTDIR` an empty directory of the world's own, and no `TERM_SESSION_ID`.
Measured: one S3 world on the vendored 3.7b, sampled every 300 ms from outside. The `gmux-control` pane ran `-sh`. The
recorder's environment read that HOME and ZDOTDIR, `SHELL=/bin/sh`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`.
The world PASSED (door 0 of 11 lost, the control 11 of 11). Nothing was left running.

**The rest of the phase's probes and rigs**, so none of them can carry the id or start a zsh on his files:
- `probe:p320`, `probe:p292` and `probe:p95` delete `TERM_SESSION_ID` from their own environment after the self-test
  exit. They give the app `ZDOTDIR` equal to its scratch `HOME` and `TERM_SESSION_ID: undefined`.
- `skew.mjs` deletes it at the top of `main`. Its local world gains a scratch `HOME` beside the empty `ZDOTDIR` it had.
- `rig.mjs` hands the rig no `TERM_SESSION_ID`.
- `real-machine.mjs`'s local dry runs (the census, the teardown and the proof) gain `ZDOTDIR` equal to their scratch
  `HOME`. Their environments were already built from nothing and carried no `TERM_SESSION_ID`.
- `ablation.mjs` runs every check under a scratch `HOME` and `ZDOTDIR` inside its clone, without `TERM_SESSION_ID`.
  The base stayed green: machines, 329 main cases and 160 renderer cases.

**Left as it was.** The loopback machine's far shells keep the account's `HOME`, because sshd sets it from the
password entry and no client may. Their `ZDOTDIR` is the yard's, proved before any session (D12). No `SendEnv` exists
in this tree or in `/etc/ssh/ssh_config`, so no `TERM_SESSION_ID` crosses ssh.

**For the main session, not this phase's file.** `src/main/tmux/__tests__/resolve.test.ts`, the `userPathEpoch` case
(lines 504 to 522), calls the real `getUserPath()`. That spawns `$SHELL -lic 'printf …'` (`src/main/tmux/resolve.ts`
line 326) with the test runner's environment. Run without a scratch `HOME` or `ZDOTDIR` and with his Terminal's
`TERM_SESSION_ID`, it starts an interactive login zsh over his rc files, which goes through Apple's hook above.
Phases 48 and 276 own it. Every vitest run of this round had a scratch `HOME` and `ZDOTDIR`, and no `TERM_SESSION_ID`.

**His files, statted only, before the first command and after the last:** `~/.zsh_history` 732,390 bytes, modified
2026-10-01 23:11:01; `~/.bash_history` 23,166 bytes, 2026-09-29 13:17:22; `~/.zshrc` 6,884 bytes, 2026-09-16
17:12:30. None moved.

### Commands (all in `/private/tmp/wt-p3201`, under a scratch HOME and ZDOTDIR with `HISTFILE=/dev/null` and no `TERM_SESSION_ID` unless named; none launches Electron)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,388 production files, 7,865 imports, 0 violations; 0 runtime cycles |
| vitest, the two changed files | 0 | 135 tests |
| vitest, every p3201 file with the p95, p292, control-plane and attach neighbours (17 files) | 0 | 626 tests |
| vitest, the whole suite (also without `TERM_PROGRAM`) | 0 | 1,039 files passed and 2 skipped; 18,512 tests passed and 14 skipped; 57 s |
| `npm run -s conformance:machines` | 0 | 6 s; 112 with F5 green |
| `npm run -s gate:background` | 0 | 513 files, 19 of 19 fixtures |
| `npm run -s gate:contract` | 0 | byte for byte |
| `npm run -s build` | 0 | 35 s, every gate inside it green; electron 159 against a floor of 159; `conformance:ios` 22 rules |
| `node build/p3201/ablation.mjs --self-test` | 0 | 10 fixtures |
| `P320_ONLY=g11,…,g15 node build/p3201/ablation.mjs` | 0 | 21.7 s; 5 of 5 red on their owners |
| `npm run -s ablation:p320`, the first full run (his HOME, `HISTFILE=/dev/null`) | 1 | 329.6 s; 99 of 100 red on their owners, `g9` SHAPE MISSING (its clause had become the fall back's block) |
| `P320_ONLY=g9 node build/p3201/ablation.mjs`, re-pointed | 0 | 5.1 s; red on its owner |
| `npm run -s ablation:p320`, the final full run (his HOME for the harness itself, its checks under its own scratch HOME) | 0 | 415.8 s; 100 of 100 red on their owners; base green (machines, 329 main cases, 160 renderer cases); every clone file back by sha256 |
| `probe-p292.mjs --self-test`, `probe-p320.mjs --self-test` | 0, 0 | 82 and 102 fixtures |
| `real-machine.mjs --self-test` | 0 | 91 fixtures, the live local proof among them, 6 s |
| `skew.mjs --self-test` | 0 | PASS, 41 s, "nothing this world started is still running: 0" |
| `rig.mjs --self-test` | 0 | 21 fixtures |
| one rig world, S3 on 3.7b, sampled (his HOME, `HISTFILE=/dev/null`, to prove the rig's own scrubbing) | 0 | 10 s; the panes as above |
| `node --check` on the eight edited scripts | 0 each | |

### Not done, and why

- Every Electron run and his Mac Pro: the reverifier's, under the lock. That covers GONE in the app (the `fixed` and
  `never` arms, the second now expected to leave copy mode on `q` once the ask has failed), T5 and T6,
  `probe:p292:remote` on 3.7b, and O on his Mac Pro.
- 3.6 and 3.6b, measured: the final check's.
- `resolve.test.ts`: the main session's.

## §As built, his ruling to land (the main session, 2026-10-03)

The final check of the ruled round answered needs_work on two rows, both in the rare case where a far machine's control
connection fails to come back: (1) GONE flap, where after a fall back and a Prepare that restores the connection, a second
missed greeting while scrolled back loses the keys and leaves the pane in copy mode, because the fall back is not reset when the
connection returns; (2) during a keystroke's failing ask, its own greeting timeout marks the machine quiet for one timer list (5 s
focused, 30 s unfocused), so the rows read unknown and Phase 67's gate swallows keys. Every other row of the 20 was no worse than
today, among them O on his Mac Pro (0 of 40 ended scrolled back, the O-less control 13 of 40), tmux 3.6 and 3.6b, and the far tee
(9,585 lines, only the seven shapes). His ruling: **"Accept and land now"**. Both are stated as limits here and, in one clause, in
the CHANGELOG item ("If the connection to that machine fails to come back twice while you are scrolled back, what you type there
can be lost until Tortie reconnects"). Owed: reset the fall back when the connection greets, as a later entry.
