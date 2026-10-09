#!/usr/bin/env node
/**
 * `npm run ablation:p342`. The attack on Phase 342's own gate: conditions 142
 * to 149 of `conformance:machines`, the three it re-pointed (102 and 109, and
 * 10's taxonomy), and the vitest cases that own what a plain probe cannot
 * reach (build/p342/SPEC.md §6.3).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. Phase 342 lets a person add
 * an ordinary Linux machine with the tmux its distribution ships, and what
 * stands between that and a server left at tmux's 2,000 lines, a refusal read
 * as "could not reach", a live connection opened across a pair that never
 * greets, a session renamed to a name tmux reads as flags, and a save that
 * leaves a `.tortie-part` is a set of clauses in main and in three far texts.
 * So this script breaks ONE CLAUSE AT A TIME in the shipping source and proves
 * it reddens THE CONDITION, OR THE CASE, THAT OWNS IT. An ablation that leaves
 * its owner green is a hole in the gate; one that reddens only something else
 * is printed as a finding about the gate rather than about the build.
 *
 * ## The checks it runs
 *
 *   machines  `node build/conformance-machines.mjs`. Every failure of 142 to
 *             149 (and 10, 40, 100, 102, 109) names its condition, so the
 *             owner is read off the line (build/p336/ablation.mjs's reader).
 *   renderer  the renderer suite that owns the chip (RENDERER_TESTS), read
 *             through vitest's JSON reporter by the full name of each case.
 *
 * ## It never writes into the working tree
 *
 * Three builders work in one worktree during this phase, so it is the
 * `ablation:p336` shape: a CLONE (`cp -Rc`, APFS clonefile) of `src/`, `build/`
 * and `resources/` under `/private/tmp/p342-ablation-<pid>-*`, the root configs
 * copied, `node_modules` symlinked, every check run there with that directory
 * as its cwd. Each edited file is put back and CHECKED BY SHA256 against the
 * worktree's bytes in a `finally` before the next arm, the clone is removed in
 * a `finally` and on SIGINT, SIGTERM and SIGHUP, and the worktree's own bytes
 * for every file an arm names are read before and after: a change is a
 * finding.
 *
 * ## It starts nothing but node
 *
 * No Electron, no tmux, no ssh, no Docker, no agent, no token and no network.
 * The gate it runs starts `/bin/sh` and `/bin/dash` over scratch trees it
 * removes itself (88g, 115 to 117, 127 to 138, 145, 146, 149), and vitest runs
 * its own workers and ends them. Every check runs under a scratch HOME and
 * ZDOTDIR inside the clone, HISTFILE=/dev/null and no TERM_SESSION_ID.
 *
 * ## The delta rule
 *
 * The base's red lines are recorded first and each arm must make its owner
 * NEWLY red, which proves the arm caused it and lets the harness run while a
 * sibling's half is not landed. A red base is reported and fails the run
 * unless `P342_ALLOW_RED_BASE=1` says the operator knows why. One CONTROL arm
 * edits a comment and must leave every check exactly where the base left it.
 *
 * Usage:
 *   node build/p342/ablation.mjs                      every arm
 *   node build/p342/ablation.mjs --list               the arms, run nothing
 *   node build/p342/ablation.mjs --self-test          the readers, run nothing
 *   P342_ONLY=b142a,b149c node build/p342/ablation.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gateRed, ownerOfGateLine, ownerRed, vitestRed } from '../p336/ablation.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p342-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const OPTIONS = 'src/main/tmux/server-options.ts';
const VERSION = 'src/main/tmux/version.ts';
const SERVER = 'src/main/machines/remote-server.ts';
const PREPARE = 'src/main/machines/prepare.ts';
const PLANE = 'src/main/machines/control-plane.ts';
const LEAF = 'src/main/machines/far-tmux.ts';
const READY = 'src/main/machines/ready-context.ts';
const RESTORE = 'src/main/machines/remote-restore.ts';
const REMOVAL = 'src/main/machines/removal.ts';
const IPC = 'src/main/machines/ipc.ts';
const CORE = 'src/main/sessions/core.ts';
const SCROLL = 'src/main/tmux/scroll.ts';
const SHAPES = 'src/main/machines/scroll-shapes.ts';
const SESSIONS = 'src/main/machines/remote-sessions.ts';
const SCREEN = 'src/main/machines/remote-screen.ts';
const SCRIPTS = 'src/main/machines/remote-scripts.ts';
const COPY = 'src/renderer/settings/machines-copy.ts';
const STATUS = 'src/renderer/settings/machine-status.ts';
const GATE = 'build/conformance-machines.mjs';
const STANDIN = 'build/p342/gnu-stat-standin.sh';

/** The renderer suite that owns the chip's arm (D18). */
export const RENDERER_TESTS = [
  'src/renderer/settings/__tests__/p340-machine-status.test.ts',
  // The fix round: Add a machine's last step draws the prepared answer's note.
  'src/renderer/settings/__tests__/p340-add-steps.test.tsx'
];

/**
 * PHASE 342'S SECOND FIX ROUND. The main-process suites that own a clause no
 * condition reads: the program read that reached nothing (the verifier's
 * ablation M5, which every gate left green), and the two the second fix round
 * added beside conditions 146's driven halves.
 */
export const MAIN_TESTS = [
  'src/main/machines/__tests__/p342-prepare.test.ts',
  'src/main/machines/__tests__/p342-remote-server-refusals.test.ts',
  'src/main/machines/__tests__/p342-far-names.test.ts'
];

/**
 * The arms of build/p342/SPEC.md §6.3, in its order, and one per clause the
 * gate reads that §6.3 did not name. `check` must go red; `owner` is what must
 * be NEWLY red in its output: a condition tag (`C142`) for the gate, a RegExp
 * over the full case names for vitest. An edit's `from` is an exact string
 * (replaced once) or a RegExp; an arm whose one clause spans two places carries
 * `edits`.
 */
