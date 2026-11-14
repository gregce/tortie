#!/usr/bin/env node
/**
 * build-checker.mjs. Builds better-sqlite3 13.0.3 with Tortie's page-cache
 * checker for Electron's ABI (Phase 364, build/p364/SPEC.md §4.1, D1, D10).
 *
 *   node build/diagnostic/build-checker.mjs --variant diagnostic|test|plain
 *        --out <dir> --devdir <dir> [--define TCHK_ABLATE_<RULE>]...
 *        [--json <file>] [--fetch-headers]
 *
 * THE SAME COMMAND ON THIS MAC AND IN THE RELEASE LANE. What it does, in order:
 *
 *  1. Refuses unless node_modules/better-sqlite3 is 13.0.3, its
 *     deps/sqlite3/sqlite3.c hashes to the pinned sha256 (SQLite 3.53.4), and
 *     each of the four breadcrumb anchors occurs exactly once.
 *  2. Refuses unless `--devdir` holds Electron's headers for the version in
 *     node_modules/electron/package.json (`<version>/include/node/node_api.h`
 *     and an `installVersion` node-gyp accepts). With `--fetch-headers`, which
 *     the lane alone passes, node-gyp may fetch them from electronjs.org into
 *     that devdir and nowhere else. Without it, node-gyp's proxy points at a
 *     closed loopback port, so no request can leave the machine.
 *  3. `cp -Rc`s the package into `--out` (never edited in place), removing the
 *     copy's stale `build/` and its `prebuilds/`, so a `require()` of the copy
 *     can only ever load what this script built.
 *  4. Appends build/diagnostic/sqlite-checker.c to the COPY's amalgamation:
 *     `#define TCHK_PLANT 1` first for `test` (and one `#define <NAME> 1` per
 *     `--define`, accepted with `test` alone), nothing first for
 *     `diagnostic`, and nothing at all for `plain` (the pipeline with no
 *     checker, the control).
 *  5. Patches the four breadcrumbs into the copy's C++ (D1), each anchor
 *     exactly once.
 *  6. Runs node-gyp from node_modules with HOME, TMPDIR and npm's cache in a
 *     folder it makes beside `--out` (`<out>.gyp-cache`), Python's bytecode
 *     writes off, so nothing is written under node_modules.
 *  7. Reads the built module back: size, sha256, Mach-O UUID, the
 *     amalgamation's hash before and after, and D10's three reads (no
 *     `P358ADV`, no `[p358adv-`, no `sigaction` import in a diagnostic
 *     module; all three in a test module). It prints ONE JSON line, also
 *     written to `--json` when given.
 *
 * It writes only under `--out`, the cache folder beside it and the `--json`
 * file, never under any node_modules, and it refuses to remove a folder it did
 * not make. It starts node-gyp (and the compiler under it) and `cp`, each
 * waited for. Exit 0 built, 1 the build or a read-back failed, 2 refused.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** The pinned package and its bundled SQLite (SPEC §2.1). */
export const BETTER_SQLITE3_VERSION = '13.0.3';
export const SQLITE_VERSION = '3.53.4';
export const AMALGAMATION_SHA256 = '6a2805f8c1ef020a7086e62258519323cf98b219e9fe87a42065d916cfebaefc';
export const VARIANTS = Object.freeze(['diagnostic', 'test', 'plain']);
/** The test variant's compile-time ablations, one clause each (sqlite-checker.c). */
export const ABLATIONS = Object.freeze([
  'TCHK_ABLATE_OWNER',
  'TCHK_ABLATE_LRU_LINK',
  'TCHK_ABLATE_HASH_CHAIN',
  'TCHK_ABLATE_COUNT',
  'TCHK_ABLATE_GUARD',
  'TCHK_ABLATE_PAGE_NUMBER',
  'TCHK_ABLATE_CLOSE_WALK',
  'TCHK_ABLATE_READABLE'
]);
/** Where node-gyp may fetch Electron's headers, with --fetch-headers alone. */
export const HEADERS_URL = 'https://electronjs.org/headers';
/** node-gyp's proxy without --fetch-headers: a closed loopback port. */
const NO_NETWORK_PROXY = 'http://127.0.0.1:9';
/** The breadcrumbs' declaration, put first in every C++ file that calls one. */
const EXTERN = 'extern "C" void p358adv_on_entry(const char*, sqlite3*, sqlite3_stmt*);\n';
/**
 * The four breadcrumbs (D1), each an anchor that must occur exactly once in
 * the pinned sources. The close anchor carries `backups.clear();` because
 * `sqlite3_close(db_handle)` occurs three times in database.cpp.
 */
