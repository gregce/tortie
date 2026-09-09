# 105. Phase 242.2 starting measurements — the staged name for a picture, at the parent

Measure step for Phase 242.2, "the staged name for a picture". Written 2026-09-08 against the tree
at `93bdaaec` in the worktree `/private/tmp/wt-p242-2`, driven against
`gregs-mac-pro.tail2ddfe1.ts.net` over the real link under the bounds every remote phase has
inherited since Phase 224.

This document builds nothing. It reads the tree the charter cites, takes the parent readings on his
Mac Pro, records the gates green at the parent, and names the smallest set of files the builder has
to touch.

**The headline.** The charter's table reproduces exactly, three ways: locally over a scratch `HOME`,
on his Mac Pro's own shell over the real link, and — the reading the charter reserved for the
builder's first independent method — **through Tortie's own `machines.putImage` from a renderer, on
his Mac Pro, at the parent commit.** A symbolic link and a hard link planted at `$d/$1.part` each
carried the picture's bytes into a file outside `~/.tortie/images`, and both answered
`outcome: "added"`, `refusal: null`, with `remotePath` naming a file inside `~/.tortie/images` that
was not where the bytes went. Section 5 has the readings.

**The finding the charter did not have, and it changes mechanism item 2.** The charter asks for a
gate arm that "must go red under ablation of EACH clause on its own — the first `rm -f`, the second,
and `set -C`". Measured over six machine dialects and plant shapes, **`set -C` cannot be made red by
any behavioural arm** and the first unlink can only be made red on a machine dialect no existing arm
drives. Section 6 has the matrix, and it re-derives the charter's own cited claim about `file-put`
against `p242-link-refusal.test.ts` rather than quoting it.

---

## 1. The charter's citations, checked line by line

Every claim in the Phase 242.2 entry was opened in this tree. **All of them are exact.** There is no
drift to report, which is unusual for this file and is worth saying plainly: the entry was written
by Phase 242's committer against the same tree, hours before.

| The entry says | Read at | Verdict |
|---|---|---|
| `IMAGE_PUT` writes with `printf '%s' "$2" \| base64 -d > "$t"`, `t="$f.part"`, `f="$HOME/.tortie/images/$1"` | `src/main/machines/remote-scripts.ts:723-746` (the array), `726`, `728`, `732`, `733` | **Exact, byte for byte.** |
| "There is no unlink in front of it, no `set -C`, and no `[ -L ]` test" | same lines | **Exact.** The 589-byte text names no `rm`, no `set -C` and no `-L`. |
| "`IMAGE_PUT`'s header carries the measurement" | `remote-scripts.ts:695-722` | **Exact.** The paragraph beginning "## Why the Phase 242 fix round did NOT reach this script, said out loud" states the symlink and hard-link readings, retracts the earlier reasoning sentence by name, and says the fix is queued as Phase 242.2. |
| `putImagesOnMachine` at `src/main/machines/remote-image.ts:338` never asks `confirmedWriteRoot` | `remote-image.ts:338` is the `export async function putImagesOnMachine(` line | **Exact.** `confirmedWriteRoot` appears nowhere in that file. |
| The staged name is `remoteImageName(sessionId, sha256, ext)` | `remote-image.ts:282-290` | **Exact.** `<sanitised session id>-<first 16 hex of sha256><ext>`. |
| "the directory is made at mode 700 by the script itself" | `remote-scripts.ts:727` | **Exact**, and see the limit in §5.4: the `chmod 700` is inside `if [ ! -d "$d" ]`, so a directory that already exists keeps whatever mode it has. |
| "the same two lines `file-put` already carries" | `remote-scripts.ts:2507-2515` | **Exact.** `rm -f "$t"`, `set -C`, the two-arm redirection with a second `rm -f "$t"` in the `else`, then `set +C`. |
| "its own else branch is why the first unlink is load bearing on a machine whose `base64` has no `-d`" | `remote-scripts.ts:2511-2513`, and the comment at 2494-2506 | **Exact as a statement about `file-put`**, and §6 measures it. |
| "an arm beside condition 88" | `build/conformance-machines.mjs:7956` and 88f at 8182 | **Exact.** Condition 88 is a text reader with ten planted texts; 88f is the fix round's half. |
| "Phase 242's fix round found that the two halves of `file-put`'s guard are held by DIFFERENT clauses and an ablation of one alone stayed green in the tests" | re-derived, §6 | **Confirmed by measurement, not quotation.** With the first `rm -f "$t"` removed, `p242-link-refusal.test.ts` is 20 of 20 green. With `set -C` removed, 20 of 20 green. Only the second unlink's removal goes red, on one arm. |

