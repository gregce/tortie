# Phase 256 working notes: today's Architecture pane, taken apart and run

Charter questions 3 and 4. Everything below was read in the worktree
`/private/tmp/wt-p256` at `0ebcf9df` (Phase 255 runs beside it and was not touched), or read off
the DOM in two scratch Electron runs on 2026-09-10. Nothing under `src/` changed. No agent CLI ran,
no token was spent, no keychain was opened, no machine was reached. `/Users/gdc/stoa` was read only
(a local `git clone` into scratch); `/Users/gdc/specfactory` and `/Users/gdc/runstory` were not
opened at all.

## 0. The instruments, so every number below has one

| Instrument | What it did | Where |
| --- | --- | --- |
| `build/p256/probe-p256-pane.mjs` | ONE Electron, scratch profile + scratch `HOME` + socket `gmux-p256-<pid>`, Architecture switch flipped in that profile, two repositories opened, every surface read off the DOM: the reading, the map at levels 1, 2 and 3, the draft flow up to (never through) an agent, the contract cockpit, then a second repository | readings in `build/p256/pane-readings.json`, log `/private/tmp/p256-pane/probe.log` |
| `build/p256/probe-p256-overlay.mjs` | ONE Electron, fresh open of the same repository AFTER the draft landed, so the contract overlay could be read rather than reasoned about | `build/p256/overlay-readings.json` |
| Scratch copies | `git clone` of this worktree (3,145 tracked files) and of `/Users/gdc/stoa` (4,593 tracked files) into `/private/tmp/p256-pane/` | `tortie-copy`, `stoa-copy` |
| The exemplar | `/Users/gdc/stoa/AS-BUILT-ARCHITECTURE.html` COPIED to scratch and read there: 86,548 bytes, `revision dc942342`, `inspected 2026-09-09`, 5 views, 21 components, 5 journeys, 6 gate groups, a 9-row state table | `/private/tmp/p256-pane/stoa-explorer.html` |
| Read only proof | `git status --porcelain` before and after on both copies; stoa's is byte-identical; the tortie copy's is EMPTY because `.gitignore:28` ignores `docs/arch/` (see §6 F4) | probe output |

Timings, one run each, cold store, on this Mac while a second phase worktree was busy:

| Reading | tortie-copy (3,145 files) | stoa-copy (4,593 files) |
| --- | --- | --- |
| chord → every row carries lines and the repository line counts imports | **4,529 ms** | **3,007 ms** (second repository in the same session, workers warm) |
| `Draft the contract` pressed → the contract cockpit drawn | **517 ms** | not pressed |
| Resting pane, characters of text | **2,276** over 8 rows | **5,582** over 22 rows |
| Level 1 map | 8 boxes, 11 edges | 22 boxes, 8 edges |

---

## 1. The pipeline, end to end, stage by stage

One agent step exists in the whole feature and it is marked **AGENT**. Everything else is
deterministic and spawns nothing but the five fixed-argv git calls.

