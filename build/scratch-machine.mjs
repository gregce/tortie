/**
 * One scratch machine on this Mac, for the harnesses that need a far side
 * (Phase 71 fix round).
 *
 * ## Why this module exists
 *
 * `build/probe-execplane.mjs` and `build/partition-harness.mjs` each grew their
 * own copy of the same forty lines: generate a host key and a user key, write an
 * `authorized_keys` this run's key is in, start an ssh agent holding it, write an
 * `sshd_config` and start `sshd -D` on a high port on the loopback address.
 *
 * A third copy was about to be written, and the reason it was about to be
 * written is the defect this module closes. `npm run smoke:remote` reads a
 * carriage file that only `npm run probe:execplane` writes, so from a clean
 * checkout it printed "4 to 10. SKIPPED, and it is not evidence" and then exited
 * PASS having proved 3 of its 11 steps. A gate that passes without its subject
 * present is not a gate.
 *
 * So the machine is a thing a script asks for, and `build/with-scratch-machine.mjs`
 * is the runner that gives one to any harness.
 *
 * ## The safety rules, and they outrank every result of any caller
 *
 * IN EVERY HARNESS THAT USES THIS, THE REMOTE MACHINE IS THIS MAC.
 *
 *  1. {@link refuseRealSockets} refuses the socket names `gmux` and `default` by
 *     name, before anything is started.
 *  2. Every machine gets its own `TMUX_TMPDIR`, so its tmux server is a
 *     different server from the app's own. Without it the two are one server
 *     under two names, which is how the partition harness came to report a pass
 *     over rows that were never on the machine it cut.
 *  3. Nothing is written outside the directories the caller names, the server
 *     listens on 127.0.0.1 only, and password sign in is off.
 *  4. Every pid is handed to the caller's `record` function as it is created, so
 *     a caller kills only what it started. There is no `pkill` and no
 *     `kill-server` in this file.
 *  5. The ssh agent this module starts ends with the process that started it,
 *     through {@link endAgentWithThisProcess}, whether or not the caller ever
 *     reached its own teardown. See that function for the leak it closes.
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { sshRun } from './ssh-run.mjs';

/** Every ssh this module starts goes through build/ssh-run.mjs (Phase 193). */
const CALLER = 'build/scratch-machine.mjs';

/** The operator's live server. Nothing here may ever reach it. */
export const REAL_SOCKET = 'gmux';
/** The user's own tmux server. Tortie never touches it. */
export const USER_SOCKET = 'default';

/**
 * Refuse to run at all when the socket in play is one of the two real ones.
 *
 * Returns the socket name so a caller can use it in one expression.
 */
export function refuseRealSockets(socket, who) {
  if (socket === REAL_SOCKET || socket === USER_SOCKET) {
    process.stderr.write(
      `[${who}] REFUSING TO RUN. The socket this harness would use is ` +
        `"${socket}". In this harness the remote machine is this Mac, so a ` +
        `remote command would land on a server holding real sessions. Set ` +
        `GMUX_TMUX_SOCKET to a scratch name and try again.\n`
    );
    process.exit(2);
  }
  return socket;
}

