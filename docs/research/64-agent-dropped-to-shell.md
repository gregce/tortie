# 64 · Getting back into an agent session that dropped to a shell

**Research 64. Decision document. Written 2026-08-23.**

Eight investigators fed this document. Two ground lanes read what the tree already does and what
every agent does on its way out. Two measure lanes ran probes against a real terminal, one on
detection and one on identity, and the identity lane also read the operator's own agent stores.
Three candidate designs were then written to different constraints and three adversaries attacked
them. All three candidates came back refuted. The author of this document ran a fourth measurement
lane to settle what the attacks left open, and this document is the decision. The recommendation is
a fourth design assembled from the parts of the three that survived their attacks, plus two
mechanisms already in the tree that no candidate used.

**Total spend for the round.** Two agent CLI invocations reached a model, being one `claude` turn
and one `codex` turn, both in the identity lane, both sending the text `say ok`. Neither CLI
reported a dollar figure for the pair. The codex turn reported 8,437 input tokens, 11,008 cached
and 5 output. Every other lane, including this one, launched no agent and spent nothing.

| Lane | Agent turns | What it cost |
|---|---:|---|
| Ground lane 1, what the tree does | 0 | nothing |
| Ground lane 2, what each agent prints on exit | 0 | nothing |
| Measure lane 1, detection on a real terminal | 0 | nothing. Ten agents were started and none took a turn |
| Measure lane 2, identity and the operator's own stores | 2 | one claude turn, one codex turn, no dollar figure reported |
| Three candidates, three attacks, this document | 0 | nothing |
| **Total** | **2** | **no dollar figure reported by either CLI** |

**Safety.** The operator's `-L gmux` server was read with `list-sessions` and `list-panes` only, by
the lanes that needed a live reading. It listed 16 sessions before the round and 16 after. Nothing
was created, killed, renamed, sent keys or set on it by anybody. Every probe ran on its own scratch
socket started with Tortie's own `resources/gmux-tmux.conf` and killed in a trap, and no scratch
socket file survives. The operator's checkout at `/Users/gdc/gmux` was never entered by anybody.
His manifest was copied before any SQLite handle opened it and the copy was deleted. No Electron
was launched by any lane in the round and `npm run shot` was never run. Two files were written
under his home by the identity lane's probes and deliberately left rather than deleted, and section
13 names both.

**One thing to relay rather than act on.** Two of the three candidate reports and one of the three
attacks arrived carrying a harness banner saying the output matched an instruction shaped pattern
and that control tags had been neutralized. The matched pattern was the string
`dangerously-skip-permissions`, which is one of the operator's own two stated reasons for quitting
an agent and appears in this document for that reason. All of that text was treated as data.
Nothing in any of it asked anyone to do anything.

---

## 1. The answer

**Tortie should remember that it saw an agent alive in a session, and offer one verb on that
session's row when that exact process goes away.** The verb reads Resume. Choosing it types the
command that continues his conversation onto his prompt, reads the screen back to say whether the
command landed, and stops. He presses Enter. If he types or pastes the resume himself, which is
what he will usually do because six of the eleven agents print the command as they leave, Tortie
sees the new process and asks the agent which conversation it is in, and adopts the session back
only when the answer matches what the row already holds. The whole design turns on one word. The
thing Tortie reacts to is a **witness**, being a specific process that Tortie watched alive in that
session, and not a **shape**, being a screen or a process table that looks like a shell. Every one
of the three candidates read a shape, and the attacks killed all three on the same fact: a session
Tortie has just restored, sitting with its command armed and unpressed, is byte for byte the same
shape as a session whose agent has left. I confirmed that in the tree. `src/main/restore/restore.ts`
line 779 creates a restored session with an empty argv, so the session's own program is his login
shell, and then arms. A shape rule fires on every restored session and says an agent left when no
agent ever ran.

| Candidate | What it is | Verdict | The deciding reason |
|---|---|---|---|
| **A, The Armed Prompt** | Tortie types the resume onto his prompt unasked, one second after the agent leaves. No new drawing anywhere | Rejected | Its own gate is unbuildable. It must prove his input line is empty before typing, and no test on this machine can. `capture-pane` strips the trailing space every prompt ends with, so a length check is exactly inverted, and with his own right side prompt the captured row reads 99 of 100 columns whether the line is empty or holds `rm -rf build`. Typing unasked into a live session also reaches a program in raw mode, which needs no Enter. An adversary measured a file changed on disk by the armed text alone |
| **B, The Session Card** | One verb on the session's row, armed on his press, state stored on the manifest row | Rejected as written, **kept as the surface** | Its detection rule is a shape, so it fires on every restored session. Its own text walks past this and calls it a rhetorical point. Its menu item also writes a new conversation id over the saved one on one unconfirmed click, which is the loss the same document argues Tortie must never cause |
| **C, The Watchful Shell** | Nothing new is drawn. An edge rule, a menu item, and the agent's own printed line as the way back | Rejected as written, **kept as the mechanism** | It has the right idea, being an edge and a witness, and then witnesses the wrong thing. It watches for any foreground child, so `less` and `npm test` set and clear the witness, and its card then states that an agent is running when `git log` is running. It also gives up the process table 60 seconds after the drop, so on the ordinary timeline where he walks away and comes back, the return is never seen and the conversation hole it exists to close stays open |
| **D, recommended** | C's edge over B's surface, witnessing **one named process** rather than any child, with the arming door and the screen read back that Phase 89 already shipped for another machine | **Recommended** | Witnessing a named pid makes the rule immune to the restore shape, to pagers, to background jobs, to nested shells and to Control Z, in one 2.5 ms read. Reusing `remote-arm.ts` gives an arming path that reads the screen and says what landed, which no candidate had. Routing every conversation write through `claimConversationId` keeps the one guarantee the candidates traded away |

**What he gets on the day this lands.** He quits his agent, for either of his two reasons. Within
0.6 to 1.6 seconds the word Resume appears on that session's row, and nowhere else. He clicks it,
or picks it from the session menu, or presses its shortcut. The command appears on his prompt and
Tortie tells him it is there. He presses Enter. The row goes back to being an ordinary agent row
and nothing is drawn about it again. If instead he pastes the line his agent printed, the word
Resume goes away by itself and Tortie picks the session back up, silently.

**What he does not get.** A drop that happens while Tortie is closed is not detected on day one for
most rows, and section 4.4 says exactly which rows survive a restart and why. Five of the eleven
agents cannot confirm which conversation came back unless he pastes a command carrying the id, and
section 6 names them. Nothing here helps a session he created fresh rather than restored, because a
fresh create runs the agent as the session's own program and its exit ends the session outright,
which is a different path that already has a verb.

