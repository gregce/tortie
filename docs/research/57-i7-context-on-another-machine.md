# Research 57, investigator 7. Context on a machine

**Question.** Which paths does the local Context reader open, per agent, and which of them sit in the
person's home folder rather than inside the project. Then rule on reading the same set on another
machine.

**Status.** Read only. Nothing in the tree was changed. Nothing on either machine was written. Every
number below was produced in this session on 2026-08-19.

---

## The answer, first

**Build it. The operator was right and the earlier answer was wrong.**

The local Context reader is already a pure function over a filesystem port. `scanContext` in
`src/main/context/scan.ts` takes its disk through `ScanDeps.fs`, typed as `ContextFs` in
`src/main/context/port.ts`, and it takes its environment through `ContextScanInput.env`, declared in
`src/shared/context.ts`. Both seams exist today and both are used today by the tests. A reader
pointed at another machine's files needs a second implementation of a six method interface and
nothing else in that directory.

Four specific rulings follow.

| Question | Ruling | The deciding number |
| --- | --- | --- |
| Can ONE new read script carry the whole set | Yes, one catalogue entry with three parameters. It cannot do it in ONE round trip. Three calls is the measured shape | 3 calls, 0.71 s of far side work on the rich machine |
| What it costs, measured | 0.28 to 0.43 s against the Mac Pro as it is today. About 1.3 s against a machine holding this MacBook Pro's configuration | Measured, see §4 |
| What happens when a path is absent | Nothing new is needed. `ContextFs` already answers null for missing and `rootReadout` already records `exists: false` | 68 of 71 declared paths are absent on the Mac Pro and the script returned 951 bytes without an error |
| Does the conformance matrix survive | It cannot break. No row of that matrix is computed from a file | `agent-context.ts` has exactly one value import and it is `AGENT_REGISTRY` |

**The parts that are genuinely local forever are not the reading. They are the eleven other IPC
channels.** `context:scan` reads files and travels. The other eleven `context:*` channels either run
the skills binary inside Tortie's own bundle, reach `https://skills.sh`, or reveal a path in Finder.
Those name a program installed here, and §7 lists each one.

---

## 1. Exactly which paths the local reader opens

### 1.1 Where the list lives

The whole list is one constant, `BLOCKS`, in `src/main/context/agent-context.ts`. It is read through
five exported accessors, being `locationsFor`, `precedenceFor`, `scopeOrderFor`,
`precedenceReadoutFor` and `reloadFor`. Nothing else in the product declares a path an agent reads.

`src/renderer/context/groups.ts` **declares no path at all.** It was checked line by line this
session. It holds section ids, category icons, scope words, grouping rules and sentences. Its only
path-shaped input is `ContextRootReadout[]`, which `sectionHint` renders into the "Read from:" block
of a section tooltip. Every path in that file arrived from main. That matters for the ruling, because
it means the renderer needs no change to draw a remote answer.

### 1.2 The count

Extracted from `BLOCKS` this session by parsing the source and substituting the three named
constants, being `NEUTRAL_GLOBAL_SKILLS`, `NEUTRAL_PROJECT_SKILLS` and `MANAGED_CLAUDE_SETTINGS`.

- **90 declared locations.**
- **62 distinct path templates**, because nine of the twelve agents share `~/.agents/skills` and
  several share `~/.claude/skills`.
- **11 agents** carry at least one location. The registry holds 13 ids. `cursoride` and `copilotide`
  declare none.
- **5 categories.**
- **13 readers**, keyed by file format rather than by agent.

Cross-check on the count. `grep -c "^\s*at: "` over the file returns 77, of which one is the
interface field at the top, so 76 multi line rows. 14 more are written on one line. 76 plus 14 is 90.

### 1.3 Home versus project, which is the operator's question

| Class | Rows | Distinct templates | What it means for a machine |
| --- | --- | --- | --- |
| Home folder | 46 | 36 | Needs the FAR SIDE's `$HOME`, never this Mac's |
| Inside the project | 41 | 23 | Needs the far side's project path, which the session row already carries |
| Machine wide, absolute | 1 | 1 | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Derived from a plugin install | 2 | 2 | `<pluginInstall>/skills` and `<pluginInstall>/.mcp.json`, knowable only after a read |

**51 percent of the rows are in the person's home folder.** That is the operator's point stated as a
number. They are generic, common, dot prefixed directories under `$HOME`, and the same reader
pointed at the same names on another Mac answers the same question.

Per agent.

