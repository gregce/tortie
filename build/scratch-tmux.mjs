#!/usr/bin/env node
/**
 * scratch-tmux.mjs. One place that ends a scratch tmux server and PROVES it
 * gone (Phase 361).
 *
 * ## Why this file exists
 *
 * Phase 357's integrator found the fault battery leaving tmux processes behind
 * on the operator's Mac: after a full battery, 8 processes on the sockets
 * `gmux-fault-47502-13` to `-16`, each pair being the work launch's own server
 * and its first control client (`-C new-session -A -s gmux-control`), both
 * reparented to launchd, the client's stdin, stdout and stderr all
 * `unix ->(none)`. The battery printed PASS. Its teardown sent one
 * `kill-server` through whichever tmux was first on PATH, ignored a failure,
 * never checked that the server went, and removed the socket file, so a server
 * still holding a client stayed up with no name left to reach it by.
 * build/electron-run.mjs's step 6 sent the same unchecked kill.
 *
 * WHY ONE KILL-SERVER IS NOT ENOUGH, read from tmux 3.7b's source and measured
 * (build/p361/SPEC.md §0.1 items 5 and 6, §2.7). tmux releases a control client
 * only once it has written every line it holds for that client. When the
 * client's reader dies, which is what the battery's SIGKILL of the app does, a
 * line tmux then tries to write fails and stays held, so the client is never
 * told to exit, and a server asked to stop waits for its client list to empty.
 * `kill-server` answers 0, the server stays, and `list-clients` no longer lists
 * the client it holds. A planted pair was left that way 13 of 13 times. Ending
 * the client lets the server go within 100 ms.
 *
 * ## The three exports
 *
 *   tmuxCandidates(options)          the tmux the app would run, in its order
 *   endScratchServer(socket, opts)   end one scratch server and prove it gone
 *   namingProcesses(pattern, rows)   every process naming a matching -L socket;
 *                                    it counts and signals nothing
 *
 * ## What endScratchServer does, in order (build/p361/SPEC.md §4.4, D9 to D12)
 *
 *  1. Refuses `gmux`, `default` and any name that is not `gmux-` followed by
 *     the app's own socket characters, by throwing, before anything runs. A
 *     `/` is refused with the rest, because tmux joins a `-L` name onto its
 *     socket folder as it stands.
 *  2. Reaches the server through the first candidate that answers.
 *  3. From then on asks it with the copy of tmux the server itself runs.
 *  4. Reads the server's pid, the clients it lists, and the clients it HOLDS:
 *     a process whose command line names `-L <socket>` and that holds a UNIX
 *     socket connected to one of the server's own sockets bound to that path.
 *     The server does not list a client it holds. A process naming the socket
 *     and connected to nothing is recorded and never signalled.
 *  5. Sends `kill-server` and waits up to 2 s for the server's pid to go.
 *  6. When the server is still there, ends each client it named by pid,
 *     SIGTERM then SIGKILL, its command line read again before each signal,
 *     then waits for the server again.
 *  7. When the server outlives its clients, SIGKILLs it, and fails.
 *  8. Removes the socket file at its exact path, and only once the server's
 *     pid has gone.
 *  9. Answers what it did, in order, and whether anything it named is left.
 *
 * Every pid it signals was read from that socket's own server, through the
 * clients it lists or the processes connected to its socket, and its command
 * line is read again right before the signal. There is no pkill, no kill by
 * name or pattern and no negative pid. A reading it cannot take, being a ps,
 * an lsof or a tmux that will not run, counts against the verdict and is never
 * read as gone. It is synchronous throughout, so build/electron-run.mjs can
 * call it from its `exit` handler.
 *
 * ## The self-test
 *
 * `npm run conformance:scratchtmux` is `node build/scratch-tmux.mjs
 * --self-test`. It plants the held pair, two decoys, a tmux that cannot reach
 * the server, refused names, no server and a live client on scratch sockets of
 * its own, reads tmuxCandidates' order over files it makes, reads the fault
 * battery's and the helper's teardowns with the TypeScript parser, and ablates
 * its own clauses and those text rules, each of which must go red. Since Phase
 * 361's fix round it also plants a held client whose command line changes
 * before the signal (T9), a server a job holds past its clients (T10), a server
 * pid that names no socket (T11) and a server already stopping (T13), and reads
 * every signal this file sends as the first act after a fresh read of that
 * pid's command line (T12), because nothing else pinned those reads. The drop
 * round added a held client whose command line changes after its SIGTERM
 * (T14), so a re-read answered from an earlier one would SIGKILL it, and a ps
 * that cannot answer (T15), which must never read as gone. It needs
 * /bin/ps and lsof, which cannot start inside the history block, so it runs
 * outside it, and it ends everything it started by pid in a finally, its
 * command line read again first.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TAG = '[scratch-tmux]';

/** The repository root, being the parent of build/. */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** How long one tmux, ps or lsof command may take. */
const COMMAND_BOUND_MS = 5_000;
/** How long the server is given to leave after `kill-server`: 20 times the measured 100 ms. */
const KILL_SERVER_WAIT_MS = 2_000;
/** A client after SIGTERM, then after SIGKILL. */
const CLIENT_TERM_WAIT_MS = 2_000;
const CLIENT_KILL_WAIT_MS = 1_000;
/** The server once its clients were ended, then after its own SIGKILL. */
const SERVER_AFTER_CLIENTS_MS = 2_000;
const SERVER_KILL_WAIT_MS = 1_000;
/** How long a client the server named may take to leave once its server has gone. */
const CLIENT_SETTLE_MS = 1_000;
const POLL_MS = 25;

const PS = '/bin/ps';
const LSOF = '/usr/sbin/lsof';

/** The three install folders the app probes after its own copy (src/main/tmux/resolve.ts). */
const INSTALLED_TMUX = ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux', '/usr/bin/tmux'];
/** The checkout's own copy, VENDORED_TMUX_RELATIVE_PATH in src/main/tmux/resolve.ts. */
const VENDORED_TMUX = ['build', 'vendor', 'tmux', 'bin', 'tmux'];

/**
 * A scratch socket: `gmux-` and then only the characters the app itself allows
 * in a socket name (`activeTmuxSocket` in src/main/tmux/resolve.ts).
 */
const SCRATCH_NAME = /^gmux-[A-Za-z0-9._-]+$/;

const SLEEPER = new Int32Array(new SharedArrayBuffer(4));

/** Block this thread for `ms`, which is what keeps the whole teardown synchronous. */
function pauseSync(ms) {
  if (ms > 0) Atomics.wait(SLEEPER, 0, 0, ms);
}

/** The first line of a command's output, trimmed. */
function firstLine(text) {
  return String(text ?? '').trim().split('\n')[0].trim();
}

/** True when `path` is a regular file this process may run. */
function isExecutableFile(path) {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** realpath(3) of a path, or the path itself when it does not resolve. */
function realOrSame(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

// ---------------------------------------------------------------------------
// The tmux the app would run
// ---------------------------------------------------------------------------

/**
 * Every tmux worth asking for a server the app started, in the app's own order
 * (D11): a packaged launch's own `Contents/Resources/bin/tmux` when `bundled`
 * names one, `GMUX_TMUX_BIN` when it names an executable file, the checkout's
 * `build/vendor/tmux/bin/tmux`, the three install folders, then `tmux` on PATH.
 * An absolute candidate that is not there is skipped, so the bare name is the
 * only one that can fail to start, and the bare name is left out when PATH
 * finds the very file an earlier candidate already names: asking one copy
 * twice costs a second 5 s bound against a server that does not answer.
 *
 * `GMUX_TMUX_BIN` is taken only as an absolute path. The app also takes a
 * relative one, resolved against ITS working directory, which this process
 * cannot know; the candidates after it reach the server all the same.
 *
 * @param {{repoRoot?: string, env?: Record<string, string|undefined>, bundled?: string|null}} [options]
 * @returns {string[]}
 */
export function tmuxCandidates({ repoRoot: root, env = process.env, bundled = null } = {}) {
  const out = [];
  const add = (path) => {
    if (!out.includes(path)) out.push(path);
  };
  if (typeof bundled === 'string' && bundled.startsWith('/') && isExecutableFile(bundled)) add(bundled);
  const override = String(env?.['GMUX_TMUX_BIN'] ?? '').trim();
  if (override.startsWith('/') && isExecutableFile(override)) add(override);
  if (typeof root === 'string' && root !== '') {
    const vendored = join(root, ...VENDORED_TMUX);
    if (isExecutableFile(vendored)) add(vendored);
  }
  for (const installed of INSTALLED_TMUX) if (existsSync(installed)) add(installed);
  const onPath = String(env?.['PATH'] ?? '')
    .split(':')
    .filter((dir) => dir.startsWith('/'))
    .map((dir) => join(dir, 'tmux'))
    .find(isExecutableFile);
  if (onPath === undefined || !out.map(realOrSame).includes(realOrSame(onPath))) add('tmux');
  return out;
}

// ---------------------------------------------------------------------------
// Reading the process table, and what is alive
// ---------------------------------------------------------------------------

/**
 * One process's state: `alive`, `zombie`, `gone`, or `unknown` when ps could
 * not answer. `kill(pid, 0)` succeeds on a zombie, which is why ps is asked as
 * well (§2.9). A zombie holds no memory and is not a leak (CLAUDE.md).
 */
function stateOf(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return 'gone';
  try {
    process.kill(pid, 0);
  } catch (err) {
    if (err?.code !== 'EPERM') return 'gone';
  }
  const r = spawnSync(PS, ['-p', String(pid), '-o', 'stat='], {
    encoding: 'utf8',
    timeout: COMMAND_BOUND_MS
  });
  if (r.error !== undefined) return 'unknown';
  const stat = String(r.stdout ?? '').trim();
  if (r.status === 1 && stat === '') return 'gone';
  if (r.status !== 0 || stat === '') return 'unknown';
  return stat.startsWith('Z') ? 'zombie' : 'alive';
}

/** Alive, or not proven otherwise: a reading that failed never counts as gone. */
function alive(pid) {
  const state = stateOf(pid);
  return state === 'alive' || state === 'unknown';
}

/** Wait at most `ms` for a pid to go, and say whether it did. */
function waitGone(pid, ms) {
  const end = Date.now() + ms;
  while (alive(pid)) {
    if (Date.now() >= end) return false;
    pauseSync(POLL_MS);
  }
  return true;
}

/** One process's full command line, or '' when it cannot be read. */
function commandOf(pid) {
  const r = spawnSync(PS, ['-ww', '-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
    timeout: COMMAND_BOUND_MS
  });
  return r.error === undefined && r.status === 0 ? String(r.stdout ?? '').trim() : '';
}

/**
 * Every process but the ps that read them, as `{ pid, ppid, stat, command }`.
 * It THROWS when the table cannot be read, so a count over it can never read
 * an unreadable table as empty.
 */
function readProcessTable() {
  const r = spawnSync(PS, ['-Aww', '-o', 'pid=,ppid=,stat=,command='], {
    encoding: 'utf8',
    timeout: COMMAND_BOUND_MS,
    maxBuffer: 64 * 1024 * 1024
  });
  if (r.error !== undefined || r.status !== 0) {
    const why = r.error !== undefined ? String(r.error.code ?? r.error.message) : `exit ${String(r.status)}`;
    throw new Error(`${PS} could not read the process table (${why})`);
  }
  const rows = [];
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
    if (m === null || Number(m[1]) === r.pid) continue;
    rows.push({ pid: Number(m[1]), ppid: Number(m[2]), stat: m[3], command: m[4].trim() });
  }
  return rows;
}

/** This process and every process above it, from one reading of the table. */
function ancestryOf(rows, pid) {
  const parents = new Map(rows.map((row) => [row.pid, row.ppid]));
  const mine = new Set();
  for (let p = pid; Number.isInteger(p) && p > 1 && !mine.has(p); p = parents.get(p) ?? 0) mine.add(p);
  return mine;
}

/** Every socket name a command line hands tmux with `-L`, apart or attached. */
function socketsNamed(command) {
  const tokens = String(command ?? '').split(/\s+/);
  const names = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === '-L' && i + 1 < tokens.length) names.push(tokens[i + 1]);
    else if (tokens[i].startsWith('-L') && tokens[i].length > 2) names.push(tokens[i].slice(2));
  }
  return names;
}

/** Whether a command line names this socket with `-L`. */
function namesSocket(command, socket) {
  return socketsNamed(command).includes(socket);
}

/**
 * Every process whose command line names, with `-L`, a socket matching
 * `pattern`, as `{ pid, ppid, command }`. Pure over the rows it is given, it
 * counts and signals nothing (D13). With no rows given it reads the table, and
 * an unreadable table throws rather than counting nothing.
 *
 * @param {RegExp} pattern an anchored pattern of socket names
 * @param {{pid: number, ppid: number, command: string}[]} [rows]
 * @returns {{pid: number, ppid: number, command: string}[]}
 */
export function namingProcesses(pattern, rows = readProcessTable()) {
  if (!(pattern instanceof RegExp)) throw new TypeError(`${TAG} namingProcesses needs a RegExp`);
  const once = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
  return rows
    .filter((row) => socketsNamed(row.command).some((name) => once.test(name)))
    .map(({ pid, ppid, command }) => ({ pid, ppid, command }));
}

