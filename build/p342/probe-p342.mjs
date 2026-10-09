#!/usr/bin/env node
/**
 * `npm run probe:p342`. Phase 342's app run (build/p342/SPEC.md §7.5 to §7.7):
 * the Linux matrix in the app, on the distributions' own tmux, graded at HEAD
 * with the parent's reading printed beside it. VERIFIERS ONLY, UNDER THE LOCK.
 *
 * ## It sanitises ITSELF first
 *
 * `npm run probe:p342` inherits the person's environment. So the FIRST
 * statements of this file, before any module of this repository runs code
 * (build/electron-run.mjs and build/docker-run.mjs are imported statically,
 * because gate:electron and gate:docker count a helper user by its static
 * import; both define constants and functions at load and read no environment
 * until they are called), point `HOME` and `ZDOTDIR` at a scratch folder under
 * the harness directory, set `HISTFILE=/dev/null`, delete `SSH_AUTH_SOCK` and
 * `TERM_SESSION_ID`, and exit 2 BY NAME if `SSH_AUTH_SOCK` is still set.
 *
 * ## The machines are throwaway containers (his ruling of 2026-10-05)
 *
 * "you can do the docker tests but make sure to clean them up". Every
 * container is made and removed by build/docker-run.mjs's `withContainers`:
 * the distribution's own image, `--rm`, `--pull never`, a FIXED
 * `127.0.0.1:<port>:22`, `sleep 7200` as its main process, no mount; its tmux
 * from its own package manager; `tortie` with bash and `tortiesh` with the
 * distribution's `useradd` default, each holding the run's own public key; an
 * sshd (dropbear on the emulated Arch row, D28). Every container and every
 * image the run pulled is removed in a `finally`, and Docker's lists are then
 * compared with the ones read before the first command; RUN fails on any
 * difference. Rows: `u2204` `u2404` `u2604` `d12` `d13` `fed` `arch`, narrowed
 * by `P342_ROWS`.
 *
 * Each far machine gets, as `tortie`: `~/proj` (a git repository with a 644
 * `a.txt`, a 755 `sub/` and a link `link` to `~/real`, which holds
 * `inner/f`), `~/cost $d`, `~/child`, and as root a `claude` stand-in at
 * /usr/local/bin/claude (it prints a line and plants the committed transcript
 * docs/research/assets/63-fixtures/claude-session.jsonl under the session's
 * own id, so no vendor program runs and no token is spent) and the key
 * recorder build/p342/key-recorder.sh at /usr/local/bin/p342-key-recorder.
 *
 * ## The app reaches them ONLY through the run's own ssh_config (D26)
 *
 * An ssh wrapper named by `GMUX_SSH_BIN`, `exec /usr/bin/ssh -F <run>/ssh_config
 * "$@"`, whose config names `Host p342-<row>`, `HostName 127.0.0.1`, the
 * container's FIXED published port, `User tortie`, the run's key with
 * `IdentitiesOnly yes`, `IdentityAgent none` and `GlobalKnownHostsFile
 * /dev/null`; the product's own `-o UserKnownHostsFile` (Tortie's file first)
 * beats the config, so the first-seen question is Tortie's own. The tailnet is
 * build/p340/tailscale-peers.mjs behind `GMUX_TAILSCALE_BIN`, over a fixture
 * this run writes listing one Linux peer per container (`p342-<row>`). Both
 * wrappers, the stand-in and its fixture are PREFLIGHTED BY SHA256 before
 * every launch. WHILE AN ELECTRON RUNS a sampler reads `ps` every second and
 * FAILS THE RUN on any /usr/bin/ssh of this run whose first two arguments are
 * not `-F <that config>`, and on any real Tailscale.
 *
 * ## What it drives, one Electron at a time
 *
 * THE PARENT FIRST when `P342_PARENT_CHECKOUT` names a built checkout of the
 * phase's parent (`35a9a390` for the tree as rebuilt after the reboot of
 * 2026-10-08), then HEAD, each through build/electron-run.mjs's `withElectron`,
 * ended in its `finally`, on a scratch profile and HOME of its own, the
 * harness socket (which is also the far socket; nothing names `-L gmux`),
 * `--use-mock-keychain`, and a scratch agents.json renaming the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries (read back through agents:list). Per
 * row (SPEC §7.5 item 3): L1 add, L2 Prepare's reading by the probe's OWN far
 * read, L3 create (`cost $HOME é`, and one in `~/cost $d` whose folder and
 * project are read through the bridge), L4 the live connection (a stranger
 * never shown, a rename to `$HOME notes` arriving as `_HOME notes`), L5 scroll
 * back (with the probe's own `copy-mode -e` as the control that proves a box
 * can be seen), L6 restore across a `docker restart`, L7 save, L8 New Folder
 * and its rename, L9 a linked folder, L10 Catch Me Up's reader, L11 stage and
 * commit, L12 keys. Then the attack (§7.7): K1 a tmux that refuses what the
 * table says it takes, K2 a version string that lies, K3 tmux upgraded under a
 * running server (with a relaunch and a restart), and K3's counter-arm on
 * Debian 12. N1, the loopback machine, runs with `P342_FAR=loopback` instead
 * of containers (build/scratch-machine.mjs, as probe:p340 builds it). N2, his
 * Mac Pro, is build/p342/CHECKLIST.md's: this file never reaches his machine.
 *
 * ## What the fix round changed (the verifier's major 2)
 *
 * The parent is driven through Add a machine exactly as HEAD is (pick the
 * peer and nothing more; it pressed a typed-address button that is not
 * there). L1 reads the found row's text, not its title. L5 and L12 wait until
 * the attach has reached the far session before they type. L6 presses Prepare
 * after the restart, because a boot empties /tmp and a missing socket proves
 * nothing, and keeps a trail of every status it read. L10 reads the `remote`
 * line Catch Me Up answers for every session on another machine, and a Codex
 * stand-in's conversation copied back to this Mac, once after every row within
 * one eleven-minute deadline. K3 sets up its own running 3.5a server, session
 * and live connection, or reads UNREADABLE. Every grader clause requires the
 * readings it compares (an absent one is `not read: <field>`), and L2 checks
 * all twelve options. Rebuilt from the fix round's report after the reboot of
 * 2026-10-08.
 *
 * ## What the second fix round changed (the second verifier's major)
 *
 * Run whole, the probe answered FAIL with 17 failures, and the second
 * verifier's own drive showed none of them was the product:
 *  - L10: the bridge's `overview.sessions` REJECTS a project on another
 *    machine at both builds (it runs this Mac's git there), so the line is
 *    read as `remote` or `refused` and must equal the parent's on a row the
 *    parent read; and the far account's agent stores are emptied before each
 *    build, because HEAD's Codex copy was the PARENT's conversation in the
 *    same folder.
 *  - L6 reads the restored pane's folder from `/proc/<pane_pid>/cwd`, never
 *    from tmux 3.4's `#{pane_current_path}`, which adds a backslash before
 *    `$` and a letter on output.
 *  - K3 and K3d12 run at HEAD alone (they change a row's tmux package, and
 *    the parent's K3d12 left Debian 12 on 3.5a for HEAD's rows), and every
 *    row's version is read again before HEAD; the broken downgrade is gone.
 *  - K3's relaunch waits for the far ssh server's greeting, records Prepare's
 *    answer (`afterRestartPrepare`), and waits for the row, the link and K3's
 *    OWN session rather than reading each once.
 *  - N1 starts the yard's sshd, signs in with the yard's own key, requires the
 *    far HOME to be the yard's, reads the far side with BSD's spellings, and
 *    reads the twelve options back rather than a constant it wrote itself.
 *  - An arm the parent cannot be driven through by design (every arm after L1
 *    on a row it did not read Ready; K3 and K3d12) is recorded `notDriven`,
 *    never UNREADABLE, so a run whose every HEAD arm passes exits 0. A parent
 *    row offered the acceptance sheet waits 20 s for Ready, not 180.
 *  - L3 on a row with no UTF-8 `LANG` requires `cost $HOME _` exactly.
 *
 * ## The grader is pure and proved before it is trusted
 *
 * `--grader-self-test` grades build/p342/fixtures/head-honest.json and
 * parent-honest.json (HAND-WRITTEN to the shape an honest run records,
 * because no builder launches Electron) and hostile.json, where every grader
 * is broken alone on a realistic misreading and must fail EXACTLY the
 * clauses it names. It starts nothing. `P342_KEEP=1` keeps a real run's
 * records for a verifier, who may replace the fixtures with them.
 *
 * Knobs: `P342_PARENT_CHECKOUT`, `P342_ROWS`, `P342_ARMS` (a comma list of arm
 * ids), `P342_FAR` (`loopback` for N1), `P342_KEEP=1`, `P342_OUT_DIR`. Exit 0
 * when every arm passed, 1 when one failed, 2 when it could not run or an arm
 * could not be READ, which is never a pass. Cost: 651 to 716 s for both
 * builds over seven rows (exit 0, the second fix round, 2026-10-08), 2,667 s
 * before that round cut the parent's waits; N1 about 50 s.
 *
 *   npm run -s probe:p342
 *   node build/p342/probe-p342.mjs --grader-self-test
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The two modules of this repository imported statically: each defines
// constants and functions at load and reads no environment until it is
// called, and gate:electron and gate:docker count a helper user by this
// static import. Every other module is loaded inside run(), after the
// sanitising below.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { assertDockerAsFound, lastReport, withContainers } from '../docker-run.mjs';

// ===========================================================================
// 0. THE SANITISING. First, before any module of this repository runs code.
// ===========================================================================

const SELF_TEST = process.argv.includes('--grader-self-test');
/** His real home, from the account record, used ONLY to stat two history files. */
const REAL_HOME = userInfo().homedir;
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
const SCRATCH_HOME = HARNESS_DIR === '' ? '/var/empty' : join(HARNESS_DIR, 'p342', 'home');
process.env['HOME'] = SCRATCH_HOME;
process.env['ZDOTDIR'] = SCRATCH_HOME;
process.env['HISTFILE'] = '/dev/null';
delete process.env['SSH_AUTH_SOCK'];
delete process.env['TERM_SESSION_ID'];
if (process.env['SSH_AUTH_SOCK'] !== undefined) {
  process.stderr.write('[p342] REFUSED. SSH_AUTH_SOCK is still set after the sanitising.\n');
  process.exit(2);
}

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const FIXTURES = join(dirname(HERE), 'fixtures');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ===========================================================================
// 1. THE PURE RULES the run and the self-test share. Nothing here starts a
//    process.
// ===========================================================================

/** The version each row's own package manager installs (SPEC §14 M1). */
export const ROW_VERSION = Object.freeze({ u2204: '3.2a', d12: '3.3a', u2404: '3.4', d13: '3.5a', u2604: '3.6', fed: '3.7c', arch: '3.7c' });
/** The four versions D1 adds, which Prepare could not set up at the parent. */
export const OLDER = Object.freeze(['3.2a', '3.3a', '3.4', '3.5a']);
/** What each version refuses, as build/fixtures/p342/matrix.json measured it (D7). */
export const REFUSES = Object.freeze({
  '3.2a': ['allow-passthrough', 'copy-mode-position-format', 'mode-style'],
  '3.3a': ['copy-mode-position-format', 'mode-style'],
  '3.4': ['copy-mode-position-format', 'mode-style'],
  '3.5a': ['copy-mode-position-format', 'mode-style'],
  '3.6': [],
  '3.7c': []
});
/** D10's four sentences, by the words a person reads. */
export const SENTENCE = Object.freeze({
  tooOld: "This machine's tmux is too old for Tortie.",
  settingRefused: "is too old for one of Tortie's settings",
  updated: "This machine's tmux was updated while its sessions kept running.",
  disagrees: "This machine's tmux is not the version it says.",
  unreached: 'could not reach'
});
/** The far name of a session the person called `$HOME notes` (D12). */
export const DOLLAR_RENAME = '$HOME notes';
export const DOLLAR_FAR = '_HOME notes';
/** The first session's display name (L3). */
export const COST_NAME = 'cost $HOME é';
/**
 * THE SECOND FIX ROUND. What a far server whose ssh session has no UTF-8
 * `LANG` lists that name as: every character outside ASCII as one `_`, as
 * every such row measured (`cost $HOME _`). Exact, so `cost $HOMEWORK` fails.
 */
export const COST_NAME_ASCII = COST_NAME.replace(/[^\x00-\x7f]/g, '_');
/**
 * THE SECOND FIX ROUND. What `overview.sessions` answers for a project on
 * another machine, at the parent AND at HEAD: it rejects, because it runs
 * this Mac's git in a folder that is on the other machine ("Git is not
 * installed (or not on PATH)…"). L10 records that answer as `refused` and the
 * `remote` line as `remote`; both are what both builds say, and this phase
 * moved neither (src/main/overview/ is not in its delta).
 */
export const OVERVIEW_ANSWERS = Object.freeze(['remote', 'refused']);

/** tmux's copy-mode position box in a drawn row, `[30/2977]`. */
export function box(row0) {
  return /\[\d+\/\d+\]/.test(String(row0 ?? ''));
}

/** One `ps -Ao pid=,ppid=,args=` table, as rows. */
export function parsePs(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line))
    .filter((m) => m !== null)
    .map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), args: m[3] }));
}

/** Every pid under `root`, `root` included. */
export function descendantsIn(rows, root) {
  const out = new Set([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (!out.has(r.pid) && out.has(r.ppid)) {
        out.add(r.pid);
        grew = true;
      }
    }
  }
  return out;
}

/**
 * The sampler's rule (D26): an /usr/bin/ssh of this run (under the launch, or
 * naming the run's directory) whose first two arguments are not `-F <config>`
 * reached past the run's own configuration; any real Tailscale is his.
 */
export function samplerViolations(rows, { launchPid, runDir, config }) {
  const mine = descendantsIn(rows, launchPid);
  const out = [];
  for (const r of rows) {
    const words = r.args.split(/\s+/);
    const isSsh = /(?:^|\/)ssh$/.test(words[0] ?? '') && (words[0] === '/usr/bin/ssh' || words[0] === 'ssh');
    const ofRun = mine.has(r.pid) || r.args.includes(runDir);
    if (isSsh && ofRun && !(words[1] === '-F' && words[2] === config)) out.push({ why: 'an ssh of this run without the run’s own -F config first', args: r.args });
    if (/\/(?:Tailscale\.app|tailscaled|tailscale)(?:\s|$)/.test(r.args) && !r.args.includes(runDir) && mine.has(r.pid)) out.push({ why: 'a real Tailscale under the app', args: r.args });
  }
  return out;
}

