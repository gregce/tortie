# 85. The remote gap, measured against local and against herdr 0.9.0

Phase 224. Written 2026-09-07 against the tree at `761776a`, driven against
`gregs-mac-pro.tail2ddfe1.ts.net`, and compared with `/Users/gdc/herdr` at `a9f3ad5f`, which is
version 0.9.0.

This document answers a report the operator made on 2026-09-07: that the remote machine work is not
smooth, that four of the five nav views are clunky on a machine, that write access in particular is
clunky, and that he wants to know what parity with the local experience would cost.

Every number here is one a probe took. Where two probes read the same thing differently, this
document says so and says which reading it trusts. Anything that was not measured is marked
UNMEASURED with the reason.

## 1. The answer first

The remote work landed almost completely: of research 57's twenty gaps, thirteen shipped whole, two
shipped half, and the refusals still hold, so this is not a half-built feature. What is wrong is
three things, and only the third is the philosophical one the charter expected. First, his machine
has no write root, so every write verb Phases 101 to 104 built is dark on the only machine he owns,
and the control that would reveal this is a disabled button whose tooltip reads like a permanent
product limit. Second, nothing on a remote view ever re-reads by itself: a file written on that
machine never appeared in 30 seconds, where the same file appeared locally in 513 ms with no press,
and five of the seven remote views do not even retry when the machine starts answering, so a correct
sentence stays on screen after it stops being true. Third, one shared liveness boolean stands in
front of all 21 far-side channels, so a single missed session-list poll takes Explorer, Search,
Source control, Context and every write dark together, and one unreachable machine cost the machine
that does answer 19,789 ms at launch. The far-side machinery itself is fast and correct: a write is
156 ms, a stage 88 ms, a search 53 ms, and every refusal is honest. Closing the gap is roughly six
phases, and the first two are small: turn write access on and make the disabled control name the
door, then give the five stale views the eight-line retry the other two already have. Those two
would remove most of what he is feeling.

## 2. Where the work landed

Research 57 is from 19 August and twenty-one phases have landed since, so its rulings are checked
here rather than repeated. The table is read from the tree at `761776a` and confirmed by driving
where driving could reach it.

| # | Gap | Research 57 ruling | Today | Read at |
|---|---|---|---|---|
| 1 | untracked in Changes | Build | Built. Its own group, its own count, its own U badge. Capped at 30 rows per group, which local has no equal of | `remote-scripts.ts:681`, `remote-review.ts:126`, `ScmSection.tsx:932` |
| 2 | search | Build, `ls-files` plus far-side grep | Built as ruled. Three modifiers cross. Files-to-include, files-to-exclude and the ignore-files toggle are disabled with a sentence, and the local 10 MB file cap has no far-side equal | `remote-scripts.ts:2779`, `search/store.ts:418`, `QueryBlock.tsx:196` |
| 3 | Quick Open | Build | Built. 50,000 names, 4 MB, 5 s warm cache | `remote-scripts.ts:2789`, `filesystem.ts:236`, `filesystem.ts:247`, `search.ts:386` |
| 4 | scroll back | Build the smaller affordance | Built exactly as ruled. A Read last lines panel at four depths, no scrollbar | `remote-lines.ts`, `terminal-menu.ts:226` |
| 5 | save a file | Build | Built, and dark on his machine. Ceiling 90,000 bytes, refused at open when saving is on | `filesystem.ts:329`, `tab-io.ts:292` |
| 6 | new file | Build, same door | Built. Refuses an existing name | `tree-ops.ts:335` |
| 7 | new folder | Build | Built | `remote-scripts.ts:2857` |
| 8 | rename and move | Build | Half built. Rename landed. Move did not: drag is refused at the model, so a remote tree has no move gesture at all | `tree-menu.ts:238`, `use-tree-model.ts:427` |
| 9 | duplicate | Not now, the one that waits | Absent, and never revisited | `tree-menu.ts:251` |
| 10 | trash | Never | Refusal holds twice over: absent from the menu, and no script may name a bare `rm` | `tree-menu.ts:261`, `conformance-machines.mjs:7038` |
| 11 | reveal | Never | Held in three places and worked around in a fourth. See below | `EditorTabs.tsx:91` |
| 12 | Symbols | Contradicted inside research 57. See below | Refusal holds. The palette opens and says where | `symbols-store.ts:193` |
| 13 | stage | Build | Built. Conflicted rows carry no verb | `remote-scripts.ts:2881` |
| 14 | unstage | Build | Built, with the `rm --cached` fallback | `remote-scripts.ts:2892` |
| 15 | discard | Never | Refusal holds and is executable over all 25 scripts | `conformance-machines.mjs:6971` |
| 16 | commit | Build | Built, head-sha guarded. It never stages first, so there is no Stage all and commit | `remote-scripts.ts:2905` |
| 17 | history and any commit's file diff | Build | Half built. Graph, lanes, marks and Load 50 more landed. Clicking a commit does nothing, and a sentence says the files one commit changed are not read | `RemoteHistorySection.tsx:477` |
| 18 | branches | Build | Built to spec. Read only by design | `RemoteBranchSection.tsx:19` |
| 19 | runs | Build | Built to spec. A row opens GitHub and never expands into jobs, which local does | `RemoteRunsSection.tsx:20` |
| 20 | Context | Build | Built as a port swap, same reader, same precedence matrix. Two stated losses: no drift readout, no nested reads | `remote-agent-context.ts:394` |

Thirteen shipped whole. Two are half: gap 8, where rename landed and move did not, and gap 17, where
the graph landed and the commit file diff did not, which the Phase 107 entry's own evidence line had
asked for.

The catalogue grew from 12 scripts to 25, being 17 reads and 8 writes, counted from
`src/main/machines/remote-scripts.ts`. `ALLOWED_WRITERS` in `build/conformance-machines.mjs:2843`
names eight ids, which is the six writes research 57 planned plus the two that predate it.

### The one that waits, and a contradiction inside research 57

The one that waits is duplicate. It is absent, no phase was ever queued for it, and the backlog
records it as deferred three times without reopening it.

