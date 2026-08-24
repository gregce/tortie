#!/usr/bin/env node
/**
 * Run one standalone smoke step, create or verify, on a server this directory
 * owns (Phase 114, root 1 of Phase 112's list).
 *
 * WHY THIS EXISTS. `smoke:create` and `smoke:verify` used to carry a fixed
 * fallback socket and a fixed fallback profile, both named `gmux-smoke-t1`.
 * Under `npm run smoke:t1` the harness supplied both and the fallbacks were
 * never reached, but two people running the standalone scripts in two
 * directories landed on ONE server and ONE profile and corrupted each other.
 * This wrapper decides the socket and the profile instead of a shell fallback,
 * in this order:
 *
 *  1. Inside a harness. `GMUX_HARNESS_DIR` is set. The harness exports it
 *     together with `GMUX_TMUX_SOCKET`, and the presence of the directory
 *     variable is the honest fact of being inside one. Both values are used
 *     untouched, so `npm run smoke:t1` behaves byte for byte as before. If
 *     the directory is set and the socket is not, the environment is broken
 *     and the wrapper refuses rather than guess.
 *  2. A socket chosen by hand. `GMUX_TMUX_SOCKET` is set without
 *     `GMUX_HARNESS_DIR`. The name runs through the same refusals as the
 *     harness, shared via `build/harness-run-tag.mjs`, then is used with a
 *     profile beside it under `${TMPDIR:-/tmp}`. This closed a hole: the old
 *     scripts passed the raw value straight to the app, and because
 *     `GMUX_SMOKE` was set the app honoured it, so `GMUX_TMUX_SOCKET=gmux`
 *     would have reached the operator's real server. Now it is refused before
 *     Electron starts.
 *  3. Standalone. Neither variable is set. The socket is
 *     `gmux-smoke-t1-<slug>` where the slug is this directory's own name, and
 *     the profile is `${TMPDIR:-/tmp}/<socket>`. The slug carries NO process
 *     id on purpose: create and verify are two processes, and a person
 *     running them by hand in one directory must land on one server so verify
 *     can read what create made. Two directories get two slugs and no longer
 *     share anything.
 *
 * WHAT IT NEVER DOES. The wrapper never tears a server down and never writes
 * a run marker. Both omissions are the design: the server must survive
 * between create and verify, and a marker would invite the harness reap to
 * end it, since the slug's trailing digits can look like a dead process id.
 *
 * `--print` composes and prints the socket and profile line and exits 0
 * without spawning anything, so a probe can prove isolation from two
 * directories without paying for two Electron runs.
 *
 * Usage: node build/smoke-standalone.mjs [--print] <create|verify>
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirSlug, refuseReason, MAX_SOCKET_NAME } from './harness-run-tag.mjs';

import { runElectron } from './electron-run.mjs';

function refuse(why) {
  console.error(`[smoke-standalone] ${why}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const printOnly = args[0] === '--print';
const rest = printOnly ? args.slice(1) : args;
if (rest.length !== 1 || (rest[0] !== 'create' && rest[0] !== 'verify')) {
  refuse('usage: node build/smoke-standalone.mjs [--print] <create|verify>');
}
const mode = rest[0];

const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
const envSocket = process.env['GMUX_TMUX_SOCKET'] ?? '';

let socket;
let profile;
let standalone = false;

if (harnessDir !== '') {
  // Inside a harness. Use its socket and its profile untouched.
  if (envSocket === '') {
    refuse(
      'GMUX_HARNESS_DIR is set but GMUX_TMUX_SOCKET is not. The harness ' +
        'exports both together, so this environment is broken and guessing ' +
        'a socket would be unsafe.'
    );
  }
  socket = envSocket;
  profile = harnessDir;
} else if (envSocket !== '') {
  // A socket chosen by hand. Same refusals as the harness, then use it.
  const why = refuseReason(envSocket);
  if (why !== null) refuse(why);
  if (envSocket.length > MAX_SOCKET_NAME) {
    refuse(
      `the socket name "${envSocket}" is ${envSocket.length} characters ` +
        `and the limit is ${MAX_SOCKET_NAME}. Use a shorter name.`
    );
  }
  socket = envSocket;
  profile = join(process.env['TMPDIR'] ?? '/tmp', socket);
} else {
  // Standalone. One name per directory, no pid, so create and verify pair.
  standalone = true;
  socket = `gmux-smoke-t1-${dirSlug()}`;
  profile = join(process.env['TMPDIR'] ?? '/tmp', socket);
}

if (printOnly) {
  console.log(`[smoke-standalone] socket ${socket}, profile ${profile}`);
  process.exit(0);
}

if (standalone) {
  console.log(`[smoke-standalone] socket ${socket}, profile ${profile}`);
  mkdirSync(profile, { recursive: true });
  console.log(
    '[smoke-standalone] standalone run. The server is left running so that ' +
      'create and verify can share it. End it with: ' +
      `tmux -L ${socket} kill-server`
  );
}

// `npm run` is what puts node_modules/.bin on PATH. The folder is added here
// too, the same way build/harness-socket.mjs does it, so plain
// `node build/smoke-standalone.mjs create` finds Electron without `npm run`.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(repoRoot, 'node_modules', '.bin');

// build/electron-run.mjs owns the launch (Phase 140) and ends the tree it
// started in a finally block whatever happened. `echo` is on because this
// script's whole output is the app's output, and a parent reads it line by
// line.
const run = await runElectron({
  label: `smoke-standalone ${mode}`,
  userDataDir: profile,
  env: {
    ...process.env,
    PATH: `${binDir}:${process.env['PATH'] ?? ''}`,
    GMUX_SMOKE: mode,
    GMUX_TMUX_SOCKET: socket
  },
  echo: true,
  ceilingMs: 600_000
});

// The child's exit code is the wrapper's exit code.
process.exit(run.code);
