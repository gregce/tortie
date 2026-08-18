/**
 * Putting Tortie's own key on one machine (Phase 79.1, research 51 section 4.2).
 *
 * ## What this file is for
 *
 * A person whose machine came back `auth-refused` or `refused` has no way in
 * from Tortie. The operator hit this himself. He had no key at all, and his own
 * machine refused his connection. This file is the composition half of the
 * answer. It writes the sheet a person reads, the hash that sheet is bound to,
 * the command the other machine runs, and the reading of what that machine
 * printed back. It starts nothing. The one thing on this path that starts a
 * process lives in `./connection-test.ts`, which already owns the one terminal
 * Tortie opens for a person.
 *
 * ## The confirm gate, and why the machine hash did not gain a field
 *
 * The machine execution hash stays exactly `host`, `user`, `port` and
 * `remoteTmuxPath`. Those four decide what runs on the machine, and putting a
 * key there changes none of them. A fifth field would move every machine's
 * hash, so every machine a person already confirmed would read `changed` for
 * something that did not change, and a gate that asks about something that did
 * not move is the gate that teaches people to click through the one that did.
 *
 * Installing a key gets its OWN agreement with its own hash instead. It covers
 * the machine id, the host, the account name, the port, the file that will be
 * written on that machine, and the absolute path of the private half on this
 * Mac. {@link MACHINE_EXECUTION_HASH_ALGORITHM} is not this algorithm, and the
 * two hashes can never be equal for one machine because the algorithm name is
 * the first line of each canonical text.
 *
 * `remoteTmuxPath` is deliberately not covered. The program path has nothing to
 * do with putting a key somewhere, and a machine that has never authenticated
 * has no program path yet, which is the exact case this file exists for.
 *
 * Nothing here is written to the sealed record. A machine record is a standing
 * permission that says Tortie may sign in from now on. Installing a key is one
 * act at one moment, so nothing standing is granted and nothing standing is
 * written. What makes the agreement real is the hash comparison inside the one
 * call, which is the same mechanism `machines:add` already uses.
 *
 * ## The remote command, and the four things that keep it safe
 *
 * {@link AUTHORIZED_KEYS_SCRIPT} is a constant with no interpolation of any
 * kind. The public key reaches the other machine's shell as positional
 * parameter `$1`, never as script text, and the whole thing is quoted by ONE
 * call to `shellQuoteArgv`.
 *
 *  1. Tortie changes the mode only of a file or a directory it created itself.
 *     A file that was already there keeps whatever mode its owner gave it.
 *  2. The script uses `touch`, never a truncating operator. There is no `>` in
 *     it that is not part of a `>>`, so the promise not to overwrite is a
 *     property of the text rather than of a guard around it.
 *  3. `grep -qxF --` makes the whole thing safe to run twice. A second install
 *     for one machine adds no second line.
 *  4. The marker pair is the same recipe {@link REMOTE_PATH_MARKER} uses, so a
 *     chatty login file on the other machine cannot fake the answer.
 *
 * ## One rule this file follows, and a later edit must keep
 *
 * `./connection-test.ts` imports this module for the runner, and this module
 * imports one constant back from it, being `SSH_BATCH_MODE_INTERACTIVE`. That
 * constant stays where it is because the header of that file says why: the exec
 * plane must never be able to read it. Two modules importing each other is safe
 * only while neither reads the other's binding while its own body is running.
 * So NOTHING in this file may read an imported binding at module scope. Every
 * use is inside a function body, and `keyInstallRequiredOptions()` is a
 * function rather than an array for exactly that reason.
 */

import { createHash } from 'node:crypto';
import type { MachineTestClass } from '@shared/ipc';
import { gmuxError } from '../errors';
import { shellQuoteArgv } from '../restore/command';
import { SSH_CONNECT_TIMEOUT_SECONDS, composeKnownHostsOption } from './carriage';
import type { MachineHostKeyFiles } from './carriage';
import { machineRecordKey } from './confirm';
import type { MachineExecutionFields } from './confirm';
import { SSH_BATCH_MODE_INTERACTIVE } from './connection-test';
import {
  classifyMachineOutput,
  composeOutcomeCopy,
  lastPrintedLine,
  machineOutcomeCopy,
  type MachineOutcomeCopy
} from './errors';
import { isPublicKeyLine } from './key-material';

