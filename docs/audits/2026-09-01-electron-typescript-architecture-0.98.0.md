# Electron and TypeScript architecture audit — 0.98.0 rerun

Date: 1 September 2026

Status: Fresh read-only architecture review after the 0.98.0 release. This is a standalone audit of the current tree. It does not overwrite the earlier 1 September assessment.

Assessed source: commit `1120c5a7a3e9ca6d35e070aa1f57490ec05ad750` on `main`, version 0.98.0. The comparison point is commit `59268ceaa2b89eda013fe7a5be6f0ea54fd39d41`, version 0.97.0, assessed in [the previous 1 September audit](./2026-09-01-electron-typescript-architecture.md). Verification ran from a detached worktree pinned to the assessed commit. The main worktree contained unrelated operator-owned changes and untracked files; this audit did not modify them.

## Outcome

The current architecture score is **33 out of 36**.

The score is unchanged. That is a good result because the comparison range adds meaningful product and verification capability without adding a process, invoke channel, renderer state authority or runtime cycle.

Nine of the twelve categories meet the strict score-3 bar. Their ownership is explicit, their interface is narrow, and a test or build check protects the claim.

The three categories still at 2 are:

- Lifecycle: the surface open-and-close profile still retains DOM nodes and listeners. Live Diagnostics is still absent from ordered main-process teardown. The usage endpoint still has no cancelling disposer, and an already accepted hook request can outlive the hook server's synchronous `stop()`.
- Failure flow: the current machine conformance gate still fails the one completed “no server” answer because the classifier relies on nominal `instanceof` identity across TypeScript loader boundaries.
- Test seam: the hermetic lane still executes the host SpecStory binary, the Electron probes still inherit ambient development renderer variables, and two named machine probes currently fail because `tsxCli` is imported into their generated driver text instead of the outer runner that calls it.

This is not a 91.7% product-quality grade. It is an ordinal architecture score. The missing points identify three local protections that do not yet meet the maximum standard.

## Change since the previous audit

The assessed range contains 61 commits and changes 112 files, with 20,927 insertions and 622 deletions. Most of that volume is verification, research and tests. Production TypeScript and TSX changed in 39 files, with 3,904 insertions and 100 deletions. The current non-test production tree is about 320,326 lines.

The static graph grew modestly:

| Measure | Previous audit | Current |
| --- | ---: | ---: |
| Production files in the import gate | 1,103 | 1,111 |
| Imports checked | 6,183 | 6,224 |
| Production files in the runtime graph | 1,101 | 1,109 |
| Runtime edges | 3,728 | 3,754 |
| Runtime strongly connected components | 0 | 0 |
| Invoke channels | 217 | 217 |

The new work reused the existing architecture rather than growing around it.

| Work | Architectural effect | Ruling |
| --- | --- | --- |
| Phase 182 live Claude usage | Added a status-line script, one route on the existing hook server, pure tap parsing and one typed usage event. | Strong reuse of existing ownership. It exposes one shutdown-order gap described below. |
| Phase 187 remote close | Added a bounded removal timestamp map and made the live and gone maps explicitly disjoint. | A focused state-machine repair inside the existing remote-session owner. |
| Phase 188 and 188.1 Diagnostics | Made invalid timestamps local row failures rather than whole-report failures and improved explanatory presentation. | Better failure isolation inside the existing domain. |
| Phase 189 project tabs | Added measured width floors, scrolling and a build gate. | UI growth inside the current titlebar owner, with an executable layout contract. |
| Phase 193 SSH probe containment | Routed test SSH, SCP, SFTP and key scans through one helper with a dedicated known-hosts file and hostile fixtures. | A substantial improvement to verification process ownership. It does not change product SSH ownership. |
| Phase 194 Redline | Added a read-only prose projection beside Diff, with pure algorithms, focused components and a conformance gate. | A well-contained renderer contribution with no IPC or write path. |

## Current architecture

### Runtime composition remains stable