/** The twelve options as Prepare writes them on a version that takes them all (§5.1). */
export const WANT_OPTIONS = Object.freeze({
  status: 'off',
  'escape-time': '0',
  'extended-keys': 'on',
  'allow-passthrough': 'on',
  'focus-events': 'on',
  'default-terminal': 'tmux-256color',
  'remain-on-exit': 'failed',
  'exit-empty': 'off',
  mouse: 'off',
  'copy-mode-position-format': '',
  'mode-style': 'noattr,bg=default,fg=default',
  'history-limit': '25000'
});

/**
 * What the probe's own far read must find for one option on one version: the
 * value Prepare wrote, its fallback where the version lacks the row, or null
 * (no such option to read) where the version refuses it and Tortie skips it.
 */
export function wantOption(version, name) {
  const refuses = REFUSES[version] ?? [];
  if (name === 'mode-style' && refuses.includes('mode-style')) return 'bg=default,fg=default';
  if (refuses.includes(name)) return null;
  return WANT_OPTIONS[name];
}

/**
 * THE FIX ROUND. The readings each arm needs. A reading that is ABSENT is a
 * failure that names it, never a pass: the verifier's broken records showed a
 * grader comparing two absent fields and reading them equal (L3's folder, L7's
 * checksum, L12's bytes), and a missing list read as an empty one (K1b).
 */
export const REQUIRED = Object.freeze({
  L1: ['peerListed', 'found', 'version', 'acceptSheet', 'ready', 'typed', 'detail'],
  L2: ['options', 'detail'],
  L3: ['farName', 'utf8', 'listedName', 'dollarCwd', 'dollarProject', 'wantDollarCwd'],
  L4: ['link', 'strangerShown', 'renamedArrived', 'dollarFar'],
  L5: ['attached', 'inMode', 'position', 'row0', 'controlRow0', 'liveAgain'],
  L6: ['trail', 'prepareAfterRestart', 'restorable', 'restored', 'path', 'wantPath', 'dollarPath', 'wantDollarPath'],
  L7: ['outcome', 'sha', 'wantSha', 'mode', 'parts'],
  L8: ['made', 'mode', 'renamed', 'child', 'homeRefused'],
  L9: ['linkKind', 'linkMark', 'inner'],
  L10: ['line', 'codexSha', 'codexWantSha'],
  L11: ['staged', 'committed', 'subject', 'porcelain'],
  L12: ['attached', 'got', 'want'],
  K1a: ['cls', 'ready', 'detail'],
  K1b: ['cls', 'headline', 'detail', 'historyLimit', 'afterRefusal'],
  K2b: ['cls', 'headline', 'detail', 'afterBoot', 'serverLeft'],
  K3: [
    'setUp', 'cls', 'headline', 'detail', 'ms', 'oldLiveAnswered', 'spawnsAfterDrop', 'listed', 'unknown', 'chip',
    'attachRefused', 'attachSshT', 'saveOutcome', 'relaunchQuiet', 'relaunchLink', 'relaunchSpawns',
    'afterRestartPrepare', 'afterRestartReady', 'afterRestartLink', 'afterRestartRestored'
  ],
  K3d12: ['cls', 'ready', 'link'],
  N1: ['options', 'detail', 'saveOutcome', 'saveMode', 'made', 'madeMode', 'dollarFar', 'costFar', 'row0'],
  RUN: ['dockerClean', 'dockerProblems', 'electronsLeft', 'historyMoved', 'samplerViolations', 'farContentInLog', 'preflightsOk']
});

/**
 * The grade of one arm's reading for one row at HEAD: the problems found,
 * empty when the arm passed. `null` from a reading means it was not read.
 */
export function grade(arm, row, r) {
  const v = ROW_VERSION[row] ?? null;
  const older = OLDER.includes(v);
  const out = [];
  const need = (cond, why) => {
    if (!cond) out.push(why);
  };
  if (r === null || r === undefined) return ['not read'];
  const missing = (REQUIRED[arm] ?? []).filter((k) => typeof r !== 'object' || !(k in r) || r[k] === undefined);
  if (missing.length > 0) return [`not read: ${missing.join(', ')}`];
  switch (arm) {
    case 'L1':
      need(r.peerListed === true, 'the peer was not listed by Add a machine');
      need(r.found === '/usr/bin/tmux', `the check found ${J(r.found)}, not /usr/bin/tmux`);
      need(r.version === v, `the check read tmux ${J(r.version)}, not ${String(v)}`);
      need(r.acceptSheet === false, 'an acceptance sheet was offered for a measured version');
      need(r.ready === true, 'the machine did not read Ready');
      need(r.typed === 0, `${String(r.typed)} field(s) were typed`);
      need(typeof r.detail === 'string' && !r.detail.includes(SENTENCE.unreached), 'the machine was said to be unreachable');
      break;
    case 'L2': {
      const o = r.options !== null && typeof r.options === 'object' ? r.options : {};
      // THE FIX ROUND: all twelve, each against what this version keeps.
      for (const name of Object.keys(WANT_OPTIONS)) {
        if (!(name in o)) {
          need(false, `${name} was not read`);
          continue;
        }
        const want = wantOption(v, name);
        need(o[name] === want, `${name} read back ${J(o[name])}, not ${J(want)}`);
      }
      need(typeof r.detail === 'string' && !r.detail.includes(SENTENCE.settingRefused), 'the prepared detail carries sentence (2) on a measured version');
      break;
    }
    case 'L3':
      need(typeof r.farName === 'string' && !r.farName.includes('$') && !r.farName.startsWith('-'), `the far tmux name is ${J(r.farName)}`);
      // THE SECOND FIX ROUND: exact on both kinds of row. A prefix let
      // `cost $HOMEWORK` pass on a row with no UTF-8 LANG.
      need(r.listedName === (r.utf8 === true ? COST_NAME : COST_NAME_ASCII), `the session is listed as ${J(r.listedName)}`);
      need(typeof r.wantDollarCwd === 'string' && r.dollarCwd === r.wantDollarCwd, `the session in a folder holding $ reads its folder as ${J(r.dollarCwd)}`);
      need(typeof r.wantDollarCwd === 'string' && r.dollarProject === r.wantDollarCwd, `its project reads ${J(r.dollarProject)}`);
      break;
    case 'L4':
      need(r.link === 'connected', `the link reads ${J(r.link)}`);
      need(r.strangerShown === false, 'a session with no @gmux-id was shown');
      need(r.renamedArrived === true, 'a rename typed in Tortie did not arrive');
      need(r.dollarFar === DOLLAR_FAR, `a rename to "${DOLLAR_RENAME}" arrived as ${J(r.dollarFar)}`);
      break;
    case 'L5':
      need(r.attached === true, 'the attach never reached the far session, so what was typed proves nothing');
      need(r.inMode === '1' && r.position === '30', `the far pane reads in_mode ${J(r.inMode)}, position ${J(r.position)}`);
      need(typeof r.row0 === 'string' && !box(r.row0), `the drawn top row holds tmux's position box: ${J(r.row0)}`);
      if (older) need(box(r.controlRow0), "the probe's own copy-mode -e drew no box, so the grader could not have seen one");
      need(r.liveAgain === true, 'typing did not return the session to live');
      break;
    case 'L6':
      need(Array.isArray(r.trail) && r.trail.length > 0, 'no trail of the statuses read after the restart');
      need(r.prepareAfterRestart === 'prepared', `Prepare after the restart answered ${J(r.prepareAfterRestart)}`);
      need(r.restorable === true, 'the session did not read restorable after the restart');
      need(r.restored === true, 'the restore did not bring a session back');
      need(typeof r.wantPath === 'string' && r.path === r.wantPath, `the restored session runs in ${J(r.path)}`);
      need(typeof r.wantDollarPath === 'string' && r.dollarPath === r.wantDollarPath, `the session in a folder holding $ restored into ${J(r.dollarPath)}`);
      break;
    case 'L7':
      need(r.outcome === 'wrote', `the save answered ${J(r.outcome)}`);
      need(typeof r.wantSha === 'string' && r.sha === r.wantSha, 'the far bytes are not what was saved');
      need(r.mode === '644', `the file's mode is ${J(r.mode)}`);
      need(r.parts === 0, `${String(r.parts)} .tortie-part file(s) left`);
      break;
    case 'L8':
      need(r.made === 'made', `New Folder answered ${J(r.made)}`);
      need(r.mode === '755', `the folder is ${J(r.mode)}`);
      need(r.renamed === 'moved' || r.renamed === 'done', `its rename answered ${J(r.renamed)}`);
      need(r.child === 'made', `New Folder in a first-level child of the home answered ${J(r.child)}`);
      need(r.homeRefused === true, 'a folder at the home itself was not refused');
      break;
    case 'L9':
      need(r.linkKind === 'dir' && r.linkMark === 'dir', `the link lists as ${J([r.linkKind, r.linkMark])}`);
      need(Array.isArray(r.inner) && r.inner.includes('inner') && r.inner.includes('inner/f'), `the link expands to ${J(r.inner)}`);
      break;
    case 'L10':
      // THE FIX ROUND. Catch Me Up answers every session on another machine
      // with the `remote` line, by design (src/main/overview/service.ts), and
      // a Claude session Tortie created is never harvested, so the line is the
      // reading; the remote reader's GNU half (store-list, store-head,
      // store-copy) is read through a Codex stand-in's conversation, copied
      // back to this Mac byte for byte.
      //
      // THE SECOND FIX ROUND. The bridge's `overview.sessions` REJECTS a
      // project on another machine at the parent and at HEAD alike (it runs
      // this Mac's git there), so the line could never be read: the reading is
      // `remote` or `refused`, and where the parent read the same row it must
      // say what the parent said, which is "no worse than today".
      need(OVERVIEW_ANSWERS.includes(r.line), `Catch Me Up answers the session on another machine with the line ${J(r.line)}, not remote and not the refusal both builds answer`);
      if (typeof r.parentLine === 'string') need(r.line === r.parentLine, `Catch Me Up answers ${J(r.line)} where the parent answered ${J(r.parentLine)}, so it differs from the parent's`);
      need(typeof r.codexWantSha === 'string' && r.codexSha === r.codexWantSha, `the Codex conversation was copied back as ${J(r.codexSha)}, not the far file's ${J(r.codexWantSha)}`);
      break;
    case 'L11':
      need(r.staged === 'done', `stage answered ${J(r.staged)}`);
      need(r.committed === 'committed', `commit answered ${J(r.committed)}`);
      need(r.subject === 'p342 commit', `git log -1 names ${J(r.subject)}`);
      need(r.porcelain === '', `git status --porcelain reads ${J(r.porcelain)}`);
      break;
    case 'L12':
      need(r.attached === true, 'the attach never reached the far session, so what was typed proves nothing');
      for (const mode of ['normal', 'mok2']) {
        for (const key of ['BTab', 'C-c', 'Up', 'C-j']) {
          const want = r.want?.[mode]?.[key];
          need(typeof want === 'string' && r.got?.[mode]?.[key] === want, `${mode} ${key} reached the program as ${J(r.got?.[mode]?.[key])}, measured ${J(want)}`);
        }
      }
      break;
    case 'K1a':
      need(r.cls === 'prepared' && r.ready === true, `a refused allow-passthrough on 3.6 ended ${J(r.cls)}`);
      need(String(r.detail ?? '').includes(SENTENCE.settingRefused) && String(r.detail ?? '').includes('tmux 3.6'), 'the prepared detail does not carry sentence (2) naming 3.6');
      break;
    case 'K1b':
      need(r.cls === 'program-refused', `a refused remain-on-exit ended ${J(r.cls)}`);
      need(r.headline === SENTENCE.tooOld, `its headline reads ${J(r.headline)}`);
      need(String(r.detail ?? '').includes('tmux 3.6') && String(r.detail ?? '').includes("keep a session's screen when its program fails"), `its detail reads ${J(r.detail)}`);
      need(r.historyLimit === '25000', `history-limit read back ${J(r.historyLimit)}, so it was not written first`);
      need(Array.isArray(r.afterRefusal) && r.afterRefusal.length === 0, `${J(r.afterRefusal)} was sent after the refusal`);
      need(![r.headline, r.detail].some((s) => String(s ?? '').includes(SENTENCE.unreached)), 'it said could not reach');
      break;
    case 'K2b':
      need(r.cls === 'program-refused' && r.headline === SENTENCE.disagrees, `a lying -V ended ${J([r.cls, r.headline])}`);
      need(String(r.detail ?? '').includes('It says 3.7c and runs as 3.2a'), `its detail reads ${J(r.detail)}`);
      need(J(r.afterBoot ?? null) === J(['display-message']), `after the boot it sent ${J(r.afterBoot)}; only the re-read`);
      need(r.serverLeft === true, 'the empty server it started was not left running');
      break;
    case 'K3':
      need(r.setUp === true, 'K3 did not set up its own running 3.5a server, session and live connection');
      need(r.cls === 'program-refused' && r.headline === SENTENCE.updated, `Prepare after the update ended ${J([r.cls, r.headline])}`);
      need(String(r.detail ?? '').includes('3.6b') && String(r.detail ?? '').includes('3.5a'), `its detail does not name 3.6b and 3.5a: ${J(r.detail)}`);
      need(typeof r.ms === 'number' && r.ms < 10_000, `it answered in ${J(r.ms)} ms`);
      need(r.oldLiveAnswered === true, 'the live connection opened before the update stopped answering');
      need(r.spawnsAfterDrop === 0, `${J(r.spawnsAfterDrop)} far control child(ren) spawned after the link dropped`);
      need(r.listed === true && r.unknown === false, 'the session is not listed, or reads unknown');
      need(r.chip === 'not-usable', `the row's chip reads ${J(r.chip)}`);
      need(r.attachRefused === true && r.attachSshT === 0, 'opening the session did not refuse with the pair line, or spawned an ssh -t');
      need(r.saveOutcome === 'wrote', `a save there answered ${J(r.saveOutcome)}`);
      need(r.relaunchQuiet === false && r.relaunchLink === 'polling', `after the relaunch the machine was marked quiet or its link reads ${J(r.relaunchLink)}`);
      need(r.relaunchSpawns === 0, `${J(r.relaunchSpawns)} control child(ren) were spawned after the relaunch`);
      // THE SECOND FIX ROUND: Prepare's own answer after the restart is
      // recorded, so a failure says what Prepare said.
      need(r.afterRestartPrepare === 'prepared', `after the restart, Prepare answered ${J(r.afterRestartPrepare)}`);
      need(r.afterRestartReady === true && r.afterRestartLink === 'connected', `after the restart and Prepare the machine reads ${J([r.afterRestartReady, r.afterRestartLink])}`);
      need(r.afterRestartRestored === true, 'a restored session did not attach after the restart');
      break;
    case 'K3d12':
      need(r.cls === 'prepared' && r.ready === true, `a 3.5a program under a 3.3a server ended ${J(r.cls)}`);
      need(r.link === 'connected', `its live connection reads ${J(r.link)}`);
      break;
    case 'N1': {
      // THE SECOND FIX ROUND. This read a constant the probe wrote itself
      // (`firstWritten: 'history-limit'`), which graded nothing; the order of
      // the writes is condition 146's, driven over a stand-in. N1 reads the
      // twelve options back by the probe's own far read, as L2 does, against
      // a tmux from 3.6 on, which takes every one of them.
      const o = r.options !== null && typeof r.options === 'object' ? r.options : {};
      for (const name of Object.keys(WANT_OPTIONS)) {
        if (!(name in o)) {
          need(false, `${name} was not read`);
          continue;
        }
        need(o[name] === WANT_OPTIONS[name], `${name} read back ${J(o[name])}, not ${J(WANT_OPTIONS[name])}`);
      }
      need(typeof r.detail === 'string' && !r.detail.includes(SENTENCE.settingRefused), 'the prepared detail carries sentence (2)');
      need(r.saveOutcome === 'wrote' && r.saveMode === '644', `a save answered ${J([r.saveOutcome, r.saveMode])}`);
      need(r.made === 'made' && r.madeMode === '755', `New Folder answered ${J([r.made, r.madeMode])}`);
      need(r.dollarFar === DOLLAR_FAR, `a rename to "${DOLLAR_RENAME}" arrived as ${J(r.dollarFar)}`);
      need(r.costFar === 'cost _HOME', `a session named cost $HOME has the far name ${J(r.costFar)}`);
      need(typeof r.row0 === 'string' && !box(r.row0), `the drawn top row holds tmux's position box: ${J(r.row0)}`);
      break;
    }
    case 'RUN':
      need(r.dockerClean === true, `Docker is not as it was found: ${J(r.dockerProblems)}`);
      need(r.electronsLeft === 0, `${J(r.electronsLeft)} Electron process(es) of the run are left`);
      need(r.historyMoved === false, 'his shell history moved during the run');
      need(r.samplerViolations === 0, `${J(r.samplerViolations)} sampler violation(s)`);
      need(r.farContentInLog === false, 'app.log holds far file content');
      need(r.preflightsOk === true, 'a preflight refused a launch');
      break;
    default:
      out.push(`no grader for ${arm}`);
  }
  return out;
}

