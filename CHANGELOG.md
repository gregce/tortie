# Changelog

Each commit appears once under Added, Changed or Fixed. Every bullet stays on one line so it renders cleanly on GitHub. Versions follow semantic versioning, and release pages use these entries verbatim.

The operator set the style on 2026-08-23 by rewriting every entry, and it binds every entry after. An item is one or two sentences. It says what a person can now do or what no longer goes wrong, in plain words, and then stops. A limit that a person will hit goes in the same item in one clause, e.g. "Saves have no undo", and a limit nobody will hit stays in the commit body. No measured numbers unless the number is the point. No build story, no file names, no gate names. The lead paragraph says what the release is about in two or three sentences and lists nothing.

## 0.68.7 (2026-08-23)

This release adds a guarded workflow for editing and committing projects on remote machines, from file changes through staging and commit. It also improves navigation and setup screens, and strengthens internal architecture checks. Remote write operations have only been verified on macOS.

### Added

- You can edit, save and create remote files within a confirmed folder. Saves reject stale content, have no undo, discard hard links and extended attributes, and may be uncertain after a disconnect ([`1bff045`](https://github.com/gregce/tortie/commit/1bff045))
- You can create folders and rename files or folders inside the confirmed write root; open tabs follow remote renames. A concurrent process can still create the destination between the availability check and rename, allowing the rename to replace it ([`d0fedbc`](https://github.com/gregce/tortie/commit/d0fedbc))
- You can stage and unstage individual or grouped remote changes from the Changes panel, which refreshes after every action ([`2e87e16`](https://github.com/gregce/tortie/commit/2e87e16))
- You can commit staged remote changes from the Changes panel; remote hooks and signing run there. Tortie prevents stale or duplicate commits, but cannot enter signing passphrases, and timed-out commits may still finish ([`e03af86`](https://github.com/gregce/tortie/commit/e03af86))
- Settings now separates agents by machine, session lists support arrow-key navigation, project tabs can collapse or move to a left rail, and Shift+Command+Return focuses the active file or session ([`33b0925`](https://github.com/gregce/tortie/commit/33b0925))

### Changed

- Split large renderer and file-tree controllers into smaller modules, and removed test harness code from normal launches. Build checks now enforce bundle and import boundaries ([`a60dc8e`](https://github.com/gregce/tortie/commit/a60dc8e))
- Split machine IPC contracts by domain and extracted session services without changing public contracts. Local and remote GitHub Actions now share one parser ([`82c4eff`](https://github.com/gregce/tortie/commit/82c4eff))

### Fixed

- Showing an unavailable agent's install command no longer shifts the onboarding layout, including with long commands or short windows ([`bfb4e29`](https://github.com/gregce/tortie/commit/bfb4e29))
- Removed production runtime import cycles and added a graph check to stop them returning ([`8ce91a0`](https://github.com/gregce/tortie/commit/8ce91a0))
- Machine settings now show readiness first and keep consent details visible. Low-level settings and the agreement fingerprint moved under 'More about this machine' ([`625bdb9`](https://github.com/gregce/tortie/commit/625bdb9))
- Fixed stylesheet order in the skill install panel so its layout rules apply, the agent list stays whole and the facts and plan section gets more space ([`d828913`](https://github.com/gregce/tortie/commit/d828913))
- Moved project rail controls to the start and kept New project available in every rail state. Sidebar controls now use its header, recovering 48px when projects are on the left ([`272a114`](https://github.com/gregce/tortie/commit/272a114))
- Added complete copyright and icon attribution to About and NOTICE, and standardised the company name as Ita Vero, LLC ([`b04ffae`](https://github.com/gregce/tortie/commit/b04ffae))
- New and restored agents now inherit the app's current macOS login session instead of the long-lived server's stale session. Existing sessions keep their original value and need a restart, which does not resume the conversation ([`a43a589`](https://github.com/gregce/tortie/commit/a43a589))
- Restructured skill search, preview and confirmation sheets so actions stay visible while long content scrolls separately. The wider sheets show more of long commands ([`f3c140f`](https://github.com/gregce/tortie/commit/f3c140f))
- Made unavailable-agent install commands wrap and copyable, and improved Add machine spacing. Connection and key setup guidance is shorter without losing consent details ([`d2be957`](https://github.com/gregce/tortie/commit/d2be957))
- Made installed preload bridge members required at compile time and removed compensating casts, while keeping runtime guards and genuinely uninstalled APIs optional ([`9b99ab4`](https://github.com/gregce/tortie/commit/9b99ab4))
- Corrected Material Icon Theme attribution to Material Extensions in source comments, generator output and design docs; no icon assets or matching rules changed ([`354c03c`](https://github.com/gregce/tortie/commit/354c03c))

## 0.62.1 (2026-08-21)

This release makes remote work safer and more accurate. Tortie now preserves unconfirmed sessions and interrupted copies, reads agent availability from the target machine, and fixes Quick Open paths, workflow runs and TypeScript process boundaries.

### Added

- Settings then Agents now shows each machine's detected agents, reported paths and scan age, with a per-machine Rescan action that preserves existing results on failure ([`3d60a08`](https://github.com/gregce/tortie/commit/3d60a08))

### Fixed

- The create sheet now checks agent availability on the target machine in one batched scan and disables only agents confirmed absent. Discovery also ignores executable directories and treats failed machine-facts reads as unknown ([`d646830`](https://github.com/gregce/tortie/commit/d646830))
- Quick Open now handles project and recent-file paths containing spaces by passing the project root and relative path as separate fields ([`3d883ab`](https://github.com/gregce/tortie/commit/3d883ab))
- SpecStory-captured sessions can now be restored or restarted without history capture, and the choice persists for future restores ([`3f08719`](https://github.com/gregce/tortie/commit/3f08719))
- Runs now includes workflows triggered by a tag at the current branch tip, including queued and in-progress runs ([`89226a0`](https://github.com/gregce/tortie/commit/89226a0))
- TypeScript now compiles tests in a separate project, allowing production checks to reject renderer-to-main imports and Node or Electron APIs in shared and renderer code ([`43b12fd`](https://github.com/gregce/tortie/commit/43b12fd))
- Tortie now keeps and marks a remote session unreachable when startup confirmation cannot reach the machine. It reconciles the record when the connection returns instead of launching a duplicate ([`682c870`](https://github.com/gregce/tortie/commit/682c870))
- Quitting Tortie now closes tracked remote SSH work and records interrupted project copies for the next launch, though remote processes may continue. Machine removal is now transactional, so a failure leaves session records and machine configuration unchanged ([`2ad8fcb`](https://github.com/gregce/tortie/commit/2ad8fcb))

## 0.58.3 (2026-08-20)

This release makes another Mac a Tortie workspace. You can run and restore sessions there, then browse, search and review its projects without leaving the app.

Remote project tabs remain read only, and remote SpecStory capture is not supported.

### Added

- Add, test and confirm remote machines in Settings without changing your SSH known-hosts file ([`d8b5e1f`](https://github.com/gregce/tortie/commit/d8b5e1f))
- Prepare a remote machine by starting its tmux server with Tortie's required settings and checking its version ([`4c86bea`](https://github.com/gregce/tortie/commit/4c86bea))
- Create, open, rename and end sessions on another Mac, with clear machine badges and connection states ([`17f1dea`](https://github.com/gregce/tortie/commit/17f1dea))
- Choose System, JetBrains Mono or Source Code Pro for terminals, editors, diffs, Markdown code and exported screenshots ([`7b429d5`](https://github.com/gregce/tortie/commit/7b429d5))
- Restore stopped remote sessions only when the machine is reachable, with timestamped saved output and duplicate-work protection. Remote conversations are not restored ([`1741a01`](https://github.com/gregce/tortie/commit/1741a01))
- Focus the current session with Shift+Command+Return while preserving its split layout and running state ([`8713547`](https://github.com/gregce/tortie/commit/8713547))
- Install a dedicated passwordless SSH key for a machine through a confirmed setup flow. Tortie does not store the password or change your existing SSH keys ([`dbbed64`](https://github.com/gregce/tortie/commit/dbbed64))
- Upload images to remote sessions, review remote changes in diffs and show when saved agent output was last copied. Remote image uploads are limited to 90 KB ([`ecd1b67`](https://github.com/gregce/tortie/commit/ecd1b67))
- Allow an exact unmeasured remote tmux version after confirmation, and stop connection attempts after 10 seconds ([`069ef77`](https://github.com/gregce/tortie/commit/069ef77))
- Choose remote working folders, launch agents by absolute path and preserve remote session output and removal state ([`5e8aa02`](https://github.com/gregce/tortie/commit/5e8aa02))
- Find a matching remote project by its Git address, or offer to clone it after confirmation ([`e61e836`](https://github.com/gregce/tortie/commit/e61e836))
- Prefill supported remote conversation resume commands without pressing Enter for you ([`3cf14ad`](https://github.com/gregce/tortie/commit/3cf14ad))
- Open a remote folder as a read-only project tab with its Explorer, changed files and file diffs ([`9d247ab`](https://github.com/gregce/tortie/commit/9d247ab))
- Open remote folders from the home screen and keep their machine identity in recent projects ([`8596b77`](https://github.com/gregce/tortie/commit/8596b77))
- Show untracked remote files in their own Changes group and include them in the Source Control count ([`2ca5310`](https://github.com/gregce/tortie/commit/2ca5310))
- Search remote project files on the remote machine without copying them locally ([`1f98e2b`](https://github.com/gregce/tortie/commit/1f98e2b))
- Find and open remote files through Quick Open, with recent files tracked per machine ([`2e3eb86`](https://github.com/gregce/tortie/commit/2e3eb86))
- Read a one-time snapshot of the remote screen or its last 1,000, 10,000 or 25,000 lines, with clear truncation notices ([`ce56d1f`](https://github.com/gregce/tortie/commit/ce56d1f))
- Show up to 10 GitHub Actions runs for the remote branch, using your local GitHub sign-in ([`16d4d2c`](https://github.com/gregce/tortie/commit/16d4d2c))
- Show the remote branch, commit, upstream and ahead or behind counts without changing or fetching the repository ([`02aed16`](https://github.com/gregce/tortie/commit/02aed16))
- Browse remote commit history in pages of 50, including lanes, authors, subjects, branches and tags ([`99c19b8`](https://github.com/gregce/tortie/commit/99c19b8))

### Changed

- Remote machines now push session changes instead of relying on polling, while unmeasured tmux versions retain the polling fallback ([`e9351e8`](https://github.com/gregce/tortie/commit/e9351e8))
- Simplified machine setup, added clearer recovery guidance and improved Tailscale device discovery ([`3e1ba07`](https://github.com/gregce/tortie/commit/3e1ba07))
- Load saved sessions and project tabs before the login shell finishes, while keeping Restore disabled until the shell is ready ([`2f0e841`](https://github.com/gregce/tortie/commit/2f0e841))
- Shortened session and machine setup copy, restored compact spacing and moved Diagnostics to the end of Settings ([`efafb86`](https://github.com/gregce/tortie/commit/efafb86))

### Fixed

- Refuse new state-changing requests during shutdown and finish accepted work before saving the final snapshot ([`60bf5ac`](https://github.com/gregce/tortie/commit/60bf5ac))
- Warn when a remote Quick Open result list was cut off at its size limit ([`caa07d3`](https://github.com/gregce/tortie/commit/caa07d3))
- Isolate test servers and folders so concurrent harness runs cannot affect each other or their cleanup ([`abc32fa`](https://github.com/gregce/tortie/commit/abc32fa))
- Sign bundled SpecStory with its required entitlement and update it to 2.10.0 for current Codex and Muse Code capture ([`f97d69b`](https://github.com/gregce/tortie/commit/f97d69b))
- Separate run age from duration, add hover details and remove repeated job names from single-job runs ([`d1ce49f`](https://github.com/gregce/tortie/commit/d1ce49f))
- Mark remote sessions as unreachable during connection loss instead of offering Restore and risking duplicate agents ([`95aa770`](https://github.com/gregce/tortie/commit/95aa770))
- Remove the duplicate full-screen menu item, show home-screen update status and focus the last file opened from Finder ([`a3dcb53`](https://github.com/gregce/tortie/commit/a3dcb53))
- Restore the weekly package check without allowing it to publish a release ([`ab94847`](https://github.com/gregce/tortie/commit/ab94847))
- Start shell sessions as login shells, preserve restore arguments and clarify New Project and SpecStory setup messages ([`2867223`](https://github.com/gregce/tortie/commit/2867223))
- Save session state before sleep and prevent a second shutdown from starting before the first finishes ([`d47ecd7`](https://github.com/gregce/tortie/commit/d47ecd7))
- Remove extra characters from connection-test paths and label the fallback Runs button as Copy ([`9fbe8ed`](https://github.com/gregce/tortie/commit/9fbe8ed))
- Make split dragging reliable, add shortcuts search and improve keyboard control and option summaries in session creation ([`f6cd1ad`](https://github.com/gregce/tortie/commit/f6cd1ad))
- Keep Explorer, Git decorations, Search and Context tied to the machine that owns the active tab ([`f6e4e32`](https://github.com/gregce/tortie/commit/f6e4e32))
- Enable Restore even when projects or sessions fail to load at launch ([`e5d2034`](https://github.com/gregce/tortie/commit/e5d2034))
- Keep the Capture control visible but disabled for remote agent sessions, with an explanation ([`13dbec1`](https://github.com/gregce/tortie/commit/13dbec1))
- Make remote activity indicators follow actual session output instead of stale connection state ([`5e4e217`](https://github.com/gregce/tortie/commit/5e4e217))
- Retry fault-test races so all 16 session recovery cases run every night ([`32d901d`](https://github.com/gregce/tortie/commit/32d901d))
- Start sessions from remote tabs on the tab's machine and folder, including agent hotkeys ([`eb61ffd`](https://github.com/gregce/tortie/commit/eb61ffd))
- Reopen a closed project from the attention list, show each session's folder and add confirmed keyboard session ending ([`9f89497`](https://github.com/gregce/tortie/commit/9f89497))
- Enforce read-only remote files, disable unsafe remote session actions and reduce abandoned image uploads ([`1e3b062`](https://github.com/gregce/tortie/commit/1e3b062))
- Stop scroll polling when a session has no local pane and show that remote scrollback is unavailable ([`1fc2c5f`](https://github.com/gregce/tortie/commit/1fc2c5f))
- Fix the quit-snapshot test race and log counts for every snapshot outcome ([`6487c4f`](https://github.com/gregce/tortie/commit/6487c4f))
- Give every smoke-test run its own tmux socket and profile, including safe cleanup of abandoned servers ([`859a4a0`](https://github.com/gregce/tortie/commit/859a4a0))

## 0.31.0 (2026-08-16)

This release improves how Tortie integrates with macOS and installed agents. Finder and the new `tortie` command can open projects, Settings shows exactly which agent binaries Tortie uses, and new appearance controls let you adjust highlights and contrast. Updating does not affect running sessions.

### Added

- Settings now shows every detected copy of each agent, its version and why Tortie chose one over the others. Missing agents show an official, copyable install command, and sessions always launch the recorded binary ([`bf6e9e2`](https://github.com/gregce/tortie/commit/bf6e9e2))
- Run `tortie .` to open the current folder as a project, starting Tortie if needed. Settings can install or remove this command, which accepts a folder but no agent-launching flags ([`051558e`](https://github.com/gregce/tortie/commit/051558e))
- Grok is now a supported agent with conversation resume by session ID. Tortie suppresses Grok's blocking first-run banner without changing your data-sharing choice, and the documentation now covers all 13 agent trademarks ([`b8c59f4`](https://github.com/gregce/tortie/commit/b8c59f4))
- Finder can open folders, supported text and source files, HTML, Markdown and images in Tortie without making it the default app. Files open inside their nearest Git repository or parent folder ([`6982ae4`](https://github.com/gregce/tortie/commit/6982ae4))
- Settings now offers 4 highlight schemes and 3 contrast levels. The default blue and normal-contrast combination preserves the previous appearance ([`c8508ec`](https://github.com/gregce/tortie/commit/c8508ec))

## 0.26.1 (2026-08-16)

This release bundles tmux, replaces update dialogs with a quiet status control and improves several session interactions. The bundled tmux takes effect only when a new server starts, so updating does not interrupt running sessions.

### Added

- Tortie now includes a signed tmux 3.7b, so new installations need no separate tmux setup. It adopts the bundled version only for new servers and refuses untested client-server version combinations ([`2c225e4`](https://github.com/gregce/tortie/commit/2c225e4))
- A status ring above Settings now shows update progress and offers actions such as restart now, install on quit and repair. Background checks remain quiet, although the ring is unavailable on the home screen until an update is staged ([`9eb2b7f`](https://github.com/gregce/tortie/commit/9eb2b7f))

### Fixed

- Collapsed session lists now support group drag and drop, restoring a session asks before opening its project, and the View menu shows all 4 views and shortcuts ([`cc60680`](https://github.com/gregce/tortie/commit/cc60680))
- Agent startup failures now identify missing interpreters or show the agent's final output instead of leaving a dead pane. Tortie also waits up to 10 seconds for slow login shells ([`2b4ee2f`](https://github.com/gregce/tortie/commit/2b4ee2f))
- Test and harness launches no longer access the macOS keychain or leave keychain prompts behind ([`0d92728`](https://github.com/gregce/tortie/commit/0d92728))

## 0.24.3 (2026-08-15)

This release stops ignored files from flashing during repository updates.

### Fixed

- The Explorer now keeps the last known ignored-file state while refreshing it, so ignored rows no longer flash white during writes. Changes to `.gitignore` can take up to 10 seconds to appear ([`3bbc3e6`](https://github.com/gregce/tortie/commit/3bbc3e6))

## 0.24.2 (2026-08-15)

This release makes updates recoverable and improves everyday repository work. You can inspect CI runs, open files in other apps and use a clearer Explorer without losing terminal selections or session ownership.

### Added

- Source Control now shows the latest 10 GitHub Actions runs for the current branch, including jobs and steps, and watches the run triggered by a push ([`1eeddea`](https://github.com/gregce/tortie/commit/1eeddea))
- File rows now include an Open With menu containing compatible macOS apps and the system chooser ([`9a69e89`](https://github.com/gregce/tortie/commit/9a69e89))
- Settings now provides debug logging and diagnostic tools. Logs rotate at 2 MiB, redact the home-directory path and never upload crash data ([`774132a`](https://github.com/gregce/tortie/commit/774132a))
- Agent definitions can pass named environment variables from your login shell without storing their values on disk ([`67ce3e3`](https://github.com/gregce/tortie/commit/67ce3e3))

### Fixed

- The Explorer now greys ignored files, keeps filters active after opening a result and offers row-spacing controls. History also gains a compact gutter option ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))
- Right-clicking terminal text now preserves the selection, making Copy as HTML usable. Split groups also make the focused pane clearer without dimming attention indicators ([`08b4757`](https://github.com/gregce/tortie/commit/08b4757))
- Failed updates now explain the cause, and Repair Updates can reset a broken updater in one step ([`cb07b37`](https://github.com/gregce/tortie/commit/cb07b37))
- Sessions in the same folder no longer claim each other's conversation records. Tortie now normalises equivalent paths, allows stronger ownership evidence to replace weaker claims and reports uncertain resumes honestly ([`a5c63aa`](https://github.com/gregce/tortie/commit/a5c63aa))

## 0.20.2 (2026-08-15)

This release stops crashes during quit and makes removed sessions recoverable for 90 days. It also improves update feedback and preserves split layouts across restarts.

### Added

- Past Sessions provides a searchable list of removed sessions for 90 days and shows whether each can resume its conversation ([`d08ab00`](https://github.com/gregce/tortie/commit/d08ab00))
- Manual update checks now show when an update is ready and confirm that it will install when you quit ([`aa4e456`](https://github.com/gregce/tortie/commit/aa4e456))
- Packaged builds now log updater activity and report why an installation was refused on the next launch ([`a63ec76`](https://github.com/gregce/tortie/commit/a63ec76))

### Changed

- New File and New Folder now ask for a valid name before writing anything to disk ([`7c0ae02`](https://github.com/gregce/tortie/commit/7c0ae02))
- Removing a skill now uses the skills CLI and shows every path that will be deleted before confirmation ([`f33599b`](https://github.com/gregce/tortie/commit/f33599b))

### Fixed

- Tortie now waits for file watchers to stop before quitting, preventing the crash reports previously created on every exit ([`3c09245`](https://github.com/gregce/tortie/commit/3c09245), [`3d1d70c`](https://github.com/gregce/tortie/commit/3d1d70c))
- Split groups now preserve their layout and focused pane when projects reopen or Tortie restarts ([`2cbd873`](https://github.com/gregce/tortie/commit/2cbd873))
- Antigravity sessions now prove conversation ownership from the process holding the conversation open and can reclaim incorrect assignments ([`ecdfcad`](https://github.com/gregce/tortie/commit/ecdfcad))

## 0.19.1 (2026-08-14)

This maintenance release corrects the application credit in Tortie's first self-delivered update.

### Fixed

- The About panel now credits gregce and links to the correct repository instead of naming SpecStory ([`dbbaea1`](https://github.com/gregce/tortie/commit/dbbaea1))

## 0.19.0 (2026-08-14)

This release adds quiet, automatic updates that install when you quit without interrupting sessions. Version 0.18.0 cannot update itself, so you must install 0.19.0 manually once.

### Added

- Tortie now checks GitHub Releases for updates, installs them on quit and verifies bundled files after updating. The About menu also adds Check for Updates, and maintainers can remove a bad release from the feed ([`b96b519`](https://github.com/gregce/tortie/commit/b96b519))

### Fixed

- Terminal panes now restore hardware-accelerated rendering after wake, and helper process exits include their cause and decoded exit code in the log ([`e9a8731`](https://github.com/gregce/tortie/commit/e9a8731))

## 0.18.0 (2026-08-14)

This is the first installable Tortie release: a signed and notarized macOS workspace for persistent coding-agent sessions. Projects open as tabs, sessions survive app quits and restarts, and ended conversations can resume with their scrollback.

Existing users must approve macOS permissions again because the app identity changed to `com.itavero.tortie`; data and sessions remain intact. This version does not update itself, and its session-data migration prevents older builds from reopening the data.

### Added

- Tortie now ships as a signed and notarized application under the Itavero identity, backed by a 4-lane CI and release pipeline ([`47eb4f9`](https://github.com/gregce/tortie/commit/47eb4f9))
- Ended sessions can now replay their scrollback and prepare the agent's resume command for confirmation ([`68620b8`](https://github.com/gregce/tortie/commit/68620b8))
- The Context view lists each agent's skills, MCP servers, hooks, plugins and instruction files, and can install skills from GitHub ([`ec219a3`](https://github.com/gregce/tortie/commit/ec219a3))
- Custom agents can now be defined in JSON. Configuration cannot run code directly, and process-launching changes require confirmation ([`89a5a9a`](https://github.com/gregce/tortie/commit/89a5a9a))
- The new home screen lists recent projects and can clone repositories with progress for each phase ([`7b42536`](https://github.com/gregce/tortie/commit/7b42536))
- Markdown files can now show a side-by-side HTML preview, with untrusted content isolated in a restricted frame ([`ffd623b`](https://github.com/gregce/tortie/commit/ffd623b))
- Tortie now keeps verified backups of the session list and can rebuild the list from them ([`8bb473e`](https://github.com/gregce/tortie/commit/8bb473e))
- Session data now uses durable writes, enforced by a fault test that terminates Tortie at 16 critical points ([`3be5d0e`](https://github.com/gregce/tortie/commit/3be5d0e))
- The Search pane now supports zoom through the shared view layout model ([`d6d0fc8`](https://github.com/gregce/tortie/commit/d6d0fc8))
- Each session now shows its SpecStory capture, sync and cloud status ([`e930530`](https://github.com/gregce/tortie/commit/e930530))

### Changed

- The window now uses one layout model, preventing open files from compressing the session tab strip ([`bfa67d7`](https://github.com/gregce/tortie/commit/bfa67d7))
- The app is now named Tortie, and its data migrates by copying and verifying while leaving the original intact ([`09cb853`](https://github.com/gregce/tortie/commit/09cb853), [`53fa1e4`](https://github.com/gregce/tortie/commit/53fa1e4))

### Fixed

- Restore now uses the agent details recorded with the session, so later registry changes cannot lose its conversation ([`a00f798`](https://github.com/gregce/tortie/commit/a00f798))
- Tortie now detects the renamed DeepSeek CLI as CodeWhale while retaining support for the old binary name ([`041b664`](https://github.com/gregce/tortie/commit/041b664))
- The Context view now opens global skills without Git errors, searches the skill registry, supports enabling skills for more agents and presents installation details more clearly ([`5bdf81b`](https://github.com/gregce/tortie/commit/5bdf81b), [`d8e2ebf`](https://github.com/gregce/tortie/commit/d8e2ebf))
- Session reconciliation no longer marks newly created live sessions as restorable, and shared SQLite settings now handle concurrent writers explicitly ([`cda2b1a`](https://github.com/gregce/tortie/commit/cda2b1a), [`bfc3c85`](https://github.com/gregce/tortie/commit/bfc3c85))

## 0.0.1

Unpublished work before the first tagged release. See `docs/BACKLOG.md` and the Git history.
