#!/usr/bin/env node
/**
 * `npm run ablation:p320`. The attack on Phase 320.1's own gates: the carriage
 * door's conditions 66 and 101 to 112 of `conformance:machines`, the renderer
 * suites that pin the wheel and keystroke rules (build/p3201/SPEC.md §7),
 * and, since the fix round, the main-side suites that own the clauses the gate
 * cannot drive (the attack verifier found 12 of its 15 single-clause
 * ablations left the gate green; the `e` arms below are those clauses, each
 * now red on the gate condition or the vitest case that owns it).
 *
 * THE SECOND BUILD (build/p3201/SPEC.md §8.2) KEPT THE 42 AND ADDED 20: `h1`
 * to `h3` the seventh shape's table rows (102), `o1` its one composer (109),
 * `o2` to `o4` the router (110), `o5`, `o6`, `o6b`, `o8` and `o8b` the park
 * gate (111), `o7`, `o10`, `o11` and `o12` the main-side clauses only vitest
 * owns (the gate header's second table), and `r9` to `r12` the renderer's D1,
 * D2 and D5. Two of the 42 were re-pointed where core's lines moved (`e16`,
 * `e21`). The integrator's round added `i1` (a report the pane sends about
 * itself is never routed as a keystroke) and `i2` (a `cancel` written marks the
 * pane live at once), 64 in all. THE FIX ROUND added 17: `f1` to `f4b` its
 * four rules (condition 112, and 110 and 111 where they own the clause), and
 * `x11` to `x21` the clauses the attack verifier's own ablations found green
 * everywhere, plus the fix round's own vitest-owned ones; `o2`, `o4`, `o5`,
 * `o6` and `o8` were re-pointed where their lines moved. 81 in all. THE RULED
 * ROUND (his ruling of 2026-10-01) added 14: `g1` to `g10` the GONE rule (a
 * key over a pane Tortie scrolled back on a machine that missed its greeting
 * holds and asks that machine once more; condition 112's F5 and the main
 * suites), and `r13` to `r16` the O rule (a key on a remote surface wins over
 * wheel travel made before it; the renderer suite); `e10` was re-pointed where
 * the runner's missed-greeting rule moved. 95 in all. HIS RULINGS OF
 * 2026-10-02 added 5: `g11` to `g15` the fall back to today (once the ask a
 * keystroke made has failed, keys there take the attach as today and the core
 * answers no pane; a connection seen again ends it; an ask a live connection
 * answered is never the one a later miss waits on), and `g9` was re-pointed
 * where its clause became the fall back's block. 100 in all.
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. Phase 320.1 opens the first
 * interactive write path on a machine's control connection, the carriage
 * research 57 section 3.1 refused because it had no gate, and research 130
 * section 4 answered that refusal by GIVING it one. The gate is only a gate if
 * each of its clauses is watched. So this script breaks ONE CLAUSE AT A TIME in
 * the shipping source and proves it reddens THE CONDITION, OR THE TEST, THAT
 * OWNS IT.
 *
 * An ablation that leaves its check green is a hole in the gate. An ablation
 * that reddens only something OTHER than its owner is a finding about the gate
 * rather than about the build, and it is printed as one.
 *
 * ## The two checks it runs
 *
 *   machines  `node build/conformance-machines.mjs`. Every failure of
 *             conditions 101 to 112 begins `condition 1NN:`, and condition 66's
 *             names the files that name "send-keys", so the owner of a red
 *             line is read off the line itself.
 *   vitest    the renderer suites `p3201-typing.test.ts`,
 *             `p3201-remote-surface.test.ts` and `p3201-wheel-follows.test.ts`
 *             (the second build's), through vitest's JSON reporter,
 *             so the owner of a red case is read off the case's own name.
 *   main      the main-side p3201 suites (MAIN_TESTS below), the same way:
 *             the control plane, the feed's epochs, the core's table and read
 *             proof, the copy's extent and the strict read.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree at once during this phase, and a
 * harness that wrote into `src/` even for the second a gate takes could lose
 * another builder's edit. So it builds a CLONE, the shape of
 * build/p293/ablation.mjs: `cp -Rc` (APFS clonefile) of `src/`, `build/` and
 * `resources/` (the gate's probe reads resources/gmux-tmux.conf) under `/private/tmp/p320-ablation-<pid>-*`, every root config the two checks
 * read copied, `node_modules` symlinked, and every check run there with that
 * directory as its cwd. Each edited file is put back and CHECKED BY SHA256
 * against the worktree's bytes before the next entry, in a `finally`, and the
 * clone is removed in a `finally` and on a signal. The worktree's own bytes for
 * every file an entry names are read before and after, and a change is a
 * finding. Nothing under the operator's home is touched.
 *
 * ## It starts nothing but node
 *
 * No Electron, no tmux, no ssh, no agent, no token and no network. Each check
 * run is one plain node (the gate spawns its own TypeScript probe through the
 * pinned tsx; vitest runs its own workers and ends them). It runs once per
 * phase beside the gates it attacks, and is not in the commit battery.
 *
 * ## The delta rule
 *
 * The base's red lines are recorded first, and each ablation must make its own
 * owner NEWLY red. That proves the ablation CAUSED the reddening rather than
 * inheriting it, and it lets the harness run while a sibling's half is not
 * landed. A red base is still reported and fails the run unless
 * `P320_ALLOW_RED_BASE=1` says the operator knows why.
 *
 * Usage:
 *   node build/p3201/ablation.mjs
 *   P320_ONLY=m1,m9,r3 node build/p3201/ablation.mjs    named entries only
 *   P320_ALLOW_RED_BASE=1 node build/p3201/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p320-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

const SHAPES = 'src/main/machines/scroll-shapes.ts';
const PLANE = 'src/main/machines/control-plane.ts';
const SESSIONS = 'src/main/machines/remote-sessions.ts';
const CORE = 'src/main/sessions/core.ts';
const HISTORY = 'src/main/machines/remote-pane-history.ts';
const LEAF = 'src/main/machines/tree-list.ts';
const SURFACE = 'src/renderer/terminal/scroll/surface.ts';
const SCROLL = 'src/main/tmux/scroll.ts';
const ORDER = 'src/main/machines/scroll-order.ts';
const HOST = 'src/main/attach/attach-host.ts';
const TESTS = [
  'src/renderer/terminal/scroll/__tests__/p3201-typing.test.ts',
  'src/renderer/terminal/scroll/__tests__/p3201-remote-surface.test.ts',
  'src/renderer/terminal/scroll/__tests__/p3201-wheel-follows.test.ts'
];
/** The main-side suites the `main` check runs (Phase 320.1's fix round). */
const MAIN_TESTS = [
  'src/main/machines/__tests__/p3201-control-scroll.test.ts',
  'src/main/machines/__tests__/p3201-scroll-address.test.ts',
  'src/main/machines/__tests__/p3201-remote-history.test.ts',
  'src/main/machines/__tests__/p3201-scroll-shapes.test.ts',
  'src/main/sessions/__tests__/p3201-remote-scroll.test.ts',
  'src/main/tmux/__tests__/p3201-remote-read.test.ts',
  'src/main/tmux/__tests__/p3201-scroll-pipeline.test.ts',
  // The second build's (build/p3201/SPEC.md §6.6).
  'src/main/machines/__tests__/p3201-scroll-order.test.ts',
  'src/main/attach/__tests__/p3201-route-remote-input.test.ts'
];

/**
 * The ablations. `check` is the check that must go red, and `owner` is what in
 * its output must be NEWLY red: a condition tag (`C101`) for the gate, and a
 * pattern over the full names of the cases for vitest. `why` is what the clause
 * is FOR, and it is what the report says when the check stays green.
 *
 * An edit's `from` is an exact string, or a RegExp when the clause's own words
 * are what matters and not its whitespace. An entry whose one clause spans two
 * places in its file (the second build's `o2`: a function made async AND an
 * await put before its write) carries `edits`, every one of which must apply.
 */
