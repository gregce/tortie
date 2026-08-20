# Research 58, investigator 1. What runs today, counted

**Read against the tree at `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/wt-r58`, HEAD `a497521`, on 2026-08-19. Every count below was taken from the source this session. No machine was contacted, no probe was run and no Electron process was started.**

## The answer, first

Tortie asks a machine where it keeps a program exactly once per create and once per restore, and it asks about **one** program name at a time. Nothing asks before then. The Cmd+T sheet makes **zero** calls to any machine about any agent, so every agent tile on that sheet reports what is installed on **this Mac** no matter which machine is chosen in the field above it.

That produces two failures a person can hit today, and they fail in opposite directions.

| Case | What the person sees today | Where it is decided |
| --- | --- | --- |
| Agent installed on this Mac, absent on the chosen machine | Tile reads normal, they type a name, press Create, and get one line of red text in the sheet | `noRemoteProgramRefusal`, `src/main/machines/remote-copy.ts` |
| Agent absent on this Mac, installed on the chosen machine | Tile reads "not installed" and cannot be selected at all, so the create they could have made is unreachable | `installed` on `AgentPickerOption`, `src/renderer/state/agents.ts`, and `selectAgent` in `src/renderer/app/CreateSessionModal.tsx` |
| Agent installed on both | Works | `remoteBinFor`, `src/main/machines/remote-sessions.ts` |

The remote refusal is raised **before anything starts on that machine**. No manifest row is written, no `new-session` line is sent and no pane opens. That part is correct and should not be disturbed. What the person is shown afterwards is a single sentence with no title, no install command and no button, and that is the part that does not match the local shape.

## 1. When a probe runs, counted

Three reads exist. All three are on the create path or the restore path. None is on the sheet path.

| Probe | Symbol | File | When it runs | Timeout |
| --- | --- | --- | --- | --- |
| The machine's own list of places it looks for programs | `captureRemotePath` | `src/main/machines/remote-path.ts` | Once per connection generation, from `ensureRemoteServer` | `REMOTE_PATH_TIMEOUT_MS`, 10,000 ms |
| The machine's own home directory | `remoteMachineHome` | `src/main/machines/remote-image.ts` | Once per connection generation, first time a program search needs it | `REMOTE_FACTS_TIMEOUT_MS` |
| Where the machine keeps one named program | `findRemoteProgram` | `src/main/machines/remote-argv.ts` | Once per `remoteCreate`, once per remote restore | `REMOTE_ARGV_TIMEOUT_MS`, 10,000 ms |

`ensureRemoteServer` in `src/main/machines/remote-server.ts` has exactly two production callers, being `prepare.ts` at the Prepare button and `remote-restore.ts` at a restore.

`findRemoteProgram` has exactly two production call sites, being `remoteBinFor` in `src/main/machines/remote-sessions.ts` and the step 3b block in `src/main/machines/remote-restore.ts`. `captureRemoteArgv` in the same module is the thin wrapper over it and its only callers are `src/main/machines/remote-smoke.ts`, which is the smoke and not production.

The command that crosses is `program-find`, which is 1 of the 12 rows in `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts`. It has `mode: 'read'` and `params: 3`. Its text is the constant `PROGRAM_FIND` in the same file.

**Zero probes happen when the sheet opens.** `src/shared/ipc/machines.ts` declares 21 request channels, being `rows`, `reload`, `tailscaleNames`, `test`, `testInput`, `testCancel`, `add`, `confirm`, `acceptVersion`, `forget`, `remove`, `prepare`, `state`, `installKey`, `putImage`, `reviewFiles`, `reviewFile`, `listDir`, `findProject`, `cloneProject` and `listTree`. None of them asks about an agent. The sheet calls two of them, being `machines:rows` when it opens and `machines:findProject` when the machine choice changes.

## 2. How many folders are tested per agent

The walk is composed by `remoteSearchDirs` in `src/main/machines/remote-argv.ts` and counted by `remoteSearchCount` in the same file. It has three sources, in this order.

