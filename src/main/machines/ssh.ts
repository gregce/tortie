/**
 * The carriage. Every ssh option a steady state Tortie command carries, and the
 * short name of the connection it keeps open to one machine (Phase 69, M2,
 * research 51 section 4.1).
 *
 * This module is pure. It reads no file, starts nothing, and imports nothing
 * that could. It composes strings and it asserts one length.
 *
 * ## Where each option comes from
 *
 * Nothing here is written twice. `BatchMode=yes`, the connect timeout and the
 * two identity record files all come from `./carriage.ts`. Phase 68 wrote and
 * measured them beside the one visible test, and Phase 69 moved them to
 * `./carriage.ts` so that reading a constant does not pull a terminal binding
 * into the import graph of the local tmux door. The header of `./carriage.ts`
 * records what that broke and how it was found.
 *
 * ## StrictHostKeyChecking=yes, which is stronger than Phase 68 promised
 *
 * Under `ask` the client would put a question on a terminal that does not exist
 * here, and `BatchMode=yes` means it could not wait for an answer anyway. Under
 * `yes` the client refuses an unknown machine outright. So the exec plane cannot
 * add a line to ANY identity record file, including the one Tortie owns. First
 * contact belongs to the one visible connection test, where a person is
 * watching. `build/probe-execplane.mjs` measures both files in bytes before and
 * after a full run, and both must be unchanged.
 *
 * ## Why the control path length is asserted rather than hoped for
 *
 * A unix socket path is limited to 104 bytes, and the failure lands when the
 * client tries to connect rather than when a reviewer reads the code. So the
 * composer measures the bytes and refuses above the budget with a sentence a
 * person can act on.
 *
 * MEASURED on this Mac, 2026-08-17:
 *
 *   /var/folders/7f/43d9mxrd1q3_82py34w8lwf40000gn/T/tortie-mux/m-0123456789ab
 *     74 bytes, inside the 100 byte budget
 *   /tmp/tortie-501/m-0123456789ab
 *     30 bytes, the fallback for a system whose temporary directory is longer
 *
 * `tmpdir()` on macOS is the per-user private `/var/folders/.../T/` directory,
 * so a name inside it cannot be squatted by another account. The fallback is
 * created mode 0700 and its owner is checked, because `/tmp` is world writable.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gmuxError } from '../errors';
import {
  SSH_BATCH_MODE_STEADY,
  SSH_CONNECT_TIMEOUT_SECONDS,
  composeKnownHostsOption,
  type MachineHostKeyFiles
} from './carriage';

// ---------------------------------------------------------------------------
// The reused connection
// ---------------------------------------------------------------------------

/**
 * How long the shared connection stays up after the last command using it.
 *
 * 60 s. A person preparing a machine, reading the answer and pressing the
 * button again is inside that window, so the second command reuses the first
 * command's connection. Longer would keep a connection open across a lunch
 * break for nothing.
 */
export const SSH_CONTROL_PERSIST_SECONDS = 60;

/**
 * How often the client asks the far side whether it is still there, and how
 * many unanswered asks end the connection.
 *
 * THESE TWO NUMBERS COME FROM MEASUREMENT, not from a default. They exist so a
 * dropped link becomes an error instead of a pipe that never answers. A command
 * hanging on a machine that went to sleep is the failure the operator would read
 * as Tortie freezing on work he cares about.
 *
 * MEASURED 2026-08-17 by `build/probe-execplane.mjs`, on loopback, by sending
 * SIGSTOP to the far side of the connection. A stopped far side reproduces the
 * condition exactly: the socket stays open and no reply ever comes.
 *
 *   interval  count  measured seconds to error  what the client printed
 *   5         3      19.3                       mux_client_request_session:
 *                                               read from master failed: Broken pipe
 *   10        3      39.3                       the same sentence
 *   15        3      59.4                       the same sentence
 *
 * All three recovered: after SIGCONT the next command against the same machine
 * succeeded. The pair chosen is (5, 3), because 19.3 s is the only measured
 * detection time at or under 20 s while sending no more than one probe every
 * 5 s. Note that the measured time is longer than interval times count, at 19.3 s
 * rather than 15 s, because the shared connection's own master has to notice and
 * then close the pipe the waiting command is reading.
 *
 * TWO THINGS THE MEASUREMENT DOES NOT SAY. It was made on loopback against a
 * stopped far side, which reproduces the hung pipe and says nothing about a
 * tailnet with real packet loss and real roaming. Research 51 section 7 question 3
 * stays open for that. And the first attempt at this measurement produced 0.1 s
 * for all three pairs, because it stopped the listener process rather than the
 * child holding the connection. The probe now stops the descendants, and that is
 * why the numbers above are believable and the first ones were not.
 */
