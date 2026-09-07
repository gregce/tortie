# Phase 220: close the three remaining architecture gaps

Date: 6 September 2026

Status: queued for implementation, after Phase 219's overlapping credential work. This document prepares the phase; it does not start it.

Planning snapshot: `bd16e36c3f06df7431041dd2aeaabbb230109050`, package version 0.100.0. Source and history were inspected for this brief. The credential, remote deadline and memory probes were not rerun while writing it.

Last assessed score: 33/36 in the [2 September 0.99.0 audit](./2026-09-02-electron-typescript-architecture-0.99.0.md). Lifecycle, Failure flow and Test seam each scored 2/3. That score belongs to the assessed commit, not automatically to today's tree.

## Goal to give the executor

Execute Phase 220 in [the backlog](../BACKLOG.md), using this document as its acceptance contract. Reproduce the remaining Lifecycle, Failure flow and Test seam exceptions at the starting commit. Repair the smallest responsible owners, preserve Phase 211's account switching, and verify the fixes independently. Finish with a new architecture audit of all 12 categories at one commit. Target 36/36; report the score the evidence supports. Commit the phase locally and record its results. Do not tag, release, push or launch another phase under this brief.

## What completion gives the person using Tortie

An account switch reports what actually happened, including when a running session could not be checked or reached. Quitting settles credential work and ends its owned children. Repeated session changes release disposable renderer state. The remote deadline probe proves that a stalled connection is handled while a healthy connection still works.

These outcomes earn the points. Completing a checklist or increasing a test count does not.

## Phase contract

Subject: `fix(architecture): close the remaining lifecycle and failure gaps`

First commit body line: `Phase 220: close the three remaining architecture gaps`

Semver: PATCH for repairs that preserve current product behaviour. Declare this in the phase report; leave the package version and release tagging to the release workflow.

Tier: assess each work item. Credential work and changes to session lifecycle are Tier 3. Probe repairs are Tier 3 when they spawn processes. The closing document is Tier 1. Apply the repository's required gates and independent verification to each item.

Charter: this brief, the 0.99.0 audit, the Phase 200 findings in the [verifier review](./2026-09-03-verifier-findings-fifty-phases.md), and the current Phase 208 and 211 rules in [CLAUDE.md](../../CLAUDE.md). Read the current backlog and standing architecture contract before execution.

Run the house workflow: measure and specify, build with disjoint ownership where useful, integrate, independently verify, fix every `needs_work` verdict, and commit by work item. Credential failure handling and credential lifecycle share files and must be integrated sequentially. An independent verifier must not verify its own implementation.

## What has changed since the audit

| Audit finding | Source at the planning snapshot | Consequence for this phase |
| --- | --- | --- |
| A failed live-session query became an empty list before a safety decision. | `src/main/credentials/keep.ts` still catches the query as `[]`, but Phase 211 now uses it to decide whether to update the default store. The selected login's own store is handled first. | Preserve switching into running sessions. Treat unavailable session evidence distinctly, before activation writes, rather than restoring the old refusal of every active store. |
| An unexpected activation exception could still record the new choice. | The catch in `src/main/logins/ipc.ts` still falls through to `chooseLogin`. Expected lock failures now have typed refusals. | Prove the unexpected-error branch separately from the lock-refusal cases that already pass. |
| Credential children and observation were not joined at quit. | `stopLoginsWatch()` now runs first in `disposeMainCapabilities()`. It closes watch handles and timers. `SecurityRunner` still exposes only `run()`, with raw `execFile` and a 10-second timeout. | Credit the watcher stop. Cover operations already running, delayed boot work, late watch startup, migration, locking and activation through one lifecycle owner. |
| Split churn increased renderer heap. | The later verifier review still records intermittent failure at both measured commits. | Reproduce and trace retaining paths. A single green run cannot close it, and the old 5 MB figure is not a new measurement. |
| The deadline driver did not reach the held connection. | The generated `.mts` driver still arms context through direct TypeScript imports. | Establish where its state becomes unavailable. Module duplication is a hypothesis to prove, not a cause to assume. |
| Eager renderer headroom was almost exhausted. | Later backlog entries report substantial headroom after intervening work. | Measure through the current build. Do not repeat the old size claim or add a bundle refactor without a current failure. |