// ---------------------------------------------------------------------------
// The remote command
// ---------------------------------------------------------------------------

/** The pair the other machine wraps its one word answer in. */
export const REMOTE_KEY_MARKER = '__TORTIE_KEY__';

/**
 * The file this install writes on the other machine, as a person reads it.
 *
 * It is a display path rather than a resolved one, because the resolving is
 * done by the other machine's own shell from its own `HOME`. Tortie never
 * composes a home path for another computer.
 */
export const REMOTE_AUTHORIZED_KEYS_DISPLAY = '~/.ssh/authorized_keys';

/**
 * What the other machine runs. A constant, with no interpolation.
 *
 * The key arrives as `$1`. `$0` is the name `tortie-install-key`, which is
 * there so an error the other machine's shell prints names Tortie rather than
 * `sh`. Every line is plain text a person can read, and the four properties
 * that make it safe are in the header of this file.
 */
export const AUTHORIZED_KEYS_SCRIPT = [
  'set -e',
  'umask 077',
  'd="$HOME/.ssh"',
  'f="$d/authorized_keys"',
  'if [ ! -d "$d" ]; then mkdir -p "$d"; chmod 700 "$d"; fi',
  'if [ ! -f "$f" ]; then touch "$f"; chmod 600 "$f"; fi',
  'if grep -qxF -- "$1" "$f"; then s=present; else printf \'%s\\n\' "$1" >> "$f"; s=added; fi',
  'printf \'__TORTIE_KEY__%s__TORTIE_KEY__\\n\' "$s"'
].join('\n');

/** The name the script runs under, which is what `$0` becomes. */
export const AUTHORIZED_KEYS_SCRIPT_NAME = 'tortie-install-key';

/**
 * The whole remote command, quoted ONCE.
 *
 * It refuses a key line that is not one, before any array exists, so a string
 * that is not a public key can never reach a shell on another computer. The
 * check is {@link isPublicKeyLine}, which is the same one the gate reads.
 */
export function composeAuthorizedKeysCommand(publicKeyLine: string): string {
  assertPublicKeyLine(publicKeyLine);
  return shellQuoteArgv([
    '/bin/sh',
    '-c',
    AUTHORIZED_KEYS_SCRIPT,
    AUTHORIZED_KEYS_SCRIPT_NAME,
    publicKeyLine
  ]);
}

/** Refuse anything that is not one public key line. Nothing is composed first. */
function assertPublicKeyLine(publicKeyLine: string): void {
  if (isPublicKeyLine(publicKeyLine)) return;
  throw gmuxError(
    'INVALID_INPUT',
    'Tortie will not send that to another machine, because what it was given ' +
      'is not one public key line. Nothing was sent.'
  );
}

// ---------------------------------------------------------------------------
// The argv
// ---------------------------------------------------------------------------

/** How many times the client may ask for a password. It is one, and one only. */
export const SSH_PASSWORD_PROMPTS_MAX = 1;

/**
 * The five options that decide what this call can and cannot do.
 *
 * A function rather than an array, because one of these values is imported from
 * a module that imports this one. The header of this file has the rule.
 *
 *  - `BatchMode=no` is the one place in the tree that value appears, and the
 *    install reads the constant rather than repeating the literal.
 *  - `StrictHostKeyChecking=yes` rather than `ask`. This call never makes first
 *    contact with a machine. First contact belongs to the one visible
 *    connection test, where a person is watching and can read the question. An
 *    install that met an unknown machine would put a question on a surface with
 *    no answer field and then sit there until the deadline. Under `yes` it
 *    refuses at once and the person is told to run the connection test first.
 *  - `NumberOfPasswordPrompts=1`. The client itself gives up after one wrong
 *    password, so "never retry silently" is enforced by the program rather than
 *    by Tortie's own matching.
 *  - `PubkeyAuthentication=no` with `IdentitiesOnly=yes`. This call exists for
 *    the case where no key works, and the screen says a password will be used.
 *    A call that could quietly succeed on some other credential would make that
 *    sentence untrue, and it also means Tortie never offers the person's own
 *    identities to a machine on this path.
 */
