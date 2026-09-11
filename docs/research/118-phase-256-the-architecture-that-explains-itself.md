# Research 118 — Phase 256: the architecture that explains itself

Written 2026-09-10, at `2e1b4799`, in the worktree `/private/tmp/wt-p256`, and **revised the same day
at `27fd7241` after an adversarial reviewer re-derived it**; what that round moved is listed in §0.1
and every number it moved is re-measured below rather than reworded. This is the DESIGN step of
Phase 256, which is RESEARCH ONLY: **not one line under `src/`** was written, no agent CLI was
launched, no Tortie session was started and no token of the operator's was spent. It takes apart the
as-built skill, the three explorers it has produced, and Tortie's own Architecture pane; it
prototypes the deterministic half over nine repositories and measures it; it writes a semantic pass
BY HAND and measures how far deterministic evidence can bound one; and it ends in a choice put to
the operator rather than in a build.

**The four take-apart reports this document stands on**, each of them run rather than reasoned:
`build/p256/notes-skill.md` (331 lines), `build/p256/notes-explorer.md` (341),
`build/p256/notes-pane.md` (367), `build/p256/notes-deterministic.md` (348). Raw outputs are in
`build/p256/det/measurements/`, `build/p256/out-explorers.json`, `build/p256/pane-readings.json`,
`build/p256/pane-readings-f1.json` and `build/p256/overlay-readings.json`. The prototype is
`build/p256/det/`, the hand-written semantic pass and its checker `build/p256/semantic/`, the mock
`build/p256/mock/`.

**The revision round added four instruments**, because four of its findings were that a claim had no
instrument behind it at all: `build/p256/semantic/plant.mts` (how many deliberate lies the checker
refuses), `build/p256/semantic/null-model.mts` (the share a coin would score at the same question),
`build/p256/det/ladder.mts` (the five rungs of §7.2 COMPUTED, with a self-test proving each one
fires), and `P256_ONLY=F1` in `build/p256/probe-p256-pane.mjs` (the level-1 reading §4.4 cited and
did not have). Their outputs are `build/p256/semantic/measurements-revision.txt`,
`build/p256/det/measurements/ladder.txt` and `build/p256/pane-readings-f1.json`.

---

## 0. The answer, in a few sentences

The skill's thesis — *"the helper discovers, fingerprints, compares and validates; the agent
interprets"* — is true, and **far narrower than it reads**: its helper never reads a byte of source
except to hash it, and the nouns its product is made of (component, journey, gate, entrypoint,
contract, evidence) appear **zero times** in its 1,050 lines of Python. Every semantic claim in every
explorer is a model's, bounded by prose instructions and by a hash of the whole repository. Measured:
a document claiming *"the scheduler retries failed jobs three times … Accepted live behaviour"* over a
three-line `app.py` records clean, checks clean and passes the HTML checker with zero findings.

Tortie's pane is the opposite shape and has the opposite weakness. It answers **one** of the skill's
five reader questions well, one partly and **three not at all**, because every fact it holds comes
from two sources: the file tree and resolved import specifiers. It needs no author, no turn and no
maintenance, it is current by construction, and a failed promise names a line — none of which any
explorer can do.

**The bridge is a third fact base that neither has**: entrypoints, process boundaries, exposed
surfaces, stores, spawns, network reaches, gates and tests, read deterministically across the
languages Architecture already parses. Prototyped and measured over nine repositories in seven
language families: **46,949 tracked files, 26,958 parsed, 80.9 MB, 53,932 facts, 53 s in one
process**, precision **79%** overall and **84%** excluding vendored bytes, recall **229/229** on this
repository's own IPC channels, **450/450**, **362/362**, **116/116** — and an honest **0/108** and
**0/5** where a project declares its surface in its own vocabulary, which is the strongest argument in
this research for the model half existing at all.

And the measurement that decides the surface's shape: over a careful hand-written semantic pass of
this repository, **41 of 41 citations resolved to a real tracked line and only 24 of them named a
fact the deterministic half had independently seen** — 9 of 41 before declarations were added to the
fact base. **The checker's value is not that it refuses lies**, and the revision round measured how
far that is from being one: handed seven deliberately false copies of that same pass, each wearing a
shape a writer really produces, **it catches two** (`build/p256/semantic/plant.mts`). A component
renamed *"Billing and card capture"* whose job is charging a credit card, keeping its three real tmux
citations, raises nothing at all. **What it says is which sentences are standing on something**, and
even that has a floor: over the nineteen files the pass cites, **23.8% of all lines are within three
of some fact anyway**, so 58.5% is 2.46× a coin and not 58.5 points of evidence
(`build/p256/semantic/null-model.mts`). A surface built this way must DRAW the difference rather than
hide it, because hiding it would claim 100% evidence for something whose floor is a quarter.

**And the evidence ladder, which §2.4 calls the most important design input in the phase, is computed
now and it refutes the first draft of its own design.** The five rungs run in 0.1 to 3.4 s a repository
with Tortie's own shipped resolver, all five proved to fire on planted graphs, and over path-anchored
parts they spread properly — 22 `declared` / 7 `composed` / 4 `reached` / 2 `tested` here, and quite
differently on ripgrep, gotify and requests. Over the NINE parts a person would actually put in a
contract, **eight of nine read `tested`**, and widening every anchor from a file to a directory glob
moves not one of them. A ladder computed by an unseeded walk over a 7,957-edge first-party graph with
857 test files has two rungs. It is still the only thing that can refuse `accepted-live` mechanically,
so it is still built; what it needs is a seed a boundary chooses, and that is named as unfinished.

**The recommendation is direction B**, the hybrid reading inside the pane, built in three phases whose
FIRST phase is direction A — so a repository with no agent, on any machine, keeps a picture that got
strictly better, and nothing is thrown away if the model half is never used. **The revision round did
not move it**, and its findings are about how much of B this document had bounded rather than about
which direction to take.

### 0.1 What the revision round changed, and what it refuted

An adversarial reviewer re-derived this document on 2026-09-10. The corpus table, the 229/229 recall,
the skill measurements, the stoa readings, the ladder decay of §2.4, the wrapper concentration and the
mock's zero colour literals all reproduced. Eleven things did not, and each is now measured rather
than reworded.

| what was wrong | where | what was done |
| --- | --- | --- |
| the checker was never measured against a LIE | §0, §6.4, §7.3 | `plant.mts`, seven planted shapes, **2 of 7 caught**, published |
| a backing rate was published with no floor | §6.4, §7.3 | `null-model.mts`, **23.8% over the cited files**, 2.3% for the call-site base, published beside every rate |
| §7.3 said "a fact of the WANTED SHAPE" and the checker asked no shape | `check.mts` | the shape is asked now, of the whole span; it is the gate rule's question and rule 2 is honestly named PROXIMITY |
| rule 7 read the first fact in the span rather than searching it | `check.mts` | fixed and re-measured: **0 of 6 of this document's own gates cite a gate fact**, which the first writing did not report |
| the five rungs of §7.2 were computed on NO repository | §7.2 | `ladder.mts`, run over four, with all five rungs proved to fire — **and it refuted §7.2's optimism**, see below |
| `reached` was justified by an aggregate its own table refutes | §7.2 | entrypoint precision is **17% to 100%**, all five errors in gotify, stated as a range |
| boundary's 100% was attached to "what this repository builds and starts" | §7.6 | split: **15/15 on the build-and-start rules, 30/30 on module roots**, and on this repository 75 of 80 boundary facts are `index.ts` |
| §4.4's F1 cited a level-2 reading for a sentence about level 1 | §4.4 | the reading was TAKEN (`P256_ONLY=F1`), and the sentence is true |
| "nothing lets a `git pull` start a process" | §7.5 | false as written; corrected to what `repair-trigger.ts` does |
| the mock drew the AUTHOR'S evidence word and drew Tortie from any fact file | §9 | it computes the rung now and refuses a foreign fact file; the layout moved into the pass |
| "about a doubling of the read" | §6.3 | measured with and without: **3.15× on this repository**, 2.94× over the corpus |

**The reviewer was refuted on one judgment.** It asked that `tests/__init__.py` and
`tests/testserver/__init__.py` be judged FALSE as boundary facts. They stay TRUE: `hand-precision.json`'s
stated method asks whether the line is an instance of the NAMED CATEGORY, the rule is
`boundary.path.module-root` and its subject is "module root", and a Python package `__init__.py` is
one. What was wrong is the sentence in §7.6 that borrowed the number, and that sentence was split. One
judgment DID move — `requests/gate/1`, `os.environ["NETRC"] = netrc_file` under a rule called
`gate.env-read` — taking requests from 93% to 89% and gate from 60% to 58%.

---

## 1. Instruments, and what was not touched

| | |
| --- | --- |
| Worktree | `/private/tmp/wt-p256`, detached at `0ebcf9df` and, after the prototype landed, `2e1b4799`. The operator's checkout was never written, staged or reset. |
| Skill | `/Users/gdc/as-built-architecture`, git head `aa0428d`, 2,448 lines read in full, READ ONLY. Its python helpers were run only over scratch COPIES, never against a repository in place. |
| Explorers | `stoa` (86,548 bytes) plus, under the narrow lift the operator gave on 2026-09-10, `runstory` (87,928) and `specfactory` (98,995) — **the two HTML files only**. Nothing else under `/Users/gdc/runstory` or `/Users/gdc/specfactory` was read, listed, copied or run, and nothing was written there. |
| Repositories studied | scratch `git clone` copies of this worktree and of `/Users/gdc/stoa`; seven shallow read-only public clones removed by `corpus.sh`'s own trap |
| Electrons | every one through `build/electron-run.mjs` on a scratch profile with a scratch `HOME` and a socket `gmux-p256-<pid>`, ended in its `finally`. `npm run shot` was never run. Leftover Electrons after every run: **0**. |
| Agents | none. No CLI launched, no session started, no token spent, no keychain opened, no machine, no ssh, no request. |
| The semantic pass | `build/p256/semantic/tortie.pass.json`, **written by the researcher by hand on 2026-09-10**, labelled as such in its own first field. It is not a measurement of any shipped agent. |

**Five of the thirteen shipped grammars are unmeasured, not four.** java, php, c-sharp and kotlin were
exercised by no repository in the corpus at all. **objc is the fifth**: it produced **3 facts, from one
file** (`build/fsevents-cap.c`, a C file its grammar claims), and **0 rows of the 341 hand judgments
are objc**, so its rules have a precision of nothing. Every rule naming only those five is **written
and unmeasured**, and this document does not claim otherwise.

