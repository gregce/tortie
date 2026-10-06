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

/**
 * NOT HIS KEYS, opt in (Phase 337, build/p337/SPEC.md D37):
 * `SCRATCH_MACHINE_NO_OWN_KEYS=1` writes the yard's `authorized_keys` from THIS
 * RUN'S key alone, and never calls {@link ownPublicKeys}: nothing reads a file
 * under `~/.ssh` and nothing asks the person's own agent (`ssh-add -L`) for the
 * keys it holds.
 *
 * WHY. Phase 337's rules forbid reading `~/.ssh`, and the default above reads
 * every `*.pub` there and lists his agent's keys to trust them on the far side.
 * The app still signs in with this on: the yard starts an agent of its OWN
 * holding the run's key and hands its socket to the command
 * (`build/with-scratch-machine.mjs` sets `SSH_AUTH_SOCK` to it), so the far
 * side trusts exactly the key that agent offers.
 *
 * STATED, NOT CLOSED (build/p337/SPEC.md §Attack A18): the `ssh` the APP
 * spawns takes `~` from the account record rather than `HOME`, so it opens the
 * account's own ssh client configuration as every remote probe since Phase 69
 * has. No harness reads it.
 *
 * OFF BY DEFAULT, so every other harness's `authorized_keys` is byte for byte
 * what it was. Answers true when it is on.
 */
export function noOwnKeysFor(env) {
  return String(env?.['SCRATCH_MACHINE_NO_OWN_KEYS'] ?? '') === '1';
}

/**
 * The lines of the yard's `authorized_keys`: the run's own key, then the
 * person's own keys unless {@link noOwnKeysFor} holds, then the closing empty
 * line. `own` is called only when it is needed, so the person's keys are never
 * read under the option.
 */
