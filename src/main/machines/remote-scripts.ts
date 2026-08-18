/**
 * The catalogue of commands Tortie may run on another machine (Phase 73, M6).
 *
 * ## Why a second list exists beside the verb ledger
 *
 * `./exec-plane.ts` owns the verb ledger, and every entry on it is a tmux verb.
 * This rung needs four things that are not tmux verbs: a directory listing, a
 * file read, a git read and one file write. `execRemoteShell` already carries a
 * command to a machine's own login shell, and until this phase it had exactly
 * one caller, being the program search list capture.
 *
 * Opening that door to four more callers with no discipline would undo the
 * property the verb ledger exists for, because a login shell runs anything. So
 * the second door gets its own list, and this list is stronger than the first
 * one for that reason.
 *
 * **The rule, and it is the whole design.**
 *
 * > A command that crosses to a machine is one of Tortie's own constant
 * > scripts, chosen from this catalogue by name. Values reach the far side as
 * > positional parameters. No script text is ever composed, interpolated or
 * > concatenated at run time.
 *
 * `./key-install.ts` already followed that rule for one script. This file
 * writes it down once, and `build/conformance-machines.mjs` conditions 35 to 40
 * make it checkable by reading the text rather than by trusting this comment.
 *
 * ## What is in this file and what is not
 *
 * This module is pure data and it imports nothing at all, not even a type from
 * another module in this directory. So nothing it holds can depend on a
 * connection, a machine record or a manifest row. The door that sends these is
 * `./remote-run.ts`.
 *
 * ## The seven rules every script text obeys, and the gate reads each one
 *
 *  1. The text is a plain string literal, or an array of them joined, and it
 *     holds no backtick. Nothing a caller passes is ever inside it: the gate
 *     composes a command with a hostile value and proves that value appears
 *     once, in the quoted tail, and never in the script.
 *  2. Values are read as `"$1"` to `"$9"` and are always quoted.
 *  3. Every script begins `set -e` and then `umask 077`.
 *  4. Every script prints its payload between {@link REMOTE_SCRIPT_MARKER}
 *     markers. That is the recipe `./remote-path.ts` and `./key-install.ts`
 *     already use, and it is why a chatty login file on the other machine
 *     cannot be mistaken for an answer.
 *  5. A `read` script names none of `rm`, `mv`, `cp`, `mkdir`, `touch`,
 *     `chmod`, `chown`, `ln`, `dd`, `tee` or `truncate` as a command, and every
 *     `>` in it is part of `2>/dev/null`.
 *  6. Exactly ONE script has `mode: 'write'`, and it is `image-put`. Every `>`
 *     in it aims at the temporary name, so no redirection in this file can ever
 *     land on a file the person already had.
 *  7. The two git scripts use no git verb other than `rev-parse`, `status` and
 *     `show`. The verb is part of the text, never a parameter, so no caller can
 *     turn a review into a commit.
 *
 * ## Every script is safe to run twice
 *
 * A machine can sleep and a link can drop after the far side has already run a
 * command and before its answer arrives, so Tortie can never know whether a
 * command that failed ran or not. Every `read` script is safe to run twice
 * because it writes nothing. The one write is safe to run twice because it
 * never opens a file that is already there. Each row's `reason` says so in its
 * own words, the same way a verb ledger row does.
 *
 * ## The size limit, measured against a documented number rather than guessed
 *
 * The whole command reaches the far side as ONE argument of that machine's own
 * login shell, because that is how a sign in program starts a command. On Linux
 * one argument of one program is capped at 131,072 bytes by the kernel constant
 * `MAX_ARG_STRLEN`, which is 32 pages of 4,096 bytes. On this Mac the cap is on
 * the whole invocation rather than on one argument, and it is 1,048,576 bytes.
 *
 * So the smaller of the two decides, and it is the one on the platform this
 * phase could not measure. {@link REMOTE_SCRIPT_MAX_BYTES} is that number, the
 * door refuses a longer command before it sends anything, and
 * `REMOTE_IMAGE_MAX_BYTES` in `@shared/ipc` is the image size that fits inside
 * it once the bytes are encoded.
 */

/** A script either reads the machine or writes to it. There is no third kind. */
export type RemoteScriptMode = 'read' | 'write';

