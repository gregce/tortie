/**
 * Choosing what goes into the next commit on another machine (Phase 103).
 *
 * ## What this module owns
 *
 * The whole decision about whether either of the two Phase 103 commands leaves
 * this Mac, and the reading of what the machine said afterwards. It is
 * `./remote-entry.ts`'s shape, and it is the only production caller of the
 * `git-stage` and `git-unstage` scripts.
 *
 * Until this phase no command Tortie sent could change a git repository on
 * another computer. After it, two can.
 *
 * ## The one field that decides everything, and it is not a new one
 *
 * `writeRoot` on the machine row, which is the sixth confirmed field Phase 101
 * added. PHASE 103 ADDS NO CONFIRMED FIELD. The hash still covers six fields,
 * `APPENDED_KEYS` in `./confirm.ts` is untouched, and no machine anybody
 * already confirmed is asked to confirm anything again.
 *
 * A machine that carries no folder cannot be written to at all, and both verbs
 * answer `writesOff` without composing anything.
 *
 * ## Containment, and it is four layers rather than one
 *
 * `RemoteScmSection` holds a `repoPath` it got from a review answer. MAIN DOES
 * NOT TAKE IT. {@link stageOnMachine} takes the machine id, the tab's folder
 * and the list of repository relative paths, and it runs the review read
 * itself.
 *
 *  1. The confirm gate and the confirmed folder, through `confirmedWriteRoot`
 *     in `./remote-file.ts`, which is the one implementation of that decision.
 *     Null is the outcome `writesOff` and nothing is composed.
 *  2. {@link rootHolds}, being THE TAB'S OWN FOLDER under the confirmed folder.
 *     False is the outcome `outsideRoot`, and it is decided before the machine
 *     is contacted at all.
 *  3. The fresh read, through `reviewFilesOn` in `./remote-review.ts`. An empty
 *     `repoPath` is the outcome `notRepo`. The repository root parameter 1
 *     carries is the one that read returned, and never one a caller chose.
 *  4. Every path is one that fresh read reported. A path that is not is the
 *     refusal `STAGE_PATH_NOT_REPORTED`.
 *
 * Without layer 4 the pair of any absolute directory on that machine and
 * relative paths under it would let one call stage inside any repository on
 * that machine rather than the tab's. Research 55 section 9.3 ran the exact
 * text of `REVIEW_FILE` with `../above.txt` and read a file above the
 * repository root, and the renderer chooses these paths exactly as it chose
 * that one.
 *
 * ## WHY LAYER 2 COMPARES THE TAB'S FOLDER AND NOT THE REPOSITORY ROOT
 *
 * The first build of this module compared the confirmed folder against
 * `list.repoPath`, and it refused every stage and every unstage. `list.repoPath`
 * is what that machine's own `git rev-parse --show-toplevel` printed, and git
 * prints that path with every link resolved. MEASURED on 2026-08-21: a
 * repository reached as `/tmp/p103-shot/far` answers
 * `/private/tmp/p103-shot/far`, because `/tmp` is a link to `/private/tmp`. The
 * confirmed folder is stored as the person gave it, so the two strings named one
 * folder and compared as two, and the person read the sentence saying their own
 * folder was outside their own folder.
 *
 * `./remote-record.ts` already rules that a path on another machine is never
 * resolved on this Mac, because this Mac cannot follow a link on a different
 * computer. So this layer compares two paths that are both as given, being the
 * confirmed folder and the tab's own folder, and the resolved one stays out of
 * the comparison.
 *
 * WHAT THAT DOES NOT PROVE, named rather than hidden. It proves the tab's folder
 * is at or under the confirmed folder. The repository root can still sit ABOVE
 * the confirmed folder, e.g. a person who confirms `~/code/api/src` and opens a
 * tab there is in a repository rooted at `~/code/api`. Layer 4 then allows any
 * path that repository reports as changed, including one outside
 * `~/code/api/src`. What still holds in that case is that nothing outside the
 * repository is reachable, that nothing that machine's git does not already
 * report as changed is reachable, and that no file's contents change either way.
 *
 * WHAT LAYER 2 STILL CANNOT SEE, and Phase 242.1 is what closed it. A `cwd` of
 * `<confirmed folder>/escape`, where `escape` is a symbolic link pointing
 * somewhere else on that machine, resolves TEXTUALLY under the confirmed folder
 * and passes this layer. Measured on the operator's own Mac Pro on 2026-09-07:
 * the far side's `cd "$1"` followed it, git ran in the repository OUTSIDE the
 * confirmed folder, and this module answered `done` with `repoPath` and
 * `writeRoot` side by side in the same object and nothing comparing them.
 *
 * ## HOW THE FAR SIDE CHECKS IT NOW (Phase 242.1), and the shape it copies
 *
 * Both scripts take TWO MORE VALUES: `$3` is the confirmed folder as the person
 * gave it, and `$4` is the tab's own folder written relative to it by
 * {@link rootRelativeCwd}, which is empty for the ordinary tab opened at the
 * confirmed folder. `noLinkWalk` in `./remote-scripts.ts` then asks the shell's
 * own `-L` about every component of `$4` from `$3` down, above the `IFS`, above
 * the `cd` and above every git, and prints `outside` if any one of them is a
 * link. Main maps that onto `outsideRoot`, the outcome this verb already had,
 * so no new word crosses the channel.
 *
 * NOTHING IS RESOLVED and that is the point. No `readlink`, no `realpath`, no
 * `cd -P` and no second round trip, so the objection above — that a far side
 * answer can be stale by the time the write lands — is untouched, because this
 * answer IS the moment the write lands.
 *
 * THE OTHER ANSWER WAS MEASURED AND REFUSED. Comparing `pwd -P` against `$1`
 * after the `cd` needs no new value, and it can never fail: `$1` is what that
 * machine's own `git rev-parse --show-toplevel` printed and git prints a
 * PHYSICAL path, so `cd "$1"; pwd -P` returns `$1` unchanged. Research 104
 * section 5 has the reading on both machines.
 *
 * IT REFUSES A LITTLE MORE THAN THE HOLE, DELIBERATELY, and the sentence a
 * person reads is the one thing about it that is not exact. A component of the
 * tab's own folder that is a link pointing BACK INSIDE the confirmed folder is
 * refused too, and the sentence `outsideRoot` carries says that folder is
 * outside the folder Tortie was given permission to write in, which for that
 * one case is not what happened. It stays that way for two reasons. Telling the
 * two apart needs a `readlink` and then a comparison of a RESOLVED path, which
 * is `./remote-record.ts`'s standing refusal and the thing this whole layer is
 * built to avoid. And it is exactly what Phase 242 already shipped for the
 * three verbs that take a path: `file-put`, `dir-new` and `entry-rename` refuse
 * the same shape with the same sentence, so this is the product being
 * consistent rather than this phase being new. A person who hits it moves the
 * tab to the folder the link points at, which is inside the folder they
 * confirmed, and every button works.
 *
 * AND THE TAB'S FOLDER IS BOUNDED RATHER THAN THE REPOSITORY ROOT, deliberately,
 * because bounding the root would refuse the `~/code/api/src` person named three
 * paragraphs above. A repository root is always an ancestor of the physical
 * folder git was asked from, so bounding the folder closes the escape and leaves
 * that person exactly as they were.
 *
 * What still holds when main is bypassed is that the root is absolute, that the
 * confirmed folder is absolute and holds no `..`, that the relative part is
 * neither absolute nor climbing, that no component of it is a symbolic link,
 * that no element of the list escapes the repository, that no element names
 * `.git`, and that no element is `.` or a folder.
 *
 * ## What layer 4 cannot see, also named rather than hidden
 *
 * `REMOTE_REVIEW_MAX_FILES` is 30 per group, so the fresh read reports at most
 * 60 rows. A path that is really changed on that machine but sits past the cap
 * is refused by layer 4. It is not reachable from the panel, because the panel
 * drew the same capped list and a person can only press a button on a row it
 * drew. It is reachable by a caller that composed its own list, and for such a
 * caller the refusal is the right answer.
 *
 * ## It opens no child of its own
 *
 * Every long running ssh child is owned by `./execution-ledger.ts`, which
 * refuses new work after shutdown starts, and it is installed at the one
 * function in `./exec-plane.ts` that starts a login shell. Both verbs reach it
 * by passing `execution: { kind: 'command', subject: repoPath }` to
 * `runRemoteWrite`, exactly as `./remote-entry.ts` does.
 *
 * THIS MODULE NAMES NO OTHER DOOR AND NO PROCESS STARTING FUNCTION AT ALL.
 * Condition 84 of `build/conformance-machines.mjs` reads this file as text and
 * fails on four names: the read door, the login shell function, and the two
 * child process functions Node ships. They are listed in that condition rather
 * than here, so that this comment cannot fail the check it describes.
 *
 * ## What this module does not import
 *
 * Nothing from `../manifest/`. `./remote-record.ts` is the one place a remote
 * path meets the manifest and this phase does not widen that.
 *
 * ## A throw from the door becomes the word `unsure`, deliberately
 *
 * `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link while
 * the far side was writing, and the far side finished the write. Only the
 * answer was lost. `./remote-entry.ts` rethrows a sentence for that case
 * because a rename has no re-read to fall back on. These two verbs ALWAYS have
 * a re-read to fall back on, so the honest shape is a state the panel can draw
 * beside fresh rows rather than an error that replaces them. The word never
 * means nothing changed.
 */

