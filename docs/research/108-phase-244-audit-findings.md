# The six findings of the 0.101.0 architecture audit, classified at HEAD

Date: 8 September 2026. Phase 244, the measure step. **Nothing was repaired in this round.**

Audited commit: `163266d68f115936786103013c9d9da76c4f6f7b`, the full-rewrite equivalent of
`f070f33cd9025c79993ca23b9802d6ee9455a573`.
Execution commit: `f2a4b2eccd6d581b68a72e358301f2051e726e06`, the revert of the premature 0.102.0 cut.
Package version at both ends: `0.101.0`.

The audit is [2026-09-08-electron-typescript-architecture-0.101.0.md](../audits/2026-09-08-electron-typescript-architecture-0.101.0.md).
Its four preserved fixtures are under [fixtures/2026-09-08/](../audits/fixtures/2026-09-08/).
**No score is stated here.** Item 7 of the phase entry is the only place a number may move, and this
document is measurement rather than assessment.

## The answer in one table

| Finding | Classification at HEAD | The command that establishes it |
| --- | --- | --- |
| F1 journal lifetime | **Reproduced, and it costs bytes** | `npx vitest run audit-0908-journal` and `build/p244/f1-inherited-undo.test.ts.fixture` |
| F2 mirror freshness | **Reproduced, over the real link** | `npx vitest run audit-0908-mirror` and `build/p244/f2-remote-mirror.test.ts.fixture` |
| F3 incomplete scan | **Reproduced** | `npx vitest run audit-0908-partial` |
| F4 read budget | **Reproduced, and the peak is twice the file** | `npx vitest run audit-0908-read-cap` and `build/p244/f4-read-cap-bytes.test.ts.fixture` |
| F5 hermetic half | **Reproduced. The green is the host's, not a fix** | `sandbox-exec -f <deny .Trash> npx vitest run install-roundtrip.test.ts` |
| F5 deadline half | **Not reproduced** | `npm run probe:controldeadline` |
| F6 split retention | **Not reproduced in this sample, and unexplained** | `P167_PROFILES=d node build/harness-socket.mjs --fresh gmux-p244-p167-<pid> 'node build/probe-p167-scale.mjs'` |

## The four fixtures, adopted exactly as the audit wrote them

Copied to the four locations the audit names, suffix dropped, **no setup changed and no assertion
weakened**. `npx vitest run audit-0908` at HEAD:

```
× audit-0908-read-cap  → expected 16777217 to be less than or equal to 5242881
× audit-0908-mirror    → expected 'export const a = 1;\n' to be 'export const a = 2;\n'
× audit-0908-partial   → expected "vi.fn()" to not be called at all, but actually been called 1 times
× audit-0908-journal   → expected 1 to be +0
Test Files  4 failed (4)   Tests  4 failed (4)
```

Four **assertion** failures, not four loader or setup failures, which is what the audit's
reproduction section asked for. No API had moved.

## Which of the findings' files moved since the audited commit

`git diff --stat 163266d6..HEAD -- <path>`, lines changed:

| File | Lines changed |
| --- | ---: |
| `src/main/context/__tests__/install-roundtrip.test.ts` | 0 |
| `src/main/fs/guarded-write.ts` | 0 |
| `src/main/machines/remote-arch.ts` | 0 |
| `src/main/arch/check-coordinator.ts` | 0 |
| `src/renderer/editor/redline-press.ts`, `redline-write.ts` | 0 |
| `src/renderer/editor/redline-journal.ts` | 32 added |
| `src/renderer/editor/store.ts` | 109 changed |

Five of the seven owners are byte identical to the commit the audit assessed, so for F2, F3, F4 and
F5's hermetic half **there is no candidate fix to look for**. The two that moved are F1's, and
neither move closes it; the journal's addition is discussed under F1 because it reads as a guard and
is not one.

## The baseline the rest of the round rests on

Run at `f2a4b2ec` with the fixtures removed from the tree, so nothing here is an audit fixture
failing on purpose.