/** One command Tortie is allowed to run on another machine. */
export interface RemoteScript {
  /** The name the catalogue is searched by, and the far side's `$0`. */
  readonly id: string;
  readonly mode: RemoteScriptMode;
  /** How many positional parameters the text reads. Checked before sending. */
  readonly params: number;
  /** The text. A constant. No template literal, no concatenation of a value. */
  readonly text: string;
  /** Why running it twice leaves the machine as running it once does. */
  readonly reason: string;
}

/**
 * The pair the far side wraps every answer in.
 *
 * It is the same recipe as `REMOTE_PATH_MARKER` and `REMOTE_KEY_MARKER`, and it
 * is a different string from both, so an answer to one door can never be read
 * as an answer to another.
 */
export const REMOTE_SCRIPT_MARKER = '__TORTIE_RUN__';

/**
 * The word a script prints in place of a value it did not find.
 *
 * A file that is not there and a side of a diff that does not exist are both
 * ordinary states rather than failures, so they answer with this word inside
 * the markers. That keeps "the machine answered and there was nothing" apart
 * from "the machine did not answer", which are two different things to a
 * caller.
 */
export const REMOTE_SCRIPT_EMPTY = 'none';

/**
 * The longest command this door will send, in bytes. 131,072.
 *
 * It is Linux's `MAX_ARG_STRLEN`, which caps one argument of one program at 32
 * pages of 4,096 bytes. A sign in program runs the far side's login shell with
 * the whole command as one argument, so that constant is the ceiling on
 * everything in this file put together.
 *
 * NOT MEASURED ON LINUX BY THIS PHASE. No Linux machine was contacted. The
 * number is the kernel's own documented constant, and the far side in every
 * probe of this phase was this Mac, whose own cap is 1,048,576 bytes on the
 * whole invocation. The smaller number is used because the larger one was the
 * one that could be measured, which is the wrong way round to choose a limit.
 */
export const REMOTE_SCRIPT_MAX_BYTES = 131_072;

// ---------------------------------------------------------------------------
// The seven scripts
// ---------------------------------------------------------------------------

/**
 * What the far side prints about itself.
 *
 * `HOME` is what every store root is composed against. Tortie never composes a
 * home path for another computer from anything except that machine's own
 * answer, and this is that answer. `CODEX_HOME` and `XDG_DATA_HOME` are the two
 * names the store descriptors read, and a name that is not set prints as an
 * empty value rather than being absent, so the parse sees the same four lines
 * every time.
 */
const MACHINE_FACTS = [
  'set -e',
  'umask 077',
  "printf '__TORTIE_RUN__'",
  "printf 'home=%s\\n' \"$HOME\"",
  "printf 'codex_home=%s\\n' \"${CODEX_HOME:-}\"",
  "printf 'xdg_data_home=%s\\n' \"${XDG_DATA_HOME:-}\"",
  "u=$(uname -s)",
  "printf 'uname=%s\\n' \"$u\"",
  "printf '__TORTIE_RUN__\\n'"
].join('\n');

/**
 * Every file under one root, to one depth, one per line.
 *
 * Each line is the modification time in whole seconds, the size in bytes and
 * the path, separated by single spaces. The path is the rest of the line, so a
 * path holding a space still parses. A path holding a NEWLINE does not, and
 * that line is dropped by the parse rather than guessed at. No agent store this
 * phase measured writes such a name.
 *
 * There are two spellings of `stat` and this tries both, the same way the image
 * write tries two spellings of `base64`. BSD `stat -f` answers on this Mac and
 * GNU `stat -c` answers on Linux. A machine with neither answers with the empty
 * word, which a caller reads as no candidates rather than as an error.
 *
 * A listing that matched nothing answers {@link REMOTE_SCRIPT_EMPTY} rather
 * than nothing at all. That is deliberate: `./remote-run.ts` reads an empty
 * payload as a link that did not answer, and a store with no new records is a
 * machine that answered clearly.
 *
 * `$3` is a moment in whole seconds since the epoch and the listing drops every
 * entry older than it, so a store holding a year of conversations sends back
 * only the days a caller asked about. The filter is on the far side rather than
 * here because the bytes it removes are bytes that would otherwise cross the
 * connection.
 *
 * `2>/dev/null` is the only redirection in it. A root that does not exist on
 * that machine is the ordinary case rather than a failure, because an agent
 * that is not installed there has no store.
 */
