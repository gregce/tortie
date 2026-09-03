# Electron and TypeScript architecture audit — 0.99.0

Date: 2 September 2026

Status: Fresh architecture review after the 0.99.0 release. This is a new, standalone audit. It does not replace the 0.98.0 assessment.

Assessed source: commit `84a281d4443e2279eca06993043a1b3a796ccead` on `main`, with package version 0.99.0. The shipped tag is `v0.99.0` at `57d9358`. The only change between that tag and the assessed commit is two lines in `docs/BACKLOG.md`, so the application source assessed here is the released application source.

The comparison point is `1120c5a7a3e9ca6d35e070aa1f57490ec05ad750`, version 0.98.0, assessed in [the previous audit](./2026-09-01-electron-typescript-architecture-0.98.0.md). Verification ran from a detached worktree pinned to the assessed commit. The main worktree contained unrelated operator-owned changes and untracked files; this audit did not modify them.

## Outcome

The current architecture score is **33 out of 36**.

This is the same total as 0.98.0, but it is not the same result. The release repaired most of the previous audit's evidence:

- the machine no-server classifier is structural and its conformance gate passes;
- hook, usage and live Diagnostics shutdown is now ordered, cancelling and joined;
- the hermetic lane no longer runs the host SpecStory binary and now passes in full;
- the Electron memory probe strips development renderer variables and enables Architecture itself;
- the key-install probe reaches its real subject and passes;
- the former diff DOM/listener retention reproduces no longer.

The score does not rise because fresh review found three remaining exceptions:

- Lifecycle remains 2. The split, close and reattach profile has a repeatable renderer-heap slope. The new credential keeper also starts `security` children without a cancellation or quit-time join.
- Failure flow remains 2. The old machine-classifier failure is fixed, but the new credential switch treats a failed live-session query as an empty list and may therefore write when it cannot prove that no running agent uses the store. The IPC layer also records the choice after an unexpected activation exception.
- Test seam remains 2. `probe:controldeadline` no longer dies on its missing runner import, but it still cannot reach the deadline path: its generated driver registers machine context through a loader identity that the control-plane import does not see. Two fresh runs failed identically.

This is not a 91.7% product-quality grade. It is an ordinal architecture score. A 3 means an ownership boundary is explicit, narrow and protected by a passing executable check. Nine categories meet that strict bar. Three have local, evidenced exceptions.

## Change since 0.98.0

The comparison range contains 130 commits and changes 330 files, with 36,771 insertions and 954 deletions. Non-test production TypeScript and TSX changed in 187 files, with 13,285 insertions and 664 deletions. The current non-test production TypeScript and TSX tree is about 332,947 lines.

Despite that growth, the dependency graph remains acyclic and the application crossings remain bounded.

| Measure | 0.98.0 audit | 0.99.0 |
| --- | ---: | ---: |
| Production files in the import gate | 1,111 | 1,150 |
| Imports checked | 6,224 | 6,458 |
| Production files in the runtime graph | 1,109 | 1,148 |
| Runtime edges | 3,754 | 3,900 |
| Runtime strongly connected components | 0 | 0 |
| Invoke channels | 217 | 221 |
| Eager renderer JavaScript, raw | 1,983,012 bytes | 1,997,768 bytes |
| Eager renderer JavaScript, gzip | 445,061 bytes | 449,245 bytes |

The four new invoke channels are the one typed `logins:*` capability: list, add, choose and remove. They carry provider ids, login names and snapshots. They do not carry a credential, a filesystem path supplied by the renderer or a command.

### What the release added

| Work | Architectural effect | Ruling |
| --- | --- | --- |
| File history | Extended the existing git service and SCM surface with a file-scoped walk that follows renames. | Correct reuse. No second git owner or store. |
| History search | Added one pure query parser and one argv composer before the existing history walk. | Strong boundary. The conformance gate proves every value remains one argv element and literal pathspecs stay behind `--`. |
| Readable Architecture map | Added cached tracked-tree facts, pure grouping and sentence composition, and focused renderer presentation. | Strong separation of collection, model and display. No toolchain execution was added. |
| Multiple logins | Added a shared contract, one main login store, one renderer state facade and four invoke channels. | Cohesive and narrow. Selection is distinct from credential bytes and from a running session's immutable login fact. |
| Kept credentials | Added a dedicated credentials domain with injected store, vault, clock and session seams, one staged and verified write, and a substantial conformance gate. | A strong durability design with two failure/lifecycle exceptions described below. |
| Usage per login | Reused the existing usage owner and marked an old account's in-flight answer stale instead of drawing it under a new account. | Correct state ownership. No second meter store. |
| Architecture fixes from the prior audit | Made error recognition structural, joined shutdown, repaired harness environment, and removed reduced-motion transitions. | Most of the previous 33-to-36 plan landed and is now verified. |

