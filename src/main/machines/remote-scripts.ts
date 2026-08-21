/**
 * The catalogue of commands Tortie may run on another machine (Phase 73, M6).
 *
 * ## Why a second list exists beside the verb ledger
 *
 * `./exec-plane.ts` owns the verb ledger, and every entry on it is a tmux verb.
 * This rung needs four things that are not tmux verbs: a directory listing, a
 * file read, a git read and a file write. `execRemoteShell` already carries a
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
 * PHASE 101 ADDED ONE MORE, and it is the THIRD write. `file-put` replaces one
 * file under one confirmed folder on a machine, or makes a new empty one there.
 * It is the first command this product sends that can replace a file a person
 * already had, and what bounds it is a sixth confirmed field on the machine row
 * called `writeRoot`. A machine that carries none cannot be saved to at all.
 * The script computes the file's checksum on the far side and refuses unless it
 * equals the checksum Tortie read, so no command Tortie sends can replace a
 * file whose contents Tortie did not just verify by checksum. Rule 6 below says
 * three rather than two and says which promise changed.
 *
 * PHASE 102 ADDED TWO MORE, and both are writes. They are the FOURTH and the
 * FIFTH. `dir-new` makes one folder under the same confirmed folder `file-put`
 * saves under, with one non recursive `mkdir` and one `chmod` capped at two
 * modes. `entry-rename` renames one file or one folder under that same folder,
 * with one `mv` guarded by a test on the destination and by a device and inode
 * comparison that closes the case only rename. Rule 6 below says five rather
 * than three and says what each new one promises.
 *
 * WHAT PHASE 102 CANNOT PROMISE, said here rather than left implied. Between
 * `entry-rename`'s test and its `mv` another writer on that machine can create
 * the destination, and the `mv` then replaces it. The gate reads text and
 * cannot see a race. And the two new writers carry a WIDER containment line
 * than `file-put` does, being the line with the `.git` half in it, so `.git` is
 * guarded on them and not on `file-put`.
 *
 * PHASE 103 ADDED TWO MORE, and both are writes. They are the SIXTH and the
 * SEVENTH, and they are the first two commands this product sends that change a
 * git repository on another computer. `git-stage` hands a list of pathspecs to
 * that machine's own git as one `git add`, and `git-unstage` takes the same
 * list back out with one `git restore --staged`, falling back to one
 * `git rm --cached` on a repository with no commit. Neither names a destination
 * to test, so both are safe to run twice by END STATE.
 *
 * PHASE 104 ADDED ONE MORE, and it is a write. It is the EIGHTH, and it is the
 * third that changes a git repository over there. `git-commit` makes the commit
 * that machine's own git makes, with that person's own hooks and their own
 * signing configuration running there. It is the FIRST write in this catalogue
 * that is safe to run twice by a guard it carries itself: the sha Tortie read
 * crosses with the message, the far side compares it against its own
 * `git rev-parse HEAD`, and a difference answers `moved` having committed
 * nothing. Its standard input is `/dev/null`, so a passphrase program that
 * reads a terminal fails at once instead of holding the link. TORTIE ANSWERS NO
 * PASSPHRASE, ANYWHERE.
 *
 * PHASE 98 ADDED ONE MORE, and it is a read. `repo-search` prints every
 * matching line in one folder on a machine, using that machine's own `grep`.
 * Research 57 section 2 measured the alternatives and refused both of them.
 * Sending a ripgrep to the machine buys 0.15 s and costs a third write door, a
 * transfer protocol, a binary per architecture and an executable Tortie placed
 * on somebody else's computer. Copying the files here to search them costs 2.4 s
 * over the link against 0.176 s of scanning in place, and it puts a person's
 * source on a second computer. So the scan happens where the files are.
 *
 * PHASE 99 ADDED ONE MORE, and it is a read. `repo-files` names every file in
 * one folder on a machine, so the Quick Open palette on a tab that lives over
 * there can rank names. It carries NAMES AND NEVER CONTENTS, which is why it
 * needs no file size cap of its own. Research 57 section 6 measured it and ruled
 * Quick Open in and Symbols out, because there is no parser on that machine.
 *
 * PHASE 105 ADDED ONE MORE, and it is a read. `repo-facts` prints four short
 * strings about one folder on a machine, being a mode word, the origin address,
 * the branch checked out there and the commit HEAD points at. It exists so the
 * Runs section on a tab whose project lives over there can ask GitHub about the
 * right branch. NO CREDENTIAL AND NO `gh` CROSSES: the gh program runs on this
 * Mac and never leaves it, and condition 55d of `build/conformance-machines.mjs`
 * reads this text and fails on any of the nine words a credential would travel
 * in. It adds no git verb, because `rev-parse` was already on the list in rule 7
 * below and `awk` reads the origin out of the config the way `repo-find` does.
 *
 * PHASE 106 ADDED ONE MORE, and it is a read. `repo-branch` prints one line
 * about the branch checked out in one folder on a machine, being its name, the
 * branch it follows, and how far ahead and how far behind it is. It exists so
 * the Source Control view on a tab whose project lives over there can say which
 * branch is checked out without a person opening a session and typing. It is
 * the ONE script that adds a git verb since Phase 98, being `for-each-ref`, and
 * rule 7 below says why that verb takes the same exemption the other four take.
 * IT NEVER FETCHES. The two counts are measured against the copy of the
 * upstream that machine last fetched, so the answer can be older than what is
 * on the server, and condition 56i of `build/conformance-machines.mjs` fails
 * this text if it ever names `git fetch`, `git pull` or `git remote update`.
 *
 * PHASE 107 ADDED ONE MORE, and it is a read. `repo-history` prints a page of
 * the newest commits in one folder on a machine, with the two anchors the
 * swimlane picture needs and the marks that say which commits are ahead of the
 * followed branch and which are behind it. It exists so the History group on a
 * tab whose project lives over there draws the same picture the local History
 * draws. It adds THREE git verbs to rule 7 below, being `log`, `merge-base` and
 * `rev-list`, and all three are reads of the object database that reach no
 * server. IT NEVER FETCHES, for the same reason `repo-branch` never does, and
 * condition 57g of `build/conformance-machines.mjs` fails this text if it ever
 * names `git fetch`, `git pull` or `git remote update`. IT READS NO FILE
 * CONTENTS, so it cannot show the files one commit changed.
 *
 * PHASE 108 ADDED ONE MORE, and it is a read. `context-read` lists directories
 * and reads files back, so the Context view on a tab whose project lives on
 * another machine can show what the agents THERE will load. It knows nothing
 * about any agent: the far side does no parsing, and every parser stays on
 * this Mac inside the reader it already lives in. That is what keeps it one
 * script rather than a second copy of the precedence table. It names no git
 * verb at all, because context is not a git question. It writes nothing, and
 * `head -c` inside it caps every file it reads back at
 * {@link CONTEXT_READ_FILE_MAX_BYTES}.
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
 * PHASE 109 ADDED ONE MORE, and it is a read. `agents-find` asks one machine,
 * in ONE call, which of the agents Tortie can launch exist there, so the
 * create sheet on a tab whose files live over there can grey the tiles that
 * machine really lacks instead of reading this Mac's own scan. It is a
 * BATCHED `program-find` and not a rewrite of it: `program-find` stays on the
 * create path and the restore path exactly as it is, one program per call,
 * and this script answers about a whole list. Research 58 section 2 measured
 * the two shapes on one warm connection, being 52 ms for the batch against
 * 480 ms for eleven serial calls. Its answer decides what a TILE looks like
 * and never what goes into a manifest row.
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
 *  6. EIGHT scripts have `mode: 'write'`, and they are `image-put`,
 *     `git-clone`, `file-put`, `dir-new`, `entry-rename`, `git-stage`,
 *     `git-unstage` and `git-commit`, in that order. Phase 90.2 moved that
 *     number from one to two, Phase 101 moved it from two to three, Phase 102
 *     moved it from three to five, Phase 103 moved it from five to seven and
 *     Phase 104 moved it from seven to eight, once and on purpose each time,
 *     because putting a project on a machine is a write, so is saving a file a
 *     person is editing, so is making a folder, so is renaming one, so is
 *     changing what a repository has staged, and so is making the commit. There
 *     is no honest way to write any of them as a read.
 *     The eight carry SEPARATE redirection rules rather than one shared rule,
 *     because they are different shapes: every `>` in `image-put` and in
 *     `file-put` aims at the temporary name, every `>` in `git-clone`, in
 *     `git-stage` and in `git-unstage` aims at `/dev/null`, and `dir-new`,
 *     `entry-rename` and `git-commit` carry no redirection at all beyond the
 *     `2` in `2>/dev/null` and `2>&1`.
 *
 *     `git-commit`'s REDIRECTION RULE IS WEAKER THAN `image-put`'s AND IT IS
 *     SAID HERE RATHER THAN HIDDEN. The redirect reader in
 *     `build/machines-conformance-probe.mts` counts neither `2>/dev/null` nor
 *     `2>&1` nor `</dev/null`, so run over this text it returns an empty list.
 *     A rule quantified over an empty list asserts nothing, so the gate asserts
 *     that the list is EMPTY instead. That is a true and specific property of
 *     this write, and it is weaker than `image-put`'s, which names the exact
 *     target every redirection must aim at.
 *
 *     A WRITE WITH NO DESTINATION TO TEST IS STILL SAFE TO RUN TWICE, and
 *     Phase 103 adds the first two of those. `image-put`, `git-clone` and
 *     `dir-new` are safe because they refuse a destination that is already
 *     there. `git-stage` and `git-unstage` name no destination at all: they
 *     hand a list of pathspecs to that machine's own git, so they are safe by
 *     END STATE. A second run asks for the same index and git leaves it as it
 *     already is.
 *
 *     `git-commit` IS THE FIRST WRITE THAT IS SAFE BY A GUARD IT CARRIES
 *     ITSELF. It has no destination to test and no end state to lean on,
 *     because running it twice would add two commits. So it takes the sha
 *     `HEAD` pointed at when Tortie read the folder, compares it against its
 *     own `git rev-parse HEAD` before it does anything, and answers `moved`
 *     without committing when the two differ. The first run moves `HEAD`, so
 *     the second run of one request always finds it moved.
 *
 *     WHAT PHASE 102 ADDED TO THE TWO IT ADDED, and did not add anywhere else.
 *     Both carry the wider containment line from
 *     `docs/research/57-i3-file-writes.md` section 12, which holds a `.git`
 *     half, and `entry-rename` carries it twice because the line names the
 *     value it guards. `file-put` keeps `review-file`'s narrower line, so
 *     `.git` is guarded on the two new writers and NOT on `file-put`. Widening
 *     a shipped writer with pinned gate literals is its own round.
 *
 *     THE PROMISE THAT CHANGED IN PHASE 101, said plainly rather than left for
 *     a reader to notice. Until Phase 101 all writers refused a destination
 *     that was already there, `image-put` with `[ -f "$f" ]` and `git-clone`
 *     with `[ -e "$d" ]`. `file-put` replaces a file on purpose, so it cannot
 *     make that promise on its checksum arm. What replaced it is that it
 *     replaces a file ONLY after the machine has computed that file's checksum
 *     and found it equal to the checksum Tortie read. Its `new` arm keeps the
 *     older promise in full, with `[ -f "$f" ]`. Condition 80 of
 *     `build/conformance-machines.mjs` checks both arms separately, because a
 *     whole-script test would pass `file-put` on its checksum arm alone.
 *  7. EIGHT git verbs may appear in any script, being `rev-parse`, `status`,
 *     `show`, `ls-files`, `for-each-ref`, `log`, `merge-base` and `rev-list`.
 *     Two more may appear in `git-clone` and in NO other script, being
 *     `ls-remote` and `clone`. PHASE 103 ADDS THREE MORE, each bound to one
 *     script id: `add` in `git-stage` alone, and `restore` and `rm` in
 *     `git-unstage` alone. PHASE 104 ADDS ONE MORE, being `commit` in
 *     `git-commit` alone. None of the four joins the eight, because a verb
 *     allowed everywhere is a verb any future script can use, and none of the
 *     four is a read. All four therefore carry `GIT_TERMINAL_PROMPT=0` and
 *     `GCM_INTERACTIVE=never` in front of them. Every verb is part
 *     of the text and never a parameter, so no caller can turn a review into a
 *     commit. Every git command that is not one of the eight read verbs carries
 *     `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never` in front of it, so a
 *     command on a machine nobody is watching cannot stop and wait for a
 *     password.
 *
 *     PHASE 98 ADDED `ls-files`, and it is the fourth. It asks git which files
 *     are in a folder so the machine's own `grep` can read them. Reading the
 *     index is a read, it reaches no server, and it meets the same test the
 *     other three meet. Phase 99, being Quick Open on a tab that lives on
 *     another machine, needs the same verb and therefore needs no widening of
 *     its own. IT ADDED NOTHING TO THAT LIST, and condition 53j of the gate
 *     asserts the list's own contents so a later round cannot widen it for
 *     convenience.
 *
 *     PHASE 105 ADDED NOTHING TO IT EITHER. `repo-facts` asks git where the git
 *     directory is, what `HEAD` names and what commit `HEAD` points at, and all
 *     three questions are `rev-parse`. `symbolic-ref` was not needed because
 *     `rev-parse` answers the same question, and `remote` was not needed because
 *     `awk` over the config answers it, which is what `repo-find` already does.
 *
 *     PHASE 106 ADDED `for-each-ref`, and it is the fifth. It reads the ref
 *     store and it contacts no server, so it meets the same test the other four
 *     meet and it takes the same exemption from the two prompt names. It joined
 *     the list rather than starting a second one under a better name. Research
 *     57 section 5.5 proposed a fourth list for read verbs that touch no server,
 *     and `ALLOWED_GIT_VERBS` in `build/conformance-machines.mjs` already IS
 *     that list: every member is a pure read of the object database, the index
 *     or the ref store, `READ_ONLY_GIT_VERBS` is built straight from it, and a
 *     second list with the same members under a better name is a rename of a
 *     safety list, which is its own round. Conditions 53j, 55c and 56c of the
 *     gate held the list at those five until Phase 107.
 *
 *     PHASE 107 ADDED THREE, being `log`, `merge-base` and `rev-list`, and they
 *     are the sixth, the seventh and the eighth. `log` walks the object
 *     database and prints commits. `merge-base` reads two commits already in it
 *     and answers with a third. `rev-list` walks the same database and prints
 *     commit names. None of the three opens a network connection, none of them
 *     writes a ref, an index or a working tree file, and none of them can be
 *     turned into a write by any flag this catalogue passes. So all three meet
 *     the test the first five meet and they take the same exemption from the
 *     two prompt names. Research 57 section 5 priced this widening at four
 *     verbs, and it is three because `for-each-ref` joined the list in Phase
 *     106 after that research was written. Condition 57c of the gate holds the
 *     list at those eight.
 *
 * ## Every script is safe to run twice
 *
 * A machine can sleep and a link can drop after the far side has already run a
 * command and before its answer arrives, so Tortie can never know whether a
 * command that failed ran or not. Every `read` script is safe to run twice
 * because it writes nothing. Each row's `reason` says so in its own words, the
 * same way a verb ledger row does.
 *
 * THE EIGHT WRITES ARE SAFE TO RUN TWICE FOR FOUR DIFFERENT REASONS, and the
 * sentence that once covered them all said "the one write is safe to run twice
 * because it never opens a file that is already there". That was already false
 * at two writers, Phase 101 rewrote it rather than leaving it, Phase 102 added
 * the third reason, Phase 103 put two more writers under it and Phase 104 added
 * the fourth reason.
 *
 *  - `image-put`, `git-clone` and `dir-new` never open a destination that is
 *    already there. A repeat finds the file or the folder and answers
 *    `present`, `exists` or `exists` without writing.
 *  - `file-put` replaces a file on purpose, so it cannot make that promise on
 *    its checksum arm. A repeat after a lost answer finds the file already
 *    carrying the checksum of the payload and answers `stale` with that
 *    checksum, and `./remote-file.ts` reads that as the write having landed. So
 *    a repeat writes one file rather than refusing. Its `new` arm keeps the
 *    older promise in full.
 *  - `entry-rename` is safe to run twice by END STATE rather than by refusal. A
 *    repeat finds the source gone and the destination there and answers `done`,
 *    having run no `mv`. The machine then holds what the person asked for and it
 *    got there once. WHAT `done` CANNOT TELL APART is a repeat of Tortie's own
 *    move and a machine where somebody else already held a file at the
 *    destination while the source never existed. The product does not pretend
 *    to distinguish them.
 *  - `git-stage` and `git-unstage` are safe to run twice by END STATE as well,
 *    and for a different reason from `entry-rename`'s. Neither names a
 *    destination to test at all. A second run asks that machine's own git to
 *    put the same paths in the same index, or to take the same paths back out
 *    of it, and git writes what is already there. On a repository with no
 *    commit the restore fails and the same call runs `git rm --cached` over the
 *    same list, which is safe by end state for the same reason.
 *  - `git-commit` is safe by a GUARD IT CARRIES ITSELF, which is the fourth
 *    reason and the only one of the four that no other script uses. It takes
 *    the sha `HEAD` pointed at when Tortie read the folder, compares it against
 *    its own `git rev-parse HEAD`, and answers `moved` without committing when
 *    the two differ. The first run moves `HEAD`, so a repeat of one request
 *    finds it moved and adds no second commit. A repository with no commit
 *    answers nothing from `rev-parse` and its guard value is the word `none`,
 *    so an unborn branch is a state rather than a special case. WHAT THE GUARD
 *    DOES NOT COVER is a stage on that machine between Tortie's read and
 *    Tortie's write, because `HEAD` does not move for a `git add`.
 *    `./remote-commit.ts` compares the staged set for that, and the window
 *    between its read and this commit is one round trip wide and is not closed.
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

/**
 * The most bytes one search answer may hold before encoding, being 4,194,304.
 *
 * CHOSEN rather than measured, and it is a ceiling rather than an expectation.
 * What was measured on this Mac is that the broadest realistic query over this
 * repository produced 1,818,096 bytes of matching lines, which is well inside
 * it. The number is a CONSTANT inside the `repo-search` text as well, because
 * `head -c` on the far side is what enforces it, and condition 52 of
 * `build/conformance-machines.mjs` asserts the two agree. Two copies of one
 * number is how one of them goes stale.
 *
 * THE SCRIPT READS ONE BYTE PAST IT, so its `head -c` says 4,194,305. That
 * extra byte is the whole proof. A first draft of this phase asked whether the
 * answer ended in a newline and called it cut when it did not, which is a guess
 * rather than an answer: `head -c` cuts at a byte offset, and about one cut in
 * every average-line-length lands on a newline. The answer would then have read
 * as complete while the far side had thrown away everything past the ceiling.
 * The script counts the bytes it actually read and prints `1` or `0`, so this
 * end is told rather than left to infer.
 *
 * When it bites, the last line of the body is usually cut in the middle.
 * `./remote-search.ts` drops that final part line and says on screen that the
 * list stops early.
 */
