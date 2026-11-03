/**
 * Path guards for every fs:* MUTATION channel (Phase 12.9).
 *
 * One function does the whole job — `resolveInsideRoot` — because a guard
 * that can be skipped is not a guard. Every mutation resolves each of its
 * paths through it before touching the disk, and it refuses four families:
 *
 *   1. `..` escapes            'src/../../etc/passwd'
 *   2. absolute paths outside  '/etc/passwd'
 *   3. symlinks out of root    a link inside the project pointing at $HOME,
 *                              including one that only appears in an
 *                              ANCESTOR of a path that does not exist yet
 *   4. `.git` at any depth     source or destination, per shared/fs-ops.ts
 *
 * SYMLINK RULE — parents are resolved, the leaf is not. `realpath` on the
 * leaf would resolve a symlinked FILE to its target, so renaming or trashing
 * a link that points outside the project would be refused (wrong: the link
 * itself lives inside), and worse, a rename could follow the link and write
 * outside. Resolving only the parent chain gives both properties: you cannot
 * reach out of the tree through a directory symlink, and a symlink leaf is
 * treated as the entry it is.
 *
 * PHASE 273 — THE SECOND CHANCE FOR AN ABSOLUTE SPELLING, and why it widens
 * none of the four families above.
 *
 * `addProject` stores `path.resolve(…)` and never `realpath`
 * (sessions/core.ts:2891), so a project opened through a symlink is REMEMBERED
 * through it, and the tree builds every tab's path by concatenating onto that
 * stored spelling (FileTree.tsx:501). `resolveProjectRoot` below realpaths the
 * root. So for such a project the two sides of the containment comparison were
 * two spellings of one folder, the lexical test refused, and every save in the
 * project answered "its project is not open". That is issue 25, belucid on
 * 0.106.0: a person who could not save any file, ever.
 *
 * A lexical failure is therefore no longer final. The function asks the string
 * comparison one question and the DISK a different one, in that order, and the
 * order is the whole design:
 *
 *   1. PLACE the path. Is this spelling a spelling of something inside the
 *      project? A relative input, and an absolute one already under the real
 *      root, is placed by the string comparison. Anything else is placed by
 *      `hasAncestorInsideRoot`, which climbs to the first ancestor that
 *      resolves and compares THAT to the real root, with the errno never
 *      consulted. A stranger and an unreadable stranger therefore get one
 *      answer, and this gate never becomes an oracle for the disk outside the
 *      project.
 *   2. RESOLVE it. `realpathOfAncestors` of the parent chain, for every input
 *      alike, then containment again against its answer, then `abs` composed
 *      from the resolved parent. Only a path that passed 1 gets here, which is
 *      what lets this step say `unreadable` and name a folder.
 *
 * Two clauses bound it and both are load bearing:
 *
 *   - A RELATIVE input is never placed by step 1's second half. It is resolved
 *     FROM `realRoot`, so the only way it can fail the string comparison is by
 *     climbing out with '..', and a climb is refused. An alias CAN explain such
 *     a climb — '../alias/README.md' lands on the project's own alias, and it
 *     is measured and refused — so the bound is a decision about what a
 *     relative path means, not a claim that the shape is impossible.
 *   - The leaf is still never resolved, so `abs` is composed exactly as it was
 *     and the SYMLINK RULE above is unchanged in text and in behaviour. The
 *     alias ROOT itself is the one declared limit that follows: `dirname` of it
 *     is outside the project, so step 1 refuses it with `allowRoot` and
 *     without.
 *
 * What that admits is one CLASS, stated as a property rather than as a list: an
 * ABSOLUTE input whose parent chain resolves INSIDE the real root. Every member
 * of it names a file the relative spelling already reached, because `abs` is
 * built from the RESOLVED parent and never from the caller's spelling, and it
 * is checked against the root twice more after that. The property is the
 * declaration; these are examples of it rather than an enumeration, because an
 * enumeration of the ways one directory can be spelled is a promise nobody can
 * keep:
 *
 *   - the symlink alias, which is the point, and a chain of them;
 *   - the case variant on a case-insensitive volume, which names the same file,
 *     whose ancestors come back canonical from `realpath`, and whose LEAF keeps
 *     the caller's case — already true today for a relative input, where
 *     'src/INDEX.TS' is accepted with exactly that spelling as `rel`;
 *   - a symlink ANYWHERE on the disk pointing INTO the project, or at its
 *     parent, which is the same file reached by a longer name;
 *   - '/tmp/…' for '/private/tmp/…', because /tmp, /var and /etc are symlinks
 *     on every Mac.
 *
 * Measured over the phase's fixture on both bases: every escape shape answered
 * `outside` before and after, every admitted row's `abs` is inside the real
 * root, and the rows that moved are that class plus the refusal WORDS the
 * second half of the phase splits apart. `npm run conformance:containment` is
 * that table as a gate.
 */

