#!/usr/bin/env node
/**
 * tmux-pair.mjs — drive the release's one tested tmux version pair, with a
 * real attach.
 *
 * Phase 41. Tortie now carries its own tmux and adopts it only when it creates
 * a server, so a warm server can be running an older tmux than the copy in the
 * bundle. docs/research/43-bundled-tmux.md measured that mixing is not safe in
 * general: one framing generation apart, a newer client can HANG on attach for
 * 60 s rather than fail. The product's answer is to accept exactly one pair per
 * release and refuse everything else. This harness is what turns "we tested
 * that pair" from a sentence into evidence, before the release ships.
 *
 * WHAT IT PROVES, and why control commands alone would not be enough. It
 * starts a warm server with the OLD tmux, then drives the app's own
 * `GMUX_SMOKE=create` and `GMUX_SMOKE=verify` halves against it with the NEW
 * tmux as the client. Those two halves create a durable session, receive
 * terminal bytes through a real node-pty attach, prove the session survived a
 * process restart, re-attach, and kill it. The hang the research measured is
 * an ATTACH failure, so an attach is the only honest test.
 *
 * TWO CALLERS, one shape:
 *   npm run conformance:tmux-pair              the cheap development loop, with
 *                                              the built binary as the client
 *   node build/update-rehearsal.mjs --tmux-pair  the packaged loop, with the
 *                                              app bundle's own tmux as the
 *                                              client
 *
 * SAFETY. This script starts tmux servers, so it carries its own rules rather
 * than relying on the app's. It only ever names sockets beginning `gmux-p41-`,
 * it checks that prefix again immediately before every kill-server, it never
 * runs pkill, and it never addresses socket `gmux`, where the operator's live
 * sessions are. It counts the operator's sessions before and after and fails
 * when the number moves. `execTmux` inside the app refuses kill-server on the
 * real socket already; this script is outside the app, so the refusal is
 * written here too.
 *
 * Usage:
 *   node build/tmux-pair.mjs [--pair-server-bin <path>] [--socket <name>]
 *                            [--scratch <dir>] [--keep-server]
 *
 *   --pair-server-bin  the OLD tmux that starts the warm server. Defaults to
 *                      /opt/homebrew/bin/tmux. Its -V must equal the pin's
 *                      testedPair.server, which is what keeps this harness
 *                      honest when Homebrew moves.
 *   --socket           the scratch socket. Must begin gmux-p41-.
 *   --scratch          where the isolated profile lives.
 *   --keep-server      leave the warm server running for inspection. The next
 *                      run refuses until it is gone, which is deliberate.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PIN = JSON.parse(readFileSync(join(ROOT, 'build', 'tmux-release.json'), 'utf8'));
const CONF_PATH = join(ROOT, 'resources', 'gmux-tmux.conf');
const BUILT_TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');

/** The operator's live server. Nothing here may ever address it. */
const OPERATOR_SOCKET = 'gmux';
/** Every socket this phase's harnesses use begins with this. */
const SOCKET_PREFIX = 'gmux-p41-';

/** The name of the session the warm server holds. The app must not touch it. */
const WARM_SESSION = 'p41-warm';

/** The line the app logs when it accepts the release's tested pair. */
const TESTED_PAIR_FRAGMENT = 'This pair is tested for this release.';
/** The line a packaged app logs when it refuses a binary override. */
const OVERRIDE_REFUSED_FRAGMENT = 'is ignored in a packaged Tortie';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function refuse(why) {
  console.error(`[tmux-pair] REFUSED. ${why}`);
  process.exit(2);
}

/**
 * A failed assertion.
 *
 * It THROWS rather than exiting, and that is not a style choice.
 * `process.exit` does not run `finally` blocks, so the first version of this
 * function left a scratch tmux server running behind every failure and the
 * next run refused to start. A failure has to tear down as carefully as a
 * pass does.
 */
class HarnessFailure extends Error {}