### One thing the entry does not say, and it makes the phase cheaper

**`~/.tortie` does not exist on his Mac Pro.** Read read-only before anything was driven:
`test -e ~/.tortie` → `no`, `~/.tortie/images` absent, 0 entries. So no picture has ever been put on
that machine, this run's own writes were the first, and the whole directory could be removed in the
teardown rather than picked over by name. The census is in §11.

---

## 2. The data flow, in ten lines

1. A drop lands on a terminal whose session is on a machine; `src/renderer/terminal/drop/pipeline.ts:153` `placeOnMachine` plans it and keeps only the images.
2. It calls `window.gmux.machines.putImage({ machineId, sessionId, paths })` at `pipeline.ts:171` — the ONE renderer call site in the tree.
3. The preload forwards it as `machines:putImage` (`src/preload/machines.ts:84`); the contract is `src/shared/ipc/machines/filesystem.ts:714`.
4. `src/main/machines/ipc.ts:1083` hands it straight to `putImagesOnMachine`, adding no check of its own — a machine with a registered context has already been through the confirm gate.
5. `putOneImage` (`remote-image.ts:351`) stats the file, refuses a non-file and anything over `REMOTE_IMAGE_MAX_BYTES`, reads the bytes and sniffs them; **the claimed name decides nothing**.
6. It composes the far-side name itself, `remoteImageName(sessionId, sha256(bytes), sniffed ext)`, and the payload as base64. **No confirmed write root is asked for and none exists for this verb.**
7. `runRemoteWrite(ctx, 'image-put', [name, payload])` sends the catalogue's constant script text as one quoted argument with the two values as positionals, never as a composed command line.
8. On the far side `IMAGE_PUT` resolves `d="$HOME/.tortie/images"` from **that machine's own shell**, makes it 700 if it is not there, answers `present` when `$f` exists, and otherwise stages at `t="$f.part"` and redirects the decode into it. **Nothing unlinks that name, nothing makes the create exclusive, and nothing asks whether it is a link.**
9. `chmod 600 "$t"`, `mv "$t" "$f"`, then `wc -c` and `shasum` are taken of `$f` — **after** the `mv`, so through whatever `$f` now is.
10. Main compares the printed byte count and checksum against the payload's own and, when they agree, hands back `remotePath = <far home>/.tortie/images/<name>` with `outcome: 'added'`; the renderer inserts that path into the prompt and toasts `remoteImagesCopied`.

**Where the hole is, in one line of that flow.** Step 8's redirection follows a name somebody else
planted, and step 9 then measures the payload through it, so step 10's two comparisons — the only
checks main has — agree with themselves and say the write was clean.

---

## 3. The Phase 242 probes, and what the verifier can re-run

