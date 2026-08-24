# Architecture plan for an evidenced 36 out of 36

Date: 22 August 2026

Refreshed: 23 August 2026 after Phases 127, 128, 140 and 142

Status: Proposed implementation plan. This supplements the 20 August architecture audit. It does not replace that audit as the architecture authority.

Original assessed source baseline: `7a1c55becb4c28dfdb0b8a0355d623413fc35196`

Refreshed source baseline: `2905051b9ed090e63fb73c4a766f2bf1be44fd3e`

Recovery provenance: the original plan was committed as `66569d0`, then lost from the branch by a later reset before it was pushed. This edition restores that exact document and updates its measurements and ordering against the refreshed baseline.

Current score: 30 out of 36

## Outcome

Tortie can reach 36 out of 36 without changing its normal behaviour or rewriting the app.

The work must close 6 remaining points across 6 boundary categories. A score of 3 requires an explicit owner, a narrow interface and a gate that prevents the old problem from returning. Moving code into smaller files is not enough.

The order is safety work first. Structural changes follow only after shutdown and durability rules are correct. Each stage must ship as its own commit and keep the existing public and durable contracts.

The plan does not promise that every proposed split will survive implementation. A reassessment may show that an existing owner is already cohesive. In that case, the phase must record the evidence and keep the owner. The final score comes from a new independent audit, not from completing a checklist.

## Current position

The fresh review at the baseline commit scored the app as follows.

| Area | Score | Gap that prevents 3 |
| --- | ---: | --- |
| Composition | 2 | `GmuxCore` and remote sessions still coordinate several effectful workflows each |
| Domain cohesion | 2 | The machine contract split landed, but main machine registration and remote session ownership remain broad |
| Dependency direction | 3 | Runtime cycles are gone and the renderer directory wall now prevents state from importing app and editor owners |
| Lifecycle | 2 | Core and remote children are owned, but app quit intent does not close every renderer IPC door before the first await |
| Type truth | 2 | Shared code no longer receives Node or Electron types, but it still receives the whole DOM library |
| Failure flow | 2 | Remote create and machine removal fail honestly, but a journaled clone continues when its durable start row cannot commit |
| Test seam | 2 | Fault coverage is strong, but several large effectful owners remain and some full-suite checks depend on the host |
| Navigation | 3 | App, tree and machine presentation workflows have named owners protected by import and containment gates |

The areas already scored 3 are process ownership, IPC capability, state ownership, build boundary, dependency direction and navigation. Every stage must keep them at 3.

Commit `82c4eff` landed the machine contract split and shared SCM service from Phases 125 and 126. Commit `a60dc8e` then landed Phase 127: `App.tsx` fell from 1,632 to 351 lines at that commit, `FileTree.tsx` fell from 1,789 to 678, probe registration became gated, and the renderer directory wall closed the remaining dependency-direction exception. Commit `e0ce10b` recorded the Phase 128 reassessment and correctly kept 3 large but cohesive owners. Commit `4d246f1` made every Electron probe use one teardown-aware runner. Commit `2905051` split the 2,948-line machine presentation catalogue into capability owners and extended the renderer ownership gate. Together these changes earned 3 points. They do not close the remaining exceptions listed above.

## What 3 means

The rubric has 4 levels.

| Score | Meaning |
| ---: | --- |
| 0 | The responsibility is hidden or has no contract |
| 1 | A boundary exists, but central files or repeated wiring weaken it |
| 2 | The boundary is clear, with local exceptions |
| 3 | The boundary is explicit, narrow and protected by tests or build gates |

This plan does not use file length as an acceptance rule. Length is evidence only when a file owns unrelated reasons to change.

## Rules that every stage must preserve

Each stage must preserve these rules:

- sessions remain in Tortie's private tmux server
- the app remains a disposable client of that server
- session and machine identity remain immutable
- the manifest commits before a durability-sensitive process starts
- remote commands remain allowlisted
- control feeds and poll feeds remain exclusive
- one context-isolated preload bridge remains the only renderer capability door
- every current IPC channel keeps its name, request, response and event payload
- normal UI copy and behaviour remain unchanged unless the stage describes a failure-only correction
- shipped-path probes continue to use production implementation paths
- user work and live sessions remain untouched by verification

The plan excludes these changes:

- no framework or service container
- no second preload bridge
- no new extension system
- no durable schema rewrite
- no tmux identifier rename
- no visual redesign
- no line-count target
- no combined product feature and architecture phase