export const SSH_SERVER_ALIVE_INTERVAL_SECONDS = 5;
export const SSH_SERVER_ALIVE_COUNT_MAX = 3;

/**
 * The most bytes a control socket path may be.
 *
 * The system limit is 104. The budget is 100, so a machine id that grows the
 * hashed name by a character or two still fails the assert here rather than at
 * connect time.
 */
export const CONTROL_PATH_MAX_BYTES = 100;

/** The directory the control sockets live in, under the per-user temporary one. */
export const CONTROL_DIR_NAME = 'tortie-mux';

/** The mode the control directory is created with. Nobody else may read it. */
export const CONTROL_DIR_MODE = 0o700;

/**
 * The refusal when no short enough name exists on this system.
 *
 * Pinned by `build/assert-bundle-refusals.mjs` as
 * `machine.control-path-too-long`. It names the limit as a fact about the
 * system rather than blaming the machine, because that is what it is.
 */
export const CONTROL_PATH_TOO_LONG =
  'Tortie could not compose a short enough name for the connection it keeps ' +
  'open to this machine. This is a limit of this system rather than a problem ' +
  'with the machine. Nothing was started.';

/** What the composer needs, and it is deliberately not the whole context. */
export interface ControlPathInput {
  /** The machine's execution hash, which is what the confirm gate bound. */
  readonly executionHash: string;
  /** This process's user id, so two accounts never share a name. */
  readonly uid: number;
  /** The directory to compose inside. Defaults to the per-user temporary one. */
  readonly dir?: string;
}

/** The twelve hex characters that name one machine's connection. Pure. */
export function controlPathLeaf(input: ControlPathInput): string {
  const digest = createHash('sha256')
    .update(`tortie-control-v1\n${input.executionHash}\n${String(input.uid)}`)
    .digest('hex');
  return `m-${digest.slice(0, 12)}`;
}

/**
 * The directory a control socket goes in, and the two forms in order.
 *
 * The first form is inside the per-user temporary directory, which on macOS is
 * private to this account. The second is used only when the first is over
 * budget, and it is checked for ownership because `/tmp` is world writable.
 */
export function controlDirCandidates(uid: number, base?: string): string[] {
  return [
    join(base ?? tmpdir(), CONTROL_DIR_NAME),
    join('/tmp', `tortie-${String(uid)}`)
  ];
}

/**
 * Compose the control socket path, and refuse when nothing fits.
 *
 * It creates the directory it picks, mode 0700, and checks that an existing
 * directory is owned by this account. A directory somebody else owns is skipped
 * rather than used, because a control socket inside it would let that account
 * reach this machine's connection.
 *
 * @throws GmuxError INVALID_INPUT with {@link CONTROL_PATH_TOO_LONG}
 */
export function composeControlPath(input: ControlPathInput): string {
  const leaf = controlPathLeaf(input);
  const dirs =
    input.dir === undefined
      ? controlDirCandidates(input.uid)
      : [join(input.dir, CONTROL_DIR_NAME)];
  for (const dir of dirs) {
    const path = join(dir, leaf);
    if (Buffer.byteLength(path, 'utf8') > CONTROL_PATH_MAX_BYTES) continue;
    if (!prepareControlDir(dir, input.uid)) continue;
    return path;
  }
  throw gmuxError(
    'INVALID_INPUT',
    CONTROL_PATH_TOO_LONG,
    `no directory under ${dirs.join(' or ')} produced a name of ` +
      `${String(CONTROL_PATH_MAX_BYTES)} bytes or fewer`
  );
}

