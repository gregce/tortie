/**
 * fetch-skills.cjs — vendor the pinned `skills` CLI so it can ride inside
 * Tortie.app.
 *
 * Phase 22. `electron-builder.yml` copies `build/vendor/skills/` into
 * `Tortie.app/Contents/Resources/skills-cli/`; THIS script is what puts a tree
 * there. It runs automatically from the `beforePack` hook
 * (build/before-pack.cjs), beside `ensureSpecstoryBinary`, and can be run by
 * hand: `npm run vendor:skills`.
 *
 * ## Why a bundled npm package rather than `npx`
 *
 * Measured on 2026-08-12 and written up in docs/BACKLOG.md, "The skills CLI,
 * and how it is distributed". `npx` needs Node on the machine, which a user
 * running native-binary agents may not have; a warm `npx` with an exact pinned
 * version still issues `GET registry.npmjs.org/skills` on every call; and with
 * the registry unreachable npm's retry policy takes 70 seconds to fail. The
 * bundled tree needs none of that, and Electron's own Node runs it with
 * `ELECTRON_RUN_AS_NODE=1`.
 *
 * ## Why this adds no signing work, and why that is checked rather than assumed
 *
 * The package is pure JavaScript. Unlike the specstory binary it contributes no
 * nested Mach-O, so it needs no `mac.binaries` row and no
 * `build/sign-nested-binaries.cjs` row. That claim is the reason this is cheap,
 * so {@link assertNoNativeCode} re-proves it on every build rather than trusting
 * the survey. A `.node`, `.dylib`, `.so`, `.wasm` or `binding.gyp` appearing in
 * a future version fails the build instead of silently shipping an unsigned
 * binary inside a signed app.
 *
 * ## The one directory name that is load bearing
 *
 * The tree MUST keep a directory literally named `node_modules`. `dist/cli.mjs`
 * imports `yaml` and `tar` by bare name and Node walks up the directory chain
 * looking for that exact name. Renaming it produces `ERR_MODULE_NOT_FOUND` at
 * run time and passes every check at pack time.
 *
 * ## Integrity
 *
 * The tarball is checked TWICE against the pin and both checks are fatal: the
 * sha512 `integrity` string npm publishes, and the sha1 `shasum`. Then the
 * installed tree is checked against `tree` in the pin, which names every
 * package and its exact version, so a drifted transitive fails the build rather
 * than entering the bundle. Then the trimmed tree is asked for its own version,
 * because a trim that breaks the CLI is exactly the mistake that passes every
 * static check.
 *
 * Offline / air-gapped: drop the npm tarball anywhere and point
 * `GMUX_SKILLS_TARBALL` at it. It is verified against the same pin, so the
 * escape hatch cannot smuggle a different build in. The two dependencies still
 * come from the registry on a cold vendor directory; once the tree is on disk
 * this script is network-free and idempotent.
 */

const { createHash } = require('node:crypto');
const {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, relative } = require('node:path');

/** Repo root — this file lives in <root>/build. */
const ROOT = join(__dirname, '..');

/** The pin. One source of truth, read here and nowhere else at build time. */
const PIN_PATH = join(__dirname, 'skills-release.json');

/**
 * What electron-builder copies, whole, to `Contents/Resources/skills-cli`.
 * Version-free ON PURPOSE, for the same reason the specstory vendor dir is: a
 * version inside a path in electron-builder.yml would be a second copy of the
 * pin that drifts on the first bump.
 */
const VENDOR_DIR = join(ROOT, 'build', 'vendor', 'skills');
/** Downloaded tarballs. OUTSIDE the vendor dir, because that dir ships whole. */
const CACHE_DIR = join(ROOT, 'build', 'vendor', 'skills-cache');
/** Spawn-free version metadata — read by src/main/skills/resolve.ts. */
const META_NAME = 'skills.json';

/** Files a shipped CLI does not need. Nothing here is code. */
const TRIM_SUFFIXES = ['.md', '.d.ts', '.d.mts', '.d.cts', '.map'];
/** Trimmed by suffix but kept anyway: the licence texts we are obliged to ship. */
const KEEP_NAMES = /^(licen[cs]e|copying|notice|thirdpartynotice)/i;

/** Anything here means the "no new signing obligation" claim has expired. */
const NATIVE_SUFFIXES = ['.node', '.dylib', '.so', '.wasm'];
const NATIVE_NAMES = new Set(['binding.gyp']);

function sha512Base64(path) {
  return createHash('sha512').update(readFileSync(path)).digest('base64');
}

function sha1Hex(path) {
  return createHash('sha1').update(readFileSync(path)).digest('hex');
}

function readPin() {
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));
  for (const field of ['package', 'version', 'entry', 'integrity', 'shasum']) {
    if (typeof pin[field] !== 'string' || pin[field].length === 0) {
      throw new Error(`build/skills-release.json is missing "${field}" — the pin is incomplete.`);
    }
  }
  if (typeof pin.tree !== 'object' || pin.tree === null) {
    throw new Error('build/skills-release.json is missing "tree" — the pin is incomplete.');
  }
  return pin;
}

