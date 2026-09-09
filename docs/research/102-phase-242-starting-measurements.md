# 102. Phase 242 starting measurements — the remote write path at the parent

Measure step for Phase 242, "the write root, rehearsed". Written 2026-09-08 against the tree at
`cbadcd91` in the worktree `/private/tmp/wt-p242`, driven against
`gregs-mac-pro.tail2ddfe1.ts.net` over the real link under the bounds every remote phase has
inherited since Phase 224.

This document builds nothing. It reads the tree the charter cites, takes the parent readings on his
Mac Pro, records the gates green at the parent, and names the smallest set of files the builder has
to touch.

**The headline, and it is a defect rather than a stated limit.** The charter said the symlink arm
would be measured rather than assumed and that the phase would say whether the answer is a stated
limit or a defect. It is a defect. A symbolic link inside the confirmed folder pointing out of it
carries three of the eight write verbs straight through, and one of them **replaced a file outside
the confirmed folder with `outcome: "wrote"`** on his own machine, over the real link, with the
answer naming the write root as though the write had landed inside it. Sections 4 and 5 have the
readings.

---

## 1. The charter's citations, checked line by line

Every file:line in the Phase 242 entry was opened in this tree. Three are exact, one is imprecise in
its line range and right in its claim, and the surrounding facts the entry rests on have moved in
three places since research 85 measured them.

| The entry says | Read at | Verdict |
|---|---|---|
| "The setting UI exists" — the field and a picker whose `Use this folder` is off until a listing answered | `src/renderer/settings/MachineRow.tsx:262-320` | **Right, line range imprecise.** 262-320 is the doc comment and the head of `SavingFiles`. The field is at 363-382, the `Browse…` button at 376-382, `RemoteDirPicker` at 385-396 and the confirm button at 407-425. The `Use this folder` rule is in `src/renderer/app/RemoteDirPicker.tsx:117` |
| "The refusal already points at it" — a sticky toast carrying **Open settings** | `src/renderer/editor/tab-io.ts:573-587` | **Exact.** The write-root branch of `saveOnMachine`, `remoteSaveRefused(label)` with `action: { label: 'Open settings', run }`. Research 85's finding that the one call site passed only `{ sticky: true }` is fixed |
| "Containment already has three layers" — the schema, the far-side script, `relativeUnderRoot` | `src/main/machines/remote-file.ts:35-47` | **Exact, word for word**, including the paragraph at 43-47 stating that a symlink is covered by none of the three |
| The confirm sheet's sixth line reads *"May replace files under this folder on that machine: `<path>`"* | `src/main/machines/confirm.ts:445-447` | **Exact.** `describeMachine` appends it only when `writeRoot` is a non-empty string, so `lines` stays exactly the hashed facts |
| "the drag-and-drop Phase 233 shipped" | `src/renderer/tree/use-tree-model.ts:426-448` | **Right.** `canDrag` now asks `canRenameHereRef.current` rather than refusing every remote drag; `canDrop` at 459 asks the same. Research 85's gap 8 half is closed |

### Drift to report

1. **The script catalogue is 28, not 25.** Research 85 counted 25 at `761776a`. `src/main/machines/remote-scripts.ts` now declares 28 ids: `commit-files`, `arch-read` and `arch-git` were added after that reading. `ALLOWED_WRITERS` in `build/conformance-machines.mjs:2874` still names the same **eight** writers, so the write surface has not grown: `image-put`, `git-clone`, `file-put`, `dir-new`, `entry-rename`, `git-stage`, `git-unstage`, `git-commit`. Research 85's gaps 4 (Architecture absent on a remote tab) and 17 (the commit file diff) are therefore stale as written.
2. **The dead-end tooltip research 85 §3.5 named is gone.** `remoteTreeReadOnly` ("Tortie only reads files on Greg's Mac Pro") was deleted in Phase 229 and `src/renderer/machines/explorer.ts:156` now draws `remoteEntryWritesOffLabel`, which names the door: *"Tortie cannot change anything on Greg's Mac Pro. Open Settings, then Machines, then Greg's Mac Pro, and let Tortie save files there."* Section 6 has the two sentences that did NOT get that treatment.
3. **`.p224/` is not in this worktree and never was in git.** The task brief calls the Phase 224 probes "committed under `/private/tmp/wt-p242/.p224/`". `.gitignore`'s last rule is `.p[0-9]*/`, so no phase working directory has ever been committed, and `/private/tmp/wt-p224` no longer exists. Surviving copies are at `/private/tmp/p233v-parent-src/.p224/` and `/private/tmp/wt-p230-parent/.p224/`; this measure step copied the first into `/private/tmp/wt-p242/.p224/`, where the builder will find it. **The builder must not assume it is there after a reboot** — `/private/tmp` does not survive one.
4. **His row has not moved in 21 days.** `~/Library/Application Support/Tortie/gmux/config/machines.json` holds one row, `greg-s-mac-pro`, with `host`, `label`, `color` and `remoteTmuxPath` and **no `writeRoot`**. `config-confirmations.json` confirms it with exactly two lines, agreed at `1787069888617`, which is 2026-08-18 12:18:08. Both files were read and neither was opened for writing.

