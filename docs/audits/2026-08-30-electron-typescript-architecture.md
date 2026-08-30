# Tortie Electron and TypeScript architecture reassessment

Date: 2026-08-30

Status: Fresh read-only architecture audit after the Architecture feature and performance round. This is a rescore of the current tree, not a progress claim derived from phase checklists.

Assessed source: commit `45868373890f635e783cfb12d5db168a1ceeaf9f` on `main`, version 0.85.4. The comparison point is the last independent rescore, commit `1b04801` at version 0.72.4 on 24 August. The working tree contained unrelated operator-owned artifacts and documents; none was modified by this audit.

## Outcome

The current architecture score is **32 out of 36**.

That is a strong architecture, not a 32/36 quality percentage. Eight of twelve categories still meet the strict score-3 bar. The four withheld points are specific:

1. Failure flow remains at 2 because the last authoritative remote fault matrix was red on transport-loss and clock-skew rows and has not been adjudicated or rerun green.
2. Test seam falls to 2 because one supposedly hermetic test reaches the live process table and the current renderer paint probe no longer observes its target.
3. Navigation falls to 2 because the new Architecture domain has a clean outside boundary but now routes several independently changing workflows through three large internal funnels.
4. Build boundary falls to 2 because the deterministic IPC contract inventory is stale—213 current invoke channels versus a committed baseline of 197—and its check is not in the ordinary typecheck or build path.

The score is down from 35/36 at `1b04801`, but the product did not lose three architectural capabilities. The rubric requires each category to be explicit, narrow and protected. Growth created two local maintainability exceptions and exposed one governance gap, so the strict score moves until those protections catch up.

There is real sprawl, but it is localized. The new Architecture capability has good process boundaries, typed contracts, lazy loading, one main registrar, explicit disposal, a disposable database and strong conformance attacks. Inside that boundary, the renderer view/store and main coordinator have grown into navigation hubs. The right response is an internal seam pass with unchanged facades, not a rewrite or new framework.

## Growth since the last independent score

From `1b04801` to current HEAD:

- 86 commits landed;
- 490 source, build and package files changed;
- those files gained 91,047 lines and lost 1,268;
- `src/` alone gained 69,572 lines and lost 1,129;
- production TypeScript/TSX now spans 1,056 files and approximately 306,655 lines;
- test files increased from 578 at the last rescore to 673;
- `src/main/arch/` and `src/renderer/arch/` alone contain 76 production files and 25,473 lines, excluding their shared contracts and tests.

Line count is context, not the finding. The important result is that production runtime imports remain acyclic and the new domain has not leaked across forbidden durability boundaries. The sprawl judgment comes from the number of distinct workflows that must be understood together inside a few files.

## Current source map

```text
main/index.ts
  -> capabilities.ts                   composition and ordered disposal
       -> sessions/, machines/, git/   established runtime owners
       -> diagnostics/                 on-demand performance evidence
       -> arch/ipc.ts                  the one Architecture registrar
            -> load/check/watch        contract and freshness loop
            -> scan/resolver/map       computed codebase model
            -> db.ts                   disposable fact/canvas store
            -> enrich/                 seed, pass and repair writes

preload/
  -> one context-isolated gmux bridge
       -> typed arch:* invoke/event surface

renderer/main.tsx
  -> app/App.tsx                       shell composition
       -> lazy Architecture boundary
            -> arch/ArchView.tsx       view and feature composition
                 -> arch/store.ts      one renderer state facade
                 -> arch/map/*         map, camera and layout owners

shared/
  -> ipc/arch*.ts                      request/result/event contracts
  -> arch*.ts                          domain truth without platform access
```

The important arrows remain one way. Shared and renderer layers do not gain Electron or Node authority. `src/main/arch/` is held behind a directory wall that forbids imports from manifest, restore and context. Expensive Architecture work is lazy: registration does not open its database, start workers or spawn git; the first Architecture request owns that activation.

## Architecture feature: factored outside, concentrated inside

The new domain deserves both halves of that description.

### What is clean

