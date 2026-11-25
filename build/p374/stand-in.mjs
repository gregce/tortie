#!/usr/bin/env node
/**
 * build/p374/stand-in.mjs — the `agy` Phase 374's probe launches, and a
 * stand-in SpecStory beside it. It is NOT an agent and runs none: no vendor
 * process starts, nothing is signed in, no host is named and no token is spent
 * (build/p374/SPEC.md §0, §8).
 *
 * ## Why it is a Mach-O file
 *
 * Tortie puts its flag only in front of an `agy` whose file is a program and
 * not a script, and whose real file is called `agy` (D6). `build/p321`'s shape,
 * a `/bin/bash` wrapper that `exec -a`s node, reads as a SCRIPT there, so a
 * probe that used it would only ever read the refusal. {@link buildAgy}
 * compiles a small launcher with `/usr/bin/clang` that execs this node on this
 * file under the program name `agy`, which `ps` reads as `agy` in both its
 * spellings (measured on 2026-11-24), as the real one does. It hands its argv
 * over by a file of its folder, so no command line names the app's profile. The wrapper SCRIPT
 * is still written, as the arm that must be refused.
 *
 * ## What it answers first
 *
 *   --version, -v, -V    the text of `<dir>/version`, after `<dir>/version-delay`
 *                        milliseconds, and one line in `versions.jsonl`
 *   --help               exit 0
 *   anything else with no terminal on stdout   exit 0 at once
 *
 * ## `--settings`, as agy treats it (research 146 §6.2, §16)
 *
 * In `--settings X`, `--settings=X`, `-settings X` and `-settings=X`, the last
 * one winning. X is inline JSON or a file holding it. An UNKNOWN TOP LEVEL KEY
 * ends it at once with exit 1; a value that is not a JSON object does too; an
 * unknown key inside `statusLine` does not. A version below 1.4.10 does not
 * know the flag and ends with exit 2, as a Go program does.
 *
 * ## The status line, as agy runs it (research 146 §6.3, §6.6)
 *
 * `/bin/sh -c <command>` with the payload on standard input, closed after it.
 * A run in flight when the next starts is ended by SIGKILL to the `sh` ALONE.
 * A run over 5 s is ended the same way and is a FAILURE, and so is a non zero
 * exit: a failure draws a `Statusline Error` block that stays in the
 * conversation. Output adds a row. An empty output and exit 0 draws nothing.
 * `setsid` runs it as a session leader of its own, the second flavour, which is
 * the shape Tortie's status reading counts as a tool.
 *
 * ## How it is told
 *
 * It writes `hello-<pid>.json` into its folder when it starts, reads
 * `cmd-<pid>.json` there every 40 ms (`{ seq, ops }`, each new `seq` once and
 * in order) and writes `state-<pid>.json` after each. Every run is a line of
 * `runs-<pid>.jsonl`. The ops:
 *
 *   { op: 'replay', recording, from, to, everyMs, setsid, email }
 *        the committed recording's runs `from` to `to`, rebased onto now
 *        (build/p374/make-fixtures.mjs), one every `everyMs`; `email` signs in
 *        as somebody else, `null` signs out
 *   { op: 'payload', payload, raw, setsid, close }
 *        one run of exactly that
 *   { op: 'burst', count, everyMs, setsid }
 *        the last payload again `count` times, its countdown moving
 *   { op: 'hold', ms, setsid }
 *        one run whose standard input stays open for `ms`, then ended as the
 *        next run would end it: a run that is certainly alive when a poll comes
 *   { op: 'modes', everyMs }   the 15 bytes agy writes at rest
 *   { op: 'repaint' }          the screen again, its error blocks with it
 *   { op: 'conversation', id } make `brain/<id>` under the scratch HOME and
 *        hold it open, which is how Tortie learns which conversation it is
 *   { op: 'exit', code }       leave
 *
 * `<dir>/keep-args`, a file, makes the next starts show their whole argv to `ps`.
 * `<dir>/start.json`, `{ exit, afterMs, onlyWithSettings }`, makes it end by
 * itself after a start, which is what the launch guard is graded on.
 *
 * ## What it never does
 *
 * It opens no socket, runs no program but `/bin/sh -c` of the command it was
 * handed, and reads nothing but its own folder, the committed screens and
 * recordings, a file `--settings` names, and nothing under any home but the
 * scratch one it is given: it REFUSES to write a conversation folder when HOME
 * is the account's own. Every process it started is ended by pid in its
 * `finally`. It ends on SIGHUP, SIGTERM or SIGINT, when its folder is removed,
 * or after `P374_STANDIN_CEILING_MS`.
 *
 * Importing it runs nothing; the probe imports its builders and its readers.
 */

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { idleScreensFor, loadScreen } from '../p321/stand-in.mjs';
import { OTHER, PERSON, readRecording, rebase } from './make-fixtures.mjs';