export const ABLATIONS = [
  // -------------------------------------------------------------------------
  // The table, conditions 102 and 103
  // -------------------------------------------------------------------------
  {
    n: 'm1',
    check: 'machines',
    owner: 'C102',
    name: 'a seventh row: copy-pipe-and-cancel admitted',
    why: 'research 130 measured copy-pipe-and-cancel running a program from copy mode on both builds, so a seventh row of that shape is a way to run programs on somebody else\'s computer.',
    file: SHAPES,
    from: /\n\];\n/,
    to:
      ",\n  {\n    id: 'copy-pipe-and-cancel' as ScrollShapeId,\n    argv: [word('send-keys'), word('-t'), TARGET, word('-X'), word('copy-pipe-and-cancel')],\n    idempotent: true,\n    repeat: 'Planted by ablation:p320 to prove the table is watched; never ship this row.'\n  }\n];\n"
  },
  {
    n: 'm2',
    check: 'machines',
    owner: 'C102',
    name: 'the -N bound raised to 20000',
    why: 'SCROLL_CHUNK_LINES is the one number a relative scroll may carry; above it a single command walks a server line by line and freezes every session on it for seconds.',
    file: SHAPES,
    from: "{ kind: 'int', min: 1, max: SCROLL_CHUNK_LINES }",
    to: "{ kind: 'int', min: 1, max: 20_000 }"
  },
  {
    n: 'm3',
    check: 'machines',
    owner: 'C102',
    name: 'a % pane target admitted',
    why: 'a % pane id, an = name or a bare name can each name a different session than the live row read; only the immutable $N is addressed.',
    file: SHAPES,
    from: 'export const SCROLL_TARGET = /^\\$(0|[1-9][0-9]{0,8})$/;',
    to: 'export const SCROLL_TARGET = /^[$%](0|[1-9][0-9]{0,8})$/;'
  },
  {
    n: 'm4',
    check: 'machines',
    owner: 'C103',
    name: 'any -F admitted',
    why: 'a caller supplied format on a long-lived control connection runs programs on the far machine: #(touch …) created the file on 3.6a and 3.7b.',
    file: SHAPES,
    from: "      return value === REMOTE_STATE_FORMAT ? null : 'is not the pinned read format';",
    to: '      return null;'
  },
  // -------------------------------------------------------------------------
  // The one export, condition 101
  // -------------------------------------------------------------------------
  {
    n: 'm5',
    check: 'machines',
    owner: 'C101',
    name: 'the clients map exported',
    why: 'the map holds every machine\'s live client, and exported it is a send anybody can call with any line, which is the ungated carriage research 57 refused.',
    file: PLANE,
    from: 'const clients = new Map<string, TmuxControlClient>();',
    to: 'export const clients = new Map<string, TmuxControlClient>();'
  },
  // -------------------------------------------------------------------------
  // The target, condition 104
  // -------------------------------------------------------------------------
  {
    n: 'm6',
    check: 'machines',
    owner: 'C104',
    name: 'the scroll path reading remoteSessionRow',
    why: 'remoteSessionRow answers gone rows and says nothing of which connection listed a live one, so after a far restart it names a $N that now belongs to somebody else\'s session.',
    file: CORE,
    from: '    const address = remoteScrollAddress(sessionId);',
    to:
      '    const byRow = remoteSessionRow(sessionId);\n' +
      "    const address = byRow !== null ? ({ kind: 'live', machineId: byRow.machineId, tmuxId: byRow.tmuxId } as const) : remoteScrollAddress(sessionId);"
  },
  {
    n: 'm7',
    check: 'machines',
    owner: 'C104',
    name: 'scrollAddressOf ignoring the epoch',
    why: 'a list issued before the new connection greeted cannot be the one that addresses: tmux ids restart with a far server, and that restart is exactly what moves the epoch.',
    file: SESSIONS,
    from: /if \(facts\.onControl && facts\.rowsEpoch === facts\.controlEpoch\) \{/,
    to: 'if (facts.onControl) {'
  },
  {
    n: 'm7b',
    check: 'machines',
    owner: 'C104',
    name: 'remoteScrollAddress handing scrollAddressOf constants for the epochs',
    why: 'the rule is only as good as the facts it is given; two constants that agree make every live row addressable whatever connection listed it.',
    file: SESSIONS,
    from: /controlEpoch: state\.controlEpoch,\s*rowsEpoch: state\.rowsEpoch/,
    to: 'controlEpoch: 0,\n      rowsEpoch: 0'
  },
  // -------------------------------------------------------------------------
  // One call site each, condition 105
  // -------------------------------------------------------------------------
  {
    n: 'm8',
    check: 'machines',
    owner: 'C105',
    name: 'a second caller of remoteScrollRunner',
    why: 'core\'s remoteScroll is the one caller, which is what makes the live-row target and the unreachable value the only roads to the door.',
    file: LEAF,
    from: /$/,
    to: "\n// Planted by ablation:p320; never ship this.\nimport { remoteScrollRunner as p320Planted } from './control-plane';\nexport function p320PlantedCaller(id: string): unknown {\n  return p320Planted(id);\n}\n"
  },
  {
    n: 'm8b',
    check: 'machines',
    owner: 'C105',
    name: 'a second composer of guardedScrollRunner',
    why: 'control-plane.ts is the one file that hands the composer a real client; a second is a second send reaching a machine.',
    file: LEAF,
    from: /$/,
    to: "\n// Planted by ablation:p320; never ship this.\nimport { guardedScrollRunner as p320Guarded } from './scroll-shapes';\nexport function p320PlantedComposer(input: Parameters<typeof p320Guarded>[0]): unknown {\n  return p320Guarded(input);\n}\n"
  },
  // -------------------------------------------------------------------------
  // Checked before written, condition 106
  // -------------------------------------------------------------------------
  {
    n: 'm9',
    check: 'machines',
    owner: 'C106',
    name: 'the argv written before the table is asked',
    why: 'a check that runs after the write has already sent the command; the order is the whole property.',
    file: SHAPES,
    from: '    const verdict = admitScrollArgv(args);',
    to: "    void Promise.resolve(input.send(args.map(quoteTmuxArg).join(' '))).catch(() => undefined);\n    const verdict = admitScrollArgv(args);"
  },
  {
    n: 'm10',
    check: 'machines',
    owner: 'C106',
    name: 'isCurrent ignored',
    why: 'a runner made on one connection writes on the next one, where a far server that restarted has handed the same $N to another session.',
    file: SHAPES,
    from: 'if (!input.isCurrent()) {',
    to: 'if (false as boolean) {'
  },
  // -------------------------------------------------------------------------
  // Condition 66, and the copy on a machine, condition 107
  // -------------------------------------------------------------------------
  {
    n: 'm11',
    check: 'machines',
    owner: 'C66',
    name: 'a fifth file naming \'send-keys\'',
    why: 'opening a route must mean editing a named list; a fifth file that names the verb is a second door nobody listed.',
    file: LEAF,
    from: /$/,
    to: "\n// Planted by ablation:p320; never ship this.\nexport const P320_PLANTED_VERB = 'send-keys';\n"
  },
  {
    n: 'm12',
    check: 'machines',
    owner: 'C107',
    name: 'a third argv in remoteHistoryArgs',
    why: 'the copy is two ledger reads and nothing else; a third command on that road is a write the copy never needed.',
    file: HISTORY,
    from: /wholeNumber\(paneRange\.end\)\n(\s*)\]\n(\s*)\];/,
    to: "wholeNumber(paneRange.end)\n$1],\n$2  ['copy-mode', '-e', '-t', id]\n$2];"
  },
  {
    n: 'm13',
    check: 'machines',
    owner: 'C107',
    name: 'the copy reaching the machine over the control connection',
    why: 'the copy goes over the exec plane, through execOn, as two reads the ledger already holds; the control connection\'s door is the scroll\'s alone.',
    file: HISTORY,
    from: "import { execOn } from './exec-plane';",
    to: "import { execOn } from './exec-plane';\nimport { remoteScrollRunner } from './control-plane';\nexport const p320PlantedRoute = (id: string): unknown => remoteScrollRunner(id);"
  },
  // -------------------------------------------------------------------------
  // PHASE 320.1'S FIX ROUND. The locale-proof read, condition 103 and 108
  // -------------------------------------------------------------------------
  {
    n: 'e18',
    check: 'machines',
    owner: 'C103',
    name: 'the machine read format joined with a tab again',
    why: 'a machine\'s control client with no UTF-8 locale answers every tab as _, and the read 0__1971_30_0_0_100_ was taken for a live pane while the far pane sat parked: 115 of 330 characters lost in the rig.',
    file: SCROLL,
    from: "export const REMOTE_STATE_FORMAT = STATE_FIELDS.join(' ');",
    to: "export const REMOTE_STATE_FORMAT = STATE_FIELDS.join('\\t');"
  },
  {
    n: 'e20',
    check: 'machines',
    owner: 'C103',
    name: 'the table admitting a tab-separated read too',
    why: 'this Mac\'s tab-separated read never crosses to a machine, whose client may answer its tabs as underscores.',
    file: SHAPES,
    from: "      return value === REMOTE_STATE_FORMAT ? null : 'is not the pinned read format';",
    to: "      return value === REMOTE_STATE_FORMAT || value.includes('\\t') ? null : 'is not the pinned read format';"
  },
  {
    n: 'e19',
    check: 'machines',
    owner: 'C108',
    name: 'a machine\'s answer read by this Mac\'s lenient reader',
    why: 'the lenient reader turns what it cannot read into "live, no history", which on a machine is a parked pane Tortie types into.',
    file: SCROLL,
    from: '  return run.server === undefined ? parseState(out) : parseRemoteState(out);',
    to: '  return run.server === undefined || out.length > 0 ? parseState(out) : parseRemoteState(out);'
  },
  {
    n: 'e21',
    check: 'machines',
    owner: 'C108',
    name: 'the read proof skipped in the core',
    why: 'a pipelined scroll writes copy-mode before its read comes back, so a connection whose read cannot be read must be found out by a read that parks nothing, first.',
    file: CORE,
    // Re-pointed by the second build: the proof is awaited inside remoteScroll now.
    from: 'const proof = await this.proveRemoteRead(machineId, generation, carriageRun, target);',
    to: "const proof = await Promise.resolve<'readable' | 'unreadable'>('readable');"
  },
  {
    n: 'e22',
    check: 'machines',
    owner: 'C108',
    name: 'the copy\'s extent format joined with a tab again',
    why: 'the tab extent answered 1971_30 over the loopback machine, which read as no history and no rows, and every copy there came back empty.',
    file: HISTORY,
    from: "export const REMOTE_EXTENT_FORMAT = '#{history_size} #{pane_height}';",
    to: "export const REMOTE_EXTENT_FORMAT = '#{history_size}\\t#{pane_height}';"
  },
  {
    n: 'e14',
    check: 'machines',
    owner: 'C108',
    name: 'the pipelined answers left without a handler',
    why: 'an answer a sequence stops waiting for after a failure must settle into a handler, never into the process as an unhandled rejection.',
    file: SCROLL,
    from: '    answer.catch(() => undefined);\n',
    to: '\n'
  },
  {
    n: 'e15',
    check: 'machines',
    owner: 'C108',
    name: 'a machine runner allowed to probe and latch the goto-line fallback',
    why: 'one failed goto-line through a dropped carriage would put this Mac on the slow chunked walk for the rest of the run (research 130 section 6 item 9).',
    file: SCROLL,
    from: '  if (run.server !== undefined) {\n    // Another machine',
    to: "  if (run.server === 'never') {\n    // Another machine"
  },
  // -------------------------------------------------------------------------
  // Clauses the gate did not own, now each owned (the attack verifier's x1 to x15)
  // -------------------------------------------------------------------------
  {
    n: 'e1',
    check: 'machines',
    owner: 'C106',
    name: 'the one-read copy of the caller\'s list removed',
    why: 'without the copy a Proxy argv was admitted as cancel and written as copy-pipe-and-cancel on a target carrying ; run-shell.',
    file: SHAPES,
    from: 'Array.isArray(given) ? Array.from(given as readonly unknown[]) : given',
    to: 'given'
  },
  {
    n: 'e5',
    check: 'machines',
    owner: 'C106',
    name: 'the caller\'s deadline never fires',
    why: 'a machine that stopped answering must read as not reachable now within 5 s rather than hold every scroll behind it (D10).',
    file: SHAPES,
    from: '}, deadlineMs);',
    to: '}, deadlineMs * 1_000_000);'
  },
  {
    n: 'e6',
    check: 'main',
    owner: /generation moves before the feed hears connected/,
    name: 'the generation moved AFTER the feed hears connected',
    why: 'a runner made on the old connection must already be refused inside the sink, before any reader sees the new connection\'s rows.',
    file: PLANE,
    from: "    generations.set(machineId, (generations.get(machineId) ?? 0) + 1);\n    setLink(machineId, 'connected', null);\n    machinesLog.info(`${machineId} is on a live connection.`);\n    sink?.connected(machineId);",
    to: "    setLink(machineId, 'connected', null);\n    machinesLog.info(`${machineId} is on a live connection.`);\n    sink?.connected(machineId);\n    generations.set(machineId, (generations.get(machineId) ?? 0) + 1);"
  },
  {
    n: 'e7',
    check: 'main',
    owner: /between connections/,
    name: 'isCurrent without client.connected',
    why: 'a client between connections has no connection to write on, and what it queues lands on the next one, where a $N may be somebody else\'s.',
    file: PLANE,
    from: '        clients.get(machineId) === client &&\n        client.connected &&\n',
    to: '        clients.get(machineId) === client &&\n'
  },
  {
    n: 'e8',
    check: 'main',
    owner: /different client now/,
    name: 'isCurrent without the same-client test',
    why: 'a runner made on a client the machine has since replaced must not write through the old one.',
    file: PLANE,
    from: '        clients.get(machineId) === client &&\n        client.connected &&\n',
    to: '        client.connected &&\n'
  },
  {
    n: 'e9',
    check: 'main',
    owner: /tmux the control gate refused/,
    name: 'a refused dialect never recorded',
    why: 'a machine the control gate refused must answer none, Phase 320\'s pass-through, and not waiting forever.',
    file: PLANE,
    from: '    dialectRefused.add(machineId);\n',
    to: '\n'
  },
  {
    n: 'e10',
    check: 'main',
    owner: /missed the greeting/,
    name: 'a missed greeting not read by the runner',
    why: 'a machine that missed the greeting has no connection this run, so its scroll is none, today exactly.',
    file: PLANE,
    // Re-pointed by the ruled round, where the rule moved under the client
    // lookup so a keystroke's own client is waited for.
    from: "    return noControlThisRun.has(machineId) ? { kind: 'none' } : { kind: 'waiting' };",
    to: "    return { kind: 'waiting' };"
  },
  {
    n: 'e11',
    check: 'main',
    owner: /started BEFORE a reconnect/,
    name: 'the rows epoch taken when a pass ENDS, not when it starts',
    why: 'a list issued before the new connection greeted cannot be the one that addresses: its $N may name a session a far restart handed on.',
    file: SESSIONS,
    from: '  state.rowsEpoch = epoch;',
    to: '  state.rowsEpoch = state.controlEpoch;'
  },
  {
    n: 'e12',
    check: 'main',
    owner: /the epoch moves on connected/,
    name: 'the control epoch never moved on connected',
    why: 'the epoch is what separates a list made on this connection from one made on the last; constant, every live row is addressable after a far restart.',
    file: SESSIONS,
    from: '      state.controlEpoch += 1;\n',
    to: '\n'
  },
  {
    n: 'e13',
    check: 'main',
    owner: /never a throw/,
    name: 'a far failure rethrown instead of the value',
    why: 'a throw from the scroll handler is Phase 95\'s once-a-second stack trace back, which probe:p95 step 4 counts.',
    file: CORE,
    from: '        noteRemoteScrollFailed(machineId, generation, err);\n        return PANE_NOT_REACHABLE_NOW;',
    to: '        noteRemoteScrollFailed(machineId, generation, err);\n        throw err;'
  },
  {
    n: 'e16',
    check: 'main',
    owner: /the read proof/,
    name: 'an unreadable connection scrolled anyway',
    why: 'a connection whose read cannot be read must park nothing: its pipelined scroll would leave a pane in copy mode that Tortie reads as live.',
    file: CORE,
    // Re-pointed by the second build: the refusal is an if-block now.
    from: "if (proof === 'unreadable') {",
    to: "if (proof === ('never' as string)) {"
  },
  {
    n: 'e17',
    check: 'main',
    owner: /extent a client with no UTF-8 locale sanitized is refused|hostile extent answer is refused/,
    name: 'the copy\'s extent read leniently again',
    why: 'an extent read as zeros clamps every range to nothing, a copy that silently comes back empty.',
    file: HISTORY,
    from: "    throw gmuxError(\n      'TMUX_UNREACHABLE',\n      \"Couldn't read this session's history.\",\n      'the machine answered the extent read in a shape Tortie does not read'\n    );",
    to: '    return { history: 0, rows: 0 };'
  },
  // -------------------------------------------------------------------------
  // The renderer, the two p3201 suites (§4, D12)
  // -------------------------------------------------------------------------
  {
    n: 'r1',
    check: 'vitest',
    owner: /P1, the hold|holds a key behind an unanswered notch/,
    name: 'mustHold without the parking term',
    why: 'a key decided from an answer that a scroll in flight will overturn goes into copy mode and is eaten: research 130 measured 3 to 4 of 11 lost at a 50 ms round trip.',
    file: SURFACE,
    from: /this\.inputQueue\.length > 0 \|\|\s*this\.parking > 0 \|\|/,
    to: 'this.inputQueue.length > 0 ||'
  },
  {
    n: 'r2',
    check: 'vitest',
    owner: /P2, the key fence/,
    name: 'awaitKeyFence a no-op',
    why: 'the fence is what orders a scroll after a keystroke that left on the other path; without it the next scroll can overtake the key.',
    file: SURFACE,
    from: 'private awaitKeyFence(): Promise<void> | null {',
    to: 'private awaitKeyFence(): Promise<void> | null {\n    if (this.fenceUntil === this.fenceUntil) return null;'
  },
  {
    n: 'r3',
    check: 'vitest',
    owner: /survive the outage|unreachable/,
    name: 'drainHeld delivering on an unreachable answer',
    why: 'an unreachable answer says nothing about the pane; delivering on it types into a copy mode nobody left, which is what the carriage drop does to typing.',
    file: SURFACE,
    from: 'if (answer.unreachable === true) {',
    to: 'if (answer.unreachable === true && (false as boolean)) {'
  },
  {
    n: 'r4',
    check: 'vitest',
    owner: /retryAfterThrow|THREW/,
    name: 'retryAfterThrow removed',
    why: 'without it a thrown return to live strands the held keys until the next keystroke, the parent\'s wedge less its permanence (research 130 §6 item 5).',
    file: SURFACE,
    from: 'if (!(await this.retryAfterThrow(wait))) return;',
    to: 'return;'
  },
  {
    n: 'r5',
    check: 'vitest',
    owner: /settleHeldOnDispose|final call/,
    name: 'settleHeldOnDispose removed',
    why: 'a key typed over a parked pane as the session is left was delivered by the parent and dropped by Phase 320\'s first P3 (0 of 10 against 10 of 10).',
    file: SURFACE,
    from: /await this\.settleHeldOnDispose\(api, gmux\);\s*return;/,
    to: 'return;'
  },
  {
    n: 'r6',
    check: 'vitest',
    owner: /coalesce/,
    name: 'sendTravel without coalescing',
    why: 'every wheel frame queued serially over a slow link drains seconds after the hand stops: research 130 measured a one second fling arriving 12.1 s late at 50 ms.',
    file: SURFACE,
    from: /if \(this\.travelBusy\) \{\s*this\.queuedLines \+= lines;\s*return;\s*\}/,
    to: ''
  },
  {
    n: 'r8',
    check: 'vitest',
    owner: /latest drag position|skip the ones it replaced/,
    name: 'sendLatestTo sending every position',
    why: 'a drag queued serially arrived 19 s after the pointer stopped at a 50 ms round trip (research 130 section 6 item 8); latest wins is what keeps the pane under the pointer.',
    file: SURFACE,
    from: /if \(this\.travelBusy\) \{\s*this\.pendingTo = position;\s*this\.queuedLines = 0;\s*return;\s*\}/,
    to: ''
  },
  {
    n: 'r7',
    check: 'vitest',
    owner: /an unreachable answer/,
    name: 'noteUnreachable applying the numbers',
    why: 'the unreachable value carries NO_PANE_HERE\'s numbers; applied, they draw the reader at live and latch "no pane" for the life of the mount.',
    file: SURFACE,
    from: /this\.unreachable = true;\s*this\.schedule\(\);\s*return true;/,
    to: 'this.unreachable = true;\n      return false;'
  },
  // -------------------------------------------------------------------------
  // PHASE 320.1's SECOND BUILD (build/p3201/SPEC.md §8.2). The seventh shape,
  // conditions 102 and 109
  // -------------------------------------------------------------------------
  {
    n: 'h1',
    check: 'machines',
    owner: 'C102',
    name: 'a -H byte in capitals admitted',
    why: 'one byte has one spelling, two lowercase hex digits; a second spelling is a second thing to check and the first place a wider door would start.',
    file: SHAPES,
    from: 'const HEX_BYTE = /^[0-9a-f]{2}$/;',
    to: 'const HEX_BYTE = /^[0-9a-fA-F]{2}$/;'
  },
  {
    n: 'h2',
    check: 'machines',
    owner: 'C102',
    name: '257 bytes in one typed command admitted',
    why: 'TYPED_BYTES_PER_COMMAND bounds one line on a machine\'s control connection; a paste is split, never sent as one unbounded command.',
    file: SHAPES,
    from: "{ kind: 'hex-bytes', min: 1, max: TYPED_BYTES_PER_COMMAND }",
    to: "{ kind: 'hex-bytes', min: 1, max: TYPED_BYTES_PER_COMMAND + 1 }"
  },
  {
    n: 'h3',
    check: 'machines',
    owner: 'C102',
    name: 'a key name after -H admitted',
    why: '-H makes every argument ONE literal byte; a key name is a binding tmux resolves, which is exactly what the seventh shape was approved never to carry.',
    file: SHAPES,
    from: "      return HEX_BYTE.test(value) ? null : 'is not one byte written as two lowercase hex digits';",
    to: "      return HEX_BYTE.test(value) || /^[A-Z][a-z]+$/.test(value) ? null : 'is not one byte written as two lowercase hex digits';"
  },
  {
    n: 'o1',
    check: 'machines',
    owner: 'C109',
    name: 'typedSequence without its cancel',
    why: 'a byte typed into a pane still in copy mode is read by copy mode as one of its own commands and eaten, which is the loss the whole design exists to end.',
    file: SHAPES,
    from: "  const out: string[][] = [['send-keys', '-t', target, '-X', 'cancel']];",
    to: '  const out: string[][] = [];'
  },
  // -------------------------------------------------------------------------
  // The router, condition 110
  // -------------------------------------------------------------------------
  {
    n: 'o2',
    check: 'machines',
    owner: 'C110',
    name: 'routeKey writing after an await',
    why: 'a key written after an await lets the renderer\'s unmount reach main first; the first attempt delivered 0 of 20 keys typed as the person left the session.',
    file: ORDER,
    edits: [
      {
        from: /export function routeKey\(sessionId: string, data: string, now: number = clock\.now\(\)\): KeyRoad \{/,
        to: 'export async function routeKey(sessionId: string, data: string, now: number = clock.now()): Promise<KeyRoad> {'
      },
      {
        from: '    if (!writeTyped(sessionId, address.machineId, carriage, address.tmuxId, data)) {',
        to: '    await Promise.resolve();\n    if (!writeTyped(sessionId, address.machineId, carriage, address.tmuxId, data)) {'
      }
    ]
  },
  {
    n: 'o3',
    check: 'machines',
    owner: 'C110',
    name: 'the input hook asked for this Mac\'s keys too',
    why: 'this Mac\'s typing half is the first attempt\'s, measured better than the parent (0 of 440 lost against 15), and a local key has no second road to order.',
    file: HOST,
    from: /client\.kind === 'remote' &&\s*this\.opts\.routeRemoteInput/,
    to: 'this.opts.routeRemoteInput'
  },
  {
    n: 'o4',
    check: 'machines',
    owner: 'C110',
    name: 'routeKey logging the keystroke',
    why: 'a keystroke is the person\'s words; a log line of one is his text on disk.',
    file: ORDER,
    from: '  const road = roadOf(sessionId);\n  road.keys += 1;\n  const byAttach = (): KeyRoad => {',
    to: '  const road = roadOf(sessionId);\n  road.keys += 1;\n  orderLog.info(`routed ${data}`);\n  const byAttach = (): KeyRoad => {'
  },
  // -------------------------------------------------------------------------
  // The park gate, condition 111
  // -------------------------------------------------------------------------
  {
    n: 'o5',
    check: 'machines',
    owner: 'C111',
    name: 'awaitRoadQuiet a no-op',
    why: 'a park written in the same tick as a key on the attach ate up to 17 of 100 (§4 M3 iv); the wait is what keeps the two roads from overlapping.',
    file: ORDER,
    from: 'export async function awaitRoadQuiet(sessionId: string, now?: number): Promise<boolean> {',
    to: 'export async function awaitRoadQuiet(sessionId: string, now?: number): Promise<boolean> {\n  if (sessionId === sessionId) return true;'
  },
  {
    n: 'o6',
    check: 'machines',
    owner: 'C111',
    name: 'the session core parking without the read before the park',
    why: 'the read is what knows first when the program has taken the mouse over a loaded link; without it a pane is parked over the reporter\'s own full-screen program.',
    file: CORE,
    from: /state = await undoRacedPark\(\s*run,\s*target,\s*await readBeforePark\(run, target, op, \{[\s\S]*?\}\)\s*\);/,
    to: 'state = await op(run, target);'
  },
  {
    n: 'o6b',
    check: 'machines',
    owner: 'C111',
    name: 'readBeforePark parking a program that has the screen or the mouse',
    why: 'the first attempt parked the reporter\'s full-screen program and left it stuck in copy mode, 0 of 20 notches reaching it.',
    file: ORDER,
    from: "  if (before.innerAlt || before.innerMouse) return { outcome: 'refused', state: before };\n",
    to: '\n'
  },
  {
    n: 'o8',
    check: 'machines',
    owner: 'C111',
    name: 'the session core never undoing a raced park',
    why: 'a program that asks for the mouse while the park is on its way is left in copy mode, the first attempt\'s stuck pane.',
    file: CORE,
    edits: [
      {
        from: /state = await undoRacedPark\(\s*run,\s*target,\s*await readBeforePark\(/,
        to: 'state = (\n            await readBeforePark('
      },
      {
        from: /\}\)\n(\s*)\);\n(\s*)\} else \{\n(\s*)state = await op\(run, target\);/,
        to: '})\n$1).state;\n$2} else {\n$3state = await op(run, target);'
      }
    ]
  },
  {
    n: 'o8b',
    check: 'machines',
    owner: 'C111',
    name: 'undoRacedPark answering a raced park as it is',
    why: 'the cancel is the one write that takes a raced pane back to its program.',
    file: ORDER,
    from: '  return exitPaneScroll(run, target);\n}',
    to: '  return state;\n}'
  },
  // -------------------------------------------------------------------------
  // The clauses only vitest owns (the gate header's second table)
  // -------------------------------------------------------------------------
  {
    n: 'o7',
    check: 'main',
    owner: /hook true: the pty gets nothing/,
    name: 'the attach host writing a routed key to the pty too',
    why: 'a key the router already wrote to the control connection, written to the attach as well, arrives twice.',
    file: HOST,
    from: /=== true\s*\)\s*\{\s*return;\s*\}/,
    to: '=== true\n        ) {\n          /* ablated */\n        }'
  },
  {
    n: 'o10',
    check: 'main',
    owner: /keysOrderedInMain|every remote answer says main orders/,
    name: 'a live remote answer without keysOrderedInMain',
    why: 'without it the renderer holds and fences a remote keystroke, the first attempt\'s typing delay and its lost key at a switch of session.',
    file: CORE,
    from: 'return { ...state, hasPane: true, keysOrderedInMain: true };',
    to: 'return { ...state, hasPane: true };'
  },
  {
    n: 'o11',
    check: 'main',
    owner: /older read's answer applied after a newer one is ignored|write order/,
    name: 'answers applied in the order their handlers ran',
    why: 'a stale "live" applied after a newer "parked" puts the next key on the attach over a parked pane, where copy mode eats it.',
    file: ORDER,
    from: '    if (stamp < road.applied) return;\n',
    to: '\n'
  },
  {
    n: 'o12',
    check: 'main',
    owner: /is not sent again, leaves the pane possibly parked/,
    name: 'a failed typed sequence leaving the pane believed live',
    why: 'a typed sequence that got no answer may have parked nothing or everything; the next key must take the control connection, behind a cancel, whatever Tortie believed (D9).',
    file: ORDER,
    from: "    if (failure !== null) {\n      noteAnswer(sessionId, 'failed', stamp);",
    to: '    if (failure !== null) {'
  },
  // -------------------------------------------------------------------------
  // The integrator's round of the second build: two clauses its re-derivation
  // found missing, each owned by a case in p3201-scroll-order.test.ts
  // -------------------------------------------------------------------------
  {
    n: 'i1',
    check: 'main',
    owner: /a report the pane sends about itself/,
    name: 'routeKey taking a report for a keystroke',
    why: 'xterm answers tmux on the keystroke\'s event (focus, colour, device attributes); over a parked far pane the router would write a cancel, throwing the reader to live, and TYPE the report into the program (Phase 205 and Phase 292\'s defect, on another machine).',
    file: ORDER,
    from: "  if (isPaneReport(data)) return 'attach';\n",
    to: '\n'
  },
  {
    n: 'i2',
    check: 'main',
    owner: /a cancel written marks the pane live at once/,
    name: 'a cancel written leaving the pane believed parked',
    why: 'a notch in the round trip after a key over a parked pane is taken for a scroll of a pane known parked, and the session core parks it without D3\'s read, over a program that may just have taken the mouse.',
    file: ORDER,
    from: '        verdict.shape === PARKING_SHAPE ||\n        verdict.shape === LEAVING_SHAPE)',
    to: '        verdict.shape === PARKING_SHAPE)'
  },
  // -------------------------------------------------------------------------
  // The renderer, the wheel and the keys (D1, D2, D5)
  // -------------------------------------------------------------------------
  {
    n: 'r9',
    check: 'vitest',
    owner: /gets every notch of a flick from the first|the route table/,
    name: 'wheelFollowsProgram without xterm\'s own mouse mode',
    why: 'xterm learns a program asked for the mouse within 0.1 ms; main\'s read can be a second old, and the first attempt parked the reporter\'s program for that second.',
    file: SURFACE,
    from: "    if (wheelReachesProgram(mode)) return 'program';\n",
    to: '\n'
  },
  {
    n: 'r10',
    check: 'vitest',
    owner: /sends nothing, asks once a second at most|the route table/,
    name: 'wheelFollowsProgram without the nothing arm',
    why: 'a read that says the mouse over a terminal that says it no longer has one is stale one way or the other; handing it on types ESC O A into a program that just let go (Phase 95).',
    file: SURFACE,
    from: /    if \(this\.state\.innerMouse\) \{\s*this\.askAgainForWheel\(\);\s*return 'nothing';\s*\}\n/,
    to: '\n'
  },
  {
    n: 'r11',
    check: 'vitest',
    owner: /never holds a key/,
    name: 'keysGoStraight ignored: a remote surface holding keys',
    why: 'a held key dies with the mount when the person chooses another session at once (the first attempt\'s T3, 0 of 20), and holding is a typing delay his ruling excluded.',
    file: SURFACE,
    from: '  private keysGoStraight(): boolean {\n    return this.keysOrderedInMain;',
    to: '  private keysGoStraight(): boolean {\n    return false;'
  },
  {
    n: 'r12',
    check: 'vitest',
    owner: /never fences a scroll behind a key/,
    name: 'dispatchTravel fencing remote travel',
    why: 'a fence only delays and cannot order two roads: at 32 ms his Mac Pro still lost 4 of 220 characters; main orders them now.',
    file: SURFACE,
    from: 'const fence = this.keysGoStraight() ? null : this.awaitKeyFence();',
    to: 'const fence = this.awaitKeyFence();'
  },
  // -------------------------------------------------------------------------
  // THE FIX ROUND (build/p3201/SPEC.md §As built, the fixer's section):
  // condition 112's four rules, and the five clauses the attack verifier's
  // own ablations found green everywhere (x11, x13, x14, x15, x17), each now
  // owned by a case, plus the fix round's own vitest-owned clauses
  // -------------------------------------------------------------------------
  {
    n: 'f1',
    check: 'machines',
    owner: 'C112',
    name: 'keys kept on the control connection after every sequence on it has answered',
    why: 'when that connection alone died, every key still on it was lost where the parent lost none (42 of 700 in bursts, 60 of 700 over a 50 ms link); an answer proves the far server ran everything before it, so nothing else may keep a key off the attach.',
    file: ORDER,
    from: '  return road.parked || road.mayBeParked || carriageBusy(road);',
    to: '  return road.parked || road.mayBeParked || carriageBusy(road) || road.applied > 0;'
  },
  {
    n: 'f2a',
    check: 'machines',
    owner: 'C111',
    name: 'the quiet wait restarting on a key instead of dropping the park',
    why: 'held until the typing paused, the park landed after it and the view jumped 50 lines back a fifth of a second after the last key, 18 of 18 runs, where today nothing moves.',
    file: ORDER,
    from: '    if (keysSoFar(sessionId) !== keysAtStart) return false;\n',
    to: '\n'
  },
  {
    n: 'f2b',
    check: 'machines',
    owner: 'C112',
    name: 'readBeforePark ignoring a key typed since the scroll began',
    why: 'a key typed while the read before the park is on its way goes first, and the park landing after it parks the pane the person is typing into.',
    file: ORDER,
    from: "  if (hooks.stillWanted !== undefined && !hooks.stillWanted()) {\n    return { outcome: 'dropped', state: before };\n  }\n",
    to: '\n'
  },
  {
    n: 'f2c',
    check: 'machines',
    owner: 'C112',
    name: 'the session core not telling readBeforePark about keys typed since the scroll began',
    why: 'the rule in scroll-order.ts is only a rule if the core asks it.',
    file: CORE,
    from: /stillWanted: \(\) => keysSoFar\(sessionId\) === keysAtStart,\s*/,
    to: ''
  },
  {
    n: 'f3a',
    check: 'machines',
    owner: 'C112',
    name: 'leaveForProgram a no-op',
    why: 'a far program that took the screen and the mouse while the person was scrolled back got 0 of 50 notches, and the pane stayed in copy mode, where today it gets 50 of 50.',
    file: ORDER,
    from: '  if (roads.get(sessionId)?.ours !== true) return state;\n',
    to: '  if (sessionId === sessionId) return state;\n'
  },
  {
    n: 'f3b',
    check: 'machines',
    owner: 'C112',
    name: 'leaveForProgram leaving copy mode Tortie did not enter',
    why: 'the person\'s own copy mode (their prefix and [) over a full screen program would be cancelled under them by the poll, which today never reads that pane.',
    file: ORDER,
    from: '  if (roads.get(sessionId)?.ours !== true) return state;\n',
    to: '\n'
  },
  {
    n: 'f3c',
    check: 'machines',
    owner: 'C112',
    name: 'the session core never marking a pane it parked as its own',
    why: 'without the mark no pane ever goes back to its program.',
    file: CORE,
    from: /,?\s*parking: \(\) => noteParkedByUs\(sessionId\)/,
    to: ''
  },
  {
    n: 'f4a',
    check: 'machines',
    owner: 'C112',
    name: 'a key over a parked pane whose connection is down sent down the attach',
    why: 'down the attach it is typed into copy mode and eaten: T5 delivered 0 of 27 characters where the parent delivered 3 of 9.',
    file: ORDER,
    from: '      return hold(sessionId, road, address.machineId, data);\n',
    to: '      return byAttach();\n'
  },
  {
    n: 'f4b',
    check: 'machines',
    owner: 'C110',
    name: 'the core writing a held key to the attach as well',
    why: 'a key held for a connection that is down would reach copy mode now and the program again later.',
    file: CORE,
    from: "routeRemoteInput: (sessionId, data) => routeKey(sessionId, data) !== 'attach'",
    to: "routeRemoteInput: (sessionId, data) => routeKey(sessionId, data) === 'carriage'"
  },
  {
    n: 'x11',
    check: 'main',
    owner: /a cancel that answers "not in a mode" is an answer/,
    name: 'the cancel\'s "not in a mode" counted as a failure',
    why: 'every key over a live pane would then leave it "possibly parked", keep the next keys on the control connection, and log a failure that did not happen.',
    file: ORDER,
    from: "        if (index === 0) cancelUnanswered = gmuxErrorPayloadOf(err)?.code === 'TMUX_UNREACHABLE';\n        else if (failure === null) failure = err;",
    to: '        if (failure === null) failure = err;'
  },
  {
    n: 'x13',
    check: 'main',
    owner: /an operation on a pane that may be parked is counted/,
    name: 'an operation on a pane that may be parked left uncounted',
    why: 'a key typed while it is on its way would take the attach into a pane that may be in copy mode.',
    file: CORE,
    from: "const counted = (kind === 'park' && wanted) || road.parked || road.mayBeParked;",
    to: "const counted = (kind === 'park' && wanted) || road.parked;"
  },
  {
    n: 'x14',
    check: 'main',
    owner: /refuses every answer that is not one line of eight whole-number fields/,
    name: 'the strict machine read accepting an empty pane_in_mode',
    why: 'an empty first field read as "not in a mode" is the open-failing read the fix round removed.',
    file: SCROLL,
    from: 'const REMOTE_FIELD_SHAPES: readonly RegExp[] = [\n  /^[0-9]+$/,',
    to: 'const REMOTE_FIELD_SHAPES: readonly RegExp[] = [\n  /^[0-9]*$/,'
  },
  {
    n: 'x15',
    check: 'main',
    owner: /a device answer with a key typed after it is a keystroke/,
    name: 'a device answer matched without its end anchor',
    why: 'a key typed in the same chunk as a device answer would be taken for a report, sent down the attach into copy mode, and eaten (Phase 292\'s clause).',
    file: 'src/shared/pane-report.ts',
    from: '[0-9;]*c$`);',
    to: '[0-9;]*c`);'
  },
  {
    n: 'x17',
    check: 'main',
    owner: /a park or a cancel written clears "may be parked" at once/,
    name: 'a park or cancel written leaving the pane "possibly parked"',
    why: 'the session core then treats a pane it has just returned to live as feared parked, and keeps keys off the attach for nothing.',
    file: ORDER,
    from: '          road.parked = verdict.shape === PARKING_SHAPE;\n          road.mayBeParked = false;\n',
    to: '          road.parked = verdict.shape === PARKING_SHAPE;\n'
  },
  {
    n: 'x19',
    check: 'main',
    owner: /only the held one is sent|scrolled back proves nothing/,
    name: 'a lost sequence sent again whatever the new connection reads',
    why: 'when the pane reads live its cancel may have run and its bytes with it; sending them again types them twice (at most once, research 57).',
    file: ORDER,
    from: '    if (state !== null && state.inMode && road.lastParkStamp < first) {',
    to: '    if (state !== null) {'
  },
  {
    n: 'x20',
    check: 'vitest',
    owner: /rule 4 on another machine|the route table, answers from another machine/,
    name: 'a remote alternate screen with no mouse handed to xterm',
    why: 'xterm types ESC O A per notch, which walks Codex 0.158\'s prompt history and moves an approval\'s highlight; today that wheel does nothing.',
    file: SURFACE,
    from: "    if (this.state.innerAlt) return this.onAnotherMachine() ? 'nothing' : 'program';",
    to: "    if (this.state.innerAlt) return 'program';"
  },
  {
    n: 'x21',
    check: 'vitest',
    owner: /says so at mount/,
    name: 'a pane on another machine not saying so at mount',
    why: 'a key typed after a notch before the first answer is held, and lost when the person chooses another session at once (0 of 14 over a 50 ms link).',
    file: SURFACE,
    from: '    this.keysOrderedInMain = options.onAnotherMachine === true;',
    to: '    void options;'
  },
  // -------------------------------------------------------------------------
  // THE RULED ROUND (his ruling of 2026-10-01, "One narrow fix round"):
  // GONE, a pane Tortie scrolled back on a machine that missed its greeting
  // (condition 112's F5 and the main suites), and O, a key wins over wheel
  // travel made before it (the renderer suite)
  // -------------------------------------------------------------------------
  {
    n: 'g1',
    check: 'machines',
    owner: 'C112',
    name: 'a key over a parked pane on a machine that missed its greeting sent down the attach',
    why: 'down the attach it is typed into copy mode and eaten: the reverifier\'s GONE row delivered 0 of 3 by the keyboard and 0 of 3 by the bridge, where today delivers 3 of 3.',
    file: ORDER,
    from: '      if (round === null) return byAttach();\n',
    to: '      return byAttach();\n'
  },
  {
    n: 'g2',
    check: 'main',
    owner: /keys held while the connection was reconnecting ask once more/,
    name: 'keys held through a reconnect dropped when it misses its greeting, with no ask',
    why: 'keys typed while the reconnect was on its way are the person\'s too, and dropping them at the miss loses what today delivers.',
    file: ORDER,
    from: '        if (machineId !== null && reopenStillComing(road, machineId)) {',
    to: '        if (machineId === null && reopenStillComing(road, machineId)) {'
  },
  {
    n: 'g3',
    check: 'machines',
    owner: 'C112',
    name: 'every key asking the machine again while its ask is being handed over',
    why: 'a burst of keys would spawn one ssh child a key on a machine that does not greet, which is the loop Phase 83 exists to stop.',
    file: ORDER,
    from: '  if (known?.pending === true) return known.round;\n',
    to: '\n'
  },
  {
    n: 'g4',
    check: 'main',
    owner: /a keystroke's ask makes one client, past the set/,
    name: 'openControlPlane refusing a keystroke\'s ask like any other after a missed greeting',
    why: 'the machine keeps no connection for the rest of the run, and the pane Tortie scrolled back there stays in copy mode with every key lost.',
    file: PLANE,
    from: '    if (ask.keystroke !== true) {',
    to: '    if (ask.keystroke !== undefined || ask.keystroke === undefined) {'
  },
  {
    n: 'g5',
    check: 'main',
    owner: /while that client waits for its greeting the machine is waiting, not none/,
    name: 'the runner answering none while the keystroke\'s client waits for its greeting',
    why: 'the held keys would read the machine as gone at once and be dropped before the connection they asked for could greet.',
    file: PLANE,
    from: "  if (dialectRefused.has(machineId)) return { kind: 'none' };",
    to: "  if (dialectRefused.has(machineId) || noControlThisRun.has(machineId)) return { kind: 'none' };"
  },
  {
    n: 'g6',
    check: 'main',
    owner: /when it greets: live, and the machine comes off the set/,
    name: 'a machine whose keystroke-asked connection greeted left on the greeting set',
    why: 'the set would say the machine has no connection while it has one, and the feed\'s own open would be refused there for the rest of the run.',
    file: PLANE,
    from: '    noControlThisRun.delete(machineId);\n',
    to: '\n'
  },
  {
    n: 'g7',
    check: 'machines',
    owner: 'C112',
    name: 'the core answering no pane for a scrolled-back pane on a machine a key may ask again',
    why: 'the surface latches no pane for the rest of the mount, so after a key brings the connection back the wheel and the scrollbar still do nothing until a remount.',
    file: CORE,
    from: '      return Promise.resolve(awaitsReopen(sessionId, machineId) ? PANE_NOT_REACHABLE_NOW : NO_PANE_HERE);',
    to: '      return Promise.resolve(NO_PANE_HERE);'
  },
  {
    n: 'g8',
    check: 'machines',
    owner: 'C112',
    name: 'the greeting miss itself asking the machine again, with no keystroke',
    why: 'a machine that never greets would spawn and kill an ssh child on every miss for as long as Tortie is open, which Phase 83 refused; only a person\'s key may ask.',
    file: PLANE,
    from: '    noControlThisRun.add(machineId);\n',
    to: '    noControlThisRun.add(machineId);\n    void openControlPlane(machineId, { keystroke: true });\n'
  },
  {
    n: 'g9',
    check: 'main',
    owner: /when it does not open, the keys are dropped/,
    name: 'held keys never giving up on an ask that did not open',
    why: 'the loop would ask the machine again on every look, a child every few seconds for as long as the pane is scrolled back, and the keys would be typed long after the person gave up on them.',
    file: ORDER,
    // Re-pointed by his rulings of 2026-10-02: the clause now also falls back.
    from: '  if (known !== undefined && road.reopenRound === known.round) {\n',
    to: '  if (known === undefined && road.reopenRound === -1) {\n'
  },
  {
    n: 'g10',
    check: 'main',
    owner: /awaitsReopen: a pane only that connection can return|a pane at rest there, or a machine whose tmux was refused/,
    name: 'awaitsReopen naming a pane at rest',
    why: 'a pane at rest on a machine with no connection this run is today\'s no pane, and answering not reachable for it keeps a surface asking for nothing.',
    file: ORDER,
    from: '  if (!needed) return false;\n',
    to: '\n'
  },
  // -------------------------------------------------------------------------
  // HIS RULINGS OF 2026-10-02, "Fall back to today": once the ask a keystroke
  // made of a machine that missed its greeting has failed, keys there go down
  // the attach exactly as today, and the core answers "no pane" (the main
  // suites own every clause)
  // -------------------------------------------------------------------------
  {
    n: 'g11',
    check: 'main',
    owner: /next key takes the attach, as today/,
    name: 'a key over a scrolled-back pane on a machine whose keystroke ask failed held for another ask',
    why: 'on a machine whose connection never opens again every key is held and dropped and the pane stays scrolled back, so typing cannot leave it, where today a typed q does (his ruling of 2026-10-02).',
    file: ORDER,
    from: '      if (askFailed.has(address.machineId)) return byAttach();\n',
    to: '\n'
  },
  {
    n: 'g12',
    check: 'main',
    owner: /once a key's ask of that machine has failed/,
    name: 'awaitsReopen still naming a pane on a machine whose keystroke ask failed',
    why: 'the core keeps answering not reachable now for a machine no key will ask again, so the surface keeps asking for nothing where today it is told no pane.',
    file: ORDER,
    from: '  if (askFailed.has(machineId)) return false;\n',
    to: '\n'
  },
  {
    n: 'g13',
    check: 'main',
    owner: /next key takes the attach, as today/,
    name: 'a failed ask never recorded, so the machine never falls back',
    why: 'each later key asks again and is held and dropped, the residual he ruled out: nothing typed leaves the scrolled-back view.',
    file: ORDER,
    from: '    fallBack(machineId);\n    return false;\n',
    to: '    return false;\n'
  },
  {
    n: 'g14',
    check: 'main',
    owner: /an ask that was answered by a live connection|a fall back ends when a connection/,
    name: 'an ask a live connection answered left standing as the one later keys wait on',
    why: 'a later miss is read as that ask failing, so the keys held for it are dropped and the machine falls back without ever being asked, where the ruled round asks once.',
    file: ORDER,
    from: '    reopens.set(machineId, { round: known.round + 1, pending: false });\n',
    to: '\n'
  },
  {
    n: 'g15',
    check: 'main',
    owner: /a fall back ends when a connection/,
    name: 'a fall back that never ends when a connection to the machine is opened again',
    why: 'after Prepare opens the machine again, a later miss is never asked about, and keys over a pane scrolled back there are dropped where the ruled round would bring them back.',
    file: ORDER,
    from: '  const endedFallBack = askFailed.delete(machineId);\n',
    to: '  const endedFallBack = false;\n'
  },
  {
    n: 'r13',
    check: 'vitest',
    owner: /travel queued behind a scroll on the chain is dropped by a key/,
    name: 'a remote key leaving the travel queued behind a scroll on the chain',
    why: 'that travel was made before the key and is sent after it, and main counts its keys from receipt, so it parks the pane 200 ms after the typing stops: 2 to 4 lines back in 4 of 20 runs on his Mac Pro, where today none.',
    file: SURFACE,
    from: '      this.pendingLines = 0;\n      this.queuedLines = 0;\n',
    to: '      this.pendingLines = 0;\n'
  },
  {
    n: 'r14',
    check: 'vitest',
    owner: /wheel travel still coalescing when the key is typed is dropped/,
    name: 'a remote key leaving the wheel travel still coalescing',
    why: 'a notch made a few milliseconds before the key leaves 16 ms later, after it, and parks the pane once the typing stops.',
    file: SURFACE,
    from: '      this.pendingLines = 0;\n      this.queuedLines = 0;\n',
    to: '      this.queuedLines = 0;\n'
  },
  {
    n: 'r15',
    check: 'vitest',
    owner: /a scroll handed to the chain but not yet sent/,
    name: 'a remote scroll handed to the chain and overtaken by a key still sent',
    why: 'a scroll waiting behind a poll leaves after a key typed later, and main, counting from receipt, parks the pane behind the typing.',
    file: SURFACE,
    from: "      if (move.kind === 'by' && this.keysSent !== keysAtHandOver) {",
    to: "      if (move.kind === 'by' && this.keysSent !== this.keysSent) {"
  },
  {
    n: 'r16',
    check: 'vitest',
    owner: /on THIS Mac a key drops nothing/,
    name: 'this Mac\'s keys dropping travel too',
    why: 'this Mac keeps P1 to P4 as measured (T1 0 of 440 against 15 of 440 today); a scroll queued before a key there still goes, after the key and its fence.',
    file: SURFACE,
    from: '  private deliver(gmux: InstalledGmuxApi, data: string): void {\n    gmux.term.sendInput(this.sessionId, data);',
    to: '  private deliver(gmux: InstalledGmuxApi, data: string): void {\n    this.keysSent += 1;\n    gmux.term.sendInput(this.sessionId, data);'
  }
];