```text
Electron main root
  -> capabilities.ts: IPC and long-lived capability registration
  -> sessions/core.ts: session-domain composition
       -> manifest, tmux, attach, activity and remote-session services
       -> existing loopback hook server
            -> activity events
            -> usage tap callback

context-isolated preload
  -> one typed bridge

renderer root
  -> domain stores and lazy surfaces
       -> editor store
            -> file, diff, preview, split, image and Redline modes
```

There is still one Electron main assembly root, one session-domain composition root, one context-isolated preload bridge and one renderer root. The new usage callback is wired in `GmuxCore` because that object already owns the hook server and session-token association. It calls the public usage barrel rather than reaching into an internal parser or renderer module.

This is not a second application composition root. It is, however, the point at which usage shutdown must be coordinated with the session server rather than treated as an unrelated singleton.

### Live usage reuses the existing secure crossing

```text
Claude session status-line invocation
  -> generated, managed shell script
       -> existing per-session token from the existing settings file
       -> POST to the existing 127.0.0.1 hook server
            -> token maps to Tortie's session id
            -> usage service validates body session and account
            -> one typed usage-changed event
            -> one renderer usage store
```

The design avoids several common forms of sprawl:

- no second loopback server, port setting or token registry;
- no new invoke channel;
- no credential or response body crosses IPC;
- no status-line payload, token or account path enters a log;
- the script is generated by the pure `usage/statusline.ts` module;
- the usage service remains the only owner of snapshot meaning and deduplication;
- the renderer still has one usage store, however many meter presentations are mounted.

The feature also refuses to replace a status line the person already owns. It falls back to the existing endpoint poll. The script keeps the token out of Claude's argv and curl's argv, places curl configuration in a private temporary file, posts only to loopback and prints nothing into the pane.

The intentional lifecycle divergence is that the generated status-line script belongs to the durable Claude session. The session may outlive Tortie, so its invocations may continue after the app closes and harmlessly fail to reach the old loopback port. Tortie must not kill that session merely to stop a convenience meter.

### Redline is a modelled renderer contribution

```text
editor tab with a HEAD version
  -> mode admission in the existing editor store
       -> RedlineDocument
            -> redline-document.ts: whole-document projection
            -> redline.ts: token and change-run composition
            -> RedlineRow: presentation only
```

The new mode is offered only for prose allowlisted by `isRedlinePath`. It reads the same two sides Diff already owns. It has no bridge import, write command or accept action. The projection and token algorithms are pure, while React components only draw their result.

`npm run conformance:redline` independently checks round trips, a separate LCS derivation, patch anchors, caps, skipped-change disclosure, whitespace-only changes, clipboard restoration, no write or bridge imports, and 3,000 fuzzed pairs. This is the kind of local contract that lets a sophisticated feature remain architecturally small.

### Remote close adds bounded transient truth

`remote-sessions.ts` now remembers the time of a person's Remove for 20 seconds. A list issued before that time cannot reinstate the removed id. The map is bounded to twice the remote-poll timeout and is pruned on Remove and completed passes.

The same repair makes `rows` and `gone` disjoint and exposes a counter plus a test-only corruption seam so the guard can prove it would fail. `npm run conformance:remoteclose` passes all 11 tests.

This is a justified addition to the existing remote-session state owner. It does not create a second durable authority: the timestamp is transient admission evidence, while the manifest remains durable truth and the remote tmux server remains runtime truth.

## Priorities

### P0 — replace nominal error identity at the durable-create boundary

`npm run conformance:machines` still fails one row:

> “tmux holds no server at all” was classified unreachable and the table says provenAbsent.

The fixture constructs a structured `TMUX_UNREACHABLE` error with `no server running on /tmp/x` in its detail. That is the exact completed answer `serverProbeVerdict()` is meant to recognise. Under the `.mts` probe runtime, the value and the classifier see different `GmuxError` constructor identities, so `err instanceof GmuxError` fails before the code or detail can be read.

The safety default remains correct: the durable row is kept when the classifier is uncertain. The missing protection is the positive completed-answer path.

Use a structural discriminator for the validated error payload at this loader boundary. Keep malformed values fail-closed. Required proof:

1. the mixed-loader fixture recognises the completed no-server answer;
2. `npm run conformance:machines` passes all rows;
3. the ten-row remote matrix stays green, proving that unreachable and ambiguous answers still retain durable state.

This should not change normal UI or transport behaviour. It protects when one durable row may be removed.

### P1 — make hook, usage and Diagnostics shutdown one joined operation

The current shutdown sequence has three related exceptions.

First, `disposeUsageService()` only sets its singleton reference to `null`. It does not cancel or await `Held.inFlight`. The credential adapter still uses raw `execFile('/usr/bin/security')` outside the guarded-child registry, and the HTTPS transport does not expose its `ClientRequest` for cancellation.

Second, `GmuxHookServer.stop()` calls `server.close()` without awaiting its callback, then clears tokens. A request that already passed token lookup can still finish reading its body and call `onTap`. If `disposeUsageService()` has already run, `applyUsageTap()` can lazily create a fresh usage service during shutdown. This cannot mutate the manifest, but it violates the rule that a disposed capability cannot be recreated by late work.

Third, live Diagnostics still relies on renderer `liveStop`, sender destruction or replacement. `disposeMainCapabilities()` does not call its existing idempotent `stopLiveSampling()` operation.

The smallest coherent repair is:

- give the hook server a shutdown admission flag and an asynchronous close or active-request join;
- make usage refuse new reads and taps after shutdown admission;
- track and cancel the HTTPS request and route the keychain child through an owned registry;
- make the usage disposer asynchronous and bounded;
- add the existing Diagnostics stop to the same ordered main disposer.

Required proof:

- a request paused after token admission cannot call usage after hook shutdown completes;
- a held endpoint request and keychain child are cancelled or joined before usage disposal resolves;
- a read or tap arriving after usage shutdown receives a typed or internal refusal and does not recreate the service;
- a visible live Diagnostics tab loses its timer, destroyed listener and instrument child during quit without renderer help;
- the no-work quit path remains effectively immediate.

This aligns Tortie with the useful part of VS Code's lifecycle model: resources belong to disposable owners, and long-running shutdown work has named joiners and order.

### P1 — repair the verification seams that currently lie about coverage

The fresh hermetic lane passes 11,429 tests and fails one. `src/main/specstory/__tests__/wrap.integration.test.ts` still executes the installed SpecStory binary and requires it to advertise `muse`. The installed binary on the audit machine does not. Move the real-binary assertion to the native or adapter lane and keep the hermetic compatibility rule behind a captured fixture.

Two specialist probes are also dead at the assessed commit:

- `npm run probe:keyinstall` fails with `ReferenceError: tsxCli is not defined`;
- `npm run probe:controldeadline` has the same outer-scope defect by inspection.

Both files import `tsxCli` inside a generated TypeScript driver string, but call it from the outer `.mjs` runner. Move the import to the outer module and keep generated drivers limited to imports they actually call. Run both probes from a clean checkout and prove their scratch SSH or tmux resources are gone on success and failure.

The Electron probes still inherit `ELECTRON_RENDERER_URL`, `NODE_ENV_ELECTRON_VITE` and `NODE_ENV`. Those variables were set to a development server during this audit. P167 required an explicitly sanitised launch to measure the built renderer. Strip development renderer variables inside P165 and P167 themselves so their ordinary commands have one meaning.

These changes affect tests and probes, not product behaviour.

### P1 — isolate the renderer surface that retains DOM state

The fresh, sanitised P167 surface profile measured:

| Reading | Renderer heap | DOM nodes | Listeners | Main footprint | Renderer footprint |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before | 7.0 MB | 423 | 225 | 81.7 MB | 65.5 MB |
| Block 1 | 24.5 MB | 2,475 | 424 | 91.6 MB | 280.4 MB |
| Block 2 | 24.5 MB | 3,987 | 550 | 95.1 MB | 285.3 MB |
| Block 3 | 24.7 MB | 5,499 | 676 | 96.8 MB | 288.8 MB |