## Reference patterns

The plan uses 4 external references.

| Reference | Pattern to adopt | Intentional Tortie difference |
| --- | --- | --- |
| [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model) | Main owns application lifecycle. Preload exposes narrow privileged capabilities through `contextBridge`. Renderer remains a web process. | Tortie's durable runtime is its private tmux server, not the Electron main process |
| [VS Code lifecycle service](https://github.com/microsoft/vscode/blob/main/src/vs/platform/lifecycle/electron-main/lifecycleMainService.ts) | Quit intent is recorded once. One pending quit promise owns the sequence. Named joiners settle before shutdown completes. | Tortie should use a small module and existing composition root, not VS Code's service container |
| [GitHub Desktop trusted IPC sender](https://github.com/desktop/desktop/blob/development/app/src/main-process/trusted-ipc-sender.ts) | Privileged IPC accepts only trusted `WebContents` owners and removes trust when they are destroyed. | Tortie also needs a monotonic quit refusal because its renderer stays alive during durability work |
| [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html) | Project references state the logical build graph and stop ambient types crossing process boundaries. | Tortie keeps shared serialisable contracts rather than making a package for each process |

## Implementation order

The order is:

```text
refreshed baseline and contract lock
    |
    v
1. close every IPC door when quit starts
    |
    v
2. refuse an unjournaled remote clone
    |
    v
3. remove the DOM library from shared
    |
    v
4. finish main composition and machine cohesion
    |
    v
5. make workflow and conformance tests hermetic
    |
    v
6. run an independent audit and rescore
```

Stages 1 and 2 correct failure behaviour. Stage 3 changes compile-time visibility only. Stage 4 is a behaviour-preserving structural change. Stage 5 changes the verification system. Stage 6 changes no production code. Renderer direction, App and tree controllers, probe registration and machine presentation ownership all landed before this refreshed baseline and are no longer future work.

## Stage 0 lock the baseline

Goal: Make the starting contracts and measurements reproducible before moving code.

Record these baseline facts in the implementation commit body:

- 184 invoke channels
- 904 production files in the import boundary gate
- 903 production files in the runtime graph
- 5,159 production imports
- 3,072 runtime edges
- 0 runtime strongly connected components
- manifest schema version 17
- contract inventory matches `docs/audits/contract-baseline.txt`

Run these checks before Stage 1:

```text
npm run typecheck
npm run build
node build/contract-inventory.mjs --check
npm test
npm run smoke:t1
```

Exit rule: The baseline is recorded. Existing host-sensitive failures are classified with evidence. No production file changes in this stage.

Score after this stage: 30 out of 36.

### Stage 0 ran on 2026-08-24 and re-locked the baseline

Phase 144 ran this stage on tree `6e3bdb5`, version 0.72.0. Every number below was measured by running the real gate on that tree, and every plan number was re-derived by running the same gate at the refresh source baseline `2905051` in a scratch worktree rather than trusting the list above.

| Fact | Plan | Measured at `2905051` | Today at `6e3bdb5` |
| --- | ---: | ---: | ---: |
| invoke channels | 184 | 187 | 190 |
| production files in the import gate | 904 | 904 | 912 |
| production imports | 5,159 | 5,159 | 5,229 |
| production files in the runtime graph | 903 | 903 | 911 |
| runtime edges | 3,072 | 3,072 | 3,113 |
| strongly connected components | 0 | 0 | 0 |
| manifest schema version | 17 | 17 | 17, min compatible 13 |
| contract inventory | matches | matches | matches byte for byte |

Why each number moved, with every mover named:

- The plan's 184 invoke channels was already stale at its own refresh. The committed `docs/audits/contract-baseline.txt` at `2905051` reads 187, because Phase 137 added `overview:project` and `overview:sessions` at `cecd6fe` and Phase 138 added `fold:options` at `56c9c59` earlier that same day, and the refresh carried the new file and edge counts but not the new channel count. After the refresh, Phase 143 added `overview:timeline` and `overview:timelineTurns` at `75a5298`, and Phase 141 added `sessions:resumeInPlace` at `b4f0fc9`. 184 plus those six is 190, and each addition re-baselined the inventory in its own commit, so `--check` stays byte for byte.
- The file, import and edge counts were exact at `2905051`. They moved in three production commits, measured by running both gates at each commit in the scratch worktree. Phase 138.1 at `d4c4d29` added 2 files, 11 imports and 6 edges. Phase 143 at `75a5298` added 5 files, 34 imports and 20 edges. Phase 141 at `b4f0fc9` added 1 file, 25 imports and 15 edges. Phase 146 at `ed056da` touched one test file and moved no production number.
- Cycles and the manifest schema did not move. The runtime graph still has 0 strongly connected components, and the scratch manifest the inventory builds through the real migration runner still reads `user_version=17` and `min_compatible_version=13`.

The whole Stage 0 battery ran green on `6e3bdb5`. `npm run typecheck` and `npm run build` both exit 0, with the Electron teardown gate reading 129 files under `build/` and finding every launcher on `build/electron-run.mjs`. `node build/contract-inventory.mjs --check` matches byte for byte. `npm test` passes 9,311 tests with 2 skipped. `npm run smoke:t1` passes 6 of 6 and ends its scratch tmux server. There is no host sensitive failure to classify because nothing failed. The one skipped test file is `src/main/tmux/__tests__/scroll.integration.test.ts`, and that skip is opt-in by design behind `GMUX_SCROLL_IT=1` at its line 45 because it builds a 200,000 line scratch session. The two host conditional integration files, the context scan and the search time to first result, both ran and passed on this machine.


## Stage 1 close IPC when quit starts

Target area: Lifecycle, 2 to 3.

Risk: Tier 3. This stage touches quit ordering and durability.

### Current problem

`src/main/index.ts` records `quitFlowStarted` before it awaits teardown. The state is local to that file. `src/main/typed-ipc.ts` cannot read it.

`disposeMainCapabilities()` awaits `shutdownGmuxCore()` before it calls `beginRemoteExecutionShutdown()`. The renderer remains alive during that wait. A renderer request can still reach filesystem, Git or machine mutation handlers.

### Required shape

Add one main-owned lifecycle module with a monotonic state:

```text
running -> quitting
```

The composition root sets `quitting` synchronously in the first `before-quit` pass. No await may appear before that state change.

The one typed invoke wrapper refuses every new renderer invoke after the state changes. Internal shutdown work does not use renderer IPC, so it keeps its existing narrow direct calls.

Use the existing typed `SHUTTING_DOWN` error shape. Do not add a second error transport.

Keep remote execution ownership and joins where they already live. This stage changes when admission closes, not who owns each child.

### Proof

The Tier 3 proof must:

- hold core shutdown open at its first await
- start quit through the real composition root
- invoke a real filesystem write handler
- invoke a real Git mutation handler
- invoke a real machine mutation handler
- invoke a real remote execution handler
- prove that each request receives `SHUTTING_DOWN`
- prove that none writes, spawns or changes the manifest
- prove that work admitted before quit is still joined
- run the existing quit and durability smoke checks

Add a build or source gate that proves every `ipcMain.handle` still goes through `src/main/typed-ipc.ts`.

### Exit rule

Lifecycle scores 3 only when quit intent is monotonic, visible to the one IPC wrapper and protected by real-handler race tests.

Projected score: 31 out of 36.

### Stage 1 ran on 2026-08-24 and the doors close

Phase 144 landed the required shape as three small pieces. `src/main/lifecycle.ts` is the one main owned lifecycle module, holding the monotonic `running` to `quitting` state, the reader, and the Phase 116 refusal sentence, with no export that puts the state back. The composition root's first `before-quit` pass calls `markAppQuitting()` synchronously, before `event.preventDefault()` and before any await, and its second pass and the second instance guard now read the same state, so the old file local boolean is gone. The one typed invoke wrapper in `src/main/typed-ipc.ts` refuses every new renderer invoke after the flip with the existing typed `SHUTTING_DOWN` payload and dispatches nothing. Ownership and joins did not move: the disposer, the core lifecycle and the remote execution ledger are exactly where Phase 36, 116 and 118 left them.

The Tier 3 proof is `GMUX_SMOKE=quit-doors` (`npm run smoke:quitdoors`), and it drives real handlers through the real window and the real preload. In one Electron process on an isolated profile and socket it proved: a real `fs:writeFile` lands while running, so the instrument passes traffic; a `sessions:create` invoked through the real door before quit is admitted and resolves with its session while the held shutdown is still inside the snapshot pass, so admitted work is joined; the real `app.quit()` flips the lifecycle inside the first `before-quit` pass; and held in the exact window the defect named, inside `shutdownGmuxCore()` and before `beginRemoteExecutionShutdown()`, four real handlers, `fs:writeFile`, `git:init`, `machines:add` and `machines:cloneProject`, all reject with the typed `SHUTTING_DOWN` payload. Nothing happened underneath: the refused write's file does not exist, the refused init made no repository, `machines.json` is byte for byte unchanged, the manifest row count and tmux session count are unchanged at 1 and 1, and the remote execution ledger owns zero children. The probe then releases the hold and lets the real quit finish, so the process exit code is the quit path's own verdict, and it exits 0.

Both halves of the fix were then reverted one at a time as negative controls, and the proof caught each. With the wrapper's gate blinded, the probe failed at its refusal step with `fs:writeFile was NOT refused after quit started: the handler ran`, which is the pre fix defect reproduced against a real handler. With the state change moved behind the disposer's await, the probe failed at its quit step with `the lifecycle does not read quitting: the state change is not synchronous`. Both files were restored byte for byte, md5 `13300822ad7aebdf8a2592102f0f2b6a` for `src/main/index.ts` and `52f3de1d3e8d0aba96fe194b15f109dd` for `src/main/typed-ipc.ts`, and the restored tree passed the full proof again.

The gate the exit rule asks for is two tests that together close the surface: guardrail 1 in `src/shared/__tests__/ipc-single-bridge.test.ts` already proves nothing outside `src/main/typed-ipc.ts` calls `ipcMain.handle`, and the new `src/main/__tests__/quit-admission.test.ts` proves the wrapper has exactly one `ipc.handle` call site with the lifecycle check ahead of the dispatch, that the before-quit pass flips the state before the deferral and before any await, read from comment stripped source, and at unit level that a trusted invoke is admitted while running and refused without its handler being called once quitting. The lifecycle module's export surface is pinned so a way back to `running` cannot appear quietly. The battery after the change: typecheck and build green, 9,319 tests passing with the same 2 skips, `smoke:t1` 6 of 6, and the existing `smoke:quit` exit 0. The import gate reads 914 files and 5,244 imports and the runtime graph 913 files and 3,124 edges, being the two new modules, with 0 cycles.

Score after this stage: 31 out of 36.

## Stage 2 refuse an unjournaled remote clone

Target area: Failure flow, 2 to 3.

Risk: Tier 3. This stage changes behaviour only when durability is unavailable.

### Current problem

`src/main/machines/execution-ledger.ts` tries to write a durable start row before a remote clone starts. If that write fails, the ledger logs the error and starts the clone without a row.

The next launch cannot explain a partial remote folder if quit or crash interrupts that clone. The current unit test protects this fail-open behaviour.

### Required shape

For a journaled remote write, admission must complete its durable declaration before it calls the function that spawns the child.

If the journal is absent or the write fails, return a typed durability refusal. Do not call the spawn closure.

Keep non-journaled remote reads on their current path. Do not require a manifest row for capture, harvest, store sync or ordinary read commands.

Keep the existing open-row resolution on the next launch. It remains the explanation for a clone that started successfully and was later cut off.

### Proof

The Tier 3 proof must:

- inject a manifest write failure before clone admission
- prove that the spawn closure is never called
- prove that no SSH child is owned
- prove that no remote path changes
- prove that the user receives a durability sentence they can act on
- start a clone with a successful row
- cut it off during quit
- restart the app
- prove that the existing notice reports the uncertain remote folder once

Mutate the test back to fail open and show that the new proof fails.

### Exit rule

Failure flow scores 3 only when every uncertain-create and partial-write path preserves an explicit durable fact or refuses before mutation.

Projected score: 32 out of 36.

### Stage 2 ran on 2026-08-24 and a copy does not start without its row

Phase 144 landed the required shape inside `admitRemoteExecution` in `src/main/machines/execution-ledger.ts`, which is the one door every remote spawn goes through. For the journaled kind the durable declaration now completes before the spawn closure is called, in the same synchronous pass, and a row that cannot go down is a typed refusal rather than a warning: `FS_FAILED` carrying the pinned sentence `REMOTE_EXEC_NOT_RECORDED`, thrown whether the write failed or no journal is installed at all, with the closure never called. The four non journaled kinds keep their path untouched, the open row resolution at the next launch is unchanged, and `cloneProjectOnMachine` answers the refusal with the existing `refused` outcome and a new sentence that names the machine, says nothing crossed, names no path and tells the person to try again. The sentence and the refusal are both pinned in `build/assert-bundle-refusals.mjs`, the machine refusal count moved from 50 to 52, and `docs/audits/contract-baseline.txt` moved with it in the same commit as both gates instruct. No IPC channel, payload or outcome union changed.

The old unit test named "never lets a journal that will not write stop the work" pinned the fail open behaviour and was replaced by tests proving the opposite: a failed write refuses typed before the work runs, an absent journal refuses the same way, nothing is opened or classified for a refused copy, and every non journaled kind still runs with no journal at all. The Tier 3 proof extended `npm run smoke:p118`, which was also wired into package.json for the first time, with steps 1b to 1e ahead of its real copy: against a real scratch machine, with the journal swapped at its one real seam for one that throws, a probe closure was never called, the real clone door answered `refused` with the exact shipped sentence, the far side itself answered `no` about the refused destination while a non journaled read crossed the broken journal to ask it, the real manifest held zero rows, no process named the copy and the ledger held no clone entry. The run then continued into the unchanged restart half: a real copy with a good row, cut off by the real quit, its row left open, and one `remote-work-cut-off` notice at the next launch naming the machine and the folder with a count of one, then never again. The supervisor graded the recorded facts from outside the process and the operator's server held its 21 sessions before and after.

Both directions of the mutation control ran. The product blinded back to fail open made the new unit tests fail at the refusal and made the full harness fail at step 1b with "a copy whose start row could not be written was ADMITTED", exit 1, which is the pre stage defect reproduced against a real machine. The old fail open test reinstated against the new code fails with the typed refusal in its face, so neither the old pin nor the new proof is vacuous. The ledger was restored byte for byte, md5 `33704b1508a41c100ace55bffaa99229` before and after, and the restored tree passed the touched tests and the full battery again. One repair rode along and is named: `npm run conformance:machines` was red on the baseline because a Phase 141 comment in `src/main/sessions/resume-in-place.ts` spelled out the armed resume door's name, which gate 65 counts in bytes rather than code; the comment was reworded and the gate is green with no code change.

Score after this stage: 32 out of 36.

## Stage 3 remove DOM types from shared

Target area: Type truth, 2 to 3.

Risk: Tier 1. This stage changes compile-time declarations only.

### Current problem

`tsconfig.shared.json` includes the whole `DOM` library. Shared production code needs 2 narrow browser-shaped declarations:

- the `URL` constructor used by `src/shared/clone-url.ts`
- the `File` handle accepted by the preload drop contract

The full library also makes `window`, `document` and browser-only APIs look valid in shared code.

### Required shape

Remove `DOM` from `tsconfig.shared.json`.

Add narrow declarations for only the members used by the shared contracts. Keep them in a clearly named shared ambient file. Do not add Node types to compensate.

Use Electron's process-specific type entry points where Electron types are needed. Shared code must name none of them.

### Proof

Add compile fixtures that prove:

- the required `URL` operations compile
- the preload file handle contract compiles
- `window` fails in shared
- `document` fails in shared
- `process` and `Buffer` fail in shared
- `electron/main` and `electron/renderer` fail in shared

Keep the existing project reference and builtin import fixtures.

### Exit rule

Type truth scores 3 only when each process receives the ambient types it can use at runtime and the gate rejects the rest.

Projected score: 33 out of 36.

## Landed before this refresh: renderer direction and shell controllers

Phase 127 completed the old Stages 4 and 5. The import gate now contains a renderer directory wall, `App.tsx` is a shell rather than a controller warehouse, `FileTree.tsx` delegates its model, drag, menu and rename work, and probe registration loads through a gated owner. The normal renderer entry no longer pays for the shipped-path probe graph.

That work moved dependency direction from 2 to 3 and navigation from 1 to 2. The point is awarded because build gates protect both boundaries, not because the files became shorter.

## Landed before this refresh: machine presentation capability owners

Target area: Navigation, 2 to 3.

Commit `2905051` implemented this as Phase 142 while this recovery was being reconciled.

### Problem closed

`src/renderer/machines/presentation.ts` had become a 2,948-line, 249-export catalogue. Phase 142 split it into capability-owned leaves and retained a compatibility barrel for stable names.

`FileTree.tsx` and `App.tsx` are no longer evidence for this finding. `ScmSection.tsx` remains large, but length alone does not justify another split. Reassess it only if reasons-to-change and importer evidence show a real ownership breach.

### Landed shape

Machine presentation now has capability-owned leaves for contexts such as branches, editor, explorer, history, projects, reviews, SCM, search and session recovery. Consumers import those leaves, while the explicit barrel preserves stable public names.

Preserve every renderer-visible sentence and every discriminant-to-copy mapping. Do not turn copy into a second state machine and do not move machine policy into presentation files.

The renderer ownership gate prevents consumers from rebuilding a dependency on the all-machine catalogue. The rule protects capability ownership rather than enforcing a line-count limit.

### Recorded proof

The Phase 142 proof includes:

- compare the exported name and rendered-copy inventories before and after the split
- run machine settings, connection, key, project, session and recovery presentation tests
- run the renderer import wall and runtime-cycle gate
- drive one local and one remote machine path through the built app
- compare screenshots and accessible text for affected banners and phases
- prove that no IPC contract, state discriminant or renderer-visible sentence changed

### Exit rule met

Navigation now scores 3 because the capability owners are explicit and the import gate prevents the former catalogue from collecting them again.

## Stage 4 finish main composition and machine cohesion

Target areas: Composition, 2 to 3. Domain cohesion, 2 to 3.

Risk: Tier 3. This stage can touch durable session and remote machine ownership.

### Current position

Phase 125 already made `src/shared/ipc/machines.ts` a 273-line barrel over 9 capability files. It also moved local create, ID harvest, mutation admission and quit generation out of `GmuxCore`.

The remaining candidates are broad because of responsibility, not only length:

- `src/main/machines/ipc.ts` registers several machine capability families
- `src/main/machines/remote-sessions.ts` owns projection, remote create, kill, rename, restore facts, reconciliation and feed coordination
- `GmuxCore` still combines restore, refresh, status, scrollback and project operations

### Required shape

Use the landed Phase 128 reassessment as the method. It correctly ruled that `shared/types.ts`, the session registry and the shared Git service should remain whole. Apply the same reasons-to-change and dependency-edge test to the remaining main-process candidates. A ruling against a split is valid when one owner and one invariant explain the whole file.

Where the evidence supports a split:

- divide machine IPC registration by the same capability families as the shared contract
- keep one `installMachinesIpc` facade and one typed wrapper
- separate remote session state and projection from remote create and feed coordination
- keep one remote sessions facade for existing callers
- keep `GmuxCore` as the session lifecycle and identity owner
- move an effectful workflow only when it has a narrow dependency interface and a separate failure table

Do not move durability work and change its behaviour in the same commit. Stage 1 and Stage 2 must land before this stage for that reason.

### Proof

The Tier 3 proof must:

- keep the contract inventory byte for byte
- keep all 184 invoke channels closed across declaration, preload and main
- keep zero runtime cycles
- keep the facade-only import rules green
- run local and remote create, restore, kill and rename tests
- run the remote feed exclusivity matrix
- run fault injection for declaration, spawn and rollback order
- run quit generation and manifest reconstruction
- run `smoke:t1`, `smoke:t3`, `smoke:fault` and the machine conformance gate
- drive one real remote machine when the operator has loaded the required SSH key

### Exit rule

Composition scores 3 when the composition roots assemble narrow workflow owners and do not implement their details.

Domain cohesion scores 3 when each machine capability has one contract owner, one main owner and one renderer owner behind stable facades.

Projected score: 35 out of 36.

## Stage 5 make the test seams hermetic

Target area: Test seam, 2 to 3.

Risk: Tier 1 for test infrastructure. Use Tier 3 for any production seam moved to support it.

### Current problem

The focused architecture tests are strong. Phase 140 closed the Electron-process cleanup gap by routing every probe through one teardown-aware runner and protecting it with a build assertion. The remaining question is whether the full suite still depends on host FSEvents or process-lineage behaviour and whether every conformance runner is available from the lockfile without network access.

Large effectful owners also make some fault tests depend on wide module setup.

### Required shape

Pass filesystem watcher and process-tree adapters into pure workflow tests. Keep separate live integration tests for the native implementations.

Pin every verification executable in the repository lockfile. A conformance command must never reach the network to find its runner.

Use the dependency seams extracted in Stage 4. Do not add test-only branches to production workflows.

Classify each check as one of these types:

- pure contract or state test
- adapter integration test
- Electron harness
- tmux harness
- remote machine probe

Each type must state its environment requirements and skip rule. A missing operator SSH key may block a remote probe. It must not make a static conformance gate ambiguous.

### Proof

The proof must:

- run the full suite twice on the same clean checkout with the same result
- run machine conformance with network access disabled
- run watcher contract tests without requiring FSEvents
- run a separate native watcher integration lane on macOS
- run process-lineage rules against injected fixtures
- run one live process-lineage integration check
- show that removing one injected refusal makes its focused test fail

### Exit rule

Test seam scores 3 only when pure workflow tests control their effects, native adapters have focused integration tests and verification tools do not depend on an undeclared network fetch.

Projected score: 36 out of 36, subject to Stage 6.

## Stage 6 audit again before claiming 36

Target: Independent score confirmation.

Risk: Read only.

Use the same 12-area rubric and the same production graph rules as the 20 August audit. Compare the final tree with both the baseline commit and each stage commit.

The final review must:

- inspect current code rather than rely on stage commit messages
- build the runtime graph with type-only and test edges excluded
- run the import, IPC closure and facade gates
- trace quit from `before-quit` to the last joined owner
- trace a journaled clone from durable declaration to restart notice
- trace one local and one remote session mutation
- trace one local and one remote SCM read
- map renderer state, app, tree and editor dependency direction
- run the full verification matrix available in the environment
- record anything not run
- use an adversarial reviewer who did not implement the stages

Do not award a point because a planned file exists. Award it only when the owner, interface and prevention gate are all present.

If any row remains at 2, publish the measured score and the remaining exception. Do not weaken the rubric to reach 36.

## Score ledger

This is the expected score movement. Stage 6 may revise it.

| Point | Composition | Cohesion | Direction | Lifecycle | Type truth | Failure | Test seam | Navigation | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Refreshed baseline | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 3 | 30 |
| After Stage 1 | 2 | 2 | 3 | 3 | 2 | 2 | 2 | 3 | 31 |
| After Stage 2 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | 32 |
| After Stage 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 33 |
| After Stage 4 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 35 |
| After Stage 5 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 36 |

The 4 unshown areas already at 3 stay omitted from the middle columns. Their 12 points remain in every total. Dependency direction is shown because it changed during the refresh window and must remain protected.

## Commit and release shape

Use one conventional commit per stage. Do not combine stages.

| Stage | Suggested subject | Verification tier | Revert scope |
| --- | --- | ---: | --- |
| 1 | `fix(lifecycle): renderer IPC closes when quit starts` | 3 | quit admission only |
| 2 | `fix(machines): a clone starts only after its journal row` | 3 | clone admission only |
| 3 | `fix(types): shared sees only the globals it can use` | 1 | TypeScript declarations only |
| 4 | `refactor(main): workflows sit behind stable owners` | 3 | main workflow owners |
| 5 | `test(arch): workflow and conformance checks are hermetic` | 1 to 3 | test infrastructure and named seams |
| 6 | `docs(audit): rescore the Electron architecture` | Read only | documentation only |

Run the full release battery after Stages 5 and 6. Do not cut a release between a structural stage and its required fix round.

## Machine discipline during the plan

Run one stage workflow at a time. Do not run 2 architecture stages in parallel.

Run one Electron instance at a time. A probe must close its Electron process and scratch tmux server in a `finally` block.

Check `vm_stat` before each workflow. Do not launch below 3 GB free. Stop and clean up if free memory falls below 2 GB during a run.

After each probe, count remaining Electron processes and report the result. Do not run a build or test suite while a probe remains open.

After a crash, restart from the committed tree. Do not resume cached builder reports unless the worktree survived and its files match those reports.

Keep temporary worktrees out of the evidence record. `/private/tmp` may be wiped by a reboot. A verifier must name the commit and checkout it actually read.

## Stop conditions

Stop a stage and keep the current score when any of these conditions occurs:

- an IPC or durable contract would need to change for convenience
- a split requires a second source of truth
- a new owner cannot state one responsibility
- a test seam requires product code to detect a test environment
- a renderer extraction changes keyboard, menu, focus or visual behaviour
- a main extraction changes manifest order or session identity
- a gate passes only by excluding the files it is meant to protect
- the stage cannot be reverted on its own

A stable score below 36 is better than a nominal 36 that weakens Tortie's durability or makes the app harder to change.
