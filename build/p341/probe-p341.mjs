#!/usr/bin/env node
/**
 * `npm run probe:p341`. Phase 341's app run (docs/BACKLOG.md "## Phase 341"):
 * New Folder and New File in a project on ANOTHER machine, pressed in the
 * Explorer the way a person presses them, graded against the same press in a
 * project on this Mac.
 *
 * ## What it drives, one Electron, one build
 *
 * One launch of the build in `P341_CHECKOUT` (this checkout by default), so a
 * parent and HEAD are measured by running this file twice. In it, the loopback
 * machine is confirmed and prepared through the window's own drive, a project
 * is opened there and another on this Mac, and for every case below the probe
 *
 *   1. clicks the row the create aims at (a root file for the project root, a
 *      plain folder, a collapsed chain whose last folder holds a file, and a
 *      collapsed chain whose last folder is EMPTY, which is what a New Folder
 *      made the press before leaves behind),
 *   2. presses the Explorer header's New folder (or New file) button,
 *   3. types the name into the inline box with a real `Input.insertText`,
 *   4. presses a real Return, FAST (150 ms after the text) or SLOW (after the
 *      app has heard at least one machine state push while the box was open,
 *      at most 40 s, and never before 6 s),
 *   5. waits for the answer and reads three things: what the renderer asked
 *      main and what main said the machine answered, the toasts, and the far
 *      (or local) disk itself, listed by `ls -1A` in a shell of the probe's own.
 *
 * WHAT THE RENDERER ASKED IS READ BY LOGPOINTS, not by a wrapper: the preload
 * bridge is frozen, so breakpoints whose condition records a value and answers
 * false are set over the devtools protocol in the SHIPPED renderer chunks
 * (the technique build/probe-p205-terminal.mjs states). Each records into
 * `globalThis.__p341.ev`: `ops` every time the tree's verbs are built,
 * `newEntry`, `commit` (with the pending create the verbs held at that
 * moment), `settleCommit`, `finishCreate`, `makeDirAsk`/`makeDirAnswer`,
 * `renameAsk`/`renameAnswer`, `putAnswer`, `localCreated` and every `toast`.
 * The page also subscribes to the machine state push, so a reading says how
 * many pushes landed while the box was open.
 *
 * ## The grade, per case
 *
 * PASS when the disk holds exactly one new entry and it is the typed name, no
 * `untitled folder` or `untitled` was left on the disk, no error toast was
 * raised, and no rename was asked. The report prints every case's reading
 * whatever its verdict, because the parent's reading IS the measurement.
 *
 * ## What it refuses, and the bounds that bind it
 *
 *   - It runs only inside build/with-scratch-machine.mjs with
 *     SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1, so the
 *     far `$HOME` is the yard's own (D23), and only with `GMUX_TMUX_SOCKET` a
 *     `gmux-p341…-<n>` scratch socket and `GMUX_HARNESS_DIR` a directory of
 *     its own. The app's tmux server on that socket is the one thing it ends
 *     by name, in its `finally`. It never names `-L gmux`, and it passes the
 *     socket to the app through the environment rather than as the helper's
 *     `tmuxSocket`, so the helper's census of his server is not taken either.
 *   - Every Electron through build/electron-run.mjs's `withElectron`, ended in
 *     its `finally`. A scratch profile, a scratch HOME and ZDOTDIR,
 *     `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset, and an agents.json that
 *     renames the Gemini, Qwen, Antigravity, Grok and Droid binaries, read back
 *     through agents:list before anything is pressed. No model turn.
 *   - Every far folder is under `<harness dir>/p341/far`, every local one under
 *     `<harness dir>/p341/local`, and both are removed in the `finally` unless
 *     `P341_KEEP=1`. His `~/.zsh_history` and `~/.bash_history` are read for
 *     size and modified time only, before and after, and a move fails the run.
 *
 * Knobs: `P341_CHECKOUT` (a built checkout to launch), `P341_CASES` (a comma
 * list of case ids), `P341_KEEP=1`, `P341_OUT_DIR`. Exit 0 when every case
 * passed, 1 when one failed, 2 when it could not run or a case could not be
 * READ, which is never a pass.
 *
 *   npm run -s probe:p341
 *   node build/p341/probe-p341.mjs --grader-self-test
 *   node build/p341/probe-p341.mjs --regrade <p341-report.json>
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const TAG = '[p341]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

// ===========================================================================
// THE CASES. `at` is the row the create aims at; `shape` names the fixture
// folder the case owns, so no case reads another's leftovers.
// ===========================================================================

/**
 * `expect` is what an honest build does with the press: `made` (the typed name
 * is on the disk), or a refusal the MACHINE answers for the typed name, being
 * `protected` (a `.ssh` folder) and `exists` (the name was made behind the
 * tree's back while the box was open, by `plant`). A refusal case is the attack:
 * the refusal must be about the typed name, never `gone` about a placeholder.
 *
 * @typedef {{ id: string, side: 'remote'|'local', kind: 'dir'|'file', at: 'root'|'plain'|'chainFile'|'chainEmpty', pace: 'fast'|'slow', name: string, expect?: 'made'|'protected'|'exists', plant?: boolean }} Case
 */
