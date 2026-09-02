# Research 77: the map you can read at a glance

Answers the Research 77 entry in `docs/BACKLOG.md`. Four agents did the work in parallel on scratch
copies and this document re-derives their claims rather than copying them: two of the layer 3 walks
were re-run, nine foundation claims were re-read at their cited lines, and ten of the layer 1
sentences were re-judged against `git ls-files` on the copies. Section 12 says what was re-derived
and whether it agreed. No product file changed, no Electron ran, nothing under his home was written,
and the one model call went to the vendor host his Settings already name.

## 1. What he asked for, and the problem it names

His words of 2026-09-01: how to make it so you can look at the map and understand what the repo is
about, what each component means and does, at a glance; step 1 deterministic; step 2 with the local
LLM, meaning; step 3 what is being modified, growing or changing. Build on the foundation we have and
make the sidebar, currently off by default, very streamlined and clear about what this does. As
people are building with agents the core problem is keeping the mental model of the software alive
in their heads.

The problem is the reading, not the drawing. A person running several agents against one codebase
loses its shape because the agents rewrite files faster than the person reads them. The map exists
to give the shape back and today it cannot, for three measured reasons. On gmux it draws one box
called `src` holding 1,952 of 2,490 files, 78 percent, with one edge on the whole map. The sidebar
lists eight directory names each with the word Ours and then talks about contracts for the rest of
its height. And it ships off, so nobody sees either.

## 2. The foundation, re-read at its lines

The foundation is larger than the ask assumes for layer 1 and smaller than it assumes for layers 2
and 3. Every line below was read in the worktree at `3013aef`.

What a component is. The map draws computed groups, `Group` at `src/main/arch/skeleton.ts:82` to
`:86`, five to nine directories or workspaces folded by PageRank, and a contract component only
paints one by strict majority, `overlayComponents` at `src/main/arch/map.ts:275` to `:310`, where a
count of half or under is skipped. Per group the wire carries label, band, provenance, file count,
import denominators and every group to group edge with a count each way, `ArchMapGroup` at
`src/shared/ipc/arch-map.ts:56` onward. What it does not carry is a language mix, any size beyond a
file count, an entry point, an exported surface, or a sentence. The box hover is the label, Click to
look inside, the contract's first sentence if any, and the provenance title, `boxTitle` at
`src/renderer/arch/map/ArchMap.tsx:125` to `:133`. The sidebar's Computed parts rows are a glyph, the
directory and one word, `ComputedOutline` at `src/renderer/arch/ArchDrill.tsx:148` onward.

Layer 1 reuses. The import fact base (`scan.ts` and `arch.db`), the manifests reader (subject, npm
workspaces, Cargo crates), every grouping primitive in `skeleton.ts` (`prefixAt` at `:120`,
`groupTree` at `:139`, `groupOwners` at `:219`, `rankGroups` at `:278`, `mergeToTarget` at `:321`,
`bandOf` at `:384`), `composeArchMap`, and the symbol pool. It needs no process and no model.

Layer 2 reuses. The pass exists end to end: `src/main/arch/enrich/compose.ts` (444 lines),
`validate.ts` (564 lines, whole refusals), `write.ts` (240 lines) into `docs/arch`, and the Settings
choice re-read at spawn. Its sentences reach the box hover and the prose panel, and only the panel
says whose words they are (`ARCH_PROSE_UNVERIFIED` at `src/renderer/arch/copy.ts:166`, drawn at
`ArchVerdicts.tsx:691`). The design question is that the pass seeds `docs/arch` first when no
contract exists, `src/main/arch/enrich-coordinator.ts:241` to `:245`, so a meaning pass that writes
nothing into the person's repository is new work.

Layer 3 reuses. The walk and the guard exist and the facts do not. The only log call is
`--format=%H --name-only --no-renames -z` with no range, `logNameOnlyCall` at
`src/main/arch/argv-guard.ts:217` to `:222`. It runs only when a contract exists, `gatherFacts` at
`src/main/arch/run.ts:114`, and knows no author, date or line count. The git
domain already parses author, email, epoch and numstat, and `groupOwners` buckets any path to a box.

