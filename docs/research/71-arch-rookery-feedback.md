# Research 71. Why the Architecture pass on rookery looks broken, and the four things that are actually wrong

**Status.** Investigation only, from the operator's real 0.88.0 dev run on `/Users/gdc/rookery` on 2026-08-30. It schedules nothing. It names four candidate phases and ranks them, and the operator picks. Every claim below was read from the checkout or measured on disk, read only. No Electron was launched, the operator's live dev app was not touched, and the gmux tmux socket was read only.

**Method.** Four investigators ran in parallel, all read only: one on the component schema and why every part draws two red validation lines, one on the promise resolver and why the contract landed with zero promises, one on the surface and how the four faces the person sees disagree with each other, and one on the map and why clicking a box does not drill in. The last two wrote their own detectors: the promise investigator wrote an independent import scanner faithful to the real resolver's rules and ran it over rookery's tracked tree, and the drill investigator reproduced the exact click path in headless Chromium. This document is the synthesis. Where an investigator corrected the recon that briefed them, the correction is stated.

**Marks.** A claim marked **measured** was computed on this machine on 2026-08-30 over rookery's files or in headless Chromium, never inside Tortie's Electron. A claim marked **read** was read from the `/Users/gdc/gmux` checkout. No file in either repository was changed.

---

## 1. The two symptoms, in his words

From the 0.88.0 dev run on rookery on 2026-08-30:

1. The enrichment pass with claude sonnet was kept, painted 9 of 9 parts, cost 0.037, and produced zero promises. The suggested regroupings text read: "No imports were resolved between any drafted parts, so this contract has zero promises where a healthy one needs five to ten." The strip read "47 of 382 imports could not be resolved" and "9 checked and holds, 0 broke, 0 not checkable."
2. Every component drew two validation lines a person sees: "component has fields this build ignores: summary, notes. Tortie reads schema version 1" and "component.kind must be one of component, store, process, external-service, platform."

And a third thing he found by hand, which recon did not name: clicking the boxes on the map does not drill in.

There are four distinct defects underneath these symptoms. Two are real product bugs. One is honest math surfaced dishonestly. One is known deferred debt showing up on a real repository for the first time. They are independent, and the operator can queue them in any order.

---

## 2. The schema drift, and the correction recon needed

### 2.1 Recon was wrong about who wrote the bad files

Recon said the model rewrote components with `summary` and `notes` and no `kind`, and cited `/Users/gdc/rookery/docs/arch/components/acp-facade.json` as proof. That is wrong, and the correction matters because it moves the fix from the prompt to the load path.

The `components/` directory in rookery holds two distinct sets of files, separable by modification time and by shape (**measured** on disk):

- **Set A, 17 files, mtime Aug 26**, four days before the run. These are the operator's own hand authored files in a foreign schema: `id`, `name`, `layer`, `provenance`, `anchors`, `summary`, `notes`, and no `kind`. `acp-facade.json` carries `"provenance": "written-here"` and `"layer": "server-edge"`, and neither value is legal in Tortie's schema. The 17 are acp-facade, agent-runtime-process, android-client, app-database, capability-workspace, cli-client, environment-repository-db, environments-domain, iphone-client, launcher, location-domain, mac-client, ptiles-poi-service, rookkit, runtime-orchestrator, server-bootstrap, sessions-domain.
- **Set B, 9 files plus `contract.json` and `edges.json`, mtime Aug 30**, the run itself. Every one is fully valid: `kind: "component"`, `provenance: "first-party"`, a `layer` that matches `contract.json`'s bands, plus `boundary`, `description`, `evidence`, `deprecated`, `gaps`. These are the 9 of 9 painted. They carry `description`, not `summary`, so they cannot be the source of the two red lines.

The two exact message strings in symptom 2 can only be produced by a file that has `summary`/`notes` and lacks a valid `kind`. That is Set A alone. "Every component" in his words means every one of the 17 foreign files, listed in the problem strip, not the painted boxes.

### 2.2 Why one foreign file yields exactly two lines

In `validateComponent` (`/Users/gdc/gmux/src/main/arch/validate.ts:263`, **read**) two checks run in order:

- Line 270 calls `noteUnknown`, which compares the object's keys against the eleven allowed keys in `ARCH_ROW_KEYS.component` (`/Users/gdc/gmux/src/shared/arch.ts:438`). `summary` and `notes` are not among them, so it pushes a problem and does not throw. The message text is at lines 106 to 110.
- Line 272 calls `enumField(obj['kind'], 'component.kind', ARCH_COMPONENT_KINDS)` (`/Users/gdc/gmux/src/main/arch/schema.ts:239`), which throws when `kind` is missing, caught at line 317 and turned into the second problem.