| Check | Reading |
| --- | --- |
| `npm run typecheck` | Pass. 1,228 production files, 6,909 imports, 0 violations; 1,226 runtime graph files, 4,202 edges, 0 strongly connected components |
| `npm run build` | Pass. Eager renderer 1,568,257 raw and 396,047 gzip in 2 chunks; all 18 lazy surfaces outside it |
| Build safety gates | Pass. Electron 311 files, 105 helper users against floor 105. Background 313 files, 2 asynchronous starters, all guarded. SSH 314 files, 19 helper users, 36 fixtures |
| Contract inventory | Pass, byte for byte against the checked-in baseline |
| `npm test` | 831 files passed, 1 failed, 1 skipped; 13,211 tests passed, 1 failed, 2 skipped |
| `npm run smoke:t1` | Pass, 6 of 6 |
| `npm run probe:controldeadline` | Pass. See F5 |

**The single red is a timing arm and it is load, not the tree.**
`src/main/symbols/__tests__/store.test.ts` reads `expected 166.011 to be less than 165.665` on a
three-letter query over 100k symbols, a budget that scales itself from the machine's own measured
slowdown. Run alone it passes **15 of 15, three times**. It is a different arm from the `live.test.ts`
one the backlog recorded at `8ee3eb42`, and it belongs to the same family: a wall-clock assertion on a
loaded host.

**`install-roundtrip.test.ts` passes inside that suite too**, which is exactly the reading F5 is about.

## F5, verification, taken first because everything after it needs a trustworthy baseline

### The hermetic half: reproduced. The green is this host's permission, not a repair.

`install-roundtrip.test.ts` passes at HEAD, 6 of 6, in about half a second. **That is not a fix**,
and three readings say so.

**One. The file has not changed.** `git log 163266d6..HEAD -- src/main/context/__tests__/install-roundtrip.test.ts`
prints nothing and the diff is empty. The last commit to touch it is `f33599ba`, 14 August, before
the audited range. Line 180 still reads `const realTrash = join(userInfo().homedir, '.Trash');` and
line 182 still calls `readdirSync(realTrash)`.

**Two. It really does reach past the scratch `HOME`.** Measured inside a node process with `HOME`
set to a scratch directory, which is what `beforeAll` does:

```
{ "envHOME": "<scratch>", "userInfoHomedir": "/Users/gdc", "osHomedir": "<scratch>",
  "realTrash": "/Users/gdc/.Trash", "exists": true, "readdir": "ok", "count": 0 }
```

`os.homedir()` honours `HOME`; `os.userInfo().homedir` reads the passwd entry and does not. The test
calls the second one.

**Three. Deny the read and the audit's exact failure comes back.** Run under a seatbelt profile whose
only rule is `(deny file-read* (subpath "/Users/gdc/.Trash"))`, with everything else allowed:

```
× removes it fully through the CLI, with no residue and no Trash
  → EPERM: operation not permitted, scandir '/Users/gdc/.Trash'
  ❯ src/main/context/__tests__/install-roundtrip.test.ts:182:14
Test Files  1 failed (1)   Tests  1 failed | 5 passed (6)
```

That is the audit's reading — "the explicit hermetic lane: 5 passed, one failed" — line for line, at
the same source line. **No permission was granted to anybody to obtain the green, and none was asked
for.** The Trash was inspected only to the extent of naming it: `/Users/gdc/.Trash` is `drwx------`
and currently holds 0 entries.

So the audit's actual point stands untouched: a hermetic test that observes the real user's home is
host-dependent, and this Mac now answers where the audit's execution did not. **The repair is the
owned or injected effect**, which the phase entry already names. Do not close this on the strength of
a green run.

### The deadline half: not reproduced.

`npm run probe:controldeadline` at HEAD **passes**, in about 37 seconds. The arm the audit could not
get past is leg 0, and it is the arm the charter asks about by name:

```
0  the plane read back every registration this driver made
   {"hang":   {"program":true,"searchList":true,"socket":true,"controlPath":true},
    "healthy":{"program":true,"searchList":true,"socket":true,"controlPath":true},
    "exiter": {"program":true,"searchList":true,"socket":true,"controlPath":true}}
```

**The readback resolves through `remoteContextFor`**, which is the control plane's own export and the
function `openControlPlane` itself calls, not through the registry the driver wrote to; the driver's
`arm()` reads it before any child is spawned. All three fixtures resolve on all four fields. The legs
the audit said could never open did open: leg 3's healthy far side greeted in 9 ms and reached live,
leg 4's `%exit` far side produced 3 disconnects and 0 greeting timeouts, and leg 1 fell back at
10,003 ms against a 10,000 ms deadline with the child dead afterwards. Leg 6's ablation, the same
driver over a copy of the tree with the greeting timer clause removed, did **not** fall back and left
its child alive, so leg 1 is a reading that can fail. The forced-failure teardown arm held 3 pids and
2 directories and left 0 and 0.

