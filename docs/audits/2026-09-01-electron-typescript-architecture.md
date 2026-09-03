# Electron and TypeScript architecture audit — post-commit update

Date: 1 September 2026

Status: Fresh read-only assessment after the Phase 173, 177 to 181, 183 and 185 work. This is a new audit, not a rewrite of the 30 August evidence.

Assessed source: commit `59268ceaa2b89eda013fe7a5be6f0ea54fd39d41` on `main`, version 0.97.0. The comparison point is commit `43d637b9626b672890e93f9096a49e4fe6f8a3a8`, version 0.89.2, assessed in [the 30 August rerun](./2026-08-30-electron-typescript-architecture-rerun.md). Verification ran from a detached worktree pinned to the assessed commit. The main worktree contained unrelated operator-owned, untracked files; this audit did not modify them.

## Outcome

The current architecture score is **33 out of 36**.

The score is unchanged, but the codebase is larger and the evidence behind two deductions has changed. Nine of the twelve categories still meet the strict score-3 bar: their ownership is explicit, their interface is narrow, and a test or build gate protects the claim.

The recent commits added three client-language resolvers, feature-gated Architecture, subscription usage meters and diff-view preferences without creating another process, renderer root, state authority or runtime cycle. That is controlled growth rather than architectural sprawl.

Three categories remain at 2:

- Lifecycle: the surface open-and-close probe still retains DOM nodes across blocks. Live Diagnostics is still absent from ordered quit, and the new usage service forgets its object without cancelling or joining an in-flight keychain child or HTTPS request.
- Failure flow: Phase 173 supplied a green ten-row remote matrix adjudication, but the current machine conformance gate now fails a durable-create classifier case. The failure is caused by nominal `instanceof` identity splitting under the TypeScript probe runtime, so the protection does not currently prove the production rule.
- Test seam: the hermetic lane still executes the host SpecStory binary. Both scale and paint harnesses can also inherit an ambient renderer URL; the fresh scale run first failed to attach until that variable was removed.

This is not a 91.7% product-quality grade. It is an ordinal architecture score. The missing three points identify three protections that are locally incomplete.

## Growth since the 30 August rerun

The assessed range contains 72 commits and changes 172 files, with 18,828 insertions and 415 deletions. The production import gate now sees 1,103 TypeScript and TSX files. The production tree is about 316,522 lines, compared with about 309,788 at the previous assessment.

Most growth entered established domains through established facades.

| Work | Architectural effect | Ruling |
| --- | --- | --- |
| Phase 173 remote matrix | Reproduced the two previous red rows, added baseline settling and stronger grading, and recorded ten green rows. | The remote state model was not weakened. The current cheap machine conformance failure is separate and described below. |
| Phase 177 and 178 Architecture honesty | Made foreign files quiet and made held or unresolved results say exactly what is known. | Failure presentation improved inside the existing Architecture contract. |
| Phase 179 Architecture crossings | Added import facts between finer-grained model parts. | Reused the check, model and renderer paths. No new owner. |
| Phase 180 Swift, Kotlin and Objective-C | Added pinned grammars and focused resolvers for three client-language ecosystems. | Large capability growth, but the resolver leaves remain cohesive and both Architecture conformance gates pass. |
| Phase 175 Architecture switch | Hides Architecture until a person enables it and closes its map tab when disabled. | A display and admission flag in existing settings ownership. It does not create a second lifecycle root. |
| Phase 181 usage meters | Added one lazy main service, two read channels, one renderer store and three presentations of the same snapshot. | Strong privacy and domain boundaries. In-flight resource ownership at quit is incomplete. |
| Phase 174.1 font UI | Added installed-font suggestions and hostile-input handling through the theme/settings path. | No new architectural owner. |
| Phase 183 Catch Me Up | Repaired the occluded-window flight latch. | A focused correctness repair with a regression test. |
| Phase 185 diff preferences | Added inline-highlighting and background choices through a small local-storage preference leaf and the existing highlighter pool. | No competing renderer store or new process boundary. |

## Current shape

### Architecture remains a protected domain

