# Phase 333.11.2 — "Land it, queue the gaps", again: the guardrail's record cannot be renamed or thinned out of its own history — SPEC

Written by the spec step on 2026-10-15 in `/private/tmp/wt-p33112`, a detached worktree at origin/main `1a3629a1`
("docs(backlog): lighter checking for the tier 2 phases"). Phase 333.11.1 landed as `3285a710`; its spec is
`build/p33311/SPEC-1.md` and 333.11's is `build/p33311/SPEC.md`, and every rule they state that this file does not change
still holds. Every `file:line` here was read at `1a3629a1` on this date.

**The spec step measured before it wrote** (§11 has every command, exit code and number). It planted the entry's R1, R2,
V1 and K1 to K4, with their controls, in a `cp -Rc` clone whose `.git` FILE was removed and replaced by a scratch
repository of its own (commit 1 the tree, commit 2 the plant for every history form), and judged each with the gate at
`1a3629a1`. Every plant reads as the entry's "Today" column. It then ran a prototype of the rule this file decides (§3)
over the same plants, outside the gate: it turns R1, R2 and V1 red in both their committed and uncommitted forms and
leaves the clean tree green, in about 40 ms. It measured what reading every committed copy costs two ways (the entry's
`git show` per copy, and one `git cat-file --batch`) in the worktree, the scratch repository, a depth-1 clone, a
synthetic 2,000-commit history with 30 re-freezes, outside a repository and with no `git`. It took no lock slot (no
Simulator, no `xcodebuild`, no Electron), started no agent and no model turn, and read nothing under `~/.ssh`,
`~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live Tortie profile. `stat -f '%z %m' ~/.zsh_history
~/.bash_history` read `737736 1792023873` and `23166 1790702242` at its start, around every command that started a shell,
and at its end.

**His word, 2026-10-14**, on Phase 333.11.1's second needs_work: **"Land it, queue the gaps"**. The entry is
`docs/BACKLOG.md` "## Phase 333.11.2": the plant table (R1, R2, V1, K1 to K4 and their controls), the five-step
mechanism, the proof, and what is not in the phase. **His ruling of 2026-10-15** lightens the checking for this Tier 2
phase: one verifier instead of two lenses, no separate probe review, then a fix round and an independent reverify.

**The order of authority.** His word, then the backlog entry, then the main session's task text, then this file. The tree at
`1a3629a1` overrides any picture of it here. §Attack records what this file's own attack changed.

---

## 0. The hard rules, stated once

- **Nothing a person sees moves.** No file under `src/` or `ios/` is edited, the frozen set included; no route, answer, QR
  field, hashed field, copy, menu, phone code or build number. `git diff 1a3629a1 -- src/ ios/
  docs/audits/contract-baseline.txt` is empty at the end. Semver none, no CHANGELOG item, no release.
- **Not the files other phases are building.** Phase 333.12 is in `src/main/pocket/**` and `build/p33312/`, and Phase
  347.1 is in the path files; this phase edits none of them. 333.12's entry (item 9) will also edit
  `build/assert-door-only-adds.mjs` (its R2 and R5 door set-up and one new clause) and may touch the `gate:onlyadd` row of
  `CLAUDE.md`. This phase's edits to that file stay inside F1, F3's floor, `macSideLosses`/`requestLosses`, the freeze
  path's refusal, `GIT_ENV`, the header comment and `CLAUSES`, so whichever lands second rebases a disjoint region.
- Never commit, stage or stash in the worktree. `/Users/gdc/gmux` is read only. `git diff 1a3629a1` is exactly this phase's
  delta. Install nothing. Every heredoc delimiter is quoted.
- **A `cp -Rc` clone keeps the worktree's `.git` FILE.** Remove it before any git command in the clone. The history arms
  commit in a scratch repository of their own (§5.1), never through that file and never in the worktree.
- Never `-L gmux`; never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started. Never read his
  keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` or his live Tortie profile. No model turn, no real
  Tailscale, DNS or APNs. No screenshot. **No Electron.**
- **His shell history**: before and after every command that starts a shell, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves. The vitest suite runs with a scratch
  `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- **No `test:ios`**: no frozen file moves (D12). If one ever has to, it runs under a lock slot
  (`zsh /private/tmp/tortie-ops/lock.sh try p33112`, released on the same command line), on iOS 26.3 and 18.3.
- `df -h /` before any build; under 8 GB free, wait and report. It read 84 to 85 GiB free throughout this step.
- Scratch is `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33112/<role>/`.

---

## 1. The answer first

333.11.1's F1 found a set's committed copies by its FILE PATH (`git log -- <path>`), so renaming the file hid its
history, and it compared the sealed wire alone, so a request taken out of the frozen vectors and resealed was never
missed. And the reader counted a kept line only when it was spelled `DoorLine(`, so three other spellings added a
connection the count never saw. This phase closes all three without a new clause family: F1, P0 and F3's floor widen.

1. **A set is its label.** F1 reads every `*.wire.json` ever committed directly under the frozen directory, in one `git
   log --raw`, one `git ls-tree HEAD` and one `git cat-file --batch`, and compares each committed copy with the working
   set of the SAME LABEL. A label any committed copy holds must still be held by a working set, or be named in a new
   `RETIRED_SETS` record in the gate. `FROZEN_SETS_FLOOR` must EQUAL the sets in the frozen directory. So a set is
   retired only by one commit that removes its two files, names its label in `RETIRED_SETS` with his ruling, and lowers
   the floor; each half alone is red. A retired label is never reused, and two sets never share one.
2. **Every frozen request is held to every committed copy.** A committed copy's vectors are the committed blob whose
   sha256 is the copy's own `vectors.sha256`. Every request in them must still be in the working set's vectors with the
   same name, method, target and body bytes. `requestLosses` gains the two vectors and calls a new sibling,
   `vectorLosses`, so F1 (b) and `--replace` ask the same thing.
3. **Every spelling of a kept line is counted or unread.** `DoorLine.init` in any form, a typealias of `DoorLine`, any
   call passing `keeps:` other than the counted `DoorLine(keeps: true|false)`, a stored property typed `DoorLine` whose
   initializer is anything else, and (the spec step's own) a stored property holding a type that holds kept lines are
   each unread, so P0 is red by name. A stored property typed `DoorLine` with NO initializer is a line handed in, and
   stays readable, because `DoorClient.swift:1366` is exactly that today.
4. **The ablation** makes its clone a scratch repository of its own, commits the history arms in it, and gains R1, R2 and
   V1 (red on F1), K1, K2 and K4 (red on P0), R1c, V1c and K3 (each still red on its own clause), nine arms of the spec's
   own, one control (a retirement done right reads green) and one mode (M9, `--replace` refusing a set whose vectors drop
   or change a frozen request).
5. **The nit.** `pure('ablation:p33311')` in `build/verification-checks.mjs` names git in its needs, and its comment counts
   the controls.

No frozen file moves, so there is no re-freeze and no `test:ios` (D12).

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **A set is known by its label, not its file.** F1 finds committed copies over the frozen DIRECTORY's whole history and groups them by the `label` each copy holds. A rename of the file alone (R1) is then compared with every copy of its label | the entry's mechanism 1; measured §2.1: R1 committed compares 1 copy, itself, and R1 uncommitted compares 0 |
| D2 | **Every label any committed copy holds, not only HEAD's, must have a working set or be named in `RETIRED_SETS`.** A HEAD-only rule cannot see R2 once it is committed: after the rename commit, `git ls-tree HEAD` lists only `launch-b.wire.json`, so nothing at HEAD is missing (measured, §2.1). `git log --follow` does not rescue a path rule either: the planted rename was not followed, because a rewritten file is not "similar" to git | the entry's mechanism 1 and the task ("decide the FROZEN_SETS_FLOOR rule"); the phase title, "cannot be renamed … out of its own history" |
| D3 | **`FROZEN_SETS_FLOOR` equals the number of sets in the frozen directory** (F3): below is red as today, and above is red too. A retirement then needs the floor lowered (or F3 is red) AND the label named (or F1 is red), which is what "lowering FROZEN_SETS_FLOOR and naming the label in the same commit" means in a form the gate can check. Adding a set needs the floor raised, which obligation 5 already says. Under `--into` (a scratch directory) only "at least" applies, and in `--freeze` mode "above" is not red: the freeze prints "raise FROZEN_SETS_FLOOR to N in the commit that adds <label>" | the entry's mechanism 1; `CLAUDE.md` obligation 5 ("freezes its own set beside `launch` and raises `FROZEN_SETS_FLOOR`") |
| D4 | **`RETIRED_SETS`** is a frozen record in the gate, `label → '<date>: <his ruling, in his words>'`, empty today and spelled on one line exactly `const RETIRED_SETS = Object.freeze({});` so the ablation can plant into it. A working set holding a retired label is red, and so are two working sets holding one label. Neither needs `git` | D2, D3; the verifier's planned attacks ("a label reused for a different set", "a set split in two") |
| D5 | **Four read-only git commands, not a `git show` per copy**: `rev-parse`, `log --raw`, `ls-tree HEAD`, `cat-file --batch`. Measured: today 61 ms against 102 ms for the entry's form, and with 30 re-freezes in a 2,000-commit history 59 ms against 945 ms (§2.2). The form the entry names grows with every re-freeze on every build; this one does not | measured §2.2 |
| D6 | **A copy's vectors are found by content, not by path.** They are the committed blob whose sha256 equals the copy's `vectors.sha256`, looked up among every `*.json` blob the log names under the directory. That needs no replay of the tree at each commit, holds across a renamed vectors file and a shallow graft, and ties the copy to the exact bytes it was sealed with. A copy whose vectors were never committed is a note | measured §2.2 (the prototype); the wire's own `vectors.sha256` |
| D7 | **Every committed request stays, by name, method, target and body bytes.** For each request a committed copy's vectors hold, the working set's vectors must hold one with the same `name`, `method`, `target` and `body` string. `id`, `timestamp`, `nonce`, `canonical` and `signature` are not compared. A reordered body is a changed body | the entry's mechanism 2; the verifier's planned attack ("a request whose body is reordered") |
| D8 | **`--replace` asks the same function**: `requestLosses(previous, next, previousVectors, nextVectors)`. The freeze path reads the replaced set's vectors from `FROZEN_DIR` by its `vectors.file`, and refuses (writing nothing) when that file is missing or does not hash to its `vectors.sha256`, because then what the set froze cannot be compared | the entry's mechanism 2 |
| D9 | **The kept-line spellings (mechanism 3), with one correction.** The entry says "any stored property annotated `DoorLine` whose initializer is not the counted literal". Read literally that makes today's phone unread: `private let line: DoorLine` at `ios/Tortie/Door/DoorClient.swift:1366` has no initializer, because `DoorExchange` is handed the line in its `init` (`:1385`). So the rule is: a stored property typed `DoorLine` WITH an initializer that is not exactly `DoorLine(keeps: true)` or `DoorLine(keeps: false)` is unread; with none it is a line handed in, and whatever line it is handed was made at a `DoorLine(` or a `keeps:` call, each of which is counted or unread. "Any `.init(` whose declared or annotated type is `DoorLine`" cannot be decided by a lexer for `self.x = .init(keeps: true)`, so it is decided by DoorLine's one initializer's label: any call passing `keeps:` that is not the counted spelling is unread | the entry's mechanism 3; measured §2.3 |
| D10 | **The spec step's own: a held holder is unread.** A stored property whose type annotation is, or whose initializer begins with a constructor call of, a type that holds kept lines is unread. Measured: a `LinePair` holding two kept lines, held as `let pair = LinePair()` in `PairedScreenDoor`, reads GREEN today (the reader counts 3 + 1 = 4 while the phone opens 6). Today's phone holds `PairedScreenDoor` in no stored property (`TortieApp.swift:1123` returns it from a function), so nothing it reads today becomes unread | measured §2.1 (K6) |
| D11 | **The ablation's clone is a scratch repository of its own.** Its `.git` file is removed, then `git init`, `git add -A` and one commit (measured 4.4 s, beside the 5.1 s `cp -Rc`). Every arm runs in it, so no arm reads the worktree's history through the clone any more; a history arm commits its plant as a second commit and is reset to the first. The real history's format-1 copy (`85f90247`) is then not in the clone's history, which no arm needs | the task ("a scratch git repository made from the clone"); the hard rule on the `.git` file |
| D12 | **No re-freeze and no `test:ios`.** The comparison needs no new sealed field: `label`, `vectors.file` and `vectors.sha256` are in formats 1 and 2. `launch.wire.json` (`124642bc…`) and `launch.vectors.json` (`dcbcf27c…`) do not move. The reader's change moves nothing the projection or `read` holds (the kept lines are asks, D7 of SPEC-1), so `test-ios.mjs`'s `frozenProof` is run directly, not through Xcode | the entry ("No re-freeze of `launch`, unless …"); `build/p33311/SPEC-1.md` D7 |
| D13 | **Notes, never red, for the environment**: no `git`, outside a repository, the judged tree not at its top level, a shallow clone (copies after its graft), the frozen directory outside the judged tree, no HEAD yet, a committed copy that is not JSON or holds no string `label`, a copy whose vectors were never committed, a path `git` quoted. Every note is printed under F1 and counted, as today | `build/p33311/SPEC-1.md` D9 |
| D14 | **No new clause family.** F1 gains the label rules and the vectors; F3's floor becomes an equality; P0 reads the new unread spellings. The `--json` summary's `git` gains `labels`. R4 does not move: the asks it holds are what the reader counts | the entry ("F1, P0 and R4 widen") |

---

## 2. What the spec step measured in the tree

### 2.1 The plants at `1a3629a1`

Each was planted in `$S/hist`, a `cp -Rc` of the worktree with its `.git` file removed and a scratch repository made
(`git init -b main`, `git add -A`, one commit `e9cdf945`, 4,369 files; the worktree's index holds 15 more that
`.gitignore` matches, all under `docs/research/assets/r59-lab/`, which `git add -A` leaves out). A plant marked
"committed" was committed as the second commit; "uncommitted" was left in the working tree. After each, `git reset
--hard` to the first commit, `git clean -fd` (never `-x`), and `git status --porcelain` empty with HEAD back at
`e9cdf945` were checked. "Gate" is the worktree's `node build/assert-door-only-adds.mjs --root $S/hist --json` at
`1a3629a1`. "Prototype" is `$S/proto-f1.mjs`, §3's rule written outside the gate (the say row and the vectors only).

| Plant | What it does | Form | Gate at `1a3629a1` | Prototype |
| --- | --- | --- | --- | --- |
| Z0 | nothing | — | GREEN, 1 copy compared | green |
| Z0c | a commit that moves no frozen file | committed | GREEN | green |
| **R1** | `launch.wire.json` renamed `launch-b.wire.json`, label kept, `POCKET_WRITE_BODY_CAPS.say` 16,384 resealed, `limits.ts` `say: 16_384` | committed | **GREEN**, 1 copy (itself) | RED, (b) against `e9cdf945` |
| R1w | the same | uncommitted | **GREEN**, 0 copies, note "launch-b.wire.json: no committed copy (a new or untracked set)" (the entry's "Today") | RED, (a) and (b) |
| **R2** | R1 with the label `launch-b` | committed | **GREEN**, 1 copy (itself); `git ls-tree HEAD` lists only `launch-b.wire.json` | RED, (c) `launch` missing |
| R2w | the same | uncommitted | **GREEN**, 0 copies, the same note | RED, (c) |
| R1c (kept clause) | the lowering without the rename | committed | RED F1 (b), "POCKET_WRITE_BODY_CAPS.say is 16384, lower than the 32768 it held", 2 copies | RED |
| R1cw | the same | uncommitted | RED F1, 2 findings ((a) and (b)) | RED |
| **V1** | `odd-id` dropped from `launch.vectors.json`, the wire's `vectors.sha256` repinned and resealed, main's session arm (`src/main/pocket/ipc.ts:622`) refusing an id outside `[0-9a-f-]` | committed | **GREEN**, R2 157 checked (45 frozen), R5 95 | RED, (b) "the frozen request odd-id … is gone" |
| V1w | the same, with the HEAD copy's seal appended to `history` as a `--replace` would (so (a) passes) | uncommitted | **GREEN**, 157 (45 frozen) | RED, (b) |
| V1c (kept clause) | the Mac change alone | uncommitted | RED R5, "request odd-id: main's read switch reached no route for GET /v1/session?id=a%20b%2F…" | green (nothing frozen moved) |
| **K1** | `    private let extra: DoorLine = .init(keeps: true)` after `TortieApp.swift:1144` | — | **GREEN** (the ask reads 4, the phone opens 5) | — |
| **K2** | `    private let extra = DoorLine.init(keeps: true)` | — | **GREEN** | — |
| **K4** | `typealias KeptLine = DoorLine` above `final class PairedScreenDoor` and `    private let extra = KeptLine(keeps: true)` | — | **GREEN** | — |
| K3 (kept clause) | `    private lazy var extra = DoorLine(keeps: true)` | — | RED R4, "`PER_SOURCE_MAX` is 4, below the 5 connections the phone opens at once" | — |
| K5 | `    private let extra: DoorLine` (no initializer: a line handed in) | — | GREEN, and it stays green by D9 | — |
| K6 | `final class LinePair { let a = DoorLine(keeps: true); let b = DoorLine(keeps: true) }` and `    private let pair = LinePair()` in `PairedScreenDoor` | — | **GREEN** (counts 3, opens 5 + 1) | — |
| F3d | `launch.wire.json` and `launch.vectors.json` deleted | committed | RED F3, "0 frozen set(s) … below the floor of 1" | RED, (c) |

Every one of the entry's six (R1, R2, V1, K1, K2, K4) reads green at the parent, and every control reads as the entry
says (R1c red on F1, V1c red on R5, K3 red on R4): confirmed.

### 2.2 What reading every committed copy costs

`$S/git-cost.mjs <root>`, median of 7 (5 for the first pair), each git command with `GIT_OPTIONAL_LOCKS=0`,
`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1` and the git-hook variables removed. **A** is the entry's form: one
`git log --format=%H --name-status --no-renames -- <dir>` (the same walk as `--name-only`, with the deletions marked),
then `git show <c>:<wire>` and `git show <c>:<dir>/<vectors.file>` per copy, and `JSON.parse` of each. **B** is one `git
log --raw --no-abbrev --no-renames --root`, then ONE `git cat-file --batch` fed every distinct blob, each parsed once.
The prototype (`proto-f1.mjs`, B plus `git ls-tree HEAD` and the comparisons) is the third column.

| Where | A | B | Prototype (B + ls-tree + compare) | Copies, labels |
| --- | --- | --- | --- | --- |
| the worktree (1,970 commits, linear, `git log --merges` empty) | 101.5 ms, 6 spawns | 61.4 ms, 3 spawns | 47 to 78 ms | 2 copies (`85f90247` format 1, `3285a710`), label `launch`, 1 vectors blob |
| the scratch repository (1 commit) | 62.7 ms | 47.8 ms | 36 to 70 ms | 1 |
| `git clone --depth 1 --no-checkout file:///private/tmp/wt-p33112` (4.2 s to make), the frozen directory checked out | 63.5 ms | 32.1 ms | 36 to 65 ms | 1, the graft `1a3629a`; `--is-shallow-repository` true |
| a synthetic history, 2,000 commits by `git fast-import`, 30 re-freezes of `launch`, every third moving its vectors | **945.5 ms, 62 spawns** | **58.7 ms, 3 spawns** | 78 to 109 ms | 30 copies, 10 vectors blobs, 1,380 requests compared |
| a copy of the frozen files outside any repository | 11.6 ms, exit 128 "not a git repository": a note | 11.2 ms | — | none |
| `PATH=/nonexistent` (no `git`) | 0.2 ms, `ENOENT`: a note | 0.1 ms | — | none |

So B costs about the same as the `log` + `show HEAD` + two `show`s the gate spends today, and stays flat as re-freezes
accumulate, where A adds about 30 ms a copy to every `npm run build`. B is what §3 specifies. The whole gate at
`1a3629a1` ran in 711 ms (1.56 s wall) over the worktree and 525 to 801 ms over the scratch repository.

### 2.3 The kept lines in the phone today

`grep` over `ios/Tortie/**/*.swift` for every spelling D9 names:

- `DoorLine(keeps: true)` three times, each a stored property's whole initializer in `PairedScreenDoor`
  (`App/TortieApp.swift:1141`, `:1142`, `:1144`); `DoorLine(keeps: false)` once, in `DoorLine.once()`
  (`Door/DoorClient.swift:1157`).
- `init(keeps: Bool)`, the class's one initializer, a DECLARATION (`Door/DoorClient.swift:1151`); `let keeps: Bool` (`:1131`).
- `private let line: DoorLine` with no initializer, in `DoorExchange` (`Door/DoorClient.swift:1366`), handed in by
  `init(line: DoorLine, …)` (`:1385`).
- `line: DoorLine? = nil`, `line: DoorLine`, `line kept: DoorLine?`: parameters, not stored properties (`:231`, `:299`,
  `:311`, `:329`, `:436`, `:480`, `:563`).
- No `DoorLine.init`, no `typealias` naming `DoorLine`, no other call passing `keeps:`, and no stored property of type
  `PairedScreenDoor` (it is built once, returned from `screenDoor(_:)` at `App/TortieApp.swift:1123`).

So the rules of §4 read today's phone exactly as now: 3 kept lines in one type, ask 4, `unread` empty.

---

## 3. The gate — `build/assert-door-only-adds.mjs` (builder **gate**)

### 3.1 The record: `RETIRED_SETS` and `FROZEN_SETS_FLOOR`

Beside `FROZEN_SETS_FLOOR` (`:193`), with a comment saying the retirement rule of D3:

```js
/** A commit that adds a set raises this; a ruled retirement lowers it, in the commit that names the label below. */
const FROZEN_SETS_FLOOR = 1;
/**
 * Every frozen set retired by his ruling, label → '<date>: <his words>'. A
 * label any committed copy holds and no working set holds must be named
 * here (F1), and a label named here is never held again (F1).
 */
