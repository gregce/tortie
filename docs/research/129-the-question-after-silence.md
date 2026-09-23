# 129. The question after silence: what really loses a waiting agent, measured on real agents

Phase 319. Written 2026-09-22 against the tree at `5a72c1e7` ("docs(ios): his answers to the app's
decisions"). Ten agent CLIs were run for real, each in a scratch folder that was deleted afterwards, each
on a private tmux server of the researcher's own (`tmux -L p319-*`, never `-L gmux` and never his default
server), under his own sign-ins and with every safeguard left on, so a permission question could appear
the way it does for him. Their output bytes were recorded with timestamps, then written back into
scratch panes at many timings and read by the SHIPPING `SessionActivityMonitor` under plain node. No
Electron was launched, because Phase 314 held the Electron lock. Nothing was installed, committed or
signed into, and no credential file, keychain item or conversation store was read. Two investigators
measured, two adversaries attacked what they found, and a judge ruled on every disagreement before a
word of this was written. §5 records what the attack killed, so no later round has to re-derive it.

This answers the operator's ruling of 2026-09-22, in his words: *"should we just use a real agent? … so
we can fix this correctly."* The question came from Phase 314's reverifier, which found by SIMULATION
that Tortie's screen monitor misses a question drawn in one burst after the agent has been silent for
more than a minute: 171 of 800 combinations of print time and poll phase never reached `needs_input`
(21.4%). A question missed that way never turns amber, never reaches the tray or ⌘J, and never reaches
the phone's push. It affects only the agents the registry marks `activity: { tier: 'screen' }`
(`src/main/agents/registry.ts`: cursor at line 616, gemini 787, droid 848, antigravity 1043, qwen 1200,
pi 1282, omp 1364, grok 1497 and opencode 1603), plus every agent the build has never heard of, because
`DEFAULT_ACTIVITY` is the same screen profile (`registry.ts:1987`). Claude Code (hooks) and Codex (the
pane-title oracle) do not use this path and were run as controls.

## 1. The answer first

**The miss is real, and it has one cause and one rate.** When the agent has left the 60 second probe
window and then draws its question in a single write, Tortie misses it 25% of the time on average while
no Tortie window has focus, when the poll runs every 2 seconds. It never misses it while a window has
focus, when the poll runs every second. The reverifier's 21.4% was the same mechanism measured on a
coarse grid. Once missed, the question stays grey for as long as the screen does not change: no amber,
no tray, no ⌘J, no push.

**On real agents, that timing miss is not what loses questions today.** Investigator A's live run
recorded 11 real questions and gates. The shipping monitor caught 2 of them and missed 9, at both
cadences, and not one of the 9 was a timing miss. Seven were screens the dialog detector cannot read:
cursor ×2, qwen ×2, opencode ×1, Claude Code's trust gate and antigravity's trust gate. The other two
were antigravity questions that the detector does read, hidden by antigravity's own repaint every 2
seconds. No recorded turn (0 of 21 completed) went silent for a minute before asking. Every agent that
ran a turn kept drawing while it worked, including the 3 turns run under a held focus-out, which is
the signal Tortie sends an agent when no Tortie window has focus. And 6 of the 8 agents that ran the probe command run their tools as a detached child,
which keeps the session watched even if nothing is drawn. So the timing gap needs shapes nobody
recorded: more than a minute of thinking with no spinner, or a question raised from idle with nothing
drawn first. **Its rate in the field is unmeasured.**

**The round found two worse ways to lose a question, and both can reach him today.**
- **The ceiling of six.** Every blocked session, hook-blocked Claude sessions included, takes one of the
  6 screen captures on every tick. With 6 or more sessions blocked at once, no new screen-tier question
  ever turns amber, even with a window focused, and no more than 6 sessions can ever be amber at once.
  Two independent runs measured "never" at 6 blocked sessions.
- **Scroll-back.** A question drawn while he has that session scrolled back does not turn amber while
  he stays scrolled back. When he scrolls back down, today's code reads the session as IDLE with the
  question on screen.

**The fix chosen is J** (§6), about 60 lines in `src/main/activity/state-machine.ts` and
`src/main/activity/monitor.ts`. It moves no constant and adds no process, timer, `ps`, IPC or status
source. When a settled screen-tier session's activity stamp moves, the monitor takes one look at its
screen, and only the dialog detector reads that look. A blocked session is re-captured only when its
stamp moved, not on every tick. A capture taken in the same wall-clock second as the stamp gets one
more look. A session Tortie has just resized gets no look until it next works. J closes all three ways
this monitor loses a question, and makes the scroll-back question amber 1.5 to 3 seconds after he
returns. On every measured row it is no worse than today except one: a dialog-shaped paste delivered in
one burst, with him leaving Tortie within about a second, turns amber 145 times in 200 today and 200 in
200 under J. That row comes from an existing fault, Tortie reading his own words as a question, and it
is his ruling (§10).

**J does not recover any of the 9 real misses.** Those belong to the detector, to grok's masking and to
antigravity's registry row, and each is its own entry (§9).

## 2. What was measured on real agents

### 2.1 The rig

- **Recording (investigator A).** Ten agents ran at once on `-L p319-a` with a copy of
  `resources/gmux-tmux.conf`, in 160×45 panes, each in its own git-initialised scratch folder. Bytes
  were recorded by `pipe-pane` with sub-millisecond timestamps. `list-panes` (window activity and title)
  was sampled every 100 ms, `ps -axo pid,ppid,time,stat,comm` every 500 ms and `capture-pane` every
  second. Two shipping monitors watched each session, one ticking every second and one every 2 seconds,
  in the `setInterval` shape of `armStatusTimer` (`src/main/sessions/core.ts:2290-2311`). Each monitor
  had one session, so the capture cap of 6 could not cause a miss. The prompt was the same for every
  agent: run `sleep 90` in the foreground, then `touch p319-done.txt`. The second round used a 75 second
  sleep, a touch outside the folder, and qwen switched to its Ask permissions mode.