Research 57 disagrees with itself about Symbols, and this document does not resolve the
disagreement in its own favour. Its section 0 names Symbols as one of four permanent refusals. Its
section 8 table rules Symbols "not now, revisit after save", and its own rows-that-should-not-be-built
table says "revisit after phase 6". Counting section 8's table gives 15 build, 2 not now and 3 never,
which is 20; its totals line says 15, 1 and 4, which needs Symbols counted as a refusal. Section 8's
table is the specific ruling and the totals line is the summary, so the reading this document trusts
is that Symbols waits and that there are three permanent refusals rather than four. Phase 6 in that
plan is save, which shipped as Phase 101 on 21 August, so Symbols' own stated revisit condition has
been satisfied for seventeen days and nothing revisited it. That is the operator's call, not this
phase's.

### The reveal refusal is held in three places and lost in a fourth

Reveal is correctly absent from the Explorer tree menu, from Recents and from Context. It is not
guarded on the editor tab strip. `tabMenuItems` in `src/renderer/editor/EditorTabs.tsx:30` never
reads `tab.remote`, although the tab carries that field, so a right-click on a remote file tab
offers an enabled Reveal in Finder over a far-side path, and `fs:reveal` runs
`shell.showItemInFolder` on this Mac. Both machines' home directory is `/Users/gdc`, so a colliding
path reveals the wrong file rather than nothing. Copy Path on the same menu drops the machine prefix
the Explorer deliberately adds, so a remote path lands on the clipboard naming a folder on this Mac.

### Gaps that exist today which research 57 did not know about

1. Architecture is wholly absent on a remote tab. One sentence, no map, no reading, no contract.
   `ArchView.tsx:182` reads `localPathOf(target)`, which is null for a machine, so main is never
   asked. There is no architecture script among the 25 and `src/main/arch/` never names a machine id.
2. The Explorer on a machine has no git decorations. The local tree's row for `NOTES-untracked.md`
   carried a U mark and the remote tree's identical row did not, read off the DOM in one run.
   `Sidebar.tsx:343` returns null for the status list whenever the target has no local path.
3. No ignored-file dimming, for the same reason.
4. Nothing refreshes by itself. Section 4a measures this.
5. Catch Me Up says nothing for a remote session. It short-circuits to one line.
6. The editor tab strip's Reveal and Copy Path, above.
7. An image on a machine cannot be previewed. The remote branch is taken before the image branch, so
   a PNG comes back as a binary note.
8. File history, from Phase 198, is absent on a remote row. That is correct, because the walk runs
   git on this Mac.
9. History search and the history scope control, from Phase 199, are local only.
10. Logins never cross. `loginSessionEnv` is composed only in the local launch plan and nothing in
    `src/main/machines/` names a login, so a remote session runs on whatever that machine's own CLI
    is signed in as, with nothing in the interface saying which.

## 3. What is clunky, named

His phrase was "the 4 main nav bar issues". There are five views on the rail, read off the DOM as
Explorer, Search, Source control, Context and Architecture.

The answer is that he is exactly right, and the fifth is not clunky but absent. Explorer, Search,
Source control and Context all work on a machine and all four are clunky in the ways below.
Architecture draws one sentence on a remote tab and nothing else: "A contract is read on the
computer its repository is on, and this build cannot ask that computer anything." On the local tab
of the same fixture the same view drew a full reading in 38 ms.

### 3.1 What a person meets, with timings

One app run, a remote tab and a local tab, the same 26-file fixture with three commits, two modified
files, two untracked files and a side branch on both machines.

Clicking a rail icon to the first visible change in the sidebar was 50 to 52 ms on every view on
both sides. The switch itself is never the problem.

| view | remote | local |
|---|---|---|
| Explorer, first tree row | 101 ms, 8 rows | 102 ms, 8 rows |
| Search, typed query to first row | 156 ms, 13 results in 13 files | 52 ms, 13 results in 13 files |
| Source control, first row on a warm boot | 510 ms and 1,280 ms over two launches | already drawn in the first sample, so this probe never saw it wait |
| Context, first content | 683 ms for the underlying read | 153 ms |
| Architecture | absent, one sentence | a full reading at 38 ms |

Two probes measured local search differently and this document does not average them. The
remote-versus-local pair above, 156 ms and 52 ms, was taken in one app run on one fixture with one
sampler, and that is the pair this document trusts for the comparison. The local baseline probe read
155 to 166 ms for a first answer on its own 20-file fixture, because it typed the term one character
at a time through the real field and its clock starts at the first keystroke, before the debounce.
Both readings are true of what they measured.

### 3.2 What each view shows while it waits

Explorer and Source control show the machine band and their standing prose at once, then the rows
arrive. Context shows "Reading what agents will load on Greg's Mac Pro", which is the one honest
in-flight sentence on any remote view. Search shows nothing at all for the whole wait: the sidebar
held 161 characters, being the header alone, at 53 ms and again at 104 ms, then jumped to 682
characters at 156 ms. The local search view streams, reaching 415 characters and 8 rows at 204 ms in
the same run. The local search view even says so in its own idle text, "Matches stream in as they
are found"; the remote one is a single answer that arrives whole.

### 3.3 Where it looks different

The remote views carry standing explanation that the local views do not. Counted from the paragraphs
themselves, captured off the DOM:

| view | remote words of standing prose | local |
|---|---|---|
| Explorer | 35, being a 26-word band and a 9-word read-at line | 0 |
| Search | 48, being the same 26-word band and a 22-word note about the far machine's grep | 0 |
| Source control | 138, in six paragraphs | 0 |

The six paragraphs on Source control are the band at 6 and 20 words, the changes note at 25, the
hooks and signing note at 29, the read-at line at 9, and the sections note at 49. The driving probe
reported 34, 54 and 142 to 149 for the same three views. The difference is where the view's own
header and its result counts were included; this document uses the paragraph counts because it can
quote every paragraph. The finding does not depend on which is used. This is the operator's own
"just enough words" rule, and the remote views are where it broke.