/** Where the vendored tree and its metadata live (also mirrored by the resolver). */
function vendoredPaths(pin = readPin()) {
  return {
    dir: VENDOR_DIR,
    entry: join(VENDOR_DIR, ...pin.entry.split('/')),
    meta: join(VENDOR_DIR, META_NAME)
  };
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status} ${res.statusText}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Every file under `dir`, absolute, depth first. */
function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * Fail the build if the vendored tree carries anything that would have to be
 * signed. See the header: this is the claim the whole distribution choice rests
 * on, so it is re-proven per build.
 */
function assertNoNativeCode(dir) {
  const offenders = walkFiles(dir).filter((file) => {
    const name = file.slice(file.lastIndexOf('/') + 1).toLowerCase();
    if (NATIVE_NAMES.has(name)) return true;
    return NATIVE_SUFFIXES.some((suffix) => name.endsWith(suffix));
  });
  if (offenders.length > 0) {
    throw new Error(
      `the skills CLI tree now carries native code, so it can no longer ship unsigned:\n` +
        offenders.map((f) => `  ${relative(ROOT, f)}`).join('\n') +
        `\nAdd it to electron-builder.yml mac.binaries and build/sign-nested-binaries.cjs, ` +
        `then update the note in build/skills-release.json.`
    );
  }
}

/** Every installed package and its version, including scoped ones. */
function installedTree(modulesDir) {
  const found = {};
  const scan = (dir, prefix) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (prefix === '' && entry.name.startsWith('@')) {
        scan(join(dir, entry.name), `${entry.name}/`);
        continue;
      }
      const manifest = join(dir, entry.name, 'package.json');
      if (!existsSync(manifest)) continue;
      found[prefix + entry.name] = JSON.parse(readFileSync(manifest, 'utf8')).version;
    }
  };
  scan(modulesDir, '');
  return found;
}

/**
 * The installed set must equal the pinned set exactly — no missing package, no
 * extra package, no changed version. An extra package is the interesting case:
 * it is how a new transitive would arrive without anybody deciding to accept it.
 */
function assertTreeMatchesPin(pin, modulesDir) {
  const found = installedTree(modulesDir);
  const problems = [];
  for (const [name, want] of Object.entries(pin.tree)) {
    if (found[name] === undefined) problems.push(`missing ${name}@${want}`);
    else if (found[name] !== want) problems.push(`${name} is ${found[name]}, pin says ${want}`);
  }
  for (const name of Object.keys(found)) {
    if (pin.tree[name] === undefined) problems.push(`unpinned package ${name}@${found[name]}`);
  }
  if (problems.length > 0) {
    throw new Error(
      `the skills CLI dependency tree does not match build/skills-release.json:\n` +
        problems.map((p) => `  ${p}`).join('\n') +
        `\nRe-pin deliberately: update "tree" after reading what changed.`
    );
  }
}

/** Documentation, type declarations and source maps. Never code, never licences. */
function trim(dir) {
  let removed = 0;
  for (const file of walkFiles(dir)) {
    const name = file.slice(file.lastIndexOf('/') + 1);
    if (KEEP_NAMES.test(name)) continue;
    if (!TRIM_SUFFIXES.some((suffix) => name.toLowerCase().endsWith(suffix))) continue;
    unlinkSync(file);
    removed += 1;
  }
  return removed;
}

/**
 * Ask the trimmed tree what version it is, under an isolated HOME so a build
 * can never touch the person's own agent configuration. This is the check that
 * catches a trim which removed something the CLI actually loads — a mistake no
 * static check sees, because the file list still looks right.
 */
