# 103. Phase 242 — the write path rehearsed against the real machine

The build half of Phase 242, "the write root, rehearsed". Written 2026-09-08 in
`/private/tmp/wt-p242`, driven against `gregs-mac-pro.tail2ddfe1.ts.net` over the real link under
the bounds every remote phase has inherited since Phase 224. Its parent half is
`docs/research/102-phase-242-starting-measurements.md`, which took the parent readings and found the
symlink hole.

**The phase expected to build nothing and it built two fixes, because the rehearsal found defects.**
The entry's clause is "nothing is fixed that is not found", and three things were found. Two are
fixed here. One is measured, stated and queued, and this document says why that is the honest answer
rather than the convenient one.

---

## 1. The headline, in one table

| what | where it was found | what happened |
|---|---|---|
| A symbolic link inside the confirmed folder pointing out of it carried `file-put`, `dir-new` and `entry-rename` straight through, one of them REPLACING a file outside the folder and answering `wrote` | research 102 §5.2, on his own machine | **Fixed.** `61cb66aa` |
| A link as the ENTRY ITSELF, and a link planted at the staged name `<file>.tortie-part`, both answered `wrote`; the second put the payload into a file outside the folder and left the person's own file inside it as a link pointing at it | measured here, at the parent | **Fixed** by the same change, and it is the `src/main/credentials/nofollow.ts` shape this domain had never taken |
| Two sentences sent him to a button he had already pressed | research 102 §6 | **Fixed.** `44d01573` |
| The two git verbs bind their `cwd` over the path TEXT, so a `cwd` through a link inside the folder resolves textually under it and `git-stage` staged a file in a repository OUTSIDE the folder | measured here | **Stated defect, queued as Phase 242.1.** §5 |
| Every one of the eight write verbs, composed in one run on his machine | measured here | works, §3 |
| The remote face and the local face, read side by side | measured here | **identical**, §4 |
| The redline on a remote tab | measured here | offered, and its write cannot reach that machine, §6 |

---

## 2. The fix, and why it is not the resolution the headers refuse

Every header in this domain says a symbolic link is not RESOLVED, because resolving one means a
second round trip and a second answer that can be stale by the time the write lands.

**That argument is about resolving, it is true, and it was never an argument that the write may then
FOLLOW one.** `noLinkWalk` in `src/main/machines/remote-scripts.ts` asks the shell's own `-L` about
every DIRECTORY component of the relative path, from the confirmed folder down, one component at a
time, in the same call that would otherwise have written. There is no `readlink`, no `realpath`, no
`cd -P` and no second call. An answer taken in the moment the write lands cannot be stale by the time
the write lands.

The word it prints is `outside` and main maps it onto the `outsideRoot` outcome all three verbs
already had. **No new outcome word crosses the channel and no new sentence is written**, so
`docs/audits/contract-baseline.txt` is byte identical and the sentence a person reads is the one that
already said Tortie may only change what is under that folder and that nothing was changed. That is
exactly what happened.

### What each script does with the LAST component, said once rather than left silent three times

| script | last component | why |
|---|---|---|
| `file-put` | **refused**, plus its staged name | A link there means the file being replaced is not under the folder: the checksum arm reads it THROUGH the link and the `mv` lands on the link. And `> "$t"` follows a link, so one planted at the staged name takes the payload outside before the `mv` runs at all |
| `entry-rename` | **allowed, and it must be** | Renaming a symbolic link is what its `[ -e "$x" ] || [ -L "$x" ]` presence test was written for, and `mv` renames the link rather than following it. The entry stays inside the folder |
| `dir-new` | not applicable | It is the folder being made, which is not there |

### The parent readings for the two arms nobody had measured

Driven at `cbadcd91` against real links on this Mac, through the shipped script text:

```
leaf-link, new     -> exists none none
leaf-link, replace -> wrote ec18dc9d… 11        the link destroyed, replaced by a regular file
staged-name link   -> wrote 0cd92943… 13        victim2.txt now holds PWNED-STAGED,
                                                 and docs/target.md is now a symlink to it
```

