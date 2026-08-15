# Electron and TypeScript architecture simplification

Date: 2026-08-14

## Outcome

Tortie does not need an architectural rewrite. Its important runtime boundaries are sound: main owns privileged work, the renderer reaches it through one preload bridge, the private tmux server owns live sessions, and SQLite and snapshots own recovery.

The maintenance cost is concentrated in a few files that accumulated many unrelated responsibilities. The simplification is to keep the existing boundaries and turn those central files into small coordinating facades with focused modules behind them.

The app's behavior and user interface should not change.

## Today

This is the relevant part of the current tree. Unaffected domain folders are omitted.

```text
src/
├── shared/
│   ├── ipc.ts                         3,269 lines
│   └── types.ts                       1,263 lines
│
├── preload/
│   └── index.ts                       entire renderer bridge
│
├── main/
│   ├── index.ts                       2,231 lines
│   │                                  boot + windows + harnesses
│   │                                  + registration + shutdown
│   ├── typed-ipc.ts                   typed calls, limited trust checks
│   ├── attach/
│   │   └── attach-host.ts             native PTY host in main
│   ├── sessions/
│   │   └── core.ts                    2,931 lines
│   └── manifest/
│       └── store.ts                   2,163 lines
│                                      schema + queries + reconciliation
│
└── renderer/
    ├── app/
    │   └── App.tsx                    1,168 lines
    │                                  shell + lifecycle + harness logic
    └── state/
        └── store.ts                   1,820 lines
                                           ▲
                                           │
                               imported by 74 modules
```

The current feature path is:

```text
feature component
→ local window.gmux cast or feature check
→ one large shared IPC contract
→ one large preload implementation
→ manually registered main handler
→ central session or domain service
→ tmux, SQLite, filesystem, git, or worker
```

Two lifecycle paths are also spread across their owners:

```text
main startup                         renderer startup
→ register capabilities manually    → useApp.boot()
→ start windows and services         → hydrate state
→ maintain a separate quit list      → install long-lived listeners
→ dispose each item manually         → retry can install them again
```

## Tomorrow

The target tree keeps one bridge, one public app-store facade, one main session owner, and the existing domain folders. It splits only the implementation hidden behind those stable entry points.

```text
src/
├── shared/
│   ├── ipc/
│   │   ├── sessions.ts
│   │   ├── terminal.ts
│   │   ├── projects.ts
│   │   ├── git.ts
│   │   ├── files.ts
│   │   ├── search.ts
│   │   ├── context.ts
│   │   ├── app.ts
│   │   └── index.ts                   InstalledGmuxApi composition
│   └── types/                         focused shared domain types
│
├── preload/
│   ├── sessions.ts
│   ├── terminal.ts
│   ├── projects.ts
│   ├── git.ts
│   ├── files.ts
│   └── index.ts                       one bridge assembly and expose call
│
├── main/
│   ├── index.ts                       short composition root
│   ├── capabilities.ts                installation + ordered disposal
│   ├── security/
│   │   └── trusted-window.ts          navigation + IPC sender policy
│   ├── harness/
│   │   ├── basic.ts
│   │   ├── durability.ts
│   │   ├── identity.ts
│   │   └── shot.ts
│   ├── attach/
│   │   └── attach-host.ts             remains in main
│   ├── sessions/
│   │   ├── core.ts                    durable orchestration
│   │   ├── launch-plan.ts             pure decision logic
│   │   └── reconcile-plan.ts          pure decision logic
│   └── manifest/
│       ├── store.ts                   stable facade
│       ├── schema.ts
│       ├── codecs.ts
│       ├── sessions-repository.ts
│       ├── projects-repository.ts
│       ├── restore-journal.ts
│       └── reconciliation.ts
│
└── renderer/
    ├── app/
    │   └── App.tsx                    shell composition only
    ├── state/
    │   ├── index.ts                   stable useApp facade
    │   ├── subscriptions.ts           one lifecycle owner
    │   ├── projects-slice.ts
    │   ├── sessions-slice.ts
    │   ├── chrome-slice.ts
    │   ├── overlays-slice.ts
    │   └── notices-slice.ts
    └── shot/
        └── install-driver.ts           isolated screenshot harness
```

