# Research 42. The logging strategy: tiers, one framework, one stored format, a hard budget

Status. Design, ready to become one backlog phase. Nothing here is built yet except the two pieces of prior art it generalizes, which are Phase 28 process-gone logging and Phase 31 updates.log.

Inputs. Three investigations ran before this design, all on 2026-08-14, all on the operator's machine.

- TODAY measured the tree. 184 console call sites in src/main outside tests. One app-written log file (updates.log, updater scope only, packaged builds only). No crashReporter, no sentinel, no renderer error hook, no logging library.
- PEERS measured the log directories of 6 Electron apps on this machine and read the logging source of VS Code and Signal. Disciplined peers hold 1.5 MB to 5.1 MB of logs. Undisciplined peers hold 29 MB (Slack) and 48 MB over 14 months (Claude Desktop).
- ELECTRON measured the vendored Electron 43.3.0 live in a scratch lab, with 3 runs and 2 deliberate crashes. crashReporter start costs 25 to 33 ms and one helper of 2 to 4 MB RSS. A minidump is 0.4 to 1.6 MB and embeds the full environment block, including the value of a live token variable. The sentinel pattern was proven end to end across a real main-process crash.

Standing law that binds this design.

- Research 37 refuses, permanently, any error or failure event to any network endpoint, and anything that describes what a person did inside Tortie. Local logging is not telemetry. The boundary is drawn below, at the exact line where local capture ends.
- The Zen. Only a question, decision or failure rises above the surface. Logs are a place you go, not a thing that shouts.
- Phase 25 (telemetry) stays deferred. This design does not build it, prepare for it, or leave hooks for it.

## 1. The one-sentence strategy

Tortie writes one bounded NDJSON log file per profile that every domain shares, keeps crash dumps locally with uploads off, tells the user in one quiet line when the previous run died, and has no code path that transmits any of it.

## 2. What Tortie logs today

The short answer. In a packaged build, Tortie keeps one log file, for one domain, and nothing else. Every other domain writes to a console that the shipped app does not have, so its output is discarded at the moment it is produced.

### 2.1 The main process writes to a console the shipped app does not have

There are 184 console call sites in src/main outside tests, counted by grep for console.log, console.warn, console.error, console.info and console.debug. By domain directory they are:

| Domain | Call sites |
|---|---|
| sessions | 28 |
| index.ts | 24 |
| conformance | 17 |
| manifest | 15 |
| restore | 13 |
| tmux | 10 |
| config | 10 |
| power | 9 |
| migrate | 8 |
| fault | 6 |
| updates | 5 |
| settings | 4 |
| db | 4 |
| 16 more locations (watcher, quickopen, notice, context, agents, symbols, restart, proc, menu.ts, diagnostics, tray, specstory, recents, harness, git, attach) | 31 |

The literal prefix families are [gmux] 31, [gmux-shot] 12, [gmux-smoke] 6, [gmux-conf] 5, [gmux-power] 4, [gmux-fault] 4, and 8 smaller families of 1 or 2. [gmux-updates] appears at exactly one call site (src/main/updates/log.ts) and every updater event funnels through it. The remaining calls build their prefix dynamically or start with variable text. There is no level filtering, no shared format and no shared module behind any of this.

Where the output goes. In dev the app runs under a terminal (electron-vite dev), so every line lands there. A packaged build launched from the Dock has no terminal. The repo states this fact three times as lived history, in src/main/updates/log.ts, src/main/notice/index.ts ("a console.warn the shipped app has no terminal for") and src/main/migrate/notice.ts. No Chromium logging switch is ever set; src/ and build/ contain zero hits for --enable-logging or ELECTRON_ENABLE_LOGGING.

### 2.2 The one real log file

Phase 31 built the single exception, `<userData>/logs/updates.log` (src/main/updates/log.ts).

- Cap of 524288 bytes, checked before each append. An oversized file is renamed to updates.log.1, replacing the previous one, so the pair stays bounded near 1 MiB.
- Packaged builds only, behind an app.isPackaged guard. Dev keeps the console line unchanged.
- Deliberately under `<userData>/logs` and not `app.getPath('logs')`, because `~/Library/Logs/Tortie` is shared by every packaged build on the machine, including rehearsal builds, which would interleave their lines into the operator's evidence.
- A failed write is swallowed after exactly one console warning per run, so the log can never become the thing that breaks the app.

Observed on the operator's machine on 2026-08-14: `~/Library/Application Support/Tortie/logs` does not exist, so no updates.log has ever been written on that profile. The installed build predates the Phase 31 code or no packaged updater event has fired since it arrived; which of the two was not confirmed.

### 2.3 The renderer is worse than the main process