import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { isProtectedFsPath } from '@shared/fs-ops';
import { visibleName } from '@shared/visible-name';
import type { GmuxErrorCode } from '../errors';
import { GmuxError, gmuxError, gmuxErrorPayloadOf } from '../errors';

/** A path that has been proven to live inside the project root. */
export interface ResolvedFsPath {
  /** Absolute, with every parent directory symlink already resolved. */
  abs: string;
  /** Relative to the real root; '' for the root itself. */
  rel: string;
}

/**
 * Which question a path guard refused on. One word per remedy.
 *
 * PHASE 273. Every guard in this module threw one of two sentences, and
 * `guarded-write.ts` read all of them as the single word `outside`. So a
 * project folder that had been deleted, a directory the process could not
 * traverse, a path under `.git`, a project that is not open and a genuine
 * escape all reached a person as "because its project is not open" — a
 * sentence that was measured true for exactly one of the five. The word now
 * travels with the error, so the caller can say what was actually measured.
 *
 * This module stays ignorant of what a save SAYS. It stamps the question it
 * refused on; `src/renderer/editor/save-sentences.ts` owns the sentences.
 */
export type FsPathRefusal =
  | 'input'         // a field the caller composed wrongly
  | 'outside'       // containment: the path is not inside the real root
  | 'unreadable'    // a realpath on the way to it threw
  | 'protected'     // the .git rule
  | 'projectClosed' // the root resolved and matches no open project
;

/**
 * The words as a value, so a word read off an unknown error is checked rather
 * than trusted. `KNOWN_ERROR_CODES` in src/main/errors.ts is the precedent,
 * `satisfies` pair included: a word added to the union and not to this list is
 * a type error in this file rather than a value that reads back as null.
 */
const FS_PATH_REFUSAL_WORDS = [
  'input',
  'outside',
  'unreadable',
  'protected',
  'projectClosed'
] as const satisfies readonly FsPathRefusal[];

/** A word the union names and the list above does not. Must stay `never`. */
type RefusalMissingFromList = Exclude<
  FsPathRefusal,
  (typeof FS_PATH_REFUSAL_WORDS)[number]
>;
const everyRefusalIsListed: RefusalMissingFromList extends never ? true : never =
  true;
void everyRefusalIsListed;

const REFUSAL_SET: ReadonlySet<string> = new Set(FS_PATH_REFUSAL_WORDS);

/** The property `refuse` stamps and `fsPathRefusalOf` reads. Nothing else. */
const STAMP = 'fsPathRefusal';

/**
 * The ONE place this module builds a refusal, and the only place it calls
 * `gmuxError`.
 *
 * WHY ONE FACTORY. The word is useless if a throw site can forget it, and this
 * module has 30 throw sites across seven functions. A factory whose FIRST
 * parameter is the word means a site added by a later round is stamped or does
 * not compile, and `npm run conformance:containment` asserts in text that
 * `gmuxError(` is named once in this file, that the once is here, and that
 * every throw goes through this factory or one of its two shorthands.
 *
 * The stamp is not enumerable, so nothing that spreads or serialises an error
 * puts a main-process word somewhere it was never meant to go. The wire format
 * is unchanged: the message is still `JSON.stringify(GmuxErrorPayload)`, which
 * is what the renderer parses.
 */
function refuse(
  word: FsPathRefusal,
  code: GmuxErrorCode,
  message: string,
  detail?: string
): GmuxError {
  const err = gmuxError(code, message, detail);
  Object.defineProperty(err, STAMP, {
    value: word,
    enumerable: false,
    writable: false,
    configurable: false
  });
  return err;
}

