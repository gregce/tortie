#!/usr/bin/env node
/**
 * contract-inventory.mjs — the Phase 42 contract baseline (stage 0).
 *
 * The architecture cleanup moves code freely behind stable facades. This
 * script emits the contract surfaces that must NOT move, as one deterministic
 * text document. Every stage of Phase 42 runs `--check` after its gates: the
 * emitted document must byte-compare equal to docs/audits/contract-baseline.txt.
 * A stage that changes a line on purpose re-baselines in the same commit and
 * says why in the commit body. A silent diff fails the stage.
 *
 * ## What it emits, and how each section is obtained
 *
 * 1. IPC invoke channels. The TypeScript checker resolves the exported
 *    `GmuxInvokeChannelMap` type in the shared contract and lists its
 *    property names. This survives the planned physical split of
 *    src/shared/ipc.ts into src/shared/ipc/*: the entry is located by
 *    candidate paths, and the names come from the TYPE, not from file layout.
 *    A later stage may adjust the locator, but the emitted list must hold.
 *
 * 2. SQLite schema. The honest cheap path, chosen over parsing migration SQL
 *    out of source text: bundle src/main/manifest/store.ts with esbuild
 *    (electron aliased to the unit-test stub, better-sqlite3 left external),
 *    run it under plain node in a temp directory, let the REAL migration
 *    runner build a scratch manifest, then dump sqlite_master, the version
 *    pragmas, and the migrations bookkeeping rows from that file. This is
 *    exactly what the unit tests do (`new ManifestStore(dbPath)` under node),
 *    so it exercises the shipping migration path instead of a re-derivation.
 *    Nothing here touches a live manifest: the scratch db lives in a fresh
 *    mkdtemp directory and is removed afterwards.
 *
 * 3. gmux.* localStorage keys. A source sweep of src/ for string literals
 *    beginning `gmux.` (quote or backtick). Template literals are captured up
 *    to their first `${` hole, so a dynamic key contributes its stable
 *    prefix. The sweep is a deterministic superset of the keys actually
 *    passed to localStorage; that is fine for a drift detector.
 *
 * 4. GMUX_* env names. A source sweep of src/, build/, and package.json for
 *    the pattern GMUX_[A-Z0-9_]+.
 *
 * 5. Harness GMUX_SMOKE mode names. In every non-test src file that reads
 *    process.env['GMUX_SMOKE'], the string literals compared with
 *    `smoke === '<name>'` are the dispatchable modes.
 *
 * 6. The four bundle refusal counts, parsed from the array constants in
 *    build/assert-bundle-refusals.mjs source (that module cannot be imported
 *    here: importing it runs its bundle assertions).
 *
 * Test files (__tests__, *.test.*, src/test/) are excluded from the sweeps:
 * they are allowed to move during the refactor and their fixture strings are
 * not contract.
 *
 * ## Usage
 *
 *   node build/contract-inventory.mjs                 # print to stdout
 *   node build/contract-inventory.mjs --out <file>    # write to a file
 *   node build/contract-inventory.mjs --check         # byte-compare against
 *                                                     # docs/audits/contract-baseline.txt,
 *                                                     # print the diff, exit 1 on any
 *
 * Determinism rules: every list is sorted and de-duplicated, no timestamps,
 * no absolute paths, no machine-local values reach the output.
 */

import { createRequire } from 'node:module';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BASELINE_PATH = join(repoRoot, 'docs', 'audits', 'contract-baseline.txt');

// ---------------------------------------------------------------------------
// Shared sweep helpers
// ---------------------------------------------------------------------------

/** True for paths the sweeps must skip: tests and test scaffolding. */
function isTestPath(relPath) {
  return (
    relPath.includes('__tests__/') ||
    /\.test\.[cm]?tsx?$/.test(relPath) ||
    relPath.startsWith('src/test/')
  );
}

