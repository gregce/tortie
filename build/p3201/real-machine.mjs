#!/usr/bin/env node
/**
 * real-machine.mjs. Phase 320.1's real-machine row: ONE machine the operator
 * named, reached the way the product reaches it, with a scratch tmux server of
 * this run's own on it (build/p3201/SPEC.md §8 (b)).
 *
 * His words of 2026-09-29: "to test 320.1 u can attach to my mac pro to drive
 * sessions and verify". The loopback machine (build/with-scratch-machine.mjs)
 * is the deterministic matrix; this is the one row whose far side is really
 * another computer, over a real link, running a tmux build (3.7c on his Mac
 * Pro) that no other row measures. `probe:p320` reads it with `P320_FAR=real`
 * and `probe:p292` with `P292_MACHINE=real`. VERIFIERS ONLY: no builder runs it
 * against a host, and `--self-test` proves every composed string and every
 * refusal without contacting anything.
 *
 * ## The refusals, asked before anything is contacted
 *
 *   1. `P3201_REAL_HOST`, `P3201_REAL_USER` and `P3201_REAL_TMUX` must all be
 *      set, and `P3201_REAL_ACK` must read exactly `p3201`. The committed tree
 *      names no host: the person names it, every run.
 *   2. The host is a host name or an address, never a loopback one (this row
 *      exists to reach ANOTHER computer; the loopback row is the other file).
 *   3. `P3201_REAL_TMUX` is the far tmux's ABSOLUTE path, in the plain
 *      characters a path needs and nothing a shell reads.
 *   4. The harness socket is a `gmux-p320…`, `gmux-p292…` or `gmux-p336…`
 *      harness socket (probe:p320, probe:p292 and, since Phase 336, probe:p336
 *      with `P336_FAR=real`, are this row's three readers) ending in a pid, and
 *      never `gmux` or `default`. Tortie's far socket IS the local
 *      `GMUX_TMUX_SOCKET` (`activeTmuxSocket`, src/main/machines/context.ts),
 *      so the app talks to `-L <that socket>` there and never to `-L gmux`.
 *   5. `CI` is refused: CI has no second machine and nobody watching it.
 *   6. An ssh agent (`SSH_AUTH_SOCK`) must be set, or `P3201_REAL_IDENTITY`
 *      must name his key BY PATH. No private key's bytes are ever read,
 *      copied or printed; the app itself signs in through the agent, so an
 *      app arm refuses without one, AND refuses an agent that holds no key
 *      (`ssh-add -l` answering 1, "The agent has no identities"), because
 *      the app runs under a scratch HOME and has no other way to sign in.
 *      The Phase 320.1 verifier found his agent empty on 2026-09-30: his own
 *      Tortie signs in with his home's default key file, which a scratch HOME
 *      cannot see. The fix the refusal names is a scratch agent the verifier
 *      starts, loads with his key BY PATH (`ssh-add <path>`, which ssh-add
 *      reads and this file never does) and ends in its own `finally`.
 *   7. The local control socket this file opens must fit: ssh binds it as
 *      the path plus a 17-byte suffix, and macOS allows 104 bytes with the
 *      terminator, so a `runDir` whose socket path passes 86 bytes is
 *      refused BEFORE any contact, naming the limit (the verifier's dry open
 *      from the long scratchpad path failed with "ControlPath too long").
 *   8. `P3201_REAL_NODE`, when set, is the far node's ABSOLUTE path in plain
 *      characters (build/p3201/SPEC.md D12).
 *
 * ## HIS HOME IS NEVER WRITTEN, AND THE RUN PROVES IT (the second build, D12)
 *
 * The first attempt's reverifier measured the modified time of his
 * `~/.zsh_history` on the Mac Pro moving on EVERY real-row run (size unchanged,
 * content never read), because the far scratch server inherited his login shell
 * and every far session started his zsh with his rc files. So:
 *
 *   - The wrapper `bin/tmux` exports `SHELL=/bin/sh`, `HISTFILE=/dev/null`,
 *     `ZDOTDIR=<run dir>/zdot` (made empty, mode 0700) and `TMUX_TMPDIR=<run
 *     dir>` before it execs tmux, so the scratch server's `default-shell` and
 *     global environment carry them. macOS's `/etc/zshrc` sets
 *     `HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history`, so even a far session whose
 *     argv names zsh writes its history inside the run directory.
 *   - The proof (`proveCommand`), BEFORE any session of the run is made, reads
 *     back `show-options -gv default-shell` (must be `/bin/sh`) and
 *     `show-environment -g ZDOTDIR` (must be the run's `zdot`) beside the
 *     socket it already proves.
 *   - The CENSUS (`censusCommand`), the FIRST contact and again the LAST: the
 *     size and modified time, never the content, of `~/.zsh_history`,
 *     `~/.bash_history` and `~/.zshrc`, and printed only, `~/.zcompdump*`. It
 *     runs under `/bin/sh -c`, so his zsh never expands a glob of it. `close()`
 *     compares the two, and a probe FAILS its run when any of the three moved
 *     (`handle.dotfiles.moved`).
 *   - Node is found BY PATH: `P3201_REAL_NODE`, else `node` beside
 *     `P3201_REAL_TMUX` (his Mac Pro: `/usr/local/bin/node`, v22.16.0, which
 *     neither the non-interactive PATH nor the first attempt's `command -v`
 *     found, so R1 went unmeasured on 3.7c). The report names which.
 *
 * ## The rules, which bind like the tmux safety rules
 *
 *   - Every ssh, keyscan and copy goes through build/ssh-run.mjs
 *     (`gate:knownhosts`), with THIS run's own record file, seeded with the
 *     machine's PUBLIC host key and nothing else. The person's own
 *     ~/.ssh/known_hosts is never named.
 *   - The first command is reported whole: `command -v tmux; <P3201_REAL_TMUX>
 *     -V; <the node it names> -v; uname -sr`. The versions are read from the
 *     tmux and the node the row NAMES, not from the non-interactive PATH, which
 *     on his Mac Pro holds neither (/usr/local/bin is added by his login shell
 *     only; the Phase 320.1 verifiers both found `tmux -V` answering "command
 *     not found" there).
 *   - ONE read of his own server, before and after, count only:
 *     `<his tmux> -L gmux list-sessions -F x 2>/dev/null | wc -l`, counted on
 *     the far side so no session name or id crosses. The two counts must be
 *     equal. It is the ONLY command in this file that names `-L gmux`, and no
 *     command names his default server at all.
 *   - Every file this run puts there lives under ONE directory,
 *     `/tmp/p3201-<pid>/` (the pid is the harness socket's), made mode 0700:
 *     `bin/tmux`, a wrapper that sets `TMUX_TMPDIR` to that directory (and the
 *     quiet shell above) and execs his tmux, so the scratch socket file lives
 *     inside it; `far/`, the session folder; `logs/`; `zdot/`, the empty zsh
 *     directory. The stand-ins go in `bin/` only when the named node answers
 *     `-v` there, and the report says which.
 *   - The socket is PROVED on the far side before any session is made: the
 *     socket directory holds exactly that name, and the wrapper's
 *     `#{socket_path}` is under the run's directory, read through the far
 *     side's own `pwd -P` of it: on macOS `/tmp` is a link to `/private/tmp`,
 *     tmux reports the resolved path, and a string compare against `/tmp/…`
 *     refused every macOS far machine, his Mac Pro among them. The same read
 *     proves the server's `default-shell` is `/bin/sh` and its `ZDOTDIR` the
 *     run's own.
 *   - The app's ssh ControlMaster is its own: its leaf is one that was not in
 *     the control directory before launch, AND `ssh -O check` names a master
 *     whose command line names this run's scratch profile (`adoptAppControl`).
 *     A socket that fails either is left alone, because the one that would
 *     otherwise be ended could be his own Tortie's. In the `finally`: `ssh -O
 *     exit` on that ControlPath and on this file's own, the far scratch server
 *     ended by the pid it reports (SIGTERM, then SIGKILL after two seconds,
 *     because a server waits for a client that never leaves), each tmux there
 *     whose arguments name this run's socket ended by its pid, `rm -rf
 *     /tmp/p3201-<pid>`, the second count, and the second census.
 *   - INSTALL NOTHING. Spend no model turn. Never list, attach to, type into
 *     or end a session this run did not create. His own Tortie's connection to
 *     the machine is never touched.
 *
 * Usage (verifiers, from a probe):
 *   import { realMachineFromEnv, openRealMachine } from './real-machine.mjs';
 * Self-test (anyone; contacts nothing):
 *   node build/p3201/real-machine.mjs --self-test
 */

import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyscanText, sshOptions as composeSshOptions, sshRun } from '../ssh-run.mjs';

const CALLER = 'build/p3201/real-machine.mjs';

/** What must be set, and the one value the acknowledgement must read. */
export const REAL_ENV = ['P3201_REAL_HOST', 'P3201_REAL_USER', 'P3201_REAL_TMUX', 'P3201_REAL_ACK'];
export const REAL_ACK = 'p3201';

/** The operator's live server's name. Named here ONCE, for the count alone. */
const HIS_SOCKET = 'gmux';

/** The directory every far file of this run lives under. */
export const FAR_ROOT_PREFIX = '/tmp/p3201-';

/** The stand-ins a run may copy, when the far machine has node. */
export const STAND_INS = ['fullscreen.mjs', 'recorder.mjs'];

/** Characters a path argument may carry. Nothing a shell expands. */
const PLAIN_PATH = /^\/[A-Za-z0-9_./+-]+$/;
const PLAIN_HOST = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;
const PLAIN_USER = /^[A-Za-z0-9._-]+$/;

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