| Agent | Home | Project | Absolute | Plugin derived | Total |
| --- | --- | --- | --- | --- | --- |
| claude | 8 | 8 | 1 | 2 | 19 |
| codex | 8 | 2 | 0 | 0 | 10 |
| gemini | 6 | 7 | 0 | 0 | 13 |
| cursor | 8 | 5 | 0 | 0 | 13 |
| qwen | 3 | 3 | 0 | 0 | 6 |
| antigravity | 4 | 2 | 0 | 0 | 6 |
| muse | 2 | 0 | 0 | 0 | 2 |
| pi | 2 | 3 | 0 | 0 | 5 |
| grok | 1 | 6 | 0 | 0 | 7 |
| deepseek | 2 | 2 | 0 | 0 | 4 |
| droid | 2 | 3 | 0 | 0 | 5 |

Per category.

| Category | Rows | Home | Project | Plugin | Absolute |
| --- | --- | --- | --- | --- | --- |
| skill | 32 | 18 | 13 | 1 | 0 |
| mcp | 17 | 11 | 5 | 1 | 0 |
| hook | 9 | 4 | 4 | 0 | 1 |
| plugin | 7 | 7 | 0 | 0 | 0 |
| instruction | 25 | 6 | 19 | 0 | 0 |

### 1.4 The 36 distinct home templates, written out

These are the ones the operator means. `<claude>` is `CLAUDE_CONFIG_DIR` or `~/.claude`, `<codex>` is
`CODEX_HOME` or `~/.codex`, and `<agents>` is `~/.agents`. The expansion rule is `expandLocation` in
`src/main/context/env.ts` and the roots are resolved once by `resolveHomes` in the same file.

| Template | Times declared |
| --- | --- |
| `<agents>/skills` | 5 |
| `<codex>/config.toml` | 3 |
| `<claude>/.claude.json` | 2 |
| `~/.claude.json` | 2 |
| `<claude>/skills` | 2 |
| `~/.gemini/settings.json` | 2 |
| `<claude>/CLAUDE.md`, `<claude>/plugins/installed_plugins.json`, `<claude>/settings.json` | 1 each |
| `<codex>/AGENTS.md`, `<codex>/rules`, `<codex>/skills`, `<codex>/skills/.system` | 1 each |
| `~/.cursor/hooks.json`, `~/.cursor/mcp.json`, `~/.cursor/plugins/local`, `~/.cursor/rules`, `~/.cursor/skills`, `~/.cursor/skills-cursor` | 1 each |
| `~/.deepseek/mcp.json`, `~/.deepseek/skills` | 1 each |
| `~/.factory/mcp.json`, `~/.factory/skills` | 1 each |
| `~/.gemini/GEMINI.md`, `~/.gemini/antigravity-cli/builtin/skills`, `~/.gemini/config/mcp_config.json`, `~/.gemini/config/plugins`, `~/.gemini/config/skills`, `~/.gemini/extensions`, `~/.gemini/skills` | 1 each |
| `~/.grok/rules` | 1 |
| `~/.local/share/muse/plugins/cache/builtin/muse-core` | 1 |
| `~/.pi/agent/skills` | 1 |
| `~/.qwen/extensions`, `~/.qwen/settings.json`, `~/.qwen/skills` | 1 each |

### 1.5 The four locations that are not a plain path, and each one is a trap for a remote read

| Shape | Where | What it does | The trap on another machine |
| --- | --- | --- | --- |
| `instruction-walk` | 11 rows, all `at: '<project>'` | Walks cwd up to `$HOME`, up to 24 levels, `LIMITS.maxWalkLevels` in `read/instructions.ts` | The STOP condition is `state.ctx.homes.home`. With this Mac's home it never matches a far side path and walks 24 levels every time |
| `@import` chains | inside every instruction file | `addFile` follows `@path` up to `LIMITS.maxImportDepth` of 5 | The targets are not knowable until the file has been read, so they cannot be prefetched |
| `*` segments | `expandGlob` in `read/locations.ts` | One `readDir` per level, capped at `MAX_GLOB_RESULTS` of 256 | Each level is a separate question, so a naive port costs a round trip per level |
| `<pluginInstall>` | 2 rows | Filled from `ctx.pluginRoots`, which the plugin read produces first | Not knowable until `installed_plugins.json` has been read and parsed |

### 1.6 Six environment variables move a path, and only two of them travel today

`resolveHomes` in `src/main/context/env.ts` reads `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`,
`CODEX_HOME`, `XDG_CONFIG_HOME` and `XDG_STATE_HOME`.