Refresh controls on one Source control view, counted from their labels: remote has five, being Read
what changed on that machine again, Refresh changes, Refresh history, Refresh branch and Refresh
runs. Local has two, being Refresh git status and Refresh branches, and the local view does not need
them, which is section 4.1.

### 3.4 What each view cannot do at all

Architecture: everything. Explorer: git decorations and ignored-file dimming. Search: include,
exclude and the ignore-files toggle do nothing and the view says so, and Symbols do not reach a
machine. Source control: no File history section, no Branches section (it draws a singular Branch
for the checked-out one), and it cannot show the files one commit changed. Context: skills kept
inside the project folder are not listed, and installing, enabling and pinning work on this Mac only.
The Context read is genuinely of the far machine: it returned the Mac Pro's five entries under
`~/.cursor/skills-cursor` and 11 bundled skills, against this Mac's 22 and 77.

### 3.5 Write access, which he named

Every one of the four write verbs works over the real link and they are fast. Each number is one
call, taken in the app against the scratch repository on his Mac Pro:

| call | ms | outcome |
|---|---|---|
| putFile, replacing a file Tortie had read, 113 bytes | 156 | wrote |
| putFile, the same call again | 56 | stale, nothing written |
| putFile, a new file, 13 bytes | 54 | wrote |
| putFile, a path outside the confirmed folder | 0 | outsideRoot, refused on this Mac, nothing sent |
| makeDir | 29 | made |
| makeDir again | 27 | exists |
| renameEntry | 26 | moved |
| stage | 88 | done |
| unstage | 82 | done |
| commit | 123 | failed |
| reviewFiles | 51 | 3 files plus untracked |
| listTree | 35 | ok |
| searchContent | 53 | 13 files |
| readBranch | 72 | ok |
| readHistory | 93 | ok |
| readContext | 683 | ok, seven times the next slowest |

For scale, this Mac's own answers in the same run: `git.status` 24 ms, `git.log` 29 ms,
`git.branches` 11 ms, `quickOpen.query` 3 ms. Through the real controls rather than the bridge,
pressing a row's own Stage button changed the view at 255 ms.

The far side confirmed every one. A file ends with the line Tortie wrote, a renamed file is where it
was moved to, a new folder and a new file exist, and `/Users/gdc/p224-outside.txt` does not.

So the machinery is not what is wrong. Three things around it are.

The first and largest is that his machine cannot write anything at all today. His
`config/machines.json` holds one row, `greg-s-mac-pro`, carrying `host`, `label`, `color` and
`remoteTmuxPath`. It has no `writeRoot`. His `config-confirmations.json` confirms it, agreed at
2026-08-18 12:18:08, with exactly two lines and no third line naming a folder;
`describeMachine` at `src/main/machines/confirm.ts:445` adds that third line whenever the fields
carry a write root. So New file, New folder, Rename, Save, Stage, Unstage and Commit all refuse on
the only machine he has, and every remote file tab is read only. Phases 101 to 104 all shipped on
21 August and it has never been switched on for him.

The second is that the control he can reach is a dead end. `Sidebar.tsx:186` makes the Explorer's
New file and New folder buttons unavailable when the tab's machine has no write root, and their
hover title reads "Tortie only reads files on Greg's Mac Pro." That sentence names no way to change
it and reads as a permanent product limit. The sentence that does name the way,
`remoteEntryWritesOff`, says "Open Settings, then Machines, then Greg's Mac Pro, and let Tortie save
files there", and it is only reachable from a menu item behind the button the first sentence has
already disabled. The editor's own refusal, `remoteSaveRefused`, names the three steps correctly.
Its doc comment at `src/renderer/machines/editor.ts:45` says "The toast that carries it also carries
a button labelled Open settings", and the one call site at `src/renderer/editor/tab-io.ts:459`
passes only `{ sticky: true }`. The toast type supports an action and another call site already uses
one with exactly that label. The mechanism exists, this site does not use it, and a comment
describes a button that is not there.

Turning it on is typing an absolute far-side path into a plain text field in Settings, Machines, the
row disclosure, Saving files. There is no picker and no browse, even though `machines:listDir`
already ships and the Explorer already lists folders on that machine.

The third is the commit. Every commit on his Mac Pro fails, because git there has no global
`user.name` and no `user.email`. Tortie's own sentence is good: "The commit failed on Greg's Mac
Pro." followed by "git on Greg's Mac Pro has no name and no email address set, so it would not make
the commit. Set user.name and user.email in git on that machine." Three things around it are not.
The Commit button is available and nothing is checked before the press. The failure arrives after
the press, on a machine he is not sitting at. And git's own raw text is printed on the resting face
underneath, beginning "Author identity unknown" and running to "fatal: unable to auto-detect email
address". That is machinery on the surface, which the Zen forbids. `readBranch` already runs on that
machine and could ask the same question once.

This phase did not change his git configuration and wrote nothing to his `~/.gitconfig`.

One reading is withdrawn. An earlier pass reported the Explorer's New file and New folder buttons
unavailable on a connected machine with a write root; that reading was taken on a disconnected tab.
On a connected tab with a write root both are available. A second earlier reading said Quick Open
answered `missing` on a machine; that was the probe's own wrong argument name, and the corrected
reading is 26 paths in 90 ms.

The 90,000 byte save ceiling is worth knowing before it is met. Of 2,096 tracked files under `src/`
in this repository, nine exceed it, five of them source, the largest being
`src/main/sessions/core.ts` at 147,299 bytes. Over all 2,964 tracked files, 114 exceed it, which is
3.85 percent.

## 4. What "not smooth" is made of

Four measurable parts.

### 4.1 Nothing polls a machine

Measured on both sides in one run. A file created while the tab was open appeared in the local
Source control view with no press at all, in 513 ms. The same file, written by Tortie's own door on
the far machine, never appeared in 30 seconds. Pressing "Read what changed on that machine again"
showed it in 203 ms.

