/**
 * The key Tortie makes for one machine, and the file it keeps it in (Phase
 * 79.1, research 51 section 4.2).
 *
 * ## What a person gets from this file
 *
 * A machine that refuses Tortie's sign in has no key on it. Until this phase
 * the answer was for the person to leave Tortie, run two commands they have
 * never run, and come back. This module is the first half of doing that for
 * them. It makes one key for one machine and it keeps the private half here.
 * `./key-install.ts` composes what is sent to the machine, and
 * `./connection-test.ts` is the one place that runs it.
 *
 * ## Tortie assembles the program macOS ships, and writes no key format itself
 *
 * The key is made by {@link PINNED_SSH_KEYGEN_PATH}, which is on every Mac.
 * Hand writing the OpenSSH private key format would be new cryptographic code
 * in a product that has none, and it would be code nobody here can review
 * against the format's own test vectors. There is no environment override for
 * the program path, so this phase adds no new `GMUX_*` name. The optional
 * `keygenPath` argument exists for the unit tests and for
 * `build/probe-key-install.mjs`, and nothing in the product passes it.
 *
 * ## Where the private half lives, and why the file name is a hash
 *
 * `<userData>/gmux/machines/keys/machine-<12 hex>`, beside the record of
 * machine identities Phase 68 put in the same directory. It is Tortie's own
 * bookkeeping, so it belongs beside Tortie's own bookkeeping. It is NOT in the
 * person's own key folder in their home directory, which Tortie neither reads
 * nor writes, and no line of this file names that folder at all.
 *
 * The leaf is the first twelve hex digits of a sha256 over the machine's
 * record key rather than the machine id itself. Two reasons, and each one is a
 * reason on its own:
 *
 *  1. A machine id comes from a file an agent process can write. An id such as
 *     `../../../../etc/ssh/ssh_host_ed25519_key` composed into a path would
 *     leave the directory. A hash cannot leave it, whatever the id says.
 *  2. The id is a name the person chose and it can carry anything they typed.
 *     The same twelve hex digits are the key's comment, so the only thing that
 *     crosses to the other machine is a value Tortie computed.
 *
 * One key per machine, so removing one machine can revoke one credential. The
 * hash covers the record key, which already carries the `machine:` prefix, so a
 * machine and a configured agent with the same bare id cannot share a file.
 *
 * ## The key has no passphrase, stated rather than dressed up
 *
 * A passphrase Tortie held for the person would not be a passphrase. A
 * passphrase it asked for on every connection would break the exec plane, which
 * runs many short commands. What protects the private half is the file it is
 * in, which is mode 0600 in a directory of mode 0700. The screen says exactly
 * that in `MACHINE_KEY_NO_PASSPHRASE`, in main's own words.
 *
 * ## What this module does not do
 *
 * It sends nothing to any machine, it opens no connection, and it asks for no
 * password. It reads and writes two files inside Tortie's own data directory
 * and it starts one program, which is `ssh-keygen`. It never puts a key in the
 * OS keystore and it never records anything about a key.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';

import { gmuxError } from '../errors';
import { machineRecordKey } from './confirm';
import { MACHINE_KEY_KEYGEN_MISSING, MACHINE_KEY_NO_ID } from './key-codes';
// The one definition of where Tortie's own machine bookkeeping lives. A second
// copy of that join would be a second thing to keep in step.
import { machineRecordDir } from './store';

// ---------------------------------------------------------------------------
// The pinned facts
// ---------------------------------------------------------------------------

/** The key maker every Mac has. Pinned, never a bare name served by PATH. */
export const PINNED_SSH_KEYGEN_PATH = '/usr/bin/ssh-keygen';

/** The directory holding the private halves. */
export const MACHINE_KEY_DIR_MODE = 0o700;

/** Both halves of the key. The public half is Tortie's too, so it is not 0644. */
export const MACHINE_KEY_FILE_MODE = 0o600;

/** The one key type Tortie makes. Small, fast, and on every current OpenSSH. */
export const MACHINE_KEY_TYPE = 'ed25519';

/** What every comment Tortie writes into a key begins with. */
export const KEY_COMMENT_PREFIX = 'tortie-';

/** How many hex digits of the digest name the file and the comment. */
const KEY_DIGEST_HEX = 12;

/** The directory leaf under the machine record directory. */
const KEY_SUBDIR = 'keys';

/** How long `ssh-keygen` gets. It is local work and takes a few milliseconds. */
const KEYGEN_TIMEOUT_MS = 20_000;

