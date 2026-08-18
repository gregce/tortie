# 54. Remote machines, what actually works and what does not

**Written 2026-08-18 against origin/main d414746 at version 0.40.1.** Sixteen agents produced it:
six read the architecture, five built the local versus remote parity matrix, four attacked the
claim that a person can use a remote machine the way they use a local one, and one wrote the
answer. The operator asked for it after the whole remote ladder, rungs M0 through M6, had shipped.

**Read section 7 before acting on anything here.** Nothing in this document was driven against a
real second machine, because no harness in this product has ever contacted one.

---

{"summary": "How remote ssh and tmux actually works in Tortie, and whether a person can use a remote machine the way they use a local one", "agentCount": 16, "logs": ["[stall] agent "parity:agent-layer" stalled (no progress) after 341s \u2014 retrying (1/5)", "[stall] agent "parity:lifecycle" stalled (no progress) after 370s \u2014 retrying (1/5)"], "result": "# Remote machines in Tortie: how ssh and tmux actually work, and whether you can use a machine the way you use this Mac

Tree read: `/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/wt-perf`, a clean read only worktree at origin/main `d414746`, version 0.40.1. Every file and line below is from that tree, checked rather than quoted from a document.

---

## 1. The answer first

Partly, and the line falls in a place you can see from one sentence. **Once a session exists on a machine it behaves almost exactly like a local one, and it survives quit, crash and reboot better than a local one does. Everything about getting a session to exist, and everything about knowing what it is doing, is worse.** You cannot pick a folder over there, you cannot pick an agent that only exists over there, no hotkey can create over there, the status dot does not move over there, no conversation comes back over there, and on this tree the version gate refuses a machine unless its tmux prints exactly `3.6a` or `3.7b`. That last one is not a judgement call. `src/main/tmux/version.ts:148` says it in the tree's own words: "every one of them is refused today."

---

## 2. How it works

### The picture

```
  THIS MAC (Electron main)                 ssh                  THE FAR MACHINE
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500         \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500        \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  execOn(ctx, verb)                                             sshd
    list / new-session / kill /  \u2500\u2500\u2500\u2500\u2500\u2500\u2510                          \u2502
    rename / set-option /              \u2502                          \u251c\u2500\u25b6 tmux -L gmux -f /dev/null
    show-options / capture-pane        \u2502                          \u2502      <one verb, then exits>
                                       \u2502                          \u2502
  remote-run.ts, 7 frozen scripts \u2500\u2500\u2500\u2500\u2500\u2524                          \u251c\u2500\u25b6 $SHELL -lc '<one of 7>'
    store-list, store-copy,            \u2502                          \u2502      harvest, image, review
    image-put, review-list, ...        \u2502                          \u2502
                                       \u251c\u2500\u2500\u25b6 ONE ssh connection    \u2502
  TmuxControlClient, 1 per machine \u2500\u2500\u2500\u2500\u2524    per machine           \u251c\u2500\u25b6 tmux -L gmux -C
    long lived child process           \u2502    ControlMaster=auto    \u2502      new-session -A
    reads %sessions-changed,           \u2502    ControlPath=          \u2502      -s gmux-control
    %session-renamed, %exit            \u2502      /var/folders/.../   \u2502
                                       \u2502      tortie-mux/         \u2502
  AttachHost, 1 per VISIBLE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25b6\u2502      m-<12 hex>          \u251c\u2500\u25b6 tmux -L gmux -u
    session, inside node-pty           \u2502    ControlPersist=60s    \u2502      attach-session -t '=$4'
    keystrokes out, bytes in           \u2502    ServerAlive 5 x 3     \u2502
                                       \u2502                          \u25bc
  manifest (SQLite, this Mac only) \u25c0\u2500\u2500\u2500\u2518                    THE FAR TMUX SERVER
    one row per remote session                                socket -L gmux
    machine_id = the machine                                  conf -f /dev/null
    project_path = THIS Mac's folder                          12 options set by command
    cwd          = the FAR folder                             exit-empty off
    argv[0]      = the FAR binary path                        sessions carry @gmux-id,
                                                              @gmux-agent, @gmux-name,
  saved copies of the screen \u25c0\u2500\u2500\u2500\u2500 every 120 s,               @gmux-project, and the pane
    3 generations, this Mac          8 sessions per pass      env GMUX_SESSION_ID + GMUX_MANAGED
```

Three planes share one ssh connection per machine. The count of connections does not grow with sessions, because `sshOptions` always sets `ControlMaster=auto` and a per machine `ControlPath` (`src/main/machines/ssh.ts:244`). The count of ssh **processes** does grow: 1 background master, 1 control child, 1 attach process per visible session, plus one short lived process per command while it runs.

| Plane | What it runs | Opens when | Lives for | On failure |
| --- | --- | --- | --- | --- |
| Exec | `ssh <9 options> <host> '<tmux> -L gmux -f /dev/null <verb>'` | Every one shot verb | One command, 10 s timeout | Classified, then mapped onto the local error codes |
| Control | The same, plus `-C new-session -A -s gmux-control` | Once per machine, after a version read | The whole app run | Every row on that machine goes to `unknown`. Retries forever, 500 ms doubling to 10 s |
| Attach | `ssh -t <9 options> <host> '<tmux> ... attach-session -t' '=$4'`, inside node-pty | One per visible session | While the pane is on screen | An overlay says the session ended unexpectedly, with a Reconnect button. No automatic reattach |

Only 11 tmux verbs may cross. Four are refused by name and stay refused: `kill-server`, `attach-session`, `send-keys` and `respawn-pane` (`src/main/machines/exec-plane.ts:231`).

### What happens when you create a session over there

1. **Sign in.** At launch, Tortie walks `machines.json`, skips any row you did not confirm, and prepares the rest in turn (`src/main/sessions/core.ts:768`). A machine that is asleep at that moment gets nothing for the rest of the run.
2. **Read the version.** `display-message -p '#{version}'`, or `<program> -V` over the login shell when no server is running.
3. **Gate on the version.** `decideRemoteVersionGate` accepts only strings in a two entry list (`src/main/tmux/version.ts:234`). Anything else stops here and nothing is started on that machine.
4. **Boot the server.** `start-server ; set-option -s exit-empty off`, as one call, because a server made with `-f /dev/null` would otherwise end itself when empty.
5. **Capture that machine's PATH.** `"$SHELL" -lc 'printf ...%s... "$PATH"'`, then `set-environment -g PATH` into that server.
6. **Assert 12 server options and read every one back.** A value that did not stick is reported rather than written again.
7. **Compose the launch argv BY BARE NAME.** No binary path and no session id are passed in (`src/main/machines/remote-sessions.ts:919`).
8. **Ask the machine where it keeps that one program.** `"$SHELL" -lc 'command -v <name>'`. No absolute answer is a refusal, before anything is created.
9. **Write the manifest row on this Mac, before the create line is sent.** `machine_id` names the machine, `argv[0]` holds the path that machine reported, `project_path` holds this Mac's project folder, `cwd` holds the far folder.
10. **Send the create.** `new-session -d -P -F '#{session_id}' -s <name> -c <cwd> -e GMUX_MANAGED=1 -e GMUX_SESSION_ID=<uuid> -- <bare argv>`.
11. **Stamp four session options over there.** `@gmux-id`, `@gmux-agent`, `@gmux-name`, `@gmux-project`. That plus the two pane variables is the whole of Tortie's state on the far machine.
12. **Start the feed** so the row appears at once, in the project tab you created it from, with a machine badge.

---

## 3. Your two doubts, answered

### Paths

**Your doubt is correct, and it is worse than you thought in one specific way.** There is no remote directory browser anywhere in the product, the far side folder is a free text string, and the sentence printed under that field promises something the code does not do.

What the create sheet does when you pick a machine:

- It clears the Directory field to empty (`CreateSessionModal.tsx:768`), so empty is the default state of every remote create.
- It removes the "Choose..." button, because that button opens the macOS folder panel and walks this Mac.
- It prints under the field: "Leave this empty to start in your home directory on that machine." (`machine-copy.ts:295`).

What then happens when you follow that instruction. The sheet sends no `cwd`. The renderer drops a `cwd` equal to the project path. Main fills the hole with `input.cwd ?? input.projectPath` (`core.ts:2463`, confirmed in this tree). `remoteCreateArgs` puts that on the far side's `-c` with no branch that omits it. So leaving the field empty sends `/Users/gdc/gmux` to the far machine. On a Linux box the create fails with "That machine has no folder at the path you gave, so nothing was started there", after you gave no path. On a second Mac with the same account name that path often exists, so the create succeeds and the agent starts in a different checkout with nothing on screen saying so.

Typing `~/gmux` fails too. The argument quoter single quotes the tilde, so the far shell never expands it.

**What happens when the two machines disagree about a path.** Five path values behave in three different ways.

| Value | Composed on | Interpreted on | Checked? |
| --- | --- | --- | --- |
| Session `cwd` | This Mac | The far machine | Never, on either side |
| Agent binary path | The far machine, by `command -v` | Nowhere. It is recorded only | Yes, a missing program refuses the create |
| Far tmux path | The far machine, at Add Machine time | The far machine | Yes, must be absolute, and it is inside the confirm hash |
| `project_path` | This Mac | Nowhere. It is a string stamped as `@gmux-project` | It must be a folder on this Mac |
| Saved screen copies | This Mac | This Mac | Not applicable |

`project_path` is `NOT NULL` (`schema.ts:32`), and for a remote session it holds **this Mac's** project folder. That is what puts the remote session in the right project tab, which is the behaviour you asked for. It is also why the Explorer, the git sidebar, search and Quick Open keep showing this Mac's files while the session runs somewhere else, with no label on any of those surfaces. Research 51 section 4.5 promised the copy "Files live on \\<machine\\>". That string does not exist in this tree.

One correction to an earlier reading, because it matters. While the machine is answering, the folder shown on the row is the far side's own `#{session_path}`, not the requested path. The requested path reappears the moment the machine goes quiet, and a Restore sends it again unchanged, because nothing ever writes the far side's answer back into the manifest.

A folder that lives only on the far machine cannot be a project at all. `addProject` refuses any path that is not a directory on this Mac (`core.ts:3145`), and the projects table has no machine column.

### Agents

**Tortie performs no agent discovery on the far machine, and Phase 72 did not add any.** What Phase 72 added is one question about one program, asked at the moment of a create.

The mechanism, exactly. `remoteBinFor` runs `"$SHELL" -lc 'command -v <bare name>'` over the far machine's own login shell, for the single agent you already picked. The answer goes into the manifest row's `argv[0]` as evidence, and the module states the rule itself at `remote-argv.ts:30`: "the recorded path is EVIDENCE about a machine, not an instruction." The launch on the far side stays by bare name.

That buys you one real thing. A create for an agent the far machine does not have is refused before anything starts, with a sentence naming the program and the machine, rather than opening a pane that dies. It does not buy you an inventory, and it fires only after you have already chosen from a board that describes a different computer.

**What happens when the two machines disagree about agents.**

| Case | What happens |
| --- | --- |
| Agent is here, not there | Clean refusal at create. Nothing is started. The sentence names the program, but it prints the machine's row id rather than the label you gave it. |
| Agent is there, not here | **You cannot select it at all.** The tile is drawn from the local scan and `selectAgent` returns early when `installed` is false (`CreateSessionModal.tsx:501`, confirmed). The caption then offers you the install command for this Mac, which changes nothing over there. There is no override and no other route. |
| Same agent, different path | Handled. `command -v` finds it and the row records that machine's path. |
| Same agent, different version | Not handled and not recorded. `writeRemoteRow` writes no `agentVersion` at all, and the recovery contract records `flagsVerifiedAgainst: 'never'`. Your launch flag presets were verified by a human reading `<bin> --help` on this Mac on 2026-08-09, and they are sent unchanged to an agent of unknown version. |
| Agent configured here with an absolute path in `agents.json` | Sent to the far machine verbatim, unasked (`remote-sessions.ts:960`). A `/opt/homebrew/...` path is handed to a Linux tmux. A later Restore strips it to a bare name and lets the far machine pick whatever answers to that name, so the restore can run a different program than the create did. |

The sheet is honest about the limit in one line: "The board above says which agents are installed on this Mac. Tortie has not checked what is installed on the other machine."

**The least evidenced step in the whole ladder, and you should know about it.** The launch is by bare name, and the thing that is supposed to make that safe is the far machine's login shell PATH written into its tmux server with `set-environment -g PATH`. `src/main/machines/remote-path.ts:33` says in its own header that this is **not** evidence that a remote pane gets that PATH, and that research 47 measured the local case twice with the opposite answer: the pane takes the client's PATH, and PATH is the one variable `-g` does not reach. On a machine the client is a tmux spawned by ssh in a non login shell. Nobody has measured a remote pane's PATH, and the smoke never checks that the agent process in a remote pane is alive. So an agent in `~/.local/bin` can be found by `command -v`, recorded in the row, and then not found by tmux in the pane. I could not drive this. It is unproven and it points the wrong way.

**Phase 73's environment refusal.** The refusal itself costs nothing, because the remote create never composes a launch environment for it to refuse. The cost is one layer up and it is older than Phase 73. The remote path never reads `entry.launch.env`, so two compiled agents lose their measured values:

- `cursor-agent` loses `FORCE_COLOR=1`, so the output loses colour.
- `grok` loses `GROK_PRIVACY_NOTICE_ROLLOUT=0`. The registry's own measurement says the first run banner appears in 12 seconds, its buttons are mouse only so a keyboard pane cannot clear it, and the reply never paints while it is up. A grok session on a machine should be expected to look mute.

A configured agent's `launch.envPassthrough` is dropped the same way. No module under `src/main/machines` reads the field, so an agent row that names an API key variable starts on the far machine without it and nothing says so.

---

## 4. The parity table

States: **same**, **works differently**, **degraded**, **absent**, **refused**.

### Family 1: Session lifecycle

| Capability | Locally | Remotely | State |
| --- | --- | --- | --- |
| Create from inside a project tab | Cmd-T. Both folders checked on this Mac, binary resolved to an absolute path, row written, `new-session` on socket `-L gmux` | Same sheet plus a machine dropdown. No local checks run. Argv by bare name, one `command -v`, row written, `new-session` over ssh. The dropdown lists confirmed machines whether or not Prepare succeeded | works differently |
| Choose the working directory | Prefilled with the project root. A "Choose..." button opens the macOS panel. A folder that is not there is refused | Field cleared to empty, picker removed, free text, no completion, no check. Empty sends this Mac's project path. The caption promises the far side's home directory | degraded |
| Create by hotkey, quick create board or empty state button | All three work and carry the agent's sticky flags | No route. None of them sends a `machineId`. The Cmd-T sheet is the only door, and it resets to This Mac on every opening | absent |
| Attach into a pane | node-pty runs `tmux ... attach-session -t '=$n'` | node-pty runs `ssh -t ... attach-session -t '=$4'`. Keystrokes, batching, watermarks and resize are the same code | same |
| Detach and leave it running | Kills the local pty only | Kills the ssh child, which ends one client over there. The session is untouched | same |
| What you see when the attach dies | Overlay: "This session ended unexpectedly", with Reconnect | The same overlay and the same words. For a machine the usual cause is the link, not the session, and the work over there continues. Detected in 19.3 s by the keepalive pair | works differently |
| Rename a running session | `rename-session`, then the manifest | `rename-session` on the id a completed list reported, then `@gmux-name` so the name survives a quit, then the manifest | same |
| Rename a session that is not running | Lands in the manifest. Works for restorable and exited rows | Refused. The menu still offers it. `boundRemoteRow` looks only at live rows and throws | refused |
| End the session | Pane detached, scrollback captured, capture **returns**, then `kill-session`, then status `exited` | Pane detached, `kill-session` sent. **No capture first.** The confirm still says the scrollback is saved first | works differently |
| The durable record after you end it | `exited`, with the resume argv intact | Memory says `exited` this run. The next completed pass writes `restorable` on the manifest row, so after a relaunch the same session offers Restore | works differently |
| Split into panes | App level tree of up to 6 independent sessions, each its own tmux session. No tmux pane splitting anywhere | The same. Split modules contain the word "machine" zero times, so local and remote leaves can sit side by side | same |
| The ended state inside a split leaf | Restore when there is material, Restart otherwise | No machine awareness. Restore can be offered where main's gate refuses it, and Restart is drawn with no guard. See finding 2 below | works differently |
| Move a session between projects | No such verb exists | No such verb exists | same |
| Which project tab it appears under | Plain string comparison of `projectPath` | The same comparison. The path is this Mac's project path, so the row does appear in the tab you created it from | works differently |
| The status dot: what it can say | 6 states, including `needs input` from the agent native oracles | 5 states. `needs input` is never produced. `restorable` reads "not running" rather than "saved" | degraded |
| The status dot: what makes it change | Activity poll every 1,000 ms focused, 2,000 ms otherwise, feeding 4 oracle tiers | One field, `#{session_activity}`, compared across two lists. On a connected machine there is no timer at all, so it moves only on tmux events | works differently |
| What the row draws beside the name | Icon, name, worktree chip, resume mark, status dot, history glyph | The same plus a machine badge. The worktree chip fires for nearly every remote row and says worktree when it means another computer. The resume mark is dropped | works differently |
| The verbs in the session menu | Rename, Restore, Restart, Show what it loaded, Saved output, Copy path, End or Remove | Restart is absent. "Show what it loaded" is disabled with a reason. "Review changes on \\<machine\\>" is added | works differently |

### Family 2: The agent layer

| Capability | Locally | Remotely | State |
| --- | --- | --- | --- |
| The agent board in the create sheet | Built from a scan of this Mac. A tile that is not installed refuses the click and offers an install command | The same board, unchanged. Its memo has no machine term. An agent only on the far machine can never be selected | degraded |
| Checking the agent is there first | `resolveBinary` walks 3 sources, records the absolute path, runs a shebang preflight, offers install plus "Try again" on a miss | One `command -v` over the far login shell. Refusal is a plain error line with no install command, no "Try again", no "Start it anyway", no shebang preflight | degraded |
| Recording the agent version | Read from the cached scan and written to the row | Never recorded. `flagsVerifiedVersion` is null, `flagsVerifiedAgainst` is `'never'` | absent |
| The per agent icon | Drawn from `session.agent` | The same component. The id comes from `@gmux-agent`, so a failed stamp draws the fallback glyph | same |
| The per agent hotkey | A native menu item creates in the active project | No route. It always lands on this Mac | absent |
| Launch flag presets | Appended after the agent's own argv | Identical, and they ride the far side's create line | same |
| The registry's `launch.env` | Merged into the pane environment | Never composed. `cursor-agent` and `grok` lose their measured values | absent |
| `launch.envPassthrough` | Probed from the login shell and put on the pane, never persisted | No module under `src/main/machines` reads the field. Dropped in silence | absent |
| Pre-assigning the conversation id | 4 of 11 launchable agents take a fresh uuid on a launch flag, and `cursor` runs `create-chat` for one | None, for any agent. `launchArgvFor` is called with no session id | absent |
| Harvesting the conversation id | A watcher starts at create, keyed on the realpathed cwd, the pane pid and the tmux id | A connected only listing for 4 of 13 agents. Any key that is not a true identity is `weak` remotely, so only `muse` can arm | degraded |
| Typing the armed resume command | Typed without Enter, so one keypress continues | Nothing types into a pane on another machine. `resumeArmed` is hard coded false | absent |
| Status oracle, running versus idle | `#{window_activity}`, the per pane clock of last output | `#{session_activity}`, which the local module says tracks clients rather than output and excludes for that reason | degraded |
| Status oracle, needs input | Agent native for claude and codex, generic detector for the rest. Drives the dot, Cmd-J and the bell | Never produced, by construction. The far list carries no pane title either, so even codex's title oracle is unread | refused |
| claude's hook channel | A settings file is written and spliced into both argvs | Not written and not spliced. The listener is bound to loopback here | absent |
| Last line excerpt and last output time | Emitted for every live session, coalesced to 15,000 ms | None. The monitor only samples rows with a local tmux binding, which a remote row never gets | absent |
| Per agent Shift and Enter key | From the registry table, at the xterm layer | The same table and the same code | same |
| Image and file drop | Any file, any size, per agent strategy. A folder adds a project | Images only, 90,000 bytes each, checked by magic number, written under the far home in `.tortie/images`. Everything else refused with a sentence. Nothing prunes the far directory | degraded |
| Image paste with Cmd-V, for the 2 clipboard agents | The bytes are already on this Mac's pasteboard | The same branch fires with no machine term. The keystroke crosses and the bytes do not, so the agent reads the far machine's pasteboard | degraded |
| SpecStory capture | A checkbox, both argvs wrapped, the answer remembered per agent | Not offered and not possible. The row disappears when a machine is picked, with no sentence naming it | absent |
| Restart | Recovers the flags and the capture choice, creates the replacement first, then kills the old | No remote restart. Two surfaces hide it and the split leaf does not. See finding 2 | absent |
| Configured agents from `agents.json` | Confirm gate on every create, path resolved here, shebang preflight | The same gate holds. A bare name is asked about. An absolute path is sent verbatim, unasked. A `~/` path is refused with a sentence naming a machine that was never asked | works differently |
| The Context view | Reads the agent configuration directories on this Mac | No remote version. With a remote session focused it still describes this Mac, unlabelled | absent |

### Family 3: Workspace surfaces

| Capability | Locally | Remotely | State |
| --- | --- | --- | --- |
| File Explorer, the tree | Lists the active project folder on this Mac | No remote tree. No machines channel lists a directory. Keeps showing this Mac's folder, unlabelled | absent |
| File Explorer, the file operations | New file, rename, move, trash and duplicate, all on this Mac | No remote equivalent, and the verbs stay enabled. They act on the local folder. 1 of the 7 frozen scripts writes anything, and it is the image upload | absent |
| Source Control sidebar | Full git, including stage, commit, branch, push and pull | No remote sidebar and no remote git write. Exactly 3 git verbs may cross, all read only. The sidebar keeps showing the local repo | absent |
| Knowing what changed in the session's folder | The Changes group, live, refreshed by the repo watcher | One menu item, "Review changes on \\<machine\\>". One shot, capped at 30 files, disabled when the machine is quiet | works differently |
| The editor, which files can be opened | Any file, from 5 routes | Only a file the review list reported, so only changed files, at most 30, only inside a git repository over there | degraded |
| The editor, where the two sides come from | `git show HEAD:` plus the local buffer | Both sides come from the far machine in one call. Verified by another agent driving it: 0 local file reads | works differently |
| The editor, editing and saving | Editable, Cmd-S writes | The write is refused **silently**. `save()` returns false with no message, and Monaco is left editable because the read only test does not check the remote flag | refused |
| Project wide search | ripgrep on this Mac, rooted at the project | None. The box still searches this Mac's folder, and its empty state names the local project | absent |
| Quick Open and the symbol palette | Over the local project root | None. No way to reach a file on a machine | absent |
| Diff, working copy against HEAD | Pierre diff, local both sides | The same component, both sides from the machine, read only, 2,097,152 bytes per side | works differently |
| Diff, a file at a commit | Full history and graph | Absent. The one allowed verb is baked as `git show "HEAD:$2"`, so no other revision can be named | absent |
| Markdown preview, the text | The saved file on this Mac | Offered on a review tab, and the text is the far machine's bytes | works differently |
| Markdown preview, images and links | Resolved against this Mac, correctly | The same resolver runs with far machine paths. A relative link opens an ordinary **local** editable tab at that absolute path | works differently |
| HTML preview | Root and file realpathed here, containment checked | Asks for a URL rooted at the far machine's path, resolved here. Usually fails. On a shared path it serves this Mac's page | works differently |
| SVG preview | Renders the tab's own text | The same code, and the text is the far machine's markup. Correct with no caveat | same |
| Image viewer and image before/after | Reads both copies from this Mac | Refused by construction. A binary file answers with a sentence instead | refused |
| Tab menu, Copy Path and Reveal in Finder | Both act on this Mac, correctly | Copy Path gives the far path, which is right. Reveal in Finder hands the far path to this Mac's Finder | works differently |
| A label saying which machine the files are from | Not needed | None on any workspace surface. The badge appears in 4 places, all of them session surfaces. The only exception is the review tab's tooltip | absent |

### Family 4: Durability

| Capability | Locally | Remotely | State |
| --- | --- | --- | --- |
| Survives a Tortie quit and comes back | Lives in the private tmux server here. One list at launch rebinds it | Lives in that machine's server, booted with `exit-empty off`. Quit sends nothing. One list at launch brings it back with its name, agent, folder and tab, all read from the far side | same |
| Restore after **this** Mac reboots | The local server died. Every row becomes restorable and Restore rebuilds it with replayed scrollback | Nothing over there stopped. The rows come back live. This case is better than local | works differently |
| Restore after the **far** machine reboots | No counterpart | Works after a relaunch or a press of Prepare. Within the same run it can stall. See finding 9 | degraded |
| What a Restore puts back | Folder, program, replayed scrollback, resume command typed | Folder and program only. The saved output is not put back and the resume command is never typed | degraded |
| The restore journal | Opened in a durable commit before any side effect, resolved once per launch | None. The remote branch returns before the journal opens | absent |
| Snapshots, when a copy is taken | 4 moments: quit, sleep, close before the kill, and death. Never on a timer | On a timer only, 120,000 ms per machine, 8 sessions per pass, and only while connected. Nothing at quit and nothing at End session | works differently |
| Reading the saved output | The menu item, one file on this Mac, capture time printed above | The same item, the same ring, 3 generations. The header names the machine and always uses this Mac's clock | same |
| What a saved copy can rebuild | A full launch recipe inside every capsule | The recipe is null by design. A remote capsule holds the id, the machine, the folder and the text | degraded |
| Rebuilding a lost manifest | Folds capsule recipes with the tmux stamps and proposes rows | Cannot rebuild a remote row. The survey only lists this Mac's socket, and the rebuilder never writes `machine_id` | degraded |
| The manifest row | Absolute local paths, a real recovery contract, the probed version | Written before the create line. `machine_id` names the machine, `argv[0]` is the far path, `project_path` is the local folder, `cwd` is the far folder. The recovery contract is empty in every field | works differently |
| Who may write `restorable` | Only a list completed on this Mac's socket. Rows on another machine are skipped by name | Only that machine's completed pass. `transport-lost` and `woke` write `unknown` on that machine's rows and no others | same |
| A copy of the agent's own conversation file | Not needed. The file is already here | While connected, 2 files per pass every 300,000 ms, 2,097,152 bytes each, 20,971,520 bytes per machine. It cannot be used to continue a conversation | works differently |
| Remove (the tombstone into Past Sessions) | Writes `discarded`, releases the claim, deletes the copies | Does not stick for any row the feed has held this run. See finding 4 | degraded |
| Recording what you knew when a machine is removed | No counterpart | One durable tombstone per row, carrying the label, the last status and 2 instants. Nothing is sent to the machine | works differently |
| The manifest backup ring | 5 verified generations, `VACUUM INTO`, hash checked | Identical, because a remote row is a row in the same file | same |
| Record of what the session loaded at launch | Walked and stored at create | Never recorded. The menu item is disabled with a reason | absent |
| What you are told when a machine is quiet | The bar says the sessions are untouched | The bar says they are not shown, and they are shown on the same screen, dimmed. The two disagree | degraded |

### Family 5: Setup and trust

| Capability | Locally | Remotely | State |
| --- | --- | --- | --- |
| Getting the target ready at all | None. The app boots and you create a session | 4 steps: a row in `machines.json`, a connection test, a confirmation, then Prepare. Prepare also runs at launch for confirmed rows | works differently |
| A confirm gate before anything runs | None for the 13 compiled agents. Configured agents have one | Every machine needs one. It refuses 4 ways, and an unconfirmed machine gets no context object at all | works differently |
| What the agreement binds | Nothing to bind | 5 fields: the id, host, user, port and far tmux path. Label and colour are excluded so a rename does not ask again. It binds which program runs, not its bytes | works differently |
| The connection test | No counterpart | One ssh inside node-pty with `BatchMode=no`, the only such call site. 60,000 ms deadline, 256 KB cap, 16 answer classes | works differently |
| Trusting the machine's identity | Nothing | Tortie's own known hosts file first, yours second and never written. Steady state uses `StrictHostKeyChecking=yes`, so an unknown machine is refused rather than asked about | works differently |
| Installing a key so Tortie can sign in | Nothing | One button. It writes the key and appends one line over there. **No ssh command Tortie composes ever names that key.** See finding 13 | degraded |
| The tmux version gate | A pair rule with a fallback screen and 2 ways forward | An exact match against a 2 entry list, no override anywhere. See finding 1 | degraded |
| Changing connection details later | Nothing to change | Edit `machines.json` by hand. Any change moves the hash and forces a new confirmation. Work already in flight keeps the old fields until you quit | works differently |
| Withdrawing a confirmation while work runs | Stops the next configured agent create at once | Deletes the record, and stops nothing already running. Every verb goes through a readiness check that never re-asks the gate | degraded |
| Removing (forgetting) a machine | No counterpart | 2 clicks, the question counts the sessions out loud, one tombstone per row, 0 commands sent. 3 things are left behind, being the local key, the far `authorized_keys` line and the host key record | works differently |
| The link goes down mid use | Rows go `unknown`, retry every 2,000 ms, nobody involved | Rows go `unknown` on that machine only, never `exited`. The list recovers on its own. The attached pane does not, and you press Reconnect | works differently |
| Getting a machine back after it was down at launch | Automatic | Nothing retries, and the Prepare button does not start the feed. See finding 7 | degraded |

---

## 5. What will bite you

Ranked by severity. Where an adversary found a mapper wrong, I have taken the adversary. Where an adversary only worried, it is in section 7 instead.

### Loses work

**1. The version gate probably refuses your machines, so none of the rest is reachable yet.** `decideRemoteVersionGate` accepts a version only if its exact string is in a 2 entry list, being `3.6a` and `3.7b`, and both were measured against a scratch server on this same Mac. There is no override flag, no environment variable and no setting anywhere in the tree. Ubuntu 22.04 ships 3.2a, Debian 12 ships 3.3a and Ubuntu 24.04 ships 3.4. The tree says it about your own machines at `src/main/tmux/version.ts:148`: "every one of them is refused today." You would read "Tortie has not measured the program this machine runs" at the Prepare button, with nothing started. Strictly this blocks the workflow rather than losing work, and it is first because nothing else can happen until it is fixed.

**2. Restart inside a split leaf deletes a remote session's record and starts the session on this Mac.** Two surfaces guard Restart with a remote test. `TerminalRegion.tsx:651` does and `session-actions.tsx:481` does. `SplitSurface.tsx:196` does not, and I confirmed that the split modules contain the word "machine" and the word "remote" zero times. `restart.ts:99` composes a create with no `machineId`, so main takes the local branch, and `discardSession` then does a hard delete of the manifest row and the saved copies. If the far folder path also exists here, which is likely between two Macs and certain when the Directory field was left empty, you get a local session wearing the remote one's name while the agent keeps running over there, and the remote record is gone with no undo. Traced through 5 files, not driven.

**3. End session promises to save the scrollback first and does not.** The confirm reads "This stops what is running in it. The scrollback is saved first, so you can restore this session later." That sentence has no machine branch. The remote kill detaches and sends `kill-session` with no capture (confirmed in this tree at `core.ts:2918`). The newest copy is whatever the 120,000 ms pass last took, so the agent's final answer can be missing. Quitting Tortie does not help, because the quit pass only captures rows with a local tmux binding.

### Blocks the workflow

**4. Remove does nothing to a remote session in the run you ended it in.** `core.removeSession` returns as soon as `forgetRemoteRow` finds the id in memory, which is true for every row this run created, saw or ended (confirmed in this tree at `core.ts:3018`). `markSessionRemoved` never runs, so nothing durable is written and the same broadcast redraws the row. It comes straight back reading "not running". It only works after you quit and relaunch. Another agent drove this against the product's own modules and printed the row coming back. No test in the tree covers `core.removeSession` at all.

**5. The status dot does not move on a machine with a live connection.** `armTimer` returns early when the machine is on the control feed (confirmed at `remote-sessions.ts:1932`), and both accepted tmux versions carry a measured control dialect, so every machine Tortie will accept takes the connection. A list then runs only on connect, on `%sessions-changed`, on `%session-renamed`, on your own create, kill, rename or restore, and on a wake. Between those, nothing re-reads status. An agent can work for 10 minutes and the row reads "idle" the whole time and still reads "idle" when it finishes. There is no manual refresh, because `refresh()` only lists this Mac's socket. The create sheet meanwhile prints "every 5 seconds while this window is in front, and every 30 seconds when it is not", which is the fallback cadence and not the normal one.

**6. The one field the remote status reads may not mean what the remote module says it means.** The remote list reads `#{session_activity}`. The local tier 1 module says at `activity/panes.ts:11` that this field tracks clients rather than output, that it froze at attach time while output flowed, and that it is deliberately absent from the local format. The remote module says at its own line 76 that it is evidence the session printed something. Those two statements are inside one tree and they disagree. If the local measurement holds, a busy remote agent reads idle even in the moments a list does run, and the value moves when you attach.

**7. The Prepare button does not start a machine's feed.** The `machines:prepare` handler calls `prepareMachine` and nothing else (confirmed in this tree at `ipc.ts:526`). The only production callers of `startMachineFeed` are the launch sign in, a create and a restore. So a machine that was asleep at launch stays at "unreachable" for the rest of the run even after Prepare reports success, and the badge sends you to the button that cannot fix it. The only ways out are to relaunch Tortie or to create a new session there.

**8. An agent that only exists on the far machine cannot be started there.** Covered in section 3. There is no way past the disabled tile.

**9. After a far machine reboot that clears the tmux socket file, nothing recovers on its own.** The poll accepts only tmux's own "no server running on \\<path\\>" as a completed answer of zero sessions. A missing socket file prints "error connecting to \\<path\\> (No such file or directory)" instead, which is read as a lost link, so every row sits at `unknown` with Restore refused, while the pane says the sessions are untouched. The control client's reconnect precheck also fails forever, because it asks a server that no longer exists. Nothing calls `ensureRemoteServer` except Prepare and a restore. Whether a reboot clears that directory was not measured by anyone, so this is stated as two branches rather than one.

**10. The launch is by bare name and nobody has measured a remote pane's PATH.** Covered in section 3. If the pane gets the short non login PATH, an agent in `~/.local/bin` is found by `command -v`, recorded in the row, and not found by tmux. The row would still read "idle", because the remote list carries no `#{pane_dead}` field and a remote row never enters the activity monitor, so the reaper that records a local death cannot run for it.

**11. No conversation comes back, for any agent, on any machine.** No remote create fixes a conversation id at launch, and nothing types a resume command into a pane on another machine. `resumeArmed` is false on every outcome. This is disclosed on screen rather than hidden, and it is still the product's central feature being absent on the remote path.

**12. The far machine's own agent environment values never cross.** `grok` should be expected to look mute. Covered in section 3.

**13. The Install key button writes a key that nothing uses.** I confirmed that `IdentityFile` and a bare `-i` appear zero times under `src/main/machines`. The key is written to `<userData>/gmux/machines/keys/machine-<12 hex>`, which is not a default ssh identity path and is not in any agent. So the re-test and every later sign in depend on whatever your own agent already offers, and nothing on screen tells you to add it.

### Wrong answer

**14. Leaving the Directory field empty sends this Mac's project path.** Covered in section 3.

**15. The Explorer, the git sidebar and search show this Mac's files while a remote session is selected, with no label.** You can stage and commit from that sidebar and the commit lands on this Mac's copy, which the remote agent never touched.

**16. A relative link inside a remote markdown review opens a local editable file.** The open request carries no remote field, so the tab id is the plain path and the tab is a normal local one. When the two machines share a path you read and edit this Mac's file inside what you reached through a review of the other machine.

**17. Cmd-V on a remote deepseek or antigravity session forwards the keystroke and no bytes.** The agent reads the far machine's pasteboard, which Tortie never wrote to. The drop path grew a machine branch in Phase 73 and this paste path did not.

**18. A configured agent with an absolute path runs one program at create and a different one at restore.** The create sends your Mac path verbatim. The restore strips it to the text after the last slash and asks the far machine for that name.

**19. The manifest's `cwd` is never corrected from the far side's own answer.** A path that was wrong once is sent again at every restore.

**20. "Last seen" freezes on a connected machine, because it is only written by a completed pass.** A session you watched all week can be tombstoned with Monday's date.

**21. A machine that cannot hold a session is still offered in the create sheet.** The dropdown filters on `usable`, which `ipc.ts:202` sets from the confirmation alone (confirmed in this tree). You pick it, type a name, press Create, and read "Tortie has not signed in to that machine yet. Open Settings and then Machines, and prepare it", which is the screen that just refused you.

### Confusing

**22. A far side folder that is missing does not mark the Directory field.** The sheet decides which field to blame by looking for the words "working directory" in main's message, and the remote sentence does not contain them.

**23. Every agent refusal names the machine's row id rather than the label you gave it.** "could not find claude on macpro" while your dropdown says "Mac Pro".

**24. The bar for a quiet machine says its sessions are not shown, directly above those sessions.**

**25. The worktree chip fires for nearly every remote session** and says worktree when it means another computer. It also disappears in the one case you most want a signal, which is when the far path and the project path are the same string.

**26. Reveal in Finder is offered on a remote review tab** and hands the far path to this Mac's Finder.

---

## 6. What would have to be built

For the workflow you described, which is opening a project tab, pressing Cmd-T, and starting a session on the Mac Pro the way you start one here.

| # | What | Rough size | Blocked by anything? |
| --- | --- | --- | --- |
| 1 | Measure more tmux versions and add them to the list, or add a way for you to accept an unmeasured one | Small, plus real measurement time | Blocked on a real machine. Nothing else matters until this lands |
| 2 | Fix the empty directory field. Ask the machine for `$HOME` and send that, or send no `-c` at all | Small. `machine-facts` already reads the far `$HOME` and `remote-image.ts` already builds paths from it | Nothing |
| 3 | A remote directory browser: one `machines:listDir` channel, one frozen script, one picker in the sheet | Medium | Nothing. The frozen script pattern and the 7 script catalogue are already there |
| 4 | Remember the last machine and the last remote folder per project | Small | Deliberate today. The sheet resets to This Mac on purpose so one Cmd-T and one Return cannot start a process on another computer |
| 5 | A remote agent list: one `command -v` sweep per machine at Prepare, cached per machine, and a machine term in the create sheet's board | Medium | Nothing technical. It needs a decision about what the board shows when a machine has never been swept |
| 6 | Guard Restart in the split leaf, and give `restart.ts` a machine branch | Small | Nothing. Two other surfaces already have the guard to copy |
| 7 | Make Remove work for a remote row: move the tombstone write ahead of the early return | Small | Nothing. `remote-sessions.ts:1276` already says the caller should do this |
| 8 | Capture the screen before a remote kill, and at quit | Small | Nothing. `capture-pane` is already on the allowed verb list and the capsule writer already exists |
| 9 | Move status off `#{session_activity}`, or add a periodic list beside the control connection | Medium | Blocked on measuring what the far side's fields mean. Settle the contradiction first |
| 10 | Make Prepare start the feed | Very small | Nothing |
| 11 | Re-prepare a machine automatically when its server is gone | Small | Blocked on the socket file question in finding 9, and on the hazard the tree flags against itself at `remote-server.ts:116` |
| 12 | Pass the pre-assigned conversation id on the remote create | Small | Nothing. The backlog already records this as owed item 2 |
| 13 | Type the resume command into a remote pane | Medium | `send-keys` is on the permanently refused verb list, so this needs a different mechanism or a decision to change that list |
| 14 | Carry `launch.env` to a remote session with `set-environment` rather than `-e` | Small | Phase 73 refused `-e` for a stated reason. `set-environment` is already allowed and does not put the value in the far process table |
| 15 | A "Files live on \\<machine\\>" label on the Explorer, the git sidebar, search and Quick Open | Small | Nothing. The string was specified in research 51 section 4.5 and never written |
| 16 | Machine aware Explorer and git over ssh | Large | Refusal 4 in CLAUDE.md does not block it, but it is the biggest single piece here and it needs its own research round |
| 17 | Name the installed key on every ssh command, or tell you to add it to your agent | Very small | Nothing |
| 18 | A machine route for the hotkeys and the quick create board | Small, plus a safety decision | The sheet's own comment says a remembered machine plus one Return is the case they were avoiding |
| 19 | `needs input` for a remote session | Large | Blocked by the oracles reading local disk. codex's title oracle needs no disk, so a partial answer is available by adding `#{pane_title}` to the remote list format |

---

## 7. What is not true and what nobody checked

**Nothing in this report, and nothing in this product so far, was driven against a real second machine.** Every remote number Tortie has ever recorded came from a scratch sign in server on 127.0.0.1 whose far side is this same Mac. `build/scratch-machine.mjs:24` says it in capitals: "IN EVERY HARNESS THAT USES THIS, THE REMOTE MACHINE IS THIS MAC." Every harness passes `/tmp` as the folder, which exists on both sides, so the case where two machines disagree about a path is the one case the test topology structurally cannot produce. No Linux machine and no tailnet host has ever been contacted by this product's harnesses.

What was actually done for this report. Six agents read the tree. Nobody launched Electron, took a screenshot, started an ssh process, contacted a machine or a tailnet host, or ran any tmux command, including a read only list of your server. What was executed is a small set of gates and probes that spawn nothing:

- `node build/conformance-machines.mjs`, which printed PASS and gave the measured exec, attach and create argv.
- `node build/conformance-agents.mjs`, which printed 13 compiled rows, 11 launchable, 4 pre-assign agents plus cursor.
- About 200 of the project's own unit tests over the remote modules, all passing.
- Several probe files kept outside the tree, driving the product's own pure functions with the transport replaced. Those produced the create argv for the empty directory case, the frozen status result and the Remove result.

I re-checked 12 of the load-bearing claims directly against this tree while writing, including the version list, `core.ts:2463`, `machine-copy.ts:295`, `selectAgent`, `SplitSurface`, the `removeSession` early return, `armTimer`, the prepare handler, the remote kill branch, the `usable` flag and the absence of `IdentityFile`. All 12 held. The worktree is unchanged.

Named unknowns, in the order they would change the answer:

1. **What PATH a pane gets on a remote machine.** Nobody has measured it, here or in this tree's whole history. It decides whether the bare name launch works at all. Settling it needs a second machine and a read of `printenv PATH` inside a remote pane, or a look at a pane that exited 127.
2. **What a far side tmux does with `new-session -c <path that is not there>`.** This decides whether the empty directory case stops you cleanly or starts the agent somewhere else. `REMOTE_DIR_MISSING` appears at 4 places in source and 0 places in any test, any harness or any document. The refusal rests on one untested regular expression matching tmux's own error text.
3. **What version of tmux your four machines run.** Not read. It decides whether any of this is reachable on them.
4. **What `#{session_activity}` actually reports.** Two modules in this tree disagree, and only one of them carries a measurement. Not settled.
5. **What a reboot does to the tmux socket directory** on Linux or on macOS. Not measured, so finding 9 is stated as two branches.
6. **How often a real tmux server emits `%sessions-changed`.** The frozen status finding rests on there being no periodic caller, which was verified by grep and driven with fake timers. If some tmux build emits that event for other reasons, the freeze is shorter than stated.
7. **The far side's sshd channel limit.** OpenSSH's `MaxSessions` default is 10 channels on one connection, and one machine's steady state uses 1 control child plus 1 attach per visible session plus each exec while it runs. No file in this tree mentions it and no probe measured it.
8. **Whether your own `~/.ssh/config` can redirect a machine row.** Tortie passes no `-F`, so ssh reads that file by its own default, and Tortie's code reads it nowhere. The interaction with the confirm hash was not tested.
9. **What the operator's ssh agent would offer after a key install.** Only the absence of `IdentityFile` was verified, not the outcome on a real connection.

Findings traced through code and not reproduced: the split leaf Restart, the Cmd-V paste, the configured agent absolute path cases, the Reveal in Finder case, the HTML preview case, and the far machine reboot create hazard where a server reborn implicitly would run at `history-limit` 2000 instead of 25000. Two worries that could not be triggered and are therefore not in section 5: the manifest reconstruction path drops `machine_id` entirely and would rebuild a remote row as a local one, and `ensureRemoteServer` accepts a missing socket file as "no server" and could start a second tmux server on a machine that is still holding live sessions, which the tree flags against itself at `remote-server.ts:116`.", "workflowProgress": [{"type": "workflow_phase", "index": 1, "title": "Architecture"}, {"type": "workflow_phase", "index": 2, "title": "Parity"}, {"type": "workflow_phase", "index": 3, "title": "Attack"}, {"type": "workflow_phase", "index": 4, "title": "Verdict"}, {"type": "workflow_agent", "index": 1, "label": "map:planes", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a36033334bfee710a", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408253, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Remote ssh and tmux architecture: the three planes, and whe\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787065189830, "tokens": 237574, "toolCalls": 107, "durationMs": 781577, "resultPreview": "{"area":"Remote ssh and tmux architecture: the three planes, and whether a person can use a remote machine the way they use the local one","answer":"SHORT ANSWER. A person can already create, attach to, type into, rename, kill and restore a session on a remote machine from inside a project tab, and the session appears in that same project tab with a machine badge. It is not yet usable the way the \u2026"}, {"type": "workflow_agent", "index": 2, "label": "map:local", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a4d35d8757475faab", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408254, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "The local model: what happens from the create sheet to a ru\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787064860360, "tokens": 150164, "toolCalls": 70, "durationMs": 452106, "resultPreview": "{"area":"The local model: what happens from the create sheet to a running agent in a tmux pane, and how agent discovery works on this Mac","answer":"Every fact a local create needs is read off the machine the app runs on, at the moment of the create, and none of it is stored per machine. The project path comes from the active project tab and is never typed. The working directory defaults to that p\u2026"}, {"type": "workflow_agent", "index": 3, "label": "map:remote-lifecycle", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a88831f166154f236", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408254, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "A person can create, attach, list, rename, kill and restore\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787065330067, "tokens": 294979, "toolCalls": 144, "durationMs": 921813, "resultPreview": "{"answer":"A person can create, attach, list, rename, kill and restore a session on another machine today, and the durability promise holds. The session and its agent keep running when Tortie quits, because the session lives in that machine's own tmux server and Tortie sends nothing to the machine on quit. On the next launch Tortie signs in to every confirmed machine and the rows come back with th\u2026"}, {"type": "workflow_agent", "index": 4, "label": "map:agents", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a30a7a365519ff543", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408254, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Tortie performs no agent discovery on the far machine, and \u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787064999786, "tokens": 160290, "toolCalls": 87, "durationMs": 591532, "resultPreview": "{"answer":"Tortie performs no agent discovery on the far machine, and it never has. The list a person picks from is scanned on this Mac only. What Phase 72 shipped as per machine argv capture is not discovery. It is one `command -v` question about the ONE agent the person already picked, asked at the moment of create, and its answer is written into the manifest row rather than onto any command lin\u2026"}, {"type": "workflow_agent", "index": 5, "label": "map:paths", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a72bdfc37e867f9ae", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408255, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "A remote folder cannot be a project in its own right. Every\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787065135931, "tokens": 192396, "toolCalls": 106, "durationMs": 727676, "resultPreview": "{"answer":"A remote folder cannot be a project in its own right. Every remote session hangs off a project whose path is a folder on this Mac, and the only thing that names the far machine's folder is a free text field the person types by hand. There is no remote directory browser, nothing checks the typed path before it is sent, and nothing remembers it for next time.\
\
The five path values behav\u2026"}, {"type": "workflow_agent", "index": 6, "label": "map:durability", "phaseIndex": 1, "phaseTitle": "Architecture", "agentId": "a333c65f002e874e1", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787064408255, "queuedAt": 1787064408246, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Durability and state for remote sessions: what each machine\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787065253768, "tokens": 260180, "toolCalls": 124, "durationMs": 845513, "resultPreview": "{"area":"Durability and state for remote sessions: what each machine stores, the restore gate in order, and what survives a reboot on either side","answer":"The durable state is split, and the split is clean. The far machine holds the running process and the session's identity, being four tmux session options and two pane environment variables, and holds nothing else of Tortie's. This Mac holds th\u2026"}, {"type": "workflow_agent", "index": 7, "label": "parity:lifecycle (retry 1)", "phaseIndex": 2, "phaseTitle": "Parity", "agentId": "a7fe74a192c9be81b", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787065330084, "queuedAt": 1787065330077, "attempt": 2, "lastAttemptReason": "stalled", "lastToolName": "StructuredOutput", "lastToolSummary": "Session lifecycle: create, attach, detach, rename, kill, sp\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787066583030, "tokens": 379056, "toolCalls": 150, "durationMs": 1252946, "resultPreview": "{"family":"Session lifecycle: create, attach, detach, rename, kill, split, move between projects, the session strip, the status dot and what the tab shows","rows":[{"capability":"Create a session from inside a project tab","local":"Cmd-T opens the sheet on the active project. Main checks that the project folder and the working directory are both directories on this Mac, resolves the agent to an ab\u2026"}, {"type": "workflow_agent", "index": 8, "label": "parity:agent-layer (retry 1)", "phaseIndex": 2, "phaseTitle": "Parity", "agentId": "a6e2b0aa5525a8833", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787065330085, "queuedAt": 1787065330077, "attempt": 2, "lastAttemptReason": "stalled", "lastToolName": "StructuredOutput", "lastToolSummary": "The agent layer (per agent icons, hotkeys, launch flags, la\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787066770066, "tokens": 374418, "toolCalls": 157, "durationMs": 1439981, "resultPreview": "{"family":"The agent layer (per agent icons, hotkeys, launch flags, launch environment, agent native status oracles, conversation id capture and resume, image drop, SpecStory capture)","rows":[{"capability":"The agent board in the create sheet (which agents a person may choose)","local":"The board is built from the agents:list scan, which runs in main and reads this Mac's login shell PATH and this\u2026"}, {"type": "workflow_agent", "index": 9, "label": "parity:workspace", "phaseIndex": 2, "phaseTitle": "Parity", "agentId": "a10033d16e08a4485", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787065330085, "queuedAt": 1787065330077, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "The workspace surfaces: File Explorer, Source Control, the \u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787066333387, "tokens": 209744, "toolCalls": 123, "durationMs": 1003302, "resultPreview": "{"family":"The workspace surfaces: File Explorer, Source Control, the editor when a file is opened, project wide search, the diff surfaces and the markdown preview. Every row says which machine the data on screen comes from. Tree read at /private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/wt-perf, origin/main d414746, version 0.40.1. SHORT ANSWER: five of the si\u2026"}, {"type": "workflow_agent", "index": 10, "label": "parity:durability", "phaseIndex": 2, "phaseTitle": "Parity", "agentId": "a4bead676e9672138", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787065330085, "queuedAt": 1787065330078, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Durability", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787066365896, "tokens": 231827, "toolCalls": 103, "durationMs": 1035811, "resultPreview": "{"family":"Durability","rows":[{"capability":"The session keeps running when Tortie quits, and comes back on relaunch","local":"The session lives in the private tmux server on this Mac and Tortie sends it nothing on quit. At the next launch ensureServer runs, one list completes, and reconcile rebinds the row to its live tmux id with status running. Nothing is restored and nothing is recreated.","r\u2026"}, {"type": "workflow_agent", "index": 11, "label": "parity:setup-and-trust", "phaseIndex": 2, "phaseTitle": "Parity", "agentId": "a8f4e75838c2202aa", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787065330085, "queuedAt": 1787065330078, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Setup and trust: adding a machine, the confirm gate, the co\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787066518765, "tokens": 280042, "toolCalls": 106, "durationMs": 1188680, "resultPreview": "{"family":"Setup and trust: adding a machine, the confirm gate, the connection test, key install, the tmux version gate, forgetting a machine, and a link that drops mid use","rows":[{"capability":"Getting the target ready to hold sessions at all","local":"There is no setup. The app boots, ensureServer runs start-server on the private socket with resources/gmux-tmux.conf, and a person can create a \u2026"}, {"type": "workflow_agent", "index": 12, "label": "attack:agent-mismatch", "phaseIndex": 3, "phaseTitle": "Attack", "agentId": "aeabfcd417a726825", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787066770091, "queuedAt": 1787066770081, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Attack the agent story. I assumed the far machine has a dif\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787067419052, "tokens": 230706, "toolCalls": 62, "durationMs": 648961, "resultPreview": "{"lens":"Attack the agent story. I assumed the far machine has a different set of agents than this Mac, and I walked each case: an agent the far machine has and this Mac does not, an agent this Mac has and the far machine does not, the same agent at a different path or from a different installer, and an agent the person configured here with custom flags used over there. I read the create path, the\u2026"}, {"type": "workflow_agent", "index": 13, "label": "attack:path-mismatch", "phaseIndex": 3, "phaseTitle": "Attack", "agentId": "a2ee68681c762db24", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787066770092, "queuedAt": 1787066770082, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Attack the path story. I looked for every place a path is c\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787067372794, "tokens": 199661, "toolCalls": 60, "durationMs": 602702, "resultPreview": "{"lens":"Attack the path story. I looked for every place a path is composed on one machine and interpreted on the other, and for anything durable that records a path without recording which machine it belongs to. I worked read only in the worktree at /private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/wt-perf, origin/main d414746, version 0.40.1, and it is still\u2026"}, {"type": "workflow_agent", "index": 14, "label": "attack:mental-model", "phaseIndex": 3, "phaseTitle": "Attack", "agentId": "ae0e6e5097f148792", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787066770092, "queuedAt": 1787066770082, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Attack the mental model. I walked the exact flow the operat\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787067156408, "tokens": 182550, "toolCalls": 37, "durationMs": 386315, "resultPreview": "{"lens":"Attack the mental model. I walked the exact flow the operator describes, which is opening a project tab, pressing Cmd-T, and starting a session on the Mac Pro the way he starts one here, and I looked for every place the shipped product asks him to do something extra, know something extra, or accept something worse. Tree read at /private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-99\u2026"}, {"type": "workflow_agent", "index": 15, "label": "attack:daily-use", "phaseIndex": 3, "phaseTitle": "Attack", "agentId": "a925b20f9c14b1406", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787066770092, "queuedAt": 1787066770082, "attempt": 1, "lastToolName": "StructuredOutput", "lastToolSummary": "Daily use of a remote machine over a week, not first setup.\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787067586481, "tokens": 250869, "toolCalls": 77, "durationMs": 816388, "resultPreview": "{"lens":"Daily use of a remote machine over a week, not first setup. I assumed the machine is added, confirmed, prepared and working, and then attacked the states a person actually meets: the agent working for a long time, the link dropping, the Mac sleeping, the far machine rebooting, ending a session, removing a session, and removing a machine. Two probes were driven against the product's own mo\u2026"}, {"type": "workflow_agent", "index": 16, "label": "verdict", "phaseIndex": 4, "phaseTitle": "Verdict", "agentId": "a57a4a50313b53f6b", "model": "claude-opus-5[1m]", "state": "done", "startedAt": 1787067586483, "queuedAt": 1787067586482, "attempt": 1, "lastToolName": "Bash", "lastToolSummary": "cd /private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-45\u2026", "promptPreview": "THE PRODUCT. Tortie is an Electron and tmux shell for agentic coding. Sessions live in a PRIVATE tmux server on socket `-L gmux` and survive quit, crash and reboot. The app is a disposable client. The manifest, a SQLite database, is the source of truth for restore.

WHAT SHIPPED. The entire remote machine ladder, rungs M0 through M6, shipped between 2026-08-17 and 2026-08-18 as Phases 67 through 7\u2026", "lastProgressAt": 1787067858461, "tokens": 160228, "toolCalls": 4, "durationMs": 271977, "resultPreview": "# Remote machines in Tortie: how ssh and tmux actually work, and whether you can use a machine the way you use this Mac

Tree read: `/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/wt-perf`, a clean read only worktree at origin/main `d414746`, version 0.40.1. Every file and line below is from that tree, checked rather than quoted from a document.

---

## 1.\u2026"}], "totalTokens": 3794684, "totalToolCalls": 1517}