## Current architecture

### Runtime composition is still legible

```text
Electron main root
  -> capabilities.ts: registrars and ordered teardown
  -> sessions/core.ts: durable session orchestration
  -> domain services
       -> git and SCM reads
       -> Architecture scan, store and projection
       -> login selection and credential keeping
       -> usage, Diagnostics and remote machines

context-isolated preload
  -> one typed bridge, now including logins

renderer root
  -> domain state facades
       -> sessions, usage and logins
  -> lazy secondary surfaces and modal family
       -> Architecture, editor modes, SCM history and add-login modal
```

There is still one Electron main assembly root, one session composition root, one context-isolated preload bridge and one renderer root. New registrars enter through `capabilities.ts`. The import and runtime-cycle gates both confirm that feature growth has not created another composition root by dependency accident.

### Login selection, credential bytes and sessions are separate truths

```text
Usage meter or Settings
  -> renderer logins state facade
  -> typed preload bridge
  -> logins IPC
       -> logins store: names, owned directories and current choice
       -> credentials keeper: whole credential bytes in Tortie's vault

new session
  -> launch plan resolves the chosen login once
  -> manifest records the login name
  -> running session keeps that fact for its lifetime

usage read
  -> resolves the current login
  -> drops an answer issued for the login the person has left
```

This is the right state model. `logins.json` owns the person's current choice. The manifest owns which login a durable session launched under. The credentials vault owns recoverable secret bytes. The usage service owns which account its current figures describe. They overlap in subject but not in meaning.

The credentials implementation also gets several difficult things right:

- it never puts a secret on an argv, in IPC or in a log;
- macOS writes go to `security -i` over stdin;
- writes stage, read back, commit and confirm;
- a symlink planted at a staging name is refused;
- the person's default vendor store is not written;
- an account switch is an explicit gesture and does not rewrite running sessions;
- overlapping observations and interrupted writes have adversarial coverage.

### File history and search remain one read path

```text
SCM History or File History
  -> pure query parser
  -> search-args.ts
       -> one argv element per operator and value
       -> literal pathspec after --
  -> existing git service
  -> existing editor change view
```

The UI gained both repository history search and file history without creating another git process owner. File History follows renames in the main git service. Search syntax becomes a typed description before argv is composed. The focused conformance gates independently ablate `--follow`, the name-status parser, grep argument grouping, revision refusal and literal pathspec placement.

### Architecture reading is collection, model, then prose

```text
tracked tree and existing import scan
  -> tree-facts.ts: cached line and manifest facts
  -> reading.ts: boxes, partners, languages and entries
  -> sentence.ts: deterministic prose
  -> map IPC
  -> Architecture renderer
```

The new readable map does not mix prose judgement into scanning. Tree facts are cached under the same stamp as import facts. Grouping and sentences are pure. The renderer draws the result. `conformance:reading` pins five fixture trees, nineteen ablations, exact sentences and the rule that composition starts no process.

## What happened to the previous priorities

| 0.98.0 finding | 0.99.0 evidence | Status |
| --- | --- | --- |
| Nominal `GmuxError` identity broke the no-server classifier. | `serverProbeVerdict` now reads a validated payload by structure. Machine conformance passes every row. | Landed. |
| Hook, usage and Diagnostics were not one joined shutdown unit. | Hook admission closes before awaits, accepted requests are boundedly joined, usage cancels HTTPS and keychain work, and main stops live Diagnostics. Focused shutdown tests and quit ordering pass. | Landed for those owners. |
| Hermetic tests used the installed SpecStory binary. | The host-binary assertion moved to the native lane and hermetic compatibility uses a captured fixture. All 11,709 hermetic tests pass. | Landed. |
| Electron probes inherited a development renderer URL. | The common Electron runner strips `ELECTRON_RENDERER_URL`, `NODE_ENV_ELECTRON_VITE` and `NODE_ENV`. The P167 run loaded the built `file:` renderer. | Landed. |
| Key-install and control-deadline probes crashed before their subject. | Key install passes. Control deadline gets beyond the old `tsxCli` exception, but its machine registry is invisible to the control-plane copy and it fails before spawning the held SSH child. | Partial. |
| Surface open/close retained about 1,500 DOM nodes and 126 listeners per block. | The isolated profile now drives all five surfaces. Worst later-block growth was 198 nodes, zero listeners and 1.6 MB heap. All 18 diff opens had no transition. | Landed. |
| Split/close/reattach needed a stable plateau. | The fresh run failed with a 5.3 MB then 4.9 MB renderer heap rise. PTY descriptors returned to zero. | Open. |