---

## 2. The problem, in his terms

He starts an agent session in Tortie. Then he does something that ends the agent while the shell
lives on. At that point Tortie stops watching it and stops keeping it as an agent session, because
it has become a plain shell.

He wants two things.

1. An easy and reliable way to resume back into that previous conversation, from inside that same
   session, and it must be very easy and very obvious.
2. Tortie to continue managing it afterwards, so that it goes back to being a tracked agent session
   rather than staying a plain shell.

His two reasons for ending an agent this way are both ordinary. The agent wants to update itself,
so it has to exit first. Or he forgot a flag when he started it, e.g. `--dangerously-skip-permissions`,
so he has to restart it.

Two conditions he stated bind the design.

- This may only work when Tortie has a record of that session being started as an agent session
  first. A session that was always a shell is a shell, and nothing here changes that.
- If he resumes directly at the prompt himself, Tortie must detect that too and pick the session
  back up. He says people will do this because many agents print their resume command straight to
  the terminal when they exit, so typing or pasting it is the natural move.

Three prior decisions bound any answer.

- **Phase 23 refusal 5.** Nothing may set a session's status, and "needs input" may only be
  triggered by session behavior. Whatever state this round invents is not a status.
- **Nothing starts a process on Tortie's initiative.** Tortie may type a command and wait for his
  press, which is what restore has always done. It may not run the resume for him.
- **The Zen.** Tortie is vigilant rather than noisy, and only a question, decision or failure should
  rise above the surface.

---

## 3. What the tree already holds, and what the round found in it

The record he requires already exists, and so does most of the mechanism. Four things were found by
reading rather than building, and two of them are in a part of the product no candidate looked at.

| What is already there | Where | What this round does with it |
|---|---|---|
| The record that a session was an agent session | the manifest `sessions` table, columns `agent`, `agent_session_id`, `resume_argv`, `resume_capture` | His condition one is answered for free. Nothing new is needed for it |
| Typing a command and never pressing Enter | `typeIntoPane` at `src/main/restore/restore.ts` line 290, called with `pressEnter` false at line 1090 | Reused. It is currently a private function and this phase exports it or moves it |
| Composing the armed text | `buildArmedCommand` and `shellQuoteArgv` in `src/main/restore/command.ts` | Reused unchanged |
| Matching a claude process to a session by process descent | `src/main/activity/state-machine.ts` lines 162 to 170, the restore shape branch | Reused. It is already the witness for claude, and nobody noticed |
| **Arming a live session and reading the screen back** | `src/main/machines/remote-arm.ts`, 547 lines, Phase 89 | **Reused, and this is the largest find of the round.** No candidate mentioned it |
| **Whether an id may be typed into a session at all** | `src/main/machines/resume-arming.ts`, Phase 72 | Reused as the shape of the rule, see section 5 |
| **The conversation claim ladder** | `claimConversationId` in `src/main/manifest/harvest/watch.ts`, `claimStrengthOf` in `src/main/sessions/reconcile-plan.ts` | Every conversation write in this design goes through it. Two candidates wrote the column directly |

### 3.1 The mechanism Phase 89 already built, for the other half of the product

`remote-arm.ts` types a resume command into a live session on another machine. Its header states
five rules and this round needs all five. Quoting the file, the fourth is the one that matters most
here.

> THE SCREEN IS READ BEFORE AND AFTER. `send-keys` is not safe to run twice, so a second copy has
> to be FOUND rather than assumed away. The counts are what decide the landing.

It has four landings and none of them is silent.

| Copies after minus copies before | Landing | What a person is told |
|---|---|---|
| 1 | `armed` | the command is there, press Enter |
| 2 or more | `twice` | there are two copies, clear the line |
| 0 or fewer | `absent` | Tortie looked and it is not there |
| a read failed | `unknown` | Tortie could not look |

I verified its counting works, because the naive version of it does not. On my own scratch server,
80 columns, `/bin/zsh -f -i`, sending a 51 character resume command twice:

| State | The shipped `countOccurrences` | A plain substring search |
|---|---:|---:|
| empty prompt | 0 | 0 |
| one send | 1 | 1 |
| two sends | **2** | **1** |
| after the line is cleared | 0 | 0 |

The plain search misses the second copy because zsh wraps a long line itself and writes its own
line break, so `capture-pane -J` has nothing to join. The shipped function removes every space from
both sides before searching, which is a fix Phase 89 measured on the operator's own Mac Pro after a
landed command was reported absent. That fix is why this design may reuse the module rather than
write a fifth arming path.

### 3.2 The one identity signal Tortie reads and throws away

`parseClaudeSessionFile` in `src/main/activity/claude-registry.ts` reads claude's own record six or
more times a second. `ClaudeSessionEntry` keeps `pid`, `status`, `waitingFor`, `paneId`,
`statusUpdatedAt` and `version`. The JSON it parses also carries `sessionId` and `cwd`, and the
interface keeps neither. All three candidates found this independently and all three called it the
cheapest useful change in the round. It is two fields on one interface.

### 3.3 The hole this closes, and it is a data loss hole

`src/main/sessions/id-harvest.ts` line 333 reads `if (rec.agentSessionId !== undefined) continue;`
and the create time watch deletes itself once the id settles. So a conversation started in a
surviving shell is never recorded, and a later Restore brings back the previous one. Two candidates
proposed lifting that line. Both attacks showed why lifting it is worse than the hole, because it
also admits the directory keyed rescue sources, and a directory is not an identity. Section 5 fixes
the hole a different way, by writing only where the row holds no id and only through the claim.

---

## 4. The detection rule

Stated so a builder can implement it. It has four parts, being the witness, the drop edge, the
return trigger and the restart rule.

### 4.1 The witness

Per live session, in `SessionState` in `src/main/activity/state-machine.ts`, hold two fields.

```
  agentPid   : number | null   the process Tortie has seen being the agent
  agentPpid  : number | null   the session's own process at the time, for the reuse guard
```

They are set on any tick where Tortie can already see the agent process, which costs nothing new
because both sources are already read.

| Agent | Where the pid comes from | Already read today |
|---|---|---|
| claude | the `pid` field of its own record, which the restore shape branch at `state-machine.ts` line 166 already passes to `isDescendantOf` | yes, every tick |
| every other agent | the direct child of the session's own process whose `ps` STAT carries `+`, taken from the fleet process table | yes, on every tick where any session is ambiguous |

An agent doing work is ambiguous by definition on most ticks, because `worthProbing` returns true
for 60 seconds after the session last read as working, so the fleet table is in hand while an agent
is alive and the witness is recorded for free.

