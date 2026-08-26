/**
 * The argv defense (Phase 63, research 49 section 4.7 and fix 1).
 *
 * This is the heart of the phase, and the Zen line "Nothing Tortie draws ever
 * starts a process on its own" is false without it.
 *
 * ## The claim, stated so it can be attacked
 *
 * **No field of any contract file ever reaches a spawned argv.** A person's
 * `docs/arch/` arrives with a `git pull`, written by whoever last pushed, so it
 * is untrusted input in the strongest sense CLAUDE.md refusal 8 means. The
 * checkers still have to ask git things about the paths that file names. They
 * do it without ever handing git one of those paths as an argument.
 *
 * ## How the claim is kept, in four parts
 *
 * 1. **Every argv is composed here and nowhere else, and every one of them is a
 *    literal.** The five functions below are the only place under
 *    `src/main/arch/` that builds an argument list, and NOT ONE OF THEM TAKES A
 *    VALUE THAT REACHES ARGV. Four take no argument at all. The fifth takes the
 *    cat-file requests, and those go to stdin. That is what actually keeps the
 *    claim: there is no parameter for a contract value to travel along.
 * 2. **Every composed argv is checked before it leaves.** {@link assertArchArgv}
 *    allows an element only when it is one of the twelve compiled in words in
 *    {@link ARCH_ARGV_WORDS}. The list is closed, with no pattern in it, so a
 *    later round cannot widen it by one character without the diff saying so.
 *
 *    SAID PLAINLY, BECAUSE AN EARLIER VERSION OF THIS HEADER CLAIMED MORE THAN
 *    IT COULD KEEP: the guard does not prove a value did not come from a
 *    contract. Some of those twelve words are text a contract field could
 *    legally hold, so an anchor of exactly `HEAD` would satisfy the guard.
 *    Counted mechanically on 2026-08-26, by offering every one of the twelve
 *    words to every free text field of the format and asking the guard about
 *    each survivor: 41 field and value pairs that a contract may legally carry
 *    are accepted here, over 12 distinct values. Six of the words pass as an
 *    id, an anchor, an evidence path or an accepted path, being `ls-files`,
 *    `cat-file`, `log`, `status`, `rev-parse` and `HEAD`, and all twelve pass
 *    as a component name. The same enumeration is what proves the narrowing
 *    below actually narrowed: a forty character object name and both range
 *    shapes are now REFUSED, and they were accepted before.
 *
 *    What proves the claim is point 1, that no composer takes such a value. The
 *    guard is the second line, and what it catches is a LATER ROUND adding a
 *    composer that takes a path, because every real path holds a separator, a
 *    dot or an extension and none of the twelve words does.
 * 3. **Contract values go on stdin.** `git cat-file --batch` reads one request
 *    per line, and `RunGitOptions.stdin` has carried bytes to git since Phase
 *    14.5, added for `git log --stdin` for the same ARG_MAX reason. So the
 *    evidence reader writes `HEAD:<path>` there rather than on argv. The path
 *    rules in `./schema.ts` refuse a control character, which is what makes one
 *    request per line safe to write.
 * 4. **Anchors and globs never reach a process at all.** They are matched in
 *    this process against the output of one fixed argv `git ls-files -z`, and
 *    nothing under `src/main/arch/` composes a ripgrep argument list, so a
 *    contract glob can never reach `buildListFilesArgs`'s `extraGlobs`.
 *
 * `npm run conformance:arch` plants a hostile anchor and a hostile object name
 * in its fixture, runs all five checkers, captures every argv composed, and
 * fails if either string appears anywhere in any of them. Its negative control
 * blinds this guard in a copy, proves the fixture goes red, and restores the
 * file.
 *
 * ## What is NOT new here, said plainly
 *
 * The phase brief says `git ls-files` has no local call site and that this is a
 * new local verb. That was true when the charter was written and it is not true
 * now. `src/main/watcher/ignored-roots.ts` composes
 * `git ls-files --others --ignored --exclude-standard --directory
 * --no-empty-directory -z` and runs it through the same `runGit`, and it landed
 * on 2026-08-25 in `ef1c497`. What is new here is the plain tracked file form,
 * `git ls-files -z`, and the guard around it. The verb itself is a reuse.
 */

/**
 * Every word this module is allowed to put on a git command line.
 *
 * It is a closed list rather than a pattern, because a pattern is a thing a
 * later round widens by one character. Adding a word here is a deliberate act
 * that shows up in a diff beside the function that needed it, and
 * `conformance:arch` pins the list.
 */
export const ARCH_ARGV_WORDS: readonly string[] = [
  'ls-files',
  'cat-file',
  '--batch',
  'log',
  '--name-only',
  '--format=%H',
  '--no-renames',
  'status',
  '--porcelain',
  'rev-parse',
  'HEAD',
  '-z'
];

/** One git call this module composed, ready to run and already checked. */
export interface ArchGitCall {
  /** What it is for, used by the gate's table and by nothing else. */
  kind: ArchGitCallKind;
  /** The arguments, frozen, and every element proved by {@link assertArchArgv}. */
  argv: readonly string[];
  /** The bytes written to the child's stdin, when the call carries any. */
  stdin?: string;
}