const STORE_LIST = [
  'set -e',
  'umask 077',
  'if [ -d "$1" ]; then',
  '  o=$({ find "$1" -maxdepth "$2" -type f -exec stat -f \'%m %z %N\' {} + 2>/dev/null ||',
  '    find "$1" -maxdepth "$2" -type f -exec stat -c \'%Y %s %n\' {} + 2>/dev/null ||',
  '    true; } | awk -v s="$3" \'{ split($0, p, " "); if (s + 0 <= p[1] + 0) print $0 }\')',
  'else',
  '  o=',
  'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');

/**
 * The first bytes of one file, encoded.
 *
 * A conversation record holds newlines and control bytes, so the payload is
 * base64 and cannot break the marker pair. A file that is not there, and a file
 * with nothing in it, both answer {@link REMOTE_SCRIPT_EMPTY} rather than with
 * nothing at all, for the reason in the listing script above.
 */
const STORE_HEAD = [
  'set -e',
  'umask 077',
  'if [ -f "$1" ]; then',
  '  o=$(head -c "$2" "$1" | base64 | tr -d \'\\n\')',
  'else',
  '  o=',
  'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');

/**
 * One file's size, its checksum and its first bytes, in one answer.
 *
 * It is `store-head` plus the two facts that let a caller say whether what
 * arrived is what is there. `shasum` is tried first and `sha256sum` second,
 * because the two spellings differ between this Mac and a Linux machine, and a
 * machine with neither answers `nosum` rather than failing.
 */
const STORE_COPY = [
  'set -e',
  'umask 077',
  'if [ -f "$1" ]; then',
  '  n=$(wc -c < "$1" | tr -d \' \')',
  '  c=$(shasum -a 256 "$1" 2>/dev/null | cut -d\' \' -f1 || true)',
  '  if [ -z "$c" ]; then c=$(sha256sum "$1" 2>/dev/null | cut -d\' \' -f1 || true); fi',
  '  if [ -z "$c" ]; then c=nosum; fi',
  '  b=$(head -c "$2" "$1" | base64 | tr -d \'\\n\')',
  "  printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__\\n' \"$n\" \"$c\" \"$b\"",
  'else',
  "  printf '__TORTIE_RUN__none none none__TORTIE_RUN__\\n'",
  'fi'
].join('\n');

/**
 * The one write in this catalogue. Its four safety properties are properties of
 * this text rather than of a guard around it.
 *
 *  1. The name in `$1` is chosen by Tortie and is content addressed, so nothing
 *     a person typed and nothing a browser supplied reaches the far side's file
 *     system as a name. `./remote-image.ts` composes it, out of the session id
 *     and a checksum of the bytes. The session id is NOT a second parameter,
 *     because it is already inside the name and a value no script text reads is
 *     a value nothing checks.
 *  2. A file that is already there is never opened for writing. The script
 *     prints `present` instead, and that is what makes the write safe to run
 *     twice.
 *  3. The decode goes to a temporary name and is moved into place, so a link
 *     that dies halfway leaves a `.part` file rather than half an image under
 *     the real name. Both redirections in this text aim at that temporary name.
 *  4. `base64 -d` is tried first and `base64 -D` second, because the two
 *     spellings differ between this Mac and the machines this is meant for. The
 *     probe records which one answered.
 */
const IMAGE_PUT = [
  'set -e',
  'umask 077',
  'd="$HOME/.tortie/images"',
  'if [ ! -d "$d" ]; then mkdir -p "$d"; chmod 700 "$d"; fi',
  'f="$d/$1"',
  'if [ -f "$f" ]; then',
  '  s=present',
  'else',
  '  t="$f.part.$$"',
  '  if printf \'%s\' "$2" | base64 -d > "$t" 2>/dev/null; then',
  '    :',
  '  else',
  '    printf \'%s\' "$2" | base64 -D > "$t"',
  '  fi',
  '  chmod 600 "$t"',
  '  mv "$t" "$f"',
  '  s=added',
  'fi',
  'n=$(wc -c < "$f" | tr -d \' \')',
  'c=$(shasum -a 256 "$f" 2>/dev/null | cut -d\' \' -f1 || true)',
  'if [ -z "$c" ]; then c=$(sha256sum "$f" 2>/dev/null | cut -d\' \' -f1 || true); fi',
  'if [ -z "$c" ]; then c=nosum; fi',
  "printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__\\n' \"$s\" \"$n\" \"$c\""
].join('\n');

