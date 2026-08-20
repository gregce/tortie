# Electron and TypeScript architecture audit

Date: 2026-08-20

Status: Current architecture authority. This supersedes the 16 August follow-up as the source map and phased simplification plan.

## Outcome

Gmux still does not need an architectural rewrite. The process boundary, one context-isolated bridge, durable session identity, manifest-before-spawn rule, renderer state ownership and domain-oriented IPC remain sound. Remote-machine work has mostly extended those boundaries instead of bypassing them.

Growth has nevertheless outrun several internal seams. Since the snapshot assessed on 16 August, the production TypeScript graph grew from 639 to 763 files, from 3,299 to 4,334 imports and from 155,161 to 220,773 lines. The remote-machine domain accounts for much of the new capability and is both successfully factored into narrow modules and concentrated in two orchestration surfaces: `main/machines/remote-sessions.ts` and `shared/ipc/machines.ts`.

The current score is **24/36**, down from **26/36** on 16 August. This is an ordinal boundary score, not a quality percentage. Process ownership and state ownership remain strong. The deductions come from six runtime dependency cycles, two shutdown ownership gaps, ambiguous remote-create recovery, a non-atomic machine-removal path, an optional installed bridge type and large navigation surfaces.

The next implementation should be safety-first:

1. fail closed once core shutdown starts;
2. preserve uncertain remote creates instead of converting an unreachable confirmation into absence;
3. own and join long-running remote child processes;
4. make machine removal one durable transaction;
5. break the six runtime cycles with leaf contracts or injected operations;
6. only then split the growing orchestration, IPC and shell facades.

No phase should change normal UI behavior, public IPC names, durable identity, remote execution policy or the one-bridge rule.

## Prompt provenance

The exact prompt that directly created the 16 August follow-up was recovered from the local Codex session, not inferred from the prose:

> In a prior session we used a prompt to produce docs/audits/2026-08-14-electron-typescript-architecture.md as an assessment. Since then, there has been project change in this repo. Please reverse engineer what the prompt likely was, and produce a new audit in similar format making astute recommendations for keeping the architecture of this app tidy. Use and fan out sub agents as required

It appears in session `rollout-2026-08-16T19-12-46-01a00cd9-59d7-7a32-b7bd-239931883abc.jsonl` at the user item recorded at 2026-08-16T23:13:47Z.

Appendix B of the 16 August document quotes a different prompt: the original prompt that created the 14 August audit. That older prompt was upstream context for the follow-up, not the direct creation prompt. Appendix B below records both prompts and a reproducible operational reconstruction.

## Baseline and change window

The 16 August review assessed source at `a648cbd04c13a23f5ee4accbf33e9a9902ae7c24`. The report was committed later, in docs-only commit `e27eee4d4ef0672097ecc0e773f15b5d4a240930`. Therefore this audit uses `a648cbd..f544342` as the source-change window and treats `e27eee4` only as publication provenance.

There are 115 commits in that window: 22 feature commits, 20 fixes, 70 documentation commits and 3 other commits. The important architectural growth is the remote-machine ladder, `WorkspaceTarget`, remote filesystem/search/SCM parity, theme work, lifecycle repairs and startup-performance work.

| Measure | 16 August snapshot | 20 August snapshot | Reading |
|---|---:|---:|---|
| Production TS/TSX files | 639 | 763 | Domain growth is substantial but still inside the four process layers. |
| Production imports | 3,299 | 4,334 | The top-level import gate passes; internal runtime cycles now need a real graph gate. |
| Production TS/TSX lines | 155,161 | 220,773 | Line growth alone is not a defect; responsibility growth in a few owners is. |
| Invoke channels | 144 | 172 | Declared, preload and main invoke sets close exactly today. The closure is not yet protected by the gate. |
| Manifest schema | version 12, minimum 8 | version 16, minimum 13 | Migration ownership remains explicit; application id remains 1414681669. |
| Runtime SCCs | one known renderer cycle | six SCCs, 32 modules | Type-only edges were excluded. Fixed-string cycle tests do not detect this graph. |

The earlier P0s did land: suspend now reaches manifest handling, worker disposal is awaited with bounds and the core slot is not cleared early enough to permit a second boot. The last repair is intentionally narrow: calls can still acquire the existing core while that core is shutting down.

## Today

The relevant current tree is:

```text
src/
├── shared/                            41 files, 15,100 lines
│   ├── ipc/
│   │   ├── index.ts                  installed API composition
│   │   └── machines.ts               1,957 lines, 26 invokes, many subdomains
│   ├── workspace-target.ts           { machineId, path } authority
│   └── types.ts                      1,507 lines
│
├── preload/                           13 files, 925 lines
│   ├── index.ts                      one 167-line bridge assembly
│   └── machines.ts                   narrow bridge methods
│
├── main/                              355 files, 116,946 lines
│   ├── index.ts                      645-line composition root
│   ├── capabilities.ts               489-line install/shutdown facade
│   ├── sessions/core.ts              3,798-line runtime owner
│   ├── machines/                     28,357 production lines
│   │   ├── remote-sessions.ts        2,692-line machine/session orchestrator
│   │   ├── exec-plane.ts             SSH child-process execution
│   │   └── <focused modules>         setup, files, search, SCM, feeds, restore
│   ├── harness/index.ts              statically imports shipped-path probes
│   ├── agents/registry.ts            1,724-line declarative registry
│   └── git/service.ts                1,642-line local Git facade
│
└── renderer/                          354 files, 87,802 lines
    ├── app/App.tsx                   1,538 lines, 71 imports
    │                                 keyboard + menus + probes + quit shell
    ├── state/
    │   ├── store.ts                  stable 212-line facade
    │   ├── subscriptions.ts          hydration/subscription owner
    │   └── shell-open.ts             part of a five-module cycle
    ├── tree/FileTree.tsx             1,636 lines, 18 effects
    └── settings/                     two small component/driver cycles
```

### Feature and authority flow

The normal capability path remains healthy:

```text
feature component
-> one InstalledGmuxApi namespace
-> domain preload method
-> typed main handler + trusted-sender check
-> domain service or GmuxCore
-> tmux, SQLite, filesystem, Git, worker or allowlisted SSH script
```

Remote work did not introduce a generic renderer-to-shell escape hatch. The renderer passes an explicit `WorkspaceTarget` and named capability; main resolves machine authority and chooses the local or allowlisted remote implementation.

```text
WorkspaceTarget { machineId, path }
-> renderer feature/store
-> machines IPC capability
-> main machine context
-> local implementation OR remote execution plane
-> immutable machine/session facts returned through the same contract
```

`WorkspaceTarget` intentionally uses two fields rather than a merged URI. `localPathOf()` refuses a remote target, and equality includes both authority and path. This makes an important illegal state difficult: a remote path cannot leak into a local `cwd` merely because the strings look alike.

### Two unsafe failure paths

Remote session create currently collapses uncertainty into absence:

```text
write durable remote declaration
-> execute remote new-session
-> confirmation request cannot reach the machine
-> catch returns null
-> caller interprets null as proven absence
-> durable declaration is deleted
```

A network partition after successful remote execution can therefore leave a live remote session with no durable local declaration. The in-memory issued UUID helps during the same process lifetime, but does not survive restart.

Core shutdown is now single-boot but not fail-closed:

```text
before-quit
-> shutdown starts and keeps renderer alive
-> getGmuxCore() returns the existing shutting-down core
-> a mutating IPC handler may admit new work after the final snapshot
-> dispose/generation continues without joining that mutation
```

The core needs an explicit acquisition state, not only a singleton promise.

### Runtime dependency cycles

An AST graph over production runtime imports found six strongly connected components across 32 modules. Type-only imports were excluded; including them produces misleading extra cycles.

| SCC | Modules | Concrete seam |
|---|---:|---|
| Main logging/tmux/machines | 15 | Move boot-environment collection out of logging, or inject it into `runLogBootSequence`; verify every feedback path disappears. |
| Main remote sessions | 5 | Extract readiness/context and stamp composition from `remote-sessions.ts` into leaves. At least two seams are needed to remove all three feedback loops. |
| Renderer state/editor | 5 | Inject app/store/editor operations into `shell-open.ts`; state must not import its composition owners. |
| Main key setup | 3 | Move shared constants and classifiers out of `connection-test`, `key-install` and `key-material` into leaves. |
| Renderer probe registration | 2 | Invert one registration dependency through a gated driver loader or adapter. |
| Renderer connection remedy | 2 | Extract the shared remedy model from `ConnectionTestView` and `KeyInstall`. |