/**
 * The word a guard in THIS module stamped, or null for anything else.
 *
 * STRUCTURAL, NOT NOMINAL, on the terms `gmuxErrorPayloadOf` states
 * (src/main/errors.ts:118): it asks what the value HOLDS and never what built
 * it, so an error made by a second copy of this module across a loader
 * boundary reads the same as one made here. It FAILS CLOSED: the value must
 * carry a stamp this release names AND the payload this module writes, or the
 * answer is null whole.
 *
 * NULL IS LOAD BEARING. `guarded-write.ts` calls this inside a catch that can
 * also see a throw from `deps.listProjectRoots()`, which is a lazy import, a
 * core boot and two SQLite reads — none of them a path guard and none of them
 * a reason to tell somebody their project is not open. Null is how the caller
 * tells those two sources apart.
 */
export function fsPathRefusalOf(err: unknown): FsPathRefusal | null {
  if (err === null || typeof err !== 'object') return null;
  const word = (err as Record<string, unknown>)[STAMP];
  if (typeof word !== 'string' || !REFUSAL_SET.has(word)) return null;
  if (gmuxErrorPayloadOf(err) === null) return null;
  return word as FsPathRefusal;
}

/** The containment refusal — the one sentence every escape family gets. */
function refuseOutside(input: string): Error {
  return refuse(
    'outside',
    'INVALID_INPUT',
    'That path is outside the project.',
    input
  );
}

function refuseProtected(input: string): Error {
  return refuse(
    'protected',
    'INVALID_INPUT',
    'Tortie does not touch the .git folder.',
    input
  );
}

/** Containment with a separator, so '/proj-old' is not "inside" '/proj'. */
function containedIn(root: string, candidate: string): boolean {
  if (candidate === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return candidate.startsWith(prefix);
}

/**
 * Resolve the deepest EXISTING ancestor of `dir` through realpath, then
 * re-append the segments that do not exist yet. Lets a create/move target
 * that does not exist be checked as strictly as one that does.
 */
async function realpathOfAncestors(dir: string): Promise<string> {
  const missing: string[] = [];
  let current = dir;
  for (;;) {
    try {
      const real = await realpath(current);
      return missing.length === 0
        ? real
        : resolve(real, ...[...missing].reverse());
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        // PHASE 273. This line was `throw err`, and a RAW errno left the
        // module. `guarded-write.ts` caught it, read no word off it, and put
        // the machine string on the wire as the `reason` of a refusal that
        // told the person their project was not open. Measured:
        // `locked/sub/x.txt` under a mode-000 directory answered
        // `EACCES: permission denied, realpath '<root>/locked/sub'`, and a
        // symlink loop answered `ELOOP`. In `file-ops`, `drag-out` and
        // `open-with` it left the module unwrapped altogether, so the toast
        // was the errno.
        //
        // It is stamped `unreadable` instead, which is the true answer: the
        // path IS inside the root and a folder on the way to it could not be
        // read. The caller is what establishes the first half of that, and it
        // has TWO ways to: a lexically contained path is inside by the string
        // comparison, and an absolute path spelled through an alias is inside
        // because `hasAncestorInsideRoot` resolved an ancestor of it INSIDE the
        // real root before the walk was asked anything. Neither caller asks
        // this function about a path it has not already placed inside the
        // project, which is what keeps this word from being an oracle for the
        // disk outside it. The errno survives in `detail`, which is
        // fs/errors.ts's convention for exactly this, and in the log line the
        // channel writes. The sentence a person meets does not assert which
        // errno it was, because a deleted folder, an ejected disk, a chmod, a
        // TCC denial and a stalled mount are one remedy: check the folder is
        // still there.
        const token = typeof code === 'string' ? code : 'UNKNOWN';
        throw refuse(
          'unreadable',
          'FS_FAILED',
          `"${visibleName(basename(current))}" could not be read (${token}).`,
          token
        );
      }
    }
    const parent = dirname(current);
    // Hitting the filesystem root. TWO things keep this unreachable and the
    // second is the one that survives a later round.
    //
    // First, this function is only ever asked about a path the caller has
    // already placed inside an existing project root. Until Phase 273's fix
    // round that placement was always the LEXICAL comparison in
    // `resolveInsideRoot`, and the comment here said so; it no longer is. An
    // absolute input spelled through a symlinked project fails that comparison
    // and is placed by `hasAncestorInsideRoot` instead, which resolves an
    // ancestor of it inside the real root. Both callers place the path first
    // and ask second, so the premise holds — but it is now a premise about two
    // callers rather than about one line, which is exactly the kind of premise
    // a later round breaks without noticing.
    //
    // Second, and this holds even if a later round lifts the first: `dirname`
    // of a resolved absolute path terminates at '/', and realpath('/') always
    // succeeds. Measured: realpath("/") === "/". So the loop returns at '/'
    // with the missing segments re-appended lexically, and the CALLER's
    // containment check is what refuses. Measured with '/nope-xyz/deep/file.txt',
    // which resolveInsideRoot refuses at its resolved-parent check and which
    // never reaches this line.
    //
    // It stays as a throw rather than becoming an assertion because a path that
    // somehow had no existing ancestor is not inside any project, and `outside`
    // is the true answer for it.
    if (parent === current) throw refuseOutside(dir);
    missing.push(basename(current));
    current = parent;
  }
}