Why it is off. Phase 175 gates visibility only: `archOn` at `src/renderer/app/ActivityBar.tsx:130`
and the rail item at `:399`. Registering the arch channels opens no database, arms no watcher and
spawns nothing, `src/main/capabilities.ts:196` to `:203`. The first cost is paid on opening the pane
or the map, measured by Phase 160 at 306 ms to first picture and 2.9 s for the cold scan on 2,195
files, 102 ms warm (`9b8a667`).

## 3. How others answer the three questions

Read from primary documentation or the public source of it. Where a docs site refused the fetch
(Sourcegraph, GitHub) the same pages were read from their public repositories. No screenshots.

| Tool | First screen about a repository | How a component is described | Model text and its label | Change over time | Source |
| --- | --- | --- | --- | --- | --- |
| GitHub repository | One owner written About line and a language bar by bytes | Not at all; files and folders | None | Graphs beside the tree: commits, code frequency, contributors; each point links to the diff | github/docs, github-linguist/linguist |
| Sourcegraph | Description synced from the code host, topics, README, files table, contributors | Fields with a named source | None | Code Insights charts beside the structure, each count a search | sourcegraph/docs |
| Understand (SciTools) | A strip of about twelve numbers, Lines, Files, Classes, Functions, and letter grades | Information Browser lists members, includes and metrics from the parser, composes nothing | None | None on structure | SciTools documentation |
| tokei, scc | Six or seven columns of counts, scc adds COCOMO | None | None | None | READMEs |
| CodeScene | The map itself, no words | A sidebar of numbers and a health colour | None | Size from lines, weight from revisions, churn, recency or author over a window, layout fixed | CodeScene docs, hotspots page |
| CodeSee | The map itself | Person written labels and notes | Enterprise only file summaries, small amounts of code sent to Anthropic, no on screen label named | An overlay that swaps label text while on; a per file swatch, added, removed, edited, renamed, unchanged, with unchanged neighbours kept in white | CodeSee docs |
| code-maat, CodeCharta, git-truck | The map | Numbers per node | None | Size from code, weight from git over a window, layout does not move | READMEs and site |
| Windsurf Codemaps | Nothing until a prompt | Model written per task | Labelled AI annotated, model chosen Fast or Smart, no validation named | None | Windsurf docs |
| Swimm | A doc list with verification states | Deterministic code mapping first, model text anchored to it | Accepted or not by a person, measured by acceptance rate | None | Swimm docs |
| Cursor | No person facing map; Instant Grep and an Explore subagent are the agent's own tools | Chat outcome only | Not applicable | Cursor Origin is a forge with browse and search | Cursor docs |

Three things follow. No reference composes a sentence about a repository or a part from facts; the
prose that exists is either a person's (GitHub, Sourcegraph, README, CodeSee) or a model's after a
prompt (Windsurf, Swimm, CodeSee Enterprise). So layer 1 is genuinely new. Every tool that draws
change on structure uses the same two encodings, a size from the code and a weight from git over a
window on a layout that does not move, and CodeSee's kept in white neighbours are the one detail
worth taking. The backlog's phrase Codebase maps in Cursor has nothing behind it in Cursor's
documentation as of 2026-09-01. Swimm's order, facts first, model anchored to them, person accepts,
is the one to cite for layer 2.

## 4. Layer 1 as a specification

Proved over three scratch copies with the shipping code run from node: the gmux copy at `1120c5a`
(2,490 tracked files, 2,045 parsed), the rookery copy (526 tracked, 240 parsed) and a fresh clone of
BurntSushi/ripgrep at `3fce3b5` (237 tracked, 111 parsed, Rust, a Cargo workspace of eleven crates).
The probe is `scratchpad/r77/layer1.mts`, the sentence rule as code is `sentence.mjs`, and the facts,
sentences and fact bases sit beside them. The probe calls `createArchGitRunner`, `lsFilesCall`,
`ArchStore`, `scanArchImports`, `readArchManifests`, `composeArchMap` and the `skeleton.ts`
primitives. The one seam it owns is a `Worker` shim pointing the shared symbol pool at the built
`out/main/symbols-worker.js`, because the pool resolves its worker beside `pool.ts`.