function sh(file, argv, options = {}) {
  const out = spawnSync(file, argv, {
    encoding: 'utf8',
    timeout: 60_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

/**
 * The public keys the person's OWN ssh client would offer.
 *
 * The exec plane composes no `IdentityFile` on purpose: Tortie names no key and
 * lets the client use the person's own agent and default identities, which is
 * how a real machine of theirs accepts them. So the file this builds trusts this
 * run's own key and whatever the person's agent already holds.
 */
function ownPublicKeys() {
  const keys = [];
  const agent = sh('/usr/bin/ssh-add', ['-L']);
  if (agent.code === 0) {
    for (const line of agent.stdout.split('\n')) {
      if (line.startsWith('ssh-') || line.startsWith('ecdsa-')) keys.push(line);
    }
  }
  const sshDir = join(process.env['HOME'] ?? '', '.ssh');
  let names = [];
  try {
    names = readdirSync(sshDir);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (!name.endsWith('.pub')) continue;
    try {
      const line = readFileSync(join(sshDir, name), 'utf8').trim();
      if (line.startsWith('ssh-') || line.startsWith('ecdsa-')) keys.push(line);
    } catch {
      /* an unreadable key is one we simply do not offer */
    }
  }
  return [...new Set(keys)];
}

function portAnswers(p) {
  return sh('/usr/bin/nc', ['-z', '127.0.0.1', String(p)]).code === 0;
}

function waitForPort(p, up) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (portAnswers(p) === up) return true;
    sh('/bin/sleep', ['0.1']);
  }
  return portAnswers(p) === up;
}

/**
 * Where a machine's tmux server keeps its socket.
 *
 * IT IS UNDER `/tmp` AND NOT UNDER THE RUN'S ROOT, and that is measured. A unix
 * socket path on macOS is capped at 104 bytes. A run root under the per user
 * folder `tmpdir()` reports is 66 characters on this Mac before anything is
 * added, so the socket path came to 121 characters and tmux answered "File name
 * too long" for every command. Callers remove these by name.
 */
export function machineTmuxTmp(prefix, id) {
  return join('/tmp', `${prefix}-tmux-${String(process.pid)}-${id}`);
}

/**
 * End one scratch ssh agent when THIS process ends, whatever ended it.
 *
 * ## The leak it closes, measured rather than supposed
 *
 * A scratch agent from `npm run probe:p187` was found still running hours after
 * the run, pid 59110, `/usr/bin/ssh-agent -s`, started inside that probe's own
 * window. The probe was not careless: it records the agent pid, its `teardown`
 * kills every recorded pid, and that teardown is called in a `finally`. The gap
 * is that {@link scratchYard} is called at MODULE LEVEL, above the `try` the
 * `finally` belongs to. An agent is running from the moment that call returns,
 * and anything that ends the process before the `try` is entered, being a throw
 * while the machine is built, one of the harness's own `process.exit` refusals,
 * or a bad argument, leaves the agent behind holding a key. Every caller of this
 * module has that shape.
 *
 * So the agent is ended HERE, beside where it is started, rather than by asking
 * eight harnesses to be careful. `exit` runs on a normal return, on
 * `process.exit`, and after an uncaught throw, which is every shape above.
 *
 * SIGTERM, not SIGKILL, because ssh-agent removes its own socket on SIGTERM and
 * cannot on SIGKILL. The socket and the private directory ssh-agent made for it
 * are removed afterwards anyway, and only when they carry the names ssh-agent
 * itself gives them, so a malformed path removes nothing.
 *
 * WHAT IT CANNOT COVER, said plainly: a SIGKILL to this process runs no handler
 * at all. The caller's own recorded pid list is still the belt for everything
 * else, and this is the one process that is started before that list can be
 * acted on.
 */
export function endAgentWithThisProcess(pid, sock) {
  process.on('exit', () => {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone, which is the state we wanted */
    }
    if (typeof sock !== 'string' || sock === '') return;
    // A SOCKET, PROVED RATHER THAN NAMED. `lstatSync` is what makes this safe to
    // point at a path a caller composed: a regular file, a directory or a
    // symlink is left alone, so the only thing this line can ever remove is an
    // agent's own endpoint.
    try {
      if (lstatSync(sock).isSocket()) rmSync(sock, { force: true });
    } catch {
      /* the agent removed it on the way out, which is the state we wanted */
    }
    // `ssh-agent -s` makes a private directory of its own at
    // <tmp>/ssh-XXXXXX/agent.<pid>, and that directory holds nothing else. An
    // agent started with `-a` was given a path inside a scratch the caller
    // already removes, so it does not match and nothing more is done.
    if (
      basename(sock).startsWith('agent.') &&
      basename(dirname(sock)).startsWith('ssh-')
    ) {
      try {
        rmSync(dirname(sock), { recursive: true, force: true });
      } catch {
        /* already gone, which is the state we wanted */
      }
    }
  });
}

/**
 * Build the shared parts one or more scratch machines need: the keys, the
 * `authorized_keys`, and an ssh agent holding this run's key.
 *
 * `record` is called with every pid started, so the caller's own kill list is
 * the only list.
 */
export function scratchYard({ root, prefix, record }) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const hostKey = join(root, `${prefix}-hostkey`);
  const userKey = join(root, `${prefix}-userkey`);
  const authorized = join(root, `${prefix}-authorized`);
  const user = execFileSync('/usr/bin/id', ['-un'], { encoding: 'utf8' }).trim();

  sh('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', hostKey]);
  sh('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', userKey]);

  writeFileSync(
    authorized,
    [readFileSync(`${userKey}.pub`, 'utf8').trim(), ...ownPublicKeys(), ''].join(
      '\n'
    ),
    'utf8'
  );
  chmodSync(authorized, 0o600);

  // MEASURED by `build/probe-execplane.mjs` on this Mac: there is no ssh key at
  // all here, and the exec plane names no key on purpose, so without an agent a
  // harness could not sign in even to a machine that trusts a key on disk.
  let authSock = '';
  const started = sh('/usr/bin/ssh-agent', ['-s']);
  const sockMatch = /SSH_AUTH_SOCK=([^;]+);/.exec(started.stdout);
  const pidMatch = /SSH_AGENT_PID=([0-9]+);/.exec(started.stdout);
  if (started.code === 0 && sockMatch !== null && pidMatch !== null) {
    authSock = sockMatch[1];
    record(Number(pidMatch[1]));
    // BEFORE the key goes in, so an agent is never holding one with nothing
    // arranged to end it.
    endAgentWithThisProcess(Number(pidMatch[1]), authSock);
    const added = spawnSync('/usr/bin/ssh-add', [userKey], {
      encoding: 'utf8',
      env: { ...process.env, SSH_AUTH_SOCK: authSock }
    });
    if (added.status !== 0) authSock = '';
  }

  const tmuxPath =
    sh('/usr/bin/which', ['tmux']).stdout.trim() || '/usr/bin/tmux';

  return { root, prefix, user, authSock, tmuxPath, hostKey, authorized, record };
}