/**
 * Does `dir` have an ancestor that resolves INSIDE `realRoot`?
 *
 * PHASE 273's FIX ROUND, and it exists to answer ONE question for ONE caller:
 * an absolute path that failed the lexical containment test — a path spelled
 * through a symlinked project — is it inside the project at all, before the
 * ancestor walk above is allowed to say anything about it?
 *
 * WHY THE QUESTION HAS TO BE ASKED SEPARATELY. The walk answers two different
 * things with two different words: it RESOLVES the parent chain, and when it
 * cannot it stamps `unreadable` and names the folder it could not read. That
 * second word is a fact about the disk. Said about a path OUTSIDE the project
 * it would turn this gate into an oracle — a caller could tell an unreadable
 * stranger from a missing one, which is the one thing containment exists to
 * refuse. So the containment question is asked FIRST, by this function, with
 * the errno never consulted, and only a path already placed inside the project
 * is allowed to reach the walk at all.
 *
 * IT ANSWERS ON THE FIRST ANCESTOR THAT RESOLVES and climbs no further,
 * because everything below that ancestor could not be read and nothing about
 * it can be known. `dirname` of a resolved absolute path terminates at '/' and
 * realpath('/') always succeeds, so the climb terminates.
 *
 * IT READS AND NEVER THROWS. A refusal is the caller's to build, and a
 * function that both answers and refuses would give a later round two places
 * to change the rule.
 */
async function hasAncestorInsideRoot(
  realRoot: string,
  dir: string
): Promise<boolean> {
  let current = dir;
  for (;;) {
    try {
      return containedIn(realRoot, await realpath(current));
    } catch {
      const parent = dirname(current);
      if (parent === current) return false;
      current = parent;
    }
  }
}

/**
 * Resolve a project root: absolute, existing, symlinks collapsed. Every
 * later comparison is against THIS value, never the caller's spelling.
 */
export async function resolveProjectRoot(root: unknown): Promise<string> {
  if (typeof root !== 'string' || root.trim().length === 0) {
    throw refuse('input', 'INVALID_INPUT', 'A project folder is required.');
  }
  if (!isAbsolute(root)) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'A project folder must be an absolute path.',
      root
    );
  }
  try {
    return await realpath(resolve(root));
  } catch (err) {
    // PHASE 273. The catch was bare, so every way this call could fail said
    // the folder does not exist. That is true for ENOENT and ENOTDIR and is a
    // guess for the rest: an EACCES on an ancestor, an EIO on a failing disk,
    // an unmounted volume. The sentence for those two is kept BYTE FOR BYTE,
    // because it is right and it already ships; the others get one that says
    // what was measured and carries the errno.
    //
    // Both are stamped `unreadable` rather than `input`. The caller composed
    // nothing wrongly — it named a folder Tortie itself has open — so the
    // question this refused on is the disk's, not the caller's.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      throw refuse(
        'unreadable',
        'INVALID_INPUT',
        'That project folder does not exist.',
        root
      );
    }
    const token = typeof code === 'string' ? code : 'UNKNOWN';
    throw refuse(
      'unreadable',
      'INVALID_INPUT',
      `That project folder could not be read (${token}).`,
      token
    );
  }
}

