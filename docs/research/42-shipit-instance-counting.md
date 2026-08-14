# Research 42. How Squirrel counts running instances, from the operator's first live update

Banked by the Phase 31 integrator on 2026-08-14. The phase spec was a working
file and is gone. The facts it rested on live here, so the next agent inherits
them instead of re-deriving them. The writing rules apply. Simple words,
complete sentences, no em dashes and no en dashes.

## 1. The incident, from disk evidence dated 2026-08-14

The operator ran Check for Updates on installed 0.19.0. The dialog said
"Tortie 0.19.1 is downloading. It installs when you quit." The download
completed. The zip was 169060908 bytes, the sha512 verified, and the file was
cached under `~/Library/Caches/tortie-updater/pending/`. Squirrel staged it.
ShipIt then aborted three installs, at 15:16:49 and 15:17:39 and 15:19:11,
each with SQRLInstallerErrorDomain code -9, "there are 1 running instances of
the target app". Tortie surfaced nothing at any point and persisted no log.

The counted instance was the installed app itself. The operator quit, saw
nothing happen, relaunched to look, and the relaunch landed inside the 25 to
32 second install window that follows each quit. This happened twice in the
same shape.

## 2. How ShipIt counts running instances (settled by disassembly)

The vendored Electron dist carries no Squirrel.Mac source, so the rule was
read out of the ShipIt binary itself
(`node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework/Resources/ShipIt`,
arm64, Electron 43.3.0). An instance counts only when BOTH of these match:

- its bundle identifier equals the request's `bundleIdentifier`
- its standardized bundle URL equals the request's `targetBundleURL`

Two code sites apply the rule.

| Site | Address | Behavior |
| --- | --- | --- |
| Wait gate | 0x10000abd0 | Enumerates matching instances when ShipIt starts, waits for each one's termination, then logs "Beginning installation" |
| Abort check | 0x100004f38 | Re-enumerates after verification. A nonzero count logs the abort line and raises code -9 |

Consequences. The dev build (`com.github.Electron`) can never be counted. A
rehearsal instance running from a scratch directory can never be counted
against the installed app. Only a process running from
`/Applications/Tortie.app` counts against the installed app.

One gap stays open. Whether the wait gate re-enumerates after its first
snapshot is unknown until probe R1 runs (section 5).

## 3. The two moments in the library, pinned from the vendored source

`node_modules/electron-updater/out/MacUpdater.js` (electron-updater 6.8.9):

1. The library downloads the zip itself, verifies the sha512, and caches it.
2. `updateDownloaded()` starts a loopback proxy. The moment the proxy is
   listening it emits the PUBLIC `update-downloaded` event
   (`dispatchUpdateDownloaded`, MacUpdater.js line 220), and only THEN calls
   the native `autoUpdater.checkForUpdates()` (line 223, because
   autoInstallOnAppQuit is true).
3. Squirrel fetches the zip from the proxy, verifies the signature against
   the designated requirement, stages the update, and submits the ShipIt
   launchd job. When it finishes, ELECTRON's own native `autoUpdater` emits
   `update-downloaded`, which the library records
   (`squirrelDownloadedUpdate = true`, line 22) and logs as
   `nativeUpdater.update-downloaded`.

A quit between moment 2 and moment 3 installs nothing. Phase 24 measured this
directly. A quit 0.2 seconds after the public event installed nothing, and
about 1.6 seconds separated the two events on the rehearsal machine (the
comment in build/update-rehearsal.mjs records the finding). The incident adds
a second number. ShipIt spawns at staging time, and after the quit the
install itself ran 25 to 32 seconds before the abort check.

So the honest answer to "which event is ready" is the native one. The public
`update-downloaded` means "downloaded and being staged". The native
`update-downloaded` means "a quit from here installs". Phase 31 moved
`stagedVersion` to the native event for exactly this reason.

## 4. The evidence a launch can read

`~/Library/Caches/com.itavero.tortie.ShipIt/ShipIt_stderr.log` is plain text
NSLog output. The exact lines, copied from the operator machine:

```
2026-08-14 15:16:16.702 ShipIt[86893:81533290] Beginning installation
2026-08-14 15:16:49.024 ShipIt[86893:81560110] Aborting update attempt because there are 1 running instances of the target app
2026-08-14 15:16:49.029 ShipIt[86893:81560110] Installation cancelled: Error Domain=SQRLInstallerErrorDomain Code=-9 "App Still Running Error" ...
```

The file also contains untimestamped noise lines beginning `ERROR: Unrecognized
attribute string flag`. `ShipItState.plist` in the same directory parses as
JSON despite its name and holds `bundleIdentifier`, `targetBundleURL`,
`updateBundleURL` and `launchAfterInstallation`.

Two consumers read this evidence now:

- src/main/updates/refusal-check.ts reads the log tail at launch to name the
  reason an install did not happen. It matches the newest line of the abort
  shape and compares its local timestamp against the app's own pending
  record, with a 60 second slop.
- build/update-rehearsal.mjs refuses to run while a ShipIt process for
  `com.itavero.tortie` exists, or while `ShipItState.plist` targets
  `/Applications/Tortie.app` or cannot be parsed. The rehearsal builds carry
  the production bundle id, so they share the ShipIt directory and the
  launchd job label with the installed app, and staging a rehearsal update
  while the operator has an install waiting could replace the operator's
  pending job.

## 5. The probes, and what is banked so far

build/update-rehearsal.mjs gained a `--two-instance` mode with two probes.

- Probe R1 reproduces the operator's abort. It stages an update, brings up a
  second instance from the SAME app path, quits the first, and captures the
  code -9 abort. Then it quits the second instance and proves the install
  completes. The harness records which strategy produced the abort. The
  primary strategy answers "the wait gate does not re-enumerate". The
  fallback strategy, which spawns the second instance inside the install
  window after the quit, answers "it does". Whichever runs settles the gap
  in section 2.
- Probe R2 stages again and keeps an instance of the same bundle id running
  from a DIFFERENT path while the primary quits. The install must complete
  with no new abort line. That confirms live that the bundle URL is half of
  the counting rule, which section 2 established only from disassembly.

Probe status on 2026-08-14. The probes cannot run on the operator machine
until the operator quits the installed Tortie once, because the operator's
own third ShipIt attempt is still waiting (pid 68220 at the time of the
integration run). The harness's own precondition refuses with exit 2 before
any launch, names the pid, and that refusal fired live during integration.
Operator sessions read 22 before and 22 after. When the probes run, bank the
strategy that produced the abort and the measured numbers here.

## 6. What is assumed and what is not true

- The counting rule comes from disassembly of the shipped binary, not
  source. Probe R2 is the live confirmation of its URL half.
- The refusal parser trusts NSLog local timestamps and a 60 second slop. A
  machine whose clock jumps across an update can misclassify one refusal as
  unknown, which fails toward saying less, not more.
- "It installs the next time you quit" assumes the next run can reach the
  feed and restage from the cache. The incident's own timeline shows the
  restage happening within 47 seconds of relaunch. An offline machine breaks
  that promise.
- What consumes the 25 to 32 seconds between Beginning and the abort check
  on the operator machine stays unmeasured. The rehearsal measures the local
  window only.