Heap plateaued. DOM nodes rose by 1,512 from the penultimate block to the final block against a 400-node budget, and listeners rose by 126. This closely reproduces the previous audit rather than being noise from the new release.

All 18 Architecture opens also missed because the P167 isolated profile does not enable the Phase 175 Architecture switch. That is stale harness setup, not evidence that Architecture is broken.

Make the probe seed Architecture on inside its isolated profile. Add selectors for Catch Me Up, Architecture, Monaco, Diff and markdown preview, then run each through the same three-block ruler. Repair only the owner or cache that reproduces the slope. Keep warm caches that demonstrably plateau.

The flat heap means this is not proof of an immediate out-of-memory leak. It is a repeatable deterministic-release failure and can make long sessions retain more detached UI state than necessary.

### P2 — keep the eager renderer below its real ceiling

The eager renderer is 1,983,012 raw bytes and 445,061 gzip against budgets of 2,000,000 and 500,000. The raw margin is 16,988 bytes, about 0.85%.

All six probe markers and all 18 lazy surfaces remain outside the eager set. Build boundary remains a 3 because the ordinary build enforces the ceiling. The next feature that crosses it should move a genuinely secondary dependency behind an existing lazy boundary rather than raise the number without a fresh startup measurement.

### P2 — watch two concentration points without splitting them by line count

`remote-sessions.ts` is 3,124 lines and `activity/hooks.ts` is 748. Both grew in this range. Both also retain one coherent role today: remote-session reconciliation in the first, and the loopback hook plus its managed Claude settings in the second.

Do not split them merely to produce smaller files. If the next feature adds another hook protocol or another remote feed, use the present seams:

- move the generic HTTP/token server out of `activity/hooks.ts`, leaving Claude settings installation behind;
- move the completed-pass reconciliation state machine out of `remote-sessions.ts`, leaving orchestration and public entry points behind.

Until a second reason to change appears, these are navigation watches rather than score deductions.

## Scorecard

Scores use the established four-level rubric.

| Score | Meaning |
| --- | --- |
| 0 | Ownership is hidden or a runtime boundary has no contract. |
| 1 | A boundary exists, but repeated wiring, casts or central files weaken it. |
| 2 | The boundary is clear with a few local exceptions. |
| 3 | The boundary is explicit, narrow and protected by tests or build checks. |

| Area | Previous | Current | Assessment |
| --- | ---: | ---: | --- |
| Process ownership | 3 | **3** | The usage tap reuses the existing owned hook server. Product and verification SSH crossings have single owners, and the build rejects direct probe SSH. |
| Composition | 3 | **3** | Application, session and renderer roots remain identifiable. The usage callback is integrated at the session-owned hook server and creates no second root. |
| IPC capability | 3 | **3** | The invoke inventory remains at 217. Typed declaration, preload exposure, registration, sender trust and quit admission agree; 36 focused tests pass. |
| Domain cohesion | 3 | **3** | Redline, usage tap, remote close, Diagnostics and titlebar work have named local owners and focused contracts. |
| Dependency direction | 3 | **3** | 1,109 production graph files and 3,754 runtime edges contain zero SCCs; 6,224 imports produce zero boundary violations. |
| State ownership | 3 | **3** | Manifest and tmux authority remain unchanged. Remote removal timestamps are bounded admission evidence, not another durable truth. Redline adds no store. |
| Lifecycle | 2 | **2** | Surface retention is still red. Usage, active hook requests and live Diagnostics are not one closed, joined shutdown unit. |
| Type truth | 3 | **3** | Shared, main, preload and renderer types remain separated and bridge closure is green. The machine-classifier problem is runtime nominal identity, not a casted contract. |
| Failure flow | 2 | **2** | Remote-close failure handling improved, but the durable-create conformance gate still cannot recognise one completed no-server answer. |
| Test seam | 2 | **2** | Redline and SSH verification improved substantially. The host SpecStory assertion, ambient Electron environment and two dead specialist probes remain local exceptions. |
| Navigation | 3 | **3** | New work enters existing facades and focused leaves. The two growing orchestration files remain coherent and are named watches. |
| Build boundary | 3 | **3** | Contract, import, cycle, probe-containment, SSH-containment, tab-floor, Redline and eager-budget gates are active and green. |
| **Total** | **33** | **33** | **Nine categories at 3; three categories with specific repairable exceptions.** |