/**
 * Resolve a project root AND prove it is one of the folders Tortie has open.
 *
 * A renderer bug must not be able to turn "/" into a project root and make
 * the whole disk writable, so every channel that takes a `root` runs it
 * through here first. The comparison is between REAL paths on both sides, so
 * a symlinked spelling of an open project is accepted and a stranger that
 * merely looks similar is not.
 *
 * Extracted in Phase 39 so the file-operations service and Open With share
 * one gate rather than two copies of it.
 */
export async function resolveOpenProjectRoot(
  root: unknown,
  listProjectRoots: () => Promise<readonly string[]>
): Promise<string> {
  const realRoot = await resolveProjectRoot(root);
  for (const candidate of await listProjectRoots()) {
    let realCandidate: string;
    try {
      realCandidate = await resolveProjectRoot(candidate);
    } catch {
      continue; // a project folder that has since gone away
    }
    if (realCandidate === realRoot) return realRoot;
  }
  throw refuse(
    'projectClosed',
    'PROJECT_NOT_FOUND',
    'That folder is not an open project.',
    realRoot
  );
}

/**
 * Prove `input` lives inside `realRoot` and hand back both spellings.
 *
 * `input` may be absolute (must be inside the root) or relative to the root,
 * and may carry Pierre's trailing '/' for directories. `allowRoot` lets a
 * caller accept the project root itself — true for a move DESTINATION, false
 * for anything being renamed, moved or trashed.
 */
