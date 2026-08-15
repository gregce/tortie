#!/usr/bin/env node
/**
 * build-tmux.mjs — build the pinned tmux from source so it can ride inside
 * Tortie.app.
 *
 * Phase 41. `electron-builder.yml` copies `build/vendor/tmux/bin/tmux` into
 * `Tortie.app/Contents/Resources/bin/tmux`; THIS script is what puts a binary
 * there. It runs automatically from the `beforePack` hook
 * (build/before-pack.cjs) and can be run by hand: `npm run vendor:tmux`.
 *
 * WHY TMUX IS IN THE BUNDLE AT ALL. The private tmux server on socket
 * `-L gmux` is the durability layer. Every session lives in it and the app is
 * a disposable client. Until this phase the binary was whatever Homebrew had
 * installed, which cost three things. A fresh Mac could not run Tortie without
 * installing Homebrew and then tmux. A routine `brew upgrade` replaced the
 * durability layer under the product with no test and no warning. macOS
 * attributes file access grants to the responsible process, and a Homebrew
 * tmux changes identity on every upgrade. docs/research/43-bundled-tmux.md
 * measured all three and section 1 is the decision.
 *
 * WHY THIS BUILDS INSTEAD OF DOWNLOADING, unlike build/fetch-specstory.cjs.
 * tmux publishes source tarballs and no macOS binary. So the integrity gate is
 * on the THREE SOURCE TARBALLS, each pinned by SHA-256 in
 * build/tmux-release.json and verified before it is unpacked. The built
 * binary's own hash is NOT a gate, and that is deliberate: the compiler, the
 * SDK and the linker decide those bytes, so a hash gate would fail on a
 * different machine for no defect. What is gated on the built binary is its
 * behaviour, in assertBinary() below.
 *
 * WHAT IS LINKED IN, and what is not:
 *   - libevent 2.1.12-stable, built static, so no dylib has to travel.
 *   - utf8proc 2.10.0, built static. tmux's configure STOPS with an error on
 *     macOS unless it is given --enable-utf8proc or --disable-utf8proc,
 *     because Apple's libc wide character tables are outdated. Homebrew builds
 *     with utf8proc, which is what the fleet runs today, so this build does
 *     too.
 *   - ncurses comes from the operating system. `PKG_CONFIG_LIBDIR` is REPLACED
 *     with the two prefixes this script builds, so pkg-config cannot see
 *     Homebrew at all, and tmux's configure falls through to its own
 *     AC_SEARCH_LIBS, which finds Apple's /usr/lib/libncurses. No ncurses is
 *     built and none is bundled.
 *
 * Offline / air-gapped: put the three tarballs in one directory and point
 * `GMUX_TMUX_TARBALL_DIR` at it. Each one is verified against the same pinned
 * hash, so the escape hatch cannot smuggle different sources in. There is
 * deliberately NO "just use this binary" override, because that would defeat
 * the pin.
 *
 * `build/vendor/` is already gitignored (line 22), so the output tree needs no
 * new rule.
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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root — this file lives in <root>/build. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The pin. One source of truth, read here and by build/check-tmux-pin.cjs. */
const PIN_PATH = join(ROOT, 'build', 'tmux-release.json');

/** Everything vendored lands under here; the whole dir is gitignored. */
const VENDOR_DIR = join(ROOT, 'build', 'vendor', 'tmux');
/** Downloaded tarballs, kept so a rebuild costs no network. */
const CACHE_DIR = join(VENDOR_DIR, 'cache');
/** The scratch build tree. Removed and rebuilt on every real build. */
const WORK_DIR = join(VENDOR_DIR, 'work');
/**
 * What electron-builder copies. Version-free ON PURPOSE: the pin lives in one
 * JSON file, and a version inside a path in electron-builder.yml would be a
 * second copy of it that drifts on the first bump.
 */
const BIN_DIR = join(VENDOR_DIR, 'bin');
/** The bundled binary's own name inside the app — see src/main/tmux/resolve.ts. */
const BIN_NAME = 'tmux';

/** The private server config, applied by the scratch-server assertion. */
const CONF_PATH = join(ROOT, 'resources', 'gmux-tmux.conf');
/** What that conf declares, re-read here so the two cannot drift. */
const CONF_HISTORY_LIMIT = 25_000;