- 48 console call sites in src/renderer outside tests, most of them probe and drive harness code (prefixes such as [search-probe] and [shot-drive]). They go to DevTools only.
- Packaged menus strip reload and toggleDevTools (src/main/menu.ts, app.isPackaged ternary), so in the shipped app there is no ordinary way to even watch the renderer console live.
- The only main-side console-message listener is gated on GMUX_SHOT_VERBOSE=1 (src/main/index.ts) and tees to the shot harness terminal. Nothing persists renderer console output anywhere.
- There is no window.onerror handler, no unhandledrejection handler and no React error boundary anywhere in src/renderer. An uncaught renderer exception is fully silent in every build.
- The preload bridge (src/preload/index.ts, 626 lines) contains 0 console calls and no logging channel of any kind. The only channel with "log" in its name is git:log.

### 2.4 Crash capture belongs entirely to macOS

crashReporter appears nowhere in src. No Crashpad directory exists under the Tortie profile. There is no process.on('uncaughtException') or unhandledRejection anywhere in src. Research 34 item 4 recommended crashReporter with uploadToServer false, a render-process-gone reload, and a boot-time unclean-exit sentinel; only the process-gone logging was ever built (Phase 28), and it emits console.warn only.

What macOS kept instead, verified by reading `~/Library/Logs/DiagnosticReports/Retired` on 2026-08-14: five .ips crash reports for the packaged app, all from that one day, all SIGABRT ("Abort trap: 6"), all with procPath /Applications/Tortie.app/Contents/MacOS/Tortie. One is version 0.18.0 (13:46) and four are 0.19.0 (15:02, 15:05, 15:16, 16:32). Tortie has no reference to DiagnosticReports anywhere in src and no record of any of these five crashes in any of its own surfaces. The cause behind the SIGABRTs was not investigated beyond the headers.

### 2.5 Surfaces that look like logs but are not

- The harnesses capture console output only in the invoking terminal. build/fault-harness.mjs pipes stdout and stderr, parses machine-readable `[gmux-fault] <kind> {json}` records, and keeps the last 2000 bytes of stderr per failed run. build/harness-socket.mjs runs children with stdio inherit. No smoke driver writes a file.
- The scrollback report (channel scrollback:report, the Copy details button in Settings) is the one user-facing diagnostics surface. It aggregates scrollback settings, fleet totals, disk headroom, process RSS and the owned-process table. It is pull-only by design, and it describes now. It carries no history of events, errors, process deaths or updates.
- GmuxError typed payloads travel to the renderer and render as friendly states. postDurabilityNotice is the single user-visible degraded-durability channel, with one-per-kind latching. The database and manifest integrity gates write multi-line console.error narratives next to those notices, and in a packaged build the narrative half is lost.
- package.json has no logging library of any kind and no crash SDK.

## 3. The two incidents, and the five crashes with no record

These are the case studies that motivated the design. Both incidents happened in the same week, and both were diagnosed from records some other process kept, because Tortie kept none.

**Incident 1, the GPU helper death.** On 2026-08-14 a lid close killed the Chromium GPU helper on wake. It respawned in under 1 second. A packaged build had no record the event ever happened; the diagnosis came from a dev terminal. Phase 28 answered with child-process-gone and render-process-gone listeners that decode the macOS wait status (exitCode 8704 decodes to real code 34), but both handlers emit console.warn only, so in a packaged build the new lines are still discarded. The module's own header records this gap. Phase 28 closed the gap for dev terminals only.