Timings, warm store: `ls-files` 16 to 31 ms; scan cold 3,482 ms on gmux, 1,549 ms rookery, 564 ms
ripgrep, warm 19 to 153 ms; compose 1 to 16 ms; the per box facts pass, one read of every tracked
file for lines and extensions, 379 ms gmux, 173 ms rookery, 106 ms ripgrep. Cold layer 1 on gmux is
about 4 s end to end, warm under 0.6 s.

### 4.1 Why a sentence over today's boxes cannot pass

The shipping cut stops at depth one as soon as five top level directories exist, and junk
directories satisfy that test while the code sits in one box.

- gmux: 8 boxes, `src` is 1,952 of 2,490 files, one edge, and five of the eight boxes are
  `.claude` (1 file), `.github`, `.playwright-mcp`, `patches` (1 file) and `resources`.
- rookery: 9 boxes, 0 edges. The box labelled `.zed` holds `.claude`, `.github/workflows` and
  `dev-tools`, because `mergeToTarget` keeps the host's label. 153 of 414 resolved imports, 37
  percent, point at a Swift or Kotlin target directory rather than a tracked file (Phase 180's
  grain), and `groupOwners` is keyed by tracked file, so mac to RookKit and iphone to RookKit never
  draw.
- ripgrep: 9 boxes, `crates` holds all the code (147 files, 62 percent), and drilling it folds
  `crates/core` (30 files, the rg binary) into a module labelled `crates/pcre2`, drawn as 44.

Sentences over these boxes are true 25 times in 26 and useful 16 times in 26, 62 percent. The
reason is the cut, not the sentence.

### 4.2 Rule P, the reading partition

Every step is a fact test, built from the primitives already in `skeleton.ts`.

- P1 seeds. Two or more npm workspaces or Cargo member crates make each declared directory a box.
  Otherwise every top level directory is a box. Root files go to the fold.
- P2 split. While a box holds more than half the parsed files and has two or more child directories,
  replace it with its children. Depth stops at three.
- P3 fold. A box with no parsed file and fewer than the larger of 20 files or 5 percent of the tree
  folds; a box with fewer than three parsed files folds; a seed never folds. The fold is one box named
  everything else whose sentence names what it holds.
- P4 cap. Twelve boxes. Over the cap, fold boxes with no source, smallest first, and never fold a box
  of source for the count. ripgrep therefore lists thirteen.
- P5 label. The deepest directory all of a box's files share, so a seeded workspace's leftover with
  one child is named for the child.
- P6 owner. An import target that is not a tracked file belongs to the box whose directory is its
  longest prefix. This puts the 153 Swift and Kotlin edges on rookery's map.

Result: gmux 7 boxes, the biggest 38 percent, 9 connections; rookery 8 boxes and the RookKit edges
drawn; ripgrep 13 boxes, every crate its own, 16 connections. The reading partition is not the drawn
map's partition today; shipping it means the map and the list draw the same boxes from rule P, which
is the one rule, two readers property Phase 160 established, applied to a different cut.

### 4.3 Rule S, the sentence

`NAME: SIZE, LANGUAGE; MADE OF; WIRING; ENTRY.` A clause with nothing to say is left out.

- N, the name: the box directory, plus the package or crate name in brackets when a manifest at the
  box root declares one that differs (`server (rookery-server)`, `crates/printer (grep-printer)`).
- L, size and language: `N files` then the language bucket. A parsed bucket leads at a fifth or more
  of the files. X alone at 95 percent, mostly X at half, X and Y when the second holds a fifth, else
  X and other files.
- M, made of: a source root (`src`, `Sources`, `lib`) is transparent. When loose files at the root
  outnumber the largest child folder, file stems are the structure: clustered on the first token,
  named with a star when two or more clusters have three members (`probe*, assert*, conformance*`),
  else the five biggest files by lines skipping role names (lib, mod, index, main, types). Otherwise
  the five biggest child folders. `and N more` counts folders and files alike.
- W, wiring: from resolved imports rolled up box to box under P6. A partner qualifies at a twentieth
  of the strongest partner that way and a hundredth of the box's own resolved imports. At most two
  named each way. With no partner: not code, not code apart from N files, self contained (N imports
  inside, none across), imports not followed, or no imports either way.
