# Phase 256, question 1 — the skill, taken apart

Notes for `docs/research/118-phase-256-the-architecture-that-explains-itself.md`. Everything below was
read at `/Users/gdc/as-built-architecture` (read only, never written, `git log` head `aa0428d`) and
measured by RUNNING the helpers over scratch copies. Line numbers are of the files as they stand at
that head.

## 0. Instruments, and what was not touched

| Instrument | What it is |
| --- | --- |
| `build/p256/skill-probe.sh` | Written for this phase. Builds seven fixture repositories itself under `mktemp -d`, removes them in a `trap` (this shell's `finally`), runs the two shipped helpers over them and prints what they answer. Writes nothing under `/Users/gdc`. |
| Scratch copy `…/p256-skill/gmux` | This worktree at `0ebcf9df550b5501e052c9a6d4546bcfe63d29cc`. `inspect` reads `head` `0ebcf9d…`, 3,141 source files; the live worktree lists 3,145 tracked + 0 untracked and the helper excludes 4, so the copy is faithful by arithmetic. |
| Scratch copy `…/p256-skill/stoa` | `/Users/gdc/stoa` at `dc9423428f778a79039f154cfe50926e0e1d19cf`. Live: 4,593 tracked + 106 untracked = 4,699; helper excludes 1,415 `.specstory` + 12 artifacts + 1 state = 3,271 inspected, which is exactly what it reports. `AS-BUILT-ARCHITECTURE.html` sha256 is `23f414507b0cc3e3…` in the copy AND at `/Users/gdc/stoa`, byte identical. |
| `…/p256-skill/skill-copy` | A copy of the skill. `diff -rq` against the original differs only by `.git`. Its own test suite was run there, never in his tree. |

Python 3.14.4, git 2.50.1 (Apple Git-155), macOS. No agent CLI was launched, no token spent, no Tortie
session started, no Electron. `/Users/gdc/specfactory` and `/Users/gdc/runstory` were not read, listed
or opened. Nothing was written into `/Users/gdc/stoa` or `/Users/gdc/as-built-architecture`.

## 1. The thesis under test

`SKILL.md:16`, the skill's own two sentences:

> The helper code discovers, fingerprints, compares and validates. The agent interprets the source,
> names components and writes explanations. A hash match establishes unchanged bytes, not
> architectural truth or live acceptance.

That is true as written, and it is much narrower than it sounds. **Measured: the helper never reads a
byte of source for any purpose but hashing it.** Every content read in `scripts/architecture.py` is at
lines 160/163 (`stream.read` into `hasher.update`), 227 (`json.loads` of its OWN state file) and
430/441 (its own state file again, to avoid a lost update). Nothing else opens a source file. So
"discovers" means *lists paths*, and "validates" means *validates its own JSON and an HTML document's
structure* — never a claim, never a language, never a call site.

Word counts over both scripts (2,448 lines of skill in total, 1,050 of them the two helpers):

| Word | Occurrences in `architecture.py` + `check_explorer.py` |
| --- | --- |
| `journey` | 0 |
| `gate` | 0 |
| `contract` | 0 |
| `entrypoint` | 0 |
| `handler` | 0 |
| `symbol` | 0 |
| `language` | 0 |
| `component` | 1 (a fixture string) |
| `evidence` | 5 (all in prose fields the helper prints, e.g. `"Content facts do not establish architecture semantics"`) |
| `route` | 21 (all URL routes in the HTML checker) |
| `parse` | 48 (all HTML/CSS/JSON parsing in the checker) |

**Every noun the skill's product is made of — component, contract, journey, gate, evidence level — is
absent from its code.** They exist only in `SKILL.md` prose and in whatever the agent chooses to write.

## 2. Every deterministic duty, and its ceiling

`scripts/architecture.py`, 540 lines, standard library only, four subcommands (`parser()`, 494-508).

| Duty | Where | What it establishes | What it cannot establish |
| --- | --- | --- | --- |
| Find the worktree | `repository()` 60-65 | The repo root via `git rev-parse --show-toplevel` | Anything about a directory that is not a git worktree. Measured: `inspect` over a plain directory holding `src/a.py` exits **2** with `"Git inventory failed"`. A non-git project is not merely unsupported, it is refused. |
| Inventory | `inventory()` 73-75 | The path list from `git ls-files --cached --others --exclude-standard` | Ignored files (never inventoried), submodule contents (`index_inventory()` 78-89 marks `160000` entries and `snapshot()` 300-301 excludes them with reason `git_submodule_not_inspected`) |
| Per-file fact | `fact()` 134-176 | `{path, kind, sha256, bytes, executable}`. Opened `O_RDONLY|O_NOFOLLOW|O_NONBLOCK` (150), `fstat` compared before and after the read (155, 169) so a file that moved under the reader raises rather than lying | What is IN the file. The digest is the only thing derived from content. A symlink is hashed as its LINK TEXT (144-147), targets never followed — stoa's `AGENT.md -> CLAUDE.md` is the one symlink in 3,271 files and is recorded as `kind: symlink` |
| Source fingerprint | `source_fingerprint()` 47-48 over `canonical()` 39-40 | One sha256 over the sorted JSON of every file fact. Mode change alone moves it (their test, `test_executable_source_mode_is_part_of_fingerprint`); mtime alone does not (`test_mtime_only_change_is_not_drift`) | WHICH claim any changed file affects. It is one number for the whole repository — see §6 |
| Scope report | `snapshot()` 319-332 | The exclusion list, the heuristic directory names, submodules, and three printed limitations | That the exclusions were right for this repository; the report says so itself (329-331) |
| Consistency | `snapshot()` 310-312, 333-335 | HEAD, the file list, tracked paths and submodules are re-read after the walk and a change raises | Atomicity. `"atomic": false` is printed on every run |
| Plan | `plan()` 356-399 | One of `create` / `reconcile` / `update` / `noop` per requested format, with reasons | Any instruction. `SKILL.md:83`: *"Use the helper's plan as evidence, not permission to overwrite. It never rewrites architecture documents."* Measured: `plan` exits **0** in every non-error case |
| Ambiguity | `plan()` 370-371 | Refuses two candidates for one format, naming them | — |
| Record | `record()` 402-449 | Freezes source fingerprint + artifact digests into `.as-built-architecture.json`, atomically (`mkstemp` → `fsync` → re-read → `os.replace`, 433-443), idempotent (`changed` 431), refusing a baseline whose source fingerprint moved (419-420) and refusing `--summary` output as a baseline (407-408) | Anything about the document's content. The command's own answer carries `"semantic_verification": "Not performed; recording freezes content evidence only."` (449) |
| Check | `check()` 452-469 | Exact added/changed/deleted path sets for source, managed artifacts and observed references; exit **1** on any drift, exit **1** with `status: unmanaged` when there is no record | Whether the document was ever true |
| Refusals around paths | `relative_path()` 92-113, `assert_no_symlinks()` 116-126 | An artifact path must stay inside the repo, outside `.git`, end `.md`/`.html`, not be the state file, and have no symlink in any component | — |
| State hygiene | `read_state()` 232-265, `validate_fact()` 196-222 | A malformed, unknown-schema or unknown-field record is REFUSED rather than overwritten, artifact and reference sets must be sorted and disjoint | — |

`scripts/check_explorer.py`, 510 lines, parses HTML with `html.parser`, CSS with a hand lexer
(`css_urls()` 86-148) and JSON strictly (`strict_json()` 31-43, duplicate keys and `NaN` refused).
Its ENTIRE enforcement surface is 17 finding codes, extracted from the source:

`duplicate-id`, `invalid-architecture-json`, `invalid-asset-url`, `invalid-source-entry`,
`invalid-sources`, `invalid-tab-panel`, `invalid-url`, `javascript-link`, `missing-fragment`,
`missing-local-asset`, `missing-local-target`, `missing-panel-label`, `non-inline-asset`,
`panel-missing-label`, `tab-missing-controls`, `unreadable-fragment-target`, `unsupported-base`.

and 7 notes, which are the places it states what it did NOT check: `application-hash-unchecked`,
`asset-contents-unchecked`, `browser-export-scope`, `declared-application-route`,
`javascript-not-executed`, `non-html-fragment-unchecked`, `remote-file-unchecked`.

Read that list as a sentence: **the checker enforces that the page is a well-formed, self-contained,
keyboard-navigable offline document whose links point at files that exist.** Nothing in it is about
architecture.

## 3. Every interpretive duty, and the instruction that bounds it

Each of these is a paragraph of `SKILL.md` with no checker behind it.

| Interpretive duty | Instruction | Bound |
| --- | --- | --- |
| Decide where components split | `SKILL.md:67` *"Give components stable IDs based on their jobs. Split at execution or authority boundaries, not every directory."* | Prose only |
| Write the contract | `SKILL.md:67` *"Each needs a job statement, concrete input/output, work performed, execution owner, state, current limit and source evidence."* | Prose only. Measured in the only shipped artifact: **none of these seven fields is machine-readable** (§5) |
| Trace from composition | `SKILL.md:38-47` — start from executable composition, follow an action through execution/result/return, name what crosses each boundary, which store owns intent vs evidence, what serializes work, what proves success | Prose only |
| Assign an evidence level | `SKILL.md:49-57`, five rungs | Prose only; the ladder is quoted in §5 |
| Refuse easy conflations | `SKILL.md:61` — production vs controlled-proof, network access vs application identity, accepted vs answered, refresh vs restart, mirror vs restore; *"Do not invent a shared approval step merely because several state machines contain gates."* | Prose only, and this is the single most product-specific instruction in the skill |
| Build journeys | `SKILL.md:69` *"Build journeys around real tasks … Show meaningful branches and current stops in the diagram itself. A conditional future step stays conditional."* | Prose only |
| Gates, as a worksheet | `references/html-explorer.md:17` *"A decision worksheet explains existing rules. Say it neither invokes the product nor inspects live state. Name earlier gates that are assumed to pass. Derive cases from code branches rather than a speculative simulation."* | Prose only |
| Do not import an exemplar's facts | `SKILL.md:69` *"never import a check classifier from an exemplar without finding it in the target source"*; `references/html-explorer.md:21` *"without copying another product's facts"*; `AGENTS.md:14` | Prose only, and it is aimed at exactly the failure a reuse-the-last-explorer workflow produces |
| Attribute old numbers | `SKILL.md:59` *"Attribute old test totals to their checkpoint. A documentation review is not a fresh full test run, and a passing suite is not deployment evidence."* | Prose only |
| Verify before recording | `SKILL.md:87-91`, `references/refresh.md:79` *"Recording artifact hashes is not evidence the agent checked their claims … Do not use `record` to silence a stale-output warning."* | Prose only — and measurably unenforced (§7, fixture 1) |
| Browser-exercise the result | `references/html-explorer.md:80-92`, eight control families | Prose only; the checker's own note `javascript-not-executed` marks the gap |
| Preserve human edits on refresh | `references/refresh.md:30-52` table | Prose only. The helper's contribution is that an edit is VISIBLE (`artifact_drift` / `reference_drift`); what happens next is judgment |

## 4. The models: contract, journeys, gates, ladder

**The evidence ladder** (`SKILL.md:51-57`), verbatim:

| Level | What can be claimed |
| --- | --- |
| Implemented library | Behavior exists, but a product entrypoint may not call it |
| Composed source | An entrypoint connects it, possibly behind a runtime gate |
| Component-tested | A named test or measurement establishes a limited property |
| Accepted live behavior | Dated evidence establishes actual operation |
| In progress or planned | Candidate work or intent with a missing connection |

**The journey model** is one sentence (`SKILL.md:69`) plus the explorer's walkthrough view
(`references/html-explorer.md:8`: *"Choose a journey and move through its steps"*) and its URL grammar
(`#journey/install/3`, line 47). There is no schema, no step type, no branch type.

**The gates model** is the "What runs" view (`references/html-explorer.md:9`) plus the worksheet rule
above plus `#gates/delivery/uncertain` as a URL shape. `uncertain` and refusal are named as required
CASES (line 85), which is the only place the model says a gate has more than two outcomes.

**The five views** the explorer is offered (not mandated — line 3 says *"These patterns are not a
mandatory page count"*): System map, Walkthrough, What runs, State and recovery, Built and remaining,
each with the reader's question it answers.

## 5. What survives into machine-readable form: three fields

`references/html-explorer.md:23-39` offers an OPTIONAL `<script type="application/json"
id="architecture-data">` block whose example carries `id`, `name`, `sources`. It is the only structured
data the checker will read, and it reads exactly one key name: `source_links()` (`check_explorer.py`
387-404) walks the JSON and yields links only from a key spelled `sources`.

Measured on the one shipped artifact, `/Users/gdc/stoa/AS-BUILT-ARCHITECTURE.html` (86,548 bytes,
2026-09-09), read out of the scratch copy:

- the block exists, top-level keys `{components, inspected, revision}`, `revision: "dc942342"`,
  `inspected: "2026-09-09"`
- **21 components, and the union of every key over all 21 is exactly `{id, name, sources}`**
- 41 source paths in total, about two per component
- the job statement, the input/output, the execution owner, the state, the limit and the evidence
  level are all HTML PROSE. Not one of the seven contract fields is in the data block.

The evidence level is in the markup twice: a colour dot in the nav list
(`<span class="nev ev-composed" aria-hidden="true">`) and a text badge in the detail panel
(`<span class="ev ev-composed">Composed in source</span>`). Counted over the 21 components: 14
`ev-composed`, 3 `ev-library` ("Implemented, not shipped"), 3 `ev-tested` ("Component-tested"), 1
`ev-offrepo`. **The agent renamed three rungs, dropped two ("Accepted live behaviour" and "In progress
or planned" appear zero times) and invented a fifth of its own, `offrepo`, drawn in the error colour.**
That is what an advisory ladder does in practice, and it is the strongest single argument for putting a
ladder in a schema rather than in a paragraph if Tortie adopts one.

## 6. The drift record, `.as-built-architecture.json`

Written only by `record()`; it is the only file either helper ever writes. Schema (`SCHEMA_VERSION = 1`,
`GENERATOR = "as-built-architecture"`), measured off a fixture record:

- top-level keys: `{schema_version, generator, source, artifacts, references}` — `read_state()` 241-242
  refuses any other key set rather than merging
- `source`: `{fingerprint, files[]}`, each file `{path, kind, sha256, bytes, executable}`
- `artifacts[]`: the documents this record OWNS, each `{path, kind, sha256, bytes, format}`
- `references[]`: architecture-shaped documents it observed but does NOT own, same shape, disjoint from
  artifacts (263)
- **no component, journey, gate, claim or evidence key appears anywhere in it** (asserted by the probe)

Stoa's real record is 811,249 bytes for 3,271 files, ≈248 bytes a file, and it names 2 artifacts and 10
references (the ten per-subsystem `AS-BUILT-ARCHITECTURE.md` files under `stoa-cli/`, `stoa-web/`,
`stoa-desktop-*`; `check` lists them as `unmanaged_artifacts`).

**What a hash match proves:** the bytes of every inspected file, and of the recorded documents, are the
ones that were on disk when `record` ran; and `record` refused to run at all unless the source
fingerprint equalled the saved baseline's (419-420).

**What it does not prove**, each measured rather than reasoned:

1. *That any sentence in the document is true.* Fixture 1 of the probe: a repository holding one
   three-line `app.py`, and a document claiming "The scheduler retries failed jobs three times with
   exponential backoff and writes receipts to Postgres. Accepted live behaviour, 2026-09-10", with an
   `architecture-data` block claiming `evidence: "accepted-live"`. `record` → `status: recorded`.
   `check` → **exit 0, `status: current`**, all three drift sets empty. `check_explorer` → **exit 0,
   `status: ok`, 0 findings**, because `app.py` exists.
2. *That the agent reviewed the source before writing.* Nothing orders the steps. In that same fixture
   the document was written FIRST and the baseline taken afterwards; `record` accepted it.
3. *That a cited path is the right path, or a file at all.* Fixture 3: five components whose `sources`
   are a DIRECTORY (`src`), a path with a bogus line anchor (`src/a.py#L4200`), an object with
   `line: 9999` and `symbol: "nonexistent"`, a set of keys spelled `evidence_files` / `files` /
   `source` / `proof` naming files that do not exist, and an unrelated `CHANGELOG.md`. Answer:
   **exit 0, status ok, 0 findings, 4 source links checked** — the misspelled keys were not looked at
   at all, and every other shape passed.
4. *That the drift it reports is about the claim.* Fixture 5: record, then add one line to
   `CHANGELOG.md`. `check` exits 1 with `source_drift.changed == ["CHANGELOG.md"]` and `plan` answers
   `update` for a document that never mentioned the changelog. The fingerprint is repository-wide;
   there is no mapping from a changed file to an affected component, because the record holds no
   component.
5. *That a "current" document has no dangling evidence.* **On his own stoa artifact**: `check` says
   `status: current` with all three drift sets empty, while `check_explorer` over the same bytes says
   `status: findings` with two `missing-local-target`s, both
   `stoa-web/livekit-teammate-agent/livekit.staging.toml` — one from a static `<a href>` at line 341 and
   one from the `architecture-data` `sources` at line 529. The record is satisfied and a cited file is
   gone. That is the skill's own sentence, demonstrated on real data.
6. *That anything will run the checker.* `grep check_explorer scripts/architecture.py` → **0**. The two
   helpers do not know about each other; `SKILL.md:88` asks the agent to run the checker.

## 7. Where honesty is ENFORCED by code, and where it is only REQUESTED

This is the finding the brief asked for, so it gets its own table. "Enforced" means a shipped helper
exits non-zero or refuses.

| Honesty property the skill asserts | Enforced by code? |
| --- | --- |
| The inputs are exactly these bytes | **Enforced.** `source_fingerprint`, and `record` refuses a moved baseline |
| A document's bytes are the recorded ones | **Enforced.** `artifact_drift`, exit 1 |
| A human's edit to a recorded document is visible | **Enforced.** `artifact_drift.changed`; their test proves the edit is never overwritten by the helper |
| A neighbouring architecture document is watched without being owned | **Enforced.** `references` / `reference_drift`, disjointness at 263 |
| An unmanaged repository says so | **Enforced.** `check` exits 1 with `status: unmanaged` |
| Ambiguity is surfaced, not guessed | **Enforced.** `plan` exits 2 naming the candidates |
| A malformed record is never silently reinterpreted | **Enforced.** `read_state` refuses unknown schema or field set |
| No file content ever reaches the output | **Enforced.** Only digests are printed; their test plants `SUPER_SECRET_TOKEN` and asserts it never appears |
| The inspection does not mutate the repository | **Enforced.** `GIT_OPTIONAL_LOCKS=0`, `core.fsmonitor=false` (53), `O_NOFOLLOW`; their tests assert the git index bytes and mtime are unchanged and that a `core.fsmonitor` hook is never executed |
| The document is a self-contained offline file | **Enforced.** `non-inline-asset` |
| Every link in it resolves to a file that exists | **Enforced**, for static `href`s and for the `sources` key only |
| No `javascript:` link, no `<base>` rewriting resolution | **Enforced** |
| Tabs, panels, labels and unique ids are real | **Enforced** |
| **Each component has a job, input/output, owner, state and limit** | **Requested only** (`SKILL.md:67`) |
| **The cited source actually supports the claim** | **Requested only.** The helper never reads the file; the checker only asks whether a path exists |
| **The evidence level is justified by a call site or a named test** | **Requested only** (`SKILL.md:49-59`). Nothing reads a test name, and the levels are not in the data |
| **A diagram does not imply an implemented library runs in production** | **Requested only** (`references/html-explorer.md:13`) |
| **Claims were rechecked against call sites before recording** | **Requested only** (`SKILL.md:87`); fixture 1 shows `record` accepting a fabrication |
| **The browser controls were exercised** | **Requested only**; the checker prints `javascript-not-executed` and, when handed `--rendered-links`, checks a list the AGENT supplies |
| **Old test totals are attributed to their checkpoint** | **Requested only** |
| **A refresh preserves human edits rather than re-rendering** | **Requested only**; drift makes the edit visible, judgment does the rest |

Two more code-level honesty details worth carrying into the design, because they are cheap and good:

- the checker distinguishes a FINDING from a NOTE, and the notes are a published list of what it cannot
  see. A tool that names its own blind spots in its output is doing something Tortie's Architecture
  reading rule S does not yet do.
- `--rendered-links` and `--route-fragment` let the agent WIDEN what is checked, never narrow it; a
  declared route is recorded in the output as `declared_route_fragments` and noted as
  "route behaviour was not checked".

## 8. What is language- or repository-specific, and what is not

**Not specific at all** (this is most of it): the whole of `architecture.py` is path-and-byte work. It
would behave identically on a Rust, Swift, Ruby or COBOL repository, because it never looks inside a
file. That is why it works "agnostically" — it has nothing to be wrong about, and equally nothing to
say.

**Specific, and it matters:**

1. **Git is mandatory.** `repository()` 60-65. A non-git directory exits 2. Tortie opens projects that
   need not be git repositories at all.
2. **`EXCLUDED_DIRECTORIES` (23-29) is an ecosystem list of 28 names** — node (`node_modules`,
   `bower_components`, `.next`, `.nuxt`, `.output`, `.turbo`, `dist`), python (`.venv`, `venv`,
   `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.tox`, `.nox`, `htmlcov`), rust/java
   (`target`), go/php (`vendor`), generic (`build`, `.build`, `tmp`, `temp`, `coverage`, `.coverage`,
   `.cache`), agent history (`.specstory`, `.runstory`). A repository whose real source lives under one
   of those names and is untracked is silently dropped; the scope report calls its own exclusions
   "heuristic" (329).
3. **Tracked beats the heuristic** (`exclusion()` 268-275 takes a `tracked` flag; only `.git`,
   `.specstory`, `.runstory`, `.tmp` are unconditional). Measured on this repository: 442 of the 3,141
   inspected files are under `build/`, 12.1 MB, retained BECAUSE they are tracked. The same directory in
   an untracked tree would vanish. The rule is defensible and it makes the inventory depend on git state
   rather than on the tree.
4. **Agent history is excluded by name.** 1,415 of stoa's 4,699 paths — 30% of the repository — are
   `.specstory` and never inspected. For Tortie this cuts both ways: it is the right default, and the
   history is also the only record of WHY a component exists.
5. **The artifact name is a fixed regex**, `^as-buil[dt]-architecture\.(md|html)$` case-insensitive (31),
   typo tolerance for `AS-BUILD-` included.
6. **Submodules are reported and not inspected**, so a monorepo assembled from submodules yields an
   architecture of its outer shell.
7. **The document is bound to the filesystem**: `check_explorer`'s `target()` (294-324) resolves a
   relative link from the HTML FILE's directory. Fixture 4: an explorer at `docs/` linking `app.py`
   gets `missing-local-target`; `../app.py` resolves. A repository-root convention would be wrong here,
   and `--site-root` exists for the root-relative case.

**What "agnostic" costs, measured as corpus shape.** On this repository the helper hands the agent
3,141 files and 113,995,650 bytes to read, of which `src/` is 2,228 files / 24.4 MB, `docs/` is 405
files / 62.5 MB (55% of the bytes, including 120 PNGs hashed as "source"), `build/` 442 / 12.1 MB and
`resources/` 16 / 13.2 MB. Stoa is 3,271 files / 43.3 MB. The deterministic half does nothing to rank,
partition or narrow that; choosing what to read is the model's first and largest interpretive act, and
it is unmeasured by anything.

## 9. Cost and determinism, measured

| Reading | Number |
| --- | --- |
| `inspect` over the gmux copy (3,141 files, 114 MB) | `real 0.75 s`, `0.85 s` on a second run (user 0.33, sys 0.24) |
| `inspect` over the stoa copy (3,271 files, 43 MB) | `real 3.33 s`, `3.39 s` on a re-run |
| Determinism | Three full `inspect` runs over the gmux copy are byte identical, md5 `d672ab3dd6303925d76bcd7169a0f352` |
| `check_explorer` over stoa's 86,548-byte explorer | 1,228 static elements, 104 ids, 57 static links, 41 structured source links, 53 local targets checked, 0 asset references, 1 inline script not executed, 2 findings |
| The skill's own tests | 50 tests (31 + 19), `OK` in 13.4 s, run from the scratch copy with `TMPDIR` inside it |
| Exit codes | 0 success, 1 drift/findings, 2 invalid input or error; `plan` never exits 1 |

The stoa run is 4.5× slower on 38% of the bytes because the cost is per file and per `git` call, not per
byte — relevant if Tortie ever fingerprints on a keystroke rather than on a request.

## 10. What Tortie could take, and what it must not (feeding questions 5 and 7)

Takeable, and cheap, because it is all path-and-byte work Tortie already does in `src/main/arch`:

- the four-verb vocabulary `create` / `reconcile` / `update` / `noop`, which is a better answer than
  "stale" because it distinguishes *the inputs moved* from *a person edited the output*
- separating OWNED artifacts from OBSERVED references, so a hand-written document is watched without
  being claimed
- the refusal to overwrite an unknown schema, and the atomic `mkstemp`→`fsync`→re-read→`os.replace`
  write, which is `writeDurable`'s shape already
- the notes-beside-findings habit: publishing what was NOT checked in the same answer as what was
- the offline-single-file discipline, which matches the main renderer's CSP refusal exactly

Not takeable as-is:

- **the record is the wrong grain.** One fingerprint for a whole repository cannot tell a person which
  sentence went stale; it can only say "something moved". Tortie already keys reading facts per file
  (`arch-cksum`), so a per-claim binding is available here and is not available to the skill.
- **`sources` existence is not evidence.** Fixture 3 shows a directory, a bogus line anchor and an
  unrelated file all passing. If Tortie's non-deterministic half is to be bounded by its deterministic
  half, the binding has to be to something the deterministic half actually FOUND — a parsed export, a
  call site, a test name — not to a path that happens to exist.
- **the ladder must be data, not prose**, or it decays in one writing: 21 components, three rungs
  renamed, two dropped, one invented.
- **and none of it may be executed by Tortie**, which is refusal 1 and is not reopened here. What
  transfers is the DIVISION OF LABOUR and four or five of its mechanisms, re-implemented in Tortie's
  own code; the skill itself stays a thing the operator runs by hand in a session, if he wants it.
