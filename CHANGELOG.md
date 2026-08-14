# Changelog

Release notes, written by hand for the person installing the app. Each entry
says what you can now do that you could not before, and what is still not
true. The build story itself lives in the git history and in docs/BACKLOG.md.
This file does not restate it.

## 0.18.0 (2026-08-13)

The first tagged release. The version jumps from 0.0.1 to 0.18.0 because the
minor number is seeded from the phase the release ships from, and this
repository thinks in phases. The rules for future bumps are in
docs/research/27-release-and-updates.md section 3.

### Tortie now ships under Itavero, signed and notarized

The bundle identifier changed from `com.specstory.tortie` to
`com.itavero.tortie`, because Tortie belongs to Itavero. The build is signed
with a Developer ID and notarized, which means Apple has checked the app and
recorded it, so another Mac opens it without the right-click ritual an
unsigned app needs.

What this means on a machine that already runs Tortie:

- Your data does not move. The data directory follows the app's name, which
  is unchanged, not the bundle identifier.
- Your sessions are not touched. They live in the private tmux server,
  outside the app.
- macOS asks again for each permission you had granted, once. macOS keys
  permission grants to the bundle identifier and to the signing identity, and
  both changed in this release. This is the last identity change, so it is
  the last such reset.
- If Tortie was set to open at login, it re-registers itself on first launch
  from your recorded preference and tells you if macOS refuses.

The SpecStory integration keeps its name everywhere. It is a separate product
that Tortie talks to.

### What you can now do

| You can now | Where | Phase |
| --- | --- | --- |
| Restore an ended session, with its scrollback replayed and the agent's resume command armed and unexecuted | the Restore button beside Restart on an ended session | 26.3 |
| See what your agents load and install a skill from GitHub. The Context view has five sections: skills, MCP servers, hooks, plugins and instructions | the Context view in the left rail | 22 |
| Add an agent Tortie never shipped, or repoint one it did, without a rebuild | `agents.json` in the configuration folder, opened from the Tortie menu | 23 |
| Start from a home screen that lists your recent projects | the window before a project is open | 18.6 |
| Clone a repository, with one progress bar per git phase | the File menu | 18.6 |
| Preview an HTML file inside the app | the Preview, Source and Split control on an `.html` tab | 20.5 |
| Rebuild the session list from backups if the session database is ever lost | the menu item "Rebuild the Session List…" | 20 |

### What protects your work now

These changes are invisible until something goes wrong, and they are most of
what this release contains.

- The session database, the one file whose loss strands every session, now
  keeps a ring of five verified backup copies beside it. A copy is taken at
  launch, on sleep, on quit, before a migration, and otherwise at most every
  5 minutes when the content changed.
- A full disk or a power cut during a save can no longer replace a good
  snapshot with an empty one. Every durable write is checked for size and
  content before it is published, and a capture that did not happen is
  reported instead of silently skipped.
- Restore reports what actually happened. A session that did not come back
  says so. It never claims to be running when it is not.
- Each session row records how its agent resumes a conversation, so a later
  change to the agent registry cannot make restore guess and lose a
  conversation that had a recorded answer.
- A fault harness kills the app at 16 chosen points, relaunches it and proves
  what survived. It runs as a gate, not as a one-time experiment.
- The session database now carries its own compatibility numbers. An older
  Tortie that opens a newer database refuses, on a screen that says why,
  instead of quietly writing rows the newer build cannot restore. The refusal
  costs visibility and not work, because the sessions keep running in the
  private tmux server either way.

### Fixes

| Fix | Phase |
| --- | --- |
| The window's three resizable regions respect each other. An open file can no longer crush the session tab strip | 18 |
| Zoom reaches the search view, and every sidebar view added later is zoomable on the day it ships | 18.55 |
| The DeepSeek CLI renamed itself to codewhale. Both names are detected now, so a fresh machine finds it | 25.5 |
| Four Context sidebar defects from the first morning of real use, including a raw git error that could not be dismissed | 26 to 26.2 |

### What is still not true

- Tortie does not update itself. An update is a download and a drag to
  Applications. The updater is the next phase.
- The backup ring lives on the same disk as the database it protects. A
  failed drive takes both. A copy kept away from this machine is a later,
  separate item.
- Once this build has opened your session database, a Tortie older than
  0.18.0 refuses to open it. That is deliberate and it only goes one way.

## 0.0.1

Everything before the first tagged release, Phases 1 through 17. Never
published anywhere. The record is docs/BACKLOG.md and the git history.