/** @type {Case[]} */
export const CASES = [
  { id: 'R1', side: 'remote', kind: 'dir', at: 'root', pace: 'fast', name: 'p341 a b' },
  { id: 'R2', side: 'remote', kind: 'dir', at: 'root', pace: 'slow', name: 'p341 slow root' },
  { id: 'R3', side: 'remote', kind: 'dir', at: 'plain', pace: 'fast', name: 'p341 café' },
  { id: 'R4', side: 'remote', kind: 'dir', at: 'plain', pace: 'slow', name: 'p341 slow plain' },
  { id: 'R5', side: 'remote', kind: 'dir', at: 'chainFile', pace: 'fast', name: 'p341 chain' },
  { id: 'R6', side: 'remote', kind: 'dir', at: 'chainFile', pace: 'slow', name: 'p341 slow chain' },
  { id: 'R7', side: 'remote', kind: 'dir', at: 'chainEmpty', pace: 'fast', name: 'p341 empty' },
  { id: 'R8', side: 'remote', kind: 'dir', at: 'chainEmpty', pace: 'slow', name: 'p341 slow empty' },
  { id: 'R9', side: 'remote', kind: 'file', at: 'root', pace: 'fast', name: 'p341 file.txt' },
  { id: 'R10', side: 'remote', kind: 'file', at: 'chainEmpty', pace: 'slow', name: 'p341 slow file.txt' },
  { id: 'L1', side: 'local', kind: 'dir', at: 'root', pace: 'slow', name: 'p341 slow root' },
  { id: 'L2', side: 'local', kind: 'dir', at: 'chainEmpty', pace: 'fast', name: 'p341 empty' },
  { id: 'L3', side: 'local', kind: 'dir', at: 'chainEmpty', pace: 'slow', name: 'p341 slow empty' },
  { id: 'L4', side: 'local', kind: 'dir', at: 'chainFile', pace: 'slow', name: 'p341 slow chain' },
  { id: 'L5', side: 'local', kind: 'file', at: 'root', pace: 'slow', name: 'p341 slow file.txt' },
  { id: 'A1', side: 'remote', kind: 'dir', at: 'root', pace: 'slow', name: '.ssh', expect: 'protected' },
  { id: 'A2', side: 'remote', kind: 'dir', at: 'plain', pace: 'slow', name: 'p341 planted', expect: 'exists', plant: true },
  { id: 'A3', side: 'remote', kind: 'file', at: 'plain', pace: 'slow', name: 'p341 planted.txt', expect: 'exists', plant: true }
];

/**
 * The sentence a refusal case must be answered with: its first words, from
 * src/renderer/machines/explorer.ts (a folder) and editor.ts (a file, whose
 * create is a save with `expect: 'new'`).
 */
export const REFUSAL_WORDS = {
  dir: {
    protected: 'Tortie does not touch .git or .ssh folders on ',
    exists: 'There is already something called '
  },
  file: {
    exists: 'Tortie did not make that file, because a file of that name is already on '
  }
};

/** The folder a case's create lands in, relative to the project, '' for the root. */
export function destOf(c) {
  const n = c.id.toLowerCase();
  if (c.at === 'root') return '';
  if (c.at === 'plain') return `plain-${n}`;
  if (c.at === 'chainFile') return `cf-${n}/cf-${n}-b`;
  return `ce-${n}/ce-${n}-b`;
}

/** The row a case clicks first: a root file for the root, else the destination folder. */
export function clickOf(c) {
  return c.at === 'root' ? 'README.md' : `${destOf(c)}/`;
}

/**
 * Grade one case's reading. Pure. `before` and `after` are `ls -1A` listings of
 * the destination, one name per line.
 */
export function gradeCase(c, r) {
  const failed = [];
  const expect = c.expect ?? 'made';
  const before = new Set(r.before ?? []);
  const added = (r.after ?? []).filter((n) => !before.has(n));
  const same = (a, b) => a.normalize('NFC') === b.normalize('NFC');
  if (expect === 'made') {
    if (!(added.length === 1 && same(added[0], c.name))) failed.push(`the disk gained ${J(added)}, not exactly ${J(c.name)}`);
  } else {
    // Nothing new beyond the planted entry, which is the probe's own.
    const extra = added.filter((n) => !(c.plant === true && same(n, c.name)));
    if (extra.length > 0) failed.push(`the disk gained ${J(extra)} on a refusal`);
  }
  if ((r.after ?? []).some((n) => /^untitled( folder)?( \d+)?$/.test(n))) failed.push('an untitled entry was left on the disk');
  const errors = (r.toasts ?? []).filter((t) => t.kind === 'error');
  if (expect === 'made' && errors.length > 0) failed.push(`error toast(s): ${J(errors.map((t) => t.text))}`);
  if (expect !== 'made') {
    const words = REFUSAL_WORDS[c.kind][expect] ?? '(no sentence is ruled for this refusal)';
    if (!(errors.length === 1 && errors[0].text.startsWith(words))) failed.push(`the refusal said ${J(errors.map((t) => t.text))}, not one sentence starting ${J(words)}`);
  }
  if ((r.ev ?? []).some((e) => e.ev === 'renameAsk')) failed.push('a rename was asked for a create');
  if ((r.rowsAfter ?? []).some((p) => /(^|\/)untitled( folder)?\/?$/.test(p))) failed.push('an untitled row is still drawn');
  return { ok: failed.length === 0, failed };
}

