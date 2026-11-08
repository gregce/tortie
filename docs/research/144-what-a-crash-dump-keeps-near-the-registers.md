# 144. What a crash dump keeps near the registers

Research 144. Written 8 November 2026 against the worktree `wt-p363` at `f655cd49` (main). This is research only. No
product code changed, and nothing under `src/`, `build/` or `ios/` was edited.

What ran, all of it in scratch under `/private/var/tmp/tortie-wt/scratch/p363/`:

- **Electron runs.** Electron 43.3.0 main processes, crashed on purpose. Each was launched through
  `build/electron-run.mjs` inside `build/harness-socket.mjs`, with a scratch profile, HOME and socket, under the shared
  three-slot lock. Eight such crashes in all: three by the first investigator, one by the second, four by the
  adversary. Each set `crashReporter.start` with uploads off, as the app does, and with `ignoreSystemCrashHandler`, so
  nothing reached his reports folder.
- **Scratch minidump readers.** Three, written in this round and installing nothing: two in node, one in `python3 -I`.
- **The writer** launched no Electron. It read the crash capture, the logging research and the crash registers in
  source, ran one sandboxed `grep` for the phase headings, and wrote this document from the judge's ruling.

No role read his live profile, his Crashpad folder, his DiagnosticReports folder, his keychain, `~/.ssh`, `~/Keys`,
`~/.claude`, `~/.codex` or any conversation store. `-L gmux` was named only by `build/electron-run.mjs`'s census. No
real agent, Tailscale, DNS, APNs, ssh host or Simulator was used. On his word of 8 November 2026, only the main
session, after this document, reads the byte ranges this document names, and only those.

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `743166 1793987027` and
`23166 1790702242` before and after every run, by every role that recorded it. It did not move.

**Crash reports.** Every deliberate crash kept macOS's own reporter out, and `~/Library/Logs/DiagnosticReports` was
counted by name and mtime only, never opened. Both investigators left it at 28. The adversary saw it go from 28 to 33:
five new files, all named `Electron Helper-2026-11-08-175629`, most plausibly the concurrent Phase 357.1's renderers.
That attribution is not settled (section 5) and does not bear on the answer.

**How claims are cited.** Every claim about Tortie is a `file:line` in the tree at `f655cd49`. Every claim about the
dumps is a scratch measurement named in section 7. Crashpad's own behaviour is explained from its public source, read
online, and is confirmed by the measurement rather than taken from the read.

**The round.** Two investigators each measured with a reader of its own. An adversary wrote a third reader and
cross-ran all three over the same dumps, then attacked the findings by running rather than reading. A judge ruled on
every finding. This document is written from that ruling.

**The question.** Research 143 left two mechanisms for the 5 November 2026 crash (SIGSEGV at 0x34 in
`pcache1EnforceMaxPage`, during `Database.close`) that it could not tell apart: (b) a foreign free of live SQLite
memory, then ordinary reuse, and (c) damage to the cache's index with a null owner pointer. The bytes at the faulting
thread's x8, x10 and x19 would tell them apart. Research 143 §5 proposed reading those bytes from his crash dump as "a
cheaper first look", and noted the idea "was not attacked". This round asked the question behind it: does an Electron
43.3.0 main-process minidump, written by Tortie's shipped Crashpad set-up, hold any memory around the faulting thread's
registers, and if so how far either side and for which registers?

## 1. The answer first

No. For Tortie's shipped Crashpad set-up on macOS, an Electron 43.3.0 main-process minidump holds each thread's stack
and nothing else of the process's memory. It keeps no heap, and no window around a register that points off the stack.

His crash's x8, x10 and x19 are heap addresses (`0x134…`, in the allocator's 4.6 KB class), far from any thread stack
(a stack sits near `0x16…`). So his dump holds zero bytes at x8, x10 and x19. It cannot tell a foreign free (b) from a
zero-filled take (c).

Research 143 §5's "cheaper first look" does not work against the shipped build. Its own earlier line — that a macOS
crash record holds no heap, so (b) and (c) cannot be told apart from it — now extends to the register neighbourhood the
writer had hoped for.

What follows:

1. **The main session reads nothing from his crash dump.** There is nothing in it near the registers to read.
2. **Phase 364, the diagnostic build, is the only measurement left that can name the code**, and it depends on no
   dump. Its entry allows that Phase 363's answer "may make it unnecessary or change what it logs"; this answer does
   neither. It goes ahead as research 143 §5 and the Phase 364 charter describe it (section 6).
