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
 * PHASE 90.2 ADDED TWO MORE, being one read and the second write. `repo-find`
 * walks one root on a machine once and prints every git folder under it with
 * its origin address, so the create sheet can fill the Directory field with the
 * folder that holds this same project over there. `git-clone` puts a project on
 * a machine that does not have it yet. It is the second write this product can
 * make on another computer and rule 6 below now says two rather than one.
 *
 * PHASE 90.3 ADDED ONE MORE, and it is a read. `tree-list` names every file
 * and folder under one folder on a machine, to a fixed depth, in ONE call. It
 * is what the Explorer draws for a project that lives on another computer.
 * Research 55 measured nine folders as nine calls at 409.7 ms and the same nine
 * answers in one subtree call at 42.3 ms, so a listing per row is the shape
 * this script exists to avoid.
 *
 * PHASE 84 ADDED TWO MORE, and both are reads. `dir-list` names the folders
 * inside one folder, so the create sheet can offer a picker for the other
 * computer and so a folder that is not there is refused before a session is
 * started. `program-find` tests whether one name is an executable file in each
 * of a list of folders, which is how Tortie finds an agent on a machine whose
 * login shell does not have that agent on its list. Both write nothing.
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
 *  2. Values are read as `"$1"` to `"$9"` and are always quoted. A script that
 *     needs to walk a LIST reads the whole list into a local name first, in
 *     quotes, and splits that local name under `IFS`. `program-find` is the one
 *     script that does this, and condition 46 of the gate asserts it, because
 *     `for d in $2` would be a bare positional and rule 2 would be gone.
 *  3. Every script begins `set -e` and then `umask 077`.
 *  4. Every script prints its payload between {@link REMOTE_SCRIPT_MARKER}
 *     markers. That is the recipe `./remote-path.ts` and `./key-install.ts`
 *     already use, and it is why a chatty login file on the other machine
 *     cannot be mistaken for an answer.
 *  5. A `read` script names none of `rm`, `mv`, `cp`, `mkdir`, `touch`,
 *     `chmod`, `chown`, `ln`, `dd`, `tee` or `truncate` as a command, and every
 *     `>` in it is part of `2>/dev/null`.
 *  6. TWO scripts have `mode: 'write'`, and they are `image-put` and
 *     `git-clone`, in that order. Phase 90.2 moved that number from one to two,
 *     once and on purpose, because putting a project on a machine is a write and
 *     there is no honest way to write it as a read. The two carry SEPARATE
 *     redirection rules rather than one shared rule, because they are different
 *     shapes: every `>` in `image-put` aims at the temporary name, and every `>`
 *     in `git-clone` aims at `/dev/null`. Both refuse a destination that is
 *     already there before they write anything, `image-put` with `[ -f "$f" ]`
 *     and `git-clone` with `[ -e "$d" ]`.
 *  7. Three git verbs may appear in any script, being `rev-parse`, `status` and
 *     `show`. Two more may appear in `git-clone` and in NO other script, being
 *     `ls-remote` and `clone`. Every verb is part of the text and never a
 *     parameter, so no caller can turn a review into a commit. Every git command
 *     that is not one of the three read verbs carries `GIT_TERMINAL_PROMPT=0`
 *     and `GCM_INTERACTIVE=never` in front of it, so a command on a machine
 *     nobody is watching cannot stop and wait for a password.
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
// The twelve scripts
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
 * PHASE 90.3 ADDED THE CONTAINMENT LINE, and it is a safety fix rather than a
 * feature. Until this phase `$2` was joined to the repository root with no
 * check at all. Research 55 section 9.3 ran this exact text with `../above.txt`
 * and read a file above the root. Nothing exploited it, because every path this
 * script received came from a `review-list` answer. The Explorer changes that,
 * because from this phase the renderer chooses the path. So the second line of
 * the body refuses a path that starts with a slash and a path that holds two
 * dots, and it refuses by leaving the script with no markers printed at all.
 *
 * WHAT THAT LINE ALSO REFUSES, said plainly. A file whose own name holds two
 * dots in a row, e.g. `notes..md`, is refused as well. That is a false refusal
 * and it is taken on purpose, because the check is one constant line on the far
 * side and a guard on this Mac would be a second copy of a rule the far side has
 * to enforce anyway.
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
  'case "$2" in /*|*..*) exit 1;; esac',
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
 * The folders inside one folder on another machine (Phase 84, item 6).
 *
 * FOLDERS ONLY. `ls -A -p` marks a directory with a trailing slash and the
 * filter keeps only those. A picker that listed files would be a file browser,
 * which this phase does not build, and it would send every file name in a
 * person's home directory across the connection for nothing.
 *
 * FOUR ANSWERS, and three of them are ordinary states rather than failures. A
 * path that is not there answers `missing`. A path that is there and is not a
 * folder answers `notdir`. A folder the account cannot read answers `denied`.
 * Anything else answers `ok`, the number of folders really in there, the path,
 * and then at most `$2` names, one per line.
 *
 * THE COUNT COMES BEFORE THE PATH on that first line, and the order has a
 * reason. A folder on another computer can hold a space in its name, so the
 * path has to be the rest of the line rather than a field in the middle of it.
 * The three refusal answers put the path last for the same reason.
 *
 * THE TOTAL IS COUNTED SEPARATELY FROM THE LISTING, so a caller can say "this
 * folder holds 900 folders and Tortie is showing the first 500" rather than
 * presenting 500 as all of them.
 *
 * `$2` IS NEVER ZERO. BSD `head -n 0` refuses with "illegal line count", so a
 * caller that only wants the status word asks for one entry rather than none.
 *
 * An empty `$1` is that machine's own `$HOME`, resolved by that machine's own
 * shell. Tortie composes no home path for another computer.
 */