- E, entry: the shallowest file whose name is an entry by convention (`index.*`, `main.*`, `lib.rs`,
  `__main__.py`, `App.swift`, `MainActivity.kt`, `cli.*`, `server.ts`, `index.html`).
- R, the repository line: `SUBJECT: N files, LANGUAGE; N parts, the biggest NAME (share); N
  connections between parts; N of M imports lead inside the repository.`

Measured over the 28 reading boxes: 16 to 31 words, median 23. Repository lines are 23 to 26 words.

### 4.4 The sentences on gmux

- tortie: 2,490 files, mostly TypeScript; 7 parts, the biggest src/main (38%); 9 connections between
  parts; 7,313 of 10,857 imports lead inside the repository.
- build: 215 files, mostly JavaScript; made of probe*, assert*, conformance*, p138* and 59 more; uses
  src/main and src/shared; no other part uses it.
- docs: 273 files, mostly Markdown; made of research, shots, brand, audits, readme and 2 more; not
  code apart from 15 files.
- everything else: 51 files, JSON and other files; 6 small folders (resources, .github,
  .playwright-mcp, .claude, patches, src/test) and 24 root files; not code apart from 3 files.
- src/main: 943 files, TypeScript; made of machines, arch, overview, manifest, harness and 56 more;
  used by build; uses src/shared; entry src/main/index.ts.
- src/preload: 17 files, TypeScript; made of machines, terminal, arch, bridge, context and 12 more;
  uses src/shared; no other part uses it; entry src/preload/index.ts.
- src/renderer: 906 files, mostly TypeScript; made of app, scm, editor, arch, settings and 25 more;
  used by build; uses src/shared; entry src/renderer/index.html.
- src/shared: 85 files, TypeScript; made of keymap, agent-overlay, settings, context, arch and 31
  more; used by src/renderer and src/main; uses no other part; entry src/shared/ipc/index.ts.

On rookery the eight read: CHANGES (128 files, Markdown, dated change records), clients/android
(69 files, mostly Kotlin, self contained, entry MainActivity.kt), clients/cli (@rookery/cli, 8
files), clients/iphone (40 files, Swift and images, uses clients/RookKit), clients/mac (74 files,
mostly Swift, uses clients/RookKit), clients/RookKit (30 files, used by clients/mac and
clients/iphone, uses no other part), everything else (63 files), and server (rookery-server, 114
files, mostly TypeScript, made of location, environments, runtime, infrastructure, scripts and 6
more, self contained with 213 imports inside, entry server/src/index.ts). On ripgrep the wiring
alone tells a reader that matcher is the base every engine implements, grep is the facade core pulls,
and printer sits on searcher and regex. The full set is in `scratchpad/r77/sentences.txt`.

### 4.5 The fractions

Reading partition, 28 components: true 28 of 28; useful 25 of 28 without reservation and 3 with one
(src/preload, clients/cli, crates/index, each a flat part of a dozen files or fewer whose folder names
cannot carry it); 0 useless. 89 percent clear, 100 percent counting the three. The bar of nine in ten
is met. Shipping partition, 26 components: 25 true, 16 useful, 62 percent, not met.

### 4.6 At a glance, and behind hover

The resting face of one component is one row: the name (up to four words), a weight bar for its share
of files with no number on it, its band as a glyph (surface, engine, foundation, from `bandOf`), and
the sentence, capped at 32 words. Above the list, the repository line. Behind hover, one line each:
size in files and lines; the top five language buckets; definitions by kind, top four; the manifests
and the names they declare; entries, up to four; imports written, to this repository, to
dependencies, not followed; every partner used by and uses, with counts; every child folder with its
count. Weight and band are drawn, not said; the exported surface is a count and a count does not say
what a part is, so it is behind hover while the child folder and file stem names, which do, are in
the sentence.

### 4.7 Limits

