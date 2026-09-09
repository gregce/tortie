# 104. Phase 242.1 — the cwd through a link, starting measurements

**Measure step. Nothing was built.** This file is the reading of the tree the charter cites, the
parent reading taken on the operator's own Mac Pro over the real link, the gates at the parent, and
the one measurement the charter says the phase must take before it chooses its mechanism.

The charter is `docs/BACKLOG.md`'s `## Phase 242.1` entry. The measurement it is built on is
`docs/research/103-phase-242-the-rehearsal.md` section 5.

---

## 0. The headline, in four lines

| what | reading |
|---|---|
| the parent defect, on his Mac Pro | `git-stage` through a link answered **`done`**, with `repoPath` `/Users/gdc/tortie-p242-scratch-16149x` and `writeRoot` `/Users/gdc/tortie-p242-scratch-16149` **in the same answer**, and the outside repository's staged list moved from `""` to `"dirty-link.txt,"` |
| the commit arm | `refused` on the sha guard, not on containment, and the refusal **handed back the outside repository's own HEAD** `89875a9df7d3e25ec5cd511a2a4b39405967c582`, which is the value a real tab would have held |
| **Answer B refuses nothing** | `git rev-parse --show-toplevel` prints a PHYSICAL path, so `$1` is already resolved and `cd "$1"; pwd -P` equals `$1`. Measured on his own machine: `PWD_P_EQUALS_DOLLAR_ONE=yes` |
| the cost B was supposed to have | zero paths of his resolve through a link on either machine, so the cost question the charter asks is answered and is moot at the same time |

**So the choice the charter leaves open is settled by measurement rather than by taste: Answer A.**
Section 5 says what Answer A has to be, because the charter's one-line description of it does not fit
these three scripts either.

---

## 1. Every file:line the charter cites, checked against the tree at `93bdaaec`

| the charter says | the tree says | drift |
|---|---|---|
| `rootHolds` in `src/main/machines/remote-stage.ts:220` | the declaration is line **219**; line 220 is its first body line | one line, harmless |
| it "compares path TEXT the way `relativeUnderRoot` does" | `remote-stage.ts:219-227` — `posix.resolve` on both, then a prefix compare with the separator. `posix.resolve` removes `.` and `..` and follows nothing | none |
| `INDEX_WRITE_HEAD` takes `$1` as the repository and `$2` as the path list | `remote-scripts.ts:2818-2833`. `$1` is checked absolute and free of `..`, each element goes through `INDEX_PATH_GUARD`, then `cd "$r"` | none |
| `GIT_COMMIT` takes three values already | `remote-scripts.ts:2977-2999`, catalogue row `params: 3` at `remote-scripts.ts:3406-3412` | none |
| `noLinkWalk` closed the same shape on the three path verbs | `remote-scripts.ts:2277-2288`, called at `:2435` (`file-put` `$2`), `:2617` (`dir-new` `$2`) and `:2712-2713` (`entry-rename` `$2` and `$3`) | none |
| `conformance:machines` pins the catalogue's shape, the per-script parameter counts and the writer list | condition 36 at `conformance-machines.mjs:3084-3100` (a script may not read a `$N` above its `params`, and may not declare one it never reads); condition 85 at `:7457` (`git-stage` and `git-unstage` must be `params: 2`); condition 86 at `:7675` (`git-commit` must be `params: 3`); the writer order at `:7440` and `:7696` | none |
| condition 80's scope already puts a repository's own index outside the sentence | `conformance-machines.mjs:6894-6904` and the printed paragraph at `:7045` | none |
| the probe's `a10` and `a11` arms exist and print what they read | `build/probe-p242-write-path.mjs:140-141` (recorded, not graded), driven at `:710-711`, printed at `:1130-1146` | see below |
| `docs/audits/contract-baseline.txt` does not move | the baseline carries channels, env names, storage keys and smoke modes. Script `params` are in none of them, and neither answer adds an outcome word or a channel | none |

