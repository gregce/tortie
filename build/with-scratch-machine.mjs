#!/usr/bin/env node
/**
 * Give a harness a real machine to talk to, then run it (Phase 71 fix round).
 *
 * ## The defect this closes
 *
 * `npm run smoke:remote` reads a carriage file that only `npm run probe:execplane`
 * writes, and the probe leaves an sshd running for it by hand. From a clean
 * checkout the file is not there, so MEASURED with `env -i` on 2026-08-17 the
 * gate printed
 *
 *   4 to 10. SKIPPED, and it is not evidence: no scratch carriage file
 *
 * and then exited PASS having proved 3 of its 11 steps. A gate that passes
 * without its subject present is worse than no gate, because a person reading a
 * green line believes something was checked.
 *
 * So this script starts the machine, writes the carriage file, runs the command,
 * and takes the machine away again. `smoke:remote` now provisions itself, and
 * `probe:execplane` is still free to leave one running for a person who wants to
 * poke at it by hand.
 *
 * ## Usage
 *
 *   node build/with-scratch-machine.mjs --carriage p69-carriage.json -- <command>
 *
 * The command runs through `/bin/sh -c`, with `SSH_AUTH_SOCK` set to this run's
 * own agent, because the exec plane names no key and this Mac may have none of
 * its own.
 *
 * `npm run smoke:remote` runs this script with `GMUX_CONFIG_ROOT` set to that
 * gate's own run directory, and the carriage file lands inside it. Since Phase
 * 112 the directory is composed on every run, so it reads
 * `<tmpdir>/gmux-p70-remote-<worktree>-<pid>` rather than a fixed path. It is
 * not the root `npm run smoke:execplane` reads, which is composed the same way
 * from the base `gmux-p69-exec`. Pointing a probe at the wrong one produces a
 * refused connection to a port nothing is listening on, which reads like a
 * broken machine and is not one. The table in DEVELOPMENT.md, under "Where
 * each remote gate keeps its isolated config root", names every gate's root.
 *
 * ## Safety
 *
 * Every rule is in `build/scratch-machine.mjs`'s header and this file adds one:
 * `GMUX_CONFIG_ROOT` must be set, because that is where the harness under test
 * is isolated and the carriage file has to land inside it.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  refuseRealSockets,
  scratchMachine,
  scratchYard,
  writeVersionStub
} from './scratch-machine.mjs';

const PREFIX = 'p71-scratch';

function parseArgs(argv) {
  const out = { carriage: 'p69-carriage.json', command: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--carriage') out.carriage = argv[(i += 1)];
    else if (argv[i] === '--') {
      out.command = argv.slice(i + 1).join(' ');
      break;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const say = (text) => process.stdout.write(`[scratch-machine] ${text}\n`);

if (args.command === null || args.command.trim() === '') {
  process.stderr.write(
    'usage: node build/with-scratch-machine.mjs [--carriage <name>] -- <command>\n'
  );
  process.exit(2);
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
refuseRealSockets(socket, 'scratch-machine');

const root = process.env['GMUX_CONFIG_ROOT'] ?? '';
if (root === '') {
  process.stderr.write(
    '[scratch-machine] REFUSING TO RUN. GMUX_CONFIG_ROOT is not set, so there ' +
      'is no isolated place to put the machine details and no proof the ' +
      'harness under test is isolated either.\n'
  );
  process.exit(2);
}
mkdirSync(root, { recursive: true, mode: 0o700 });

const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};

const yard = scratchYard({ root, prefix: PREFIX, record });
if (yard.authSock === '') {
  process.stderr.write(
    '[scratch-machine] no ssh agent holds this run’s key, so the harness could ' +
      'not sign in at all.\n'
  );
  process.exit(1);
}

const machine = scratchMachine(yard, {
  id: 'one',
  port: 37_000 + (process.pid % 2000)
});

function teardown() {
  const serverPid = machine.serverPid(socket);
  if (serverPid !== null) record(serverPid);
  for (const pid of recordedPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  machine.cleanup();
  say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    teardown();
    process.exit(130);
  });
}

if (!machine.start()) {
  say(`the scratch sshd did not answer on port ${String(machine.port)}`);
  teardown();
  process.exit(1);
}
if (!machine.isolated()) {
  say(
    `the machine keeps its sessions somewhere other than ${machine.tmuxTmp}, so ` +
      `it and this Mac would share one server`
  );
  teardown();
  process.exit(1);
}

const carriagePath = join(root, args.carriage);
writeFileSync(
  carriagePath,
  `${JSON.stringify(
    {
      host: machine.host,
      port: machine.port,
      user: machine.user,
      remoteTmuxPath: machine.remoteTmuxPath,
      // The refusal a harness drives needs a program reporting a version nobody
      // measured. It runs on this Mac and contacts nothing.
      stubTmuxPath: writeVersionStub(root, PREFIX),
      // PHASE 84 FIX ROUND. Where this machine keeps its own session server.
      // The one line that makes this machine a machine rather than an alias for
      // this Mac is `SetEnv TMUX_TMPDIR=` in its sshd configuration, so a
      // command run HERE reaches a different server than the same command run
      // over the connection. `src/main/machines/remote-smoke.ts` needs a person
      // at the keyboard of one pane, which no product path can supply, so it
      // runs the far tmux command locally with this directory in its
      // environment. Nothing in the product reads this field.
      tmuxTmp: machine.tmuxTmp,
      authSock: yard.authSock
    },
    null,
    2
  )}\n`,
  'utf8'
);
say(
  `machine on 127.0.0.1:${String(machine.port)} as ${machine.user}, program ` +
    `${machine.remoteTmuxPath}, sessions under ${machine.tmuxTmp}`
);
say(`wrote ${carriagePath}`);

const child = spawn('/bin/sh', ['-c', args.command], {
  stdio: 'inherit',
  env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
});
record(child.pid);
child.on('exit', (code, signal) => {
  teardown();
  process.exit(signal !== null ? 1 : (code ?? 1));
});
