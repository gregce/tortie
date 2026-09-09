# Electron and TypeScript architecture after the Redline work

Date: 8 September 2026

Assessed commit: `163266d68f115936786103013c9d9da76c4f6f7b`. Package version: `0.101.0`.

Phase attribution and agent handoff added: 9 September 2026. This addition does not rerun the audit or change its score.

## The current architecture score is 32 out of 36

Tortie's main architecture remains well organised. The new features mostly extend existing boundaries rather than creating parallel application frameworks. Dependency checks, the production build, credential conformance and the session restart smoke test pass.

The growth has exposed exceptions inside those boundaries. A reopened editor tab inherits its previous rewind journal. The remote Architecture mirror can retain stale bytes and lose evidence that its read was incomplete. A growing file can exceed the guarded writer's read budget before the writer refuses it. Verification also has two unresolved problems.

Eight categories score 3. State ownership, Lifecycle, Failure flow and Test seam score 2. These are specific ownership and evidence gaps, not a recommendation to reorganise the whole application.

This is an ordinal architecture score, not a percentage of product quality, security or reliability. A 3 requires an explicit, narrow boundary with executable protection. Many passing checks do not cancel a counterexample to that boundary.

## Which earlier assessment this updates

The last written assessment is the [7 September architecture audit](./2026-09-07-electron-typescript-architecture-0.100.0.md). It recorded 35/36 after Phase 220, with Lifecycle at 2.

The subsequent review in this conversation corrected that to 34/36. The nominally hermetic install test reads the real user's Trash. That failure was not written into a separate audit. It reproduces here.

Today's 32 is therefore 3 points below the last document and 2 below the last conversational assessment. The new deductions are State ownership and Failure flow. Phase 220's credential fixes still pass; this review does not retract them.

The repository history was rewritten during inspection to remove phase working artefacts. The local rewrite map establishes these equivalents:

| Comparison point | Previously recorded hash | Hash after the rewrite |
| --- | --- | --- |
| Source assessed by the Phase 220 document after its rebase | `e758e2e321e0254f9951aed5f2f54bad98320edc` | `a690f00247884de0bc0842837b0464a9bdf4ce7c` |
| Last conversational recheck | `d607ddee8a21954231b258dd0d2a4a18acdc563a` | `2839b53f1909faa5cdf8b4d2e9a6a6b0a47a75a2` |
| Source pinned for this review | `f070f33cd9025c79993ca23b9802d6ee9455a573` | `163266d68f115936786103013c9d9da76c4f6f7b` |

Verification used a detached worktree at the last hash. Dependencies and the existing vendored tools were linked from the main checkout. Builds, temporary regression tests and live probes ran in that worktree. Later documentation commits in the main checkout are outside this assessment.

The version number has not advanced with every feature commit. This report assesses the pinned source, not a claim that all this work shipped in the published 0.101.0 application.

## What grew since the last recheck

The rewritten comparison range contains 160 commits. Source, build scripts, resources, patches and package files changed in 257 files, with 31,377 insertions and 2,762 deletions. Non-test production TypeScript and TSX changed in 148 files, with 11,011 insertions and 1,623 deletions.

Line counts include comments and blank lines. They exclude `__tests__`, test and spec filenames, and `src/test`. They measure navigation cost, not executable complexity.

| Measure | Last recheck | Current source |
| --- | ---: | ---: |
| Production TypeScript and TSX files | 1,187 | 1,217 |
| Production lines | 346,829 | 356,217 |
| Imports checked | 6,657 | 6,847 |
| Import-boundary violations | 0 | 0 |
| Runtime dependency edges | 4,033 | 4,164 |
| Runtime strongly connected components | 0 | 0 |
| Invoke channels | 222 | 226 |
| Contract inventory environment names | 100 | 101 |
| Inventoried local-storage keys | 40 | 40 |
| Eager renderer JavaScript, raw bytes | 1,549,898 | 1,559,817 |
| Eager renderer JavaScript, gzip bytes | 391,553 | 394,006 |
| Raw eager-budget headroom | 450,102 | 440,183 |

The baseline build readings above are from the earlier recheck, not a fresh rebuild of that commit. They describe bundle growth, not a measured change in user-perceived speed.

The main additions are shadow baselines, guarded local writes, phrase rewind and undo, editable Redline documents, shared remote refresh behaviour, separate link and session-feed states, parallel machine preparation, remote commit-file views and remote Architecture reading. Transfer and delegation research is not counted as implemented functionality.

## Which implemented phases caused the growth

