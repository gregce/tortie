# Research 58, investigator 2, the batched probe

Measured against the operator's Mac Pro, `gdc@gregs-mac-pro.tail2ddfe1.ts.net`, on
2026-08-19. Every remote command in this document is a read. Nothing was written on that
machine, no session was started, and his tmux server was never contacted. Checked against
the tree at `/private/tmp/.../wt-r58`, which is the working copy of `8713547`.

## The answer

Yes. ONE read script tests every agent's install folders for every agent in one round trip,
and it costs 52 ms where thirteen separate probes cost 480 ms.

| Shape | Median | Min | p90 | Max | Answer bytes |
| --- | --- | --- | --- | --- | --- |
| One batched call, 11 agents | 52 ms | 50 ms | 132 ms | 138 ms | 270 |
| 11 separate `program-find` calls, one after another | 480 ms | 389 ms | 489 ms | 495 ms | 478 |
| 11 separate `program-find` calls, all issued at once | 298 ms | 204 ms | 310 ms | 466 ms | 478 |

Twelve rounds of all three, interleaved, over one warm shared connection. The raw numbers
are in section 9.

The batch is 9.2 times faster than the serial shape at the median. That is not the
deciding reason. The deciding reason is that his machine's `sshd` runs the OpenSSH default
`MaxSessions 10`, and the registry holds 11 launchable agents. Issuing the probes at once
therefore falls off a cliff at exactly the count Tortie needs. Section 4 has the
measurement.

Three more answers the charter asked for:

- The composed command is 1,703 bytes. `REMOTE_SCRIPT_MAX_BYTES` is 131,072. The command
  uses 1.3 percent of the limit.
- The read door's timeout is 15,000 ms by default (`REMOTE_RUN_TIMEOUT_MS` in
  `src/main/machines/remote-run.ts`) and the program search passes 10,000 ms
  (`REMOTE_ARGV_TIMEOUT_MS` in `src/main/machines/remote-argv.ts`). The batch's p90 of
  132 ms is 1.3 percent of the smaller of the two.
- The script is composed WITHOUT reading the install map at all. Section 7 proves it by
  naming every field the composer touches.

## 1. What is being counted, and the count is not thirteen

`AGENT_REGISTRY` in `src/main/agents/registry.ts` holds 13 rows. A probe of "every agent"
does not test 13 names, and the phase brief should say which number it means.

| Set | Count | What it is |
| --- | --- | --- |
| Registry rows | 13 | `AGENT_REGISTRY` |
| Rows with `launchable: true` | 11 | every row with `kind: 'cli'` |
| Rows with `launchable: false` | 2 | `cursoride` and `copilotide`, the IDE watchers |
| Launch program names, one per launchable row | 11 | `launch.argv[0]` |
| `binaries` entries on launchable rows | 13 | `deepseek` carries three |
| `binaries` entries on all rows | 18 | the two IDE rows carry five between them |

The 11 launch names are `claude`, `cursor-agent`, `codex`, `gemini`, `droid`, `codewhale`,
`agy`, `muse`, `qwen`, `pi` and `grok`. Those are what `remoteBinFor` in
`src/main/machines/remote-sessions.ts` asks about today, because it is handed `argv[0]`.

**Ruling.** The scan tests the 11 launch names. It must not test the two IDE rows, because
`launchableAgents` already excludes them and a create can never name one. Testing all 13
`binaries` on launchable rows costs 1 ms more and 35 more answer bytes, and it buys an
answer to a question no surface asks, being whether an older alias of one agent is present.
Measured: 11 names at 52 ms and 270 bytes, 13 names at 45 ms and 305 bytes, so the two are
the same speed and the difference is what the answer means rather than what it costs.

## 2. The folders, counted

The walk has three sources, and they are `resolveBinary`'s three sources one machine
further away. `remoteSearchDirs` and `remoteSearchCount` in
`src/main/machines/remote-argv.ts` compose and count them.

