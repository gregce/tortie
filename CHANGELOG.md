# Changelog

Each release lists its changes under Added, Changed and Fixed. Two rules keep the sections readable, and both exist because the operator asked for them on 2026-08-16. First, every commit appears in EXACTLY ONE section, chosen by what the commit is: new capability under Added, a repaired defect under Fixed, existing behavior reshaped under Changed. One commit gets one item that tells its whole story, never one item per section, because the same hash repeated across three headers is confusing and defeats the point. Second, every paragraph and every bullet sits on a single unwrapped line, because the GitHub release page renders a newline as a line break, and hard-wrapped text shows ragged there. Prose appears above the sections only when something needs explaining. Versions follow semver: the minor moves for features, the patch for fixes. Release pages carry these entries verbatim.

## 0.26.1 (2026-08-16)

Five versions in one release, and the two you will feel first are the tmux that ships inside the app and the update flow that stopped interrupting you.

Updating from 0.24.3 changes nothing about your running sessions. The bundled tmux takes over only when a fresh server starts, which in practice means after your next reboot. Until then everything runs exactly as it did.

### Added

- Tortie carries its own tmux 3.7b, signed inside the app, so a fresh Mac needs nothing installed. A new version becomes the server only at cold start, and Tortie never restarts or upgrades a server that is already running, so no session is ever disturbed by an update. If the app meets a server version pair that was never tested, it refuses to attach and says so with a screen naming both versions, instead of risking your sessions ([`2c225e4`](https://github.com/gregce/tortie/commit/2c225e4))
- A small ring above the settings gear carries the whole update journey, and the update dialogs are gone. The ring fills with real download progress, hovering names the stage in words, and clicking opens a native menu with the choices for that moment: Restart and update now, or Install when you quit; after a failed check, Why it failed and Repair updates. Background checks stay silent until an update is actually ready, exactly as before. One gap to know: the home screen has no activity bar, so a check started with no project open shows no ring until the update is staged ([`9eb2b7f`](https://github.com/gregce/tortie/commit/9eb2b7f))

### Fixed

- Three interaction reports from real use. Sessions can be dragged into and out of a group while the session list is collapsed to icons, the same as when it is expanded. Restoring a past session whose project is not open now asks first, with a native dialog naming the project and offering open and restore, or cancel, and if the folder is gone from disk it says that instead. The View menu lists all 4 views with their shortcuts, being Explorer, Search, Source Control and Context ([`cc60680`](https://github.com/gregce/tortie/commit/cc60680))
- An agent that cannot start now says why instead of showing a dead pane. Before launching, Tortie reads the file it is about to run, and when the program named on its first line is missing from the session's PATH, it refuses with the missing program named, two ways forward, and a Start it anyway button. An agent that starts and then dies within seconds shows the last lines it printed, in its own words, instead of a bare exit code. Tortie also waits up to 10 seconds for your login shell instead of 3, because slow shells made agents installed through npm fail to start. The old screen that recommended the exact npm install that caused the problem is gone ([`2b4ee2f`](https://github.com/gregce/tortie/commit/2b4ee2f))
- Harness and test launches of the app no longer touch the macOS keychain, so automated runs cannot queue keychain dialogs on your screen ([`0d92728`](https://github.com/gregce/tortie/commit/0d92728))

## 0.24.3 (2026-08-15)

One fix, and it is the thing that made the file tree hard to look at. Grey rows stopped flashing white.

### Fixed

- Ignored files and folders no longer flash white while agents write to the repository. The explorer used to throw away everything it knew about ignored files on every write and ask git again, and for the 13 to 30 ms that took, every grey row went bright, which under constant agent writes happened about every two seconds. It now keeps showing the last answer while it fetches the new one. A probe on 0.24.2 caught 84 bright frames out of 3601 painted over 31 seconds; the same probe on this build caught 0 of 3601, then 0 of 4802, then 0 of 4802 again with 2000 extra ignored files. One trade to know: editing a .gitignore now takes up to 10 seconds to show, where it used to take up to 2, because git is asked 6 times a minute instead of 30 and the wait no longer blanks anything ([`3bbc3e6`](https://github.com/gregce/tortie/commit/3bbc3e6))

## 0.24.2 (2026-08-15)

Eight changes, and the one that matters most is invisible: the reason an update failed yesterday is closed. Tortie was checking for updates again after it had already handed one to the installer, and every check re-staged the download, deleting the copy the pending install was waiting on. It now stops checking once an install is prepared, explains itself when one fails, and offers a Repair Updates item that clears a wreck in one click.

The rest is what you asked for while using it: your right click keeps your selection, ignored files look ignored, and you can watch a CI run or open a file in another app without leaving the window.

### Added

- A Runs section in the Source Control view, for repos with a github.com origin. It lists the latest 10 runs for your branch and expands to jobs and steps. A push starts a bounded watch that follows your commit's run until it finishes. It reads and never writes, and nothing about a run appears outside the panel ([`1eeddea`](https://github.com/gregce/tortie/commit/1eeddea))
- Open With on every file row, listing the apps macOS registers for that file with the default marked, plus Other for the system chooser. Files open by spawning the system open command ([`9a69e89`](https://github.com/gregce/tortie/commit/9a69e89))
- One structured log file per profile at `<userData>/logs/app.log`, capped at 2 MiB with one backup, with your home directory replaced by a tilde before anything is written. Crash dumps stay on your machine, and the build fails if any code ever tries to upload one. A Diagnostics section in Settings adds a debug switch, Open logs folder, and Copy diagnostics, which copies the boot details, the log tail and a crash dump inventory ([`774132a`](https://github.com/gregce/tortie/commit/774132a))
- Environment passthrough for agents. Name variables in an `agents.json` row and Tortie reads them from your login shell at each launch and restore. Values are never written to any file ([`67ce3e3`](https://github.com/gregce/tortie/commit/67ce3e3))

### Fixed

- Four explorer reports from the first day of real use. Ignored files and folders are drawn grey in the file tree, using git itself so negation patterns are honored, and grey means ignored, not disabled. Filtering the tree and clicking a result no longer clears the filter; only the clear button, the filter toggle, Escape or starting a rename clears it. The Explorer header gains a row spacing menu, and History gains a compact gutter toggle that starts commit text beside its own lanes ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))
- Right clicking a selection in a session no longer throws it away, which had made Copy as HTML unreachable; the cause was an xterm option that selects a word on right click, on by default on macOS. And in a group of two or more sessions, the focused pane now carries one soft box while the others fade slightly, with headers never fading, so a session asking for input keeps a full brightness dot ([`08b4757`](https://github.com/gregce/tortie/commit/08b4757))
- An update that fails now says why, and a wrecked updater can be repaired in one click instead of silently refusing every future update ([`cb07b37`](https://github.com/gregce/tortie/commit/cb07b37))
- Two sessions of one agent started in the same folder no longer fight over one conversation record, and a record claimed on weak evidence can be taken back by a session that can prove ownership. A folder reached by two spellings, such as `/tmp` and `/private/tmp`, counted as two folders and let one session take another's record. Resume confidence is honest too: a record captured while another session of the same agent waited in the same folder is now marked weak rather than exact ([`a5c63aa`](https://github.com/gregce/tortie/commit/a5c63aa))

## 0.20.2 (2026-08-15)

Every quit of the packaged app had been ending in a crash inside the file watcher. The app looked like it closed normally while macOS filed a crash report each time. That is fixed. Removing a session no longer destroys it either: removed sessions move to a searchable list you can restore from for 90 days.

If you are running 0.19.0 or later, Tortie delivers this update itself. The Tortie menu offers it within a few hours, or immediately through Check for Updates.

### Added

- Past Sessions, at the bottom of the Session menu. A searchable list of every session you removed, newest first, each row saying before you click whether Restore continues the conversation or starts fresh. Removed sessions are kept for 90 days ([`d08ab00`](https://github.com/gregce/tortie/commit/d08ab00))
- A dialog that tells you an update is ready and installs when you quit, shown after a check you started ([`aa4e456`](https://github.com/gregce/tortie/commit/aa4e456))
- An updater log in packaged builds, and a line on the next launch when an install was refused, naming the reason ([`a63ec76`](https://github.com/gregce/tortie/commit/a63ec76))

### Changed

- New File and New Folder open a name box in the tree instead of creating an untitled row. Nothing is written to disk until you commit a valid name ([`7c0ae02`](https://github.com/gregce/tortie/commit/7c0ae02))
- Removing a skill removes it through the skills CLI and lists every path that will leave the disk before you confirm ([`f33599b`](https://github.com/gregce/tortie/commit/f33599b))

### Fixed

- Quitting is a real quit. The app waits for its file watchers before teardown, and 5 of 5 measured quits under load ended with no crash report ([`3c09245`](https://github.com/gregce/tortie/commit/3c09245), [`3d1d70c`](https://github.com/gregce/tortie/commit/3d1d70c))
- Split groups keep their arrangement, including which pane had focus, when you close a project and reopen it, and across a full restart ([`2cbd873`](https://github.com/gregce/tortie/commit/2cbd873))
- An antigravity session can no longer claim another session's conversation. Ownership is proven by the process holding the conversation open, and a wrong claim is taken back ([`ecdfcad`](https://github.com/gregce/tortie/commit/ecdfcad))

## 0.19.1 (2026-08-14)

The first release Tortie delivered to installed copies by itself.

### Fixed

- The About panel credits gregce with the repository address, instead of reading SpecStory ([`dbbaea1`](https://github.com/gregce/tortie/commit/dbbaea1))

## 0.19.0 (2026-08-14)

Tortie updates itself from this version on. It checks 30 seconds after launch and then every 6 hours, and when an update is ready a single menu item appears reading "Update to X.Y.Z, installs when you quit". There is no popup and no badge. The install happens when you quit, and your sessions keep running through the swap because they live outside the app.

A copy of 0.18.0 cannot update itself, since the updater arrived after it shipped. Installing this version by hand is the last time that is necessary.

### Added

- Self update through the GitHub releases feed, with install on quit, a Check for Updates item under About Tortie, a halt script for pulling a bad version from the feed, and a check on first launch after an update that the bundled files all resolve, with one quiet notice if any is missing ([`b96b519`](https://github.com/gregce/tortie/commit/b96b519))

### Fixed

- A terminal pane that lost its fast renderer when the laptop lid closed now recovers on the next wake, instead of staying on the slower path until the pane was restarted. Every helper process death now writes a log line carrying the reason and the decoded exit code ([`e9a8731`](https://github.com/gregce/tortie/commit/e9a8731))

## 0.18.0 (2026-08-14)

The first release you can download and install. Tortie is a macOS home for coding agents: your projects open as tabs in one window, you start Claude Code, Codex, Cursor or any of twelve supported agents with a keystroke, and the work keeps running whether the window is open or not. Quit the app, reboot the Mac, come back tomorrow, and your sessions are still there with their scrollback and a resume command ready for the agent's own conversation.

The build is signed with a Developer ID and notarized, so it opens without the right-click ritual an unsigned app needs. If you ran an earlier build, macOS asks once more for each permission you had granted, because the app's identity changed to `com.itavero.tortie` and macOS ties permissions to identity. Your data and your sessions are not touched.

Two limits worth knowing. This build does not update itself, so an update is a download and a drag until 0.19.0. And once it has opened your session data, older builds refuse to open it, which is deliberate and one way only.

### Added

- Signed and notarized builds under the Itavero identity, with four CI lanes and a release pipeline ([`47eb4f9`](https://github.com/gregce/tortie/commit/47eb4f9))
- Restore an ended session, with its scrollback replayed and the agent's resume command armed and waiting for your Enter ([`68620b8`](https://github.com/gregce/tortie/commit/68620b8))
- The Context view: every skill, MCP server, hook, plugin and instruction file on your machine, listed per agent, with skill installs from GitHub ([`ec219a3`](https://github.com/gregce/tortie/commit/ec219a3))
- Add an agent Tortie has never heard of with one JSON file. Nothing in that file runs as code, and anything that could start a process asks you first ([`89a5a9a`](https://github.com/gregce/tortie/commit/89a5a9a))
- A home screen listing recent projects, and repository cloning with per phase progress ([`7b42536`](https://github.com/gregce/tortie/commit/7b42536))
- HTML preview beside markdown, with untrusted pages held in a frame that can do nothing ([`ffd623b`](https://github.com/gregce/tortie/commit/ffd623b))
- A verified backup ring for the session list, refreshed at launch, on sleep, on quit and as things change, with a menu item to rebuild the list from it ([`8bb473e`](https://github.com/gregce/tortie/commit/8bb473e))
- Durable writes and a fault harness that kills the app at 16 chosen points and proves what survives, now a permanent gate ([`3be5d0e`](https://github.com/gregce/tortie/commit/3be5d0e))
- Zoom for the search pane, through the shared view region model ([`d6d0fc8`](https://github.com/gregce/tortie/commit/d6d0fc8))
- SpecStory capture, sync and cloud status per session ([`e930530`](https://github.com/gregce/tortie/commit/e930530))

### Changed

- The window is one geometry model, so an open file can no longer crush the session tab strip ([`bfa67d7`](https://github.com/gregce/tortie/commit/bfa67d7))
- The app is named Tortie, and its data directory migrates by copy and verify, leaving the original in place ([`09cb853`](https://github.com/gregce/tortie/commit/09cb853), [`53fa1e4`](https://github.com/gregce/tortie/commit/53fa1e4))

### Fixed

- Restore reads the manifest row rather than the live registry, so a later registry change cannot lose a recorded conversation ([`a00f798`](https://github.com/gregce/tortie/commit/a00f798))
- The DeepSeek CLI renamed itself to codewhale, and both names are detected ([`041b664`](https://github.com/gregce/tortie/commit/041b664))
- Four Context sidebar defects from the first morning of real use, including a git error that could not be dismissed ([`5bdf81b`](https://github.com/gregce/tortie/commit/5bdf81b), [`d8e2ebf`](https://github.com/gregce/tortie/commit/d8e2ebf))
- Reconcile no longer flips live sessions to restorable, and the manifest tolerates a busy database ([`cda2b1a`](https://github.com/gregce/tortie/commit/cda2b1a), [`bfc3c85`](https://github.com/gregce/tortie/commit/bfc3c85))

## 0.0.1

Everything before the first tagged release. Never published. The record is docs/BACKLOG.md and the git history.
