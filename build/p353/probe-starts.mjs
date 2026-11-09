#!/usr/bin/env node
/**
 * probe:p353:starts — THE APP RUN FOR PHASE 353's entry Phase 354 (build/p353/SPEC.md §8, §10.2): every session
 * starts in the folder it was asked to, created and restored, on this Mac and on another machine, at the parent and
 * at HEAD; a launch flag ending in `;` reaches the agent as typed; and no conversation is lost by the move.
 *
 * ONE ELECTRON AT A TIME, every launch through build/electron-run.mjs's `withElectron` on ONE scratch profile, a
 * scratch HOME (ZDOTDIR the same, HISTFILE=/dev/null, no TERM_SESSION_ID) and the socket build/harness-socket.mjs
 * hands this file (`gmux-p353t…`), inside build/with-scratch-machine.mjs's LOOPBACK machine with the quiet shell, its
 * own far HOME and none of the person's keys (`SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_SCRATCH_HOME=1`,
 * `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which this file refuses to run without). FIRST the parent,
 * `P353_PARENT_CHECKOUT` (a BUILT checkout of the main commit before this phase, required), then HEAD, on the same profile, so HEAD restores the rows the
 * parent recorded. Every launch names this run's socket (`tmuxSocket`), so the helper judges the socket the app
 * announces, reads the person's session names once before and once after the launch, read only (its layer-4 census,
 * his allowance of 2026-11-02), and its teardown ends this run's scratch server. This file names his server nowhere.
 *
 * THE AGENT IS A STAND-IN, WRITTEN AT RUN TIME (no real agent runs, SPEC §0). pi's registry row is launched by its
 * bare name, which the scratch login shell must resolve to this run's own `pi`, a Node script that answers `-v`,
 * and otherwise files a "conversation" under the scratch HOME keyed by the folder it really runs in (pi files its
 * own by the folder, and a pi started in another folder opens an EMPTY session under the same id: the registry's own
 * note), says whether the conversation it was asked for was there, and stays up until its session ends. Its hello,
 * one JSON line a start, is the ground truth every pi arm reads. Every other probed registry row is hidden
 * (`hiddenAgentsBesides(['pi'])`, build/hidden-agents.mjs) and the app's own `agents:list` must say nothing resolved
 * but the stand-in, under this run; a copy of `pi` where the app's scan looks refuses the run (exit 2).
 *
 * THE ARMS (each graded at the build it names; a reading not taken is UNREADABLE, never a pass):
 *   S    HEAD: every name of §2.6's corpus (44 folders and a link whose own name ends in `\;`, the `#(` job's log an
 *        absolute path inside this run), a shell session created and then restored in it, on this Mac and on the
 *        loopback machine, reads its folder in `#{pane_current_path}` on the run's own server, 0 wrong.
 *   SP   the parent: the same corpus reads §2.6's raw row cell for cell (a name ending in `;` refused, the names tmux
 *        reads elsewhere, `F#` by version), the measurement this phase rests on, taken again.
 *   X    HEAD restoring every shell row the PARENT created: each starts in its folder (a shell keeps no
 *        conversation, so a row recorded before the fix is held like any other).
 *   F    HEAD: pi created with the launch flags `flag;` `set-option -g @p353-injected ran`, here and on the
 *        machine: the stand-in reads all five as typed and the server holds no `@p353-injected`. FP, the parent:
 *        the pane read `flag` and the server ran the option, the danger read again.
 *   M    mechanism 2's matrix: a pi row the PARENT recorded in `C#Tools` and in `semi\;`, restored by HEAD, starts
 *        where the parent's pane ran and its conversation is FOUND; a pi row HEAD created in each starts in the
 *        folder and, restored by HEAD, finds its conversation there. Here and on the machine.
 *   RUN  the preflights, the hidden agents and the shadow refusal at every launch, the stand-in resolved here and on
 *        the machine, every launch's census `no change`, every manifest argv[0] inside the run, no stand-in left,
 *        his shell history unmoved (a moved history read again after HISTORY_QUIET_MS, starting nothing).
 *
 * THE APP'S SSH AND ITS TMPDIR (Phase 353's fix round, the records lens). The app reaches the loopback machine only
 * through a wrapper named by `GMUX_SSH_BIN`, `exec /usr/bin/ssh -F none -o IdentitiesOnly=yes -o IdentityFile=<the
 * yard's key> "$@"`, as probe:p340's does: `-F none` keeps his ssh configuration closed, which OpenSSH reads from the
 * account record whatever HOME says, and the yard's key named alone keeps ssh off the default identity files there.
 * And the app is handed a SHORT `TMPDIR` of its own (`/private/var/tmp/p353t-XXXXXX`, removed at the end): Tortie
 * composes its control socket under `tmpdir()` and accepts a path of up to 100 bytes, OpenSSH binds that path plus a
 * 17-byte suffix, and under a verifier's long scratch TMPDIR every far command failed with `unix_listener: … too long
 * for Unix domain socket`, so Prepare said the far tmux "would not report its version" and no far project opened.
 * That bound is the product's (src/main/machines/ssh.ts, the same at the parent) and is owed its own entry; this
 * probe only stops tripping over it. Prepare's answer and every open's answer are written into `report.steps`.
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server; it binds no interface and dials nothing but the
 * loopback machine; it reads no keychain (`--use-mock-keychain`), no credential, no agent's or conversation store
 * (the stand-in's "conversations" are under the scratch HOME), and no history but its size and modified time; it
 * signals nothing but the far scratch server, by this run's socket under the machine's own TMUX_TMPDIR; it takes no
 * screenshot. VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P353_PARENT_CHECKOUT=<a BUILT parent checkout> npm run -s probe:p353:starts
 *   P353_FAR_TMUX=<tmux>     the far side's tmux (default: the carriage's own), 3.6a or 3.7b
 *   GMUX_TMUX_BIN=<tmux>     this Mac's (default: the checkout's vendored 3.7b), handed to the app
 *   P353_ARMS=S,SP,X,F,M     the arms to drive (default all; RUN is always read)
 *   P353_KEEP=1              keep the scratch world and the stand-in's hellos
 *   node build/p353/probe-starts.mjs --grader-self-test   every grader over the fixtures below; starts nothing
 *   node build/p353/probe-starts.mjs --preflight          the parent, out/ and the tools; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentBinaries, hiddenAgentsBesides, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { manifestSessions, within } from '../scratch-login.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BS = String.fromCharCode(92);

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE (never imported from src/)
// ---------------------------------------------------------------------------

/** The parent this phase is measured against (build/p353/SPEC.md: origin/main at the spec). */
export const SNAPSHOT = 'the main commit before this phase';
export const MACHINE_ID = 'p353far';
export const MACHINE_LABEL = 'p353 loopback';
/** The registry row stood in, and its bare name. */
export const STAND_IN_ROWS = Object.freeze(['pi']);
/** The launch flags F hands the create: the first ends in `;`, and the rest spell a harmless tmux command. */
export const FLAGS = Object.freeze(['flag;', 'set-option', '-g', '@p353-injected', 'ran']);
/** How long a moved history is waited on, starting nothing, before it is read again (his rule of 2026-10-20). */
export const HISTORY_QUIET_MS = 180_000;

/** The corpus key of the `#(` job, whose folder is built at run time with its log an absolute path in this run. */
export const JOB = 'j#(echo p353job >> p353-jobs.log)';
/** The link whose own name ends in `\;`, pointing to an ordinary folder. */
export const LINK = `link${BS}; -> real`;
/** §2.6's corpus, M354a's order: 44 folder names (one path component each, `C#/app` a nested pair) and the link. */
export const CORPUS = Object.freeze([
  'plain', 'C#/app', 'C#Tools', '#Sales', 'notes#Home', 'a#{b}', 'a#{b', 'x##y', 'C##Tools',
  'F#', 'F##', 'x#[y', 'x#[y]z', 'x##[y', 'x###[y', 'a#[b#Sc]d', '#T', '#S', '#H', '#D', '#F',
  '#I', '#P', '#W', '#h', '#,x', '#}x', 'a#xb', 'a#Ab', '100%', '%Y', '~x', 'a;b',
  'semi;', `semi${BS};`, `semi${BS}${BS};`, ';', `${BS};`, `a${BS}b`, `a${BS}`, 'j#(unclosed',
  JOB, '#{?pane_dead,dead,live}', 'a#{E:HOME}b', LINK
]);
/**
 * The names the PARENT's create puts anywhere but their folder, WRITTEN BY HAND from §2.6 ("30: every `#` before
 * `{ ( # , }`, before `D F H I P S T W h`, a final `#` (3.7b only), `C##Tools`, `F##`, an unclosed `#{` or `#(`,
 * `#{?…}`, `#{E:…}`, and every name ending in `;`, `\;` or `\\;`, the link"). `F#` is read by version, below.
 */