The target feature path is:

```text
feature component
→ exact InstalledGmuxApi method
→ domain IPC contract and preload method
→ domain main handler
→ domain service
→ pure decision plan where policy is complex
→ focused persistence or process adapter
```

The target lifecycle paths are:

```text
main startup                         renderer startup
→ installMainCapabilities(deps)      → hydrateAppState()
→ receive one ordered disposer       → startAppSubscriptions()
→ create windows                     → App owns returned unsubscribe
→ invoke disposer during quit        → retry hydrates without resubscribing
```

In short:

```text
large implementation file
→ small table-of-contents facade
→ focused domain modules
→ pure, directly tested decisions
```

## Why these seams

The evidence is concentrated enough to justify a focused change:

| Evidence | Why it matters |
|---|---|
| Five coordination files range from 1,820 to 3,269 lines | Each combines several concepts that change for different reasons. |
| `src/shared/ipc.ts` declares 124 invoke channels in 36 maps | A domain split makes capabilities findable without changing the bridge. |
| The runtime preload API is an intersection of 26 interfaces, while `Window.gmux` declares only the older base API | Renderer code compensates with casts and feature checks instead of relying on one truthful contract. |
| 49 production renderer files read `window.gmux` | Boundary drift is repeated throughout the UI. |
| 74 production renderer modules import the shell store | The public facade is useful, but its implementation needs internal ownership boundaries. |
| Four production file import cycles remain | A few shared leaves still sit with the wrong owner. |

The approach follows three relevant practices:

- Electron recommends a narrow context-isolated bridge, sender checks for privileged IPC, and restricted navigation. [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security) [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- TypeScript project references can enforce the runtime dependency graph after the physical split exists. [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
- VS Code makes runtime ownership visible in its source tree, while GitHub Desktop keeps native work behind named proxies. Tortie should take those boundaries without adopting their larger service containers or dispatch frameworks. [VS Code source organization](https://github.com/microsoft/vscode/wiki/source-code-organization) [GitHub Desktop](https://github.com/desktop/desktop)

## Required invariants

Every move must preserve these rules:

- The private tmux server remains the live-session authority.
- SQLite transactions, schema versions, snapshot formats, and localStorage keys remain unchanged.
- A manifest declaration still commits before tmux spawn.
- Session ownership still uses immutable identity, never display names.
- `AttachHost` remains a main-process native PTY host unless a separate measured project proves a process move worthwhile.
- The renderer still receives one context-isolated `window.gmux` bridge.
- Main remains authoritative for disk, git, processes, and durable sessions.
- Search, symbols, quick open, and other existing workers stay lazy and keep their current process boundaries.
- Harness environment names, outputs, isolation, and exit behavior remain unchanged.

## Implementation order

| Phase | Change | Protection required first |
|---|---|---|
| 0 | Let current quit, watcher, and layout work settle | Review the overlapping working-tree changes. |
| 1 | Centralize trusted-window and IPC sender policy | Sender, navigation, invoke-closure, and AttachHost cleanup tests. |
| 2 | Introduce `InstalledGmuxApi`; split shared IPC and preload by domain | Typecheck, IPC closure, preview containment, packaged smoke. |
| 3 | Extract main harnesses; install capabilities through one disposer | Existing harnesses, quit smoke, build, and package checks. |
| 4 | Separate renderer hydration from subscriptions; compose internal store slices | Repeated-start, retry, cleanup, and notice-drain tests. |
| 5 | Extract pure launch and reconciliation plans | Durability, identity, fault, and resume conformance suites. |
| 6 | Split manifest schema, codecs, and repositories behind `ManifestStore` | Manifest, recovery, and durability smoke suites. |
| 7 | Add shared, main, preload, and renderer TypeScript project boundaries | Typecheck build mode and forbidden-import checks. |
| 8 | Remove the four cycles, the literal source NUL, and confirmed duplicate parsers | Focused unit and source-scan tests. |

## Not part of this simplification

Do not combine these structural changes with renderer sandboxing, a custom application protocol, a utility-process migration, a service container, a global dispatcher, data migrations, or UI redesign. Each would change a runtime or product boundary and needs its own evidence.

## Audit verification baseline

- `npm run typecheck` passed against the reviewed working tree.
- The full test run completed with 3,277 passed, 35 failed, and 2 skipped tests. Most failures were integration timeouts under full parallel load; the audit changed no app source.
- A focused IPC and preview set passed 20 tests.
- The audit did not boot Electron, touch the live `gmux` tmux socket, open a live manifest, or run durability smoke.

## Appendix A: Assessment record

This appendix retains the context needed to understand how strongly the evidence supports the proposed simplification. It is not an additional implementation plan.

### Assessment method

Three read-only reviews mapped the main and durability runtime, IPC and build boundaries, and renderer state and UI. Each review had to identify the current owner and callers, trace the data or event path, name the invariant that must survive, propose the smallest useful seam, and identify tests for that seam.

Files were judged by responsibility and dependency direction, not line count alone. A large file was a finding only when it combined concepts that change for different reasons or prevented a narrow test seam.

Scores use this scale:

| Score | Meaning |
|---|---|
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts, or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow, and protected by tests or build checks. |

### Scorecard

| Area | Score | Assessment |
|---|---:|---|
| Process ownership | 2 | Runtime folders are clear. Main-owned PTYs and stale utility-process documentation weakened the map. |
| Composition | 1 | Entry points and central owners also implement workflows and harnesses. |
| IPC capability | 1 | Named methods and one bridge are strong. Sender and runtime input checks are not central. |
| Domain cohesion | 1 | Domain folders are clear, but five central files combine several concepts. |
| Dependency direction | 1 | Renderer avoids Electron and Node imports. State still imports UI helpers, and shared contracts leak runtime types. |
| State ownership | 2 | tmux, SQLite, main status, renderer selection, and domain caches have named owners. |
| Lifecycle | 1 | Local cleanup is often strong. App subscriptions and main disposal lack one owner. |
| Type truth | 1 | Strict TypeScript is strong. The declared global bridge does not match the installed preload object. |
| Failure flow | 3 | Restore, snapshot, search, and recovery failures use explicit outcomes and bounded fallbacks. |
| Test seam | 2 | Pure policy modules test well. Central orchestration still needs broad stubs or live harnesses. |
| Navigation | 1 | Product folders help, but append-only coordination files and four cycles slow call-path tracing. |
| Build boundary | 2 | Typecheck, tests, bundle assertions, packaging checks, and smoke gates are strong. Runtime type layers are not fully enforced. |

### Strengths to preserve

- Durable operations make their order visible, especially the manifest commit before process spawn.
- Session ownership uses immutable identity instead of user-visible names.
- Restore and recovery code uses discriminated outcomes rather than hiding partial failure.
- Existing pure modules for restore journals, tmux parsing, recovery contracts, and scheduling show the desired pattern.
- Terminal panes, repository-change fan-out, editor navigation, workers, and many local services already have focused ownership and cleanup.
- Synchronous SQLite transactions are intentional where they protect ordered durable commits.

### As-built corrections

The earlier pre-build architecture report is a decision record, not a current source map:

- The app has a main renderer and a Settings renderer. It is not strictly a one-window build.
- `AttachHost` imports `node-pty` and runs inside Electron main. The repository does not use Electron `utilityProcess` or terminal `MessagePort` transport.
- Current development and packaged code resolve a system tmux. A pinned bundled tmux remains planned work.
- Both windows use context isolation and disable Node integration. Renderer sandboxing remains disabled.
- The main window restricts navigation and new windows. The Settings window does not yet apply the same centralized policy.

These corrections explain why a utility-process move, sandbox flip, custom protocol, or tmux packaging change is excluded from this simplification.

### Verification limits

The review inspected the live checkout and ran static and focused checks. It did not prove packaged runtime behavior, live manifest recovery, tmux durability, or sandbox compatibility. The working tree also contained unrelated quit, watcher, and layout work, so recommendations touching those owners must begin after that work settles.

### Material intentionally left out

The streamlined report does not retain the original reviewer instructions, repeated descriptions of boot/create/reconcile/restore flows, detailed prose for every finding, the full list of already modified files, or duplicate research checklists. Their conclusions are represented by the before/after flows, scorecard, invariants, evidence table, and implementation order above.