// ---------------------------------------------------------------------------
// The clone, and the checks run inside it
// ---------------------------------------------------------------------------

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

/** The owner tag of one failure line of conformance:machines, or null. */
export function ownerOfGateLine(line) {
  const m = /^\s*-\s*condition (\d+)(?: to \d+)?:/.exec(line);
  if (m) return `C${m[1]}`;
  if (/that name "send-keys" are/.test(line)) return 'C66';
  return null;
}

/**
 * The red owners of one gate run: a tag per numbered failure line, and the
 * first words of every other failure line so an unrelated red is visible.
 */
export function gateRed(text) {
  const red = new Set();
  for (const line of text.split('\n')) {
    if (!/^\s+-\s/.test(line)) continue;
    red.add(ownerOfGateLine(line) ?? `other:${line.trim().slice(2, 62)}`);
  }
  return red;
}

/** The failing case names of one vitest JSON report. */
export function vitestRed(report) {
  const red = new Set();
  for (const file of report?.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      if (t.status === 'failed') red.add(t.fullName ?? [...(t.ancestorTitles ?? []), t.title].join(' '));
    }
  }
  return red;
}

/** Does `newlyRed` hold the owner? A tag is matched exactly, a RegExp against case names. */
export function ownerRed(owner, newlyRed) {
  if (owner instanceof RegExp) return [...newlyRed].some((name) => owner.test(name));
  return newlyRed.has(owner);
}