export const PARENT_WRONG = Object.freeze(new Set([
  'C#Tools', '#Sales', 'notes#Home', 'a#{b}', 'a#{b', 'x##y', 'C##Tools', 'F##', '#T', '#S', '#H', '#D', '#F',
  '#I', '#P', '#W', '#h', '#,x', '#}x', 'semi;', `semi${BS};`, `semi${BS}${BS};`, ';', `${BS};`, 'j#(unclosed',
  JOB, '#{?pane_dead,dead,live}', 'a#{E:HOME}b', LINK
]));
/** The names the parent's create REFUSES ("unknown command: -e"): a folder whose last character is `;`. */
export const PARENT_REFUSED = Object.freeze(new Set(['semi;', ';']));
/** The two versions §2.6 measured; `F#` is wrong on a 3.7 (it drops a final `#`) and kept on 3.6a. */
export const MEASURED = Object.freeze(['3.6a', '3.7b']);
const dropsFinalHash = (version) => /^3\.7/.test(String(version));
/** The folders M's pi rows are recorded in, by the parent and by HEAD. */
export const PI_FOLDERS = Object.freeze(['C#Tools', `semi${BS};`]);

// ---------------------------------------------------------------------------
// The graders, pure: a reading in, `{ state: 'pass'|'fail'|'unreadable', failed, why }` out
// ---------------------------------------------------------------------------

const unread = (why) => ({ state: 'unreadable', failed: [], why });
const verdict = (failed) => ({ state: failed.length === 0 ? 'pass' : 'fail', failed, why: null });
/** A reading the probe did not take (no tmux session carried the id, or the path read nothing): never a pass or a failure. */
const notTaken = (where) => typeof where === 'string' && where.startsWith('no pane');

/** Whether the parent's create is expected to put this corpus key elsewhere on `version` (null: not measured there). */
export function parentExpectsElsewhere(key, version) {
  if (key === 'F#') return MEASURED.includes(String(version)) ? dropsFinalHash(version) : null;
  return PARENT_WRONG.has(key);
}

/** One side's corpus cells must each read `folder`, created and restored. */
function headSide(label, side) {
  if (side === null || side === undefined) return { unreadable: `${label}: no corpus reading` };
  if (!Array.isArray(side.cells) || side.cells.length !== CORPUS.length) return { unreadable: `${label}: ${String(side.cells?.length ?? 0)} of ${String(CORPUS.length)} cells read` };
  const failed = [];
  for (const c of side.cells) {
    if (c.create === null || c.create === undefined) return { unreadable: `${label}: ${J(c.key)} was never created` };
    if (notTaken(c.create) || notTaken(c.restore)) return { unreadable: `${label}: ${J(c.key)}: ${String(notTaken(c.create) ? c.create : c.restore)}` };
    if (c.create !== 'folder') failed.push(`${label} create ${J(c.key)}: ${c.create}`);
    if (c.restore === null || c.restore === undefined) {
      if (c.create === 'folder') return { unreadable: `${label}: ${J(c.key)} was never restored` };
    } else if (c.restore !== 'folder') failed.push(`${label} restore ${J(c.key)}: ${c.restore}`);
    if (c.job === true) failed.push(`${label} ${J(c.key)}: its #( job ran`);
  }
  return { failed };
}

/** S: HEAD's corpus, here and on the machine, every cell in its folder. */
export function gradeS(r) {
  const out = [];
  for (const [label, side] of [['here', r?.local], ['far', r?.far]]) {
    const g = headSide(label, side);
    if (g.unreadable !== undefined) return unread(g.unreadable);
    out.push(...g.failed);
  }
  return verdict(out);
}

/** SP: the parent's corpus reads §2.6's raw row, cell for cell, by the version of the server that read it. */
export function gradeSP(r) {
  const out = [];
  for (const [label, side] of [['here', r?.local], ['far', r?.far]]) {
    if (side === null || side === undefined) return unread(`${label}: no corpus reading`);
    if (!Array.isArray(side.cells) || side.cells.length !== CORPUS.length) return unread(`${label}: ${String(side.cells?.length ?? 0)} of ${String(CORPUS.length)} cells read`);
    if (typeof side.version !== 'string' || side.version === '') return unread(`${label}: the server's version was not read`);
    for (const c of side.cells) {
      if (c.create === null || c.create === undefined) return unread(`${label}: ${J(c.key)} was never asked`);
      if (notTaken(c.create) || notTaken(c.restore)) return unread(`${label}: ${J(c.key)}: ${String(notTaken(c.create) ? c.create : c.restore)}`);
      const want = parentExpectsElsewhere(c.key, side.version);
      if (want === null) continue;
      const refused = String(c.create).startsWith('create failed');
      if (PARENT_REFUSED.has(c.key)) {
        if (!refused) out.push(`${label} ${J(c.key)}: the parent created it (${c.create}), where §2.6 reads tmux refusing it`);
        continue;
      }
      // THE PROBE REVIEW (Phase 353). A refusal §2.6 does not read is no
      // "elsewhere": without this, every name §2.6 reads elsewhere passed when
      // the parent refused to create it at all.
      if (refused) {
        out.push(`${label} ${J(c.key)} on ${side.version}: the parent refused it (${c.create}), where §2.6 reads ${want ? 'elsewhere' : 'its folder'}`);
        continue;
      }
      if (want !== (c.create !== 'folder')) out.push(`${label} ${J(c.key)} on ${side.version}: ${c.create}, where §2.6 reads ${want ? 'elsewhere' : 'its folder'}`);
      // The parent's restore hands the folder as its create did, so it reads the same.
      if (!refused && c.restore !== null && c.restore !== undefined && want !== (c.restore !== 'folder')) {
        out.push(`${label} restore ${J(c.key)} on ${side.version}: ${c.restore}, where its create read ${c.create}`);
      }
    }
  }
  return verdict(out);
}

/** X: HEAD restoring the shell rows the parent created; every one in its folder, and at least one restored. */
export function gradeX(r) {
  if (!Array.isArray(r?.cells)) return unread('no reading of the parent rows HEAD restored');
  if (r.cells.length === 0) return unread('HEAD restored none of the parent rows');
  const missed = r.cells.find((c) => notTaken(c.restore));
  if (missed !== undefined) return unread(`${J(missed.key)}: ${String(missed.restore)}`);
  return verdict(r.cells.filter((c) => c.restore !== 'folder').map((c) => `${J(c.key)}: ${String(c.restore)}`));
}

/** F (HEAD) and FP (the parent): the stand-in's argv tail and the server's option, here and on the machine. */
export function gradeF(r, build) {
  const out = [];
  for (const [label, side] of [['here', r?.local], ['far', r?.far]]) {
    if (side === null || side === undefined) return unread(`${label}: no launch flag reading`);
    if (!Array.isArray(side.argv)) return unread(`${label}: the stand-in never said hello`);
    if (typeof side.injected !== 'string') return unread(`${label}: the server's option was not read`);
    const tail = side.argv.slice(-FLAGS.length);
    if (build === 'head') {
      if (J(tail) !== J(FLAGS)) out.push(`${label}: the stand-in read ${J(side.argv)}, not the flags as typed ${J(FLAGS)}`);
      if (side.injected !== '') out.push(`${label}: the server holds @p353-injected ${J(side.injected)}, so the flags ran as a command`);
    } else {
      if (side.argv[side.argv.length - 1] !== 'flag') out.push(`${label}: the parent's pane read ${J(side.argv)}, where §2.6 reads \`flag\` alone`);
      if (side.injected !== 'ran') out.push(`${label}: the parent's server holds @p353-injected ${J(side.injected)}, where §2.6 reads the command run`);
    }
  }
  return verdict(out);
}