export const ABLATIONS = [
  // ---------------------------------------------------------------- 142 the option table
  {
    n: 'b142a', check: 'machines', owner: 'C142', file: OPTIONS,
    name: 'history-limit written last again',
    why: 'a refusal of any later row would leave a machine at tmux’s 2,000 lines, 8 % of the depth Tortie promises (D4).',
    from: '  return [...first, ...rest];', to: '  return [...rest, ...first];'
  },
  {
    n: 'b142b', check: 'machines', owner: 'C142', file: OPTIONS,
    name: 'a fifth required row',
    why: 'status off refused would stop Prepare on a machine that loses nothing without it (D5).',
    from: "  { name: 'status', scope: '-g', value: 'off', oldest: '3.2a', without: { kind: 'skip' } },",
    to: "  { name: 'status', scope: '-g', value: 'off', oldest: '3.2a', without: { kind: 'required', purpose: 'scrolling' } },"
  },
  {
    n: 'b142c', check: 'machines', owner: 'C142', file: OPTIONS,
    name: "mode-style's fallback deleted",
    why: 'the four older versions would skip the style the colours alone took on all of them (D5).',
    from: "    without: { kind: 'fallback', value: 'bg=default,fg=default' }", to: "    without: { kind: 'skip' }"
  },
  {
    n: 'b142d', check: 'machines', owner: 'C142', file: OPTIONS,
    name: 'isOptionRefusal accepting a refusal that names another row',
    why: 'a refusal of one row would be read as the refusal of another, and the wrong row skipped (D6).',
    from: '  if (last === `invalid option: ${name}`) return true;', to: "  if (last.startsWith('invalid option: ')) return true;"
  },
  {
    n: 'b142e', check: 'machines', owner: 'C142', file: OPTIONS,
    name: 'isOptionRefusal accepting no server running',
    why: 'a server that went away mid set-up would be read as a refused option and skipped (D6).',
    from: '  if (last === undefined) return false;', to: "  if (last === undefined) return false;\n  if (/no server running/.test(last)) return true;"
  },
  {
    n: 'b142f', check: 'machines', owner: 'C142', file: OPTIONS,
    name: 'a quiet flag on set-option',
    why: 'tmux’s -q hides a missing name and not a bad value, and hides a fact about the machine either way (D6).',
    from: "  return ['set-option', row.scope, row.name, value];", to: "  return ['set-option', '-q', row.scope, row.name, value];"
  },
  // ---------------------------------------------------------------- 143 the rows
  {
    n: 'b143a', check: 'machines', owner: 'C143', file: VERSION,
    name: "the 3.3a row's lacks missing mode-style",
    why: 'a measured refusal would be read as unexpected and the prepared detail would gain a sentence on a version that works (D7).',
    from: "    lacks: ['copy-mode-position-format', 'mode-style']", to: "    lacks: ['copy-mode-position-format']"
  },
  {
    n: 'b143b', check: 'machines', owner: 'C143', file: VERSION,
    name: 'programs added to the 3.6 row',
    why: 'a pair gate on 3.6 refuses the rolling upgrade that works today (D2, §12).',
    from: "    version: '3.6',\n    measured: { exec: true, control: true },",
    to: "    version: '3.6',\n    measured: { exec: true, control: true },\n    programs: ['3.6'],"
  },
  {
    n: 'b143c', check: 'machines', owner: 'C143', file: COPY,
    name: 'the drawn list one version short',
    why: 'the Add Machine sheet would say Tortie has not measured a version it has (D17).',
    from: "  '3.2a',\n", to: ''
  },
  // ---------------------------------------------------------------- 144 the pair
  {
    n: 'b144a', check: 'machines', owner: 'C144', file: VERSION,
    name: "3.5a added to the 3.4 row's programs",
    why: 'a pair nobody measured would be admitted because its number looks close (D2, D19).',
    from: "    programs: ['3.4'],", to: "    programs: ['3.4', '3.5a'],"
  },
  {
    n: 'b144b', check: 'machines', owner: 'C144', file: PLANE,
    name: 'a -V read in the precheck',
    why: 'a read in the precheck is a fourth statement condition 100b refuses and a second reader of the program (§Attack F1).',
    from: '      const ctx = remoteContextFor(machineId);\n', to: "      const ctx = remoteContextFor(machineId);\n      void ['-V'];\n"
  },
  {
    n: 'b144c', check: 'machines', owner: 'C144', file: PLANE,
    name: 'openControlPlane reading the program itself',
    why: 'an execRemoteShell caller outside condition 40’s five files, and a second program read (§Attack F1).',
    from: '  const gate = decideRemoteControlGate(version);\n  if (gate.kind !== \'measured\') {',
    to: "  if (version === '') void execRemoteShell(remoteContextFor(machineId), 'tmux -V');\n  const gate = decideRemoteControlGate(version);\n  if (gate.kind !== 'measured') {"
  },
  {
    n: 'b144d', check: 'machines', owner: 'C144', file: PLANE,
    name: "the leaf's consult taken out of assertControlDialectMeasured",
    why: 'a reconnect on the client’s own backoff would open a live connection across a refused pair (D3).',
    from: '  if (farPairBlocksLive(machineId)) {\n    throw gmuxError(', to: '  if (false) {\n    throw gmuxError('
  },
  {
    n: 'b144e', check: 'machines', owner: 'C144', file: LEAF,
    name: 'a verdict answered for a server version other than its own',
    why: 'a refusal about a server that restarted at a new version would keep the live connection off for the rest of the run (§Attack F2).',
    // Re-pointed in the fix round: `farSettingsRefusal` now ends in the same
    // return, so the arm names farPairOf's own line by its neighbour.
    from: '  const record = pairs.get(machineId);\n  if (record === undefined) return null;\n  return serverVersions.get(machineId) === record.server ? record : null;',
    to: '  const record = pairs.get(machineId);\n  if (record === undefined) return null;\n  return record;'
  },
  {
    n: 'b144f', check: 'machines', owner: 'C144', file: READY,
    name: 'assertFarPairUsable asked in readyRemoteContext',
    why: 'the Explorer, saving and every read would be refused for nothing on a machine they work on (D4b).',
    from: 'export function readyRemoteContext(machineId: string): RemoteMachineContext {\n',
    to: 'export function readyRemoteContext(machineId: string): RemoteMachineContext {\n  assertFarPairUsable(machineId);\n'
  },
  {
    n: 'b144g', check: 'machines', owner: 'C144', file: RESTORE,
    name: "the restore's ask moved before its ensureRemoteServer",
    why: 'a restore after a reboot would be refused by a verdict about the server that is gone (§Attack F4).',
    edits: [
      { from: '  assertFarPairUsable(machineId);\n', to: '' },
      // Re-pointed in the fix round: the restore's set-up answers a refusal
      // through throwAsSessionError now.
      { from: '  const server = await ensureRemoteServer(ctx).catch(throwAsSessionError);\n', to: '  assertFarPairUsable(machineId);\n  const server = await ensureRemoteServer(ctx).catch(throwAsSessionError);\n' }
    ]
  },
  {
    n: 'b144h', check: 'machines', owner: 'C144', file: REMOVAL,
    name: 'forgetFarTmux dropped from removal',
    why: 'a removed machine’s pair verdict would refuse the next machine added under its id (D24).',
    from: '  forgetFarTmux(machineId);\n', to: ''
  },
  {
    n: 'b144i', check: 'machines', owner: 'C144', file: CORE,
    name: 'the launch sign-in marking a program-refused machine quiet again',
    why: 'every row of a machine that answered would read unknown and "did not answer" (§Attack F3).',
    from: "          if (result.class !== 'program-refused') markMachineQuiet(row.id);", to: '          markMachineQuiet(row.id);'
  },
  {
    n: 'b144j', check: 'machines', owner: 'C144', file: LEAF,
    name: 'the leaf importing a module that could import it back',
    why: 'a leaf that imports the machines domain can cycle, and anything may ask it (D24).',
    from: "import { gmuxError } from '../errors';", to: "import { gmuxError } from '../errors';\nimport { getLog } from '../log';\nvoid getLog;"
  },
  {
    n: 'b144k', check: 'machines', owner: 'C144', file: PREPARE,
    name: "the pair read on every warm server, not only a row's with programs",
    why: 'a machine that works today would be sent one more exec at every Prepare (D3).',
    from: '    if (row?.programs !== undefined) {', to: '    if (row !== undefined) {'
  },
  // ---------------------------------------------------------------- 145 the born server
  {
    n: 'b145a', check: 'machines', owner: 'C145', file: SERVER,
    name: 'the born re-read removed',
    why: 'a server whose version is not the one its program said would be set up as the version it is not (D9).',
    from: "    const printed = await execOn(ctx, ['display-message', '-p', '#{version}']);\n    stillRouted();\n    const ran = parseTmuxVersion(printed);",
    to: '    const ran = null as string | null;'
  },
  {
    n: 'b145b', check: 'machines', owner: 'C145', file: SERVER,
    name: 'the born re-read made only when how.version is given',
    why: 'a restore or a create that boots a server would leave a verdict about the server that is gone (§Attack F4).',
    from: "    const printed = await execOn(ctx, ['display-message', '-p', '#{version}']);",
    to: "    const printed = how.version === undefined || how.version === null ? '' : await execOn(ctx, ['display-message', '-p', '#{version}']);"
  },
  // ---------------------------------------------------------------- 146 the refusal path
  {
    n: 'b146a', check: 'machines', owner: 'C146', file: SERVER,
    name: 'a refusal thrown as any failure',
    why: 'every older version would stop Prepare at its first refused option, as before this phase (D6).',
    from: '    if (isOptionRefusal(said, row.name, value)) return false;', to: ''
  },
  {
    n: 'b146b', check: 'machines', owner: 'C146', file: SERVER,
    name: 'the read-back walking the write order',
    why: 'the row’s settings list would read history-limit first on every machine (D4).',
    from: '  for (const row of SERVER_OPTIONS) {\n    if (skipped.has(row.name)) continue;', to: '  for (const row of remoteBootOptions()) {\n    if (skipped.has(row.name)) continue;'
  },
  {
    n: 'b146c', check: 'machines', owner: 'C146', file: PREPARE,
    name: "Prepare asking the taxonomy before it asks for RemoteTmuxRefused",
    why: 'a refusal would be read as a machine Tortie could not reach, which it had reached (D6, D10).',
    from: '    if (err instanceof RemoteTmuxRefused) {', to: '    if (classOfFailure(err) === \'program-refused\' && err instanceof RemoteTmuxRefused) {'
  },
  // ---------------------------------------------------------------- 146, the fix round
  // The verifier's two majors and four minors, one clause each, every one
  // owned by condition 146 (widened in the fix round) or by the renderer case
  // that draws the note.
  {
    n: 'b146d', check: 'machines', owner: 'C146', file: SERVER,
    name: 'a required refusal thrown without being recorded',
    why: 'a create that carries no names never runs the set-up again, so a session would start on the server Prepare said it would not use (major 1).',
    from: '  noteFarSettingsRefused(ctx.machineId, {\n    server: refusal.version,\n    name: refusal.name,\n    sentence: err.message\n  });\n',
    to: ''
  },
  {
    n: 'b146e', check: 'machines', owner: 'C146', file: SERVER,
    name: 'a required row read back as another value let through',
    why: 'a tmux that took history-limit and kept 2,000 would read Ready and say nothing (minor).',
    from: '  if (notKept !== null) {\n    refuseRequired(', to: '  if (notKept === undefined) {\n    refuseRequired('
  },
  {
    n: 'b146f', check: 'machines', owner: 'C146', file: SERVER,
    name: "exit-empty's refusal on the boot line thrown as a failure the taxonomy cannot place",
    why: 'it would read "could not reach" with the raw error, the ssh command line, in the hover (minor).',
    from: "      if (stays !== undefined && stays.without.kind === 'required' && isOptionRefusal(said, stays.name, stays.value)) {",
    to: "      if (stays !== undefined && stays.without.kind === 'required' && isOptionRefusal(said, stays.name, stays.value) && said === '') {"
  },
  {
    n: 'b146g', check: 'machines', owner: 'C146', file: SERVER,
    name: 'a set-up that holds every row clears nothing',
    why: 'a machine whose server was fixed would refuse every create for the rest of the run.',
    from: '  noteFarSettingsHeld(ctx.machineId);\n  return { born, remotePath, options, disagreed, refused };',
    to: '  return { born, remotePath, options, disagreed, refused };'
  },
  {
    n: 'b146h', check: 'machines', owner: 'C146', file: SESSIONS,
    name: 'the create no longer asks the recorded refusal',
    why: 'a session would start on a server missing remain-on-exit and history-limit, which Prepare promised it would not (major 1).',
    from: '  assertFarSettingsHeld(input.machineId);\n', to: ''
  },
  {
    n: 'b146i', check: 'machines', owner: 'C146', file: CORE,
    name: 'the attach asking the recorded refusal too',
    why: 'an attach opens a session already running there; refusing it would hide his running work, worse than today (decision 1).',
    edits: [
      { from: "import { assertFarPairUsable } from '../machines/far-tmux';", to: "import { assertFarPairUsable, assertFarSettingsHeld } from '../machines/far-tmux';" },
      { from: '    assertFarPairUsable(remote.machineId);\n', to: '    assertFarPairUsable(remote.machineId);\n    assertFarSettingsHeld(remote.machineId);\n' }
    ]
  },
  {
    n: 'b146j', check: 'machines', owner: 'C146', file: SESSIONS,
    name: "the create's set-up refusal thrown as the plain error",
    why: 'it reached a person as Electron\'s prefix and the class name in front of the sentence (minor).',
    from: '  if (passthrough.length > 0) await ensureRemoteServer(ctx).catch(throwAsSessionError);', to: '  if (passthrough.length > 0) await ensureRemoteServer(ctx);'
  },
  {
    n: 'b146k', check: 'machines', owner: 'C146', file: RESTORE,
    name: "the restore's set-up refusal thrown as the plain error",
    why: 'a Restore read "Error invoking remote method \'sessions:restore\': RemoteTmuxRefused: …" (minor).',
    from: '  const server = await ensureRemoteServer(ctx).catch(throwAsSessionError);', to: '  const server = await ensureRemoteServer(ctx);'
  },
  {
    n: 'b146l', check: 'machines', owner: 'C146', file: SERVER,
    name: 'throwAsSessionError handing the refusal back unchanged',
    why: 'every caller would draw the plain error again (minor).',
    from: '  if (err instanceof RemoteTmuxRefused) {\n    throw gmuxError(', to: '  if (err instanceof RemoteServerSetUpStopped) {\n    throw gmuxError('
  },
  {
    n: 'b146m', check: 'machines', owner: 'C146', file: PREPARE,
    name: "Prepare drawing a gmux error's payload as the hover again",
    why: 'the JSON, the ssh command line inside it, would be the row\'s hover (minor).',
    from: "      detail: payload !== null && payload.code !== 'UNKNOWN' ? payload.message : copy.detail,",
    to: '      detail: err instanceof GmuxError ? sentenceOf(err) : copy.detail,'
  },
  {
    n: 'b146n', check: 'machines', owner: 'C146', file: PREPARE,
    name: 'a server that is not the version it says drawn as the version it claimed',
    why: 'the row\'s facts would name the version the sentence under it says is false (nit).',
    from: "        version: err.refusal.kind === 'disagrees' ? err.refusal.ran : version,", to: '        version,'
  },
  {
    n: 'b146o', check: 'machines', owner: 'C146', file: PREPARE,
    name: "the prepared answer carrying no note",
    why: 'sentence (2) would again be drawn nowhere a person reads a Ready machine (minor).',
    from: '      durationMs: Date.now() - startedAt,\n      note\n    };', to: '      durationMs: Date.now() - startedAt\n    };'
  },
  // ---------------------------------------------------------------- 146, the second fix round
  // The verifier's three minors, one clause each: a required row refused in
  // other words (read back once), a create after the boot line's refusal, and
  // the program read that reached nothing, which every gate left green.
  {
    n: 'b146p', check: 'machines', owner: 'C146', file: SERVER,
    name: 'a required row refused in other words never read back',
    why: 'the chip would read Ready and a create start a session on a server whose remain-on-exit reads off (the second fix round).',
    from: '  if (machineClassOf(err) !== null) return;\n', to: '  if (machineClassOf(err) !== null || err !== null) return;\n'
  },
  {
    n: 'b146q', check: 'main', owner: /a taxonomy class placed is never read back/, file: SERVER,
    name: 'a classed failure read back as if the server had answered',
    why: 'a dropped link proves nothing about the option, and a read after it would refuse a machine that is fine.',
    from: '  if (machineClassOf(err) !== null) return;\n', to: ''
  },
  {
    n: 'b146r', check: 'machines', owner: 'C146', file: SESSIONS,
    name: "the start door no longer asking the recorded refusal",
    why: 'a create after the boot line refused exit-empty would say "has not signed in" again (the second fix round).',
    from: '    assertFarSettingsHeld(machineId);\n    assertFarVersionAgrees(machineId);\n    throw err;', to: '    assertFarVersionAgrees(machineId);\n    throw err;'
  },
  {
    n: 'b146u', check: 'machines', owner: 'C146', file: SESSIONS,
    name: 'the start door no longer asking the recorded disagreement',
    why: 'a create after a server Tortie started ran as another version than its program said would say "has not signed in" (the second fix round).',
    from: '    assertFarSettingsHeld(machineId);\n    assertFarVersionAgrees(machineId);\n    throw err;', to: '    assertFarSettingsHeld(machineId);\n    throw err;'
  },
  {
    n: 'b146s', check: 'main', owner: /a create answers sentence \(1\), never "has not signed in"/, file: SESSIONS,
    name: 'the create reaching its context through readyRemoteContext again',
    why: 'the create would say "Tortie has not signed in to that machine yet" of a machine it signed in to (the second fix round).',
    from: '  const ctx = readyContextToStart(input.machineId);', to: '  const ctx = readyRemoteContext(input.machineId);'
  },
  {
    n: 'b146t', check: 'main', owner: /a restore answers sentence \(1\) too/, file: RESTORE,
    name: 'the restore reaching its context through readyRemoteContext again',
    why: 'a restore there would say "has not signed in" too (the second fix round).',
    from: '  const ctx = readyContextToStart(machineId);', to: '  const ctx = readyRemoteContext(machineId);'
  },
  {
    n: 'b145x', check: 'machines', owner: 'C145', file: SERVER,
    name: 'a born disagreement not remembered',
    why: 'the next Prepare of that warm server would say the lying program was updated and that a restart will fix it (the second fix round, the nit).',
    from: '      if (said !== null) noteFarDisagreement(ctx.machineId, said, ran);\n', to: ''
  },
  {
    n: 'b145y', check: 'main', owner: /says sentence \(4\) and the version it runs, never the update sentence/, file: PREPARE,
    name: "Prepare's pair arm never asking whether the program lied",
    why: 'a program that lies about its version would be said as updated under running sessions (the second fix round, the nit).',
    from: '      const lies = farPairIsDisagreement(input.machineId);', to: '      const lies = false;'
  },
  {
    n: 'b144x', check: 'main', owner: /reached nothing records no verdict and blocks nothing/, file: PREPARE,
    name: 'a program read that reached nothing recorded as unreadable',
    why: 'one blip would keep a machine whose pair is fine off its live connection for the rest of the run (the verifier\'s M5, green on every gate).',
    from: '            `two: ${program.detail}`\n        );\n      } else {',
    to: '            `two: ${program.detail}`\n        );\n        noteFarPair(input.machineId, read.version, null);\n      } else {'
  },
  {
    n: 'b018b', check: 'renderer', owner: /carrying a note draws it after the Ready hover/, file: STATUS,
    name: "the Ready hover dropping the sign-in's note",
    why: 'the row would read Ready with nothing about the refused setting (minor).',
    from: "      typeof note === 'string' && note.trim() !== '' ? `${hover} ${note}` : hover,", to: '      hover,'
  },
  {
    n: 'b018c', check: 'renderer', owner: /note under the ready line/, file: 'src/renderer/settings/AddMachine.tsx',
    name: "Add a machine's last step dropping the note",
    why: 'the person who just added the machine would never read sentence (2) (minor).',
    from: "          {typeof result?.note === 'string' && result.note.trim() !== '' ? (", to: '          {false ? ('
  },
  // ---------------------------------------------------------------- 147 scroll-back's entry
  {
    n: 'b147a', check: 'machines', owner: 'C147', file: SCROLL,
    name: "enterCopyModeArgs answering -H for this Mac's runner",
    why: 'this Mac’s scroll would move, and it is byte for byte today’s (D20).',
    from: "    ? ['copy-mode', '-e', '-t', target]", to: "    ? ['copy-mode', '-e', '-H', '-t', target]"
  },
  {
    n: 'b147b', check: 'machines', owner: 'C147', file: SHAPES,
    name: 'the table keeping the four-element entry',
    why: 'a machine’s copy mode would be entered without -H, and on 3.2a to 3.5a tmux’s position box would sit on the top row (D8 b, D11).',
    from: "    argv: [word('copy-mode'), word('-e'), word('-H'), word('-t'), TARGET],", to: "    argv: [word('copy-mode'), word('-e'), word('-t'), TARGET],"
  },
  {
    n: 'b109a', check: 'machines', owner: 'C109', file: GATE,
    name: "condition 109's spellers list left at two files",
    why: 'the re-pointing is required: with it undone the gate reads scroll.ts’s one -H as a third speller (§Attack F12).',
    from: "JSON.stringify(['src/main/machines/scroll-shapes.ts', 'src/main/screen/keys.ts', 'src/main/tmux/scroll.ts'])",
    to: "JSON.stringify(['src/main/machines/scroll-shapes.ts', 'src/main/screen/keys.ts'])"
  },
  // ---------------------------------------------------------------- 148 names and quirks
  {
    n: 'b148a', check: 'machines', owner: 'C148', file: SESSIONS,
    name: 'farTmuxName keeping $',
    why: 'on 3.2a to 3.4 the create’s own confirmation misses the session it just made (D12).',
    from: "  return dedupeSessionName(sanitizeSessionName(display).replace(/\\$/g, '_'), taken);", to: '  return dedupeSessionName(sanitizeSessionName(display), taken);'
  },
  {
    n: 'b148b', check: 'machines', owner: 'C148', file: SESSIONS,
    name: 'farTmuxName mapping $ to -',
    why: 'a rename to "$HOME notes" would be read as flags by rename-session on every version (§Attack M-A4).',
    from: "  return dedupeSessionName(sanitizeSessionName(display).replace(/\\$/g, '_'), taken);", to: "  return dedupeSessionName(sanitizeSessionName(display).replace(/\\$/g, '-'), taken);"
  },
  {
    n: 'b148c', check: 'machines', owner: 'C148', file: SESSIONS,
    name: 'undoDollarEscape applied without the quirk',
    why: 'a backslash a value really holds would be removed on every other version (D13).',
    from: '    const parsed = dollarOnRead ? withDollarUndone(listed) : listed;', to: '    const parsed = withDollarUndone(listed);'
  },
  {
    n: 'b148d', check: 'machines', owner: 'C148', file: SCREEN,
    name: "stripJoinedPadding applied to the phone's far screen read",
    why: 'the screen read is not a joined capture and keeps a line’s own spaces (D14).',
    from: "import { readyRemoteContext } from './ready-context';", to: "import { readyRemoteContext } from './ready-context';\nimport { stripJoinedPadding } from './remote-capsule';\nvoid stripJoinedPadding('');"
  },
  // ---------------------------------------------------------------- 149 the far scripts
  {
    n: 'b149a', check: 'machines', owner: 'C149', file: SCRIPTS,
    name: "file-put's mode read BSD first again",
    why: 'every save over an existing file on Linux ends with no answer and a .tortie-part left (§1 item 2).',
    from: '  \'  if [ "$wq" = -c ]; then m=$(stat -c %a "$f" 2>/dev/null || true); else m=$(stat -f %Lp "$f" 2>/dev/null || true); fi\',',
    to: '  \'  m=$(stat -f %Lp "$f" 2>/dev/null || true)\',\n  \'  if [ -z "$m" ]; then m=$(stat -c %a "$f" 2>/dev/null || true); fi\','
  },
  {
    n: 'b149b', check: 'machines', owner: 'C149', file: SCRIPTS,
    name: "dir-new's mode read BSD first again",
    why: 'every New Folder on Linux is made 700 and answers what main cannot read (§1 item 2).',
    from: '  \'if [ "$wq" = -c ]; then m=$(stat -c %a "$p" 2>/dev/null || true); else m=$(stat -f %Lp "$p" 2>/dev/null || true); fi\',',
    to: '  \'m=$(stat -f %Lp "$p" 2>/dev/null || true)\',\n  \'if [ -z "$m" ]; then m=$(stat -c %a "$p" 2>/dev/null || true); fi\','
  },
  {
    n: 'b149c', check: 'machines', owner: 'C149', file: SCRIPTS,
    name: "store-list's two finds back in the BSD order",
    why: 'five lines of file-system status per file reach the payload on Linux (D15).',
    edits: [
      { from: "  '  o=$({ find \"$1\" -maxdepth \"$2\" -type f -exec stat -c \\'%Y %s %n\\' {} + 2>/dev/null ||',", to: "  '  o=$({ find \"$1\" -maxdepth \"$2\" -type f -exec stat -f \\'%m %z %N\\' {} + 2>/dev/null ||'," },
      { from: "  '    find \"$1\" -maxdepth \"$2\" -type f -exec stat -f \\'%m %z %N\\' {} + 2>/dev/null ||',", to: "  '    find \"$1\" -maxdepth \"$2\" -type f -exec stat -c \\'%Y %s %n\\' {} + 2>/dev/null ||'," }
    ]
  },
  {
    n: 'b149d', check: 'machines', owner: 'C149', file: SCRIPTS,
    name: "ENTRY_RENAME's pair read by the wq spelling",
    why: 'the real identity sends two names of one file to mv, which GNU refuses with no answer where today answers exists (§Attack F9).',
    // The text stands inside a TypeScript double-quoted string, so the source
    // spells each of its quotes as a backslash and a quote.
    from: '  a=$(stat -f \'%d %i\' \\"$s\\" 2>/dev/null || true)', to: '  a=$(stat \\"$wq\\" \'%d %i\' \\"$s\\" 2>/dev/null || true)'
  },
  {
    n: 'b149e', check: 'machines', owner: 'C149', file: STANDIN,
    name: "the GNU stand-in's -f printing nothing",
    why: 'a stand-in that answers GNU’s -f quietly would pass the BSD-first texts too, so the self-test must catch it.',
    from: "        printf '  File: \"%s\"\\n' \"$f\"\n", to: ''
  },
  // ---------------------------------------------------------------- 10 the taxonomy, and the chip
  {
    n: 'b010a', check: 'machines', owner: 'C10', file: 'src/main/machines/errors.ts',
    name: 'program-refused said as could not reach',
    why: 'the defect this phase removes: a machine that answered told it could not be reached (D10).',
    from: "    headline: \"Tortie will not use this machine's tmux as it is.\",", to: "    headline: 'Tortie could not reach this machine.',"
  },
  {
    n: 'b018a', check: 'renderer', owner: /program-refused/, file: STATUS,
    name: "the program-refused chip arm moved after the Ready arm",
    why: 'a machine whose program was replaced beside its server would read Ready (§Attack F10).',
    edits: [
      { from: "  if (signInClass === 'program-refused') {\n    return status('not-usable', firstSentence(signInSentence(signIn)), null);\n  }\n", to: '' },
      {
        from: '  // THE HOVER SAYS WHAT THE CHIP SAYS',
        to: "  if (signInClass === 'program-refused') {\n    return status('not-usable', firstSentence(signInSentence(signIn)), null);\n  }\n  // THE HOVER SAYS WHAT THE CHIP SAYS"
      }
    ]
  },
  // ---------------------------------------------------------------- the control
  {
    n: 'b000c', check: 'machines', owner: null, file: OPTIONS, control: true,
    name: 'CONTROL: a comment edited',
    why: 'a gate that reddens on a comment is reading the wrong thing.',
    from: '/** The six refusals of a value, each followed by the value tmux was sent. */', to: '/** The six refusals of a value, each followed by the value tmux was sent (a control edit). */'
  }
];