export function keyInstallRequiredOptions(): readonly string[] {
  return [
    SSH_BATCH_MODE_INTERACTIVE,
    'StrictHostKeyChecking=yes',
    `NumberOfPasswordPrompts=${String(SSH_PASSWORD_PROMPTS_MAX)}`,
    'PubkeyAuthentication=no',
    'IdentitiesOnly=yes'
  ];
}

/**
 * macOS serves password sign in through keyboard-interactive, so both are
 * named. Nothing else is offered.
 */
export const KEY_INSTALL_AUTHENTICATIONS =
  'PreferredAuthentications=password,keyboard-interactive';

/**
 * The whole argv, composed from the fields, the two record files and the key.
 * Pure, and tested as such.
 *
 * `-p` appears only when a port is set and `-l` only when an account name is,
 * for the reason `composeTestArgv` gives: a default would put a value in the
 * command line that the person never chose and no hash covered.
 */
export function composeKeyInstallArgv(
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles,
  publicKeyLine: string
): string[] {
  // FIRST, before any array exists. A line that is not a public key produces no
  // argv at all rather than an argv nobody sends.
  assertPublicKeyLine(publicKeyLine);
  const argv: string[] = [];
  for (const option of keyInstallRequiredOptions()) argv.push('-o', option);
  argv.push('-o', `ConnectTimeout=${String(SSH_CONNECT_TIMEOUT_SECONDS)}`);
  argv.push('-o', composeKnownHostsOption(hostKeys));
  argv.push('-o', KEY_INSTALL_AUTHENTICATIONS);
  if (fields.port !== null) argv.push('-p', String(fields.port));
  if (fields.user !== null) argv.push('-l', fields.user);
  argv.push(fields.host);
  // ONE argument, carrying the whole remote command. There is no local shell
  // here: node-pty runs the client directly, so this element reaches ssh
  // verbatim and ssh hands it to the other machine's login shell.
  argv.push(composeAuthorizedKeysCommand(publicKeyLine));
  return argv;
}

/** The command line the transcript header shows. Pure. */
export function composeKeyInstallCommandLine(
  sshPath: string,
  fields: MachineExecutionFields,
  hostKeys: MachineHostKeyFiles,
  publicKeyLine: string
): string {
  return shellQuoteArgv([
    sshPath,
    ...composeKeyInstallArgv(fields, hostKeys, publicKeyLine)
  ]);
}

// ---------------------------------------------------------------------------
// The answer
// ---------------------------------------------------------------------------

const REMOTE_KEY_RE = new RegExp(
  `${REMOTE_KEY_MARKER}(.*?)${REMOTE_KEY_MARKER}`,
  's'
);

/**
 * Read the one word the other machine sent back.
 *
 * `added` means the file gained one line. `present` means the exact line was
 * already there and nothing was written. Null covers three cases that are one
 * answer to the caller: the markers never arrived, they arrived empty, and they
 * arrived carrying something that is not one of the two words.
 */
export function parseKeyInstallAnswer(text: string): 'added' | 'present' | null {
  const match = REMOTE_KEY_RE.exec(text);
  if (match === null) return null;
  const value = (match[1] ?? '').trim();
  if (value === 'added') return 'added';
  if (value === 'present') return 'present';
  return null;
}

/**
 * Decide the class from what came back.
 *
 * The order matters, and it is the order `classifyProbeOutput` uses for the
 * same reason. A marker pair carrying one of the two words is the one success,
 * and it wins over the exit code because the other machine said what it did. A
 * message the phrase table recognises comes next, because the text says what
 * happened while the code only says that something did. Anything else is
 * `unknown`, and {@link composeKeyInstallCopy} then says which kind of unknown
 * it was.
 *
 * THE EXIT CODE DECIDES NOTHING HERE, and the parameter is kept anyway. Every
 * answer this function can give is decided by the text, because the one success
 * is a word the other machine printed and every failure is a sentence the
 * client printed. The code still matters to the person, so
 * {@link composeKeyInstallCopy} reads it: an exit of zero with no marker is a
 * machine that let Tortie in and reported nothing, and that is a different
 * sentence from a machine that never answered. Keeping the parameter here holds
 * this function the same shape as `classifyProbeOutput`, so the two are read
 * side by side.
 */