/** M: the pre-fix rows restore where the parent's pane ran, conversation found; HEAD's rows in their folder, found. */
export function gradeM(r) {
  const out = [];
  for (const [label, side] of [['here', r?.local], ['far', r?.far]]) {
    if (side === null || side === undefined) return unread(`${label}: no matrix reading`);
    for (const key of PI_FOLDERS) {
      const row = side.rows?.find((x) => x.key === key) ?? null;
      if (row === null) return unread(`${label} ${J(key)}: no row read`);
      const { parentCreate, headRestoreOfParent, headCreate, headRestore, real } = row;
      for (const [what, h] of Object.entries({ parentCreate, headRestoreOfParent, headCreate, headRestore })) {
        if (h === null || h === undefined || typeof h.cwd !== 'string') return unread(`${label} ${J(key)}: no hello for ${what}`);
      }
      if (typeof real !== 'string') return unread(`${label} ${J(key)}: the folder's real path was not read`);
      if (parentCreate.cwd === real) out.push(`${label} ${J(key)}: the parent's pane ran in the folder, so this row shows nothing about a pre-fix row`);
      if (headRestoreOfParent.cwd !== parentCreate.cwd) out.push(`${label} ${J(key)}: HEAD restored the parent's row in ${headRestoreOfParent.cwd}, not where its pane ran (${parentCreate.cwd})`);
      if (headRestoreOfParent.found !== true) out.push(`${label} ${J(key)}: HEAD restored the parent's row and its conversation was NOT found`);
      if (headRestoreOfParent.id !== parentCreate.id) out.push(`${label} ${J(key)}: HEAD's restore asked for conversation ${J(headRestoreOfParent.id)}, not the parent's ${J(parentCreate.id)}`);
      if (headCreate.cwd !== real) out.push(`${label} ${J(key)}: HEAD created its pi in ${headCreate.cwd}, not ${real}`);
      if (headRestore.cwd !== real) out.push(`${label} ${J(key)}: HEAD restored its own row in ${headRestore.cwd}, not ${real}`);
      if (headRestore.found !== true) out.push(`${label} ${J(key)}: HEAD restored its own row and its conversation was NOT found`);
    }
  }
  return verdict(out);
}

/** RUN: the run's own hygiene. */
export function gradeRUN(r) {
  if (r === null || r === undefined) return unread('no RUN reading');
  const out = [];
  if (r.preflight !== true) out.push('a launch was refused by a preflight');
  if (!Array.isArray(r.launches) || r.launches.length === 0) return unread('no launch was made');
  for (const l of r.launches) {
    if (l.tmuxSocket !== r.socket) out.push(`${l.label} named ${J(l.tmuxSocket)}, not this run's socket`);
    // THE PROBE REVIEW (Phase 353). A launch whose body threw never had its
    // census confirmed, which is no reading of his server, not a change on it.
    if (l.census === null || l.census === undefined) return unread(`${l.label}: the launch did not complete, so the helper's census of his server was never confirmed`);
    if (l.census !== 'no change') out.push(`${l.label}: the helper's census read ${J(l.census)}`);
  }
  if (!Array.isArray(r.agentsHeld) || r.agentsHeld.length !== r.launches.length) return unread(`the app's agents:list was read at ${String(r.agentsHeld?.length ?? 0)} of ${String(r.launches.length)} launches`);
  if (r.agentsHeld?.every((x) => x === true) !== true) out.push('a launch resolved an agent other than the stand-in');
  if (r.manifest?.read !== true) return unread(`the manifest was not read: ${String(r.manifest?.why)}`);
  if ((r.manifest.outside ?? []).length > 0) out.push(`manifest rows ran programs outside the run: ${J(r.manifest.outside)}`);
  if (r.standinLeft !== 0) out.push(`${String(r.standinLeft)} stand-in(s) still running`);
  if (r.history?.before !== r.history?.after && r.history?.quiet?.again !== r.history?.after) out.push('his shell history moved across the run, and again while nothing ran');
  return verdict(out);
}

export const GRADERS = Object.freeze({
  S: { title: 'HEAD: every corpus folder, created and restored, here and on the machine, starts in its folder', grade: gradeS },
  SP: { title: "the parent: the corpus reads §2.6's raw row cell for cell", grade: gradeSP },
  X: { title: 'HEAD restoring the parent\'s shell rows starts each in its folder', grade: gradeX },
  F: { title: 'HEAD: a launch flag ending in ; reaches the agent as typed and runs nothing on the server', grade: (r) => gradeF(r, 'head') },
  FP: { title: "the parent: the same flags run the option on the server and the pane reads `flag`", grade: (r) => gradeF(r, 'parent') },
  M: { title: 'no conversation lost: a pre-fix row restores where it ran, a HEAD row in its folder', grade: gradeM },
  RUN: { title: 'the run: preflights, hidden agents, the census, the manifest, nothing left, history', grade: gradeRUN }
});

// ---------------------------------------------------------------------------
// The grader self-test: each grader over fixtures, each clause shown red on its own break. Starts nothing.
// ---------------------------------------------------------------------------

const cells = (fn) => CORPUS.map((key) => ({ key, ...fn(key) }));
const allFolder = () => cells(() => ({ create: 'folder', restore: 'folder', job: false }));
const parentCells = (version) =>
  cells((key) => {
    if (PARENT_REFUSED.has(key)) return { create: 'create failed: unknown command: -e', restore: null, job: false };
    const wrong = parentExpectsElsewhere(key, version) === true;
    return { create: wrong ? 'elsewhere: /h' : 'folder', restore: wrong ? 'elsewhere: /h' : 'folder', job: false };
  });
const hello = (cwd, found, id = 'u1') => ({ cwd, found, id });
const piRows = () =>
  PI_FOLDERS.map((key) => ({
    key,
    real: `/w/${key}`,
    parentCreate: hello('/h', false),
    headRestoreOfParent: hello('/h', true),
    headCreate: hello(`/w/${key}`, false, 'u2'),
    headRestore: hello(`/w/${key}`, true, 'u2')
  }));
const runOk = () => ({
  preflight: true,
  socket: 'gmux-p353t-x-1',
  launches: [{ label: 'p353t-parent', tmuxSocket: 'gmux-p353t-x-1', census: 'no change' }, { label: 'p353t-head', tmuxSocket: 'gmux-p353t-x-1', census: 'no change' }],
  agentsHeld: [true, true],
  manifest: { read: true, outside: [], why: null },
  standinLeft: 0,
  history: { before: '1 1|2 2', after: '1 1|2 2', quiet: null }
});
const edit = (base, fn) => {
  const copy = JSON.parse(J(base));
  fn(copy);
  return copy;
};

