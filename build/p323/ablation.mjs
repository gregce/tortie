#!/usr/bin/env node
/**
 * `npm run ablation:p323`. THE ATTACK ON PHASE 323'S OWN CLAUSES
 * (build/p323/SPEC.md §7, the Phase 323 entry in docs/BACKLOG.md).
 *
 * About two and a half minutes (113.6 s measured on 2026-09-30 over
 * twenty-seven arms, 140.9 s in the fix round's run; the second fix round's
 * thirty-six and the tools round's forty-two are measured in its SPEC
 * sections), nearly all of it the vitest
 * runs; A14 waits out vitest's budget on its held-wait rows. It launches no Electron, starts
 * no tmux server, spawns no agent, makes no request, spends no token and
 * signals no process. It starts
 * nothing but `cp`, `node` running `build/conformance-endtree.mjs --root
 * <clone>`, and `node` running vitest over the three Phase 323 test files, whose
 * every process table is planted and whose every `kill` is a recording fake.
 * It reads nothing under the person's home.
 *
 * ## Why it exists
 *
 * Phase 323 puts a signal into the product: after his End, what the hang-up
 * was aimed at and did not end is sent SIGTERM, then SIGKILL. Every clause
 * that keeps that signal away from the wrong process (the order, the root, the
 * shell guard, the identity, the selection, one pid at a time, the locale, the
 * ledger's join) is held twice, by a rule of `conformance:endtree` that reads
 * the source and by a row of `session-tree.test.ts` or `p323-end-tree.test.ts`
 * that drives it. Either could stop asking while it still reads green: a rule
 * whose needle no longer finds anything, a row whose planted table no longer
 * reaches the clause. THIS SCRIPT PROVES THE OWNERSHIP. It breaks one clause
 * at a time in the SHIPPING source and requires every owner the SPEC names, the
 * gate's rule by its id and the test row by its full name, to go red.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during a phase, and a harness that
 * writes into `src/` even for the seconds a test takes can lose another
 * builder's edit. So it builds a CLONE, `build/p321/ablation.mjs`'s shape:
 * `cp -Rc` (APFS clonefile) of `src/` and of every entry of `build/` except
 * `build/vendor`, which is symlinked with `node_modules` and never copied, plus
 * `package.json`, `vitest.config.ts` and every tsconfig, under
 * `$P323_SCRATCH` (default `/private/tmp`) as `p323-ablation-<pid>-…`. The
 * gate is the WORKTREE's own `build/conformance-endtree.mjs`, pointed at the
 * clone with `--root`, so the rule under attack is the rule that ships. Each
 * edited file is put back and CHECKED BY SHA256 against the worktree's bytes
 * before the next arm; the clone is removed in a `finally` and on a signal; and
 * the run ends by asserting that the worktree's own bytes never moved.
 *
 * ## The rules each arm is held to
 *
 *   - Every needle matches the shipping source EXACTLY ONCE, and again once in
 *     the text the arm's earlier edits left. Zero means the clause moved and
 *     this arm moves with it in the same commit; two means an edit could land
 *     on the wrong occurrence and prove nothing.
 *   - Every owner it names goes red: each gate rule by its id on the gate's own
 *     `RED   E<n>` line, and each test row by its full name. Other rules and
 *     rows going red too is printed, and is not a failure.
 *   - An UNEDITED CONTROL is green first, and again at the end: the gate's
 *     fifteen rules and the three test files over the clone.
 *
 * Usage:
 *   node build/p323/ablation.mjs
 *   P323_ONLY=A9,A19 node build/p323/ablation.mjs        named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[ablation:p323]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const TREE = 'src/main/proc/session-tree.ts';
const CORE = 'src/main/sessions/core.ts';
const LEDGER = 'src/main/sessions/mutation-ledger.ts';
const HARNESS = 'build/harness-socket.mjs';
const CLI = 'build/session-tree-cli.mts';
const SCRATCH = 'src/main/conformance/scratch.ts';
const RESUME_TS = 'src/main/conformance/resume.ts';
const GATE = 'build/conformance-endtree.mjs';

const TREE_TEST = 'src/main/proc/__tests__/session-tree.test.ts';
const END_TEST = 'src/main/sessions/__tests__/p323-end-tree.test.ts';
const SCRATCH_TEST = 'src/main/conformance/__tests__/p323-scratch-tree.test.ts';
const TESTS = [TREE_TEST, END_TEST, SCRATCH_TEST];

// ---------------------------------------------------------------------------
// The owners, spelled again here so a row renamed there reads as an owner that
// stayed green, never as a pass.
// ---------------------------------------------------------------------------

// p323-end-tree.test.ts, by describe.
const ORDER = 'the order is the promise > captures and reads the tree, hangs up only when both are done, broadcasts, and only then signals';
const BESIDE =
  'the order is the promise > reads the tree beside the capture, not after it, and hangs up only once the read has answered';
const ROOT = 'the root > is the $-id liveIds holds; a panePid on the record is ignored';
const SHELL = 'a plain shell (ruling R2) > reads nothing and signals nothing, and the End still ends';
const FAILED_PS = 'a process table that cannot be read > still ends the session, signals nothing and says so once';
const NOT_IN_BAND = 'the waits are not in band > settles the End while the first wait is still held';
const QUIT_NO_WAIT = 'a quit does not wait for the waits (the fix round) > joins at once while the ending is still in its grace';
const QUIT_DURING_CAPTURE =
  'a quit does not wait for the waits (the fix round) > waits for an End whose capture was in flight when the quit began, and not for its ending';

// session-tree.test.ts, by describe.
const REUSED = 'stillTheSame > drops a reused pid: same number, another start time';
const REUSED_WAIT = 'endHangupSurvivors > never signals a pid reused during the wait';
const EXECD = 'stillTheSame > drops a process that exec’d another program after the read';
const EXECD_WAIT = 'endHangupSurvivors > never signals a process that exec’d another program during the wait';
const EXECD_SAME = 'stillTheSame > drops a process that exec’d the same program with other arguments';
const EXECD_SAME_WAIT =
  'endHangupSurvivors > never signals a process that exec’d the same program with other arguments during the wait';
const SETSID_AT_SIGNAL =
  'endHangupSurvivors > never signals what left the terminal, even under a root that resists both signals';
const RETRY_FIRST =
  'endHangupSurvivors > keeps asking when the first re-read fails, and signals only after a re-read that answered';
const RETRY_AT_GRACE =
  'endHangupSurvivors > keeps asking when the re-read that would have sent SIGTERM, and two after it fails, and signals only after a re-read that answered';
const ONE_PID =
  'the C locale, on every read > asks ps for ONE pid per call, because `ps -p a,b` costs about 200 ms and such calls queue';
const FORMAT = 'the argv the tree is read with > reads one session by its target, every pane, four fields separated by spaces';
const LOCALE_TERMINAL =
  'the C locale, on every read > runs /bin/ps with LC_ALL=C and -ww for the terminal read End waits for, one terminal per call';
const CLOSING_WAITS =
  'leftBehind (the closing check) > waits for the product’s End to finish ending what it recorded, because the quit no longer does';
// The tools round after his ruling of 2026-09-30: the closing check that read
// green when it could not look.
const UNREAD_BLOCK = 'the closing check cannot read green when it could not look (the tools round)';
const UNREAD_TABLE = `${UNREAD_BLOCK} > says it could not look, and exits red, when the product’s End was recorded with a process table that could not be read`;
const UNREAD_HANGUP = `${UNREAD_BLOCK} > says it could not look when the harness’s own hang-up went out with panes tmux did not answer for`;
const UNREAD_THREW = `${UNREAD_BLOCK} > records a read that threw rather than letting its caller swallow it, a tmux that did not list its sessions included`;
const NO_PANE_LOOKED = `${UNREAD_BLOCK} > reads a session with no live pane as looked at, never as a check that could not look`;
const CLEAN_ONLY = `${UNREAD_BLOCK} > is clean only when every session was read and every target is gone, and says out of how many`;
const LEFT = 'stillTheSame > drops a process that left its group after the read';
const LEFT_WAIT = 'endHangupSurvivors > never signals a process that left its group during the wait';
const SETSID = 'selection > a setsid child is never a target';
const CODEX = 'selection > Codex’s shared server: only the launcher and the TUI are targets';
const APP_BUNDLE = 'selection > an application bundle’s executable in the pane’s group is never a target';
const EXITS_DURING_WAIT =
  'endHangupSurvivors > signals only what the re-read before it still showed (one exits during the wait)';
const LOCALE_WIDE =
  'the C locale, on every read > runs /bin/ps with LC_ALL=C and -ww for the wide read, so a fr_FR start time is never read';
const LOCALE_REREAD =
  'the C locale, on every read > runs /bin/ps with LC_ALL=C and -ww for the identity re-read, so a fr_FR start time is never read';
const REUSED_ROOT = 'roots > drops a root whose parent is not the server that answered (a reused pid)';
// The second fix round's rows.
const NOT_LEADER = 'roots > drops a root that does not lead its own group, which no pane process can fail to do';
const RESTORED = 'selection > restored: the shell by its own group, and never the terminal’s foreground group';
const FG_JOB = 'selection > a person’s foreground job in a restored agent row is never a target (attack d2)';
const PANE_GROUPED =
  'endHangupSurvivors > never signals a target whose pane another session still shows (a grouped session, a linked window)';
const PANE_MIXED =
  'endHangupSurvivors > ends what a closed pane left, and spares a pane another session still shows, in one ending';
const PANE_SCRATCH =
  'killOwnSession (the harness sends the hang-up itself) > signals nothing whose pane the server still shows in another session, asking the run’s own server';
const PANE_VIA =
  'the pane check > asks the given server, and reads a confirmed "no server" as no pane shown and anything else as unknown';
const WORST = 'endHangupSurvivors > ends by ENDING_WORST_MS, the bound the closing check waits for, behind an adversarial ps and tmux';
const PANE_BOUND =
  'the order is the promise > reads the panes within one read’s bound, so a stuck tmux cannot hold the End (the verifier’s X7)';
const TIMED_OUT =
  'the C locale, on every read > answers null for a read that timed out or was signalled, even when what it printed parses';
const PID_ONE =
  'endHangupSurvivors > never signals pid 1 or 0, even when a malformed tree names them and the re-read answers for them';

// ---------------------------------------------------------------------------
// The shipping lines the arms move. Each is asserted once below, not assumed.
// ---------------------------------------------------------------------------

const TREE_START = "        rec.agent !== 'shell' ? this.readEndTree(target, rec.name) : null;\n";
const TREE_AWAIT = '      tree = treeRead === null ? null : await treeRead;\n';
const HANGUP = '      await tmux.killSession(target); // idempotent — already-gone is fine\n';
const CONTINUATION = '    if (tree !== null) this.endAfterHangup(tree, rec.name);\n';
const ENDING_START = '    void endHangupSurvivors(tree, this.endTreeDeps)\n';
const TEARDOWN_KILL =
  "    await execFileP('tmux', ['-L', socket, 'kill-server']).catch(\n      () => undefined\n    );\n";
const TEARDOWN_END = "    if (tree !== null) reportEnded(sessionTreeCli('end', [socket], tree), socket, when);\n";
const SIGTERM_STEP =
  "        alive = stillTheSame(alive, hungUpOnly(table, alive, panes));\n        if (alive.length === 0) return finish(false);\n        if (due) {\n          for (const e of alive) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');";
const SIGKILL_LOOP = "          for (const e of alive) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGKILL');";

/**
 * The twenty arms of SPEC §7, as the fix round left them, then seven more:
 * the verifiers' own ablations that stayed green everywhere (X1, X10, X11) and
 * the fix round's own clauses (one pid per re-read, the terminal read, the
 * closing check's wait, the space-separated pane format). Then nine for the
 * second fix round: the pane check (S10), the foreground group taken out of
 * the selection (d2), the two graces (S9, Claude Code's own failsafe), a root
 * that must lead its own group, and the three clauses the attack verifier's
 * ablations found unowned (X7, X12, X13). `edits` are applied
 * one after the other; `gate` names the conformance:endtree rules that must
 * read red and `rows` the test rows. Where an owner differs from the SPEC's
 * table the arm says why beside it. Then six for the tools round after his
 * ruling of 2026-09-30 (A37 to A42): the conformance closing check that read
 * green when it could not look, each clause of its repair owned by a row of
 * `p323-scratch-tree.test.ts`.
 */