The sentence is true of imports only; self contained on rookery's server says nothing about the
network the clients talk over. Rust `use crate::` paths resolve as unresolved today (crates/core 23
of 68), so a crate's interior count understates; crate to crate wiring is unaffected because crate
heads resolve to `lib.rs`. The subject comes from `package.json` alone, so the ripgrep clone reads as
`ripgrep-copy`; rule R should take the root crate name from `Cargo.toml`, which the manifest reader
already parses. A flat part of a dozen files gets a thin made of clause.

## 5. Layer 2 honestly

What ran. The shipping pass, from a gesture, over the gmux copy, with his Settings choice read from
the store: agent claude, model claude-haiku-4-5-20251001. Gather 140 ms warm (ls-files 26 ms, scan
114 ms with 2,045 files reused). Prompt 9,831 bytes, of which the FACTS block is 6,894 and the system
prompt 2,193, with a 40 file sample per part. One child process, 18,718 ms wall, 0.018 dollars. The
driver and every byte sent are under `scratchpad/r77/l2/`, and no token byte is in any of them.

What came back. Refused whole, reason `edge-endpoints`, detail: edge `renderer-must-not-import-main`
names renderer and main. The Phase 179 finer part lines told the model about src/renderer and
src/main and the instruction told it to judge promises from them, while rule 7 of the validator only
accepts drafted ids. On gmux, where all the code sits under `src`, that contradiction fires by
design. Zero of eight sentences landed, `docs/arch` on the copy is byte for byte what it was, and the
refused text is not retained, so what the model wrote cannot be shown beside layer 1's. The CLI also
reported his usage window near its limit and the runner suspended the pass until 2026-09-02 02:40
EDT, so a second gesture in the app would come back suspended. Per the instruction it ran once.

What the design takes from that. Layer 2 as a reading is a second, narrower ask beside the contract
pass, drafted at `scratchpad/r77/l2/proposed-reading-prompt.txt`: a name and one purpose sentence per
part of at most 160 characters and one repository paragraph of two or three sentences, from the layer
1 sentences and their hover facts plus the same FACTS block, with no promises asked for, no code read,
and a number allowed only if it appears in FACTS. Validate per field with `validate.ts`'s own pieces
(shape, id set, length caps, digit runs against FACTS, control characters) rather than whole, so one
bad field blanks one field. Land it in `arch.db` with agent, model, input hash and time, not in
`docs/arch`, which keeps the pinned contract format untouched and removes the seed side effect.
Label every model sentence with a Model chip and an attribution hover naming the agent, the model and
when, and split `ARCH_PROSE_UNVERIFIED` into a person's sentence and a model's. With no model chosen,
layer 1 stands alone with one quiet line and nothing runs.

The Phase 179 contradiction in the contract pass is a defect of its own and is not fixed here.
Either the finer parts become drafted ids or the model is told that promises name drafted parts only.

## 6. Layer 3 from what git already gives

Measured on the gmux copy (741 commits), the rookery copy (560) and a clone of tmux (12,080), median
of three, git alone, in `scratchpad/r77/timing-gmux.txt`, `timing-cheap.txt`, `timing-rookery.txt`
and `timing-tmux.txt`. Buckets are the map's own boxes through the shipping `groupOwners`.

| Shape on gmux | ms | stdout bytes |
| --- | --- | --- |
| name only walk with author, epoch and trailers, whole history | 120 | 369,593 |
| the same, `--since=1.week` | 85 | 73,993 |
| the same, `--since=1.day` | 65 | 16,204 |
| net tree diff, week (`diff-tree -r --numstat --stdin`) | 111 | 26,507 |
| net tree diff, day | 56 | 4,435 |
| net tree diff, hour | 38 | 80 |
| all four windows on one stdin | 234 | 57,529 |
| per commit numstat, week | 1,191 | 72,360 |
| per commit numstat, whole history | 2,811 | 380,449 |
| uncommitted, `diff --numstat HEAD` | 34 | 33 |
| uncommitted, `status --porcelain -z` | 41 | 1,967 |
| in process cut of the whole history into four windows | 1.7 | |

On tmux the whole history walk with trailers costs 1,339 ms and about 120 ms without, so trailers are
asked for only inside the window. On rookery the four windows are empty (no commit in the week) and
the whole history numstat is 262 ms.

