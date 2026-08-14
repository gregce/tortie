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

The gap this section left open is now settled live (section 5). The wait
gate re-enumerates. An instance that appears after ShipIt starts, but
before "Beginning installation", is waited on like any other. The abort
check only fires on an instance that appears inside the short window
between "Beginning installation" and the post verification count, which is
exactly where the operator's relaunch landed.

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

`ShipItState.plist` SURVIVES A SUCCESSFUL INSTALL. Observed on the operator
machine on 2026-08-14, after the third waiting attempt finally landed. The
install completed at 16:32:36 ("Installation completed successfully" in the
log). The staged bundle directory the plist names in `updateBundleURL`
(`update.c1wRw4m`) was consumed by the install. The plist itself stayed,
unchanged since 15:19, still naming `/Applications/Tortie.app/` as its
target. So the plist alone never proves an install is in flight. The honest
in flight test is both at once: the plist targets the install location AND
the staged bundle it names still exists on disk.

Two consumers read this evidence now:

- src/main/updates/refusal-check.ts reads the log tail at launch to name the
  reason an install did not happen. It matches the newest line of the abort
  shape and compares its local timestamp against the app's own pending
  record, with a 60 second slop.
- build/update-rehearsal.mjs refuses to run while a ShipIt process for
  `com.itavero.tortie` exists, while `ShipItState.plist` cannot be parsed,
  or while the plist targets `/Applications/Tortie.app` AND the staged
  bundle it names still exists. The plist target alone was the original
  Phase 31 test, and it over refused for ever on any machine whose
  installed app had ever completed an update, because of the survival fact
  above. The fix round corrected it. The rehearsal builds carry the
  production bundle id, so they share the ShipIt directory and the launchd
  job label with the installed app, and staging a rehearsal update while
  the operator has an install waiting could replace the operator's pending
  job.

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

Probe results, banked from the fix round runs of 2026-08-14. All three
modes passed on the operator machine, after the operator's own install had
landed and the precondition correction (section 4) let the harness run.
Operator sessions read 22 before and 22 after on every run.

The roundtrip:

- first check 30.4 s after launch, against the 25 s floor
- staged 32.3 s after launch, and the app's own "is staged and installs
  when you quit" line landed at the native moment the harness waits on
- bundle swap at quit, 4 to 6 s after exit
- the harness session list after relaunch was byte identical to the list
  before quit
- the background staging surfaced nothing. No dialog line in the app log
  and no dialog text in the accessibility tree while staged

Probe R1, which ran the fallback strategy:

- the PRIMARY strategy could not abort, and that is itself the finding
  that settled section 2's gap. With instance B up from the same path
  before the quit, ShipIt logged no "Beginning installation" for 30 s.
  The wait gate had re-enumerated and was waiting on B too. Quitting both
  instances let the pending install complete on its own.
- the FALLBACK strategy reproduced the incident. "Beginning installation"
  1.5 s after the quit, instance B spawned inside that window, and ShipIt
  aborted: "Aborting update attempt because there are 1 running instances
  of the target app", 3.1 s from Beginning to abort, 4.6 s from quit to
  abort, Info.plist still reading the old version through it.
- the relaunch after the abort showed the refusal dialog, and the probe
  read it off the screen verbatim through the accessibility tree: "The
  update did not install. The update to 0.18.2 did not install because
  another copy of Tortie was running. It installs the next time you
  quit." The probe clicked OK, boot continued, the update restaged from
  the cache about 31 s later, and the quit installed it 2.6 s after.

Probe R2:

- an instance of the same bundle id kept running from the PRISTINE copy
  at a different path while the primary quit. The install completed 3.1 s
  after the quit, no abort line was appended, and the different path
  instance stayed on the old version. The URL half of the counting rule
  held live.

The ready dialog probe (`--ready-dialog`, added in the fix round):

- the probe clicked the real "Check for Updates…" menu item 4.9 s after
  launch, well before the 30 s background timer
- the Update found dialog was read off the screen verbatim: "Update
  found. Tortie 0.18.2 is downloading. Another message appears when it is
  ready."
- after the probe clicked OK, the ready dialog followed with no further
  input, read verbatim: "Tortie 0.18.2 is ready. It installs when you
  quit. To install it now, use the Tortie menu."
- the quit installed 0.18.2 in 3.1 s

One more mechanism fact fell out of the failed first recovery attempt. A
dialog shown with no parent window freezes the app's main event loop on
macOS until someone dismisses it. The refusal dialog shows before the
window opens, so the whole boot, tmux server startup included, waits for
the OK click. A frozen instance also ignores SIGTERM, which is why the
harness escalates to SIGKILL after a grace when it cleans up. For the
person at the keyboard this is one click before the app opens. A later
phase may prefer to show the dialog after the window is up; that is a
choice about feel, not correctness, and nothing here forces it.

## 6. What is assumed and what is not true

- The counting rule came from disassembly of the shipped binary, not
  source. Probe R2 has now confirmed its URL half live.
- The refusal parser trusts NSLog local timestamps and a 60 second slop. A
  machine whose clock jumps across an update can misclassify one refusal as
  unknown, which fails toward saying less, not more.
- "It installs the next time you quit" assumes the next run can reach the
  feed and restage from the cache. The incident's own timeline shows the
  restage happening within 47 seconds of relaunch, and the R1 recovery leg
  measured about 31 seconds locally. An offline machine breaks that
  promise.
- What consumed the 25 to 32 seconds between Beginning and the abort check
  on the operator machine stays unmeasured. The local window measured 3.1
  seconds, so the operator numbers likely include disk pressure or
  Spotlight work the rehearsal does not reproduce.
- The screenshots the probes save show the active space, not necessarily
  the app's space, so the accessibility tree reads are the visual
  evidence. They quote the words a window really carried, straight from
  the running window server.
