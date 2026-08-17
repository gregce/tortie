# Research 49. The Arch view, a map of the project the code can prove

**Status.** Research only, requested by the operator on 2026-08-15. It schedules nothing and
changes no phase. The single deliverable is this document. The operator decides what, if
anything, becomes a phase.

**Method.** The workflow ran three grounding agents over the local tree, the charter and the
operator's own AS-BUILT document corpus. It then ran twelve research bands, each in two passes,
being a sweep and a deep read that verified the sweep's claims against primary sources on
2026-08-15 and 2026-08-16. Four complete competing designs were written, one per premise. Each
design was attacked by three independent adversaries, one for charter and Zen compliance, one
for correctness and scale, and one for month-three survival. Three independent judges then
ranked the four designs. All three judges chose the same winner. This document is the synthesis
of all of that. Where the judges disagreed, the disagreement is stated rather than averaged
away. One method limit applies to everything below and is repeated in section 12. The web
search budget was exhausted before the bands ran, so every web fact came from a direct fetch of
a named page, a registry record or a repository API, and no band could sweep for candidates
nobody already knew to name.

---

## 1. The answer

**Build it, in the contract shape, in the inverted order, and do not build the wall.** The Arch
feature should be a set of architectural promises tracked as plain JSON files in the user's
repository, written by the user or by an agent the user launches, checked deterministically by
Tortie's own compiled code on every change, and surfaced first where the operator already
looks, which is the pre-commit conformance gate and the SCM view. A fifth sidebar view ships as
the browsing and repair surface. The drawn canvas ships last, opens as an editor tab, is
generated on demand, and is gated on an observed usage number rather than promised. All three
judges independently chose this design, called The Standing Contract, over the three
alternatives, and all three demanded the same inversion, which is that the gate is the main
product and the picture is a secondary output of it.

What it costs. The first slice ships with zero new npm packages and Tortie spends zero tokens
on it forever. The deterministic check costs about 0.5 s per change burst on a repository this
size, built from parts measured this week, being a 45 ms import scan over 905 files, about
200 ms of read-only git, and under 1 ms per evidence claim. The 905 figure, used with this
measurement everywhere in this document, is the count of files the measured scan actually
parsed on the tree as it stood at measurement time, with the scan's own admission rules. It is
not a raw file listing. A bare `git ls-files` over `src` returned 943 `.ts` and `.tsx` files
when this document was finalized, on a tree carrying Phase 41's uncommitted work, so the two
counts differ in filter and in date and neither corrects the other. The optional narration step, where
the user's own agent writes the prose, is priced at the user's own key, modelled at $4.59 on
Claude Haiku 4.5, $11.95 on Claude Sonnet 5, $29.88 on Claude Opus 5, and $0 on the Gemini CLI
free tier. Those prices were verified on the live pricing pages on 2026-08-16 and the token
counts behind them are modelled, not measured. The canvas slice, when it is earned, adds two
MIT packages, `@xyflow/react` 12.11.3 and `@dagrejs/dagre` 3.1.1, both verified alive and both
verified free of eval, wasm and native code, so the pinned CSP does not change.

What is refused. Three parts of the operator's north star are not delivered by this design and
cannot be delivered under the current charter. Tortie never calls a model, so the app is never
the LLM. There is no shared wall, no collaborators on other machines and no voice input,
because each needs a cloud component or an entitlement the charter refuses and research 48
already killed twice. The single-operator, single-machine case is the whole scope. Section 12
carries the full accounting of what this design does not do.

---

## 2. What the operator asked for

The north star, quoted in full from what he sent.

> What I most acutely lack when working on big LLM-built projects is a macro-scale overview.
> Here is my pie-in-the-sky setup:
> - A giant wall, blackboard (E Ink?) preferably, that is a digital, infinitely zoomable canvas
> - All the major components of the projects are visible (Mermaid-style, boxes-and-arrows
>   diagrams), connections, dataflows, etc.
> - You would just stand in front of it and point and riff: What is happening over in this
>   piece? Where is that data coming from? Which API?
> - You could have the interface rendered as well, and talk through the design: Make these
>   headers bigger, let us use sans serif fonts here, can we do a more playful animation moving
>   between these sections?
> - But most importantly, you could have collaborators stand there with you and talk through it
>   all, pointing, riffing, all the while Claude or whatever listens, responds, implements
>
> This kind of interface, combined with thousands or tens of thousands of tokens per second
> response times, is a tool I look forward to using.

His own framing of the ask was narrower. A new first-class view called Arch, beside the file
explorer, search, SCM and Context views. It maps the project architecture, built with LLMs,
into a visual interface you can explore. Its state must be more abstracted than a file tree but
not so deep that a person cannot reason about it. It should be like a canvas. It could be kept
up to date in a separate shadow git repository if that helps, augmented by an LLM, so that
named parts are easy to inspect. He said the Zen may need to be upgraded for this, because he
considers the feature important.

The plain reading of what he actually needs, underneath the picture he drew, is four things.

| Need | Evidence it is real | What delivers it |
|---|---|---|
| A macro overview of projects mostly written by agents, at a level a person can hold | He has hand-written 30 AS-BUILT-ARCHITECTURE.md documents totalling 52,719 lines, and built a detector in his own mining engine for "Produce/refresh an AS-BUILT map" | The contract's levels 0 and 1, budgeted at 5 to 9 boxes, the number his own 30 documents converged on |
| The boundary between what the repository contains and what it leans on | He asked for it by name. 10 of his 30 documents carry it as a dedicated section and the rest scatter it | The nine-category provenance taxonomy as a first-class field on every node, section 9.4 |
| Point at a part and hand exactly that scope to an agent | His own words, "point and riff", and the sentence he called most important | The selection-to-session handoff verb, grafted from the fourth design, section 4.9 |
| A map that cannot go quietly stale | 8 of his 30 documents are more than 250 commits behind their repositories, one is 583 behind, and 16 carry no date at all | Freshness computed from git rather than self-reported, and a checker that names the exact line where a promise broke |

Two of his suggestions were tested against evidence and reversed. The shadow git repository
loses to a tracked file in the same repository, because the freshness arithmetic only works
when the map and the code share one git history, and because the one shipping product that
popularized the shadow repository, Cline, has abandoned it in its shipping code for refs inside
the user's own repository. Section 5.9 has the full table. And the always-current live canvas
loses to a person-triggered refresh, because the natural implementation of automatic freshness
is a watcher that starts an agent, which is the exact privilege increase Phase 23 refusal 8
exists to prevent. The deterministic verdicts refresh themselves for free. The prose refreshes
only by a person's hand, forever.

---

## 3. The verdict

Four designs were written, one per premise, and each was attacked three times and judged three
times. All three judges ranked The Standing Contract first. Judges 1 and 3 scored Static First
alone in last place, and judge 2 scored it level with The Checked Map at 43, so no judge scored
Static First above any other design. The judges disagreed on second place. Judge 1 put The Checked Map second on the strength of its content
model. Judges 2 and 3 put The Aiming Canvas second on its near-zero cost. The disagreement does
not affect the recommendation, because the margin over each judge's own second choice was 5 to
8 points on a 70-point scale, and the useful parts of both runners-up are grafted into the
winner in section 4.9.

| Design | Premise | Charter attack | Correctness attack | Month-three attack | Judge totals (J1 / J2 / J3, of 70) | Deciding reason |
|---|---|---|---|---|---|---|
| **The Standing Contract** | The map is a set of promises that pass or fail, checked like the existing conformance gates, and the picture is a rendering of the verdicts | Wounded, fixable | Wounded, fixable | Wounded, fixable | 54 / 54 / 52 | **Winner.** The only design whose default answer when it does not know is "I cannot check this, and here is why". The only design that can verify an absence. The only design whose recurring consumer, a gate in the commit battery, does not require the operator to remember a rail icon exists. Every wound found by every adversary routes back into the coverage axis the design already built. |
| The Checked Map | The agent writes the map as a rich document, Tortie draws it and continuously checks every claim against the code | Wounded, fixable | Wounded, fixable | Wounded, fixable | 46 / 43 / 43 | Rejected as the primary shape. Its checker verifies the existence of a narrative rather than the truth of a promise, its headline surface is a stored picture a human must visit, and its refresh loop is a paid human ritual the operator's own corpus proves lapses. Its best parts, the corpus seeding, the delta prompt, the standing-instruction refresh pattern and the session-change diff, are grafted into the winner. |
| The Aiming Canvas | The point is the selection, not the picture. The map exists so the operator can hand a scope to an agent session | Wounded, fixable | Wounded, fixable | Wounded, fixable | 45 / 46 / 47 | Rejected as the primary shape. Its own adversary timed the handoff verb losing to typing the scope into an already-open session, its honesty machinery verifies only that a glob matches at least one file, and its freshness is blind to uncommitted work. Its best parts, the payload composer, the broken-target gate, the gap staple and the paste-delivery discipline, are grafted into the winner. |
| Static First | The map is computed deterministically from the code, and a model may only rename and regroup what the extractor found | Wounded | Wounded | **Fatal** | 38 / 43 / 39 | Rejected. The only fatal verdict in the twelve attacks. The premise excludes the flows, the reasons and the gaps, which are the content that earns a visit, and its specified resolver would silently drop the 534 aliased imports in Tortie's own tree while its banner teaches the user the map cannot be wrong. Its extraction machinery, its conservative verdict rule and its coverage container are grafted into the winner. |

The correctness adversaries independently found the same defect in three of the four designs,
which is that a name-matching import resolver without manifest awareness produces false
verdicts, and on this repository the failure is measurable today. The fix is one shared piece
of work, the manifest-aware resolver in section 4.8, and it is mandatory for the winner.

---

## 4. The recommended design

The Standing Contract, amended by the fixes its adversaries proved necessary and the grafts the
judges specified. This section is written at the level a phase brief can be drawn from.

### 4.1 The idea and its lineage

Tortie already has the shape this design needs. `npm run conformance:context` imports the real
registry, prints one row per claim, and fails when a row loses something the panel needs.
`npm run conformance:agents` proves the resume argv byte for byte. Each caught a real error the
rest of the battery was blind to. The Arch feature is that same idea applied to the repository
itself. The technique has a name and a 31-year record. It is the reflexion model of Murphy,
Notkin and Sullivan, published at FSE 1995 and in IEEE TSE 27(4) 2001, both verified through
dblp. A reflexion model compares a stated high-level model against extracted facts and reports
three outcomes for every relationship, being convergent, divergent and absent. This design adds
a fourth outcome, unverifiable, because honesty about what the checker cannot see is what keeps
the drawing from lying. No shipping tool applies the technique at diagram level today. The
contract band verified that dependency-cruiser can assert one promised edge per hand-written
rule and that ArchUnit checks a PlantUML diagram in one direction only, so the diagram-level
absence report, a drawn arrow with no code behind it, ships nowhere and is the genuinely new
piece.

### 4.2 The three roles

| Role | Who | May do | May never do |
|---|---|---|---|
| Author | A person, or an agent the person launched in an ordinary Tortie session | Write `docs/arch/**` in the repository | Nothing else concerns Tortie |
| Checker | Tortie's main process plus its existing tree-sitter workers | Run git, ripgrep and the parser against the repository and attach a verdict to every claim | Rewrite the contract, rewrite the baseline, start an agent, place any contract-derived string into a spawned argv |
| Renderer | Tortie's renderer | Draw the verdicts, the list and later the canvas, hold selection, persist layout | Write the contract, call a model, reach the network, set a session status |

### 4.3 The data model, field by field

Five record kinds live in the repository and are the contract. One derived kind lives only in
Tortie's disposable database. All types are hand written in `src/shared/arch.ts` and are never
a re-export of any internal type, per the Phase 23 overlay rule. An invalid row is dropped
whole and surfaces as a visible error naming the file, the field and the reason, never
partially merged, never a crash. Path fields reject `..`, a leading `/`, a leading `~` and a
leading `-`, and the leading-dash rejection is load-bearing, because it is half of the argv
defense in section 4.7.

**ArchContract, at `docs/arch/contract.json`.**

| Field | Type | Meaning |
|---|---|---|
| `version` | `1`, integer literal | Unknown versions fail load with a named error. Growth is a version bump with a converter and a mapping test, never an appended optional field |
| `subject` | `string`, 1 to 120 chars | The one line drawn at the top of level 0 |
| `strictness` | `'not-wrong' \| 'complete'` | `not-wrong` is the default. Only asserted promises are judged and unmapped code is counted, not failed. `complete` makes any inter-component import not covered by a promise a divergence |
| `layers` | `{ id, name, order }[]`, 3 to 6 rows | The level 0 bands |
| `flows` | `string[]` | Ids of files under `docs/arch/flows/` |

**ArchComponent, one file per component at `docs/arch/components/<id>.json`, to soften merges.**

| Field | Type | Meaning |
|---|---|---|
| `id` | `string`, kebab case, unique, never reused | The identity every verdict, selection and layout row keys on. A delta prompt forbids id changes and the loader reconciles a vanished id to a new node by anchor-set overlap, with a visible "N of M ids changed" warning |
| `name` | `string`, 1 to 40 chars | What the box says, sentence case |
| `kind` | `'component' \| 'store' \| 'process' \| 'external-service' \| 'platform'` | What shape it draws as |
| `layer` | `string` | A `layers[].id` |
| `provenance` | one of the nine values in section 9.4 | First class and required on every node |
| `anchors` | `string[]`, repo-relative globs | May be empty only for `external-service` and `platform`, which live outside the tree |
| `boundary` | `'closed' \| 'open'` | Closed means an import into this component from any component with no `may` or `must` edge to it is a divergence |
| `description` | `string`, 1 to 500 chars | Prose. Rendered as plain text, never markdown with raw HTML, never verified, and labeled as such |
| `evidence` | `Evidence[]` | Quoted spans backing this component's claims |
| `deprecated` | `boolean` | Drawn struck through, never hidden |
| `gaps` | `string[]` | The "shipped versus thin" sentences. Prose, never verified, always one glance away |

**Evidence.**

| Field | Type | Meaning |
|---|---|---|
| `path` | `string`, repo relative, same path rules as anchors | Where the claim lives |
| `blobOid` | `string`, optional, must match `^[0-9a-f]{40}$` | The blob the quote was read from, kept for display only |
| `lineStart`, `lineEnd` | `number`, 1 based | The span |
| `quote` | `string`, verbatim, at most 200 chars | Verification is a substring test against the file at HEAD, never against the recorded blob, because a quote inside an immutable blob can never fail. The oid renders "what it looked like when written". This is the transclusion rule, never a paraphrase |

**ArchEdge, in `docs/arch/edges.json`. These are the promises.**

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | Stable slug |
| `from`, `to` | `string` | Component ids. A dangling reference drops the edge whole with a visible error |
| `kind` | `'imports' \| 'calls' \| 'spawns' \| 'reads-from' \| 'writes-to' \| 'emits' \| 'deploys-to' \| 'authenticates-with'` | The corpus's own verbs, section 9.3. Containment is the `layer` and component structure, never an edge, so it cannot dangle |
| `rule` | `'must' \| 'may' \| 'must-not'` | The promise |
| `checker` | `'imports' \| 'manifest' \| 'glob' \| 'evidence' \| 'none'` | Which compiled-in checker judges it. This field selects from choices the compiled world already contains, which is the charter's boundary sentence working as intended |
| `label` | `string`, 0 to 24 chars, optional | The one or two words on the arrow |
| `note` | `string`, optional | The reason paragraph. Prose, never verified |
| `evidence` | `Evidence[]` | Where the author says this happens |