The leaf case is contained but its guarantee was false: the checksum was read from the file OUTSIDE
and the bytes landed on a different inode, so "replace a file whose contents still match what Tortie
read" did not hold. The staged-name case is a full escape.

### What holds it

- **`src/main/machines/__tests__/p242-link-refusal.test.ts`** hands the three shipped script strings
  to `/bin/sh` with the same positional values `runRemoteWrite` composes, over real directories,
  real files and real symbolic links, and reads what is on disk afterwards. **7 of its 14 arms are
  red at the parent and all 14 green now.** The other 7 are green on both sides on purpose: they are
  what proves the refusal did not get wider than the hole — a path with no link still writes, a
  folder is still made, an entry is still renamed, and a link, dangling one included, is still
  renameable.
- **`npm run conformance:machines` condition 88** pins the clauses and where they stand: every writer
  that takes a path walks every value it takes, from the confirmed folder, one component at a time,
  refusing by printing and leaving, ABOVE every line that writes. It proves its own readers on six
  planted texts it writes itself, and four ablations of the real code each turn it red naming the
  clause.

---

## 3. The eight verbs, on his machine, in one run

Nothing had ever asked whether they compose. They do. Every answer read at the bridge and every
result then read back from that machine by a separate `ssh` Tortie did not compose.

