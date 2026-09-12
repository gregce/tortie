#!/usr/bin/env node
/**
 * probe-p257-facts.mjs. The fact base over the research 118 corpus, and the
 * product's own pass held against the reference driver (Phase 257, spec §7).
 *
 * ## What it proves, and why the gate cannot
 *
 * `npm run conformance:facts` pins the reader over eight committed fixtures
 * and this checkout's src/. What it cannot hold is that the SHIPPED app,
 * through `src/main/arch/tree-facts.ts`'s second pass in the shared worker
 * pool, writes the same fact base into `arch.db` that the in-process driver
 * computes, and that the rule table reads across the nine repositories in
 * seven language families the research measured. So this probe:
 *
 *   ARM A  builds the corpus (shallow read-only clones of the public seven,
 *          plus `git clone --local` copies of this checkout as `tortie` and of
 *          /Users/gdc/stoa as `stoa`), runs build/p257/facts-corpus.mts over
 *          every clone in process, with the wrapper pass and without, prints
 *          research 118 §6.1's table beside the research's numbers, the ten
 *          recall scopes with "enumeration still agrees" per row, and the
 *          341 hand judgments before and after the port;
 *   ARM B  launches ONE Electron on a scratch profile with the setting
 *          pre-written on, opens the `tortie` and `stoa` clones as projects,
 *          runs the arch check on each and reads its durationMs, ends the app,
 *          opens the profile's arch.db READ ONLY and holds its per-category
 *          counts, wrapper digest, wrap-fact count, IPC serves subjects,
 *          per-language link counts and denominators against Arm A's for the
 *          same two clones. Any difference is a finding: the product's pass
 *          is the reference driver's. The 229 is asserted over `src/**`, the
 *          scope the baseline is generated from, because the committed
 *          fixtures register channels of their own.
 *
 * With P257_PARENT_CHECKOUT naming a BUILT worktree at the parent commit, a
 * second Electron is launched from that checkout, one after the other and
 * never at once, on a profile of its own, and the same two checks' durations
 * are read, so the cost of the second parse (spec D1) is measured on this
 * machine rather than extrapolated.
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET it refuses; the socket must be a `gmux-` scratch
 * name. Every clone lives under GMUX_HARNESS_DIR/p257 and is removed by
 * corpus.sh in the finally block. /Users/gdc/stoa is only ever a clone
 * source; /Users/gdc/runstory and /Users/gdc/specfactory are refused by name
 * in corpus.sh and never named here. The one Electron is ended by
 * withElectron's finally block whatever happened, with HOME inside the
 * scratch directory. No agent is spawned, no token spent, no keychain
 * opened, no request made. The operator's `-L gmux` server is counted before
 * and after and must be unchanged.
 *
 * Usage, from the worktree root:
 *   npm run probe:p257
 *   node build/p257/probe-p257-facts.mjs --self-test      (launches nothing)
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { withElectron } from '../electron-run.mjs';
import { seedArchSwitchOn } from '../probe-arch-switch.mjs';
import { tsxCli } from '../ts-runner.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// The graders, pure, proved by --self-test
// ---------------------------------------------------------------------------

/**
 * Arm B against Arm A for one clone: the per category counts, the wrapper
 * digest, the wrap fact count, the IPC serves set and the denominators. Every
 * difference is one sentence; [] when the product's pass is the driver's.
 */