- **Replay (investigator A).** The recorded bytes were written into the ttys of scratch panes on real
  tmux (`-L p319-ar1..3`) at their recorded times, one shipping monitor per pane. The monitor's process
  table was the recorded one for the same instant, remapped onto the replay pane, so tool children and
  CPU were what the live run saw. The grid was 6 sub-second start offsets × (10 tick phases at 2 s + 5
  at 1 s), which is 90 replays per agent (45 for qwen, with 3 offsets). The writer ran at most 2 to
  218 ms late everywhere except one pi run, which was 4.3 s late once. pi's measured age stayed at 0
  throughout, so that lateness does not change its result.
- **Fidelity (adversary 1, by a different method).** tmux moves `#{window_activity}` only when the pane
  prints. `send-keys` with no echo, the focus-out bytes `ESC [ O`, `resize-window`, and entering or
  leaving copy mode did not move it (tmux 3.6a). Predicting tmux's live stamp from the recorded chunk
  times alone matched between 86% (gemini, 12 of 14) and 100% (cursor 107 of 107, pi 99 of 99) of
  samples across the 10 agents. Every mismatch was 1 second at a second boundary, inside pipe-pane's
  delivery delay. Re-rendering the recorded bytes in fresh 160×45 panes gave screens byte-identical to
  the live capture at 7 of 7 question moments. **The replay is faithful.**
- **Focus-out (adversary 1).** The 2 second cadence runs only when no Tortie window has focus
  (`core.ts:556-557`, `setPollFocused` at `core.ts:2317-2327`). At that moment tmux forwards a focus-out
  (`focus-events on`, `resources/gmux-tmux.conf:49`; Tortie's renderer sends it from
  `src/renderer/terminal/keys/focus-report.ts`). Neither investigator recorded under a focus-out, so
  adversary 1 ran one turn each of cursor, qwen and grok with `ESC [ O` held for 124 seconds.

### 2.2 Per agent

"Timing share" is how many of the replays of that agent's real question the timing gap alone would
have lost. "90 of 90" is one recorded question replayed at 90 tick phases, not 90 questions.

| Agent | Tier | Requests / completed turns | Draws while it works (largest gap) | Questions recorded | Detector reads it | Caught live at 1 s / 2 s | Timing share |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gemini 0.54.0 | screen | 2 / 0: every request failed with "API key not valid" | Not measured | Its launch trust gate (A, B) | Yes | 1 of 1 / 1 of 1, but at +12.5 s and +14.8 s, because its own auto-updater's npm child was read as a tool | None: the gate is drawn while the session is `starting`, which is always watched (`state-machine.ts:237`) |
| cursor-agent 2026.09.18 | screen | 3 / 3 | Yes, a timer and a spinner: 0.3 s (A), 0.70 s while unfocused (adversary 1) | 2 in A's run (before the sleep, and the touch), 1 in B's, 1 in adversary 1's | No: `→ Run (once) (y)` has no numbered rows | 0 of 2 / 0 of 2 | 0 of 90 |
| qwen 0.22.0 | screen | 4 / 4 | Yes: 0.5 to 0.8 s, 0.75 s while unfocused | 2, in Ask permissions mode only. In his default Auto mode it asked nothing | No: numbered rows, but "Allow execution of" and "Waiting for user confirmation..." match neither HINT nor QUEST | 0 of 2 / 0 of 2 | 0 of 45 |
| pi | screen | 2 / 2 | Yes: 0.1 s | None. pi has no permission prompt | n/a | n/a | n/a |
| omp | screen | 1 / 1 | Yes: 0.8 s. The one agent kept watched by its drawing alone: it runs commands as a background job with no detached child | None | n/a | n/a | With its drawing stripped out: missed 6 of 20 at 2 s (adversary 1) |
| grok 1.0.41 | screen | 3 / 3 | Yes: 0.2 s, 0.15 s while unfocused. Fully silent for 69 to 147 s after a turn | None: its default mode ran every command without asking | n/a | Any question would be masked on every tick: its MCP servers read as a running tool | n/a |
| opencode | screen | 2 / 2 | Yes: 0.1 s | 1 (access to an outside folder) | No: `Allow once  Allow always  Reject` has no numbers | 0 of 1 / 0 of 1 | 0 of 90 |
| antigravity (`agy` 1.2.7) | screen | 1 / 1 | Yes, and it repaints every 2.0 s at idle too: 169 chunks over 340 s | 3 (trust gate, before the sleep, the touch) | Trust gate no. The two numbered questions yes | 0 of 3 / 0 of 3 | None: its own repaint masks them (§3.5) |
| droid | screen | Not installed (`command -v` finds nothing) | | | | | |
| claude 2.1.280 (control) | native: hooks | 3 / 3 | Yes: 0.4 s | Its workspace-trust gate | No: no numbered rows | 0 of 1 / 0 of 1 on the screen floor | n/a |
| codex (control) | native: title | 2 / 2 | Yes: 0.1 s | Its update prompt | Yes | 1 of 1 / 1 of 1, at +4.9 s and +4.6 s | n/a |

**Turns spent, 23 requests and 21 completed turns in total.** By agent: gemini 2 (0 completed), cursor 3,
qwen 4, pi 2, omp 1, grok 3, opencode 2, claude 3, codex 2, antigravity 1. By researcher: investigator A
16 requests (15 completed), investigator B 3 (2 completed), adversary 1 made 3, adversary 2 made 1, and
the judge made none. Adversary 1 answered one cursor question by typing `y`.

### 2.3 What the recordings say about the gap

- **Every agent that ran a turn drew while it worked.** Largest gap between output chunks during the
  silent command: cursor 0.3 s, qwen 0.5 and 0.8 s, pi 0.1 s, omp 0.8 s, grok 0.2 s, opencode 0.1 s,
  antigravity 2.0 s, claude 0.4 s, codex 0.1 s. In replay, the number of sessions left unwatched when
  the command ended was 0 of 90 for each of cursor, antigravity, pi, omp, grok, opencode, codex and
  claude, and 0 of 45 for qwen.