The production increase is 9,388 lines, or about 2.7%, across 30 additional files. It mainly comes from two feature sequences: Redline editing and remote-project functionality. This is the net production increase, not the larger gross addition count that includes tests and build tooling.

These are completed feature phases in the audited range, not new phase numbers for remediation. Their original briefs remain in [the backlog](../BACKLOG.md). The linked starting measurements explain the decisions and behaviour a repair must preserve.

| Implemented phase | Added responsibility | Relationship to this audit |
| --- | --- | --- |
| [225 — shadow baseline](../research/85-phase-225-starting-measurements.md) | Hold earlier text per tab and decide when the comparison baseline changes | Introduced baseline state. Later journal work must respect its lifetime and generation. |
| [226 — guarded write](../research/86-phase-226-starting-measurements.md) | Check containment, bytes and encoding before replacing a local file | Introduced the reader with the growth-during-read budget gap, F4. |
| [227 — phrase rewind and undo](../research/95-phase-227-starting-measurements.md) | Turn a drawn change into a guarded write and retain its inverse in a journal | Introduced the journal lifetime and reopen mismatch, F1. |
| [236 — visible controls](../research/96-phase-236-starting-measurements.md) and [237 — typing](../research/97-phase-237-starting-measurements.md) | Coordinate change controls, caret restoration, text composition, Monaco buffers and separate typing and rewind undo | Added integration work. This audit does not attribute a new category deduction to typing itself. |
| [228 — remote interface consistency](../research/87-phase-228-starting-measurements.md), [229 — write controls](../research/88-phase-229-starting-measurements.md) and [230 — refresh](../research/89-phase-230-starting-measurements.md) | Reuse local presentation patterns, improve write-access controls and coordinate refreshes after remote changes | Expanded cross-view coordination. Some changes removed remote-only interface complexity. |
| [231 — per-verb liveness](../research/90-phase-231-starting-measurements.md) and [232 — independent preparation](../research/91-phase-232-starting-measurements.md) | Separate link health from session-feed health; own parallel preparation, retry timers and per-machine failures | Added independent state and lifecycle ownership. Do not undo these distinctions to simplify a repair. |
| [233 — remote commit files and moves](../research/92-phase-233-starting-measurements.md) | Open a remote commit's file diff and move files on that machine | Extended existing editor and filesystem paths rather than adding a separate editor. |
| [234 — remote Architecture](../research/93-phase-234-starting-measurements.md) | Mirror remote source locally, establish freshness and feed the shared Architecture pipeline | Introduced the stale-mirror and incomplete-scan findings, F2 and F3. |

Phase 221 was a smaller diagnostics-layout change. Phases 222–224 were research, not new runtime functionality. Later phases outside the pinned comparison are not included in these growth figures.

### Where the findings entered and where to work next

The commits below identify the introduction of each affected mechanism. They are starting points for `git show` and history inspection, not instructions to revert whole phases. Each finding was reproduced at the assessed commit; this audit does not claim a regression test was run at every introducing commit.