export const ANCHORS = Object.freeze([
  Object.freeze({
    op: 'StatementIterator::next',
    file: 'src/objects/statement-iterator.cpp',
    anchor: '\tdb_state->busy = true;\n\tif (!logged) {',
    replacement: '\tp358adv_on_entry("StatementIterator::next", NULL, handle);\n\tdb_state->busy = true;\n\tif (!logged) {'
  }),
  Object.freeze({
    op: 'Database::close',
    file: 'src/objects/database.cpp',
    anchor: '\t\tbackups.clear();\n\t\tint status = sqlite3_close(db_handle);',
    replacement: '\t\tbackups.clear();\n\t\tp358adv_on_entry("Database::close", db_handle, NULL);\n\t\tint status = sqlite3_close(db_handle);'
  }),
  Object.freeze({
    op: 'Statement::start',
    file: 'src/util/query-macros.cpp',
    anchor: '\tSTATEMENT_START_LOGIC(x, y);                                               \\\n',
    replacement:
      '\tSTATEMENT_START_LOGIC(x, y);                                               \\\n' +
      '\tp358adv_on_entry("Statement::start", NULL, handle);                           \\\n'
  }),
  Object.freeze({
    op: 'Database::exec',
    file: 'src/objects/database.cpp',
    anchor: '\tdb->busy = true;\n\n\tUseIsolate;\n\tstd::string utf8 = source.Utf8Value();',
    replacement: '\tdb->busy = true;\n\tp358adv_on_entry("Database::exec", db->db_handle, NULL);\n\n\tUseIsolate;\n\tstd::string utf8 = source.Utf8Value();'
  })
]);
/** The marker this script leaves in every folder it makes, so it never removes one it did not. */
const MARKER = '.tortie-build-checker';

const USAGE =
  'usage: node build/diagnostic/build-checker.mjs --variant diagnostic|test|plain --out <dir> --devdir <dir>\n' +
  '         [--define TCHK_ABLATE_<RULE>]... [--json <file>] [--fetch-headers]';

class Refusal extends Error {}
const refuse = (why) => {
  throw new Refusal(why);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const countOf = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);

/** The flags, strictly: an unknown flag, a missing value or a repeat of a one-value flag refuses. */
export function parseArgs(argv) {
  const out = { variant: null, out: null, devdir: null, json: null, defines: [], fetchHeaders: false, help: false };
  const one = new Set(['--variant', '--out', '--devdir', '--json']);
  for (let i = 0; i < argv.length; i += 1) {
    let flag = argv[i];
    let value = null;
    const eq = flag.indexOf('=');
    if (flag.startsWith('--') && eq !== -1) {
      value = flag.slice(eq + 1);
      flag = flag.slice(0, eq);
    }
    if (flag === '--help' || flag === '-h') {
      out.help = true;
      continue;
    }
    if (flag === '--fetch-headers') {
      if (value !== null) refuse('--fetch-headers takes no value');
      out.fetchHeaders = true;
      continue;
    }
    if (!one.has(flag) && flag !== '--define') refuse(`unknown argument ${JSON.stringify(argv[i])}`);
    if (value === null) {
      i += 1;
      if (i >= argv.length || argv[i].startsWith('--')) refuse(`${flag} needs a value`);
      value = argv[i];
    }
    if (value === '') refuse(`${flag} needs a value`);
    if (flag === '--define') {
      out.defines.push(value);
      continue;
    }
    const key = flag.slice(2);
    if (out[key] !== null) refuse(`${flag} was given twice`);
    out[key] = value;
  }
  return out;
}

