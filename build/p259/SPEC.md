# Phase 259 — the semantic pass. SPEC.

Subject `feat(arch): the bounded semantic pass`. First body line `Phase 259: the semantic pass`.
Semver minor. **Tier 3**, and this phase spends his tokens.

Charter: docs/BACKLOG.md "Phase 259", which is research 118 §10 Phase 3 verbatim on top of Phase
258's `e125e800`, plus **his word of 2026-09-12 recorded at `4c69d193`**: two measured recipes rather
than one, claude with Opus and codex with the model he calls Astra, both on this Mac under his own
subscriptions, through the SHIPPED enrich path. Research 118 §7.1 is the division of labour, §7.2 the
ladder that is already computed, §7.3 backing drawn rather than hidden, §7.5 the refresh rule, §7.6
the floor and the decision he took, §7.8 the cost. Reference prototypes, ported never imported:
`build/p256/semantic/check.mts` (the three rules), `build/p256/semantic/null-model.mts` (the floor),
`build/p256/semantic/plant.mts` (the seven lies), `build/p256/det/run.mts:249` (the declaration
filter), `build/p256/semantic/tortie.pass.json` (the hand pass, 9 components, 3 journeys, 6 gates,
41 citations).

What this spec settles, in order: §0 decisions the builders inherit; §1 the FACTS block, its budget,
its order, and the EXACT ask both recipes get; §2 the grader, the ladder, the three refusals and the
floor; §3 the store and what stale means mechanically; §4 the two recipes with the model names
CONFIRMED from the installed binaries; §5 the measurement protocol and its three quality readings;
§6 the views, the words and the menus; §7 `conformance:semantic` and `probe:p259`; §8 ownership for
three builders with no overlap; §9 refusals and stated limits.

Every reading in §4.1 was taken on 2026-09-12 on this machine by reading help text and the compiled
model catalogue out of the installed binaries. **No token was spent in this step. No turn was taken.
No keychain was opened. `~/.claude` and `~/.codex` were not read.**

---------------------------------------------------------------------------------------------------

## 0. Nine decisions the builders inherit rather than re-decide

**D1. The ask is PER PART, and the part is a rule P box.** §7.8 measured the whole-repository block at
163,229 bytes distinct-subject and its largest part at 78,439, against a 65,536 byte prompt cap, so
neither fits. Phase 258 closed F1, so the contract, the map, the drill, the inspector, the surfaces
list and the worksheet already name the same parts by the same ids; the ask names them too. On this
repository rule P draws **8 boxes** (build, demo, docs, other, src-main, src-preload, src-renderer,
src-shared), so a full reading is **8 part asks plus 1 journey ask = 9**. Research's "~8 asks" is the
estimate; §5 records what it actually was. A part carrying no fact in the seven admitted categories is
never asked, so the real count is at most 9 and the run records it.

**D2. The model cannot read the repository, and that is the whole of what bounds it.** Both shipped
recipes run the child with its tools off and its working directory inside Tortie's own fold home
(claude: `--tools ''`, `--strict-mcp-config`, `--disable-slash-commands`, `--setting-sources ''`;
codex: `-s read-only`, `-C <foldHome>`, `--ephemeral`, `--ignore-user-config`, `--ignore-rules`). So
every citation the model can honestly make is one the FACTS block handed it, and a citation outside
the block was either copied off a sampled path or invented. That is a DIFFERENT situation from
research 118 §6.4, whose 58.5% is a measurement of a careful human who had read the source, and the
spec says so rather than letting the two numbers be compared as if they were the same experiment.

**D3. `test` facts are not in the block, and no claim may cite one.** Two reasons. The evidence rung is
COMPUTED (Phase 258) and no model may write one, so test facts feed nothing the model is allowed to
claim; and §6.4's `wrong-test` plant is exactly a citation of an unrelated test that the checker
misses, so handing this repository's 15,784 test facts to a model is handing it 15,784 citations it
cannot be graded on. It is also the rule `arch:facts` already applies (`categories: never 'test'`).

**D4. The computed rung is never put in the block.** A model handed the word `tested` will write the
word `tested`, and rule R1 below then refuses the answer whole for a word the composer gave it. The
block carries facts and denominators and no verdict of any kind.

**D5. The declaration half is added, because the charter's chip needs three kinds and the bytes are
already on the wire.** §7.3 requires that a call-site backing and a declaration backing are never
drawn identically, at 9.6× and 2.46× over chance. Phase 257's `ARCH_FACT_CATEGORIES` has eight
categories and none of them is `decl`, so the shipped base is the CALL-SITES-ONLY base — the sharper
instrument, floor 2.3%, and the one whose best evidence for "the one door that rewrites your file" does
not exist, because `export async function writeGuarded(` is a declaration and never will be a call
site. `IndexedFile.symbols` already arrives on the SAME worker message `tree-facts.ts` reads for calls
and imports, and today it is thrown away after its kind counts are taken. Phase 259 keeps it, in its
own table, under the prototype's own filter. **It is NOT a ninth fact category**: `ARCH_FACT_CATEGORIES`,
`ARCH_FACT_KINDS`, `arch:facts`, `conformance:facts`'s recall scopes and the surfaces list do not move.
It is a second table read by the grader and by nothing else.

**D6. Three grades of backing plus `resolves`, ordered by how hard each is to hit by chance, because
that is the only honest ordering.** Measured per-category floors over the hand pass's nineteen cited
files: `gate` 0.1%, `store` 0.7%, `surface` 0.7%, `effect` 0.9%, every non-declaration fact together
2.3%, `decl` 21.9%. So `gate` > `call-site` > `declaration` > `resolves`, and every rate on every
surface is drawn beside the floor computed over the same files at the same slack.

**D7. `arch:enrich` is widened; no second door is opened.** `ArchPassScope` gains `'part'` and
`'journeys'` and `ArchEnrichInput` gains `partId`. The gesture, the gate, the one-shot spawn, the
validator and the recorder are Phase 158's and Phase 159's, unchanged. ONE new READ channel,
`arch:semantic`. The contract baseline moves by one line, 230 to 231.

**D8. With no agent both views are PRESENT.** §7.6 put the choice to him and the BACKLOG entry records
which half he took: the journey and gates views are present and say in one sentence that nothing has
read this repository yet and what would, with a Settings link. One way in (Phase 158), and a Mac with
an agent and a Mac without draw the same tabs.

**D9. No new colour token.** A citation chip is a glyph, a word and one of the two tokens Phase 258
already pinned at 3:1 on `--bg-active` on both bases: `--success` for `gate` and `call-site`,
`--status-idle` for `declaration`, `resolves` and `stale`. Colour is never the only signal; there are
five glyphs and five words. `tokens.css` does not change, so `conformance:hue` rule 25's dark digest
stands and rule 32's pin set does not move.

---------------------------------------------------------------------------------------------------

## 1. The FACTS block and the ask (`src/main/arch/enrich/compose.ts`, A)

### 1.1 The budget, as constants

```ts
/** Fact lines one part's block may carry. §7.8: ~120 lines, ~10.3 KB, ~2,600 tokens at 88 bytes a line. */
export const ARCH_SEMANTIC_FACT_LINES = 120;
/** Sampled file paths one part's block may carry, under the fact lines. */
export const ARCH_SEMANTIC_FILE_SAMPLE = 20;
/** Lines the journey ask's cross-part summary may carry. */
export const ARCH_SEMANTIC_JOURNEY_LINES = 160;
```

`ARCH_ENRICH_PROMPT_MAX_BYTES` (65,536) is unchanged and is the cap both asks are composed under,
through the existing `composeUnderCap`, which shrinks `ARCH_SEMANTIC_FACT_LINES` first (halving above
8, then one at a time) and the file sample second. The contract half of the prompt is not shrunk, for
the reason already written into that function.

### 1.2 Which facts go in, in what order, and how they are chosen

The categories, in the shared `ARCH_FACT_CATEGORIES` order minus `test`, which is also the order the
answer must be written in — what starts it, what it exposes, what it keeps, what it reaches, where it
stops:

| order | category | what it feeds |
| --- | --- | --- |
| 1 | `entrypoint` | `runsIn` |
| 2 | `boundary` | `runsIn` |
| 3 | `surface` | `receives`, `returns` |
| 4 | `store` | `keeps` |
| 5 | `effect` | `does` |
| 6 | `network` | `does` |
| 7 | `gate` | `limit`, and the gates list |

Selection, deterministic for the same inputs so the same-input-hash refusal means something:

1. **Scope.** Only facts whose file is in the part's own rule P box file set, being the same partition
   the map draws and the same one `arch:facts` filters by. No fact from another box ever appears in a
   part's block.
