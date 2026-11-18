#!/usr/bin/env node
/**
 * checker-selftest.mjs. Proves Tortie's page-cache checker can see what it is
 * for, and that each of its rules is what sees it (Phase 364,
 * build/p364/SPEC.md §4.1, §4.5, D1 to D10).
 *
 *   node build/diagnostic/checker-selftest.mjs --out <scratch> [--devdir <dir>] [--reuse] [--json <file>]
 *
 * PLAIN NODE ONLY. It starts no Electron and needs no /bin/ps, so it runs under
 * the history block. Every child is a node process this file starts and waits
 * for (spawnSync), each in its own folder under --out. The reading table of
 * research 143 §5 is PartitionAlloc's and is proved in Electron's main process
 * by probe:p364 and the lenses (SPEC §0.1 item 3); here the plain-node rows of
 * SPEC §2.2 are asserted, which are the allocator's to neither side.
 *
 * WHAT IT ASSERTS, in order:
 *
 *  1. THE BUILDS (build/diagnostic/build-checker.mjs, spawned as the lane does):
 *     `<out>/test`, `<out>/diag`, `<out>/plain` and one `<out>/ablate-<rule>`
 *     per rule, every module's sha256 printed.
 *  2. SPEC §2.2's ROWS, through the test variant: control (40 of 40 reads, 2
 *     writes, a fresh integrity_check `ok`, a clean close, no line);
 *     crash-state (no read fails, the line, then SIGSEGV at 0x34 in
 *     pcache1EnforceMaxPage+0x68 at the close, exit 139); zero-header (the same
 *     fault); page-zero (10 SQLITE_CORRUPT, 30 ok, a fresh `ok`, a clean
 *     close). The crash-state arm also proves THE ROUTE (D6, D7): the line goes
 *     into the file TORTIE_CHECKER names, after a line already there, in app.log's
 *     envelope with every D6 field in order, the home folder written `~`, and
 *     the variable is gone from the environment after the first call.
 *     Every [p358adv-*] line is read with probe-p357.mjs's own patterns,
 *     copied below as text, because its CS arms read these lines.
 *  3. EVERY RULE IS WHAT SEES ITS DAMAGE: for each rule, one plant that only
 *     that rule catches is CAUGHT by the test variant and MISSED by the build
 *     with `-DTCHK_ABLATE_<RULE>` (for `readable`, the line becomes a fault),
 *     each child ended by P358ADV_END_AFTER_PLANT at the planting call so
 *     nothing in SQLite touches the damage first.
 *  4. THE DIAGNOSTIC VARIANT: a clean run through the hook writes the armed line
 *     to its file and nothing else, no [p358adv- byte reaches stderr; by
 *     `strings` and `nm -u` it holds no P358ADV, no [p358adv- and imports no
 *     sigaction, while the test module holds all three (so the reads can fail)
 *     and the plain module holds no checker at all.
 *  5. build-checker.mjs's REFUSALS, against a scratch copy of the checkout's
 *     shape (a clone of the package, mutated one way at a time): another
 *     version, one byte of the amalgamation, a doubled and a missing anchor,
 *     headers for another Electron, no --devdir, --define on the diagnostic
 *     variant or naming no ablation, --out inside node_modules, --json inside
 *     --out, an unknown flag, and a folder it did not make. The unmutated copy
 *     is the control: it passes the package checks. Every build is then read
 *     for the prebuild it must not keep.
 *  6. NOTHING UNDER node_modules MOVED: better-sqlite3's and node-gyp's folders
 *     listed by path, size and mtime before and after.
 *  7. THE RULES THE SPEC STEP'S CHECKER DID NOT HAVE, each shown able to fail
 *     (and since the fix round: a freed slot's 0xcd read by the line's
 *     ADDRESS, not its header; the same slot written over from its start,
 *     the fill left in the header; the holder of a bad link reported, not
 *     the memory it points at; the bulk block's own guard; and the readable
 *     rule's second arm, a wild hash table):
 *     the guard at a free (a stray write no walk saw, reported in the D6
 *     fields when SQLite frees the line), redaction exactly as
 *     src/main/log/redact.ts does it, the test handler taking an abort, the
 *     compile-time fence that keeps an ablation out of a diagnostic build,
 *     hook-bs3.cjs acting only when named and refusing a relative folder or one
 *     inside node_modules, and build-checker.mjs's read-back seeing each of
 *     D10's three.
 *  8. THE CRASH REPORTS: ~/Library/Logs/DiagnosticReports (and Retired/) listed
 *     by NAME and mtime before and after, never opened. The test variant's own
 *     handler exits 139 before macOS writes one; a new report named for node
 *     is a failure. This run makes five deliberate faults (crash-state,
 *     zero-header, readable ablated twice, one abort).
 *
 * Exit 0 when everything held, 1 when a clause failed, 2 when it could not run.
 * `--reuse` keeps a build whose recorded checker hash and defines still match.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);
const ROOT = resolve(HERE, '..', '..');
const BUILD_CHECKER = join(HERE, 'build-checker.mjs');
const HOOK = join(HERE, 'hook-bs3.cjs');
const CHECKER_C = join(HERE, 'sqlite-checker.c');

// ---------------------------------------------------------------------------
// What every reading is held against, by value
// ---------------------------------------------------------------------------

/** probe-p357.mjs's own patterns, copied as text (its CS arms read these lines). */
export const P357_SEGV_PARTS = /\[p358adv-SEGV\] signal (\d+) at address (0x[0-9a-f]+), pc 0x[0-9a-f]+ = ([^+\s]+)\+0x([0-9a-f]+) in /;
export const P357_PLANT_LINE = /\[p358adv-PLANT\] crash-state at check \d+ op=\S+ cache=(0x[0-9a-f]+)/;
export const P357_VIOLATION_LINE = /\[p358adv-VIOLATION\] [^\n]* file=(\S+) cache=(0x[0-9a-f]+)/g;
/** This file's fuller readers of the same lines (sqlite-checker.c's formats). */
const PLANT_RE = /^\[p358adv-PLANT\] (\S+) at check (\d+) op=(\S+) cache=(0x[0-9a-f]+) line=(0x[0-9a-f]+) page=(\d+) file=(.*)$/;
const VIOLATION_RE = /^\[p358adv-VIOLATION\] ([a-z-]+): (.*) op=(\S+) check=(\d+) n=(\d+) line=(0x[0-9a-f]+) file=(\S+) cache=(0x[0-9a-f]+)$/;
const END_RE = /^\[p358adv-END\] the plant's entry ended op=(\S+) walked=([01]) violations=(\d+) reported=([01])$/;
const ARMED_RE = /^\[p358adv-ARMED\] checker (\S+) guard=(\d+) installed=([01]) plant=(\S+) /;
/** The one line's fields, in order (SPEC D6). */
export const D6_FIELDS = Object.freeze([
  'ts', 'level', 'scope', 'pid', 'proctype', 'event', 'msg',
  'check', 'detail', 'reading', 'line', 'header', 'guardBytes', 'headerBytes', 'pageBytes',
  'pageNumber', 'pagerPageNumber', 'bulk', 'words', 'database', 'schema', 'cache', 'entry',
  'walks', 'lines', 'sinceLoadMs', 'checker', 'guard'
]);
export const ARMED_FIELDS = Object.freeze(['ts', 'level', 'scope', 'pid', 'proctype', 'event', 'msg', 'checker', 'variant', 'guard', 'installed', 'floorMs']);
/**
 * Research 143 §5's three readings (SPEC D8), and the allocator's fill for a
 * freed slot, which is what a foreign free leaves in Tortie's running main
 * process (the fix round, measured by both lenses: 0xcd over the guard and the
 * header).
 */
export const READINGS = Object.freeze({
  free: 'a free-list entry in the guard: freed by code outside SQLite',
  fill: "the allocator's fill for freed memory (0xcd) in the guard and the header: freed by code outside SQLite",
  fillWritten: "the allocator's fill for freed memory (0xcd) in the header and other bytes in the guard: freed by code outside SQLite, then written over",
  zeros: 'zeros in the guard and the header: freed, then taken by a zero-filled block',
  stray: 'something else wrote here: a stray write'
});
/** "tortie-guard-364" (SPEC D2). */
export const GUARD_HEX = Buffer.from('tortie-guard-364', 'latin1').toString('hex');
export const CHECKER_VERSION = '364.3';
/** __PAGEZERO, where the readable rule's plant points (sqlite-checker.c TCHK_WILD). */
const WILD = 0x20000000;

