# Electron and TypeScript architecture audit — post-commit rerun

Date: 30 August 2026

Status: Fresh read-only rerun after the Phase 168 to Phase 176 work. This document preserves the earlier audit as its baseline instead of rewriting that evidence after the fact.

Assessed source: commit `43d637b9626b672890e93f9096a49e4fe6f8a3a8` on `main`, version 0.89.2. The comparison point is commit `45868373890f635e783cfb12d5db168a1ceeaf9f`, version 0.85.4, assessed in [the first 30 August audit](./2026-08-30-electron-typescript-architecture.md). The working tree contained unrelated operator-owned, untracked files; this audit did not modify them.

## Outcome

The current architecture score is **33 out of 36**.

This is a strong result under a deliberately strict rubric. Nine of the twelve categories meet the score-3 bar: their boundaries are explicit, narrow and protected by tests or build checks.

The recent commits recovered two points:

- Build boundary rises from 2 to 3 because the contract inventory is current and required by `npm run build`.
- Navigation rises from 2 to 3 because the three Architecture funnels were split behind protected facades without changing public contracts.

Fresh execution also found one new deduction and confirmed that one old deduction is not fully repaired:

- Lifecycle falls from 3 to 2 because the repeatable scale probe found a surface open/close path that does not plateau in DOM nodes, and the new live diagnostics timer is not part of the composition root's ordered disposer.
- Test seam remains at 2 because a nominally hermetic test executes the host's SpecStory binary and the default paint probe inherits an ambient development URL. Both are machine-state dependencies.
- Failure flow remains at 2 because the last authoritative remote matrix is still red on transport-loss and clock-skew and no green adjudication replaces it.

The score therefore moves from 32 to 33, not to 35. This is not a 33% quality rating. It means three local protections still fall short of the maximum standard.

## What changed since the first 30 August audit

The assessed range contains 37 commits and changes 118 files, with 15,536 insertions and 4,541 deletions. The current tree contains about 309,788 lines of production TypeScript and TSX across 1,073 files, plus 684 test files.

The growth is substantial but mostly contained inside existing domain owners.

| Work | Architectural effect | Ruling |
| --- | --- | --- |
| Phase 168 and 170 Diagnostics | Added summary, sorting and on-demand live measurements inside `main/diagnostics`, `renderer/diagnostics` and the existing typed diagnostics contract. | Domain cohesion holds. The timer has a local quit-ownership exception described below. |
| Phase 169 Oh My Pi | Added one agent through the established agents, overview and icon paths. | No new process, IPC or state owner. |
| Phase 171 gates | Required the 215-channel contract inventory, removed live process-table access from the named unit tests, added a native lane, extracted target-selection fixtures and committed the Phase 167 driver. | Build boundary reaches 3. The broader test-environment claim does not yet reach 3 under a fresh run. |
| Phase 174 custom font | Added a hostile-input-tested setting through the existing settings and theme paths. | No new architectural owner or package. |
| Phase 172 Architecture seams | Split the main registrar, renderer state actions and renderer view subjects while preserving channels, state shape, DOM and the lazy boundary. | Navigation reaches 3. |
| Phase 176 map input | Fixed pointer capture so click, twitch and drag take distinct paths through the real Electron input pipeline. | Correctness repair within the existing map owner; no boundary change. |

## Current shape

### Architecture main process

```text
main composition root
  -> arch/ipc.ts (227 lines: registration, lazy store, disposal)
       -> check-coordinator.ts (722: load, check, progress, last-valid)
       -> enrich-coordinator.ts (490: seed, enrich, pass, repair, accept)
       -> focused database, parser, map and resolver leaves
```

The two coordinators do not import each other. The registrar injects the repair operation needed after a check. Code outside `main/arch` can enter only through `arch/ipc.ts`, and the import-boundary gate proves the rule with positive and negative fixtures.

### Architecture renderer

```text
lazy Architecture surface
  -> ArchView.tsx (378 lines: selection and layout composition)
       -> ArchVerdicts.tsx
       -> ArchDrill.tsx
       -> ArchFreshness.tsx
       -> ArchPass.tsx

callers
  -> store.ts (102 lines: one Zustand facade)
       -> document-actions.ts
       -> map-actions.ts
       -> pass-actions.ts
       -> view-state.ts
```

