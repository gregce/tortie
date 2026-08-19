# Research 57, investigator 5. Scrollback on a session running on another machine

Measured in the tree and against the operator's Mac Pro on 2026-08-19. Every claim about the tree
below names a file and a symbol that was read this session.

## The answer

Build the smaller thing. Tortie should offer **read the last lines** for a session on another
machine, and it should not build a real scrollbar there.

Three findings decide it, and the first one is the reason this round is cheap.

1. **The read only path already exists and it needs no key at all.** `capture-pane` is row 5 of
   `REMOTE_VERB_LEDGER` in `src/main/machines/exec-plane.ts`, class `read`, repeat class `safe`.
   `remoteCaptureArgs` in `src/main/machines/remote-capsule.ts` already composes it with a start
   line, and `captureRemoteSessionNow` in the same file already runs it on demand for one session
   and stores the answer. Nothing about the ledger, the scripts catalogue or the confirm gate has
   to change to read a remote session's history.
2. **A real scrollbar cannot be built without undoing Phase 89's structure.** The local protocol in
   `src/main/tmux/scroll.ts` needs two verbs. `copy-mode` is not on the ledger at all, and
   `send-keys -X` is the ledger's one `unsafe` row. The single door that may send `send-keys`,
   `sendArmedResumeText`, composes a fixed five element argv through `composeArmedResumeArgv` and
   refuses anything that is not one line of printable text aimed at a `$id`. A scroll protocol needs
   an open family of `-X` commands with numeric arguments, so it cannot fit that door and would have
   to replace it.
3. **The latency does not reach the local bar even if the verbs were allowed.** The local scroll
   protocol runs over the control client at about 1 ms per round trip, recorded in the header of
   `src/main/tmux/scroll.ts`. One command through the exec plane to the Mac Pro cost a median of
   0.07 s over a direct Tailscale link on the same LAN, with a worst sample of 0.36 s in nine.
   `WHEEL_COALESCE_MS` in `src/renderer/terminal/scroll/surface.ts` is 16.

Phase 95 makes the current absence quiet. This document does not touch that work. What it adds is
the affordance that goes in the space Phase 95 leaves.

## What a person has today, counted

| Thing | Local session | Remote session | Where it is decided |
| --- | --- | --- | --- |
| Wheel and scrollbar | works | throws on every poll | `GmuxCore.scrollTarget`, `src/main/sessions/core.ts` |
| Capture Last 250 / 1,000 Lines | works | offered and wrong, see below | `terminalMenuItems`, `src/renderer/terminal/terminal-menu.ts` |
| Clear | works | offered and wrong, see below | same file |
| Saved output panel | offered, from local snapshots | offered, from the remote capsule | `savedOutputItem`, `src/renderer/app/session-actions.tsx` |
| Background capture of the screen | at quit and at death | every 120,000 ms, 8 sessions per pass | `REMOTE_CAPSULE_CADENCE_MS`, `src/main/machines/remote-capsule.ts` |
| Capture on demand | no | yes, on the End path only | `captureRemoteSessionNow`, same file |

The wheel is not simply inert on a remote session. `TerminalPane.tsx` calls
`term.attachCustomWheelEventHandler` for every session with no test on the machine, so the surface
takes the wheel event and then fails to act on it.

### Two menu items are offered on a remote session and route to the wrong server

This is a defect, not a gap, and it is in the same area so it belongs here.

`canCapture` in `src/renderer/terminal/terminal-menu.ts` is `hasLiveTerminal(session.id) &&
captureBridge() !== null`. `hasLiveTerminal` in `src/renderer/terminal/capture/index.ts` returns
true whenever the renderer holds a `Terminal` for that session id. A remote session has one, because
`attach-plan.ts` opens a real ssh terminal for it. So both capture presets and Clear are drawn.

`captureHistory` then calls the bridge with `tmuxName: session.tmuxName`. In main,
`capturePaneText` in `src/main/capture/service.ts` calls `tmux.resolvePaneTarget`, which in
`src/main/tmux/sessions.ts` searches the sessions of **this Mac's** private server for a matching
`tmuxName`. `clearHistory` in the same file does the same thing and then deletes that pane's
history.

Names are deduped per server and never across servers. `createSession` in
`src/main/tmux/sessions.ts` dedupes against `listSessions()` on this Mac. `createRemoteSession` in
`src/main/machines/remote-sessions.ts` dedupes against `takenNames(machineId)`. So one name can
exist on both sides. The two outcomes are:

| State of this Mac's server | Capture Last N Lines on a remote session | Clear on a remote session |
| --- | --- | --- |
| No local session of that name | error toast, nothing captured | error, nothing cleared |
| A local session of that name | captures that local session's screen | deletes that local session's history |

The second row is a person losing a local session's scrollback by using a menu item on a remote
session. I did not drive it in the app, so it is listed under what is not measured.

## Question by question

### Does a read only path exist that needs no key

Yes, and it is already in production. The ledger holds 12 verbs. One is `unsafe`. Three verbs are
named as permanently refused in `VERBS_THIS_RUNG_REFUSES`.

| Verb | Class | Repeat | On the ledger |
| --- | --- | --- | --- |
| `capture-pane` | read | safe | yes, added by Phase 72 |
| `display-message` | read | safe | yes |
| `show-options` | read | safe | yes |
| `show-environment` | read | safe | yes |
| `list-sessions` | read | safe | yes |
| `send-keys` | mutating | unsafe, guarded | yes, added by Phase 89 |
| `copy-mode` | would be mutating | see below | no |
| `attach-session` | refused forever | n/a | no |
| `kill-server` | refused | n/a | no |
| `respawn-pane` | refused | n/a | no |

`assertRemoteVerbAllowed` reads only the verbs, which `remoteVerbsOf` collects as the first argument
and the first argument after each bare `;`. Flags are not inspected. So `-S -<n>` and `-E <n>` on a
`capture-pane` are already allowed, and `remoteCaptureArgs` already sends `-S`.

The five rules Phase 89's door enforces, read from `sendArmedResumeText` and its constants in
`src/main/machines/exec-plane.ts`, are:

1. The target must match `IMMUTABLE_TARGET`, being `^\$\d+$`.
2. The text must not be empty.
3. The text must be at most `ARMED_TEXT_MAX_CHARS`, being 1000.
4. The text must carry no newline, no carriage return and no other control character.
5. The argv is composed by `composeArmedResumeArgv` and is exactly five elements, being `send-keys`,
   `-t`, the target, `-l`, the text.

Rule 5 is the one that ends the scrollback question. A scroll command is `send-keys -t <id> -X -N
<count> scroll-up` or `send-keys -t <id> -X goto-line <n>`, which is six or seven elements and
carries a command name rather than literal text. `ARMED_RESUME_GUARD` is a module private constant
and `execOn` passes no guard, so no other module can send the verb at all.

### What it costs to pull one screen, and to pull a large history

Two measurements, taken separately, because I did not run `capture-pane` on the Mac Pro's own tmux
server. The safety brief for this investigation limits me to a read only `list-sessions` there, and
I obeyed it.

**Measurement A, the tmux side.** This Mac, Apple M4 Pro, tmux 3.6a, my own scratch socket, one
200 by 50 pane holding 24,953 lines of synthetic agent-like output at 168 bytes per line. Three runs
per row, all three identical to the printed precision. The socket was created and killed by this
run and the operator's `-L gmux` server was never contacted.

| Lines asked for | Bytes returned | `capture-pane -p -e -J -S -n` wall time |
| --- | --- | --- |
| 50 | 16,641 | under 0.01 s |
| 250 | 50,241 | under 0.01 s |
| 1,000 | 176,241 | under 0.01 s |
| 2,000 | 344,241 | 0.01 s |
| 10,000 | 1,688,241 | 0.05 s |
| 25,000 | 4,200,243 | 0.13 s |

**Measurement B, the link.** Against `gregs-mac-pro.tail2ddfe1.ts.net`, Apple M2 Ultra, macOS
15.7.7, tmux 3.7c. Tailscale reports the path as direct to `10.0.0.149:41641` and
`tailscale ping` answered in 6 ms, so this is the same LAN and it is the best case rather than a
typical one. The connection was multiplexed with the same `ControlMaster` and `ControlPersist`
shape `src/main/machines/ssh.ts` composes. Nine samples per row, one ssh invocation each, payload
generated far side by `head -c <n> /dev/zero | tr` so nothing was written on either machine.

| Payload | min | median | max |
| --- | --- | --- | --- |
| none, `true` | 0.05 s | 0.07 s | 0.36 s |
| 16,641 bytes | 0.10 s | 0.19 s | 1.30 s |
| 344,241 bytes | 0.21 s | 0.40 s | 0.70 s |
| 1,688,241 bytes | 0.15 s | 0.70 s | 1.29 s |
| 4,200,243 bytes | 0.36 s | 1.22 s | 1.45 s |