import { posix } from 'node:path';
import type {
  MachineIndexWriteInput,
  MachineIndexWriteOutcome,
  MachineIndexWriteResult,
  MachineReviewFile
} from '@shared/ipc';
import { gmuxError } from '../errors';
import {
  STAGE_NAME_HOLDS_LINE_BREAK,
  STAGE_PATH_NOT_REPORTED,
  STAGE_PATH_TOO_LONG
} from './remote-copy';
import { confirmedWriteRoot } from './remote-file';
import { reviewFilesOn } from './remote-review';
import { composeRemoteScriptCommand, runRemoteWrite } from './remote-run';
import { remoteScript } from './remote-scripts';
import { readyRemoteContext } from './ready-context';

/**
 * How long one stage or one unstage gets on the machine. 20,000 ms.
 *
 * CHOSEN rather than measured. It matches `REMOTE_REVIEW_TIMEOUT_MS`, because
 * the far side work is one `git add` or one `git restore` against an index the
 * review read has just walked. `build/probe-p103-stage.mjs` reports what a
 * stage actually cost so a later round can lower this with a number.
 */
export const REMOTE_STAGE_TIMEOUT_MS = 20_000;

/**
 * The most bytes a composed stage command may be. 118,000.
 *
 * CHOSEN, and it is `REMOTE_SCRIPT_MAX_BYTES` less about ten per cent. The
 * margin exists because the door refuses the whole call above the cap and a
 * refusal that lands after the chunking decided is a chunking bug rather than a
 * limit.
 *
 * IT IS A BYTE BUDGET AND NOT A COUNT, on purpose. A count of 100 paths is not
 * a bound on bytes: 100 paths of 1,400 bytes each exceed the cap and the door
 * refuses the whole call. The local path splits at `PATH_CHUNK`, being 500 in
 * `../git/service.ts`, and that number is a count because no local limit is in
 * bytes.
 */