// ===========================================================================
// THE LOGPOINTS. Each is a needle in a shipped chunk, the offset of the
// statement it records at (needle start, or needle end for a body), and the
// object it records. A needle that binds nothing is reported, never a pass.
// ===========================================================================

const LOGPOINTS = [
  { name: 'ops', chunk: 'tree', needle: 'function createTreeOps(ctx){', at: 'end', rec: "{ev:'ops',remoteEntry:ctx.remoteEntry!==undefined,remoteCreate:ctx.remoteCreate!==undefined}" },
  { name: 'newEntry', chunk: 'tree', needle: 'newEntry(destDirCanonical,kind){', at: 'end', rec: "{ev:'newEntry',dest:destDirCanonical,kind}" },
  { name: 'settleCommit', chunk: 'tree', needle: 'finishCreate(create.placeholder,create.kind,create.placeholder)', at: 'start', rec: "{ev:'settleCommit',placeholder:create.placeholder}" },
  { name: 'commit', chunk: 'tree', needle: 'onRenameCommitted(event){', at: 'end', rec: "{ev:'commit',src:event.sourcePath,dst:event.destinationPath,isFolder:event.isFolder,pending:pending===null?null:pending.placeholder}" },
  { name: 'rejected', chunk: 'tree', needle: 'onRenameRejected(message){', at: 'end', rec: "{ev:'rejected',message}" },
  { name: 'finishCreate', chunk: 'tree', needle: 'const finishCreate=(placeholder,kind,destinationRel)=>{', at: 'end', rec: "{ev:'finishCreate',placeholder,kind,dest:destinationRel}" },
  { name: 'makeDirAsk', chunk: 'tree', needle: 'finishRemoteMakeDir=(remote,placeholder,canonical,release)=>{', at: 'end', rec: "{ev:'makeDirAsk',canonical,root:ctx.rootPath}" },
  { name: 'makeDirAnswer', chunk: 'tree', needle: 'remote.makeDir(abs).then(result=>{', at: 'end', rec: "{ev:'makeDirAnswer',abs,outcome:result.outcome}" },
  { name: 'renameAsk', chunk: 'tree', needle: 'finishRemoteRename=(remote,sourceCanonical,destCanonical,kind,release,modelHoldsTheMove=true)=>{', at: 'end', rec: "{ev:'renameAsk',from:sourceCanonical,to:destCanonical,kind}" },
  { name: 'renameAnswer', chunk: 'tree', needle: 'renameEntry(fromAbs,toAbs,kind).then(result=>{', at: 'end', rec: "{ev:'renameAnswer',fromAbs,toAbs,outcome:result.outcome}" },
  { name: 'putAnswer', chunk: 'tree', needle: 'remote.putFile(abs).then(result=>{', at: 'end', rec: "{ev:'putAnswer',abs,outcome:result.outcome}" },
  { name: 'localCreated', chunk: 'tree', needle: 'path:toRel(destinationRel)}).then(entry=>{', at: 'end', rec: "{ev:'localCreated',path:entry.path}" },
  { name: 'toast', chunk: 'index', needle: 'toast(kind,text,opts){', at: 'end', rec: "{ev:'toast',kind,text}" }
];

/** The chunk under out/renderer/assets that carries `needle`, exactly one. */
function chunkWith(checkout, needle) {
  const dir = join(checkout, 'out', 'renderer', 'assets');
  const hits = readdirSync(dir).filter((n) => n.endsWith('.js') && readFileSync(join(dir, n), 'utf8').includes(needle));
  if (hits.length !== 1) throw new Error(`${hits.length} chunks under ${dir} carry ${J(needle)}`);
  return { name: hits[0], text: readFileSync(join(dir, hits[0]), 'utf8') };
}

/** Line and column of one logpoint in its chunk, or null when the needle is absent. */
export function siteIn(text, lp) {
  const i = text.indexOf(lp.needle);
  if (i < 0 || text.indexOf(lp.needle, i + 1) >= 0) return null;
  const at = lp.at === 'end' ? i + lp.needle.length : i;
  const line = text.slice(0, at).split('\n').length - 1;
  const col = at - (text.lastIndexOf('\n', at - 1) + 1);
  return { line, col };
}

// ===========================================================================
// THE RUN
// ===========================================================================