const DIR_LIST = [
  'set -e',
  'umask 077',
  'p="$1"',
  'if [ -z "$p" ]; then p="$HOME"; fi',
  'if [ ! -e "$p" ]; then',
  "  printf '__TORTIE_RUN__missing %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -d "$p" ]; then',
  "  printf '__TORTIE_RUN__notdir %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -r "$p" ] || [ ! -x "$p" ]; then',
  "  printf '__TORTIE_RUN__denied %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'else',
  '  o=$(cd "$p" && ls -A -p 2>/dev/null | grep \'/$\' | head -n "$2" || true)',
  '  c=$(cd "$p" && ls -A -p 2>/dev/null | grep -c \'/$\' || true)',
  "  printf '__TORTIE_RUN__ok %s %s\\n%s__TORTIE_RUN__\\n' \"${c:-0}\" \"$p\" \"${o:-}\"",
  'fi'
].join('\n');

/**
 * Where one machine keeps one program, asked of a list of folders (Phase 84,
 * item 10).
 *
 * ## Why `command -v` was not enough, and this is measured rather than argued
 *
 * MEASURED on the operator's Mac Pro, 2026-08-18. `claude` is installed there
 * at `~/.local/bin/claude`. The login shell's own list of places it looks for
 * programs holds ten entries and that folder is not one of them, so
 * `"$SHELL" -lc 'command -v claude'` prints nothing. Tortie then refused to
 * create a claude session on a machine where claude is installed and two of
 * Tortie's own claude sessions were running.
 *
 * `../tmux/resolve.ts` answers the same question on this Mac by walking three
 * lists rather than one, being the login shell's PATH, the agent entry's own
 * probe folders and the folders a GUI launched app misses. This script is that
 * walk, one machine further away, with that machine's own answers in every list.
 *
 * ## The two lists, and why each is read into a local name first
 *
 * Rule 2 of this catalogue says every positional is read as `"$1"` to `"$9"`
 * and is always quoted. `for d in $2` would be a bare positional and would end
 * that rule. So each list is read once, in quotes, into a local name, and the
 * word splitting happens on that local name under `IFS=:`. The property the
 * rule exists for is unchanged: a value appears exactly once, in the quoted
 * tail of the command, and never inside this text.
 *
 * NOTHING A PERSON TYPED AND NOTHING AN AGENT WROTE REACHES EITHER LIST. The
 * first is the far machine's own answer about itself. The second is a compiled
 * constant with that machine's own `$HOME` in front of it.
 *
 * The answer names which list it came from and then the file, or `none none`.
 * The list word comes FIRST because a folder on another computer can hold a
 * space in its name, so the path has to be the rest of the line.
 */
const PROGRAM_FIND = [
  'set -e',
  'umask 077',
  'n="$1"',
  'p="$2"',
  'x="$3"',
  'f=',
  's=',
  'IFS=:',
  'for d in $p; do',
  '  [ -n "$d" ] || continue',
  '  if [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi',
  'done',
  'if [ -z "$f" ]; then',
  '  for d in $x; do',
  '    [ -n "$d" ] || continue',
  '    if [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi',
  '  done',
  'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${s:-none}\" \"${f:-none}\""
].join('\n');


