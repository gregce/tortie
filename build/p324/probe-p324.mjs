#!/usr/bin/env node
/**
 * probe:p324 — the measurement the 3.6 and 3.6b rows of both remote version
 * lists cite (Phase 324, build/p324/SPEC.md §6).
 *
 * WHAT IT DRIVES, and every far string it composes is the SHIPPING module's.
 * This file is the ORCHESTRATOR. It does no tmux and no ssh of its own: it
 * writes a `/bin/sh` stand-in for the sign in program, BUILDS the driver's
 * environment, and runs `build/p324/drive-p324.mts` through the pinned tsx.
 * The driver imports the shipping precheck, plan, control client, boot and
 * version read by absolute path from `P324_ROOT` and drives them over the
 * stand-in, so the bytes that reach the far side are `tmuxCommand`'s,
 * `shellCommand`'s and `attachPlan`'s own. See build/p324/SPEC.md §2 and §6.
 *
 * WHAT IT NEVER DOES. No Electron. No ssh. No download and no build. It reads
 * NO server of the operator's. Every server the driver starts is on a scratch
 * socket named `p324-…-<pid>`, refused by `refuseRealSockets` before anything
 * starts, and ended by the pid it reported in the driver's `finally`.
 *
 * THE CARRIAGE (§6.2). The far side is a `/bin/sh` script this file writes into
 * the run directory, named `far-sh` — never a name ending in `ssh`, because
 * `gate:knownhosts` resolves program names by value. It is every context's
 * `sshBin`, so the shipping composers build exactly as for a real machine, and
 * it runs only the LAST argument it is handed, through `/bin/sh -c`, the way
 * sshd runs a no-pty command. It records every string it is handed, admitted
 * or not, to `argv.log`, and admits EXACTLY three shapes:
 *   (1) an absolute path ending `/tmux` (quoted or not) followed by
 *       `-L p324-<name>`, where NO `-L` anywhere in the string names anything
 *       but a `p324-` socket and no `-S` appears at all;
 *   (2) the no-server read: such a path followed by ` -V` and nothing else;
 *   (3) byte for byte `"$SHELL" -lc 'printf __TORTIE_PATH__%s__TORTIE_PATH__
 *       "$PATH"'`, which is `remotePathCommand()`.
 * Anything else exits 97 and is written `REFUSED <string>`. A `-L gmux` or a
 * `-L default` is refused in every spelling (quoted, attached, doubled
 * spaces), and so is a `-S` socket path, whatever else the string holds.
 * `--far-sh-self-test` writes the stand-in to a scratch directory and runs a
 * table of admitted and refused strings through it.
 *
 * THE DRIVER'S ENVIRONMENT IS BUILT, NOT INHERITED (§6.2): `HOME` is the run's
 * own, `SHELL=/bin/sh`, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, `LANG` and `TERM`
 * fixed, `USER`, `LOGNAME` and `TMPDIR` carried, and the `P324_*` knobs.
 * Nothing else of the operator's crosses, so `TMUX`, `TMUX_PANE`,
 * `TMUX_TMPDIR` and every `GMUX_*` name (which a probe started from inside a
 * Tortie session inherits, and which make a nested attach refuse) are absent,
 * and so is every credential his shell holds. `execOn` hands `process.env` to
 * every spawn, so this is exactly what the far side sees; `results.json`
 * records the NAMES under `envNames`.
 *
 * THE DRIVER'S PROCESS. It is started with `spawn` and its pid is kept. The
 * `finally` (and a SIGINT, SIGTERM or SIGHUP to this file) ends it by that pid
 * ONLY while it has not exited, because an exited child's pid has been reaped
 * and may already name another process of the operator's: SIGTERM first, which
 * tsx relays to the driver and the driver turns into its own cleanup, then,
 * after 15 s, SIGKILL to the child and every descendant walked from it. A wall
 * deadline of 20 minutes does the same.
 *
 * THE REFUSALS (§6.1). It exits 2 with ONE sentence, before anything starts,
 * when: a probe build is missing or its `-V` is not `tmux <v>` (the sentence
 * names `node build/build-tmux-version.mjs <v>`); Homebrew's 3.6a is missing or
 * does not print `tmux 3.6a`; the vendored tmux is missing (`npm run
 * vendor:tmux`); the platform is not macOS; node-pty does not load;
 * `P324_PARENT_CHECKOUT` lacks `src/` or `node_modules/`; an extra is not an
 * absolute executable path; or a socket would be `gmux` or `default`
 * (`refuseRealSockets`). So it never passes quietly on a machine that has not
 * built its subjects.
 *
 * KNOBS. `P324_PARENT_CHECKOUT=<dir>` points the driver's `P324_ROOT` at a
 * parent build (its `src/` and `node_modules/`) instead of this checkout, so
 * the same builds are driven against the code before the phase; the builds
 * always come from THIS checkout's `build/vendor/`. `P324_EXTRA=<id>=<abs
 * path>,…` adds builds to every per-target arm, each judged against the 3.6a
 * control. `P324_KEEP=1` keeps the run directory. `P324_OUT=<dir>` writes
 * `results.json` there as well. `P324_RUN=<dir>` names the run directory
 * (default `$TMPDIR/p324-probe-<pid>`). `P324_ABLATE_PRECHECK=0` skips the one
 * ablated cell, which ends a server and writes one tmux crash report.
 *
 * THE DOWNGRADE (the fix round, 2026-09-30). One more arm per 3.6-family
 * server: a live connection opened through the product's own
 * `openControlPlane`, whose program (a symlink in the run directory) is then
 * re-pointed at 3.5a in place, after which the probe's own `detach-client`
 * ends the control child so the shipping client's reconnect runs. The
 * reconnect must read the server's version at least once, spawn no far
 * control child, and leave the server, its pid and its held session as they
 * were. It is the path the precheck exists for, and before it no arm ever
 * reconnected: a "read once per client" flag in the transport passed this
 * probe, and driven over real ssh it ended a 3.6 server and every session in
 * it. At the parent only the 3.6a control opens, so only it is driven there.
 *
 * A PASS IS THE NOTES. Beside §6.7's expectations, every measured sentence of
 * the 3.6 and 3.6b rows' notes is asked of the run (`noteClaims`, the absolute
 * scroll and attach readings, and the dialect's keys against the 3.6a control,
 * the kill's notifications among them), so a run that does not support a
 * sentence the row says fails. A spawn is COUNTED from `argv.log`, never
 * assumed, and every far control child must follow a `#{version}` read of the
 * same socket through the same program, the ablated cell's alone excepted.
 *
 * OTHER MODES. `--judge <run dir>` re-reads a kept run's `results.json` and
 * `argv.log` and applies the same verdict, so a verifier (or this file's own
 * clause proofs) can judge a run without driving one. `--compare <head.json>
 * <parent.json>` prints every cell that differs and applies §6.7: it exits 0
 * only when the differences are exactly {exec gate, control gate, Prepare, G,
 * C} — those five REQUIRED to move — on the rows whose version string this
 * phase added (read as HEAD's version list minus the parent's) and on the two
 * pair-up rows, and nothing differs anywhere else, the controls, the crossing
 * pairs, the rollback and the 3.6a downgrade included (a downgrade row whose
 * server string this phase added must move `opened`, because it opens only at
 * HEAD).
 *
 * Run it with `npm run probe:p324`. Registered in build/verification-checks.mjs
 * as a tmux harness that refuses (exit 2) when its builds are missing.
 */

import { spawn, spawnSync, execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tsxCli } from '../ts-runner.mjs';
import { refuseRealSockets } from '../scratch-machine.mjs';