const ARMS = [
  {
    n: 'A1',
    name: 'the tree read awaited where it starts, so the capture waits for it (the latency the fix round removed)',
    file: CORE,
    edits: [[TREE_START, "        rec.agent !== 'shell' ? await this.readEndTree(target, rec.name) : null;\n"]],
    gate: ['E1'],
    rows: [BESIDE]
  },
  {
    n: 'A2',
    name: 'the tree read awaited below `tmux.killSession(target)`',
    file: CORE,
    edits: [[`${TREE_AWAIT}${HANGUP}`, `${HANGUP}${TREE_AWAIT}`]],
    gate: ['E1'],
    // Not the ORDER row: with every read answering at once, the read has
    // finished inside the capture's own awaits and the log still reads in
    // order. The row that HOLDS the read is the one that sees the hang-up go
    // first (measured in the fix round's first ablation run).
    rows: [BESIDE]
  },
  {
    n: 'A3',
    name: '`endAfterHangup(` moved above `tmux.killSession(target)`',
    file: CORE,
    edits: [
      [CONTINUATION, ''],
      [HANGUP, `  ${CONTINUATION}${HANGUP}`]
    ],
    gate: ['E1'],
    rows: [ORDER]
  },
  {
    n: 'A4',
    name: 'the root from `rec.panePid`',
    file: CORE,
    edits: [['this.readEndTree(target, rec.name)', 'this.readEndTree(String(rec.panePid), rec.name)']],
    gate: ['E2'],
    rows: [ROOT]
  },
  {
    n: 'A5',
    name: 'the `shell` guard removed (R2)',
    file: CORE,
    edits: [[TREE_START, '        this.readEndTree(target, rec.name);\n']],
    gate: ['E3'],
    rows: [SHELL]
  },
  {
    n: 'A6',
    name: 'identity without `lstart`',
    file: TREE,
    edits: [['      row.lstart === e.lstart &&\n', '']],
    gate: ['E5'],
    rows: [REUSED, REUSED_WAIT]
  },
  {
    n: 'A7',
    name: 'identity without `command`',
    file: TREE,
    edits: [['      row.lstart === e.lstart &&\n      row.command === e.command', '      row.lstart === e.lstart']],
    gate: ['E5'],
    rows: [EXECD, EXECD_WAIT]
  },
  {
    n: 'A8',
    name: 'identity without `pgid`',
    file: TREE,
    edits: [['      row.pgid === e.pgid &&\n', '']],
    gate: ['E5'],
    rows: [LEFT, LEFT_WAIT]
  },
  {
    n: 'A9',
    name: 'targets = `all` (R1 in full, the half he has not ruled on)',
    file: TREE,
    edits: [['  return { all, targets };', '  return { all, targets: all };']],
    gate: ['E6'],
    rows: [SETSID, CODEX]
  },
  {
    n: 'A10',
    name: '`kill(-e.pid, …)`, a group signal',
    file: TREE,
    edits: [["              deps.kill(e.pid, 'SIGTERM');", "              deps.kill(-e.pid, 'SIGTERM');"]],
    gate: ['E4'],
    rows: []
  },
  {
    n: 'A11',
    name: 'SIGTERM over `tree.targets` without the re-read',
    file: TREE,
    edits: [
      [
        "          for (const e of alive) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');",
        "          for (const e of tree.targets) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');"
      ]
    ],
    gate: ['E4'],
    rows: [EXITS_DURING_WAIT]
  },
  {
    n: 'A12',
    name: 'the ending handed to the ledger, which a quit waits for (the regression the fix round removed)',
    file: CORE,
    edits: [[ENDING_START, "    void this.ledger.admit('endAfterHangup', () => endHangupSurvivors(tree, this.endTreeDeps))\n"]],
    gate: ['E10'],
    rows: [NOT_IN_BAND, QUIT_NO_WAIT]
  },
  {
    n: 'A13',
    name: 'a failed re-read ends the ending (the retry the fix round added, removed)',
    file: TREE,
    edits: [['      } else if (deps.now() >= hangupEnds + READ_RETRY_MS) {', '      } else {']],
    gate: ['E14'],
    rows: [RETRY_FIRST, RETRY_AT_GRACE]
  },
  {
    n: 'A14',
    name: '`await this.endAfterHangup(…)`, the waits in band',
    file: CORE,
    // The method is `void`, so `await` alone would await `undefined` and wait
    // for nothing: the rule would go red and the behaviour would not change.
    // Handing the work back is what makes the End actually wait in band. The
    // held-wait rows then run to vitest's budget, which is why this arm is the
    // slow one.
    edits: [
      [CONTINUATION, '    if (tree !== null) await this.endAfterHangup(tree, rec.name);\n'],
      [ENDING_START, `    return endHangupSurvivors(tree, this.endTreeDeps) as never;\n${ENDING_START}`]
    ],
    gate: ['E1'],
    rows: [NOT_IN_BAND, QUIT_NO_WAIT]
  },
  {
    n: 'A15',
    name: 'a `null` table falls back to signalling the recorded roots',
    file: CORE,
    edits: [
      [
        '      if (table !== null) return readSessionTree(table, roots, process.pid);\n',
        '      if (table !== null) return readSessionTree(table, roots, process.pid);\n' +
          "      for (const r of roots) this.endTreeDeps.kill(r.pid, 'SIGTERM');\n"
      ]
    ],
    gate: [],
    rows: [FAILED_PS]
  },
  {
    n: 'A16',
    name: '`reapDeadSession` calls `endAfterHangup`',
    file: CORE,
    edits: [
      [
        '    deadSignal: string | undefined\n  ): Promise<void> {\n',
        '    deadSignal: string | undefined\n  ): Promise<void> {\n    this.endAfterHangup({ all: [], targets: [] }, sessionId);\n'
      ]
    ],
    gate: ['E8'],
    rows: []
  },
  {
    n: 'A17',
    name: 'the runner’s `end` moved above `kill-server` in `teardown`',
    file: HARNESS,
    edits: [[`${TEARDOWN_KILL}${TEARDOWN_END}`, `${TEARDOWN_END}${TEARDOWN_KILL}`]],
    gate: ['E11'],
    rows: []
  },
  {
    n: 'A18',
    name: '`LC_ALL: \'C\'` removed from the `ps` read',
    file: TREE,
    edits: [["    env: { ...process.env, LC_ALL: 'C' },", '    env: { ...process.env },']],
    gate: ['E12'],
    // SPEC §7 names "the session-tree fr_FR row". That row
    // ('parseTreeTable > parses a line taken under another locale to nothing')
    // drives the PARSER, which this arm does not touch, so it stays green. The
    // rows that own the clause are the three that read the env each `ps` is
    // spawned with.
    rows: [LOCALE_WIDE, LOCALE_REREAD, LOCALE_TERMINAL]
  },
  {
    n: 'A19',
    name: 'the `ppid === serverPid` root check removed',
    file: TREE,
    edits: [['      rootRow.ppid === root.serverPid &&\n', '']],
    gate: ['E6'],
    rows: [REUSED_ROOT]
  },
  {
    n: 'A20',
    name: 'the `.app/Contents/MacOS/` exclusion removed',
    file: TREE,
    edits: [["        row.pgid === rootRow.pgid &&\n        !row.command.includes('.app/Contents/MacOS/')\n", '        row.pgid === rootRow.pgid\n']],
    gate: ['E6'],
    rows: [APP_BUNDLE]
  },
  {
    n: 'A21',
    name: 'SIGKILL over `stillTheSame(tree.all, …)`: what left the terminal signalled (the verifier’s X1)',
    file: TREE,
    edits: [[SIGKILL_LOOP, SIGKILL_LOOP.replace('for (const e of alive)', 'for (const e of stillTheSame(tree.all, table))')]],
    gate: ['E4'],
    rows: [SETSID_AT_SIGNAL]
  },
  {
    n: 'A22',
    name: 'identity by the program alone, its first word (the verifier’s X11)',
    file: TREE,
    edits: [['      row.command === e.command', "      row.command.split(' ')[0] === e.command.split(' ')[0]"]],
    gate: ['E5'],
    rows: [EXECD_SAME, EXECD_SAME_WAIT]
  },
  {
    n: 'A23',
    name: '`holdsAPane` always answers no, so the backstop never runs (the verifier’s X10)',
    file: HARNESS,
    edits: [['function holdsAPane(name) {\n', 'function holdsAPane(name) {\n  return false;\n']],
    gate: ['E11'],
    rows: []
  },
  {
    n: 'A24',
    name: 'the identity re-read names every pid in one `ps -p` (the fix round’s batch End defect)',
    file: TREE,
    edits: [['    const one = await readPs(identityPsArgs(pid), true, left);', "    const one = await readPs(['-ww', '-o', TREE_FIELDS, '-p', pids.join(',')], true, left);"]],
    gate: ['E12'],
    rows: [ONE_PID]
  },
  {
    n: 'A25',
    name: 'End’s read from the whole table (about 60 ms the hang-up waits for)',
    file: CORE,
    edits: [['      const table = await this.endTreeDeps.readTerminals(\n        roots.map((r) => r.tty)\n      );', '      const table = await this.endTreeDeps.readTable();']],
    gate: ['E12'],
    rows: [ORDER]
  },
  {
    n: 'A26',
    name: 'the closing check does not wait for the product’s Ends',
    file: SCRATCH,
    edits: [['  if (productEndRecordedAt !== null && recordedTargets.length > 0) {', '  if (false as boolean) {']],
    gate: [],
    rows: [CLOSING_WAITS]
  },
  {
    n: 'A27',
    name: 'a tab back in the pane format (read as no pane by a C-locale client)',
    file: TREE,
    edits: [["export const PANE_ROOT_FORMAT = '#{pane_pid} #{pane_dead} #{pid} #{pane_tty}';", "export const PANE_ROOT_FORMAT = '#{pane_pid}\\t#{pane_dead}\\t#{pid}\\t#{pane_tty}';"]],
    gate: ['E12'],
    rows: [FORMAT]
  },
  {
    n: 'A28',
    name: 'the pane check dropped before SIGTERM: a live pane another session shows is signalled (the verifier’s S10)',
    file: TREE,
    edits: [[SIGTERM_STEP, SIGTERM_STEP.replace('stillTheSame(alive, hungUpOnly(table, alive, panes))', 'stillTheSame(alive, table)')]],
    gate: ['E15'],
    rows: [PANE_GROUPED, PANE_MIXED, PANE_SCRATCH]
  },
  {
    n: 'A29',
    name: 'the terminal’s foreground group selected again: his foreground job in a restored row ended (attack d2)',
    file: TREE,
    edits: [['        row.pgid === rootRow.pgid &&', '        (row.pgid === rootRow.pgid || row.pgid === rootRow.tpgid) &&']],
    gate: ['E6'],
    rows: [RESTORED, FG_JOB]
  },
  {
    n: 'A30',
    name: 'the first wait back at 4 s: a 5 s orderly exit cut by SIGTERM (the verifier’s S9)',
    file: TREE,
    edits: [['export const HANGUP_GRACE_MS = 10_000;', 'export const HANGUP_GRACE_MS = 4_000;']],
    gate: ['E9'],
    rows: [WORST]
  },
  {
    n: 'A31',
    name: 'the second wait back at 2.5 s: Claude Code’s own shutdown cut by SIGKILL',
    file: TREE,
    edits: [['export const TERM_GRACE_MS = 60_000;', 'export const TERM_GRACE_MS = 2_500;']],
    gate: ['E9'],
    rows: [WORST]
  },
  {
    n: 'A32',
    name: 'End’s pane read with no bound, so a stuck tmux holds the hang-up 10 s (the verifier’s X7)',
    file: CORE,
    edits: [
      [
        '        await tmux.execTmux(sessionPanesArgv(tmux.formatSessionTarget(target)), {\n          timeoutMs: TREE_READ_TIMEOUT_MS\n        })',
        '        await tmux.execTmux(sessionPanesArgv(tmux.formatSessionTarget(target)))'
      ]
    ],
    gate: ['E12'],
    rows: [PANE_BOUND]
  },
  {
    n: 'A33',
    name: 'a timed-out or signalled `ps` read as an answer (the verifier’s X12)',
    file: TREE,
    edits: [['  if (r.spawnError !== null || r.timedOut || r.cancelled || r.signal !== null) {', '  if (r.spawnError !== null || r.cancelled) {']],
    gate: [],
    rows: [TIMED_OUT]
  },
  {
    n: 'A34',
    name: 'the `pid <= 1` guard removed from both signal loops (the verifier’s X13)',
    file: TREE,
    edits: [
      [
        "            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');",
        "            try {\n              deps.kill(e.pid, 'SIGTERM');"
      ],
      [
        "            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGKILL');",
        "            try {\n              deps.kill(e.pid, 'SIGKILL');"
      ]
    ],
    gate: [],
    rows: [PID_ONE]
  },
  {
    n: 'A35',
    name: 'a root that does not lead its own group counted, so a target’s group is no longer its pane',
    file: TREE,
    edits: [[' &&\n      rootRow.pgid === root.pid;', ';']],
    gate: ['E6'],
    rows: [NOT_LEADER]
  },
  {
    n: 'A36',
    name: 'the pane check reads every failure as no pane shown',
    file: TREE,
    edits: [['      return serverGone(err) ? new Set<number>() : null;', '      return new Set<number>();']],
    gate: ['E15'],
    rows: [PANE_VIA]
  },
  // The tools round after his ruling of 2026-09-30 ("One more tools-only
  // round"): the conformance closing check read green when it could not look.
  // Each clause of the repair, taken out alone, must turn its row red.
  {
    n: 'A37',
    name: 'a record-time tree read that failed is not recorded, so the closing check reads 0 when it could not look (the reverify’s capture under the fence)',
    file: SCRATCH,
    edits: [
      [
        '  if (read.failed !== null) unreadSessions.push(`${tmuxName}: ${read.failed}`);\n  if (read.tree === null) return;\n  recordedTrees.push(read.tree);\n  productEndRecordedAt = endDeps().now();',
        '  if (read.tree === null) return;\n  recordedTrees.push(read.tree);\n  productEndRecordedAt = endDeps().now();'
      ]
    ],
    gate: [],
    rows: [UNREAD_TABLE, UNREAD_THREW]
  },
  {
    n: 'A38',
    name: 'the harness’s own hang-up with an unread tree is not recorded',
    file: SCRATCH,
    edits: [
      [
        '  await tmux.killSession(id);\n  if (read.failed !== null) unreadSessions.push(`${tmuxName}: ${read.failed}`);\n',
        '  await tmux.killSession(id);\n'
      ]
    ],
    gate: [],
    rows: [UNREAD_HANGUP]
  },
  {
    n: 'A39',
    name: 'the closing verdict ignores the sessions it could not look at',
    file: SCRATCH,
    edits: [['  if (left.unread.length > 0) {', '  if (false as boolean) {']],
    gate: [],
    rows: [UNREAD_TABLE, UNREAD_HANGUP, UNREAD_THREW, CLEAN_ONLY]
  },
  {
    n: 'A40',
    name: 'a session with no live pane read as a check that could not look (every agent that exits at start would turn a run red)',
    file: SCRATCH,
    edits: [['  if (roots.length === 0) return { tree: null, failed: null };', "  if (roots.length === 0) return { tree: null, failed: 'no live pane' };"]],
    gate: [],
    rows: [NO_PANE_LOOKED]
  },
  {
    n: 'A41',
    name: 'the record asks through tmuxIdFor again, which reads a tmux that did not answer as a session that is not live',
    file: SCRATCH,
    edits: [
      [
        '    const live = await tmux.listSessions();\n    const id = live.find((s) => s.tmuxName === tmuxName)?.sessionId ?? null;',
        '    const id = await tmuxIdFor(tmuxName);'
      ]
    ],
    gate: [],
    rows: [UNREAD_THREW]
  },
  {
    n: 'A42',
    name: 'a read that threw swallowed inside the record, as its callers’ `.catch` used to',
    file: SCRATCH,
    edits: [["    read = { tree: null, failed: `the read threw (${(err as Error).message})` };", '    void err;\n    return;']],
    gate: [],
    rows: [UNREAD_THREW]
  },
  {
    n: 'A43',
    name: 'the closing check’s code left out of the run’s exit (the tools round’s reverify)',
    file: RESUME_TS,
    edits: [['Math.max(exitCodeFor(results, cfg.strict), leftCode)', 'exitCodeFor(results, cfg.strict)']],
    gate: ['E16'],
    rows: []
  }
];

