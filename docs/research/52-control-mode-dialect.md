# Research 52. What tmux control mode sends over a connection

Measured 2026-08-17 by `build/probe-control-dialect.mjs`, run twice with the same
answer both times. This note is the evidence behind `measured.control` in
`src/main/tmux/version.ts`. Nothing here was read from documentation.

---

## 0. The answer

Both versions Tortie has measured for the exec plane also match on the control
plane. Their streams over a real connection are the same bytes a local control
child of the same version prints, on every one of the eight comparable steps.

| Version | Where the program was | Steps 1 to 9 | `measured.control` |
| --- | --- | --- | --- |
| 3.6a | `/opt/homebrew/bin/tmux`, the tmux this Mac runs | 8 of 8 matched | true |
| 3.7b | `build/vendor/tmux/bin/tmux`, the copy Tortie ships | 8 of 8 matched | true |

Two numbers decide the carriage and both are measured rather than chosen:

- `-u` changes not one byte of the control stream, so it is NOT on this
  carriage. The attach carriage still carries it.
- The keepalive pair `(ServerAliveInterval=5, ServerAliveCountMax=3)` ends a
  control child 0.1 s after the far side is killed and 19.0 s to 19.5 s after the
  far side is frozen.

---

## 1. How it was measured

One scratch sshd on 127.0.0.1 on a high port, with keys generated in the run's
own directory. The far side is this same Mac, so the probe refuses to start when
the socket it would use is `gmux`, asserts the scratch socket on every remote
argv, and reads the operator's own server before and after. On both runs that
server held 28 sessions with `history-limit` 25000 and `exit-empty off` before,
and the same three after.

For each version the probe opens two children of the SAME program and compares
them:

```
  local     <program> -L <scratch> -f /dev/null -C new-session -A -s gmux-control
  remote    ssh <nine carriage options> 127.0.0.1
              '<program> -L <scratch> -f /dev/null -C new-session -A -s gmux-control'
```

The remote line is the CONTROL row of research 51 section 4.1 with one flag more,
being `-f /dev/null`. That flag is on every remote command because
`remoteTmuxArgv` puts it there, and `-C new-session` can create a server, so
without it a server born here would read the other machine's own configuration
file. Phase 70 recorded the same one flag for the ATTACH row.

**What "byte for byte" means.** Two servers cannot print the same epoch second,
the same session id or the same window id, so those three are replaced by
placeholders before the comparison. Everything else, including every word, every
space and the order of every argument, is compared exactly.

---

## 2. The eleven steps

| Step | What was measured | 3.6a | 3.7b |
| --- | --- | --- | --- |
| 1 | The greeting, local child against remote child | identical, 5 lines | identical, 5 lines |
| 2 | `refresh-client -f no-output` and the block it returns | identical, 2 lines | identical, 2 lines |
| 3 | The `%begin`/`%end` guard shape and its numbers | same word and same flag on every guard | the same |
| 4 | `%sessions-changed` on a create, a kill and a rename | same parsed notifications as local | the same |
| 5 | `%session-renamed` and its argument order | identical to local | identical to local |
| 6 | `%window-*` and `%session-changed` traffic | same parsed notifications as local | the same |
| 7 | `%exit` and its reason when the far side's server is killed | `%exit` with no reason, 51 ms after the kill | `%exit` with no reason, 38 ms after |
| 8 | Whether `-u` changes any byte | 106 bytes with it and without it, identical | not asked again, see below |
| 9 | One `list-sessions -F <REMOTE_LIST_FORMAT>` over control against the same over exec | 117 bytes each, BYTE EQUAL | 117 bytes each, BYTE EQUAL |
| 10 | Time from a killed far side to the control child exiting | 0.1 s | not asked again |
| 11 | Time from a frozen far side to the control child exiting | 19.1 s and 19.5 s on two runs | not asked again |

Steps 8, 10 and 11 are asked of one version, because they measure the CARRIAGE
rather than the program. The carriage is one ssh client on this Mac and it does
not change with the tmux on the other end.

### 2.1 The exact bytes, step 1

The greeting is FIVE lines, not the guard pair the control client's own comment
implied. Local and remote, on both versions:

```
%begin <epoch> 275 0
%end <epoch> 275 0
%window-add @0
%sessions-changed
%session-changed $0 gmux-control
```

The three notifications arrive AFTER the block closes, so `closeBlock` still sees
the guard pair first and the `connected` event still fires at the right moment.
The client needed no change for this, and the finding is written down because the
comment above it used to say something narrower.