**One drift worth naming in the probe.** The printed defect sentence and the grading are both inside
`if (ONLY === '')`, so a verifier who runs `P242_ONLY=D` gets neither. The parent reading has to come
from a whole run, or be read out of `.p242/results/p242-rehearsal-<pid>.json`.

**One drift worth naming in the charter.** Answer A is described as "let the far side run
`noLinkWalk` over the part below it, which is exactly what the three path verbs already do".
`noLinkWalk` walks a RELATIVE path below `$1`, and these three verbs have no such relative part in a
spelling both sides agree on: the confirmed folder is stored as the person gave it and the repository
root arrives already resolved by that machine's own git. Section 5 says what Answer A has to be
instead, and it is the remedy `remote-stage.ts:77-82` and `remote-scripts.ts:2775-2786` have both
already written down for the round that takes it.

---

## 2. The data flow, in ten lines

1. A press on a remote Source control row calls `useRemoteChanges`'s `stage`, `unstage` or `commit`
   in `src/renderer/scm/remote-changes.ts`, which sends `cwd: target.path` — **the tab's own folder,
   as the person opened it** (`:496`, `:578`, `:665`).
2. `machines:stage`, `machines:unstage` and `machines:commit` land on `stageOnMachine`,
   `unstageOnMachine` (`remote-stage.ts:360-378`) and `commitOnMachine` (`remote-commit.ts:354`).
3. `confirmedWriteRoot(machineId)` (`remote-file.ts:235-254`) asserts the confirm gate and returns
   the sixth confirmed field `writeRoot` **as the person typed it**; null is `writesOff` / `refused`.
4. `rootHolds(writeRoot, input.cwd)` (`remote-stage.ts:219`) compares two path TEXTS. A cwd of
   `<confirmed folder>/escape-link` resolves textually under the folder, so it **passes**.
5. `reviewFilesOn({machineId, cwd})` sends `review-list` with `$1 = cwd`; the far side runs
   `cd "$1"` — which **follows the link** — then `git rev-parse --show-toplevel`
   (`remote-scripts.ts:766-767`).
6. git prints a **physical** path, so `list.repoPath` is the repository OUTSIDE the confirmed folder.
   Main never compares it to `writeRoot`, and `remote-stage.ts:50-66` says why: doing so refused
   every stage when it was tried on 2026-08-21.
7. Layer 4 checks every asked path against the set that same read reported, so the outside
   repository's own changed files all pass (`remote-stage.ts:471-494`).
8. `chunkIndexPaths` measures the composed bytes with the real composer, then
   `runRemoteWrite(ctx, 'git-stage', [list.repoPath, chunk])` sends it (`:497-516`); commit sends
   `[list.repoPath, guard, message]` (`remote-commit.ts:466-472`).
9. On the machine, `INDEX_WRITE_HEAD` checks `$1` is absolute and holds no `..`, guards each path
   element, `cd "$1"`, and runs one `git add`; `GIT_COMMIT` does `cd "$1"`, its HEAD guard, and one
   `git commit`.
10. **Nothing in that chain ever names the confirmed folder to the far side**, so the index that
    changes is the outside repository's, and the answer Tortie draws names the confirmed folder
    beside it.

---

## 3. Which probe, and which parts of it, take the parent reading

- **`build/probe-p242-write-path.mjs`, run whole.** Its `a10-stage-through-link` and
  `a11-commit-through-link` arms are exactly this phase's subject. They are `outcome: null` in
  `ATTACK_ARMS` (`:140-141`), which is RECORDED rather than graded, and this phase's first mechanical
  act is to give them an expected outcome and a far-side key. The far-side half already exists:
  `readFar` prints `siblingStaged` and `siblingCommits`, read by an `ssh` Tortie did not compose.
- **`build/p242/far-fixture.mjs`** already plants every piece the two arms need — `escape-link`
  pointing at the sibling repository, and `dirty-link.txt` inside it, which exists so `a10` and `a6`
  cannot grade each other through one shared `git diff --cached` reading.