There is still one renderer state owner. The state modules are implementation details behind `store.ts`, enforced by a facade-directory rule. The largest extracted files are not score deductions by themselves: each now has one named reason to change and no caller can bypass the facade.

### Diagnostics live path

```text
visible Diagnostics tab
  -> diagnostics:liveStart
  -> main/diagnostics/live.ts owns one timer and one streaming top process
  -> diagnostics:liveSample events
  -> liveStop on hide, pause or unmount
  -> sender destroyed as the fallback stop
```

This is a sound on-demand design in normal use. `startLiveSampling()` replaces any existing subscription, skips overlapping ticks and stops after repeated failures. The remaining ownership issue is at application quit: `disposeMainCapabilities()` does not call `stopLiveSampling()`. A visible tab therefore relies on renderer cooperation or later WebContents destruction instead of joining the same ordered main-process teardown as Arch, Overview, Git, workers, watchers and remote children.

## Evidence-backed findings

### P1 — make surface cleanup reach a measured plateau

`npm run probe:p167` now exists and is useful: it caught a result the phase-completion history did not predict.

Project switching passed. Split, close and reattach also passed, with zero `/dev/ptmx` and `/dev/ttys` descriptors retained by main after every measured block.

The surface profile did not pass. Each cycle opened and closed Catch Me Up, Architecture, Monaco, a diff and a markdown preview through real gestures. After forced garbage collection, the measurements were:

| Reading | Renderer heap | DOM nodes | Listeners |
| --- | ---: | ---: | ---: |
| Before | 17.3 MB | 470 | 222 |
| Block 1 | 36.9 MB | 2,732 | 402 |
| Block 2 | 37.9 MB | 4,286 | 528 |
| Block 3 | 37.9 MB | 5,840 | 654 |

Heap plateaued, but the final block retained 1,554 more nodes than the previous block against a 400-node budget. This is not proof of an unbounded memory leak: later split/reattach work allowed the DOM count to fall sharply. It is proof that repeated close operations do not meet the check's deterministic-release contract while that surface path remains active.

The smallest next step is to add a profile selector for each of the five surfaces, run the same three-block ruler against one surface at a time, and fix only the owner that reproduces the slope. Keep the existing UI, lazy boundaries and caches that demonstrably plateau. Add the isolated case to `probe:p167` so the point cannot return on a one-off heap observation.

### P1 — put live Diagnostics in ordered teardown

Export one idempotent diagnostics disposer that stops live sampling and register it in `disposeMainCapabilities()` before the bounded watcher and worker joins. Add a quit test that starts a visible live subscription, begins quit without sending `liveStop`, and proves the timer, destroyed listener and streaming `top` child are gone before the disposer resolves.

This is a narrow ownership repair. It should not change visible Diagnostics behaviour.

### P1 — make the hermetic and paint lanes self-contained

The fresh hermetic lane passed 10,905 tests but failed one integration assertion because `src/main/specstory/__tests__/wrap.integration.test.ts` executes the installed SpecStory binary and requires it to advertise `muse`. The binary on the audit machine did not. A test whose answer changes with an executable outside the lockfile is not hermetic, even when it uses a throwaway `HOME`.

Move the real-binary assertion to the native or adapter lane. Keep parsing and provider-set behaviour in the hermetic lane through a captured fixture for the pinned SpecStory version.

The default `npm run probe:p165` also inherited `ELECTRON_RENDERER_URL=http://localhost:5173` from the audit environment. The app loaded that URL, while `cdp-target.mjs` accepts only built `.../renderer/index.html` targets, so all renderer readings failed. With the development override deliberately removed, the same commit passed:

- renderer DOMContentLoaded p50 97 ms and p95 106 ms against the 200 ms budget;
- first terminal bytes p50 496 ms and p95 507 ms;
- one terminal surface present in every sample;
- no operator sessions changed and no Electron process survived.

The product path is fast. The repair is to sanitize build-shape environment variables inside the probe's launch environment, or make semantic target identification the common helper, as `probe:p167` already does. The ordinary command must produce the same product measurement from a managed development shell and a clean shell.