export const FIXTURES = Object.freeze([
  { arm: 'S', name: 'every cell in its folder', want: 'pass', r: { local: { version: '3.7b', cells: allFolder() }, far: { version: '3.6a', cells: allFolder() } } },
  { arm: 'S', name: 'one create elsewhere', want: 'fail', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.local.cells[2].create = 'elsewhere: /h'; }) },
  { arm: 'S', name: 'one restore elsewhere', want: 'fail', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.far.cells[33].restore = 'elsewhere: /h'; }) },
  { arm: 'S', name: 'a job that ran', want: 'fail', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.local.cells[41].job = true; }) },
  { arm: 'S', name: 'a cell never created', want: 'unreadable', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.local.cells[0].create = null; }) },
  { arm: 'S', name: 'a cell never restored', want: 'unreadable', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.far.cells[5].restore = null; }) },
  { arm: 'S', name: 'no far side', want: 'unreadable', r: { local: { cells: allFolder() }, far: null } },
  { arm: 'S', name: 'a pane never read', want: 'unreadable', r: edit({ local: { cells: allFolder() }, far: { cells: allFolder() } }, (d) => { d.local.cells[7].restore = 'no pane: no tmux session carries its id'; }) },
  { arm: 'SP', name: "§2.6's raw row on 3.7b here and 3.6a far", want: 'pass', r: { local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } } },
  { arm: 'SP', name: 'F# read as 3.6a reads it on a 3.7b', want: 'fail', r: { local: { version: '3.7b', cells: parentCells('3.6a') }, far: { version: '3.6a', cells: parentCells('3.6a') } } },
  { arm: 'SP', name: 'C#Tools in its folder at the parent', want: 'fail', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.local.cells[2].create = 'folder'; d.local.cells[2].restore = 'folder'; }) },
  { arm: 'SP', name: 'semi; created at the parent', want: 'fail', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.far.cells[33].create = 'folder'; }) },
  { arm: 'SP', name: 'a parent restore that disagrees with its create', want: 'fail', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.local.cells[3].restore = 'folder'; }) },
  { arm: 'SP', name: 'no version read', want: 'unreadable', r: { local: { version: '', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } } },
  { arm: 'SP', name: 'a parent pane never read, which must not pass for elsewhere', want: 'unreadable', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.local.cells[2].create = 'no pane: #{pane_current_path} read nothing'; }) },
  { arm: 'X', name: 'every parent row in its folder', want: 'pass', r: { cells: [{ key: 'C#Tools', restore: 'folder' }, { key: 'plain', restore: 'folder' }] } },
  { arm: 'X', name: 'one parent row elsewhere', want: 'fail', r: { cells: [{ key: 'C#Tools', restore: 'elsewhere: /h' }] } },
  { arm: 'X', name: 'none restored', want: 'unreadable', r: { cells: [] } },
  { arm: 'X', name: 'a restored pane never read', want: 'unreadable', r: { cells: [{ key: 'plain', restore: 'folder' }, { key: 'C#Tools', restore: 'no pane: no tmux session carries its id' }] } },
  { arm: 'F', name: 'the flags as typed, nothing ran', want: 'pass', r: { local: { argv: ['--session-id', 'u', ...FLAGS], injected: '' }, far: { argv: ['--session-id', 'u', ...FLAGS], injected: '' } } },
  { arm: 'F', name: 'the parent shape at HEAD', want: 'fail', r: { local: { argv: ['--session-id', 'u', 'flag'], injected: 'ran' }, far: { argv: ['--session-id', 'u', ...FLAGS], injected: '' } } },
  { arm: 'F', name: 'the flags typed and the option set too', want: 'fail', r: { local: { argv: ['--session-id', 'u', ...FLAGS], injected: 'ran' }, far: { argv: ['--session-id', 'u', ...FLAGS], injected: '' } } },
  { arm: 'F', name: 'no hello', want: 'unreadable', r: { local: { argv: null, injected: '' }, far: { argv: ['--session-id', 'u', ...FLAGS], injected: '' } } },
  { arm: 'FP', name: 'the parent ran the option and the pane read flag', want: 'pass', r: { local: { argv: ['--session-id', 'u', 'flag'], injected: 'ran' }, far: { argv: ['--session-id', 'u', 'flag'], injected: 'ran' } } },
  { arm: 'FP', name: 'the parent not reproducing', want: 'fail', r: { local: { argv: ['--session-id', 'u', ...FLAGS], injected: '' }, far: { argv: ['--session-id', 'u', 'flag'], injected: 'ran' } } },
  { arm: 'M', name: 'pre-fix rows found where they ran, HEAD rows in the folder', want: 'pass', r: { local: { rows: piRows() }, far: { rows: piRows() } } },
  { arm: 'M', name: "HEAD moved the parent's row into the folder", want: 'fail', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.local.rows[0].headRestoreOfParent = hello('/w/C#Tools', false); }) },
  { arm: 'M', name: "the parent's conversation not found", want: 'fail', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.far.rows[1].headRestoreOfParent.found = false; }) },
  { arm: 'M', name: "HEAD's own row created elsewhere", want: 'fail', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.local.rows[1].headCreate.cwd = '/h'; }) },
  { arm: 'M', name: "HEAD's own row not found on restore", want: 'fail', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.far.rows[0].headRestore.found = false; }) },
  { arm: 'M', name: 'a parent pane in the folder shows nothing', want: 'fail', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.local.rows[0].parentCreate.cwd = '/w/C#Tools'; d.local.rows[0].headRestoreOfParent.cwd = '/w/C#Tools'; }) },
  { arm: 'M', name: 'a hello missing', want: 'unreadable', r: edit({ local: { rows: piRows() }, far: { rows: piRows() } }, (d) => { d.far.rows[0].headCreate = null; }) },
  { arm: 'RUN', name: 'a clean run', want: 'pass', r: runOk() },
  { arm: 'RUN', name: 'a census that saw a change', want: 'fail', r: edit(runOk(), (d) => { d.launches[1].census = 'a session WENT from his server'; }) },
  { arm: 'RUN', name: 'an agent other than the stand-in', want: 'fail', r: edit(runOk(), (d) => { d.agentsHeld[0] = false; }) },
  { arm: 'RUN', name: 'a program outside the run', want: 'fail', r: edit(runOk(), (d) => { d.manifest.outside.push({ id: 'x', argv0: '/opt/homebrew/bin/pi' }); }) },
  { arm: 'RUN', name: 'a stand-in left', want: 'fail', r: edit(runOk(), (d) => { d.standinLeft = 1; }) },
  { arm: 'RUN', name: 'history moved twice', want: 'fail', r: edit(runOk(), (d) => { d.history.after = '9 9|2 2'; d.history.quiet = { again: '10 10|2 2' }; }) },
  { arm: 'RUN', name: 'history moved once, his own terminal', want: 'pass', r: edit(runOk(), (d) => { d.history.after = '9 9|2 2'; d.history.quiet = { again: '9 9|2 2' }; }) },
  { arm: 'RUN', name: 'the manifest not read', want: 'unreadable', r: edit(runOk(), (d) => { d.manifest = { read: false, why: 'gone' }; }) },
  // THE PROBE REVIEW (Phase 353): a refusal is not "elsewhere", and a reading not taken is UNREADABLE.
  { arm: 'SP', name: 'review: a name §2.6 reads elsewhere that the parent REFUSED is not elsewhere', want: 'fail', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.local.cells[2].create = 'create failed: no server running'; d.local.cells[2].restore = null; }) },
  { arm: 'SP', name: 'review: a name §2.6 reads in its folder that the parent refused', want: 'fail', r: edit({ local: { version: '3.7b', cells: parentCells('3.7b') }, far: { version: '3.6a', cells: parentCells('3.6a') } }, (d) => { d.far.cells[0].create = 'create failed: x'; d.far.cells[0].restore = null; }) },
  { arm: 'RUN', name: 'review: a launch that did not complete never confirmed its census', want: 'unreadable', r: edit(runOk(), (d) => { d.launches[1].census = null; }) },
  { arm: 'RUN', name: "review: the app's agents:list read at one launch of two", want: 'unreadable', r: edit(runOk(), (d) => { d.agentsHeld = [true]; }) }
]);

