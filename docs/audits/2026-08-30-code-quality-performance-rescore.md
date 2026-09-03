# Tortie code quality and performance rescore

Date: 2026-08-30

Status: Read-only reassessment of the code-quality and performance work shipped after the 26 August audit. This document changes no product behaviour and authorizes no optimization by itself.

Assessed source: commit `45868373890f635e783cfb12d5db168a1ceeaf9f` on `main`, version 0.85.4. The comparison source is `6507b5e319562322b376c90d02a2a32c4fd2fb7c`, the snapshot assessed by `2026-08-26-code-quality-memory-and-performance.md`. The working tree contained operator-owned generated browser artifacts, `demo/`, `docs/arch/`, one research document and `.claude/scheduled_tasks.lock`; none was modified by this audit.

## Outcome

The performance round worked. Tortie now has substantially better evidence about its own CPU, memory, process, startup, bundle and cache behaviour, and the changes produced measured improvements rather than cosmetic refactors.

The current experience score is **21 out of 24** on the eight-area rubric proposed by the 26 August audit. That is a strong result. Memory ownership, renderer delivery, filesystem recovery, background work and cache policy now meet a score-3 bar. Startup stops at 2 because the current paint observer has drifted, idle efficiency stops at 2 because there is no settled CPU/energy budget, and long-session stability stops at 2 because the full plateau experiment is not a rerunnable repository command.

The broader engineering-quality judgment remains **A-**. The new code is typed, narrowly owned and heavily tested. The most important qualification is that the repository can prove more than it could four days ago, but two of its proof systems have drifted:

1. the Phase 165 live paint probe launches the current app but no longer finds its renderer CDP target, so it cannot produce current DOM or first-attach distributions;
2. the full Phase 167 scale experiment and its plateau budgets exist as a phase record, not as a committed, rerunnable scenario command.

Those are verification defects, not evidence that the app became slow or leaky. The static bundle budget is green, the complete test suite is green outside the restricted sandbox and the targeted performance tests are green.

## What changed since the prior audit

The comparison contains 41 commits and changes 336 source, build and package files, adding 61,528 lines and deleting 1,679. The performance work is concentrated in five implementation commits:

| Phase | Commit | Result |
| --- | --- | --- |
| 163 | `30222a1` | Added an on-demand diagnostics report with process, memory, cache, startup, watcher, long-task and IPC evidence. |
| 164 | `c32b9ef` | Deferred hidden-project git status and unnecessary boot-time agent discovery until a surface needs them. |
| 166 | `ee02531` | Attributed Chromium cache growth and added a development-only 128 MiB disk-cache ceiling without touching durable data. |
| 165 | `60a7093` | Lazy-loaded secondary renderer surfaces and added eager-bundle and probe-containment gates. |
| 167 | `ad3de97` | Attacked repeated cycles, fixed native PTY descriptor ownership and bounded a pathological SCM render. |

The order in history differs from the phase numbers because the cache phase landed before the renderer phase. Each change nevertheless remains independently understandable and revertable.

## Current measurements

### Diagnostics and startup

Phase 163 added an operator-triggered report rather than an always-on monitor. It uses Electron's application metrics and per-process memory APIs, renderer V8 and Blink measurements, explicit startup milestones, owned-process classification, cache sizing, watcher counters, long tasks and IPC observations. Heap snapshots are opt in.

The phase's scratch profiles recorded the following representative results on its measurement machine:

| Profile | Main private memory | Renderer working set | Window shown | First useful session |
| --- | ---: | ---: | ---: | ---: |
| Zero-session cold | 67.3 MB | 148.8 MB | 768 ms | Sessions listed at 798 ms |
| Zero-session warm | 66.7 MB | 148.4 MB | 514 ms | Sessions listed at 533 ms |
| 25-session cold | 71.2 MB | 150.8 MB | not separately used for the ruling | First bytes at 2,110 ms |
| 25-session warm | 72.3 MB | not separately recorded | 451 ms | First bytes at 1,576 ms |

The report correctly separates Tortie's Electron shell from processes doing work inside user sessions. That distinction prevents agent workloads from being mislabeled as renderer or main-process leaks.

Phase 164 then moved two invisible startup costs to demand. Its phase evidence recorded hidden-project status reads falling from four to zero on reopen and boot-time agent probes falling from fourteen to zero when live sessions already existed. The active project still receives its status, and Create Session or Settings still triggers the shared discovery cache.

### Renderer delivery

A fresh `npm run build` on the assessed source passed. The two eager renderer chunks now total:

| Measure | Current | Budget | Headroom |
| --- | ---: | ---: | ---: |
| Raw JavaScript | 1,952,981 bytes | 2,000,000 bytes | 47,019 bytes |
| Gzip JavaScript | 437,434 bytes | 500,000 bytes | 62,566 bytes |