- Shared Arch contracts are typed and separated from main implementations.
- A single production caller, `capabilities.ts`, installs the main registrar.
- The registrar uses the same typed handler, sender-trust and monotonic quit admission used by the other 213 invoke channels.
- Its directory cannot import the manifest, restore or agent-context durability owners.
- Git arguments are compiled through fixed helpers rather than composed from contract content.
- Agent enrichment rechecks the person's confirmation at spawn and uses the existing guarded process owner.
- Seed, enrichment and accepted divergence writes go through one writer; generated content cannot accept its own violation.
- Watches, the symbol pool and the disposable database have an awaited disposer in the main capability shutdown.
- The renderer surface is lazy and stays behind the one preload bridge.
- Architecture conformance runs against small, medium, huge, Swift and removed-file fixtures and proves caps and no-spawn paths.

These facts are why process ownership, IPC capability, domain cohesion, state ownership and lifecycle remain 3.

### Where sprawl appeared

| File | Lines | Why it is more than a size observation |
| --- | ---: | --- |
| `src/renderer/arch/ArchView.tsx` | 1,669 | Owns top-level orchestration plus drill crumbs, map section, computed outline, pass face, divergence acceptance, freshness/repair ribbons, verdict strips, failure lists, prose and aim controls. These faces change for different product reasons. |
| `src/renderer/arch/store.ts` | 1,359 | One Zustand owner is correct, but its action surface combines document loading, checks, map reads, drill state, canvas persistence, pass events, repair state and scoped refresh coordination. |
| `src/main/arch/ipc.ts` | 1,266 | The one registrar also coordinates last-valid documents, checking, progress throttling, fact gathering, maps, modules, seed/enrichment, repair triggers and disposal. Registration and workflow policy now change together. |
| `src/main/arch/db.ts` | 1,150 | Large, but currently cohesive around one disposable SQLite owner. It is evidence to watch, not by itself a split recommendation. |

The Architecture domain is therefore not scattered across the application. It is a successful domain boundary whose internal editorial seams are overdue.

## Important path traces

### Architecture read and check

The lazy renderer asks the installed bridge for `arch:load` or `arch:check`. The preload invokes the declared shared channel. The one typed main wrapper applies sender trust and quit admission, then `arch/ipc.ts` loads the contract and current database facts. A check gathers the fact base, runs pure checkers, stores verdicts, publishes checked/map events and optionally hands eligible drift to the one confirmed pass runner. Invalid or half-written contract content keeps the last valid in-memory document visible with an explicit failure instead of blanking the view.

### Architecture canvas persistence

The renderer store updates camera state immediately and debounces the disposable database write for 400 ms. Canvas channels reach only the Arch store and cannot reach git, the manifest or a session. Losing that write can cost one fit on next open, not durable user work; the code records that intentional lifecycle trade.

### Quit

`before-quit` makes quit intent monotonic before awaiting cleanup. The common typed invoke wrapper refuses new renderer mutations from that point. `disposeMainCapabilities()` then stops domain owners; `disposeArchIpc()` stops its watch, clears ephemeral maps, shuts down the shared symbol pool and closes its lazy database. Guarded agent children are reaped by the existing process owner. The Architecture feature did not create a second shutdown system.

### Renderer dependency direction

`renderer/main.tsx` remains the root that installs shell operations. State does not import app or editor implementation. The Architecture surface owns its map components and one state facade under `renderer/arch/`; the app reaches it through the lazy boundary. The production graph has zero runtime SCCs.

## Scorecard