const RETIRED_SETS = Object.freeze({});
```

`RETIRED_SETS` is spelled on one line exactly as above (the ablation's F1x and F1r arms plant into it). Each key must match
the freeze's label pattern `^[a-z][a-z0-9-]{0,31}$` and each value be a non-empty string, or F1 is red naming the entry.

### 3.2 `git`: four reads

`GIT_ENV` (`:1811`) gains `GIT_LITERAL_PATHSPECS=1`; every call also passes `-c core.quotePath=false`. The helper gains an
optional standard input and a byte answer, for `cat-file`. The reads, in this order, each failure a note (D13):

1. `git rev-parse --show-prefix --is-shallow-repository`, as today (not at the top level, or the frozen directory outside
   the judged tree: a note and nothing compared; shallow: the note "a shallow clone: only the copies after its graft").
2. `git log --format=%H --raw --no-abbrev --no-renames --root -- <dirRel>`, `dirRel` being `FROZEN_DIR` relative to
   `ROOT` (`--into` inside the tree is that directory; the canonical one otherwise). Every raw line
   `:<mode> <mode> <old> <new> <status>\t<path>` whose path is a DIRECT child of `dirRel` and whose status is `A`, `M` or
   `T` is kept: a `*.wire.json` is a committed copy (its `<new>` blob, the newest commit naming that blob kept for the
   message), any other `*.json` is a vectors candidate. `D` lines are skipped. A path starting with `"` is a note.