/**
 * One process's UNIX sockets from lsof, as `{ device, name }`, or null when
 * lsof would not run. A UNIX socket's line is COMMAND PID USER FD TYPE DEVICE
 * SIZE/OFF NAME with no NODE, so NAME is the eighth column; the prototype read
 * the ninth and called a held client "not connected" (§2.9). Read by TYPE here,
 * so a command name with a space in it cannot shift the columns.
 */
function unixSockets(pid) {
  const r = spawnSync(LSOF, ['-w', '-a', '-p', String(pid), '-U'], {
    encoding: 'utf8',
    timeout: COMMAND_BOUND_MS,
    maxBuffer: 16 * 1024 * 1024
  });
  if (r.error !== undefined) return null;
  const out = [];
  for (const line of String(r.stdout ?? '').split('\n').slice(1)) {
    const f = line.trim().split(/\s+/);
    const type = f.findIndex((field, i) => i >= 4 && field === 'unix' && /^0x[0-9a-f]+$/i.test(f[i + 1] ?? ''));
    if (type === -1) continue;
    const nameAt = /^(?:0t\d+|\d+)$/.test(f[type + 2] ?? '') ? type + 3 : type + 2;
    out.push({ device: f[type + 1], name: f.slice(nameAt).join(' ') });
  }
  return out;
}

/** Whether one of this process's UNIX sockets has its peer at one of `addresses`. */
function connectedTo(pid, addresses) {
  const sockets = unixSockets(pid);
  if (sockets === null) return false;
  return sockets.some((s) => s.name.startsWith('->') && addresses.has(s.name.slice(2)));
}

// ---------------------------------------------------------------------------
// Ending one scratch server
// ---------------------------------------------------------------------------

/** Why this socket may not be ended, or null when it is a scratch socket. */
function refusalOf(socket) {
  if (typeof socket !== 'string' || socket === '') return 'it names no socket';
  if (socket === 'gmux') return "gmux is the private server the operator's live work runs on";
  if (socket === 'default') return "default is the person's own tmux server";
  if (!SCRATCH_NAME.test(socket)) {
    return 'a scratch socket is gmux- followed by letters, digits, dots, dashes and underscores only';
  }
  return null;
}

/** Signal one pid. Never a group: the pid must be a positive integer above 1. */
function signalPid(pid, signal) {
  if (!Number.isInteger(pid) || pid <= 1) return;
  try {
    process.kill(pid, signal);
  } catch {
    /* already gone, which is the state wanted */
  }
}

/** Why one command did not answer, in a few words. */
function missOf(r) {
  if (r.error?.code === 'ETIMEDOUT') return `timed out after ${String(COMMAND_BOUND_MS)} ms`;
  if (r.error !== undefined) return `could not start (${String(r.error.code ?? r.error.message)})`;
  if (r.signal !== null && r.signal !== undefined) return `ended by ${r.signal}`;
  const said = firstLine(r.stderr);
  return said === '' ? `exit ${String(r.status)}` : `exit ${String(r.status)}: ${said.slice(0, 160)}`;
}

/**
 * What a candidate answers when the server was already told to stop and still
 * waits on a client it holds: tmux closes every new connection once it is
 * exiting (server.c's server_accept), so no copy of tmux can ask it anything.
 * Said beside the answer, so it never reads as a tmux that is missing.
 */
const ALREADY_STOPPING = 'a server already stopping closes every new connection';

/**
 * The first candidate that reaches the server, with the server's pid and its
 * socket's path, or the reason each one did not. "No server" is an answer, and
 * so is "no such socket file"; a path that is not `<folder>/<socket>` is not.
 */
function reachServer(socket, candidates, run) {
  const misses = [];
  for (const bin of candidates) {
    if (typeof bin !== 'string' || bin === '') continue;
    if (bin.startsWith('/') && !existsSync(bin)) continue;
    const r = run(bin, ['display-message', '-p', '#{pid} #{socket_path}']);
    if (r.error === undefined && r.status === 0) {
      const m = String(r.stdout ?? '').trim().match(/^(\d+) (.+)$/);
      if (m !== null && m[2].endsWith(`/${socket}`)) return { bin, pid: Number(m[1]), path: m[2], misses };
      misses.push({ bin, why: `answered ${JSON.stringify(String(r.stdout ?? '').trim().slice(0, 160))}` });
      continue;
    }
    if (r.error === undefined) {
      const said = firstLine(r.stderr);
      const none =
        said.match(/^no server running on (.+)$/) ??
        said.match(/^error connecting to (.+) \(No such file or directory\)$/);
      if (none !== null && none[1].endsWith(`/${socket}`)) return { bin, pid: null, path: none[1], misses };
    }
    const stopping = r.error === undefined && firstLine(r.stderr) === 'server exited unexpectedly';
    misses.push({ bin, why: stopping ? `${missOf(r)} (${ALREADY_STOPPING})` : missOf(r) });
  }
  return { bin: null, pid: null, path: null, misses };
}

/**
 * The copy of tmux the server itself runs, when that is an executable file
 * other than the candidate that reached it, or null (D11).
 */
function serverBinary(serverPid, reachedBy) {
  const r = spawnSync(PS, ['-p', String(serverPid), '-o', 'comm='], {
    encoding: 'utf8',
    timeout: COMMAND_BOUND_MS
  });
  const comm = r.error === undefined && r.status === 0 ? firstLine(r.stdout) : '';
  if (!comm.startsWith('/') || !isExecutableFile(comm)) return null;
  return realOrSame(comm) === realOrSame(reachedBy) ? null : comm;
}

/**
 * The device addresses of the server's UNIX sockets bound to its socket path:
 * the one it listens on and the one it accepted for each client. A client's
 * own socket names its peer as one of these (§2.7).
 */
function serverAddresses(serverPid, socketPath, v) {
  const sockets = unixSockets(serverPid);
  if (sockets === null) {
    v.why.push(`${LSOF} would not run, so no client the server holds can be proven connected`);
    return new Set();
  }
  return new Set(sockets.filter((s) => s.name === socketPath).map((s) => s.device));
}

/**
 * End one client the server named: SIGTERM, then SIGKILL, its command line read
 * again before each, so a pid that went and came back as somebody else's is
 * never signalled. Answers the signal that ended it, or null.
 */
function endClient(pid, socket, v) {
  for (const [signal, waitMs] of [
    ['SIGTERM', CLIENT_TERM_WAIT_MS],
    ['SIGKILL', CLIENT_KILL_WAIT_MS]
  ]) {
    if (!namesSocket(commandOf(pid), socket)) {
      if (alive(pid)) v.why.push(`${String(pid)} no longer names ${socket}; not signalled`);
      return null;
    }
    signalPid(pid, signal);
    v.steps.push(`${signal} ${String(pid)}`);
    if (waitGone(pid, waitMs)) {
      v.steps.push(`${String(pid)} gone`);
      return signal;
    }
  }
  return null;
}

/**
 * Step 6 of the header: every client the server listed or holds, ended by pid,
 * then the server waited for again. Answers whether the server has gone.
 */
function endClients(v, socket) {
  for (const pid of [...v.listed, ...v.held]) {
    if (!alive(pid)) continue;
    const signal = endClient(pid, socket, v);
    if (signal !== null) v.ended.push({ pid, signal });
  }
  if (!waitGone(v.serverPid, SERVER_AFTER_CLIENTS_MS)) return false;
  v.steps.push('server gone');
  if (v.ended.length > 0) v.notes.push('the server left once the client it held was ended');
  return true;
}

/**
 * The socket file, at its exact path and only when that is a socket: never a
 * file the path merely points at.
 */
function removeSocketFile(v, socket) {
  const path = v.socketPath;
  if (typeof path !== 'string' || !path.endsWith(`/${socket}`)) {
    v.socketFile = 'kept';
    return;
  }
  let entry;
  try {
    entry = lstatSync(path);
  } catch (err) {
    v.socketFile = err?.code === 'ENOENT' ? 'absent' : 'kept';
    return;
  }
  if (!entry.isSocket()) {
    v.socketFile = 'kept';
    v.notes.push(`${path} is not a socket, so it was left`);
    return;
  }
  try {
    unlinkSync(path);
    v.socketFile = 'removed';
    v.steps.push('socket removed');
  } catch (err) {
    v.socketFile = err?.code === 'ENOENT' ? 'absent' : 'kept';
  }
}

/** The verdict made whole: every process left is a why, and ok is nothing wrong. */
function settled(v) {
  for (const left of v.left) v.why.push(`left: ${String(left.pid)} ${left.command}`);
  v.ok = v.why.length === 0 && v.left.length === 0;
  return v;
}

/**
 * End one scratch tmux server and prove it gone. Steps 1 to 9 of the header,
 * in that order, synchronously. It throws only for a refused name, and only
 * before anything has run.
 *
 * `env` is the environment the APP ran with, because `TMUX_TMPDIR` in it is
 * where `-L <socket>` lives. `TMUX` and `TMUX_PANE` are taken out of it.
 *
 * @param {string} socket
 * @param {{candidates?: string[], env?: Record<string, string|undefined>}} [options]
 * @returns {{
 *   ok: boolean, socket: string, tmux: string|null, serverPid: number|null,
 *   socketPath: string|null, listed: number[], held: number[], notConnected: number[],
 *   ended: {pid: number, signal: string}[], left: {pid: number, command: string}[],
 *   socketFile: 'removed'|'absent'|'kept', steps: string[], why: string[], notes: string[]
 * }}
 */
export function endScratchServer(socket, { candidates = [], env = process.env } = {}) {
  const refused = refusalOf(socket);
  if (refused !== null) {
    throw new Error(`${TAG} refusing to end the tmux server on ${JSON.stringify(socket)}: ${refused}.`);
  }
  const v = {
    ok: false,
    socket,
    tmux: null,
    serverPid: null,
    socketPath: null,
    listed: [],
    held: [],
    notConnected: [],
    ended: [],
    left: [],
    socketFile: 'kept',
    steps: [],
    why: [],
    notes: []
  };
  const tmuxEnv = { ...env, TMUX: undefined, TMUX_PANE: undefined };
  const run = (bin, args) =>
    spawnSync(bin, ['-L', socket, ...args], {
      encoding: 'utf8',
      env: tmuxEnv,
      timeout: COMMAND_BOUND_MS,
      stdio: ['ignore', 'pipe', 'pipe']
    });

  // 2. Reach the server.
  const reach = reachServer(socket, candidates, run);
  if (reach.bin === null) {
    const each = reach.misses.map((m) => `${m.bin} ${m.why}`).join('; ');
    v.why.push(`no tmux reached the server on ${socket}: ${each === '' ? 'no candidate was given' : each}`);
    return settled(v);
  }
  for (const miss of reach.misses) v.notes.push(`${miss.bin} did not reach the server: ${miss.why}`);
  v.tmux = reach.bin;
  v.socketPath = reach.path;
  if (reach.pid === null) {
    v.steps.push('no server');
    removeSocketFile(v, socket);
    return settled(v);
  }
  v.serverPid = reach.pid;
  v.steps.push(`server ${String(reach.pid)}`);

  // 3. From here on, the copy of tmux the server itself runs.
  const own = serverBinary(reach.pid, reach.bin);
  if (own !== null) {
    v.notes.push(`the server runs ${own}; asked it with that`);
    v.tmux = own;
  }

  // 4. Its clients, the ones it lists and the ones it holds.
  const listing = run(v.tmux, ['list-clients', '-F', '#{client_pid}']);
  if (listing.error === undefined && listing.status === 0) {
    for (const line of String(listing.stdout ?? '').split('\n')) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 1 && pid !== v.serverPid && !v.listed.includes(pid)) v.listed.push(pid);
    }
  } else {
    v.steps.push(`list-clients ${missOf(listing)}`);
  }
  let rows = null;
  try {
    rows = readProcessTable();
  } catch (err) {
    v.why.push(`${String(err?.message ?? err)}, so no client the server holds can be named`);
  }
  if (rows !== null) {
    const mine = ancestryOf(rows, process.pid);
    const naming = rows.filter(
      (row) =>
        row.pid !== v.serverPid &&
        !mine.has(row.pid) &&
        !v.listed.includes(row.pid) &&
        namesSocket(row.command, socket)
    );
    if (naming.length > 0) {
      const addresses = serverAddresses(v.serverPid, v.socketPath, v);
      for (const row of naming) {
        if (connectedTo(row.pid, addresses)) {
          v.held.push(row.pid);
        } else {
          v.notConnected.push(row.pid);
          v.notes.push(`${String(row.pid)} names ${socket} and is not connected to its server; not signalled`);
        }
      }
    }
  }

  // 5. Ask it to stop, and wait for it.
  const killed = run(v.tmux, ['kill-server']);
  v.steps.push(`kill-server ${killed.error === undefined && killed.status === 0 ? 'exit 0' : missOf(killed)}`);
  let gone = waitGone(v.serverPid, KILL_SERVER_WAIT_MS);
  if (gone) v.steps.push('server gone');

  // 6. Still there: it is holding a client. End each client it named.
  if (!gone) gone = endClients(v, socket);

  // 7. Still there with its clients gone: the server itself, and that fails.
  if (!gone) {
    if (namesSocket(commandOf(v.serverPid), socket)) {
      signalPid(v.serverPid, 'SIGKILL');
      v.steps.push(`SIGKILL ${String(v.serverPid)}`);
      gone = waitGone(v.serverPid, SERVER_KILL_WAIT_MS);
      if (gone) {
        v.steps.push('server gone');
        v.why.push('the server outlived its clients and was ended by SIGKILL');
      }
    } else if (alive(v.serverPid)) {
      v.why.push(`${String(v.serverPid)} no longer names ${socket}; not signalled`);
    } else {
      gone = true;
      v.steps.push('server gone');
    }
  }

  // 8. The socket file, only once the server's pid has gone.
  if (gone) removeSocketFile(v, socket);

  // 9. What is left of everything it named, each client given a moment to go.
  for (const pid of new Set([v.serverPid, ...v.listed, ...v.held])) {
    if (!waitGone(pid, pid === v.serverPid ? 0 : CLIENT_SETTLE_MS)) v.left.push({ pid, command: commandOf(pid) });
  }
  return settled(v);
}