/**
 * The rules and the one plant each owns. `check` is the line's `check` field
 * when the rule is in; the ablated build must miss the same plant.
 */
export const RULES = Object.freeze([
  { id: 'owner', define: 'TCHK_ABLATE_OWNER', plant: 'owner', check: 'owner', detail: /owner is not this cache/ },
  { id: 'lru-link', define: 'TCHK_ABLATE_LRU_LINK', plant: 'lru-link', check: 'lru', detail: /does not point back/ },
  { id: 'hash-chain', define: 'TCHK_ABLATE_HASH_CHAIN', plant: 'hash-chain', check: 'hash', detail: /sits in chain/ },
  { id: 'count', define: 'TCHK_ABLATE_COUNT', plant: 'count', check: 'count', detail: /the chains hold \d+ for a count of \d+/ },
  { id: 'guard', define: 'TCHK_ABLATE_GUARD', plant: 'stray-write', check: 'guard', detail: /the guard changed/ },
  { id: 'page-number', define: 'TCHK_ABLATE_PAGE_NUMBER', plant: 'page-number', check: 'page-number', detail: /in the pager's record/ },
  {
    id: 'close-walk',
    define: 'TCHK_ABLATE_CLOSE_WALK',
    plant: 'crash-state',
    check: 'owner',
    detail: /owner is not this cache/,
    entry: 'Database::close',
    at: '0',
    env: { P358ADV_PLANT_READONLY: '1', P358ADV_FLOOR_MS: '600000' }
  },
  { id: 'readable', define: 'TCHK_ABLATE_READABLE', plant: 'wild-link', check: 'lru', detail: /outside readable memory, at 0x20000000$/, ablatedFaults: true },
  // The fix round (lens B): the hash table's own read was guarded by a check no arm reached; a wild
  // table pointer is caught with the rule, and read straight through, a fault, without it.
  { id: 'readable-hash', define: 'TCHK_ABLATE_READABLE', plant: 'wild-hash', check: 'hash', detail: /^the hash table cannot be read$/, ablatedFaults: true }
]);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const J = JSON.stringify;

// ---------------------------------------------------------------------------
// THE CHILD: one arm in a forked node, loaded with hook-bs3.cjs (SPEC §2.2's
// harness, the spec step's arms-child.cjs): a manifest-shaped WAL database,
// 354 rows of 12,000 to 17,000 bytes, warmed, then reads shaped like the
// ring's digest and listSessions, two writes, a FRESH read-only
// integrity_check, and the end ARM_END names. One JSON line before the end.
// ---------------------------------------------------------------------------

function runChild() {
  if ((process.env.P358ADV_BS3 ?? '') === '') {
    process.stderr.write('P364-ARM refused: no checking build named by P358ADV_BS3\n');
    process.exit(3);
  }
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  if (process.env.ARM_ABORT === '1') {
    // The fault handler's widest case: an abort, which no plant makes.
    new Database(':memory:').prepare('SELECT 1').get();
    process.abort();
  }
  const dir = process.env.ARM_DIR;
  const end = process.env.ARM_END || 'close';
  const warm = Number(process.env.ARM_WARM || '600');
  const out = { arm: process.env.ARM || 'control', pid: process.pid, node: process.versions.node };
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'manifest.db');
  for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  out.envAfterFirstCall = process.env.TORTIE_CHECKER === undefined ? 'gone' : 'still set';
  db.pragma('synchronous = NORMAL');
  db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER, last_seen INTEGER, status TEXT, payload TEXT)');
  db.exec('CREATE TABLE migrations (version INTEGER PRIMARY KEY, applied_at INTEGER)');
  const ins = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (let i = 0; i < 354; i += 1) ins.run(`id-${i}`, `n${i}`, 1e12 + i, 0, 'idle', 'p'.repeat(12000 + ((i * 37) % 5000)));
    for (let v = 1; v <= 20; v += 1) db.prepare('INSERT INTO migrations VALUES (?, ?)').run(v, v);
  })();
  out.pageCount = db.pragma('page_count', { simple: true });
  const list = db.prepare('SELECT * FROM sessions ORDER BY created_at ASC');
  const one = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const digest = (table) => {
    let n = 0;
    for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY 1`).raw(true).iterate()) n += row.length;
    return n;
  };
  const warmReads = { ok: 0, codes: {} };
  for (let k = 0; k < warm; k += 1) {
    try {
      if (k % 3 === 0) list.all();
      else if (k % 3 === 1) one.get(`id-${k % 354}`);
      else db.prepare('SELECT count(*) FROM migrations').get();
      warmReads.ok += 1;
    } catch (err) {
      const code = err?.code ?? 'unknown';
      warmReads.codes[code] = (warmReads.codes[code] ?? 0) + 1;
    }
  }
  out.warmReads = warmReads;
  if (process.env.ARM_SHRINK === '1') {
    // SQLite frees its oldest lines now (pcache1Cachesize, then pcache1EnforceMaxPage).
    db.pragma('cache_size = 1');
    out.shrunk = true;
  }
  const reads = { ok: 0, codes: {} };
  const tryRead = (fn) => {
    try {
      fn();
      reads.ok += 1;
    } catch (err) {
      const code = err?.code ?? String(err?.message).slice(0, 60);
      reads.codes[code] = (reads.codes[code] ?? 0) + 1;
    }
  };
  for (let k = 0; k < 10; k += 1) {
    tryRead(() => digest('sessions'));
    tryRead(() => digest('migrations'));
    tryRead(() => list.all());
    tryRead(() => one.get(`id-${(k * 31) % 354}`));
  }
  const writes = { ok: 0, codes: {} };
  for (let k = 0; k < 2; k += 1) {
    try {
      db.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').run(Date.now(), `id-${k}`);
      writes.ok += 1;
    } catch (err) {
      const code = err?.code ?? 'unknown';
      writes.codes[code] = (writes.codes[code] ?? 0) + 1;
    }
  }
  out.reads = reads;
  out.writes = writes;
  try {
    const fresh = new Database(file, { readonly: true, fileMustExist: true });
    out.freshIntegrity = fresh.pragma('integrity_check', { simple: true });
    fresh.close();
  } catch (err) {
    out.freshIntegrity = `threw: ${err?.code ?? String(err?.message)}`;
  }
  out.end = end;
  process.stdout.write(`P364-ARM ${J(out)}\n`);
  if (end === 'close') {
    db.close();
    process.stdout.write('P364-ARM-CLOSED\n');
    process.exit(0);
  } else if (end === 'exit') {
    process.exit(0);
  } else {
    process.kill(process.pid, 'SIGKILL');
  }
}

// ---------------------------------------------------------------------------
// The readers: pure over the text a child left
// ---------------------------------------------------------------------------

/** Every [p358adv-*] line and every JSON line a child wrote to stderr. */
export function readStderr(text) {
  const r = { armed: null, plants: [], violations: [], segv: null, end: null, takes: [], json: [], violationLines: 0 };
  for (const line of String(text ?? '').split('\n')) {
    if (line.startsWith('[p358adv-ARMED]')) {
      const m = ARMED_RE.exec(line);
      r.armed = m === null ? { raw: line } : { version: m[1], guard: Number(m[2]), installed: m[3] === '1', plant: m[4], raw: line };
    } else if (line.startsWith('[p358adv-PLANT]')) {
      const m = PLANT_RE.exec(line);
      r.plants.push(m === null ? { raw: line } : { kind: m[1], checkNo: Number(m[2]), op: m[3], cache: m[4], line: m[5], page: Number(m[6]), file: m[7], raw: line });
    } else if (line.startsWith('[p358adv-VIOLATION]')) {
      r.violationLines += 1;
      const m = VIOLATION_RE.exec(line);
      if (r.violations.length < 8) {
        r.violations.push(m === null ? { raw: line } : { check: m[1], detail: m[2], op: m[3], checkNo: Number(m[4]), n: Number(m[5]), line: m[6], file: m[7], cache: m[8], raw: line });
      }
    } else if (line.startsWith('[p358adv-SEGV]')) {
      const m = P357_SEGV_PARTS.exec(line);
      r.segv = m === null ? { raw: line } : { signal: Number(m[1]), address: m[2], frame: m[3], offset: `0x${m[4]}`, raw: line };
    } else if (line.startsWith('[p358adv-END]')) {
      const m = END_RE.exec(line);
      r.end = m === null ? { raw: line } : { op: m[1], walked: m[2] === '1', violations: Number(m[3]), reported: m[4] === '1' };
    } else if (line.startsWith('[p358adv-TAKE]')) {
      r.takes.push(line);
    } else if (line.startsWith('{')) {
      try {
        r.json.push(JSON.parse(line));
      } catch {
        r.json.push({ unparsed: line });
      }
    }
  }
  return r;
}

/** True when `o`'s own keys are exactly `fields`, in that order. */
const keysAre = (o, fields) => o !== null && typeof o === 'object' && J(Object.keys(o)) === J(fields);
const isHex = (v, bytes) => typeof v === 'string' && new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(v);

/** The D6 clauses every page line must hold, whatever caught it. */
function d6Clauses(line, pid) {
  return [
    ['the line carries every D6 field, in order', keysAre(line, D6_FIELDS)],
    ['app.log envelope: error, scope diagnostic, proctype main, event diagnostic.pcache, this pid', line?.level === 'error' && line?.scope === 'diagnostic' && line?.proctype === 'main' && line?.event === 'diagnostic.pcache' && line?.pid === pid],
    ['ts is ISO 8601 UTC with milliseconds', typeof line?.ts === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(line.ts)],
    line?.header === null
      ? ['a failure of the cache itself: no line, so line, header and every byte field null', line?.line === null && line?.guardBytes === null && line?.headerBytes === null && line?.pageBytes === null && line?.pageNumber === null && line?.reading === 'no line: the cache itself']
      : ['guardBytes 16 (or null on a bulk line), headerBytes 56, pageBytes 64, as hex', (line?.bulk === true ? line?.guardBytes === null : isHex(line?.guardBytes, 16)) && isHex(line?.headerBytes, 56) && isHex(line?.pageBytes, 64)],
    ['checker and guard', line?.checker === CHECKER_VERSION && line?.guard === 16],
    ['words is a list of strings', Array.isArray(line?.words) && line.words.every((w) => typeof w === 'string')]
  ];
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

const results = [];
let couldNotRun = 0;
function record(name, clauses, extra = {}) {
  const failed = clauses.filter(([, ok]) => ok !== true).map(([what]) => what);
  results.push({ name, ok: failed.length === 0, failed, ...extra });
  process.stdout.write(`${failed.length === 0 ? 'PASS' : 'FAIL'} ${name}${failed.length === 0 ? '' : `; FAILED ${J(failed)}`}\n`);
}
function cannot(name, why) {
  couldNotRun += 1;
  results.push({ name, ok: null, failed: [why] });
  process.stdout.write(`UNREADABLE ${name}: ${why}\n`);
}

function parseArgs(argv) {
  const a = { out: null, devdir: null, reuse: false, json: null };
  for (let i = 0; i < argv.length; i += 1) {
    const f = argv[i];
    if (f === '--reuse') a.reuse = true;
    else if (f === '--out' || f === '--devdir' || f === '--json') {
      if (i + 1 >= argv.length) throw new Error(`${f} needs a value`);
      a[f.slice(2)] = argv[(i += 1)];
    } else throw new Error(`unknown argument ${J(f)}`);
  }
  if (a.out === null) throw new Error('usage: node build/diagnostic/checker-selftest.mjs --out <scratch> [--devdir <dir>] [--reuse] [--json <file>]');
  return a;
}

/** One build through build-checker.mjs, as the lane runs it, or a reuse of an identical one. */
function build(ctx, name, variant, defines = []) {
  const out = join(ctx.out, name);
  const json = `${out}.json`;
  const checkerSha = sha256(readFileSync(CHECKER_C));
  if (ctx.reuse && existsSync(json)) {
    try {
      const prior = JSON.parse(readFileSync(json, 'utf8'));
      const node = join(out, 'build', 'Release', 'better_sqlite3.node');
      // Phase 369's probe review: a build made against ANOTHER Electron's headers is never reused,
      // or `--reuse` over an --out built before an Electron move skips the one step that builds
      // against the installed version's headers and every row reads green over the old build.
      const electron = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'electron', 'package.json'), 'utf8')).version;
      const same = prior.variant === variant && J(prior.defines) === J(defines) && prior.electron === electron && (variant === 'plain' || prior.checkerSha256 === checkerSha);
      if (same && existsSync(node) && sha256(readFileSync(node)) === prior.sha256) {
        process.stdout.write(`build ${name}: reused (${prior.sha256})\n`);
        return { ok: true, out, line: prior, reused: true };
      }
    } catch {
      /* rebuild */
    }
  }
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    [BUILD_CHECKER, '--variant', variant, '--out', out, '--devdir', ctx.devdir, ...defines.flatMap((d) => ['--define', d]), '--json', json],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 25 * 60_000, env: ctx.buildEnv }
  );
  let line = null;
  try {
    line = JSON.parse(String(r.stdout).trim().split('\n').pop());
  } catch {
    line = null;
  }
  process.stdout.write(`build ${name}: exit ${String(r.status)} in ${((Date.now() - t0) / 1000).toFixed(1)} s${line ? ` sha256 ${line.sha256}` : ''}\n`);
  if (r.status !== 0 || line === null) {
    process.stdout.write(String(r.stderr).slice(-1500));
    return { ok: false, out, line, status: r.status, stderr: String(r.stderr) };
  }
  return { ok: true, out, line };
}

/** One arm: a forked node with the hook, the build at `bs3`, the plant `env` names. */
function runArm(ctx, name, bs3, { end = 'close', env = {}, route = false, home = null } = {}) {
  const dir = join(ctx.out, 'arms', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const appLog = join(dir, 'app.log');
  const childEnv = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: ctx.childHome,
    TMPDIR: ctx.childTmp,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    NODE_OPTIONS: `--require=${HOOK}`,
    P358ADV_BS3: bs3,
    ARM: name,
    ARM_DIR: dir,
    ARM_END: end,
    ...env
  };
  if (route) {
    // A line already there, which the checker's own line must follow and never cut.
    writeFileSync(appLog, `${J({ ts: new Date().toISOString(), level: 'info', scope: 'boot', pid: 1, proctype: 'main', msg: 'a line already there' })}\n`);
    childEnv.TORTIE_CHECKER = `${appLog}\t${home ?? ctx.routeHome}`;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [SELF, '--arm-child'], { env: childEnv, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 180_000 });
  const stdout = String(r.stdout ?? '');
  const stderr = String(r.stderr ?? '');
  const m = /^P364-ARM (\{.*\})$/m.exec(stdout);
  const reading = {
    name,
    ms: Date.now() - t0,
    status: r.status,
    signal: r.signal,
    pid: r.pid,
    arm: m === null ? null : JSON.parse(m[1]),
    closed: stdout.includes('P364-ARM-CLOSED'),
    err: readStderr(stderr),
    stderr,
    appLog: route && existsSync(appLog) ? readFileSync(appLog, 'utf8') : null
  };
  writeFileSync(join(dir, 'stderr.txt'), stderr);
  writeFileSync(join(dir, 'stdout.txt'), stdout);
  return reading;
}

const pcacheLines = (rd) => rd.err.json.filter((o) => o?.event === 'diagnostic.pcache');
const first = (a) => (Array.isArray(a) && a.length > 0 ? a[0] : null);

function gradeSection22(ctx, test) {
  // control
  {
    const rd = runArm(ctx, 'control', test.out);
    record('§2.2 control: 40 of 40 reads, 2 writes, fresh ok, a clean close, no line', [
      ['the test variant loaded (its armed line, installed, no plant)', rd.err.armed?.installed === true && rd.err.armed?.plant === 'none'],
      ['exit 0 with no signal', rd.status === 0 && rd.signal === null],
      ['40 of 40 reads', rd.arm?.reads?.ok === 40 && Object.keys(rd.arm?.reads?.codes ?? { x: 1 }).length === 0],
      ['2 of 2 writes', rd.arm?.writes?.ok === 2],
      ['a fresh connection reads ok', rd.arm?.freshIntegrity === 'ok'],
      ['db.close() returned', rd.closed === true],
      ['no plant, no violation, no line, no fault', rd.err.plants.length === 0 && rd.err.violationLines === 0 && pcacheLines(rd).length === 0 && rd.err.segv === null]
    ], { ms: rd.ms });
  }
  // crash-state, with the route
  {
    const rd = runArm(ctx, 'crash-state', test.out, { env: { P358ADV_PLANT: 'crash-state', P358ADV_PLANT_AT: '200', P358ADV_SEGV_EXIT: '1' }, route: true });
    const plant = first(rd.err.plants);
    const v = first(rd.err.violations);
    const lines = (rd.appLog ?? '').split('\n');
    const parsed = lines.filter((l) => l !== '').map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { unparsed: l };
      }
    });
    const armed = parsed[1];
    const line = parsed[2];
    const p357Plant = P357_PLANT_LINE.exec(rd.stderr);
    const p357Violation = [...rd.stderr.matchAll(P357_VIOLATION_LINE)].find((x) => p357Plant !== null && x[2] === p357Plant[1]);
    const dbFile = join(ctx.out, 'arms', 'crash-state', 'manifest.db');
    record('§2.2 crash-state: no read fails, the one line, then SIGSEGV at 0x34 in pcache1EnforceMaxPage+0x68, exit 139', [
      ['the plant was made, in the arm\'s own database', plant?.kind === 'crash-state' && plant?.file === dbFile],
      ['40 of 40 reads after the plant', rd.arm?.reads?.ok === 40 && Object.keys(rd.arm?.reads?.codes ?? { x: 1 }).length === 0],
      ['2 of 2 writes', rd.arm?.writes?.ok === 2],
      ['a fresh connection reads ok', rd.arm?.freshIntegrity === 'ok'],
      ['the first violation is the owner, in the planted cache', v?.check === 'owner' && v?.cache === plant?.cache],
      ['the close faulted: signal 11 at 0x34 in pcache1EnforceMaxPage+0x68 (his report\'s frame)', rd.err.segv?.signal === 11 && rd.err.segv?.address === '0x34' && rd.err.segv?.frame === 'pcache1EnforceMaxPage' && rd.err.segv?.offset === '0x68'],
      ['the checker\'s own handler ended it: exit 139, no signal, db.close() never returned', rd.status === 139 && rd.signal === null && rd.closed === false],
      ['probe-p357\'s patterns read these lines (PLANT, VIOLATION by the plant\'s cache, SEGV)', p357Plant !== null && p357Violation !== undefined && p357Violation[1] === dbFile && P357_SEGV_PARTS.test(rd.stderr)],
      ['THE ROUTE: the file holds the line already there, the armed line, then ONE line', rd.appLog !== null && parsed.length === 3 && parsed[0]?.msg === 'a line already there' && rd.appLog.endsWith('\n')],
      ['the armed line: app.log\'s envelope, its fields in order, the test variant, installed', keysAre(armed, ARMED_FIELDS) && armed?.event === 'diagnostic.armed' && armed?.level === 'info' && armed?.variant === 'test' && armed?.installed === true && armed?.pid === rd.pid],
      ['TORTIE_CHECKER is gone from the environment after the first call', rd.arm?.envAfterFirstCall === 'gone'],
      ['nothing of the line reached stderr once armed', pcacheLines(rd).length === 0],
      ...d6Clauses(line, rd.pid),
      ['check owner, its page and the pager\'s agree with the plant', line?.check === 'owner' && line?.pageNumber === plant?.page && line?.pagerPageNumber === plant?.page && line?.bulk === false],
      ['the guard is whole and the reading is D8\'s third (owner 0, the guard whole)', line?.guardBytes === GUARD_HEX && line?.reading === READINGS.stray],
      ['the line and header addresses: the plant\'s line, its header szPage on', line?.line === plant?.line && typeof line?.header === 'string' && BigInt(line.header) - BigInt(line.line) === 4096n],
      ['the database is the arm\'s, the home folder written ~', line?.database === '~/crash-state/manifest.db' && line?.schema === 'main' && line?.cache === plant?.cache],
      ['the header bytes show the owner read 0 (bytes 32 to 39)', typeof line?.headerBytes === 'string' && line.headerBytes.slice(64, 80) === '0000000000000000']
    ], { ms: rd.ms });
  }
  // zero-header
  {
    const rd = runArm(ctx, 'zero-header', test.out, { env: { P358ADV_PLANT: 'zero-header', P358ADV_PLANT_AT: '200', P358ADV_SEGV_EXIT: '1' } });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    record('§2.2 zero-header: no read fails, the line, then the same fault at the close, exit 139', [
      ['the plant was made, its line and page read before the damage', plant?.kind === 'zero-header' && plant?.line !== '0x0' && plant?.page > 0],
      ['40 of 40 reads after the plant', rd.arm?.reads?.ok === 40 && Object.keys(rd.arm?.reads?.codes ?? { x: 1 }).length === 0],
      ['a fresh connection reads ok', rd.arm?.freshIntegrity === 'ok'],
      ['the first violation: a link does not point back', first(rd.err.violations)?.check === 'lru' && /does not point back/.test(first(rd.err.violations)?.detail ?? '')],
      ['the one line on stderr (not armed), check lru, its header all zeros, the guard whole', line?.check === 'lru' && line?.headerBytes === '0'.repeat(112) && line?.guardBytes === GUARD_HEX && line?.reading === READINGS.stray && line?.pageNumber === 0],
      ...d6Clauses(line, rd.pid),
      ['the close faulted: signal 11 at 0x34 in pcache1EnforceMaxPage+0x68', rd.err.segv?.signal === 11 && rd.err.segv?.address === '0x34' && rd.err.segv?.frame === 'pcache1EnforceMaxPage' && rd.err.segv?.offset === '0x68'],
      ['exit 139, db.close() never returned', rd.status === 139 && rd.closed === false]
    ], { ms: rd.ms });
  }
  // page-zero
  {
    const rd = runArm(ctx, 'page-zero', test.out, { env: { P358ADV_PLANT: 'page-zero', P358ADV_PLANT_AT: '200', P358ADV_SEGV_EXIT: '1' } });
    const codes = rd.arm?.reads?.codes ?? {};
    record('§2.2 page-zero: 10 SQLITE_CORRUPT and 30 ok, fresh ok, a clean close; the header is whole, so no line', [
      ['the plant was made', first(rd.err.plants)?.kind === 'page-zero'],
      ['10 SQLITE_CORRUPT and 30 ok', rd.arm?.reads?.ok === 30 && codes.SQLITE_CORRUPT === 10 && Object.keys(codes).length === 1],
      ['a fresh connection reads ok (the file is fine)', rd.arm?.freshIntegrity === 'ok'],
      ['exit 0, db.close() returned', rd.status === 0 && rd.signal === null && rd.closed === true],
      ['no violation and no line: the guard and the header are whole', rd.err.violationLines === 0 && pcacheLines(rd).length === 0 && rd.err.segv === null]
    ], { ms: rd.ms, writes: rd.arm?.writes });
  }
}

/** The rules the spec step's checker did not have, each shown able to fail. */
function gradeAdditions(ctx, test) {
  // The guard at a free (D2): damage no walk sees first, then SQLite lets go of the line.
  {
    const rd = runArm(ctx, 'guard-at-free', test.out, {
      env: { P358ADV_PLANT: 'stray-write', P358ADV_PLANT_AT: '0', P358ADV_STEP_EVERY: '1000000000', P358ADV_SEGV_EXIT: '1', ARM_SHRINK: '1' }
    });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    record('the guard at a free: a stray write no walk saw is reported when SQLite frees the line, in the same D6 fields', [
      ['the plant was made at a call that did not walk', plant?.kind === 'stray-write'],
      ['the shrink ran and the arm ran to a clean close', rd.arm?.shrunk === true && rd.status === 0 && rd.closed === true],
      ['ONE line: an allocation, check guard-at-free, entry free, its own line', pcacheLines(rd).length === 1 && line?.msg === 'A SQLite allocation failed its check' && line?.check === 'guard-at-free' && line?.entry === 'free' && line?.line === plant?.line],
      ['the D6 fields in order, then size', keysAre(line, [...D6_FIELDS.slice(0, -5), 'size', ...D6_FIELDS.slice(-5)])],
      ['no header, so its fields are null; the guard is the stray write\'s', line?.header === null && line?.headerBytes === null && line?.pageNumber === null && line?.guardBytes !== GUARD_HEX && isHex(line?.guardBytes, 16)],
      ['the reading is a stray write and names libsystem_malloc.dylib!malloc_zone_malloc', line?.reading === READINGS.stray && Array.isArray(line?.words) && line.words.some((w) => /libsystem_malloc\.dylib!malloc_zone_malloc/.test(w))],
      ['the size is the line\'s allocation, past 4,368 bytes', Number.isInteger(line?.size) && line.size >= 4368],
      ['the walk never saw it (no violation from a walk)', rd.err.violations.every((v) => v.op === 'free')]
    ], { ms: rd.ms });
  }
  // Redaction exactly as src/main/log/redact.ts: every occurrence, no separator needed.
  {
    const rd = runArm(ctx, 'redaction', test.out, { end: 'exit', env: { P358ADV_PLANT: 'owner', P358ADV_PLANT_AT: '200', P358ADV_END_AFTER_PLANT: '1', P358ADV_SEGV_EXIT: '1' }, route: true, home: '/arms/redaction' });
    const parsed = (rd.appLog ?? '').split('\n').filter((l) => l !== '').map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { unparsed: l };
      }
    });
    record('the home folder is written ~ wherever it occurs in a string, as app.log\'s own redaction does', [
      ['the line is in the file', parsed.length === 3 && parsed[2]?.event === 'diagnostic.pcache'],
      ['a home that sits mid-path is replaced there', parsed[2]?.database === `${ctx.out}~/manifest.db`]
    ], { ms: rd.ms });
  }
  // THE FIX ROUND (2026-11-09). A line from SQLite's bulk block is told by its ADDRESS, never by its
  // header: both lenses saw a freed line's header (0xcd, the allocator's fill) claim the bulk block, so
  // the guard that held the answer was never read and a foreign free read as a stray write.
  {
    const rd = runArm(ctx, 'freed-fill', test.out, { end: 'exit', env: { P358ADV_PLANT: 'freed-fill', P358ADV_PLANT_AT: '200', P358ADV_END_AFTER_PLANT: '1', P358ADV_SEGV_EXIT: '1' } });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    record("the allocator's fill for a freed slot: the line is read by its address (not the bulk block), its guard written, and the reading names the fill", [
      ['the plant was made', plant?.kind === 'freed-fill'],
      ['ONE line, the planted line, check lru (its back link is the fill)', pcacheLines(rd).length === 1 && line?.line === plant?.line && line?.check === 'lru' && /does not point back/.test(line?.detail ?? '')],
      ...d6Clauses(line, rd.pid),
      ['bulk false: the header claims the bulk block, the address does not, and the detail says so', line?.bulk === false && /its header says it is a line of the bulk block, which its address is not/.test(line?.detail ?? '')],
      ['the guard is written, all 0xcd, and so is the header', line?.guardBytes === 'cd'.repeat(16) && line?.headerBytes === 'cd'.repeat(56)],
      ["the reading is the allocator's fill", line?.reading === READINGS.fill],
      ['the planting call walked, reported, and ended there (exit 0)', rd.err.end?.walked === true && rd.err.end?.reported === true && rd.status === 0 && rd.signal === null]
    ], { ms: rd.ms });
  }
  // The same freed slot, then taken by a 4,096-byte block that wrote all it asked for: the fill stays in the
  // header past 0x1000, so the line still says the slot was freed (research 143 §2.2's malloc(4096) row).
  {
    const rd = runArm(ctx, 'fill-written', test.out, { end: 'exit', env: { P358ADV_PLANT: 'fill-written', P358ADV_PLANT_AT: '200', P358ADV_END_AFTER_PLANT: '1', P358ADV_SEGV_EXIT: '1' } });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    record("a freed slot written over from its start: the guard holds the new owner's bytes, the header the allocator's fill, and the reading says freed, then written over", [
      ['the plant was made', plant?.kind === 'fill-written'],
      ['ONE line, the planted line, check lru (its back link is the fill)', pcacheLines(rd).length === 1 && line?.line === plant?.line && line?.check === 'lru' && /does not point back/.test(line?.detail ?? '')],
      ...d6Clauses(line, rd.pid),
      ['bulk false, by its address', line?.bulk === false],
      ["the guard holds the new owner's bytes and the header the fill", line?.guardBytes === 'a5'.repeat(16) && line?.headerBytes === 'cd'.repeat(56)],
      ['the reading: freed by code outside SQLite, then written over', line?.reading === READINGS.fillWritten],
      ['the planting call walked, reported, and ended there (exit 0)', rd.err.end?.walked === true && rd.err.end?.reported === true && rd.status === 0 && rd.signal === null]
    ], { ms: rd.ms });
  }
  // The line a bad link is held by is the one reported, not the memory it points at (lens B's nit).
  {
    const rd = runArm(ctx, 'lru-garbage', test.out, { end: 'exit', env: { P358ADV_PLANT: 'lru-garbage', P358ADV_PLANT_AT: '200', P358ADV_END_AFTER_PLANT: '1', P358ADV_SEGV_EXIT: '1' } });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    record('a link to readable memory that is no line: the line holding the link is reported, with the address it points at', [
      ['the plant was made', plant?.kind === 'lru-garbage'],
      ['ONE line, check lru, naming the planted line (the holder), never the memory it points at', pcacheLines(rd).length === 1 && line?.check === 'lru' && line?.line === plant?.line],
      ['the detail names the address and says it is not a line of this cache', /^a link points at 0x[0-9a-f]+, which is not a line of this cache$/.test(line?.detail ?? '')],
      ...d6Clauses(line, rd.pid),
      ['the guard is whole and the header changed: a stray write', line?.guardBytes === GUARD_HEX && line?.reading === READINGS.stray],
      ['words names the link\'s target in the checker\'s own module', Array.isArray(line?.words) && line.words.some((w) => /better_sqlite3\.node/.test(w))],
      ['exit 0 at the planting call', rd.err.end?.reported === true && rd.status === 0 && rd.signal === null]
    ], { ms: rd.ms });
  }
  // The bulk block is one of SQLite's allocations: its own guard is read, and is what sizes the block.
  {
    const rd = runArm(ctx, 'bulk-guard', test.out, { end: 'exit', env: { P358ADV_PLANT: 'bulk-guard', P358ADV_PLANT_AT: '200', P358ADV_END_AFTER_PLANT: '1', P358ADV_SEGV_EXIT: '1' } });
    const plant = first(rd.err.plants);
    const line = first(pcacheLines(rd));
    const dbFile = join(ctx.out, 'arms', 'bulk-guard', 'manifest.db');
    record('the guard of a cache\'s bulk block: caught by the walk, reported as an allocation with its database, the pointer in it named', [
      ['the plant was made, in the arm\'s own database', plant?.kind === 'bulk-guard' && plant?.file === dbFile],
      ['ONE line: an allocation, check guard, the bulk block named, its own line', pcacheLines(rd).length === 1 && line?.msg === 'A SQLite allocation failed its check' && line?.check === 'guard' && line?.detail === "the guard of the cache's bulk block changed" && line?.line === plant?.line],
      ['the D6 fields in order, then size', keysAre(line, [...D6_FIELDS.slice(0, -5), 'size', ...D6_FIELDS.slice(-5)])],
      ['no header; the database, schema, cache and entry are the walk\'s (not armed, so the path is whole)', line?.header === null && line?.headerBytes === null && line?.database === dbFile && line?.schema === 'main' && line?.cache === plant?.cache && typeof line?.entry === 'string' && line.entry !== 'free'],
      ['the reading is a stray write and names libsystem_malloc.dylib!malloc_zone_malloc', line?.reading === READINGS.stray && Array.isArray(line?.words) && line.words.some((w) => /libsystem_malloc\.dylib!malloc_zone_malloc/.test(w))],
      ['the size is the bulk block\'s: at least twenty lines of 4,368 bytes', Number.isInteger(line?.size) && line.size >= 20 * 4368],
      ['exit 0 at the planting call', rd.err.end?.reported === true && rd.status === 0 && rd.signal === null]
    ], { ms: rd.ms });
  }
  // The test variant's fault handler takes an abort too, so no report reaches his folder.
  {
    const rd = runArm(ctx, 'abort', test.out, { env: { P358ADV_SEGV_EXIT: '1', ARM_ABORT: '1' } });
    record('the test variant\'s handler reports an abort on its one line and exits 139', [
      ['signal 6 on the handler\'s line', rd.err.segv?.signal === 6],
      ['exit 139, no signal', rd.status === 139 && rd.signal === null]
    ], { ms: rd.ms });
  }
  // The compile-time fence: an ablation never compiles into a diagnostic build.
  {
    const ccRun = (defines) => spawnSync('/usr/bin/cc', ['-std=c99', '-fsyntax-only', '-w', ...defines, '-x', 'c', CHECKER_C], { encoding: 'utf8', timeout: 60_000 });
    const diag = ccRun(['-DTCHK_ABLATE_OWNER']);
    const testV = ccRun(['-DTCHK_PLANT', '-DTCHK_ABLATE_OWNER']);
    const fence = 'an ablation belongs to the test variant alone';
    record('an ablation does not compile without the test variant', [
      ['the diagnostic variant with -DTCHK_ABLATE_OWNER stops at the fence', diag.status !== 0 && String(diag.stderr).includes(fence)],
      ['the test variant with the same define passes the fence', !String(testV.stderr).includes(fence)]
    ]);
  }
  // hook-bs3.cjs: nothing unless named, and only an absolute folder outside node_modules.
  {
    const probe = (bs3) =>
      spawnSync(process.execPath, ['-e', `const M = require('node:module'); const before = M._load; require(${J(HOOK)}); process.stdout.write(String(M._load === before));`], {
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: ctx.childHome, TMPDIR: ctx.childTmp, ...(bs3 === null ? {} : { P358ADV_BS3: bs3 }) }
      });
    const unset = probe(null);
    const named = probe(test.out);
    const relative = probe('selftest/test');
    const inNodeModules = probe(join(ROOT, 'node_modules', 'better-sqlite3'));
    record('hook-bs3.cjs redirects only when named, and only to an absolute folder outside node_modules', [
      ['unset: it leaves the loader alone', unset.status === 0 && unset.stdout === 'true'],
      ['named: it takes the loader over', named.status === 0 && named.stdout === 'false'],
      ['a relative folder is refused', relative.status !== 0 && /must be an absolute path/.test(String(relative.stderr))],
      ['a folder inside node_modules is refused', inNodeModules.status !== 0 && /inside node_modules/.test(String(inNodeModules.stderr))]
    ]);
  }
  // The read-back build-checker.mjs fails a diagnostic module on, proved able to fail.
  {
    const ok = Buffer.from('\0_p358adv_on_entry\0TORTIE_CHECKER\0', 'latin1');
    const bad = Buffer.from('\0_p358adv_on_entry\0TORTIE_CHECKER\0P358ADV_PLANT\0[p358adv-PLANT]\0\0_sigaction\0', 'latin1');
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', `import { d10Reads } from ${J(BUILD_CHECKER)}; process.stdout.write(JSON.stringify([d10Reads(Buffer.from(${J(ok.toString('base64'))}, 'base64')), d10Reads(Buffer.from(${J(bad.toString('base64'))}, 'base64'))]));`], { encoding: 'utf8' });
    let reads = null;
    try {
      reads = JSON.parse(r.stdout);
    } catch {
      reads = null;
    }
    record('build-checker.mjs\'s D10 read-back sees each of the three, and nothing on a clean module', [
      ['a clean module reads 0, 0, no sigaction, with the checker', reads?.[0]?.p358advEnv === 0 && reads?.[0]?.p358advLines === 0 && reads?.[0]?.importsSigaction === false && reads?.[0]?.hasEntryPoint === true && reads?.[0]?.namesTortieChecker === true],
      ['a module holding all three reads all three', reads?.[1]?.p358advEnv === 1 && reads?.[1]?.p358advLines === 1 && reads?.[1]?.importsSigaction === true]
    ]);
  }
}

function ruleEnv(rule) {
  return {
    P358ADV_PLANT: rule.plant,
    P358ADV_PLANT_AT: rule.at ?? '200',
    P358ADV_END_AFTER_PLANT: '1',
    P358ADV_SEGV_EXIT: '1',
    ...(rule.env ?? {})
  };
}

function gradeRuleCaught(ctx, rule, test) {
  const rd = runArm(ctx, `rule-${rule.id}`, test.out, { end: 'exit', env: ruleEnv(rule) });
  const plant = first(rd.err.plants);
  const v = first(rd.err.violations);
  const line = first(pcacheLines(rd));
  const clauses = [
    [`the plant ${rule.plant} was made`, plant?.kind === rule.plant],
    [`caught: the first violation is ${rule.check}, in the planted cache`, v?.check === rule.check && rule.detail.test(v?.detail ?? '') && v?.cache === plant?.cache],
    [`the one line names ${rule.check}`, line?.check === rule.check && rule.detail.test(line?.detail ?? '')],
    ...d6Clauses(line, rd.pid),
    ['the planting call walked, reported, and ended there (exit 0)', rd.err.end?.walked === true && rd.err.end?.reported === true && rd.status === 0 && rd.signal === null]
  ];
  if (rule.entry !== undefined) clauses.push([`the entry was ${rule.entry}`, line?.entry === rule.entry && plant?.op === rule.entry]);
  if (rule.id === 'guard') clauses.push(['the stray write\'s pointer is named: libsystem_malloc.dylib!malloc_zone_malloc', Array.isArray(line?.words) && line.words.some((w) => /libsystem_malloc\.dylib!malloc_zone_malloc/.test(w))]);
  if (rule.id === 'readable') clauses.push(['the line is the last readable line, never the wild link', typeof line?.header === 'string' && BigInt(line.header) !== BigInt(WILD)]);
  return { rd, clauses };
}

function gradeRuleMissed(ctx, rule, ablated) {
  const rd = runArm(ctx, `ablate-${rule.id}`, ablated.out, { end: 'exit', env: ruleEnv(rule) });
  const plant = first(rd.err.plants);
  if (rule.ablatedFaults) {
    const addr = rd.err.segv?.address === undefined ? NaN : Number.parseInt(rd.err.segv.address, 16);
    return {
      rd,
      clauses: [
        [`the plant ${rule.plant} was made`, plant?.kind === rule.plant],
        ['no line was written', pcacheLines(rd).length === 0 && rd.err.violationLines === 0],
        ['the walk read through the wild link and faulted: a SIGSEGV or SIGBUS inside the planted header\'s 56 bytes at 0x20000000', (rd.err.segv?.signal === 11 || rd.err.segv?.signal === 10) && addr >= WILD && addr < WILD + 56],
        ['the checker\'s own handler ended it: exit 139, never the planting call\'s end', rd.status === 139 && rd.err.end === null]
      ]
    };
  }
  return {
    rd,
    clauses: [
      [`the plant ${rule.plant} was made`, plant?.kind === rule.plant],
      ['missed: no violation, no line', rd.err.violationLines === 0 && pcacheLines(rd).length === 0],
      [
        rule.id === 'close-walk' ? 'the close did not walk' : 'the planting call walked over it',
        rd.err.end !== null && rd.err.end.walked === (rule.id !== 'close-walk') && rd.err.end.reported === false
      ],
      ['it ended at the planting call: exit 0', rd.status === 0 && rd.signal === null]
    ]
  };
}

function gradeDiagnostic(ctx, diag, test, plain) {
  // A clean run of the diagnostic variant through the hook, armed.
  const rd = runArm(ctx, 'diag-control', diag.out, { route: true });
  const parsed = (rd.appLog ?? '').split('\n').filter((l) => l !== '').map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return { unparsed: l };
    }
  });
  const armed = parsed[1];
  record('the diagnostic variant: armed by its file, silent otherwise, nothing of the test variant', [
    ['exit 0, 40 of 40 reads, fresh ok, a clean close', rd.status === 0 && rd.arm?.reads?.ok === 40 && rd.arm?.freshIntegrity === 'ok' && rd.closed === true],
    ['the file: the line already there, then the armed line, and nothing else', parsed.length === 2 && parsed[0]?.msg === 'a line already there'],
    ['the armed line: its fields in order, variant diagnostic, installed, the 25 ms floor', keysAre(armed, ARMED_FIELDS) && armed?.variant === 'diagnostic' && armed?.installed === true && armed?.floorMs === 25 && armed?.checker === CHECKER_VERSION],
    ['TORTIE_CHECKER is gone after the first call', rd.arm?.envAfterFirstCall === 'gone'],
    ['no [p358adv- byte and no JSON line on stderr', !rd.stderr.includes('[p358adv-') && rd.err.json.length === 0]
  ], { ms: rd.ms });

  // D10's reads, by the tools the spec names and by the bytes.
  const tool = (cmd, args) => {
    const r = spawnSync(cmd, args, { encoding: 'latin1', maxBuffer: 256 * 1024 * 1024 });
    return r.status === 0 ? String(r.stdout) : null;
  };
  const reads = (b) => {
    const node = join(b.out, 'build', 'Release', 'better_sqlite3.node');
    const strings = tool('/usr/bin/strings', ['-a', node]);
    const undef = tool('/usr/bin/nm', ['-u', node]);
    const all = tool('/usr/bin/nm', [node]);
    const bytes = readFileSync(node).toString('latin1');
    return {
      tools: strings !== null && undef !== null && all !== null,
      p358adv: strings === null ? null : strings.split('\n').filter((l) => l.includes('P358ADV')).length,
      bracket: strings === null ? null : strings.split('\n').filter((l) => l.includes('[p358adv-')).length,
      sigaction: undef === null ? null : undef.split('\n').some((l) => l.trim() === '_sigaction'),
      entry: all === null ? null : all.split('\n').some((l) => / T _p358adv_on_entry$/.test(l)),
      tortieChecker: strings === null ? null : strings.split('\n').some((l) => l.includes('TORTIE_CHECKER')),
      bytesP358adv: bytes.split('P358ADV').length - 1,
      bytesBracket: bytes.split('[p358adv-').length - 1
    };
  };
  const d = reads(diag);
  const t = reads(test);
  const p = reads(plain);
  record('D10 by strings and nm -u: the diagnostic module holds no P358ADV, no [p358adv-, no sigaction; the test module all three; the plain module no checker', [
    ['strings and nm answered', d.tools && t.tools && p.tools],
    ['diagnostic: 0 P358ADV, 0 [p358adv- (strings and bytes)', d.p358adv === 0 && d.bracket === 0 && d.bytesP358adv === 0 && d.bytesBracket === 0],
    ['diagnostic: no sigaction import', d.sigaction === false],
    ['diagnostic: the checker is in it (its entry point, TORTIE_CHECKER)', d.entry === true && d.tortieChecker === true],
    ['test: all three, so the reads can fail', t.p358adv > 0 && t.bracket > 0 && t.sigaction === true],
    ['plain: no checker at all', p.entry === false && p.tortieChecker === false && p.p358adv === 0 && p.sigaction === false]
  ], { diag: d, test: t, plain: p });
}

/** build-checker.mjs against a scratch copy of the checkout's shape, mutated one way at a time. */
function gradeRefusals(ctx) {
  const fake = join(ctx.out, 'fakeroot');
  rmSync(fake, { recursive: true, force: true });
  mkdirSync(join(fake, 'build', 'diagnostic'), { recursive: true });
  copyFileSync(BUILD_CHECKER, join(fake, 'build', 'diagnostic', 'build-checker.mjs'));
  copyFileSync(CHECKER_C, join(fake, 'build', 'diagnostic', 'sqlite-checker.c'));
  const nm = join(fake, 'node_modules');
  mkdirSync(join(nm, 'electron'), { recursive: true });
  mkdirSync(join(nm, 'node-gyp', 'bin'), { recursive: true });
  copyFileSync(join(ROOT, 'node_modules', 'electron', 'package.json'), join(nm, 'electron', 'package.json'));
  copyFileSync(join(ROOT, 'node_modules', 'node-gyp', 'package.json'), join(nm, 'node-gyp', 'package.json'));
  // A node-gyp that must never run here: every refusal comes before it.
  writeFileSync(join(nm, 'node-gyp', 'bin', 'node-gyp.js'), "process.stderr.write('the fake node-gyp ran\\n'); process.exit(97);\n");
  const cp = spawnSync('/bin/cp', ['-Rc', join(ROOT, 'node_modules', 'better-sqlite3'), join(nm, 'better-sqlite3')], { encoding: 'utf8' });
  if (cp.status !== 0) {
    cannot('build-checker refusals', `could not clone the package: ${String(cp.stderr).slice(0, 200)}`);
    return;
  }
  const pkgDir = join(nm, 'better-sqlite3');
  const electronVersion = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'electron', 'package.json'), 'utf8')).version;
  const otherHeaders = join(ctx.out, 'other-headers');
  rmSync(otherHeaders, { recursive: true, force: true });
  mkdirSync(join(otherHeaders, '0.0.1', 'include', 'node'), { recursive: true });
  writeFileSync(join(otherHeaders, '0.0.1', 'include', 'node', 'node_api.h'), '/* not this Electron */\n');
  writeFileSync(join(otherHeaders, '0.0.1', 'installVersion'), '11\n');
  const emptyDevdir = join(ctx.out, 'empty-devdir');
  mkdirSync(emptyDevdir, { recursive: true });
  const notMine = join(ctx.out, 'not-mine');
  mkdirSync(notMine, { recursive: true });
  writeFileSync(join(notMine, 'keep.txt'), 'this folder was not made by build-checker\n');
  const run = (args) => {
    const r = spawnSync(process.execPath, [join(fake, 'build', 'diagnostic', 'build-checker.mjs'), ...args], { encoding: 'utf8', env: ctx.buildEnv, timeout: 120_000 });
    return { status: r.status, err: String(r.stderr ?? ''), out: String(r.stdout ?? '') };
  };
  const outA = join(ctx.out, 'refusal-out');
  const base = ['--variant', 'test', '--out', outA, '--devdir', emptyDevdir];
  /** Swap one file's text for the run, then put the original back byte for byte. */
  const withFile = (rel, change, fn) => {
    const file = join(pkgDir, rel);
    const original = readFileSync(file);
    writeFileSync(file, change(original.toString('latin1')), 'latin1');
    try {
      return fn();
    } finally {
      writeFileSync(file, original);
    }
  };
  const cases = [
    ['the unmutated copy passes every package check and stops at the headers (the control)', () => run(base), (r) => r.status === 2 && /does not hold Electron/.test(r.err)],
    ['another better-sqlite3 version', () => withFile('package.json', (t) => t.replace('"version": "13.0.3"', '"version": "13.0.4"'), () => run(base)), (r) => r.status === 2 && /is 13\.0\.4/.test(r.err)],
    ['one byte of the amalgamation', () => withFile('deps/sqlite3/sqlite3.c', (t) => `${t} `, () => run(base)), (r) => r.status === 2 && /hashes to [0-9a-f]{64}, not the pinned/.test(r.err)],
    ['an anchor doubled', () => withFile('src/objects/statement-iterator.cpp', (t) => `${t}\n/*\n\tdb_state->busy = true;\n\tif (!logged) {\n*/\n`, () => run(base)), (r) => r.status === 2 && /occurs 2 times/.test(r.err)],
    ['an anchor missing', () => withFile('src/util/query-macros.cpp', (t) => t.replace('STATEMENT_START_LOGIC(x, y);', 'STATEMENT_START_LOGIC(x,y);'), () => run(base)), (r) => r.status === 2 && /Statement::start anchor occurs 0 times/.test(r.err)],
    ['the close anchor doubled in database.cpp', () => withFile('src/objects/database.cpp', (t) => `${t}\n/*\n\t\tbackups.clear();\n\t\tint status = sqlite3_close(db_handle);\n*/\n`, () => run(base)), (r) => r.status === 2 && /Database::close anchor occurs 2 times/.test(r.err)],
    [`headers for another Electron, not ${electronVersion}`, () => run(['--variant', 'test', '--out', outA, '--devdir', otherHeaders]), (r) => r.status === 2 && new RegExp(`Electron ${electronVersion.replaceAll('.', '\\.')}'s headers`).test(r.err)],
    ['no --devdir', () => run(['--variant', 'test', '--out', outA]), (r) => r.status === 2 && /--devdir is required/.test(r.err)],
    ['--define on the diagnostic variant', () => run(['--variant', 'diagnostic', '--out', outA, '--devdir', emptyDevdir, '--define', 'TCHK_ABLATE_OWNER']), (r) => r.status === 2 && /--variant test alone/.test(r.err)],
    ['a --define that is not an ablation', () => run([...base, '--define', 'TCHK_PLANT']), (r) => r.status === 2 && /not one of the checker's ablations/.test(r.err)],
    ['--out inside node_modules', () => run(['--variant', 'test', '--out', join(nm, 'zz'), '--devdir', ctx.devdir]), (r) => r.status === 2 && /--out .* is inside a node_modules folder/.test(r.err)],
    ['--json inside --out', () => run(['--variant', 'test', '--out', outA, '--devdir', ctx.devdir, '--json', join(outA, 'x.json')]), (r) => r.status === 2 && /--json must name a file outside --out/.test(r.err)],
    ['an unknown flag', () => run([...base, '--publish']), (r) => r.status === 2 && /unknown argument/.test(r.err)]
  ];
  const clauses = [];
  for (const [what, act, ok] of cases) {
    const r = act();
    clauses.push([`${what}: ${r.status === 2 ? 'refused' : `exit ${String(r.status)}`}`, ok(r) && !/the fake node-gyp ran/.test(r.err)]);
  }
  // The not-mine folder, asked with headers present so only the folder can refuse it.
  {
    const r = run(['--variant', 'test', '--out', notMine, '--devdir', ctx.devdir]);
    clauses.push(['--out a folder it did not make: refused, and its file is still there', r.status === 2 && /was not made by this script/.test(r.err) && existsSync(join(notMine, 'keep.txt'))]);
  }
  clauses.push(['no refusal left a copy behind', !existsSync(outA)]);
  record('build-checker.mjs refuses: another version, a changed amalgamation, a doubled or missing anchor, other headers, no devdir, a stray define, node_modules, a folder not its own', clauses);
  rmSync(fake, { recursive: true, force: true });
}