export const STANDIN_PATH = fileURLToPath(import.meta.url);
const ESC = '\u001b';
const J = JSON.stringify;

/** The floor (D6), by value: never imported from src/. */
export const FLOOR = '1.4.10';
/** The version a probe's stand-in reads unless an arm says otherwise. */
export const GOOD_VERSION = '1.6.0';
/** agy's own two bounds (research 146 §6.6). */
export const OVERLAP_MS = 300;
export const RUN_TIMEOUT_MS = 5_000;
/** The top level keys the stand-in's `--settings` knows, beside `statusLine`. */
const KNOWN_KEYS = new Set(['statusLine', 'model', 'theme']);

const triple = (t) => {
  const m = /(?<![\d.])(\d+)\.(\d+)\.(\d+)/.exec(String(t ?? ''));
  return m === null ? null : m.slice(1, 4).map(Number);
};
/** Whether a version text is at or above the floor; an unreadable one is not. */
export function atFloor(text) {
  const v = triple(text);
  const f = triple(FLOOR);
  if (v === null) return false;
  for (let i = 0; i < 3; i += 1) if (v[i] !== f[i]) return v[i] > f[i];
  return true;
}

// ---------------------------------------------------------------------------
// What a probe builds
// ---------------------------------------------------------------------------

const cString = (s) => {
  if (!/^[\x20-\x7e]*$/.test(s)) throw new Error('p374 stand-in: a path that is not plain ASCII');
  return `"${s.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
};

/**
 * Compile the launcher as `out`, whose last segment must be the name it runs
 * under. `stamp` makes two builds two different files; the file appears by
 * rename, so a replaced `agy` is a new inode, as an update is.
 */
export function buildAgy({ out, dir, node = process.execPath, stamp = '1', as = 'agy', flavour = '' }) {
  mkdirSync(dirname(out), { recursive: true });
  const c = `${out}.${String(process.pid)}.c`;
  const tmp = `${out}.${String(process.pid)}.new`;
  const args = [as, STANDIN_PATH, '--p374-dir', dir, ...(flavour === '' ? [] : ['--p374-flavour', flavour])];
  writeFileSync(
    c,
    [
      '#include <fcntl.h>',
      '#include <stdio.h>',
      '#include <stdlib.h>',
      '#include <string.h>',
      '#include <unistd.h>',
      `__attribute__((used)) static const char stamp[] = ${cString(`p374 stamp ${stamp}`)};`,
      'int main(int argc, char **argv) {',
      // The argv goes by a file: a spliced one names a path inside the app's profile, and build/electron-run.mjs
      // ends, at a launch's teardown, whatever process's command line names that profile. A real agy outlives the app.
      '  char file[2048];',
      `  snprintf(file, sizeof file, "%s/args-%d", ${cString(dir)}, (int)getpid());`,
      '  int fd = open(file, O_CREAT | O_TRUNC | O_WRONLY, 0600);',
      '  for (int i = 1; fd >= 0 && i < argc; i += 1) if (write(fd, argv[i], strlen(argv[i]) + 1) < 0) return 71;',
      '  if (fd >= 0) close(fd);',
      `  static const char *head[] = { ${args.map(cString).join(', ')} };`,
      `  int n = ${String(args.length)};`,
      '  char **a = calloc((size_t)(n + argc + 3), sizeof(char *));',
      '  if (a == 0) return 70;',
      '  for (int i = 0; i < n; i += 1) a[i] = (char *)head[i];',
      '  a[n] = "--p374-args"; a[n + 1] = file;',
      // But where `keep-args` stands the command line holds the person's own words too, as a real agy's does. The
      // program reads the file and never these. For a session its own arm ends before the launch's teardown.
      `  if (access(${cString(join(dir, 'keep-args'))}, F_OK) == 0) for (int i = 1; i < argc; i += 1) a[n + 1 + i] = argv[i];`,
      `  return execv(${cString(node)}, a);`,
      '}',
      ''
    ].join('\n')
  );
  const r = spawnSync('/usr/bin/clang', ['-O1', '-o', tmp, c], { encoding: 'utf8', timeout: 60_000 });
  spawnSync('/bin/rm', ['-f', c]);
  if (r.status !== 0) return { ok: false, said: `clang answered ${String(r.status)}: ${String(r.stderr ?? r.error?.message ?? '').slice(0, 300)}` };
  chmodSync(tmp, 0o755);
  renameSync(tmp, out);
  return { ok: true, said: out };
}

/** The wrapper SCRIPT, `build/p321`'s shape: the file D6 must refuse. */
export function writeScriptAgy({ out, dir, node = process.execPath }) {
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.${String(process.pid)}.new`;
  writeFileSync(tmp, `#!/bin/bash\nexec -a agy ${J(node)} ${J(STANDIN_PATH)} --p374-dir ${J(dir)} "$@"\n`, { mode: 0o755 });
  renameSync(tmp, out);
  return out;
}

