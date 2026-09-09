# Letting Tortie save files on your Mac Pro — the check you run

Tortie can change files on another machine, and it has never once done it for you. Every proof it has
came from a scratch profile with a scratch folder. Your own Mac Pro row has no folder named on it, so
since 18 August every save, stage, unstage, commit, rename and drag aimed at that machine has been
refused before a byte left this Mac.

Turning it on is **your** act and no agent may do it for you. It is one of the six things a machine's
confirmation covers, so it needs you to read a sheet and press a button, out of band of anything an
agent is doing.

This takes about five minutes. Nothing here is best-effort: every step either works or it does not.

---

## Before you start

- You are running Tortie 0.101.0 or later.
- Pick the folder on the Mac Pro you want Tortie to be able to change. **Everything Tortie writes
  there has to be inside it.** A good first choice is one project rather than your whole home
  directory — you can widen it later, and narrowing it later is the same three clicks.
- Note the folder's exact absolute path on that machine, e.g. `/Users/gdc/some-project`.

---

## 1. Turn it on

1. **⌘,** to open Settings, then **Machines**.
2. Find **Greg's Mac Pro**. Under it there is a block headed **Saving files**, and today it says
   nothing but *Let Tortie save files here…*
3. Click it. A field appears headed **Folder Tortie may save under**, with a **Browse…** button
   beside it.
4. Either type the absolute path, or press **Browse…** and walk the folders on that machine. If you
   browse, **Use this folder** stays off until that machine has actually answered about the folder
   you are standing in, so a folder you can choose is a folder that was there a moment ago.
5. **Read the sheet.** With a folder named it says six lines, and the sixth is the new one:

   > Machine: gregs-mac-pro.tail2ddfe1.ts.net
   > Runs this program on that machine: /usr/local/bin/tmux
   > **May replace files under this folder on that machine: `/Users/gdc/some-project`**

   Under those, the sign-in paragraph you have read before every machine sheet, and one that
   matters here:

   > Tortie replaces a file only after it has just read that file and its contents still match what
   > it read. A save cannot be undone, and Tortie cannot reach a Trash on that machine. A save writes
   > a new file and moves it into place, so a file with more than one name keeps only this one, and
   > extended attributes are not kept.

6. Press **Confirm saving on this machine**.

That is the whole thing. The block now names the folder instead of offering to.

---

## 2. What should be different straight away

Open a tab on that machine — **⌘T**, or the home screen, pointed at a folder **inside** the one you
just named.

| where | before | now |
|---|---|---|
| Explorer, the two buttons at the top | **New file** and **New folder** greyed out, and hovering either one says *"Tortie cannot change anything on Greg's Mac Pro. Open Settings, then Machines, then Greg's Mac Pro, and let Tortie save files there."* | both pressable, and hovering says **New file** and **New folder**, exactly as a local tab does |
| A file you open and edit | **⌘S** raises a message with an **Open settings** button | **⌘S** saves it on that machine |
| Source control | the commit button says **Commit on Greg's Mac Pro** and is greyed out | it works |
| Dragging a file to another folder in the tree | refused | it moves |

**A tab on that machine should now feel the same as a local one.** That is the point, and it is the
thing to tell me about if it is not true: if any view says something to you *only* because the tab is
on the Mac Pro, and it is not the one short label on a control you cannot press, that is a defect.

---

## 3. The save itself

1. Open a file in that folder on the Mac Pro. Change one line. **⌘S**.
2. Go to that machine — a terminal, another editor, anything — and look at the file. Your line is
   there.
3. Now the half that matters. **Change the same file on that machine**, from over there, without
   Tortie. Come back to Tortie, change something in the copy on screen, and **⌘S** again.

   Tortie should refuse, and say the file on that machine is no longer the file it read, and tell you
   to open it again. **Nothing should have been written.** Check on that machine: your change from
   step 3 is still there, untouched.

That refusal is the whole safety of the feature. If it saves anyway, stop and tell me.

---

## 4. Turn it off

**⌘,**, **Machines**, **Greg's Mac Pro**, and press **Stop Tortie saving files here**. There is no
folder field to clear once a folder is confirmed — the block draws one sentence and that one button.

It does two things, and the button's own hover says so: saving goes off, **and your confirmation of
the machine goes with it**, because the folder is one of the six things you confirmed. The machine is
then unusable until you confirm it again, which is the same sheet and one button. So do it when you
have a minute rather than in the middle of something.

Every write verb goes back to being refused before anything leaves this Mac, and the Explorer's two
buttons go grey again.

Turning it off does not undo anything Tortie already wrote. There is no Trash on that machine and
Tortie cannot reach one.

---

## 5. What has already been proved, so you do not have to

All of this was driven against your Mac Pro, over the real link, in a scratch folder under your home
that was created and removed in the same run. Every result was read back from that machine by a
separate `ssh` rather than believed from Tortie's own answer.

- **All eight write verbs work and they compose**, in one run: save, new folder, rename, move across
  folders, stage, unstage, stage again, commit. Between 29 and 125 milliseconds each.
- **On a row with no folder named, all of them refuse before a byte is composed.** The machine is
  never contacted.
- **Twelve ways of aiming a write outside the confirmed folder were all refused**, with that machine
  counted before and after each one: a `..` in the middle, an absolute path somewhere else, the
  folder itself, a sibling folder whose name is the confirmed one plus a character, and six through a
  symbolic link. **Four of those six wrote through at the start of this work** — one of them replaced
  a file outside the folder and told you it had saved — and they are what this release fixes.
- **A remote tab and a local tab were read side by side**, over two projects that mirror each other
  file for file, with saving off and again with saving on. **There is not one sentence the remote
  face draws that the local one does not**, in either state, apart from the label on a control you
  cannot press. The local face draws a few the remote one does not, and every one of those is about
  what has changed in that project rather than about the machine.

---

## 6. What only you can prove, and I would like you to

Four things. The first three are quick; the fourth is a limit rather than a test.

1. **Your own row.** Everything above ran on a scratch profile with its own machines file. Your row
   is a different row and only you can confirm it. §1 and §3 are that check.

2. **A commit in a repository of yours.** Tortie's commit ran in a scratch repository that sets a git
   name and email of its own. **Your `~/.gitconfig` on that machine has no identity in it**, so in a
   repository of yours that does not set one locally, the commit will fail after you press, with
   git's own message. If that happens, `git config --global user.name` and `user.email` on that
   machine is the fix, and Tortie will never write that file for you.

3. **A Redline on a remote tab whose path also exists on this Mac.** A Redline is offered on a file
   on that machine, and its rewind key writes through the channel that writes local files. Aimed at a
   folder that is only on the Mac Pro it refuses, which is what was measured. What was **not**
   measured is the case where you have the same absolute path open on both machines — both of them
   have a home at `/Users/gdc`, so `/Users/gdc/gmux` is a real folder on each. If you have that, open
   a Markdown file on the Mac Pro copy, press Option-Delete on a change, and then check the file on
   **this** Mac. Nothing should have changed here. Tell me if anything did.

4. **A symbolic link and the Source control buttons, which is a known gap.** If a folder inside your
   confirmed folder is a symbolic link pointing somewhere else on that machine, and you open a tab
   *through* that link, then **Stage** and **Commit** will act on whatever repository the link really
   points at, even though it is outside the folder you confirmed. Save, rename, move, new file and
   new folder all refuse this correctly; the two git buttons do not. It writes a git index rather than
   any of your files, and you have to have opened a tab through the link to reach it at all. It is
   written down and queued, and it is not fixed in this release.