2. **Distinct subjects.** Group by `(category, kind, subject)`; the smallest `(file, line)` in sorted
   order is the row's citation and the rest are counted. §7.8 measured distinct-subject as the shape a
   prompt takes (1,856 lines against 7,224).
3. **Allocation.** Largest remainder over the distinct-subject counts of the seven categories, with a
   FLOOR of 4 lines for any category that has any rows and a CEILING of half the budget for any one
   category. A category holding fewer rows than its share hands the remainder to the next category in
   the fixed order. This is what stops `effect` (4,414 rows on this repository) eating `gate` (815)
   and `network` (97).
4. **Honest zeroes.** A category with no rows is printed as `<category>: none found by this reader`,
   never omitted. §7.6's rule: a surface that says `0 command-line flags found` is telling the truth
   about the reader, and a category silently absent is an invitation to invent one.
5. **Order within a category**: kind, then subject, then file, then line. Ordering is total, so
   reversing the input rows composes byte-identical bytes (gate rule 1c).

### 1.3 The block, byte for byte

```
PART src-main
anchors: src/main/**
files: 1068 tracked, 1068 parsed
FACTS
entrypoint
  composition-root main at src/main/index.ts:64
  ...
boundary
  worker the symbol worker at src/main/symbols/pool.ts:171
  ...
surface
  ipc-channel arch:map at src/main/arch/ipc.ts:143
  ... and 612 more subjects this reader found and did not list
store
  ...
effect
  ...
network
  none found by this reader
gate
  refusal a write outside a project root at src/main/fs/guarded-write.ts:214
  ...
FILES
  src/main/arch/enrich/compose.ts
  ... and 1048 more
imports crossing this part:
  src-main imports src-shared: 412 times
  src-renderer imports src-main: 0 times
END FACTS
```

Every fact line is `  <kind> <subject> at <file>:<line>` — **the citation form the answer must copy**,
so rule 2 of the grader is a copy rather than a guess for every claim the block can back. The subject
and the evidence are already bounded by `ARCH_FACT_LIMITS` (160 and 200 characters) and every value
passes through `oneLine` so nothing out of somebody's source carries a control character into a prompt,
which is the rule `driftBlock` already keeps.

The journey ask's block is one SUMMARY line per part plus the crossings:

```
PARTS
  src-main: 1068 files, 229 ipc-channel, 12 store-write, 30 spawn, 14 gate
  src-renderer: 968 files, 0 ipc-channel, 4 store-write, 0 spawn, 3 gate
  ...
imports between parts:
  src-renderer imports src-shared: 88 times
  ...
END FACTS
```

### 1.4 The ask — `ARCH_SEMANTIC_SYSTEM_PROMPT`, identical for both recipes

The only thing that differs between claude and codex is whether this text rides `--system-prompt` or
the head of the prompt, and `foldPromptFor` in `overview/fold/spawn.ts` already decides that from the
recipe's `systemPromptMode`. The bytes are one constant and gate rule 10d asserts both recipes are
handed the same ones.

```
You say what one part of a software repository is FOR, and every sentence you write names the evidence for it.
Answer with ONE JSON object and nothing else, in the shape
{"part": "<the part id you were given>", "claims": [{"field": "...", "text": "...", "facts": [{"at": "path:line", "why": "..."}]}], "gates": [{"id": "...", "question": "...", "answer": "...", "because": "...", "facts": [...]}]}.
Write exactly seven claims, one for each field, in this order: name, receives, does, returns, runsIn, keeps, limit.
name is a person readable name for the part by its job, at most sixty characters. receives is what comes in. does is what it does with it. returns is what goes out. runsIn is where it runs. keeps is what it holds on to. limit is where it stops or what it cannot do.
Write each one as one or two plain sentences of at most two hundred and forty characters.
Every claim names at least one fact and at most six. A fact is written "path:line" and is copied EXACTLY from a line of the FACTS section. why says in at most one hundred and twenty characters what that line shows.
Write a gate for each place in FACTS where this part refuses, stops or guards something, at most twelve of them. answer is one of proceeds, stops, uncertain, detected. because is one or two plain sentences. Every gate names at least one fact.
You have not read this repository. Everything you know about it is in the FACTS section, so never name a file, a line, a symbol or a number that is not there.
Never write how sure you are, how well tested something is, or how far it is proven. Never write the words off repository, declared, composed, reached, tested, component tested, accepted live, implemented not shipped or outside this repo as an answer to anything. Tortie computes that itself and an answer that carries one is thrown away whole.
Write a number only if that exact number appears in the FACTS section.
Never quote code and never write markdown.
Do not use a dash of any kind. Use a colon only to introduce a list.
```

The journey ask's own instruction, `ARCH_JOURNEY_SYSTEM_PROMPT`, is its own text and not this text
with two lines added, for the reason Phase 159 wrote beside `ARCH_DELTA_SYSTEM_PROMPT`: at most five
journeys, at most eight steps each, `partId` names a part from the PARTS list and nothing else, `label`
at most eighty characters, every step names at least one fact, and the last four lines above verbatim.

### 1.5 The assembled prompt

`assemble` is reused. The part ask carries: the one part's drafted record as JSON, the region it sits
in as drawn by Phase 258, the block above, and `Answer with the one JSON object.` The journey ask
carries the part list as JSON, the block above, and the same closing line. Measured byte sizes go in
the commit body; gate rule 2b asserts the composed size against the cap and against the 88-byte-a-line
budget the spec sized from.

---------------------------------------------------------------------------------------------------

## 2. The grader (`src/main/arch/enrich/validate.ts` and `src/main/arch/semantic/grade.ts`, A)

### 2.1 The citation grammar

```ts
export interface ArchSemanticCite { at: string; why: string }
```

