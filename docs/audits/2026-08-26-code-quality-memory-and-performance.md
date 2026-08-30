# Tortie code quality, memory and performance audit

Date: 2026-08-26

Status: Read-only assessment and phased optimization plan. This document changes no architecture score and authorizes no product change by itself.

Assessed source: commit `6507b5e319562322b376c90d02a2a32c4fd2fb7c` on `main`. The working tree already contained operator-owned generated browser artifacts and `.claude/scheduled_tasks.lock`; none was modified by this audit.

## Outcome

Tortie is a very good codebase. Its correctness, durability, security boundaries and automated architectural protections are stronger than those of a typical Electron application. The useful shorthand is **A- overall engineering quality**: architecture and failure ownership are excellent; performance engineering is closer to **B+** because measurement, budgets and regression detection have not kept pace with feature growth.

There is no evidence of an immediate memory emergency on the measured machine. There is evidence of four experience costs that deserve a dedicated performance round:

1. Tortie cannot yet explain whole-app CPU and private memory by process and feature on demand.
2. The last local production bundle eagerly loaded substantially more renderer JavaScript than the existing budget.
3. Chromium-owned cache data has grown to more than 1.1 GB while Tortie's durable data is about 69 MB.
4. Git and agent discovery still perform work during startup for surfaces that may not be visible.

The FSEvents overflow was the highest-priority finding during the initial 25 August inspection. It is no longer open: Phase 151 shipped a real re-read on dropped batches and reduced measured drops by about 80 percent. It remains a metric to watch, not a reason to repeat the fix.

The right next move is not a rewrite or broad refactor. It is a small performance discipline: one truthful diagnostics report, repeatable scenario measurements, and narrowly ordered optimizations whose behaviour is protected.

## What this audit means by quality

The architecture rubric is not a performance percentage. The last published independent architecture rescore measured 35 out of 36 at commit `1b04801`; it withheld one point for the unadjudicated remote fault matrix. A later strict read also identified a hermetic-test reservation. Since then the tree has changed materially, including Phase 63's architecture feature. This document therefore does not claim a new current architecture score. It uses **34 to 35 out of 36 as historical context**, not as a fresh score for `6507b5e`.

Broader code quality is strong for concrete reasons:

- tmux, SQLite, local processes, remote executions, watchers and renderer state have named owners;
- typed IPC, sender trust and the monotonic quit gate protect process boundaries;
- production runtime imports are cycle-gated and renderer/main boundaries are build-gated;
- durable writes and uncertain remote outcomes are represented explicitly rather than inferred away;
- large inputs such as git status, git output, Overview turns and scrollback have stated caps;
- failure paths, teardown and native behaviour receive focused tests and smoke harnesses;
- comments usually explain why a rule exists and name the attack it prevents.

The principal maintainability cost is cognitive scale, not disorganization. Current production TypeScript and TSX total about **280,371 lines**, with **600 test files**. Several legitimate domain owners exceed 1,500 lines and a few exceed 3,000. Phase 63 alone added roughly 15,000 lines across the architecture feature and its proof. The current gates make that growth safer, but they do not make it cheap to understand.

Large files should continue to be judged by responsibility and importer demand, not line count alone. The improvement worth making is editorial: keep the present contract and the reason for surprising behaviour beside the code, while moving completed phase archaeology and long measurement narratives into the authoritative documents that already preserve them.

## Evidence and its limits

Three snapshots are deliberately kept separate.

### Current source snapshot

At `6507b5e`:

- production TypeScript/TSX: approximately 280,371 lines;
- test files: 600;
- `app.getAppMetrics()` is used only by the on-demand scrollback report, and it reports browser and tab working-set memory;
- there is no production use of `process.getProcessMemoryInfo()`, `process.getHeapStatistics()`, `process.getBlinkMemoryInfo()` or heap snapshots;
- there are no production startup `performance.mark` milestones for window shown, sessions listed, PATH ready or first attach.

No typecheck, build or test suite was run for this read-only review. Recent shipped phase records contain their own full-battery evidence, but that evidence is not relabelled as this audit's run.

### Live installed-app snapshot, 25 August

The installed Tortie process tree was sampled while the operator was using the product. One snapshot totalled approximately **625 MB RSS** across the main process, renderer, GPU, network helper, tmux control client and SSH helper. Representative components were:

| Process | Approximate RSS |
| --- | ---: |
| Main | 242 MB in the first snapshot; later samples varied up to about 394 MB |
| Renderer | 266 MB |
| GPU | 91 MB |
| Network helper | 33 MB |