export const REMOTE_STAGE_BUDGET_BYTES = 118_000;

/** Which of the two scripts a call is. The verb is never a value. */
type IndexVerb = 'stage' | 'unstage';

const SCRIPT_OF: Readonly<Record<IndexVerb, string>> = {
  stage: 'git-stage',
  unstage: 'git-unstage'
};

// ---------------------------------------------------------------------------
// The pure halves. No connection, no Electron, so the tests read them directly
// ---------------------------------------------------------------------------

/**
 * True when `path` is the folder `writeRoot` names, or sits under it. PURE.
 *
 * BOTH ARGUMENTS ARE PATHS AS GIVEN, and neither is ever a path a program on
 * that machine resolved. `posix.resolve` here removes `.` and `..` and nothing
 * else, so `/Users/gdc/./code` and `/Users/gdc/code` are one path. It does not
 * follow a link and it must not, because a link on another computer cannot be
 * followed from this one. The header says what handing this function a resolved
 * path did the first time, and what it costs to compare resolved paths properly.
 *
 * The separator is part of the comparison, so `/Users/gdcx` is not under
 * `/Users/gdc`.
 *
 * IT EXISTS RATHER THAN `relativeUnderRoot` BECAUSE THAT FUNCTION ANSWERS NULL
 * FOR AN EMPTY RELATIVE PART, and the common case here is a confirmed folder
 * that IS the folder the tab has open. `relativeUnderRoot` is about a file
 * inside a folder and a folder is not a file it may replace, so its answer is
 * right for its own callers and wrong for this one.
 */