/** Every file under `dir` (recursive) whose name passes `keep`. */
function walk(dir, keep, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      walk(full, keep, out);
    } else if (keep(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Sorted unique list. */
function sortedUnique(items) {
  return [...new Set(items)].sort();
}

// ---------------------------------------------------------------------------
// 1. IPC invoke channels, from the type checker
// ---------------------------------------------------------------------------

function collectInvokeChannels() {
  const ts = require('typescript');
  const candidates = [
    join(repoRoot, 'src', 'shared', 'ipc', 'index.ts'),
    join(repoRoot, 'src', 'shared', 'ipc.ts')
  ];
  const entry = candidates.find((p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (entry === undefined) {
    throw new Error(
      'contract-inventory: no shared IPC contract found at ' +
        'src/shared/ipc/index.ts or src/shared/ipc.ts'
    );
  }
  const program = ts.createProgram([entry], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: repoRoot,
    paths: { '@shared/*': ['src/shared/*'] },
    skipLibCheck: true,
    noEmit: true,
    types: []
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entry);
  if (sourceFile === undefined) {
    throw new Error(`contract-inventory: could not parse ${entry}`);
  }
  let mapType = null;
  const visit = (node) => {
    if (mapType !== null) return;
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name.text === 'GmuxInvokeChannelMap'
    ) {
      mapType = ts.isTypeAliasDeclaration(node)
        ? checker.getTypeFromTypeNode(node.type)
        : checker.getTypeAtLocation(node.name);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (mapType === null) {
    throw new Error(
      'contract-inventory: GmuxInvokeChannelMap is not declared in ' +
        relative(repoRoot, entry) +
        '. If a stage renamed the composed invoke map, update this locator ' +
        'in the same commit; the emitted channel list must not change.'
    );
  }
  const names = checker.getPropertiesOfType(mapType).map((sym) => sym.name);
  if (names.length === 0) {
    throw new Error('contract-inventory: the invoke map resolved to no channels');
  }
  return sortedUnique(names);
}

// ---------------------------------------------------------------------------
// 2. SQLite schema, from a scratch manifest built by the real migration runner
// ---------------------------------------------------------------------------

/**
 * The entry that esbuild bundles. It runs under plain node, the same way the
 * manifest unit tests do: `electron` is aliased to src/test/electron-stub.cjs,
 * so `app` is undefined and store.ts falls back to its test-safe paths.
 */
const SCHEMA_PROBE_ENTRY = `
import { ManifestStore } from '${join(repoRoot, 'src', 'main', 'manifest', 'store')}';
import Database from 'better-sqlite3';
import { join } from 'node:path';

const dir = process.argv[2];
const dbPath = join(dir, 'manifest.db');
const store = new ManifestStore(dbPath);
store.close();

const db = new Database(dbPath, { readonly: true });
const schema = db
  .prepare(
    "SELECT type, name, sql FROM sqlite_master " +
      "WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
  )
  .all();
const userVersion = db.pragma('user_version', { simple: true });
const applicationId = db.pragma('application_id', { simple: true });
const minCompatible = db
  .prepare("SELECT value FROM meta WHERE key = 'min_compatible_version'")
  .get();
const migrations = db
  .prepare('SELECT name FROM migrations ORDER BY name')
  .all();
db.close();

process.stdout.write(
  JSON.stringify({
    userVersion,
    applicationId,
    minCompatible: minCompatible === undefined ? null : minCompatible.value,
    migrations: migrations.map((row) => row.name),
    schema
  })
);
`;

function collectSqliteSchema() {
  const esbuild = require('esbuild');
  const scratch = mkdtempSync(join(tmpdir(), 'tortie-contract-inventory-'));
  try {
    const entryPath = join(scratch, 'schema-probe-entry.ts');
    const bundlePath = join(scratch, 'schema-probe.cjs');
    const dbDir = join(scratch, 'db');
    writeFileSync(entryPath, SCHEMA_PROBE_ENTRY);
    esbuild.buildSync({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: bundlePath,
      external: ['better-sqlite3'],
      alias: {
        electron: join(repoRoot, 'src', 'test', 'electron-stub.cjs'),
        '@shared': join(repoRoot, 'src', 'shared')
      },
      logLevel: 'silent',
      // The bundle lands in a temp dir, so the external better-sqlite3
      // require must be pointed back at the repo's node_modules.
      banner: {
        js: `module.paths.unshift(${JSON.stringify(join(repoRoot, 'node_modules'))});`
      }
    });
    execFileSync('mkdir', ['-p', dbDir]);
    const raw = execFileSync(process.execPath, [bundlePath, dbDir], {
      encoding: 'utf8'
    });
    return JSON.parse(raw);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 3. gmux.* localStorage keys
// ---------------------------------------------------------------------------

function collectLocalStorageKeys() {
  const files = walk(join(repoRoot, 'src'), (name) =>
    /\.[cm]?tsx?$/.test(name)
  );
  const keys = [];
  const pattern = /['"`](gmux\.[A-Za-z0-9_.:-]*)/g;
  for (const file of files) {
    const rel = relative(repoRoot, file);
    if (isTestPath(rel)) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      keys.push(match[1]);
    }
  }
  return sortedUnique(keys);
}

// ---------------------------------------------------------------------------
// 4. GMUX_* env names
// ---------------------------------------------------------------------------

function collectEnvNames() {
  const files = [
    ...walk(join(repoRoot, 'src'), (name) => /\.[cm]?tsx?$/.test(name)),
    ...walk(join(repoRoot, 'build'), (name) => /\.(mjs|cjs|mts)$/.test(name)),
    join(repoRoot, 'package.json')
  ];
  const names = [];
  const pattern = /\bGMUX_[A-Z0-9_]+\b/g;
  for (const file of files) {
    const rel = relative(repoRoot, file);
    if (isTestPath(rel)) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      names.push(match[0]);
    }
  }
  return sortedUnique(names);
}

// ---------------------------------------------------------------------------
// 5. Harness GMUX_SMOKE mode names
// ---------------------------------------------------------------------------

function collectSmokeModes() {
  const files = walk(join(repoRoot, 'src'), (name) => /\.[cm]?tsx?$/.test(name));
  const modes = [];
  for (const file of files) {
    const rel = relative(repoRoot, file);
    if (isTestPath(rel)) continue;
    const text = readFileSync(file, 'utf8');
    if (!text.includes("process.env['GMUX_SMOKE']")) continue;
    for (const match of text.matchAll(/\bsmoke === '([a-z][a-z0-9-]*)'/g)) {
      modes.push(match[1]);
    }
  }
  if (modes.length === 0) {
    throw new Error(
      'contract-inventory: found no GMUX_SMOKE dispatch. If a stage moved ' +
        'the smoke dispatch, update this locator in the same commit; the ' +
        'emitted mode list must not change.'
    );
  }
  return sortedUnique(modes);
}

// ---------------------------------------------------------------------------
// 6. Bundle refusal counts
// ---------------------------------------------------------------------------

function collectRefusalCounts() {
  const source = readFileSync(
    join(repoRoot, 'build', 'assert-bundle-refusals.mjs'),
    'utf8'
  );
  const counts = {};
  const arrays = [
    'REFUSALS',
    'SKILLS_REFUSALS',
    'CONFIG_REFUSALS',
    // Phase 68 added the machine confirm gate, a second gate over a second file
    // with its own hash and its own key space in the shared record.
    'MACHINE_REFUSALS',
    'UPDATER_REFUSALS'
  ];
  for (const name of arrays) {
    const start = source.match(new RegExp(`const ${name} = \\[`));
    if (start === null || start.index === undefined) {
      throw new Error(
        `contract-inventory: build/assert-bundle-refusals.mjs no longer ` +
          `declares const ${name}`
      );
    }
    const from = start.index;
    const end = source.indexOf('\n];', from);
    if (end === -1) {
      throw new Error(`contract-inventory: unterminated array ${name}`);
    }
    const body = source.slice(from, end);
    const ids = body.match(/^\s*id: '/gm);
    counts[name] = ids === null ? 0 : ids.length;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function buildInventory() {
  const channels = collectInvokeChannels();
  const sqlite = collectSqliteSchema();
  const storageKeys = collectLocalStorageKeys();
  const envNames = collectEnvNames();
  const smokeModes = collectSmokeModes();
  const refusals = collectRefusalCounts();

  const lines = [];
  lines.push('# Tortie contract baseline (Phase 42)');
  lines.push('# Generated by build/contract-inventory.mjs. Do not edit by hand.');
  lines.push('# Regenerate with: node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt');
  lines.push('');

  lines.push(`[ipc.invoke.channels] count=${channels.length}`);
  lines.push(...channels);
  lines.push('');

  lines.push('[sqlite.identity]');
  lines.push(`application_id=${sqlite.applicationId}`);
  lines.push(`user_version=${sqlite.userVersion}`);
  lines.push(`min_compatible_version=${sqlite.minCompatible}`);
  lines.push('');

  lines.push(`[sqlite.migrations] count=${sqlite.migrations.length}`);
  lines.push(...sqlite.migrations);
  lines.push('');

  lines.push(`[sqlite.schema] objects=${sqlite.schema.length}`);
  for (const row of sqlite.schema) {
    lines.push(`-- ${row.type} ${row.name}`);
    lines.push(String(row.sql));
  }
  lines.push('');

  lines.push(`[localStorage.keys] count=${storageKeys.length}`);
  lines.push(...storageKeys);
  lines.push('');

  lines.push(`[env.names] count=${envNames.length}`);
  lines.push(...envNames);
  lines.push('');

  lines.push(`[harness.smoke.modes] count=${smokeModes.length}`);
  lines.push(...smokeModes);
  lines.push('');

  lines.push('[bundle.refusals]');
  lines.push(`durability=${refusals.REFUSALS}`);
  lines.push(`skills=${refusals.SKILLS_REFUSALS}`);
  lines.push(`config=${refusals.CONFIG_REFUSALS}`);
  lines.push(`machines=${refusals.MACHINE_REFUSALS}`);
  lines.push(`updater=${refusals.UPDATER_REFUSALS}`);
  lines.push('');

  return lines.join('\n');
}

/** A minimal line diff: enough to say exactly which lines moved. */
function printDiff(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const max = Math.max(a.length, b.length);
  let shown = 0;
  for (let i = 0; i < max; i += 1) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) console.error(`- ${String(i + 1)}: ${a[i]}`);
    if (b[i] !== undefined) console.error(`+ ${String(i + 1)}: ${b[i]}`);
    shown += 1;
    if (shown >= 80) {
      console.error('... diff truncated at 80 differing lines');
      break;
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const inventory = buildInventory();

  if (args.includes('--check')) {
    let baseline;
    try {
      baseline = readFileSync(BASELINE_PATH, 'utf8');
    } catch {
      console.error(`contract-inventory: no baseline at ${BASELINE_PATH}`);
      process.exit(1);
    }
    if (baseline === inventory) {
      console.log(
        'contract-inventory: OK, the inventory matches ' +
          'docs/audits/contract-baseline.txt byte for byte'
      );
      return;
    }
    console.error(
      'contract-inventory: the inventory DIFFERS from the committed baseline.'
    );
    console.error(
      'A deliberate contract move must re-baseline in the same commit and ' +
        'state the line, the reason, and the evidence in the commit body.'
    );
    printDiff(baseline, inventory);
    process.exit(1);
  }

  const outIndex = args.indexOf('--out');
  if (outIndex !== -1) {
    const outPath = args[outIndex + 1];
    if (outPath === undefined) {
      console.error('contract-inventory: --out needs a path');
      process.exit(1);
    }
    writeFileSync(resolve(repoRoot, outPath), inventory);
    console.log(`contract-inventory: wrote ${outPath}`);
    return;
  }

  process.stdout.write(inventory);
}

main();