export async function resolveInsideRoot(
  realRoot: string,
  input: unknown,
  options: { allowRoot?: boolean } = {}
): Promise<ResolvedFsPath> {
  if (typeof input !== 'string') {
    throw refuse('input', 'INVALID_INPUT', 'A path is required.');
  }
  // PHASE 273. A NUL used to throw the CONTAINMENT refusal, and a NUL is not a
  // containment fact at all. Nothing was measured about where the path points;
  // the string is malformed and no syscall will ever accept it. Saying "that
  // path is outside the project" about it is the same guess the rest of this
  // phase removes, one level down. The check keeps its position — first, before
  // `allowRoot`, before the trim — because that is what makes it unskippable.
  if (input.includes('\0')) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'A path cannot contain a NUL byte.',
      input
    );
  }

  // PHASE 154 FOUND THIS, AND IT IS A REPAIR RATHER THAN A WIDENING.
  //
  // '' is how the ENTIRE renderer spells the project root: `parentOf` returns
  // it for a top-level entry, `destinationFor` and `planMoves` take it as the
  // destination, and the root drop on the empty space below the rows passes it
  // literally (`opsRef.current?.drop(dragged, '', false)`). Every one of those
  // reached this function through `toRel('')`, which is '', and was refused
  // here with "A path is required." So the root drop shipped in Phase 12.9 has
  // never once landed, and neither has a drop on a TOP-LEVEL FILE row, which
  // Pierre reports as `directoryPath: null` and the model hook turns into ''.
  // A move to the root toasted a sentence about a missing path.
  //
  // `allowRoot` is the flag that already means "the project folder itself is
  // an acceptable answer here", and it is true for exactly the callers that
  // want a destination directory. So the empty spelling is admitted under it
  // and under nothing else: a rename, a trash and a source path still refuse,
  // because for them the root is not a legal answer at all.
  if (input.trim().length === 0) {
    if (options.allowRoot !== true) {
      throw refuse('input', 'INVALID_INPUT', 'A path is required.');
    }
    return { abs: realRoot, rel: '' };
  }

  // Pierre spells directories with a trailing slash; the filesystem does not.
  let trimmed = input;
  while (trimmed.length > 1 && trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }

  const lexical = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(realRoot, trimmed);

  // PHASE 273, ISSUE 25. The lexical test is a PRE-FILTER, and until this phase
  // it was also the last word.
  //
  // `realRoot` came out of `realpath`. An ABSOLUTE `input` did not: the
  // renderer builds it from the spelling `addProject` stored, which is
  // `path.resolve` and keeps every symlink. So for a project opened through a
  // symlink the two sides of this comparison were two spellings of one folder,
  // and this line refused every save in the project. The header has the whole
  // account.
  //
  // The real guard below already admits the alias — it walks the parent chain
  // and re-checks containment against the RESOLVED answer, and for a symlinked
  // project that check PASSES. This line was throwing before the real guard
  // could answer. So an ABSOLUTE input is no longer refused by the string
  // comparison at all; it is PLACED here and then resolved below by the same
  // walk, the same containment check and the same `abs` composition a relative
  // path has always taken.
  //
  // PLACING IS NOT RESOLVING, AND THE SPLIT IS THE WHOLE DESIGN. Two questions
  // get asked in order and they are different questions:
  //
  //   1. Is this spelling a spelling of something INSIDE the project? For a
  //      relative input and for an absolute one under the real root, the string
  //      comparison above already answered yes. For anything else,
  //      `hasAncestorInsideRoot` answers it by resolving an ANCESTOR, with the
  //      errno never consulted, so a stranger and an unreadable stranger get
  //      one answer.
  //   2. What does it resolve to? `realpathOfAncestors` below, for every input
  //      alike, and its answer is compared to the root again.
  //
  // Only a path that passed 1 reaches 2. That ordering is what lets step 2 say
  // `unreadable` and name a folder without this gate becoming an oracle for the
  // disk outside the project, which is the one thing containment exists to
  // refuse. Measured: '<root>/locked/sub/x.txt' and '<alias>/locked/sub/x.txt'
  // under a mode-000 folder both answer `unreadable` carrying EACCES, while
  // '<scratch>/lockedout/sub/x.txt' answers `outside`, indistinguishable from
  // '/nope-xyz/deep/file.txt'.
  //
  // WHY THE WALK RATHER THAN ONE `realpath`, WHICH IS WHAT THE FIRST ROUND
  // SHIPPED. That round bounded the second chance to a parent that already
  // EXISTS and argued no product caller could reach the bound. The argument was
  // wrong twice over. A tab open on a file whose folder an agent removes before
  // ⌘S is the everyday case in this product, and through the alias it answered
  // `outside` — "it is not inside the project it was opened from" — where the
  // same file by its real spelling answered `missing`, "it is no longer on
  // disk". Same file, same disk state, two sentences, one of them false. An
  // unreadable ancestor and a symlink loop split the same way. The walk is what
  // the real spelling has always taken, so taking it here is what makes "a
  // symlinked project behaves like any other" a measured fact rather than a
  // claim about saving alone.
  //
  // WHY ONLY AN ABSOLUTE INPUT, and the reason is containment rather than cost.
  // A relative input is resolved FROM `realRoot` where `lexical` is composed
  // above, so the ONLY way it can fail the test is by climbing out with '..'.
  // It is NOT true that no alias can explain such a climb — measured,
  // '../alias/README.md' in a project opened through '<scratch>/alias' climbs
  // out and lands on the project's own alias, and '../alias-of-alias/README.md'
  // does it through a second link. Both are refused, deliberately: a relative
  // path means "from the root", so a climb out of the root is the caller saying
  // something it has no business saying, and admitting it would also spend
  // syscalls on every traversal a hostile caller cares to send. Measured:
  // '../outside/secret.txt', 'src/../../outside/secret.txt' and '..' are all
  // refused here having made no filesystem call at all. This is also why
  // 'escape/../../outside/secret.txt' is not a way to ride the new admission:
  // the alias prefix collapses away in `resolve()` before any `realpath`, and
  // what is left is a plain stranger.
  //
  // THE ONE BOUND THAT IS LEFT, and it is declared rather than discovered: the
  // ALIAS ROOT ITSELF is refused, with `allowRoot` and without. `dirname` of it
  // is the folder the link sits in, which is outside the project, so step 1
  // says no. No caller reaches it — the renderer spells the project root '' and
  // that is handled above — and lifting it would mean resolving the LEAF, which
  // the SYMLINK RULE in this file's header refuses.
  const lexicallyInside = containedIn(realRoot, lexical);
  if (!lexicallyInside) {
    if (!isAbsolute(trimmed)) throw refuseOutside(input);
    if (!(await hasAncestorInsideRoot(realRoot, dirname(lexical)))) {
      throw refuseOutside(input);
    }
  }

  if (lexical === realRoot) {
    if (options.allowRoot !== true) {
      throw refuse(
        'input',
        'INVALID_INPUT',
        'The project folder itself cannot be changed here.',
        input
      );
    }
    return { abs: realRoot, rel: '' };
  }

  // ONE resolution rule for both spellings, which is what "a symlinked project
  // behaves like any other" has to mean. The walk resolves the deepest existing
  // ancestor and re-appends the segments that do not exist yet, and the check
  // under it is what refuses a directory symlink pointing out of the root,
  // including one that only appears in an ancestor that does not exist yet.
  // Every input reaches it, and the step above is what has already placed the
  // path inside the project.
  const realParent = await realpathOfAncestors(dirname(lexical));
  if (!containedIn(realRoot, realParent)) throw refuseOutside(input);

  const abs = resolve(realParent, basename(lexical));
  if (!containedIn(realRoot, abs) || abs === realRoot) throw refuseOutside(input);

  const rel = relative(realRoot, abs);
  // PHASE 273. The '..' clause asks about a SEGMENT, not about a prefix.
  //
  // `rel.startsWith('..')` refused every real top-level name beginning with two
  // dots. Measured through the shipping `writeGuarded`: '<root>/..notes.md' in
  // an open project, addressed by its real spelling and its real root, answered
  // refused and the person read "because its project is not open"; one level
  // down, 'src/..dots.md', saved. Over the escape corpus this clause fired 704
  // times and every distinct `rel` that reached it began with the real file
  // '..hidden.txt'. It has never once caught a traversal.
  //
  // It cannot catch one, and the line above is why: `abs` has already been
  // proved `containedIn(realRoot, …)`, which is a strict prefix-plus-separator
  // test, so `relative(realRoot, abs)` is the remainder and never climbs. The
  // clause stays, narrowed, because a `rel` that IS '..' is a reading nothing
  // above it would name and it costs one comparison.
  if (rel.length === 0 || rel === '..' || rel.startsWith(`..${sep}`)) {
    throw refuseOutside(input);
  }
  if (isProtectedFsPath(rel)) throw refuseProtected(input);

  return { abs, rel };
}