- The task brief's reference to `.p224/` is stale boilerplate. **There is no `.p224/` in this tree**;
  the last rule of `.gitignore` hides every phase working directory, which is why Phase 242 promoted
  its fixture to `build/p242/far-fixture.mjs` so the probe beside it could be committed.
- **`src/main/machines/__tests__/p242-link-refusal.test.ts` is the local half and has no arm for
  these three verbs.** It runs the shipped script strings under `/bin/sh` over real links on real
  disks (`run()` at `:95-105`) and covers `file-put`, `dir-new` and `entry-rename` only. An arm there
  is how this phase's parent reading becomes reproducible on any machine with no network at all, and
  it is the cheapest place a fix round can be held honest.
- **`npm run conformance:machines` condition 88** covers three scripts and four walks
  (`WANTED` at `conformance-machines.mjs:8032-8036`). The three git verbs are in none of them.

---

## 4. The parent reading, on his Mac Pro, over the real link

Taken at `93bdaaec` with `node build/probe-p242-write-path.mjs`, four launches on one scratch
profile, the real host, a write root at a real absolute path under his real home, his own row read
and never written. Report: `.p242/results/p242-rehearsal-16149.json`. `findings: []`, which is the
point — **everything Phase 242 fixed is still fixed, and the thing it named is still there.**

### The two arms this phase exists for

```
a10-stage-through-link   outcome "done"
  {"outcome":"done","paths":1,"chunks":1,
   "repoPath":"/Users/gdc/tortie-p242-scratch-16149x",
   "writeRoot":"/Users/gdc/tortie-p242-scratch-16149", ...}

a11-commit-through-link  outcome "refused"
  sentence: "What that folder on that machine holds changed while this panel was open,
             so Tortie committed nothing. Press Refresh and read the changes again."
  headSha: 89875a9df7d3e25ec5cd511a2a4b39405967c582
```

The far side, read by an `ssh` Tortie did not compose:

| far-side key | before the attack | after |
|---|---|---|
| `siblingStaged` | `""` | **`"dirty-link.txt,"`** |
| `siblingCommits` | `1` | `1` |

**Three things in that reading are stronger than the charter's own account.**

1. **Tortie's own answer already holds both halves.** `a10` returns `repoPath` and `writeRoot`
   side by side, and `repoPath` is not under `writeRoot`. Main has the evidence of its own escape in
   the object it hands the renderer, and nothing looks at it.
2. **`a11` refused on step 6 and not on step 3.** The sentence is `COMMIT_SHA_DISAGREED`, and the
   `headSha` it handed back is **the outside repository's own HEAD**. A tab really opened at the link
   would have drawn that sha, so the guard would have been satisfied and the commit would have
   landed there. The probe now prints the exact sha the attack needs, so the phase's independent
   method one — a commit driven with the guard satisfied — costs one line rather than a new fixture.
3. **The pair is the evidence and neither half is.** `a6-stage-outside`, which aims at the sibling
   by its own name, answers `outsideRoot` with `repoPath: ""` and contacts the machine not at all.
   The same repository reached through a link answers `done`. The difference between the two arms is
   the whole defect.

### Everything else at the parent, recorded because a phase should know what it must not break

| verb | outcome | ms |
|---|---|---|
| `putFile` new | `wrote` | 111 |
| `makeDir` | `made` | 35 |
| `renameEntry` | `moved` | 32 |
| move across folders | `moved` | 35 |
| `stage` | `done` | 121 |
| `unstage` | `done` | 113 |
| `stage` again | `done` | 92 |
| `commit` | `committed` | 226 |

Fifteen graded attack arms all held, two recorded, `findings: []`.

---

## 5. The choice the charter leaves open, and the measurement that settles it

### Answer B is not a wide refusal. It is not a refusal at all.

The charter's Answer B is "comparing `pwd -P` against `$1` after the `cd`". **`$1` is
`list.repoPath`, and `list.repoPath` is what that machine's own `git rev-parse --show-toplevel`
printed, which is a path with every link already resolved.** So `cd "$1"; pwd -P` returns `$1`
unchanged, always, and the comparison can never fail.

