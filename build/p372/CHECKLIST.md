# Phase 372 — what a verifier presses and reads, in order

The app run is `probe:p372` (build/p372/probe-p372.mjs). It starts Electrons, so it is a verifier's, under a
lock slot, outside the history block, with HOME, ZDOTDIR and TMPDIR in your scratch, HISTFILE=/dev/null,
SHELL=/bin/sh and no TERM_SESSION_ID or TERM_PROGRAM. No agent runs and no session is made.

## Before

1. `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, `sysctl -n vm.loadavg`, `memory_pressure | grep percentage`,
   `df -h /`. Note them.
2. `node build/p372/probe-p372.mjs --grader-self-test` (history block). It reads only `build/p372/fixtures/` and
   starts nothing. It must end `grader self-test PASS`.
3. `P372_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p372-parent node build/p372/probe-p372.mjs --preflight`
   (history block). Both builds built and newer than the tree's files, the parent's renderer without
   `function sameListing(` and HEAD's with it, and each build's six counters found once, at a line and
   column printed. Any REFUSED line: stop and say it.

## The run

4. Take a slot: `zsh /private/var/tmp/tortie-ops/lock.sh try p372-<you>`.
5. `P372_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p372-parent P372_KEEP=1 P372_REPORT=<scratch>/probe-p372.json npm run -s probe:p372`.
   Four launches, one at a time: the parent, HEAD, the parent, HEAD. Each launch makes its own three
   repositories, shows each, then:
   - **M** (both blocks): 8 changes of each kind at 10, 100 and 500 folders, each read over its window and
     the idle window after it; then the counters on, 3 changes a kind counted.
   - **H** (block 1, at 10 and 500): `d0003` held 5 s in main, new files in `d0001` and `d0002`, then the held
     folder's own file with the counters on.
   - **E**, **V**, **R**, **O** (block 1, at 500): `0x/` opened and closed by a click ten times, quiet and held;
     `0v1/` to `0v5/` each opened, then removed from outside; Refresh pressed inside the watcher's delay,
     quiet and held; the shot drive's tree verbs twice quiet and twice held, the trash going into the
     launch's own folder (when Electron's `shell.trashItem` cannot be replaced, O is not driven and reads
     UNREADABLE: never let it reach his Trash).
   - **I** (block 2, at 100): a new `.log` dims, a rule added and taken away, 20 s of frames under a writer.
   - **S** (block 2, at 500): `d0003` held, two new files, the 10 shown, then the 500 again.
   Expect 75 to 90 minutes at loads under 30, more when the load gate waits (it waits 2 minutes at a time,
   up to 20, before every timed cell over a load of 40, then runs and says so).
6. Release the slot.

## What to read

7. The last line: passed, failed, unreadable. Exit 0 only when every arm passed; 1 a clause; 2 a missing
   reading or a refusal; 3 memory.
8. The report's `readings.M.cells`: for each of the twelve cells the parent's and HEAD's pooled medians, the
   block medians and `noise`. D11 (SPEC §1): HEAD at most the parent + noise everywhere, at most the parent −
   noise at 100 and 500, and at 500 below the parent in both block pairs. If a cell fails, the phase drops
   the part that does not help and says so (SPEC D11).
9. `readings.M.counts`: HEAD 0 writes and 0 model passes for `same`, 1 for `add` and `addEarly`, at most 2
   for `branch`, N+2 reads always; the parent N+2 writes everywhere.
10. **Re-derive it yourself** (SPEC §10): with `P372_KEEP=1` the raw launches are `raw-<build><block>.json`
    beside the report. Read them with a reader of your own, not `derive`: each change's thread is
    `taskMs − idleTaskMs`; pool both blocks a build; compare with `readings.M`.
11. **Attack D11**: read the 500 cells again with the order of the builds reversed,
    `P372_HEAD_FIRST=1 P372_NS=500 P372_ARMS=M` (HEAD, parent, HEAD, parent; a development run, because it
    reads one size, so it never exits 0), and say whether the order moved the gap.

## After

12. The history stats again; a move means start nothing for 3 minutes and stat again.
13. Count Electrons once: `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`.
    His own Tortie (a bare `Tortie`, read its pid yourself) stays; nothing of the run may.
14. No `gmux-p372` socket left under `/private/tmp/tmux-501/` or your TMPDIR, and no process naming your scratch.
