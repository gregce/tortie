# Electron and TypeScript architecture after Phase 244

Date: 9 September 2026

Execution commit: `bbb4947119d910290a0e83da018fb8898e256975`. Package version: `0.101.0`.
Nothing under `src/` moves after that commit in this phase; what follows it is this document and
one running-log line.

**Every reading in this document was re-taken after the rebase onto `dacfc225`**, which brought in
Phases 242.1, 242.2, 243 and 245. The readings the fix round took before that rebase are superseded
by the ones here rather than kept beside them: a count taken on a different tree is not a count of
this tree, and this file's own rule is to measure before writing a number.

This is **item 7** of [the Phase 244 entry](../BACKLOG.md), and it is the only place in that phase
where a number may move. It reports the status of every finding in
[the 8 September 0.101.0 audit](./2026-09-08-electron-typescript-architecture-0.101.0.md) and the
closure evidence for each of its twelve categories, against that document's own required-evidence
table.

## What this document is, and what it is not

It is an assessment written from measurements taken at the execution commit. Every reading below was
taken by running something, and where a reading was taken by an earlier round it says so and names
the round. The measure step's classification is
[research 108](../research/108-phase-244-audit-findings.md); the split-retention reading is
[research 109](../research/109-phase-244-split-retention.md); this document is neither of those and
does not repeat them.

It is **not a release gate**, and neither was the audit: *"This rubric is not a release gate.
Prioritise the stated user consequences and distinguish demonstrated behaviour from inference."*
Nothing here was fixed to move a number.