The prior local build cited by the 26 August audit was 4,366,045 raw bytes and 952,273 gzip bytes. The old and new builds are not identical snapshots, so that difference is not a controlled benchmark; it does show that the former budget breach is closed on current HEAD. Eighteen secondary surfaces live in eleven lazy chunks, and five shipped-path probe markers are isolated by a build gate.

The Phase 165 commit recorded warm `DOMContentLoaded` p50/p95 improving from 130/172 ms to 92/96 ms and first attach improving from 530/658 ms to 443/453 ms. This audit could not reproduce those renderer distributions. `npm run probe:p165` launched the app and observed app-ready and window-shown milestones, but its CDP locator found no `/renderer/index.html` target. It returned app-ready p50/p95 of 204/281 ms and window-shown p50/p95 of 351/533 ms, then correctly failed because DOM, sessions-listed, attach and bytes samples were absent. This is a harness-observation failure, not a measured product regression.

### Cache and disk

Phase 166 distinguished development Vite traffic from packaged application traffic. Its scratch runs attributed 99.9 percent of HTTP-cache requests to development resources; shipped custom-scheme and packaged resources produced no comparable entries. The chosen policy is deliberately narrow:

- a 128 MiB disk-cache ceiling applies in development only;
- packaged behaviour is unchanged;
- code cache is not deleted under a false claim that Chromium exposes a safe equivalent ceiling;
- no timer, cleanup loop or durable path was added.

The current `gate:cache-policy` passes and proves that the policy owner imports no filesystem API, no durable path is named and no other main-process reader deletes session cache state. The installed operator profile was not opened by Phase 166, so applying the development attribution to its historical 1.2 GB profile remains a well-supported inference, not direct byte-for-byte attribution of that private profile.

### Memory and scale

Phase 167 found two real defects and two benign plateaus:

1. `node-pty` 1.1.0 on macOS leaked slave and low-file descriptors. The repository now carries the upstream-style close patch and applies it during install.
2. A 96,000-file SCM change rendered effectively without a row bound. Windowing each group to 200 rows reduced the phase's parent measurement from 1,297 MB, 100,181 DOM nodes and 53 long tasks to 133.5 MB, 2,195 nodes and no long tasks. After deletion the current renderer settled at 92.4 MB; the parent remained at 1,823 MB.
3. Repeated split cycles raised main memory from about 76.8 MB to 143.2 MB after 192 cycles, but later V8 memory reduction returned it to 79.5 MB. The evidence fits young-generation capacity, not retained ownership.
4. Opening Monaco creates an approximately 200 MB one-time plateau. Repeated open/close cycles did not produce a continuing slope.

The phase also measured Restore All at about 51 ms per session—1,285 ms for 25 and 2,533 ms for 50—and correctly left its sequential, name-safe behaviour alone.

The remaining evidence gap is repeatability. Unit and native tests protect the descriptor patch and row window, but there is no committed `probe:p167` command that reruns the five-profile resource experiment and evaluates plateau budgets. The findings are credible; the repository cannot yet remeasure the whole claim on demand.

## Experience scorecard

Scores use the 26 August rubric: 0 means no owner or evidence, 1 means an informal boundary, 2 means a clear mechanism with local exceptions, and 3 means an explicit budget or owner protected by a repeatable gate.

| Area | Score | Assessment |
| --- | ---: | --- |
| Startup | 2 | Milestones, cold/warm phase distributions and demand-loading exist. The current live paint probe cannot observe the renderer, so the release-grade regression loop is not green. |
| Idle efficiency | 2 | Invisible git and agent work moved off boot and diagnostics is on demand. No main/renderer CPU or energy settle budget is enforced; the one-second session-status poll should be measured before being justified or changed. |
| Memory ownership | 3 | Private memory is attributed by process, scale curves and settled cycles were measured, heap snapshots are opt in and concrete descriptor/DOM owners were fixed with focused protection. The report correctly labels private memory rather than claiming it equals macOS physical footprint. |
| Renderer delivery | 3 | Eager JavaScript is below explicit raw/gzip budgets, secondary surfaces are lazy and probe containment is build-protected. |
| Filesystem/watchers | 3 | Dropped-event recovery, bounded reread, churn attacks and conformance protection remain green. |
| Background work | 3 | Hidden git status and agent discovery are deferred behind visible demand, with focused proof and shared caches. |
| Disk/cache | 3 | Cache classes were attributed, the development class is bounded and a deletion/durable-path gate protects the policy. |
| Long-session stability | 2 | Descriptor and DOM-growth defects are fixed and repeated cycles were measured. The end-to-end plateau experiment is not a rerunnable repository command. |
| **Total** | **21/24** | **Strong performance discipline with three evidence-loop gaps.** |