Phase 219 owns its separate credential validation, migration and cleanup findings. Wait for or integrate those repairs before editing the same owners. Mark an inherited finding closed only with the commit and relevant passing evidence. Do not implement it twice.

## Execute the work in this order

### 1. Establish the starting evidence

Pin the implementation commit and record version, worktree state, tool versions and probe settings. Use an isolated checkout for builds and probes if other work is in progress. Preserve local commits and unrelated changes.

Write a short measurement record under `docs/research/`, using the next available research number. Classify each finding as reproduced, already repaired, superseded, or unresolved. Record commands, outputs and the reason for each classification.

Run the existing credential and login conformance checks, the deadline probe, and the scale probe with its normal settings. Preserve the full scale report. Because split retention has been intermittent, run two additional focused `d` samples at the same starting commit. Keep every result, including failures. Check the current build's boundary and size reports.

Record enough parent evidence to compare each eventual fix under the same workload. If the deadline probe fails before its subject, instrument that boundary before changing production code.

### 2. Make account-switch failures truthful

Start in `src/main/credentials/keep.ts`, `src/main/logins/ipc.ts` and their existing tests. Preserve the injected session seam in `src/main/credentials/index.ts`; importing the sessions domain back into credentials would create a dependency cycle.

Separate a known empty session list from an unavailable answer. Perform the session preflight before the first activation write that depends on its result. If the answer is unavailable, refuse activation and leave the selected login unchanged. Independent account observation may still preserve newly discovered credentials; do not mistake that recovery work for an activation write.

Keep the successful Phase 211 path: an explicit switch may reach a running session and its default store. Keep the vendor lock order, read under the lock, preserve outgoing credentials, and keep refreshed bytes through a round trip. Do not restore the old blanket ban on writing an active or default store.

An unexpected activation exception must not become an ordinary successful choice. Return a useful, non-secret failure and retain the previous selection. If a write already completed, report that partial or uncertain outcome honestly and preserve recovery. Do not claim no bytes changed or blindly roll back over a vendor refresh.

Preserve the existing deliberate partial-success result when the named login was restored but its running default session was not reached. That result must say which part failed. It is different from swallowing an unclassified exception.

Add named regression cases before the repair and observe them fail for the expected reason:

- `unavailable_sessions_refuse_before_activation_writes`: a rejected lookup changes neither activation targets nor the selected login
- `activation_exception_preserves_choice`: the real registered handler returns failure, with no success notification or choice change
- `partial_activation_reports_the_written_store`: an error after one confirmed write neither hides that write nor destroys the recovery copy
- `running_default_session_still_receives_chosen_account`: the supported Phase 211 path remains successful under the vendor locks

Extend the existing conformance checks with a targeted ablation: restoring the permissive catch must turn the corresponding case red. Use a fault in the actual handler path, not only a mock of its final answer.

### 3. Give credential work one shutdown owner

Use `src/main/usage/service.ts`, `src/main/usage/ipc.ts` and `src/main/usage/__tests__/p200-shutdown.test.ts` as the working sibling. Reuse the established child-process and quit mechanisms where they fit. Credential writes need safe completion or recovery in addition to the cancellation that suffices for a usage read.

Trace every entry through `src/main/logins/ipc.ts`, `src/main/credentials/index.ts`, `watch.ts`, `security.ts`, `locks.ts` and `src/main/capabilities.ts`. Include boot observation, watcher callbacks, fingerprint reads, migration, remove cleanup and explicit activation. A stop flag that merely prevents the next timer is insufficient.

