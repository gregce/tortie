/**
 * ssh-run.mjs. One helper owns every ssh a script under build/ starts, so no
 * run of this harness can put a line in the person's ~/.ssh/known_hosts
 * (Phase 193).
 *
 * ## The defect this closes, and it is measured rather than supposed
 *
 * `~/.ssh/known_hosts` on the operator's Mac measures 2,120 bytes and holds
 * three entries for 127.0.0.1. CLAUDE.md records the same file at 932 bytes
 * before a probe run during the machines work and 1,229 after, which is a
 * growth of 297 bytes. One loopback entry is 99 bytes, measured against a
 * scratch sshd on 2026-09-01, and three of them is exactly 297. So a run of
 * this harness leaving lines in that file is a shape that has already happened
 * once.
 *
 * The product side was fixed and gated: `src/main/machines/ssh.ts` carries
 * `StrictHostKeyChecking=yes` with its own record file, and
 * `npm run conformance:machines` fails if the connection test's argv stops
 * naming Tortie's own file first. The harness had no such gate, and eighteen
 * scripts each carried the option by hand. The nineteenth is the one nobody
 * would notice.
 *
 * ## Why a helper rather than nineteen careful call sites
 *
 * The same reason `build/electron-run.mjs` owns every Electron launch. A
 * guarantee that lives in one function can be read by a gate in one place. A
 * guarantee spread across nineteen call sites has to be re-audited every time
 * anybody adds a twentieth, and that audit is a person remembering.
 *
 * **It fails closed, and that is the whole design.** `knownHosts` is a required
 * argument with no default. A caller that forgets it gets an exception naming
 * itself before anything is spawned, rather than an ssh that quietly falls back
 * to the person's file. Nineteen hand written call sites can never have that
 * property, because forgetting one is silent by construction.
 *
 * ## The two facts about ssh this file depends on, both measured
 *
 *  1. **ssh takes the FIRST value it is given for an option.** So prepending
 *     `-o UserKnownHostsFile=<ours>` cannot be overridden by anything later in
 *     the argv. That is what makes {@link sshArgv} a guarantee rather than a
 *     convention.
 *  2. **ssh does not fall back to a later file when the first cannot be
 *     written.** Driven on 2026-09-01 against a scratch sshd, with the first
 *     file in a directory that does not exist and again with it read only: ssh
 *     refused and named the FIRST file both times, and the stand-in second file
 *     stayed 0 bytes. That is the fact under the two file form below, and it
 *     was confirmed rather than inherited.
 *
 * A third fact rules out the obvious way to test any of this. **macOS OpenSSH
 * expands `~` from getpwuid, not from `$HOME`**, so running a probe with `HOME`
 * pointed at a scratch directory does NOT redirect where ssh writes. Measured
 * with `ssh -G`, which resolves options and connects to nothing: the real HOME
 * and a redirected one both resolve `userknownhostsfile` to
 * `/Users/gdc/.ssh/known_hosts`. A scratch known_hosts would have stayed empty
 * forever and been read as proof while every write still landed in the real
 * file. Do not test this that way.
 *
 * ## What this file does NOT own
 *
 * The nine `sshd` launches under build/. A server holds no known_hosts, so it
 * is a different concern, and it is process teardown, which
 * `build/scratch-machine.mjs` already owns. `ssh-keygen`, `ssh-agent` and
 * `ssh-add` are not routed either: none of them reads or writes a known_hosts
 * file in any form this tree uses. `ssh-keygen -R` and `-F` DO touch it and
 * default to the person's own, so `npm run gate:knownhosts` refuses those two
 * flags outright rather than routing them.
 *
 * `npm run gate:knownhosts` is what keeps every call site here.
 */

import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The person's own ssh client. Every route in this file starts this program. */
export const SSH_BIN = '/usr/bin/ssh';
/** The program that reads a host's public key without recording anything. */
export const KEYSCAN_BIN = '/usr/bin/ssh-keyscan';

/** The option name, written once so nothing else in build/ has to spell it. */
const OPTION = 'UserKnownHostsFile';

// ---------------------------------------------------------------------------
// The record file
// ---------------------------------------------------------------------------

/**
 * `<root>/<name>`, with its directory made, as a host key record this script
 * owns.
 *
 * It exists so the correct value is one call away and nobody has to reach for
 * `homedir()` to build one. The file itself is not created: ssh makes it on
 * first write, and a caller that wants it to exist empty writes it.
 */
export function scratchKnownHosts(root, name = 'known_hosts') {
  if (typeof root !== 'string' || root.trim() === '') {
    throw new Error(
      'scratchKnownHosts needs a directory this run owns. It was given ' +
        `${JSON.stringify(root)}, and a record file with no directory would ` +
        "land wherever the process happens to be."
    );
  }
  const path = join(root, name);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  return path;
}