- **They keep drawing after a focus-out.** Over 124 s unfocused: cursor 352 writes with a largest gap
  of 0.70 s, qwen 1,179 writes with 0.75 s, grok 998 writes with 0.15 s. So the 2 second cadence does
  not make them go quiet.
- **But drawing was not what kept them watched.** Adversary 1 read A's recorded process table. The sleep
  ran as a detached child (state `Ss`, no `+`) for cursor, qwen, pi, opencode, codex and claude, and
  `hasToolChild` (`src/main/activity/process.ts:135-141`) counts that as work on every tick. With every
  output byte inside the command deleted and the screen frozen, those six were still watched at the
  question 20 of 20 times and caught 20 of 20. Only with the tool child removed as well did misses
  appear: cursor 3, qwen 4, codex 5, claude 2 and pi 0, each out of 20, and omp 6 of 20.
- **A question arrives in one write, or nearly.** Cursor 2 writes over 183 ms, codex 2 writes over
  115 ms, qwen, claude and gemini 1 write each. So the one-write case the rate is computed for is the
  realistic one.
- **A blocked real agent writes nothing.** While its question was on screen: cursor 0 writes in 33 s,
  qwen 0 in 14 s and 0 in 59 s, opencode 0 in 71 s, claude's trust gate 0 in 32 s, codex's update
  prompt 0 in 33 s, gemini's trust gate 3 distinct stamp-seconds in 30 s. Antigravity alone keeps
  writing, every 2.0 s. This is why J's rule for blocked sessions costs nothing on real agents (§6).
- **At idle most agents are silent for minutes.** Stretches with no output at all: qwen 135 s, omp 225 s,
  grok 140 s after its turn, opencode 170 s, codex 165 s, cursor 43 s, claude 29 s, gemini 155 s.

## 3. The mechanism

### 3.1 The miss after silence is a sampled predicate

- `#{window_activity}` is in whole seconds, and the monitor multiplies it by 1000
  (`src/main/activity/panes.ts:145`).
- Output counts as work only while `now - activityAt <= QUIET_MS`, and `QUIET_MS` is 2,000
  (`state-machine.ts:47`, read at `:332-333`).
- A session is worth `ps` and a screen capture only while it is starting, animates when idle, or
  reported work within the last `AMBIGUOUS_WINDOW_MS`, which is 60,000 (`state-machine.ts:55`,
  `worthProbing` at `:230-240`, the set built at `monitor.ts:592-600`). `lastWorkingAt` is set only when
  a `working` verdict is committed (`state-machine.ts:454`).
- The poll runs every 1,000 ms while a Tortie window has focus and every 2,000 ms otherwise
  (`core.ts:556-557`, switched by `setPollFocused` at `core.ts:2317-2327`).

So a write at time *b* is seen as work only by a tick that lands between *b* and `floor(b) + 2 s`, a
window that lasts `2 - frac(b)` seconds. A 1 second tick always lands in it. A 2 second tick misses it
with probability `frac(b) / 2`, which averages 25%. A burst that lasts *D* seconds is missed with
probability `(1 - D)² / 4`. Three methods reached this independently: investigator B's virtual clock over
the shipping class (100 of 400 missed at 2 s at 65, 70, 120 and 700 s of silence, 0 of 400 at 1 s),
investigator A on real tmux with the committed fixture (14 of 60 missed at 2 s, 23.3%, and 0 of 30 at
1 s), and adversary 1's derivation. The span formula held too: at 2 s, D = 0.5 s missed 6.3% (formula
6.25%), D = 0.728 s missed 1.9% (1.85%) and D = 1.0 s missed 0.0%, 1,600 runs each. On real tmux with
real bytes, gemini's recorded trust gate collapsed into one write after 75 s of silence was missed 11 of
40 times at 2 s (27.5%) and 0 of 40 at 1 s.

**A miss is permanent while the screen is still.** A session outside the window is never captured, so
the dialog detector never sees the question, and nothing moves it back into the window until its screen
changes. The phase of the 2 s timer drifts: plain node `setInterval` drifted 1.44 ms per fire at
1,000 ms and 1.59 ms per fire at 2,000 ms over 60 s, so the phase sweeps a whole second in about
21 minutes, and `setPollFocused` re-arms the timer on every focus change. Each question therefore gets
a chance between 0% and 50% of being missed, and every running Tortie averages 25%.

**The boundary is not exactly 60 seconds of silence.** The miss begins when the burst comes 60 s or
more after `lastWorkingAt`, and `lastWorkingAt` trails the last write by the working tail: the output
window, then up to five captures of screen memory. With a spinner that changes the screen, B measured
0% missed at 64.0 s of silence, 11.0% at 64.25 s, 18.8% at 64.5 s, 23.5% at 64.75 s and 25% from 65 s,
400 runs each. When the working screen never changes, the tail is shorter and 25% is already reached
at 59 s.

### 3.2 The window edge

A dialog needs two consecutive captures to be confirmed (`DIALOG_CONFIRM_TICKS`, `state-machine.ts:51`).
If the first capture lands on the last tick inside the window, the session has left the probe set by
the next tick, gets no capture, and a tick with no capture resets the count (`state-machine.ts:376`;
captures only for the window or for blocked sessions, `monitor.ts:612-616`). B swept silences of 60 to
68 s in 0.05 s steps × 20 phases at 2 s: 639 misses in 3,220 runs, and 360 of those misses had
captured the dialog once and then dropped it.

### 3.3 The ceiling of six