function fail(why) {
  throw new HarnessFailure(why);
}

const t0 = Date.now();
function log(msg) {
  console.log(`[tmux-pair ${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);
}

/** Run a tmux command on a scratch socket and return trimmed stdout, or null. */
function tmuxRead(bin, socket, args) {
  const child = spawnSync(bin, ['-L', socket, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (child.status !== 0) return null;
  return (child.stdout ?? '').trim();
}

/** How many sessions the operator has right now. Read only, never addressed again. */
function operatorSessionCount() {
  const child = spawnSync('tmux', ['-L', OPERATOR_SOCKET, 'list-sessions'], {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (child.status !== 0) return 0;
  return (child.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}

/**
 * End a scratch server and remove the socket file it leaves behind.
 *
 * The prefix is checked HERE, immediately before the kill, and not only where
 * the socket name was chosen. Research 19 records what the other order cost:
 * a harness whose isolation guard had already refused went on to end the
 * server it was refusing to touch.
 */
function endScratchServer(bin, socket) {
  if (socket === OPERATOR_SOCKET || !socket.startsWith(SOCKET_PREFIX)) {
    console.error(`[tmux-pair] not ending a server on "${socket}": it is not a p41 scratch socket.`);
    return null;
  }
  const socketPath = tmuxRead(bin, socket, ['display-message', '-p', '#{socket_path}']);
  spawnSync(bin, ['-L', socket, 'kill-server'], {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (socketPath !== null && socketPath.endsWith(`/${socket}`)) {
    rmSync(socketPath, { force: true });
  }
  return socketPath;
}

/** `tmux -V` on a binary, with no socket involved and no server contacted. */
function binaryVersion(bin) {
  const child = spawnSync(bin, ['-V'], {
    encoding: 'utf8',
    env: { ...process.env, TMUX: undefined },
    timeout: 20_000
  });
  if (child.status !== 0) return null;
  return (child.stdout ?? '').trim();
}

// ---------------------------------------------------------------------------
// Watching which tmux binary the client actually is
// ---------------------------------------------------------------------------

/**
 * Sample the process table while the app runs and record every tmux process
 * addressing the scratch socket.
 *
 * This is the evidence that the client really was the binary under test. The
 * attach host spawns `tmux -L <socket> … attach` under node-pty, so argv
 * carries both the socket name and the resolved binary path. Sampling is the
 * only way to see it: the process is gone by the time the app exits.
 */
function startClientWatcher(socket) {
  const seen = new Set();
  const timer = setInterval(() => {
    const child = spawnSync('/bin/ps', ['-Ao', 'args='], { encoding: 'utf8', timeout: 5_000 });
    if (child.status !== 0) return;
    for (const line of (child.stdout ?? '').split('\n')) {
      if (!line.includes(`-L ${socket}`)) continue;
      const argv0 = line.trim().split(' ')[0];
      if (argv0.endsWith('/tmux') || argv0 === 'tmux') seen.add(argv0);
    }
  }, 150);
  return {
    stop() {
      clearInterval(timer);
      return [...seen].sort();
    }
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * Drive one interop pair and report.
 *
 * @param {object} options
 * @param {(mode: string) => Promise<{output: string, code: number|null}>} options.launch
 *   runs one smoke half against the scratch socket and returns its combined
 *   output. The caller decides whether that is a development Electron or a
 *   packaged app, which is the only difference between the two callers.
 * @param {string} options.clientLabel  what the client is, for the report.
 * @param {(paths: string[]) => string|null} [options.checkClientPaths]
 *   returns a sentence when the sampled client paths are wrong, or null. It is
 *   given the sampled tmux paths with `pairServerBin` removed, because that one
 *   is the warm server itself and is there by construction.
 * @param {string[]} [options.extraFragments] log fragments that must appear.
 */
export async function runTmuxPair({
  pairServerBin,
  socket,
  launch,
  clientLabel,
  checkClientPaths,
  extraFragments = [],
  keepServer = false
}) {
  if (socket === OPERATOR_SOCKET || !socket.startsWith(SOCKET_PREFIX)) {
    refuse(`the socket must begin "${SOCKET_PREFIX}"; "${socket}" does not`);
  }

  const operatorBefore = operatorSessionCount();
  log(`operator sessions on socket ${OPERATOR_SOCKET} before the run. ${operatorBefore}`);

  // 2. The pair server binary must be the version the pin says was tested.
  if (!existsSync(pairServerBin)) {
    refuse(
      `the pair server binary ${pairServerBin} is not there. The pin's tested pair needs ` +
        `a tmux ${PIN.testedPair.server}. Pass --pair-server-bin <path> to name another one.`
    );
  }
  const serverBinVersion = binaryVersion(pairServerBin);
  const serverVersion = serverBinVersion === null ? null : serverBinVersion.replace(/^tmux /, '');
  if (serverVersion !== PIN.testedPair.server) {
    refuse(
      `${pairServerBin} reports "${String(serverBinVersion)}" and the pin's tested pair needs ` +
        `tmux ${PIN.testedPair.server}. Install that version or pass --pair-server-bin <path>.`
    );
  }
  log(`pair server binary ${pairServerBin} is tmux ${serverVersion}`);

  // Refuse a leftover server. It belongs to a run that did not clean up, and a
  // person should look at it before anything ends it.
  if (tmuxRead(pairServerBin, socket, ['list-sessions']) !== null) {
    refuse(
      `a tmux server is already running on -L ${socket}. Inspect it, then end it with ` +
        `"tmux -L ${socket} kill-server" and run again.`
    );
  }

  let created = false;
  try {
    // 3. The warm server, started by the OLD tmux, holding one running session.
    const start = spawnSync(
      pairServerBin,
      [
        '-L',
        socket,
        '-f',
        CONF_PATH,
        'new-session',
        '-d',
        '-s',
        WARM_SESSION,
        'while true; do date; sleep 1; done'
      ],
      { encoding: 'utf8', env: { ...process.env, TMUX: undefined }, timeout: 20_000 }
    );
    if (start.status !== 0) {
      fail(`could not start the warm server on ${socket}. ${start.stderr ?? ''}`);
    }
    created = true;

    const before = {
      version: tmuxRead(pairServerBin, socket, ['display-message', '-p', '#{version}']),
      startTime: tmuxRead(pairServerBin, socket, ['display-message', '-p', '#{start_time}']),
      sessions: (tmuxRead(pairServerBin, socket, ['list-sessions', '-F', '#{session_name}']) ?? '')
        .split('\n')
        .filter((line) => line !== '')
    };
    log(
      `warm server on ${socket}: version ${String(before.version)}, started ${String(before.startTime)}, ` +
        `${String(before.sessions.length)} session (${before.sessions.join(', ')})`
    );

    // 4. The two smoke halves, driven by the NEW tmux as the client.
    const watcher = startClientWatcher(socket);
    const createHalf = await launch('create');
    const verifyHalf = await launch('verify');
    const clientPaths = watcher.stop();

    for (const [name, half] of [
      ['create', createHalf],
      ['verify', verifyHalf]
    ]) {
      if (half.code !== 0) {
        console.error(half.output);
        fail(`the ${name} half exited ${String(half.code)} against the warm ${serverVersion} server`);
      }
    }
    const output = `${createHalf.output}\n${verifyHalf.output}`;

    const createBytes = /term data flowing: (\d+) bytes/.exec(createHalf.output);
    const verifyBytes = /re-attach works: (\d+) bytes/.exec(verifyHalf.output);
    if (createBytes === null || verifyBytes === null) {
      fail(
        'the smoke halves did not report byte counts, so no real attach was proven. ' +
          'The create half must print "term data flowing" and the verify half "re-attach works".'
      );
    }

    // 5. The app must have SAID it recognised the pair.
    if (!output.includes(TESTED_PAIR_FRAGMENT)) {
      fail(
        `the app never logged "${TESTED_PAIR_FRAGMENT}". Either the version gate did not run, ` +
          'or it took a different branch, so this run is not evidence about the tested pair.'
      );
    }
    const pairLine = output
      .split('\n')
      .find((line) => line.includes(TESTED_PAIR_FRAGMENT))
      .trim();
    if (!pairLine.includes(PIN.testedPair.server) || !pairLine.includes(PIN.testedPair.client)) {
      fail(
        `the tested pair line does not name both versions ${PIN.testedPair.server} and ` +
          `${PIN.testedPair.client}. It read: ${pairLine}`
      );
    }
    for (const fragment of extraFragments) {
      if (!output.includes(fragment)) {
        fail(`the app never logged "${fragment}".`);
      }
    }

    // Which binary the client actually was.
    //
    // The SERVER is on this socket too and it was started by pairServerBin, so
    // that path appears in the sample by construction and says nothing about
    // the client. What is left after removing it is the client side, and it is
    // the only part worth asserting on.
    log(`tmux processes sampled on ${socket}: ${clientPaths.join(', ') || 'none'}`);
    const clientOnly = clientPaths.filter((path) => path !== pairServerBin);
    if (clientOnly.length === 0) {
      fail(
        `every tmux process sampled on ${socket} was ${pairServerBin}, the binary that started ` +
          'the warm server, so this run cannot say which binary the client was. Either the app ' +
          'used the old tmux as its client, or the process table sampler missed the attach.'
      );
    }
    log(`client side, with the pair server binary removed: ${clientOnly.join(', ')}`);
    const complaint = checkClientPaths === undefined ? null : checkClientPaths(clientOnly);
    if (complaint !== null) fail(complaint);

    // 6. The old server must be untouched.
    const after = {
      version: tmuxRead(pairServerBin, socket, ['display-message', '-p', '#{version}']),
      startTime: tmuxRead(pairServerBin, socket, ['display-message', '-p', '#{start_time}']),
      sessions: (tmuxRead(pairServerBin, socket, ['list-sessions', '-F', '#{session_name}']) ?? '')
        .split('\n')
        .filter((line) => line !== '')
    };
    if (after.version !== before.version) {
      fail(`the warm server's version moved from ${String(before.version)} to ${String(after.version)}`);
    }
    if (after.startTime !== before.startTime) {
      fail(
        `the warm server restarted: start time moved from ${String(before.startTime)} to ` +
          `${String(after.startTime)}`
      );
    }
    if (!after.sessions.includes(WARM_SESSION)) {
      fail(`the session "${WARM_SESSION}" is gone from the warm server. Something ended it.`);
    }

    log('PASS. The release\'s tested tmux pair works, with a real attach.');
    log(`  server tmux ${String(before.version)}, client ${clientLabel}`);
    log(`  ${pairLine}`);
    log(`  create half: ${createBytes[1]} bytes arrived through a real attach`);
    log(`  verify half: ${verifyBytes[1]} bytes arrived after a process restart`);
    log(
      `  the warm server is unchanged: version ${String(after.version)}, start time ` +
        `${String(after.startTime)}, "${WARM_SESSION}" still running`
    );
    return { before, after, createBytes: Number(createBytes[1]), verifyBytes: Number(verifyBytes[1]), clientPaths, pairLine };
  } finally {
    if (created && !keepServer) {
      const socketPath = endScratchServer(pairServerBin, socket);
      log(
        `ended the warm server on ${socket}. Socket file ${String(socketPath)} ` +
          `${socketPath !== null && existsSync(socketPath) ? 'IS STILL THERE' : 'is gone'}.`
      );
    } else if (created) {
      log(`left the warm server running on ${socket}, as asked.`);
    }
    const operatorAfter = operatorSessionCount();
    log(`operator sessions on socket ${OPERATOR_SOCKET} after the run. ${operatorAfter}`);
    if (operatorAfter !== operatorBefore) {
      console.error(
        `[tmux-pair] FAIL. The operator session count moved from ${String(operatorBefore)} to ` +
          `${String(operatorAfter)}. Something touched the real server.`
      );
      process.exitCode = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// The development caller
// ---------------------------------------------------------------------------

/** Launch one smoke half in a development Electron, with the built tmux. */
function makeDevLaunch({ scratch, socket, clientBin }) {
  return (mode) =>
    // build/electron-run.mjs owns the launch (Phase 140) and ends the tree it
    // started in a finally block whatever happened.
    withElectron(
      {
        label: `tmux-pair ${mode}`,
        program: 'app',
        userDataDir: scratch,
        cwd: ROOT,
        env: {
          ...process.env,
          TMUX: undefined,
          GMUX_TMUX_SOCKET: socket,
          GMUX_TMUX_BIN: clientBin,
          GMUX_SMOKE: mode
        }
      },
      (handle) =>
        new Promise((done) => {
          const child = handle.child;
          let output = '';
          child.stdout.on('data', (chunk) => {
            output += String(chunk);
            process.stdout.write(chunk);
          });
          child.stderr.on('data', (chunk) => {
            output += String(chunk);
            process.stderr.write(chunk);
          });
          child.on('close', (code) => done({ output, code }));
        })
    );
}

async function main() {
  if (process.platform !== 'darwin') refuse('this harness drives a macOS app');

  const argv = process.argv.slice(2);
  const option = (name, fallback) => {
    const i = argv.indexOf(name);
    if (i === -1) return fallback;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) refuse(`${name} needs a value`);
    return value;
  };

  const pairServerBin = option('--pair-server-bin', '/opt/homebrew/bin/tmux');
  const socket = option('--socket', 'gmux-p41-pair');
  const scratch = option('--scratch', join(tmpdir(), 'gmux-p41-pair'));
  const keepServer = argv.includes('--keep-server');

  if (!existsSync(BUILT_TMUX)) {
    refuse(
      `${BUILT_TMUX} is not there. Run "npm run vendor:tmux" first; that is what builds the ` +
        'tmux this run uses as the client.'
    );
  }
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) {
    refuse('out/main/index.js is not there. Run "npm run build" first.');
  }

  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });

  const clientVersion = binaryVersion(BUILT_TMUX);
  if (clientVersion !== `tmux ${PIN.version}`) {
    refuse(
      `${BUILT_TMUX} reports "${String(clientVersion)}" and the pin says tmux ${PIN.version}. ` +
        'Run "npm run vendor:tmux" again.'
    );
  }
  log(`client binary ${BUILT_TMUX} is ${clientVersion}`);

  await runTmuxPair({
    pairServerBin,
    socket,
    keepServer,
    clientLabel: `${clientVersion} at ${BUILT_TMUX}`,
    launch: makeDevLaunch({ scratch, socket, clientBin: BUILT_TMUX }),
    checkClientPaths: (paths) =>
      paths.every((path) => path === BUILT_TMUX)
        ? null
        : `the client should have been ${BUILT_TMUX} and the process table also showed ${paths.join(', ')}`
  });

  rmSync(scratch, { recursive: true, force: true });
}

export {
  OPERATOR_SOCKET,
  SOCKET_PREFIX,
  OVERRIDE_REFUSED_FRAGMENT,
  BUILT_TMUX,
  PIN,
  HarnessFailure,
  endScratchServer,
  operatorSessionCount
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    // A HarnessFailure is a verdict and its message is the whole story. Any
    // other error is a defect in this script and gets its stack.
    console.error(
      err instanceof HarnessFailure
        ? `[tmux-pair] FAIL. ${err.message}`
        : `[tmux-pair] ${err.stack ?? err.message}`
    );
    process.exit(1);
  });
}
