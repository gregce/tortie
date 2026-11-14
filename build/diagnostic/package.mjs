#!/usr/bin/env node
/**
 * build/diagnostic/package.mjs — the diagnostic Tortie, packaged (Phase 364,
 * build/p364/SPEC.md §4.4 and D10 to D14).
 *
 * The diagnostic Tortie is the normal app with three differences: its
 * better-sqlite3 is the checking build (build/diagnostic/build-checker.mjs
 * --variant diagnostic), its main bundle is built with TORTIE_DIAGNOSTIC=1,
 * and About says "Diagnostic" after the commit. Same bundle id, same data
 * folder. It is never published: it carries no update feed file and its
 * artifact name says -diagnostic-.
 *
 *   node build/diagnostic/package.mjs --checker <better_sqlite3.node>
 *        [--dir] [--git <checkout>] [--json <file>] [--notarize]
 *   node build/diagnostic/package.mjs --self-test
 *
 * In order, stopping at the first refusal:
 *
 *  1. WHERE IT RUNS. It builds out/ and release/ in place, so off the release
 *     runner it runs only in a copy of a checkout with .git removed
 *     (`cp -Rc <checkout> <copy> && rm -rf <copy>/.git`). A copy of a
 *     worktree keeps a .git FILE that names the worktree's own index, and the
 *     build stamp's `git status` would write there.
 *  2. --notarize IS THE RELEASE LANE'S (D13). On the runner it needs the three
 *     notarization values. Off the runner it is refused unless
 *     CSC_IDENTITY_AUTO_DISCOVERY=false and no APPLE_* is set, which is a dry
 *     run that cannot sign or notarize.
 *  3. THE MODULE (D10). Refused when it is not an arm64 Mach-O, when its bytes
 *     hold P358ADV or [p358adv-, when `nm -u` lists sigaction, or when it
 *     names neither TORTIE_CHECKER nor diagnostic.pcache. The shipped prebuild
 *     passes the D10 reads, and the last clause is what refuses it.
 *  4. `TORTIE_DIAGNOSTIC=1 electron-vite build`, then the package script's
 *     read-only checks.
 *  5. electron-builder --mac <dmg | --dir> --arm64 --publish never --config
 *     <a one-off JSON file under the temporary folder, removed after>. The
 *     file extends electron-builder.yml and sets exactly four things:
 *     afterPack build/diagnostic/after-pack.cjs, publish null, an
 *     artifactName with -diagnostic- in it, and mac.identity null (or, with
 *     --notarize, mac.notarize true). They go in a file, not on the command
 *     line, because electron-builder reads `-c.publish=null` as the STRING
 *     "null" (it turns "null" into null for mac.identity alone,
 *     electron-builder/out/builder.js:122-130), and a DMG build then looks
 *     for a publisher named "null" and stops. A --dir build never asks for a
 *     publisher (app-builder-lib/out/publish/PublishManager.js:83-87), which
 *     is why `-c.publish=null` passed the spec step's --dir prototype. Its env
 *     never holds GH_TOKEN, GITHUB_TOKEN, USE_HARD_LINKS or VITEST; without
 *     --notarize it holds no CSC_* or APPLE_* and sets
 *     CSC_IDENTITY_AUTO_DISCOVERY=false. A log naming a Developer ID is
 *     refused everywhere but the release runner.
 *  6. THE READ-BACK. The packed module is the checker by sha256; there is no
 *     Contents/Resources/app-update.yml, no latest*.yml and no .blockmap under
 *     release/ (a DMG build's blockmap, an update feed's differential data, is
 *     removed first: the fix round);
 *     the bundle id is electron-builder.yml's appId; app.asar's
 *     out/main/index.js carries the " Diagnostic" stamp and names
 *     TORTIE_CHECKER; the checkout's own prebuild did not move; a DMG's name
 *     says -diagnostic-.
 *  7. GOING BACK (D14). The session list format this build writes, against
 *     the newest v* release's, read with git from --git (or from this
 *     checkout on the runner, where the pair is required). When they differ,
 *     one line says whether that release still opens the file.
 *  8. ONE JSON line on stdout. Everything else goes to stderr.
 *
 * Exit 0 when every step passed, 1 on a refusal (with {"ok":false,...} on
 * stdout), 2 on a usage error.
 *
 * --self-test asks every rule above that is a function over fixtures and a
 * scratch tree, then asks each again with its clause taken out, and
 * build/diagnostic/after-pack.cjs's refusals over mutated copies of its own
 * source. It spawns nothing.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { PLANT_STRINGS } = require('./after-pack.cjs');

const TAG = '[package-diagnostic]';

/** The hook electron-builder is told to run, relative to the checkout. */
export const AFTER_PACK = 'build/diagnostic/after-pack.cjs';
/** The artifact name. electron-builder fills the ${...} itself. */
export const ARTIFACT_NAME = '${productName}-${version}-diagnostic-${arch}.${ext}';
/** The package script's read-only checks, in its order (package.json "package"). */
export const READ_ONLY_CHECKS = [
  'build/check-tmux-pin.cjs',
  'build/assert-bundle-refusals.mjs',
  'build/assert-preview-containment.mjs',
  'build/assert-css-order.mjs'
];
/** Names only a checking build carries: the handshake variable (D7) and the event (D6). */
export const CHECKER_NAMES = ['TORTIE_CHECKER', 'diagnostic.pcache'];
/** The three values notarization reads on the runner (electron-builder's Apple ID set). */
export const NOTARY_VALUES = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
/** Never handed to a child: no step here publishes, and these two change how files are packed. */
export const ALWAYS_DROPPED = ['GH_TOKEN', 'GITHUB_TOKEN', 'USE_HARD_LINKS', 'VITEST'];
/** The checkout's prebuild, which nothing here may write. */
const SOURCE_PREBUILD = join('node_modules', 'better-sqlite3', 'prebuilds', 'darwin-arm64.node');
/** The two files that decide the session list's format (SPEC §0.1 item 10). */
const SCHEMA_FILES = ['src/main/manifest/schema.ts', 'src/main/db/schema-version.ts'];
const STAMP = /"((?:[0-9a-f]{7,40}(?:-dirty)?|dev) Diagnostic)"/;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// ---------------------------------------------------------------------------
// The rules, each a list of named clauses so the self-test can take one out.
// ---------------------------------------------------------------------------