// ---------------------------------------------------------------------------
// The clone, the gate and vitest inside it
// ---------------------------------------------------------------------------

const PARENT = process.env['P323_SCRATCH'] || '/private/tmp';
if (!existsSync(PARENT)) {
  process.stderr.write(`${TAG} P323_SCRATCH names ${PARENT}, which does not exist\n`);
  process.exit(2);
}
const scratch = mkdtempSync(join(PARENT, `p323-ablation-${String(process.pid)}-`));

function cpClone(from, to) {
  const r = spawnSync('cp', ['-Rc', from, to], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc ${from} failed: ${r.stderr}`);
}

function buildClone() {
  cpClone(join(REPO, 'src'), join(scratch, 'src'));
  mkdirSync(join(scratch, 'build'), { recursive: true });
  for (const entry of readdirSync(join(REPO, 'build'))) {
    if (entry === 'vendor') continue;
    cpClone(join(REPO, 'build', entry), join(scratch, 'build', entry));
  }
  if (existsSync(join(REPO, 'build', 'vendor'))) {
    symlinkSync(join(REPO, 'build', 'vendor'), join(scratch, 'build', 'vendor'));
  }
  const configs = ['package.json', 'vitest.config.ts', ...readdirSync(REPO).filter((f) => /^tsconfig(\.[a-z]+)?\.json$/.test(f))];
  for (const name of configs) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** The worktree's own gate over the clone: which rules read red, or null when it gave no reading. */
function runGate() {
  const r = spawnSync(process.execPath, [join(REPO, GATE), '--root', scratch], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000
  });
  const red = new Set();
  const ok = new Set();
  for (const line of (r.stdout ?? '').split('\n')) {
    // Rule lines only: `RED   E1   …` / `ok    E10  …`. A self-test line is
    // `E1!` and is not a reading of the rule.
    const m = /^\[conformance:endtree\] (ok|RED)\s+(E\d+)\s/.exec(line);
    if (m === null) continue;
    (m[1] === 'RED' ? red : ok).add(m[2]);
  }
  if (red.size + ok.size === 0) {
    return { red: null, code: r.status ?? 1, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-8).join('\n') };
  }
  return { red, ok, code: r.status ?? 1, tail: `${r.stderr ?? ''}`.split('\n').slice(-6).join('\n') };
}

/** Run the named test files in the clone and answer the full name of every row that failed. */
function runTests(files) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...files],
    { cwd: scratch, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(out, { force: true });
  if (report === null) {
    return { code: r.status ?? 1, failed: null, ran: 0, tail: `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-12).join('\n') };
  }
  const failed = [];
  let ran = 0;
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      ran += 1;
      if (a.status === 'failed') failed.push([...(a.ancestorTitles ?? []), a.title].join(' > '));
    }
    // A file that failed to load has no rows; name it so it is not read as green.
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') failed.push(`${file.name} (did not load)`);
  }
  return { code: r.status ?? 1, failed, ran, tail: '' };
}

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* a temporary folder; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

