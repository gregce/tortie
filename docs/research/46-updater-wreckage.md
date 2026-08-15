# 46. How Tortie's updater wrecked itself, and why it stayed wrecked

Banked in Phase 43. Read this before changing anything in `src/main/updates/`.

**The one line.** Every update check that runs after a download has finished
re-stages the update, and every Squirrel staging deletes the staged bundle the
pending install is waiting on.

**Status.** The cause is settled from the operator's own disk and from the
shipped Squirrel binary. Section 5 names the three things this document does
not settle.

---

## 1. What happened, from the operator's machine

On 2026-08-15 the operator's Tortie 0.19.1 tried to update itself to 0.20.2.
The update downloaded, and then no install ever succeeded again until the
orchestrator cleared Squirrel's saved state by hand. Tortie showed nothing at
any point.

The evidence is
`~/Library/Caches/com.itavero.tortie.ShipIt/ShipIt_stderr.log`, read read-only
that day. All timestamps are local, which is how NSLog writes them. Lines
beginning `ERROR: Unrecognized attribute string flag` are present in the file
and are cut from this quote.

```
00:29:19.152 ShipIt[69989:92086352] Detected this as an install request
00:29:24.761 ShipIt[70665:92087700] Detected this as an install request
00:29:38.105 ShipIt[70665:92087710] Beginning installation
00:29:38.125 ShipIt[70665:92089787] Installation error: Error Domain=SQRLInstallerErrorDomain Code=-1
  "Failed to copy bundle file:///Users/gdc/Library/Caches/com.itavero.tortie.ShipIt/update.KZlg2R9/Tortie.app/
   to directory file:///var/folders/.../com.itavero.tortie.ShipIt.fFsI228X/Tortie.app" ...
   NSUnderlyingError { NSCocoaErrorDomain Code=260 "The file "Tortie.app" couldn't be opened because
   there is no such file." ... NSPOSIXErrorDomain Code=2 "No such file or directory" }
00:29:38.189 ShipIt[71832:92089801] Resuming installation attempt 2
00:29:38.200 ShipIt[71832:92089801] Installation error: ... same error ...
00:29:40.268 ShipIt[71966:92090057] Resuming installation attempt 3
00:29:40.276 ShipIt[71966:92090057] Installation error: ... same error ...
00:29:42.389 ShipIt[72120:92090255] Too many attempts to install, aborting update
00:29:42.394 ShipIt[72120:92090255] ShipIt quitting
```

The numbers in that block:

| Measurement | Value |
| --- | --- |
| Time between the two install requests | 5.609 s |
| Time from the second install request to the give up line | 17.628 s |
| Time from "Beginning installation" to the first error | 0.020 s |
| Install attempts before the give up | 3 |
| The staged bundle the state file named | `update.KZlg2R9/Tortie.app` |
| Whether that path existed at install time | no, POSIX error 2 |

The machine recovered later the same minute, after the orchestrator cleared
the state by hand. At 00:34:33 a fresh install request ran and at 00:34:48.994
ShipIt logged "Installation completed successfully".

## 2. Fact one. Tortie stages the same update more than once per run

electron-updater's `MacUpdater.updateDownloaded()` is the function that hands
the bytes to Squirrel. It is reached from `AppUpdater.executeDownload`, and
`executeDownload` calls its `done()` path when `validateDownloadedPath` finds
the zip already cached, without downloading anything again. The branch is
`cachedUpdateFile != null` in `node_modules/electron-updater/out/AppUpdater.js`.

Two guards look like they should stop a second cycle, and neither does:

- `AppUpdater.downloadUpdate` guards only while `this.downloadPromise` is not
  null, and that promise is cleared in a `finally` as soon as the first cycle
  finishes.
- `AppUpdater.checkForUpdates` clears `checkForUpdatesPromise` when
  `doCheckForUpdates` resolves, which happens BEFORE the download finishes,
  because the download promise is returned inside the result object and is
  never awaited there.

So any check that starts after a staging has completed runs the whole staging
path again from the cached zip. `updateDownloaded` then closes the old loopback
proxy, opens a new one, calls `nativeUpdater.setFeedURL`, and calls
`nativeUpdater.checkForUpdates()` a second time
(`node_modules/electron-updater/out/MacUpdater.js`, the `server.listen`
callback). The two "Detected this as an install request" lines 5.609 s apart
are those two stagings. The operator was driving the update by hand that night,
so more than one check in the same minute is exactly what happened.

## 3. Fact two. Every Squirrel staging deletes the previous update directories

The vendored Electron dist carries no Squirrel source, so this was read out of
the shipped binary at
`node_modules/electron/dist/Electron.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel`
(arm64). The selector `removeUpdateDirectoriesInStorageURL:excludingURL:`
exists and has exactly two call sites.

| Site | Address | Excludes | Guard |
| --- | --- | --- | --- |
| A, inside `-[SQRLUpdater pruneUpdateDirectories]` (imp 0xb7e0) | 0xb99c | nothing, `x3` is set to 0 at 0xb9ac | skipped only when that updater instance's `state` equals 3, which is `SQRLUpdaterStateAwaitingRelaunch` |
| B, the fresh staging directory path (imp 0xbca4) | 0xbc8c | one captured URL, the directory just created | none |

Site B deletes the pending staged bundle by design, because the exclusion is
the NEW directory and not the pending one. Site A deletes every update
directory including the pending one, and its only guard is a field on one
`SQRLUpdater` instance held in memory.

## 4. The two facts joined

Staging number two created a new directory and deleted the directory the
pending `ShipItState.plist` named. The plist was left naming a directory that
no longer existed.

