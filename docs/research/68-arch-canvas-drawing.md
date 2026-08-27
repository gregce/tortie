# Research 68. How the Arch map gets drawn, and how it moves

**Status.** Research only, requested by the operator on 2026-08-27 while Phase 160 was building in
a separate worktree. It feeds Phase 162 and may revise it. It schedules nothing on its own; the
single deliverable is this document. It was chartered as research 67, and landed as 68 because 67
was already taken on disk by the teammate splits research.

**Method.** Four investigators ran in parallel, all read only against the checkout, the npm
registry and the live web: one on rendering and layout libraries, one on the prior art of every
codebase visualization product that shipped or died, one on the visual devices that give a drawing
weight, and one on the constraints, being the CSP, the bundle, the licenses and the CSS zoom
region the pane sits in. Two of them independently built benchmark pages and measured plain SVG
under a moving camera at the scales the product can emit. This document is the synthesis. Where
the investigators disagreed the disagreement is stated rather than averaged away.

**Marks.** A claim marked **measured** was run on this machine on 2026-08-27, in Playwright's
Chromium 151 against scratch pages under
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/r67/`,
never inside Tortie's Electron, which was running the operator's live sessions and was not
touched. A claim marked **fetched** came from registry.npmjs.org, WebSearch or WebFetch on
2026-08-27, with the version named. A claim marked **read** was read from the checkout or from an
installed tarball. Bundle sizes were produced by installing the exact version named and bundling
with esbuild, minified, react externalized, then gzip. No code was changed, no Electron was
started, and no tmux was touched.

**The answer in one paragraph, unpacked in section 7.** Stay hand written SVG. Admit zero new
packages. The camera is an SVG attribute transform, hand written, with two small pieces of
finished math vendored as ISC extracts in the Pierre pattern: the zoom-toward-cursor transform
algebra and the van Wijk and Nuij fly-to path. The map tab is exempted from the `--zoom-arch` CSS
zoom rule and owns its own scale, the same exemption Monaco and Pierre already have. The weight
the operator asked for comes from six drawing devices that are pure functions of geometry and
tokens, most of them adoptable by Phase 160's static SVG today. The measured numbers remove every
argument for a rendering library at the scales this product can emit, and they also answer the CSS
zoom spike that Phase 162 was chartered to run first.

---

## 1. The question, in his words, and where Phases 160 to 162 stand

On 2026-08-27 the operator said: Arch needs to be a high fidelity way of visualizing a codebase,
so a person can hold the mental model in their head, at a few levels of aggregation. And on the
drawing itself: a visualization that has some weight, almost like a CAD model but not necessarily
3d, that helps you determine the boundaries and concerns of the repo and allows you to navigate
and move it around and dive deeper.

He also said plainly that if SVG works well for the visual understanding, fine. So the null
result, that hand written SVG plus care is enough, was a legitimate finding from the start and has
been priced like every other option. It is, in fact, the finding.

The context (**read**, docs/BACKLOG.md Phase 160 to 162 entries):

- **Phase 160**, building right now: a static, deterministic, hand written SVG map of 5 to 9
  weighted boxes in the pattern of `src/renderer/scm/graph/`, drawn in a full size map tab, for
  any repository, contract or none. Zero new packages by charter.
- **Phase 161**: drill down and up, level by level, reusing Phase 64's caps of 30 boxes, then the
  matrix, then the lists.
- **Phase 162**: the canvas, being pan, zoom and a kept layout. Its entry carries the CSS zoom
  spike as a precondition and carries the two-package admission from research 49 as a question,
  not a decision. This research answers both.

## 2. What research 49 already knew, and what moved since

Research 49 sections 4.10, 5.3, 5.4, 9 and 11 (**read**) had already done the field survey:
`@xyflow/react` plus `@dagrejs/dagre` was the admitted pair for a canvas slice, verified eval free
and CSP clean, with two named taxes, being a bundled zustand 4 beside Tortie's 5 and the
`transform: scale` viewport inside Tortie's CSS zoom regions, which was the canvas slice's first
spike. elkjs was rejected on its EPL-2.0 license as a standing decision. tldraw, cosmos, pixi,
GoJS and the rest were rejected on license or CSP. Stability was to come from storage, positions
persisted in `arch.db`, never from an engine. `@msagl/core` was left as a watch item: if its
classic incremental mode survived the TypeScript port, it was the only MIT challenger on
stability. Hand written SVG in the scm graph pattern was priced as the fallback if the spike
failed.

What moved between then and today:

1. **The product inverted.** Research 49 framed the pane promises first with the picture gated on
   usage. The operator ruled the picture is the product, the map is a full size tab, and Phase 162
   lost its usage gate. The engineering content of 49 survives; its ordering does not.
2. **The spike was run**, outside Electron, and it has an answer. Section 6.3 carries it. The
   short form: React Flow's drag is measurably broken inside a CSS zoom region, the null option is
   correctable with one divide, and the right move for either branch is to exempt the map tab from
   `--zoom-arch` entirely, at which point the defect never fires for anyone.
3. **Plain SVG under a moving camera was measured at every scale the product can emit**, which
   research 49 never did. It holds vsync everywhere it is required to. Section 6.4.
4. **The msagl watch item is resolved as a reject**, from its shipped source at 1.1.24 (**read**):
   the IPSepCola incremental algorithm survived and is deterministic out of the box through a
   seeded PRNG, but the `CreateLock` position pinning API did not survive the port, and IPSepCola
   is a force family layout, the wrong family for a layered map by 49's own ruling. 196.6 KB gzip
   **measured**. The one thing worth keeping is the precedent that a fixed seed makes a force
   engine reproducible.
5. **A blanket sentence in 49 about wasm is corrected.** Wasm is blocked by the renderer CSP on
   the document thread and in blob workers, and it compiles fine in a bundled same origin file
   worker (**measured**, section 6.2). Shiki's oniguruma already ships that way. No candidate
   needs this; it is recorded so a later round does not inherit the overbroad sentence.
6. **The registry moved a little and changed nothing.** All versions re-read today, section 3. A
   fresh search for anything new in 2026 found nothing open that 49 missed; the current
   recommendation lists are the same names plus commercial engines that fail on license before any
   technical question (**fetched**, Linkurious and FusionCharts roundups).

## 3. The library evaluation

### 3.1 Registry facts and measured costs, as of 2026-08-27

Every row **fetched** and **measured** as described in the marks block. Tree shaking was defeated,
so these are ceilings.

| Package | Version today | License | Published | Gzip measured | The deciding facts |
|---|---|---|---|---|---|
| @xyflow/react | 12.11.5 | MIT | 2026-08-25 | 57.9 to 62.0 KB JS plus 3.0 KB css | Zero eval, zero new Function, zero wasm, zero remote font, verified by grep at this version. Still declares zustand ^4.4.0, which installs 4.5.7 nested beside Tortie's 5.0.x forever. Attribution corner ships in the code. Nodes are HTML, edges are SVG, two coordinate spaces. Drag inside a CSS zoom region is broken, measured, section 6.3 |
| @dagrejs/dagre | 3.1.1 | MIT | 2026-08-08 | 16.5 to 16.8 KB | Zero Math.random, deterministic for a fixed insertion order. Layout only |
| d3-zoom + d3-selection (+ d3-drag) | 3.0.0 | ISC | 2021 to 2022 | 16.5 to 16.8 KB | Gesture math and a transform value you apply yourself, no layout, no randomness, no eval. Dormant since 2022, which a literal reading of the 14 month rule rejects; upstream treats d3 modules as finished |
| d3-interpolate | 3.0.1 | ISC | stable since 2021 | 69.7 KB unpacked (**fetched**, registry) | Carries `interpolateZoom`, the van Wijk and Nuij fly-to path, about 80 lines if vendored instead |
| diagram-js | 15.24.1 | MIT | 2026-08-18 | 11.5 KB bare core | SVG nodes, tokens work, Camunda backed. Built around the didi injection container, its own event bus, canvas and module system; real usage pulls feature modules beyond the bare core |
| cytoscape | 3.34.2 | MIT | 2026-08-25 | 133.6 to 141.4 KB | Canvas drawn nodes, so text, focus, codicons and menus become ours. 15 Math.random sites, no seed |
| @msagl/core | 1.1.24 | MIT | 2026-04-24 | 140.6 to 196.6 KB | Watch item resolved as reject, section 2 item 4 |
| elkjs | 0.12.0 | EPL-2.0 OR GPL-3.0-or-later | 2026-07-17 | 439.6 KB | The 49 license rejection stands, and the measured size is a second independent reason: 26 times dagre |
| sigma + graphology | 3.0.3 / 0.26.0 | MIT | 2026-04-30 / 2025-01-26 | not bundled | WebGL, refused by the context budget rule; graphology core 19 months without a release |
| pixi.js | 8.20.1 | MIT | 2026-08-26 | not bundled | 5 new Function sites in the shipped dist, re-verified today, throws under the CSP |
| reagraph | 4.32.0 | Apache-2.0 | 2026-06-25 | not bundled | three.js WebGL, refused on the context budget |
| react-zoom-pan-pinch / @panzoom/panzoom | 4.0.4 / 4.6.2 | MIT | 2026 | 13.5 / 3.7 KB | CSS transform cameras, so they share React Flow's zoom region question rather than escaping it |
| The null option | n/a | n/a | n/a | 0 | The house pattern, measured at every scale in section 6.4 |

For scale: today's built renderer is 11,172 KB gzipped across 425 chunks with Monaco at 4.44 MB of
it (**measured**, out/renderer/assets). Even the heaviest candidate is invisible next to Monaco.
Bundle size eliminates nobody; the deciding constraints are determinism, coordinate spaces, the
zoom region, and what the library actually buys at 9 to 30 boxes.

### 3.2 The scored shortlist

**First: the null option, hand written SVG in the scm graph pattern, with the camera's finished
math vendored rather than rediscovered.** It is the only candidate with total determinism (pure
functions of input, the house pattern's own proof), a measured vsync pass at every required scale
(section 6.4), one coordinate space for every weight device in section 5, zero packages, and
structural immunity to the zoom region risk, because an SVG attribute camera never touches CSS
transforms. What it does not get free is gesture normalization: wheel versus trackpad pinch, zoom
about the cursor, clamping, inertia. That is roughly 300 lines of finished, ISC licensed math that
d3-zoom exists to encode, and taking that math rather than rediscovering wheel semantics by bug
report is what the assemble guardrail is for. The two investigators split on the form: the library
investigator would take d3-zoom as a dependency, the feel investigator would not, because its
event model gets replaced by ours anyway and its last release is 2022, four years dormant against
the house's 14 month rule. The ruling in section 7 takes the vendored extract form, which both
investigators listed as acceptable and which avoids arguing an exception to the dormancy rule.

**Second: @xyflow/react 12.11.5 plus @dagrejs/dagre 3.1.1, the research 49 pair, demoted to
priced fallback.** About 97 KB gzip total including a duplicate zustand major, excellent
maintenance, CSP clean. It buys drag, selection and viewport management, and it charges for them
with a two coordinate space drawing (HTML nodes, SVG edges) that complicates every single space
weight device in section 5, a keyboard model that 49 already ruled gets replaced wholesale, and a
measured drag defect inside CSS zoom regions that is not correctable without patching the vendored
library (section 6.3). It stays admitted as the fallback if Phase 160 or 161 shows hand written
interaction costing far more than measured here.

**Third: diagram-js 15.24.1, second fallback, unchanged from 49.** MIT, active, SVG in one
coordinate space, 11.5 KB core. What holds it back is architectural: adopting it means adopting
the didi container, its event bus and its module idioms to get pan and zoom that section 6.4 shows
costs almost nothing by hand, and it replaces the house pattern's pure function discipline with an
object graph.

**Rejected outright this round, with the reason each:** cytoscape (canvas drawn nodes make text,
focus and menus ours, 15 unseeded Math.random sites), @msagl/core (no position pinning, wrong
layout family, 196.6 KB), elkjs (standing license decision, plus 439.6 KB measured), sigma and
reagraph (WebGL against the context budget), pixi (CSP, re-verified at 8.20.1), react-zoom-pan-pinch
and panzoom (CSS transform cameras that inherit the zoom region problem the ruling removes).

A note on dagre specifically: Phase 160's level 1 is 5 to 9 boxes laid out by hand, and Phase
161's level 2 is capped at 30. At those counts a Sugiyama engine is not pulling its weight either,
and the levelization device in section 4 costs one topological sort written by hand. dagre stays
admitted in principle (16.8 KB, MIT, deterministic) but nothing in the recommended design needs
it, so it does not enter the bundle this round.

## 4. The prior art: what shipped, what died, and why

The full survey covered twelve products and families (**fetched**, sources at the end). The dead
ones first, because their causes of death are the design constraints.

**Sourcetrail** (archived 2021-12-14, GPL-3.0) drew the neighborhood of one selected symbol beside
the real source, clicks flowing both ways. It died of three compounding causes: it maintained its
own C++, Java and Python indexers, a load two founders could not carry; it was a tool people need
once per onboarding, which the code2flow maintainer named plainly in the discontinuation thread as
nearly impossible to monetize; and it lived outside the editor, so the once in a while tool also
had a launch cost. Tortie already pays the indexing cost through the Phase 63 and 157 fact base
and already owns the surface the person is in, so the two structural killers do not apply.

**CodeSee** (acquired by GitKraken 2024, sunset the same year) drew directory grouped file maps
with import edges. The sticky part was the review map, scoped to a change, which is the part
GitKraken kept. It died as a SaaS destination outside the editor with the same once per onboarding
curve, and its force directed layout drew a different picture on different days, which quietly
destroys the mental model goal, because spatial memory only forms over a stable picture.

**CodeScene** (alive, commercial) survives on circle packed enclosure diagrams whose layout is
deterministic given the tree, colored by git derived hotspot data that is cheap and language
independent. Its limit: it is read only reporting sold to leadership, not a place a person works.

**Structure101** (acquired by Sonar 2024) invented the Levelized Structure Map: modules arranged
so every dependency points downward, the same grammar recursively at every drill level, cycles
collapsed into visually loud tangle cells. Direction became position, so nobody traces arrows to
learn who depends on whom. It stayed niche because its value proposition demanded an authored
target architecture few people authored. The map itself, which was automatic, works.

**NDepend** (alive, .NET) proves a graph and a matrix must be two views of one shared selection
with round trips between them, and that a matrix stays legible only with a strict tiny color
grammar per cell. Arch's shipped grade ladder, boxes then matrix then lists, is already this
shape.

**IntelliJ** is the null result witness: the most installed IDE on earth ships auto generated
diagrams and nearly nobody lives in them, and JetBrains' own retreat was to a DSM in 2008.
Auto layout boxes and arrows with no cap, no kept positions and no altitude discipline fails even
inside the editor, so being in the right surface does not by itself save a bad drawing.

**CodeCity** (academic) is the only controlled experiment in the survey: its 3d city users were 24
percent more correct and 12 percent faster than Eclipse plus spreadsheets, and it still never
crossed into practice, because 3d brings occlusion, honest metric to geometry mapping breaks on
the impossibly tall building, and camera navigation taxes every glance. The weight produced the 24
percent; the third dimension produced everything that killed it. That is exactly the reading of
almost like a CAD model but not necessarily 3d that this document hands Phase 162.

**gource, GitHub Next's repo visualization, emerge, anvaka's map of GitHub, and the treemap
family** round out the survey. gource is a film about the repo, watched once; its lesson is that
people instantly read a spatial tree, and the failure is perpetual motion and zero query. GitHub
Next's circle packing had no edges at all, and a map with no dependencies is a shelf, not a model.
anvaka's map of 690K repositories feels like a real place for one reason: the force layout ran
once, offline, and everyone sees the same frozen geography, determinism by baking. The cushion
treemap family (SequoiaView, WinDirStat) is the most adopted code adjacent visualization ever
shipped, and its shading trick is stolen below.

### The five devices worth stealing

1. **Cushion shading for solidity** (SequoiaView, van Wijk and van de Wetering 1999): a luminance
   gradient per box makes flat rectangles read as solid slabs pre attentively, spends no hue, is a
   pure function of geometry, and is one SVG gradient def.
2. **Frozen geography** (anvaka, CodeScene): compute the layout once, persist it, make re-layout
   an explicit human act. This confirms from shipped prior art the storage based stability design
   Phase 162 already carries.
3. **Direction as position** (Structure101): levelize the boxes so imports flow downward; a
   violation is then visible as an upward edge with no label read. One topological sort at layout
   time, deterministic.
4. **The map beside the code with clicks flowing both ways** (Sourcetrail): the single most
   mourned capability in its discontinuation thread, and Tortie's map tab plus editor is
   positioned to do it natively through Phase 161's ladder.
5. **One selection, several altitudes** (NDepend, AppMap): graph, matrix and list are views of the
   same selection with round trips, never three separate screens.

### The three mistakes worth refusing

1. **Auto layout boxes and arrows with no cap and no kept positions.** The whole graveyard died of
   it and both NDepend and JetBrains retreated from it. The cap of 5 to 9 and persisted positions
   are not polish; they are the difference between the graveyard and the survivors.
2. **True 3d.** CodeCity had measured comprehension gains and still never shipped into practice.
   Take the weight, refuse the axis.
3. **The standalone destination with a once per onboarding usage curve.** Sourcetrail and CodeSee
   both died of it. The map must live where the person already is and be computed always from
   facts already paid for, which is exactly Phase 160's stance. Any future proposal that adds a
   gesture, an export step or a separate surface for the map is this mistake returning.

## 5. The visual language: how the map gets its weight

The finding that organizes this section: weight is a stack of cheap deterministic devices, and
Tortie already owns the most important one. The tokens file is a five step luminance ladder,
`--bg-canvas` through `--bg-active` (**read**, src/renderer/styles/tokens.css), which is exactly
the Material dark theme elevation mechanism, where a higher surface is a lighter surface because
shadows die on dark grounds. Everything else sits on top of that ladder, every device is a pure
function, every color is a token, and no device pins a number to a node.

### 5.1 The devices, adopted

- **Elevation by surface luminance.** Ground is `--bg-canvas`, a box is `--bg-surface`, hover
  lifts one step to `--bg-raised`, selection to `--bg-active`. Zero new colors, zero cost.
- **Cushion shading.** One shared `<linearGradient>` def, a white over black stop opacity overlay
  per box. **Measured** free at 9 and 30 boxes, a frame killer at 40,000 marks (17.1 ms mean
  against 8.4 ms flat), so it is used at levels 1 and 2 and never per matrix cell.
- **The chamfer edge.** A 1 px lighter top and left inside stroke and a 1 px darker bottom and
  right, one consistent implied light direction, the flat share of CodeCity's extrusion.
  Effectively free everywhere.
- **The line weight grammar.** The ISO 128-2 discipline of two or three stroke widths total at a
  fixed ratio: 2 px for the boundary and box outlines, 1 to 3 px stepped for edges where the step
  carries import count, 1 px hairline for furniture. Edge weight is quantized into the named
  widths, never a continuous scale, or the drawing loses the grammar that makes it read as
  drafted.
- **The poche boundary.** The trust boundary drawn as a wall with thickness, an outer rounded rect
  one ladder step above ground with the inner region a step above that, 6 to 10 px of visible
  wall, the architectural convention for enclosure against space. Ours inside, not ours outside.
- **Hatching for machine written code.** A fine 45 degree SVG `<pattern>` in `--border` over the
  token fill, one meaning only, being generated and vendored code that no person here wrote. It
  reinforces the provenance glyph from research 49 section 9.5, never replaces it.
- **Focus dimming during drill.** The non focused group drops to about 0.45 opacity, the shipped
  `--graph-dim` precedent. Any CSS filter is applied only at rest and dropped during an active
  gesture, because a group level filter over a large scene **measured** 15.8 ms mean while
  panning.
- **One shot staged drill transitions.** The clicked box grows to become the new frame while the
  siblings fade, 200 to 300 ms, keyed by id so the same datum stays the same DOM node (Heer and
  Robertson 2007, Bostock's object constancy), driven by one user gesture, then still.
  `prefers-reduced-motion` cuts to the end state. This is user caused motion and the house motion
  rule permits it.

### 5.2 Level by level

**Level 1, the whole repository:** the poche wall around 5 to 9 slabs, each carrying the cushion,
the chamfer, a tight per box shadow, area by file count, provenance glyph, hatching where machine
written. Externals stand outside the wall on the bare canvas, flat, with no cushion and no shadow:
the flatness is the message that they are not ours. Edges are curved paths in `--text-muted` at
the three named widths, levelized so imports flow downward; verdict color from the status tokens
rides only the edges a contract judges. A dot grid on the ground moves 1:1 with pan, no parallax,
so motion is readable and stillness is still.

**Level 2, inside a part:** the same grammar one step down. The opened part's boundary becomes the
poche frame, modules get the identical slab treatment, and crossing edges to the rest of the
repository pin at the frame edge as stubs so context is never lost.

**The matrix:** flat token fills only, hairline gridlines, zero decoration per cell, with the
poche frame and headers carrying all the weight. This is not a style choice; it is the **measured**
boundary, because flat fills were the only drawing that held vsync at 40,000 marks.

**The camera, Phase 162:** wheel and trackpad scroll pans, pinch or modifier wheel zooms toward
the cursor, space drag pans, Shift 1 fits all, Shift 2 fits the selection, F centers then fits per
the Perfetto convention 49 already adopted. Release carries inertia at the Apple deceleration
family, about 0.998 per millisecond, roughly 60 lines of hand written velocity and decay math.
Drill and F travel on the van Wijk and Nuij fly-to path at a fixed duration. Camera state persists
beside layout in `arch.db`. During any active gesture, filters off and opacity dims only; at
rest, the full device stack.

### 5.3 The WebGL escalation, priced and refused

What it would buy: decorated marks at the 40,000 mark matrix, real 3d, headroom at a speculative
few thousand node file level. What it costs: one context from Chromium's per renderer budget of
about 16, which the terminals already spend from (the standing 49 rejection); text, focus rings,
native menus and accessibility rebuilt from nothing because nothing on a GL canvas is DOM; a
shader pipeline whose determinism across GPUs is a real open question; and every admissible GL
library already rejected on license or CSP. The measured numbers remove its last argument: the
only case it would help, decorated matrix marks, is a case the design refuses on legibility
grounds anyway. If the speculative file level ever ships and measures badly, the honest escalation
is a single 2d `<canvas>` layer for marks only with the frame and text kept in DOM, and that is a
future research question, not a live option.

## 6. The constraint audit

### 6.1 The CSP, read exactly

The renderer policy is one string in `src/renderer/index.html`, pinned byte for byte by
`build/assert-preview-containment.mjs` inside `npm run build` and by the csp test (**read**):
`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
gmux-asset:; font-src 'self' data:; worker-src 'self' blob:; frame-src gmux-preview:`. No
connect-src at all, so no fetch, XHR or WebSocket at draw time, and the gate fails the build if
the policy ever gains one. No eval and no wasm-unsafe-eval. `'unsafe-inline'` for styles is
present, so libraries that set inline style attributes are fine. Neither candidate stylesheet
(@xyflow/react, diagram-js) pulls a font or any url (**read**).

### 6.2 The wasm correction

**Measured** on a page carrying Tortie's directives: wasm compilation is blocked on the document
thread and in blob workers, and succeeds in a bundled same origin file worker. This is exactly how
the app already works, shiki's oniguruma in the highlight pool worker and web-tree-sitter in main.
So the honest rule for any future layout engine: wasm may run in a bundled worker or in main,
never on the renderer's document thread. No surviving candidate needs this; every one is pure JS.

### 6.3 The CSS zoom spike, run, and the answer research 49 was waiting for

The Arch pane sits inside `zoom: var(--zoom-arch, 1)` (**read**, src/renderer/zoom/zoom.css line
70), and the house chose `zoom` over `transform: scale()` precisely because zoom keeps
`getBoundingClientRect` agreeing with `clientX`. The spike had two halves, both **measured** in
Chromium 151, one major version above the Electron 43 Chromium 150 the app pins.

**Crispness:** at device pixel ratio 2, text rendered plain, under `zoom: 1.25`, under
`transform: scale(1.25)`, and nested zoom outside with translate plus scale inside (exactly React
Flow's viewport in the zoom region) are all equally crisp at rest. Chromium re-rasterizes at the
composited scale once a transform settles; the feared permanent blur does not exist. Transient
blur during an in flight animated zoom was not measured and ends when the gesture ends.

**Pointer math:** inside a `zoom: 1.25` region holding a translated and scaled viewport, the naive
conversion every library uses reports a node at flow x 169.2 where the truth is 130; dividing the
client offset by `currentCSSZoom` first returns 131.3, within the border of exact. The helper
already ships as `toLocalPx` in `src/renderer/zoom/coords.ts`. Then the real library: React Flow
12.11.5 mounted inside a `zoom: 1.25` container, a node dragged 100 screen pixels in 100
interpolated steps, and the node traveled 122.5 screen pixels, escaping the cursor by exactly the
zoom factor. `@xyflow/system` 0.0.81 contains no `currentCSSZoom` handling (grep, zero hits), and
the adjacent open upstream issue is xyflow 4647.

**The consequence, and it holds for either branch:** the map tab is exempted from the
`--zoom-arch` rule, with the panel zoom chord routed into the camera's own scale. The house
already has this exact pattern twice, Monaco taking `updateOptions({ fontSize })` and Pierre
taking `--diffs-font-size`, both documented in zoom.css as surfaces that own their coordinate
math. A canvas owns its coordinate math by definition. With the exemption, React Flow's defect
never fires and the null option needs no divide either. If the canvas were ever left inside the
zoom region anyway, the null option is correctable with one `toLocalPx` call and React Flow is not
correctable without patching a vendored library. That asymmetry is part of the ruling.

### 6.4 How far the house SVG pattern stretches, measured

Two independent benchmark pages, both driving a scene panned and scaled every frame by rewriting a
single `<g transform>` attribute, on this machine's 120 Hz display where the vsync interval is
8.33 ms:

| Scene | SVG elements | Build and first paint | Pan and zoom frame mean / p95 / max (ms) |
|---|---|---|---|
| Scale A: 9 to 12 labeled boxes, curved weighted edges, full weight device stack | 30 to 36 | 13.5 ms | 8.33 / 8.8 / 9.9 |
| Scale B: 30 labeled boxes, 90 edges, full device stack | 90 to 150 | 13.9 ms | 8.33 / 9.2 / 9.4 |
| 200 labeled boxes, 400 edges | 800 | 13.5 ms | 8.33 / 8.7 / 9.3 |
| Matrix, 10,037 marks | 10,037 | 28.3 ms | 8.33 / 8.9 / 9.4 |
| Matrix, the full 200 by 200 worst case, flat fills | 40,000 | 102.3 ms | 8.33 / 9.2 / 13.3 |
| Speculative file level, 3,000 labeled boxes, 5,000 edges | 11,000 | 43.6 ms | 14.6 / 17.3 / 25.0 |

Every row except the last is vsync locked at 120 Hz while panning and scaling simultaneously,
including the shipped substrate's absolute worst case, the 40,000 mark matrix. The cliff is text
and decorated fills, not element count: 3,000 `<text>` elements drop the pan to about 70 Hz, and a
gradient fill per matrix mark costs 17.1 ms mean against 8.4 flat. Every scale any shipped phase
can emit sits two orders of magnitude below the limit, and the one scale that strains is
speculative headroom whose honest fix is the gutter's own rule: do not draw labels the camera
cannot read.

Caveats carried honestly: these numbers are from an idle machine in Playwright's Chromium 151, not
inside Electron 43 with the operator's terminals sharing the GPU, so Phase 162 re-measures inside
the app as its first act. Event listener weight at 40,000 hit targets was not measured; the known
mitigation is one listener on the group with coordinate math, the gutter's own pattern.

## 7. THE RULING for Phase 162

**Stay hand written SVG. Zero new packages. Vendor two small pieces of finished math as ISC
extracts. Exempt the map tab from the CSS zoom region.** Concretely:

1. **The scene stays the scm graph pattern** that Phases 160 and 161 will by then have proven at
   two levels: pure layout functions, SVG DOM, tokens, colocated CSS, one coordinate space.
2. **The camera is a single `<g transform>`** written by hand, with two vendored extracts in the
   Pierre pattern, each with attribution and a NOTICE section: the zoom-toward-cursor transform
   algebra from d3-zoom (ISC, about 300 lines at most, likely far less since our event model
   replaces theirs) and the van Wijk and Nuij fly-to path, `interpolateZoom` from d3-interpolate
   (ISC, about 80 lines). Inertial release is about 60 lines of hand written velocity and decay.
   This is the synthesis of the two investigators' split: the extract form takes the finished math
   the assemble guardrail demands without arguing a four year dormant package past the 14 month
   rule.
3. **The map tab is exempted from `--zoom-arch`** and the panel zoom chord routes into the
   camera's scale, the Monaco and Pierre precedent. This kills the coordinate defect for any
   present or future branch.
4. **Layout stability comes from storage**, exactly as research 49 designed: positions and camera
   state persist in the disposable `arch.db`, existing nodes keep stored positions, re-layout is
   an explicit act. No layout engine enters the bundle; at 5 to 9 and at 30 boxes the hand
   ordering plus the levelization sort is the layout.
5. **The weight devices in section 5.1 that need no camera** (elevation ladder, cushion, chamfer,
   line weight grammar, poche, hatching) are within Phase 160 and 161's existing charters, whose
   entries already say weight is information and styled by provenance, and may be adopted there
   without amendment. The camera earned devices (inertia, fly-to, staged transitions, gesture
   gated dimming) are Phase 162's.

**The reason.** The measured evidence removed every argument for a package: plain SVG under a
moving camera holds vsync at every scale the product can emit including the 40,000 mark matrix,
the one named integration risk (the CSS transform viewport inside zoom regions) is real and
measured against the leading library, and the null option is the only candidate that is immune to
it, fully deterministic, and able to express every weight device in one coordinate space. The
prior art says the differentiators are a capped box count, frozen geography and altitude
discipline, none of which any library provides.

**The cost.** Roughly 300 to 450 lines of camera code we then own (gesture normalization, inertia,
the two vendored functions), the re-measurement inside Electron as the phase's first act, and the
loss of React Flow's free drag and selection, which the phase must build by hand as ordinary
pointer events on SVG nodes.

**What would change the answer.** Any of these, written down in the phase's commit body: the in
app re-measurement missing vsync at scale A or B on the operator's machine; the hand written
gesture layer exceeding roughly triple the estimate above in practice; or a future requirement for
free form multi select and group drag at a scale where hand written hit testing measurably fails.
The named fallback in every such case is @xyflow/react 12.11.5 plus @dagrejs/dagre 3.1.1 under the
zoom exemption, which this research keeps admitted and priced at about 97 KB gzip.

**The backlog revisions, exactly.** In the Phase 162 entry:

- The line **"The CSS zoom spike SURVIVES as an engineering precondition, run first and written
  down before any canvas code exists. The priced fallback if it fails is hand written SVG in the
  `scm/graph/` pattern, which Phases 160 and 161 will by then have proven at two levels."**
  is replaced by: the spike was run 2026-08-27 in research 68 section 6.3 outside Electron and
  answered, being exempt the map tab from `--zoom-arch` and route the zoom chord into the camera;
  what remains for the phase is the re-measurement inside Electron 43 as its first act. The
  fallback clause inverts: hand written SVG is the primary and @xyflow/react plus dagre is the
  priced fallback.
- The line **"The two-package admission survives as a QUESTION, not a decision."** and its
  paragraph are replaced by: the question is answered by research 68, being ZERO new packages,
  with two vendored ISC extracts (the d3-zoom transform algebra and interpolateZoom) entering as
  vendored code with NOTICE sections, and the commit body carries the in app measurement that
  confirms or overturns it.
- The "What it builds" paragraph gains: camera state persisted beside layout in arch.db, the
  Figma key set with F per Perfetto, inertial release, the fly-to on drill and F, and
  `prefers-reduced-motion` cutting every transition to its end state.

Phase 160 and Phase 161 need no charter change. The section 5.1 static devices sit inside their
existing weight and provenance language, and the levelized edge direction is a layout choice
inside Phase 160's item 1.

## 8. What is deliberately NOT recommended, so a later round does not relitigate

- **No rendering library in the bundle this round.** @xyflow/react is demoted from research 49's
  admitted canvas package to priced fallback, on three grounds measured or read today: the drag
  defect inside CSS zoom regions with no `currentCSSZoom` handling upstream, the permanent
  duplicate zustand 4 beside the app's 5, and the two coordinate space drawing that fights every
  single space weight device. diagram-js stays second fallback.
- **No layout engine.** dagre stays admitted in principle and enters nothing, because 5 to 9 and
  30 box levels with persisted positions do not need Sugiyama. elkjs stays rejected on the
  standing license decision, now with a second independent reason at 439.6 KB gzip measured.
  @msagl/core moves from watch to reject: the incremental mode survived the port but the position
  pinning did not, and it is the wrong layout family.
- **No d3-zoom as a package dependency.** Its math is taken as a vendored extract instead, so the
  14 month dormancy rule is not argued around.
- **No WebGL and no `<canvas>`**, priced in section 5.3. The measured numbers removed its last
  argument at every scale the product can emit.
- **No true 3d and no isometric projection as the default view.** CodeCity's own record: the
  weight produced the comprehension gain, the axis produced the occlusion, the dishonest scales
  and the navigation tax. The chamfer plus the elevation ladder capture the useful fraction at
  about one percent of the cost.
- **No parallax, no glows, no occlusion as encoding, no per cell decoration at the matrix.**
  Parallax manufactures depth that encodes nothing on a drawing meant to be trusted; a glow in one
  dark theme reads as state and state color is spent, with the needs input pulse staying the
  loudest thing in the app; overlap that hides content trades faithfulness for drama; matrix
  decoration is a measured frame killer.
- **No continuous semantic zoom.** The levels stay discrete and named per research 49 section
  5.12; the fly-to path is what makes the discrete step feel continuous without being it.
- **No count badges on nodes.** The dashboard refusal survives; weight is size, luminance, texture
  and line weight, never a number pinned to a box.
- **No force directed layout anywhere on this surface**, even seeded. CodeSee's differently drawn
  map on different days is the graveyard's clearest lesson: spatial memory forms only over frozen
  geography.

## 9. What this round could not verify

- Every frame number ran in Playwright's Chromium 151 on an idle machine, not inside Electron 43's
  Chromium 150 with the live app's compositor load. Phase 162's first act re-measures in the app.
- Crispness during an in flight zoom animation, at rest only was measured.
- Event listener weight at 40,000 per cell hit targets; the group listener mitigation is known but
  unmeasured.
- diagram-js was priced at its bare core; real usage pulls feature modules above 11.5 KB.
- The staged transition literature (Heer and Robertson) is about statistical charts; no controlled
  study of drill transitions on architecture maps exists, and the object constancy rule is design
  doctrine with strong precedent, not a measured claim on this surface.
- Apple's 0.998 deceleration constant comes from reverse engineering write ups; the feel needs
  hand tuning regardless.
- First party postmortems for CodeSee and the GitHub Next experiment; both are inferred from
  acquisition coverage and absence, and labeled so in section 4's sourcing.
- dagre's determinism across JavaScript engines; random free by grep and insertion ordered by JS
  semantics, but no cross engine byte comparison was run, and only Electron's V8 draws this.

Scratch artifacts, deletable after reading: the benchmark pages and installed candidate tree under
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/r67/`,
and one screenshot at `/Users/gdc/gmux/.playwright-mcp/r67-crisp-2x.png`.

