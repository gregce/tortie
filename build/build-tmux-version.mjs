#!/usr/bin/env node
/**
 * build-tmux-version.mjs — build a tmux version that exists only so a probe can
 * MEASURE it (Phase 83).
 *
 * Usage: `node build/build-tmux-version.mjs 3.7c`
 *
 * WHY THIS IS A SECOND BUILDER RATHER THAN A FLAG ON THE FIRST ONE.
 * `build/build-tmux.mjs` builds the copy of tmux that rides inside Tortie.app.
 * That copy is pinned in `build/tmux-release.json`, it is signed, and moving it
 * changes what every person's durability layer runs. This script builds a
 * SERVER Tortie talks to on another machine. Those two jobs have different
 * risks, so they have different pins, different output directories and
 * different scripts. Adding a version here can never move the version Tortie
 * ships.
 *
 * THE SIX RULES, and every one of them is checked in code below.
 *
 *  1. It writes only under `build/vendor/tmux-probe/<version>/`. It never
 *     writes to `build/vendor/tmux/`, which is where the shipped binary lives,
 *     and `assertNotShipVendor` proves that before anything is created.
 *  2. It refuses a version that is not a key of
 *     `build/tmux-probe-versions.json`.
 *  3. It verifies every tarball against its pinned sha256 and refuses on a
 *     mismatch, printing both hashes.
 *  4. It builds libevent and utf8proc from the SHIP pin's entries, into their
 *     own scratch prefixes, so those two libraries are pinned in exactly one
 *     file. `readPin` is imported from `build/build-tmux.mjs`. The three build
 *     functions there are not exported, so `buildLibevent`, `buildUtf8proc` and
 *     `buildTmuxVersion` below are COPIES of them, changed only where the tmux
 *     version comes from the probe pin rather than the ship pin. They were
 *     copied because the export surface of `build/build-tmux.mjs` does not
 *     offer them, and Phase 83 may not edit that file.
 *  5. It prints the built binary's path, its size in bytes and the output of
 *     `<bin> -V`, and it fails when `-V` does not print exactly
 *     `tmux <version>`.
 *  6. It starts a scratch tmux server on a socket named `p83-<version>-<pid>`
 *     with `-f /dev/null`, reads `display-message -p '#{version}'`, prints it,
 *     and kills that server by the pid the server itself reported. It refuses
 *     to run at all when the socket it would use is `gmux` or `default`, using
 *     `refuseRealSockets` from `build/scratch-machine.mjs`.
 *
 * The output tree needs no new `.gitignore` line, because `build/vendor/` is
 * already ignored whole.
 */

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPin } from './build-tmux.mjs';
import { refuseRealSockets } from './scratch-machine.mjs';

/** Repo root — this file lives in <root>/build. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The probe pin. Nothing in it is ever bundled. */
const PROBE_PIN_PATH = join(ROOT, 'build', 'tmux-probe-versions.json');

/** Where the SHIPPED binary lives. This script must never write inside it. */
const SHIP_VENDOR_DIR = join(ROOT, 'build', 'vendor', 'tmux');

/** Everything this script builds lands under here. Already gitignored. */
const PROBE_ROOT = join(ROOT, 'build', 'vendor', 'tmux-probe');

/** Downloaded tarballs, shared by every probe version, kept so a rebuild costs no network. */
const CACHE_DIR = join(PROBE_ROOT, 'cache');

/** The build is arm64 only, matching the machine this repository is built on. */
const ARCH = 'arm64';
/** make -j8 on a 12 core machine. */
const JOBS = '8';

const log = (text) => process.stdout.write(`${text}\n`);

// ---------------------------------------------------------------------------
// Rule 1. Nothing this script writes may land inside the ship vendor directory
// ---------------------------------------------------------------------------

function assertNotShipVendor(path) {
  const full = resolve(path);
  if (full === SHIP_VENDOR_DIR || full.startsWith(`${SHIP_VENDOR_DIR}${sep}`)) {
    throw new Error(
      `refusing to write ${full}. That path is inside ${SHIP_VENDOR_DIR}, which ` +
        'holds the tmux copy Tortie ships. This script builds servers a probe ' +
        'measures and it never touches the shipped binary.'
    );
  }
  return full;
}

// ---------------------------------------------------------------------------
// Rule 2. The version has to be a key of the probe pin
// ---------------------------------------------------------------------------

