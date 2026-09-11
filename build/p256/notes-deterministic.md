# Phase 256, questions 5 and 6 — the deterministic half, prototyped and measured

**Everything below was run.** The prototype is under `build/p256/det/`, the hand-written semantic
pass and its checker under `build/p256/semantic/`, and every number's instrument is named beside it.
Nothing under `src/` was touched. No agent CLI was launched, no Tortie session was started, no token
was spent, no Electron was launched by any script in this half of the work.

---

## 0. Instruments, and what was and was not read

| | |
| --- | --- |
| Prototype | `build/p256/det/{parse,rules,textrules,manifests,run,batch,sample,score,recall,show}.mts`, run by the repository's pinned `tsx` (`node_modules/.bin/tsx`, node 22.23.1) |
| Reuses from Tortie | `src/main/symbols/paths.ts` (where the grammar wasm lives), `src/main/symbols/languages.ts` (extension → grammar), and — for the declaration experiment in §7 — `src/main/symbols/extract.ts`'s `SymbolExtractor` itself |
| Adds | one call-site / decorator / attribute reader per grammar (`parse.mts`), a rule table (`rules.mts`), line rules (`textrules.mts`), manifest rules (`manifests.mts`) |
| Spawns | exactly one program, `git`, with a fixed argv, through `execFileSync`, with `GIT_OPTIONAL_LOCKS=0`. No repository field reaches any argv. |
| Corpus | nine repositories in `<scratch>/repos`, seven of them `git clone --depth 1 --no-tags --recurse-submodules=no` (`build/p256/det/corpus.sh`), two of them `git clone --no-hardlinks --local` copies of `/Users/gdc/stoa` and of this worktree. **Nothing was read or written in place in either of the operator's repositories**; `/Users/gdc/specfactory` and `/Users/gdc/runstory` were not opened at all in this half. |
| Ground truth | hand enumerations recorded in `build/p256/det/recall.mts`, each one naming the pattern it was counted with; hand judgments of a 341-row precision sample in `build/p256/det/hand-precision.json` |
| Raw outputs | `build/p256/det/measurements/` — the corpus table, the precision score, the recall table, the precision sample, and the checker's two runs |

The node-type table in `parse.mts` was **measured rather than remembered**: every row was read off
`rootNode.toString()` for a sample of that language by `build/p256/det/_probe-nodes.mts` on
2026-09-10, and all thirteen shipped grammars parsed.

---

## 1. The corpus, and what it cost to read

```
repo        | tracked | parsed | unparsed |   MB |    ms | facts | entry | bound | surf | store | effect |  test |  gate
alamofire   |     571 |    111 |      458 |  2.1 |  1406 |   911 |    13 |     3 |   36 |     0 |     10 |   811 |    38
babel       |   27723 |  17702 |     9793 | 19.3 | 17437 |  5485 |   203 |   179 |  291 |    30 |    248 |  2918 |  1616
fastapi-app |     252 |    152 |       73 |  0.4 |   208 |   247 |    35 |    17 |   31 |    15 |      1 |   131 |    17
gotify      |     274 |    209 |       59 |  0.7 |   427 |   676 |    76 |     2 |   54 |     3 |     95 |   286 |   160
mastodon    |   10024 |   4224 |     5755 |  9.1 |  7320 | 17534 |    51 |    23 |  791 |   903 |   1269 | 12913 |  1584
requests    |     130 |     37 |       82 |  0.4 |   203 |   658 |    17 |     4 |    4 |     0 |    216 |   415 |     2
ripgrep     |     237 |    111 |      111 |  1.8 |   773 |   602 |    28 |    25 |    7 |    10 |     18 |   510 |     4
stoa        |    4593 |   1990 |     2300 | 16.2 |  7949 |  7067 |   120 |    59 |  735 |  1128 |    693 |  1888 |  2444
tortie      |    3145 |   2522 |      618 | 30.9 | 17619 | 22752 |    37 |    80 | 1081 |   274 |   4516 | 15565 |  1199
```

Nine repositories of seven language families, **46,949 tracked files, 26,958 of them parsed, 80.9 MB
read, 53,932 facts, 53.3 s of wall clock in one process** (the wrapper pass of §6 is roughly half of
every figure in the `ms` column; without it the same nine take 18.0 s).

The shapes the charter asked for are all present: a CLI (ripgrep, Rust), two web services (gotify in
Go, the FastAPI template in Python and TypeScript), a Rails app (mastodon), a library (requests), a
monorepo (babel, 27,723 files), a Swift project (Alamofire), and the two the operator cares about.