3. **Phase 363's own next step does not run.** The phase planned for the main session to list his Crashpad folder, pick
   the crash's dump and read the ranges at x8, x10 and x19. There are no such ranges, so that step is dropped.

## 2. What was measured, by method

### 2.1 What a dump of a real fault holds

Benign main-process crashes, Electron 43.3.0, through the harness. Each called
`crashReporter.start({ uploadToServer: false, ignoreSystemCrashHandler: true })` — the first option matching the
shipped set-up (`src/main/log/crash.ts:99`), the second keeping macOS's reporter out
(`docs/research/42-logging.md:166`) — then crashed in main with EXC_BAD_ACCESS, the same exception class as his
SIGSEGV. Its faulting address was 0x0, against his 0x34; section 2.2 reproduced his 0x34.

- **Dump size.** About 1.0 to 1.1 MB across the eight dumps (1,020,928 to 1,110,256 bytes), matching research 42's
  1,067,472-byte main-process measurement.
- **Streams.** Every dump held SystemInfo, MiscInfo, ThreadList, Exception, ModuleList, CrashpadInfo, MemoryList and two
  vendor streams. No MemoryInfoList stream, and no Memory64List stream.
- **The crux.** In every dump the MemoryList held exactly one range per thread, and the total bytes it captured equalled
  the sum of the thread-stack sizes. Each captured range matched a thread's own stack descriptor exactly. There was no
  other memory of any kind in the dump.
- **The registers.** Of the registers at the fault, only those that pointed into a stack had any captured bytes around
  them: the stack pointer, the frame pointer, and whichever argument registers happened to hold stack addresses. Every
  register that pointed at the heap or at code had no captured memory at all. There is no register-centred window; a
  register is "covered" only when its value happens to fall inside a thread stack that was going to be captured anyway.

### 2.2 The same, with a valid heap pointer in the registers that matter

A benign crash leaves one doubt: perhaps a heap register has no captured bytes only because, by chance, it points
nowhere readable. The second investigator closed that doubt.

It built a small native test in scratch, with the checkout's own toolchain, that reproduced the crash's exact faulting
instruction and faulting address — a read at offset 0x34 through a null base, EXC_BAD_ACCESS at 0x34 — with a valid,
readable heap buffer of the crash's 4.6 KB slot class placed in x8, x10 and x19, the three registers that in his crash
hold the page, its link and the cache.

The dump still held no bytes at x8, x10 or x19. It held 31 memory ranges, all of them thread stacks, none of them the
heap buffer. The buffer's planted marker, written hundreds of times across it, appeared nowhere in the dump except as a
single spilled copy on a stack. So the absence is not an artefact of where a natural register points: even a valid,
readable heap target in exactly his registers is not captured.

### 2.3 Why the capture is absent

The explanation, read from Crashpad's public source and confirmed by the measurement above.

- Crashpad does have a feature that captures a small window around each register — 128 bytes before the value and up to
  384 after it — and a second pass that follows pointers found there. Both are wired only on Windows and Linux.
- On macOS the thread and exception snapshots return no extra memory and never call that capture. The option that would
  turn it on ("gather indirectly referenced memory") is enabled only on Windows, and Electron's `crashReporter.start`
  never sets it. A change to add macOS register capture exists upstream but has not landed.

This is the reason, not the proof. The proof is the measurement: the dumps hold no non-stack memory whatever the source
says. The source only explains the structural absence.

### 2.4 Three readers, one answer

The three minidump readers — two in node, one in `python3 -I` — were each shown to parse Electron 43.3.0 dumps
correctly, and each validated itself three ways on every dump: the stack pointer lands inside the faulting thread's own
captured stack (so the ARM64 context offsets are right), the program counter lands inside a module's range, and a
planted marker reads back byte for byte. So a `captured:null` for a heap register is a true negative, not a reader
missing the memory.

The adversary then cross-ran all three readers over the same four dumps. They agreed on every count: ranges equal
threads, captured bytes equal the stack sizes, every range is a stack, no range is non-stack, every heap register is
uncaptured, and the planted heap marker is absent. A single reader's bug cannot explain an answer that three readers in
two languages share.

## 3. What the attack found

The adversary attacked by running, not reading, and moved nothing. Each required attack and its result:

- **"A range near a register might be a heap object, a guard page, or memory the handler wrote, not a stack copy."**
  There is no range near any heap register at all. Every captured range is exactly a thread stack (33 of 33, 30 of 30,
  30 of 30, 32 of 32 across the four dumps). Refuted as a worry.
- **"The capture might behave differently at a fault like his."** Across eight crashes with thread counts from 30 to 34
  and varied natural register content — his `0x134` heap class among the registers in several — the captured set was
  always exactly the stacks. The groomed case of section 2.2 put a valid heap pointer in the exact registers and still
  captured nothing there. Capture is independent of the faulting address and of what the registers hold.
- **"The dump bytes might be stale or fresh relative to the fault."** Moot. No heap is captured, so there is no buffer
  in the dump whose bytes could be either. The stacks are coherent because Crashpad suspends the threads before it
  snapshots them.
- **"The two readers might agree only because they share a bug."** Three readers, two languages, four shared dumps, full
  agreement. This cross-run is the round's independent step, which neither investigator had performed.
- **"The §5 reading might still be makeable from the dump's range for x8, x10 or x19."** It cannot. The dump holds no
  range for a heap register, so there are no bytes from which to read a free-list entry, a page header or zeros.

One correction the adversary made and the judge accepted: the second investigator's stream table mislabelled the
CrashpadInfo stream's type code. The real code is the one the first investigator and the adversary read. That
investigator never parsed the stream, so no number in its answer changes.

## 4. What is ruled

| Finding | Ruling | Why |
| --- | --- | --- |
| A main-process minidump from the shipped Crashpad set-up captures thread stacks only; his x8, x10 and x19 have no bytes; the dump cannot tell (b) from (c) | **Confirmed** | Three measurements, three readers in two languages, cross-validated. Ranges equal threads and captured bytes equal the stack sizes in every dump; zero non-stack ranges; every heap and code register uncaptured. Corroborated by research 42:164, which read stacks and the whole environment block from such a dump, not the heap |
| macOS never calls the register-capture path (the feature is Windows and Linux only) | **Accepted as the explanation** | The verdict rests on the measurement, not the source read. The dumps prove the path is inert on macOS whatever the source says |
| A valid, readable heap pointer in exactly x8, x10 and x19 still captured nothing there | **Confirmed and decisive** | It closes the one gap in the benign method: capture is absent even when the registers hold a valid heap target of his 4.6 KB class, at his faulting instruction and address (0x34) |
| Capture is register-value- and faulting-address-independent; the reader self-checks show the null is real, not a reader bug | **Confirmed** | The snapshot builder, not the fault, decides what memory is written. The stack pointer landing inside its own captured stack proves the context offsets |
| Three readers cross-run over the same four dumps all agree | **Confirmed**, and it is the round's required independent step | Agreement removes the single-reader-bug risk and is stronger than a fourth fresh measurement |
| The scratch crashers set `ignoreSystemCrashHandler:true`, while the app leaves it unset | **Immaterial, correctly handled** | That option governs only whether macOS's reporter also runs, not Crashpad's own memory snapshot. His real crash, on the unset default, wrote the `.ips` that research 143 §9.3 read, alongside the minidump |
| Research 143 §5's "cheaper first look", and §8 item 7's condition ("a scratch run shows such dumps keep memory near the registers") | **The condition is answered no** | §5's cheaper look is refuted for the shipped macOS build; §8 question 7 collapses. This corroborates §5's own primary recommendation, the diagnostic build, which does not depend on the dump |

## 5. What is not settled

- **The five crash reports the adversary saw.** `~/Library/Logs/DiagnosticReports` went 28 to 33, the five new files
  all named `Electron Helper-2026-11-08-175629`, mtime 17:56:29, counted by name and mtime only and never opened. They
  are most plausibly the concurrent Phase 357.1's Electron Helper renderers, which run live under lock slot 1 and match
  that name. They are not fully excludable as the benign crashers' own helper processes, because
  `ignoreSystemCrashHandler` covers only the process that sets it, not the helpers it spawns. The question cannot be
  settled within this round's rules, which forbid opening the files, and it does not bear on the answer. The first and
  second investigators' crashes each left zero new `.ips`; the writer and the judge caused no crash.
- **A different Crashpad set-up.** Whether a build that enabled register capture, as Windows does, could hold the
  registers was not tested. That is out of scope on purpose: Tortie ships no such set-up, and the shipped macOS path
  never calls the capture at all.