/**
 * One machine in a yard: its own port, its own configuration file, its own
 * sessions directory, and start and stop that only ever touch its own pids.
 */
export function scratchMachine(yard, { id, port }) {
  const conf = join(yard.root, `${yard.prefix}-sshd-${id}.conf`);
  const tmuxTmp = machineTmuxTmp(yard.prefix, id);
  mkdirSync(tmuxTmp, { recursive: true, mode: 0o700 });

  writeFileSync(
    conf,
    [
      `Port ${String(port)}`,
      'ListenAddress 127.0.0.1',
      `HostKey ${yard.hostKey}`,
      `AuthorizedKeysFile ${yard.authorized}`,
      'PasswordAuthentication no',
      'KbdInteractiveAuthentication no',
      'UsePAM no',
      'StrictModes no',
      'LogLevel QUIET',
      // The one line that makes this machine a machine rather than an alias for
      // this Mac. See rule 2 in the header.
      `SetEnv TMUX_TMPDIR=${tmuxTmp}`,
      ''
    ].join('\n'),
    'utf8'
  );

  const machine = {
    id,
    port,
    conf,
    tmuxTmp,
    pid: null,
    host: '127.0.0.1',
    user: yard.user,
    remoteTmuxPath: yard.tmuxPath,

    start() {
      const child = spawn('/usr/sbin/sshd', ['-D', '-f', conf], {
        stdio: 'ignore'
      });
      yard.record(child.pid);
      machine.pid = child.pid;
      child.unref();
      return waitForPort(port, true);
    },

    /**
     * Every descendant of this machine's listener, deepest first.
     *
     * `-ax` IS LOAD BEARING. `sshd -D` forks a child per connection, and without
     * the flag `ps` lists only the caller's own terminal processes, so the
     * forked children are absent and a stop would end the listener alone. Every
     * connection already open would keep carrying bytes.
     */
    descendants() {
      const table = sh('/bin/ps', ['-o', 'pid=,ppid=', '-ax']).stdout;
      const children = new Map();
      for (const line of table.split('\n')) {
        const [child, parent] = line.trim().split(/\s+/).map(Number);
        if (!Number.isFinite(child) || !Number.isFinite(parent)) continue;
        children.set(parent, [...(children.get(parent) ?? []), child]);
      }
      const out = [];
      const walk = (one) => {
        for (const child of children.get(one) ?? []) {
          walk(child);
          out.push(child);
        }
      };
      walk(machine.pid);
      return out;
    },

    stop() {
      if (machine.pid === null) return;
      for (const pid of [...machine.descendants(), machine.pid]) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* already gone, which is the state we wanted */
        }
      }
      machine.pid = null;
      waitForPort(port, false);
    },

    /**
     * Prove, over a real connection, that this machine's tmux lives somewhere
     * the app's own tmux does not. Asserted rather than assumed, because a login
     * file on this Mac is allowed to change the environment.
     */
    isolated() {
      const asked = sshRun({
        knownHosts: '/dev/null',
        caller: CALLER,
        argv: [
          '-p',
          String(port),
          '-o',
          'BatchMode=yes',
          '-o',
          'StrictHostKeyChecking=no',
          '-o',
          'LogLevel=ERROR',
          `${yard.user}@127.0.0.1`,
          'printenv TMUX_TMPDIR'
        ],
        env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
      });
      return (asked.stdout ?? '').trim() === tmuxTmp;
    },

    /** The tmux server this machine is running, by the pid it reports. */
    serverPid(socket) {
      const asked = sh(
        yard.tmuxPath,
        ['-L', socket, '-f', '/dev/null', 'display-message', '-p', '#{pid}'],
        { env: { ...process.env, TMUX_TMPDIR: tmuxTmp } }
      );
      const pid = Number(asked.stdout.trim());
      return Number.isFinite(pid) && pid > 0 ? pid : null;
    },

    /** Remove this machine's sessions directory. It is outside the run's root. */
    cleanup() {
      if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
    }
  };
  return machine;
}

/**
 * A program that reports a version nobody measured, for the refusal a harness
 * drives. It runs on this Mac and contacts nothing.
 */
export function writeVersionStub(root, prefix) {
  const stub = join(root, `${prefix}-stub-tmux`);
  writeFileSync(stub, '#!/bin/sh\necho "tmux 0.0-made-up"\nexit 0\n', 'utf8');
  chmodSync(stub, 0o755);
  return stub;
}