So each foreign file produces exactly two problems and returns `value: null`. In `/Users/gdc/gmux/src/main/arch/load.ts` the component loop keeps both problems (line 130) and then drops the file from the map (line 131, `if (row === null) continue`). The foreign file is not drawn as a box, but its two lines still surface. Seventeen files times two problems is 34 near identical red rows in the "Would not load" section. The person did not see two lines. They saw a wall of about three dozen.

### 2.3 The enrichment path cannot have written these files, and here is the proof

The prompt gap recon suspected is real but did not cause this. `ARCH_ENRICH_SYSTEM_PROMPT` in `/Users/gdc/gmux/src/main/arch/enrich/compose.ts` (lines 42 to 56, **read**) never lists the allowed component fields, never gives the `kind` enum, and never says "add no fields." It says "Keep every component id and every anchor" (line 46) and "Never change a component's kind" (line 47). The schema reaches the model only implicitly, by `assemble` serializing each drafted component as JSON.

But that gap did not put bad bytes on disk, because the answer validator enforces the schema strictly. `/Users/gdc/gmux/src/main/arch/enrich/validate.ts` (**read**) runs the same load side `validateComponent` on every component in the model's answer and refuses the whole answer on any problem, an unknown key included. Its own header says so: "An unknown key, tolerated on read, is a refusal here." Rule 5, `kind-changed`, additionally pins each kind to the draft's. A model answer that added `summary`/`notes` or dropped `kind` would be refused whole, the writer never reached, the previous files left byte identical. This is the proof, independent of the mtimes, that Set A is not enrichment output.

The writer confirms it from the other side. `writeArchFiles` in `/Users/gdc/gmux/src/main/arch/enrich/write.ts` (**read**) writes only the plan's files: `contract.json`, `edges.json`, and one `components/<id>.json` per answer component. It never clears the directory. So Tortie's 9 fresh files landed beside the operator's 17 stale foreign files, and `load.ts` reads all 26 with a plain `readdir().filter(endsWith('.json'))`. The noise is a load time collision, not a write time or model time defect.

### 2.4 The fix

The fix belongs on the load side, not the prompt. When a file in `components/` is not a Tortie schema version 1 component (a foreign shape with no valid `kind`), it should surface as a single quiet line saying the file is not a Tortie component, not as both an unknown fields note and a `kind` enum failure. The refusal from the Phase 23 overlay rules must survive: an invalid row is still dropped whole with the field named, so the fold is of presentation, not of the drop. The open product question the code cannot answer: does the operator intend those 17 hand authored files to become Tortie's corpus, in which case the real ask is a converter from the `summary`/`notes` shape, or are they throwaway that Tortie should ignore or ask him to move aside.

---

## 3. The zero promises, and why it is honest math surfaced dishonestly

### 3.1 The independent count

The promise investigator wrote its own TypeScript import scanner faithful to the real resolver in `/Users/gdc/gmux/src/main/arch/resolver/index.ts` (the suffix and output to source tables at lines 120 to 155, relative only first party resolution at lines 246 to 253, **read**), and ran it read only over rookery's tracked tree (`git ls-files`, 526 files). Results (**measured**):

- Files the resolver can parse: 106.
- Total import specifiers: 378, which confirms the run's reported 382 within counting method noise.
- Relative imports: 217, and all 217 resolved to a tracked file. Zero relative imports were unresolved.
- Bare imports: 161, of which 158 are declared deps or node builtins and 3 are undeclared.

### 3.2 The decisive result: the drafted parts are too coarse to have a crossing

Every one of the 217 resolved first party edges was mapped onto the drafted parts (**measured**):

- Over the 9 drafted parts that actually shipped: 0 crossing edges. All 217 imports are inside one part. The `server` component (`/Users/gdc/rookery/docs/arch/components/server.json`, `anchors: ["server"]`) owns every one of the 98 server `.ts` files, so every server import is `server` to `server`, which the checker skips as `from === to` (`/Users/gdc/gmux/src/main/arch/checkers/imports.ts:113`, **read**). This is exactly the observed "No imports were resolved between any drafted parts."
- Over the finer decomposition the model itself invented: 105 crossing edges between distinct parts, for example environments-domain to server-bootstrap (15), ptiles-poi-service to location-domain (9), acp-facade to runtime-orchestrator (6), runtime-orchestrator to agent-runtime-process (5). A rich, healthy promise graph exists inside `server/`.