export function classifyKeyInstallOutput(
  text: string,
  _exitCode: number
): MachineTestClass {
  if (parseKeyInstallAnswer(text) !== null) return 'key-installed';
  const named = classifyMachineOutput(text);
  if (named !== 'unknown') return named;
  return 'unknown';
}

/**
 * What the client prints when it will not talk to a machine it has no record
 * of.
 *
 * Under `StrictHostKeyChecking=yes` this is a first contact refusal rather than
 * the alarm. The alarm has its own phrases and `classifyMachineOutput` matches
 * those first, so a changed identity never reaches the branch this constant
 * decides.
 */
export const HOST_KEY_UNKNOWN_PHRASE = 'Host key verification failed';

// ---------------------------------------------------------------------------
// The sentences
// ---------------------------------------------------------------------------

export const MACHINE_KEY_WARNING =
  'Tortie will make a key for this machine and put its public half on that ' +
  'machine. The private half stays on this Mac in a file only your account ' +
  'can read.';

/** notes[0]. It stands above the password field, because it comes first. */
export const MACHINE_KEY_ORDER =
  'Turn on Remote Login on that machine first. A key on a machine that is not ' +
  'accepting connections still cannot sign in.';

/** notes[1]. */
export const MACHINE_KEY_NO_PASSPHRASE =
  'The key has no passphrase. A passphrase Tortie held for you would not be a ' +
  'passphrase, and one it asked you for on every connection would make the ' +
  'product unusable. What protects the key is the file it is in, which only ' +
  'your account on this Mac can read.';

/** notes[2]. */
export const MACHINE_KEY_PASSWORD_HONESTY =
  "Tortie asks for that machine's password once and sends it straight to " +
  'the sign in program. It keeps no copy. The password is not written to any ' +
  'file and it is not put in the keychain.';

/** notes[3]. */
export const MACHINE_KEY_TOUCHES =
  'Tortie adds one line to that file and changes nothing else in it. If the ' +
  'file or the folder it is in is not there yet, Tortie creates it and sets ' +
  'it so only you can read it. If either is already there, Tortie leaves its ' +
  'settings alone.';

/** notes[4]. */
export const MACHINE_KEY_THEN_TESTS =
  'When the key is on the machine, Tortie tests the connection again and ' +
  'shows you what the machine answers.';

/** The five notes, in the order the sheet draws them. */
export const MACHINE_KEY_NOTES: readonly string[] = [
  MACHINE_KEY_ORDER,
  MACHINE_KEY_NO_PASSPHRASE,
  MACHINE_KEY_PASSWORD_HONESTY,
  MACHINE_KEY_TOUCHES,
  MACHINE_KEY_THEN_TESTS
];

export const MACHINE_KEY_STALE =
  'Tortie did not set up a key, because the machine changed after it was ' +
  'shown. Read what it says now and agree to that. Nothing was sent to the ' +
  'machine.';

export const MACHINE_KEY_NO_ID =
  'Name this machine before Tortie makes a key for it. The name is part of ' +
  "what you are agreeing to, and it is what tells one machine's key from " +
  "another's.";

export const MACHINE_KEY_KEYGEN_MISSING =
  'Tortie could not find the program macOS uses to make a key, at ' +
  '/usr/bin/ssh-keygen. That program ships with macOS, so a missing one means ' +
  'something removed it or the disk is damaged. Nothing was sent to the ' +
  'machine.';

export const MACHINE_KEY_PASSWORD_REFUSED =
  'That machine did not accept the password. Tortie stopped there and did not ' +
  'try again. Nothing was added to that machine, and Tortie kept no copy of ' +
  'what you typed.';

export const MACHINE_KEY_UNKNOWN_MACHINE =
  'Tortie has not met this machine yet, so it will not send a password to it. ' +
  "Test the connection first. That is where you read the machine's " +
  'identity and answer for it.';