The machinery is fast and nothing asks it. The product states this in its own source, at
`src/renderer/machines/presentation.ts:55` and `src/renderer/scm/remote-changes.ts:65`, and the
stated reason is a concurrency worry rather than an inability: nothing counts calls in flight to one
machine and the far machine's effective ceiling is 10.

The same shape has a second half. Two views subscribe to the machine answering and buy one extra
read per sign-in, being Source control and the Explorer's Files section; `machineAnswering` is
named in four files under `src/renderer`, being those two consumers, its own definition and its own
test. History,
Branch, Runs, Context and Search do not. `RemoteRunsSection.tsx:58` records the decision and defends
it: the cost is one press. The cost is one press in each of five different places, after a sentence
that was true when it was written and is not true now. The measurement the Source control fix round
recorded, at `ScmSection.tsx:1059`, is the size of it: a sentence saying the machine did not answer
was still on screen at 11.5 s with the link long since connected. That is still the behaviour of the
other five views today.

### 4.2 One machine that does not answer costs the machine that does about nineteen seconds

Four launches on one profile:

| machines.json | Source control first row |
|---|---|
| an unreachable machine first, then the Mac Pro | 19,789 ms and 19,777 ms |
| the Mac Pro alone | 510 ms and 1,280 ms |

The cause is `signInToConfirmedMachines` at `src/main/sessions/core.ts:1063`, which walks the
confirmed machines one at a time. Its own comment says why, being that a person with a fleet would
otherwise open every connection at once at launch. Two version reads at a 10,000 ms timeout each is
the nineteen seconds. herdr claims the opposite in one line of its own documentation, at
`docs/next/website/src/content/docs/connecting-machines.mdx:46`: "Local opens immediately on startup
without waiting for SSH connections. A stalled machine cannot hold up another machine's input."

### 4.3 One machine's failure is drawn on every other tab

Photographed. With one machine unreachable, the Mac Pro's own tab carries a full-width bar reading
"Tortie could not reach Unreachable. Sessions you started there are not shown here, and Tortie did
not end any of them." `TerminalRegion.tsx:396` filters the machines by link state and by nothing
else, with no filter by the active tab's machine, so the bar appears on the Mac Pro's tab and on a
local tab too.

### 4.4 A failure is not recoverable from where you meet it

The only control that reconnects a machine is Prepare, in Settings then Machines. On a project tab
there is none. The Explorer's Refresh, driven against a disconnected machine, changed nothing in 40
seconds, the same text and the same nine DOM children. A folder cannot be opened on a machine that
is not prepared: `projects.addRemote` answered `{ok:false, reason:"notConnected"}` in 1 ms.

### 4.5 Three sentences the app says that are not true

A machine that cannot be reached is described as one whose tmux version could not be read. Driven at
192.0.2.1, which is documentation address space and routes nowhere, the renderer got "The program at
/usr/local/bin/tmux on this machine would not report its version." The mechanism has a correct
branch for an unreached machine and it is being missed because two deadlines race. The real ssh took
10,011 ms and said "ssh: connect to host 192.0.2.1 port 22: Operation timed out", against a version
timeout of 10,000 ms, so the child is killed with no stderr collected, the phrase table sees
nothing, and the failure class comes back unknown, which is not one of the eight classes that mean
unreached. The 11 ms race is reasoned from two constants and one measured 10,011 ms; the wrong
sentence itself is measured.

A row whose confirm hash moved is reported as a machine that did not answer. Reproduced four times.
Rewriting one execution-bearing field in `machines.json`, or pressing "Stop Tortie saving files
here" in Settings, puts the row into `state: "changed", usable: false`, and the project tab then says
"Greg's Mac Pro did not answer, so Tortie could not read what changed" and "Tortie is not connected
to Greg's Mac Pro, so it cannot read that folder." Both are false; the machine answers ssh in 210
ms. Nothing on the tab says the row needs confirming again or where. Settings says it, on a page the
person is not on.

A machine that did not answer offers more than one that did. Photographed. Connected, the
new-session grid makes 10 of 14 agents unavailable with "A greyed agent was not found on Greg's Mac
Pro when Tortie asked." Disconnected, every tile is offered and none is greyed. The connected answer
is the right one: 12 names asked in 33 ms, three found, being claude, cursor and codex, all under
`/Users/gdc/.local/bin/`.

### 4.6 What is not wrong, so a build phase does not chase it

The Explorer tree on a machine is as fast as the local one, 101 ms against 102 ms on the same eight
rows. Quick Open reaches a machine at 26 paths in 90 ms. Context genuinely reads the far machine's
own home, which is how this document knows the answers differ. Every write verb is idempotent where
it claims to be and every refusal is honest, being stale, exists and outsideRoot. Confirming a
machine and turning saving on can both be driven through the real Settings buttons; the gate is
real, and the confirm press took 1,602 ms and 2,203 ms in two runs.

Both version gates are passing on his machine, and this document refutes the charter's own
suggestion about them. `/usr/local/bin/tmux` there is a link to Homebrew's 3.7c and reports 3.7c.
The running `-L gmux` server reports 3.7b, because Tortie's own bundled tmux started it. Both are in
the tested list. Running the shipping functions rather than reading the list,
`decideRemoteVersionGate('3.7c')` and `decideRemoteControlGate('3.7c')` both answer measured with no
acceptance needed. His row carries no accepted version and he has been running sessions there since
18 August, which independently says the exec gate answers measured. The live control connection is
open too: the far side gmux server holds a session named `gmux-control`, created 27 August, and that
name is created by the control plane's own attach and by nothing else. So the version gate Phase 217
landed is no part of what he reported.

## 5. herdr 0.9.0 as the bar

One difference has to be held in mind before any comparison. herdr installs a copy of itself on the
far machine and talks to it over one long-lived ssh carrying a private protocol. Tortie installs
nothing and talks to the machine's own tmux and shell through 25 scripts. That difference explains
some of the gap and not the rest, and this section says which is which.

Every herdr claim below is read from its source, its tests or its own documentation at `a9f3ad5f`
and cited. Nothing in that checkout was built, run or written; `git status --porcelain` printed
nothing before this work and prints nothing after it.

