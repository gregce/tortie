/**
 * The one place a credential is handed to `security`, and the shape of that
 * hand off (Phase 204).
 *
 * ## NO SECRET IS EVER ON AN ARGV
 *
 * orca writes its managed items with the payload on the command line
 * (`src/main/claude-accounts/keychain.ts`, its `-w "<payload>"`), and this
 * phase refuses that: an argv is readable by every process on the machine for
 * as long as the call lives. So every WRITE goes through `security -i`, which
 * reads its whole command from STDIN, and the payload is sent as HEX with
 * `-X`. Measured on 2026-09-02 on a scratch keychain this file made:
 *
 *  - `-X <hex>` round trips a payload holding double quotes, backslashes and
 *    newlines exactly, and `-w "<escaped>"` does not: the `-i` tokenizer ends
 *    the command at the first newline and answers `unknown command`.
 *  - `-U` updates the item IN PLACE. One item before, one item after, and the
 *    access control list is the one the item already had.
 *  - a payload that is not printable comes BACK as hex from `find-generic-
 *    password -w`, which is why {@link decodeKeychainPayload} exists.
 *
 * ## WHY THE VENDOR CAN STILL READ WHAT TORTIE WROTE
 *
 * Measured against the installed claude binary, version 2.1.259, an arm64
 * Mach-O: it names `/usr/bin/security`, `find-generic-password` and
 * `add-generic-password` in its own strings. So the vendor reaches its
 * keychain item through the same program this file does, and an item whose
 * access control list trusts `/usr/bin/security` is an item the vendor reads
 * without a prompt. Nothing here ever passes `-A`, which would trust every
 * program on the machine and would be a downgrade of the person's own
 * credential.
 *
 * ## WHAT IS NEVER LOGGED
 *
 * Nothing in this file writes a log line, and no error it raises carries the
 * payload, its length or any part of it. `security` writes the item's name to
 * its own output on failure and never the secret, and even that is not
 * forwarded: a failure answers a fixed sentence naming the service.
 */

import { execFile } from 'node:child_process';

/** How long any one `security` call may take. */
export const SECURITY_TIMEOUT_MS = 10_000;

/** The program, named once. Nothing composes this from a setting. */
export const SECURITY_BIN = '/usr/bin/security';

/**
 * The seam. The gate and the tests hand in their own and touch no keychain.
 *
 * `stdin` is how the write is made: the whole command line goes over the pipe,
 * so the payload reaches no argv.
 */
export interface SecurityRunner {
  run(
    argv: readonly string[],
    stdin?: string
  ): Promise<{ code: number; stdout: string }>;
}

let calls = 0;

/**
 * How many times the real `security` has been run by this process. A number
 * for a boot line and nothing else; nothing about any call is kept.
 */
export function securityCallCount(): number {
  return calls;
}

/**
 * A keychain file path this file will append to a `security` command line.
 *
 * It goes inside double quotes in the `-i` form, so the same three characters
 * {@link isPlainSecurityName} refuses are refused here, and a relative path is
 * refused because `security` would resolve it against a directory this process
 * did not choose.
 */