```
  1. the machine's own login PATH        machineGeneration(id).remotePath
  2. the agent row's extraProbeDirs      entry.extraProbeDirs, rebased on that machine's $HOME
  3. the install folders Tortie knows    extraBinDirsFor(home), src/main/tmux/resolve.ts
```

Source 3 is 8 folders, being `<home>/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `<home>/bin`, `<home>/.claude/local`, `<home>/.npm-global/bin`, `<home>/.bun/bin` and `<home>/.cursor/bin`.

Sources 2 and 3 are deduped together. I ran the composition rules from `rebaseRemoteDir` and `remoteSearchDirs` over the 11 launchable rows in `src/main/agents/registry.ts` this session. The result is below. "Install folders" is the size of `dirs`, which is sources 2 and 3 deduped. "Not sent" is `skipped`, which is the `extraProbeDirs` entries `NOT_A_PLAIN_FOLDER` rejects.

| Agent id | `extraProbeDirs` in the registry | Install folders sent, machine states a home | Not sent | Install folders sent, machine states no home | Not sent |
| --- | --- | --- | --- | --- | --- |
| claude | `~/.claude/local` | 8 | 0 | 2 | 1 |
| cursor | `~/.cursor/bin` | 8 | 0 | 2 | 1 |
| codex | `$NVM_BIN`, `~/.nvm/versions/node/*/bin` | 8 | 2 | 2 | 2 |
| gemini | none | 8 | 0 | 2 | 0 |
| droid | none | 8 | 0 | 2 | 0 |
| deepseek | none | 8 | 0 | 2 | 0 |
| antigravity | none | 8 | 0 | 2 | 0 |
| muse | none | 8 | 0 | 2 | 0 |
| qwen | none | 8 | 0 | 2 | 0 |
| pi | `~/.npm-global/bin`, `~/.local/bin` | 8 | 0 | 2 | 2 |
| grok | `~/.grok/bin` | 9 | 0 | 2 | 1 |

Read three things off that table.

- Ten of the eleven agents send the same 8 folders. grok is the only row whose own folder is not already one of the 8, so grok sends 9. Every other `extraProbeDirs` entry in the registry is either already in `extraBinDirsFor` or is refused as a pattern.
- codex sends **zero** of its own two folders to any machine. `$NVM_BIN` holds a `$` and `~/.nvm/versions/node/*/bin` holds a `*`, and `NOT_A_PLAIN_FOLDER` drops both. So on a machine where codex is installed under nvm and nowhere else, Tortie finds nothing and refuses, and the refusal detail says `2 folder(s) the agent names were not searched`.
- A machine that will not state a home contributes only `/opt/homebrew/bin` and `/usr/local/bin`, because every other leaf depends on a home and `NO_HOME` entries are filtered out.

The **total** the person is shown is `remoteSearchCount(loginPath, dirs)`, which is the size of the union of the machine's login PATH and the install folders. That number depends on the machine, so it is not a constant of this tree.

### The 17

The task names 17 folders tested for claude on the operator's Mac Pro on 2026-08-19. **That number is nowhere in this tree.** I grepped `docs/research/` and `src/` this session and found no recorded value. What the tree does record, in the header of `src/main/machines/remote-argv.ts` and in the header of `remoteCreate` in `src/main/machines/remote-sessions.ts`, is a 2026-08-18 measurement on the same Mac Pro saying the login shell's own list held **ten** folders. Ten login folders and eight install folders would give 17 only if exactly one folder appears in both lists. I did not measure that overlap and I am not asserting it.

### One counted discrepancy between the number printed and the work done

`remoteSearchCount` builds a `Set`, so it counts **distinct** folders across both lists. `PROGRAM_FIND` does not dedupe. Its text walks `$p` to the end, then walks `$x`, testing `[ -x "$d/$n" ]` in each. So a folder that is in both the login PATH and the install list is tested twice while being counted once. For claude on a machine with ten login folders and one overlap, the sentence says 17 folders and the script performs up to 18 tests. The sentence is not wrong about how many distinct places were looked at, and it is not the number of tests.

## 3. What is cached, and for how long

| Value | Held in | Key | Lifetime | Empty answer cached |
| --- | --- | --- | --- | --- |
| The machine's login PATH | `setMachineRemotePath`, `src/main/machines/context.ts` | machine id, per generation | One connection generation | No, it is a refusal |
| The machine's home | the `homes` map in `src/main/machines/remote-image.ts` | machine id plus generation | One connection generation | No, `remoteMachineHome` returns `''` without storing |
| Where a program is on that machine | nothing | nothing | **Not cached at all** | n/a |

The generation moves on a new server birth, which `ensureRemoteServer` does with `bumpMachineGeneration` when the verdict is `no-server`. The comment on `remoteMachineHome` states the reason a home is bound to a generation, which is that a reconnection may be to a different account at the same address.

So the cost of a create is **one** `program-find` round trip, plus **one** `machine-facts` round trip on the first agent create of a connection generation and none after that. A second create of the same agent on the same machine pays the `program-find` round trip again, because there is no memory of the answer.

## 4. What a person sees today for a remote agent that is not installed

The sentence is `noRemoteProgramRefusal` in `src/main/machines/remote-copy.ts`.

> Tortie could not find `<bare>` on `<label>`. It looked in `<n>` folders, being the ones that machine lists for programs and the ones programs are usually kept in. Nothing was started there. Install it on `<label>`, or start the session on a machine that has it.

It is thrown by `findRemoteProgram` in `src/main/machines/remote-argv.ts` with code `INVALID_INPUT`, and the `detail` names the login list, the install folders and the skipped count.

**How it renders.** `submit` in `src/renderer/app/CreateSessionModal.tsx` catches the rejection and reads `errorPayload(err)`. Its branch list has exactly four arms.

| Arm | Condition | Result for this refusal |
| --- | --- | --- |
| 1 | `INVALID_INPUT` **and** the message holds "working directory" | Not taken, the sentence has no such words |
| 2 | `AGENT_NOT_FOUND` | Not taken, the code is `INVALID_INPUT` |
| 3 | `AGENT_INTERPRETER_MISSING` | Not taken |
| 4 | anything else, `setGenericError(errorText(err))` | **Taken** |

`errorText` in `src/renderer/state/errors.ts` returns `payload.message` and nothing else. The sheet then draws `<div className="modal-error">{genericError}</div>`, which is one line of text. There is no `launch-block`, no heading, no `InstallSourceLines` naming the provider page and date, and no button.

**Where in the create it happens.** `remoteCreate` in `src/main/machines/remote-sessions.ts` runs in this order. Step 5 is the search.

```
  1  readyRemoteContext            refuse an unconnected machine        read
  2  remoteLaunchEntry             the agent confirm gate               no io
  3  pollRemoteMachine             read the machine's session names     read
  4  assertRemoteDirUsable         is the folder there                  read
  5  remoteBinFor -> findRemoteProgram   where is the program           read   <-- refuses here
  6  argv[0] := the absolute path
  7  noteIssuedRemoteId + writeRemoteRow    the manifest row            WRITE
  8  new-session                            the pane                    WRITE