| Source | Where it comes from | Count on his Mac Pro |
| --- | --- | --- |
| 1. The machine's own login shell list | `captureRemotePath` in `src/main/machines/remote-path.ts` | 10 folders |
| 2. Each agent's own `extraProbeDirs`, rebased on that machine's `$HOME` | `rebaseRemoteDir` | 4 across all 11 agents, of which 3 duplicate source 3 |
| 3. The install folders a GUI app misses | `extraBinDirsFor(home)` in `src/main/tmux/resolve.ts` | 8 folders |

Distinct folders in the union across all 11 launchable agents: **18**.

Per agent the count is 17 for ten of them and 18 for `grok`, which alone adds
`~/.grok/bin`. That reproduces the operator's own log line exactly, being that `claude` was
found "after 17 folder(s) were tested".

`codex` contributes zero folders and two skips. Its `extraProbeDirs` are `$NVM_BIN` and
`~/.nvm/versions/node/*/bin`, and `NOT_A_PLAIN_FOLDER` in `remote-argv.ts` refuses both,
because a value another computer would expand is a command choosing its own arguments.
`skipped` is 2 for that row and 0 for every other row.

### How much work the far side does

Measured with a counting copy of each script, run on his Mac Pro.

| Shape | `[ -x ]` tests the far side ran | Distinct folders touched |
| --- | --- | --- |
| One batched call, 11 agents | 189 | 18 |
| 11 separate `program-find` calls | 187 | 18 |

The batch does 2 more tests than the serial shape, being 1.1 percent more work, because it
walks each agent's own folders as their own list even when those folders repeat the shared
eight. The cost of a scan is the round trip and not the tests. That is research 55's finding
and this measurement agrees with it.

## 3. What is on his Mac Pro, and it is the whole reason for the phase

Read only, in one login shell:

| Agent | The login shell's own answer | Where the file really is |
| --- | --- | --- |
| `claude` | finds nothing | `/Users/gdc/.local/bin/claude` |
| `cursor-agent` | finds nothing | `/Users/gdc/.local/bin/cursor-agent` |
| the other 9 launchable agents | finds nothing | not on that machine |

`command -v` in his login shell finds NONE of the 13 names. Two of them are installed. So
the login list alone answers "no agent at all on this machine" for a machine that has been
running Tortie claude sessions. That is what Phase 84 fixed for one agent at create time,
and the batch carries the same fix to every agent before the person chooses.

**2 of 11 launchable agents exist on his Mac Pro.** The charter records 12 of 13 on this
Mac. So 9 of the 11 entries in his Cmd+T board name an agent that cannot start there.

Five of the nine install folders are not on that machine at all:

| Folder | On his Mac Pro |
| --- | --- |
| `/opt/homebrew/bin` | present |
| `/usr/local/bin` | present |
| `/Users/gdc/.local/bin` | present, holds both agents |
| `/Users/gdc/.npm-global/bin` | present, empty |
| `/Users/gdc/bin` | absent |
| `/Users/gdc/.claude/local` | absent |
| `/Users/gdc/.bun/bin` | absent |
| `/Users/gdc/.cursor/bin` | absent |
| `/Users/gdc/.grok/bin` | absent |

A folder that is not there costs one failed `test` and produces no error, no output and no
different answer. Section 6 says what that means for a machine whose install locations
differ from this Mac's.

## 4. Why one call rather than eleven at once, and this is the deciding measurement

Issuing the 11 probes at once looks attractive, because it adds no script to the catalogue.
Research 56 section 1.4 measured six calls at once at 44.0 ms and concluded that what
matters is that calls are not in series. That conclusion has a ceiling nobody had measured,
and the ceiling is below 11.

His `sshd` config carries `#MaxSessions 10`, commented out, so the OpenSSH default of 10
applies. A shared connection multiplexes channels, and the eleventh channel does not fit.

Measured three times, each row a fresh `Promise.all` over that many one-name probes on the
same warm shared connection:

| Calls issued at once | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- |
| 9 | 212 ms | 60 ms | 141 ms |
| 10 | 60 ms | 48 ms | 49 ms |
| 11 | 359 ms | 381 ms | 304 ms |
| 12 | 399 ms | 320 ms | 292 ms |