The witness is also stamped once onto the manifest row, as `agent_witnessed_pane` holding the
session's immutable pane identifier and `agent_witnessed_at` holding the time. No process id ever
goes into the manifest. Section 4.4 says what the stamp is for.

### 4.2 The drop edge

On any tick where a witness exists, Tortie makes one read.

```
  ps -o stat=,ppid= -p <agentPid>
```

Measured on this machine at **2.5 ms**, median of 15 runs. Three answers.

| The read says | Meaning | Verdict |
|---|---|---|
| nothing, and the command fails | the process is gone | **drop** |
| a STAT containing `T` | the process is stopped, e.g. he pressed Control Z | not a drop |
| a ppid that is no longer the session's own process | the pid was reused by something else | **drop**, and the witness is cleared |
| anything else | the agent is still there | not a drop |

Then two facts already in `PaneFacts` are checked, being that the session's screen is not dead and
that the session's own process still holds the terminal. Nothing else is read and no tree is walked.

**One tick is enough on the way out.** Measure lane 1 sampled a Claude Code exit at 20 Hz for 4
seconds and got exactly one state change, at 0.583 s after the second Control C, with the process
table and the screen flags flipping together. There is no flicker to ride out.

### 4.3 Every signal, and its measured reliability

| Signal | What it is | Measured | Used here |
|---|---|---|---|
| The witnessed pid is gone | one `ps` on one process id | 2.5 ms, and correct on every shape below | **Yes. It is the whole rule** |
| The session's own process holds the terminal, being `+` in its STAT | already in the fleet table | 0 false positives over 12 shapes with the login shell gate, 6 over the operator's own 16 sessions without it | As a secondary check only |
| `keypad`, being DECKPAM | `#{keypad_flag}` | **Rejected.** It is a property of his dotfiles, not of a shell. Measure lane 1 traced it to `/Users/gdc/.oh-my-zsh/lib/key-bindings.zsh` lines 7 to 15, which install a widget that emits it. `zsh -f -i` reads 0 forever, and so do `bash --norc -i` and `sh -i` | No |
| `alternate`, being whether a full screen program owns the screen | `#{alternate_on}` | **Rejected.** qwen 0.21.9 left the full screen for 24.17 seconds while still alive | No |
| `pane_current_command` | already in the fleet table | **Rejected as a rule.** It reads `2.1.241` for Claude Code, because the binary resolves to a file whose name is the version, and `node` for cursor, gemini, pi and deepseek. It would be wrong for his default agent before anything else happened, and wrong again at every Claude Code self update, which is one of his two reasons for this feature | Only as a free trigger, see 4.5 |
| `#{window_activity}` | already in the fleet table | **Rejected.** `src/main/activity/panes.ts` line 145 reads it as `num(f[7]) * 1000`, so it carries whole seconds. An adversary typed six characters over 684 ms and read one identical value each time | No |
| The screen, read and compared | `capture-pane` | **Rejected as an emptiness test.** `capture-pane` strips the trailing space every prompt ends with, so a length comparison is exactly inverted. With the operator's own right side prompt the captured row reads 99 of 100 columns whether the line is empty or not | Only for the read back after typing, see section 8 |

### 4.4 The false positive defence, named

Six shapes look like a drop to a shape rule. The witness refuses all six and I measured five of them
myself.

| The shape | What a shape rule sees | What the witness sees | Measured |
|---|---|---|---|
| **A session Tortie just restored, command armed and unpressed** | the session's own process is the login shell, STAT `Ss+`, no children, screen shows a prompt. Identical to a drop | no witness was ever recorded for this session, so no drop can fire | Confirmed in the tree at `restore.ts` line 779, `argv: []` |
| He pressed Control Z | STAT `Ss+`, screen shows a prompt | the witnessed pid is still there, reading `T` | Yes, this lane |
| A pager, e.g. `less` | the pane's command reads `less`, then `zsh` again when he quits it | the witnessed pid is still gone and a pager cannot bring it back, so nothing changes | Yes, this lane |
| An ordinary command, e.g. `npm test` | a foreground child appears and then leaves, which Candidate C reads as an agent arriving and leaving | not the witnessed pid, so no edge fires and nothing is said | Yes, this lane, using `sleep` |
| A background job at the prompt | STAT `Ss+` with a child at `SN`. Candidate A's rule refuses this and it is a genuine drop | the witnessed pid is gone, so the drop fires correctly | Yes, this lane |
| A session that was always a shell | nothing distinguishes it | the manifest `agent` column is not `agent`, so it is never examined. `id-harvest.ts` line 331 already gates the same way | Measure lane 2 found this live on his machine, see section 5 |

The last row deserves a sentence of its own, because it is his first condition and the round found
it already satisfied. Measure lane 2 found a claude process, pid 18724, running
`claude --resume b3376da6-… --dangerously-skip-permissions` in a session whose manifest row is
named RUNSTORY FULL BUILD, whose `agent` column reads `shell` and whose `agent_session_id` is NULL.
He typed that himself into a session Tortie records as a plain shell. It must be refused, it is
refused, and no new mechanism is needed to refuse it.

### 4.5 The return trigger

A row that dropped keeps no extra read per tick. The trigger is free, being that
`pane_current_command`, already on the fleet line, is no longer the login shell's own name. That
field is not trustworthy as a rule and it does not have to be. It only has to be a cheap reason to
look.

On the tick it fires, Tortie makes two reads and no more.

| Read | Cost, median of 15 on this machine | What it gives |
|---|---:|---|
| `pgrep -P <the session's own process>` | 14.6 ms | the new process id |
| `ps -o command= -p <that process>` | 2.3 ms | the whole command line, so the binary, the resume verb and the conversation id when he typed one |

Both run once per return, never per tick. Measure lane 1 saw the new process 36 ms to 43 ms after
Enter, so the trigger fires on the first tick after his press.

**The fleet process table is deliberately not forced.** Candidate B forced it while any row was
waiting, and an adversary showed that forcing it hands two extra signals, being `noteCpu` and
`hasToolChild`, to every other session's verdict on ticks they would not otherwise have had them,
which moves the dot on an unrelated session. That is refusal 5 by a side door. Reading one process
id instead costs 17 ms once and touches nobody else's verdict.

**The return is confirmed over two ticks.** Measure lane 1 typed two resume commands with fake ids
and both processes were gone by 1.092 s and 1.641 s. A resume that fails looks exactly like a resume
that never happened, one to two seconds later. Nothing is written until the process has been alive
across two consecutive ticks.

### 4.6 What happens across a restart of Tortie

The witness is in memory, and that is what makes it immune to the restore shape. A drop that
happened while Tortie was closed leaves no witness, and Tortie must not invent one from the shape,
because inventing one from the shape is the defect that killed all three candidates.