async function run() {
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (!/^gmux-p341[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`GMUX_TMUX_SOCKET ${J(SOCKET)} is not a gmux-p341 scratch socket ending in a number.`);
  const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
  const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
  if (process.env['SCRATCH_MACHINE_QUIET_SHELL'] !== '1' || process.env['SCRATCH_MACHINE_SCRATCH_HOME'] !== '1') {
    refuse('SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1 are both required: without them the loopback far home is his real home (D23).');
  }
  let carriage = null;
  try {
    carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  if (!existsSync(join(CONFIG_ROOT, 'home'))) refuse(`the yard has no scratch home at ${join(CONFIG_ROOT, 'home')} (D23).`);
  const farHome = realpathSync(join(CONFIG_ROOT, 'home'));
  if (!farHome.startsWith(`${realpathSync(CONFIG_ROOT)}/`)) refuse(`the far home ${farHome} is not inside the yard.`);

  const CHECKOUT = resolve((process.env['P341_CHECKOUT'] ?? '').trim() || ROOT);
  if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) refuse(`${join(CHECKOUT, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  const KEEP = process.env['P341_KEEP'] === '1';
  const WANT = (process.env['P341_CASES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cases = CASES.filter((c) => WANT.length === 0 || WANT.includes(c.id));
  if (cases.length === 0) refuse(`P341_CASES ${J(WANT)} names no case.`);

  // ---- the scratch world ---------------------------------------------------
  mkdirSync(join(HARNESS_DIR, 'p341'), { recursive: true });
  const RUN = realpathSync(join(HARNESS_DIR, 'p341'));
  const HOME = join(RUN, 'home');
  const PROFILE = join(RUN, 'profile');
  const FAR = join(RUN, 'far', 'proj');
  const LOCAL = join(RUN, 'local', 'proj');
  const OUT = resolve((process.env['P341_OUT_DIR'] ?? '').trim() || join(RUN, 'out'));
  const MACHINE_ID = 'p341-machine';
  const MACHINE_LABEL = 'P341 Machine';
  if (/['\n]/.test(FAR) || /['\n]/.test(LOCAL)) refuse(`${FAR} holds a quote, and it is typed into a shell as one word.`);

  const shEnv = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: farHome, ZDOTDIR: join(CONFIG_ROOT, 'zdot'), HISTFILE: '/dev/null', LC_ALL: 'C' };
  const sh = (script) => {
    const r = spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', env: shEnv, timeout: 60_000 });
    return { code: r.status ?? -1, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
  };
  /** One folder's entries, one per line, or null when it could not be read. */
  const listing = (dir) => {
    const r = sh(`ls -1A '${dir}'`);
    return r.code === 0 ? r.stdout.split('\n').filter((l) => l !== '') : null;
  };

  // The two projects, the same shape on both sides: a repository holding a
  // README, and per case the folder that case aims at.
  const setup = (dir) => {
    const lines = ['set -e', `rm -rf '${dir}'`, `mkdir -p '${dir}'`, `cd '${dir}'`, 'git init -q', 'git config --local user.name p341', 'git config --local user.email p341@example.invalid', "printf '# p341\\n' > README.md"];
    for (const c of CASES) {
      const d = destOf(c);
      if (c.at === 'plain') lines.push(`mkdir -p '${d}' && printf 'p\\n' > '${d}/p.txt'`);
      if (c.at === 'chainFile') lines.push(`mkdir -p '${d}' && printf 'c\\n' > '${d}/c.txt'`);
      if (c.at === 'chainEmpty') lines.push(`mkdir -p '${d}'`);
    }
    lines.push('git add -A', "git commit -q -m 'p341 base'", 'echo ready');
    const made = sh(lines.join('\n'));
    if (!made.stdout.includes('ready')) throw new Error(`the tree at ${dir} was not made: ${made.stderr.trim().slice(0, 300)}`);
  };

  const historyStat = () => {
    const r = spawnSync('/usr/bin/stat', ['-f', '%z %m', join(homedir(), '.zsh_history'), join(homedir(), '.bash_history')], { encoding: 'utf8' });
    return String(r.stdout ?? '').trim();
  };
  const historyBefore = historyStat();

  const devtoolsPort = () => {
    try {
      return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  const attachMain = async (timeoutMs = 150_000) => {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      const port = devtoolsPort();
      let list = [];
      if (port > 0) {
        try {
          list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        } catch {
          list = [];
        }
      }
      const picked = pickRendererTarget(list);
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        for (let i = 0; i < 200; i += 1) {
          if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.machines !== undefined && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
          await sleep(300);
        }
        throw new Error('the app never armed window.gmux.machines and the drives');
      }
      why = picked.why;
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  };
  /** One expression in the window: `{ ok, value }` or `{ ok: false, error }`. */
  const bridge = async (cdp, expr, timeoutMs = 120_000) =>
    JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, timeoutMs));

  const report = { checkout: CHECKOUT, socket: SOCKET, far: FAR, local: LOCAL, logpoints: {}, cases: [], historyBefore, historyAfter: null };
  let failures = 0;
  let unreadable = 0;

  try {
    for (const dir of [HOME, PROFILE]) mkdirSync(dir, { recursive: true });
    writeFileSync(join(HOME, '.hushlogin'), '');
    setup(FAR);
    setup(LOCAL);
    const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
    mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
    writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: carriage.remoteTmuxPath }] })}\n`, 'utf8');
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p341/probe-p341.mjs' }), 'utf8');
    writeQuietAgents(PROFILE);
    say(`launching ${CHECKOUT}; socket ${SOCKET}; far ${FAR}; local ${LOCAL}`);

    const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
    await withElectron(
      {
        label: 'p341',
        userDataDir: PROFILE,
        cwd: CHECKOUT,
        args: ['--remote-debugging-port=0', '--use-mock-keychain'],
        env: withoutDevRenderer({
          ...INHERITED_CLAUDE,
          HOME,
          ZDOTDIR: HOME,
          HISTFILE: '/dev/null',
          TERM_SESSION_ID: undefined,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_PROBES: '1',
          GMUX_LOG_FILE: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1',
          GMUX_CONFIG_ROOT: CONFIG_ROOT,
          GMUX_HARNESS_DIR: HARNESS_DIR,
          ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
        }),
        graceMs: 8_000,
        ceilingMs: 2_400_000
      },
      async () => {
        const cdp = await attachMain();
        try {
          const list = JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
          const held = quietAgentsHeld(list);
          if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
          await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
          await cdp.call('Debugger.enable');
          // The page kit: the event list the logpoints write into, and the
          // machine state pushes the page itself hears.
          await cdpEval(
            cdp,
            `(() => { globalThis.__p341 = { ev: [], pushes: [] }; window.gmux.machines.onStateChanged(() => { globalThis.__p341.pushes.push(Date.now()); }); return true; })()`
          );
          const up = await bridge(cdp, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
          if (!(up.ok && (up.value?.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable))) throw new Error(`the machine is not usable: ${J(up).slice(0, 400)}`);

          const remoteCases = cases.filter((c) => c.side === 'remote');
          const localCases = cases.filter((c) => c.side === 'local');
          if (remoteCases.length > 0) {
            const opened = await openRemote(cdp, FAR);
            if (opened === null) throw new Error(`the remote project ${FAR} did not open`);
            await showExplorer(cdp);
            await bindLogpoints(cdp);
            for (const c of remoteCases) await runCase(cdp, c, FAR);
          }
          if (localCases.length > 0) {
            const opened = await bridge(cdp, `window.__gmuxP95.openLocal(${J(LOCAL)})`);
            if (!opened.ok) throw new Error(`the local project ${LOCAL} did not open: ${opened.error}`);
            await sleep(1_000);
            await showExplorer(cdp);
            await bindLogpoints(cdp);
            for (const c of localCases) await runCase(cdp, c, LOCAL);
          }
        } finally {
          cdp.close();
        }
      }
    );
  } catch (err) {
    say(`FAILED: ${String((err && err.stack) || err)}`);
    unreadable += 1;
  } finally {
    // The app's own tmux server on the scratch socket, the one server this
    // run started by name. Never -L gmux.
    spawnSync('tmux', ['-L', SOCKET, 'kill-server'], { encoding: 'utf8', timeout: 15_000 });
    if (!KEEP) {
      try {
        rmSync(join(RUN, 'far'), { recursive: true, force: true });
        rmSync(join(RUN, 'local'), { recursive: true, force: true });
      } catch {
        /* reported below */
      }
    }
  }

  report.historyAfter = historyStat();
  const left = spawnSync('/bin/ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l.includes(PROFILE)).length;
  report.electronsLeft = left;
  if (report.historyAfter !== report.historyBefore) {
    say(`HIS HISTORY MOVED: before ${J(report.historyBefore)} after ${J(report.historyAfter)}`);
    failures += 1;
  }
  if (left > 0) {
    say(`${String(left)} process(es) naming the profile were left`);
    failures += 1;
  }
  for (const c of report.cases) {
    if (c.unreadable) unreadable += 1;
    else if (!c.grade.ok) failures += 1;
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'p341-report.json'), `${J(report, null, 2)}\n`, 'utf8');
  say(`report: ${join(OUT, 'p341-report.json')}`);
  if (!KEEP) {
    // The app is down by now: its scratch HOME and profile go with the far and
    // local trees, and the report stays where it was written.
    rmSync(join(RUN, 'home'), { recursive: true, force: true });
    rmSync(PROFILE, { recursive: true, force: true });
  }
  if (unreadable > 0) {
    say(`UNREADABLE, ${String(unreadable)} case(s) or the run could not be read, which is never a pass`);
    process.exit(2);
  }
  if (failures > 0) {
    say(`FAIL, ${String(failures)}`);
    process.exit(1);
  }
  say('PASS');
  // Every cdpEval leaves its own timeout armed (build/cdp-client.mjs), so the
  // process ends here rather than waiting them out.
  process.exit(0);

  // -------------------------------------------------------------------------
  // The helpers, hoisted.
  // -------------------------------------------------------------------------

  async function openRemote(cdp, path) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(cdp, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(path)})`);
      if (opened.ok && opened.value?.result?.ok === true) return opened.value.result;
      await sleep(2_000);
    }
    return null;
  }

  /** Press the Explorer on the rail when it is not the active view, then wait for a row. */
  async function showExplorer(cdp) {
    const shown = await bridge(
      cdp,
      `(async () => {
        const rail = Array.from(document.querySelectorAll('button.ab-item')).find((b) => (b.getAttribute('title') || '').startsWith('Explorer ('));
        if (rail === undefined) return { shown: false, why: 'no Explorer item on the activity rail' };
        if (rail.className.indexOf('active') === -1) rail.click();
        const until = Date.now() + 60000;
        for (;;) {
          const host = document.querySelector('file-tree-container');
          const rows = host !== null && host.shadowRoot ? host.shadowRoot.querySelectorAll('[role="treeitem"]').length : 0;
          if (rows > 0) return { shown: true, rows };
          if (Date.now() > until) return { shown: false, why: 'no tree row within 60 s' };
          await new Promise((r) => setTimeout(r, 250));
        }
      })()`
    );
    if (!(shown.ok && shown.value?.shown === true)) throw new Error(`the Explorer drew no row: ${J(shown)}`);
    await sleep(800);
  }

  /** Set every logpoint in the chunks THIS checkout built. Once per run is enough; a repeat is harmless. */
  async function bindLogpoints(cdp) {
    if (Object.keys(report.logpoints).length > 0) return;
    const chunks = { tree: chunkWith(CHECKOUT, 'function createTreeOps(ctx){'), index: chunkWith(CHECKOUT, 'toast(kind,text,opts){') };
    for (const lp of LOGPOINTS) {
      const chunk = chunks[lp.chunk];
      const site = siteIn(chunk.text, lp);
      if (site === null) {
        report.logpoints[lp.name] = 'needle absent';
        say(`logpoint ${lp.name}: its needle is not in ${chunk.name}`);
        continue;
      }
      const condition = `(globalThis.__p341 && globalThis.__p341.ev.push(Object.assign({t: Date.now()}, ${lp.rec})), false)`;
      const r = await cdp.call('Debugger.setBreakpointByUrl', { urlRegex: `${chunk.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, lineNumber: site.line, columnNumber: site.col, condition });
      const count = (r.result?.locations ?? []).length;
      report.logpoints[lp.name] = count;
      say(`logpoint ${lp.name}: ${String(count)} location(s) in ${chunk.name}`);
    }
  }

  /** Rows the tree draws, by Pierre's own path. */
  async function rows(cdp) {
    const got = await bridge(cdp, `(() => { const host = document.querySelector('file-tree-container'); if (host === null || !host.shadowRoot) return []; return Array.from(host.shadowRoot.querySelectorAll('[data-item-path]')).map((n) => ({ path: n.getAttribute('data-item-path'), selected: n.getAttribute('aria-selected') === 'true', text: (n.textContent || '').trim().slice(0, 80) })); })()`);
    return got.ok ? got.value : [];
  }

  async function runCase(cdp, c, project) {
    const dest = destOf(c);
    const destAbs = dest === '' ? project : `${project}/${dest}`;
    const reading = { id: c.id, case: c, dest, unreadable: null };
    report.cases.push(reading);
    const cannot = (why) => {
      reading.unreadable = why;
      say(`UNREADABLE ${c.id}: ${why}`);
    };
    reading.before = listing(destAbs);
    await cdpEval(cdp, 'globalThis.__p341.ev.length = 0; true');
    // 1. The row the create aims at.
    const target = clickOf(c);
    const clicked = await bridge(
      cdp,
      `(async () => {
        const host = document.querySelector('file-tree-container');
        if (host === null || !host.shadowRoot) return { clicked: false, why: 'no tree' };
        const all = () => Array.from(host.shadowRoot.querySelectorAll('[data-item-path]'));
        const want = ${J(target)};
        const top = want.split('/')[0] + '/';
        let opened = false;
        for (let i = 0; i < 60; i += 1) {
          const row = all().find((n) => n.getAttribute('data-item-path') === want);
          if (row) {
            row.click();
            return { clicked: true, path: row.getAttribute('data-item-path'), text: (row.textContent || '').trim().slice(0, 80), expandedTop: opened };
          }
          // A tree that has not listed the chain's inside draws its top as a
          // plain folder: open it once, the way a person would, and look again.
          const topRow = all().find((n) => n.getAttribute('data-item-path') === top);
          if (!opened && topRow && want !== top) {
            topRow.click();
            opened = true;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        return { clicked: false, why: 'no row', rows: all().slice(0, 40).map((n) => n.getAttribute('data-item-path')) };
      })()`
    );
    reading.clicked = clicked.ok ? clicked.value : { error: clicked.error };
    if (!(clicked.ok && clicked.value?.clicked === true)) return cannot(`the row ${target} was not found: ${J(reading.clicked)}`);
    await sleep(700);
    reading.selectedRows = (await rows(cdp)).filter((r) => r.selected).map((r) => r.path);
    // 2. The header button.
    const label = c.kind === 'dir' ? 'New folder' : 'New file';
    const pressed = await bridge(cdp, `(() => { const b = Array.from(document.querySelectorAll('[data-slot="view-header"] button')).find((x) => x.getAttribute('aria-label') === ${J(label)}); if (!b) return { pressed: false, why: 'no button' }; if (b.disabled) return { pressed: false, why: 'disabled: ' + (b.getAttribute('title') || '') }; b.click(); return { pressed: true }; })()`);
    reading.pressed = pressed.ok ? pressed.value : { error: pressed.error };
    if (!(pressed.ok && pressed.value?.pressed === true)) return cannot(`${label} was not pressed: ${J(reading.pressed)}`);
    // 3. The box, focused, and the name typed into it.
    const box = await bridge(
      cdp,
      `(async () => {
        const host = document.querySelector('file-tree-container');
        for (let i = 0; i < 40; i += 1) {
          const input = host && host.shadowRoot ? host.shadowRoot.querySelector('[data-item-rename-input]') : null;
          if (input) {
            input.focus();
            const row = input.closest('[data-item-path]');
            return { open: true, value: input.value, row: row ? row.getAttribute('data-item-path') : null, focused: host.shadowRoot.activeElement === input };
          }
          await new Promise((r) => setTimeout(r, 125));
        }
        return { open: false };
      })()`
    );
    reading.box = box.ok ? box.value : { error: box.error };
    if (!(box.ok && box.value?.open === true)) return cannot(`no inline name box opened: ${J(reading.box)}`);
    const openedAt = Date.now();
    await cdp.call('Input.insertText', { text: c.name });
    if (c.plant === true) {
      // Behind the tree's back, as an agent on that machine would.
      const made = sh(c.kind === 'dir' ? `mkdir '${destAbs}/${c.name}'` : `printf 'planted\\n' > '${destAbs}/${c.name}'`);
      reading.planted = made.code === 0;
      if (!reading.planted) return cannot(`the plant was not made: ${made.stderr.trim()}`);
    }
    // 4. Return, fast or slow.
    if (c.pace === 'fast') {
      await sleep(150);
    } else {
      const until = openedAt + 40_000;
      for (;;) {
        const pushes = await cdpEval(cdp, `globalThis.__p341.pushes.filter((t) => t > ${String(openedAt)}).length`);
        if ((pushes > 0 && Date.now() - openedAt >= 6_000) || Date.now() > until) break;
        await sleep(500);
      }
    }
    reading.typed = await bridge(cdp, `(() => { const host = document.querySelector('file-tree-container'); const input = host && host.shadowRoot ? host.shadowRoot.querySelector('[data-item-rename-input]') : null; return input ? { open: true, value: input.value } : { open: false }; })()`);
    reading.pushesWhileOpen = await cdpEval(cdp, `globalThis.__p341.pushes.filter((t) => t > ${String(openedAt)}).length`);
    reading.openMs = Date.now() - openedAt;
    const base = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: '\r', unmodifiedText: '\r' });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    // 5. The answer: an answer word or a toast, then the re-read settles.
    const answered = Date.now();
    for (;;) {
      const ev = await cdpEval(cdp, 'JSON.stringify(globalThis.__p341.ev)');
      const list = JSON.parse(ev);
      if (list.some((e) => ['makeDirAnswer', 'renameAnswer', 'putAnswer', 'localCreated', 'toast'].includes(e.ev)) || Date.now() - answered > 20_000) break;
      await sleep(250);
    }
    await sleep(3_000);
    reading.ev = JSON.parse(await cdpEval(cdp, 'JSON.stringify(globalThis.__p341.ev)'));
    reading.toasts = reading.ev.filter((e) => e.ev === 'toast').map((e) => ({ kind: e.kind, text: e.text }));
    reading.after = listing(destAbs);
    reading.rowsAfter = (await rows(cdp)).map((r) => r.path).filter((p) => p !== null && (dest === '' ? !p.slice(0, -1).includes('/') : p.startsWith(`${dest}/`) || p === `${dest}/`));
    reading.opsBuilt = reading.ev.filter((e) => e.ev === 'ops').length;
    if (reading.before === null || reading.after === null) return cannot(`the destination ${destAbs} could not be listed`);
    reading.grade = gradeCase(c, reading);
    say(`${reading.grade.ok ? 'PASS' : 'FAIL'} ${c.id} ${c.side} ${c.kind} ${c.at} ${c.pace} ${J(c.name)}: pushes ${String(reading.pushesWhileOpen)} in ${String(reading.openMs)} ms, ops built ${String(reading.opsBuilt)}; asked ${J(reading.ev.filter((e) => /Ask$|^commit$|^settleCommit$|^finishCreate$/.test(e.ev)))}; answered ${J(reading.ev.filter((e) => /Answer$|^localCreated$/.test(e.ev)))}; toasts ${J(reading.toasts)}; disk ${J(reading.after)}`);
    if (!reading.grade.ok) say(`     failed: ${J(reading.grade.failed)}`);
    // Dismiss what the case left, so the next case starts with no sticky toast.
    await bridge(cdp, `(() => { for (const b of Array.from(document.querySelectorAll('.toast button[aria-label="Dismiss"]'))) b.click(); return true; })()`);
    await sleep(400);
    return undefined;
  }
}