Close admission before the first shutdown await. Track all accepted work until settlement, even if a cache refresh replaces `observeInFlight`. Prevent an asynchronous watch startup from registering resources after shutdown. Settle or cancel operations before their required session and manifest owners close.

For writes, define safe interruption points and recovery before wiring cancellation. A timed-out join must report that it did not join. Ending the phase's own keychain child must not kill another program's `security` process, steal a vendor lock, or discard the last recoverable credential.

Required cases are:

- `shutdown_refuses_late_login_work`: list, choose, boot and watch entry points start no new credential operation after admission closes
- `shutdown_joins_replaced_observation`: replacing the visible cached promise does not lose ownership of the previous operation
- `late_watch_start_cannot_rearm_after_shutdown`: release a held dependency after stop and prove no watcher or timer appears
- `shutdown_settles_held_security_read_and_write`: cancellation reaches the owned child; the join resolves only with truthful settlement or a classified deadline
- `shutdown_during_vendor_lock_keeps_recovery`: interrupt each supported write boundary and retain valid old or new credentials and a usable recovery copy
- `idle_shutdown_is_immediate_and_idempotent`: no artificial delay or new process on an idle quit; a second call is safe

Exercise the production composition order as well as the isolated owner. Add an ablation that removes its registration from `disposeMainCapabilities()` and must fail.

### 4. Repair the deadline probe at its failing boundary

Trace `build/probe-control-deadline.mjs`, `build/ts-runner.mjs`, `src/main/machines/context.ts`, `src/main/machines/control-plane.ts` and `src/main/tmux/control-client.ts`. Prove that the graph opening the plane can read the context and remote path the driver registered.

If separate loaded module instances are the cause, use one composition entry or an explicit injection seam. Keep production readiness, confirmation and version checks intact. A fixture that bypasses the real deadline does not close this finding.

The repaired probe must observe the held SSH child, the configured greeting deadline, the timeout result and fallback state. It must also observe a healthy connection completing while the stalled one is handled. Retain the existing exit/reconnect arms and prove cleanup after an assertion failure.

Make disarming the greeting timer turn the test red within an outer timeout. Missing prerequisites must fail clearly, not print a passing result. Use the shared scoped SSH helper and end every scratch child and server on every exit path.

### 5. Explain and remove disposable renderer retention

Start with `build/probe-p167-scale.mjs`. Read the current `judge()` implementation and run its self-test before trusting its verdict. Follow heap retaining paths into the renderer; `src/renderer/terminal/TerminalPane.tsx` and `src/renderer/state/sessions-slice.ts` are starting points, not predetermined repair targets.

Capture post-collection snapshots at consistent block boundaries. Separate intentional Past Sessions records from terminal buffers, detached DOM, listeners, attachment records and caches that should be released. Compare create/attach, grid staging, close and history-recording variants. Instrumentation itself must release handles and retained objects.

Repair the smallest owner supported by the snapshots. Preserve complete Past Sessions and durable tmux sessions. Do not erase history, lower the workload, raise the memory allowance or discard a failing sample to obtain a plateau.

If the apparent slope is required history growth or a measurement defect, prove it with retaining paths and a fixed-history control. Any replacement ruler needs independent review, an explicit per-record cost, and a planted disposable leak that it rejects. Until that explanation passes, keep Lifecycle at 2.

Final proof is one full default scale run and two further focused `d` runs on the same candidate commit. Preserve all three reports. The existing grader must pass, PTY descriptors must return to baseline, and no disposable retaining path may keep growing. Add a targeted regression at the diagnosed owner and show that removing the repair brings its failure back.

### 6. Verify and publish a fresh score

Integrate the repairs before the final measurements. Run the required repository battery and the focused commands below at the candidate commit. Do not combine evidence from different code revisions into one passing baseline.

The independent verifier uses at least two methods for each Tier 3 item, including an attack. Useful methods here are a rejected or delayed seam, real scratch files or a scratch keychain, parent comparison, and independently derived heap retaining paths. It must challenge both the repair and the test that claims to protect it.