`wantCapture` includes every session whose state is `needs_input`, whatever its tier
(`monitor.ts:612-616`). `isMidDialog` sends each of those to the list captured on every tick
(`state-machine.ts:221-223`, `monitor.ts:617-620`), and `captureScreens` takes
`always.slice(0, MAX_CAPTURES_PER_TICK)` with `MAX_CAPTURES_PER_TICK = 6` (`monitor.ts:95`, `:1243`).
With 6 sessions blocked, the rotating budget for everything else is 0. A new question on any
screen-tier session is then never captured and never raised, at either cadence.

Measured twice, independently. B (`starve.mts`, 1 s): a new question after a spinner reached
`needs_input` after 2.8 s with 0 other sessions blocked, 2.8 to 3.8 s with 5, and never with 6 or 10,
whether the blocked sessions were gemini or Claude registry entries in state `waiting`. Adversary 1
(`starve2.mts`, 1 s): with 5 others blocked, a question drawn at 20 s was raised at 24 s. With 6 blocked
it was never raised in 120 s. With 8 sessions all showing a question from the start, only 6 ever turned
amber. **This is the only loss in the study that happens with a window focused.**

Research 18's own definition excluded blocked sessions from the budget: `AMBIGUOUS ... && state !=
'needs_input'`, "≤6 panes/tick" (`docs/research/18-agent-activity.md:819-827`). The code that shipped in
the same commit also captures every blocked session on every tick, so the six slots were never sized
for that.

### 3.4 Scroll-back

Scroll-back in Tortie is tmux copy mode (`src/main/tmux/scroll.ts`), and Phases 205 and 292 keep a
reader's place across blur and tab switches. `inferredVerdict` returns no verdict for a pane in copy mode
(`state-machine.ts:320`), and the monitor does not capture it (`monitor.ts:614`). On real tmux
(adversary 1, `cmtest.mts`), a spinner ran for 70 s and a question the detector reads was drawn at 75 s.
The pane nobody scrolled reached `needs_input` at 77.7 s (1 s cadence) and 78.6 s (2 s). A pane scrolled
back from 10 s that never returned never reached it, and read `running` for the 65 s the question was up.
A pane scrolled back from 10 s to 95 s read IDLE at 97.7 s (1 s) and 100.6 s (2 s) with the question on
screen, because `lastWorkingAt` froze when copy mode began, so the window had closed by the time he
came back. Only screen-tier agents are affected. A native verdict is read before the frozen inferred one.

### 3.5 What the real recordings showed that is not timing

- **The detector.** It needs a row starting `1.` or `1)`, a row starting `2.` or `2)`, and either a
  HINT phrase or a QUEST phrase (`src/main/activity/screen.ts:67-71`). Run over about 5,880 recorded
  captures it fired only for antigravity, gemini's gate and codex's update prompt, and 0 times for
  cursor, qwen, opencode, claude, grok, pi and omp. Cursor and opencode draw no numbers. qwen draws
  numbered rows, but its words match neither phrase list. Claude's 2.1.280 trust gate and antigravity's
  trust gate have no numbers. This is the largest real loss, by a wide margin.
- **grok reads as working all the time on this Mac.** Its MCP servers (bun, npm ×4, tessl, node) run as
  session leaders outside the foreground group (`Ss`), and `hasToolChild` counts them. All 8,148 of its
  replay ticks were `working`, idle included, and the tool-child evidence resets the dialog count on
  every tick (`state-machine.ts:351-352`), so a grok question could never be confirmed. Cursor and omp
  launch their MCP servers as `S+`, which does not trip the rule.
- **Antigravity repaints every 2.0 s at idle**, and its CPU was at 5% or more in 202 of 394 samples.
  Its registry row says `animatesWhenIdle: false` with the comment "Idle byte-silence VERIFIED"
  (`registry.ts:1042-1043`), which was true of the version that was checked and is not true of 1.2.7.
  At a 1 s tick, one tick of every pair sees output newer than 2 s, so the dialog count never reaches 2.
  It was caught 0 times live at either cadence. In replay at 2 s it was caught 13 of 60 times (the
  question before the sleep) and 24 of 60 (the touch), with a median of 9.2 s and 6.8 s and a worst case
  of 53.2 s; at 1 s, 0 of 30 both times.
- **Gemini's launch starts its own updater.** Launching it ran `npm install @google/gemini-cli@0.60.0`
  as a detached child and printed "Update successful". That child is why its trust gate was raised
  12 to 15 s late: `hasToolChild` read npm as a tool. The installed copy still reads 0.54.0 with no file
  newer than the run.

### 3.6 Where the constants came from

Every constant in this mechanism arrived in one commit, `4c6f2ea0` (2026-08-10, Phase 13, "feat(agents):
replace byte heuristic with per-agent activity oracles"), from research 18 §6, and none has been tuned
since. `STATUS_POLL_IDLE_MS` moved to `core.ts` in `ab425534` (2026-08-11) with its value unchanged.
**The 60 s window has no measurement behind it.** It is the cost gate for research 18's acceptance test
A9, "with every session settled the tick is exactly one `list-panes` exec: no `ps`, no captures"
(`docs/research/18-agent-activity.md:980`), so `state-machine.ts:9-10`'s claim that "every number here
has a measurement behind it" does not hold for it. `QUIET_MS` of 2 s was written for the 1 Hz focused
cadence, and the 2 s unfocused cadence was kept for cost (research 18 §6.4 item 4); nobody checked the
two against each other. The whole-second stamp is tmux's own format, not a choice. The same
whole-second granularity bit before, in Phase 242.1's `smoke:remote` arm 19b (`0dc947b8`).

## 4. Every candidate fix, and what it costs

Unit costs on this Mac (investigator B, a scratch server with 31 panes at 120×40 and 1,270 processes,
300 calls each): `list-panes -a` with the pane format, 7.4 ms wall and 4.88 ms client CPU; a
`capture-pane` by spawn, 7.5 ms and 4.12 ms; a `capture-pane` through one control client, which is how
the monitor captures (`monitor.ts:1230-1232`), 0.06 ms wall pipelined and 0.033 ms of tmux server CPU;
one `ps -axo pid=,ppid=,time=,stat=`, 36.7 ms wall and 33.3 ms CPU.

| Candidate | What it does | What it costs or breaks | Verdict |
| --- | --- | --- | --- |
| Poll every second when unfocused | Removes the sampling miss when ticks are regular (0 of 400) | Doubles `list-panes` while unfocused (+5.6 ms CPU per extra call). Still misses 9.8% if 20% of ticks are skipped. Leaves the ceiling of six, the window edge and scroll-back | Rejected |
| `QUIET_MS` = 3,000 | Widens the sampling window | Adds 1 s to every question (median 5.5 s against 4.5 s at 2 s). Still misses 17% at 2 s with 20% skipped ticks. Leaves the rest | Rejected |
| A 600 s window (W600) | Moves the gap to 10 minutes of silence | Still 25% missed at 700 s. More sessions compete for 6 slots: the busy model fleet caught 50 of 52 at 1 s, worse than today's 51. The quiet fleet used 5.5 captures a tick against 3.0 and its median latency at 2 s rose from 4.3 s to 8.0 s | Rejected |
| A sub-second activity stamp | Would make the window exact | tmux 3.6a has no such format (its `t:` modifier formats only the seconds value). Needs a patched tmux, and still fails under skipped ticks | Rejected |
| Add `#{cursor_x}`/`#{cursor_y}` or sweep settled panes | Detect a redraw some other way | +0.4 ms client CPU per `list-panes`, but a dialog redrawn in place need not move the cursor. A sweep of settled panes breaks A9 and feeds the screen hash | Rejected |
| A control client per session | Push `%output` for every session | On tmux 3.6a a control client receives output only for its own session (0 lines while two other sessions wrote). 30 sessions would need 30 clients at 2.8 MB each, each marks an agent session attached, and each streams every byte into Node (grok writes about 12 chunks a second at rest). `alert-activity` fires once per window until cleared | Rejected |
| A1: a moved stamp counts as work | Closes the sampling miss | Under skipped ticks, Tortie's own resize of a settled session reads as work (1.2 false `running` per run at 30% skipped ticks), which breaks Phase 12.11's rule | Rejected |
| A2: a moved stamp earns `ps` and a capture | Closes the sampling miss | The same resize failure (1.2 per run), and leaving copy mode reads as work (1.0 per run) | Rejected |
| A1g: A1 with a reflow guard (adversary 2, about 3 lines) | Closes the sampling miss, and the resize case (0 of 200) | On a 30 s footer, 19.2 turn boundaries per run against today's 14.9. Reads `ps` every tick while a session is blocked. Leaves the ceiling of six and the window edge | Rejected |
| A4: a moved stamp earns a PEEK read only by the dialog detector (B) | Closes the sampling miss and the window edge at every cadence and skip rate | Tortie widening a settled answer so it reads as a question raised a false amber in 16 of 16 live monitors and 200 of 200 in simulation. Does not touch the ceiling of six | Rejected as built |
| A5: A4, plus blocked sessions captured only on a moved stamp, plus a same-second re-look and a keystroke belt (B) | Also closes the ceiling of six | The resize false amber (16 of 16). A Claude session matched only by process descent stuck amber against its own idle in 55 of 200 at 2 s. The Phase 312 numbered choice lost in up to 48 of 200 prompts (152 of 200 delivered at d = 400 ms, 1 s) because the re-look was analysis and was not built | Rejected as built |
| A5fix4 (adversary 2) | A5 with the re-look built, a peek armed only by writes outside the reflow grace and kept separate from the blocked re-capture, and peeks for screen-tier profiles only | 64 changed lines. Passed every attack adversary 2 wrote, but the judge found one more worse row (§6): a later write after Tortie's widening raised a false amber 200 of 200 at 2 s against today's 148 | Superseded by J |
| **J** (the judge) | A5fix4 without the keystroke belt, plus a resize hold | About 60 lines, no constant moved. §6 | **Chosen** |