**ArchFlow, one file per flow at `docs/arch/flows/<id>.json`.**

| Field | Type | Meaning |
|---|---|---|
| `id`, `name` | `string` | Identity and title |
| `shape` | `'pipeline' \| 'sequence' \| 'states'` | Which of the three drawing grammars from the corpus this flow uses |
| `steps` | array of `{ seq, componentId, label, note?, group?, evidence? }`, 4 to 13 entries | Ordered. `group` marks steps that run in parallel with each other, which is the thing the operator's ASCII drawings could not express and said so in a comment. `note` is the reason attached to the step by number, which is the content the corpus says a diagram loses |

**ArchBaseline, at `docs/arch/baseline.json`. Accepted, known divergences.**

| Field | Type | Meaning |
|---|---|---|
| `accepted` | `{ edgeId?, fromPath, toPath, because, at }[]` | Tortie reads this and never writes it, the ArchUnit `allowStoreUpdate=false` pattern. Recording a new baseline is a person editing a file. Accepted rows are always counted in the verdict strip with their `because` text visible, so an agent cannot silently accept its own violation |

**ArchVerdict, derived, in `<userData>/gmux/arch.db` only, never in the repository.**

| Field | Type |
|---|---|
| `subjectId` | `string`, e.g. `edge:scm-no-terminal`, `component:scm/anchors`, `evidence:14`, `divergence:<hash>` |
| `status` | `'convergent' \| 'divergent' \| 'absent' \| 'unverifiable'` |
| `coverage` | `'checked' \| 'partly-checked' \| 'unverifiable'` |
| `offending` | `{ fromPath, toPath, line, specifier }[]`, optional |
| `checkedAtCommit` | 40-char sha, backdated in the Salsa manner, section 7 |
| `generation` | integer, a run that never finished renders its unfinished claims as first-check question badges, never as stale verdicts |
| `firstCheck` | `boolean`, renders as "not yet checked", never as "changed" |
| `reason` | `string \| null`, e.g. "Imports are not checked for Swift" |
| `durationMs` | `number` |

### 4.4 The checkers, and how each earns its verdict

| Checker | Proves | Mechanism | Cost, measured where stated |
|---|---|---|---|
| `imports` | A `must`, `may` or `must-not` imports promise, and every closed boundary | Import captures added to the five existing tree-sitter tags queries, resolved by the manifest-aware resolver in section 4.8, stored as an edge table in `arch.db` | 45 ms warm for 905 files, measured by the reflexion scan rerun on this tree. 1.25 ms per changed file after, measured in the symbols service |
| `manifest` | A `dependency` node exists, a `must-not` dependency is absent | Parse `package.json`, `go.mod`, `Cargo.toml`, `Package.swift`, `requirements.txt` | Under 5 ms |
| `glob` | Every anchor matches at least one tracked file | In-process matching against the output of one fixed-argv `git ls-files -z` | One git process, about 30 ms |
| `evidence` | Every quoted span still exists at HEAD | Substring test against the file bytes at the recorded path at HEAD. Blob reads for display go through `git cat-file --batch` on stdin after a hex-40 format check | Under 1 ms per claim. 359 claims cost under 1 s including a 14 ms path index, measured by the staleness band |
| `none` | Nothing | Behavioural verbs without evidence get coverage `unverifiable` and say so on their face | 0 |

A behavioural edge with evidence is `partly-checked`. The checker proves the quoted code still
exists at the claimed place. It does not prove the runtime behaviour, and the prose panel
states that in one sentence. Freshness is per component, computed as the number of commits
touching the anchor subtree since that component's contract file last changed, from one
fixed-argv `git log --name-only` walk bucketed in-process, accumulated incrementally per HEAD
move rather than recomputed from the map commit each time. The per-anchor `git rev-list` form
was rejected because its cost scales with history walked and the correctness adversary showed
it blowing the budget on exactly the stale monorepos the ribbon exists to catch.

**The conservative verdict rule, stated as specification.** An unresolvable import specifier,
or an edge with an endpoint outside the six shipped grammars, yields `unverifiable`, never a
green `must-not` and never a `contradicted`. A definite verdict requires a resolved search that
returned a definite answer. The unresolved count renders visibly per component, e.g. "412 of
9,800 imports unresolved", so a resolver miss can never masquerade as a verified absence. This
rule exists because extraction failure and genuine absence are indistinguishable without it,
and a false green on a `must-not` promise is the single most damaging output this feature could
produce.

### 4.5 The on-disk format and location

The contract is purpose-built JSON at `docs/arch/`, tracked in the user's repository,
validated by a hand-written validator of about 200 lines in main. No schema-compiling library
enters the bundle, because ajv generates code with the Function constructor and the charter's
overlay rule wants a narrow hand-written type anyway. The writer contract in every prompt fixes
field order and sorts arrays by id, so regeneration diffs cleanly. RFC 8785 canonicalization is
the named fallback only.

The format band examined every existing candidate and each fails at least one requirement.

| Rejected format | Deciding reason |
|---|---|
| JSON Canvas | 4 required pixel fields per node force a model to invent coordinates, and preset color 3 is yellow |
| OCIF | No LICENSE file in its repository, and every edge is modeled as a node |
| Mermaid, D2, PlantUML | No metadata slot for anchors and rules, no layout round trip, and D2's pinning lives behind the proprietary TALA engine |
| Structurizr JSON | Round trips layout but no person or model authors it by hand, and its own docs warn layout is lost across key changes |
| Excalidraw | 4 determinism-killing fields per element by design |
| Markdown with frontmatter | What the operator writes today. No node identity, no edge model, no validation. It remains the right format for prose, not for the graph |

The location decision is inside the repository, not a shadow repository, for three verified
reasons.

- The freshness arithmetic only works when the contract and the code share one git history.
  Split them and "N commits behind" cannot be computed.
- The contract is reviewed in the same pull-request diff as the code it describes, which is the
  one consumption pattern with a living precedent in the operator's own conventions.
- Cline, the product whose documentation popularized the shadow git repository, has abandoned
  it in shipping code for refs inside the user's own repository, verified in its current source
  on 2026-08-16.

Because the contract is ordinary tracked files, the git operations that move the tree have
defined behavior. A branch switch or a rebase swaps the contract together with the code it
describes, the watcher fan-out sees the changed files, and the verdicts recompute against the
new HEAD the same way the SCM view refreshes, so the surface never shows one branch's promises
against another branch's code for longer than one re-check. A merge conflict leaves conflict
markers inside a JSON file, and that file then fails the validator as an ordinary parse
failure. The conflicted file is dropped whole with a visible error naming it, the previous
valid contract keeps rendering under a banner per the last-valid-contract graft in section 4.9,
and the checker never attempts to interpret conflict markers itself. The one-file-per-component
layout keeps such a conflict scoped to the components both sides touched, which is a second
reason for that layout beyond softening merges. Verdicts, freshness
counts, layout positions, collapse state and pinned views live in a third disposable SQLite
database, `<userData>/gmux/arch.db`, opened through the one existing `openGmuxDatabase` opener
with its WAL, its `busy_timeout` and its integrity gate, keyed by `(st_dev, st_ino)` of the
project directory with the path as fallback. Deleting it costs a re-check and a re-layout.
Nothing from Arch ever touches `manifest.db`, and the existing import-boundary build assertion
is extended so `main/arch/**` cannot import `main/manifest/**`, `main/restore/**` or
`main/context/**`.

### 4.6 Producing the first contract, end to end

Three tiers, strictly ordered so each is useful without the next. Tortie spends zero tokens in
all three.

**Tier 1, the fact base.** The existing symbols worker pool gains import captures in the five
hand-authored tags queries. Specifiers resolve through the manifest-aware resolver. Edges land
in `arch.db`. Manifest parsers read the dependency files. The freshness pass reads git. All of
this is Tortie's own compiled code over binaries Tortie already spawns.

**Tier 2, the deterministic skeleton.** The empty state's primary action, "Draft a contract",
runs a pure function over the fact base. Grouping is directory first, because the measured
literature says the directory structure beats every clustering algorithm as a default, and
workspace declarations are read before raw tree depth so a monorepo's level 0 is its packages
rather than one box named `packages`. The component count lands in 5 to 9, with a hand-written
personalised PageRank of about 30 lines deciding what merges when the count runs over. The
provenance classifier pre-fills the four fully computable categories. The output opens as
unsaved editor buffers at the contract paths. Tortie writes nothing to disk. The person reads
the draft in Monaco and saves it, which is an ordinary editor save with an ordinary place in
the SCM diff. The promise-set guidance in the draft is sized like the CLAUDE.md guardrail list,
being 5 to 10 promises to start, because a small contract about invariants survives refactors
and a 21-promise contract is a second AS-BUILT corpus with a schema.

**Tier 3, the narration, a person's act.** The secondary action composes the mapping prompt,
being the schema, the house rules, the fact base serialized as compact text, and the seed. When
`docs/AS-BUILT-ARCHITECTURE.md` or a sibling exists, the prompt tells the agent to convert that
document rather than start from nothing, because the corpus is the seed rather than a
competing document. In the
first slice the flow is the ordinary new-session flow with the prompt staged in the terminal
input, and the person presses Return. A later slice adds the headless run behind a confirm
sheet. That sheet is a launch surface and not a second confirmation gate. It launches only
agents already confirmed through Settings then Agents, it calls the same launch assertion every
other path calls, it records no confirmation of any kind, its flag templates are compiled-in
string constants, and it states in one plain sentence the verified fact that a headless run
executes the target repository's own hooks and MCP servers. The verified invocations, from the
agent band, are of this shape.

```
claude -p "<prompt>" --output-format json --permission-mode acceptEdits \
  --allowedTools "Read,Glob,Grep,Bash(git *),Write,Edit" --model sonnet
codex exec "<prompt>" --sandbox workspace-write -C <repo> --output-schema <schema>
gemini -p "<prompt>" --approval-mode auto_edit -o json
```

Corpus seeding is per repository, and the operator's 30 existing AS-BUILT documents get no
batch pass inside Tortie. Tortie never walks other repositories and never launches an agent
across them on its own, so each repository converts the first time the operator asks for it
there. Nothing stops him from running his own loop over the 30 repositories from a shell,
because the composed prompt is plain text and the invocations above are ordinary command
lines, but that loop is his script and not a Tortie surface. The narration prices in section
4.13 are per repository.

The `claude` invocation deliberately omits `--bare`, because bare mode never reads OAuth
credentials or the keychain and would break subscription auth. The docs announce that a future
release flips the default, so the brief carries a release-notes watch. The repair contract from
the LLM band applies. A failed parse corrects in place and never regenerates, and the last
valid contract keeps rendering, marked as such, until a new one passes.

### 4.7 Keeping it current, and the refusal 8 mechanics

Two loops with different owners, and the design's legitimacy lives in never confusing them.

**The verdicts refresh themselves.** The checker rides the existing `@parcel/watcher`
subscription through the existing 150 ms debounced repo-changed fan-out, the same trigger the
SCM view already refreshes git status on. The closed-app gap is covered by the watcher's
snapshot pair, measured at 1 ms to write at quit and 13 ms to replay at launch. A crash that
leaves no snapshot maps to `coverage: unverifiable` with reason "delta unknown", never to "no
changes". Incremental cost after one file change is under 100 ms end to end.

The argv defense makes this legal rather than argued. No field of any contract file ever
reaches a spawned argv. Evidence oids go to `git cat-file --batch` on stdin after a hex-40
check. Globs and anchors match in-process against one fixed-argv `git ls-files -z`. Freshness
parses one fixed-argv `git log --name-only` stream in-process. `conformance:arch` plants a
hostile anchor and a hostile oid in its fixture contract and fails if either string appears in
any composed argv. With that in place, a contract file change causes only reads and
fixed-argv spawns of the two binaries Tortie already spawns on every repository change, which
satisfies both the letter and the reason of refusal 8. This fix is sequenced before the Zen
change in section 8, because the proposed Zen bullet is false without it.

Torn-tree discipline, from the correctness attacks. Checks coalesce to one in-flight run with
cancellation. Every offending location re-verifies against the current file bytes before a row
renders, so a jump never lands on a line that no longer exists. Verdict downgrades publish only
after they survive a settle window of a few seconds during write bursts, while upgrades publish
immediately, because downgrades are the only verdicts that can be transiently wrong on a
half-written tree. Each run writes transactionally under a generation stamp.

Budgets are declared, in the difftastic manner, and split. The one-time cold index is exempt
and runs in the worker pool with the throttled progress event. The 5 s budget applies to
incremental re-checks. Past budget, remaining claims get `unverifiable` with reason "budget",
never a silent pass. Above 50,000 files import extraction degrades to freshness-only mode and
the surface says exactly that.

**The prose and the promises refresh only by a person's hand.** Editing the contract is editing
files. Three affordances lower the friction without touching the trigger.

- The delta prompt names only the drifted and contradicted claims and the divergent computed
  edges, one keypress from the freshness ribbon.
- The standing-instruction pattern goes in the project's agent-facing docs. A session that
  finishes work touching contracted anchors updates `docs/arch/` in that same session. The
  person launched the session, so refusal 8 is satisfied, and the refresh piggybacks on work
  already paid for. This is the only refresh path whose marginal cost rounds to zero.
- Nothing about a source change, a verdict change or a freshness number ever starts an agent.

### 4.8 The mandatory fixes, from the attacks

Every one of these is required before the phase brief is written. Each names its source.

| # | Fix | Source |
|---|---|---|
| 1 | Route every contract-derived value out of argv, with the hostile fixture asserted in `conformance:arch` | Charter attack on the winner, endorsed by all 3 judges as a sequencing condition |
| 2 | Check evidence quotes against the file at HEAD, oid for display only | Correctness attack on the winner. The blob-oid form can never fail |
| 3 | The conservative verdict rule and the visible unresolved count | Correctness attacks on the winner and on Static First, independently |
| 4 | The manifest-aware resolver. Read tsconfig `baseUrl` and `paths`, `package.json` workspaces and exports, the go.mod module directive and Cargo workspace members. Classify workspace-internal bare specifiers as first party. Rust and Python resolution ship later rather than ship wrong | Correctness attack on Static First, which measured 534 aliased imports in this tree that the naive rule drops |
| 5 | Split the budgets, cold index exempt, 5 s on incremental only | Correctness attack on the winner, which found the two limits contradict each other over the whole 11,000 to 50,000 file range |
| 6 | Accepted baseline rows always counted in the verdict strip, `because` text visible, a new acceptance called out | Charter attack on the winner |
| 7 | The strip reports by coverage, e.g. "12 checked and hold, 1 broke, 21 cannot be checked", so the aggregate cannot flatter | Correctness attack on the winner |
| 8 | `conformance:arch` joins the same pre-commit sentence as `conformance:context` and `conformance:agents`, and divergence rows surface in the SCM view beside the changed files that caused them | Month-three attack on the winner, endorsed by all 3 judges. The sidebar is not on screen when a break lands |
| 9 | `moved` verdicts use git's own rename detection, and a candidate is emitted only when git names exactly one rename for the path | Correctness attack on The Checked Map. This tree has 62 files named `index.ts`, so basename matching fabricates destinations |
| 10 | Hand-written validator, no ajv, stated in the brief | Charter attacks on two designs independently |
| 11 | The L2 matrix caps near 200 rows, above which the view lists top importers and importees | Correctness attack on the winner |
| 12 | Torn-tree discipline and the generation stamp | Correctness attacks on the winner and on The Checked Map |
| 13 | One `git status --porcelain -z` call joins the freshness pass, so the sentence carries "and N files changed uncommitted under this node". Agents work uncommitted for hours and commit-only freshness reads "0 behind" during a 200-file rewrite | Correctness attack on The Aiming Canvas |
| 14 | The confirm sheet's standing pinned as a launch surface, per section 4.6 | Charter attack on the winner |
| 15 | Contract prose renders as plain text only, never through the markdown pipeline with raw HTML enabled | Charter attack on The Checked Map, which found `rehype-raw` in the dependency tree |
| 16 | Schema growth is a version bump with a converter and a mapping test, never an appended optional field, and unknown fields are preserved on read and ignored | Charter attacks on two designs. The schema becomes a public surface the day agents in the wild write against it |
| 17 | Id stability across refreshes, per the ArchComponent row in section 4.3 | Correctness attacks on The Checked Map and The Aiming Canvas |
| 18 | The promise-set guidance sized at 5 to 10 promises | Month-three attack on the winner |