| Finding | Phase and implementation entry point | Next agent's starting point |
| --- | --- | --- |
| [F1 — journal lifetime](#f1-reopened-tabs-inherit-an-earlier-rewind-journal) | Phase 227, `b1e11688`, introduced `redline-journal.ts` | Trace `tabIdFor`, journal ownership and every tab-removal path in `store.ts`. Start with the journal fixture, then cover close cancellation, eviction, preview replacement and reopen. |
| [F2 — mirror freshness](#f2-remote-architecture-can-reuse-stale-source-indefinitely) | Phase 234, `91b8bba8`, introduced `remote-arch.ts` | Trace the `arch-read` metadata in `remote-scripts.ts` through `syncRemoteArchMirror` and into the scanner. Start with the mirror fixture. Preserve the shared local and remote pipeline. |
| [F3 — incomplete scan](#f3-the-no-contract-scan-loses-incomplete-mirror-evidence) | Phase 234, `5633156c`, introduced the source adapter and its coordinator integration | Compare the contract-check path with `scanFactsOnly` in `check-coordinator.ts`. Start with the partial-scan fixture. Carry source incompleteness through the result and completion stamp without causing an endless rescan. |
| [F4 — read budget](#f4-the-guarded-writer-enforces-its-read-cap-after-eof) | Phase 226, `fbc72a61`, introduced `guarded-write.ts` | Start at `readAllSync`, not the Redline view. Use the read-cap fixture to enforce the byte ceiling during consumption while preserving refusal and descriptor-cleanup behaviour. |
| [F5 — verification isolation](#f5-verification-still-depends-on-the-host-and-loader-context) | The real-Trash dependency predates this range. The deadline-probe mismatch has no proven introducing phase. | Reproduce the hermetic install failure and diagnose the standalone registry mismatch separately. Do not assume the timer is broken or remove a hostile probe arm. |
| [F6 — split retention](#f6-the-old-split-retention-finding-still-needs-closure) | Carried from earlier audits. Phase 220 improved ownership and measurement but did not explain the intermittency. | Read the Phase 220 goal and research 82, then use P167's workload floor, census and heap-retainer tooling. Do not attribute this to Phase 237 without new evidence. |

Phase 234 accounts for the two newest category deductions: State ownership for F2 and Failure flow for F3. Phase 227's F1 also supports State ownership at 2. Phases 226 and 227 add work to Lifecycle, which was already at 2. F5 explains the earlier conversational correction to Test seam at 2; it is not another point deducted for recent feature growth.

The common problem is coordination between owners: closing a tab versus retaining its journal, remote metadata versus mirrored bytes, and source completeness versus scan completion. Tests of the individual modules did not cover all those combinations. Repair those contracts before considering broad file or framework reorganisations.

## The new responsibilities mostly have appropriate owners

### Redline separates decisions from the view and disk writes

[baseline.ts](../../src/renderer/editor/baseline.ts) owns baseline transitions. [redline-typing.ts](../../src/renderer/editor/redline-typing.ts) owns edits in current-text coordinates. [rewind.ts](../../src/renderer/editor/rewind.ts) and [redline-press.ts](../../src/renderer/editor/redline-press.ts) separate the decision and asynchronous press from React and the DOM.

[redline-write.ts](../../src/renderer/editor/redline-write.ts) is the single renderer caller of the guarded channel. [guarded-write.ts](../../src/main/fs/guarded-write.ts) owns containment, digest checks, encoding refusal and staged replacement. Main still owns filesystem effects.

This separation is useful. The conformance gate exercises the shipping value modules, and the audit could test the resource boundary without rebuilding the interface. The remaining tab-lifetime and read-budget defects are local to those owners.

### Remote views share refresh rules and separate liveness facts

[use-remote-reread.ts](../../src/renderer/machines/use-remote-reread.ts) centralises refresh on sign-in, activation, window focus and completed Tortie writes. It coalesces events rather than continually polling each surface. Effects remove subscriptions and clear pending timers.

[liveness.ts](../../src/main/machines/liveness.ts) separates an answering SSH link from a current session feed. A delayed session list no longer has to disable unrelated file and git operations. [sign-in-retry.ts](../../src/main/machines/sign-in-retry.ts) owns backoff and rechecks confirmation before retrying. The main disposer stops new retries before its first await.

These are improvements in responsibility allocation. They do not justify combining every remote operation into a single large service.

### Remote Architecture reuses the local pipeline

[remote-source.ts](../../src/main/arch/remote-source.ts) introduces an `ArchSource` for local files or a remote mirror. The existing checkers, scanners and reading composers remain shared. Mirror identity includes the machine and remote folder, keeping equal path strings on different machines separate.

The source adapter is the right boundary. Its freshness and completion contracts need strengthening; replacing the shared pipeline would not address those defects.

## Findings that prevent a full score

### F1 Reopened tabs inherit an earlier rewind journal

Priority: P1. Evidence: reproduced through the shipping editor store and journal.

[redline-journal.ts](../../src/renderer/editor/redline-journal.ts#L19) says a tab ID is unique per opening. [tab-identity.ts](../../src/renderer/editor/tab-identity.ts#L46) instead keys an ordinary local tab by its absolute path. [store.ts](../../src/renderer/editor/store.ts#L627) disposes models and view state on close, but does not call `forgetRewindJournal`.

The fixture opened `/repo/notes.txt`, recorded one rewind, closed the tab and reopened the same file. The tab disappeared on close. Its journal depth remained 1, and the reopened tab inherited that entry under the same ID.

This is both retained state and a lifetime mismatch. The journal keeps the deleted and inserted strings, not just a small numeric identifier. There is no entry or byte ceiling. Reopening is not proof that the old entry belongs to the new baseline generation.

This audit did not execute an inherited undo against a real user file and does not claim demonstrated file corruption.

Use the existing model and view-state disposal sites as the sibling pattern. End the journal's ownership on actual close, clean-tab eviction and preview replacement. Do not clear it on React unmount alone: switching views must preserve a still-open tab's undo history. If cross-close recovery is intentional, give it an explicit identity and retention contract instead.

Regression: [journal fixture](./fixtures/2026-09-08/journal.test.ts.fixture).

### F2 Remote Architecture can reuse stale source indefinitely

Priority: P1. Evidence: reproduced over real scratch files and the shipping remote shell script.

[remote-scripts.ts](../../src/main/machines/remote-scripts.ts#L2885) reports whole-second modification times. [remote-arch.ts](../../src/main/machines/remote-arch.ts#L583) treats equal modification seconds and size as unchanged. The local scanner's sibling check retains `mtimeMs`, rather than truncating it to seconds.

The fixture mirrored `export const a = 1;`, then replaced it with the same-length `export const a = 2;`. Modification times were 0.1 and 0.9 seconds within the same timestamp second. Both later mirror passes reported `reused: 1`, `written: 0` and `overBudget: null`. The remote file contained 2; the mirror still contained 1.

Waiting another second does not repair this: an unchanged file keeps its recorded modification time. The next refresh still compares the same stamp.

The demonstrated failure is stale mirror content. The further consequence is an inference from the shared scanner reading those bytes: Architecture facts can describe older code after a refresh. A final incorrect user-visible verdict was not separately driven.

Give the remote source a freshness token that can distinguish these edits. Higher-resolution metadata narrows the problem but does not prove content equality when tools preserve timestamps. Test same-size rewrites, preserved timestamps, deletion and rename against the local source behaviour.

Regression: [mirror fixture](./fixtures/2026-09-08/mirror.test.ts.fixture).

### F3 The no-contract scan loses incomplete-mirror evidence

Priority: P1. Evidence: reproduced through the shipping coordinator with injected source, parser and store boundaries.

The contract-check path in [check-coordinator.ts](../../src/main/arch/check-coordinator.ts#L356) captures `syncTree().overBudget`. The fact-only path at line 535 awaits the same operation but discards its result. It then checks only the parser's budget before calling `markScanned` at line 573.

The fixture returned an explicit incomplete result from the source and a completed result from the parser. The coordinator still recorded the scan at the supplied commit. The map derives `building` from that completion stamp.

This is an adapter-to-coordinator result loss, not a claim that every large remote folder currently displays a false green verdict. The injected fixture does not simulate an entire remote repository or draw the map.

Carry source completeness through both paths. Distinguish a partial scan from a complete scan and surface the reason. Do not merely leave `building` true forever: the surrounding refresh loop could otherwise repeatedly request an impossible full read.

The contract-check path is the working sibling for propagating the result. Both paths need an explicit coverage model and a regression that fails when source completeness is ignored.

Regression: [partial-scan fixture](./fixtures/2026-09-08/partial.test.ts.fixture).

### F4 The guarded writer enforces its read cap after EOF

Priority: P2. Evidence: deterministic file-growth injection around the real file read.

[guarded-write.ts](../../src/main/fs/guarded-write.ts#L224) checks the initial file size, then `readAllSync` keeps reading until EOF. The next size check happens after the buffers have been collected. The loop itself does not stop at `READ_CAP_BYTES`.

The fixture started with a one-byte file. At the first read, after `fstat`, it appended 16 MiB. The shipping reader consumed 16,777,217 bytes before returning `refused/tooLarge`, despite a 5,242,880-byte cap. The target was not replaced.

This proves excess synchronous reading and buffering, not a measured hang or memory-exhaustion incident. The growth injection is controlled instrumentation, not a probabilistic external writer. A continuously growing file or slow storage deserves a separate runtime measurement.

Enforce a remaining-byte budget inside the read loop, allowing at most a bounded overflow sentinel. Check payload size before allocating its full encoded buffer where practical. Preserve descriptor closure and the existing write refusals. Do not move the operation behind an asynchronous boundary without reconsidering the race model.

Regression: [read-cap fixture](./fixtures/2026-09-08/read-cap.test.ts.fixture).

### F5 Verification still depends on the host and loader context

Priority: P1 for restoring trustworthy checks. Evidence: fresh command failures, distinct from the four deliberately failing regression fixtures.

With the vendored tools available, `npm test` reports 811 passing files, one failing file and one skipped file. Test counts are 12,885 passed, one failed and 2 skipped.

The failure remains [install-roundtrip.test.ts](../../src/main/context/__tests__/install-roundtrip.test.ts#L180): `userInfo().homedir` bypasses the scratch `HOME`, then `readdirSync` attempts to inspect `/Users/gdc/.Trash`. macOS returns `EPERM`. The same test fails in the explicit hermetic lane: 5 passed, one failed.

The first isolated run passed only because missing vendored tools caused more tests to skip: 12,864 passed and 24 skipped. That is setup-dependent coverage, not a repaired test. No broader filesystem permission was granted to make it green.

`probe:controldeadline` also fails in this worktree. Its registration-readback arm cannot resolve `hang`, `healthy` or `exiter` through the control plane. The held and healthy remote legs never open their intended connections, so the timer-removal arm cannot prove a deadline property.

A separate minimal driver confirms the mismatch without SSH: registration and direct lookup succeed, while `remoteContextFor` says the same fixture is unregistered. This establishes a graph or loader-context problem in this execution setup. It does not establish its root cause, when it started, or an equivalent defect in the bundled app. The earlier passing runs remain historical evidence.

The forced-failure teardown arm passes: 3 owned processes and 2 directories become 0 and 0. The probe reports 19 operator sessions before and after. Local greeting succeeds in 11 ms.

Restore hermetic effect injection and diagnose the registration mismatch before changing the timer or timeout. Keep the readback, successful healthy leg, timer-removal arm and failure-path teardown as independent requirements.

### F6 The old split-retention finding still needs closure

Priority: P1 for reaching Lifecycle 3. Evidence: the earlier reproduced failure and the fresh live run described below.

Phase 220 repaired credential ownership but did not explain the intermittent split-session renderer retention. This audit found no landed explanation that meets [the architecture goal's closure requirement](./2026-09-06-architecture-36-goal.md).

A green sample cannot explain a previously intermittent failure. Nor should temporary detached nodes automatically be called a leak. The required distinction remains disposable attachment state versus deliberately retained Past Sessions history.

Keep the workload floor and detached-element census. Obtain a retaining path and a regression for any repair, or a controlled explanation that reproduces the failing and passing conditions. Do not remove session history or reduce churn to obtain the point.

## Resource costs to keep visible

The remote mirror has per-repository limits of 20,000 files and 64 MiB of planned content, with 3 transfer pages in flight. Its directory survives project closure and machine removal. There is no profile-wide eviction policy. These are disk-retention and aggregate-budget concerns, not measured RAM leaks. A per-pass size estimate also needs revalidation if remote content grows between metadata and transfer.

The guarded writer still has a documented race between its last metadata check and rename. It provides atomic replacement, not a filesystem-level compare-and-swap transaction. The phase's high-frequency-racer results are historical evidence, not reproduced here. Keep this limit explicit when promising protection against concurrent agent writes.

Shadow baselines remain in-memory state, not a durable recovery history. The empty-HEAD ambiguity remains documented in `baseline.ts`: the channel cannot distinguish an absent file from a committed empty file. Improving that requires a typed result, not another renderer guess.

These costs should remain visible even after the score returns to 36. A full architecture score would not mean unlimited memory, perfect recovery or zero race windows.

## Scorecard

The established rubric is unchanged: 0 means hidden ownership or no contract; 1 means a weakened boundary; 2 means a clear boundary with exceptions; 3 means an explicit, narrow and executable boundary.

| Category | Last document | Current | Current evidence |
| --- | ---: | ---: | --- |
| Process ownership | 3 | 3 | Main owns filesystem and process effects. Remote work uses the existing execution plane. Electron, background-process and SSH teardown gates pass. |
| Composition | 3 | 3 | Existing roots and registrars remain. New retry admission closes in the ordered disposer before the first await. No second preload or application root. |
| IPC capability | 3 | 3 | 226 invoke channels match the checked inventory. Shared declarations, preload exposure, registration and existing trust and admission tests pass in the full suite. |
| Domain cohesion | 3 | 3 | Redline decisions, disk writes, remote liveness and Architecture sources have named modules. Remote Architecture reuses the existing lower pipeline. |
| Dependency direction | 3 | 3 | 6,847 imports, no boundary violations; 4,164 runtime edges, no strongly connected components. Both scanners pass their hostile fixtures. |
| State ownership | 3 | 2 | F2 disproves remote mirror freshness. F1 also contradicts the journal's claimed per-opening identity. |
| Lifecycle | 2 | 2 | Credential ownership remains protected. F1 leaves closed-tab state, F4 misses a read budget, and the historical split-retention explanation remains open. |
| Type truth | 3 | 3 | Shared-type and IPC checks pass. New source and result shapes are explicit. F3 drops an already-typed result; it is a consumption error, not missing type representation. |
| Failure flow | 3 | 2 | Credential refusals still pass, but F3 turns source incompleteness into a completion stamp in the fact-only path. |
| Test seam | 3 | 2 | F5 reproduces host-dependent hermetic failure and a deadline probe unable to reach its subject. Four additional focused fixtures expose gaps absent from passing gates. |
| Navigation | 3 | 3 | New responsibilities mostly enter named feature modules. Larger orchestration files remain navigable by responsibility, although their growth deserves continued review. |
| Build boundary | 3 | 3 | Production build and containment gates pass. Eager renderer has 440,183 raw and 105,994 gzip bytes of headroom. |
| Total | 35 | 32 | Eight categories at 3, four at 2. The intervening conversational correction was 34. |

Do not deduct another point from every category that a finding touches. State ownership loses its point for freshness, Failure flow for dropped incompleteness, and Test seam for verification isolation. Lifecycle already had an unresolved exception and now has additional concrete work.

## Checks run against the pinned source

| Check | Fresh result |
| --- | --- |
| `npm run typecheck` | Pass. 1,217 production files, 6,847 imports, 0 violations; 1,215 runtime graph files, 4,164 edges, 0 cycles. Boundary fixtures 42/42; cycle fixtures 15/15; shared-type gate passes. |
| `npm run build` | Pass. Eager renderer: 1,559,817 raw bytes, 394,006 gzip bytes in 2 chunks. All 18 lazy surfaces stay outside it in 11 chunks. Eight probe markers remain excluded. |
| Build safety gates | Pass. Electron: 240 files scanned, 95 helper users against floor 95. Background processes: 242 files, 2 asynchronous starters, all guarded; 19 fixtures. SSH: 290 files, 19 helper users; 36 fixtures. |
| Contract inventory | Pass. 226 invoke channels, 101 environment names, 40 local-storage keys, 37 smoke modes. Matches the checked-in baseline. |
| Check classification | Pass. 174 check scripts classified. This checks classification, not actual host isolation; F5 is the counterexample. |
| Full `npm test` with vendored tools | Fail. 811 files passed, one failed, one skipped; 12,885 tests passed, one failed, 2 skipped. Sole failure: real-Trash inspection. Run before adding audit fixtures. |
| Focused hermetic install test | Fail. 5 passed, one failed, same real-Trash access. |
| `conformance:redline` | Pass. Includes 3,000 fuzz pairs, 7 rewind and press ablations, 6 typing ablations and scanner fixtures. |
| `conformance:redline-write` | Pass. 28 readings and 15/15 ablations rejected. F4 demonstrates a missing growth-during-read arm. |
| `conformance:machines` | Pass. Includes remote Architecture command parity and the existing confirmation checks. |
| `conformance:arch`, `:arch:modules`, `:reading` | Pass. Fixed argv, module fallbacks and caps, five fixture trees through local and machine reading arms, 19 reading ablations rejected. |
| `conformance:credentials` | Pass. 60/60 ablations rejected, 6 ordered account pairs, 4 interruption arms, 9 disposer fixtures. No real keychain used. |
| `conformance:logins` | Pass. 16/16 ablations rejected, 13 ownership shapes, push and exception fixtures. |
| T1 create and restart smoke | Pass. Create 5/5, restart verify 6/6. Existing build, scratch profile and uniquely named socket. Scratch server ended. |
| `probe:controldeadline` | Fail. Registration readback and intended remote legs unavailable; teardown arm passes. See F5. |
| P167 grader self-test | Pass. All 18 positive and negative fixtures classified correctly, including missing workload and detached-element evidence. |
| Live P167 local profiles | Pass. Project switching, surface churn and split churn plateau at the existing budgets. Planted leak detected and released; scratch Electron and tmux teardown complete. Remote surface not driven. |
| Four audit regression fixtures | Four expected assertion failures. Shipping mirror, coordinator, reader and editor store exercised independently of the existing gates. |

### Live memory and lifecycle readings

The live P167 probe uses 3 blocks of 6 cycles at the unchanged budgets. Surface churn runs at one-quarter CPU speed. Remote surface churn is explicitly skipped because no real machine was supplied.

Project switching plateaus at 7.8 MiB renderer heap, 451 nodes and 231 listeners. Surface churn reads 27.1, 28.3 and 28.4 MiB, with 971 nodes and 306 listeners constant. It includes 72 outside Redline rewrites and 36 typing actions, all observed on the face. Its worst block-to-block heap growth is 1.2 MiB and passes.

Split churn reads 30.0, 29.2 and 29.2 MiB renderer heap. Detached elements read 142, 13 and 13 after a starting count of 4. The first block's excess releases rather than accumulating. Past Sessions records 24, 48 and 72 discarded sessions, so the workload lands. Main holds zero `ptmx` and `ttys` descriptors after each block.

All three driven profiles pass. The control then plants 1,032 elements in 24 detached trees. The census detects all 1,032, the grader reports a finding, and zero remain after release. Electron teardown completes and the wrapper ends the scratch tmux server. This is a passing current sample, not an explanation of the historical intermittency.

These are retained-resource measurements, not a user-speed benchmark. Main and renderer process memory are observations, not the asserted heap metric. Concurrent activity on this machine prevents a clean before-and-after latency claim.

### What was not established

This was a single-reviewer source audit with adversarial fixtures, not an independent multi-reviewer consensus. No sub-agent vote is implied.

The audit did not rerun every specialised probe, remote disconnect and reconnect against a real machine, signed packaging, notarisation, long-duration soak tests, or every interactive Redline editing scenario. It did not use real vendor credentials or ask the operator to grant Trash access. It does not assign a security certification or an accessibility grade.

## Comparison with VS Code

VS Code is the named external reference, not a claim that Tortie needs its scale or extension system. Its current source-organisation guidance separates runtime environments and exposes contribution APIs. Tortie's process walls, domain entry points and source adapters follow the same useful pattern. [VS Code source organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)

VS Code's lifecycle code groups resources under disposables. Its workbench shutdown contract identifies joiners and distinguishes work that still needs services from final teardown. Tortie's credential owner and ordered disposer already apply that distinction. [Disposable ownership](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts), [shutdown joiners](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

The concrete differences worth closing are:

| Observed reference pattern | Tortie difference | Required response |
| --- | --- | --- |
| Resources end with their owning disposable scope | The rewind journal outlives a closed tab; split ownership remains unexplained | Complete the existing tab and attachment ownership, F1 and F6 |
| Environment-specific implementations sit behind service contracts | The remote source returns bytes whose freshness differs from the local implementation | Strengthen adapter parity, F2 |
| Consumers depend on explicit service interfaces | A caller discards source incompleteness despite its typed interface | Preserve the result through orchestration, F3 |
| Work has an explicit lifetime and shutdown owner | A synchronous read can exceed its intended byte budget | Bound the operation itself, F4 |
| Runtime environments are distinct | A hermetic test observes the actual host; a standalone loader cannot see its fixture registration | Restore environment and fixture isolation, F5 |

Tortie should deliberately remain different in two respects. Its user work survives the Electron process in tmux. Its integrations are confirmed executable choices, not an arbitrary extension host. Neither finding calls for abandoning those decisions or importing a dependency-injection framework.

## Implementation order for reaching 36

This is recommended backlog order, not permission to change behaviour as part of this documentation review.

### Start here when picking up the work

This handoff explains the findings at `163266d6`; it is not a fresh assessment of later HEAD. [Phase 238 Accept](../research/98-phase-238-accept-measurements.md) and [Phase 240 Save](../research/100-phase-240-guarded-save.md) have landed since that commit. Read the current [repository instructions](../../CLAUDE.md) and [backlog](../BACKLOG.md) before choosing a new implementation phase. In particular, inspect later changes to baseline generations, journal eligibility and guarded-save callers before changing their shared owners.

1. Record the new execution commit with `git rev-parse HEAD` and inspect the worktree without discarding other work. Compare the relevant paths with `git diff 163266d6..HEAD -- <paths>`.
2. Follow [the reproduction instructions](#reproducing-the-four-new-counterexamples) in an isolated worktree. Establish each fixture's expected failure at the audited commit, then run it against the execution commit. Keep fixture setup working when APIs have moved; do not weaken the behavioural assertion.
3. Classify F1–F6 as reproduced, fixed with evidence, superseded or not reproduced. Record the command, result and responsible commit where known. An import failure, missing vendored tool or skipped test is not evidence of a fix. F6 still requires an explanation of intermittency, even after a passing sample.
4. Adopt the relevant fixture as a maintained regression before repairing a reproduced finding. Use the owner and phase mapping above to choose the smallest change. Keep the existing safety checks and verify that removing the repair makes the regression fail again.
5. Follow the work order below. After implementation, run the affected conformance checks as well as typecheck, build and the required test and smoke lanes. For Redline ownership, run `conformance:redline`; for the guarded channel, `conformance:redline-write` and the later Save caller's `conformance:save`; for remote Architecture, `conformance:machines`, `conformance:arch`, `conformance:arch:modules` and `conformance:reading`. Run these through `npm run`. Current repository instructions may require additional checks for later callers.
6. Write a new dated assessment at the execution commit. Report the status of every finding and the closure evidence for each category. Keep this document's 32/36 and measured readings as historical evidence; do not increase a score merely because a remediation checklist is complete.

The requested output of this documentation change is the handoff, not implemented fixes. It does not start a background task, assign a new backlog phase, or authorise commits, pushes, releases or changes to live user data.

### Remediation sequence

1. Preserve the failing fixtures and restore verification. Remove real-home inspection from the hermetic test through an owned or injected effect. Diagnose the deadline registration mismatch without removing its readback or timer ablation. This gives later phases a trustworthy baseline.
2. Close the editor journal lifetime. Cover close, dirty-close cancellation, close-many, preview replacement, eviction and reopen. Keep undo when switching between still-open tabs. Define a byte budget or an explicit longer-lived recovery owner before retaining arbitrary history.
3. Repair remote Architecture freshness and completeness together. Test local and remote reads over the same changing files. Carry partial-source evidence through both contract and no-contract paths. Make a cap produce a truthful partial answer without an endless rescan loop.
4. Enforce resource budgets at the point of consumption. Stop guarded reads at the byte ceiling. Measure main-thread delay at the cap. Specify aggregate remote-mirror retention without deleting user source or silently discarding recoverable history.
5. Explain or repair split-session retention, then rerun the whole rubric at one commit. Preserve Past Sessions, the churn workload, real teardown and the planted-leak control. Do not treat an isolated green run as the missing explanation.

The points return only when these closure conditions hold:

| Category | Required evidence for 3 | Main implementation risk |
| --- | --- | --- |
| State ownership | Mirror refresh reflects same-size changes, and tab reopening cannot reuse state from the wrong opening | Moderate: cache invalidation and editor identity |
| Failure flow | Both Architecture paths retain and display incomplete-source evidence without claiming completion or repeatedly scheduling an impossible scan | Low to moderate: result propagation and refresh scheduling |
| Lifecycle | Closed-tab state ends at its owner, guarded reads stay bounded, and the split-retention finding has a controlled explanation or tested repair | Moderate: undo lifetime and attachment disposal |
| Test seam | Full and hermetic lanes pass with required fixtures present; the deadline probe reaches its subject and its hostile arms remain meaningful | Low for test-only changes; diagnose before changing production code |

No point depends on splitting a large file merely to reduce its line count. The largest owners are session core at 3,344 lines, remote scripts at 3,292, remote sessions at 3,196 and remote smoke at 3,122. Prefer a split when a second caller or independently disposable resource makes the boundary useful.

## Challenges to this score

| Challenge | Decision |
| --- | --- |
| The build and specialist gates pass, so keep 35 | Rejected. Four new fixtures reach shipping logic and contradict claims those gates do not exercise. |
| The latest memory run passes, so award Lifecycle 3 | Rejected. Closed-tab journals and bounded reads have fresh counterexamples. The earlier split intermittency also lacks its required explanation. |
| The remote Architecture bugs mean the whole new design is sprawl | Rejected. They occur at a useful source adapter and its consumer. Correcting their contracts is narrower than replacing the shared pipeline. |
| The deadline failure proves a broken production timeout | Not established. This execution cannot reach the intended remote subject. It proves a verification gap and calls for loader and registry diagnosis. |
| The Trash error is only a permission problem, so ignore it | Rejected for Test seam. A hermetic test must not depend on whether the actual user's Trash is readable. |
| Thirty-two is a release-blocking verdict by itself | Rejected. This rubric is not a release gate. Prioritise the stated user consequences and distinguish demonstrated behaviour from inference. |

## Reproducing the four new counterexamples

The [fixture directory](./fixtures/2026-09-08/) preserves the exact audit tests. The `.fixture` suffix keeps intentionally failing tests out of the normal suite.

Use a disposable worktree at the assessed commit with the project's existing dependencies. Copy the fixtures into these locations, dropping only the `.fixture` suffix and using the indicated filenames:

| Fixture | Temporary test location |
| --- | --- |
| `mirror.test.ts.fixture` | `src/main/machines/__tests__/audit-0908-mirror.test.ts` |
| `partial.test.ts.fixture` | `src/main/arch/__tests__/audit-0908-partial.test.ts` |
| `read-cap.test.ts.fixture` | `src/main/fs/__tests__/audit-0908-read-cap.test.ts` |
| `journal.test.ts.fixture` | `src/renderer/editor/__tests__/audit-0908-journal.test.ts` |

Run `npm test -- audit-0908`. At the assessed commit, expect four assertion failures, not four loader or setup failures. The mirror fixture runs the real compiled-in shell script against scratch files. The reader fixture injects growth at the read boundary. The partial-scan fixture injects external answers but runs the shipping coordinator. The journal fixture runs the shipping editor store against browser and IO stubs.

Each file owns its scratch data or resets its in-memory state in `finally`. Keep these tests in the disposable worktree until the corresponding implementation phase adopts them. Do not weaken their assertions to make this audited commit pass.