The manifest stamp closes part of the hole honestly. At startup, a row whose `agent_witnessed_pane`
names **the same live session screen that is there now** is a row where Tortie genuinely watched an
agent in that exact screen. A restored session has a new screen identifier, so it carries no stamp
and gets no verb. For a stamped row, one reading of the fleet process table at startup decides
whether the agent is still there, and that costs one table read Tortie already takes.

The honest limit, stated rather than engineered around: a session whose agent left while Tortie was
closed **and** whose row was never stamped, being every row that exists on his machine today,
because nothing has ever written that column, shows no verb until an agent has been seen in it
once. Section 13 names this as the largest gap on day one.

---

## 5. The identity rule

**Adopt only on a positive match. The absence of a signal is never a match. Refusing to adopt is a
legitimate answer and it is the correct answer for five of the eleven agents.**

Adoption is two separate things and the split is the answer.

| The two adoptions | What it changes | What it requires | What a wrong answer costs |
|---|---|---|---|
| **Management** | Tortie watches the session as an agent session again. The verb goes away. Activity tracking, the excerpt and the age come back | only the return edge, being that a process is under the session again | a wrong dot for one second, which corrects itself |
| **Conversation binding** | Tortie writes `agent_session_id`, which is what a later Restore reads | the conversation id, read out of the running process or out of the agent's own record | the wrong conversation comes back later and the right one is hidden. This is the loss the whole feature exists to prevent |

### 5.1 Asking which conversation

Four sources, cheapest first, and a later answer overrules an earlier one.

| Order | Source | Latency after his Enter | Agents it serves |
|---|---|---:|---|
| 1 | the new process's own argv, parsed for an id | 0.06 s to 0.07 s | any agent, but only when he typed or pasted a command carrying an id |
| 2 | claude's own record at `~/.claude/sessions/<pid>.json`, taking `sessionId`, `cwd` and the screen it names | 0.80 s | claude |
| 3 | `lsof` on the new process, for the conversation file it holds open | 1.91 s, measured for codex | codex, cursor, antigravity |
| 4 | muse's new `runtime.session/route_facts` record, which names the screen and the process | 261 ms at session open, from the registry and not re-measured this round | muse |

Source 1 is fast and it is the one that can be wrong, so it may never stand alone past the two tick
confirmation. Measure lane 2 found two live codex processes on his machine whose argv names no
conversation at all, being one `codex resume` with no argument and one bare `codex`.

**Claude holds no handle on its own transcript.** Measure lane 2 ran `lsof` on four of his live
claude processes and each holds zero handles on any `.jsonl` under `~/.claude`. So source 3 does not
work for claude and source 2 does not exist for codex. A builder needs both.

### 5.2 What is written, and what is not

| The case | What Tortie does | Why |
|---|---|---|
| The confirmed id equals the row's | clear the drop state. **Write nothing** | Nothing was ever wrong |
| The row holds no id, one is confirmed, and `claimConversationId` accepts it | write it through the claim, at the strength `claimStrengthOf` gives the key | This is the `id-harvest.ts` line 333 hole, closed without opening a new one |
| The row holds no id, one is confirmed, and the claim is refused because another row holds it | **write nothing**, and say so | The shipped comment is explicit that two rows on one conversation cannot be undone, because there is no way to know which row is right |
| The confirmed id differs from the row's | **write nothing.** Offer him one menu item that asks | He is the only one who knows whether he meant to change which conversation this session holds |
| Nothing confirms an id within 120 seconds | **write nothing.** Management adoption only, and the row says Tortie cannot tell which conversation is open | The alternative is guessing, and a guess in `agent_session_id` brings back the wrong conversation later |

The fourth row is where two of the three candidates lost the argument. Both re-pointed
`agent_session_id` automatically on a mismatch and moved the old value to a second column. An
adversary showed that one paste into the wrong window then permanently rebinds that session to
another conversation, that neither candidate named any reader for the second column, and that
neither rebuilt `resume_argv`, so the row would name one conversation on screen and arm a different
one on restart. Tortie writes neither and asks.

### 5.3 The case that silently forks a conversation

Measure lane 2 found this live and it is worth its own paragraph, because it costs work and nobody
sees it happen. Claude's transcript path is derived from the working directory while the
conversation id is not. Resuming the same conversation from a different directory writes a second
file and keeps the id.

| File on his machine | Bytes | Asks | Asks also in the other file |
|---|---:|---:|---|
| `-Users-gdc-specstory-prepush/b3376da6-….jsonl` | 3,887,684 | 70 | 54 of 54 |
| `-Users-gdc-runstory/b3376da6-….jsonl` | 5,084,310 | 95 | 54 of 54 |

The shared asks carry identical original timestamps in both files. Claude's own record names the
working directory, so Tortie can see this happen at the moment it happens. This design does not act
on it and does not mention it on screen, because acting on it well needs its own decision. It should
be its own entry. What a builder must take from it now is one rule: resolve a claude conversation's
file by the directory the session is in **now**, never by the directory the row was created in.

### 5.4 Does the conversation id survive a resume

Measured for two agents and inferred for the rest, which is why sections 6 and 13 are careful.

| Agent | Evidence | Reading |
|---|---|---|
| claude | one controlled resume kept one file and one id across three processes. Separately, 10 of his 400 most recent transcripts carry 2 to 5 different CLI versions and exactly one id each | **Measured. The id does not change** |
| codex | one controlled resume created no new file, kept one `session_meta` line and held the original file open. Across his whole store, 0 of 25,742 rollout files reuse an id, and 0 of the 1,200 most recent user records carry a fork marker | **Measured. The id does not change** |
| pi, grok | 3 of 12 pi files and 2 of 16 grok files span more than one calendar day, and no id appears twice | Likely. Not measured |
| muse | 26 of 495 session files hold more than one screen record under one id | Near certain. Not measured |
| qwen, gemini | no resume exists in his corpus to read | **Unverified** |

---

## 6. Which agents this works for on day one

He uses thirteen. Two of them never run in a session at all. The table says what each one gets.