Those figures include the far side generating the bytes, which cost a median of 0.20 s to 0.43 s
measured on its own. Raw throughput over the same link, measured with a 52,428,800 byte transfer
five times, was a median of 4.11 s against 0.41 s for the same command discarding its output, which
is 13.5 MB per second. The best of the five was 20.4 MB per second.

**The two put together.** A `capture-pane` of a remote session replaces the far side generator with
the tmux times in measurement A, so the expected cost is one round trip plus tmux time plus
transfer time.

| What the person asks for | Bytes | Round trip | tmux | Transfer at 13.5 MB/s | Total |
| --- | --- | --- | --- | --- | --- |
| One screen, 50 rows | 16,641 | 0.07 s | 0.00 s | 0.00 s | about 0.07 s |
| 2,000 lines | 344,241 | 0.07 s | 0.01 s | 0.03 s | about 0.11 s |
| 10,000 lines, today's saved depth | 1,688,241 | 0.07 s | 0.05 s | 0.13 s | about 0.25 s |
| 25,000 lines, the deepest a capsule may hold | 4,200,243 | 0.07 s | 0.13 s | 0.31 s | about 0.51 s |

Half a second for the deepest read a person can ask for, on this link. That is a fine cost for a
menu item a person presses. It is not a fine cost for a wheel notch.

### The depth that is actually there to read

A remote session's history is as deep as a local one. `ensureRemoteServer` in
`src/main/machines/remote-server.ts` writes every row of `remoteBootOptions()` from
`src/main/tmux/server-options.ts`, and `history-limit` is the row whose value comes from Settings
through `runtimeValueOf`. `DEFAULT_SCROLLBACK_LINES` in `src/shared/settings.ts` is 25,000. The
remote server is started with `-f /dev/null`, so without that write it would sit on tmux's own
default of 2,000, which the module header names as 8 percent of the promised depth.

What a capsule keeps is a different and smaller number. `savedSnapshotLines` in
`src/main/restore/snapshots.ts` reads `savedScrollbackLines`, whose default is 10,000 and whose
ceiling is `MAX_SAVED_SCROLLBACK_LINES`, being 25,000. At 25,000 lines and 168 bytes per line the
answer is 4.2 MB, well inside `MAX_BUFFER_BYTES` in `src/main/machines/exec-plane.ts`, which is
64 MB, and inside `REMOTE_CAPSULE_TIMEOUT_MS`, which is 30,000 ms.

### Why a real scrollback is refused, stated as the four things it would take

| What it needs | Where it stands today | What it would cost |
| --- | --- | --- |
| `copy-mode -e -t <id>` | not on the ledger | a new mutating row, and a repeat argument, being that entering copy-mode twice leaves one copy-mode, which is true |
| `send-keys -X goto-line <n>` | blocked by the five element argv | a second guarded door with a different argv shape, and the guard token stops being about one thing |
| `send-keys -X -N <n> scroll-up` | same | it is genuinely not safe to run twice, because two sends scroll twice as far |
| `send-keys -X cancel` | same | safe to repeat, same door problem |
| 16 ms per wheel notch | 70 ms median through the exec plane | a new long lived carriage, see below |

Two of those deserve a sentence each rather than a table cell.

`goto-line` is the one scroll verb that passes the repeat test. `src/main/tmux/scroll.ts` records
that it is an absolute seek, that tmux assigns `data->oy = lineno` and redraws, and that it clamps
server side. Running it twice with the same number leaves the pane in the same place. So an honest
ledger row for it could be written. It still arrives as `send-keys -X`, so it still needs the door
that Phase 89 deliberately made narrow.

The far side is already configured for copy-mode to be invisible. `SERVER_OPTIONS` in
`src/main/tmux/server-options.ts` includes `copy-mode-position-format` set to the empty string and
`mode-style` set to `noattr,bg=default,fg=default`, and `remoteBootOptions()` returns every row, so
a remote server that Tortie prepared would not paint tmux's amber position box. The blockage is
entirely the door and the latency, not the far side's appearance.

### The latency question, measured rather than assumed

I measured three carriages to the same machine.

| Carriage | What it is | Median round trip | Worst in the run |
| --- | --- | --- | --- |
| Local control client | the long lived `tmux -C` on this Mac | about 1 ms, from the header of `src/main/tmux/scroll.ts` | not measured this session |
| Remote exec plane | one ssh process per command over a reused connection | 0.07 s, n=9 | 0.36 s |
| A persistent ssh pipe | one ssh running `cat`, 40 round trips per run, 5 runs | 0.0061 s to 0.0073 s | 0.097 s |