### 2.2 The exact bytes, step 3

```
%begin 1786998987 275 0
%end 1786998987 275 0
```

Three numbers on each guard, being the epoch second, the command number and the
flags. The command number of the greeting was 275 on 3.6a and 283 on 3.7b, and
both sides of a version printed the same one. `GUARD_RE` in
`src/main/tmux/control-parser.ts` requires exactly three numbers and no version
here printed a fourth, so the parser needed no widening.

### 2.3 The exact bytes, step 7

```
%exit
```

No reason string, on either version, on either side, when the far side's server
is killed. The client's `handleDisconnect` already treats a missing reason as
`undefined`, so this is measured agreement rather than a change.

### 2.4 The notifications with no named arm

Six notification names arrived that `control-parser.ts` has no named arm for, so
each one lands in its `other-notification` arm:

```
%window-add  %unlinked-window-add  %unlinked-window-renamed  %unlinked-window-close
```

plus the two guard words. None of them carries a fact the feed reads. They are
listed so a later reader knows the arm is exercised in production rather than
only in a unit test.

### 2.5 Step 8, the `-u` question, asked twice

The first run of the probe answered DIFFERENT, at 106 bytes without the flag and
73 bytes with it. That was a defect in the probe rather than a fact about tmux:
both children used one socket, so the second one's `new-session -A` ATTACHED to
the session the first had made and its greeting was the three notification lines
shorter. With one server per child the two streams are 106 bytes each and
identical.

So `-u` is not on the control carriage. It IS on the attach carriage, where it
decides whether a pane gets ASCII substitutes for its glyphs (Bug C, Phase 9.2).
The two planes differ, and the difference is measured rather than assumed.

---

## 3. What the probe had to fix about itself, and why it is recorded

Two of its own defects made the first run report dialect differences that were
not there. Both are written down because a later reader will otherwise see a
green table and not know what it cost.

| Defect | What it looked like | What it was |
| --- | --- | --- |
| `-t =name` sent unquoted | Steps 4, 5 and 6 came back DIFFERENT, with the remote side sending no `%session-renamed` at all | zsh's EQUALS expansion rewrote a word beginning with `=` into a program lookup on the far side, so the rename and the new window never reached tmux. This is the same finding `quoteTarget` in `src/main/attach/attach-plan.ts` records, and this is the second place it has bitten |
| One socket for both `-u` children | Step 8 came back DIFFERENT by 33 bytes | The second child attached instead of creating, so its greeting was shorter |

A third thing changed on purpose. Steps 4 and 6 compare only the notifications
the parser has a named arm for. The unparsed ones carry a window name, which is
whatever the shell in that window was running at that instant, and it was `tmux`
on one side and `kernel_task` on the other. Comparing those would have reported a
race as a dialect difference.

---

## 4. What this measurement does NOT say

- **The operator's four machines were not contacted.** Their tmux versions are
  unknown for both planes and every one of them is refused today. A version joins
  either list only after a measurement he attends.
- **The far side was this Mac, over loopback.** There is no packet loss, no
  roaming and no tailnet in any number above. Research 51 section 7 questions 3
  and 7 stay open.
- **Both sides ran macOS.** No Linux tmux was opened in control mode by this
  probe, so a distro build's stream is unmeasured whatever version it reports.
- **The copy inside an installed `Tortie.app` was not read.** The 3.7b measured
  here is the one `npm run vendor:tmux` built into the working tree.
- **Step 11 measures a frozen far side, not a sleeping machine.** A stopped
  process reproduces the hung pipe exactly and says nothing about what a laptop
  closing its lid does to a live connection.
- **No version was measured whose stream differs.** Every row on the tested list
  matched, so the branch that keeps a version on the timer feed has no member
  today. It is driven by unit test and by `assertControlDialectMeasured`, which
  is the same posture `machine.repeat-unsafe` has carried since Phase 69.

---

## 5. The partition harness, and the four measurements its fix round produced

The first build of `npm run smoke:partition` failed 4 of its 5 cases on two
clean-shell runs, and the two runs after that passed with a number on every row.
Nothing about the product's control mode changed between them. What changed was
the harness, and the four measurements below are why. They are recorded here
because a later reader who sees a green gate will otherwise not know what it
rests on.