The `machine-facts` script in `src/main/machines/remote-scripts.ts` prints four values, being `home`,
`codex_home`, `xdg_data_home` and `uname`. So **two of the five roots the context reader needs are
already crossing, being `HOME` and `CODEX_HOME`.** `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME` and
`XDG_STATE_HOME` are not. `XDG_DATA_HOME` is carried and is not one the context reader reads.

That is three `printf` lines added to one existing script, or three lines in the new one. It is named
here because a remote read that skips it points at `~/.claude` on a machine where the person moved
their Claude Code configuration, and the panel would then draw an empty Skills section and be wrong
rather than empty.

Measured on the Mac Pro this session, all three are unset, so the defaults apply there today.

---

## 2. What already exists, which is most of the work

This is the section that makes the ruling cheap. None of it is new.

| Thing | Where | Why it matters here |
| --- | --- | --- |
| A filesystem port with six methods | `ContextFs` in `src/main/context/port.ts` | A second implementation is the entire change to the reader |
| The port is already injectable | `ScanDeps.fs` in `src/main/context/scan.ts` | The comment says "Injected by the tests; production uses the real filesystem" |
| A second implementation already exists | `createMemoryContextFs` in `port.ts` | A record literal filesystem, used by the precedence tests. A bundle from a machine is the same shape |
| The environment is already injectable | `ContextScanInput.env` in `src/shared/context.ts` | A remote scan passes the far side's environment. No new field |
| Every disk call goes through the port | 31 call sites, counted this session across `read/*.ts`, `executes.ts`, `hash.ts` and `scan.ts` | There is no `node:fs` call in the reader that would bypass a remote port |
| Absence is already a first class answer | `readDir` returns null, `readText` returns null, `stat` returns null | A missing file over there behaves exactly as a missing file here |
| Which roots existed is already reported | `rootReadout` in `scan.ts`, drawn by `sectionHint` in `groups.ts` | The honesty surface for a sparse machine is already built |
| One scan's worth of memoisation | the five `Map`s in `createNodeContextFs` | The overlap of nine agents on `~/.agents/skills` already costs one listing rather than nine |

**The reader shells out to nothing.** The header of `scan.ts` states that as a rule, and the 31 call
sites confirm it. There is no `claude mcp list` in the read path, so there is no per agent CLI that
would have to exist on the other machine.

---

## 3. Can one script carry the whole set in one round trip

**One script, yes. One round trip, no.** Three calls is the measured shape, and the reason is a data
dependency rather than a size limit.

### 3.1 Why one round trip is impossible without cheating

The reader discovers what to read next from what it just read. Three dependencies, in order.

1. A skills root is a directory. Its children are unknown until it is listed, and each child's
   `SKILL.md` is a separate read.
2. `<pluginInstall>` is unknown until `installed_plugins.json` has been read AND parsed as JSON.
3. An `@import` target is unknown until the importing file has been read AND its code fences stripped,
   which is `withoutCode` plus `IMPORT_LINE` in `read/instructions.ts`.

A single round trip would require the far side to do the parsing. That means a second copy of the
frontmatter parser, the JSONC parser, the TOML parser and the import matcher, written in `/bin/sh`,
on the other side of a link, where nothing checks it against `BLOCKS`. **Refused.** It would also
break the rule the reader's own header states, being that the branch is on the file format and never
on the agent.

### 3.2 The shape that is ruled for

One catalogue entry, `context-read`, `mode: 'read'`, `params: 3`.

```
  $1  a newline separated list of directories to enumerate
  $2  the depth to enumerate them to
  $3  a newline separated list of files to read, returned base64 encoded

  output, between the two __TORTIE_RUN__ markers
    M <mtime> <size> <mode> <path> <symlink target>     one per entry found
    B <path>                                             followed by one base64 line
    X <path>                                             a file that was not there or not readable
```

It obeys the seven rules in the header of `remote-scripts.ts`. It is a constant string, it reads only
`"$1"` to `"$3"`, it begins `set -e` then `umask 077`, it prints between the markers, it names none
of the eleven forbidden commands, its only redirection is `2>/dev/null`, and it is safe to run twice
because it writes nothing.

**It carries no knowledge of the reader.** It does not know what `SKILL.md` is. That is the property
that makes it one script rather than a second table.

### 3.3 How the calls are driven, and why it converges