The third row is the interesting one and it is also the one that should not be built. A persistent
pipe to the Mac Pro answers in about 6.5 ms, which is inside the 16 ms wheel budget on this LAN. The
product already keeps such a pipe per machine, in `src/main/machines/control-plane.ts`. But that
module exports no way to send a command. Its exports are the link facts, the sink, the open and
close functions and the transport builder. Nothing else in the process can put a command on it.
That is worth preserving rather than opening, because the header of
`src/main/machines/exec-plane.ts` says plainly that the control plane is a different carriage and
that nothing it sends passes through the ledger. Putting a scroll protocol on it would move the
first interactive write path in the product onto the one carriage with no verb gate.

A last point about the pipe number. 6.5 ms is a machine on the same LAN with a direct Tailscale
path. A machine over the internet, or one that a relay is carrying, is not this number and I did
not measure one.

### What the smaller affordance is, concretely

It is one menu item and one panel, and both already exist in some form.

| Piece | Exists | What the phase does |
| --- | --- | --- |
| The read | `remoteCaptureArgs` plus `execOn` | nothing |
| The on demand trigger | `captureRemoteSessionNow` | call it from a menu item instead of only from the End path |
| Storage | `storeCapsuleText`, with `skipIfIdentical` | nothing |
| The panel | `SavedOutputPanel` in `src/renderer/app/SavedOutputModal.tsx` | nothing, it already draws the capture time as its first line |
| The menu item | `savedOutputItem` in `src/renderer/app/session-actions.tsx` | for a remote row, read the screen first and then open the panel |
| The wrong two items | `terminalMenuItems` | withhold the capture presets and Clear on a remote session, or route them at the right machine |

Two things the phase would need to decide rather than inherit.

The panel strips colour. `readSavedOutput` in `src/main/restore/snapshots.ts` applies `stripAnsi`
and `stripControls` on the way out, and its own comment says the bytes on disk keep their colour.
A person reading an agent's last thousand lines loses the colour that separates a diff from prose.
The renderer already owns a path that keeps it, being the off screen `Terminal` in
`src/renderer/terminal/capture/index.ts`, so the phase can either accept plain text or reuse that
path. I recommend accepting plain text for the first cut and saying so, because the panel is a
reader rather than a terminal and the colour path pulls in the rasterizer.

The staleness line stops being the point. Today the panel's first line says when the copy was taken
because the copy can be two minutes old. A copy taken by pressing the item is seconds old. The line
should stay, because the same item opens an old copy when the machine is not answering, and that is
the case the line was written for.

## What is not true, and what I did not measure

- **I did not run `capture-pane` on the operator's Mac Pro.** His `-L gmux` server there held 3
  sessions before this investigation and 3 after, read with `list-sessions -F '#{session_id}'`,
  which is the only command I sent to it. Every timing in measurement A is this Mac's tmux 3.6a on
  an M4 Pro. His machine runs tmux 3.7c on an M2 Ultra. To measure the real thing, run
  `capture-pane -p -e -J -t <id> -S -10000` against one of his sessions and time it. It writes
  nothing.
- **168 bytes per line is my synthetic content, not real agent output.** Truecolour output from a
  coding agent can be several times that, so every byte figure above is a floor. To measure it, take
  one `capture-pane -p -e -J` of a live claude session and divide the byte count by the line count.
- **Every link number is a LAN best case.** The path was direct at 6 ms. A relayed path or a machine
  on another network is not this. To measure it, run the same payload ladder with the far machine
  off the LAN, and record whether Tailscale reports the path as direct or relayed.
- **I did not drive the two broken menu items in the app.** The reasoning above is read from
  `terminalMenuItems`, `hasLiveTerminal`, `capturePaneText`, `resolvePaneTarget` and the two dedupe
  call sites. To prove it, create a local session and a remote session with the same display name,
  press Capture Last 250 Lines on the remote one, and read what lands on the clipboard.
- **I did not test whether a keystroke reaches the far tmux client.** The remote attach in
  `src/main/attach/attach-plan.ts` is a real terminal running a real tmux client, that client is
  started with `-f /dev/null`, and `resources/gmux-tmux.conf` does not remap the prefix, so tmux's
  default `C-b` should still open copy-mode with `[`. If that is true then a person can already
  scroll a remote session by hand, and the gap is a Tortie affordance rather than a capability. To
  measure it, open a remote session, press `C-b` then `[`, then the up arrow, and read a screenshot.
  Note that the UI rules forbid ever telling a person to do this.