The existing source-scan test deliberately checks fixed strings rather than walking the graph. It passes while these cycles exist.

These SCCs are not equal hazards. The 15-node resource-owner cycle, the remote-session cycle and the renderer state/editor cycle are the architectural problems. The key-setup cycle obstructs isolation. The two-node remedy and probe cycles are navigation and bundle hygiene, not evidence of an application correctness failure; phase 4 should cut the larger ownership cycles first.

## Strengths to preserve

- Main owns Electron lifecycle, processes, disk, Git, durable sessions and machine execution. Renderer code has no production `node:` or `electron` imports today.
- One context-isolated `window.gmux` bridge remains the renderer boundary. Every main invoke still applies central sender trust.
- The current 172 declared invokes, 172 preload invokes and 172 main handlers close exactly.
- Manifest declarations commit before spawn; session and machine ownership use immutable identifiers rather than display names.
- `WorkspaceTarget` keeps remote authority explicit and refuses accidental local-path conversion.
- Remote execution uses per-machine context, allowlisted scripts and separate control versus polling feeds.
- The renderer store facade and domain slices still give state one clear owner.
- Remote functionality is extensively factored into narrow modules with focused tests. The finding is overdue orchestration and contract facades inside a successful domain boundary, not a failed domain split.
- Shipped-path probes test real production paths. Their existence is a strength; static registration and bundle coupling are the issue.

## Tomorrow

The target keeps the public facades and changes dependency direction behind them:

```text
src/
├── shared/
│   ├── ipc/
│   │   ├── machines.ts               stable public barrel
│   │   └── machines/
│   │       ├── connection.ts
│   │       ├── projects.ts
│   │       ├── filesystem.ts
│   │       ├── sessions.ts
│   │       ├── search.ts
│   │       └── scm.ts
│   ├── types/                         physical domain files, stable barrel
│   └── workspace-target.ts
│
├── main/
│   ├── lifecycle/
│   │   ├── core-owner.ts             empty | booting | ready | shuttingDown
│   │   └── shutdown-ledger.ts        refuse, cancel and bounded-join work
│   ├── sessions/
│   │   ├── core.ts                   stable facade
│   │   ├── create-local.ts
│   │   └── mutation-ledger.ts
│   ├── machines/
│   │   ├── remote-sessions.ts        projection/control facade
│   │   ├── create-remote.ts          tri-state confirmation workflow
│   │   ├── ready-context.ts          leaf, no remote-sessions import
│   │   ├── restore-stamps.ts         leaf, no remote-sessions import
│   │   ├── removal.ts                one transactional tombstone workflow
│   │   └── execution-ledger.ts       child handles + cancel + bounded join
│   ├── git/
│   │   └── runs.ts                   stable read-only parser/service for local/remote
│   └── harness/
│       └── loader.ts                 gated registry, shipped paths stay real
│
└── renderer/
    ├── app/
    │   ├── App.tsx                   shell composition only
    │   ├── keyboard.ts
    │   ├── menu-actions.ts
    │   ├── quit.ts
    │   └── probe-loader.ts
    ├── machines/presentation.ts      neutral machine UI facts
    ├── state/                         cannot import app or editor
    └── tree/                          controllers behind current FileTree facade
```

The target remote-create outcome is explicit:

```text
confirm remote create
├── present       -> bind the immutable remote id
├── provenAbsent  -> remove or retry the declaration under existing policy
└── unreachable   -> retain the declaration as unknown; reconcile later
```

The target shutdown is likewise explicit:

```text
ready -> shuttingDown
-> refuse new core acquisition and mutating IPC
-> join admitted session mutations
-> snapshot and take final generation
-> stop timers and feeds
-> cancel + bounded-await remote child processes
-> close workers, watchers and durable stores
-> empty
```

## Prioritized findings