The skeleton draws one part per top level directory, capped at 9 (`SKELETON_TARGET` in `/Users/gdc/gmux/src/main/arch/skeleton.ts`, **read**). Rookery's top level yields exactly nine, and one of them, `server`, swallows the entire backend into a single box. The enrichment "imports between parts" facts block is computed once, over that coarse skeleton (`factsBlock` and `ownerOf` in `/Users/gdc/gmux/src/main/arch/enrich/compose.ts` lines 117 to 199, **read**), so every server import is `from === to` and the block prints "none resolved" followed immediately by "a healthy contract starts with 5 to 10 promises." The model is told in the same breath that nothing crosses any boundary and that it should produce five to ten promises. It split `server` into finer parts but was never handed the 105 crossings those finer parts have, so it drew zero edges. `edges.json` is `{"edges": []}`.

### 3.3 The clients cannot carry an import edge at all

The clients are 133 Swift and Kotlin files the resolver's grammar table cannot read (`/Users/gdc/gmux/src/main/symbols/languages.ts:52`, **read**, no `.swift`, `.kt`, `.m`, `.h`). They produce zero import facts. The one readable client, `clients/cli`, talks to the server over the network, not by import. So no import can ever connect `server` to `iphone-client`, `mac-client`, `android-client` or `rookkit`. The boundary a person cares about there is a network and language boundary, which is structurally not an import promise.

### 3.4 Verdict: correct as computed, not a resolver bug

The resolver is working perfectly. 217 of 217 relative imports resolved, first party edges identified correctly, unreadable clients correctly contributing nothing. Given the nine coarse parts, there genuinely is no import that crosses a boundary, so zero import based promises is the honest answer for that part set. The zero is an artifact of granularity plus language, not a miss. Two things make it read as failure:

1. The skeleton collapses the whole readable backend into one part, and enrichment computes crossings only over that skeleton, so any repo whose first party code sits under one top level directory will always be told "none resolved."
2. The clients, where a boundary a person cares about actually lives, are in languages the resolver cannot read.

The strip's "47 of 382 imports could not be resolved" is the bare specifiers, and a bare specifier resolves to external or unresolved and can never be a crossing. The gap between 47 and the independent count of 3 undeclared bare imports is a manifest reading question (whether `isDeclared` in `/Users/gdc/gmux/src/main/arch/resolver/manifest.ts` picks up `server/package.json`), and it does not touch the crossing count, which comes only from the 217 relative edges.

---

## 4. The drill down finding: clicking a box does not drill, and it is not the slop

This is the finding recon did not have, and the drill investigator proved it in headless Chromium against the exact handler shapes, correcting the natural first guess.

### 4.1 It is pointer capture eating the click

`/Users/gdc/gmux/src/renderer/arch/map/camera/gestures.ts:201` (**read**), inside `onPointerDown`, calls `el.setPointerCapture(e.pointerId)` on every primary button press, not only on hand or pan presses. Pointer capture retargets the compatibility `click` event to the capturing `<svg>`, so the click's target is the svg, not the box `<g>`. React dispatches the box's `onClick` by walking the fiber path from the event target, the svg is an ancestor of the box rather than on the path into it, so the box's `onClick` never runs. The drill never fires. There is no `releasePointerCapture` in the file, and implicit release after pointerup is too late to un retarget the click.

Proved in Chromium with two fixtures that mirror the real handlers (**measured**):

- With `setPointerCapture` on the svg at pointerdown (the shipped code): pointerdown target rect, pointerup target svg, click target svg, and the box `onClick` did not fire.
- Identical fixture without the capture: pointerup target rect, click target rect, box `onClick` fired.

This is the default path, not an edge case. `/Users/gdc/gmux/src/renderer/arch/ArchMapTab.tsx:155` builds the canvas seam unconditionally, so `useCamera` always attaches the gesture layer, so every press captures, so every box is dead to the mouse in the operator's dev run. The one trigger that still works is the Enter key on a focused box. Space is swallowed one layer up by the hand tool's capture phase keydown handler (`gestures.ts:249`, which even notes "Enter still opens; the brief states the trade"). That matches "clicking the boxes does not seem to drill in" exactly.

### 4.2 The slop threshold, measured, and it is not the culprit

`CAMERA_DRAG_SLOP = 4` screen pixels (`/Users/gdc/gmux/src/renderer/arch/map/geometry.ts:344`, **read**). The distance is `Math.hypot` over raw client coordinates and the viewBox is 1 unit to 1 screen pixel, so 4 means 4 real CSS pixels of travel. That is a forgiving, house standard threshold, and a static click stayed a click in the repro (`wasPan=false`, no suppression). The micro pan hypothesis is wrong. Correct it to the pointer capture finding above.

### 4.3 Is level 2 empty on rookery parts, measured