Ten calls at once cost about the same as one. Eleven cost six times that. The registry
holds exactly 11 launchable agents, so the parallel shape sits one over a limit set by a
value on the far side that Tortie neither reads nor controls. A machine with
`MaxSessions 4` would push it further, and nothing in Tortie would say why the scan got
slow.

| Option | Cost on his Mac Pro | New catalogue script | Deciding reason |
| --- | --- | --- | --- |
| **One batched read script** | 52 ms | one, `agents-find` | It is one channel whatever the registry grows to, and it does not depend on a remote setting. **Chosen.** |
| 11 probes issued at once | 298 ms | none | It is correct today only because 11 is barely over 10 and ssh degrades rather than failing. The registry grows and the limit is not Tortie's. Rejected. |
| 11 probes one after another | 480 ms | none | 9.2 times the batch, and it is 11 round trips on a link whose whole cost is the round trip. Rejected. |
| Widen `program-find` to take a name list | about 52 ms | none, but its meaning changes | It would make `program-find` answer many questions and break condition 46 of `build/conformance-machines.mjs`, which asserts that script's exact shape. Rejected, and section 8 says why a new id is cheaper than an edit. |

## 5. The script, and it fits the catalogue's own rules

975 bytes of text. Three values. It names no external program at all, so its whole surface
is shell builtins and `printf`.

```sh
set -e
umask 077
p="$1"
x="$2"
r="$3"
o=
b=
IFS=:
for d in $p; do
  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d
"; fi
done
for d in $x; do
  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d
"; fi
done
IFS='
'
for line in $r; do
  if [ -z "$line" ]; then continue; fi
  n=${line%% *}
  if [ "$n" = "$line" ]; then e=; else e=${line#* }; fi
  f=
  s=
  IFS=:
  for d in $p; do
    if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi
  done
  if [ -z "$f" ]; then
    for d in $e; do
      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=agent; break; fi
    done
  fi
  if [ -z "$f" ]; then
    for d in $x; do
      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi
    done
  fi
  IFS='
'
  o="$o${s:-none} $n ${f:-none}
"
done
printf '__TORTIE_RUN__%s%s__TORTIE_RUN__\n' "${o:-none}" "${b:+unreadable
$b}"
```

`$1` is the machine's own login list, colon separated. `$2` is the shared install folders,
colon separated. `$3` is one record per line. A record is the program name, one space, and
then that agent's own folders as THE REST OF THE LINE, colon separated. The name is first
and the folders are last for the reason `dir-list` and `tree-list` already put the path
last, which is that a folder on another computer can hold a space in its name.

### The seven catalogue rules, checked mechanically against this text

| Rule | What the text does |
| --- | --- |
| 1. Constant text, no backtick | no backtick, and nothing a caller passes is inside it |
| 2. Every positional read as `"$n"`, and a list is read into a local name before it is split | `p="$1"`, `x="$2"`, `r="$3"`, all double quoted. `bareLoops` is empty. Every list is assigned before the loop that walks it. |
| 3. Begins `set -e` then `umask 077` | it does |
| 4. Payload between the marker pair | 2 markers, one pair |
| 5. Names none of the eleven mutating programs, and every `>` is `2>/dev/null` | it names none of them, and it carries **0** redirections |
| 6. Mode | `read`, so the write count stays at 2 |
| 7. Names no git verb | it names none |

I ran the same detectors `build/machines-conformance-probe.mts` uses, being the bare
positional regex, the marker count, the redirection count and the mutating program list, and
every one of them passes.

### The injection test

Composed with a hostile record whose name is `a';touch /tmp/PWNED_R58;echo '` and sent to
his Mac Pro. The hostile value appears zero times in the script text and once in the
composed command, as one quoted argument. The far side printed `none a'; touch none` as a
row and created nothing. `/tmp/PWNED_R58` did not exist afterwards.

## 6. What the answer looks like in the four awkward cases

