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
 *  - `-U` updates the item rather than adding a second one. One item before,
 *    one item after, and the access control list is the one the item already
 *    had. Its PLACE is not kept: Phase 281's keychain verifier measured the
 *    updated item moving behind every other item of the same service name.
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
 * ## HOW THE VENDOR ADDRESSES ITS ITEM, AND WHY EVERY CALL HERE DOES THE SAME
 *
 * The same program is only half of it. Claude Code names its item by SERVICE
 * AND ACCOUNT: its read, its write over `-i`, its delete and its startup read
 * all pass `-a` with its account function `Cv` (bundle offset 170,928,749 in
 * 2.1.274) against the service `mI("-credentials")` gives, and none of them
 * asks by service alone (research 126 §2.4 and §5, and the Phase 281 spec §1).
 * Until Phase 281 every reader here asked by service alone, and on the
 * operator's machine that name matched TWO items: `security` handed back a
 * stray under another account, which gave no usable credential, while every
 * claude session read the item under his user name.
 *
 * So every function below that names a service takes the account as an
 * explicit argument, and a name in the vendor's namespace
 * (`../usage/credentials.ts`'s `isClaudeVendorService`) with no account, or
 * with an account this file will not name, is REFUSED before anything is
 * spawned. There is no lookup without `-a` to fall back to, because that
 * lookup is exactly the read that landed on the stray. Tortie's own vault
 * names are not the vendor's and pass no account, so their command lines are
 * the ones they always were.
 *
 * ## WHAT IS NEVER LOGGED
 *
 * Nothing in this file writes a log line, and no error it raises carries the
 * payload, its length or any part of it. `security` writes the item's name to
 * its own output on failure and never the secret, and even that is not
 * forwarded: a failure answers a fixed sentence naming the service.
 */

import { runGuarded } from '../proc/guarded';
import { isClaudeVendorService } from '../usage/credentials';
import { credentialsAreOpen, ownCredentialChild } from './lifecycle';
import { decodeKeychainPayload } from './security-print';
import { CredentialTooLarge } from './swap';

/** How long any one `security` call may take. */
export const SECURITY_TIMEOUT_MS = 10_000;

/**
 * The longest `-i` line this domain will hand `security`, in BYTES, trailing
 * newline and any keychain suffix included (Phase 287, replacing the Phase
 * 281.1 cap that compared UTF-16 units).
 *
 * MEASURED four times on 2026-09-17, and again independently by this phase's
 * attacker with three line shapes of its own, on macOS 15.7.9 (24G830) against
 * `/usr/bin/security` from `Security-61439.140.12.706.1`. Every run was under a
 * scratch `HOME` where `security default-keychain` answers "could not be found",
 * on a scratch keychain named by the LAST token of the line. Apple's
 * `SecurityTool` source is not on that machine, so the edges below are measured
 * and not read; `build/p287/SPEC.md` §1 has every run.
 *
 *  - `security -i` reads at most 4,095 BYTES of command per read, so the longest
 *    line that arrives whole is 4,096 bytes with its newline. At 4,096 an
 *    `add-generic-password` line writes and reads back byte for byte.
 *  - at 4,097 bytes the last byte before the newline is split off and read as a
 *    second command. With the closing quote there, `security` prints its usage;
 *    with a space there, nothing is printed. The first half still writes,
 *    because the tokenizer accepts an unterminated trailing quote.
 *  - at 4,098 bytes and above the keychain path loses its own last byte, names a
 *    keychain that does not exist, NOTHING is written to the one that was meant
 *    (`find-generic-password` answers 44), and the process does not exit with
 *    stdin at end of file until it is killed.
 *  - THE BUFFER COUNTS BYTES. A 4,098 byte line of 4,088 characters hangs while
 *    a 4,096 byte line of 4,096 characters writes. The Phase 281.1 cap compared
 *    `.length`, and the one component of Tortie's line that can carry non-ASCII
 *    is the harness keychain path: measured at `a4f44588`, a scratch path of 100
 *    accented letters passed that cap and the shipping runner sent 4,100 bytes.
 *
 * ## WHY 4,000, AND THE THREE REASONS IT DOES NOT MOVE UP
 *
 * It is the measured 4,096 less a stated margin of 96 bytes. Every line Tortie
 * composes is ASCII — a service and an account pass
 * {@link isPlainSecurityName}'s `[A-Za-z0-9 ._@+-]` and the payload is hex — so
 * for every shipping line the byte count equals `.length`, and no line that
 * passed the old cap is refused by this one. Claude Code's own writer switches
 * to the argv form at 4,032 (bundle 2.1.274, its `Z`, offset 170,935,555), 64
 * below the buffer, which is the same buffer read from the other side. And the
 * buffer belongs to one OS build, which an update can move.
 *
 * ## NOTHING OVER IT REACHES A SPAWN, ON ANY PATH
 *
 * {@link keychainWrite} rejects with `CredentialTooLarge` before it calls its
 * runner, and {@link defaultSecurityRunner} answers `tooLong` for a line its own
 * keychain suffix takes over, before it even counts the call. So a harness run
 * can never lose the scratch keychain path off the end of a line and aim a write
 * at the default keychain, and a real run never spends its ten second deadline
 * on the hang. Phase 287 keeps that refusal and makes it SAY so: see
 * `../../shared/login-copy.ts`'s `LOGIN_TOO_LARGE_SENTENCE`.
 */
export const SECURITY_LINE_MAX_BYTES = 4_000;

/**
 * Does this whole `-i` line fit the measured buffer? (Phase 287)
 *
 * THE ONE COMPARISON AGAINST THE CAP IN THE TREE, and it counts BYTES. It is a
 * function rather than an inline test at each site so that a second site cannot
 * come to compare UTF-16 units again, which is the defect
 * {@link SECURITY_LINE_MAX_BYTES} records. It is handed the WHOLE line, trailing
 * newline and any keychain suffix included.
 */
export function securityLineFits(line: string): boolean {
  return Buffer.byteLength(line, 'utf8') <= SECURITY_LINE_MAX_BYTES;
}

/** The program, named once. Nothing composes this from a setting. */
export const SECURITY_BIN = '/usr/bin/security';

/**
 * The seam. The gate and the tests hand in their own and touch no keychain.
 *
 * `stdin` is how the write is made: the whole command line goes over the pipe,
 * so the payload reaches no argv.
 *
 * `tooLong` is how a runner says it refused an `-i` line as too long for the
 * measured buffer rather than running one that failed (Phase 287). It is
 * OPTIONAL, so every fake runner in the tree still satisfies this seam, and
 * {@link keychainWrite} is the one reader of it.
 */
export interface SecurityRunner {
  run(
    argv: readonly string[],
    stdin?: string
  ): Promise<{ code: number; stdout: string; tooLong?: true }>;
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
export function defaultSecurityRunner(
  keychainFile?: string,
  /**
   * PHASE 220. The program, so a test can drive the SHIPPING runner over a
   * child of its own that never exits, which is the only way to prove the
   * cancel really ends something. It defaults to {@link SECURITY_BIN}, no
   * shipping caller passes it, and nothing a person or an agent can write
   * reaches this argument. `../usage/credentials.ts` takes the same seam for
   * the same reason and says so in the same words.
   */
  bin: string = SECURITY_BIN
): SecurityRunner {
  const file =
    keychainFile !== undefined && isPlainKeychainPath(keychainFile)
      ? keychainFile
      : null;
  if (keychainFile !== undefined && file === null) {
    throw new Error('the keychain file for security is not a path this domain will name');
  }
  return {
    run: async (argv, stdin) => {
      // PHASE 220. NO NEW CHILD AFTER ADMISSION CLOSES. A call that arrives
      // during the quit answers the way a `security` that found nothing
      // answers, which every caller in this domain already treats as "no item"
      // or as a refusal, so nothing has to learn a new failure.
      if (!credentialsAreOpen()) return { code: 1, stdout: '' };
      // PHASE 287. THE LINE IS COMPOSED BEFORE THE CALL IS COUNTED, because a
      // line refused below runs nothing and must not move
      // {@link securityCallCount}. Phase 281.1 counted first and refused after,
      // so a harness runner's refusal showed up in the boot line as a call.
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
      // A LINE `security` WOULD CUT IS NEVER SENT (Phase 281.1, by BYTES since
      // Phase 287). The suffix above is what {@link keychainWrite}'s own check
      // cannot see, and a cut line loses exactly that suffix, which is the
      // keychain the write was meant for. `tooLong` is what tells this refusal
      // apart from `security`'s own exit 1, so the one write can name the reason
      // instead of reporting an ordinary failure.
      // {@link SECURITY_LINE_MAX_BYTES} has the measurement.
      if (argv[0] === '-i' && input !== undefined && !securityLineFits(input)) {
        return { code: 1, stdout: '', tooLong: true };
      }
      calls += 1;
      // PHASE 220. THROUGH `../proc/guarded` RATHER THAN A BARE `execFile`.
      // This was the one child in the product that nothing could reach: not
      // `reapGuardedChildren()` at quit, and not this domain's own disposer,
      // which did not exist. `runGuarded` puts it in the same registry every
      // other guarded child is in, always settles inside its deadline, and
      // takes an abort signal so {@link joinCredentialShutdown} can end it at
      // its own point. The argv is the same argv, the deadline is the same ten
      // seconds, and the payload still goes over stdin and reaches no command
      // line.
      const child = ownCredentialChild();
      try {
        const run = await runGuarded(bin, line, {
          timeoutMs: SECURITY_TIMEOUT_MS,
          maxOutputBytes: 4 * 1024 * 1024,
          cancel: child.signal,
          ...(input === undefined ? {} : { stdin: input })
        });
        if (run.spawnError !== null || run.timedOut || run.cancelled) {
          return { code: 1, stdout: '' };
        }
        return { code: run.code === 0 ? 0 : 1, stdout: run.stdout };
      } finally {
        child.done();
      }
    }
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
 * What `find-generic-password -w` printed, as the bytes the item holds. It
 * lives in `./security-print.ts` since Phase 281, which imports nothing, so
 * the usage reader can decode without importing this file: this file asks
 * `../usage/credentials.ts` which names are the vendor's, and each importing
 * the other would be a runtime cycle. Re-exported here, beside the runner whose
 * output it reads.
 */
export { decodeKeychainPayload } from './security-print';

/**
 * The `-a` and `-s` half of a command line for one item, or null for an item
 * this file refuses to name (Phase 281).
 *
 * A VENDOR NAME WITHOUT AN ACCOUNT IS REFUSED, FAIL CLOSED. `null`, `''`, an
 * account {@link isPlainSecurityName} refuses, and `undefined` all refuse it,
 * the last because an untyped build probe can still call with two arguments
 * and must reach no lookup by service alone that way either. A name that is
 * not the vendor's with no account keeps the `-s` form it always had, which is
 * what Tortie's own vault names send. An account, when there is one, goes
 * BEFORE `-s`, in the order Claude Code's own argv uses and the one
 * {@link keychainWrite}'s `-i` line already had.
 */
function itemAddress(
  service: string,
  account: string | null | undefined
): readonly string[] | null {
  if (!isPlainSecurityName(service)) return null;
  if (account === null || account === undefined) {
    return isClaudeVendorService(service) ? null : ['-s', service];
  }
  if (!isPlainSecurityName(account)) return null;
  return ['-a', account, '-s', service];
}

/**
 * The item's payload, or null when there is no such item.
 *
 * `account` is REQUIRED and admits null so every call site states it: the
 * vendor's account for a vendor name, and null for Tortie's own names.
 */
export async function keychainRead(
  runner: SecurityRunner,
  service: string,
  account: string | null
): Promise<string | null> {
  const address = itemAddress(service, account);
  if (address === null) return null;
  const { code, stdout } = await runner.run([
    'find-generic-password',
    ...address,
    '-w'
  ]);
  if (code !== 0) return null;
  const payload = decodeKeychainPayload(stdout);
  return payload === '' ? null : payload;
}

/**
 * The item's `acct` attribute, or null. Asks for ATTRIBUTES and never `-w`.
 *
 * Asked with `-a` for a vendor name, so what it answers is that account read
 * back from the item it names, or null when no item under that account exists.
 * It no longer tells Tortie which account to write under: that is the vendor's
 * rule, never whatever item a name happened to match (Phase 281).
 */
export async function keychainAccount(
  runner: SecurityRunner,
  service: string,
  account: string | null
): Promise<string | null> {
  const address = itemAddress(service, account);
  if (address === null) return null;
  const { code, stdout } = await runner.run(['find-generic-password', ...address]);
  if (code !== 0) return null;
  const found = /"acct"<blob>="([^"\n]*)"/.exec(stdout);
  return found === null || found[1] === undefined || found[1] === ''
    ? null
    : found[1];
}

/**
 * The item's `mdat` attribute, being when it was last written, or null.
 * Asks for ATTRIBUTES and never `-w` (Phase 211 fix round).
 *
 * IT EXISTS FOR THE KEYCHAIN BACKSTOP. The first build fingerprinted the
 * `acct` attribute, which the vendor sets to `USER`, else the user name, else
 * `claude-code-user` (`Cv` at bundle offset 170,928,749 in 2.1.274), and
 * never changes on a sign in, so a credential rewritten with no file moving
 * never moved the fingerprint and the backstop could not see the one thing it
 * exists for. The modification date moves on every write and is an attribute
 * like any other.
 */
export async function keychainModified(
  runner: SecurityRunner,
  service: string,
  account: string | null
): Promise<string | null> {
  const address = itemAddress(service, account);
  if (address === null) return null;
  const { code, stdout } = await runner.run(['find-generic-password', ...address]);
  if (code !== 0) return null;
  const found = /"mdat"<timedate>=0x[0-9A-Fa-f]+\s+"([^"\n]*)"/.exec(stdout);
  return found === null || found[1] === undefined || found[1] === ''
    ? null
    : found[1];
}