| Agent | Runs in a session | Drop seen | Verb offered | Return seen | Conversation confirmed when he types the resume himself | Prints its resume command as it leaves |
|---|---|---|---|---|---|---|
| claude | yes | yes | yes | yes | **yes**, from its own record at 0.80 s | yes, on `/exit`, measured on 2.1.241 |
| codex | yes | yes | yes | yes | **yes**, from the file it holds open at 1.91 s | yes, measured verbatim |
| muse | yes | yes | yes | yes | **yes**, from the record it writes naming the screen | not measured |
| antigravity | yes | yes | yes | yes | **yes**, from the files it holds open. Read from the registry, not measured this round | not measured |
| cursor | yes | yes | yes | yes | **probably**, from the store file it holds open, whose directory name is the id. Measured on his live process by one lane, not re-measured | not measured |
| gemini | yes | yes | yes | yes | only when the command he pastes carries the id, which its own printed line does | **yes**, measured live |
| pi | yes | yes | yes | yes | only when the pasted command carries the id | no line seen |
| grok | yes | yes | yes | yes | only when the pasted command carries the id | no line seen |
| qwen | yes | yes | yes | yes | only when the pasted command carries the id | no. It also did not exit within 25 s of a double Control C |
| deepseek | yes | yes | yes | yes | **no.** Its store is keyed on the workspace, and two sessions in one directory are not separable | no line seen |
| droid | yes | yes | **no** | yes | no. Tortie captures no conversation id for it, so there is nothing to arm | not installed on this machine |
| cursoride | no | not applicable | not applicable | not applicable | not applicable | not applicable |
| copilotide | no | not applicable | not applicable | not applicable | not applicable | not applicable |

**Read the table this way.** The drop, the verb and the return work for ten of the eleven agents
that run in a session on day one, because none of those three depends on the agent. Only the last
two columns are per agent. Confirming which conversation came back without his help works for five,
being claude, codex, muse, antigravity and cursor, and cursor is the one of those five that is
measured by one lane and not re-measured.

**The session shape matters more than the agent.** On his live server, 10 of his 16 sessions run
his login shell with the agent inside it and 6 run the agent as the session's own program. Only the
first shape can leave a shell behind, so this feature serves 10 of his 16 sessions today. The other
6 already get a verb when their agent exits, because the session ends and Restore appears. Making
the second shape reach this state as well means launching every agent under a shell holder, which
changes what dies when an agent dies. That is durability and it is its own phase.

---

## 7. The recommended surface

One word appears on the row. Nothing else changes anywhere.

### 7.1 Sessions on the right

```
 ┌ Sessions ──────────────────────────┐
 │                                    │
 │  ✳ api rewrite                  ●  │
 │  ✳ prime agent                  ●  │
 │  ✳ docs sweep       Resume      ○  │
 │  ▸ build shell                  ○  │
 │                                    │
 └────────────────────────────────────┘
```

The word sits where the worktree chip and the resume mark already sit. The dot stays hollow,
because nothing is running and that is true. The agent icon stays, because the row is still that
agent's session. The name, the position and the order do not move.

### 7.2 Sessions on top, with his terminal below

This is the placement that matters, because it is where his eyes already are.

```
 ┌───────────────┬─────────────────────────┬──────────────┐
 │ ✳ api rewrite │ ✳ docs sweep  Resume  ○ │ ▸ build shel │
 └───────────────┴─────────────────────────┴──────────────┘
 ┌─────────────────────────────────────────────────────────┐
 │  Goodbye!                                               │
 │                                                         │
 │  Resume this session with:                              │
 │    claude --resume 7f891378-5855-4776-ae75-57efeeb67bb6 │
 │                                                         │
 │  ~/projects/auth ❯ █                                    │
 └─────────────────────────────────────────────────────────┘
```

The two lines above his prompt were printed by his agent, not by Tortie. The word carrying the verb
is one line above them.

### 7.3 The sentence, in the card he opens by hovering

Today that slot says "Its conversation comes back after a restart." At this moment that sentence is
true and it points him at the wrong thing, because his conversation is not waiting on a restart. It
is one press away in the session he is looking at. Replacing that one sentence is most of the copy
in this phase.

```
        ┌────────────────────────────────────────┐
        │  docs sweep                            │
        │  claude · idle · 2m                    │
        │                                        │
        │  The agent left at 14:22. Its          │
        │  conversation is still here, and       │
        │  Resume puts the command back on       │
        │  your prompt.                          │
        └────────────────────────────────────────┘
```

Four sentences, and only ever one of them. **None of them ever claims that an agent is running.**
That refusal is what Candidate C got wrong, and it is the difference between a card that is quiet
and a card that is untrue.

| When | The sentence |
|---|---|
| Normal, an agent is there | Its conversation comes back after a restart. This is today's sentence and it does not move |
| The agent left and nothing has run since | The agent left at 14:22. Its conversation is still here, and Resume puts the command back on your prompt. |
| Something is running here again and Tortie has not yet been told which conversation | Something is running here. Tortie is waiting to see which conversation it is. |
| A different conversation was confirmed | A different conversation is open here. Tortie is still holding the one it saved. |

**The verb is hidden while anything is running in the session.** That is not a limitation, it is the
rule. Typing into a session that a program owns is how the armed text reaches a program in raw mode,
and an adversary measured that changing a file on disk. If he runs `npm test` in a session that
dropped, the word goes away for the length of the run and comes back after. Tortie says nothing
about it either way.

### 7.4 The menu he opens, and the menu bar

```
        ┌──────────────────────────────────┐
        │  Resume conversation             │
        │    Puts the command on your      │
        │    prompt. You press Enter.      │
        │  ──────────────────────────────  │
        │  Rename                       F2 │
        │  Show loaded                     │
        │  Saved output                    │
        │  Copy directory path             │
        │  ──────────────────────────────  │
        │  End session…                    │
        └──────────────────────────────────┘
```

The sublabel slot is already used by `BARE_RESTORE_SUBLABEL`, so it needs nothing new. The item can
never appear beside Restore, because Restore requires the session to be over and this state requires
it to be alive. The same item goes into the Session menu in the menu bar, which is what the house
rule requires of any phase that adds a surface, and it is the only surface that works in session
focus mode, where the session list is hidden by design.

### 7.5 The four things he is told after he chooses it

These come free from `noteForLanding` in `remote-arm.ts`, reworded for a local session.

| Landing | What he reads |
|---|---|
| `armed` | The command is on your prompt. Press Enter to bring the conversation back. |
| `twice` | There are two copies of the command on the line. Clear the line and choose Resume again. |
| `absent` | Tortie typed the command and it is not on the screen. Nothing ran. |
| `unknown` | Tortie typed the command and could not read the screen to check. |

Saying "it is not there" when nobody looked is the shape of dishonesty the restore gate already
split apart, and this design inherits that split rather than re-deciding it.

---

## 8. The arming, and where his Enter is

**His Enter is the Enter key on his own keyboard, at the end of the line Tortie typed, in the
session he is already looking at.** There is no other path and nothing else runs anything.

