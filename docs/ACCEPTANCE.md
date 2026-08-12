# Tortie — acceptance script

This is the check **you** run, from your own seat, to satisfy yourself that
Tortie's promise holds. No agent can run it for you: most of it is about what
survives when the app is gone, and the only convincing version of that test is
the one where you personally close the app and personally come back.

It takes about 20 minutes end to end, plus one reboot. You can do §1–§3 now and
save the reboot for whenever you were going to restart anyway.

**Before you start**

- You are running `/Applications/Tortie.app`.
- **⌘I → About Tortie** shows `Version 0.0.1 (<sha>)`. That short SHA is the
  git commit this build came from. If it ends in `-dirty`, the build was made
  from an edited working tree and does not match any commit exactly.
- Note roughly how many sessions you have in the sidebar. You will compare
  against this number twice.

A note on honesty: two steps below are marked **best-effort**. They are things
Tortie genuinely cannot promise, and the script says so rather than quietly
skipping them. If a best-effort step disappoints you, that is expected
behaviour, not a bug.

---

## 1. The core promise — quit with an agent mid-task, and come back

This is the one that matters. Everything else in Tortie is furniture.

**Do this**

1. Pick a real project. Start a Claude session (⌘T, or your per-agent hotkey).
2. Give it something that takes a minute or two — "read through
   `src/main/tmux/` and summarise how the supervisor resolves the tmux binary",
   say. Something with a real answer, not a toy.
3. While it is still working, **quit Tortie with ⌘Q.** Not close-the-window —
   actually quit. Let the quit finish.
4. Wait 30 seconds. If you want the harder version of the test, open Activity
   Monitor first and confirm no Tortie process remains.
5. Launch Tortie again.

**What you should see**

- The window comes back with your projects and your sessions in the sidebar.
- Your Claude session is **still there and still running** — and if the agent
  finished while the app was closed, its answer is on screen, written while
  nothing was watching.
- The session is attached and live. Type into it; it responds.
- Your session count matches what you noted at the start.

**If it did not**

If the session is gone, or shows as ended, or the pane is dead — that is the
product's central claim failing, and nothing else on this page matters until it
is fixed. Capture `tmux -L gmux ls` before doing anything else; the sessions
live in that server, and if they are listed there the loss is in the app's
reconcile rather than in the work itself.

**Why it works, so you can trust it rather than hope**

Your sessions are not in Tortie. They are in a private tmux server on the socket
`-L gmux`, which Tortie starts and then merely *connects to*. Quitting the app
closes a client. Run `tmux -L gmux ls` in any terminal, with Tortie closed, and
you will see all of them sitting there. That is the whole architecture in one
command.

---

## 2. The harder promise — reboot the Mac and use Restore

Quitting the app leaves tmux running. A reboot does not: the server dies with
everything else. This is where Tortie has to rebuild rather than reattach, and
where the difference between "a shell came back" and "the conversation came
back" lives.

**Do this**

1. Before rebooting, look at the sidebar and note two or three sessions you care
   about — particularly ones with agents that have real conversations in them.
2. Reboot the Mac normally (Apple menu → Restart).
3. Open Tortie.

**What you should see**

- Your sessions are listed, marked as saved rather than running.
- If two or more can be restored, a strip appears above the terminal area
  saying something like **"6 saved sessions — 4 will resume their conversation,
  2 return to their directory"**, with a **Restore all** button.
- **Read that line before you press anything.** It is deliberately shown
  *before* the button, because a bare count would let you restore everything and
  only then discover which conversations were never coming back.
- Press **Restore all** (or Restore on one session).
- Each restored pane shows its **old scrollback replayed above a fresh prompt**,
  and for the sessions that can resume, the agent's own resume command is
  **typed into the prompt but not executed** — e.g.
  `claude --resume 30a4e178-…`.
- **Press Enter yourself.** The agent comes back knowing what it was doing.
  Ask it something that requires the earlier context — "what were we just
  working on?" — rather than trusting the replayed text on screen, which is
  only a picture of the past.

**If it did not**

- *Sessions listed but nothing offers to restore*: the manifest has the rows but
  no snapshots. Check `~/Library/Application Support/Tortie/gmux/snapshots/`.
- *Restore works but the agent does not remember*: the resume command ran but
  the agent's own session file is missing or was never captured. Which agents
  can do this is measured, not assumed — see the table in `BUILD-STATUS.md` §4.
  gemini and droid are the two currently unproven, for reasons recorded there.