**Five of the thirteen grammars were exercised by no repository in this corpus, not four.** java, php,
c-sharp and kotlin were exercised by none at all. **objc is the fifth**, and the count below is what
gives it away: **3 facts, from one file** (`build/fsevents-cap.c`, a C file its grammar claims), and
**0 rows of the 341 hand judgments are objc**, so its rules have a precision of nothing. Every rule
naming only those five is written and compiled and **unmeasured**. The fact languages actually seen
were typescript 40,660, javascript 16,912, ruby 16,101, tsx 4,265, go 2,617, manifest 1,470, path
1,153, swift 938, python 776, rust 606, path+export 368, objc 3.

---

## 2. Precision — 341 facts judged by hand

The sampler (`sample.mts`) sorts each repository's facts by `(file, line, rule)` and takes six per
category at an even stride, so the sample is reproducible from the same commits. Each row was judged
by reading the cited line and, where the line alone did not settle it, opening the file.

**The judging rule, stated so it can be argued with**: a fact is TRUE when a reader who opens
`file:line` agrees the cited line is an instance of the named category in *this repository*. Test code
counts as the repository's own code — a test that CALLS the auth function is evidence about the auth
gate — but an assertion whose variable name merely contains `authenticate` is not.

```
category   | sampled | true | precision | vendored-FP | fixture-FP | misclassified-FP | precision excluding vendored files
entrypoint |      54 |   49 |       91% |           0 |          0 |                5 | 91%
boundary   |      45 |   45 |      100% |           0 |          0 |                0 | 100%
surface    |      52 |   39 |       75% |           9 |          0 |                4 | 91%
store      |      39 |   24 |       62% |           2 |          1 |               12 | 65%
effect     |      49 |   32 |       65% |           2 |          6 |                9 | 68%
test       |      54 |   52 |       96% |           0 |          0 |                2 | 96%
gate       |      48 |   29 |       60% |           6 |          8 |                5 | 69%
ALL        |     341 |  270 |       79% |          19 |         15 |               37 | 84%
```

Per repository, all seven categories together: tortie 40/42 (95%), fastapi-app 35/37 (95%), requests
26/28 (93%), stoa 36/42 (86%), mastodon 34/42 (81%), ripgrep 28/40 (70%), babel 28/42 (67%), gotify
23/35 (66%), alamofire 20/33 (61%).

### The three false-positive families, and which is which

**Vendored and generated bytes, 19 of 71 false positives.** Alamofire tracks a jQuery build and a
lunr build inside `docs/`; babel tracks `.yarn/releases/yarn-4.17.0.cjs` and a bundled `Makefile.js`;
mastodon tracks `.storybook/static/mockServiceWorker.js`. Every fact in them is *true about those
bytes* and worthless as architecture. It is 100% of the sampled surface facts on Alamofire and 3 of 6
on babel. **The deterministic half has no notion of "the project's own code", and git-tracked-ness —
which is Tortie's own exclusion rule — does not supply one.** A vendor filter is the single cheapest
precision win available and would take the corpus from 79% to 84%.

**Fixtures and assertions, 15.** Mastodon's request specs, `errors.New("test error")` in a gotify
test, `t.Fatalf("put: %v", err)` in a stoa test, a URL in an RSpec fabricator. The shape is always the
same: a test names the thing rather than being the thing. Narrowing `surface.http.method-call` to
refuse a test path removed all six of mastodon's, and the remaining ones are `gate.refusal` reading a
test's own failure report as a product refusal.

**Misclassification, 37, and this is the one that does not go away with a filter.** `store.orm` is 1/13:
`Object.create(null)`, a generated route table's `.update({…})`, `NoIgnore.update(FlagValue…)` in
ripgrep's flag machinery, `File::create(path)` — every verb an ORM uses, something else uses too.
`entrypoint.composition` is 3/8, entirely because `&model.Application{…}` in gotify is a struct
literal named `Application`. `effect.net.client` is 14/29, mostly URLs that are header values, JSON-LD
context identifiers or fixture data rather than call targets.

**Worst rules by measured precision:** `store.orm` 8%, `surface.cli.arg` 25%,
`entrypoint.composition` 38%, `surface.handler.on` 44%, `effect.net.client` 48%, `gate.auth` 54%,
`gate.refusal` 57%.

---