---

## 2. The skill, taken apart (charter question 1)

### 2.1 The thesis is true and narrower than it reads

`SKILL.md:16` says the helper *discovers, fingerprints, compares and validates* and that a hash match
*"establishes unchanged bytes, not architectural truth or live acceptance."* Both halves hold.

**The helper never reads a byte of source except to hash it.** Every content read in
`scripts/architecture.py` is lines 160/163 (`stream.read` → `hasher.update`), 227, 430 and 441 (its
own JSON state file). "Discovers" means lists paths. "Validates" means validates its own record and
an HTML document's structure.

Word counts over both helpers, 1,050 lines: `journey` 0, `gate` 0, `contract` 0, `entrypoint` 0,
`handler` 0, `symbol` 0, `language` 0, `component` 1 (a fixture string), `evidence` 5 (all inside
printed disclaimer prose). **Every noun the skill's product is made of is absent from its code.**

### 2.2 The deterministic duties, with their ceilings

`repository()` (git root; a plain directory exits **2**, `"Git inventory failed"`); `inventory()`
(`git ls-files --cached --others --exclude-standard`); `fact()` (path, kind, sha256, bytes,
executable, opened `O_RDONLY|O_NOFOLLOW|O_NONBLOCK`, `fstat` before and after so a racing file
raises; a symlink is hashed as its LINK TEXT and never followed); one repository-wide fingerprint;
a scope report that calls its own exclusions heuristic (`:329`); a consistency block that prints
`"atomic": false` every run; `plan()` answering `create` / `reconcile` / `update` / `noop` and always
exiting 0, because it is *"evidence, not permission to overwrite"* (`SKILL.md:83`); an ambiguity
refusal when two candidates exist for one format; `record()` freezing the fingerprint with
`mkstemp` → `fsync` → re-read → `os.replace`, refusing a moved baseline and refusing `--summary` as a
baseline, and answering with its own admission
`"semantic_verification": "Not performed; recording freezes content evidence only."` (`:449`);
`check()` giving exact added/changed/deleted sets and exit 1 on drift; path refusals; and a state
hygiene rule that REFUSES a malformed or unknown-schema record rather than overwriting it.

`check_explorer.py` (510 lines) parses HTML, CSS with a hand lexer and JSON strictly. Its entire
enforcement surface is **17 finding codes** and **7 published notes** naming its own blind spots.
Read as a sentence: it enforces that the page is a well-formed, self-contained, keyboard-navigable
offline document whose links point at files that exist. **Nothing in it is about architecture.**

### 2.3 What a hash match does not prove — six measurements

1. **Not truth.** A repository with one three-line `app.py` and a document claiming *"The scheduler
   retries failed jobs three times with exponential backoff and writes receipts to Postgres. Accepted
   live behaviour, 2026-09-10"*, with `evidence: "accepted-live"` in its data block: `record` →
   `recorded`; `check` → **exit 0, `current`**; `check_explorer` → **exit 0, `ok`, 0 findings**.
2. **Not order.** In that fixture the document was written BEFORE the baseline was taken. `record`
   accepted it. Nothing enforces read-source-then-write.
3. **Not that a cited path means anything.** `sources` holding a DIRECTORY, a bogus anchor
   (`src/a.py#L4200`), an object with `line: 9999, symbol: "nonexistent"` and an unrelated
   `CHANGELOG.md` → **exit 0, ok, 0 findings**; four keys spelled `evidence_files`, `files`, `source`
   and `proof` naming missing files were never looked at at all.
4. **Not that drift is about the claim.** Record, then add one line to `CHANGELOG.md`: `check` exits 1
   with `source_drift.changed == ["CHANGELOG.md"]` and `plan` answers `update` for a document that
   never mentioned it. **The fingerprint is repository-wide and the record holds no component to map
   it onto.**
5. **Not "no dangling evidence", on his own data.** Over stoa: `check` → `current`, all three drift
   sets empty, while `check_explorer` over the same bytes → **2 `missing-local-target`** findings for
   `stoa-web/livekit-teammate-agent/livekit.staging.toml`, cited at line 341 and line 529.
6. **Not that anything runs the checker.** `grep check_explorer scripts/architecture.py` → **0**;
   `grep architecture.py scripts/check_explorer.py` → **0**.

### 2.4 The ladder decays in a single writing

`SKILL.md:51-57` defines five rungs: implemented library, composed source, component-tested, accepted
live behaviour, in progress or planned. Measured over stoa's explorer, the only shipped artifact: 21
components, **14 `ev-composed`, 3 `ev-library` ("Implemented, not shipped"), 3 `ev-tested`, 1
`ev-offrepo`**. Three rungs renamed, **two dropped** — "accepted live" and "planned" appear zero
times — and **one invented**, drawn in the error colour.

**This is the single most important design input in the whole phase.** An advisory ladder written as
prose did not survive one writing by a careful model, in the skill's own flagship output. A ladder
that is to mean anything has to be COMPUTED, and this document's design computes it.

### 2.5 What survives into machine-readable form: three fields

`check_explorer.py:387-404` reads exactly one key name out of the `architecture-data` island:
`sources`. Over stoa's 21 components, the union of every key present is exactly
**`{id, name, sources}`**, 41 source paths. Job, input, output, owner, state, limit and evidence level
are **HTML prose**. The drift record `.as-built-architecture.json` carries
`{schema_version, generator, source, artifacts, references}` and **no component, journey, gate, claim
or evidence key anywhere in it** — 811,249 bytes for stoa's 3,271 files, about 248 bytes a file.

### 2.6 Cost and determinism

`inspect` over this repository, 3,141 files and 114 MB: **0.75 s**, re-run 0.85 s. Over stoa, 3,271
files and 43 MB: **3.33 s** — 4.5× slower on 38% of the bytes, because the cost is per file and per
git call rather than per byte. Three consecutive gmux inspects are byte identical (md5
`d672ab3dd6303925d76bcd7169a0f352`). The skill's own suite: **50 tests, OK in 13.4 s**.

---

## 3. The three explorers, taken apart (charter question 2)

Read off the DOM in a scratch Electron at 1440×900, then re-quoted from the source bytes wherever a
caption mattered. **"Views" in the table below means TOP-LEVEL views**, which is what a person picks
between; `out-explorers.json` counts every `[role=tabpanel]` and so reads 4, 6 and **26** for stoa,
whose other 21 are one detail panel per component. The re-quoting matters for one more reason than the
first writing knew: two string fields in that artefact were corrupted by a reader bug until the
revision round, and §9 says which and proves no number came off them.

| | runstory | specfactory | stoa |
| --- | --- | --- | --- |
| views | **4** | 6 | 5 |
| components | 12 | 12 | **21** |
| **edges between component boxes** | **0** | **2**, both inside a dashed band showing a path that is NOT connected | **0** |
| named transports between regions | **4** (two per gap, both directions, each carrying what crosses) | 2 bare `⇄` + 1 named return line | **0** |
| journeys | 1 track, 15 steps | 2 × 8 | 5 journeys, 30 steps |
| "what runs" | a **computed worksheet**: 3 selects + 9 checkboxes → lane strip, 10-row table, conditional notes | 15 canned cases | 21 canned cases |
| evidence per component | **none** | 5 status words | **a 4-rung ladder**, 14/3/3/1 |
| per-component limit | 12/12, mean 35.1 words | 12/12, 28.0 | 21/21, 34.1 |
| external requests | **0** of 21 anchors | 0 of 223 | 0 of 57 |
| markup vs script | map empty in markup, 52.5 KB JS | details empty, 53.9 KB JS | **everything pre-rendered**, 7.8 KB JS |
| words at rest (body) | **488** | 639 | 392 |
| words above the fold | **253** | 285 | 288 |
| minimum path to understanding one component | **≈221 words** | ≈271 | ≈197 |

All three **open with one component already explained** — zero clicks to the first real answer.

### 3.1 Why it reads as a semantic description rather than a dependency graph

Blunt finding: **none of the three draws a dependency graph.** Component-to-component edges are 0, 0
and 2, and specfactory's two exist to show a path that is *not* wired. Eleven devices replace it, and
the column that matters is the last one:

| device | what it does | who can produce it |
| --- | --- | --- |
| **Regions by execution location and authority** | answers *who runs this, on whose machine* before a single component is read | **hybrid** — the partition is derivable from entrypoints, manifests, Dockerfiles and CI targets; the region's NAME is the model's |
| **Named transports between regions** (`Git pack + envelope →`, `← Polled verdict + artifacts`) | names the PAYLOAD, not the protocol, with a direction | **hybrid** — an edge is derivable; the payload name is the highest-value model sentence on the page |
| **Jobs, not folders, as names** | makes the map a description of what the system DOES | **model, irreducibly.** Measured: by the rule "the name contains a product, package, language or platform token", **17 of 21** stoa names do and **0 of 12** runstory names do — and stoa is the one that reads as an inventory |
| **A fixed five-field contract per component** | one shape for every part, so parts compare | **hybrid** — "Runs in" derivable; Receives/Returns seedable from route schemas, IPC channel types and CLI flags |
| **A named LIMIT on every component** (45 of 45 across the three) | this is what stops it reading as marketing | **model**, with a derivable subset |
| **An evidence level per component** | separates "the code exists" from "anything reaches a user" | **derivable — the strongest determinism opportunity in the whole design** |
| **Journeys ending in a result**, each step naming a component | the only place edges appear; you learn the system by following one thing that happens | **model to author, deterministic to check** |
| **Branches and gates as first-class steps** (stoa marks 8 of 30 titles) | failure paths are not a footnote | hybrid |
| **A "what runs" surface** | answers *what happens to MY change* | mostly derivable |
| **Distinct drawing for what is NOT connected** (dashed band, dashed off-repo region) | the page is believed because it admits what it cannot see | derivable |
| **A scope disclaimer per view** | fences the claim | a property of the generator, written once per view |

The pattern: **semantics come from the model, trust comes from the deterministic half, and the shape
of the page forces them to meet.**

### 3.2 What runstory's does that the other two do not

Stated with its confound first: **he saw runstory's first and it is his own product**, so familiarity
is not separable from design by anything measured here. What is measurable:

1. **Fewest views (4) and fewest words at rest** (253 above the fold).
2. **The handoffs are drawn and named.** Four labelled arrowed transports carrying what crosses.
   specfactory reduced them to `⇄`; stoa dropped them entirely. This is what makes the map read as a
   system in motion rather than a set of shelves.