### 5.1 A combined agent list

herdr builds one list across every machine in one small module. `aggregate_agent_rows` at
`src/client/shell/aggregate_navigation.rs:49` walks every endpoint with a cached snapshot and
returns one flat list, each row carrying its endpoint, its agent and a recency number. Three rulings
inside it matter more than the list. A disconnected machine's agents stay in the list, drawn dimmed
rather than removed. Stale rows sink, because the sort is by staleness, then status, then recency.
Keyboard cycling skips them, because `online_agent_targets` at `:87` filters stale rows out and that
is the list the next-agent and previous-agent keys move through, so a machine going down cannot put
the next keystroke on a pane that cannot answer.

Tortie has nothing that answers "what needs me now" across machines. Sessions on a machine appear on
that machine's project tabs. This is the herdr claim Tortie is furthest from, and it is also the one
closest to the Zen's own stated question.

What it would take: it reads cached per-machine state and sorts it. It needs no live connection, only
a cache and a staleness flag, and Tortie's remote feed already produces both.

### 5.2 Machine-scoped navigation

herdr scopes navigation by putting the machine into the identity of every target, and by drawing the
machine level only when there is more than one. `navigator_rows` at `aggregate_navigation.rs:101`
sets a federated flag from the endpoint count, so with one machine no machine row is drawn at all
and a person with no remote machine never sees remote furniture. Its documentation says why ids are
scoped, at `connecting-machines.mdx:88`: two machines may both hold a pane called `w1:p1` or an
agent called `reviewer`.

Tortie's remote surfaces are the same components as the local ones with a machine identity threaded
through, which is the better half of this. Only seven channels across the whole shared contract
carry a `machines:` prefix for anything the window draws; everything else rides the channels a local
tab uses. Tortie did not build a parallel remote interface, and that is worth saying plainly because
it is the expensive mistake it did not make.

One view is not threaded at all, and it is Architecture. There is no machine id anywhere under
`src/main/arch/` and no architecture script among the 25.

### 5.3 Automatic reconnect

herdr's reconnect is a per-machine state machine in `src/client/endpoint/supervisor.rs` with a
backoff from 500 ms to 30 s. Tortie's control client backs off from 500 ms to 10 s at
`src/main/tmux/control-client.ts:212`, with a cheap version precheck before every spawn. On backoff
alone Tortie is not behind.

The part Tortie does not have is knowing when to stop. `saved_ssh_failure_needs_attention` at
`src/remote/saved.rs:49` classifies the failure: wrong permissions, a changed host key, an
unsupported platform, a handshake refusal and a missing binary all stop the retry for good and ask
the person, carrying the exact command to run. A timeout or a refused connection stays in the loop.
Tortie has richer material for the same classifier already, being the 16 outcomes of
`MachineTestClass` at `src/shared/ipc/machines/connection.ts:72`, and it is not wired to the
reconnect loop.

The specific gap is narrower than "no automatic reconnect", and naming it narrowly is what makes it
cheap. `prepareMachine` has exactly two production callers, being the launch sign-in and the
Settings button. A machine that prepared once and then dropped does recover on its own, because the
poll keeps running and a good answer puts the link back. A machine that was asleep or off the VPN at
the moment Tortie launched stays dead for the whole run until a person walks to Settings and presses
Prepare.

What a person sees while disconnected in herdr is one word. `endpoint_status_presentation` at
`src/client/shell/endpoints.rs:482` holds five of them and prints `online` for a connected machine
at `:487`. The machine list blanks that one word rather than drawing it, at
`src/client/shell/endpoint_sidebar.rs:422`, so a machine that is fine says nothing, while the
message shown when no machine is connected prints it verbatim, at
`src/client/shell/composition.rs:69`. Cancelled work is not claimed either way: each cancelled
request says "This server action was interrupted. Check its state before retrying", at
`src/client/shell/actions.rs:494`, which is the same honesty Tortie's own credential swap uses when
it says old or new and never which.

Tortie's ssh notices a dead link four times faster at the transport layer, 15 s against 60 s, from
the keepalive constants in `src/main/machines/ssh.ts:107` and `:108`, being 5 s three times,
against `src/remote/attach.rs:586` and `:588`, being 15 s four times. herdr wins overall because it
has an application heartbeat on top, pinging every 5 s at `src/client/endpoint/health.rs:3` and
giving up at 10 s at `:4`.

### 5.4 A disconnected machine does not interrupt the others

The promise is real and it is five mechanisms rather than one. A reader thread and a writer thread
per machine, where the writer owns partial writes and the user interface thread only ever tries to
send and never waits, at `src/client/endpoint/writer.rs:22`. One command lane per machine, whose own
comment says other lanes are deliberately untouched, at `src/client/endpoint_commands.rs:150`. One
connect task per machine fenced by a generation number, so a late answer from a machine that has
since been disabled cannot resurrect it. One health timer per machine, whose expiry removes exactly
one connection, with a test named `endpoint_failures_do_not_remove_other_connections`. And a message
policy at `src/client/endpoint/message_policy.rs:19` that lets a machine you are not looking at
deliver control messages, notifications and snapshots but not pane surfaces or graphics, so a busy
background machine cannot flood the window.

Tortie fails this promise in two measured ways, being section 4.2, where one unreachable machine
cost 19,789 ms at launch, and section 4.3, where one machine's failure bar is drawn on every other
tab including a local one.

### 5.5 Missing features disable the action rather than preventing connection

This is the line the charter expected to be the real finding, and the comparison is more even than
it looked.

herdr implements it as three rungs. A frozen protocol generation whose header states the contract,
with tests that decode an unknown command action to Unknown rather than failing the message. A
handshake carrying negotiated codecs, a method list and a capability list. And one funnel,
`push_endpoint_method_with_kind` at `src/client/shell/actions.rs:382`, through which every action
passes: it asks whether the machine is online, then whether the method is in the negotiated set, and
prints one sentence for each answer, being "{label} is not ready" or "This server does not support
{method} yet. Update and restart it to enable this action."