Main runs `scanContext` against a bundle backed `ContextFs` that answers from what has been fetched
and RECORDS every path it could not answer, together with the method that asked. Then it sends one
`context-read` call, where the enumerate list is the paths missed by `readDir` and the read list is
the paths missed by `readText` and `hashFile`. `stat`, `exists` and `realPath` are answered from the
metadata lines that come back for both lists. It repeats until the miss set is empty.

It converges because the reader is deterministic and every limit in it is a constant. The pass count
is bounded by the reader's own dependency depth, and a cap of 8 passes is the honest ceiling.

| Pass | What it asks for | Present on a machine with plugins |
| --- | --- | --- |
| 1 | The 60 static roots. Enumerate the directory shaped ones to depth 2, read the file shaped ones | always |
| 2 | Every `SKILL.md` under the children found, every plugin manifest, `realPath` of each | always |
| 3 | `<pluginInstall>/skills` for the install paths parsed in pass 2, and their `SKILL.md` | only when the machine has plugins |
| 4 to 8 | One per level of an `@import` chain | only when an instruction file imports another |

Enumerating to depth 2 rather than depth 1 is what keeps pass 2 from becoming two passes. It was
measured, see §4.

**`includeNested: false` for a remote scan.** `readNested` in `read/skills.ts` is a breadth first
walk of the project root to `NESTED.maxDepth` of 3 with a budget of `NESTED.maxDirs` of 400, and it
calls `readDir` once per directory, so it adds up to three more passes on its own. There is precedent
in the tree for turning it off on a cost budget, being `installLaunchContextResolver` in
`src/main/context/launch-resolver.ts`, which already passes `includeNested: false` and says why.
The panel should say that nested project skills are not listed for a machine. That is a named gap,
not a silent one.

### 3.4 The size limits, checked rather than assumed

| Limit | Value | Measured against the shape here |
| --- | --- | --- |
| `REMOTE_SCRIPT_MAX_BYTES` in `remote-scripts.ts` | 131,072 | The composed pass 1 command measured **2,835 bytes**, which is 46 times under |
| The enumerate parameter, pass 1 | no separate limit | **2,467 bytes for 71 paths** |
| The read parameter, pass 2 on the rich machine | no separate limit | **7,138 bytes for 101 paths** |
| `MAX_BUFFER_BYTES` in `exec-plane.ts` | 67,108,864 | The largest measured single payload was **2,205,144 bytes**, which is 30 times under |
| `REMOTE_RUN_TIMEOUT_MS` in `remote-run.ts` | 15,000 | The slowest measured call was **0.285 s** |
| `SCAN_DEADLINE_MS` in `context/ipc.ts` | 20,000 | The rich estimate is about **1.3 s** |

The read parameter is the one that can grow. At the measured path lengths, 131,072 bytes is about
1,800 paths in one call. A machine with more `SKILL.md` files than that needs the list chunked. The
rule to write into the phase is that the list is split at 100,000 bytes and each chunk is one more
call, which costs the measured per call overhead and nothing else.

---

## 4. What it costs, measured

### 4.1 The two machines

| | This Mac | The far side |
| --- | --- | --- |
| Model | Mac16,8, `Gregs-MacBook-Pro-2` | Mac14,8, `Gregs-Mac-Pro` |
| Architecture | arm64 | arm64 |
| OS | Darwin 24.6.0 | Darwin 24.6.0 |
| Link | Tailscale, `gregs-mac-pro.tail2ddfe1.ts.net` | same |
| Declared context paths present, of 71 | **29** | **3** |

The three that exist on the Mac Pro are `/Users/gdc/.claude.json`,
`/Users/gdc/.cursor/plugins/local` and `/Users/gdc/.cursor/skills-cursor`.

**This is the honest problem with the measurement and it is stated up front.** The Mac Pro holds
almost no agent configuration, so the real remote numbers are small. Every "rich machine" number
below is this MacBook Pro's own disk, measured locally with the same shell scripts, and the transfer
cost for those payload sizes was then measured on the real link.

`~/.ssh/known_hosts` was 2,120 bytes before this work and 2,120 bytes after. The multiplexing socket
used for the measurements was created under `/tmp` and closed with `ssh -O exit`.

### 4.2 The round trip itself

| Shape | Runs | Seconds |
| --- | --- | --- |
| ssh with `ControlMaster` already up, `true` | 8 | 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.11, 0.03 |
| ssh with no multiplexing, `true` | 5 | 0.19, 0.30, 0.19, 0.17, 0.27 |