## Priorities

### P0 — fail closed when live-session ownership cannot be read

`activateLogin()` correctly says that writing a different credential into a store used by a running agent can sign that agent out mid-turn. It then asks `liveSessions()`, but converts any rejection to `[]` in `src/main/credentials/keep.ts`. Empty means “safe to write”. The safety decision therefore becomes permissive when its evidence source fails.

There is a second permissive branch in `src/main/logins/ipc.ts`: if `activateLogin()` throws unexpectedly, the handler logs a failed activation and still records the login choice. The returned action can be `ok: true` even though the account was not restored.

These are source-proven control-flow gaps, not proof that a person's agent has already been interrupted. The smallest safe change is:

1. make the live-session seam return a result that distinguishes known rows from unavailable evidence;
2. refuse the credential write when the answer is unavailable;
3. make an unexpected activation error return `ok: false` and leave the chosen login unchanged;
4. keep the existing rule that choosing the person's default login writes nothing.

Required proof:

- inject a rejected live-session query and prove no vault or vendor-store write occurs;
- inject an activation exception through the real login handler and prove the previous choice remains recorded;
- keep every ordered account-pair switch and all interrupted-write arms green;
- run an app-level case with a held session and prove the refusal copy is visible.

This is P0 because the guard protects a running agent's credential environment. The repair should not alter a successful account switch.

### P1 — enrol credential work in ordered shutdown

The 0.99 lifecycle repair correctly routed the usage domain's keychain child through owned cancellation. The new credentials domain introduced a second keychain runner afterwards. `defaultSecurityRunner()` starts `/usr/bin/security` with raw `execFile`, a 10-second timeout and no cancellation handle. The login domain holds `observeInFlight`, but exposes no shutdown admission or disposer, and `disposeMainCapabilities()` does not join it.

This recreates the ownership shape that the 0.98 audit asked the usage domain to remove. A login list or choice accepted just before quit can still be reading or writing a keychain item after the ordered disposer has moved on.

Give `SecurityRunner` cancellation, track its children through the existing guarded process owner, add login/credentials shutdown admission, and join or cancel `observeInFlight` and activation work within the existing quit bound. Required proof:

- hold a `security` read and a `security -i` write, start quit, and prove only the children from this domain are ended;
- prove a request admitted after shutdown starts gets the typed refusal and creates no child;
- prove a request accepted before shutdown either commits and confirms or leaves the old credential intact before the join resolves;
- keep the no-work quit path effectively immediate.

### P1 — isolate the split-session renderer heap slope

The fresh P167 run created and discarded 24 shell sessions per block. The renderer heap readings were 35.1, 40.4 and 45.2 MB. Both block-to-block deltas exceeded half the 8 MB budget, so the grader correctly identified a slope. DOM nodes also rose from 1,828 to 2,848 to 3,868, but this profile does not grade DOM because Past Sessions grows by design. Event listeners fell and stayed flat at 264. Main `/dev/ptmx` and `/dev/ttys` descriptors were zero after every block.

This narrows the problem. The old native descriptor leak is not back. Something in renderer session history, terminal attachment state or a cache reachable from it retains about 5 MB per block.

Do not optimise by guess. Add a split-profile heap snapshot after each block and compare retaining paths. Run separate variants for create/attach, grid staging, kill, and Past Sessions recording. The smallest owner that reproduces the two-step slope is the repair target. Required proof is two consecutive full profile-d runs with heap plateau, descriptors at baseline and Past Sessions still complete.

### P1 — make the control-deadline probe use one module identity

Two clean runs of `npm run probe:controldeadline` failed six assertions. In both, the generated `.mts` driver called `registerRemoteMachineContext()` and `setMachineRemotePath()`, but `openControlPlane()` answered that `hang` and `healthy` had not been signed in. No held SSH child was created, the ten-second deadline never fired, and the healthy remote leg never greeted. The probe did clean up its scratch sshd, tmux server and operator-session count.