/**
 * The two file form the product uses, being Tortie's own record FIRST and the
 * person's own second, quoted the way ssh reads a two file value.
 *
 * This exists so a harness can mirror `src/main/machines/ssh.ts` exactly, which
 * three probes need, WITHOUT the dangerous ordering being writable. There is no
 * argument order to get wrong: the fields are named, Tortie's is emitted first,
 * and the person's file is never reachable on its own.
 *
 * `npm run conformance:machines` enforces the same ordering for the product.
 */
export function productKnownHosts({ tortie, user }) {
  if (typeof tortie !== 'string' || tortie.trim() === '') {
    throw new Error(
      "productKnownHosts needs Tortie's own record file, and it was given " +
        `${JSON.stringify(tortie)}. Tortie's file is the one ssh writes to, ` +
        "so an empty first value would make the person's file the target."
    );
  }
  if (typeof user !== 'string' || user.trim() === '') {
    throw new Error(
      'productKnownHosts needs the second file too, and it was given ' +
        `${JSON.stringify(user)}. Use sshOptions with a single path when ` +
        'only one file is wanted.'
    );
  }
  if (tortie === user) {
    throw new Error(
      'productKnownHosts was given the same path twice, which is not the two ' +
        'file form and hides which file is the target.'
    );
  }
  return `"${tortie}" "${user}"`;
}

/**
 * The `-o UserKnownHostsFile=` pair. THIS IS THE ONLY PLACE IN build/ THAT
 * EMITS IT, and `npm run gate:knownhosts` rule 3 is what keeps that true.
 *
 * The empty check is not theoretical. `-o UserKnownHostsFile=` with no value is
 * a parse error that stops ssh before it connects, so an empty value is a
 * broken run rather than a safe one, and a broken run is how a caller learns to
 * remove the option.
 */
function knownHostsOption(value, caller) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `${caller} started ssh without a host key record file. ` +
        'build/ssh-run.mjs requires knownHosts and has no default on purpose: ' +
        "without it ssh writes in the person's own ~/.ssh/known_hosts, which " +
        'is the defect Phase 193 exists to make impossible. Pass ' +
        'scratchKnownHosts(root) or productKnownHosts({ tortie, user }).'
    );
  }
  return ['-o', `${OPTION}=${value}`];
}

// ---------------------------------------------------------------------------
// Composing an argv
// ---------------------------------------------------------------------------

/** The value of the first UserKnownHostsFile in an argv, or null. */
function firstRecordValue(argv) {
  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (arg.startsWith(`${OPTION}=`)) return arg.slice(OPTION.length + 1);
  }
  return null;
}

/**
 * The options a harness connection carries, in the product's own order.
 *
 * Every field is optional except `knownHosts`, and an omitted field emits
 * nothing, so a caller composes exactly the connection it means. The one thing
 * it cannot do is leave the record file out.
 */
export function sshOptions({
  knownHosts,
  caller = 'a script under build/',
  batchMode = true,
  connectTimeout = null,
  strict = null,
  controlMaster = null,
  controlPath = null,
  controlPersist = null,
  serverAliveInterval = null,
  serverAliveCountMax = null,
  identityFile = null,
  identitiesOnly = null,
  globalKnownHosts = null,
  logLevel = null,
  extra = []
} = {}) {
  const argv = [];
  if (batchMode) argv.push('-o', 'BatchMode=yes');
  if (connectTimeout !== null) argv.push('-o', `ConnectTimeout=${String(connectTimeout)}`);
  if (strict !== null) argv.push('-o', `StrictHostKeyChecking=${String(strict)}`);
  argv.push(...knownHostsOption(knownHosts, caller));
  if (globalKnownHosts !== null) {
    argv.push('-o', `GlobalKnownHostsFile=${String(globalKnownHosts)}`);
  }
  if (controlMaster !== null) argv.push('-o', `ControlMaster=${String(controlMaster)}`);
  if (controlPath !== null) argv.push('-o', `ControlPath=${String(controlPath)}`);
  if (controlPersist !== null) argv.push('-o', `ControlPersist=${String(controlPersist)}`);
  if (serverAliveInterval !== null) {
    argv.push('-o', `ServerAliveInterval=${String(serverAliveInterval)}`);
  }
  if (serverAliveCountMax !== null) {
    argv.push('-o', `ServerAliveCountMax=${String(serverAliveCountMax)}`);
  }
  if (identityFile !== null) argv.push('-o', `IdentityFile=${String(identityFile)}`);
  if (identitiesOnly !== null) argv.push('-o', `IdentitiesOnly=${String(identitiesOnly)}`);
  if (logLevel !== null) argv.push('-o', `LogLevel=${String(logLevel)}`);
  argv.push(...extra);
  return argv;
}