/**
 * Does the item at this service, and this account when one is given, exist?
 * Attributes only, no payload.
 */
export async function keychainHasItem(
  runner: SecurityRunner,
  service: string,
  account: string | null
): Promise<boolean> {
  const address = itemAddress(service, account);
  if (address === null) return false;
  const { code } = await runner.run(['find-generic-password', ...address]);
  return code === 0;
}

/**
 * Write one item, updating in place when it is already there.
 *
 * THE PAYLOAD GOES OVER STDIN AS HEX and reaches no argv. `-U` is what makes
 * this an update rather than a second item beside the first.
 *
 * A LINE THAT DOES NOT FIT {@link SECURITY_LINE_MAX_BYTES} IS REFUSED before the
 * runner sees it (Phase 281.1, by BYTES since Phase 287): `security -i` cuts
 * such a line and hangs, measured, and the cut end is where a harness keychain
 * path goes.
 *
 * IT IS THE ONE REFUSAL HERE THAT REJECTS INSTEAD OF ANSWERING FALSE
 * (Phase 287). Every other one — a name {@link isPlainSecurityName} refuses, an
 * empty payload, a non-zero exit — still answers false, because false is all a
 * caller can do anything with. This one has a sentence of its own that a person
 * reads, and `false` cannot carry which refusal it was: the one caller already
 * throws on false (`./stores.ts`'s `keychainTarget`, the vendor's own item), so
 * the rejection travels the same road, and `./swap.ts`'s two catches are the
 * only things that read it. The runner's own `tooLong` becomes the same
 * rejection, because the keychain suffix it appends is the part of the line
 * this function cannot see.
 *
 * SINCE PHASE 304 THIS IS THE ONLY WRITE TO ANY KEYCHAIN IN THE DOMAIN. Tortie's
 * own store is a sealed file (`./vault.ts`), and its legacy arm reads and
 * deletes the items an older tree kept and cannot reach this function at all,
 * by type. So the ceiling above is the vendor's item's alone.
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
  if (!securityLineFits(command)) throw new CredentialTooLarge();
  const answer = await runner.run(['-i'], command);
  if (answer.tooLong === true) throw new CredentialTooLarge();
  return answer.code === 0;
}

/**
 * Remove one item, and SAY WHETHER IT WENT (Phase 219).
 *
 * It answered `void` until Phase 219, so every caller that counted a delete
 * counted the ASKING rather than the doing: a runner answering `security`'s
 * exit 44 to all six deletes of a migration still left `{deleted: 2}` in the
 * result and both old items on the machine. True means `security` exited 0.
 * Anything else, including the 44 it uses for an item it could not find, is
 * false, because every caller here reads the item first and a thing that was
 * there a moment ago and cannot now be found is an anomaly worth counting
 * rather than a tidy no-op. A name this module refuses is never asked at all,
 * which is a refusal and so also false.
 *
 * A vendor name is deleted under the vendor's account and no other (Phase
 * 281): `delete-generic-password -s` alone removes the FIRST item the name
 * matches, and on the operator's machine that is a stray under another
 * account, which nothing in Tortie may remove.
 */
export async function keychainDelete(
  runner: SecurityRunner,
  service: string,
  account: string | null
): Promise<boolean> {
  const address = itemAddress(service, account);
  if (address === null) return false;
  const { code } = await runner.run(['delete-generic-password', ...address]);
  return code === 0;
}