export function rootHolds(writeRoot: string, path: string): boolean {
  if (writeRoot.length === 0 || !writeRoot.startsWith('/')) return false;
  if (path.length === 0 || !path.startsWith('/')) return false;
  const base = posix.resolve(writeRoot);
  const full = posix.resolve(path);
  if (full === base) return true;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return full.startsWith(prefix);
}

/**
 * The tab's own folder written relative to the confirmed folder, or null when
 * it is not under it. PURE.
 *
 * ## What it is for, and it is the whole of Phase 242.1
 *
 * {@link rootHolds} answers a boolean over path TEXT, and text is not what a
 * `cd` on another computer resolves. The three verbs that take a `cwd` send
 * this string as their last value, and the far side walks it one component at a
 * time from the confirmed folder down with the shell's own `-L`. So this
 * function's answer is the only thing that has to be a spelling BOTH SIDES
 * AGREE ON, and it is, because it is derived from the two texts main already
 * compared and from nothing else.
 *
 * The empty string is a real answer and is the ordinary one: a tab opened AT
 * the confirmed folder has no relative part, and the far side walks nothing.
 * That is why this returns `string | null` rather than reusing
 * `relativeUnderRoot`, whose null for an empty relative part is right for its
 * own callers and wrong for this one — the same reason {@link rootHolds}
 * exists.
 */
export function rootRelativeCwd(
  writeRoot: string,
  path: string
): string | null {
  if (!rootHolds(writeRoot, path)) return null;
  const base = posix.resolve(writeRoot);
  const full = posix.resolve(path);
  if (full === base) return '';
  return full.slice(base.endsWith('/') ? base.length : base.length + 1);
}

/**
 * The word the far side prints when a component of the tab's own folder is a
 * symbolic link (Phase 242.1).
 *
 * IT IS NOT AN OUTCOME AND IT NEVER REACHES THE RENDERER. It is mapped onto
 * `outsideRoot`, the outcome both verbs already have, whose sentence already
 * says Tortie may only change what is under that folder and that nothing was
 * changed. That is exactly what happened, so no new word crosses the channel,
 * no new sentence is written and `docs/audits/contract-baseline.txt` does not
 * move. It copies `REMOTE_FILE_PUT_OUTSIDE` and `REMOTE_ENTRY_OUTSIDE`.
 */
export const REMOTE_INDEX_WRITE_OUTSIDE = 'outside';

/** What one `git-stage` or `git-unstage` payload said. */
export interface RemoteIndexWriteAnswer {
  /** True when that machine's git exited 0. */
  readonly ok: boolean;
  /**
   * True when the far side refused before any git ran, because a component of
   * the tab's own folder is a symbolic link. `ok` is false and `said` is null.
   */
  readonly outside: boolean;
  /** What git printed on stderr, decoded, or null when it printed nothing. */
  readonly said: string | null;
}