## 3. Recall — ten bounded scopes, hand enumerated

Each scope is a NAMED region of one repository whose ground truth was enumerated by reading it. Every
scope states the pattern it was counted with, and `recall.mts` asserts the count it was recorded at,
so a later reader either reproduces the number or is told the corpus moved. All ten agree today.

```
repo        | category   | scope                                             |  truth | found | recall | extras
tortie      | surface    | every invoke channel the product registers        |    229 |   229 | 100.0% |     0
gotify      | surface    | every route in the one router file                |     44 |    40 |  90.9% |     0
fastapi-app | surface    | every route in the backend route package          |     23 |    23 | 100.0% |     0
mastodon    | surface    | every route declaration in the routes files       |    450 |   450 | 100.0% |     3
stoa        | surface    | every Next.js app-router HTTP handler             |    362 |   362 | 100.0% |     3
ripgrep     | surface    | every command-line flag the binary accepts        |    108 |     0 |   0.0% |     0
alamofire   | test       | every XCTest case function                        |    761 |   735 |  96.6% |    75
mastodon    | store      | every table in the committed schema               |    116 |   116 | 100.0% |     0
requests    | effect     | every place the library itself reaches the network|      5 |     0 |   0.0% |     0
babel       | entrypoint | every package that installs a command             |      4 |     4 | 100.0% |     0
```

The tortie row's ground truth is not the researcher's: it is
`docs/audits/contract-baseline.txt`'s `[ipc.invoke.channels]` block, a file the product generates and
`gate:contract` byte-compares on every build.

### The three zeroes are the most informative rows here

**ripgrep, 0 of 108 CLI flags.** ripgrep declares each flag as `impl Flag for <Name>` with a
`fn name_long(&self) -> &'static str { "…" }` inside it. There is no `clap` call, no `add_argument`,
no decorator — the declaration IS the flag. No name-based call rule can ever see it, and what the CLI
rules *did* find on ripgrep was wrong: `Command::new("git")` in `build.rs` read as a CLI command, and
`cmd.arg("--path-separator")` in a test read as a flag declaration. **A project that declares its
surface in its own vocabulary is invisible, and this is the strongest argument in this research for
the non-deterministic half existing at all.**

**requests, 0 of 5 network reaches.** The library's own network is `conn.urlopen(…)` in
`adapters.py:696` and three `self.send`/`adapter.send` dispatches. The receivers are local variables.
Meanwhile the prototype found **216** `effect.net` facts in that repository — every one of them a TEST
calling the public API. **A name-based effect rule finds the standard library's verbs, so a library
that IS the standard verb is invisible in its own repository while its consumers are loud.**

**stoa, 0 of 362 — until the rule shape changed.** A Next.js app-router handler is
`export async function GET(req)` in a file whose PATH is the route. There is no call at all. Adding
ONE rule family, `declarationSurfaces` in `rules.mts` — a path convention plus an exported name —
took it from 0 to 362 of 362. This is the finding a build spec has to carry: **a rule table of call
sites is half a rule table. Surfaces are declared as often as they are called.**

### The two partial rows

**gotify 40 of 44.** Two missed because `client.GET("")` and its two neighbours sit on a receiver
called `client`, which is on the CLIENT denylist (§5); one because the route is composed across a
chained `g.Group("/user").Use(…).POST("", …)`; one at `g.Group("/").Use(…).POST("/message", …)`.

**Alamofire 735 of 761.** The 26 missed are `func test…` bodies the line rule's anchor did not reach;
the 75 extras are the `XCTestCase` class facts and the SwiftPM test target, which are true and simply
not on a `func test` line.

**Mastodon went from 329 to 450 by one change**: Rails writes a member route as `get :activity`, and
116 of the 121 declarations the prototype missed carried a SYMBOL rather than a string. Adding
`simple_symbol` to the ruby grammar's string list closed it.

---

## 4. What each category can and cannot answer, per language family