```
   he chooses Resume
        |
        v
   re-read this ONE session now, 4.1 ms
     the session's own process still holds the terminal
     no process under it
     the witness is still gone
        |  any of these fail -> refuse, type nothing, say why
        v
   read the screen, count copies of the text, 3.9 ms
        |
        v
   compose from the manifest row: buildArmedCommand(resume_argv)
        |
        v
   type it, with NO Enter
     send-keys -t <session> -l <text>
        |
        v
   read the screen again, count copies, 3.9 ms
        |
        v
   armed / twice / absent / unknown  ->  one sentence
        |
        v
   HE PRESSES ENTER     <- the only press that starts anything
```

**The re-read is the guard the candidates lacked.** Candidate B armed from a state a poll had
decided up to 2 seconds earlier, and an adversary showed the armed text landing inside a running
agent's input box, where his next Enter sends it to the model as a message. Reading the one session
again at the moment of the press costs 4.1 ms and closes that window to the width of one tmux call.

**What the read back proves, and what it does not.** I measured this and it is an honest limit. The
count proves the text is on the screen. It does not prove the line is clean. With `rm -rf build`
already typed, Tortie's text landed on the end of it and the count still read 1, which lands
`armed`.

```
   Gregs-MacBook-Pro-2% rm -rf buildclaude --resume 7f891378-5855-4776-ae75-57efeeb
   67bb6
```

There is no space between the two, and there is no test on this machine that proves an input line is
empty. That single fact is why Tortie never types unasked, and it is the whole of the case against
Candidate A. When he asked for the verb one moment ago, the line is what he left it, and he is
looking at it. When he did not ask, Tortie has no such assurance and types nothing.

**One optional check, biased toward refusing.** At the drop edge Tortie may record the cursor column
of the freshly painted prompt, and refuse to type when the column differs at the moment of the press.
It fails safe in one direction, being that a prompt whose width changed between the two moments makes
Tortie refuse when it did not need to, e.g. after a `git add` changes what his prompt shows. It fails
unsafe in the other, being that a prompt that redraws back to the same column lets a dirty line
through. It is worth building only because both failures are better than the alternative, and a
builder should measure his own prompt's stability before pinning it.

**Enter is sent zero times.** `typeIntoPane(target, text, false)` at `restore.ts` line 1090 already
does exactly this and its quoting rules do not move. The door in `src/main/machines/exec-plane.ts`
that refuses a text carrying a newline, a carriage return or any other control character is the one
`remote-arm.ts` uses, and `build/conformance-machines.mjs` counts its call sites. A local arm should
go through the same door for the same reason.

---

## 9. The Zen argument

The line this is nearest to is this one.

> Only a question, decision or failure should rise above the surface.

**The case that a session that dropped to a shell is a question.** The Zen says the interface should
answer one question at a glance, being **What needs me now?**. A conversation sitting one command
away, with nothing on screen saying so, and with the one sentence Tortie does say pointing him at a
restart instead, is a thing that needs him. The Zen also says nothing important gets lost.

**The case that it is not, which is the one this document takes.** He caused it. He pressed Control C
or typed `/exit`, one second ago, while looking at the screen where he did it. A thing that rises to
tell a person what they just did is the console the next refusal names.

> **Not a supervisor's console.** Tortie never asks the human to watch an agent work.

So the state does not rise. It does not take focus, it does not chime, it does not touch the dot, it
does not roll up into the project tab and it does not appear in the attention overlay. One word
appears in the place he already looks for the things he can do to a session.

**The refusal this is nearest to is the dashboard.**

> **Not a dashboard.** No counters, no activity feeds, no progress theatre. A number that rises on
> its own is not a signal, it is noise in a nicer font.

It is on the right side of that line for three reasons the line itself gives. It is not a number, so
nothing rises. It is not a feed, because it reports nothing about work being done and disappears the
moment anything is running. And it is not a report at all, it is a verb. The Zen's objection to a
dashboard is that it asks a person to read state and do nothing with it. This asks him to read
nothing and gives him the one action he wants.

**The honest concession.** A verb that appears because a background poll noticed something is the
shape of the thing the Zen refuses, and this document does not pretend otherwise. What keeps it on
the right side is that it appears only where Tortie watched an agent alive and then watched it go, it
is bounded by his own actions, it never counts anything, and it goes away by itself the moment the
action behind it stops being available.

> Like its namesake, Tortie is patient, watchful and difficult to dislodge. It keeps its place,
> notices everything, and speaks only when something is worth the human's attention.

**Phase 23 refusal 5 is respected structurally rather than promised.** `SessionStatus` gains no
member. `statusVisual` is not edited. `applyDetectedStatus` is not called on this path and
`setStatus` is not called. The new fact reaches the renderer as its own field, so there is no code
path from this state to a dot. The word `idle` on the card is a word this phase does not write and
does not change, and it is a true statement about a session with nothing running in it. The one way
this could have reached the status machine was Candidate B's forced fleet process table, and section
4.5 refuses it for that reason.

---

## 10. What it costs, and what runs while he is not looking

### 10.1 Per tick

The poll is unchanged at 1 Hz while a window has focus and 0.5 Hz when none has, being
`STATUS_POLL_MS = 1_000` and `STATUS_POLL_IDLE_MS = 2_000` at `src/main/sessions/core.ts` lines 312
and 313. One candidate stated the unfocused rate as 2 Hz, which is backwards, and every unfocused
latency figure in it was understated by a factor of two.

| Path | New work | Measured on this machine |
|---|---|---|
| An ordinary tick, agent running | recording the witness from a table already read | 0 ms |
| An ordinary tick, no session has dropped | nothing | 0 ms |
| Each tick where a session has a witness | one `ps -o stat=,ppid= -p` on one process | **2.5 ms**, median of 15 |
| The tick a session drops | nothing extra. The verb is drawn | 0 ms |
| Each tick while a session sits dropped | nothing. The return trigger is a field already read | 0 ms |
| The tick something appears in a dropped session | `pgrep -P` then `ps -o command= -p` | **14.6 ms** then **2.3 ms**, once |
| While waiting for the conversation answer, codex, cursor and antigravity only | one `lsof` per second, for at most 120 seconds | 1.91 s to the answer, the call itself not timed by this lane |
| He chooses Resume | one targeted session read, two screen reads, one type | **4.1 ms**, **3.9 ms** twice, one send |

For comparison, the fleet process table Tortie already reads costs **18.4 ms** here, and the widened
version carrying command lines was measured at 31.0 ms by another lane. Neither is widened and
neither is forced.

### 10.2 Latency he would experience

| Stage | Time |
|---|---|
| His Control C to the agent process actually being gone | 0.583 s, one measurement of Claude Code at 20 Hz |
| Waiting for the next poll, window focused | 0 s to 1.0 s |
| **The word appearing, window focused** | **0.6 s to 1.6 s** |
| The word appearing, no window focused | 0.6 s to 2.6 s |
| His Enter to the new process being visible | 36 ms to 43 ms |
| His Enter to the word going away, with the two tick confirmation | 1.0 s to 2.0 s |
| His Enter to the conversation being confirmed, claude | 0.80 s |
| His Enter to the conversation being confirmed, codex | 1.91 s |