export const REMOTE_SEARCH_MAX_BYTES = 4_194_304;

/**
 * The most bytes one `context-read` LIST parameter may hold. 100,000.
 *
 * The composed command shares {@link REMOTE_SCRIPT_MAX_BYTES}, being 131,072.
 * Research 57 i7 section 3.4 measured 1,263 paths at 47,020 bytes and ruled
 * that a longer list is split at 100,000 bytes. THIS IS THE PER CALL CAP ON
 * THE READ LIST the Phase 108 charter names: a longer list becomes more calls
 * in the same pass, each paying the measured 0.03 s round trip and nothing
 * else. Both list parameters take the same cap. The driver in
 * `./remote-agent-context.ts` enforces it; this file only states the number,
 * because this file imports nothing.
 */
export const CONTEXT_READ_LIST_MAX_BYTES = 100_000;

/**
 * The most bytes of one file `context-read` sends back. 33,554,432.
 *
 * It equals `CONTEXT_READ_LIMITS.bigJsonMaxBytes` in
 * `src/main/context/port.ts`, the largest read the local reader ever asks for,
 * because `~/.claude.json` is over a megabyte today and the ceiling has to
 * clear it the same way on both computers. This file imports nothing, so the
 * two constants cannot share a definition; a unit test in
 * `src/main/machines/__tests__/remote-agent-context.test.ts` asserts they are
 * equal, and condition 58g of `build/conformance-machines.mjs` asserts the
 * same number appears as the `head -c` literal in the script text below. A
 * longer file is truncated by `head -c` on the far side and then fails its
 * parse into a problem row here, which is byte for byte what the local reader
 * does to the same file.
 */
export const CONTEXT_READ_FILE_MAX_BYTES = 33_554_432;

// ---------------------------------------------------------------------------
// The scripts. THIS DIVIDER HAD GONE STALE TWICE and Phase 103 says so rather
// than quietly fixing it a third time: it read fifteen while the array held
// seventeen, Phase 108 moved it to eighteen, and the array holds twenty four
// now. It carries no number any more. The catalogue comment above the array is
// the counted one and the gate is what holds that count.
// ---------------------------------------------------------------------------

/**
 * What the far side prints about itself.
 *
 * `HOME` is what every store root is composed against. Tortie never composes a
 * home path for another computer from anything except that machine's own
 * answer, and this is that answer. `CODEX_HOME` and `XDG_DATA_HOME` are the two
 * names the store descriptors read, and a name that is not set prints as an
 * empty value rather than being absent, so the parse sees the same lines
 * every time.
 *
 * PHASE 108 ADDED THREE LINES, being `claude_config_dir`, `xdg_config_home`
 * and `xdg_state_home`. `resolveHomes` in `src/main/context/env.ts` reads six
 * environment names, and until this phase only `HOME` and `CODEX_HOME`
 * crossed. Without the three, a remote Context read points at `~/.claude` on a
 * machine where the person moved their Claude Code configuration with
 * `CLAUDE_CONFIG_DIR`, and the panel draws an empty Skills section and is
 * wrong rather than empty. `parseMachineFacts` in `./remote-image.ts` ignores
 * a line it does not know, so every caller that predates the three lines keeps
 * working, and all three parse sites were checked rather than assumed.
 */
const MACHINE_FACTS = [
  'set -e',
  'umask 077',
  "printf '__TORTIE_RUN__'",
  "printf 'home=%s\\n' \"$HOME\"",
  "printf 'codex_home=%s\\n' \"${CODEX_HOME:-}\"",
  "printf 'xdg_data_home=%s\\n' \"${XDG_DATA_HOME:-}\"",
  "printf 'claude_config_dir=%s\\n' \"${CLAUDE_CONFIG_DIR:-}\"",
  "printf 'xdg_config_home=%s\\n' \"${XDG_CONFIG_HOME:-}\"",
  "printf 'xdg_state_home=%s\\n' \"${XDG_STATE_HOME:-}\"",
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
 * The FIRST write in this catalogue. It was the only one when Phase 73 wrote
 * this comment, `git-clone` joined it in Phase 90.2 and `file-put` in Phase
 * 101. Its four safety properties are properties of this text rather than of a
 * guard around it.
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
 *     PHASE 96 made that name DETERMINISTIC. It was `"$f.part.$$"`, and `$$` is
 *     the far side shell's process id, so every interrupted upload left a file
 *     nothing would ever open again and the folder grew without a bound. `$1`
 *     is a checksum of the bytes, so one image now has one temporary name and
 *     the next attempt at that image reuses it.
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
  '  t="$f.part"',
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
  // PHASE 109 ADDED THE FILE TEST, in both loops. `[ -x ]` alone passes a
  // DIRECTORY carrying the execute bit, `parseProgramFind` accepts the path
  // because it begins with a slash, and that path reached `argv[0]` and the
  // manifest row. Research 58 section 1.4 reproduced it against a real
  // machine. The manifest is the source of truth for restore, so this pair is
  // a durability correction, and `agents-find` below carries the same pair
  // from birth so the two scripts can never disagree about a directory.
  '  if [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi',
  'done',
  'if [ -z "$f" ]; then',
  '  for d in $x; do',
  '    [ -n "$d" ] || continue',
  '    if [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi',
  '  done',
  'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${s:-none}\" \"${f:-none}\""
].join('\n');

/**
 * Which of Tortie's launchable agents one machine has, asked in ONE call
 * (Phase 109, research 58 sections 2 and 8).
 *
 * ## Why it exists
 *
 * On a tab whose files live on a machine, the create sheet used to grey its
 * agent tiles from THIS Mac's detection scan, which has never heard of a
 * machine. `program-find` answers about one program per call, and eleven
 * calls at once run into the far side's own session limit, which OpenSSH
 * defaults to 10. Research 58 section 2.1 measured one batched call at 52 ms
 * median against 480 ms for eleven serial calls on the same warm connection.
 * So the board's answer is one read, and `program-find` keeps serving the
 * create path and the restore path one program at a time.
 *
 * ## The three values
 *
 *  1. `$1` is the machine's own login list of places it looks for programs,
 *     colon separated, captured by `./remote-path.ts` at Prepare.
 *  2. `$2` is the shared install folders, colon separated, composed against
 *     that machine's own stated home.
 *  3. `$3` is one record per asked name, records separated by NEWLINES. A
 *     record is the bare name, one space, then that name's own agent folders
 *     joined with colons, and the folder list may be empty. Newline is the
 *     record separator because a configured path may hold a colon and may
 *     never hold a newline, and `rebaseRemoteDir` in `./remote-argv.ts`
 *     refuses the colon so it cannot split a record's folder list either.
 *
 * ## The answer
 *
 * One line per record, being the source word, the name, and then the path as
 * THE REST OF THE LINE, because a folder on another computer can hold a space
 * in its name. The source is `path`, `agent` or `install` for a file that was
 * found, and `none` for a name that was not. After the records, an optional
 * section begins with the word `unreadable` and then names, one per line,
 * every folder on the two shared lists that exists and cannot be read or
 * entered, so the caller can refuse to call a `none` from a walk that could
 * not see everything.
 *
 * ## What never reaches this text
 *
 * NOTHING A PERSON TYPED AND NOTHING AN AGENT WROTE REACHES THE SCRIPT TEXT.
 * The names are `launch.argv[0]` of compiled or confirmed rows, the first
 * list is the machine's own answer about itself, and every folder is either a
 * compiled constant or a configured entry that already passed the plain
 * folder rules. All three values cross as positional parameters, each read
 * once into a local name and split under `IFS`, exactly as `program-find`
 * does it. It tests `[ -f ]` beside `[ -x ]` from birth, so a directory with
 * the execute bit is never called a program.
 */