```

So the refusal happens at step 5, before step 7 and step 8. **Nothing was written on either computer and no pane opened.** The refusal sentence's own claim, "Nothing was started there", is true as the code stands.

## 5. The local shape the remote answer should match

Two different mechanisms carry the local answer, and they are both richer than the remote one.

**Before the create, on the tile.** `buildAgentOptions` in `src/renderer/state/agents.ts` puts `installed` on every `AgentPickerOption` from the `agents:list` scan. `AgentTile` in `src/renderer/app/AgentGrid.tsx` computes `unusable = !option.installed || blocked !== null` and draws `<span className="agent-tile-meta">not installed</span>` in the tile's right-hand slot. `selectAgent` in `src/renderer/app/CreateSessionModal.tsx` returns early for such a tile and sets `hintAgent` instead, so the tile cannot become the chosen agent. Under the board, the caption row prints `Install <label>: <command>` from `captionOption.install.command`.

`agentBlockedReason` in `src/renderer/state/agents.ts` is the **second** reason a tile can be unusable, and it is a different fact. It reads `option.configState` and returns one of three sentences for `never`, `changed` and `unknown`, and null otherwise. It is about a configured agent nobody has confirmed, not about a missing program. The tile's meta slot says "confirm first" or "changed" for it. The two are deliberately separate, and the AgentTile comment says so.

**At the create, in the sheet.** `src/main/sessions/core.ts` throws `AGENT_NOT_FOUND` with `agentNotFoundMessage(candidates)` from `src/main/sessions/launch-plan.ts` when `tmux.resolveBinary` finds no candidate. That is thrown before anything is written or spawned, the same position the remote refusal holds. The modal's arm 2 then sets `absent` and draws a full block.

| Piece of the local block | Source |
| --- | --- |
| Heading, `<Agent> is not installed` | `agentShortLabel(absent.agentId)` |
| Body sentence naming what was searched | `agentNotFoundMessage` |
| The provider's own command, the page and the date it was read | `InstallSourceLines` with `absentInstall`, from the registry's `install` map |
| The one no-command sentence for an agent with none | `noInstallCommandLine` |
| A `Try again` button that drops the probe cache and resubmits | `tryAgain`, which calls `resetAgentAvailabilityCache` and `rescanAgents` |

So a person refused locally gets five things. A person refused remotely gets one line of text. The remote sentence is better written than the local one about **where** it looked, because it names the machine and the folder count, and it is worse in every other way.

## 6. One more counted asymmetry, which is not about the UI

The local create walks the whole candidate list. `binaryCandidatesOf` in `src/main/sessions/launch-plan.ts` returns `merged.binaries`, and `core.ts` loops over every one of them until a hit.

The remote create asks about **one** name. `remoteLaunchArgv` calls `launchArgvFor` in `src/main/agents/registry.ts`, whose `argv0` is `bin ?? entry.launch.argv[0] ?? entry.binaries[0] ?? entry.id`, and `remoteBinFor` is given `argv[0]` alone.

Ten of the eleven launchable rows carry exactly one binary name, so the two agree. **deepseek is the one row where they differ.** Its `binaries` is `['codewhale', 'codew', 'deepseek']` and its `launch.argv[0]` is `codewhale`. A machine holding only the legacy `deepseek` binary resolves locally and is refused remotely, and the refusal names `codewhale`, which is a program that machine never had.

## 7. What is not true, and what I did not measure

- **No machine was contacted this session.** Every number above comes from reading the source and from running the composition rules in `remoteSearchDirs` and `rebaseRemoteDir` over the registry rows. No `ssh`, no tmux, no probe script.
- **The 17 is not in this tree.** I could not confirm it, and I could not confirm the overlap between the Mac Pro's ten login folders and the eight install folders that would produce it.
- **The union size is machine dependent** and there is no fixed per-agent total. Only the install-folder half, being 8 for ten agents and 9 for grok, is a constant of the code.
- **I did not measure the wall clock of a `program-find` round trip.** Research 55 recorded 35.9 ms for one warm call on the operator's tailnet, and I did not re-measure it. What would measure it is one timed call of `runRemoteRead(ctx, 'program-find', ...)` against a real machine, printed beside the `machine-facts` call that may precede it.
- **I did not drive the app.** I did not open Cmd+T, pick a machine, choose an agent absent on it and read the sheet. What would measure it is one live run against a machine with a deliberately absent agent, with a screenshot of the sheet after Create.
- **I did not check whether any test pins the one-line rendering.** I read `submit` and the JSX and traced the four arms, and I did not search the test suite for a case asserting that a remote `INVALID_INPUT` lands in `genericError`.
- **`machineCanHoldSession` is not an agent question.** It asks only what `readyRemoteContext` asks, which is whether the connection and the PATH capture are in place. A machine that passes it can still refuse every create for want of the program.