Scores use the established four-level rubric:

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | 24 August | Now | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | 3 | Main-only resources, preload authority and renderer/shared restrictions remain explicit and import-gated. Diagnostics and Arch resources gained named owners rather than entry-point state. |
| Composition | 3 | 3 | `capabilities.ts` and `renderer/main.tsx` still assemble domain owners and ordered teardown. The broad Arch coordinator is below the composition root, so its navigation cost is not mislabeled as root wiring. |
| IPC capability | 3 | 3 | All current channels close across declaration, preload and main in the focused suite; one bridge, sender trust and quit admission remain central. The stale inventory is a build-governance deduction, not an IPC-closure failure. |
| Domain cohesion | 3 | 3 | Architecture has shared, main and renderer owners behind a dedicated domain boundary and directory wall. Internal concentration is real but has not dissolved ownership across unrelated domains. |
| Dependency direction | 3 | 3 | Typecheck measured 1,054 production files and 3,572 runtime edges with zero SCCs; 1,056 files and 5,945 imports produced zero boundary violations. |
| State ownership | 3 | 3 | Manifest/tmux owners remain stable; Arch has one lazy main database and one renderer store facade, with canvas loss explicitly classified as disposable. |
| Lifecycle | 3 | 3 | Quit admission is monotonic, Arch disposal is awaited and watches, workers, stores and guarded children use existing shutdown ownership. |
| Type truth | 3 | 3 | Shared/main/preload and web type worlds remain separated; the installed bridge suite requires declared members. |
| Failure flow | 2 | **2** | Durable and uncertain outcomes remain explicit, but the last authoritative remote matrix is still red on rows 1 and 5 and no current green adjudication replaces it. |
| Test seam | 3 | **2** | Pure and native coverage is extensive and the full suite is green outside the sandbox. One hermetic manifest test reads live `ps`, and the Phase 165 paint observer currently fails to locate the renderer. |
| Navigation | 3 | **2** | Existing session/machine/app seams hold, but the new Arch view, store and main coordinator combine several independently changing subjects behind their otherwise good outer facade. |
| Build boundary | 3 | **2** | Type, import, cycle, bundle, cache and probe-containment gates pass. The deterministic contract inventory is stale at 197 versus 213 invoke channels and is absent from the ordinary green gate path. |
| **Total** | **35** | **32** | **Four named exceptions; no deduction based on line count alone.** |

## Adversarial score challenge

A friendly reading would keep Navigation at 3 and publish 33/36 because the Arch feature has a directory, a facade and many leaf modules. That reading was rejected. `ArchView.tsx`, `store.ts` and `main/arch/ipc.ts` each require a reviewer to hold several change reasons at once, and all three grew during one feature arc. A score of 2 accurately says the boundary is clear with local exceptions.

A harsher reading would also lower Domain cohesion and publish 31/36. That was rejected too. The new capability does not leak its database, checks, agent write policy or state ownership into unrelated product folders; it has typed shared/preload/main/renderer boundaries and a build-enforced main directory wall. Penalizing both cohesion and navigation for the same internal funnels would obscure the architecture's strongest success.

The resulting 32 is deliberately stable: it neither scores around proof failures nor treats every large file as a defect.

## Priorities to return to 36

### P0 — restore contract-change governance: Build boundary 2 to 3

Review the sixteen current additions—Architecture and Diagnostics channels—against their shared declaration, preload exposure, main registration, sender trust and quit behaviour. The focused IPC closure suite already passes 27 tests, so this is expected to be confirmation rather than redesign.

Then deliberately rebaseline `docs/audits/contract-baseline.txt` from 197 to 213 with the channel reason in the commit, and add `node build/contract-inventory.mjs --check` to an ordinary required gate. A deterministic alarm that nobody runs is documentation, not protection.

This change is behaviour-neutral.

### P1 — add internal Arch seams without changing its facade: Navigation 2 to 3

Keep every public channel, database schema, event, renderer state shape and lazy boundary unchanged.

1. Make `main/arch/ipc.ts` primarily registration and disposal. Move the load/check/last-valid/progress workflow into a check coordinator, and the pass/repair trigger workflow into an enrichment coordinator. Inject their narrow operations into the registrar.
2. Keep `useArch` as the one renderer facade, but build it from internal document/check, map/drill/canvas and pass/repair action modules over one state type. Do not create multiple competing stores.
3. Move the independent faces in `ArchView.tsx` into subject components: contract/verdicts, map/drill, freshness/repair and pass/divergence. Leave the top component responsible for selection and layout composition only.
4. Add an Arch facade/import rule and focused tests that prove outer callers still use the same doors. Do not add a raw line-count gate.

This is a refactor with medium regression risk, not a behaviour change. Ship it in three small commits—main coordinator, renderer state, renderer view—and run Arch conformance after each.

### P1 — restore test-environment truth: Test seam 2 to 3

Inject or mock the process-descendant predicate in `manifest/__tests__/harvest.test.ts`, or move the file to the native lane if its purpose truly requires `/bin/ps`. Repair the Phase 165 CDP target selection and add a focused fixture for target discovery. Commit the Phase 167 scale scenario as a repeatable scheduled or release check.

The score returns only when the hermetic lane can run without the host process table and live performance probes fail for product budgets rather than observer drift.

### P1 — adjudicate the remote matrix: Failure flow 2 to 3