/** Path, size and mtime of every file under `dir`, sorted. */
function listing(dir) {
  const rows = [];
  const walk = (at, rel) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const p = join(at, e.name);
      const r = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p, r);
      else {
        const s = statSync(p, { throwIfNoEntry: false });
        rows.push(`${r} ${s ? `${s.size} ${s.mtimeMs}` : 'gone'}`);
      }
    }
  };
  walk(dir, '');
  return rows.sort();
}

/**
 * His crash reports, by NAME and mtime only (never opened); null when the
 * folder cannot be read. macOS writes them under the account's own home
 * whatever HOME says, so that is where they are read, as build/quit-smoke.mjs
 * reads them.
 */
function reportsListing() {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  const rows = [];
  for (const sub of ['', 'Retired']) {
    let names;
    try {
      names = readdirSync(join(dir, sub));
    } catch {
      if (sub === '') return null;
      continue;
    }
    for (const n of names) {
      const s = statSync(join(dir, sub, n), { throwIfNoEntry: false });
      if (s?.isFile()) rows.push(`${String(Math.floor(s.mtimeMs / 1000))} ${sub === '' ? '' : `${sub}/`}${n}`);
    }
  }
  return rows.sort();
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
  const outArg = resolve(args.out);
  if (outArg.split(sep).includes('node_modules')) {
    process.stderr.write(`--out ${outArg} is inside a node_modules folder\n`);
    return 2;
  }
  mkdirSync(outArg, { recursive: true });
  const out = realpathSync(outArg);
  const devdir = resolve(args.devdir ?? (process.env.npm_config_devdir || join(homedir(), '.electron-gyp')));
  const ctx = {
    out,
    devdir,
    reuse: args.reuse,
    routeHome: join(out, 'arms'),
    childHome: join(out, 'home'),
    childTmp: join(out, 'tmp'),
    buildEnv: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: join(out, 'home'), TMPDIR: join(out, 'tmp'), HISTFILE: '/dev/null', SHELL: '/bin/sh' }
  };
  for (const d of [ctx.childHome, ctx.childTmp, join(out, 'arms')]) mkdirSync(d, { recursive: true });
  const t0 = Date.now();
  process.stdout.write(`checker self-test: out ${out}, devdir ${devdir}, node ${process.versions.node}\n`);
  const reportsBefore = reportsListing();
  const nmBefore = { bs3: listing(join(ROOT, 'node_modules', 'better-sqlite3')), gyp: listing(join(ROOT, 'node_modules', 'node-gyp')) };

  const test = build(ctx, 'test', 'test');
  if (!test.ok) {
    cannot('the test variant', `build-checker exit ${String(test.status)}: ${String(test.stderr ?? '').trim().split('\n').pop()}`);
    return finish(ctx, t0, reportsBefore, nmBefore, {});
  }
  gradeSection22(ctx, test);
  gradeAdditions(ctx, test);
  const caught = new Map();
  for (const rule of RULES) caught.set(rule.id, gradeRuleCaught(ctx, rule, test));
  /** One ablated build per define: two rules that share one (readable, readable-hash) share its build. */
  const ablatedBy = new Map();
  for (const rule of RULES) {
    if (!ablatedBy.has(rule.define)) ablatedBy.set(rule.define, build(ctx, `ablate-${rule.id}`, 'test', [rule.define]));
    const ablated = ablatedBy.get(rule.define);
    if (!ablated.ok) {
      cannot(`ablation ${rule.id}`, `build-checker exit ${String(ablated.status)}`);
      continue;
    }
    const withRule = caught.get(rule.id);
    const without = gradeRuleMissed(ctx, rule, ablated);
    record(
      `ablation ${rule.id} (-D${rule.define}): its plant ${rule.plant} is caught as ${rule.check} with the rule and ${rule.ablatedFaults ? 'faults the walk' : 'missed'} without it`,
      [...withRule.clauses.map(([w, ok]) => [`with the rule: ${w}`, ok]), ...without.clauses.map(([w, ok]) => [`without it: ${w}`, ok])],
      { sha256: ablated.line?.sha256, ms: withRule.rd.ms + without.rd.ms }
    );
  }
  const diag = build(ctx, 'diag', 'diagnostic');
  const plain = build(ctx, 'plain', 'plain');
  if (!diag.ok || !plain.ok) {
    cannot('the diagnostic and plain variants', `build-checker exit ${String(diag.status ?? plain.status)}`);
  } else {
    gradeDiagnostic(ctx, diag, test, plain);
    const builds = [test, diag, plain, ...[...ablatedBy.values()].map((b) => ({ out: b.out }))];
    record('every build is a copy that can only load what was built: no prebuilds/ folder, the built module in build/Release', [
      ['no copy keeps the unchecked prebuild', builds.every((b) => !existsSync(join(b.out, 'prebuilds')))],
      ['every copy holds its built module', builds.every((b) => existsSync(join(b.out, 'build', 'Release', 'better_sqlite3.node')))]
    ]);
  }
  gradeRefusals(ctx);
  return finish(ctx, t0, reportsBefore, nmBefore, { test: test.line, diag: diag?.line ?? null, plain: plain?.line ?? null });
}

