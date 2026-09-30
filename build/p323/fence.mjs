#!/usr/bin/env node
/**
 * build/p323/fence.mjs — the fence every Phase 323 conformance run stands
 * behind (build/p323/SPEC.md §8.3 and §9, the tools round after his ruling of
 * 2026-09-30, "One more tools-only round").
 *
 * WHAT IT KEEPS OFF. Qwen, Antigravity (`agy`) and Grok are never started, not
 * even for `--version` (his ruling of 2026-09-29), and Gemini runs only under
 * a scratch HOME (his ruling R3). A conformance run makes Tortie's agent scan
 * run `--version` on every registry binary it can resolve, so the scan must be
 * unable to resolve those three at all.
 *
 * WHY NOT agents.json, AND WHY NOT sandbox-exec. `probe:p323` hides the three
 * with a scratch `<profile>/gmux/config/agents.json`, because the app it
 * launches boots normally and reads that file before its first scan. The
 * conformance harness never reads it: `dispatchHarness` returns at
 * `src/main/index.ts:508`, before `initAgentOverlay` at `:543`, so an overlay
 * in a conformance profile is inert and is not claimed as a guard. The
 * round before this one fenced the run with `sandbox-exec` instead, and the
 * reverify measured that it cannot work: Chromium's GPU helper cannot start its
 * own sandbox inside one (the app exits in about 3 s, "GPU process isn't
 * usable. Goodbye."), and `/bin/ps` is setuid root, which sandbox-exec refuses
 * to start under any profile, so End's tree read and the harness's reads fail.
 *
 * WHAT IT DOES INSTEAD, and says so when it runs:
 *   - HOME is a SCRATCH folder, always. Tortie's resolver adds folders under
 *     HOME whatever PATH says (`extraBinDirsFor`: `~/.local/bin`, where his
 *     qwen and agy live, `~/.npm-global/bin`, his Gemini 0.54.0; grok's row adds
 *     `~/.grok/bin`), so under HIS home no PATH can fence the scan, and
 *     `--check` measures exactly that. The scratch home carries Gemini's R8
 *     settings, Codex's update check and shared daemon off and omp's update
 *     check off, as `probe:p323`'s does, and rc files that put the PATH below
 *     back after /etc/zprofile's path_helper.
 *   - PATH holds a folder of LINKS TO THE AGENTS THE RUN MAY START
 *     (GMUX_CONF_AGENTS, each resolved the way Tortie resolves it under his
 *     home), a folder of links to the tools the run itself needs (this node,
 *     its npm and npx, and tmux), and the four system folders. Nothing else.
 *   - The update guards are exported, as `probe:p323` exports them.
 *   - BEFORE ANYTHING RUNS it asks the checkout's OWN resolver, through the
 *     pinned tsx and under the fence's environment, what the scan would find:
 *     the login-shell PATH the app would capture (`captureLoginShellPath`),
 *     then every registry row's binaries against it, the row's own probe
 *     folders and `extraBinDirs()`, exactly as `detectOne` composes them. Any
 *     copy of qwen, antigravity or grok refuses the run (exit 2), and so does an
 *     asked agent that would resolve somewhere other than its link. What else
 *     the scan will ask for a version whatever PATH says (`/usr/local/bin` and
 *     `/opt/homebrew/bin` are always added: his Gemini 0.60.0, omp) is named.
 *     It reads files and starts one login shell under the scratch home; it runs
 *     no agent.
 *   - Every install is read before and after, by path, mtime and size, and
 *     every global npm package by version and mtime (./installs.mjs); a move
 *     is printed and the fence exits 2 whatever the run answered.
 *
 * WHAT IT CANNOT DO, measured: fence a run under HIS home. At this head no
 * conformance run that needs his sign-ins can be fenced; those runs come back
 * with the rebase onto origin/main, whose Phase 331 `conformanceDetectionTable`
 * limits the scan to the asked agents (read from origin/main's source, not
 * measured here).
 *
 * Usage (a verifier's, under THE LOCK: the command launches Electron):
 *   GMUX_CONF_AGENTS=gemini,claude GMUX_CONF_MODE=capture \
 *     node build/p323/fence.mjs [--cwd <checkout>] -- npm run -s conformance:resume
 *   GMUX_CONF_AGENTS=gemini,claude node build/p323/fence.mjs --check [--cwd <checkout>]
 *       builds the fence, measures it at the scratch home and at his, runs nothing
 *   node build/p323/fence.mjs --self-test     the verdict on fixtures; starts nothing
 *   P323_FENCE_KEEP=1                         keep the fence folder
 *
 * Exit: the command's own code; 2 when the fence refused, could not be
 * measured, or an install moved.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalInstalls } from './installs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p323-fence]';
const say = (line) => console.log(`${TAG} ${line}`);
const J = JSON.stringify;

/** Registry ids the scan must resolve nowhere, at any home. */
const NEVER_IDS = Object.freeze(['qwen', 'antigravity', 'grok']);
/** Their binaries, refused by name in GMUX_CONF_AGENTS too. */
const NEVER_NAMES = Object.freeze(['qwen', 'agy', 'grok', 'antigravity']);
/** The update guards (build/p323/SPEC.md §3), exported to the whole run. */
const GUARDS = Object.freeze({
  DISABLE_AUTOUPDATER: '1',
  MUSE_NO_AUTO_UPDATE: '1',
  OPENCODE_DISABLE_AUTOUPDATE: '1',
  AGENT_CLI_UPDATE_CHECK_URL: 'http://127.0.0.1:9/',
  OMP_SKIP_SETUP: '1',
  NO_UPDATE_NOTIFIER: '1',
  GMUX_SPECSTORY_NO_CLOUD: '1'
});
const SYSTEM_DIRS = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];