// ===========================================================================
// THE SELF-TEST (conformance:scratchtmux). Everything below runs only under
// --self-test; the three exports above never reach it.
// ===========================================================================

/** The pane a planted server's first session runs, which reads its terminal and waits. */
const PLANTED_PANE = 'cat';

/**
 * The planted parent, written into the self-test's scratch at run time and
 * never kept as a file under build/, because it starts a child it never ends:
 * that is the plant. It is the app's shape, then a stalled reader: it spawns
 * the app's own control client, stops reading its output, asks for far more
 * than the socket holds, and SIGKILLs itself (build/p361/SPEC.md §2.7, 13 of
 * 13 held).
 */
const PARENT_SOURCE = [
  "import { spawn } from 'node:child_process';",
  'const [tmuxPath, confPath, socketName] = process.argv.slice(2);',
  "const plantedClient = spawn(tmuxPath, ['-L', socketName, '-f', confPath, '-C', 'new-session', '-A', '-s', 'gmux-control'], { stdio: ['pipe', 'pipe', 'pipe'] });",
  "plantedClient.stdout.on('data', () => {});",
  "plantedClient.stderr.on('data', () => {});",
  "plantedClient.stdin.write('refresh-client -f no-output\\n');",
  "process.stdout.write('client ' + String(plantedClient.pid) + '\\n');",
  "setTimeout(() => { plantedClient.stdout.pause(); for (let i = 0; i < 40; i += 1) plantedClient.stdin.write('list-keys\\n'); setTimeout(() => process.kill(process.pid, 'SIGKILL'), 500); }, 300);",
  'setInterval(() => {}, 1000);'
].join('\n');

/**
 * A decoy: a node process whose command line names `-L <socket>` and that is
 * connected to no tmux. It writes `ready` once its handlers are in, writes the
 * name of any signal it is sent and leaves, and leaves by itself after 120 s
 * whatever happens, so a decoy can never outlive a run by long.
 */
const DECOY_SOURCE =
  "const fs = require('node:fs'); const decoyLog = process.argv[process.argv.length - 1]; " +
  "for (const name of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(name, () => { fs.appendFileSync(decoyLog, name + '\\n'); process.exit(0); }); " +
  "fs.appendFileSync(decoyLog, 'ready\\n'); setTimeout(() => {}, 120000);";

/** A tmux that cannot reach any server, which logs every call it is given. */
const standInText = (log) =>
  `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\necho 'protocol version mismatch (client 7, server 8)' >&2\nexit 1\n`;

/**
 * The word a plant whose command line leaves `-L <socket>` behind carries
 * instead: an exec'd holder's and the impostor's argv[0], a job's last word.
 * Followed by the socket, it is how this run's own `finally` knows the pid is
 * still the one it planted (see {@link ownedPlant}).
 */
const PLANT_MARK = 'p361-plant-';

/**
 * A raw holder (Phase 361's fix round): a perl process whose command line
 * names `-L <socket>` and that holds one UNIX connection to the server's
 * socket, never identifying itself, so the server never lists it and waits on
 * it at kill-server exactly as it waits on a control client whose reader died
 * (§2.7). In `exec` mode, on tmux's MSG_SHUTDOWN (210, which the server sends
 * every client once kill-server is asked) it execs a perl that waits 60 s
 * with the connection kept: the SAME pid holds the server on while its command
 * line, now `p361-plant-<socket> …`, no longer names the socket, which is a
 * command line that changes between the teardown's reading and its signal. In
 * `term` mode (the drop round) it execs the same way on SIGTERM instead, so the
 * pid the teardown SIGTERMed stays, holding the server, and names the socket no
 * more when it is read again before the SIGKILL. In `hold` mode it only holds.
 * It leaves by itself after 120 s whatever happens.
 *
 * build/assert-background-teardown.mjs does not read this source, as it does
 * not read the planted parent's or the decoys': it reads a name's value only up
 * to the first `;` of the line it is assigned on. What ends a holder is
 * endPlanted, from every case's `finally`, and what fails a run that left one
 * is endPlanted's own count of this run's sockets and mark (Phase 361's fix
 * round removed endPlanted's kill of the holders and read the run FAIL naming
 * each one, then end it).
 */
const HOLDER_SOURCE = [
  'use strict; use warnings; use Socket; use Fcntl; use IO::Handle;',
  'my (undef, $socket, $path, $mode, $log) = @ARGV;',
  "open(my $fh, '>>', $log) or die \"log: $!\"; $fh->autoflush(1);",
  'socket(my $s, PF_UNIX, SOCK_STREAM, 0) or die "socket: $!";',
  'connect($s, pack_sockaddr_un($path)) or die "connect: $!";',
  'fcntl($s, F_SETFD, 0) or die "fcntl: $!";',
  '$SIG{ALRM} = sub { exit 0 }; alarm 120;',
  `if ($mode eq q(term)) { $SIG{TERM} = sub { print $fh "exec on SIGTERM\\n"; exec { q(/usr/bin/perl) } qq(${PLANT_MARK}$socket), q(-e), q(select(undef, undef, undef, 60)); }; }`,
  'print $fh "ready\\n"; my $buf = q();',
  'while (1) { my $got = sysread($s, my $chunk, 65536); last if !$got; $buf .= $chunk;',
  '  while (length($buf) >= 16) { my ($type, $len) = unpack(q(V v), $buf); last if $len < 16 || length($buf) < $len; substr($buf, 0, $len, q());',
  '    print $fh "msg $type\\n";',
  `    if ($type == 210 && $mode eq q(exec)) { print $fh "exec\\n"; exec { q(/usr/bin/perl) } qq(${PLANT_MARK}$socket), q(-e), q(select(undef, undef, undef, 60)); } } }`,
  'print $fh "eof\\n"; exit 0;'
].join('\n');

/**
 * A tmux that answers for a server it is not (T11): `display-message` names
 * `pid` as the server and `path` as its socket, and every other command
 * answers 0 and does nothing. It logs every call.
 */
const impostorStandInText = (log, pid, path) =>
  `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\nif [ "$3" = display-message ]; then printf '%s %s\\n' '${String(pid)}' '${path}'; fi\nexit 0\n`;

/**
 * A ps that cannot answer one question (T15): `-p <pid> -o stat=` about `pid`
 * exits 2 and says so, as a ps that is broken or killed would, and logs it.
 * Every other question goes to /bin/ps itself.
 */
const mutePsText = (log, pid) =>
  `#!/bin/sh\nif [ "$1" = -p ] && [ "$2" = '${String(pid)}' ] && [ "$3" = -o ] && [ "$4" = stat= ]; then\n  printf '%s\\n' "$*" >> '${log}'\n  echo 'ps: this stand-in cannot answer' >&2\n  exit 2\nfi\nexec ${PS} "$@"\n`;

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

/** The socket names this run plants on. */
const ownSockets = () => new RegExp(`^gmux-p361-${String(process.pid)}-\\d+$`);

/**
 * Whether a pid is still one this run planted, read from its command line NOW:
 * it names one of this run's own sockets with `-L`, or carries
 * {@link PLANT_MARK} followed by one. Every signal the self-test sends is
 * guarded by this or by the module's own re-read (T12).
 */
function ownedPlant(pid) {
  const command = commandOf(pid);
  const mine = ownSockets();
  if (socketsNamed(command).some((name) => mine.test(name))) return true;
  return command.split(/\s+/).some((word) => word.startsWith(PLANT_MARK) && mine.test(word.slice(PLANT_MARK.length)));
}

/** The first absolute tmux the app would run, which every plant starts its servers with. */
function plantingTmux() {
  return tmuxCandidates({ repoRoot, env: process.env }).find((bin) => bin.startsWith('/')) ?? null;
}

/** Why this self-test cannot run here, or null. */
function preflight() {
  const ps = spawnSync(PS, ['-p', String(process.pid), '-o', 'pid='], { encoding: 'utf8', timeout: COMMAND_BOUND_MS });
  if (ps.error !== undefined || ps.status !== 0) {
    return `it needs ${PS}, which would not run here (${missOf(ps)}). Inside the history block it cannot start, so run it outside it`;
  }
  const lsof = spawnSync(LSOF, ['-w', '-a', '-p', String(process.pid), '-U'], { encoding: 'utf8', timeout: COMMAND_BOUND_MS });
  if (lsof.error !== undefined) return `it needs ${LSOF}, which would not run here (${missOf(lsof)})`;
  if (plantingTmux() === null) return 'it found no tmux to plant with: no vendored copy, GMUX_TMUX_BIN or install folder holds one';
  return null;
}

/**
 * The run's context: one scratch folder, the env every plant gets (a scratch
 * HOME and ZDOTDIR, /bin/sh, no history file, no TMUX, no TMUX_TMPDIR), and
 * every pid it started or learned, kept so the finally can end each one.
 */
function newContext() {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p361-scratch-tmux-')));
  const home = join(scratch, 'home');
  mkdirSync(home);
  const ctx = {
    scratch,
    tmux: plantingTmux(),
    conf: join(repoRoot, 'resources', 'gmux-tmux.conf'),
    parentFile: join(scratch, 'planted-parent.mjs'),
    env: {
      ...process.env,
      HOME: home,
      ZDOTDIR: home,
      SHELL: '/bin/sh',
      HISTFILE: '/dev/null',
      TMUX: undefined,
      TMUX_PANE: undefined,
      TMUX_TMPDIR: undefined,
      GMUX_SESSION_ID: undefined,
      GMUX_MANAGED: undefined
    },
    count: 0,
    sockets: [],
    servers: new Set(),
    others: new Set(),
    children: [],
    // The raw holders, kept as the children they are: each is ended by its own handle (endPlanted).
    holders: [],
    leaks: []
  };
  writeFileSync(ctx.parentFile, `${PARENT_SOURCE}\n`);
  return ctx;
}

/** A fresh scratch socket of this run's own. */
function newSocket(ctx) {
  ctx.count += 1;
  const socket = `gmux-p361-${String(process.pid)}-${String(ctx.count)}`;
  ctx.sockets.push(socket);
  return socket;
}

/** Start a planted server on `socket` with the app's own configuration. */
function plantServer(ctx, socket, args) {
  spawnSync(ctx.tmux, ['-L', socket, '-f', ctx.conf, ...args], {
    env: ctx.env,
    stdio: 'ignore',
    timeout: COMMAND_BOUND_MS
  });
}

/** The planted server's pid and socket path, once it answers. */
async function serverOf(ctx, socket) {
  for (let i = 0; i < 100; i += 1) {
    const r = spawnSync(ctx.tmux, ['-L', socket, 'display-message', '-p', '#{pid} #{socket_path}'], {
      encoding: 'utf8',
      env: ctx.env,
      timeout: COMMAND_BOUND_MS
    });
    const m = String(r.stdout ?? '').trim().match(/^(\d+) (.+)$/);
    if (r.status === 0 && m !== null) {
      ctx.servers.add(Number(m[1]));
      return { pid: Number(m[1]), path: m[2] };
    }
    await pause(50);
  }
  throw new Error(`the planted server on ${socket} never answered`);
}

/** The pids a server lists as its clients. */
function listedBy(ctx, socket) {
  const r = spawnSync(ctx.tmux, ['-L', socket, 'list-clients', '-F', '#{client_pid}'], {
    encoding: 'utf8',
    env: ctx.env,
    timeout: COMMAND_BOUND_MS
  });
  return String(r.stdout ?? '')
    .split('\n')
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 1);
}

/** Start one decoy naming `decoySocket`, and wait until its handlers are in. */
async function plantDecoy(ctx, decoySocket) {
  const decoyLog = join(ctx.scratch, `decoy-${String(ctx.children.length + 1)}.log`);
  writeFileSync(decoyLog, '');
  const decoy = spawn(process.execPath, ['-e', DECOY_SOURCE, '--', '-L', decoySocket, decoyLog], {
    stdio: 'ignore',
    env: ctx.env
  });
  ctx.children.push(decoy);
  if (Number.isInteger(decoy.pid)) ctx.others.add(decoy.pid);
  for (let i = 0; i < 250 && readFileSync(decoyLog, 'utf8') !== 'ready\n'; i += 1) await pause(20);
  if (readFileSync(decoyLog, 'utf8') !== 'ready\n') throw new Error(`the decoy naming ${decoySocket} never said ready`);
  return { pid: decoy.pid, log: decoyLog, socket: decoySocket };
}