The operator's own `-L gmux` server read **20 sessions before and 20 after**.

**This is the second time this mismatch has failed to reproduce** — Phase 220 recorded it once and
could not reproduce it either (research 82 §4). No hostile arm was removed, no timer or timeout was
changed, and nothing here explains the audit's execution. It is a not-reproduced finding with an
unexplained history, which is a different thing from a fixed one.

## F1, the reopened tab inherits an earlier rewind journal: reproduced, and it costs bytes

### The fixture

`audit-0908-journal` at HEAD prints `{"id":"/repo/notes.txt","reopened":"/repo/notes.txt",
"afterClose":1,"afterReopen":1}` and fails its `toBe(0)`. Same id, same journal, one entry inherited
across a close.

### The byte drive, which the audit deliberately did not do

The audit says plainly that it "did not execute an inherited undo against a real user file and does
not claim demonstrated file corruption". This round drove it, over a scratch file, through the
shipping chain: the editor store opens, closes and reopens; `pressRedline` owns the order and the
journal; `applyRewind` asks the generation guard, re-reads and calls the guarded channel;
`writeGuarded` in main replaces the real file. Only the two ends are injected, and both are routed at
real bytes on disk. Driver: `build/p244/f1-inherited-undo.test.ts.fixture`.

```
 id                        <scratch>/notes.txt
 generationFirstOpening    1
 baselineSeeded            true
 changesDrawn              1
 pressedIdentity           { off: 10, del: "brown", ins: "red" }
 rewind                    wrote
 afterRewind               "The quick brown fox jumps over the lazy dog.\n"
 depthAfterRewind          1
 depthAfterClose           1
 reopenedId                <scratch>/notes.txt      sameId true
 generationSecondOpening   1
 depthAfterReopen          1
 canUndoOnFace             true
 undo                      wrote
 afterUndo                 "The quick red fox jumps over the lazy dog.\n"
 depthAfterUndo            0
```

**What it does to bytes.** In a NEW opening, in which nothing was ever rewound, one press of undo
wrote the previous opening's inserted text into the person's file: `brown` became `red` again, five
bytes out and three bytes in, 44 bytes to 42. The bytes written are an agent's phrase the person had
already taken back out, and after the write the journal is empty, so the second undo that would put
it back does not exist.

**The generation guard does not stop it, and the guard added since the audit does not either.**
`redline-journal.ts` gained `undoableRewind` in Phase 238's fix round (`f044001f`), 32 lines, and it
is what `RedlineDocument.tsx:659` draws the Undo affordance from. It compares the entry's generation
with the tab's. **A tab's baseline generation is a property of the tab OBJECT, not of the file**:
`NO_BASELINE` starts at 0 and the first successful read seeds it to 1, so both openings read
generation 1, the comparison passes, and `canUndoOnFace` is `true`. A guard that reads as protecting
this and does not is worse than no guard, and a repair must not lean on it.

### The re-derivation: every tab-removal path in `store.ts`

Walked by hand rather than trusting the fixture's one path. **`forgetRewindJournal` has zero
production call sites** — grep over `src` outside `__tests__` finds only its own definition — and its
own doc comment says "Exported for tests and a future close." There are three places a tab leaves
`tabs`, and none of them ends the journal:

| Site | What it disposes | Journal |
| --- | --- | --- |
| `forceCloseTab` (`store.ts:695`) | `disposeModels(id)`, `dropViewState(id)` | kept |
| preview replacement (`store.ts:607`) | `disposeModels(slot.id)`, `dropViewState(slot.id)` | kept |
| LRU eviction past `MAX_TABS` (`store.ts:621`) | `disposeModels(evict.id)`, `dropViewState(evict.id)` | kept |

