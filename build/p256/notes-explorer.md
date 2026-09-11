# Phase 256, question 2 — the explorer, taken apart

Researcher's notes. Nothing here is built, and nothing under `src/` was touched. Every number below
carries the instrument that produced it.

## 0. What was read, and how

Three files, copied into a scratch directory and read there. The two under `/Users/gdc/runstory` and
`/Users/gdc/specfactory` were lifted from the never-touch list by the operator on 2026-09-10 **for
these two files only**; nothing else in those repositories was opened, listed or written.

| copy | origin | bytes | md5 | stamp the file carries |
| --- | --- | --- | --- | --- |
| `runstory.html` | `/Users/gdc/runstory/AS-BUILT-ARCHITECTURE.html` | 87,928 | `6dbdb3b417ddc8767a4a89b77ddb7fce` | `v0.29.6 · 8d66627`, inspected 8 September 2026 |
| `specfactory.html` | `/Users/gdc/specfactory/AS-BUILT-ARCHITECTURE.html` | 98,995 | `3017e41232c859a052a61cfdd09663ed` | baseline `ea123cf478af`, 8 September 2026 |
| `stoa.html` | `/Users/gdc/stoa/AS-BUILT-ARCHITECTURE.html` | 86,548 | `ac890910cca6267d5db117a89b82d4b3` | source `dc942342`, inspected 2026-09-09, 3,270 files |

Instruments:

1. **Source read in full** — the CSS, the markup and every JavaScript data literal, with counts taken
   by `python3` regex over the file (`components`, `squads`, `steps`, `journeys`, `gateCases`,
   `componentFlows`, and for stoa the rendered `article.panel-card` / `li.step` / `li.case` markup).
2. **Read off the DOM in a scratch Electron** — `build/p256/probe-explorers.mjs`, which goes through
   `build/electron-run.mjs` (`withElectron`, teardown in a `finally`, scratch profile under `TMPDIR`,
   scratch `HOME`, scratch tmux socket `gmux-p256-<pid>`), launches no agent, spends no token, opens
   no keychain and makes no request. It loads each file at 1440×900, reads the resting face, then
   drives: selecting the last component, walking every tab, stepping a journey, and choosing a gate
   case / changing a worksheet input. Output: `build/p256/out-explorers.json`.
   `npm run shot` was not used.

**Two honest limits of the instrument.** (a) Under this harness the Chromium sandbox and GPU had to be
turned off (`--no-sandbox`, `--disable-gpu`) and a second `BrowserWindow` could not spawn a renderer,
so one window is reloaded per file; this changes nothing about layout or text. (b) In the no-GPU
window `innerText` occasionally dropped a lowercase `s` in a few `white-space:pre` captions
("snapshot" read as "nap hot"). Word **counts** are unaffected (the letter is inside a word), but any
caption quoted from the DOM in this file has been re-quoted from the source bytes.

---

## 1. The three at a glance (measured)

| | runstory | specfactory | stoa |
| --- | --- | --- | --- |
| views (tabs) | **4** | 6 | 5 |
| view names | System map · Follow a commit · What runs · Squad boundaries | System map · Follow the workflow · What runs · State and recovery · Built and remaining · Product areas | System map · Journeys · What runs · State · Built & remaining |
| components | 12 | 12 | **21** |
| component groups drawn on the map | 3 locations | 3 locations + 1 method band + 1 foundation | 4 regions (one dashed, "Outside this repo") |
| edges drawn between component boxes | **0** | 2 (inside the dashed method band only) | **0** |
| labelled transports between regions | **4** (two per gap, both directions, each named) | 2 bare `⇄` glyphs + 1 named return line + 1 mini-flow caption | 0 |
| journeys | 1 track, **15 steps** | 2 tracks × 8 steps | 5 journeys, 30 steps, mean 6.0 |
| gate/"what runs" device | a **computed worksheet**: 3 selects + 9 checkboxes → lane strip + 10-row table + conditional notes | 2 selects choosing 1 of **15 canned cases**, each with a route strip | 6 gate groups, **21 canned cases** (proceeds 8, stops 7, uncertain 5, detected 1) |
| evidence level per component | **none** | 5 status words (`Source implemented` 5, `Separate method components` 3, `Source composed, startup held` 2, `Production launch refused` 1, `Build integration in progress` 1) | **4-level ladder**: `Composed in source` 14, `Component-tested` 3, `Implemented, not shipped` 3, `Outside this repo` 1 |
| inspector fields | Receives · Does · Returns · Runs in · **Limits** | Receives · Does · Returns · Runs in · **Current limit** | Input/output · Runs as · What it does · **Current limit** · Source |
| per-component ASCII flow | 12 of 12 | 12 of 12 | 0 |
| source links per component (mean / distinct) | 4.4 / 51 | 5.8 / 61 | 2.0 / 41 |
| mean words in the `limit` field | 35.1 | 28.0 | 34.1 |
| external `http(s)` links | **0** | **0** | **0** |
| CSS custom properties on `:root` | 24 | 18 | 20 |
| markup vs script | 19.0 KB style, **52.5 KB script**, map containers empty in markup | 16.8 KB style, 53.9 KB script, detail containers empty | 8.3 KB style, **7.8 KB script**, all 21 cards + 30 steps + 21 cases **pre-rendered in markup** |
| URL state | `#map` … `#squads` — **view only** | `#map/C12`, `#journey/conversation/2`, `#gates/conversation/queue`, `#squads/host` | `#map/relay`, `#journey/version/2`, `#journey/ship/all`, `#gates/release` |
| machine-readable island | none | none | `<script type="application/json" id="architecture-data">` — `{revision, inspected, components:[{id,name,sources}]}`, 21 entries |