/**
 * The exact shape of a public key line Tortie will install.
 *
 * It is deliberately narrow rather than general. Tortie installs its OWN key
 * and nothing else, so the line is the one `ssh-keygen -t ed25519` writes with
 * the comment this module composed. Anything else is refused before an argv
 * exists, which is what `build/conformance-machines.mjs` condition 32 drives
 * with five hostile strings.
 *
 * There is no `m` flag, so `^` and `$` are the start and the end of the whole
 * string. A line carrying a newline, a semicolon, a backtick, a dollar sign or
 * a quote cannot match, because none of those characters is in any of the three
 * character classes.
 */
export const PUBLIC_KEY_LINE_RE =
  /^ssh-ed25519 [A-Za-z0-9+/]{32,1024}={0,3} tortie-[0-9a-f]{12}$/;

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** The twelve hex digits that name one machine's key file and its comment. */
function keyDigest(id: string): string {
  return createHash('sha256')
    .update(machineRecordKey(id))
    .digest('hex')
    .slice(0, KEY_DIGEST_HEX);
}

/**
 * `<userData>/gmux/machines/keys`.
 *
 * `userDataOverride` exists for the tests and for a harness running with its
 * own data directory. Nothing in the product passes it.
 */
export function machineKeyDir(userDataOverride?: string): string {
  return join(machineRecordDir(userDataOverride), KEY_SUBDIR);
}

/** The file name for one machine, with no character of the id in it. */
export function machineKeyLeaf(id: string): string {
  return `machine-${keyDigest(id)}`;
}

/** The absolute path of the private half. */
export function machineKeyPath(id: string, userDataOverride?: string): string {
  return join(machineKeyDir(userDataOverride), machineKeyLeaf(id));
}

/** The absolute path of the public half, which is the private one plus .pub. */
export function machinePublicKeyPath(
  id: string,
  userDataOverride?: string
): string {
  return `${machineKeyPath(id, userDataOverride)}.pub`;
}

/**
 * The comment written into the key.
 *
 * It is the same twelve hex digits the file is named with, so a person reading
 * a line on the other machine can work out which file on this Mac it belongs
 * to, and so that nothing a person or an agent typed ever crosses to that
 * machine.
 */
export function machineKeyComment(id: string): string {
  return `${KEY_COMMENT_PREFIX}${keyDigest(id)}`;
}

// ---------------------------------------------------------------------------
// Reading a public key line
// ---------------------------------------------------------------------------

/** True when this is a line Tortie made and will install. */
export function isPublicKeyLine(line: string): boolean {
  return PUBLIC_KEY_LINE_RE.test(line);
}

/**
 * The fingerprint OpenSSH would print for this line, computed here.
 *
 * `SHA256:` then the base64 of the sha256 of the decoded blob, with the base64
 * padding removed. That is the recipe `ssh-keygen -l` uses, and the unit test
 * compares this answer against that program for a real key. It is computed in
 * Node so that showing a person the fingerprint costs no second process.
 *
 * Null for anything that is not a line Tortie made.
 */
export function publicKeyFingerprint(line: string): string | null {
  if (!isPublicKeyLine(line)) return null;
  const blob = line.split(' ')[1] ?? '';
  const digest = createHash('sha256').update(Buffer.from(blob, 'base64')).digest('base64');
  return `SHA256:${digest.replace(/=+$/, '')}`;
}

// ---------------------------------------------------------------------------
// Making the key, or using the one already made
// ---------------------------------------------------------------------------