/** Condition 10's lines carry no number; it is read by its words. */
export function ownerOf342Line(line) {
  const n = ownerOfGateLine(line);
  if (n !== null) return n;
  if (/^\s*-\s*condition 10:/.test(line) || /the failure taxonomy is a different set/.test(line)) return 'C10';
  return null;
}

/** The red owners of one gate run, by condition, condition 10 included. */
export function gateRed342(text) {
  const red = new Set();
  for (const line of String(text).split('\n')) {
    if (!/^\s*-\s/.test(line)) continue;
    red.add(ownerOf342Line(line) ?? `other:${line.trim().slice(2, 62)}`);
  }
  return red;
}

function selfTest() {
  const cases = [
    ['a numbered line is its condition', ownerOf342Line('  - condition 146: the 3.2a row skipped'), 'C146'],
    ['the load line is condition 142', ownerOf342Line('  - condition 142 to 149: Phase 342 cannot be judged'), 'C142'],
    ['condition 10 is read by its number', ownerOf342Line('  - condition 10: program-refused is alarming'), 'C10'],
    ['condition 10 is read by its words', ownerOf342Line('  - the failure taxonomy is a different set from the one this gate knows.'), 'C10'],
    ['an unnumbered line has no owner', ownerOf342Line('  - write script file-put does not carry'), null],
    ['gateRed342 reads only failure lines', [...gateRed342('PASS\n  - condition 149: x\nnot a failure')].join(','), 'C149'],
    ['the p336 readers agree on a numbered line', [...gateRed('  - condition 145: y')].join(','), 'C145'],
    ['vitestRed reads failed cases by full name', [...vitestRed({ testResults: [{ assertionResults: [{ status: 'failed', fullName: 'program-refused a' }] }] })].join(','), 'program-refused a'],
    ['every arm names a check this file runs', ABLATIONS.every((a) => ['machines', 'renderer', 'main'].includes(a.check)), true],
    ['every arm id is unique', new Set(ABLATIONS.map((a) => a.n)).size === ABLATIONS.length, true],
    ['every condition 142 to 149 owns an arm', [142, 143, 144, 145, 146, 147, 148, 149].every((n) => ABLATIONS.some((a) => a.owner === `C${String(n)}`)), true],
    ['exactly one control arm', ABLATIONS.filter((a) => a.control === true).length, 1]
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

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsProgram && process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
if (runAsProgram && process.argv.includes('--list')) {
  for (const a of ABLATIONS) {
    process.stdout.write(`${a.n.padEnd(7)} ${String(a.owner instanceof RegExp ? `${a.check}: /${a.owner.source}/` : (a.owner ?? 'none, a control')).padEnd(30)} ${a.file}\n        ${a.name}\n`);
  }
  process.stdout.write(`\n${String(ABLATIONS.length)} arms. Nothing was run.\n`);
  process.exit(0);
}
if (runAsProgram) await runAblations();

async function runAblations() {
  const scratch = mkdtempSync(join('/private/tmp', `p342-ablation-${String(process.pid)}-`));
  const CHECK_HOME = join(scratch, 'home');
  const CHECK_ENV = { ...process.env, HOME: CHECK_HOME, ZDOTDIR: CHECK_HOME, HISTFILE: '/dev/null', TERM_SESSION_ID: undefined };

  const buildClone = () => {
    for (const name of ['src', 'build', 'resources']) {
      const r = spawnSync('cp', ['-Rc', join(REPO, name), join(scratch, name)], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`cp -Rc ${name} failed: ${r.stderr}`);
    }
    for (const name of readdirSync(REPO)) {
      if (/^(?:package\.json|tsconfig(?:\.[a-z]+)?\.json|vitest\.config\.ts)$/.test(name)) writeFileSync(join(scratch, name), readFileSync(join(REPO, name)));
    }
    symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
    mkdirSync(CHECK_HOME, { mode: 0o700 });
  };
  const runMachines = () => {
    const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-machines.mjs')], {
      cwd: scratch,
      encoding: 'utf8',
      env: CHECK_ENV,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000
    });
    const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    return { code: r.status ?? 1, red: gateRed342(text), text };
  };
  const runVitest = (tests) => {
    const out = join(scratch, `vitest-${String(Date.now())}.json`);
    const present = tests.filter((t) => existsSync(join(scratch, t)));
    const r = spawnSync(process.execPath, [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', '--reporter=json', `--outputFile=${out}`, ...present], {
      cwd: scratch,
      encoding: 'utf8',
      env: CHECK_ENV,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000
    });
    let report = null;
    try {
      report = JSON.parse(readFileSync(out, 'utf8'));
    } catch {
      report = null;
    }
    const red = report === null ? new Set(['vitest printed no report']) : vitestRed(report);
    return { code: r.status ?? 1, red, text: `${r.stdout ?? ''}${r.stderr ?? ''}`, missing: tests.filter((t) => !present.includes(t)), total: report?.numTotalTests ?? 0 };
  };
  const CHECKS = { machines: runMachines, renderer: () => runVitest(RENDERER_TESTS), main: () => runVitest(MAIN_TESTS) };
  const restore = (rel) => {
    const want = readFileSync(join(REPO, rel));
    writeFileSync(join(scratch, rel), want);
    const got = readFileSync(join(scratch, rel));
    if (sha(got) !== sha(want)) throw new Error(`${rel} did not restore: sha256 ${sha(got)} against ${sha(want)}`);
  };
  /** One replacement inside the clone; a function replacer, so `$&` stays literal. */
  const ablate = (rel, from, to) => {
    const path = join(scratch, rel);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, 'utf8');
    if (from instanceof RegExp ? !from.test(text) : !text.includes(from)) return false;
    writeFileSync(path, text.replace(from, () => to), 'utf8');
    return true;
  };
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

  const editsOf = (entry) => entry.edits ?? [{ from: entry.from, to: entry.to }];
  const touched = [...new Set(ABLATIONS.map((a) => a.file))];
  const worktreeBefore = new Map(touched.map((f) => [f, existsSync(join(REPO, f)) ? sha(readFileSync(join(REPO, f))) : null]));
  const problems = [];
  const table = [];
  let ran = 0;
  const started = Date.now();
  try {
    buildClone();
    say(`clone at ${scratch}, node_modules symlinked, nothing under a home touched`);
    const only = (process.env['P342_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
    const wanted = ABLATIONS.filter((a) => only.length === 0 || only.includes(a.n));
    const bases = {};
    for (const check of [...new Set(wanted.map((a) => a.check))]) {
      const base = CHECKS[check]();
      bases[check] = base;
      if (check !== 'machines' && base.missing.length > 0) problems.push(`the suite(s) ${base.missing.join(', ')} are not there, so those arms have nothing to redden.`);
      if (base.code === 0) say(`base ${check}: green${check !== 'machines' ? `, ${String(base.total)} cases` : ''}`);
      else {
        say(`base ${check}: ALREADY RED on ${[...base.red].slice(0, 8).join(', ') || 'nothing it could name, so it failed to run'}`);
        if (process.env['P342_ALLOW_RED_BASE'] !== '1') problems.push(`${check} was red before any arm ran. Every reading below is still a DELTA against that base, but re-run with P342_ALLOW_RED_BASE=1 once you know why.`);
      }
    }
    for (const entry of wanted) {
      const base = bases[entry.check];
      try {
        const unapplied = editsOf(entry).filter((edit) => !ablate(entry.file, edit.from, edit.to));
        if (unapplied.length > 0) {
          problems.push(`${entry.n} "${entry.name}": the shape to ablate is not in ${entry.file}. Either the clause moved, and this arm moves with it in the same commit, or it is gone and its owner is unproven. It looked for: ${String(unapplied[0].from).slice(0, 200)}`);
          table.push([entry.n, String(entry.owner), 'SHAPE MISSING', '']);
          continue;
        }
        ran += 1;
        const out = CHECKS[entry.check]();
        const newlyRed = new Set([...out.red].filter((r) => !base.red.has(r)));
        const shown = [...newlyRed].map((r) => r.slice(0, 70));
        if (entry.control === true) {
          table.push([entry.n, 'control', newlyRed.size === 0 ? 'unmoved' : 'MOVED', shown.join(' | ').slice(0, 160)]);
          say(`${entry.n.padEnd(7)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ') || 'nothing'}`);
          if (newlyRed.size > 0) problems.push(`${entry.n} "${entry.name}": a comment edit reddened ${shown.join(' | ')}. ${entry.why}`);
          continue;
        }
        const own = ownerRed(entry.owner, newlyRed);
        table.push([entry.n, String(entry.owner).slice(0, 30), out.code === 0 ? 'GREEN' : own ? 'red' : 'RED ELSEWHERE', shown.join(' | ').slice(0, 160)]);
        say(`${entry.n.padEnd(7)} ${entry.name}: exit ${String(out.code)}, newly red ${shown.join(' | ').slice(0, 240) || 'nothing'}`);
        if (out.code === 0 || newlyRed.size === 0) problems.push(`${entry.n} "${entry.name}": ${entry.check} stayed GREEN. ${entry.why} Nothing notices, so ${String(entry.owner)} is decoration.`);
        else if (!own) problems.push(`${entry.n} "${entry.name}": ${entry.check} went red but ${String(entry.owner)} did not (red instead: ${shown.join(' | ') || 'nothing named'}).`);
      } finally {
        restore(entry.file);
      }
    }
    for (const check of Object.keys(bases)) {
      const after = CHECKS[check]();
      if (after.code !== bases[check].code) problems.push(`after every file was restored ${check} exited ${String(after.code)} where the base exited ${String(bases[check].code)}, so a restore did not land.`);
      else say(`restored: every touched clone file matches the worktree by sha256, and ${check} is back where it started (exit ${String(after.code)})`);
    }
  } catch (err) {
    problems.push(`the harness threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clean();
  }
  for (const [file, before] of worktreeBefore) {
    const now = existsSync(join(REPO, file)) ? sha(readFileSync(join(REPO, file))) : null;
    if (now !== before) problems.push(`${file} in the WORKTREE changed during the run (${String(before).slice(0, 12)} to ${String(now).slice(0, 12)}); this harness writes only its clone, so another process wrote it`);
  }
  process.stdout.write('\n');
  for (const [n, owner, verdict, red] of table) process.stdout.write(`${TAG}   ${n.padEnd(7)} ${owner.padEnd(32)} ${verdict.padEnd(14)} ${red}\n`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(ran)} arms, one clause each, and every one but the control reddened THE CONDITION OR CASE ` +
      'THAT OWNS IT, measured as a DELTA against the base; the control moved nothing. Every clone file was restored and proved by ' +
      'sha256, the worktree was never written, and the clone is gone. No Electron, no tmux, no ssh, no Docker, no agent, no token.\n'
  );
}