export function graderSelfTest() {
  let failures = 0;
  for (const f of FIXTURES) {
    const got = GRADERS[f.arm].grade(f.r);
    const ok = got.state === f.want;
    if (!ok) failures += 1;
    process.stdout.write(`[p353t] ${ok ? 'ok  ' : 'FAIL'} ${f.arm.padEnd(4)} ${f.name}: ${got.state}${ok ? '' : `, wanted ${f.want} (${J(got.failed)} ${String(got.why)})`}\n`);
  }
  // The hand-written tables, held to §2.6's counts.
  const wrong = (version) => CORPUS.filter((k) => parentExpectsElsewhere(k, version) === true).length;
  for (const [version, want] of [['3.7b', 30], ['3.6a', 29]]) {
    const n = wrong(version);
    const ok = n === want;
    if (!ok) failures += 1;
    process.stdout.write(`[p353t] ${ok ? 'ok  ' : 'FAIL'} table: the parent puts ${String(n)} of ${String(CORPUS.length)} names elsewhere on ${version}, §2.6 reads ${String(want)}\n`);
  }
  const corpusOk = CORPUS.length === 45 && new Set(CORPUS).size === 45;
  if (!corpusOk) failures += 1;
  process.stdout.write(`[p353t] ${corpusOk ? 'ok  ' : 'FAIL'} table: the corpus holds ${String(CORPUS.length)} distinct names, §2.6 reads 45\n`);
  process.stdout.write(`[p353t] grader self-test ${failures === 0 ? 'PASS' : 'FAIL'}: ${String(FIXTURES.length)} fixtures and 3 table checks, ${String(failures)} wrong. Nothing was started.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// --preflight: what the run needs, asked before the harness socket is made. It starts nothing.
// ---------------------------------------------------------------------------

/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/tmux/argument.ts',
  'src/main/tmux/sessions.ts',
  'src/main/machines/remote-stamps.ts',
  'src/main/machines/remote-sessions.ts',
  'src/main/machines/remote-restore.ts',
  'src/main/machines/remote-record.ts',
  'src/main/restore/restore.ts',
  'src/main/manifest/agents.ts',
  'src/main/agents/detection.ts'
];
const PARENT = (process.env['P353_PARENT_CHECKOUT'] ?? '').trim();

function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P353_PARENT_CHECKOUT is not set. SP, FP, X and M need the parent (${SNAPSHOT}, built) to run FIRST on the same profile`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent checkout first`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) p.push(`out/ is older than ${newer.join(', ')}: build first`);
  }
  if (!existsSync('/usr/bin/sqlite3')) p.push("/usr/bin/sqlite3 is missing, which reads the manifest's own copy");
  return p;
}

if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p353t] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p353t] preflight PASS: the parent ${resolve(PARENT)} is built and out/ is current\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p353t]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
/** His shell history's size and modified time, under the ACCOUNT's home (never $HOME), and nothing else of it. */
const historyStat = () =>
  ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
const HISTORY_BEFORE = historyStat();
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p353:starts`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p353t')) refuse(`"${SOCKET}" is not a gmux-p353t harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
for (const v of ['SCRATCH_MACHINE_QUIET_SHELL', 'SCRATCH_MACHINE_SCRATCH_HOME', 'SCRATCH_MACHINE_NO_OWN_KEYS']) {
  if ((process.env[v] ?? '') !== '1') refuse(`${v} is not 1: the loopback machine would read his own rc files, home or keys.`);
}
const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not the scratch machine's own.`);
/** The far machine's tmux, which the machine's row names. */
const FAR_TMUX = (process.env['P353_FAR_TMUX'] ?? '').trim() || String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the far tmux ${J(FAR_TMUX)} does not exist.`);
const FAR_HOME = join(CONFIG_ROOT, 'home');
const FAR_ZDOT = join(CONFIG_ROOT, 'zdot');
if (!existsSync(FAR_HOME)) refuse(`the machine's scratch home ${FAR_HOME} does not exist, so its far side would be his own home.`);
if (!existsSync(FAR_ZDOT)) refuse(`the machine's quiet ZDOTDIR ${FAR_ZDOT} does not exist, so the far login shell would read his own rc files.`);
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P353_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P353_ARMS'] ?? '').trim() || 'S,SP,X,F,FP,M').split(',').map((x) => x.trim()));
for (const a of ARMS) if (GRADERS[a] === undefined || a === 'RUN') refuse(`P353_ARMS names ${J(a)}, which is no arm`);
const on = (id) => ARMS.has(id);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p353t'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p353t'));
if (/[#;\\]/.test(RUN)) refuse(`the run folder ${RUN} holds a character tmux reads, so every reading would be about it rather than the corpus.`);
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const LOCAL = join(RUN, 'local');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
const FAR_BIN = join(RUN, 'farbin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in for the app. */
const STANDIN_DIR = join(RUN, 'standin');
const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p353t');
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** ONE `node`, a link to this node, for the Electron shim's `#!/usr/bin/env node` and nothing else. */
const NODE_BIN = join(RUN, 'nodebin');
/**
 * THE APP'S OWN SHORT TMPDIR (the fix round; see the header): under /private/var/tmp, never /private/tmp, which
 * macOS cleans, and short enough that `<it>/tortie-mux/m-<12 hex>` plus OpenSSH's 17-byte suffix fits in 104 bytes.
 * Removed at the end, whatever happened.
 */
const APP_TMP = realpathSync(mkdtempSync('/private/var/tmp/p353t-'));
if (Buffer.byteLength(`${APP_TMP}/tortie-mux/m-000000000000`, 'utf8') + 17 > 103) refuse(`the app's TMPDIR ${APP_TMP} is too long for an ssh control socket.`);
/** THE APP'S ONE SSH (the fix round; see the header): the loopback machine only, his configuration closed. */
const SSH_WRAPPER = join(RUN, 'sshbin', 'ssh');
const YARD_KEY = join(CONFIG_ROOT, 'p71-scratch-userkey');
if (!existsSync(YARD_KEY)) refuse(`the loopback machine's own key ${YARD_KEY} is not there, so the app's ssh would offer his.`);
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const FAR_PATH = `${FAR_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const SYSTEM_DIRS = APP_PATH.split(':').filter((d) => d.startsWith('/') && !within(RUN, d));
const HIDDEN_PREFIX = 'p353t';
const HIDDEN_IDS = hiddenAgentsBesides(STAND_IN_ROWS);
const HIDDEN_BINS = hiddenAgentBinaries(HIDDEN_IDS);

const report = { checkout: ROOT, parent: resolve(PARENT), socket: SOCKET, farTmux: FAR_TMUX, arms: [], readings: {}, steps: [] };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const v = GRADERS[id].grade(reading);
  report.readings[id] = reading;
  if (v.state === 'unreadable') {
    unreadable += 1;
    report.arms.push({ id, ok: null, said: v.why });
    say(`UNREADABLE ${id}: ${v.why}`);
    return;
  }
  const ok = v.state === 'pass';
  if (!ok) failures += 1;
  report.arms.push({ id, ok, failed: v.failed, title: GRADERS[id].title });
  say(`${ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${ok ? '' : `; FAILED ${J(v.failed)}`}`);
}
/** Run one step; a step that throws is written down and the run goes on. */
async function step(label, body) {
  try {
    return await body();
  } catch (err) {
    report.steps.push(`${label}: ${String(err?.message ?? err)}`);
    say(`${label} stopped: ${String(err?.message ?? err)}`);
    return null;
  }
}
const safely = (label, fn, fallback = null) => {
  try {
    return fn();
  } catch (err) {
    report.steps.push(`${label}: ${String(err?.message ?? err)}`);
    return fallback;
  }
};
async function waitFor(test, ms, every = 250) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started >= ms) return null;
    await sleep(every);
  }
}

// ---------------------------------------------------------------------------
// The two servers, read by this run's socket and nothing else
// ---------------------------------------------------------------------------

/** This Mac's scratch server's own binary, read once a launch from its pid (a client of its own version). */
let localTmuxBin = null;
function tmuxBin() {
  if (localTmuxBin !== null) return localTmuxBin;
  const named = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
  const probe = named !== '' ? named : join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  const pid = Number(String(spawnSync(existsSync(probe) ? probe : 'tmux', ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim());
  if (!(pid > 1)) return existsSync(probe) ? probe : 'tmux';
  const command = String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim();
  const bin = command.split(/\s+/)[0] ?? '';
  if (bin.startsWith('/') && existsSync(bin)) localTmuxBin = bin;
  return localTmuxBin ?? (existsSync(probe) ? probe : 'tmux');
}
const tmuxOut = (...args) => {
  const r = spawnSync(tmuxBin(), ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000, maxBuffer: 16 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000, maxBuffer: 16 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const readerOf = (far) => (far ? farOut : tmuxOut);
const versionOf = (far) => String(readerOf(far)('display-message', '-p', '#{version}') ?? '').trim();
/** A server's sessions as `$`-id → `@gmux-id`, from its own list. */
function idsOn(read) {
  const out = new Map();
  for (const line of String(read('list-sessions', '-F', '#{session_id} #{@gmux-id}') ?? '').split('\n')) {
    const m = /^(\$\d+) (\S*)$/.exec(line.trim());
    if (m !== null) out.set(m[1], m[2]);
  }
  return out;
}
const tmuxIdOf = (far, sessionId) => [...idsOn(readerOf(far)).entries()].find(([, g]) => g === sessionId)?.[0] ?? null;
const targetOf = (sessionId, far, ms = 20_000) => waitFor(() => tmuxIdOf(far, sessionId), ms, 200);
/** Where a session's pane really started: `folder`, `elsewhere: <path>`, or why it was not read. */
async function whereOf(sessionId, far, real) {
  const target = await targetOf(sessionId, far);
  if (target === null) return { where: 'no pane: no tmux session carries its id', target: null };
  const pane = String(readerOf(far)('display-message', '-p', '-t', target, '#{pane_current_path}') ?? '').replace(/\n$/, '');
  if (pane === '') return { where: 'no pane: #{pane_current_path} read nothing', target };
  return { where: pane === real ? 'folder' : `elsewhere: ${pane}`, target };
}

// ---------------------------------------------------------------------------
// The app, over its renderer and its bridge
// ---------------------------------------------------------------------------

/** The agents' session variables and this file's own: never handed on. */
const INHERITED = Object.fromEntries(
  [...Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_|PI_|P353_)/.test(n) || n === 'TERM_SESSION_ID'), 'NVM_BIN', 'BUN_INSTALL'].map((n) => [n, undefined])
);
const devtoolsPort = () => safely('DevToolsActivePort', () => Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()), 0);
async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
/** The app window, once its bridge and the two drives this run uses are armed. */
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, "window.gmux !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux and the drives');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
async function bridge(cdp, expr, ms = 180_000) {
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, ms));
}

// ---------------------------------------------------------------------------
// The stand-in pi, written at run time
// ---------------------------------------------------------------------------

/**
 * One pi stand-in at `path`, logging to `log`: it answers `-v`, and otherwise files a conversation under
 * `$HOME/.p353-pi/<the folder it runs in, encoded>/<its --session-id>.jsonl`, says in its hello whether that file
 * was there, and stays up until its session ends. Its shebang is THIS node, by absolute path, so the far pane, which
 * is this Mac too, runs it with no PATH lookup. It reads nothing but its own store and writes nothing outside it and
 * its log.
 */
function writeStandin(path, log) {
  const text = [
    `#!${process.execPath}`,
    '// probe:p353:starts — a pi stand-in. NOT pi: it reads no store of pi\'s and contacts nothing.',
    "'use strict';",
    "const fs = require('fs');",
    "const path = require('path');",
    'const args = process.argv.slice(2);',
    "if (args.includes('-v') || args.includes('--version')) { process.stdout.write('0.83.0\\n'); process.exit(0); }",
    'const cwd = fs.realpathSync(process.cwd());',
    "const at = args.indexOf('--session-id');",
    'const id = at >= 0 && at + 1 < args.length ? args[at + 1] : null;',
    "const home = process.env.HOME || '';",
    "const store = path.join(home, '.p353-pi', encodeURIComponent(cwd));",
    'let found = false;',
    'if (id !== null && home !== \'\') {',
    "  const file = path.join(store, encodeURIComponent(id) + '.jsonl');",
    '  found = fs.existsSync(file);',
    "  if (!found) { fs.mkdirSync(store, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ id, cwd }) + '\\n'); }",
    '}',
    `fs.appendFileSync(${J(log)}, JSON.stringify({ at: Date.now(), pid: process.pid, cwd, argv: args, id, found, session: process.env.GMUX_SESSION_ID || null }) + '\\n');`,
    "process.stdout.write('p353 stand-in in ' + cwd + ': ' + (found ? 'found' : 'new') + ' conversation ' + String(id) + '\\n');",
    "for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => process.exit(0));",
    'setInterval(() => {}, 1 << 30);',
    ''
  ].join('\n');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
  chmodSync(path, 0o755);
}
const LOCAL_LOG = join(STANDIN_DIR, 'hellos-local.jsonl');
const FAR_LOG = join(STANDIN_DIR, 'hellos-far.jsonl');
/** Every hello of one side, oldest first. */
function hellosOf(far) {
  const file = far ? FAR_LOG : LOCAL_LOG;
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => safely('a hello', () => JSON.parse(l), null)).filter((h) => h !== null);
}
/** The newest hello of a session since `fromMs`, waited for. */
const helloOf = (sessionId, far, fromMs, ms = 20_000) =>
  waitFor(() => {
    const mine = hellosOf(far).filter((h) => h.session === sessionId && Number(h.at) >= fromMs);
    return mine[mine.length - 1] ?? null;
  }, ms, 200);

// ---------------------------------------------------------------------------
// The sessions, made the way a person makes them
// ---------------------------------------------------------------------------

let nameSeq = 0;
const nameFor = (label) => `p353-${label}-${String((nameSeq += 1))}`;
/** A create through the bridge: its id, or `create failed: …`. */
async function create(main, { label, far, cwd, agent = 'shell', extraArgs = [] }) {
  const input = far
    ? { name: nameFor(label), projectPath: FAR, cwd, agent, machineId: MACHINE_ID, projectMachineId: MACHINE_ID, ...(extraArgs.length > 0 ? { extraArgs } : {}) }
    : { name: nameFor(label), projectPath: LOCAL, cwd, agent, ...(extraArgs.length > 0 ? { extraArgs } : {}) };
  const got = await bridge(main, `window.gmux.sessions.create(${J(input)}).then((s) => s.id)`);
  if (!got.ok || typeof got.value !== 'string') return { id: null, failed: `create failed: ${String(got.error ?? J(got)).split('\n')[0].slice(0, 200)}` };
  return { id: got.value, failed: null };
}
/** A row's status as main reads it, or null. */
async function statusOf(main, id) {
  const got = await bridge(main, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, status: s.status })))');
  return got.ok ? (got.value.find((s) => s.id === id)?.status ?? null) : null;
}
/** End a session, and wait (bounded) until main reads it ended, so a restore after it is offered. */
async function end(main, id) {
  await bridge(main, `window.gmux.sessions.kill(${J(id)})`).catch(() => null);
  await waitFor(async () => (['exited', 'restorable'].includes(String(await statusOf(main, id))) ? true : null), 15_000, 300);
}
/**
 * A restore through the bridge: null, or why it was refused. A session on another machine is offered only once a
 * completed list of that machine no longer holds it, so a refusal is asked again, bounded, before it is the reading.
 */
