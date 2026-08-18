# Electron and TypeScript architecture follow-up

Date: 2026-08-16

## Outcome

The 14 August cleanup worked. Tortie still does not need an architectural rewrite. The main, preload, renderer, tmux and SQLite owners are clearer than they were, and the contract inventory proves that the cleanup kept the public and durable contracts stable.

The next work should not start with another broad file split. It should first repair three lifecycle gaps that the new seams made visible:

- Suspend captures scrollback but never takes the promised manifest generation.
- Quit clears the core singleton before shutdown finishes, so a live IPC call can start a second core during teardown.
- Quit starts quick open and symbol worker disposal but does not await either promise.

After those fixes, the tidy-up should finish the incomplete parts of the first audit. The renderer should use the exact installed bridge type without compatibility casts. The new renderer cycle should be removed. `App.tsx`, shared types and the largest interaction controllers should become small facades over focused modules.

The app's normal behavior and user interface should not change.

## What changed since the first audit

Phase 42 implemented all nine stages from the [14 August audit](2026-08-14-electron-typescript-architecture.md). No contract line moved during that work.

| Earlier pressure point | Current shape | Assessment |
|---|---|---|
| `src/shared/ipc.ts`, 3,269 lines | 4,098 lines across domain files, largest file 614 lines | The split worked. New features now land in named domains. |
| `src/preload/index.ts`, one whole bridge | 162-line assembly plus 11 focused modules | The one-bridge rule is clearer and still holds. |
| `src/main/index.ts`, 2,231 lines | 610 lines plus `capabilities.ts` and 13 harness modules | Much better, but shell arrival and normal-startup wiring are accumulating again. |
| `src/main/manifest/store.ts`, 2,163 lines | 503-line facade over schema, codecs and repositories | The target facade exists and is cohesive. |
| `src/renderer/state/store.ts`, 1,820 lines | 203-line facade over slices and one subscription owner | The target facade exists. Its many production consumers are not a problem. |
| `src/main/sessions/core.ts`, 2,931 lines | 2,822 lines | Pure plans moved out, but effectful orchestration remains concentrated. |
| `src/renderer/app/App.tsx`, 1,168 lines | 1,196 lines | The proposed shot and input split did not land. |
| `src/shared/types.ts`, 1,263 lines | 1,354 lines | The proposed domain type split did not land. |

The cleanup also added four referenced TypeScript projects, a production import gate, a deterministic contract inventory, central sender trust, ordered quit handling, pure launch and reconcile plans, and tests that keep the five known cycles from returning.

## Today

This is the relevant part of the current tree. Focused domain folders that need no change are omitted.

```text
src/
├── shared/
│   ├── ipc/
│   │   ├── index.ts                   installed API composition
│   │   ├── app.ts                     614 lines, several app domains
│   │   └── <domain>.ts                focused channel contracts
│   └── types.ts                       1,354 lines, many domains
│
├── preload/
│   ├── index.ts                       one 162-line assembly
│   ├── bridge.ts                      one raw IPC adapter
│   └── <domain>.ts                    focused bridge methods
│
├── main/
│   ├── index.ts                       610 lines
│   │                                  window + startup + shell arrivals
│   ├── capabilities.ts                install facade + ordered shutdown
│   ├── security/trusted-window.ts     shared window and sender policy
│   ├── sessions/
│   │   ├── core.ts                    2,822-line runtime owner
│   │   ├── launch-plan.ts             pure decisions
│   │   └── reconcile-plan.ts          pure decisions
│   ├── manifest/store.ts              503-line persistence facade
│   ├── agents/registry.ts             1,724 lines, 13 agent entries + helpers
│   └── git/service.ts                 1,642 lines, 35 operations
│
└── renderer/
    ├── app/App.tsx                    1,196 lines
    │                                  keyboard + menus + shot + shell
    ├── state/
    │   ├── store.ts                   stable 203-line facade
    │   ├── subscriptions.ts           hydration + one subscription owner
    │   └── shell-open.ts              closes a new state cycle
    └── tree/FileTree.tsx              1,505 lines, 17 effects
```

The feature path is now mostly the target path from the first audit:

```text
feature component
-> InstalledGmuxApi, often re-cast to an older optional Extras type
-> domain preload method
-> typed main handler with trusted-sender check
-> domain service or GmuxCore
-> tmux, SQLite, filesystem, git or worker
```

Renderer boot also matches the earlier target:

```text
App effect
-> store.boot()
-> hydrateAppState()
-> startAppSubscriptions()
-> repeated boot does not install the subscriptions again
```

Three main lifecycle paths do not yet match their stated contracts:

```text
suspend
-> snapshotAllSessions('system-sleep')
-> manifest ring suspend hook is never called

quit
-> shutdownGmuxCore()
-> corePromise becomes null before the old core finishes
-> live IPC can call getGmuxCore()
-> a second core can boot outside the disposer

worker teardown
-> disposeQuickOpenIpc() and disposeSymbolsIpc()
-> promises are discarded
-> Electron teardown can race worker termination and the symbols DB close
```

The Finder-open path has a sound process boundary and a bad final dependency:

```text
macOS open-file
-> main pending-open slot
-> shell IPC contract
-> preload shell method
-> renderer hydration or menu action
-> state/shell-open.ts
-> state/store.ts
```

That last edge completes this production cycle:

```text
state/store.ts
-> state/subscriptions.ts
-> state/shell-open.ts
-> state/store.ts
```

`shell-open.ts` also dynamically imports `editor/store.ts`, which imports `state/store.ts`. The current fixed-edge cycle tests cannot detect a new cycle because they are not a graph walk.

## Tomorrow

The target keeps the successful Phase 42 facades. It adds explicit lifecycle state and splits only files with several reasons to change.

```text
src/
├── shared/
│   ├── ipc/
│   │   ├── index.ts                   exact InstalledGmuxApi
│   │   ├── menu.ts
│   │   ├── settings.ts
│   │   ├── updates.ts
│   │   └── <domain>.ts
│   ├── types/
│   │   ├── sessions.ts
│   │   ├── projects.ts
│   │   ├── git.ts
│   │   ├── agents.ts
│   │   ├── files.ts
│   │   └── index.ts                   stable @shared/types facade
│   └── agents/catalog.ts              presentation-safe agent facts
│
├── main/
│   ├── index.ts                       short composition root
│   ├── lifecycle/
│   │   ├── install.ts                 capability and disposer ledger
│   │   ├── shutdown.ts                bounded ordered shutdown
│   │   └── shell-arrivals.ts          argv and Finder-open controller
│   ├── sessions/
│   │   ├── core.ts                    stable runtime facade
│   │   ├── lifecycle.ts               empty, booting, ready, shutting down
│   │   ├── suspend.ts                 snapshot + manifest generation
│   │   ├── create-session.ts          declaration, spawn and bind workflow
│   │   ├── launch-plan.ts
│   │   └── reconcile-plan.ts
│   ├── agents/
│   │   ├── registry.ts                lookup facade
│   │   ├── helpers.ts
│   │   └── entries/<agent>.ts         one declarative entry per agent
│   └── git/
│       ├── service.ts                 stable facade
│       ├── status.ts
│       ├── history.ts
│       ├── working-tree.ts
│       ├── branches.ts
│       └── remotes.ts
│
└── renderer/
    ├── app/
    │   ├── App.tsx                    shell composition only
    │   ├── keyboard.ts
    │   ├── menu-actions.ts
    │   ├── quit.ts
    │   └── shell-open-controller.ts   injected app + editor owners
    ├── shot/install-driver.ts
    ├── state/                         no imports from app or editor owners
    └── tree/
        ├── FileTree.tsx               assembly component
        ├── use-tree-model.ts
        ├── use-tree-rename.ts
        ├── use-tree-menu.ts
        └── use-tree-drag.ts
```

The target lifecycle is explicit:

```text
startup
-> install capabilities and record every returned disposer
-> core state moves empty -> booting -> ready

suspend
-> prepareForSuspend()
-> snapshot scrollback and take a changed manifest generation
-> respect the existing four-second power deadline

quit
-> core state moves ready -> shutting down
-> new core requests fail closed
-> snapshots -> capture sync -> quit generation -> core disposal
-> watcher drain -> worker shutdown -> remaining disposers
-> Electron quits after every bounded join settles
```

## Fix before structural cleanup