/** The version a stand-in of `dir` reads, and how long it takes to say it. */
export function setVersion(dir, text, delayMs = 0) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'version'), `${text}\n`);
  writeFileSync(join(dir, 'version-delay'), `${String(delayMs)}\n`);
}

/**
 * A stand-in SpecStory: it names its version, lists its providers the way the
 * real one does when it is asked for one it does not have, and `run` execs the
 * command it was handed. Everything else exits 0 and says nothing.
 */
export function writeSpecstory(out, log) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    [
      '#!/bin/sh',
      '# build/p374: a stand-in SpecStory. It captures nothing and sends nothing.',
      `printf '%s\\n' "$*" >>${J(log)}`,
      'case "$1" in',
      '  list)',
      "    printf 'Provider %s is not a valid provider.\\nThe registered providers are:\\n  - antigravity - Antigravity CLI\\n  - claude - Claude Code\\n' \"$2\" >&2",
      '    exit 1 ;;',
      '  run)',
      '    while [ $# -gt 0 ]; do',
      '      if [ "$1" = -c ]; then exec /bin/sh -c "exec $2"; fi',
      '      shift',
      '    done',
      '    exit 2 ;;',
      'esac',
      'for a in "$@"; do [ "$a" = --version ] && printf \'2.99.0 (SpecStory)\\n\'; done',
      'exit 0',
      ''
    ].join('\n'),
    { mode: 0o755 }
  );
  return out;
}

// ---------------------------------------------------------------------------
// What a probe reads
// ---------------------------------------------------------------------------

const jsonl = (path) => {
  try {
    return readFileSync(path, 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};
const json = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};
/** Every stand-in that started in `dir`, oldest first. */
export function hellos(dir) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => /^hello-\d+\.json$/.test(n))
    .map((n) => json(join(dir, n)))
    .filter((h) => h !== null)
    .sort((a, b) => a.at - b.at);
}
export const runsOf = (dir, pid) => jsonl(join(dir, `runs-${String(pid)}.jsonl`));
export const stateOf = (dir, pid) => json(join(dir, `state-${String(pid)}.json`));
export const versionCalls = (dir) => jsonl(join(dir, 'versions.jsonl'));
let seqs = 0;
/** Hand one stand-in its next ops; answers the seq `stateOf` will carry. */
export function tell(dir, pid, ops) {
  seqs += 1;
  const tmp = join(dir, `cmd-${String(pid)}.tmp`);
  writeFileSync(tmp, J({ seq: seqs, ops }));
  renameSync(tmp, join(dir, `cmd-${String(pid)}.json`));
  return seqs;
}

// ---------------------------------------------------------------------------
// The argv, read the way agy reads it
// ---------------------------------------------------------------------------

/** Every `--settings` value of an argv, in all four spellings, in order. */
export function settingsValues(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    const m = /^--?settings(?:=(.*))?$/s.exec(argv[i]);
    if (m === null) continue;
    if (m[1] !== undefined) out.push(m[1]);
    else if (i + 1 < argv.length) {
      out.push(argv[i + 1]);
      i += 1;
    } else out.push(null);
  }
  return out;
}