/** Step 1. Off the runner, a checkout's own folder is refused. */
export const PLACE_CLAUSES = [
  {
    id: 'git-off-runner',
    refuse: ({ root, onRunner }) =>
      !onRunner && lstatSync(join(root, '.git'), { throwIfNoEntry: false }) !== undefined
        ? `${root} holds .git. This script builds out/ and release/ in place, so off the release ` +
          'runner it runs in a copy of the checkout with .git removed ' +
          '(cp -Rc <checkout> <copy> && rm -rf <copy>/.git), and --git <checkout> reads the release side.'
        : null
  }
];

/** Step 2. --notarize signs, and only the release runner signs. */
export const NOTARIZE_CLAUSES = [
  {
    id: 'notarize-off-runner-can-sign',
    refuse: ({ env, notarize, onRunner }) =>
      notarize && !onRunner && env.CSC_IDENTITY_AUTO_DISCOVERY !== 'false'
        ? '--notarize signs with a keychain identity. It is the release lane\'s flag; off the runner it ' +
          'runs only as a dry run, with CSC_IDENTITY_AUTO_DISCOVERY=false.'
        : null
  },
  {
    id: 'notarize-off-runner-has-apple',
    refuse: ({ env, notarize, onRunner }) => {
      if (!notarize || onRunner) return null;
      const set = Object.keys(env).filter((k) => k.startsWith('APPLE_') && env[k]);
      return set.length > 0 ? `a dry run of --notarize carries no notarization value, and ${set.join(', ')} is set.` : null;
    }
  },
  {
    id: 'notarize-on-runner-missing',
    refuse: ({ env, notarize, onRunner }) => {
      if (!notarize || !onRunner) return null;
      const missing = NOTARY_VALUES.filter((k) => !env[k]);
      return missing.length > 0 ? `--notarize needs ${missing.join(', ')}.` : null;
    }
  }
];

/** Step 3, D10 and one more: the module is the DIAGNOSTIC checking build. */
export const CHECKER_CLAUSES = [
  {
    id: 'macho-arm64',
    refuse: ({ bytes }) =>
      bytes.length < 32 || bytes.readUInt32LE(0) !== 0xfeedfacf || bytes.readUInt32LE(4) !== 0x0100000c
        ? 'is not an arm64 Mach-O file.'
        : null
  },
  {
    id: 'plant-strings',
    refuse: ({ bytes }) => {
      const found = PLANT_STRINGS.filter((s) => bytes.includes(s));
      return found.length > 0 ? `holds ${found.join(' and ')}, so it is the test variant, which can plant damage.` : null;
    }
  },
  {
    id: 'sigaction',
    refuse: ({ imports }) =>
      imports.some((s) => s === '_sigaction' || s === 'sigaction')
        ? 'imports sigaction, so it carries the test variant\'s fault handler.'
        : null
  },
  {
    id: 'checker-names',
    refuse: ({ bytes }) => {
      const missing = CHECKER_NAMES.filter((s) => !bytes.includes(s));
      return missing.length > 0 ? `names no ${missing.join(' and ')}, so it is not a checking build.` : null;
    }
  }
];

/** Step 5's log. A Developer ID in an unsigned run's log is a defect, said at once. */
export const SIGNING_CLAUSES = [
  {
    id: 'developer-id-off-lane',
    refuse: ({ log, notarize, onRunner }) =>
      !(notarize && onRunner) && /Developer ID/.test(log)
        ? 'the package log names a Developer ID, so this run signed with a keychain identity. ' +
          'Report it, and remove release/.'
        : null
  }
];

/** Step 6. Every problem the read-back can name. */
export const READ_BACK_CLAUSES = [
  { id: 'app', problem: (r) => (r.app === null ? 'there is no packed app under release/mac-arm64.' : null) },
  {
    id: 'module',
    problem: (r) =>
      r.packedModule !== r.checker
        ? `the packed better-sqlite3 module reads ${String(r.packedModule)}, not the checker's ${r.checker}.`
        : null
  },
  {
    id: 'app-update-yml',
    problem: (r) => (r.appUpdateYml ? 'the app holds Contents/Resources/app-update.yml, so it could update itself.' : null)
  },
  {
    id: 'feed-yml',
    problem: (r) => (r.feedFiles.length > 0 ? `release/ holds ${r.feedFiles.join(', ')}, an update feed.` : null)
  },
  {
    id: 'blockmap',
    problem: (r) =>
      r.blockmaps.length > 0 ? `release/ holds ${r.blockmaps.join(', ')}, the differential data an update feed serves.` : null
  },
  {
    id: 'bundle-id',
    problem: (r) =>
      r.bundleId !== r.appId ? `the bundle id is ${String(r.bundleId)}, not electron-builder.yml's ${r.appId}.` : null
  },
  {
    id: 'stamp',
    problem: (r) => (r.stamp === null ? 'app.asar\'s out/main/index.js carries no " Diagnostic" stamp.' : null)
  },
  {
    id: 'handshake',
    problem: (r) =>
      !r.handshake
        ? 'app.asar\'s out/main/index.js never names TORTIE_CHECKER, so the main bundle is not the diagnostic one.'
        : null
  },
  {
    id: 'node-modules',
    problem: (r) =>
      r.sourceBefore !== r.sourceAfter
        ? `the checkout's ${SOURCE_PREBUILD} moved from ${r.sourceBefore} to ${String(r.sourceAfter)}.`
        : null
  },
  {
    id: 'dmg',
    problem: (r) =>
      !r.dir && (r.dmgs.length !== 1 || !r.dmgs[0].includes('-diagnostic-'))
        ? `a DMG build leaves exactly one -diagnostic- DMG, and release/ holds ${r.dmgs.length === 0 ? 'none' : r.dmgs.join(', ')}.`
        : null
  }
];

/** The first refusal a clause list names, or null. `without` takes one clause out (the self-test). */
export function firstRefusal(clauses, input, without = null) {
  for (const clause of clauses) {
    if (clause.id === without) continue;
    const why = clause.refuse(input);
    if (why !== null) return why;
  }
  return null;
}

/** Every read-back problem, in order. */
export function readBackProblems(reading, without = null) {
  return READ_BACK_CLAUSES.filter((c) => c.id !== without)
    .map((c) => c.problem(reading))
    .filter((p) => p !== null);
}