async function restore(main, id) {
  let last = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const got = await bridge(main, `window.gmux.sessions.restore(${J(id)})`);
    if (got.ok) return null;
    last = `restore failed: ${String(got.error).split('\n')[0].slice(0, 200)}`;
    await sleep(2_000);
  }
  return last;
}

/** The corpus folders of one side, planted once: `{ key, folder, real }` in corpus order. */
function plantCorpus(base, side) {
  return CORPUS.map((key, i) => {
    const parent = join(base, String(i));
    if (key === LINK) {
      mkdirSync(join(parent, 'real'), { recursive: true });
      const link = join(parent, `link${BS};`);
      if (!existsSync(link)) symlinkSync(join(parent, 'real'), link);
      return { key, folder: link, real: realpathSync(join(parent, 'real')) };
    }
    // The job's log is an absolute path in this run, so a job that ran writes nowhere else, whatever the client's folder.
    const name = key === JOB ? `j#(echo p353job >> ${join(RUN, `jobs-${side}.log`)})` : key;
    const folder = join(parent, name);
    mkdirSync(folder, { recursive: true });
    return { key, folder, real: realpathSync(folder) };
  });
}
/** Lines the `#(` job's log holds on one side: a job that ran during a create adds one. */
const jobLines = (side) => safely('the job log', () => (existsSync(join(RUN, `jobs-${side}.log`)) ? readFileSync(join(RUN, `jobs-${side}.log`), 'utf8').split('\n').filter((l) => l !== '').length : 0), 0);

/** One corpus side at one build: every folder created, read, ended, restored, read and ended. */
async function corpusSide(main, far, folders, build) {
  const side = far ? 'far' : 'local';
  const cellsRead = [];
  for (const f of folders) {
    const jobsBefore = jobLines(side);
    // A job tmux started writes its line a moment later, so the job's own cell waits for it before it reads.
    const jobRan = async () => {
      if (f.key === JOB) await sleep(1_500);
      return jobLines(side) > jobsBefore;
    };
    const made = await create(main, { label: `${build}-${side}`, far, cwd: f.folder });
    if (made.id === null) {
      cellsRead.push({ key: f.key, id: null, create: made.failed, restore: null, job: await jobRan() });
      continue;
    }
    const first = await whereOf(made.id, far, f.real);
    await end(main, made.id);
    await sleep(300);
    const refused = await restore(main, made.id);
    const second = refused !== null ? { where: refused } : await whereOf(made.id, far, f.real);
    await end(main, made.id);
    cellsRead.push({ key: f.key, id: made.id, create: first.where, restore: second.where, job: await jobRan() });
  }
  return { version: versionOf(far), cells: cellsRead };
}