| category | answers well | answers badly | families measured |
| --- | --- | --- | --- |
| `entrypoint` | 91% precise. Manifests carry it: `package.json` bin/main/scripts, Cargo names, `go.mod`, pyproject scripts, Dockerfile CMD, CI jobs, SwiftPM targets. `func main`, `if __name__`, `@main` | `entrypoint.composition` at 38%; a struct literal called `Application` is not an app | all nine repositories; java/php/c-sharp/kotlin manifests unmeasured |
| `boundary` | 100% precise on 45 judged. Compose services, workspaces, library targets, thread and worker creation, module roots | it is mostly PATHS and MANIFESTS; the only code-shaped boundary facts are thread and worker creation | all nine |
| `surface` | 91% precise excluding vendored bytes; 100% recall on three of four route scopes and on every IPC channel | a surface declared in the project's own vocabulary is invisible (ripgrep's 0/108); `surface.handler.on` at 44% is `sock.on('data')` noise | routes measured on go/python/ruby/ts; IPC on ts only |
| `store` | SQL in migration files and in executed strings; Rails `create_table` at 116/116; localStorage | `store.orm` at 8% is the worst rule in the table. Every ORM verb has a non-ORM homonym | ruby/python/ts measured; go/rust barely |
| `effect` | spawns and filesystem writes through standard-library names; 88% on `effect.fs.write` | `effect.net.client` at 48%; a URL in a string is not a call. A library's own network reach is invisible | all nine |
| `test` | 96% precise, 96.6% recall on Swift; 15,565 facts on tortie against a `grep` ground truth of 15,578 | a route handler named `test_token` reads as a test; a pen-test script's `def test_…` reads as a test | go/python/rust/ruby/swift/ts/js measured |
| `gate` | 69% excluding vendored bytes. Rails `before_action :authorize…`, environment switches, real `throw`/`raise`/`panic` refusals | `gate.refusal` reads a test's `t.Fatalf` and `errors.New("test error")` as product refusals; feature-flag detection found almost nothing real | all nine |

---

## 5. Two rule-shape findings that generalise

**An allowlist of plausible names is the wrong way round for an open set.** The HTTP route rule began
with an allowlist of router receivers — `app`, `router`, `r`, `mux`, `g` — and found 7 of gotify's 44
routes, because the real receivers are `oidcGroup`, `pluginRoute`, `clientAuth`, `tokenMessage`,
`clientElevated` and `authAdmin`, names no list anticipates. Inverting it to a DENYLIST of the
half-dozen HTTP *client* objects took the same file to 40 of 44. **The closed set is the one to write
down.** The cost is measured and named: `client.GET("")` is now refused because `client` is on the
client denylist, which is 3 of the 4 remaining misses.

**A cross-RULE dedupe, not a cross-site one.** On a Python route two rules legitimately fire — the
decorator rule on `(decorator …)` and the method-call rule on the `(call …)` inside it. Keyed on the
rule id, that produced 41 facts for fastapi-app's 23 routes and halved measured precision on that
repository. Keyed on `(category, kind, subject, line)` it produces exactly 23.

---

## 6. The wrapper pass — the finding that matters most for Tortie

**Tortie's own Architecture pane could not see one of Tortie's 229 IPC channels.**

The product does not write `ipcMain.handle('arch:map', …)`. It writes `handle(ipc, 'arch:map', …)`,
through `src/main/typed-ipc.ts`'s one typed registrar, which is the growth guardrail in this
repository's own CLAUDE.md. A rule table keyed on callee names sees `handle` and nothing else.
Measured: **2 IPC facts on this repository, 0 of 229 channels, 0.0% recall.**

`readWrappers` in `parse.mts` resolves one hop. For every named function declaration it asks: does
this forward one of its own parameters into a call on an ANCHOR api, in that api's own name position?
`unwrap` then rewrites a bare call to that function into the site the anchor would have produced, so
the SAME rule table answers it. Three things had to be got right, each of them measured:

1. **It must key on a BARE call.** Keying on the callee's final segment alone made `sock.on('data')`
   resolve against a wrapper declared as `on`, which put 41 emitter events into this repository's
   channel list.
2. **An import alias must be followed.** `src/main/ipc.ts` does `import { handle as handleTyped }`
   and forwards into `handleTyped`; without rewriting the inner name through the file's own alias
   table the second hop finds nothing.
3. **A caller's own declaration must shadow the project-wide one.** `handle` is declared twice in
   this repository with two different signatures — `typed-ipc.ts` takes `(ipc, channel, fn)` and
   `ipc.ts` takes `(channel, fn)` — and one global map answered the second with the first's argument
   index. That was exactly 26 of the 229.

With all three: **229 of 229, 100.0% recall, ZERO false positives** against the contract baseline.