A native five-second sample measured the main event loop waiting in its ordinary application loop for about 98 percent of samples. Short `ps` CPU spikes therefore are not evidence of sustained main-process CPU consumption. At the time of the original review the machine had 44 percent system-wide memory free; the following day it still had 38 percent. The evidence does not show current memory pressure.

RSS is not the right final macOS budget. Shared pages and compression distort it. Future gates should primarily use private memory and physical footprint, with RSS retained as a familiar secondary number.

The Electron shell and the work it supervises must remain separate in every report. Agent CLIs inside tmux panes are real workload memory, but they are not renderer or main-process leaks and often would exist if the same work ran in separate terminals.

### Last local production bundle

The last local renderer build was produced at 2026-08-25 00:44 local time, before current HEAD. Its two eager entry scripts total:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| `index-B4cmAu91.js` | 3,614,615 bytes | 798,093 bytes |
| `globals-BxWGDBdx.js` | 751,430 bytes | 154,180 bytes |
| **Total** | **4,366,045 bytes** | **952,273 bytes** |

This is evidence that the existing performance budget was missed at that build, not a claim about a fresh `6507b5e` build. The 17 August audit proposed less than 2 MB raw and 500 KB gzip for eager renderer JavaScript. A new optimization phase must first build current HEAD and establish the new baseline.

### Current profile disk use

On 26 August the installed profile occupied approximately **1.2 GB**:

| Owner | Size | File count where measured |
| --- | ---: | ---: |
| Chromium HTTP cache | 871 MB | 21,166 files |
| Chromium JavaScript code cache | 270 MB | 25,190 files |
| Tortie `gmux` durable data | 69 MB | not used as a comparison count |
| Other Chromium/profile data | remainder | — |

One day earlier those two caches were 805 MB and 234 MB respectively. That difference was measured during an unusually active development and update period, so it must not be projected as a normal daily growth rate. It is enough to justify attribution and a retention policy. The `gmux` directory is durable user state and is explicitly outside any cache cleanup.

## Named exemplar: Electron plus VS Code

Electron's current performance guidance says to measure repeatedly, defer nonessential work and avoid blocking either main or renderer. Its APIs provide per-process application metrics, process memory information, V8 heap statistics, Blink memory and explicit heap snapshots:

- [Electron performance checklist](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron `app.getAppMetrics()`](https://www.electronjs.org/docs/latest/api/app)
- [Electron process memory and heap APIs](https://www.electronjs.org/docs/latest/api/process)

VS Code is the named product exemplar because it is also an Electron application with terminals, file watching and an editor. Its useful patterns are a visible Process Explorer that names each process with CPU, memory and PID, and lifecycle/startup profiling that separates work required to become visible from work that can happen later:

- [VS Code Process Explorer implementation](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/processExplorer/browser/processExplorerControl.ts)
- [VS Code lifecycle phases](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts)
- [VS Code performance diagnostics](https://github.com/microsoft/vscode/wiki/performance-issues)

Tortie should extract the measurement pattern, not the workbench architecture. Intentional divergences remain:

- Tortie is one narrow product, not an extension host or contribution registry;
- tmux and SQLite own durable sessions outside the renderer;
- one window and one context-isolated bridge are strengths to preserve;
- diagnostics remain local and on demand, with no telemetry requirement;
- heap snapshots may contain paths or user text and must require an explicit operator action rather than entering an ordinary copied report.

## Findings, in implementation order

### P0 — establish truthful performance and memory observability

Tortie currently has enough information for a narrow scrollback report but not enough to attribute a regression. Add one on-demand diagnostics report or small Process Explorer-style surface that records:

- process name, type and PID;
- CPU and private/working-set memory for main, renderer, GPU and utility processes;
- renderer V8 heap and Blink memory;
- owned tmux/SSH helper count and memory, separately from agent workloads;
- live sessions, mounted terminal surfaces, BrowserWindows, watchers and remote feeds;
- recent renderer long tasks and IPC rate;
- Chromium cache, code cache and `gmux` durable-data sizes;
- startup milestones from app ready through first useful session or first attach.

Collection should be on demand or briefly sampled during a diagnostic capture. Do not add a permanent dashboard heartbeat merely to observe that the app is idle.

Required proof:

1. Capture a report on a zero-session profile and a 25-session profile.
2. Prove every Electron process shown by `app.getAppMetrics()` is either named or explicitly excluded.
3. Prove agent workload processes are visually separate from Tortie shell totals.
4. Prove opening and closing diagnostics leaves no timer, listener or process behind.
5. Confirm a copied ordinary report contains no project contents, environment values or command-line secrets.

### P1 — measure and split the eager renderer

The old build is above the existing budget, and current source statically imports Overview, editor surfaces, sidebar subjects and modal-heavy features before they are necessarily used. Phase 63 also adds an Architecture view through the sidebar. Build current HEAD first, inspect the actual chunk graph and then lazy-load only secondary surfaces.

Keep eager:

- window chrome and the active project/session identity;
- the first terminal attach path and xterm requirements needed for it;
- refusal and recovery surfaces that can be the first screen.

Candidates for lazy loading or post-paint prefetch:

- Overview;
- Architecture;
- inactive sidebar subjects;
- editor-only and diff-only surfaces;
- modal families not required during boot.

Acceptance begins with the existing budget: eager JavaScript below 2 MB raw and 500 KB gzip, with a five-run warm `DOMContentLoaded` p95 below 200 ms. If current evidence shows that number is no longer compatible with required first paint, publish the measured reason before revising it. Do not weaken the budget only to make the gate green.

### P1 — attribute and bound Chromium cache growth

Do not begin by deleting the cache. First determine what owns it:

- local `file:` application resources across frequent builds and upgrades;
- `gmux-asset:` project images passed through `net.fetch(file:)`;
- preview resources;
- JavaScript code cache left by changing hashed bundles;
- another Chromium facility.

Then choose the narrowest policy. Possibilities include correct response cache headers for local project assets, a measured disk-cache ceiling, or version-aware retirement of obsolete application resource/code-cache entries. The durable `gmux` directory, snapshots, manifest, logs required for support and user-owned files are never targets.

Required proof:

1. Attribute at least 90 percent of cache bytes by resource class or state why Chromium prevents it.
2. Run twenty same-version launches and five simulated version changes; cache use must plateau under the chosen policy.
3. Reopen a markdown document with large local images and prove correctness, reload latency and memory before and after.
4. Prove offline project images, editor resources and recovery screens still work.
5. Prove no path under `userData/gmux` is removed or rewritten by cache maintenance.

### P2 — move invisible startup work to demand

Three current paths deserve a measured change:

- `Titlebar.tsx` calls `ensureStatus` for every open local project whenever the project list changes;
- core boot warms `listDetectedAgents()` even when reopening an existing terminal;
- settings-store initialization also requests the agent list.

Prefer one status request for the active project during the first two seconds, then warm another project on selection intent or after the app reaches its eventual/idle phase. Run agent discovery from Create Session, Settings or another surface that needs the answer, behind the existing shared cache.

Required proof:

- zero hidden-project git statuses during the first two seconds;
- zero agent-version subprocesses during the first five seconds when reopening an existing project and terminal;
- Create Session and Settings still receive one complete cached scan;
- switching projects never shows another project's status under the active identity;
- cold and warm first-attach distributions do not regress.

### P2 — run a retained-memory and scale experiment

Do not infer leaks from a single large RSS number. Create a diagnostic-only scenario runner over these profiles:

1. cold and warm launch with zero, one, ten, twenty-five and fifty sessions;
2. fifty project switches and SCM refreshes;
3. fifty open/close cycles for Overview, Architecture, editor, diff and preview;
4. repeated terminal split, close and reattach;
5. remote disconnect/reconnect and quit while remote work is pending.

For every step record private memory by process, JS heap, Blink memory, mounted terminal count, listener/subscription count, child-process count, renderer long tasks and elapsed time. After a diagnostic garbage collection and settled interval, memory and resource counts should return to a stable band. Any retained upward slope earns a heap snapshot and owner trace; a high one-time allocation that plateaus does not.

Initial regression rules:

- no process, watcher, subscription or terminal-surface count growth after a completed open/close cycle;
- no monotonic private-memory growth across repeated settled cycles;
- the 25-session profile has a recorded p50/p95 baseline and an explicit budget before optimization;
- hidden sessions do not retain mounted renderer terminal surfaces;
- heap snapshots are opt-in artifacts, excluded from logs and ordinary support reports.

### P3 — consider bounded Restore All concurrency only after measurement

`restoreAllSessions()` is sequential on purpose because parallel tmux creation can race name deduplication and repeated focus changes make the UI noisy. Preserve that correctness unless the scenario data proves that Restore All is a material user wait.

If it is, reserve names before spawning, cap create concurrency, keep per-session journals and apply focus once after the wave. Attack duplicate names, one failed restore among successes, quit mid-wave, delayed tmux creation and renderer closure. This is the most behaviour-sensitive optimization in this document and therefore the last one.

### P3 — reduce developer cognitive load without fragmenting owners

Do not split cohesive coordinators merely because they are long. Instead:

- keep current invariants and non-obvious failure reasons beside the code;
- move completed phase diaries and long historical measurements into `docs/` with a short source link;
- give each new broad feature a narrow facade and explicit importer budget;
- keep the production-cycle, boundary and contract gates mandatory;
- require a deletion/consolidation pass when a feature replaces an older path.

The target is faster comprehension with the same runtime shape, not a larger number of smaller files.

## Shipped finding that remains under observation: FSEvents

Phase 151 corrected the original review's highest-priority issue. Before the change, a dropped FSEvents batch was logged and discarded; real events delivered beside the error were also lost. The shipped implementation now routes a rescan-required error through the same bounded 300 ms full re-read notification as an ordinary change and selects a measured set of kernel-side ignored-root exclusions.

The phase recorded drops per minute falling from 124/115/118 to 22/29/25 under its churn workload, and surfaced tracked edits improving from 0/10/8 of 28 to 27/29/29. It also records two limitations: drops are reduced rather than eliminated, and the watcher library does not expose its one-millisecond coalescing interval.

The remaining work is observation:

- include watcher drops, scheduled rescans and rescan completion in the on-demand diagnostic report;
- alert in logs if repeated drops are not followed by one bounded re-read;
- retain `conformance:watcher` and the tracked-edit-under-churn attack;
- do not reopen the watcher design merely because a drop still occurs.

## Phased implementation plan

| Phase | Scope | Risk | User-visible result |
| --- | --- | --- | --- |
| 1 | Diagnostics and repeatable scenario harness | Low | Support can explain CPU, memory, processes, sessions and cache rather than guessing |
| 2 | Fresh bundle baseline and secondary-surface code splitting | Medium | Faster first useful paint and less initial parse/heap work |
| 3 | Cache attribution and bounded retention | Medium | Smaller, predictable profile disk use without touching durable data |
| 4 | Active-only git status and demand-driven agent scan | Low to medium | Less startup process and filesystem contention |
| 5 | Retained-memory/scale attacks and fixes found by them | Depends on finding | Stable long-running memory and resource ownership |
| 6 | Restore All concurrency, only if the data justifies it | High | Faster large recovery without name, focus or durability regressions |

Each phase should land independently, record before/after distributions on the same machine and profile shape, and preserve public IPC, durable state, immutable session identity, manifest-before-spawn, the one bridge and allowlisted remote execution.

## Experience scorecard for the next review

This is a proposed performance rubric, separate from the 36-point architecture rubric. Score each area 0 to 3:

| Area | A score of 3 requires |
| --- | --- |
| Startup | Named milestones, cold/warm p50 and p95 budgets, CI or release-gate protection |
| Idle efficiency | Main and renderer CPU/energy settle inside a measured budget with no unnecessary polling |
| Memory ownership | Private memory by process, scale curves, stable settled cycles and owned leak diagnostics |
| Renderer delivery | Explicit eager-JS budget and chunk graph protected in the build |
| Filesystem/watchers | Bounded event handling, real recovery after drops and churn fault proof |
| Background work | Invisible git, agent and remote work deferred or justified by a visible need |
| Disk/cache | Attributed cache classes, bounded retention and durable-data exclusion proof |
| Long-session stability | Repeated session/project/editor cycles plateau in resources and process count |

No numeric performance score is awarded here because the diagnostics needed to earn several rows do not yet exist. The first phase creates the evidence that makes a later score meaningful.

## Exclusions

- No Electron rewrite, browser-engine change or migration away from tmux.
- No extension-host or plugin architecture copied from VS Code.
- No weakening of durability, shutdown joins, manifest ordering or remote execution records for speed.
- No always-on telemetry or background performance dashboard.
- No clearing of durable user data under `gmux`.
- No file split justified by line count alone.
- No claim that the old local bundle is a fresh build of current HEAD.
- No claim that supervised agent memory is an Electron-shell leak.

## Bottom line

Tortie's quality problem is not that the code is careless. It is that a fast-growing, carefully protected application now needs equally strong performance evidence. The code already knows who owns state and failure. The next round should make it know who owns time, memory, CPU and disk as precisely.