`.p224/` is not in this worktree and never was in git (`.gitignore`'s last rule is `.p[0-9]*/`). The
Phase 242 material that IS committed and reusable:

| Committed | What the verifier can take from it |
|---|---|
| `build/p242/far-fixture.mjs` | The scratch-repository shape, `assertOurs`, the `setupFar`/`readFar`/`teardownFar` triple and the local git identity. **The shape this phase's probe copies.** It carries no image furniture, so a 242.2 probe adds its own plant and victim. |
| `build/probe-p242-write-path.mjs` | The four-launch scaffolding: `withElectron` on a scratch profile, the scratch `machines.json` plus `keyscanText` record, the settings-window confirm drive, the `[gmux-shot] probe`/`driver` marker parsing, and `remoteOnly`, the operator's-rule reader with its eight fixtures. **`ATTACK_ARMS` has no image arm** — `a9` is `file-put`'s staged name, not `image-put`'s. |
| `src/main/machines/__tests__/p242-link-refusal.test.ts` | The `/bin/sh` runner over the shipped script strings with real links on real disks, 20 arms. **This is the file the parent reading of the ablation matrix in §6 was taken from**, and the natural home for the behavioural half of 242.2's arms. |
| `build/conformance-machines.mjs` conditions 88 to 88f | The text readers `walkFor` and `stagedUnlinkFacts`, the `STAGED_UNLINK` constant, and the ten planted texts. `stagedUnlinkFacts` is generic over any script text and already trims, so **it reads `IMAGE_PUT`'s indented lines correctly with no change**. |

**What the verifier can re-run to take the parent reading of what this phase fixes**, in rising cost:

1. `.p242-2/image-put-local.mts` (this step's, §4) — the charter's table, locally, ~1 s, contacts nothing.
2. `.p242-2/image-put-clauses.mts` (this step's, §6) — the clause matrix over six dialect-and-plant arms, ~3 s.
3. `.p242-2/reading-a.mjs` (this step's, §5.1) — the shipping text on his Mac Pro over the real link with a scratch `HOME`, ~40 s, writes nothing outside its own prefix.
4. `.p242-2/probe-p242-2-parent.mjs` (this step's, §5.2) — the same through `machines.putImage` with two Electrons on a scratch profile, ~4 min. **This is the parent reading the phase must move.**

---

## 4. The parent reading, part one: the charter's table, locally

`.p242-2/image-put-local.mts` imports `REMOTE_SCRIPTS` from the shipping module — not a copy of the
array literal — and hands `image-put`'s 589 bytes to `/bin/sh` with `HOME` inside a scratch directory
removed in a `finally`. The payload is a 70-byte PNG, sha256 `c414cd0e…`, so the name is
`p2422probe-c414cd0e204de974.png`.

| arm | the script printed | the file outside `~/.tortie/images` | `~/.tortie/images/<name>` |
|---|---|---|---|
| control, nothing planted | `added 70 c414cd0e…` | `victim, untouched` | the PNG |
| a SYMLINK at `$d/$1.part` | `added 70 c414cd0e…` | **took the payload** | **a symbolic link** |
| a HARD LINK at `$d/$1.part` | `added 70 c414cd0e…` | **took the payload**, `nlink` 2 | the PNG, **same inode as the file outside** |
| the `base64 -D` fallback, nothing planted | `added 70 c414cd0e…` | — | the PNG |

The byte count and the digest are the payload's own in all three, as the charter says.

**Two facts the charter's table does not carry, and both are worse than "took the payload".**

- On the symlink arm the person's own `~/.tortie/images/<name>` **is a symbolic link and not a
  picture**. The prompt on that machine then holds a path that reads the file outside for ever.
- On the hard-link arm the landed name and the file outside **are one inode under two names**. The
  picture and the person's file are the same file from then on; a later write to either is a write
  to both, and nothing in the answer says so.

---

## 5. The parent reading, part two: his Mac Pro

### 5.1 Reading A — the shipping text on his own shell, over the real link

`.p242-2/reading-a.mjs` sends the same 589 bytes (read out of the module through `tsx`, sha
`cdbe3ea18398238d`) to `gregs-mac-pro.tail2ddfe1.ts.net` through `build/ssh-run.mjs`, with `HOME`
pointed at `/Users/gdc/tortie-p242-2-scratch-55666/home-<arm>`. His own `~/.tortie` is never named by
this half. The far side is `Darwin arm64`, `sh` at `/bin/sh`, `base64 -d` present.

| arm | the far side printed | the victim outside | landed |
|---|---|---|---|
| control | `added 70 c414cd0e…` | `victim, untouched`, `nlink` 1 | the PNG |
| a SYMLINK at `$d/$1.part` | `added 70 c414cd0e…` | **the PNG**, head empty | **a link** |
| a HARD LINK at `$d/$1.part` | `added 70 c414cd0e…` | **the PNG**, `nlink` 2 | the PNG |

Identical to §4. The escape is his machine's behaviour and not this Mac's.

### 5.2 Reading B — through Tortie, into his own `$HOME`, and this is the number the phase must move

`.p242-2/probe-p242-2-parent.mjs`, two Electrons one after the other through
`build/electron-run.mjs` on one scratch profile (`/private/tmp/p242-2-run-46074/profile`) whose
`machines.json` names his Mac Pro and whose confirmation the run gives itself in the real Settings
window. **His own row was never read for writing and never changed.** `machines.prepare` answered
`prepared`, tmux `3.7c`. The plants went into `~/.tortie/images` on his machine — the directory this
run created, because it did not exist — and both victims are files under
`/Users/gdc/tortie-p242-2-scratch-46074/outside/`.

| arm | what `machines.putImage` answered | the victim outside `~/.tortie/images` |
|---|---|---|
| a SYMLINK at the staged name | `{"remotePath":"/Users/gdc/.tortie/images/p2422probe46074-c414cd0e204de974.png","outcome":"added","refusal":null}` | **sha256 `c414cd0e…`, which is the picture's own bytes** |
| a HARD LINK at the staged name | `{"remotePath":"/Users/gdc/.tortie/images/p2422probe46074-18a15a37e8be7d42.png","outcome":"added","refusal":null}` | **sha256 `18a15a37…`, which is the second picture's own bytes**, `nlink` 2 |

And on his machine afterwards: `symLandedIsLink=yes`, `hardLandedIsLink=no` with the landed file and
the victim sharing an inode, and `~/.tortie/images` holding both names.

**So at the parent, on his own machine, through the product's own channel, a picture dropped onto a
remote session put its bytes into a file the person never named, and told them it had put them in
`~/.tortie/images`.** That is the reading Phase 242.2 must turn into two victims reading
`victim, untouched` with the two pictures in `~/.tortie/images`, the answer word unchanged at
`added`.

### 5.3 What a fix must NOT cost, measured rather than assumed

With `file-put`'s whole shape applied to `IMAGE_PUT` — `rm -f "$t"`, `set -C`, a second `rm -f "$t"`
in the `else`, `set +C` before the `chmod` — all six arms of §6's matrix answer `added` with the
picture in place, including the two the charter never mentions: **ordinary debris at the staged
name** (an interrupted upload's `.part` file, which the script's own header property 3 exists for)
and **a machine whose `base64` has no `-d`**. Nothing refuses that did not refuse before. The phase
therefore draws no new sentence anywhere, which is §7.

### 5.4 What was NOT measured, and one small thing that was

- **No Linux far side.** Both readings are macOS. The GNU `base64` dialect in §6 is a fixture script
  on this Mac, not a Linux machine, and the document says so where it is used.
- **No race.** `set -C` closes the window between the unlink and the create, and no arm here or in
  any existing test reaches it. §6 says what follows for the gate.
- **The `chmod 700` fires only when the script CREATES the directory.** Reading A's arms made
  `.tortie/images` themselves before the script ran and it stayed at 755. A pre-existing
  `~/.tortie/images` at a looser mode is never tightened. That is outside this charter and is
  recorded so it is not discovered twice.

---

## 6. Which clause holds which half, and why mechanism item 2 cannot be met as written

`.p242-2/image-put-clauses.mts` applies the whole `file-put`-shaped fix to the shipping `IMAGE_PUT`
text and then ablates each clause **on its own**, driving six arms per variant: the three from the
charter's table, ordinary debris at the staged name, an old-macOS `base64` (rejects `-d`), and that
same `base64` with debris.

| variant | control | symlink | hard link | debris | old `base64` | old `base64` + debris |
|---|---|---|---|---|---|---|
| **the shipping text (the parent)** | added | **escaped** | **escaped** | added | added | added |
| the whole fix | added | added | added | added | added | added |
| the first unlink removed | added | added | added | added | added | added |
| `set -C` removed | added | added | added | added | added | added |
| the second unlink removed | added | added | added | added | **no answer at all** | **no answer at all** |

A seventh arm, in `.p242-2/gnu-arm.mjs`, drives the GNU dialect — `base64` has `-d` and has **no**
`-D` — with ordinary debris at the staged name:

| variant | GNU `base64` + debris |
|---|---|
| the whole fix | added, picture in place |
| **the first unlink removed** | **no answer at all**, no picture |
| `set -C` removed | added, picture in place |

**What that means for the phase, stated so the builder does not discover it by failing.**

1. **The first `rm -f "$t"` IS behaviourally load bearing**, and exactly one arm shows it: a machine
   whose `base64` takes `-d` and not `-D`, with debris at the staged name. Without the unlink,
   `set -C` refuses the first redirection, the `else` unlinks and reaches for `-D`, and the save dies
   under `set -e` with no marker printed — which main reads as `IMAGE_NOT_WRITTEN`. No arm in this
   tree drives that dialect today.
2. **The second `rm -f "$t"` is load bearing** on the old-macOS dialect, which `p242-link-refusal`
   already drives for `file-put`.
3. **`set -C` cannot be shown red by any behavioural arm**, because with the first unlink in place
   the only thing it adds is refusing a name re-planted in the microseconds between the unlink and
   the create. It has to be held as TEXT, which is what `stagedUnlinkFacts(...).exclusive` already
   does with a text ablation of its own — the shape condition 88f took for `file-put`.

**The charter's cited claim about `file-put`, re-derived rather than quoted.** Each clause was taken
out of the shipping `FILE_PUT` in turn and `p242-link-refusal.test.ts` run against it (the source was
restored from the same string in every case and `git diff` is empty):

| ablation of `file-put` | `p242-link-refusal.test.ts` |
|---|---|
| the first `rm -f "$t"` removed | **20 of 20 pass** |
| `set -C` removed | **20 of 20 pass** |
| the second `rm -f "$t"` removed | 19 pass, 1 fails — *"the base64 -D arm writes too, which the exclusive create could have refused"* |

So the charter's sentence is right, and the reason is now measured: two of `file-put`'s three clauses
are held by text alone, and the same will be true of `image-put` unless the GNU-dialect arm above is
written. **The honest form of mechanism item 2 is: the escape itself and the two unlinks go red under
behaviour, `set -C` goes red under a text ablation, and the phase says which is which.**

---

## 7. The operator's rule

Nothing this phase can do adds a sentence to any face. The fix changes far-side shell text only; the
answer word stays `added`; §5.3 measured that no arm that used to succeed now refuses, so the
`IMAGE_NOT_WRITTEN` refusal path is not newly reachable. `src/renderer/terminal/drop/pipeline.ts` is
untouched and so is every sentence file. **The verifier's side-by-side reading of the remote and local
faces should therefore find exactly what Phase 242 found — `remoteOnlySentences` empty — and any
change to that set is this phase's own regression.**

`build/probe-p242-write-path.mjs`'s `remoteOnly` reader and its eight fixtures are reusable as they
stand.

---

## 8. The gates at the parent, run to log files

All green at `93bdaaec`. Logs under `.p242-2/logs/`.

| gate | time | result |
|---|---|---|
| `npm run typecheck` | — | exit 0; no runtime cycles, 1,226 production files, 4,202 edges, 0 SCCs |
| `npm run build` | 25.2 s | exit 0; `gate:electron` **floor 105**, `gate:background` 2 asynchronous starts both ended in a `finally`, `gate:knownhosts` 19 scripts, 36 fixtures, `contract-inventory` **byte identical** to `docs/audits/contract-baseline.txt` |
| `npm run smoke:t1` | 28.0 s | 6 of 6, scratch socket ended by the harness |
| `npm run conformance:machines` | 0.75 s | PASS |
| `npm run conformance:remoteclose` | 0.72 s | PASS |
| `npm run gate:knownhosts` | 0.82 s | PASS |

`npm run conformance:machines` is classified `pure` in `build/verification-checks.mjs:122` and today
spawns exactly one thing, the `tsx` probe. A run arm that hands script text to `/bin/sh` over a
scratch directory keeps that classification — `conformance:redline-write` at line 136 is the
precedent, it is `pure` and it writes real files — and a `spawnSync` is exempt from `gate:background`
by that gate's own rule, which asks only about asynchronous starts.

---

## 9. The smallest set of files the builder must touch

**Six, and two of them are the record.**

1. **`src/main/machines/remote-scripts.ts`** — three lines into `IMAGE_PUT` (`rm -f "$t"` and
   `set -C` after `t="$f.part"`, a second `rm -f "$t"` in the `else`, `set +C` before
   `chmod 600 "$t"`), and its header paragraph rewritten from a stated limit into the record of a
   fix, saying which clause holds which half (§6).
2. **`build/machines-conformance-probe.mts`** — one field, `imagePut: textOf('image-put')`, in the
   `phase242` payload at line 2983. The gate does every piece of arithmetic, which is that block's
   own stated rule.
3. **`build/conformance-machines.mjs`** — `WRITE_MUTATORS['image-put']` gains `'rm'` (line 2904), and
   a new arm beside 88f asking `stagedUnlinkFacts(imagePutText)` its three questions with its own
   planted texts, plus the run arm over `/bin/sh` in a scratch directory removed in a `finally`.
   **The three sites that already exempt `STAGED_UNLINK` need no change** — line 3758 and line 7298
   both trim and compare against the constant, and line 6997 is `file-put`-only. The site at 3306 is
   inside the `file-put` branch; the image-put branch is above it and ends at line 3213.
4. **`src/main/machines/__tests__/p242-link-refusal.test.ts`** (or a `p2422-` file beside it) — the
   behavioural arms: both link kinds, the control, ordinary debris, the old-macOS dialect and
   **the GNU dialect with debris**, which is the one that makes the first unlink red (§6).
5. **`docs/BACKLOG.md`** — the running log line, appended last.
6. **`CLAUDE.md`** — the `conformance:machines` paragraph, if the run arm lands there, because that
   paragraph currently promises the gate "starts no ssh, opens no file under the person's home,
   launches no Electron" and would now also run `/bin/sh` over a scratch directory.

### Files this phase must NOT touch

- `src/main/machines/remote-image.ts`. The name is not the defect and `putImagesOnMachine` gains no
  write root; both are refusals in the entry.
- `FILE_PUT`, `DIR_NEW`, `ENTRY_RENAME` and `noLinkWalk`. Phase 242 closed them and their gate arm
  holds them. **The GNU-dialect arm in §6 would also go red for `file-put`** — that is a real gap in
  `file-put`'s own test set, and it is recorded here as an observation for a later round rather than
  smuggled into this one.
- `docs/audits/contract-baseline.txt`. No channel, no env name, no storage key and no smoke mode
  moves, so the inventory must stay byte identical and `gate:contract` inside `npm run build` is what
  says so.
- Anything under `src/renderer/`. §7.

---

## 10. Where a rebase will conflict

**Phase 242.1 is the collision, and it is head-on.** Its charter names an arm "beside condition 88"
in `build/conformance-machines.mjs`, changes `src/main/machines/remote-scripts.ts` (either a fourth
parameter on `INDEX_WRITE_HEAD` and `GIT_COMMIT`, or `pwd -P` in both), and moves the catalogue's
per-script parameter counts, which the same gate pins. If 242.1 takes Answer A it also moves
`build/machines-conformance-probe.mts`'s script rows and
`src/main/machines/__tests__/remote-scripts.test.ts`.

| file | 242.2 | 242.1 | 243 (durable baseline) |
|---|---|---|---|
| `src/main/machines/remote-scripts.ts` | `IMAGE_PUT` + its header | `INDEX_WRITE_HEAD`, `GIT_COMMIT`, maybe `noLinkWalk` | — |
| `build/conformance-machines.mjs` | `WRITE_MUTATORS`, a new arm after 88f | a new arm after 88f, parameter counts | — |
| `build/machines-conformance-probe.mts` | one field in `phase242` | script rows, maybe `phase242` | — |
| `src/main/machines/__tests__/p242-link-refusal.test.ts` | new arms | possibly new arms | — |
| `build/probe-p242-write-path.mjs` | untouched | `a10`/`a11` become graded | — |
| `docs/BACKLOG.md` | one log line | one log line | one log line |

**The two are separable if they land in this order and keep to these seams**: 242.2's gate work goes
in a NEW block after 88f's `planted` array rather than inside it, and 242.1's goes after that.
`WRITE_MUTATORS` is a one-line change on a row 242.1 does not touch (`image-put` versus `git-stage`,
`git-unstage`, `git-commit`). The only unavoidable textual conflict is `docs/BACKLOG.md`'s running
log, which is append-only and resolves by keeping both lines in date order.

Phase 243 touches the redline and `<userData>/gmux/`; it shares nothing with this phase but the
backlog line.

---

## 11. What this step did on his machines

**His Mac Pro, `gregs-mac-pro.tail2ddfe1.ts.net`, before and after every run:**

| | before | after |
|---|---|---|
| `-L gmux` sessions | `gmux-control` and nothing else, 1 | `gmux-control` and nothing else, 1 |
| `~/.tortie` | **does not exist** | **does not exist** |
| `/private/tmp/tmux-501` | `gmux` | `gmux` |
| `~/.gitconfig` | 140 bytes | 140 bytes |
| `~/.ssh` | `authorized_keys` only | `authorized_keys` only |
| `~/tortie-p242*` | nothing | nothing |

Every far-side path this step wrote carried its own `tortie-p242-2-scratch-<pid>` prefix and was
refused by `assertOurs` otherwise; the teardowns printed `SCRATCH-GONE`, `TORTIE-GONE` and `GONE`,
`TORTIE-ABSENT`. No session was killed, none was typed into, no key was installed, `~/.gitconfig` was
never written and no token was spent.

**One thing had to be cleaned by hand, and the next probe must do it in a `finally`.**
`machines.prepare` starts a tmux server on the far side under `GMUX_TMUX_SOCKET`, so the run left
`/private/tmp/tmux-501/gmux-p242-2-46074` **on his machine** and an identically named scratch server
**on this Mac**. Both were ended and both sockets unlinked by name, refusing any name that is not
`gmux-p242-2-<pid>` (`.p242-2/far-socket-clean.mjs`), and the far listing came back to `gmux` alone.
`build/probe-p242-write-path.mjs` does not unlink either, which is the same class as the ten dead
sockets Phase 224 left there; a 242.2 probe must, on both sides.

**This Mac:** 20 `-L gmux` sessions before and after, listed only. `known-machines` 113 bytes and
`~/.ssh/known_hosts` 2,215 bytes, `identityFilesUnmoved` true. His own
`~/Library/Application Support/Tortie` was never opened for writing; every Electron ran on a scratch
profile under `/private/tmp/p242-2-run-<pid>/`. No Electron of this step is left running.

---

## 12. The probes this step wrote

All under `/private/tmp/wt-p242-2/.p242-2/`, readings under `results/`, logs under `logs/`. Nothing
under there is committed — `.gitignore`'s last rule is `.p[0-9]*/` — so the builder promotes what it
keeps into `build/p242-2/` the way Phase 242 promoted its fixture into `build/p242/`.

- `image-put-local.mts` — the charter's table, locally, over the shipping module's own text.
  `results/local-parent.json`.
- `image-put-clauses.mts` — the clause matrix of §6 over six arms and five variants.
  `results/clauses.json`.
- `gnu-arm.mts` — the seventh arm, the GNU `base64` dialect with debris, which is the one that makes
  the first unlink behaviourally load bearing.
- `reading-a.mjs` — §5.1, the shipping text on his Mac Pro with a scratch `HOME`.
  `results/reading-a-55666.json`.
- `probe-p242-2-parent.mjs` — §5.2, two Electrons and `machines.putImage` against his Mac Pro.
  `results/parent-46074.json`. **The parent reading the phase must move.**
- `print-image-put.mts` — prints the shipping `image-put` text, so a shell harness cannot drive a
  copy that has drifted.
- `census.mjs` — the read-only count of both machines, run before and after.
- `far-socket-clean.mjs` — ends and unlinks exactly one `gmux-p242-2-<pid>` socket on the far side,
  refusing any other name.