function selfTest() {
  const cases = [
    ['a numbered line is its condition', ownerOfGateLine('  - condition 102: the table ADMITS'), 'C102'],
    ['the load line is condition 101', ownerOfGateLine("  - condition 101 to 112: Phase 320.1's door"), 'C101'],
    ['condition 66 by its words', ownerOfGateLine('  - the files under src/main/machines/ that name "send-keys" are [..]'), 'C66'],
    ['an unrelated line has no owner', ownerOfGateLine('  - something else broke'), null],
    // Phase 324 holds condition 100 and writes its clause first ("100a:"), so
    // its lines are never read as one of Phase 320.1's conditions, 101 to 112.
    ['a Phase 324 clause line is not one of these conditions', ownerOfGateLine('  - 100a: start() awaits something before its precheck'), null],
    ['gateRed reads only failure lines', [...gateRed('PASS\n  - condition 106: x\nnot a failure')].join(','), 'C106'],
    ['vitestRed reads failed cases by full name', [...vitestRed({ testResults: [{ assertionResults: [{ status: 'failed', fullName: 'P1, the hold (mustHold) holds a key' }, { status: 'passed', fullName: 'other' }] }] })].join(','), 'P1, the hold (mustHold) holds a key'],
    ['a RegExp owner matches a case name', ownerRed(/P1, the hold/, new Set(['P1, the hold (mustHold) holds a key'])), true],
    ['a tag owner is exact', ownerRed('C10', new Set(['C101'])), false],
    ['a RegExp owner that matches no red case is not red', ownerRed(/P2, the key fence/, new Set(['P1, the hold (mustHold) holds a key'])), false]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(cases.length)} fixtures` : 'self-test FAIL');
  return ok;
}

if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

const scratch = mkdtempSync(join('/private/tmp', `p320-ablation-${String(process.pid)}-`));

/**
 * Every check runs under a scratch HOME and ZDOTDIR inside the clone, and
 * without his Terminal tab's TERM_SESSION_ID (his ruling of 2026-10-02): a
 * suite that starts an interactive zsh then reads none of his rc files and
 * writes none of his history, whatever a later case adds. Node omits a key
 * whose value is `undefined` from a child's environment.
 */
const CHECK_HOME = join(scratch, 'home');
const CHECK_ENV = { ...process.env, HOME: CHECK_HOME, ZDOTDIR: CHECK_HOME, TERM_SESSION_ID: undefined };

function buildClone() {
  // `resources/` too: the gate's probe reads resources/gmux-tmux.conf.
  for (const name of ['src', 'build', 'resources']) {
    const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
  }
  // EVERY root config the two checks read: tsx resolves project references
  // out of tsconfig.json, and vitest reads its config and its aliases.
  for (const name of readdirSync(REPO)) {
    if (/^(?:package\.json|tsconfig(?:\.[a-z]+)?\.json|vitest\.config\.ts)$/.test(name)) {
      writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
    }
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
  mkdirSync(CHECK_HOME, { mode: 0o700 });
}

function runMachines() {
  const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-machines.mjs')], {
    cwd: scratch,
    encoding: 'utf8',
    env: CHECK_ENV,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000
  });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { code: r.status ?? 1, red: gateRed(text), text };
}

function runVitest(tests = TESTS) {
  const out = join(scratch, `vitest-${String(Date.now())}.json`);
  const present = tests.filter((t) => existsSync(join(scratch, t)));
  const r = spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...present],
    { cwd: scratch, encoding: 'utf8', env: CHECK_ENV, maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
  );
  let report = null;
  try {
    report = JSON.parse(readFileSync(out, 'utf8'));
  } catch {
    report = null;
  }
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const red = report === null ? new Set(['vitest printed no report']) : vitestRed(report);
  const missing = tests.filter((t) => !present.includes(t));
  return { code: r.status ?? 1, red, text, missing, total: report?.numTotalTests ?? 0 };
}

const CHECKS = { machines: runMachines, vitest: () => runVitest(TESTS), main: () => runVitest(MAIN_TESTS) };

/** Put one clone file back and prove it by sha256 against the worktree. */
function restore(rel) {
  const want = readFileSync(join(REPO, rel));
  writeFileSync(join(scratch, rel), want);
  const got = readFileSync(join(scratch, rel));
  if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
}

/** One replacement inside the clone; a function replacer for a string, so `$&` stays literal. */
function ablate(rel, from, to) {
  const path = join(scratch, rel);
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (from instanceof RegExp) {
    if (!from.test(text)) return false;
    writeFileSync(path, text.replace(from, to), 'utf8');
    return true;
  }
  if (!text.includes(from)) return false;
  writeFileSync(path, text.replace(from, () => to), 'utf8');
  return true;
}

let cleaned = false;
const clean = () => {
  if (cleaned) return;
  cleaned = true;
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp; not fatal */
  }
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    clean();
    process.exit(130);
  });
}

// The worktree's bytes for every file an entry touches, before anything runs,
// so the report can say the worktree was never written.
const touchedFiles = [...new Set(ABLATIONS.map((a) => a.file))];
/** An entry's edits: its one `from`/`to`, or its `edits`, every one of which must apply. */
const editsOf = (entry) => entry.edits ?? [{ from: entry.from, to: entry.to }];
const worktreeBefore = new Map(
  touchedFiles.map((f) => [f, existsSync(join(REPO, f)) ? sha(readFileSync(join(REPO, f))) : null])
);

const problems = [];
const table = [];
let ran = 0;
const started = Date.now();

try {
  buildClone();
  say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
  const only = (process.env['P320_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  const wanted = ABLATIONS.filter((a) => only.length === 0 || only.includes(a.n));
  const bases = {};
  for (const check of [...new Set(wanted.map((a) => a.check))]) {
    const base = CHECKS[check]();
    bases[check] = base;
    if ((check === 'vitest' || check === 'main') && base.missing.length > 0) {
      problems.push(`the suite(s) ${base.missing.join(', ')} are not there, so the renderer ablations have nothing to redden.`);
    }
    if (base.code === 0) {
      say(`base ${check}: green${check !== 'machines' ? `, ${String(base.total)} cases` : ''}`);
    } else {
      say(`base ${check}: ALREADY RED on ${[...base.red].slice(0, 8).join(', ') || 'nothing it could name, so it failed to run'}`);
      if (base.red.size === 0) {
        for (const line of base.text.split('\n').filter((l) => l.trim() !== '').slice(-6)) say(`  base: ${line.trim().slice(0, 240)}`);
      }
      if (process.env['P320_ALLOW_RED_BASE'] !== '1') {
        problems.push(`${check} was red before any ablation ran. Every reading below is still a DELTA against that base, but re-run with P320_ALLOW_RED_BASE=1 once you know why.`);
      }
    }
  }
  for (const entry of wanted) {
    const base = bases[entry.check];
    try {
      const unapplied = editsOf(entry).filter((edit) => !ablate(entry.file, edit.from, edit.to));
      if (unapplied.length > 0) {
        problems.push(
          `${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this entry moves with it in the same commit, or it is gone and its owner is unproven. It looked for: ${String(unapplied[0].from).slice(0, 200)}`
        );
        table.push([entry.n, String(entry.owner), 'SHAPE MISSING', '']);
        continue;
      }
      ran += 1;
      const out = CHECKS[entry.check]();
      const newlyRed = new Set([...out.red].filter((r) => !base.red.has(r)));
      const own = ownerRed(entry.owner, newlyRed);
      const shown = [...newlyRed].map((r) => r.slice(0, 70));
      table.push([entry.n, String(entry.owner).slice(0, 40), out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', shown.join(' | ').slice(0, 160)]);
      say(`${entry.n.padEnd(4)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ').slice(0, 240) || 'nothing'}`);
      if (out.code === 0 || newlyRed.size === 0) {
        problems.push(`${entry.n} "${entry.name}": ${entry.check} stayed GREEN. ${entry.why} Nothing notices, so ${String(entry.owner)} is decoration.`);
      } else if (!own) {
        problems.push(`${entry.n} "${entry.name}": ${entry.check} went red but ${String(entry.owner)} did not (red instead: ${shown.join(' | ') || 'nothing named'}).`);
      }
    } finally {
      restore(entry.file);
    }
  }
  for (const check of Object.keys(bases)) {
    const after = CHECKS[check]();
    if (after.code !== bases[check].code) {
      problems.push(`after every file was restored ${check} exited ${String(after.code)} where the base exited ${String(bases[check].code)}, so a restore did not land.`);
    } else {
      say(`restored: every touched clone file matches the worktree by sha256, and ${check} is back where it started (exit ${String(after.code)})`);
    }
  }
} catch (err) {
  problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  clean();
}

// The worktree was never written: every file an entry names has the bytes it had.
for (const [file, before] of worktreeBefore) {
  const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : null;
  if (now !== before) {
    problems.push(`${file} in the WORKTREE changed during the run (${String(before).slice(0, 12)} to ${String(now).slice(0, 12)}); this harness writes only its clone, so another process wrote it`);
  }
}

process.stdout.write('\n');
for (const [n, owner, verdict, red] of table) {
  process.stdout.write(`${TAG}   ${n.padEnd(5)} ${owner.padEnd(42)} ${verdict.padEnd(14)} ${red}\n`);
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length > 0) {
  process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS in ${seconds} s. ${String(ran)} ablations, one clause each, and every one reddened THE CONDITION OR CASE ` +
    'THAT OWNS IT, measured as a DELTA against the base. Every clone file was restored and proved by sha256, the ' +
    'worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no agent, no token.\n'
);