| Priority | Finding | Smallest safe change | Proof required |
|---|---|---|---|
| P0 | Mutating IPC can acquire the existing core after shutdown starts | Add `empty | booting | ready | shuttingDown`; return a typed refusal for new acquisition/mutation and join admitted work. | Hold snapshot, call a real mutating handler, and prove no insert, spawn, remote exec or boot occurs; prove an already admitted create is joined. |
| P0 | Unreachable remote-create confirmation is treated as proven absence | Replace nullable confirmation with `present | provenAbsent | unreachable`; delete only on proven absence and retain unknown declarations across restart. | Let the far-side create succeed, lose its reply, make confirmation unreachable, restart, then prove later reconciliation binds the same immutable id without duplicate creation. |
| P1 | Long-running SSH children are outside shutdown ownership | Add a remote execution ledger with child/abort handles, refusal after shutdown, cancellation and bounded join. Include clone, capture, harvest and store sync. | Hold a remote clone/read, quit, and prove the local SSH child is terminated or joined and the remote outcome is classified. |
| P1 | Machine removal can partially tombstone session rows and still remove machine config | Tombstone all rows in one SQLite transaction; remove machine JSON only after commit; throw on any row failure. | Fault the kth row and prove zero row/config changes; retry and prove idempotence. |
| P1 | Six runtime SCCs make internal ownership bidirectional | Apply the leaf/injection seams listed above and replace the fixed-edge check with an AST runtime graph gate. | Zero production runtime SCCs; a fixture proves type-only edges do not fail and a real runtime cycle does. |
| P1 | Quick-open recents encode root and relative path with a space delimiter | Store a structured tuple, with a backward-compatible decoder for existing rows. | Cover local and remote roots containing spaces, relative paths containing spaces and the same path on two machines. |
| P1 | Installed bridge members remain optional and compatibility casts keep spreading | Make whole-bridge absence optional, but every member of an installed bridge required; remove `Extras` intersections. | Compile-time missing-member fixtures plus exact declared/preload/main closure. |
| P1 | TypeScript projects state a weaker boundary than production follows | Separate cross-process tests; remove web-to-main production reference and Node types from shared/web; gate package/builtin imports. | Fixtures reject `node:fs` and `electron` in shared/renderer while existing cross-process tests remain discoverable. |
| P2 | `GmuxCore` and `remote-sessions.ts` own too many effectful workflows | Extract local create, remote create, ready context, feed ownership and removal behind existing facades. | Fault-point tests preserve declaration-before-spawn, rollback, restore, identity and feed exclusivity. |
| P2 | `shared/ipc/machines.ts` is one 1,957-line superdomain | Split physical contracts by capability family behind the stable `machines` API. Correct the stale invoke-count header. | Contract inventory and runtime closure remain byte-for-byte stable. |
| P2 | Remote SCM imports private local action leaves and a broad Git barrel | Promote a stable read-only runs/parser service used by local and remote paths; transport remains under machines. | Import-boundary test plus local/remote parity fixtures. |
| P2 | `App.tsx` statically registers shipped-path probe drivers | Move registration behind one gated loader/adapter; keep probes on the shipped implementation path. | Production build containment plus every current drive/shot harness. |
| P2 | Renderer state imports app-owned machine-copy and resume logic | Move neutral machine presentation into a lower layer and inject app operations into state controllers. | Boundary fixture: state cannot import app/editor; renderer boot and copy/resume tests pass. |
| P3 | `FileTree.tsx` still contains 18 effects and several interaction controllers | Extract model, rename, menu and drag controllers behind the current component. | Existing interaction tests and screenshots show no visual or behavior change. |

`shared/types.ts`, `agents/registry.ts` and `git/service.ts` remain candidates for later physical splits, but they are lower priority than the new machine orchestration and contract surfaces. Size alone is not the reason to change them.

### Evidence behind the priorities

| Source | Observed behavior |
|---|---|
| `src/main/sessions/core.ts`, `getGmuxCore()` and `createSession()` | Acquisition returns the existing core while `shutdownPromise` is active; the mutator has no shutting-down guard or admission join. |
| `src/main/sessions/__tests__/core-singleton.test.ts` | The regression test explicitly expects acquisition during held shutdown to return the same live core. It proves one boot, not refusal of mutation. |
| `src/main/machines/remote-sessions.ts`, create confirmation and row cleanup | A broad confirmation catch returns `null`; its caller treats that value as nothing running and drops the declaration. |
| `src/main/machines/exec-plane.ts` and `remote-clone.ts` | Promisified `execFile` children are not registered with shutdown; remote clone may run for up to ten minutes. |
| `src/main/machines/remote-record.ts` and machine-removal IPC | A per-row tombstone failure returns false, the loop can continue, and machine configuration is removed after the loop. |
| `src/main/quickopen/rows.ts` and `worker.ts` | Recent membership joins root and relative path with a literal space and decodes at the first space. |
| `src/renderer/env.d.ts` and renderer bridge consumers | `Window.gmux` is required as a whole while most installed capability members are optional; renderer compatibility casts compensate. |
| `src/shared/__tests__/source-scan.test.ts` | The cycle protection declares a fixed-string strategy, so it cannot discover a new SCC. |
| Production build output | Machine context, renderer stores and probe drivers are both dynamically and statically reachable, so those dynamic imports do not create ownership or bundle boundaries. |