/** Make the directory, mode 0700, and answer whether this account owns it. */
function prepareControlDir(dir: string, uid: number): boolean {
  try {
    mkdirSync(dir, { recursive: true, mode: CONTROL_DIR_MODE });
  } catch {
    return false;
  }
  try {
    const info = statSync(dir);
    return info.isDirectory() && info.uid === uid;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The options
// ---------------------------------------------------------------------------

/**
 * Everything the option composer needs from a machine.
 *
 * It is its own narrow type rather than the whole context, so this module has no
 * import from `./context.ts` and the two cannot form a cycle.
 */
export interface SshCarriage {
  /** Absolute path to the ssh client this process runs. */
  readonly sshBin: string;
  readonly host: string;
  readonly user: string | null;
  readonly port: number | null;
  /** The control socket for this machine's reused connection. */
  readonly controlPath: string;
  /** The two identity record files, Tortie's own first. */
  readonly hostKeys: MachineHostKeyFiles;
  /**
   * APPENDED (Phase 84): Tortie's own key for this machine, or null.
   *
   * ## The defect it closes
   *
   * `IdentityFile` and a bare `-i` appeared zero times under
   * `src/main/machines/` before this phase. The Install button in Settings
   * makes a key at `<userData>/gmux/machines/keys/machine-<12 hex>` and puts
   * its public half on the machine, and then NOTHING named that file on any
   * command. That path is not one of the client's default identities, so every
   * sign in depended on whatever key the person happened to have loaded, and
   * nothing on screen said so.
   *
   * ## `IdentitiesOnly` is NOT set, and that is a decision
   *
   * Setting it would tell the client to offer Tortie's key and nothing else.
   * The operator's Mac Pro works TODAY through a key he loaded himself, and
   * `IdentitiesOnly=yes` would break that on the first run of a new build. So
   * Tortie names its own key IN ADDITION to whatever the person has, and the
   * sentence in Settings says exactly that.
   *
   * ABSENT reads as null, which is a machine Tortie has made no key for.
   * Nothing is named then, because naming a file that is not there makes the
   * client print a warning on every command for nothing.
   */
  readonly identityFile?: string | null;
}

/**
 * The options every steady state command carries, in a fixed order.
 *
 * The order is fixed so a golden comparison and the conformance gate can read
 * the argv as one string. `-p` and `-l` are last and appear only when the row
 * carries a value, because passing a default would put a value on the command
 * line that the person never chose and the confirm hash never covered.
 */
export function sshOptions(carriage: SshCarriage): string[] {
  const argv: string[] = [
    '-o',
    SSH_BATCH_MODE_STEADY,
    '-o',
    `ConnectTimeout=${String(SSH_CONNECT_TIMEOUT_SECONDS)}`,
    '-o',
    'StrictHostKeyChecking=yes',
    '-o',
    composeKnownHostsOption(carriage.hostKeys)
  ];
  // PHASE 84. After the record file option and before the connection reuse
  // options, so the fixed order the golden comparison reads stays fixed. It is
  // QUOTED for the reason `composeKnownHostsOption` quotes its two paths: this
  // path is under Tortie's own data directory, and that directory has a space
  // in its name on every Mac.
  if (carriage.identityFile != null && carriage.identityFile.length > 0) {
    argv.push('-o', `IdentityFile="${carriage.identityFile}"`);
  }
  argv.push(
    '-o',
    'ControlMaster=auto',
    '-o',
    `ControlPath=${carriage.controlPath}`,
    '-o',
    `ControlPersist=${String(SSH_CONTROL_PERSIST_SECONDS)}s`,
    '-o',
    `ServerAliveInterval=${String(SSH_SERVER_ALIVE_INTERVAL_SECONDS)}`,
    '-o',
    `ServerAliveCountMax=${String(SSH_SERVER_ALIVE_COUNT_MAX)}`
  );
  if (carriage.port !== null) argv.push('-p', String(carriage.port));
  if (carriage.user !== null) argv.push('-l', carriage.user);
  return argv;
}

/**
 * The option names the conformance gate requires on every exec plane argv.
 *
 * Exported so the gate reads this list rather than keeping its own copy of it.
 * A name removed from the composer above and from here at the same time is
 * caught by the count assertion in `build/conformance-machines.mjs`.
 */
export const REQUIRED_SSH_OPTIONS: readonly string[] = [
  'BatchMode=yes',
  'ConnectTimeout=',
  'StrictHostKeyChecking=yes',
  'UserKnownHostsFile=',
  'ControlMaster=auto',
  'ControlPath=',
  'ControlPersist=',
  'ServerAliveInterval=',
  'ServerAliveCountMax='
];