/**
 * The fence's verdict over what the checkout's own resolver found: `{ ok,
 * said, also }`. `rows` is `{ id: { kind, copies } }` at the fence's home;
 * `links` is `{ id: path }`, the fence's link for each asked agent. Refused:
 * any copy of a NEVER row, and an asked agent whose FIRST copy is not its link
 * (the scan would version-probe and the run launch another binary). `also`
 * names every other CLI row the scan will still ask, because a folder
 * Tortie's resolver always adds holds it.
 */
export function fenceVerdict(rows, links) {
  if (rows === null || typeof rows !== 'object') return { ok: false, said: 'the resolver printed nothing readable', also: [] };
  const problems = [];
  for (const id of NEVER_IDS) {
    const r = rows[id];
    if (r === undefined) problems.push(`${id} is not in the checkout's registry, so the check cannot say where it resolves`);
    else if (r.copies.length > 0) problems.push(`${id} resolves at ${r.copies.join(', ')}`);
  }
  for (const [id, link] of Object.entries(links)) {
    const first = rows[id]?.copies?.[0] ?? null;
    if (first !== link) problems.push(`${id} resolves first to ${String(first)}, not the fence's link ${link}`);
  }
  const also = Object.entries(rows)
    .filter(([id, r]) => r.kind !== 'ide' && !NEVER_IDS.includes(id) && links[id] === undefined && r.copies.length > 0)
    .map(([id, r]) => `${id} at ${r.copies[0]}`);
  return problems.length === 0
    ? { ok: true, said: `${NEVER_IDS.join(', ')} resolve nowhere; ${Object.keys(links).join(', ') || 'no agent'} resolve to the fence's links`, also }
    : { ok: false, said: problems.join('; '), also };
}

if (process.argv.includes('--self-test')) {
  let bad = 0;
  let n = 0;
  const expect = (name, got, want) => {
    n += 1;
    if (got !== want) {
      bad += 1;
      console.log(`${TAG} self-test FAIL ${name}: got ${J(got)}, want ${J(want)}`);
    }
  };
  const row = (copies, kind = 'cli') => ({ kind, copies });
  const clean = () => ({ claude: row(['/f/agents/claude']), qwen: row([]), antigravity: row([]), grok: row([]), gemini: row(['/usr/local/bin/gemini']), cursoride: row(['/x/cursor'], 'ide') });
  const links = { claude: '/f/agents/claude' };
  expect('clean', fenceVerdict(clean(), links).ok, true);
  expect('clean: gemini named as also asked', J(fenceVerdict(clean(), links).also), J(['gemini at /usr/local/bin/gemini']));
  expect('qwen found', fenceVerdict({ ...clean(), qwen: row(['/Users/x/.local/bin/qwen']) }, links).ok, false);
  expect('grok found in its own folder', fenceVerdict({ ...clean(), grok: row(['/Users/x/.grok/bin/grok']) }, links).ok, false);
  expect('agy found', fenceVerdict({ ...clean(), antigravity: row(['/x/agy']) }, links).ok, false);
  expect('a never row missing from the registry', fenceVerdict((({ qwen, ...rest }) => rest)(clean()), links).ok, false);
  expect('an asked agent resolving elsewhere first', fenceVerdict({ ...clean(), claude: row(['/usr/local/bin/claude', '/f/agents/claude']) }, links).ok, false);
  expect('an asked agent resolving nowhere', fenceVerdict({ ...clean(), claude: row([]) }, links).ok, false);
  expect('nothing printed', fenceVerdict(null, links).ok, false);
  console.log(`${TAG} self-test: ${String(n - bad)} of ${String(n)} held`);
  process.exit(bad === 0 ? 0 : 1);
}