The ShipIt launchd job had been waiting for the app to quit since 00:29:24. It
woke at the quit, could not copy the bundle, and failed with
`SQRLInstallerErrorDomain` code -1. launchd relaunched the job. Squirrel counts
attempts in its own preferences domain `com.itavero.tortie.ShipIt` and stops at
3 with "Too many attempts to install, aborting update".

From that moment the saved attempt count makes every later install fail
immediately, for ever, until someone clears it. That is the part that turned a
failed update into a machine that could not update at all. Removing the plist
file under `~/Library/Preferences` does not clear it, because cfprefsd holds
the domain in memory and writes it back. `/usr/bin/defaults delete
com.itavero.tortie.ShipIt` does clear it.

Tortie showed nothing at any point. The running 0.19.1 predates Phase 31, so it
had neither the pending record nor the refusal check.

```
  library download finishes            a later check              the quit
          |                                  |                        |
          v                                  v                        v
   staging 1 creates update.A         staging 2 creates update.B   ShipIt wakes
   ShipItState.plist names update.A   and DELETES update.A         copies update.A
   ShipIt job waits for the quit                                   POSIX error 2
                                                                        |
                                                    launchd retries 3 times
                                                                        |
                                          "Too many attempts", saved for ever
```

## 5. What this does not settle

- Which of the two prune sites deleted `update.KZlg2R9` is not settled by the
  log alone, because a third staging cycle that began and failed before
  spawning ShipIt would leave no line. Both sites delete a pending staged
  bundle and both are reached by a second staging cycle, so the remedy is the
  same either way.
- Whether Electron builds a fresh `SQRLUpdater` on every `setFeedURL` was not
  read out of Electron's own binary. If it does, site A's state guard is
  worthless across staging cycles. Nothing in the design depends on the
  answer, because site B has no guard at all.
- What consumed the 13.3 s between the second install request and "Beginning
  installation" is the wait gate waiting on the app to quit, which research 42
  already settled.

## 6. What Phase 43 built on top of this

| # | Item | Where |
| --- | --- | --- |
| 0 | One staging per run. Once an update is handed to the installer, this run checks no more | `src/main/updates/updater.ts`, `handedToInstaller` |
| 1 | The launch refusal line learned two more shapes, a staged bundle missing and the installer giving up, and reads the attempt count out of the log | `src/main/updates/refusal-check.ts`, `readShipItEvidence` |
| 2 | A recovery verb that clears the state file, the staging directories, the preferences domain and the pending cache, then re-arms the check | `src/main/updates/recovery.ts` |
| 3 | A health verdict a launch can ask with no pending record to anchor on, so a wreck survives a "Not Now" and a wreck made by an older build is still found | `src/main/updates/shipit-state.ts` |

Two rules in that code are load bearing and must not be "simplified" later.

The health verdict decides `healthy` BEFORE it decides `gave-up`. A machine
that gave up on one update and has since staged another is healthy, and
clearing there would delete an install that was about to succeed.

The verdict decides `installed` before both of the wrecked reasons, because
Squirrel leaves `ShipItState.plist` behind after a success, still naming a
bundle the success consumed. Research 42 section 4 observed that on this
machine. Without that rule every launch after a successful update would look
wrecked.

## 7. Three things the first cut of the code got wrong, measured live

The verifier drove the packaged app against a scratch copy of Squirrel's
state. Three defects came out of that run and all three are fixed. They are
recorded here because each one is the kind of mistake the next round can make
again.

**The bundle comparison must resolve symlinks.** The health verdict asks
whether Squirrel's state file targets this app. The first cut compared the
raw string from `targetBundleURL` against `process.execPath`. libuv resolves
`process.execPath` through symlinks and nothing guarantees the state file
holds the resolved form, so an app under `/var/folders/...` read as
`/private/var/folders/...` on one side only. The strings disagreed, the state
file read as another application's, the verdict fell to `unknown`, and
`unknown` proceeds. The click then deleted a HEALTHY staged update, which is
the one thing this phase promised never to do. Measured directly. With
`targetBundleURL` written unresolved the click logged `repair finished as
cleared. 4 removed, 0 failed.` and removed the staged bundle. With the same
directory written resolved the same click showed the pinned refusal and left
the state root byte identical. `sameBundleOnDisk` now resolves both sides,
and `recoveryPlan` refuses outright when a state file parsed and does not
target this app, so the fall through cannot happen again.

**A repair must leave a mark.** The repair keeps `ShipIt_stderr.log`, because
that log is the only evidence the next incident can be read from. The give up
line in it therefore stays the newest terminal line for ever. The launch
after a successful repair read that line, found no state file, and offered
the same repair again with the words "The installer tried 3 times to install
an earlier update". `recovery.ts` now writes `tortie-repair.json` into the
ShipIt directory when it clears, and every read skips a log line stamped at
or before that moment. The mark sits beside the state it describes rather
than in userData, so a fresh profile reading a healed ShipIt directory reads
it as healed.

**A give up outranks the reason in the copy.** Phase 31's two sentences both
end "It installs the next time you quit", and that is false once the
installer has saved that it gave up. The first cut of Phase 43 read the give
up flag only on the missing staged bundle branch, so a machine that gave up
after another copy was running, or after a cause the log did not record, was
told to quit and wait for an install that could never happen, and was offered
nothing. Both shapes now say how many times the installer tried and offer the
clear. Both were read off the screen on 2026-08-15.

**"Already gone" has more than one wording.** `defaults delete` on a domain
that does not exist exits 1. The code accepted only the text "does not
exist". macOS 15.7.9 prints `Domain (com.itavero.tortie.ShipIt) not found.`,
so a whole repair reported itself to the user as partial, with the sentence
"the update may still fail to install" after a repair that removed
everything. Both wordings are accepted now, and any other failure is
confirmed by reading the domain back before it is called a failure.