/** The config file step 5 writes. It extends electron-builder.yml and changes these four things, with real nulls. */
export function builderConfig({ notarize }) {
  return {
    extends: 'electron-builder.yml',
    afterPack: AFTER_PACK,
    publish: null,
    artifactName: ARTIFACT_NAME,
    mac: notarize ? { notarize: true } : { identity: null }
  };
}

/** What that config must be, as a list of problems (empty is right). */
export function builderConfigProblems(config, { notarize }) {
  const problems = [];
  const keys = Object.keys(config).sort().join(',');
  if (keys !== 'afterPack,artifactName,extends,mac,publish') problems.push(`it sets ${keys}, not exactly the four overrides and extends`);
  if (config.extends !== 'electron-builder.yml') problems.push('it does not extend electron-builder.yml');
  if (config.publish !== null) problems.push(`publish is ${JSON.stringify(config.publish)}, not null`);
  if (config.afterPack !== AFTER_PACK) problems.push('not the diagnostic afterPack');
  if (typeof config.artifactName !== 'string' || !config.artifactName.includes('-diagnostic-')) {
    problems.push('no -diagnostic- artifact name');
  }
  const mac = config.mac ?? {};
  const macKeys = Object.keys(mac).sort().join(',');
  if (notarize) {
    if (macKeys !== 'notarize' || mac.notarize !== true) problems.push('with --notarize, mac must be exactly { notarize: true }');
  } else if (macKeys !== 'identity' || mac.identity !== null) {
    problems.push('without --notarize, mac must be exactly { identity: null }');
  }
  return problems;
}

/** Step 5's command line, after the electron-builder CLI path. */
export function builderArgs({ dir, configPath }) {
  return ['--mac', ...(dir ? ['--dir'] : ['dmg']), '--arm64', '--publish', 'never', '--config', configPath];
}

/** What a step 5 command line must hold, as a list of problems (empty is right). */
export function builderArgsProblems(argv, { dir }) {
  const problems = [];
  const has = (s) => argv.includes(s);
  const publishAt = argv.indexOf('--publish');
  if (publishAt === -1 || argv[publishAt + 1] !== 'never') problems.push('no --publish never');
  if (argv.some((s) => /^(always|onTag|onTagOrDraft)$/.test(s) || /^--publish=/.test(s))) {
    problems.push('a publish mode other than never');
  }
  const configAt = argv.indexOf('--config');
  if (configAt === -1 || !/\.json$/.test(argv[configAt + 1] ?? '')) problems.push('no --config <file>.json');
  if (argv.some((s) => /^--?c\./.test(s))) problems.push('a command line override; every override goes in the config file');
  if (!has('--mac') || !has('--arm64')) problems.push('not an arm64 Mac build');
  if (dir !== has('--dir')) problems.push(dir ? 'no --dir' : 'a --dir in a DMG build');
  if (!dir && !has('dmg')) problems.push('no dmg target');
  if (has('zip')) problems.push('a zip target, which is the updater\'s');
  return problems;
}

/** The env every child gets. */
export function childEnv(env, { notarize, node }) {
  const out = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || ALWAYS_DROPPED.includes(key)) continue;
    if (!notarize && (key.startsWith('CSC_') || key.startsWith('APPLE_'))) continue;
    out[key] = value;
  }
  if (!notarize) out.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  out.TORTIE_DIAGNOSTIC = '1';
  out.TORTIE_DIAGNOSTIC_NODE = node;
  return out;
}

/** The two schema numbers a manifest/schema.ts states, or null when it states neither. */
export function manifestSchemaOf(text) {
  const version = /^export const MANIFEST_SCHEMA_VERSION = (\d+);$/m.exec(text);
  const min = /^export const MANIFEST_MIN_COMPATIBLE_VERSION = (\d+);$/m.exec(text);
  if (version === null || min === null) return null;
  return { version: Number(version[1]), minCompatible: Number(min[1]) };
}

/**
 * D14. `same`, `opens` (the release still reads the file this build writes,
 * because the file's minimum is at or below the release's own version,
 * src/main/db/schema-version.ts assertDatabaseUsable), `refused`, or
 * `unknown` when the release side was not read.
 */
export function goingBack(diagnostic, release) {
  if (diagnostic === null || release === null) return 'unknown';
  if (diagnostic.version === release.version && diagnostic.minCompatible === release.minCompatible) return 'same';
  return diagnostic.minCompatible > release.version ? 'refused' : 'opens';
}

/** The one line D14 asks for when the formats differ, or null when they do not. */
export function goingBackLine(schema) {
  const { diagnostic, release, verdict } = schema;
  if (verdict === 'same') return null;
  if (verdict === 'unknown') return `Going back: the newest release's session list format was not read (${schema.unread}).`;
  const head =
    `Going back: this build writes session list format ${diagnostic.version}, and ` +
    `${release.tag} writes ${release.version}`;
  return verdict === 'refused'
    ? `${head}; ${release.tag} refuses the file, so going back needs a release at format ${diagnostic.minCompatible} or newer.`
    : `${head}; ${release.tag} still opens the file.`;
}

// ---------------------------------------------------------------------------
// The impure half: arguments, children, git, the read-back.
// ---------------------------------------------------------------------------

/** The flags, or { usage } naming what is wrong. */
export function parseArgs(argv) {
  const out = { checker: null, dir: false, notarize: false, git: null, json: null, selfTest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dir') out.dir = true;
    else if (a === '--notarize') out.notarize = true;
    else if (a === '--self-test') out.selfTest = true;
    else if (a === '--checker' || a === '--git' || a === '--json') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { usage: `${a} needs a value.` };
      out[a.slice(2)] = v;
      i += 1;
    } else return { usage: `unknown argument ${a}.` };
  }
  if (!out.selfTest && out.checker === null) return { usage: '--checker <built better_sqlite3.node> is required.' };
  return out;
}

let running = null;

/** One child, its output passed to stderr as it comes, and kept when asked. */
function run(label, program, args, { env, capture = false }) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    process.stderr.write(`${TAG} ${label}\n`);
    let text = '';
    const child = spawn(program, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    running = child;
    const take = (chunk) => {
      if (capture) text += chunk.toString();
      process.stderr.write(chunk);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (err) => {
      running = null;
      resolveRun({ code: 1, text: `${text}${err.message}`, ms: Date.now() - started });
    });
    child.on('close', (code, signal) => {
      running = null;
      resolveRun({ code: code ?? (signal ? 1 : 0), signal, text, ms: Date.now() - started });
    });
  });
}