---

## 2. The data flow, in ten lines

1. A person types or picks a folder in `SavingFiles` (`MachineRow.tsx:358-427`); the surface decides nothing else and composes no line of the sheet.
2. Main's `describeMachine` (`confirm.ts:383-445`) draws the sheet and appends the sixth line only when the field carries a folder; the hash covers the same six fields.
3. Pressing **Confirm saving on this machine** writes the row and the sealed agreement; `writeRoot` is the sixth execution-bearing field, so the hash moves and refusal 8 holds.
4. A write verb enters through one of six `machines:*` channels registered in `src/main/machines/ipc.ts` (`putFile` 875, `makeDir` 1274, `renameEntry` 1282, `stage` 1322, `unstage` 1330, `commit` 1368).
5. Every one of them reaches `confirmedWriteRoot` (`remote-file.ts:188`), which finds the row, calls `assertMachineMayConnect`, and answers null — reported as `writesOff` — when the row carries no folder. Nothing is composed and nothing is sent.
6. With a folder, `relativeUnderRoot` (`remote-file.ts:156`) resolves both paths with `posix.resolve` and requires the file's path to start with the root **plus a separator**; null is `outsideRoot`.
7. `runRemoteWrite` (`remote-run.ts`) adds the connected-only check and the generation check, then sends one of the eight writer scripts as argv-separated values, never as a composed command line.
8. The far-side script re-asks the same shapes in `sh` — `FILE_PUT` at `remote-scripts.ts:2305-2308` refuses a non-absolute root, a `..` anywhere in the root, and an absolute-or-`..` relative part — so the rule holds when main is bypassed.
9. `file-put` then stages at `"$1/$2.tortie-part"`, `chmod`s it to the old file's mode and `mv`s it onto `"$1/$2"`. **Neither `sh` step asks whether any component of that path is a symbolic link, and `mv` follows one.**
10. The renderer draws the outcome word through one sentence file per surface: `machines/explorer.ts` for the tree, `machines/editor.ts` for the tab, `machines/scm.ts` and `main/machines/remote-copy.ts` for Source control.

---

## 3. The .p224 probes, and what the verifier can re-run

All seven are at `/private/tmp/wt-p242/.p224/` (copied in by this step) with their readings under
`results/`. They were written against `761776a`; four launch Electron and every one of them ends it
through `build/electron-run.mjs`.

| Probe | What it took | Re-runnable for Phase 242's parent reading? |
|---|---|---|
| `far-fixture.mjs` | the scratch repository on his machine | **Yes, and it is the shape to copy.** This step copied it to `.p242/far-fixture-p242.mjs` with the p242 prefix, a `git config --local` identity so the commit verb can be driven, and the attack furniture |
| `probe-p224.mjs` + `driver.mjs` §2 | the sixteen bridge timings in research 85 §3.5, including `putFile: a path outside the confirmed folder` → `outsideRoot` | **Partly.** Its write-verb block is the direct ancestor of `.p242/probe-p242-parent.mjs`'s launch D. Its ONE containment arm (an absolute path elsewhere) is arm a2 below; it never tried `..`, the sibling, the root itself or a symlink |
| `probe-p224.mjs` launch A | the settings drive that confirms the row and allows writes under a scratch root | **Yes, re-used verbatim in shape.** It is what launches A and C of both probes here do |
| `probe-p224b.mjs` | the disconnected tab | Not for this phase |
| `probe-p224c/d.mjs` | the boot comparison and the write controls | **`d` partly.** Its write-controls reading is what section 6's gap needs |
| `probe-p224e/f.mjs` | the two trees side by side, the watcher | **Yes for the operator's rule.** They are the only existing code that reads a remote face and a local face in one run, which is what the verifier has to do |
| `probe-p224-local.mjs` + `make-fixture.mjs` | the local baseline, three runs, banked as `local-baseline-run*.json` | **Yes, and it should not be re-taken.** The banked runs are the local half of the side-by-side |
| `blackhole.mjs`, `far-final.mjs`, `far-sockets-remove.mjs` | the 10,011 ms ssh reading; the closing count; the socket removal | `far-final.mjs` is re-used here as `.p242/far-final.mjs` |