/** True for a host that names this Mac. */
export function isLoopbackHost(host) {
  const h = String(host ?? '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (isIP(h) === 4) return h.startsWith('127.') || h === '0.0.0.0';
  if (isIP(h) === 6) return h === '::1' || h === '::';
  return false;
}

/** The pid a harness socket ends with, or null when it names none. */
export function socketPid(socket) {
  const m = /-(\d+)$/.exec(String(socket ?? ''));
  return m ? Number(m[1]) : null;
}

/**
 * Why this row must not run, or null. `env` is the environment and `socket` the
 * harness socket. Every refusal is one sentence that names the fix.
 */
export function realRefusal(env, socket, { app = false, scratchAgent = null } = {}) {
  for (const name of REAL_ENV) {
    if (String(env[name] ?? '').trim() === '') {
      return `${name} is not set. The real-machine row reaches a computer the operator names, every run, and the tree names none.`;
    }
  }
  if (env['P3201_REAL_ACK'] !== REAL_ACK) {
    return `P3201_REAL_ACK reads ${JSON.stringify(env['P3201_REAL_ACK'])}, not ${JSON.stringify(REAL_ACK)}.`;
  }
  if (String(env['CI'] ?? '') !== '') return 'CI is set. This row never runs in CI: there is no second machine and nobody watching it.';
  const host = String(env['P3201_REAL_HOST']);
  if (!PLAIN_HOST.test(host)) return `P3201_REAL_HOST ${JSON.stringify(host)} is not a plain host name or address.`;
  if (isLoopbackHost(host)) return `P3201_REAL_HOST ${JSON.stringify(host)} is this Mac. The loopback row is build/with-scratch-machine.mjs.`;
  const user = String(env['P3201_REAL_USER']);
  if (!PLAIN_USER.test(user)) return `P3201_REAL_USER ${JSON.stringify(user)} is not a plain account name.`;
  const tmux = String(env['P3201_REAL_TMUX']);
  if (!PLAIN_PATH.test(tmux) || tmux.includes('..')) {
    return `P3201_REAL_TMUX ${JSON.stringify(tmux)} is not an absolute path in plain characters.`;
  }
  const s = String(socket ?? '');
  if (s === HIS_SOCKET || s === 'default' || s === '') return `the socket ${JSON.stringify(s)} is not a harness socket.`;
  if (!/^gmux-p(?:320|292|336)[a-z0-9-]*-\d+$/.test(s)) return `the socket ${JSON.stringify(s)} is not a gmux-p320, gmux-p292 or gmux-p336 harness socket ending in its pid.`;
  const identity = String(env['P3201_REAL_IDENTITY'] ?? '');
  if (identity !== '' && (!PLAIN_PATH.test(identity) || identity.includes('..'))) {
    return `P3201_REAL_IDENTITY ${JSON.stringify(identity)} is not an absolute path in plain characters.`;
  }
  const node = String(env['P3201_REAL_NODE'] ?? '');
  if (node !== '' && (!PLAIN_PATH.test(node) || node.includes('..'))) {
    return `P3201_REAL_NODE ${JSON.stringify(node)} is not an absolute path in plain characters.`;
  }
  const agent = String(env['SSH_AUTH_SOCK'] ?? '');
  if (app && agent === '') {
    return 'SSH_AUTH_SOCK is not set. The app signs in to the machine through the ssh agent, and no private key is ever copied to it.';
  }
  // build/with-scratch-machine.mjs hands its command the LOOPBACK machine's own
  // agent, which holds no key of his, so the real row run inside it could sign
  // in to nothing. The package scripts leave that wrapper out for the real row.
  if (typeof scratchAgent === 'string' && scratchAgent !== '' && agent === scratchAgent) {
    return 'SSH_AUTH_SOCK is the loopback machine\'s own agent, which holds none of his keys. Run the real row outside build/with-scratch-machine.mjs (the package script does when the far side is real).';
  }
  if (agent === '' && identity === '') {
    return 'neither SSH_AUTH_SOCK nor P3201_REAL_IDENTITY is set, so nothing can sign in. Load the key into the agent, or name it by path.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// The composed strings. Pure, and every one is proved by --self-test.
// ---------------------------------------------------------------------------

/** Quote one word for a POSIX shell. */
export function quoteArg(arg) {
  const s = String(arg);
  if (s.length === 0) return "''";
  // A word that BEGINS with `=` or `~` is quoted even though both are safe
  // inside a word. His Mac Pro's login shell is zsh, and zsh expands a word
  // beginning with `=` as a command lookup (EQUALS, on by default) and one
  // beginning with `~` as a home directory: the parent verifier's skew run
  // stopped because `-t =rec-none:` reached tmux as `rec-none: not found`
  // (the fix round). `=` stays bare inside a word, where a `NAME=value`
  // assignment needs it.
  if (/^[A-Za-z0-9_\-./:@%+,][A-Za-z0-9_\-./=:@%+,]*$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** `/tmp/p3201-<pid>`, the one directory this run writes on the far machine. */
export function farDirFor(socket) {
  const pid = socketPid(socket);
  if (pid === null) throw new Error(`the socket ${JSON.stringify(socket)} ends in no pid`);
  return `${FAR_ROOT_PREFIX}${String(pid)}`;
}

/** The empty zsh directory inside a run's directory, which every far zsh reads instead of his home. */
export function zdotFor(farDir) {
  return `${farDir}/zdot`;
}

/**
 * The wrapper Tortie runs as its `remoteTmuxPath`: his tmux, with its sockets
 * inside the run's directory and the QUIET SHELL (D12): `SHELL=/bin/sh`, so the
 * scratch server's `default-shell` is not his login shell; `HISTFILE=/dev/null`;
 * and `ZDOTDIR` the run's empty `zdot`, so a zsh started there reads none of
 * his rc files and, through macOS's `/etc/zshrc`, keeps its history inside the
 * run's directory.
 */
export function wrapperText(farDir, realTmux) {
  if (!farDir.startsWith(FAR_ROOT_PREFIX)) throw new Error(`${farDir} is not a run directory`);
  return (
    '#!/bin/sh\n' +
    '# Phase 320.1, build/p3201/real-machine.mjs. Removed with its directory at the end of the run.\n' +
    `TMUX_TMPDIR=${quoteArg(farDir)}\n` +
    'SHELL=/bin/sh\n' +
    'HISTFILE=/dev/null\n' +
    `ZDOTDIR=${quoteArg(zdotFor(farDir))}\n` +
    'export TMUX_TMPDIR SHELL HISTFILE ZDOTDIR\n' +
    `exec ${quoteArg(realTmux)} "$@"\n`
  );
}

/**
 * The far node this row names, and where the name came from: `P3201_REAL_NODE`
 * when it is set, else `node` in the directory of `P3201_REAL_TMUX` (his Mac
 * Pro: /usr/local/bin/node beside /usr/local/bin/tmux). Never the PATH.
 */
export function farNodeOf(env) {
  const named = String(env['P3201_REAL_NODE'] ?? '').trim();
  if (named !== '') return { path: named, from: 'P3201_REAL_NODE' };
  const tmux = String(env['P3201_REAL_TMUX'] ?? '');
  return { path: `${tmux.slice(0, tmux.lastIndexOf('/'))}/node`, from: 'beside P3201_REAL_TMUX' };
}

/**
 * The first command, reported whole. It reads versions and writes nothing. The
 * tmux and node versions are read from the binaries the row names, because a
 * non-interactive ssh's PATH may hold neither (his Mac Pro's does not).
 */
export function firstCommand(realTmux, farNode) {
  return `command -v tmux; ${quoteArg(realTmux)} -V; ${quoteArg(farNode)} -v 2>/dev/null || echo 'node absent'; uname -sr`;
}

/** The tmux version line out of what `firstCommand` printed, or null. */
export function versionFrom(printed) {
  return String(printed ?? '').split('\n').map((l) => l.trim()).find((l) => /^tmux \S+$/.test(l)) ?? null;
}

/** The node version line (`v22.16.0`) out of what `firstCommand` printed, or null. */
export function nodeVersionFrom(printed) {
  return String(printed ?? '').split('\n').map((l) => l.trim()).find((l) => /^v\d+\.\d+\.\d+$/.test(l)) ?? null;
}

/** His three dotfiles, whose size and modified time a run must leave as they were. */
export const DOTFILES = ['.zsh_history', '.bash_history', '.zshrc'];

/**
 * THE CENSUS: size and modified time, NEVER the content, of the three
 * dotfiles in his home, then of every `~/.zcompdump*` (printed only). It runs
 * under `/bin/sh -c`, so his login shell parses one quoted word and never
 * expands the glob itself, and it asks `stat` in whichever dialect the machine
 * has (GNU's `-c` is tried first, since BSD's `stat` refuses it), so it reads
 * the same on macOS and on Linux.
 */
export function censusCommand() {
  const script =
    'cd "$HOME" || exit 3; ' +
    "if stat -c %s / >/dev/null 2>&1; then f=-c; fmt='%s %Y'; else f=-f; fmt='%z %m'; fi; " +
    `for n in ${DOTFILES.join(' ')}; do ` +
    'if [ -e "$n" ] || [ -L "$n" ]; then printf \'%s %s\\n\' "$n" "$(stat $f "$fmt" "$n")"; else printf \'%s absent\\n\' "$n"; fi; done; ' +
    'for n in .zcompdump*; do if [ -e "$n" ]; then printf \'print %s %s\\n\' "$n" "$(stat $f "$fmt" "$n")"; fi; done; ' +
    'echo census-done';
  return `/bin/sh -c ${quoteArg(script)}`;
}

/**
 * What `censusCommand` printed, read: `{ files: {name: 'size mtime' | 'absent'},
 * printed: {name: 'size mtime'}, done }`. Nothing but the three names and the
 * `.zcompdump` names is kept.
 */
export function censusFrom(printed) {
  const out = { files: {}, printed: {}, done: false };
  for (const raw of String(printed ?? '').split('\n')) {
    const line = raw.trim();
    if (line === 'census-done') out.done = true;
    // `match`, not a RegExp's exec: gate:background reads a call named exec
    // as child_process's, and this reads text.
    const m = line.match(/^(\.[A-Za-z_]+) (absent|\d+ \d+)$/);
    if (m !== null && DOTFILES.includes(m[1])) out.files[m[1]] = m[2];
    const p = line.match(/^print (\.zcompdump[^\s/]*) (\d+ \d+)$/);
    if (p !== null) out.printed[p[1]] = p[2];
  }
  return out;
}

/**
 * THE SAME CENSUS OF THIS MAC, for the loopback machine (D12): its far shell
 * is his own zsh on this Mac, run by the loopback sshd with his real home, so
 * a loopback run can write this Mac's three dotfiles the way a real-row run
 * wrote the Mac Pro's. Size and modified time from `lstat`, never the content;
 * `.zcompdump*` names printed only. The same shape as `censusFrom`, so
 * `dotfilesMoved` reads both. STATED LIMIT: his own shells on this Mac write
 * `~/.zsh_history` too, so a command he types during a loopback run moves it
 * and fails the run; the sentence that reports it says so.
 */
export function localCensus(home = homedir()) {
  const out = { files: {}, printed: {}, done: true, home };
  for (const name of DOTFILES) {
    try {
      const st = lstatSync(join(home, name));
      out.files[name] = `${String(st.size)} ${String(Math.floor(st.mtimeMs / 1000))}`;
    } catch {
      out.files[name] = 'absent';
    }
  }
  try {
    for (const name of readdirSync(home).filter((n) => n.startsWith('.zcompdump')).sort()) {
      const st = lstatSync(join(home, name));
      out.printed[name] = `${String(st.size)} ${String(Math.floor(st.mtimeMs / 1000))}`;
    }
  } catch {
    /* printed only */
  }
  return out;
}

/** The one sentence a probe fails its run with when a census moved, or null. */
export function dotfilesSentence(where, moved, before, after) {
  if (moved.length === 0) return null;
  const detail = moved.map((n) => `${n} ${String(before?.files?.[n] ?? 'unread')} -> ${String(after?.files?.[n] ?? 'unread')}`).join('; ');
  return (
    `the size or modified time of ${moved.join(', ')} in his home on ${where} moved during the run (${detail}; size and modified time only, content never read). ` +
    'A run writes nothing outside its scratch directory, so this fails it' +
    (where === 'this Mac' ? '; his own shells on this Mac write ~/.zsh_history too, so if he typed a command during the run, say so beside the re-run.' : '.')
  );
}

/**
 * The dotfiles that MOVED between two censuses: a size, a modified time or a
 * presence that differs. A census that did not finish, or that is missing a
 * name, moves that name, because a reading nobody could take is not a proof.
 */
export function dotfilesMoved(before, after) {
  const moved = [];
  for (const name of DOTFILES) {
    const a = before?.done === true ? before.files?.[name] : undefined;
    const b = after?.done === true ? after.files?.[name] : undefined;
    if (a === undefined || b === undefined || a !== b) moved.push(name);
  }
  return moved;
}

/** The ONE read of his server: a count, made on the far side, so no name crosses. */
export function countCommand(realTmux) {
  return `${quoteArg(realTmux)} -L ${HIS_SOCKET} list-sessions -F x 2>/dev/null | wc -l`;
}

/** Make the run's directory tree, mode 0700, the empty zsh directory and the wrapper inside it. */
export function setupCommand(farDir, realTmux) {
  const d = quoteArg(farDir);
  const wrapper = quoteArg(`${farDir}/bin/tmux`);
  return (
    `umask 077 && mkdir -m 700 ${d} && mkdir -m 700 ${d}/bin ${d}/far ${d}/logs ${d}/zdot && ` +
    `printf '%s' ${quoteArg(wrapperText(farDir, realTmux))} > ${wrapper} && chmod 700 ${wrapper} && echo ready`
  );
}

/** One tmux command on the SCRATCH server, through the wrapper. Never `-L gmux`. */
export function scratchTmuxCommand(farDir, socket, args) {
  if (socket === HIS_SOCKET || socket === 'default') throw new Error(`refusing the socket ${socket}`);
  return [`${farDir}/bin/tmux`, '-L', socket, '-f', '/dev/null', ...args].map(quoteArg).join(' ');
}

/**
 * The proof, BEFORE any session: the socket directory holds exactly this name,
 * the far side's own resolution of the run's directory, and where the server
 * says its socket is.
 */
export function proveCommand(farDir, socket) {
  return (
    `ls -1 ${quoteArg(farDir)}/tmux-$(id -u)/ 2>/dev/null; echo '--'; ` +
    `(cd ${quoteArg(farDir)} && pwd -P); echo '--'; ` +
    `${scratchTmuxCommand(farDir, socket, ['display-message', '-p', '#{socket_path}'])}; echo '--'; ` +
    `${scratchTmuxCommand(farDir, socket, ['show-options', '-gv', 'default-shell'])}; echo '--'; ` +
    scratchTmuxCommand(farDir, socket, ['show-environment', '-g', 'ZDOTDIR'])
  );
}

/**
 * Read what `proveCommand` printed; null when it proves the socket and the
 * quiet shell, else the reason. The run's directory may resolve to itself or,
 * where `/tmp` is a link to `/private/tmp` (macOS), to `/private` and itself,
 * and to nothing else; the socket must lie under the directory as the far side
 * resolved it; the server's `default-shell` must be `/bin/sh` and its global
 * `ZDOTDIR` the run's own `zdot`, as the wrapper set it (D12).
 */
export function proveVerdict(printed, farDir, socket) {
  const [listing = '', resolved = '', where = '', shell = '', zdot = ''] = String(printed).split('--\n');
  const names = listing.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  if (names.length !== 1 || names[0] !== socket) {
    return `the far socket directory holds ${JSON.stringify(names)}, not exactly ${JSON.stringify(socket)}`;
  }
  const real = resolved.trim().split('\n')[0] ?? '';
  if (real !== farDir && real !== `/private${farDir}`) {
    return `the run's directory resolves to ${JSON.stringify(real)} there, which is neither ${farDir} nor /private${farDir}`;
  }
  const path = where.trim().split('\n')[0] ?? '';
  if (!path.startsWith(`${real}/`)) return `the scratch server says its socket is ${JSON.stringify(path)}, outside ${real}`;
  const shellLine = shell.trim().split('\n')[0] ?? '';
  if (shellLine !== '/bin/sh') {
    return `the scratch server's default-shell is ${JSON.stringify(shellLine)}, not /bin/sh, so a far session could start his login shell and write his history`;
  }
  const zdotLine = zdot.trim().split('\n')[0] ?? '';
  if (zdotLine !== `ZDOTDIR=${zdotFor(farDir)}`) {
    return `the scratch server's ZDOTDIR reads ${JSON.stringify(zdotLine)}, not ZDOTDIR=${zdotFor(farDir)}, so a far zsh could read his rc files and write his history`;
  }
  return null;
}

/**
 * Why an agent cannot sign the app in, or null (refusal 6). `list` runs
 * `ssh-add -l` against the socket and answers its exit status; it is a
 * parameter so the self-test contacts no agent. Nothing it prints is read:
 * the status alone says whether the agent holds a key.
 */
export function agentRefusal(sock, list = listAgent) {
  const status = list(sock);
  if (status === 0) return null;
  if (status === 1) {
    return (
      'the ssh agent at SSH_AUTH_SOCK holds no key ("The agent has no identities"), and the app, under a ' +
      'scratch HOME, signs in through the agent alone. Start a scratch ssh-agent, load his key into it BY ' +
      'PATH with ssh-add, point SSH_AUTH_SOCK at it, and end it in your own finally.'
    );
  }
  return `the ssh agent at SSH_AUTH_SOCK did not answer (ssh-add -l exited ${String(status)}), so the app could sign in to nothing.`;
}

/** `ssh-add -l` against one agent socket: its exit status alone, its output unread. */
function listAgent(sock) {
  const out = spawnSync('/usr/bin/ssh-add', ['-l'], {
    env: { SSH_AUTH_SOCK: sock, PATH: '/usr/bin:/bin' },
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 10_000
  });
  return out.status ?? -1;
}

/** The longest control socket path ssh can bind on macOS: 104 bytes less the terminator and its 17-byte suffix. */
export const CONTROL_PATH_MAX_BYTES = 86;

/** Why a control socket path is too long to bind, or null (refusal 7). */
export function controlPathRefusal(controlPath) {
  const bytes = Buffer.byteLength(String(controlPath), 'utf8');
  if (bytes <= CONTROL_PATH_MAX_BYTES) return null;
  return (
    `the ssh control socket ${JSON.stringify(controlPath)} is ${String(bytes)} bytes, and ssh binds it with a ` +
    `17-byte suffix inside macOS's 104-byte limit, so it can be at most ${String(CONTROL_PATH_MAX_BYTES)}. ` +
    'Give openRealMachine a shorter runDir (the harness directory under $TMPDIR fits).'
  );
}

/**
 * End the scratch server by the pid it reports, then anything of its socket
 * still running, then remove the run's directory.
 *
 * SIGTERM, two seconds, then SIGKILL, because a tmux server on SIGTERM waits
 * for every client to leave and a control client whose connection is gone may
 * never leave: on 2026-09-29 scratch servers on this Mac were found four hours
 * later, each waiting on such a client. The pid is the one THE SCRATCH SERVER
 * reported through the wrapper, whose socket is inside the run's directory, so
 * it can only be this run's.
 *
 * Then a READ of every process, and an end, by pid, of each one that IS a tmux
 * (its program's name) whose arguments name this run's own socket, `-L
 * gmux-p…-<pid>`, which no other process on that machine can carry: the
 * control client the app left, once its server is gone. The shell running this
 * text names the socket too and is not a tmux, so it is never matched. No other
 * process is signalled, and his `gmux` server is never named. It is written
 * without word splitting (`while read`) because his login shell may be zsh.
 */
export function teardownCommand(farDir, socket) {
  if (!farDir.startsWith(FAR_ROOT_PREFIX) || !/^\/tmp\/p3201-\d+$/.test(farDir)) {
    throw new Error(`${farDir} is not a run directory, so nothing is removed`);
  }
  if (socket === HIS_SOCKET || socket === 'default' || !/^gmux-p[a-z0-9-]*-\d+$/.test(String(socket))) {
    throw new Error(`refusing the socket ${String(socket)}`);
  }
  const pid = scratchTmuxCommand(farDir, socket, ['display-message', '-p', '#{pid}']);
  return (
    `p=$(${pid} 2>/dev/null); case "$p" in ''|*[!0-9]*) ;; *) kill "$p" 2>/dev/null; ` +
    `i=0; while kill -0 "$p" 2>/dev/null && [ "$i" -lt 20 ]; do sleep 0.1; i=$((i+1)); done; ` +
    `kill -9 "$p" 2>/dev/null ;; esac; sleep 1; ` +
    `ps -Ao pid=,comm=,args= | awk -v s=${quoteArg(`-L ${socket}`)} '$2 ~ /(^|\\/)tmux$/ && index($0 " ", " " s " ") > 0 { print $1 }' | ` +
    `while read q; do kill "$q" 2>/dev/null && echo "ended $q"; done; ` +
    `rm -rf ${quoteArg(farDir)} && echo removed`
  );
}

/** The master's pid out of what `ssh -O check` printed, or null. */
export function masterPidFrom(printed) {
  // `match`, not a RegExp's exec: `gate:background` reads a call named exec
  // as child_process's, and this reads text.
  const m = String(printed ?? '').match(/Master running \(pid=(\d+)\)/);
  return m ? Number(m[1]) : null;
}

/**
 * Whether a control master is THIS run's app's: its command line names the
 * scratch profile (the app's ssh carries that profile's host key file on every
 * command). Anything else, his own Tortie's above all, is never ended.
 */
export function masterIsRuns(command, marker) {
  return typeof marker === 'string' && marker.length > 8 && String(command ?? '').includes(marker);
}

/** Copy one file's text to a path under the run's directory, through `cat`. */
export function copyInCommand(farDir, name) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error(`${name} is not a plain file name`);
  const to = quoteArg(`${farDir}/bin/${name}`);
  return `cat > ${to} && chmod 600 ${to} && echo copied`;
}

/** The machine row the app is given. No port, no key: the agent signs in. */
export function machineRow({ id, host, user, farDir }) {
  return { id, label: 'p3201 real machine', host, user, remoteTmuxPath: `${farDir}/bin/tmux` };
}

/** The directories the app's control sockets can be in, the product's two forms. */
export function controlDirs(uid = process.getuid?.() ?? 0) {
  return [join(tmpdir(), 'tortie-mux'), join('/tmp', `tortie-${String(uid)}`)];
}

/** Every control socket path in those directories right now. */
export function controlEntries(dirs = controlDirs()) {
  const out = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) out.push(join(dir, name));
  }
  return out.sort();
}

/** The one entry that appeared after launch, or null when not exactly one did. */
export function appControlPath(before, after) {
  const fresh = after.filter((p) => !before.includes(p));
  return fresh.length === 1 ? fresh[0] : null;
}

// ---------------------------------------------------------------------------
// Opening the row
// ---------------------------------------------------------------------------

/** The row's facts from the environment, or `{ refusal }`. Contacts nothing. */
export function realMachineFromEnv(env, socket, options = {}) {
  const refusal = realRefusal(env, socket, options);
  if (refusal !== null) return { refusal };
  // The app signs in through the agent alone, so an app arm asks the agent
  // whether it holds a key before anything is launched (refusal 6).
  if (options.app === true) {
    const empty = agentRefusal(String(env['SSH_AUTH_SOCK'] ?? ''), options.listAgent);
    if (empty !== null) return { refusal: empty };
  }
  const farDir = farDirFor(socket);
  const node = farNodeOf(env);
  return {
    refusal: null,
    host: String(env['P3201_REAL_HOST']),
    user: String(env['P3201_REAL_USER']),
    realTmux: String(env['P3201_REAL_TMUX']),
    realNode: node.path,
    realNodeFrom: node.from,
    identity: String(env['P3201_REAL_IDENTITY'] ?? '') || null,
    socket,
    farDir,
    wrapper: `${farDir}/bin/tmux`
  };
}

/**
 * Open the row: seed the host key, read the first facts and the first count,
 * make the run's directory. Returns a handle whose `close()` MUST be called in
 * the caller's `finally`; it ends everything this file started or put there.
 * `runDir` is a local directory this run owns (the harness directory), short
 * enough for a control socket path.
 */
export function openRealMachine(facts, { runDir, say = () => undefined }) {
  const knownHosts = join(runDir, 'p3201-real-known-hosts');
  const controlPath = join(runDir, 'p3201-cm');
  // Refusal 7, BEFORE any contact: nothing has been made there, so there is
  // nothing for a teardown to do.
  const tooLong = controlPathRefusal(controlPath);
  if (tooLong !== null) throw new Error(tooLong);
  const scanned = keyscanText({ host: facts.host, caller: CALLER });
  if (scanned.trim() === '') throw new Error(`ssh-keyscan read no host key from ${facts.host}`);
  // ONLY the public host key lines, and only for this host.
  const lines = scanned.split('\n').filter((l) => l.startsWith(`${facts.host} `));
  writeFileSync(knownHosts, `${lines.join('\n')}\n`, { mode: 0o600 });
  const options = composeSshOptions({
    knownHosts,
    caller: CALLER,
    connectTimeout: 10,
    strict: 'yes',
    controlMaster: 'auto',
    controlPath,
    controlPersist: '60s',
    serverAliveInterval: 5,
    serverAliveCountMax: 3,
    identityFile: facts.identity,
    extra: ['-l', facts.user]
  });
  const run = (command, { input = undefined, timeoutMs = 60_000 } = {}) => {
    const out = sshRun({ knownHosts, caller: CALLER, argv: [...options, facts.host, command], input, timeout: timeoutMs });
    return { code: out.status ?? -1, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
  };
  let appControl = null;
  let closed = false;
  const handle = {
    facts,
    knownHosts,
    first: null,
    /** The version line the named tmux printed, e.g. `tmux 3.7c`, or null. */
    version: null,
    countBefore: null,
    countAfter: null,
    /** What the teardown printed: the directory removed, and leftovers ended. */
    teardown: null,
    /** The far node's path when it answered `-v`, else null; and its version line. */
    node: null,
    nodeVersion: null,
    standIns: [],
    /**
     * His three dotfiles, read at the first contact and the last (D12):
     * `{ before, after, moved }`. A probe FAILS its run when `moved` is not
     * empty, and `moved` holds every name when either census could not be read.
     */
    dotfiles: { before: null, after: null, moved: [...DOTFILES] },
    run,
    /**
     * The argv for one LONG-LIVED ssh over this file's own master, for
     * build/ssh-run.mjs's `sshSpawn` with `knownHosts` (probe:p320:skew's
     * attach and control client, which share the master the way the
     * product's two roads do). `tty` asks for a terminal, as the attach does.
     */
    spawnArgv(command, { tty = false } = {}) {
      return [...(tty ? ['-t'] : []), ...options, facts.host, command];
    },
    /** One tmux command on the scratch server; its stdout. */
    tmux(args, opts = {}) {
      const out = run(scratchTmuxCommand(facts.farDir, facts.socket, args), opts);
      if (out.code !== 0 && opts.allowFail !== true) throw new Error(`far tmux ${args[0]} exited ${String(out.code)}: ${out.stderr.trim().slice(0, 200)}`);
      return out.stdout;
    },
    /** A file under the run's directory, read back. */
    cat(path) {
      if (!path.startsWith(`${facts.farDir}/`)) throw new Error(`${path} is outside the run's directory`);
      return run(`cat ${quoteArg(path)} 2>/dev/null`).stdout;
    },
    count() {
      const out = run(countCommand(facts.realTmux));
      const n = Number(out.stdout.trim());
      return Number.isInteger(n) && out.stdout.trim() !== '' ? n : null;
    },
    prove() {
      return proveVerdict(run(proveCommand(facts.farDir, facts.socket)).stdout, facts.farDir, facts.socket);
    },
    /**
     * Find the app's own control master and keep it for `close()`, or say why
     * not. It must be the ONE entry new since `before` (listed before launch),
     * `ssh -O check` must name its master, and that master's command line must
     * name `marker`, the scratch profile. Answers null when kept, else the
     * sentence for the report; a master that is not provably this run's is
     * left alone, so his own Tortie's connection is never ended.
     */
    adoptAppControl(before, marker) {
      const fresh = appControlPath(before, controlEntries());
      if (fresh === null) return 'the app\'s own ssh control socket could not be told apart from the ones there before launch, so it is left to end by itself';
      const checked = sshRun({ knownHosts, caller: CALLER, argv: ['-O', 'check', '-o', `ControlPath=${fresh}`, facts.host] });
      const master = masterPidFrom(`${checked.stderr ?? ''}${checked.stdout ?? ''}`);
      if (master === null) return `the new control socket ${fresh} answered no master, so it is left alone`;
      const command = (spawnSync('ps', ['-p', String(master), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
      if (!masterIsRuns(command, marker)) return `the new control socket ${fresh} belongs to a master that does not name this run's profile, so it is left alone`;
      appControl = fresh;
      return null;
    },
    close() {
      if (closed) return;
      closed = true;
      const ended = [];
      for (const path of [appControl, controlPath]) {
        if (path === null) continue;
        const out = sshRun({ knownHosts, caller: CALLER, argv: ['-O', 'exit', '-o', `ControlPath=${path}`, facts.host] });
        ended.push(`${path}: ${String(out.status)}`);
      }
      // A fresh connection for the rest, since this file's own master is gone.
      const plain = composeSshOptions({ knownHosts, caller: CALLER, connectTimeout: 10, strict: 'yes', identityFile: facts.identity, extra: ['-l', facts.user] });
      const once = (command) => {
        const out = sshRun({ knownHosts, caller: CALLER, argv: [...plain, facts.host, command] });
        return { code: out.status ?? -1, stdout: out.stdout ?? '' };
      };
      const torn = once(teardownCommand(facts.farDir, facts.socket));
      const tornLines = torn.stdout.split('\n').map((l) => l.trim()).filter((l) => l !== '');
      handle.teardown = {
        removed: tornLines.includes('removed'),
        leftoversEnded: tornLines.filter((l) => l.startsWith('ended ')).length
      };
      const counted = once(countCommand(facts.realTmux));
      handle.countAfter = Number.isInteger(Number(counted.stdout.trim())) && counted.stdout.trim() !== '' ? Number(counted.stdout.trim()) : null;
      // THE LAST CONTACT: his three dotfiles, size and modified time only.
      handle.dotfiles.after = censusFrom(once(censusCommand()).stdout);
      handle.dotfiles.moved = dotfilesMoved(handle.dotfiles.before, handle.dotfiles.after);
      say(
        `real machine: masters ${ended.join(', ') || 'none'}; ` +
          `far directory ${handle.teardown.removed ? 'removed' : `NOT confirmed removed (exit ${String(torn.code)})`}; ` +
          `${String(handle.teardown.leftoversEnded)} tmux process(es) of this run's socket outlived its server and were ended by pid; ` +
          `his server holds ${String(handle.countAfter)} sessions after, ${String(handle.countBefore)} before; ` +
          `his dotfiles ${handle.dotfiles.moved.length === 0 ? 'did not move' : `MOVED: ${handle.dotfiles.moved.join(', ')}`} ` +
          `(before ${JSON.stringify(handle.dotfiles.before?.files ?? null)}, after ${JSON.stringify(handle.dotfiles.after?.files ?? null)}; ` +
          `printed only, .zcompdump before ${JSON.stringify(handle.dotfiles.before?.printed ?? null)}, after ${JSON.stringify(handle.dotfiles.after?.printed ?? null)})`
      );
    }
  };
  try {
    // THE FIRST CONTACT is the census: size and modified time of his three
    // dotfiles, read before anything of this run exists there (D12).
    const census = run(censusCommand());
    if (census.code !== 0 && census.stdout.trim() === '') throw new Error(`the census did not sign in (exit ${String(census.code)}): ${census.stderr.trim().slice(0, 200)}`);
    handle.dotfiles.before = censusFrom(census.stdout);
    if (handle.dotfiles.before.done !== true) throw new Error('the census of his dotfiles did not finish, so a change to them could not be seen; nothing was made there');
    say(`real machine: his dotfiles before (size and modified time only): ${JSON.stringify(handle.dotfiles.before.files)}; printed only, .zcompdump ${JSON.stringify(handle.dotfiles.before.printed)}`);
    const first = run(firstCommand(facts.realTmux, facts.realNode));
    if (first.code !== 0 && first.stdout.trim() === '') throw new Error(`the first command did not sign in (exit ${String(first.code)}): ${first.stderr.trim().slice(0, 200)}`);
    handle.first = first.stdout.trim();
    handle.nodeVersion = nodeVersionFrom(handle.first);
    handle.node = handle.nodeVersion === null ? null : facts.realNode;
    handle.version = versionFrom(handle.first);
    say(`real machine: first command answered ${JSON.stringify(handle.first)}`);
    say(`real machine: node is ${facts.realNode} (${facts.realNodeFrom}), ${handle.nodeVersion === null ? 'which did NOT answer -v there' : `answering ${handle.nodeVersion}`}`);
    if (handle.version === null) throw new Error(`${facts.realTmux} -V printed no version there, so the row's tmux cell cannot be read`);
    say(`real machine: ${facts.realTmux} is ${handle.version}`);
    handle.countBefore = handle.count();
    say(`real machine: his server holds ${String(handle.countBefore)} sessions (counted there; no name crossed)`);
    const made = run(setupCommand(facts.farDir, facts.realTmux));
    if (!made.stdout.includes('ready')) throw new Error(`the run's directory was not made: ${made.stderr.trim().slice(0, 200)}`);
    if (handle.node !== null) {
      for (const name of STAND_INS) {
        const text = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'p320', name));
        const copied = run(copyInCommand(facts.farDir, name), { input: text });
        if (copied.stdout.includes('copied')) handle.standIns.push(`${facts.farDir}/bin/${name}`);
      }
    }
    say(`real machine: ${handle.node === null ? `${facts.realNode} (${facts.realNodeFrom}) did not answer, so the rulers are stty raw and cat and R1 (the full-screen stand-in) is NOT run on this row; set P3201_REAL_NODE` : `${handle.node} answered ${String(handle.nodeVersion)}, so the stand-ins were copied (${String(handle.standIns.length)})`}`);
  } catch (err) {
    handle.close();
    throw err;
  }
  return handle;
}

// ---------------------------------------------------------------------------
// --self-test: every composed string and every refusal, contacting nothing
// ---------------------------------------------------------------------------

/**
 * The teardown's process half, RUN rather than read: the composed text is
 * handed to /bin/sh (and to zsh when it is here, since his login shell may be
 * zsh) with `ps` and `kill` replaced by stand-ins in a scratch directory, the
 * scratch server's tmux reporting no pid and the run directory a scratch one.
 * The stand-in `ps` lists his gmux server, a scratch server's client, a shell
 * whose arguments name the socket, a tmux on another run's socket, and a tmux
 * whose socket only STARTS with this one's name; only the two tmux processes
 * that name this socket may be ended. Contacts nothing.
 */
function teardownDryRun(dir, socket) {
  const scratch = join(tmpdir(), `p3201-real-selftest-${String(process.pid)}`);
  const fake = join(scratch, 'bin');
  const runDir = `${FAR_ROOT_PREFIX}${String(process.pid)}999`;
  const answers = [];
  try {
    for (const shell of ['/bin/sh', '/bin/zsh']) {
      if (!existsSync(shell)) continue;
      spawnSync('rm', ['-rf', scratch]);
      spawnSync('mkdir', ['-p', fake]);
      const listing = [
        `  500 /opt/homebrew/bin/tmux /opt/homebrew/bin/tmux -L gmux new-session -d`,
        `  501 /opt/homebrew/bin/tmux /opt/homebrew/bin/tmux -L ${socket} -f /dev/null -C new-session -A -s gmux-control`,
        `  502 /bin/zsh zsh -c p=$(x -L ${socket} -f /dev/null display-message)`,
        `  503 tmux tmux -L ${socket} attach`,
        `  504 /opt/homebrew/bin/tmux /opt/homebrew/bin/tmux -L gmux-p320-other-7 -C`,
        `  505 /opt/homebrew/bin/tmux /opt/homebrew/bin/tmux -L ${socket}0 -C`
      ].join('\n');
      writeFileSync(join(fake, 'ps'), `#!/bin/sh\ncat <<'P3201'\n${listing}\nP3201\n`, { mode: 0o755 });
      writeFileSync(join(fake, 'kill'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      // The two writes are stand-ins too: `kill` records nothing and ends
      // nothing, and the directory removal only says what it would remove.
      const text = teardownCommand(runDir, socket)
        .replace(/kill "\$q"/, `${join(fake, 'kill')} "$q"`)
        .replace(/rm -rf /, 'echo would-remove ');
      const out = spawnSync(shell, ['-c', text], { encoding: 'utf8', env: { PATH: `${fake}:/usr/bin:/bin`, HOME: scratch, ZDOTDIR: scratch }, timeout: 20_000 });
      answers.push((out.stdout ?? '').split('\n').filter((l) => l.startsWith('ended ')).join('|'));
    }
  } finally {
    spawnSync('rm', ['-rf', scratch]);
  }
  const same = answers.every((a) => a === answers[0]);
  return same && answers.length > 0 ? answers[0].split('|') : answers;
}

/**
 * The census, RUN rather than read: its text handed to /bin/sh and to zsh (as
 * ssh hands a command to his login shell) over a scratch HOME holding two of
 * the three files and a `.zcompdump`, then again after one file's modified
 * time is moved. Contacts nothing; the scratch HOME is removed in a `finally`.
 */
function censusDryRun() {
  const home = join(tmpdir(), `p3201-census-${String(process.pid)}`);
  const answers = [];
  let moved = null;
  try {
    rmSync(home, { recursive: true, force: true });
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, '.zsh_history'), 'hist\n');
    writeFileSync(join(home, '.zshrc'), 'x\n\n');
    writeFileSync(join(home, '.zcompdump-x'), '');
    utimesSync(join(home, '.zsh_history'), 1_700_000_000, 1_700_000_000);
    utimesSync(join(home, '.zshrc'), 1_700_000_100, 1_700_000_100);
    const env = { HOME: home, ZDOTDIR: home, PATH: '/usr/bin:/bin' };
    const read = (shell, path = env.PATH) => censusFrom(spawnSync(shell, ['-c', censusCommand()], { encoding: 'utf8', env: { ...env, PATH: path }, timeout: 20_000 }).stdout ?? '');
    for (const shell of ['/bin/sh', '/bin/zsh']) if (existsSync(shell)) answers.push(read(shell));
    // A LINUX machine's `stat`, stood in for: GNU's `-c FORMAT` accepted and
    // answered through this Mac's own stat, anything else refused as GNU
    // refuses BSD's `-f FORMAT` dialect here. The census must take the GNU
    // branch and read the same numbers.
    const gnu = join(home, '.gnu-bin');
    mkdirSync(gnu);
    writeFileSync(
      join(gnu, 'stat'),
      "#!/bin/sh\nif [ \"$1\" = -c ]; then shift; shift; exec /usr/bin/stat -f '%z %m' \"$@\"; fi\necho 'stat: GNU stand-in refuses this' >&2\nexit 1\n",
      { mode: 0o755 }
    );
    answers.push(read('/bin/sh', `${gnu}:/usr/bin:/bin`));
    utimesSync(join(home, '.zsh_history'), 1_700_000_500, 1_700_000_500);
    moved = dotfilesMoved(answers[0], read('/bin/sh'));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
  const same = answers.every((a) => JSON.stringify(a) === JSON.stringify(answers[0]));
  return { same, first: answers[0]?.files ?? null, printed: Object.keys(answers[0]?.printed ?? {}), moved };
}

/** This Mac's census over a scratch home agrees with the far census's text over the same files, and sees a touch. */
function localCensusDry() {
  const home = join(tmpdir(), `p3201-lcensus-${String(process.pid)}`);
  try {
    rmSync(home, { recursive: true, force: true });
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, '.zshrc'), 'x\n');
    writeFileSync(join(home, '.bash_history'), 'y\n');
    writeFileSync(join(home, '.zcompdump'), '');
    utimesSync(join(home, '.zshrc'), 1_700_000_000, 1_700_000_000);
    const here = localCensus(home);
    const far = censusFrom(spawnSync('/bin/sh', ['-c', censusCommand()], { encoding: 'utf8', env: { HOME: home, ZDOTDIR: home, PATH: '/usr/bin:/bin' } }).stdout ?? '');
    utimesSync(join(home, '.zshrc'), 1_700_000_900, 1_700_000_900);
    return { same: JSON.stringify(here.files) === JSON.stringify(far.files) && JSON.stringify(here.printed) === JSON.stringify(far.printed), moved: dotfilesMoved(here, localCensus(home)) };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/**
 * The wrapper and the proof, RUN against THIS Mac's tmux (the vendored 3.7b,
 * else 3.6a) on a scratch socket inside a scratch `/tmp/p3201-<pid>998`: the
 * setup text makes the tree, a session started through the wrapper makes the
 * server, and `proveCommand`'s text read by `proveVerdict` must prove it. The
 * FIRST ATTEMPT's wrapper (TMUX_TMPDIR alone) is run the same way under
 * `SHELL=/bin/zsh` in `/tmp/p3201-<pid>997` and must be REFUSED, which is the
 * defect that moved his `~/.zsh_history`. Both are ended by `teardownCommand`'s
 * own text, then by pid and `rm -rf` in a `finally`. Contacts no host.
 */
function liveLocalProof() {
  const here = dirname(fileURLToPath(import.meta.url));
  const tmux = [join(here, '..', 'vendor', 'tmux', 'bin', 'tmux'), '/opt/homebrew/bin/tmux'].find((p) => existsSync(p));
  if (tmux === undefined) return 'no tmux on this Mac to run it against';
  const home = join(tmpdir(), `p3201-proof-home-${String(process.pid)}`);
  // A scratch HOME and ZDOTDIR, and no TERM_SESSION_ID (his ruling of 2026-10-02).
  const env = (shell) => ({ HOME: home, ZDOTDIR: home, PATH: '/usr/bin:/bin', SHELL: shell, TERM: 'xterm-256color' });
  const run = (cmd, shell = '/bin/sh') => spawnSync('/bin/sh', ['-c', cmd], { encoding: 'utf8', env: env(shell), timeout: 30_000 });
  const worlds = [
    { dir: `${FAR_ROOT_PREFIX}${String(process.pid)}998`, socket: `gmux-p320-selftest-${String(process.pid)}`, plain: false, pid: null },
    { dir: `${FAR_ROOT_PREFIX}${String(process.pid)}997`, socket: `gmux-p320-selftestb-${String(process.pid)}`, plain: true, pid: null }
  ];
  const out = { proved: 'not read', plainRefused: false, removed: false, left: 0 };
  try {
    rmSync(home, { recursive: true, force: true });
    mkdirSync(home, { recursive: true });
    for (const w of worlds) {
      if (existsSync(w.dir)) return `${w.dir} is already there, so this run will not touch it`;
      if (!run(setupCommand(w.dir, tmux)).stdout.includes('ready')) return `the setup text did not make ${w.dir}`;
      if (w.plain) {
        // The first attempt's wrapper, byte for byte in its effect.
        writeFileSync(`${w.dir}/bin/tmux`, `#!/bin/sh\nTMUX_TMPDIR=${quoteArg(w.dir)}\nexport TMUX_TMPDIR\nexec ${quoteArg(tmux)} "$@"\n`, { mode: 0o700 });
      }
      // BOTH worlds start under SHELL=/bin/zsh, his login shell's value, so
      // what the quiet world proves is the WRAPPER's export and nothing else.
      run(scratchTmuxCommand(w.dir, w.socket, ['new-session', '-d', '-s', 'ctl', '-x', '80', '-y', '24']), '/bin/zsh');
      const pid = Number(run(scratchTmuxCommand(w.dir, w.socket, ['display-message', '-p', '#{pid}'])).stdout.trim());
      w.pid = Number.isInteger(pid) && pid > 1 ? pid : null;
      const verdict = proveVerdict(run(proveCommand(w.dir, w.socket)).stdout, w.dir, w.socket);
      if (w.plain) out.plainRefused = verdict !== null && /default-shell/.test(verdict);
      else out.proved = verdict;
    }
    out.removed = worlds.every((w) => run(teardownCommand(w.dir, w.socket)).stdout.includes('removed') && !existsSync(w.dir));
  } finally {
    for (const w of worlds) {
      if (w.pid !== null) {
        try {
          process.kill(w.pid, 0);
          out.left += 1;
          process.kill(w.pid, 'SIGKILL');
        } catch {
          /* ended by the teardown's own text, which is what is being proved */
        }
      }
      rmSync(w.dir, { recursive: true, force: true });
    }
    rmSync(home, { recursive: true, force: true });
  }
  return out;
}

function selfTest() {
  const OK_ENV = {
    P3201_REAL_HOST: 'far-box.example.ts.net',
    P3201_REAL_USER: 'someone',
    P3201_REAL_TMUX: '/opt/homebrew/bin/tmux',
    P3201_REAL_ACK: 'p3201',
    SSH_AUTH_SOCK: '/private/tmp/agent.sock'
  };
  const SOCK = 'gmux-p320-wt-p3201-4242';
  const DIR = '/tmp/p3201-4242';
  const without = (name) => Object.fromEntries(Object.entries(OK_ENV).filter(([k]) => k !== name));
  const starts = (s) => (s === null ? null : String(s).slice(0, 40));
  const cases = [
    ['a whole environment is accepted', () => realRefusal(OK_ENV, SOCK), null],
    ...REAL_ENV.map((name) => [`${name} unset is refused`, () => starts(realRefusal(without(name), SOCK)), `${name} is not set. The real-machine row `.slice(0, 40)]),
    ['a wrong acknowledgement is refused', () => starts(realRefusal({ ...OK_ENV, P3201_REAL_ACK: 'yes' }, SOCK)), 'P3201_REAL_ACK reads "yes", not "p3201".'.slice(0, 40)],
    ['CI is refused', () => starts(realRefusal({ ...OK_ENV, CI: 'true' }, SOCK)), 'CI is set. This row never runs in CI: the'.slice(0, 40)],
    ['localhost is refused', () => starts(realRefusal({ ...OK_ENV, P3201_REAL_HOST: 'localhost' }, SOCK)), 'P3201_REAL_HOST "localhost" is this Mac.'.slice(0, 40)],
    ['127.0.0.1 is refused', () => starts(realRefusal({ ...OK_ENV, P3201_REAL_HOST: '127.0.0.1' }, SOCK)), 'P3201_REAL_HOST "127.0.0.1" is this Mac.'.slice(0, 40)],
    ['::1 is refused as not plain', () => realRefusal({ ...OK_ENV, P3201_REAL_HOST: '::1' }, SOCK) !== null, true],
    ['a host with a shell word is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_HOST: 'box;id' }, SOCK) !== null, true],
    ['a host beginning with a dash is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_HOST: '-oProxyCommand=x' }, SOCK) !== null, true],
    ['a user with a space is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_USER: 'a b' }, SOCK) !== null, true],
    ['a relative tmux is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_TMUX: 'tmux' }, SOCK) !== null, true],
    ['a tmux path with a quote is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_TMUX: "/opt/x'y/tmux" }, SOCK) !== null, true],
    ['a tmux path climbing with .. is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_TMUX: '/opt/../bin/tmux' }, SOCK) !== null, true],
    ['the socket gmux is refused', () => starts(realRefusal(OK_ENV, 'gmux')), 'the socket "gmux" is not a harness socket'.slice(0, 40)],
    ['the socket default is refused', () => starts(realRefusal(OK_ENV, 'default')), 'the socket "default" is not a harness soc'.slice(0, 40)],
    ['a socket of another probe is refused', () => realRefusal(OK_ENV, 'gmux-p95-scroll-wt-12') !== null, true],
    ['a socket with no pid is refused', () => realRefusal(OK_ENV, 'gmux-p320-wt') !== null, true],
    ['probe:p292\'s harness socket is accepted', () => realRefusal(OK_ENV, 'gmux-p292-wt-p3201-77'), null],
    // PHASE 336: probe:p336's harness socket (`gmux-p336-<slug>-<pid>`) is a
    // reader of this row, and one with no pid is refused like any other.
    ['probe:p336\'s harness socket is accepted', () => realRefusal(OK_ENV, 'gmux-p336-wt-p336-77'), null],
    ['a gmux-p336 socket with no pid is refused', () => realRefusal(OK_ENV, 'gmux-p336') !== null, true],
    ['no agent and no key is refused', () => realRefusal(without('SSH_AUTH_SOCK'), SOCK) !== null, true],
    ['a key by path and no agent is accepted for this file\'s own reads', () => realRefusal({ ...without('SSH_AUTH_SOCK'), P3201_REAL_IDENTITY: '/Users/someone/.ssh/id_ed25519' }, SOCK), null],
    ['a key by path and no agent is refused for the app', () => starts(realRefusal({ ...without('SSH_AUTH_SOCK'), P3201_REAL_IDENTITY: '/Users/someone/.ssh/id_ed25519' }, SOCK, { app: true })), 'SSH_AUTH_SOCK is not set. The app signs in'.slice(0, 40)],
    ['a key path with a space is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_IDENTITY: '/Users/a b/key' }, SOCK) !== null, true],
    ['the loopback machine\'s own agent is refused', () => starts(realRefusal(OK_ENV, SOCK, { app: true, scratchAgent: OK_ENV.SSH_AUTH_SOCK })), 'SSH_AUTH_SOCK is the loopback machine\'s own agent'.slice(0, 40)],
    ['another agent beside a loopback carriage is accepted', () => realRefusal(OK_ENV, SOCK, { app: true, scratchAgent: '/private/tmp/p71-scratch/agent.sock' }), null],
    ['the socket pid is read off its end', () => socketPid(SOCK), 4242],
    ['the far directory is /tmp/p3201-<pid>', () => farDirFor(SOCK), DIR],
    ['the wrapper sets TMUX_TMPDIR and the quiet shell (sh, no history, the run\'s zdot) and execs his tmux', () => wrapperText(DIR, '/opt/homebrew/bin/tmux').split('\n').slice(2).join('|'), 'TMUX_TMPDIR=/tmp/p3201-4242|SHELL=/bin/sh|HISTFILE=/dev/null|ZDOTDIR=/tmp/p3201-4242/zdot|export TMUX_TMPDIR SHELL HISTFILE ZDOTDIR|exec /opt/homebrew/bin/tmux "$@"|'],
    ['the wrapper refuses a directory outside the prefix', () => { try { wrapperText('/tmp/other', '/x'); return 'composed'; } catch { return 'refused'; } }, 'refused'],
    ['the count is the one -L gmux read, counted there', () => countCommand('/opt/homebrew/bin/tmux'), '/opt/homebrew/bin/tmux -L gmux list-sessions -F x 2>/dev/null | wc -l'],
    ['the setup makes one 0700 tree with an empty zdot and the wrapper, and names no gmux socket', () => [setupCommand(DIR, '/opt/homebrew/bin/tmux').startsWith("umask 077 && mkdir -m 700 /tmp/p3201-4242 && mkdir -m 700 /tmp/p3201-4242/bin /tmp/p3201-4242/far /tmp/p3201-4242/logs /tmp/p3201-4242/zdot && "), / -L gmux\b/.test(setupCommand(DIR, '/opt/homebrew/bin/tmux'))], [true, false]],
    ['a scratch command goes through the wrapper on the scratch socket', () => scratchTmuxCommand(DIR, SOCK, ['display-message', '-p', '#{pid}']), "/tmp/p3201-4242/bin/tmux -L gmux-p320-wt-p3201-4242 -f /dev/null display-message -p '#{pid}'"],
    ['a scratch command refuses the socket gmux', () => { try { scratchTmuxCommand(DIR, 'gmux', ['ls']); return 'composed'; } catch { return 'refused'; } }, 'refused'],
    ['the proof lists the socket directory, resolves the run directory there, then asks the server where its socket is, its default-shell and its ZDOTDIR', () => proveCommand(DIR, SOCK), "ls -1 /tmp/p3201-4242/tmux-$(id -u)/ 2>/dev/null; echo '--'; (cd /tmp/p3201-4242 && pwd -P); echo '--'; /tmp/p3201-4242/bin/tmux -L gmux-p320-wt-p3201-4242 -f /dev/null display-message -p '#{socket_path}'; echo '--'; /tmp/p3201-4242/bin/tmux -L gmux-p320-wt-p3201-4242 -f /dev/null show-options -gv default-shell; echo '--'; /tmp/p3201-4242/bin/tmux -L gmux-p320-wt-p3201-4242 -f /dev/null show-environment -g ZDOTDIR"],
    ['the proof passes exactly one name, a path inside, /bin/sh and the run\'s zdot', () => proveVerdict(`${SOCK}\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK), null],
    ['the proof passes macOS\'s /private/tmp spelling, which tmux reports because /tmp is a link', () => proveVerdict(`${SOCK}\n--\n/private${DIR}\n--\n/private${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK), null],
    ['the proof refuses his login shell as the default-shell', () => starts(proveVerdict(`${SOCK}\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n--\n/bin/zsh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK)), 'the scratch server\'s default-shell is "/bin/zsh", not /bin/sh'.slice(0, 40)],
    ['the proof refuses a server with no ZDOTDIR (tmux prints -ZDOTDIR for an unset one)', () => proveVerdict(`${SOCK}\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\n-ZDOTDIR\n`, DIR, SOCK) !== null, true],
    ['the proof refuses a ZDOTDIR that is not the run\'s own', () => proveVerdict(`${SOCK}\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=/Users/someone\n`, DIR, SOCK) !== null, true],
    ['the proof refuses an answer cut short before the shell', () => proveVerdict(`${SOCK}\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n`, DIR, SOCK) !== null, true],
    ['the proof refuses a run directory resolving anywhere else', () => proveVerdict(`${SOCK}\n--\n/Users/someone${DIR}\n--\n/Users/someone${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK) !== null, true],
    ['the proof refuses a /private socket when the directory resolved to itself', () => proveVerdict(`${SOCK}\n--\n${DIR}\n--\n/private${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK) !== null, true],
    ['the proof refuses a second name in the directory', () => proveVerdict(`${SOCK}\ngmux\n--\n${DIR}\n--\n${DIR}/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK) !== null, true],
    ['the proof refuses a socket outside the run directory', () => proveVerdict(`${SOCK}\n--\n/private${DIR}\n--\n/private/tmp/tmux-501/${SOCK}\n--\n/bin/sh\n--\nZDOTDIR=${DIR}/zdot\n`, DIR, SOCK) !== null, true],
    ['an agent that holds a key is accepted', () => agentRefusal('/x', () => 0), null],
    ['an agent that holds no key is refused, naming the scratch agent', () => starts(agentRefusal('/x', () => 1)), 'the ssh agent at SSH_AUTH_SOCK holds no k'.slice(0, 40)],
    ['an agent that does not answer is refused', () => agentRefusal('/x', () => 2) !== null, true],
    ['the app arm asks the agent, and refuses an empty one', () => starts(realMachineFromEnv(OK_ENV, SOCK, { app: true, listAgent: () => 1 }).refusal), 'the ssh agent at SSH_AUTH_SOCK holds no k'.slice(0, 40)],
    ['the app arm with a keyed agent opens', () => realMachineFromEnv(OK_ENV, SOCK, { app: true, listAgent: () => 0 }).refusal, null],
    ['this file\'s own reads do not need the agent to hold a key', () => realMachineFromEnv(OK_ENV, SOCK, { listAgent: () => 1 }).refusal, null],
    ['a control path of 86 bytes fits', () => controlPathRefusal(`/${'a'.repeat(85)}`), null],
    ['a control path of 87 bytes is refused before contact, naming the limit', () => starts(controlPathRefusal(`/${'a'.repeat(86)}`)), 'the ssh control socket "/aaaaaaaaaaaaaaaaaaa'.slice(0, 40)],
    ['the verifier\'s long scratchpad runDir is refused', () => controlPathRefusal(join('/private/tmp/claude-501/-Users-someone-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3201', 'p3201-cm')) !== null, true],
    ['a $TMPDIR harness runDir fits', () => controlPathRefusal(join('/var/folders/ab/cdefghijklmnopqrstuvwxyz0000gn/T/gmux-p320-wt-p3201-99999', 'p3201-cm')), null],
    ['the teardown ends the scratch server by its pid, then its socket\'s tmux leftovers, and removes only the run directory', () => teardownCommand(DIR, SOCK), `p=$(/tmp/p3201-4242/bin/tmux -L gmux-p320-wt-p3201-4242 -f /dev/null display-message -p '#{pid}' 2>/dev/null); case "$p" in ''|*[!0-9]*) ;; *) kill "$p" 2>/dev/null; i=0; while kill -0 "$p" 2>/dev/null && [ "$i" -lt 20 ]; do sleep 0.1; i=$((i+1)); done; kill -9 "$p" 2>/dev/null ;; esac; sleep 1; ps -Ao pid=,comm=,args= | awk -v s='-L gmux-p320-wt-p3201-4242' '$2 ~ /(^|\\/)tmux$/ && index($0 " ", " " s " ") > 0 { print $1 }' | while read q; do kill "$q" 2>/dev/null && echo "ended $q"; done; rm -rf /tmp/p3201-4242 && echo removed`],
    ['the teardown refuses his socket, and any socket that is not a harness one ending in a pid', () => ['gmux', 'work', 'gmux-p320-wt'].map((s) => { try { teardownCommand(DIR, s); return 'composed'; } catch { return 'refused'; } }), ['refused', 'refused', 'refused']],
    ['the teardown, run by /bin/sh over a fake ps, ends only the tmux that names this socket', () => teardownDryRun(DIR, SOCK), ['ended 501', 'ended 503']],
    ['a master pid is read out of ssh -O check', () => [masterPidFrom('Master running (pid=31337)\r\n'), masterPidFrom('Control socket connect(/x): No such file or directory')], [31337, null]],
    ['a master is this run\'s only when its command names the profile', () => [masterIsRuns('ssh -o BatchMode=yes -o ControlMaster=auto /private/tmp/h/p320/p-head/gmux/machines/known-machines -l u x', '/private/tmp/h/p320/p-head'), masterIsRuns('ssh -o BatchMode=yes -o ControlMaster=auto /Users/someone/Library/Application-Support/Tortie/gmux/machines/known-machines -l u x', '/private/tmp/h/p320/p-head'), masterIsRuns('anything', '')], [true, false, false]],
    ['the teardown refuses a directory that is not a run directory', () => { try { teardownCommand('/tmp', SOCK); return 'composed'; } catch { return 'refused'; } }, 'refused'],
    ['no composer but the count names -L gmux', () => [setupCommand(DIR, '/x/tmux'), proveCommand(DIR, SOCK), teardownCommand(DIR, SOCK), wrapperText(DIR, '/x/tmux'), firstCommand('/x/tmux', '/x/node'), censusCommand()].some((t) => / -L gmux(\s|$)/.test(t)), false],
    ['the first command reads versions only, tmux and node from the paths the row names', () => firstCommand('/usr/local/bin/tmux', '/usr/local/bin/node'), "command -v tmux; /usr/local/bin/tmux -V; /usr/local/bin/node -v 2>/dev/null || echo 'node absent'; uname -sr"],
    ['the version is read from the named tmux even when PATH has none (his Mac Pro)', () => versionFrom('tmux 3.7c\nDarwin 24.6.0'), 'tmux 3.7c'],
    ['no version line reads null', () => versionFrom('Darwin 24.6.0'), null],
    ['node is found BESIDE the named tmux when P3201_REAL_NODE is unset (his Mac Pro)', () => farNodeOf({ P3201_REAL_TMUX: '/usr/local/bin/tmux' }), { path: '/usr/local/bin/node', from: 'beside P3201_REAL_TMUX' }],
    ['P3201_REAL_NODE wins when it is set', () => farNodeOf({ P3201_REAL_TMUX: '/usr/local/bin/tmux', P3201_REAL_NODE: '/opt/node/bin/node' }), { path: '/opt/node/bin/node', from: 'P3201_REAL_NODE' }],
    ['a P3201_REAL_NODE with a shell word is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_NODE: '/x;id' }, SOCK) !== null, true],
    ['a relative P3201_REAL_NODE is refused', () => realRefusal({ ...OK_ENV, P3201_REAL_NODE: 'node' }, SOCK) !== null, true],
    ['the facts carry the node the row names and where it came from', () => { const f = realMachineFromEnv({ ...OK_ENV, P3201_REAL_TMUX: '/usr/local/bin/tmux' }, SOCK); return [f.realNode, f.realNodeFrom]; }, ['/usr/local/bin/node', 'beside P3201_REAL_TMUX']],
    ['a node version line is read, and "node absent" is not one', () => [nodeVersionFrom('tmux 3.7c\nv22.16.0\nDarwin 24.6.0'), nodeVersionFrom('tmux 3.7c\nnode absent\nDarwin 24.6.0')], ['v22.16.0', null]],
    ['the census runs under /bin/sh and names only the three dotfiles and .zcompdump', () => [censusCommand().startsWith("/bin/sh -c 'cd \"$HOME\""), /\.zsh_history \.bash_history \.zshrc/.test(censusCommand()), /cat |head |tail |less |grep /.test(censusCommand())], [true, true, false]],
    ['the census is read: sizes and times, absent, zcompdump printed, done', () => censusFrom('.zsh_history 34825 1788301518\n.bash_history absent\n.zshrc 812 1780000000\nprint .zcompdump-host-5.9 49152 1781000000\ncensus-done\n'), { files: { '.zsh_history': '34825 1788301518', '.bash_history': 'absent', '.zshrc': '812 1780000000' }, printed: { '.zcompdump-host-5.9': '49152 1781000000' }, done: true }],
    ['a census whose modified time moved is named (the first attempt\'s real-row defect)', () => dotfilesMoved(censusFrom('.zsh_history 34825 1788301518\n.bash_history absent\n.zshrc 812 1\ncensus-done'), censusFrom('.zsh_history 34825 1790766685\n.bash_history absent\n.zshrc 812 1\ncensus-done')), ['.zsh_history']],
    ['an unchanged census moves nothing, and a changed zcompdump is printed only', () => dotfilesMoved(censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4\nprint .zcompdump 5 6\ncensus-done'), censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4\nprint .zcompdump 7 8\ncensus-done')), []],
    ['a file that appeared is named', () => dotfilesMoved(censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4\ncensus-done'), censusFrom('.zsh_history 1 2\n.bash_history 10 11\n.zshrc 3 4\ncensus-done')), ['.bash_history']],
    ['a census that did not finish moves every name, because nothing was proved', () => dotfilesMoved(censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4\ncensus-done'), censusFrom('.zsh_history 1 2')), ['.zsh_history', '.bash_history', '.zshrc']],
    ['a FIRST census that did not finish moves every name too, even when the second reads the same', () => dotfilesMoved(censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4'), censusFrom('.zsh_history 1 2\n.bash_history absent\n.zshrc 3 4\ncensus-done')), ['.zsh_history', '.bash_history', '.zshrc']],
    ['this Mac\'s census reads the same shape as the far one, over a scratch home', () => localCensusDry(), { same: true, moved: ['.zshrc'] }],
    ['a moved census fails the run with one sentence naming the file, and an unmoved one says nothing', () => [starts(dotfilesSentence('the far machine', ['.zsh_history'], { files: { '.zsh_history': '1 2' } }, { files: { '.zsh_history': '1 3' } })), dotfilesSentence('this Mac', [], null, null)], ['the size or modified time of .zsh_history in his home on the far machine'.slice(0, 40), null]],
    ['the census RUN by /bin/sh and zsh over a scratch HOME reads, and sees a touch', () => censusDryRun(), { same: true, first: { '.zsh_history': '5 1700000000', '.bash_history': 'absent', '.zshrc': '3 1700000100' }, printed: ['.zcompdump-x'], moved: ['.zsh_history'] }],
    ['the wrapper and the proof RUN against a local scratch tmux: /bin/sh, the run\'s zdot, the socket inside; a plain wrapper is refused; the teardown ends it', () => liveLocalProof(), { proved: null, plainRefused: true, removed: true, left: 0 }],
    ['a copy goes under bin, mode 0600', () => copyInCommand(DIR, 'recorder.mjs'), 'cat > /tmp/p3201-4242/bin/recorder.mjs && chmod 600 /tmp/p3201-4242/bin/recorder.mjs && echo copied'],
    ['a copy of a name with a slash is refused', () => { try { copyInCommand(DIR, '../x'); return 'composed'; } catch { return 'refused'; } }, 'refused'],
    ['the machine row names the wrapper and no port', () => machineRow({ id: 'p320real', host: 'h', user: 'u', farDir: DIR }), { id: 'p320real', label: 'p3201 real machine', host: 'h', user: 'u', remoteTmuxPath: '/tmp/p3201-4242/bin/tmux' }],
    ['the app\'s control path is the ONE entry new since launch', () => appControlPath(['/t/a'], ['/t/a', '/t/m-abc']), '/t/m-abc'],
    ['two new entries name nothing', () => appControlPath([], ['/t/a', '/t/b']), null],
    ['quoting leaves a plain word and quotes a format', () => [quoteArg('-L'), quoteArg('#{pid}'), quoteArg("a'b")], ['-L', "'#{pid}'", "'a'\\''b'"]],
    // The fix round: zsh's EQUALS and tilde expansion act on a word's FIRST
    // character, so a tmux target `=name:` and a `~` path are quoted, and an
    // assignment keeps its bare `=`.
    ['quoting a word that begins with = or ~, and not an assignment', () => [quoteArg('=rec-none:'), quoteArg('~/x'), quoteArg('HISTFILE=/dev/null'), quoteArg('a=b=c')], ["'=rec-none:'", "'~/x'", 'HISTFILE=/dev/null', 'a=b=c']]
  ];
  let ok = true;
  for (const [label, run, want] of cases) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = JSON.stringify(got) === JSON.stringify(want);
    ok = ok && good;
    process.stdout.write(`[p3201-real] ${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}\n`);
  }
  // THE TREE NAMES NO HOST. The one host this row has reached is named by the
  // person every run; a literal of it in this file would be a default.
  const own = readFileSync(new URL(import.meta.url), 'utf8');
  const named = /\.ts\.net\b/.test(own.replace(/far-box\.example\.ts\.net/g, ''));
  process.stdout.write(`[p3201-real] ${named ? 'BAD ' : 'ok  '} this file names no real host: ${String(!named)}\n`);
  ok = ok && !named;
  process.stdout.write(`[p3201-real] ${ok ? `self-test PASS: ${String(cases.length + 1)} fixtures` : 'self-test FAIL'}\n`);
  return ok;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]) && process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}