export const MACHINE_KEY_NOT_WRITTEN =
  'Tortie signed in to that machine and the machine did not report that the ' +
  'key was added. Nothing about this Mac changed. Read the lines above for ' +
  'what the machine printed.';

/** What every occurrence of the password bytes becomes before anything is shown. */
export const MACHINE_KEY_PASSWORD_REDACTED = '[the password you typed]';

/**
 * The two headlines Tortie writes for this path, and why they are not the
 * table's.
 *
 * `./errors.ts` has one headline per class, and for two of the answers this
 * path can produce the table's headline would be false. A machine that refused
 * first contact was reached, so "Tortie could not reach this machine" is wrong
 * about it, and a machine that signed Tortie in and reported nothing was
 * reached too. Each of these stands above its own sentence below, and neither
 * repeats it.
 */
export const MACHINE_KEY_NO_PASSWORD_SENT_HEADLINE =
  'Tortie did not send a password.';
export const MACHINE_KEY_NOT_WRITTEN_HEADLINE =
  'The key was not added to that machine.';

/**
 * The finished copy for one install, composed in main.
 *
 * The renderer writes none of these sentences, for the reason the connection
 * test's are composed in main: a later edit to a renderer file must not be able
 * to draw a refusal as a success. `alarm` stays a field rather than a rule the
 * renderer applies, and the one alarming class keeps the table's own alarming
 * copy untouched.
 */
export function composeKeyInstallCopy(input: {
  cls: MachineTestClass;
  text: string;
  exitCode: number | null;
}): MachineOutcomeCopy {
  const { cls, text, exitCode } = input;
  if (cls === 'key-installed') return machineOutcomeCopy('key-installed');
  if (cls === 'auth-refused') {
    return {
      ...machineOutcomeCopy('auth-refused'),
      detail: MACHINE_KEY_PASSWORD_REFUSED
    };
  }
  if (cls === 'unknown' && text.includes(HOST_KEY_UNKNOWN_PHRASE)) {
    return {
      class: 'unknown',
      alarm: false,
      headline: MACHINE_KEY_NO_PASSWORD_SENT_HEADLINE,
      detail: MACHINE_KEY_UNKNOWN_MACHINE
    };
  }
  if (cls === 'unknown' && exitCode === 0) {
    return {
      class: 'unknown',
      alarm: false,
      headline: MACHINE_KEY_NOT_WRITTEN_HEADLINE,
      detail: MACHINE_KEY_NOT_WRITTEN
    };
  }
  return composeOutcomeCopy(cls, { lastLine: lastPrintedLine(text) });
}

// ---------------------------------------------------------------------------
// The password
// ---------------------------------------------------------------------------

/**
 * What the client's own password question looks like.
 *
 * It is matched against output that arrived AFTER the last thing Tortie
 * answered, so one question is answered once. A second question after the
 * password has been sent means the machine refused it, and the runner in
 * `./connection-test.ts` kills the client there rather than answering twice.
 */
export const PASSWORD_PROMPT_RE = /(?:^|\n)[^\n]{0,200}[Pp]assword:[ ]?$/;

/**
 * The same question, matched wherever it sits in the text rather than only at
 * the end of it (Phase 79.1 fix round).
 *
 * {@link PASSWORD_PROMPT_RE} answers "is the client waiting for a password
 * RIGHT NOW", which is what the two runners need while a client is alive. This
 * one answers "did a password question ever get printed", which is what a
 * finished transcript is asked. `./connection-test.ts` uses it in
 * `classifyProbeOutput`, so a client that printed the question and then exited
 * on its own is given the same class as one Tortie stopped at the question.
 *
 * The `m` flag is the whole difference: `$` then means the end of a line
 * rather than the end of the text. A line reading `your password: is wrong` is
 * still not a match, because the question has to end its line.
 */
export const PASSWORD_PROMPT_SEEN_RE = /^[^\n]{0,200}[Pp]assword:[ ]*\r?$/m;

/**
 * Replace every occurrence of the exact password bytes before any text leaves
 * main.
 *
 * The client does not echo a password, so this should never fire. It is here
 * because "should never" is not a measurement. An empty password is returned
 * unchanged, because replacing an empty string would rewrite every position in
 * the text.
 */