/** Whether a decoy is still running and was never sent a signal. */
function decoyUntouched(decoy) {
  return alive(decoy.pid) && readFileSync(decoy.log, 'utf8') === 'ready\n';
}

/**
 * Run the planted parent and answer its control client's pid. spawnSync
 * returns once the parent has SIGKILLed itself, because the client it starts
 * holds none of the parent's own pipes.
 */
function runPlantedParent(ctx, socket) {
  const r = spawnSync(process.execPath, [ctx.parentFile, ctx.tmux, ctx.conf, socket], {
    encoding: 'utf8',
    env: ctx.env,
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const client = Number((String(r.stdout ?? '').match(/client (\d+)/) ?? [])[1]);
  if (Number.isInteger(client) && client > 1) ctx.others.add(client);
  return { client: Number.isInteger(client) && client > 1 ? client : null, signal: r.signal };
}

/**
 * End every process this run started or learned that is still running, the
 * holders, clients and decoys first and the servers after, each only when its
 * command line, read again, is still one this run planted (ownedPlant). Then
 * count what still names one of this run's sockets or carries its mark, end
 * that too, and keep it as a leak.
 */
function endPlanted(ctx) {
  const mine = ownSockets();
  for (const holder of ctx.holders) {
    if (alive(holder.pid) && ownedPlant(holder.pid)) holder.kill('SIGKILL');
    waitGone(holder.pid, 1_000);
  }
  for (const pid of [...ctx.others, ...ctx.servers]) {
    if (!alive(pid) || !ownedPlant(pid)) continue;
    signalPid(pid, 'SIGKILL');
    waitGone(pid, 1_000);
  }
  let left = [];
  try {
    const rows = readProcessTable();
    const marked = (row) => row.command.split(/\s+/).some((word) => word.startsWith(PLANT_MARK) && mine.test(word.slice(PLANT_MARK.length)));
    left = [...namingProcesses(mine, rows), ...rows.filter(marked)];
  } catch (err) {
    ctx.leaks.push(`the process table could not be read at the end (${String(err?.message ?? err)})`);
  }
  for (const row of new Map(left.map((one) => [one.pid, one])).values()) {
    if (row.pid === process.pid) continue;
    ctx.leaks.push(`${String(row.pid)} (ppid ${String(row.ppid)}) ${row.command}`);
    if (ownedPlant(row.pid)) {
      signalPid(row.pid, 'SIGKILL');
      waitGone(row.pid, 1_000);
    }
  }
  ctx.holders.length = 0;
  ctx.others.clear();
  ctx.servers.clear();
}

/** Remove this run's socket files at their exact paths, and its scratch folder. */
function removeScratch(ctx) {
  const folder = join('/tmp', `tmux-${String(process.getuid())}`);
  for (const socket of ctx.sockets) {
    const path = join(folder, socket);
    try {
      if (lstatSync(path).isSocket()) unlinkSync(path);
    } catch {
      /* not there */
    }
  }
  rmSync(ctx.scratch, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// The cases. Each answers { problems: [{ id, why }], detail }.
// ---------------------------------------------------------------------------

/** One problem, by the check it belongs to. */
const problem = (id, why) => ({ id, why });

/**
 * T1's plant: a server with a session, a decoy on another socket, a decoy
 * naming this one and connected to nothing, and the planted parent. Answers
 * once the server holds the client: the client running and not listed, the
 * server running. Three attempts, because a plant that did not hold proves
 * nothing either way.
 */
async function plantHeldPair(ctx) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const socket = newSocket(ctx);
    plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
    const server = await serverOf(ctx, socket);
    const decoyElsewhere = await plantDecoy(ctx, newSocket(ctx));
    const decoyHere = await plantDecoy(ctx, socket);
    const planted = runPlantedParent(ctx, socket);
    await pause(500);
    const holds = () =>
      planted.client !== null &&
      alive(planted.client) &&
      alive(server.pid) &&
      !listedBy(ctx, socket).includes(planted.client);
    if (holds()) {
      await pause(200);
      if (holds()) return { socket, server, client: planted.client, decoyElsewhere, decoyHere, attempt };
    }
    endPlanted(ctx);
  }
  return null;
}

/** T1's checks over one verdict, each by the id an ablation is red on. */
function heldPairProblems(plant, v) {
  const out = [];
  if (v.ok !== true) out.push(problem('ok', `the verdict is not ok: ${v.why.join('; ')}`));
  if (v.listed.length !== 0) out.push(problem('listed', `the server listed ${JSON.stringify(v.listed)}, where it lists nothing it holds`));
  if (JSON.stringify(v.held) !== JSON.stringify([plant.client])) {
    out.push(problem('held', `held ${JSON.stringify(v.held)}, where only the client ${String(plant.client)} is held`));
  }
  if (v.ended.length !== 1 || v.ended[0].pid !== plant.client || v.ended[0].signal !== 'SIGTERM') {
    out.push(problem('ended', `ended ${JSON.stringify(v.ended)}, where the client ${String(plant.client)} is ended first, by SIGTERM`));
  }
  if (alive(plant.server.pid)) out.push(problem('server', `the server ${String(plant.server.pid)} is still running`));
  const gone = v.steps.indexOf('server gone');
  const removed = v.steps.indexOf('socket removed');
  if (gone === -1 || removed === -1 || removed < gone || v.socketFile !== 'removed') {
    out.push(problem('order', `steps ${JSON.stringify(v.steps)} with the file ${v.socketFile}: the socket is removed only once the server has gone`));
  }
  if (existsSync(plant.server.path)) out.push(problem('order', `${plant.server.path} is still there`));
  if (!decoyUntouched(plant.decoyElsewhere)) out.push(problem('decoys', 'the decoy on another socket was signalled or is gone'));
  if (!decoyUntouched(plant.decoyHere)) out.push(problem('decoys', 'the decoy naming this socket was signalled or is gone'));
  if (!v.notConnected.includes(plant.decoyHere.pid)) {
    out.push(problem('decoys', `the decoy naming this socket is not recorded as not connected: ${JSON.stringify(v.notConnected)}`));
  }
  if (!v.notes.includes('the server left once the client it held was ended')) {
    out.push(problem('ended', `the notes do not say the server left once its client was ended: ${JSON.stringify(v.notes)}`));
  }
  return out;
}

/** T1, the deterministic plant, through `end` (the shipping function or an ablated copy). */
async function caseHeldPair(ctx, end) {
  const plant = await plantHeldPair(ctx);
  if (plant === null) return { problems: [problem('plant', 'the planted pair did not hold in 3 attempts, so nothing was proved')], detail: '' };
  try {
    const at = Date.now();
    const v = end(plant.socket, { candidates: [ctx.tmux], env: ctx.env });
    const ms = Date.now() - at;
    return {
      problems: heldPairProblems(plant, v),
      detail: `client ${String(plant.client)} held, ended by ${v.ended[0]?.signal ?? 'nothing'}, the server gone, both decoys untouched, ${String(ms)} ms, plant attempt ${String(plant.attempt)}`
    };
  } finally {
    endPlanted(ctx);
  }
}

/** A stand-in tmux under this run's scratch, and the log of every call it was given. */
function writeStandIn(ctx, name) {
  const path = join(ctx.scratch, name);
  const log = join(ctx.scratch, `${name}.log`);
  writeFileSync(log, '');
  writeFileSync(path, standInText(log), { mode: 0o755 });
  return { path, log, calls: () => readFileSync(log, 'utf8').split('\n').filter((l) => l !== '') };
}

/** T2: a tmux that cannot reach the server, alone and then first of two. */
async function caseStandIn(ctx) {
  const out = [];
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['start-server']);
  const server = await serverOf(ctx, socket);
  const standIn = writeStandIn(ctx, 'stand-in-t2');
  try {
    const alone = endScratchServer(socket, { candidates: [standIn.path], env: ctx.env });
    const want = `no tmux reached the server on ${socket}: ${standIn.path} exit 1: protocol version mismatch (client 7, server 8)`;
    if (alone.ok !== false || alone.why[0] !== want) out.push(problem('alone', `alone it read ok=${String(alone.ok)} ${JSON.stringify(alone.why)}, not "${want}"`));
    if (alone.steps.length !== 0 || alone.ended.length !== 0) out.push(problem('alone', `alone it did ${JSON.stringify(alone.steps)}, where nothing is done`));
    if (!alive(server.pid) || !existsSync(server.path)) out.push(problem('alone', 'alone it ended the server or its socket file'));
    if (standIn.calls().length !== 1) out.push(problem('alone', `the stand-in was called ${JSON.stringify(standIn.calls())}`));
    const second = endScratchServer(socket, { candidates: [standIn.path, ctx.tmux], env: ctx.env });
    const note = `${standIn.path} did not reach the server: exit 1: protocol version mismatch (client 7, server 8)`;
    if (second.ok !== true) out.push(problem('second', `second it read ${JSON.stringify(second.why)}`));
    if (!second.notes.includes(note)) out.push(problem('second', `the stand-in's why is not noted: ${JSON.stringify(second.notes)}`));
    if (realOrSame(second.tmux ?? '') !== realOrSame(ctx.tmux)) out.push(problem('second', `it asked ${String(second.tmux)}, not ${ctx.tmux}`));
    if (second.ended.length !== 0) out.push(problem('second', `it signalled ${JSON.stringify(second.ended)}`));
    if (alive(server.pid) || existsSync(server.path)) out.push(problem('second', 'the server or its socket file is still there'));
    if (standIn.calls().length !== 2) out.push(problem('second', `the stand-in was called ${JSON.stringify(standIn.calls())}`));
    return { problems: out, detail: 'alone: no tmux reached it and nothing was signalled; first of two: noted, and the real one ended the server' };
  } finally {
    endPlanted(ctx);
  }
}

/** T3: the refused names, each refused before anything ran. */
function caseRefused(ctx) {
  const out = [];
  const standIn = writeStandIn(ctx, 'stand-in-t3');
  // This process's running children, read from the table: a zombie an
  // earlier case ended and nothing has reaped yet is not a process started.
  const children = () =>
    readProcessTable()
      .filter((row) => row.ppid === process.pid && !row.stat.startsWith('Z'))
      .map((row) => row.pid)
      .sort((a, b) => a - b);
  const before = children();
  for (const name of ['gmux', 'default', 'other', 'gmux-x/../gmux']) {
    let threw = null;
    try {
      endScratchServer(name, { candidates: [standIn.path], env: ctx.env });
    } catch (err) {
      threw = err;
    }
    if (threw === null || !/refusing to end the tmux server/.test(String(threw.message))) {
      out.push(problem('refused', `${JSON.stringify(name)} was not refused`));
    }
  }
  if (standIn.calls().length !== 0) out.push(problem('refused', `a refused name reached the stand-in: ${JSON.stringify(standIn.calls())}`));
  const after = children();
  if (JSON.stringify(before) !== JSON.stringify(after)) out.push(problem('refused', `children ${JSON.stringify(before)} before and ${JSON.stringify(after)} after`));
  return { problems: out, detail: 'gmux, default, other and gmux-x/../gmux refused, the stand-in never called' };
}

/** T4: no server, over a stale socket file and then over no file at all. */
async function caseNoServer(ctx) {
  const out = [];
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['start-server']);
  const server = await serverOf(ctx, socket);
  try {
    if (namesSocket(commandOf(server.pid), socket)) signalPid(server.pid, 'SIGKILL');
    if (!waitGone(server.pid, 2_000)) return { problems: [problem('plant', 'the planted server did not go on SIGKILL')], detail: '' };
    let stale = false;
    try {
      stale = lstatSync(server.path).isSocket();
    } catch {
      stale = false;
    }
    if (!stale) return { problems: [problem('plant', `the SIGKILLed server left no socket file at ${server.path}`)], detail: '' };
    const first = endScratchServer(socket, { candidates: [ctx.tmux], env: ctx.env });
    if (first.ok !== true || first.serverPid !== null || first.socketFile !== 'removed' || first.ended.length !== 0) {
      out.push(problem('stale', `over a stale file it read ${JSON.stringify({ ok: first.ok, serverPid: first.serverPid, socketFile: first.socketFile, ended: first.ended, why: first.why })}`));
    }
    if (existsSync(server.path)) out.push(problem('stale', 'the stale socket file is still there'));
    const second = endScratchServer(socket, { candidates: [ctx.tmux], env: ctx.env });
    if (second.ok !== true || second.socketFile !== 'absent' || second.ended.length !== 0) {
      out.push(problem('absent', `over no file it read ${JSON.stringify({ ok: second.ok, socketFile: second.socketFile, why: second.why })}`));
    }
    return { problems: out, detail: 'a stale file removed, then absent, nothing signalled' };
  } finally {
    endPlanted(ctx);
  }
}

/** Start a control client this process keeps reading, attached to session zz. */
function plantAttachedClient(ctx, clientSocket) {
  const attached = spawn(ctx.tmux, ['-L', clientSocket, '-C', 'attach-session', '-t', 'zz'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: ctx.env
  });
  attached.stdout.on('data', () => {});
  attached.stderr.on('data', () => {});
  attached.on('error', () => {});
  ctx.children.push(attached);
  if (Number.isInteger(attached.pid)) ctx.others.add(attached.pid);
  return attached;
}