All four measured. The first three were measured locally against folders I made in the
scratchpad, because measuring them on his Mac Pro would mean writing there. The fourth was
measured on his Mac Pro.

### A folder that cannot be read

`[ -f ]` and `[ -x ]` on a path inside a folder with mode `000` both answer false, so the
agent is reported absent and no error is raised anywhere. That is a **false absent** and
nothing in today's `program-find` says it happened.

The script above adds one pass over the folders and names any that exist and cannot be read
or searched. The answer then carries a second section:

```
__TORTIE_RUN__install claude /path/t/real/claude
unreadable
/path/t/unreadable
__TORTIE_RUN__
```

The extra pass costs 18 more `test` calls and no measurable time. The section is absent
when the list is empty, so the ordinary answer is unchanged. **Build this.** A false absent
that a person cannot see is the failure mode question 3 has to price, and this is the only
way the far side can say "I could not look" rather than "it is not here".

### A name that resolves to a DIRECTORY rather than an executable

Today's shipped `program-find` reports the directory as the program. Measured: a directory
named `claude` with the execute bit set makes `[ -x "$d/$n" ]` true, and the script answers

```
__TORTIE_RUN__install /path/t/dirbin/claude__TORTIE_RUN__
```

`parseProgramFind` accepts it, `remoteBinFor` logs it, and that path becomes `argv[0]` in
the manifest row and on the launch line. The pane would then fail with a permission error
on a machine where the real program may be one folder further down the list.

The fix is `[ -f "$d/$n" ] && [ -x "$d/$n" ]`, which the script above uses. Measured with
the same folders: the directory is skipped and the real executable one folder later is
found. **This is a defect in the shipped script, not only in the batch.** The phase should
fix `program-find` in the same commit, and the fix is two words.

### A folder that is not there at all

One failed `test`, no output, no error, and the walk continues. Five of the nine install
folders are absent on his Mac Pro and the run is 52 ms, so this is the ordinary case rather
than an exception.

### A record list with nothing in it

The payload is the single word `none`, which `parseRemoteScriptAnswer` accepts because it
is non empty. The reader must treat it as zero rows rather than as one row.

## 7. The install map is never read, and that is provable by field name

`build/conformance-installs.mjs` asserts that nothing in the install map can run. The batch
does not weaken that promise, and the reason is stronger than a policy. **The composer needs
no field of the install map at all.**

| Field the composer reads | Where it lives | Is it part of `install`? |
| --- | --- | --- |
| `launch.argv[0]` | `AgentRegistryEntry.launch` | no |
| `binaries` | `AgentRegistryEntry.binaries` | no |
| `extraProbeDirs` | `AgentRegistryEntry.extraProbeDirs` | no |
| the machine's `$HOME` | that machine's own `machine-facts` answer | no |
| the machine's login list | `captureRemotePath` | no |

`AgentInstallInfo` holds four fields, being `canonical` (a command, a doc url and a read
date), `alternates`, `canonicalIsPackageManager` and `signature`. The composer reads none
of them. `canonical.command` is marked "DISPLAY ONLY" on the type and it stays that way.

Two things follow, and both belong in the phase.

1. The composer's input type must be a hand written narrow shape holding an id, a name and
   a folder list. It must NOT take an `AgentRegistryEntry`, because a function that holds
   the whole row is a function a later edit can make read `install`.
2. `build/conformance-installs.mjs` should gain a seventh rule asserting that no module
   under `src/main/machines/` names `install.canonical`, `canonicalIsPackageManager` or
   `signature`. That makes "the scan cannot run an install command" checkable by reading
   the tree, which is what the other six rules already do for the map itself.

The `signature` field is a tempting second source, because `realpath-under` and
`marker-file` would prove WHICH copy of an agent a machine has. Do not use it in the scan.
It needs `readlink` and a second walk, it answers a question no surface asks, and it would
put the install map inside the composer for the first time.

## 8. What the phase has to add, listed

