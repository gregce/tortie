# 135. The reply door: one tap on a numbered choice, and one message, from the phone

Phase 318's research. Written 2026-09-30 against the tree at `2abdea43` ("docs(backlog): alerts, End and Reply
join the release"). **No model turn was spent and no token was used.** What ran was the real installed Claude Code
2.1.285 and Codex 0.159.1, only under a scratch `HOME`, `CLAUDE_CONFIG_DIR` and `CODEX_HOME`, with made-up keys and
local stand-ins for the Anthropic Messages API and the OpenAI Responses API on `127.0.0.1`. No request left
loopback. Codex ran with `--no-daemon`, so it never reached his running app-server. A `security` stub first on
`PATH` refused every keychain lookup (21 in investigator A's runs, 27 in the adversary's), and each lookup named
only a scratch-scoped item. Gemini, Qwen, Antigravity and Grok were never started; Gemini's and Qwen's selection
code was read from their installed bundles only. No Electron and no Simulator was started, nothing was installed,
and nothing in `/Users/gdc/gmux` or in the worktree was written, committed, staged or stashed.

Every tmux server ran on its own scratch socket (`p318-a`, `p318-b-*`, `p318-c`, `p318-c-37b`, `p318-adv-*`,
`p318-judge-*`), under a copy of `resources/gmux-tmux.conf`, with the vendored tmux 3.7b and Homebrew's 3.6a. Every
server was killed and its socket file removed, and every process a run started was ended by pid. His `-L gmux`
server and his default tmux server were never touched. **One disclosure:** investigator B ran `claude --version` and
`codex --version` once under his real `HOME` to read the versions. His keychain, credentials, APNs key and
conversation stores were never read.

**The round.** Three investigators each owned a question: A, the numbered choice; B, the typed message and the
own-words rule; C, the door's first write route. Two adversaries attacked all three reports before a word of this
was written: one attacked the whole design with live arms of its own, and one attacked it for security. A judge
ruled on every disagreement and re-measured the ruled delivery shapes on both tmux builds. §6 records what the
attack killed, so no later round re-derives it. The writer then re-read every line of the tree this document cites
and re-tallied the race logs; where a line number had moved, this document gives the one read at `2abdea43`.

This answers two things he said. Research 127 §11.2, in his words: *"May a phone I paired press the buttons the
agent drew — allow or deny, 1 or 2 — or only tell me? And may it ever type a line into a session?"* And on
2026-09-30 he put **"318 Reply"** into the release beside 316.5 and 317. The running log paraphrases that as
"answer a numbered choice with one tap, or type one message"; those are the log's words, not his.