### 4.9 The grafts, from the three rejected designs

| Graft | From | What it is |
|---|---|---|
| The payload composer and the handoff verb | The Aiming Canvas | Select components, gaps or a failing verdict, and a byte-deterministic text block lands in a chosen session's input. The block carries names, resolved anchor paths, interior edges, crossing edges marked as crossing, current verdicts including every contradiction, and the freshness sentence. Never an image, never file bytes. The person presses Return. Composition is proven byte for byte in `conformance:arch` |
| The broken-target gate | The Aiming Canvas | A selection whose anchors resolve to zero files at HEAD demands one extra confirmation before handoff. This is the one check typing a scope by hand can never perform |
| The gap staple | The Aiming Canvas | Selecting a gap staples its honest paragraph into the payload. The gaps section is the content the operator's own skills tell the next agent to read first |
| Delivery discipline | The Aiming Canvas's correctness attack | Insertion goes through tmux `load-buffer` plus `paste-buffer -p`, never keystroke typing, offered only for sessions whose foreground process Tortie launched from the agent registry, with a per-agent multi-line paste matrix verified at Tier 3, because the antigravity finding proves bracketed paste misbehaves in at least one agent |
| The two-grade payload | The Aiming Canvas's month-three attack | Deterministic content composed at HEAD always ships. Authored prose ships only when its component's commits-behind count is under a threshold, and above it the payload carries one line saying the prose predates N commits and must be verified. Every quoted contract line is marked "from docs/arch, unverified" so it is never presented as something Tortie verified |
| The terminal-reachable picker | The Aiming Canvas's month-three attack | One chord inside a session opens the component list as a native menu and inserts the composed scope with no view switch. The pointing verb only beats typing when it never leaves the terminal |
| Corpus seeding | The Checked Map | The empty state names an existing AS-BUILT document and the prompt converts it |
| The standing-instruction refresh pattern | The Checked Map's month-three attack | Section 4.7. The zero-marginal-cost refresh path |
| The session-change diff | The Checked Map's month-three attack | A view of which promises and components the last burst of commits touched, built from verdict deltas the checker already computes. This is the one recurring daily moment a terminal answer renders badly |
| Last-valid-contract rendering | The Checked Map | A half-written or failed parse never blanks the view. The previous valid contract renders under a banner naming the failure |
| The flow `group` field | The Checked Map | Parallel steps marked as data, the thing ASCII could not express |
| Import extraction and the coverage container | Static First | The tags-query import captures, the per-language fixture matrix inside `conformance:arch`, and the container naming unparsed languages with their file counts, e.g. "Swift, 214 files, import checking off" |
| The computed provenance classifier | Static First | Pre-fills the skeleton's four fully computable categories so the draft starts honest |
| The agent-read convention | The Aiming Canvas's and The Checked Map's month-three attacks | The contract files are stated as agent-readable context, one documented line in the project's agent instructions pointing at `docs/arch/`. The four-vendor MCP evidence in section 6 says the map's most reliable reader is a machine, and Tortie is never the caller |

### 4.10 Packages and licenses

| Package | SPDX, from the actual license file or registry field | When it ships | Ships legally in a closed signed Apache-2.0 binary? |
|---|---|---|---|
| web-tree-sitter 0.26.12 | MIT | Already shipped, gains import captures | Yes, shipping today |
| @vscode/tree-sitter-wasm 0.3.1 | MIT | Already shipped, no new grammar | Yes |
| @vscode/ripgrep 1.18.0 | MIT | Already shipped | Yes |
| better-sqlite3 ^13.0.3, the tree's own pin | MIT | Already shipped, one new database through the existing opener. Actively maintained upstream, and it already carries `manifest.db` and `symbols.db` in production today | Yes |
| @parcel/watcher 2.6.0 | MIT | Already shipped | Yes |
| **First slice total of new packages** | | **zero** | |
| @xyflow/react 12.11.3 | MIT | Canvas slice only | Yes. Verified zero eval, zero wasm, zero native packages, runs under the pinned CSP. Two named taxes, being a bundled zustand ^4 beside Tortie's 5.x and the `transform: scale` viewport inside CSS zoom regions, which is the canvas slice's first spike. The attribution link stays visible and its click routes through the existing external-link interception |
| @dagrejs/dagre 3.1.1 | MIT | Canvas slice only | Yes. Positions computed once per scope and persisted, never re-run without a person's command |
| @scip-code/scip 0.9.0 plus @bufbuild/protobuf 2.14.0 | Apache-2.0, and Apache-2.0 AND BSD-3-Clause | Deferred, optional | Yes. Reads an `index.scip` a user-confirmed indexer produced. Tortie never runs an indexer |

Rejected with the deciding reason, so nobody relitigates them: elkjs (EPL-2.0, a named trap
license, and its superior INTERACTIVE stability is not needed at 30 or fewer nodes with
persisted positions), tldraw (proprietary, forbids production use, license-key and watermark
enforcement in the license text, a telemetry clause), @cosmograph/cosmos (CC-BY-NC-4.0), GoJS
(proprietary), @joint/core (MPL-2.0), both Graphviz wasm wrappers (they embed EPL-2.0 Graphviz
and are blocked by the renderer CSP anyway), mermaid as a canvas (a static renderer with no
metadata slot), knip and ast-grep and typescript 7.x in the bundle (native platform binaries,
refusal 6), universal-ctags (GPL-2.0), semgrep (LGPL-2.1 and the needed analysis is paywalled),
GumTree (LGPL-3.0), srcML (GPL-3.0), ajv (Function-constructor code generation).

### 4.11 Process boundaries

| Place | What |
|---|---|
| Main process, `src/main/arch/` | The contract loader and hand-written validator, the checkers, the skeleton generator, the payload composer, `arch.db` through `openGmuxDatabase`, one registrar `registerArchIpc` with `disposeArchIpc`, wired in `installMainCapabilities` |
| `worker_threads` | The existing symbols pool with import captures added. At most 6 transient workers. No third resident pool, honoring the research 19 budget |
| Spawned processes | git and ripgrep only, fixed argv, both already spawned on every repository change today. Plus the user's confirmed agent, only ever from the session flow or the later confirm sheet, always as a visible session |
| Renderer, `src/renderer/arch/` | The sidebar view, its own zustand store with the Context store's epoch guard, later the canvas EditorMode arm, a shot probe in the existing per-domain pattern |
| Never | The preload beyond the typed bridge, `manifest.db`, the restore path, any network host, any model call |

### 4.12 The IPC surface

One new domain file, `src/shared/ipc/arch.ts`, joined to the facade per the Phase 42 five-edit
recipe. Slice annotations mark what the first slice ships.

| Channel | Direction | Payload and result | Slice |
|---|---|---|---|
| `arch:load` | invoke | `{ cwd }` to `{ contract \| null, schemaErrors: { file, field, reason }[], verdicts, freshness, narratedAtCommit }` | 1 |
| `arch:check` | invoke | `{ cwd }` to `{ verdicts, checkedAtCommit, overBudget \| null, durationMs }` | 1 |
| `arch:skeleton` | invoke | `{ cwd }` to `{ files: { path, content }[] }`, drafts for unsaved buffers, main writes nothing | 1 |
| `arch:composePayload` | invoke | `{ cwd, componentIds, gapIds, verdictIds }` to `{ text, truncated, brokenTargets }` | 2 |
| `arch:modules` | invoke | `{ cwd, componentId }` to the computed L2 nodes and edges | 2 |
| `arch:layout:get` / `arch:layout:set` | invoke | Positions per level per scope, in `arch.db` | 4 |
| `arch:checked` | event | `{ cwd, checkedAtCommit, broke, unchecked }` after a watcher-triggered re-check | 1 |
| `arch:progress` | event | `{ cwd, done, total }`, throttled to one message per repository per 120 ms, the symbols precedent | 1 |

Registration elsewhere follows the known registration cascade from the grounding, being the id in
`SIDEBAR_VIEW_IDS` and its label, the ActivityBar item, the Sidebar branch, the one hand-written
`--zoom-arch` CSS rule, one `KeymapEntry` in group `views` including the `menuAction` that the
Context view's Phase 22 build forgot, `'show-arch'` in `MenuActionId`, the View menu item, and
the two DESIGN-SPEC tables. The brief also carries the known defect to avoid, being the
hard-coded `'scm'` fallback in 4 places. The handoff insertion reuses the terminal input path
the image-drop feature uses, and if audit shows that path is not a typed channel, the phase
adds `terminal:insertText` to the terminal domain rather than to arch, so the terminal keeps
ownership of writes into terminals.

### 4.13 The numbers

| Operation | Tokens | Time | Dollars | Standing |
|---|---|---|---|---|
| Load and validate the contract | 0 | under 10 ms | 0 | Estimated from parse sizes |
| Full deterministic check, this repository, 905 source files | 0 | about 0.5 s | 0 | Derived from measured parts, being the 45 ms import scan, about 200 ms of git and under 1 s of evidence tests |
| Incremental re-check after one file change | 0 | under 100 ms | 0 | Derived from the measured 1.25 ms per file |
| Skeleton draft | 0 | under 2 s | 0 | Estimated |
| Launch catch-up after a closed period | 0 | 14 ms | 0 | Measured, snapshot write 1 ms and replay 13 ms |
| Freshness pass | 0 | 200 to 300 ms per repository | 0 | Conservative from the measured 25 ms for 153 subtree hashes. Unmeasured on a large history, flagged |
| Cold parse at 50,000 files | 0 | about 23 s, once, in workers | 0 | The extrapolation ceiling from the palette-era measurement. Unmeasured for this feature |
| First narration, optional, the user's agent | the agent's | 12 to 37 minutes, modelled | $4.59 Haiku 4.5, $11.95 Sonnet 5, $29.88 Opus 5, $0 Gemini CLI free tier | Prices verified live 2026-08-16. Token counts, turn counts and wall clock modelled and unmeasured. Calibrated at about 1,200 files and unbounded upward on monorepos |
| Re-narration after about 20 changed files | the agent's | minutes | $0.58 to $1.50 modelled, $0 Gemini | Modelled |
| Tortie's own token spend, ever | 0 | | 0 | By construction |

One number is owed before the first phase closes, being one real measured narration run,
because every dollar and wall-clock figure for the agent path above is a model.

---

## 5. The twelve research bands, condensed to their answers and their tables

Each band ran as a sweep plus a deep read against primary sources. The candidate tables are
preserved in full because they are the reusable part. The graveyard band is section 6. The
staleness band's mechanics are section 7.

### 5.1 Deterministic extraction of a code graph

**The answer.** Two things can produce a code graph inside the signed bundle, and Tortie
already owns one. The first is the `web-tree-sitter` pass the symbols store already runs,
extended with import captures and an edge table. The second is reading a SCIP index somebody
else's indexer produced, through `@scip-code/scip` 0.9.0, an official pure-JavaScript reader,
Apache-2.0, 163 KB, one pure-JavaScript dependency. Everything else in the field is an external
binary, a native npm package, a JVM process or a server. The honest limit, stated so nobody
discovers it later, is that tags-query call captures are name matching, so this feature draws
no call arrows, ever. No published measured timing exists for any tool in this band on a
10,000-file repository, so every such number in this document is an extrapolation and is
labeled.