Run rows 1 and 5 against current HEAD with timestamps for the session status ladder, transport loss, resume witness and clock source. Decide which invariant is intended:

- if status truth drifted, repair it and keep the existing grader;
- if the grader asserts stillness the product no longer promises, change the expectation with a recorded state-machine ruling;
- rerun the full matrix and require a green result.

Do not award the point merely because the old failure predates recent feature work. A red Tier-3 protection remains a current exception until replaced by evidence.

## Safe implementation order

| Order | Work | Why here | Product risk |
| --- | --- | --- | --- |
| 1 | Rebaseline and require contract inventory | Restores the alarm before moving internals | Very low; contracts do not change |
| 2 | Repair hermetic and paint/scale observers | Makes later proof trustworthy | Low; test/build only |
| 3 | Split main Arch coordination behind the same registrar | Narrows one workflow at a time | Medium; conformance and IPC stay fixed |
| 4 | Factor renderer Arch store internals behind `useArch` | Preserves one state owner | Medium; state/event tests required |
| 5 | Extract Arch view subjects behind the same lazy surface | Improves navigation after state seams exist | Low to medium; visual probes required |
| 6 | Adjudicate the remote matrix | Independent, slow and behaviour-sensitive | Depends on whether product or grader is wrong |
| 7 | Rerun this rubric | Awards points from current evidence, not phase completion | Read only |

## Named exemplar comparison

VS Code remains the useful exemplar for lifecycle and navigability, not for product shape. Its lifecycle service names phases and shutdown state centrally, while Process Explorer makes resource ownership inspectable. Tortie already extracts the valuable patterns: central quit admission, ordered disposers, domain services and on-demand process evidence.

- [VS Code lifecycle service](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)
- [VS Code Process Explorer](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/processExplorer/browser/processExplorerControl.ts)

Electron's guidance reinforces the Architecture feature's lazy activation and the performance round's measurement-first approach:

- [Electron performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron application process metrics](https://www.electronjs.org/docs/latest/api/app)

Intentional divergences remain: Tortie has no extension host, its durable terminals live in tmux, its Arch database is disposable, enrichment is allowlisted and confirmation-gated, and one context-isolated bridge is preferable to a VS Code-sized service platform.

## Verification run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass: 1,056 production files, 5,945 imports, 0 boundary violations; 1,054 files, 3,572 runtime edges, 0 SCCs; shared-type gate green. |
| `npm run build` | Pass: renderer budgets and probe containment green; 163 build files, 52 reaching the single Electron-run helper. |
| `npm run conformance:arch` | Pass. |
| `npm run conformance:arch:modules` | Pass: small, medium, huge, Swift and removed-file fixtures; caps bite; no spawn. |
| IPC closure/bridge/quit suite | Pass: 4 files, 27 tests. |
| Focused performance suite | Pass: 26 files, 313 tests. |
| `npm test` outside the restricted sandbox | Pass: 672 files plus one skipped; 10,815 tests plus two skipped. |
| Contract inventory | Fail: 213 current invoke channels versus 197 committed. |
| Phase 165 live probe | Fail at renderer target discovery after app launch; no current DOM/attach distribution. |

Not run: packaged-app smoke, real remote machines, the approximately 40-minute remote fault matrix, tmux recovery battery, live manifest damage and a complete Phase 167 scale rerun. The failure-flow score therefore retains the last authoritative red matrix rather than inventing a current green result.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before all renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- explicit uncertain remote outcomes and journaled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- no Architecture access to manifest, restore or agent-context durability;
- one renderer state facade per domain, not competing stores;
- last-valid contract display on malformed or half-written files;
- lazy secondary surfaces and current eager-bundle budgets;
- no production runtime cycles;
- user behaviour and durable/public contracts unchanged during seam work.

## Bottom line

Tortie remains an unusually well-protected Electron codebase. Rapid growth did not recreate the old cross-domain cycles, lifecycle gaps or ambient type leaks. It did create a large, internally concentrated Architecture subsystem and allowed two verification contracts to drift.

The honest current score is 32/36. Requiring the contract inventory, repairing the observer lanes, making three internal Arch seams and adjudicating the existing remote matrix are sufficient to pursue 36/36. None requires a rewrite, a new process model or a change to how the app works.
