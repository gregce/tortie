#!/usr/bin/env node
/**
 * build/p346/argv-stand-in.mjs — the six agents `probe:p346` answers that are
 * not Claude Code or Codex (build/p346/SPEC.md §6.1). It is NOT an agent and
 * runs none. Behind a bare name a person's Tortie launches (`cursor-agent`,
 * `codewhale`, `muse`, `pi`, `omp`, `opencode`) it does three things:
 *
 *   1. It ANSWERS ITS ROW'S OWN VERSION PROBE. The probe reads every compiled
 *      launchable row's `versionProbe` from src/main/agents/registry.ts
 *      through the pinned tsx BEFORE the launch and writes it here as
 *      `identities.json`; a call whose arguments are that probe's `args` or
 *      `fallbackArgs`, or any call with no terminal on stdout, prints one line
 *      carrying the row's `identitySubstring` (when the row names one) and the
 *      words `p346 stand-in`, and exits 0. So Tortie's detection reads the row
 *      installed, as it would the real agent, and never something else
 *      wearing its name.
 *   2. It WRITES DOWN HOW IT WAS STARTED: one JSON file per process,
 *      `argv-<pid>.json`, holding its arguments (never the program token),
 *      its working folder, the NAMES of its environment (sorted) and NEVER A
 *      VALUE, its pid and parent pid, whether stdout was a terminal and the
 *      kind (`version` or `launch`). That file is the ground truth arm S2
 *      grades the manifest row's argv and cwd against: a start is read off
 *      what the process itself saw, never off main's report.
 *   3. In a terminal it DRAWS ONE PROMPT LINE and waits, reading and
 *      discarding what it is typed (counted, never logged), until SIGHUP,
 *      SIGTERM or SIGINT, until its directory is removed, or until a ceiling
 *      (`P346_STANDIN_CEILING_MS`, 45 minutes). It asks no question, so no
 *      session it runs in can read `needs_input` from it (arm S9).
 *
 * THE LOG-ONLY FORM, for Claude Code and Codex. `probe:p346` starts those two
 * as build/p318/stand-in.mjs (behind its own runner), and wraps each in a
 * script that first runs THIS file with `P346_LOG_ONLY=<the wrapper's pid>`:
 * it writes the same `argv-<pid>.json` under that pid (which is the runner's
 * pid after the wrapper's `exec`, so it names the p318 hello's `runnerPid`)
 * and exits at once, starting nothing.
 *
 * HOW IT IS LAUNCHED. `writeArgvWrappers` writes one `/bin/bash` script per
 * bare name: `exec -a <name> <node> argv-stand-in.mjs "$@"`, with the name and
 * the log folder in two `P346_` variables, so the pane's own program carries
 * the agent's bare name as its program token, exactly as a real one's does.
 * `writeLoggedWrappers` writes the Claude Code and Codex scripts around the
 * p318 runner. A real agent is never on the scratch PATH: the probe refuses to
 * start unless every bare name resolves to these scripts.
 *
 * WHAT IT NEVER DOES. It reads nothing but `identities.json`, writes nothing
 * but its own `argv-<pid>.json`, opens no socket, starts no process, logs no
 * environment VALUE and no byte it is typed.
 *
 *   node build/p346/argv-stand-in.mjs --self-test   its version answers, its
 *                                                   log and its refusals, run
 *                                                   over a scratch folder it
 *                                                   removes; no terminal
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const J = JSON.stringify;

/** This file, for the wrappers. */
export const ARGV_STANDIN_PATH = fileURLToPath(import.meta.url);
/** The six bare names this file stands behind (SPEC §6.1). */
export const ARGV_STANDIN_BINS = Object.freeze(['cursor-agent', 'codewhale', 'muse', 'pi', 'omp', 'opencode']);
/** The two bare names build/p318/stand-in.mjs stands behind, logged by this file first. */
export const LOGGED_BINS = Object.freeze(['claude', 'codex']);
/** The version line's marker, so a reader can tell a stand-in's answer from a real one. */
export const VERSION_MARK = 'p346 stand-in';
/** The default ceiling: the stand-in leaves on its own after this long. */
export const CEILING_MS = 45 * 60_000;