/** Everything a caller needs about one machine's key. */
export interface MachineKeyMaterial {
  readonly path: string;
  readonly publicPath: string;
  readonly publicKeyLine: string;
  readonly fingerprint: string;
  /** True when this call made the key. False when it used the one already there. */
  readonly made: boolean;
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The trimmed contents of a file, or null when it cannot be read. */
function readTrimmed(path: string): string | null {
  try {
    const text = readFileSync(path, 'utf8').trim();
    return text.length === 0 ? null : text;
  } catch {
    return null;
  }
}

/** True when the private half is a file with bytes in it. */
function hasPrivateHalf(path: string): boolean {
  try {
    const stat = statSync(path);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * True when BOTH halves of Tortie's own key for one machine are on this Mac.
 *
 * PHASE 84, item 7. It is the question `./context.ts` asks before it names the
 * key on every command, and `src/renderer/settings/MachineRow.tsx` draws one of
 * two sentences from the same answer. It makes nothing and it writes nothing:
 * a machine with no key is an ordinary state, and the Install button is what
 * changes it.
 *
 * BOTH HALVES, not one. A private half with no public half is a key Tortie
 * cannot have installed anywhere, and naming a file the client then fails to
 * read makes it print a warning on every command for nothing.
 */
export function machineKeyPairPresent(
  id: string,
  userDataOverride?: string
): boolean {
  const trimmed = id.trim();
  if (trimmed.length === 0) return false;
  const line = readTrimmed(machinePublicKeyPath(trimmed, userDataOverride));
  if (line === null || !isPublicKeyLine(line)) return false;
  return hasPrivateHalf(machineKeyPath(trimmed, userDataOverride));
}

/**
 * The key for one machine, made once and used again after that.
 *
 * ## Why it is used again rather than made again
 *
 * A run that made a second key would leave the first public half on the machine
 * after an install that succeeded and a connection test that then failed. The
 * person would have a line on their machine for a key Tortie had already thrown
 * away, and nothing would ever remove it. So both halves being present, with a
 * public half this module recognises, is enough to use them.
 *
 * ## What it refuses
 *
 * An empty id, because the key file for the empty id would be one file that
 * every unnamed machine shared, and one key per machine is the whole point. A
 * missing `ssh-keygen`, with the sentence a person reads. A run of that program
 * that failed, or that wrote something this module does not recognise as its
 * own public key line.
 */
export function ensureMachineKey(input: {
  id: string;
  keygenPath?: string;
  userDataOverride?: string;
}): MachineKeyMaterial {
  const id = input.id.trim();
  if (id.length === 0) {
    throw gmuxError('INVALID_INPUT', MACHINE_KEY_NO_ID);
  }

  const dir = machineKeyDir(input.userDataOverride);
  const path = machineKeyPath(id, input.userDataOverride);
  const publicPath = machinePublicKeyPath(id, input.userDataOverride);

  // `mkdir`'s own mode argument is masked by the umask, so the mode is set
  // afterwards rather than passed in. Both calls are inside the same try,
  // because a directory Tortie cannot create is the same failure either way.
  try {
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, MACHINE_KEY_DIR_MODE);
  } catch (err) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie could not make the folder it keeps machine keys in, at ${dir}. ` +
        `Nothing was sent to the machine.`,
      String(err)
    );
  }

  const existing = readTrimmed(publicPath);
  if (existing !== null && isPublicKeyLine(existing) && hasPrivateHalf(path)) {
    chmodSync(path, MACHINE_KEY_FILE_MODE);
    chmodSync(publicPath, MACHINE_KEY_FILE_MODE);
    return {
      path,
      publicPath,
      publicKeyLine: existing,
      fingerprint: publicKeyFingerprint(existing) ?? '',
      made: false
    };
  }

  const keygen = input.keygenPath ?? PINNED_SSH_KEYGEN_PATH;
  if (!isExecutableFile(keygen)) {
    throw gmuxError('INVALID_INPUT', MACHINE_KEY_KEYGEN_MISSING);
  }

  // A half written pair from an earlier run would make `ssh-keygen` ask whether
  // to overwrite, and a question nobody can answer is a run that never ends.
  // Removing both halves first is what keeps the program from asking at all.
  rmSync(path, { force: true });
  rmSync(publicPath, { force: true });

  const made = spawnSync(
    keygen,
    [
      '-t',
      MACHINE_KEY_TYPE,
      '-N',
      '',
      '-C',
      machineKeyComment(id),
      '-f',
      path,
      '-q'
    ],
    { encoding: 'utf8', timeout: KEYGEN_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] }
  );

  if (made.status !== 0) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie could not make a key for this machine. The program it uses, at ` +
        `${keygen}, stopped with code ${String(made.status)}. Nothing was sent ` +
        `to the machine.`,
      `${made.stdout ?? ''}${made.stderr ?? ''}`.trim()
    );
  }

  const line = readTrimmed(publicPath);
  if (line === null || !isPublicKeyLine(line)) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie made a key and could not read back the half it would put on the ` +
        `machine. Nothing was sent to the machine.`
    );
  }

  chmodSync(path, MACHINE_KEY_FILE_MODE);
  chmodSync(publicPath, MACHINE_KEY_FILE_MODE);

  return {
    path,
    publicPath,
    publicKeyLine: line,
    fingerprint: publicKeyFingerprint(line) ?? '',
    made: true
  };
}