/**
 * Validate a single new basename (the inline-rename box, and the leaf of a
 * New File / New Folder). Separators are refused here rather than silently
 * creating a subdirectory the user did not ask for.
 */
export function assertBasename(name: unknown): string {
  if (typeof name !== 'string') {
    throw refuse('input', 'INVALID_INPUT', 'A name is required.');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw refuse('input', 'INVALID_INPUT', 'A name is required.');
  }
  if (trimmed === '.' || trimmed === '..') {
    throw refuse(
      'input',
      'INVALID_INPUT',
      `"${trimmed}" is not a usable name.`
    );
  }
  if (trimmed.includes('/') || trimmed.includes('\0')) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'A name cannot contain "/".',
      trimmed
    );
  }
  if (isProtectedFsPath(trimmed)) throw refuseProtected(trimmed);
  return trimmed;
}

/**
 * Validate the name of a file that is arriving from OUTSIDE the project, and
 * hand it back BYTE FOR BYTE (Phase 154, repaired in the fix round).
 *
 * WHY THIS IS NOT `assertBasename`. That function exists for a name a PERSON
 * TYPED, into the inline rename box or the New File sheet, and its `trim()` is
 * the right answer there: somebody who types a trailing space did not mean it.
 * This function exists for a name that is ALREADY ON DISK, which nobody is
 * typing and which Tortie has no business editing.
 *
 * Running an incoming name through the typed-name rule did two things, both
 * measured end to end before this was written:
 *
 *  1. It SILENTLY RENAMED the file. A drop of `novel.txt ` landed as
 *     `novel.txt` and the person was told nothing. Finder does not do that,
 *     and Tortie's own internal move does not do it either: moving ` mv.ts`
 *     into `src/` keeps the space.
 *  2. Worse, it MANUFACTURED an overwrite. A file genuinely named ` keep.ts`
 *     dropped into a folder holding `keep.ts` trimmed onto the existing name,
 *     so the confirm sheet asked about `keep.ts`, a file the person never
 *     dragged. Confirming trashed the real `keep.ts` and put different bytes
 *     in its place. Recoverable from the Trash, and still the wrong question
 *     answered, which is the one thing this whole surface promises not to do.
 *
 * So the name is checked and never edited. The checks are the ones that
 * decide whether a name can escape the destination folder or name something
 * Tortie must not write, and nothing about taste:
 *
 *   - a non-empty string, and not one that is ONLY whitespace, because that
 *     is a name no sheet can show and no person can read back;
 *   - not '.' or '..' in either its real spelling or its trimmed one;
 *   - no '/' and no NUL, which are the two bytes that could reach outside the
 *     folder that was aimed at;
 *   - not `.git`, and the TRIMMED spelling is tested for that too. This is
 *     the one place the trim survives on purpose. Before this repair a folder
 *     named ` .git ` was caught by accident, because the trim ran first, and
 *     dropping the trim without this line would have quietly given that back.
 *     It is refused on how it READS rather than on what it is.
 */