export function compareArms(name, fromDb, fromDriver) {
  const out = [];
  const cats = ['entrypoint', 'boundary', 'surface', 'store', 'effect', 'network', 'gate', 'test'];
  for (const c of cats) {
    const a = fromDriver.byCategory[c] ?? 0;
    const b = fromDb.byCategory[c] ?? 0;
    if (a !== b) out.push(`${name}: ${c} reads ${b} in arch.db and ${a} from the driver`);
  }
  if (fromDb.wrapFacts !== fromDriver.wrapFacts) out.push(`${name}: ${fromDb.wrapFacts} wrapper-only facts in arch.db and ${fromDriver.wrapFacts} from the driver`);
  if (fromDb.wrapDigest !== fromDriver.wrapDigest) out.push(`${name}: the wrapper digest reads ${fromDb.wrapDigest} in arch.db and ${fromDriver.wrapDigest} from the driver`);
  for (const k of ['files', 'vendored', 'truncated', 'unread']) {
    if (fromDb[k] !== fromDriver[k]) out.push(`${name}: ${k} reads ${fromDb[k]} in arch.db and ${fromDriver[k]} from the driver`);
  }
  // The per-language link counts, `null` included: a file the product links
  // unread and the driver links `path` is invisible to every count above.
  const langs = new Set([...Object.keys(fromDriver.langs ?? {}), ...Object.keys(fromDb.langs ?? {})]);
  for (const l of [...langs].sort()) {
    const a = fromDriver.langs?.[l] ?? 0;
    const b = fromDb.langs?.[l] ?? 0;
    if (a !== b) out.push(`${name}: lang ${l} reads ${b} link(s) in arch.db and ${a} from the driver`);
  }
  const a = new Set(fromDriver.served);
  const b = new Set(fromDb.served);
  const onlyDb = [...b].filter((x) => !a.has(x));
  const onlyDriver = [...a].filter((x) => !b.has(x));
  if (onlyDb.length + onlyDriver.length > 0) {
    out.push(`${name}: IPC serves differs, ${onlyDb.length} only in arch.db (${onlyDb.slice(0, 3).join(', ')}) and ${onlyDriver.length} only from the driver (${onlyDriver.slice(0, 3).join(', ')})`);
  }
  return out;
}

/** What one clone's fact rows in arch.db read as, in the terms compareArms takes. */
export function summarizeRows(factRows, linkRows, wrapRows) {
  const byCategory = {};
  for (const r of [...factRows, ...wrapRows]) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  const served = [...factRows, ...wrapRows]
    .filter((r) => r.kind === 'ipc-channel' && r.subject.startsWith('IPC serves '))
    .map((r) => r.subject.slice('IPC serves '.length))
    .sort();
  const digests = new Set(linkRows.map((l) => l.wrap_digest).filter((d) => d !== null));
  return {
    byCategory,
    wrapFacts: wrapRows.length,
    wrapDigest: digests.size === 1 ? [...digests][0] : digests.size === 0 ? null : `MIXED(${digests.size})`,
    files: linkRows.length,
    vendored: linkRows.filter((l) => l.vendored !== null).length,
    truncated: linkRows.filter((l) => l.truncated === 1).length,
    unread: linkRows.filter((l) => l.vendored === null && (l.lang ?? null) === null).length,
    langs: langCounts(linkRows.map((l) => (l.vendored === null ? (l.lang ?? null) : 'vendored'))),
    served
  };
}