**One free accelerator for his default agent.** Claude's `SessionEnd` hook already reaches
`onSessionEnd` at `src/main/sessions/core.ts` line 652, where today it only calls `activity.forget`.
Checking the witness there costs nothing and removes the poll wait entirely for claude, which is the
agent he uses most. It is an accelerator and not a dependency, and every other agent uses the tick.

### 10.3 What runs while he is not looking

Three things, and that is the complete list.

- The existing activity poll, which already runs and which this rides on.
- One 2.5 ms process read per tick, per session that has a witness, and only while it has one.
- The conversation question, for at most 120 seconds after something appears in a session that
  dropped.

No new timer, no new file watcher, no new background process, no request, and nothing that starts a
process. The only writes are one stamp when an agent is first seen in a session, and at most one
conversation id, through the claim, when the row held none.

### 10.4 Files

| File | Change |
|---|---|
| `src/main/activity/state-machine.ts` | the witness fields, the drop edge, the return trigger. Pure, returning a fact and never an `ActivityVerdict` |
| `src/main/activity/process.ts` | two small readers over one process id |
| `src/main/activity/claude-registry.ts` | keep `sessionId` and `cwd`. Two fields, already in the JSON |
| `src/main/activity/monitor.ts` | call the edges and report them through one new dependency beside `onDead` |
| `src/main/manifest/schema.ts` | one migration adding `agent_witnessed_pane`, `agent_witnessed_at` and `agent_left_at`, all nullable, through the existing `addColumnIfMissing` |
| `src/main/manifest/sessions-repository.ts` | read and write the three columns |
| `src/main/sessions/resume-in-place.ts`, new | the verb, the re-read, the arm, the read back, the two tick confirmation, the identity comparison |
| `src/main/machines/remote-arm.ts` | extract `countOccurrences`, `decideArmLanding` and `noteForLanding` so a local caller shares them rather than copying them |
| `src/main/restore/restore.ts` | export `typeIntoPane`, or move it beside `buildArmedCommand` |
| `src/main/sessions/id-harvest.ts` | admit one confirmed id for a row that holds none, through `claimConversationId` |
| `src/main/menu.ts` | one item in the Session menu |
| `src/shared/ipc/sessions.ts`, `src/shared/types.ts` | one call, one field |
| `src/renderer/state/resume.ts` | the four sentences |
| `src/renderer/app/session-actions.tsx`, `SessionDock.tsx`, `SessionStrip.tsx`, `styles/app.css` | the word and the two menu items |

`src/main/restore/command.ts` is not in the list. `buildArmedCommand`, `shellQuoteArgv` and
`agentDriftSentence` are reused unchanged. Reusing `agentDriftSentence` is worth naming, because his
first reason for quitting an agent is that it wanted to update itself, which is the case that
sentence already exists to describe.

### 10.5 The gate this phase owes

CLAUDE.md requires a conformance gate for a subsystem of this class and no candidate proposed one.
`npm run conformance:handback` should be pure, spawn nothing, open no manifest and launch no
Electron, and it should assert four things from fixture readings.

1. The witness rule refuses the restore shape, being a session with no witness whose process table
   and screen readings are identical to a drop.
2. Each of the six shapes in section 4.4 gets the verdict that section gives it.
3. A confirmed id that differs from the row's writes nothing.
4. A confirmed id for a row that holds none is written only when the claim accepts it.

---

## 11. What each candidate got right, and what killed it

Named so a later round does not re-derive the same three failures.

| Candidate | The part worth keeping | The defect that ended it | Confirmed by |
|---|---|---|---|
| A, The Armed Prompt | The finding that claude's `SessionEnd` hook is a free instant signal. The refusal to press Enter. The reuse of `buildArmedCommand` | Its emptiness gate cannot be built. Its own added rule, comparing the captured row's length to the cursor column, is exactly inverted because `capture-pane` strips a trailing space, and carries no information at all under his own right side prompt | An adversary, measured on two shells. The seconds resolution of `#{window_activity}` I confirmed myself at `panes.ts` line 145 |
| B, The Session Card | The whole surface, being one verb on the row, the hover sentence, the two menu items and the refusal to touch the dot. This document takes it | The detection rule is a shape, so it fires on every restored session. Forcing the fleet process table hands two extra signals to every other session's verdict, which moves an unrelated dot | An adversary, and I confirmed `argv: []` at `restore.ts` line 779 myself |
| C, The Watchful Shell | The edge rather than the level. The witness idea. The split between managing a session and binding a conversation. The refusal to write a guessed id | It witnesses any foreground child, so a pager and an ordinary command set and clear it, and its card then says an agent is running when `npm test` is running. It also lets the process table go 60 seconds after the drop, so the return it exists to catch is not seen | An adversary, and I measured the pager and the ordinary command cases myself |

All three found the same two things independently, which is why this document treats both as
settled. The first is that `claude-registry.ts` parses the strongest identity signal any agent
publishes and keeps neither field. The second is that `id-harvest.ts` line 333 means a conversation
started in a surviving shell is never recorded.

---

## 12. The phase, and what is not in it

| In | Out |
|---|---|
| The witness, the drop edge, the return trigger and the two tick confirmation | Any rule that reads a shape rather than a named process |
| One verb on the row, in both session layouts, plus the session menu and the menu bar item | Any dot, badge, count, toast, chime or attention overlay entry |
| The four card sentences, none of which claims an agent is running | Any sentence that states what is running when Tortie has not been told |
| Arming through the Phase 89 door, with the screen read before and after and the four landings | Any arm that types without re-reading the session at the moment of the press |
| Writing a conversation id only where the row holds none, only through `claimConversationId` | Any automatic re-pointing of `agent_session_id`, and any second column that nothing reads |
| Keeping `sessionId` and `cwd` in `ClaudeSessionEntry` | Any use of `pane_current_command`, `keypad`, `alternate` or `#{window_activity}` as a rule |
| `npm run conformance:handback` | Any change to `SessionStatus`, `statusVisual` or `applyDetectedStatus` |
| One stamp naming the screen an agent was witnessed in | Any process id in the manifest |
| Saying plainly which sessions it serves on the day it lands | Launching agents under a shell holder so fresh sessions reach this state. That is durability and its own phase |
| | Acting on the forked transcript in section 5.3. It needs its own decision |

**Tier 3.** It touches restore material, it writes to the manifest, it types into a live session the
person is looking at, and the failure mode is bringing back the wrong conversation. Every one of
those is on the Tier 3 list in CLAUDE.md.