- **The crash's own open questions.** Which code did the damage, a bad free or a stray write, when it began, and the
  memory-pressure JetsamEvent are research 143 §5's list. They are addressable only by the diagnostic build, not by any
  dump, so this round neither adds to them nor removes any.

## 6. What it means for Phase 364, the diagnostic build

Phase 364's entry says it "starts after Phase 363, whose answer may make it unnecessary or change what it logs". This
answer makes it neither unnecessary nor smaller.

- **The diagnostic build goes ahead unchanged.** The dump cannot substitute for it or shorten it, so the build is
  exactly research 143 §5 and the Phase 364 charter: the checking better-sqlite3, a 16-byte guard in front of every
  SQLite allocation, and one app.log line on the first failed check.
- **It is now the only route to tell (b) from (c).** It reads the damage where the dump cannot: the guard and the
  header, in memory, at the first failed check, before any reuse overwrites them. A free-list entry in the guard is a
  foreign free (b); zeros in both the guard and the header are a zero-filled take (c); anything else is a stray write,
  whose pointers name their library.
- **Phase 363's planned follow-up is dropped.** The main session does not list his Crashpad folder or read any register
  range, because there are no ranges. Nothing of his dump is read.

## 7. What his word already settles

Nothing new is asked of him. His word of 8 November 2026 ("4. sounds good") settles both follow-ups:

1. **The read of his dump.** He allowed the main session to read the part near the crash only once a scratch run showed
   such a dump keeps memory there. It does not, so nothing of his dump is read. This closes research 143 §8 question 7
   with "nothing to read".
2. **Phase 364.** The same word queued the diagnostic build, and this answer leaves it unchanged (section 6).

Five crash reports appeared in his reports folder during this round (section 5). No agent opened them, and he may
delete them.

## 8. Evidence

### 8.1 Tortie and the research it rests on, at `f655cd49`

- `src/main/log/crash.ts:99` (`crashReporter.start({ uploadToServer: false })`, uploads off, nothing may flip it);
  `:87-89` (`CRASH_DUMPS_KEPT = 5`, `CRASH_DUMP_MAX_AGE_DAYS = 30`); `:121`
  (`DUMP_DIRS = ['pending', 'completed', 'new']`); `:127-150` (`scanCrashDumps`); `:157-178` (`sweepCrashDumps`);
  `:8-10` (the doc comment: research 42's lab read a live token out of a minidump's environment block).
- `docs/research/42-logging.md:158-166`: a main-process crash wrote 1,067,472 bytes; a dump of about 1 MB against about
  90 MB of RSS holds thread stacks and annotations and the whole environment block, a live `CLAUDE_CODE_MESSAGING_TOKEN`
  included, and not the full heap; with `ignoreSystemCrashHandler` true no `.ips` is written.