| repo | wrappers resolved | facts only the wrapper pass found | wrapper cost | total |
| --- | --- | --- | --- | --- |
| tortie | 231 | **735** | 4,839 ms | 17,619 ms |
| babel | 257 | 2 | 4,155 ms | 17,437 ms |
| stoa | 58 | 0 | 3,188 ms | 7,949 ms |
| mastodon | 13 | 0 | 1,998 ms | 7,320 ms |
| requests | 13 | 0 | 87 ms | 203 ms |
| alamofire, ripgrep, fastapi-app, gotify | 3, 3, 1, 0 | 0 | — | — |

**735 facts on Tortie and 2 across the other eight.** That is not a defect of the pass, it is a fact
about Tortie: this product's conventions — one typed preload bridge, one invoke registrar, one tmux
module, one guarded write — are exactly the shape that hides a surface from a name rule. The device
costs **3.15× the whole read on this repository** and buys the difference between a pane that can name
every door the product exposes and one that can name two. That number was written as "about a doubling"
until the revision round of 2026-09-10 re-derived it, and the correction is worth keeping because the
two numbers a reader could reach for disagree by a factor of four. The fact file's own `wrapperMs` is
PASS 1 alone, 4,839 of 17,619 ms here, being 27%; turning the pass off ALSO removes the unwrap
attempted at every call site in PASS 2, so the only honest form is with and without: tortie 17,619 vs
5,599 = **3.15×**, babel 3.73×, mastodon 3.09×, stoa 2.12×, and the four small repositories 1.57× to
1.83×, with the whole corpus at 53,342 vs 18,166 = **2.94×**. Re-derived on a busier machine, tortie
reads 33,725 vs 8,861 = 3.81× for the same 735 facts.
A judged sample of 14 wrapper-only facts read 13 true; the one false was a subject rather than a
fact, `run(['-C'], file)` reported as "runs -C" because the wrapper forwards the ARGUMENTS and the
program is somewhere else.

Raising `maxHops` past 1 grows the resolved map (179 → 228 → 231) and moves no measured recall,
because the caller-local shadow already performs the second hop where it matters. Two hops cost about
1 s on this repository and bought nothing on this corpus.

---

## 7. The prototype semantic pass, and what the checker caught

`build/p256/semantic/tortie.pass.json` is **a semantic description of this repository written by the
researcher by hand on 2026-09-10** — 9 components with the full contract (job, input, output, runs in,
state, limit, evidence level), 3 journeys of 3 to 5 steps, 6 gates with question, answer and reason,
and **41 citations**. It is not the output of any agent. It was written from READING the source, in
the order a model with source access would, and nothing was copied out of the fact base while
writing. It is not a proposal for `docs/arch/`: research 66's pinned key set and refusal 8 are
untouched here.

`build/p256/semantic/check.mts` asks three things and four structural ones:

1. every source link resolves to a tracked file and a line that exists;
2. every citation names a FACT the deterministic pass emitted within three lines of it;
3. every evidence level is justified by a detected call site or test — and `accepted-live` is
   refused outright, because nothing the deterministic half can see is evidence about a running
   system;
4. ids unique, contract fields present, journey steps naming components that exist, gates naming a
   gate-shaped fact, and **every digit run in prose carried by some fact**, which is the one rule
   copied rather than invented: `src/main/arch/enrich/validate.ts` already applies it to the shipped
   drafting pass.

### The result, which is the answer to "how far can deterministic evidence bound a model"

| fact base | claims | rule 1, link resolves | rule 2, citation names a fact | findings |
| --- | --- | --- | --- | --- |
| call sites only (22,752 facts) | 41 | **41/41, 100%** | **9/41, 22.0%** | 37 |
| plus declarations (52,689 facts) | 41 | 41/41, 100% | **24/41, 58.5%** | 24 |

**Rule 1 is nearly free and rule 2 is the whole game.** Every one of 41 hand-written citations pointed
at a real tracked line — a model that has read the source rarely invents a path. Only nine of them
pointed at something the deterministic half had independently noticed.

Adding DECLARATIONS to the fact base, through Tortie's own shipped `SymbolExtractor` rather than a
second reader, took that from 22.0% to 58.5%. It costs 2.3× the facts (22,752 → 52,689) and 2.0× the
time (18.2 s → 37.2 s) on this repository. The reason it works is structural: **a semantic claim's
best evidence is usually a declaration.** "The one door that rewrites your file" is evidenced by
`export async function writeGuarded(` at `src/main/fs/guarded-write.ts:347`, which is not a call site
and never will be.

### The 17 that remain unbacked, classified — this is the taxonomy a build would have to answer