/**
 * Every git folder under one root on another machine, with its origin address
 * (Phase 90.2, item 2).
 *
 * ## Why the walk is one call and not a list of guesses
 *
 * Research 55 measured, on the operator's tailnet against his Mac Pro, that one
 * warm call costs 35.9 ms and that nine calls cost 409.7 ms while the same nine
 * answers in ONE call cost 42.3 ms. The cost is the round trip rather than the
 * work. So the create sheet asks once and matches on this Mac.
 *
 * The rejected shape was probing a short list of likely paths, e.g. the same
 * path as here and the basename under the far home. It answers "there is no
 * copy over there" for a repository that is really there, and that answer is
 * the branch that offers to WRITE. A wrong absent is how a person ends up with
 * two clones of one project on one machine.
 *
 * ## What it prints
 *
 * One line per git folder. The line is the base64 of the origin address, one
 * space, and then the folder path as THE REST OF THE LINE. The path is last
 * because a folder on another computer can hold a space in its name. The
 * address is base64 because it is not the rest of the line and nothing promises
 * an address is free of spaces.
 *
 * ## Six properties of this text, and each one is a rule the gate reads
 *
 *  1. IT NAMES NO GIT VERB. The origin comes out of `.git/config` with `awk`,
 *     so the git verb list in rule 7 of the header is untouched by this script.
 *  2. The awk program holds no `$` followed by a digit. An awk field reference
 *     inside single quotes reads to this catalogue's own checkers as a single
 *     quoted positional parameter, and rule 2 would fail on it. The origin
 *     reader uses a flag, `sub()` and `print` instead of a field reference.
 *  3. It names none of the eleven mutating programs. It names `find`,
 *     `dirname`, `awk`, `head`, `printf`, `base64`, `tr` and `read`.
 *  4. Its only redirection is `2>/dev/null`, twice.
 *  5. Every positional is read double quoted.
 *  6. It is safe to run twice, because it writes nothing at all.
 *
 * `Library` and `node_modules` are pruned, and both names are constants in this
 * text that no caller can change. A home directory's `Library` folder on this
 * kind of machine is large and holds no projects, and a repository inside
 * `node_modules` is not a project a person opens.
 *
 * ## What it cannot find, said plainly
 *
 * A worktree, because its `.git` is a file rather than a directory and this
 * asks for `-type d`. A submodule, for the same reason. A repository outside
 * the searched root, or deeper than `$2`. A repository whose origin address is
 * not the first `url` line under `[remote "origin"]`.
 *
 * An empty `$1` is that machine's own `$HOME`, resolved by that machine's own
 * shell, exactly as `dir-list` does it. Tortie composes no home path for
 * another computer.
 */
const REPO_FIND = [
  'set -e',
  'umask 077',
  'r="$1"',
  'if [ -z "$r" ]; then r="$HOME"; fi',
  'if [ -d "$r" ]; then',
  '  o=$(find "$r" -maxdepth "$2" \\( -name Library -o -name node_modules \\)' +
    ' -prune -o -type d -name \'.git\' -print 2>/dev/null |',
  '    head -n "$3" |',
  '    while IFS= read -r g; do',
  '      p=$(dirname "$g")',
  '      u=$(awk \'/^\\[remote "origin"\\]/ { f=1; next } /^\\[/ { f=0 }' +
    ' f && /^[ \\t]*url[ \\t]*=/ { sub(/^[ \\t]*url[ \\t]*=[ \\t]*/, "");' +
    ' print; exit }\' "$g/config" 2>/dev/null || true)',
  '      [ -n "$u" ] || continue',
  '      e=$(printf \'%s\' "$u" | base64 | tr -d \'\\n\')',
  '      printf \'%s %s\\n\' "$e" "$p"',
  '    done)',
  'else',
  '  o=',
  'fi',
  "printf '__TORTIE_RUN__%s__TORTIE_RUN__\\n' \"${o:-none}\""
].join('\n');