- `docs/research/143-what-damaged-the-session-lists-page-cache.md` §2.1 (his registers: x8 `0x13403b56200`, x10
  `0x13403b57400`, x19 `0x13402fedf70`, the cache; stacks near `0x16…`), §2.3, §5 ("A cheaper first look, if a dump
  exists", lines 427-435), §8 item 7 (lines 498-500), §9.3 (`evidence/Tortie-2026-11-05-144710.ips`).
- `docs/BACKLOG.md` Phase 363 (line 45097) and Phase 364 (line 45132).

### 8.2 The scratch measurements

Each role recorded `stat -f '%z %m' ~/.zsh_history ~/.bash_history` as `743166 1793987027` and `23166 1790702242`
before and after every run, unmoved.

- **Investigator 1.** `/private/var/tmp/tortie-wt/scratch/p363/inv1/` (`minidump.mjs` the node reader, `crasher/`,
  `driver.mjs`, `report.json` 20,796 B). `node driver.mjs` exit 0: three EXC_BAD_ACCESS crashes; dumps 1,110,256,
  1,087,728 and 1,109,088 B; MemoryList ranges equal to the thread count (34, 33, 34); captured bytes 779,072, 757,440
  and 777,904, each the sum of the stacks; every heap and code register `captured:null`; the three reader self-checks
  pass. Lock slot `electron.lock2`. DiagnosticReports 28 to 28. No Electron of its own left at the end. Disk 43 GiB.
- **Investigator 2.** `/private/var/tmp/tortie-wt/scratch/p363/investigator-2/` (`mdreader.py` the python3 -I reader,
  the scratch harness sources, the dump under `profile-29263/`). clang build exit 0; node load exit 0; the groomed
  main-process crash exit 0, dump 1,045,408 B, exception code 0x1 at address 0x34; `mdreader.py` exit 0: 31 ranges equal
  31 thread stacks, x8 = x10 = x19 = `0x12400356400` in no captured region, the heap marker present only as one stack
  spill. Electron 43.3.0 runtime read: Chromium 150.0.7871.212, Node 24.18.1, V8 15.0.245.23-electron.0, module ABI 148.
  DiagnosticReports 28 to 28, zero new. No Electron of its own left.
- **Adversary.** `/private/var/tmp/tortie-wt/scratch/p363/adversary/` (`mdscan.mjs` the third node reader, `crasher/`,
  `driver.mjs`, `run-inv1.mjs`, `compare.mjs`, `report.json`, `dr-before.txt`, `dr-after.txt`). `node driver.mjs` and
  `compare.mjs` exit 0, VERDICT true: four EXC_BAD_ACCESS crashes; dumps 1,085,648, 1,023,088, 1,020,928 and
  1,068,496 B; thread counts 33, 31, 30, 32; ranges equal threads; total captured equal to the stack sizes; zero
  non-stack ranges; zero covered heap pointers; zero heap-marker hits; the self-check true on every run. It ran
  `inv1/minidump.mjs` and `inv2/mdreader.py` unchanged over the same four dumps. Lock slot `electron.lock2`, released.
  DiagnosticReports 28 to 33, the five new files not opened (section 5). Disk 44 GiB. No Electron of its own left.
- **Writer.** Launched no Electron. `sandbox-exec -f …/no-history.sb /bin/zsh -c '… grep -n "^## Phase 36[2345]"
  …/wt-p363/docs/BACKLOG.md …'` exit 0, with the history stat before and after unmoved. Read research 143, `crash.ts`,
  research 42 and the two backlog entries, and wrote this document. Caused no crash; zero new DiagnosticReports; zero
  Electron.

### 8.3 Crashpad and Chromium source, read online

- Crashpad `snapshot/capture_memory.cc` and `capture_memory.h`: the register-window capture (128 bytes before, up to
  384 after) and the indirect pointer pass, both wired on Windows and Linux. `https://chromium.googlesource.com/crashpad/crashpad/+/main/snapshot/capture_memory.cc`
- Crashpad `snapshot/mac/thread_snapshot_mac.cc`, `exception_snapshot_mac.cc`, `process_snapshot_mac.cc`: macOS returns
  empty extra memory and never calls the capture.
- Chromium `components/crash/core/app/crashpad_win.cc`: "gather indirectly referenced memory" enabled on Windows, with a
  4 MiB limit, and no macOS equivalent. `https://source.chromium.org/chromium/chromium/src/+/main:components/crash/core/app/crashpad_win.cc`

## For the main session

There are no ranges to read. Read nothing from his crash dump.

A main-process minidump of that crash holds no bytes at x8, x10 or x19. Those are heap addresses (`0x134…`); the dump's
only memory is one range per thread — his roughly 59 thread stacks, with his environment block living inside a stack's
bytes — plus the module list and annotations. There is no heap in it, so research 143 §5's reading cannot be made.

For completeness only, and not as an instruction to open it: such a dump would be the newest `.dmp` under
`~/Library/Application Support/Tortie/Crashpad/`. A main-process crash with uploads off lands in `pending/`; `completed/`
and `new/` are the other two directories the sweep scans (`src/main/log/crash.ts:121`). It would be cross-identified by
name and mtime against the already-copied crash report `Tortie-2026-11-05-144710.ips` (the 14:46:58 crash; the sweep
keeps the newest five dumps for 30 days, `crash.ts:87-89`, `:157-178`). But nothing in it discriminates (b) from (c),
so it stays closed and the main session reads nothing from it.

No reader is run and no byte of his dump is read, because there are no ranges. The three minidump readers built this
round were each proven to parse Electron 43.3.0 dumps and agreed over four shared scratch dumps, but every one reports
no captured memory for a heap register, so pointing any of them at his dump would print nothing at x8, x10 or x19. They
lived in the round's scratch and were removed with it when the phase landed, together with the one scratch dump left
there, because a dump holds the environment of the process that wrote it (`src/main/log/crash.ts:8-10`).

The only route left to tell a foreign free (b) from a zero-filled take (c) is research 143 §5's diagnostic build, which
Phase 364 builds: a 16-byte guard before every SQLite allocation and one app.log line on the first failed check. It
does not read the dump at all.