/** The module's undefined symbols, by `nm -u`, or null when nm could not read it. */
function importsOf(path) {
  const r = spawnSync('/usr/bin/nm', ['-u', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return null;
  return r.stdout.split('\n').map((l) => l.trim()).filter((l) => l !== '');
}

function git(gitDir, args) {
  const r = spawnSync('git', ['-C', gitDir, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
  });
  return r.status === 0 ? r.stdout : null;
}

/** D14's two sides. The release side comes from the newest v<major>.<minor>.<patch> tag. */
function schemaPair(gitDir) {
  const diagnostic = manifestSchemaOf(readFileSync(join(ROOT, SCHEMA_FILES[0]), 'utf8'));
  const out = { diagnostic, release: null, verdict: 'unknown', filesSame: null, unread: null };
  if (gitDir === null) {
    out.unread = 'no checkout named: pass --git <checkout>';
    return out;
  }
  const tags = git(gitDir, ['tag', '--list', 'v*', '--sort=-v:refname']);
  const tag = (tags ?? '').split('\n').map((t) => t.trim()).find((t) => /^v\d+\.\d+\.\d+$/.test(t));
  if (tag === undefined) {
    out.unread = `git in ${gitDir} lists no v<version> release`;
    return out;
  }
  const texts = SCHEMA_FILES.map((f) => git(gitDir, ['show', `${tag}:${f}`]));
  const release = texts[0] === null ? null : manifestSchemaOf(texts[0]);
  if (release === null) {
    out.unread = `${tag}:${SCHEMA_FILES[0]} states no schema version`;
    return out;
  }
  out.release = { tag, ...release };
  out.verdict = goingBack(diagnostic, release);
  out.filesSame = SCHEMA_FILES.every((f, i) => texts[i] !== null && texts[i] === readFileSync(join(ROOT, f), 'utf8'));
  return out;
}

function readBack({ dir, checkerSha, sourceBefore, productName, appId }) {
  const release = join(ROOT, 'release');
  const appPath = join(release, 'mac-arm64', `${productName}.app`);
  const app = existsSync(appPath) ? appPath : null;
  const listed = existsSync(release) ? readdirSync(release) : [];
  const reading = {
    dir,
    app,
    checker: checkerSha,
    packedModule: null,
    appUpdateYml: false,
    feedFiles: listed.filter((f) => /^latest.*\.yml$/.test(f)),
    blockmaps: listed.filter((f) => f.endsWith('.blockmap')),
    dmgs: listed.filter((f) => f.endsWith('.dmg')),
    appId,
    bundleId: null,
    version: null,
    stamp: null,
    handshake: false,
    sourceBefore,
    sourceAfter: existsSync(join(ROOT, SOURCE_PREBUILD)) ? sha256(readFileSync(join(ROOT, SOURCE_PREBUILD))) : null
  };
  if (app === null) return reading;
  const { PACKED_PREBUILD } = require('./after-pack.cjs');
  const packed = join(app, ...PACKED_PREBUILD);
  reading.packedModule = existsSync(packed) ? sha256(readFileSync(packed)) : null;
  reading.appUpdateYml = existsSync(join(app, 'Contents', 'Resources', 'app-update.yml'));
  const plist = join(app, 'Contents', 'Info.plist');
  const key = (name) => {
    const r = spawnSync('/usr/bin/plutil', ['-extract', name, 'raw', '-o', '-', plist], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  reading.bundleId = key('CFBundleIdentifier');
  reading.version = key('CFBundleShortVersionString');
  try {
    const asar = require('@electron/asar');
    const main = asar.extractFile(join(app, 'Contents', 'Resources', 'app.asar'), 'out/main/index.js').toString('utf8');
    reading.stamp = STAMP.exec(main)?.[1] ?? null;
    reading.handshake = main.includes('TORTIE_CHECKER');
  } catch (err) {
    process.stderr.write(`${TAG} could not read out/main/index.js from app.asar: ${err.message}\n`);
  }
  return reading;
}

function emit(result, jsonPath) {
  const line = JSON.stringify(result);
  process.stdout.write(`${line}\n`);
  if (jsonPath !== null) {
    mkdirSync(dirname(resolve(jsonPath)), { recursive: true });
    writeFileSync(resolve(jsonPath), `${line}\n`);
  }
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.usage !== undefined) {
    process.stderr.write(`${TAG} ${args.usage}\n`);
    process.exitCode = 2;
    return;
  }
  if (args.selfTest) {
    const { problems, counts } = selfTest();
    if (problems.length > 0) {
      process.stderr.write(`${TAG} self-test: ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
      for (const p of problems) process.stderr.write(`  ${p}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `${TAG} self-test: ${counts.rules} rules held, ${counts.ablations} ablations each red on the clause that owns it\n`
      );
    }
    return;
  }

  const started = Date.now();
  const json = args.json;
  const refuse = (why, extra = {}) => {
    process.stderr.write(`${TAG} REFUSED: ${why}\n`);
    emit({ ok: false, refusal: why, ...extra }, json);
    process.exitCode = 1;
  };
  const onRunner = process.env.GITHUB_ACTIONS === 'true';
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    refuse(`the diagnostic Tortie is built on an arm64 Mac, and this is ${process.platform}-${process.arch}.`);
    return;
  }
  const placed = firstRefusal(PLACE_CLAUSES, { root: ROOT, onRunner });
  if (placed !== null) return refuse(placed);
  const notarized = firstRefusal(NOTARIZE_CLAUSES, { env: process.env, notarize: args.notarize, onRunner });
  if (notarized !== null) return refuse(notarized);

  const node = resolve(args.checker);
  if (!existsSync(node) || !statSync(node).isFile()) return refuse(`--checker ${node} is not a file.`);
  const bytes = readFileSync(node);
  const imports = importsOf(node);
  if (imports === null) return refuse(`nm -u could not read ${node}.`);
  const bad = firstRefusal(CHECKER_CLAUSES, { bytes, imports });
  if (bad !== null) return refuse(`${node} ${bad}`);
  const checkerSha = sha256(bytes);

  const builderYml = require('js-yaml').load(readFileSync(join(ROOT, 'electron-builder.yml'), 'utf8'));
  const productName = builderYml.productName;
  const appId = builderYml.appId;
  const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  const sourceBefore = sha256(readFileSync(join(ROOT, SOURCE_PREBUILD)));
  const env = childEnv(process.env, { notarize: args.notarize, node });
  const ms = {};

  rmSync(join(ROOT, 'release'), { recursive: true, force: true });
  const vite = await run('TORTIE_DIAGNOSTIC=1 electron-vite build', process.execPath, [
    join(ROOT, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js'),
    'build'
  ], { env });
  ms.build = vite.ms;
  if (vite.code !== 0) return refuse(`electron-vite build exited ${vite.code}.`);
  const checksStarted = Date.now();
  for (const check of READ_ONLY_CHECKS) {
    const r = await run(check, process.execPath, [join(ROOT, check)], { env });
    if (r.code !== 0) return refuse(`${check} exited ${r.code} over the diagnostic out/.`);
  }
  ms.checks = Date.now() - checksStarted;

  const config = builderConfig({ notarize: args.notarize });
  const configDir = mkdtempSync(join(tmpdir(), 'tortie-diagnostic-builder-'));
  const configPath = join(configDir, 'electron-builder.diagnostic.json');
  const argvBuilder = builderArgs({ dir: args.dir, configPath });
  const composed = [...builderConfigProblems(config, args), ...builderArgsProblems(argvBuilder, args)];
  if (composed.length > 0) {
    rmSync(configDir, { recursive: true, force: true });
    return refuse(`the electron-builder config or command line is wrong: ${composed.join('; ')}.`);
  }
  let builder;
  try {
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    process.stderr.write(`${TAG} electron-builder config: ${JSON.stringify(config)}\n`);
    builder = await run(
      `electron-builder ${argvBuilder.join(' ')}`,
      process.execPath,
      [join(ROOT, 'node_modules', 'electron-builder', 'cli.js'), ...argvBuilder],
      { env, capture: true }
    );
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
  ms.builder = builder.ms;
  const signed = firstRefusal(SIGNING_CLAUSES, { log: builder.text, notarize: args.notarize, onRunner });
  if (signed !== null) return refuse(signed);
  if (builder.code !== 0) return refuse(`electron-builder exited ${builder.code}.`);

  // The fix round (lens B's nit): a DMG build writes a .blockmap beside the DMG, the differential data an update
  // feed hands electron-updater. This build is never on a feed and the lane uploads the DMG alone, so the blockmap
  // goes here, and the read-back refuses one that stayed.
  const blockmapsRemoved = [];
  if (!args.dir) {
    const releaseDir = join(ROOT, 'release');
    for (const f of existsSync(releaseDir) ? readdirSync(releaseDir) : []) {
      if (!f.endsWith('.blockmap')) continue;
      rmSync(join(releaseDir, f), { force: true });
      blockmapsRemoved.push(f);
    }
  }

  const reading = readBack({ dir: args.dir, checkerSha, sourceBefore, productName, appId });
  const problems = readBackProblems(reading);
  if (problems.length > 0) return refuse(`the read-back: ${problems.join(' ')}`, { reading });

  const gitDir = args.git !== null ? resolve(args.git) : onRunner ? ROOT : null;
  const schema = schemaPair(gitDir);
  if (onRunner && schema.verdict === 'unknown') return refuse(`the release side of the schema pair: ${schema.unread}.`);
  const line = goingBackLine(schema);
  if (line !== null) process.stderr.write(`${TAG} ${line}\n`);

  ms.total = Date.now() - started;
  emit(
    {
      ok: true,
      package: args.dir ? 'dir' : 'dmg',
      notarize: args.notarize,
      root: ROOT,
      app: reading.app,
      dmg: reading.dmgs.length === 1 ? join(ROOT, 'release', reading.dmgs[0]) : null,
      version,
      bundleVersion: reading.version,
      bundleId: reading.bundleId,
      stamp: reading.stamp,
      checker: { path: node, size: bytes.length, sha256: checkerSha },
      packedModule: { sha256: reading.packedModule, sameAsChecker: reading.packedModule === checkerSha },
      nodeModulesPrebuild: { sha256: reading.sourceAfter, unchanged: reading.sourceAfter === sourceBefore },
      feedFiles: { appUpdateYml: reading.appUpdateYml, latestYml: reading.feedFiles },
      blockmaps: reading.blockmaps,
      blockmapsRemoved,
      builderConfig: config,
      mainNamesChecker: reading.handshake,
      schema: {
        diagnostic: schema.diagnostic,
        release: schema.release,
        goingBack: schema.verdict,
        filesSame: schema.filesSame,
        unread: schema.unread
      },
      ms
    },
    json
  );
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

/** A fake Mach-O: the arm64 header, then the given strings. */
function machO(text, cpu = 0x0100000c) {
  const head = Buffer.alloc(32);
  head.writeUInt32LE(0xfeedfacf, 0);
  head.writeUInt32LE(cpu, 4);
  return Buffer.concat([head, Buffer.from(text, 'latin1')]);
}

/**
 * Every rule a function holds, then each again with its clause out. Returns
 * the problems (empty is a pass) and what was counted. It writes one scratch
 * tree under the temporary folder and removes it, and spawns nothing.
 */
export function selfTest() {
  const problems = [];
  const counts = { rules: 0, ablations: 0 };
  const rule = (ok, what) => {
    counts.rules += 1;
    if (!ok) problems.push(`rule: ${what}`);
  };
  const ablation = (ok, what) => {
    counts.ablations += 1;
    if (!ok) problems.push(`ablation: ${what}`);
  };
  /** A refusing fixture: refused with every clause, and NOT refused with its own clause out. */
  const owned = (clauses, input, id, what) => {
    rule(firstRefusal(clauses, input) !== null, `${what} is refused`);
    ablation(firstRefusal(clauses, input, id) === null, `${what} passes with clause ${id} taken out`);
  };

  // Step 3, the module.
  const good = machO('\0TORTIE_CHECKER\0diagnostic.pcache\0tortie-guard-364\0');
  rule(firstRefusal(CHECKER_CLAUSES, { bytes: good, imports: ['_malloc', '_dladdr'] }) === null, 'a diagnostic module passes');
  owned(CHECKER_CLAUSES, { bytes: machO('\0TORTIE_CHECKER\0diagnostic.pcache\0', 0x01000007), imports: [] }, 'macho-arm64', 'an x86_64 module');
  owned(CHECKER_CLAUSES, { bytes: Buffer.from('#!/bin/sh\nTORTIE_CHECKER diagnostic.pcache\n'), imports: [] }, 'macho-arm64', 'a file that is not Mach-O');
  owned(CHECKER_CLAUSES, { bytes: machO('\0TORTIE_CHECKER\0diagnostic.pcache\0P358ADV_PLANT\0'), imports: [] }, 'plant-strings', 'a module naming P358ADV');
  owned(CHECKER_CLAUSES, { bytes: machO('\0TORTIE_CHECKER\0diagnostic.pcache\0[p358adv-SEGV]\0'), imports: [] }, 'plant-strings', 'a module naming [p358adv-');
  owned(CHECKER_CLAUSES, { bytes: good, imports: ['_malloc', '_sigaction'] }, 'sigaction', 'a module importing sigaction');
  owned(CHECKER_CLAUSES, { bytes: machO('\0sqlite3_open_v2\0'), imports: [] }, 'checker-names', 'a module with no checker in it');
  owned(CHECKER_CLAUSES, { bytes: machO('\0TORTIE_CHECKER\0'), imports: [] }, 'checker-names', 'a module with no diagnostic.pcache');
  const shipped = join(ROOT, SOURCE_PREBUILD);
  if (existsSync(shipped)) {
    owned(CHECKER_CLAUSES, { bytes: readFileSync(shipped), imports: [] }, 'checker-names', 'the shipped prebuild');
  }

  // Step 2, --notarize.
  const off = { onRunner: false };
  const on = { onRunner: true };
  const notary = { APPLE_ID: 'a', APPLE_APP_SPECIFIC_PASSWORD: 'b', APPLE_TEAM_ID: 'c' };
  rule(firstRefusal(NOTARIZE_CLAUSES, { env: {}, notarize: false, ...off }) === null, 'an unsigned run passes');
  rule(firstRefusal(NOTARIZE_CLAUSES, { env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false' }, notarize: true, ...off }) === null, 'a dry run of --notarize passes');
  rule(firstRefusal(NOTARIZE_CLAUSES, { env: notary, notarize: true, ...on }) === null, 'the lane with its three values passes');
  owned(NOTARIZE_CLAUSES, { env: {}, notarize: true, ...off }, 'notarize-off-runner-can-sign', '--notarize on a Mac that can sign');
  owned(NOTARIZE_CLAUSES, { env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false', APPLE_ID: 'x' }, notarize: true, ...off }, 'notarize-off-runner-has-apple', 'a dry run carrying APPLE_ID');
  owned(NOTARIZE_CLAUSES, { env: { APPLE_ID: 'a', APPLE_TEAM_ID: 'c' }, notarize: true, ...on }, 'notarize-on-runner-missing', 'the lane missing a notarization value');

  // Step 5's log.
  const ad = '  • signing file=release/mac-arm64/Tortie.app identityName=Developer ID Application: Someone (TEAM)';
  rule(firstRefusal(SIGNING_CLAUSES, { log: '  • skipped macOS code signing  reason=identity explicitly is set to null', notarize: false, ...off }) === null, 'an unsigned log passes');
  rule(firstRefusal(SIGNING_CLAUSES, { log: ad, notarize: true, ...on }) === null, 'the lane\'s signed log passes');
  owned(SIGNING_CLAUSES, { log: ad, notarize: false, ...off }, 'developer-id-off-lane', 'an unsigned run naming a Developer ID');
  owned(SIGNING_CLAUSES, { log: 'signed Resources/bin/tmux (Developer ID Application: X, runtime)', notarize: true, ...off }, 'developer-id-off-lane', 'a dry run naming a Developer ID');
  owned(SIGNING_CLAUSES, { log: ad, notarize: false, ...on }, 'developer-id-off-lane', 'an unsigned run on the runner naming a Developer ID');

  // Step 5: the config and the command line hold every clause, and each judge sees each one go.
  for (const notarize of [false, true]) {
    const shape = { notarize };
    const config = builderConfig(shape);
    rule(builderConfigProblems(config, shape).length === 0, `builderConfig(${JSON.stringify(shape)}) holds every clause`);
    rule(JSON.parse(JSON.stringify(config)).publish === null, 'publish survives the file as a real null');
    const breaks = [
      // The defect a DMG build met: the command line's "null" is a string.
      ['publish as the string "null"', { ...config, publish: 'null' }],
      ['publish to github', { ...config, publish: { provider: 'github' } }],
      ['no publish key', (({ publish: _p, ...c }) => c)(config)],
      ['no extends', (({ extends: _e, ...c }) => c)(config)],
      ['another afterPack', { ...config, afterPack: 'build/after-pack.cjs' }],
      ['the normal artifact name', { ...config, artifactName: '${productName}-${version}-${arch}.${ext}' }],
      ['another bundle id', { ...config, appId: 'com.example.other' }],
      ['the other mac', { ...config, mac: notarize ? { identity: null } : { notarize: true } }],
      ['a named identity', { ...config, mac: { identity: 'Developer ID Application: X' } }]
    ];
    for (const [what, broken] of breaks) {
      ablation(builderConfigProblems(broken, shape).length > 0, `builderConfig ${JSON.stringify(shape)} with "${what}" is caught`);
    }
  }
  for (const dir of [true, false]) {
    const shape = { dir };
    const argv = builderArgs({ dir, configPath: '/t/electron-builder.diagnostic.json' });
    rule(builderArgsProblems(argv, shape).length === 0, `builderArgs(${JSON.stringify(shape)}) holds every clause`);
    const breaks = [
      ['publish always', argv.map((s) => (s === 'never' ? 'always' : s))],
      ['no --config', argv.filter((s, i) => s !== '--config' && argv[i - 1] !== '--config')],
      ['a -c.publish=null override', [...argv, '-c.publish=null']],
      ['add a zip', [...argv, 'zip']],
      ['drop --arm64', argv.filter((s) => s !== '--arm64')],
      ['flip --dir', dir ? argv.filter((s) => s !== '--dir') : [...argv, '--dir']]
    ];
    for (const [what, broken] of breaks) {
      ablation(builderArgsProblems(broken, shape).length > 0, `builderArgs ${JSON.stringify(shape)} with "${what}" is caught`);
    }
  }

  // The env every child gets.
  const parent = {
    PATH: '/usr/bin',
    GH_TOKEN: 't',
    GITHUB_TOKEN: 't',
    USE_HARD_LINKS: 'true',
    VITEST: '1',
    CSC_LINK: 'x',
    CSC_KEYCHAIN: 'k',
    APPLE_ID: 'a',
    APPLE_KEYCHAIN_PROFILE: 'p'
  };
  const unsignedEnv = childEnv(parent, { notarize: false, node: '/m.node' });
  rule(
    ALWAYS_DROPPED.every((k) => !(k in unsignedEnv)) &&
      !Object.keys(unsignedEnv).some((k) => (k.startsWith('CSC_') && k !== 'CSC_IDENTITY_AUTO_DISCOVERY') || k.startsWith('APPLE_')) &&
      unsignedEnv.CSC_IDENTITY_AUTO_DISCOVERY === 'false' &&
      unsignedEnv.TORTIE_DIAGNOSTIC === '1' &&
      unsignedEnv.TORTIE_DIAGNOSTIC_NODE === '/m.node' &&
      unsignedEnv.PATH === '/usr/bin',
    'an unsigned child env drops every token, CSC_* and APPLE_* and turns discovery off'
  );
  const laneEnv = childEnv(parent, { notarize: true, node: '/m.node' });
  rule(
    ALWAYS_DROPPED.every((k) => !(k in laneEnv)) &&
      laneEnv.CSC_KEYCHAIN === 'k' &&
      laneEnv.APPLE_ID === 'a' &&
      !('CSC_IDENTITY_AUTO_DISCOVERY' in laneEnv),
    'the lane\'s child env keeps the keychain and the notarization values and drops every token'
  );

  // Step 7, going back.
  const s = (version, minCompatible) => ({ version, minCompatible });
  rule(manifestSchemaOf('export const MANIFEST_SCHEMA_VERSION = 20;\nexport const MANIFEST_MIN_COMPATIBLE_VERSION = 13;\n')?.version === 20, 'the schema numbers are read');
  rule(manifestSchemaOf('const MANIFEST_SCHEMA_VERSION = 20;') === null, 'a file stating neither reads null');
  rule(goingBack(s(20, 13), s(20, 13)) === 'same', 'the same format reads same');
  rule(goingBack(s(21, 13), s(20, 13)) === 'opens', 'an additive step reads opens');
  rule(goingBack(s(21, 21), s(20, 13)) === 'refused', 'a breaking step reads refused');
  rule(goingBack(s(20, 13), null) === 'unknown', 'an unread release reads unknown');
  rule(goingBackLine({ verdict: 'same' }) === null, 'the same format says nothing');
  rule(
    /refuses the file/.test(goingBackLine({ verdict: 'refused', diagnostic: s(21, 21), release: { tag: 'v1.0.0', ...s(20, 13) } }) ?? ''),
    'a refused format says so in one line'
  );
  const repo = join(ROOT, SCHEMA_FILES[0]);
  if (existsSync(repo)) rule(manifestSchemaOf(readFileSync(repo, 'utf8')) !== null, `${SCHEMA_FILES[0]} states both numbers`);

  // Step 6, the read-back.
  const fine = {
    dir: false,
    app: '/r/mac-arm64/Tortie.app',
    checker: 'c',
    packedModule: 'c',
    appUpdateYml: false,
    feedFiles: [],
    blockmaps: [],
    dmgs: ['Tortie-1.0.0-diagnostic-arm64.dmg'],
    appId: 'com.itavero.tortie',
    bundleId: 'com.itavero.tortie',
    version: '1.0.0',
    stamp: 'dev Diagnostic',
    handshake: true,
    sourceBefore: 'p',
    sourceAfter: 'p'
  };
  rule(readBackProblems(fine).length === 0, 'a right package reads clean');
  const wrong = [
    ['app', { app: null }],
    ['module', { packedModule: 'p' }],
    ['app-update-yml', { appUpdateYml: true }],
    ['feed-yml', { feedFiles: ['latest-mac.yml'] }],
    ['blockmap', { blockmaps: ['Tortie-1.0.0-diagnostic-arm64.dmg.blockmap'] }],
    ['bundle-id', { bundleId: 'com.example.other' }],
    ['stamp', { stamp: null }],
    ['handshake', { handshake: false }],
    ['node-modules', { sourceAfter: 'q' }],
    ['dmg', { dmgs: ['Tortie-1.0.0-arm64.dmg'] }],
    ['dmg', { dmgs: [] }]
  ];
  for (const [id, change] of wrong) {
    const reading = { ...fine, ...change };
    rule(readBackProblems(reading).length > 0, `a package with ${JSON.stringify(change)} is refused`);
    ablation(readBackProblems(reading, id).length === 0, `${JSON.stringify(change)} passes with clause ${id} taken out`);
  }
  rule(readBackProblems({ ...fine, dir: true, dmgs: [] }).length === 0, 'a --dir package needs no DMG');

  // Arguments.
  rule(parseArgs(['--checker', 'x.node', '--dir']).dir === true, 'the flags are read');
  rule(parseArgs(['--dir']).usage !== undefined, '--checker is required');
  rule(parseArgs(['--checker', 'x', '--publish', 'always']).usage !== undefined, 'an unknown flag is refused');
  rule(parseArgs(['--checker']).usage !== undefined, 'a flag with no value is refused');

  // Steps 1 and the after-pack hook, over a scratch tree.
  const scratch = mkdtempSync(join(tmpdir(), 'p364-package-self-test-'));
  try {
    const bare = join(scratch, 'copy');
    mkdirSync(bare);
    rule(firstRefusal(PLACE_CLAUSES, { root: bare, onRunner: false }) === null, 'a copy with no .git passes');
    writeFileSync(join(bare, '.git'), 'gitdir: /elsewhere/.git/worktrees/x\n');
    owned(PLACE_CLAUSES, { root: bare, onRunner: false }, 'git-off-runner', 'a copy that keeps a worktree\'s .git file');
    rule(firstRefusal(PLACE_CLAUSES, { root: bare, onRunner: true }) === null, 'the runner\'s checkout passes');
    afterPackSelfTest(scratch, rule, ablation);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return { problems, counts };
}

/**
 * build/diagnostic/after-pack.cjs over a scratch packed app, then over copies
 * of its own source with one refusal taken out each, which must then let the
 * fixture that refusal owns through.
 */
function afterPackSelfTest(scratch, rule, ablation) {
  const source = readFileSync(join(HERE, 'after-pack.cjs'), 'utf8');
  const { PACKED_PREBUILD } = require('./after-pack.cjs');
  let n = 0;
  const load = (text) => {
    n += 1;
    const file = join(scratch, `after-pack-${n}.cjs`);
    writeFileSync(file, text);
    return createRequire(file)(file);
  };
  const plain = machO('\0sqlite3_open_v2\0');
  const checker = machO('\0TORTIE_CHECKER\0diagnostic.pcache\0');
  // A mode no common umask gives a new file, so a write that forgets to keep
  // the mode is seen.
  const FIXTURE_MODE = 0o604;

  /** A fresh world: a checkout, a packed app whose module is a HARD LINK to the checkout's, and a checker. */
  const world = ({ plant = false } = {}) => {
    n += 1;
    const base = join(scratch, `world-${n}`);
    const project = join(base, 'project');
    const sourceFile = join(project, SOURCE_PREBUILD);
    mkdirSync(dirname(sourceFile), { recursive: true });
    writeFileSync(sourceFile, plain);
    chmodSync(sourceFile, 0o644);
    const appOutDir = join(base, 'out');
    const target = join(appOutDir, 'Tortie.app', ...PACKED_PREBUILD);
    mkdirSync(dirname(target), { recursive: true });
    linkSync(sourceFile, target);
    chmodSync(target, FIXTURE_MODE);
    const node = join(base, 'checker.node');
    writeFileSync(node, plant ? Buffer.concat([checker, Buffer.from('\0P358ADV_PLANT\0')]) : checker);
    const context = {
      electronPlatformName: 'darwin',
      appOutDir,
      packager: { appInfo: { productFilename: 'Tortie' }, projectDir: project }
    };
    return { context, node, target, sourceFile, env: { TORTIE_DIAGNOSTIC: '1', TORTIE_DIAGNOSTIC_NODE: node } };
  };
  const attempt = (mod, w, env = w.env) => {
    try {
      return { result: mod.swapPackedPrebuild(w.context, env), error: null };
    } catch (err) {
      return { result: null, error: err };
    }
  };
  const untouched = (w) => sha256(readFileSync(w.sourceFile)) === sha256(plain);

  const real = require('./after-pack.cjs');
  {
    const w = world();
    const { error } = attempt(real, w);
    rule(error === null, `the swap over a hard-linked pack succeeds (${error?.message ?? 'ok'})`);
    rule(sha256(readFileSync(w.target)) === sha256(checker), 'the packed module is the checker');
    rule(untouched(w), 'the checkout\'s module is unchanged though the packed one was a hard link to it');
    rule((statSync(w.target).mode & 0o7777) === FIXTURE_MODE, 'the packed module keeps its mode');
  }
  const refusals = [
    ['TORTIE_DIAGNOSTIC unset', (w) => ({ ...w.env, TORTIE_DIAGNOSTIC: undefined }), {}],
    ['a relative module path', (w) => ({ ...w.env, TORTIE_DIAGNOSTIC_NODE: 'checker.node' }), {}],
    ['the test variant', (w) => w.env, { plant: true }],
    ['a Linux pack', (w) => w.env, {}, (w) => { w.context.electronPlatformName = 'linux'; }],
    ['a pack with no module', (w) => w.env, {}, (w) => { rmSync(w.target); }],
    ['a pack already holding the checker', (w) => w.env, {}, (w) => { rmSync(w.target); writeFileSync(w.target, checker); }]
  ];
  for (const [what, envOf, opts, prepare] of refusals) {
    const w = world(opts);
    prepare?.(w);
    const before = existsSync(w.target) ? sha256(readFileSync(w.target)) : null;
    const { error } = attempt(real, w, envOf(w));
    const after = existsSync(w.target) ? sha256(readFileSync(w.target)) : null;
    rule(error !== null && before === after && untouched(w), `${what} is refused with nothing written`);
  }

  // Each mutation takes one refusal or one write rule out of a copy of the
  // source. The anchor must occur exactly once, or the ablation is stale.
  const mutations = [
    {
      what: 'the TORTIE_DIAGNOSTIC refusal',
      from: "if (env.TORTIE_DIAGNOSTIC !== '1') {",
      to: 'if (false) {',
      fixture: () => {
        const w = world();
        return { w, env: { ...w.env, TORTIE_DIAGNOSTIC: undefined } };
      },
      caught: ({ error }) => error === null
    },
    {
      what: 'the plant refusal',
      from: 'if (planted.length > 0) {',
      to: 'if (false) {',
      fixture: () => {
        const w = world({ plant: true });
        return { w, env: w.env };
      },
      caught: ({ error }) => error === null
    },
    {
      what: 'the already-the-checker refusal',
      from: 'if (before === want || sourceBefore === want) {',
      to: 'if (false) {',
      fixture: () => {
        const w = world();
        rmSync(w.target);
        writeFileSync(w.target, checker);
        return { w, env: w.env };
      },
      caught: ({ error }) => error === null
    },
    {
      what: 'the unlink before the write',
      from: "unlinkSync(target);\n  writeFileSync(target, bytes, { flag: 'wx' });",
      to: 'writeFileSync(target, bytes);',
      fixture: () => {
        const w = world();
        return { w, env: w.env };
      },
      caught: ({ w }) => !untouched(w)
    },
    {
      what: 'the mode kept',
      from: 'chmodSync(target, mode);',
      to: '',
      fixture: () => {
        const w = world();
        return { w, env: w.env };
      },
      caught: ({ w }) => (statSync(w.target).mode & 0o7777) !== FIXTURE_MODE
    }
  ];
  for (const m of mutations) {
    const at = source.indexOf(m.from);
    if (at === -1 || source.indexOf(m.from, at + 1) !== -1) {
      ablation(false, `the anchor for ${m.what} does not occur exactly once in after-pack.cjs`);
      continue;
    }
    const mutated = load(source.slice(0, at) + m.to + source.slice(at + m.from.length));
    const { w, env } = m.fixture();
    const out = attempt(mutated, w, env);
    ablation(m.caught({ ...out, w }), `after-pack.cjs without ${m.what} lets its fixture through`);
  }
}

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      if (running !== null && running.exitCode === null && running.signalCode === null) running.kill(signal);
      process.exitCode = 1;
      process.exit();
    });
  }
  await main(process.argv.slice(2));
}