This is another loader-boundary identity problem. The driver imports stateful TypeScript modules directly through `tsx`; the control-plane dependency graph observes a different module instance from the one the driver mutates. Removing the missing `tsxCli` exception was necessary but did not make the probe test its subject.

Use one test-facing composition entry that arms the context and opens the plane from the same module graph, or inject the control transport so the deadline can be exercised without mutating a second copy of a module singleton. Add an assertion immediately after arming that the same graph can read the registered id. The probe must fail before starting its sshd if that assertion is false.

### P1 — restore eager renderer headroom before the next feature

The build passes, but the eager renderer is 1,997,768 raw bytes against a 2,000,000-byte limit. The remaining margin is 2,232 bytes, about 0.11%. Gzip has 50,755 bytes of margin.

The boundary still earns a 3 because the ordinary build enforces it and all 18 secondary surfaces remain lazy. The operational consequence is simple: almost any eager feature can now make the build red.

Do not raise the budget without a new launch measurement. First inspect the eager chunk attribution and move a genuinely secondary login, history or presentation dependency behind an existing door. The add-login modal already uses the shared lazy modal chunk and should stay there. A reasonable target is at least 50 KB of raw headroom, followed by P165 warm-launch and first-open checks.

### P2 — keep three concentration points on watch

The largest current production files include `sessions/core.ts` at 3,297 lines, `machines/remote-sessions.ts` at 3,124, `renderer/scm/ScmSection.tsx` at 1,947 and `main/git/service.ts` at 1,776.

Line count alone is not a reason to split them. They are not forming runtime cycles and the new work generally entered focused leaves. The next reason to change each file should use a concrete seam:

- move completed-pass reconciliation from `remote-sessions.ts` only when another remote feed changes it;
- move a file-history controller from `ScmSection.tsx` if another SCM surface needs the same state machine;
- extract a history-walk service from `git/service.ts` if another caller needs its pagination, cancellation and rename semantics;
- keep `sessions/core.ts` as composition, moving behaviour only when it acquires a second caller or resource owner.

## Scorecard

Scores use the established four-level rubric.

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | 0.98.0 | 0.99.0 | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | **3** | Electron, tmux, git, SSH, Architecture workers and keychain programs have named main-process crossings. Credential-child teardown is a lifecycle deduction, not an ambiguous process target. |
| Composition | 3 | **3** | Main, sessions, preload and renderer roots remain identifiable. Login and credentials integration is installed from `capabilities.ts`; no second root appeared. |
| IPC capability | 3 | **3** | The byte-pinned inventory now has 221 invoke channels. Declaration, preload exposure, registration, sender trust and quit admission agree; all 36 focused tests pass. |
| Domain cohesion | 3 | **3** | Login choice, credential preservation, usage, git history and Architecture reading each have a named owner and focused model. Their integration occurs at explicit adapters. |
| Dependency direction | 3 | **3** | 1,148 production graph files and 3,900 runtime edges contain zero SCCs; 6,458 imports produce zero boundary violations. |
| State ownership | 3 | **3** | Selection, durable session login, secret recovery and usage attribution are separate truths with separate owners. No competing manifest, tmux or renderer store was added. |
| Lifecycle | 2 | **2** | Surface close now passes and usage shutdown improved, but split churn has a renderer heap slope and credential `security` children and in-flight observation are not enrolled in quit. |
| Type truth | 3 | **3** | Shared, main, preload and renderer contracts remain separated and the bridge closure is green. Login paths and secret payloads do not enter renderer contracts. |
| Failure flow | 2 | **2** | Machine no-server classification is repaired. Credential activation still fails open when live-session evidence or an unexpected activation step is unavailable. |
| Test seam | 2 | **2** | Hermetic, environment and key-install seams are repaired. The control-deadline probe still cannot reach the stateful module instance used by its subject. |
| Navigation | 3 | **3** | Growth entered focused files and public facades. Large orchestration files remain coherent owners rather than cross-domain dependency funnels. |
| Build boundary | 3 | **3** | Import, cycle, IPC, lazy-surface, SSH, probe, teardown and eager-size gates are active and green. Eager raw headroom is critically narrow but still enforced. |
| **Total** | **33** | **33** | **Nine categories at 3; three categories have specific, local exceptions.** |