| Priority | Finding | Smallest safe change | Proof required |
|---|---|---|---|
| P0 | Suspend never calls `takeManifestGenerationOnSuspend()` | Add one `prepareForSuspend()` owner that performs the scrollback capture and ring take through the production power callback. | Adapter test proving one suspend reaches both operations, plus the existing power smoke. |
| P0 | `shutdownGmuxCore()` clears the singleton before shutdown settles | Add explicit core lifecycle state. Refuse or return a typed shutdown result from new calls while the old owner is closing. | Delay shutdown, call `getGmuxCore()`, and prove `GmuxCore.boot()` does not run again. |
| P0 | Quick open and symbol disposal are not awaited | Put both promises in a bounded transient-worker shutdown phase. | Quit test proving worker termination and symbols persistence close settle before the disposer returns. |
| P1 | Finder open introduced a renderer cycle | Pass the store operations into `pullPendingShellOpen` and move editor initialization to an app controller. | A production strongly connected component scan with zero cycles. |
| P1 | The installed bridge type is still optional enough to drift | Make `Window.gmux` optional as a whole, but make every member of a successfully installed bridge required. Remove old Extras intersections. | Compile-time missing-member fixtures plus preload, main and contract closure checks. |
| P1 | The channel contract contains two ghost invokes | Remove or deliberately reclassify `projects:rename` and `app:setBadgeCount`, which have no preload or main implementation. | Re-baseline the contract inventory in the same commit and state that runtime behavior did not move. |
| P1 | Renderer and shared production configs still include Node types, while web references main for tests | Create a separate cross-process test config. Remove the production web-to-main reference and forbid Node or Electron package imports in shared and renderer. | Typecheck fixtures that fail on `node:fs` and `electron` imports from those layers. |

## Why these seams

The evidence now points to lifecycle ownership and a few unfinished facades:

| Evidence | Why it matters |
|---|---|
| 639 production files and 3,299 imports pass the top-level process gate | The broad process graph is sound and should be preserved. |
| The contract has 144 invoke channels, while preload invokes 142 | A typed union alone does not prove that every declared capability exists at runtime. |
| 61 production renderer files read `window.gmux`; 44 still mention an Extras type | The truthful installed type has not yet become the renderer's actual vocabulary. |
| `Window.gmux` is required in the declaration, while the app renders a missing-bridge state | Whole-bridge absence and member-level compatibility are modelled in opposite ways. |
| `GmuxCore` has 2,822 lines and `createSession` spans about 384 lines | Pure decision extraction helped tests but did not isolate the effectful workflow. |
| `App.tsx` still owns keyboard, menu, screenshot and quit controllers | The shell component changes for several unrelated reasons. |
| `FileTree.tsx` has 1,505 lines and 17 effects | Persistence, model sync, rename, filtering, menus and drag behavior change independently. |
| `src/shared/types.ts` contains sessions, projects, git, files and agent wire shapes | The old append-only protection now concentrates unrelated contracts. |
| The cycle guard checks five named old edges only | It preserves old repairs but cannot catch a new strongly connected component. |

## Benchmark against named exemplars

Two current exemplars provide useful patterns without defining Tortie's whole design.