| class | count | which ones | what it says |
| --- | --- | --- | --- |
| **The writer cited a COMMENT** | 3 | `credentials/nofollow.ts:35` (twice, from a component and a gate) and `sessions/launch-plan.ts:321` — both prose explaining the mechanism, neither the mechanism | The most valuable catch in the whole checker. A model writing about a well-commented codebase will cite the sentence that SAYS the thing rather than the line that DOES it, because the sentence is the better prose. Nothing but a fact base catches that. |
| **The writer cited line 1 of a module** | 4 | `arch/scan.ts:1`, `arch/skeleton.ts:1`, `arch/map.ts:1` (twice) | A lazy "the module" citation. Cheap to refuse and worth refusing. |
| **A real rule gap** | 8 | `attach/attach-host.ts:228` (twice) is `nodePty.spawn(…)` and the spawn rule's receiver list has no `nodePty`; `fs/guarded-write.ts:391` and `:468` are `openSync` calls the fs rule's verb list does not carry; `editor/redline-write.ts:117` (twice) is `bridge.fs.writeGuarded(…)`, a product's own write channel no universal table knows; `machines/exec-plane.ts:750` is `execFileP`, a promisified alias made by a CALL rather than a declaration, which the wrapper pass does not follow; `shared/path-doors.ts:294` is `EXTERNAL_ALLOW.has(…)`, a guard that reads a constant set | Each is nameable, each is a rule or a hop away, and none is a reason to doubt the shape. |
| **Span granularity** | 1 | `manifest/schema.ts:47` is `CREATE TABLE IF NOT EXISTS projects (` inside a multi-line template string; the fact sits at the CALL and the writer pointed at the SQL, more than three lines away | Facts should carry a SPAN, not a line. |
| **A filter choice** | 1 | `config/confirm.ts:454` is `readonly confirmedHash: string \| null;`, a type FIELD, and the declaration filter admits functions, classes, interfaces, types, constants, methods, structs, enums and modules but not fields | |

One citation moved class between the two runs and is worth naming: `attach/attach-plan.ts:154` is a
comment, and it was unbacked in the calls-only run and BACKED in the declaration run, because a
declaration fact sits within three lines of it. **A three-line slack around a declaration will back a
comment that sits above it**, which is a real weakness of rule 2 as written and an argument for the
span rather than the line.

The evidence-level rules fired three times and all three were right: `arch-reading` claimed
`composed` and cited three module line-1s that back nothing, and `guarded-write` and `redline` claimed
`component-tested` with no test fact among their own citations — the checker could see 243 and 907
test facts in their directories and reported the level as justified only INDIRECTLY, which is the
honest answer rather than a pass or a fail.

**No gate finding fired for `accepted-live`,** because the writer did not claim it. That rule exists
for the failure the skill's own ladder already suffered: the only shipped explorer renamed three
rungs, dropped two — "accepted live" and "planned" appear zero times in it — and invented one.

---

## 8. What this half establishes, in one page

1. **The deterministic half is real and it is fast.** 46,949 files across seven language families,
   80.9 MB, 53,932 facts, 53 s in one process with the wrapper pass and 18 s without. Nothing in it
   spawns anything but `git` with a fixed argv.
2. **Its precision is 79%, or 84% once vendored bytes are excluded**, and the residue is concentrated:
   four rules (`store.orm`, `entrypoint.composition`, `effect.net.client`, `surface.handler.on`)
   carry most of it.
3. **Its recall is excellent where a surface is declared in a framework's vocabulary and zero where it
   is declared in the project's own.** 229/229, 450/450, 362/362, 116/116, 23/23, 40/44, 735/761 —
   and 0/108, 0/5.
4. **A rule table of call sites is half a table.** One declaration-shaped rule family took a 0 to a
   362. One declaration FACT family took the checker from 22% to 58.5%.
5. **A repository's own wrapper is the thing that hides it from itself**, and Tortie is the extreme
   case in this corpus: 735 facts and 229 channels behind three lines of resolution that buy almost
   nothing anywhere else.
6. **Deterministic evidence bounds a model less than it looks like it should.** 100% of a careful
   writer's citations resolved; 22% of them named something the deterministic half had seen, 58.5%
   with declarations in. The gap is not the model being careless — it is the fact base being thinner
   than the claims a person wants to read. **The checker's value is not that it refuses lies. It is
   that it names, per claim, which sentences are standing on something and which are standing on
   prose** — and on this evidence a surface built this way must draw that difference rather than hide
   it.