- *A session returns to its directory with no conversation*: check whether the
  restore strip told you that in advance. If it did, this is correct behaviour
  and the honesty is the feature. If it promised a conversation and did not
  deliver one, that is a real defect.

**Best-effort, stated plainly**

Two things Restore does **not** bring back, and cannot:

- **Your shell environment.** Anything you exported by hand in that pane, any
  `nvm use`, any activated virtualenv — gone. The pane comes back in the right
  directory with the right scrollback, not with the right variables.
- **Background processes an agent started.** A dev server, a file watcher, a
  test runner that an agent launched inside its session died with the reboot and
  nothing restarts it. Restart those yourself.

There is a third, subtler one worth knowing: agents write their transcripts
asynchronously, roughly a second or two behind what is on screen. A machine that
loses power immediately after an agent replies can come back to a conversation
missing that last turn. That is the agent's durability, not Tortie's, and no
shell can fix it from outside.

---

## 3. Drop an image on a Claude pane

**Do this**

1. Take a screenshot (⌘⇧4), or find any PNG in Finder.
2. Drag it from Finder and drop it **directly onto a running Claude session's
   terminal area.**
3. Ask about it — "what's in this image?"

**What you should see**

- A drop frame highlights the pane while you are dragging over it.
- On drop, the prompt gains a real attachment — in Claude Code this reads
  `[Image #1]`, not a long file path.
- Claude answers about the image's actual contents.

**If it did not**

If you get a raw path pasted as text instead of an attachment, the drop worked
but the agent is one whose paste behaviour is not verified — Tortie inserts path
text for anything unproven rather than guessing. That is by design for other
agents; for Claude it would be a defect.

You can also **paste** an image from the clipboard (⌘V, or right-click → Paste)
into an agent pane and it takes the same path.

---

## 4. Scroll back through a long transcript

Agent panes used to be the one place scrollback did not work. This checks it
still does.

**Do this**

1. Find a session with a long history — one where an agent has been working for
   a while. If you do not have one, run something noisy like
   `git log --stat | head -500` in a shell session.
2. Scroll up with the trackpad.
3. Then use the keyboard: **⇧PageUp** and **⇧PageDown**.

**What you should see**

- A visible scrollbar appears at the right of the pane.
- You can scroll back through the full history smoothly, in an *agent* pane, not
  just a shell one.
- ⇧PageUp/⇧PageDown page through it.
- Typing, or new output arriving, snaps you back to the bottom.

**If it did not**

Scrolling that jumps, sticks at the top of the visible screen, or is limited to
one screenful in agent panes means the pane is in tmux's alternate screen and
the scrollback bridge is not engaging. Note which agent — the behaviour is
per-agent.

---

## 5. Search across a project

**Do this**

1. **⇧⌘F** — Search in project. Search for something you know appears in several
   files, e.g. `restoreSession`.
2. Click a result.
3. **⌘P** — Go to file. Type a few letters of a filename you know, in order but
   not necessarily adjacent (`mnfststr` for `manifest/store.ts`).
4. Press **⌘P again** while the palette is open.
5. **⇧⌘O** — Go to symbol. Type a function name you know.

**What you should see**

- Search returns matches grouped by file, with the matched text highlighted, and
  clicking one opens that file at that line.
- ⌘P matches on fuzzy subsequences and **highlights the letters that matched**,
  so you can see why a row is in the list.
- Pressing ⌘P a second time **widens the search to every open project** — this
  is the thing a normal editor cannot do for you, and the reason search is in
  Tortie at all: agents rewrite things across repos.
- Enter opens into the reusable preview tab; **⌘Enter** opens it for keeps.
  Adding `:412` to the query lands you on that line.
- ⇧⌘O jumps to definitions in the current file; typing `#` first searches
  symbols across the whole project. **The first use in a project builds an index
  in the background and says so** — that message is expected, not a stall.

**If it did not**

Search with no results at all, in a project you know contains the string,
usually means ripgrep did not launch from inside the app bundle. Symbols
returning nothing after the index message has cleared means a tree-sitter
grammar is missing — six languages ship (ts, tsx, js, go, python, rust) and
nothing else is indexed, by design.

---

## 6. The git graph shows origin divergence

**Do this**