| Name | What it does | SPDX | Last release | Maintenance signal | Key number | Verdict |
|---|---|---|---|---|---|---|
| web-tree-sitter | Parses source to a syntax tree in WASM, tags queries give definitions | MIT | 0.26.12, 2026-08-08 | Very active, nightly on 2026-08-15 | Tortie's own cold build 351 ms, 1.25 ms per changed file | **Use.** Already in the bundle |
| @scip-code/scip | Generated TypeScript reader for the SCIP protobuf schema | Apache-2.0 | 0.9.0, tracking scip v0.9.0 of 2026-06-29 | Actively tracking the spec | 163,122 bytes unpacked, 1 dependency, 0 native packages | **Use, deferred.** Makes reading a SCIP artifact a dependency rather than a build |
| @bufbuild/protobuf | Pure JavaScript protobuf runtime | Apache-2.0 AND BSD-3-Clause | 2.14.0 | Active, passes the conformance suite | 0 runtime dependencies | **Use with the above** |
| SCIP protocol and CLI | The wire format | Apache-2.0 | v0.9.0, 2026-06-29 | Active, 5 releases Mar to Jun 2026 | 10 language indexers listed | Consider the format. Reject the Go CLI for the bundle |
| rust-analyzer `scip` | Emits a resolved SCIP index for Rust | MIT OR Apache-2.0 | not checked | Active, `cmd scip` verified in flags.rs | 4 flags on the subcommand | Consider as a user-confirmed executable only |
| typescript@6.x | The JavaScript TypeScript compiler API | Apache-2.0 | 6.0.0-beta | End of the JS line, `latest` moved to the Go port | 0 dependencies | Consider. Needs a build assertion pinning below 7.0.0 forever |
| typescript@7.x | The Go native compiler | Apache-2.0 | 7.0.2 | Very active | 18 platform packages in hard `dependencies` | **Reject.** Refusal 6 |
| ts-morph | Wrapper over the TypeScript compiler API | MIT | 28.0.0 | Active | 2 runtime dependencies | Consider, same standing and limits as typescript@6.x |
| dependency-cruiser | File and module import edges plus rule enforcement | MIT | 18.2.0, 2026-08-10 | Excellent | 18 pure-JS runtime dependencies, 0 native | Consider, rejected only because tree-sitter already does this in one pass and a second walker means a second gitignore answer |
| es-module-lexer | Import and export metadata for ES modules | MIT | 2.3.1 | Active | 0 dependencies | Consider, ESM only, duplicates tree-sitter |
| knip | Module and export edges, unused exports | ISC | 6.32.2, 2026-08-11 | Excellent | 19 native platform bindings via oxc-parser | **Reject.** Refusal 6 |
| madge | Import edges, cycles | MIT | 8.0.0, 2024-08-05 | Stalled 2 years | | Reject, superseded by dependency-cruiser |
| skott | Import edges, cycles, dead code | MIT | unverified | Active | | Reject, no advantage |
| jelly | Real JS and TS call graph | BSD-3-Clause | 0.13.0, 2026-05-11 | Alive, Aarhus University | Says of itself "intentionally not fully soundly" | **Reject.** A wrong arrow on this canvas is worse than a missing one |
| stack-graphs | Incremental cross-file name resolution | Apache-2.0 OR MIT | crate 0.10.0, 2024-12-13 | **Archived 2025-09-09** | | Reject, dead |
| tree-sitter-graph | A DSL for building graphs from syntax trees | Apache-2.0 OR MIT | unverified | Not archived | | Reject for round one, the hard work stays ours |
| github/semantic | Multi-language analysis in Haskell | MIT | n/a | **Archived 2025-04-01** | | Reject, dead |
| Sourcetrail | The historic interactive source explorer | GPL-3.0 | n/a | **Archived 2021-12-14** | | Reject, dead, and the prior art the operator will be asked about |
| universal-ctags | Symbol definitions only | GPL-2.0, no linking exception | p6.2, 2026-07-30 | Very active | 0 edge kinds | Reject twice, license and it gives less than tree-sitter |
| ast-grep | Structural pattern matching | MIT | 0.45.1, 2026-08-07 | Very active | 9 native platform packages | Reject in bundle, refusal 6 |
| semgrep | Findings, cross-file dataflow paywalled | LGPL-2.1 | not rechecked | Very active | Free tier is single function or file | Reject twice |
| Sourcebot | Self-hosted code search | FSL-1.1-ALv2 | not rechecked | Active | Competing-use ban for 2 years per release | Reject on license |
| codanna | Local code intelligence, tree-sitter, 15 languages | Apache-2.0 with a NOTICE attribution | v0.13.2, 2026-08-04 | Very active | 76,000 to 249,000 symbols per second, the only published throughput in the band | Reject for the bundle, a Rust binary. Read closely as the nearest existing product |
| scip-typescript / scip-go / scip-java / scip-python / scip-ruby / scip-clang | Resolved symbols and references per language | Apache-2.0 | 2025-10 to 2026-07 spread | Mixed, ruby self-describes as experimental | Each needs a working build or install of the user's project | Reject for the bundle, legal only behind the Settings then Agents confirm gate, none in round one |
| LSIF and lsif-node | The older index format | MIT | unverified | No deprecation notice exists, superseded in practice | scip-java v0.12.0 removed LSIF output | Reject, and do not repeat "LSIF is dead" as a published fact |
| Kythe | The richest published schema | Apache-2.0 | v0.0.76, 2026-07-16 | Alive but slow, still 0.0.x after 11 years | Bazel-scale extraction | Reject, infrastructure |
| Meta Glean | Facts about source, queried in Angle | BSD-3-Clause | 0 releases ever | Meta-internal first | | Reject, a server plus a database |
| Joern | Code property graph with dataflow | Apache-2.0 | v4.0.604, 2026-08-15 | Extremely active | Requires JDK 21 | Reject, a second runtime |
| code2flow | Heuristic call graph | MIT | 0 GitHub releases | One thin-spread author | Admits a perfect callgraph is "not possible" | Reject |
| pyan / pyan3 | Python call graph | GPL-2.0 | archived / revived 2026-02 | Mixed | 1 language | Reject, license |
| tach / grimp / import-linter | Python module edges | MIT / BSD-2 / BSD-2 | 2026 releases | Active | Rust extensions in wheels | Reject, native and single language |
| go callgraph | Call graph, four algorithms | BSD-3-Clause | part of x/tools | Active | Needs SSA and type checking | Reject for the bundle |
| jdeps | Class and module edges | GPL-2.0 with Classpath Exception | ships with the JDK | Stable | Reads compiled artifacts only | Reject |
| cargo-modules | Rust module tree | MPL-2.0 | 0.27.0 | Active | 1 language | Reject, license and needs cargo |
| Blarify | Code graph via language servers | MIT | not rechecked | Active | Requires Neo4j or FalkorDB | Reject, a graph database at runtime breaks offline |

### 5.2 LLM-assisted repository mapping

**The answer.** The 2026 state of the art is a two-tier shape verified in live source. A
deterministic parse plus a resolution-tuned graph partition decides the component count and the
membership, and a model only names and describes the groups it was handed. CodeBoarding
hard-codes 5 to 8 top-level components and a 0.10 drift budget, verified byte for byte in its
source. Not one candidate is usable as a Tortie dependency, because every good one is Python
with native extensions, downloads binaries, needs a key, or carries a hostile license. What is
reusable is five design decisions, being the 5 to 8 partition target, the drift budget, the
edge-role split, the two-value EXTRACTED or INFERRED provenance tag, and the repair-in-place
contract. The strongest outside endorsement of the whole feature is Anthropic's own `/doctor`,
verified verbatim, which deletes "architecture overviews" from CLAUDE.md as content the agent
can derive, which is a vendor stating that architecture prose should be derived or checked on
demand rather than maintained by hand.

| Name | What it does | SPDX | Last activity | Maintenance signal | Key number | Verdict |
|---|---|---|---|---|---|---|
| CodeBoarding | Leiden-partitioned component map, LLM names groups | MIT | push 2026-08-16 | Active, 2,389 stars | 5 to 8 top components, drift budget 0.10 | Consider the constants, never depend. Python, native igraph, downloaded LSP binaries, needs a key |
| Graft (NanoNets) | Deterministic tree-sitter wiring graph plus LLM node summaries | MIT | push 2026-08-16 | Active, 3,091 stars | 0.74 s cold on 124 files. SWE-bench 33 of 50 with the map versus 27 of 50 without | Consider the two-tier split and per-node content hashes |
| Graphify | Local tree-sitter graph, Leiden communities, tagged edges | Apache-2.0 | push 2026-08-16 | 30 contributors, star count uncorroborated | 2 edge tags, EXTRACTED and INFERRED | Consider the tags. Python tool, not a dependency |
| aider repomap | tree-sitter tags plus personalised PageRank under a token budget | Apache-2.0 | release 2025-08-09 | Weak, 12 months without a release | Default budget 1,024 tokens, no component concept | Consider the ranking multipliers as an algorithm only |
| repomix | Packs a repo into one file | MIT | push 2026-08-16 | Active, 27,889 stars | about 70 percent token reduction claimed | Reject, a second extractor is forbidden duplication |
| mex | Project wiki plus a no-token drift check | MIT | push 2026-08-12 | Small | `mex check` "without spending AI tokens", verified | Consider the deterministic drift-check idea |
| archify | Agent skill rendering validated showcases | MIT | push 2026-08-14 | 6 contributors, star count suspect | Atomic validate-then-swap with last-known-good | Consider that pattern only |
| GitDiagram | File tree and README into an LLM, typed graph out, repair loop | MIT | push 2026-08-15 | Active, 15,888 stars | 12 to 22 nodes, 0 to 6 groups, 8 to 30 edges, in its own prompt | Reject the pipeline, keep the budget as a second data point |
| deepwiki-open | Wiki generator, pivoted to a commercial funnel | MIT | push 2026-08-16 | README now points at a product download | none published | Reject |
| DeepWiki (hosted) | Autogenerated wikis with diagrams | hosted | n/a | Live inside Devin onboarding | 0 statements about accuracy or staleness on its docs | Reject, hosted only, and the canonical "confidently wrong" evidence source |
| potpie | Agent platform over a code knowledge graph | Apache-2.0 | push 2026-08-14 | Active | | Reject, a daemon platform |
| blarify | LSP or SCIP graph into Neo4j | MIT | push 2026-05-25 | Stale | Graph database required | Reject |
| code-graph-rag | tree-sitter graph into Memgraph | MIT | push 2026-08-16 | Active | Graph database required | Reject |
| GitNexus | tree-sitter graph in browser WASM | PolyForm Noncommercial 1.0.0 | push 2026-08-16 | Star count uncorroborated | about 5,000-file browser ceiling, in its README | Reject on license. Keep the ceiling as evidence renderer-side parsing does not scale |
| SocratiCode | AST chunks plus embeddings, Docker stack | AGPL-3.0 | push 2026-08-14 | Active | | Reject on license and Docker |
| Sourcebot | Self-hosted code search | FSL-1.1-ALv2 | push 2026-08-16 | Active | | Reject on license |
| Prometheus | Knowledge graph agent | GPL-3.0 | push 2026-08-16 | Active | | Reject on license |
| Sourcetrail | The original interactive code map | GPL-3.0 | archived 2021-12-13 | Dead | Archived while holding 16,490 stars | Reject, the category's cautionary tale |
| Cursor / Windsurf / Augment indexing | Hosted embedding indexes | hosted | n/a | Live, or absorbed into Cognition | 0 published methodology | Reject, hosted and undocumented |
| Claude Code /init and /doctor | Generates and prunes CLAUDE.md | product feature | current | Live | /doctor deletes architecture overviews as derivable | Not a candidate. It is the evidence |
| AGENTS.md | Plain markdown convention | convention | live | 60k projects claimed | No architecture field exists | Not a candidate. Confirms no format exists to inherit |
| oh-my-mermaid / archeyes | Diagram-drawing skills | MIT | stale / 7 stars | Weak | No verification step | Reject |

### 5.3 Canvas and graph rendering libraries

**The answer.** Use `@xyflow/react` 12.11.3 for the drawing surface, MIT, verified eval-free
and wasm-free by tarball grep, so it runs under the pinned CSP unmodified, with nodes as
ordinary React components so codicons, tokens and `ui:popupMenu` need no bridging. Use
`@dagrejs/dagre` 3.1.1 for positions. No WebGL, because Chromium's default budget is 16 live
WebGL contexts per renderer and the terminals already spend from it, and because the only
vendor-published performance number in the band, deck.gl's, is built for about 33,000 times
this node count. The one flagged integration risk is React Flow's `transform: scale` viewport
inside Tortie's CSS `zoom` regions, which is the canvas slice's first spike, with hand-written
SVG in the commit graph's own pattern as the priced fallback.

| Library | What it does | SPDX | Last release | Maintenance signal | Key number | Verdict |
|---|---|---|---|---|---|---|
| **@xyflow/react** 12.11.3 | React node-and-edge canvas, DOM nodes, SVG edges | MIT | 2026-08-12 | Very active, 38,032 stars, funded by a Pro tier | 0 eval, 0 new Function, 0 wasm in the shipped bundle | **Use** |
| **@dagrejs/dagre** 3.1.1 | Layered layout, positions only | MIT | 2026-08-08 | Active again, 2 releases in 2026 | 15.8 KB gzipped | **Use** |
| diagram-js 15.24.0 | SVG diagram toolkit under bpmn-js | MIT, watermark clause absent, verified | 2026-08-11 | Camunda-backed | 0 eval | Consider as fallback, SVG nodes tax |
| cytoscape 3.34.1 | Canvas2D graph library | MIT | 2026-08-11 | Active, 11,166 stars | 0 eval, no published performance number | Consider as fallback, canvas-drawn nodes make text and menus ours |
| @antv/x6 3.1.8 | SVG diagram framework | MIT | 2026-08-11 | Active | 166.5 KB gzipped | Reject, no advantage over React Flow |
| @antv/g6 5.1.1 | Graph visualization framework | MIT | 2026-05-08 | 3 months quiet | 390.6 KB gzipped | Reject on size and its own component stack |
| vis-network 10.1.1 | Canvas2D network view | Apache-2.0 OR MIT | 2026-08-07 | 77 of last 100 commits are renovate bot | Documented bound "a few thousand nodes" | Reject, bot-kept |
| sigma 3.0.3 + graphology | WebGL rendering over a graph model | MIT | 2026-04-30 | Mid-rewrite, near-zero commit flow | | Reject |
| @cosmos.gl/graph 3.4.1 | GPU force layout | MIT | 2026-08-13 | OpenJS incubation, verified | Point clouds, no per-node boxes | Reject for this job, the only legal Cosmograph lineage |
| @cosmograph/cosmos 3.4.1 | Same engine, Cosmograph's package | **CC-BY-NC-4.0** | 2026-07-31 | Active | | **Reject on license** |
| pixi.js 8.19.0 | WebGL scene graph | MIT | 2026-06-04 | Active | 5 new Function sites per shipped bundle | Reject, throws under the CSP without its unsafe-eval module |
| deck.gl 9.3.10 | WebGL2 data layers | MIT | 2026-08-11 | vis.gl suite | "up to about 1M data items" at 60 FPS, its own docs | Reject, wrong scale by 4 orders |
| konva 10.3.1 / fabric 7.4.0 | Canvas2D scene graphs | MIT | 2026 | One dominant maintainer / unmeasured | 56.2 / 91.7 KB | Reject, no graph semantics |
| @excalidraw/excalidraw 0.18.1 | Whiteboard component | MIT registry field, no LICENSE in tarball | 2026-04-20 | Active | Bundle references 5 external hosts including a library gallery | Reject, an in-app gallery is refusal 3 verbatim |
| tldraw 5.3.1 | Whiteboard SDK | Proprietary | 2026-08-14 | Active, commercial | Forbids production use, enforces watermark display, "may collect and transmit usage data" | **Reject on license, three ways** |
| mermaid 11.16.1 | Text to static SVG | MIT | 2026-08-04 | Active | 971.6 KB gzipped | Reject, a static picture, not a canvas. The operator's "Mermaid-style" names the idiom |
| @joint/core 4.3.1 | SVG diagramming | **MPL-2.0** | 2026-07-27 | Commercial tier above it | File-level copyleft | Reject |
| gojs 4.0.3 | Canvas2D diagramming | Proprietary | 2026-07-17 | Commercial | | Reject on license |
| elkjs 0.12.0 | Layered layout with containers and ports | **EPL-2.0 OR GPL-3.0-or-later** | 2026-07-17 | Active, tracks Java ELK within days | eval-free, wasm-free, the only engine with a built-in mental-map mode | Reject as default on license. Reconsidering it is a written license decision in a phase brief, never a quiet dependency |
| Graphviz wasm wrappers | dot layout in wasm | Wrappers Apache-2.0 / MIT over EPL-2.0 Graphviz, notice missing in both | 2026-07 / 2026-08 | Active | 468 to 636 KB | Reject, wasm is CSP-blocked in the renderer and the EPL notice is undeclared |
| ngraph / rete / reaflow / react-diagrams / litegraph | Various | BSD-3 / MIT / Apache-2.0 / MIT / MIT | 2024 to 2025 | All dormant 14 months to 2.5 years | | Reject on dormancy |
| Perfetto VirtualOverlayCanvas | Floating-canvas virtualization pattern | Apache-2.0 | current | Google, active | Overdraw 300 px, tolerance 100 px | Not needed at this scale. Keep the note |
| bpmn-js | BPMN over diagram-js | MIT plus a watermark clause that "MUST NOT be removed" | current | Camunda | | Reject on the clause. diagram-js beneath it is clean |

### 5.4 Graph layout engines and the stability problem

**The answer.** The stability problem has a verified name, preserving the mental map, from
Misue, Eades, Lai and Sugiyama, 1995. The only layered engine that solves it by design is
elkjs, whose 4 phases all carry an INTERACTIVE variant and which measured 0 percent movement of
unchanged nodes after a one-node edit. It is EPL-2.0 and is rejected on that license. The
recommended design does not need it, because its graphs are capped at 30 or fewer boxes per
level and its stability comes from storage rather than from an engine. Positions persist in
`arch.db`, existing nodes keep their stored positions on every re-render, dagre places only
new nodes, and a full re-layout is a person's explicit command. dagre alone measured 100
percent node movement on any edit and overflows its stack above about 2,000 nodes, so layout
always runs per level, never over everything.

