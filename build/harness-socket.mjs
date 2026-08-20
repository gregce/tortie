#!/usr/bin/env node
/**
 * Run a harness on its own tmux socket and its own profile directory, then end
 * that server (Phase 19 fix round, failure B; Phase 112).
 *
 * WHY THIS EXISTS. Until Phase 19 only `smoke:power` and the fault harness
 * moved off socket `gmux`. Every other harness in package.json created and
 * killed tmux sessions on the SAME private server that holds the operator's
 * live agent work. That is a risk the durability phase has no business leaving
 * open, so each harness got a socket of its own and this script ends it
 * afterwards.
 *
 * WHAT PHASE 112 ADDED, AND WHY. Those socket names were fixed strings, and so
 * were the `--user-data-dir` paths beside them. Two runs on this Mac, e.g. one
 * per git worktree, landed on one tmux server and one profile and corrupted
 * each other. So the name is now composed:
 *
 *   socket = <base>-<slug>-<pid>
 *   slug   = the current directory's own name, lowercased, cut to 12 characters
 *   pid    = the process id of this script
 *
 * The run directory is `${TMPDIR:-/tmp}/<socket>`, it is created here, and it
 * is handed to the child as `GMUX_HARNESS_DIR`. Every profile path in
 * package.json reads that variable, so the socket and the profile always belong
 * to the same run. Neither part of the tag can be absent: `process.cwd()` and
 * `process.pid` are always defined in Node, no git command runs, and no
 * environment variable is read. That is why CI needs no workflow edit.
 *
 * WHAT IT REFUSES, AND IN WHICH ORDER. The socket name `gmux` and the socket
 * name `default` are rejected, and the base must look like `gmux-<something>`.
 * These three checks run on the BASE the caller passed, BEFORE the tag is
 * composed. Composing first would let `gmux` become `gmux-wt-1234`, which is
 * not `gmux` and would pass every check. The order is the safety property, so
 * do not move the composition above the refusals. A fourth check runs after the
 * composition, because only then is there a full name to measure: the composed
 * name must be 64 characters or fewer, which keeps the socket path well inside
 * the system limit of 104 bytes.
 *
 * The exit code of the command is the exit code of this script, so a failing
 * harness still fails the build after its server has been cleaned up.
 *
 * `--fresh` ends the server on that socket BEFORE the harness runs as well as
 * after (Phase 70 fix round). Since Phase 112 the name carries this process id,
 * so a server almost never exists on it beforehand and the flag is close to a
 * no-op. It is kept because it costs nothing and because a caller that means
 * "start from nothing" should be able to say so.
 *
 * ENDING WHAT AN EARLIER RUN LEFT. A harness killed with SIGKILL never runs its
 * teardown, and a generated name is one nobody will type again by hand. So at
 * start this script ends servers whose name matches `gmux-<something>-<digits>`
 * and whose trailing number is a process id that is no longer alive. A run in a
 * neighbouring worktree has a live process id and is skipped, which is what
 * makes two runs at once safe from each other.
 *
 * `harnessRunTag()` is exported for a later phase. Importing this file also
 * runs the command line above it, so a phase that wants the function should
 * move it into a module of its own first.
 *
 * Usage: node build/harness-socket.mjs [--fresh] <socket-name> '<shell command>'
 */

import { execFile, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** The operator's live server. Never reachable from this script. */
const REAL_SOCKET = 'gmux';
/** The user's own tmux server. Tortie never touches it. */
const USER_SOCKET = 'default';
/**
 * The longest composed socket name this script will use. tmux puts the socket
 * at `${TMUX_TMPDIR:-/tmp}/tmux-<uid>/<name>`, which is 14 bytes of prefix on
 * this Mac, so 64 leaves the path at 78 bytes against a system limit of 104.
 */
const MAX_SOCKET_NAME = 64;

function refuse(why) {
  console.error(`[harness-socket] ${why}`);
  process.exit(2);
}

/**
 * The part of a socket name that makes it this run's own.
 *
 * The slug is the current directory's own name, so a worktree at
 * `/tmp/.../wt-p112` gives `wt-p112` and a CI checkout gives the repository
 * name. It is lowercased, every character outside a to z and 0 to 9 becomes a
 * dash, runs of dashes collapse to one, leading and trailing dashes go, and the
 * result is cut to 12 characters. When nothing is left the word `run` is used.
 */
export function harnessRunTag() {
  const cut = basename(process.cwd())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12)
    .replace(/-+$/, '');
  return `${cut === '' ? 'run' : cut}-${process.pid}`;
}

