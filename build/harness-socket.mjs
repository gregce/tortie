#!/usr/bin/env node
/**
 * Run a harness on its own tmux socket, then end that server (Phase 19 fix
 * round, failure B).
 *
 * WHY THIS EXISTS. Until today only `smoke:power` and the fault harness moved
 * off socket `gmux`. Every other harness in package.json created and killed
 * tmux sessions on the SAME private server that holds the operator's live agent
 * work. That is a risk the durability phase has no business leaving open, so
 * each harness now gets a socket of its own and this script ends it afterwards.
 *
 * WHAT IT REFUSES. The socket name `gmux` and the socket name `default` are
 * rejected before anything runs. `gmux` is the operator's live server and
 * `default` is the user's own tmux. Nothing here can reach either.
 *
 * The exit code of the command is the exit code of this script, so a failing
 * harness still fails the build after its server has been cleaned up.
 *
 * `--fresh` ends the server on that socket BEFORE the harness runs as well as
 * after (Phase 70 fix round). A harness that measures "a server was born on
 * this machine" cannot measure it twice if a run that crashed, or a run whose
 * process was killed, left one behind. The teardown is the same function and it
 * refuses the same two socket names, so the flag adds no reach.
 *
 * Usage: node build/harness-socket.mjs [--fresh] <socket-name> '<shell command>'
 */

import { execFile, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** The operator's live server. Never reachable from this script. */
const REAL_SOCKET = 'gmux';
/** The user's own tmux server. Tortie never touches it. */
const USER_SOCKET = 'default';

function refuse(why) {
  console.error(`[harness-socket] ${why}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const fresh = args[0] === '--fresh';
const [socket, command] = fresh ? args.slice(1) : args;
if (!socket || !command) {
  refuse(
    "usage: node build/harness-socket.mjs [--fresh] <socket-name> '<command>'"
  );
}
if (socket === REAL_SOCKET) {
  refuse(`refusing to run a harness on "${socket}", the real server`);
}
if (socket === USER_SOCKET) {
  refuse(`refusing to run a harness on "${socket}", the user's own tmux`);
}
if (!/^gmux-[A-Za-z0-9._-]+$/.test(socket)) {
  refuse(`"${socket}" is not a harness socket name; use gmux-<something>`);
}

/**
 * End the scratch server and remove the socket file it leaves behind.
 *
 * The path is read out of tmux rather than guessed. tmux puts its sockets under
 * $TMUX_TMPDIR or /tmp, never under the TMPDIR Node reports on macOS.
 */
async function teardown(when) {
  const path = await execFileP('tmux', [
    '-L',
    socket,
    'display-message',
    '-p',
    '#{socket_path}'
  ])
    .then((r) => r.stdout.trim())
    .catch(() => '');
  if (path === '') return; // no server on this socket, nothing to end
  await execFileP('tmux', ['-L', socket, 'kill-server']).catch(() => undefined);
  if (path.endsWith(`/${socket}`)) rmSync(path, { force: true });
  console.log(
    `[harness-socket] ended the scratch server on -L ${socket} (${when})`
  );
}

// `--fresh` runs the same teardown first, so a server an earlier run left
// behind cannot be mistaken for the one this run creates.
if (fresh) await teardown('before the harness');

const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, GMUX_TMUX_SOCKET: socket }
});

// One hint, once, if the harness runs long (2026-08-16 incident). A queued
// macOS keychain alert blocks every process that touches the keychain, and
// from a log file that looks like a silent hang with no cause. The full
// conformance roundtrip legitimately exceeds this timer, so the line is
// informational and nothing is killed.
const hintTimer = setTimeout(() => {
  console.error(
    '[harness-socket] still running after 180 s. If there has been no ' +
      'output for a while, look at the SCREEN of this machine for a macOS ' +
      '"Keychain Not Found" alert. Keychain prompts queue system-wide, and ' +
      'one unanswered dialog blocks every process that touches the ' +
      'keychain, including agent CLIs reading their credentials.'
  );
}, 180_000);
hintTimer.unref();

child.on('close', (code, signal) => {
  clearTimeout(hintTimer);
  void teardown('after the harness').finally(() => {
    process.exit(signal ? 1 : (code ?? 1));
  });
});