| Name | What it does | SPDX | Last release | Maintenance signal | Key number | Verdict |
|---|---|---|---|---|---|---|
| elkjs 0.12.0 | Sugiyama layered layout, pure JS transpile of Java ELK | EPL-2.0 OR GPL-3.0-or-later | 2026-07-17 | Tracks ELK Java within 5 days, 5.56M weekly downloads | 0 percent of unchanged nodes moved after a one-node edit in INTERACTIVE mode | Technically first, rejected on license for this product |
| Graphviz dot via @viz-js/viz 3.29.0 | Layered layout in wasm | Wrapper MIT, no LICENSE file in the tarball, embeds Graphviz 15.1.1 EPL-2.0 | 2026-08-05 | Healthy | 84 percent of nodes moved on a one-node edit | Reject |
| Graphviz neato and fdp, pinned | Force and stress layout with per-node pin | same EPL position | same | same | fdp took 68.6 s at 1,000 nodes | Reject, wrong family |
| @hpcc-js/wasm-graphviz 1.28.0 | Alternative Graphviz wasm wrapper | Wrapper Apache-2.0, no Graphviz notice | 2026-07-24 | Healthy | same engine | Reject |
| **@dagrejs/dagre 3.1.1** | Sugiyama layered layout in JS | MIT | 2026-08-08 | Active fork, the old `dagre` package dead since 2019 | 100 percent of nodes moved on edit, stack overflow above about 2,000 nodes | **Use, with stability supplied by persisted positions and per-level scope** |
| d3-dag 1.2.2 | Sugiyama in JS | MIT | 2026-07-05 | One maintainer | 439 ms at 300 nodes, 60 percent moved | Reject |
| d3-hierarchy 3.1.2 | Tree layouts only | ISC | 2022-04-02 | Finished, stable | Trees are inherently stable | Consider for pure containment views only |
| d3-force 3.0.0 | Force simulation with fx and fy pinning | ISC | 2021-06-05 | Finished | 2 percent moved more than 10 percent | Reject, wrong family for a layered map |
| graphology-layout-forceatlas2 | Force layout | MIT | 2022-10-17 | Slow | 70 percent moved, least stable measured | Reject |
| webcola 3.4.0 | Constraint-based layout | MIT | 2019-05-10 | 7 years without a release | | Reject, dead as a dependency |
| @msagl/core 1.1.24 | Layered layout plus routing, Microsoft | MIT | 2026-04-24 | Alive, 175 stars | Incremental mode unconfirmed in its README | Watch item only. If its classic incremental mode survived, it is the only MIT challenger on stability |
| @antv/layout / layout-wasm | Layout collection | MIT | 2026-02 / 2024-09 | wasm variant stale | 11 MB unpacked | Reject |
| mermaid / @mermaid-js/layout-elk | Renderer and its ELK adapter | MIT, elkjs arrives transitively | 2026 | Active | Inherits dagre or EPL | Note only |
| D2 | Diagram language, three backends | MPL-2.0 | v0.7.1, 2025-08-19 | Repo active, no release in 12 months | Position pinning works only in the closed TALA engine | Reject |
| TALA | Architecture-specific layout | Closed source | n/a | Commercial | Watermarks unlicensed output | Reject outright |
| @cosmograph/cosmos | GPU force layout | CC-BY-NC-4.0 | 2026-07-31 | Alive | | Reject on license |
| vis-network / cytoscape / ngraph.forcelayout / mxgraph | Frameworks and force layouts | mixed | mixed | mixed, mxgraph archived 2020 | | Reject, wrong scope or wrong family |

### 5.5 The on-disk format for the map

**The answer.** Purpose-built JSON validated by a hand-written schema, split across two stores
with different owners. The semantic files carry no pixel coordinates and are agent-written into
the repository. The layout is Tortie-written into `arch.db` outside the repository. The band
proved the criteria conflict, being that a model cannot emit stable coordinates while a
round-tripped human layout requires them, so no single existing file format can satisfy both
and every surveyed format picks one side. Byte determinism is a property of the writer, not of
any format, so the writer fixes field order and sorts arrays by id, with RFC 8785 as the named
fallback canonicalizer only. The full candidate table is in section 4.5's rejection table plus
the following rows the deep read verified.

| Format | Key verified fact | Verdict |
|---|---|---|
| Purpose-built JSON plus hand-written schema | 0 external dependencies to read or write it. Drop-whole-row validation is the charter's own overlay shape | **Use** |
| JSON Canvas 1.0 | 4 required integer pixel fields per node. Spec frozen since 2024-04-11. Preset color 3 is yellow | Reject as storage, keep as a possible one-way export |
| OCIF v0.7.0 | Repository has no LICENSE file, verified by a live 404. Every edge is a node | Reject, cite as proof a clean extension mechanism exists |
| Excalidraw scene | 4 determinism killers per element, `seed`, `version`, `versionNonce`, `updated`, verified in its types | Reject |
| tldraw .tldr | Production ban, license-key enforcement, telemetry clause, all verified in the license text | Reject before any technical question |
| Mermaid, incl. architecture-beta | `click` binds a JavaScript callback. architecture-beta icons come from iconify over the network | Reject as storage, one-way export allowed later |
| D2 | Pinning only in TALA, "proprietary, closed-source", its own docs | Reject |
| Graphviz DOT | Real round trip only via `neato -n`. Rendering needs an EPL-2.0 native binary | Reject |
| PlantUML | GPL by default, its own FAQ, needs a JVM | Reject |
| Structurizr DSL and JSON | Its own docs warn "you will likely lose manual layout information" | Reject, copy nothing but the caution |
| C4 model | Not a format. 0 bytes | Use as vocabulary for the level ladder only |
| GraphML | Typed metadata, no positions in the core spec, XML diffs poorly | Reject |
| CALM 1.2 (FINOS) | Apache-2.0, active, but 5 closed relationship types cannot say "spawns" or "shells out to claude" | Reject as format, borrow its `flows` with sequence numbers |
| LikeC4 | MIT, active, layout persistence undocumented across 4 doc surfaces | Reject |
| ELK JSON | Layout interchange only, no semantic slot | Reject |
| DGML | Windows tooling, dormant since 2016 | Reject |
| draw.io mxfile | Base64 deflate payloads, GUI-authored | Reject |
| Markdown plus frontmatter | The operator's current habit. No identity, no edges, no validation | Reject for the graph, correct for prose |

### 5.6 Choosing the level of abstraction a person can hold

**The answer.** Do not let an algorithm choose the boxes. The written contract chooses them,
the directory structure fills the gaps, and ranking decides only what gets dropped when a
budget is full. The measured case is strong. The best classical architecture-recovery
techniques score 11 to 76 MoJoFM against human ground truth, produce zero recognisable
components in 34 of 81 benchmark cells, and can move 38.6 percent of a clustering after a
one-letter comment edit, while the directory structure is worth more than any other single
input to the best fusion technique. The human budget has one real measurement, being Ghoniem
2005, verified at the abstract, where node-link drawings stop beating a matrix above 20
vertices. Three sources that do not cite each other agree on the top-level count, being the
operator's own 30 documents at 4 to 9 boxes, CodeBoarding's compiled 5 to 8, and GitDiagram's
prompted 12 to 22. The concrete rule is 4 levels with hard caps of 12, 20 and 30 boxes and 13
flow steps, a lexicographic survival rule with the written map first, directories second and
personalised PageRank third, and community detection only as a person-invoked suggestion
rendered as a diff.

| Name | What it does | SPDX | Last release | Key number | Verdict |
|---|---|---|---|---|---|
| graphology | Graph data structure | MIT | 0.26.0, 2025-01-26 | 1,025,040 weekly downloads | Use when the regroup suggestion ships |
| graphology-communities-louvain | Louvain over graphology | MIT | 2.0.2, 2024-12-17 | Exposes resolution, a seedable rng and a dendrogram | Use, person-invoked only. This family's measured accuracy is 11 to 76 MoJoFM, so it never draws the default picture |
| Hand-written personalised PageRank | The drop decision | first party | n/a | about 30 lines, the aider template's constants verified in its live source | Use, write our own |
| ngraph.pagerank | PageRank | MIT | 2.1.1, 2022-09-02 | 717 weekly downloads | Reject, idle |
| leiden-ts / ngraph.leiden | Leiden in TS | MIT | 2026, both at 0.x | 655 and 977 weekly downloads | Reject for now, not yet maintained libraries |
| fast-leiden | Leiden wrapping native igraph | GPL-3.0-or-later | 2026-05-25 | | Reject, license and native |
| @mapequation/infomap | Map-equation clustering | GPL-3.0-or-later | 2026-08-04 | | Reject on license |
| ml-hclust | Agglomerative clustering | MIT | 4.0.0 | WCA and LIMBO score 11 to 50 MoJoFM | Reject, the evidence argues against hierarchical clustering entirely |
| Bunch, ACDC, ARC | Classical search-based recovery | research Java | n/a | ACDC crashed on current Android, ARC self-disagrees by 28 MoJoFM on reruns | Reject, verified from the papers |
| aider repo map | PageRank plus token budget | Apache-2.0 | live | All ranking constants verified against live repomap.py | Use as the design template, not a dependency |
| NDepend | Commercial .NET analysis | Commercial | live | Its own docs say the graph "became un-understandable" past "a few dozens boxes", DSM scales better | Not a candidate. Its matrix-over-graph switch is the L2 fallback's precedent |
| ArchAgent (arXiv 2601.13007) | LLM architecture recovery | paper | 2026-01 | F1 0.966 versus DeepWiki 0.860, p 0.0036, 30 senior engineer judges | Evidence, not a candidate. No study anywhere compares an LLM map against a directory-only baseline |

### 5.7 The graveyard and the survivors

This band carries the strongest argument against building the feature and is given its own
weight as section 6.

### 5.8 Staleness, provenance, and containing a wrong map

**The answer.** Git already maintains the tree the freshness question needs, a full
per-repository freshness pass costs about 200 ms of read-only git, and the design effort
belongs in classifying why a check failed rather than in detecting that something changed. The
mechanics this band produced, being the two-axis verdict model, the Salsa backdating rule, the
Dagster non-transitivity rule, the declared-budget rule and the miss classifier, are the
substance of section 7. The band's candidate table follows, minus the rows already carried in
other bands.

| Candidate | What it does | SPDX | Key fact | Verdict |
|---|---|---|---|---|
| git tree objects | Merkle hash per directory, maintained on every commit | already installed | 153 subtree hashes in 25 ms, one process | **Use.** The staleness primitive already exists |
| `src/main/context/hash.ts` | The in-repo per-file digest with a versioned algorithm field | Tortie's own | about 1 ms for a head-mode set | **Use.** Never write a second hasher |
| @parcel/watcher 2.6.0 | Watching plus offline delta via snapshot | MIT | writeSnapshot 1 ms, getEventsSince 13 ms, measured on this repo | **Use.** Already a dependency |
| difftastic 0.70.0 | Structural diff | MIT | Declared budgets, then an honest line-diff fallback, all three constants verified in options.rs | Reject the binary, copy the declared-budget pattern |
| diffsitter | Same idea, smaller | MIT, unre-verified | | Reject |
| GumTree | AST differencing | **LGPL-3.0** | JVM required | Reject on license |
| srcML | Source to XML | **GPL-3.0** | | Reject on license |
| watchman | Watching daemon with since queries | MIT | `is_fresh_instance` is meaningful only on a since query, its own docs | Reject the daemon, copy the first-check honesty field |
| ast-grep | Structural search | MIT | 9 native platform packages | Consider later, only as a confirmed executable |
| comby | Structural rewrite | Apache-2.0 | quiet 2 months | Reject |
| lychee | Link checker | Apache-2.0 | | Reject the binary, path checking is 40 lines over git ls-files |
| MarkdownSnippets | Transclusion of code into markdown | MIT | | Pattern only. Evidence is a quoted span, never a paraphrase |
| Swimm | Commercial doc auto-sync | proprietary | Marks docs "potentially out of date" and fails a check. Its docs call Auto-sync patented | Pattern only, and the patent note goes in the brief |
| Salsa | Incremental computation framework | docs cited | Backdating verified verbatim in its live docs | Pattern. A re-check with an identical answer keeps its old stamp |
| Dagster asset staleness | Freshness vocabulary | docs cited | "Unsynced" has exactly 3 causes and is not transitive | Pattern. Drift never spreads across the canvas |
| arXiv 2605.17062 | Hallucination base rate | paper | 4.62 to 6.10 percent of external-entity claims invented, frontier models, verified abstract | Evidence. Check every claim, never sample |

### 5.9 Where the map lives

**The answer.** Inside the user's repository as ordinary tracked files, with Tortie's derived
cache in a disposable database outside it. The industry record, verified in current source, is
that the two stores that survive a rename live inside the repository and the three that break
are all path-keyed outside stores. VS Code hashes the path into workspace identity on every
platform. Zed has a unique index on the serialized path array, verified at persistence.rs line
732. Roo Code's checkpoint engine throws "Checkpoints can only be used in the original
workspace" after a move. And Cline, whose docs popularized the shadow repository, now keeps
checkpoints as private refs inside the user's own repository, with only its documentation page
still describing the old mechanism.

| Candidate | What it does | Key verified fact | Verdict |
|---|---|---|---|
| Tracked files in the user's repo | The contract is committed and reviewed | Freshness is commit arithmetic over the shared history, computed by the one `git log --name-only` walk in section 4.4, which replaced this band's original per-anchor `git rev-list --count` form. 8 of the operator's 30 documents are over 250 commits behind, which this arithmetic would have caught | **Use** |
| Custom ref namespace `refs/tortie/arch` | Commits invisible to status and branches | Cline ships this shape today. Leaks into `git log --all`. Auto-gc pause after about 2,233 revisions | Consider only as an opt-out fallback. Loses pull-request review |
| git notes | Attach data to commits | `notes.rewriteRef` has no default, so an amend silently orphans the note, verified in git docs | Reject |
| Orphan branch | Parallel history | Invisible to `push --all` or visible in the branch list, both bad | Reject |
| Linked worktree | Second checkout | Breaks with "fatal: not a git repository" when the project moves | Reject |
| Separate GIT_DIR plus core.worktree | The dotfiles pattern | Roo Code's shipped version refuses after a rename, verified in its source | Reject |
| Bare repo in app data | Push map revisions outside | Path keyed, inherits the rename failure | Reject |
| jujutsu | A second VCS colocated with .git | Its own docs say corruption "is possible because the backend is not entirely lock-free" and it has no gc yet | Reject |
| isomorphic-git | Pure JS git | MIT, 1.41.4, alive | Reject, a second git implementation beside the existing exec layer |
| libgit2 / nodegit | Native git library | GPL-2.0 with a verified linking exception | Reject, native code duplicating an existing capability |
| dugite | GitHub Desktop's git | MIT, but postinstall downloads a full second git per platform | Reject |
| SQLite via openGmuxDatabase | The derived cache | 50 of 50 writes in 0.09 s under a contention shape where bare git lost 40 of 50 | **Use, for the derived side only** |

### 5.10 The map as a checkable contract

**The answer.** The reflexion model is real, verified to its 1995 source, and no tool in the
field ships its diagram-level absence report, so the roughly 200 lines Tortie writes are the
missing third output of a 31-year-old technique rather than a reimplementation. The field's own
adoption tooling settles blocking versus showing, because every mature tool ships a baseline or
threshold ramp, and the one worth copying is ArchUnit's read-only violation store. The winner
design in section 4 is this band's verdict built out in full.