/** The build is arm64 only, matching the app's own target. */
const ARCH = 'arm64';
/** make -j8 on a 12 core machine. Measured at about two minutes end to end. */
const JOBS = '8';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readPin() {
  const pin = JSON.parse(readFileSync(PIN_PATH, 'utf8'));
  for (const name of ['tmux', 'libevent', 'utf8proc']) {
    const source = pin.sources?.[name];
    if (source === undefined || typeof source.url !== 'string' || typeof source.sha256 !== 'string') {
      throw new Error(
        `build/tmux-release.json has no complete "${name}" source entry — the pin is incomplete.`
      );
    }
  }
  if (typeof pin.version !== 'string') {
    throw new Error('build/tmux-release.json has no "version" — the pin is incomplete.');
  }
  return pin;
}

/** Where the vendored copy lives (also used by electron-builder.yml). */
function vendoredPaths() {
  return { dir: BIN_DIR, bin: join(BIN_DIR, BIN_NAME) };
}

// ---------------------------------------------------------------------------
// Running commands
// ---------------------------------------------------------------------------

/**
 * Run a build command and throw with the tail of its output on failure.
 *
 * TMUX is removed from the child environment. A build started from inside a
 * tmux session would otherwise hand the compiler and the scratch server a
 * variable that means "you are already attached somewhere".
 */
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