Four things the measurements changed. The per commit numstat is the wrong walk: its cost follows
lines changed rather than commit count, and a week on gmux is 1,191 ms against 85 plus 111 for the
name only walk and one tree diff, so per commit lines go behind a Show commits control. Trailers are
only asked for inside the window. The since commit window needs no widening of the guard because
`git log --stdin` takes the range on stdin, the Phase 14.5 precedent, and `--since` cannot, so the
window literals stay compiled in words. And on the copy right now the uncommitted set is 38 untracked
files out of 39 changed paths, so a line count from diff never stands without the file count from
status.

The commands per window, all under the closed word list in `argv-guard.ts` with seven new words and
one format literal: `log --since=1.hour|1.day|1.week` (or the range on stdin for since a commit) with
`--format=%H%x00%at%x00%an%x00%ae%x00%(trailers:...)` and `--name-only --no-renames -z` for who and
which; `diff-tree -r --numstat --no-renames -z --stdin` given `HEAD <boundary>` for the net lines;
`diff --numstat HEAD` and `status --porcelain -z` for now.

The last day on gmux, bucketed by the reading partition: 115 files in 69 commits, net +20,947 lines,
one author; build 37 files, 19 commits, +8,280; src/renderer 35, 15, +3,103; src/main 22, 10,
+3,660; docs 11, 41, +5,721; everything else 5, 14, +114; src/shared 4, 2, +65; src/preload 1, 1,
+4; uncommitted 39 files (31 under .playwright-mcp, 6 docs, 1 .claude, 1 demo). A window is relative
to the clock, so two runs minutes apart differ by a file or a commit.

Agent marks are real and uneven: rookery 95 of 560 commits marked (48 Claude Opus 4.8, 39 Claude
Fable 5, 5 Cursor, 3 Claude Sonnet 5, all by Co-Authored-By trailer), gmux 0 of 741 because his own
rule forbids trailers, tmux 0 of 12,080. The design draws the split only where marks exist and says
nothing where they do not.

How it is drawn without moving anything. The layout is layer 1's and never changes with the window.
A box that moved in the window gets a mark at its corner and a ring whose weight follows its share of
the files that moved; a box that did not move stays as it is, CodeSee's kept in white. The sidebar
shows a What moved section with the window control 1h, 1d, 1w and since, one summary line, and one
row per part with its net lines and a bar, agent and person split only where marks exist. A click on
a row opens the diff tab at the window's base commit. One menu row, Brief the agent, types the
summary line and the moved rows into the focused session's prompt through the drop path's
`insert.ts`, which is the one action that turns the reading back into work.

## 7. The sidebar as a reading

Both mocks are at `docs/research/assets/77-arch-reading/today.html` and `reading.html`, self
contained, at 280 px, which is `SIDEBAR_DEFAULT` in `src/renderer/state/chrome-geometry.ts`, with
every token copied from `tokens.css` and `arch.css` and no new token. `today.html` reproduces the cold
sidebar on gmux exactly: the band with one refresh glyph, Open the map, Computed parts with eight rows
each reading a directory and Ours, the contract adds line, Add a contract, Draft the contract, the
pass sentence and the shut disclosure. `reading.html` draws the redesign over the same repository
with every number measured in sections 4 and 6. Both render in headless Chrome; the screenshots are
in the scratch.

The order, and the decision behind each.

1. The header band keeps its 36 px and its title, and the map and refresh become two icons with hover
   titles. Open the map as a full width button was the first thing on the face and it is not what a
   person opens the sidebar for.
2. The repository line: the subject in the name row (hover: the name package.json declares) and rule
   R under it (hover: how each number is counted). This is the one paragraph he asked for, and it is
   the code's, not a model's.
3. The model slot, one line: No model reading yet, with Ask the model as a link (hover: what is asked,
   what is drawn, that nothing is written into the repository). With a reading it is the paragraph
   under a Model chip. With a refusal it is the same one line. It sits above the list because a
   paragraph of purpose reads before a list of parts, and it never pushes the list down by more than
   its one line when absent.
