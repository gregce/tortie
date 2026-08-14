# Changelog

Release notes, written by hand for the person installing the app. Each entry
says what you can now do that you could not before, and what is still not
true. The build story itself lives in the git history and in docs/BACKLOG.md.
This file does not restate it.

## 0.19.1 (2026-08-14)

A small one, and the first release Tortie delivers to you by itself. If you
are running 0.19.0, this update announces itself in the Tortie menu and
installs when you quit. Your sessions keep running the whole time.

- The About panel now credits gregce, with the repository address, instead
  of reading SpecStory.

## 0.19.0 (2026-08-14)

This is the last release you install by hand.

### Tortie now updates itself

From this version on, Tortie checks for updates on its own, 30 seconds
after launch and then every 6 hours. When one is ready, a single menu item
appears under the Tortie menu reading "Update to X.Y.Z, installs when you
quit". No popup, no badge. The update installs when you quit, and your
sessions keep running through the swap, because they live outside the app.
You can also check any time with "Check for Updates" under About Tortie.

A few honest details:

- A copy of 0.18.0 cannot update itself, because the updater arrived after
  it shipped. Install this version by hand, and it is the last time.
- A corrupted or tampered download is refused and nothing changes.
- After an update, Tortie checks its own bundled files on first launch and
  tells you once if anything is missing.

### Better behavior around sleep and wake

Closing the laptop lid could leave a terminal pane drawing on a slower
path until you restarted the pane. Now every wake retries the fast
renderer, and the pane recovers on its own. Tortie also writes one log
line whenever a helper process dies, with the reason and the decoded exit
code, so a rare crash leaves a record instead of a mystery.

## 0.18.0 (2026-08-13)

Welcome to Tortie. This is the first release you can download and install.

Tortie is a calm home for your coding agents on macOS. You open your
projects as tabs in one window, start Claude Code, Codex, Cursor or any of
twelve supported agents with a keystroke, and the work keeps running whether
the window is open or not. Quit the app, reboot the Mac, come back tomorrow.
Your sessions are still there, with their scrollback, ready to continue the
conversation where it stopped.

### Signed and notarized, so it just opens

Tortie is signed with a Developer ID and notarized by Apple. Download it,
drag it to Applications, and it opens. No warning dialogs, no right-click
ritual.

If you already run Tortie from an earlier build, macOS will ask again for
each permission you had granted, one time. That is because the app's
identity changed in this release, to `com.itavero.tortie`, and macOS ties
permissions to identity. Your data and your sessions are not touched, and
this identity is the final one, so this is the last time.

### What you can do

- **Keep your sessions forever.** End a session and bring it back later,
  scrollback and all, with the agent's resume command typed and waiting for
  your Enter.
- **See what your agents actually load.** The Context view lists every
  skill, MCP server, hook, plugin and instruction file on your machine, per
  agent, and can install a skill from GitHub.
- **Add your own agent.** A new CLI Tortie has never heard of takes one
  JSON file, no rebuild. Nothing in that file can run code, and anything
  that could start a process asks you first.
- **Start fast.** A home screen lists your recent projects, and you can
  clone a repository from the File menu with a real progress bar.
- **Preview files.** Markdown and HTML render inside the app, with
  untrusted pages locked in a frame that can do nothing.

### What protects your work

Most of this release is invisible. It is the part that makes the durability
promise true rather than hopeful.

- Your session list keeps five verified backup copies beside it, refreshed
  at launch, on sleep, on quit and every few minutes while things change.
  A menu item can rebuild the list from those copies if the worst happens.
- A full disk or a power cut during a save can no longer replace a good
  copy with a bad one. Every important write is verified before it counts.
- The app was killed on purpose at 16 of its worst possible moments, in an
  automated harness, and everything came back every time. That harness now
  runs as a permanent gate on every change.
- Restore tells the truth. A session that did not come back says so,
  instead of pretending.

### Honest notes

- This build does not update itself yet. The updater is written and tested
  and arrives in the next release. Until then, an update is a download and
  a drag.
- The backups live on the same disk as the original. An off-machine copy is
  a planned, separate feature.
- Once this build has opened your session data, older builds refuse to open
  it. That is deliberate, and your sessions keep running either way.

### Install

macOS on Apple silicon. Download the DMG, open it, drag Tortie to
Applications, and point it at a project folder.

## 0.0.1

Everything before the first tagged release, Phases 1 through 17. Never
published anywhere. The record is docs/BACKLOG.md and the git history.