/** F at one build and side: pi with the launch flags, its hello's argv, and the server's option. */
async function flagSide(main, far, build) {
  const read = readerOf(far);
  read('set-option', '-gqu', '@p353-injected');
  const from = Date.now();
  const made = await create(main, { label: `${build}-flag`, far, cwd: far ? FAR : LOCAL, agent: 'pi', extraArgs: [...FLAGS] });
  if (made.id === null) return { argv: null, injected: null, why: made.failed };
  const h = await helloOf(made.id, far, from);
  // A read the server did not answer is no reading (null, UNREADABLE), never an option that was not set.
  const option = read('show-options', '-gqv', '@p353-injected');
  const injected = option === null ? null : option.trim();
  await end(main, made.id);
  read('set-option', '-gqu', '@p353-injected');
  return { argv: h === null ? null : h.argv, injected };
}

/** After a pi restore: its hello, pressing Enter once on the pane when the armed command waits for it. */
async function restoredHello(main, id, far) {
  const from = Date.now();
  const refused = await restore(main, id);
  if (refused !== null) return null;
  let h = await helloOf(id, far, from, 3_000);
  if (h === null) {
    const target = await targetOf(id, far);
    if (target !== null) readerOf(far)('send-keys', '-t', target, 'Enter');
    h = await helloOf(id, far, from, 20_000);
  }
  return h;
}

// ---------------------------------------------------------------------------
// The launches
// ---------------------------------------------------------------------------

function writeLogin() {
  mkdirSync(BIN, { recursive: true });
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nPS1='p353 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeFileSync(join(FAR_ZDOT, '.zprofile'), `# probe:p353:starts: the machine's stand-in first, and nothing of his.\nexport PATH="${FAR_PATH}"\nexport HISTFILE=/dev/null\n`, 'utf8');
  writeFileSync(join(FAR_ZDOT, '.zshrc'), `# probe:p353:starts\nexport PATH="${FAR_PATH}"\nexport HISTFILE=/dev/null\nPS1='p353far %# '\nRPROMPT=''\n`, 'utf8');
  mkdirSync(NODE_BIN, { recursive: true });
  if (!existsSync(join(NODE_BIN, 'node'))) symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  mkdirSync(dirname(SSH_WRAPPER), { recursive: true });
  writeFileSync(
    SSH_WRAPPER,
    `#!/bin/sh\n# probe:p353:starts: the loopback machine only. -F none first, so no ssh configuration of his is read,\n# and the yard's key alone, so no default identity file of his is offered.\nexec /usr/bin/ssh -F none -o IdentitiesOnly=yes -o 'IdentityFile=${YARD_KEY}' "$@"\n`,
    'utf8'
  );
  chmodSync(SSH_WRAPPER, 0o755);
}
function writeMachines() {
  mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
  writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] })}\n`, 'utf8');
  const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(known), { recursive: true });
  writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p353/probe-starts.mjs' }), 'utf8');
}
/** Where the app's scan reads absolute folders, from the checkout's own resolve.ts, as text. */
function absoluteScanDirsOf(checkout) {
  const src = safely('resolve.ts', () => readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8'), '');
  const atFn = src.indexOf('export function extraBinDirsFor(');
  if (atFn === -1) return null;
  const endAt = src.indexOf('\n}\n', atFn);
  const body = src.slice(atFn, endAt === -1 ? src.length : endAt);
  return [...new Set([...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
}
function shadowCopiesOf(dirs, names) {
  const copies = [];
  const unreadableDirs = [];
  for (const dir of dirs) {
    let entries = null;
    try {
      entries = readdirSync(dir);
    } catch (err) {
      if (err?.code !== 'ENOENT') unreadableDirs.push(dir);
      continue;
    }
    for (const name of names) if (entries.includes(name)) copies.push(join(dir, name));
  }
  return { ok: copies.length === 0 && unreadableDirs.length === 0, copies, unreadable: unreadableDirs };
}

const launches = [];
const agentsHeld = [];
let preflightOk = true;
let agentsRefused = false;

function launchOptions(label, checkout) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    // The helper is handed this run's socket: it reads his session names before and after, read only, and its
    // teardown ends this run's scratch server. Nothing else in this file reads his server.
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    env: withoutDevRenderer({
      ...INHERITED,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      PATH: APP_PATH,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      // The fix round: the app's one ssh, and a TMPDIR short enough for its control sockets (the header).
      GMUX_SSH_BIN: SSH_WRAPPER,
      TMPDIR: `${APP_TMP}/`,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 5_400_000
  };
}

async function launch(label, checkout, body) {
  // The fix round: the wrapper must still be an executable file, or `resolveSsh` falls back to /usr/bin/ssh with
  // no `-F none` (src/main/machines/carriage.ts), and the run would read his ssh configuration.
  if (!safely('the ssh wrapper', () => (statSync(SSH_WRAPPER).mode & 0o111) !== 0, false)) {
    preflightOk = false;
    throw new Error(`the app's ssh wrapper ${SSH_WRAPPER} is not an executable file, so the app would fall back to /usr/bin/ssh`);
  }
  const scan = absoluteScanDirsOf(checkout);
  const shadow = scan === null ? { ok: false, copies: [], unreadable: ['(extraBinDirsFor not found)'] } : shadowCopiesOf([...scan, ...SYSTEM_DIRS], ['pi']);
  if (!shadow.ok) {
    agentsRefused = true;
    preflightOk = false;
    throw new Error(`a copy of pi sits where the app's scan looks, or a folder it searches cannot be read (${J(shadow)}), so Tortie would run it for its version`);
  }
  const pre = hiddenAgentsPrecheck({ checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_ROWS });
  if (!pre.ok) {
    agentsRefused = true;
    preflightOk = false;
    throw new Error(`the hidden agents' precheck refused the launch: ${pre.said}`);
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  const options = launchOptions(label, checkout);
  const entry = { label, tmuxSocket: options.tmuxSocket, census: null };
  launches.push(entry);
  try {
    const value = await withElectron(options, async () => {
      const main = await attachMain();
      try {
        const list = JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR, 120_000));
        const held = hiddenAgentsScanVerdict(list, HIDDEN_IDS);
        const only = standInsOnlyVerdict(list, { standIns: STAND_IN_ROWS, under: RUN });
        agentsHeld.push(held.ok && only.ok);
        if (!held.ok || !only.ok) {
          agentsRefused = true;
          throw new Error(`agents:list: ${held.said}; ${only.said}`);
        }
        return await body(main);
      } finally {
        main.close();
      }
    });
    entry.census = 'no change';
    say(`${label}: the helper read his session names before and after this launch, read only, and saw no change`);
    return value;
  } catch (err) {
    const m = String(err?.message ?? err);
    if (/ APPEARED on | WENT from /.test(m)) entry.census = m;
    throw err;
  } finally {
    localTmuxBin = null;
  }
}