## Adversarial score challenge

A friendly reading would award 35 because the project log says the old Failure flow and Test seam findings landed. That reading was rejected. The score is based on fresh execution and current control flow. The control-deadline probe fails twice before its subject, and the new credential write guard explicitly turns unknown live-session evidence into permission.

A friendly reading would award Lifecycle 3 because the former surface leak is fixed and the new joined shutdown tests are unusually good. That reading was rejected. The full P167 profile fails on split-session heap growth, and a new raw `security` child is outside the same shutdown ownership model the release just established for usage.

A harsher reading would lower Dependency direction because credentials reaches login internals and login IPC calls credentials. That reading was rejected. The runtime graph is acyclic, the integration is behind a registrar, and the gate prevents a directory-level feedback loop from becoming a module cycle.

A harsher reading would lower Navigation because several files exceed 1,700 lines. That reading was rejected. New history parsing, argv composition, Architecture reading and credential durability were split into focused leaves with independent conformance checks. Size is a watch signal, not proof of confused ownership.

A harsher reading would lower Build boundary because only 2,232 raw bytes remain. That reading was also rejected. The boundary's job is to be explicit and enforced; the normal build is currently green. The narrow margin changes priority, not the score.

## Safe order to reach 36

| Order | Work | Score affected | Required proof | Product risk |
| --- | --- | --- | --- | --- |
| 1 | Fail closed when live-session or activation evidence is unavailable. | Failure flow | Rejected live-session and activation exceptions cause no write and no choice change; account matrix stays green. | Low; only failure behaviour changes. |
| 2 | Give credentials shutdown admission, child cancellation and an in-flight join. | Lifecycle | Held read/write quit tests; no-work quit timing; interrupted-write invariants. | Low to medium; credential writes are sensitive. |
| 3 | Isolate and repair the split-session renderer heap owner. | Lifecycle | Two consecutive full profile-d plateaus, descriptor baseline and correct Past Sessions. | Medium; preserve session-history behaviour. |
| 4 | Repair the control-deadline probe's module graph. | Test seam | Held child reaches deadline, healthy leg greets, operator state and scratch processes unchanged. | Low; verification only. |
| 5 | Reclaim eager renderer headroom. | No current point; protects Build boundary | Chunk attribution, at least 50 KB raw headroom, P165 startup and first-open checks. | Low if an existing lazy door is used. |
| 6 | Rerun the whole rubric on one pinned commit. | All | All ordinary and specialist checks green together. | Read only. |

No broad rewrite or folder reorganisation is needed. The first four changes are local seams. The only user-visible behavioural difference should be a clear refusal when Tortie cannot prove an account switch is safe.

## Named exemplar comparison

VS Code remains the named exemplar because it is a mature TypeScript Electron application with explicit runtime layers, contribution boundaries and lifecycle contracts.

Its current source-organisation guidance separates common, browser, node and Electron environments. It also asks each workbench contribution to expose one internal API file and warns other contributions not to reach into its internals. Tortie's main, preload, renderer and shared import walls, domain barrels and single typed bridge implement the same useful pattern at a smaller scale. The 0.99 login and history work mostly follows that pattern: it adds domain-specific contracts and adapters rather than adding cross-layer shortcuts. [VS Code source code organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)