/**
 * Where the repository is, and what has changed in it.
 *
 * Both answers are encoded, because the status format this asks for separates
 * its records with a NUL byte and a NUL byte cannot cross a text pipe. The
 * format is exactly the one `src/main/git/parse.ts` already reads for a folder
 * on this Mac, so the far side's answer goes through the parser this product
 * already has rather than through a second one.
 *
 * A folder that is not inside a repository answers with the empty word for the
 * root, which is a fact rather than a failure. A folder that does not exist at
 * all makes `cd` fail, the script stops, and no markers arrive, which the door
 * reads as a refusal.
 */
const REVIEW_LIST = [
  'set -e',
  'umask 077',
  'cd "$1"',
  "r=$(git rev-parse --show-toplevel 2>/dev/null || true)",
  "e=$(printf '%s' \"$r\" | base64 | tr -d '\\n')",
  'if [ -n "$r" ]; then',
  '  s=$(git --no-pager status --porcelain=v2 --branch -z --untracked-files=all |' +
    " base64 | tr -d '\\n')",
  'else',
  '  s=',
  'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${e:-none}\" \"${s:-none}\""
].join('\n');

/**
 * Both sides of one file, each capped at `$3` bytes and each encoded.
 *
 * The committed side comes from `git show HEAD:<path>`, which reads the object
 * database and never the working tree. The working side is the file itself. A
 * side that does not exist, being a file that was added or a file that was
 * deleted, answers with the empty word rather than with a failure, because both
 * are ordinary states of a changed file.
 */
const REVIEW_FILE = [
  'set -e',
  'umask 077',
  'cd "$1"',
  'a=$(git --no-pager show "HEAD:$2" 2>/dev/null | head -c "$3" | base64 |' +
    " tr -d '\\n' || true)",
  'if [ -f "$2" ]; then',
  '  b=$(head -c "$3" "$2" | base64 | tr -d \'\\n\')',
  'else',
  '  b=',
  'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${a:-none}\" \"${b:-none}\""
].join('\n');

/**
 * The whole catalogue. Seven scripts, and this release holds no others.
 *
 * A name that is not here is refused by `./remote-run.ts` before anything is
 * composed, which is the shape the verb ledger has as well: the refusal happens
 * before a string exists, rather than after one was built and then inspected.
 */
export const REMOTE_SCRIPTS: readonly RemoteScript[] = [
  {
    id: 'machine-facts',
    mode: 'read',
    params: 0,
    text: MACHINE_FACTS,
    reason: 'It prints four values and writes nothing.'
  },
  {
    id: 'store-list',
    mode: 'read',
    params: 3,
    text: STORE_LIST,
    reason: 'It lists files under one directory and writes nothing.'
  },
  {
    id: 'store-head',
    mode: 'read',
    params: 2,
    text: STORE_HEAD,
    reason: 'It reads the first bytes of one file and writes nothing.'
  },
  {
    id: 'store-copy',
    mode: 'read',
    params: 2,
    text: STORE_COPY,
    reason: 'It reads one file and writes nothing.'
  },
  {
    id: 'image-put',
    mode: 'write',
    params: 2,
    text: IMAGE_PUT,
    reason:
      'A file that is already there is never opened for writing, and the ' +
      'script prints present instead of adding a second copy. The name is a ' +
      'checksum of the bytes, so the same image sent twice is one file.'
  },
  {
    id: 'review-list',
    mode: 'read',
    params: 1,
    text: REVIEW_LIST,
    reason:
      'It asks git where the repository is and what has changed in it. It ' +
      'writes nothing.'
  },
  {
    id: 'review-file',
    mode: 'read',
    params: 3,
    text: REVIEW_FILE,
    reason:
      'It reads one file twice, once from the last commit and once from the ' +
      'folder. It writes nothing.'
  }
];

/** The script with this id, or null. The catalogue is the only source. */
export function remoteScript(id: string): RemoteScript | null {
  return REMOTE_SCRIPTS.find((script) => script.id === id) ?? null;
}

/**
 * Every script that writes.
 *
 * It has exactly one member, and rule 6 in the header is what holds it there.
 * The gate calls this rather than counting a list of its own, so a script added
 * with the wrong mode is caught by the same call the product makes.
 */
export function remoteWriteScripts(): readonly RemoteScript[] {
  return REMOTE_SCRIPTS.filter((script) => script.mode === 'write');
}