export function authorizedLinesFor(runKey, env, own = ownPublicKeys) {
  return [runKey, ...(noOwnKeysFor(env) ? [] : own()), ''];
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
 * THE QUIET SHELL, opt in (Phase 320.1's second build, build/p3201/SPEC.md
 * D12): `SCRATCH_MACHINE_QUIET_SHELL=1` gives every session of this machine an
 * empty `ZDOTDIR` of the yard's own and `HISTFILE=/dev/null`.
 *
 * WHY. The loopback machine's far shell is HIS zsh with HIS rc files on this
 * Mac, because sshd starts the account's own login shell: the Phase 320.1
 * reverifier found the oh-my-zsh prompt stopping a typed line in 3 of 4 runs on
 * 3.6a, and a far zsh that exits writes his real `~/.zsh_history`. With an
 * empty `ZDOTDIR` zsh reads none of his rc files, and macOS's `/etc/zshrc`
 * points `HISTFILE` at `${ZDOTDIR}/.zsh_history`, inside the yard.
 *
 * OFF BY DEFAULT, so every other harness's sshd configuration is byte for byte
 * what it was; `probe:p320`, `probe:p292:remote` and `probe:p320:skew` set it.
 * `smoke:remote` sets it since Phase 336's fix round: the Lens 2 verifier ran
 * that gate as the spec told verifiers to, and his real `~/.zsh_history` grew
 * by 150 bytes inside the run's window, the one run of the day that did not
 * set it. The fixer then drove a far login shell through a machine built with
 * it on: the typed line landed in the yard's `zdot/.zsh_history` and his own
 * file's size and modified time did not move. `smoke:remote` does NOT set the
 * scratch home below, because its arm 10a looks for an agent under the far
 * account's home, and its arm 17a compares the folder tmux falls back to with
 * the home the machine states: with the scratch home on, a far command still
 * STARTS in the account's own home while `$HOME` names the yard's (measured by
 * the fixer, `pwd -P` and `$HOME` read over one connection), so the two would
 * differ by construction. It DOES set the short prompt (see shortPromptFor,
 * Phase 336's ruled round): the reverify ran it with the quiet shell and it
 * failed at 10a, because the default prompt plus the armed resume command
 * passed the far pane's 80 columns.
 * Answers `{ zdot }` when it is on, else null.
 */
export function quietShellFor(root, env) {
  if (String(env?.['SCRATCH_MACHINE_QUIET_SHELL'] ?? '') !== '1') return null;
  const zdot = join(root, 'zdot');
  if (/\s/.test(zdot)) throw new Error(`the quiet shell's ZDOTDIR ${zdot} holds a space, and sshd's SetEnv reads it as two values`);
  return { zdot };
}

/**
 * THE SCRATCH HOME, opt in (Phase 336, build/p336/SPEC.md D23):
 * `SCRATCH_MACHINE_SCRATCH_HOME=1` gives every session of this machine
 * `HOME=<yard>/home`, a folder of the yard's own made mode 0700, appended to
 * the one `SetEnv` line beside the quiet shell.
 *
 * WHY. On the loopback machine the far `$HOME` is otherwise HIS REAL HOME on
 * this Mac, because sshd starts the account's own login shell with the account's
 * own home. Phase 336's far rules are judged against the far home (a home and a
 * folder holding one are never written under, and since Phase 336.1 a folder
 * directly inside it is), and an arm that drives those rules toward his real
 * home is an arm that writes toward it. With this on, the far home is a folder the yard made and removes.
 *
 * IT REQUIRES THE QUIET SHELL, and refuses without it: a far zsh with a moved
 * `HOME` and no `ZDOTDIR` of the yard's own would still read his rc files out of
 * the passwd home's spelling and write a history file into the new one.
 *
 * OFF BY DEFAULT, so every other harness's sshd configuration is byte for byte
 * what it was. Answers `{ home }` when it is on, else null.
 *
 * MEASURED, not assumed (OpenSSH_9.9p2's `sshd_config(5)`: "Environment
 * variables set by SetEnv override the default environment"): the builder drove
 * `echo "$HOME"` through a machine built with this on and read the yard's home
 * back, and the result is in build/p336/SPEC.md §As built.
 */
export function scratchHomeFor(root, env, quiet) {
  if (String(env?.['SCRATCH_MACHINE_SCRATCH_HOME'] ?? '') !== '1') return null;
  if (quiet === null) {
    throw new Error(
      'SCRATCH_MACHINE_SCRATCH_HOME=1 needs SCRATCH_MACHINE_QUIET_SHELL=1 as well: a far shell with a moved HOME and ' +
        "no ZDOTDIR of the yard's own still reads the account's own rc files."
    );
  }
  const home = join(root, 'home');
  if (/\s/.test(home)) throw new Error(`the scratch HOME ${home} holds a space, and sshd's SetEnv reads it as two values`);
  return { home };
}

/**
 * THE SHORT PROMPT, opt in (Phase 336's ruled round, build/p336/SPEC.md
 * "§As built, his ruled round"): `SCRATCH_MACHINE_SHORT_PROMPT=1` writes ONE
 * file into the quiet shell's own `ZDOTDIR`, a `.zshrc` that sets the far
 * zsh's prompt to `%# ` (two columns) and its right prompt to nothing.
 *
 * WHY. With the quiet shell on, a far zsh reads no rc file of his, so its
 * prompt is macOS's `/etc/zshrc` default, `%n@%m %1~ %# `: on this Mac
 * `gdc@Gregs-MacBook-Pro-2 tmp % `, 30 columns. `smoke:remote`'s arm 10a types
 * a 74-character resume command into an 80-column far pane and counts it with
 * `capture-pane -p -J` as ONE CONTIGUOUS string; 30 + 74 is past 80, zsh
 * breaks the line itself, tmux never marks the row as wrapped, `-J` has
 * nothing to join, and the gate read 0 while the product's own counter
 * (`countOccurrences` in src/main/machines/remote-arm.ts, which ignores line
 * breaks for exactly this reason) read 1. MEASURED by the fixer of the ruled
 * round on a scratch tmux socket, an 80-column detached pane, a login zsh with
 * an empty `ZDOTDIR`: contiguous 0, spaces removed 1, the line broken at
 * column 80; the same with this file: contiguous 1, spaces removed 1, one
 * line. The product's counter is right and is not touched; the harness gives
 * the gate a prompt that leaves the line room.
 *
 * IT REQUIRES THE QUIET SHELL, and refuses without it: the only `ZDOTDIR` this
 * may write into is the yard's own, never his.
 *
 * OFF BY DEFAULT, so `probe:p95`, `probe:p292:remote`, `probe:p320`,
 * `probe:p320:skew` and `probe:p336`, which set the quiet shell and read their
 * far panes with the default prompt, keep the far shell they were measured
 * with; the sshd configuration is byte for byte the same either way, because
 * this is a file in the yard and not a `SetEnv` value. Answers `{ zshrc }`,
 * the file's path, when it is on, else null.
 */
export function shortPromptFor(env, quiet) {
  if (String(env?.['SCRATCH_MACHINE_SHORT_PROMPT'] ?? '') !== '1') return null;
  if (quiet === null) {
    throw new Error(
      "SCRATCH_MACHINE_SHORT_PROMPT=1 needs SCRATCH_MACHINE_QUIET_SHELL=1 as well: the prompt is written into the yard's own ZDOTDIR, and without the quiet shell there is none."
    );
  }
  return { zshrc: join(quiet.zdot, '.zshrc') };
}

/** The short prompt's whole file: two columns of prompt and no right prompt. */
export const SHORT_PROMPT_ZSHRC =
  "# Written by build/scratch-machine.mjs (SCRATCH_MACHINE_SHORT_PROMPT=1) into this yard's own ZDOTDIR.\n" +
  "PROMPT='%# '\n" +
  "RPROMPT=''\n";

/**
 * The sshd `SetEnv` line: TMUX_TMPDIR always, the quiet shell's two when it is
 * on, and the scratch home's one after them when that is on.
 */
export function setEnvLine(tmuxTmp, quiet, scratchHome = null) {
  const line =
    quiet === null
      ? `SetEnv TMUX_TMPDIR=${tmuxTmp}`
      : `SetEnv TMUX_TMPDIR=${tmuxTmp} ZDOTDIR=${quiet.zdot} HISTFILE=/dev/null`;
  return scratchHome === null ? line : `${line} HOME=${scratchHome.home}`;
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

  // PHASE 337 (D37): under SCRATCH_MACHINE_NO_OWN_KEYS=1 the run's key alone,
  // and the person's keys are never read.
  writeFileSync(
    authorized,
    authorizedLinesFor(readFileSync(`${userKey}.pub`, 'utf8').trim(), process.env).join('\n'),
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
  const quiet = quietShellFor(yard.root, process.env);
  if (quiet !== null) mkdirSync(quiet.zdot, { recursive: true, mode: 0o700 });
  // PHASE 336's ruled round. Written before sshd starts, so no far zsh of this
  // machine ever starts without it.
  const shortPrompt = shortPromptFor(process.env, quiet);
  if (shortPrompt !== null) writeFileSync(shortPrompt.zshrc, SHORT_PROMPT_ZSHRC, { encoding: 'utf8', mode: 0o600 });
  // PHASE 336 (D23). Made 0700 even when it already exists, because a far
  // shell's history and rc files would land in it.
  const scratchHome = scratchHomeFor(yard.root, process.env, quiet);
  if (scratchHome !== null) {
    mkdirSync(scratchHome.home, { recursive: true, mode: 0o700 });
    chmodSync(scratchHome.home, 0o700);
  }

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
      // this Mac. See rule 2 in the header. With SCRATCH_MACHINE_QUIET_SHELL=1
      // it also carries the quiet shell (see quietShellFor), and with
      // SCRATCH_MACHINE_SCRATCH_HOME=1 the scratch home (see scratchHomeFor).
      setEnvLine(tmuxTmp, quiet, scratchHome),
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
    /** The far `$HOME` this machine lends its sessions (D23), or null when it lends none. */
    scratchHome: scratchHome === null ? null : scratchHome.home,
    /** The `.zshrc` holding the short prompt (Phase 336's ruled round), or null when it is off. */
    shortPrompt: shortPrompt === null ? null : shortPrompt.zshrc,

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