| # | What was measured | Number |
| --- | --- | --- |
| 1 | `ps -o pid=,ppid=` with no `-ax` lists only the caller's own terminal processes, so the sshd's forked children are absent and a kill ends the listener alone | the control child was still alive 120 s after the "cut"; with `-ax` on the same kill it ended in 0.0 s |
| 2 | The wait for a cut link and the measurement of it asked two different questions. The wait polled the live rows every 100 ms and the measurement read a sample list written every 250 ms | `toUnknownMs` came back null on runs whose raw samples plainly held the all-unknown rows |
| 3 | A machine and this Mac share one tmux server when they share `TMUX_TMPDIR`, because the app composes the same socket NAME for both, correctly | the one local session was listed back as a remote row, so the local set was empty and the isolation invariant ran over 0 rows |
| 4 | A unix socket path on macOS is capped at 104 bytes, and a run root under the folder `tmpdir()` reports is 66 characters before anything is added | the first isolated run composed a 121 character socket path and tmux answered "File name too long" to every command |

### 5.1 What the fixed gate now measures

Run of 2026-08-17, two machines, both on 127.0.0.1 with their own sshd and their
own `TMUX_TMPDIR`. Machine `one` is cut in every case. Machine `two` is never
touched.

| Case | rows on the cut machine | rows on the other machine | rows on this Mac | first all-unknown sample after the kill |
| --- | --- | --- | --- | --- |
| `partition.control-idle` | 1 | 1 | 1 | 206 ms |
| `partition.during-list` | 1 | 1 | 1 | 223 ms |
| `partition.during-create` | 2 | 1 | 1 | 17 ms |
| `partition.during-attach` | 2 | 1 | 1 | 186 ms |
| `partition.recovery` | 2 | 1 | 1 | rows came back 472 ms after the link returned, with no restart of Tortie |

No row on the cut machine ever read `restorable` or `exited` while the link was
down. No row on the other machine changed status at all in any case. No row on
this Mac changed status at all in any case. Restore was refused for every remote
row in every case. The ssh child count was 0 before and 0 after one partition and
one recovery. The operator's own server held 28 sessions before and after, with
`history-limit` and `exit-empty` unchanged.

The gate also measures that the timer is gone once a connection is up, which
until this round rested on an armed-timer unit test and on reading the code. The
instrument is `snapshotAt`, stamped before every list a machine's feed issues.
With the connection up and nothing at all happening on that machine:

| Window | Lists the feed issued | Readings where a timer was armed | Lists the Phase 70 cadence would have issued |
| --- | --- | --- | --- |
| 20,000 ms | 0 | 0 of 80 | 4 |

A zero in any of the three row columns is now a FAILURE rather than a pass. The
first build printed a reassuring `0` in the local column and a reader would have
taken it for zero changes when it meant zero rows watched.

### 5.2 The one probe shape that changed in the product

`show-environment -t <$id> GMUX_SESSION_ID` exits 1 with `unknown variable:
GMUX_SESSION_ID` for a session that is not ours, which is the ordinary case. The
exec plane turns a non zero exit into a thrown error, and an error is not
distinguishable from a machine that did not answer, so the memo that settles a
foreign session was never written. MEASURED live: four list passes produced four
identical probes of the same `$0`, plus a warning line each. On a control plane
machine a list runs per `%sessions-changed`, so an active machine with foreign
sessions had an unbounded probe rate.

MEASURED on tmux 3.6a, 2026-08-17, on a scratch socket:

```
show-environment -t $0 GMUX_SESSION_ID    exit 1   unknown variable: GMUX_SESSION_ID
show-environment -t $0                    exit 0   9 lines, none of them ours
show-environment -t $1                    exit 0   GMUX_SESSION_ID=abc123
```

So the variable is no longer named on the line. tmux gives one answer with one
exit code for both cases, an answer is an answer, and one probe settles one
session for the life of that server generation.

### 5.3 What section 5 still does not say

- **Two machines on one Mac are not two machines.** Both scratch machines share
  this Mac's CPU, its clock and its loopback interface. The isolation measured
  above is Tortie's own per machine reconcile, not a network partition between
  two computers.
- **None of the operator's four machines was contacted.** Research 51 section 7
  questions 3 and 7 stay open exactly as section 4 says.
- **The quiet window is 20 s, not 60 s.** The poll-gone table above covers twenty
  seconds on one idle machine. A machine that is busy, or one whose connection
  drops and comes back inside a longer window, is not in that number.
- **The rescue's probe rate was fixed, not bounded.** One probe now settles one
  session for the life of a server generation, and a generation changes when the
  far side's server is born again. A machine whose server restarts repeatedly
  pays one probe per foreign session per restart, and nothing measures that.