**The one thing none of them did**, and it is why this step wrote three probes rather than re-running
one: no p224 probe composed more than one containment shape, and none drove the write verbs on a row
with NO folder to read what the refusal actually is.

---

## 4. The parent reading, part one: his row today

`.p242/probe-p242-noroot.mjs`, one scratch profile, two launches one after the other, socket
`gmux-p242-57026`, scratch repository `/Users/gdc/tortie-p242-scratch-57026`. The row is confirmed
and **no folder is named**, which is the row he has.

**The resting face of the Saving files block is two lines and no prose**, read off the real Settings
window's own DOM:

```
Saving files
Let Tortie save files here…
```

`machines.rows()` for that row: `writeRoot: null`, `writeHonesty: null`, `state: "confirmed"`.

**Every write verb is dark, and every one of them refuses before a byte is composed:**

| verb | outcome | `writeRoot` in the answer |
|---|---|---|
| `putFile` | `writesOff` | null |
| `makeDir` | `writesOff` | null |
| `renameEntry` | `writesOff` | null |
| `stage` | `writesOff` | null |
| `unstage` | `writesOff` | null |
| `commit` | `refused`, with a sentence | — |
| `reviewFiles` (a read, for contrast) | answered, 2 files plus untracked | — |

The far side after that launch, read by an ssh Tortie did not compose: `commits=1`, `dirty=4`,
`notesExists=yes`, `newFileExists=no`, `newFolderExists=no` — byte for byte the fixture. **Nothing
was sent.**

This is the number the phase must move, and it moves by HIS act rather than by any agent's: the
whole family is correct, fast and unreachable on the only machine he owns, and has been since
21 August.

---

## 5. The parent reading, part two: every verb in one run, and the attack

`.p242/probe-p242-parent.mjs`, one scratch profile, four launches one after the other, socket
`gmux-p242-69504`, scratch repository `/Users/gdc/tortie-p242-scratch-69504`, write root confirmed at
that path through the real sheet.

### 5.1 The verbs compose

Nothing has ever asked whether they compose. They do. One run, in order, every answer read at the
bridge and every result then read back from the machine by a separate `ssh`:

| verb | ms | outcome |
|---|---|---|
| `putFile`, a new file | 121 | `wrote`, 23 bytes |
| `makeDir` | 32 | `made`, mode 755 |
| `renameEntry`, within a folder | 28 | `moved` |
| `renameEntry`, across folders (the drag's verb) | 28 | `moved` |
| `reviewFiles` | 114 | 3 files plus untracked |
| `stage` | 108 | `done` |
| `unstage` | 105 | `done` |
| `stage` again | 97 | `done` |
| `commit` | 219 | `committed b4623b4` |

The far side confirms all nine: `newFileExists=yes`, `newFolderExists=yes`, `movedExists=yes`,
`notesExists=no`, `commits=2`, `lastSubject=p242 commit from Tortie (with-root)`.

**The commit succeeded here and failed for research 85, and the difference confirms that document's
diagnosis exactly.** This fixture sets `user.name` and `user.email` with `git config --local` inside
its own scratch repository. Research 85 §3.5 read `commit → 123 ms failed` because git on that
machine has no global identity. **His `~/.gitconfig` was not touched by this step and is unchanged at
140 bytes with a May 2024 mtime**, so on any repository of his that lacks a local identity the commit
verb still fails after the press, exactly as research 85 recorded.

### 5.2 The containment attack — four refusals, and a hole

Every arm aimed at a path outside the confirmed folder, driven at the bridge, with the far side
counted before and after by `ssh`. The victim is `<root>x/victim.txt`, `victim, untouched\n`,
18 bytes, md5 `9892f0f0f85702e82c48df2aeb7bbeb5`.

| # | shape | answer | far side |
|---|---|---|---|
| a1 | `..` in the middle: `<root>/docs/../../<root basename>x/victim.txt` | `outsideRoot` | unchanged |
| a2 | an absolute path elsewhere: `<root>-outside.txt` | `outsideRoot` | never created |
| a3 | the root itself (`rel` resolves empty) | `outsideRoot` | unchanged |
| a4 | the sibling that extends the root by one character, `<root>x/victim.txt` | `outsideRoot` | unchanged |
| a6 | `stage` with a `cwd` outside the root | `outsideRoot` | unchanged |
| a7 | `commit` with a `cwd` outside the root | `refused`, *"That folder on Greg's Mac Pro is outside the folder Tortie was given permission to write in. Nothing was sent."* | unchanged |
| **a5** | **`putFile` through a symlink inside the root**, `expect: 'new'` | **`exists`** — not `outsideRoot`. The stat crossed | unchanged, because the file was there |
| **a5a** | **the same call with the victim's real sha256** | **`wrote`, sha256 `d1d189…`, 10 bytes, `writeRoot` named as the confirmed folder** | **REPLACED.** md5 `9892f0f0…` → `b1308a33…`, 18 bytes → 10, and `b1308a33…` is the md5 of `PWNED-A5A\n` |
| **a5b** | **`makeDir` through the same link** | **`made`, mode 755** | a directory created outside the root |
| **a5c** | **`renameEntry` out through the link** | **`moved`** | `README.md` taken OUT of the confirmed folder |

`<root>x` held 3 entries before (`.`, `..`, `victim.txt`) and 5 after.

**a4 and a5a are the same file.** Reached by its own name the answer is `outsideRoot`; reached
through a link inside the root the answer is `wrote`, and the file is gone. So the separator rule
research 57 wrote and the far-side `case` lines are both doing their job over the path TEXT, and the
text is not what `mv` resolves.

### 5.3 Why this is a defect and not the stated limit

`remote-file.ts:43-47` says a symlink "is not resolved by any of them and cannot be, because
resolving one means a second round trip and a second answer that can be stale by the time the write
lands", and calls containment "over the path text". That paragraph is true about RESOLVING. It is not
an argument that the write may then follow the link, and three things say so:

1. **The write is not read-only and it is not bounded by the root in any sense.** `a5c` removed a
   file from inside the confirmed folder. No amount of "containment is over the path text" makes a
   verb that moves a person's file out of the folder they confirmed a stated limit.
2. **The sheet's own sentence is falsified.** A person confirms *"May replace files under this folder
   on that machine"*. `a5a` replaced a file that is not under it, and the answer Tortie drew named
   the confirmed folder.
3. **This project has already solved exactly this shape, in the domain that writes credentials.**
   `src/main/credentials/nofollow.ts` exists because a link planted at `<store>.tortie-pending` took
   a whole write, and its fix is unlink-then-exclusive-create plus an `lstat` in front of the rename.
   `FILE_PUT` stages at `"$1/$2.tortie-part"` inside whatever directory the path resolves to, which
   is the same staged-name shape, and then `mv`s it. The threat model is the project's own and the
   remote path never got the guard.

**No round trip is needed to close it.** The refusal can be one more line inside the script that
already runs there — the shell's own `-L`/`-h` tests over the path, or `-P` on the traversal — so the
answer is composed on the far side in the same call that would have written, which is what the
"second answer that can be stale" objection is about. Whether that is a Phase 242 fix or the finding
Phase 242 hands on is the operator's call and the builder's brief; **the entry's "Nothing is fixed
that is not found" clause is now live.**

### 5.4 What was NOT measured, and why

- **The person's own tree.** Every arm ran inside a scratch repository this run made and removed. A symlink inside a real project of his was never created and never followed.
- **`git-stage`, `git-unstage` and `git-commit` through a link.** They take a `cwd` rather than a file path and both refused an outside `cwd` at a6 and a7. Whether a linked path INSIDE the root reaches them was not driven.
- **`image-put` and `git-clone`**, the two writers that predate research 57.
- **The redline on a remote tab.** Section 7. The reading was attempted and the tree never populated in the probe; the source answer is there and the live answer is not.

---

## 6. Two sentences that send him to a button he has already pressed

Read live, off the real refusal, in section 4's run:

> "Tortie has not been given permission to write on Greg's Mac Pro, so it committed nothing. **Open
> Settings, then Machines, and confirm that machine.**"

His machine **is** confirmed. What is missing is the folder. The sentence tells him to do the one
thing he did on 18 August. Two composers say it and one does not:

| composer | text | verdict |
|---|---|---|
| `src/renderer/machines/explorer.ts:156` `remoteEntryWritesOffLabel` | "…Open Settings, then Machines, then Greg's Mac Pro, and let Tortie save files there." | **Right.** Phase 229 wrote it |
| `src/main/machines/remote-copy.ts:1011` `commitWritesOff` | "…Open Settings, then Machines, and confirm that machine." | wrong door, and names no machine in the second half |
| `src/renderer/machines/scm.ts:34` `remoteWritesNotConfirmed` | "…Open Settings, then Machines, and confirm that machine. Nothing was sent." | same |

This is one sentence each in two files and it is inside the entry's scope, because the entry forbids
write-root **UI** work and this is the copy a refusal draws. It is also the smallest thing in this
document that a person meets.

---

## 7. The operator's rule, and the one surface nobody has driven

His rule for every remote phase: no explanatory text in the machine settings or in any nav bar view
just because the tab is on a remote machine, and the verifier reads the remote face and the local
face side by side.

**What this step could read holds the rule.** With a confirmed folder, the Explorer's New file and
New folder buttons are `disabled: false` with the plain titles `New file` and `New folder` — byte for
byte what the local tab draws, read in the same launch. And `EditorPanel.tsx:953-981` draws the
read-only band only when `remote !== undefined && commit === null && remoteWriteRoot === null`, so a
tab on a machine with a folder draws **no band at all** and is the local tab. That is the rule already
built.

**What it could not read, and the builder must.** The probe's tree walk never found a row: the
Explorer sidebar answered `EXPLORER` and nothing else within 30 s on BOTH the remote and the local
project, so the no-root button titles and the editor band were not read off the live DOM. That is the
probe's defect, not the product's — `[role="treeitem"]` is the wrong selector or the wait is too
short. The builder's probe needs a tree-row reader that works, and `.p224/probe-p224e.mjs` already
has one that read both trees side by side.

**The surface nobody has ever driven is the redline on a remote tab, and reading the source says it
is reachable and its write is not.**

- `store.ts:508` sets `canDiff: wantsDiff || commit !== null || req.remote !== undefined`, so a remote tab has `canDiff` true.
- `EditorPanel.tsx:240` offers the Redline chip on `isRedlinePath(tab.path) && (tab.canDiff || redlineWithoutHead(tab))`, so a remote `.md` **is offered Redline**, and 698's `needsHead` falls back only when `canDiff` is false, which it is not.
- `baseline.ts:212-221` `redlineWithoutHead` requires `tab.remote === undefined`, so the remote redline draws against HEAD rather than a baseline.
- Nothing in `redline-typing.ts`, `redline-accept.ts`, `redline-commands.ts`, `redline-current.ts`, `redline-press.ts` or `RedlineDocument.tsx` names `remote` at all.
- `RedlineDocument.tsx:374-382` composes the press with `root: live.repoPath, path: live.path`, which on a remote tab are **far-side paths**, and `redline-write.ts:117` hands them to `bridge.fs.writeGuarded`, which is the LOCAL channel Phase 226 built.

So a rewind or an undo pressed on a remote tab aims a local guarded write at a path on the other
machine. What it answers is unmeasured. The shape is the one research 85 §2 already found for Reveal
on the tab strip — *"Both machines' home directory is `/Users/gdc`, so a colliding path reveals the
wrong file"* — and here the verb writes rather than reveals. **This is the charter's item 2 clause
"which no remote drive has ever touched", and it is still untouched. The builder drives it.**

---

## 8. The gates at the parent, run to log files

Every one green on `cbadcd91`, in `/private/tmp/wt-p242`, logs under `.p242/logs/`.

| gate | exit | log |
|---|---|---|
| `npm run typecheck` | 0 | `typecheck.log` — 1,219 production files, 6,858 imports, 0 violations |
| `npm run build` | 0 | `build.log` — includes `gate:electron` (99 of 99 against the floor), `gate:background` (19 of 19 fixtures), `gate:knownhosts` (36 fixtures, 32 that must fail), `gate:cache-policy`, `contract-inventory` byte identical to `docs/audits/contract-baseline.txt` |
| `npm run conformance:machines` | 0 | `conf-machines.log` — "PASS. A machine confirmation is bound to the six fields that decide what runs… Nothing was started by this gate." |
| `npm run conformance:remoteclose` | 0 | `conf-remoteclose.log` — 11 passed |
| `npm run gate:knownhosts` | 0 | `gate-knownhosts.log` — 19 scripts reach `build/ssh-run.mjs` |
| `npm run smoke:t1` | 0 | `smoke-t1.log` — 6/6 PASS |

`npm run build` runs `gate:electron`, `gate:background` and `gate:knownhosts` itself, so a build that
passes cannot skip them. **The electron-teardown floor reads 99 today.** A Phase 242 probe added
under `build/` raises it in the same commit, and Phase 241 is in flight touching
`build/assert-electron-teardown.mjs` — section 10.

---

## 9. The smallest set of files the builder must touch

The entry says a clean rehearsal ships a probe, a research document and a checklist and no product
change. The rehearsal is **not** clean, so this list has two halves.

### The rehearsal, which is the phase whatever else happens

| file | why |
|---|---|
| `build/probe-p242-write-path.mjs` (new) | the one app run. It must reach `build/electron-run.mjs`, and **it raises `HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` from 99 in the same commit** |
| `.p242/far-fixture-p242.mjs` → `build/p242/far-fixture.mjs` | the scratch repository, the local git identity, the sibling and the symlink. It is written and driven; it needs promoting out of the phase directory if the probe is to live under `build/` |
| `docs/research/103-*.md` (new) | the rehearsal's own readings, this document being its parent half |
| `docs/ACCEPTANCE-p242.md` or the equivalent (new) | the checklist item 4 names, in his terms |
| `docs/BACKLOG.md` | the running log line, appended, never reordered |
| `CHANGELOG.md` | only if a product change lands |

### If the symlink finding is fixed in this phase

| file | change |
|---|---|
| `src/main/machines/remote-scripts.ts` | `FILE_PUT` (2305), `DIR_NEW` (2451) and `ENTRY_RENAME` (2544), one refusal line each, asked on the far side in the same call. **A changed script text is a contract change**: `build/conformance-machines.mjs` pins the catalogue and every script's shape |
| `src/main/machines/remote-file.ts` | the header paragraph at 43-47, which currently states the uncovered case as permanent, and a new outcome word if one is added |
| `src/shared/ipc/machines.ts` | only if a new outcome word is added to `MachineFilePutOutcome`. **That is a contract line and `docs/audits/contract-baseline.txt` is regenerated in the same commit** |
| `src/renderer/machines/explorer.ts` | the sentence for a new outcome word |
| `build/conformance-machines.mjs` | the arm that proves it, which must go red under ablation |

### If the two wrong sentences are fixed

`src/main/machines/remote-copy.ts:1011` and `src/renderer/machines/scm.ts:34`, one sentence each, plus
whatever pins them: `src/renderer/app/__tests__/p903-c-remote-copy.test.ts:835` holds one verbatim.

### Files this phase must NOT touch

`src/renderer/settings/MachineRow.tsx`, `src/renderer/app/RemoteDirPicker.tsx`,
`src/main/machines/confirm.ts` — the entry forbids write-root UI work and the confirm gate does not
move. His `machines.json` and `config-confirmations.json` are read-only forever.

---

## 10. Where a rebase will conflict

Three worktrees are live on this machine right now.

| worktree | HEAD | files it holds |
|---|---|---|
| `/private/tmp/wt-p235` | `fcddccb4` "fix(editor): a tab on another machine offers no Reveal and copies the machine" | `src/main/machines/prepare.ts` (modified, uncommitted), `src/renderer/editor/EditorTabs.tsx`, `src/renderer/editor/tab-menu.ts`, `src/renderer/editor/__tests__/p235-tab-menu-remote.test.ts` |
| `/private/tmp/wt-p241` | `35231b96` | **`build/assert-electron-teardown.mjs`**, `build/probe-p241-menu.mjs`, `build/p241/*`, `src/renderer/editor/use-editor-menu.ts`, `src/renderer/editor/reshape.ts` |
| `/private/tmp/wt-p240` | `1f03cda3` | `docs/BACKLOG.md` only |

**The two that will bite:**

1. **`build/assert-electron-teardown.mjs`.** Phase 241 has already raised `HELPER_USER_FLOOR` and Phase 242 will raise it again for its own probe. That is one integer on one line and it conflicts every time. Whichever lands second takes the higher number.
2. **`docs/BACKLOG.md`'s running log.** Phase 240 is sitting on it and every phase appends to the same last line. The rule is append, newest last, never reorder — a conflict here is resolved by keeping both lines in date order, never by taking one side.

**Phase 235 is the other remote phase in flight** and it is fixing exactly the tab-strip Reveal and
Copy Path defect research 85 §2 named. It touches `src/renderer/editor/EditorTabs.tsx` and
`tab-menu.ts`. Phase 242 does not need either file — unless the redline finding in section 7 turns
into a fix, in which case `src/renderer/editor/` is contested and the two phases should be sequenced
rather than merged.

---

## 11. What this step did on his machines

**The Mac Pro.** `-L gmux` held exactly one session before and after every one of the four runs:
`gmux-control`, created **Thu Aug 27 21:18:51 2026**, attached, unchanged. One socket in
`/private/tmp/tmux-501`, `gmux`, dated 27 August — **no `gmux-p242-*` socket survives**, and the one
that a run left behind was ended and unlinked by hand within minutes, which is Phase 224's committer's
rule applied. `ls -d /Users/gdc/tortie-p242-*` answers nothing. `ps` finds no process of this phase;
the two tmux processes there are the ones that were there at the start, being the Tortie-bundled
server from 27 August and the `/usr/local/bin/tmux` client holding `gmux-control`. His `~/.gitconfig`
is 140 bytes with a May 2024 mtime, untouched. His `~/.ssh` holds only `authorized_keys` at 88 bytes
with an 18 August mtime, and there is still no `known_hosts` on that machine at all. Every write went
into three paths per run, all carrying this run's own `tortie-p242-scratch-<pid>` prefix, and all
three were removed in a `finally`: `ROOT-GONE SIBLING-GONE OUTSIDE-GONE`, four times out of four.

**This Mac.** `-L gmux` held 19 sessions before and after every run, listed only. No `gmux-p242-*`
socket remains under `/private/tmp/tmux-501`; one run's server outlived its Electron and was ended and
unlinked, and the two probes written afterwards end and unlink in their own `finally`. No Electron of
this step is running. Tortie's own record file is 113 bytes and `~/.ssh/known_hosts` is 2,215 bytes,
both unmoved across all four runs. His live manifest, his keychain and his `~/Library/Application
Support/Tortie` were read and never written. No agent turn was started on either machine and no token
was spent.

**One thing to hand on.** `build/electron-run.mjs` kills the scratch tmux server it started and does
not unlink the socket, and in one run here it did not end the server either — a vendored tmux was
still holding `gmux-p242-20330` after the helper's teardown reported success. That is the same class
as the ten dead sockets Phase 224 left on his Mac Pro. It is not Phase 242's charter and it is
recorded here so the next round can find it.

---

## 12. The probes this step wrote

All under `/private/tmp/wt-p242/.p242/`, readings under `results/`, logs under `logs/`.

- `far-fixture-p242.mjs` — the scratch repository, the local git identity, the sibling `<root>x` with its victim, the symlink out; `setupFar`, `readFar` and `teardownFar`, each refusing any path that is not this run's own prefix.
- `probe-p242-parent.mjs` — four launches: confirm, the verbs with no root, allow writes, then every verb and all ten attack arms. `results/p242-parent-69504.json` is section 5.
- `probe-p242-noroot.mjs` — two launches, the row he actually has. `results/p242-noroot-57026.json` is section 4.
- `probe-p242-faces.mjs` — the side-by-side attempt; its tree walk did not populate and section 7 says so. `results/p242-faces-36171.json`.
- `far-socket-clean.mjs` — ends and unlinks one `gmux-p242-<pid>` socket on the far side, refusing any other name.
- `far-final.mjs` — the closing count section 11 was read from.