```text
main composition root
  -> arch/ipc.ts
       -> check-coordinator.ts
       -> enrich-coordinator.ts
       -> db, parser, map and resolver leaves
            -> JavaScript and TypeScript ecosystems
            -> Python, Ruby, Rust and Go ecosystems
            -> Swift, Kotlin and Objective-C ecosystems

lazy renderer surface
  -> ArchView.tsx
       -> verdict, drill, freshness, pass and module subjects
  -> store.ts facade
       -> document, map, pass and view-state actions
```

The current main Architecture domain has 51 production files. The largest files still have identifiable roles: `db.ts` is the persistence owner, `check-coordinator.ts` composes checks, and the language-specific resolver modules are leaves. The two coordinators do not import one another. Code outside the domain must enter through the protected facade, and the runtime graph remains acyclic.

The three new grammars add about 12.6 MiB of packaged WASM. Their hashes are pinned in `resources/tree-sitter/GRAMMAR-PINS.json`; there is no runtime download and no compiler or package-manager spawn. This is an intentional package-size cost, not eager renderer growth.

### Usage is narrow but not fully disposable

```text
visible usage meter
  -> one renderer usage store per window
       -> usage:read or usage:refresh
            -> one lazy main usage service
                 -> read-only credential adapter
                 -> fixed-host HTTPS transport
```

The usage domain is about 2,000 production lines across main, preload, shared contract, renderer state and UI. It adds two invoke channels to a current total of 217.

Its boundaries are notably careful:

- both provider switches default off, and an off provider does not touch keychain, disk or network;
- renderer and main both enforce a 15-minute cadence, with visible-and-focused gating in the renderer;
- endpoints are compiled in, redirects are not followed, bodies are capped at 256 KB and requests time out after 10 seconds;
- tokens, response bodies and account identifiers do not cross IPC or enter logs;
- tests inject credential and transport seams instead of using live accounts.

The lifecycle contract does not yet match that design quality. `disposeUsageService()` only sets the service reference to `null`. It neither cancels nor waits for `Held.inFlight`. The real credential adapter calls `/usr/bin/security` through raw `execFile`, outside the guarded-child registry, and the real transport does not expose its `ClientRequest` for cancellation. `disposeMainCapabilities()` therefore describes the service as having no socket or timer while a read can still own both a child and an HTTPS request.

This is a demonstrated ownership gap, not a demonstrated user-visible failure. The request and keychain call have 10-second and 5-second deadlines. The missing contract is that application quit should cancel or boundedly join them rather than rely on those deadlines after teardown starts.

### The process and IPC model still holds

There is still one Electron main composition root, one context-isolated preload bridge and one renderer composition root. The current inventory contains 217 invoke channels, and the declaration, preload, registrar, trust and quit-admission checks close over the same set. The focused IPC suite passes all 36 tests.

The production graph contains 1,101 files and 3,728 runtime import edges with zero strongly connected components. The import-boundary gate examines 1,103 production files and 6,183 imports with zero violations. This is the strongest evidence that the new feature volume has not turned into dependency sprawl.

## Evidence-backed priorities

### P0 — make the remote-create classifier structural across test and bundle boundaries

`npm run conformance:machines` currently fails this rule:

> “tmux holds no server at all” was classified unreachable and the table says provenAbsent.

The fixture constructs a `TMUX_UNREACHABLE` error whose detail is `no server running on /tmp/x`. That is the one sentence `serverProbeVerdict()` is meant to classify as a completed answer from tmux. A small isolated probe established all of the following at once:

- the value is an instance of the `GmuxError` class imported by the probe;
- it has the expected code and detail;
- `serverProbeVerdict()` nevertheless answers `not-confirmed`.

The only earlier branch that can produce that result is the classifier's own `err instanceof GmuxError`. The `.mts` probe and the transpiled main module have two nominal class identities. The product's safety default is correct—it keeps the durable row when uncertain—but the conformance gate no longer proves that a genuine completed “no server” answer can remove the row.

Use a structural discriminator at this crossing: validate the known payload shape, code and detail instead of relying on JavaScript constructor identity across loaders or realms. Keep the default at `not-confirmed` for malformed values. Prove the change in three places:

1. the isolated mixed-loader case answers `no-server`;
2. `npm run conformance:machines` passes all classifier rows;
3. the full ten-row remote matrix remains green, so widening the recognition seam does not turn an unreachable machine into a false absence.

This is the first priority because it protects deletion of durable state. It should not alter ordinary UI or transport behaviour.

### P1 — give usage and Diagnostics real quit ownership

Make the usage service explicitly disposable. Track each `ClientRequest`, run the keychain command through the guarded-child abstraction or an equivalent owned registry, reject new reads after shutdown begins, cancel active work and boundedly await settlement. Register that asynchronous disposer in the existing ordered quit path.

Export one idempotent Diagnostics disposer that calls `stopLiveSampling()` and register it in the same composition root. Diagnostics already knows how to clear its interval, remove its destroyed listener and close streaming `top`; quit simply does not invoke that operation today.

Required proof:

- start a held usage HTTPS request and a held keychain child, begin quit, and prove both are cancelled or joined before the disposer resolves;
- begin a usage read after shutdown admission and prove a typed refusal rather than a new request;
- start live Diagnostics without sending `liveStop`, begin quit, and prove its timer, listener and instrument child are gone;
- keep the current no-work fast path effectively immediate.

These are ownership changes. They should not change what users see while the app is running.

### P1 — isolate and remove retained surface state

The fresh `P167_PROFILES=c npm run probe:p167` run, after removing the ambient development URL, produced:

| Reading | Renderer heap | DOM nodes | Listeners | Renderer footprint |
| --- | ---: | ---: | ---: | ---: |
| Before | 7.0 MB | 465 | 229 | 63.6 MB |
| Block 1 | 26.1 MB | 1,945 | 377 | 303.2 MB |
| Block 2 | 25.8 MB | 3,445 | 497 | 298.0 MB |
| Block 3 | 25.8 MB | 4,945 | 617 | 302.7 MB |

Heap and process footprint plateaued. DOM nodes rose by exactly 1,500 from each measured block to the next, and listeners rose by 120. The final DOM delta exceeds the 400-node budget.

The run also logged 18 Architecture open misses. That part is harness drift: Phase 175 made Architecture default off, but the old P167 launch does not seed the switch on. It waited eight seconds for a surface the product correctly refused to show. It is not evidence that Architecture itself is broken.

Update P167 to enable Architecture inside its isolated profile, then give its five surfaces separate selectors: Catch Me Up, Architecture, Monaco, diff and markdown preview. Run the same three-block ruler against each one. Fix only the owner or shared cache that reproduces the node and listener slope. Preserve caches whose heap and object counts demonstrably plateau.

A flat heap means this is not proof of an immediate out-of-memory leak. It is still a failed deterministic-release contract and can make long sessions carry more detached UI state than they need.

### P1 — make verification independent of the developer's machine

`npm run test:hermetic` passes 11,279 tests and fails one. `src/main/specstory/__tests__/wrap.integration.test.ts` executes the installed SpecStory binary and expects it to advertise `muse`; the binary on the audit machine does not. This is the same environment leak found on 30 August.

Move the real-binary assertion to the native or adapter lane. Keep provider parsing and compatibility rules hermetic through a captured fixture for the supported SpecStory contract.

The first scale-probe launch also inherited `ELECTRON_RENDERER_URL` and tried to attach to a development server that was not running. The previous paint audit found the same issue in P165. Strip development renderer variables inside both harness launch environments. The ordinary command should measure the packaged build shape from either a managed development shell or a clean shell.

### P2 — preserve bundle headroom as the product grows

The eager renderer set is 1,980,400 raw bytes and 444,533 gzip against enforced budgets of 2,000,000 and 500,000. All five probe markers and all 18 lazy surfaces remain outside it. The raw margin is now only 19,600 bytes, under 1%.

Build boundary remains a 3 because the gate is active and green. Do not raise the ceiling merely to make the next commit pass. When ordinary shell code next crosses the budget, use the build report to move a genuinely secondary dependency behind an existing lazy surface. Treat the three new grammar WASM files as package payload, not eager JavaScript.

## Scorecard