| Dimension | Observed exemplar | Tortie today | Delta to close |
|---|---|---|---|
| Lifecycle state | VS Code's `LifecycleMainService` records `quitRequested`, keeps one pending shutdown promise and awaits named shutdown joiners. | Quit state is split between `quitFlowStarted`, a nullable core promise and a hand-written disposer. | Add one small explicit lifecycle state and an awaited shutdown ledger. [VS Code lifecycle service](https://github.com/microsoft/vscode/blob/main/src/vs/platform/lifecycle/electron-main/lifecycleMainService.ts) |
| Resource ownership | VS Code's `DisposableStore` makes listener and worker ownership explicit and rejects late additions after disposal. | Several installers return cleanup functions, but some are ignored and two async disposals are fired without a join. | Require each installer to return a disposer and record it once. Keep Tortie's required shutdown order and deadlines. [VS Code disposable store](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts) |
| Sender trust | GitHub Desktop keeps trusted `WebContents` ids in one module and removes each id when its owner is destroyed. | Tortie's `trusted-window.ts` now applies the same pattern to both windows and every typed invoke. | No structural change. Keep this deliberate match. [GitHub Desktop trusted sender](https://github.com/desktop/desktop/blob/development/app/src/main-process/trusted-ipc-sender.ts) |
| Typed IPC | GitHub Desktop defines named request and response channels in one shared contract. | Tortie has a stronger domain split and one context-isolated bridge, but optional extras and two ghost channels weaken closure. | Keep the domain split and make the installed surface exact. [GitHub Desktop IPC contract](https://github.com/desktop/desktop/blob/development/app/src/lib/ipc-shared.ts) |
| Git implementation | GitHub Desktop puts status, fetch, branch, commit and other Git operations in separate modules. | Tortie's `GitService` has 35 operations in one 1,642-line class. | Keep `GitService` as the public facade and move operation families behind it. [GitHub Desktop Git modules](https://github.com/desktop/desktop/tree/development/app/src/lib/git) |
| Domain models | GitHub Desktop gives repository, branch, diff, status and other models separate files. | Tortie's shared type file mixes several domains behind one path. | Split physical files and retain the current barrel path. [GitHub Desktop models](https://github.com/desktop/desktop/tree/development/app/src/models) |
| Feature UI | GitHub Desktop groups branches, changes and other interface code into feature folders with small entry files. | Tortie's root App and FileTree still contain several interaction controllers. | Keep Tortie's current components and move each controller behind the feature entry that owns it. [GitHub Desktop UI modules](https://github.com/desktop/desktop/tree/development/app/src/ui) |

Tortie should intentionally diverge from GitHub Desktop's large main entry point, global dispatcher and large app store. Phase 42's capability installer and Zustand slices are smaller and fit this app. Tortie should also use the lifecycle patterns from VS Code without adopting its service container.

The TypeScript project split follows the compiler's intended use of project references, but the production and cross-process test programs should be separated so the reference graph itself tells the truth. [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)

## Required invariants

Every change must preserve these rules:

- The private tmux server remains the live-session authority.
- Packaged Tortie uses its pinned bundled tmux 3.7b. It does not resolve tmux from `PATH` or honour `GMUX_TMUX_BIN`.
- Development may use its measured override and system resolution path.
- SQLite application id, schema compatibility, migration order and snapshot formats remain unchanged unless a separate data change requires them.
- A manifest declaration still commits before tmux spawn.
- Session ownership still uses immutable identity, never display names.
- The renderer still receives one context-isolated `window.gmux` bridge.
- Main remains authoritative for disk, git, processes and durable sessions.
- The renderer store facade and domain slices remain. This audit does not propose a new global state framework.
- Search, symbols, quick open and other workers stay lazy and keep their current process boundaries.
- Harness environment names, outputs, isolation and exit behavior remain unchanged.
- The Finder and shell-open cap remains. An arriving path cannot select an agent, start a session or run a command.
- The contract inventory must match after each phase. A deliberate line change is re-baselined and explained in that commit.

## Implementation order

| Phase | Change | Protection required first |
|---|---|---|
| 0 | Repair suspend, core shutdown state and awaited worker disposal | Power adapter test, delayed-shutdown concurrency test, quit worker join test, durability and quit smoke. |
| 1 | Break the shell-open cycles and add a production import graph check | Finder-open tests, renderer boot tests and a zero-cycle graph fixture. |
| 2 | Make `InstalledGmuxApi` exact and resolve the two ghost channels | Bridge missing-member fixtures, IPC closure, preview containment, build and contract re-baseline when needed. |
| 3 | Separate production and cross-process test TypeScript configs | Typecheck, forbidden Node and Electron import fixtures, full test discovery. |
| 4 | Extract App keyboard, menu, shot and quit controllers | Keyboard and native menu tests, shot harness, quit smoke, no visual change. |
| 5 | Split shared types and `ipc/app.ts` behind stable barrels | Typecheck, contract inventory and package build. |
| 6 | Extract the effectful create-session workflow and separate disk-only project reads from tmux boot | Fault points, declaration-before-spawn proof, durability, identity, resume and filesystem authorization tests. |
| 7 | Split agent entries and FileTree behavior behind their current facades | Agent conformance, install conformance, context conformance, tree interaction tests and screenshots. |
| 8 | Split Git operation families behind `GitService` | Git integration tests, watcher tests and SCM live probe. |

## Not part of this simplification

Do not combine these changes with renderer sandboxing, a utility-process move, a service container, a global dispatcher, a state-framework rewrite, data migrations, a custom application protocol or a UI redesign. Each changes a runtime or product boundary and needs separate evidence.

## Audit verification baseline

- `npm run typecheck` passed. It checked 639 production files and 3,299 imports with zero process-boundary violations.
- `node build/contract-inventory.mjs --check` matched the committed baseline byte for byte.
- A focused main security, sessions, manifest, harness, watcher and AttachHost set passed 135 tests.
- The full suite completed with 4,244 passed, 4 failed and 2 skipped tests out of 4,250. Two watcher tests and one configuration watcher test could not start an FSEvents stream. One process-lineage test also failed when run alone. The audit did not treat these as proof of a source regression.
- The audit did not boot Electron, touch the live `gmux` tmux socket, open a live manifest, run smoke, package the app or exercise suspend and quit on a live process.
- The working tree already contained the Phase 62 theme dependencies and `docs/phase-62-spec.md`. This audit did not modify them.

## Appendix A: Assessment record

### Assessment method

Three read-only reviews mapped prompt history, the main and durability runtime, and the renderer, IPC and build boundaries. Each review had to identify owners and callers, trace event or data paths, compare the current tree with the first audit, and name the smallest seam that preserves behavior.

Files were judged by responsibility and dependency direction, not line count alone. The 1,724-line agent registry is mostly declarative data. It becomes a finding because adding or correcting one agent competes in one shared table, not because it crossed a numeric limit. The 2,822-line session core becomes a finding because one create method owns many failure boundaries and durable side effects.

Scores use the same scale as the first audit:

| Score | Meaning |
|---|---|
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

### Scorecard

| Area | 14 August | Current | Assessment |
|---|---:|---:|---|
| Process ownership | 2 | 3 | Runtime projects and import checks make the main, preload, renderer and shared graph explicit. |
| Composition | 1 | 2 | Capability and store facades exist. Main index and App still collect unrelated controllers. |
| IPC capability | 1 | 2 | Domain contracts and sender trust are strong. Optional installed members and two ghost channels weaken closure. |
| Domain cohesion | 1 | 2 | Manifest, preload and state splits worked. Types, App, core and FileTree remain mixed. |
| Dependency direction | 1 | 2 | Top-level layers are enforced. The renderer has a new internal cycle and state-to-UI imports. |
| State ownership | 2 | 3 | Store slices and one subscription owner make renderer ownership clear. |
| Lifecycle | 1 | 1 | Ordered quit exists, but suspend, singleton shutdown and async worker joins have concrete gaps. |
| Type truth | 1 | 2 | Preload and Window share `InstalledGmuxApi`, but optional extras still permit drift. |
| Failure flow | 3 | 3 | Restore, snapshot, updater and recovery outcomes remain explicit and bounded. |
| Test seam | 2 | 2 | Pure plans test well. Effectful create and large interaction controllers remain broad. |
| Navigation | 1 | 2 | Domain folders improved call-path tracing. A few central files are growing again. |
| Build boundary | 2 | 2 | Project references and import checks are strong, but production web still references main for tests and permits Node packages. |

### Strengths to preserve

- The Phase 42 contract inventory made a large refactor checkable and stayed unchanged through every stage.
- Durable create still commits the declaration before spawning tmux and binds the immutable tmux id after success.
- Restore intent commits before the side effect and resolves only after the restored identity and status commit.
- Manifest schema, codecs and repositories now sit behind a stable facade with one writable connection.
- The renderer hydrates separately from its idempotent subscription owner.
- Trusted sender and navigation policy applies to both application windows.
- Existing pure launch, reconciliation, restore, parser and scheduling modules show the intended test shape.

### Current source corrections

The 14 August audit is now an execution charter and historical baseline, not the current source map:

- Phase 42 landed all nine stages on 15 August.
- Packaged Tortie now ships pinned tmux 3.7b and refuses system or override resolution. The old audit's planned-work statement is stale.
- The manifest now has application id 1414681669, schema version 12, minimum compatible version 8, 12 migrations and 8 schema objects.
- The invoke contract now contains 144 channels and the harness dispatcher contains 20 modes.
- The app has 639 production TypeScript files and 155,161 production TypeScript lines outside test folders.

## Appendix B: Recovered prompt

The original prompt was recovered exactly from the local Codex history. It was not inferred from the report:

> I would like you to look at and assess this codebase by first: 1) researching and assessing typescript best practices for electron apps in terms of app architecture and code cleanliessness 2) build that into an audit that a set of fanned out sub agents can first a. use to map the AS-BUILT-ARCHITECTURE of this repo and 3) assess areas that would make the logic and file structure significantly simpler WITHOUT changing the functionality of the app but by reducing patterns / practices from step 1 that make it easy and delightful to read and maintain. In step one, it may be useful to add research to assess named examplars of well maintained analogues.

The history record is tied to session `01a00345-cd58-7f11-8dec-6f77441d359d`. The audit was created in commit `d1e0a17`. Follow-up questions asked for the gist, a visual result, today's tree versus tomorrow's tree, the before and after flow, and a compact appendix. Those questions explain the final report shape.