const AGENTS_FIND = [
  'set -e',
  'umask 077',
  'p="$1"',
  'x="$2"',
  'r="$3"',
  'o=',
  'b=',
  'IFS=:',
  'for d in $p; do',
  '  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d',
  '"; fi',
  'done',
  'for d in $x; do',
  '  if [ -n "$d" ] && [ -d "$d" ] && { [ ! -r "$d" ] || [ ! -x "$d" ]; }; then b="$b$d',
  '"; fi',
  'done',
  "IFS='",
  "'",
  'for line in $r; do',
  '  if [ -z "$line" ]; then continue; fi',
  '  n=${line%% *}',
  '  if [ "$n" = "$line" ]; then e=; else e=${line#* }; fi',
  '  f=',
  '  s=',
  '  IFS=:',
  '  for d in $p; do',
  '    if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi',
  '  done',
  '  if [ -z "$f" ]; then',
  '    for d in $e; do',
  '      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=agent; break; fi',
  '    done',
  '  fi',
  '  if [ -z "$f" ]; then',
  '    for d in $x; do',
  '      if [ -n "$d" ] && [ -f "$d/$n" ] && [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi',
  '    done',
  '  fi',
  "  IFS='",
  "'",
  '  o="$o${s:-none} $n ${f:-none}',
  '"',
  'done',
  "printf '__TORTIE_RUN__%s%s__TORTIE_RUN__\\n' \"${o:-none}\" \"${b:+unreadable",
  '$b}"'
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
 * Every matching line in one folder on another machine (Phase 98).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine, and the Search view in that tab
 * has to answer. Research 57 section 2 measured the three ways of doing that and
 * refused two of them. Sending a ripgrep to the machine buys 0.15 s and costs a
 * third write door, a transfer protocol, a binary per architecture and a Tortie
 * placed executable on somebody else's computer. Copying the files here costs
 * 2.4 s of link time against 0.176 s of scanning in place, and it puts a
 * person's source on a second computer. So the scan happens where the files are,
 * with the program that machine already has.
 *
 * ## Which files are read
 *
 * Inside a repository, `git ls-files --cached --others --exclude-standard` names
 * the tracked files plus the untracked files git is not ignoring. That is the
 * same set ripgrep reads on this Mac, so a search here and a search there answer
 * about the same files. Research 57 measured `git ls-files -z` alone, which
 * lists tracked files only, and this script deviates from that on purpose: a
 * file an agent on that machine made five minutes ago and has not committed is a
 * file Phase 97 already put on a person's screen in the Changes list, and it
 * would not have been searched. Measured on this Mac over 1,598 files the extra
 * listing costs 10 ms, being 0.02 to 0.03 s against 0.01 to 0.02 s.
 *
 * Outside a repository the script walks every file under the folder with `find`
 * and prunes `.git`. That is Decision 2 of 2026-08-19, taken with its cost
 * known: the walk measured 366 to 753 ms against 174 to 176 ms, and its answer
 * includes build output. The answer carries the word `walk` so the panel can say
 * the folder is not a repository and that nothing was skipped.
 *
 * ## The five values
 *
 * ```
 *   $1  the folder on that machine, absolute
 *   $2  the pattern, which rides behind -e so a pattern starting with a dash
 *       is a pattern rather than a flag
 *   $3  the flag letters: i for ignore case, w for whole word, e for a regular
 *       expression, in any combination, and the empty string for none
 *   $4  how many matching lines to print, being the match cap PLUS ONE
 *   $5  how many characters of one line to keep
 * ```
 *
 * `$3` IS LETTERS AND NEVER FLAG TEXT. Each letter is compared against a
 * constant with `case`, and the value assigned is a constant in this text. So a
 * caller cannot put a word of its own on the `grep` command line. The three
 * shell names expanded without quotes are `ic`, `wd` and `rx`, and each can hold
 * only one of four constants this script itself assigned.
 *
 * `$4` IS THE CAP PLUS ONE. A body holding more lines than the cap is proof the
 * cap bit, so main can say "the first 20,000" without asking the machine to walk
 * the tree a second time to count. `tree-list` pays for that second walk. A
 * search would pay 0.17 s for it and this shape pays nothing.
 *
 * ## The answer
 *
 * ```
 *   __TORTIE_RUN__<mode> <cut> <base64 of grep's own lines>__TORTIE_RUN__
 * ```
 *
 * `<mode>` is `repo`, `walk`, `missing` or `badpattern`. `<cut>` is `1` when the
 * byte ceiling bit and `0` when it did not. The third word is the word `none`
 * when there is nothing, exactly as `review-list` does it. The body is base64
 * because a matching line can hold any byte, including a newline in a file name
 * and any control character. Decoded it is `grep -H -n` output, being
 * `<path>:<line>:<text>` per line. `-H` is not optional: `xargs` hands `grep` its
 * last batch, and a batch of one file makes `grep` drop the name.
 *
 * THE SCRIPT SAYS WHETHER IT CUT, rather than leaving this end to guess. It
 * reads the ceiling PLUS ONE BYTE, then counts the bytes it read back out of the
 * base64 it is about to send, being `${#o} / 4 * 3` less the padding, and
 * compares that count against the ceiling. So `<cut>` is an answer and not an
 * inference. The first draft asked whether the body ended in a newline instead,
 * and `head -c` cuts at a byte offset, so about one cut in every average line
 * length would have landed on a newline and been reported as a complete result
 * set.
 *
 * ## What it cannot do, said plainly
 *
 *  - A file whose NAME holds a newline arrives as two lines and the second one
 *    does not parse. It is dropped, which is the rule `tree-list` already
 *    carries.
 *  - `cut -c` counts bytes under the `C` locale, which is the locale a non
 *    interactive sign in gets. A line cut at the character cap can end in the
 *    middle of a multi-byte character, and that character arrives as one
 *    replacement character.
 *  - `cut -c "1-$5"` COUNTS THE WHOLE LINE, being the path, the line number and
 *    the two colons as well as the text. The search on this Mac applies that cap
 *    to the line text alone, so a deep path leaves less text than the same query
 *    would leave here. Measured on this Mac, a 5,006 character line in a file
 *    called `p98-long.ts` arrived at 1,986 characters, being the 2,000 character
 *    cap less the 14 characters of `p98-long.ts:1:`.
 *  - THERE IS NO FILE SIZE CAP HERE. The search on this Mac hands ripgrep
 *    `--max-filesize`, being `SEARCH_LIMITS.maxFilesizeBytes` at 10,485,760, so
 *    a file larger than that is not read here. This script has no size test at
 *    all and reads that file. Three of the four caps are the same on both
 *    computers and this is the fourth. Adding it would cost one `stat` per file
 *    inside the repository branch, where the file list comes from git rather
 *    than from `find`.
 *  - A folder that is a repository on a machine with no `git` at all takes the
 *    walk branch, and the panel then says the folder is not a repository, which
 *    names the wrong cause. No machine this product can hold a session on has
 *    been seen without git.
 *  - Binary files are skipped by `grep -I`, which is the policy the search on
 *    this Mac already has.
 *  - EVERY NUMBER IN THIS BLOCK WAS MEASURED WITH THIS MAC AS THE FAR SIDE, over
 *    a loopback connection. The programs a Linux machine runs are GNU `grep`,
 *    GNU `xargs` and GNU `find` rather than the BSD ones measured here. Every
 *    flag used is in POSIX and behaves the same in both, and that is reasoned
 *    about rather than measured.
 */
const REPO_SEARCH = [
  'set -e',
  'umask 077',
  'if [ ! -d "$1" ]; then',
  "  printf '__TORTIE_RUN__missing 0 none__TORTIE_RUN__\\n'",
  'else',
  '  cd "$1"',
  '  ic=""',
  '  case "$3" in *i*) ic="-i";; esac',
  '  wd=""',
  '  case "$3" in *w*) wd="-w";; esac',
  '  rx="-F"',
  '  case "$3" in *e*) rx="-E";; esac',
  '  s=0',
  "  printf '' | grep $rx $ic $wd -e \"$2\" 2>/dev/null || s=$?",
  '  if [ "$s" -gt 1 ]; then',
  "    printf '__TORTIE_RUN__badpattern 0 none__TORTIE_RUN__\\n'",
  '  else',
  '    r=$(git rev-parse --show-toplevel 2>/dev/null || true)',
  '    if [ -n "$r" ]; then',
  '      m=repo',
  '      o=$(git ls-files -z --cached --others --exclude-standard |' +
    ' xargs -0 grep -I -H -n $ic $wd $rx -e "$2" 2>/dev/null |' +
    ' cut -c "1-$5" | head -n "$4" | head -c 4194305 | base64 |' +
    " tr -d '\\n' || true)",
  '    else',
  '      m=walk',
  "      o=$(find . -name '.git' -prune -o -type f -print0 2>/dev/null |" +
    ' xargs -0 grep -I -H -n $ic $wd $rx -e "$2" 2>/dev/null |' +
    ' cut -c "1-$5" | head -n "$4" | head -c 4194305 | base64 |' +
    " tr -d '\\n' || true)",
  '    fi',
  '    p=0',
  '    case "$o" in *==) p=2;; *=) p=1;; esac',
  '    n=$(( ${#o} / 4 * 3 - p ))',
  '    c=0',
  '    if [ "$n" -gt 4194304 ]; then c=1; fi',
  "    printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__\\n' \"$m\" \"$c\" \"${o:-none}\"",
  '  fi',
  'fi'
].join('\n');

/**
 * Every file name in one folder on another machine (Phase 99).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine, and until this phase the Quick
 * Open palette on that tab drew a sentence saying it does not reach over there.
 * It does now. This script is where the names come from. Research 57 section 6
 * ruled Quick Open in and Symbols out, because ranking a name list needs no
 * parser and finding a symbol does, and there is no parser on that machine.
 *
 * ## Which names are read
 *
 * Inside a repository, `git ls-files --cached --others --exclude-standard`
 * names the tracked files plus the untracked files git is not ignoring. That is
 * the same set `rg --files` reads on this Mac, so the palette on a remote tab
 * and the palette on a local tab list the same kind of thing. A file an agent
 * on that machine made five minutes ago and has not committed is in the list,
 * which is the case this feature exists for.
 *
 * Outside a repository the script walks every file under the folder with `find`
 * and prunes `.git` and `node_modules`. That answer can hold build output, and
 * the palette says so on screen.
 *
 * ## The two values
 *
 * ```
 *   $1  the folder on that machine, absolute
 *   $2  how many names to print, being the cap PLUS ONE
 * ```
 *
 * `$2` IS THE CAP PLUS ONE, exactly as `repo-search`'s `$4` is. A body holding
 * more lines than the cap is proof the cap bit, so nothing has to walk the tree
 * a second time to count. This is the one place this phase departs from
 * research 57 section 6.5, which sketched an honest total printed before the
 * capped list. That total costs a second enumeration and no surface draws one:
 * the palette on this Mac says it is showing the first 200,000 files in a
 * project and reports no total either.
 *
 * ## The answer
 *
 * ```
 *   __TORTIE_RUN__<mode> <cut> <base64 of one name per line>__TORTIE_RUN__
 * ```
 *
 * `<mode>` is `repo`, `walk` or `missing`. `<cut>` is `1` when the byte ceiling
 * bit and `0` when it did not. The third word is the word `none` when there is
 * nothing, exactly as `review-list` does it. The body is base64 because a file
 * name can hold any byte except NUL, and base64 is also what stops a file name
 * from ever forging the marker pair.
 *
 * THE SCRIPT SAYS WHETHER IT CUT, rather than leaving this end to guess. It
 * reads the ceiling PLUS ONE BYTE, then counts the bytes it read back out of
 * the base64 it is about to send, being `${#o} / 4 * 3` less the padding, and
 * compares that count against the ceiling. So `<cut>` is an answer and not an
 * inference. That is the whole finding Phase 98 wrote down: `head -c` cuts at a
 * byte offset, so about one cut in every average line length lands on a
 * newline, and a reader that asked whether the body ended cleanly would call a
 * cut list complete.
 *
 * ## What it cannot do, said plainly
 *
 *  - A file name holding a NEWLINE arrives as two lines. Git quotes such a
 *    name, so the repository branch delivers it as one line beginning with `"`,
 *    and `./remote-files.ts` DROPS a line beginning with `"` rather than
 *    guessing at it. The walk branch has no such quoting, so the two halves
 *    arrive as two lines and both are wrong. That is the rule `tree-list`
 *    already carries.
 *  - THERE IS NO FILE SIZE CAP AND THERE DOES NOT NEED TO BE ONE. This script
 *    carries names and never contents.
 *  - The `walk` branch's answer can include build output, apart from what is
 *    inside `.git` and `node_modules`. The palette says so.
 *  - A folder that is a repository on a machine with no `git` at all takes the
 *    walk branch, and the palette then says the folder is not a repository,
 *    which names the wrong cause. That is `repo-search`'s own limitation,
 *    unchanged.
 *  - EVERY NUMBER RESEARCH 57 SECTION 6 MEASURED had this Mac or the operator's
 *    own tailnet as the far side. GNU `git`, GNU `find` and GNU `head` are
 *    reasoned about from POSIX rather than measured.
 */
const REPO_FILES = [
  'set -e',
  'umask 077',
  'if [ ! -d "$1" ]; then',
  "  printf '__TORTIE_RUN__missing 0 none__TORTIE_RUN__\\n'",
  'else',
  '  cd "$1"',
  '  r=$(git rev-parse --show-toplevel 2>/dev/null || true)',
  '  if [ -n "$r" ]; then',
  '    m=repo',
  '    o=$(git ls-files --cached --others --exclude-standard |' +
    ' head -n "$2" | head -c 4194305 | base64 |' +
    " tr -d '\\n' || true)",
  '  else',
  '    m=walk',
  "    o=$(find . \\( -name '.git' -o -name 'node_modules' \\) -prune -o" +
    ' -type f -print 2>/dev/null |' +
    ' head -n "$2" | head -c 4194305 | base64 |' +
    " tr -d '\\n' || true)",
  '  fi',
  '  p=0',
  '  case "$o" in *==) p=2;; *=) p=1;; esac',
  '  n=$(( ${#o} / 4 * 3 - p ))',
  '  c=0',
  '  if [ "$n" -gt 4194304 ]; then c=1; fi',
  "  printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__\\n' \"$m\" \"$c\" \"${o:-none}\"",
  'fi'
].join('\n');

/**
 * Four short strings about one folder on another machine (Phase 105).
 *
 * It exists so the Runs section on a tab whose project lives over there can ask
 * GitHub about the right branch. `./remote-runs.ts` reads the answer, and it
 * asks GitHub from THIS Mac with the `gh` this Mac already has.
 *
 * ## The property this script rests on, and it decides everything below
 *
 * NO CREDENTIAL AND NO `gh` CROSSES. The gh program runs on this Mac and never
 * leaves it. No token, no `gh` invocation and no GitHub host name is sent to the
 * machine. Four short strings travel back, being a mode word, the origin
 * address, the branch name and the commit HEAD points at. Condition 55d of
 * `build/conformance-machines.mjs` reads this text and fails on any of `gh`,
 * `GH_TOKEN`, `GITHUB_TOKEN`, `GH_HOST`, `Authorization`, `hosts.yml`,
 * `.config/gh`, `netrc` and `curl`, which is the executable form of that
 * sentence rather than a promise about it.
 *
 * ## Three git processes, and `--git-common-dir` rather than `--absolute-git-dir`
 *
 * Research 57 section 5.2 priced this read at four spawns and 52.4 ms. It needs
 * three, because one `rev-parse` answers where the git directory is and `awk`
 * reads the origin out of its config, which is what `repo-find` already does.
 *
 * THE FIRST VERB IS `--git-common-dir` AND IT IS NEVER `--absolute-git-dir`.
 * Research 57 section 9 defect 5 records that `resolveGitDir` in
 * `src/main/git/service.ts` uses the second one, which answers with a linked
 * worktree's OWN git directory. MEASURED on 2026-08-20 against the worktree this
 * phase was built in: `--git-common-dir` answered `/Users/gdc/gmux/.git`, whose
 * `config` holds `https://github.com/gregce/tortie.git`, and
 * `--absolute-git-dir` answered `/Users/gdc/gmux/.git/worktrees/wt-p105`, whose
 * `config` holds no origin at all. A Runs section built on the second one would
 * report "no GitHub address" for a worktree that has one. Condition 55f fails on
 * the wrong spelling.
 *
 * `--git-common-dir` answers relative to the current directory when it can, e.g.
 * `.git` at the top level and `../../.git` two directories down. The script has
 * already run `cd "$1"`, so `"$g/config"` resolves from either form. Both were
 * measured.
 *
 * ## Two edge cases handled rather than accepted
 *
 * A DETACHED HEAD REPORTS NO BRANCH. `git rev-parse --symbolic-full-name HEAD`
 * prints the word `HEAD` on a detached head, and a branch called `HEAD` handed
 * to gh would be a question about a branch nobody has. The `case` line keeps a
 * value only when it begins `refs/heads/`, so the branch travels as the empty
 * word and the answer prints `none`.
 *
 * A REPOSITORY WITH NO COMMITS REPORTS NO SHA. Without `--verify --quiet` that
 * repository answers with the literal string `HEAD` on stdout, which would have
 * been drawn on screen as a commit. With it, the answer is `none`.
 *
 * ## The five answers, each one measured on 2026-08-20 before this was written
 *
 * | First word | Meaning | Measured against |
 * | --- | --- | --- |
 * | `repo` | the folder is inside a repository, and the three fields follow | a top level, a subdirectory two deep, and a linked worktree |
 * | `notrepo` | the folder is there and git does not know it | a plain directory |
 * | `missing` | there is no folder at that path | a path that does not exist |
 * | `denied` | the folder is there and the account cannot read it | a directory at mode 000 |
 * | no markers | the machine did not answer | not a branch of this script |
 *
 * `denied` exists because `dir-list` and `tree-list` already have it. Without it
 * a folder the account cannot read would come back as "the machine did not
 * answer", which names the wrong cause. `review-list` has that gap today and
 * this script does not repeat it.
 *
 * ## What it cannot find, said plainly
 *
 * The origin is the first `url` line under `[remote "origin"]`. A repository
 * that uses a different remote name, and one with an `insteadOf` rewrite, are
 * both read as having no address. A machine with no `git` at all answers
 * `notrepo`, which names the wrong cause, and that is `repo-search`'s existing
 * limitation rather than a new one.
 *
 * ## The catalogue rules, one at a time
 *
 * The text holds no backtick and no caller value. The only positional is `"$1"`,
 * read double quoted at three places, and `g`, `u`, `e`, `h`, `b`, `n` and `s`
 * are local names. It begins `set -e` and then `umask 077`. Every answer is
 * printed between the marker pair. It names none of the eleven mutating
 * programs: it names `git`, `awk`, `printf`, `base64`, `tr`, `cd` and `test`.
 * Every `>` in it is part of `2>/dev/null`, and there are FOUR of those. It is a
 * `read`, so the two writers in this catalogue do not move. It names one git
 * verb and that verb is `rev-parse`, which was already on the list, so
 * `ALLOWED_GIT_VERBS` stays at four. The awk program holds no `$` followed by a
 * digit, for the reason `repo-find` states.
 *
 * Running it twice reads the same folder twice. It writes nothing on either
 * computer.
 */
const REPO_FACTS = [
  'set -e',
  'umask 077',
  'if [ ! -d "$1" ]; then',
  "  printf '__TORTIE_RUN__missing none none none__TORTIE_RUN__\\n'",
  'elif [ ! -r "$1" ] || [ ! -x "$1" ]; then',
  "  printf '__TORTIE_RUN__denied none none none__TORTIE_RUN__\\n'",
  'else',
  '  cd "$1"',
  '  g=$(git rev-parse --git-common-dir 2>/dev/null || true)',
  '  if [ -z "$g" ]; then',
  "    printf '__TORTIE_RUN__notrepo none none none__TORTIE_RUN__\\n'",
  '  else',
  '    u=$(awk \'/^\\[remote "origin"\\]/ { f=1; next } /^\\[/ { f=0 }' +
    ' f && /^[ \\t]*url[ \\t]*=/ { sub(/^[ \\t]*url[ \\t]*=[ \\t]*/, "");' +
    ' print; exit }\' "$g/config" 2>/dev/null || true)',
  '    e=$(printf \'%s\' "$u" | base64 | tr -d \'\\n\')',
  '    h=$(git rev-parse --symbolic-full-name HEAD 2>/dev/null || true)',
  '    b=',
  '    case "$h" in refs/heads/*) b=${h#refs/heads/};; esac',
  '    n=$(printf \'%s\' "$b" | base64 | tr -d \'\\n\')',
  '    s=$(git rev-parse --verify --quiet HEAD 2>/dev/null || true)',
  "    printf '__TORTIE_RUN__repo %s %s %s__TORTIE_RUN__\\n'" +
    ' "${e:-none}" "${n:-none}" "${s:-none}"',
  '  fi',
  'fi'
].join('\n');

/**
 * The branch checked out in one folder on a machine (Phase 106, research 57
 * section 5).
 *
 * ## What it answers, and why a second read exists beside `repo-facts`
 *
 * `repo-facts` gives the branch name and the commit `HEAD` points at. It gives
 * neither the branch that one follows nor the two counts, which are two of the
 * three things the Branch group must show. Widening `repo-facts` would make
 * every Runs read pay for a group nobody opened, which is the union script
 * shape research 57 section 5.3 refused. So each group pays for itself and a
 * collapsed group costs nothing.
 *
 * ## The six answers
 *
 * | First word | Meaning |
 * | --- | --- |
 * | `repo` | a branch is checked out, and one base64 field follows |
 * | `nobranch` | a commit is checked out directly, or there are no commits |
 * | `nodetails` | the branch name was read and its details could not be |
 * | `notrepo` | the folder is there and git does not track it |
 * | `missing` | there is no folder at that path |
 * | `denied` | the folder is there and the account cannot read it |
 *
 * `nodetails` exists so an old git names the right cause. `%(upstream:track)`
 * takes the `nobracket` option only from git 2.13. An older git refuses the
 * whole format, `for-each-ref` prints nothing and exits non-zero, and without
 * this branch the answer would have been `repo` with an empty payload, which
 * the parser would read as no branch at all. That names the wrong cause. It
 * also catches any other reason `for-each-ref` produced nothing.
 *
 * ## The format is `BRANCH_FORMAT` minus one field, and the gate holds it there
 *
 * The format below plus `%(subject)` is exactly `BRANCH_FORMAT` from
 * `src/main/git/parse.ts`, so `parseForEachRefBranches` reads this answer
 * unchanged and THE MAIN SIDE WRITES NO SECOND PARSER. Condition 56d of
 * `build/conformance-machines.mjs` asserts that relation, so the two copies
 * cannot drift. The subject is the one field of `BRANCH_FORMAT` with no length
 * bound and this read carries no cut, so it is not asked for. The trailing
 * `%1f` leaves the seventh field empty, which is what keeps the field count at
 * the seven that parser needs.
 *
 * ## Why each line is the way it is
 *
 *  - `--git-common-dir` and never `--absolute-git-dir`. That is research 57
 *    section 9 defect 5. Here the call is the repository test rather than a
 *    config read, and it still has to be the common spelling, because a linked
 *    worktree must answer as a repository.
 *  - `--symbolic-full-name HEAD` prints the word `HEAD` on a detached head, and
 *    prints nothing in a repository with no commits. The `case` keeps a value
 *    only when it begins `refs/heads/`, so both land on `nobranch` and a branch
 *    called `HEAD` is never drawn.
 *  - The refname reaches `for-each-ref` as `"$h"`, which is git's OWN output on
 *    that machine and never a caller value. It is quoted. git forbids `*`, `?`,
 *    `[`, `~`, `^`, `:` and a backslash in a ref name, so the pattern cannot
 *    hold a glob character.
 *  - The answer is base64 so a field holding a space survives.
 *    `%(upstream:track,nobracket)` prints `ahead 2, behind 1`, which holds two
 *    spaces and a comma.
 *  - IT NEVER FETCHES. The counts are measured against the copy of the upstream
 *    that machine last fetched, and Tortie runs no fetch of its own, so the
 *    answer can be older than what is on the server at the moment it is read.
 *    The renderer says so on screen and condition 56i fails this text if it ever
 *    names `git fetch`, `git pull` or `git remote update`.
 *
 * ## The external programs it runs, COUNTED rather than estimated
 *
 * Research 57 section 5.1 priced this read at 3, counting git alone. That is
 * the same shape of mistake the Phase 105 entry made when it said 4 and the far
 * side ran 8. MEASURED on 2026-08-20 by putting counting wrappers on PATH ahead
 * of git, base64 and tr and running this text against scratch repositories:
 *
 * | Far side path | Programs | Which ones |
 * | --- | --- | --- |
 * | a folder that is not there | 0 | none |
 * | a folder the account cannot read | 0 | none |
 * | a folder git does not track | 1 | git rev-parse |
 * | a detached head, or no commits | 2 | git rev-parse twice |
 * | a branch is checked out | 5 | git rev-parse twice, git for-each-ref once, base64 once, tr once |
 *
 * `printf`, `cd`, `case` and `[` are builtins in dash and in bash, so a counting
 * wrapper on PATH never sees them and they are not in those numbers. Row 12 of
 * `node build/probe-p106-branch.mjs` measures the same thing again on every run.
 *
 * ## The catalogue rules, one at a time
 *
 * The text holds no backtick and no caller value. The only positional is `"$1"`,
 * read double quoted at four places, and `g`, `h` and `r` are local names. It
 * begins `set -e` and then `umask 077`. Every answer is printed between the
 * marker pair, and there are six pairs. It names none of the eleven mutating
 * programs: it names `git`, `printf`, `base64`, `tr`, `cd` and `test`. Every `>`
 * in it is part of `2>/dev/null`, and there are THREE of those. It is a `read`,
 * so the two writers in this catalogue do not move. It names two git verbs,
 * being `rev-parse` and `for-each-ref`, and the second is the one this phase
 * added to rule 7.
 *
 * Running it twice reads the same folder twice. It writes nothing on either
 * computer.
 */
const REPO_BRANCH = [
  'set -e',
  'umask 077',
  'if [ ! -d "$1" ]; then',
  "  printf '__TORTIE_RUN__missing none__TORTIE_RUN__\\n'",
  'elif [ ! -r "$1" ] || [ ! -x "$1" ]; then',
  "  printf '__TORTIE_RUN__denied none__TORTIE_RUN__\\n'",
  'else',
  '  cd "$1"',
  '  g=$(git rev-parse --git-common-dir 2>/dev/null || true)',
  '  if [ -z "$g" ]; then',
  "    printf '__TORTIE_RUN__notrepo none__TORTIE_RUN__\\n'",
  '  else',
  '    h=$(git rev-parse --symbolic-full-name HEAD 2>/dev/null || true)',
  '    r=',
  '    case "$h" in',
  '      refs/heads/*)',
  "        r=$(git for-each-ref --format='%(refname:short)%1f%(HEAD)%1f" +
    '%(objectname)%1f%(objectname:short)%1f%(upstream:short)%1f' +
    "%(upstream:track,nobracket)%1f' \"$h\" 2>/dev/null" +
    " | base64 | tr -d '\\n' || true)",
  '        if [ -z "$r" ]; then',
  "          printf '__TORTIE_RUN__nodetails none__TORTIE_RUN__\\n'",
  '        else',
  "          printf '__TORTIE_RUN__repo %s__TORTIE_RUN__\\n' \"$r\"",
  '        fi',
  '        ;;',
  '      *)',
  "        printf '__TORTIE_RUN__nobranch none__TORTIE_RUN__\\n'",
  '        ;;',
  '    esac',
  '  fi',
  'fi'
].join('\n');

/**
 * A page of the newest commits in one folder on a machine (Phase 107, research
 * 57 section 5).
 *
 * ## What it answers
 *
 * Six words. The first says what the folder is, and the five after it are the
 * commit HEAD points at, the commit the followed branch points at, the merge
 * base of those two, the walk itself, and the two sides of the divergence. The
 * last two are base64, because a commit subject can hold anything at all.
 *
 * | First word | Meaning |
 * | --- | --- |
 * | `repo` | the folder is a repository and five fields follow |
 * | `notrepo` | the folder is there and git does not track it |
 * | `missing` | there is no folder at that path |
 * | `denied` | the folder is there and the account cannot read it |
 *
 * The three words that are not `repo` print `none` five times, so every answer
 * this script can print is six words long.
 *
 * ## Why the walk is `--branches --tags --remotes` and not `git log --stdin`
 *
 * Research 57 section 5.5 proposed reading the ref names with `for-each-ref` on
 * the far side, piping them into `git log --stdin`, and moving the guard
 * `sanitizeRefNames` over there with them. This script does not do that. Four
 * reasons, and the third decides it. It was measured on 2026-08-20 against git
 * 2.50.1 rather than reasoned.
 *
 *  1. It is one process fewer. The `--stdin` shape runs `for-each-ref` and then
 *     `log`, being two git processes. This one runs `log`, being one.
 *  2. No ref name is a value at any point. Nothing is enumerated on the far
 *     side, nothing is piped, nothing is quoted into an argument and no name
 *     crosses the link. So `sanitizeRefNames` is not moved to the far side. Its
 *     job is removed instead of relocated.
 *  3. `git log --stdin` WALKS HEAD WHEN ITS INPUT IS EMPTY, AND IT DOES SO
 *     SILENTLY. Measured on git 2.50.1, `printf '' | git log --stdin` printed
 *     the HEAD commit, and `printf '\n' | git log --stdin` printed it too. A
 *     `for-each-ref` that printed nothing, which is what a repository with no
 *     refs gives, would therefore answer with a HEAD only walk while this end
 *     believed it had asked for every branch, tag and remote branch. `walk()` in
 *     `src/main/git/service.ts` carries an explicit guard for exactly this and
 *     calls it a guard rather than an optimisation. On the far side that guard
 *     would have to be written again in `sh`. `--branches --tags --remotes`
 *     cannot fall back, because there is no list that can be empty.
 *  4. `--branches --tags --remotes` is exactly `refs/heads`, `refs/remotes` and
 *     `refs/tags`, which is what `allWalkableRefs()` walks locally. It is not
 *     `--all`, which research 24 refused because that drags in `refs/stash` and
 *     `refs/notes/*`.
 *
 * ONE REASON AN EARLIER DRAFT GAVE IS WITHDRAWN, because the measurement
 * refused it. The draft said a tag pointing at a blob is a hard
 * `fatal: not a commit` under the `--stdin` shape, which is what `parseScopeRefs`
 * filters against locally. Measured on git 2.50.1 with a lightweight tag on a
 * blob and again with an annotated tag on a blob. BOTH shapes answered with the
 * commit row at exit code 0 and neither failed. So that filter is defensive on
 * this version of git rather than load bearing, and the tag case is not a
 * reason to prefer one shape over the other. Row 12 of
 * `node build/probe-p107-history.mjs` still builds the case, because the
 * shipped shape has to survive it on the far side's own git.
 *
 * ## The format is `GRAPH_LOG_FORMAT` itself, and the gate holds it there
 *
 * The literal below is exactly `GRAPH_LOG_FORMAT` from
 * `src/main/git/graph-parse.ts`, so `parseGraphLog` reads this answer unchanged
 * and THE MAIN SIDE WRITES NO SECOND PARSER. This file imports nothing, not
 * even a type, so the format is written out here as a literal. Two copies of
 * one format is how one of them goes stale, and condition 57d of
 * `build/conformance-machines.mjs` asserts the literal equals the constant.
 *
 * ## Why each line is the way it is
 *
 *  - `--git-common-dir` and never `--absolute-git-dir`. That is research 57
 *    section 9 defect 5. A linked worktree must answer as a repository, and row
 *    9 of `node build/probe-p107-history.mjs` is the row that fails when the
 *    wrong spelling is used.
 *  - `@{u}` is a constant in this text. It is git's own spelling for the
 *    upstream of HEAD, it is not a caller value, and it fails quietly on a
 *    detached head, on a branch that follows nothing and on a branch whose
 *    upstream that machine no longer has. All three leave `p` empty, and then
 *    no merge base and no marks are read at all.
 *  - `"$s...$p"` holds two local names and both are commit names git itself
 *    printed on that machine. It is quoted. This is the same shape `repo-branch`
 *    uses when it passes `"$h"` to `for-each-ref`.
 *  - `--max-count="$2"` is a caller value used as an argument. It is quoted, and
 *    main clamps it to an integer between 1 and 501 before it is sent.
 *    `review-file` already passes `"$3"` to `head -c` and `repo-search` already
 *    passes a count to `grep -m`, so this is the established shape.
 *  - The two answers are base64 so a commit subject holding a newline, a space
 *    or a NUL survives the trip.
 *  - IT NEVER FETCHES. The marks are measured against the copy of the upstream
 *    that machine last fetched, so they can be older than what is on the server
 *    at the moment they are read. Condition 57g fails this text if it ever names
 *    `git fetch`, `git pull` or `git remote update`.
 *
 * ## The external programs it runs, ESTIMATED HERE AND COUNTED BY THE PROBE
 *
 * Research 57 priced Phase 105 at 4 and the truth was 8, and Phase 106 at 3 and
 * the truth was 5, so the table in the header of
 * `src/main/machines/remote-history.ts` is the one that carries the MEASURED
 * numbers. Row 16 of `node build/probe-p107-history.mjs` measures them again on
 * every run by putting counting wrappers on PATH ahead of `git`, `base64` and
 * `tr`.
 *
 * ## The catalogue rules, one at a time
 *
 * The text holds no backtick and no caller value. The positionals are `"$1"`,
 * read double quoted at four places, and `"$2"`, read double quoted at two
 * places. Every other name in it is a local. It begins `set -e` and then
 * `umask 077`. Every answer is printed between the marker pair, and there are
 * four pairs. It names none of the eleven mutating programs: it names `git`,
 * `printf`, `base64`, `tr`, `cd` and `test`. Every `>` in it is part of
 * `2>/dev/null`, and there are SIX of those. It is a `read`, so the two writers
 * in this catalogue do not move. It names four git verbs, being `rev-parse`,
 * `log`, `merge-base` and `rev-list`, and the last three are the ones this
 * phase added to rule 7.
 *
 * Running it twice reads the same folder twice. It writes nothing on either
 * computer.
 */
const REPO_HISTORY = [
  'set -e',
  'umask 077',
  'if [ ! -d "$1" ]; then',
  "  printf '__TORTIE_RUN__missing none none none none none__TORTIE_RUN__\\n'",
  'elif [ ! -r "$1" ] || [ ! -x "$1" ]; then',
  "  printf '__TORTIE_RUN__denied none none none none none__TORTIE_RUN__\\n'",
  'else',
  '  cd "$1"',
  '  g=$(git rev-parse --git-common-dir 2>/dev/null || true)',
  '  if [ -z "$g" ]; then',
  "    printf '__TORTIE_RUN__notrepo none none none none none__TORTIE_RUN__\\n'",
  '  else',
  '    s=$(git rev-parse --verify --quiet HEAD 2>/dev/null || true)',
  "    p=$(git rev-parse --verify --quiet '@{u}' 2>/dev/null || true)",
  '    l=$(git --no-pager log --branches --tags --remotes -z --topo-order' +
    ' --decorate=full --max-count="$2"' +
    " --format='%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s'" +
    " 2>/dev/null | base64 | tr -d '\\n' || true)",
  '    m=',
  '    d=',
  '    if [ -n "$s" ] && [ -n "$p" ]; then',
  '      m=$(git merge-base "$s" "$p" 2>/dev/null || true)',
  '      d=$(git rev-list --left-right --max-count="$2" "$s...$p"' +
    " 2>/dev/null | base64 | tr -d '\\n' || true)",
  '    fi',
  "    printf '__TORTIE_RUN__repo %s %s %s %s %s__TORTIE_RUN__\\n'" +
    ' "${s:-none}" "${p:-none}" "${m:-none}" "${l:-none}" "${d:-none}"',
  '  fi',
  'fi'
].join('\n');

/**
 * What one folder on a machine holds and what a list of files there says
 * (Phase 108, research 57 section 7 and research 57 i7).
 *
 * ## What it is for
 *
 * The Context view shows the skills, MCP servers, hooks, plugins and
 * instruction files the agents will load. On a tab whose project lives on
 * another machine, the reader in `src/main/context/scan.ts` runs UNCHANGED on
 * this Mac against a bundle of answers, and this script is how the bundle is
 * filled. The driver in `./remote-agent-context.ts` sends the paths the reader
 * missed, this script answers with listings and file bytes, and the reader
 * runs again. THE FAR SIDE DOES NO PARSING. It does not know what `SKILL.md`
 * is, and that is what keeps it one script rather than a second copy of the
 * per agent precedence table.
 *
 * ## The three values
 *
 * ```
 *   $1  a newline separated list of directories to enumerate
 *   $2  the depth to enumerate each of them to. The driver always sends 2
 *   $3  a newline separated list of files to read back
 * ```
 *
 * Each list is read once, in quotes, into a local name, and the word splitting
 * happens on that local name under `IFS` set to a newline. That is the
 * `program-find` shape, being condition 46's precedent, because `for d in $1`
 * would be a bare positional and rule 2 of this catalogue would be gone.
 * `set -f` stands beside it so a path holding `*` stays a path rather than
 * becoming a pattern.
 *
 * ## What it prints, between the markers, line by line
 *
 * The path is always the REST of its line, so a path holding a space parses.
 * The reader's own absolute row is
 * `/Library/Application Support/ClaudeCode/managed-settings.json`, so this is
 * a shipped path rather than a caution. A path holding a NEWLINE breaks its
 * record and the parse on this Mac drops that record rather than guessing,
 * which is the `STORE_LIST` precedent.
 *
 * | Record | Lines | Meaning |
 * | --- | --- | --- |
 * | `E <kind> <mtime> <size> <path>` | 1 | One entry found while enumerating. `kind` is `d`, `f`, `ld`, `lf` or `o`. `find -mindepth 0` includes the root itself, so an enumerated root gets its own `E` line. |
 * | `R <resolved path>` | 1, directly after an `E` line whose kind starts with `l` | Where that symlink really points, absolute. |
 * | `F <size> <path>` then one base64 line | 2 | One file read back, the `STORE_COPY` recipe. `<size>` is the file's whole size, and the payload is capped by `head -c`. |
 * | `X <path>` | 1 | A path from either list that is not there or not readable. An ordinary answer, never an error. |
 *
 * A directory that arrives in the READ list answers its own `E d` line rather
 * than `X`, because a root readout asks whether a directory exists, and `X`
 * for a directory that is there would draw `exists: false` on screen for a
 * folder the machine holds.
 *
 * ## The two `stat` spellings, and why GNU comes first here
 *
 * Metadata comes from `stat` in its two spellings, batched through
 * `find -exec … {} +` rather than one spawn per entry, the `STORE_LIST`
 * precedent. The ORDER IS REVERSED from `STORE_LIST`, deliberately. GNU
 * `stat -f` means "file system status" and prints multi line blocks to stdout
 * before failing on the format string, so trying the BSD spelling first on a
 * Linux machine would put garbage lines into the payload. BSD `stat -c` fails
 * with a usage error and prints NOTHING to stdout. So the GNU spelling is
 * tried first and the failed spelling is silent on both kinds of machine.
 *
 * ## The symlink lines
 *
 * One physical `SKILL.md` is reachable from up to nine agent directories
 * through symlinks, and the reader dedupes by `realPath`, so the `R` line is
 * load bearing rather than decoration. It is resolved with `realpath` where
 * that program answers, and with the `cd`/`pwd -P` fallback for a directory
 * link where it does not (research 57 i7 section 4.8 measured both). A file
 * link on a machine with no `realpath` gets no `R` line, and the reader then
 * draws that skill without the dedupe rather than failing. An enumerated ROOT
 * that is itself a symlink gets its own `E ld` and `R` lines before the walk,
 * because `find -H` follows the root and would otherwise report it as a plain
 * directory, and the dedupe above would silently stop working at the root.
 *
 * ## The size cap, stated as a literal
 *
 * `head -c 33554432` is {@link CONTEXT_READ_FILE_MAX_BYTES}. The literal is in
 * the text because this file imports nothing, and condition 58g of
 * `build/conformance-machines.mjs` holds the two together.
 *
 * ## The catalogue rules, one at a time
 *
 * The text holds no backtick and no caller value. The positionals are `"$1"`,
 * `"$2"` and `"$3"`, each read double quoted exactly once, into `el`, `dp` and
 * `rl`. It begins `set -e` and then `umask 077`. Every answer is printed
 * between one marker pair. It names none of the eleven mutating programs: it
 * names `find`, `stat`, `realpath`, `pwd`, `wc`, `tr`, `head`, `base64`, `cd`,
 * `read` and `test`. Its only redirection is `2>/dev/null`. It names NO git
 * verb at all, because context is not a git question, and condition 58c holds
 * that. When both lists are empty it prints {@link REMOTE_SCRIPT_EMPTY}, so
 * "the machine answered and there was nothing" stays apart from "the machine
 * did not answer".
 *
 * Running it twice reads the same directories and files twice. It writes
 * nothing on either computer.
 */
const CONTEXT_READ = [
  'set -e',
  'umask 077',
  'set -f',
  'el="$1"',
  'dp="$2"',
  'rl="$3"',
  'n=0',
  "IFS='",
  "'",
  'for d in $el; do if [ -n "$d" ]; then n=1; fi; done',
  'for f in $rl; do if [ -n "$f" ]; then n=1; fi; done',
  "printf '__TORTIE_RUN__'",
  'if [ "$n" = 0 ]; then',
  "  printf 'none'",
  'else',
  '  for d in $el; do',
  '    [ -n "$d" ] || continue',
  '    if [ -d "$d" ] && [ -r "$d" ] && [ -x "$d" ]; then',
  '      if [ -h "$d" ]; then',
  "        m=$(stat -L -c '%Y %s' \"$d\" 2>/dev/null || true)",
  "        if [ -z \"$m\" ]; then m=$(stat -L -f '%m %z' \"$d\" 2>/dev/null || true); fi",
  "        printf 'E ld %s %s\\n' \"${m:-0 0}\" \"$d\"",
  '        r=$(realpath "$d" 2>/dev/null || true)',
  '        if [ -z "$r" ]; then r=$(cd "$d" 2>/dev/null && pwd -P || true); fi',
  "        if [ -n \"$r\" ]; then printf 'R %s\\n' \"$r\"; fi",
  '      fi',
  "      find -H \"$d\" -mindepth 0 -maxdepth \"$dp\" -type d -exec stat -c 'E d %Y %s %n' {} + 2>/dev/null ||",
  "        find -H \"$d\" -mindepth 0 -maxdepth \"$dp\" -type d -exec stat -f 'E d %m %z %N' {} + 2>/dev/null || true",
  "      find -H \"$d\" -mindepth 1 -maxdepth \"$dp\" -type f -exec stat -c 'E f %Y %s %n' {} + 2>/dev/null ||",
  "        find -H \"$d\" -mindepth 1 -maxdepth \"$dp\" -type f -exec stat -f 'E f %m %z %N' {} + 2>/dev/null || true",
  '      find -H "$d" -mindepth 1 -maxdepth "$dp" -type l -print 2>/dev/null | while IFS= read -r e; do',
  '        if [ -d "$e" ]; then k=ld; elif [ -f "$e" ]; then k=lf; else k=o; fi',
  "        m=$(stat -L -c '%Y %s' \"$e\" 2>/dev/null || true)",
  "        if [ -z \"$m\" ]; then m=$(stat -L -f '%m %z' \"$e\" 2>/dev/null || true); fi",
  "        printf 'E %s %s %s\\n' \"$k\" \"${m:-0 0}\" \"$e\"",
  '        r=',
  '        if [ "$k" != o ]; then',
  '          r=$(realpath "$e" 2>/dev/null || true)',
  '          if [ -z "$r" ] && [ "$k" = ld ]; then r=$(cd "$e" 2>/dev/null && pwd -P || true); fi',
  '        fi',
  "        if [ -n \"$r\" ]; then printf 'R %s\\n' \"$r\"; fi",
  '      done',
  '    else',
  "      printf 'X %s\\n' \"$d\"",
  '    fi',
  '  done',
  '  for f in $rl; do',
  '    [ -n "$f" ] || continue',
  '    if [ -f "$f" ] && [ -r "$f" ]; then',
  '      z=$(wc -c < "$f" | tr -d \' \')',
  "      printf 'F %s %s\\n' \"${z:-0}\" \"$f\"",
  "      head -c 33554432 \"$f\" | base64 | tr -d '\\n' || true",
  "      printf '\\n'",
  '    elif [ -d "$f" ]; then',
  "      m=$(stat -c 'E d %Y %s %n' \"$f\" 2>/dev/null || true)",
  "      if [ -z \"$m\" ]; then m=$(stat -f 'E d %m %z %N' \"$f\" 2>/dev/null || true); fi",
  '      if [ -n "$m" ]; then printf \'%s\\n\' "$m"; else printf \'X %s\\n\' "$f"; fi',
  '    else',
  "      printf 'X %s\\n' \"$f\"",
  '    fi',
  '  done',
  'fi',
  "printf '__TORTIE_RUN__\\n'"
].join('\n');

/**
 * The third write, and the first one that can replace a file a person already
 * had (Phase 101).
 *
 * ## What it does, in order
 *
 * `$1` is the confirmed folder Tortie may save under. `$2` is the file's path
 * relative to it. `$3` is either the sha256 of the file as Tortie last read it,
 * or the word `new`. `$4` is the payload, encoded.
 *
 * ## The checksum program is PROVED to work before anything is written
 *
 * The first fix round of this phase found a hole here and this paragraph is the
 * fix. The script used to look the program up with `command -v` and then run it
 * for the first time AFTER the write, and print `nosum` if that run said
 * nothing. A program that is on `PATH`, exits 0 and prints nothing therefore
 * made the script write the file and then answer `nosum`, which main reads as a
 * refusal and reports to a person as "Nothing was written." A verifier proved
 * that by hand, with a `shasum` on `PATH` that exits 0 and prints nothing.
 *
 * So the program is now RUN, not merely found, before either arm. It is asked
 * for the checksum of `/dev/null`, which every machine has. That run also picks
 * the argument form: `shasum` needs `-a 256` and `sha256sum` refuses it, and
 * whichever form answers is the one form used for every later run in this
 * script. That closes a second hole, because the old per-call fallback could
 * quietly fall back to `shasum`'s default, which is sha1, and report a sha1 as
 * the file's new sha256.
 *
 * Two rules follow, and the gate's condition 80 reads both out of this text.
 *
 *  1. NO WORD THAT MEANS "NOTHING WAS WRITTEN" IS PRINTED AFTER THE FIRST
 *     WRITE. `nosum`, `stale`, `missing`, `exists` and `nomode` all appear
 *     above `> "$t"` and nowhere below it.
 *  2. A machine that has neither `shasum` nor `sha256sum`, or has one that
 *     answers nothing, cannot be saved to at all. It does NOT fall back to
 *     comparing sizes the way `image-put` does, because `image-put` only ever
 *     adds a file nobody had and this one replaces one somebody had.
 *
 * ## Seven answers, one of them means bytes landed, and one means nobody knows
 *
 * `wrote` carries the file's new checksum and its size. `stale` carries the
 * checksum the file actually has. `missing`, `exists`, `nomode` and `nosum`
 * carry nothing, and all four are printed before anything is written. Every
 * answer is three space separated fields between the marker pair, with `none`
 * for a field that has no value, which is `git-clone`'s shape and
 * `parseImagePutAnswer`'s rule: a fixed field count means a short answer is a
 * machine that printed something else rather than something to guess at.
 *
 * The seventh is `unsure`, and it is the one answer this script prints after
 * the bytes are already in place. It fires only when the checksum program
 * answered for `/dev/null` at the top and then said nothing about the file it
 * had just written. `./remote-file.ts` does not know that word, and its rule
 * for a word it does not know is to throw the sentence "did not say what it did
 * with this file, so Tortie cannot tell you whether it was saved". That is the
 * true thing to say, and it is why the word is deliberately kept off the list
 * of outcomes rather than added to it: an outcome is something a person is told
 * happened, and this is the case where nobody can say.
 *
 * ## Why it is safe to run twice, and it is a different reason from the other two
 *
 * `image-put` and `git-clone` are safe to run twice because neither ever opens
 * a destination that is already there. This one replaces a file on purpose, so
 * that promise cannot hold and saying it did would be false. What holds instead
 * is this. A run that finds the file already carrying the checksum of the
 * payload answers `stale` WITH THAT CHECKSUM, and `./remote-file.ts` reads a
 * reported checksum equal to the checksum of the payload as the write having
 * landed and only the answer having been lost. So a repeat after a lost answer
 * writes one file rather than refusing. The `new` arm keeps the older promise
 * in full, because it refuses a destination that is already there.
 *
 * ## Six properties of this text, and each one is a rule the gate reads
 *
 *  0. The checksum program is RUN before either arm, as the paragraph above
 *     says, and no refusal word appears after the first write.
 *  1. TWO containment lines guard `$1` and one guards `$2`. The single line
 *     `case "$2" in /*|*..*) exit 1;; esac` is copied from `REVIEW_FILE`, which
 *     already carries it and already takes one false refusal, being a file
 *     whose own name holds two dots in a row. That false refusal is repeated
 *     here and it is the price of a rule with no parser in it. `$1` gets its
 *     own two lines, because the shipped line guards `$2` only.
 *  2. The temporary name is DETERMINISTIC, being `"$f.tortie-part"`.
 *     `image-put` used `$$` and that was defect 3 of research 57 section 9,
 *     which Phase 96 fixed. A deterministic name means an interrupted save
 *     leaves at most one file per file, and the next successful save of the
 *     same file writes over it and then moves it away.
 *  3. The text names no `rm`. It does name `mv` and `chmod`, which is correct
 *     and is what makes the mode survive. `MUTATING_PROGRAMS` in the gate is
 *     consulted only inside `if (row.mode === 'read')`, so it does not apply
 *     here, and condition 79 is written as "the text does not name rm" rather
 *     than as "names no program that removes a file".
 *  4. The mode is read before the write and applied to the temporary file
 *     before the `mv`, on the checksum arm only. Research 57 section 4.2
 *     measured a 755 file put through the `image-put` shape coming back 600,
 *     and reading the mode and running `chmod` before the `mv` returning it to
 *     755. `stat -f %Lp` is tried first and `stat -c %a` second, because only
 *     one arm64 Mac was ever tested and no Linux machine was contacted.
 *  5. On the `new` arm there is no existing file, so there is no mode to read
 *     and `nomode` cannot fire. The new file is created under `umask 077`,
 *     which the whole catalogue sets on its second line, so it lands at 600. A
 *     first save is a replacement of a file Tortie just created at 600, so its
 *     mode is read on the next save like any other.
 *
 * ## What is NOT kept, and the confirm sheet says so before a person agrees
 *
 * Hard links and extended attributes. The same measurement showed two hard
 * links becoming one and one extended attribute disappearing. That is in
 * `MACHINE_WRITE_HONESTY` in `./confirm.ts`, drawn beside every sheet that
 * grants file replacement, and it is deliberately not in the hashed lines.
 *
 * Containment here is over the PATH TEXT. No symlink on that machine is
 * resolved by this script, by the schema or by main, and it cannot be, because
 * resolving one means a second round trip and a second answer that can be stale
 * by the time the write lands.
 */
const FILE_PUT = [
  'set -e',
  'umask 077',
  'case "$1" in /*) ;; *) exit 1;; esac',
  'case "$1" in *..*) exit 1;; esac',
  'case "$2" in /*|*..*) exit 1;; esac',
  'p=$(command -v shasum 2>/dev/null || true)',
  'if [ -z "$p" ]; then p=$(command -v sha256sum 2>/dev/null || true); fi',
  'a=',
  'k=',
  'if [ -n "$p" ]; then k=$("$p" -a 256 /dev/null 2>/dev/null | cut -d\' \' -f1 || true); fi',
  'if [ -n "$k" ]; then a="-a 256"; fi',
  'if [ -n "$p" ] && [ -z "$k" ]; then k=$("$p" /dev/null 2>/dev/null | cut -d\' \' -f1 || true); fi',
  'if [ -z "$k" ]; then',
  "  printf '__TORTIE_RUN__nosum none none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'f="$1/$2"',
  't="$f.tortie-part"',
  'm=',
  'if [ "$3" = new ]; then',
  '  if [ -f "$f" ]; then',
  "    printf '__TORTIE_RUN__exists none none__TORTIE_RUN__\\n'",
  '    exit 0',
  '  fi',
  'else',
  '  if [ ! -f "$f" ]; then',
  "    printf '__TORTIE_RUN__missing none none__TORTIE_RUN__\\n'",
  '    exit 0',
  '  fi',
  '  c=$("$p" $a "$f" 2>/dev/null | cut -d\' \' -f1 || true)',
  '  if [ -z "$c" ]; then',
  "    printf '__TORTIE_RUN__nosum none none__TORTIE_RUN__\\n'",
  '    exit 0',
  '  fi',
  '  if [ "$c" != "$3" ]; then',
  "    printf '__TORTIE_RUN__stale %s none__TORTIE_RUN__\\n' \"$c\"",
  '    exit 0',
  '  fi',
  '  m=$(stat -f %Lp "$f" 2>/dev/null || true)',
  '  if [ -z "$m" ]; then m=$(stat -c %a "$f" 2>/dev/null || true); fi',
  '  if [ -z "$m" ]; then',
  "    printf '__TORTIE_RUN__nomode none none__TORTIE_RUN__\\n'",
  '    exit 0',
  '  fi',
  'fi',
  'if printf \'%s\' "$4" | base64 -d > "$t" 2>/dev/null; then',
  '  :',
  'else',
  '  printf \'%s\' "$4" | base64 -D > "$t"',
  'fi',
  'if [ -n "$m" ]; then chmod "$m" "$t"; fi',
  'mv "$t" "$f"',
  'n=$(wc -c < "$f" | tr -d \' \')',
  'c=$("$p" $a "$f" 2>/dev/null | cut -d\' \' -f1 || true)',
  'if [ -z "$c" ]; then',
  "  printf '__TORTIE_RUN__unsure none none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  "printf '__TORTIE_RUN__wrote %s %s__TORTIE_RUN__\\n' \"$c\" \"$n\""
].join('\n');

/**
 * The containment line the two Phase 102 writers carry, once per guarded value.
 *
 * IT IS WIDER THAN `file-put`'s AND THAT DIFFERENCE IS DELIBERATE.
 * `docs/research/57-i3-file-writes.md` section 12 rules this exact string for a
 * write. `review-file` carries the narrower `case "$2" in /*|*..*) exit 1;; esac`
 * because it is a read, and `file-put` shipped in Phase 101 carrying that same
 * narrower line. Phase 102 adds the `.git` half to the two writers it adds and
 * does NOT widen a shipped writer, so `.git` is guarded here and not on
 * `file-put`.
 *
 * There are two constants rather than one because the line names the value it
 * guards. `entry-rename` has two guarded values and it carries both lines.
 * `build/conformance-machines.mjs` pins both strings byte for byte as
 * `WRITE_PATH_GUARD`, and it also asserts each line stands above the first line
 * that uses the value it guards.
 *
 * The `*..*` half refuses a real name holding two dots in a row, e.g.
 * `notes..md`. That false refusal is taken on purpose and `review-file` already
 * takes it.
 */
const WRITE_PATH_GUARD_2 =
  'case "$2" in /*|*..*|.git|.git/*|*/.git|*/.git/*) exit 1;; esac';

/** The same line for `$3`, which only `entry-rename` has. */
const WRITE_PATH_GUARD_3 =
  'case "$3" in /*|*..*|.git|.git/*|*/.git|*/.git/*) exit 1;; esac';

/**
 * The fourth write. One new folder under one confirmed folder (Phase 102).
 *
 * `$1` is the confirmed folder. `$2` is the new folder's path relative to it.
 * It answers `made`, `exists`, `denied` or `noparent`, and it answers with two
 * fields always, with `none` for a field that has no value. That is
 * `git-clone`'s rule and `parseImagePutAnswer`'s rule. A short answer is a
 * machine that printed something else, and reading one field out of it would be
 * a guess. The one exception is `made` on a machine whose `stat` said nothing,
 * where the second field is empty and the parser reads it as null.
 *
 * ## Seven properties of this text, and each one is a rule the gate reads
 *
 *  1. THE PARENT IS COMPUTED ON THE FAR SIDE AND NO PROGRAM FINDS IT.
 *     `p="${d%/*}"` is POSIX parameter expansion. No `dirname` crosses the link
 *     and no third parameter is needed.
 *  2. `mkdir` CARRIES NO `-p`. A recursive make would create folders nobody
 *     named, and the gate asserts the absence of `-p`.
 *  3. AN EMPTY `$2` IS DETERMINED RATHER THAN SPECIAL. It makes `d="$1/"`,
 *     `${d%/*}` resolves to `"$1"`, the `-d` test passes, the `-e` test on
 *     `"$1/"` answers yes and the script answers `exists`. Nothing is created
 *     and no guard has to widen for it.
 *  4. THE ORDER IS PARENT, THEN DESTINATION, THEN WRITABILITY. A parent that is
 *     gone answers `noparent` before anything else, because that is the state a
 *     person reaches from a tree read a minute ago.
 *  5. THE MODE IS CAPPED AT TWO VALUES AND NOTHING ELSE CAN BE PRODUCED.
 *     `*[57][57]` matches a mode whose last two octal digits are each 5 or 7,
 *     which is read and execute for group and for other. Everything else, an
 *     unreadable mode included, takes 700. No set user id bit and no set group
 *     id bit can be produced, because the two `chmod` arguments are literals. A
 *     machine that answers with neither `stat` spelling takes the 700 branch and
 *     the script still answers `made`.
 *  6. THE ANSWER CARRIES THE PARENT'S MODE rather than the new folder's, so a
 *     verifier can compare what Tortie decided against what `ls -ld` shows
 *     without a second call.
 *  7. IT IS SAFE TO RUN TWICE. A second run with the same two values finds the
 *     folder the first run made and answers `exists` with no `mkdir`. It cannot
 *     empty the folder, cannot re-create it and cannot change its mode.
 *
 * A `mkdir` that fails anyway, e.g. two callers racing, ends the script under
 * `set -e` with no marker printed. The door then throws its "nothing usable
 * between the markers" refusal, and that is a state the product cannot describe
 * precisely.
 *
 * ## The containment line here is WIDER than `file-put`'s
 *
 * `docs/research/57-i3-file-writes.md` section 12 rules the write line, and it
 * carries a `.git` half that `review-file`'s line does not. `file-put` shipped
 * with `review-file`'s narrower line and Phase 102 does not widen a shipped
 * writer, so `.git` is guarded here and on `entry-rename` and NOT on
 * `file-put`. That is said out loud rather than left for a reader to notice.
 *
 * The `*..*` half refuses a real name holding two dots in a row, e.g.
 * `notes..md`. That false refusal is taken on purpose and `review-file` already
 * takes it.
 */
const DIR_NEW = [
  'set -e',
  'umask 077',
  'case "$1" in /*) ;; *) exit 1;; esac',
  'case "$1" in *..*) exit 1;; esac',
  WRITE_PATH_GUARD_2,
  'd="$1/$2"',
  'p="${d%/*}"',
  'if [ ! -d "$p" ]; then',
  "  printf '__TORTIE_RUN__noparent none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'if [ -e "$d" ]; then',
  "  printf '__TORTIE_RUN__exists none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'if [ ! -w "$p" ]; then',
  "  printf '__TORTIE_RUN__denied none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'm=$(stat -f %Lp "$p" 2>/dev/null || true)',
  'if [ -z "$m" ]; then m=$(stat -c %a "$p" 2>/dev/null || true); fi',
  'mkdir "$d"',
  'case "$m" in',
  '  *[57][57]) chmod 755 "$d";;',
  '  *) chmod 700 "$d";;',
  'esac',
  "printf '__TORTIE_RUN__made %s__TORTIE_RUN__\\n' \"$m\""
].join('\n');

/**
 * The fifth write. One rename inside one confirmed folder (Phase 102).
 *
 * `$1` is the confirmed folder. `$2` is the path the entry has now and `$3` is
 * the path wanted, both relative to it. It answers `moved`, `done`, `exists` or
 * `gone`, with two fields always.
 *
 * ## The five branches, which are the whole safe to run twice argument
 *
 * | `$2` | `$3` | What runs | Answer |
 * | --- | --- | --- | --- |
 * | there | absent | one `mv` | `moved` |
 * | there | there, same device and inode | one `mv` | `moved` |
 * | there | there, a different entry | nothing | `exists` |
 * | absent | there | nothing | `done` |
 * | absent | absent | nothing | `gone` |
 *
 * ## Five properties of this text
 *
 *  1. PRESENCE IS `[ -e "$x" ] || [ -L "$x" ]`. `-e` alone answers no for a
 *     dangling symbolic link, and the script would then say `gone` about a link
 *     that is really there.
 *  2. ROW TWO IS THE CASE ONLY RENAME AND IT IS CLOSED HERE. The far side
 *     compares the device and the inode of both paths with the two `stat`
 *     spellings `STORE_LIST` already carries. `sameEntry` in
 *     `../fs/file-ops.ts` exists for the same reason on this Mac. Without it a
 *     person renaming `README.md` to `readme.md` on a case insensitive volume is
 *     told the name is taken.
 *  3. AN UNREADABLE DEVICE AND INODE ANSWERS `exists`. When `$a` is empty the
 *     script refuses rather than moving. A refusal is the safe answer when the
 *     machine will not say whether the two paths are one entry.
 *  4. `mv` CARRIES NO `-f`, and the gate asserts its absence.
 *  5. A SECOND RUN WITH THE SAME THREE VALUES ANSWERS `done`. The end state on
 *     that machine is the one the person asked for and it was reached once.
 *
 * ## What `done` cannot tell apart, and the race, both said out loud
 *
 * `done` cannot tell a repeat of Tortie's own move apart from a machine where
 * somebody else already held a file at the destination while the source never
 * existed. Both leave the person looking at the end state they asked for. The
 * product cannot distinguish them and does not pretend to.
 *
 * BETWEEN THE `-e` TEST AND THE `mv` THERE IS A WINDOW. An agent working in
 * that folder on that machine can create the destination in it, and the `mv`
 * then replaces what that agent made. There is no command in a POSIX shell that
 * renames and refuses an existing destination in one step. `ln` followed by an
 * unlink would be atomic and it is refused, because the unlink half is `rm` and
 * this product does not send `rm` to another computer. Whether `mv -n` narrows
 * the window is measured by nobody and no number for it exists in this
 * repository. `build/conformance-machines.mjs` reads text and cannot see a
 * race, so what the gate checks is that the text tests before it moves.
 *
 * THE CROSS FILESYSTEM HAZARD IS OPEN AND NO DEVICE CHECK IS BUILT. `mv` across
 * filesystems copies and unlinks and is not atomic, so a repeat after a lost
 * answer can leave a partial copy. The shipped surface is a rename inside one
 * folder, so no surface in this product can reach a cross device move.
 *
 * ## The containment line is carried twice, once per guarded value
 *
 * The line names the value it guards, so `$3` gets its own copy spelled
 * `case "$3" in ...`. Either path outside the confirmed folder refuses the whole
 * call, in main and again here.
 */
const ENTRY_RENAME = [
  'set -e',
  'umask 077',
  'case "$1" in /*) ;; *) exit 1;; esac',
  'case "$1" in *..*) exit 1;; esac',
  WRITE_PATH_GUARD_2,
  WRITE_PATH_GUARD_3,
  's="$1/$2"',
  't="$1/$3"',
  'sp=0',
  'tp=0',
  'if [ -e "$s" ] || [ -L "$s" ]; then sp=1; fi',
  'if [ -e "$t" ] || [ -L "$t" ]; then tp=1; fi',
  'if [ "$sp" = 0 ] && [ "$tp" = 1 ]; then',
  "  printf '__TORTIE_RUN__done none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'if [ "$sp" = 0 ]; then',
  "  printf '__TORTIE_RUN__gone none__TORTIE_RUN__\\n'",
  '  exit 0',
  'fi',
  'if [ "$tp" = 1 ]; then',
  "  a=$(stat -f '%d %i' \"$s\" 2>/dev/null || true)",
  '  if [ -z "$a" ]; then a=$(stat -c \'%d %i\' "$s" 2>/dev/null || true); fi',
  "  b=$(stat -f '%d %i' \"$t\" 2>/dev/null || true)",
  '  if [ -z "$b" ]; then b=$(stat -c \'%d %i\' "$t" 2>/dev/null || true); fi',
  '  if [ -z "$a" ] || [ "$a" != "$b" ]; then',
  "    printf '__TORTIE_RUN__exists none__TORTIE_RUN__\\n'",
  '    exit 0',
  '  fi',
  'fi',
  'mv "$s" "$t"',
  "printf '__TORTIE_RUN__moved none__TORTIE_RUN__\\n'"
].join('\n');

/**
 * The per element guard the two Phase 103 writers carry, over EVERY element of
 * the list before any git runs.
 *
 * It is `WRITE_PATH_GUARD_2` with three more shapes on it, being the empty
 * element, the single dot and a trailing slash. The `.git` half comes from
 * `docs/research/57-i3-file-writes.md` section 12 and is carried here for the
 * reason Phase 102 carries it: git never reports a path under `.git`, so
 * refusing one costs nothing.
 *
 * THE SINGLE DOT IS THE ONE THAT MATTERS MOST. `git add -A -- ":(literal)."`
 * stages every change in that repository in one call, which is not what any
 * person pressing one row's button asked for.
 *
 * The trailing slash is refused because a folder is not a row the review read
 * reports, and `..` is refused so no element climbs out of the repository.
 *
 * The `*..*` half refuses a real name holding two dots in a row, e.g.
 * `notes..md`. That false refusal is taken on purpose and `review-file`
 * already takes it.
 *
 * `build/conformance-machines.mjs` pins this string byte for byte and asserts
 * that it stands above the `cd` and above every git in both scripts.
 */
const INDEX_PATH_GUARD =
  "case \"$p\" in ''|.|/*|*..*|*/|.git|.git/*|*/.git|*/.git/*) exit 1;; esac";

/**
 * The head both Phase 103 writers share, and every line of it is load bearing.
 *
 * `$1` is the REPOSITORY ROOT on that machine. `$2` is the list of repository
 * relative paths, one per line.
 *
 * ## THE GAP THIS HEAD CANNOT CLOSE, named rather than hidden
 *
 * `$1` is the repository root and NOT the folder the person confirmed, so this
 * text cannot check that the repository sits under that folder the way
 * `file-put`, `dir-new` and `entry-rename` all can. Those three receive the
 * confirmed folder as `$1` and compare against it on the far side. These two do
 * not receive it at all, because the Phase 103 backlog entry rules `params: 2`
 * for both scripts. `src/main/machines/remote-stage.ts` makes that check on
 * this Mac, in four layers, and the far side makes none of it.
 *
 * A third positional carrying the confirmed folder, with
 * `case "$2" in "$1"|"$1"/*) ;; *) exit 1;; esac`, would close the gap at the
 * cost of no extra process. It is not built, because the entry rules two.
 *
 * What still holds when main is bypassed is that the root is absolute, that it
 * holds no `..`, that no element of the list climbs out of the repository, that
 * no element names `.git`, that no element is `.` or a folder, and that an
 * empty list runs no git at all.
 *
 * ## The six properties
 *
 *  1. `r="$1"` and `l="$2"` are read BEFORE `set --`, because `set --` discards
 *     the positional parameters.
 *  2. The guard loop runs over the WHOLE list before `cd` and before any git,
 *     so a bad element refuses the whole call rather than staging half of it.
 *  3. The per element guard is {@link INDEX_PATH_GUARD} and it refuses `.`, a
 *     trailing slash and an empty element as well as the Phase 102 shapes.
 *  4. The list is read into a local name and split under `IFS`, which is rule 2
 *     of this file's header. `for p in $2` would be the bare positional that
 *     rule forbids, and condition 38 of the gate fails on it.
 *  5. `:(literal)` is attached PER WORD, which is why the loop exists at all.
 *     It is what `literalSpec` in `src/main/git/service.ts` already does for a
 *     local path, so a name holding `*` or `[` cannot glob.
 *  6. `[ "$#" -gt 0 ] || exit 1` refuses an empty list, so no git ever runs
 *     with a bare `--`.
 *
 * ## The loop spawns nothing
 *
 * `set -- "$@" ":(literal)$p"` is a shell builtin, so a list of 100 paths costs
 * the same ONE git the list of 1 costs. A loop running one `git add` per path
 * would cost about 1,090 ms of far side work for 100 paths at research 57
 * section 5.2's own 10.9 ms per process, and this phase does not write one.
 */
const INDEX_WRITE_HEAD = [
  'set -e',
  'umask 077',
  'r="$1"',
  'l="$2"',
  'case "$r" in /*) ;; *) exit 1;; esac',
  'case "$r" in *..*) exit 1;; esac',
  "IFS='",
  "'",
  'set --',
  'for p in $l; do',
  `  ${INDEX_PATH_GUARD}`,
  '  set -- "$@" ":(literal)$p"',
  'done',
  '[ "$#" -gt 0 ] || exit 1',
  'cd "$r"'
];

/**
 * The sixth write. Put a list of paths into one repository's index (Phase 103).
 *
 * `$1` is the repository root on that machine. `$2` is the list of repository
 * relative paths, one per line. It answers a status digit and one base64 word,
 * where the word is whatever git printed on stderr and `none` when git printed
 * nothing.
 *
 * ONE `git add` PER CALL AND NO MORE. The loop above builds the pathspec list
 * with a builtin, so the process count does not move with the length of the
 * list.
 *
 * `2>&1 >/dev/null` is that order on purpose. It sends stderr to the capture
 * and then throws stdout away, so `$m` holds what git complained about and
 * nothing else. The git exit status is captured explicitly so `set -e` does not
 * end the script before the marker is printed.
 *
 * IT NAMES NO DESTINATION. Every path is handed to that machine's own git as a
 * pathspec and git decides what to write, which is what a person running the
 * same command in a session on that machine would get. The repository's own
 * index is the file that changes and Tortie never checksummed it.
 */
const GIT_STAGE = [
  ...INDEX_WRITE_HEAD,
  's=0',
  'm=$(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git add -A -- "$@" 2>&1 >/dev/null) || s=1',
  'b=$(printf \'%s\' "$m" | base64 | tr -d \'\\n\')',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"$s\" \"${b:-none}\""
].join('\n');

/**
 * The seventh write. Take a list of paths back out of one index (Phase 103).
 *
 * `$1` and `$2` are `git-stage`'s two values and mean the same things.
 *
 * ## The unborn branch, tested ON THAT MACHINE
 *
 * `git restore --staged` needs a commit to restore the index entry from, so it
 * fails in a repository with no commit at all. The stderr that says so is on
 * that machine, so the test is made there. The six phrasings are the six
 * `UNBORN_HEAD_RE` at line 67 of `src/main/git/service.ts` already covers. They
 * are a `case`, which is a shell builtin, so the test costs no process.
 *
 * WHICH SENTENCE A GIVEN GIT PRINTS IS RECORDED RATHER THAN ASSUMED.
 * `build/probe-p103-stage.mjs` leg 17 pastes what the git on the machine it ran
 * against actually printed.
 *
 * ## `rm` appears here and it carries `--cached` and nothing else
 *
 * `git rm --cached -r -q` removes the index entry and leaves the file in the
 * folder. It is the only `rm` in this whole catalogue, condition 83 of
 * `build/conformance-machines.mjs` fails any `rm` in it without `--cached`, and
 * condition 38's mutator map allows the word for this one script id alone.
 *
 * NO `git clean` AND NO `--worktree` AND NO `--source` APPEAR ANYWHERE. All
 * three would overwrite or delete a file in that person's folder, which is the
 * operation this product refuses on another computer.
 */
const GIT_UNSTAGE = [
  ...INDEX_WRITE_HEAD,
  's=0',
  'm=$(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git restore --staged -- "$@" 2>&1 >/dev/null) || s=1',
  'if [ "$s" = 1 ]; then',
  '  case "$m" in',
  "    *'does not have any commits yet'*|*\"ambiguous argument 'HEAD'\"*|*'unknown revision'*|*'invalid object name'*|*'could not resolve'*|*'bad default revision'*)",
  '      s=0',
  '      m=$(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git rm --cached -r -q -- "$@" 2>&1 >/dev/null) || s=1',
  '      ;;',
  '  esac',
  'fi',
  'b=$(printf \'%s\' "$m" | base64 | tr -d \'\\n\')',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"$s\" \"${b:-none}\""
].join('\n');

/**
 * The eighth write. Commit what is staged in one repository (Phase 104).
 *
 * `$1` is the repository root on that machine. `$2` is the commit `HEAD` was
 * pointing at when Tortie read that folder, or the word `none` for a repository
 * with no commit yet. `$3` is the message the person typed.
 *
 * ## The repeat guard is HEAD, and it is the whole reason this script is safe
 *
 * Tortie can never know whether a command that lost its answer ran. Every other
 * write in this catalogue answers that with a destination test or with an end
 * state. A commit has neither: running it twice would add two commits. So the
 * sha Tortie read crosses with the message, the far side compares it against
 * its own `git rev-parse HEAD`, and a difference answers `moved` having
 * committed nothing. THE FIRST RUN MOVES HEAD, so the second run of one request
 * always finds it moved.
 *
 * A repository with no commit needs `--verify --quiet` on both `rev-parse`
 * calls, and that is measured rather than assumed. A bare
 * `git rev-parse HEAD` on an unborn branch PRINTS THE WORD `HEAD` on standard
 * output and exits 1, so `h` is never empty, the `-z` guard never fires, `h`
 * never becomes `none`, and the far side answers `moved none HEAD` and commits
 * nothing. `git rev-parse --verify --quiet HEAD` prints nothing at all on an
 * unborn branch, prints the sha otherwise, and writes zero bytes to standard
 * error either way, measured on git 2.50.1. With it the guard value for an
 * unborn branch is the word `none`, so that state is a state rather than a
 * special case. The `git-commit` branch of condition 38 in
 * `build/conformance-machines.mjs` fails this text if a later round drops
 * either flag.
 *
 * ## What the HEAD guard does not guard
 *
 * `HEAD` does not move when somebody or an agent runs `git add` in that folder.
 * That window is closed in `./remote-commit.ts`, which compares the staged set
 * the panel drew against its own fresh read. What is still open is the window
 * between that read and this commit, which is one round trip wide.
 *
 * ## Hooks and signing run on that machine and Tortie answers neither
 *
 * Standard input is `/dev/null`, so a program that reads a passphrase from a
 * terminal fails at once rather than holding the link until the deadline. A
 * signing program with a window of its own opens that window on that machine's
 * screen, and nothing here can see it or answer it. `REMOTE_COMMIT_TIMEOUT_MS`
 * in `./remote-commit.ts` is what bounds that case, and it is 300,000 ms
 * because that is what a local commit's hooks get.
 *
 * ## It writes no file of its own over there
 *
 * The message rides as `-m "$3"` rather than through `-F`, so this write
 * creates no temporary file on that machine. The only thing it writes is the
 * commit. A multi line message survives, because the message crosses as one
 * quoted positional through the single `shellQuoteArgv` call in
 * {@link composeRemoteScriptCommand}.
 *
 * ## `head -c 8192` is what bounds what comes back
 *
 * A hook can print anything. What crosses back is capped here, and the number
 * is `REMOTE_COMMIT_ANSWER_MAX_BYTES` in `./remote-commit.ts`, which condition
 * 86g of `build/conformance-machines.mjs` proves equal to this one. WHAT IS NOT
 * BOUNDED is what `$m` holds on that machine BEFORE the cap: the shell holds
 * the hook's whole output in one variable first.
 *
 * ## The answer is three fields and always three
 *
 * A word, then a base64 blob or `none`, then a sha or `none`. The three words
 * are `moved`, `committed` and `failed`.
 */
const GIT_COMMIT = [
  'set -e',
  'umask 077',
  'cd "$1"',
  'h=$(git rev-parse --verify --quiet HEAD 2>/dev/null || true)',
  'if [ -z "$h" ]; then h=none; fi',
  'if [ "$h" != "$2" ]; then',
  "  printf '__TORTIE_RUN__moved none %s__TORTIE_RUN__\\n' \"$h\"",
  'else',
  '  s=0',
  '  m=$(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git commit -m "$3" </dev/null 2>&1) || s=1',
  "  m=$(printf '%s' \"$m\" | head -c 8192)",
  '  n=$(git rev-parse --verify --quiet HEAD 2>/dev/null || true)',
  '  if [ "$s" = 0 ]; then',
  "    printf '__TORTIE_RUN__committed none %s__TORTIE_RUN__\\n' \"${n:-none}\"",
  '  else',
  "    b=$(printf '%s' \"$m\" | base64 | tr -d '\\n')",
  "    printf '__TORTIE_RUN__failed %s %s__TORTIE_RUN__\\n' \"${b:-none}\" \"${n:-none}\"",
  '  fi',
  'fi'
].join('\n');

/**
 * The whole catalogue. Twenty five scripts, and this release holds no others.
 *
 * A name that is not here is refused by `./remote-run.ts` before anything is
 * composed, which is the shape the verb ledger has as well: the refusal happens
 * before a string exists, rather than after one was built and then inspected.
 *
 * EIGHT of the twenty five write, being `image-put`, `git-clone`, `file-put`,
 * `dir-new`, `entry-rename`, `git-stage`, `git-unstage` and `git-commit`, and
 * they are in that order in this array. {@link remoteWriteScripts} returns them
 * in it.
 * PHASE 98 ADDED A READ AND LEFT THAT NUMBER ALONE. SO DID PHASE 99, PHASE 105,
 * PHASE 106, PHASE 107, PHASE 108 AND PHASE 109. PHASE 101 MOVED IT FROM TWO TO
 * THREE, once and on purpose, because saving a file a person is editing is a
 * write and there is no honest way to write it as a read. PHASE 102 MOVED IT
 * FROM THREE TO FIVE, once and on purpose, because making a folder is a write
 * and so is renaming a file. PHASE 103 MOVED IT FROM FIVE TO SEVEN, once and on
 * purpose, because changing what a repository has staged is a write. PHASE 104
 * MOVED IT FROM SEVEN TO EIGHT, once and on purpose, because making the commit
 * is a write.
 *
 * `git-commit` IS APPENDED AT THE END AND NEVER BEFORE `image-put`.
 * `biggestImageCommand` in `build/machines-conformance-probe.mts` takes the
 * FIRST row with `mode: 'write'` and composes it with an image payload. It
 * finds `image-put` only because `image-put` is first, so a write inserted
 * ahead of it would make condition 39 measure the wrong script.
 */
export const REMOTE_SCRIPTS: readonly RemoteScript[] = [
  {
    id: 'machine-facts',
    mode: 'read',
    params: 0,
    text: MACHINE_FACTS,
    reason: 'It prints seven values and writes nothing.'
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
    id: 'agents-find',
    mode: 'read',
    params: 3,
    text: AGENTS_FIND,
    reason:
      'It tests whether each of a list of names is an executable file in a ' +
      'list of folders, and writes nothing. Running it twice asks the same ' +
      'questions.'
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
    id: 'repo-search',
    mode: 'read',
    params: 5,
    text: REPO_SEARCH,
    reason:
      'It asks git which files are in one folder and reads them with that ' +
      "machine's own grep. It writes nothing, so running it twice reads the " +
      'same files twice.'
  },
  {
    id: 'repo-files',
    mode: 'read',
    params: 2,
    text: REPO_FILES,
    reason:
      'It asks git which files are in one folder, or walks that folder once ' +
      'when git does not answer. It writes nothing, so running it twice lists ' +
      'the same folder twice.'
  },
  {
    id: 'repo-facts',
    mode: 'read',
    params: 1,
    text: REPO_FACTS,
    reason:
      'It asks git three questions about one folder and reads one line out of ' +
      'that folder\'s git config. It writes nothing, so running it twice reads ' +
      'the same folder twice.'
  },
  {
    id: 'repo-branch',
    mode: 'read',
    params: 1,
    text: REPO_BRANCH,
    reason:
      'It asks git two questions about one folder and reads one line about ' +
      'one branch. It writes nothing, so running it twice reads the same ' +
      'folder twice.'
  },
  {
    id: 'repo-history',
    mode: 'read',
    params: 2,
    text: REPO_HISTORY,
    reason:
      'It asks git for the newest commits in one folder and for two anchors ' +
      'around them. It writes nothing, so running it twice reads the same ' +
      'folder twice.'
  },
  {
    id: 'context-read',
    mode: 'read',
    params: 3,
    text: CONTEXT_READ,
    reason: 'It lists directories, reads files and writes nothing.'
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
  },
  {
    id: 'file-put',
    mode: 'write',
    params: 4,
    text: FILE_PUT,
    reason:
      'A run that finds the file already carrying the checksum of the payload ' +
      'answers stale with that checksum, and Tortie reads that as the write ' +
      'having landed, so a repeat after a lost answer writes one file rather ' +
      'than refusing. The new arm refuses a destination that is already there.'
  },
  {
    id: 'dir-new',
    mode: 'write',
    params: 2,
    text: DIR_NEW,
    reason:
      'A second run with the same two values finds the folder the first run ' +
      'made and answers exists with no mkdir. It cannot empty that folder, ' +
      'cannot re-create it and cannot change its mode.'
  },
  {
    id: 'entry-rename',
    mode: 'write',
    params: 3,
    text: ENTRY_RENAME,
    reason:
      'A second run with the same three values finds the source gone and the ' +
      'destination there, and answers done with no mv. What done cannot tell ' +
      'apart is a repeat of Tortie own move and a machine where somebody ' +
      'else already held a file at the destination while the source never ' +
      'existed. Between the -e test and the mv another writer on that machine ' +
      'can create the destination, and the mv then replaces it. No command in ' +
      'a POSIX shell renames and refuses an existing destination in one step.'
  },
  {
    id: 'git-stage',
    mode: 'write',
    params: 2,
    text: GIT_STAGE,
    reason:
      'A second run with the same list asks that machine own git to put the ' +
      'same paths in the same index, and git writes what is already there. It ' +
      'is safe by end state rather than by refusal, because a request to stage ' +
      'names no destination to test.'
  },
  {
    id: 'git-unstage',
    mode: 'write',
    params: 2,
    text: GIT_UNSTAGE,
    reason:
      'A second run with the same list asks that machine own git to take the ' +
      'same paths back out of the same index, and an index that no longer ' +
      'holds them is left as it is. It is safe by end state rather than by ' +
      'refusal. On a repository with no commit the restore fails and the same ' +
      'call runs git rm --cached over the same list, which is safe by end ' +
      'state for the same reason.'
  },
  {
    id: 'git-commit',
    mode: 'write',
    params: 3,
    text: GIT_COMMIT,
    reason:
      'A commit runs only when HEAD on that machine is still the sha Tortie ' +
      'read, and the first run moves HEAD. So a second run of the same ' +
      'request finds HEAD moved, commits nothing, and answers moved instead ' +
      'of adding a second commit.'
  }
];

/** The script with this id, or null. The catalogue is the only source. */
export function remoteScript(id: string): RemoteScript | null {
  return REMOTE_SCRIPTS.find((script) => script.id === id) ?? null;
}

/**
 * Every script that writes, in catalogue order.
 *
 * It has exactly eight members, being `image-put`, then `git-clone`, then
 * `file-put`, then `dir-new`, then `entry-rename`, then `git-stage`, then
 * `git-unstage`, then `git-commit`, and rule 6 in the header is what holds it
 * there. The gate
 * calls this rather than counting a list of its own, so a script added with the
 * wrong mode is caught by the same call the product makes.
 */
export function remoteWriteScripts(): readonly RemoteScript[] {
  return REMOTE_SCRIPTS.filter((script) => script.mode === 'write');
}