/**
 * What agy does with them: `{ ok: true, statusLine }` or `{ ok: false, exit,
 * said }`. Pure but for the one file a value may name.
 */
export function readSettings(argv, version) {
  const values = settingsValues(argv);
  if (values.length === 0) return { ok: true, statusLine: null };
  if (!atFloor(version)) return { ok: false, exit: 2, said: 'flags provided but not defined: -settings' };
  const value = values[values.length - 1];
  let text = value ?? '';
  if (!text.trimStart().startsWith('{')) {
    try {
      text = readFileSync(text, 'utf8');
    } catch {
      return { ok: false, exit: 1, said: 'could not read settings' };
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, exit: 1, said: 'invalid settings' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, exit: 1, said: 'invalid settings' };
  const unknown = Object.keys(parsed).filter((k) => !KNOWN_KEYS.has(k));
  if (unknown.length > 0) return { ok: false, exit: 1, said: `unknown setting ${unknown[0]}` };
  return { ok: true, statusLine: parsed.statusLine ?? null, keys: Object.keys(parsed) };
}

// ---------------------------------------------------------------------------
// The stand-in itself
// ---------------------------------------------------------------------------

async function standIn(own, argv) {
  const dir = own.dir;
  const version = (() => {
    try {
      return readFileSync(join(dir, 'version'), 'utf8').trim();
    } catch {
      return GOOD_VERSION;
    }
  })();
  if (argv.length === 1 && /^(--version|-v|-V)$/.test(argv[0])) {
    const delay = Number(readFileSync(join(dir, 'version-delay'), 'utf8').trim()) || 0;
    appendFileSync(join(dir, 'versions.jsonl'), `${J({ at: Date.now(), pid: process.pid, said: version, exe: own.flavour })}\n`);
    if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 9_000)));
    process.stdout.write(`${version}\n`);
    return 0;
  }
  if (argv.includes('--help')) return 0;
  /** One origin for every replay of this process, so a reset that stayed put stays put. */
  const origin = Date.now();
  const settings = readSettings(argv, version);
  const hello = {
    pid: process.pid,
    ppid: process.ppid,
    at: Date.now(),
    argv,
    flavour: own.flavour,
    version,
    cwd: process.cwd(),
    tty: process.stdout.isTTY === true,
    session: process.env['GMUX_SESSION_ID'] ?? null,
    managed: process.env['GMUX_MANAGED'] ?? null,
    pane: process.env['TMUX_PANE'] ?? null,
    origin,
    settings: settings.ok ? { keys: settings.keys ?? [], statusLine: settings.statusLine } : { refused: settings.said }
  };
  writeFileSync(join(dir, `hello-${String(process.pid)}.json`), J(hello));
  if (!settings.ok) {
    process.stderr.write(`agy: ${settings.said}\n`);
    return settings.exit;
  }
  if (!process.stdout.isTTY) return 0;

  const command = settings.statusLine !== null && typeof settings.statusLine?.command === 'string' && settings.statusLine.command !== '' ? settings.statusLine.command : null;
  const runsFile = join(dir, `runs-${String(process.pid)}.jsonl`);
  const cmdFile = join(dir, `cmd-${String(process.pid)}.json`);
  const started = [];
  const timers = new Set();
  const held = [];
  const blocks = [];
  let seq = 0;
  let runN = 0;
  let inFlight = null;
  let pending = 0;
  let last = null;
  let email = PERSON;
  let modes = null;
  let exitWith = 0;
  let finish = () => undefined;
  const finished = new Promise((r) => {
    finish = r;
  });
  const later = (ms, f) => {
    const t = setTimeout(() => {
      timers.delete(t);
      f();
    }, ms);
    timers.add(t);
    return t;
  };

  const screen = (() => {
    const { idle } = idleScreensFor('antigravity');
    const rows = idle === null ? null : loadScreen(idle);
    return rows ?? ['agy stand-in', '', '> '];
  })();
  function paint() {
    const cols = process.stdout.columns ?? 80;
    const rows = [...screen, ...blocks].slice(-(process.stdout.rows ?? 24));
    process.stdout.write(`${ESC}[H${ESC}[2J${rows.map((r) => [...String(r)].slice(0, Math.max(1, cols - 1)).join('')).join('\r\n')}`);
  }
  function writeState() {
    try {
      const live = started.filter((s) => s.live);
      writeFileSync(join(dir, `state-${String(process.pid)}.json`), J({ seq, runs: runN, pending, inFlight: inFlight !== null, errorBlocks: blocks.length, live: live.length, pids: live.map((s) => s.child.pid), at: Date.now() }));
    } catch {
      /* the folder went away; the poll ends this */
    }
  }

  /** One run, exactly as agy makes one. */
  function run(text, { setsid = false, close = true } = {}) {
    if (command === null) return null;
    if (inFlight !== null) {
      inFlight.killedByNext = true;
      try {
        // THE SH ALONE (146 §6.6): its children, if it has any, are left alive, which is the attack.
        process.kill(inFlight.child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    runN += 1;
    const me = { n: runN, at: Date.now(), live: true, killedByNext: false, timedOut: false, out: 0, err: 0, child: null };
    // Not `detached` for the ordinary flavour. The second flavour leads a session of its own.
    const child = spawn('/bin/sh', ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'], detached: setsid });
    me.child = child;
    started.push(me);
    inFlight = me;
    const killer = later(RUN_TIMEOUT_MS, () => {
      me.timedOut = true;
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    });
    child.stdout.on('data', (b) => (me.out += b.length));
    child.stderr.on('data', (b) => (me.err += b.length));
    child.stdin.on('error', () => undefined);
    child.on('error', () => undefined);
    child.on('exit', (code, signal) => {
      me.live = false;
      clearTimeout(killer);
      timers.delete(killer);
      if (inFlight === me) inFlight = null;
      const failed = me.timedOut || (code !== null && code !== 0);
      const ms = Date.now() - me.at;
      let said = false;
      // Once its outputs have closed, so no byte is missed, and 500 ms after the end whatever still holds them.
      const report = () => {
        if (said) return;
        said = true;
        // A kill that landed on a run already over ended nothing: the run's own code says which it was.
        appendFileSync(runsFile, `${J({ n: me.n, at: me.at, ms, code, signal, out: me.out, err: me.err, killedByNext: me.killedByNext && signal === 'SIGKILL' && !me.timedOut, timedOut: me.timedOut, setsid })}\n`);
        if (failed) blocks.push('Statusline Error', `  exit ${String(code)}`);
        if (failed || me.out > 0) paint();
        writeState();
      };
      child.on('close', report);
      later(500, report);
    });
    child.stdin.write(text);
    if (close) child.stdin.end();
    return me;
  }

  function send(payload, opts = {}) {
    last = payload;
    run(J(payload), opts);
  }

  function apply(op) {
    if (op?.op === 'replay') {
      if (op.email !== undefined) email = op.email === 'other' ? OTHER : op.email;
      const lines = readRecording(op.recording ?? 'launch').slice((op.from ?? 1) - 1, op.to ?? undefined);
      pending += lines.length;
      lines.forEach((line, i) =>
        later(i * (op.everyMs ?? OVERLAP_MS), () => {
          pending -= 1;
          const p = rebase(line, origin);
          if (p.email !== undefined) {
            if (email === null) delete p.email;
            else p.email = email;
          }
          send(p, { setsid: op.setsid === true });
          writeState();
        })
      );
    } else if (op?.op === 'payload') {
      if (op.raw !== undefined) run(String(op.raw), { setsid: op.setsid === true, close: op.close !== false });
      else send(op.payload, { setsid: op.setsid === true, close: op.close !== false });
    } else if (op?.op === 'burst') {
      pending += op.count;
      for (let i = 0; i < op.count; i += 1) {
        later(i * (op.everyMs ?? OVERLAP_MS), () => {
          pending -= 1;
          if (last === null) last = rebase(readRecording('launch')[41], origin);
          const p = JSON.parse(J(last));
          for (const b of Object.values(p.quota ?? {})) b.reset_in_seconds = Math.max(0, Math.floor((Date.parse(b.reset_time) - Date.now()) / 1000));
          send(p, { setsid: op.setsid === true });
          writeState();
        });
      }
    } else if (op?.op === 'hold') {
      if (last === null) last = rebase(readRecording('launch')[41], origin);
      const me = run(J(last), { setsid: op.setsid === true, close: false });
      if (me === null) return;
      pending += 1;
      later(Math.min(Number(op.ms) || 0, RUN_TIMEOUT_MS - 500), () => {
        pending -= 1;
        // THE SH ALONE, as a next run ends it; whatever it left reading is let go with its input.
        if (me.live) {
          me.killedByNext = true;
          try {
            process.kill(me.child.pid, 'SIGKILL');
          } catch {
            /* already gone */
          }
        }
        me.child.stdin.destroy();
        writeState();
      });
    } else if (op?.op === 'modes') {
      if (modes !== null) clearInterval(modes);
      modes = op.everyMs > 0 ? setInterval(() => process.stdout.write(`${ESC}[?2004h${ESC}[>4;2m`), op.everyMs) : null;
    } else if (op?.op === 'repaint') {
      paint();
    } else if (op?.op === 'conversation') {
      const home = process.env['HOME'] ?? '';
      // NEVER THE ACCOUNT'S OWN HOME: this is agy's own folder, and only a scratch one is a stand-in's to make.
      if (home === '' || realpathSync(home) === realpathSync(userInfo().homedir) || !/^[0-9a-f-]{36}$/.test(String(op.id))) return;
      const brain = join(home, '.gemini', 'antigravity-cli', 'brain', op.id);
      mkdirSync(brain, { recursive: true });
      held.push(openSync(brain, 'r'));
    } else if (op?.op === 'exit') {
      exitWith = Number(op.code) || 0;
      finish();
    }
  }

  try {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => finish());
    process.stdout.on('resize', paint);
    paint();
    const start = json(join(dir, 'start.json'));
    if (start !== null && typeof start.exit === 'number' && (start.onlyWithSettings !== true || settingsValues(argv).length > 0)) {
      exitWith = start.exit;
      later(Math.max(0, Number(start.afterMs) || 0), () => finish());
    }
    later(Number(process.env['P374_STANDIN_CEILING_MS']) || 45 * 60_000, () => finish());
    const poll = setInterval(() => {
      if (!existsSync(dir)) return finish();
      const cmd = json(cmdFile);
      if (typeof cmd?.seq !== 'number' || cmd.seq <= seq) return undefined;
      seq = cmd.seq;
      for (const op of Array.isArray(cmd.ops) ? cmd.ops : []) apply(op);
      writeState();
      return undefined;
    }, 40);
    timers.add(poll);
    writeState();
    await finished;
  } finally {
    // EVERY RUN IT STARTED, BY PID, whatever happened: a `sh` that leads a session of its own outlives the hang-up.
    for (const s of started) {
      if (!s.live) continue;
      try {
        process.kill(s.child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    for (const t of timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    if (modes !== null) clearInterval(modes);
    // The shell's prompt begins on a row of its own, as it does after any program that leaves the screen as it drew it.
    try {
      process.stdout.write(`${ESC}[?2004l${ESC}[>4;0m\r\n`);
    } catch {
      /* the terminal is gone */
    }
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* the terminal is gone */
      }
    }
    process.stdin.pause();
  }
  return exitWith;
}

const isEntry = () => {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === pathToFileURL(realpathSync(STANDIN_PATH)).href;
  } catch {
    return false;
  }
};
if (isEntry()) {
  const argv = process.argv.slice(2);
  const own = { dir: '', flavour: '' };
  if (argv[0] === '--p374-dir') own.dir = resolve(argv.splice(0, 2)[1] ?? '');
  if (argv[0] === '--p374-flavour') own.flavour = argv.splice(0, 2)[1] ?? '';
  if (argv[0] === '--p374-args') {
    const file = argv.splice(0, 2)[1] ?? '';
    const held = readFileSync(file, 'utf8');
    rmSync(file, { force: true });
    // Whatever else the command line shows (`keep-args`) is the same words, and the file is what is read.
    argv.splice(0, argv.length, ...held.split('\0').slice(0, -1));
  }
  if (own.dir === '' || !existsSync(own.dir)) process.exit(0);
  standIn(own, argv)
    .catch(() => 0)
    .then((code) => process.exit(code));
}