## 5. What the attack killed

Each of these was upheld by the judge after an adversary refuted it, so no later round re-derives it.

1. **"With real agents, the timing gap never occurred" is not evidence that the gap is absent.** The
   probe was a silent foreground sleep, and 6 of the 8 agents that ran it run the sleep as a detached
   child that keeps them watched whatever they draw.
2. **"Each Tortie process has its own fixed miss rate between 0% and 50%" is wrong.** The timer's phase
   drifts about 1.5 ms per fire and is re-armed on every focus change, so every process averages 25%.
3. **"After a miss, a session outside the window is never read by `ps` again" is wrong for a fleet.**
   One `ps` is read for every session whenever any session is in the window (`monitor.ts:603`, passed to
   every verdict at `:634-636`), so CPU and tool-child evidence still apply. Captures do not.
4. **Investigator B's model fleet is not a real loss rate.** It invents "15% of turns silent 60 to 240 s,
   then ask" and gives every session an empty process table (`fleet.mts:103`), which no real agent
   produces during a tool. It is valid only for comparing the variants with each other.
5. **The skipped-tick numbers (41% missed at 2 s) are not product facts.** The skip rates of 20% and 30%
   were assumed. `statusPollBusy` skips a tick only when the previous one overran
   (`core.ts:2294`), and B's own unit costs put a tick near 0.1 s against a 1 to 2 s interval.
6. **"grok is never silent at rest" is wrong.** B recorded only its start screen. After a turn grok goes
   fully silent, for 146.6 s in A's run and 69.1 s in adversary 1's.
7. **Gemini's "0 of 24 missed at a real 728 ms span" is not an exposure.** That burst is its launch draw
   of the trust gate, which arrives while the session is `starting` and always watched. A's recording of
   the same gate spanned about 2.9 s with a 1.2 s gap.