/** T5's checks over one verdict. */
function liveClientProblems(server, clientPid, v) {
  const out = [];
  if (v.ok !== true) out.push(problem('ok', `the verdict is not ok: ${v.why.join('; ')}`));
  if (JSON.stringify(v.listed) !== JSON.stringify([clientPid])) out.push(problem('listed', `listed ${JSON.stringify(v.listed)}`));
  if (v.held.length !== 0 || v.ended.length !== 0) out.push(problem('signalled', `held ${JSON.stringify(v.held)} and ended ${JSON.stringify(v.ended)}`));
  if (v.steps.some((step) => /^SIG/.test(step))) out.push(problem('signalled', `it sent a signal: ${JSON.stringify(v.steps)}`));
  if (alive(server.pid) || v.socketFile !== 'removed') out.push(problem('server', `the server or its socket file is still there (${v.socketFile})`));
  if (v.left.length !== 0) out.push(problem('left', `left ${JSON.stringify(v.left)}`));
  return out;
}

/**
 * T5: a server whose control client's parent is alive, being this process.
 * kill-server alone ends it and no signal is sent. The client is this
 * process's child and nothing reaps it while the teardown blocks, so it is a
 * `<defunct>` entry by the end, which must not read as left.
 */
async function caseLiveClient(ctx, end) {
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
  const server = await serverOf(ctx, socket);
  const attached = plantAttachedClient(ctx, socket);
  try {
    for (let i = 0; i < 100 && !listedBy(ctx, socket).includes(attached.pid); i += 1) await pause(50);
    if (!listedBy(ctx, socket).includes(attached.pid)) return { problems: [problem('plant', 'the attached client was never listed')], detail: '' };
    const at = Date.now();
    const v = end(socket, { candidates: [ctx.tmux], env: ctx.env });
    const ms = Date.now() - at;
    return { problems: liveClientProblems(server, attached.pid, v), detail: `kill-server alone, ${String(ms)} ms, nothing signalled` };
  } finally {
    endPlanted(ctx);
  }
}

/** T6: namingProcesses over fixture rows. Pure: these pids are never signalled. */
function caseNaming() {
  const rows = [
    { pid: 101, ppid: 1, command: '/x/tmux -L gmux-fault-12-1 -f /x/gmux-tmux.conf new-session -d -s zz' },
    { pid: 102, ppid: 1, command: '/x/tmux -L gmux-fault-12-10 -C new-session -A -s gmux-control' },
    { pid: 103, ppid: 1, command: '/x/tmux -L gmux-fault-121-1 -C attach-session -t zz' },
    { pid: 104, ppid: 1, command: '/x/tmux -L gmux-fault-12-1x list-sessions' },
    { pid: 105, ppid: 1, command: 'node probe.mjs gmux-fault-12-1' },
    { pid: 106, ppid: 1, command: '/x/tmux -Lgmux-fault-12-3 list-sessions' }
  ];
  const pattern = /^gmux-fault-12-\d+$/g;
  const first = namingProcesses(pattern, rows).map((row) => row.pid);
  const again = namingProcesses(pattern, rows).map((row) => row.pid);
  const want = [101, 102, 106];
  if (JSON.stringify(first) !== JSON.stringify(want) || JSON.stringify(again) !== JSON.stringify(want)) {
    return { problems: [problem('naming', `it named ${JSON.stringify(first)} then ${JSON.stringify(again)}, not ${JSON.stringify(want)}`)], detail: '' };
  }
  return { problems: [], detail: '-L gmux-fault-12-1, -12-10 and the attached -Lgmux-fault-12-3 named; -121-1, -12-1x and a bare name not' };
}

/**
 * T8: tmuxCandidates in the app's own order, over files this run makes in its
 * scratch and never runs. The machine's own install folders sit where the app
 * puts them, so they are read from the machine.
 */
function caseCandidates(ctx, candidatesOf) {
  const dir = mkdtempSync(join(ctx.scratch, 'candidates-'));
  const fake = (rel, mode = 0o755) => {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '#!/bin/sh\nexit 1\n', { mode });
    return path;
  };
  const bundled = fake('App.app/Contents/Resources/bin/tmux');
  const override = fake('override/tmux');
  const vendored = fake('checkout/build/vendor/tmux/bin/tmux');
  fake('unusable/build/vendor/tmux/bin/tmux', 0o644);
  fake('elsewhere/tmux');
  mkdirSync(join(dir, 'same'), { recursive: true });
  symlinkSync(vendored, join(dir, 'same', 'tmux'));
  const installed = INSTALLED_TMUX.filter((path) => existsSync(path));
  const root = join(dir, 'checkout');
  const rows = [
    ['every candidate, PATH holding a copy of its own', { repoRoot: root, bundled, env: { GMUX_TMUX_BIN: override, PATH: join(dir, 'elsewhere') } }, [bundled, override, vendored, ...installed, 'tmux']],
    ['PATH finding the vendored copy again', { repoRoot: root, env: { PATH: join(dir, 'same') } }, [vendored, ...installed]],
    ['a relative override, a bundled path not there, no PATH', { repoRoot: root, bundled: join(dir, 'gone/tmux'), env: { GMUX_TMUX_BIN: 'override/tmux' } }, [vendored, ...installed, 'tmux']],
    ['a vendored copy that cannot run', { repoRoot: join(dir, 'unusable'), env: {} }, [...installed, 'tmux']]
  ];
  const problems = [];
  for (const [name, options, want] of rows) {
    const got = candidatesOf(options);
    if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(problem('order', `${name}: ${JSON.stringify(got)}, not ${JSON.stringify(want)}`));
  }
  return { problems, detail: 'bundled, GMUX_TMUX_BIN, the vendored copy, the install folders, then tmux on PATH unless PATH finds one already named' };
}

/** Start one raw holder on `socket`'s server, kept in ctx.holders, and wait until it is connected. */
async function plantHolder(ctx, socket, path, mode) {
  const log = join(ctx.scratch, `holder-${String(ctx.holders.length + 1)}.log`);
  writeFileSync(log, '');
  const holder = spawn('/usr/bin/perl', ['-e', HOLDER_SOURCE, '--', '-L', socket, path, mode, log], {
    stdio: 'ignore',
    env: ctx.env
  });
  ctx.holders.push(holder);
  holder.on('error', () => {});
  const said = () => readFileSync(log, 'utf8');
  for (let i = 0; i < 250 && !said().includes('ready\n'); i += 1) await pause(20);
  if (!said().includes('ready\n')) throw new Error(`the holder on ${socket} never said ready (${JSON.stringify(said())})`);
  return { pid: holder.pid, said };
}

/** Whether the teardown sent `pid` a signal, read from its own steps. */
const signalledIn = (v, pid) => v.steps.some((step) => /^SIG[A-Z]+ /.test(step) && step.endsWith(` ${String(pid)}`));

/**
 * T9: a held client whose command line changes before the signal. The holder
 * execs on MSG_SHUTDOWN, so by the time the teardown reads it again it names
 * the socket no more: it must not be signalled, the verdict must say so and
 * fail, and the server, outliving its clients, is the one SIGKILLed.
 */
async function caseChangedClient(ctx, end) {
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
  const server = await serverOf(ctx, socket);
  try {
    const holder = await plantHolder(ctx, socket, server.path, 'exec');
    const at = Date.now();
    const v = end(socket, { candidates: [ctx.tmux], env: ctx.env });
    const ms = Date.now() - at;
    const out = [];
    if (!holder.said().includes('exec\n')) out.push(problem('plant', `the holder never exec'd on MSG_SHUTDOWN: ${JSON.stringify(holder.said())}`));
    if (JSON.stringify(v.held) !== JSON.stringify([holder.pid])) out.push(problem('held', `held ${JSON.stringify(v.held)}, where only the holder ${String(holder.pid)} is held`));
    if (signalledIn(v, holder.pid) || v.ended.some((e) => e.pid === holder.pid) || !alive(holder.pid)) {
      out.push(problem('signalled', `the holder ${String(holder.pid)}, which no longer names the socket, was signalled: ${JSON.stringify(v.steps)}`));
    }
    const said = `${String(holder.pid)} no longer names ${socket}; not signalled`;
    if (!v.why.includes(said)) out.push(problem('why', `the verdict does not say "${said}": ${JSON.stringify(v.why)}`));
    if (v.ok !== false) out.push(problem('ok', 'the verdict reads ok over a client it could not end'));
    return { problems: out, detail: `the holder exec'd on MSG_SHUTDOWN and was not signalled, the verdict failed naming it, ${String(ms)} ms` };
  } finally {
    endPlanted(ctx);
  }
}

/**
 * T10: a server that outlives its clients. A run-shell job holds it (tmux
 * waits for a job it was asked to wait for), the job's own client is ended
 * first, so nothing is listed or held: step 7 runs, SIGKILLs the server after
 * reading its command line again, and the verdict fails saying so. The job is
 * the server's child, never named by the teardown, and ended by the finally.
 */
async function caseOutlived(ctx, end) {
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
  const server = await serverOf(ctx, socket);
  const mark = `${PLANT_MARK}${socket}`;
  try {
    const waiter = spawn(ctx.tmux, ['-L', socket, 'run-shell', `exec /usr/bin/perl -e 'select(undef, undef, undef, 60)' ${mark}`], {
      stdio: 'ignore',
      env: ctx.env
    });
    ctx.children.push(waiter);
    waiter.on('error', () => {});
    if (Number.isInteger(waiter.pid)) ctx.others.add(waiter.pid);
    let job = null;
    for (let i = 0; i < 150 && job === null; i += 1) {
      await pause(20);
      job = readProcessTable().find((row) => row.ppid === server.pid && row.command.split(/\s+/).includes(mark)) ?? null;
    }
    if (job === null) return { problems: [problem('plant', 'the run-shell job never started')], detail: '' };
    ctx.others.add(job.pid);
    if (ownedPlant(waiter.pid)) signalPid(waiter.pid, 'SIGKILL');
    if (!waitGone(waiter.pid, 2_000)) return { problems: [problem('plant', "the job's own client did not go")], detail: '' };
    if (listedBy(ctx, socket).length !== 0) return { problems: [problem('plant', 'the server still lists a client')], detail: '' };
    const at = Date.now();
    const v = end(socket, { candidates: [ctx.tmux], env: ctx.env });
    const ms = Date.now() - at;
    const out = [];
    if (v.ok !== false || !v.why.includes('the server outlived its clients and was ended by SIGKILL')) {
      out.push(problem('ok', `a server that outlived its clients read ok=${String(v.ok)} ${JSON.stringify(v.why)}`));
    }
    const killed = v.steps.indexOf(`SIGKILL ${String(server.pid)}`);
    const gone = v.steps.indexOf('server gone');
    const removed = v.steps.indexOf('socket removed');
    if (killed === -1 || gone < killed || removed < gone || alive(server.pid) || v.socketFile !== 'removed') {
      out.push(problem('server', `steps ${JSON.stringify(v.steps)}: the server SIGKILLed, gone, then its socket removed`));
    }
    if (v.ended.length !== 0 || v.listed.length !== 0 || v.held.length !== 0) {
      out.push(problem('ended', `listed ${JSON.stringify(v.listed)}, held ${JSON.stringify(v.held)}, ended ${JSON.stringify(v.ended)}, where nothing is a client`));
    }
    if (signalledIn(v, job.pid) || !alive(job.pid)) out.push(problem('signalled', `the job ${String(job.pid)}, which the server never named, was signalled`));
    return { problems: out, detail: `the job held the server past kill-server and its clients, the server SIGKILLed and the verdict failed, ${String(ms)} ms` };
  } finally {
    endPlanted(ctx);
  }
}

/**
 * T11: a server pid whose command line no longer names the socket. A tmux
 * stand-in answers for a server it is not, naming an impostor's pid (a
 * process whose command line carries no `-L`): kill-server cannot end it and
 * it holds no client, so the teardown reaches step 7, reads the pid's command
 * line again, and must leave it unsignalled and fail. That is the read that
 * keeps a pid the kernel handed to somebody else from a SIGKILL.
 */