/** Read one line of output from a tool, or null when the tool failed. */
function readLine(cmd, args) {
  const child = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (child.status !== 0) return null;
  return (child.stdout ?? '').trim();
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

async function download(url, dest) {
  // Node 22 global fetch follows GitHub's redirect to objects.githubusercontent.
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status} ${res.statusText}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * Put one verified tarball in the cache and return its path.
 *
 * A hash mismatch is fatal and never a warning. The bad file is removed from
 * the cache first, so the next build does not inherit it.
 */
async function ensureTarball(name, source, log) {
  const fileName = source.url.split('/').pop();
  const cached = join(CACHE_DIR, fileName);

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
  return cached;
}

/** Unpack a tarball into `WORK_DIR` and return the directory it created. */
function unpack(tarball, expectedDir, log) {
  const dir = join(WORK_DIR, expectedDir);
  rmSync(dir, { recursive: true, force: true });
  execFileSync('/usr/bin/tar', ['xzf', tarball, '-C', WORK_DIR], { stdio: 'pipe' });
  if (!existsSync(dir)) {
    throw new Error(`${tarball} did not unpack to ${dir}`);
  }
  log(`  • unpacked ${expectedDir}`);
  return dir;
}

// ---------------------------------------------------------------------------
// The compile
// ---------------------------------------------------------------------------

/**
 * Build libevent static into its own prefix.
 *
 * `--disable-shared` is what keeps a dylib out of the app. The other three
 * flags remove work nothing here needs: OpenSSL support, the sample programs
 * and the regression suite.
 */
function buildLibevent(pin, prefix, log) {
  const dir = unpack(join(CACHE_DIR, pin.sources.libevent.url.split('/').pop()), `libevent-${pin.sources.libevent.version}`, log);
  const env = { CC: `cc -arch ${ARCH}` };
  run('./configure', [
    `--prefix=${prefix}`,
    '--disable-shared',
    '--enable-static',
    '--disable-openssl',
    '--disable-samples',
    '--disable-libevent-regress'
  ], { cwd: dir, env, label: 'libevent configure' });
  run('make', ['-j', JOBS], { cwd: dir, env, label: 'libevent make' });
  run('make', ['install'], { cwd: dir, env, label: 'libevent install' });
  log(`  • libevent ${pin.sources.libevent.version} built static`);
}

/**
 * Build utf8proc static into its own prefix.
 *
 * Its Makefile has no configure and always installs the shared library beside
 * the archive, so the dylib and its symlink are removed straight afterwards.
 * If they stayed, the tmux link could pick the shared copy and the app would
 * ship a binary that needs a file the bundle does not carry.
 */
function buildUtf8proc(pin, prefix, log) {
  const dir = unpack(join(CACHE_DIR, pin.sources.utf8proc.url.split('/').pop()), `utf8proc-${pin.sources.utf8proc.version}`, log);
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
  log(`  • utf8proc ${pin.sources.utf8proc.version} built static, ${removed} dylib files removed`);
}

/**
 * Build tmux against the two static prefixes and return the installed path.
 *
 * `PKG_CONFIG_LIBDIR` REPLACES the pkg-config search path rather than
 * prepending to it, which is the line that keeps Homebrew out of the link.
 * The otool assertion below is what proves it worked.
 */
function buildTmux(pin, prefixes, log) {
  const dir = unpack(join(CACHE_DIR, pin.sources.tmux.url.split('/').pop()), `tmux-${pin.version}`, log);
  const outPrefix = join(WORK_DIR, 'out');
  const env = {
    CC: `cc -arch ${ARCH}`,
    PKG_CONFIG_LIBDIR: `${join(prefixes.libevent, 'lib', 'pkgconfig')}:${join(prefixes.utf8proc, 'lib', 'pkgconfig')}`
  };
  run('./configure', [`--prefix=${outPrefix}`, '--enable-utf8proc'], {
    cwd: dir,
    env,
    label: 'tmux configure'
  });
  run('make', ['-j', JOBS], { cwd: dir, env, label: 'tmux make' });
  run('make', ['install'], { cwd: dir, env, label: 'tmux install' });
  const built = join(outPrefix, 'bin', 'tmux');
  if (!existsSync(built)) throw new Error(`tmux make install produced no ${built}`);
  log(`  • tmux ${pin.version} built, ${String(statSync(built).size)} bytes before strip`);
  return built;
}

// ---------------------------------------------------------------------------
// The five assertions on the built binary
// ---------------------------------------------------------------------------

/** The four Mach-O magics, both byte orders, plus the universal-binary magic. */
const MACH_O_MAGICS = new Set([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe]);

function isMachO(path) {
  const head = readFileSync(path).subarray(0, 4);
  if (head.length < 4) return false;
  return MACH_O_MAGICS.has(head.readUInt32BE(0));
}

/**
 * Start a server with the built binary on a scratch socket, read three things
 * back, and end it.
 *
 * SAFETY. The socket name is built here and checked again immediately before
 * every kill-server, so this function cannot reach socket `gmux`, where the
 * operator's live sessions are. The scratch server is ended in a finally
 * block, so a failed assertion still leaves nothing running.
 */
function assertRunsAServer(bin, pin, log) {
  const socket = `gmux-p41-build-${String(process.pid)}`;
  if (!socket.startsWith('gmux-p41-build-')) {
    throw new Error('refusing to start a server on a socket this script did not name');
  }
  const tmux = (args) => readLine(bin, ['-L', socket, '-f', CONF_PATH, ...args]);
  const endServer = () => {
    if (!socket.startsWith('gmux-p41-build-')) return null;
    const socketPath = tmux(['display-message', '-p', '#{socket_path}']);
    const killed = spawnSync(bin, ['-L', socket, 'kill-server'], {
      encoding: 'utf8',
      env: { ...process.env, TMUX: undefined },
      timeout: 20_000
    });
    if (socketPath !== null && socketPath.endsWith(`/${socket}`)) {
      rmSync(socketPath, { force: true });
    }
    return { socketPath, status: killed.status };
  };

  try {
    const created = spawnSync(
      bin,
      ['-L', socket, '-f', CONF_PATH, 'new-session', '-d', '-s', 'p41-build', 'sleep 120'],
      { encoding: 'utf8', env: { ...process.env, TMUX: undefined }, timeout: 20_000 }
    );
    if (created.status !== 0) {
      throw new Error(
        `the built tmux could not create a session on ${socket}. ${created.stderr ?? ''}`
      );
    }

    const version = tmux(['display-message', '-p', '#{version}']);
    if (version !== pin.version) {
      throw new Error(
        `the scratch server reports version "${String(version)}", the pin says "${pin.version}"`
      );
    }

    const historyLimit = tmux(['show-options', '-gv', 'history-limit']);
    if (historyLimit !== String(CONF_HISTORY_LIMIT)) {
      throw new Error(
        `resources/gmux-tmux.conf declares history-limit ${String(CONF_HISTORY_LIMIT)} ` +
          `and the scratch server read back "${String(historyLimit)}", so the conf did not apply`
      );
    }

    const ended = endServer();
    if (ended === null || ended.status !== 0) {
      throw new Error(`kill-server on ${socket} exited ${String(ended?.status)}`);
    }
    if (ended.socketPath !== null && existsSync(ended.socketPath)) {
      throw new Error(`the socket file ${ended.socketPath} is still there after kill-server`);
    }
    log(
      `  • scratch server on ${socket}: version ${version}, history-limit ${historyLimit}, ` +
        'kill-server exited 0 and the socket file is gone'
    );
  } finally {
    // Belt and braces. A throw above may have left the server running, and it
    // must never outlive this script.
    endServer();
  }
}

/** The five gates on the built binary. Any one of them fails the build. */
function assertBinary(bin, pin, log) {
  const version = readLine(bin, ['-V']);
  if (version !== `tmux ${pin.version}`) {
    throw new Error(`${bin} -V printed "${String(version)}", expected "tmux ${pin.version}"`);
  }

  if (!isMachO(bin)) {
    throw new Error(`${bin} is not a Mach-O executable`);
  }

  const archs = readLine('/usr/bin/lipo', ['-archs', bin]);
  if (archs !== ARCH) {
    throw new Error(`lipo -archs says "${String(archs)}", expected exactly "${ARCH}"`);
  }

  const linked = readLine('/usr/bin/otool', ['-L', bin]);
  if (linked === null) throw new Error(`otool -L ${bin} failed`);
  const strays = linked
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(' ')[0])
    .filter((path) => path !== '' && !path.startsWith('/usr/lib/'));
  if (strays.length > 0) {
    throw new Error(
      'the built tmux links libraries outside /usr/lib, which means something ' +
        'leaked out of Homebrew into the link and the app would ship a binary ' +
        `that needs files it does not carry:\n  ${strays.join('\n  ')}`
    );
  }
  log(`  • links only /usr/lib: ${linked.split('\n').slice(1).length} entries`);

  assertRunsAServer(bin, pin, log);
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/**
 * Ensure build/vendor/tmux/bin holds the pinned tmux.
 *
 * Idempotent and network-free once a binary on disk already reports the pinned
 * version. That fast path is what keeps a second `npm run package` from paying
 * the two minute compile again.
 *
 * @returns {Promise<{dir: string, bin: string, version: string, bytes: number, cached: boolean}>}
 */
export async function ensureTmuxBinary({ log = console.log } = {}) {
  const pin = readPin();
  const out = vendoredPaths();

  if (existsSync(out.bin) && (statSync(out.bin).mode & 0o111) !== 0) {
    if (readLine(out.bin, ['-V']) === `tmux ${pin.version}`) {
      const bytes = statSync(out.bin).size;
      log(`  • tmux ${pin.version} already built (${out.bin}, ${String(bytes)} bytes)`);
      return { ...out, version: pin.version, bytes, cached: true };
    }
    log('  • the vendored tmux does not report the pinned version — rebuilding');
  }

  if (process.platform !== 'darwin') {
    throw new Error('build-tmux: the bundled tmux is built for macOS only');
  }
  if (readLine('/usr/bin/which', ['pkg-config']) === null) {
    throw new Error(
      'build-tmux: pkg-config is not on PATH. tmux\'s configure needs it to ' +
        'find the libevent and utf8proc this script builds. Install it with ' +
        '"brew install pkg-config".'
    );
  }

  const started = Date.now();
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const [name, source] of Object.entries(pin.sources)) {
    await ensureTarball(name, source, log);
  }

  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
  const prefixes = {
    libevent: join(WORK_DIR, 'deps-libevent'),
    utf8proc: join(WORK_DIR, 'deps-utf8proc')
  };
  buildLibevent(pin, prefixes.libevent, log);
  buildUtf8proc(pin, prefixes.utf8proc, log);
  const built = buildTmux(pin, prefixes, log);

  mkdirSync(out.dir, { recursive: true });
  const staged = join(WORK_DIR, 'tmux-stripped');
  copyFileSync(built, staged);
  run('/usr/bin/strip', [staged], { cwd: WORK_DIR, label: 'strip' });
  chmodSync(staged, 0o755);
  assertBinary(staged, pin, log);

  copyFileSync(staged, out.bin);
  chmodSync(out.bin, 0o755);
  const bytes = statSync(out.bin).size;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  log(
    `  • tmux ${pin.version} built → ${out.bin} (${String(bytes)} bytes, ${seconds} s). ` +
      `The pin records about ${String(pin.expected?.binaryBytesApprox ?? 0)} bytes, which is ` +
      'informational and not a gate, because the compiler and the SDK decide those bytes.'
  );
  return { ...out, version: pin.version, bytes, cached: false };
}

export { readPin, vendoredPaths, BIN_NAME, PIN_PATH };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureTmuxBinary().catch((err) => {
    console.error(`build-tmux: ${err.message}`);
    process.exit(1);
  });
}