/** True when `path` sits inside a node_modules folder, at any depth. */
const underNodeModules = (path) => resolve(path).split(sep).includes('node_modules');
/** True when `inner` is `outer` or inside it. */
const within = (inner, outer) => {
  const rel = relative(resolve(outer), resolve(inner));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/** A folder this script may (re)make: absent, empty, or carrying its marker. */
function claimFolder(dir, what) {
  if (!existsSync(dir)) return;
  if (!statSync(dir).isDirectory()) refuse(`${what} ${dir} exists and is not a folder`);
  const names = readdirSync(dir);
  if (names.length > 0 && !names.includes(MARKER)) {
    refuse(`${what} ${dir} is not empty and was not made by this script; name an empty or new folder`);
  }
  rmSync(dir, { recursive: true, force: true });
}

/** The Mach-O LC_UUID of a thin 64-bit image, as `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`, or null. */
export function machoUuid(bytes) {
  if (bytes.length < 32 || bytes.readUInt32LE(0) !== 0xfeedfacf) return null;
  const ncmds = bytes.readUInt32LE(16);
  let off = 32;
  for (let i = 0; i < ncmds && off + 8 <= bytes.length; i += 1) {
    const cmd = bytes.readUInt32LE(off);
    const size = bytes.readUInt32LE(off + 4);
    if (cmd === 0x1b && off + 24 <= bytes.length) {
      const h = bytes.subarray(off + 8, off + 24).toString('hex').toUpperCase();
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    if (size < 8) return null;
    off += size;
  }
  return null;
}

/** D10's three reads of a built module, by its bytes. */
export function d10Reads(bytes) {
  const latin = bytes.toString('latin1');
  return {
    p358advEnv: countOf(latin, 'P358ADV'),
    p358advLines: countOf(latin, '[p358adv-'),
    importsSigaction: latin.includes('\0_sigaction\0'),
    namesTortieChecker: latin.includes('TORTIE_CHECKER'),
    hasEntryPoint: latin.includes('\0_p358adv_on_entry\0')
  };
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.variant === null || !VARIANTS.includes(args.variant)) refuse(`--variant must be one of ${VARIANTS.join(', ')}\n${USAGE}`);
  if (args.out === null) refuse(`--out is required\n${USAGE}`);
  if (args.devdir === null) refuse(`--devdir is required: Electron's headers are never fetched into a home by default\n${USAGE}`);
  for (const name of args.defines) {
    if (args.variant !== 'test') refuse(`--define is accepted with --variant test alone (got ${name} with ${args.variant})`);
    if (!ABLATIONS.includes(name)) refuse(`--define ${name} is not one of the checker's ablations: ${ABLATIONS.join(', ')}`);
  }
  if (new Set(args.defines).size !== args.defines.length) refuse('--define names the same ablation twice');

  // 1. The pinned package, by version, by the amalgamation's hash, by its anchors.
  const src = join(ROOT, 'node_modules', 'better-sqlite3');
  const pkgFile = join(src, 'package.json');
  if (!existsSync(pkgFile)) refuse(`${src} is missing`);
  const version = JSON.parse(readFileSync(pkgFile, 'utf8')).version;
  if (version !== BETTER_SQLITE3_VERSION) refuse(`node_modules/better-sqlite3 is ${version}; this checker is written for ${BETTER_SQLITE3_VERSION}`);
  const amalgamationBefore = sha256(readFileSync(join(src, 'deps', 'sqlite3', 'sqlite3.c')));
  if (amalgamationBefore !== AMALGAMATION_SHA256) {
    refuse(`deps/sqlite3/sqlite3.c hashes to ${amalgamationBefore}, not the pinned ${AMALGAMATION_SHA256} (SQLite ${SQLITE_VERSION})`);
  }
  for (const a of ANCHORS) {
    const n = countOf(readFileSync(join(src, a.file), 'utf8'), a.anchor);
    if (n !== 1) refuse(`${a.file}: the ${a.op} anchor occurs ${n} times; it must occur exactly once`);
  }
  const checkerFile = join(HERE, 'sqlite-checker.c');
  const checker = readFileSync(checkerFile, 'utf8');

  // 2. Electron's version and its headers.
  const electronPkg = join(ROOT, 'node_modules', 'electron', 'package.json');
  if (!existsSync(electronPkg)) refuse(`${electronPkg} is missing`);
  const target = JSON.parse(readFileSync(electronPkg, 'utf8')).version;
  if (typeof target !== 'string' || !/^\d+\.\d+\.\d+$/.test(target)) refuse(`node_modules/electron's version reads ${JSON.stringify(target)}`);
  const gypPkg = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'node-gyp', 'package.json'), 'utf8'));
  const gyp = join(ROOT, 'node_modules', 'node-gyp', 'bin', 'node-gyp.js');
  if (!existsSync(gyp)) refuse(`${gyp} is missing`);
  const devdir = resolve(args.devdir);
  if (underNodeModules(devdir)) refuse(`--devdir ${devdir} is inside a node_modules folder`);
  const headers = join(devdir, target, 'include', 'node', 'node_api.h');
  const installVersionFile = join(devdir, target, 'installVersion');
  const installVersion = existsSync(installVersionFile) ? Number.parseInt(readFileSync(installVersionFile, 'ascii'), 10) || 0 : 0;
  const headersOnDisk = existsSync(headers) && installVersion >= Number(gypPkg.installVersion ?? 0);
  if (!headersOnDisk && !args.fetchHeaders) {
    refuse(
      `--devdir ${devdir} does not hold Electron ${target}'s headers ` +
        `(${relative(devdir, headers)} and an installVersion of at least ${String(gypPkg.installVersion)}); ` +
        'copy them there, or pass --fetch-headers (the release lane alone)'
    );
  }

  // 3. The output folder and the cache folder beside it.
  const out = resolve(args.out);
  const cache = join(dirname(out), `${basename(out)}.gyp-cache`);
  for (const [what, dir] of [['--out', out], ['the cache folder', cache]]) {
    if (underNodeModules(dir)) refuse(`${what} ${dir} is inside a node_modules folder`);
    if (dir === sep || within(ROOT, dir)) refuse(`${what} ${dir} would hold the checkout itself`);
    if (within(dir, src)) refuse(`${what} ${dir} is inside the package it copies`);
  }
  const jsonFile = args.json === null ? null : resolve(args.json);
  if (jsonFile !== null && underNodeModules(jsonFile)) refuse(`--json ${jsonFile} is inside a node_modules folder`);
  if (jsonFile !== null && (within(jsonFile, out) || within(jsonFile, cache))) refuse('--json must name a file outside --out and its cache folder');
  claimFolder(out, '--out');
  claimFolder(cache, 'the cache folder');

  const t0 = Date.now();
  mkdirSync(dirname(out), { recursive: true });
  let copiedWith = 'cp -Rc';
  let cp = spawnSync('/bin/cp', ['-Rc', src, out], { encoding: 'utf8' });
  if (cp.status !== 0) {
    rmSync(out, { recursive: true, force: true });
    copiedWith = 'cp -R';
    cp = spawnSync('/bin/cp', ['-R', src, out], { encoding: 'utf8' });
  }
  if (cp.status !== 0) throw new Error(`${copiedWith} failed: ${String(cp.stderr).slice(0, 400)}`);
  writeFileSync(join(out, MARKER), `${JSON.stringify({ variant: args.variant, defines: args.defines })}\n`);
  rmSync(join(out, 'build'), { recursive: true, force: true });
  rmSync(join(out, 'prebuilds'), { recursive: true, force: true });
  for (const sub of ['home', 'npm-cache', 'tmp']) mkdirSync(join(cache, sub), { recursive: true });
  writeFileSync(join(cache, MARKER), `${JSON.stringify({ for: out })}\n`);

  // 4. The checker, appended to the COPY's amalgamation.
  const sqlite = join(out, 'deps', 'sqlite3', 'sqlite3.c');
  if (args.variant !== 'plain') {
    const first = [
      '',
      `/* Tortie Phase 364: build/diagnostic/sqlite-checker.c, the ${args.variant} variant (build/diagnostic/build-checker.mjs). */`,
      ...(args.variant === 'test' ? ['#define TCHK_PLANT 1', ...args.defines.map((d) => `#define ${d} 1`)] : []),
      ''
    ].join('\n');
    appendFileSync(sqlite, `${first}${checker}\n`);
  }

  // 5. The four breadcrumbs, each exactly once, in the copy.
  if (args.variant !== 'plain') {
    for (const a of ANCHORS) {
      const file = join(out, a.file);
      let text = readFileSync(file, 'utf8');
      const n = countOf(text, a.anchor);
      if (n !== 1) throw new Error(`${a.file}: the ${a.op} anchor occurs ${n} times in the copy`);
      text = text.replace(a.anchor, () => a.replacement);
      if (!text.startsWith(EXTERN)) text = EXTERN + text;
      writeFileSync(file, text);
    }
  }
  const amalgamationAfter = sha256(readFileSync(sqlite));

  // 6. node-gyp, every cache beside --out, nothing written under node_modules.
  const env = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: join(cache, 'home'),
    TMPDIR: join(cache, 'tmp'),
    npm_config_cache: join(cache, 'npm-cache'),
    npm_config_devdir: devdir,
    npm_config_update_notifier: 'false',
    PYTHONDONTWRITEBYTECODE: '1',
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    ...(args.fetchHeaders ? {} : { npm_config_proxy: NO_NETWORK_PROXY, npm_config_https_proxy: NO_NETWORK_PROXY })
  };
  const gypArgs = [
    gyp,
    'rebuild',
    '--release',
    `--target=${target}`,
    '--arch=arm64',
    `--dist-url=${HEADERS_URL}`,
    `--devdir=${devdir}`,
    '--',
    '-Dforce_build=1'
  ];
  const r = spawnSync(process.execPath, gypArgs, { cwd: out, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60_000 });
  const log = join(cache, 'node-gyp.log');
  writeFileSync(log, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  if (r.status !== 0) {
    process.stderr.write(`${String(r.stderr ?? '').slice(-3000)}\n`);
    throw new Error(`node-gyp failed (exit ${String(r.status)}, signal ${String(r.signal)}); the whole log is ${log}`);
  }

  // 7. The module, read back.
  const node = join(out, 'build', 'Release', 'better_sqlite3.node');
  if (!existsSync(node)) throw new Error(`node-gyp exited 0 and ${node} is not there`);
  const bytes = readFileSync(node);
  const reads = d10Reads(bytes);
  const problems = [];
  if (args.variant === 'diagnostic') {
    if (reads.p358advEnv > 0) problems.push(`a diagnostic module holds ${reads.p358advEnv} P358ADV string(s)`);
    if (reads.p358advLines > 0) problems.push(`a diagnostic module holds ${reads.p358advLines} [p358adv- line(s)`);
    if (reads.importsSigaction) problems.push('a diagnostic module imports sigaction');
    if (!reads.namesTortieChecker || !reads.hasEntryPoint) problems.push('a diagnostic module without the checker');
  } else if (args.variant === 'test') {
    if (reads.p358advEnv === 0 || reads.p358advLines === 0 || !reads.importsSigaction) problems.push('a test module without the plant');
  } else if (reads.hasEntryPoint || reads.namesTortieChecker) {
    problems.push('a plain module holds the checker');
  }
  const line = {
    variant: args.variant,
    defines: args.defines,
    betterSqlite3: version,
    sqlite: SQLITE_VERSION,
    electron: target,
    nodeGyp: gypPkg.version,
    arch: 'arm64',
    headers: headersOnDisk ? 'on disk' : 'fetched',
    out,
    node,
    size: bytes.length,
    sha256: sha256(bytes),
    uuid: machoUuid(bytes),
    amalgamationBefore,
    amalgamationAfter,
    checkerSha256: args.variant === 'plain' ? null : sha256(Buffer.from(checker, 'utf8')),
    reads,
    copiedWith,
    ms: Date.now() - t0
  };
  const text = JSON.stringify(line);
  process.stdout.write(`${text}\n`);
  if (jsonFile !== null) {
    mkdirSync(dirname(jsonFile), { recursive: true });
    writeFileSync(jsonFile, `${text}\n`);
  }
  if (problems.length > 0) {
    process.stderr.write(`build-checker: ${problems.join('; ')}\n`);
    return 1;
  }
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof Refusal) {
      process.stderr.write(`build-checker: refused: ${err.message}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`build-checker: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  }
}