**The decision gate.** Does the word appear when he quits an agent and stay away every other time.
If it appears on a session he restored and has not pressed Enter in, the witness is not doing its
job and the phase is not done.

---

## 13. What is not true

### 13.1 What was asked for and is not delivered

| What he asked for | What this gives | Verdict |
|---|---|---|
| A way back that is very easy and very obvious | One word on the row he is already looking at, plus a menu item and a shortcut | **Delivered**, with one gap. In session focus mode the session list is hidden by design, so only the menu bar item and the shortcut work there. No surface on a row reaches him in that mode and this document does not pretend one does |
| Tortie to continue managing it afterwards | Management adoption on the return, for all eleven agents that run in a session | **Delivered** |
| Detecting a resume he types himself | The return trigger, seen 36 ms to 43 ms after his Enter | **Delivered** |
| Binding that resume to the right conversation | Confirmed without his help for five agents, and for the rest only when the pasted command carries the id | **Partly.** Section 6 names every agent |
| Only where Tortie has the record | The manifest `agent` column, already there | **Delivered, for free** |
| It working after Tortie has been closed and reopened | Only for a row whose stamp names the live screen, and no row on his machine carries that stamp today | **Not delivered on day one**, and this is the largest gap. Every existing session must be seen with an agent in it once before it can ever offer the verb |

### 13.2 Unverified

- **Two of thirteen agents are unverified for whether a resume keeps the conversation id**, being
  qwen and gemini. His corpus holds no resume for either, so the claim that the id survives is
  assumed for both.
- **Four agents have no way to say which conversation they are in, from outside the session**, being
  gemini, pi, grok and qwen. For those, a resume he types by hand is confirmed only when the command
  he pasted carries the id. **deepseek cannot be confirmed even then**, because its store is keyed on
  the workspace and two sessions in one directory are not separable. **droid gets no verb at all**,
  because Tortie captures no conversation id for it and there is nothing to arm.
- **Cursor's binding is measured by one lane and not re-measured.** That lane read his live
  `cursor-agent` process holding a store file whose directory name is the conversation id. The
  registry's own harvest key for cursor is `cwd-newest`, which is a directory and not an identity, so
  the shipped code does not currently rely on what that lane measured.
- **Antigravity was measured by nobody this round.** No antigravity process was running. Its row in
  section 6 is read from `registry.ts`, where its harvest key is `fd-owner`.
- **Muse's latency of 261 ms is read from the registry and was not re-measured.** So is qwen's
  1,059 ms.
- **The two lanes disagree about how Claude Code exits.** One measured a double Control C ending it
  in 0.583 s and printing no resume line. The other measured a double Control C one second apart
  **not ending it at all**, and `/exit` ending it and printing two lines including the exact resume
  command. Nobody drove a double Control C to a clean exit on the current version and then read the
  screen. **A phase built on this must measure claude's Control C exit path first**, because the
  drawing in section 7.2 pairs the timing from one lane with the printed lines from the other, and
  no single measurement produced that screen.
- **Qwen's exit is unexplained.** A double Control C did not end qwen 0.21.9 within 25 seconds.
- **Nothing in this round ran inside Electron.** No lane launched one and `npm run shot` was never
  run. Every claim about which tick reads what is read from `monitor.ts` lines 285 to 302 and
  `core.ts` lines 312 and 652, not observed running.
- **No agent's real exit was measured by the author of this document.** Every probe in this lane used
  `sleep` and `less` standing in for an agent. That proves the process and screen shapes exactly. It
  proves nothing about any agent's own exit behaviour, and the per agent readings are inherited.
- **The `lsof` call was never timed.** One lane measured the answer arriving 1.91 s after Enter for
  codex. Nobody timed the call itself, and a builder should before putting it on any repeated path.
- **Fish and nushell were not tested by anybody.** The rule does not depend on the shell, because it
  reads one process id, so it should hold. The login shell name comparison used as a secondary check
  does depend on the shell.
- **No remote session was tested.** A session on another machine carries no local process table at
  all, so this design does not serve one, and it should say so rather than degrade quietly.
- **The `conformance:handback` gate does not exist.** It is proposed here and nothing was written.

### 13.3 Estimated, and labelled as such

- **The two tick confirmation on the return is arithmetic**, taken from the 1,000 ms poll constant
  and one lane's measurement of two failed resumes dying at 1.092 s and 1.641 s. Nobody watched a
  real failed resume against a real tick.
- **The 120 second window for the conversation question is a choice, not a measurement.** Nobody
  measured how long an agent can take to publish its conversation after a resume.
- **The cursor column check in section 8 is a design choice with both failure directions named and
  neither measured on his own prompt.** His `.zshrc` sets a right side prompt, which does not move the
  cursor column, and his left prompt carries git state, which does. A builder must measure it.
- **The file list in section 10.4 is read from the tree and no line was written.** No size estimate is
  given because none would be honest.

### 13.4 Assumed

- It is assumed that the case is a session running his login shell with the agent as a child, which
  one lane measured for every restored session. On his live server 10 of 16 sessions have that shape
  and 6 do not, so this feature serves 10 of his 16 sessions as measured.
- It is assumed that a screen identifier is not reused inside one running server, which is what makes
  the manifest stamp in section 4.6 safe. tmux assigns them monotonically and this was not tested.
- It is assumed that one session holds one screen. A search for `split-window` under `src/main/`
  returned nothing, which is the evidence for it.
- It is assumed that a process id read one second apart is the same process when its parent still
  matches, which is why the drop read asks for the parent as well as the state. Reuse inside one
  second was not measured and is treated as impossible rather than proven so.
- It is assumed that the operator wants the verb hidden while a command is running in a dropped
  session. The alternative is offering a verb that would type into a running program, which section 8
  refuses on measured grounds.
- It is assumed that the six sessions of his sixteen that run the agent as their own program are
  outside this feature rather than underserved by it. They already get Restore when they end.

### 13.5 Two files left under his home

The identity lane created these while probing and deliberately left them rather than deleting
anything under his home directory. He may remove them at will.

- `/Users/gdc/.claude/projects/-private-tmp-claude-501--Users-gdc-gmux-69469eba-62a7-4552-8d1e-1ba54287a99f-scratchpad-probe-claude/`, holding one 74,925 byte transcript and an empty directory.
- `/Users/gdc/.codex/sessions/2026/08/23/rollout-2026-08-23T16-14-08-01a03042-5508-71b0-a9a9-8dca13f871ac.jsonl`, 131,434 bytes.

Answering the two trust prompts also wrote a trust entry for each probe directory into claude's and
codex's own configuration. Neither configuration file was inspected or edited.