The harnesses and raw results are under the session's scratchpad (`scratchpad/p318/{investigator-a,investigator-b,
investigator-c,adversary,security-adversary,judge}/`). They are not in the tree, and scratch does not survive a
reboot.

## 1. The answer first

1. **Build the reply on the door Phase 317 builds, as two more verbs.** Phase 317 adds End as the door's first write.
   Phase 318 adds `choose` and `say` to the same door, the same gate and the same write ledger. The code that
   presses a key lives outside `src/main/pocket` and is handed in, the way `PocketFacts` is today
   (`src/main/pocket/routes.ts:128-209`). That keeps the door's ban on `send-keys`, `killSession` and
   `noteUserInput` (`build/conformance-pocket.mjs:974-1000`) whole.
2. **A press sends one digit and never an Enter.** A digit alone commits the option on Claude Code's numbered
   permission prompt and on Codex's command approval. A digit followed by a separate Enter approved the next dialog,
   one nobody had seen, 8 times out of 8 once the gap passed about 200 ms (§2.3). A press is allowed only on a
   dialog shape that was measured and compiled, only for allow-once and deny, only when the question says what will
   run, and only while the session's own agent holds the terminal.
3. **"The same question" is proved by an id that main mints, not by the screen.** No reading of the screen can
   tell two identical questions apart (§2.6). Main counts every hook, every keystroke from the Mac, every phone
   write and every tick that finds the choice gone. The phone echoes the count it was shown. At the press, main
   takes a fresh reading, checks the count with nothing awaited before the send, sends the digit, and reads back
   about 300 ms later. A press is never retried.
4. **A message is a bracketed paste, not `send-keys -l`.** The charter said `send-keys -l`, and that fails five
   measured ways (§3.1). The message goes into a tmux buffer on standard input, then one tmux command list pastes it
   and presses Enter. It is offered only for Claude Code and Codex, only at the agent's input row, only when that
   row is empty, and never on a row that needs input. It is 1 to 4,096 bytes, and control characters are refused.
5. **A write answer that follows the act always says what happened.** Today two shipping paths replace an answer
   with 404 after the handler has acted (§4.2). For a write, every 404 is produced before the act, and after the
   act the phone always gets 200 with the outcome and the owner's own sentence. A write id inside the signed body
   makes each write happen at most once.
6. **The phone is his own input.** A press that the read-back shows was taken releases `needs_input` through
   `noteUserInput`, the desk's own funnel. Phase 325's entry is amended to name the phone writer as the second
   writer its gate must see.
7. **Face ID is the phone's own check, and the Mac cannot verify it.** The default puts every write behind it, the
   same prompt as End. That is his to decide (§12).

What else the round found:

- **The numbered verdict is not gated on who holds the terminal.** A shell, `cat` or an npm postinstall can print
  a screen Tortie reads as a choice with two options (§2.8). The door already shows such a choice; a press would
  type into whatever printed it. The press asks the foreground itself.
- **A failed tmux command carries its whole argv in its error message**, and existing code logs that message. A
  reply built like `typeIntoPane` would put his words in `app.log` (§4.8).
- **Resizing the pane while a Claude permission dialog waits moves the choice mark**, and the monitor then clears
  Phase 311's hook question (§9).
- **`typeIntoPane` passes its text to `send-keys -l` with no `--`**, so a composed command ending in `;` or
  starting with `-` would be changed by tmux (§9).
- **Codex's trust gate is not read at all** (§9).

## 2. The choice

### 2.1 What the phone can see today

The door's blocked row carries `optionsOf(activity.choice)` and nothing else about the choice
(`src/main/pocket/routes.ts:234-237`, used at `:275`). The option is a marker and its text
(`src/shared/ipc/sessions.ts:271-281`); the cursor glyph is dropped. The phone draws the options unpressable under
"Answer this in the session." (`ios/Tortie/Style/Copy.swift:131-132`, the Mac's `CHOICE_NOT_PRESSABLE` at
`src/renderer/choice.ts:57`).

Investigator A ran the shipping `detectDialogRows` and `detectShapes` (`src/main/activity/screen.ts:291`, `:655`)
over the 22 committed fixtures and the 19 question windows in `build/fixtures/questions/*.jsonl`
(`investigator-a/rows-matrix.out`). Six drawn dialogs put options on the channel: Claude's numbered permission
prompt, Claude's older numbered trust gate, Codex's sign-in list, Codex's update prompt, Gemini's trust gate and
Antigravity's run permission. Qwen's confirmation and Claude's 2.1.280+ trust gate raise `needs_input` through the
Phase 321 shapes but carry no options.

### 2.2 Which keys select option N, per dialog

The rule is per measured dialog shape, never per agent, because one agent's dialogs disagree (Codex's trust gate
below). "Live" means driven on the real agent under a scratch `HOME` with 0 model turns.

| Agent and dialog | Options on the channel | What selects option N | Evidence | In Phase 318 |
| --- | --- | --- | --- | --- |
| Claude Code 2.1.285, numbered permission prompt (Bash) | Yes: 1 Yes; 2 "Yes, and don't ask again for: `ln *`" (or "always allow access to `<dir>`"); 3 "Yes, and switch to auto mode"; 4 No | The digit alone commits, and the dialog leaves in 19 ms. A digit with no option behind it is ignored. Esc interrupts. A digit 0 to 100 ms after the dialog is first drawn is dropped (8 of 8); from about 200 ms it is taken (4 of 4) | Live: `investigator-a/logs/claude-run3.jsonl` T1, T5, T7, T9; `firstsight.jsonl`; captures `caps/c3-x1-prompt.txt`, `c4-70-t7-prompt.txt` | 1 and 4 pressable. 2 and 3 widen what the agent may do for the rest of the session and are unpressable by default |
| Claude Code, Edit and Write prompts | The committed fixture (an older build) reads 1 Yes; 2 "Yes, allow all edits during this session"; 3 No | Not driven on 2.1.285 | UNMEASURED | Pressable only if the build measures them over its stand-in |
| Claude Code 2.1.280+, trust gate | None (the `claude-trust-gate` shape, `atChoice` false) | Digits and text are ignored. Enter commits the focused default, "No, exit", and the agent ended (`dead=1 status=1`) | Live: `caps/c1-trust-after-text.txt` | Never pressable, and no message box, because Enter there ends the session |
| Claude Code, older numbered trust gate | Yes (fixture) | Not installed | UNMEASURED | Never pressable |
| Claude Code, theme picker | None | "3" alone committed Light mode | Live: `caps/c1-theme-after-3.txt` | Never |
| Claude Code, API-key list | None | Digits ignored; Up then Enter chose Yes | Live: `caps/c1-apikey-after-1.txt` | Never |
| Claude Code, first-run "Security notes" | Read as `atChoice` true with two options, but they are notes, not choices | "1" changed nothing; Enter continued | Live: `caps/c1-after-apikey-enter.txt`, `c1-notes-after-1.txt` | Never; a negative fixture |
| Claude Code, "Make auto mode your default permission mode?" | Not read as a choice | Enter answered Yes, and Claude wrote `defaultMode: auto` to its settings | Live: `investigator-b/claude-live.json` | Never; the message box's own check refuses it (§3.5) |
| Codex 0.159.1, command approval | Yes: 1 "Yes, proceed (y)"; 2 "Yes, and don't ask again for commands that start with `…` (p)"; 3 "No, and tell Codex what to do differently (esc)" | The digit alone commits, in 4 ms. "y" commits. Esc cancels | Live: `investigator-a/logs/codex-run2.jsonl` A, D, E; capture `caps/x1-c2-prompt.txt` | 1 and 3 pressable when the `$ …` command line is read into the question. 2 widens and is unpressable by default |
| Codex, sign-in list | Yes | "3" alone opened the API-key box | Live: `logs/codex-signin.jsonl` | Never |
| Codex, update prompt | Yes (window `a-codex-0002`) | Needs a network version check | UNMEASURED | Never |
| Codex, trust gate | Not read at all: its hint "enter continue · esc quit" misses `HINT` (`screen.ts:76-78`) | A digit only moves the focus; Enter commits | Live: `caps/x1-trust-after-down.txt`, `x1-trust-after-1.txt` | Never |
| Gemini 0.54.0, trust gate | Yes | From the bundle: a digit commits at once when no longer number can match (every list under 10 items), otherwise after a 1,000 ms timer | Source only: `chunk-2MRUXBJ5.js:74819` and `:75043-75093`; never run | Unpressable until measured |
| Qwen 0.22.0, confirmation | None (the `qwen-confirmation` shape) | The same component as Gemini | Source only: `chunk-YZBDKFRQ.js:7452`, `:7623-7680` | Unpressable |
| Antigravity, run permission | Yes, with question null ("Run this command?" misses `QUEST`) | Never launched | UNMEASURED | Unpressable |
| Cursor, OpenCode, Muse | None | — | Fixtures | Nothing to press |

### 2.3 Why a press never sends Enter after the digit

Investigator A swept the gap between a committing digit and a separate Enter on Claude with chained permission
dialogs (`investigator-a/logs/gap.jsonl`):

| Gap between the digit and the Enter | The next, unseen dialog approved |
| --- | --- |
| 7 to 108 ms (7 trials) | 0 of 7 |
| 208 to 812 ms (8 trials) | 8 of 8 |

With a 1.5 s gap the Enter ran `touch p318-t3-UNSEEN.txt` on Claude (`claude-run3.jsonl` T2) and
`touch p318-d3-UNSEEN.txt` on Codex (`codex-run2.jsonl` B). The adversary re-derived it at 405 and 406 ms, 2 of 2,
and not at 60 ms, 1 of 1 (`adversary/logs/claude-run.jsonl` C9).

That is the shape of `typeIntoPane(target, text, true)` (`src/main/restore/restore.ts:305-314`, two `execTmux`
calls) and of research 127's plan, "typed as one digit and Enter" (`docs/research/127-the-phone.md:664-665`).
Sending the digit and the carriage return in one tmux invocation arrived as one read (`32 0d`) and did not leak
into the next dialog on either agent (`investigator-a/drive-bytes.out`; `claude-run3.jsonl` T4; `codex-run2.jsonl`
C). That is 2 of 2 and not universal, and nothing measured needs it, so it is not used.

### 2.4 How fast a choice goes stale

After a committing digit the next dialog was drawn in 45 to 127 ms, and in 47 ms when two tool calls shared one
assistant message, with no model round trip at all (`claude-run3.jsonl`: 127, 61, 56 and 47 ms; `codex-run2.jsonl`:
61 and 45 ms). A phone that read a choice one second ago can be looking at a question that has already been
answered and replaced.

### 2.5 The race between the Mac and the phone

The adversary sent a phone "1" at a set delay after the Mac's own "1" (`adversary/logs/race.jsonl`, 36 trials).
The writer re-tallied the log:

| Delay after the Mac's press | Claude Code 2.1.285 | Codex 0.159.1 |
| --- | --- | --- |
| 0, 5 and 15 ms | Nothing approved, 0 of 6. The "1" stays in the input row as text | Nothing approved, 0 of 6 |
| 30 ms | Dropped, 0 of 2 approved | Nothing approved, 0 of 2 |
| 50, 80 and 120 ms | Dropped, 0 of 6 approved | The unseen next command approved, 6 of 6 |
| 200 and 400 ms | The unseen next command approved, 4 of 4 | Approved, 4 of 4 |

A rerun on Claude with unique file names (`race3.jsonl`, 8 trials at 0, 10, 20 and 40 ms) approved nothing, and
the unseen command had not run when the log was read again later (0 of 8). In 5 of the 8 the stray "1" was left in
the input row, and Claude held the next dialog back for about 1.5 s (`adversary/caps/race2-cl-0-1.txt`). The log
holds three lines per trial, so it has 23 lines for 8 trials; the writer counted the trial lines only. In one early run the harness's own next message landed on that
held-back dialog and approved six files, which is the hazard itself (§10).

So a check that reads the screen and then sends can shrink the race but cannot close it. A counter that the Mac's
own keystroke bumps in main's event loop can close it down to the time it takes to start one tmux process. That is
why §2.7 asks the build to measure the time from the last check to the byte landing, and to keep its 99th
percentile under 15 ms: in the sweep above, a phone digit that lands 0 to 15 ms after the Mac's approved nothing on
either agent.

### 2.6 No screen reading can say "the same question"

- **The monitor's choice mark.** `choiceMarkOf` hashes the question and the options
  (`src/main/activity/monitor.ts:1314-1317`), and an unchanged mark sends no update (`:1218`). Claude 2.1.285 no
  longer puts the command in any option, so six different commands shared the mark `108577871a59`, and three
  different `ln -s` commands shared `409056d8abaf` (`investigator-a/identity.mts`). The adversary read one mark,
  `6a7edd73a3ac`, across 8 different Claude dialogs (`adversary/identity2.mts`).
- **A hash of the whole 24-row window.** A saw it separate 9 of 9 different commands and hold still while one
  dialog waited. It did not separate two identical commands in A's run, and did separate three in the adversary's,
  because what had scrolled above the dialog differed (`adversary/caps/cl-C2-same-*.txt`). Whether it separates
  them is an accident.
- **Codex's mark.** It carries the command's prefix in option 2, so it differs per command, but two identical
  approvals gave `8c7c4702d739` twice (`adversary/logs/codex-run.jsonl` X7).
- **A resize moves the mark.** One waiting Claude dialog read `6a7edd73a3ac` at 160 columns, `8fa73039a01a` at 100
  and `6a7edd73a3ac` again at 160, because option 2 re-wrapped (`adversary/identity2.mts`).

Claude's `PermissionRequest` hook arrives once per dialog, 10 to 25 ms before the dialog is drawn, and carries no
per-question id (`investigator-a/logs/mock.jsonl`: 54 tool calls gave 54 hooks, and six identical calls gave six
byte-identical bodies). Its `PreToolUse` hook does carry `tool_use_id`, and arrives 6 to 11 ms before each
`PermissionRequest` (`adversary/logs/claude-run-summary.json`). Tortie registers `UserPromptSubmit`,
`PermissionRequest`, `PostToolUse`, `Stop` and `SessionEnd` only (`src/main/activity/hooks.ts:546-552`).

### 2.7 The identity main mints, and the press

**The id.** Each blocked row the door serves carries a question id and the choice mark. The question id is a random
prefix chosen once per process, then a counter per session, so a count from before a restart can never match one
after it. Main bumps the counter on:

- every hook event for the session, which includes every Claude `PermissionRequest`, one per dialog even for
  identical commands;
- every write the Mac's attach host receives for the session, in the same synchronous handler that writes it
  (`src/main/attach/attach-host.ts:279-288`, the place Phase 325 plans its own tap);
- every write the phone writer sends;
- every monitor tick that finds the choice gone or its mark moved.

The attach host's listener runs in main, in the same event loop as the press, so a desk keystroke either lands
before the press's last check and refuses it, or after the press has been sent.

**The press, in order:**

1. Take a fresh capture, never the tick's.
2. Require `needs_input`.
3. Require the session's own agent to hold the terminal (§2.8).
4. Require the same mark, the pressed marker among the fresh options and still pressable, and an unchanged
   question id.
5. With nothing awaited between the last check and the spawn, send one tmux command list:
   `copy-mode -q -t <$id> ; send-keys -t <$id> -l -- <digit>`. The digit comes from the fresh rows' own marker and
   must be 1 to 9. The `--` matters (§3.1).
6. Read back at about 300 ms. If the question is gone, the outcome is `answered`, and only then is `needs_input`
   released (§5). If the same window is still drawn, the outcome is `not taken, nothing was changed`, and the press
   is never retried.

Any mismatch at step 2 to 4 answers with Phase 317's `SESSION_CHANGED`, "This session changed. Nothing was done."
(`src/renderer/session-manager/copy.ts:635`).

The judge measured the press list on both builds with argv and no shell (`judge/shape.json`): it delivered the one
digit byte (`32`), and from copy mode it delivered `33` and left copy mode, on 3.6a and on 3.7b.

**What stays open, stated rather than hidden.** A stray digit can still be left in Claude's input row when the Mac
and the phone press within 15 ms of each other. Input typed from a tmux client outside Tortie never reaches the
attach host, so the counter cannot see it.

### 2.8 A choice that the agent did not draw

`inferredVerdict` reads the numbered verdict with no foreground check:
`const numbered = screen !== null && detectDialog(screen);` (`src/main/activity/state-machine.ts:366`). Only the
Phase 321 shapes ask `agentHoldsTerminal` (`:367-370`). The security adversary ran the shipping detector over a
screen a shell, `cat` or an npm postinstall can print, ending "Do you want to proceed? 1. Yes 2. No, press enter to
confirm · esc to cancel". It read `atChoice` true with two options and a question
(`security-adversary/fakedialog.mts`). A quiet pane then turns `needs_input` after two ticks
(`DIALOG_CONFIRM_TICKS`, `state-machine.ts:54`), and the door serves the options.

So a press asks the foreground itself. **The writer found a gap in how the ruling names that check.**
`agentHoldsTerminal` (`state-machine.ts:750-759`) answers from `st.foreground`, and the monitor fills that only for
a row whose compiled profile lists a shape: `foregroundToRead` returns null when `profile.dialogs` is empty
(`:506-512`). The only two rows that list one are Claude Code's (`src/main/agents/registry.ts:684`) and Qwen's
(`:1453`). So `agentHoldsTerminal` answers false for every Codex session. The press must instead read a fresh
process table (`readProcSnapshot`, `src/main/activity/process.ts:95`), find the pane's foreground program
(`foregroundProgram`, `state-machine.ts:491`), read its command line and ask the gate's own rule,
`commandRunsAgent` (`:628`), over `binaryCandidatesFor(agent)` (`:937`). That rule counts a program token only.
This was read, not driven. `conformance:choices` pins `noteForeground` and `foregroundToRead` to one call site each
(`build/conformance-choices.mjs:1106-1116`) and pins no call site for `commandRunsAgent`, so the press's own read
leaves that gate as it is.

An allow option is pressable only when the row's question says what will run:

- Claude: the hook's question, the tool and its command (`src/main/activity/question.ts:171-186`).
- Codex: the shipping detector reads the question as "Would you like to run the following command?" with the
  command absent (`caps/x1-c2-prompt.txt`). The compiled press shape reads the `$ …` line into the question; with no
  such line, the Yes rows are unpressable.

### 2.9 The road not taken: answering Claude through a held hook

Investigator A answered research 127 §4's open question. Claude 2.1.285's terminal dialog and a pending
`PermissionRequest` http hook coexist, and the first answer wins (`investigator-a/logs/hook-run.jsonl`):

- A hook held 6 s and answered `allow` ran the tool with no keystroke; `deny` refused it.
- When the Mac answered first, Claude closed the held request, and a late `allow` hit a destroyed socket with
  nothing run.
- Held 125 s with no timeout configured, Claude kept waiting.

The adversary measured the fallback: if the holder dies or answers 500, the terminal dialog stays and a key answers
it (`adversary/logs/claude-run.jsonl` C5 to C7).

It is recorded here as Claude's exactly-once road, **named and not queued**. It would change every Claude session's
hook plumbing, its mapping for the widening options (`updatedPermissions`, `setMode`) is unmeasured, and Codex would
still need keys. The main-minted id narrows the key road's race to one process start, for both agents, with one
mechanism.

## 3. The message's road

### 3.1 Why not `send-keys -l`

The charter says "one typed message delivered through tmux's own `send-keys -l`" (Phase 317's successor paragraph;
Phase 316 item 6, `docs/BACKLOG.md:33430`). It fails five measured ways:

| Failure | Measured |
| --- | --- |
| A trailing `;` is eaten, and a trailing `\;` becomes `;`, on both builds and in every key mode | `adversary/logs/bytes.json`: `ls -la;` arrived as `ls -la`; `abc\;` as `abc;`. Live in Claude: `…third; line;` was submitted as `…third; line` (`claude-run.jsonl` M2) |
| A message that is itself a flag set, sent with no `--` as `typeIntoPane` does, succeeds and delivers nothing. `-R` also resets the pane's terminal, turning bracketed paste off | `adversary/logs/dash.json`: `-R`, `-F`, `-l`, `-H`, `-K`, `-N2` exited 0 and delivered 0 bytes. After `-R`, `#{pane_key_mode}` went from `Ext 2` to `VT10x`, and a later paste arrived unframed |
| A line feed is dropped under extended keys, which is Claude's key mode | `investigator-b/drive-bytes.json`: `a\nb` arrived as `610a62` in VT10x and `6162` in Ext 1 and Ext 2. Tortie's config turns `extended-keys on` (`resources/gmux-tmux.conf:15`) |
| Claude loses the front of an unbracketed message above about 8 to 10 KB | `investigator-b/claude-live2.json`: 12,000 characters left the last 758. `adversary/logs/claude-run.jsonl` M4: 10,240 characters left 20 |
| One command is limited to about 16,300 bytes, and the limit moves with the target's spelling | `drive-bytes.json`: 16,300 exited 0 and 16,350 failed. `dash.json`: at most 16,340 with target `=r:`, 16,301 with a 42-character target |

### 3.2 Where the Enter goes

Investigator B swept the Enter on the real agents, 8 trials per cell (`investigator-b/sweep-live.json`):

| Shape | Claude | Codex |
| --- | --- | --- |
| `-l` text, then Enter, as two calls | 8 of 8 at 0, 10 and 30 ms | 0 of 8 at 0 ms (the Enter became a newline), 8 of 8 from 10 ms |
| Paste, then Enter, as two calls | 8 of 8 at 0, 10 and 50 ms | 8 of 8 at 0, 10 and 50 ms |

Two calls can be split by another writer: 32 of 40 pairs were split, against 0 of 40 as one command list
(investigator C). But `-l` or `-H` with Enter in one list never submits on Codex (`adversary/logs/enter-shape.jsonl`,
4 trials per cell):

| One tmux command list | Codex | Claude |
| --- | --- | --- |
| `send-keys -l text ; send-keys Enter` | 0 of 4 | 4 of 4 |
| `send-keys -H hex ; send-keys Enter` | 0 of 4 | 4 of 4 |
| `paste-buffer -p -d ; send-keys Enter` | 4 of 4 | 4 of 4 |

Only the paste list meets both findings on both agents.

### 3.3 The road ruled, and the bytes that arrived

1. `load-buffer -b tortie-say-<writeId> -`, with the words on standard input, so no argv and no error message ever
   holds them.
2. Then one tmux command list:
   `copy-mode -q -t <$id> ; paste-buffer -p -d -b <name> -t <$id> ; send-keys -t <$id> Enter`.
3. On failure, `delete-buffer` runs in a `finally`.

The judge ran exactly that, argv only, on 3.6a and 3.7b under a copy of `gmux-tmux.conf`, into a raw-mode recorder
(`judge/shape.mjs`, `judge/shape.json`). Both builds gave the same bytes:

| Case | Bytes the program read | Copy mode before, after | Buffers left |
| --- | --- | --- | --- |
| `hello phone` | `ESC[200~hello phone ESC[201~ CR` | 0, 0 | none |
| `a\;b\\c\` | `ESC[200~a\;b\\c\ ESC[201~ CR` | 0, 0 | none |
| `-R ls -la;` LF `second line ; 👍🏽 é` | `ESC[200~-R ls -la; CR second line ; 👍🏽 é ESC[201~ CR` | 0, 0 | none |
| `from copy mode;`, pane in copy mode | `ESC[200~from copy mode; ESC[201~ CR` | 1, 0 | none |
| `a` LF `b`, program never asked for bracketed paste | `a CR b CR` | 0, 0 | none |

The last row is why the message is limited to agents measured to ask for bracketed paste (`?2004h`): Claude Code and
Codex both do (`investigator-b/logs/claude-smoke-output.bin`, `codex-smoke-output.bin`). A shell that does not
would receive each line as its own command.

Two more facts bear on it:

- **An escape inside the buffer.** tmux 3.7b rewrites an ESC inside the buffer as the two characters `^[`, so a
  paste cannot be broken out of. 3.6a passes it raw, so text carrying `ESC[201~` ends the paste early and the CR
  after it submits (`investigator-b/drive-bytes.json`; `adversary/logs/bytes.json`). So ESC is refused at main
  whatever the tmux version.
- **Size.** `load-buffer` from standard input then `paste-buffer -p` delivered 1,000,000 bytes intact, and Claude
  took a bracketed paste whole up to 100,000 characters (`claude-live2.json`). The 4,096-byte cap is a product
  choice, not a tmux limit.

### 3.4 Copy mode

If someone scrolled back on the Mac, the pane is in copy mode. There, `-l` text is read as copy-mode keys and only
the lone Enter reaches the program; `paste-buffer -p` reaches it but unframed (`investigator-b/drive-copymode.json`,
both builds). `copy-mode -q` first leaves every mode and exits 0 when none is active (`judge/shape.json`).

### 3.5 When a message may be sent

A message that lands anywhere but the agent's empty input row does something he did not mean:

- **On a choice it answers the choice.** On Claude, 3 of 3 messages approved the tool. On Codex, "please go ahead
  and wait" pressed "p", wrote `prefix_rule(pattern=["touch", …], decision="allow")` to its rules file, and sent
  "lease go ahead and wait" as a prompt (`investigator-b/claude-live2.json`, `codex-live.json`).
- **On a question Tortie does not read as a choice, Enter answers it.** Claude's "Make auto mode your default
  permission mode?" was answered Yes and persisted.
- **On a draft, it merges.** Both agents submitted "half-typed draft from the Mac p318b-phone message"
  (`merge-live.json`). Claude's registry reads idle with a draft in the row (`adversary/logs/claude-run2.jsonl` P7),
  so the agent's own status cannot see it.
- **After a stray digit, it carries it.** A stale "1" left in Codex's row became "1adv-X5 his next message"
  (`adversary/logs/codex-run.jsonl` X5).
- **Some messages are commands.** A leading `!` runs a shell command in both agents, with no model turn and no
  prompt. `/exit` in Claude and `/quit` in Codex end the agent and the session. `/clear` wipes Claude's context.
  A prefix is completed: pasted `/cle` plus Enter ran `/clear` (`adversary/logs/claude-run2.jsonl` P3, P4). A
  message into a pane whose agent has left runs as a shell command line (`investigator-b/codex-shell-live.json`).

So a message is offered only when all of these hold:

1. The session is on this Mac and live.
2. The row is not `needs_input`. The text box is not drawn on any `needs_input` row, with or without options,
   because the Claude trust gate reads `needs_input` with no options and Enter there ends the agent.
3. The agent's own reader says it is at its input row: Claude's registry reads idle or busy, or Codex's pane title
   reads idle or working. Both readers named every dialog tried: Claude's read `waiting` with "dialog open" or
   "permission prompt" (`investigator-b/registry-live.json`), and Codex's title read `[ ! ] Action Required | work`
   at the approval (`codex-title-live.json`). The readers are `claudeVerdict` and `codexTitleVerdict`
   (`src/main/activity/oracles.ts:25`, `:63`).
4. The agent holds the terminal.
5. The input row reads empty, by a compiled reading per agent over committed captures, including Codex's
   "Ask Codex to do anything" placeholder read through `-e` styling. When the reading cannot tell, it answers "not
   empty".

A first non-space `/` or `!` is refused by default, pending his ruling (§12). `@` was sent literally in both
tests (`claude-run2.jsonl` P5, P6).

### 3.6 Mid-turn

Both agents hold a message sent mid-turn and submit it once the turn ends, as they do at the desk. In B's run, turn
A's stream ended at about 10,217 ms and message B's first request came at 10,260 ms, in the order user A, assistant,
user B; the screen read "Press up to edit queued messages" (`investigator-b/claude-live2.json`). Codex read
"Messages to be submitted after next tool call" (`codex-live.json`). The adversary saw Claude's `UserPromptSubmit`
hook fire when the message was queued, at 2,832 ms, not when it was sent, at 8,234 ms (`claude-run.jsonl` M7).
Delivery at a tool-call boundary was not driven.

### 3.7 What the agent sees

His words, as pasted. A bracketed paste reached Claude byte-exact and still decomposed (`é` as `e` plus U+0301),
where B's typed path had been normalised (`adversary/logs/claude-run.jsonl` M3). Codex was exact on both paths. Skin
tones, a ZWJ family, a flag and U+2028 came through tmux exact in every key mode on both builds
(`adversary/logs/bytes.json`). Neither agent gets any sign that the words came from a phone. Claude shows a
multi-line paste as "[Pasted text #13 +3 lines]" until it is submitted.

## 4. The write route

### 4.1 Today the door has no write route, in four layers

Investigator C ran the shipping `createDoorListener` in-process on `127.0.0.1` with a real TLS 1.3 handshake and a
pinned phone certificate from the shipping `issueClientCertificate` (`investigator-c/measure-door.out`). GET
`/v1/blocked` answered 200. POST to `/v1/blocked`, `/v1/end`, `/v1/reply`, `/v1/choose` and `/v1/say` each answered
404 with the refusal word `route` and nothing forwarded.

Read-only is written into more than the table (`src/main/pocket/door/table.ts:56-61`, four rows, one of them the
unsigned, window-only `POST /pair`):

- `DoorSignedRoute` is `blocked`, `session` or `turns` (`src/main/pocket/door/wire.ts:95`), and a request's method is
  the literal `'GET'` (`:102`, `:272`).
- `doorRequestOf` refuses a body over `POCKET_READ_BODY_CAP_BYTES`, 1,024 (`wire.ts:27`, `:267`).
- The listener forwards the literal method `'GET'` (`src/main/pocket/door/listener.ts:455`).
- `conformance:pocket`'s R2 requires every row to be a read, R4 pins the membership by sha256
  (`build/conformance-pocket.mjs:659`), and N1 requires the table to equal Phase 313's (`:1581`, `:1628-1640`).

C re-derived R4's pin with a hash of its own, `ad9ce8210eeed186…`, equal to the gate's. Adding End moves it to
`d1fefb71…`; adding End, choose and say moves it to `0e8c9f46…`.

### 4.2 For a write, 404 must mean nothing happened

Two shipping paths replace an answer with 404 after the handler has run:

- **A late answer.** The listener's answer timer sends 404 while main's work still runs
  (`listener.ts:466-471`). C shortened the bound to 300 ms and had main answer at 800 ms: the phone read 404 at
  303 ms, and main's work ran once afterwards (B5).
- **A stop after the act.** `bind.ts` asks `admission.stopping()` again after the handler returns and replaces the
  answer with 404 (`src/main/pocket/bind.ts:434`), and replaces an answer that fails validation (`:377`). C's
  handler acted, switched the door off, then returned 200; the phone read an empty 404 and the handler had acted
  once (C1). `src/main/pocket/server.ts:159-167` asks refusal 7 after the answer is composed, too.

That is right for a read and wrong for a write. For a write:

- every 404 is produced before the act;
- after the act, the answer is always 200 with the outcome, and nothing replaces it;
- when main's answer is late, the door process cuts the connection rather than answering 404.

The phone then reads 404 as "nothing was sent", 200 as what happened, and a cut connection after the request was
written as "unknown, look at the session again".

### 4.3 The signature already covers a write

`canonicalRequestText` signs the method, the path and query, the body's sha256, the timestamp, the nonce and the
pairing binding (`src/main/pocket/pairing.ts:1679-1689`), and the binding is "Derived, never sent" (`:1691`). With the
shipping verifier and signer (`measure-door.out`): a signed POST with a JSON body read `ok`; the same request again
read `replay`; one body byte changed read `signature`; signed as POST and sent as GET read `signature`; sent over
another phone's connection read `channel`. The phone's `RequestSigner.headers` already takes a body
(`ios/Tortie/Door/Signing.swift:267`). No cryptographic change is needed.

### 4.4 A nonce is not "exactly once"

- A6: a write, then 512 signed reads over 25.6 s, then the first write replayed: `ok` again. Nonce memory is 512 per
  phone (`pairing.ts:1649`), inside a 60 s clock window (`:1646`).
- A7: a new verifier, as after a restart, then the same bytes: `ok`.
- A8: the same message sent twice with two fresh nonces: `ok`, `ok`. And the same paste sent twice 50 ms apart was
  submitted twice by both agents (`investigator-b/merge-live.json`).

Only a holder of the phone's pinned client key can replay, so a replay is the phone itself or the door process. A
write id inside the signed body and a ledger in main answer a repeated id with its recorded outcome and never act
twice. Held in memory for twice the 60 s clock window, it closes every case except a replay across a restart within
60 s, which needs the phone's own key; the phone never re-sends on its own.

### 4.5 Sentences can reach the phone

Every refusal is 404 with no body today (`server.ts:38-41`; `wire.ts:325`), and the phone accepts only 200 and 404
(`ios/Tortie/Door/DoorClient.swift:362-367`, `:598-607`). So Phase 317's promise to draw main's sentences word for
word cannot be met as the door is built. Only a paired phone with a valid signature reaches the gate outcomes, so
answering those with 200 and the owner's sentence tells a stranger nothing. Refusals before and at the signature
stay 404 with no body.

### 4.6 The confirm hash moves

The route list is part of the door's confirm hash, sorted (`pairing.ts:294`), taken from the table. C measured with
the shipping `describePocketDoor` (`investigator-c/measure-hash.out`): today `fff2de4c…`, "Answers these and nothing
else: blocked, pair, session, turns"; with End, choose and say `cc017a7b…`, "… blocked, choose, end, pair, say,
session, turns". Every paired Mac stops publishing the door until he confirms again. The consent sentence, "a person
read what this door will answer and allowed it" (`pairing.ts:378`), says nothing about ending or typing, so the
sheet gains one line naming the write verbs.

### 4.7 The code that acts lives outside the door

R3 bans `killSession`, `send-keys`, `sendInput` and `noteUserInput` by text anywhere under `src/main/pocket`
(`build/conformance-pocket.mjs:974-986`). The door already gets everything it may read through `PocketFacts`, whose
members are all reads (`routes.ts:128-209`). So the three verbs are one narrow interface declared in
`src/main/pocket` and implemented once outside it, and Phase 317's "names a core verb" becomes that interface. The
door process never holds any of it: its import wall (W2) and the bundle read (U5) keep session code out already.

### 4.8 His words must never reach the log

- **G1 misses the words a message is named by.** Its word list (`conformance-pocket.mjs:1391-1392`) catches `body`
  and `answer`, but `input.text`, `message`, `reply.words`, `choice.label` and `option.label` all pass (C), and it
  reads `src/main/pocket` only (`:259`), not where the writer would live.
- **A failed tmux command's error message holds its argv.** `execFile`'s `err.message` embeds the command line;
  `classifyExecFailure` folds it into the `GmuxError` message. The security adversary made `send-keys -l <17,000
  characters>` fail on both builds, and the error message held all of them (`security-adversary/errmsg.mjs`).
  `restore.ts` already logs `(err as Error).message` after `typeIntoPane`. With the words on standard input, the
  argv holds only a buffer name and a session id.

The one line a write logs holds the verb, the session id and the outcome word.

### 4.9 Face ID

Nothing on the phone ties a key to biometrics. The TLS client key is a Secure Enclave key with `.privateKeyUsage`
only (`ios/Tortie/Door/Keys.swift:184`), and the signing key is kept `WhenUnlockedThisDeviceOnly`; `ios/` holds no
`LocalAuthentication` and the plist no `NSFaceIDUsageDescription` (C). So Face ID, for End or a reply, is a check
the phone app makes before it signs; the Mac cannot confirm it. A Mac-checkable Face ID would need a third,
biometry-bound key signing every write, a new field in the hash, and every phone paired again. That is not in this
release.

A reply is at least as powerful as End: `/exit` ends the session, `!` runs a shell command, a first-letter shortcut
wrote a permanent allow rule, and an allow-once runs whatever the agent proposed (§3.5). The approved design draws
Face ID on End only (`docs/design/phone/index.html:57`: "End, behind Face ID. The only write verb in v1"). So the
default is the same gate for every write, and the choice is his (§12).

### 4.10 Remote rows, rate and what the Mac shows

- **Remote rows.** They never read `needs_input` (`src/main/machines/remote-sessions.ts:1032`) and carry no
  choices, and the only door that types on another machine refuses every control character, so no Enter
  (`src/main/machines/exec-plane.ts:713`), and excludes "a person's free text" by rule
  (`src/main/machines/remote-arm.ts:13-18`). The phone draws no text box and unpressable options for them, the way
  it draws any row the verbs do not serve, with no text that says why it is remote. That is his rule that a remote
  session feels identical to a local one. Main refuses a hand-made remote write with 200 and one sentence.
- **Rate.** The door runs each forwarded request as its own job (`bind.ts:417-439`) and limits only connections
  (`src/main/pocket/door/limits.ts:21-23`). One write in flight per phone and per session, plus the read-back, holds
  it to about one write per second per session. No other limit is added.
- **The Mac.** Nothing new. The words appear in the session as if typed, `app.log` gets one line with no words, and
  the native menus do not move.

### 4.11 What main does, in order

The door process checks the size and forwards the raw bytes; it never parses a write body. Main then:

1. Answers 404 if the app is quitting or the door is stopping.
2. Checks the signature; any failure answers 404.
3. Parses the body strictly.
4. Looks up the write ledger, keyed on the phone id and the write id. A repeated id gets its recorded outcome.
5. Allows one write in flight per phone and per session; a second gets 200 with a busy sentence.
6. Asks again whether the phone is still paired and this door instance is still open, with nothing awaited before
   the act; if not, 404. The security adversary found this gap: a request already forwarded when the phone is
   removed still runs, because the only re-check before the handler is `admission.stopping()`.
7. Re-reads the row by id, asks the shared gate (Phase 317's `canEnd`; new `canChoose` and `canSay`, meaning live
   and on this Mac), then the verb's own checks. A refusal answers 200 with the owner's sentence.
8. Records the write as pending, acts through the injected verb, records the outcome and answers 200 with it.
9. Logs one line: the verb, the session id, the outcome word.

## 5. "Never by the user's own input", when the input comes from the phone

CLAUDE.md's rule: "needs input" may only be triggered by session behaviour, never by the user's own input to that
session. The phone is his input, so it is held to the desk's rules:

- **A press releases `needs_input` the way a desk keystroke does.** At the desk, typing calls `activity:noteInput`
  (`src/main/ipc.ts:187`), which calls `noteUserInput`, which clears `needs_input` at once
  (`src/main/activity/monitor.ts:516-522`). Without that, a phone press would leave the answered choice on
  `/v1/blocked` until the next tick, 1 or 2 s (`src/main/sessions/core.ts:557-558`), and a second tap on the
  re-offered row would land on the next question. The writer calls `noteUserInput` only after the read-back finds
  the question gone. It is the desk's funnel, not a status setter, not a "seen it" button and not configuration.
- **A message has nothing to release**, because it is refused on `needs_input` rows. Its echo is the other risk:
  through the shipping verdict, a dialog-shaped echo turns a screen-read session amber on the second tick
  (`investigator-b/verdict-ticks.mts`). The message is limited to Claude Code and Codex, whose own readers speak
  before the screen (`state-machine.ts:273-305`), so the exposure is the desk's. The app run drives a dialog-shaped
  message into each and must read no `needs_input` for 10 s.
- **Phase 325** is queued and not built: there is no `input-facts.ts`, no `noteOwnText` and no
  `conformance:ownwords` in the tree. Its tap sits in the attach host's listener, which a phone write never passes,
  and it closes a burst on submit, which a phone message always does. Its entry says Phase 318 "writes through the
  same listener or hands the same count" (`docs/BACKLOG.md:35407`). That line is amended to say the phone writer is
  the second writer `conformance:ownwords` must see, and whichever phase lands second wires it.

## 6. What the attack killed

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| The charter: "one typed message delivered through tmux's own `send-keys -l`" (Phase 317's successor paragraph; Phase 316 at `docs/BACKLOG.md:33430`) | B, C and the adversary: a trailing `;` eaten, `-R` resets the terminal, LF dropped under Ext 2, Claude loses the front above 8 to 10 KB, about 16,300 bytes per command (§3.1) | Load the buffer from standard input, then one paste-and-Enter list, re-measured by the judge on both builds (§3.3) |
| Research 127 §4: a numbered option "typed as one digit and Enter" | A: a separate Enter approved the next, unseen dialog 8 of 8 from about 200 ms (§2.3) | The digit alone, never an Enter |
| C: "the message and its Enter must be one tmux command list" with `send-keys -H` or `-l` | The adversary: Codex submitted 0 of 4 for both (§3.2) | The paste list. C's finding that two calls split under another writer is kept |
| A: a count of `PermissionRequest` arrivals is the only per-question id Claude gives for free | The adversary: `PreToolUse` carries `tool_use_id`, 6 to 11 ms before each `PermissionRequest` | The fact is kept. The ruling still uses a counter main mints, which needs no new hook in every Claude session |
| A: a whole-window hash tells different commands apart | The adversary: it depends on what scrolled above the dialog; Codex marks collide on identical commands; a resize moves the mark | The id is main's counter; the mark is a second check that fails safe |
| C: a phone answer must not clear the waiting state through any status call, "no worse and no better than typing at the desk" | The adversary: the desk clears `needs_input` at once, and without that the answered choice is re-offered for a tick | The writer calls `noteUserInput` after the read-back (§5) |
| B: Claude NFC-normalises combining sequences | The adversary: only on the typed path; a paste arrives byte-exact | Moot under the paste road |
| B: a positive "at its input row" reading from the agent's own reader is enough | The adversary: Claude's registry reads idle with a draft in the row (P7) | An input-row-empty reading is added, and fails closed |
| B and C: a fixed `send-keys` size limit (about 16,300 and 16,341) | The adversary: the limit is on the whole command and moves with the target's spelling | Moot; the words travel on standard input |
| Phase 317 mechanisms 2 ("takes a session id and nothing else"), 4 (sentences drawn verbatim), 6 ("the End route is the ONLY write route") and "names a core verb" | C's measurements, endorsed by the security adversary: sentences cannot reach the phone while every refusal is a 404 with no body, and a core verb inside the door collides with R3 | Phase 317's entry is amended before it is built (Phase 318's entry lists the changes) |
| The approved `Choice.html` draws the message field, disabled, under a pending choice (`docs/design/phone/Choice.html:65-66`) | B: a message on a choice answers it; Codex took the first letter as a shortcut and wrote a permanent allow rule | No text box on any `needs_input` row |

**Held under attack** (the security adversary):

- A stranger cannot type. There is no write route, and a connection whose client key is not a paired phone's is
  destroyed at the handshake before the one hand-over to HTTP (`listener.ts:370-406`).
- An exact replay is refused, and a captured request cannot be replayed at another door or as another method.
- A removed phone loses its live socket at once, and its later signatures fail as `unpaired`.
- A phone's words cannot reach a push alert. The alert reads the session's name, status, project, agent and
  machine, never the question and never a reply (`src/main/push/alert.ts:84-124`).

## 7. The judge's rulings, in one place

1. **Keys.** The digit alone, from the fresh rows' own marker, 1 to 9, only for the compiled press shapes: Claude
   Code 2.1.285's numbered permission prompt and Codex 0.159.1's command approval, with Claude's Edit and Write
   prompts admitted only if the build measures them. Never an Enter after a digit.
2. **Same question.** A question id minted by main (§2.7), a fresh capture, the same mark, the marker present and
   pressable, the agent in the foreground, nothing awaited before the send, a read-back at about 300 ms, never a
   retry. The build measures check-to-land and holds its 99th percentile under 15 ms.
3. **False choices.** Pressable only while the session's own agent holds the terminal, and an allow only when the
   question says what will run.
4. **The message.** The buffer and paste road of §3.3; 1 to 4,096 bytes; ESC, every C0 control except LF, DEL and
   C1 refused, never stripped; the argv never holds the words; Claude Code and Codex only; the five conditions of
   §3.5; a leading `/` or `!` refused by default.
5. **Own words.** `noteUserInput` after the read-back; Phase 325 amended.
6. **The write route.** Built once in Phase 317, amended before it is built; Phase 318 adds two rows and two
   members. The order of §4.11.
7. **Face ID.** The phone's check before it signs. End always; choose and say by his answer, default yes. No third
   key.
8. **Tier 3**, and the order: 316.5, then 317 as amended, then 318. Phase 318 does not wait for Phase 325.

## 8. What is not settled

| Not settled | Why it matters | The one measurement or ruling |
| --- | --- | --- |
| Whether Face ID covers choose and say | Convenience against safety, on a verb as powerful as End | His answer, §12 question 1. Default yes |
| Whether widening options may be pressed | One tap would widen what an agent may do for the rest of the session | His answer, §12 question 2. Default no |
| Whether a message may start with `/` or `!` | They end sessions, clear context and run shell commands | His answer, §12 question 3. Default no |
| Claude's Edit and Write prompts on 2.1.285 | Whether they are press shapes | The build's spec step, over its stand-in and the real agent under a scratch `HOME` |
| Check-to-land latency in the app | The race closes only if the byte lands within about 15 ms of the last check | The app run: at least 200 presses, 99th percentile under 15 ms |
| A question clipped or redacted | The hook question is redacted and cut at `QUESTION_MAX` (`question.ts:180-186`), so a long or redacted command is not wholly said. The writer's reading of the ruling's own rule is that such an allow is not pressable | The spec step rules it; the default is unpressable |
| How often a focus report bumps the question id | Every write through the attach host bumps it, a focus report included, which refuses a correct press. That fails safe | The app run counts refused presses with the Mac window idle |
| Whether a message's submission can be read back | The outcome today would be "sent", meaning it reached the session | The spec step decides whether "sent" is enough |
| The body cap's worst case | The JSON encoding of a legal 4,096-byte text. Swift's `JSONEncoder` escapes `/` as `\/` by default, which doubles it; that was not run | The build computes the cap and pins it with a test encoding from both sides |
| Gemini, Qwen and Antigravity live | Their keys are read from source or not at all | Not in Phase 318; each stays unpressable until measured |
| Codex's update prompt, Claude's older trust gate | Unmeasured | Never pressable in Phase 318 |
| A screen-read agent's same-rows successor inside one tick | Inferred from code, not driven | Not needed: Phase 318 presses only Claude Code and Codex |
| Delivery of a queued message at a tool-call boundary | Whether it goes in mid-turn | Not driven; both agents held it to the turn's end in every run |
| The end-to-end press in the app | No Electron was allowed in this round | The build's app run |
| tmux 3.7c and Linux builds | The byte tables are for 3.6a and 3.7b | Not needed: the reply serves sessions on this Mac only |

## 9. Found on the way, and not Phase 318

1. **A resize while a Claude permission dialog waits clears the hook question.** The mark moves with the width
   (§2.6), and `choiceUpdate` then treats it as a different gate and sets `e.st.question = ''`
   (`monitor.ts:1206-1213`); nothing gives the choice reader a reflow grace. In Phase 318 this fails safe: the Yes
   rows go unpressable and the question id moves. It needs its own entry.
2. **`typeIntoPane` passes `-l` text with no `--`, as two calls** (`restore.ts:305-314`). A composed resume command
   ending in `;` or starting with `-` would be changed by tmux, and the text and its Enter can be split by another
   writer. Tortie's composed commands were not checked for such an ending.
3. **Codex's trust gate is not read at all.** Its hint "enter continue · esc quit" misses `HINT`
   (`screen.ts:76-78`), so it reads `atChoice` false (`investigator-a/caps/x1-start.txt`).
4. **The numbered verdict is not foreground-gated** (§2.8). Phase 318 gates the press, not the verdict, which
   `conformance:choices` pins byte for byte. A non-agent program can still turn a row amber and show options on the
   Mac and the phone.
5. **In a fresh scratch configuration with no mode flag, Claude 2.1.285 ran every command without a dialog**, in
   auto mode, with its classifier requests answered by the stand-in (`investigator-a/logs/claude-run2-automode.jsonl`,
   one run). What his own permission mode does was not measured.

## 10. What this round left behind

- **Model turns: 0. Tokens: 0.** Every Claude and Codex record went to a scratch store under
  `scratchpad/p318/*/home`.
- **Electrons and Simulators: 0.**
- **tmux:** every scratch server killed and its socket file removed. His `-L gmux` server was never touched.
- **Installs:** nothing installed. The Claude and Codex installs had the same sha256, size and modified time before
  and after every run.
- **Discarded:** `adversary/logs/race2.jsonl`, which reused file names from an earlier run, so its "approved" flags
  are false. `race3.jsonl` replaced it. In race run 1, six files at 0 to 15 ms were approved by the harness's own
  next message landing on a dialog Claude had held back; it is kept as evidence of the hazard, not as a planned arm.
- **Line numbers.** Where an investigator's line had moved at `2abdea43`, this document gives the one read now: the
  pin check is `listener.ts:370-406` (not `:363-397`), `SESSION_CHANGED` is `copy.ts:635` (Phase 317's entry says
  `:641`), and `killSession` is `core.ts:2839` (Phase 317's entry says `:2802`).
- **The evidence is in scratch, which does not survive a reboot.**

## 11. What this queues

**Phase 318, the build**, entered in `docs/BACKLOG.md` in the house shape. Tier 3, a `feat`, a minor, in the
release he named on 2026-09-30. It builds after Phase 316.5 lands and after Phase 317 is built with its entry
amended; it does not wait for Phase 325.

Three entries are owed and not queued: the resize that clears the hook question (§9 item 1), `typeIntoPane`'s
missing `--` (§9 item 2) and Codex's unread trust gate (§9 item 3). The held-hook road (§2.9) is named and not
queued.

## 12. The rulings it needs from him

1. When your phone answers a choice or sends a message, should it ask for Face ID first, the way End does?
   **Default:** yes, every write asks, with the same prompt as End.
2. May one tap on the phone pick an option that gives the agent more room for the rest of the session, such as
   "Yes, and don't ask again", "always allow access to this folder" or "switch to auto mode"? **Default:** no. Those
   options show on the phone but cannot be pressed; Yes (once) and No can.
3. May a message from the phone start with `/` or `!`? In Claude Code and Codex those are commands: `/exit` ends
   the session, `/clear` wipes the conversation, and `!` runs a shell command on your Mac. **Default:** no. The
   phone refuses such a message with one line.