export function redactPassword(text: string, password: string): string {
  if (password.length === 0) return text;
  return text.split(password).join(MACHINE_KEY_PASSWORD_REDACTED);
}

// ---------------------------------------------------------------------------
// The agreement
// ---------------------------------------------------------------------------

/** Names the algorithm, so a hash written by an older build cannot match. */
export const MACHINE_KEY_HASH_ALGORITHM = 'sha256-machine-key-v1';

/** The facts one install is bound to, beside the machine id and the remote file. */
export interface KeyInstallFacts {
  readonly host: string;
  readonly user: string | null;
  readonly port: number | null;
  /** The absolute local path of the private half. */
  readonly localKeyPath: string;
}

/**
 * How each fact is turned into hash input.
 *
 * The mapped type covers EVERY key of {@link KeyInstallFacts}, so a field added
 * to that type without a line here is a compile error rather than a field that
 * silently falls out of the hash. The key order is taken from this object and
 * sorted, so there is no second list to keep in step with it.
 */
type Normalizers = {
  readonly [K in keyof KeyInstallFacts]-?: (
    value: KeyInstallFacts[K]
  ) => unknown;
};

const NORMALIZE: Normalizers = {
  host: (v) => v,
  user: (v) => v,
  port: (v) => v,
  localKeyPath: (v) => v
};

/**
 * The text that is hashed. Exported so a test can read what was covered.
 *
 * The third argument exists so the gate can vary the remote file path the way
 * it varies every other covered fact. No production caller passes it, and the
 * one that matters is {@link describeKeyInstall}, which takes the constant.
 */
export function canonicalKeyInstallText(
  id: string,
  facts: KeyInstallFacts,
  remoteFilePath: string = REMOTE_AUTHORIZED_KEYS_DISPLAY
): string {
  const keys = (Object.keys(NORMALIZE) as (keyof KeyInstallFacts)[]).sort();
  const rows: [string, unknown][] = [['id', machineRecordKey(id)]];
  for (const key of keys) {
    const normalize = NORMALIZE[key] as (value: unknown) => unknown;
    rows.push([key, normalize(facts[key])]);
  }
  rows.push(['remoteFilePath', remoteFilePath]);
  return `${MACHINE_KEY_HASH_ALGORITHM}\n${JSON.stringify(rows)}`;
}

/**
 * The hash this agreement is bound to.
 *
 * The record key is part of the input, so a sheet a person read for one machine
 * cannot install a key on another. It can never equal that machine's execution
 * hash, because the algorithm name is the first line of both canonical texts
 * and the two names are different.
 */
export function keyInstallHash(
  id: string,
  facts: KeyInstallFacts,
  remoteFilePath: string = REMOTE_AUTHORIZED_KEYS_DISPLAY
): string {
  return createHash('sha256')
    .update(canonicalKeyInstallText(id, facts, remoteFilePath))
    .digest('hex');
}

/**
 * Everything the block shows, composed in main.
 *
 * `lines` is exactly the hashed facts, in order, the way `describeMachine`
 * composes its own. The warning and the notes are shown beside them and are
 * deliberately not in that list, because the list is what the person agreed to
 * and it must not carry anything the hash does not cover.
 */
export function describeKeyInstall(
  id: string,
  facts: KeyInstallFacts
): {
  readonly hash: string;
  readonly lines: readonly string[];
  readonly warning: string;
  readonly notes: readonly string[];
} {
  const lines: string[] = [];
  lines.push(`Machine: ${facts.host}`);
  if (facts.user !== null) lines.push(`Signs in as: ${facts.user}`);
  if (facts.port !== null) lines.push(`Port: ${String(facts.port)}`);
  lines.push(
    `Writes this file on that machine: ${REMOTE_AUTHORIZED_KEYS_DISPLAY}`
  );
  lines.push(
    `Keeps the private half of the key on this Mac, at: ${facts.localKeyPath}`
  );
  return {
    hash: keyInstallHash(id, facts),
    lines,
    warning: MACHINE_KEY_WARNING,
    notes: MACHINE_KEY_NOTES
  };
}