| Thing | Where | Note |
| --- | --- | --- |
| One script `agents-find`, `mode: 'read'`, `params: 3` | `src/main/machines/remote-scripts.ts` | catalogue goes from 12 scripts to 13, writers stay at 2 |
| A condition shaped like condition 46 for the new id | `build/conformance-machines.mjs` and `build/machines-conformance-probe.mts` | condition 46 finds `program-find` BY ID, so a second list walking script is unchecked until this is written |
| `[ -f ]` beside `[ -x ]` in `program-find` | `src/main/machines/remote-scripts.ts` | the directory defect in section 6 |
| Name validation before composing | the new composer | every name must pass `PLAIN_PROGRAM_NAME` from `remote-argv.ts`. A name with a space is silently read as a name plus a folder list, which the injection test shows. |
| A parser for the multi row payload | beside `parseProgramFind` | it must accept `none` as zero rows and must drop a row whose path is not absolute, exactly as `parseProgramFind` does |

Two limits of the record format, and both are already limits of a colon separated PATH, so
neither is new. A folder holding a colon cannot be sent. A folder holding a newline cannot
be sent, and `plainString` in `src/main/config/overlay.ts` already refuses every control
character in a configured `extraProbeDirs` entry, so no configured row can produce one.

## 9. The measurements, raw

Every number below was taken on 2026-08-19 over one warm shared connection to
`gregs-mac-pro.tail2ddfe1.ts.net`, with `BatchMode=yes`, `StrictHostKeyChecking=yes`,
`ControlMaster=auto` and `ControlPersist=60s`, which are the options `sshOptions` in
`src/main/machines/ssh.ts` composes.

Twelve interleaved rounds, milliseconds:

```
batched, one call   [138, 53, 129, 52, 132, 51, 52, 53, 51, 50, 52, 52]
serial, 11 calls    [389, 481, 404, 484, 399, 480, 481, 477, 495, 472, 489, 465]
parallel, 11 calls  [310, 206, 298, 205, 306, 466, 206, 298, 204, 307, 210, 304]
```

Twenty consecutive batched calls, an earlier revision of the same script, milliseconds:

```
[116, 49, 47, 37, 29, 33, 27, 41, 36, 35, 34, 35, 119, 49, 42, 41, 38, 37, 37, 34]
min 27, median 37, p90 116, max 119
```

Other single figures:

| What | Number |
| --- | --- |
| The batch on a connection that does not exist yet | 213 ms, 198 ms, 285 ms |
| `machine-facts`, which the scan needs at most once per connection | median 38 ms |
| The login list capture, `"$SHELL" -lc 'printf "$PATH"'` | 0.03 s to 0.05 s |
| Script text | 975 bytes |
| Composed command, 11 agents | 1,703 bytes |
| Composed command, 13 binary names | 1,718 bytes |
| Answer, 11 agents | 270 bytes |
| Answer, 13 binary names | 305 bytes |
| `REMOTE_SCRIPT_MAX_BYTES` | 131,072 bytes |
| Share of that limit used | 1.3 percent |
| `REMOTE_RUN_TIMEOUT_MS` | 15,000 ms |
| `REMOTE_ARGV_TIMEOUT_MS`, which the program search passes | 10,000 ms |
| Share of the smaller timeout used at p90 | 1.3 percent |
| `MAX_BUFFER_BYTES` in `exec-plane.ts` | 67,108,864 bytes |

### Headroom, so a later round does not re-measure it

Synthetic runs on his Mac Pro with names that are on no machine, over the same 18 folders:

| Records | Composed bytes | Time | Answer bytes |
| --- | --- | --- | --- |
| 40 | 1,595 | 66 ms | 619 |
| 100 | 1,895 | 71 ms | 1,519 |
| 400 | 3,695 | 190 ms | 6,319 |

The record list for 11 agents is 188 bytes, being 17 bytes per record. The command has
129,369 bytes spare, so the byte limit is reached somewhere near 7,500 records. The
registry will not get there.

### The cost the scan does not pay twice