Almost never literally empty, but often degenerate. Simulating `groupTree` and `partModules` over rookery's real 526 tracked files (**measured**): level 1 yields 12 computed directory groups. Five of them drill meaningfully (`.agents` 11 files to 5 modules, `CHANGES` 128 to 29, `clients` 221 to 5, `scripts` 16 to 4, `server` 114 to 11). Seven of the twelve subdivide into exactly one module that mirrors the part itself (`.claude`, `.github`, `.zed`, `dev-tools`, `AS-BUILT-ARCHITECTURE`, `PRODUCT`, `assets`). The literal empty state fires only when a group's files are all at the repo root, which cannot happen for a computed directory group, so it never triggers here. But the single module case means that for 7 of 12 parts, even a working click lands on one box labeled the same as the box you clicked. So the drill is doubly disappointing on rookery: the mouse is swallowed for all 12, and 7 of 12 would show a near identical single box even if it were not. This is language agnostic, because subdivision is by directory, so Swift and Kotlin parts subdivide fine when they have interior directories.

### 4.4 Is the three level cap right, and the one line fix

The cap is fine and is not the problem. The ladder is fixed at three in `/Users/gdc/gmux/src/renderer/arch/store.ts` (the `ArchDrill` union, **read**): whole map, one part as directory modules, one module as a file view. Making it deeper is a real feature, roughly a full phase, because `ArchDrill` would become a path stack and the crumbs, the staging and the part scoping would all follow. Defer it. The mouse is the bug.

The one line fix: capture only for hand or pan presses. Guard `gestures.ts:201` as `if (hand) el.setPointerCapture(e.pointerId)`, and set capture lazily the first time a plain press crosses the 4px slop into a pan. A plain click then never captures and reaches the box, and a real drag captures at 4px and keeps receiving pointer events. Separately, the boxes barely look clickable: the pointer cursor shows (`map.css:163`) but there is no hover lift (`map.css:176` deliberately changes only the stroke), and "Click to look inside" is buried at the tail of a long SVG title. A light hover lift and hoisting that phrase earlier would help, but they are polish, not the bug.

---

## 5. The person's experience, and what a good outcome says

A rookery person who pressed "Fill in the contract" is shown four faces at once, and they do not agree (all **read** from `/Users/gdc/gmux/src/renderer/arch/ArchView.tsx`):

1. The run face leads with a happy kept sentence, "written at HH:MM," and "Painted 9 of 9 parts on the map."
2. The verdict strip, aria labelled "Promises by coverage," reads "9 checked and holds, 0 broke, 0 not checkable," and below it "47 of 382 imports could not be resolved."
3. The suggested regroupings block renders the model's own sentence verbatim: "No imports were resolved... zero promises where a healthy one needs five to ten."
4. The "Would not load" section lists 34 near identical red rows from the 17 foreign files.

So the run face says written and painted while a third of the contract on disk cannot be read, and the strip says nine promises hold while the model right above it says zero promises. Both numbers in the strip are true in their own vocabulary but the surface hides the difference: "9 checked and holds" is not 9 promises, it is 9 evidence quote checks that still match at HEAD (`/Users/gdc/gmux/src/main/arch/checkers/evidence.ts:140`, **read**, subject id `component:<id>#<index>`), and with zero edges there are no promise verdicts at all. A contract with zero promises and nine surviving quotes should not read as a healthy nine hold contract.

The honest sentence a rookery person needs already exists, in the wrong place. `unparsedSentence` in `/Users/gdc/gmux/src/renderer/arch/modules.ts:126` (**read**) says "Tortie does not read imports for every file here: 1276 swift, 43 kt, 166 c. Nothing above claims anything about those." But it is rendered only by the level 2 module view, which a person reaches only after drilling into a part, and drilling is exactly what is broken. The whole repo resting face never says the map is thin because most of the repo is Swift, Kotlin, ObjC and C. The one place the truth is stated whole repo is stranded behind promises that do not exist, because the language reason line is attached only to a promise verdict (`/Users/gdc/gmux/src/main/arch/checkers/imports.ts:124`, **read**) and there are no promise verdicts.

A good outcome reads as honest but thin, and says so in one line rather than making the person infer it from a wall of red. The whole repo face carries the unparsed sentence. The 34 "Would not load" rows collapse to one summary line ("17 parts could not be read: they are missing kind") with the per file detail behind a disclosure, per the "just enough words" rule. The strip does not label evidence quote checks as promises when there are zero edges. And a kept run that produced an unreadable contract does not lead with a plain kept sentence.