/** This checkout — build/p324/probe-p324.mjs lives in <root>/build/p324. */
const THIS_CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** One sentence to stderr, then exit 2. Nothing has started. */
function refuse(sentence) {
  process.stderr.write(`probe:p324 refuses: ${sentence}\n`);
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The stand-in for the sign in program (§6.2)
// ---------------------------------------------------------------------------

/** Single-quote a string for /bin/sh. */
function shq(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** The characters an absolute tmux path in this probe may hold. */
const PATH_CHARS = 'A-Za-z0-9_./+@-';

/**
 * A string that names any socket but a scratch `p324-` one, in any spelling,
 * or any `-S` socket path. An `-L` followed by anything that does not begin
 * `p324-` matches, so `-L gmux`, `-L 'gmux'`, `-L"default"`, `-Lgmux` and
 * `-L  default` all do. Over-refusal is loud (exit 97 and a REFUSED line), so
 * a false match fails a run rather than hiding one.
 */
const REFUSE_RE =
  `(^|[[:space:]])['"]?-(L[[:space:]]*['"]?([^p'"[:space:]]|p[^3]|p3[^2]|p32[^4]|p324[^-])|S)`;

/**
 * What may follow the socket: any run of characters that are not a shell
 * operator, a quote or a backslash, and whole single-quoted segments (which is
 * how `shellQuoteArgv` quotes every argument that needs it, `';'` included).
 * So `… list-sessions ; anything`, a pipe, a `$(…)`, a backtick or a redirect
 * outside quotes never reaches the far shell.
 */
const SAFE_TAIL = `([^';&|<>$\`\\\\"]|'[^']*')*`;

/** Shapes (1) and (2): an absolute tmux path, then `-L p324-<name>` and a safe tail, or exactly ` -V`. */
const SHAPE_RE =
  `^('/[${PATH_CHARS}]+/tmux'|/[${PATH_CHARS}]+/tmux) (-L '?p324-[A-Za-z0-9._-]+'?( ${SAFE_TAIL})?|-V)$`;

/** Shape (3): `remotePathCommand()`, byte for byte. */
const PATH_CAPTURE = `"$SHELL" -lc 'printf __TORTIE_PATH__%s__TORTIE_PATH__ "$PATH"'`;

function farShScript() {
  return [
    '#!/bin/sh',
    '# probe:p324 stand-in for the sign in program. It runs only the LAST',
    '# argument, through /bin/sh -c, the way sshd runs a no-pty command, and it',
    '# admits exactly the three shapes build/p324/SPEC.md §6.2 names. Every',
    '# string it is handed is written to argv.log, admitted or not.',
    'last=',
    'for a in "$@"; do last=$a; done',
    'refuse() {',
    '  printf \'REFUSED %s\\n\' "$last" >> "$P324_ARGV_LOG"',
    '  printf \'far-sh refused (%s): %s\\n\' "$1" "$last" >&2',
    '  exit 97',
    '}',
    `if [ "$last" = ${shq(PATH_CAPTURE)} ]; then`,
    '  printf \'%s\\n\' "$last" >> "$P324_ARGV_LOG"',
    '  exec /bin/sh -c "$last"',
    'fi',
    '# One line only: grep reads a line at a time, so a newline could carry a',
    '# second command past both checks below.',
    "nl='",
    "'",
    'case "$last" in *"$nl"*) refuse \'a newline\';; esac',
    '# Never a real socket, in any spelling, and never a socket path.',
    `if printf '%s\\n' "$last" | /usr/bin/grep -Eq -e ${shq(REFUSE_RE)}; then refuse 'a socket that is not p324-'; fi`,
    '# Shapes 1 and 2: a tmux call on a scratch p324- socket, or the -V read.',
    `printf '%s\\n' "$last" | /usr/bin/grep -Eq -e ${shq(SHAPE_RE)} || refuse 'not one of the three shapes'`,
    'printf \'%s\\n\' "$last" >> "$P324_ARGV_LOG"',
    'exec /bin/sh -c "$last"',
    ''
  ].join('\n');
}

function writeFarSh(dir) {
  const file = join(dir, 'far-sh');
  writeFileSync(file, farShScript());
  chmodSync(file, 0o755);
  return file;
}

/**
 * `--far-sh-self-test`: the stand-in, written to a scratch directory, handed a
 * table of strings. An admitted string names a tmux path that does not exist,
 * so it fails to execute; nothing here starts tmux, and the directory is
 * removed in a `finally`.
 *
 * THE CANARY. Every hostile row that would run a second command if the stand-in
 * let it through tries to make one file, `p324-hostile`, INSIDE this scratch
 * directory (and the stand-in runs with its `cwd` there too). A refused row
 * must exit 97, write its REFUSED line AND leave that file unmade, so a
 * stand-in that fails open is caught by what ran, not only by its exit code,
 * and even a stand-in broken on purpose writes nothing outside the directory
 * the `finally` removes. (A clause proof of 2026-09-30 03:35 broke the safe
 * tail on a copy of this file while the canary still named `/tmp`, and the
 * admitted redirect row made `/private/tmp/p324-hostile`; that is why.)
 */
function farShSelfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'p324-farsh-'));
  const log = join(dir, 'argv.log');
  // A tmux path inside this scratch directory that does not exist, so an
  // admitted string fails to execute rather than reaching any program.
  const good = join(dir, 'absent', 'bin', 'tmux');
  const canary = join(dir, 'p324-hostile');
  const touch = `/usr/bin/touch ${canary}`;
  const rows = [
    // [expected, string]  — admitted strings are rewritten to run nothing that matters
    ['admit', `${good} -L p324-36-1 -f /dev/null list-sessions -F '#{session_id}'`],
    ['admit', `'${good}' -L 'p324-36-1' -f /dev/null display-message -p '#{version}'`],
    ['admit', `${good} -V`],
    ['admit', `'${good}' -V`],
    ['admit', PATH_CAPTURE],
    ['refuse', `${good} -L gmux list-sessions`],
    ['refuse', `${good} -L 'gmux' list-sessions`],
    ['refuse', `${good} -L"gmux" list-sessions`],
    ['refuse', `${good} -Lgmux list-sessions`],
    ['refuse', `${good} -L  default list-sessions`],
    ['refuse', `${good} -L default`],
    ['refuse', `${good} -L p324-36-1 list-sessions ; ${good} -L gmux kill-server`],
    ['refuse', `${good} -L p324-36-1 -L gmux list-sessions`],
    ['refuse', `${good} -S /tmp/tmux-501/gmux list-sessions`],
    ['refuse', `${good} -L p324-36-1 -S /tmp/tmux-501/default ls`],
    ['refuse', `${good} list-sessions`],
    ['refuse', `'${good}' -V; ${good} -L gmux kill-server`],
    ['refuse', `/bin/sh -c 'echo -L p324-x'`],
    ['refuse', `/bin/echo p324-hostile -L p324-x`],
    ['refuse', '/bin/echo -L p324-36-1 p324-hostile'],
    ['refuse', 'bin/tmux -L p324-36-1 list-sessions'],
    ['refuse', `"$SHELL" -lc 'printf __TORTIE_PATH__%s__TORTIE_PATH__ "$PATH"'; true`],
    ['refuse', `${good} -V extra`],
    ['admit', `${good} -L p324-36-1 -f /dev/null start-server ';' set-option -s exit-empty off`],
    ['admit', `${good} -L p324-36-1 -f /dev/null -u attach-session -t '=p324-draw-36'`],
    ['refuse', `${good} -L p324-36-1 list-sessions ; ${touch}`],
    ['refuse', `${good} -L p324-36-1 list-sessions && ${touch}`],
    ['refuse', `${good} -L p324-36-1 list-sessions || ${touch}`],
    ['refuse', `${good} -L p324-36-1 list-sessions | /bin/cat`],
    ['refuse', `${good} -L p324-36-1 list-sessions $(${touch})`],
    ['refuse', `${good} -L p324-36-1 list-sessions \`${touch}\``],
    ['refuse', `${good} -L p324-36-1 list-sessions > ${canary}`],
    ['refuse', `${good} -L p324-36-1 list-sessions\n${touch}`],
    ['refuse', `${good} -L p324-36-1 display-message "$HOME"`],
    ['refuse', `${good} -L p324-36-1 list-sessions \\; ${touch}`],
    ['refuse', `'${good}' -V; ${touch}`],
    ['refuse', `${PATH_CAPTURE}; ${touch}`],
    ['refuse', '']
  ];
  let failures = 0;
  try {
    const far = writeFarSh(dir);
    // The stand-in runs the admitted string with a bare PATH and its cwd in
    // the scratch directory, so an admitted string that names the absent tmux
    // fails to execute rather than doing anything.
    for (const [want, s] of rows) {
      writeFileSync(log, '');
      rmSync(canary, { force: true });
      const out = spawnSync(far, ['-o', 'BatchMode=yes', 'p324.invalid', s], {
        encoding: 'utf8',
        timeout: 10_000,
        cwd: dir,
        env: { P324_ARGV_LOG: log, PATH: '/usr/bin:/bin', SHELL: '/usr/bin/true', HOME: dir }
      });
      const logged = readFileSync(log, 'utf8');
      const ran = existsSync(canary);
      const refused = out.status === 97 && logged.startsWith('REFUSED ') && !ran;
      const got = refused ? 'refuse' : 'admit';
      const recorded = logged.length > 0;
      const ok = got === want && recorded;
      if (!ok) failures += 1;
      const why = `${recorded ? '' : '(NOT RECORDED) '}${ran ? '(THE CANARY RAN) ' : ''}`;
      process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'} ${want.padEnd(6)} got ${got.padEnd(6)} ${why}${JSON.stringify(s).slice(0, 110)}\n`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  process.stdout.write(failures === 0 ? `far-sh self-test: PASS, ${String(rows.length)} of ${String(rows.length)} strings as expected\n` : `far-sh self-test: FAIL, ${String(failures)} string(s) not as expected\n`);
  process.exit(failures === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Projections, shared by the verdict and by --compare
// ---------------------------------------------------------------------------

/**
 * Normalize one run's per-run and per-location tokens out of a value, so two
 * runs at different checkout paths compare on content. Each run's own checkout
 * path (its `root`, which is also the sessions' cwd in every list line) becomes
 * `<ROOT>`; the scratch tmux socket directory and any `p324-…-<pid>` socket name
 * lose their pid.
 */
function normValue(v, root) {
  let s = JSON.stringify(v ?? null);
  if (typeof root === 'string' && root.length > 0) s = s.split(root).join('<ROOT>');
  s = s.replace(/\/tmp\/tmux-\d+/g, '/tmp/tmux-<uid>');
  s = s.replace(/p324-[a-z0-9-]*?-\d+/gi, 'p324-<sock>');
  return s;
}

/** The keys of a target projection that are the G and C columns (the gate's own arms). */
const isGateArmKey = (k) => k.startsWith('G_') || k.startsWith('C_');

/** The five columns §6.7 REQUIRES to move on a row whose version string this phase added. */
const REQUIRED_TO_MOVE = ['execGate', 'controlGate', 'prepare', 'G_open', 'C_opened'];

/** A stable, path- and timing-independent projection of one target cell. */
function projectTarget(cell) {
  if (cell === null || typeof cell !== 'object') return null;
  const g = cell.G ?? {};
  const c = cell.C ?? {};
  const d = cell.D ?? {};
  const e = cell.E ?? {};
  const s = cell.S ?? {};
  const a = cell.A ?? {};
  const dia = cell.dialect ?? {};
  const boot = cell.boot ?? {};
  const reborn = cell.reborn ?? {};
  return {
    dashV: cell.dashV,
    hashVersion: cell.hashVersion,
    // The phase: the gates, Prepare, and the two arms that ask the gate.
    execGate: cell.execGate,
    controlGate: cell.controlGate,
    prepare: cell.prepare,
    G_open: g.openControlPlane,
    G_live: g.live ?? null,
    G_linkKind: g.linkKind ?? null,
    G_spawns: g.spawns ?? null,
    C_opened: c.opened,
    C_spawns: c.spawns ?? null,
    C_code: c.refusal?.code ?? null,
    C_unmeasured: c.refusedAsUnmeasured ?? null,
    C_outClient: c.outputOnClient ?? null,
    C_rawSaw: typeof c.outputOnRawChild === 'number' ? c.outputOnRawChild >= 1 : null,
    // Everything below must be identical at both builds.
    bootBorn: boot.born,
    bootAgree: boot.agree,
    bootOf: boot.of,
    rebornBorn: reborn.born,
    rebornAgree: reborn.agree,
    rebornOf: reborn.of,
    E_rows: e.listEmpty?.rows,
    E_created: typeof e.createdSessionId === 'string' && e.createdSessionId.startsWith('$'),
    E_oneRow: e.listOneRow,
    E_history: e.historyLimit,
    E_listParsed: e.listFormat?.parsed,
    E_listFields: e.listFormat?.fieldsTheParserRequires,
    E_noServerCode: e.noServer?.code,
    E_noServerExit: e.noServerExit?.status,
    D_greeted: d.greeted,
    D_spawns: d.spawns ?? null,
    D_listEqual: d.listEqual,
    D_outClient0: d.outputOnClient === 0,
    D_rawSaw: typeof d.outputOnRawChild === 'number' && d.outputOnRawChild >= 1,
    dia_step1: dia.step1,
    dia_guard: dia.guardShape,
    dia_greeting: dia.greetingNormalized,
    dia_noOut: dia.noOutputBlockNormalized,
    dia_noOutEmpty: dia.noOutputBlockEmpty,
    dia_onCreate: dia.onCreateKnown,
    dia_onRename: dia.onRenameKnown,
    dia_onKill: dia.onKillKnown,
    dia_renamed: dia.renamedLineNormalized,
    dia_window: dia.windowKnown,
    dia_exit: dia.exitLineNormalized,
    dia_list: dia.listOverControl,
    S_by30: s.by30,
    S_to1500: s.to1500,
    S_byMinus10: s.byMinus10,
    S_clamp: s.by2500Clamped?.position,
    S_parked: s.parkedInMode,
    S_state: Array.isArray(s.stateFormatRaw) ? s.stateFormatRaw.join('\t') : null,
    S_shapes: s.shapesSent ?? null,
    S_exit: s.exit,
    S_cpl: s.copyPositionLimit,
    S_noModeTop: s.noModeTopLine,
    S_noModeCancel: s.noModeCancel,
    A_drew: a.drew,
    A_exit: a.exitCode
  };
}

/** A stable projection of one pair row. */
function projectPair(row) {
  if (row === null || typeof row !== 'object') return null;
  const c = row.C ?? {};
  const d = row.D ?? {};
  const a = row.A ?? {};
  return {
    versionRead: row.versionRead,
    execGate: row.execGate,
    controlGate: row.controlGate,
    C_opened: c.opened ?? null,
    C_spawns: c.spawns ?? null,
    C_code: c.refusal?.code ?? null,
    C_unmeasured: c.refusedAsUnmeasured ?? null,
    D: typeof d === 'object' ? { greeted: d.greeted ?? null, spawns: d.spawns ?? null } : d,
    A_drew: a.drew ?? null,
    A_exit: a.exitCode ?? null,
    error: row.error ?? null
  };
}

/** A stable projection of one rollback row. */
function projectRollback(row) {
  if (row === null || typeof row !== 'object') return null;
  return {
    C_opened: row.C?.opened ?? null,
    C_code: row.C?.refusal?.code ?? null,
    spawns: row.controlSpawns ?? null,
    alive: row.controlChildrenAlive ?? null,
    serverAlive: row.serverAlive ?? null,
    pidUnchanged: row.pidUnchanged ?? null,
    error: row.error ?? null
  };
}

/** A stable projection of one downgrade row (the fix round): no pid, no count that timing moves. */
function projectDowngrade(row) {
  if (row === null || typeof row !== 'object') return null;
  return {
    opened: row.opened ?? null,
    live: row.live ?? null,
    spawnsBefore: row.spawnsBeforeDowngrade ?? null,
    downgradeRan: row.downgrade === undefined,
    readAfter: typeof row.readsAfterDowngrade === 'number' ? row.readsAfterDowngrade >= 1 : null,
    spawnsAfter: row.controlSpawnsAfterDowngrade ?? null,
    childrenAlive: row.controlChildrenAlive ?? null,
    serverAlive: row.serverAlive ?? null,
    pidUnchanged: row.pidUnchanged ?? null,
    held: row.heldSessionPresent ?? null,
    freshServer: row.freshServerPid !== undefined,
    error: row.error ?? null
  };
}

/** The pair keys the pair-up rows may move, and the three they must. */
const PAIR_REQUIRED = ['execGate', 'controlGate', 'C_opened'];
const isPairGateKey = (k) => k === 'execGate' || k === 'controlGate' || k.startsWith('C_');

// ---------------------------------------------------------------------------
// --compare mode: read two result files and apply §6.7
// ---------------------------------------------------------------------------

function runCompare(headPath, parentPath) {
  let head;
  let parent;
  try {
    head = JSON.parse(readFileSync(headPath, 'utf8'));
    parent = JSON.parse(readFileSync(parentPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`probe:p324 --compare could not read a file: ${err.message}\n`);
    process.exit(2);
  }
  const problems = [];
  const differences = [];
  // The two files must be what the arguments say they are.
  if (head.parent !== null && head.parent !== undefined) problems.push(`the first file is a PARENT run (${String(head.parent)}); it must be HEAD's`);
  if (parent.parent === null || parent.parent === undefined) problems.push('the second file is not a parent run (its results name no P324_PARENT_CHECKOUT)');
  // The version strings this phase added, READ rather than written here.
  const headList = Array.isArray(head.testedRemoteVersions) ? head.testedRemoteVersions : [];
  const parentList = Array.isArray(parent.testedRemoteVersions) ? parent.testedRemoteVersions : [];
  const added = new Set(headList.filter((v) => !parentList.includes(v)));
  if (added.size === 0) problems.push('HEAD\'s version list adds no string to the parent\'s, so there is no phase to compare');
  process.stdout.write(`probe:p324 --compare (strings this phase added: ${[...added].join(', ') || 'none'})\n`);

  const hRoot = head.root;
  const pRoot = parent.root;
  const headT = head.targets ?? {};
  const parentT = parent.targets ?? {};
  const ids = [...new Set([...Object.keys(headT), ...Object.keys(parentT)])].sort();
  for (const id of ids) {
    const h = projectTarget(headT[id]);
    const p = projectTarget(parentT[id]);
    if (h === null || p === null) {
      problems.push(`target ${id}: present in only one run`);
      continue;
    }
    const moves = added.has(h.dashV) && h.dashV === p.dashV;
    const moved = new Set();
    for (const k of Object.keys(h)) {
      const hv = normValue(h[k], hRoot);
      const pv = normValue(p[k], pRoot);
      if (hv === pv) continue;
      moved.add(k);
      differences.push(`target ${id}: ${k} differs (HEAD ${hv.slice(0, 60)} | parent ${pv.slice(0, 60)})`);
      const permitted = moves && (REQUIRED_TO_MOVE.includes(k) || isGateArmKey(k));
      if (!permitted) problems.push(`target ${id}: ${k} moved, and ${moves ? 'it is not one of the gate columns' : `${String(h.dashV)} is not a string this phase added`}`);
    }
    if (moves) {
      for (const k of REQUIRED_TO_MOVE) {
        if (!moved.has(k)) problems.push(`target ${id}: ${k} did NOT move, and §6.7 requires it to on a string this phase added`);
      }
    }
  }
  // Pairs. The two pair-up rows may move their gates and C, and must move
  // those three; the crossing pairs must not move at all.
  const headP = head.pairs ?? {};
  const parentP = parent.pairs ?? {};
  const pairIds = [...new Set([...Object.keys(headP), ...Object.keys(parentP)])].sort();
  for (const id of pairIds) {
    const h = projectPair(headP[id]);
    const p = projectPair(parentP[id]);
    if (h === null || p === null) {
      problems.push(`pair ${id}: present in only one run`);
      continue;
    }
    const isPairUp = added.has(h.versionRead) && h.versionRead === p.versionRead;
    const moved = new Set();
    for (const k of Object.keys(h)) {
      const hv = normValue(h[k], hRoot);
      const pv = normValue(p[k], pRoot);
      if (hv === pv) continue;
      moved.add(k);
      differences.push(`pair ${id}: ${k} differs (HEAD ${hv.slice(0, 60)} | parent ${pv.slice(0, 60)})`);
      if (!(isPairUp && isPairGateKey(k))) problems.push(`pair ${id}: ${k} moved, which §6.7 does not permit`);
    }
    if (isPairUp) {
      for (const k of PAIR_REQUIRED) {
        if (!moved.has(k)) problems.push(`pair ${id}: ${k} did NOT move, and §6.7 requires it to on a pair-up row`);
      }
    }
  }
  // The rollback: identical at both builds, cell by cell.
  const headR = head.rollback ?? {};
  const parentR = parent.rollback ?? {};
  for (const id of [...new Set([...Object.keys(headR), ...Object.keys(parentR)])].sort()) {
    const h = projectRollback(headR[id]);
    const p = projectRollback(parentR[id]);
    if (h === null || p === null) {
      problems.push(`rollback ${id}: present in only one run`);
      continue;
    }
    for (const k of Object.keys(h)) {
      const hv = normValue(h[k], hRoot);
      const pv = normValue(p[k], pRoot);
      if (hv === pv) continue;
      differences.push(`rollback ${id}: ${k} differs (HEAD ${hv.slice(0, 60)} | parent ${pv.slice(0, 60)})`);
      problems.push(`rollback ${id}: ${k} moved, which §6.7 does not permit`);
    }
  }
  // The downgrade (the fix round). A row whose server string this phase added
  // is never opened at the parent, so it may move and must move `opened`; the
  // 3.6a control opens at both builds and must be identical, cell by cell.
  const headD = head.downgrade ?? {};
  const parentD = parent.downgrade ?? {};
  for (const id of [...new Set([...Object.keys(headD), ...Object.keys(parentD)])].sort()) {
    const h = projectDowngrade(headD[id]);
    const p = projectDowngrade(parentD[id]);
    if (h === null || p === null) {
      problems.push(`downgrade ${id}: present in only one run`);
      continue;
    }
    const moves = added.has(id.split('-to-')[0]);
    const moved = new Set();
    for (const k of Object.keys(h)) {
      const hv = normValue(h[k], hRoot);
      const pv = normValue(p[k], pRoot);
      if (hv === pv) continue;
      moved.add(k);
      differences.push(`downgrade ${id}: ${k} differs (HEAD ${hv.slice(0, 60)} | parent ${pv.slice(0, 60)})`);
      if (!moves) problems.push(`downgrade ${id}: ${k} moved, which §6.7 does not permit`);
    }
    if (moves && !moved.has('opened')) problems.push(`downgrade ${id}: opened did NOT move, and a string this phase added opens only at HEAD`);
  }
  if (Object.keys(headD).length === 0) problems.push('HEAD ran no downgrade row');

  // The ablated cell does not depend on the code under test (its transport is
  // the probe's own); compared only when both runs ran it.
  if (typeof head.ablated === 'object' && head.ablated !== null && typeof parent.ablated === 'object' && parent.ablated !== null) {
    if (head.ablated.serverEnded !== parent.ablated.serverEnded) problems.push('the ablated cell ended its server in one run and not the other');
  } else {
    process.stdout.write(`  ablated cell not compared (HEAD: ${typeof head.ablated === 'string' ? head.ablated : 'ran'}; parent: ${typeof parent.ablated === 'string' ? parent.ablated : 'ran'})\n`);
  }

  for (const d of differences) process.stdout.write(`  ${d}\n`);
  if (differences.length === 0) process.stdout.write('  no projected cell differs at all\n');
  if (problems.length > 0) {
    process.stdout.write(`\nFAIL: ${String(problems.length)} problem(s):\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\nPASS: ${String(differences.length)} difference(s), every one in {exec gate, control gate, Prepare, G, C} ` +
      'on a row whose string this phase added or on a pair-up row, or on the downgrade of a string this phase added ' +
      '(which opens only at HEAD), each of the required columns moved, and ' +
      'every other projected cell (the controls, the crossing pairs, the rollback and the 3.6a downgrade included) is identical at both builds.\n'
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// His world, re-derived from argv.log
// ---------------------------------------------------------------------------

/** A far string or PROBE payload naming a socket that is not p324-, or a -S path. */
const REFUSE_JS = /(^|\s)['"]?-(L\s*['"]?([^p'"\s]|p[^3]|p3[^2]|p32[^4]|p324[^-])|S)/;
const SHAPE_JS = new RegExp(SHAPE_RE);

/** The first token of a far string (its program), quotes dropped. */
function programOf(line) {
  const m = /^'([^']*)'|^(\S+)/.exec(line);
  return m ? (m[1] ?? m[2]) : '';
}
/** The `-L` socket a far string names, quotes dropped. */
function socketOf(line) {
  const m = /(?:^|\s)-L\s*'?([A-Za-z0-9._-]+)'?/.exec(line);
  return m ? m[1] : null;
}

function hisWorld(argvText, ablatedSocketPrefix) {
  const lines = argvText.split('\n').filter((l) => l.length > 0);
  let refused = 0;
  let realSocket = 0;
  let strayNoSocket = 0;
  let farStrings = 0;
  let controlSpawns = 0;
  const unguarded = [];
  const lastRead = new Map(); // socket -> program that last read #{version} on it
  for (const line of lines) {
    if (line.startsWith('REFUSED ')) {
      refused += 1;
      continue;
    }
    // PROBE lines are the driver's own direct helpers on scratch sockets; they
    // still must never name a real socket.
    const isProbe = line.startsWith('PROBE ');
    const payload = isProbe ? line.replace(/^PROBE \S+ \S+ /, '') : line;
    if (isProbe) {
      // The attach line carries the stand-in's whole argv; ask only its tmux string.
      const tail = payload.includes(' p324.invalid ') ? payload.slice(payload.indexOf(' p324.invalid ') + 14) : payload;
      if (REFUSE_JS.test(tail)) realSocket += 1;
      continue;
    }
    farStrings += 1;
    if (REFUSE_JS.test(payload)) realSocket += 1;
    if (payload === PATH_CAPTURE) continue;
    if (!SHAPE_JS.test(payload)) {
      strayNoSocket += 1;
      continue;
    }
    const sock = socketOf(payload);
    if (sock === null) continue; // the -V read
    const prog = programOf(payload);
    const bare = payload.replace(/'/g, '');
    if (/ display-message -p #\{version\}$/.test(bare)) {
      lastRead.set(sock, prog);
      continue;
    }
    if (/ -C new-session -A -s gmux-control$/.test(bare)) {
      controlSpawns += 1;
      // Every far control child follows a #{version} read of the same socket
      // through the same program, and each read admits ONE child.
      if (lastRead.get(sock) === prog) {
        lastRead.delete(sock);
      } else {
        unguarded.push(sock);
      }
    }
  }
  const unguardedOutsideAblated = unguarded.filter((s) => !(ablatedSocketPrefix !== null && s.startsWith(ablatedSocketPrefix)));
  const unguardedInAblated = unguarded.length - unguardedOutsideAblated.length;
  return { refused, realSocket, strayNoSocket, farStrings, controlSpawns, unguardedOutsideAblated, unguardedInAblated };
}

// ---------------------------------------------------------------------------
// The matrix and the verdict
// ---------------------------------------------------------------------------

function word(v) {
  return v === undefined || v === null ? '—' : String(v);
}

function eCell(e) {
  if (e === undefined) return 'not run';
  const bad = [];
  if (e.listEmpty?.rows !== 0) bad.push('empty');
  if (JSON.stringify(e.listOneRow) !== '["$0"]') bad.push('one');
  if (e.historyLimit !== '25000') bad.push('hist');
  if (e.noServer?.code !== 'TMUX_UNREACHABLE' || e.noServerExit?.status !== 1) bad.push('noserv');
  if (e.listFormat?.parsed !== true) bad.push('list');
  return bad.length === 0 ? 'measured' : `differs(${bad.join(',')})`;
}
function gCell(g) {
  if (g === undefined) return 'not run';
  if (g.openControlPlane === true) return `open,live=${word(g.live)},spawn ${word(g.spawns)}`;
  return `refused(${word(g.linkKind)}),spawn ${word(g.spawns)}`;
}
function cCell(c) {
  if (c === undefined) return 'not run';
  if (c.opened === true) return `open ${word(c.greetMs)}ms,spawn ${word(c.spawns)},out ${word(c.outputOnClient)}/${word(c.outputOnRawChild)}`;
  if (c.hung) return `hung(${c.hung}),spawn ${word(c.spawns)}`;
  return `refused(${word(c.refusal?.code)}${c.refusedAsUnmeasured ? ',unmeasured' : ''}),spawn ${word(c.spawns)}`;
}
function dCell(d) {
  if (d === undefined) return 'not run';
  if (typeof d === 'string') return d.startsWith('not run') ? 'not run(would hang)' : d;
  if (d.greeted !== true) return `${d.greetMs === 'hung' ? 'hung' : 'refused'},spawn ${word(d.spawns)}`;
  const list = d.listEqual === undefined ? '' : `,list${d.listEqual ? '=' : '≠'}exec`;
  const out = d.outputOnClient === undefined ? '' : `,out ${word(d.outputOnClient)}/${word(d.outputOnRawChild)}`;
  return `greeted ${word(d.greetMs)}ms,spawn ${word(d.spawns)}${list}${out}`;
}
function sCell(s) {
  if (s === undefined) return 'not run';
  if (s.notRun) return `not run(${s.notRun})`;
  if (s.error) return `threw(${s.error.slice(0, 40)})`;
  const cpl = s.copyPositionLimit === '' ? 'empty' : word(s.copyPositionLimit);
  return `${word(s.by30)}/${word(s.to1500)}/${word(s.byMinus10)}/clamp ${word(s.by2500Clamped?.position)}/exit ${word(s.exit)}/cpl ${cpl}`;
}
function aCell(a) {
  if (a === undefined) return 'not run';
  if (a.notRun) return `not run(${a.notRun})`;
  if (a.error) return `threw(${a.error.slice(0, 40)})`;
  return `${a.drew === true ? 'drew' : 'not drawn'},exit ${word(a.exitCode)}`;
}

function printMatrix(results, ref) {
  const targets = results.targets ?? {};
  const dialectMark = (cell) => {
    if (cell.dialect?.step1 !== 'greeted') return word(cell.dialect?.step1 ?? cell.dialect);
    if (cell.target === ref) return 'measured(reference)';
    const k = dialectDiff(targets[ref], cell);
    if (k === null) return 'measured(=3.6a)';
    // Only a new-string row is held to the reference; a control's difference is shown, not judged.
    return cell.role === 'new' ? `DIFFERS(${k})` : `measured(differs from 3.6a at ${k}; a control, not compared)`;
  };
  const rows = [];
  for (const [id, cell] of Object.entries(targets)) {
    if (cell === null || typeof cell !== 'object' || cell.fatal) {
      rows.push([id, `fatal: ${String(cell?.fatal ?? cell).slice(0, 80)}`]);
      continue;
    }
    const boot = typeof cell.boot === 'object' ? `${word(cell.boot.agree)}/${word(cell.boot.of)}${cell.boot.born ? ' born' : ''}` : 'threw';
    const reborn = typeof cell.reborn === 'object' ? `${word(cell.reborn.agree)}/${word(cell.reborn.of)}${cell.reborn.born ? ' born' : ''}` : 'threw';
    rows.push([
      id,
      `-V ${word(cell.dashV)} | #{version} ${word(cell.hashVersion)} | exec ${word(cell.execGate)} | control ${word(cell.controlGate)} | Prepare ${word(cell.prepare)} | boot ${boot} | reborn ${reborn}`,
      `E ${eCell(cell.E)} | G ${gCell(cell.G)} | C ${cCell(cell.C)} | steps 1-7,9 ${dialectMark({ ...cell, target: id })}`,
      `D ${dCell(cell.D)} | S ${sCell(cell.S)} via ${word(cell.S?.via)} | A ${aCell(cell.A)}`
    ]);
  }
  for (const [id, p] of Object.entries(results.pairs ?? {})) {
    rows.push([
      `pair ${id}`,
      `-V ${word(p.versionRead)} | exec ${word(p.execGate)} | control ${word(p.controlGate)} | C ${cCell(p.C)} | D ${dCell(p.D)} | A ${p.A === undefined ? 'not run(crosses 3.6)' : aCell(p.A)}${p.error ? ` | ERROR ${p.error}` : ''}`
    ]);
  }
  for (const [id, r] of Object.entries(results.rollback ?? {})) {
    rows.push([
      `rollback ${id}`,
      `C ${r.C?.opened === false ? `refused(${word(r.C?.refusal?.code)})` : word(JSON.stringify(r.C))} | far control children spawned ${word(r.controlSpawns)}, alive ${word(r.controlChildrenAlive)} | server ${r.serverAlive ? 'alive' : 'GONE'}, pid ${r.pidUnchanged ? 'unchanged' : 'CHANGED'}${r.error ? ` | ERROR ${r.error}` : ''}`
    ]);
  }
  for (const [id, r] of Object.entries(results.downgrade ?? {})) {
    rows.push([
      `downgrade ${id}`,
      r.downgrade !== undefined
        ? `${r.downgrade}${r.link ? ` | link ${r.link}` : ''}${r.error ? ` | ERROR ${r.error}` : ''}`
        : `live ${word(r.live)}, children before ${word(r.spawnsBeforeDowngrade)} | after the program became 3.5a in place and the child was detached: version reads ${word(r.readsAfterDowngrade)}, far control children ${word(r.controlSpawnsAfterDowngrade)}, alive ${word(r.controlChildrenAlive)} | server ${r.serverAlive ? 'alive' : 'GONE'}, pid ${r.pidUnchanged ? 'unchanged' : 'CHANGED'}, held session ${r.heldSessionPresent ? 'present' : 'GONE'}${r.freshServerPid !== undefined ? `, FRESH SERVER ${String(r.freshServerPid)}` : ''} | link ${word(r.linkAfter)}${r.error ? ` | ERROR ${r.error}` : ''}`
    ]);
  }
  const ab = results.ablated;
  rows.push([
    'ablated',
    typeof ab === 'object' && ab !== null
      ? `3.6 server under a 3.5a program with no precheck: spawned ${word(ab.controlSpawns)}, server ${ab.serverEnded ? 'ENDED' : 'survived'}, fresh server ${word(ab.freshServerPid ?? ab.freshServer)}, crash reports written by this cell ${Array.isArray(ab.reportsWritten) ? String(ab.reportsWritten.length) : word(ab.reportsWritten)}`
      : word(ab)
  ]);
  for (const [id, ...lines] of rows) {
    process.stdout.write(`  ${id}\n`);
    for (const l of lines) process.stdout.write(`      ${l}\n`);
  }
}

/** The dialect keys compared with the 3.6a control, the kill's notifications among them. */
const DIALECT_KEYS = [
  'step1',
  'greetingNormalized',
  'guardShape',
  'noOutputBlockNormalized',
  'noOutputBlockEmpty',
  'onCreateKnown',
  'onRenameKnown',
  'onKillKnown',
  'renamedLineNormalized',
  'windowKnown',
  'exitLineNormalized',
  'listOverControl'
];

/** The first dialect key on which `cell` differs from `ref`, or null. */
function dialectDiff(ref, cell) {
  const a = ref?.dialect ?? {};
  const b = cell?.dialect ?? {};
  if (typeof a !== 'object' || typeof b !== 'object') return 'no dialect';
  for (const k of DIALECT_KEYS) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return k;
  }
  return null;
}

/**
 * The verdict. `results` is one run's results.json, `argvText` its argv.log.
 * Pure: it reads nothing and starts nothing, so `--judge` and the clause
 * proofs can ask it of a kept or altered run.
 */
function judge(results, argvText, wallMs) {
  const isParent = results.parent !== null && results.parent !== undefined;
  const REF = results.reference ?? '3.6a';
  const targets = results.targets ?? {};
  const ids = Object.keys(targets);
  process.stdout.write(`\nprobe:p324 matrix (${isParent ? 'PARENT' : 'HEAD'})${wallMs === null ? '' : `, ${(wallMs / 1000).toFixed(1)} s wall`}\n`);
  printMatrix(results, REF);

  const problems = [];
  const note = (m) => problems.push(m);
  if (results.fatal !== undefined) note(`the driver failed: ${String(results.fatal)}`);
  const ref = targets[REF];
  if (ref === undefined) note(`the ${REF} reference control has no cell`);

  // Every dialect this run measured must be WELL-FORMED, not just
  // self-consistent: "equal to the 3.6a control" is only proof when the 3.6a
  // control itself greeted, saw the create, rename, window and kill
  // notifications and the %exit. Without this a broken harness (an error
  // greeting on every target) would pass because every target is equally
  // broken. Asked of every row, the reference first.
  const wellFormed = (id, cell) => {
    const rd = cell?.dialect ?? {};
    const has = (v, needle) => String(v ?? '').split(',').includes(needle);
    if (rd.step1 !== 'greeted') note(`${id}: its dialect did not greet (${String(rd.step1)})`);
    if (rd.guardShape !== 'begin:0,end:0') note(`${id}: guardShape ${JSON.stringify(rd.guardShape)}, expected begin:0,end:0`);
    if (!has(rd.onCreateKnown, 'sessions-changed')) note(`${id}: onCreateKnown ${JSON.stringify(rd.onCreateKnown)} has no sessions-changed`);
    if (!has(rd.onRenameKnown, 'session-renamed')) note(`${id}: onRenameKnown ${JSON.stringify(rd.onRenameKnown)} has no session-renamed`);
    if (!has(rd.onKillKnown, 'sessions-changed')) note(`${id}: onKillKnown ${JSON.stringify(rd.onKillKnown)} has no sessions-changed`);
    if (!has(rd.windowKnown, 'session-window-changed')) note(`${id}: windowKnown ${JSON.stringify(rd.windowKnown)} has no session-window-changed`);
    if (rd.noOutputBlockEmpty !== true) note(`${id}: the no-output block was not empty`);
    if (rd.exitLineNormalized !== '%exit') note(`${id}: exit line ${JSON.stringify(rd.exitLineNormalized)}, expected %exit`);
    if (!/gmux-control/.test(String(rd.greetingNormalized ?? ''))) note(`${id}: the greeting names no gmux-control session`);
  };

  // The gate-free client's own promises, at BOTH builds (D opens at both).
  const checkDArm = (id, cell) => {
    const d = cell.D ?? {};
    if (d.greeted !== true) {
      note(`${id}: D (gate-free client) did not greet (${JSON.stringify(d).slice(0, 80)})`);
      return;
    }
    if (d.spawns !== 1) note(`${id}: D spawned ${String(d.spawns)} far control children, expected exactly 1`);
    if (d.listEqual !== true) note(`${id}: D list over the live connection is not byte-equal to exec (bytes ${JSON.stringify(d.listBytes)})`);
    if (d.outputOnClient !== 0) note(`${id}: D client saw ${String(d.outputOnClient)} %output, expected 0 (no-output suppression)`);
    if (typeof d.outputOnRawChild !== 'number' || d.outputOnRawChild < 1) {
      note(`${id}: the raw child beside D saw ${String(d.outputOnRawChild)} %output — the 0 on the client is vacuous unless output was produced`);
    }
  };

  // WHAT THE ROWS' NOTES SAY, asked of this run. The 3.6 and 3.6b notes in
  // src/main/tmux/version.ts claim only what this probe measures, so each
  // measured sentence is a check here and a PASS is a run that supports every
  // one of them. Asked at both builds and of the controls too.
  const BUILT_IN = new Set(['3.6', '3.6b', '3.6a', '3.7b', '3.7c']);
  const NO_SERVER = /error connecting to \S+ \(No such file or directory\)/;
  const noteClaims = (id, cell) => {
    const e = cell.E ?? {};
    const say = (what) => note(`${id}: ${what}, which the row's note claims`);
    if (cell.hashVersion !== cell.dashV || (BUILT_IN.has(id) && cell.dashV !== id)) {
      say(`-V read ${JSON.stringify(cell.dashV)} and #{version} ${JSON.stringify(cell.hashVersion)}`);
    }
    for (const [name, one] of [['boot', cell.boot], ['reborn', cell.reborn]]) {
      if (one?.born !== true || one?.agree !== 12 || one?.of !== 12) {
        say(`the ${name} read ${JSON.stringify(one).slice(0, 80)} rather than born with 12 of 12 options agreeing`);
      }
    }
    if (e.listEmpty?.rows !== 0) say(`list-sessions on a running server holding none read ${JSON.stringify(e.listEmpty)}`);
    if (JSON.stringify(e.listOneRow) !== '["$0"]') say(`list-sessions holding one session read ${JSON.stringify(e.listOneRow)}`);
    if (e.historyLimit !== '25000') say(`history-limit read ${JSON.stringify(e.historyLimit)}`);
    if (e.noServer?.code !== 'TMUX_UNREACHABLE' || !NO_SERVER.test(String(e.noServer?.detail ?? ''))) {
      say(`a socket with no server read ${JSON.stringify(e.noServer).slice(0, 120)}`);
    }
    if (e.noServerExit?.status !== 1 || !NO_SERVER.test(String(e.noServerExit?.stderr ?? ''))) {
      say(`a socket with no server exited ${JSON.stringify(e.noServerExit).slice(0, 120)}`);
    }
    if (e.listFormat?.parsed !== true || e.listFormat?.fieldsTheParserRequires !== 10) {
      say(`the list format read ${JSON.stringify(e.listFormat)} through the parser rather than its ten fields`);
    }
  };

  // The scroll shapes and the attach, as absolute readings on every row, so a
  // 3.6a that misbehaved the same way as a new row could not carry it.
  const scrollAndAttach = (id, cell) => {
    const s = cell.S ?? {};
    if (s.notRun || s.error) {
      note(`${id}: S ${s.notRun ? `not run (${s.notRun})` : `threw (${s.error})`}`);
    } else {
      if (s.by30 !== 30) note(`${id}: S +30 read ${String(s.by30)}`);
      if (s.to1500 !== 1500) note(`${id}: S scrollPaneTo(1500) read ${String(s.to1500)}`);
      if (s.byMinus10 !== 1490) note(`${id}: S -10 read ${String(s.byMinus10)}`);
      const cl = s.by2500Clamped ?? {};
      if (!(typeof cl.position === 'number' && cl.position === cl.history && cl.position > 1490 && cl.position < 3990)) {
        note(`${id}: S +2500 read ${JSON.stringify(cl)}, which is not clamped at the history`);
      }
      if (s.parkedInMode !== true) note(`${id}: S was not parked in copy mode when the state was read`);
      const f = s.stateFormatRaw;
      if (!Array.isArray(f) || f.length !== 8 || !f.every((x) => /^\d*$/.test(x))) {
        note(`${id}: the parked STATE_FORMAT answer ${JSON.stringify(f)} is not eight fields, each a number or empty`);
      }
      if (s.exit !== 0) note(`${id}: S exit read ${String(s.exit)}`);
      if (!/not in a mode/.test(String(s.noModeTopLine))) note(`${id}: top-line with no mode answered ${JSON.stringify(s.noModeTopLine)}`);
      if (!/not in a mode/.test(String(s.noModeCancel))) note(`${id}: cancel with no mode answered ${JSON.stringify(s.noModeCancel)}`);
      // copy_position_limit: empty on the 3.6 family, a number on 3.7b and 3.7c (scroll.ts).
      const cpl = s.copyPositionLimit;
      if (/^3\.6/.test(String(cell.dashV)) && cpl !== '') note(`${id}: copy_position_limit=${JSON.stringify(cpl)}, expected empty on the 3.6 family`);
      if (/^3\.7[bc]$/.test(String(cell.dashV)) && !/^\d+$/.test(String(cpl))) note(`${id}: copy_position_limit=${JSON.stringify(cpl)}, expected a number`);
    }
    const a = cell.A ?? {};
    if (a.drew !== true || a.exitCode !== 0) note(`${id}: A ${JSON.stringify(a).slice(0, 100)}, expected drawn and exit 0 after detach-client`);
  };

  // §6.7: on a new-string row EVERY projected cell equals the 3.6a control's,
  // except the two version strings and the gate columns (which are the phase).
  const sameAsReference = (id, cell) => {
    const want = projectTarget(ref);
    const got = projectTarget(cell);
    if (want === null || got === null) return;
    for (const k of Object.keys(got)) {
      if (k === 'dashV' || k === 'hashVersion' || REQUIRED_TO_MOVE.includes(k) || isGateArmKey(k)) continue;
      const g = normValue(got[k], results.root);
      const w = normValue(want[k], results.root);
      if (g !== w) note(`${id}: ${k} reads ${g.slice(0, 60)} where the 3.6a control reads ${w.slice(0, 60)}`);
    }
  };

  // The shipping client opened: one far child, and the no-output split holds.
  const cOpen = (id, c) => {
    if (c.opened !== true) {
      note(`${id}: C not open (${JSON.stringify(c).slice(0, 100)})`);
      return;
    }
    if (c.spawns !== 1) note(`${id}: C spawned ${String(c.spawns)} far control children, expected exactly 1`);
    if (c.outputOnClient !== 0) note(`${id}: the shipping client saw ${String(c.outputOnClient)} %output, expected 0`);
    if (typeof c.outputOnRawChild !== 'number' || c.outputOnRawChild < 1) note(`${id}: the raw child beside C saw no %output, so C's 0 is vacuous`);
  };
  // The shipping client refused before any spawn, for the control gate's own reason.
  const unmeasured = results.controlDialectUnmeasured;
  const cRefused = (id, c) => {
    if (c.opened !== false || c.hung) {
      note(`${id}: C ${c.hung ? 'hung' : 'opened'}, expected refused (${JSON.stringify(c).slice(0, 80)})`);
      return;
    }
    if (c.refusal?.code !== 'INVALID_INPUT' || c.refusedAsUnmeasured !== true || typeof unmeasured !== 'string' || c.refusal?.message !== unmeasured) {
      note(`${id}: C was refused with ${JSON.stringify(c.refusal).slice(0, 100)}, not the control gate's CONTROL_DIALECT_UNMEASURED`);
    }
    if (c.spawns !== 0) note(`${id}: C spawned ${String(c.spawns)} far control children while refused, expected 0`);
  };

  for (const id of ids) {
    const cell = targets[id];
    if (cell === null || typeof cell !== 'object' || cell.fatal) {
      note(`${id}: no cell (${JSON.stringify(cell).slice(0, 120)})`);
      continue;
    }
    const role = cell.role;
    if (role !== 'new' && role !== 'control') continue;
    noteClaims(id, cell);
    wellFormed(id, cell);
    scrollAndAttach(id, cell);
    checkDArm(id, cell);
    const g = cell.G ?? {};
    if (role === 'control' || !isParent) {
      // A measured string: both gates, no sheet, the plane opens live, C opens.
      if (cell.execGate !== 'measured') note(`${id}: exec gate ${String(cell.execGate)}, expected measured`);
      if (cell.controlGate !== 'measured') note(`${id}: control gate ${String(cell.controlGate)}, expected measured`);
      if (cell.prepare !== 'no sheet, boots') note(`${id}: Prepare ${String(cell.prepare)}, expected "no sheet, boots"`);
      if (g.openControlPlane !== true || g.live !== true) note(`${id}: G ${JSON.stringify(g).slice(0, 100)}, expected open and live`);
      else if (g.spawns !== 1) note(`${id}: G spawned ${String(g.spawns)} far control children, expected exactly 1`);
      cOpen(id, cell.C ?? {});
    } else {
      // A new string at the parent: unmeasured, the sheet, polling, refused.
      if (cell.execGate !== 'unmeasured') note(`${id}: exec gate ${String(cell.execGate)}, expected unmeasured at the parent`);
      if (cell.controlGate !== 'unmeasured') note(`${id}: control gate ${String(cell.controlGate)}, expected unmeasured at the parent`);
      if (cell.prepare !== 'acceptance sheet offered') note(`${id}: Prepare ${String(cell.prepare)}, expected the acceptance sheet at the parent`);
      if (g.openControlPlane !== false || g.linkKind !== 'polling' || !/runs a version Tortie has not measured/.test(String(g.reason))) {
        note(`${id}: G ${JSON.stringify(g).slice(0, 120)}, expected false with polling / runs a version Tortie has not measured`);
      }
      if (g.spawns !== 0) note(`${id}: G spawned ${String(g.spawns)} far control children at the parent, expected 0`);
      cRefused(id, cell.C ?? {});
    }
    if (role === 'new') {
      sameAsReference(id, cell);
      const k = dialectDiff(ref, cell);
      if (k !== null) note(`${id}: its dialect differs from the 3.6a control at ${k}`);
    }
  }

  // Pairs and crossing pairs (§6.4).
  const pairs = results.pairs ?? {};
  const wantPairs = ['3.6-under-3.7b', '3.6b-under-3.7c', '3.5a-under-3.6', '3.5a-under-3.6b'];
  for (const tag of wantPairs) if (!(tag in pairs)) note(`pair ${tag}: not run`);
  for (const [tag, p] of Object.entries(pairs)) {
    if (p.error) note(`pair ${tag}: ${p.error}`);
    const c = p.C ?? {};
    if (tag === '3.6-under-3.7b' || tag === '3.6b-under-3.7c') {
      const server = tag.split('-under-')[0];
      if (p.versionRead !== server) note(`pair ${tag}: the version read ${JSON.stringify(p.versionRead)}, expected ${server}`);
      const want = isParent ? 'unmeasured' : 'measured';
      if (p.execGate !== want || p.controlGate !== want) note(`pair ${tag}: gates ${String(p.execGate)}/${String(p.controlGate)}, expected ${want}`);
      if (isParent) cRefused(`pair ${tag}`, c);
      else if (c.opened !== true || c.spawns !== 1) note(`pair ${tag}: C ${JSON.stringify(c).slice(0, 80)}, expected open with one spawn`);
      const d = p.D ?? {};
      if (d.greeted !== true || d.spawns !== 1) note(`pair ${tag}: D ${JSON.stringify(d).slice(0, 80)}, expected greeted with one spawn`);
      const a = p.A ?? {};
      if (a.drew !== true || a.exitCode !== 0) note(`pair ${tag}: A ${JSON.stringify(a).slice(0, 80)}, expected drawn and exit 0`);
    } else {
      if (p.versionRead !== '3.5a') note(`crossing pair ${tag}: the version read ${JSON.stringify(p.versionRead)}, expected 3.5a`);
      if (p.execGate !== 'unmeasured' || p.controlGate !== 'unmeasured') note(`crossing pair ${tag}: gates ${String(p.execGate)}/${String(p.controlGate)}, expected unmeasured`);
      cRefused(`crossing pair ${tag}`, c);
      if (typeof p.D !== 'string' || !p.D.startsWith('not run')) note(`crossing pair ${tag}: D ran, which §6.4 says would hang`);
    }
  }

  // The rolled-back program (§6.4): refused, server alive with the same pid, no child.
  const rollback = results.rollback ?? {};
  for (const tag of ['3.6-under-3.5a', '3.6a-under-3.5a', '3.6b-under-3.5a']) if (!(tag in rollback)) note(`rollback ${tag}: not run`);
  for (const [tag, r] of Object.entries(rollback)) {
    if (r.error) note(`rollback ${tag}: ${r.error}`);
    if (r.C?.opened !== false || r.C?.hung) note(`rollback ${tag}: C ${JSON.stringify(r.C).slice(0, 80)}, expected the precheck to refuse`);
    if (r.controlSpawns !== 0) note(`rollback ${tag}: ${String(r.controlSpawns)} far control children spawned, expected 0`);
    if (r.controlChildrenAlive !== 0) note(`rollback ${tag}: ${String(r.controlChildrenAlive)} control children alive, expected 0`);
    if (r.serverAlive !== true || r.pidUnchanged !== true) note(`rollback ${tag}: server alive ${String(r.serverAlive)}, pid unchanged ${String(r.pidUnchanged)}, expected both`);
  }

  // The downgrade (the fix round): a live connection whose program becomes
  // 3.5a in place, then reconnects. It must ask the server before it spawns,
  // spawn nothing, and leave the server, its pid and its session as they were.
  // At the parent only the 3.6a control opens; 3.6 and 3.6b are not measured
  // there, so openControlPlane answers false and there is nothing to reconnect.
  const downgrade = results.downgrade ?? {};
  for (const tag of ['3.6-to-3.5a', '3.6b-to-3.5a', '3.6a-to-3.5a']) if (!(tag in downgrade)) note(`downgrade ${tag}: not run`);
  for (const [tag, r] of Object.entries(downgrade)) {
    if (r.error) note(`downgrade ${tag}: ${r.error}`);
    const server = tag.split('-to-')[0];
    if (isParent && server !== REF) {
      if (r.opened !== false) note(`downgrade ${tag}: opened at the parent, where ${server} is not measured`);
      if (r.spawnsBeforeDowngrade !== 0) note(`downgrade ${tag}: ${String(r.spawnsBeforeDowngrade)} far control children at the parent, expected 0`);
      continue;
    }
    if (r.opened !== true || r.live !== true) {
      note(`downgrade ${tag}: the connection did not open live (${JSON.stringify(r).slice(0, 120)})`);
      continue;
    }
    if (r.spawnsBeforeDowngrade !== 1) note(`downgrade ${tag}: ${String(r.spawnsBeforeDowngrade)} far control children before the downgrade, expected exactly 1`);
    if (r.detachExit !== 0) note(`downgrade ${tag}: the probe's detach-client exited ${String(r.detachExit)}, so the reconnect may never have run`);
    if (typeof r.readsAfterDowngrade !== 'number' || r.readsAfterDowngrade < 1) {
      note(`downgrade ${tag}: ${String(r.readsAfterDowngrade)} version reads after the downgrade; the reconnect must ask the server through the program before it spawns anything`);
    }
    if (r.controlSpawnsAfterDowngrade !== 0) note(`downgrade ${tag}: ${String(r.controlSpawnsAfterDowngrade)} far control child(ren) spawned through the downgraded program`);
    if (r.controlChildrenAlive !== 0) note(`downgrade ${tag}: ${String(r.controlChildrenAlive)} control children alive after the connection was closed, expected 0`);
    if (r.serverAlive !== true || r.pidUnchanged !== true) note(`downgrade ${tag}: server alive ${String(r.serverAlive)}, pid unchanged ${String(r.pidUnchanged)}, expected both`);
    if (r.heldSessionPresent !== true) note(`downgrade ${tag}: the held session is gone`);
    if (r.freshServerPid !== undefined) note(`downgrade ${tag}: a fresh server (pid ${String(r.freshServerPid)}) was started on the socket`);
    if (r.linkKindAfter === 'connected') note(`downgrade ${tag}: the link reads connected after a reconnect that should have been refused`);
  }

  // The ablated cell (§6.4): the live half of the proof the precheck guards something.
  const ab = results.ablated;
  const ablatedRan = ab !== null && typeof ab === 'object';
  if (ablatedRan) {
    if (ab.error) note(`ablated cell: ${ab.error}`);
    if (ab.serverEnded !== true) note('ablated cell: the 3.6 server did NOT end under a precheck-free 3.5a program (§6.4 requires it to)');
    if (typeof ab.controlSpawns !== 'number' || ab.controlSpawns < 1) note(`ablated cell: ${String(ab.controlSpawns)} far control children spawned, expected at least 1`);
  } else if (results.ablatePrecheck !== false) {
    note(`ablated cell: ${String(ab)}, though P324_ABLATE_PRECHECK did not turn it off`);
  }

  // His world (§6.7 last block), re-derived from argv.log.
  const world = hisWorld(argvText, ablatedRan ? 'p324-abl-' : null);
  process.stdout.write('\nhis world (from argv.log):\n');
  process.stdout.write(`  far strings handed to far-sh: ${String(world.farStrings)}\n`);
  process.stdout.write(`  strings REFUSED by far-sh: ${String(world.refused)}\n`);
  process.stdout.write(`  strings naming a socket that is not p324-, or a -S path: ${String(world.realSocket)}\n`);
  process.stdout.write(`  far strings without -L p324- other than -V reads and the PATH capture: ${String(world.strayNoSocket)}\n`);
  process.stdout.write(
    `  far control children: ${String(world.controlSpawns)}, of which without a #{version} read of the same socket through the same program just before: ` +
      `${String(world.unguardedOutsideAblated.length)} outside the ablated cell, ${String(world.unguardedInAblated)} in it\n`
  );
  process.stdout.write(`  tmux processes left on this run's sockets: ${String(results.tmuxLeftOnOwnSockets ?? 'unknown')} (on any -L p324- socket: ${String(results.tmuxLeftOnAnyP324 ?? 'unknown')})\n`);
  // THE RULED ROUND: a window by mtime over DiagnosticReports and its Retired
  // directory, because macOS rotates the top level and a before and after count
  // of it can stand still while a run writes a report (tmuxIpsSince in the
  // driver). Names only.
  const ipsWritten = Array.isArray(results.ipsWrittenDuringRun) ? results.ipsWrittenDuringRun : null;
  process.stdout.write(
    `  tmux-*.ips crash reports written during this run (DiagnosticReports and Retired, by mtime): ` +
      `${ipsWritten === null ? 'unknown' : `${String(ipsWritten.length)}${ipsWritten.length > 0 ? ` (${ipsWritten.join(', ')})` : ''}`}\n`
  );
  if (Array.isArray(results.envNames)) process.stdout.write(`  environment names the far side saw: ${results.envNames.join(' ')}\n`);

  if (world.farStrings === 0) note('argv.log holds no far string at all, so nothing here was read');
  if (world.refused > 0) note(`${String(world.refused)} far string(s) were REFUSED by the stand-in`);
  if (world.realSocket > 0) note(`${String(world.realSocket)} string(s) named a socket that is not p324-, or a -S path`);
  if (world.strayNoSocket > 0) note(`${String(world.strayNoSocket)} far string(s) were not one of the three shapes`);
  if (world.unguardedOutsideAblated.length > 0) {
    note(`${String(world.unguardedOutsideAblated.length)} far control child(ren) spawned with no #{version} read through the same program first: ${world.unguardedOutsideAblated.join(', ')}`);
  }
  if (ablatedRan && world.unguardedInAblated < 1) note('the ablated cell spawned no unguarded child, so the precheck-before-spawn reading cannot be shown to see one');
  if (results.tmuxLeftOnOwnSockets !== 0) note(`${String(results.tmuxLeftOnOwnSockets)} tmux process(es) left on this run's sockets`);
  if (Array.isArray(results.envNames)) {
    const leaked = results.envNames.filter((n) => n === 'TMUX' || n === 'TMUX_PANE' || n === 'TMUX_TMPDIR' || n.startsWith('GMUX_'));
    if (leaked.length > 0) note(`the driver's environment carried ${leaked.join(', ')}`);
  }

  process.stdout.write('\n');
  if (problems.length === 0) {
    process.stdout.write(`PASS: every ${isParent ? 'parent' : 'HEAD'} expectation in §6.7 held, the notes' claims held, his world is clean.\n`);
    return true;
  }
  process.stdout.write(`FAIL: ${String(problems.length)} problem(s):\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  return false;
}

function runJudge(dir) {
  let results;
  let argvText = '';
  try {
    results = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
    argvText = readFileSync(join(dir, 'argv.log'), 'utf8');
  } catch (err) {
    process.stderr.write(`probe:p324 --judge could not read ${dir}: ${err.message}\n`);
    process.exit(2);
  }
  process.exit(judge(results, argvText, null) ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Run mode
// ---------------------------------------------------------------------------

function isTmuxVersion(bin, want) {
  const out = spawnSync(bin, ['-V'], { encoding: 'utf8', timeout: 10_000 });
  const printed = (out.stdout ?? '').trim();
  return { ok: printed === `tmux ${want}`, printed };
}

/** Every live descendant of `pid`, read from one process table. */
function descendantsOf(pid) {
  let table = '';
  try {
    table = execFileSync('/bin/ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
  } catch {
    return [];
  }
  const children = new Map();
  for (const line of table.split('\n')) {
    const [a, b] = line.trim().split(/\s+/).map(Number);
    if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
    if (!children.has(b)) children.set(b, []);
    children.get(b).push(a);
  }
  const out = [];
  const stack = [...(children.get(pid) ?? [])];
  while (stack.length > 0) {
    const p = stack.pop();
    out.push(p);
    stack.push(...(children.get(p) ?? []));
  }
  return out;
}

/**
 * End the driver by its pid, but ONLY while it has not exited: once node has
 * seen it exit, the pid is reaped and no longer this probe's.
 */
async function endDriver(driver) {
  if (driver.exited) return;
  try {
    process.kill(driver.child.pid, 'SIGTERM');
  } catch {
    /* gone */
  }
  const until = Date.now() + 15_000;
  while (!driver.exited && Date.now() < until) await sleep(100);
  if (driver.exited) return;
  // Still up: the tree walked from the un-reaped child is still ours.
  for (const p of [...descendantsOf(driver.child.pid), driver.child.pid]) {
    try {
      process.kill(p, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  const until2 = Date.now() + 5_000;
  while (!driver.exited && Date.now() < until2) await sleep(100);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--compare') {
    if (argv.length < 3) refuse('--compare needs <head.json> <parent.json>');
    runCompare(resolve(argv[1]), resolve(argv[2]));
    return;
  }
  if (argv[0] === '--judge') {
    if (argv.length < 2) refuse('--judge needs <run dir> (one kept with P324_KEEP=1)');
    runJudge(resolve(argv[1]));
    return;
  }
  if (argv[0] === '--far-sh-self-test') {
    farShSelfTest();
    return;
  }

  // 1. The platform.
  if (process.platform !== 'darwin') {
    refuse('this probe drives scratch tmux servers on macOS; the platform is not macOS');
  }

  // 2. node-pty must load (the attach arm spawns the shipping attach argv in one).
  try {
    execFileSync(process.execPath, ['-e', "require('node-pty')"], {
      cwd: THIS_CHECKOUT,
      stdio: 'ignore',
      timeout: 20_000
    });
  } catch {
    refuse('node-pty does not load under node here; run npm install');
  }

  // 3. P324_ROOT: the parent checkout when named and valid, else this checkout.
  const parentEnv = (process.env['P324_PARENT_CHECKOUT'] ?? '').trim();
  let P324_ROOT = THIS_CHECKOUT;
  if (parentEnv.length > 0) {
    const p = resolve(parentEnv);
    if (!existsSync(join(p, 'src')) || !existsSync(join(p, 'node_modules'))) {
      refuse(
        `P324_PARENT_CHECKOUT ${p} lacks src/ or node_modules/; make it with ` +
          `git -C ${THIS_CHECKOUT} archive <parent> | tar -x -C <dir> and cp -Rc node_modules`
      );
    }
    P324_ROOT = p;
  }
  if (!existsSync(join(P324_ROOT, 'tsconfig.node.json'))) {
    refuse(`${P324_ROOT} has no tsconfig.node.json; the tsx driver needs it for the @shared alias`);
  }

  // 4. The builds. Always from THIS checkout's build/vendor, whichever src/ is
  //    under test.
  const vendor = join(THIS_CHECKOUT, 'build', 'vendor');
  const probeBin = (v) => join(vendor, 'tmux-probe', v, 'bin', 'tmux');
  const HOMEBREW_36A = '/opt/homebrew/Cellar/tmux/3.6a/bin/tmux';
  const VENDORED_37B = join(vendor, 'tmux', 'bin', 'tmux');

  for (const v of ['3.6', '3.6b', '3.7c', '3.5a']) {
    const bin = probeBin(v);
    if (!existsSync(bin)) {
      refuse(`the probe build for ${v} is missing at ${bin}; make it with node build/build-tmux-version.mjs ${v}`);
    }
    const check = isTmuxVersion(bin, v);
    if (!check.ok) {
      refuse(
        `the probe build at ${bin} prints ${JSON.stringify(check.printed)} rather than "tmux ${v}"; ` +
          `rebuild it with node build/build-tmux-version.mjs ${v}`
      );
    }
  }
  if (!existsSync(HOMEBREW_36A)) {
    refuse(`Homebrew's tmux 3.6a is missing at ${HOMEBREW_36A}; it is the 3.6a control this probe compares against`);
  }
  {
    const check = isTmuxVersion(HOMEBREW_36A, '3.6a');
    if (!check.ok) refuse(`${HOMEBREW_36A} prints ${JSON.stringify(check.printed)} rather than "tmux 3.6a"`);
  }
  if (!existsSync(VENDORED_37B)) {
    refuse(`the vendored tmux is missing at ${VENDORED_37B}; run npm run vendor:tmux`);
  }
  {
    const check = isTmuxVersion(VENDORED_37B, '3.7b');
    if (!check.ok) refuse(`${VENDORED_37B} prints ${JSON.stringify(check.printed)} rather than "tmux 3.7b"`);
  }

  // 5. The targets, in a fixed order. 3.6 and 3.6b are the new strings; 3.6a,
  //    3.7b and 3.7c are the controls; 3.5a is the pair/rollback program only.
  const targets = [
    { id: '3.6', bin: probeBin('3.6'), role: 'new' },
    { id: '3.6b', bin: probeBin('3.6b'), role: 'new' },
    { id: '3.6a', bin: HOMEBREW_36A, role: 'control' },
    { id: '3.7b', bin: VENDORED_37B, role: 'control' },
    { id: '3.7c', bin: probeBin('3.7c'), role: 'control' },
    { id: '3.5a', bin: probeBin('3.5a'), role: 'pair' }
  ];

  // Extras: P324_EXTRA=<id>=<abs path>,… each judged against 3.6a.
  const extraEnv = (process.env['P324_EXTRA'] ?? '').trim();
  if (extraEnv.length > 0) {
    for (const spec of extraEnv.split(',')) {
      const eq = spec.indexOf('=');
      if (eq <= 0) refuse(`P324_EXTRA entry ${JSON.stringify(spec)} is not <id>=<abs path>`);
      const id = spec.slice(0, eq).trim();
      const path = spec.slice(eq + 1).trim();
      if (!/^[A-Za-z0-9._-]+$/.test(id) || targets.some((t) => t.id === id)) {
        refuse(`P324_EXTRA id ${JSON.stringify(id)} is not a plain name, or it repeats a target`);
      }
      if (!isAbsolute(path) || !existsSync(path) || !new RegExp(`^/[${PATH_CHARS}]+/tmux$`).test(path)) {
        refuse(`P324_EXTRA build ${id} at ${JSON.stringify(path)} is not an absolute path ending /tmux to an existing binary`);
      }
      const out = spawnSync(path, ['-V'], { encoding: 'utf8', timeout: 10_000 });
      if ((out.status ?? -1) !== 0) refuse(`P324_EXTRA build ${id} at ${path} did not answer -V`);
      targets.push({ id, bin: path, role: 'new' });
    }
  }

  // 6. The run directory and the socket-name refusal. Every socket the driver
  //    uses is p324-…-<pid>; refuse the two real names before anything starts
  //    (refuseRealSockets exits 2 itself).
  const scratchBase = (process.env['P324_RUN'] ?? '').trim() || join(process.env['TMPDIR'] ?? '/tmp', `p324-probe-${String(process.pid)}`);
  const RUN = resolve(scratchBase);
  refuseRealSockets(`p324-run-${String(process.pid)}`, 'probe:p324');
  mkdirSync(RUN, { recursive: true });
  mkdirSync(join(RUN, 'home'), { recursive: true });

  // 6a. The far-sh stand-in (§6.2).
  const ARGV_LOG = join(RUN, 'argv.log');
  writeFileSync(ARGV_LOG, '');
  const FAR_SH = writeFarSh(RUN);

  // 7. The driver's environment is BUILT, not inherited (§6.2).
  const childEnv = {
    HOME: join(RUN, 'home'),
    SHELL: '/bin/sh',
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    LANG: 'en_US.UTF-8',
    TERM: 'xterm-256color',
    USER: process.env['USER'] ?? '',
    LOGNAME: process.env['LOGNAME'] ?? process.env['USER'] ?? '',
    TMPDIR: process.env['TMPDIR'] ?? '/tmp/',
    P324_ROOT,
    P324_RUN: RUN,
    P324_FAR_SH: FAR_SH,
    P324_ARGV_LOG: ARGV_LOG,
    P324_TARGETS: JSON.stringify(targets),
    P324_REFERENCE: '3.6a',
    P324_REAL_HOME: process.env['HOME'] ?? ''
  };
  if ((process.env['P324_ABLATE_PRECHECK'] ?? '') === '0') childEnv['P324_ABLATE_PRECHECK'] = '0';
  if (parentEnv.length > 0) childEnv['P324_PARENT_CHECKOUT'] = P324_ROOT;

  // 8. Run the driver through the pinned tsx. It is THIS checkout's file (the
  //    parent archive does not carry build/p324/), with P324_ROOT pointing the
  //    shipping imports at the checkout under test. cwd and --tsconfig at
  //    P324_ROOT so the @shared alias resolves against that checkout.
  const driverFile = join(THIS_CHECKOUT, 'build', 'p324', 'drive-p324.mts');
  const started = Date.now();
  const driver = { child: null, exited: false, code: null };
  let stopping = null;
  const onSignal = () => {
    if (stopping !== null) return;
    stopping = endDriver(driver).finally(() => {
      if (!keep()) tidy(RUN);
      process.exit(130);
    });
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, onSignal);
  let exitStatus = 1;
  let wallTimer = null;
  try {
    driver.child = spawn(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverFile], {
      cwd: P324_ROOT,
      env: childEnv,
      stdio: ['ignore', 'inherit', 'inherit']
    });
    const done = new Promise((res) => {
      driver.child.on('exit', (code, signal) => {
        driver.exited = true;
        driver.code = code ?? (signal ? 128 : 1);
        res();
      });
      driver.child.on('error', (err) => {
        process.stderr.write(`probe:p324: the driver did not start: ${err.message}\n`);
        driver.exited = true;
        driver.code = 1;
        res();
      });
    });
    wallTimer = setTimeout(() => {
      process.stderr.write('probe:p324: the driver passed its 20 minute deadline and is being ended\n');
      void endDriver(driver);
    }, 20 * 60_000);
    await done;
    exitStatus = driver.code ?? 1;
  } finally {
    if (wallTimer !== null) clearTimeout(wallTimer);
    await endDriver(driver);
  }
  if (stopping !== null) return;
  const wallMs = Date.now() - started;

  // 9. Read results.json, print the matrix, evaluate the expectations.
  const resultsPath = join(RUN, 'results.json');
  let results = null;
  try {
    results = JSON.parse(readFileSync(resultsPath, 'utf8'));
  } catch {
    process.stderr.write(`probe:p324: the driver wrote no readable results.json (tsx exit ${String(exitStatus)})\n`);
    if (!keep()) tidy(RUN);
    process.exit(1);
  }
  if (out()) {
    try {
      mkdirSync(out(), { recursive: true });
      copyFileSync(resultsPath, join(out(), 'results.json'));
    } catch (err) {
      process.stderr.write(`probe:p324: could not write to P324_OUT: ${err.message}\n`);
    }
  }
  let argvText = '';
  try {
    argvText = readFileSync(ARGV_LOG, 'utf8');
  } catch {
    /* judged as empty, which fails */
  }
  const verdict = judge(results, argvText, wallMs);
  if (exitStatus !== 0) process.stdout.write(`the driver exited ${String(exitStatus)}\n`);

  if (!keep()) tidy(RUN);
  else process.stdout.write(`\nP324_KEEP=1: run directory kept at ${RUN}\n`);

  process.exit(verdict && exitStatus === 0 ? 0 : 1);
}

function keep() {
  return (process.env['P324_KEEP'] ?? '') === '1';
}
function out() {
  const o = (process.env['P324_OUT'] ?? '').trim();
  return o.length > 0 ? resolve(o) : null;
}
function tidy(RUN) {
  try {
    rmSync(RUN, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

main().catch((err) => {
  process.stderr.write(`probe:p324: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