/**
 * The second write in this catalogue, and the second write this product can
 * make on another computer (Phase 90.2, item 3).
 *
 * It asks git to put one project into one folder that is not there yet. Two
 * values, being the address and the absolute destination.
 *
 * ## Eight safety properties, and every one of them is a property of this text
 *
 *  1. THE DESTINATION IS TESTED FIRST, with `-e`. A path that is already there
 *     is never opened, never written into and never removed. That is what makes
 *     this write safe to run twice, and it is the same shape `image-put` uses
 *     with `-f`.
 *  2. THE REACHABILITY CHECK RUNS BEFORE THE CLONE. A machine that cannot sign
 *     in to the address answers `unreachable` having written nothing at all, so
 *     no slow failing download is ever started.
 *  3. BOTH GIT COMMANDS CARRY `GIT_TERMINAL_PROMPT=0` AND `GCM_INTERACTIVE=never`.
 *     A clone that stops on a hidden password prompt on a machine nobody is
 *     watching is a hang, and a hang reads to a person as the app freezing.
 *  4. `timeout` IS NOT USED AND IS NOT PRESENT. It is GNU coreutils and this
 *     kind of machine does not ship it. The deadline is enforced on this Mac by
 *     `execRemoteShell`, which hands `timeout` to `execFile` with
 *     `killSignal: 'SIGKILL'`.
 *  5. It names none of the eleven mutating programs. `git` does the writing and
 *     `git` is not one of them.
 *  6. EVERY REDIRECTION AIMS AT `/dev/null`. There are two, being
 *     `>/dev/null 2>&1` on the reachability check and `2>&1 >/dev/null` on the
 *     clone. The second one keeps git's own words in `$m` and throws its
 *     progress lines away.
 *  7. BOTH GIT VERBS ARE PART OF THE TEXT, being `ls-remote` and `clone`. No
 *     caller chooses a verb, and no other script in this catalogue may name
 *     either of them.
 *  8. NO CREDENTIAL CROSSES. Tortie reads none, sends none, caches none and
 *     asks for none. The machine signs in with what it already has, or this
 *     script answers `unreachable`.
 *
 * ## What it prints
 *
 * A word, then base64 of what git said or the empty word, then the destination
 * as the rest of the line. The four words are `exists`, `cloned`, `failed` and
 * `unreachable`. Three of them are ordinary states rather than failures.
 *
 * ## What can still be left behind, and Tortie says so on screen
 *
 * If the deadline on this Mac is hit, or the link drops part way, the clone may
 * keep running over there and a partly downloaded folder may remain. This
 * script cannot report that, because by then nobody is reading its answer. The
 * next attempt refuses that path by name, because property 1 finds it there.
 */
const GIT_CLONE = [
  'set -e',
  'umask 077',
  'u="$1"',
  'd="$2"',
  'if [ -e "$d" ]; then',
  "  printf '__TORTIE_RUN__exists none %s__TORTIE_RUN__\\n' \"$d\"",
  'elif GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git ls-remote --' +
    ' "$u" HEAD >/dev/null 2>&1; then',
  '  s=0',
  '  m=$(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git clone --' +
    ' "$u" "$d" 2>&1 >/dev/null) || s=1',
  '  if [ "$s" = 0 ]; then',
  "    printf '__TORTIE_RUN__cloned none %s__TORTIE_RUN__\\n' \"$d\"",
  '  else',
  '    b=$(printf \'%s\' "$m" | base64 | tr -d \'\\n\')',
  "    printf '__TORTIE_RUN__failed %s %s__TORTIE_RUN__\\n' \"${b:-none}\" \"$d\"",
  '  fi',
  'else',
  "  printf '__TORTIE_RUN__unreachable none %s__TORTIE_RUN__\\n' \"$d\"",
  'fi'
].join('\n');

/**
 * Every file and folder under one folder on another machine, to a fixed depth,
 * in ONE call (Phase 90.3).
 *
 * ## Why one call and never one call per row
 *
 * MEASURED, on the operator's tailnet against his Mac Pro, and written down in
 * research 55. Nine folders read as nine calls cost 409.7 ms. The same nine
 * answers in one subtree call cost 42.3 ms. Research 56 section 1.4 sharpened
 * it: six calls issued at once cost 44.0 ms, so what matters is that calls are
 * not in series, and folding them into one command line is not required. The
 * Explorer therefore asks once when a tab opens, once when a person expands
 * past the fetched depth, and once when they press Refresh.
 *
 * ## What it prints
 *
 * FOUR ANSWERS, and three of them are ordinary states rather than failures,
 * exactly as `dir-list` has them. A path that is not there answers `missing`. A
 * path that is there and is not a folder answers `notdir`. A folder the account
 * cannot read answers `denied`. Anything else answers `ok`, the number of
 * entries really under there, the root, and then at most `$3` lines.
 *
 * THE COUNT COMES BEFORE THE ROOT on that first line, and the order has the
 * reason `dir-list` has: a folder on another computer can hold a space in its
 * name, so the path has to be the rest of the line.
 *
 * Every line after the first is one absolute path, with a trailing slash when
 * it is a directory. The reader in `./tree-list.ts` drops any line that does not
 * begin with the root.
 *
 * ## Seven properties of this text, and each one is a rule the gate reads
 *
 *  1. It begins `set -e` and then `umask 077`.
 *  2. Every positional is read double quoted, and there are three.
 *  3. It names none of the eleven mutating programs. It names `find`, `head`,
 *     `printf`, `wc`, `tr`, `read` and `test`.
 *  4. Its only redirection is `2>/dev/null`, twice.
 *  5. It names no git verb at all. `.git` appears twice, each time as a
 *     QUOTED name for `find` to prune. The quotes are what keep the word `git`
 *     from being followed by a space in this text, which is what the gate's
 *     git verb reader looks for.
 *  6. `.git` is pruned, so a repository's internals never cross the link.
 *  7. It writes nothing, so running it twice reads the same folder twice.
 *
 * ## What it cannot do, said plainly
 *
 * A file whose name holds a NEWLINE arrives as two lines. The second one does
 * not begin with the root and the reader drops it, and the first one is a path
 * that is not really there. No repository this phase measured holds such a
 * name, and refusing the whole listing over one of them would be worse.
 *
 * The count is a second walk of the same tree, which is what `dir-list` does
 * with its two `ls` runs. It is what keeps "this folder holds 9,000 entries and
 * Tortie is showing the first 4,000" honest, and the probe records what the
 * second walk costs.
 *
 * `$3` IS NEVER ZERO. BSD `head -n 0` refuses with "illegal line count", which
 * is the same rule `dir-list` carries.
 */