herdr does not degrade everywhere. Below a floor it refuses the whole connection: a server missing
`surface_interest`, or missing `health_check` on a non-local endpoint, is refused outright at
`supervisor.rs:291`, and its own documentation says such servers show Attention until explicitly
updated even though a standalone attach works. So the herdr rule is refuse once at the connection
for the two capabilities that make a machine capable of being one of many, and degrade per action
for everything above that.

Tortie already degrades per action at the level of the sentence, in a dozen places, and section 6
sets them out. What it does not have is herdr's funnel: `readyRemoteContext` is the same question
asked in about thirty places rather than one, and it answers by throwing rather than by returning a
sentence, which is why two views that fail for the same reason draw two different sentences.

### 5.6 Where Tortie is ahead, and where herdr pays for its choice

Tortie installs nothing on another person's computer, and every one of herdr's three rungs is
machinery for a problem Tortie refused to create. A herdr machine that has never been set up is
unusable until a person sits at an interactive terminal, because a non-interactive connection will
not install the binary. A Tortie machine needs ssh and tmux. herdr's generation 1 must remain
available indefinitely by its own file header; Tortie carries no such permanent contract.

Tortie reuses its own surfaces rather than building remote ones. Its read-only posture is
checkable rather than asserted, because every script carries a mode, git verbs are baked into the
script text rather than passed in, and the gate fails on any git verb outside the allowed set.
`MachineTestClass` tells a person far more about a failure than herdr's five status words, though
the two are not the same object, since Tortie's sixteen are the result of a test a person pressed.
And Tortie already has the three-state answer herdr's method list gives, in
`src/main/machines/machine-agents.ts`, with the same ruling that only a definite absence may make a
tile unavailable; it applies it to one thing.

herdr pays for its server in ways worth recording. One machine profile is one remote session rather
than the host. Only the selected machine streams pane content, so a person cannot watch output on
two machines at once there either. Multi-machine is Linux and macOS only, with no Windows client.

### 5.7 What the far-side server explains, and what it does not

Explained by the server, and not copyable without giving up Tortie's refusal: push of agent status
with no polling, because herdr's server holds the state and pushes on change while Tortie polls at
5 s focused and 30 s idle; a negotiated method list, because tmux cannot be asked what it supports;
and one snapshot type as the single source of everything the window draws, where Tortie's remote
state comes from 25 scripts with 25 failure modes. The push point is partly explained rather than
wholly, because Tortie does hold a persistent duplex channel to each machine in tmux control mode,
measured working on his Mac Pro. What that channel cannot carry is anything tmux does not know
about, which is agent status, git state and file state.

Not explained by the server, and buildable in Tortie today: one funnel for every remote action with
one notice shape; a per-machine capability record read by that funnel, which the agent presence map
already is in miniature and which the scripts can be probed for once at prepare time; a machine-level
resting status on the face; a failure classifier that decides retry against stop-and-ask; the
combined agent list itself; and Architecture on a remote tab, which reads files and nothing else.

## 6. Refuse or degrade

The charter's hypothesis is that Tortie refuses wholesale where herdr degrades per action, and that
this is what makes the surface clunky. It is partly right and it is not the main cause.

Tortie degrades per action almost everywhere a sentence is written. The commit button has an ordered
list of six disabled reasons, machine facts before folder facts before the message box. The agent
board makes a tile unavailable only on a positive absence and never on silence. Capture is a
disabled row with a caption. Search names the three filters that do not cross. That is the herdr
posture, shipped, in a dozen places.

What Tortie does not degrade is the liveness decision. There is one boolean and every remote
capability reads it.

The charter asked this as a binary: which refusals stay, and which become a disabled action with a
sentence. Most rows answer it. Load bearing means the refusal stays as it is. Caution means it
should become a disabled action, or clear itself once its reason has gone, and section 7 queues
every row marked that way. Five rows answer neither, and they are marked in between, which means
the refusal is correct today and its cost is real but nobody has met it: rows 6 and 7, where one
write root per machine and that root sitting inside the execution hash are both right until he
keeps two projects on one machine; row 9, which costs him nothing today because his own version is
measured; row 10, which is a real loss but is bounded by the same restart that fixes row 2; and row
14, where environment passthrough on a remote create is refused for a reason no drive here tested.
Section 7 queues none of the five, deliberately. They are recorded so a later round can find them
when a person does meet one, and none of them is what he reported.

| # | Refusal | What triggers it | What is lost | Ruling |
|---|---|---|---|---|
| 1 | The shared liveness gate, `remote-run.ts:127` | the link is not connected or polling | all 21 far-side channels, together | caution that costs a working feature |
| 2 | No automatic re-prepare, `core.ts:1077` | sign-in fails once at launch | the whole machine for the run | caution |
| 3 | No second read when a machine starts answering | a view opened before the machine connected | History, Branch, Runs, Context, Search stay stale | caution |
| 4 | Architecture refused whole | the project is on a machine | the map, the reading, the contract | unbuilt work wearing a refusal's clothes |
| 5 | No write root, `remote-file.ts:188` | the row carries no folder | every write verb | caution, and the control is a dead end |
| 6 | One write root per machine | a second project outside that root | writes in every project but one | in between |
| 7 | The write root is inside the execution hash | changing the root moves the hash | the whole connection until re-confirmed | in between |
| 8 | Explorer git decorations refuse | the target has no local path | decorations whose data is already held | caution |
| 9 | The control dialect gate takes no acceptance | the far version is not on the measured list | the live feed, falling back to the timer | in between, and it costs him nothing today |
| 10 | One greeting miss ends live connections for the run | one 10,000 ms miss | the live connection until Prepare or restart | in between |
| 11 | The exec version gate | the far version is neither measured nor accepted | the whole machine until accepted | load bearing |
| 12 | The confirm gate | never confirmed, or the details moved | the whole machine | load bearing |
| 13 | The restore gate | any of seven conditions fails | restore for that row | load bearing |
| 14 | Environment passthrough refused on a remote create | any environment value | per-session environment | in between |
| 15 | Finder drop refused | a file dropped onto a remote folder | upload | load bearing |
| 16 | Symbols | the project is on a machine | symbol search | load bearing, and research 57 already ruled it |
| 17 | Context write verbs absent | the project is on a machine | install, enable, pin | load bearing |
| 18 | A conflicted file carries no verb | a conflicted path over there | mark resolved | load bearing |
| 19 | The not-connected sentence names no machine | any script run while the link is down | nothing, but it breaks the naming rule | caution |

