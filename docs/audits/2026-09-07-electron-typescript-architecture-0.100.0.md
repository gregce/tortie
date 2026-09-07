# Electron and TypeScript architecture audit — 0.100.0, after Phase 220

Date: 7 September 2026

Status: Fresh architecture review, written as Phase 220's item 5. It is a new, standalone audit of all twelve categories at one commit. It does not replace the 2 September assessment, which stays as historical evidence.

Assessed source: commit `c319122a3c3cc5fe2e254040b758e79e27c371fd`, package version 0.100.0, in a detached worktree at `/private/tmp/wt-p220`. **The phase was then rebased onto `662691ef02a3adbf364a17ba443b1996c730fcd0`, Phase 218's tip, and that commit is now `e758e2e321e0254f9951aed5f2f54bad98320edc`**, which carries the same source byte for byte; the only file the rebase touched is the running log at the end of `docs/BACKLOG.md`, where Phase 218's three landing lines now sit above Phase 220's. The committer re-ran typecheck, build and `npm test` after the rebase and read 0 violations, 0 cycles, a byte-identical contract inventory and 12,253 passed, the seven extra tests being Phase 218's own. Nothing here was tagged, released, pushed or version-bumped; the brief refuses all four by name. The operator's own checkout was neither read from nor written to, and his `-L gmux` server was read for its session count and never addressed.