function refuse(sentence) {
  console.error(`${TAG} ${sentence}`);
  process.exit(2);
}
/** A refusal once the fence folder exists: thrown, so the `finally` removes it. */
class Refusal extends Error {}
const stop = (sentence) => {
  throw new Refusal(sentence);
};

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const own = sep === -1 ? argv : argv.slice(0, sep);
const command = sep === -1 ? [] : argv.slice(sep + 1);
const CHECK = own.includes('--check');
const cwdAt = own.indexOf('--cwd');
const CHECKOUT = resolve(cwdAt === -1 ? process.cwd() : (own[cwdAt + 1] ?? ''));
if (!CHECK && command.length === 0) refuse('no command after `--`, and no --check: nothing to run behind the fence');
if (!existsSync(join(CHECKOUT, 'src', 'main', 'tmux', 'resolve.ts'))) refuse(`${CHECKOUT} is not a Tortie checkout (no src/main/tmux/resolve.ts)`);
const KEEP = (process.env['P323_FENCE_KEEP'] ?? '') === '1';
const REAL_HOME = (process.env['HOME'] ?? '').trim();
if (REAL_HOME === '' || !isAbsolute(REAL_HOME) || REAL_HOME.startsWith('/private/tmp') || REAL_HOME.startsWith('/tmp')) {
  refuse(`HOME is ${J(REAL_HOME)}, not his login home; the fence resolves the asked agents where his own launches find them`);
}
const ASKED = (process.env['GMUX_CONF_AGENTS'] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (ASKED.length === 0) refuse('GMUX_CONF_AGENTS is not set: every conformance run names its agents explicitly (SPEC §1.3 item 7)');
for (const id of ASKED) {
  if (NEVER_NAMES.includes(id)) refuse(`GMUX_CONF_AGENTS names ${id}, which is never started, not even for its version (his ruling of 2026-09-29)`);
}

// ---------------------------------------------------------------------------
// The checkout's own resolver, through the pinned tsx. Reads files, and at the
// fence's home asks one login shell for its PATH. Runs no agent.
// ---------------------------------------------------------------------------

function tsxCliOf(checkout) {
  const cli = join(checkout, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return existsSync(cli) ? cli : join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

/**
 * `{ userPath, rows: { id: { kind, copies } } }` for the scan at the home the
 * env names, or at `home` with `userPath` given (no shell asked).
 */
function resolverSays(env, { home = null, userPath = null } = {}) {
  const script = [
    "import { AGENT_REGISTRY } from './src/main/agents/registry.ts';",
    "import { expandDirs } from './src/main/agents/detection.ts';",
    "import { captureLoginShellPath, extraBinDirsFor, resolveBinaryAllAgainst } from './src/main/tmux/resolve.ts';",
    "import { homedir } from 'node:os';",
    `const home = ${J(home)} ?? homedir();`,
    'void (async () => {',
    `  const userPath = ${J(userPath)} ?? (await captureLoginShellPath());`,
    '  const rows = {};',
    '  for (const e of AGENT_REGISTRY) {',
    '    const dirs = [...expandDirs(e.extraProbeDirs, process.env, home), ...extraBinDirsFor(home)];',
    '    const seen = new Set();',
    '    const copies = [];',
    '    for (const b of e.binaries) for (const p of resolveBinaryAllAgainst(b, userPath, dirs)) if (!seen.has(p)) { seen.add(p); copies.push(p); }',
    '    rows[e.id] = { kind: e.kind, copies };',
    '  }',
    '  process.stdout.write(`\\n${JSON.stringify({ home, userPath, rows })}`);',
    '})();',
    ''
  ].join('\n');
  const r = spawnSync(process.execPath, [tsxCliOf(CHECKOUT), '--tsconfig', 'tsconfig.node.json', '-'], {
    cwd: CHECKOUT,
    input: script,
    encoding: 'utf8',
    timeout: 120_000,
    env,
    maxBuffer: 16 * 1024 * 1024
  });
  try {
    return JSON.parse((r.stdout ?? '').trim().split('\n').pop() ?? '');
  } catch {
    return { error: `exit ${String(r.status)}: ${`${r.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')}` };
  }
}

/** Every install, by path, mtime and size, and every global npm package by version and mtime. Nothing is run. */
function installsNow(hisRows) {
  const out = {};
  for (const [id, r] of Object.entries(hisRows ?? {})) {
    for (const p of r.copies) {
      try {
        const rp = realpathSync(p);
        const s = statSync(rp);
        out[`${id} ${p}`] = `${rp} ${s.mtime.toISOString()} ${String(s.size)}`;
      } catch (err) {
        out[`${id} ${p}`] = `unreadable: ${String(err?.code ?? err)}`;
      }
    }
  }
  for (const d of ['.local/share/claude/versions', '.local/share/cursor-agent/versions']) {
    try {
      out[d] = readdirSync(join(REAL_HOME, d)).sort().join(',');
    } catch {
      out[d] = 'none';
    }
  }
  Object.assign(out, globalInstalls(REAL_HOME));
  return out;
}

/** An executable on this process's own PATH, for the tools folder. */
function onPath(name) {
  for (const d of (process.env['PATH'] ?? '').split(delimiter)) {
    if (d === '') continue;
    const p = join(d, name);
    try {
      if (statSync(p).isFile()) return p;
    } catch {
      /* not here */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build the fence, measure it, run, compare
// ---------------------------------------------------------------------------

const FENCE_RAW = `/private/tmp/p323-fence-${String(process.pid)}`;
rmSync(FENCE_RAW, { recursive: true, force: true });
mkdirSync(FENCE_RAW, { recursive: true });
const FENCE = realpathSync(FENCE_RAW);
const HOME = join(FENCE, 'home');
const AGENTS = join(FENCE, 'agents');
const TOOLS = join(FENCE, 'tools');
let code = 2;

try {
  for (const d of [HOME, AGENTS, TOOLS, join(HOME, '.gemini'), join(HOME, '.codex'), join(HOME, '.omp', 'agent')]) mkdirSync(d, { recursive: true });
  const PATH = [AGENTS, TOOLS, ...SYSTEM_DIRS].join(':');
  const STRIPPED = Object.keys(process.env).filter(
    (n) =>
      /^(?:CLAUDECODE|CLAUDE_|npm_)/.test(n) ||
      ['ZDOTDIR', 'NVM_BIN', 'TMUX', 'TMUX_PANE', 'TERM_SESSION_ID', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'SHELL_SESSION_ID'].includes(n)
  );
  const fenceEnv = { ...process.env };
  for (const n of STRIPPED) delete fenceEnv[n];
  Object.assign(fenceEnv, GUARDS, { HOME, PATH });

  // Where each asked agent is, the way his own Tortie finds it: the login
  // shell's PATH at his home (the capture every launch of his makes), then the
  // row's folders. Resolved only, never run. The same reading fingerprints the
  // installs.
  const his = resolverSays({ ...fenceEnv, HOME: REAL_HOME, PATH: process.env['PATH'] ?? '' }, { home: REAL_HOME });
  if (his.rows === undefined) stop(`the checkout's resolver could not be asked at his home: ${his.error}`);
  const links = {};
  for (const id of ASKED) {
    const r = his.rows[id];
    if (r === undefined) stop(`GMUX_CONF_AGENTS names ${id}, which is not a registry row in ${CHECKOUT}`);
    const first = r.copies[0];
    if (first === undefined) {
      say(`${id} is not installed here, so it gets no link and its case will SKIP`);
      continue;
    }
    const bare = first.slice(first.lastIndexOf('/') + 1);
    symlinkSync(first, join(AGENTS, bare));
    links[id] = join(AGENTS, bare);
  }
  const tools = { node: process.execPath };
  for (const t of ['npm', 'npx']) {
    const beside = join(dirname(process.execPath), t);
    tools[t] = existsSync(beside) ? beside : onPath(t);
  }
  tools.tmux = onPath('tmux');
  for (const [t, p] of Object.entries(tools)) {
    if (p === null) stop(`no ${t} on this PATH to link into the fence's tools folder`);
    symlinkSync(p, join(TOOLS, t));
  }

  // The scratch home: R8 for Gemini, the update checks off, the PATH put back
  // after /etc/zprofile's path_helper for the login shell the app asks.
  writeFileSync(
    join(HOME, '.gemini', 'settings.json'),
    `${J({ general: { enableAutoUpdate: false, enableAutoUpdateNotification: false }, privacy: { usageStatisticsEnabled: false }, security: { folderTrust: { enabled: true } } }, null, 2)}\n`
  );
  writeFileSync(join(HOME, '.codex', 'config.toml'), 'check_for_update_on_startup = false\n\n[features]\ndaemon_auto_start = false\n');
  writeFileSync(join(HOME, '.omp', 'agent', 'config.yml'), 'startup:\n  checkUpdate: false\n  setupWizard: false\n');
  for (const rc of ['.zprofile', '.zshrc']) writeFileSync(join(HOME, rc), `export PATH='${PATH}'\n`);

  // THE MEASUREMENT, before anything runs: the checkout's own resolver under
  // the fence's environment, the login-shell capture included.
  const at = resolverSays(fenceEnv);
  if (at.rows === undefined) stop(`the checkout's resolver could not be asked at the fence's home: ${at.error}`);
  const v = fenceVerdict(at.rows, links);
  say(`HOME ${HOME}: scratch, with Gemini's R8 settings and Codex's and omp's update checks off; never his`);
  say(`PATH ${AGENTS} (${Object.entries(links).map(([id, l]) => `${id}: ${l.slice(l.lastIndexOf('/') + 1)} → ${his.rows[id].copies[0]}`).join(', ') || 'no agent'}) : ${TOOLS} (${Object.keys(tools).join(', ')}) : ${SYSTEM_DIRS.join(':')}`);
  say('the conformance harness never reads agents.json at this head (dispatchHarness returns at src/main/index.ts:508, before initAgentOverlay at :543), so none is written: the scratch HOME and this PATH are the fence');
  say(`update guards exported: ${Object.entries(GUARDS).map(([k, x]) => `${k}=${x}`).join(' ')}`);
  say(`the app's login-shell PATH here: ${String(at.userPath)}`);
  say(`measured through ${CHECKOUT}'s own resolver: ${v.said}`);
  if (v.also.length > 0) say(`the scan will also ask these for a version, because Tortie's resolver adds their folders whatever PATH says: ${v.also.join('; ')}`);
  // At HIS home, with the same PATH: why the fence never uses it.
  const atHis = resolverSays({ ...fenceEnv, HOME: REAL_HOME }, { home: REAL_HOME, userPath: PATH });
  const outside = (p) => !p.startsWith(`${FENCE}/`);
  const hisReach = [...NEVER_IDS, 'gemini'].flatMap((id) => (atHis.rows?.[id]?.copies ?? []).filter(outside).map((p) => `${id} at ${p}`));
  say(`at his home with this same PATH the scan would reach ${hisReach.join('; ') || 'none of them'}${hisReach.length > 0 ? ', which is why the fence never runs under his home at this head' : ''}`);
  if (!v.ok) stop(`refusing to run: ${v.said}`);

  if (CHECK) {
    code = 0;
  } else {
    const before = installsNow(his.rows);
    say(`running behind the fence in ${CHECKOUT}: ${command.join(' ')}`);
    const r = spawnSync(command[0], command.slice(1), { cwd: CHECKOUT, env: fenceEnv, stdio: 'inherit' });
    code = r.status ?? 1;
    if (r.error !== undefined) say(`the command could not start: ${String(r.error.message)}`);
    const after = installsNow(his.rows);
    const moved = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
    if (moved.length > 0) {
      say(`AN INSTALL MOVED during the run, and that is reported to him, never absorbed: ${moved.map((k) => `${k}: ${String(before[k])} → ${String(after[k])}`).join(' | ')}`);
      code = 2;
    } else {
      say(`every install unchanged by path, mtime and size, and every global npm package by version and mtime (${String(Object.keys(after).length)} read)`);
    }
  }
} catch (err) {
  code = 2;
  console.error(`${TAG} ${err instanceof Refusal ? err.message : `it threw: ${String(err?.stack ?? err)}`}`);
} finally {
  if (!KEEP) rmSync(FENCE, { recursive: true, force: true });
  else say(`kept ${FENCE}`);
}
process.exit(code);