/**
 * One payload into its two values, or null. PURE.
 *
 * The script prints TWO fields and always two, being a status digit — or, since
 * Phase 242.1, the word `outside` — and one base64 word, with `none` for a word
 * that has no value. A shorter answer is a machine that printed something else,
 * and reading one field out of it would be a guess. That is
 * `parseRenameAnswer`'s rule, reused rather than restated.
 *
 * A word holding a character base64 does not use answers null as well, because
 * `Buffer.from` drops such a character and hands back plausible nonsense.
 */
export function parseIndexWriteAnswer(
  payload: string
): RemoteIndexWriteAnswer | null {
  const parts = payload.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const status = parts[0] ?? '';
  const word = parts[1] ?? '';
  // The link refusal, which is printed above every line that runs a git and
  // carries the word `none` in the field git's stderr would have used.
  if (status === REMOTE_INDEX_WRITE_OUTSIDE) {
    if (word !== 'none') return null;
    return { ok: false, outside: true, said: null };
  }
  if (status !== '0' && status !== '1') return null;
  if (word === 'none') {
    return { ok: status === '0', outside: false, said: null };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(word)) return null;
  const said = Buffer.from(word, 'base64').toString('utf8').trim();
  return {
    ok: status === '0',
    outside: false,
    said: said.length === 0 ? null : said
  };
}

/**
 * The list of paths split into commands, each of which composes inside the
 * budget. PURE.
 *
 * It MEASURES rather than estimates. It calls the exact function the door uses
 * to compose, and counts UTF-8 bytes of the result, so a chunk that fits here
 * fits there.
 *
 * @throws GmuxError INVALID_INPUT when one path alone exceeds the budget, which
 *   is the one case no smaller chunk can fix.
 */