Measured on **his Mac Pro**, git 2.39.5, inside a scratch repository this run made and removed:

```
PWD_LOGICAL          /Users/gdc/tortie-p242-1-scratch-6338/escape-link
PWD_PHYSICAL         /Users/gdc/tortie-p242-1-scratch-6338x
SHOW_TOPLEVEL        /Users/gdc/tortie-p242-1-scratch-6338x
PWD_P_OF_TOPLEVEL    /Users/gdc/tortie-p242-1-scratch-6338x
PWD_P_EQUALS_DOLLAR_ONE   yes
RESOLVED_CONFIRMED_ROOT   /Users/gdc/tortie-p242-1-scratch-6338
RESOLVED_CWD              /Users/gdc/tortie-p242-1-scratch-6338x
```

Re-derived on **this Mac**, git 2.50.1, over an independent fixture: from inside `root/escape-link`,
`git rev-parse --show-toplevel` prints the sibling and `pwd -P` prints the sibling.

**So B costs nothing and buys nothing, and a round that shipped it would have shipped a line that
cannot fail.** That is worth more than the cost number the charter asked for, and the cost number was
taken anyway:

| where | paths asked | resolve through a link |
|---|---|---|
| this Mac, every project row and every distinct session `cwd` in his live manifest | 29 asked, 26 exist | **0** |
| his Mac Pro, `$HOME` itself, its 14 direct children, and every git repository directly under it | 14 children, 2 repositories | **0** links, **0** repository paths that resolve to something else |

### So the answer is A, and A has to be the remedy the headers already wrote down

Two module headers in this domain already carry it, word for word, for the round that takes it:

- `remote-stage.ts:77-82` — "Give both scripts a third positional carrying the confirmed folder,
  resolve it over there with `w=$(cd "$3" 2>/dev/null && pwd -P)`, and refuse unless
  `case "$1" in "$w"|"$w"/*) : ;; *) exit 1;; esac`. That compares two paths the far side resolved
  itself, which is the only place the comparison can be exact."
- `remote-scripts.ts:2775-2786` — the same remedy, with "It is not built, because the entry rules
  two."

**That is a resolution and it is not the resolution the standing refusal forbids.** The refusal is
against main resolving a far-side path, and against a second round trip whose answer can be stale by
the time the write lands. `cd "$3" && pwd -P` is a shell builtin, inside the same call that would
otherwise have written, which is exactly what `noLinkWalk` is and exactly what both headers already
call "no extra process". The phase brief should say that out loud, because a reader can otherwise
read the charter's "no resolution of a far-side symlink" as forbidding the only mechanism that works.

### The sub-choice inside A, and it matters more than the parameter count

**What should be bounded, the repository root or the tab's cwd?** They are not the same question and
the tree already has a stated limit that makes them differ.

| bound | refuses the escape? | what else it does |
|---|---|---|
| resolved **repository root** under the resolved confirmed folder | yes | **also refuses a case that works today.** `remote-stage.ts:68-75` states it: a person who confirms `~/code/api/src` and opens a tab there is in a repository rooted at `~/code/api`, which is not under the confirmed folder. Both verbs would stop working for them |
| resolved repository root, two-way (either path a prefix of the other) | yes for this fixture | keeps that case, and leaves one shape open: a link whose target repository is an ANCESTOR of the confirmed folder |
| resolved **tab cwd** under the resolved confirmed folder | yes | keeps the `~/code/api` case exactly as it is, and closes the ancestor shape too. It costs one more positional, because the cwd does not currently travel: after `cd "$1"` the cwd is gone |

The measured numbers for the third row are already in this file: `RESOLVED_CWD` is the sibling and
`RESOLVED_CONFIRMED_ROOT` is the root, so the comparison refuses. **This is the phase's real design
decision and it should be made in the brief, with the `~/code/api` case named, rather than in a
commit.**