async function caseImpostor(ctx, end) {
  const socket = newSocket(ctx);
  const mark = `${PLANT_MARK}${socket}`;
  const impostor = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore', env: ctx.env, argv0: mark });
  ctx.children.push(impostor);
  impostor.on('error', () => {});
  if (Number.isInteger(impostor.pid)) ctx.others.add(impostor.pid);
  try {
    for (let i = 0; i < 100 && !commandOf(impostor.pid).startsWith(mark); i += 1) await pause(20);
    if (!commandOf(impostor.pid).startsWith(mark)) return { problems: [problem('plant', 'the impostor never ran')], detail: '' };
    const log = join(ctx.scratch, 'impostor-tmux.log');
    const standIn = join(ctx.scratch, 'impostor-tmux');
    writeFileSync(log, '');
    writeFileSync(standIn, impostorStandInText(log, impostor.pid, join(ctx.scratch, 'impostor', socket)), { mode: 0o755 });
    const at = Date.now();
    const v = end(socket, { candidates: [standIn], env: ctx.env });
    const ms = Date.now() - at;
    const asked = readFileSync(log, 'utf8').split('\n').filter((line) => line !== '').map((line) => line.split(' ')[2]);
    const out = [];
    if (v.serverPid !== impostor.pid || !asked.includes('kill-server')) {
      out.push(problem('plant', `the stand-in was asked ${JSON.stringify(asked)} for server ${String(v.serverPid)}, not the impostor ${String(impostor.pid)}`));
    }
    if (signalledIn(v, impostor.pid) || !alive(impostor.pid)) out.push(problem('signalled', `the impostor ${String(impostor.pid)} was signalled: ${JSON.stringify(v.steps)}`));
    const said = `${String(impostor.pid)} no longer names ${socket}; not signalled`;
    if (!v.why.includes(said)) out.push(problem('why', `the verdict does not say "${said}": ${JSON.stringify(v.why)}`));
    if (v.ok !== false || v.socketFile !== 'kept') out.push(problem('ok', `it read ok=${String(v.ok)} with the socket file ${v.socketFile}`));
    return { problems: out, detail: `a server pid naming no socket was left unsignalled and the verdict failed naming it, ${String(ms)} ms` };
  } finally {
    endPlanted(ctx);
  }
}

/**
 * T13: a held server that was already told to stop. It closes every new
 * connection, so no copy of tmux can reach it: nothing is signalled, the
 * verdict fails, and its why says the server is already stopping rather than
 * reading like a tmux that is missing. The pair is this run's own plant and
 * the finally ends it, which is the limit the verdict states.
 */
async function caseStopping(ctx, end) {
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
  const server = await serverOf(ctx, socket);
  try {
    const holder = await plantHolder(ctx, socket, server.path, 'hold');
    spawnSync(ctx.tmux, ['-L', socket, 'kill-server'], { env: ctx.env, stdio: 'ignore', timeout: COMMAND_BOUND_MS });
    for (let i = 0; i < 100 && !holder.said().includes('msg 210\n'); i += 1) await pause(20);
    await pause(200);
    if (!holder.said().includes('msg 210\n') || !alive(server.pid)) {
      return { problems: [problem('plant', `the server did not stay stopping (${JSON.stringify(holder.said())}, server alive ${String(alive(server.pid))})`)], detail: '' };
    }
    const v = end(socket, { candidates: [ctx.tmux], env: ctx.env });
    const out = [];
    const want = `no tmux reached the server on ${socket}: ${ctx.tmux} exit 1: server exited unexpectedly (${ALREADY_STOPPING})`;
    if (v.ok !== false || v.why[0] !== want) out.push(problem('words', `it read ok=${String(v.ok)} ${JSON.stringify(v.why)}, not "${want}"`));
    if (v.steps.length !== 0 || v.ended.length !== 0 || !alive(holder.pid) || !alive(server.pid)) {
      out.push(problem('signalled', `it did ${JSON.stringify(v.steps)} and ended ${JSON.stringify(v.ended)}, where nothing can be asked or signalled`));
    }
    return { problems: out, detail: 'nothing reached a server already stopping, nothing was signalled, and the why says it is stopping' };
  } finally {
    endPlanted(ctx);
  }
}

/**
 * T14: a held client whose command line changes AFTER its SIGTERM (the drop
 * round). The holder execs on SIGTERM with its connection kept, so the pid the
 * teardown SIGTERMed stays, still holding the server, and names the socket no
 * more when step 6 reads its command line again before the SIGKILL. A fresh
 * read leaves it unsignalled and fails the verdict naming it, and the server,
 * outliving its clients, is the one SIGKILLed. A read answered from the one
 * taken before the SIGTERM (a memoized commandOf) would SIGKILL it.
 */
async function caseTermChangedClient(ctx, end) {
  const socket = newSocket(ctx);
  plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
  const server = await serverOf(ctx, socket);
  try {
    const holder = await plantHolder(ctx, socket, server.path, 'term');
    const at = Date.now();
    const v = end(socket, { candidates: [ctx.tmux], env: ctx.env });
    const ms = Date.now() - at;
    const out = [];
    if (!holder.said().includes('exec on SIGTERM\n')) out.push(problem('plant', `the holder never exec'd on SIGTERM: ${JSON.stringify(holder.said())}`));
    if (JSON.stringify(v.held) !== JSON.stringify([holder.pid])) out.push(problem('held', `held ${JSON.stringify(v.held)}, where only the holder ${String(holder.pid)} is held`));
    if (!v.steps.includes(`SIGTERM ${String(holder.pid)}`)) out.push(problem('ended', `steps ${JSON.stringify(v.steps)}: the holder is sent SIGTERM first`));
    if (v.steps.includes(`SIGKILL ${String(holder.pid)}`) || v.ended.some((e) => e.pid === holder.pid) || !alive(holder.pid)) {
      out.push(problem('signalled', `the holder ${String(holder.pid)}, which no longer names the socket after its SIGTERM, was sent SIGKILL: ${JSON.stringify(v.steps)}`));
    }
    const said = `${String(holder.pid)} no longer names ${socket}; not signalled`;
    if (!v.why.includes(said)) out.push(problem('why', `the verdict does not say "${said}": ${JSON.stringify(v.why)}`));
    if (v.ok !== false) out.push(problem('ok', 'the verdict reads ok over a client it could not end'));
    if (alive(server.pid) || !v.steps.includes(`SIGKILL ${String(server.pid)}`)) {
      out.push(problem('server', `steps ${JSON.stringify(v.steps)}: the server, outliving its clients, is SIGKILLed after its own re-read`));
    }
    return { problems: out, detail: `the holder exec'd on SIGTERM, was read again and not sent SIGKILL, and the verdict failed naming it, ${String(ms)} ms` };
  } finally {
    endPlanted(ctx);
  }
}

/** The module's text with its ps swapped for `ps`, written to this run's scratch and imported. */
async function withPs(ctx, text, ps, tag) {
  const line = `const PS = '${PS}';`;
  const mark = text.indexOf(SELF_TEST_MARK);
  const at = text.indexOf(line);
  const again = at === -1 ? -1 : text.indexOf(line, at + 1);
  if (mark === -1 || at === -1 || at > mark || (again !== -1 && again < mark)) {
    throw new Error(`the module's ps could not be swapped: ${line} is not there once above the self-test`);
  }
  const dir = mkdtempSync(join(ctx.scratch, `ps-${tag}-`));
  const file = join(dir, 'scratch-tmux.mjs');
  writeFileSync(file, text.slice(0, at) + `const PS = ${JSON.stringify(ps)};` + text.slice(at + line.length));
  return import(`${pathToFileURL(file).href}?ps=${tag}`);
}

/**
 * T15: a ps that cannot answer is never read as gone (the drop round). A
 * holder keeps the server up through kill-server, and the module runs from a
 * copy of `text` (its own, or an ablated copy's) whose ps cannot answer. (a)
 * Asked about the server's pid alone, it exits 2: the teardown must keep
 * waiting, end the client the server holds, and only then see the server
 * leave. (b) It cannot start at all: the teardown must not call the server
 * gone, must keep its socket file, and must fail. Read as gone, the server is
 * called gone while it runs and its socket is removed under it.
 */
async function casePsCannotAnswer(ctx, text) {
  const out = [];
  for (const mode of ['mute', 'missing']) {
    const socket = newSocket(ctx);
    plantServer(ctx, socket, ['new-session', '-d', '-s', 'zz', PLANTED_PANE]);
    const server = await serverOf(ctx, socket);
    try {
      const holder = await plantHolder(ctx, socket, server.path, 'hold');
      const log = join(ctx.scratch, `ps-${mode}-${String(ctx.count)}.log`);
      const ps = join(ctx.scratch, `ps-${mode}-${String(ctx.count)}`);
      writeFileSync(log, '');
      if (mode === 'mute') writeFileSync(ps, mutePsText(log, server.pid), { mode: 0o755 });
      const copy = await withPs(ctx, text, ps, `${mode}-${String(ctx.count)}`);
      const v = copy.endScratchServer(socket, { candidates: [ctx.tmux], env: ctx.env });
      const gone = v.steps.indexOf('server gone');
      if (mode === 'mute') {
        if (readFileSync(log, 'utf8') === '') out.push(problem('plant', 'the stand-in ps was never asked about the server, so nothing was proved'));
        const term = v.steps.indexOf(`SIGTERM ${String(holder.pid)}`);
        if (term === -1 || gone < term) {
          out.push(problem('gone', `(a) steps ${JSON.stringify(v.steps)}: the server read gone before the client it held was ended, while ps could not answer`));
        }
        if (v.ok !== true || alive(server.pid) || v.socketFile !== 'removed') {
          out.push(problem('ok', `(a) it read ok=${String(v.ok)} ${JSON.stringify(v.why)}, the socket file ${v.socketFile}, the server ${alive(server.pid) ? 'running' : 'gone'}`));
        }
      } else {
        if (gone !== -1 || v.socketFile !== 'kept' || !alive(server.pid)) {
          out.push(problem('gone', `(b) steps ${JSON.stringify(v.steps)}, the socket file ${v.socketFile}: the server was read gone while no ps could answer`));
        }
        if (v.ok !== false || !v.left.some((left) => left.pid === server.pid)) {
          out.push(problem('ok', `(b) it read ok=${String(v.ok)}, left ${JSON.stringify(v.left)}, where the server it could not prove gone is left`));
        }
        if (v.steps.some((step) => /^SIG/.test(step))) out.push(problem('signalled', `(b) it sent a signal with no ps to read a command line: ${JSON.stringify(v.steps)}`));
      }
    } finally {
      endPlanted(ctx);
    }
  }
  return { problems: out, detail: '(a) ps silent about the server: waited, its client ended, then gone; (b) no ps: never read gone, the socket kept, the verdict failed' };
}

// ---------------------------------------------------------------------------
// T7: the text rules, read with the TypeScript parser
// ---------------------------------------------------------------------------

/** The TypeScript parser, from the repository install, loaded only for the self-test. */
function typescript() {
  return createRequire(import.meta.url)('typescript');
}

function parsed(ts, name, text) {
  return ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
}

/** Every node under `root` that passes `test`. */
function nodesUnder(ts, root, test) {
  const out = [];
  const visit = (node) => {
    if (test(node)) out.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return out;
}

function functionNamed(ts, sf, name) {
  return nodesUnder(ts, sf, (n) => ts.isFunctionDeclaration(n) && n.name?.text === name)[0] ?? null;
}

function calleeName(ts, call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

function callsNamed(ts, root, name) {
  return nodesUnder(ts, root, (n) => ts.isCallExpression(n) && calleeName(ts, n) === name);
}

/** Whether `node` sits inside the finally block of a try, below `within`. */
function inFinally(ts, node, within) {
  for (let p = node; p.parent !== undefined && p !== within; p = p.parent) {
    if (ts.isTryStatement(p.parent) && p.parent.finallyBlock === p) return true;
  }
  return false;
}

function isUnder(node, root) {
  for (let p = node; p !== undefined; p = p.parent) if (p === root) return true;
  return false;
}

/** Whether an identifier called `name` appears under `node`. */
function mentions(ts, node, name) {
  return nodesUnder(ts, node, (n) => ts.isIdentifier(n) && n.text === name).length > 0;
}

/** Every string and template in the code, a template's pieces joined, comments never. */
function stringsUnder(ts, root) {
  const out = [];
  for (const n of nodesUnder(ts, root, () => true)) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) out.push([n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join('${}'));
  }
  return out;
}

/** The name a call's answer is held under, or null. */
function heldUnder(ts, call) {
  const p = call.parent;
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(p.left)) return p.left.text;
  return null;
}

const squash = (text) => text.replace(/\s+/g, ' ').trim();

/** Whether a statement throws an Error whose message is exactly `message`. */
function throwsMessage(ts, statement, message) {
  return nodesUnder(ts, statement, ts.isThrowStatement).some((t) =>
    nodesUnder(ts, t, (n) => ts.isStringLiteral(n) && n.text === message).length > 0
  );
}