3. **Every component named for its job** — 0 of 12 name a file, a package or a vendor — with a 3-to-5
   word subtitle on the node, so the map reads before any click.
4. **One device that computes.** The worksheet answers "what about MY change"; its successors recite.
5. **One linear journey with a place-track** telling you where you are.
6. **The inspector sits BELOW the map at full width**, so the flow figure has room.

What runstory lacks and the successors added, worth carrying anyway: a per-component evidence level
(stoa's ladder is the strongest of the three), a state-ownership view, a built-and-remaining view,
deep-link state, and markup that survives no JS.

### 3.3 What Tortie's house rules refuse in this style

1. **Two chrome controls go**: stoa's `Theme` and `Print everything`, specfactory's `Print reference`.
   Appearance is Settings (Phases 207/210/213); menus are native through `ui:popupMenu`.
2. **No invented colour.** The three define 24, 18 and 20 `:root` properties of their own. A port draws
   from `src/renderer/styles/tokens.css`, and any new dot or chip inherits the Phase 218 floor of 3:1
   on `--bg-active` across every offered frame, not just the shipped one.
3. **The word budget.** "Just enough words" was set on this very pane. On the resting face: the 3-to-5
   word node subtitle, the five field labels, the region label. Behind hover or a disclosure: the
   35-word limit, the scope notes, the region blurb.
4. **No command may appear on the face.** runstory's step sheets print `make install` and
   `runstory init --account <uuid> --bypass <secret>`; specfactory prints a reproduce block with an
   absolute path under his home. A model-written record carrying a runnable command, drawn in a pane
   one keystroke from a terminal, is exactly the shape refusal 8 and research 66 exist to forbid.
5. **No third-party code and no skill execution** (refusals 1 and 7). Helpfully all three explorers
   make **zero external requests**, so the CSP is not the obstacle — executing someone else's page is.
6. **URL state has no equivalent**; it becomes per-tab, per-project view state, and the remote path
   carries it too.
7. **No tmux vocabulary**, and **a surface added is a menu changed in the same commit**.

---

## 4. Tortie's pane today, taken apart (charter question 3)

Two scratch Electrons over scratch clones of this repository (3,145 tracked files) and of stoa
(4,593). Chord → filled reading **4,529 ms** cold and **3,007 ms** warm. Draft pressed → contract
cockpit **517 ms**. Resting pane text **2,276 characters / 8 rows** here and 5,582 / 22 on stoa.
Level 1: 8 boxes and 11 edges here, 22 boxes and 8 edges on stoa. Elements carrying
`data-session-status`: **0**.

### 4.1 The pipeline, and where the one agent step is

Trigger (rides the ONE `@parcel/watcher` subscription, so the 8-path FSEvents budget is untouched) →
tracked files → imports (14 resolver rows, grain stated per language, ceiling 50,000 files) → tree
facts (one read of every tracked file ≤ 4 MB) → manifests → **rule P**, the reading partition →
**rules S and R**, one 16-31 word sentence per box and ten hover facts → the picture, pure and byte
repeatable → contract load, drop-whole → overlay (strict majority; the fold is never painted) → five
checkers over exactly five fixed-argv git calls → drift → **the agent step** → levels 2 and 3 →
canvas → remote mirror. Surface: **21 names**, 17 invoke channels plus 4 pushes. Three channels write
`docs/arch/` and only three.

The agent step is the shipped enrich pass: drafted contract + a FACTS block ≤ 64 KB with 40 file
paths sampled per part, one guarded one-shot child, the confirm gate re-checked at the spawn, a
validator that refuses WHOLE when an id, an anchor, a kind or **any digit run not present verbatim in
FACTS** appears, and a kept run that paints no box recorded FAILED as `no-painted-box`. **Exactly one
recipe exists, `claude`**, measured 2026-08-28 at 23.05 s and $0.0239 on a 582-file run; every other
agent reads `not-measured` and is disabled in Settings.

### 4.2 Question by question, against the skill's own five reader questions

| Reader question | Today's pane | Explorer | File tree |
| --- | --- | --- | --- |
| What lives where and how does it connect | **partly** — folders, sizes, import direction | **answered** — runtime regions, per-component contract, off-repo | partly |
| How setup reaches a result | **not at all** | **answered** — 5 journeys with branches and stops | no |
| Why work proceeds or stops | **not at all** — its strip judges import promises | **answered** — 6 gate groups | no |
| What survives / needs reconciling | **not at all** — the word "state" is on no surface | **answered** — a 9-row ownership table | no |
| What is built and what remains | **partly**, and about TORTIE's blindness rather than the project's | **answered** — ladder, ship matrix, unfinished edges | no |

Every clause the pane draws is a count or a name from the tree. Its one connective verb is `imports`:
**11 of 11 edge titles here and 8 of 8 on stoa read `X imports Y`.** Its partition is directories,
and on stoa **the biggest box is the junk drawer** — `everything else` is 1,469 files, 32% of the
repository, 1,311 of them `.specstory` history, with a hover line reading
`Size: 1,469 files, 12,841,227 lines`.

### 4.3 What the pane does that no explorer can, and that a redesign must not trade away

1. **No author and no turn.** Every reading above cost zero tokens and zero human writing.
2. **Current by construction**, against an explorer stamped `inspected 2026-09-09`.
3. **Checkable, and a failure names a line.** Nothing in an HTML explorer can fail.
4. **It refuses to flatter** — per-box denominators, the unparsed-language sentence, `unresolved`
   never becoming `external`, coverage counted apart from status.
5. **Any repository, 14 languages, the moment it is opened**, including one on another machine through
   the same code.
6. **Inside the place the work happens** — a real tab with a camera, and `Aim at this`.
7. **Nothing to maintain.** That is a Zen refusal, not an accident.

### 4.4 Seven frictions the run measured, which a redesign has to answer

- **F1. The contract and the map are computed from TWO DIFFERENT PARTITIONS, so on this repository the
  overlay is invisible.** `draftSkeleton` wrote `build, .claude, demo, docs, .github, patches,
  resources, src`; the map draws rule P's `src/main, src/renderer, build, docs, src/shared, everything
  else, demo, src/preload`. `src` spans four boxes at 1,057/2,227 = 47% and therefore paints nothing;
  four more components land in the fold, which is never painted by rule. **Re-opened with the contract
  on disk, the level-1 map is label-identical to the no-contract map and all 11 edges carry the bare
  class with no verdict** — Phase 158's map-binding rule already fails for 5 of 8 components on the
  deterministic draft.
  **THAT LAST SENTENCE WAS CITED TO A LEVEL-2 READING UNTIL THE REVISION ROUND, AND THE READING WAS
  THEN TAKEN.** The first probe clicked an outline row before opening the map, and selecting a row
  DRILLS it, so the step recorded as `A.map.level1.withContract` came back with crumbs
  `["tortie","src/main"]` and 63 edges — one box, not the map. `P256_ONLY=F1` in
  `build/p256/probe-p256-pane.mjs` walks the crumbs back to the root, asserts the crumbs it got before
  it writes anything down, and keeps the drilled reading beside it under its right name. From
  `build/p256/pane-readings-f1.json`: crumbs `["tortie"]` on both sides, the same eight box labels in
  the same order, **11 edges before and 11 after, every one of them `arch-map-edge` with no verdict
  class**, and the mislabelled reading kept as `A.map.asOpenedWithContract` at `["tortie","src/main"]`
  with 63. The sentence was right; it had no measurement under it, and now it does.
- **F2.** The verdict strip's headline counts anchor checks as promises: `10 checked` is 8 anchor globs
  plus 2 `may` edges.
- **F3.** With a contract present the pane lists the parts **twice**, in two partitions — the face
  research 77 §1 called the problem.
- **F4.** `.gitignore:28` ignores `docs/arch/` in Tortie's own repository, so **Tortie has never
  dogfooded a committed contract** and the Draft button's promise that Source Control will show every
  line is false here.
- **F5.** The model slot is inert: `ArchDrill.tsx:172` draws `No model reading yet.` as a `div` with a
  title and **no control**.
- **F6.** On stoa the wiring clause thins where it matters: `1,060 of 9,105 imports lead inside`
  (11.6%), `stoa-web/app` reports `1,261 not followed` of 1,985, and 8 edges span 22 boxes. stoa's real
  connections are HTTP, sockets, JSON-RPC, CRDT sync and deploys — exactly what the explorer drew and
  what an import graph cannot see.
- **F7.** The deepest drill answers the least: level 3 is a flat file list with no arrows.

---

## 5. The rulings this lives under (charter question 4, gathered, not re-argued)

`ARCH_ROW_KEYS` is pinned byte for byte in **two** files (`src/shared/arch.ts:452`,
`build/conformance-arch.mjs:1571`), and the gate additionally fails any key matching
`command/args/argv/exec/run/script/binary/program`. Research 66 §6.1's reason, verbatim in the gate:
a repository-local directory arrives with a `git pull` written by whoever last pushed, so it *"may
carry identity and presentation and may never name anything Tortie runs"*. The only field deciding
which code runs is `checker`, a closed five-word set.

The rest, each binding something below: the visualization IS the product (Phase 162/160); picking
determinism is not an operator choice, ONE way in (Phase 158); in-repo contract with derived state in
`arch.db` (2026-08-28); the map binding — enrich in place, the map is a proof surface, a run that
leaves it unchanged is FAILED (Phase 158); just enough words; nothing draws-then-spawns and nothing
starts from configuration alone (refusal 8); no contract field ever reaches an argv; drop-whole
validation; `unresolved` is never `external`; a behavioural edge tops out at `partly-checked`;
`baseline.json` has exactly one writer, the person's own button; no count badge on any node and no
dashboard; no verdict sets a session status; prose renders as plain text; off by default with Settings
always reachable; a remote view feels identical; one rule, two readers; zero new packages and the CSP
unmoved.

**A reserved slot nobody has used.** `ArchFlow` is already in the pinned key set —
`shape ∈ pipeline | sequence | states`, 4 to 13 `steps` of
`{seq, componentId, label, note, group, evidence}` — and **is read by nothing today**. It is, field for
field, a journey.

---

## 6. The deterministic half, prototyped and measured (charter questions 5 and 6)

`build/p256/det/` reuses Tortie's own `src/main/symbols/paths.ts` and `languages.ts` and, for the
declaration experiment, its shipped `SymbolExtractor`; it ADDS a call-site, decorator and attribute
reader per grammar, a rule table, line rules and manifest rules. It spawns exactly one program, `git`,
with a fixed argv and `GIT_OPTIONAL_LOCKS=0`, and **no field of any repository reaches any argv**. The
node-type table for all thirteen grammars was **measured off `rootNode.toString()`**, not remembered.

### 6.1 Agnosticism, measured — the table the charter asked for

```
repo        | shape             | tracked | parsed |   MB |    ms | facts | entry | bound | surf | store | effect |  test |  gate
alamofire   | Swift library     |     571 |    111 |  2.1 |  1406 |   911 |    13 |     3 |   36 |     0 |     10 |   811 |    38
babel       | JS monorepo       |   27723 |  17702 | 19.3 | 17437 |  5485 |   203 |   179 |  291 |    30 |    248 |  2918 |  1616
fastapi-app | Python+TS service |     252 |    152 |  0.4 |   208 |   247 |    35 |    17 |   31 |    15 |      1 |   131 |    17
gotify      | Go service        |     274 |    209 |  0.7 |   427 |   676 |    76 |     2 |   54 |     3 |     95 |   286 |   160
mastodon    | Rails app         |   10024 |   4224 |  9.1 |  7320 | 17534 |    51 |    23 |  791 |   903 |   1269 | 12913 |  1584
requests    | Python library    |     130 |     37 |  0.4 |   203 |   658 |    17 |     4 |    4 |     0 |    216 |   415 |     2
ripgrep     | Rust CLI          |     237 |    111 |  1.8 |   773 |   602 |    28 |    25 |    7 |    10 |     18 |   510 |     4
stoa        | Next.js + agents  |    4593 |   1990 | 16.2 |  7949 |  7067 |   120 |    59 |  735 |  1128 |    693 |  1888 |  2444
tortie      | Electron + tmux   |    3145 |   2522 | 30.9 | 17619 | 22752 |    37 |    80 | 1081 |   274 |   4516 | 15565 |  1199
```

**Precision, 341 facts judged by hand**, judging rule stated in `hand-precision.json`: entrypoint 91%,
boundary **100%**, surface 75% (**91%** excluding vendored bytes), store 62%, effect 65%, test 96%,
gate 58% (67% excluding vendored) — **79% overall, 84% excluding vendored**. Per repository: tortie
95%, fastapi-app 95%, requests 89%, stoa 86%, mastodon 81%, ripgrep 70%, babel 67%, gotify 66%,
alamofire 61%.

**Two of those aggregates hide the thing that matters, and the revision round said so rather than
leaving it to be found.** `entrypoint` at 91% is **49 of 54, and all five errors are in one
repository**: eight repositories read 6/6 and gotify reads **1/6**, so the honest statement is a range
of **17% to 100%**, and §7.2 no longer leans on the single number. `boundary` at **100% is 45 of 45 and
30 of those 45 are one rule**, `boundary.path.module-root`, which says a language's package root is
here; the other fifteen — SwiftPM targets, compose services, Cargo workspaces and libs, spawned
threads, workers — are **15 of 15**. Both halves are honest arithmetic under the file's stated method.
What was not honest was §7.6 borrowing the 100% for a sentence about what a repository *builds and
starts*: five of the thirty module roots are TEST packages, and on this repository **75 of 80 boundary
facts are `index.ts` barrel files** and the other five are workers. §7.6 is split accordingly.

The residue is concentrated in four rules: `store.orm` **8%** (every ORM verb has a non-ORM homonym),
`surface.cli.arg` 25%, `entrypoint.composition` 38%, `surface.handler.on` 44%, `effect.net.client`
48%.

**The deterministic half has no notion of "the project's own code", and git-tracked-ness — which is
Tortie's own exclusion rule — does not supply one.** Alamofire tracks a jQuery build inside `docs/`;
babel tracks `.yarn/releases/yarn-4.17.0.cjs`. A vendor filter is the single cheapest precision win
available: 79% → 84%.

**Recall, ten hand-enumerated bounded scopes:** 229/229 (this repository's invoke channels, ground
truth being `docs/audits/contract-baseline.txt`, a file the product itself generates and
`gate:contract` byte-compares), 450/450 (mastodon routes), 362/362 (stoa app-router handlers),
116/116 (mastodon tables), 23/23 (FastAPI routes), 4/4 (babel installed commands), 735/761 (Alamofire
XCTest), 40/44 (gotify routes) — **and 0/108 and 0/5.**

**The two zeroes are the most informative rows in this research.** ripgrep declares every flag as
`impl Flag for <Name>` with the name inside it: the declaration IS the flag, there is no call, and no
name-based rule can ever see it — while what the CLI rules DID find there was wrong. requests reaches
the network at five lines through local variables, and the prototype found **216** network facts in
that repository, every one a test calling the public API. **A project that declares its surface in its
own vocabulary is invisible to any universal rule table, and that is the argument for the model half
existing at all.**

**Those 216 are judged 5 of 6 TRUE in the precision table above and they are the headline example of a
wrong answer, and both readings are right.** The reviewer called that a contradiction; it is two
different questions and the document had not said which was which. PRECISION asks *is this line an
instance of the named category* — `requests.get(url)` inside a test IS a network call site, and
`hand-precision.json`'s method counts a test that CALLS the thing as the repository's own code on
purpose. RECALL asks *does this answer a reader's question* — "where does this library reach the
network" — and there the same 216 facts score **0 of 5**, because every one of them is a caller and
none is the five lines that do the reaching. **A rule can be precise and useless in the same
repository**, and that gap is the sharpest measurement in this section: it is exactly the gap the
model half is being asked to close, and no amount of rule-table work closes it.

### 6.2 Three rule-shape findings that generalise

1. **A rule table of call sites is half a table.** A Next.js handler is an exported name in a file
   whose PATH is the route; there is no call. ONE declaration-shaped rule family took stoa from **0 to
   362 of 362**.
2. **An allowlist is the wrong way round for an open set.** An allowlist of router receivers found **7
   of gotify's 44** routes, because the real receivers are `oidcGroup`, `pluginRoute`, `clientAuth`,
   `tokenMessage`, `clientElevated` and `authAdmin`. Inverting to a DENYLIST of the half-dozen HTTP
   CLIENT objects took the same file to **40 of 44**. The closed set is the one to write down.
3. **Dedupe across RULES, not across sites.** Keyed on rule id, two legitimate rules produced 41 facts
   for 23 FastAPI routes; keyed on `(category, kind, subject, line)` it produces exactly 23.

### 6.3 The wrapper pass — Tortie could not see one of its own 229 channels

The product writes `handle(ipc, 'arch:map', …)` through `src/main/typed-ipc.ts`, which is the growth
guardrail in this repository's own CLAUDE.md. A rule table keyed on callee names sees `handle` and
nothing else. **Measured: 2 IPC facts on this repository, 0 of 229 channels, 0.0%.**

One hop of wrapper resolution closes it to **229 of 229 with zero false positives**, and three things
had to be right, each measured: key on a **bare** call (or a wrapper named `on` puts 41 emitter events
into the channel list); follow the **import alias** (`import { handle as handleTyped }`); and let a
**caller's own declaration shadow** the project-wide one, because `handle` is declared twice here with
two signatures — exactly the 26 that were missing.

**735 facts on Tortie and 2 across the other eight repositories.** That is a fact about Tortie's
conventions, not about the device: one typed bridge, one invoke registrar, one tmux module, one
guarded write is exactly the shape that hides a surface from a name rule.

**It is not "about a doubling of the read", which is what this paragraph said before the revision
round, and the two numbers a reader could reach for disagree by a factor of four.** The fact file
records `wrapperMs`, which is PASS 1 alone, at **4,839 of 17,619 ms here, 27%**; that is the number the
first writing read and it is the wrong one, because turning the pass off also removes the unwrap
attempted at every call site in PASS 2. Measured with and without, which is the only honest form:
**tortie 17,619 ms against 5,599 = 3.15×**, babel 3.73×, mastodon 3.09×, stoa 2.12×, and the four small
repositories 1.57× to 1.83×; **the whole corpus is 53,342 ms against 18,166 = 2.94×**. Re-derived in
the revision round on a busier machine, tortie reads 33,725 against 8,861 = **3.81×** for **735 facts**
and no change to any other count. So the trade is a read three to four times as long on a
convention-heavy TypeScript repository for a surface that would otherwise be 0.0% visible, and it is a
reason to make the pass a SETTING of the fact base rather than always-on — which is now in the build
spec.

### 6.4 The hand-written semantic pass, and how far evidence bounds it

`build/p256/semantic/tortie.pass.json` — **written by the researcher by hand**, 9 components with the
full contract, 3 journeys, 6 gates, **41 citations**, nothing copied out of the fact base while
writing. The two runs below are one pair over one commit, `0ebcf9df`; the design step re-ran the
checker over `2e1b4799` and read the same 24 of 41.

| fact base | rule 1, the link resolves | rule 2, the citation names a fact | findings |
| --- | --- | --- | --- |
| call sites only (22,752 facts) | **41/41, 100%** | **9/41, 22.0%** | 37 |
| plus declarations (52,689 facts) | 41/41, 100% | **24/41, 58.5%** | 24 |

**Rule 1 is nearly free and rule 2 is the whole game.** A writer who has read the source rarely
invents a path. Adding DECLARATIONS — through Tortie's own shipped `SymbolExtractor` rather than a
second reader — took 22.0% to 58.5%, at 2.3× the facts and 2.0× the time, because **a semantic claim's
best evidence is usually a declaration**: "the one door that rewrites your file" is evidenced by
`export async function writeGuarded(` at `src/main/fs/guarded-write.ts:347`, which is not a call site
and never will be.

**And the declarations bought less than that table says, which the revision round measured and the
first writing had no instrument for.** A citation is BACKED when SOME fact sits within three lines of
it, so the question *what share of lines are within three of some fact anyway* has an answer, and it is
the floor under both rates. Measured over the same nineteen files by
`build/p256/semantic/null-model.mts`:

| fact base | rule 2 | the floor, over the files the pass cites | lift |
| --- | --- | --- | --- |
| call sites only, 22,752 facts | **22.0%** | **2.3%** | **9.6×** |
| plus declarations, 52,899 facts | **58.5%** | **23.8%** | **2.46×** |

**The call-site base is the SHARPER instrument and the declaration base is the more generous one.**
21.9 of the declaration base's 23.8 points of floor is the declaration facts themselves, because a
prose-heavy TypeScript file declares something every few lines. So the honest reading of 22.0 → 58.5
is not "rule 2 got three times better": it is that more claims can be backed, each by weaker evidence.
That has a direct design consequence and §7.3 takes it: **the chip must say which KIND of fact backs a
claim**, because a call site within three lines is a far stronger statement than a declaration within
three lines, and a surface that draws them the same way has thrown the difference away. Over the whole
repository the floor is 33.1% of 808,669 lines in 2,530 files, so the number is not an artefact of the
nineteen.

**And the checker is not a lie detector, which is the other thing the first writing implied and never
measured.** `build/p256/semantic/plant.mts` makes one deliberately false copy of this same pass per
shape a writer really gets wrong, runs the SHIPPING checker over each, and counts only findings the
honest pass does not already raise. **It catches two of seven:**

| planted | caught |
| --- | --- |
| `durable-sessions` renamed *"Billing and card capture"*, its job charging a credit card, `runsIn` the payment provider's servers — its three real tmux citations untouched | **no** |
| a whole component *"the tmux id stamp is our SQL migration runner"*, citing `tmux/env.ts:49` and `tmux/sessions.ts:85`: right file, wrong symbol | **no** |
| `component-tested` justified by `src/main/__tests__/ansi.test.ts:32` for a claim about SSH host keys | **no** |
| the `start-and-return` journey reversed into a causally impossible order | **no** |
| an invented gate *"Will Tortie refuse to deploy on a Friday?"* citing `demo/bridge/install.ts:106` | **no** |
| `evidence: accepted-live` | **yes** |
| three invented numbers — "17 times", "4096 seconds", "92 credentials" | **yes, and only one of the three** |

The last row is the one to read twice. Rule 6 asks whether ANY of 52,899 fact subjects contains the
digit run, so **"4096" is caught and "17" and "92" are not** — "17" because a fixture session is named
`p117-lost-9` and "92" because a refusal quotes the IP `192.0.2.1`. The SHIPPED rule in
`src/main/arch/enrich/validate.ts:521` is narrower, asking the 64 KB FACTS block the model was handed
rather than the whole base, and the same substring weakness applies inside it. **A digit rule must ask
about the block the model was given, and must ask for a token rather than a substring.**

The invented gate is the sharpest miss, and it is not a bug in rule 7: `demo/bridge/install.ts:106`
really carries a `gate.refusal` fact. **A shaped question narrows the floor; it never makes the
sentence true.** Per-category floors over the same files, from the same instrument: `gate` **0.1%**,
`effect` 0.9%, `store` 0.7%, `surface` 0.7%, against `decl` at 21.9%. So "a gate fact within three
lines" is a hundred times harder to hit by accident than "any fact within three lines" — worth having,
and still not a truth test.

**What the checker is for, then, stated so a build cannot over-claim it.** It refuses a citation that
does not resolve, it refuses a level nothing here is evidence for, it says per sentence whether
anything was detected at the place named, and it says what KIND. It does not and cannot tell a person
that a sentence is true. Every chip on the face has to be readable as *a fact was found here*, never
as *this is right*.

The 17 that remain unbacked are classified, and the taxonomy is what a build must answer:

| class | count | what it says |
| --- | --- | --- |
| **The writer cited a COMMENT** | 3 | The most valuable catch in the whole checker. A model writing about a well-commented codebase cites the sentence that SAYS the thing rather than the line that DOES it, because the sentence is the better prose. **Nothing but a fact base catches that.** |
| **Cited line 1 of a module** | 4 | A lazy "the module" citation. Cheap to refuse, and worth refusing. |
| **A real rule gap** | 8 | `nodePty.spawn`, two `openSync` calls, `bridge.fs.writeGuarded` (a product's own write channel no universal table knows), `execFileP` (a promisified alias made by a CALL). Each is a rule or a hop away. |
| **Span granularity** | 1 | The fact sits at the CALL and the writer pointed at the SQL inside a multi-line template, more than three lines away. **Facts must carry a span, not a line.** |
| **A filter choice** | 1 | A type FIELD, which the declaration filter does not admit. |

And one citation moved class between the two runs: a comment that was unbacked became BACKED because
a declaration fact sat within three lines of it. **A three-line slack will back a comment sitting
above a declaration** — a real weakness of rule 2 as written, and the second argument for spans.

The evidence-level rules fired three times and **all three were right**.

**Rule 7 fired four times and the first writing did not mention it at all, which mattered, because the
four were right for the wrong reason and two more were missing.** The rule asked `hit.category !== 'gate'`
of whatever `near.find(() => true)` had handed back, which is the FIRST fact in the span in array
order rather than a search of it. Measured: `build/assert-css-order.mjs:295` IS a `gate.refusal`, and
the old code answered with the `effect.fs.write` at line 298 and printed *"this gate cites nothing the
gate rules found"*. The shape is asked of the whole span now, and the honest reading is worse than the
one that shipped: **0 of this document's own 6 gates cite a gate-shaped fact.** Four cite a
declaration and two cite a line the pass emitted nothing at. A research document proposing a gates
view should say that its own gates scored zero, and the reason is §6.1's rule table, whose `gate`
category is the least precise it has at 58%, and whose facts sit at `throw` sites rather than at the
function whose name a writer reaches for.

---

## 7. The design

### 7.1 The division of labour, and exactly which claims each half may make

**The deterministic half may claim**, and nothing else:

1. this path exists, is tracked, and has this blob;
2. this file declares this symbol of this kind at this SPAN (shipped: `SymbolExtractor`);
3. this file imports this specifier, resolved `first-party | external | unresolved | unverifiable`
   (shipped, 14 resolver rows, `unresolved` never `external`);
4. this span is a call site of an api on a CLOSED table, or a declaration matching a path convention
   (new, prototyped, 79%/84% precise);
5. this manifest declares this entrypoint, target, service or workspace (new, 91% precise, 100% on
   boundary);
6. this file belongs to this part of the partition (shipped, rule P);
7. counts and ratios over the above, always with their denominator.

**The deterministic half may NOT claim**: what a part is FOR; what runs where at runtime; what happens
in what order; why work stops; what survives a crash; or that anything reaches a user. Every one of
those is a model claim and the surface must attribute it as one.

**The model half may claim**: the name of a part by its job; the five contract fields (receives, does,
returns, runs in, keeps); the limit; the region a part runs in; journeys; gate reasons. Each sentence
carries citations.

**The model half may NOT claim, refused mechanically**: an evidence level (computed, never written —
§7.2); a digit run absent from the FACTS block (already enforced by
`src/main/arch/enrich/validate.ts`); an id, anchor or kind that does not stand (already enforced); a
citation that does not resolve to a tracked line (refuse the row whole); a path outside the repository.

### 7.2 The evidence ladder, enforced by CODE

This is the direct answer to §2.4's measurement. **The level is a computed field. No model may write
one, and a model answer that contains one is refused whole.** Five rungs, each derived from the
component's own anchors against data that already exists in `arch.db` plus the new fact table:

| rung | computed by | claims |
| --- | --- | --- |
| `off-repo` | no anchor resolves to a tracked file | nothing here is this repository's code |
| `declared` | anchors resolve; no first-party import edge reaches them and no entrypoint or manifest fact names one | the code is here and nothing in the repository reaches it |
| `composed` | at least one first-party import edge reaches an anchor, OR a manifest/entrypoint fact names one | something in this repository composes it |
| `reached` | a path exists in the first-party import graph from an `entrypoint` fact to an anchor | it is on a path from something that starts |
| `tested` | `reached`, AND a `test` fact in a file that imports an anchor | a test in this repository exercises it |

**There is no `accepted-live` rung and there cannot be one**, because nothing Tortie reads is evidence
about a running system. The gate asserts that no code path can produce that word.

Four of the five rungs are computable from data the product already holds: the resolved import graph
(`arch_import`), the anchors (`docs/arch/`), and the new entrypoint and test facts. `reached` is a walk
over a table that already exists.

**THE FIRST WRITING OF THIS SECTION STATED FIVE RUNGS AND COMPUTED NONE OF THEM ON ANY REPOSITORY**,
which is §2.4's own defect one level up: §2.4 calls the ladder's decay the single most important design
input in the phase and the answer to it was five rows of prose. `build/p256/det/ladder.mts` is the
rungs run rather than written. It builds the first-party import graph with **Tortie's own shipped
resolver** (`src/main/arch/resolver`) and its own `SymbolExtractor`, which is the point: the claim is
that the product already holds this, so it is computed with the product's own parts. All five rungs are
proved to FIRE on planted graphs, 7 of 7 fixtures, because every repository in the corpus tracks every
anchor it names and `off-repo` would otherwise be 0 everywhere with no way to tell a rung that cannot
happen from one that never did.

**Over the path-anchored parts of four repositories** (the top two path segments, ≥ 3 files, which is
what a `docs/arch/` glob looks like), in 0.1 to 3.4 s a repository:

| | parts | off-repo | declared | composed | reached | tested |
| --- | --- | --- | --- | --- | --- | --- |
| tortie | 35 | 0 | 22 | 7 | 4 | 2 |
| ripgrep | 19 | 0 | 4 | 2 | 5 | 8 |
| gotify | 21 | 0 | 11 | 1 | 8 | 1 |
| requests | 12 | 0 | 8 | 1 | 2 | 1 |

**And it refutes this section's own optimism, which is the finding.** Run over the NINE parts the
hand-written pass actually names — the parts a person would put in a contract — **eight of nine read
`tested` and one reads `composed`.** A ladder with two rungs is not a ladder. The cause is structural
rather than a granularity mistake: re-run with each component's anchors widened from its cited files to
every tracked file under their directories, which IS what a `docs/arch/` glob carries, **every one of
the nine answers exactly the same rung**. On a 3,190-file application whose first-party import graph
has 7,957 edges and which carries 857 files with test facts, almost everything real is reached from
something that starts and imported by some test. The one that is not — `redline` — is a renderer part,
and no file carrying an `entrypoint` fact is on the main side of it.

So the rung discriminates **between code on the application's path and everything else** — which is
what the 22 `declared` parts on this repository are, being `build/pNNN`, `docs`, `resources` — and it
says almost nothing about the parts a contract names. Three consequences, all for the build:

1. **The rung is still worth computing and must still be computed**, because it is the only thing that
   refuses `accepted-live` mechanically and the only thing that can ever say `declared` about a part a
   person believes ships. But a surface that leans on it to separate nine good components will draw
   one colour.
2. **`reached` needs a seed a person can choose.** A walk from *every* entrypoint fact in a
   multi-process application answers "yes" for the whole application. Seeded per boundary — this
   binary, this service, this window — it would separate them, and that is a Phase 2 question this
   research did not answer.
3. **The rung belongs on the part, never on the claim.** §7.3's per-claim backing is what actually
   varies across nine components; the rung is what varies across thirty-five parts.

**`reached` also rests on a number that is a range, not an aggregate.** This section first justified it
with "entrypoint and test facts, whose measured precision is 91% and 96%". `entrypoint` is **49 of 54
and all five errors are in gotify, which reads 1 of 6**: a range of 17% to 100%. And
`entrypoint.composition`, the rule that would seed the walk on a Go or a Rails tree, is **3 of 8,
38%** — the third-worst rule the corpus has. So on a repository shaped like gotify the walk starts in
the wrong places, and that is a measured limit of `reached` rather than an aside.

### 7.3 Backing, drawn rather than hidden

Every model sentence's citations are graded on every deterministic pass, by the rule the prototype's
checker applies — **and the first writing of this section described a rule the checker did not
implement**, saying "a fact of the wanted shape" while `check.mts` passed `() => true` at all three of
its call sites. The shape is now asked where a shape is actually wanted, and where none is wanted the
grade is named for what it is:

- **backed** — a fact within the claim's span, **which is PROXIMITY and not shape**. A component's
  contract has no wanted shape: "keeps the session in tmux" is evidenced by a spawn, a declaration or a
  store write equally well, and a checker that demanded one of them would refuse good writing;
- **backed by a gate fact / a call site / a declaration** — the KIND is drawn, because §6.4 measured
  that they are not worth the same. A call site within three lines beats a coin by 9.6×; a declaration
  within three lines beats it by 2.46×;
- **resolves** — a real tracked line, nothing near it;
- **broken** — the row is refused whole at validation and never reaches the face.

**Every rate is drawn with its floor or it is not drawn.** Measured on a careful hand-written pass:
41/41 resolve, **24/41 backed, against a floor of 23.8%** over the same nineteen files. A surface that
drew all forty-one the same way would be claiming 100% evidence for something whose floor is a quarter.
So the chip is on the face, the component header carries `n of m backed`, and the provenance line at
the top of the view carries the whole-repository ratio **and the floor beside it**. That last clause is
the revision round's, and it is not decoration: a reader shown "24 of 41" and not shown "and 10 of 41
would happen anyway" has been given a number without its denominator, which is the thing §4.3 item 4
says this pane already refuses to do everywhere else.

**And no chip may be read as a truth mark.** §6.4 measured the checker catching 2 of 7 deliberate
lies; a component renamed *"Billing and card capture"* keeps every green chip it had. The wording on
the face and in every hover has to be *a fact was found here*, and the build spec's gate arm asserts
that no drawn string says anything stronger. **This is the single most important consequence of §6.4
for the design**, and the second most important is that it must not be over-read.

### 7.4 Where the semantic reading lives, and the pinned key set

Two stores, and the split is already this product's:

- **`docs/arch/` keeps identity and promises** — ids, anchors, layers, `description`, edges with
  `rule` and `checker`. **Unchanged. This direction does not ask for the pinned key set to be moved.**
- **`arch.db` keeps the semantic reading** — the contract fields, the region, journeys, gates, the
  per-claim citations with their grades, the computed rung, and the drift fingerprint. Derived, per
  repository, disposable, never in the person's tree. That is research 77 §5's own proposal.

Two reasons it is not in `docs/arch/`, in order of weight. **(a)** It would need about fifteen new
keys per component plus two new row types, and every key is a two-file key-set change with a gate arm
each. **(b)** A reading is DERIVED and should be re-derivable; a derived artifact in the tree goes
stale in review and invites the "just record it" habit the skill's own `record` verb had to publish a
warning against.

**The first writing had a third reason and it was wrong**, which the revision round caught by reading
it against the very next paragraph. It said prose arriving from a stranger's push would be drawn on
the person's face. That is already true of the shipped product: `component.description` is in
`ARCH_ROW_KEYS`, arrives with a `git pull` written by whoever last pushed, and is drawn at
`src/renderer/arch/ArchVerdicts.tsx:656`. **The answer to it is the ruling that already exists** —
the prose panel renders plain text and never markdown (`ArchView.tsx:36`) — and the reason the key set
gives is about what NAMES SOMETHING TORTIE RUNS, which prose does not. So stranger's prose on the face
is a solved problem rather than an argument, and it is struck.

**One exception is real and free, and it is taken with the reason above rather than against it.**
`ArchFlow` is already in the pinned key set and is read by nothing today, and it is field for field a
journey: `flow` is `{id, name, shape, steps}` and `flowStep` is
`{seq, componentId, label, note, group, evidence}`, where `evidence` is `ArchEvidence[]` — a CITATION
(`path`, `blobOid`, `lineStart`, `lineEnd`, `quote`) and never a level, so §7.2's refusal is already
enforced by the pin. **A journey may live in `docs/arch/` with no pin moved and no key added.** Its
`label` and `note` are stranger's prose exactly as `description` is, under the same plain-text rule and
the same key-set refusal, which is why the exception costs nothing new. That is worth taking: a journey
is the one semantic artifact a person might genuinely want to review in a diff and carry to a clone.

**If a later round wants the whole reading to travel with a clone, that IS a key-set move, and it is
the operator's decision.** It is named here and not taken here.

### 7.5 How it refreshes, and what drift means

**Drift is per CLAIM, never per repository.** The skill's grain is one fingerprint over everything,
which is why adding a line to `CHANGELOG.md` makes a document about the scheduler answer `update`
(§2.3, measurement 4). Tortie already has the better grain: `arch-cksum` keys per file, and a fact
carries a file, a span, a kind and a subject.

Each claim stores, for each citation, `(blob oid, fact kind, fact subject)`. On every deterministic
pass — which already runs off the one watcher subscription with a 300 ms coalesce, one run in flight
and a generation stamp:

- every cited fact present and identical → **current**;
- the file moved but the fact is still there → **current**, and the anchor is re-written, which the
  product already does;
- a cited fact is **gone** → the claim is **stale**, and it is **drawn stale** — the sentence stays,
  its chip turns, and the citation that died is named. It is never silently redrawn and never deleted;
- facts of a kind no claim cites appear under a part → the part is drawn as having something unread,
  which is "built and remaining" earned rather than asserted.

**Refusal 8 is untouched: no model turn starts on CONFIGURATION alone.** Staleness is DRAWN, and the
re-ask is either a person's gesture on the stale claim, or the shipped settled-drift path under an
agent the person has already confirmed in Settings, with the confirm gate re-checked at the spawn.

**The first writing ended this paragraph "nothing in this design lets a `git pull` start a process",
and that is false**, one sentence after endorsing the settled-drift path. `ArchPassTrigger` is
`'gesture' | 'ribbon' | 'drift'` (`src/shared/ipc/arch.ts:656`), and `maybeRepairDrift` in
`src/main/arch/enrich-coordinator.ts` hands a finished check to `drivePass` with `trigger: 'drift'`
whenever an agent is chosen, nothing is held and the drift is non-null (`repair-trigger.ts`'s three
skips). A pull that breaks a promise, in a repository where the person has already confirmed an agent,
**does** start a child. **Refusal 8 is not moved by that** — the thing refusal 8 forbids is a process
starting because a CONFIGURATION FILE said so, and this path re-reads the confirm gate at the spawn,
rides one watcher subscription, holds behind the settle window, and refuses on interval, in-flight and
same-input. But the honest sentence is the one `repair-trigger.ts` writes about itself: **a `git pull`
can start a process, and what stops a storm of pulls becoming a storm of spawns is six named refusals
in a stated order rather than the absence of a path.** Anything this design adds joins that path; it
opens no second one.

### 7.6 Who runs the turn, and what a machine with no agent gets

The turn runs exactly as the shipped enrich pass does: **one guarded one-shot child under the person's
own account**, the agent chosen in Settings, the confirm gate re-checked at the spawn, a prompt cap, a
minimum interval, suspension after failures, and a same-input-hash refusal. **One recipe is measured
today (`claude`)**; every other agent reads `not-measured` and is disabled. That is the honest limit
on the model half, and a second measured recipe is in the build spec because a Mac with codex only
gets nothing from it today.

**The agnosticism floor — what a repository with NO agent gets, and this is the answer that makes the
whole thing agnostic.** With no model, no turn, no author and no configuration, on any repository in
fourteen languages, local or on a machine:

- **a process partition rather than a directory one** — what this repository BUILDS and STARTS, from
  manifests, Dockerfile and compose services, CI jobs, workspace members and library targets. **The
  number behind that sentence has to be split, and the first writing did not split it.** The
  build-and-start rules — SwiftPM targets, compose services, Cargo workspaces and libs, spawned
  threads, workers — are **15 of 15 judged**. The other thirty of the forty-five judged boundary facts
  are one rule, `boundary.path.module-root`, which says *a language's package root is here*; it is
  **30 of 30** and five of those thirty are TEST packages. On THIS repository the split is stark:
  **75 of 80 boundary facts are `index.ts` barrel files** and the remaining five are workers, so a
  process partition drawn from boundary facts alone would draw seventy-five boxes that are not
  processes. The build must use the fifteen and keep the thirty as what they are, being a module map;
  the view is labelled for what it is: not "where code runs", which is a model claim, but "what this
  repository builds and starts", and on a repository that builds one thing it says so rather than
  inventing four;
- **every exposed surface it can see, grouped by part, with its denominator** — 229 IPC channels here,
  450 routes on mastodon, 362 handlers on stoa, 116 tables, 4 installed commands on babel — and the
  honest zeroes drawn as zeroes, because a surface that says `0 command-line flags found` on ripgrep
  is telling the truth about the reader;
- **the stores, and which parts write them**;
- **the spawns and the network reaches, named**;
- **a test signal per part** (96% precise);
- **the computed evidence rung on every part**, which needs no model at all;
- and everything the pane draws today: the sentence, the partition, the import edges, the hover facts.

That answers *what lives where* better than today, and **adds two of the five reader questions** —
what this repository exposes, and what is reached and tested — with no author. *How setup reaches a
result* and *why work proceeds or stops* stay model-only, and on a machine with no agent those two
views are **absent rather than empty**. No explanatory paragraph; the view is not there.

**That last clause is a question for him rather than a decision this research may take, and the first
writing buried it in a sub-clause.** "Absent rather than empty" means a Mac with an agent and a Mac
without draw a different set of tabs for the same repository, and Phase 158's ruling is that there is
ONE way in. The two readings of that ruling are both defensible: a view that cannot be filled is not a
fork in how the product works, it is a view with nothing to draw; or a person who sees three tabs on
one machine and five on another is being shown two products. **It is put to him plainly here, with the
alternative named**: the other answer is that the two views are always present and say, in the
just-enough-words voice, that nothing has read this repository yet and what would — which is one
sentence and a Settings link, and is exactly the shape §4.3 item 4 calls refusing to flatter. This
research does not pick between them.

### 7.7 Remote

**Identical by construction, and that is not a promise, it is where the code sits.** The fact
extraction reads through the same `ArchFileSystem` the mirror already provides, so it runs LOCALLY
over mirrored bytes and **nothing new runs on the machine** — the far side keeps exactly the fixed
`arch-read` / `arch-git` scripts it has, and the model slot stays local by rule. No surface says
remote, and the per-tab view state travels with the tab.

One limit to state rather than discover: a fact base needs the same bytes `tree-facts` already reads,
and the mirror is bounded at 20,000 files and 64 MiB with `cksum` content tokens (Phase 244). Above
that ceiling the fact base is partial, and the surface says so with the sentence Phase 244 already
wrote — *"This picture is about part of the folder."*

### 7.8 Cost, in tokens and seconds

Sized from the prototype's own output over this repository at `2e1b4799` (3,182 tracked files, 2,537
parsed, 52,875 facts, 31.6 s including the wrapper pass):

| block | lines | bytes | ≈ tokens |
| --- | --- | --- | --- |
| every non-declaration fact | 7,224 | 613,193 | ~153,000 |
| **distinct subjects only** (the shape a prompt would take) | **1,856** | **163,229** | **~40,800** |
| the largest partition part alone (`src/main`), distinct | 860 | 78,439 | ~19,600 |

**The whole-repository block does not fit the shipped 64 KB prompt cap, and neither does its largest
part.** So the ask is PER PART at a per-part fact budget — which is the shape the shipped pass already
uses, with its 40 sampled file paths per part. A fact line averages 88 bytes over that block, so at
120 lines a part it is about 10.3 KB and about 2,600 tokens, and the reading this document's own
hand-written pass produced is 15,093 bytes, about 3,800 output tokens for a whole repository.

**The only measured price in this product** is the shipped enrich pass: **23.05 s and $0.0239** for
one ask at the 64 KB cap on a 582-file run with `claude-haiku-4-5`, measured 2026-08-28. Extrapolating
by ask count and saying plainly that it is an extrapolation: a first full reading of this repository is
**8 asks ≈ 3 minutes and ≈ $0.19**, and the ordinary case — one part's claims went stale and the
person pressed "read this again" — is **one ask, ≈ 23 s and ≈ $0.024**. The deterministic half that
runs on every open costs **no token at all**, and 31.6 s once, or about 18 s without the wrapper pass
that only this repository's conventions need.

---

## 8. The three directions, and the recommendation

**A — restyle today's map.** Regions from manifests instead of directories, transports labelled with
what crosses, the computed evidence rung on each node, an inspector below the map, the surfaces list.
No model anywhere. — *Trade: it answers three of the five reader questions instead of one and a half,
and it will never say what a part is FOR.*

**B — the hybrid reading inside the pane. RECOMMENDED.** Everything in A, plus a bounded model pass
that names parts by job and writes journeys and gates, kept in `arch.db`, with per-claim citation
grading, the computed rung, and stale claims drawn stale. — *Trade: the half that reads best needs an
agent turn, and today exactly one agent is measured, so a Mac with codex only lives on A's floor until
a second recipe is measured; and the bounding is weaker than a first reading of §6.4 suggests, being
2.46× a coin on backing and 2 of 7 on deliberate lies, so B buys ATTRIBUTION and not verification.*

**C — the full as-built model in the repository.** Everything in B, plus the semantic reading in
`docs/arch/` so it travels with the clone and is reviewed in a diff. — *Trade: about fifteen new keys
per component and two new row types against research 66's pinned key set, which is the operator's
decision and not this research's.*

**Ship B, and build A as B's first phase.** Three reasons, each measured above. First, A's fact base
IS B's fact base — the same table, the same gates — so nothing is thrown away if the model half is
never turned on. Second, **the floor has to be good on its own**, because one recipe is measured and
the product is off by default: §7.6's floor adds two reader questions with no author, no turn and no
token, on any repository in fourteen languages. Third, B's model half is the only thing that can ever
answer *what is this part FOR* — §6.1's 0/108 on ripgrep is the proof that no universal rule table
reaches it — and B is the smallest shape that gets that answer bounded rather than believed.

C is not refused; it is deferred to him, and §7.4 names exactly what it would cost.

**One word in this recommendation has to carry its caveat, because he asked for it by name.** The
charter asks for something that works *"agnostically on most types of codebases"*. **The FACT BASE is
measured agnostic** — nine repositories, seven language families, 46,949 tracked files, precision and
recall published per repository, honest zeroes included — and that half is real. **Everything above the
fact base is measured on nothing.** Whether a model can produce a good REGION partition, a good job
name or a useful transport label on an unfamiliar repository is the thing nobody has measured: the
regions in the mock are the researcher's, the semantic pass is the researcher's by the charter's own
instruction, and §6.1's per-repository spread from 61% to 95% is about rules rather than about
readings. So the sentence that may be quoted out of this document is: **A is agnostic and measured; B's
floor is A; B's model half is unmeasured on any repository but this one.**

---

## 9. The mock

`build/p256/mock/mock.html`, built by `build/p256/mock/build-mock.mts`. It shows direction B's system
map with its named transports, one component inspector, one journey with its place-track, and the
gates view, in **runstory's shape** — the exemplar he named — rendered in **Tortie's own tokens**.

**How to open it.** From the repository root:

```
open build/p256/mock/mock.html
```

It `<link>`s `../../../src/renderer/styles/tokens.css` itself rather than copying a value out of it,
so it must stay where it is, and it will follow the palette the day a token moves. To rebuild it from
a fresh fact file:

```
node_modules/.bin/tsx build/p256/det/run.mts . --out /tmp/p256-facts.json
node_modules/.bin/tsx build/p256/mock/build-mock.mts /tmp/p256-facts.json
```

Handed a fact file over any other repository it refuses and writes nothing.

**Where every word in it comes from, which its own footer also says.** Every component, journey step
and gate is read verbatim out of `build/p256/semantic/tortie.pass.json`, the pass the researcher wrote
by hand — **no agent wrote it and no token was spent**. Every green chip beside a citation was
recomputed by the builder from the deterministic prototype's fact file over this repository, by the
same rule `build/p256/semantic/check.mts` applies; an amber `prose` chip means the link resolves to a
real tracked line and the deterministic half found nothing near it. The counts in the masthead are read
out of that fact file. **The evidence rung on every node is COMPUTED**, by §7.2's five rungs through
`build/p256/det/ladder.mts` over the repository's own first-party import graph. **What is the
researcher's and is not measured** — and the footer says so too — is which region a part sits in, its
three-to-five word label, and the name on each transport.

**Two things about that paragraph were false when the mock first shipped, and both are fixed in the
artefact rather than in the sentence.** The builder drew `EVIDENCE[c.evidence]`, the word the PASS
carries, with a silent `?? 'ev-composed'` for anything it did not recognise — which is the skill's
decayed vocabulary and the exact thing §7.2 forbids a model to write, reproduced in the phase's one
picture of the design. And `REGIONS`, `TRANSPORTS` and the node labels were CONSTANTS in the builder,
so handed gotify's fact file it drew these nine Tortie components, four Tortie regions and three Tortie
transports, printed `backed 0` and refused nothing. The layout now lives in the pass file where the
rest of the researcher's writing is, and the builder refuses a fact file whose repository does not track
the files the pass cites — measured: with gotify's fact file it now says *"does not track 19 of the 19
files this pass cites"* and writes nothing. **So the mock is evidence of one page over one repository,
and not evidence of agnosticism**; §8's floor is where the agnosticism claim lives and its measurement
is §6.1's nine repositories.

**What the computed rung does to the picture is a finding rather than a blemish.** Eight of the nine
nodes read the same rung, because §7.2's ladder collapses on this repository. The mock draws that
rather than hiding it behind the writer's more varied word, which is the same rule §7.3 applies to the
backing chip.

**Measured off its own DOM**, in the same scratch Electron at 1440×900 that read the three explorers:
3 tabs, 4 regions, 3 named transports, 9 nodes, **281 words above the fold** and 524 in the body,
against the explorers' 253/285/288 above the fold and 488/639/392 in the body — so it sits inside the
band the exemplar set. **Zero colour literals and zero `rgb()`/`rgba()` literals in the whole file**,
and 51 distinct tokens referenced. The resting face carries: the masthead, the three tab names, four
region labels, nine node names with a three-to-five word subtitle each, three transport labels, and
one inspector. The 34-word limit sentence is behind a `Where it stops` disclosure, which is the
just-enough-words rule applied to the exact place the explorers break it.

**The reading instrument had a bug of its own and two strings in `out-explorers.json` still carry it.**
`build/p256/explorer-app/main.js` sends its reader to the page inside a template literal, and two
`replace(/\s+/g, ' ')` calls were written with ONE backslash, so they reached the page as
`replace(/s+/g, ' ')` and stripped every letter `s`: stoa's legend read *"Implemented, not  hipped"* and
specfactory's transport read *"me age + reque t ID"*. **No number in this document came off either
field** — `words()` was always doubled — and the fix was verified by re-reading all three explorers,
which returned 488/639/392 and 253/285/288 byte for byte. It is written up here because a corrupted
string beside a correct number is exactly the shape a later reader mistrusts the wrong half of.

**What the mock does NOT draw, which §8's trade sentence should be read against.** It shows 3 views to
the explorers' 4, 6 and 5. It has **no stale claim**, which is §7.5's whole refresh device; **no
surfaces list with denominators**, which is §7.6's second floor bullet and the thing that makes
`0 command-line flags found` on ripgrep honest; no state-ownership view; and no built-and-remaining
view. So it demonstrates three of the five reader questions §4.2 measures and omits the two §7.6's
no-agent floor adds. **And its "What runs" tab recites**: 225 words, 0 buttons, 0 selects, 0
checkboxes, against runstory's computing worksheet at 3 selects and 9 checkboxes feeding a lane strip
and a ten-row table. §3.2 names that worksheet as the one device runstory has and its successors lost,
and **the mock lost it too**. A worksheet is the most derivable thing on any of these pages — which
gate facts sit under the part a person names is a query over the fact base and needs no model — so it
belongs in Phase 2's gates view, and it is written into the build spec rather than left as a
compliment paid to the exemplar.

---

## 10. The build spec

### Phase 1 — the fact base. Deterministic, no model, no new surface.

**Files.** New `src/main/arch/facts/` (reader, closed rule table, manifest rules, the one-hop wrapper
pass); `src/main/symbols/queries.ts` gains call-site, decorator and attribute captures per grammar;
`src/main/arch/tree-facts.ts` gains a second pass over the read it already does; an `arch.db`
migration adding `arch_fact` and `arch_fact_file` keyed on blob oid; `src/shared/arch.ts` gains
DERIVED types only, and **no `docs/arch/` key moves**.

**Gate arms — `conformance:facts`.** The per-language corpus table re-derived over committed fixtures;
the precision sample pinned with its judging rule; the recall scopes asserted, **229/229 against
`docs/audits/contract-baseline.txt`**, which is already a gated file, so the assertion cannot drift
away from the product; the wrapper pass's three clauses ablated one at a time (bare call, import
alias, caller-local shadow) with each turning a pinned count red; the cross-rule dedupe ablated; the
vendor filter proved on planted bytes; a scan proving the domain spawns nothing but `git` with a fixed
argv and that no repository field reaches any argv; and `conformance:watcher` re-run, because the
FSEvents exclusion budget must not move.

**Also, from the revision round.** The one-hop wrapper pass is a SETTING of the fact base and not
always-on, because §6.3 measures it at **3.15× the whole read** on this repository for a surface that
is otherwise 0.0% visible, and at 1.57× to 1.83× on the four repositories where it finds nothing at
all; the gate arm asserts the fact COUNT is unchanged on a repository with no wrappers, so a pass that
is buying nothing can be seen to be buying nothing. `boundary.path.module-root` is kept SEPARATE from
the build-and-start boundary rules in the schema, not merged into one category, because §7.6 splits
15/15 from 30/30 and a partition drawn from the union would draw 75 barrel files as processes on this
repository. `entrypoint.composition` at 38% and `store.orm` at 8% are fixed or dropped before they seed
anything.

**Refused.** No new package. No new watcher subscription. No fact that names a command reaching any
argv. No fact written into `docs/arch/`. No rule added for a grammar the corpus does not exercise
without a repository added to the corpus in the same commit — java, php, c-sharp, kotlin and objc are
all in that state today.

### Phase 2 — the computed ladder and the reading surface. Still no model.

**Files.** New `src/main/arch/evidence.ts` (the five rungs of §7.2); `src/main/arch/map.ts` gains
regions from boundary facts and labelled transports; `src/main/arch/skeleton.ts` gains the process
partition beside rule P, **and F1 is closed in this phase** — the contract and the map draw from ONE
partition or the overlay stays invisible; `src/renderer/arch/**` gains the region columns, the node
chip, the inspector below the map, and the surfaces list; the native menus change in the same commit.

**Gate arms — `conformance:evidence`.** Each rung computed over fixtures with a per-clause ablation
going red; a proof that **no code path can produce `accepted-live`**; a proof the rung is never read
from any contract field; `conformance:reading` extended to the new partition with rule P's own
ablations kept; `conformance:arch`'s key-set pin re-run unchanged; and, for every new dot or chip, the
Phase 218 floor of **3:1 on `--bg-active` at every offered frame and every contrast level**, plus
`conformance:hue` for any token that moves.

**Also, from the revision round, and Phase 2 owes three things this research learned late.** The five
rungs get the self-test `build/p256/det/ladder.mts --self-test` has, being a planted graph per rung, so
a rung that CANNOT fire is told apart from one that never did; over the corpus `off-repo` is 0
everywhere and that is the shape a gate goes blind to. **`reached` gets a SEED a boundary chooses**
rather than a walk from every entrypoint fact at once, because §7.2 measured the unseeded walk
answering `tested` for eight of nine parts on this repository and the same for the widened anchors —
this is the one Phase 2 design question this research did not answer. And **the gates view carries a
computed worksheet**, in runstory's shape: a person names a part and the view answers which gate facts
sit under it with their denominators. §3.2 measures that worksheet as the one device runstory has that
its successors lost, §9 records that the mock lost it too, and it needs no model at all — which is why
it belongs in the deterministic phase rather than in Phase 3.

**Refused.** No count badge on any node. No model call anywhere in this phase. No operator fork
between a deterministic and a semantic mode — there is one way in (Phase 158). No process partition
drawn from `boundary.path.module-root`.

### Phase 3 — the bounded semantic pass.

**Files.** `src/main/arch/enrich/compose.ts` gains the per-part FACTS block at the measured budget;
`src/main/arch/enrich/validate.ts` gains citation grading, refuses a model-written evidence level
whole, refuses an unresolvable citation whole, and keeps the digit rule; a new
`src/main/arch/semantic/` store in `arch.db` holding claims, citations, grades and the drift
fingerprint; `src/main/overview/fold/recipes.ts` gains **a second measured recipe**;
`src/renderer/arch/**` gains the journey view, the gates view, the per-claim chips and the stale
drawing; and `ArchFlow` is finally read, because a journey may live in `docs/arch/` with no pin moved.

**Gate arms — `conformance:semantic`.** The checker's three rules driven over the committed hand pass
with per-clause ablations; a model answer carrying an evidence level refused whole; a citation that
does not resolve refused whole; a stale claim proved DRAWN stale and proved never silently redrawn; a
scan proving **every spawn reachable from a watcher event passes through `repairSkipReason` and the
runner's confirm re-check** (refusal 8, asked structurally rather than by comment — and asked THAT way
because §7.5 measured that a `git pull` really can start a child and that what stops a storm is six
named refusals rather than the absence of a path); the prompt cap asserted at its measured byte size;
and the second recipe's measurement recorded the way the first one was, or it stays `not-measured` and
disabled.

**Four arms are the revision round's, and each exists because a claim this document made had no
instrument.** THE PLANTED BATTERY: `plant.mts`'s seven shapes run against the shipping validator, with
the number CAUGHT asserted rather than assumed, because a battery whose score is never written down
drifts into being described as a refusal of lies; it is 2 of 7 today and a build that does not move it
must say so on the face. THE FLOOR: every backing rate the product computes is computed beside the
share `null-model.mts` measures over the same files, and a rate is never stored or drawn without it.
THE KIND: the chip records WHICH category of fact backs a claim, and the gate asserts a call-site
backing and a declaration backing are never drawn identically, because §6.4 measured them at 9.6× and
2.46× over chance. THE DIGIT RULE: `validate.ts`'s invented-number check asks for a TOKEN in the FACTS
block rather than a substring anywhere, proved on the three planted numbers where the substring form
catches one of three.

**Refused, across all three phases.** The skill is never executed by Tortie and nothing here requires
it. No third-party JavaScript, no page rendered from someone else's HTML, no marketplace, and the CSP
does not move. No command, argv, binary or host appears in any stored record or on any face — which is
where runstory's step sheets printing `runstory init --account <uuid> --bypass <secret>` would land a
port, in a pane one keystroke from a terminal. No `accepted-live`. No second writer of
`baseline.json`. No automatic turn on a file change. No key-set move in `docs/arch/` without his word.

---

## 11. What this research did NOT establish

1. **Five grammars are unmeasured, not four** — java, php, c-sharp and kotlin were exercised by no
   repository in the corpus, and objc produced 3 facts from one file with 0 of the 341 hand judgments
   on it, so every rule naming only those five is written and untested.
2. **No agent was measured writing a semantic pass.** The pass is the researcher's, by the charter's
   own instruction, so the 58.5% AND the 2 of 7 are both measurements of a careful human writer. A
   model's numbers are unknown in both directions, and `plant.mts` is the instrument that would find
   out; running it over a real answer needs a turn of his, which the charter refused.
3. **The cost figures in §7.8 are an extrapolation** from one shipped measurement of a different pass,
   not a measurement of this design.
4. **The mirror ceiling was not driven remotely.** §7.7's limit is read from Phase 244's numbers, not
   re-measured over a machine.
5. **`store.orm` at 8% and `effect.net.client` at 48% were not repaired**, only measured; a build must
   fix or drop them rather than ship them at that precision.
6. **The regions in the mock are the researcher's**, and whether a model can produce a good region
   partition on an unfamiliar repository is exactly the thing nobody has measured. The mock is
   evidence of one page over one repository: the builder now refuses a fact file about anything else,
   which makes that limit visible rather than removing it.
7. **The two explorers under the narrow lift were read as two HTML files.** Their repositories stay
   closed, and nothing about how those systems actually behave was verified.
8. **The computed ladder discriminates almost nothing on the parts a contract names.** §7.2's five
   rungs are computed now, over four repositories, and on the nine parts of this repository's own hand
   pass eight of nine read `tested` — with the anchors widened to directory globs as well. The seeded
   `reached` that would fix it is designed in §7.2 and measured nowhere.
9. **The checker is not a refusal of lies and this document does not claim it is.** It catches 2 of 7
   planted shapes. The five it misses are the five a confident wrong reading actually looks like: a
   false job on true citations, an invented part citing real files, an unrelated test, a reversed
   journey and an invented gate whose cited line really is a gate. Nothing measured here bounds a
   model's PROSE, only its citations.
10. **The `reached` rung's seeds are 17% precise on one of the nine repositories.** gotify reads 1 of 6
    on `entrypoint` and `entrypoint.composition` is 3 of 8 over the corpus, so a Go or a Rails tree
    starts the walk in the wrong places and the rung is wrong for a reason nothing on the face would
    say.
11. **The revision round measured what it could reach and re-ran what it could re-run.** What it did
    NOT do: re-judge the 341 hand precision rows independently — one moved, on the reviewer's reading,
    and the other 340 keep the first judgment; drive the mirror ceiling over a real machine; or run the
    corpus again on a quiet machine, so the timings in §6.1 are the first run's and §6.3's re-derived
    ratios come from a busier one.
