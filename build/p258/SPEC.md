# Phase 258 — the reading surface. SPEC.

Subject `feat(arch): the computed ladder and the reading surface`. First body line
`Phase 258: the reading surface`. Semver minor. Tier 2 for the surface, Tier 3 for the ladder.
Charter: docs/BACKLOG.md "Phase 258" entry, which is research 118 §10 Phase 2 verbatim on top of
Phase 257's fact base (`c8072b36`, landed `97c021ef`, this tree at `88165be1`). Research 118 §7.2
is the ladder, §7.6 the floor, §3.1/§3.2 the shape, §4.4 F1 the defect closed on the way, §9 the
approved picture (`build/p256/mock/mock.html`). Reference implementation of the rungs:
`build/p256/det/ladder.mts` (`rungOf`, ported never imported; its `--self-test` shape is the gate's
planted graphs). **No model call, no agent turn, no token, anywhere in this phase.**

What this spec settles, in order: §0 decisions the builders inherit; §1 the ladder, rung by rung, as
code, and why `accepted-live` cannot exist; §2 the seed rule for `reached`, MEASURED over scratch
copies of this repository and stoa with seven candidate rules, and the pick; §3 the partition (rule Q
beside rule P), how F1 is closed, and what a one-unit repository draws; §4 the surface against the
mock, with word budgets in numbers, colours and the menus; §5 the gate `conformance:evidence`, the
extension of `conformance:reading`, and `probe:p258`; §6 ownership for three builders with no
overlap and every interface pinned by name; §7 refusals and stated limits.

Every number below was measured on 2026-09-11 on this machine by `build/p258/seed-measure.mts`
(uncommitted in this tree, builder C keeps it) over `git clone --local` copies of this worktree at
`88165be1` and of `/Users/gdc/stoa` at `dc942342`, with the PRODUCT's own fact pass
(`build/p257/facts-corpus.mts`: tortie 22,231 facts in 5,969 ms; stoa 5,195 in 5,658 ms) and Tortie's
own resolver for the import graph (tortie 3,330 tracked, 8,140 first-party edges; stoa 4,593 tracked,
1,023 edges). The raw prints are quoted in §2. `/Users/gdc/runstory` and `/Users/gdc/specfactory`
were never read.

---------------------------------------------------------------------------------------------------

## 0. Six decisions the builders inherit rather than re-decide

**D1. The rung is a function of (anchors, first-party import graph, entrypoint files, test files,
manifest-named files, seeds) and of nothing a person wrote.** `src/main/arch/evidence.ts` is pure in
the sense `conformance:reading` rule 9 uses: no `node:`, no `electron`, no process, no file, no store.
It never receives an `ArchDocument`. The gate proves it two ways (§5 rules 1 and 4): the enum has five
members and the string `accepted-live` appears in no source file of the four directories, and the rung
of every box is BYTE IDENTICAL with the contract loaded and with `document: null`.

**D2. The seed rule is G, "unit-own + declared", and it was chosen by the table in §2, not by
taste.** A part's walk starts from the files ITS OWN UNIT starts (composition roots and program mains
inside the unit's extent) plus the tracked file the unit's manifest DECLARES as its entry. A manifest
file is never a seed, a CI job is never a seed, an npm script is never a seed, a compose service is
never a seed, a worker start is never a seed. On a one-unit repository G degrades to "source starts
plus the declared entry", which on this repository gives exactly the §7.2 answer minus one artefact
(the `other` box no longer reads `reached` because `package.json` is inside it).

**D3. Regions come from UNITS, and units come from what a manifest declares and what a program
starts — never from `boundary.path.module-root`.** Rule Q (§3) reads npm workspace members, Cargo
member crates, `boundary.library`, `entrypoint.package-main`, `entrypoint.bin`,
`entrypoint.container`, `entrypoint.process` and source `entrypoint.main` facts. Workers, threads,
utility processes and compose services are STARTS, drawn as one line inside the region that holds
them, never a region and never a seed, because on both measured repositories not one `new Worker(...)`
names a tracked script (`pool.ts:171` passes `this.options.workerPath ?? defaultWorkerPath()`;
`clientRuntime.ts:87` passes `url`).

**D4. Rule P's boxes ARE the parts. Regions are a grouping OF boxes; they add no box and split none.**
The map draws rule P's partition (Phase 201) and the contract draft now writes one component per rule
P box (F1 closed, §3.3), so the contract, the map, the drill, the sidebar, the inspector, the surfaces
list and the worksheet all name the same parts by the same ids. Rung, counts and region sit ON a box.

**D5. The map tab grows an inner tab row — Map · Surfaces · Gates — and a single click on a box now
SELECTS it for the inspector; the drill is a double click, Enter on the selected box, or the
inspector's own Open control.** This is the mock's gesture (§9: a node is a `button[aria-pressed]`
and the inspector follows it). The sidebar's Components rows and the breadcrumb drill exactly as
Phase 161 left them. The only battery script that clicks a box is `build/p256/probe-p256-pane.mjs`,
a research prototype outside the battery; `probe:p167` opens and closes the map and never drills.
Builder B updates `p161-drill.test.tsx` for the gesture and the phase brief says so.