8. **"Polling faster when unfocused would regress antigravity" does not bind anything.** Focused use is
   already 1 s, where antigravity is caught 0%. Its defect is its registry row and the masking.
9. **A4 and A5 as built.** The resize false amber, the Claude stuck amber and the lost numbered choice,
   each measured (§4).
10. **A5fix3 (the reflow guard on the single re-look flag).** After Tortie narrowed a blocked session, the
    question was gone and the session stayed amber: 200 of 200 in simulation and 8 of 8 live monitors.
    Hence two flags: any write re-captures a blocked session, and only a write outside the reflow grace
    arms a peek.
11. **A5fix2 (peeking scrolled-back panes).** It raised a false amber 200 of 200 on a working agent under
    a detached tool child with a dialog-shaped static screen. Closing scroll-back needs the process
    masks on that tick.
12. **The keystroke belt.** As sketched it could never fire. The renderer tells main about typing only
    when the session is already `needs_input` (`src/renderer/state/sessions-slice.ts:1841`), the 2 s
    cadence runs only when no Tortie window has focus, and the phone's door answers four routes, three
    `GET`s and a pairing `POST`, none of which types into a session
    (`src/main/pocket/routes.ts:115-120`). In the model fleets A5 with and without the belt were identical
    (899 against 899 `running` transitions). A later phone write route must carry this row in its own
    side-by-side.
13. **A5fix4 as the final answer.** The judge's `reflowlater.mts`: Tortie widens a settled pi answer
    outside the window so it now reads as a question, and 60 s later the pane writes once without
    changing what it shows. Today raised a false amber 200 of 200 at 1 s and 148 of 200 at 2 s. A5fix4
    raised it 200 of 200 at both, 52 more. J's resize hold brings it back to 200 and 148.
14. **A baseline capture after the reflow grace, instead of the hold.** A question drawn inside the 2.5 s
    grace would become the baseline and be lost for good, where today still catches it at the next
    write.
15. **The brief's "antigravity is not installed".** `agy` 1.2.7 is at `~/.local/bin/agy`, the registry's
    binary (`registry.ts:991`). droid is not installed.
16. **"No process left behind" (investigator B).** B's grok run left pid 22095, a bun MCP server
    (`cursor-talk-to-figma-mcp`) with parent 1 and its working folder in B's deleted scratch folder
    (§8).
17. **Denominators.** "90 of 90" is one recorded question at 90 tick phases. "Draws while working" rests
    on 1 to 3 turns per agent, all with the same prompt shape.

## 6. The judge's rulings

| Question | Ruling |
| --- | --- |
| Is the reported miss real? | Yes: one mechanism, 25% at 2 s on average, 0% at 1 s with regular ticks. The 21.4% was the reverifier's grid. The judge's own rerun on a 200-cell grid: 55 of 200 missed at 2 s at 65, 120 and 700 s, 0 of 200 at 1 s |
| Where does the miss begin? | About 64 s after the last spinner frame, 25% from 65 s. B is right and the brief's "60 s" is approximate |
| Does each process have a fixed rate? | No. Adversary 1 is right: the phase drifts |
| Did the gap occur on real agents? | Not in any recorded turn, but A's probe could not have opened it for 6 of 8 agents. The field rate is unmeasured |
| The window edge | Confirmed, and J closes it |
| The ceiling of six | Confirmed from the code and by two independent runs. J closes it |
| B's fleet and skipped-tick numbers | Valid only between variants. J does not depend on either, because it holds with no skipped ticks |
| grok | Silent after a turn (adversary 1). Masked on every tick by its detached MCP servers (A). Its own entry |
| gemini's 728 ms burst | Not an exposure |
| antigravity and a faster poll | Does not bind J, which changes no cadence. Its own entry |
| A4 or A5 as built? | No. Adversary 2's three amendments are required |
| The keystroke belt | Dropped: it cannot fire in the product |
| Does A5fix4 pass the no-regression rule? | Not quite. The later-write row was worse. J adds the resize hold and passes |
| The person's own words read as a question | An existing breach of the standing rule. J neither causes nor cures it. One row is worse by the letter and goes to the operator |
| Scroll-back | Real. Not closed here. J improves the return |
| A1g and the other candidates | Rejected. J dominates each |
| The detector misses | Confirmed on byte-identical re-renders. The dominant real loss, and not this fix |

### 6.1 The chosen fix, J

The scratch reference is `scratchpad/p319/judge/J.diff`, with the full variant files in
`judge/variants/J/`. It is written against `5a72c1e7`.

1. **Watch the stamp.** `SessionState` gains `seenActivityAt`, `lookPending`, `peekArmed` and `peekHeld`
   (`state-machine.ts`, beside `leftCommand` at `:173`, initialised in `freshState` at `:194`). In
   `pairWithPanes` (`monitor.ts:1022`), an activity stamp newer than last tick's sets `lookPending`. It
   also sets `peekArmed`, but only when the stamp is at or after `reflowUntil`, so a repaint Tortie caused
   by resizing never arms a peek.
2. **The peek.** A session gets one capture on a tick, marked as a peek, when every one of these holds:
   its profile has no native oracle (`profile.native === undefined`, which is the screen tier and every
   unknown agent), the native verdict is null, it is not in copy mode, it is outside the probe window,
   it is not `needs_input`, it is not held, and it has `peekArmed` or a dialog count above 0. Only the
   dialog detector reads a peek: `inferredVerdict` skips `st.screen.note` for it
   (`state-machine.ts:345`), so a peek cannot add a screen change, a `working` verdict or a turn
   boundary, and it reads no `ps`. A session stays peeked while its dialog is part-way confirmed, which
   closes the window edge.
3. **A blocked session is captured only when its stamp moved** (`lookPending`) **or while a release is
   being confirmed** (`clearTicks > 0`), not on every tick (`monitor.ts:612-620`). This removes the
   ceiling of six. On real agents a blocked screen writes nothing (§2.3), so it costs nothing.