- **The 1 ms figure for the local control client is quoted from the header of
  `src/main/tmux/scroll.ts`, not remeasured this session.** Everything else in this document was run
  today.
- **I did not measure what an open scroll poll would cost the fleet.** `LIVE_POLL_MS` is 1000 and
  `SCROLLED_POLL_MS` is 250 in `src/renderer/terminal/scroll/surface.ts`. One visible remote session
  polling at 1 Hz through the exec plane is one ssh process per second. To measure it, count the ssh
  processes and the far side load with several remote tabs open.

## Files and symbols this document relied on

| Path | Symbols read |
| --- | --- |
| `src/main/machines/exec-plane.ts` | `REMOTE_VERB_LEDGER`, `VERBS_THIS_RUNG_REFUSES`, `ARMED_RESUME_GUARD`, `composeArmedResumeArgv`, `assertRemoteVerbAllowed`, `remoteVerbsOf`, `MAX_BUFFER_BYTES`, `ARMED_TEXT_MAX_CHARS`, `IMMUTABLE_TARGET`, `REPEAT_UNSAFE` |
| `src/main/machines/remote-capsule.ts` | `remoteCaptureArgs`, `captureRemoteSessionNow`, `REMOTE_CAPSULE_CADENCE_MS`, `REMOTE_CAPSULE_PER_PASS`, `REMOTE_CAPSULE_TIMEOUT_MS` |
| `src/main/machines/control-plane.ts` | its export list, `remoteControlTransport`, `openControlPlane` |
| `src/main/machines/ssh.ts` | `SSH_CONTROL_PERSIST_SECONDS`, `sshOptions` |
| `src/main/machines/carriage.ts` | `PINNED_SSH_PATH`, `SSH_BATCH_MODE_STEADY`, `SSH_CONNECT_TIMEOUT_SECONDS` |
| `src/main/machines/remote-server.ts` | `remoteBootArgs`, `ensureRemoteServer` |
| `src/main/machines/remote-sessions.ts` | `createRemoteSession`, `takenNames` |
| `src/main/attach/attach-plan.ts` | the local and remote attach shapes |
| `src/main/tmux/scroll.ts` | `scrollPaneBy`, `scrollPaneTo`, `exitPaneScroll`, `STATE_FORMAT` |
| `src/main/tmux/sessions.ts` | `resolvePaneTarget`, `capturePane`, `createSession` |
| `src/main/tmux/server-options.ts` | `SERVER_OPTIONS`, `remoteBootOptions`, `runtimeValueOf` |
| `src/main/tmux/names.ts` | `dedupeSessionName`, `sanitizeSessionName`, `formatSessionTarget` |
| `src/main/tmux/version.ts` | `decideRemoteControlGate`, `TESTED_REMOTE_TMUX_VERSIONS` |
| `src/main/sessions/core.ts` | `scrollTarget`, `scrollState`, `scrollBy`, `scrollTo`, `scrollLive`, `runScrollCommand` |
| `src/main/capture/service.ts` | `capturePaneText`, `clearHistory` |
| `src/main/capture/ipc.ts` | `registerCaptureIpc` |
| `src/main/restore/snapshots.ts` | `savedSnapshotLines`, `storeCapsuleText`, `readSavedOutput` |
| `src/main/scrollback/service.ts` | the module header, for the pull only rule |
| `src/shared/settings.ts` | `DEFAULT_SCROLLBACK_LINES`, `MAX_SCROLLBACK_LINES`, `DEFAULT_SAVED_SCROLLBACK_LINES`, `MAX_SAVED_SCROLLBACK_LINES` |
| `src/renderer/terminal/terminal-menu.ts` | `terminalMenuItems`, `canCapture` |
| `src/renderer/terminal/capture/index.ts` | `hasLiveTerminal`, `captureHistory`, `CAPTURE_PRESETS`, `MAX_CAPTURE_ROWS` |
| `src/renderer/terminal/scroll/surface.ts` | `LIVE_POLL_MS`, `SCROLLED_POLL_MS`, `WHEEL_COALESCE_MS`, `ScrollSurface.enqueue` |
| `src/renderer/terminal/TerminalPane.tsx` | the `ScrollSurface` construction and `attachCustomWheelEventHandler` |
| `src/renderer/app/session-actions.tsx` | `savedOutputItem` |
| `src/renderer/app/SavedOutputModal.tsx` | `SavedOutputPanel` |
| `resources/gmux-tmux.conf` | the whole file, for the prefix and the copy-mode chrome |
| `docs/BACKLOG.md` | the Phase 95 and Phase 89 entries |