Scores use the established four-level rubric.

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | 30 August rerun | 1 September | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | **3** | Main-only resources, context isolation and renderer/shared restrictions remain explicit and import-gated. Usage has one crossing rather than a second process owner. |
| Composition | 3 | **3** | `capabilities.ts` and `renderer/main.tsx` remain the assembly roots. New registrars enter through them. |
| IPC capability | 3 | **3** | The 217-channel inventory, typed bridge, sender trust and monotonic quit admission agree; 36 focused tests pass. |
| Domain cohesion | 3 | **3** | Architecture languages, usage, font and diff preferences have named local owners and focused contracts. |
| Dependency direction | 3 | **3** | 1,101 production graph files and 3,728 runtime edges contain zero SCCs; 6,183 imports produce zero boundary violations. |
| State ownership | 3 | **3** | Durable manifest and tmux authority remain stable. Architecture, usage and diff each add at most one local state owner behind an existing facade. |
| Lifecycle | 2 | **2** | The surface plateau is red; Diagnostics lacks composition-root disposal; usage does not cancel or join in-flight keychain and HTTPS work. |
| Type truth | 3 | **3** | Shared, main, preload and renderer types remain separated and the bridge closure stays green. The classifier issue is nominal runtime identity, not a casted contract. |
| Failure flow | 2 | **2** | Phase 173 improved the full remote evidence, but the current cheap guard cannot recognize one completed no-server answer across its own loader boundary. |
| Test seam | 2 | **2** | Native tests pass, but the hermetic suite still depends on the host SpecStory binary and two Electron probes inherit ambient renderer configuration. |
| Navigation | 3 | **3** | Growth entered protected domain facades and focused language or UI leaves. Large files remain inspectable owners rather than new cross-domain funnels. |
| Build boundary | 3 | **3** | Contract, import, cycle, lazy-surface, probe-containment and eager-budget gates pass. Raw eager headroom is narrow but enforced. |
| **Total** | **33** | **33** | **Nine categories at 3; three categories with concrete local exceptions.** |

## Adversarial score challenge

A friendly reading would raise Failure flow to 3 because Phase 173 recorded all ten remote rows green. That reading was rejected. A score of 3 requires a current narrow protection, and `conformance:machines` is red on the classifier that decides when a durable create row may be deleted.

A friendly reading would also dismiss the P167 result because renderer heap and process footprint plateaued. That reading was rejected. The committed ruler explicitly grades DOM and listeners as well as heap, and both retain a repeatable slope.

A harsher reading would lower Domain cohesion because `src/main/arch` now has 51 files, the repository has more than 316,000 production TypeScript lines, or the usage feature touches main, shared, preload and renderer. That reading was also rejected. An Electron capability must cross those runtimes. Usage has one tiny contract, two read channels and one renderer store; Architecture language growth is behind the same registrar, database, model and conformance doors. File count and line count are inspection signals, not architectural defects by themselves.

A harsher reading would lower Process ownership for raw `execFile('/usr/bin/security')`. The crossing has one clear domain owner, a fixed executable and a five-second bound. The defect is that quit does not own it, so Lifecycle carries the deduction. Counting the same exception twice would make the score less informative.

## Safe order to reach 36

| Order | Work | Proof required | Product risk |
| --- | --- | --- | --- |
| 1 | Replace nominal error identity at the remote confirmation boundary | Mixed-loader fixture, machine conformance and all ten remote matrix rows green | Low; preserve the fail-closed default |
| 2 | Make usage and Diagnostics join ordered shutdown | Held-request, held-keychain-child and live-Diagnostics quit tests green | Low; lifecycle ownership only |
| 3 | Repair P165 and P167 environment setup and reclassify the SpecStory binary test | Clean and managed shells agree; hermetic lane passes without host tools | Low; test and harness only |
| 4 | Split P167 surface measurement, then fix the retaining owner | Each isolated surface and the combined profile plateau for heap, DOM and listeners | Medium; preserve useful warm caches |
| 5 | Rerun the whole rubric on one pinned commit | Every ordinary gate and the relevant specialist probes are green together | Read only |

The first three items should not change normal app behaviour. The surface repair may affect caching, so it needs the focused ruler and an operator check of reopen speed and visual state before it lands.

## Named exemplar comparison