### P1 — adjudicate the remote failure matrix

The approximately 40-minute matrix has no row selector and was not rerun during this audit. The last authoritative result remains red on row 1, transport loss, and row 5, clock skew. Phase 173 is queued but absent from the assessed commit.

Run both faults with timestamps for status transitions, transport loss, resume witness and clock source. If product truth drifted, repair the state machine. If the grader encodes an obsolete promise, record the new promise and update the independent grader. Then run all ten rows green. A previous red safety check does not become green through unrelated feature work.

## Scorecard

Scores use the established four-level rubric.

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | First 30 August audit | Rerun | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | **3** | Main-only resources, the context-isolated bridge and renderer/shared restrictions remain explicit and import-gated. New agent and diagnostics work reused those owners. |
| Composition | 3 | **3** | `capabilities.ts` and `renderer/main.tsx` remain the assembly roots. Phase 172 made Arch registration narrower without creating a second root. |
| IPC capability | 3 | **3** | The typed declaration, preload exposure, main registration, sender trust and quit refusal remain one closed path; the focused suite passes 27 tests. |
| Domain cohesion | 3 | **3** | Architecture, Diagnostics, agents, settings and overview growth stayed within named domains. The diagnostics disposer is a lifecycle exception, not evidence that its domain dissolved. |
| Dependency direction | 3 | **3** | Typecheck measured 1,071 production graph files and 3,644 runtime edges with zero SCCs; 1,073 files and 6,054 imports produced zero boundary violations. |
| State ownership | 3 | **3** | Manifest and tmux authority remain stable. Arch retains one lazy main store and one renderer store facade; action modules do not create competing state. |
| Lifecycle | 3 | **2** | Core quit admission and resource joins remain strong, but the surface plateau is red and live Diagnostics is absent from ordered main teardown. |
| Type truth | 3 | **3** | Shared, main, preload and web type worlds remain separated, and the bridge suite requires declared members. |
| Failure flow | 2 | **2** | Durable and uncertain outcomes remain explicit, but remote matrix rows 1 and 5 have no current green adjudication. |
| Test seam | 2 | **2** | Process-table seams and the native lane improved. The hermetic SpecStory test and default paint probe still depend on ambient machine state. |
| Navigation | 2 | **3** | Three broad Arch funnels are now registrar/facade/composition files with subject modules behind build-enforced doors. |
| Build boundary | 2 | **3** | The 215-channel baseline is current and byte-checked at the end of every ordinary build; boundary, cycle, bundle and probe-containment gates also pass. |
| **Total** | **32** | **33** | **Nine categories at 3; three specific local exceptions.** |

## Adversarial score challenge

A friendly reading would keep Lifecycle at 3 because heap use plateaued and no PTY descriptor leaked. That reading was rejected. The committed scale check explicitly treats retained DOM growth as a failure, and main composition has no explicit Diagnostics stop. A protected lifecycle is not one where the check is red but the score stays green.

A harsher reading would lower Domain cohesion because Diagnostics now contains about 5,081 production lines, or keep Navigation at 2 because `check-coordinator.ts` and `ArchVerdicts.tsx` are still 722 and 646 lines. That reading was also rejected. Line count is evidence to inspect, not a defect. Diagnostics has one domain contract and one on-demand measurement purpose. The Arch modules have distinct reasons to change, protected entry doors, stable public contracts and no runtime cycles.

Build boundary earns 3 even though the eager JavaScript budget has only 44,107 raw bytes of headroom. The build fails when the ceiling is crossed, and all probe markers and eighteen lazy surfaces remain outside the eager set. The narrow margin is a growth watch, not an unprotected boundary.

## Safe order to reach 36

| Order | Work | Proof required | Product risk |
| --- | --- | --- | --- |
| 1 | Reclassify the real SpecStory binary test and sanitize the paint probe environment | Hermetic lane green with the binary absent or different; default and clean-shell paint runs agree | Low; test and harness only |
| 2 | Add the Diagnostics disposer to ordered quit | Visible-live-tab quit test proves timer, listener and child are gone | Low; ownership only |
| 3 | Isolate the red surface profile, then repair the retaining owner | Three blocks plateau for each surface and the combined profile | Medium; surface-specific cleanup may affect caches |
| 4 | Adjudicate and rerun all ten remote rows | Independent matrix exits green with every row under test | Depends on whether product or grader is wrong |
| 5 | Rerun this rubric | All ordinary and specialist protections green on one pinned commit | Read only |