/**
 * The full argv this file will hand to ssh, with the record file guaranteed.
 *
 * Three cases, and the third is the one that matters:
 *
 *  1. The argv already carries this exact value, because the caller built its
 *     option block with {@link sshOptions}. It is returned unchanged, so the
 *     argv a probe prints is the argv that ran.
 *  2. The argv carries a DIFFERENT value. That is refused, loudly. Two record
 *     files in one argv means somebody is not reading the one that is in force,
 *     and ssh takes the first, so the disagreement would be silent.
 *  3. The argv carries none. The pair is PREPENDED. Prepended rather than
 *     appended because ssh takes the first value for an option, so a later one
 *     anywhere in the argv, wherever it came from, cannot win.
 */
export function sshArgv({ knownHosts, argv = [], caller = 'a script under build/' }) {
  const required = knownHostsOption(knownHosts, caller);
  const value = required[1].slice(OPTION.length + 1);
  const already = firstRecordValue(argv);
  if (already === null) return [...required, ...argv];
  if (already !== value) {
    throw new Error(
      `${caller} passed one host key record file to build/ssh-run.mjs and a ` +
        `different one in its own argv. The helper was given ` +
        `${JSON.stringify(value)} and the argv already carries ` +
        `${JSON.stringify(already)}. ssh takes the first value it is given, so ` +
        'one of these two would silently do nothing. Pass one.'
    );
  }
  return [...argv];
}

// ---------------------------------------------------------------------------
// Running it
// ---------------------------------------------------------------------------

/**
 * One ssh, run to completion. The result is `spawnSync`'s own object with the
 * composed `argv` added, so a caller can print exactly what ran.
 *
 * `knownHosts` is required. See {@link knownHostsOption} for why there is no
 * default.
 */
export function sshRun({ knownHosts, argv = [], caller = 'a script under build/', ...options }) {
  const composed = sshArgv({ knownHosts, argv, caller });
  const out = spawnSync(SSH_BIN, composed, { encoding: 'utf8', timeout: 60_000, ...options });
  out.argv = composed;
  return out;
}

/**
 * One long lived ssh, handed back as whatever the spawner returns.
 *
 * The spawner is INJECTED because the two callers that need this need two
 * different ones: `build/real-machine.mjs` wants `child_process.spawn`, and
 * `build/probe-remote-attach.mjs` wants `node-pty`'s spawn so the far side sees
 * a terminal. Injecting it keeps node-pty, which is a native module, out of a
 * helper that every gate imports, and it keeps the program name in this file
 * where the gate can read it.
 */
export function sshSpawn({
  knownHosts,
  argv = [],
  caller = 'a script under build/',
  spawn = nodeSpawn,
  ...options
}) {
  return spawn(SSH_BIN, sshArgv({ knownHosts, argv, caller }), options);
}

/**
 * One `ssh-keyscan`, which reads a host's public key and records nothing
 * anywhere.
 *
 * It needs no record file and it accepts no `-o`, so nothing is prepended here.
 * It is routed anyway so that `npm run gate:knownhosts` has ONE rule, being
 * that no file under build/ spawns an ssh family program itself, rather than
 * one rule plus a list of exceptions a later round has to keep correct.
 */
export function keyscan({ host, port = null, caller = 'a script under build/', ...options }) {
  if (typeof host !== 'string' || host.trim() === '') {
    throw new Error(`${caller} asked ssh-keyscan for the key of ${JSON.stringify(host)}.`);
  }
  const argv = port === null ? [host] : ['-p', String(port), host];
  const out = spawnSync(KEYSCAN_BIN, argv, {
    encoding: 'utf8',
    timeout: 30_000,
    ...options
  });
  out.argv = argv;
  return out;
}

/** The lines `ssh-keyscan` printed, as one string, which is what every caller wants. */
export function keyscanText(request) {
  return keyscan(request).stdout ?? '';
}

/**
 * The client's own version string.
 *
 * `ssh -V` prints to stderr and exits 0. `build/capture-machine-goldens.mjs`
 * used to read it by handing `ssh -V 2>&1` to `/bin/sh -c`, which put an ssh on
 * a command line no scanner reading spawn positions would ever see. It is here
 * so that shape does not exist in this tree, and `npm run gate:knownhosts`
 * refuses it if it comes back.
 *
 * A version query opens no connection, so the record file it carries is
 * meaningless to it. It carries one anyway, because a rule with no exceptions
 * is a rule a later round cannot argue with.
 */
export function sshVersion({ knownHosts, caller = 'a script under build/' }) {
  const out = sshRun({ knownHosts, argv: ['-V'], caller, stdio: ['ignore', 'pipe', 'pipe'] });
  return `${out.stdout ?? ''}${out.stderr ?? ''}`.trim();
}