VS Code remains the named exemplar because it is a mature TypeScript Electron application with explicit source layers and lifecycle contracts.

Its current source-organisation guidance says a contribution should expose one internal API file and other contributions should not reach into its internals. Tortie's facade-directory and runtime-cycle gates enforce the same useful principle mechanically for its smaller domain model. The new Architecture resolvers and usage service enter through their domain doors instead of becoming application-wide helpers.

VS Code's current lifecycle primitives give every owned resource a disposable and aggregate those resources in stores. Its workbench lifecycle also names shutdown joiners, their order and the point at which resources can no longer be accessed. Tortie's ordered main disposer is already close to this model. The remaining step is to make the new HTTPS request, keychain child and live Diagnostics subscription real members of it.

- [VS Code source code organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
- [VS Code disposable lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts)
- [VS Code workbench lifecycle contract](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

Intentional divergences remain correct: Tortie has no extension host, durable terminals live in tmux, remote execution is allowlisted, session and machine identity are immutable, the Architecture database is disposable, and one context-isolated preload bridge is preferable to a VS Code-sized service platform.

## Verification run

| Check | Fresh result at `59268ce` |
| --- | --- |
| `npm run typecheck` | Pass: 1,103 production files, 6,183 imports and zero boundary violations; 1,101 graph files, 3,728 runtime edges and zero SCCs; shared-type gate green. |
| `npm run build` | Pass. Contract inventory matches 217 channels; eager renderer JavaScript is 1,980,400 raw and 444,533 gzip; 18 lazy surfaces remain in 11 chunks. The teardown gate checks 171 build files: 56 reach the one Electron-run helper, and none launches Electron directly. |
| `npm run conformance:arch` | Pass: nine language rows, including Swift, Kotlin and Objective-C; no toolchain spawn. |
| `npm run conformance:arch:modules` | Pass, including client-language target grain and caps. |
| IPC closure, bridge, quit-admission and sender-trust suite | Pass: 4 files, 36 tests. |
| `npm run test:native` outside the restricted sandbox | Pass: 4 files, 8 tests. |
| `npm run test:hermetic` | Fail: 703 files passed, 2 skipped and 1 failed; 11,279 tests passed, 23 skipped and 1 failed. The failure is the installed SpecStory binary's provider set. |
| `npm run conformance:machines` outside the restricted sandbox | Fail: one remote-create confirmation row. The isolated mixed-loader probe reproduces the nominal `GmuxError` identity split. |
| `P167_PROFILES=c npm run probe:p167` with inherited development environment | Fail before measurement: inherited renderer URL points at no running development server. |
| The same P167 profile with development variables removed | Fail: heap and footprint plateau, but DOM rises 1,500 and listeners 120 per block; all 18 Architecture opens miss because the isolated profile leaves the new switch off. |
| Phase 173 full remote matrix evidence | Ten rows recorded green at commit `241654f`; not rerun during this audit. |

Not run: packaged-app smoke, live usage endpoints, the current full remote matrix, tmux recovery battery and live manifest-damage exercises. No account credential or remote machine was touched.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- explicit uncertain remote outcomes and journalled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- no Architecture access to manifest, restore or agent-context durability;
- no usage request, credential read or empty UI while both switches are off;
- tokens, response bodies and account identifiers never enter IPC or logs;
- one renderer state facade per domain, not competing stores;
- last-valid Architecture display on malformed or half-written files;
- lazy secondary surfaces and enforced eager-bundle ceilings;
- no production runtime cycles;
- idempotent resource disposal owned by the composition root;
- existing user behaviour and durable or public contracts unchanged during seam work.

## Bottom line

The codebase has absorbed another meaningful batch of product work without architectural sprawl. Its best properties still hold under measurement: one process model, typed and trusted IPC, explicit durable truth, acyclic runtime dependencies, protected domain facades and build gates that fail on drift.

The fresh score is **33/36**. The route to 36 is local rather than foundational: make the durable-create classifier robust across loader boundaries, cancel or join usage and Diagnostics work at quit, remove host state from the verification lanes, and isolate the surface that retains DOM state. No rewrite, new process model or broad folder reorganisation is warranted.