`at` must match `^(?<path>[^\s:][^:]*):(?<line>[1-9][0-9]{0,6})$` AND the path must have no leading
`/`, no `\`, no `.` or `..` segment, no leading or trailing whitespace, at most 400 characters, and no
control character. `why` is 1 to 120 characters, plain, no control character. Anything else is a
GRAMMAR failure and is treated as an unresolvable citation (R2).

### 2.2 Resolution, without opening a file

A citation RESOLVES when its path is a tracked file of the repository at the scanned commit and its
line is between 1 and that file's line count. Both come from tables `arch.db` already holds:
`arch_tree_file(repo_key, rel_path, lines)` (Phase 201) for the line count and the same row's presence
for trackedness. **The grader opens no file and spawns nothing**, and gate rule 3b proves it by running
the grader with a file-reading seam that throws.

### 2.3 The ladder, and the proximity rule

```ts
export const ARCH_CITE_SLACK = 3;
export const ARCH_CITE_GRADES = ['gate', 'call-site', 'declaration', 'resolves'] as const;
export type ArchCiteGrade = (typeof ARCH_CITE_GRADES)[number];
```

For a citation at `(path, line)` the grader takes every `arch_fact` row and every `arch_decl` row in
that file with `|row.line - line| <= ARCH_CITE_SLACK` and answers the RAREST kind present:

| grade | what is within the slack | floor over the hand pass's cited files |
| --- | --- | --- |
| `gate` | an `arch_fact` row of category `gate` | 0.1% |
| `call-site` | any other `arch_fact` row | 2.3% for all non-declaration facts together |
| `declaration` | no `arch_fact` row, an `arch_decl` row | 21.9% |
| `resolves` | a tracked line and nothing within the slack | — |
| **broken** | the citation does not resolve | the row is refused (R2) |

**Proximity, not shape**, which is the correction research 118 §7.3 made to its own first writing: a
contract field has no wanted shape, because "keeps the session in tmux" is evidenced by a spawn, a
declaration or a store write equally well. The one place a SHAPE is wanted is a gate claim, and it is
asked separately and reported separately: `gateShaped` counts gate claims whose citation set contains a
`gate`-graded row, asked of the WHOLE span and never of its first row, which is the defect `check.mts`
had. The honest reading it produced is written into the face: the hand pass scored **0 of its 6 gates**.

The winning row's `(category/kind, subject, line)` is stored beside the grade, so the hover can say
which fact and the drift fingerprint has something to compare.

`ARCH_CITE_SLACK` is ONE exported constant read by the grader AND by the floor (§2.5). Gate rule 3d
ablates it in the one place and asserts the rate and the floor both move.

### 2.4 The three refusals

**R1 — a model-written evidence level refuses the ANSWER WHOLE.** Refusal name `level-written`. The
check is on a FIELD VALUE, trimmed and lower-cased with internal whitespace and hyphens collapsed,
equal to one of the ten words: the five computed rungs (`off-repo`, `declared`, `composed`, `reached`,
`tested`) and the five research levels (`composed`, `component-tested`, `accepted-live`,
`implemented-not-shipped`, `outside-this-repo`). It also refuses any KEY named `evidence`, `level`,
`rung`, `confidence`, `certainty`, `accepted`, `verified` or `baseline` anywhere in the answer.
**It is never a search inside a sentence**, because "the app is composed of three parts" is honest
prose and refusing it would refuse good writing; gate rule 4a drives both arms, the word as a value
and the same word inside a `does` sentence, and asserts the first refuses and the second is kept.

**R2 — an unresolvable citation refuses its ROW whole.** Refusal name `citation-broken`, recorded per
row. A row is one claim, one gate or one journey step. The row is dropped, never trimmed of its bad
citation: §7.3's rule is that a broken citation never reaches the face, and a claim that keeps its
sentence while losing the citation that justified it is worse than no claim. The run records
`rowsDropped` and one detail sentence naming the first. **When every row of an answer is dropped the
answer is refused WHOLE** under `no-row-stood`, because an answer with nothing left is a failure and
not an empty reading.

**R3 — the digit rule asks for a TOKEN in the block, not a substring.** `invented-number`, refusing the
answer whole as it does today. The fix is one line and it uses the function already there: the block is
tokenized with the SAME `digitRuns` regex the prose is tokenized with, into a `Set`, and membership
replaces `String.prototype.includes`. Research measured the substring form catching **one of three**
planted numbers: `4096` caught, `17` hidden inside a fixture session named `p117-lost-9`, `92` hidden
inside the IP `192.0.2.1`. Under the token form `p117-lost-9` yields `{117, 9}` and `192.0.2.1` yields
`{192, 0, 2, 1}`, so all three are caught. Gate rule 4c drives exactly those three strings against
both forms and asserts **3 of 3 against 1 of 3**; it MEASURES rather than asserting this spec's
arithmetic.
**The same one-line change is made to the shipped `validateArchAnswer` rule 8**, because the substring
form is measurably wrong and a looser rule on the older pass is not a feature. The exemption for a
prose field returned byte identical to the draft's is unchanged.
**The digit rule never reads a citation.** `at` carries a line number, which is a digit run, and it is
graded by rules 1 and 2 instead. The prose fields it reads are the closed seven plus `why`, `question`,
`because` and a journey step's `label`.

### 2.5 The floor, computed per file set the way `null-model.mts` does

```ts
export interface ArchCiteFloor { within: number; lines: number; byGrade: Record<ArchCiteGrade, number> }
export function citeFloor(files: readonly string[], marks: ..., lines: (p: string) => number): ArchCiteFloor
```

For each file in the set, mark every line within `ARCH_CITE_SLACK` of an admitted row, clamped to the
file's own 1..n; `within` is the size of the union and `lines` the sum of the line counts. Line counts
come from `arch_tree_file.lines`; no file is opened. It is computed over **the files the answer
actually cites**, which is the number `null-model.mts` prints as the one a backing rate has to beat,
and again per grade so a shaped question's floor is visible beside it.

**No rate is stored and no rate is drawn without its floor.** The store has no column for a rate
without one (§3), the renderer's one formatter takes both, and gate rule 5b scans for any drawn
fraction whose composer does not take a floor.

---------------------------------------------------------------------------------------------------

## 3. The store (`src/main/arch/db.ts` migrations, `src/main/arch/semantic/` pure, A)

The split is Phase 257's: `src/main/arch/facts/` is pure and `db.ts` owns the SQL. `src/main/arch/semantic/`
is pure in the `conformance:reading` rule 9 sense — no `node:`, no `electron`, no `child_process`, no
`require(` — and holds `compose.ts`'s block builder helpers, `grade.ts`, `floor.ts`, `drift.ts`,
`sentences.ts` and `types.ts`. `db.ts` gains two migrations and their statements.

### 3.1 `011-arch-decl` (the declaration half)

```sql
CREATE TABLE IF NOT EXISTS arch_decl (
  oid      TEXT NOT NULL, rel_path TEXT NOT NULL, seq INTEGER NOT NULL,
  kind     TEXT NOT NULL, subject  TEXT NOT NULL, line INTEGER NOT NULL,
  evidence TEXT NOT NULL,
  PRIMARY KEY (oid, rel_path, seq)
);
CREATE INDEX IF NOT EXISTS idx_arch_decl_line ON arch_decl (oid, rel_path, line);
```

Keyed on blob oid exactly as `arch_fact` is, so a warm pass reads only what drifted and two files with
the same bytes share rows. Written by `tree-facts.ts` from `IndexedFile.symbols`, which is already on
the worker message, under the prototype's own filter ported verbatim from `build/p256/det/run.mts:249`:
kind in `{function, method, class, interface, type, constant, struct, enum, module}`, subject
`<kind> [<container>.]<name>`, evidence the trimmed source line at `ARCH_FACT_LIMITS.maxEvidence`.
Bounded by `FACT_LIMITS.maxDeclsPerFile = 400` with the overflow counted into `ArchFactCounts.declsTruncated`.
**Not a fact category**: it never reaches `arch:facts`, the surfaces list, the rungs or
`conformance:facts`'s recall scopes. Two store readers, `declsOf(repoKey, files)` and
`declCountsUnder(repoKey, dirs)`, and no third.

The row count and the cost are OWED MEASUREMENTS, taken by builder B's harness and written into the
commit body: research read ≈29,900 declarations on this repository against 22,752 call-site facts, and
the phase reports what the product reads and what the second store costs in milliseconds and bytes. If
the measured cost is above 1.3× the Phase 257 pass on this repository it goes behind the same
`wrapperPass`-shaped setting rather than shipping on, and the spec says so now rather than after.

### 3.2 `012-arch-semantic` (the reading)

```sql
CREATE TABLE arch_semantic_run (
  repo_key TEXT NOT NULL, run_id TEXT NOT NULL, part_id TEXT,
  agent_id TEXT NOT NULL, model TEXT NOT NULL, recipe_version INTEGER NOT NULL,
  head_commit TEXT NOT NULL, started_at INTEGER NOT NULL, wall_ms INTEGER NOT NULL,
  verdict TEXT NOT NULL, reason TEXT, detail TEXT, cost_usd REAL,
  claims INTEGER NOT NULL DEFAULT 0, rows_dropped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (repo_key, run_id));
CREATE TABLE arch_claim (
  repo_key TEXT NOT NULL, claim_id TEXT NOT NULL,
  subject TEXT NOT NULL,          -- 'part:<id>' | 'gate:<partId>/<id>' | 'journey:<id>#<seq>'
  field TEXT NOT NULL,            -- the closed field set
  text TEXT NOT NULL, run_id TEXT NOT NULL, written_at INTEGER NOT NULL,
  stale INTEGER NOT NULL DEFAULT 0, stale_reason TEXT,
  PRIMARY KEY (repo_key, claim_id));
CREATE TABLE arch_claim_cite (
  repo_key TEXT NOT NULL, claim_id TEXT NOT NULL, seq INTEGER NOT NULL,
  rel_path TEXT NOT NULL, line INTEGER NOT NULL, why TEXT NOT NULL,
  grade TEXT NOT NULL, fact_kind TEXT, fact_subject TEXT, fact_line INTEGER,
  blob_oid TEXT NOT NULL, dead INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (repo_key, claim_id, seq));
CREATE TABLE arch_claim_rate (
  repo_key TEXT NOT NULL, scope TEXT NOT NULL,      -- 'repo' | 'part:<id>'
  backed INTEGER NOT NULL, total INTEGER NOT NULL,
  floor_within INTEGER NOT NULL, floor_lines INTEGER NOT NULL,
  by_grade TEXT NOT NULL, floor_by_grade TEXT NOT NULL,
  gate_shaped INTEGER NOT NULL, gate_claims INTEGER NOT NULL,
  computed_at INTEGER NOT NULL,
  PRIMARY KEY (repo_key, scope));
CREATE TABLE arch_journey (
  repo_key TEXT NOT NULL, journey_id TEXT NOT NULL, name TEXT NOT NULL,
  source TEXT NOT NULL,           -- 'model' | 'contract'
  seq INTEGER NOT NULL, part_id TEXT NOT NULL, label TEXT NOT NULL,
  PRIMARY KEY (repo_key, journey_id, seq));
```

`arch_claim_rate` has **no column for a rate without its floor**, which is §7.3's ruling made
structural rather than remembered.

### 3.3 The drift fingerprint, and what stale means mechanically

§7.5 verbatim: each citation stores `(blob oid of the cited file, fact kind, fact subject)`. On every
deterministic pass — the one that already rides the single watcher subscription with its 300 ms
coalesce, one run in flight and a generation stamp — `refreshSemantic` in `semantic/drift.ts`, which is
pure and takes the new fact and decl rows as arguments:

- the file's blob oid is unchanged → **current**, and nothing is read;
- the oid moved and a row with the same `(fact_kind, fact_subject)` exists in that file → **current**,
  and `line` is rewritten to the new line, which is what the product already does for an anchor;
- the oid moved and no row with that `(fact_kind, fact_subject)` exists anywhere in that file → the
  citation is **dead** and the claim is **stale**;
- the file is no longer tracked → **dead**, same;
- a citation graded `resolves` has no `(kind, subject)`, so its fingerprint is the blob oid alone and
  any change to that file makes it dead. That is deliberately stricter, and the reason is that a
  citation with nothing behind it has nothing else to check.

**Stale is `arch_claim.stale = 1` and nothing else.** The sentence STAYS, the chip turns, and
`stale_reason` names the citation that died. A stale claim is never deleted and never silently
redrawn. **Nothing re-runs a model because a file changed**: `refreshSemantic` is pure, `db.ts`'s
writer is a `UPDATE`, and the re-ask is a person's gesture on the stale claim, or the shipped
settled-drift path under an agent already confirmed in Settings with the confirm gate re-checked at the
spawn. Gate rule 8e reads `refreshSemantic`'s own braces and the function that calls it and asserts
neither names a spawn, a runner or `arch:enrich`.

`ArchFlow` is finally READ: a journey committed under `docs/arch/flows/` loads with `source: 'contract'`
and is drawn FIRST and marked as the person's, and a model journey never overwrites one. **No key moves
in `docs/arch/`**; the pass writes journeys only into `arch.db`, so `ARCH_ROW_KEYS` is untouched and
`conformance:arch` rule 12 runs unchanged.

### 3.4 The wire

`src/shared/ipc/arch.ts`:

```ts
export type ArchPassScope = 'whole' | 'drift' | 'part' | 'journeys';
export interface ArchEnrichInput extends ArchRepoInput { scope?: ArchPassScope; partId?: string }
```

ONE new channel, `arch:semantic`, a READ over the tables above:

```ts
export interface ArchSemanticInput extends ArchRepoInput { machineId?: string | null }
export interface ArchSemanticResult {
  cwd: string;
  parts: ArchPartReading[];      // id, name, the seven fields, each with its graded citations and stale flag
  journeys: ArchJourneyReading[];
  gates: ArchGateReading[];
  rates: ArchRateReading[];      // scope, backed, total, floor, byGrade, floorByGrade, gateShaped, gateClaims
  runs: ArchSemanticRunFace[];   // agent, model, verdict, wallMs, claims, rowsDropped — never a cost on the face
  readAt: number | null;         // null when nothing has read this repository
}
```

`docs/audits/contract-baseline.txt` is regenerated with
`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`; the count moves 230 to 231
and the commit body names the one line.

---------------------------------------------------------------------------------------------------

## 4. The two recipes (`src/main/overview/fold/recipes.ts`, B)

### 4.1 The model names, CONFIRMED from the installed binaries — no token, no turn

**claude**, `/Users/gdc/.local/bin/claude`, version **2.1.269 (Claude Code)**. `claude --help` says of
`--model`: *"Provide an alias for the latest model (e.g. 'fable', 'opus', or 'sonnet') or a model's
full name (e.g. 'claude-fable-5')."* **`opus` is a name this CLI accepts**, and it is already the
fourth row of `CLAUDE_MODELS`. Every flag `ARCH_CLAUDE_RECIPE` passes was found present in this
version's help: `--system-prompt`, `--tools`, `--strict-mcp-config`, `--disable-slash-commands`,
`--no-session-persistence`, `--setting-sources`, `--output-format`, `--verbose`, `--max-budget-usd`.

**codex**, `/Users/gdc/.local/bin/codex` → `~/.bun/install/global/node_modules/@openai/codex/bin/codex.js`
→ `@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex`, version **codex-cli 0.153.4**.
The help has no model list, so the compiled catalogue inside that binary was read. It carries eleven
slugs, and the one whose `display_name` is **`GPT-6-Astra`** has slug **`gpt-6-astra`**:

```
"slug": "gpt-6-astra", "display_name": "GPT-6-Astra",
"description": "Our most capable model for complex, demanding work.",
"visibility": "list", "supported_in_api": true, "minimal_client_version": "0.153.0",
"context_window": 272000, "default_reasoning_level": "low",
"supported_reasoning_levels": [low, medium, high, xhigh, max, ultra],
"tool_mode": "code_mode_only", "multi_agent_version": "v2"
```

**So "Astra" IS a name the installed codex CLI accepts and it is spelled `gpt-6-astra`.** The installed
0.153.4 clears its `minimal_client_version` of 0.153.0, `low` is among its reasoning levels so the
shipped `-c model_reasoning_effort="low"` stands, and `codex exec --help` at this version still carries
every flag the shipped codex recipe passes: `--ephemeral`, `--ignore-user-config`, `--ignore-rules`,
`--skip-git-repo-check`, `-s`, `-C`, `-m`, `-c`, `--json`. **Nothing here is guessed and nothing is
substituted; there is no finding to report and the phase proceeds.**

### 4.2 The rows

The semantic ask gets its OWN recipe table, for Phase 158's own reason: `ARCH_CLAUDE_RECIPE` is
separate from `CLAUDE_RECIPE` because a measured row is measured for one question, and a per-part
semantic reading is a third question with a third size.

```ts
const SEMANTIC_CLAUDE_MODELS: FoldModelOption[] = [
  { id: 'opus', label: 'Opus, the one Tortie measured' },
  { id: 'sonnet', label: 'Sonnet, whichever is latest' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5, which costs less and reads less' }
];
const SEMANTIC_CLAUDE_RECIPE: FoldRecipe = {
  agentId: 'claude', version: 1, measuredOn: null,   // the integrator fills this
  models: SEMANTIC_CLAUDE_MODELS, suggestedModel: 'opus',
  systemPromptMode: 'flag',
  env: () => ({ MAX_THINKING_TOKENS: '0', DISABLE_PROMPT_CACHING: '1' }),
  argv: ARCH_CLAUDE_RECIPE.argv,          // the same containment set, byte for byte
  read: readClaudeStream,
  timeoutMs: 150_000                       // the integrator moves this if a measured ask needs it
};
const SEMANTIC_CODEX_RECIPE: FoldRecipe = {
  agentId: 'codex', binaryName: undefined, version: 1, measuredOn: null,
  models: [
    { id: 'gpt-6-astra', label: 'GPT-6-Astra, the one Tortie measured' },
    { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol, which costs less' }
  ],
  suggestedModel: 'gpt-6-astra',
  systemPromptMode: 'prepend',             // codex has no system prompt flag
  env: NO_ENV,
  argv: CODEX_RECIPE.argv,                 // the same containment set, byte for byte
  read: readCodexJson,
  timeoutMs: 180_000
};
```

**Measured or disabled, made mechanical.** `SEMANTIC_RECIPES` is composed by filtering rows whose
`measuredOn` is non-null, so a row the integrator did not measure is simply not in the table,
`archSemanticRecipeFor` answers null, and Settings draws `not-measured` through the joiner that already
exists (`joinHarnessOptions`, `options.ts:116`). Gate rule 10a asserts every row IN the table has a
non-null `measuredOn` AND a measurement record under `build/p259/measured/<agentId>.json` whose
`agentId`, `model`, `recipeVersion`, `measuredOn`, `asks`, `wallMs` and `timeoutMs` agree with the row.
That is "measured the way the shipped one was on 2026-08-23, or it stays not-measured and disabled"
turned into a check.

`MAX_THINKING_TOKENS: '0'` on an Opus row is carried forward from the fold's measurement and is
**unproven for this model and this question** — it may be the wrong trade for a reading that has to
weigh seven claims. The integrator's first ask reports whether the answer was kept; if the environment
has to move, it moves in the same commit with the reading that justified it and the row's `version`
moves with it.

`--max-budget-usd` is kept on the claude row. Under his own subscription the CLI authenticates by
OAuth and the flag's help says it bounds API spend, so whether it fuses a subscription run is UNKNOWN;
the deadline is the real fuse and §5 records what the CLI reported. codex reports token counts and no
dollar figure, which is the CLI's limit and not Tortie's choice, and it is why a codex run's `cost_usd`
is null.

---------------------------------------------------------------------------------------------------

## 5. The measurement protocol (the INTEGRATOR runs this; it is the only step that spends a token)

### 5.1 What is allowed, in one paragraph

Model runs happen ONLY through the shipped enrich path — the guarded one-shot child of
`overview/fold/spawn.ts`, `ArchPassRunner`'s gate re-checked at the spawn, the prompt cap, the minimum
interval, the same-input-hash refusal — never a bespoke harness that calls a CLI directly. Only over a
scratch COPY of this repository, in a scratch profile with a scratch `HOME` for Tortie. Only the ~8-ask
full reading per recipe, ONCE per recipe, plus at most one repeat per recipe if a run fails for a
reason the integrator names in the report. Nothing on any other repository. **`CLAUDE_CONFIG_DIR` and
`CODEX_HOME` are NOT set** — the CLIs keep their own real logins, which is the whole point of his word,
and the containment is the recipe flags rather than a redirected home.

### 5.2 The steps

1. **Pre-flight, spends nothing.** `claude --version` and `codex --version`, and the two model names
   re-read the way §4.1 read them, printed into the report. There is no keychain-free way to ask a CLI
   whether it is signed in, so **the first ask IS the sign-in check**: if it comes back `spawn-failed`
   or with an authentication refusal, REPORT it, do not retry, do not sign in, and that recipe stays
   `not-measured`.
2. **The scratch copy.** `git clone --no-hardlinks --local <this worktree> $SCRATCH/repos/tortie`.
   `build/p259/corpus.sh` refuses a target equal to its source and refuses `/Users/gdc/gmux`,
   `/Users/gdc/runstory`, `/Users/gdc/specfactory`, `/Users/gdc/stoa`, `/Users/gdc/rookery`,
   `/Users/gdc/herdr`, `/Users/gdc/orca` and `/Users/gdc/tortiedotsh` BY NAME. The clone is removed in
   the harness's `finally`.
3. **The profile.** One Electron through `build/electron-run.mjs` on a scratch `--user-data-dir` with
   `HOME` inside the scratch directory and the tmux socket `gmux-p259-<pid>`, unlinked in the same
   `finally`. Never more than one at a time. `npm run shot` is not used.
4. **The confirm-gate step, and why it is not a fork around refusal 8.** `build/p259/seed-arch-agent.mjs`
   writes the profile's `settings.json` with `{arch: {enabled: true, agentId, model, wrapperPass: true}}`,
   the shape `probe-arch-switch.mjs` already writes. **No agreement is forged**: `claude` and `codex` are
   BUILTIN registry rows (`registry.ts:461` and `:606`, `launchable: true`), and `harnessConfirmedNow`
   answers true for a builtin launchable row with no seal at all, because refusal 8's gate exists for
   CONFIGURED agents and a builtin is the compiled world. Gate rule 9d asserts exactly that: the
   runner's own `archAgentConfirmed` answers true for the builtin row and false for a row made
   non-launchable, so the measurement really goes through the shipped gate rather than around it.
5. **The run.** The harness drives the SHIPPED `arch:enrich` channel — scope `part` once per rule P
   box carrying facts, then scope `journeys` once — through the app's own IPC, in order, one at a time.
   It never calls `runFold`, never composes an argv and never spawns a CLI. Between asks it does
   nothing, so the minimum-interval refusal applies only to the automatic trigger and a person's own
   press, which this is, is never refused on it.
6. **What is recorded per recipe**, into `build/p259/measured/<agentId>.json` and quoted in the commit
   body and the running log: `agentId`, `model`, `recipeVersion`, `measuredOn`, the ask count actually
   made, per-ask `wallMs`, `verdict`, `reason`, `detail`, `costUsd` when the CLI reports one, the
   composed prompt bytes, the answer bytes, `claims`, `rowsDropped`, and the totals. Honest numbers
   included, refusals included, and a refusal's name is a result rather than a failure of the run.
7. **Optional, the integrator's call**: `ls -1 ~/.claude/projects | wc -l` and `ls -1 ~/.codex/sessions | wc -l`
   before and after, entry COUNTS only, no file opened, no name recorded, only the two integers in the
   report. If the integrator judges that outside "no read of ~/.claude or ~/.codex beyond what the
   shipped launch path already does", it is SKIPPED and the evidence for containment is the recipe
   flags plus Phase 138's own 2026-08-23 measurement, said plainly as an inheritance rather than a
   fresh reading.
8. **His live world is read only and counted.** `tmux -L gmux list-sessions | wc -l` before and after,
   both printed. Never attach, never send-keys, never kill.

### 5.3 The three quality readings

**(a) Grades against the floor.** For each recipe, the stored `arch_claim_rate` for scope `repo`:
`backed of total`, `by_grade`, `gate_shaped of gate_claims`, and beside each the floor over the same
files at the same slack. The comparison number is research's own: the hand pass read **41/41 resolve,
24/41 backed against a floor of 23.8%** with declarations, and **9/41 against 2.3%** without. Both bases
are printed for both recipes, so the lift is readable rather than the raw rate.

**(b) Agreement with the hand pass in research 118 §6.4**, `build/p259/agree.mts`, three numbers and no
similarity score, each recomputable by a second person from two JSON files:

- **Part naming.** Each of the nine hand components is mapped to the model part whose ANCHOR FILE SET
  has the largest Jaccard overlap with the hand component's cited files; the mapping is computed and
  printed by the harness and never chosen by a judge. The verifier then answers, blind, whether the
  model's `name` and `does` describe the same job. Reported as **n of 9**, with the mapping table.
- **Contract-field citation overlap.** For each mapped pair, `|files cited by both| / |files the hand
  component cites|`. Reported as the nine values and their mean.
- **Journey step agreement.** For each of the three hand journeys, the longest common subsequence of
  part ids between the hand steps and the model's steps, over the hand journey's step count. Reported
  per journey. (The hand journeys name hand components, so the mapping above is applied first and the
  mapping is printed.)

**(c) The blind sample.** `build/p259/blind.mts` draws **20 claims per recipe**, stratified 5 per grade
(`gate`, `call-site`, `declaration`, `resolves`) and refilled in ladder order when a stratum is short,
with a seeded PRNG whose seed is `sha256(runId)` and is printed. Identity is hidden: the two recipes'
samples are written as `build/p259/blind/A.json` and `B.json`, the letter assigned by sorting
`sha256(agentId + salt)`, the salt written to `build/p259/blind/.salt` which **the verifier must not
open until after judging**; each row carries only `{claimId, field, text, citations: [{at, why, grade}]}`
with the agent, the model and the recipe version stripped. The verifier judges each claim
**TRUE / FALSE / CANNOT TELL** against the repository, writes `build/p259/blind/<letter>.verdicts.json`,
and only then runs `blind.mts --unblind`, which prints the two tallies and the `.salt` file's mtime
beside the verdicts file's, so it can be SEEN that the salt was not read first.

Both readings are published side by side in the commit body and the running log, honest numbers
included, and **the shipped default recipe is the one that measured better** — `ARCH_SEMANTIC_SUGGESTED_AGENT_ID`
is set from that reading in the same commit, with the reading quoted beside it in the source.

---------------------------------------------------------------------------------------------------

## 6. The views (`src/renderer/arch/**` and `src/main/menu.ts`, C)

### 6.1 The tab row and the menus

The map tab's inner tab row becomes **Map · Journeys · Surfaces · Gates**, in reading order: what lives
where, how setup reaches a result, what it exposes, why work stops. `ArchMapInnerTab` gains `'journeys'`;
`'map'`, `'surfaces'` and `'gates'` keep their ids, their store keys and their menu actions. View gains
one row, `Architecture Journeys` (`show-arch-journeys`), directly under `Architecture Map` to match the
tab order, no accelerator, glyph `circuit-board`, behind the same `archRowsOn()` gate.
`p175-arch-menu-flag.test.ts` counts five gated rows instead of four; `view-menu.test.ts` asserts the
label and the rail order — five sidebar views contiguous, the four map rows after them, Catch Me Up last.
The phase brief says: *"View gained Architecture Journeys under Architecture Map, present only while
Architecture is on."*

### 6.2 With no reading — the §7.6 sentence and its Settings link

`ArchSemanticResult.readAt === null` on Journeys and on Gates draws, above everything else, one line
and one button and nothing more:

> **Nothing has read this repository yet.** An agent you pick in Settings says what each part is for.
> `[ Settings ]`

The button is `gmuxBridge().openSettings()`, the door `MachineConfirmAction.tsx` already uses, for the
reason written there: refusal 8 puts the agreement behind exactly one surface and a second one here
would be a second door. Gates keeps its whole computed worksheet below the line — the deterministic
half is complete without any model, and off must never read as broken.

### 6.3 The Journeys view, `ArchJourneys.tsx`

A journey is a numbered list of steps. Each step draws: its number, the part's label (a link that
selects that box on the Map tab), the step's `label`, and the step's citation chips. A journey from
`docs/arch/flows/` is drawn first under the sub `from this repository's own contract`; a model journey
under `read by <agent>`. Nothing else on the resting face: the `why` of each citation, the fact behind
it and the counts ride the hover.

### 6.4 The chips, the kinds and the floors

One table, `src/renderer/arch/cite.ts`, in the shape `rung.ts` already has, so four grades cannot wear
five dresses:

| grade | glyph | tone | word | hover sentence |
| --- | --- | --- | --- | --- |
| `gate` | `shield` | `--success` | gate | A gate was found at this line. |
| `call-site` | `symbol-event` | `--success` | call | A call was found at this line. |
| `declaration` | `symbol-method` | `--status-idle` | declaration | A declaration was found at this line. |
| `resolves` | `circle-outline` | `--status-idle` | line only | This line is here. Nothing was found at it. |
| `stale` | `history` | `--status-idle` | stale | The line this cites no longer carries that fact. |

**A call site and a declaration are never drawn identically**: different glyph, different word,
different tone. Gate rule 6a asserts no two rows of that table share both a glyph and a word.

**The hover says a fact was found here and never more.** Gate rule 6c scans every string this table and
its composers can draw against a forbidden vocabulary — `verified`, `verify`, `correct`, `true`,
`proven`, `prove`, `confirmed`, `accurate`, `valid`, `checked`, `guaranteed`, `certain` — with the scan
proved on planted strings of which some must fail. §6.4 measured the checker catching **2 of 7**
deliberate lies, and a part renamed *"Billing and card capture"* keeps every green chip it had.

**Every rate is drawn as a pair.** One formatter, `citeRate(r: ArchRateReading): string`, and it takes
both halves or it does not compile:

> `24 of 41 backed · 10 of 41 would be by chance`

and behind the hover, the per-grade breakdown and the gate-shaped line:

> `gate 0 · call 9 · declaration 15 · line only 17` — `0 of 6 gates cite a gate`

### 6.5 What the map inspector gains

Phase 258 drew `Runs in`, `Exposes`, `Keeps`, `Reaches`, `Guards`, `Tests`, `Rung` and deliberately
left three rows out as model fields. They arrive now: **Receives**, **Does**, **Returns** and **Where it
stops** (the `limit`), each a sentence with its chips beside it, each drawn stale when it is stale, and
each absent rather than empty when nothing has read the part. `Runs in` keeps its computed value and
gains the model's `runsIn` sentence below it, labelled `read by <agent>`, so the computed and the read
are never the same line.

### 6.6 Word budgets, in numbers, measured the mock's way

| view | resting-face budget | note |
| --- | --- | --- |
| Map | ≤ 340 (was ≤ 300) | the inspector's four new rows, at rest showing `Select a part.` |
| Journeys, no reading | ≤ 40 | one sentence and the button's label |
| Journeys, with a reading | ≤ 260 | 3 journeys × 8 steps × a label, plus chips that carry glyphs and one word |
| Surfaces | ≤ 220 (unchanged) | |
| Gates, before a part is named | ≤ 150 (was ≤ 120) | the no-reading line when there is none |

Every explanation lives behind a hover or a disclosure. No paragraph on any resting face.

---------------------------------------------------------------------------------------------------

## 7. The proof, run rather than read

### 7.1 `npm run conformance:semantic` — `build/conformance-semantic.mjs` + `build/semantic-conformance-probe.mts` (B)

Shape: `conformance:evidence`'s. One pinned `tsx` per probe run over the SHIPPING modules, over
committed fixtures under `build/fixtures/semantic/` (a fact file, a decl file, a tracked list with line
counts, a drafted document, and the committed `build/p256/semantic/tortie.pass.json` reshaped into the
answer grammar), then the same probe over one ablated copy of those modules per clause under a temp
directory removed in a `finally`. **Spawns no agent, no Electron, no tmux, no git, makes no request,
reads nothing under the person's home, and spends no token.** `pure` in `build/verification-checks.mjs`.
Every scanner is proved on planted fixtures of its own, some of which must fail.

| rule | what it pins | ablation (must go red) |
| --- | --- | --- |
| 1a | the three budget constants and the seven-category order with `test` absent | `test` admitted |
| 1b | allocation: the floor of 4, the ceiling of half, the give-back in order, over a fixture where `effect` would otherwise eat `gate` | the ceiling removed |
| 1c | determinism: reversed facts, reversed files and reversed parts compose byte-identical blocks | a `Map` iterated unsorted |
| 1d | the shrink under the cap: a part whose block is over 65,536 bytes composes under it and the contract half is whole | the shrink applied to the contract |
| 1e | a category with no rows prints `none found by this reader` | zeroes dropped |
| 1f | every fact line's `path:line` resolves in the fixture's tracked list | the line taken from the wrong row |
| 2a | `ARCH_SEMANTIC_SYSTEM_PROMPT` byte-pinned; it names no rung word as an instruction to write one | — |
| 2b | the composed prompt's byte size at the cap and against the 88-byte line budget | — |
| 2c | no repository field reaches any argv, over every call the composer and the runner make (the `conformance:arch` scan, re-run here) | a path interpolated into an argv |
| 3a | the citation grammar over 12 hostile strings (`../x:1`, `/etc/passwd:1`, `a:0`, `a:1e9`, `a\b:1`, a control character, a 900-char path, no colon, two colons, a negative, a float, an empty path) | the traversal clause |
| 3b | resolution reads only `arch_tree_file`: the probe hands a file seam that throws and the grader still answers | a `readFileSync` in the grader |
| 3c | the ladder over a planted set, one arm per grade, and the precedence when several are in the span | `gate` demoted below `call-site` |
| 3d | `ARCH_CITE_SLACK` is one constant: ablating it moves the rate AND the floor together | a second slack in the floor |
| 4a | R1 refuses the ten words as a field VALUE and KEEPS the same word inside a `does` sentence | the value test made a substring search |
| 4b | R2 drops the ROW; an answer with no row left is refused whole under `no-row-stood` | the bad citation trimmed instead |
| 4c | R3 as a TOKEN, over research's own three planted numbers: **3 of 3 caught against the substring form's 1 of 3** | `.has` put back to `.includes` |
| 5a | the floor from the shipping function equals the gate's own independent re-derivation over the fixture | the clamp to 1..n dropped |
| 5b | no rate is stored or drawn without its floor: the schema has no such column and no drawn fraction has a composer that takes one half | a one-argument formatter planted |
| 6a | no two rows of the cite table share both a glyph and a word; `call-site` and `declaration` differ in glyph, word and tone | their rows made identical |
| 6b | removing the fact and leaving the decl moves the same line's grade from `call-site` to `declaration` | the decl table not read |
| 6c | no drawn string says anything stronger than a fact was found; scanner proved on plants of which some must fail | `verified` planted in a hover |
| 7 | **the planted battery**: `plant.mts`'s seven shapes run against the SHIPPING validator and grader, the CAUGHT number asserted at its measured value with each shape named, and the same number read from the source the face reads it from | any refusal weakened |
| 8a–d | staleness: a dead citation marks the claim stale and names the citation; the sentence is unchanged; a moved line with the same `(kind, subject)` stays current and the line is rewritten; nothing is deleted | the `(kind, subject)` compare dropped |
| 8e | the refresh spawns nothing: `refreshSemantic` and its caller name no spawn, no runner and no `arch:enrich`, read by matching braces | a call planted |
| 9a | **refusal 8, structural**: every spawn reachable from a watcher event passes through `repairSkipReason` and `ArchPassRunner`'s confirm re-check; asked over the real source by matching braces, proved on planted texts | the skip bypassed |
| 9b | `arch:enrich` is the one channel that can spawn and `ArchPassRunner.run` the one runner; `arch:semantic` names no spawn | a second spawn path planted |
| 9c | `part` and `journeys` scopes take the same gate, the same interval and the same input-hash refusal as `whole` | the scope switch put above the gate |
| 9d | `archAgentConfirmed` answers true for a builtin launchable row and false when the row is not launchable | the launchable test dropped |
| 10a | every row in `SEMANTIC_RECIPES` has a non-null `measuredOn` and a matching record under `build/p259/measured/` | a row with no record |
| 10b | a row with no record is absent from the table and Settings reads `not-measured` | the filter removed |
| 10c | the model ids are exactly `opus` and `gpt-6-astra` | either changed |
| 10d | both recipes are handed byte-identical system prompt bytes | a second prompt constant |
| 11 | registration: `package.json` names the gate and the probe, `verification-checks.mjs` classifies both, `HELPER_USER_FLOOR` raised by the probe's own count (127 → 128), the contract baseline moved by exactly one line | — |

Ablations: **at least 22**, one clause each; every one must turn a pin red and the gate names the clause.

### 7.2 `npm run probe:p259` — `build/p259/probe-p259-reading.mjs` (B writes; the verifier runs)

`"probe:p259": "npm run build && node build/harness-socket.mjs --fresh gmux-p259 'node build/p259/probe-p259-reading.mjs'"`.
Refuses unless `GMUX_TMUX_SOCKET` begins `gmux-p259`; run outside the harness it makes
`gmux-p259-<pid>` itself and unlinks the socket file in its `finally`. `HOME` inside the scratch
directory, the clone from `build/p259/corpus.sh`, ONE Electron at HEAD through `withElectron`, a SECOND
from a BUILT parent checkout named by `P259_PARENT_CHECKOUT`, one after the other and never at once.
**It spends no token**: the reading is LOADED from the measurement's own `arch.db`, copied into the
scratch profile, so the app run and the model runs are separate acts. `--self-test` proves every grader
on planted DOM readings and launches nothing. His `-L gmux` sessions counted before and after.

- **A no agent.** Profile seeded with `agentId: null`. The Journeys tab is PRESENT, draws the one
  sentence and the Settings button and nothing else; the Gates tab still answers a named part with its
  computed rows; the process table shows zero children of the app beyond its own.
- **B journeys.** With the reading loaded: every step names a part id the map holds, every step carries
  at least one chip, the `docs/arch/flows/` journey is drawn first with its own sub.
- **C gates.** Name `src-main` in the select: the computed rows are Phase 258's, unmoved, and the model's
  gate reasons are drawn beside them with their chips and their `n of m` pair.
- **D chips and floors.** Every `.arch-cite[data-grade]` read off the DOM and compared with `arch.db`'s
  `arch_claim_cite`, grade for grade; every drawn rate's two halves compared with `arch_claim_rate`.
- **E stale.** A `/bin/sh` writes a cited file from outside so a cited fact is gone; after the watcher's
  own pass the claim reads stale on the face, the sentence is byte identical, the dead citation is
  named, and `arch_semantic_run` has exactly as many rows as before — nothing spawned.
- **F words.** `innerText` word counts above the fold at 1440×900 against §6.6's caps.
- **G menus.** `show-arch-journeys` through the shot drive's menu-action path lands on the Journeys
  inner tab of the ONE map tab, tab count 1 before and after.
- **H no colour literal.** Every `.arch-cite` element's computed colour equals the computed value of
  `--status-idle` or `--success` on the live root.
- **P parent** at `e125e800`: no Journeys tab, no chips, no model rows in the inspector, no rate anywhere.
  Findings ≥ 4 at the parent and 0 at HEAD.

### 7.3 The verifier's independent methods (named here so they are reviewable before the work)

Tier 3 earns two, one of which is an attack.

- **Attack, do not confirm** — the phase's whole claim is that the answer is bounded. Extend
  `plant.mts` with shapes it does not have and run them against the SHIPPING validator: a claim citing
  a line one PAST the slack, a claim citing a file in ANOTHER part's box, a gate whose `answer` is a
  fifth word, a journey step naming a part id that is a prefix of a real one, a `runsIn` reading
  `reached` with a trailing space, `RESOLVES` in capitals, a number written `1 068`, and a citation
  whose path differs from a tracked file only by case. Report what is caught and what is not.
- **Re-derive independently** — a second grader in the verifier's own hand, reading `arch_fact`,
  `arch_decl` and `arch_tree_file` straight out of the profile's `arch.db` with its own interval
  arithmetic, compared claim for claim against what the DOM draws and what the store holds; and the
  floor re-derived by a different method (a sorted sweep over merged intervals rather than a line set).
- **Measure the parent commit** — arm P above, and the CAUGHT number of `plant.mts` re-read at the
  parent, where there is no grader at all.
- **Judge the blind sample** — §5.3(c), 20 claims per recipe, identity hidden, `.salt` unopened until
  the verdicts are written.

---------------------------------------------------------------------------------------------------

## 8. Ownership — three builders, no overlap

### Builder A — the block, the grader, the store, the wire
Owns, exclusively:
- `src/main/arch/enrich/compose.ts` (`ARCH_SEMANTIC_SYSTEM_PROMPT`, `ARCH_JOURNEY_SYSTEM_PROMPT`,
  `composeArchSemanticPrompt`, `composeArchJourneyPrompt`, the three budget constants; the existing
  whole and delta composers untouched except where they share `assemble` and `composeUnderCap`).
- `src/main/arch/enrich/validate.ts` (`validateArchSemanticAnswer`, R1/R2/R3; and the ONE-LINE token
  change to rule 8 of `validateArchAnswer`).
- `src/main/arch/enrich/run.ts` (the `part` and `journeys` scopes through the existing gate).
- `src/main/arch/semantic/**` (new, pure: `grade.ts`, `floor.ts`, `drift.ts`, `sentences.ts`, `types.ts`).
- `src/main/arch/db.ts` (migrations `011-arch-decl`, `012-arch-semantic`, their statements, and the
  readers `declsOf`, `declCountsUnder`, `semanticOf`, `writeSemanticRun`, `markClaimStale`,
  `writeClaimRate`), `src/main/arch/tree-facts.ts` (the decl rows off `IndexedFile.symbols`),
  `src/main/arch/check-coordinator.ts` (the `semantic(input)` handler and the refresh on the existing
  pass), `src/main/arch/ipc.ts` (registers `arch:semantic`).
- `src/shared/arch.ts` (DERIVED types only: `ArchCiteGrade`, `ARCH_CITE_GRADES`, `ARCH_CITE_SLACK`,
  `ArchSemanticCite`, `ArchPartReading`, `ArchJourneyReading`, `ArchGateReading`, `ArchRateReading`;
  `ARCH_ROW_KEYS` UNTOUCHED), `src/shared/ipc/arch.ts` (`ArchPassScope` widened, `ArchEnrichInput.partId`,
  `arch:semantic`, `ArchMenuActionId` += `'show-arch-journeys'`),
  `docs/audits/contract-baseline.txt` (regenerated, one line).
- Every test under `src/main/arch/__tests__` and `src/main/arch/enrich/__tests__` it touches.
Proof A runs: `npm test -- src/main/arch`, `npm run typecheck`, `npm run conformance:arch`,
`npm run conformance:facts`, `npm run conformance:reading`, `npm run conformance:evidence`,
`npm run gate:contract`.

### Builder B — the recipes, the measurement harness, the gate
Owns, exclusively:
- `src/main/overview/fold/recipes.ts` (the two semantic rows, `SEMANTIC_RECIPES`,
  `archSemanticRecipeFor`, `archSemanticRecipeAgentIds`, `ARCH_SEMANTIC_SUGGESTED_AGENT_ID`) and
  `src/main/overview/fold/options.ts` only where the semantic offer reuses `joinHarnessOptions`,
  plus `src/main/overview/fold/__tests__/*` cases for both.
- `build/p259/**`: `corpus.sh`, `seed-arch-agent.mjs`, `measure.mjs` (drives the SHIPPED `arch:enrich`
  channel through the app and NEVER a CLI), `agree.mts`, `blind.mts`, `probe-p259-reading.mjs`,
  `measured/` (written by the integrator), `SPEC.md` (this).
- `build/conformance-semantic.mjs`, `build/semantic-conformance-probe.mts`, `build/fixtures/semantic/**`.
- `package.json` (`conformance:semantic` and `probe:p259` lines only),
  `build/verification-checks.mjs` (`pure('conformance:semantic')`, `electron('probe:p259')`),
  `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 127 → 128).
Proof B runs: `--self-test` on the probe (launches nothing), `npm run conformance:semantic` against the
integrated tree, `npm run gate:checks`, `npm run gate:electron`, `npm run gate:background`.
**Builder B spends NO token.** The harness is written and self-tested against a recorded answer fixture;
the live runs are the integrator's.

### Builder C — the surface and the menus
Owns, exclusively:
- `src/renderer/arch/**` except nothing of A's: new `ArchJourneys.tsx`, new `cite.ts`, new
  `arch-semantic.css`, and edits to `ArchMapTab.tsx` (the fourth inner tab), `ArchInspector.tsx` (the
  four model rows), `ArchGates.tsx` (the model reasons beside the computed rows), `copy.ts`,
  `bridge.ts` (`semantic(input)`), `store.ts` and `state/view-state.ts` / `state/map-actions.ts`
  (`mapTab` gains `'journeys'`, the semantic entry), `open-map.ts`, `shot-probe.ts` (the drive hooks
  the probe reads), every test under `src/renderer/arch/__tests__`.
- `src/main/menu.ts` (one row), `src/renderer/app/menu-actions.ts` (one case),
  `src/main/__tests__/p175-arch-menu-flag.test.ts`, `src/main/__tests__/view-menu.test.ts`.
- NOT `tokens.css`, NOT `presets.ts` — no token moves, so `conformance:hue` is not in C's proof list.
Proof C runs: `npm test -- src/renderer/arch src/main/__tests__/p175 src/main/__tests__/view-menu`,
`npm run typecheck`, `npm run gate:menu-glyphs`, `npm run gate:menu-accelerators`.

### The interfaces, written down so a name cannot drift

| between | name | declared in | shape |
| --- | --- | --- | --- |
| A → C | `ARCH_CITE_GRADES`, `ArchCiteGrade`, `ARCH_CITE_SLACK` | `src/shared/arch.ts` | §2.3 verbatim |
| A → C | `ArchPartReading`, `ArchJourneyReading`, `ArchGateReading`, `ArchRateReading`, `ArchSemanticRunFace` | `src/shared/arch.ts` | §3.4 verbatim |
| A → C | `'arch:semantic'`, `ArchSemanticInput`, `ArchSemanticResult` | `src/shared/ipc/arch.ts` | §3.4 verbatim; C's `bridge.ts` exposes `semantic(input)` |
| A → C | `ArchMenuActionId` += `'show-arch-journeys'` | `src/shared/ipc/arch.ts` | C's menu row and case use exactly this id |
| A → B | `ArchPassScope` += `'part' \| 'journeys'`; `ArchEnrichInput.partId?: string` | `src/shared/ipc/arch.ts` | B's `measure.mjs` sends exactly these |
| A → B | `composeArchSemanticPrompt(input, partId)`, `composeArchJourneyPrompt(input)`, `validateArchSemanticAnswer(text, ctx)`, `gradeCitations`, `citeFloor` | `enrich/compose.ts`, `enrich/validate.ts`, `semantic/grade.ts`, `semantic/floor.ts` | §1, §2 |
| A → B | `ArchStore.declsOf`, `declCountsUnder`, `semanticOf`, `writeSemanticRun`, `markClaimStale`, `writeClaimRate` | `src/main/arch/db.ts` | §8 A, verbatim signatures |
| B → A | `archSemanticRecipeFor(agentId): FoldRecipe \| null` | `overview/fold/recipes.ts` | mirrors `archRecipeFor` |
| C → B | DOM contract the probe reads: `.arch-tabs button[data-tab="journeys"]`, `.arch-journeys[data-source]`, `.arch-journey-step[data-seq][data-part]`, `.arch-cite[data-grade][data-at]`, `.arch-rate[data-backed][data-total][data-floor]`, `.arch-claim[data-field][data-stale]`, `.arch-no-reading`, `.arch-no-reading button`, `.arch-inspector [data-field="receives"\|"does"\|"returns"\|"limit"]` | C's markup, B's probe | pinned here; C may add classes, never rename these |

### The integrator
Reconciles `src/shared/*` (append-only during the build); runs the full battery —
`npm run typecheck && npm run build && npm test && npm run smoke:t1 && npm run smoke:t3 &&
npm run conformance:semantic && npm run conformance:evidence && npm run conformance:facts &&
npm run conformance:reading && npm run conformance:arch && npm run conformance:arch:modules &&
npm run gate:checks && npm run gate:electron && npm run gate:background && npm run gate:contract`;
**then runs §5, which is the only step that spends a token**; fills `measuredOn`, the deadlines, the
fuses and `ARCH_SEMANTIC_SUGGESTED_AGENT_ID` from what was measured; writes `build/p259/measured/*.json`;
runs `npm run probe:p259`; scans for duplicated 10+ line blocks (the cite chip must not copy the rung
chip; the journeys and gates rows must share one claim component); writes the CLAUDE.md gates paragraph
("Touching the semantic pass, the grader or the reading?"); appends the BACKLOG running-log line with
both recipes' numbers side by side; does NOT bump the version; does NOT tag; commits with the subject
and first body line at the top of this file, no trailers.

---------------------------------------------------------------------------------------------------

## 9. Refusals and stated limits

**Refused, by the charter:**
- **No `accepted-live`, written or computed.** R1 refuses it as a value and `conformance:evidence`
  rule 1c's scan over the four directories runs unchanged.
- **No model turn on a file change.** Refusal 8 stands and is asked structurally (gate rules 8e, 9a, 9b).
  The honest sentence §7.5 wrote stands too: a `git pull` CAN start a child on a repository where the
  person already confirmed an agent, and what stops a storm of pulls becoming a storm of spawns is six
  named refusals in a stated order. This phase joins that path and opens no second one.
- **No key moved in `docs/arch/`.** `ARCH_ROW_KEYS` untouched; `ArchFlow` is READ and never written.
  Direction C stays deferred to him.
- **No second repository measured.** His word covered this repository.
- **No credential touched.** The CLIs use their own logins; no `security` call; no keychain opened;
  `~/.claude` and `~/.codex` are not read beyond what the shipped launch path already does.
- **No chip that claims truth.** Attribution, not verification, and gate rule 6c holds the wall.
- **No bespoke harness around the enrich path.** `build/p259/measure.mjs` drives `arch:enrich` through
  the app and never composes an argv, never calls `runFold`, never spawns a CLI.
- **No new token, no new colour literal, no new CSS colour.** `tokens.css` is untouched, the dark digest
  stands, `conformance:hue` rule 26 stays green.
- **No new watcher subscription.** The refresh rides the pass that already runs;
  `conformance:watcher`'s FSEvents exclusion budget is untouched.
- **No new package. No third-party code. The CSP does not move.**
- **No count badge on any node.** The map's node chip is still the rung glyph alone;
  `conformance:arch:modules` stays green.

**Stated limits, each written into the code and the hover rather than discovered later:**
1. **The checker is not a lie detector and the face says so.** `plant.mts` catches 2 of 7. The five it
   misses are the five a confident wrong reading actually looks like: a false job on true citations, an
   invented part citing real files, an unrelated test, a reversed journey, and an invented gate whose
   cited line really is a gate. A build that does not move that number says so on the face.
2. **A fact carries a LINE and not a SPAN**, so a citation more than three lines from the call that
   backs it reads `resolves` even when it is right. §6.4 measured that at 1 of 41. Widening a fact to a
   span is a Phase 257 change with a corpus re-measure and is refused here.
3. **A three-line slack backs a COMMENT sitting above a declaration**, which §6.4 measured moving one
   citation's class between two runs. It is the price of proximity and the reason the KIND is drawn.
4. **The declaration base is the more generous instrument**, floor 23.8% against the call-site base's
   2.3%, and 21.9 of those 23.8 points are the declarations themselves. Every rate carries its floor for
   exactly that reason, and a `declaration` chip is drawn quieter than a `call` chip on purpose.
5. **The model has not read the repository**, so a high backing rate measures copying and not
   understanding. That is what makes the blind sample and the agreement metric part of the measurement
   rather than decoration.
6. **Gate claims are the weakest half.** The hand pass scored 0 of its 6 gates against a gate-shaped
   fact, because `gate` is the least precise category in Phase 257's table at 58% and its facts sit at
   `throw` sites rather than at the function whose name a writer reaches for. The pair is drawn.
7. **codex reports no dollar figure**, so a codex run's cost is never recorded and never drawn. Under a
   subscription, whether claude's `--max-budget-usd` fuses anything is unknown and §5 records what was
   observed; the deadline is the real fuse.
8. **`MAX_THINKING_TOKENS: '0'` on an Opus row is inherited, not measured for this question.** If the
   measurement says it must move, it moves in the same commit with the reading that justified it.
9. **The second store costs something.** `arch_decl` adds roughly 30,000 rows on this repository and a
   write per file per pass. The number and the milliseconds are measured by the integrator and written
   into the commit body; above 1.3× the Phase 257 pass here, it goes behind a setting.
10. **The reading does not travel with a clone.** It lives in Tortie's own disposable `arch.db`, which
    is §7.4's decision and research 77 §5's own proposal. Making it travel is a key-set move and is his.