export type ArchGitCallKind =
  | 'ls-files'
  | 'cat-file-batch'
  | 'log-name-only'
  | 'status-porcelain'
  | 'rev-parse-head';

/** Thrown when a composed argv holds anything the guard does not recognise. */
export class ArchArgvError extends Error {
  constructor(
    readonly element: string,
    message: string
  ) {
    super(message);
    this.name = 'ArchArgvError';
  }
}

/**
 * True when one element is a shape the guard accepts.
 *
 * ONE SHAPE, being a compiled in word. The first build also accepted a forty
 * character object name and a range of two, for a freshness walk that took a
 * range. That walk does not exist: a range would have to start at the commit a
 * contract file last changed at, and asking git for that means putting a path
 * from inside `docs/arch/` on a command line, which is the one thing this
 * module exists to prevent. The truncation happens in this process instead. So
 * the two patterns had no caller and they are gone, because a pattern is the
 * thing a later round widens by one character and a closed list is not.
 */
function elementIsAllowed(element: string): boolean {
  return ARCH_ARGV_WORDS.includes(element);
}

/**
 * Prove one argv before it is spawned, and throw with the offending element
 * named when it does not pass.
 *
 * This throws rather than filtering, because a filtered argv is a command
 * nobody wrote. A throw here means this module has a bug, and it surfaces as an
 * unverifiable verdict with the reason rather than as a wrong green.
 */
export function assertArchArgv(argv: readonly string[]): readonly string[] {
  for (const element of argv) {
    if (elementIsAllowed(element)) continue;
    throw new ArchArgvError(
      element,
      `The arch checkers tried to put "${element}" on a git command line. ` +
        `Only compiled in words and object names may go there, and no value ` +
        `from a contract file ever may.`
    );
  }
  return Object.freeze([...argv]);
}

// ---------------------------------------------------------------------------
// The five calls, and there are no others
// ---------------------------------------------------------------------------

/** Every tracked path, separated by a zero byte so a path holding anything still reads. */
export function lsFilesCall(): ArchGitCall {
  return { kind: 'ls-files', argv: assertArchArgv(['ls-files', '-z']) };
}

/**
 * Read file bytes at HEAD, with the paths on stdin.
 *
 * The request the batch reader takes is `HEAD:<path>`, one per line. The path
 * has already been through `pathField`, so it holds no newline and no other
 * control character, and one request per line is therefore a fact rather than a
 * hope. Object names may be requested the same way, and the format check on
 * them happens before this call rather than inside it.
 */
export function catFileBatchCall(requests: readonly string[]): ArchGitCall {
  for (const request of requests) {
    if (/[\u0000-\u001f\u007f]/.test(request)) {
      throw new ArchArgvError(
        request,
        `A cat-file request holds a control character. The path rules refuse ` +
          `one, so this is a bug in the checkers rather than in the contract.`
      );
    }
  }
  return {
    kind: 'cat-file-batch',
    argv: assertArchArgv(['cat-file', '--batch']),
    stdin: requests.length === 0 ? '' : `${requests.join('\n')}\n`
  };
}

/**
 * The whole history, with the paths each commit touched.
 *
 * IT TAKES NO ARGUMENT, AND THAT IS THE DESIGN RATHER THAN A LIMITATION. A
 * range would have to start at the commit the contract was last written at, and
 * the only way to ask git for that is to name a file under `docs/arch/` on a
 * command line, whose name whoever last pushed chose. So the walk is the whole
 * history and `./checkers/freshness.ts` cuts the newest-first list at the first
 * commit that touched `docs/arch/`. Measured on this tree the walk is about
 * 80 ms.
 *
 * The walk is one stream bucketed in this process rather than one
 * `git rev-list` per anchor, because the per anchor form's cost scales with the
 * history walked and the correctness adversary showed it blowing the budget on
 * exactly the stale repositories the freshness ribbon exists to catch.
 *
 * Renames are off, because research 49 fix 9 says a rename candidate is emitted
 * only when git names exactly one, and that is a separate call rather than a
 * side effect of this one.
 */
export function logNameOnlyCall(): ArchGitCall {
  return {
    kind: 'log-name-only',
    argv: assertArchArgv(['log', '--format=%H', '--name-only', '--no-renames', '-z'])
  };
}

/**
 * What has changed and is not committed.
 *
 * Research 49 fix 13. Agents work uncommitted for hours, so a freshness
 * sentence counting only commits reads "0 behind" in the middle of a two
 * hundred file rewrite.
 */
export function statusPorcelainCall(): ArchGitCall {
  return {
    kind: 'status-porcelain',
    argv: assertArchArgv(['status', '--porcelain', '-z'])
  };
}

/** The commit every verdict in this run is stamped with. */
export function revParseHeadCall(): ArchGitCall {
  return { kind: 'rev-parse-head', argv: assertArchArgv(['rev-parse', 'HEAD']) };
}

/** Every call this module can compose, for the gate to walk. */
export const ARCH_GIT_CALL_KINDS: readonly ArchGitCallKind[] = [
  'ls-files',
  'cat-file-batch',
  'log-name-only',
  'status-porcelain',
  'rev-parse-head'
];
