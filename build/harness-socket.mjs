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
 * The checks and their messages live in `build/harness-run-tag.mjs`, shared
 * with `build/smoke-standalone.mjs` so the two scripts can never drift. These
 * three checks run on the BASE the caller passed, BEFORE the tag is
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
 * THE RUN MARKER (Phase 114). Before the child spawns, this script writes
 * `<socket>.run` beside the socket file, one JSON line with the pid, the
 * working directory and the start time, and `teardown` removes it. The marker
 * is the proof that THIS mechanism created the server, and it is what the
 * reap below trusts. tmux never opens the marker, because nothing passes a
 * name ending in `.run` to `-L`.
 *
 * ENDING WHAT AN EARLIER RUN LEFT. A harness killed with SIGKILL never runs
 * its teardown, and a generated name is one nobody will type again by hand. So
 * at start this script ends the servers that dead runs left behind. Since
 * Phase 114 it reads MARKER files only: a marker named
 * `gmux-<something>-<digits>.run` whose trailing number is a process id that
 * is no longer alive names a dead run, and its server, its socket file and the
 * marker itself are removed. A socket file with no marker is NEVER touched,
 * whatever its name looks like, so a server some other mechanism created, e.g.
 * a standalone smoke server whose directory slug happens to end in digits, is
 * safe from this script. A run in a neighbouring worktree has a live process
 * id and is skipped, which is what makes two runs at once safe from each
 * other. One cost is accepted: sockets left behind by runs from before the
 * marker existed carry no marker and are no longer reaped, and a person
 * removes those by hand.
 *
 * Process ids are reused on macOS, so a stale marker whose number has been
 * taken by an unrelated live process survives until that process exits. It is
 * ended by a later run. This is a cleanup and not a promise that the directory
 * is empty at any instant.
 *
 * Usage: node build/harness-socket.mjs [--fresh] <socket-name> '<shell command>'
 */

import { execFile, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  harnessRunTag,
  refuseReason,
  MAX_SOCKET_NAME
} from './harness-run-tag.mjs';

const execFileP = promisify(execFile);

function refuse(why) {
  console.error(`[harness-socket] ${why}`);
  process.exit(2);
}

/** Where tmux keeps its socket files for this user. */
function socketDir() {
  return join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${process.getuid()}`);
}

/**
 * End the servers that runs which have already exited left behind.
 *
 * The bounds here are the whole safety argument. Only MARKER files are
 * considered, and only this script writes markers, so a server that some
 * other mechanism created is never a candidate no matter what its name looks
 * like. A marker names a dead run only when its trailing digits are a process
 * id that is gone. A live neighbour is skipped, so two runs at once cannot
 * end each other. A marker whose server never started is still cleaned up,
 * because the kill is best effort and removing the marker is what ends the
 * entry.
 *
 * Process ids are reused on macOS, so a stale marker whose number has been
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
  for (const entry of entries) {
    const match = /^(gmux-.+-(\d+))\.run$/.exec(entry);
    if (match === null) continue;
    const name = match[1];
    const pid = Number(match[2]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    try {
      process.kill(pid, 0);
      continue; // the run that owns this name is still going
    } catch (err) {
      if (err?.code !== 'ESRCH') continue; // alive but owned by someone else
    }
    await execFileP('tmux', ['-L', name, 'kill-server']).catch(() => undefined);
    rmSync(join(dir, name), { force: true });
    rmSync(join(dir, entry), { force: true });
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
const why = refuseReason(base);
if (why !== null) refuse(why);

const socket = `${base}-${harnessRunTag()}`;
if (socket.length > MAX_SOCKET_NAME) {
  refuse(
    `the socket name "${socket}" is ${socket.length} characters and the limit is ${MAX_SOCKET_NAME}. Use a shorter base name.`
  );
}

/**
 * The run marker, beside the socket file itself. Writing it is what makes the
 * server reapable by a later run; removing it in teardown is what makes this
 * run finished. See the header.
 */
const markerFile = join(socketDir(), `${socket}.run`);

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
 * End the scratch server, remove the socket file it leaves behind, and remove
 * this run's marker.
 *
 * The path is read out of tmux rather than guessed. tmux puts its sockets under
 * $TMUX_TMPDIR or /tmp, never under the TMPDIR Node reports on macOS. The
 * marker is removed unconditionally, because a run whose child never started a
 * server has no server to end and the marker must not outlive the run either
 * way.
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
  if (path !== '') {
    await execFileP('tmux', ['-L', socket, 'kill-server']).catch(
      () => undefined
    );
    if (path.endsWith(`/${socket}`)) rmSync(path, { force: true });
  }
  rmSync(markerFile, { force: true });
  if (path === '') return; // no server on this socket, nothing to end
  console.log(
    `[harness-socket] ended the scratch server on -L ${socket} (${when})`
  );
}

// `--fresh` runs the same teardown first, so a server an earlier run left
// behind cannot be mistaken for the one this run creates.
if (fresh) await teardown('before the harness');

// The marker is written after the refusals, after the reap, and after the
// `--fresh` pre-teardown, immediately before the child spawns. The directory
// is created with the ownership and mode tmux itself requires.
mkdirSync(socketDir(), { recursive: true, mode: 0o700 });
writeFileSync(
  markerFile,
  `${JSON.stringify({
    pid: process.pid,
    cwd: process.cwd(),
    started: new Date().toISOString()
  })}\n`
);

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