function finish(ctx, t0, reportsBefore, nmBefore, builds) {
  const nmAfter = { bs3: listing(join(ROOT, 'node_modules', 'better-sqlite3')), gyp: listing(join(ROOT, 'node_modules', 'node-gyp')) };
  record('nothing under node_modules moved (better-sqlite3 and node-gyp, by path, size and mtime)', [
    ['node_modules/better-sqlite3 unchanged', J(nmBefore.bs3) === J(nmAfter.bs3)],
    ['node_modules/node-gyp unchanged', J(nmBefore.gyp) === J(nmAfter.gyp)]
  ]);
  const reportsAfter = reportsListing();
  const before = new Set(reportsBefore ?? []);
  const added = reportsAfter === null ? [] : reportsAfter.filter((r) => !before.has(r));
  if (reportsBefore === null || reportsAfter === null) {
    process.stdout.write('crash reports: the folder could not be listed (no ~/Library/Logs/DiagnosticReports for this account)\n');
  } else {
    process.stdout.write(`crash reports: ${reportsBefore.length} before, ${reportsAfter.length} after, added ${J(added)}\n`);
    record('no crash report named for node was added by this run\'s five deliberate faults', [['none added for node', !added.some((r) => / (Retired\/)?node[-_.]/i.test(r))]]);
  }
  const passed = results.filter((r) => r.ok === true).length;
  const failed = results.filter((r) => r.ok === false).length;
  const summary = {
    passed,
    failed,
    unreadable: couldNotRun,
    seconds: Math.round((Date.now() - t0) / 1000),
    builds: Object.fromEntries(Object.entries(builds).map(([k, v]) => [k, v === null ? null : { sha256: v.sha256, size: v.size, uuid: v.uuid }])),
    results: results.map(({ name, ok, failed: f }) => ({ name, ok, failed: f }))
  };
  for (const [k, v] of Object.entries(summary.builds)) if (v !== null) process.stdout.write(`module ${k}: ${v.sha256} (${String(v.size)} bytes, UUID ${String(v.uuid)})\n`);
  process.stdout.write(`checker self-test: ${passed} passed, ${failed} failed, ${couldNotRun} unreadable, ${summary.seconds} s\n`);
  const jsonArg = process.argv.indexOf('--json');
  if (jsonArg !== -1 && process.argv[jsonArg + 1] !== undefined) writeFileSync(resolve(process.argv[jsonArg + 1]), `${J(summary)}\n`);
  if (couldNotRun > 0) return 2;
  return failed > 0 ? 1 : 0;
}

if (process.argv.includes('--arm-child')) {
  runChild();
} else if (process.argv[1] !== undefined && resolve(process.argv[1]) === SELF) {
  process.exitCode = main();
}