if (process.argv[2] === '--grader-self-test') {
  // The grader alone, over hand-written readings: an honest create, the
  // parent's rename of the placeholder, a left-behind untitled folder, and a
  // name that landed somewhere else.
  const c = CASES[0];
  const A1 = CASES.find((x) => x.id === 'A1');
  const A2 = CASES.find((x) => x.id === 'A2');
  const honest = { before: ['README.md'], after: ['README.md', c.name], toasts: [], ev: [{ ev: 'makeDirAsk' }, { ev: 'makeDirAnswer', outcome: 'made' }] };
  const parent = { before: ['README.md'], after: ['README.md'], toasts: [{ kind: 'error', text: 'Tortie could not find untitled folder on P341 Machine. Press Refresh to read that folder again.' }], ev: [{ ev: 'renameAsk' }, { ev: 'renameAnswer', outcome: 'gone' }] };
  const untitled = { before: ['README.md'], after: ['README.md', 'untitled folder'], toasts: [], ev: [] };
  const checks = [
    ['an honest create passes', gradeCase(c, honest).ok === true],
    ["the parent's rename fails", gradeCase(c, parent).ok === false],
    ['an untitled folder left behind fails', gradeCase(c, untitled).ok === false],
    ['a different name fails', gradeCase(c, { ...honest, after: ['README.md', 'other'] }).ok === false],
    ['an NFD spelling of the typed name passes', gradeCase(CASES[2], { ...honest, after: ['README.md', CASES[2].name.normalize('NFD')] }).ok === true],
    ['every case has its own destination', new Set(CASES.filter((x) => x.at !== 'root' && x.expect === undefined).map((x) => `${x.side}:${destOf(x)}`)).size === CASES.filter((x) => x.at !== 'root' && x.expect === undefined).length],
    ['an honest protected refusal passes', gradeCase(A1, { before: ['README.md'], after: ['README.md'], toasts: [{ kind: 'error', text: 'Tortie does not touch .git or .ssh folders on P341 Machine. Nothing was changed.' }], ev: [{ ev: 'makeDirAnswer', outcome: 'protected' }], rowsAfter: ['README.md'] }).ok === true],
    ["the parent's gone in place of a refusal fails", gradeCase(A1, { before: ['README.md'], after: ['README.md'], toasts: [{ kind: 'error', text: 'Tortie could not find untitled folder on P341 Machine. Press Refresh to read that folder again.' }], ev: [{ ev: 'renameAsk' }], rowsAfter: ['untitled folder/', 'README.md'] }).ok === false],
    ['an honest exists refusal passes with the plant on the disk', gradeCase(A2, { before: ['p.txt'], after: ['p.txt', 'p341 planted'], toasts: [{ kind: 'error', text: 'There is already something called p341 planted in that folder on P341 Machine.' }], ev: [], rowsAfter: [] }).ok === true],
    ['an untitled row still drawn fails', gradeCase(c, { ...honest, rowsAfter: ['untitled folder/'] }).ok === false],
    ["a file's exists refusal is the save's own sentence", gradeCase(CASES.find((x) => x.id === 'A3'), { before: ['p.txt'], after: ['p.txt', 'p341 planted.txt'], toasts: [{ kind: 'error', text: 'Tortie did not make that file, because a file of that name is already on P341 Machine under /x.' }], ev: [], rowsAfter: [] }).ok === true]
  ];
  for (const [name, ok] of checks) console.log(`${TAG} ${ok ? 'ok  ' : 'FAIL'} ${name}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
} else if (process.argv[2] === '--regrade') {
  // A recorded report graded again by THIS grader, starting nothing: a
  // verifier's way to read a parent's record and HEAD's with one grader.
  const report = JSON.parse(readFileSync(resolve(process.argv[3] ?? ''), 'utf8'));
  let failed = 0;
  for (const r of report.cases ?? []) {
    const known = CASES.find((x) => x.id === r.id);
    if (known === undefined || r.unreadable) {
      console.log(`${TAG} UNREADABLE ${String(r.id)}: ${String(r.unreadable ?? 'not a case this file knows')}`);
      failed += 1;
      continue;
    }
    const g = gradeCase(known, r);
    if (!g.ok) failed += 1;
    console.log(`${TAG} ${g.ok ? 'PASS' : 'FAIL'} ${r.id}${g.ok ? '' : ` ${J(g.failed)}`}`);
  }
  process.exit(failed === 0 ? 0 : 1);
} else {
  await run();
}