4. Components: one row per part in weight order, the band glyph (hover: Engine, other parts import it
   and it imports others; Surface, no other part imports it), the name, the weight bar (hover: the
   percent), the sentence, and the ten hover facts. Seven rows on gmux, none of them junk.
5. What moved: the window chips 1h, 1d, 1w, since (hover: since opens the commit list), the summary
   line, and one row per part with its net and bar, plus a dot for uncommitted files with the count on
   hover. Default window 1d, remembered per person.
6. Contract, last: None yet and one line, Draft the contract, the Settings line, and the disclosure
   What a contract is. It moves down because a contract is a promise pane and the first three screens
   are a reading; nothing in it is removed.

Word counts on the resting face: the repository line 23 words, each part 16 to 31, the What moved
summary 10, the contract 12 before its disclosure. No paragraph on the face except the model's, and
that one wears a chip.

## 8. The default, with the measurement

Should the map be on by default, with layers 2 and 3 opt in, now that layer 1 needs no contract and
no model? Yes, on one condition, and the condition is the first phase.

What turning it on costs at launch: nothing measurable, because the switch gates visibility only
(`ActivityBar.tsx:130` and `:399`) and registering the arch channels opens no database, arms no
watcher and spawns nothing (`capabilities.ts:196` to `:203`). What it costs on open, which is the
first cost anyone pays: Phase 160 measured 306 ms to first picture and 2.9 s for the cold scan on
2,195 files, 102 ms warm; on the copy today at 2,490 files the cold scan is 3,482 ms and the layer 1
facts pass 379 ms behind it, so about 4 s to the full reading cold and under 0.6 s warm. Layer 3's
default day window is 65 ms for the walk, 56 ms for the tree diff and 41 ms for status, under 200 ms
and git only, so it rides with layer 1 rather than behind a second switch; the wider windows and the
per commit lines are a click away. Layer 2 stays opt in behind the Settings choice it already has.

The condition. Phase 175 turned the surface off because he wants it good before it is auto on. Today
it is not: the cut gives a 62 percent reading and the pane reads as a contract pane. Rule P and rule S
take it to nine in ten on three repositories and the sidebar order in section 7 makes it a reading.
The default flips in the same phase that lands those, and not before.

## 9. The scope guardrail, per layer

Layer 1 passes. The person's problem is re-acquiring the shape of a repository agents are rewriting,
and a deterministic sentence per part from the import fact base the product already keeps answers it
the moment the pane opens. No IDE has it; section 3 found no reference that composes one. The code
Tortie would own is glue over `skeleton.ts`, `scan.ts` and the manifests reader, and one pure
composer.

Layer 3 passes and is the strong case. It answers what the agents did while I was away, which no
IDE surface answers, from git the product already talks to, drawn on a map that already exists, with
one action that types a brief into the agent's own prompt. Every number on the face is one git
computed.

Layer 2 fails the test as a phase of its own and passes only as a caption over layer 1. The one run
shows the price of asking it for more: a whole contract pass on gmux bought nothing a person could
read, at two cents and nineteen seconds. As a caption it adds what the code cannot say, what a part
is for, under a chip that says whose words they are. It is not in the first phase, not in the second,
and stays opt in behind the Settings choice.

## 10. One recommendation and the first phase

Ship layer 1 with the sidebar reading first, then layer 3, and flip the default when the second lands.
Layer 1 first because the sidebar cannot read without the cut and the sentence, and because layer 3
buckets by box, so the boxes must be honest before a mark on one means anything.

The first phase, as a charter.

Phase: the map you can read. Subject `feat(arch): every part of the map says what it is`. First body
line `Phase N: the map you can read`. Semver minor. Tier 3, because it claims to be true on any
repository and the evidence is a per row matrix over real data.

Mechanism. Rule P as `readingPartition` beside `groupTree` in `src/main/arch/skeleton.ts`, over the
existing primitives, with P6 as the owner fallback `groupOwners` consumers use. Per box facts kept
from the one scan (definition counts) and one read of the tree (lines, extensions), entries by name,
declared names from the manifests at the box root. Rule S as one pure composer beside
`src/main/arch/map.ts`, and rule R with the root crate name from `Cargo.toml` when there is no
`package.json`. New fields on `ArchMapGroup` in `src/shared/ipc/arch-map.ts` (languages, lines,
entries, sentence, facts) and the contract baseline regenerated in the same commit. The map and the
drill draw rule P's boxes, one rule, two readers. The sidebar in the order of section 7 with the
contract last, the header icons, and the native View menu unchanged. The switch stays off in this
phase.