/** Links per language, `null` for a file no rule read, sorted by name. */
export function langCounts(langs) {
  const out = {};
  for (const l of langs) {
    const k = l === null ? 'null' : String(l);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

/** The served channels under src/ alone, the scope the baseline is generated from. */
export function servedUnderSrc(rows) {
  return rows
    .filter((r) => r.kind === 'ipc-channel' && r.subject.startsWith('IPC serves ') && String(r.rel_path ?? r.file ?? '').startsWith('src/'))
    .map((r) => r.subject.slice('IPC serves '.length))
    .sort();
}

/** The driver's summary for one clone as facts-corpus.mts wrote it, in the same terms. */
export function summarizeDriver(written) {
  const served = written.facts
    .filter((f) => f.kind === 'ipc-channel' && f.subject.startsWith('IPC serves '))
    .map((f) => f.subject.slice('IPC serves '.length))
    .sort();
  return {
    byCategory: written.summary.byCategory,
    wrapFacts: written.summary.wrapFacts,
    wrapDigest: written.summary.wrapDigest,
    files: written.links.length,
    vendored: written.summary.vendored,
    truncated: written.summary.truncated,
    unread: written.summary.unread,
    langs: langCounts(written.links.map((l) => (l.vendored === null ? (l.lang ?? null) : 'vendored'))),
    served
  };
}

function selfTest() {
  const problems = [];
  const driver = {
    byCategory: { entrypoint: 1, boundary: 0, surface: 2, store: 0, effect: 0, network: 0, gate: 0, test: 0 },
    wrapFacts: 1,
    wrapDigest: 'd'.repeat(64),
    files: 3,
    vendored: 1,
    truncated: 0,
    unread: 0,
    langs: { typescript: 2, vendored: 1 },
    served: ['a:b', 'arch:map']
  };
  const same = compareArms('x', { ...driver }, driver);
  if (same.length !== 0) problems.push(`equal arms read ${same.length} difference(s)`);
  const movedLang = compareArms('x', { ...driver, langs: { typescript: 1, null: 1, vendored: 1 } }, driver);
  if (movedLang.length !== 2 || !movedLang.some((l) => l.includes('lang null')) || !movedLang.some((l) => l.includes('lang typescript'))) problems.push(`a link moved from typescript to null read ${JSON.stringify(movedLang)}`);
  const movedUnread = compareArms('x', { ...driver, unread: 1 }, driver);
  if (movedUnread.length !== 1 || !movedUnread[0].includes('unread')) problems.push(`a moved unread count read ${JSON.stringify(movedUnread)}`);
  const src = servedUnderSrc([
    { kind: 'ipc-channel', subject: 'IPC serves a:b', rel_path: 'src/main/ipc.ts' },
    { kind: 'ipc-channel', subject: 'IPC serves $(touch /tmp/p)', rel_path: 'build/fixtures/facts/ts-electron/src/main/ipc.ts' },
    { kind: 'ipc-channel', subject: 'IPC calls a:b', rel_path: 'src/renderer/x.ts' }
  ]);
  if (src.join(',') !== 'a:b') problems.push(`servedUnderSrc reads ${JSON.stringify(src)}; the fixture's channel must not count`);
  const moved = compareArms('x', { ...driver, byCategory: { ...driver.byCategory, surface: 1 }, served: ['a:b'] }, driver);
  if (moved.length !== 2 || !moved[0].includes('surface') || !moved[1].includes('IPC serves')) problems.push(`a moved category and a lost channel read ${JSON.stringify(moved)}`);
  const digest = compareArms('x', { ...driver, wrapDigest: null }, driver);
  if (digest.length !== 1 || !digest[0].includes('digest')) problems.push(`a null digest read ${JSON.stringify(digest)}`);
  const rows = summarizeRows(
    [{ category: 'surface', kind: 'ipc-channel', subject: 'IPC serves a:b' }, { category: 'entrypoint', kind: 'main', subject: 'main() in x' }],
    [{ wrap_digest: 'd'.repeat(64), vendored: null, truncated: 0, lang: 'typescript' }, { wrap_digest: null, vendored: 'path: segment vendor', truncated: 1, lang: null }, { wrap_digest: null, vendored: null, truncated: 0, lang: null }],
    [{ category: 'surface', kind: 'ipc-channel', subject: 'IPC serves arch:map' }]
  );
  if (rows.byCategory.surface !== 2 || rows.wrapFacts !== 1 || rows.vendored !== 1 || rows.truncated !== 1 || rows.unread !== 1 || rows.served.join(',') !== 'a:b,arch:map' || rows.wrapDigest !== 'd'.repeat(64) || JSON.stringify(rows.langs) !== JSON.stringify({ null: 1, typescript: 1, vendored: 1 })) {
    problems.push(`summarizeRows reads ${JSON.stringify(rows)}`);
  }
  const mixed = summarizeRows([], [{ wrap_digest: 'a', vendored: null, truncated: 0 }, { wrap_digest: 'b', vendored: null, truncated: 0 }], []);
  if (mixed.wrapDigest !== 'MIXED(2)') problems.push(`two digests read ${mixed.wrapDigest}`);
  const written = summarizeDriver({
    summary: { byCategory: { surface: 1 }, wrapFacts: 0, wrapDigest: null, vendored: 1, truncated: 0, unread: 0 },
    links: [{ lang: 'go', vendored: null }, { lang: null, vendored: 'path: segment vendor' }],
    facts: [{ kind: 'ipc-channel', subject: 'IPC serves z' }, { kind: 'ipc-channel', subject: 'IPC calls y' }]
  });
  if (written.files !== 2 || written.served.join(',') !== 'z' || JSON.stringify(written.langs) !== JSON.stringify({ go: 1, vendored: 1 })) problems.push(`summarizeDriver reads ${JSON.stringify(written)}`);
  const score = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p257/facts-score.mts', '--self-test'], { cwd: REPO, encoding: 'utf8' });
  if (score.status !== 0) problems.push(`facts-score --self-test: ${(score.stderr || score.stdout).slice(0, 300)}`);
  return problems;
}

if (process.argv.includes('--self-test')) {
  const problems = selfTest();
  for (const p of problems) process.stderr.write(`probe-p257-facts self-test: ${p}\n`);
  say(problems.length === 0 ? 'probe-p257-facts self-test: OK, the arm comparison, the row summaries and the score locator behaved on planted fixtures; nothing was launched' : `probe-p257-facts self-test: ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

function refuse(message) {
  process.stderr.write(`probe-p257-facts: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');
const parentCheckout = (process.env['P257_PARENT_CHECKOUT'] ?? '').trim();
if (parentCheckout !== '' && !existsSync(join(parentCheckout, 'out', 'main', 'index.js'))) {
  refuse(`P257_PARENT_CHECKOUT ${parentCheckout} holds no build under out/.`);
}

mkdirSync(join(harnessDir, 'p257'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p257'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const profileParent = join(root, 'profile-parent');
const factsDir = join(root, 'facts');
const reposDir = join(root, 'repos');
for (const d of [home, profile, profileParent, factsDir]) mkdirSync(d, { recursive: true });

const failures = [];
const check = (ok, line) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${line}`);
  if (!ok) failures.push(line);
};

function operatorSessions() {
  const r = spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean).length : 0;
}

function tsx(args, label) {
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', ...args], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024
  });
  if (r.status !== 0) {
    say(`  ${label} failed: ${(r.stderr || r.stdout).slice(0, 1500)}`);
    return null;
  }
  if (r.stderr) for (const line of r.stderr.trim().split('\n')) say(`  ${line}`);
  return r.stdout;
}

// ---------------------------------------------------------------------------
// The connection (the p201 shape)
// ---------------------------------------------------------------------------

async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* already gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

/** Open each project and run the arch check on it; answer each check's own result. */
async function driveChecks(profileDir, projects, label) {
  const results = {};
  await withElectron(
    {
      label,
      userDataDir: profileDir,
      tmuxSocket: null,
      cwd: label === 'p257-parent' ? parentCheckout : REPO,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
      ceilingMs: 25 * 60 * 1000
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profileDir, 90_000);
      say(`  ${label}: app window at ${url}`);
      await cdp.call('Runtime.enable');
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }
      for (const [name, project] of projects) {
        await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project })}).then(() => true)`, 60_000);
        await sleep(1000);
        const t0 = Date.now();
        const answer = await cdpEval(
          cdp,
          `window.gmux.arch.check(${JSON.stringify({ cwd: project })}).then((r) => JSON.stringify({ durationMs: r.durationMs, checkedAtCommit: r.checkedAtCommit, overBudget: r.overBudget, generation: r.generation })).catch((e) => JSON.stringify({ error: String(e) }))`,
          20 * 60 * 1000
        );
        const parsed = JSON.parse(answer);
        parsed.wallMs = Date.now() - t0;
        // A repository with no contract answers `arch:check` from the store
        // with durationMs 0, so the cost of the pass is read off the one line
        // the coordinator logs for it, `[gmux-arch] fact pass {...}`, which the
        // parent build does not print at all.
        parsed.pass = null;
        if (label !== 'p257-parent') {
          const re = new RegExp(`\\[gmux-arch\\] fact pass \\{[^\\n]*"repoPath":${JSON.stringify(project).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`);
          try {
            const text = await handle.waitForLine(re, 20 * 60 * 1000);
            const line = text.split('\n').find((l) => re.test(l)) ?? '';
            parsed.pass = JSON.parse(line.slice(line.indexOf('{')));
          } catch {
            parsed.pass = null;
          }
        }
        results[name] = parsed;
        const pass = parsed.pass;
        say(
          `  ${label}: ${name} check answered in ${String(parsed.durationMs)} ms (wall ${String(parsed.wallMs)} ms)` +
            (pass ? `; fact pass ${String(pass.ms)} ms over ${String(pass.treeRead)} file(s) read, ${String(pass.read)} fact-read, ${String(pass.reused)} reused, ${String(pass.wrapFacts)} wrapper-only` : '') +
            (parsed.error ? `, error ${parsed.error}` : '') +
            (parsed.overBudget ? `, over budget: ${parsed.overBudget}` : '')
        );
      }
      cdp.close();
    }
  );
  return results;
}

/** arch.db, read only, summarized per repository path. */
function readArchDb(profileDir) {
  const Database = require('better-sqlite3');
  const path = join(profileDir, 'gmux', 'arch.db');
  if (!existsSync(path)) return null;
  const db = new Database(path, { readonly: true });
  try {
    const repos = db.prepare('SELECT repo_key, repo_path FROM arch_repo').all();
    const out = {};
    for (const r of repos) {
      const facts = db
        .prepare(
          `SELECT a.category, a.kind, a.subject, a.rel_path FROM arch_fact a
             JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
            WHERE f.repo_key = ?`
        )
        .all(r.repo_key);
      const links = db.prepare('SELECT wrap_digest, vendored, truncated, lang FROM arch_fact_file WHERE repo_key = ?').all(r.repo_key);
      const wraps = db.prepare('SELECT category, kind, subject, rel_path FROM arch_fact_wrap WHERE repo_key = ?').all(r.repo_key);
      out[r.repo_path] = { ...summarizeRows(facts, links, wraps), servedSrc: servedUnderSrc([...facts, ...wraps]) };
    }
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'arch_fact%' ORDER BY name").all().map((t) => t.name);
    return { repos: out, tables };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const sessionsBefore = operatorSessions();
say(`p257: the operator's -L gmux server holds ${String(sessionsBefore)} session(s) before`);
let corpusMade = false;
try {
  say('\nthe corpus (shallow read-only clones under the harness directory)');
  const corpus = spawnSync('bash', [join(REPO, 'build', 'p257', 'corpus.sh'), root, REPO], { encoding: 'utf8', cwd: REPO, maxBuffer: 64 * 1024 * 1024 });
  corpusMade = true;
  for (const line of (corpus.stdout + corpus.stderr).trim().split('\n')) say(`  ${line}`);
  check(corpus.status === 0, 'corpus.sh made the clones');
  const tortieClone = join(reposDir, 'tortie');
  const stoaClone = join(reposDir, 'stoa');
  check(existsSync(join(tortieClone, '.git')), 'the tortie clone exists');
  check(existsSync(join(stoaClone, '.git')), 'the stoa clone exists');
  if (!existsSync(join(tortieClone, '.git')) || !existsSync(join(stoaClone, '.git'))) {
    throw new Error('a local clone was not made, and corpus.sh printed why above; nothing else can be read without it');
  }
  check(realpathSync(tortieClone) !== realpathSync(REPO), 'the tortie clone is not the checkout this probe runs from');

  say('\nARM A: the reference driver, in process, with the pass and without');
  const table = tsx(['build/p257/facts-corpus.mts', reposDir, factsDir], 'facts-corpus');
  check(table !== null, 'facts-corpus.mts ran over every clone');
  if (table !== null) for (const line of table.trim().split('\n')) say(`  ${line}`);
  const recall = tsx(['build/p257/facts-recall.mts', reposDir, factsDir], 'facts-recall');
  check(recall !== null, 'facts-recall.mts scored the ten scopes');
  if (recall !== null) for (const line of recall.trim().split('\n')) say(`  ${line}`);
  const score = tsx(['build/p257/facts-score.mts', reposDir, factsDir], 'facts-score');
  check(score !== null, 'facts-score.mts re-read the 341 hand judgments');
  if (score !== null) for (const line of score.trim().split('\n')) say(`  ${line}`);
  if (recall !== null) {
    const tortieRow = recall.split('\n').find((l) => l.startsWith('tortie | surface'));
    check(tortieRow !== undefined && / \| 229 \| 229 \| 100\.0% \| 0 \| yes$/.test(tortieRow), `the tortie clone reads 229 of 229 invoke channels with 0 extras (${tortieRow ?? 'no row'})`);
  }

  say('\nARM B: one Electron on a scratch profile, the setting pre-written on, the product\'s own pass');
  seedArchSwitchOn(profile, { wrapperPass: true });
  const projects = [['tortie', tortieClone]];
  if (existsSync(join(stoaClone, '.git'))) projects.push(['stoa', stoaClone]);
  const head = await driveChecks(profile, projects, 'p257');
  for (const [name] of projects) check(head[name] !== undefined && head[name].error === undefined, `${name}: the arch check answered${head[name]?.error ? ` (${head[name].error})` : ''}`);

  const db = readArchDb(profile);
  check(db !== null, 'the scratch profile holds gmux/arch.db');
  if (db !== null) {
    check(JSON.stringify(db.tables) === JSON.stringify(['arch_fact', 'arch_fact_file', 'arch_fact_wrap', 'arch_fact_wrapper']), `arch.db holds the four fact tables (${db.tables.join(', ')})`);
    for (const [name, project] of projects) {
      const fromDb = db.repos[project] ?? db.repos[realpathSync(project)];
      check(fromDb !== undefined, `${name}: arch.db holds a repository row for the clone`);
      if (fromDb === undefined) continue;
      let written;
      try {
        written = JSON.parse(readFileSync(join(factsDir, `${name}.json`), 'utf8'));
      } catch {
        check(false, `${name}: Arm A wrote no fact file`);
        continue;
      }
      const fromDriver = summarizeDriver(written);
      say(`  ${name}: arch.db ${JSON.stringify(fromDb.byCategory)} +wrap ${String(fromDb.wrapFacts)} digest ${String(fromDb.wrapDigest).slice(0, 12)} files ${String(fromDb.files)} vendored ${String(fromDb.vendored)} truncated ${String(fromDb.truncated)}`);
      say(`  ${name}: driver  ${JSON.stringify(fromDriver.byCategory)} +wrap ${String(fromDriver.wrapFacts)} digest ${String(fromDriver.wrapDigest).slice(0, 12)} files ${String(fromDriver.files)} vendored ${String(fromDriver.vendored)} truncated ${String(fromDriver.truncated)}`);
      const diffs = compareArms(name, fromDb, fromDriver);
      for (const d of diffs) say(`  ${d}`);
      check(diffs.length === 0, `${name}: the product's pass is the reference driver's (${String(diffs.length)} difference(s))`);
      check(fromDb.wrapDigest !== null && !String(fromDb.wrapDigest).startsWith('MIXED'), `${name}: every wrapper-grammar link carries one wrap_digest (${String(fromDb.wrapDigest).slice(0, 12)})`);
      if (name === 'tortie') {
        const srcServed = fromDb.servedSrc ?? [];
        check(srcServed.length === 229 && new Set(srcServed).size === 229, `${name}: 229 distinct IPC serves subjects under src/ in arch.db (${String(srcServed.length)}, ${String(new Set(srcServed).size)} distinct; ${String(fromDb.served.length)} over the whole clone, the fixtures included)`);
      }
    }
  }

  if (parentCheckout !== '') {
    say('\nthe PARENT build, one Electron after the first and never at once, the same checks without the second pass');
    seedArchSwitchOn(profileParent);
    const parent = await driveChecks(profileParent, projects, 'p257-parent');
    for (const [name] of projects) {
      const a = head[name]?.wallMs;
      const b = parent[name]?.wallMs;
      const p = head[name]?.pass?.ms;
      say(`  ${name}: open-and-check wall HEAD ${String(a)} ms (of which the fact pass ${String(p)} ms), parent ${String(b)} ms${typeof a === 'number' && typeof b === 'number' && b > 0 ? `, ${(a / b).toFixed(2)}×` : ''}`);
    }
  } else {
    say('\n(P257_PARENT_CHECKOUT not set: the parent build was not measured; the HEAD durations above are the cost of the check with the second pass)');
  }
} catch (e) {
  // A refusal part way is a graded failure with its sentence, never a stack
  // over a half-printed table; the clones are still removed below.
  check(false, `the run stopped: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  if (corpusMade) {
    const clean = spawnSync('bash', [join(REPO, 'build', 'p257', 'corpus.sh'), root, 'clean'], { encoding: 'utf8', cwd: REPO });
    say(`  ${(clean.stdout + clean.stderr).trim().split('\n').join('\n  ')}`);
  }
  rmSync(reposDir, { recursive: true, force: true });
}

const sessionsAfter = operatorSessions();
check(sessionsAfter === sessionsBefore, `the operator's -L gmux server holds ${String(sessionsAfter)} session(s) after, ${String(sessionsBefore)} before`);
const left = spawnSync('bash', ['-lc', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct | wc -l'], { encoding: 'utf8' });
say(`  Electron processes left on the machine, counted once: ${(left.stdout ?? '').trim()} (the operator's own app included)`);

say('');
if (failures.length > 0) {
  say(`probe-p257-facts: FAIL, ${String(failures.length)} check(s):`);
  for (const f of failures) say(`  - ${f}`);
  process.exit(1);
}
say("probe-p257-facts: PASS. The corpus read in process with the pass and without, the ten recall scopes and the 341 hand judgments published, and the product's own pass into arch.db is the reference driver's for the tortie and stoa clones.");
process.exit(0);