It **does not increase a score because a checklist is complete**, which is the audit's own closing
instruction. Four categories were deducted and three of them are raised here; the fourth is not,
because its closure condition names three things and one of them was not obtained. The section
[The one that did not move](#the-one-that-did-not-move-and-why-that-is-the-honest-answer) is the
whole of that argument.

## The score is 35 out of 36

| Category | 7 Sep | 8 Sep audit | Now | Why it is where it is |
| --- | ---: | ---: | ---: | --- |
| Process ownership | 3 | 3 | 3 | Unchanged. Electron, background-process and SSH teardown gates pass; the helper floor reads 108 of 108. |
| Composition | 3 | 3 | 3 | Unchanged. No second application root, no second preload. |
| IPC capability | 3 | 3 | 3 | 228 invoke channels, and the contract inventory is byte identical to the checked-in baseline. |
| Domain cohesion | 3 | 3 | 3 | `arch-cksum.ts` is a named 65-line module rather than arithmetic inlined into the mirror; `markScanPartial` is a named record rather than a flag. |
| Dependency direction | 3 | 3 | 3 | 1,237 production files, 6,941 imports, 0 violations; 4,221 runtime edges, 0 strongly connected components. |
| **State ownership** | 3 | **2** | **3** | F1 and F2 both closed with executable protection. Below. |
| **Lifecycle** | 2 | **2** | **2** | F1 and F4 closed; **F6 is not**. Below, and it is the one that did not move. |
| Type truth | 3 | 3 | 3 | Unchanged. F3 was a consumption error against an already-typed result and is repaired at the consumption. |
| **Failure flow** | 3 | **2** | **3** | F3 closed on **both** paths, with the stamp still written so no impossible rescan is scheduled. Below. |
| **Test seam** | 3 | **2** | **3** | F5's hermetic half closed with a standing gate; the deadline half is a third non-reproduction and is recorded as an open history rather than as closed. Below, with the reservation. |
| Navigation | 3 | 3 | 3 | Unchanged. `remote-scripts.ts` reads 3,715 lines and `arch/db.ts` 1,379; this phase added 57 and 71 of those and the rest arrived with the phases beside it. Both remain navigable by responsibility. |
| Build boundary | 3 | 3 | 3 | Production build passes. Eager renderer 1,573,263 raw and 397,524 gzip, headroom 426,737 and 102,476. |
| **Total** | 35 | **32** | **35** | Eleven categories at 3, one at 2. |

**35 is the same total the 7 September document recorded and it is not the same 35.** That one had
Lifecycle at 2 for the split-retention finding and everything else at 3, and it was corrected to 34
in conversation for a hermetic test nobody had written up. This one has Lifecycle at 2 for the same
split-retention finding, with the hermetic test now closed by a gate rather than by a host's
permission, and with State ownership and Failure flow re-earned against counterexamples that did not
exist when that document was written. **The standing note in the backlog that said "an honest 35 of
36" is still superseded**; this is a new reading, not that note coming back.

## The six findings

| Finding | Status | Repair | The reading that establishes it |
| --- | --- | --- | --- |
| **F1** reopened tabs inherit a rewind journal | **Closed** | `b3a9f6e8` | Three regressions; ablating the three call sites turns 5 of 8 red |
| **F2** remote mirror reuses stale source | **Closed** | `796375c0` | Eight arms; putting the reuse test back to the clock turns 5 of 8 red, and a real-link drive reads `{written: 1, reused: 0}` |
| **F3** the fact-only scan loses incompleteness | **Closed on both paths** | `4b7b31d2` | Ablating the contract path alone turns 1 red, the fact-only path alone turns 3 red |
| **F4** the guarded writer caps after EOF | **Closed** | `f88e7696`, `a999fb91` | 5,242,881 bytes consumed against a 5,242,880 cap, from two starting sizes; 17 of 17 gate ablations red |
| **F5** hermetic half | **Closed** | `073c3bd3` | Parent reads `1 failed \| 5 passed` under a denying sandbox, HEAD reads 6 of 6 in both lanes |
| **F5** deadline half | **Not reproduced, third time, undiagnosed** | none | `probe:controldeadline` passes in 38.6 s with leg 0 reading all three fixtures back on all four fields |
| **F6** split-session retention | **REPRODUCED, NOT CLOSED** | none | 599 detached elements in block 3, a retaining path obtained, and neither a regression nor an explanation |

### F1, and it was a byte of his file

`redline-journal.ts` said a tab id is unique per opening; `tab-identity.ts` keys an ordinary local tab
**by its absolute path**. So a reopened tab inherited the previous opening's undo stack under the same
id, and `forgetRewindJournal` had **zero production call sites**. The measure step drove it over a
real file through the shipping chain: in a NEW opening where nothing had been rewound, one press of
undo wrote the previous opening's inserted text back over the person's file, `brown` becoming `red`
again, 44 bytes to 42, after which the journal is empty so the undo that would put it back does not
exist.

**The audit measured depth and claimed no corruption. It is corruption**, and the worse route is not
the one the fixture used. The Phase 244 verifier drove **preview replacement** — a single click on a
second file, which is not a close gesture at all — and **LRU eviction**, and read at the parent
`depth 1`, the face offering the undo, the undo answering `wrote`, and the agent's bytes back in the
file; at HEAD, `0`, `false`, `nothing`, unmoved. Its app run read **20 of 20 pass at HEAD against 8
failures at the parent** over the close button, ⌘W, preview replacement and eviction with real chords.

`store.ts` calls `forgetRewindJournal` at all three places a tab leaves `tabs`, beside the
`disposeModels` and `dropViewState` already there. It is **not** ended on React unmount, so a view
switch and a cancelled dirty close each keep a still-open tab's undo, and both are pinned. Retention
is bounded at 200 entries and 1 MiB per tab, oldest first, newest never dropped.

**`undoableRewind` is not a guard against this and a later round must not lean on it.** A baseline
generation is a property of the tab OBJECT rather than of the file, so both openings read 1, the
comparison passes and the face offers the undo.

Re-derived for this document: replacing all three call sites with a no-op turns
`p244-inherited-undo`, `p244-journal-lifetime` and `audit-0908-journal` red, **5 failed of 8**.

### F2, and the token is the content

`arch-read`'s `stat` reports whole seconds and `remote-arch.ts` treated an equal second and an equal
size as unchanged, so a same-length rewrite inside one second was invisible **and stayed invisible for
ever**: an unchanged file keeps its stamp, so every later refresh compares the same second again.
Waiting repairs nothing.

**A finer clock is not the fix.** It narrows a window and says nothing about content whenever a tool
preserves the timestamp, which `cp -p`, `rsync -t`, `tar -x` and a restore from a backup all do. So the
freshness token is the CONTENT: the far side runs POSIX `cksum`, one process per page, and
`src/main/machines/arch-cksum.ts` re-derives the same CRC-32/CKSUM over the MIRROR's own bytes.
Recomputing rather than recording keeps the mirror its own record, so there is no side table to fall
out of step and a mirror somebody deleted half of re-fetches that half.

The property the audit actually asked for is **adapter parity**, and it is what
`p244-mirror-parity.test.ts` asserts: seven arms each doing the same edit twice, once to a folder the
local source reads and once to one the machine source mirrors. The Phase 244 verifier drove the three
shapes the audit named but nobody had driven over the real link to the operator's Mac Pro, each
against what a local source does with the same file:

| Shape | Parent | HEAD |
| --- | --- | --- |
| Same-size rewrite inside one timestamp second | `written 0, reused 2` — mirror stale at every later pass | `written 1`, both sides agree |
| Preserved timestamp (`cp -p` shape) | `written 0` — mirror stale, and a finer clock would not have helped | `written 1`, both sides agree |
| Deletion | correct | correct |
| Rename | correct | correct |
| Idle pass | `reused 2` | `reused 2`, so this is not "transfer for ever" |

It also re-derived `posixCksum` against `/usr/bin/cksum` over 30 vectors with 0 mismatches, and
checked the argv budget: `ARCH_READ_LIST_MAX_BYTES` is 100,000, so `cksum $dg` is at most 100 KB of
argument against a 1 MiB `ARG_MAX`, with `set -f` on and `IFS` a newline.

Re-derived for this document: putting the reuse test back to mtime and size turns **5 of 8** arms red,
including both timestamp shapes and the hand-edited mirror.

### F3, and the contract path was no better than the one the audit named

`check-coordinator.ts`'s fact-only path awaited `syncTree()` and **discarded** its `overBudget`, then
asked only the PARSER's budget before stamping a completed scan. The audit named that path. The
contract path was no better: it propagated the sentence and then stamped over it just the same, so the
map derived `building` from a stamp that claimed a whole folder either way.

`markScanned` now MEANS the whole folder was read and clears any reason; `markScanPartial` records the
same commit plus one sentence saying why it did not, one nullable column in migration 009 with nothing
dropped. **The stamp is still written**, because `building` schedules the next check on every map read
and a mirror ceiling is not something a rescan gets past — which is the endless impossible read the
phase entry forbids. The PARSER's own budget is deliberately unchanged, because that one IS picked up
by the next run. The map draws one quiet line, *"This picture is about part of the folder."* followed
by main's own sentence.

Re-derived for this document, and this is the reading that says both paths are pinned SEPARATELY:
ablating the contract path's `markScanPartial` alone turns **1** test red; ablating the fact-only
path's alone turns **3** red.

### F4, and the second starting size is this round's own correction

`guarded-write.ts` checked the `fstat` size, then read to EOF and asked the cap of the collected
buffer. The audit's fixture started at one byte, appended 16 MiB at the first read, and the reader
consumed **16,777,217 bytes against a 5,242,880 cap** in 258 synchronous `readSync` calls on main's
thread — with about **twice** that in buffer, because the chunk list is held and then `Buffer.concat`
allocates a second full copy, which the measure step counted at 33,619,987 bytes.

The budget is inside the loop now with a bounded overflow sentinel of exactly one byte, so the
caller's existing `overCap` question answers itself and the refusal, its word and its sentence are all
unchanged. It **stays synchronous**, because Phase 226 chose that so the `fstat`, the read and the
digest describe one moment and Phase 240's save depends on it.

The Phase 244 verifier counted the bytes by an instrument that exists at the parent, wrapping
`node:fs`'s own `readSync` rather than using the new seams: **16,777,217 in 258 calls at the parent
against 5,242,881 in 81 at HEAD**, which reproduces the audit's number and the builder's to the byte.

**And it found the clause that was pinned by a coincidence.** The loop is held by two clauses, the
break on the sentinel and the clamp of the last chunk to what is left, and the clamp was pinned by
nothing: `READ_CAP_BYTES` is an exact multiple of 64 KiB, so from a one-byte start `1 + 80 x 65536` is
the ceiling exactly and a loop with no clamp reads the same 5,242,881. Ablated alone, both regressions
stayed green. At 65,535 bytes the shipping loop reads 5,242,881 and the ablated one 5,308,415. The cost
is at most 64 KiB and the refusal is unchanged either way, so it is exactness rather than a leak — and
an exactness a module states in its own header is one a check must be able to fail. Both the unit test
and the gate now drive the second size (`a999fb91`), and the gate reads **30 readings, 17 of 17
ablations red**, one of which moves exactly one reading and it is the new arm's.

**The two clauses are ablated together and the clamp alone, never the break alone**, because removing
the break by itself clamps `want` to zero once the budget is spent and a loop asking for zero bytes for
ever is a hang rather than a red reading.

### F5's hermetic half, reproduced by taking permission away and never by granting any

`install-roundtrip.test.ts` built a scratch `HOME` in `beforeAll` and then reached straight past it:
its remove case composed `join(userInfo().homedir, '.Trash')`, and `os.userInfo()` reads the passwd
record rather than honouring `HOME`. Whether the case passed was the host's decision. The audit's
execution got `EPERM: operation not permitted, scandir '/Users/gdc/.Trash'` at line 182; this Mac
answers, so **the audited commit's own bytes are green here**, which is the finding rather than a
refutation of it.

Re-derived for this document under a seatbelt profile whose only rule is
`(deny file-read* (subpath "/Users/gdc/.Trash"))`, everything else allowed:

| Test source | Denying lane | Plain lane |
| --- | --- | --- |
| Parent (`f2a4b2ec`) | **`1 failed \| 5 passed (6)`**, `EPERM … scandir` at line 182 | 6 of 6 |
| HEAD | **6 of 6** | 6 of 6 |

**No permission was granted and none was asked for.** The reproduction is a denial, which is the only
honest direction: a test that passes because the host allows something is the defect.

The destination is OWNED now. `beforeAll` creates `<scratch home>/.Trash` itself and the remove case
asserts that directory is still empty and is the only one under the scratch home, which asks strictly
MORE than the pair it replaced: it catches a trash that CREATES the directory, which the old line
caught, and one that USES a directory already there, which it did not.

`assert-hermetic-checks.mjs` **rule 4** is what stops it coming back, and it is a new executable
boundary rather than a repaired test: no test source under `src/` may resolve a home directory through
the passwd entry. It reads CODE with comments and string bodies blanked, so a file may explain the
hazard it forbids, and it is proved on 7 fixtures of which 3 must be caught. It runs inside
`npm run build`, so nothing that builds can skip it. Re-derived for this document by planting a real
`require('node:os').userInfo().homedir` in a test file: the gate names the file and fails.

**The population is 846 test files at HEAD and was 836 when the rule landed at `cfe80620`.** It moves
with the tree, so it is quoted from the gate rather than from memory. The stated limit is in the test
file's own header: a remove that reached the real person's Trash through a native macOS API that
ignores `HOME` would not be seen from here, and that case cannot be asserted hermetically at all.

### F5's deadline half, a third non-reproduction

`npm run probe:controldeadline` passes at the execution commit. Re-measured for this document after
the rebase, 38 s:

```
0  the plane read back every registration this driver made
   {"hang":   {"program":true,"searchList":true,"socket":true,"controlPath":true},
    "healthy":{"program":true,"searchList":true,"socket":true,"controlPath":true},
    "exiter": {"program":true,"searchList":true,"socket":true,"controlPath":true}}
1  ms from spawn to the fallback                          10004
3  a healthy far side greeted in ms                       10
4  %exit produced disconnects / greeting timeouts         3 / 0
6  the ablated build opened a connection / fell back      true / null
0  it held pid(s) / dir(s) when it threw; still alive     3 / 2; 0 / 0
```

The readback resolves through `remoteContextFor`, the control plane's own export and the function
`openControlPlane` itself calls, before any child is spawned, and all three fixtures resolve on all
four fields. Leg 6's ablation — the same driver over a copy of the tree with the greeting timer clause
removed — did NOT fall back and left its child alive, so leg 1 is a reading that can still fail.

**Nothing was changed to obtain that.** No timer, no timeout, no readback, no healthy leg, no
timer-removal arm and no hostile arm was touched; the Phase 244 verifier diffed the probe against the
parent and found header prose only.

**This is the third non-reproduction after Phase 220's and the measure step's, and three are not a
diagnosis.** It is recorded as an open, undiagnosed history rather than as a closed finding, and the
probe's own header carries what a fourth report should capture. See the reservation under Test seam.

### F6, and it is the one that is not closed

Four rounds got nothing because the heap snapshot had to be asked for **in advance**, on a run nobody
knew would fail: every run that failed was a run without one, and every run with one passed. The
repair round changed the instrument rather than the app — the block loop now asks `judge` itself from
the second block on and photographs the heap the first time it speaks — and it caught the finding on
its first real run.

Profile d alone, 3 blocks of 6 cycles at full speed: **0, 0 and then 599 detached elements**, heap
10.3, 10.0 then 13.4 MB, nodes 453, 453 then 1,181 with 278 on screen throughout, the workload landing
at 24, 48 and 72 discarded sessions and the planted-leak control seeing all 1,032 of its own. That is
the historical shape: Phase 200 recorded about 5 MB and 1,020 DOM nodes a block.

**The retaining path is the new thing and it is one mechanism**: forty-three disposed xterm terminals,
each hanging off a different element of the document's `ScriptedAnimationController` vector, so
forty-three separate un-served `requestAnimationFrame` callbacks, each closure capturing a whole
disposed terminal through `_renderService` and `_renderDebouncer`. [Research
109](../research/109-phase-244-split-retention.md) carries the path verbatim.

**WHY the callback is pending is not established, and the intermittency is not explained at all.**
xterm 6.0.0's `RenderDebouncer.dispose()` does cancel and `TerminalPane` does call `term.dispose()`, so
a refresh scheduled AFTER dispose is the shape that fits and `webgl?.dispose()` running before it
inside a `try` is the candidate. No file under `src/` was changed on that guess, and research 109
names the next two experiments so the next round does not start where this one did.

## The one that did not move, and why that is the honest answer

Lifecycle's required evidence is three things: *"Closed-tab state ends at its owner, guarded reads stay
bounded, and the split-retention finding has a controlled explanation or tested repair."*

The first is true and pinned. The second is true and pinned. **The third is not.** The architecture
goal's closure requirement is a retaining path **and a regression**, or a controlled explanation that
reproduces both the failing and the passing conditions. This round obtained the first half of the
first one and neither of the others.

So **Lifecycle stays at 2**, and it would stay at 2 if every other finding in the audit had been closed
twice over. Obtaining a retaining path after four rounds of nothing is real progress and it is not the
condition. A round that raised this to 3 on the strength of a reproduction would be buying the number
the audit's closing instruction forbids.

## The reservation on Test seam, stated so a reader can challenge it first

Test seam's required evidence is *"Full and hermetic lanes pass with required fixtures present; the
deadline probe reaches its subject and its hostile arms remain meaningful."* Measured at the execution
commit, every clause of that holds, and the audit's third deduction for this category — *"four
additional focused fixtures expose gaps absent from passing gates"* — is closed by adopting all four as
maintained regressions and by the gates gaining arms that would have caught them.

**The clause a reader should challenge is the deadline probe.** It is green here, three times, across
two phases, and it was red once, in the audit's execution, on ground nobody has reconstructed. The
category is raised because the condition is stated about what the probe DOES, and what it does here is
measured: it reads all three fixtures back through `remoteContextFor` on all four fields before any
child is spawned, and its timer-removal ablation still fails to fall back, so its arms can still go red.

**If a fourth execution reproduces the mismatch, this point comes back off**, and the right response
then is a diagnosis rather than a change to the timer, the timeout, the readback or any hostile arm.
That instruction is unchanged from the audit and from the phase entry.

## Resource costs to keep visible

The audit's own section is carried forward in full. **Nothing in it is silently closed**, which the
phase entry requires by name.

- **The remote mirror's limits are unchanged**: 20,000 files and 64 MiB of planned content per
  repository, 3 transfer pages in flight, its directory surviving project closure and machine removal,
  and no profile-wide eviction policy. Reaping one belongs with the rest of that directory's
  housekeeping and was not in this phase.
- **The guarded writer's rename race is unchanged.** It provides atomic replacement, not a
  filesystem-level compare-and-swap. F4 bounded what the READ costs; it did not close that window and
  did not try to.
- **Shadow baselines remain in-memory state**, not a durable recovery history, and the empty-HEAD
  ambiguity remains documented in `baseline.ts`. That is Phase 243's and not this phase's.
- **NEW, and it is F2's price**: the far side now READS every tracked file under the size ceiling once
  per pass rather than only stat-ing it. That read is local to that machine and never crosses the link.
- **NEW, and the phase's own headers understated it until this round**: a file with no digest is
  treated as CHANGED, so a machine with **no `cksum` at all** re-fetches **every tracked file on every
  refresh, for as long as it is open** — bounded per pass by those 20,000 files and 64 MiB, and over
  time by nothing, with nothing on the face saying so. The direction is deliberate, because the other
  answer is a stale mirror; `cksum` is POSIX and is spelled the same way on macOS and on Linux, so this
  is a machine nobody has reached rather than one anybody has. Both `remote-scripts.ts` and
  `remote-arch.ts` now size it where they state it.
- **NEW, and small**: the rewind journal is bounded at 200 entries and 1 MiB per tab, oldest first.
  Before F1 it had no ceiling of any kind and no end.

A full architecture score would not mean unlimited memory, perfect recovery or zero race windows, and
35 certainly does not.

## The checks run at the execution commit

| Check | Reading |
| --- | --- |
| `npm run typecheck` | Pass. 1,237 production files, 6,941 imports, 0 violations; 1,235 runtime graph files, 4,221 edges, 0 strongly connected components |
| `npm run build` | Pass. Eager renderer 1,573,263 raw and 397,524 gzip in 2 chunks; all 18 lazy surfaces outside it |
| Build safety gates | Pass. Electron 324 files, 108 helper users against floor 108. Background 326 files, 2 asynchronous starters, all guarded. SSH 327 files, 19 helper users, 36 fixtures of which 32 must fail |
| `npm run gate:checks` | Pass. 183 check scripts classified, 43 runner callers against floor 43, 846 test files reach no home past `HOME`, 7 scanner fixtures |
| Contract inventory | Pass, byte for byte, 228 invoke channels |
| `npm test` | **845 passed, 1 skipped over 846 files; 13,298 tests passed, 2 skipped, 0 failed** |
| `npm run conformance:redline` | Pass |
| `npm run conformance:redline-write` | Pass. 30 readings, 17 of 17 ablations red |
| `npm run conformance:save` | Pass |
| `npm run conformance:machines` | Pass |
| `npm run conformance:arch` | Pass |
| `npm run conformance:arch:modules` | Pass |
| `npm run conformance:reading` | Pass. 19 ablations each red |
| `npm run smoke:t1` | Pass, 6 of 6 |
| `npm run smoke:t3` | Pass, 3 of 3 |
| `npm run probe:controldeadline` | Pass, 38 s. See F5 |

**The full suite is entirely green at this commit**, which is worth naming because it was not at either
of the first two readings in this phase: the repair round read one red in `graph.integration.test.ts`
and the verifier read one in `user-visible-name.test.ts`, both five-second timeouts under load averages
in the seventies to nineties from the phases running beside this one, and both green alone. They were
different files each time, which is itself the evidence that the family is load rather than the tree.
**This is the third consecutive fully green reading**, and the first taken on the rebased tree with all
four neighbouring phases in it.

## What this document does not establish

- **F6 is not closed.** A retaining path is not a regression and is not an explanation.
- **F5's deadline half is not explained.** Three non-reproductions are not a diagnosis of somebody
  else's execution.
- **No inference is drawn about the shipped 0.101.0 application.** Everything here was measured in a
  detached worktree, and the version number has not advanced with every feature commit.
- **No version was bumped and no tag was made.** The tree reads `0.101.0`. The release is the
  operator's to cut.
- **The rubric is not a release gate**, and 35 is not a claim that anything is finished.

## Safety

- The operator's own `-L gmux` server read **21 sessions before and 21 after** every run in this
  document, read rather than attached. His `gmux` socket is the only one left on this Mac.
- Electron-family processes read **13 before and 13 after**, being his running Tortie and other
  applications. Every Electron this phase started went through `build/electron-run.mjs` on a scratch
  profile with a scratch `HOME` and a scratch socket, ended in a `finally`.
- **`/Users/gdc/.Trash` was reproduced against by DENYING it and never by granting anything.** No
  privacy setting was changed and none was requested.
- His checkout at `/Users/gdc/gmux` was never written. Every ablation in this document was restored and
  the worktree is clean apart from this phase's own commits.
- The Mac Pro readings quoted for F2 are the measure step's and the verifier's, taken under the Phase
  224 bounds: `gmux-control`, 1 session before and 1 after, never attached; 0 scratch repositories
  left; `~/.gitconfig` there never written; every ssh through `build/ssh-run.mjs`; `~/.ssh/known_hosts`
  2,215 bytes on both sides.
- No token was spent and no agent turn was started on either machine.