Proof, run rather than read. A conformance gate, `conformance:reading`, that runs the shipping
partition and composer under node over three committed fixtures (a gmux shaped tree, a Cargo
workspace, a multi client tree with Swift and Kotlin targets), pins the box set and every sentence
byte for byte, and fails one clause at a time under ablation. One app run on the gmux copy reading
the sidebar rows and the box hovers.

The named independent methods. Re-derive: the verifier writes its own partition by a different
method, a plain walk over `git ls-files` with its own thresholds, and compares box sets and file
counts on all three copies; where they differ the verifier says whose bug it was. Attack: the
verifier picks a fourth repository in a language none of the three used, judges every sentence true
or useful without the builder present, and refuses if fewer than nine in ten are useful.

What is not in it. No model call, no git walk beyond `ls-files`, no change to `docs/arch`, the
checkers or the contract format, no default flip, no menu change.

The second phase is layer 3 as section 6 specifies, Tier 3 because it spawns git over the person's
repository, with the independent method already named: re-derive the week's per box numbers with a
hand written walk over `git log --numstat` against the tree diff, and attack the boundary rule on a
merge heavy public history where the two can legitimately differ. Its last item flips the default.

## 11. What is not in this document

- No queued phase. He reads it and picks.
- No product file changed; the document and the two mocks are the only writes in the tree.
- No second layer 2 run on the reading grain. The instruction was once, and the runner is suspended
  until 2026-09-02 02:40 EDT in any case. The model's sentences beside layer 1's therefore do not
  exist, and section 5 says so rather than inventing them.
- No app run. The mocks were rendered in headless Chrome, not in Tortie, and the reading partition
  has not been drawn by the real map.
- No fix for the Phase 179 finer part contradiction.
- No screenshots of the references; every claim in section 3 is from text.
- The merge heavy attack on layer 3's boundary rule was named and not done.

## 12. What this document re-derived, and whether it agreed

Timings, re-run three times each on the gmux copy from a shell: the name only week walk 59 ms median
against 85 reported, the week tree diff 80 ms against 111, and the per commit numstat for the week
1,057 ms against 1,191. Within 30 percent, same ordering, same conclusion: the per commit walk costs
about eight times the other two together.

Foundation claims, re-read at their lines: the strict majority rule (`map.ts:294`, a count of half or
under is skipped), the name only log call with no range (`argv-guard.ts:220`), the contract gate on
gathering facts (`run.ts:114`), the visibility only switch (`ActivityBar.tsx:130` and `:399`), the
registrar that opens nothing (`capabilities.ts:196`), the seed on a missing contract
(`enrich-coordinator.ts:241`), and the box hover (`ArchMap.tsx:125`). All agreed. Two cited paths
were short: the coordinator is `src/main/arch/enrich-coordinator.ts`, not under `enrich/`, and the
map is `src/renderer/arch/map/ArchMap.tsx`.

Ten sentences, re-judged against `git ls-files` on the copies: gmux build, docs, src/main,
src/preload, src/renderer, src/shared and everything else; rookery server and clients/RookKit;
ripgrep crates/core. Every file count agreed (215, 273, 943, 17, 906, 85, 24 root files, 114, 30,
30). src/main's and 56 more is 48 child folders plus 13 loose files less the five named. src/shared's
made of is the five biggest loose files by lines with `types.ts` skipped as a role name, which is what
rule S says. build's stems are probe 97, assert 17, conformance 10, p138 4. Every entry file exists.
clients/mac imports RookKit in 33 files and clients/iphone in 13, and android in none, so the three
wiring clauses hold. All ten true. I would add one reservation the layer 1 pass did not: `p138*` on
build names a phase number and tells a reader nothing, so a stem cluster that is a bare label ought
to yield to the next cluster. That is a refinement of rule M, not a defect in the fraction.