**A third answer exists and is named so the phase can refuse it deliberately.** `review-list` is
already a far-side call in the same sequence, one round trip before the write. Teaching it a second
positional carrying the confirmed folder and one more answer field — `$(cd "$2" && pwd -P)` — would
let main compare two resolved paths itself, with no extra process and no extra round trip. It is
probably wider than A, because `review-list` is a READ with many callers and its answer shape is
pinned, but it is the only shape that puts the whole decision back in main where the other four
layers live.

### What no answer here changes

The word printed is `outside`, mapped onto the refusal each verb already has — `outsideRoot` for the
two index verbs and `refused` for commit — so no outcome word crosses the channel, no sentence is
written, and `docs/audits/contract-baseline.txt` does not move. That was checked rather than assumed:
the baseline holds channels, env names, storage keys and smoke modes, and script `params` are in none
of them.

---

## 6. The gates at the parent, all green

Written to log files rather than piped to `tail`.

| gate | verdict |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, contract inventory byte identical, `gate:electron` and `gate:background` inside it |
| `npm run smoke:t1` | exit 0, 6 of 6 |
| `npm run conformance:machines` | exit 0. "a symbolic link inside the confirmed folder is not a way out of it… four walks over three scripts… 10 of 10 planted texts made the readers above say so" |
| `npm run conformance:remoteclose` | exit 0, 11 tests |
| `npm run gate:knownhosts` | exit 0. 314 files under `build/` read, 19 scripts reach `build/ssh-run.mjs`, 36 fixtures of which 32 must fail and every one did |

---

## 7. The smallest set of files the builder must touch

Under Answer A. Ordered by how load-bearing each one is.

1. **`src/main/machines/remote-scripts.ts`** — the new positional in `INDEX_WRITE_HEAD` and in
   `GIT_COMMIT`, the refusal itself, the three catalogue rows' `params`
   (`git-stage` 2→3, `git-unstage` 2→3, `git-commit` 3→4 for the confirmed folder alone; one more
   each if the cwd travels too), and the headers at `:2775-2786` that currently say the gap cannot be
   closed.
2. **`src/main/machines/remote-stage.ts`** — the argv at the one `runRemoteWrite` (`:508-516`) AND
   at `chunkIndexPaths` (`:282-286`), because the chunker measures composed bytes with the real
   composer and a chunk that fits must still fit; plus the header sections at `:50-102`, which are
   four paragraphs about a check the far side cannot make.
3. **`src/main/machines/remote-commit.ts`** — the argv at `:466-472` and the header at `:24-60`.
4. **`build/machines-conformance-probe.mts`** — the `params` it emits for conditions 85 and 86
   (`:2029`, `:2194`), and a new block beside `phase242` (`:2983`) carrying the three script texts
   and no verdicts, which is condition 88's own rule.
5. **`build/conformance-machines.mjs`** — condition 85's `row.params !== 2` (`:7457`), condition
   86's `row.params !== 3` (`:7675`), the printed "WHAT THE FAR SIDE CANNOT CHECK" paragraph
   (`:7512-7516`), condition 80's printed scope paragraph (`:7043-7048`) if the wording moves, and
   the new arm beside condition 88 with an ablation per clause.
6. **`src/main/machines/__tests__/p242-link-refusal.test.ts`** — arms that run the three shipped
   script strings under `/bin/sh` over real links, which must be red at the parent. This is where the
   parent reading becomes reproducible with no machine.
7. **`src/main/machines/__tests__/p104-remote-commit.test.ts:336`** — `expect(ran[0]?.args)
   .toEqual([REPO, HEAD, 'a message'])` goes red the moment the argv grows, and so do the argv
   assertions in `p103-remote-stage.test.ts` at `:398`, `:426` and `:467`.
8. **`build/probe-p242-write-path.mjs`** — `a10` and `a11` promoted from `outcome: null` to graded
   in `ATTACK_ARMS`, a far-side key asserting `dirty-link.txt` is NOT in `siblingStaged`, and `a11`
   driven with the HEAD the outside repository really reports so it is refused on containment rather
   than on the sha. `--self-test`'s fixtures move with them.