export function chunkIndexPaths(
  verb: IndexVerb,
  repoPath: string,
  paths: readonly string[],
  writeRoot: string,
  cwdRel: string
): string[][] {
  const script = remoteScript(SCRIPT_OF[verb]);
  if (script === null) {
    throw new Error(`the catalogue holds no script called ${SCRIPT_OF[verb]}`);
  }
  // THE CONFIRMED FOLDER AND THE RELATIVE CWD ARE MEASURED TOO, because they
  // ride on every command this chunker composes and a chunk that fits here has
  // to fit there. Phase 242.1 added them and this line is why the budget did
  // not quietly move.
  const bytesOf = (list: readonly string[]): number =>
    Buffer.byteLength(
      composeRemoteScriptCommand(script, [
        repoPath,
        list.join('\n'),
        writeRoot,
        cwdRel
      ]),
      'utf8'
    );
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const path of paths) {
    if (bytesOf([path]) > REMOTE_STAGE_BUDGET_BYTES) {
      throw gmuxError(
        'INVALID_INPUT',
        STAGE_PATH_TOO_LONG,
        `"${path.slice(0, 120)}" alone composes ${String(bytesOf([path]))} ` +
          `bytes and the budget is ${String(REMOTE_STAGE_BUDGET_BYTES)}`
      );
    }
    const candidate = [...current, path];
    if (current.length > 0 && bytesOf(candidate) > REMOTE_STAGE_BUDGET_BYTES) {
      chunks.push(current);
      current = [path];
      continue;
    }
    current = candidate;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * The set of paths one review answer reported, both groups and both ends of
 * every rename. PURE.
 */
export function reportedPaths(
  files: readonly MachineReviewFile[],
  untracked: readonly MachineReviewFile[]
): Set<string> {
  const out = new Set<string>();
  for (const row of [...files, ...untracked]) {
    out.add(row.path);
    if (row.origPath !== null) out.add(row.origPath);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The send counter, so a refusal that sent nothing is measured
// ---------------------------------------------------------------------------

/**
 * How many commands the two verbs have sent since the last reset.
 *
 * It exists so a verifier can prove a refusal sent NOTHING, rather than
 * believing a sentence that says so. It is incremented immediately before each
 * `runRemoteWrite` and never after a refusal. It copies `remoteEntrySendCount`
 * in `./remote-entry.ts` and `remoteCloneSendCount` in `./remote-clone.ts`.
 */
let sends = 0;

/** How many `git-stage` and `git-unstage` commands have crossed. */
export function remoteStageSendCount(): number {
  return sends;
}

/** Forget the count. Tests and the probes. */
export function resetRemoteStageSendCountForTests(): void {
  sends = 0;
}

// ---------------------------------------------------------------------------
// The two verbs, which are one function with one word different
// ---------------------------------------------------------------------------

/**
 * Put a list of paths into one repository's index on one machine.
 *
 * The order in {@link writeIndexOnMachine} is the design and both verbs share
 * it, so there is one implementation of the decision rather than two.
 */
export async function stageOnMachine(
  input: MachineIndexWriteInput
): Promise<MachineIndexWriteResult> {
  return writeIndexOnMachine('stage', input);
}

/**
 * Take a list of paths back out of that index.
 *
 * On a repository with no commit the far side's `git restore --staged` fails
 * and the same call runs `git rm --cached -r -q` over the same list, which
 * leaves every file in the folder. That branch is decided ON THAT MACHINE,
 * because the stderr that names it is on that machine.
 */
export async function unstageOnMachine(
  input: MachineIndexWriteInput
): Promise<MachineIndexWriteResult> {
  return writeIndexOnMachine('unstage', input);
}

/**
 * The order below is the design. Steps 1 to 7 all happen before anything is
 * composed and before anything is sent, so every one of their answers means the
 * machine was never asked.
 *
 *  1. An empty list answers `nothingToDo`.
 *  2. The row, the confirm gate and the confirmed folder, in one call. Null
 *     answers `writesOff`.
 *  3. Every path is tested for a line break, which throws.
 *  4. `rootHolds` over the TAB'S FOLDER. False answers `outsideRoot`, and the
 *     machine is not contacted at all, so that answer costs nothing over there.
 *  5. The fresh read. An empty `repoPath` answers `notRepo`.
 *  6. The reported set. A path that is not in it throws. A row's `origPath` is
 *     appended here, because `git status` reports the new path for a git
 *     detected rename and staging it needs the old one too.
 *  7. The chunking. A single path over the budget throws.
 *  8. The connection, then one `runRemoteWrite` per chunk, in series. The send
 *     counter moves immediately before each one.
 *  9. The answer of each chunk, parsed. THE FIRST CHUNK GIT REFUSES ENDS THE
 *     LOOP, because the sentence for that word says Tortie stopped.
 */
async function writeIndexOnMachine(
  verb: IndexVerb,
  input: MachineIndexWriteInput
): Promise<MachineIndexWriteResult> {
  const from = Date.now();
  let readMs = 0;
  const answer = (
    outcome: MachineIndexWriteOutcome,
    parts: {
      paths?: number;
      chunks?: number;
      repoPath?: string;
      writeRoot?: string | null;
      machineSaid?: string | null;
    } = {}
  ): MachineIndexWriteResult => ({
    outcome,
    paths: parts.paths ?? 0,
    chunks: parts.chunks ?? 0,
    repoPath: parts.repoPath ?? '',
    writeRoot: parts.writeRoot ?? null,
    machineSaid: parts.machineSaid ?? null,
    readMs,
    tookMs: Date.now() - from
  });

  // 1. Nothing to do is not a refusal and it is not an error.
  const asked = Array.isArray(input.paths) ? input.paths : [];
  if (asked.length === 0) return answer('nothingToDo');

  // 2. The row, the gate and the confirmed folder.
  const ready = confirmedWriteRoot(input.machineId);
  if (ready === null) return answer('writesOff');
  const { row, writeRoot } = ready;

  // 3. A name holding a line break, refused before anything is composed. The
  // list travels as one positional split on a newline, so such a name would
  // arrive as two paths and stage a file nobody named.
  for (const path of asked) {
    if (typeof path !== 'string' || !/[\r\n]/.test(path)) continue;
    throw gmuxError(
      'INVALID_INPUT',
      STAGE_NAME_HOLDS_LINE_BREAK,
      `${row.id} was asked to ${verb} a path holding a line break, and the ` +
        `list of paths travels as one value separated by newlines`
    );
  }

  // 4. The folder this tab is about has to sit under the folder the person
  // confirmed. BOTH ARE PATHS AS GIVEN. The repository root is not compared
  // here, because that machine's git resolves every link before it prints it
  // and this Mac cannot follow a link on another computer. The header carries
  // the measurement, what this does not prove, and what the exact comparison
  // would cost.
  const cwdRel = rootRelativeCwd(writeRoot, input.cwd);
  if (cwdRel === null) {
    return answer('outsideRoot', { writeRoot });
  }

  // 5. The fresh read. THE REPOSITORY ROOT COMES FROM THAT MACHINE'S OWN
  // rev-parse and never from the caller.
  const readFrom = Date.now();
  const list = await reviewFilesOn({
    machineId: input.machineId,
    cwd: input.cwd
  });
  readMs = Date.now() - readFrom;
  if (list.repoPath.length === 0) {
    return answer('notRepo', { writeRoot });
  }

  // 6. Every path is one that fresh read named, and a rename sends both ends.
  const reported = reportedPaths(list.files, list.untracked);
  const wanted: string[] = [];
  const seen = new Set<string>();
  const addOnce = (path: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    wanted.push(path);
  };
  for (const path of asked) {
    if (!reported.has(path)) {
      throw gmuxError(
        'INVALID_INPUT',
        STAGE_PATH_NOT_REPORTED,
        `${row.id} did not report "${path.slice(0, 120)}" as changed in ` +
          `${list.repoPath}, so nothing was sent`
      );
    }
    addOnce(path);
    const orig = [...list.files, ...list.untracked].find(
      (one) => one.path === path
    )?.origPath;
    if (typeof orig === 'string' && orig.length > 0) addOnce(orig);
  }

  // 7. The chunking, measured against the exact composer the door uses.
  const chunks = chunkIndexPaths(
    verb,
    list.repoPath,
    wanted,
    writeRoot,
    cwdRel
  );

  // 8. The connection, then one command per chunk, in series.
  const ctx = readyRemoteContext(input.machineId);
  let outcome: MachineIndexWriteOutcome = 'done';
  let machineSaid: string | null = null;
  let sent = 0;
  for (const chunk of chunks) {
    sends += 1;
    let out;
    try {
      out = await runRemoteWrite(
        ctx,
        SCRIPT_OF[verb],
        [list.repoPath, chunk.join('\n'), writeRoot, cwdRel],
        {
          timeoutMs: REMOTE_STAGE_TIMEOUT_MS,
          execution: { kind: 'command', subject: list.repoPath }
        }
      );
    } catch {
      // A failure here is NOT proof that nothing happened. Phase 101 measured a
      // killed ssh completing the far side write. This verb always re-reads
      // afterwards, so the honest answer is a word the panel can draw beside
      // fresh rows rather than an error that replaces them.
      outcome = 'unsure';
      break;
    }
    sent += 1;
    // 9. The answer.
    const said = parseIndexWriteAnswer(out.payload);
    if (said === null) {
      outcome = 'unsure';
      break;
    }
    if (said.outside) {
      // 9a. The far side refused before any git ran, because a component of
      // the tab's own folder is a symbolic link and the repository the `cd`
      // would have reached is outside the confirmed folder. It lands on the
      // outcome this verb already has and the sentence a person reads is the
      // one that already says nothing was changed, which is true: the walk
      // stands above every git in the script.
      outcome = 'outsideRoot';
      break;
    }
    if (!said.ok) {
      // IT STOPS HERE. The sentence a person reads for this word says Tortie
      // stopped, and it has to be true. Sending the rest of the list after git
      // has already refused part of it would put more files in that index after
      // the sentence said nothing more was sent.
      outcome = 'partial';
      machineSaid = said.said;
      break;
    }
  }

  return answer(outcome, {
    paths: wanted.length,
    chunks: sent,
    repoPath: list.repoPath,
    writeRoot,
    machineSaid
  });
}