## 10. Sources

Registry facts read via npm on 2026-08-27 for every version named in section 3. Library and
constraint sources: [xyflow issue 4647](https://github.com/xyflow/xyflow/issues/4647),
[React Flow viewport docs](https://reactflow.dev/learn/concepts/the-viewport),
[Linkurious library roundup](https://linkurious.com/blog/top-javascript-graph-libraries/),
[FusionCharts 2026 guide](https://www.fusioncharts.com/blog/best-javascript-charting-libraries-data-visualization-2/).
Prior art: [Sourcetrail repo](https://github.com/coatisoftware/sourcetrail) and
[EOL issue 1214](https://github.com/CoatiSoftware/Sourcetrail/issues/1214),
[HN discontinuation thread](https://news.ycombinator.com/item?id=28637193),
[CodeSee PitchBook](https://pitchbook.com/profiles/company/458764-48),
[CodeScene docs](https://docs.enterprise.codescene.io),
[Sonar acquires Structure101](https://www.bankinfosecurity.com/sonar-adds-code-architecture-insights-structure101-buy-a-26538),
[NDepend DSM docs](https://www.ndepend.com/docs/dependency-structure-matrix-dsm),
[IntelliJ module diagrams](https://www.jetbrains.com/help/idea/project-module-dependencies-diagram.html),
[GitHub Next repo visualization](https://githubnext.com/projects/repo-visualization/),
[anvaka map-of-github](https://github.com/anvaka/map-of-github),
[Gource](https://github.com/acaudwell/Gource),
[CodeCity controlled experiment](https://wettel.github.io/download/Wettel11a-icse.pdf),
[emerge](https://github.com/glato/emerge),
[cushion treemaps, van Wijk and van de Wetering 1999](https://vanwijk.win.tue.nl/ctm.pdf),
[WinDirStat](https://github.com/windirstat/windirstat),
[webpack-bundle-analyzer FoamTree licensing issue](https://github.com/webpack-contrib/webpack-bundle-analyzer/issues/5).
Weight and feel:
[Material dark theme elevation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md),
[ISO 128-2 line widths](https://cdn.standards.iteh.ai/samples/69129/38e651842df746fd990d29679e3c2e98/ISO-128-2-2020.pdf),
[poche](https://mgerwingarch.com/m-gerwing/2010/12/27/40),
[Heer and Robertson 2007](http://vis.stanford.edu/papers/animated-transitions),
[Bostock, object constancy](https://bost.ocks.org/mike/constancy/),
[UIScrollView deceleration](https://medium.com/@esskeetit/how-uiscrollview-works-e418adc47060),
[Figma zoom conventions](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options),
[SVG filter performance guidance](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters).