const count = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);

/** Apply an arm's edits in order, each asserted once; the edited text, or why not. */
function edited(shipping, arm) {
  let text = shipping;
  for (const [i, [find, to]] of arm.edits.entries()) {
    const inShipping = count(shipping, find);
    const inText = count(text, find);
    if (inShipping !== 1 || inText !== 1) {
      return {
        why:
          `edit ${String(i + 1)}'s needle matches ${String(inShipping)} time(s) in the shipping ${arm.file}` +
          (inText !== inShipping ? ` and ${String(inText)} after the edits before it` : '') +
          ', not exactly once. A clause that moved moves its arm in the same commit.'
      };
    }
    text = text.replace(find, () => to);
  }
  return text === shipping ? { why: 'the edits changed nothing' } : { text };
}

const problems = [];
const table = [];
const started = Date.now();
let ran = 0;
let owned = 0;

const WATCHED = [TREE, CORE, LEDGER, HARNESS, CLI, SCRATCH, GATE, ...TESTS];
const before = new Map(WATCHED.filter((f) => existsSync(join(REPO, f))).map((f) => [f, sha(readFileSync(join(REPO, f)))]));

/** The unedited clone must read green on both owners. */
function control(when) {
  const gate = runGate();
  const tests = runTests(TESTS);
  const bad = [];
  if (gate.red === null) bad.push(`the gate gave no reading (exit ${String(gate.code)}): ${gate.tail}`);
  else if (gate.red.size > 0 || gate.code !== 0) bad.push(`the gate reads ${[...gate.red].join(', ') || `exit ${String(gate.code)}`} red: ${gate.tail}`);
  if (tests.failed === null) bad.push(`vitest produced no report: ${tests.tail}`);
  else if (tests.failed.length > 0 || tests.ran === 0) bad.push(`${String(tests.failed.length)} of ${String(tests.ran)} rows red: ${tests.failed.slice(0, 5).join(' | ')}`);
  if (bad.length === 0) say(`control ${when}: the gate's ${String(gate.ok.size)} rules and ${String(tests.ran)} test rows green over the clone`);
  return bad;
}