9. **`docs/BACKLOG.md`** running log, and this file's successor if the phase writes one.

**What must NOT be touched:** `file-put`, `dir-new`, `entry-rename` and their `noLinkWalk`, per the
charter's own refusal; `relativeUnderRoot`; the confirm hash and `APPENDED_KEYS`; any renderer
surface, because the refusal lands on sentences both verbs already draw.

### Where a rebase will conflict

- **Phase 242.2 is the real one.** It edits `src/main/machines/remote-scripts.ts` (the `IMAGE_PUT`
  literal and the header paragraphs around `noLinkWalk`) and adds "an arm on `conformance:machines`
  beside condition 88", which is the same region of `build/conformance-machines.mjs` and the same
  `phase242` block of `build/machines-conformance-probe.mts` this phase extends. Whichever lands
  second rebases through both files. The two changes are independent in effect — 242.2 is
  `rm -f "$t"` and `set -C` inside `IMAGE_PUT`, this phase is a positional on three other scripts —
  so the conflicts should be textual rather than semantic.
- **`docs/BACKLOG.md`'s running log** will conflict with 242.2, 243 and 244, at the tail, every
  time. The convention resolves it: append newest last, keep both lines in date order, never
  reorder.
- **Phase 243** (the durable baseline) and **Phase 227/225** (the redline) live in
  `src/renderer/editor/**` and `src/main/durable/**` and touch nothing here.
- **Phase 244** (the audit's six findings) is unscoped enough to touch anything; its F1 is the
  reopened tab, which is not this domain.

---

## 8. What this run did on his machines

**The Mac Pro.** `-L gmux` held exactly one session before and after every step: `gmux-control`,
listed only, never signalled. `/private/tmp/tmux-501` held `gmux` before and after and this run
started no tmux server there. `~/.gitconfig` read 140 bytes before and after and `~/.ssh` held
`authorized_keys` alone on both sides; the two scratch repositories set their identity with
`git config --local` inside themselves. Three far-side write sequences ran, each under a path
carrying its own `tortie-p242-scratch-<pid>` or `tortie-p242-1-scratch-<pid>` prefix, each refused by
a regular expression before a byte of shell was composed, and each removed in a `finally`:
`ROOT-GONE SIBLING-GONE OUTSIDE-GONE` from the probe and `ROOT-GONE SIBLING-GONE` from the
`show-toplevel` measurement. `ls -d /Users/gdc/tortie-p242-*` and `ls -d /Users/gdc/tortie-p242-1-*`
both answer nothing. **Left on the far side when this run finished: no process, no socket, no
directory.**

**This Mac.** `-L gmux` held 20 sessions before and after, listed only. The probe's scratch socket
`/private/tmp/tmux-501/gmux-p242-16149` was ended AND unlinked in its own `finally`, and no
`p242` socket is left. Electron count returned to his own 14. Tortie's own record file is 113 bytes
and `~/.ssh/known_hosts` is 2,215 bytes, both unmoved. His `config/machines.json` was read and
**still carries no write root**, because setting one is his act. His manifest was copied to read the
project rows and never opened for writing. Every `ssh` went through `build/ssh-run.mjs`.

**No agent turn was started on either machine and no token was spent.**

---

## 9. What this measure step did not do

- It did not drive `a11` with the guard satisfied. That is the phase's own independent method one,
  and the sha it needs is now printed.
- It did not measure whether a link whose target repository is an ANCESTOR of the confirmed folder
  is reachable. It is named in section 5 as the shape that tells the two-way test from the cwd test,
  and the phase should measure it rather than reason about it.
- It did not read the remote face and the local face side by side. Phase 242 measured that set empty
  and this phase adds no surface, so the operator's rule of 2026-09-07 is a refusal to add copy here
  rather than a reading to retake — unless the fix draws a sentence, in which case it must be the one
  both verbs already draw.