Item 1 is the refuse-wholesale finding and it is worth stating in full. `machineIsConnected` asks a
set of two link states, `runRemoteScript` asserts it before composing a byte, and eleven more modules
ask it directly at the top of their handler. Of the 37 machines channels, 10 touch configuration
only, six spawn something under a person's own press, and the remaining 21 reach the far side. All
21 are behind that one boolean. Where the boolean comes from is the problem: it is set by a poll
that runs one `tmux list-sessions` over ssh with a 10,000 ms cap, and anything but success or tmux's
own no-server sentence marks the machine quiet. So one slow answer to a question about tmux sessions
turns off Explorer, Search, Source control, Context, Quick Open, History, Branch, Runs, the agent
scan, reading a session's last lines and every write verb in the same frame, and none of those needs
the session list. Waking the Mac does this deliberately: every machine goes quiet on wake and then a
poll is issued, so closing the lid takes the whole remote surface dark for as long as that poll
takes.

The two failures do not even look alike. Explorer, Search and Quick Open check the boolean
themselves and draw their own sentence naming the machine. Source control does not, and throws out
of the script runner instead, so it draws a sentence composed in main that says "that machine" and
names no label at all, against the product's own naming rule.

The honest answer to the question the phase exists to ask is no. The posture is not applied to every
remote capability; Tortie degrades per action wherever a sentence was written. What it does not do
is clear a refusal once the reason for it has gone, and it does not have a write root on the machine
he is using. Ranked by what a person actually meets: write access is off rather than clunky and the
control that reveals it is a dead end; the refusals are sticky, so a correct sentence outlives its
truth in five of seven views; and the single liveness boolean makes the failure total and
simultaneous rather than local. Refuse-wholesale is real, it is one gate rather than a posture, and
it is the third of the three.

Nothing in this section proposes widening a standing refusal. Items 1, 3, 8 and 19 change which
already-authorised verb is attempted against an already-prepared machine and start nothing. Item 5
keeps the confirm path exactly as it is, hash and sheet included, and only makes the disabled control
name the door. Item 2 needs the reasoning said out loud, because `prepareMachine` can boot a tmux
server on that machine and so a retry does start a process. Phase 23 refusal 8 forbids a process
starting on a configuration change alone. A retry of a launch sign-in is not a configuration change:
it is the same act the person authorised when they confirmed the machine, which the launch already
performs unprompted for that reason. The safe shape is a bounded retry of the sign-in Tortie already
does, triggered by time or by the machine becoming reachable, never by the file changing, and never
for a row whose confirmation does not hold. A round that cannot state it in those terms should not
build it. Nothing here touches the socket name, the shipped tmux config, the session options, the
pane environment or session lifecycle, and nothing proposed kills, signals or reconfigures any
server on either machine.

## 7. What it would cost

Ordered by relief per unit of work. The rough total is six phases, of which the first two are small.

Phase one, write access, and it is the whole of what he named. Give the write root field a picker
fed by `machines:listDir`, which already ships. Replace the dead-end tooltip with a sentence that
names the door, in the same words the editor's refusal already uses. Give the save toast the Open
settings button its own doc comment claims. Ask git for a name and an email once, where `readBranch`
already asks that machine questions, and make the Commit button unavailable with that reason rather
than failing after the press. Keep git's raw text off the resting face and behind a disclosure. This
is small, it is bounded, and it turns a whole shipped feature on for him.

Phase two, staleness. Apply to History, Branch, Runs, Context and Search the eight lines
`FilesSection.tsx:231` already contains, being one extra read per sign-in capped the way those two
cap it. Change the sentence a stale view shows from "did not answer" to one that says what is on
screen and when it was read. Feed the Explorer's decorations from the remote changes store, which
already holds the tracked and untracked lists keyed by machine and path; do not loosen the guard,
because decorating a remote tree with this Mac's status is the defect Phase 90.3 removed.

Phase three, the liveness gate. Give it a per-verb answer rather than a shared one, so a missed
session poll cannot take the file tree dark. Stop a wake marking every machine quiet before it has
been asked. Give the not-connected refusal in main a label. This is the refuse-versus-degrade item
and it is worth doing after the two above, not before.

Phase four, the boot and the bulkhead. Sign in to confirmed machines concurrently with a cap, or at
least stop a machine that has not answered holding the first poll of the machine that has. Scope the
cross-machine failure bar to the tab whose machine failed. Add the bounded launch-sign-in retry
under the terms in section 6. These are the three measured pieces of herdr's fourth claim.

Phase five, the two halves. The commit file diff on a remote history row, which the Phase 107 entry
asked for and did not get, and move on a remote tree, which needs the drag path to reach
`entry-rename` rather than the local move.

Phase six, Architecture on a machine. It reads files and Tortie can read files on a machine. It is
the largest of the six because it needs channels that do not exist, and it is last because it is a
view he did not name.

A nits round carries the rest: the unguarded Reveal in Finder and the machine-less Copy Path on the
editor tab strip, the unreached-versus-unreadable sentence in section 4.5, the confirm-hash-moved row
saying the machine did not answer, and the disconnected new-session grid offering more than a
connected one.

Two things this document recommends against queueing. The combined agent list from section 5.1 is
the herdr claim Tortie is furthest from and the closest to the Zen's own question, and it is
deliberately not in the six above, because it is a new surface rather than a repair and it should be
queued at his word rather than folded into a parity round. And duplicate on a machine, which
research 57 deferred and nobody has asked for since.

## 8. What will never reach parity

Research 57's permanent refusals stand, and this document adds to them rather than overturning any.