The comparison point is `84a281d4443e2279eca06993043a1b3a796ccead`, version 0.99.0, assessed in [the previous audit](./2026-09-02-electron-typescript-architecture-0.99.0.md), which scored 33/36. The acceptance contract for this phase is [Phase 220's architecture goal](./2026-09-06-architecture-36-goal.md), and its measure step is [research 82](../research/82-phase-220-starting-measurements.md).

Every reading below was taken at the assessed commit by this audit, running the command itself rather than quoting the phase's own report. The two places where that was not possible, being the packaged build and the two extra focused memory samples, are named in **What was not run** with the reason.

## Outcome

The current architecture score is **35 out of 36**.

Two categories moved up. **Failure flow is 3**: an account switch now separates evidence it has from evidence it could not get, refuses the write when the answer is unavailable, and never records an unclassified failure as an ordinary successful choice. **Test seam is 3**: the control-deadline probe reads its own registration back through the control plane's own export before it spawns anything, fails when the greeting timer is ablated away, and leaves nothing behind when it is forced to throw with an sshd and a remote tmux server in its hands.

**Lifecycle stays at 2, and it is a half rather than a whole.** Its credential half is closed and closed well: admission, background observation, locks, the vault migration, the watcher's own pass and the `security` children now have one named owner that the ordered disposer joins before the session core shuts down. Its split-session half is neither repaired nor explained. The renderer-heap slope that failed two of three runs at the phase's starting commit has not reproduced in nine subsequent runs over a byte-identical renderer, the ninth being this audit's own, and nobody can say why it failed or why it stopped. The brief's own rule for that state is explicit — *"Until that explanation passes, keep Lifecycle at 2"* — and this audit applies it rather than reading nine green runs as an explanation.

This is not a 97.2% product-quality grade. It is an ordinal architecture score. A 3 means an ownership boundary is explicit, narrow and protected by a passing executable check. Eleven categories meet that bar today. One has a specific, evidenced, unexplained exception.

## What Phase 220 was given, and what survived contact with the tree

The phase inherited six findings. It re-measured all six at its own starting commit before believing any of them, which is what the operator's brief asked for and what the 0.99.0 list could not have known, because Phase 219 landed in between.

| 0.99.0 finding | What re-measurement found | What this audit reads at `c319122` |
| --- | --- | --- |
| A failed live-session query becomes `[]` before a safety decision | Reproduced with its **consequence inverted**. Since Phase 211 the unavailable answer skips the default lift rather than permitting it, so the defect was an untruthful outcome, not an unsafe write | Closed. The seam answers a third state and an unavailable answer refuses the whole activation |
| An unexpected activation exception still records the choice | Reproduced exactly, through the real registered handler | Closed. The unclassified throw returns a refusal and records nothing |
| Credential children and observation are not joined at quit | Reproduced, and gained a shape the audit had not named: a **late watch start** that installs `fs.watch` handles after the disposer has finished | Closed. One owner, admission closed synchronously, children ended by handle, work joined and reported |
| `probe:controldeadline` cannot reach its subject | **Not reproduced, and its stated cause refuted.** The probe passed twice; the five named files were byte-identical to the audited commit; one module instance was proved by a nine-line driver | Superseded. The probe now carries the arms that make its passing leg a check |
| Split churn grows the renderer heap | Reproduced, two runs of three, at about 5 MB and exactly 1,020 detached DOM nodes a block | **Open.** Not reproduced since, not explained, guarded better |
| Eager renderer headroom is 2,232 bytes | **Superseded by 450 KB** | Closed. 450,366 raw bytes of headroom today |

Two of the six were therefore not defects by the time an executor reached them. Recording that is the point of the measure step: a phase that had applied the September list unread would have restored a refusal Phase 211 deliberately lifted, and rebuilt a probe that was already working.

## Change since 0.99.0

The comparison range holds 235 commits and changes 407 files, with 73,650 insertions and 1,307 deletions. Non-test production TypeScript and TSX changed in 134 files, with 14,576 insertions and 750 deletions.

| Measure | 0.99.0 | 0.100.0 at `c319122` |
| --- | ---: | ---: |
| Non-test production TypeScript and TSX files | 1,150 | 1,187 |
| Non-test production lines | 332,947 | 346,773 |
| Production files in the import gate | 1,150 | 1,187 |
| Imports checked | 6,458 | 6,657 |
| Production files in the runtime graph | 1,148 | 1,185 |
| Runtime edges | 3,900 | 4,033 |
| Runtime strongly connected components | 0 | 0 |
| Invoke channels | 221 | 222 |
| Environment names in the contract inventory | 97 | 100 |
| Eager renderer JavaScript, raw | 1,997,768 bytes | 1,549,634 bytes |
| Eager renderer JavaScript, gzip | 449,245 bytes | 391,524 bytes |
| Eager raw headroom | 2,232 bytes | 450,366 bytes |

The line and file counts were re-derived here by reading the tree out of git at each commit and excluding `__tests__` and `*.test.*`. That method reproduces the previous audit's 332,947 exactly at `84a281d`, which is why today's 346,773 can be compared with it rather than merely printed beside it.

The single new invoke channel since 0.99.0 is `usage:statusLine`, and the three new environment names are `GMUX_HARNESS_KEYCHAIN`, `GMUX_MONACO_THEME_LIGHT` and `GMUX_THEME_NAME_LIGHT`. **Phase 220 itself added none of them.** Its fourteen commits change 22 files and touch no renderer, preload or shared file at all, add no invoke channel, no environment name, no storage key and no setting. A lifecycle and failure repair that moves no public contract is the shape this codebase should want, and the byte-identical contract inventory is what proves it rather than asserts it.

## Current architecture

### The composition roots are unchanged

```text
Electron main root
  -> capabilities.ts: 32 registrars and one ordered disposer
  -> sessions/core.ts: durable session orchestration
  -> domain services
       -> git and SCM reads
       -> Architecture scan, store and projection
       -> login selection, credential keeping and NOW credential shutdown
       -> usage, Diagnostics and remote machines

context-isolated preload
  -> one typed bridge

renderer root
  -> domain state facades
  -> lazy secondary surfaces and modal family
```

There is still one Electron main assembly root, one session composition root, one context-isolated preload bridge and one renderer root. The import and runtime-cycle gates confirm that 37 more production files and 133 more runtime edges have not produced a second root by dependency accident.

### The credentials domain now has a shutdown owner, and it is one file

```text
app.on('before-quit')            (src/main/index.ts)
  -> markAppQuitting()           renderer invokes refuse from this line
  -> disposeMainCapabilities()   (src/main/capabilities.ts)
       1. beginCredentialShutdown()   synchronous, first statement, before any await
       2. stopLoginsWatch()           the Phase 211 line, unchanged
       3. await joinCredentialShutdown()
            -> ends this domain's `security` children by handle
            -> joins every accepted operation, bounded at 2,000 ms
            -> reports tracked, children, joined, waitedMs
       4. ... clone cancel, watchers, workers, usage, Diagnostics ...
       5. await shutdownGmuxCore()
```

`src/main/credentials/lifecycle.ts` is the whole owner: admission, a tracked set, a child registry and one bounded join. Six things that outlived the disposer at the starting commit now do not — the observation in flight, the observation a change *replaced*, the boot observe, the late watch start, the vault migration, and the `security` children.

Three properties of that design are worth naming, because they are what makes it more than a stop flag.

**The interruption points were defined before the cancellation was wired.** A write is cancelled on purpose at exactly one point, before the vendor's locks are taken, where nothing has been read and nothing written. Past that point a write is interrupted only by its own child ending, which lands inside `swap.ts`, whose staged-write guarantee is that a store holds the old credential or the new one and never neither. A lock the vendor holds is never taken, so it can never be stolen or released by a quit.

**Ownership is not the cache.** `trackCredentialWork()` hands back the same promise it was given, so `forgetObservation()` can drop the cached reference on every change a person makes while the disposer still holds the pass. That was the defect at the starting commit and it is the reason the helper has the shape it has.

**Admission cannot be bypassed by adding an entry point.** The credentials and logins domains import `node:child_process` in zero files; every `security` call in the domain goes through one runner, and that runner asks admission and takes an abort handle before it spawns. Thirty-six files in `src/main` still import `node:child_process` directly, and none of them is in either domain. This audit re-derived that by scanning the tree rather than by reading the phase's prose.

### An account switch says what actually happened

```text
logins:choose
  -> refuse whole if the domain is closing
  -> activateLogin()
       -> liveSessionEvidence()        known rows | unavailable  (asked ABOVE every write)
       -> unavailable  -> refuse, choose nothing, say so
       -> known        -> lift the login's own store
                       -> lift the default store only when a default session of
                          this provider is running (Phase 211, unchanged)
       -> unclassified throw -> one of three truthful answers:
            wrote nothing, between lifts     -> refusal, nothing changed
            wrote nothing, inside a lift     -> refusal naming the store, old or new
            wrote something                  -> success naming the half that did not finish
  -> chooseLogin() runs only when the activation did not refuse
```

The three outcomes are kept apart deliberately, and so are the three failure kinds: a refusal the domain composed (including Phase 211's typed lock refusals), a refusal because the evidence was unavailable, and a throw nobody classified. Nothing is rolled back on any of them, because a vendor refresh may have landed in the same window and writing over it to tidy up is the exact loss the ported locks exist to stop.

The Phase 211 behaviour the brief protects is intact and proved by its own arm: a switch with a default session running still reaches that session and the person's own default store. A *known* empty answer still writes exactly as it did. What changed is only what happens when the answer cannot be had.

### The two probes are now checks rather than watched passes

The control-deadline probe reads back every registration it makes through `remoteContextFor`, the control plane's own export and the function `openControlPlane` itself calls, before any child is spawned. It runs itself as a child with a forced failure to prove teardown, and it runs its own driver a second time over a copy of `src` with the greeting-timer line removed, asserting first that the ablated build still opened a connection and spawned a child so that a copy which fails to load can never be mistaken for a timer that was taken away.

The scale probe gained a detached-element census with its own budget, a floor on work landing so that a run whose workload did not land is *inconclusive* rather than a plateau, an optional heap snapshot a block, and a planted leak at the end of every run that proves the census sees what it is meant to see. Its grader self-test grew from 12 fixtures to 18.

## The nine previous threes, re-checked

A 3 inherited without re-checking is not a 3. Each of the nine was re-established at this commit, and the middle column is what was actually done rather than what was read.

| Category | What this audit did today | Result |
| --- | --- | --- |
| Process ownership | Re-ran the three teardown gates inside `npm run build`; independently scanned every `node:child_process` importer in `src/main`; traced the credentials `security` child into `proc/guarded` | 227 build files with no direct Electron start and 87 reaching the one runner against a floor of 87; 229 files with one long-lived start, ended in a `finally`; 254 files with no unrouted SSH-family spawn; 0 child-process importers in credentials or logins; 20 `runGuarded` call sites in main |
| Composition | Ran the ordered-quit tests; read the production `before-quit` handler myself rather than the disposer body the gate reads | 7 of 7 quit-order cases green; `before-quit` reaches `disposeMainCapabilities()` whose first statement is `beginCredentialShutdown()`; 32 registrars still installed from one file |
| IPC capability | Re-ran the closure, single-bridge, installed-bridge, quit-admission and trusted-window tests; byte-compared the contract inventory | 5 files, 41 tests green; inventory byte-identical at 222 channels |
| Domain cohesion | Read where the phase's new code went; checked the logins/credentials/usage split for a new crossing | The new owner is a 269-line leaf in its own domain; the login domain still names no vendor location; the account reader still sits in usage because the logins domain may not name one |
| Dependency direction | Ran the import and cycle gates at this commit | 1,187 files, 6,657 imports, 0 violations; 1,185 files, 4,033 runtime edges, 0 strongly connected components; 42 and 15 fixtures behaved |
| State ownership | Checked that the phase added no store; read the refusal's path to the person | Selection, durable session login, kept credential bytes and usage attribution are still four separate truths; the new refusal text travels the existing `logins:choose` result to the existing Settings caption, with no new state anywhere |
| Type truth | Ran the shared-type gate; checked what the phase exported | Gate green; `src/shared` is untouched by the whole phase; the shutdown report and the session-evidence union are main-only types and no credential or path shape entered a renderer contract |
| Navigation | Re-measured the largest production files; checked where 4,511 new lines landed | `sessions/core.ts` 3,304, `machines/remote-sessions.ts` 3,124, `machines/remote-smoke.ts` 3,120, `machines/remote-scripts.ts` 2,934, `ScmSection.tsx` 1,947. The phase's own code entered a new focused leaf and two probes, not a central file |
| Build boundary | Ran the full build with every gate | Eager set 1,549,634 raw and 391,524 gzip in 2 chunks, under budget by 450,366 and 108,476; 18 lazy surfaces in 11 chunks; 8 probe markers outside the eager set; contract, teardown, known-hosts, CSS-order, menu, tab-floor and hermetic-classification gates all green |

## What happened to the previous priorities

| 0.99.0 priority | Evidence at `c319122` | Status |
| --- | --- | --- |
| P0 — fail closed when live-session ownership cannot be read | The seam answers `known` or `unavailable`, is asked above every write, and an unavailable answer refuses with the choice unchanged. Four named regression cases plus the Phase 211 control case pass; 60 of 60 credential ablations go red | Landed, with the finding restated: the defect was truthfulness, not a permissive write |
| P0 — an unexpected activation exception must not record the choice | The unclassified throw returns `ok: false`, forgets the observation and records nothing; the three failure kinds stay apart | Landed |
| P1 — enrol credential work in ordered shutdown | One owner, admission closed synchronously before the first await, children through `proc/guarded` with abort handles, bounded join that reports whether it joined, and the join's *position* pinned twice — by the gate's disposer rule over nine fixtures and by a unit test on every `npm test` | Landed |
| P1 — isolate the split-session renderer heap slope | Not reproduced in nine runs over a byte-identical renderer, one of them this audit's own, including at a quarter CPU speed and under contention; no retaining path to attribute; the measure step's own inference about the passing run was refuted | **Open** |
| P1 — make the control-deadline probe use one module identity | Refuted: one identity was already the case. The probe now carries a readback, a teardown arm and an ablation arm | Landed as a guard rather than a repair |
| P1 — restore eager renderer headroom | 450,366 raw bytes of headroom measured in this audit's own build | Superseded |
| P2 — keep three concentration points on watch | Still watched; two of the five largest are remote-machine files rather than the three named in September | Carried |

## Priorities

### P1 — explain the split-session slope, or keep Lifecycle at 2

This is the only thing standing between the codebase and 36.

At the phase's starting commit the split, close and reattach profile failed two runs of three. Both failures had the same signature to three significant figures: about 5 MB of renderer heap and exactly 1,020 DOM nodes per block, over 24 real sessions created and discarded per block, which is 42.5 nodes and about 210 KB per discarded session. The third run passed and the probe could not tell why.

Since then the same profile has been driven nine more times over a renderer that is byte-identical to the one those failures measured — the whole phase changed no file under `src/renderer`, `src/preload` or `src/shared` — including one run at a quarter CPU speed, one beside a second application doing the same work, and this audit's own full run at the assessed commit. None reproduced it. This audit's run is the first that can also say its workload landed: Past Sessions recorded 24, then 48, then 72 discarded sessions, against a floor of 21 a block, so it is a plateau rather than an empty run reported as one. Two heap snapshots taken a block apart, with 24 more sessions discarded in between, hold identical per-session object counts and a smaller total, and V8's own detachedness field marks nothing detached.

So there is a positive statement and a negative one, and both are true. The positive: there is no per-session retention in this tree to attribute today. The negative: nobody can say what made two runs at `b5cc017` retain 1,020 detached elements a block, and an intermittent defect that stops reproducing has not been explained by being asked nine times.

What was built instead is a ruler that can name the owner the day it returns: a detached-element census in every reading with its own budget, a floor on work landing so a run whose workload did not land is reported as inconclusive rather than as a plateau, a heap snapshot a block behind a knob, and a planted leak at the end of every run that proves the census sees 1,032 planted detached elements and that the grader goes red on them. That is a real improvement and it is not the same thing as an explanation.

The evidence that would earn the third point is one of two things. Either the slope reproduces and a retaining path names an owner, and the smallest owner is repaired with a regression that goes red when the repair is removed. Or the intermittency is traced to something outside the renderer — a measurement artefact, a harness condition, a machine state — and that explanation is written down with the readings that support it and a control that reproduces both arms on demand. Nine green runs are neither.

### P2 — three of the six ownership sites can still be unwired in silence

The owner is reached from six `trackCredentialWork` call sites in production. Three are pinned by an arm of their own: the observation pass, the watcher's own pass and the activation. Three are not — the two inside `logins:remove` and the vault migration — and the whole battery stays green with either group removed. This audit re-derived the sharper half itself: with `trackCredentialWork` taken off the vault migration, the credentials, logins and quit-order suites read 150 of 150 green and `conformance:credentials` printed OK with 60 of 60 ablations red. The migration one is inside the directory `conformance:credentials` ablates, so the gate walks past a clause it is standing next to.

The shipped code is correct at this commit, and both failure modes are recoverable by design: an interrupted remove leaves a stray that the next run finishes, and the vault migration deletes the unscoped item only after the scoped one reads back equal. That is why this is a P2 and not a fix round. One arm shaped like the activation's, held over a `logins:remove`, closes both remove sites; the migration wants a clause in the gate's own ablation list.

There is a second, smaller version of the same observation. The join's *position* in the disposer is now pinned twice, but both pins are scans of the same source text. Nothing drives a real credential write against a closed session core. The brief asked for an ablation that removes the registration and fails, and that exists; a runtime arm would be stronger than two readers of one file.

### P2 — keep the concentration points on watch

The largest production files are `sessions/core.ts` at 3,304 lines, `machines/remote-sessions.ts` at 3,124, `machines/remote-smoke.ts` at 3,120, `machines/remote-scripts.ts` at 2,934 and `renderer/scm/ScmSection.tsx` at 1,947.

Line count alone is still not a reason to split them, and this phase is evidence for that reading rather than against it: 4,511 new lines entered a new 269-line domain leaf, two probe scripts, two gates and two test files, and the central `capabilities.ts` grew by one import, three statements and one log line. The next reason to change each of these files should still be a concrete seam — a second caller, a second resource owner, a second surface needing the same state machine — and not a number.

## Scorecard

Scores use the established four-level rubric.

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | 0.99.0 | 0.100.0 | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | **3** | Electron, tmux, git, SSH, Architecture workers and keychain programs have named main-process crossings. The last unowned child in the product, the credentials `security` call, is now in the same guarded registry as the rest and carries an abort handle; the domain imports `node:child_process` in no file. |
| Composition | 3 | **3** | One main assembly root, one session root, one preload bridge, one renderer root. 32 registrars install from `capabilities.ts` and the production `before-quit` handler reaches its one ordered disposer. |
| IPC capability | 3 | **3** | 222 invoke channels, byte-identical to the pinned inventory. Declaration, preload exposure, registration, sender trust and quit admission agree across 5 files and 41 tests. The phase added no channel. |
| Domain cohesion | 3 | **3** | Login choice, credential preservation, credential shutdown, usage, git history and Architecture reading each have a named owner. The new shutdown owner is a leaf in its own domain, not a branch of the composition root. |
| Dependency direction | 3 | **3** | 1,187 files and 6,657 imports produce zero boundary violations; 1,185 graph files and 4,033 runtime edges contain zero strongly connected components, with the new lifecycle module inside the domain that depends on it. |
| State ownership | 3 | **3** | Selection, durable session login, secret recovery and usage attribution remain four separate truths. The phase added no store, no setting and no renderer state; its new refusals travel an existing result to an existing caption. |
| Lifecycle | 2 | **2** | The credential half is closed: admission closes before the first await, the accepted work is joined and reported, children end by handle, and the join's position is pinned. The split-session half is not: an intermittent renderer-heap slope reproduced twice at the starting commit, has not reproduced in nine runs since over a byte-identical renderer, and is unexplained. |
| Type truth | 3 | **3** | Shared, main, preload and renderer contracts remain separated and the bridge closure is green. `src/shared` was not touched by this phase; the shutdown report and session-evidence union are main-only. |
| Failure flow | 2 | **3** | Unavailable session evidence is a third state asked above every write and refused with the choice unchanged. An unclassified activation throw returns a refusal, records nothing and never claims more than it knows, while the domain's own refusals and Phase 211's typed lock refusals stay distinct. Sixty ablations go red one clause at a time. |
| Test seam | 2 | **3** | The deadline probe reads its registration back through the control plane's own export, fails with the greeting timer ablated away, and leaves nothing behind when forced to throw mid-run. The scale grader rejects 18 hostile fixtures including a plateau over a workload that did not land. Hermetic, native, smoke and packaging lanes all run. |
| Navigation | 3 | **3** | The phase's 4,511 lines entered a new domain leaf, two probes, two gates and two test files. Large orchestration files remain coherent owners rather than cross-domain funnels. |
| Build boundary | 3 | **3** | Import, cycle, IPC, lazy-surface, SSH, Electron and background teardown, menu, CSS-order and eager-size gates are active and green, and the eager budget has 450,366 raw bytes of headroom rather than 2,232. |
| **Total** | **33** | **35** | **Eleven categories at 3; Lifecycle has one specific, unexplained exception.** |

## Adversarial score challenge

**A friendly reading would award 36 because the phase completed its checklist.** Rejected, and the brief refuses it by name. Item 5's own stop condition is that an unproved category stays at 2 with the missing evidence named. The split half is unproved: no owner, no retaining path, no explanation of the intermittency, and nine green runs of a profile that has failed intermittently for three phases.

**A friendly reading would award Lifecycle 3 because the credential half is unusually thorough.** Rejected. The category has two halves in this brief and both must pass. The credential half would carry the point on its own merits; it does not get to carry the other half's.

**A harsher reading would keep Failure flow at 2 because three ownership sites can be unwired with the battery green.** Rejected. That gap is about how well the *lifecycle* guard is protected, not about whether a failure is reported truthfully. The failure paths themselves are asked at runtime through the real registered handler, with an unavailable seam, an unclassified throw, a partial write and the Phase 211 success all separately pinned, and each guard goes red alone.

**A harsher reading would keep Test seam at 2 because the deadline probe was never broken.** Rejected, though it is the closest call here. The September finding is refuted rather than repaired, and a probe whose passing leg had only ever been watched passing was not yet a check. It is one now: the ablated build opens its connection, spawns its child, and does *not* fall back, which is the reading that makes the unablated run mean something.

**A harsher reading would lower Composition because the disposer grew a domain-specific block.** Rejected. Three statements and one log line, calling exported functions of the domain that owns them, in the file whose stated job is ordered teardown, is the composition root doing composition. The alternative — the domain reaching into quit on its own — is the shape this codebase has removed twice.

**A harsher reading would lower Process ownership because 36 files still import `node:child_process` directly.** Rejected. Most are harness and remote-machine transports whose children are short-lived and awaited, the two teardown gates assert the property that actually matters for the rest, and the one child that had no owner at all is the one this phase moved.

## The one remaining step to 36

| Order | Work | Score affected | Required proof | Product risk |
| --- | --- | --- | --- | --- |
| 1 | Explain or repair the split-session renderer retention. | Lifecycle | Either a reproduced slope with a retaining path, a named owner, a repair and a regression that goes red when the repair is removed; or a written explanation of the intermittency with a control that reproduces both arms on demand. Past Sessions stays complete and the workload is not lowered. | Medium; the repair target would be session history or terminal attachment state. |
| 2 | Pin the three unwired ownership sites and add a runtime arm for the join's position. | No point; protects Lifecycle | An arm over a `logins:remove` and a gate clause over the vault migration, each red under its own one-line ablation. | Low; test-only. |
| 3 | Rerun the whole rubric on one pinned commit. | All | Every ordinary and specialist check green together. | Read only. |

No rewrite, no new process model and no folder reorganisation is called for. The remaining work is one diagnosis and a few guards.

## Named exemplar comparison

VS Code remains the named exemplar: a mature TypeScript Electron application with explicit runtime layers, contribution boundaries and lifecycle contracts.

Its lifecycle primitives aggregate disposables, track parent ownership, and define what happens when work is registered *after* disposal. That last clause is exactly the shape this phase closed, and it is worth naming precisely because Tortie found the same defect the primitive exists to prevent: a fire-and-forget chain whose last link installed watch handles after the disposer had finished with the domain. Tortie's answer is the same in substance — admission that closes before the first await, a tracked set that outlives the cache, and a bounded join that reports whether it joined — reached through one small module rather than a general disposable framework. At this scale that is the right divergence. [VS Code disposable lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts), [VS Code workbench lifecycle contract](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

VS Code's source-organisation guidance separates common, browser, node and Electron environments and asks each contribution to expose one internal API file. Tortie's main, preload, renderer and shared walls, domain barrels and single typed bridge implement the same pattern at a smaller scale, and this phase is a good instance of it: the credentials domain exports a shutdown surface through its own index and the composition root calls that, rather than the root reaching into `security.ts` or the domain reaching into quit. [VS Code source code organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)

Intentional divergences remain correct. Tortie has no extension host and refuses one. Durable terminals live in tmux. Remote execution is allowlisted. Machine and session identities are immutable. Credential switching uses vendor stores and the macOS keychain rather than a general service platform, and the person's own default store is read-only except under Phase 211's named conditions.

## Verification

Every row was run by this audit at `c319122`, in the detached worktree, on 7 September 2026. Node 22.23.1, npm 10.9.8, vitest 4.1.10.

| Check | Fresh result at `c319122` |
| --- | --- |
| `npm run typecheck` | Pass. 1,187 production files, 6,657 imports, 0 boundary violations, 42 fixtures behaved; 1,185 runtime graph files, 4,033 edges, 0 strongly connected components, 15 fixtures behaved; shared-type gate green. |
| `npm run build` | Pass, every gate. Eager renderer 1,549,634 raw and 391,524 gzip in 2 chunks, under budget by 450,366 and 108,476; 18 lazy surfaces in 11 chunks; 8 probe markers outside the eager set. |
| Electron teardown gate | Pass: 227 build files read, none starts an Electron itself, 87 reach the one runner against a floor of 87, the helper's kill is inside a `finally`. |
| Background teardown gate | Pass: 229 build files read, 1 starts a process it does not wait for and ends it inside a `finally`; 19 of 19 fixtures behaved. |
| Known-hosts gate | Pass: 254 build files read, 19 scripts reach the one SSH helper, no unrouted SSH-family spawn anywhere; 36 fixtures of which 32 must fail, and every one did. |
| Contract inventory | Pass: byte-identical to `docs/audits/contract-baseline.txt` at 222 invoke channels, 100 environment names, 40 storage keys, 37 harness smoke modes. |
| Hermetic classification gate | Pass: 167 check scripts classified, no runner outside the lockfile. |
| IPC closure, single bridge, quit admission, sender trust | Pass: 5 files, 41 tests. |
| `npm test` | Pass: 780 files passed and 1 skipped; 12,246 tests passed and 2 skipped. |
| `npm run test:hermetic` | Pass: 775 files passed and 1 skipped; 12,218 tests passed and 2 skipped. |
| `npm run test:native` | Pass: 5 files, 28 tests. |
| `npm run smoke:t1` | Pass: create 5 of 5, verify 6 of 6, including reattach and manifest reconciliation across a simulated restart. |
| `npm run smoke:t3` | Pass: prep 6 of 6 and verify 3 of 3, sessions killed out of band and restored. |
| `npm run conformance:credentials` | Pass: 13 files scanned, 22 of 22 scanner fixtures, 6 ordered account pairs with all three accounts intact at every hop, 4 interrupted-write arms, 6 attack shapes, 21 keychain calls with no payload on any, 4 of 4 security fixtures, **9 of 9 disposer fixtures**, and **60 of 60 ablations red**, one clause at a time. |
| `npm run conformance:logins` | Pass: 6 files scanned, 2 guarded deletion calls and neither names a default location, 14 of 14 scanner fixtures, 13 ownership shapes, 6 rows dropped whole, confirm hash `72a77146867c` unchanged, 16 of 16 ablations red, 5 of 5 choose-catch fixtures. |
| `npm run conformance:machines` | Pass, including the structural no-server classifier driven from a second copy of the error module. |
| `npm run conformance:arch`, `:arch:modules`, `:reading` | Pass: no contract value reaches an argv, both level-2 fallbacks and caps bite, and the reading's box set, sentences, hover facts and 19 ablations all hold. |
| `npm run conformance:redline`, `:filehistory`, `:historysearch` | Pass: 3,000 Redline fuzz pairs with no refused repair, the followed walk pinned row for row with three ablations red, and 30 hostile search shapes each composing one argv element. |
| `npm run conformance:agents`, `:installs`, `:context`, `:overview`, `:watcher`, `:remoteclose` | Pass: resume argv byte-equal from the manifest row alone, 14 registry rows with well-formed install maps, 39 agent-and-category context pairs, every mapped overview provider at its banked ratio, all four watcher subscribe sites inside the eight-path budget, and 11 remote-close tests. |
| `npm run probe:controldeadline` | **Pass.** Leg 1: 1 held SSH child, fallback at 10,003 ms against the 10,000 ms deadline, the deadline sentence and its clause both true, the child dead afterwards, the link reading `polling`. Arm 0: the readback found the program, search list, socket and control path for all three machines before anything spawned, and the forced-failure child held 3 pids and 2 directories and left 0 and 0. Arm 6: the greeting timer was found in exactly 1 place; the ablated build opened its connection and spawned its child, did **not** fall back, and left the child alive. Leg 3 greeted a healthy far side in 15 ms while the stalled one was handled. The operator's server read 12 sessions before and 12 after. |
| `node build/probe-p167-scale.mjs --self-test` | Pass: 18 fixtures, every red one rejected and every green one accepted, including a plateau over a workload that did not land and a census that came back empty. |
| `npm run probe:p167`, all three profiles | **Pass.** Profile b: heap 7.7, 7.7, 7.7 MB, 447 nodes and 229 listeners flat. Profile c at a quarter CPU speed: heap 25.8, 27.4, 27.4 MB, 967 nodes and 304 listeners flat, 18 diff opens with `transition-property: none` and no transition running. Profile d: heap 28.5, 28.4, 28.4 MB, 502 nodes and 265 listeners flat, 13 detached elements constant, `/dev/ptmx` and `/dev/ttys` at 0 before and after every block, and Past Sessions recording 24, 48 and 72 discarded sessions, so the workload landed. The planted leak at the end put 1,032 elements in 24 detached trees; the census saw exactly 1,032 more, the grader raised a finding, and 0 were still held after the page let go. |
| Independent ablation, mine | With the admission check removed from the one `security` runner, `shutdown_settles_held_security_read_and_write` goes red. With the lock refusal removed from `acquireLock`, `shutdown_during_vendor_lock_keeps_recovery` goes red. Both files were restored and the tree is clean. |
| Independent ablation, mine | With `trackCredentialWork` removed from the vault migration, 150 of 150 tests and `conformance:credentials` all stay green, which is the P2 finding above measured rather than repeated. |
| Independent trace, mine | `app.on('before-quit')` in `src/main/index.ts` reaches `disposeMainCapabilities()`, whose first statement is `beginCredentialShutdown()`. The gate reads the disposer; this read the caller. |
| Independent scan, mine | The credentials and logins domains import `node:child_process` in 0 files; 36 files elsewhere in `src/main` do, none of them in either domain; there are 20 `runGuarded` call sites in main. |

## Limitations

These are the boundaries of what the score above rests on, and none of them is hidden in a footnote elsewhere.

1. **The split-session finding is open, and a green run is not an explanation.** Nine consecutive green profile-d runs over a byte-identical renderer are consistent with a repaired defect, an environment-dependent defect that is currently dormant, and a measurement artefact at the starting commit. This audit cannot separate those three, and it does not award a point for any of them.
2. **Three of the six lifecycle ownership sites are unprotected**, measured above. The shipped code is correct at this commit; nothing would catch a future edit that removed any of them.
3. **The join's position is guarded by two scans of one source text**, not by a runtime observation. Nothing in the battery drives a real credential write against a closed session core.
4. **No personal credential was touched, so no reading here describes the operator's own keychain.** Every credential and login result comes from fixtures on scratch roots. The keychain search list was not changed, `security` was never given `-g` or `-w`, and nothing under the person's home was written. The live pickup of a switched account by a running vendor process remains unmeasured for the reason research 79 gives.
5. **The deadline probe's timer feed is only partly in scope.** Leg 1 proves the control plane calls the sink with the deadline sentence; the arming side of that feed lives in `machines/remote-sessions.ts` and this phase did not change it, so the probe installs its own sink and says so.
6. **This score is ordinal and local.** It measures ownership boundaries and their executable protection. It says nothing about product quality, performance under the operator's real workload, or the parts of the system exercised only by hand.

## What was not run

- **`npm run package`.** The integrator produced a signed `Tortie-0.100.0-arm64.dmg` at `625498d`; this audit did not repackage at `c319122`, whose six later commits change `src/main`, tests, gates and documents. The packaging claim in this audit is therefore the integrator's, at that commit, and not a fresh reading.
- **Two further focused profile-d samples at this commit.** The brief's closing proof is one full run plus two focused ones. This audit ran the full run, which includes profile d; the other two exist at the phase's earlier commits over a byte-identical renderer. Running two more would have produced two more green readings and could not have changed the Lifecycle verdict, which turns on an explanation rather than a count.
- **`npm run conformance:hue`.** About eleven minutes, and no file under its trigger list changed in this phase.
- **The app-level credential probes** `probe:p202`, `p203`, `p204`, `p208` and `p211`. The credential claims here rest on the shipping modules driven under vitest and on `conformance:credentials`, which runs the shipping domain under node over injected keychains.
- **`probe:p166`, `probe:p219`, the remote-machine smoke matrix, the full tmux recovery battery, live manifest-damage exercises and P165 launch timing.** None is touched by this phase's owners.
- **A live vendor account switch, a paid agent turn, and any request to a vendor endpoint.** Refused by the brief and by this repository's conventions.
- **Anything on the operator's own machine state beyond reading his session count.** His `-L gmux` server held 12 sessions before and 12 after every run here and was never addressed. Socket `gmux-p218` belongs to another phase and was left alone.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- a running session keeps the login it launched under;
- an account switch reports what actually happened, including when a running session could not be checked;
- an unclassified failure is never recorded as a successful choice, and nothing is rolled back over a vendor refresh;
- credential admission closes synchronously before the first await of the quit, and accepted work is joined and reported;
- this domain's `security` children are ended by the handle that spawned them and never by name;
- a vendor lock is refused rather than taken during a quit, and never stolen or released;
- staged credential writes confirm byte equality and leave old or new, never neither;
- credential bytes never enter argv, IPC, logs, errors or renderer state;
- the person's own default vendor store is written only under Phase 211's named conditions;
- explicit uncertain remote outcomes and journalled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- one helper for verification SSH and no writes to the person's known-hosts file;
- every probe ends the Electron, the server and the children it started, in a `finally`;
- one renderer state facade per domain, lazy secondary surfaces, and enforced eager-bundle ceilings;
- no production runtime cycles;
- idempotent resource disposal owned by the composition root.

## Bottom line

The 0.100.0 codebase at `c319122` scores **35 out of 36**.

Two of the three September exceptions are closed, and both were closed the hard way: by re-measuring the finding before believing it, refuting one of them outright, and repairing what was actually there rather than what the list said. An account switch now separates what Tortie knows from what it could not find out, and says which of the two it is. The credential domain has one shutdown owner, its interruption points were defined before its cancellation was wired, and the quit joins what it accepted and reports whether it really joined. Both repairs moved no public contract at all: no channel, no setting, no shared type, no renderer file.

The remaining point is one diagnosis, not one repair. A renderer-heap slope failed twice at the phase's starting commit and has passed nine times since over the same renderer bytes, and nobody can yet say why either half of that is true. The ruler is much better than it was — it can tell a plateau from an empty run, it counts detached elements against a budget, and it proves on every run that it can see a planted leak — but a better ruler is not an explanation, and the brief was explicit that this category needs both halves.

Everything else holds with current evidence, re-established at this commit rather than inherited: zero boundary violations, zero runtime cycles, a byte-identical IPC inventory, four separate state authorities, 450 KB of eager bundle headroom, and a verification lane that now includes a deadline probe which fails when its subject is taken away.