Write a new dated audit under `docs/audits/`. Keep the previous audit as historical evidence. Use its same 12 categories and rubric, with current evidence for the nine categories previously at 3. Record commit, version, commands, measured limits, remaining findings and anything not run.

Update the phase's backlog section and append its result to the running log. Update affected standing contract facts and the changelog for shipped behaviour, following repository conventions. Commit each cohesive repair with the Phase 220 body line. Record the final hashes in the completion entry; do not publish a release.

## Verification commands and their purpose

| Command | Required evidence |
| --- | --- |
| `npm run typecheck` | Types, import boundaries, shared-type rules and runtime cycles remain protected. |
| `npm run build` | Current bundle, IPC inventory and build gates pass without weakened limits. |
| `npm run smoke:t1` | The normal create and verify path works after integration. |
| `npm test` | Existing and added regressions pass. Apply the full integrator battery from CLAUDE.md, including Tier 3 smoke and packaging. |
| `npm run test:hermetic` and `npm run test:native` | Any lane claims in the closing audit have fresh evidence. |
| `npm run conformance:credentials` and `npm run conformance:logins` | Account pairs, lock ordering, refresh, interrupted writes, profile isolation and the new failure cases pass. |
| `npm run conformance:machines` | Remote capability checks still hold after a probe or composition repair. |
| `node build/probe-p167-scale.mjs --self-test` | The scale grader rejects its hostile readings. |
| `npm run probe:controldeadline` | The probe reaches the stalled child, deadline and healthy leg, then cleans up. |
| `npm run probe:p167` | All default scale profiles pass at the candidate commit. |
| `P167_PROFILES=d npm run probe:p167` | Two additional samples test the intermittent split finding. Retain separate reports for each run. |

Run other domain gates only when the touched paths require them. Reuse one app run for the credential claims where possible. The repeated scale runs are justified by the recorded intermittent failure. Keep scratch profile, socket and keychain isolation from Phases 208 and 211; never put a test keychain into the person's search list or run a paid agent turn.

## How each category earns its third point

| Category | Evidence required for 3/3 |
| --- | --- |
| Failure flow | Unavailable session evidence and unexpected activation errors cannot silently succeed; existing successful and explicit partial account switches remain correct. |
| Lifecycle | Credential admission, background work, locks and children have a tested shutdown owner; split retention is repaired or independently explained and guarded. Both halves must pass. |
| Test seam | The deadline probe reaches its real subject, rejects an ablated deadline and cleans up on failure; existing test lanes remain usable. |

The target is 36/36. A new regression in any category changes the earned total. Keep an unproved category at 2 and document the exact missing evidence. New work outside this phase belongs in a separate proposed backlog item, not an open-ended rewrite.

## What is not in this phase

- a new account model, credential format, public capability or setting
- reversing Phase 211's explicit permission to switch accounts in running sessions
- changing protected tmux identifiers, manifest durability or session identity
- weakening a version gate, sender check, credential boundary or performance budget
- deleting Past Sessions, recoverable credentials or the person's own data to simplify cleanup
- repeating Phase 219's repairs or starting a broad large-file reorganisation
- claiming measured live vendor pickup from the bundle's cache constant
- tags, releases, pushes or automatically starting the next backlog phase

## Operator acceptance before closing the phase

In the phase's fixture app, switch between two kept accounts with a stub session running. Confirm the successful switch and restart behaviour still work. Inject an unavailable session query and an activation error; confirm a clear outcome and the previous choice remain visible where activation was refused. Confirm any partial write is described accurately.

Start a held credential operation, quit and reopen the fixture app. Confirm the account remains recoverable and no phase-owned child survives. Split and close sessions repeatedly, then confirm Past Sessions still contains the expected entries and can be used normally. The measured probe reports supply the memory evidence.

Stop execution when the repairs, independent verification, local commits and fresh audit are complete. If required evidence remains unavailable, record the precise unresolved condition and earned score; do not mark the phase landed at 36/36.