try {
  for (const rel of [TREE, CORE, LEDGER, HARNESS, CLI, SCRATCH, ...TESTS]) {
    if (!existsSync(join(REPO, rel))) throw new Error(`${rel} is not in the worktree, so there is nothing to attack`);
  }
  buildClone();
  say(`clone at ${scratch}, node_modules and build/vendor symlinked, nothing under a home touched`);

  const only = (process.env['P323_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  for (const name of only) {
    if (!ARMS.some((a) => a.n === name)) problems.push(`P323_ONLY names ${JSON.stringify(name)}, which is no arm`);
  }

  const first = control('first');
  if (first.length > 0) {
    problems.push(`the UNEDITED control is not green, so every arm below would mean nothing: ${first.join('; ')}`);
    throw new Error('control red');
  }

  for (const arm of ARMS) {
    if (only.length > 0 && !only.includes(arm.n)) continue;
    const shipping = readFileSync(join(REPO, arm.file), 'utf8');
    const e = edited(shipping, arm);
    if (e.text === undefined) {
      problems.push(`${arm.n} "${arm.name}": ${e.why}`);
      table.push([arm.n, 'NEEDLE', arm.name]);
      continue;
    }
    writeFileSync(join(scratch, arm.file), e.text, 'utf8');
    ran += 1;
    let gate = { red: new Set(), ok: new Set() };
    let tests = { failed: [], ran: 0 };
    try {
      if (arm.gate.length > 0) gate = runGate();
      if (arm.rows.length > 0) tests = runTests(TESTS);
    } finally {
      restore(arm.file);
    }
    if (gate.red === null) {
      problems.push(`${arm.n} "${arm.name}": the gate gave no reading. ${gate.tail}`);
      table.push([arm.n, 'NO READING', arm.name]);
      continue;
    }
    if (tests.failed === null) {
      problems.push(`${arm.n} "${arm.name}": vitest produced no report. ${tests.tail}`);
      table.push([arm.n, 'NO REPORT', arm.name]);
      continue;
    }
    const missing = [...arm.gate.filter((id) => !gate.red.has(id)), ...arm.rows.filter((o) => !tests.failed.includes(o))];
    const others = [...[...gate.red].filter((id) => !arm.gate.includes(id)), ...tests.failed.filter((f) => !arm.rows.includes(f))];
    if (missing.length > 0) {
      problems.push(
        `${arm.n} "${arm.name}": its owner stayed GREEN: ${missing.join(' | ')}. ` +
          (others.length > 0 ? `Red instead: ${others.slice(0, 4).join(' | ')}` : 'Nothing went red, so the clause is decoration.')
      );
      table.push([arm.n, others.length > 0 ? 'RED ELSEWHERE' : 'NOTHING MOVED', arm.name]);
    } else {
      owned += 1;
      table.push([arm.n, 'owner red', `${arm.name}${others.length > 0 ? ` (and ${String(others.length)} other rule(s) or row(s))` : ''}`]);
    }
    const owners = [...arm.gate, ...(arm.rows.length > 0 ? [`${String(arm.rows.length)} row(s)`] : [])].join(', ');
    say(`${arm.n.padEnd(4)} ${missing.length === 0 ? 'ok  ' : 'FAIL'} ${arm.name}: owners ${owners}; gate red ${[...gate.red].join(',') || 'none'}, ${String(tests.failed.length)} row(s) red of ${String(tests.ran)}`);
  }

  const last = control('last');
  if (last.length > 0) {
    problems.push(`after every file was restored the control is not green again, so a restore did not land: ${last.join('; ')}`);
  } else {
    say('restored: every edited clone file matched the worktree by sha256, and the control is green again');
  }
} catch (err) {
  if (!(err instanceof Error && err.message === 'control red')) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  }
} finally {
  clean();
}

for (const [file, was] of before) {
  const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : 'gone';
  if (now !== was) {
    problems.push(`${file} in the WORKTREE changed during the run (${was.slice(0, 12)} to ${now.slice(0, 12)}); this harness writes only its clone, so another hand moved it and this run proves nothing about the new bytes`);
  }
}

process.stdout.write('\n');
for (const [n, verdict, name] of table) process.stdout.write(`${TAG}   ${n.padEnd(4)} ${verdict.padEnd(14)} ${name}\n`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one turned EVERY OWNER IT NAMES red, ` +
    `the gate's rule by its id and the test row by its name (${String(owned)} of ${String(ran)}). Every clone file was ` +
    'restored and proved by sha256, the worktree was never written, and the clone is gone. No Electron, no tmux, no ' +
    'agent, no token, no signal.\n'
);