const TREE_LIST = [
  'set -e',
  'umask 077',
  'p="$1"',
  'if [ ! -e "$p" ]; then',
  "  printf '__TORTIE_RUN__missing %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -d "$p" ]; then',
  "  printf '__TORTIE_RUN__notdir %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -r "$p" ] || [ ! -x "$p" ]; then',
  "  printf '__TORTIE_RUN__denied %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'else',
  '  o=$(find "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print' +
    ' 2>/dev/null |',
  '    head -n "$3" |',
  '    while IFS= read -r f; do',
  '      if [ -d "$f" ]; then printf "%s/\\n" "$f"; else printf "%s\\n" "$f"; fi',
  '    done)',
  '  c=$(find "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print' +
    ' 2>/dev/null | wc -l | tr -d " ")',
  "  printf '__TORTIE_RUN__ok %s %s\\n%s__TORTIE_RUN__\\n' \"${c:-0}\" \"$p\" \"${o:-}\"",
  'fi'
].join('\n');

/**
 * The whole catalogue. Twelve scripts, and this release holds no others.
 *
 * A name that is not here is refused by `./remote-run.ts` before anything is
 * composed, which is the shape the verb ledger has as well: the refusal happens
 * before a string exists, rather than after one was built and then inspected.
 *
 * TWO of the twelve write, being `image-put` and `git-clone`, and they are in
 * that order in this array. {@link remoteWriteScripts} returns them in it.
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
  },
  {
    id: 'dir-list',
    mode: 'read',
    params: 2,
    text: DIR_LIST,
    reason:
      'It lists the folders inside one folder and writes nothing. Running it ' +
      'twice reads the same folder twice.'
  },
  {
    id: 'program-find',
    mode: 'read',
    params: 3,
    text: PROGRAM_FIND,
    reason:
      'It tests whether one name is an executable file in each of a list of ' +
      'folders, and writes nothing. Running it twice asks the same question.'
  },
  {
    id: 'repo-find',
    mode: 'read',
    params: 3,
    text: REPO_FIND,
    reason:
      'It walks one folder tree and reads one line out of each git folder it ' +
      'finds. It writes nothing, so running it twice reads the same tree twice.'
  },
  {
    id: 'tree-list',
    mode: 'read',
    params: 3,
    text: TREE_LIST,
    reason:
      'It walks one folder tree to a fixed depth and prints what is in it. It ' +
      'writes nothing, so running it twice reads the same tree twice.'
  },
  {
    id: 'git-clone',
    mode: 'write',
    params: 2,
    text: GIT_CLONE,
    reason:
      'A destination that is already there is never opened and never written ' +
      'into. The script answers exists instead, so a second run of the same ' +
      'copy leaves the machine as the first run left it.'
  }
];

/** The script with this id, or null. The catalogue is the only source. */
export function remoteScript(id: string): RemoteScript | null {
  return REMOTE_SCRIPTS.find((script) => script.id === id) ?? null;
}

/**
 * Every script that writes, in catalogue order.
 *
 * It has exactly two members, being `image-put` and then `git-clone`, and rule
 * 6 in the header is what holds it there. The gate calls this rather than
 * counting a list of its own, so a script added with the wrong mode is caught by
 * the same call the product makes.
 */
export function remoteWriteScripts(): readonly RemoteScript[] {
  return REMOTE_SCRIPTS.filter((script) => script.mode === 'write');
}