`src/main/machines/ssh.ts` sets `ControlMaster=auto`, `ControlPath` and `ControlPersist`, so **0.03 s
is the number that applies to Tortie** and 0.20 s is what a first call after a quiet period costs.

### 4.3 Why batching is the whole design, measured

| Shape | Seconds |
| --- | --- |
| 71 paths asked one per ssh call | **3.22, 3.29, 3.14** |
| The same 71 paths in ONE call | **0.05, 0.12, 0.05, 0.03, 0.04, 0.04** |

That is a factor of 71 and it is the same finding research 55 made for the Explorer, being 409.7 ms
for nine folders as nine calls against 42.3 ms for the same nine in one subtree call.

### 4.4 The real remote read, against the Mac Pro as it is

Two calls, because the Mac Pro has no plugins and no import chain.

| Run | Call 1, seconds | Call 2, seconds | Total, seconds |
| --- | --- | --- | --- |
| 1 | 0.108 | 0.169 | **0.277** |
| 2 | 0.142 | 0.285 | **0.427** |
| 3 | 0.239 | 0.195 | **0.433** |
| 4 | 0.083 | 0.253 | **0.336** |

Call 2 returned 112,946 bytes, of which 66,190 is the base64 of that machine's 49,640 byte
`~/.claude.json`. Call 1 returned 951 bytes across 13 lines.

**0.28 to 0.43 s** is therefore what remote Context costs on the operator's own Mac Pro today.

### 4.5 The rich machine, which is the number that decides the phase

Far side work, measured by running the same shell scripts locally against this MacBook Pro's own
configuration.

| Call | What it does | Seconds | Payload bytes |
| --- | --- | --- | --- |
| 1 | Enumerate 32 directory roots to depth 3, read 39 file roots | 0.208, 0.209, 0.211 | 2,205,144 |
| 2 | Enumerate 5 plugin install roots, read 91 `SKILL.md` | 0.321, 0.305, 0.293 | 1,246,171 |
| 3 | Read the 39 plugin `SKILL.md` and `.mcp.json` found | 0.201, 0.167, 0.199 | 990,607 |
| | **total** | **0.71** | **4,441,922** |

Transfer of those bytes, measured on the real link from the Mac Pro.

| Bytes | Seconds |
| --- | --- |
| 81,152 | 0.078, 0.085, 0.106 |
| 1,600,000 | 0.178, 0.272, 0.162 |
| 3,279,433 | 0.307, 0.201, 0.298 |
| 5,000,000 | 0.413, 0.367, 0.572 |

So a rich machine costs about **0.71 s of far side work, plus about 0.41 s of transfer, plus three
round trips at 0.03 s, which is about 1.3 s.**

The tree states the local scan at 67 to 85 ms warm and 596 ms on a cold page cache, in the comment
above `SCAN_DEADLINE_MS` in `src/main/context/ipc.ts`. **That figure was not re-measured this
session** because this worktree has no `node_modules`. Taking it as written, a remote scan is about
15 times the local one and it sits inside a 20,000 ms deadline with a factor of 15 to spare.

### 4.6 What dominates the cost, and the one cheap win

The payload is dominated by two files.

| File | Bytes on this Mac | Share of the 2.5 MB read set |
| --- | --- | --- |
| `~/.claude.json` | 1,297,547 | 52 percent |
| `~/.codex/config.toml` | 287,431 | 11 percent |
| 91 `SKILL.md` | 918,522 | 37 percent |

`~/.claude.json` is read twice by the table, once as `mcp-claude-user` and once as
`mcp-claude-local`, and the `group` mechanism in `resolveLocations` already collapses that to one
read. It still crosses whole on every refresh.

**The cheap win is a cache keyed on path, size and modification time.** Pass 1 already returns those
three for every entry, so a second refresh can send an empty read list for every file whose triple is
unchanged. On the numbers above that turns a 1.3 s refresh into roughly 0.2 s. It is one map and it
should be in the same phase.

### 4.7 The plugin cache is the one place a generous enumeration is wrong

`~/.claude/plugins` on this Mac holds 773,192 KB. Enumerating it blindly costs the following.

| Depth | Entries | Metadata bytes | Seconds | `SKILL.md` found |
| --- | --- | --- | --- | --- |
| 4 | 686 | 66,654 | 0.035 to 0.040 | 1 |
| 5 | 4,010 | 547,536 | 0.094 to 0.111 | 53 |
| 6 | 5,577 | 738,701 | 0.108 to 0.114 | 53 |
| 7 | 9,564 | 1,365,720 | 0.162 to 0.222 | 149 |