/** The local project, the machine made usable and its far project opened. */
async function setUp(main) {
  await bridge(main, `window.__p293.addProject(${J(LOCAL)})`);
  const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
  // The fix round: Prepare's answer and every open's answer are written down, so a run that stops here says why.
  report.steps.push(`setUp: Prepare answered ${J(up).slice(0, 600)}`);
  const usable = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable);
  if (!usable) throw new Error(`the loopback machine did not become usable: ${J(up).slice(0, 300)}`);
  const answers = [];
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
    answers.push(J(opened?.value?.result ?? opened).slice(0, 200));
    if (opened.ok && opened.value?.result?.ok === true) {
      report.steps.push(`setUp: the far project opened on attempt ${String(attempt)}`);
      return;
    }
    await sleep(3_000);
  }
  report.steps.push(`setUp: the far project did not open in 20 attempts: ${answers.join(' | ')}`);
  throw new Error(`the far project did not open: ${answers[answers.length - 1] ?? 'no answer'}`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const readings = { parent: null, head: null, x: null, flagHead: null, flagParent: null, pi: { local: {}, far: {} } };
let farServerEnded = null;
try {
  for (const d of [HOME, LOCAL, FAR, STANDIN_DIR, FAR_BIN]) mkdirSync(d, { recursive: true });
  writeLogin();
  writeStandin(join(BIN, 'pi'), LOCAL_LOG);
  writeStandin(join(FAR_BIN, 'pi'), FAR_LOG);
  writeMachines();
  // THE PRECONDITION: `pi` is this run's stand-in, here and on the machine, and no hidden row's binary resolves, asked
  // of the login shells the app will ask. Anything else is no run (exit 2).
  {
    const loginShell = (process.env['SHELL'] ?? '').trim() || userInfo().shell || '/bin/zsh';
    const ask = (env, bare) => (String(spawnSync(loginShell, ['-lc', `command -v ${bare} || true`], { encoding: 'utf8', timeout: 30_000, env }).stdout ?? '').trim().split('\n').pop() ?? '');
    const clean = (env) => {
      for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k];
      return env;
    };
    const here = clean({ ...process.env, ...INHERITED, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: APP_PATH });
    const far = clean({ ...process.env, ...INHERITED, HOME: FAR_HOME, ZDOTDIR: FAR_ZDOT, HISTFILE: '/dev/null', TMUX_TMPDIR: carriage.tmuxTmp });
    const resolved = { here: ask(here, 'pi'), far: ask(far, 'pi'), hidden: Object.fromEntries(HIDDEN_BINS.map((b) => [b, ask(here, b)])) };
    report.readings.resolves = resolved;
    const ok = resolved.here === join(BIN, 'pi') && resolved.far === join(FAR_BIN, 'pi') && Object.values(resolved.hidden).every((at) => at === '');
    if (!ok) {
      agentsRefused = true;
      preflightOk = false;
      throw new Error(`the scratch login shells resolve ${J(resolved)}: the stand-in is not this run's, or a hidden agent resolves, so nothing is launched`);
    }
  }
  const localFolders = plantCorpus(LOCAL, 'local');
  const farFolders = plantCorpus(FAR, 'far');
  const piFolder = (base, key) => {
    const folder = join(base, 'pi', key);
    mkdirSync(folder, { recursive: true });
    return { key, folder, real: realpathSync(folder) };
  };
  const piLocal = PI_FOLDERS.map((k) => piFolder(LOCAL, k));
  const piFar = PI_FOLDERS.map((k) => piFolder(FAR, k));
  say(`measuring ${ROOT} after the parent ${resolve(PARENT)}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}, its tmux ${FAR_TMUX}`);

  // ======================================================================
  // THE PARENT, first: the corpus, the flags, and the pi rows HEAD restores
  // ======================================================================
  await launch('p353t-parent', resolve(PARENT), async (main) => {
    await setUp(main);
    if (on('SP') || on('X')) {
      readings.parent = {
        local: await step('SP here', () => corpusSide(main, false, localFolders, 'parent')),
        far: await step('SP far', () => corpusSide(main, true, farFolders, 'parent'))
      };
    }
    if (on('FP')) readings.flagParent = { local: await step('FP here', () => flagSide(main, false, 'parent')), far: await step('FP far', () => flagSide(main, true, 'parent')) };
    if (on('M')) {
      for (const [far, folders] of [[false, piLocal], [true, piFar]]) {
        for (const f of folders) {
          await step(`M parent ${far ? 'far' : 'here'} ${f.key}`, async () => {
            const from = Date.now();
            const made = await create(main, { label: 'parent-pi', far, cwd: f.folder, agent: 'pi' });
            if (made.id === null) throw new Error(made.failed);
            const h = await helloOf(made.id, far, from);
            readings.pi[far ? 'far' : 'local'][f.key] = { key: f.key, real: f.real, id: made.id, parentCreate: h };
            await end(main, made.id);
          });
        }
      }
    }
  });

  // ======================================================================
  // HEAD: the parent's rows restored, its own corpus, the flags, the pi matrix
  // ======================================================================
  await launch('p353t-head', ROOT, async (main) => {
    await setUp(main);
    if (on('X') && readings.parent?.local?.cells !== undefined) {
      const restored = [];
      for (const c of readings.parent.local.cells) {
        if (c.id === null) continue;
        const f = localFolders.find((x) => x.key === c.key);
        const refused = await restore(main, c.id);
        const at = refused !== null ? { where: refused } : await whereOf(c.id, false, f.real);
        await end(main, c.id);
        restored.push({ key: c.key, restore: at.where });
      }
      readings.x = { cells: restored };
    }
    if (on('S')) {
      readings.head = {
        local: await step('S here', () => corpusSide(main, false, localFolders, 'head')),
        far: await step('S far', () => corpusSide(main, true, farFolders, 'head'))
      };
    }
    if (on('F')) readings.flagHead = { local: await step('F here', () => flagSide(main, false, 'head')), far: await step('F far', () => flagSide(main, true, 'head')) };
    if (on('M')) {
      for (const [far, folders] of [[false, piLocal], [true, piFar]]) {
        for (const f of folders) {
          await step(`M head ${far ? 'far' : 'here'} ${f.key}`, async () => {
            const row = readings.pi[far ? 'far' : 'local'][f.key] ?? { key: f.key, real: f.real, id: null, parentCreate: null };
            if (row.id !== null) {
              row.headRestoreOfParent = await restoredHello(main, row.id, far);
              await end(main, row.id);
            }
            const from = Date.now();
            const made = await create(main, { label: 'head-pi', far, cwd: f.folder, agent: 'pi' });
            if (made.id === null) throw new Error(made.failed);
            row.headCreate = await helloOf(made.id, far, from);
            await end(main, made.id);
            await sleep(300);
            row.headRestore = await restoredHello(main, made.id, far);
            await end(main, made.id);
            readings.pi[far ? 'far' : 'local'][f.key] = row;
          });
        }
      }
    }
  });
} catch (err) {
  report.error = String(err?.message ?? err);
  say(`the run stopped: ${report.error}`);
} finally {
  // The machine's scratch server, by this run's socket under the machine's own TMUX_TMPDIR, and nothing else.
  farServerEnded = safely("the machine's scratch server", () => spawnSync(FAR_TMUX, ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000 }).status, null);
}

// ---- the arms, graded now that every read is in -----------------------------
if (on('S')) arm('S', readings.head ?? {});
if (on('SP')) arm('SP', readings.parent ?? {});
if (on('X')) arm('X', readings.x ?? {});
if (on('F')) arm('F', readings.flagHead ?? {});
if (on('FP')) arm('FP', readings.flagParent ?? {});
if (on('M')) {
  const sideOf = (s) => ({ rows: Object.values(readings.pi[s]).map((r) => ({ ...r, parentCreate: r.parentCreate ?? null, headRestoreOfParent: r.headRestoreOfParent ?? null, headCreate: r.headCreate ?? null, headRestore: r.headRestore ?? null })) });
  arm('M', { local: sideOf('local'), far: sideOf('far') });
}
// RUN: the manifest's programs, read from a COPY beside its WAL after the app is gone; the stand-ins still running.
const m = manifestSessions(MANIFEST);
const roots = [RUN, FAR_HOME];
const SHELLS = safely('/etc/shells', () => readFileSync('/etc/shells', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/')), ['/bin/zsh', '/bin/bash', '/bin/sh']);
const outside = m.read ? m.rows.filter((row) => !(roots.some((root) => within(root, row.argv0)) || (row.agent === 'shell' && (row.argv0 === null || SHELLS.includes(row.argv0))))).map((row) => ({ id: row.id, agent: row.agent, argv0: row.argv0 })) : [];
await sleep(1_500);
const table = String(spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 }).stdout ?? '');
const standinLeft = table.split('\n').filter((l) => l.includes(join(BIN, 'pi')) || l.includes(join(FAR_BIN, 'pi'))).length;
const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
if (history.after !== history.before) {
  say(`his shell history moved across the run (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
  await sleep(HISTORY_QUIET_MS);
  history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
}
arm('RUN', { preflight: preflightOk, socket: SOCKET, launches: launches.map((l) => ({ label: l.label, tmuxSocket: l.tmuxSocket, census: l.census })), agentsHeld, manifest: { read: m.read, outside, why: m.why }, standinLeft, farServerEnded, history });
safely('the report', () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'probe-starts.json'), `${J(report, null, 2)}\n`, { mode: 0o600 });
});
safely("the app's TMPDIR", () => rmSync(APP_TMP, { recursive: true, force: true }));
if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
else say(`kept ${RUN} (P353_KEEP=1): the stand-in's hellos under ${STANDIN_DIR}; every reading in ${OUT}`);
say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
if (agentsRefused) say('a launch was refused because an agent other than the stand-in could have run: no run, exit 2');
process.exit(agentsRefused ? 2 : failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