4. **The same-second re-look.** A capture taken in the same wall-clock second as the stamp it followed
   leaves `lookPending`, and an armed peek, set for one more look. The Phase 312 numbered choice needs
   it, because Claude's hook arrives before Claude draws the dialog (`monitor.ts:1161-1169`).
5. **The resize hold.** `noteGeometryChange` (`monitor.ts:531-535`) also sets `peekHeld`. Peeks are
   refused until the session's next ordinary capture, so a settled session Tortie has resized behaves
   exactly as it does today until it next works.

It moves no constant: `QUIET_MS` 2,000, `AMBIGUOUS_WINDOW_MS` 60,000, `MAX_CAPTURES_PER_TICK` 6,
`REFLOW_GRACE_MS` 2,500 and the 1 s / 2 s cadence all stay.

### 6.2 J against today, row by row

All rows are 200 runs (20 sub-second offsets × 10 tick phases) unless stated. "Today" is the shipping
monitor at `5a72c1e7`. The fleets are models and valid only between variants (§5 item 4). Sources:
`judge/battery.txt`, `judge/fleet.txt`, `adv2/results-raw.txt`, `adv2/reflow-live3.out.txt`.

| Row | Today | J |
| --- | --- | --- |
| One-write question after 65, 120 or 700 s of silence, 2 s | 145 of 200 each, median 4,701 ms | 200 of 200 each, median 4,451 ms |
| The same, 1 s | 200 of 200, median 3,001 ms | 200 of 200, median 3,001 ms |
| The same with 20% of ticks skipped (an assumed rate), 2 s | 163, 108 and 116 of 200 | 200 of 200 each |
| The same with 20% skipped, 1 s | 181, 181 and 177 of 200 | 200 of 200 each |
| 30-session heavy model fleet, questions caught, 1 s / 2 s | 12 of 23 / 10 of 23 | 23 of 23 / 22 of 23 |
| Light model fleet, questions caught, 1 s / 2 s | 19 of 19 / 14 of 19 | 19 of 19 / 18 of 19 |
| Questions today caught that J missed, every fleet run | n/a | 0 |
| False `needs_input`, every fleet run | 0 | 0 |
| Captures per tick, light fleet, 1 s / 2 s | 5.77 / 5.15 | 5.30 / 4.29 |
| `ps` per tick, light fleet, 1 s / 2 s | 1.000 / 1.000 | 1.000 / 0.998 |
| Captures and `ps` per tick, heavy fleet | 6.00 and 1.000 (at the cap) | 6.00 and 1.000 |
| Questions drawn during a wake storm, heavy fleet, 1 s | 0 of 2 | 2 of 2, at 4.7 s and 4.3 s |
| Turn boundaries, heavy fleet, 1 s / 2 s | 1,675 / 1,086 | 896 / 614 (see §7) |
| Tortie widens a settled answer outside the window, false amber | 0 of 200 | 0 of 200 (A4 and A5 as built: 200) |
| A later write 60 s after that widening, false amber, 1 s / 2 s | 200 / 148 of 200 | 200 / 148 of 200 (A5fix4: 200 / 200) |
| A blocked session narrowed by Tortie, still blocked 55 s later | 0 of 200 | 0 of 200 (A5fix3: 200) |
| A Claude session idle by its own registry, matched by descent | 0 of 200 | 0 of 200 (A5 as built: 55 at 2 s) |
| Phase 312's numbered choice delivered, d = 30, 150, 400 ms | 200 of 200 each | 200 of 200 each |
| Captures per choice, 1 s / 2 s | 30.0 / 15.0 | 1.4 to 1.9 / 1.2 to 1.4 |
| A question withdrawn in two frames, still amber 30 s later | 0 of 200 | 0 of 200 |
| His own dialog-shaped words, typed key by key, amber | 200 of 200 | 200 of 200 (an existing fault) |
| The same words pasted in one burst, 1 s | 200 of 200 | 200 of 200 |
| **The same words pasted in one burst, 2 s** | **145 of 200** | **200 of 200** (the one worse row) |
| Working under a detached tool child, dialog-shaped static screen | 0 of 200 | 0 of 200 |
| The same while scrolled back | 0 of 200 | 0 of 200 |
| Question drawn while scrolled back: amber during scroll-back | 0 of 200 | 0 of 200 |
| The same: amber after he returns | 0 of 200 (reads idle) | 200 of 200, median 1.5 s (1 s) and 3.0 s (2 s) after |
| Scrolled back while working on a dialog-shaped screen | 0 of 10, 0 captures | 0 of 10, 0 captures |
| B's controls at 30% skipped ticks (old prompt, finished agent, typing, 1 s clock, 30 s footer, resize, copy mode, withdrawn question), against A5fix4 | baseline | identical `needs_input`, `running` and turn boundaries; captures within +0.025 a tick |
| Live on real tmux, 2 panes, 8 monitors, against A5fix4 | captures 184 (1 s), 92 (2 s) | 8 of 8 matched today transition for transition; captures 170 and 85 |
| Starvation, 6 or 10 blocked sessions, 1 s (B, on A5, whose clause 3 J keeps) | never | 2.8 s, 3.69 to 4.31 captures a tick against 6.00 |
| A settled session with nothing written | 0 captures, 0 `ps` | 0 captures, 0 `ps`: research 18's A9 still holds |

## 7. What stays unmeasured, and why

- **How often the timing gap happens in real use.** No recorded turn went silent for a minute before a
  question (0 of 21). The shapes that could open it were not recorded: more than 60 s of model thinking
  with no spinner, and a question raised from idle with nothing drawn first, for example after a
  background job wakes the agent.
- **gemini.** No request completed ("API key not valid" twice), so its working shape and any question it
  asks after a turn are unmeasured. It must not be launched again until his sign-in works, because
  launch starts its own updater.