export function isPlainKeychainPath(path: string): boolean {
  if (typeof path !== 'string' || path === '') return false;
  if (!path.startsWith('/')) return false;
  if (path.length > 1024) return false;
  return !/["\\\n\r]/.test(path);
}

/**
 * The real `security`, over the login keychain, or over ONE keychain file.
 *
 * `keychainFile` is the Phase 208 harness seam. MEASURED on 2026-09-03 on a
 * scratch keychain made with `security create-keychain` under a scratch
 * directory and never added to the search list: every verb this file uses,
 * being `find-generic-password`, `delete-generic-password` and the
 * `add-generic-password` line sent over `-i`, takes a trailing keychain path
 * and acts on that keychain alone. With the path given, an item written was
 * found by name in the scratch keychain and NOT found in the login keychain,
 * `-U` still updated in place leaving one item, `-w` printed the payload back
 * exactly, and `delete-keychain` removed the file. So a launch that carries the
 * seam never reads, writes or deletes an item in the person's own keychain,
 * whatever names it composes. The shipped app passes nothing here.
 */
export function defaultSecurityRunner(keychainFile?: string): SecurityRunner {
  const file =
    keychainFile !== undefined && isPlainKeychainPath(keychainFile)
      ? keychainFile
      : null;
  if (keychainFile !== undefined && file === null) {
    throw new Error('the keychain file for security is not a path this domain will name');
  }
  return {
    run: (argv, stdin) =>
      new Promise((resolve) => {
        calls += 1;
        const line = [...argv];
        let input = stdin;
        if (file !== null) {
          if (argv[0] === '-i') {
            // THE COMMAND IS ON STDIN, so the keychain goes on the end of it,
            // inside the same quotes the service and the account already use.
            input =
              stdin === undefined
                ? undefined
                : `${stdin.replace(/\n$/, '')} "${file}"\n`;
          } else {
            line.push(file);
          }
        }
        const child = execFile(
          SECURITY_BIN,
          line,
          { timeout: SECURITY_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
          (err, stdout) => {
            resolve({
              code: err === null ? 0 : 1,
              stdout: typeof stdout === 'string' ? stdout : ''
            });
          }
        );
        if (input !== undefined) {
          child.stdin?.end(input);
        }
      })
  };
}

/**
 * A name this file will put inside double quotes in a `security -i` command.
 *
 * The tokenizer understands double quotes with backslash escapes and ends the
 * command at a newline, so a name holding a quote, a backslash or a newline
 * could change what command runs. Every name Tortie composes is a service name
 * or an account name it minted or read back from an item it owns, so this is a
 * refusal rather than an escaping problem, and refusing is the safe half.
 */
export function isPlainSecurityName(name: string): boolean {
  if (typeof name !== 'string') return false;
  if (name.length === 0 || name.length > 200) return false;
  return /^[A-Za-z0-9 ._@+-]+$/.test(name);
}

/**
 * What `find-generic-password -w` printed, as the bytes the item holds.
 *
 * MEASURED: `security` prints the payload verbatim when it is printable and
 * prints it as HEX when it is not, and in both cases it adds exactly one
 * trailing newline. A trim would corrupt a payload with trailing spaces, so
 * exactly one newline is removed and nothing else.
 *
 * THE DISAMBIGUATION, and it follows from the same measurement. `security`
 * prints hex ONLY when the payload is not printable. So a run of hex digits
 * whose decoding is itself printable cannot be a hex PRINTING, because the
 * payload it would have come from would have been printed raw: the text is the
 * payload. The decoding is taken only when it holds a character `security`
 * would have refused to print, which is what forced the hex form.
 *
 * A residual ambiguity is left on purpose and it is harmless: a payload whose
 * own text is the hex of a control character is read as that control
 * character. Every write in this domain is verified by reading it back and
 * comparing bytes, so a payload that cannot survive this round trip refuses
 * the write rather than corrupting a store. Neither vendor writes one: both
 * write JSON, which is never a run of hex digits.
 */
export function decodeKeychainPayload(raw: string): string {
  const text = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
  if (text.length === 0) return text;
  if (text.length % 2 !== 0 || !/^[0-9a-f]+$/.test(text)) return text;
  const bytes = Buffer.from(text, 'hex');
  const decoded = bytes.toString('utf8');
  // Not valid UTF-8, so it was never a payload this product wrote.
  if (!Buffer.from(decoded, 'utf8').equals(bytes)) return text;
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000a-\u001f\u007f]/.test(decoded) ? decoded : text;
}

/** The item's payload, or null when there is no such item. */
export async function keychainRead(
  runner: SecurityRunner,
  service: string
): Promise<string | null> {
  if (!isPlainSecurityName(service)) return null;
  const { code, stdout } = await runner.run([
    'find-generic-password',
    '-s',
    service,
    '-w'
  ]);
  if (code !== 0) return null;
  const payload = decodeKeychainPayload(stdout);
  return payload === '' ? null : payload;
}

/** The item's `acct` attribute, or null. Asks for ATTRIBUTES and never `-w`. */
export async function keychainAccount(
  runner: SecurityRunner,
  service: string
): Promise<string | null> {
  if (!isPlainSecurityName(service)) return null;
  const { code, stdout } = await runner.run([
    'find-generic-password',
    '-s',
    service
  ]);
  if (code !== 0) return null;
  const found = /"acct"<blob>="([^"\n]*)"/.exec(stdout);
  return found === null || found[1] === undefined || found[1] === ''
    ? null
    : found[1];
}

/** Does an item with this service name exist? Attributes only, no payload. */
export async function keychainHasItem(
  runner: SecurityRunner,
  service: string
): Promise<boolean> {
  if (!isPlainSecurityName(service)) return false;
  const { code } = await runner.run(['find-generic-password', '-s', service]);
  return code === 0;
}

/**
 * Write one item, updating in place when it is already there.
 *
 * THE PAYLOAD GOES OVER STDIN AS HEX and reaches no argv. `-U` is what makes
 * this an update rather than a second item beside the first.
 */
export async function keychainWrite(
  runner: SecurityRunner,
  service: string,
  account: string,
  payload: string
): Promise<boolean> {
  if (!isPlainSecurityName(service)) return false;
  if (!isPlainSecurityName(account)) return false;
  if (payload === '') return false;
  const hex = Buffer.from(payload, 'utf8').toString('hex');
  const command = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\n`;
  const { code } = await runner.run(['-i'], command);
  return code === 0;
}

/** Remove one item. A missing item is not a failure. */
export async function keychainDelete(
  runner: SecurityRunner,
  service: string
): Promise<void> {
  if (!isPlainSecurityName(service)) return;
  await runner.run(['delete-generic-password', '-s', service]);
}