VS Code's lifecycle primitives aggregate disposables, track parent ownership and define what happens when work is registered after disposal. Its workbench lifecycle gives shutdown work named joiners, an order and a cancellation token, then reserves final shutdown for resource disposal. Tortie's joined hook and usage shutdown now compares well with that model. The raw `security` runner and credential observation do not yet: they are resources without admission, cancellation or a named join. [VS Code disposable lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts), [VS Code workbench lifecycle contract](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

Intentional divergences remain correct. Tortie has no extension host. Durable terminals live in tmux. Remote execution is allowlisted. Machine and session identities are immutable. The Architecture database is disposable. Status-line helpers belong to surviving agent sessions. Credential switching uses vendor stores and the macOS keychain rather than a general VS Code-style service platform. One context-isolated preload bridge remains preferable at Tortie's scale.

## Verification

| Check | Fresh result at `84a281d` |
| --- | --- |
| `npm run typecheck` | Pass: 1,150 production files, 6,458 imports and zero boundary violations; 1,148 runtime graph files, 3,900 edges and zero SCCs; shared-type gate green. |
| `npm run build` | Pass. Contract inventory matches 221 invoke channels. Eager renderer JavaScript is 1,997,768 raw and 449,245 gzip; all 18 lazy surfaces remain in 11 chunks. Probe markers remain outside eager code. |
| Electron teardown build gate | Pass: 204 build files checked; 56 reach the one Electron runner and none starts Electron directly. |
| Known-hosts build gate | Pass: 206 build files checked, 19 routed probe clients and 36 fixtures; direct SSH-family spawning outside the helper is refused. |
| IPC closure, single bridge, quit admission and sender trust | Pass: 4 files, 36 tests. |
| `npm run test:hermetic` | Pass: 733 files passed, 2 skipped; 11,709 tests passed, 23 skipped. No host SpecStory failure remains. |
| `npm run test:native` | Pass: 5 files, 27 tests passed and 1 skipped. |
| `npm run conformance:machines` | Pass, including the structural no-server classifier and the remote safety matrices. |
| Architecture conformance | Pass: `conformance:arch`, `conformance:arch:modules` and `conformance:reading`, including exact prose, caps, nine resolver languages and nineteen red ablations. |
| SCM conformance | Pass: `conformance:redline`, `conformance:filehistory` and `conformance:historysearch`; Redline also passed 3,000 fuzz pairs. |
| Login and credential conformance | Pass: `conformance:logins` and `conformance:credentials`, including hostile names, ordered account pairs, interrupted writes and ablations. The missing fail-closed live-session case is a finding above. |
| `npm run conformance:remoteclose` | Pass: 1 file, 11 tests. |
| `npm run probe:keyinstall` | Pass. It reached the live loopback sshd, preserved the person's SSH files byte for byte and returned the operator's tmux session count to 49. |
| `npm run probe:controldeadline` | Fail twice, six assertions each time. The generated driver cannot make the control-plane graph see its registered `hang` or `healthy` contexts. Scratch processes and operator session count were restored. |
| P167 project-switch profile | Pass: heap 7.9, 8.0, 8.1 MB; 447 nodes and 228 listeners throughout. |
| P167 surface profile | Pass: later-block heap growth at most 1.6 MB, node growth at most 198 and no listener growth; 18 diff opens had `transition-property: none` and zero running transitions. |
| P167 split/close/reattach profile | Fail: heap 35.1, 40.4, 45.2 MB, a 5.3 then 4.9 MB slope. PTY descriptor counts returned to zero. |

Not run: packaged-app smoke, live vendor usage endpoints, the current full remote-machine smoke matrix, the full tmux recovery battery, live manifest-damage exercises, P165 launch timing and a real account switch against personal credentials. No personal credential or remote machine was touched.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- a running session keeps the login it launched under;
- a credential store used by a running session is never rewritten without a proven-safe answer;
- credential bytes never enter argv, IPC, logs, errors or renderer state;
- the person's own default vendor store is never written by account activation;
- staged credential writes confirm byte equality and leave old or new, never neither;
- explicit uncertain remote outcomes and journalled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- one helper for verification SSH and no writes to the person's known-hosts file;
- no Architecture access to manifest, restore or agent-context durability;
- no usage request, script installation or empty UI while its switch is off;
- a person's existing status line is never replaced or executed by Tortie;
- Redline remains read-only and cannot reach a bridge or write path;
- one renderer state facade per domain, not competing stores;
- lazy secondary surfaces and enforced eager-bundle ceilings;
- no production runtime cycles;
- idempotent resource disposal owned by the composition root;
- existing durable and public contracts remain unchanged during seam work.

## Bottom line

The 0.99.0 codebase is architecturally strong. It absorbed 130 commits, multi-account credential preservation, file history, history search and a more legible Architecture model while keeping a single process model, one typed bridge, explicit state authorities, zero runtime cycles and unusually deep conformance protection.

The fresh score is **33/36**. That unchanged total should not hide real progress: nearly every previous blocker was repaired. It also should not hide new evidence. The credential keeper needs to fail closed and join shutdown, the split-session renderer heap still climbs, and the control-deadline probe still does not reach its subject.

The path to 36 is local and ordered. Make the credential safety question unavailable rather than empty, own its child processes and in-flight work, identify the split-session retaining path, and make the deadline probe use one module graph. Reclaim eager bundle headroom alongside that work. None of this calls for a rewrite, a new process model or a broad rearrangement of the codebase.