**D6. No new token.** The rung mark is a glyph, a word behind hover and one of two EXISTING colours:
`--status-idle` for `off-repo`, `declared` and `composed` (already pinned at 3:1 on `--bg-active` on
both bases since Phase 218), `--success` for `reached` and `tested`, which this phase ADDS to
`chromaticPinsFor` on both bases at floor 3 on `--bg-active`. Measured: dark `#6bc46d` reads 4.711 on
`#424238`, the lightest active fill any offered dark frame reaches (Phase 218's binding fill), and
6.764 on the shipped fill; light `#2c6a3b` reads 4.733 on the shipped `#d9dce3`. `tokens.css` does not
change, so `conformance:hue` rule 25's dark digest is untouched, and rule 32 measures the new pin over
every offered frame and every contrast level. Colour is never the only signal: five glyphs, five words.

---------------------------------------------------------------------------------------------------

## 1. The ladder, rung by rung, as code — `src/main/arch/evidence.ts` (A)

### 1.1 The enum, and why there is no path to `accepted-live`

In `src/shared/arch.ts` (DERIVED types only; `ARCH_ROW_KEYS` untouched, `conformance:arch` rule 12
re-run unchanged):

```ts
/** The five computed rungs of research 118 §7.2, lowest first. There is no sixth. */
export const ARCH_EVIDENCE_RUNGS = ['off-repo', 'declared', 'composed', 'reached', 'tested'] as const;
export type ArchEvidenceRung = (typeof ARCH_EVIDENCE_RUNGS)[number];

/** One part's rung with the per-file counts behind it, so the hover can say the denominator. */
export interface ArchRungReading {
  rung: ArchEvidenceRung;
  /** Anchors that are tracked files at HEAD. 0 is `off-repo`. */
  anchors: number;
  /** Of those, the ones this build parses (rule P's "source"). */
  parsed: number;
  /** Parsed anchors a walk from the part's seeds reaches. */
  reached: number;
  /** Parsed anchors some file carrying a test fact imports. */
  tested: number;
  /** How many seed files the part's units gave the walk. 0 means nothing recognised starts it. */
  seeds: number;
}
```

`ArchEvidenceRung` is derived from the const array and nothing else. Every function in `evidence.ts`
that answers a rung returns `ArchEvidenceRung`; `rungOf` is a `switch`-free decision over booleans
whose only `return` literals are the five words, and the gate scans the four directories
(`src/main/arch`, `src/shared`, `src/renderer/arch`, `src/preload`) with comments and string bodies
blanked for `accepted-live` and `accepted_live` and requires zero hits (rule 1c). A sixth word cannot
be added without editing the const, which moves the pinned array (rule 1a), and cannot be produced at
runtime, because no string reaches a rung from any input: the inputs are sets of paths and a graph.

### 1.2 The inputs, and the tables they are read from

| input | read from | how |
| --- | --- | --- |
| `tracked: ReadonlySet<string>` | the one fixed `git ls-files -z` the map read already runs (`lsFilesCall()` in check-coordinator) | unchanged |
| `graph.out / graph.into` | `arch_import` rows with `resolution = 'first-party'` and `to_path` non null (`db.imports(repoKey)`, already in `ArchMapComposeInput.imports`) | `out[from] ∋ to`, `into[to] ∋ from`, self edges dropped, both maps keyed on repository relative paths |
| `entrypointFiles: Map<file, kinds>` | `arch_fact` ∪ `arch_fact_wrap` rows with `category = 'entrypoint'`, via the new `db.factsOf(repoKey, ['entrypoint', …])` | file → the set of kinds it carries |
| `testFiles: ReadonlySet<string>` | distinct `rel_path` of rows with `category = 'test'`, via the new `db.factFiles(repoKey, 'test')` (15,816 rows on tortie collapse to 875 files; the compose never receives the rows) | |
| `namedByManifest: ReadonlySet<string>` | files carrying any `boundary` (both halves) or `entrypoint` fact, from the same `factsOf` read | the prototype's reading of "a manifest fact names one" |
| `units: ArchUnit[]` | rule Q (§3.1), computed in `skeleton.ts` from the same facts plus `readArchManifests` | |
| `seeds(part)` | §2's rule G over the part's units | |

### 1.3 The five rungs, exactly as `rungOf` decides them (ported from `ladder.mts` line for line)

```
here      = anchors ∩ tracked
off-repo  ⇐ |here| = 0
reached   ⇐ some seed s ∈ here, or a BFS over graph.out from the seeds reaches a file in here
tested    ⇐ reached ∧ ∃ a ∈ here, ∃ f ∈ graph.into[a] with f ∈ testFiles
composed  ⇐ ¬reached ∧ (∃ a ∈ here with |graph.into[a]| > 0  ∨  ∃ a ∈ here with a ∈ namedByManifest)
declared  ⇐ otherwise
```

The predicate order is the ladder's own: `tested` is asked only after `reached` holds, so a part a
test imports but nothing starts reads `composed` (the seventh planted graph). `reached` is decided by a
breadth first walk over `graph.out` that stops at the first anchor; `seeds` that are not tracked are
dropped before the walk. `ArchRungReading.reached/tested/parsed` are counted in the same pass over
`here` with `grammarFor`-parseability handed in as `parseable`, so `evidence.ts` imports nothing from
`symbols/`.

Exports of `evidence.ts`: `buildImportGraph(imports) → ArchImportGraph`, `rungOf(anchors, ctx) →
ArchRungReading`, `seedsFor(units, entrypointFiles, declaredEntries, tracked) → Map<unitId,
ReadonlySet<string>>`, `declaredEntries(facts, tracked) → ReadonlySet<string>` (§2's D), and the type
`ArchEvidenceContext`. Nothing else. `map.ts` is its only production importer.

### 1.4 What each rung SAYS on the face (hover sentences, `src/renderer/arch/rung.ts`, B)

| rung | glyph (codicon) | colour token | hover sentence (≤ 11 words) |
| --- | --- | --- | --- |
| `off-repo` | `circle-slash` | `--status-idle` | No file this part names is tracked here. |
| `declared` | `circle-outline` | `--status-idle` | Here, and nothing imports it or names it. |
| `composed` | `circle-filled` | `--status-idle` | Imported or named; nothing that starts reaches it. |
| `reached` | `arrow-right` | `--success` | On a path from something this unit starts. |
| `tested` | `check` | `--success` | Reached, and a test imports it. |

The hover carries the sentence, then one line of counts: `reached 583 of 1,068 parsed · 395 imported
by a test · 3 seeds`, and when `seeds = 0`: `nothing this reader recognises starts this unit`. The
chip on the resting face is the glyph alone; the word is drawn only in the inspector.

---------------------------------------------------------------------------------------------------

## 2. The seed rule for `reached`, measured

### 2.1 The instrument

`build/p258/seed-measure.mts` runs `ladder.mts`'s unchanged `rungOf` and `importGraph` over the
product's fact file for a repository, with SEVEN seed rules over THREE part sets, and prints the rung
distribution each gives. Part sets: **P** rule P's own boxes through the shipping `readingPartition`
(what the map draws); **T** the top-two-segment path parts of §7.2 (comparability with research 118);
**H** the nine hand-pass components (tortie only, `build/p256/semantic/tortie.pass.json`).

| rule | the seed set S the walk starts from |
| --- | --- |
| A all-entrypoints | every file carrying ANY entrypoint fact — §7.2's unseeded baseline, manifests included |
| B source-starts | entrypoint facts of kind `composition-root` or `main` (what A really walks from, since a manifest has no imports) |
| C composition-only | kind `composition-root` alone |
| D manifest-declared | the FILE a manifest names: `package.json` main/bin path, `[[bin]]` → `src/main.rs`, `executableTarget X` → `Sources/X/main.swift`, only when tracked |
| E unit-own | B, restricted to entrypoints inside the part's own unit (rule Q draft) |
| F outside-harness | B minus test paths and minus `build/` |
| G unit-own + declared | E over B ∪ D |

### 2.2 tortie at `88165be1` — one unit (the root `package.json`), 37 entrypoint files, 875 test files

Seed set sizes: A 37, B 18, C 15, D 3 (all three are fixture or prototype mains under `build/`),
F 8. Files reached over the whole graph: A 686, B 667, C 664, D 3, F 657.

**P, rule P's 8 boxes:**

| part | A | B | C | D | E | F | G |
| --- | --- | --- | --- | --- | --- | --- | --- |
| build | tested | tested | tested | tested | tested | composed | tested |
| demo | composed | composed | composed | composed | composed | composed | composed |
| docs | composed | composed | composed | composed | composed | composed | composed |
| other | **reached** | composed | composed | composed | composed | composed | composed |
| src-main | tested | tested | tested | composed | tested | tested | tested |
| src-preload | composed | composed | composed | composed | composed | composed | composed |
| src-renderer | composed | composed | composed | composed | composed | composed | composed |
| src-shared | tested | tested | tested | composed | tested | tested | tested |

| rule | off-repo | declared | composed | reached | tested | rungs used |
| --- | --- | --- | --- | --- | --- | --- |
| A | 0 | 0 | 4 | 1 | 3 | 3 of 5 |
| B | 0 | 0 | 5 | 0 | 3 | 2 of 5 |
| C | 0 | 0 | 5 | 0 | 3 | 2 of 5 |
| D | 0 | 0 | 7 | 0 | 1 | 2 of 5 |
| E | 0 | 0 | 5 | 0 | 3 | 2 of 5 |
| F | 0 | 0 | 6 | 0 | 2 | 2 of 5 |
| G | 0 | 0 | 5 | 0 | 3 | 2 of 5 |

**T, 37 path parts (§7.2 read 35 / 0 / 22 / 7 / 4 / 2 at `e8e451ac`):** A 0/22/8/4/3, B 0/22/10/2/3,
C 0/22/10/2/3, D 0/22/13/1/1, E 0/22/10/2/3, F 0/22/13/0/2, G 0/22/10/2/3.

**H, the nine hand components:** A, B, C, E, F and G all read `composed 1, tested 8` — §7.2's own
line, unmoved by any seed rule; D reads `composed 9`.

**Per-file share per box under G** (the number the hover draws): build 10 reached / 1 tested of 455
parsed; src-main 583 / 395 of 1,068; src-shared 73 / 39 of 99; **src-renderer 0 reached / 336 tested
of 968**; demo, docs, other, src-preload 0 / 0.

### 2.3 stoa at `dc942342` — 12 units, 44 entrypoint files, 267 test files

Units (rule Q draft, deepest first): packages/agent-sandbox, packages/testing-core,
stoa-cli/automerge-ffi, stoa-desktop-windows/src-tauri, stoa-desktop-windows/tauri-plugin-auth-webview,
stoa-web/livekit-agent, stoa-web/livekit-teammate-agent, (root), stoa-cli, stoa-vscode, stoa-web,
testing. Seed set sizes: A 44, B 17, C **0**, D 3 (`packages/agent-sandbox/src/index.ts`,
`packages/testing-core/src/index.ts`, `testing/bin/stoa-test.ts`), F 17. Files reached over the whole
graph: A 44, B 17, C 0, D 46, F 17.

**P, rule P's 22 boxes** (rows that move):

| part | A | B | C | D | E | F | G |
| --- | --- | --- | --- | --- | --- | --- | --- |
| other | reached | composed | composed | composed | composed | composed | composed |
| packages-agent-sandbox | tested | composed | composed | tested | composed | composed | **tested** |
| packages-testing-core | tested | composed | composed | tested | composed | composed | **tested** |
| stoa-vscode | reached | composed | composed | composed | composed | composed | composed |
| stoa-web-livekit-agent | reached | composed | composed | composed | composed | composed | composed |
| stoa-web-livekit-teammate-agent | tested | composed | composed | composed | composed | composed | composed |
| stoa-web-loose | tested | composed | composed | composed | composed | composed | composed |
| testing | reached | composed | composed | reached | composed | composed | **reached** |
| docs, scripts, stoa-cli, stoa-desktop-mac, stoa-desktop-windows, stoa-menubar-mac | reached | reached | composed | composed | reached | reached | reached |
| stoa-helpers-darwin | declared | declared | declared | declared | declared | declared | declared |
| the seven other stoa-web-* boxes | composed | composed | composed | composed | composed | composed | composed |

| rule | off-repo | declared | composed | reached | tested | rungs used |
| --- | --- | --- | --- | --- | --- | --- |
| A | 0 | 1 | 7 | 10 | 4 | 4 of 5 |
| B | 0 | 1 | 15 | 6 | 0 | 3 of 5 |
| C | 0 | 1 | 21 | 0 | 0 | 2 of 5 |
| D | 0 | 1 | 18 | 1 | 2 | 4 of 5 |
| E | 0 | 1 | 15 | 6 | 0 | 3 of 5 |
| F | 0 | 1 | 15 | 6 | 0 | 3 of 5 |
| G | 0 | 1 | 12 | 7 | 2 | 4 of 5 |

**T, 63 path parts:** A 0/33/11/15/4, B 0/33/21/9/0, C 0/33/30/0/0, D 0/32/27/2/2, E 0/33/21/9/0,
F 0/33/21/9/0, G 0/32/18/11/2.

Per-file share under G: packages-agent-sandbox 8 reached / 5 tested of 18; packages-testing-core 10 / 4
of 15; testing 28 / 0 of 30; stoa-cli 2 / 0 of 417; stoa-web-app 0 / 56 of 427; stoa-web-lib 0 / 74 of
419; stoa-web-components 0 / 24 of 424.

### 2.4 What the numbers say, and the pick

1. **The seed rule does not move the nine hand-named parts on this repository.** A, B, C, E, F and G
   all read `tested 8, composed 1`. §7.2's refutation is structural and it stands: from
   `src/main/index.ts` the walk reaches 583 of 1,068 main files and every main-side part a person
   would name. Nothing in this phase pretends otherwise; the per-file share on the hover is the number
   that varies, and it is drawn.
2. **A's extra rungs are an artefact and G removes it.** Under A a manifest FILE is a seed, and a seed
   inside a box's anchors makes the box `reached` before any walk (`queue.some(s => hereSet.has(s))`).
   On tortie that is `other` (holds `package.json`); on stoa it is `stoa-web-loose` reading `tested`
   because `stoa-web/package.json` is its own seed. A manifest has no imports, so it can start a walk
   nowhere; it must never be a seed.
3. **C is refused**: stoa has zero composition roots the closed table recognises, so C reads
   `composed` for everything that starts.
4. **D alone is refused, but D is the half that reaches stoa's packages**: `packages-agent-sandbox`
   and `packages-testing-core` read `tested` only under D and G, because their `package.json` declares
   `./src/index.ts` and that file is tracked. On tortie D reaches 3 files, all fixtures, because the
   declared entry is `./out/main/index.js`, a built artefact — which is the stated limit in §7.
5. **F is refused**: it excludes `build/` by NAME, which is this repository's convention and no rule,
   and it turned `build` from `tested` to `composed` for that reason alone.
6. **E and G are the only rules that MEAN what the region says.** A part in unit U is reached only by
   what U starts or declares; a part outside every unit has no seeds and reads `declared` or
   `composed` with the hover saying nothing recognised starts it. G = E ∪ D is the pick: on stoa it is
   the only rule using 4 of 5 rungs with no manifest-file artefact (`0/1/12/7/2`), and on a one-unit
   repository it degrades to B ∪ D, which is §7.2's own walk minus the artefact.

**Stated limit written into the code and the hover:** `src-renderer` reads `composed` with 0 of 968
parsed files reached and 336 imported by a test, because Phase 257's closed table recognises no
renderer root (`src/renderer/main.tsx` misses `entrypoint.path.by-name`, which wants `src/main.tsx`,
and `createRoot` is not a composition root). The rung is honest about the reader, and the sentence
behind the chip says so. Adding a renderer root is a Phase 257 rule-table change with a corpus
re-measure and is refused here (§7).

---------------------------------------------------------------------------------------------------

## 3. The partition — rule Q beside rule P, and F1 closed (`src/main/arch/skeleton.ts`, A)

### 3.1 Rule Q, the units

Every step is a fact test. Nothing reads `boundary.path.module-root`; the store exposes no reader for
the union and `map.ts` calls `factsOf` with the categories it needs, never `moduleRoots`.

- **Q1 units.** A UNIT is one thing the repository builds or starts, with a DIRECTORY (its extent):
  - every npm workspace member and every Cargo member crate (`readArchManifests`, rule P's own P1
    seeds) → kind `package` / `crate`;
  - every `boundary` fact of kind `library` → the manifest's directory; for `boundary.swiftpm.target`
    the directory `Sources/<name>` when tracked, else the manifest's → kind `library`;
  - every `entrypoint` fact of kind `package-main`, `bin`, `container` or `process` → the declaring
    file's directory → kind `package`, `command`, `container`, `process`;
  - every `entrypoint` fact of kind `main` (a source `fn main`, `func main`, `__main__`, `@main`) → the
    nearest ancestor directory holding a manifest OF THE FILE'S OWN FAMILY (`.ts/.tsx/.js/.mjs/.cjs` →
    `package.json`; `.rs` → `Cargo.toml`; `.go` → `go.mod`; `.py` → `pyproject.toml`, `setup.py`,
    `setup.cfg`; `.swift` → `Package.swift`; `.rb` → `Gemfile`), else the file's own directory → kind
    `program`. (The draft in §2 walked to ANY manifest and made stoa's root a unit through a pen-test
    python script under `docs/`; the family rule is the correction and is one of the gate's planted
    trees.)
  - Not units: `boundary` kinds `worker`, `thread`, `process`, `service` and `workspace` (the root
    that declares members is not a unit; its members are). These are STARTS (Q5).
  Units are deduped on directory; the root `''` is allowed. A unit's LABEL is the manifest's declared
  name where a fact carries one (`crate X`, `go module X`'s last segment, the `package.json` name read
  by `readArchManifests` for the root and workspace members), else the last path segment, else rule
  R's subject at the root. Its SUB is the kind phrase: `npm package`, `cargo crate`, `cargo library`,
  `swift library`, `go program`, `python program`, `rust program`, `swift app`, `container`,
  `procfile process`, `command`.
- **Q2 ownership.** Unit directories sorted deepest first. A rule P box belongs to the deepest unit
  whose directory is a prefix of the box's `dir` (root `''` matches everything). The fold box `other`
  belongs where `''` belongs. A box under no unit goes to **Elsewhere** (Q3).
- **Q3 Elsewhere.** One region, id `elsewhere`, label `Elsewhere`, sub `no manifest names these`,
  drawn only when it holds a box. It never holds a start.
- **Q4 one thing.** When every box belongs to ONE unit and there is no Elsewhere, that region's sub
  becomes `the one thing this repository builds` and the region row is the whole map width. On tortie
  this is the picture: one region, `tortie`, eight boxes, two worker starts. Nothing invents four.
- **Q5 starts.** Every `boundary` fact of kind `worker`, `thread`, `process` or `service` is a START
  in the region that owns its file (by Q2's prefix rule over the file's directory), drawn as ONE line
  per region: `starts 2 workers` / `starts 3 compose services, 1 thread` (counts by kind, kinds in the
  order worker, thread, process, service), with the file:line list behind hover and in the inspector.
  A unit that owns no box (tortie's seven fixture manifests under `build/fixtures/facts/**`,
  stoa's `stoa-cli/automerge-ffi`) is ALSO a start of the region owning its directory, in the same
  line: `starts 1 cargo library`. This is honest on both repositories and the fixtures are exactly
  the noise a reader should see.
- **Q6 outside.** One dashed band, id `outside`, label `Outside this repository`, sub `programs and
  hosts it reaches`, drawn only when the repository carries any `effect.spawn`, `network.*` or
  `surface.port` fact. It holds no box and no start.
- **Q7 order.** Regions are drawn in the order: units with boxes sorted by total parsed files
  descending, then Elsewhere, then Outside. Ids are `unit:<dir or root>`, `elsewhere`, `outside`.

`ArchUnit { id; dir; label; sub; kind }`, `ArchRegionCut { regions: ArchRegionDraft[]; starts;
unitOf(path) }` are exported from `skeleton.ts` beside `ReadingPartition`; `map.ts` turns them into
the wire `ArchMapRegion` rows (§4.1).

### 3.2 Transports (`map.ts`, A)

A transport carries WHAT CROSSES and a count; the label is `<what> · <n>` with an arrow. Three kinds,
all re-derivable from rows the map already holds:

| kind | from → to | count | label |
| --- | --- | --- | --- |
| `imports` | region A → region B, A ≠ B, both holding boxes | resolved first-party imports written in A's files that land in B's files, aggregated from the SAME edge list rule P's rollup uses | `imports · 412 →` |
| `spawns` | region → outside | `effect` facts of kind `spawn` in the region's files | `spawns · 30 →` |
| `reaches` | region → outside | `network` facts of kind `client` | `reaches · 97 →` |
| `listens` | outside → region | `network.listen` plus `surface.port` | `← listens · 3` |

No transport is invented for HTTP between two regions: an import graph cannot see it (research 118
F6) and the outside band's `reaches` count is where the honest number goes. A pair with a count of 0
draws nothing. Every transport is sorted (from, to, kind) so the bytes are stable.

### 3.3 F1 closed — one partition for the contract and the map

`draftSkeleton(input: ReadingInput)` composes its components from `readingPartition(input).boxes`
instead of `groupTree` + `mergeToTarget`: one component per box, `id = box.id`, `name = box.dir` (the
fold: `name = READING_FOLD_LABEL`, `anchors = cut.folded` — the folded directories; root files stay
unanchored and the draft's contract note says so in one clause), `layer = bandOf(...)` unchanged,
`provenance = classify(box)`. Edges are `aggregateGroupEdges(cut.boxes, imports, groupOwnerWithDirs(
cut.boxes))` sliced to `ARCH_PROMISE_GUIDANCE.max` exactly as today. The two call sites in
`src/main/arch/enrich-coordinator.ts` hand the draft `parseable` and `crates` the way
`archMapReadFacts` hands the map. `SKELETON_TARGET` keeps its name and its doc comment says the draft
now takes rule P's count (five to thirteen); `groupTree`, `rankGroups` and `mergeToTarget` stay for
`partModules`.

The consequence the gate pins (§5.2, `conformance:reading` rule 12): over every reading fixture, each
drafted component's anchors hold a strict majority of their files in EXACTLY the box that shares its
id, so `overlayComponents` paints N of N non-fold boxes with the draft saved, where at the parent it
paints 0 of 8 on the gmux fixture (research 118 F1's measurement). `conformance:arch` re-pins the
drafted bytes over its own fixture in the same commit and the commit body names F1 as the reason;
`ARCH_ROW_KEYS` and rule 12's key-set digest do not move.

### 3.4 What a repository that builds one thing draws

Exactly one region, labelled with rule R's subject (`tortie`), sub `the one thing this repository
builds`, every box inside it, its starts on one line (`starts 2 workers`), and the Outside band with
`spawns · N →` and `reaches · N →` when those facts exist. No Elsewhere, no second column, no invented
"window" or "engine" — those are the model's words (research 118 §3.1) and Phase 259's.

---------------------------------------------------------------------------------------------------

## 4. The surface — `src/renderer/arch/**` (B), matching the mock

### 4.1 What travels — the wire (A writes, B codes against)

`src/shared/ipc/arch-map.ts` gains:

```ts
export interface ArchMapRegion {
  id: string;                         // 'unit:<dir>' | 'unit:' (root) | 'elsewhere' | 'outside'
  kind: 'unit' | 'elsewhere' | 'outside';
  label: string;                      // ≤ 4 words
  sub: string;                        // ≤ 6 words
  dir: string | null;                 // the unit's extent; null for elsewhere/outside
  groupIds: string[];                 // rule P box ids it holds, in weight order
  starts: ArchMapStart[];             // Q5, sorted (kind, file, line)
  files: number; parsed: number;      // the denominators the surfaces list prints
}
export interface ArchMapStart { kind: 'worker' | 'thread' | 'process' | 'service' | 'unit'; label: string; file: string; line: number }
export interface ArchMapTransport { from: string; to: string; kind: 'imports' | 'spawns' | 'reaches' | 'listens'; count: number }
/** Counts per fact kind for one box, every kind of the four categories present, zero included. */
export interface ArchMapKindCounts { surface: Record<string, number>; store: Record<string, number>; effect: Record<string, number>; network: Record<string, number>; gate: Record<string, number> }
```

`ArchMapGroup` gains `rung: ArchRungReading`, `regionId: string`, `counts: ArchMapKindCounts`.
`ArchMapModel` gains `regions: ArchMapRegion[]`, `transports: ArchMapTransport[]`,
`componentRungs: Record<string, ArchRungReading>` (one per contract component, keyed by component id,
empty with no contract), `oneThing: boolean` (Q4). `ArchMapPartModel.modules[]` carry `rung`,
`regionId` and `counts` too (the same box shape, the drilled walk seeded from the part's unit).

`src/shared/ipc/arch.ts` gains ONE channel, `arch:facts`, for the rows behind a disclosure:

```ts
export interface ArchFactsInput extends ArchRepoInput { machineId?: string | null;
  /** A rule P box id, a region id, or null for the whole repository. */
  scope: string | null;
  categories: readonly ArchFactCategory[];   // never 'test'
}
export interface ArchFactsResult { cwd: string; scope: string | null; rows: ArchFact[]; truncated: boolean;
  /** Files and parsed files in scope, the denominators. */
  files: number; parsed: number }
```

Rows are capped at 2,000 with `truncated: true`, sorted (file, line, rule, subject), and the handler
in `check-coordinator.ts` (`checks.facts`) is a read over `db.factsOf` filtered by the scope's file
set from the SAME rule P partition the map composed; it parses nothing, judges nothing, writes nothing.
`docs/audits/contract-baseline.txt` gains the line `arch:facts` (A regenerates it with
`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`; the commit body names
the one line). `ArchMenuActionId` widens by `'show-arch-surfaces' | 'show-arch-gates'`.

### 4.2 The map view (inner tab "Map")

- **Region columns.** `ArchMap.tsx` lays rule P's boxes inside region frames: one frame per region in
  Q7 order, left to right, each a rounded rect on `--bg-sidebar` with a 1px `--border` (the mock's
  `.region`), its label uppercase `--text-xs` and its sub in `--text-muted` under it, then its boxes
  in the existing three bands INSIDE the frame (bands are per region now, so a one-region map draws
  exactly the picture Phase 201 draws with one frame around it). `outside` is a dashed frame
  (`--border-strong`) with no boxes and one line: `Nothing here is this repository's code.`
  Elsewhere is a solid frame. A region's starts line sits under its sub. `layout.ts` gains
  `layoutRegions(model, viewport)`; geometry, camera and the drill stage are unchanged.
- **Transports.** Between adjacent frames, one `.arch-map-wire` per transport kind: the label text
  and an arrow, `--border-strong` underline, `--text-muted` for the back direction, exactly the mock's
  `.bridge/.wire`. Region-to-outside wires attach to the outside band.
- **The node chip.** In each box's label `foreignObject`, after the provenance glyph: the rung glyph
  (`Codicon`, 12px) in its token colour, `title` = the rung sentence plus the counts line, `data-rung`
  = the word. No number on the node. `aria-label` on the box gains `, <rung word>`.
- **Selection.** A single click, or Enter/Space on a focused box, SELECTS it (`aria-pressed`,
  `.arch-map-box.selected` with the 2px `--accent` inset the tabs use); the store records
  `inspect[repoKey] = { groupId }`. A double click, Enter on the already selected box, or the
  inspector's Open control DRILLS (`drillInto`, unchanged). Escape clears the selection. The sidebar's
  Components rows keep drilling on click and ALSO set the selection, so the inspector follows.
- **The inspector**, `ArchInspector.tsx`, BELOW the map at full width (research 118 §3.2 item 6),
  `--bg-raised`, hairline top. With nothing selected it is one line: `Select a part.` With a box
  selected it draws ONE header row and SIX field rows, labels in `--text-muted`, values plain:

  | row | value (computed) |
  | --- | --- |
  | header | box label · region label · rung glyph + **word** · `1,068 files, 1,068 parsed` · **Open** (drills) |
  | Runs in | the region's label and sub (`tortie · the one thing this repository builds`) |
  | Exposes | surface kinds with non-zero counts, as `229 IPC channels, 6 CI jobs`; `nothing this reader sees` at zero |
  | Keeps | store kinds: `12 store writes, 3 migrations`; `nothing` at zero |
  | Reaches | `30 spawns, 5 network reaches, 2 listens`; `nothing` at zero |
  | Guards | `12 gates` — a link that opens the Gates tab with this part named |
  | Tests | `395 of 1,068 parsed files imported by a test` |
  | Rung | the sentence, then `reached 583 of 1,068 · 3 seeds` |

  Each of Exposes / Keeps / Reaches / Guards has a `Show` disclosure that asks `arch:facts` for the
  scope and category and lists `subject · file:line` rows (click opens the file at the line through
  the open-file bus, the Phase 63 failure-row path). Nothing is fetched until the disclosure opens.
  "Receives", "Returns" and "Where it stops" are NOT drawn: they are model fields (research 118 §3.1)
  and Phase 259's.
- **Level 2 and 3.** The drilled picture keeps its frame stubs; modules carry the chip; the inspector
  follows the selected module. Level 3 is unchanged.

### 4.3 The surfaces view (inner tab "Surfaces"), `ArchSurfaces.tsx`

Grouped by region, then by box, in map order. Each region opens with its denominator line: `read
2,639 of 3,330 files · 102 vendored · 0 truncated` (from `ArchMapRegion.files/parsed` and the
repository's `ArchFactCounts` proportioned by region — the region's own `parsed` and `vendored`
counted in main from `arch_fact_file` rows by file prefix; A adds `db.linkCountsUnder(repoKey,
dirs)`). Each box is one row: its label, then the SIX surface kinds in a fixed order with a count
each — `IPC channels 229 · HTTP routes 0 · commands 0 · flags 0 · jobs 6 · ports 0` — zeros drawn
in `--text-muted` and NEVER omitted. Clicking a kind with a count opens its rows (`arch:facts`,
category `surface`, filtered by kind) under the box; a zero is not clickable and its hover says
`0 <kind> found in this part`. Word budget: at rest ≤ 220 words above the fold at 1440×900 on this
repository (8 boxes × 12 label words + 3 header lines).

### 4.4 The gates worksheet (inner tab "Gates"), `ArchGates.tsx` — runstory's shape

One `<select>` (native, the house's form control) listing `Whole repository`, then each region, then
each box in map order; FOUR checkboxes `auth · flag · refusal · guard`, all on by default. The answer
below them, recomputed on every change from one `arch:facts` read (category `gate`, scope = the
selection):

```
14 gates in src/main over 1,068 parsed files · of 820 in the repository
auth 0 · flag 3 · refusal 9 · guard 2
```

then the rows, `file:line · subject · evidence`, sorted by file, each opening the file. Zero draws
`0 gates in <part>` with the four counts at 0. Nothing here needs a model; this is the one device
runstory has that the mock lost (research 118 §9, last paragraph). The model half of this view
(Phase 259) is NOT drawn in this phase — no placeholder sentence, no Journey tab; the tab row has
three tabs.

### 4.5 Word budgets, in numbers (the just-enough-words rule, enforced by the probe)

Counted the mock's way: `innerText` of the tab body, split on whitespace, above the fold at 1440×900,
on the tortie clone with nothing selected and nothing disclosed.

| view | resting-face budget | what the words are |
| --- | --- | --- |
| Map | ≤ 300 (mock 281, runstory 253) | subject + rule R line (≈ 24), region labels + subs (≤ 10 each), starts lines (≤ 6 each), box labels + rule S sentences (as today), transport labels (≤ 4 each), inspector's `Select a part.` |
| Surfaces | ≤ 220 | one denominator line per region, one row per box of six labels and six numbers |
| Gates | ≤ 120 before a part is named | the select's visible value, four checkbox labels, the two answer lines |
| Sidebar pane | unchanged (+0) | the chip adds a glyph and no word |

Every explanation lives behind hover or a disclosure: the rung sentence, the counts line, the starts
list, the region's file list, the fact rows.

### 4.6 The sidebar pane

`Reading`'s Components rows (`ArchDrill.tsx`) gain the rung chip after the band glyph, from the same
`rung` field; the row's `title` (the ten hover facts) gains the rung sentence as an eleventh line at
the END, so `conformance:reading`'s pinned ten stay first and byte identical. The contract Outline
rows (`ArchVerdicts.tsx`) draw the chip from `componentRungs[component.id]` when present. Nothing
else in the pane moves.

### 4.7 Colours and the floor

Two existing tokens (D6). `src/renderer/theme/presets.ts` gains
`export const RUNG_PINS: readonly ChromaticPin[] = [{ token: '--success', ground: '--bg-active', floor: 3 }]`
and `chromaticPinsFor` appends it on BOTH bases. `conformance:hue` rule 32's structural half now
names `--success` and its arithmetic half measures it at every offered frame and contrast level on
both bases; if any light cell reads under 3, the fallback is written here rather than found later:
`reached` and `tested` draw in `--status-idle` too and the glyph alone separates. No new CSS literal
anywhere (`conformance:hue` rule 26). The selected-box inset is `--accent`, already pinned.

### 4.8 The native menus (B, same commit)

View menu, under `Architecture Map` and behind the same `archRowsOn()` gate: `Architecture Surfaces`
(`show-arch-surfaces`) and `Architecture Gates` (`show-arch-gates`), no accelerator, glyph
`circuit-board` (a name may sit on several rows; `assert-menu-glyphs` forbids two names on one
bitmap, not one name on two rows). `menu-actions.ts` routes both through `openArchMapForActiveProject`
with an inner-tab argument (`open-map.ts`: `openArchMap(repoKey, tab: 'map' | 'surfaces' | 'gates')`;
the `archMap` request gains `tab`, the editor keeps ONE map tab per repository and the second ask
focuses it and switches the inner tab). `p175-arch-menu-flag.test.ts` counts four gated rows instead
of two; `view-menu.test.ts` asserts the two labels and the rail order (the five sidebar views stay
contiguous, the three map rows follow, Catch Me Up last). The phase brief says: "View gained
Architecture Surfaces and Architecture Gates under Architecture Map, both present only while
Architecture is on."

---------------------------------------------------------------------------------------------------

## 5. The proof, run rather than read

### 5.1 `npm run conformance:evidence` — `build/conformance-evidence.mjs` + `build/evidence-conformance-probe.mts` (C)

Shape: `conformance:reading`'s. One pinned `tsx` per probe run over the SHIPPING modules under
`src/main/arch` (`evidence.ts`, `skeleton.ts`, `map.ts`, `reading.ts`, `sentence.ts`) and
`src/shared`, over committed fixtures under `build/fixtures/evidence/`, then the same probe over one
ablated copy of those modules per clause under a temp directory removed in a `finally`. Spawns one
plain node for the scans. No git, no Electron, no tmux, no agent, no request, nothing under the
person's home. `pure` in `build/verification-checks.mjs`. Every scanner is proved on planted fixtures
of its own, some of which must fail.

The fixtures are fact files plus tracked lists plus import edge lists (the compose's own inputs, so no
parse runs): `rungs/` (the seven planted graphs of `ladder.mts --self-test`, one per rung and the two
`composed` shapes), `one-unit/` (a root `package.json` with `main` pointing at a tracked
`src/index.ts`, two workers, spawns), `two-unit/` (npm workspaces `a/` and `b/`, `a/src/main.ts` a
composition root importing `b/src/x.ts`; `b` declares `main: ./src/index.ts`), `elsewhere/` (a `docs/`
box under no unit), `module-root-plant/` (`two-unit` plus 75 planted `boundary.path.module-root`
facts), `manifest-seed/` (a box holding only `package.json` and a CI workflow), `family/` (a python
`__main__` under `docs/` with a root `package.json` and no `pyproject.toml`).

| rule | what it pins | ablation (must go red) |
| --- | --- | --- |
| 1a | `ARCH_EVIDENCE_RUNGS` is exactly the five words in order; `ArchRungReading` keys pinned | a sixth word appended |
| 1b | the seven planted graphs fire the rung named, 7 of 7, and every one of the five fires at least once | `tested` asked before `reached` |
| 1c | `accepted-live` / `accepted_live` appear in no source under `src/main/arch`, `src/shared`, `src/renderer/arch`, `src/preload` with comments and strings blanked; scanner proved on 4 plants, 2 must fail | a planted literal in `evidence.ts` |
| 2a | G seeds: over `two-unit/`, `b/src/x.ts` reads `composed` (reached only across a unit) and `b/src/index.ts` reads `reached` (declared by b's manifest) | seeds unrestricted by unit → `x.ts` reached; D dropped → `index.ts` composed |
| 2b | a manifest file is never a seed: `manifest-seed/`'s box reads `composed`, never `reached` | manifest files added to seeds |
| 2c | a CI job, an npm script, a compose service and a worker start are never seeds (planted, each) | each kind admitted, one at a time |
| 2d | the walk stops at the first anchor and `seeds` counts only tracked files | untracked seed kept |
| 3a | rule Q over `one-unit/`: exactly one region, `oneThing: true`, sub `the one thing this repository builds`, starts line `starts 2 workers` | Q4 removed |
| 3b | over `two-unit/`: two unit regions, ownership by deepest prefix, `elsewhere` absent; over `elsewhere/`: the `docs` box in `elsewhere`, and it holds no start | Q2's deepest-first sort reversed |
| 3c | `module-root-plant/` composes BYTE IDENTICAL regions, transports and rungs to `two-unit/` | `module-root` admitted to Q1 |
| 3d | `family/`: the python main makes a unit at its own directory, never at the root `package.json` | the family rule dropped |
| 3e | Outside band present iff spawn/network/port facts exist; a unit owning no box is a start of its owner | Q6 always drawn |
| 4 | contract independence: `composeArchMap` with the fixture document and with `document: null` give the same `rung` per group id and the same regions; a component `description` planted with the word `tested` moves nothing | `evidence.ts` made to read `component.description` |
| 5 | transports re-derived: the probe aggregates the fixture's edge list by region itself and compares (imports); spawns/reaches/listens equal the fact counts by category+kind per region; a zero pair draws nothing | `imports` counted from unresolved edges too |
| 6 | surface counts per box equal a re-derivation from the fact file, and all six kinds are present at zero | zeros dropped |
| 7 | the worksheet's answer for a named scope equals the gate rows under that scope's files, denominators included, through the same `factsOf` filter the handler uses | scope filter widened to prefix-of-any |
| 8 | determinism: reversed facts and reversed imports compose the same bytes for regions, transports, rungs and counts | a `Map` iterated unsorted |
| 9 | purity: `evidence.ts` names no `node:`, `electron`, `child_process`, `fs`, `require(`; scanner proved on 5 plants | a planted `node:fs` import |
| 10 | the floor, structural half: `chromaticPinsFor('dark')` and `('light')` both carry `--success` on `--bg-active` at 3, read by running `presets.ts`; `rung.ts`'s table names only `--status-idle` and `--success` | the pin removed |
| 11 | registration: `package.json` names the gate and the probe, `verification-checks.mjs` classifies both, `HELPER_USER_FLOOR` raised by the probe's own count | — |

Ablations: 16, one clause each; every one must turn at least one pin red and the gate names the
clause. The `rungs/` fixture is what tells a rung that CANNOT fire from one that never did over the
corpus, where `off-repo` is 0 everywhere (research 118 §10's late lesson).

### 5.2 `conformance:reading` extended (C), rule P's ablations kept

Rules 11–13 added, the twelve existing ablations untouched:

| rule | what it pins | ablation |
| --- | --- | --- |
| 11 | rule Q over the five reading trees: the region set (id, label, sub, groupIds) pinned in `expected.json`; `gmux` reads one region; `cargo` reads one region per member crate; `clients` reads Elsewhere for the tree with no manifest | Q2's prefix test |
| 12 | F1: `draftSkeleton` over each tree writes one component per rule P box with `id = box.id`, and `overlayComponents` over that draft paints N of N non-fold boxes (0 of 8 on `gmux` at the parent) | the draft put back to `groupTree` |
| 13 | the eleventh hover line is the rung sentence and the first ten are byte identical to the parent's pins | the sentence inserted first |

`conformance:arch` (C) re-pins the drafted bytes over its own fixture; rule 12's key-set digest and
rule 4's argv scan run unchanged and must stay green.

### 5.3 `npm run probe:p258` — `build/p258/probe-p258-surface.mjs` (C writes; the verifier runs)

Script line: `"probe:p258": "npm run build && node build/harness-socket.mjs --fresh gmux-p258 'node build/p258/probe-p258-surface.mjs'"`.
The probe refuses unless `GMUX_TMUX_SOCKET` begins `gmux-p258`; run outside the harness it makes
`gmux-p258-<pid>` itself and unlinks the socket file in its `finally`. `build/p258/corpus.sh` makes
`git clone --no-hardlinks --local` copies of the checkout it is run from (never the one it runs in:
it refuses a target equal to `REPO`) and of `/Users/gdc/stoa` under `GMUX_HARNESS_DIR/p258/repos`,
refuses `/Users/gdc/runstory` and `/Users/gdc/specfactory` by name, and removes the clones in the
probe's `finally`. `HOME` is inside the scratch directory. **The profile is seeded by
`seedArchSwitchOn(profile, { wrapperPass: true })`, whose `agentId: null` IS the no-agent
configuration**, so every arm below is the agnosticism floor made visible and no arm is a separate
launch. ONE Electron at HEAD; with `P258_PARENT_CHECKOUT` naming a BUILT worktree at the parent, a
SECOND Electron from that checkout on a profile of its own, one after the other and never at once.
`--self-test` proves every grader on planted DOM readings and launches nothing. The operator's
`-L gmux` sessions are counted before and after and must be unchanged. Every Electron ends in
`withElectron`'s `finally`.

Arms, one session, both clones opened as projects, everything read off the DOM through CDP:

- **A regions.** Map tab on tortie: exactly one region frame, label `tortie`, sub `the one thing this
  repository builds`, eight boxes inside, one starts line reading `starts 2 workers`, an Outside band
  with `spawns` and `reaches` wires whose counts equal the fact counts read from the profile's
  `arch.db` (opened READ ONLY after quit, as `probe:p257` does). On stoa: regions ≥ 6, `stoa-web`
  holding every `stoa-web-*` box, `packages/agent-sandbox` and `packages/testing-core` each one box,
  Elsewhere present and holding `docs`, `scripts`, `stoa-helpers-darwin`, `stoa-desktop-mac`.
- **B rungs.** Every box's `data-rung` compared with the gate's own computation: the probe runs
  `build/evidence-conformance-probe.mts` in process over the same clone's fact file and edge list and
  compares per group id, 8 of 8 on tortie, 22 of 22 on stoa; `src-renderer` reads `composed` with its
  hover carrying `0 of 968` and the seeds sentence.
- **C inspector.** Click `src-main`: `aria-pressed` on the box, level still 1, the inspector's seven
  rows read against `arch.db` counts (surface, store, effect, network, gate by kind under the box's
  files); open the `Exposes` disclosure and read 229 rows; press Open and read the drill at level 2
  with the breadcrumb; Escape and read the selection cleared.
- **D surfaces.** Surfaces tab: every box's six kinds present, the zeros present in the muted class,
  the counts equal to `arch.db` by kind under each box's files; the denominator line per region equals
  `arch_fact_file` counts under the region's dirs.
- **E worksheet.** Gates tab: name `src/main` in the select, read the two answer lines and the row
  count against `arch.db` (category `gate` under `src/main/`); untick `refusal` and read the count
  drop by exactly the refusal count; select `Whole repository` and read 820 (or what the pass read).
- **F words.** `innerText` word counts above the fold at 1440×900 for Map, Surfaces and Gates on
  tortie against §4.5's caps.
- **G menus.** `show-arch-surfaces` and `show-arch-gates` through the shot drive's menu-action
  path land on the named inner tab of the ONE map tab (tab count 1 before and after).
- **H no colour literal.** Every `.arch-map-rung` element's computed colour equals the computed
  value of `--status-idle` or `--success` on the live root.
- **P parent.** With `P258_PARENT_CHECKOUT`: 0 region frames, 0 chips, no inspector, no inner tab
  row, and the draft overlay painting 0 of 8 boxes on the gmux-shaped clone with the drafted contract
  saved (F1 at the parent) against 8 of 8 at HEAD. Findings counted per arm; expected ≥ 4 at the
  parent and 0 at HEAD.

### 5.4 The verifier's independent methods (per CLAUDE.md's governing rule, named here so they are reviewable)

- **Re-derive independently** (Tier 3, the ladder): a second rung implementation in the verifier's
  own hand — a different graph walk (DFS, or Kosaraju over the condensation) over `arch_import` read
  straight from the profile's `arch.db` — compared box for box against the DOM on both clones.
- **Attack the seed** (Tier 3): plant a repository shape the fixtures did not try — a workspace
  member whose `main` points OUTSIDE its own directory, a unit nested three deep, a `Procfile` and a
  `Dockerfile` in the same directory, a `package.json` with `bin` as an object of five — and read
  whether any box reads `reached` from a seed it does not own.
- **Measure the parent commit** (Tier 2, F1 and the surface): the P arm above.

---------------------------------------------------------------------------------------------------

## 6. Ownership — three builders, no overlap, every interface pinned by name

### Builder A — the ladder, the partition, the compose, the wire types, the store readers
Owns, exclusively:
- `src/main/arch/evidence.ts` (new), `src/main/arch/__tests__/evidence.test.ts` (new: the seven
  planted graphs, G's two-unit case, the manifest-never-a-seed case, contract independence).
- `src/main/arch/skeleton.ts` (rule Q beside rule P; `draftSkeleton` over `readingPartition`;
  `SKELETON_TARGET` comment), `src/main/arch/__tests__/skeleton.test.ts`,
  `reading-partition.test.ts` (cases added).
- `src/main/arch/map.ts` (regions, transports, rungs, `counts`, `componentRungs`, `oneThing`; the
  part compose seeded from the part's unit), `src/main/arch/__tests__/map.test.ts`.
- `src/main/arch/db.ts` — three readers only: `factsOf(repoKey, categories: readonly
  ArchFactCategory[]): ArchFact[]`, `factFiles(repoKey, category): string[]`,
  `linkCountsUnder(repoKey, dirs: readonly string[]): { files: number; parsed: number; vendored:
  number; truncated: number }`; `src/main/arch/__tests__/arch-store.test.ts` (cases added).
- `src/main/arch/check-coordinator.ts` (the compose input gains `facts` = `factsOf(repoKey, ['entrypoint','boundary','surface','store','effect','network','gate'])` and `testFiles` = `factFiles(repoKey,'test')`; the new `facts(input)` handler), `src/main/arch/ipc.ts` (registers `arch:facts`), `src/main/arch/enrich-coordinator.ts` (the two `draftSkeleton` call sites hand `parseable` and `crates`).
- `src/shared/arch.ts` (§1.1 additions only), `src/shared/ipc/arch-map.ts` (§4.1 additions only),
  `src/shared/ipc/arch.ts` (`arch:facts`, `ArchFactsInput/Result`, `ArchMenuActionId` widened),
  `docs/audits/contract-baseline.txt` (regenerated, one line).
Proof A runs: `npm test -- src/main/arch`, `npm run typecheck`, `npm run conformance:arch`,
`npm run conformance:reading` (rules 1–10 stay green; 11–13 are C's), `npm run conformance:facts`.

### Builder B — the surface and the menus
Owns, exclusively:
- `src/renderer/arch/**` except nothing of A: `ArchMapTab.tsx` (inner tab row, selection, inspector
  mount, `tab` from the request), `map/ArchMap.tsx`, `map/layout.ts`, `map/geometry.ts`,
  `map/types.ts`, `map/map.css`, `map-model.ts`, new `ArchInspector.tsx`, `ArchSurfaces.tsx`,
  `ArchGates.tsx`, `rung.ts`, `arch-evidence.css`, `state/view-state.ts` (`inspect`, `mapTab`),
  `state/map-actions.ts` (`select`, `clearSelect`, `setMapTab`, `loadFacts`), `bridge.ts`
  (`facts`), `copy.ts`, `ArchDrill.tsx`, `ArchVerdicts.tsx` (Outline chip), `open-map.ts`,
  `shot-probe.ts` (the drive hooks the probe reads), every test under `src/renderer/arch/__tests__`
  and `map/__tests__` (p161 updated for the gesture; new `p258-*.test.tsx`).
- `src/renderer/app/menu-actions.ts` (two cases), `src/main/menu.ts` (two rows),
  `src/main/__tests__/p175-arch-menu-flag.test.ts`, `src/main/__tests__/view-menu.test.ts`.
- `src/renderer/theme/presets.ts` (`RUNG_PINS`, `chromaticPinsFor`), `src/renderer/theme/__tests__/*`
  cases for it. NOT `tokens.css`.
- `src/renderer/editor/**` only where the `archMap` request's `tab` field is read (one line in the
  tab identity / open path; B names the file in the brief).
Proof B runs: `npm test -- src/renderer/arch src/main/__tests__/p175 src/main/__tests__/view-menu
src/renderer/theme`, `npm run typecheck`, `npm run conformance:hue` (thirteen minutes; run once),
`npm run gate:menu-glyphs`, `npm run gate:menu-accelerators`.

### Builder C — the gates, the fixtures, the probe, the scripts
Owns, exclusively:
- `build/conformance-evidence.mjs`, `build/evidence-conformance-probe.mts`,
  `build/fixtures/evidence/**`, `build/conformance-reading.mjs` (rules 11–13),
  `build/fixtures/reading/expected.json` (regions and the eleventh line), `build/conformance-arch.mjs`
  and its fixture's pinned draft bytes.
- `build/p258/probe-p258-surface.mjs`, `build/p258/corpus.sh`, `build/p258/seed-measure.mts` (kept
  as this spec's instrument, with §2's numbers pinned in its header), `build/p258/SPEC.md` (this).
- `package.json` (`conformance:evidence`, `probe:p258` lines only), `build/verification-checks.mjs`
  (`pure('conformance:evidence')`, `electron('probe:p258')`), `build/assert-electron-teardown.mjs`
  (`HELPER_USER_FLOOR` 126 → 127).
Proof C runs: `npm run conformance:evidence` and `npm run conformance:reading` against the
integrated tree (before that, `--self-test` on the probe, which launches nothing), `npm run
gate:checks`, `npm run gate:electron`, `npm run gate:background`.

### The interfaces, written down so a name cannot drift

| between | name | declared in | shape |
| --- | --- | --- | --- |
| A → B | `ARCH_EVIDENCE_RUNGS`, `ArchEvidenceRung`, `ArchRungReading` | `src/shared/arch.ts` | §1.1 verbatim |
| A → B | `ArchMapRegion`, `ArchMapStart`, `ArchMapTransport`, `ArchMapKindCounts`; `ArchMapGroup.rung/regionId/counts`; `ArchMapModel.regions/transports/componentRungs/oneThing`; `ArchMapPartModel.modules[].rung/regionId/counts` | `src/shared/ipc/arch-map.ts` | §4.1 verbatim |
| A → B | `'arch:facts'`, `ArchFactsInput`, `ArchFactsResult` | `src/shared/ipc/arch.ts` | §4.1 verbatim; B's `bridge.ts` exposes `facts(input)` |
| A → B | `ArchMenuActionId` += `'show-arch-surfaces' \| 'show-arch-gates'` | `src/shared/ipc/arch.ts` | B's `menu.ts` rows and `menu-actions.ts` cases use exactly these ids |
| B → B | `openArchMap(repoKey, tab?: 'map' \| 'surfaces' \| 'gates')`; `OpenFileRequest.archMap.tab?` | `open-map.ts`, the editor's request type | default `'map'` |
| A → A | `ArchUnit`, `ArchRegionCut`, `unitsOf`, `regionCut` | `src/main/arch/skeleton.ts` | §3.1 |
| A → A | `buildImportGraph`, `rungOf`, `seedsFor`, `declaredEntries`, `ArchEvidenceContext` | `src/main/arch/evidence.ts` | §1.3 |
| A → C | `ArchStore.factsOf`, `factFiles`, `linkCountsUnder` | `src/main/arch/db.ts` | §6 A, verbatim signatures |
| B → C | DOM contract the probe reads: `.arch-map-region[data-region]`, `.arch-map-region-label`, `.arch-map-region-sub`, `.arch-map-starts`, `.arch-map-wire[data-kind][data-from][data-to]`, `.arch-map-box[data-group][data-rung][aria-pressed]`, `.arch-map-rung`, `.arch-inspector[data-group]` with `[data-field]` rows, `.arch-tabs button[data-tab]`, `.arch-surfaces-region[data-region]`, `.arch-surfaces-row[data-group] [data-kind][data-count]`, `.arch-gates-select`, `.arch-gates-kind[data-kind]`, `.arch-gates-answer`, `.arch-gates-row` | B's markup, C's probe | pinned here; B may add classes, never rename these |
| B → hue | `RUNG_PINS`, `chromaticPinsFor` | `src/renderer/theme/presets.ts` | §4.7 |

### The integrator
Reconciles `src/shared/*` (append-only during the build), runs the full battery — `npm run typecheck
&& npm run build && npm test && npm run smoke:t1 && npm run smoke:t3 && npm run conformance:evidence
&& npm run conformance:reading && npm run conformance:arch && npm run conformance:arch:modules &&
npm run conformance:facts && npm run conformance:hue && npm run gate:checks && npm run gate:electron
&& npm run gate:background && npm run gate:contract` — then `npm run probe:p258`, scans for
duplicated 10+ line blocks (the region layout must not copy the band layout; the surfaces and gates
rows must share one fact-row component), writes the CLAUDE.md gates paragraph ("Touching the ladder,
the units or the reading surface?"), appends the BACKLOG running-log line, does NOT bump the version,
does NOT tag, and commits with the subject and first body line at the top of this file, no trailers.

---------------------------------------------------------------------------------------------------

## 7. Refusals and stated limits

**Refused, by the charter:**
- No model call, no agent turn, no token (Phase 259). No Journey tab, no model half of Gates, no
  "Receives / Returns / Where it stops" — those are model fields and a placeholder sentence is 259's.
- No `accepted-live`, anywhere, ever (§1.1, gate rules 1a–1c).
- No count badge on any node: the chip is a glyph; every number is in a sentence, a hover, a
  transport label or a table row. `conformance:arch:modules` stays green.
- No region from `boundary.path.module-root` (§3.1, gate rule 3c).
- No key moved in `docs/arch/`; `ARCH_ROW_KEYS` untouched, `conformance:arch` rule 12 unchanged.
- No operator fork between a deterministic and a semantic mode: one map tab, three inner tabs, one
  way in.
- No paragraph on the resting face (§4.5's numbers).
- No new token, no new colour literal, no amber: the mock's `--warning` on `declared` is NOT carried,
  because that hue is "an agent needs you" (DESIGN.md §1.3).
- No new rule in the fact table: the renderer root (`createRoot`, `hydrateRoot`, `ReactDOM.render`,
  `src/renderer/main.tsx` by path) is measured here as the cause of `src-renderer` reading
  `composed` with 0 of 968 files reached, and it re-enters through Phase 257's closed table with a
  corpus re-measure, never through this phase.

**Stated limits, each written into the code and the hover rather than discovered later:**
1. The ladder collapses on this repository for the structural reason §7.2 measured; the seed rule
   does not change the nine hand-named parts (§2.4 item 1). What varies is drawn as the per-file
   share.
2. A manifest whose entry is a BUILT artefact (`./out/main/index.js`) declares no seed; the hover
   says `nothing this reader recognises starts this unit` when `seeds = 0`. Tortie's own root unit
   is seeded by its composition roots alone.
3. Python console scripts (`mod:fn`) are not resolved to a file; `entrypoint.py.script` never seeds.
4. A compose service's build context is not read, so a service is a START mark and never a unit.
5. A worker's script is not resolved (measured: none names one on either repository), so a worker
   is a START mark, never a region and never a seed.
6. An import graph cannot see HTTP, sockets or RPC between two units (F6); stoa's `stoa-cli` reads
   2 of 417 files reached because Go's resolver follows little, and the transports between its units
   are `imports` only. The Outside band's `reaches` count is where that truth goes.
7. Rule Q reads no `go.work`, no Xcode project and no Gradle: `stoa-desktop-mac` lands in Elsewhere
   with its `@main` as a start. The sub says `no manifest names these`, which is the reader's truth.
8. `arch:facts` caps at 2,000 rows and says `truncated`.
9. The selection gesture changed (D5); the drill is one gesture further and the sidebar row still
   drills. Reversible by the operator; the probe measures both gestures.

---------------------------------------------------------------------------------------------------

## As built by builder C (2026-09-11), the deltas from §5 and §6

- `build/fixtures/evidence/` holds SIX trees rather than the seven directories §5.1 names: `one-unit`,
  `two-unit`, `nested` (added: rule 3b's deepest-first ownership cannot bite on `two-unit`, whose
  units do not nest), `elsewhere`, `manifest-seed`, `family`, plus `rungs.json` (the seven planted
  graphs and an eighth for rule 2d) and `expected.json`. `module-root-plant/` is not a directory: the
  probe composes `two-unit` again with 75 planted `boundary.path.module-root` rows and rule 3c
  compares the two answers byte for byte, so the plant cannot drift from its base.
- Every value in `expected.json` was derived by hand from §1 to §3, with ONE correction the landed
  code and §2's own instrument agree on: a box walks from the seeds of EVERY unit that owns one of its
  files (`seedsOfPart`, which is the `us` set §2's rules E and G were measured with), so `family`'s
  docs box reads `reached` with 2 seeds, because the python main is itself in the box, and rule 3d's
  pin is the boxless unit drawn as a start of the root region.
- The gate runs 20 ablations, not 16, and its scratch copies live under `.p258-conformance-*` at the
  repository root rather than the system temp directory, because a copy of `src/main` reaches
  `better-sqlite3` by a bare specifier that only resolves upward from inside the repository.
- Rule 1c blanks COMMENTS and scans STRINGS, the opposite of §5.1's wording, because the sixth word
  can only ever reach a rung as a string; a comment may explain the refusal.
- `conformance:reading` rule 13 pins the eleventh line's bytes by re-deriving them from the one rung
  table and the reading the copy under test answered, and reads `hoverLines`'s body as text (proved
  on two plants), because `ArchDrill.tsx` reaches the store and the icon set and cannot be imported
  under node. Its two new ablations are Q2's deepest-first order and F1's one-directory anchors.
- `conformance:arch` pins the drafted bytes as sorted buffer paths plus a sha256 in
  `build/fixtures/arch/expected.json` (`--write-skeleton-pin` regenerates), and its drilled-module key
  pin was widened by `rung`, `regionId` and `counts` with the reason written beside it.
- `probe:p258` could not be RUN in the build round: `markdown-it@14.1.0` is named in `package.json`
  and the lockfile but is installed nowhere on this machine (neither this worktree nor the operator's
  checkout), `npm run build` fails on it at the parent commit as well, and the round installs
  nothing. The probe is written, `--self-test` passes on ten graders, `gate:electron` counts it as the
  127th helper user, and the integrator runs it after the install; a parent clone built for its P arm
  stands at `/private/tmp/wt-p258-parent` (at `88165be1`, `node_modules` copied, `out/` removed
  because only main built) for `P258_PARENT_CHECKOUT`.

## As integrated (2026-09-11), the deltas the three builders' seams produced

- **The starts line on tortie is NOT `starts 2 workers`.** §3.4 and §5.3 miscounted. By Q5 as written
  and as measured, the one region reads `starts 7 workers, 2 threads, 1 process, 4 compose services,
  1 cargo library, 1 command, 2 containers, 1 go program, 1 npm package, 1 swift app, 1 swift library`:
  three of the workers are this repository's own `__tests__` files and two are the Phase 257
  fixtures under `build/fixtures/facts/**`, and everything after the services is those fixtures plus
  `build/p256/explorer-app/package.json`. Q5 counts them on purpose ("the fixtures are exactly the
  noise a reader should see"), so the probe grades the line against arch.db's `boundary` facts by
  kind rather than against a literal, and nothing in the code refuses a test path or a fixture.
- **ONE starts composer.** Builder B's face carried a second `archStartsLine` in
  `src/renderer/arch/copy.ts` that said `services` where the shared one in
  `src/shared/ipc/arch-map.ts` says `compose services` (Q5's wording); the face reads the shared one
  now and the copy is gone.
- **A hook after an early return took the whole pane down.** `Reading` in `ArchDrill.tsx` returned
  `null` while a repository had no map and called `useArch((s) => s.inspectBox)` AFTER that return,
  which is React #310 on the render that has the model; the boundary above the Sidebar caught it and
  the Architecture view vanished 303 ms after mounting in the running app, with every unit suite
  green because each renders a face once. The hook is above the return and
  `src/renderer/arch/__tests__/p258-hooks-before-return.test.ts` reads the rule as text over every
  component under `src/renderer/arch`, proved on the shape that shipped.
- **A box carries `data-region`.** The frames and the boxes are siblings in the SVG so a frame can sit
  under every band; the probe reads a box's region from the attribute rather than from nesting.
- **F1 at the parent paints 3 of 8, not 0 of 8.** Research 118's 0 of 8 was over the reading
  FIXTURE; the live clone at `88165be1` reads 3 of 8 against HEAD's 7 of 8 (every non-fold box).
  The P arm pins "fewer than every non-fold box" with the number printed.
- **Q2 puts `stoa-web-livekit-agent` and `stoa-web-livekit-teammate-agent` in their own units**, as
  §2.3 lists them, so §5.3's "stoa-web holding every stoa-web-* box" reads "in stoa-web or a unit
  under it".
- `ArchMapRegion.vendored` and `.truncated` are optional on the wire and filled by main AFTER the
  pure compose (`regionDenominators` in `check-coordinator.ts`, from `db.factStamps` over the same
  file set `arch:facts` answers for the region), because the evidence gate pins whole region objects
  over fixtures that carry no vendor stamps.
- `conformance:hue`'s rule 32 structural list was NOT extended with `--success`: the pin is asked of
  the shipping `chromaticPinsFor` by `conformance:evidence` rule 10 on both bases with an ablation,
  and the arithmetic is walked at every offered frame by hue rules 15, 16 and 18 through the same
  shipping function; the integrator's run of the gate over the integrated tree was green in 664 s
  with its 45 ablations each red, and builder B's run over the same `presets.ts` read the same.
- `openMap` in the probe sends `show-arch` on the real menu channel when the view chord finds no focus
  (a terminal pane takes the keyboard during the eleven second wait for the fact pass), and reads
  the door as a timeline with the page's own exceptions rather than as one silent wait.