/** A bare name a wrapper may carry: no slash, no space, no quote. */
const plainName = (name) => /^[a-z][a-z0-9-]*$/.test(String(name));

/**
 * The version line a row's probe reads (SPEC §6.1): the row's
 * `identitySubstring` when it names one, else the bare name, then a version
 * and the stand-in mark. `extractVersion` reads the first line, or for
 * `strip-ansi-last-line` the last, and both are this one line.
 */
export function versionLineOf(bin, identity) {
  const id = typeof identity?.identitySubstring === 'string' && identity.identitySubstring !== '' ? identity.identitySubstring : `${bin} `;
  return `${id}0.0.0-p346 (${VERSION_MARK})`;
}

/** Whether `args` is exactly the row's version probe (`args` or `fallbackArgs`). */
export function isVersionProbe(args, identity) {
  const same = (a, b) => Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  return same(args, identity?.args) || same(args, identity?.fallbackArgs);
}

/**
 * The record one process writes about itself. `env` is the NAMES alone,
 * sorted; no value of any variable is ever read into it.
 */
export function startRecordOf({ pid, ppid, as, args, cwd, envNames, tty, kind, at }) {
  return { pid, ppid, as, args: [...args], cwd, env: [...envNames].sort(), tty: tty === true, kind, at };
}

/** Every record a folder holds, oldest first. */
export function readStartRecords(dir) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    if (!/^argv-\d+\.json$/.test(n)) continue;
    try {
      out.push(JSON.parse(readFileSync(join(dir, n), 'utf8')));
    } catch {
      /* half written; the next look has it */
    }
  }
  return out.sort((a, b) => Number(a.at) - Number(b.at));
}

/** Write `identities.json`: `{ <bare name>: { id, args, fallbackArgs, identitySubstring } }`. */
export function writeIdentities(dir, identities) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'identities.json');
  writeFileSync(path, `${J(identities, null, 1)}\n`, 'utf8');
  return path;
}

/**
 * The six wrappers on a scratch PATH folder. Each is `/bin/bash`, names its
 * agent as the program token (`exec -a`), and hands this file the log folder.
 * Answers `{ <bin>: path }`.
 */