Word counts off the DOM (visible, after clicking each tab):

| view | runstory | specfactory | stoa |
| --- | --- | --- | --- |
| map | **447** | 537 | 270 |
| journey | 218 | 169 (one step sheet at a time) | 265 |
| what runs | 379 | 342 | 171 |
| state | — | 579 | 296 |
| built & remaining | — | 505 | 650 |
| product areas / squads | 293 | 320 | — |
| whole body at rest | 488 | 639 | 392 |
| **above the fold at 1440×900** | **253** | 285 | 288 |

Minimum path to understanding one component — masthead + view intro + the node's own label + the
inspector that is already open at rest:

* runstory **≈ 221 words** (36 + 25 + 9 + 151)
* specfactory ≈ 271 words (63 + 26 + 13 + 169)
* stoa ≈ 197 words (25 + 35 + 3 + 134)

All three **open with one component already explained** (runstory C02 "Commit transport", specfactory
C03 "Gateway and command ledger", stoa "stoa CLI"). Nobody has to click to see what a part of the
system does.

---

## 2. Runstory, taken apart (the primary exemplar)

### 2.1 The data model, in full

Three arrays and one map, all inline in one `<script>`:

* **`components`** — 12 objects, 12,850 chars. Fields, every one present on every component:
  `id` (`C01`…`C12`), `name`, `short` (3–5 words), `place` (`local` 4 · `plane` 3 · `sandbox` 5),
  `location` (a sentence: "Plan and route start locally; the runner consumes both"), `squad`,
  `intro` (2 sentences), `input`, `work`, `output`, `limit` (mean 35.1 words), `sources` (mean 4.4
  repository-relative paths, 51 distinct).
* **`componentFlows`** — 12 ASCII diagrams keyed by component id, drawn into a `<pre class="diagram-flow">`
  in the inspector. Example (C03): `held -> queued -> claimed -> running -> done` with a second line
  of failure edges and the caption "Queue job completed = sandbox handed off. Run may still be running."
* **`steps`** — 15 objects: `title`, `place`, `text`, `code` (a shell command or an ASCII figure),
  `output` ("Result"), `detail` ("Remember"), `ids` (the components this step touches), `sources`.
* **`squads`** — 7 objects: `name`, `ids`, `mission`, `input`, `output`, `neighbors`, `boundary`,
  `questions` (3 planning questions), `sources`.

Across steps and squads there are **33 component references** (22 id-lists), so the model is a small
graph whose edges live in the journey and the ownership view rather than on the map.

### 2.2 The four views

1. **System map.** Three `.location` columns — `Your machine / Working directory / Go CLI · Git hooks
   · local files`, `Hosted services / Control plane / Next.js on Vercel · Supabase`,
   `Temporary execution / E2B sandbox / Linux · Go runner · model pilot`. Each column holds its
   components as buttons carrying `id`, `name` and the 3–5 word `short`. Between the columns sit two
   `.bridge` cells, each with **two named, arrowed lines**: `Git pack + envelope →` / `← Polled
   verdict + artifacts`, and `Run token + provision →` / `← Evidence + completion`. Under the diagram
   a two-line caption states the two facts a diagram cannot: "The sandbox makes model calls through
   the plane proxy. Provider keys stay in the plane." and "Location and ownership can cross a
   component boundary."
   Selecting a node opens the inspector **below the map** (not a side panel): id, name, a "Back to
   map ↑" button, the lede, the ASCII flow, then two definition lists — `Receives / Does / Returns`
   and `Runs in / Limits` — then a foot with the proposed area (a link into the squads view) and the
   source paths. 151 words at rest, 176 for C08.
   Two standing notes sit under the map, and they are scope disclaimers rather than explanation:
   *"The verdict has a defined scope."* (36 words) and *"This describes source wiring."* (27 words).