Eight gestures reach the first of those: `closeTab` on a clean tab, both destructive answers of
`promptDirtyClose` (Save, and Don't Save), `closeActive`, and `closeOthers`, `closeToRight`,
`closeSaved` and `closeAll` through `closeMany`. Cancel on the dirty prompt keeps the tab and
correctly changes nothing. So the sibling pattern the audit names, `disposeModels` and
`dropViewState`, is already at all three sites and is exactly where the third call belongs.

**The retention itself is unbounded.** An entry holds the deleted and the inserted strings, and there
is no entry count or byte ceiling anywhere in `redline-journal.ts`.

## F2, the remote Architecture mirror can reuse stale source indefinitely: reproduced over the real link

The audit's fixture runs the compiled-in `arch-read` script under a LOCAL `/bin/sh`. That is the
shipping script but it is not the shipping link, and the finding is about what a far side reports.
It reproduces locally at HEAD — `first {written:1,reused:0}`, `second` and `third`
`{written:0,reused:1}`, far side holding `2` and the mirror holding `1` — and it also reproduces over
the operator's Mac Pro. Driver: `build/p244/f2-remote-mirror.test.ts.fixture`.

The remote drive composes the command with the product's own `composeRemoteScriptCommand`, parses it
with the product's own `parseRemoteScriptAnswer`, and drives the shipping `syncRemoteArchMirror`.
Both writes land inside one timestamp second, at `.1` and `.9`, and both are 21 bytes.

```
 farPathResolved   /Users/gdc/tortie-p244-scratch-74615
 first             { written: 1, reused: 0, forgotten: 0, skipped: 0, overBudget: null }
 second            { written: 0, reused: 1, forgotten: 0, skipped: 0, overBudget: null }
 third             { written: 0, reused: 1, forgotten: 0, skipped: 0, overBudget: null }
 farBytes          "export const a = 2;\n"        (read by an ssh this driver composed)
 farStamp          1700000000.9  21
 mirrorBytes       "export const a = 1;\n"        mirrorSize 21
```

**The far side is read by an `ssh` the driver composed, not by Tortie's script**, so the comparison
does not trust the mechanism under test. A third pass changes nothing, which is the audit's point
that waiting does not repair it: an unchanged file keeps its recorded stamp, so every later refresh
compares the same second and the same size and reuses for ever.

The bounds this run held, all asserted or cleaned in a `finally`:

- One scratch git repository at `~/tortie-p244-scratch-74615` on that machine, `git init` with the
  identity set by `git config --local` inside it. Removed in the `finally`; `ls -d
  $HOME/tortie-p244-scratch-*` afterwards counts **0**.
- His `-L gmux` server there held **1 session before and 1 after**, `gmux-control`, created
  Thu Aug 27 21:18:51 2026, never attached and never addressed.
- Every ssh through `build/ssh-run.mjs` with a record file this run owned, being a copy of Tortie's
  own `known-machines`. His `~/.ssh/known_hosts` here measures **2,215 bytes before and 2,215 after**,
  and the far side has no `~/.ssh/known_hosts` at all, before or after.
- His real machine row was read for the host name and nothing else, and was never changed.

One honest note on the fixture bytes: the far-side writer put the two-character sequence `\n` into
the file rather than a newline, so both versions are 21 bytes of ASCII rather than 20 plus a
newline. The property under test — same size, different bytes, same timestamp second — is exactly
what was driven.

## F3, the no-contract scan loses incomplete-mirror evidence: reproduced

`audit-0908-partial` at HEAD prints `{"incompleteMirror":true,"markScannedCalls":[["path:/scratch-mirror",
"/scratch-mirror","aaaa…"]]}` and fails, because `markScanned` was called once with an incomplete
source.

The shipping code is unchanged and the audit's line numbers still land. `check-coordinator.ts:356` in
the contract-check path reads `const synced = await source.syncTree({…})` and line 360 keeps
`synced.overBudget`. The fact-only path at line 535 reads `await source.syncTree({…})` with **no
binding at all**, and line 561 gates the stamp on `if (scan.overBudget === null)` — the parser's
budget — before `db.markScanned(...)` at 573. A mirror that stopped at its file or byte ceiling is
therefore stamped as a complete scan at the supplied commit, and the map derives `building` from that
stamp.

This is a consumption error against an already-typed result, which is why the audit put Failure flow
rather than Type truth at 2. The contract-check path is the working sibling and it is eleven lines
away in the same file.

## F4, the guarded writer enforces its read cap after EOF: reproduced, and the peak is twice the file

`audit-0908-read-cap` at HEAD:

```
{"answer":{"outcome":"refused","why":"tooLarge",
           "reason":"a.txt is too large for Tortie to rewrite whole."},
 "readBytes":16777217,"cap":5242880,"diskBytes":16777217}
```

The mechanism is unchanged: `readAllSync` at `guarded-write.ts:224` loops until a short read, doubling
nothing and never asking the cap, and the cap is asked at line 330 on `raw.length` **after** the
buffers are collected.

**Counted a second way**, because a count taken with the instrument the finding is about is worth
re-deriving. Driver: `build/p244/f4-read-cap-bytes.test.ts.fixture`.

| Reading | Value |
| --- | ---: |
| bytes returned by `readSync` | 16,777,217 |
| `readSync` calls | 258 |
| `READ_CAP_BYTES` | 5,242,880 |
| over the cap by | 11,534,337 |
| bytes on disk at the end | 16,777,217 |
| process `arrayBuffers` growth across the call | 33,619,987 |
| process `rss` growth across the call | 51,101,696 |

Two of those do not depend on the counter. The refusal **sentence** is the one at line 331,
`"a.txt is too large for Tortie to rewrite whole."`, and not the payload check's
`"The new contents of … are too large to write."` at line 326; only the first is reachable with the
whole file collected, so the sentence alone says the buffer existed. And the ArrayBuffer growth is
about **twice** the file, which is a fact the audit did not state: `readAllSync` holds the chunk list
and then `Buffer.concat` allocates a second full copy, so a 16 MiB growth costs about 32 MiB of
buffer on main's thread before anything is refused.

The target was not replaced, as the audit says. This remains excess synchronous reading into main
rather than a demonstrated hang.

## F6, the split retention finding: not reproduced in this sample, and unexplained

`P167_PROFILES=d node build/harness-socket.mjs --fresh gmux-p244-p167-<pid> 'node build/probe-p167-scale.mjs'`,
one Electron on a scratch profile and that scratch socket, 3 blocks of 6 cycles at full speed:

```
d, split, close and reattach
  before   heap 7.2 MB, nodes 452 (277 on screen), listeners 231, documents 14, ptmx 0, ttys 0
  census   0 detached element(s), 0 in Past Sessions
  block 1  heap 10.4 MB, nodes 453 (278 on screen), listeners 231, ptmx 0, ttys 0   (154,320 ms)
  census   0 detached element(s), 24 in Past Sessions
  block 2  heap 10.1 MB, nodes 453 (278 on screen), listeners 231, ptmx 0, ttys 0   (176,718 ms)
  census   0 detached element(s), 48 in Past Sessions
  block 3  heap 10.1 MB, nodes 453 (278 on screen), listeners 231, ptmx 0, ttys 0   (176,699 ms)
  census   0 detached element(s), 72 in Past Sessions
  ok, the worst block to block growth was heap 0.0 MB, nodes 0, listeners 0
the planted leak, which proves the ruler is armed
  planted 1032 element(s) in 24 detached trees; the census saw 1032 more,
  the grader raised 1 finding(s), and 0 were still held after the page let go
```

**A green sample is not an explanation and none is claimed here.** What the run does establish is
narrower and worth writing down:

- **The rulers were armed.** The planted-leak control saw all 1,032 elements through
  `Runtime.queryObjects`, raised its finding, and read 0 after release, so a run that read 0 detached
  elements read 0 because there were none.
- **The workload floor landed.** Past Sessions records 24, 48 and 72 discarded sessions, three
  quarters of `cycles × 4` in every block, so this is not a flat reading taken over an absent
  workload. That is the distinction Phase 220's fix round added and it is what makes a flat node
  count this profile's healthy answer rather than an unmeasured one.
- **Main held the descriptors it started with**, 0 `ptmx` and 0 `ttys` after every block, which is
  Phase 167's finding 1 still closed.
- **Detached elements read 0, 0, 0.** The audit's own live run read 142, 13 and 13 after a starting
  count of 4, with the first block's excess released rather than accumulated. This run drove profile
  d alone from a fresh launch, where the audit drove b, c and d in one session, so the two numbers
  are not comparable and the difference is not evidence of anything.

So F6 stands exactly where the audit left it: **an intermittent failure last seen at `b5cc017`, two
runs of three, at about 5 MB and exactly 1,020 DOM nodes a block, over a renderer byte identical to
the seven later runs that came back clean.** Neither Phase 200 lever reproduced it and neither did
this. The closure the architecture goal asks for is a retaining path with a regression, or a
controlled explanation that reproduces both the failing and the passing conditions, and this round
has neither.

## The audited commit behaves exactly as the audit said it did

The audit asks that the fixtures be established at the assessed commit first. `163266d6` was
materialised read-only with `git archive` into a scratch tree — no worktree was added and nothing in
the operator's checkout was written — with `node_modules` and `build/vendor` cloned in. The four
fixtures there:

```
× audit-0908-read-cap  → expected 16777217 to be less than or equal to 5242881
× audit-0908-mirror    → expected 'export const a = 1;\n' to be 'export const a = 2;\n'
× audit-0908-partial   → expected "vi.fn()" to not be called at all, but actually been called 1 times
× audit-0908-journal   → expected 1 to be +0
Test Files  4 failed (4)   Tests  4 failed (4)
```

Four assertion failures, byte-for-byte the same readings as at HEAD, including the same 16,777,217
and the same `{written:0,reused:1}`.

**And `install-roundtrip.test.ts` at the assessed commit passes 6 of 6 on this Mac.** That is the
cleanest statement of F5's hermetic half there is: the source the audit ran red is green here, on the
same bytes, because the host answers differently.

## What this round did NOT establish

- **No repair was made.** Six findings were classified; nothing under `src/` was changed. The only
  files this round adds are the three drivers under `build/p244/` and this document.
- **F5's deadline half is not explained.** It passes here and it passed for Phase 220. Two
  non-reproductions are not a diagnosis of the audit's execution, and no hostile arm, no timer and no
  timeout was touched to obtain the pass.
- **F6 is not explained**, and a passing sample is not offered as one.
- **F1's reachability through the mounted view was not driven.** The byte drive goes through
  `pressRedline`, which is the one function the chord and the Edit-menu row both reach, and the face's
  own `undoableRewind` question was read and answers `true`; a full app run pressing ⌥⇧⌫ in a
  reopened tab was not done and belongs with the repair.
- **No inference is drawn about the shipped 0.101.0 application** from any of this. Everything here
  was measured in a detached worktree at `f2a4b2ec`.
- **No version was bumped and no tag was made.** The tree reads `0.101.0`.

## The safety record of this round

- Every ssh went through `build/ssh-run.mjs` with a record file the run owned. His
  `~/.ssh/known_hosts` measures 2,215 bytes before and after; the Mac Pro has none at all.
- The Mac Pro's `-L gmux` server: 1 session before, 1 after, `gmux-control` created
  Thu Aug 27 21:18:51 2026. Never attached.
- This Mac's `-L gmux` server, read by `probe:controldeadline` itself: 20 sessions before and 20
  after.
- One scratch git repository on the far side, removed in a `finally`; `ls -d
  $HOME/tortie-p244-scratch-*` afterwards counts 0. His `~/.gitconfig` there was never written.
- Every file any driver wrote is under a `mkdtemp` directory removed in a `finally`. His real machine
  row, manifest, keychain and logins were not written; the keychain was never opened at all.
- One Electron, the P167 run, through `build/harness-socket.mjs` on a scratch profile and the scratch
  socket `gmux-p244-p167-<pid>`.
- `/Users/gdc/.Trash` was named and listed once, read only, to establish F5. **No permission was
  requested and no privacy setting was changed**; the sandbox arm proves the failure by taking
  permission away, never by granting it.

## What the classification changes about the phase's own plan

The phase entry opens with "one finding has already moved". **None of the six is fixed.** What moved
is the reading, and it moved in two different directions:

- **F5's hermetic half is reproduced, not repaired.** Its green is the host's permission, and the
  proof is that the audited commit's own bytes are green here too. The repair the entry names — an
  owned or injected effect in place of `userInfo().homedir` — is still the whole of it, and it is
  still first, because F1's and F4's regressions will be judged by this same suite.
- **F5's deadline half is a second non-reproduction**, after Phase 220's. The entry's instruction not
  to change the timer, the timeout or any hostile arm before the mismatch is diagnosed is the right
  one and this round changed none of them. There is nothing here to repair; what there is, is a
  standing unexplained history, and the honest closure for it is a written note rather than a code
  change.
- **F1, F2, F3 and F4 are reproduced with the audit's own fixtures at both ends**, so all four are
  ready to be adopted as maintained regressions in the same commit as their repair, with setup
  unchanged and assertions untouched. Two of them now have a second reading beside the fixture: F1's
  bytes and F2's real link.
- **F6 stays open.** This round's contribution is one more passing sample with its rulers proved
  armed and its workload proved present, which is worth exactly what the audit says it is worth.

One thing the repair round should not inherit uncritically: **`undoableRewind` is not a guard against
F1.** It compares generations and both openings read generation 1, so it answers `true` for an
inherited entry and the face offers the undo. A repair that leans on it will look correct and will
not be.