## Benchmark against named exemplars

The exemplars supply specific patterns, not a wholesale target architecture.

| Dimension | Observed exemplar | Gmux today | Decision |
|---|---|---|---|
| Electron process ownership | Electron defines main as the application/lifecycle owner, renderer as a web boundary and preload/contextBridge as the privileged adapter. | Gmux follows this model and keeps one domain-oriented bridge. | Preserve. [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) |
| Lifecycle state and joins | VS Code records quit intent, one pending shutdown promise and named shutdown joiners. | Gmux has ordered bounded shutdown, but core acquisition and remote executions are not all in that state machine. | Add a small explicit state and ledger; do not adopt VS Code's service container. [VS Code lifecycle service](https://github.com/microsoft/vscode/blob/main/src/vs/platform/lifecycle/electron-main/lifecycleMainService.ts) |
| Disposable ownership | VS Code's lifecycle helpers centralize ownership and reject late additions after disposal. | Gmux installers often return disposers, but remote children and a few feed operations sit outside the joined ledger. | Extend the existing installer/disposer pattern. [VS Code lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts) |
| Trusted IPC | GitHub Desktop keeps trusted sender ids centrally and removes them when their `WebContents` is destroyed. | Gmux matches this pattern for both windows and typed invokes. | Preserve. [GitHub Desktop trusted sender](https://github.com/desktop/desktop/blob/development/app/src/main-process/trusted-ipc-sender.ts) |
| Typed IPC | GitHub Desktop shares named request and request-response channels. | Gmux is more domain-specific and its 172 invokes close today, but installed members remain optional and closure is not gated. | Keep the stronger domain shape; make it exact and mechanically protected. [GitHub Desktop IPC contract](https://github.com/desktop/desktop/blob/development/app/src/lib/ipc-shared.ts) |
| Remote identity | VS Code resolver contracts separate remote authority from a path-oriented resource. | Gmux uses the simpler `{ machineId, path }` model and refuses remote-to-local conversion. | Preserve the two-field divergence; it fits Gmux and prevents local `cwd` leakage. [VS Code remote resolver contract](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.resolvers.d.ts) |
| TypeScript build graph | Project references are intended to expose program boundaries and improve separation. | Gmux references projects, but web production still inherits test-driven main/Node reachability. | Split production from cross-process test programs so the graph tells the truth. [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html) |

Electron's security guidance also supports the existing context isolation, narrow exposed methods, sender validation and navigation restrictions. This audit does not propose exposing raw `ipcRenderer` or a generic remote-exec primitive. [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)

## Required invariants

Every phase must preserve these rules:

- The private tmux server remains the live-session authority.
- Packaged Gmux uses pinned bundled tmux 3.7b and refuses system/override resolution; development keeps its measured override path.
- SQLite application id, schema compatibility, migration order and snapshot formats do not change without a separately reviewed data change.
- A manifest declaration commits before local or remote spawn.
- Machine and session ownership use immutable identity, never display names.
- An unreachable remote machine is not equivalent to a proven-absent session.
- `WorkspaceTarget` always retains both machine authority and path; remote targets never become local `cwd` strings.
- The renderer receives one context-isolated `window.gmux` bridge. No raw IPC or generic remote command surface is added.
- Main remains authoritative for disk, Git, processes, durable state and remote execution.
- Remote scripts remain allowlisted and control feeds remain exclusive from polling feeds.
- The renderer store facade and slices remain; no new global state framework is introduced.
- Search, symbols, quick open and other workers keep their current process boundaries and lazy behavior.
- Probe environment names, outputs, isolation and exit behavior remain stable; probes continue to exercise shipped paths.
- Every invoke has exactly one declared contract, one preload implementation and one trusted main handler.
- The contract inventory must match after every phase. A deliberate contract change is re-baselined and explained in the same commit.

## Phased implementation order

| Phase | Change | Protection required first |
|---|---|---|
| 0 | Add fail-closed core lifecycle state and join admitted mutations | Real-handler shutdown race, core singleton, snapshot/generation, quit and durability tests. |
| 1 | Make remote-create confirmation tri-state and preserve unknown declarations | Partition-after-exec, restart/reconcile, immutable identity and duplicate-prevention tests. |
| 2 | Add a remote execution ledger and transactional machine removal | Held-child quit test; kth-row fault/rollback and idempotent retry tests. |
| 3 | Replace delimiter recents encoding and add exact IPC closure/type fixtures | Space-containing local/remote paths, legacy decoder, 172-way declared/preload/main closure. |
| 4 | Break all six runtime SCCs and install an AST cycle gate | Graph fixtures first; run the full renderer/main focused suites after each cut. |
| 5 | Make the TypeScript production reference graph truthful | Forbidden package/builtin fixtures, typecheck, test discovery, import boundary gate. |
| 6 | Split machine contracts and orchestration behind stable facades | Contract inventory, remote parity, restore, feed and fault-point suites. |
| 7 | Extract App controllers and gate probe registration | Keyboard/menu/quit tests, all shipped-path harnesses, build containment and screenshots. |
| 8 | Extract FileTree controllers and lower state-to-app dependencies | Boundary gate, boot/copy/resume and tree interaction tests, visual comparison. |
| 9 | Reassess shared types, agent registry and Git service using responsibility evidence | Domain tests and stable barrel/facade imports; no split triggered by line count alone. |

Each phase is independently shippable and behavior-preserving. Do not combine durability/lifecycle work with broad file moves: the failure proofs need a small review surface.

## Not part of this audit

Do not combine this simplification with renderer sandboxing, a utility-process migration, a daemon or broker, a service container, a generic remote-exec API, a global dispatcher, a renderer state rewrite, a custom application protocol, a data migration other than the backward-compatible recents decoder, or a UI redesign. Those alter product or runtime boundaries and require separate evidence.

## Verification baseline

- `npm run typecheck` passed: 763 production files, 4,334 imports, zero top-level process-boundary violations and the sole-owner package rule passed.
- `node build/contract-inventory.mjs --check` matched the committed baseline exactly.
- An independent AST inventory found 172 declared invokes, 172 preload invokes and 172 main handlers.
- `npm run build` passed all refusal and containment checks. Vite reported that several intended dynamic imports are also statically reachable, including machine context, renderer state/editor stores and probe drivers; this is evidence for the cycle and harness findings, not a failed build.
- The full test run completed with 7,043 passed, 4 failed and 2 skipped tests out of 7,049. The same four failures reproduced in isolation: three FSEvents watcher-start failures and one process-lineage assertion. These are the same environmental failure classes documented by the earlier audit, not proof of a new source regression.
- This audit did not boot Electron, touch the live `gmux` tmux socket or manifest, run smoke/fault/package workflows, exercise a live remote SSH target, or perform suspend/quit acceptance on a live process.
- The working tree was clean before the audit document and authority pointers were changed.

## Appendix A: Assessment record

### Method

Four parallel read-only tracks examined prompt/history provenance, main lifecycle/durability, renderer/IPC/build and an adversarial synthesis. Each track identified owners and callers, traced data or event flows, compared the current source with the assessed 16 August snapshot, proposed the smallest behavior-preserving seam and named the proof needed before implementation.

The adversarial pass retested claims rather than averaging opinions. It rejected a naïve eight-cycle count because two cycles depended on type-only imports, qualified the remote domain as both factored and concentrated, lowered FileTree and shared-types urgency, and argued that shipped-path probes are a strength whose registration is coupled. It proposed 25/36; the final score is 24/36 because an unreachable remote create being treated as absence does not satisfy the rubric's score-3 requirement for failure flow.

Files were judged by reasons to change and dependency direction, not numeric size. `remote-sessions.ts` is a finding because it owns machine state, create/kill/rename, projections, feeds, restore facts and rescue. The agent registry is mostly declarative and is therefore lower priority despite its size.

### Rubric

| Score | Meaning |
|---|---|
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, cycles, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

### Scorecard

| Area | 16 August | Current | Assessment |
|---|---:|---:|---|
| Process ownership | 3 | 3 | The four layers and main-only resources remain explicit and import-gated. |
| Composition | 2 | 2 | Stable facades exist; core, remote sessions, machine contracts and App collect several controllers. |
| IPC capability | 2 | 2 | Domain methods, sender trust and current runtime closure are strong; installed optionality and missing closure gate prevent 3. |
| Domain cohesion | 2 | 2 | Remote modules are focused, but their public contract and session orchestrator span many subdomains. |
| Dependency direction | 2 | 1 | Six runtime SCCs and state-to-app/editor edges make internal ownership bidirectional. |
| State ownership | 3 | 3 | Renderer slices/facade and main durable owners remain clear. |
| Lifecycle | 1 | 2 | Earlier gaps were repaired and shutdown is ordered/bounded; late core mutations and remote children remain outside closure. |
| Type truth | 2 | 2 | Contracts are strong; optional installed members and web/main/Node project reachability remain exceptions. |
| Failure flow | 3 | 2 | Most recovery is explicit, but unreachable remote create is incorrectly collapsed into absence and removal can partially commit. |
| Test seam | 2 | 2 | Fault plans and focused modules test well; effectful core/remote workflows and graph closure remain broad. |
| Navigation | 2 | 1 | Remote growth is discoverable by domain but concentrated orchestration and contracts make call paths expensive to follow. |
| Build boundary | 2 | 2 | Process gates and containment pass; runtime SCC, builtin imports and IPC closure are not all enforced. |
| **Total** | **26/36** | **24/36** | **Strong outer architecture; internal safety and direction need the next phased pass.** |

## Appendix B: Prompt reconstruction

### Direct prompt for the 16 August audit

> In a prior session we used a prompt to produce docs/audits/2026-08-14-electron-typescript-architecture.md as an assessment. Since then, there has been project change in this repo. Please reverse engineer what the prompt likely was, and produce a new audit in similar format making astute recommendations for keeping the architecture of this app tidy. Use and fan out sub agents as required

### Original prompt for the 14 August audit

> I would like you to look at and assess this codebase by first: 1) researching and assessing typescript best practices for electron apps in terms of app architecture and code cleanliessness 2) build that into an audit that a set of fanned out sub agents can first a. use to map the AS-BUILT-ARCHITECTURE of this repo and 3) assess areas that would make the logic and file structure significantly simpler WITHOUT changing the functionality of the app but by reducing patterns / practices from step 1 that make it easy and delightful to read and maintain. In step one, it may be useful to add research to assess named examplars of well maintained analogues.