export function assertIncomingBasename(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw refuse('input', 'INVALID_INPUT', 'A name is required.');
  }
  const trimmed = name.trim();
  if (name === '.' || name === '..' || trimmed === '.' || trimmed === '..') {
    throw refuse(
      'input',
      'INVALID_INPUT',
      `"${trimmed}" is not a usable name.`
    );
  }
  if (name.includes('/') || name.includes('\0')) {
    throw refuse('input', 'INVALID_INPUT', 'A name cannot contain "/".', name);
  }
  if (isProtectedFsPath(name) || isProtectedFsPath(trimmed)) {
    throw refuseProtected(name);
  }
  return name;
}

/**
 * Resolve a path that is coming INTO the project from outside it (Phase 154).
 *
 * This is the one input in the whole fs contract that is allowed to name
 * something the project does not contain, so it gets its own function rather
 * than a flag on `resolveInsideRoot`. That refusal is the guard every other
 * mutation rests on and it stays exactly as strict as it was.
 *
 * What it proves, and each is load bearing:
 *
 *   1. It is a non empty string with no NUL. A dropped file whose path could
 *      not be read arrives as '', and copying from '' would resolve to the
 *      process's working directory.
 *   2. It is ABSOLUTE. There is no base to resolve a relative one against:
 *      the source is not in the project, so `realRoot` is the wrong anchor
 *      and the working directory is nobody's intent.
 *   3. It EXISTS, and every symlink in it is resolved, LEAF INCLUDED. This is
 *      the one place the module's own symlink rule is deliberately inverted,
 *      and the reason is containment rather than taste: the caller compares
 *      this answer against the destination to refuse a folder copied into
 *      itself, and a link left unresolved defeats that comparison. A link in
 *      /tmp pointing at the project's own folder would otherwise read as a
 *      stranger. The cost is that dropping an alias brings in what it points
 *      at, which is what "bring this in" means for a file you can only see
 *      through a link.
 */
export async function resolveIncomingSource(input: unknown): Promise<string> {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'Tortie could not tell where that came from.'
    );
  }
  if (input.includes('\0')) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'Tortie could not tell where that came from.',
      input
    );
  }
  if (!isAbsolute(input)) {
    throw refuse(
      'input',
      'INVALID_INPUT',
      'Tortie could not tell where that came from.',
      input
    );
  }
  try {
    return await realpath(resolve(input));
  } catch {
    // The errno is not read here and the detail stays the literal it has
    // always been: this function's whole job is to say whether the thing a
    // person dropped is reachable, and every way it is not is the same answer
    // to them. Stamped `unreadable` for the same reason the two sites above
    // are stamped `input` — the question it refused on is the disk's.
    throw refuse(
      'unreadable',
      'FS_FAILED',
      `"${visibleName(basename(input))}" is no longer there.`,
      'ENOENT'
    );
  }
}