Trash, because a remote delete turns a recoverable delete into an unrecoverable one, and there is no
far-side Trash Tortie may drive. Reveal, because it opens Finder on this Mac over a file that is on
this Mac, and a file on another machine has no local path to reveal. Discard, because it destroys
work that was never committed anywhere and no read afterwards can say whether it ran. These three
are permanent and none of them was worked around, except in the one place named in section 2, which
is a defect rather than a change of posture.

Symbols is not on that list in this document's reading, for the reason in section 2. It waits, and
its stated revisit condition has been met.

Three more that this phase adds, each because the machine is a different computer:

File history and history search cannot cross as they stand, because the walk runs git on this Mac
over a local path, and following a rename over there is a far-side walk that does not exist. This
one is buildable, but it is not a small port and it is not parity by threading an identity through.

Image preview on a machine will not reach parity at the current shape, because the content has to
cross and the ceiling is 90,000 bytes. Whatever ships will be a bounded affordance and not the local
viewer.

Catch Me Up on a remote session will not reach parity, because the record it reads lives on the
other machine and reading it means moving a session's transcript across the link, which is the same
bulk-content door research 57 refused for Symbols.

And one that is permanent for a different reason: the local Explorer has a file watcher and a remote
folder does not, because a watcher on that machine is a process Tortie would have to run there
continuously. A remote view can be made to re-read at the right moments, as section 7 proposes, but
it will never be a subscription.

## 9. What was not measured

No Linux far side. Everything here is one arm64 Mac over Tailscale.

No large repository on the far side. The fixture is 26 files with three commits. Every remote timing
scales from that and from nothing bigger, and the 90,000 byte ceiling and the 30-row review cap were
never met by it.

Whether a machine that goes away mid-session recovers when it comes back. Making a confirmed machine
unreachable without changing its confirmed fields needs a network this phase may not touch on his
machine.

The local Source control view's boot-to-first-row time, because the local view was already drawn in
the first timeline sample of every run. That is why the remote 510 ms and 1,280 ms in section 3.1
have no local number beside them. The cell there says the view was already drawn rather than giving
a zero, because a zero would be a reading and this is the absence of one.

The 11 ms deadline race in section 4.5 is reasoned from two constants and one measured 10,011 ms,
not directly instrumented.

herdr in use. It was never built, never run and no server was started, per the standing rule. Every
herdr claim in section 5 is read from its source, its tests or its own documentation and cited.

No real agent turn on either machine. No token was spent.

Whether Tortie's remote work serialises across machines in main beyond the boot sign-in measured in
section 4.2. A local tab was measured undisturbed while four remote calls hung, over 3.2 second
windows against an unreachable host; a machine that is reachable but slow, and a longer window, were
not driven.

## 10. What this phase did on his machines

Far side, before and after every run: the gmux server held exactly one session, `gmux-control`,
created 27 August, attached. Same name, same creation time, still attached at the end. The five
August sessions an older note in this house names are gone; that note is stale.

Far side processes at the end, read by this document's own final check rather than a probe's:
exactly the two that were there at the start, being the bundled tmux that started the gmux server 11
days ago and the `/usr/local/bin/tmux` client holding `gmux-control`. No process of this phase
survives. `ls -d /Users/gdc/tortie-p224-scratch-*` answers nothing and `ls -d /Users/gdc/tortie*`
answers nothing. Every write went into one scratch git repository per run under his home and every
one was removed in a `finally`. His `~/.ssh/authorized_keys` there is unchanged at 88 bytes with an
18 August mtime, and there is no `known_hosts` on that machine at all. On this Mac, Tortie's own
record file is 113 bytes and `~/.ssh/known_hosts` is 2,215 bytes, both unmoved across every run. The
local gmux server held 13 sessions before and after, listed only.

One thing was left by the drives and removed at the end of the phase. Every scratch tmux server this
phase started was killed in a `finally`, but `tmux kill-server` does not unlink its socket, so ten
zero-byte socket files stayed under `/private/tmp/tmux-501` on the Mac Pro: `gmux-p224-8745`,
`gmux-p224-32730`, `gmux-p224-65838`, `gmux-p224-diag-15629`, `gmux-p224b-61438`,
`gmux-p224c-18259`, `gmux-p224d-70334`, `gmux-p224e-4691`, `gmux-p224e-49437` and
`gmux-p224f-71320`. No process held any of them. The drives left them because this phase's safety
bounds forbid removing a path on that machine outside its own scratch repository, and the committer
removed them because they are this phase's own leavings rather than anything of his, matched by the
phase's own `gmux-p224` prefix. `far-sockets-remove.mjs` is what ran and what it printed is the
proof: eleven entries in that directory before and one after, being his own `gmux` socket, which
cannot match that prefix, with `gmux-control` listed before and after the removal and still
attached. A run that starts a tmux server on another person's computer should unlink its own socket
in the same `finally` that kills the server, and no probe here did.

## 11. The probes

All under `/private/tmp/wt-p224/.p224/`, with their readings beside them under `results/` and as
`local-baseline-run*.json`.

`probe-p224.mjs` drove the five views, the write path and the bridge timings on his Mac Pro.
`probe-p224b.mjs` read the disconnected tab. `probe-p224c.mjs` and `probe-p224d.mjs` drove the boot
comparison and the write controls. `probe-p224e.mjs` and `probe-p224f.mjs` drove the trees side by
side and the watcher comparison. `driver.mjs` and `driver2.mjs` hold the expressions those six run
inside the renderer. `probe-p224-local.mjs` with `make-fixture.mjs` is the local baseline, three
runs. `far-fixture.mjs` made and removed the scratch repository on his machine. `blackhole.mjs` took
the 10,011 ms ssh reading. `far-final.mjs` is the closing count, and it is what section 10 was read
from. `far-sockets-remove.mjs` removed the ten dead sockets section 10 names.

Three photographs are kept: the remote Source control view carrying the cross-machine bar, the
remote Explorer tree carrying the same bar, and the disconnected tab saying the machine did not
answer.