/** The fault battery's teardown rules, each by the id its ablation is red on. */
function batteryRules(ts, text) {
  const sf = parsed(ts, 'fault-harness.mjs', text);
  const out = [];
  const bad = (id, why) => out.push(problem(id, `build/fault-harness.mjs: ${why}`));
  const runCase = functionNamed(ts, sf, 'runCase');
  if (runCase === null || !callsNamed(ts, runCase, 'endCaseServer').some((c) => inFinally(ts, c, runCase))) {
    bad('finally', 'runCase does not call endCaseServer( inside a finally');
  }
  const endCase = functionNamed(ts, sf, 'endCaseServer');
  if (endCase === null) bad('refusal', 'it declares no endCaseServer');
  else {
    const guards = nodesUnder(ts, endCase, ts.isIfStatement);
    const real = guards.find(
      (g) => squash(g.expression.getText(sf)) === 'socket === REAL_SOCKET' && throwsMessage(ts, g.thenStatement, 'refusing to touch -L gmux')
    );
    const prefix = guards.find(
      (g) => squash(g.expression.getText(sf)) === "!socket.startsWith('gmux-fault-')" && nodesUnder(ts, g.thenStatement, ts.isThrowStatement).length > 0
    );
    if (real === undefined) bad('refusal', "endCaseServer no longer refuses -L gmux by name with 'refusing to touch -L gmux'");
    if (prefix === undefined) bad('refusal', 'endCaseServer no longer refuses a socket not starting gmux-fault-');
    const after = Math.max(real?.end ?? Number.POSITIVE_INFINITY, prefix?.end ?? Number.POSITIVE_INFINITY);
    if (!callsNamed(ts, endCase, 'endScratchServer').some((c) => c.getStart(sf) > after)) {
      bad('asks', 'endCaseServer does not call endScratchServer( after its two refusals');
    }
  }
  const realSocket = nodesUnder(ts, sf, (n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'REAL_SOCKET')[0];
  if (realSocket?.initializer === undefined || !ts.isStringLiteral(realSocket.initializer) || realSocket.initializer.text !== 'gmux') {
    bad('refusal', "REAL_SOCKET is no longer 'gmux'");
  }
  const main = functionNamed(ts, sf, 'main');
  const counts = callsNamed(ts, sf, 'namingProcesses');
  if (counts.length !== 1) bad('count', `it calls namingProcesses( ${String(counts.length)} times, where it counts once`);
  else if (main === null || !isUnder(counts[0], main) || !inFinally(ts, counts[0], main)) {
    bad('count', "namingProcesses( is not called inside a finally of main");
  } else {
    const name = heldUnder(ts, counts[0]);
    const exits = callsNamed(ts, main, 'exit').filter((c) => squash(c.expression.getText(sf)) === 'process.exit');
    if (name === null) bad('count', 'the count is held under no name');
    else {
      if (exits.length === 0 || !mentions(ts, exits[exits.length - 1], name)) {
        bad('count', `main's last process.exit( does not read ${name}, so a process left behind does not fail the run`);
      }
      if (!callsNamed(ts, main, 'leftoverLine').some((c) => mentions(ts, c, name))) bad('count', `main does not hand ${name} to leftoverLine(`);
      const line = functionNamed(ts, sf, 'leftoverLine');
      if (line === null || !stringsUnder(ts, line).some((s) => s.includes('[fault] FAIL —') && s.includes('still running'))) {
        bad('count', 'leftoverLine does not say the FAIL line');
      }
    }
  }
  if (stringsUnder(ts, sf).some((s) => s.includes('kill-server'))) bad('kill-server', "it holds the string 'kill-server' in its code");
  return out;
}

/** The helper's step 6 rules. */
function helperRules(ts, text) {
  const sf = parsed(ts, 'electron-run.mjs', text);
  const out = [];
  for (const name of ['teardown', 'teardownSync']) {
    const fn = functionNamed(ts, sf, name);
    if (fn === null || callsNamed(ts, fn, 'endScratchServer').length === 0) {
      out.push(problem('step6', `build/electron-run.mjs: ${name} does not call endScratchServer(`));
    }
  }
  if (stringsUnder(ts, sf).some((s) => s.includes('kill-server'))) {
    out.push(problem('kill-server', "build/electron-run.mjs: it holds the string 'kill-server' in its code"));
  }
  return out;
}

/**
 * T12's rules over this file's own text (Phase 361's fix round), because the
 * entry binds that every pid ended is read again first and T9 and T11 can
 * drive only the two reads a plant can reach:
 *
 *  - `process.kill(` is called only inside signalPid, and inside stateOf with
 *    the signal 0, which asks and sends nothing;
 *  - every signalPid(P, …) and every child handle's X.kill(…) (P being X.pid)
 *    is the first statement of an `if` whose condition holds a fresh read of
 *    P's command line, or the statement right after an `if` that leaves unless
 *    it holds. A fresh read is `namesSocket(commandOf(P), …)` or
 *    `ownedPlant(P)`, and ownedPlant reads `commandOf(` of its own argument.
 */
function signalRules(ts, text) {
  const sf = parsed(ts, 'scratch-tmux.mjs', text);
  const out = [];
  const bad = (why) => out.push(problem('guarded', `build/scratch-tmux.mjs: ${why}`));
  const textOf = (node) => squash(node.getText(sf));
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const ownerOf = (node) => {
    for (let p = node.parent; p !== undefined; p = p.parent) if (ts.isFunctionDeclaration(p)) return p.name?.text ?? null;
    return null;
  };
  const unwrap = (node) => (ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node);
  const isRead = (expr, pid) => {
    const e = unwrap(expr);
    if (!ts.isCallExpression(e)) return false;
    const name = calleeName(ts, e);
    if (name === 'ownedPlant') return e.arguments.length === 1 && textOf(e.arguments[0]) === pid;
    if (name !== 'namesSocket') return false;
    const first = e.arguments[0] === undefined ? null : unwrap(e.arguments[0]);
    return first !== null && ts.isCallExpression(first) && calleeName(ts, first) === 'commandOf' && first.arguments.length === 1 && textOf(first.arguments[0]) === pid;
  };
  const isBinary = (e, kind) => ts.isBinaryExpression(e) && e.operatorToken.kind === kind;
  const holds = (expr, pid) => {
    const e = unwrap(expr);
    return isRead(e, pid) || (isBinary(e, ts.SyntaxKind.AmpersandAmpersandToken) && (holds(e.left, pid) || holds(e.right, pid)));
  };
  const leavesUnless = (expr, pid) => {
    const e = unwrap(expr);
    if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) return isRead(e.operand, pid);
    return isBinary(e, ts.SyntaxKind.BarBarToken) && (leavesUnless(e.left, pid) || leavesUnless(e.right, pid));
  };
  const leaves = (statement) => {
    const last = ts.isBlock(statement) ? statement.statements[statement.statements.length - 1] : statement;
    return last !== undefined && (ts.isReturnStatement(last) || ts.isContinueStatement(last) || ts.isBreakStatement(last) || ts.isThrowStatement(last));
  };
  const guarded = (call, pid) => {
    const statement = call.parent;
    if (!ts.isExpressionStatement(statement) || statement.expression !== call) return false;
    const holder = statement.parent;
    if (ts.isIfStatement(holder) && holder.thenStatement === statement) return holds(holder.expression, pid);
    if (!ts.isBlock(holder)) return false;
    const at = holder.statements.indexOf(statement);
    if (at === 0 && ts.isIfStatement(holder.parent) && holder.parent.thenStatement === holder && holds(holder.parent.expression, pid)) return true;
    const before = holder.statements[at - 1];
    return before !== undefined && ts.isIfStatement(before) && before.elseStatement === undefined && leavesUnless(before.expression, pid) && leaves(before.thenStatement);
  };

  let signals = 0;
  for (const call of nodesUnder(ts, sf, ts.isCallExpression)) {
    const e = call.expression;
    if (textOf(e) === 'process.kill') {
      const owner = ownerOf(call);
      const zero = call.arguments.length === 2 && ts.isNumericLiteral(call.arguments[1]) && call.arguments[1].text === '0';
      if (!(owner === 'signalPid' || (owner === 'stateOf' && zero))) {
        bad(`process.kill( at line ${String(lineOf(call))} sits in ${String(owner)}, where every signal goes through signalPid`);
      }
      continue;
    }
    let pid = null;
    if (ts.isIdentifier(e) && e.text === 'signalPid' && call.arguments.length >= 1) pid = textOf(call.arguments[0]);
    else if (ts.isPropertyAccessExpression(e) && e.name.text === 'kill') pid = `${textOf(e.expression)}.pid`;
    if (pid === null) continue;
    signals += 1;
    if (!guarded(call, pid)) bad(`the signal at line ${String(lineOf(call))} is sent with no fresh read of ${pid}'s command line right before it`);
  }
  if (signals < SIGNAL_FLOOR) bad(`it found ${String(signals)} signal call(s), where the module and its self-test send ${String(SIGNAL_FLOOR)}`);
  const owned = functionNamed(ts, sf, 'ownedPlant');
  const param = owned?.parameters[0]?.name;
  if (owned === null || param === undefined || !ts.isIdentifier(param) || !callsNamed(ts, owned, 'commandOf').some((c) => c.arguments.length === 1 && textOf(c.arguments[0]) === param.text)) {
    bad('ownedPlant does not read commandOf( of the pid it is asked about');
  }
  return out;
}

/**
 * The signal calls this file holds (two in the module, five in the self-test),
 * so a rule that stopped finding them reads red. Moved with the file.
 */
const SIGNAL_FLOOR = 7;

/** T12: every signal in this file is guarded by a fresh read of that pid's command line. */
function caseSignalRules(ts) {
  const problems = signalRules(ts, readFileSync(SELF, 'utf8'));
  return { problems, detail: 'each signalPid( and handle .kill( right after a fresh read of the command line it names, process.kill( only in signalPid' };
}

const SELF = fileURLToPath(import.meta.url);
const BATTERY = join(repoRoot, 'build', 'fault-harness.mjs');
const HELPER = join(repoRoot, 'build', 'electron-run.mjs');

/** T7: the shipping battery and helper read clean. */
function caseTextRules(ts) {
  const problems = [...batteryRules(ts, readFileSync(BATTERY, 'utf8')), ...helperRules(ts, readFileSync(HELPER, 'utf8'))];
  return { problems, detail: 'runCase ends its server in a finally, main counts once in a finally, -L gmux refused, both teardowns ask endScratchServer, no kill-server' };
}

// ---------------------------------------------------------------------------
// The ablations, each one clause, each red on the case it names
// ---------------------------------------------------------------------------

/** Where the self-test begins in this file's own text: a module ablation must edit above it. */
const SELF_TEST_MARK = '// THE SELF-TEST (conformance:scratchtmux).';

/** Clauses of the module, each removed from a copy of it, each driven through its case. */
const MODULE_ABLATIONS = [
  {
    name: 'step 6 removed, so a held client is never ended',
    from: '  if (!gone) gone = endClients(v, socket);\n',
    to: '',
    run: (ctx, copy) => caseHeldPair(ctx, copy.endScratchServer),
    red: 'ended'
  },
  {
    name: 'the connection test removed, so every process naming the socket is a client',
    from: '        if (connectedTo(row.pid, addresses)) {',
    to: '        if (true) {',
    run: (ctx, copy) => caseHeldPair(ctx, copy.endScratchServer),
    red: 'decoys'
  },
  {
    name: 'the socket file removed before the server is waited for',
    from: '  let gone = waitGone(v.serverPid, KILL_SERVER_WAIT_MS);\n',
    to: '  removeSocketFile(v, socket);\n  let gone = waitGone(v.serverPid, KILL_SERVER_WAIT_MS);\n',
    run: (ctx, copy) => caseHeldPair(ctx, copy.endScratchServer),
    red: 'order'
  },
  {
    name: 'the zombie test removed, so a <defunct> client reads as running',
    from: "  return stat.startsWith('Z') ? 'zombie' : 'alive';",
    to: "  return 'alive';",
    run: (ctx, copy) => caseLiveClient(ctx, copy.endScratchServer),
    red: 'left'
  },
  {
    name: "GMUX_TMUX_BIN moved behind the checkout's own copy, against the app's order",
    from:
      "  if (override.startsWith('/') && isExecutableFile(override)) add(override);\n" +
      "  if (typeof root === 'string' && root !== '') {\n" +
      '    const vendored = join(root, ...VENDORED_TMUX);\n' +
      '    if (isExecutableFile(vendored)) add(vendored);\n' +
      '  }\n',
    to:
      "  if (typeof root === 'string' && root !== '') {\n" +
      '    const vendored = join(root, ...VENDORED_TMUX);\n' +
      '    if (isExecutableFile(vendored)) add(vendored);\n' +
      '  }\n' +
      "  if (override.startsWith('/') && isExecutableFile(override)) add(override);\n",
    run: (ctx, copy) => caseCandidates(ctx, copy.tmuxCandidates),
    red: 'order'
  },
  {
    name: 'tmux on PATH asked again when PATH finds a copy already named',
    from: "  if (onPath === undefined || !out.map(realOrSame).includes(realOrSame(onPath))) add('tmux');",
    to: "  add('tmux');",
    run: (ctx, copy) => caseCandidates(ctx, copy.tmuxCandidates),
    red: 'order'
  },
  // Phase 361's fix round: the two re-reads, the outlived failure and the stopping words, each driven red.
  {
    name: "the client's command line no longer read again before its signal",
    from: '    if (!namesSocket(commandOf(pid), socket)) {',
    to: '    if (false) {',
    run: (ctx, copy) => caseChangedClient(ctx, copy.endScratchServer),
    red: 'signalled'
  },
  {
    name: "the server's command line no longer read again before its SIGKILL",
    from: '    if (namesSocket(commandOf(v.serverPid), socket)) {',
    to: '    if (true) {',
    run: (ctx, copy) => caseImpostor(ctx, copy.endScratchServer),
    red: 'signalled'
  },
  {
    name: 'a server that outlived its clients no longer failing the verdict',
    from: "        v.why.push('the server outlived its clients and was ended by SIGKILL');\n",
    to: '',
    run: (ctx, copy) => caseOutlived(ctx, copy.endScratchServer),
    red: 'ok'
  },
  {
    name: 'a server already stopping no longer said to be one',
    from: '    misses.push({ bin, why: stopping ? `${missOf(r)} (${ALREADY_STOPPING})` : missOf(r) });',
    to: '    misses.push({ bin, why: missOf(r) });',
    run: (ctx, copy) => caseStopping(ctx, copy.endScratchServer),
    red: 'words'
  },
  // The drop round: the two rules the reverify found unpinned, each driven red.
  {
    name: 'commandOf answered from a memo, so the read before a SIGKILL repeats the one before the SIGTERM',
    from: 'function commandOf(pid) {\n',
    to:
      'const COMMAND_MEMO = new Map();\n' +
      'function commandOf(pid) {\n' +
      '  if (COMMAND_MEMO.has(pid)) return COMMAND_MEMO.get(pid);\n' +
      '  const read = commandOfFresh(pid);\n' +
      '  COMMAND_MEMO.set(pid, read);\n' +
      '  return read;\n' +
      '}\n' +
      'function commandOfFresh(pid) {\n',
    run: (ctx, copy) => caseTermChangedClient(ctx, copy.endScratchServer),
    red: 'signalled'
  },
  {
    name: 'a ps that cannot answer read as gone',
    from: "  return state === 'alive' || state === 'unknown';",
    to: "  return state === 'alive';",
    run: (ctx, copy, text) => casePsCannotAnswer(ctx, text),
    red: 'gone'
  }
];

