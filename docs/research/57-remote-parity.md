# Research 57, closing the remote gap

Written 2026-08-19 against the worktree at
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/wt-r57`.
Every count and every symbol below was checked in that tree during this round. Nothing is quoted
from an older document without being re-read.

## 0. The answer

Of the twenty gaps between a local tab and a tab on another machine, fifteen should be built, one
should wait, and four should be refused permanently. The four refusals are trash, reveal, discard
and Symbols, and each is refused for a reason that does not expire. Trash and discard destroy a
person's work on a computer nobody is watching, and neither has an undo over there. Reveal opens
Finder on this Mac over a file that is not on this Mac. Symbols needs a parser the machine does not
have, so its only honest mechanism is to pull the whole project's source here on a keystroke, which
is 4,014,080 bytes compressed for a project the size of Tortie's own, in order to land in a tab that
cannot be saved. The remaining fifteen split into six new `read` scripts and six new `write` scripts,
and the write count is the whole decision in this document, because it moves the catalogue from two
writers to eight and rewrites rule 6 of `src/main/machines/remote-scripts.ts`, which currently names
its two writers by id and records that the move from one to two happened once and on purpose. On
search, do not ship a ripgrep and do not send one. Use `git ls-files` and the machine's own `grep`,
which returns the same fourteen matching lines ripgrep returns on the same corpus and costs a scan
that was measured at 0.174 to 0.176 s on a 33,023,414 byte tracked corpus, against ripgrep's 0.016 to
0.058 s. Shipping a binary to save 0.15 s would cost a third write door, a 47 chunk transfer
protocol, a per architecture binary matrix and a sixth field on the machine confirmation that every
existing machine would have to agree to again. On scrollback, build the smaller affordance rather than
a real scrollbar. `capture-pane` with a start line is already on the verb ledger, `remoteCaptureArgs`
in `src/main/machines/remote-capsule.ts` already composes it, and pulling 25,000 lines was measured
at 0.51 s, which is fine for a menu item and 32 times too slow for a wheel notch against the 16 ms
budget in `WHEEL_COALESCE_MS`. On Context, the operator was right and the earlier answer was wrong.
The local reader is already a pure function over an injectable filesystem port, `ContextFs` in
`src/main/context/port.ts` declares six operations, and `src/main/context/agent-context.ts` has
exactly one value import, so pointing the same reader at the same paths on another machine changes no
row of the precedence matrix that `npm run conformance:context` guards.

## 1. The doors, counted this session

### 1.1 Six carriages, not five

Everything that crosses to a machine goes through one of these. Earlier drafts of this round counted
five and missed the control connection, which is a mutating tmux verb crossing to a machine on a
persistent pipe with no ledger check at all.

| # | Carriage | Entry symbol | What governs it | Ledger checked? |
|---|---|---|---|---|
| 1 | tmux verb | `execOn` then `spawnTmux`, `src/main/machines/exec-plane.ts` | `REMOTE_VERB_LEDGER` | Yes |
| 2 | login shell | `execRemoteShell`, same file | an allowlist of 5 caller files | No, and it does not carry verbs |
| 3 | catalogue script | `runRemoteRead` and `runRemoteWrite`, `src/main/machines/remote-run.ts` | `REMOTE_SCRIPTS` | No, it is script text |
| 4 | armed send | `sendArmedResumeText`, `exec-plane.ts` | `ARMED_RESUME_GUARD` | Yes, plus five extra rules |
| 5 | attach pty | `src/main/attach/attach-plan.ts` | nothing, it is the person's keystrokes | No |
| 6 | control connection | `remoteControlTransport` in `src/main/machines/control-plane.ts` | nothing | **No** |

Carriage 6 is the finding. `remoteControlTransport.plan()` calls `tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)`,
and `CONTROL_ATTACH_ARGS` in `src/main/tmux/control-client.ts` is `['-C', 'new-session', '-A', '-s', CONTROL_SESSION_NAME]`.
`tmuxCommand` in `src/main/machines/context.ts` composes ssh options and quotes the argv. It never
calls `assertRemoteVerbAllowed`. So `new-session`, which the ledger classes as mutating, already
crosses to a machine outside the ledger, and the client then sends `refresh-client -f no-output` down
the same pipe, which is a verb that is not on the ledger at all. This is not a defect to fix by
routing it through the ledger, because the control connection is what makes remote session state
live. It is a fact any future proposal has to know, because carriage 6 is the one carriage with no
gate, and a proposal that reaches for it to get low latency is reaching past every check in this
document.

There is also one door outside all six. `AUTHORIZED_KEYS_SCRIPT` in `src/main/machines/key-install.ts`
writes `~/.ssh/authorized_keys` on the far side and is not in the catalogue.

`ALLOWED_SHELL_CALLERS` in `build/conformance-machines.mjs` is exactly five files, being
`exec-plane.ts`, `prepare.ts`, `remote-argv.ts`, `remote-path.ts` and `remote-run.ts`.

### 1.2 Twelve scripts, ten read, two write

`REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` holds twelve entries. `mode: 'read'`
appears ten times and `mode: 'write'` appears twice, at the `image-put` and `git-clone` rows.
`remoteWriteScripts()` returns those two in that order.

| # | id | mode | params | its own size limit | timeout, and the constant |
|---|---|---|---|---|---|
| 1 | `machine-facts` | read | 0 | none | 10,000 ms `REMOTE_FACTS_TIMEOUT_MS` |
| 2 | `store-list` | read | 3 | depth per descriptor | 15,000 ms `REMOTE_HARVEST_TIMEOUT_MS` |
| 3 | `store-head` | read | 2 | 8,192 bytes `REMOTE_HARVEST_HEAD_BYTES` | 15,000 ms |
| 4 | `store-copy` | read | 2 | 2,097,152 per file, 20,971,520 per machine | 30,000 ms `REMOTE_STORE_TIMEOUT_MS` |
| 5 | `image-put` | **write** | 2 | 90,000 bytes `REMOTE_IMAGE_MAX_BYTES` | 60,000 ms `REMOTE_IMAGE_TIMEOUT_MS` |
| 6 | `review-list` | read | 1 | none | 20,000 ms `REMOTE_REVIEW_TIMEOUT_MS` |
| 7 | `review-file` | read | 3 | 2,097,152 bytes `REMOTE_REVIEW_MAX_BYTES`, 30 files | 20,000 ms |
| 8 | `dir-list` | read | 2 | 500 folders `REMOTE_DIR_LIST_MAX` | 15,000 ms `REMOTE_DIR_TIMEOUT_MS` |
| 9 | `program-find` | read | 3 | none | 10,000 ms `REMOTE_ARGV_TIMEOUT_MS` |
| 10 | `repo-find` | read | 3 | depth 5, 200 repos | 20,000 ms `REMOTE_REPO_FIND_TIMEOUT_MS` |
| 11 | `tree-list` | read | 3 | depth 3, 4,000 entries | 20,000 ms `REMOTE_TREE_TIMEOUT_MS` |
| 12 | `git-clone` | **write** | 2 | none | 600,000 ms `REMOTE_CLONE_TIMEOUT_MS` |

`REMOTE_SCRIPT_MAX_BYTES` is 131,072 and it caps the whole composed command, not the answer.
`MAX_BUFFER_BYTES` in `exec-plane.ts` is 67,108,864 and it caps the answer.

### 1.3 Twelve verbs on the ledger, one unsafe, three refused

`REMOTE_VERB_LEDGER` in `exec-plane.ts` holds twelve rows. Five are `kind: 'read'`, three are
`server-setup`, four are `mutating`, and exactly one is `repeat: 'unsafe'`, being `send-keys`.
`VERBS_THIS_RUNG_REFUSES` names `kill-server`, `attach-session` and `respawn-pane`.
`remoteVerbsOf` checks every verb in an argv, not only `args[0]`, by splitting on a bare `;`.
A mutating row is refused a second time when that machine's `remotePath` is still null, so nothing
that changes a machine runs before its program search list has been read.

`build/assert-bundle-refusals.mjs` pins four refusal sentences sourced from `exec-plane.ts`, not
three. They are `VERB_NOT_IN_LEDGER`, `REPEAT_UNSAFE`, `PATH_BEFORE_MUTATION` and
`ARMED_TEXT_REFUSED`.

### 1.4 The one send door, and its five rules

`sendArmedResumeText` in `exec-plane.ts` has two call sites, being `src/main/machines/remote-arm.ts`
in the product and `src/main/machines/exec-smoke.ts` to watch the refusals fire. Its five rules are
that Tortie composes the bytes from tokens the compiled build holds, that there is one call site,
that Enter is never sent, that the screen is read before and after, and that the ledger row still
says `unsafe` with a non-empty guard. `ARMED_RESUME_GUARD` is module private and is not exported.
The door checks the target against `/^\$\d+$/`, refuses text longer than 1,000 characters, and
refuses any character below 0x20 or equal to 0x7f. It does not check who composed the text. What
makes it narrow is that one product file may call it.

### 1.5 The gate, counted

`build/conformance-machines.mjs` is 3,428 lines. It carries 53 individually numbered condition
headers and 6 grouped headers. The numbers run 1 to 51 and then 63 to 68, being 57 numbered
conditions, and the highest is 68. Four numbers have no header of their own, being 1, 2 and 3, which
are folded into the "1 to 3" group, and 45, which is folded into the "41 to 45" group. A count of 51
is wrong and it misses the block headed "63 to 67. PHASE 89. The one
door that may type on another machine", which is the block that guards carriage 4.

Two constants in that file decide most of what this document proposes.

- `ALLOWED_GIT_VERBS` is `['rev-parse', 'status', 'show']`. Condition 38 fails any script that names
  a fourth. `GIT_CLONE_VERBS` is `['ls-remote', 'clone']` and only the `git-clone` row may name them.
- `ALLOWED_WRITERS` is `['image-put', 'git-clone']`, compared by length and by order.

`MUTATING_PROGRAMS`, the list holding `rm`, `mv`, `cp` and eight more, is consulted at exactly one
site, inside `if (row.mode === 'read')`. A write script naming `git rm` never reaches that check. The
real cost of a new writer is different and it is stated in section 4.3.

## 2. Search, and the operator's own ripgrep example

### 2.1 The ruling

Do not ship a ripgrep to a machine and do not ask a person to install one there. Build remote search
on `git ls-files` plus the machine's own `grep`.

| Option | Verdict | Deciding reason |
|---|---|---|
| Ship a ripgrep in the bundle and send it | **Refused** | It buys 0.15 s. It costs a third write script, a 47 chunk transfer protocol, a per architecture binary matrix, a sixth confirmation field, and a Tortie-placed executable on the person's computer. |
| Require the person to install ripgrep and refuse until they do | **Refused as the primary answer** | The one machine measured has Homebrew installed with zero formulae, so the honest refusal is what the operator would see on his own hardware. Refusing what `grep` answers in about 0.2 s is a worse product than answering. |
| Use `git ls-files` and the machine's own `grep` | **Adopted** | It returns the same 14 matching lines ripgrep returns on the same corpus, in 0.174 to 0.176 s of scan on a machine with nothing installed. One `mode: 'read'` script, no new write, no binary, no architecture matrix. |
| Pull file contents here and search on this Mac | **Refused** | The link carries 11.4 to 20.2 MB/s. Pulling 33 MB costs 2.4 s against 0.176 s for searching in place, it has to be redone every time an agent writes a file, and it copies the person's source onto a second computer for a question that did not need the bytes to move. |

### 2.2 How tmux is vendored today, since he asked

| Fact | Value |
|---|---|
| Built rather than downloaded | tmux 3.7b, libevent 2.1.12-stable, utf8proc 2.10.0, each pinned by SHA-256 in `build/tmux-release.json` |
| Who runs the build | the `beforePack` hook in `build/before-pack.cjs`, and `npm run vendor:tmux` |
| What electron-builder does | `extraResources` copies `build/vendor/tmux/bin/tmux` to `bin/tmux` |
| Path in the shipped app | `Tortie.app/Contents/Resources/bin/tmux` |
| Who resolves it | `planTmuxResolution` in `src/main/tmux/resolve.ts`, and a packaged build accepts the bundle copy only |
| Size as built, then signed | 1,437,872 bytes, then 1,456,160 bytes |
| Who signs it | `build/sign-nested-binaries.cjs` at `afterPack`, identity `Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)`, identifier `com.itavero.tortie.tmux` |
| Share of the DMG | 1,456,160 of 174,734,051 bytes, being 0.83 percent |

Ripgrep already rides the same way for local search. `@vscode/ripgrep` 1.18.0 is resolved by
`rgBinaryPath` in `src/main/search/resolve.ts`, unpacked by the `asarUnpack` pattern
`**/@vscode/ripgrep-*/bin/*`, and signed as `com.itavero.tortie.rg`. That is 4,546,784 bytes packed.
The vendoring analogy fails on one fact, and it is the fact that decides the question. The bundled
tmux and the bundled rg both run on this Mac. A remote search runs on the other computer.

### 2.3 What the Mac Pro has, probed read only

| Fact | Value |
|---|---|
| Kernel and architecture | Darwin 24.6.0, RELEASE_ARM64_T6020, arm64 |
| macOS | 15.7.7, build 24G720 |
| `command -v rg` | nothing. ripgrep is not installed |
| Homebrew | present, `/opt/homebrew/bin` holds exactly one file, being `brew` |
| grep | `/usr/bin/grep`, BSD grep 2.6.0-FreeBSD |
| git | 2.39.5, Apple Git-154 |
| PATH under a non-interactive ssh command | `/usr/bin:/bin:/usr/sbin:/sbin` |

`composeRemoteScriptCommand` in `src/main/machines/remote-run.ts` sends the command to `/bin/sh -c`,
which is not interactive, so a `grep` alias in the person's profile cannot change what runs.

### 2.4 The numbers, and what is composed rather than measured

The headline number in this section is a composition and it is labelled as one. The scan half was
measured on this Mac and the connection half was measured over the link.

| Half | Where measured | Value |
|---|---|---|
| Scan of a 33,023,414 byte tracked corpus, 1,571 tracked files, by `git ls-files -z` piped into `grep -In` | this Mac, M4 Pro | 174 to 176 ms |
| The same corpus by the bundled `rg -n` | this Mac | 16 to 58 ms |
| The same corpus by `find` with hand written prunes then grep | this Mac | 366 to 753 ms, and 19 lines of which 5 are wrong |
| The same corpus by `grep -rIn` over the whole worktree | this Mac | 3,651 to 7,141 ms, and 24 lines of which 10 are wrong |
| ssh round trip with the ControlMaster already open | over the link | 29 to 37 ms |
| `git ls-files` alone on a 7,073,526 byte repository | Mac Pro | 36 to 39 ms |

`git ls-files` plus grep returns the same 14 lines ripgrep returns. Ripgrep is not scanning faster,
it is scanning less, and git already knows the same thing. The same holds for a broad pattern, at
14,108 lines in 171 to 184 ms against ripgrep's 14,104 lines in 25 ms.

A cross check makes the composition defensible. The same `grep -rIn` over the same 243,436 KB corpus
took 0.77 s on the Mac Pro and 0.727 to 0.824 s on this Mac, so the two machines are within 5 percent
on this workload.

Where grep stops being interactive, measured on synthetic corpora on this Mac.

| Corpus | `grep -rIn` | `rg --no-ignore` |
|---|---|---|
| 34.7 MB, 1,571 files | 170 ms | 19 ms |
| 174 MB, 7,855 files | 852 ms | 113 ms |
| 347 MB, 15,710 files | 1,699 ms | 387 ms |
| 1,041 MB, 47,130 files | 5,178 ms | 2,145 ms |

grep crosses one second at about 200 MB of tracked text and rg at about 700 MB. The 200 MB figure is
interpolated between the 174 MB and 347 MB rows.

### 2.5 What a sent binary would cost, priced rather than asserted

`REMOTE_SCRIPT_MAX_BYTES` is 131,072 and the largest payload that fits one composed command was
measured at 130,960 bytes. The packed rg is 4,546,784 bytes and its base64 is 6,038,016 bytes, so a
transfer is 47 chunks. One full size chunk round trips in 48 to 140 ms, median 55 ms, giving about
2.6 s in series. `image-put` cannot carry it, because it takes one payload parameter, refuses a
destination that exists, and has no append. A sent binary would land at `$HOME/.tortie/bin/rg` with
mode 700 and a SHA-256 check before the move.

The person who confirms it is the person who confirms a machine. `MachineExecutionFields` in
`src/main/machines/confirm.ts` holds five fields, being `host`, `user`, `port`, `remoteTmuxPath` and
`acceptedTmuxVersion`, hashed under `MACHINE_EXECUTION_HASH_ALGORITHM`. `remoteTmuxPath` is the exact
precedent, so `remoteRipgrepPath` would be a sixth field and every existing machine's confirmation
would move. Refusal 8 does not forbid this outright, because a confirmed field is the sanctioned
path. It forbids doing it quietly. That price is right for tmux, which is the durability layer with
no substitute. It is not right for 0.15 s over a program the machine already has.

Architecture settles what is left. `@vscode/ripgrep` 1.18.0 publishes 12 platform packages. Tortie's
bundle contains one, being `darwin-arm64`, because npm installs the optional dependency for the build
platform and `electron-builder.yml` targets `arch: [arm64]`. For a machine of any other architecture
the product would have nothing to send, and what it does then is refuse, which is the second option
in a heavier coat.

### 2.6 What the search phase actually contains, corrected

One new script, `mode: 'read'`, five parameters, being the directory, the pattern, a case flag, a
match cap and a per line character cap. Its body asks `git rev-parse --show-toplevel` first, uses
`git ls-files -z` when that answers, and falls back to one `find` walk with the prune list `TREE_LIST`
already uses when it does not.

**It needs a gate edit, and an earlier draft of this round said it did not.** The body names
`git ls-files`, and `ALLOWED_GIT_VERBS` is `['rev-parse', 'status', 'show']`. `ls-files` is a fourth
verb and condition 38 fails on it. So the search phase owns adding `ls-files` to that list and to
rule 7 of `src/main/machines/remote-scripts.ts`. It is a read verb, it writes nothing, and reading
the index twice reads the same index twice, so it meets the same test the three existing verbs meet.
The write script count stays at two and nothing new is confirmed by a person.

Regex dialect is a real difference and the panel must say so in one line. Measured: `\b` works in
both engines, `\d` works in BSD grep but is not guaranteed on GNU grep, and lookahead fails in `rg`
without `-P` and fails in `grep -E`. Local search keeps ripgrep. A remote search runs a different
engine.

Caps are required. A broad pattern produced 1,976,075 bytes of answer over a link measured at
13 MB/s. Reuse `SEARCH_LIMITS` as read by `src/main/search/args.ts` rather than inventing numbers.

## 3. Scrollback

### 3.1 The ruling

Build the smaller affordance, being read the last N lines. Do not build a real scrollbar and do not
build nothing.

| Option | Verdict | Deciding reason |
|---|---|---|
| A real remote scrollbar over the exec plane | **Refused** | It needs `copy-mode`, which is not one of the twelve ledger rows, and `send-keys -X`, which is the one `unsafe` row. The armed door composes a fixed five element argv with `-l` and refuses control characters, so an open family of `-X` commands with numeric arguments cannot fit through it without undoing what Phase 89 built. |
| A real remote scrollbar over the control connection | **Refused** | The persistent pipe was measured at a 6.1 to 7.3 ms median round trip, which would clear the 16 ms budget in `WHEEL_COALESCE_MS`. It is carriage 6, the one carriage with no gate, and this would be the first interactive write path on it. |
| Read the last N lines with `capture-pane -S` | **Adopted** | `capture-pane` is row 5 of the ledger with `kind: 'read'` and `repeat: 'safe'`. `remoteCaptureArgs` in `src/main/machines/remote-capsule.ts` already composes it with a start line and `captureRemoteSessionNow` already runs it on demand. Zero ledger change. |
| Nothing | **Refused** | Phase 95 already commits to telling a person that scrolling back is not available there. Telling him that when the read already exists is worse than answering. |

### 3.2 The numbers, measured against the Mac Pro on 2026-08-19

The link was `gregs-mac-pro.tail2ddfe1.ts.net`, an M2 Ultra running macOS 15.7.7 with tmux 3.7c, over
a direct Tailscale path with a 6 ms ping. His `-L gmux` server there held 3 sessions before and 3
after, and `list-sessions -F '#{session_id}'` was the only command sent to it.

| Carriage | Median round trip | Worst |
|---|---|---|
| Local control client, quoted from `src/main/tmux/scroll.ts` and not remeasured | about 1 ms | not remeasured |
| Remote exec plane, one ssh per command, n=9 | 0.07 s | 0.36 s |
| Persistent ssh pipe, 40 trips across 5 runs | 0.0061 to 0.0073 s | 0.097 s |

Payload cost over the same link, n=9 each.

| Bytes | Median |
|---|---|
| 16,641 | 0.19 s |
| 344,241 | 0.40 s |
| 1,688,241 | 0.70 s |
| 4,200,243 | 1.22 s |

tmux side, measured on this Mac against a scratch socket that was killed afterwards, 50 lines is
16,641 bytes in under 0.01 s, 10,000 lines is 1,688,241 bytes in 0.05 s and 25,000 lines is
4,200,243 bytes in 0.13 s. Composed, one screen is about 0.07 s, 10,000 lines is about 0.25 s and
25,000 lines is about 0.51 s. That is fine for a menu item and 32 times too slow for a wheel notch.

### 3.3 One cost the phase must price

`remoteCaptureArgs` hardcodes `-J`. `CapturePaneOptions` in `src/main/tmux/sessions.ts` records that
`-J` is wrong for reproducing on-screen wrapping and cites research 17 section 2.1. So a panel built
on the existing composer will not show what the screen showed. The phase either writes a second argv
composer or accepts the difference in writing, and the brief must say which.

### 3.4 The conflict with Phase 95, which must be resolved rather than left

Phase 95 is queued and its acceptance list requires the product to tell a person that scrolling back
is not available on that machine yet, with its "what is not in this phase" section giving the reason
as needing copy-mode verbs on the exec plane. This document shows that reason is wrong for a read
only affordance. So either Phase 95 ships copy that the next phase falsifies, or Phase 95's spec is
amended now. The plan in section 12 rules that Phase 95 ships the quiet answer without the sentence
about availability, and the scrollback phase adds the affordance.

## 4. The file writes

### 4.1 The rulings

| Operation | Ruling | Mechanism | New write script |
|---|---|---|---|
| Save | **Build** | `file-put`, compare and swap against a sha256 read before the write, a temp name then `mv` | `file-put` |
| New file | **Build** | the same `file-put`, with the word `new` in place of a checksum and an empty payload | none |
| New folder | **Build** | `dir-new`, one non-recursive `mkdir` guarded by a `-e` test | `dir-new` |
| Rename and move | **Build** | `entry-rename`, one `mv` guarded by a `-e` test | `entry-rename` |
| Duplicate | **Not now** | if ever, a file only, as a read plus a `file-put` | none |
| Trash | **Never, as a delete** | `shell.trashItem` has no far side equal | none |

One mechanism or several, and the split is the answer. One door, being `runRemoteWrite`. One
catalogue, one marker pair, one connected-only check, one containment line, one answer vocabulary.
Three script texts, because condition 38 of the gate gives every write id its own branch and its
`else` fails any write that has none.

`image-put` is a model for the landing and not for the decision. Copy its `.part` name and its `mv`,
and copy the size and checksum comparison in `putOneImage`. Do not copy its refusal of a destination
that exists, because a save must replace. Do not copy its fixed `~/.tortie/images` directory, because
a save writes the person's own repository, so containment has to be in the text. Do not copy its
Tortie-composed name, because a save's path is the person's. Do not copy its degrade to a size
comparison when no checksum program is present, because a save must refuse instead.

### 4.2 What was measured, and it was all measured locally

| Thing | Result |
|---|---|
| Composed size of today's `image-put` at a 90,000 byte payload | 120,687 bytes, leaving 10,385 under `REMOTE_SCRIPT_MAX_BYTES` |
| Composed size of a proposed `file-put` text | the text is 1,516 bytes and admits 96,906 raw payload bytes |
| Tracked files over 90,000 bytes in this tree | 60 of 1,571. Under `src/` it is 6 of 1,279, and under `docs/` it is 49 of 174 |
| A 755 file with 2 hard links and one extended attribute, put through the `image-put` shape | came back 600, 1 link, attribute gone. Reading the mode and running `chmod` before the `mv` returned it to 755 |
| `mkdir` under `umask 077` | 700 |
| Killing the shell after the decode and before the `mv` | the destination was byte identical at 17 bytes, and a 90,000 byte part file was left beside it |
| Far side compute for a 90,000 byte decode plus two `shasum` runs | 0.03 to 0.05 s across five runs |

The ceiling moves with path length, so the product refuses at a fixed 90,000 bytes and reuses
`REMOTE_IMAGE_MAX_BYTES` rather than computing a ceiling per call.

### 4.3 What a new writer actually costs in the gate

Adding a write id is four edits and one of them is not what an earlier draft said.

1. `ALLOWED_WRITERS` in `build/conformance-machines.mjs` is compared by length and by order, so the
   new id goes in at its place.
2. Condition 38 has a branch per write id. `image-put` is asserted to redirect only to `"$t"`, to
   contain `mv "$t" "$f"` and to contain `if [ -f "$f" ]; then`. `git-clone` is asserted to redirect
   only to `/dev/null` and to contain `if [ -e "$d" ]; then`. The `else` fails any write with no
   branch. So each new writer writes its own branch, and that branch is where the phase records what
   makes that write safe to run twice.
3. Rule 6 in the header of `src/main/machines/remote-scripts.ts` names both writers by id and by
   order and says the move from one to two happened once and on purpose. It is rewritten.
4. The doc comment on `runRemoteWrite` in `src/main/machines/remote-run.ts` says the catalogue holds
   exactly one write script. It is already wrong, it says one where there are two, and it is
   rewritten with the same change.

The `-e` test is per id and not universal, so `git-stage` and `git-unstage`, which have no
destination to test, do not have to invent one. They write their own branch saying what makes them
safe to run twice, which is that both are safe by end state.

`MUTATING_PROGRAMS` never applies to a write script, because it is consulted only inside
`if (row.mode === 'read')`. A write naming `git rm` does not have to teach the gate anything.

### 4.4 The property that is lost, and the commit body must say it

Today the product can state, and check by reading text, that no command it sends can replace a file
somebody already had. Both writers refuse a destination that exists. After `file-put` the checkable
sentence weakens to this. No command it sends can replace a file whose current contents Tortie did
not just verify by checksum.

### 4.5 The read and write caps disagree by a factor of 23, and the phase must rule on it

`REMOTE_REVIEW_MAX_BYTES` is 2,097,152 and it is what fills a remote editor tab through
`machines.reviewFile`, called from `src/renderer/editor/tab-io.ts`. The proposed write cap is 90,000.
So after `file-put` a person can open a 1,500,000 byte file on a machine, type into it, and be
refused on save by a limit that has nothing to do with the limit that let them open it. That is 60
of the 1,571 tracked files in this tree, and 49 of the 174 under `docs/`. The save phase must either
raise the write cap or refuse the OPEN of a file it cannot save, and it must say which in the brief.
This document rules for the second, because a tab that can never be saved is the thing the readOnly
defect in section 9 already produces by accident.

### 4.6 Trash, and it is never built as a delete

`src/main/fs/file-ops.ts` states that delete means trash and that nothing there calls unlink or rm.
`src/renderer/tree/tree-menu.ts` already records that Move to Trash is absent permanently on a remote
row, because `shell.trashItem` has no far side equal and a remote `rm` would turn a recoverable
delete into an unrecoverable one. That call was made for the tree and it holds for every other
surface in the same window.

## 5. The git verbs

### 5.1 The rulings

| Verb | Kind | Ruling | Deciding reason |
|---|---|---|---|
| untracked files in Changes | read | **Build first** | The bytes already cross the link and are then thrown away. No new script, no new verb, no new write. |
| Runs | read | **Build** | It needs no far side git history at all and `gh` never leaves this Mac. 4 git spawns, about 52 ms of far side work, a 70 byte answer, and it widens the git verb list by zero. |
| Branches | read | **Build** | One script, 3 git spawns, about 42 ms, a 1,474 byte answer. It widens the git verb list by one. |
| History | read | **Build, last of the three** | One script, 7 git spawns, about 95 ms, a 14,984 byte answer for a first page of 50. It widens the git verb list by four and the answer grows at 270 base64 bytes per commit. |
| stage and unstage | write | **Build, together, after the reads** | Both are safe to run twice by end state. Both need the writer count to move and the read-only band sentence rewritten. |
| commit | write | **Build only after stage and unstage are in his hands** | It runs his hooks and possibly a signing prompt on a computer nobody is watching, and it is the one verb whose repeat is genuinely ambiguous. |
| discard | write | **Never on a remote tab** | It is the only proposal here that destroys work that was never committed anywhere, and there is no read that can answer afterwards whether it ran. |

### 5.2 The cost model, and the numbers are this Mac's

Everything in this subsection was measured on this MacBook Pro against a worktree with 335 commits, 6
local branches, 2 remote-tracking refs and 8 tags. No ssh round trip was measured for any of it, so
the column below is this Mac's cost and not the far side's.

A `/bin/sh` wrapper running one `git` costs 15.1 ms. The same wrapper running six costs 69.8 ms, so
each extra process is 10.9 ms. The walk itself is nearly free, because a history script asked for 51
commits took 95.1 ms and the same script asked for 335 took 93.9 ms. The cost of a git read is the
number of processes it spawns and almost nothing else.

| Read | git spawns | This Mac, ms | Answer bytes | New git verbs |
|---|---|---|---|---|
| Runs facts | 4 | 52.4 | 70 | 0 |
| Branches | 3 | 41.5 | 1,474 | 1, being `for-each-ref` |
| History, first page of 50 | 7 | 95.1 | 14,984 | 4, being `for-each-ref`, `log`, `rev-list`, `merge-base` |
| History, 201 commits | 7 | 93.9 | 54,936 | the same 4 |
| All three folded into one script | 10 | 139.8 | 16,491 | 4 |

### 5.3 Three scripts, not one

One union script costs 139.8 ms of far side work and one round trip. Three separate scripts cost
189.0 ms and three round trips. The union looks better until you ask what is open. The local product
reads the three separately on purpose, and `src/main/actions/service.ts` records that nothing spawns
for a repository nobody has expanded. A union makes a collapsed History cost 139.8 ms every time
Branches refreshes.

The round trip argument that produced `tree-list` does not carry over. Research 56 section 1.4
measured nine serial calls at 409.7 ms, one folded call at 42.3 ms and six calls issued at once at
44.0 ms. What was expensive was serialising, not calling three times. Three scripts issued together
are the shape.

### 5.4 Runs is not free, and an earlier draft said it was

The claim that Runs needs no new script fails on two of its four facts.

| Fact | Local reader in `src/main/actions/repo.ts` | Already in bytes that arrive? |
|---|---|---|
| HEAD sha | `readHeadSha` | Yes, the `# branch.oid` line of `review-list` |
| Branch | `readBranch` | Yes, the `# branch.head` line |
| Upstream sha | `readUpstreamSha` | **No.** The `# branch.upstream` line carries the ref NAME |
| owner and repo | `readOwnerRepo` | **No.** It is not in a status answer at all |

`repo-find` is not a substitute, because its own header records that it cannot find a git worktree,
since it composes `"$g/config"` from a `find` hit rather than asking git. So Runs is a new read
script with 4 spawns, and the correct way to get the git directory in any new script is
`git rev-parse --git-common-dir`, which uses a verb that is already allowed.

One substitution must not be made silently. `readBranch` uses `symbolic-ref --quiet --short HEAD`,
which exits non-zero on a detached HEAD so the reader returns null. `git rev-parse --symbolic-full-name HEAD`
prints the string `HEAD` on a detached HEAD. So a remote Runs built on the substitution reports a
branch called HEAD where the local one reports none, and the phase either accepts that or carries a
detached check.

### 5.5 Widening the git verb list, honestly

| Verb | Wanted by | Contacts a server? |
|---|---|---|
| `ls-files` | search, Quick Open | No |
| `for-each-ref` | Branches, History | No |
| `log` | History | No |
| `rev-list` | History | No |
| `merge-base` | History | No |
| `add` | stage | No |
| `restore` | unstage, and `--staged` only | No |
| `rm` | unstage, on an unborn branch, and `--cached` only | No |
| `commit` | commit | No |

The first five are pure reads of the object database and the ref store, so none can stop and wait for
a password, which is what the `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never` rule exists for.
The honest way to widen is a fourth list beside `ALLOWED_GIT_VERBS`, named for what it is, being read
verbs that touch no server, with the prompt guard rule still keyed to "not a read verb" so
`git-clone` keeps its guards. `symbolic-ref` and `remote` are not needed, since `rev-parse` answers
the first and reading the config file with `awk` answers the second, which is what `REPO_FIND`
already does.

One loss must be stated rather than hidden. `git log --stdin` cannot be fed through this door, since
`composeRemoteScriptCommand` sends one quoted argument and there is no stdin on any carriage. The
refs come from a `for-each-ref` on the far side piped into `git log --stdin`, so no ref name from a
person is ever interpolated into the script text and rule 2 survives. The local guard
`sanitizeRefNames` in `src/main/git/graph-parse.ts` stops being reachable in that shape.

### 5.6 The three problems with a remote commit

1. Hooks. `git commit` runs the person's `pre-commit` and `commit-msg` hooks on that machine. The
   local path gives them `COMMIT_TIMEOUT_MS`, being 300,000 ms. The remote door gives a script
   `REMOTE_RUN_TIMEOUT_MS`, being 15,000 ms by default, and `execRemoteShell` hands the timeout to
   `execFile` with `killSignal: 'SIGKILL'`. A hook slower than the timeout gets its ssh channel
   killed here while the commit may keep running over there.
2. Signing. The prompt guards stop a credential prompt. Neither stops a gpg or ssh signing agent from
   asking for a passphrase on a computer nobody is looking at, and a hang reads to a person as the
   app freezing.
3. The repeat. Tortie cannot tell a commit that ran and lost its answer from a commit that never ran.
   The honest shape is to read HEAD first, pass that sha into the script, and have the script refuse
   when HEAD has moved. That is buildable and it should be built rather than assumed away.

The message travels as one quoted positional and goes to `git commit -m`, so no temp file is needed
on the far side and a multi-line message survives.

### 5.7 Discard, refused, with reason 1 corrected

`GitService.discard` in `src/main/git/service.ts` reads `this.status()` first, builds a path map,
calls `assertRelPath` on every path, deletes only entries whose `indexState` is `'?'`, and skips a
path git does not report. So the local shape already refuses a renderer-chosen path that git does not
know about, and a far side script could carry the same two guards plus the containment line
`REVIEW_FILE` carries. An argument that a remote discard would run `rm -rf` on an arbitrary path is
an argument against a script nobody proposed, and it is withdrawn.

Five reasons stand and they are enough.

1. It would be the first script in the catalogue that removes anything. `image-put` refuses a
   destination that exists and `git-clone` refuses a destination that exists, so a repeat of either
   leaves the machine as the first run left it. A delete has no such shape.
2. The product already made this exact call for the tree and wrote down the reason, in
   `src/renderer/tree/tree-menu.ts`. A discard button is the same delete arriving through a different
   section of the same window.
3. The far side has no trash to fall back on, and `src/main/fs/file-ops.ts` states that nothing in it
   calls unlink or rm. `GitService.discard` is the one exception in the whole app, and extending the
   one exception to another person's computer is the wrong direction.
4. The person is not blocked. Tortie already gives them an attached, typeable session on that
   machine, and `git restore` is one line in a pane they already have open.
5. Nothing about it is verifiable afterwards. Every other write here can be checked by re-reading. A
   discard whose answer was lost leaves Tortie unable to say whether the work is gone.

The gate condition that makes this a refusal rather than a comment must be written carefully. A
condition failing any script that names `rm`, `clean` or `restore` without `--staged` would fail the
unstage script, which needs `git rm --cached` on an unborn branch. The correct condition is that no
catalogue script may name `git clean`, and that `restore` may appear only with `--staged` or with
`--source`, with `rm` allowed only with `--cached`.

### 5.8 The untracked gap, which is nearly free

`REVIEW_LIST` already asks for `git status --porcelain=v2 --branch -z --untracked-files=all`. Every
untracked path already crosses the link. `parsePorcelainV2Status` in `src/main/git/parse.ts` already
parses them and puts them in the untracked group. Then `parseRemoteReviewListing` in
`src/main/machines/remote-review.ts` throws every one of them away at this line.

```
if (file.indexState === '?' || file.indexState === '!') continue;
```

Measured this session by running the exact `REVIEW_LIST` text against two repositories.

| Repository | ms | Whole answer bytes |
|---|---|---|
| a clean worktree | 37.2 | 266 |
| a repository with 1 tracked change and 5,000 untracked files | 44.6 | 180,430 |

So on a repository with 5,000 untracked files the product moves 180,430 bytes across the link today
and discards 180,164 of them.

Five edits close it.

| File | Symbol | Edit |
|---|---|---|
| `src/main/machines/remote-review.ts` | `parseRemoteReviewListing` | Stop dropping `'?'`, keep dropping `'!'`, return a second array |
| `src/shared/ipc/machines.ts` | `MachineReviewList` | One new field. Do not add `'?'` to `GitCommitFileState` in `src/shared/types.ts`, whose eight members are shared with commit diffs |
| `src/renderer/scm/remote-changes.ts` | `RemoteChangesEntry`, `EMPTY`, `read` | One new field carried through the three places an entry is built |
| `src/renderer/scm/ScmSection.tsx` | `RemoteScmSection` | A second collapsible group, mirroring the local split in `src/renderer/scm/groups.ts` |
| `src/main/machines/__tests__/remote-review.test.ts` | the case named "leaves untracked and ignored files out" | Rewritten to assert the new split. It is the one existing gate the change breaks, and it breaks loudly |

Four details must not be missed.

1. The cap has to become per group. `REMOTE_REVIEW_MAX_FILES` is 30 and it is applied to one flat
   list. Git prints tracked entries first, so a repository with more than 30 tracked changes would
   show no untracked row at all.
2. Two sentences become false about a person's work. `REVIEW_NOTHING_CHANGED` in
   `src/main/machines/remote-copy.ts` and `remoteChangesNone` in `src/renderer/machines/presentation.ts`
   both say nothing has changed in that folder.
3. `STATUS_LIMIT` in `src/main/git/parse.ts` is 10,000 and it becomes reachable. A repository with an
   untracked build directory reaches it, and the truncated flag is not currently carried into
   `MachineReviewList`.
4. The diff needs no change at all. `REVIEW_FILE` runs `git show "HEAD:$2"` for the left side, which
   answers with the empty word for a file git has never seen, and reads the file itself for the right
   side, so an untracked file renders as an all-green new file.

One option is worth naming and rejecting. Switching to `--untracked-files=normal` would cut the
5,000 file answer from 180,430 bytes to a few hundred by collapsing a directory into one row. Do not
do it, because the local product uses `-uall` and the two lists would then disagree about the same
repository. If the byte count ever becomes the problem, that is the lever and the change is one word.

## 6. Quick Open and Symbols

### 6.1 The rulings

Build Quick Open. Do not build Symbols.

| Option | Verdict | Deciding reason |
|---|---|---|
| Quick Open on a remote tab | **Build** | One round trip that was not measurably slower than an empty round trip, no parser, no binary, no new capability. It reaches a file by name that a person would otherwise reach in several Explorer round trips. |
| Symbols on a remote tab, parsed there | **Refused** | There is no parser on the machine. BSD ctags at `/usr/bin/ctags` parses C, Pascal, FORTRAN, Lex and Yacc, and it refuses `--version`, `--list-languages` and `-h`. It cannot parse any of the six grammars in `GRAMMARS` in `src/main/symbols/languages.ts`. |
| Symbols on a remote tab, parsed here over pulled contents | **Refused** | 1,263 indexable files, 13,797,944 bytes, being 4,014,080 bytes gzipped, moved on a keystroke. It would be the first thing in the product that moves a whole project's source across the link. |
| Send a parser to the machine | **Refused** | Refusal 6 forbids third party native code in the signed bundle and refusal 8 forbids starting a process on configuration alone. |

### 6.2 What the existing tree listing gives, and what it does not

| Thing | Symbol | Value |
|---|---|---|
| Depth of one walk | `REMOTE_TREE_DEPTH` | 3 |
| Entry cap per call | `REMOTE_TREE_MAX_ENTRIES` | 4,000 |
| Ceiling on any ask | `clampTreeDepth` | 1 to 8 |
| What is pruned | `TREE_LIST` | `.git` only, so `node_modules` is walked and listed |
| gitignore | none | absent everywhere on the remote path |
| Where it lands | `entriesByDir` in `src/renderer/tree/store.ts` | a map keyed by directory, not a flat name list |

Depth 3 is not a wall, and an earlier draft treated it as one. `treeInto` in
`src/renderer/tree/store.ts` is a lazy load, and its own comment records that reaching past the
fetched depth is exactly one more call rooted where the person expanded. The real wall is the 4,000
entry cap per call.

Counted on the operator's own checkout with read only `find` and `git ls-files`.

| Count | Number |
|---|---|
| `find` with `.git` pruned and no depth limit | 32,880 |
| `find -maxdepth 3` with `.git` pruned | 4,604 |
| `git ls-files -co --exclude-standard` | 1,571 |
| Files under `node_modules` alone | 22,341 |

4,604 is above 4,000, so on a project that size the first listing is truncated. That is a real cost
and it is not the same as unreachable. The case for Quick Open is fewer round trips and no clicking,
not that a file is otherwise unreachable.

### 6.3 The measurements

Over the operator's tailnet with an ssh ControlMaster open, against `/Users/gdc/.oh-my-zsh`, which
holds 1,096 tracked files.

| Shape | n | min ms | median ms | max ms | wire bytes |
|---|---|---|---|---|---|
| `true`, the empty round trip | 7 | 59.8 | 62.1 | 158.8 | 0 |
| The current `TREE_LIST` shape at depth 3 | 7 | 109.2 | 113.2 | 211.8 | 68,560 |
| One walk, full depth, files only | 7 | 72.0 | 83.9 | 163.5 | 56,017 |
| `git ls-files -co --exclude-standard` | 7 | 83.4 | 92.6 | 171.8 | 31,964 |

The honest statement is that a whole project name index was not measurably slower than an empty round
trip at n=7, because the baseline itself spans 59.8 to 158.8 ms. It is not "21.8 to 30.5 ms above an
empty round trip", which is a difference of medians presented as a range.

Scale points on the same link. `/usr/share` at 15,581 files is 657,058 bytes in 108.6 to 201.0 ms.
`/System/Library` at 289,980 files is 43,954,137 bytes in 8,218 to 10,563 ms, which is why the far
side keeps a `head -n` cap.

Ranking runs here and it is already free. Measured with the `fuzzysort` the product already imports,
1,571 paths prewarm in 5.4 ms and query in 0.04 to 2.95 ms, and 15,581 paths prewarm in 19.4 ms and
query in 0.04 to 9.25 ms.

`git ls-files` is the right enumerator. Against this tree, `rg --files` composed exactly as
`buildListFilesArgs` in `src/main/search/files-args.ts` composes it returned 1,571 paths, and
`git ls-files -co --exclude-standard` returned 1,571 paths, with `comm` reporting 0 paths in one and
not the other in both directions. On `.oh-my-zsh` the two diverge by 4 paths out of 1,096, being two
symlinks that a `find -type f` excluded and two gitignored cache files that git correctly leaves out.
A folder that is not a repository answers with 0 lines in about 78 ms, so the script needs the same
`find` fallback the search script needs.

### 6.4 The guardrail, applied to both without flattering either

The guardrail asks whether a feature serves the agentic coding workflow or exists because IDEs have
it. The destination tab is the same for both features, being a remote tab that `remoteFileChip` in
`src/renderer/machines/presentation.ts` already labels as one Tortie cannot save. So "the destination is
read only" does not separate them, and an earlier draft used it as if it did. What separates them is
cost and reach. Quick Open moves 31,964 bytes for a whole project's names and reaches any file by
name. Symbols moves 4,014,080 bytes compressed on a keystroke, has to re-derive its own file list on
the far side because 1,263 paths is 47,020 bytes and a larger repository would exceed
`REMOTE_SCRIPT_MAX_BYTES`, needs a second task shape in `src/main/symbols/worker.ts` carrying text
rather than a path, and needs the mtime and size stamps in `src/main/symbols/persist.ts` to come from
the far side on every check. `IDLE_EVICT_MS` in `src/main/symbols/pool.ts` gives the index back after
30 idle minutes, so the next press pays it again.

If remote save ever ships, Symbols should be reconsidered and not before, because save is the change
that makes the destination editable.

### 6.5 What the Quick Open phase contains

One new read script taking the root and a cap. Its body asks `git rev-parse --show-toplevel`, uses
`git ls-files -co --exclude-standard` when that answers, and falls back to one `find` walk pruning
`.git` and `node_modules` when it does not, which names no new program because `REPO_FIND` already
prunes by that means. It prints the honest total then the capped list in the same first line shape
`parseTreeList` and `parseDirList` already use.

It depends on the search phase for the `ls-files` gate edit and adds nothing else to the gate.
Nothing new is confirmed by a person, because a read script goes through the read door and
`runRemoteScript` already refuses a write script that arrives through it.

One worker change, being an optional `paths` field on `WarmMessage` in
`src/main/quickopen/protocol.ts`. When it is present, `ensureIndex` calls `adopt` and never calls
`enumerate`.

Two renderer guards must change together and they are the trap. `rootsFor` in
`src/renderer/quickopen/store.ts` drops every non-local target, and `startRecordingRecents` in
`src/renderer/quickopen/recents.ts` refuses to record a remote open, with a comment naming the hazard
exactly, which is that the same path on two computers is two different files. So the root key and the
recents key must both carry the machine id before either guard is lifted. `recentKey` in
`src/main/quickopen/worker.ts` and `keysForWorker` in `src/renderer/quickopen/recents.ts` compose
them, and `indexes` in the worker is keyed by the root string alone.

Freshness has to be ruled on rather than assumed. Locally `WARM_STALE_MS` is 5,000 ms and a stale
index is re-enumerated on the next palette open. A remote root either obeys the same rule, which puts
one round trip on the palette-open path whenever the person waits five seconds, or it does not, and
remote freshness is worse than local against a machine where an agent is writing files. This document
rules for the same 5,000 ms rule and for saying in the palette that the list is as fresh as the last
read, because the measured cost of that read is under one round trip's noise.

## 7. Context

### 7.1 The ruling

Build it. The earlier answer he was given was wrong. The local reader is already a pure function over
an injectable filesystem port, so pointing it at another machine is a port swap rather than a second
reader.

### 7.2 The paths, counted this session

From `BLOCKS` in `src/main/context/agent-context.ts` there are 90 declared locations across 11 agents
and 5 categories, using 62 distinct templates. The split is 46 rows in the person's home folder, 41
inside the project, 1 absolute, being
`/Library/Application Support/ClaudeCode/managed-settings.json`, and 2 derived from a plugin install.
The home count is reached by expanding the three constants as well as the inline literals, being 27
under `~`, 7 under `<codex>`, 7 under `<claude>` and 5 under `<agents>`. The project count is 35
inline plus 6 from a constant. `src/renderer/context/groups.ts` declares no path at all. Every path
in it arrives from main as `ContextRootReadout[]` and is rendered by `sectionHint`.

### 7.3 The four answers he asked for

**One script, three round trips.** One catalogue entry, `context-read`, taking an enumerate list, a
depth and a read list. One round trip is impossible without putting the frontmatter, JSONC, TOML and
`@import` parsers into `/bin/sh`, which is refused. The calls are driven by a miss-recording
`ContextFs`, which converges because the reader is deterministic, with a cap of 8 passes.

**Cost.** Measured against the Mac Pro as it stands, the full two-call read took 0.277, 0.427, 0.433
and 0.336 s. A rich machine was estimated at 1.3 s and that number is an estimate, not a measurement,
because no rich far side was available. Batching is the whole design, since 71 paths as 71 calls took
3.22 s and the same 71 in one call took 0.045 s.

**Absent paths need no new code.** `ContextFs` already returns null and `rootReadout` already records
`exists: false`. Proved by the fact that 68 of the 71 declared paths are absent on the Mac Pro and the
script returned 951 bytes with no error.

**The conformance matrix cannot break.** `agent-context.ts` has exactly one value import, being
`AGENT_REGISTRY`, and neither that file nor `src/renderer/context/groups.ts` names `node:fs`,
`node:os` or `node:child_process`. `scopeOrderFor` folds the declared rank numbers and never asks
whether a location exists, so all five gate checks are answered before any disk is touched. Two rules
keep it that way. There is no second table, and there is no remote-only precedence override.

### 7.4 One cost the Context phase must price

The read list travels inside the composed command, which is capped at 131,072 bytes. Symbols was
priced against the same cap and 1,263 paths was 47,020 bytes. A rich machine is exactly the case
where the Context read list grows, so the phase has to cap the list per call and page it, and the
brief must carry the number.

### 7.5 What is genuinely local forever

One of the twelve `context:*` channels travels, being `context:scan`. The other eleven run the skills
binary under `process.resourcesPath`, reach `https://skills.sh` or `raw.githubusercontent.com`, or
write Tortie's own pin store. `revealPath` and `openPath` in `src/renderer/context/menus.ts` name
Finder and an editor on this Mac. So remote Context is read only, and install, enable and pin are not
built for a machine.

### 7.6 Two smaller facts

Three environment variables do not cross today. `resolveHomes` in `src/main/context/env.ts` reads
`HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `XDG_CONFIG_HOME` and `XDG_STATE_HOME`.
`MACHINE_FACTS` prints `home`, `codex_home`, `xdg_data_home` and `uname`. So the three that are
missing are `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME` and `XDG_STATE_HOME`, and `XDG_DATA_HOME` is
carried today but is not one the reader uses. That is three `printf` lines in `MACHINE_FACTS`.

A remote session records no launch snapshot today and that is correct rather than broken.
`recordLaunchContext` is called only from the local create and restore paths in
`src/main/sessions/core.ts`, and `src/main/machines/remote-sessions.ts` never calls it.

## 8. Every gap, with the deciding reason

| # | Gap | Ruling | Door it needs | Deciding reason |
|---|---|---|---|---|
| 1 | untracked files in Changes | Build | none | The bytes already cross and 180,164 of 180,430 are discarded on a 5,000 file repository. |
| 2 | search | Build | 1 new read script, plus `ls-files` on the allowed verb list | `git ls-files` plus `grep` returns the same 14 lines as ripgrep in 174 to 176 ms on a machine with nothing installed. |
| 3 | Quick Open | Build | 1 new read script | 31,964 bytes for a whole project's names, and a round trip that was not measurably slower than an empty one. |
| 4 | scroll back | Build the smaller affordance | none | `capture-pane` is already on the ledger and already composed. 25,000 lines is 0.51 s, which is a menu item and not a scrollbar. |
| 5 | save a file | Build | `file-put`, a new write | It is the operator's third named priority and there is no other way to edit a file over there. |
| 6 | new file | Build | the same `file-put` | The same door with the word `new` in place of a checksum. |
| 7 | new folder | Build | `dir-new`, a new write | One non-recursive `mkdir` guarded by `-e`, safe to run twice. |
| 8 | rename and move | Build | `entry-rename`, a new write | One `mv` guarded by `-e`, safe to run twice. |
| 9 | duplicate | **Not now** | none if ever | It is a read plus a `file-put` and it earns no new door. A folder duplicate has no bounded shape through this catalogue. |
| 10 | trash | **Never, as a delete** | none | `shell.trashItem` has no far side equal and a remote `rm` turns a recoverable delete into an unrecoverable one. The product already made this call for the tree. |
| 11 | reveal | **Never** | none possible | It opens Finder on this Mac over a file on this Mac. A file on another machine has no local path to reveal and no Finder over there Tortie may drive. |
| 12 | Symbols | **Not now, revisit after save** | a bulk content door | 4,014,080 bytes compressed on a keystroke, a second file list that can disagree with the first, a second worker task shape, and stamps that need a second read every time. |
| 13 | stage | Build | `git-stage`, a new write | Safe to run twice by end state. It is the first git write on another computer. |
| 14 | unstage | Build | `git-unstage`, a new write | Safe to run twice by end state. It needs `restore --staged` and `rm --cached`. |
| 15 | discard | **Never** | none | It is the only proposal that destroys work never committed anywhere, and no read can answer afterwards whether it ran. |
| 16 | commit | Build, last of the writes | `git-commit`, a new write | It runs his hooks and possibly a signing prompt on a computer nobody is watching, and it needs a HEAD guard so a lost answer cannot double-commit. |
| 17 | history | Build | 1 new read script, 4 new verbs | 7 spawns, about 95 ms, 14,984 bytes for a page of 50, growing at 270 base64 bytes per commit. |
| 18 | branches | Build | 1 new read script, 1 new verb | 3 spawns, about 42 ms, 1,474 bytes. |
| 19 | runs | Build | 1 new read script, 0 new verbs | `gh` never leaves this Mac and only four short strings have to travel. |
| 20 | Context | Build | 1 new read script, 3 more `printf` lines in `machine-facts` | The reader is already a pure function over `ContextFs` and the precedence matrix is decided before any disk is touched. |

Totals. Fifteen build, one waits, four are refused. Six new read scripts, being search, Quick Open,
runs, branches, history and Context. Six new write scripts, being `file-put`, `dir-new`,
`entry-rename`, `git-stage`, `git-unstage` and `git-commit`, which moves `ALLOWED_WRITERS` from two
to eight. Nine git verbs are added to the allowed list across the whole programme.

## 9. Defects this audit found in the shipped tree

| # | Where | What is wrong | Consequence |
|---|---|---|---|
| 1 | `src/renderer/editor/MonacoHost.tsx`, `readOnly` | It is `tab.deleted \|\| tab.truncated \|\| tab.commit !== null` and omits `tab.remote`, while `save` in `src/renderer/editor/tab-io.ts` refuses every remote tab | A person types freely into a tab whose every save is refused |
| 2 | `src/renderer/terminal/terminal-menu.ts`, `canCapture` | It is `live && captureBridge() !== null` with no remote check, and a remote session has a live terminal because of the ssh attach | Capture and Clear are drawn on a remote session. `resolvePaneTarget` in `src/main/tmux/sessions.ts` searches this Mac's server by name, so the ordinary outcome is a thrown error, and the bad outcome needs a local session with the same name, which is possible because names are deduped per server |
| 3 | `src/main/machines/remote-scripts.ts`, `IMAGE_PUT` | The temp name uses `$$` and nothing removes `~/.tortie/images/*.part.*` | Every interrupted upload leaves one file forever. A deterministic temp name fixes it |
| 4 | `src/main/machines/remote-run.ts`, `runRemoteScript` | It compares `command.length`, which is UTF-16 code units, against a limit named in bytes | Not reachable at 90,000, and still wrong in the one guard that bounds every write |
| 5 | `src/main/git/service.ts`, `resolveGitDir` and `hasCommitGraph` | `--absolute-git-dir` returns the worktree gitdir, and the commit graph lives in the common directory | Cosmetic locally, since the history pane cannot explain a slow walk. Any new remote git script that copies the shape inherits it, so use `--git-common-dir` |
| 6 | `build/conformance-machines.mjs` line 2488 | The block header reads "the seven scripts it may send" and the catalogue holds twelve | Prose only, and it is the header of the block that guards the catalogue |
| 7 | `src/main/machines/remote-run.ts`, `runRemoteWrite` doc comment | It says the catalogue holds exactly one script with `mode: 'write'` and there are two | Prose only, and it is the doc comment on the write door |

## 10. What is not true and what nobody checked

**Composed rather than measured.**

- The search headline of 0.21 s is a 0.176 s scan taken on this Mac plus a 0.035 s connection taken
  over the link. The charter asked for a measurement on the Mac Pro and this is a composition. It is
  defensible because the same `grep -rIn` over the same corpus was within 5 percent on both machines,
  and it is still not what was asked for.
- The Context rich-machine figure of about 1.3 s is arithmetic over three separately sourced numbers
  for a machine that does not exist.

**Not measured on the far side at all.**

- No git read script was run over ssh. Every number in section 5.2 is this Mac's, and the column
  heading says so.
- `git add` and `git restore --staged` were never timed anywhere. The model says about 26 ms each and
  that is an inference.
- No file write was performed on any second machine. Every result in section 4.2 is a local
  simulation. Whether SIGKILL on the local ssh stops the far side shell mid write is unknown, and it
  is what decides which failure a timeout produces. That is the charter's own named question for
  section 4 and it is unanswered.
- The 47 chunk binary transfer was priced from one chunk, and nothing was written on the Mac Pro. The
  claim that a base64 round trip of the packed rg still runs was established on this Mac, about a
  binary whose whole point is running there.
- `capture-pane` was never run against the Mac Pro's own tmux. The byte figures assume 168 bytes per
  line from a synthetic buffer, so every one is a floor.

**Machines and sizes nobody has.**

- No Linux machine was contacted. Every remote number in this document is one arm64 Mac running
  macOS 15.7.7 over Tailscale. GNU grep is faster than BSD grep and has a different escape dialect,
  a Linux `find` differs, `base64` is spelled differently, and `MAX_ARG_STRLEN` is still the
  documented constant that `REMOTE_SCRIPT_MAX_BYTES` was chosen from rather than a measurement.
- No large repository exists on the Mac Pro. His four git directories to depth 5 are
  `Desktop/Meditations on Tech`, `Desktop`, `dev` and `.oh-my-zsh`, the largest being 1,096 tracked
  files and 7,073,526 bytes. So the 32,880 against 1,571 blowup was counted on this Mac, and the
  search corpus of 33,023,414 bytes does not exist over there.
- No repository with 100,000 commits was walked. Research 24 section 9.1 recorded 0.53 s without a
  commit graph and 0.01 s with one on a 130,622 commit repository and that was not remeasured.

**Gates not run.**

- `npm run conformance:machines`, `npm run conformance:context` and the rest were not run, because
  this worktree has no `node_modules`. Every count in section 1 comes from reading the source.
- `scanContext` was never executed against a remote port. The port swap is argued from the type and
  from the import list, not from a run.

**Other.**

- Concurrency was never measured. Every number here is one operation at a time.
- The tail latency of the link matters and is only partly characterised. Ten pings to the tailnet
  address gave a minimum of 5.275 ms, a mean of 29.890 ms and a maximum of 121.388 ms, with a
  standard deviation of 36.976 ms. A design that issues five calls in series exposes a person to that
  121 ms tail five times.
- The two broken menu items in defect 2 were not driven in the app, and the same-name collision that
  makes the worst case real was not demonstrated against a running server.
- Whether the `C-b [` chord reaches the far tmux client through the renderer was not tested. If it
  does, a person can already scroll a remote session by hand, and the scrollback gap is an affordance
  rather than a capability.
- The sizes of the other 11 `@vscode/ripgrep` platform packages are unmeasured, and notarisation was
  not run against the build the signature facts came from.
- A count difference was noticed and not resolved. `.oh-my-zsh` was measured this round at 1,495
  entries, and the `REMOTE_TREE_DEPTH` docstring records the Phase 90.3 probe of the same folder at
  1,492. The depth 3 figure of 1,445 matches exactly in both.

## 11. The decisions that need the operator's word

Two, and nothing in section 12 that depends on them should start before he answers.

**Decision 1. May Tortie write a file on his machine at all, and what does he confirm when it does.**
This is the whole of phases 6 to 9 in the plan. Today the product can state, and check by reading
script text, that no command it sends can replace a file somebody already had. After `file-put` that
sentence weakens to a checksum promise, and `ALLOWED_WRITERS` goes from two to eight. The charter
requires every widening proposal to state what a person confirms, and this document does not have an
answer he has agreed to. Three shapes are possible. A machine could carry a new confirmed field, the
way `remoteTmuxPath` does, which means every existing machine's confirmation moves. A write could be
confirmed per project folder, which is a new confirmation surface. Or writes could ride the existing
machine confirmation with no new field, which is the smallest change and the one that says the least.
This document recommends the first, because it is the only one with a precedent in the product, and
it is his call rather than mine.

**Decision 2. Does he want the search phase to refuse on a machine with no git.** The adopted search
mechanism uses `git ls-files` inside a repository and one `find` walk outside one. The `find` walk was
measured at 366 to 753 ms against 174 to 176 ms, and its answer includes build output, so it returns
19 lines where the git path returns 14 and 5 of the 19 are wrong. The phase can either answer with
the wider result and say plainly that the folder is not a repository so nothing is being skipped, or
refuse outside a repository. This document recommends answering and saying so, and it is a product
choice rather than a technical one.

## 12. The phase plan

Ordered by what he would hit first, being search, then scrollback, then save, then the git writes,
with two changes he should know about. Quick Open is placed immediately after search because it needs
the same one line gate edit and one script. The correctness rows are placed first because they cost no
new door and one of them makes the product state something false about his own work.

| # | Phase | What he can do afterwards | Size | Tier | Risk | Depends on |
|---|---|---|---|---|---|---|
| 1 | The four defects on the remote surfaces | Stop typing into a remote file tab that will never save, stop seeing Capture and Clear on a session that is not on this Mac, and stop leaving a part file behind on every interrupted image upload | Small. 4 files, 1 script text, no new door | 2 | Low. Nothing new crosses the link | Nothing |
| 2 | Untracked files in the remote Changes list | See the files an agent created on that machine, and open each one as an all-green diff | Small. 5 files, 1 new shared field, 1 existing test rewritten | 2 | Low. No new script, no new verb, no new write | Nothing |
| 3 | Search on a machine | Search across a project on another machine from the Search view, with the same panel and the same caps as a local search | Medium. 1 new read script, 1 new allowed git verb, 1 gate edit, 1 IPC channel, the Search view's refusal copy deleted | 2 | Low. Nothing starts, nothing is written, and a wrong pattern costs one answer | Nothing. It owns the `ls-files` gate edit |
| 4 | Quick Open on a remote tab | Press the Quick Open chord on a tab whose files are on another machine and reach any file by typing its name | Medium. 1 new read script, 1 optional worker protocol field, 2 renderer key changes carrying the machine id, 1 copy deletion | 2 | Low. The trap is the recents key, and the phase brief must name it | Phase 3, for the git verb |
| 5 | Read the last lines of a session on another machine | Read back the last N lines of an agent's output on that machine, from the session menu, without leaving Tortie | Small. No new script, no ledger change, 1 new IPC channel, 1 panel | 2 | Low. `capture-pane` is a read verb that is safe to repeat | Phase 95, whose copy must drop the sentence saying scrolling back is not available |
| 6 | Save a file on a machine | Edit a file on another machine in the editor and save it, and create a new empty file there | Large. `file-put`, `ALLOWED_WRITERS` 2 to 3, rule 6 rewritten, condition 38 gains a branch, the read cap question in section 4.5 answered, the read-only chip copy rewritten | 3 | High. It is the first time Tortie replaces a file somebody already had, on a computer nobody is watching | Decision 1, and phase 1 |
| 7 | New folder and rename on a machine | Make a folder and rename or move a file or folder on another machine, from the Explorer | Medium. `dir-new` and `entry-rename`, `ALLOWED_WRITERS` 3 to 5, two gate branches, the Explorer menu on a remote row | 3 | Medium. Both are guarded by a `-e` test and both are safe to run twice | Phase 6 |
| 8 | Stage and unstage on a remote tab | Choose what goes into the next commit on that machine, from the Changes list | Large. `git-stage` and `git-unstage`, `ALLOWED_WRITERS` 5 to 7, `add`, `restore` and `rm` added to the allowed verbs, the gate condition in section 5.7 written, the read-only band sentence rewritten | 3 | High. It is the first git write on another computer | Phases 2 and 6 |
| 9 | Commit on a remote tab | Commit on that machine from here, with his own hooks and his own signing running over there | Large. `git-commit`, `ALLOWED_WRITERS` 7 to 8, a HEAD guard passed in so a lost answer cannot double-commit, an honest story for a hook slower than the timeout | 3 | High. Hooks, signing and an ambiguous repeat, all named in section 5.6 | Phase 8 |
| 10 | Runs on a remote tab | See the GitHub Actions runs for the branch checked out on that machine | Small. 1 new read script with 4 spawns, 1 IPC channel, `src/main/actions/*` unchanged | 2 | Low. `gh` never leaves this Mac and no credential crosses | Nothing, and after phase 3 for the script shape |
| 11 | Branches on a remote tab | See which branch is checked out over there, its upstream, and how far ahead or behind it is | Medium. 1 new read script, `for-each-ref` added to the allowed verbs, 1 gate edit | 2 | Low | Phase 10 |
| 12 | History on a remote tab | Read the commit graph of the repository on that machine and open any commit's file diff | Large. 1 new read script naming 4 new verbs, a paging story, `sanitizeRefNames` moving to the far side | 2, rising to 3 if paging lets a person ask for 20,000 commits | Medium. The answer grows at 270 base64 bytes per commit | Phase 11 |
| 13 | Context on a machine | Open the Context view on a remote tab and see what an agent running over there will actually read, with the same precedence rules | Large. 1 new read script, 3 more `printf` lines in `machine-facts`, a miss-recording `ContextFs`, a per call cap on the read list | 2 | Medium. `npm run conformance:context` is a hard gate and no row of it may move | Nothing. Its position here is by value rather than by dependency, and it can be pulled forward at any time |

### Rows that should not be built

| Row | Ruling | Deciding reason |
|---|---|---|
| Duplicate on a machine | **Not now** | It is a read plus a `file-put` and it earns no new door of its own. A folder duplicate has no bounded shape through this catalogue. Revisit after phase 7 if he asks for it. |
| Trash on a machine | **Never, as a delete** | `shell.trashItem` has no far side equal, so every honest remote spelling is a delete with no undo. The product already refused this for the Explorer tree and wrote down the reason. |
| Reveal on a machine | **Never** | It opens Finder on this Mac over a file on this Mac. There is no local path to reveal and no Finder over there Tortie may drive. |
| Symbols on a remote tab | **Not now, revisit after phase 6** | There is no parser on the machine, and the only honest mechanism moves 4,014,080 bytes compressed on a keystroke to land in a tab that cannot be saved. Phase 6 is the change that makes the destination editable and therefore the change that makes it worth the bytes. |
| Discard on a remote tab | **Never** | It destroys work that was never committed anywhere, there is no undo on that machine, and no read can answer afterwards whether it ran. The refusal is written into the gate by the condition in section 5.7. |
| A real remote scrollbar | **Never in this shape** | It needs `copy-mode` on the ledger and an open family of `send-keys -X` commands through the one door Phase 89 narrowed, or it needs the control connection, which is the one carriage with no gate. |
| Ship a ripgrep and send it | **Refused** | It buys 0.15 s and costs a third write door, a 47 chunk protocol, a per architecture matrix, a sixth confirmation field and a Tortie-placed executable on his computer. |
| Remote Context install, enable or pin | **Never** | Eleven of the twelve `context:*` channels run a binary under `process.resourcesPath`, reach the network, or write Tortie's own pin store. Remote Context is a read. |