| verb | ms | answer |
|---|---|---|
| `putFile`, a new file | 100 | `wrote` |
| `makeDir` | 37 | `made` |
| `renameEntry`, within a folder | 29 | `moved` |
| `renameEntry`, across folders (the drag's verb) | 29 | `moved` |
| `reviewFiles` | 125 | answered |
| `stage` | 100 | `done` |
| `unstage` | 90 | `done` |
| `stage` again | 86 | `done` |
| `commit` | 110 | `committed` |

**On the row he actually has**, meaning confirmed with no folder named, all five path verbs answer
`writesOff` and `commit` answers `refused`, before a byte is composed, and the far side is byte for
byte the fixture afterwards.

**The commit succeeded because the fixture sets `git config --local`.** His own `~/.gitconfig` was
not touched and is unchanged at 140 bytes, so on any repository of his that lacks a local identity
the commit verb still fails after the press, exactly as research 85 recorded.

### The containment attack: twelve arms, twelve refusals

| # | shape | answer | far side |
|---|---|---|---|
| a1 | `..` in the middle | `outsideRoot` | unchanged |
| a2 | an absolute path elsewhere | `outsideRoot` | never created |
| a3 | the root itself | `outsideRoot` | unchanged |
| a4 | the sibling `<root>x` | `outsideRoot` | unchanged |
| a5 | `putFile` through the link, `new` | `outsideRoot` | unchanged |
| a5a | `putFile` through the link with the victim's REAL digest | `outsideRoot` | unchanged. **`wrote` at the parent** |
| a5b | `makeDir` through the link | `outsideRoot` | no folder made. **`made` at the parent** |
| a5c | `renameEntry` out through the link | `outsideRoot` | `README.md` still inside. **`moved` at the parent** |
| a5d | `renameEntry` IN through the link | `outsideRoot` | unchanged |
| a8 | the leaf link, `new` | `outsideRoot` | unchanged |
| a8a | the leaf link with the real digest | `outsideRoot` | unchanged. **`wrote` at the parent** |
| a9 | a link at the staged name | `outsideRoot` | unchanged. **`wrote`, payload outside, at the parent** |
| a6 | `stage` with a `cwd` outside the root | `outsideRoot` | `dirty.txt` never staged |
| a7 | `commit` with a `cwd` outside the root | `refused`, naming the folder | unchanged |

The real digest matters. Handing a made-up one would have been refused as `stale` for the wrong
reason and would have proved nothing, which is why the fixture reads the victims' `shasum` and the
probe passes them in.

---

## 4. The operator's rule, measured rather than asserted

His rule of 2026-09-07: no explanatory text in the machine settings or in any nav bar view just
because the tab is on a remote machine; a limit that is genuinely different is a disabled action with
at most one short label, never a paragraph.

`build/probe-p242-write-path.mjs` launch B opens **two projects that mirror each other** — the same
relative paths, the same branch, the same commit subject, the same dirty file, the same untracked
file and the same three symbolic links — one on his Mac Pro and one on this Mac, reads both faces in
one session, and compares them line by line.

**The result is zero.** Zero sentences the remote face draws that the local one does not.

```
remote Explorer   EXPLORER, 5 rows: docs, src, .gitignore, NOTES-untracked.md, README.md
local  Explorer   EXPLORER, 5 rows: docs, src, .gitignore, NOTES-untracked.md, README.md

remote CHANGES    6 | Changes 2 | M design.md docs | M core1.ts src |
                  Untracked 4 | NOTES-untracked.md, staged-target.md.tortie-part, escape-link, leaf-link
local  CHANGES    6 | Changes 2 | M design.md docs | M core1.ts src |
                  Untracked 4 | staged-target.md.tortie-part, escape-link, leaf-link, NOTES-untracked.md
```

The one line only the remote face draws is `Commit on Greg's Mac Pro`, and it is a **disabled**
control's own label, which is his own stated exception. Beside it, the disabled New file and New
folder buttons carry Phase 229's title, which is the one sentence that tells a person the door.

### It took four runs to make that reading honest, and each fix is a fixture now

This is the part worth keeping, because a check that cannot fail is not a check and this one could
not fail three times running.

1. **A face that reads nothing is a finding, not a silent pass.** The first two attempts, and the
   measure step's own before them, came back with zero tree rows and zero sidebar characters and
   reported no difference — which is exactly what a face that agrees looks like. The tree lives in a
   shadow root, so a plain `document.querySelectorAll('[role="treeitem"]')` finds nothing.
2. **The two faces must be two different projects.** One run read the same LOCAL tab twice and
   reported byte for byte agreement. The remote `addRemoteProject` had answered `notConnected`,
   because it reads the folder through the exec plane and does not fail open, and the settings launch
   that added it had never called `prepare`. The grader now asks each side for its project id and its
   machine id.
3. **A one token value slot is not a sentence.** The branch header holds `main` on one face and the
   project name on the other. The reader grades lines with whitespace in them and records the rest,
   because every value these faces draw is one token and every sentence and every control label is
   more than one. The cost is stated in the code: a ONE WORD label added to the remote face alone
   would not be caught by that reader, which is why every control's own text, title and `aria-label`
   is compared in full beside it, with its disabled state.
4. **A two word label IS a sentence**, because `Read only` is the shortest thing a round could add
   and still be explaining.

`node build/probe-p242-write-path.mjs --self-test` proves all of it on 23 fixtures and launches
nothing.

### What is read and deliberately NOT graded

The HISTORY and BRANCHES sections below CHANGES. They are read surfaces Phases 106 and 107 shipped,
they are not this phase's subject, and they differ on purpose: the remote view draws a one word
section called **Branch** (`RemoteBranchSection.tsx:289`) where the local one draws **Branches**
(`BranchesView.tsx:427`), because the remote view shows one branch rather than offering branch
management. Grading them would make this probe fail for a difference that is neither a paragraph nor
about writing. It is said here out loud rather than left to be noticed.

One thing was observed and is not explained: on the remote face those two sections had not filled
after ninety seconds, where the local face filled in about a hundred milliseconds. CHANGES, which is
the read the write path depends on, arrived on both. That belongs to Phases 106 and 107 rather than
here.

---

## 5. The stated defect: the git verbs bind their cwd over the path text

**Measured here, on his machine, and not fixed.**

`git-stage`, `git-unstage` and `git-commit` take a repository `cwd` rather than a file path. Main
bounds that `cwd` with `rootHolds` in `src/main/machines/remote-stage.ts`, which compares path TEXT
the way `relativeUnderRoot` does. So a `cwd` of `<root>/escape-link` resolves textually under the
confirmed folder, the far side's `cd "$1"` follows the link, and git runs in the repository outside
it.

| arm | answer | far side |
|---|---|---|
| `stage` with `cwd` = `<root>/escape-link` | **`done`** | `dirty-link.txt` staged in the repository OUTSIDE the confirmed folder |
| `commit` with `cwd` = `<root>/escape-link` | `refused` | unchanged — **but on its HEAD guard, not on containment.** With the HEAD the tab would really have read, the commit would have landed there |

**Why it is not fixed in this phase.**

1. The far side cannot ask the question it needs to. The three scripts are given the repository root
   and not the confirmed folder, so there is nothing to walk down FROM. Giving them one is a
   parameter change to three scripts in a catalogue whose shape `conformance:machines` pins, which is
   a wider change than "drive what exists".
2. The only rootless refusal available is comparing `pwd -P` against `$1` after the `cd`, which
   refuses every repository reached through a symbolic link ANYWHERE above it. A person whose home or
   whose project sits behind a link would lose all three verbs, and that cost is unmeasured on his
   own paths.
3. What it writes is a git index and, in the worst case, a commit. Neither destroys a person's file,
   and `conformance:machines` condition 80's own scope already says a repository's own index sits
   outside the sentence it protects. The file verbs, which do destroy, are closed.
4. Reaching it needs a project tab opened AT a path that goes through the link, so the person is
   looking at the outside repository's own contents while they press.

That is a defect and it is written down as one. Phase 242.1 in `docs/BACKLOG.md` carries it in the
house shape. `build/probe-p242-write-path.mjs` prints it on **every** run, whatever the verdict, so
it cannot be found only by opening a JSON file nobody opens.

---

## 6. The redline on a remote tab

Research 102 §7 read the source and could not drive it. Driven here.

- **It is offered.** With a confirmed folder, a remote `.md` tab draws the redline's own control row:
  `Off`, `Words`, `Phrases`, `Characters`, all four enabled, `Words` pressed, and the bar reads
  "Words and Phrases draw this change the same."
- **No `span.ed-redline-change` is drawn**, so a rewind has nothing to act on: the Phase 227 press
  reads its target off that wrapper's own attributes, and on a remote tab there are none.
- **Its one write channel cannot reach that machine.** `RedlineDocument` composes the press with the
  tab's own `repoPath` and `path`, which on a remote tab are far-side paths, and hands them to
  `fs.writeGuarded`. Driven with exactly those values, that channel answers
  `refused / outside / "That project folder does not exist."`

**What is NOT measured, and the bounds are why.** Both machines' home directory is `/Users/gdc`, so a
repository open at the same absolute path on both would put a real local project root at the far-side
root the press hands over. Measuring that needs a path under his home that exists on both machines,
and this run writes nowhere but its own `tortie-p242-scratch-<pid>` prefix. It is the one thing in
this area only he can check, and `docs/ACCEPTANCE-p242.md` asks him to.

---

## 7. What this run did on his machines

**The Mac Pro.** `-L gmux` held exactly one session before and after every run: `gmux-control`,
created 27 August, attached, unchanged. `~/.gitconfig` is 140 bytes and `~/.ssh` holds only
`authorized_keys`, both unmoved. `ls -d /Users/gdc/tortie-p242-*` answers nothing; the teardown read
`ROOT-GONE SIBLING-GONE OUTSIDE-GONE` on every run. The socket list under `/private/tmp/tmux-501` was
identical before and after; the `gmux-p235v-46037` in it belongs to Phase 235, which is in flight, and
was there before this run started and after it finished.

**This Mac.** `-L gmux` held 19 sessions before and after every run, listed only. Each run's scratch
socket was ended AND unlinked in its own `finally`, which is Phase 224's committer's rule. Tortie's
own record file is 113 bytes and `~/.ssh/known_hosts` is 2,215 bytes, both unmoved. His live
manifest, his keychain and his `~/Library/Application Support/Tortie` were read and never written.

No agent turn was started on either machine and no token was spent.

---

## 8. What only he can prove

The rehearsal runs under a scratch profile, and **his own row is a different row**. Setting a write
root on it is his act, behind a sheet he reads, and no agent may do it: it is the sixth
execution-bearing field, so it is inside the confirm hash, and that is Phase 23's refusal 8.

`docs/ACCEPTANCE-p242.md` is the checklist. It names the four things the rehearsal could not reach:
his own row's confirmation, a repository of his own without a local git identity, a redline on a
remote tab whose path also exists on this Mac, and the two git verbs through a link, which §5 leaves
open.