### Reproducible operational prompt

Use this expanded prompt to reproduce the review method without depending on hidden session history:

> Read the prior architecture audit in full. Recover its actual creation prompt from local session history, distinguishing direct prompt from upstream prompt. Determine the exact source snapshot the prior audit assessed and compare that snapshot with current HEAD; reconcile working-tree changes separately. Fan out read-only tracks for prompt archaeology, main/lifecycle/durability, renderer/IPC/build, and adversarial synthesis. For every track, identify owners and callers, trace important data and event flows end to end, mark each earlier recommendation landed/partial/open/superseded, propose the smallest behavior-preserving seam, and name the proof or fault test required. Build a runtime import graph that excludes type-only edges. Benchmark only relevant patterns against named, current exemplars such as Electron, VS Code, GitHub Desktop and TypeScript project references; record intentional divergences. Put correctness, durability and lifecycle defects before structural cleanup. Preserve public/durable contracts, process boundaries, UI behavior, immutable identity, manifest-before-spawn, one context-isolated bridge and allowlisted remote execution. Produce an outcome, baseline delta, Today tree and flows, Tomorrow tree and flows, prioritized findings, evidence, exemplar comparison, invariants, independently shippable phases, exclusions, verification baseline, scorecard using the existing 12-area 0-3 rubric, and prompt provenance. Run typecheck, import/boundary checks, contract inventory, runtime IPC closure, production cycle analysis, build and tests as feasible. State clearly which live Electron, tmux, manifest, remote and packaging checks were not run. Preserve user work.

The 16 August direct prompt came from Codex session `01a00cd9-59d7-7a32-b7bd-239931883abc`. The 14 August original prompt came from session `01a00345-cd58-7f11-8dec-6f77441d359d`; its audit was created in commit `d1e0a17`. The 16 August follow-up assessed `a648cbd` and was later published in `e27eee4`.