| Tool | What it asserts | SPDX | Last release | Key fact | Verdict |
|---|---|---|---|---|---|
| Write our own | Boxes as globs, arrows as promises, three-way reflexion diff | Apache-2.0, ours | n/a | 45 ms imports plus 174 ms channel scan on 905 files, rerun during the deep read with 14 divergences and 2 absences found on the live Phase 41 tree | **Use** |
| dependency-cruiser | Forbidden and `required` dependency rules, `reachable` facts, baseline ratchet | MIT | v18.2.0, 2026-08-10 | The only tool that can assert one promised edge, via `required` rules, verified in its rules reference. No diagram input | Consider, then reject. The box list would be written twice |
| ArchUnit | Layers, slices, PlantUML adherence, frozen violation stores | Apache-2.0 | v1.5.0, 2025-08-04 | `freeze.store.default.allowStoreUpdate=false` makes the baseline read-only. Diagram violations documented in one direction only | Reject, wrong language. Copy the read-only store and the middle strictness mode |
| ArchUnitTS | Same family for TS | MIT | v2.4.0, 2026-07-26 | One maintainer, pulls its own typescript, exports 6 formats, validates none of them | Reject |
| ts-arch | Same family | MIT | v5.4.1, 2024-12-23 | Depends on npm placeholder packages `fs` and `path` | Reject, dead by evidence |
| import-linter | 6 named contract types | BSD-2-Clause | v2.13, 2026-07-03 | Exemptions that fail when no longer needed | Reject, wrong language. Borrow the vocabulary |
| tach | Declared depends_on | MIT, settled by its LICENSE and classifier | v0.35.0, 2026-05-12 | | Reject, wrong language |
| eslint-plugin-boundaries / Nx / Deptrac / arch-go / PyTestArch | Boundary rules per ecosystem | MIT all | mixed | arch-go's compliance threshold is the honest headline-number pattern | Reject, wrong language |
| Spring Modulith | Verify modules, then generate C4 from the verified model | Apache-2.0 | current | Diagram as output, never input | Reject, wrong language. Its verify-then-draw order is the L2 model |
| Sonar Architecture / Sonargraph | Drawn intent checked against code | Commercial | n/a | | Reject on license |
| arXiv 2606.27045 | Reflexion plus fitness functions for AI-assisted development | paper | 2026-06 | Treats drift as merge-blocking | Read as a warning. The first map measured 6 wrong divergences out of 14, so blocking is wrong on day one |

### 5.11 Having the user's own agent build the map

**The answer.** Tortie can produce the narration by driving agent binaries the user already
installed and already confirmed, with zero new dependencies, zero license exposure, zero CSP
change and zero entitlement change. The recommended order is the one the band modelled, being
that Tortie computes the structural graph itself first, hands it to the agent as text second,
and the agent writes only the prose and the promises, which the band modelled as cutting the
first-build cost by about 45 percent. Tortie is never the caller and holds no key.

This table carries no license column, because nothing in it ships in the bundle. Every row is
a binary the user installs and confirms through Settings then Agents, and the one npm package
in the table states its license oddity on its own row.

| Name | Drivable headless? | Key verified fact | Verdict |
|---|---|---|---|
| claude (Claude Code) | Yes, `-p --output-format json` | `total_cost_usd` in the JSON result, `--json-schema` enforces shape. Omit `--bare` so subscription auth works. Without `--bare`, a `-p` run executes the repo's hooks and MCP servers with no trust prompt, stated on the sheet | **Use.** The only CLI whose JSON reports dollars |
| codex | Yes, `codex exec` | `-o <file>` lands output with zero write-tool grant, `--sandbox workspace-write` bounds writes, `--ephemeral` leaves no session files | **Use.** Smallest permission surface |
| gemini (Gemini CLI) | Yes, `-p -o json` | 1,000 free requests per user per day, verified on the quota page | **Use.** The verified $0 path |
| cursor-agent | Yes | JSON usage reporting undocumented | Consider, cost cannot be shown |
| opencode | Yes, plus serve and ACP | Local models supported, fully offline build possible | Consider, the local-model escape hatch |
| qwen | Yes | Free tier discontinued 2026-04-15, its own auth doc | Consider, BYOK only now |
| amp | Yes | Zero markup on provider prices, account required | Consider |
| pi / agy / muse / codewhale | Yes | agy confirms `--json-schema` locally, muse is 0.1.0 | Consider |
| droid (Factory) | Yes | JSON result has no token or cost field | Consider |
| deepseek CLI | Opaque | `exec --help` lists no flags at all | Reject as a driver |
| aider | `--message` | Last release 2025-08-09, 12 months silent, no JSON output | Reject, dormant |
| @anthropic-ai/claude-agent-sdk | npm wrapper | License field is "SEE LICENSE IN README.md", 8 optional platform binaries | Reject for bundling. Spawn the user's binary |
| Factory wiki | CI-triggered wiki | Output stored "in the Factory App with Cloud Sync" | Reject, fails offline |
| MCP stdio, Tortie as server | The later machine-facing option | Revision 2026-07-28, stdio is a client-launched subprocess, so Tortie runs no daemon | Use in a later phase, ship the file convention first |

### 5.12 Canvas UX at scale, and keyboard-first navigation

**The answer.** Six verdicts, all surviving the deep read. Use discrete named levels instead of
continuous semantic zoom, because Google Maps spends about 5 zoom doublings per detail step and
Tortie's whole panel-zoom ladder spans a factor of 2.67. Do not bundle edges, per the verified
IEEE VIS taxonomy paper on bundling's faithfulness cost. Build the keyboard as a treegrid over
the contract's own ordering, never a geometric guess over pixels, with draw.io's shipped
parent, child and sibling keys as the containment precedent and an edge-list native menu as the
one genuinely new verb, since no surveyed tool can follow a single edge from the keyboard. Send
selections to agents as compact deterministic text, never an image, the verified Figma default.
Encode provenance with containment plus a glyph badge and spend no hue on it. Copy Perfetto's F
key, where one press centers the selection and a second press fits it.

| Name | What it offers this band | SPDX | Key fact | Verdict |
|---|---|---|---|---|
| Data Navigator 3.0.0 | A navigation structure with real edges driving keyboard and screen reader movement over any drawing | MIT | 3.0.0 on 2026-06-03, renames its rules to drill-in and drill-out, 64 stars | Consider. Copy the three-part architecture, vendor the ideas rather than the package |
| React Flow keyboard model | Tab order plus arrows that move the node, not the focus | MIT | No edge traversal documented | Its keyboard model is replaced wholesale by ours |
| Highcharts accessibility module | Two-axis series navigation | Proprietary | | Reject the dependency, copy the two-axis pattern |
| Perfetto UI | Camera keys, F to focus then fit | Apache-2.0 | | Pattern only |
| CSS Spatial Navigation | Geometric arrow focus | W3C draft, stalled since 2019 | Same key lands differently after any re-layout | Reject |
| draw.io keyboard | Tab siblings, Alt+Shift+P parent, children and sibling selectors | Apache-2.0 upstream | Verified from its shortcuts sheet | Pattern, the one shipped hierarchy-traversal precedent |
| Figma MCP selection payload | Sparse structured text by default, screenshot a separate tool | product | | Pattern for the handoff payload |
| Wallinger and Kobourov 2026 | The bundling task taxonomy | paper, IEEE VIS short | Faithfulness and legibility trade directly | Evidence for the no-bundling rule |

---

## 6. The graveyard, and why this feature usually dies

This section carries the strongest argument against building anything, and it is given full
weight because the operator should read it before reading any build plan. Every fact below was
verified against the primary source on 2026-08-15 or 2026-08-16.

### 6.1 The dead

| Name | What it was | Fate, verified | The lesson |
|---|---|---|---|
| Sourcetrail | Offline interactive source explorer, deterministic, correct, 4 languages | Archived December 2021 at 16,490 stars, GPL-3.0 | Deterministic and correct did not produce visits. The founder cited maintenance burden and impossible monetization |
| CodeSee | Hosted code maps, $10M raised | Company closed February 2024, assets absorbed by GitKraken 2024-05-14, product site 404 | The closest shipped product to this feature no longer exists as a product |
| Structure101 | Architecture control for Java and .NET | Acquired by Sonar. The FAQ answer to "still be available for sale?" is the single word "No" | |
| Structurizr cloud | Hosted C4 workspaces, by the author of C4 | Read-only 2026-07-01, shutdown 2026-09-30, companion repos archived 2026-02-01 | Teams were "reluctant to publish architecture diagrams to the cloud and usage had steadily declined" |
| GitHub repo-visualizer | Repository treemap Action | Archived 2026-08-06 | GitHub itself walked away from repository visualization |
| Visual Studio Architecture Explorer, UML from code | IDE architecture tooling | Removed, announced 2014-10-24 | Microsoft's own words, "complicated to use" and "not very useful in its current form" |
| Swimm's documentation product | Docs that detect their own staleness | Pivoted to mainframe modernization. Drift detection is gone from the pitch | The company built on drift detection no longer sells drift detection |
| CodeViz auto-maps | YC S24, automatic codebase maps | Repositioned within 2 years as a collaborative diagramming tool | Auto-generation was demoted from the pitch |
| NanoAPI | "Picks up where CodeSee left off" | Repository has no license file, last push 2026-04 | |

### 6.2 The survivors, and what each does differently

| Name | Alive, evidence | Survival pattern |
|---|---|---|
| SciTools Understand | v7.1, 2026 | Graphs generated on demand, compliance market, now leads with AI summaries per graph node |
| NDepend | v2026.1.6 | The graph is a feature behind quality gates. Ships an MCP server naming Claude Code as a client |
| Sonargraph | News 2026-08-13 | Executable architecture DSL. Its new Zügel MCP server "exports known architecture violations that can then be fixed by the coding agent" |
| CAST Imaging | Live | Deterministic maps sold as agent context, "Headless via MCP, with no interface required" |
| Softagram | Live, $19 per developer per month | The diagram arrives as a pull-request check, at the one moment a break is cheap |
| JetBrains diagrams | IntelliJ 2026.2 | Generated on demand, nothing stored, diagrams "always reflect the structure of actual classes" |
| VS Code Map | Doc dated 2026-04-15 | On-demand DGML, and Microsoft's own doc concedes large maps hit memory limits |
| ArchUnit | v1.5.0, 2026-08-04, Apache-2.0 | No picture at all. The model is a failing test |
| IcePanel, Ilograph, Eclipse Papyrus | Live | Hand-authored diagrams for teams that chose the tending cost knowingly |

### 6.3 The five failure modes, and where this design stands on each

| Failure mode | The evidence | This design's answer |
|---|---|---|
| Stale and untrusted | 8 of the operator's own 30 documents are over 250 commits behind. A map seen stale twice is never trusted again | Freshness is computed from git, never self-reported, and staleness of prose is stated in the handoff payload itself |
| Confidently wrong | DeepWiki describes LibreOffice as using Buck. The measured hallucination base rate for external-entity claims is 4.62 to 6.10 percent | Every claim carries a verdict, a false claim renders contradicted at a named line, and the conservative rule keeps extraction failure from masquerading as verification |
| The hairball, the field's own name for a drawing with too many crossing edges to read | Microsoft's current doc concedes it. NDepend switched to a matrix past "a few dozens boxes" | Hard caps of 12, 20 and 30 boxes per level, and a matrix past 30 |
| Unopened on day thirty | The Atlas VS Code extension has 10 installs. No public retention measurement exists for any tool in the category | The primary consumers are the commit gate, the SCM view and the agents reading the files, none of which requires remembering a rail icon. The pane is sized for weekly visits and the canvas is gated on observed use |
| Cannot beat the free competitor | The operator can ask any open session for a mermaid drawing at zero cost, and Anthropic's /doctor deletes architecture overviews as derivable | The one row the free competitor cannot win is the deterministic catch, a crossed boundary at a named line within half a second, and the design leads with that row |

### 6.4 The finding that argues for building anyway

In one week of August 2026, 4 commercial vendors were verified live selling architecture models
as agent context over MCP or the equivalent, being NDepend, Sonargraph, CAST and SciTools. The
market has concluded that the reliable reader of an architecture map is a machine. That is the
strongest external argument for the operator's feature, and it arrives with the Tortie-specific
constraint that Tortie itself must never be the caller. The agent reads the contract from the
repository. Tortie draws and checks.

---

## 7. Staleness, provenance and being wrong

### 7.1 The exact record kept per claim

One ArchVerdict row per claim, in `arch.db` only, with the fields in section 4.3. The rules
that govern it, each with its verified source.

- **Two axes, never collapsed.** Agreement is one of convergent, divergent, absent or
  unverifiable. Coverage is one of checked, partly-checked or unverifiable. "I could not check
  this" and "this is false" are never stored in one field and are never drawn in the same
  style.
- **Backdating, the Salsa rule, verified in its live docs.** A re-check that produces an
  identical answer keeps its old `checkedAtCommit`, so the surface never claims fresh
  verification for work it did not do.
- **Non-transitivity, the Dagster rule, verified in its live docs.** A component whose own
  anchors are untouched stays at its own verdict when a neighbour drifts. One drifting
  component never marks many nodes at once, because a surface that shows many new marks on its
  own is the dashboard the Zen refuses.
- **First check, the watchman lesson.** `firstCheck: true` renders as "not yet checked", never
  as "changed", because watchman's own docs define its freshness field as always true outside a
  since query.
- **Declared budgets, the difftastic rule, verified in its source.** Past budget, a claim
  reports unverifiable with the reason, never verified.
- **The generation stamp.** A run that never finished renders its unfinished claims as
  first-check question badges, never as stale verdicts, so a quit mid-ladder cannot mix epochs
  invisibly.

### 7.2 What the canvas and the list show

| State | On the canvas | In the list | Never |
|---|---|---|---|
| convergent, checked | Solid border and solid arrow in the neutral border token | Plain row | No celebration state |
| divergent | Dashed arrow in the existing error token, the only red on the surface, with the offending file and line one Return away | The lead row, most severe first | Never a rail badge, never a blocked commit |
| absent | A hollow arrow, the diagram-level absence report no shipping tool has | Row with the promise text | |
| unverifiable | A codicon question glyph, dotted stroke in the muted token | Row with the plain reason sentence | Never visually confusable with divergent |
| moved | Dashed border, candidate path in the prose panel, emitted only when git names exactly one rename | Row with the arrow glyph | Never a basename guess |
| drifted prose | A hollow ring on the provenance glyph. The number lives in the prose panel, e.g. "34 commits since this description was written, and 12 files changed uncommitted" | Freshness ribbon sentence | Never a counter on the node, never amber, never yellow |
| accepted divergence | Muted row with its `because` and its date, always counted in the strip | Always visible | Never hidden |

The verdict strip reports by coverage, e.g. "12 checked and hold. 1 broke. 2 accepted. 21
cannot be checked." Nothing on any surface pulses, loops or animates. The needs-input pulse
remains the only perpetual motion in the app.

### 7.3 The residue that cannot be fixed, stated so it is never discovered later

Every checker is an existence test and none is a liveness test. The worst case is superseding
by addition, where an agent reroutes a behaviour by writing a new module elsewhere and leaves
the old files in place. The anchors exist, no commit touched them, the evidence quotes still
match, and the box renders checked while describing code that stopped executing. Two
mitigations narrow it, being drift counting on the component's computed import neighbourhood
rather than its anchors alone, and the strict vocabulary where the glyph claims "anchors and
quotes hold" rather than "true". The residue past that is the ceiling of any static premise,
and the surface says so in its legend rather than hiding it. The other permanent limits are
listed in section 12.