export function writeArgvWrappers({ bin, logDir, node = process.execPath, bins = ARGV_STANDIN_BINS }) {
  mkdirSync(bin, { recursive: true });
  const out = {};
  for (const name of bins) {
    if (!plainName(name)) throw new Error(`argv-stand-in: ${J(name)} is not a plain bare name`);
    const path = join(bin, name);
    writeFileSync(
      path,
      [
        '#!/bin/bash',
        `# probe:p346. Not the real ${name}: build/p346/argv-stand-in.mjs under the bare name.`,
        `export P346_AS=${name}`,
        `export P346_ARGV_DIR=${J(logDir)}`,
        `exec -a ${name} ${J(node)} ${J(ARGV_STANDIN_PATH)} "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(path, 0o755);
    out[name] = path;
  }
  return out;
}

/**
 * Claude Code's and Codex's scripts around build/p318/stand-in.mjs's runner:
 * first this file in its log-only form (the wrapper's pid, which the runner
 * keeps after `exec`), then exactly what the p318 wrapper does.
 */
export function writeLoggedWrappers({ bin, logDir, runner, node = process.execPath, bins = LOGGED_BINS }) {
  mkdirSync(bin, { recursive: true });
  const out = {};
  for (const name of bins) {
    if (!plainName(name)) throw new Error(`argv-stand-in: ${J(name)} is not a plain bare name`);
    const path = join(bin, name);
    writeFileSync(
      path,
      [
        '#!/bin/bash',
        `# probe:p346. Not the real ${name}: its argv written down, then build/p318/stand-in.mjs under the bare name.`,
        `P346_AS=${name} P346_ARGV_DIR=${J(logDir)} P346_LOG_ONLY=$$ ${J(node)} ${J(ARGV_STANDIN_PATH)} "$@"`,
        `exec -a ${name} /bin/bash ${J(runner)} ${name} "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(path, 0o755);
    out[name] = path;
  }
  return out;
}

/** Read this run's identities, or an empty table. */
function identitiesIn(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'identities.json'), 'utf8'));
  } catch {
    return {};
  }
}

/** The stand-in itself. Answers its exit code. */
async function standIn() {
  const as = process.env['P346_AS'] ?? '';
  const dir = process.env['P346_ARGV_DIR'] ?? '';
  const args = process.argv.slice(2);
  const logOnly = process.env['P346_LOG_ONLY'] ?? '';
  const tty = process.stdout.isTTY === true;
  const identity = identitiesIn(dir)[as] ?? null;
  const version = isVersionProbe(args, identity) || args.includes('--version') || (!tty && logOnly === '');
  const pid = logOnly !== '' && /^\d+$/.test(logOnly) ? Number(logOnly) : process.pid;
  const ppid = logOnly !== '' ? null : process.ppid;
  if (dir !== '' && existsSync(dir) && plainName(as)) {
    // NAMES ONLY: `Object.keys`, never a value.
    const envNames = Object.keys(process.env);
    // A version call is one with no terminal or the row's own probe; a launch is in a pane.
    const kind = logOnly !== '' ? (tty && !isVersionProbe(args, identity) && !args.includes('--version') ? 'launch' : 'version') : version ? 'version' : 'launch';
    const record = startRecordOf({ pid, ppid, as, args, cwd: process.cwd(), envNames, tty, kind, at: Date.now() });
    try {
      // One file per process; a log-only record and its runner never collide.
      writeFileSync(join(dir, `argv-${String(pid)}.json`), J(record));
    } catch {
      /* the folder went; nothing else is written anywhere */
    }
  }
  if (logOnly !== '') return 0;
  if (args.includes('--help') || args.includes('-h')) return 0;
  if (version) {
    process.stdout.write(`${versionLineOf(as, identity)}\n`);
    return 0;
  }
  const ceilingMs = Math.max(60_000, Number(process.env['P346_STANDIN_CEILING_MS'] ?? '') || CEILING_MS);
  let typed = 0;
  let finish = () => undefined;
  const finished = new Promise((r) => {
    finish = r;
  });
  const timers = [];
  try {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      // Counted, never kept and never logged.
      process.stdin.on('data', (b) => {
        typed += b.length;
      });
    }
    process.stdout.write(`\u001b[H\u001b[2J${as} (${VERSION_MARK}) in ${process.cwd()}\r\n› `);
    for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => finish());
    timers.push(setTimeout(() => finish(), ceilingMs));
    timers.push(
      setInterval(() => {
        if (dir === '' || !existsSync(dir)) finish();
      }, 1_000)
    );
    await finished;
  } finally {
    for (const t of timers) {
      clearTimeout(t);
      clearInterval(t);
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
  void typed;
  return 0;
}

/**
 * The self-test: this file run as its six wrappers would run it, with no
 * terminal, over a scratch folder it removes in a `finally`. Every clause is
 * shown to hold, and the record is shown to carry NAMES and never a value.
 */
function selfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const root = mkdtempSync(join(tmpdir(), 'p346-argv-'));
  try {
    const logDir = join(root, 'log');
    const bin = join(root, 'bin');
    mkdirSync(logDir, { recursive: true });
    writeIdentities(logDir, { omp: { id: 'omp', args: ['--version'], identitySubstring: 'omp/' }, pi: { id: 'pi', args: ['-v'] } });
    const wrappers = writeArgvWrappers({ bin, logDir });
    say(J(Object.keys(wrappers).sort()) === J([...ARGV_STANDIN_BINS].sort()), 'six wrappers, one per bare name');
    const text = readFileSync(wrappers.omp, 'utf8');
    say(text.includes('exec -a omp ') && text.startsWith('#!/bin/bash\n'), 'a wrapper names its agent as the program token');
    const canary = `p346-secret-${String(process.pid)}`;
    const run = (name, args) => spawnSync('/bin/bash', [wrappers[name], ...args], { encoding: 'utf8', timeout: 20_000, cwd: root, env: { ...process.env, P346_SELF_TEST_VALUE: canary } });
    const omp = run('omp', ['--version']);
    say(omp.status === 0 && omp.stdout.trim() === 'omp/0.0.0-p346 (p346 stand-in)', `omp --version answers its row's identity (${J(omp.stdout.trim())})`);
    const pi = run('pi', ['-v']);
    say(pi.status === 0 && pi.stdout.trim().startsWith('pi 0.0.0-p346') && pi.stdout.includes(VERSION_MARK), 'pi -v answers with its bare name, the version and the mark');
    const muse = run('muse', ['--model', 'x', 'a b']);
    say(muse.status === 0 && muse.stdout.includes(VERSION_MARK), 'a launch with no terminal answers the version line and leaves at once');
    const records = readStartRecords(logDir);
    say(records.length === 3, `one record per process (${String(records.length)})`);
    const museRec = records.find((r) => r.as === 'muse');
    say(museRec !== undefined && J(museRec.args) === J(['--model', 'x', 'a b']) && realpathSync(museRec.cwd) === realpathSync(root), 'the record holds the arguments whole and the working folder');
    say(museRec !== undefined && museRec.env.includes('P346_SELF_TEST_VALUE') && museRec.env.includes('P346_AS'), 'the record names the environment');
    const all = readdirSync(logDir).map((n) => readFileSync(join(logDir, n), 'utf8')).join('\n');
    say(!all.includes(canary), 'no environment VALUE is in any record');
    say(records.every((r) => r.kind === 'version' && r.tty === false), 'a call with no terminal is recorded as a version call');
    // The log-only form, as the Claude Code and Codex scripts run it.
    const runner = join(root, 'runner.sh');
    writeFileSync(runner, '#!/bin/bash\necho "runner $1"\n', 'utf8');
    chmodSync(runner, 0o755);
    const logged = writeLoggedWrappers({ bin, logDir, runner });
    const c = spawnSync('/bin/bash', [logged.claude, '--settings', '/x.json'], { encoding: 'utf8', timeout: 20_000, cwd: root });
    say(c.status === 0 && c.stdout.trim() === 'runner claude', 'the logged wrapper hands on to the runner, which prints its agent');
    const cRec = readStartRecords(logDir).find((r) => r.as === 'claude');
    say(cRec !== undefined && J(cRec.args) === J(['--settings', '/x.json']) && cRec.ppid === null && Number.isInteger(cRec.pid), 'the logged wrapper records the arguments under the wrapper\'s own pid');
    let refused = false;
    try {
      writeArgvWrappers({ bin, logDir, bins: ['bad name'] });
    } catch {
      refused = true;
    }
    say(refused, 'a bare name that is not plain is refused');
    say(versionLineOf('opencode', null) === 'opencode 0.0.0-p346 (p346 stand-in)', 'versionLineOf with no identity names the bin');
    say(isVersionProbe(['-V'], { args: ['--version'], fallbackArgs: ['-V'] }) && !isVersionProbe(['--model'], { args: ['--version'] }), 'isVersionProbe reads args and fallbackArgs exactly');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  process.stdout.write(failures === 0 ? '[p346 argv-stand-in] self-test PASS\n' : `[p346 argv-stand-in] self-test FAIL: ${String(failures)}\n`);
  return failures === 0;
}

/** This file run as the entry point, however the path that named it was spelled. */
function isEntry() {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  } catch {
    return false;
  }
}

if (isEntry()) {
  if (process.argv[2] === '--self-test' && (process.env['P346_AS'] ?? '') === '') process.exit(selfTest() ? 0 : 1);
  standIn()
    .then((code) => process.exit(code))
    .catch(() => process.exit(0));
}
