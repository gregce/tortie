# Research 100 — what a save loses today, and the six answers it could give

**Phase 240, the measure step.** 2026-09-08, worktree `/private/tmp/wt-p240` detached at `6ac4de16`.

This is the parent measurement for [issue 16](https://github.com/gregce/tortie/issues/16), filed by
Sean Johnson on 2026-09-08:

> When I edit a file, then save, there's no warning if someone else (presumably an agent) edited it
> concurrently and I'm overwriting its edits (as VSC does).

Everything below was run rather than read. Two helpers were written and both are re-runnable:

- `build/p240/save-loss.mjs` — the app run. ONE Electron on a scratch profile, a scratch `HOME` and
  its own tmux socket, over a git repository it builds inside its own scratch directory. It spawns
  no agent, spends no token, opens no keychain and makes no request; the "agent" is a plain
  `/bin/sh` running `cat`. `--self-test` proves its grader on six fixtures and launches nothing.
- `build/p240/save-window.mts` and `build/p240/plain-write.mts` — the node halves. They load the
  SHIPPING `src/main/fs/guarded-write.ts` and drive `node:fs`'s own `writeFile` respectively, over
  scratch directories they remove in a `finally`.

The operator's `-L gmux` server held **19 sessions before and 19 after** every run, read and never
attached.

---

## 0. The answer, before any detail

| | File mode | Redline mode |
| --- | --- | --- |
| the agent's write | 628 B on disk | 628 B on disk |
| bytes of it destroyed by Cmd-S | **173** | **173** |
| what the face said | **nothing** | **nothing** |
| a dialog | none | none |
| the tab afterwards | clean | clean |

The call site that moves is **one line**, `src/renderer/editor/tab-io.ts:693`, and it moves for the
worktree tab only. **Compare can use the diff Tortie already draws**, because that surface takes two
plain strings, but it cannot borrow `tab.headContents` to carry the disk side — that field is the
watcher's, measured moving under a dirty tab in this run.

Three things the charter states that the tree contradicts, each measured below: the six refusal words
are **nine** in `src/shared/fs-ops.ts` (§3); `conformance:redline-write` **cannot** stay green
unchanged, because its rule 5 pins the channel to one renderer caller by name (§5.4); and the
`refreshRepo` line both the charter and research 83 cite as `tab-io.ts:616` is `:752` here (§1.1).

---

## 1. The loss, reproduced in the running app

The fixture is a tracked, committed prose file of 455 bytes. The person clicks into it and types
`PERSON ` with real key events. A `/bin/sh` then writes a whole new paragraph into the file from
outside — 173 characters, all ASCII, so 173 bytes. Six seconds pass, which is several watcher ticks.
Then ⌘S, and the file is read **from disk**.

### 1.1 File mode

```
agent wrote                                   628 B
disk before the save is the agent's           true
the tab's savedContents after six seconds     455 B   (unchanged)
the tab saw the agent's write                 false
toasts before the save                        []
banners before the save                       []
--- Cmd-S ---
disk after the save                           462 B
the file still holds the agent's paragraph    false
characters of the agent's write destroyed     173     (character-level LCS)
net shrink                                    166 B
toasts after the save                         []
banners after the save                        []
a dialog opened                               false
the tab is still dirty                        false
```

The first sixty characters on disk afterwards are
`PERSON The quick brown fox jumped over the lazy dog.\n\nParagr` — the person's seven characters, and
the file as it stood **before** the agent touched it.

**`tabSawTheAgentWrite: false` is the deliberate window.** `refreshRepo` reloads a
buffer only `if (!tab.dirty)`, on purpose, so a person's typing is never overwritten by the watcher
(research 83 A4.3). From the first keystroke the agent's writes stop arriving.

**That line is `tab-io.ts:752` in this worktree, not the `:616` research 83 and the charter both
quote.** The file grew through Phases 225 to 237 and the citation went stale; the rule itself is
unchanged. It is correct, and this phase does not touch it — it is what makes the warning necessary
rather than what the warning replaces.

### 1.2 Redline mode

Phase 237 stated this as its own limit on both surfaces. Confirmed rather than inherited, on a second
file, with the person's word typed into the redline document itself:

```
typed on the face                             true
agent wrote                                   628 B
disk before the save is the agent's           true
the redline's right side holds the paragraph  false
--- Cmd-S ---
disk after the save                           462 B
characters of the agent's write destroyed     173
toasts after the save                         []
a dialog opened                               false
```

The redline's typing goes into the tab's own Monaco working model (`redline-edits.ts`, "Where a typed
character goes, and why it is monaco's model"), so ⌘S is the identical `save` and the identical loss.

### 1.3 The only sentence anywhere near it, quoted

In File mode there is no sentence at all. In Redline mode the face carries one, from
`baselineSentence` in `src/renderer/editor/baseline.ts:188`:

> Marked since the last commit, for as long as this tab is open. Not refreshed from disk while there
> are unsaved edits.

It is honest and it is not the warning. It says the **view** is not being refreshed. It does not say
the file changed, it does not say what changed, and it says nothing at all at the moment of the save
— after ⌘S the tab is clean and the sentence reverts to
`Marked since the last commit, for as long as this tab is open.`

### 1.4 The size of the loss is unbounded

173 bytes is the fixture. The loss is *everything written to that file between the person's first
keystroke and their ⌘S*, from the only copy, and the write returns success. Research 83 E.7 measured
the same shape on the rewind path at 85 bytes and said the same thing: unbounded in general.

---

## 2. `fs:writeFile`'s callers, and which one moves

Scanned over `src/renderer`, `src/preload` and `src/shared`. There are **two production call sites and
one harness one**, and one type declaration.

| site | what it is | in scope |
| --- | --- | --- |
| `src/renderer/editor/tab-io.ts:693` | `await gmux.fs.writeFile(tab.path, value)` — the save | **YES, and it is the whole phase** |
| `src/renderer/editor/history-search-shot-probe.ts:340` and `:344` | the Phase 199 harness probe, installed by `shot-hook` on a harness launch and on nothing else | no |
| `src/preload/files.ts` / `src/shared/ipc/base.ts:169` | the bridge declaration | no |

`fs:writeFile` is not removed and its handler at `src/main/fs/ipc.ts:229-247` is not changed.

### 2.1 The save does not move whole, and this is the finding that shapes the build

`fs:writeGuarded` requires `root` to be a folder Tortie has **open**, resolved through the same
`resolveOpenProjectRoot` gate `fs:createFile`, `fs:rename`, `fs:move` and `fs:trash` ask, and it
requires `path` to resolve **inside** it. Two shapes of tab save fine today and would be refused
`outside` if the whole call site moved:

1. **A file outside its repo.** `openFileAt` in `src/renderer/context/open-detail.ts:89` opens a
   Context entry's `sourcePath` — a global `~/.claude/CLAUDE.md`, a `~/.codex/config.toml` — as an
   ordinary editable File-mode tab carrying the project's `repoPath`. `refreshRepo` already knows:
   `fileInRepo(tab.repoPath, tab.path)` at `tab-identity.ts:146` is the predicate it uses to skip
   `git show HEAD:` for exactly these tabs.
2. **A symlinked file inside a repo.** Measured in §3: today's channel follows the link and replaces
   what it points at; the guarded channel refuses `link`.

**So the discriminator already exists in the tree.** `fileInRepo(tab.repoPath, tab.path)` is what
decides which door a save takes: inside, it is the guarded write; outside, `fs:writeFile` unchanged.
Everything else about the save — the commit-tab refusal, the arch-map refusal, the diagnostics
refusal, the remote branch, the truncated refusal — is above the write and does not move.

---

## 3. The answers the channel can give, and what a person sees today

**The charter names six refusal words and the tree has nine.** `FsGuardedWriteRefusal` in
`src/shared/fs-ops.ts:339` is `input | outside | missing | link | readOnly | tooLarge | notUtf8 |
raced | io`. The charter's spelling — `outsideRoot`, `overCap`, `decodeLoss` — is the **redline's**
vocabulary, `RewindRefusal` at `src/renderer/editor/rewind.ts:170`, and the map between them already
ships as `rewindRefusalKey` at `rewind.ts:330`. That map collapses `input`, `missing` and `link` to
`io`, which is fine for a rewind and is **not** fine for a save: a person whose `notes.md` is a
symlink deserves to be told that, not "could not be saved."

### 3.1 What today's save does, measured

`build/p240/plain-write.mts` drives `writeFile(abs, contents, 'utf8')` — the handler's whole body —
over one arm per word. **Two of eight throw. Six write, and five of those destroy something.**

| word | today's save | what a person sees |
| --- | --- | --- |
| `stale` | **wrote**; the other writer's 54 B gone | nothing |
| `outside` | **wrote**; a file in no open project replaced | nothing |
| `link` | **wrote**; the link stayed a link and what it points at was replaced | nothing |
| `missing` | **wrote**; created the file | nothing |
| `notUtf8` | **wrote**; a 40 B latin-1 file became 48 B with **4 U+FFFD written to disk** and no accent surviving | nothing |
| `tooLarge` | **wrote**; a 6,291,456 B file became 5,242,880 B, **1,048,576 B of tail gone** | nothing *(but see below)* |
| `readOnly` | throws `EACCES` | the generic sentence |
| `io` | throws `EISDIR` | the generic sentence |
| `raced` | not expressible: there is no window, because there is no check | nothing |

`tooLarge` is the one the tab already guards: `save` returns false for `tab.truncated`
(`tab-io.ts:688`) **silently**, so ⌘S on a large file today does nothing and says nothing. The row
above is what the raw channel would do without that guard.

### 3.2 The generic sentence, quoted from the tree

`src/renderer/editor/tab-io.ts:701`:

```ts
`Could not save this file. ${errorSentence(err, 'The write failed.')}`
```

and main's own message at `src/main/fs/ipc.ts:242` is `Could not save ${basename(abs)}`. So a person
whose file is read-only reads, in one toast, **"Could not save this file. Could not save notes.txt."**
— the same sentence twice, naming no cause and no remedy. `errorSentence` falls back to
`The write failed.` for anything longer than 160 characters or shaped like machinery.

### 3.3 The shape a sentence should take is already in the tree, twice

- `src/renderer/machines/editor.ts:82`, the remote save's stale answer, which is the pattern this
  phase brings the local path level with: *"Tortie did not save this file, because it changed on
  {machine} after Tortie read it. Nothing was written. Open it again to read what it says now."*
- `src/renderer/editor/redline-sentences.ts:19`, a total `Record` over the refusal union so a word
  added without a sentence does not compile.

---

## 4. The same-size window, measured on the save path

Phase 226 states it as the channel's limit: after step 8's `lstat`/`fstat` comparison, what remains is
the gap from that `lstat` to the `rename`, "two system calls with nothing between them". Phase 226's
verifier read 15 of 25 `wrote` answers under a racer rewriting every ~50 µs; its fix round re-derived
1 of 5 over 32,921 rewrites in eight seconds. Both were the rewind payload. Here it is the save
payload, driven through the shipping module.

### 4.1 Sean's own sequence, through the channel

The tab read V1 (455 B), the agent wrote V_AGENT (628 B), the person presses ⌘S with a 462 B buffer:

```
answer                    stale
digest handed back        d764350dd060272329520fe9bf616bb3a875503a37b7177273edf2d2c1edfc15
                          (identical to sha256 of what is on disk)
the file was not touched  true
```

and the second, deliberate act — the same call with `expect` set to the digest just handed back —
answers `wrote`, with the buffer on disk. **The choice the charter asks for is already expressible in
the channel that ships.**

### 4.2 The two windows, timed through the `afterStage` seam

Median of five runs per size, on this machine's APFS volume:

| save size | hash → staged | staged → rename |
| --- | --- | --- |
| 640 B | 0.208 ms | 0.132 ms |
| 100 KB | 0.368 ms | 0.124 ms |
| 1 MB | 1.644 ms | 0.469 ms |
| 5 MB (the cap) | 7.200 ms | 1.969 ms |

The first column is the window step 8 closes. The second still contains the two `lstat` calls, so it
overstates the real gap; timed on its own over 2,000 iterations the two `lstat` calls and the
`rename` together take a **median of 87 µs, a p99 of 351 µs**.

Timestamps do not help an attacker here and do not need to: `mtimeNs` on this volume was **200
distinct values over 200 consecutive writes**, every one carrying sub-microsecond digits, so a
same-size in-place rewrite always moves the stamp. What the gap loses, it loses because there is no
check in it at all, not because a stamp collided.

### 4.3 The race, run

A child rewrites the file **in place, at exactly the same length**, through one `pwrite` on a held
descriptor, as fast as it can. This process saves in a loop through the shipping channel for eight
seconds:

```
saves attempted           61,762
  stale                   61,567
  refused/raced               91
  wrote                      104
racer rewrites in 8 s    315,000   (one every 25 µs, 39,000 a second)
```

**99.83 % of the saves were caught**, and the 0.17 % that answered `wrote` sit over an 87 µs gap
against a writer at 25 µs, so those are the ones where something may have been lost with nothing said.

### 4.4 Does any real editor or agent write at that rate? No — and rate is not even the question

The shapes a real writer actually uses were each fired **inside** the window, through the `afterStage`
seam, which is after the staged copy and before the target is checked:

| the writer's shape | the channel answered | the writer's bytes survived |
| --- | --- | --- |
| truncate in place, different size (`cat > file`) | `refused/raced` | yes |
| whole-file rewrite, same size, in place (`pwrite`) | `refused/raced` | yes |
| atomic replace by rename (what editors do) | `refused/raced` | yes |
| append one line | `refused/raced` | yes |
| `chmod` alone, no byte moved | `refused/raced` | yes |
| nothing at all (the control) | `wrote` | n/a (the control must write) |

**Every shape is caught, including the same-size in-place rewrite**, because it moves `mtimeNs`. The
racer in §4.3 gets its 104 `wrote` answers by landing in the 87 µs gap after the last `lstat`, at
39,000 writes a second with nothing else to do. An agent writes a file once per tool call — call it
a few a second at the very most — and it writes it by truncation or by rename, both of which are
caught wherever they land. **The stated limit is real and it is not reachable by anything a person
runs.** It should be quoted in the build's commit body rather than assumed absent, which is what the
charter asks.

---

## 5. Pricing the three-way choice

### 5.1 The house already has a three-answer dialog, and it is the right one

`ConfirmSpec` at `src/renderer/state/overlays-slice.ts:20` carries an optional third choice:

```ts
/**
 * Optional THIRD choice, for the one dialog shape where two answers can
 * only lose work: "Save / Don't Save / Cancel" when closing a dirty editor
 * tab. Rendered leading-left, away from the confirm button.
 */
altLabel?: string;
onAlt?: () => void;
```

Its one production user is `promptDirtyClose` at `src/renderer/editor/store.ts:289`, whose own
comment reads *"The one dialog in gmux with three answers. A two-button destructive confirm on a
dirty buffer can only lose work."* That is this dialog's argument word for word, so this phase adds
no shape.

**Two mechanical constraints the build inherits from `ConfirmDialog.tsx`, and they decide the layout:**

1. `confirmRef` is focused on open and a bare Return runs `onConfirm`. So whichever action is
   `confirmLabel` **is** the default. The charter says the default is not overwrite; therefore
   **Overwrite must be `altLabel`** (drawn leading-left, away from the primary) and Compare the
   confirm. Cancel is the middle button and is what Escape and a scrim click already do.
2. `destructive: true` paints the confirm with the error fill. It belongs on nothing here, because
   the primary is Compare.

### 5.2 Compare, and whether the existing diff can take it

**The surface can.** `PierreDiff.tsx:162-177` builds its two sides as two `FileContents` objects from
two plain strings — `tab.headContents ?? ''` on the left, the live working text on the right — and
makes no git call of its own. A history tab already proves the case: `loadCommitDiff` fills **both**
sides once and `refreshRepo` refuses the tab thereafter (`worktreeTabsIn` at `store.ts:271` filters
`commit === null`), so a diff of two in-memory strings that nothing refreshes is a shape this product
already ships, in three flavours — history, the Phase 73 review tab, and Phase 233's remote commit
tab.

**The live tab cannot lend `headContents`, and that was measured rather than reasoned.** `refreshRepo`
re-runs `git show HEAD:<path>` on every watcher tick for a worktree tab and does **not** skip a dirty
one — only the buffer re-read is skipped. In the app run, with the tab dirty and HEAD moved under it:

```
dirty while HEAD moved             true
headContents before                455 B
headContents after                 476 B
headContents followed the commit   true
```

So a Compare that wrote the disk bytes into `headContents` on the live tab would be overwritten
within a tick, and the person would be looking at HEAD while the dialog said "disk".

**Therefore Compare is a tab of the history family, not a mutation of the live one.** Both sides are
handed in at open — the disk bytes read at the moment of the refusal on the left, the buffer on the
right — and nothing refreshes it. Three things fall out for free: `save` already returns false for
such a tab, `refreshRepo` already refuses it, and closing it disturbs nothing. Two things the build
owes: a tab identity so a second Compare replaces rather than stacks (`tab-identity.ts`), and a name
for the left side, since `PierreDiff` labels it from `origRelPath ?? tab.name`.

**No new IPC channel is needed and `docs/audits/contract-baseline.txt` does not move**, which is what
the charter already says: the disk bytes arrive through `fs:readFile`, which the renderer already
calls, and the two sides are supplied to the store directly.

### 5.3 What the overwrite costs

Overwrite is a second call through the same channel with `expect` set to the digest of what was just
read — §4.1 measured that round trip end to end — so a third writer arriving between the dialog
appearing and the button being pressed is answered `stale` again rather than lost. The channel hands
its digest back on both `wrote` and `stale` precisely so this loop terminates.

### 5.4 One gate cannot stay green unchanged, and its own comment says how to fix it

The charter says *"`npm run conformance:redline-write` stays green unchanged, because the channel
does not change."* The channel does not change and **the gate cannot stay unchanged**, because rule 5
is not about the channel — it is about who may call it:

```js
const RENDERER_CALLER = 'src/renderer/editor/redline-write.ts';
…
if (callers.length !== 1 || callers[0] !== RENDERER_CALLER) fail(…)
```

Run at HEAD it prints *"5. the renderer reaches the channel from src/renderer/editor/redline-write.ts
alone, the redline's one call site"*, and the save becoming a second caller turns it red. **Its own
header already says what to do**, because this is the second time:

> Phase 226 shipped this channel unwired and this rule read "nothing under src/renderer names it".
> Phase 227 wired the rewind, so the rule was NARROWED rather than deleted … a SECOND caller is a
> finding.

So the build phase widens rule 5 from one named file to two named files — never to "any number" —
keeping the property that this write has a countable set of doors. The other six rules and all
fifteen ablations are untouched, and the gate was re-run at HEAD in this worktree to confirm the
starting state: **28 readings, 15 of 15 ablations red, every rule passed.**

`conformance:redline`'s rule 9 is NOT affected: its file set is derived from the names `redline*`,
`Redline*`, `rewind.ts` and `baseline.ts` under `src/renderer/editor`, and `tab-io.ts` is not among
them.

---

## 6. What this measurement did NOT establish

- **Nothing was run at a fix.** This is the parent measurement; every number above is HEAD at
  `6ac4de16`.
- **No sentence is proposed here.** The wording of the three buttons and the six refusals is the
  build phase's, written beside `redline-sentences.ts` as the charter says.
- **The `link` refusal's real-world frequency is unmeasured.** It is known to be a behaviour change
  (§2.1, §3.1) and the build must decide whether a symlinked file inside a project keeps saving
  through the old door or is refused with a sentence. Nothing here says which is right.
- **No encoding work.** `notUtf8` is measured at 4 U+FFFD written to disk today; the guarded channel
  refuses it. That is a strictly better answer and it is not encoding detection, which research 83
  E.7b already refused.
- **No agent was started and no token was spent.** Every "agent" in this document is `/bin/sh`.

---

## 7. The committer's round — the plain door had the reading and neither guard

Sections 0 to 6 are the parent measurement, taken at `6ac4de16` before anything was built. This
section is taken at `5077ed65`, the end of the fix round, and it is here because the verifier's
finding was that the phase's own subject line was unmet on the door the fix round had just added.

### 7.1 What the fix round built, and what it left

The fix round gave the plain door — a symbolic link inside a project, a file outside every open
project, a never-saved draft — a READING in front of its write. It did not give that door the two
things the guarded channel has behind its reading:

| | guarded door (`fs:writeGuarded`) | plain door at `5077ed65` |
| --- | --- | --- |
| first save re-checks the file | yes, compare-and-swap on raw bytes | yes, a decoded-text reading |
| **Overwrite re-checks the file** | **yes, against the digest of what was shown** | **no, unconditional** |
| **a lossy decode is refused** | **yes, `notUtf8` on a byte round trip** | **no, written back whole** |

### 7.2 The Overwrite, measured

`build/p240/plain-door.mts` drives the door's sequence over real files with a real `/bin/sh` racer,
500 rounds per policy, the two arms differing in one line:

| policy | third writers destroyed unasked | characters destroyed | asked again | still wrote in the end |
| --- | --- | --- | --- | --- |
| unconditional (`5077ed65`) | **500 of 500** | **21,890** | 0 | 500 |
| reads again (HEAD) | **0 of 500** | **0** | 500 | **500** |

The last column is the answer to the reason the fix round wrote down for leaving it unconditional,
which was that re-reading "would find the same difference for ever". It does not, because the door
re-reads against the text it SHOWED rather than against `savedContents`, exactly as the guarded door
re-reads against the digest the channel handed back with `stale`. Every extra round needs another
writer to arrive, so with nobody else writing the second press goes through — 500 times out of 500.

The same shape in the running app is `npm run probe:p240` arm F: a `/bin/sh` writes the link's
target while the question is on screen, Overwrite is pressed, and the question is asked again over
the newer bytes with the third writer's paragraph still on disk. At `5077ed65` the same arm lost 38
characters with no toast and a clean tab, while arm D — the guarded door — re-asked in the same run.

### 7.3 The encoding, measured

`fs:readFile` decodes with `Buffer.toString('utf8')`, which turns every byte sequence that is not
UTF-8 into U+FFFD and never says that it did. Section 3 measured what that costs on the OLD save
path: 4 U+FFFD written to disk. The fix round's `notUtf8` re-read closed it on the guarded door only,
so a latin-1 file reached through a symbolic link inside a project — the plain door — still went
**49 B to 58 B with four U+FFFD written into it, its four accented bytes replaced by twelve**, with
no dialog and no toast.

The plain door has no bytes to compare, so it asks the one question a decoded string can answer: does
the text it read carry U+FFFD. If it does, the round trip is not safe and the save is refused with
the same word the guarded channel answers for the same file. `npm run probe:p240` arm I is that
reading in the running app: no dialog, the encoding sentence, 37 B before and after, and 4 bytes at
or above 0x80 before and after.

**The stated limit is the false positive.** A file that really is UTF-8 and really holds a U+FFFD
character is refused a save on this door and told it is not UTF-8, which is wrong about that one
file. The other direction destroys somebody's bytes with nothing said, and this way the two doors
answer the same word about the same file.

### 7.4 A third hole found in passing

The plain door's reading had one word for "could not read it" and wrote on both halves of it. A file
that is not there must be written — that is what a draft is. A file that came back TRUNCATED, having
grown past `READ_CAP_BYTES` while somebody typed, was replaced by the buffer whole with its tail
gone and nothing said, where the guarded channel refuses it `tooLarge`. The reading tells the two
apart now.

### 7.5 The guarded channel, re-attacked at HEAD

The channel itself is byte-unmoved by this phase, and the attack was re-run so a regression would
show. Ten seconds against a racer rewriting the file continuously:

| | reading |
| --- | --- |
| saves attempted | **78,763** |
| `stale` | 78,466 |
| `refused/raced` | 165 |
| `wrote` | 132 |
| of those, bytes destroyed inside the same-size window | **13**, being **0.017 % of saves** |
| guarded Overwrite against a third writer | **500 of 500 refused, 500 of 500 third writers survived** |

The 13 are Phase 226's own stated limit, being a change of the same size landing inside the channel's
`lstat`-to-`rename` window; `src/main/fs/guarded-write.ts`'s header carries the numbers and the
reason Node cannot close it (`renamex_np` is not exposed). No editor and no agent writes at that
rate. 99.98 % of the racer's writes were caught.