---

## 8. The Zen question, as one decision

The operator said the Zen may need upgrading. The finding is that one addition is required and
no existing word changes. This section gives the exact current words, the exact proposed words,
and the two conditions, so it can be accepted or rejected as a single decision.

### 8.1 The exact current words that stay untouched

The refusals section opens at line 104 of `docs/ZEN-OF-TORTIE.md` with this sentence, and it is
the test the proposal is held to.

> A principle that forbids nothing is decoration. These are the refusals:

The two existing refusals nearest this feature, quoted exactly, and both survive unedited.

> - **Not a dashboard.** No counters, no activity feeds, no progress theatre. A number that
>   rises on its own is not a signal, it is noise in a nicer font.
> - **Not an IDE rebuilt from scratch.** Search across projects earns its place, because agents
>   rewrite code faster than a human can track it. Structural search, replace-in-files,
>   language servers, debuggers, task runners and extensions do not.

### 8.2 The exact proposed addition

The proposed text below is written in the Zen document's own voice, which uses listing rhythms
inside sentences that this report's own writing rules avoid, e.g. the existing "no counters, no
activity feeds, no progress theatre". The addition has to read as part of that document, so it
follows the Zen's rules rather than the report's.

One new section, inserted after "Give every thread a place" (line 45) and before "Hide the
machinery" (line 61).

> ## The shape of the work is a promise, and promises are checked
>
> Agents write more code than a person can read.
>
> A file tree answers where something is. It cannot answer what the project is made of, which
> parts are ours and which are leaned on, or whether the shape the team agreed on is still
> true. When most of the code was written by an agent, those are the questions a person needs
> answered, and today they live only in the head of whoever last read the whole thing.
>
> So Tortie holds the project's shape as a set of promises written into the repository. Each
> promise names two parts and the way they are allowed to touch. Tortie checks the promises
> against the code and says which ones hold, which ones broke at exactly which line, and which
> ones it cannot check. The drawing is a picture of the promises, never the source of truth,
> because the repository always wins.
>
> Two things keep it honest. A promise that fails names the offending line. A promise Tortie
> cannot check says so on its face, because a map that goes quietly stale is worse than no map
> at all.

Two new bullets added to "What Tortie is not".

> - **Not a diagram you maintain.** Tortie never asks a person to draw the architecture, keep a
>   picture current, or learn a notation. The promises are stated once, in plain files, and the
>   code is measured against them.
> - **Not a map that acts.** Checking a promise is Tortie reading files. Writing or rewriting
>   the promises is a person's decision, or a person's agent doing the work where they can see
>   it. Nothing Tortie draws ever starts a process on its own, and no verdict ever touches a
>   session's status.

One clause appended to the existing "Not an IDE rebuilt from scratch" bullet, after "Search
across projects earns its place, because agents rewrite code faster than a human can track
it."

> A checked map of the project earns its place for the same reason.

### 8.3 What changes, what must not change, and the two conditions

What changes is exactly the above, being one section, two bullets and one clause. Nothing is
deleted, weakened or reworded. Every Phase 23 refusal survives verbatim, and the table in the
charter reading names why each one is exactly the pressure this feature would otherwise erode,
e.g. refusal 8 because automatic freshness is the feature's whole temptation, and refusal 2
because "let people define their own node types" is a contribution registry with a different
name. The dashboard refusal survives because counts live in the strip and the prose panel and
never on a node. The parity cap survives because its own escape clause is satisfied, the
operator asked explicitly, and the phase brief records that fact.

All three judges endorsed the addition as the minimum honest change, and all three attached the
same two sequencing conditions.

1. The bullet "Nothing Tortie draws ever starts a process on its own" is false until the argv
   fix in section 4.7 lands, because the unfixed checker routes contract fields into spawned
   git argv on a watcher event. The fix lands first, then the bullet is true rather than
   aspirational.
2. The phrase "a person's agent doing the work where they can see it" must not be readable as
   blessing a silent agent write to `baseline.json`, so the accepted-divergence visibility rule
   ships in the same phase that adds the words.

Why this is the minimum honest change rather than none. One design argued no change was
required while also recommending an optional clause, and its own adversary rejected that as
wanting credit for both answers. The Zen currently has no positive principle covering any map
of the project, and by the Zen's own opening test a feature this large shipping without its
refusals on record leaves the next round free to grow it into a dashboard. The addition adds
two refusals and deletes none, which is the direction the document itself demands.

---

## 9. What the surface should show, derived from the operator's own corpus

The specification for the content is not invented. It is reverse-engineered from the 30
distinct AS-BUILT-ARCHITECTURE.md documents the operator has already written, being 52,719
lines with a median of 1,174 lines, a shortest of 187 and a longest of 7,050. 27 of the 30 draw
their systems with box-drawing characters, across 555 unlabelled code fences that exist only
because plain text was the only canvas, plus 662 markdown tables. These documents are a typed
graph serialized to markdown because markdown was the only renderer available, and the Arch
surface renders that graph.

### 9.1 The shared skeleton, with counts

| Section | Docs of 30 | Tier | Where it lands in the design |
|---|---:|---|---|
| System Overview | 29 | Always | `subject` plus the level 0 drawing |
| Layout and inventory | 26 | Always | Components with anchors at level 1, computed modules at level 2 |
| Table of contents | 24 | Always | The sidebar outline |
| Data flow and lifecycle | 23 | Usually | `flows` at level 3 |
| Architecture drawings | 21 | Usually | Levels 0 and 1 |
| Security, tokens, auth | 20 | Usually | Prose on the relevant nodes, `authenticates-with` edges |
| Data model and schema | 19 | Usually | `store` nodes plus `reads-from` and `writes-to` edges |
| Configuration | 19 | Usually | Prose plus `platform` nodes |
| Deployment and build | 18 | Usually | `deploys-to` edges and `platform` nodes |
| API surface | 15 | Sometimes | Edge labels and entry files. A dedicated route view is deferred |
| Gaps and roadmap | 14 | Sometimes | `gaps`, the pinned strip, first class |
| Last Updated stamp | 14 | Sometimes | Replaced entirely by git arithmetic, which cannot lie |
| Design decisions | 13 | Sometimes | `note` and `description` prose, never verified, labeled |
| Scope note | 13 | Sometimes | `subject` and the contract's own identity, one per repository |
| Concepts and glossary | 12 | Sometimes | Prose panel |
| External dependencies and boundary | 10 dedicated, all scatter it | Sometimes | The provenance taxonomy, first class on every node |
| Performance | 6 | Rare | Prose |
| Observability | 6 | Rare | Prose |
| Testing | 4 | Rare | Prose |

Four sections carry the load in 23 to 29 of the 30 documents. A surface that renders only those
four is already useful, and one that demands all nineteen will never have a complete input.

### 9.2 The node kinds the corpus actually uses

| Node kind | Identified by | Docs of 30 | In the contract model |
|---|---|---:|---|
| System | Product name plus one-line subject | 29 | `subject` |
| Layer | A named horizontal band | 21 | `layers` |
| Component | A name plus a one-line responsibility, anchored to a directory | 26 | `component` |
| Module | A filename inside a component | 26 | Computed at level 2, never authored |
| Symbol | A backticked identifier | 796 mentions corpus-wide | The existing symbols store, listed in the prose panel |
| Route | Method plus path template | 15 | Edge labels, deferred as a dedicated view |
| Command | A CLI verb | 6 | Edge labels |
| Table | A database table | 19 | `store` node prose |
| StateEnum | A named set of states | 19 | A flow with `shape: 'states'` |
| Store | A durable location | 26 | `store` |
| Process | A separately scheduled runtime | 14 | `process` |
| ExternalService | A vendor reached by URL | 10 | `external-service`, drawn outside the boundary |
| Dependency | A package plus a pinned version | 10 | The manifest checker plus provenance `package` |
| Config | An env var or config key | 19 | Prose plus `platform` |
| Decision | A titled paragraph asserting a choice | 13 | `note`, prose |
| Gap | A titled claim about what is thin | 14 | `gaps`, first class |
| Doc | A sibling document | 29 links | Ordinary editor opens |

### 9.3 The edge kinds, which are the corpus's verbs

| Edge kind | Reads in the documents as | Checkable ceiling |
|---|---|---|
| contains | Tree indentation | Structural, the `layer` and component containment, fully checked |
| imports | "depends on", a dependency matrix | Fully checked for the six grammars, through the manifest-aware resolver |
| calls | "calls", "invokes" | `partly-checked` at best, via evidence quotes. Never drawn as verified, because every honest tool in the extraction band admits call arrows from name matching are unsound |
| reads-from, writes-to | "reads", "queries", "upserts" | Evidence quotes only |
| spawns | "spawns", "shells out to" | Call-site detection plus evidence, `partly-checked` |
| emits, subscribes | "publishes", "fan-out" | Evidence only, with the flow `group` field for parallelism |
| deploys-to | "deployed on", a wrapping box | Manifest files are mechanical, posture is prose |
| authenticates-with | A labelled arrow naming the token | Evidence only |
| transitions-to | Arrows between states | A `states` flow, evidence checked |
| supersedes | "deprecated", struck through | `deprecated: true`, structural |

The load-bearing observation is that structural edges are computable and behavioural edges are
what the operator spends his arrows on. The contract carries both, checks the structural ones
fully, and marks the behavioural ones with their honest coverage forever.

### 9.4 The provenance taxonomy, with the mechanical test for each category

This answers the operator's named ask directly. Nine categories are in use across his corpus.
Four are fully computable, four are detectable with the explanation left to prose, and one is
computable for existence only. Zero of the nine yield purpose mechanically. A pipeline that
computes everything it can and asks a model only for the prose does about 60 percent of the
work locally.

| # | Category | Contract value | Mechanical test | Verdict on computability |
|---|---|---|---|---|
| 1 | Written in this repository | `first-party` | Tracked by git, not under a vendor directory, not matched by the generated rules | Full |
| 2 | Vendored copy | `vendored` | `vendor/` and `third_party/` paths are mechanical. The fork point and the reason are prose | Partial |
| 3 | Package dependency | `package` | Parse the five manifest kinds | Full |
| 4 | Native code linked in | `native` | A `.a`, `.so` or `.dylib` artifact, a `build.rs`, a cgo import | Full |
| 5 | Spawned command-line tool | `spawned-tool` | exec and spawn call sites are mechanical. The argv's meaning is prose | Partial |
| 6 | External network API | `external-api` | An SDK in a manifest or a URL literal is mechanical. The purpose sentence is prose | Partial |
| 7 | Database or durable store | `data-store` | A migrations directory, a `.sql` file, an open call, a bucket binding proves existence. Which copy is canonical is prose | Existence only |
| 8 | Generated artifact | `generated` | Gitignore entries, build-output directories, generated headers, the narrator skill's exclusion list | Full |
| 9 | Platform service | `platform` | `vercel.json`, `wrangler.jsonc`, a plist, a workflow file, a Dockerfile. Runtime posture is prose | Partial |

### 9.5 The visual encoding for provenance, chosen and rejected in one table

| Encoding | Verdict | Deciding reason |
|---|---|---|
| Containment geometry, ours inside the system boundary and not-ours in a column outside it | **Chosen** | The corpus already draws trust boundaries by nesting, in 27 of 30 documents, and geometry carries the one bit that matters at level 0 |
| One codicon glyph per category, with a nine-swatch legend that filters | **Chosen** | No hue spent, WCAG 1.4.1 satisfied by construction, one icon set per the design authority, and "show me only what we did not write" becomes one click |
| Struck-through rendering for `deprecated` | **Chosen** | The corpus strikes things through in prose today because ASCII has no other way |
| Box area encodes size in lines, at level 1 | **Chosen** | Only 1 of the operator's 30 documents managed a size signal by hand, and equal boxes hide a 100-fold gap |
| One hue per category | **Rejected** | DESIGN.md spends color on exactly one thing, state. The measured six-lane identity ramp is the whole categorical budget, and nine hues exceed it |
| Yellow or amber for any staleness or provenance mark | **Rejected** | No yellow, ever. The measured ΔE2000 distances make any yellow read as "needs you" |
| Count badges on nodes | **Rejected** | The dashboard refusal. Counts live in the strip and the prose panel |
| Motion, pulsing or flowing edges for drift | **Rejected** | The needs-input pulse is the only perpetual motion in the app |
| Edge bundling for visual calm | **Rejected** | The verified taxonomy paper's finding, bundling trades faithfulness for legibility, and a wrong-looking arrow on this surface is a lie |

### 9.6 Screen by screen, with the box count at each level

Levels are discrete named drawings, never continuous semantic zoom. Panel zoom keeps its one
sanctioned meaning, and the canvas's own pan and fit is the same S14 exception the image viewer
holds.

**Why a fifth view rather than a mode of the Context view.** The two views answer different
questions from different data. The Context view renders the per-agent substrate table, which
answers what each installed agent will read as context, in what order, and when it reloads, and
its data is derived from the agents' own configuration surfaces. The Arch view renders the
contract in `docs/arch/` and the verdicts in `arch.db`, which answer what the repository is
made of and whether its promises hold. Phase 23 refusal 4 names Context's own data as a surface
no configuration mechanism may touch, and `docs/arch/` is a configuration mechanism by that
rule's own vocabulary, so folding Arch into Context would place an agent-writable file set
inside the one view whose data that refusal protects. Keeping the views separate keeps the
boundary mechanical rather than argued, and the import-boundary build assertion in section 4.5
extends the same way, so `main/arch/**` never imports `main/context/**`.

**The sidebar, always present.** Top to bottom: the header band with the subject and the
refresh action, the freshness ribbon in one sentence, the verdict strip reported by coverage,
the failure list with jump-to-line, the component outline as a treegrid, and the pinned gap
strip. The header carries 2 controls, so it is expected to fit at the 220 px minimum. That is
an estimate from the layout rules, not a measurement, because nobody launched the app in this
workflow, and the first slice's Tier 2 screenshot probe is where it gets checked.

| Level | What a box is | Count, with the source of the number | What an arrow is |
|---|---|---|---|
| L0, the one screen | One box per layer, plus externals in the outside column | 5 to 9, hard cap 12. The operator's 30 documents never open with more than 9, CodeBoarding compiles 5 to 8, GitDiagram budgets 12 to 22 | An asserted promise between layers, one or two word label, verdict styling |
| L1, a layer opened | Components, with provenance glyphs, area by size, deprecated struck through | 6 to 20 per layer, the corpus's own range. The outline always lists everything, only the drawing is capped | Promises between components |
| L2, a component opened | One computed box per file, labeled with its path, click opens the file, symbols in the prose panel | Up to 30, then the view switches to a dependency matrix, the NDepend precedent, capped near 200 rows, then a top importers and importees list | Real import edges, computed, never authored |
| L3, a flow | A step in an ordered chain, lanes for sequences, a state diagram for enums | 4 to 13 steps, at most 5 lanes, the corpus's own budgets | The flow itself, with `group` marking parallel steps and the reason note attached by step number |

The persistent surfaces at every level: the prose panel on the right for whatever is selected,
the nine-glyph provenance legend acting as a filter, and the freshness sentence. He should be
able to read L0 standing back, with no scrolling and no panning.

### 9.7 How the corpus links to code, and what the surface jumps on