## Adversarial findings and priorities

### P0 — repair the evidence loop before optimizing again

Fix the Phase 165 target discovery so the probe identifies the main renderer by a stable Electron/WebContents fact rather than a brittle URL suffix. The repaired command must collect five cold and five warm samples and fail separately for launch, target discovery, milestone absence and budget breach.

Commit a Phase 167 scale runner that owns scratch profiles, resource counts, settle intervals and cleanup. It does not need to run on every pull request. A scheduled or release lane is appropriate, provided a local command emits the same machine-readable verdict.

This is the highest priority because further optimization without a trustworthy before/after loop recreates the problem the performance round was meant to solve.

### P1 — make idle and memory budgets explicit

Add a five-minute settled profile for zero, one and 25 sessions. Record main and renderer CPU, energy impact where the platform exposes it, private memory, JS heap, Blink memory, child count, watcher count and mounted terminal count. Specify which one-second polls are necessary and show that their work is bounded when state is unchanged.

For macOS, show both Electron private memory and operating-system physical footprint. In particular, explain or budget the roughly 340–440 MB GPU physical footprint observed with a terminal visible instead of allowing a 62 MB private-memory number to appear to account for it.

### P1 — restore test-lane truth

`src/main/manifest/__tests__/harvest.test.ts` is classified into the hermetic lane but one case calls the real process-tree predicate and therefore reads `/bin/ps`. The full suite passed outside the restricted environment—672 files plus one skipped, 10,815 tests plus two skipped—but the same test failed inside the sandbox. Either inject that predicate for the unit case or classify the file as native. A lane called hermetic must not silently depend on the host process table.

### P2 — preserve the successful optimizations

Do not broaden the cache policy into profile cleanup, eagerly prefetch every lazy surface, replace the sequential restore path without evidence, or eliminate one-time memory plateaus that already settle. The current wins came from narrow ownership: retain that shape.

## Named exemplar comparison

Electron's current guidance says the reliable strategy is to profile, find the expensive owner and repeat, while deferring work until the user needs it and avoiding blocked main and renderer threads. Tortie now follows that pattern materially rather than rhetorically:

- [Electron performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron process memory and heap APIs](https://www.electronjs.org/docs/latest/api/process)
- [Electron application metrics](https://www.electronjs.org/docs/latest/api/app)

VS Code is the product exemplar because it exposes process ownership and preserves explicit lifecycle phases in another Electron application with terminals, watchers and an editor:

- [VS Code Process Explorer](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/processExplorer/browser/processExplorerControl.ts)
- [VS Code lifecycle phases](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)
- [VS Code performance diagnostics](https://github.com/microsoft/vscode/wiki/performance-issues)

Tortie should keep its intentional differences: local, on-demand diagnostics; no telemetry requirement; tmux-owned durable sessions; one context-isolated bridge; and agent workloads reported separately from the Electron shell. It does not need VS Code's extension-host architecture or permanent process UI.

## Verification run for this audit

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass: 1,056 production files, 5,945 imports, 0 boundary violations; 1,054 files and 3,572 runtime edges, 0 SCCs. |
| `npm run build` | Pass: eager bundle below both budgets; probe containment and build-helper ownership green. |
| Focused performance tests | Pass: 26 files, 313 tests. |
| `npm test` outside the restricted sandbox | Pass: 672 files plus one skipped; 10,815 tests plus two skipped. |
| Cache-policy gate | Pass. |
| `npm run probe:p165` outside the restricted sandbox | Fail: app launches, renderer target is not found, so renderer milestones and distributions are absent. |
| Contract inventory | Fail: 213 invoke channels versus the committed 197-channel baseline. This is scored in the companion architecture audit, not as a performance regression. |

The sandbox-only full-suite failures were FSEvents and live-`ps` access restrictions. They disappeared in the outside-sandbox run; only the hermetic classification issue is retained as a finding.

The installed `node_modules` source received the repository's existing `node-pty` patch while checking install state, but the native binary was not rebuilt. No claim here depends on executing that locally rebuilt native addon. No tracked product file was changed by the review.

Not run: packaged installer measurement, a fresh 25/50-session live profile, real remote-machine scale, the approximately 40-minute remote fault matrix, energy-instrument traces and the absent Phase 167 end-to-end command.

## Bottom line

Recent commits improved both the product and the engineering method. The app now loads far less eagerly, performs less invisible boot work, bounds its development cache, explains its processes and survives scale attacks that previously exposed real descriptor and DOM-retention defects.

The next performance phase should be small: repair the paint observer, commit the scale observer and define settled idle/GPU budgets. Until those land, 21/24 is the honest score. The missing three points are evidence and regression-protection work, not a case for another broad optimization campaign.