Blind enumeration would need depth 7 and would cost 1.37 MB to find 149 files. Asking
`installed_plugins.json` first and enumerating only the install paths it names cost 0.30 s and found
what the reader actually wants. **That is why pass 3 exists rather than being folded into pass 1.**

### 4.8 `realpath` is load bearing and it is cheap

`identity` for a skill is `skill:${realPath}`, at `read/skills.ts`. The realpath dedupe is what turns
many directory entries into one row. Measured on the 91 `SKILL.md` paths on this Mac, `realpath`
collapsed them to **85 distinct files in 0.025 s**.

`/bin/realpath` exists on the Mac Pro, checked this session. It is not on every machine. The POSIX
fallback, being `cd "$(dirname f)" && pwd -P` per path, was measured at **0.409 and 0.435 s for the
same 91 paths**, which is 16 times slower because it spawns two subshells per path. The rule is to
use `realpath` when `command -v realpath` answers and the fallback only when it does not.

---

## 5. What happens when a path is absent over there

**Nothing new is needed, and this is the strongest part of the answer.**

The `ContextFs` contract already makes absence an ordinary value.

| Method | Answer for a path that is not there |
| --- | --- |
| `readDir` | `null` |
| `readText` | `null` |
| `stat` | `null` |
| `exists` | `false` |
| `realPath` | the path it was given, unchanged |
| `hashFile` | `null` |

Every reader is written against that. `readRoot` returns `[]` when `readDir` is null. `readOneSkill`
returns null when `readText` is null. `addFile` returns without adding when the text is null.
`resolveLocations` skips a group member that does not exist. The header of `scanContext` states the
rule directly, being that an unreadable file becomes a problem in the result and the rest of the
view still renders.

`rootReadout` in `scan.ts` records `exists` for every location, and `sectionHint` in `groups.ts`
draws only the roots that exist into the section tooltip. So a machine with three of seventy one
paths present already draws three paths in that tooltip and says nothing about the other 68.

**Proved on the Mac Pro this session.** 68 of 71 declared paths are absent there. The one shot script
returned 951 bytes with no error and no empty answer. The catalogue's own convention covers the last
case, being that a script with nothing to report prints `REMOTE_SCRIPT_EMPTY`, which is the word
`none`, so that "the machine answered and there was nothing" stays apart from "the machine did not
answer".

One distinction the phase must keep. **"Absent" and "the link died" must not draw the same panel.**
A dead link is `execRemoteShell` throwing, which `runRemoteScript` classifies, and the panel should
show the unreachable state rather than an empty Skills section. An empty Skills section on a machine
that answered is a true statement about that machine.

---

## 6. The conformance matrix, which is the hard constraint

**A remote read cannot break a row of that matrix, and the reason is structural rather than careful.**

### 6.1 What the gate reads

`build/conformance-context.mjs` runs `build/context-matrix-probe.mts`, which imports exactly six
things.

| Import | From | Touches disk |
| --- | --- | --- |
| `CONTEXT_CATEGORIES` | `src/shared/context` | no |
| `CONTEXT_AGENT_IDS` | `src/main/context/agent-context` | no |
| `displayName` | same | no |
| `locationsFor` | same | no |
| `precedenceReadoutFor` | same | no |
| `reloadFor` | same | no |

`agent-context.ts` has **one value import in the whole file**, and it is `AGENT_REGISTRY` from
`../agents/registry`. Everything else it imports is a type. `registry.ts` imports types and
`@shared/agent-defaults`. Neither file names `node:fs`, `node:os` or `node:child_process`, checked
this session.

### 6.2 Every field the gate checks is a constant

| Field the probe emits | Where it comes from | Depends on a file |
| --- | --- | --- |
| `agent`, `displayName`, `category` | `BLOCKS` and `AGENT_REGISTRY` | no |
| `ownLocations` | `locationsFor(...).filter(l => l.bundled !== true).length` | no |
| `model`, `evidence`, `note` | `precedenceFor` reading `BLOCKS[agent].precedence` | no |
| `scopeOrder` | `scopeOrderFor`, which folds the `rank` numbers in `BLOCKS` | no |
| `reload` | `reloadFor` reading `BLOCKS[agent].reload` | no |

`scopeOrderFor` is the one worth naming, because it is derived rather than written twice. It reads
the declared `rank` of each location and sorts. It **does not** ask whether any of those locations
exists. Claude Code's skills come back `global` before `project` on a machine with no skills at all,
and Gemini's come back the other way, because the numbers say so.