/** The arms graded per row, and the ones graded once. */
export const ROW_ARMS = Object.freeze(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12']);
export const ONCE_ARMS = Object.freeze(['K1a', 'K1b', 'K2b', 'K3', 'K3d12', 'N1', 'RUN']);
/** Which row a once-arm reads. */
export const ONCE_ROW = Object.freeze({ K1a: 'u2604', K1b: 'u2604', K2b: 'u2204', K3: 'd13', K3d12: 'd12', N1: 'loopback', RUN: null });

/** Every problem a whole record holds at HEAD, as `<arm> <row>: <problem>`. */
export function gradeRecord(record) {
  const out = [];
  for (const [row, arms] of Object.entries(record?.rows ?? {})) {
    for (const arm of ROW_ARMS) {
      if (!(arm in (arms ?? {}))) continue;
      for (const p of grade(arm, row, arms[arm])) out.push(`${arm} ${row}: ${p}`);
    }
  }
  for (const arm of ONCE_ARMS) {
    if (!(arm in (record?.once ?? {}))) continue;
    for (const p of grade(arm, ONCE_ROW[arm], record.once[arm])) out.push(`${arm}: ${p}`);
  }
  return out;
}

/**
 * The parent's reading is printed, never graded, except for the facts this
 * phase changed, which an honest parent must still show: the four older
 * versions not Ready without an acceptance, and saving over an existing file
 * on Linux failing (SPEC §1, §7.9).
 */
export function parentFacts(record) {
  const out = [];
  for (const [row, arms] of Object.entries(record?.rows ?? {})) {
    const v = ROW_VERSION[row];
    if (OLDER.includes(v) && arms?.L1 !== undefined && arms.L1 !== null && arms.L1.ready === true && arms.L1.acceptSheet !== true) {
      out.push(`L1 ${row}: the parent read ${v} Ready with no acceptance, which is not the parent this phase measured`);
    }
    if (!OLDER.includes(v) && arms?.L7 !== undefined && arms.L7 !== null && arms.L7.outcome === 'wrote' && arms.L7.parts === 0) {
      out.push(`L7 ${row}: the parent saved over an existing file on Linux, which §1 item 2 measured failing`);
    }
  }
  return out;
}

function fixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

/**
 * The self-test: the honest HEAD record passes, the honest parent record shows
 * the parent's facts, and every hostile case fails EXACTLY the clauses it
 * names (each a substring of a problem line).
 */
export function graderSelfTest() {
  const problems = [];
  const head = fixture('head-honest.json');
  const parent = fixture('parent-honest.json');
  const hostile = fixture('hostile.json');
  const headProblems = gradeRecord(head);
  if (headProblems.length > 0) problems.push(`the honest HEAD record fails: ${headProblems.slice(0, 4).join('; ')}`);
  const parentProblems = parentFacts(parent);
  if (parentProblems.length > 0) problems.push(`the honest parent record does not read as the parent: ${parentProblems.join('; ')}`);
  for (const arm of [...ROW_ARMS, ...ONCE_ARMS]) {
    const covered = (hostile.cases ?? []).some((c) => c.arm === arm);
    if (!covered) problems.push(`no hostile case breaks ${arm}`);
  }
  for (const c of hostile.cases ?? []) {
    const got = grade(c.arm, c.row ?? ONCE_ROW[c.arm], c.reading);
    if (got.length === 0) problems.push(`the hostile case "${c.what}" passed ${c.arm}`);
    for (const want of c.fails ?? []) {
      if (!got.some((p) => p.includes(want))) problems.push(`the hostile case "${c.what}" did not fail on "${want}" (it failed on ${J(got)})`);
    }
    if (got.length !== (c.fails ?? []).length) problems.push(`the hostile case "${c.what}" failed ${String(got.length)} clause(s), not the ${String((c.fails ?? []).length)} it names: ${J(got)}`);
  }
  // The sampler's own rule, on recorded lines.
  // Named `recordedPs`, never `ps`: gate:electron reads a variable assigned an
  // Electron path as an Electron starter wherever its name stands as a word,
  // and `/bin/ps` holds that word.
  const recordedPs = parsePs('100 1 /Applications/Electron.app/Contents/MacOS/Electron\n101 100 /usr/bin/ssh -F /run/p342/ssh_config p342-u2204 tmux\n102 100 /usr/bin/ssh -o BatchMode=yes p342-u2204\n103 1 /usr/bin/ssh -F none 127.0.0.1\n');
  const bad = samplerViolations(recordedPs, { launchPid: 100, runDir: '/run/p342', config: '/run/p342/ssh_config' });
  if (bad.length !== 1 || !bad[0].args.includes('BatchMode')) problems.push(`the sampler read ${J(bad)}; exactly the ssh without the run's -F config, and not his own ssh outside the run`);
  if (!box('2948   [30/2977]') || box('2948')) problems.push('the box reader is wrong');
  return { problems, head: headProblems.length, cases: (hostile.cases ?? []).length };
}

if (SELF_TEST) {
  const t = graderSelfTest();
  for (const p of t.problems) process.stdout.write(`  - ${p}\n`);
  if (t.problems.length > 0) {
    process.stdout.write('[p342] --grader-self-test FAIL\n');
    process.exit(1);
  }
  process.stdout.write(`[p342] --grader-self-test PASS: the honest HEAD record passes every grader, the honest parent record reads as the parent, ${String(t.cases)} hostile cases each fail exactly the clauses they name, and the sampler's rule holds. Nothing was started.\n`);
  process.exit(0);
}

// ===========================================================================
// 2. THE RUN.
// ===========================================================================

async function run() {
  const TAG = '[p342]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked -------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p342`, which wraps this file in build/harness-socket.mjs.');
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p342[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p342 harness socket ending in its pid.`);
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME, the containers and the profiles.');
  const PARENT = (process.env['P342_PARENT_CHECKOUT'] ?? '').trim();
  const KEEP = process.env['P342_KEEP'] === '1';
  const FAR_MODE = (process.env['P342_FAR'] ?? 'containers').trim();
  if (!['containers', 'loopback'].includes(FAR_MODE)) refuse(`P342_FAR is ${J(FAR_MODE)}; containers (the default) or loopback (N1). N2, his Mac Pro, is build/p342/CHECKLIST.md's.`);
  const ARMS = (process.env['P342_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const wants = (id) => ARMS.length === 0 || ARMS.includes(id);
  const ROW_IDS = (process.env['P342_ROWS'] ?? 'u2204,u2404,u2604,d12,d13,fed,arch').split(',').map((s) => s.trim()).filter(Boolean);
  for (const row of ROW_IDS) if (ROW_VERSION[row] === undefined) refuse(`${row} is not a row (${Object.keys(ROW_VERSION).join(', ')}).`);
  for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
    if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  }
  const SOURCES = ['src/main/machines/remote-server.ts', 'src/main/machines/prepare.ts', 'src/main/machines/far-tmux.ts', 'src/main/tmux/version.ts', 'src/main/machines/remote-scripts.ts'];
  const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(join(ROOT, 'out', 'main', 'index.js')).mtimeMs);
  if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);

  const historyStat = () =>
    ['.zsh_history', '.bash_history']
      .map((name) => {
        try {
          const s = statSync(join(REAL_HOME, name));
          return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
        } catch {
          return 'absent';
        }
      })
      .join('|');
  const historyBefore = historyStat();
  say(`his history (size, mtime): ${historyBefore}`);

  // ---- the modules, loaded only now -----------------------------------------
  const { cdpEval, wsConnect } = await import('../cdp-client.mjs');
  const { pickRendererTarget } = await import('../cdp-target.mjs');
  const { quietAgentsHeld, writeQuietAgents } = await import('../p332/dns-standin.mjs');
  const { refuseRealSockets } = await import('../scratch-machine.mjs');
  refuseRealSockets(SOCKET, 'p342');

  // ---- the scratch world ----------------------------------------------------
  mkdirSync(join(HARNESS_DIR, 'p342'), { recursive: true, mode: 0o700 });
  const RUN_DIR = realpathSync(join(HARNESS_DIR, 'p342'));
  mkdirSync(SCRATCH_HOME, { recursive: true, mode: 0o700 });
  if (/['"\s$`\\]/.test(RUN_DIR)) refuse(`${RUN_DIR} holds a quote, a space or a shell character, and it is written into the wrappers.`);
  const BIN = join(RUN_DIR, 'bin');
  mkdirSync(BIN, { recursive: true, mode: 0o700 });
  const OUT = resolve(ROOT, (process.env['P342_OUT_DIR'] ?? '').trim() || join('out', 'p342'));
  const CONFIG = join(RUN_DIR, 'ssh_config');
  const KEY = join(RUN_DIR, 'key');

  const records = { head: { rows: {}, once: {} }, parent: { rows: {}, once: {} } };
  const put = (build, row, arm, reading) => {
    if (row === null) records[build].once[arm] = reading;
    else {
      records[build].rows[row] ??= {};
      records[build].rows[row][arm] = reading;
    }
  };
  let unreadable = 0;
  const run = { preflights: [], samples: 0, violations: [], historyBefore, historyAfter: null, logsRead: 0, farContentInLog: false, docker: null };

  // ---- the run's own key ------------------------------------------------------
  rmSync(KEY, { force: true });
  rmSync(`${KEY}.pub`, { force: true });
  const keygen = spawnSync('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'p342-probe', '-f', KEY], { encoding: 'utf8', timeout: 30_000 });
  if (keygen.status !== 0) refuse(`ssh-keygen could not make the run's key: ${keygen.stderr}`);
  const PUB = readFileSync(`${KEY}.pub`, 'utf8').trim();

  // ---- the wrappers ---------------------------------------------------------
  const wrappers = {};
  const writeWrapper = (name, text) => {
    const path = join(BIN, name);
    writeFileSync(path, text, { mode: 0o755 });
    chmodSync(path, 0o755);
    wrappers[name] = { path, sha: sha256(readFileSync(path)) };
    return wrappers[name];
  };
  const TS_SCRIPT = join(ROOT, 'build', 'p340', 'tailscale-peers.mjs');
  const TS_FIXTURE = join(RUN_DIR, 'tailnet.json');
  const TS_LOG = join(RUN_DIR, 'tailscale.log');
  rmSync(TS_LOG, { force: true });
  const writeTailnet = (peers) => {
    const fixtureText = {
      _note: "Phase 342's tailnet for probe:p342: one Linux peer per throwaway container, reached only through the run's own ssh_config. Made up.",
      BackendState: 'Running',
      Self: { HostName: 'p342-this-mac', DNSName: 'p342-this-mac.p342-tailnet.ts.net.', OS: 'macOS', Online: true },
      Peer: Object.fromEntries(peers.map((p) => [`nodekey:${p}`, { HostName: p, DNSName: `${p}.`, OS: 'linux', Online: true }]))
    };
    writeFileSync(TS_FIXTURE, `${J(fixtureText, null, 1)}\n`);
  };
  const writeSshConfig = (hosts) => {
    const text = hosts
      .map((h) =>
        [
          `Host ${h.alias}`,
          '  HostName 127.0.0.1',
          `  Port ${String(h.port)}`,
          `  User ${h.user}`,
          `  IdentityFile ${h.key}`,
          '  IdentitiesOnly yes',
          '  IdentityAgent none',
          '  GlobalKnownHostsFile /dev/null',
          ''
        ].join('\n')
      )
      .join('\n');
    writeFileSync(CONFIG, text, { mode: 0o600 });
  };
  const pinned = () => ({ [TS_SCRIPT]: sha256(readFileSync(TS_SCRIPT)), [TS_FIXTURE]: sha256(readFileSync(TS_FIXTURE)), [CONFIG]: sha256(readFileSync(CONFIG)) });
  let pins = null;
  const preflight = () => {
    const problems = [];
    for (const w of Object.values(wrappers)) {
      try {
        const st = statSync(w.path);
        if (!st.isFile() || (st.mode & 0o111) === 0) problems.push(`${w.path} is not an executable file`);
        if (sha256(readFileSync(w.path)) !== w.sha) problems.push(`${w.path} changed since it was written`);
      } catch {
        problems.push(`${w.path} is gone`);
      }
    }
    for (const [path, want] of Object.entries(pins ?? {})) {
      if (!existsSync(path) || sha256(readFileSync(path)) !== want) problems.push(`${path} changed since the run began`);
    }
    return problems;
  };

  // ---- the app --------------------------------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  const profileOf = (build, name) => join(RUN_DIR, `${build}-${name}`, 'profile');
  const appHomeOf = (build, name) => join(RUN_DIR, `${build}-${name}`, 'home');
  const devtoolsPort = (profile) => {
    try {
      return Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  const targets = async (profile) => {
    const port = devtoolsPort(profile);
    if (!(port > 0)) return [];
    try {
      return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
    } catch {
      return [];
    }
  };
  /** One bridge expression in a window: its value, or a throw naming it. */
  const bridge = async (cdp, expr) => {
    const got = JSON.parse(
      await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 180_000)
    );
    if (!got.ok) throw new Error(`${expr.slice(0, 80)}: ${got.error}`);
    return got.value;
  };
  /** The same, answering `{ ok, value, error }` rather than throwing. */
  const tryBridge = async (cdp, expr) => {
    try {
      return { ok: true, value: await bridge(cdp, expr), error: null };
    } catch (err) {
      return { ok: false, value: null, error: err instanceof Error ? err.message : String(err) };
    }
  };
  /** The in-page presses: one `click` on the real element, counted. */
  function pageLib() {
    if (window.__p342 !== undefined) return true;
    const q = (s) => document.querySelector(s);
    window.__p342 = {
      has: (s) => q(s) !== null,
      text: (s) => {
        const el = q(s);
        return el === null ? null : (el.innerText ?? el.textContent ?? '');
      },
      raw: (s) => {
        const el = q(s);
        return el === null ? null : el.textContent;
      },
      attr: (s, a) => {
        const el = q(s);
        return el === null ? null : el.getAttribute(a);
      },
      press: (s) => {
        const el = q(s);
        if (el === null) return 'missing';
        if (el.disabled === true) return 'disabled';
        el.click();
        return 'pressed';
      }
    };
    return true;
  }
  const PAGE_LIB = `(${pageLib.toString()})()`;
  const page = async (cdp, call) => {
    await cdpEval(cdp, PAGE_LIB);
    return cdpEval(cdp, `window.__p342.${call}`);
  };
  let current = null;
  const guard = () => {
    if (current?.abort) throw new Error(`the sampler stopped the run: ${current.abort}`);
  };
  const until = async (cdp, expr, ms, what) => {
    const deadline = Date.now() + ms;
    for (;;) {
      guard();
      let v = null;
      try {
        v = await cdpEval(cdp, expr);
      } catch {
        v = null;
      }
      if (v) return v;
      if (Date.now() > deadline) throw new Error(`timed out after ${String(ms)} ms waiting for ${what}`);
      await sleep(300);
    }
  };
  const waitFor = async (fn, ms, what) => {
    const deadline = Date.now() + ms;
    for (;;) {
      guard();
      const v = await fn();
      if (v) return v;
      if (Date.now() > deadline) throw new Error(`timed out after ${String(ms)} ms waiting for ${what}`);
      await sleep(500);
    }
  };
  const startSampler = (launchPid) => {
    const state = { abort: null };
    const timer = setInterval(() => {
      const ps = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,args='], { encoding: 'utf8', timeout: 5_000 });
      run.samples += 1;
      const bad = samplerViolations(parsePs(ps.stdout), { launchPid, runDir: RUN_DIR, config: CONFIG });
      if (bad.length > 0) {
        run.violations.push(...bad);
        state.abort = `${bad[0].why}: ${bad[0].args}`;
      }
    }, 1_000);
    return { state, stop: () => clearInterval(timer) };
  };

  /** One launch: preflight, agents.json, the sampler, the main window and Settings › Machines, then `body`. */
  const launch = async ({ build, name, profile = profileOf(build, name) }, body) => {
    const checkout = build === 'parent' ? resolve(PARENT) : ROOT;
    const home = appHomeOf(build, name);
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const problems = preflight();
    run.preflights.push(problems.length === 0);
    if (problems.length > 0) throw new Error(`the preflight refused the launch: ${problems.join('; ')}`);
    writeQuietAgents(profile);
    const options = {
      label: `p342-${build}-${name}`,
      userDataDir: profile,
      cwd: checkout,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        ...INHERITED_CLAUDE,
        HOME: home,
        ZDOTDIR: home,
        HISTFILE: '/dev/null',
        TERM_SESSION_ID: undefined,
        SSH_AUTH_SOCK: undefined,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_HARNESS_DIR: HARNESS_DIR,
        GMUX_SSH_BIN: wrappers['ssh'].path,
        GMUX_TAILSCALE_BIN: wrappers['tailscale'].path
      }),
      graceMs: 8_000
    };
    say(`launch ${build} ${name}`);
    try {
      return await withElectron(options, async (handle) => {
        const sampler = startSampler(handle.pid);
        current = sampler.state;
        let main = null;
        let settings = null;
        try {
          const startedAt = Date.now();
          for (;;) {
            const picked = pickRendererTarget(await targets(profile));
            if (picked.target !== null) {
              main = await wsConnect(picked.target.webSocketDebuggerUrl);
              await main.call('Runtime.enable');
              break;
            }
            if (Date.now() - startedAt > 150_000) throw new Error(`no app window: ${picked.why}`);
            guard();
            await sleep(300);
          }
          await until(main, "typeof window.gmux === 'object' && typeof window.gmux.machines === 'object'", 120_000, 'window.gmux.machines in the main window');
          const list = JSON.parse(await cdpEval(main, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
          const held = quietAgentsHeld(list);
          if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
          await cdpEval(main, 'window.gmux.openSettings()');
          const settingsAt = Date.now();
          for (;;) {
            const all = await targets(profile);
            const one = all.find((t) => t?.type === 'page' && /\/renderer\/settings\/index\.html(?:[?#]|$)/.test(String(t.url ?? '')) && typeof t.webSocketDebuggerUrl === 'string');
            if (one !== undefined) {
              settings = await wsConnect(one.webSocketDebuggerUrl);
              await settings.call('Runtime.enable');
              break;
            }
            if (Date.now() - settingsAt > 30_000) throw new Error('the Settings window never listed');
            guard();
            await sleep(300);
          }
          await until(settings, "document.readyState === 'complete' && typeof window.gmux === 'object'", 60_000, 'the Settings window');
          await cdpEval(settings, "location.hash = '#machines'");
          await until(settings, 'document.querySelector(\'section[aria-label="Machines"]\') !== null', 30_000, 'Settings › Machines');
          await cdpEval(settings, PAGE_LIB);
          return await body({ main, settings, handle, profile, home });
        } finally {
          sampler.stop();
          current = null;
          main?.close();
          settings?.close();
        }
      });
    } finally {
      const log = join(profile, 'logs', 'app.log');
      if (existsSync(log)) {
        run.logsRead += 1;
        const text = readFileSync(log, 'utf8');
        // The far files' own words never reach the log (RUN).
        if (/saved by p342|p342 a\b|transcript-marker-p342/.test(text)) run.farContentInLog = true;
      }
    }
  };

  // ---- the far side: a container, or the loopback machine ---------------------
  /**
   * One far machine's handle: its id, its home, a shell as `tortie` (or root)
   * on it, and the far tmux on the harness socket. For a container that is the
   * helper's own `docker exec`; nothing here names the container program.
   */
  const farOf = (row, h) => {
    const home = h.accounts?.tortie?.home ?? '/home/tortie';
    const sh = async (script, opts = {}) => {
      const r = await h.sh(script, { user: opts.root ? 'root' : 'tortie', env: { HOME: opts.root ? '/root' : home, LANG: 'C.UTF-8', ...(opts.env ?? {}) }, args: opts.args ?? [], timeoutMs: opts.timeoutMs ?? 120_000, input: opts.input });
      return { code: r.code, out: r.stdout, err: r.stderr };
    };
    const tmux = (args) => sh(`tmux -L "$1" ${args}`, { args: [SOCKET] });
    return { row, id: `p342-${row}`, home, sh, tmux, h };
  };
  /**
   * THE SECOND FIX ROUND. Whether a far machine's ssh server greets on its
   * published port, read over a plain TCP socket of this process, which
   * signs in to nothing, and the wait for it after a restart.
   */
  const sshGreets = async (port) => {
    const { createConnection } = await import('node:net');
    return new Promise((done) => {
      const socket = createConnection({ host: '127.0.0.1', port });
      let text = '';
      let settled = false;
      const end = (ok) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        done(ok);
      };
      socket.setTimeout(3_000, () => end(false));
      socket.on('data', (chunk) => {
        text += chunk.toString('latin1');
        if (text.startsWith('SSH-')) end(true);
      });
      socket.on('error', () => end(false));
      socket.on('close', () => end(text.startsWith('SSH-')));
    });
  };
  const waitForSsh = (far) => waitFor(async () => ((await sshGreets(far.h.port)) ? true : null), 60_000, `${far.id}'s ssh server after the restart`).catch(() => false);

  /** The far session whose @gmux-id is `sessionId`, as `{ id, name }`. */
  const farSession = async (far, sessionId) => {
    const r = await far.tmux("list-sessions -F '#{session_id} #{@gmux-id} #{session_name}'");
    for (const line of r.out.split('\n')) {
      const [id, gid, ...name] = line.split(' ');
      if (gid === sessionId) return { id, name: name.join(' ') };
    }
    return null;
  };

  // ---- the drives -------------------------------------------------------------
  const rowOf = async (cdp, id) => ((await bridge(cdp, 'window.gmux.machines.rows()'))?.rows ?? []).find((r) => r.id === id) ?? null;
  const linkOf = async (cdp, id) => {
    const list = await bridge(cdp, 'window.gmux.machines.state()');
    return (Array.isArray(list) ? list : []).find((v) => v.id === id)?.link ?? null;
  };
  const chipOf = (settings, id) => page(settings, `attr('.mach-row[data-machine-id="${id}"] [data-machine-chip]', 'data-machine-chip')`);
  const rowText = (row) => J(row ?? {});
  /** Prepare by the bridge, and its answer. */
  const prepare = async (cdp, id) => {
    const at = Date.now();
    const got = await tryBridge(cdp, `window.gmux.machines.prepare(${J(id)})`);
    return { ms: Date.now() - at, answer: got.value, error: got.error };
  };
  const sessionsList = async (cdp) => {
    const got = await bridge(cdp, 'window.gmux.sessions.list()');
    return Array.isArray(got) ? got : (got?.sessions ?? []);
  };

  /** L1: Settings › Machines › Add a machine › the peer › Trust › Add, presses counted. */
  const addMachine = async (settings, build, far) => {
    const n = { presses: 0, typed: 0 };
    const press = async (selector) => {
      const got = await page(settings, `press(${J(selector)})`);
      if (got !== 'pressed') throw new Error(`${selector}: ${String(got)}`);
      n.presses += 1;
      await sleep(250);
    };
    if (await page(settings, "has('[data-machines-add]')")) await page(settings, `press(${J('[data-machines-action="add-cancel"]')})`);
    await press('[data-machines-action="open-add"]');
    // THE FIX ROUND (major 2 a). The parent's Add a machine is HEAD's (this
    // phase moved nothing in it but the ready step's note), so the parent is
    // driven exactly as HEAD is: pick the peer, and nothing more. It pressed
    // a typed-address button that exists only while that field is open, and
    // every parent arm read UNREADABLE.
    const peerListed = Boolean(await until(settings, `document.querySelector('[data-machines-peer="${far.id}"]') !== null`, 30_000, 'the peer in the tailnet list').catch(() => false));
    if (!peerListed) return { peerListed: false, found: null, version: null, acceptSheet: false, ready: false, typed: n.typed, presses: n.presses, detail: null };
    const prev = await page(settings, "attr('[data-test-id]', 'data-test-id')");
    await press(`[data-machines-peer="${far.id}"]`);
    // The check: the first-seen key is trusted (HEAD: Trust it; the parent: yes and Send is Phase 340's; both answer here).
    const deadline = Date.now() + 120_000;
    let cls = null;
    for (;;) {
      guard();
      const id = await page(settings, "attr('[data-test-id]', 'data-test-id')");
      if (id !== null && id !== prev) {
        cls = await page(settings, "attr('[data-outcome-class]', 'data-outcome-class')");
        if (cls !== null) break;
        if (await page(settings, "has('[data-machines-ask=\"host-key\"]')")) await press('[data-machines-action="trust"]');
      }
      if (Date.now() > deadline) throw new Error('the check did not end within 120 s');
      await sleep(300);
    }
    // THE FIX ROUND (major 2 b). The found row's TEXT, which names the path;
    // its title is the sentence about how it was found ("Found by its login
    // shell."), which never names one, so L1 read every row as a failure.
    const found = await page(settings, "text('[data-machines-check-row=\"found\"]')");
    const versionText = (await page(settings, "text('[data-machines-check-row=\"version\"]')")) ?? '';
    const acceptSheet = Boolean(await page(settings, "has('[data-machines-accepts]')"));
    if (await page(settings, "has('[data-machines-action=\"add-confirm\"]')")) await press('[data-machines-action="add-confirm"]');
    // THE SECOND FIX ROUND. A machine whose version the check offered to
    // accept is not accepted here (nothing is typed or pressed beyond the
    // peer), so it is never Ready: the parent's four older rows waited the
    // whole 180 s each for nothing. Such a row is given 20 s.
    const readyWithin = acceptSheet ? 20_000 : 180_000;
    const ready = await until(settings, `document.querySelector('[data-machines-ready="${far.id}"]') !== null || document.querySelector('.mach-row[data-machine-id="${far.id}"] [data-machine-chip="ready"]') !== null`, readyWithin, `${far.id} ready`).then(
      () => true,
      () => false
    );
    const row = await rowOf(settings, far.id);
    return {
      peerListed,
      cls,
      found: /\/usr\/bin\/tmux/.test(String(found ?? '')) ? '/usr/bin/tmux' : (found ?? null),
      version: /\b(\d+\.\d+[a-z]?)\b/.exec(versionText)?.[1] ?? null,
      acceptSheet,
      ready,
      typed: n.typed,
      presses: n.presses,
      detail: rowText(row)
    };
  };

  /** L2: the twelve options read back by the probe's own far read, and the row's words. */
  const readOptions = async (settings, far) => {
    const names = ['status', 'escape-time', 'extended-keys', 'allow-passthrough', 'focus-events', 'default-terminal', 'remain-on-exit', 'exit-empty', 'mouse', 'copy-mode-position-format', 'mode-style', 'history-limit'];
    const scope = { 'escape-time': '-s', 'extended-keys': '-s', 'focus-events': '-s', 'exit-empty': '-s' };
    const options = {};
    for (const name of names) {
      const r = await far.tmux(`show-options ${scope[name] ?? '-g'}v ${name}`);
      options[name] = r.code === 0 ? r.out.replace(/\n$/, '') : null;
    }
    return { options, detail: rowText(await rowOf(settings, far.id)) };
  };

  /** L3 and its two sessions, which L4 to L6 read. */
  const createSessions = async (main, far) => {
    const proj = `${far.home}/proj`;
    const dollar = `${far.home}/cost $d`;
    for (const path of [proj, dollar]) await bridge(main, `window.gmux.projects.addRemote(${J({ machineId: far.id, path })})`);
    const first = await bridge(main, `window.gmux.sessions.create(${J({ name: COST_NAME, projectPath: proj, cwd: proj, agent: 'shell', machineId: far.id, projectMachineId: far.id })})`);
    const second = await bridge(main, `window.gmux.sessions.create(${J({ name: 'p342 dollar folder', projectPath: dollar, cwd: dollar, agent: 'shell', machineId: far.id, projectMachineId: far.id })})`);
    await sleep(2_000);
    const list = await sessionsList(main);
    const a = list.find((s) => s.id === first.id) ?? first;
    const b = list.find((s) => s.id === second.id) ?? second;
    const farA = await farSession(far, first.id);
    const lang = (await far.tmux('show-environment -g LANG')).out;
    return {
      ids: { first: first.id, second: second.id },
      reading: {
        listedName: a.name ?? null,
        farName: farA?.name ?? null,
        utf8: /UTF-?8/i.test(lang),
        dollarCwd: b.cwd ?? null,
        dollarProject: b.projectPath ?? null,
        wantDollarCwd: dollar
      }
    };
  };

  /** L4: the live connection, a stranger, two renames. */
  const liveConnection = async (main, far, sessionId) => {
    const link = await waitFor(async () => ((await linkOf(main, far.id)) === 'connected' ? 'connected' : null), 60_000, 'the live connection').catch(async () => linkOf(main, far.id));
    await far.tmux('new-session -d -s p342-stranger -- /bin/sh');
    await sleep(4_000);
    const strangerShown = (await sessionsList(main)).some((s) => s.name === 'p342-stranger' || s.tmuxName === 'p342-stranger');
    await bridge(main, `window.gmux.sessions.rename(${J({ sessionId, name: 'p342 renamed' })})`);
    await sleep(1_500);
    const renamedArrived = (await farSession(far, sessionId))?.name === 'p342 renamed';
    await bridge(main, `window.gmux.sessions.rename(${J({ sessionId, name: DOLLAR_RENAME })})`);
    await sleep(1_500);
    const dollarFar = (await farSession(far, sessionId))?.name ?? null;
    await far.tmux('kill-session -t =p342-stranger');
    return { link, strangerShown, renamedArrived, dollarFar };
  };

  /** The top row an attached client draws, by an outer tmux of the probe's own on that machine. */
  const drawnTopRow = async (far, farId) => {
    const r = await far.sh(
      'tmux -L p342row -f /dev/null kill-server >/dev/null 2>&1; ' +
        'tmux -L p342row -f /dev/null new-session -d -x 100 -y 30 -s outer "env -u TMUX TERM=xterm-256color tmux -L $1 attach -t \'=$2\'"; ' +
        'sleep 1.5; tmux -L p342row -f /dev/null capture-pane -p -t outer | head -n 1; tmux -L p342row -f /dev/null kill-server >/dev/null 2>&1',
      { args: [SOCKET, farId] }
    );
    return r.out.replace(/\n$/, '');
  };

  /**
   * THE FIX ROUND (major 2 d). Attach, then WAIT until the attach has reached
   * the far session (its own `#{session_attached}`) before anything is typed:
   * on the first row the input went out before the client was there and the
   * pane's history read 0. True when it got there within 30 s.
   */
  const attachAndWait = async (main, far, sessionId) => {
    await bridge(main, `window.gmux.sessions.attach(${J(sessionId)})`).catch(() => null);
    return waitFor(
      async () => {
        const f = await farSession(far, sessionId);
        if (f === null) return null;
        const n = Number((await far.tmux(`display-message -p -t '${f.id}' '#{session_attached}'`)).out.trim());
        return n >= 1 ? true : null;
      },
      30_000,
      'the attach to reach the far session'
    ).catch(() => false);
  };

  /** L5: scroll back 30 on another machine, and the probe's own entry as the control. */
  const scrollBack = async (main, far, sessionId) => {
    const attached = await attachAndWait(main, far, sessionId);
    await bridge(main, `window.gmux.term.sendInput(${J(sessionId)}, 'seq 1 3000\\r')`);
    await sleep(3_000);
    await bridge(main, `window.gmux.scroll.by(${J({ sessionId, lines: 30 })})`);
    await sleep(1_500);
    const f = await farSession(far, sessionId);
    const state = (await far.tmux(`display-message -p -t '${String(f?.id)}' '#{pane_in_mode} #{scroll_position}'`)).out.trim().split(' ');
    const row0 = await drawnTopRow(far, String(f?.id));
    // THE CONTROL: the probe's own entry, without -H, on the same pane.
    await far.tmux(`send-keys -t '${String(f?.id)}' -X cancel`);
    await far.tmux(`copy-mode -e -t '${String(f?.id)}'`);
    await far.tmux(`send-keys -t '${String(f?.id)}' -X -N 30 scroll-up`);
    const controlRow0 = await drawnTopRow(far, String(f?.id));
    await far.tmux(`send-keys -t '${String(f?.id)}' -X cancel`);
    await bridge(main, `window.gmux.scroll.live(${J(sessionId)})`).catch(() => null);
    await bridge(main, `window.gmux.term.sendInput(${J(sessionId)}, 'true\\r')`);
    await sleep(1_000);
    const live = (await far.tmux(`display-message -p -t '${String(f?.id)}' '#{pane_in_mode}'`)).out.trim();
    return { attached, inMode: state[0] ?? null, position: state[1] ?? null, row0, controlRow0, liveAgain: live === '0' };
  };

  /**
   * L6: a reboot (`docker restart`), then Prepare, then Restore.
   *
   * THE FIX ROUND (major 2 f), L6's cause, found by reading the code: a boot
   * empties /tmp, so the far socket file is gone, and Tortie (Phase 67's rule,
   * the parent's too) reads a missing socket as proving NOTHING, so the
   * sessions read `unknown` until something starts a server there. So the arm
   * presses Prepare after the restart, as a person would, and records a TRAIL
   * of every status it read, so a failure says which of the two it was.
   */
  const restoreAfterRestart = async (main, settings, far, ids) => {
    const r = await far.h.restart();
    if (r.code !== 0) throw new Error(`the restart of ${far.h.name} answered ${String(r.code)}: ${r.stderr.slice(0, 200)}`);
    const trail = [];
    const status = async (id) => {
      const s = (await sessionsList(main)).find((one) => one.id === id)?.status ?? null;
      if (trail.length === 0 || trail[trail.length - 1].status !== s) trail.push({ at: Date.now(), status: s });
      return s;
    };
    await status(ids.first);
    const prepared = await prepare(settings, far.id);
    const prepareAfterRestart = prepared.answer?.class ?? prepared.error ?? null;
    const restorable = await waitFor(async () => ((await status(ids.first)) === 'restorable' ? true : null), 180_000, 'restorable').catch(() => false);
    for (const id of [ids.first, ids.second]) await tryBridge(main, `window.gmux.sessions.restore(${J(id)})`);
    const restored = await waitFor(async () => ((await farSession(far, ids.first)) !== null ? true : null), 120_000, 'the restored session on the far server').catch(() => false);
    /**
     * THE SECOND FIX ROUND. The folder the restored pane RUNS in, read from
     * the pane's own process (`/proc/<pane_pid>/cwd`), never from tmux's
     * `#{pane_current_path}`: tmux 3.4 answers a `$` and a letter there with a
     * backslash added on output (D13), so the probe read `~/cost \$d` of a
     * shell the second verifier found running in `~/cost $d`.
     */
    const pathOf = async (id) => {
      const f = await farSession(far, id);
      if (f === null) return null;
      const pid = (await far.tmux(`display-message -p -t '${f.id}' '#{pane_pid}'`)).out.trim();
      if (!/^\d+$/.test(pid)) return null;
      // As the pane's own account, never root: a container's root holds no
      // CAP_SYS_PTRACE, so it may not read another account's /proc/<pid>/cwd
      // (the first run of this read answered nothing on every row).
      const r = await far.sh('readlink "/proc/$1/cwd"', { args: [pid] });
      return r.code === 0 ? r.out.replace(/\n$/, '') : null;
    };
    await status(ids.first);
    return {
      trail: trail.map((one) => ({ ms: one.at - (trail[0]?.at ?? one.at), status: one.status })),
      prepareAfterRestart,
      restorable,
      restored,
      path: await pathOf(ids.first),
      wantPath: `${far.home}/proj`,
      dollarPath: await pathOf(ids.second),
      wantDollarPath: `${far.home}/cost $d`
    };
  };

  /**
   * THE SECOND FIX ROUND. The probe's own far reads of a file's sha256 and a
   * path's mode, in the far machine's own spelling: GNU on the containers,
   * BSD on the loopback machine (this Mac), where `sha256sum` and `stat -c`
   * do not exist and N1's save and New Folder read nothing.
   */
  /**
   * THE SECOND FIX ROUND. A verb's outcome, or `refused: <its sentence>` when
   * the bridge rejected it. The parent's saves, folders and stages on Linux
   * are REFUSED (that is the parent fact §1 item 2 measured), and reading a
   * refusal as UNREADABLE hid the parent's answer and made the run exit 2.
   */
  const outcomeOf = (got) => {
    if (got.ok) return got.value?.outcome ?? null;
    const said = /"message":"((?:[^"\\]|\\.)*)"/.exec(String(got.error ?? ''))?.[1] ?? String(got.error ?? '').slice(0, 160);
    return `refused: ${said}`;
  };
  const SHA_OF = (far) => (far.bsd === true ? 'shasum -a 256 "$1" | cut -d" " -f1' : 'sha256sum "$1" | cut -d" " -f1');
  const MODE_OF = (far) => (far.bsd === true ? 'stat -f %Lp "$1"' : 'stat -c %a "$1"');

  /** L7: save over an existing 644 file. */
  const saveFile = async (main, far) => {
    const path = `${far.home}/proj/a.txt`;
    const was = (await far.sh('cat "$1"', { args: [path] })).out;
    const contents = 'saved by p342\n';
    const got = await tryBridge(main, `window.gmux.machines.putFile(${J({ machineId: far.id, path, contents, expect: sha256(was) })})`);
    const sha = (await far.sh(SHA_OF(far), { args: [path] })).out.trim();
    const mode = (await far.sh(MODE_OF(far), { args: [path] })).out.trim();
    const parts = Number((await far.sh('ls -a "$1" | grep -c tortie-part || true', { args: [`${far.home}/proj`] })).out.trim()) || 0;
    return { outcome: outcomeOf(got), sha, wantSha: sha256(contents), mode, parts };
  };

  /** L8: New Folder, its rename, a first-level child of the home, and the home itself. */
  const newFolder = async (main, far) => {
    const made = await tryBridge(main, `window.gmux.machines.makeDir(${J({ machineId: far.id, path: `${far.home}/proj/untitled folder` })})`);
    const mode = (await far.sh(MODE_OF(far), { args: [`${far.home}/proj/untitled folder`] })).out.trim();
    const renamed = await tryBridge(main, `window.gmux.machines.renameEntry(${J({ machineId: far.id, from: `${far.home}/proj/untitled folder`, to: `${far.home}/proj/made`, kind: 'dir' })})`);
    await bridge(main, `window.gmux.projects.addRemote(${J({ machineId: far.id, path: `${far.home}/child` })})`);
    const child = await tryBridge(main, `window.gmux.machines.makeDir(${J({ machineId: far.id, path: `${far.home}/child/x` })})`);
    await tryBridge(main, `window.gmux.projects.addRemote(${J({ machineId: far.id, path: far.home })})`);
    const atHome = await tryBridge(main, `window.gmux.machines.makeDir(${J({ machineId: far.id, path: `${far.home}/p342-at-home` })})`);
    const leftAtHome = (await far.sh('[ -e "$1" ] && echo yes || echo no', { args: [`${far.home}/p342-at-home`] })).out.trim();
    return { made: outcomeOf(made), mode, renamed: outcomeOf(renamed), child: outcomeOf(child), homeRefused: leftAtHome === 'no' && atHome.value?.outcome !== 'made' };
  };

  /** L9: the linked folder (Phase 343). */
  const linkedFolder = async (main, far) => {
    const top = await bridge(main, `window.gmux.machines.listTree(${J({ machineId: far.id, root: `${far.home}/proj`, depth: 1 })})`);
    const link = (top?.entries ?? []).find((e) => e.path === `${far.home}/proj/link`) ?? null;
    const under = await bridge(main, `window.gmux.machines.listTree(${J({ machineId: far.id, root: `${far.home}/proj/link`, depth: 2 })})`);
    const inner = (under?.entries ?? []).map((e) => e.path.slice(`${far.home}/proj/link/`.length));
    return { linkKind: link?.kind ?? null, linkMark: link?.link ?? null, inner };
  };

  /**
   * L10, its first half, per row. THE FIX ROUND (major 2 f), L10's cause:
   * Catch Me Up answers EVERY session on another machine with the `remote`
   * line, by design (src/main/overview/service.ts, Phase 293's guard), and a
   * Claude session Tortie created is never harvested, so a last answer read
   * from it was null on every row at both builds, which said nothing about
   * this phase. So the arm reads two things a person relies on: the line
   * Catch Me Up answers for a Claude stand-in session there, and the remote
   * reader's GNU half (store-list, store-head, store-copy), through a Codex
   * stand-in whose conversation Tortie copies back to this Mac
   * (src/main/machines/remote-store-sync.ts). The copy runs on the machine's
   * own cadence, so the second half is read ONCE after every row, with one
   * eleven-minute deadline (`catchMeUpCopies`).
   */
  const catchMeUp = async (main, far) => {
    const proj = `${far.home}/proj`;
    const claude = await bridge(main, `window.gmux.sessions.create(${J({ name: 'p342 catch me up', projectPath: proj, cwd: proj, agent: 'claude', machineId: far.id, projectMachineId: far.id })})`);
    const codex = await bridge(main, `window.gmux.sessions.create(${J({ name: 'p342 codex copy', projectPath: proj, cwd: proj, agent: 'codex', machineId: far.id, projectMachineId: far.id })})`);
    // THE SECOND FIX ROUND. The bridge REJECTS a project on another machine at
    // both builds (it runs this Mac's git in a folder that is not here), so a
    // rejection is read at once as `refused`, with its words kept, and only an
    // answer that does not yet hold the session is asked again.
    let overviewError = null;
    const line = await waitFor(
      async () => {
        const got = await tryBridge(main, `window.gmux.overview.sessions(${J({ projectPath: proj, sessionIds: [claude.id], turnLimit: 5 })})`);
        if (!got.ok) {
          overviewError = String(got.error ?? '').slice(0, 200);
          return 'refused';
        }
        return got.value?.sessions?.find((s) => s.sessionId === claude.id)?.line ?? null;
      },
      30_000,
      "Catch Me Up's line for the session"
    ).catch(() => null);
    // What the Codex stand-in planted, read on the far side once it has.
    const planted = await waitFor(
      async () => {
        const r = await far.sh('[ -f "$HOME/.p342-codex-planted" ] && tail -n 1 "$HOME/.p342-codex-planted" || true');
        const path = r.out.trim().split(' ').slice(1).join(' ');
        return path === '' ? null : path;
      },
      60_000,
      'the Codex stand-in to plant its conversation'
    ).catch(() => null);
    const codexWantSha = planted === null ? null : (await far.sh(SHA_OF(far), { args: [planted] })).out.trim() || null;
    return { line, overviewError, codexSessionId: codex.id, codexPlanted: planted, codexWantSha };
  };

  /**
   * L10, its second half, once after every row: each row's Codex conversation
   * as Tortie copied it to this Mac, under the profile's
   * `gmux/remote-stores/<machine>/<session>/`, by sha256 against the far
   * file's, within ONE eleven-minute deadline (the harvest's 60 s and the
   * copy's 300 s cadences, twice, and a margin).
   */
  const catchMeUpCopies = async (build, profile, pending) => {
    const deadline = Date.now() + 11 * 60_000;
    const copiedSha = (machineId, sessionId) => {
      const dir = join(profile, 'gmux', 'remote-stores', machineId, sessionId);
      if (!existsSync(dir)) return null;
      for (const name of readdirSync(dir)) {
        if (name === 'sync.json') continue;
        try {
          return sha256(readFileSync(join(dir, name)));
        } catch {
          return null;
        }
      }
      return null;
    };
    const left = new Set(Object.keys(pending));
    while (left.size > 0 && Date.now() < deadline) {
      guard();
      for (const row of [...left]) {
        const p = pending[row];
        const got = copiedSha(`p342-${row}`, p.codexSessionId);
        if (got !== null && got === p.codexWantSha) left.delete(row);
      }
      if (left.size > 0) await sleep(10_000);
    }
    for (const [row, p] of Object.entries(pending)) {
      // THE SECOND FIX ROUND: HEAD's answer beside the parent's on the same
      // row, when the parent read one, so L10 holds "no worse than today".
      const parentLine = build === 'head' ? (records.parent.rows[row]?.L10?.line ?? null) : null;
      const reading = {
        line: p.line,
        overviewError: p.overviewError,
        ...(typeof parentLine === 'string' ? { parentLine } : {}),
        codexSha: copiedSha(`p342-${row}`, p.codexSessionId),
        codexWantSha: p.codexWantSha
      };
      put(build, row, 'L10', reading);
      if (build === 'head') {
        const problems = grade('L10', row, reading);
        say(`${problems.length === 0 ? 'PASS' : 'FAIL'} L10 ${row}${problems.length === 0 ? '' : `: ${problems.join('; ')}`}`);
      } else say(`parent L10 ${row}: ${J(reading).slice(0, 240)}`);
    }
  };

  /** L11: stage and commit from the review. */
  const stageAndCommit = async (main, far) => {
    const cwd = `${far.home}/proj`;
    const head = (await far.sh('git -C "$1" rev-parse HEAD', { args: [cwd] })).out.trim();
    const staged = await tryBridge(main, `window.gmux.machines.stage(${J({ machineId: far.id, cwd, paths: ['a.txt'] })})`);
    const committed = await tryBridge(main, `window.gmux.machines.commit(${J({ machineId: far.id, cwd, headSha: head, staged: ['a.txt'], message: 'p342 commit' })})`);
    const subject = (await far.sh('git -C "$1" log -1 --format=%s', { args: [cwd] })).out.trim();
    const porcelain = (await far.sh('git -C "$1" status --porcelain -- a.txt', { args: [cwd] })).out.trim();
    return { staged: outcomeOf(staged), committed: outcomeOf(committed), subject, porcelain };
  };

  /** L12: four keys typed at the desk, into the recorder, in two modes. */
  const keys = async (main, far, version) => {
    const reference = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'p342', 'keys.json'), 'utf8'));
    const want = {};
    const got = {};
    const proj = `${far.home}/proj`;
    let attachedAll = true;
    for (const mode of ['normal', 'mok2']) {
      want[mode] = {};
      for (const key of ['BTab', 'C-c', 'Up', 'C-j']) want[mode][key] = reference.versions?.[version]?.[mode]?.[key] ?? null;
      const out = `/tmp/p342-keys-${mode}.bin`;
      const s = await bridge(main, `window.gmux.sessions.create(${J({ name: `p342 keys ${mode}`, projectPath: proj, cwd: proj, agent: 'shell', machineId: far.id, projectMachineId: far.id })})`);
      if (!(await attachAndWait(main, far, s.id))) attachedAll = false;
      await bridge(main, `window.gmux.term.sendInput(${J(s.id)}, ${J(`exec p342-key-recorder ${mode} ${out}\r`)})`);
      await sleep(1_500);
      for (const bytes of ['\u001b[Z', '\u0003', '\u001b[A', '\n']) {
        await bridge(main, `window.gmux.term.sendInput(${J(s.id)}, ${J(bytes)})`);
        await sleep(300);
        await bridge(main, `window.gmux.term.sendInput(${J(s.id)}, '|')`);
        await sleep(300);
      }
      await sleep(1_000);
      const hex = (await far.sh('od -An -tx1 -v "$1" | tr -d " \\n"', { args: [out] })).out.trim();
      const parts = hex.match(/../g) ?? [];
      const split = [];
      let cur = '';
      for (const b of parts) {
        if (b === '7c') {
          split.push(cur);
          cur = '';
        } else cur += b;
      }
      got[mode] = { BTab: split[0] ?? null, 'C-c': split[1] ?? null, Up: split[2] ?? null, 'C-j': split[3] ?? null };
      await tryBridge(main, `window.gmux.sessions.kill(${J(s.id)})`);
    }
    return { attached: attachedAll, got, want };
  };

  // ---- the far machines -----------------------------------------------------
  // THE SECOND FIX ROUND: the far account's agent stores are emptied too, so
  // the build driven second meets no conversation the first build's stand-ins
  // planted in the same folder (the second verifier found HEAD's Codex copy
  // was the PARENT's conversation, which the harvest picked by folder).
  const FAR_FIXTURE = `
set -e
cd "$HOME"
case "$HOME" in /|'') echo "refused: HOME is $HOME" >&2; exit 2;; esac
rm -rf proj real child "cost \\$d" "$HOME/.codex" "$HOME/.claude" "$HOME/.p342-codex-planted"
mkdir -p proj/sub real/inner child "cost \\$d"
chmod 755 proj/sub
printf 'p342 a\\n' > proj/a.txt; chmod 644 proj/a.txt
printf 'x\\n' > real/inner/f
ln -s "$HOME/real" proj/link
cd proj
git init -q 2>/dev/null; git symbolic-ref HEAD refs/heads/main
git config user.name p342; git config user.email p342@example.invalid
git add a.txt; git commit -q -m 'p342 base'
`;
  const STAND_IN = (fixtureCwd, fixtureSid) => `#!/bin/sh
# probe:p342. Not Claude Code. It plants the committed transcript under its own
# session id, prints one line, and waits.
case "$1" in -v|--version) echo "2.1.238 (Claude Code)"; exit 0;; esac
sid=""; prev=""
for a in "$@"; do if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi; prev="$a"; done
if [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"; mkdir -p "$d"
  [ -f "$d/$sid.jsonl" ] || sed -e "s|${fixtureSid}|$sid|g" -e "s|${fixtureCwd}|$PWD|g" /usr/local/share/p342/claude-session.jsonl > "$d/$sid.jsonl"
fi
echo "p342 a planted conversation; nothing is being asked here"
exec sleep 7200
`;
  /**
   * THE FIX ROUND. A Codex stand-in, /bin/sh: it plants the committed rollout
   * (docs/research/assets/63-fixtures) in today's date shard under a fresh id,
   * with its line 1's cwd made the folder it was started in, which is what the
   * remote harvest confirms a Codex record by; records where it put it; prints
   * one line and waits. No vendor program runs and no token is spent.
   */
  const CODEX_STAND_IN = `#!/bin/sh
# probe:p342. Not Codex. It plants the committed rollout under a fresh id,
# prints one line, and waits.
case "$1" in --version|-V) echo "codex-cli 0.160.0"; exit 0;; esac
id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null)
[ -n "$id" ] || id="0000aaaa-1111-7000-8000-$(date +%s | tail -c 13)"
day=$(date -u +%Y/%m/%d); ts=$(date -u +%Y-%m-%dT%H-%M-%S)
d="\${CODEX_HOME:-$HOME/.codex}/sessions/$day"; mkdir -p "$d"
f="$d/rollout-$ts-$id.jsonl"
sed -e "s|0000aaaa-1111-7000-8000-222233334444|$id|g" -e "s|/Users/example/rookery|$PWD|g" /usr/local/share/p342/codex-rollout.jsonl > "$f"
printf '%s %s\n' "$PWD" "$f" >> "$HOME/.p342-codex-planted"
echo "p342 a planted Codex conversation; nothing is being asked here"
exec sleep 7200
`;
  const CODEX_ROLLOUT = join(ROOT, 'docs', 'research', 'assets', '63-fixtures', 'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl');
  const TRANSCRIPT = join(ROOT, 'docs', 'research', 'assets', '63-fixtures', 'claude-session.jsonl');
  const transcriptFacts = () => {
    const lines = readFileSync(TRANSCRIPT, 'utf8').split('\n').filter((l) => l.trim() !== '');
    let sid = null;
    let cwd = null;
    for (const l of lines) {
      try {
        const o = JSON.parse(l);
        sid ??= o.sessionId ?? null;
        cwd ??= o.cwd ?? null;
      } catch {
        /* a line that is not JSON */
      }
    }
    return { sid, cwd };
  };
  const prepareFar = async (far) => {
    const made = await far.sh(FAR_FIXTURE);
    if (made.code !== 0) throw new Error(`the far fixture was not made on ${far.row}: ${made.err.slice(0, 200)}`);
    const { sid, cwd } = transcriptFacts();
    await far.h.writeFile('/usr/local/share/p342/claude-session.jsonl', readFileSync(TRANSCRIPT), { mode: 0o644 }).catch(() => null);
    await far.sh('mkdir -p /usr/local/share/p342', { root: true });
    await far.h.writeFile('/usr/local/share/p342/claude-session.jsonl', readFileSync(TRANSCRIPT), { mode: 0o644 });
    await far.h.writeFile('/usr/local/bin/claude', STAND_IN(String(cwd ?? '/nonexistent'), String(sid ?? 'nonexistent')), { mode: 0o755 });
    await far.h.writeFile('/usr/local/share/p342/codex-rollout.jsonl', readFileSync(CODEX_ROLLOUT), { mode: 0o644 });
    await far.h.writeFile('/usr/local/bin/codex', CODEX_STAND_IN, { mode: 0o755 });
    await far.h.writeFile('/usr/local/bin/p342-key-recorder', readFileSync(join(ROOT, 'build', 'p342', 'key-recorder.sh')), { mode: 0o755 });
    await far.h.writeFile('/usr/local/bin/p342-tmux-wrapper', readFileSync(join(ROOT, 'build', 'p342', 'tmux-wrapper.sh')), { mode: 0o755 });
  };
  /** Put build/p342/tmux-wrapper.sh in front of the real tmux, with what it refuses or says. */
  const wrapTmux = async (far, { refuse = null, sayVersion = null } = {}) => {
    const script =
      'set -e; mkdir -p /etc/p342-tmux; rm -f /etc/p342-tmux/refuse /etc/p342-tmux/say-version /tmp/p342-tmux-argv.log; ' +
      '[ -f /usr/bin/tmux.p342-real ] || mv /usr/bin/tmux /usr/bin/tmux.p342-real; cp /usr/local/bin/p342-tmux-wrapper /usr/bin/tmux; chmod 755 /usr/bin/tmux; ' +
      (refuse === null ? '' : 'printf "%s" "$1" > /etc/p342-tmux/refuse; ') +
      (sayVersion === null ? '' : 'printf "%s" "$2" > /etc/p342-tmux/say-version; ') +
      'chmod 666 /tmp/p342-tmux-argv.log 2>/dev/null || true';
    const r = await far.sh(script, { root: true, args: [String(refuse ?? ''), String(sayVersion ?? '')] });
    if (r.code !== 0) throw new Error(`the tmux wrapper did not go in on ${far.row}: ${r.err.slice(0, 200)}`);
  };
  const unwrapTmux = (far) => far.sh('[ -f /usr/bin/tmux.p342-real ] && mv /usr/bin/tmux.p342-real /usr/bin/tmux; rm -rf /etc/p342-tmux; true', { root: true });
  const wrapperLog = async (far) => (await far.sh('cat /tmp/p342-tmux-argv.log 2>/dev/null || true', { root: true })).out.split('\n').filter((l) => l.trim() !== '');
  /** The option names a set-option argv in the wrapper's log names, in order. */
  const optionsSent = (lines) =>
    lines
      .map((l) => [...l.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]))
      .filter((w) => w.includes('set-option') && !w.includes('start-server'))
      .map((w) => w[w.indexOf('set-option') + 2] ?? null);
  /** Far control children: a tmux with -C new-session, by the far side's own process table. */
  const farControlChildren = async (far) => Number((await far.sh("ps -eo args | grep -c '[t]mux .*-C new-session' || true", { root: true })).out.trim()) || 0;

  // ---- the arms, per build ---------------------------------------------------
  const cannotRead = (build, row, arm, why) => {
    unreadable += 1;
    put(build, row, arm, null);
    say(`UNREADABLE ${build} ${arm}${row === null ? '' : ` ${row}`}: ${why}`);
  };
  /**
   * THE SECOND FIX ROUND. An arm the PARENT cannot be driven through BY DESIGN,
   * which is the parent's reading and never "could not run": every arm after
   * L1 on a row the parent did not read Ready (its L1 says why), and K3 and
   * K3d12, which change the machine's tmux package and so run at HEAD alone.
   * The second verifier's run read 54 such arms as UNREADABLE, so a run whose
   * every HEAD arm passed could only ever exit 2.
   */
  const notDriven = (build, row, arm, why) => {
    put(build, row, arm, { notDriven: why });
    say(`${build} ${arm}${row === null ? '' : ` ${row}`}: not driven, ${why}`);
  };
  const attempt = async (build, row, arm, fn) => {
    if (!wants(arm)) return undefined;
    try {
      const reading = await fn();
      put(build, row, arm, reading);
      if (build === 'head' && arm === 'K3') {
        // THE SECOND FIX ROUND. K3's last six fields are read by the
        // relaunch, so it is graded once they are, not here with them null.
        say('K3: the first half is read; it is graded after the relaunch and the restart');
      } else if (build === 'head') {
        const problems = grade(arm, row ?? ONCE_ROW[arm], reading);
        say(`${problems.length === 0 ? 'PASS' : 'FAIL'} ${arm}${row === null ? '' : ` ${row}`}${problems.length === 0 ? '' : `: ${problems.join('; ')}`}`);
      } else say(`parent ${arm}${row === null ? '' : ` ${row}`}: ${J(reading).slice(0, 240)}`);
      return reading;
    } catch (err) {
      cannotRead(build, row, arm, err instanceof Error ? err.message : String(err));
      if (current?.abort) throw err;
      return undefined;
    }
  };

  const driveRows = async (build, ctx, fars) => {
    const { main, settings, profile } = ctx;
    const pendingCopies = {};
    for (const far of fars) {
      say(`${build} ${far.row}: tmux ${ROW_VERSION[far.row]}`);
      const added = await attempt(build, far.row, 'L1', () => addMachine(settings, build, far));
      if (added === undefined || added === null || added.ready !== true) {
        for (const arm of ROW_ARMS.slice(1)) {
          if (!wants(arm)) continue;
          if (build === 'parent' && added?.ready === false) notDriven(build, far.row, arm, `the parent did not read ${far.id} Ready (its L1 is the reading)`);
          else cannotRead(build, far.row, arm, `${far.id} is not Ready, so nothing on it can be driven`);
        }
        continue;
      }
      await attempt(build, far.row, 'L2', () => readOptions(settings, far));
      let sessions = null;
      await attempt(build, far.row, 'L3', async () => {
        sessions = await createSessions(main, far);
        return sessions.reading;
      });
      if (sessions !== null) {
        await attempt(build, far.row, 'L4', () => liveConnection(main, far, sessions.ids.first));
        await attempt(build, far.row, 'L5', () => scrollBack(main, far, sessions.ids.first));
      }
      await attempt(build, far.row, 'L7', () => saveFile(main, far));
      await attempt(build, far.row, 'L8', () => newFolder(main, far));
      await attempt(build, far.row, 'L9', () => linkedFolder(main, far));
      // L10's first half; its reading is put once every row is done.
      if (wants('L10')) {
        try {
          pendingCopies[far.row] = await catchMeUp(main, far);
        } catch (err) {
          cannotRead(build, far.row, 'L10', err instanceof Error ? err.message : String(err));
        }
      }
      await attempt(build, far.row, 'L11', () => stageAndCommit(main, far));
      await attempt(build, far.row, 'L12', () => keys(main, far, ROW_VERSION[far.row]));
      // L6 last on the row: it reboots the machine.
      if (sessions !== null) await attempt(build, far.row, 'L6', () => restoreAfterRestart(main, settings, far, sessions.ids));
    }
    if (Object.keys(pendingCopies).length > 0) await catchMeUpCopies(build, profile, pendingCopies);
  };

  /** K1, K2 b, K3 and its counter-arm, at either build (graded at HEAD). */
  const driveAttack = async (build, ctx, byRow) => {
    const { main, settings } = ctx;
    const u2604 = byRow.u2604;
    if (u2604 !== undefined) {
      await attempt(build, null, 'K1a', async () => {
        await wrapTmux(u2604, { refuse: 'allow-passthrough' });
        await u2604.tmux('kill-server');
        const p = await prepare(settings, u2604.id);
        const row = await rowOf(settings, u2604.id);
        return { cls: p.answer?.class ?? null, detail: p.answer?.detail ?? null, ready: row?.ready === true };
      });
      await attempt(build, null, 'K1b', async () => {
        await wrapTmux(u2604, { refuse: 'remain-on-exit' });
        await u2604.tmux('kill-server');
        const p = await prepare(settings, u2604.id);
        const log = await wrapperLog(u2604);
        const sent = optionsSent(log);
        const at = sent.indexOf('remain-on-exit');
        const historyLimit = (await u2604.tmux('show-options -gv history-limit')).out.trim();
        return { cls: p.answer?.class ?? null, headline: p.answer?.headline ?? null, detail: p.answer?.detail ?? null, historyLimit, afterRefusal: at === -1 ? ['(remain-on-exit never sent)'] : sent.slice(at + 1) };
      });
      await unwrapTmux(u2604);
    }
    const u2204 = byRow.u2204;
    if (u2204 !== undefined) {
      await attempt(build, null, 'K2b', async () => {
        await u2204.tmux('kill-server');
        await wrapTmux(u2204, { sayVersion: '3.7c' });
        const p = await prepare(settings, u2204.id);
        const log = await wrapperLog(u2204);
        const boot = log.findIndex((l) => l.includes('[start-server]'));
        const afterBoot = boot === -1 ? null : log.slice(boot + 1).map((l) => [...l.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]).find((w) => !w.startsWith('-') && !w.includes('/') && w !== SOCKET && w !== '-f') ?? null);
        const serverLeft = (await u2204.sh('tmux.p342-real -L "$1" list-sessions >/dev/null 2>&1 && echo yes || (tmux.p342-real -L "$1" display-message -p "#{version}" >/dev/null 2>&1 && echo yes || echo no)', { args: [SOCKET] })).out.trim() === 'yes';
        return { cls: p.answer?.class ?? null, headline: p.answer?.headline ?? null, detail: p.answer?.detail ?? null, afterBoot, serverLeft };
      });
      await unwrapTmux(u2204);
    }
    // THE SECOND FIX ROUND. K3 and K3d12 install a newer tmux package on their
    // row, so they run at HEAD alone. At the parent they cannot be set up in
    // any case (3.3a and 3.5a are not measured there, its L1 says so), and
    // the parent's K3d12 left Debian 12 on 3.5a for HEAD's rows: a downgrade
    // back failed, so Debian 12's own 3.3a was never driven at HEAD.
    if (build === 'parent') {
      for (const [arm, row] of [['K3', 'd13'], ['K3d12', 'd12']]) {
        if (wants(arm) && byRow[row] !== undefined) notDriven(build, null, arm, `it changes ${row}'s tmux package, so it runs at HEAD alone, after HEAD's rows`);
      }
      return;
    }
    const d13 = byRow.d13;
    if (d13 !== undefined) {
      await attempt(build, null, 'K3', async () => {
        // THE FIX ROUND (major 2 c). K3 needs a RUNNING 3.5a server with a
        // session of Tortie's on it and a live connection open, and L6 had
        // just restarted d13, so K3 met no server at all ("Tortie started the
        // program") and its ten failures graded nothing about the pair. So it
        // sets its own up first, and reads UNREADABLE when it cannot.
        const pre = await prepare(settings, d13.id);
        if (pre.answer?.class !== 'prepared') throw new Error(`K3 could not prepare d13 before the update: ${J(pre.answer?.class ?? pre.error)}`);
        const ranBefore = (await d13.tmux("display-message -p '#{version}'")).out.trim();
        if (ranBefore !== '3.5a') throw new Error(`K3 found d13's server running ${J(ranBefore)} before the update, not 3.5a`);
        const own = await bridge(main, `window.gmux.sessions.create(${J({ name: 'p342 k3', projectPath: `${d13.home}/proj`, cwd: `${d13.home}/proj`, agent: 'shell', machineId: d13.id, projectMachineId: d13.id })})`);
        const connected = await waitFor(async () => ((await linkOf(main, d13.id)) === 'connected' && (await farControlChildren(d13)) > 0 ? true : null), 60_000, 'the live connection to d13 before the update').catch(() => false);
        if (connected !== true) throw new Error('K3 could not open a live connection to the 3.5a server before the update');
        const mine = (await sessionsList(main)).find((s) => s.id === own.id) ?? null;
        if (mine === null) throw new Error('K3 created a session on d13 and the list does not hold it');
        const childBefore = await farControlChildren(d13);
        const up = await d13.sh('echo "deb http://deb.debian.org/debian trixie-backports main" > /etc/apt/sources.list.d/p342-bp.list; export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null 2>&1; apt-get install -y -qq -t trixie-backports tmux >/dev/null 2>&1; echo $?', { root: true, timeoutMs: 600_000 });
        if (up.out.trim() !== '0') throw new Error(`the backport did not install: ${up.err.slice(0, 200)}`);
        const p = await prepare(settings, d13.id);
        const oldLiveAnswered = (await linkOf(main, d13.id)) === 'connected' && childBefore > 0;
        // A dropped link: the far control child ended by its pid in the container.
        await d13.sh("for p in $(ps -eo pid,args | grep '[t]mux .*-C new-session' | awk '{print $1}'); do kill \"$p\"; done; true", { root: true });
        let spawnsAfterDrop = 0;
        for (let i = 0; i < 15; i += 1) {
          await sleep(2_000);
          spawnsAfterDrop = Math.max(spawnsAfterDrop, await farControlChildren(d13));
        }
        const after = await sessionsList(main);
        const listed = mine === null ? false : after.some((s) => s.id === mine.id);
        const unknown = mine === null ? true : after.find((s) => s.id === mine.id)?.status === 'unknown';
        const chip = await chipOf(settings, d13.id);
        const attach = mine === null ? { ok: false, error: 'no session' } : await tryBridge(main, `window.gmux.sessions.attach(${J(mine.id)})`);
        const attachRefused = attach.ok === false && String(attach.error).includes('updated while its sessions kept running');
        const ps = spawnSync('/bin/ps', ['-Ao', 'args='], { encoding: 'utf8' }).stdout;
        const attachSshT = ps.split('\n').filter((l) => l.includes(CONFIG) && /\s-t\s/.test(l) && l.includes(d13.id)).length;
        const save = await saveFile(main, d13).catch(() => ({ outcome: null }));
        return {
          setUp: true,
          // THE SECOND FIX ROUND: the session the relaunch restores by id.
          sessionId: own.id,
          cls: p.answer?.class ?? null,
          headline: p.answer?.headline ?? null,
          detail: p.answer?.detail ?? null,
          ms: p.ms,
          oldLiveAnswered,
          spawnsAfterDrop,
          listed,
          unknown,
          chip,
          attachRefused,
          attachSshT,
          saveOutcome: save.outcome,
          // The relaunch and the restart are read by driveRelaunch below.
          relaunchQuiet: null,
          relaunchLink: null,
          relaunchSpawns: null,
          afterRestartPrepare: null,
          afterRestartReady: null,
          afterRestartLink: null,
          afterRestartRestored: null
        };
      });
    }
    const d12 = byRow.d12;
    if (d12 !== undefined) {
      await attempt(build, null, 'K3d12', async () => {
        const up = await d12.sh('echo "deb http://deb.debian.org/debian bookworm-backports main" > /etc/apt/sources.list.d/p342-bp.list; export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null 2>&1; apt-get install -y -qq -t bookworm-backports tmux >/dev/null 2>&1; echo $?', { root: true, timeoutMs: 600_000 });
        if (up.out.trim() !== '0') throw new Error(`the backport did not install: ${up.err.slice(0, 200)}`);
        const p = await prepare(settings, d12.id);
        const link = await waitFor(async () => ((await linkOf(main, d12.id)) === 'connected' ? 'connected' : null), 60_000, 'the live connection').catch(async () => linkOf(main, d12.id));
        const row = await rowOf(settings, d12.id);
        return { cls: p.answer?.class ?? null, ready: row?.ready === true, link };
      });
    }
  };

  /** K3's relaunch and restart, on the HEAD profile, after the first launch ended. */
  const driveRelaunch = async (byRow) => {
    const d13 = byRow.d13;
    const k3 = records.head.once.K3;
    if (d13 === undefined || k3 === undefined || k3 === null) return;
    await launch({ build: 'head', name: 'main' }, async ({ main, settings }) => {
      await sleep(8_000);
      const row = await rowOf(settings, d13.id);
      k3.relaunchQuiet = /did not answer the last time Tortie asked/.test(rowText(row));
      k3.relaunchLink = await linkOf(main, d13.id);
      k3.relaunchSpawns = await farControlChildren(d13);
      const r = await d13.h.restart();
      if (r.code !== 0) throw new Error(`the restart of ${d13.h.name} answered ${String(r.code)}`);
      // THE SECOND FIX ROUND. The second verifier read Ready false and no
      // session restored, with no Prepare answer recorded. So: the machine's
      // own ssh server is waited for (its greeting, read over a plain TCP
      // socket of this process, which signs in to nothing), Prepare's answer
      // is recorded, a person's second press is made only when the first
      // could not reach the machine, and the row, the link and K3's own
      // session are each waited for rather than read once.
      await waitForSsh(d13);
      const answers = [];
      for (let press = 0; press < 2; press += 1) {
        const p = await prepare(settings, d13.id);
        answers.push(p.answer?.class ?? `error: ${String(p.error).slice(0, 120)}`);
        if (p.answer?.class === 'prepared') break;
        if (!['unreachable', 'refused', 'timed-out'].includes(String(p.answer?.class))) break;
        await sleep(3_000);
      }
      k3.afterRestartPrepares = answers;
      k3.afterRestartPrepare = answers[answers.length - 1] ?? null;
      k3.afterRestartReady = await waitFor(async () => ((await rowOf(settings, d13.id))?.ready === true ? true : null), 60_000, 'the row Ready after the restart').catch(() => false);
      k3.afterRestartLink = await waitFor(async () => ((await linkOf(main, d13.id)) === 'connected' ? 'connected' : null), 60_000, 'the live connection after the restart').catch(async () => linkOf(main, d13.id));
      const ownId = typeof k3.sessionId === 'string' ? k3.sessionId : null;
      const trail = [];
      const restorable =
        ownId !== null &&
        (await waitFor(
          async () => {
            const s = (await sessionsList(main)).find((one) => one.id === ownId)?.status ?? null;
            if (trail[trail.length - 1] !== s) trail.push(s);
            return s === 'restorable' ? true : null;
          },
          180_000,
          "K3's own session restorable after the restart"
        ).catch(() => false));
      k3.afterRestartTrail = trail;
      if (restorable === true) await tryBridge(main, `window.gmux.sessions.restore(${J(ownId)})`);
      k3.afterRestartRestored = restorable === true && (await waitFor(async () => ((await farSession(d13, ownId)) !== null ? true : null), 90_000, 'the restored session').catch(() => false));
      say(`K3 after the relaunch and restart: ${J({ quiet: k3.relaunchQuiet, link: k3.relaunchLink, spawns: k3.relaunchSpawns, prepare: answers, ready: k3.afterRestartReady, afterLink: k3.afterRestartLink, trail, restored: k3.afterRestartRestored })}`);
    });
    const problems = grade('K3', 'd13', k3);
    say(`${problems.length === 0 ? 'PASS' : 'FAIL'} K3${problems.length === 0 ? '' : `: ${problems.join('; ')}`}`);
  };

  // ---- the run --------------------------------------------------------------
  /** The Electron processes of THIS run still up, by the run directory in their command line. */
  const electronsOfRun = () => {
    const electrons = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' }).stdout.split('\n').filter((l) => /[E]lectron|Tortie$|chrome_crashpad/.test(l) && !l.includes('defunct'));
    return electrons.filter((l) => {
      const pid = Number(l.trim().split(/\s+/)[0]);
      const args = spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout;
      return args.includes(RUN_DIR);
    }).length;
  };
  let exit = 0;
  try {
    if (FAR_MODE === 'loopback') {
      // N1: the loopback machine, as probe:p340 builds it, its far HOME and
      // TMUX_TMPDIR the yard's own. The same drives, read on this Mac.
      // THE SECOND FIX ROUND (the second verifier's major, item e). This arm
      // never signed in: the yard's sshd was never started, and the wrapper
      // handed the run's own key, because `scratchYard` returns no key path
      // (the yard's key is `<root>/<prefix>-userkey`, as probe:p340 names
      // it). And `local` was declared inside the try and called in its
      // finally, so every N1 ended in a ReferenceError. Each is fixed here,
      // the far HOME is required to be the yard's own (SCRATCH_MACHINE_
      // SCRATCH_HOME, which `npm run probe:p342` exports), and the yard's
      // sshd, the far server and the yard's sessions folder are ended in the
      // finally whatever happened.
      const { scratchYard, scratchMachine } = await import('../scratch-machine.mjs');
      const started = [];
      const record = (pid) => {
        if (Number.isInteger(pid) && pid > 0) started.push(pid);
      };
      const killStarted = () => {
        for (const pid of started) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            /* gone */
          }
        }
      };
      process.on('exit', killStarted);
      const yard = scratchYard({ root: join(RUN_DIR, 'yard'), prefix: 'p342', record });
      const { createServer } = await import('node:net');
      const port = await new Promise((done, fail) => {
        const s = createServer();
        s.once('error', fail);
        s.listen(0, '127.0.0.1', () => {
          const p = s.address().port;
          s.close(() => done(p));
        });
      });
      const machine = scratchMachine(yard, { id: 'loop', port });
      const local = (script, opts = {}) => {
        const r = spawnSync('/bin/sh', ['-c', script, 'p342', ...(opts.args ?? [])], { encoding: 'utf8', env: { PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin', HOME: machine.scratchHome ?? '/var/empty', TMUX_TMPDIR: machine.tmuxTmp, HISTFILE: '/dev/null', LC_ALL: 'C' }, timeout: 60_000 });
        return Promise.resolve({ code: r.status ?? 1, out: String(r.stdout ?? ''), err: String(r.stderr ?? '') });
      };
      try {
        if (machine.scratchHome === null || !machine.scratchHome.startsWith(`${RUN_DIR}/`)) {
          throw Object.assign(new Error("the far HOME is not the yard's own: run through `npm run probe:p342`, which exports SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1"), { exitCode: 2 });
        }
        if (!machine.start()) throw Object.assign(new Error("the yard's sshd did not answer on its port"), { exitCode: 2 });
        const userKey = join(yard.root, `${yard.prefix}-userkey`);
        if (!existsSync(userKey)) throw Object.assign(new Error(`the yard's key ${userKey} is not there`), { exitCode: 2 });
        writeSshConfig([{ alias: 'p342-loopback', port, user: machine.user ?? userInfo().username, key: userKey }]);
        writeTailnet(['p342-loopback']);
        writeWrapper('ssh', `#!/bin/sh\nexec /usr/bin/ssh -F ${CONFIG} "$@"\n`);
        writeWrapper('tailscale', `#!/bin/sh\nexec ${process.execPath} ${TS_SCRIPT} ${TS_FIXTURE} ${TS_LOG} "$@"\n`);
        pins = pinned();
        say(`yard at ${yard.root}, sshd on 127.0.0.1:${String(port)}, far HOME ${machine.scratchHome}, far TMUX_TMPDIR ${machine.tmuxTmp}`);
        const far = { row: 'loopback', id: 'p342-loopback', home: machine.scratchHome, bsd: true, sh: local, tmux: (args) => local(`tmux -L "$1" ${args}`, { args: [SOCKET] }), h: null };
        const fixture = await local(FAR_FIXTURE);
        if (fixture.code !== 0) throw Object.assign(new Error(`the far fixture was not made on the loopback machine: ${fixture.err.slice(0, 200)}`), { exitCode: 2 });
        for (const build of [...(PARENT === '' ? [] : ['parent']), 'head']) {
          // Each build meets NO far server and a fresh fixture, so HEAD's
          // Prepare starts its own server and writes every option itself
          // rather than meeting the one the parent left (the second fix
          // round's first N1 run read HEAD "already running").
          await local(`tmux -L "$1" kill-server >/dev/null 2>&1; true`, { args: [SOCKET] });
          const again = await local(FAR_FIXTURE);
          if (again.code !== 0) throw Object.assign(new Error(`the far fixture was not made again before ${build}: ${again.err.slice(0, 200)}`), { exitCode: 2 });
          await launch({ build, name: 'loopback' }, async ({ main, settings }) => {
            await attempt(build, null, 'N1', async () => {
              const added = await addMachine(settings, build, far);
              if (added.ready !== true) throw new Error(`${far.id} is not Ready: ${J(added)}`);
              const opts = await readOptions(settings, far);
              const s = await createSessions(main, far);
              const cost = await bridge(main, `window.gmux.sessions.create(${J({ name: 'cost $HOME', projectPath: `${far.home}/proj`, cwd: `${far.home}/proj`, agent: 'shell', machineId: far.id, projectMachineId: far.id })})`);
              const live = await liveConnection(main, far, s.ids.first);
              const scroll = await scrollBack(main, far, s.ids.first);
              const save = await saveFile(main, far);
              const folder = await newFolder(main, far);
              return {
                options: opts.options,
                detail: opts.detail,
                saveOutcome: save.outcome,
                saveMode: save.mode,
                made: folder.made,
                madeMode: folder.mode,
                dollarFar: live.dollarFar,
                costFar: (await farSession(far, cost.id))?.name ?? null,
                row0: scroll.row0
              };
            });
          });
        }
      } catch (err) {
        say(`N1 stopped: ${err instanceof Error ? err.message : String(err)}`);
        if (err?.exitCode === 2) exit = 2;
        else throw err;
      } finally {
        // The far server on the harness socket under the yard's TMUX_TMPDIR,
        // which daemonises out of sshd's tree, then the yard's sshd and its
        // sessions folder, then every pid the yard recorded.
        await local(`tmux -L "$1" kill-server >/dev/null 2>&1; true`, { args: [SOCKET] });
        try {
          machine.stop();
          machine.cleanup();
        } catch {
          /* already gone */
        }
        killStarted();
        run.historyAfter = historyStat();
        // THE SECOND FIX ROUND: N1 is graded for what it leaves too. It
        // touches no Docker, so that clause reads clean by construction.
        put('head', null, 'RUN', {
          dockerClean: true,
          dockerProblems: [],
          electronsLeft: electronsOfRun(),
          historyMoved: run.historyAfter !== historyBefore,
          samplerViolations: run.violations.length,
          farContentInLog: run.farContentInLog,
          preflightsOk: run.preflights.every(Boolean)
        });
      }
    } else {
      let containerError = null;
      try {
        await withContainers({ label: 'probe:p342', rows: ROW_IDS, scratch: join(RUN_DIR, 'containers'), runId: `p${String(process.pid)}`, publicKey: PUB, keep: KEEP }, async (handles) => {
          const fars = ROW_IDS.map((row) => farOf(row, handles[row]));
          const byRow = Object.fromEntries(fars.map((f) => [f.row, f]));
          writeSshConfig(fars.map((f) => ({ alias: f.id, port: f.h.port, user: 'tortie', key: KEY })));
          writeTailnet(fars.map((f) => f.id));
          writeWrapper('ssh', `#!/bin/sh\nexec /usr/bin/ssh -F ${CONFIG} "$@"\n`);
          writeWrapper('tailscale', `#!/bin/sh\nexec ${process.execPath} ${TS_SCRIPT} ${TS_FIXTURE} ${TS_LOG} "$@"\n`);
          pins = pinned();
          for (const far of fars) await prepareFar(far);
          if (PARENT !== '') {
            await launch({ build: 'parent', name: 'main' }, async (ctx) => {
              await driveRows('parent', ctx, fars);
              await driveAttack('parent', ctx, byRow);
            });
            // THE SECOND FIX ROUND. Nothing the parent drove changes a tmux
            // package any more (K3 and K3d12 run at HEAD alone), so every
            // row meets HEAD on its distribution's own tmux. A row's version
            // is read again here, and a moved one stops the run rather than
            // grading HEAD on a machine that is not the row it names.
            for (const far of fars) {
              const v = (await far.sh('tmux -V')).out.trim();
              if (v !== `tmux ${ROW_VERSION[far.row]}`) throw Object.assign(new Error(`${far.row} reads ${J(v)} after the parent, not tmux ${ROW_VERSION[far.row]}`), { exitCode: 2 });
            }
            // THE SECOND FIX ROUND. Each machine is RESTARTED between the two
            // builds rather than sent `kill-server`: in one of this round's
            // runs a far tmux 3.6 server sent `kill-server` was still
            // exiting when HEAD reached it (a client of the parent's that
            // never let go), and a server that is exiting closes every new
            // client at once, which tmux prints as "server exited
            // unexpectedly", so HEAD's every arm on that row read a machine
            // the parent had left behind. A restart ends every process the
            // parent's run left there and clears /tmp/tmux-* as a boot does
            // (build/docker-run.mjs `restart`); the files stay.
            for (const far of fars) {
              const r = await far.h.restart();
              if (r.code !== 0) throw Object.assign(new Error(`the restart of ${far.h.name} between the builds answered ${String(r.code)}`), { exitCode: 2 });
              if ((await waitForSsh(far)) !== true) throw Object.assign(new Error(`${far.id}'s ssh server did not greet after the restart between the builds`), { exitCode: 2 });
            }
            for (const far of fars) await prepareFar(far);
          }
          await launch({ build: 'head', name: 'main' }, async (ctx) => {
            await driveRows('head', ctx, fars);
            await driveAttack('head', ctx, byRow);
          });
          if (wants('K3')) await driveRelaunch(byRow);
        });
      } catch (err) {
        containerError = err;
      }
      const report = lastReport();
      run.docker = report;
      let dockerProblems = [];
      try {
        assertDockerAsFound(report);
      } catch (err) {
        dockerProblems = [String(err?.message ?? err)];
      }
      if (containerError !== null) {
        say(`the run stopped: ${String(containerError?.stack ?? containerError).slice(0, 600)}`);
        if (containerError?.exitCode === 2) exit = 2;
      }
      run.historyAfter = historyStat();
      put('head', null, 'RUN', {
        dockerClean: report?.clean === true && dockerProblems.length === 0,
        dockerProblems: [...dockerProblems, ...(report?.problems ?? []), ...(report?.differences ?? [])],
        electronsLeft: electronsOfRun(),
        historyMoved: run.historyAfter !== historyBefore,
        samplerViolations: run.violations.length,
        farContentInLog: run.farContentInLog,
        preflightsOk: run.preflights.every(Boolean)
      });
    }
  } finally {
    run.historyAfter ??= historyStat();
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'records.json'), `${J({ records, run }, null, 1)}\n`);
    if (!KEEP) rmSync(join(RUN_DIR, 'containers'), { recursive: true, force: true });
  }

  const problems = gradeRecord(records.head);
  const facts = PARENT === '' ? [] : parentFacts(records.parent);
  say(`his history before ${historyBefore}, after ${String(run.historyAfter)}`);
  if (FAR_MODE === 'loopback') say('Docker: not used (the loopback machine)');
  else say(`Docker: ${run.docker?.clean === true ? 'as it was found' : 'NOT as it was found'} (${String(run.docker?.containersRemoved?.length ?? 0)} container(s), ${String(run.docker?.imagesRemoved?.length ?? 0)} pulled image(s) removed)`);
  for (const f of facts) say(`PARENT ${f}`);
  if (problems.length > 0) {
    console.log(`${TAG} FAIL, ${String(problems.length)}:`);
    for (const p of problems) console.log(`  - ${p}`);
  }
  say(`records ${join(OUT, 'records.json')}; ${String(problems.length)} failure(s), ${String(unreadable)} arm(s) not read`);
  if (exit === 2 || unreadable > 0) process.exit(problems.length > 0 ? 1 : 2);
  process.exit(problems.length > 0 ? 1 : 0);
}

await run();