1. **⌃⇧G** — Source control. Find the commit history / graph.
2. Look at a repo where your local branch is **ahead of, behind, or diverged
   from** its origin. If you do not have one, make a local commit without
   pushing.

**What you should see**

- A real graph with **lanes** — parallel lines for parallel branches, merges
  drawn as merges, not a flat list with a decorative dot column.
- Your local branch and its origin counterpart are **visibly distinguished**, so
  you can see at a glance where they parted and how far apart they are.
- Making a local commit moves your local head ahead of origin in the graph
  without you refreshing anything.

**If it did not**

A single straight line in a repo you know has branches means lane assignment is
falling back. Local and origin drawn on top of each other means the divergence
information is not reaching the layout — which is precisely the thing this view
was built for, so treat it as a real failure rather than cosmetic.

---

## 7. Settings, hotkeys and the things that came across the rename

The app changed its name and its bundle identifier in Phase 16.5. Your data was
copied across automatically. This confirms it landed.

**Do this**

1. **⌘,** — Settings.
2. Check your per-agent hotkeys are the ones you set.
3. Check Settings → SpecStory shows the bundled CLI and your sign-in state.
4. **⌘/** — the keyboard reference. Confirm it lists your assigned agent
   shortcuts, not just the built-ins.
5. Try one of your per-agent hotkeys. It should create a session with that
   agent, in the active project.

**What you should see**

Everything as you left it. Projects, sessions, settings, hotkeys, and SpecStory
capture state all crossed the rename.

**What you may also see, and should not be alarmed by**

- **macOS asking for permissions again.** Privacy grants are keyed to the bundle
  identifier, which changed. Full Disk Access, Files & Folders, Automation — any
  of these may be re-requested once, at the moment they are first needed. Grant
  them as you would for a new app.
- **A stale login item.** System Settings → General → Login Items may still list
  an entry pointing at the old app, which no longer exists. Remove it by hand.
  Tortie repairs this automatically for future changes, but the build that
  shipped *before* the rename never recorded the preference to repair from, so
  this one upgrade genuinely could not be fixed in code. The app told you so in
  a one-time dialog on first launch.

---

## 8. The safety property — Tortie leaves other sessions alone

Worth knowing once, because it is what makes the tmux socket safe to share.

**Do this**

```sh
tmux -L gmux ls
```

**What you should see**

Possibly *more* sessions than Tortie shows you in the sidebar. Tortie only ever
adopts sessions carrying its own identity stamp (`@gmux-id`, or the
`GMUX_SESSION_ID` pane environment). Anything else on that socket it lists in
its log as ignored and never touches — never adopts it, never kills it.

It also never touches your **default** tmux server. Plain `tmux ls`, your
`~/.tmux.conf`, and any sessions you started yourself outside Tortie are in a
different world entirely.

---

## Not covered by this script

Stated so the checklist does not imply more coverage than it has:

- **Other machines.** This build is unsigned for distribution. On any Mac other
  than the one it was built on, Gatekeeper blocks the first launch (right-click
  → Open, or `xattr -dr com.apple.quarantine /Applications/Tortie.app`).
- **Auto-update.** There is no update feed. New versions are installed by hand.
- **Intel and universal builds.** arm64 only.
- **gemini and droid resume.** gemini's capture is proven but its roundtrip is
  blocked by the provider account; droid is not installed. Every other agent's
  resume is proven end to end — the matrix is in `BUILD-STATUS.md` §4.
- **Recovery from a corrupted manifest.** There is no generational backup or
  integrity-check-and-repair path yet. If
  `~/Library/Application Support/Tortie/gmux/manifest.db` is damaged, the
  sessions themselves are still in tmux, but Tortie's memory of them is not.
  This is the top item in `docs/research/26`.
- **Restore reporting failure honestly.** Restore can currently mark a row
  `running` after arming the resume command, without verifying the agent
  actually re-attached. If a restore looks wrong, believe the pane over the
  status.

---

## If you want the parachute gone

Your pre-rename data is still on disk at
`~/Library/Application Support/gmux/`. It was **copied, not moved** — the
original is intact, including the manifest and every snapshot as of the
migration. Tortie never reads it again.

Once you have worked through this script and used Tortie normally for a few
days, you can delete that directory and nothing in the app will notice.

Until then, one rule: **do not launch an old gmux.app.** The migration ran once
and is marked complete, so it will never run again — anything a resurrected old
app wrote would never cross into Tortie.