function assertRuns(entry, expectedVersion) {
  const home = mkdtempSync(join(tmpdir(), 'gmux-skills-probe-'));
  try {
    const stdout = execFileSync(process.execPath, [entry, '--version'], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: home,
      env: {
        ...process.env,
        HOME: home,
        XDG_STATE_HOME: join(home, 'state'),
        DO_NOT_TRACK: '1'
      }
    });
    const got = stdout.trim();
    if (got !== expectedVersion) {
      throw new Error(
        `the vendored skills CLI reports "${got}", pin says "${expectedVersion}"`
      );
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function totalBytes(dir) {
  return walkFiles(dir).reduce((sum, file) => sum + statSync(file).size, 0);
}

/**
 * Ensure build/vendor/skills holds the pinned CLI, trimmed, verified and with
 * its metadata sidecar. Idempotent and network-free once the sidecar on disk
 * already names the pinned version and the entry point still runs.
 *
 * @returns {Promise<{dir: string, entry: string, meta: string, version: string, cached: boolean}>}
 */
async function ensureSkillsCli({ log = console.log } = {}) {
  const pin = readPin();
  const out = vendoredPaths(pin);

  if (existsSync(out.entry) && existsSync(out.meta)) {
    let declared = null;
    try {
      declared = JSON.parse(readFileSync(out.meta, 'utf8')).version;
    } catch {
      declared = null;
    }
    if (declared === pin.version) {
      log(`  • skills ${pin.version} already vendored (${out.dir})`);
      return { ...out, version: pin.version, cached: true };
    }
    log('  • vendored skills CLI does not match the pin — refetching');
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const tarball =
    process.env['GMUX_SKILLS_TARBALL'] ??
    join(CACHE_DIR, `${pin.package}-${pin.version}.tgz`);

  if (!existsSync(tarball)) {
    const url = `https://registry.npmjs.org/${pin.package}/-/${pin.package}-${pin.version}.tgz`;
    log(`  • downloading ${url}`);
    await download(url, tarball);
  }

  // Two hashes, both fatal, both from the registry's own metadata.
  const integrity = `sha512-${sha512Base64(tarball)}`;
  if (integrity !== pin.integrity) {
    if (tarball.startsWith(CACHE_DIR)) rmSync(tarball, { force: true });
    throw new Error(
      `skills ${pin.version} tarball integrity mismatch\n` +
        `  expected ${pin.integrity}\n  actual   ${integrity}\n  file     ${tarball}`
    );
  }
  const shasum = sha1Hex(tarball);
  if (shasum !== pin.shasum) {
    if (tarball.startsWith(CACHE_DIR)) rmSync(tarball, { force: true });
    throw new Error(
      `skills ${pin.version} tarball shasum mismatch\n` +
        `  expected ${pin.shasum}\n  actual   ${shasum}\n  file     ${tarball}`
    );
  }

  rmSync(VENDOR_DIR, { recursive: true, force: true });
  mkdirSync(VENDOR_DIR, { recursive: true });
  // A package.json of our own, so npm installs INTO this directory instead of
  // walking up and adopting the repo root's manifest.
  writeFileSync(
    join(VENDOR_DIR, 'package.json'),
    JSON.stringify(
      { name: 'tortie-skills-cli', version: '0.0.0', private: true, description: pin.note },
      null,
      2
    ) + '\n'
  );

  // `--ignore-scripts` is not optional: eight packages with no native build
  // step have no legitimate reason to run an install script inside our build.
  log(`  • installing ${pin.package}@${pin.version} into ${relative(ROOT, VENDOR_DIR)}`);
  execFileSync(
    'npm',
    [
      'install',
      tarball,
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--loglevel=error'
    ],
    { cwd: VENDOR_DIR, stdio: 'pipe', encoding: 'utf8' }
  );

  const modules = join(VENDOR_DIR, 'node_modules');
  if (!existsSync(modules)) {
    throw new Error(`npm produced no node_modules in ${VENDOR_DIR}`);
  }
  assertTreeMatchesPin(pin, modules);
  assertNoNativeCode(modules);

  if (!existsSync(out.entry)) {
    throw new Error(`the pinned entry point is missing: ${out.entry}`);
  }
  // The two bare-name imports in dist/cli.mjs. If Node cannot walk up to these
  // the CLI dies with ERR_MODULE_NOT_FOUND at run time and nothing before that
  // notices.
  for (const dep of ['yaml', 'tar']) {
    if (!existsSync(join(modules, dep, 'package.json'))) {
      throw new Error(`the vendored tree has no node_modules/${dep} — bare-name imports will fail`);
    }
  }

  const before = totalBytes(modules);
  const removed = trim(modules);
  const after = totalBytes(modules);
  assertRuns(out.entry, pin.version);

  writeFileSync(
    out.meta,
    JSON.stringify(
      {
        // Read at runtime by src/main/skills/resolve.ts so Settings can name the
        // bundled version without spawning anything.
        version: pin.version,
        package: pin.package,
        entry: pin.entry,
        source: `https://registry.npmjs.org/${pin.package}/-/${pin.package}-${pin.version}.tgz`,
        integrity: pin.integrity,
        shasum: pin.shasum,
        compatBand: pin.compatBand,
        lockVersions: pin.lockVersions,
        vendoredAt: new Date().toISOString()
      },
      null,
      2
    ) + '\n'
  );

  log(
    `  • skills ${pin.version} vendored → ${relative(ROOT, out.dir)} ` +
      `(${Math.round(after / 1024)} KB, trimmed ${removed} files / ` +
      `${Math.round((before - after) / 1024)} KB)`
  );
  return { ...out, version: pin.version, cached: false };
}

module.exports = { ensureSkillsCli, vendoredPaths, readPin, META_NAME, VENDOR_DIR };

if (require.main === module) {
  ensureSkillsCli().catch((err) => {
    console.error(`fetch-skills: ${err.message}`);
    process.exit(1);
  });
}