This is the same class of not good yet that Phase 175 already contains by putting the whole feature behind a setting, default off, until it is good. Phase 175 keeps this face out of a person's way. It does not make the face honest. The fixes below are what would let Architecture be turned on for a real Swift and Kotlin repository without reading as broken.

---

## 6. A ranked list of fixes, each a candidate phase

Ranked by how much each one moves a real person's experience on a real repository. The operator picks and queues. Nothing is queued here.

### The real product bugs

**Fix 1. The map drill, one line plus polish. Small.** Guard the pointer capture at `/Users/gdc/gmux/src/renderer/arch/map/camera/gestures.ts:201` so a plain click reaches the box, and set capture lazily when a press crosses the 4px slop into a pan. Optionally add a light hover lift in `/Users/gdc/gmux/src/renderer/arch/map/map.css` and hoist "Click to look inside" earlier in the SVG title. This is the single highest yield fix: right now the map is unusable by mouse for every box on every repo, not just rookery. Verification is a headless Chromium click path over the real handler shape, which is the method that found it.

**Fix 2. The foreign component collision, load side. Small to medium.** In `/Users/gdc/gmux/src/main/arch/load.ts` and `/Users/gdc/gmux/src/main/arch/validate.ts`, when a `components/` file is not a Tortie schema version 1 component, surface one quiet "not a Tortie component" line instead of the unknown fields note plus the `kind` enum throw, keeping the whole row drop and the named field. This removes 34 of the red rows a rookery person sees. It needs a product decision first: ignore foreign files, or offer a converter from the `summary`/`notes` shape, or tell the person to move them aside. Touches the arch validate substrate, so it carries `npm run conformance:arch` and the Phase 23 "drop whole, name the field" refusal must survive.

**Fix 3. The honest zero promise surface. Medium.** In `/Users/gdc/gmux/src/renderer/arch/ArchView.tsx`, lift a whole repo variant of `unparsedSentence` onto the resting face so the person reads why the map is thin, separate or suppress "9 checked and holds" when there are zero edges so evidence quotes do not read as promises, fold the "Would not load" wall to one summary line with detail behind a disclosure, and stop a kept run that produced unreadable rows from leading with a plain written sentence. This is the fix that turns a broken looking map into an honest thin one. Rendered surface with no new durable state, so Tier 2, one app run plus one independent method.

**Fix 4. Recompute crossings over the model's finer decomposition. Medium.** In `/Users/gdc/gmux/src/main/arch/enrich/compose.ts`, compute the "imports between parts" facts over the decomposition the model produces rather than only over the coarse skeleton. The finer decomposition demonstrably carries 105 cross part edges (**measured**), which would support the five to ten promises the prompt already asks for, and would make `server` heavy repositories draw a real promise graph. This is the deepest of the product fixes and the one most likely to grow, so scope it tightly or defer it behind Fix 3.

### The known deferred debt

**Fix 5. Arm the resolver for Swift, Kotlin and ObjC. Large, deferred.** The resolver reads six languages (`/Users/gdc/gmux/src/main/arch/resolver/index.ts:103`, **read**, ts, js, go, rust, python, ruby) and has no grammar for `.swift`, `.kt`, `.m`, `.h` (`/Users/gdc/gmux/src/main/symbols/languages.ts:49`, **read**). On rookery that leaves about 1,700 client files invisible and every client to server boundary uncrossable by import. This is the recorded Swift quiet face debt, now with a concrete real repository behind it. It is a genuine multi language grammar and import resolution effort, not a surface fix, and Fix 3 is what makes its absence honest in the meantime. Defer, and let Fix 3 carry the repository until this is earned.

The order of most value for least work is Fix 1, then Fix 2, then Fix 3, with Fix 4 and Fix 5 deferred. Fixes 1, 2 and 3 together turn this run from "looks broken" into "honest and thin," and none of them touches the resolver.

---

## 7. What could not be determined from files alone

- Whether the operator intends the 17 hand authored foreign files to become Tortie's corpus (converter) or to be thrown away (ignore). A product decision, not visible in code.
- The exact rendering surface that attaches each `problems[]` row, confirmed only that the two message strings belong to the 17 foreign files.
- The provenance of the 0.037 cost figure. No Architecture surface draws it (`passDetail` returns null for a kept run), so it was read from logs or the Runs pane.
- The live app was not driven, per the standing rule that the operator was running Tortie in dev. The drill proof is a faithful Chromium reproduction of the exact handler shape, and Electron uses the same Chromium, so the behavior holds, but it is named as a reproduction rather than an in app capture. The Playwright MCP left three snapshot `.yml` files under `/Users/gdc/gmux/.playwright-mcp/`, which the committer can prune.