These changes do not require a rewrite or a new process model. The first two should not alter app behaviour. The surface repair must preserve warm-cache benefits that plateau, and the remote ruling may require a product change only if the state machine is wrong.

## Named exemplar comparison

VS Code remains the named exemplar for source boundaries and lifecycle ownership. Its current source-organisation guidance requires each contribution to expose one internal API file and says other contributions should not reach into its internals. Tortie's Phase 172 facade-directory gates now enforce the same useful rule mechanically for Architecture, without adopting VS Code's much larger service platform.

VS Code's lifecycle primitives also aggregate disposables and define explicit shutdown joiners. A `DisposableStore` disposes everything it owns and immediately disposes anything added after the store is already closed. That is the standard the live Diagnostics resource should meet at Tortie's composition root.

- [VS Code source code organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
- [VS Code disposable lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts)
- [VS Code workbench lifecycle contract](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

Intentional divergences remain correct: Tortie has no extension host, durable terminals live in tmux, remote execution is allowlisted, session and machine identity are immutable, the Architecture database is disposable, and one context-isolated preload bridge is preferable to a VS Code-sized service layer.

## Verification run

| Check | Fresh result at `43d637b` |
| --- | --- |
| `npm run typecheck` | Pass: 1,073 production files, 6,054 imports, zero boundary violations; 1,071 graph files, 3,644 runtime edges, zero SCCs; shared-type gate green. |
| `npm run build` | Pass repeatedly. Contract inventory matches 215 channels; eager JavaScript is 1,955,893 raw and 438,284 gzip; 18 lazy surfaces remain in 11 separate chunks; 165 build files reach one Electron-run helper. |
| `npm run conformance:arch` | Pass. |
| `npm run conformance:arch:modules` | Pass. |
| IPC closure, bridge and quit suite | Pass: 4 files, 27 tests. |
| `npm run test:native` outside the restricted sandbox | Pass: 4 files, 8 tests. |
| `npm run test:hermetic` | Fail: 677 files passed, 2 skipped and 1 failed; 10,905 tests passed, 23 skipped and 1 failed. The failure is the installed SpecStory binary's provider set. |
| `npm run probe:p165` with inherited development environment | Fail: app milestones present, renderer unmeasured because the probe rejected the development URL. |
| `npm run probe:p165` with the development URL removed | Pass: DOMContentLoaded p95 106 ms; first bytes p95 507 ms; no session or Electron residue. |
| `npm run probe:p167` | Fail one profile: surface DOM nodes rose 1,554 in the final block. Project switching and split/reattach passed; main retained zero PTY descriptors. |
| Contract inventory negative protection | Present from Phase 171 and active as the final build step; current baseline matches byte for byte. |

Not run: packaged-app smoke, real remote machines, the remote fault matrix, tmux recovery battery and live manifest damage. The failure-flow score therefore retains the last authoritative red matrix instead of inventing a current result.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- explicit uncertain remote outcomes and journaled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- no Architecture access to manifest, restore or agent-context durability;
- one renderer state facade per domain, not competing stores;
- last-valid contract display on malformed or half-written files;
- lazy secondary surfaces and enforced eager-bundle ceilings;
- no production runtime cycles;
- idempotent resource disposal owned by the composition root;
- user behaviour and durable or public contracts unchanged during seam work.

## Bottom line

The recent commits improved the architecture while adding meaningful product capability. Phase 172 is a successful example of reducing cognitive concentration without multiplying state owners or changing contracts. Phase 171 made contract drift a required build failure. The new agent, Diagnostics and font work did not spill across unrelated domains.

The fresh score is **33/36**. The remaining work is precise: remove two ambient test dependencies, join live Diagnostics to ordered quit, isolate and fix one red surface-retention path, and adjudicate the existing remote matrix. The codebase has not sprawled; its verification has done its job by finding the next local seams before they become structural debt.