/** Where tmux keeps its socket files for this user. */
function socketDir() {
  return join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${process.getuid()}`);
}

/**
 * End the servers that runs which have already exited left behind.
 *
 * The bounds here are the whole safety argument. A name is only considered when
 * it starts with `gmux-` and ends with a dash and digits, so `gmux` itself never
 * matches and neither does `default`. The digits are read as a process id and
 * the server is only ended when that process is gone. A live neighbour is
 * skipped, so two runs at once cannot end each other.
 *
 * Process ids are reused on macOS, so a stale socket whose number has been
 * taken by an unrelated live process survives until that process exits. It is
 * ended by a later run. This is a cleanup and not a promise that the directory
 * is empty at any instant.
 */
async function reapDeadRuns() {
  const dir = socketDir();
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // no socket directory yet, nothing to end
  }
  let ended = 0;
  for (const name of entries) {
    const match = /^gmux-.+-(\d+)$/.exec(name);
    if (match === null) continue;
    const pid = Number(match[1]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    try {
      process.kill(pid, 0);
      continue; // the run that owns this name is still going
    } catch (err) {
      if (err?.code !== 'ESRCH') continue; // alive but owned by someone else
    }
    await execFileP('tmux', ['-L', name, 'kill-server']).catch(() => undefined);
    rmSync(join(dir, name), { force: true });
    ended += 1;
  }
  if (ended > 0) {
    console.log(
      `[harness-socket] ended ${ended} scratch ${ended === 1 ? 'server' : 'servers'} left behind by runs that have exited`
    );
  }
}

const args = process.argv.slice(2);
const fresh = args[0] === '--fresh';
const [base, command] = fresh ? args.slice(1) : args;
if (!base || !command) {
  refuse(
    "usage: node build/harness-socket.mjs [--fresh] <socket-name> '<command>'"
  );
}
// The three refusals run on the BASE, before the tag is composed. See the
// header comment: composing first would let "gmux" pass.
if (base === REAL_SOCKET) {
  refuse(`refusing to run a harness on "${base}", the real server`);
}
if (base === USER_SOCKET) {
  refuse(`refusing to run a harness on "${base}", the user's own tmux`);
}
if (!/^gmux-[A-Za-z0-9._-]+$/.test(base)) {
  refuse(`"${base}" is not a harness socket name; use gmux-<something>`);
}

const socket = `${base}-${harnessRunTag()}`;
if (socket.length > MAX_SOCKET_NAME) {
  refuse(
    `the socket name "${socket}" is ${socket.length} characters and the limit is ${MAX_SOCKET_NAME}. Use a shorter base name.`
  );
}

/**
 * This run's own directory, named after its own socket so a person reading a
 * leftover directory can find the server that made it. It is not deleted at the
 * end, because a failed run's profile is the evidence someone needs.
 */
const runDir = join(process.env['TMPDIR'] ?? '/tmp', socket);
mkdirSync(runDir, { recursive: true });

console.log(`[harness-socket] socket ${socket}, profile ${runDir}`);

await reapDeadRuns();

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

// `npm run` is what puts node_modules/.bin on PATH, so driving this script with
// plain `node` used to exit 127 with "electron: command not found". The folder
// is added here instead, so both ways of driving a harness work.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(repoRoot, 'node_modules', '.bin');

const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${binDir}:${process.env['PATH'] ?? ''}`,
    GMUX_TMUX_SOCKET: socket,
    GMUX_HARNESS_DIR: runDir
  }
});

// Control C at a terminal, or a SIGTERM from a parent, reaches this script and
// not the child. Pass it on. The `close` handler below then runs the teardown,
// so an interrupted run leaves no server behind.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

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