function readProbePin(version) {
  const pin = JSON.parse(readFileSync(PROBE_PIN_PATH, 'utf8'));
  const known = Object.keys(pin.versions ?? {});
  const entry = pin.versions?.[version];
  if (entry === undefined) {
    throw new Error(
      `${version} is not in build/tmux-probe-versions.json. Known versions: ` +
        `${known.join(', ') || 'none'}. Add the version with its url and its ` +
        'sha256 before building it.'
    );
  }
  if (typeof entry.url !== 'string' || typeof entry.sha256 !== 'string') {
    throw new Error(
      `the ${version} entry in build/tmux-probe-versions.json has no complete ` +
        'url and sha256 pair.'
    );
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Running commands. Copied from build/build-tmux.mjs, see rule 4
// ---------------------------------------------------------------------------

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(cmd, args, { cwd, env = {}, label }) {
  const child = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, TMUX: undefined, ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (child.error) {
    throw new Error(`${label}: ${cmd} could not be started. ${child.error.message}`);
  }
  if (child.status !== 0) {
    const output = `${child.stdout ?? ''}${child.stderr ?? ''}`;
    const tail = output.split('\n').slice(-40).join('\n');
    throw new Error(
      `${label}: ${cmd} ${args.join(' ')} exited ${String(child.status)}.\n` +
        `  in ${cwd}\n  last 40 lines:\n${tail}`
    );
  }
  return `${child.stdout ?? ''}`;
}

function readLine(cmd, args) {
  const child = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (child.status !== 0) return null;
  return (child.stdout ?? '').trim();
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status} ${res.statusText}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Rule 3. One verified tarball in the cache, or a refusal that prints both hashes. */
async function ensureTarball(name, source) {
  const fileName = source.url.split('/').pop();
  const cached = assertNotShipVendor(join(CACHE_DIR, fileName));

  if (!existsSync(cached)) {
    const offlineDir = process.env['GMUX_TMUX_TARBALL_DIR'];
    const offline = offlineDir === undefined ? null : join(offlineDir, fileName);
    if (offline !== null && existsSync(offline)) {
      log(`  • ${name}: using ${offline} from GMUX_TMUX_TARBALL_DIR`);
      copyFileSync(offline, cached);
    } else {
      log(`  • downloading ${source.url}`);
      await download(source.url, cached);
    }
  }

  const got = sha256(cached);
  if (got !== source.sha256) {
    rmSync(cached, { force: true });
    throw new Error(
      `${name} source tarball SHA-256 mismatch\n` +
        `  expected ${source.sha256}\n  actual   ${got}\n  file     ${cached}\n` +
        '  The pinned bytes are the gate. Do not re-record the hash to make ' +
        'this pass: a changed archive is either a regenerated tarball or a ' +
        'different file, and those need different answers.'
    );
  }
  log(`  • ${name}: sha256 ${got} matches the pin`);
  return cached;
}

function unpack(tarball, expectedDir, workDir) {
  const dir = assertNotShipVendor(join(workDir, expectedDir));
  rmSync(dir, { recursive: true, force: true });
  execFileSync('/usr/bin/tar', ['xzf', tarball, '-C', workDir], { stdio: 'pipe' });
  if (!existsSync(dir)) {
    throw new Error(`${tarball} did not unpack to ${dir}`);
  }
  log(`  • unpacked ${expectedDir}`);
  return dir;
}

// ---------------------------------------------------------------------------
// The compile. Copied from build/build-tmux.mjs, see rule 4
// ---------------------------------------------------------------------------

function buildLibevent(shipPin, prefix, workDir) {
  const dir = unpack(
    join(CACHE_DIR, shipPin.sources.libevent.url.split('/').pop()),
    `libevent-${shipPin.sources.libevent.version}`,
    workDir
  );
  const env = { CC: `cc -arch ${ARCH}` };
  run(
    './configure',
    [
      `--prefix=${prefix}`,
      '--disable-shared',
      '--enable-static',
      '--disable-openssl',
      '--disable-samples',
      '--disable-libevent-regress'
    ],
    { cwd: dir, env, label: 'libevent configure' }
  );
  run('make', ['-j', JOBS], { cwd: dir, env, label: 'libevent make' });
  run('make', ['install'], { cwd: dir, env, label: 'libevent install' });
  log(`  • libevent ${shipPin.sources.libevent.version} built static`);
}

function buildUtf8proc(shipPin, prefix, workDir) {
  const dir = unpack(
    join(CACHE_DIR, shipPin.sources.utf8proc.url.split('/').pop()),
    `utf8proc-${shipPin.sources.utf8proc.version}`,
    workDir
  );
  const env = { CC: `cc -arch ${ARCH}` };
  run('make', ['-j', JOBS, `prefix=${prefix}`, 'install'], {
    cwd: dir,
    env,
    label: 'utf8proc install'
  });
  const libDir = join(prefix, 'lib');
  let removed = 0;
  for (const entry of execFileSync('/bin/ls', [libDir], { encoding: 'utf8' }).split('\n')) {
    if (entry.endsWith('.dylib')) {
      rmSync(join(libDir, entry), { force: true });
      removed += 1;
    }
  }
  log(`  • utf8proc ${shipPin.sources.utf8proc.version} built static, ${removed} dylib files removed`);
}

function buildTmuxVersion(version, entry, prefixes, workDir) {
  const dir = unpack(join(CACHE_DIR, `tmux-${version}.tar.gz`), `tmux-${version}`, workDir);
  const outPrefix = assertNotShipVendor(join(workDir, 'out'));
  const env = {
    CC: `cc -arch ${ARCH}`,
    PKG_CONFIG_LIBDIR: `${join(prefixes.libevent, 'lib', 'pkgconfig')}:${join(prefixes.utf8proc, 'lib', 'pkgconfig')}`
  };
  // A version may need a configure flag the shipped one does not. The flags are
  // DATA in build/tmux-probe-versions.json rather than a branch here, so the
  // reason a version was configured a certain way sits beside its hash.
  const extra = Array.isArray(entry.configureArgs) ? entry.configureArgs : [];
  const args = [`--prefix=${outPrefix}`, '--enable-utf8proc', ...extra];
  if (extra.length > 0) {
    log(`  \u2022 extra configure flags from the probe pin: ${extra.join(' ')}`);
  }
  run('./configure', args, {
    cwd: dir,
    env,
    label: 'tmux configure'
  });
  run('make', ['-j', JOBS], { cwd: dir, env, label: 'tmux make' });
  run('make', ['install'], { cwd: dir, env, label: 'tmux install' });
  const built = join(outPrefix, 'bin', 'tmux');
  if (!existsSync(built)) throw new Error(`tmux make install produced no ${built}`);
  log(`  • tmux ${version} built, ${String(statSync(built).size)} bytes before strip`);
  return built;
}

// ---------------------------------------------------------------------------
// Rule 6. One scratch server, read, then ended by the pid it reported
// ---------------------------------------------------------------------------

/**
 * Start a server with the built binary on a scratch socket, read its
 * `#{version}` back, and end it by its own recorded pid.
 *
 * The socket name is composed here and handed to `refuseRealSockets` before
 * anything is started, so this function cannot reach socket `gmux`, where the
 * operator's live sessions are, or socket `default`, which is the person's own
 * tmux server.
 */
function assertRunsAServer(bin, version) {
  const socket = refuseRealSockets(
    `p83-${version}-${String(process.pid)}`,
    'p83-build-tmux-version'
  );
  const tmux = (args) => readLine(bin, ['-L', socket, '-f', '/dev/null', ...args]);
  let serverPid = null;

  const endServer = () => {
    if (serverPid === null) return;
    try {
      process.kill(serverPid, 'SIGTERM');
      log(`  • scratch server pid ${String(serverPid)} ended by this script`);
    } catch {
      /* it is already gone, which is the outcome this wanted */
    }
    serverPid = null;
  };

  try {
    const created = spawnSync(
      bin,
      ['-L', socket, '-f', '/dev/null', 'new-session', '-d', '-s', `p83-${version}`, 'sleep 120'],
      { encoding: 'utf8', env: { ...process.env, TMUX: undefined }, timeout: 20_000 }
    );
    if (created.status !== 0) {
      throw new Error(
        `the built tmux could not create a session on ${socket}. ${created.stderr ?? ''}`
      );
    }
    const pidText = tmux(['display-message', '-p', '#{pid}']);
    serverPid = pidText === null ? null : Number.parseInt(pidText, 10);
    if (serverPid === null || Number.isNaN(serverPid)) {
      throw new Error(`the scratch server on ${socket} did not report its pid`);
    }

    const reported = tmux(['display-message', '-p', '#{version}']);
    if (reported !== version) {
      throw new Error(
        `the scratch server reports version "${String(reported)}", the probe pin says "${version}"`
      );
    }
    log(
      `  • scratch server on socket ${socket}, pid ${String(serverPid)}: ` +
        `#{version} reads ${reported}`
    );
    return { socket, serverPid, reported };
  } finally {
    endServer();
  }
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/**
 * Build one probe-only tmux version and return where it landed.
 *
 * Idempotent and network-free once a binary on disk already reports the asked
 * for version.
 *
 * @returns {Promise<{version: string, bin: string, bytes: number, cached: boolean}>}
 */
export async function buildProbeTmux(version) {
  const entry = readProbePin(version);
  const shipPin = readPin();

  const versionDir = assertNotShipVendor(join(PROBE_ROOT, version));
  const binDir = assertNotShipVendor(join(versionDir, 'bin'));
  const outBin = assertNotShipVendor(join(binDir, 'tmux'));
  const workDir = assertNotShipVendor(join(versionDir, 'work'));

  if (existsSync(outBin) && (statSync(outBin).mode & 0o111) !== 0) {
    if (readLine(outBin, ['-V']) === `tmux ${version}`) {
      const bytes = statSync(outBin).size;
      log(`  • tmux ${version} already built (${outBin}, ${String(bytes)} bytes)`);
      assertRunsAServer(outBin, version);
      log(outBin);
      return { version, bin: outBin, bytes, cached: true };
    }
    log('  • the probe copy does not report the asked for version — rebuilding');
  }

  if (process.platform !== 'darwin') {
    throw new Error('build-tmux-version: this builds for macOS only');
  }
  if (readLine('/usr/bin/which', ['pkg-config']) === null) {
    throw new Error(
      'build-tmux-version: pkg-config is not on PATH. tmux\'s configure needs ' +
        'it to find the libevent and utf8proc this script builds. Install it ' +
        'with "brew install pkg-config".'
    );
  }

  const started = Date.now();
  mkdirSync(CACHE_DIR, { recursive: true });
  await ensureTarball('libevent', shipPin.sources.libevent);
  await ensureTarball('utf8proc', shipPin.sources.utf8proc);
  await ensureTarball(`tmux ${version}`, entry);
  // The probe pin's file name is whatever its url ends with; the compile step
  // looks for `tmux-<version>.tar.gz`, so refuse a url that does not agree.
  const tmuxTarball = join(CACHE_DIR, entry.url.split('/').pop());
  const expectedTarball = join(CACHE_DIR, `tmux-${version}.tar.gz`);
  if (tmuxTarball !== expectedTarball) {
    throw new Error(
      `the ${version} url ends with ${entry.url.split('/').pop()} and this ` +
        `script expects tmux-${version}.tar.gz.`
    );
  }

  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  const prefixes = {
    libevent: join(workDir, 'deps-libevent'),
    utf8proc: join(workDir, 'deps-utf8proc')
  };
  buildLibevent(shipPin, prefixes.libevent, workDir);
  buildUtf8proc(shipPin, prefixes.utf8proc, workDir);
  const built = buildTmuxVersion(version, entry, prefixes, workDir);

  mkdirSync(binDir, { recursive: true });
  const staged = assertNotShipVendor(join(workDir, 'tmux-stripped'));
  copyFileSync(built, staged);
  run('/usr/bin/strip', [staged], { cwd: workDir, label: 'strip' });
  chmodSync(staged, 0o755);

  // Rule 5. The three things this script promises to print.
  const printedVersion = readLine(staged, ['-V']);
  if (printedVersion !== `tmux ${version}`) {
    throw new Error(
      `${staged} -V printed "${String(printedVersion)}", expected "tmux ${version}"`
    );
  }
  copyFileSync(staged, outBin);
  chmodSync(outBin, 0o755);
  const bytes = statSync(outBin).size;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  log(`  • ${outBin}`);
  log(`  • ${String(bytes)} bytes, built in ${seconds} s`);
  log(`  • ${printedVersion}`);

  assertRunsAServer(outBin, version);
  log(outBin);
  return { version, bin: outBin, bytes, cached: false };
}

export { PROBE_PIN_PATH, PROBE_ROOT };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const asked = process.argv[2];
  if (asked === undefined || asked === '') {
    console.error('usage: node build/build-tmux-version.mjs <version>, e.g. 3.7c');
    process.exit(1);
  }
  buildProbeTmux(asked).catch((err) => {
    console.error(`build-tmux-version: ${err.message}`);
    process.exit(1);
  });
}