3. `git ls-tree HEAD -- <dirRel>/`: the wire blobs at HEAD (direct children `*.wire.json`). No HEAD (a repository with no
   commit): a note, and (a) is not compared.
4. `git cat-file --batch`, fed every distinct blob of 2 and 3, one per line. **Its answer is parsed as BYTES** (the
   header `<oid> <type> <size>\n`, then exactly `size` bytes and a newline; `<oid> missing` is a note): the vectors hold
   non-ASCII (the `odd-id` target's `’`), so a decoded string's length is not `size`. `maxBuffer` 256 MiB.

### 3.3 The copies, by label

Each distinct committed wire blob is parsed (not JSON, or no string `label`: a note naming the blob's commit and path, and
that blob is not compared). Its vectors are the vectors-candidate blob whose sha256 equals its `vectors.sha256` (none: a
note, "its vectors were never committed under <dirRel>, so its requests were not compared"; its wire is still compared).
`byLabel` maps each label to its copies, newest first.

### 3.4 What F1 asks

Without `git` (in `clauseF`, so they hold everywhere):

- **(e)** no two working sets hold one label: red, "`launch` is held by launch.wire.json and launch-copy.wire.json: one
  label names one set".
- **(d)** no working set holds a label `RETIRED_SETS` names: red, "`<file>` holds the label `<label>`, which RETIRED_SETS
  retired (<its words>): a retired label is never reused; freeze a new phone under a new label".
- `RETIRED_SETS` well formed (§3.1).

With `git` (`clauseF1Copies`, rewritten over §3.2 and §3.3, `expects('F1')` as soon as any committed copy exists):

- **(c)** every label in `byLabel` that no working set holds is named in `RETIRED_SETS` (counted as checked), or red:
  "`launch`, frozen at `e9cdf945` as ios/TortieTests/Fixtures/frozen/launch.wire.json, is not in ios/TortieTests/Fixtures/frozen:
  a frozen set is retired only on his word, in one commit that removes its two files, names its label in RETIRED_SETS
  and lowers FROZEN_SETS_FLOOR; renamed or relabelled, it is still that set".
- For each working set (under `ROOT`, parsed) with no copy in `byLabel`: the note it has today ("no committed copy (a new
  or untracked set)").
- **(a)**, by label: for each copy at HEAD (§3.2 read 3) with the working set's label, when its seal differs from the
  working set's, the working `history` must begin with the copy's `history` entry for entry and hold the copy's seal at the
  next index (today's test, `:1882-1892`), or red with today's sentence.
- **(b)**, by label: for each copy of the label, `macSideLosses(copy, set.wire)` and `requestLosses(copy, set.wire,
  copyVectors, set.vectors)`, every finding red with today's sentences naming the copy's commit; `checked('F1')` and
  `gitStats.copies += 1` per copy. With the working set's vectors unreadable, every committed request is a loss.

The summary's `git` becomes `{ copies, labels, notes }`; the PASS line keeps "N committed cop(y|ies) compared".

### 3.5 `vectorLosses`, and the freeze path

```
vectorLosses(previousVectors, nextVectors) → string[]
```

For each object in `previousVectors.requests` with a string `name`: the working requests must hold one with the same
`name`, `method`, `target` and `body` (strict equality of the strings). None with the name: "the frozen request `<name>`
(`<METHOD> <target, first 60>`) is gone from its vectors". One with the name but not equal: "the frozen request `<name>` is
`<METHOD> <target>` with a body of N bytes, where the frozen phone sent `<METHOD> <target>` with M bytes" (the sentence
names which of the three moved). `requestLosses(previous, next, previousVectors = null, nextVectors = null)` appends
`vectorLosses(previousVectors, nextVectors)` when `previousVectors` is not null; a `nextVectors` of null loses every
request. The header of `requestLosses` (`:1753-1763`) gains one sentence for it.

The freeze path (`:3165-3179`): when `previous` exists, it reads `join(FROZEN_DIR, previous.vectors.file)`; missing, not
JSON, or not hashing to `previous.vectors.sha256`, it prints "`--replace`: <label>'s own vectors do not hold together
(F2), so what it froze cannot be compared; nothing was written" and exits 1. Otherwise the losses are
`[...macSideLosses(previous, built), ...requestLosses(previous, built, previousVectors, todayVectors)]`, printed and
refused as today. In freeze mode F1's §3.4 runs over the in-memory set as every other clause does, so a re-freeze that
loses a request of ANY committed copy is refused too.

### 3.6 F3's floor (D3)

In `clauseF` (`:1917`), outside `--freeze` and only when `FROZEN_DIR` is the canonical directory
(`join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'frozen')`): `sets.length > FROZEN_SETS_FLOOR` is red, "N frozen sets under
<dir>, above FROZEN_SETS_FLOOR (F): the commit that adds a set raises the floor, and a retirement lowers it only beside
RETIRED_SETS". Below stays red everywhere, with today's sentence. In `--freeze` mode a count above the floor prints, after
"froze …", `[gate:onlyadd] raise FROZEN_SETS_FLOOR to N in the commit that adds <label>`.

### 3.7 The header, `CLAUSES`, and what does not move

- The header's F1 paragraph (`:35-50`) says the copies are found by label over the directory's history, that a committed
  label with no working set is red unless `RETIRED_SETS` names it, that a retired label is never reused and a label names
  one set, and that every request of every committed copy's vectors stays by name, method, target and body; its "WHAT IT
  DOES NOT DO" names `ls-tree` and `cat-file` beside `rev-parse` and `log`, and drops `show`. F3's paragraph says the
  floor is an equality in the frozen directory. The MODES paragraph says `--replace` also refuses a set whose vectors
  drop or change a frozen request.
- `CLAUSES.F1` (`:270`): "every frozen wire parses, its format is read here, its seal holds, one label names one set and a
  retired one is never reused, and against every committed copy of its label it is neither edited by hand, nor lower on
  the Mac side, nor asking less, nor missing a frozen request; no committed label is gone unless retired by ruling".
  `CLAUSES.F3` (`:272`): "exactly FROZEN_SETS_FLOOR (N) frozen set(s), each holding together, its request record agreeing
  with its vectors".
- Nothing else moves: R1 to R6, A1 to A5, P0 to P4, `macSideLosses`, the replay set and its ceiling.

---

## 4. The reader — `build/p33311/swift-wire.mjs` (builder **reader**)

### 4.1 The kept-line pass

`keptLinesByType(mod, unread, name = 'DoorLine')` (`:2130`) keeps its counting rule (a `DoorLine(keeps: true)` that is the
whole initializer of a stored property in a type's body, `storedInitializer` `:2177`) and its existing refusals, and
refuses five more shapes, each an unread item `{ file, line, why }` whose `why` names the shape and says to write
`DoorLine(keeps: true)` as a stored property's whole initializer:

- **R-b** `DoorLine` `.` `init`, in any form (a call, `DoorLine.init(keeps:)` as a function value, or bare): "makes or
  names a line through `DoorLine.init`".
- **R-c** `typealias <Name> =` whose right side, to the end of the statement, names `DoorLine`: "a name for DoorLine this
  reader does not follow".
- **R-d** a CALL passing the label `keeps:` first (`(` then `keeps` then `:`) other than the `DoorLine(` the main scan
  reads: `.init(keeps:`, `self.init(keeps:`, `Self(keeps:`, `KeptLine(keeps:` and any other. A `(` is a DECLARATION, and
  skipped, when the token before it is `init` (or `init` then `?` or `!`) not preceded by `.`, or a name preceded by
  `func` (a generic clause `<…>` between them skipped), or `subscript`, or a name preceded by `case`. `keeps: false`
  through any of these is unread too: the one spelling of a line is `DoorLine(keeps: …)`.
- **R-e** a stored property typed `DoorLine` (`let|var <name> : DoorLine`, optionally `?` or `!`, directly in a type's
  body by `storedInitializer`'s own test) whose `=` initializer is anything but exactly `DoorLine ( keeps : true|false )`
  ending the statement. With no initializer it is a line handed in, and nothing is said (D9).
- **R-f** (D10) after the counts: for every type `H` holding at least one kept line, a stored property directly in any
  type's body whose annotation's first name (past `any`, `some`, `?`, `!`) is `H`'s last name component, or whose
  initializer begins `H (` or `H . init`, is unread: "holds `H`, which holds N kept lines, and the count is per type".
  `H.kept()` (a static call) is not a constructor and is not this rule's (the existing fixture's `Factory.kept()` stays
  as it reads).

**A line is reported once by this pass**, with the first shape that refuses it (K2's line is both R-b and R-d), because
`proveReader` compares the unread LINES as a sorted list (`:2508-2512`). `readAsks` (`:2221`) still restores `mod.used`, so
none of this moves `read` or the projection.

Measured against §2.3, today's phone reads `unread` empty, the asks `4913ec9f…` and the record `2610fa53…` as at
`3285a710`.

### 4.2 Its proof: `requests-unread.swift.txt` and its expect file

Appended to `build/p33311/fixtures/requests-unread.swift.txt`, each refused line ending `// unread`, and the expect file's
`unread` gaining each line number once:

- K1's spelling `private let extra: DoorLine = .init(keeps: true)`, K2's `DoorLine.init(keeps: true)`, `let make =
  DoorLine.init(keeps:)`, K4's `typealias KeptLine = DoorLine` and `KeptLine(keeps: true)`, `self.line = .init(keeps:
  true)` inside an `init`, `Self(keeps: false)` in an `extension DoorLine`, and `private let once: DoorLine =
  DoorLine.once()`;
- a holder held two ways: `final class LinePair` with two kept lines, then `private let pair = LinePair()` and `private
  let other: LinePair?` in another type (R-f);
- and, NOT unread (each proves a rule does not over-reach): `private let handed: DoorLine` with no initializer, an `init(
  keeps: Bool)` declaration, a `func make(keeps: Bool)` declaration and a `case kept(keeps: Bool)` in an enum.

`"kept"` gains `"LinePair": 2` (and any other type the new lines hold, read from the run). `requests-bodies` and every
other fixture do not move. `proveReader` then reads 12 fixtures, 0 problems.

---

## 5. The ablation — `build/p33311/ablation.mjs` (builder **gate**)

### 5.1 The clone is a scratch repository of its own (D11)

After the `cp -Rc` (`:526`) and the `--into` copy (`:528`), and before the unplanted run:

1. `rmSync(join(CLONE, '.git'))` (a FILE in a worktree's clone; refuse to go on, exit 1, if it is a directory, because
   then the clone was made from a checkout whose history is the operator's).
2. `git -C <clone> init -q -b p33311`, `git add -A`, `git commit -q -m "p33311 ablation base"`, every call with
   `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_TERMINAL_PROMPT=0`, the git-hook variables removed, and
   `-c user.name=p33311 -c user.email=p33311@example.invalid -c commit.gpgsign=false -c core.hooksPath=/dev/null`. `BASE`
   is `git rev-parse HEAD`. With no `git` the run fails here, never passes.
3. The header's "`git` IS REQUIRED" paragraph is rewritten to say this; nothing reaches the worktree's history.

### 5.2 Two new kinds of arm

- **`commit: [edits]`** (a history arm): those edits are planted and committed (`git add -A`, `git commit -q -m "plant
  <id>"`), then the arm's `edits` (often `[]`) are planted uncommitted, then the gate runs. Its restore is `git reset -q
  --hard BASE` and `git clean -fdq` (never `-x`, which would remove `node_modules`), then `git status --porcelain` empty and
  `git rev-parse HEAD` equal to `BASE`, or the run stops: the plain arms' restore by sha256 does not cover a commit. The
  plain arms keep their restore by sha256; `git status --porcelain` is also checked once after the last arm and mode.
- **`own: true`**: judged by the clone's own gate (`gate(true)`), read as any arm is (the reader arms keep `reader: true`
  and their refusal-before-clauses reading).

### 5.3 The new arms

`APP` is `ios/Tortie/App/TortieApp.swift`; `SIDE` is the find `'    private let side = DoorLine(keeps: true)\n'`;
`DOOR` is the find `'final class PairedScreenDoor: ScreenDoor {\n'`; `SAY` is `limits.ts`' `'say: 32_768'` → `'say:
16_384'` and the wire's `POCKET_WRITE_BODY_CAPS.say` row 16384; `SESSION` is `src/main/pocket/ipc.ts`'s `'return id ===
null ? null : await routes.session(id);'` → `'return id === null || !/^[0-9a-f-]+$/.test(id) ? null : await
routes.session(id);'`; `ODD` drops the `odd-id` request from `launch.vectors.json` and repins the wire's
`vectors.sha256`. Every find matched exactly once at `1a3629a1` (§2.1). A rename is `{ file, renameTo }`, a new edit kind
the restore undoes (and a history arm's reset undoes anyway). F1d and F3o need a file made from the clone's wire at plant
time, so a third new edit kind copies one (`{ file, from, json? }`: `from` copied to `file`, optionally transformed and
resealed), which the restore removes as it removes a `create`.

| Id | Clause | Kind | Plant |
| --- | --- | --- | --- |
| R1 | F1 | `commit` | SAY resealed, the wire renamed `launch-b.wire.json` (label kept) |
| R2 | F1 | `commit` | R1 with the label `launch-b` |
| V1 | F1 | `commit` | ODD resealed, and SESSION |
| R1c | F1 (kept) | `commit` | SAY resealed, no rename |
| R1w | F1 | plain | R1, uncommitted (red on (a) and (b)) |
| R2w | F1 | plain | R2, uncommitted (red on (c)) |
| V1w | F1 | plain | V1, uncommitted, with the HEAD copy's seal appended to `history` as `--replace` writes it (so (a) passes and (b) alone holds it) |
| V1c | R5 (kept) | plain | SESSION alone |
| K1 | P0 | plain | SIDE + `    private let extra: DoorLine = .init(keeps: true)\n` |
| K2 | P0 | plain | SIDE + `    private let extra = DoorLine.init(keeps: true)\n` |
| K4 | P0 | plain | SIDE + `    private let extra = KeptLine(keeps: true)\n`, and DOOR preceded by `typealias KeptLine = DoorLine\n\n` |
| K3 | R4 (kept) | plain | SIDE + `    private lazy var extra = DoorLine(keeps: true)\n` |
| K6 | P0 | plain | SIDE + `    private let pair = LinePair()\n`, and DOOR preceded by `final class LinePair {\n    let a = DoorLine(keeps: true)\n    let b = DoorLine(keeps: true)\n}\n\n` |
| F1d | F1 | plain | `create` `launch-copy.wire.json` holding the wire's exact bytes (F3 red too) |
| F1x | F1 | `own` | the clone's gate: `const RETIRED_SETS = Object.freeze({});` → `const RETIRED_SETS = Object.freeze({ launch: '2026-10-15: ablation' });` |
| F3o | F3, `alsoGreen: ['F1']` | plain | `create` `second.wire.json`: the wire with the label `second`, resealed (a new set: F1 notes it and stays green) |
| X7 | reader, `fixture: 'requests-unread'` | reader | the clone's reader stops refusing a `keeps:` call (R-d); the builder names the one line it edits, matched once |
| X8 | reader, `fixture: 'requests-unread'` | reader | the clone's reader stops refusing a held holder (R-f), likewise |

**The control, which must read GREEN** (a retirement done right):

| Id | Kind | Plant |
| --- | --- | --- |
| F1r | `commit` + `own` | committed: `second.wire.json` as F3o, and the clone's `FROZEN_SETS_FLOOR = 1;` → `= 2;`; then uncommitted: `second.wire.json` removed, `RETIRED_SETS` naming `second`, the floor back to 1 |

R1, R2, V1, R1c, F1r are the history arms the entry asks for ("a rename committed, then judged"). R1c, V1c and K3 are
the entry's controls "that keep their clause": arms, each red on the clause it was red on before.

### 5.4 Mode M9

`replaceRefuses(dir, edit, names, editVectors)` gains an optional `editVectors(vectors)` applied to `<dir>/launch.vectors.json`
before `edit`, the wire's `vectors.sha256` repinned before it is resealed. **M9**: freeze `launch` into a fresh
`p33311-freeze-g`; in that set's vectors add a copy of the `blocked` request named `p33311-gone`, and set the `odd-id`
request's `target` to `/v1/session?id=p33311-moved`; `--replace --why "ablation: p33311-freeze-g"` from the unchanged
tree must exit 1, print `p33311-gone`, `odd-id` and `nothing was written`, and leave both files at their sha256.

### 5.5 The counts

The last line becomes `ABLATION_P33311: 89/89 red, 13/13 controls green`, modes M1 to M9 held: 71 + 18 arms (the
entry's nine and the spec's nine) and 12 + 1 controls. The header comment names the new arms as the 333.11.1 header names
its own. If the builder adds an arm (as 333.11.1's did, so every new red condition is seen red once), the integrator
writes the measured counts into §As built, `CLAUDE.md` and `build/verification-checks.mjs`.

---

## 6. `build/verification-checks.mjs` and `CLAUDE.md` (builder **gate**)

- **`build/verification-checks.mjs:2551-2561`.** `pure('ablation:p33311')` becomes `pure('ablation:p33311', '<needs>')`,
  the needs a sentence naming git: "node and the repository install from package-lock.json, and git: the ablation makes
  its clone a scratch repository of its own (git init, add and commit), commits its history arms there and resets them,
  and F1's arms read that history; with no git the run fails, it never passes". The comment above it is rewritten to say
  what the ablation now plants (every clause, the request replay, the committed history by label, the kept-line
  spellings) and to count it: "89 arms, 13 controls and nine modes" (the integrator writes the measured numbers). The
  type stays `pure contract or state test`, as the entry says.
- **`CLAUDE.md`, the `gate:onlyadd` row (`:361`).** The cost cell says `git` read only "(rev-parse, log, ls-tree,
  cat-file; with no `git` it says so and decides on the rest)". The proof cell gains: "Since Phase 333.11.2 a set is its
  label, not its file: every copy ever committed under the frozen directory is compared with the working set of its
  label, a committed label no set holds is red unless `RETIRED_SETS` names it, `FROZEN_SETS_FLOOR` equals the sets there,
  and every request a committed copy's vectors hold stays, by name, method, target and body; a kept line written any way
  but `DoorLine(keeps: …)` as a stored property's whole initializer is unread." The count becomes "89 arms, and 13
  controls …".
- **`CLAUDE.md`, obligation 5 (`:432-438`)** gains: "A frozen set is retired only on his word, in ONE commit that removes
  its two files, names its label in `RETIRED_SETS` with his ruling, and lowers `FROZEN_SETS_FLOOR`; a set is never
  renamed, and a retired label is never reused."

---

## 7. No re-freeze, and why

The label rule reads `label`, and the vectors rule reads `vectors.file`, `vectors.sha256` and the vectors' `requests`,
all present in both formats; so no format field is needed and `launch` is NOT re-frozen. `git diff 1a3629a1 --
ios/` is empty at the end: `launch.wire.json` stays `124642bc…` and `launch.vectors.json` and `vectors.json` stay
`dcbcf27c…`. `test:ios` reads nothing this phase changes except the reader, whose fixtures `frozenProof` proves before any
run; it is run directly (§9.2), and Xcode is not.

---

## 8. Builders, disjoint files

| Builder | Owns (creates or edits) | Must not touch |
| --- | --- | --- |
| **gate** | `build/assert-door-only-adds.mjs` (§3), `build/p33311/ablation.mjs` (§5), `build/verification-checks.mjs` (§6), `CLAUDE.md` (§6) | everything else |
| **reader** | `build/p33311/swift-wire.mjs` (§4.1), `build/p33311/fixtures/requests-unread.swift.txt`, `build/p33311/fixtures/requests-unread.expect.json` (§4.2) | everything else; `build/swift-lex.mjs` is not needed |
| **integrator** | this file's `§As built` | `src/**`, `ios/**`, `build/p316/**`, `build/p33312/**`, `package.json`, `docs/**`, `CHANGELOG.md`, `docs/audits/contract-baseline.txt`, `build/p33311/SPEC.md`, `build/p33311/SPEC-1.md` |

The two builders share the worktree and edit no file in common. The gate builder can write and run every F1, F3, V and M9
arm before the reader lands; K1, K2, K4, K6, X7 and X8 read red only once the reader's rules are in, and the reader's
fixture is what X7 and X8 break. `docs/BACKLOG.md`'s running-log line is the main session's, in the follow-up docs
commit.

---

## 9. The proof, run rather than read

### 9.1 Each builder, before it reports

- **reader**: `node -e` over `readPhoneWire('/private/tmp/wt-p33112')` printing `unread` (empty), the asks' canonical sha256
  `4913ec9f313ced2d5edcdd8cf5681ddad51f36d504f03ab6ab2b657e386a3333` and the record's
  `2610fa53ad798dd11ed401564273675c0da9c16e8ec8654cd44b481dd67a6ffc`, and `Object.keys(read)` unchanged; `proveReader`
  over the fixtures, 12 files and 0 problems; each new fixture line shown to be refused by its own rule (switch the rule
  off in a scratch copy of the reader and see that line's number leave the unread list); and each of §2.1's K1, K2, K4
  and K6 planted in a `cp -Rc` scratch clone (its `.git` file removed) reading red on P0 with the worktree's gate, K3 red
  on R4 and K5 green.
- **gate**: `npm run -s gate:onlyadd` green on the worktree, "2 committed copies compared"; over a scratch repository
  made as §5.1, each of §2.1's R1, R1w, R2, R2w, V1 and V1w red on F1 with the sentence of §3.4, R1c red on F1, V1c red on
  R5, F3d red on F3 and F1; the notes with `PATH` lacking `git`, outside a repository and in a depth-1 clone; the gate's
  time against `1a3629a1`'s, interleaved, at least three each; `node --check` of every file it edited.

### 9.2 The integrator's battery

From `/private/tmp/wt-p33112`, the history `stat` around every step, `df -h /` first:

1. `npm run typecheck`
2. `npm run build` (`gate:onlyadd`, `gate:checks`, `conformance:ios` and `gate:contract` inside it)
3. `npm run -s gate:onlyadd`, timed: PASS, 2 committed copies compared, no note
4. the whole vitest under a scratch `HOME`
5. `npm run -s ablation:p33311`: every new arm red on its clause (and `alsoRed`), every control green, M1 to M9 held,
   unplanted PASS, the scratch emptied
6. `npm run -s conformance:pocket`, `npm run -s conformance:ios`, `npm run -s gate:contract`, `npm run -s gate:checks`
7. `node build/p316/test-ios.mjs --self-test`, and `frozenProof()` imported from it: `launch` proven, the reader's 12
   fixtures read as expected
8. `git diff 1a3629a1 --stat`, and `git diff 1a3629a1 -- src/ ios/ docs/audits/contract-baseline.txt | wc -l` printing 0

### 9.3 The verifier (one, by his ruling of 2026-10-15), and its independent step

Tier 2: the gates are the evidence; the verifier re-derives and attacks, and names the step the builders did not take.

- **Plants of its own against the label and vectors comparison**, committed in a scratch repository of its own as §5.1
  makes one: a set split in two (`launch` keeping some routes and a new label holding the rest), a label reused for a
  different set, a request whose body is reordered rather than dropped (R2's signing proof (iii) also refuses that one;
  the verifier says which clauses caught it), and any other it chooses; each read as red or green with the clause named.
- **Re-derive by hand which committed copies each set is compared with**, from `git log --raw` and `git ls-tree` over the
  worktree and over one of its own scratch histories, and compare with the gate's `git.copies` and its findings.
- The independent reverify after the fix round re-runs the failed items live, plus anything the fix touched.

---

## 10. What is NOT in this phase

- No change to the phone app, the door, any route, answer, QR field or hashed field; no build number, copy or menu; no
  CHANGELOG item; no release. No re-freeze of `launch` (D12), so no `test:ios`.
- **Not 333.12** (a Mac update that adds a door route asks every paired phone to press Allow again), and none of its files.
- **No new clause family.** F1 gains the labels and the vectors, F3's floor becomes an equality, P0 reads more spellings.
- **The decoder half is not held against committed copies.** `types`, `instances` and `arms` are held by P0's same-bytes
  rule and by F3's re-derivation of the arms, as in 333.11.1; a resealed thinning of `types` while a phone file in `read`
  has moved is reported by P4 and is not red. Holding the projection to every committed copy needs a rule for the
  projection lines a format change moves (333.11.1's re-freeze moved `- /requests = []`), which is a later phase's.
- **A rewritten history is not detected.** F1 compares with the history HEAD has; a force push that removes the copies
  removes what they hold. A merge commit's own diff is not read (`git log --merges` is empty at `1a3629a1`; the copies a
  side branch committed are read from that branch's commits).
- **In a shallow clone** (CI's `actions/checkout`) F1 sees only the graft's labels and copies, and says so.
- **Kept lines held through a protocol, a generic or a factory-returned holder are not followed**: the count is per type
  (D30 of 337.1), and R-f follows only a stored property naming the holder type itself. A type holding a line handed in
  (`DoorExchange.line`) is not a holder. **Since the fix round**, nor is a holder held through a TYPE-ERASED property
  given its value elsewhere (the verifier's KE2: `private let pair: AnyObject` with `self.pair = LinePair()` in an
  `init`), or made through a metatype held in a property (`static let t = LinePair.self`, then `t.init()`): the
  reader sees the holder's name only where it is constructed, and a holder constructed in a function body is the
  factory case, because today's phone builds `PairedScreenDoor` in `screenDoor(_:)`. A holder held by its own name,
  as `H<…>(…)`, `H.self.init()` or `Self()` in its own body, and an alias or a subclass of a holder, are unread
  (§As built, "The fix round").
- **The vectors' other sections** (`tampered`, `pairAnswers`, `answers`, `qr`, …) are not held against committed copies;
  only `requests` are, as the entry names.
- **Lowering a Mac-side row, taking out a request, or renaming a set** still has no flag: each is a retirement of the set
  by his word (D3), never a re-freeze.

---

## 11. Every command the spec step ran

From `/private/tmp/wt-p33112` unless named. `$S` is
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33112/spec`. Every git command in a
scratch copy ran with `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1`; none ran in the worktree but read-only `log`,
`ls-files`, `rev-parse`, `--version`.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| S1 | `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at the start, around every command that started a shell, and at the end | 0 | `737736 1792023873` and `23166 1790702242` every time. Neither moved |
| S2 | `df -h /`; `uptime` | 0 | 84 to 85 GiB free; load average 7.7 to 15.9 (one minute) during the measurements |
| S3 | `/usr/bin/time -p npm run -s gate:onlyadd` | 0 | PASS in 711 ms (1.56 s wall): 158 requests replayed (46 frozen, 112 more), 10 Mac limits, **2 committed copies compared**, F1 4 checked, P4 EQUALS launch |
| S4 | `git log --name-only` over the frozen directory; `git log --merges`; `git rev-parse --is-shallow-repository`; `git ls-files -ci --exclude-standard` | 0 | the set's history is `85f90247` (A both files) and `3285a710` (M the wire); no merge in 1,970 commits; not shallow; 16 tracked files `.gitignore` matches |
| S5 | `node $S/hist-plants.mjs $S` (writes `$S/hist`: `cp -Rc`, the `.git` file removed, `git init -b main`, `add -A`, commit; then 18 plants, each judged by the worktree's gate and restored by `reset --hard`, `clean -fd`, `status --porcelain`) | 0 | `cp -Rc` 5,088 ms; init, add and commit 4,351 ms; 4,369 files; base `e9cdf945`; §2.1, every restore proved |
| S6 | `node $S/git-cost.mjs <root>` over the worktree and `$S/hist` (5 runs), then `RUNS=7` over the worktree, `$S/shallow`, `$S/long`, `$S/norepo` and with `--no-git` | 0 | §2.2 |
| S7 | `git clone -q --depth 1 --no-checkout file:///private/tmp/wt-p33112 $S/shallow`, then `git -C $S/shallow checkout -q HEAD -- ios/TortieTests/Fixtures/frozen` | 0 | 4.16 s; the graft `1a3629a`, shallow true |
| S8 | `$S/norepo`: the two frozen files copied under the same path, no repository; `git -C $S/norepo rev-parse --show-toplevel` | 128 | "not a git repository" |
| S9 | `git init -q -b main $S/long`; `node $S/make-long.mjs $S/long.stream 30`; `git -C $S/long fast-import --quiet < $S/long.stream`; `checkout -q main` | 0 | 2,000 commits, 30 of them touching the frozen directory; the stream removed |
| S10 | `node $S/proto-f1.mjs <root>` over the worktree, `$S/hist`, `$S/shallow` and `$S/long` (7 runs each) | 0 | all green: copies 2, 1, 1, 30; 36 to 132 ms (the first worktree run cold) |
| S11 | `node $S/hist-plants.mjs $S --reuse Z0 Z0c R1w R1 R2w R2 R1c R1cw V1 V1w V1c F3d` (the gate and the prototype per plant) | 0 | §2.1's prototype column; every restore proved |
| S12 | R2 committed by hand in `$S/hist`, then `git ls-tree --name-only HEAD -- …/frozen/`, `git log --raw --no-renames -- …/frozen`, `git log --follow -- …/launch-b.wire.json`, then `reset --hard`, `clean -fd`, `status --porcelain` | 0 | HEAD holds `launch-b.wire.json` and `launch.vectors.json` only; the log shows `D launch.wire.json`, `A launch-b.wire.json`; `--follow` stops at the rename commit; restored, 0 lines |
| S13 | `grep` of `DoorLine`, `: DoorLine`, `DoorLine.init`, `typealias`, `keeps:` over `ios/Tortie/**/*.swift` and the fixtures; `sed` of `App/TortieApp.swift:1118-1160` and `Door/DoorClient.swift:1095-1170` | 0 | §2.3 |
| S14 | `node --input-type=module -e` importing `build/p316/test-ios.mjs` and calling `frozenProof()` | 0 | `launch` read; it imports the reader and proves its fixtures first |
| S15 | reads of `docs/BACKLOG.md` (the 333.11.2, 333.11.1 and 333.12 entries), `build/p33311/SPEC-1.md`, the gate, the reader, the ablation, `build/verification-checks.mjs`, `build/assert-hermetic-checks.mjs`, `CLAUDE.md` | 0 | the line references above |
| S16 | `ps -Ao command \| grep <scratch>` (nothing named it), then `rm -rf $S/hist $S/shallow $S/long $S/norepo` | 0 | the scripts and outputs kept |

The scripts (`hist-plants.mjs`, `git-cost.mjs`, `proto-f1.mjs`, `make-long.mjs`) and their outputs (`hist-plants.out`,
`hist-plants-proto.out`) stay in `$S`; `node $S/hist-plants.mjs $S` rebuilds `$S/hist` from the worktree. The four trees it
measured (`hist`, `shallow`, `long`, `norepo`) were removed at the end (S16).

---

## §Attack — the spec step's own attack, and what it changed

| Attack | What the draft did | Now |
| --- | --- | --- |
| A1 "A set committed at HEAD and missing is enough" (the entry's words) | the HEAD-only rule | R2 committed leaves HEAD holding only `launch-b` (S12): every label ANY committed copy holds (D2) |
| A2 "Follow the file's renames instead" | `git log --follow` | the planted rename was not followed (S12): a rewritten JSON is not similar to git. By label (D1) |
| A3 "`git show` per copy, as the entry says" | form A | 945 ms at 30 copies, on every build; one `cat-file --batch` (D5) |
| A4 "Read the vectors at the copy's commit by path" | a replay of the tree per commit | the blob whose sha256 the copy names (D6): no replay, holds across a rename and a graft |
| A5 "Stored property typed DoorLine, initializer not the literal, is unread" (the entry's words) | the rule as written | today's `DoorClient.swift:1366` has no initializer and would be unread: a handed-in line is readable, and every way of MAKING a line is caught at the `DoorLine(` or `keeps:` call (D9) |
| A6 "`.init(` whose type is DoorLine" | type inference | a lexer cannot know `self.x = .init(…)`'s type; DoorLine's one initializer's label `keeps:` decides it (R-d) |
| A7 "A held holder is out of scope" | not addressed | K6 measured green today, 3 counted where 5 are kept: R-f (D10), and protocols and factories stated in §10 |
| A8 "The floor needs no change: the label rule covers deletions" | floor unchanged | with no `git` only the floor guards a deletion, and "lowering the floor" means nothing while the floor can sit below the count: equality (D3) |
| A9 "A cat-file answer read as a string" | `encoding: 'utf8'` | the vectors hold `’`, so a string's length is not git's byte size: bytes (§3.2) |
| A10 "Keep the clone on the worktree's history" | the 333.11.1 harness | the hard rule on the `.git` file, and a history arm cannot commit through it: one scratch repository for every arm (D11) |
| A11 "A line two rules refuse is two unread items" | each rule pushes | `proveReader` compares sorted line lists: one item per line (§4.1) |

---

## §As built

Written by the integrator on 2026-10-15 in `/private/tmp/wt-p33112` (still detached at `1a3629a1`; nothing committed,
staged or stashed). `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242` before
and after every command below, in both builders' runs and in this one. Neither moved. Disk read 82 to 85 GiB free
throughout; the one-minute load average was 8.5 to 30.6 (the vitest suite is the high reading).

### What landed, by file

`git diff 1a3629a1 --stat`: 7 files, 1,042 insertions, 126 deletions, plus this file (untracked, 603 lines before this
section). `git diff 1a3629a1 -- src/ ios/ docs/audits/contract-baseline.txt | wc -l` is **0**.

| File | sha256 (head) | Builder | What |
| --- | --- | --- | --- |
| `build/assert-door-only-adds.mjs` | `ad829363` | gate | §3: `RETIRED_SETS` (`const RETIRED_SETS = Object.freeze({});`, one line) and `LABEL_PATTERN` beside the floor; `CANONICAL_FROZEN_DIR`; `GIT_ENV` with `GIT_LITERAL_PATHSPECS=1` and `GIT_NO_LAZY_FETCH=1`, every call `-c core.quotePath=false`, the helper with standard input and a byte answer; `committedCopies()` (rev-parse, `log --raw --no-abbrev --no-renames --root`, `ls-tree HEAD`, one `cat-file --batch` read as bytes); `clauseF1Copies` by label, (a), (b) and (c); (d), (e) and `RETIRED_SETS`'s form in `clauseF`; F3's equality; `vectorLosses` called by `requestLosses`; the freeze path's hold-together refusal and its floor reminder; header, `CLAUSES.F1`/`F3`, `summary.git.labels` |
| `build/p33311/ablation.mjs` | `b40df091` | gate | §5: the clone's `.git` FILE removed (a directory stops the run), `init -b p33311`, `add -A`, one commit; `commit` and `own` arm kinds; `{file, renameTo}` and `{file, from, json?}` edits; 20 arms, 1 control, M9 and M10; an id used twice refused; `git status` read once at the end |
| `build/verification-checks.mjs` | `a3666ba2` | gate | §6: `pure('ablation:p33311', "<needs naming git>")`, the comment counting 91 arms, 13 controls and ten modes |
| `CLAUDE.md` | `c6c8993d` | gate | §6: the `gate:onlyadd` row's cost cell (rev-parse, log, ls-tree, cat-file) and its proof cell's 333.11.2 sentence, "91 arms, and 13 controls"; obligation 5's retirement sentence |
| `build/p33311/swift-wire.mjs` | `8860594c` | reader | §4.1: R-b to R-f in `keptLinesByType`, each line reported once by the whole pass; new helpers `declaresParams`, `typealiasRight`, `innerBrackets`, `storedProperty`, `theOneSpelling` |
| `build/p33311/fixtures/requests-unread.swift.txt` | `2a260bf1` | reader | §4.2: 134 lines appended (514 to 647) |
| `build/p33311/fixtures/requests-unread.expect.json` | `f8e6cecf` | reader | `unread` 61 → 92 lines, each once; `kept` `{ Lines: 1, Factory: 1, LinePair: 2, Late: 1 }` |

### Where the build differs from this spec, and why

1. **The arm is `V1h`, not `V1`.** 333.11.1 already has an arm `V1` (red on R5), and the ablation now refuses an id used
   twice. `V1h` is the entry's V1.
2. **91 arms, 13 controls and modes M1 to M10**, against §5.5's 89, 13 and M1 to M9. The gate builder added, so every red
   condition it wrote is seen red once: **F1hr** (F1h's hand edit under a new file name, the only arm red on F1 (a) alone
   across a rename, because (a) now finds the HEAD copy by label), **F1m** (`RETIRED_SETS` naming `Launch` with an empty
   ruling, §3.1's red condition) and **M10** (`--replace` refusing, writing nothing, when the replaced set's own vectors
   do not hold together, §3.5). `CLAUDE.md` and `build/verification-checks.mjs` carry the measured numbers.
3. **`GIT_NO_LAZY_FETCH=1`** (the gate builder's own; git reads it from 2.44, this machine has 2.50.1): in a partial clone
   a missing blob is the note "<oid> missing", never a fetch. Measured by the builder in a partial clone: notes, nothing
   fetched.
4. **A deletion is skipped before the quoted-path note**, so a quoted path is noted once; a committed wire that is not a
   regular file (mode not 100644 or 100755) is a note.
5. **`vectorLosses` names each body by its byte length AND the head of its sha256**, so a body reordered to the same length
   reads as two bodies ("107 bytes … 107 bytes" otherwise).
6. **X7 and X8 edit two exact lines of the reader**, each matched once at this tree (`swift-wire.mjs:2232`
   `      refuse(src, toks[p].at, R_D);` → `      void R_D;` and `:2256` `    const held = named ?? made;` →
   `    const held = undefined;`). A later edit to either line renames those two arms' finds.
7. **The reader is stricter than §4.1's words, and moves nothing today's phone reads**: R-e and R-f also read stored
   properties at a file's TOP LEVEL; R-f matches any name in the annotation equal to a holder's last component
   (`[LinePair]`, `Outer.LinePair?`) and `H(` or `H.init` ANYWHERE in the initializer (`[LinePair(), LinePair()]`,
   `try! LinePair()`, a tuple), `H.kept()` and `H.self` still not constructors; R-d skips a generic clause before `init`
   and `subscript` as well as `func`, and reads an enum case after a comma (`case a, kept(keeps:)`) and a switch pattern
   (`case .kept(keeps:)`) as calls, so both are unread; R-c reads brackets whole and carries a type over a line break
   on `&`, `.` or `->`; R-e reads the initializer from the first token after `=`, so a two-line
   `let x: DoorLine =` / `DoorLine(keeps: true)` is counted and not refused. Once-per-line covers the whole pass, so two
   main-scan refusals on one line are now one item (no existing fixture had that).
8. **A STATED LIMIT the spec chose (§5.1 step 1): the ablation refuses, exit 1, to run from a tree whose `.git` is a
   DIRECTORY**, which is `/Users/gdc/gmux` itself and any `git clone` (a verifier's parent clone, for instance). It runs
   from a `git worktree` (a `.git` FILE) or a tree with no `.git`. At `1a3629a1` it ran from either. The refusal is not a
   safety need, because a `cp -Rc` clone's `.git` directory is a self-contained copy and removing it touches nothing of
   the original; it is recorded here for the verifier to weigh, not changed by the integrator.

### The integrator's battery (§9.2), from `/private/tmp/wt-p33112`

Every command through one wrapper that stats the history before and after, times the wall clock and keeps the output under
`scratchpad/p33112/integrator/`.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 2.3 s (tsc -b warm); import boundaries 1,427 files, 8,118 imports, 0 violations; no runtime cycles over 4,947 edges |
| 2 | `npm run build` | 0 | 38.7 s; inside it `gate:onlyadd` PASS in 745 ms, F1 5 checked, F3 669, R2 158, R5 96, P0 2, "2 committed copies compared", P4 EQUALS launch; `conformance:ios` PASS, 50 rules; `gate:simulator` PASS; `conformance:harnessprobes` PASS; the contract inventory byte for byte |
| 3 | `/usr/bin/time -p npm run -s gate:onlyadd` | 0 | real 1.20 s, user 1.98 s; "every clause held in 598 ms"; PASS, 158 requests replayed (46 frozen, 112 more), 10 Mac limits held, **2 committed copies compared**, no note |
| 3b | `node build/assert-door-only-adds.mjs --json` | 0 | 1.2 s wall, 611 ms; `git: {copies: 2, labels: 1, notes: 0}`, replays `{frozen: 46, generated: 112}`, F1 5 checked, F3 669 |
| 4 | `env -u TERM_SESSION_ID HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null npm test` | 0 | 62.4 s wall (vitest 61.86 s); 1,132 test files passed and 2 skipped of 1,134; 21,125 tests passed and 14 skipped of 21,139; the scratch HOME left empty |
| 5 | `P33311_SCRATCH=<scratch>/ablation npm run -s ablation:p33311` | 0 | 152.7 s wall; clone a repository of its own at `dc1212e8` in 11 s; unplanted PASS; **`ABLATION_P33311: 91/91 red, 13/13 controls green (153 s)`**; M1 to M10 held; "the clone is back at dc1212e8, git status empty"; the scratch directory empty afterwards. The new lines: R1, R2, V1h, R1c, R1w, R2w, V1w, F1hr, F1x, F1m red on F1; F1d red on F1 and F3; F3o red on F3 with F1 green as it must be; V1c red on R5; K3 red on R4; K1, K2, K4, K6 red on P0; X7, X8 refused by `requests-unread.swift.txt`; control F1r green; M9 and M10 held. 1.2 to 1.5 s an arm |
| 6a | `npm run -s conformance:pocket` | 0 | 11.9 s; 136 rules, 19,645 checks, 11.48 s |
| 6b | `npm run -s conformance:ios` | 0 | 7.7 s; 50 rules over 52 app files, 70 test files, 136 files under `ios/` |
| 6c | `npm run -s gate:contract` | 0 | 1.4 s; the inventory matches the baseline byte for byte |
| 6d | `npm run -s gate:checks` | 0 | 0.8 s; 268 check scripts classified (81 pure, 20 adapter, 144 electron harness, 7 tmux harness, 46 remote machine probe, 2 Xcode harness, 1 aggregate); 1,134 test files reach no home past HOME; 0 of 566 build scripts run Go |
| 7a | `node build/p316/test-ios.mjs --self-test` | 0 | 11.9 s; sample book self-test PASS, 12 checks |
| 7b | `frozenProof()` imported from `build/p316/test-ios.mjs` | 0 | 0.3 s; `problems: []`; "the phone's reader read its 12 fixture(s) as expected", "the phone's decoders read exactly launch: its refuse arms are asserted" |
| 8 | `git diff 1a3629a1 --stat`; `git diff 1a3629a1 -- src/ ios/ docs/audits/contract-baseline.txt \| wc -l`; `shasum -a 256` of the frozen files | 0 | the 7 files above; **0**; `launch.wire.json` `124642bc…`, `launch.vectors.json` and `vectors.json` `dcbcf27c…`, all unmoved |

**Two readings beside the battery.**

- **The copies re-derived by hand.** `git log --format='%H %s' --raw --no-abbrev --no-renames --root --
  ios/TortieTests/Fixtures/frozen` over the worktree names two wire blobs, `dc82cb47` (added at `85f90247`, format 1) and
  `315b0ef9` (modified at `3285a710`), and one vectors blob `c7d22613` (added at `85f90247`, never changed);
  `git ls-tree HEAD` holds `315b0ef9` and `c7d22613`. So one label, two copies, one at HEAD, both sealed against the
  same vectors: the gate's `git: {copies: 2, labels: 1, notes: 0}` agrees, and no "vectors were never committed" note
  means F1 (b) asked every frozen request of both copies.
- **The reader at the parent.** `readPhoneWire` over this worktree with `1a3629a1`'s `swift-wire.mjs` and with this one
  reads the same: `unread` empty, asks `4913ec9f313ced2d5edcdd8cf5681ddad51f36d504f03ab6ab2b657e386a3333`, record
  `2610fa53ad798dd11ed401564273675c0da9c16e8ec8654cd44b481dd67a6ffc`, projection `549353837c9183d9…dd47`, the same 14 keys
  and the same 5 `read` files. `proveReader` reads 12 fixtures with 0 problems at HEAD; the parent reader reads the new
  `requests-unread.swift.txt` with 1 problem, the 31 new refused lines missing, so the fixture is red at the parent.

**Not run, and why.** No re-freeze and no `test:ios`: no frozen file moved (D12), so no lock slot was taken. No Electron,
no Simulator, no socket, no agent, no model turn.

**For the main session.** `docs/BACKLOG.md`'s running-log line and this phase's commit are the main session's. The
commit adds this file. The commit body should carry the counts that moved from the spec (91 arms, 13 controls, M1 to
M10, `V1h`), and §"Where the build differs" item 8 is the one decision a verifier may want to rule on.

### The fix round (one, by his ruling of 2026-10-15), from `/private/tmp/wt-p33112`

The verifier answered `needs_work`: three minors and two nits, every one with a plant that read green. The fixer fixed all
five. Nothing was committed, staged or stashed, and the worktree is still detached at `1a3629a1`. `stat -f '%z %m'
~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242` before and after every command below.
Neither moved. Disk read 82 to 83 GiB free. No frozen file moved: `launch.wire.json` is `124642bc…`, and
`launch.vectors.json` and `vectors.json` are `dcbcf27c…`. `git diff 1a3629a1 -- src/ ios/
docs/audits/contract-baseline.txt | wc -l` is still **0**. The gate, `build/assert-door-only-adds.mjs`, did not move
(`ad829363`).

**What each problem became.**

| Problem | Plant (the verifier's) | The fix | Where |
| --- | --- | --- | --- |
| 1 (minor) A kept line held through inheritance | KI1 (a superclass holding one, `PairedScreenDoor: DoorBase, ScreenDoor`), KI2 (`MorePair: LinePair` held) | **R-h**: after the counts, a type whose inheritance clause names a type that holds kept lines is unread, at its declaration's line | `swift-wire.mjs` `keptLinesByType` (R-h) |
| 2 (minor) A held holder spelled another way | KA1 (`typealias Pair = LinePair`), KG1 (`Holder<Int>()`), KS1 (`LinePair.self.init()`) | **R-g**: after the counts, a typealias whose right side names a holder is unread (R-c keeps every alias for it). **R-f** reads a construction through `constructs(ts, j)`, past a generic argument clause `<…>` and a `.self`, and reads `Self` as the holder in the holder's own body or an extension of it. KE2 (type erasure) is stated in §10 | `keptLinesByType` (R-c, R-f, R-g), new `constructs`; §10 |
| 3 (minor) The ablation refused a tree whose `.git` is a directory | `--only Z0` from a `git clone` exited 1 | The clone's own copy of `.git` is removed whatever it is (a file, a directory removed recursively, or a link removed and never followed), only as `.git` directly inside this run's own `ablation-<pid>` under the scratch directory. An `ablation-<pid>` already there stops the run before the copy, and the `finally` removes the clone only when this run made it. §As built item 8 is reversed | `ablation.mjs` (the clone set-up, `present`, `made`, the header) |
| 4 (nit) "a set is never renamed" promised what no clause holds | PR1 (a pure rename keeping the label) read green | Reworded, gate unchanged: "a set is its label, not its file, so a renamed file is still held to every copy its label ever had". A name check would have made R1, F1hr and R1w red on the file name before F1's history comparison ran, so those arms would no longer prove that comparison | `CLAUDE.md` obligation 5 |
| 5 (nit) R-e refused `DoorLine? = nil` but not `DoorLine?` | KV2 red, KV1 green | R-e reads an optional's bare `nil` as no line, like no initializer. `.none` is still refused, so the rule stays strict. The fixture's `maybe` and `forced` lines (570, 571) are no longer unread | `keptLinesByType` (R-e); the fixture |

**Decisions, and why.**

- **R-h REFUSES a subclass of a holder; it does not add the superclass's count.** Adding the count would mean resolving
  a superclass across files, generic superclasses and chains of subclasses, by last name, with no compiler. A refusal
  fails closed, and today's phone has no subclass of a holder (its one holder, `PairedScreenDoor`, is `final`). A
  holder's name in a generic constraint (`Holder<T: LinePair>`, `where T: LinePair`) is also in the clause
  `scanDecls` reads, so it is refused too. That is stricter than needed, and it is recorded.
- **`Self` was not in the verdict.** It is KS1's family: `static let spare = Self()` in `PairedScreenDoor`'s own
  extension read green at the pre-fix reader (K12 below), and it holds a second door.
- **The first rule still decides a line's one report.** The order is the main scan, then R-b to R-h, so an alias
  naming `DoorLine` keeps R-c's reason.
- **A metatype is still not a construction.** `let t = LinePair.self` stays unrefused, and the fixture pins it. What
  the reader does not follow (KE2's type-erased property, a metatype's `t.init()`, a holder built in a function) is
  stated in §10. Refusing every construction of a holder outside a stored property would refuse today's phone, which
  builds `PairedScreenDoor` in `screenDoor(_:)`.

**What moved, by file** (sha256 head; the line counts are this round's own, against the integrator's files):

| File | sha256 (head) | This round |
| --- | --- | --- |
| `build/p33311/swift-wire.mjs` | `ff85c97f` | +75 −17: R-c keeps every alias; each stored property keeps the type whose body holds it (`owner`); R-e's `nil`; R-f through `constructs` and `Self`; R-g; R-h; `refuseLine` for a declaration; the doc comment and the file header |
| `build/p33311/fixtures/requests-unread.swift.txt` | `12a2c82e` | +54 −11: the section comment and the two `nil` lines, re-worded in place so no line number moved; 43 lines appended (648 to 690) |
| `build/p33311/fixtures/requests-unread.expect.json` | `2ab1efb9` | `unread` 92 → 99 lines (570 and 571 out; 660, 668, 671, 673, 681, 682, 683, 684 and 689 in); `kept` gains `LineBase: 1`, `OpenPair: 2`, `GenericPair: 2` |
| `build/p33311/ablation.mjs` | `97891ac2` | +106 −21: arms K7 to K12 (P0) and X9 to X14 (the reader's fixture), the control K5n, the `.git` handling, and the header |
| `build/verification-checks.mjs` | `174c67c0` | the comment: 103 arms, 14 controls, the clone's own copy of `.git` |
| `CLAUDE.md` | `a9f9c6aa` | the `gate:onlyadd` row: the kept-line sentence and "103 arms, and 14 controls"; obligation 5's sentence (problem 4) |
| `build/p33311/SPEC-2.md` | — | §10's stated limit (problem 2's KE2) and this section |

**The new arms.** All are judged by the worktree's gate over the clone.

- K7: a superclass `DoorBase` holding one kept line, which `PairedScreenDoor` inherits.
- K8: `PairedScreenDoor` holds `MorePair()`, where `MorePair: LinePair` and `LinePair` holds two kept lines.
- K9: `PairedScreenDoor` holds `Pair()`, through `typealias Pair = LinePair`.
- K10: `PairedScreenDoor` holds `GenericPair<Int>()`.
- K11: `PairedScreenDoor` holds `LinePair.self.init()`.
- K12: `static let spare = Self()` in `extension PairedScreenDoor`.

Each of K7 to K12 is red on P0.

X9 to X14 each break one rule in the clone's reader, through one exact find:

- X9: `const inherited = [...d.inherits].find((n) => holders.has(n));` (R-h).
- X10: `const h = a.toks.find((t) => isId(t) && holders.has(t.v));` (R-g).
- X11: `  if (isOp(ts[k], '<')) {` (R-f, past `<…>`).
- X12: `  if (isOp(ts[k], '.') && isId(ts[k + 1], 'self')) k += 2;` (R-f, past `.self`).
- X13: `const own = s.owner …` (R-f, through `Self`).
- X14: `const noLine = …` (R-e, `nil`).

Each is refused by `requests-unread.swift.txt`. A later edit to any of those lines renames that arm's find. The control
K5n adds `private var spare: DoorLine? = nil` beside the door's three kept lines and must read green.

**Commands, each with the history stats before and after.**

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| F1 | the phone read through the reader (`readPhoneWire`, `proveReader`), before and after the fix | 0 | both builds: `unread` 0; asks `4913ec9f…`, record `2610fa53…` and the projection's canonical sha256 `1f76260b…`, all unchanged; 14 keys; the same 5 `read` files; `proveReader` 12 fixtures, 0 problems |
| F2 | the PRE-FIX reader (the integrator's `swift-wire.mjs`, copied into a scratch `build/`) over the new fixtures | 0 | 1 problem: lines 660, 668, 671, 673, 681, 682, 683, 684 and 689 not read, and 570 and 571 read where they must not be, so the fixture is red at the integrator's reader |
| F3 | `/usr/bin/time -p npm run -s gate:onlyadd` | 0 | real 1.75 s, "every clause held in 729 ms"; PASS, 158 replayed (46 frozen, 112 more), 10 Mac limits, 2 committed copies compared, P4 EQUALS launch; `--json` after the last edit: `git {copies: 2, labels: 1, notes: 0}`, 582 ms |
| F4 | `node build/p33311/ablation.mjs --scratch <fixer>/abl --only K7,…,K12,X9,…,X14,K5n,Z0,K6,K3,X7,X8` from the worktree (`.git` a file) | 0 | 16/16 red, 2/2 controls green, 35 s; the clone back at its base, git status empty, scratch empty |
| F5 | a scratch tree: `cp -Rc` of the worktree, its `.git` file removed, the integrator's reader and fixtures put back, then `git init`, `add -A` and a commit (so its `.git` is a DIRECTORY), then its own `ablation.mjs --only K7,…,K12,K5n,Z0` | 1, as it must be | the clone set-up passed from a `.git` directory ("a repository of its own at 414a45a2", 12 s; problem 3); at the PRE-FIX reader K7 to K12 each MISS with P0 green, and K5n red on P0, so the six arms are holes the fix closes and the control was the false positive; Z0 green; the tree's own `.git` byte for byte unchanged (sha256 over every file under it, before and after, `a4e7cdab…`, status empty) |
| F6 | the verifier's own `plants.mjs`, copied with its scratch and git wrapper pointed at the fixer's, over F5's repository, judged by the worktree's gate | 0 | KI1, KI2, KA1, KS1 and KG1 red on P0 (all five green in the verdict); KM1, KB1, KT1, KC1, KE1 and KN1 still red on P0; KQ1 and KX1 still red on R4; KV1 and KV2 both green now; KE2 green, the limit §10 states; PR1 green (problem 4's reword); Z0 green |
| F7 | `/usr/bin/time -p env P33311_SCRATCH=<fixer>/abl npm run -s ablation:p33311` | 0 | **`ABLATION_P33311: 103/103 red, 14/14 controls green (163 s)`**; M1 to M10 held; the clone a repository of its own at `de55a20b` in 11 s; back at its base, git status empty; the scratch directory empty afterwards |
| F8 | `npm run typecheck` | 0 | 2.3 s; import boundaries 1,427 files, 8,118 imports, 0 violations; no runtime cycles over 4,947 edges |
| F9 | `npm run build` | 0 | 36.1 s; inside it `gate:onlyadd` PASS, `conformance:ios` PASS (50 rules), `gate:simulator` PASS, `assert-hermetic-checks` PASS (268 check scripts), `conformance:harnessprobes` PASS, the contract inventory byte for byte |
| F10 | `npm run -s gate:checks` | 0 | 0.45 s; 268 check scripts classified (81 pure, 20 adapter, 144 electron harness, 7 tmux harness, 46 remote machine probe, 2 Xcode harness, 1 aggregate); 1,134 test files |
| F11 | `node build/p316/test-ios.mjs --self-test` | 0 | 11.6 s; 76 door checks, frozen grader 26 checks, sample book 12 checks |
| F12 | `frozenProof()` from `build/p316/test-ios.mjs` | 0 | `problems: []`; "the phone's reader read its 12 fixture(s) as expected", "the phone's decoders read exactly launch" |
| F13 | after the reader's last edit (its header comment): the gate `--json`, the ablation `--only X7,…,X14,K5n,Z0`, and F1 again | 0 | PASS; 8/8 red, 2/2 controls green (20 s); the same readings as F1 |

**Not run, and why.** `npm test` and `conformance:pocket`: no file under `src/`, no test and no pocket file moved
(F10 counts the same 1,134 test files). `test:ios`: no frozen file moved, so no lock slot was taken. No Electron, no
Simulator, no socket, no agent and no model turn. The scratch trees (F5's 1.4 GB, the scratch `build/` of F2 and the
ablation scratch) were removed once `ps` named none of them. The scripts and outputs stay in
`scratchpad/p33112/fixer/`.

**For the main session.** The commit body should carry this round's counts: 103 arms, 14 controls, modes M1 to M10, and
the reader's R-g and R-h. `npm run ablation:p33311` now runs from his checkout or from any `git clone`, as it did at
`1a3629a1`. The reverify re-runs the five plants: KI1, KI2, KA1, KG1 and KS1 must be red on P0, KV1 and KV2 must agree,
and `--only Z0` must run from a tree whose `.git` is a directory.

### The merge onto Phase 333.12, from `/private/tmp/wt-p33112`

Written on 2026-10-15. Main gained Phase 333.12 (`786ee1c6`: `R7`, `R8`, the route ledger, `--ledger-copy`, and arms
R7a, R7b, R8a, R8h, R8g and the control R8c) after this work was written, so the worktree was moved to `576f1908` and this
work applied with `git apply --3way`. Three files conflicted; nothing was committed, staged or stashed.
`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242` before and after every
command below. Neither moved. No frozen file moved (`launch.wire.json` `124642bc…`, `launch.vectors.json` `dcbcf27c…`),
and `git diff origin/main -- src/ ios/ docs/audits/contract-baseline.txt | wc -l` is **0**.

**How each conflict was resolved, both sides' meaning kept.**

| File | Resolution |
| --- | --- |
| `build/assert-door-only-adds.mjs` (header) | One MODES paragraph naming both: `--replace`'s refusal when the replaced vectors do not hold together and the floor reminder (333.11.2), and `--ledger-copy` (333.12) |
| `build/assert-door-only-adds.mjs` (code, no marker) | **R8's history half now reads from the same four git reads as F1's copies.** 333.12's `R8` ran its own `rev-parse`, `log` and one `git show` per commit, while this phase's header promises at most four git commands a run and its R8 paragraph said "F1's machinery". `committedHistory()` reads once a run: `rev-parse`; ONE `log --raw --no-renames --root` over the frozen directory AND `src/main/pocket/route-ledger.ts`; `ls-tree HEAD` over both; ONE `cat-file --batch` of every distinct blob. `committedCopies()` (F1) and `clauseR8` take their halves from it, each note kept for the clause it concerns and said in that clause's words. A frozen directory outside the judged tree (`--into`) leaves only F1 uncompared; R8 still reads the ledger. One comparison per distinct ledger blob, named by the newest commit naming it. `LEDGER_REL` moved beside the reader. The header's R8 paragraph and WHAT IT DOES NOT DO say so |
| `build/p33311/ablation.mjs` (5 hunks) | Header: this phase's paragraph, the fix round's, then 333.12's (R8g reworded: the clone is a repository of its own, so it reads the clone's committed copy). The counts line: 109 arms, 15 controls, M1 to M10. `ARMS`: 333.12's six entries, then F1r. `gate(own, extra)`: both the `own` doc and `extra`; the call `gate(arm.reader === true \|\| arm.own === true, arm.args ?? [])`. `ledgerCommitted()` goes through the clone's own `cloneGit` rather than a second git environment |
| `CLAUDE.md` (`gate:onlyadd` row) | This phase's cost cell (rev-parse, log, ls-tree, cat-file) and 333.11.2 sentence, then 333.12's sentence with "read from the same four git reads as the frozen sets' copies"; "109 arms … and 15 controls that add, narrow only what the launch phone never sends, retire a set as his ruling would, set an optional line to nil, or append a ledger row" |

**One arm added: R8gh** (a history arm, red on R8): the ledger's `end` row given another clause and COMMITTED, so the
working ledger equals HEAD's copy and only the base commit's copy holds the old row. In the clone's own repository R8g
alone reads HEAD's copy only, so without R8gh no arm showed R8 reading a copy that is not HEAD's, which is what the move
onto `log --raw` had to keep. R8g and R8gh share `LEDGER_END_CLAUSE`. `build/verification-checks.mjs`'s comment names R1
to R8, the ledger's history, 109 arms and 15 controls, and its needs sentence says F1's and R8's arms read that history.

| # | Command (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`) | Exit | Numbers |
| --- | --- | --- | --- |
| G1 | `npm run typecheck` | 0 | import boundaries 1,429 files, 8,125 imports, 0 violations; no runtime cycles over 4,951 edges |
| G2 | `npm run -s gate:onlyadd` | 0 | PASS in 683 ms; R7 16 checked, R8 14 (the file, today's rows, 11 frozen routes, 1 committed ledger copy), "2 committed copies compared", no note. With `--into` a scratch directory: F1 notes the directory, R8 still 14 |
| G3 | `npm run -s ablation:p33311` | 0 | **`ABLATION_P33311: 109/109 red, 15/15 controls green (196 s)`**; M1 to M10 held; R7a red on R2 and R7, R7b on R2, R5 and R7, R8a, R8h, R8g and R8gh on R8, R8c and F1r green; R2 and R2w (launch relabelled) read red on R7 beside F1, because R7 holds `LEGACY_ALLOWED_ROUTES` to the set labelled `launch`, a second clause holding the relabel; the clone back at its base, git status empty; the scratch directory empty afterwards |
| G4 | `npm run -s conformance:pocket` | 0 | 148 rules, 20,515 checks, 6.44 s |
| G5 | `npm run -s conformance:ios` | 0 | 50 rules over 52 app files, 70 test files, 136 files under `ios/` |
| G6 | `npm run build` | 0 | 40 s; inside it `gate:onlyadd`, `conformance:ios`, `gate:simulator`, `assert-hermetic-checks`, `conformance:harnessprobes` PASS |
| G7 | `npx vitest run` | 0 | 56 s; 1,134 test files passed and 2 skipped of 1,136; 21,172 tests passed and 14 skipped of 21,186 |
| G8 | `npm run -s gate:checks` | 0 | 270 check scripts classified (81 pure, 20 adapter, 145 electron harness, 7 tmux harness, 46 remote machine probe, 3 Xcode harness, 1 aggregate); 1,136 test files |
| G9 | `npm run -s gate:contract` | 0 | the inventory matches the baseline byte for byte |

**Not run.** `test:ios` (no frozen file moved), no Electron, no Simulator, no socket, no agent, no model turn.