2. **Follow a commit.** A 15-step list on the left; on the right a **place-track** of three cells
   (`Your working directory / Hosted control plane / E2B sandbox`) where the current step's place is
   highlighted, then a step sheet: `STEP 01 / 15`, title, prose, a `<pre>` holding either the exact
   commands (`git clone … && make install`) or an ASCII figure, then `Result` and `Remember`, then
   buttons jumping to the components the step touches, then the sources. 77 and 66 words for steps 1
   and 2 as measured.
3. **What runs.** The only device in any of the three explorers that **computes**. Inputs: application
   kind (cli/web/unknown), change class (code/docs/tests/dependencies/skip token), run depth
   (standard/deep/hunt), and 9 checkboxes for prerequisites ("The plan has a build command", "The
   build succeeds and creates or changes exactly one executable", …). Output: a title sentence
   ("The route selects 4 lanes."), a lane strip with ✓/· over `tree build tests cli_drive web_drive
   regression`, a prose summary, a **10-row table** (`Stage · What happens · Reason`) whose rows are
   badged run/caution/blocked, and 0–4 conditional warning notes ("Hunt checks HEAD's tree.",
   "Detection is not runtime support."). Below it two `<details>` disclosures: a 7-row support matrix
   (Go CLI, Node CLI, Node web, Go web, Rust/Python, API/library/native/mobile, Monorepo) and the two
   fixed check catalogues. Changing "Application kind" to `web` (driven) re-rendered the table to 10
   rows including "Hosted image — Browser missing".
4. **Squad boundaries.** 7 proposed areas, each with mission, a `Receives → Returns` contract flow,
   boundary, neighbours, three planning questions and sources, plus a 4-row handoff table naming the
   contract (`runstory.envelope/1`, `plan/1 route/1 ledger/1`, `verdict/6`, `findings/1 intent/1`)
   and the "shared acceptance question" for each.

### 2.3 Rendering, navigation, state

Vanilla JS, no framework, no build step, one `<script>`. Every view is a `role=tabpanel`; hidden ones
carry `hidden`. `showView` toggles `hidden`, moves `aria-selected` and `tabIndex`, sets
`--nav-offset` from the sticky tab bar's height, and `history.replaceState`s `#<view>`. **The
selected component, step and squad are NOT in the URL** — reloading `#map` returns to C02. Arrow
keys/Home/End walk the tab bar. Cross-links: `data-component-jump` (journey → map), `data-squad-jump`
(inspector → squads), `data-jump` (map → journey), and a `data-map-return` that focuses the node you
came from. 6 such cross-link controls at rest, 21 anchors in the whole page, **all repository-relative
or `#`** — zero external requests, matching the "offline companion" claim in its own footer.
The map, step list and squad list are **empty in the markup** and filled by JS; the `<noscript>`
therefore points at the Markdown companion.

---

## 3. Specfactory, taken apart — what it changed

Its own source comment says it took "the user-selected Runstory architecture explorer pattern". The
data model is the same shape with two additions and one subtraction:

* `components` gained **`status`** (the evidence word) and **`flow`** (the ASCII diagram moved from a
  side map into the component object); `squad` became `area`, and `squads` gained `scope`.
* `steps` became **`journeys`**: two named tracks (`conversation`, `work`), each with a `boundary`
  sentence drawn as a warning note above the steps, 8 steps each.
* The computed worksheet became **`gateCases`**: 3 kinds × 5 cases, each with `status`, `tone`
  (`source`/`held`/`refused`), `title`, `text`, a `route` array with an `active` index and a `stop`
  index, `detail` and `sources`. Picking "Queue work or pause/resume" printed 66 words and the route
  strip `✓ Validate · ■ Unsupported operation · · No delivery`. Nothing is computed; the cases are
  written.
* Two new views: **State and recovery** (a 9-row ownership table plus two ASCII diagrams of the
  command-delivery states) and **Built and remaining** (an 8-row area table, a 6-phase timeline with
  `In flight`/`Queued` tags, and a warning note "No usable factory URL yet" carrying the preflight
  result).
* URL state became `#view/id/part` and is written on every selection; `navigateHash` restores it.
* A **print appendix**: every component, journey, gate case and area is rendered a second time into
  `.print-only` containers, which is why the page carries 223 anchors against runstory's 21.
* The map gained a **dashed legend** ("Source wiring" / "Separate method path") and a dashed
  **method band** holding C09→C10→C11 with the tag "Queue-to-commit is not connected", plus a
  "foundation" row for C12. This is the only place in any of the three where an arrow is drawn
  between two component boxes, and it is drawn precisely because that path is **not** connected.

Density went up: the map at rest is 537 words against runstory's 447, the journey view carries
1,451 words of markup and the state view 579.

## 4. Stoa, taken apart — what it changed

* **Everything is pre-rendered.** 21 `article.panel-card`, 30 `li.step`, 21 `li.case` are in the
  markup; the script is 7.8 KB and only hides, shows, and writes the hash. With JS off the page is a
  complete document ("all five views are shown in full below").
* **A machine-readable island.** `<script type="application/json" id="architecture-data">` carries
  `{revision, inspected, components:[{id,name,sources}]}`. It is not render data — the page never
  reads it. It is the contract the skill's own checker reads: `check_explorer.py` validates the JSON
  and the `sources` entries (`/Users/gdc/as-built-architecture/scripts/check_explorer.py:213,392,443`).
* **An evidence ladder as a visible chip.** Four levels with a legend that defines each one in a
  clause: `Implemented, not shipped` (code exists; no release path reaches users), `Composed in
  source` (an entrypoint connects it), `Component-tested` (a named test or CI check establishes a
  limited property), `Outside this repo`. Distribution over the 21 nodes: 14 / 3 / 3 / 1.
* **Regions by where code runs**, with one drawn dashed: `Your machine`, `Browser and shells`,
  `Cloud services`, `Outside this repo`. Each region carries a one-sentence blurb ("A single Go
  binary, two Unix sockets, a Rust CRDT core and a macOS audio helper"). **No transports are drawn at
  all.**
* **Five journeys named as outcomes** ("A file change becomes a linked version", "A voice call becomes
  topics"), 30 steps, of which **8 are marked in the title itself**: 5 `BRANCH -`, 2 `GATE -`, 1
  `REMAINING -`. Every step names its component as a cross-link (30 `xlink`s).
* **21 gate cases in 6 groups**, each case a question/answer/because triple with a colour class:
  `proceeds` 8, `stops` 7, `uncertain` 5 ("Not covered"), `detected` 1.
* A **nested tablist**: the 21 component nodes are themselves `role=tab` with the cards as panels, so
  arrow keys walk the components. (This is why a naive `[role=tab]` count on this page returns 26.)
* Two chrome controls the others lack: a **Theme** toggle and **Print everything**.
* Component names are the *derivable* ones — `stoa CLI`, `automerge-ffi (Rust)`, `stoa-web (Next.js)`,
  `@stoa/agent-sandbox`, `Cloudflare share proxy`. By the rule "the name contains a product, package,
  language or platform token", **17 of 21** stoa names do, against **0 of 12** in runstory and **1 of
  12** in specfactory ("Warm Claude session"). Stoa's node cards carry name + evidence dot only (mean
  2.7 words) against runstory's 9.1.

---

## 5. What runstory's does that the other two do not

This is the best available evidence about the operator's preference, so it is stated as a difference
list, with the confound named first: **he saw runstory's first, and it is his own product**, so
familiarity is not separable from design by anything measured here. What is measurable:

1. **Fewest views (4) and the fewest words at rest** (253 above the fold, 488 in the whole body).
   Specfactory answers more questions and costs 6 tabs; stoa answers more components and costs a
   650-word closing view.
2. **The handoffs are drawn and named.** Four labelled, arrowed transports carrying *what crosses*
   ("Git pack + envelope", "Polled verdict + artifacts", "Run token + provision", "Evidence +
   completion"). Specfactory reduced them to `⇄`; stoa dropped them. This one device is what makes
   the runstory map read as a *system in motion* rather than a set of shelves.
3. **Every component is named for its job** (0 of 12 name a file, package or vendor) and carries a
   3–5 word subtitle on the node itself, so the map is readable before any click.
4. **One device that computes.** The worksheet turns 12 inputs into a selected lane set, a 10-row
   table and conditional warnings. Its successors recite canned cases. It is also the only place in
   the three where the reader can ask "what about *my* change?" and get an answer.
5. **One linear journey with a place-track.** 15 steps, and the three place cells tell you *where you
   are* at every step; the other two dropped the place track and split the journey (specfactory into
   two tracks, stoa into five).
6. **The inspector sits under the map, not beside it**, at full width with a two-column field grid, so
   the ASCII flow has room; both successors kept a variant of this.

And what runstory lacks that the others added, worth carrying forward regardless of preference: a
**per-component evidence level** (stoa's 4-level ladder is the strongest version), a **state-ownership
view**, a **built-and-remaining view**, **deep-link state** to the selected component and step, and
**markup that survives with no JavaScript**.

---

## 6. Why this reads as a semantic description rather than a dependency graph

The blunt finding first: **none of the three draws a dependency graph.** Component-to-component edges
in the map: runstory 0, stoa 0, specfactory 2 — and specfactory's two exist to show a path that is
*not* connected. A dependency graph is precisely what these files refuse to be. The devices that
replace it, and what each would cost Tortie:

| # | device | what it does | needs a model? |
| --- | --- | --- | --- |
| 1 | **Regions by execution location and authority** (`Your machine` / `Hosted services` / `Temporary execution`; stoa's `Outside this repo` drawn dashed) | answers "who is running this, and on whose machine" before any component is read | **Hybrid.** The partition is derivable — entrypoints, package manifests, deploy configs, Dockerfiles, CI targets, which files a binary compiles. The *name* of the region and its one-line blurb is model work. |
| 2 | **Labelled transports between regions** ("Git pack + envelope →", "← Polled verdict + artifacts") | names the payload, not the protocol, and gives the map a direction of travel | **Hybrid.** The edge is derivable (HTTP client → route handler, socket path, websocket URL, queue name). The payload name is model work, and it is the single highest-value model sentence on the page. |
| 3 | **Jobs, not folders, as component names** (12 of 12 in runstory) | makes the map a description of what the system does | **Model, irreducibly.** The deterministic half can only offer paths and package names — which is exactly what stoa's 17-of-21 names are, and stoa is the one that reads most like an inventory. |
| 4 | **A fixed five-field contract per component** (Receives · Does · Returns · Runs in · Limit) | one shape for every part, so parts are comparable | **Hybrid.** "Runs in" is derivable from the region pass. "Receives/Returns" can be seeded from detected signatures (route schemas, IPC channel types, CLI flags). The prose is model work, checkable against the derived facts. |
| 5 | **A named LIMIT on every component** (mean 28–35 words; 45 of 45 components across the three have one) | this is what stops the page reading like marketing: every part says where it stops | **Model**, with a derivable subset (no CI path, no call sites, gitignored input, a `TODO`, a deprecated route returning 410). Each limit should be required to cite a source path the deterministic half can resolve. |
| 6 | **An evidence level per component** (stoa's ladder: composed / component-tested / implemented-not-shipped / outside this repo) | separates "the code exists" from "anything reaches a user" | **Derivable, and the strongest determinism opportunity in the whole design.** Reachability from an entrypoint, a named test, a CI/release path, and absence of source are all computable. |
| 7 | **Journeys that end in a result**, named as outcomes, with the steps naming their components | the only place edges actually appear; a reader learns the system by following one thing that happens | **Model to author, derivable to check.** Every step names a component id and source paths, so a checker can refuse a journey whose steps name things that do not exist. |
| 8 | **Branches and gates shown as steps rather than hidden in prose** (stoa marks 8 of 30 step titles `BRANCH`/`GATE`/`REMAINING`) | makes the failure paths first-class | **Hybrid.** Guards, CI triggers, build tags, `if` conditions on constants are derivable; which ones are worth a step is model work. |
| 9 | **A "what runs" surface** — runstory's computed worksheet, the others' case lists | answers "what happens to *my* change" | **Mostly derivable** for the general case: CI workflow triggers, Makefile prerequisites, test scripts, build tags, hooks. Runstory's is hand-written rules mirroring a real classifier; that specific fidelity is model work. |
| 10 | **Distinct drawing for unconnected paths** (specfactory's dashed method band and its `Queue-to-commit is not connected` tag; stoa's dashed off-repo region; stoa's `uncertain`/"Not covered" case tone) | the page is believed because it admits what it cannot see | **Derivable.** Zero inbound call sites, no CI reference, a path with no source in the tree, a checker that compares only part of a file. |
| 11 | **A scope disclaimer per view** ("This describes source wiring", "Selecting a case does not invoke anything", "No running system, deployment or account was inspected") | fences the claim | **Neither** — it is a property of the *generator*, written once per view, and it is what makes a model-written page safe to publish. |
| 12 | **Resolvable source links everywhere** (41–69 references, 41–61 distinct, 0 external) | every sentence can be checked in one click | **Derivable and checkable.** The skill's own checker already refuses unresolvable ones. |
| 13 | **One component explained at rest** | zero clicks to the first real answer | Pure UI. |

The pattern behind the table: **semantics come from the model, trust comes from the deterministic
half, and the shape of the page is what forces them to meet.** Every model sentence in these files is
attached to a source path, a region the tree can confirm, or an evidence word that a check can
recompute — and the three views the successors added (state ownership, built-and-remaining, gates)
are the most derivable ones of all.

---

## 7. What Tortie's house rules would refuse in this style

Listed so the design step does not copy something the house forbids.

1. **Two chrome controls must go.** Stoa's `Theme` toggle and `Print everything` button, and
   specfactory's `Print reference` button, are DOM chrome for things Tortie owns elsewhere: appearance
   is Settings (Phase 207/210/213), and any menu must be a native one through `ui:popupMenu`. A pane
   that grows its own theme switch contradicts both the appearance work and the native-menu rule.
2. **No invented colour.** The three files define their own palettes on `:root` (24 / 18 / 20 custom
   properties) and set `color-scheme: light dark`. A Tortie port draws every colour from
   `src/renderer/styles/tokens.css`. Their semantic colours (`pass/fail/live`;
   `stops/proceeds/uncertain`; `source/held/refused`) must map onto existing status tokens, and any
   dot or chip inherits the Phase 218 floor — at least 3:1 against `--bg-active` across every frame
   the Appearance controls offer, not just the shipped one.
3. **The word budget.** `Just enough words` (operator, 2026-08-28, set on this very pane) against a
   measured resting face of 253–288 words above the fold, views of 342–650 words, and a 35-word
   `limit` paragraph in the inspector. What survives: the 3–5 word node subtitle, the five field
   labels, the region label. What must move behind hover or a disclosure: the limit paragraph, the
   scope notes, the region blurb, the 2-sentence lede. The explorers put explanation on the resting
   face on purpose because they are documents; Tortie's pane is a surface.
4. **No command may appear on the face.** Runstory's step sheets print `make install`,
   `runstory init --account <uuid> --bypass <secret>`, `runstory verify --only-failed`; specfactory
   prints a reproduce block with an absolute path under the person's home. Research 66's pinned key
   set exists so that nothing in a standing contract can name anything Tortie runs, and refusal 8
   says nothing may cause a process to start on a configuration change alone. A model-written record
   that carries a runnable command, rendered in a pane with a terminal one keystroke away, is exactly
   the shape those two rulings forbid. If a direction wants commands, it says so plainly and leaves
   the decision to the operator.
5. **No third-party code, no skill execution.** The explorer is an artefact a skill wrote; Tortie can
   neither run that skill nor load its HTML as code. Refusals 1 and 7 mean a port re-implements these
   devices in Tortie's own React under the main renderer's CSP, reading a record, never a page.
   (Helpfully, all three files already make **zero external requests** — 0 `http(s)` links in 21, 223
   and 57 anchors — so the CSP is not the obstacle; the obstacle is executing somebody else's page.)
6. **URL state has no equivalent.** All three lean on `location.hash` for deep links
   (`#journey/version/2`). A Tortie pane has no URL; the same affordance has to become per-tab,
   per-project view state, and a "remote project feels identical to a local one" (memory rule) means
   the mirror path must carry it too.
7. **Vocabulary.** Their words are theirs — "sandbox", "pane" in the tmux sense does not appear, but
   anything ported keeps Tortie's rule that a session has a name and no tmux vocabulary reaches the
   face.
8. **A surface added is a menu changed.** Any view added to the Architecture pane updates the native
   menus in the same commit, and the phase brief says what changed.

---

## 8. Files this question produced

* `build/p256/probe-explorers.mjs` — the driver (through `withElectron`, teardown in a `finally`).
* `build/p256/explorer-app/` — the one-window Electron reader it launches.
* `build/p256/out-explorers.json` — everything the probe read, per file.
* `build/p256/notes-explorer.md` — this file.

Nothing was committed, and nothing under `src/` was touched.