| # | Stage | Module | What it produces | Cost / bound |
| --- | --- | --- | --- | --- |
| 0 | **Trigger** | `src/main/arch/watch.ts` | Rides the ONE `@parcel/watcher` subscription per repository through `watcher/bus.ts` (adds no subscription, so the eight-path FSEvents exclusion budget is untouched). Coalescing window is the watcher's own `DEFAULT_DEBOUNCE_MS` (300 ms, read as a constant). One run in flight, cancellation, a generation stamp claimed before the run and enforced in the store, and a settle window that holds DOWNGRADES for a second opinion while upgrades publish at once | — |
| 1 | **Tracked files** | `argv-guard.ts` `lsFilesCall()` → `git-facts.ts` | Every path at HEAD. The same list the anchors are matched against, so no component can hold a file the scan never read | one git process |
| 2 | **Imports** | `scan.ts` + `resolver/**` + shared tree-sitter pool | One `ArchImportFact` per import: `fromPath`, `toPath`, `resolution ∈ first-party \| external \| unresolved \| unverifiable`. 14 resolver rows in `RESOLVER_MATRIX` (ts, js, go, rust, python, ruby, swift, kotlin, objc, java, php, c, cpp, csharp), grain per language (Swift at TARGET grain, C# at PROJECT grain, the rest at file/module grain). Incremental on mtime+size per file, kept in `arch.db` | ceiling `ARCH_SCAN_FILE_CEILING = 50,000` files, then `overBudget` sentence |
| 3 | **Tree facts** | `tree-facts.ts` | Lines per tracked file, and the name a manifest declares. One read of every tracked file ≤ 4,000,000 bytes, 64 open at a time, same mtime+size stamp | 379 ms cold on 2,490 files (research 77); measured here inside the 4.5 s |
| 4 | **Manifests** | `resolver/manifest.ts` (+ `swiftpm`, `csproj`) | npm workspaces, Cargo members, declared names, dependency sets. Nested manifests since Phase 178 | in-process |
| 5 | **Rule P, the partition** | `skeleton.ts: readingPartition` | The boxes. P1 seeds (≥2 npm workspaces or Cargo members, else top-level dirs), P2 split while a box holds > half the parsed files (depth ≤ 3), P3 fold (no parsed file and < max(20 files, 5%), or < 3 parsed files) into ONE box `other` / "everything else", P4 cap at `READING_MAX = 12` folding sourceless boxes smallest first, P5 label by deepest common directory, P6 owner by longest-prefix | pure |
| 6 | **Rules S and R, the sentence** | `reading.ts` + `sentence.ts` | One 16–31 word sentence per box (`SIZE, LANGUAGE; MADE OF; WIRING; ENTRY.`), the repository line, and the ten hover facts in fixed order: Size, Languages, Defines, Declares, Entries, Imports, Used by, Uses, Folders, Also holds | pure |
| 7 | **The picture** | `map.ts: composeArchMap` | Boxes with weight (file count), band (`bandOf`: Surface / Engine / Foundation, computed from import direction), provenance (`classify`), per-box import denominators, and the group-to-group rollup edges with counts. Pure and byte-repeatable; the gate composes twice from shuffled facts | 1–16 ms (research 77) |
| 8 | **Contract load** | `load.ts` + `validate.ts` + `schema.ts` | `docs/arch/{contract.json, components/*.json, edges.json, baseline.json}` parsed by a hand-written validator. An invalid row is dropped WHOLE naming file, field and reason; the last valid document keeps rendering under a banner | pure after the read |
| 9 | **Overlay** | `map.ts: overlayComponents`, `judgeEdge` | A component paints a box only on a STRICT MAJORITY of its anchored files (`count * 2 <= files.length` skips), the fold is NEVER painted, larger share wins a contested box, tie to the smaller id. A verdict rides an edge only when BOTH endpoints wear component names; worst status wins | pure |
| 10 | **The five checkers** | `run.ts: gatherFacts` → `checkers/index.ts` | Five fixed-argv git calls per run — `ls-files`, `rev-parse HEAD`, `cat-file --batch` (requests on STDIN), `log --name-only` over the WHOLE history (deliberately unranged; the cut is made in-process at the first commit touching `docs/arch/`), `status --porcelain` — then `imports`, `manifest`, `glob`, `evidence`, `freshness`. Verdicts are `convergent / divergent / absent / unverifiable` × coverage `checked / partly-checked / unverifiable`, stored in `arch.db` only | freshness walk ≈ 80 ms here, 140 ms on a 2,480-file Rust repo |
| 11 | **Drift** | `enrich/drift.ts`, `repair-trigger.ts` | The verdict delta between two published runs, plus which parts fell behind | pure |
| 12 | **AGENT — the one non-deterministic step** | `enrich-coordinator.ts` → `enrich/compose.ts` → `overview/fold/spawn.ts: runFold` → `enrich/validate.ts` → `enrich/write.ts` | `arch:enrich` composes the drafted contract plus a FACTS block (≤ 64 KB, 40 file paths sampled per part), runs ONE guarded one-shot child of the agent confirmed in Settings, validates the answer WHOLE (ids, anchors and kinds must stand; every digit run in prose must appear verbatim in FACTS; no baseline content), writes `docs/arch/` through the one writer, then recomposes the map and counts painted boxes — a kept run that painted nothing is recorded FAILED `no-painted-box`. ONE recipe exists: `claude`, measured 2026-08-28, suggested `claude-haiku-4-5`, `--max-budget-usd 0.10`, 150 s deadline, `--tools ''`. Every other agent shows in Settings as `not-measured` and disabled | 23.05 s and $0.0239 on the measured 582-file run |
| 13 | **Level 2 / level 3** | `modules.ts` (`arch:modules`, `arch:moduleFiles`) | A component's own modules as boxes, capped at 30 → a dependency matrix → top-importer / top-importee lists near 200 rows | one `ls-files` |
| 14 | **Canvas** | `arch:canvasState / setCamera / setLayout / clearLayout` → `db.ts` | Camera and kept layout per repository and per drill scope, in `arch.db` only | disposable |
| 15 | **Remote** | `machines/remote-arch.ts`, `arch/remote-source.ts` | A second `ArchFileSystem` and `ArchGitRunner` over the exec plane; the far side runs `arch-read` / `arch-git`, whose five git command lines live in the SCRIPT text and are picked by a KIND word. The bytes for the parse come here through a mirror: `ARCH_MIRROR_FILE_CEILING` 20,000 files, `ARCH_MIRROR_BYTES_CEILING` 64 MiB, freshness by POSIX `cksum` since Phase 244. **Nothing runs on the machine**, including the model slot | bounded as stated |

**The whole surface is 21 names**, being 17 invoke channels in
`docs/audits/contract-baseline.txt` lines 19–35 (`arch:load`, `check`, `skeleton`,
`composePayload`, `modules`, `moduleFiles`, `map`, `mapPart`, `canvasState`, `setCamera`,
`setLayout`, `clearLayout`, `seed`, `enrich`, `passStatus`, `acceptDivergence`, `options`) plus the
four pushes `arch:checked`, `arch:progress`, `arch:mapUpdated`, `arch:pass`. Three channels write `docs/arch/` and only three: the seed, the
kept enrichment, and the accept button's one-row append to `baseline.json`. Registering the domain
opens no database, arms no watcher and spawns nothing.

---

## 2. The pinned key set, and every ruling a redesign must honour

### 2.1 `ARCH_ROW_KEYS`, pinned byte for byte in TWO files

`src/shared/arch.ts:452` and `build/conformance-arch.mjs:1571` hold the same table; the gate fails
if they differ, and it also fails if any key matches a word from its own
`NAMES_SOMETHING_TO_RUN` list (`command`, `args`, `argv`, `exec`, `run`, `script`, `binary`,
`program`, …).

| Record | Accepted keys |
| --- | --- |
| contract | `version`, `subject`, `strictness`, `layers`, `flows` |
| layer | `id`, `name`, `order` |
| component | `id`, `name`, `kind`, `layer`, `provenance`, `anchors`, `boundary`, `description`, `evidence`, `deprecated`, `gaps` |
| evidence | `path`, `blobOid`, `lineStart`, `lineEnd`, `quote` |
| edge | `id`, `from`, `to`, `kind`, `rule`, `checker`, `label`, `note`, `evidence` |
| baseline | `accepted` |
| accepted | `edgeId`, `fromPath`, `toPath`, `because`, `at` |
| flow | `id`, `name`, `shape`, `steps` (reserved; nothing reads a flow file today) |
| flowStep | `seq`, `componentId`, `label`, `note`, `group`, `evidence` |

**Research 66's reason, in the gate's own words:** research 66 §6.1 ruled on `.tortie/` that a
repository-local directory "may carry identity and presentation and may never name anything Tortie
runs", because such a file arrives with a `git pull`, written by whoever last pushed — precisely the
case refusal 8 exists to stop, and refusal 8 "does not currently know it is being asked" since the
refusals are written about code and registries. `docs/arch/` is that directory by another name. The
one field that decides which code runs is `checker`, a closed set of five words selecting between
checkers the compiled world already contains, which is the charter's boundary sentence working as
intended.

**Anything a semantic layer wants to add to these files is a key-set change, in two files, against
that ruling.** A richer model (journeys, gates, state ownership, evidence levels) either extends this
set — and the phase entry says research 66's pin is not reopened here — or lives in `arch.db`, which
is where research 77 §5 already proposed putting the model's reading.

### 2.2 The other rulings, gathered

| Ruling | Where it was set | What it binds |
| --- | --- | --- |
| **The visualization IS the product**; promises are annotation on it | operator 2026-08-27, recorded in Phase 162 and Phase 160 | A redesign may not gate the picture on the contract features again |
| **Picking determinism must not be an operator choice** | operator 2026-08-26, Phase 158 | There is ONE way a contract starts (the deterministic skeleton); a model improves it afterwards. No fork on the face |
| **In repo** | operator 2026-08-28, Phase 158 | `docs/arch/` travels with clones and branches, diffs in review, anchors to git history. The derived side stays in `arch.db` |
| **The map binding, three rules** | Phase 158 | The pass enriches IN PLACE keeping ids and anchors; the map is a PROOF surface and a run that leaves it unchanged is a FAILED run; what a part is FOR must reach the picture |
| **Just enough words** | operator 2026-08-28 ("TONS of words, bad") | Short labels, one-liners, visual state; any longer explanation behind hover or a disclosure |
| **Nothing Tortie draws starts a process on its own**, and Tortie never starts one from configuration alone or one the person has not confirmed in Settings | Zen + Phase 158's correction | The agent step needs a person's gesture (or a settled drift under a confirmed agent), and the confirm gate is re-checked at the spawn |
| **No field of a contract file ever reaches a spawned argv** | Phase 63, `conformance:arch` rules 1–4 | The five argv are compiled words; the hostile fixture and the blinded record prove the scan can fail |
| **An invalid row is dropped whole** naming file, field and reason | Phase 23 overlay rule, Phase 63, Phase 177's narrowing | Never partial merge, never silent drop, never a crash |
| **Unresolved is never external** | Phase 157 / 180 | A resolver that cannot answer says so; a wrong `external` is a false green on a `must-not` |
| **A behavioural edge tops out at `partly-checked`**; no verified call graph, ever | Phase 63 | A semantic claim about behaviour cannot be sold as checked |
| **`baseline.json` has exactly one writer**, the person's accept button | Phase 63 + Phase 158 amendment | An agent can never accept its own violation |
| **No count badge on any node**; no dashboard | Zen | Weight is size and colour, never a number pinned to a box |
| **No verdict sets a session's status** | Phase 63 | measured again here: 0 elements carrying `data-session-status` |
| **Prose renders as plain text**, never through the markdown pipeline | Phase 63 (`rehype-raw` is in the tree) | Any model-written prose is a text node |
| **Off by default** | Phase 175 | The switch gates visibility only; Settings → Architecture stays visible always |
| **A remote view feels identical to a local one** | Phase 228 / 234 | No explanatory paragraph because a folder is on a machine; nothing spawns there |
| **One rule, two readers** | Phase 160 / 201 | The map and the sidebar draw the SAME boxes from rule P — confirmed in the run |
| **Zero new npm packages; the CSP does not move** | Phase 162 | The canvas is hand-written SVG plus two vendored ISC extracts |

---

## 3. Question by question: what a person LEARNS about what the system DOES

The five questions are the skill's own reader questions (`SKILL.md`, "Trace the current system").
"Explorer" is stoa's `AS-BUILT-ARCHITECTURE.html`; "Pane" is what the two app runs read off the DOM.
"Explorer (folders)" is the Tortie file tree, which is the honest control.

### Q1. What lives where, and how does it connect?

**Pane: PARTLY.** It answers *which directories hold the code, how big each is, which imports which,
and which way the leaning goes* — better than the tree does, and from the code alone. Measured on
tortie-copy: 8 boxes, 11 edges, every box with a 16–31 word sentence and ten hover facts, e.g.

> `src/main` — Engine · 34% — "1,057 files, TypeScript; made of machines, arch, overview, manifest,
> harness and 59 more; used by build; uses src/shared; entry src/main/index.ts."
> Hover: Size 1,057 files / 326,019 lines · Languages TypeScript 1,034 … · Defines 4,937 functions,
> 2,283 constants, 964 interfaces, 925 methods · Entries src/main/index.ts … · Imports 5,954 written,
> 3,874 to this repository, 2,080 to dependencies, 0 not followed · Used by build 139, src/renderer 11
> · Uses src/shared 534 · Folders machines 151, arch 101, overview 69 …

**Every clause of that sentence is a count or a name taken from the tree.** Not one says what
`src/main` DOES (it is the Electron main process; it owns tmux, the manifest, the IPC registrars).
The only role word on the face is the band, and `Engine` is defined as "other parts import it and it
imports others" — an import-direction fact wearing an architectural word. `connect` means exactly one
verb, `imports`: every edge title on the map reads `X imports Y`, 11 of 11 on tortie and 8 of 8 on
stoa. A process boundary, a socket, an HTTP call, a queue, a spawn or a database write is invisible.

**Explorer: ANSWERED, and differently.** Its regions are **where code runs** — "Your machine",
"Browser and shells", "Cloud services", "Outside this repo" (dashed) — and its own note says so:
*"Grouped by where code actually runs, not by folder."* Each of its 21 components carries
`Runs as` (e.g. "The developer's shell process", "Background process per tracked project"), and the
one thing neither the tree nor imports can show — `CRDT relay (intent-server)`, a runtime the product
depends on whose source is not in the repository — is drawn as a component with the label
`Outside this repo`.

### Q2. How does setup reach a result?

**Pane: NOT AT ALL.** There is no journey, no entrypoint chain, no route, no command, no handler
inventory. The nearest thing is rule E, the `entry` clause, which is *a file whose NAME matches a
convention* (`index.*`, `main.*`, `lib.rs`, `App.swift`, `cli.*`, `server.ts`, `index.html`) — it
names a door and says nothing about what comes through it. Drilling does not help: level 2 of `build`
drew 9 module boxes and 12 interior edges plus 3 frame stubs ("This part imports src/main. The drill
stays inside the part; go up to visit it."), and **level 3 is a flat file list with no arrows at all**,
headed *"What this module is made of — Every file here sits under this module folder, and every line
between them comes from the imports Tortie read. Nothing on this screen was written by hand."* The
deepest level answers the least.

**Explorer: ANSWERED.** Five journeys, each numbered from the first action to the returned result,
with branches and stopping points drawn as steps rather than hidden in prose, and each step
cross-linked to the component that performs it, e.g. *A file change becomes a linked version*:
1 you save a file → 2 agent activity captured separately → 3 five matchers score the pairing (Path,
ContentHash, Timing, ChangeType, SessionOwnership) → 4 BRANCH…

### Q3. Why does work proceed or stop?

**Pane: NOT AT ALL for the system.** The only gate-shaped thing it draws is its own promise verdict
strip, and that judges *import legality against a contract somebody wrote*, not whether a build, a
deploy, a login or a CI check proceeds. On the freshly drafted contract the strip read:

> `10 checked and holds · 0 broke · 0 not checkable` / `Not checked yet` /
> "5 of 13430 imports could not be resolved, so nothing here claims they are absent." /
> "Tortie does not read imports for every file here: 216 .md, 120 .png, 75 .json."

**And `10` is not ten promises.** `edges.json` holds TWO edges (`build-imports-src`,
`demo-imports-src`), both `rule: "may"`. The other eight subjects are the eight components' anchor
globs (`component:<id>` from `checkers/glob.ts:120`); evidence rows are zero because the draft writes
none. So the headline number a person reads as "promises" is 8 anchor-existence checks plus 2
observations that promise nothing. (Phase 178 fixed the evidence-quote case of exactly this shape; the
anchor case survives.)

**Explorer: ANSWERED.** A whole view, "What runs, and what stops it": 6 gate groups, each a list of
cases in the form *condition → Stops / Proceeds / Detected → why*, e.g. *"You run the command
CLAUDE.md documents on a clean checkout → Stops → `go build -o stoa ./stoa-cli` fails. ffi.go links
against libautomerge_ffi.a, has no build tag, and pkg/automerge imports it unconditionally."* It even
names why the trap is easy to miss (the `.a` persists once built).

### Q4. What survives, and what needs reconciling?

**Pane: NOT AT ALL.** Nothing in the reading, the hover facts, the map, the contract schema or the
checkers says who owns a store, where state lives, or what survives a restart. The word "state" does
not appear on any surface read in either run. The schema's `kind` union contains `store` and
`process`, so a person could hand-write "this is a store" — but nothing computes it, nothing checks
it, and the deterministic skeleton writes `kind: "component"` for all eight parts.

**Explorer: ANSWERED.** A 9-row table — State / Owner / Lives in / Survives — including the sentence a
newcomer most needs: *"CRDT documents — Automerge, Rust core — local store and the relay's filesystem
— Not in Postgres. Looking for document content in the database is the common wrong turn."*

### Q5. What is built, and what remains?

**Pane: PARTLY, and about the wrong subject.** Two honesty mechanisms exist and both are about
*Tortie's own blindness*, not about the project's completeness: the unresolved-import denominator
("5 of 13430 … so nothing here claims they are absent") and the unparsed-language sentence
("Tortie does not read imports for every file here: 216 .md, 120 .png, 75 .json"). The contract has
a `gaps` field and a Known gaps strip, but the deterministic skeleton writes `gaps: []` — gaps only
exist if a person or the enrichment writes them. The freshness ribbon says how far the code has moved
since the contract last changed ("Nothing has landed under these promises since the contract last
changed."), which is *the document's* staleness, not *the product's* completeness.

**Explorer: ANSWERED, and it is the view the skill's evidence ladder exists for.** Every component
wears one of `Implemented, not shipped` / `Composed in source` / `Component-tested` /
`Outside this repo`, with a legend that defines each; a "How each piece ships" table says which of
nine runtimes deploy on a push and which need a human command; and an "Unfinished edges" list names
what is broken today.

### The scoreboard

| Reader question | Today's pane | Explorer | File tree |
| --- | --- | --- | --- |
| What lives where and how does it connect | **partly** (folders, sizes, import direction) | **answered** (runtime regions, per-component contract, off-repo) | partly |
| How setup reaches a result | **not at all** | **answered** (5 journeys, branches, stops) | no |
| Why work proceeds or stops | **not at all** (its strip judges import promises) | **answered** (6 gate groups, cases) | no |
| What survives / needs reconciling | **not at all** | **answered** (state ownership table) | no |
| What is built and what remains | **partly**, and about Tortie's blindness rather than the project's | **answered** (evidence ladder, ship matrix, unfinished edges) | no |

One more measured difference in kind: the explorer's whole model is **21 components grouped by where
they run**, and the pane's is **8 boxes grouped by directory**, of which one (`everything else`) is a
junk drawer. On stoa the pane's biggest box IS the junk drawer: `everything else` = 1,469 files, 32%
of the repository, 1,311 of them `.specstory` history, carrying a hover line reading
`Size: 1,469 files, 12,841,227 lines`.

---

## 4. What today's pane does that the explorer does NOT, and that must not be lost

1. **It needs no author and no turn.** Every reading above was drawn with zero tokens, zero
   configuration and zero human writing: 4,529 ms cold on 3,145 files, 3,007 ms on 4,593. The
   explorer is 86,548 bytes an agent wrote over a long session and it exists in three of his
   repositories out of dozens.
2. **It is current by construction.** The checkers ride the file watcher (300 ms coalescing, one run
   in flight, cancellation, generation stamp, downgrade settle window). The explorer carries
   `inspected 2026-09-09` and `revision dc942342` and goes stale the moment somebody pushes; its own
   drift story is a hash record (`.as-built-architecture.json`) plus a human running the skill again.
3. **It is checkable, and a failure names a line.** A `must-not` that breaks produces an offending
   `fromPath → toPath:line` a person can jump to. Nothing in the explorer can fail.
4. **It refuses to flatter.** Per-box denominators ("1,261 not followed" on `stoa-web/app`), the
   unparsed-language sentence, `unresolved` never becoming `external`, and coverage counted
   separately from status. The explorer's honesty is a label an agent chose to write.
5. **It works on any repository the moment it is opened**, in 14 languages, including one on another
   machine through the mirror, with the same code drawing both.
6. **It is inside the place the work happens**: the drill and the sidebar share one record, the map
   is a real editor tab with a camera and a kept layout, and `Aim at this` composes a deterministic
   block of the selection and pastes it into the focused session's prompt.
7. **There is nothing to maintain.** No artifact, no notation, no refresh ritual, no second codebase.
   That is a Zen refusal ("Not a diagram you maintain"), not an accident.
8. **Provenance, weight and band are drawn rather than said**, so the resting face stays at 2,276
   characters on a 3,145-file repository.

Any semantic layer that costs (1), (2) or (7) is trading away the reason this pane exists.

---

## 5. What is reusable for a semantic layer, module by module

| Asset | Where | What a semantic layer gets for free | What it does NOT give |
| --- | --- | --- | --- |
| **Language readers** | `src/main/symbols/queries.ts` (12 queries: JS, TS, Go, Python, Rust, Ruby, Swift, Kotlin, ObjC, Java, PHP, C#; `.c`/`.cc`/`.cpp`/`.h` read with the ObjC grammar, measured in `resolver/cfamily.ts` at 3,637 of 3,636 includes over 400 abseil files) + `languages.ts` grammars already inside the signed bundle | Per-file **imports** AND **definitions by kind** — the hover already prints "4,937 functions, 2,283 constants, 964 interfaces, 925 methods", so named symbols per file are already extracted and counted | No call graph, no call sites, no string literals, no route tables, no annotations. Captures are `@definition.<kind>` and `@import.<kind>` only; adding "which functions call `spawn`" is a new query per language, not a new consumer |
| **Resolver arms** | `src/main/arch/resolver/**` (14 rows in `RESOLVER_MATRIX`) | Specifier → tracked file, with a stated grain per language and the never-`external` rule | Item-level resolution; a re-export chain resolves to the forwarder |
| **Tree facts** | `src/main/arch/tree-facts.ts` | One incremental read of EVERY tracked file (≤ 4 MB), already stamped on mtime+size — a semantic pass that needs bytes (route strings, `go:build` tags, CI YAML, Dockerfiles) has the read loop, the cache and the cancellation already built | It stores only lines and declared names today; a second fact would be a new column and a new pass over the same read |
| **Rule P / rules S, R** | `skeleton.ts`, `reading.ts`, `sentence.ts`, pinned by `conformance:reading` (10 rules, ablation per clause) | A partition that is 89–100% useful over three repositories, a sentence grammar, and a gate that goes red when a clause moves | The partition is **directories**. The explorer's is **runtime places**. Nothing in P1–P6 can express "these five directories are one process" |
| **The map** | `map.ts` + `src/renderer/arch/map/**` + camera in `arch.db` | Hand-written SVG, pan/zoom, drill, breadcrumbs, kept layout, `prefers-reduced-motion`, zero packages, one rule two readers | One node shape and one edge verb (`imports`). Regions, dashed off-repo boundaries, per-node evidence badges and journey overlays are all new drawing |
| **The contract store** | `docs/arch/` (schema in `shared/arch.ts`, validator in `main/arch/validate.ts` + `schema.ts`, ONE writer `enrich/write.ts`) | Identity (`id` never reused), anchors, provenance, layers, `description`, `gaps`, edges with `rule` and `checker`, `evidence` with path+lines+quote+blobOid, a drop-whole validator, and a `flows` slot ALREADY RESERVED (`ArchFlow`: `shape ∈ pipeline \| sequence \| states`, `steps[] {seq, componentId, label, note, group, evidence}`, 4–13 entries) that NOTHING reads today | Every new field is a key-set change in two files against research 66's pin. There is no evidence-level field, no `runs as`, no state-ownership record and no gate record |
| **The derived store** | `arch.db` (`arch_repo`, `arch_import_file`, `arch_import`, `arch_verdict`, `arch_verdict_change`, `arch_freshness`, `arch_tree_file`, `arch_camera`, `arch_layout`, `arch_pass_run`) | The place research 77 §5 already says a model's reading should live: disposable, keyed per repository, never in the person's tree, no key-set pin, and it already carries a per-run record with agent, model and input hash (`arch_pass_run`) | Nothing in it travels with a clone or a branch |
| **Drift and the checkers** | `checkers/**`, `enrich/drift.ts`, `repair-trigger.ts` | Convergent/divergent/absent/unverifiable with coverage, freshness in commits per part, a verdict delta between runs, the settle window, and `conformance:arch`'s hostile fixture | Every checker judges IMPORTS, ANCHOR EXISTENCE, MANIFEST DEPENDENCIES or QUOTE SURVIVAL. A semantic claim ("this component runs in the sandbox") has no checker and would land at `unverifiable` — which is honest, and is also the thing that would make a semantic layer un-checkable unless new deterministic evidence is extracted for it |
| **The remote mirror** | `machines/remote-arch.ts`, `arch/remote-source.ts` | A folder on another machine reads through the same code, bounded at 20,000 files / 64 MiB, content-token freshness via `cksum`, nothing spawned over there | The model slot is local by rule |
| **The agent-drafting path** | `enrich-coordinator.ts`, `enrich/compose.ts`, `enrich/run.ts`, `enrich/validate.ts`, `fold/spawn.ts`, `fold/recipes.ts`, `fold/scheduler.ts` suspension, `fold/options.ts` Settings list | A whole non-deterministic lane that already exists and is already bounded: one-shot guarded child, confirm gate re-checked at spawn, prompt cap, per-field mechanical validation (ids/anchors/kinds stand, **every digit run must appear verbatim in FACTS**), refuse-whole, suspension after failures, minimum interval, same-input-hash refusal, painted-coverage as a success test, and a per-run record | **ONE recipe exists (`claude`)**, so on a Mac with codex or gemini only, the pass is disabled with `not-measured` shown in Settings. And the answer is written INTO the person's repository, which is why research 77 §5 proposed a second, narrower ask that lands in `arch.db` instead |
| **The payload** | `payload.ts` + `picker.ts` + `deliver.ts` | Deterministic text composed from a selection and pasted into a session Tortie launched — the one place the reading turns back into work | Pinned line by line by the gate, so its shape is a contract |

**The single most reusable thing, and it is not code:** the division of labour is already exactly the
skill's. `enrich/validate.ts` mechanically refuses a model answer that invents an id, an anchor, a
kind or a NUMBER not present in the facts. That is "the helper discovers and validates, the agent
interprets" already shipped, bounded and gated — and it is the thing a semantic layer would otherwise
have to invent from nothing.

---

## 6. What the run measured that a redesign has to know (the frictions)

**F1. The contract and the map are computed from TWO DIFFERENT PARTITIONS, and on this repository
the overlay is therefore invisible.** `draftSkeleton` (`skeleton.ts:674`) groups with `groupTree` +
`rankGroups` + `mergeToTarget`; the map and the sidebar group with `readingPartition` (rule P). The
draft written into tortie-copy holds eight components — `build`, `.claude`, `demo`, `docs`,
`.github`, `patches`, `resources`, `src` — while the map draws `src/main`, `src/renderer`, `build`,
`docs`, `src/shared`, `everything else`, `demo`, `src/preload`. Consequences, all measured in the
second app run after re-opening the repository with the contract on disk: `src` spans four boxes at a
maximum share of 1,057/2,227 = 47%, so it paints nothing; `.claude`, `.github`, `patches` and
`resources` land in the fold, which `overlayComponents` never paints by rule; `build`, `docs` and
`demo` paint boxes whose computed label is the same string. **The level-1 map with a contract is
label-identical to the level-1 map without one, and all 11 edges carry the bare class
`arch-map-edge` with no verdict status.** (That sentence was written from a step named
`A.map.level1.withContract` that was actually a LEVEL-2 reading of `src/main`, because the probe
selected an outline row before opening the map and selecting a row drills it: crumbs
`["tortie","src/main"]`, 63 edges. The revision round of 2026-09-10 took the real reading with
`P256_ONLY=F1`, which walks the crumbs back to the root and asserts them before writing anything down.
`build/p256/pane-readings-f1.json`: crumbs `["tortie"]` both sides, the same eight labels in the same
order, 11 edges before and 11 after, all `arch-map-edge`. The claim holds; it had no measurement under
it.) Phase 158's map binding rule 2 ("a run after which the map
is unchanged is a FAILED run") is measured against the enrichment, and the *deterministic draft this
repository gets* already fails that test for 5 of its 8 components.

**F2. The verdict strip's headline counts anchor checks as promises.** See Q3: `10 checked and
holds` over a contract containing two `may` edges.

**F3. Once a contract exists, the pane draws the parts list TWICE, in two different partitions.**
The reading section (`aria-label="Components"`, 8 rows with sentences) and, below it, the contract
outline (`aria-label="Components"` again, 8 rows reading `build Ours`, `.claude Ours`, `demo Ours`,
`docs Ours`, `.github Ours`, `patches Ours`, `resources Ours`, `src Ours`). That second list is the
exact face research 77 §1 called the problem — "eight directory names each with the word Ours" — and
Phase 201 moved the reading above it without removing it. Resting-face text grows from 2,276 to
2,313 characters, of which the duplicate list is 88.

**F4. In Tortie's own repository the draft lands in an ignored directory.** `.gitignore:28` reads
`docs/arch/` (with a comment saying the contract is output that goes stale and a repository that
WANTS one commits its own), so after pressing Draft the contract, `git status --porcelain` on the
copy is EMPTY while the button's own hover title promises "It lands as an ordinary uncommitted
change, so Source Control shows every line". True in a stranger's repository, false in this one — and
it means Tortie has never dogfooded a committed contract.

**F5. The model slot is inert.** `ArchDrill.tsx:172` draws `No model reading yet.` as a `div` with a
title and **no control**; research 77 §7 item 3 asked for an `Ask the model` link beside it. The only
model path in the product is `arch:enrich`, which needs a drafted contract, an agent chosen in
Settings, and a `claude` recipe. A person with codex or gemini alone can never reach any model
reading at all.

**F6. The wiring clause quietly thins out on a real polyglot repository.** On stoa the repository
line reads `1,060 of 9,105 imports lead inside the repository` (11.6%), `stoa-web/app` reports
`1,261 not followed` of 1,985, and the map draws 8 edges across 22 boxes. The sentence stays true —
`stoa-cli` says "imports not followed (53 of 2,533 unresolved)" — but a reader learns almost nothing
about how stoa's parts connect, because **the connections are HTTP, sockets, JSON-RPC, CRDT sync and
deploys**, which are exactly what the explorer drew and what an import graph cannot see.

**F7. The deepest drill answers the least** (Q2): level 3 is a file list with no arrows.

---

## 7. One-paragraph summary for the research document

Today's pane is a **deterministic structural reading** — a directory partition, a size, a language
mix, an import rollup and a conventional entry file, drawn as boxes and one sentence each, kept
current by the watcher and checkable against a promise file — and it is very good at the question
*what is this repository made of and which parts lean on which*. It answers **one of the skill's five
reader questions well, one partly, and three not at all**, because every fact it holds comes from two
sources only: the file tree and resolved import specifiers. The explorer answers the other three
because an agent read the code and wrote down what runs where, what happens in order, what stops, and
what survives — claims no import graph contains. The good news for a hybrid is that the machinery for
the bounded non-deterministic half already exists and is already gated: one guarded one-shot child,
a facts block, and a validator that refuses any answer inventing an id, an anchor or a number. The
bad news is that the deterministic half would need new extraction (entrypoints, process boundaries,
exposed surfaces, stores and their writers, spawns, network calls, gates and tests) that no current
query captures, and the contract format that would hold the result is pinned by a gate against
research 66's ruling in two files.