**So all five checks the gate makes are answered before any disk is touched, on this Mac or any
other.** The gate's own header says it "reads no file under the user's home", and that is true by
construction rather than by discipline.

### 6.3 The two ways a phase could still break it, and the rule that prevents both

1. **A second table.** If a remote reader introduced its own `BLOCKS`, or a machine conditional
   branch inside the existing one, the gate would keep passing while the panel drew a different
   ladder for a remote tab. **Rule: the remote reader imports `locationsFor`, `precedenceFor` and
   `reloadFor` from `agent-context.ts` and declares nothing of its own.** The phase brief says so and
   an import boundary assertion can hold it, since `build/assert-import-boundaries.mjs` already
   exists.
2. **A remote-only precedence override.** Any proposal that says "on a machine we cannot tell which
   wins, so show them all" would flatten a row. It is also unnecessary. The reader already has three
   models that resolve nothing, being `no-override`, `cli-reported` and `unknown`, and `resolveForAgent`
   handles all three through the `COEXISTING` map. A remote scan uses the same map.

**A remote answer that breaks a row is refused, and under those two rules there is no mechanism by
which one could.** `npm run conformance:context` should be added to the gate list for the phase
anyway, because the phase touches `src/main/context/`.

### 6.4 Not run

`npm run conformance:context` was **not executed** this session. This worktree has no
`node_modules`, and installing one would have written to the tree. The claim above is from reading
the import graph of the probe and the checker, both of which were read in full. Running the gate is
the first thing the phase should do.

---

## 7. What is genuinely local forever

There are twelve `context:*` IPC channels, registered in `src/main/context/ipc.ts` and
`src/main/context/session-ipc.ts`. **One of them reads files. Eleven do something else.**

| Channel | What it does | Travels | Why |
| --- | --- | --- | --- |
| `context:scan` | Reads the declared paths | **yes** | It is `scanContext`, and it takes both its disk and its environment as arguments |
| `context:skillsCapability` | Asks whether the bundled skills binary is there | **no** | `src/main/skills/resolve.ts` resolves it under `process.resourcesPath`. It is a program inside Tortie's signed bundle |
| `context:skillsPlan` | Composes an argv for that binary | **no** | Same binary |
| `context:skillsRun` | Runs that binary, which writes files | **no** | It is a write and it is a process start. §7.1 |
| `context:skillsSearch` | Queries `https://skills.sh` | **no** | Network, and the machine is not involved |
| `context:skillsAudit` | Scans a downloaded source | **no** | Operates on bytes this Mac downloaded |
| `context:skillsPreview` | Reads a skill from `https://raw.githubusercontent.com` | **no** | Network |
| `context:skillPins` | Re-hashes an installed skill directory | partly | It is `hashFile` over a directory walk, so it works through a remote port, but at a cost §7.2 |
| `context:skillPinRecord` | Writes Tortie's own pin store | **no** | It records what Tortie installed, and Tortie installs on this Mac |
| `context:skillPinForget` | Same store | **no** | Same |
| `context:hashSkill` | Hashes one skill directory | partly | Same as `skillPins` |
| `context:sessionSnapshot` | Reads a column from the manifest | **yes, and it is already right** | §7.3 |

Two menu actions are also local forever, both in `src/renderer/context/menus.ts`. `revealPath` opens
Finder on this Mac and `openPath` opens an editor on this Mac. A remote row's `sourcePath` is a path
on the other computer, so both must be hidden or disabled for a remote row. That is one condition in
the menu builder, and it is the only renderer change the whole feature needs.

### 7.1 Installing a skill on a machine is out of scope and should stay out

`context:skillsRun` executes the binary Tortie ships in its own bundle. Making it work on a machine
would mean sending that binary and running it there. Three separate rules in CLAUDE.md land on that.

- Refusal 6, being no third party native code inside the signed bundle. The skills binary is already
  vendored and signed here, so sending it is a different question, but it is a program arriving on a
  computer through a configuration change.
- Refusal 8, being that nothing may cause a process to start on a configuration change alone.
- The exec plane's own shape, being a frozen catalogue with exactly two `mode: 'write'` scripts.
  Installing a skill would be a third write and a much larger one, because it writes a directory
  rather than one file that must not already exist.

**Ruling: remote Context is READ ONLY. Do not build install, enable or pin for a machine.** The panel
shows what the agents over there will load. Changing it is done by the person, on that machine, or by
an agent running there. Say that in the empty state rather than showing a disabled button.