**Incident 2, the updater refusal.** On 2026-08-14 the first live update downloaded, staged and never installed. Squirrel's ShipIt aborted 3 times with SQRLInstallerErrorDomain code -9 ("there are 1 running instances of the target app") and Tortie surfaced nothing. The diagnosis required reading Squirrel's own file, `~/Library/Caches/com.itavero.tortie.ShipIt/ShipIt_stderr.log`. Phase 31 answered with the refusal check (it reads the last 65536 bytes of ShipIt's file and parses the abort shape) and with updates.log. Both fixes are scoped to the updater domain only.

**The five crashes.** Section 2.4's five SIGABRT reports are the third case study. A packaged Tortie died by signal five times in one day, macOS wrote five reports, and Tortie itself cannot say the crashes happened. Nothing in the app noticed at the next boot, nothing was written down, and nothing was shown to the operator.

The pattern across all three is the same. The evidence either existed only in a place Tortie never reads, or did not exist at all. The design's job is to make Tortie keep its own record, uniformly, for every domain, at a bounded cost.

## 4. What an Electron app should log, and what Tortie was missing

An Electron app runs as 4 or more operating system processes that the user experiences as one program. The main process receives no record of a helper's death unless it subscribes to the events that report it, and no process can record the death of the main process itself; only the next boot can discover it. The disciplined peer set (VS Code, Signal) converges on the same small list of things worth recording locally.

| What | Why | Tortie today |
|---|---|---|
| A boot environment snapshot | Weird-environment bugs are diagnosed from the versions, the arch, the display scale and the PATH shape, not from the stack trace | Not written anywhere |
| Process lifecycle (helper death, renderer death, suspend, resume) | These are the events behind "the app got weird after I closed the lid" | Console only, lost in packaged builds (Phase 28 gap) |
| Errors and warnings from every main-process domain | The narrative that explains the failure | Console only, 184 call sites, lost in packaged builds |
| Update lifecycle | The one domain where a silent failure strands the user on an old build | Solved (Phase 31, updates.log) but as a parallel one-off |
| Crash dumps, local only | The only record with thread stacks when a process dies by signal | Not captured. The five SIGABRTs of 2026-08-14 exist only in macOS DiagnosticReports |
| An unclean-exit marker | The only way the app itself knows it crashed | Recommended by research 34 item 4, never built |
| Renderer uncaught errors | Today an uncaught renderer exception is fully silent. No window.onerror, no unhandledrejection hook, no error boundary | Nothing |

What an app should not log is the other half. No keystrokes, no session content, no file contents, no prompts. Section 13 makes these refusals permanent.

## 5. The peers, measured on this machine

Every number in the table was read from this machine's disk on 2026-08-14, except the rotation and retention rules marked as source, which were read from the app's published source code.

| App | Files | Rotation | On disk now | Levels | Crash capture | Transmission |
|---|---|---|---|---|---|---|
| VS Code | One folder per launch, one file per subsystem and per window | 5 MB x 6 per channel (source); keep current session plus 9 old ones (source) | 5.1 MB logs, 20 MB Crashpad (16 dumps) | trace, debug, info, warning, error, off; runtime switch | Crashpad on | Coupled to the telemetry setting |
| Slack | 3 streams (main, renderer console, service worker) | 5 MB, current plus 2 numbered archives per stream (inferred from disk) | 29 MB logs, 1.5 MB Crashpad | info and warn in text | Crashpad on | Automatic (Sentry) |
| Signal | app.log plus main.log, NDJSON (pino) | Daily, keep 3; prune to a 3 day window at every startup; delete the whole directory when pruning fails (source) | 1.5 MB logs, 0 B Crashpad | pino numeric 10 to 60 | Crashpad on, uploadToServer false | User initiated only; redacted debug log, consent per crash dump |
| Notion | One file per scope under ~/Library/Logs/Notion | main.log plus main.old.log (electron-log scheme) | 2.9 MB logs | info and warn, scope tag | No dumps visible | Automatic (Splunk queue, posting confirmed by its metadata file) |
| Linear | Single main.log | electron-log default (1 MB plus .old) | 206 KB logs | info, scope in text | Crashpad on, empty | Automatic (Sentry) |
| Claude Desktop | main.log plus 4 numbered archives plus one file per MCP server | About 10 MB per archive, no pruning (inferred from disk) | 48 MB, oldest line 14 months old | info, free text | Crashpad dir present, no dumps | Not observed |

Notes beside the table.

- Cursor uses the same per-launch folder layout as VS Code; its Crashpad holds 4.5 MB across 10 dumps. Figma keeps no visible log files on this machine and was excluded.
- The single most copyable fact is Signal's write-time redaction. Every line passes a redaction function before it reaches disk (file paths become [REDACTED], phone numbers keep the last 3 digits, UUIDs keep the last 3 characters). The file on disk is already safe, so a later export cannot leak what was never written.
- Signal's only network path is user initiated. The debug-log flow posts the already-redacted log and returns a URL the user chooses to share. crashReporter starts with uploadToServer false, and IPC exposes count, submit and erase for pending dumps, so a dump leaves the machine only with explicit consent per dump.
- Notion is the counterexample. Its splunk-log-metadata.json records a lastSuccessfulSplunkLog timestamp, which proves automatic posting of logs. Research 37 refuses this outright.
- electron-log is the de facto library; Notion, Linear and Claude Desktop all show its family traits on disk. Its defaults are a file transport that captures everything, a 1,048,576 byte maxSize, one .old.log archive, and `~/Library/Logs/<AppName>` as the macOS directory.
- Slack's payload habit is the format warning. Its lines carry multi-line pretty-printed JSON payloads, which break line-oriented grep, inflate its footprint to about 19 times Signal's, and copy user data into logs.

What Tortie copies, and from whom.

| Copied | From |
|---|---|
| Level set with a runtime switch, and an open-logs-folder affordance | VS Code |
| Write-time redaction, so the disk file is already safe | Signal |
| Startup pruning to an age window, and delete-all when pruning itself fails | Signal |
| crashReporter with uploadToServer false, plus a local count-and-inspect surface | Signal |
| One-line records with timestamp, level and scope | electron-log's format, in NDJSON shape |
| The logs directory under userData, not ~/Library/Logs | Phase 31, already in tree |

What Tortie refuses, and who demonstrates the failure.

| Refused | Demonstrated by |
|---|---|
| Automatic posting of logs or errors to any endpoint | Notion (Splunk), Slack and Linear (Sentry) |
| Unbounded archives and unpruned per-subprocess files | Claude Desktop, 48 MB and 14 months |
| Multi-line pretty-printed payloads inside log lines | Slack |
| Coupling crash-dump handling to a telemetry setting | VS Code |

## 6. What Electron 43.3.0 gives us, measured live

All numbers were measured against the vendored Electron 43.3.0 on this machine (macOS 15.7.9, arm64, 12 cores, 48 GiB), in a scratch lab with 3 runs and 2 deliberate crashes.

Crash capture.

- crashReporter.start({uploadToServer: false}) needs no submitURL and must run before app ready. Measured start cost was 33.1 ms on one run and 24.8 ms on another.
- It spawns exactly one chrome_crashpad_handler helper. Measured RSS was 4.2 MB in the lab, 2.1 MB for Slack's and 2.0 MB for Cursor's. The helper does not appear in app.getAppMetrics and exits with the app.
- Dumps land under `<userData>/Crashpad` (settings.dat plus new, pending, completed and attachments directories). A renderer crash wrote 663,136 bytes; a main-process crash wrote 1,067,472 bytes. Real dumps on this machine run 0.4 to 1.6 MB. The dump landed within 1 ms of the render-process-gone event, which fired 452 ms after the renderer called process.crash().
- With uploads off, dumps stay in pending/ and were still there after 3 relaunches. getLastCrashReport is useless with uploads off; it returned a stub row, and the type definitions state only uploaded reports are returned. The reliable relaunch check is a readdir of pending/ and completed/, measured at 2.1 ms.
- Annotations were verified inside the dump bytes. A global extra rides with every process's crash, a renderer-side addExtraParameter rides with that renderer's crash, and Electron adds productName, version and its own version by itself.

Why a dump may never leave the machine, verified by scanning the dump bytes. Both lab minidumps embed the process's complete environment block, including the name and the value of a live CLAUDE_CODE_MESSAGING_TOKEN variable, plus argv and absolute module paths (13 strings containing /Users/gdc in the main dump). A dump of about 1 MB against about 90 MB of RSS holds thread stacks and annotations, not the full heap, and the stacks are enough to leak everything above. Research 37's refusal is confirmed by bytes, not just reasoning.

The trade with macOS's own records. With ignoreSystemCrashHandler true, no .ips report was written for the lab's main crash, and none was written for the renderer crash even at the default, because Crashpad intercepts helper crashes once started. Starting crashReporter therefore moves the crash record out of macOS's DiagnosticReports and into the app's own Crashpad directory. macOS keeps useful records without any app cooperation (runningboardd termination records per process, sleep and wake history via pmset, .ips reports), but its .ips files moved to Retired within about 1 day on this machine, and querying the unified log costs 2 to 4 seconds per question. Those records answer an investigator after the fact; they never tell the app or the user anything.

Cheap signals, each cost measured.

| Signal | Cost |
|---|---|
| app.getAppMetrics() | 0.25 ms first call, 0.065 ms after |
| process.getProcessMemoryInfo() | 7.5 ms, async |
| The unclean-exit sentinel write at boot | 0.156 ms |
| Crashpad readdir at boot | 2.1 ms |
| Boot environment snapshot (versions, arch, translation, locale, displays, cpus, memory) | Under 2 ms total |
| tmux -V probe, the one spawn in the snapshot | 19.1 ms |
| Renderer console capture via the console-message event | About 1.4 microseconds per message |

The sentinel pattern was proven end to end. The file was written at boot, was gone after a clean quit, survived a deliberate main-process crash, and was found at the next boot. Its recorded pid matched the runningboardd termination record in the unified log, so the app's record and the OS record corroborate each other. powerMonitor in 43.3.0 exposes 11 events; the app uses suspend and resume today.

## 7. The tiers

Tiers are ordered by cost and by who pays it. Tier 0 runs on every boot for every user. Tier 1 is armed on every boot but spends disk only when something dies. Tier 2 runs only when a person asks. Tier 3 is the transmission question, and the answer is that no transmission code exists.

| Tier | When | Contents | Cost, measured or budgeted |
|---|---|---|---|
| 0, always on | Every run, packaged and dev | The NDJSON file `<userData>/logs/app.log` at level info. Boot environment snapshot. Process-gone events. Suspend and resume. Update events (the Phase 31 scope, folded in). Integrity gate records. A mirror of every durability notice. The run sentinel, written at whenReady and deleted at will-quit. The startup prune | Under 3 ms at boot for snapshot plus sentinel (2 ms + 0.156 ms measured). Disk capped at 4 MiB (section 11) |
| 1, on failure only | Armed at every boot, pays only when a process dies | crashReporter.start with uploadToServer false, before app ready. Minidumps kept locally under `<userData>/Crashpad`. At next boot, the sentinel check plus a readdir of the dump dirs (2.1 ms measured) writes one `boot.unclean_exit` record and shows one quiet notice. A boot sweep caps the dump dir | 25 to 33 ms at boot, one helper of 2 to 4 MB RSS. 0.4 to 1.6 MB disk per crash, swept to at most 5 dumps and 30 days |
| 2, user asks | Only on an explicit action in Settings or the menu | Runtime level switch to debug, no relaunch, reverts at quit. A renderer console capture toggle (1.4 microseconds per message measured; off by default). Copy Diagnostics, the app-wide sibling of the scrollback report. Open Logs Folder | Zero until used. Debug level raises line volume but the same 4 MiB cap bounds it |
| 3, transmission | Never automatic. See the verdict below | Copy Diagnostics puts redacted text on the clipboard. Open Logs Folder reveals the files. A person moves bytes by hand | Zero. There is no endpoint |

The tier 3 verdict, judged against research 37. Research 37 refuses any error or failure event to any network endpoint, because `catch (e) { post(String(e)) }` leaks absolute paths, and the ELECTRON investigation hardened that reasoning with bytes (section 6, the live token value inside the minidump). So the design gives transmission no code path at all. Signal's user-initiated debug-log upload is the best version of tier 3 that exists, and Tortie still does not build it, because it requires a server Tortie does not have and a need Tortie has not shown. If a future phase ever proposes an upload, this document binds it in advance. It must be user initiated from an explicit surface, the full payload must be rendered on screen before the send, dumps are never included, and nothing sends without a click on the rendered payload. Anything less is refused.

## 8. The framework decision

Operator direction says pick a standard framework, and the assemble-never-reimplement rule agrees. Roll-your-own is the null hypothesis and must lose unless every framework fails a hard constraint.

The hard constraints.

- Emits our NDJSON envelope exactly, not its own format.
- Bounded file rotation built in.
- Runtime level switch without relaunch.
- A hook that can redact every line before it reaches disk.
- Survives electron-vite bundling with externalizeDepsPlugin without runtime module resolution tricks.
- No network transport of any kind in the default install.
- Small. One dependency at most, no native code.

| Option | Verdict | Deciding reason |
|---|---|---|
| electron-log 5 | CHOSEN | Zero dependencies. File transport with maxSize rotation and a replaceable archive function, so the updates.log `.1` convention carries over. A format function emits our NDJSON envelope. Hooks run on every message before write, which is where redaction goes. Levels switch at runtime by assignment. CommonJS, externalized cleanly by electron-vite. Its renderer transport and its IPC channel are NOT used, see the wrapper rule below |
| pino | Rejected | Its transport system runs in worker threads and resolves transport modules by path at runtime, which fights bundlers. Rotation is not built in and needs pino-roll, another worker transport. Its only unique win is NDJSON output, and a 5-line format function gives us that anyway |
| winston | Rejected | The heaviest dependency tree of the three. Rotation needs winston-daily-rotate-file, a second package. Nothing Electron-aware. It buys nothing over electron-log at several times the weight |
| Roll-your-own | Rejected | updates/log.ts proves 90 lines can do one scope well. Generalizing it means owning level filtering, scope plumbing, redaction hooks, a renderer relay and rotation edge cases forever. electron-log passes every hard constraint, so the null hypothesis loses |

Two rules make the choice safe.

- Exactly one Tortie module imports electron-log. If the framework disappoints, one file changes. A build assertion (the assert-bundle-refusals pattern) fails the build when a second import appears.
- electron-log's renderer transport, preload injection and `__ELECTRON_LOG__` IPC channel are never enabled. Renderer lines travel over one new typed channel in src/shared/ipc.ts, per the one-bridge growth rule.

Unverified before build. The exact electron-log 5 format-function signature for emitting a raw JSON line, and its archive-function behavior, must be spiked in the first hour of the phase. If the format function cannot emit our envelope byte for byte, the fallback is electron-log's transport API with a custom transport function, which is a documented extension point. This does not change the verdict.

## 9. The stored format

NDJSON, one JSON object per line, everywhere. Judged against logfmt.

| Criterion | NDJSON | logfmt |
|---|---|---|
| Typed nested fields (decoded exit codes, dump inventories, display arrays) | Native | Flattening and quoting rules, lossy |
| One query tool | jq, already on every dev machine | Needs a parser per consumer |
| Peer precedent | Signal (pino lines) | None in the peer set |
| Human readability raw | Poor | Good |

Human readability is served at read time, never by loosening the stored format. The phase ships `npm run logs:pretty`, a small script that pipes app.log through a formatter, and documents one jq expression per record type. The stored bytes stay machine shaped.

The envelope, fixed field names on every line.

```json
{"ts":"2026-08-14T17:31:06.123Z","level":"info","scope":"boot","pid":66979,"proctype":"main","msg":"..."}
```

- `ts` is ISO 8601 UTC with milliseconds.
- `level` is one of error, warn, info, debug.
- `scope` is the domain, one lowercase word, e.g. "updates".
- `proctype` is one of main, renderer, gpu, utility.
- Typed records add an `event` field and their own named fields. Free-text logging adds nothing.

The three core record schemas.

Boot environment snapshot, one line per boot, under 2 KB.

```json
{"ts":"...","level":"info","scope":"boot","pid":66979,"proctype":"main",
 "event":"boot.env","msg":"boot",
 "app":{"version":"0.19.1","electron":"43.3.0","packaged":true},
 "os":{"version":"15.7.9","arch":"arm64","translated":false,"cpus":12,"memTotalBytes":51539607552},
 "displays":[{"w":1512,"h":982,"scale":2,"internal":true}],
 "locale":"en-US",
 "tmux":{"version":"tmux 3.6a","socket":"gmux"},
 "path":{"entries":37}}
```

PATH stores the entry count only, never the values, because PATH values embed the home directory and tool inventory. The tmux probe is the one spawn in the snapshot (19.1 ms measured); everything else totals under 2 ms.

Process-gone event, the Phase 28 lines made structured and durable.

```json
{"ts":"...","level":"warn","scope":"proc","pid":66979,"proctype":"main",
 "event":"process.gone","msg":"helper process gone",
 "kind":"child","ptype":"GPU","reason":"crashed",
 "exitCode":8704,"realCode":34,"name":"GPU"}
```

`kind` is child or renderer. `realCode` appears only when the wait status decodes (exitCode positive and divisible by 256), exactly the Phase 28 rule. The existing formatChildGone unit tests move over as field assertions.

Unclean-exit record, written at the next boot when the sentinel survives.

```json
{"ts":"...","level":"warn","scope":"boot","pid":70001,"proctype":"main",
 "event":"boot.unclean_exit","msg":"previous run did not exit cleanly",
 "prev":{"pid":66979,"version":"0.19.1","bootTs":"2026-08-14T13:40:02.000Z"},
 "dumps":{"newCount":1,"names":["7f3a....dmp"],"bytes":1067472}}
```

Write-time redaction, the single most copyable Signal fact. Every string field passes one hook before it reaches disk, and the hook replaces the home directory prefix with `~` in every string. The file on disk is already safe, so any later hand export cannot leak what was never written. This is deliberately narrower than Signal's redaction set because Tortie logs no phone numbers and no user identifiers, and section 13 forbids the content classes that would need more.

## 10. The uniform crash story

The sentinel is `<userData>/logs/run.json`, holding prev pid, version, boot timestamp and the dump-file names seen at that boot. It is written at whenReady (0.156 ms measured) and deleted in will-quit. Every step below was proven live in the ELECTRON lab across a real main-process crash.

At every boot, in order.

1. Read run.json. If present, the previous run did not exit cleanly.
2. readdir Crashpad pending/ and completed/ (2.1 ms measured) and diff the names against the sentinel's list. getLastCrashReport is useless with uploads off (verified), so the readdir diff is the mechanism.
3. Write the `boot.unclean_exit` record with the dump delta.
4. Show one quiet line, through the existing postDurabilityNotice channel with its one-per-kind latching. The copy is "Tortie quit unexpectedly last time. Details are in the logs." with a View logs action. No dialog, no modal, nothing on the happy path. This satisfies the Zen because a crash is a failure, and a failure is exactly what may rise above the surface.
5. Sweep the Crashpad directory to the newest 5 dumps and nothing older than 30 days. Crashpad's own prune policy is unverified against Electron 43 (the lab only proves no pruning inside a 4 minute window), so Tortie owns the cap itself.
6. Write a fresh run.json.

One trade, stated so nobody rediscovers it. Starting crashReporter moves crash records out of macOS's DiagnosticReports and into the app's Crashpad directory (verified in the lab, where the .ips report was suppressed). Tortie is choosing an app-owned record it actually reads over an OS record it never read. macOS's own .ips retention on this machine measured about 1 day before moving to Retired, so the OS record was already unreliable as evidence.

What the section 3 case studies would have looked like with the design in place.

- Incident 1, the GPU helper death on lid wake. With tier 0, app.log holds three adjacent lines inside the same second, and the diagnosis is one command, `jq 'select(.event=="process.gone")' app.log`, run without a dev terminal and without the unified log. The three lines are the suspend record, the resume record, and the `process.gone` record with ptype GPU and realCode 34.
- Incident 2, the updater refusal. With this design the updater's lines live in app.log as scope "updates", so the story reads in one file, from downloaded and staged through the install attempt to the refusal record, and then the next boot's `boot.env` still shows the old version, which is itself the proof the install did not land. The refusal check keeps reading ShipIt's tail; only its output moves into the shared log.
- The five SIGABRTs of 2026-08-14. With tiers 0 and 1, each next boot finds the sentinel, counts one new dump, writes `boot.unclean_exit`, and shows the one quiet line. Five crashes become five records, five dumps with thread stacks sitting locally for the operator, and five quiet notices instead of silence.

## 11. The footprint budget

The number. Hard ceiling 13 MB per profile, typical steady state under 4.5 MB.

The arithmetic.

| Item | Cap | Mechanism |
|---|---|---|
| app.log | 2 MiB | electron-log maxSize, checked at write |
| app.log.1 | 2 MiB | Archive rename replaces the previous one, the Phase 31 convention |
| run.json and small state | under 8 KiB | Single small files, rewritten in place |
| Legacy updates.log pair | up to 1 MiB, then zero | Left in place, deleted by the startup prune once older than 30 days |
| Crashpad dumps | 8 MB worst case | Boot sweep, newest 5 dumps at up to 1.6 MB each |
| Crashpad settings.dat and dirs | under 1 KiB | Crashpad's own metadata |

Defense against the peer table. VS Code holds 5.1 MB of logs plus 20 MB of Crashpad on this machine, 25.1 MB total. Slack holds 29 MB of logs plus 1.5 MB of Crashpad, 30.5 MB total. Claude Desktop holds 48 MB with no visible retention policy. Signal, the discipline benchmark, holds 1.5 MB of logs and an empty Crashpad. Tortie's typical state (4 MiB of logs, no dumps) sits next to Signal. Tortie's worst case (13 MB, which requires 5 unswept crashes) is half of VS Code's observed normal.

At roughly 200 bytes per NDJSON line, the 4 MiB log pair retains about 20,000 lines. At tier 0 volume (info and above, no per-keystroke events, no per-frame events) that is weeks of history for an active profile. The startup prune also deletes any file in the logs directory older than 30 days, copying Signal's age rule, so an abandoned profile decays to the sentinel and the current file.

The file lives under `<userData>/logs`, never `~/Library/Logs`. Phase 31 chose this deliberately and the reason holds for every scope. The shared Logs directory interleaves rehearsal builds into the operator's evidence, and userData isolates every harness profile for free.

## 12. The wrapper module

One module, `src/main/log/index.ts`, the only file in the tree that imports electron-log. The design in 10 lines.

1. `initLogging()` runs once in main, before whenReady, and configures the file transport to `<userData>/logs/app.log` with a 2 MiB maxSize and an archive function that renames to app.log.1.
2. A format function emits the NDJSON envelope, being ts, level, scope, pid, proctype, msg, plus the typed fields.
3. One hook redacts the home directory to `~` in every string field before write.
4. The console transport stays on with the existing human-readable prefixes, so dev terminals and the stdout-parsing harnesses see exactly what they see today; the file transport writes in packaged builds only, the Phase 31 rule.
5. `getLog(scope)` returns four functions, being error, warn, info and debug, each taking msg and optional fields.
6. `logEvent(scope, level, event, msg, fields)` writes the typed records of section 9.
7. `setLevel(level)` is the tier 2 runtime switch, and `getLogsDir()` backs the Open Logs Folder affordance.
8. One typed channel `log:append` in src/shared/ipc.ts carries renderer lines, being level (debug or higher), scope from a renderer allowlist, msg and bounded fields, written with proctype renderer; electron-log's own renderer transport is never enabled.
9. A failed file write is swallowed after one console warning per run, the exact updates/log.ts rule, because the log must never become the thing that breaks the app.
10. A build assertion fails when any file other than this module imports electron-log, and when any log call site embeds file contents or scrollback markers (a grep-shaped check, best effort).

## 13. Refused, permanently

These bind every future round the way the tmux safety rules do.

- No automatic transmission of any log line, any dump, any metric, to any endpoint, ever. Research 37's refusal of error and failure events stands, and the lab's dump bytes (a live token value inside the minidump) are the standing evidence.
- No Sentry, no bugsnag, no crash upload SDK in any form. uploadToServer stays false and no setting, flag or config row may flip it.
- No coupling of crash-dump handling to any future telemetry setting. VS Code hides crash upload behind its telemetry level, and that coupling is the anti-pattern. If tier 3 is ever built, it is its own explicit surface with the payload shown before send.
- No renderer keystroke capture, no input capture, no clipboard capture. The tier 2 console-capture toggle records console messages only, is off by default, and its captured `sourceId` paths make even those lines local-only material.
- No log line may embed file contents, session scrollback, terminal output, prompt text or agent conversation. Logs record that things happened, never what the user or the agent said.
- No log file outside `<userData>`. The shared `~/Library/Logs` directory is refused for the Phase 31 reason.

## 14. Migration list

What moves, what stays, in the one phase.

| Today | Becomes |
|---|---|
| src/main/updates/log.ts, logUpdateEvent and its 1 MiB pair | `getLog('updates')`. The module's rotation code retires. Legacy updates.log files age out via the startup prune |
| src/main/diagnostics/process-gone.ts, console.warn only | `logEvent('proc','warn','process.gone',...)` with the section 9 schema. The decode rule and its tests carry over as field assertions |
| src/main/power/index.ts, 9 console calls | scope "power", suspend and resume as info records |
| reportDatabaseGate (db/sqlite.ts) and reportManifestGate (manifest/store.ts) console narratives | One error record each, scope "db" and "manifest", narrative in fields. The durability notice half is unchanged |
| notice/index.ts and migrate/notice.ts | Every durability notice mirrored as one warn record, scope "notice", so the log holds what the user was shown |
| The remaining main-process console calls (sessions 28, index.ts 24, manifest 15, restore 13, tmux 10, config 10, others) | Move error and warn calls in the phase, scope per directory. Move info calls opportunistically afterward. Nothing is deleted; dev console behavior is preserved by the console transport |
| Harness protocol output ([gmux-fault], [gmux-smoke], [gmux-conf], [gmux-shot], conformance, search bench) | STAYS on console, untouched. build/fault-harness.mjs parses these records from stdout; routing them through the wrapper would break the parser for nothing |
| Renderer, no error hooks at all | New window.onerror and unhandledrejection handlers plus one React error boundary, each writing one error record over `log:append`. Probe consoles stay as they are |
| Nothing | New modules for the boot snapshot, the sentinel, the Crashpad sweep, crashReporter start, and the Settings affordances (level switch, Open Logs Folder, Copy Diagnostics) |

Copy Diagnostics extends the scrollback report pattern (pull-only, plain text, a Copy button in Settings) to the app itself. The bundle holds the current snapshot, the tail of app.log, and the dump inventory as names, sizes and dates. Never dump bytes. The text is on the clipboard, so the user sees every byte before it goes anywhere.

## 15. Phase shape and verification tier

One phase. Nothing in it touches tmux, the manifest, restore or session lifecycle, so it earns Tier 2, not Tier 3.

- Gates. typecheck, build, test, smoke:t1, plus unit tests for rotation, redaction, the three schemas, and the sentinel lifecycle.
- Probe 1. In a packaged-style run, kill the GPU helper and read the `process.gone` record back out of app.log with jq.
- Probe 2. kill -ABRT the main process of a scratch-profile run, relaunch, and confirm the `boot.unclean_exit` record, the one quiet notice, and the dump count.
- One screenshot read of the notice line.

The first hour of the phase is the electron-log spike named in section 8, because the format-function fidelity is the one unverified load-bearing fact in the framework choice.

## 16. What is not true

What did not land, and what is assumed. Nothing in sections 7 to 15 is built. Phase 25 telemetry stays deferred and this design leaves no hooks for it. The five SIGABRT crash reports were read at header level only; the cause behind them was not investigated, and they are not correlated to any operator action or to the update installed later that day.

Unverified facts carried out of the three investigations and this design, each with its consequence.

| Unverified | Consequence for the design |
|---|---|
| The electron-log 5 format-function and archive-function behavior under electron-vite | Spiked in the first hour of the phase; the fallback (a custom transport function) is named and does not change the verdict |
| Where a Dock-launched packaged build's stdout goes | Asserted 3 times in the tree as lost, never observed directly. The design does not depend on the answer |
| Whether Electron's --enable-logging flag would capture main-process console output | Never tested; the design does not use it |
| Crashpad's internal prune policy in Electron 43 (upstream defaults are 365 days or 128 MB) | The design caps the directory itself instead of trusting it |
| Whether dumps migrate from pending/ to completed/ with uploads off over long horizons | The boot sweep reads both directories, so the answer does not change behavior |
| Why `<userData>/logs` does not exist on the operator's profile | Most likely the installed build predates Phase 31; which build first shipped updates/log.ts was not confirmed |
| Whether a packaged app can read DiagnosticReports without a TCC prompt | This shell could read it; the app was not tested. The design does not read DiagnosticReports |
| Whether DevTools is reachable by keyboard in a packaged build | The menu item is stripped; the accelerator was not tested in a packaged build |
| The 200 bytes-per-line estimate in the budget | An estimate from the schemas, not a measurement; the caps hold regardless of the true average |
| Slack's and Claude Desktop's exact rotation constants | Inferred from file names and sizes on disk; their source is closed. They only inform the peer table, not the design |
| The console-message listener cost (14 ms versus 10.8 ms for 10,000 messages, single runs) | Within run-to-run noise; only the order of magnitude (about 1.4 microseconds per message) is quoted |
| The renderer's 48 console calls were not individually classified | The prefix distribution says most cannot fire outside a probe run; the migration list treats them as staying put either way |