## Adversarial score challenge

A friendly reading would raise Failure flow because remote close now has a strong state-machine test and Phase 173 recorded ten green matrix rows. That reading was rejected. A score of 3 requires the current cheap guard to pass, and it does not.

A friendly reading would raise Test seam because more than 11,000 tests pass and the new Redline and known-hosts gates are unusually thorough. That reading was rejected. A hermetic lane whose answer depends on an installed binary is not hermetic, and two named probes cannot currently reach their subject.

A friendly reading would keep Lifecycle at 2 while dismissing the new hook race as harmless. The score stays 2, but the race is not dismissed. A resource owner whose `stop()` returns before accepted work stops does not meet the score-3 contract, even when the late callback only updates an in-memory convenience meter.

A harsher reading would lower Composition because `GmuxCore` imports the usage barrel, or Navigation because `remote-sessions.ts` exceeds 3,000 lines. That reading was rejected. The integration sits at the object that owns the session token and hook server, crosses through a public domain entry point, produces no cycle and is covered by focused tests. The large remote file has one state-machine purpose and did not become a cross-domain dependency funnel.

A harsher reading would lower Process ownership because the status-line script runs after Tortie can close. That is an intentional divergence. Tortie does not spawn that script; the durable Claude session invokes it. Killing or rewriting a person's surviving session at app quit would violate Tortie's more important durability promise.

## Safe order to reach 36

| Order | Work | Proof required | Product risk |
| --- | --- | --- | --- |
| 1 | Make the durable-create classifier structural and fail-closed | Mixed-loader fixture, machine conformance and ten-row remote matrix green | Low; preserves the safety default |
| 2 | Join hook-server, usage and Diagnostics shutdown | Held-hook, held-HTTPS, held-keychain and visible-Diagnostics quit tests green | Low; lifecycle ownership only |
| 3 | Repair the two dead probes, move the live SpecStory assertion and sanitise Electron harness environments | Specialist probes and hermetic lane green from a clean checkout; P165/P167 agree across shells | Low; verification only |
| 4 | Isolate and repair the retaining renderer surface | Every isolated surface and the combined P167 profile plateau | Medium; preserve useful warm caches |
| 5 | Rerun the rubric on one pinned commit | All ordinary and specialist protections green together | Read only |

The first three steps should not change normal app behaviour. The surface repair may change caching, so it needs the focused ruler plus an operator check of reopen speed, selection and scroll state.

## Named exemplar comparison

VS Code remains the named exemplar because it is a mature TypeScript Electron application with explicit source layers, contribution APIs and lifecycle contracts.

Its current source-organisation guidance separates runtime environments and asks each workbench contribution to expose one internal API file rather than letting other contributions reach into its internals. Tortie's import walls, facade-directory rules and single preload bridge implement the same useful idea at a smaller scale. Redline is a good match for that pattern: one editor contribution, pure internal algorithms, no main-process reach and one conformance entry.

VS Code's current lifecycle primitives aggregate disposable resources, track values added after disposal and provide mutable disposable ownership. Its workbench lifecycle gives shutdown work named joiners and an order, then separates joined work from final resource disposal. Tortie's ordered main disposer is already close to this pattern. The current gap is not the absence of a framework; it is that usage requests, accepted hook requests and live Diagnostics have not all been enrolled in the framework Tortie already has.