| Form | Corpus count | Share of code references | Jumpable? |
|---|---:|---:|---|
| Backticked path | 2,901 | about 73 percent of raw matches | Yes, resolved against the repository root |
| Backticked `symbol()` | 796 | about 20 percent | Yes, through the existing symbols store |
| Path with line number | 176, concentrated in 5 documents | about 4 percent | Yes, and the most precise |
| Markdown link to a file | 29 | under 1 percent | Yes, sibling documents |
| Bare package name | inside about 100 manifest mentions | small | Only to the manifest entry, correctly, since it is not in the repository |
| Prose reference with no backticks | uncounted, very common | | No, too loose without a model |

One correction binds this table. The 73 percent figure is a raw regex share, and the staleness
band's classifier experiment found that only about 1 in 6 backticked spans survives
classification as a real path claim, with the rest being runtime artifacts, gitignored files,
templates and mis-classified spans. The same experiment found the freshest document resolved
worst at 64.6 percent and the stalest best at 90.5 percent, so a raw miss count must never be
rendered as a staleness signal, and the contract's evidence records are explicit claims rather
than mined spans for exactly this reason.

---

## 10. The first slice, written as a buildable phase

**Name.** The contract without the canvas.

**What ships.**

- The `docs/arch/` format, being contract, components, edges, flows reserved, baseline, with
  the hand-written schema, the hand-written validator, drop-whole-row errors naming file, field
  and reason, and the path rules including the leading-dash rejection.
- The `arch` IPC domain with `arch:load`, `arch:check`, `arch:skeleton`, `arch:checked` and
  `arch:progress`, per the five-edit recipe, plus the registrar and disposer in
  `installMainCapabilities`.
- Import captures in the existing tags queries, the edge table in a new disposable `arch.db`
  through `openGmuxDatabase`, and the manifest-aware resolver for TypeScript, JavaScript and Go,
  with Rust and Python resolution deferred rather than shipped wrong and their imports marked
  unverifiable.
- The checkers, being imports with the conservative rule, manifest, glob, evidence at HEAD, and
  freshness including the uncommitted-files line, with the argv defense and its hostile fixture.
- Watcher-ridden re-checks on the existing fan-out, the snapshot pair at launch, coalescing,
  the settle window and the generation stamp.
- The fifth sidebar view through the full registration cascade of section 4.12 including the
  View menu item, with the
  verdict strip reported by coverage, the failure list with jump to the offending line, the
  component outline with provenance glyphs, the gap strip, the freshness ribbon and the prose
  panel rendering plain text only.
- The teaching empty state with the deterministic "Draft a contract" skeleton opening as
  unsaved editor buffers, the corpus-seeded prompt action through the ordinary new-session
  flow, and the promise-set guidance at 5 to 10 promises.
- `npm run conformance:arch`. Its cost of about 1 s is a target, not a measurement, because
  the gate does not exist yet. It spawns nothing but fixed-argv git, and it validates the
  schema, the drop-whole-row behavior, the byte-deterministic skeleton, the planted divergence,
  the planted absence, the planted stale quote, the planted hostile anchor, and the per-language
  resolver fixtures. It joins the pre-commit sentence in CLAUDE.md beside `conformance:context`
  and `conformance:agents` for any commit under `src/main/arch/**` or `src/shared/ipc/arch.ts`.
- Divergence rows surfaced in the SCM view beside the changed files that caused them.
- The agent-read convention documented, one line pointing agents at `docs/arch/`.

**What is deliberately left out.** The canvas and both rendering packages. Flows rendering and
level 3. The computed level 2 view. The payload composer and send-to-session. The headless
narration sheet. Layout persistence. The regroup suggestion. SCIP absorption. Each is a later
slice, and the slice is honestly useful without them, because the operator can draft or convert
a contract and Tortie will tell him, within half a second of any agent's edit and at the
pre-commit gate, exactly which promise broke and where, which no drawing of any kind can do.

**What it costs to build.** This paragraph is an estimate with nothing measured behind it,
because nothing in this workflow built or ran code. Slice 1 is one phase of the standard
shape, being spec, parallel builders with disjoint ownership, an integrator and independent
verifiers. The new code is bounded, being the validator at about 200 lines, the five checkers,
the manifest-aware resolver, one IPC domain file with its registrar, the sidebar view with its
six regions, and the conformance script with its fixture repository. The two largest items are
the resolver with its per-language fixture matrix and the Tier 3 verification of the checkers,
and they are why this is a full phase rather than a small one. In surface it is comparable to
the search phase, which also added one sidebar view over a spawned binary. It blocks on no
other backlog item and adds no package, so it can be scheduled anywhere.

**Verification.** The checkers and the format are Tier 3, because they claim correctness about
repositories. Evidence, not assurance: a fixture repository with planted breaks whose verdicts
must match a written expectation table byte for byte, the hostile-argv fixture, the per-language
resolver matrix, and a live-app probe proving an overlay write spawns nothing beyond the fixed
argv set. The sidebar UI is Tier 2, one targeted probe plus one screenshot read through the
existing shot harness, which can already drive `sidebarView`. Gates are the standard battery
plus `conformance:arch`. One real narration run is measured during this phase and its cost and
wall clock replace the models in section 4.13.

---

## 11. The phases after it, in order

| Phase | Contents | What it unlocks |
|---|---|---|
| Slice 2, the aiming verb | The payload composer with byte-deterministic conformance proof, the broken-target gate, the gap staple, the two-grade payload, delivery through tmux load-buffer plus bracketed paste restricted to registry-launched sessions with the per-agent matrix at Tier 3, the terminal-reachable picker chord, and the computed level 2 module view with the divergence overlay | The north star's "point and riff" sentence, made textual. The one verb typing cannot replicate, being the deterministic scope check at handoff time |
| Slice 3, the refresh loop | The delta prompt scoped to drifted and contradicted claims, the session-change diff view built from verdict deltas, the standing-instruction docs, and the headless narration confirm sheet with its pinned launch-surface standing | Refresh whose marginal cost rounds to zero, and the one recurring daily moment a terminal answer renders badly |
| Slice 4, the canvas | The `arch` EditorMode arm on `@xyflow/react` plus `@dagrejs/dagre`, gated first on the CSS zoom spike and second on an observed usage number from slices 1 to 3, e.g. 20 composed payloads or gate catches in a month. Levels 0 and 1 drawn with verdict styling, provenance geometry, the legend filter, the treegrid keyboard model with the edge-list native menu, F to center then fit, and on-demand generation with positions persisted only once the surface earns repeat visits | The single-machine form of the wall the operator described. If the usage number is never reached, the canvas was never going to be opened, and the finding costs almost nothing because every earlier slice stands alone |
| Slice 5 and later, each its own decision | Flows at level 3 with the three drawing grammars. SCIP absorption through `@scip-code/scip` when a user-confirmed indexer has produced an index. The Louvain regroup suggestion rendered as a diff. Rust and Python resolver arms. A JSON Canvas one-way export. A seventh grammar at its stated size cost | Resolved references, better grouping, and the operator's Obsidian wall as an export rather than a runtime |

---

## 12. What is not true

Everything in this section is a limit of the evidence or of the design, stated so the operator
does not discover it later.

**Method limits.**

- Web search was unavailable for every band. All verification was direct fetch of named pages,
  registries and repository APIs. A relevant tool, paper or format under a name nobody thought
  to fetch could be missing from every table in this document.
- Nobody launched an app, ran a build or executed any candidate package. Every local number is
  a read-only measurement or a quote of an earlier phase's recorded measurement.

**Numbers that are modelled or extrapolated, not measured.**

- Every dollar, token count, turn count and wall-clock figure for the narration path. The
  prices are verified live. The rest is a model calibrated at about 1,200 files, unbounded
  upward on monorepos, and one real run is owed in the first slice.
- The 0.5 s full-check figure is derived from measured parts, not measured end to end.
- The cold-parse figures beyond this repository, being about 4.6 s at 10,000 files and about
  23 s at 50,000, are extrapolations from one earlier measurement.
- The freshness pass on a large history. The 200 to 300 ms budget scales from a 25 ms
  measurement on a 246-commit repository, and the correctness attack's warning that a stale
  monorepo could cost seconds is itself an unmeasured extrapolation.
- dagre's layout time at 30 boxes. Assumed under 100 ms, never measured at that size.
- The layout band's stability percentages are single-source local benchmarks on flat generated
  DAGs. Compound-node stability was never measured, which is one reason the design takes
  stability from storage instead.
- The month-three predictions. No public retention measurement exists for any tool in this
  category, so every judge's usefulness score is argued from precedents and from the operator's
  own corpus behavior, not observed.

**Licenses and maintenance states not fully confirmed.**

- scip-python's Apache-2.0 comes from its repository footer, not its LICENSE file.
- codanna's NOTICE attribution requirement was never read.
- diffsitter's license and recency were carried from a sweep without re-verification.
- The `@bufbuild/protobuf` unpacked size was not confirmed.
- Release dates were unverified for tree-sitter-graph, skott, scip-clang, lsif-node, Blarify
  and rust-analyzer's current version, all rejected on other grounds.
- Lattix could not be reached at all, and IcePanel, Ilograph and CodeScene liveness was
  accepted from a sweep unre-verified.
- Star counts above about 20,000 for repositories created in 2026 are uncorroborated and were
  not used for ranking.
- The EPL-2.0 shippability reading, and its rejection here, is a layperson's reading in every
  document of this workflow. If elkjs is ever wanted, a real legal read comes first.

**Design limits that are permanent under this charter.**

- Tortie never calls a model, holds no key and reaches no network host. Map quality is exactly
  the quality of the agent the user runs.
- No shared wall, no collaborators on other machines, no voice input and no E Ink surface. The
  collaboration and phone-reach shapes were killed twice in research 48 on "no cloud
  component", and the microphone entitlement is a refused addition. The north star's most
  important sentence, collaborators standing at the wall while a model listens and implements,
  is not delivered and cannot be under the current charter.
- The "thousands or tens of thousands of tokens per second" response times in the north star
  are a model-provider property no shell can supply.
- The map never refreshes its own meaning. Prose and promises change only by a person's hand
  or a person's launched agent, forever, because refusal 8 is permanent.
- No verified call graph and no verified dataflow arrow, ever, from the bundled extractors.
  Behavioural edges top out at partly-checked. Languages outside the six shipped grammars get
  every checker except imports.
- Every checker is an existence test. The superseding-by-addition residue in section 7.3
  cannot be closed without runtime observation, which this product refuses.
- One contract per repository. The seams between the operator's multi-repository systems stay
  undrawn.
- The purpose sentence, the rejected alternative, the failure story and the honest gap list
  are prose with no mechanical signal, rendered as unverified forever. Roughly 60 percent of
  the corpus's value is in that category by the corpus analysis's own accounting.

**Predictions this document makes without evidence.**

- That the operator will maintain a 5 to 10 promise contract when he did not maintain 30
  documents. The design assumes that a smaller artifact about invariants survives where a
  large narrative did not, and that assumption has no measurement behind it.
- That the commit gate and the SCM rows are sufficient delivery surfaces for a break. The
  pre-commit sentence in CLAUDE.md is a convention agents follow, not a hook that fires by
  itself.
- That a session-scoped handoff payload beats typing often enough to be used. The interaction
  timings in the month-three attacks were estimates, not stopwatch readings.

---

## 13. Sources

The URLs that carried real weight, verified live on 2026-08-15 or 2026-08-16.

- https://dblp.org/search/publ/api?q=software+reflexion+models&format=json
- https://arxiv.org/abs/2109.09525
- https://arxiv.org/abs/2311.04643
- https://arxiv.org/abs/1901.07700
- https://arxiv.org/abs/2601.13007
- https://arxiv.org/abs/2605.17062
- https://arxiv.org/abs/2606.27045
- https://api.openalex.org/works/doi:10.1057/palgrave.ivs.9500092
- https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md
- https://raw.githubusercontent.com/kieler/elkjs/master/LICENSE.md
- https://gitlab.com/graphviz/graphviz/-/raw/main/LICENSE
- https://registry.npmjs.org/@scip-code/scip/latest
- https://registry.npmjs.org/@bufbuild/protobuf/latest
- https://registry.npmjs.org/typescript/7.0.2
- https://registry.npmjs.org/knip/latest and https://registry.npmjs.org/oxc-parser/latest
- https://registry.npmjs.org/dependency-cruiser/latest
- https://github.com/github/stack-graphs
- https://github.com/CoatiSoftware/Sourcetrail
- https://raw.githubusercontent.com/CodeBoarding/CodeBoarding/main/static_analyzer/cluster_helpers.py
- https://raw.githubusercontent.com/Aider-AI/aider/main/aider/repomap.py
- https://code.claude.com/docs/en/memory and https://code.claude.com/docs/en/headless and https://code.claude.com/docs/en/costs
- https://platform.claude.com/docs/en/about-claude/pricing
- https://google-gemini.github.io/gemini-cli/docs/quota-and-pricing.html
- https://raw.githubusercontent.com/QwenLM/qwen-code/main/docs/users/configuration/auth.md
- https://modelcontextprotocol.io/specification/versioning
- https://reactflow.dev/learn/troubleshooting/remove-attribution
- https://chromium.googlesource.com/chromium/src/+/main/content/renderer/webgraphicscontext3d_provider_impl.cc
- https://deck.gl/docs/developer-guide/performance
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-nodePlacement-strategy.html
- https://raw.githubusercontent.com/obsidianmd/jsoncanvas/main/spec/1.0.md
- https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts
- https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/release/1.2/meta/core.json
- https://docs.structurizr.com/dsl/language
- https://www.rfc-editor.org/rfc/rfc8785
- https://www.archunit.org/userguide/html/000_Index.html
- https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md
- https://docs.rs/salsa/latest/salsa/
- https://docs.dagster.io/guides/build/assets/asset-versioning-and-caching
- https://facebook.github.io/watchman/docs/cmd/query.html
- https://raw.githubusercontent.com/Wilfred/difftastic/master/src/options.rs
- https://www.gitkraken.com/blog/gitkraken-acquires-codesee
- https://www.sonarsource.com/structure101/
- https://docs.devin.ai/work-with-devin/deepwiki.md
- https://raw.githubusercontent.com/cline/cline/main/sdk/packages/core/src/session/checkpoint-restore.ts
- https://docs.cline.bot/features/checkpoints
- https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/src/core/checkpoints/index.ts
- https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/platform/workspaces/node/workspaces.ts
- https://raw.githubusercontent.com/zed-industries/zed/main/crates/workspace/src/persistence.rs
- https://git-scm.com/docs/git-notes and https://git-scm.com/docs/git-gc and https://git-scm.com/docs/gitattributes
- https://raw.githubusercontent.com/jj-vcs/jj/main/docs/technical/concurrency.md
- https://app.diagrams.net/shortcuts.svg
- https://raw.githubusercontent.com/google/perfetto/main/ui/src/widgets/virtual_overlay_canvas.ts
- https://openjsf.org/projects
- https://docs.swimm.io/features/keep-docs-updated-with-auto-sync/
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://docs.factory.ai/droid-exec/overview.md and https://docs.factory.ai/software-factory/wiki/auto-refresh.md
- https://ampcode.com/manual
- https://www.ndepend.com/docs/dependency-structure-matrix-dsm
- https://graphology.github.io/standard-library/communities-louvain.html
- https://hn.algolia.com/api/v1/items/41393458