- **droid.** Not installed.
- **App Nap and timer throttling** on an occluded, unfocused Tortie. There is no `powerSaveBlocker` in
  `src/main`, and nobody launched Electron. The real skip rate is unknown; J does not depend on it.
- **J as a built change.** It is a scratch diff measured in simulation and on real tmux with 2 panes.
  It has never run inside the app, never under 30 real sessions, and never through the phone's push.
- **The cost on a real 30-session load.** Only the model fleets and the 2-pane live run were measured.
- **What the drop in turn boundaries is made of.** In the heavy model fleet J fires 896 turn boundaries
  where today fires 1,675. Turn boundaries feed the overview fold (`src/main/sessions/core.ts:1025-1027`,
  Phase 138). If the dropped ones are footer repaints this is a saving. If any is a real turn it is a
  loss. Nobody has compared them turn by turn.
- **The real delay between Claude's hook and its drawn dialog.** Without the re-look the choice was lost
  at 150 ms and 400 ms. No recorded turn drew a Claude permission prompt, so the real delay is unknown.
- **A peek on a session running a tool nobody saw start (the writer's reading, not ruled on).** A peek
  reads no `ps`. So if a settled session outside the window draws a dialog-shaped screen and starts a
  detached tool in one burst, the 2 s sampler misses the burst, and no other session is in the window
  that tick, J's two peeks would read no tool child and could raise a false amber. Today the same
  sequence reads idle rather than amber. It needs a working screen that the detector reads as a question,
  which research 18 measured at 0 of 386 on working screens, and a fleet usually holds a `ps` because
  some other session is in the window. Nobody ran it. The phase must.
- **How often he pastes a dialog-shaped text and leaves within a second.** The one worse row has no
  measured frequency.
- **Remote sessions.** `remoteRowStatus` never produces `needs_input`
  (`src/main/machines/remote-sessions.ts:1032`), so J neither helps nor harms a remote row.

## 8. What this round left behind

- **A leaked process.** Investigator B's grok run left pid 22095, `/Users/gdc/.bun/bin/bun
  .../cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts`, parent 1, working folder in B's deleted
  scratch folder. It was still running 1 hour 44 minutes after it started when this was written. grok's
  MCP servers are detached, so ending grok and its tmux server does not end them. Nobody in this round
  signalled it, because it is not theirs. It should be ended by pid: SIGTERM, then SIGKILL. **Any later
  recorder must end grok's MCP subtree by pid in its `finally`.**
- **Conversation records.** The 23 requests now sit in the agents' own stores, with working folders under
  deleted scratch folders, and they may appear in his Overview. Nobody read or deleted them.
- **Trust decisions.** Cursor recorded "trust" and gemini recorded "Don't trust" for scratch folders that
  are now deleted.
- **gemini's updater** ran `npm install @google/gemini-cli@0.60.0` and printed "Update successful". The
  install on disk still reads 0.54.0 with no newer file. qwen said an update would install on exit and
  was ended with SIGKILL, so it never exited normally; its install still reads 0.22.0.
- **Socket files** for the stopped `p319-*` servers remain in `/private/tmp/tmux-501`, outside every
  researcher's write area. Every server answers "no server running".
- **For the next recorder:** Claude Code refused a standalone `sleep 90` twice and accepted
  `perl -e 'select(undef,undef,undef,90)'`. qwen 0.22 refused it until a `# intentional-sleep` comment
  was added.
- **The evidence is in scratch, which does not survive a reboot.** Recordings and scripts are under
  `scratchpad/p319/` (`a/rec` 41 MB, `adv1/rec` 4.8 MB, `rec` 5.6 MB, the judge's `J.diff` and variants).
  They are real agent output under his sign-ins and nobody has read them for what they disclose, so they
  must not be committed as they are.

## 9. What this queues

1. **Phase 319, J** (`build/p319/ENTRY.md`). It lands first because it is small and proven, and because
   it lifts the ceiling of six that would also hide questions a wider detector finds.
2. **The detector**, Tier 3, straight after: cursor, qwen, opencode, and the Claude and antigravity trust
   gates. Widening the detector can raise false ambers, so it needs its own negative corpus, and the
   5,880 recorded captures are banked for that.
3. **grok's detached MCP servers read as a running tool.**
4. **antigravity's registry row** (`animatesWhenIdle`) and its 2 s idle repaint.
5. **Amber while scrolled back.** It needs the process masks on a scrolled-back pane's tick.
6. **His own words read as a question**, by paste, by typing or by an echoed prompt. It breaks the rule
   that `needs_input` may only come from session behaviour.
7. **Tortie widening a settled answer so it reads as a question**, inside the window (today 200 of 200)
   and on a later write (today 200 of 200 at 1 s, 148 of 200 at 2 s).
8. **App Nap**, measured before anything is built on it.

## 10. The rulings it needs from him

1. **"Do I accept the one worse row?"** He pastes a dialog-shaped multi-line text into a session in one
   go and leaves Tortie within about a second. Today it turns amber 145 times in 200; under J, 200 in 200.
   If he stays in Tortie, both turn amber every time. The cause is the existing fault of reading his own
   words as a question, which is item 6 above. Default: accept the row and land J.
2. **"Is the order right: J first, then the detector?"** The detector loses far more real questions
   (7 of the 9 missed in A's live run). Default: J lands first because it is smaller and proven and it
   lifts the ceiling of six, and the detector phase is queued straight after it as Tier 3.
3. **"Do I fix my gemini sign-in?"** It was refused twice with "API key not valid", and launching gemini
   started its own updater. Default: the phase goes ahead with no live gemini, the gemini row stays
   unmeasured, and nothing launches gemini again until the sign-in works.
4. **"Do I clear the scratch conversations?"** 23 requests with working folders under deleted scratch
   folders sit in the agents' own stores and may show in his Overview, and cursor and gemini recorded
   trust decisions for deleted folders. Default: leave them. An agent never reads or deletes another
   agent's store, so he removes them himself if they get in the way.
