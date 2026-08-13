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
 * Usage: node build/harness-socket.mjs <socket-name> '<shell command>'
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

const [socket, command] = process.argv.slice(2);
if (!socket || !command) {
  refuse("usage: node build/harness-socket.mjs <socket-name> '<command>'");
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
async function teardown() {
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
  console.log(`[harness-socket] ended the scratch server on -L ${socket}`);
}

const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, GMUX_TMUX_SOCKET: socket }
});

child.on('close', (code, signal) => {
  void teardown().finally(() => {
    process.exit(signal ? 1 : (code ?? 1));
  });
});