`remoteMachineHome` in `src/main/machines/remote-image.ts` holds one machine's `$HOME`
against the connection generation, so `machine-facts` is one round trip per connection at
most and is usually already paid by another caller. A scan on a connection where nothing
else has run costs 38 ms plus 52 ms, being 90 ms. A scan on a warm connection costs 52 ms.

## 10. Portability, and what of it is measured

The script is POSIX. It uses `${v%% }`, `${v# }`, `${v:-}`, `${v:+}`, `IFS` splitting and
`test`, and it calls no external program.

Run against the same folders under three shells on this Mac, byte identical output from all
three:

| Shell | Result |
| --- | --- |
| `/bin/sh`, which is bash 3.2 on macOS | identical |
| `/bin/dash`, which is what `/bin/sh` is on most Linux | identical |
| `/bin/ksh` | identical |

**One divergence was found and fixed, and it is worth recording.** An earlier revision
walked the two folder lists as one loop over `$p:$x`. With an empty `$p`, bash splits that
into an empty field and then the folders, while dash returns the first folder WITH the
leading colon still attached. The unreadable folder report then found nothing under dash and
found the folder under bash. The fix is to walk each list in its own loop, which is exactly
what `program-find` already does. **Never concatenate two lists into one word before
splitting them.**

## 11. What is not true, and what was not measured

- **No Linux machine was contacted.** Only his Mac Pro answered. `REMOTE_SCRIPT_MAX_BYTES`
  is Linux's `MAX_ARG_STRLEN` and remains a documented constant rather than a measured one,
  which is what `remote-scripts.ts` already says about it. The dash run above covers the
  shell semantics and says nothing about Linux hardware, a Linux `$HOME` shape or a
  `MaxSessions` value on a Linux host.
- **The `MaxSessions 10` cliff was measured on one machine.** The value is the OpenSSH
  default and his config leaves it commented, so it is the default rather than a choice he
  made. A machine with a different value would move the cliff. Nothing was measured about
  what Tortie should do when it lands on one.
- **Nine of the eleven agents were measured absent, not present.** The batch's ability to
  report a FOUND path was exercised for two agents only, being `claude` and `cursor-agent`,
  both from source 3. No agent on that machine sits on the login list or in an agent's own
  `extraProbeDirs`, so the `path` and `agent` source words were exercised only locally.
- **The unreadable folder case was measured locally, not on his Mac Pro.** Making an
  unreadable folder there would be a write. What would measure it is a folder he already
  owns that his own account cannot read, and there is none in the nine.
- **No conformance gate was run.** The worktree has no `node_modules`, so
  `npm run conformance:machines` and `npm run conformance:installs` did not run. Section 5
  reports my own copies of those detectors run against the script text, which is weaker
  than the gate itself. The phase must run both.
- **The registry geometry in section 1 was read by parsing `registry.ts` as text**, because
  importing it needs `electron`. The numbers were cross checked against the operator's own
  log line of 17 folders for `claude` and they agree, but a builder should re-derive them by
  importing the module.
- **Nothing measures what a scan costs when a machine is slow rather than near.** Every
  number here is one tailnet hop to a machine that answers in 30 ms.

## 12. Safety, recorded

- Every remote command was a read. The catalogue's own `program-find` and `machine-facts`
  texts were used verbatim where they were used.
- Nothing was written on his Mac Pro. `/tmp/PWNED_R58` was checked afterwards and does not
  exist.
- His `~/.ssh/known_hosts` was copied to the scratchpad and the copy was named on every
  command, so no command could add a line to his file. Before the run it was 2,120 bytes
  with md5 `eca16dac47a9f63043033e41f58e9280` and mtime 2026-08-18 12:17. After the run it
  is the same three values.
- His tmux server was never contacted, on `-L gmux` or otherwise. No session was created,
  named, attached or ended.
- The shared connection this document used had its own control path under `/tmp/r58-501`,
  separate from Tortie's own, and it was closed with `ssh -O exit` and the directory
  removed.
- His manifest, his `userData` and the installed Tortie.app were never opened.