- [VS Code source code organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
- [VS Code disposable lifecycle primitives](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts)
- [VS Code workbench lifecycle contract](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)

Intentional divergences remain correct: Tortie has no extension host, durable terminals live in tmux, remote execution is allowlisted, session and machine identity are immutable, the Architecture database is disposable, status-line helpers belong to surviving agent sessions, and one context-isolated preload bridge is preferable to a VS Code-sized service platform.

## Verification

| Check | Fresh result at `1120c5a` |
| --- | --- |
| `npm run typecheck` | Pass: 1,111 production files, 6,224 imports and zero boundary violations; 1,109 graph files, 3,754 runtime edges and zero SCCs; shared-type gate green. |
| `npm run build` | Pass. Contract inventory matches 217 invoke channels. Eager renderer JavaScript is 1,983,012 raw and 445,061 gzip; 18 lazy surfaces remain in 11 chunks. The teardown gate checks 184 build files; 56 reach the one Electron-run helper and none launches Electron directly. |
| Known-hosts build gate | Pass: 186 build files checked, 19 routed probe clients and 36 fixtures; direct SSH-family spawns outside the helper are refused. |
| `npm run conformance:arch` | Pass: 51 Architecture main files, nine resolver languages and no toolchain spawn. |
| `npm run conformance:arch:modules` | Pass, including caps and Swift target grain. |
| `npm run conformance:redline` outside the restricted sandbox | Pass: all 16 rule groups, hostile fixtures and 3,000-pair fuzz. |
| IPC closure, bridge, quit-admission and sender-trust suite | Pass: 4 files, 36 tests. |
| `npm run conformance:remoteclose` | Pass: 1 file, 11 tests. |
| `npm run test:native` outside the restricted sandbox | Pass: 4 files, 8 tests. |
| `npm run test:hermetic` outside the restricted sandbox | Fail: 710 files passed, 2 skipped and 1 failed; 11,429 tests passed, 23 skipped and 1 failed. The failure is the installed SpecStory binary's provider set. |
| `npm run conformance:machines` outside the restricted sandbox | Fail: one completed no-server confirmation row. |
| `npm run probe:keyinstall` | Fail before its subject: `ReferenceError: tsxCli is not defined`. |
| `npm run probe:p167`, surface profile, with development variables removed | Fail: heap plateaus, but DOM rises 1,512 and listeners 126 in the final block; all 18 Architecture opens miss because the isolated profile leaves the switch off. |

The first sandboxed hermetic and Redline runs were not treated as product results because the restricted environment refused their local sockets. Both were rerun outside that restriction. Redline passed. The hermetic lane then reduced to the single host-binary failure above.

Not run: packaged-app smoke, current ten-row remote matrix, live usage endpoints, `probe:controldeadline` because its outer-scope defect is visible before its resource-producing setup, the full tmux recovery battery and live manifest-damage exercises. No account credential or remote machine was touched.

## Invariants to preserve

- one context-isolated preload bridge and one typed main handler path;
- sender trust and monotonic quit admission before renderer invokes;
- immutable session identity and manifest-before-spawn for durable work;
- explicit uncertain remote outcomes and journalled remote writes;
- allowlisted remote execution and confirmation-gated agent spawn;
- one helper for verification SSH and no writes to the person's known-hosts file;
- no Architecture access to manifest, restore or agent-context durability;
- no usage request, script installation or empty UI while its switch is off;
- tokens, response bodies, account paths and prompt content never enter IPC or logs;
- a person's existing status line is never replaced or executed by Tortie;
- Redline is read-only and cannot reach a bridge or write path;
- one renderer state facade per domain, not competing stores;
- lazy secondary surfaces and enforced eager-bundle ceilings;
- no production runtime cycles;
- idempotent resource disposal owned by the composition root;
- existing user behaviour and durable or public contracts unchanged during seam work.

## Bottom line

The 0.98.0 codebase is architecturally strong. It has absorbed a live usage ingestion path, a non-trivial prose projection, safer remote reconciliation and substantially stronger test SSH containment without creating dependency cycles or new state authorities.

The fresh score is **33/36**. The codebase has not sprawled. Its main architectural weakness remains lifecycle completeness, followed by one brittle runtime error discriminator and verification seams that make a few checks depend on the host or fail before they reach their subject.

The route to 36 is local: make durable error recognition structural, enrol hook and usage work plus Diagnostics in ordered shutdown, repair the specialist test runners, remove ambient environment from Electron probes, and isolate the renderer surface retaining DOM state. No rewrite, new process model or broad folder reorganisation is warranted.