### 7.2 Hashing is possible and should be left out of the first phase

`attachHashes` in `src/main/context/hash.ts` walks a skill directory and hashes every file. Over a
remote port that means pulling every byte of every skill, which on this Mac is 10,381,470 bytes for
612 files rather than the 2.5 MB the reader actually opens. `ContextScanInput.hash` already defaults
to `'none'`, so a remote scan simply does not ask. The drift readout that depends on a hash is
therefore absent rather than wrong.

### 7.3 The launch snapshot for a remote session, which is already honest

`recordLaunchContext` is called from exactly two places, both in `src/main/sessions/core.ts`, being
the local create path and the restore path. The comment at the create site states that a session on
another machine takes a different path entirely, and `grep` confirms `remote-sessions.ts` never calls
it.

**So a remote session records no launch snapshot today, and the detail readout shows its unrecorded
sentence.** That is correct rather than broken. If it did record one, it would resolve `<project>`
and `~` against THIS Mac and write another machine's configuration under that session's id, which
would be a wrong answer with a timestamp on it.

Recording a real one is a later phase and it has a cost problem. `launch-resolver.ts` says the create
path budget is a 3 second leash. A remote scan measured at about 1.3 s on a rich machine fits, but
`recordLaunchContext` is detached and deadlined already, so the worst case is a null snapshot, which
is exactly what happens now. **It is a phase 2 item, not a phase 1 item.**

---

## 8. What was not measured, named rather than assumed

| Not measured | What would measure it |
| --- | --- |
| Any Linux machine. Every measurement is Darwin to Darwin, both arm64 | Add a Linux machine and re-run the same three scripts. `stat -c` and `base64 -w0` differ, and `STORE_LIST` in `remote-scripts.ts` already carries the two spellings of `stat` as precedent |
| A far side holding a full agent set. The Mac Pro has 3 of 71 declared paths | Run the same scripts on a machine with a real configuration. The rich numbers here are this MacBook Pro measured locally |
| `npm run conformance:context`. It was not run, because this worktree has no `node_modules` | Run it. The claim in §6 is from the probe's import graph, read in full |
| `scanContext` itself. It was never executed. The 67 to 85 ms local figure is quoted from the comment above `SCAN_DEADLINE_MS` | Run the panel and read the `durationMs` field the scan already returns |
| A cold page cache on the far side. Every remote run followed an earlier one | Reboot the Mac Pro and run once. The tree records 596 ms cold locally against 67 to 85 ms warm |
| A slow or lossy link. Both machines are on one LAN over Tailscale | Measure over a cellular hotspot. The transfer table in §4.5 is the input |
| `RemoteContextFs`. Nothing was implemented | Build it. It is six methods over a `Map` |
| The nested project skill walk on a machine. §3.3 rules it out rather than measuring it | Turn `includeNested` on for a remote scan and count the passes |
| `~/.claude.json` at 1.17 MB crossing on every refresh with the mtime cache in place | Build the cache and measure the second refresh |
| Whether any agent writes a path with a newline in it | The catalogue's own note on `STORE_LIST` says such a line is dropped by the parse rather than guessed at, and no store it measured writes such a name |

---

## 9. The phase, in one row

**Phase name.** Context on a machine.

**What a person can do afterwards.** Open the Context panel on a tab whose project is on another
computer and see the skills, MCP servers, hooks, plugins and instruction files the agents over there
will load, with the same precedence ladders, the same shadow marks and the same counts as a local
tab.

**Size.** Medium. One new script in `remote-scripts.ts`, one new `ContextFs` implementation, one miss
driven loop, one mtime cache, one condition in `menus.ts`, one sentence in the empty state.

**Tier.** Tier 2. It reads files, starts nothing, writes nothing on either machine, and touches no
durable state. It is NOT Tier 3, because there is no path by which it can lose a person's work.

**Risk.** Low. The largest one is drawing this Mac's configuration under a remote tab, which is
prevented by passing the far side's environment rather than `process.env`, and which a test can pin
by running one scan with two different `env` objects and asserting the roots differ.

**Depends on.** A connected machine, and the three extra environment lines in §1.6.

**Gates.** `npm run conformance:context` and `npm run conformance:machines`, on top of the usual
battery. The first is required because the phase touches `src/main/context/`. The second is required
because the phase adds a row to the script catalogue.

**Explicitly NOT built, and say so in the report.** Installing a skill on a machine, enabling one,
pinning one, hashing one, revealing one in Finder, the nested project skill walk, and the launch
snapshot for a remote session.
