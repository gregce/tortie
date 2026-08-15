# Changelog

Each release lists its changes under Added, Changed and Fixed, and every item links
to a representative commit. Prose appears above those sections only when something
needs explaining. Versions follow semver: the minor moves for features, the patch
for fixes.

## 0.24.2 (2026-08-15)

Eight changes, and the one that matters most is invisible: the reason an update
failed yesterday is closed. Tortie was checking for updates again after it had
already handed one to the installer, and every check re-staged the download,
deleting the copy the pending install was waiting on. It now stops checking once
an install is prepared, explains itself when one fails, and offers a Repair
Updates item that clears a wreck in one click.

The rest is what you asked for while using it: your right click keeps your
selection, ignored files look ignored, and you can watch a CI run or open a file
in another app without leaving the window.

### Added

- A Runs section in the Source Control view, for repos with a github.com origin. It lists the latest 10 runs for your branch and expands to jobs and steps. A push starts a bounded watch that follows your commit's run until it finishes. It reads and never writes, and nothing about a run appears outside the panel ([`1eeddea`](https://github.com/gregce/tortie/commit/1eeddea))
- Open With on every file row, listing the apps macOS registers for that file with the default marked, plus Other for the system chooser. Files open by spawning the system open command ([`9a69e89`](https://github.com/gregce/tortie/commit/9a69e89))
- One structured log file per profile at `<userData>/logs/app.log`, capped at 2 MiB with one backup, with your home directory replaced by a tilde before anything is written. Crash dumps stay on your machine, and the build fails if any code ever tries to upload one ([`774132a`](https://github.com/gregce/tortie/commit/774132a))
- A Diagnostics section in Settings with a debug switch, Open logs folder, and Copy diagnostics, which copies the boot details, the log tail and a crash dump inventory by name, size and date ([`774132a`](https://github.com/gregce/tortie/commit/774132a))
- Environment passthrough for agents. Name variables in an `agents.json` row and Tortie reads them from your login shell at each launch and restore. Values are never written to any file ([`67ce3e3`](https://github.com/gregce/tortie/commit/67ce3e3))
- A row spacing menu in the Explorer header, and a compact gutter toggle in History that starts commit text beside its own lanes ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))

### Changed

- Ignored files and folders are drawn grey in the file tree, using git itself so negation patterns are honored. Grey means ignored, not disabled ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))
- Filtering the tree and clicking a result no longer clears the filter. Only the clear button, the filter toggle, Escape or starting a rename clears it ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))
- In a group of two or more sessions, the focused pane carries one soft box and the others fade slightly. Headers never fade, so a session asking for input keeps a full brightness dot ([`08b4757`](https://github.com/gregce/tortie/commit/08b4757))

### Fixed

- Right clicking a selection in a session no longer throws it away, which had made Copy as HTML unreachable. The cause was an xterm option that selects a word on right click, on by default on macOS ([`08b4757`](https://github.com/gregce/tortie/commit/08b4757))
- An update that fails now says why, and a wrecked updater can be repaired in one click instead of silently refusing every future update ([`cb07b37`](https://github.com/gregce/tortie/commit/cb07b37))
- Two sessions of one agent started in the same folder no longer fight over one conversation record, and a record claimed on weak evidence can be taken back by a session that can prove ownership. A folder reached by two spellings, such as `/tmp` and `/private/tmp`, counted as two folders and let one session take another's record ([`a5c63aa`](https://github.com/gregce/tortie/commit/a5c63aa))
- Resume confidence is honest. A record captured while another session of the same agent waited in the same folder is now marked weak rather than exact ([`a5c63aa`](https://github.com/gregce/tortie/commit/a5c63aa))

## 0.20.2 (2026-08-15)

Every quit of the packaged app had been ending in a crash inside the file watcher.
The app looked like it closed normally while macOS filed a crash report each time.
That is fixed. Removing a session no longer destroys it either: removed sessions
move to a searchable list you can restore from for 90 days.

If you are running 0.19.0 or later, Tortie delivers this update itself. The Tortie
menu offers it within a few hours, or immediately through Check for Updates.

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

Tortie updates itself from this version on. It checks 30 seconds after launch and
then every 6 hours, and when an update is ready a single menu item appears reading
"Update to X.Y.Z, installs when you quit". There is no popup and no badge. The
install happens when you quit, and your sessions keep running through the swap
because they live outside the app.

A copy of 0.18.0 cannot update itself, since the updater arrived after it shipped.
Installing this version by hand is the last time that is necessary.

### Added

- Self update through the GitHub releases feed, with install on quit, a Check for Updates item under About Tortie, and a halt script for pulling a bad version from the feed ([`b96b519`](https://github.com/gregce/tortie/commit/b96b519))
- A check on first launch after an update that the bundled files all resolve, with one quiet notice if any is missing ([`b96b519`](https://github.com/gregce/tortie/commit/b96b519))
- A log line whenever a helper process dies, carrying the reason and the decoded exit code ([`e9a8731`](https://github.com/gregce/tortie/commit/e9a8731))

### Fixed

- A terminal pane that lost its fast renderer when the laptop lid closed now recovers on the next wake, instead of staying on the slower path until the pane was restarted ([`e9a8731`](https://github.com/gregce/tortie/commit/e9a8731))

## 0.18.0 (2026-08-14)

The first release you can download and install. Tortie is a macOS home for coding
agents: your projects open as tabs in one window, you start Claude Code, Codex,
Cursor or any of twelve supported agents with a keystroke, and the work keeps
running whether the window is open or not. Quit the app, reboot the Mac, come back
tomorrow, and your sessions are still there with their scrollback and a resume
command ready for the agent's own conversation.

The build is signed with a Developer ID and notarized, so it opens without the
right-click ritual an unsigned app needs. If you ran an earlier build, macOS asks
once more for each permission you had granted, because the app's identity changed
to `com.itavero.tortie` and macOS ties permissions to identity. Your data and your
sessions are not touched.

Two limits worth knowing. This build does not update itself, so an update is a
download and a drag until 0.19.0. And once it has opened your session data, older
builds refuse to open it, which is deliberate and one way only.

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

Everything before the first tagged release. Never published. The record is
docs/BACKLOG.md and the git history.