/** Where the ablation tables begin in this file's text: an edit of T12's must fall above it. */
const ABLATIONS_MARK = '// The ablations, each one clause, each red on the case it names';

/** Six mutations of this file's own text, each red on T12's rule (Phase 361's fix round). */
const SELF_ABLATIONS = [
  {
    name: "step 7's read of the server's command line removed",
    from: '    if (namesSocket(commandOf(v.serverPid), socket)) {',
    to: '    if (true) {'
  },
  {
    name: "endClient's read of the client's command line removed",
    from: '    if (!namesSocket(commandOf(pid), socket)) {',
    to: '    if (false) {'
  },
  {
    name: 'a signal sent between kill-server and the wait',
    from: '  let gone = waitGone(v.serverPid, KILL_SERVER_WAIT_MS);',
    to: "  signalPid(v.serverPid, 'SIGTERM');\n  let gone = waitGone(v.serverPid, KILL_SERVER_WAIT_MS);"
  },
  {
    name: 'a process.kill( outside signalPid',
    from: '  for (const pid of [...v.listed, ...v.held]) {',
    to: "  for (const pid of [...v.listed, ...v.held]) {\n    process.kill(pid, 'SIGTERM');"
  },
  {
    name: 'ownedPlant no longer reading the command line',
    from: '  const command = commandOf(pid);\n  const mine = ownSockets();',
    to: "  const command = '';\n  const mine = ownSockets();"
  },
  {
    name: "a holder's handle killed with no read before it",
    from: "    if (alive(holder.pid) && ownedPlant(holder.pid)) holder.kill('SIGKILL');",
    to: "    holder.kill('SIGKILL');"
  }
];

/** Six text mutations of the battery and the helper, each red on T7's rule. */
const TEXT_ABLATIONS = [
  {
    name: "the finally around endCaseServer( in runCase removed",
    file: BATTERY,
    from: '  } finally {\n    // Whatever the two launches did',
    to: '  } catch (err) {\n    throw err;\n  }\n  {\n    // Whatever the two launches did',
    rules: batteryRules,
    red: 'finally'
  },
  {
    name: "a kill-server put back into the helper's step 6",
    file: HELPER,
    from: '  // 6. The scratch tmux server, when the caller named one, ended and PROVEN',
    to: "  spawnSync('tmux', ['-L', entry.tmuxSocket, 'kill-server'], { stdio: 'ignore' });\n  // 6. The scratch tmux server, when the caller named one, ended and PROVEN",
    rules: helperRules,
    red: 'kill-server'
  },
  {
    name: "endCaseServer's refusal of -L gmux removed",
    file: BATTERY,
    from: "  if (socket === REAL_SOCKET) throw new Error('refusing to touch -L gmux');\n",
    to: '',
    rules: batteryRules,
    red: 'refusal'
  },
  {
    name: 'endCaseServer no longer asking endScratchServer',
    file: BATTERY,
    from: '  return endScratchServer(socket, {',
    to: '  return askedNobody(socket, {',
    rules: batteryRules,
    red: 'asks'
  },
  {
    name: "the battery's count no longer reaching its exit status",
    file: BATTERY,
    from: '  process.exit(failed.length === 0 && leftovers.length === 0 ? 0 : 1);',
    to: '  process.exit(failed.length === 0 ? 0 : 1);',
    rules: batteryRules,
    red: 'count'
  },
  {
    name: "teardownSync's step 6 no longer asking endScratchServer",
    file: HELPER,
    from: '  // 6. As in teardown, said here because nothing can throw it from this event.\n  if (entry.tmuxSocket !== null) {\n    try {\n      entry.scratch = loadedScratchTmux().endScratchServer(',
    to: '  // 6. As in teardown, said here because nothing can throw it from this event.\n  if (entry.tmuxSocket !== null) {\n    try {\n      entry.scratch = loadedScratchTmux().askedNobody(',
    rules: helperRules,
    red: 'step6'
  }
];

/** Every place `piece` occurs in `text`. */
function occurrences(text, piece) {
  let n = 0;
  for (let at = text.indexOf(piece); at !== -1; at = text.indexOf(piece, at + 1)) n += 1;
  return n;
}

/** Whether a text is a program the parser reads without a syntax error. */
function parsesClean(ts, name, text) {
  const r = ts.transpileModule(text, {
    fileName: name,
    reportDiagnostics: true,
    compilerOptions: { allowJs: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  });
  return (r.diagnostics ?? []).length === 0;
}

/** One module ablation: a copy with one clause removed, imported, driven through its case. */
async function runModuleAblation(ctx, source, ab, index) {
  const at = source.indexOf(ab.from);
  const mark = source.indexOf(SELF_TEST_MARK);
  if (at === -1 || mark === -1 || at > mark) return `"${ab.name}" found nothing to edit above the self-test`;
  const dir = join(ctx.scratch, `ablation-${String(index)}`);
  mkdirSync(dir);
  const file = join(dir, 'scratch-tmux.mjs');
  const ablated = source.slice(0, at) + ab.to + source.slice(at + ab.from.length);
  writeFileSync(file, ablated);
  let copy;
  try {
    copy = await import(`${pathToFileURL(file).href}?ablation=${String(index)}`);
  } catch (err) {
    return `"${ab.name}": the ablated copy would not load (${String(err?.message ?? err)})`;
  }
  if (typeof copy.endScratchServer !== 'function' || typeof copy.tmuxCandidates !== 'function') {
    return `"${ab.name}": the ablated copy exports neither function it is driven through`;
  }
  // The ablated text too, for a case that drives its own copy of it (T15).
  const result = await ab.run(ctx, copy, ablated);
  if (result.problems.some((p) => p.id === 'plant')) return `"${ab.name}": ${result.problems.map((p) => p.why).join('; ')}`;
  if (!result.problems.some((p) => p.id === ab.red)) {
    return `"${ab.name}" moved no reading: ${ab.red} stayed green (${JSON.stringify(result.problems)})`;
  }
  return null;
}

/** One text ablation: a mutated copy of the battery or the helper, read by T7's rules. */
function runTextAblation(ts, ab) {
  const text = readFileSync(ab.file, 'utf8');
  if (occurrences(text, ab.from) !== 1) return `"${ab.name}" found ${String(occurrences(text, ab.from))} places to edit, where it edits one`;
  const mutated = text.replace(ab.from, () => ab.to);
  if (!parsesClean(ts, ab.file, mutated)) return `"${ab.name}": the mutated text does not parse, so it proves nothing`;
  const problems = ab.rules(ts, mutated);
  if (!problems.some((p) => p.id === ab.red)) return `"${ab.name}" moved no reading: ${ab.red} stayed green`;
  return null;
}

/** One mutation of this file's own text, at its first place above the ablation tables, read by T12's rules. */
function runSelfAblation(ts, source, ab) {
  const at = source.indexOf(ab.from);
  const mark = source.indexOf(ABLATIONS_MARK);
  if (at === -1 || mark === -1 || at > mark) return `"${ab.name}" found nothing to edit above the ablations`;
  const mutated = source.slice(0, at) + ab.to + source.slice(at + ab.from.length);
  if (!parsesClean(ts, SELF, mutated)) return `"${ab.name}": the mutated text does not parse, so it proves nothing`;
  if (!signalRules(ts, mutated).some((p) => p.id === 'guarded')) return `"${ab.name}" moved no reading: guarded stayed green`;
  return null;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function selfTest() {
  const refused = preflight();
  if (refused !== null) {
    console.error(`scratch-tmux self-test: REFUSED, ${refused}.`);
    return 2;
  }
  const ts = typescript();
  const ctx = newContext();
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const onSignal = (signal) => {
    endPlanted(ctx);
    removeScratch(ctx);
    console.error(`scratch-tmux self-test: stopped by ${signal}; everything it planted was ended`);
    process.exit(130);
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, onSignal);
  const failures = [];
  let cases = 0;
  let ablations = 0;
  const say = (id, name, result, ms) => {
    cases += 1;
    if (result.problems.length === 0) console.log(`  ${id} ${name}: PASS (${result.detail}; ${String(ms)} ms)`);
    for (const p of result.problems) {
      failures.push(`${id} ${p.id}: ${p.why}`);
      console.log(`  ${id} ${name}: FAIL ${p.id}: ${p.why}`);
    }
  };
  const timed = async (id, name, work) => {
    const at = Date.now();
    let result;
    try {
      result = await work();
    } catch (err) {
      result = { problems: [problem('threw', String(err?.stack ?? err))], detail: '' };
    }
    say(id, name, result, Date.now() - at);
  };
  const started = Date.now();
  try {
    await timed('T1', 'the held pair', () => caseHeldPair(ctx, endScratchServer));
    await timed('T2', 'a tmux that cannot reach the server', () => caseStandIn(ctx));
    await timed('T3', 'refused names', () => caseRefused(ctx));
    await timed('T4', 'no server', () => caseNoServer(ctx));
    await timed('T5', 'a live client', () => caseLiveClient(ctx, endScratchServer));
    await timed('T6', 'namingProcesses', () => caseNaming());
    await timed('T7', 'the text rules', () => caseTextRules(ts));
    await timed('T8', "the app's tmux order", () => caseCandidates(ctx, tmuxCandidates));
    await timed('T9', 'a held client whose command line changes', () => caseChangedClient(ctx, endScratchServer));
    await timed('T10', 'a server that outlives its clients', () => caseOutlived(ctx, endScratchServer));
    await timed('T11', 'a server pid that names no socket', () => caseImpostor(ctx, endScratchServer));
    await timed('T12', 'every signal guarded', () => caseSignalRules(ts));
    await timed('T13', 'a server already stopping', () => caseStopping(ctx, endScratchServer));
    await timed('T14', 'a held client whose command line changes after its SIGTERM', () => caseTermChangedClient(ctx, endScratchServer));
    await timed('T15', 'a ps that cannot answer', () => casePsCannotAnswer(ctx, source));
    for (const [index, ab] of MODULE_ABLATIONS.entries()) {
      ablations += 1;
      let why;
      try {
        why = await runModuleAblation(ctx, source, ab, index);
      } catch (err) {
        why = `"${ab.name}" threw: ${String(err?.stack ?? err)}`;
      }
      if (why === null) console.log(`  ablation: ${ab.name}: red on ${ab.red}`);
      else failures.push(`ablation ${why}`);
    }
    for (const ab of TEXT_ABLATIONS) {
      ablations += 1;
      const why = runTextAblation(ts, ab);
      if (why === null) console.log(`  ablation: ${ab.name}: red on ${ab.red}`);
      else failures.push(`ablation ${why}`);
    }
    for (const ab of SELF_ABLATIONS) {
      ablations += 1;
      const why = runSelfAblation(ts, source, ab);
      if (why === null) console.log(`  ablation: ${ab.name}: red on guarded`);
      else failures.push(`ablation ${why}`);
    }
  } finally {
    endPlanted(ctx);
    removeScratch(ctx);
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, onSignal);
  }
  for (const leak of ctx.leaks) failures.push(`left running after the run, and ended: ${leak}`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (failures.length > 0) {
    console.error(`scratch-tmux self-test: FAIL, ${String(failures.length)} problem${failures.length === 1 ? '' : 's'}:`);
    for (const f of failures) console.error(`  ${f}`);
    return 1;
  }
  console.log(
    `scratch-tmux self-test: PASS, ${String(cases)} cases and ${String(ablations)} ablations in ${seconds} s; ` +
      'a held client is ended first and its server proven gone, and no decoy was signalled'
  );
  return 0;
}

/** By realpath, because /var is a link to /private/var and a gate that runs nothing exits 0. */
function invokedDirectly() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] !== '--self-test') {
    console.error('scratch-tmux: the one command is --self-test');
    process.exitCode = 2;
  } else {
    selfTest().then(
      (code) => {
        process.exitCode = code;
      },
      (err) => {
        console.error(`scratch-tmux self-test: FAIL, it threw: ${String(err?.stack ?? err)}`);
        process.exitCode = 1;
      }
    );
  }
}
