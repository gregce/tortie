/**
 * The commit graph of one folder on another machine (Phase 107, research 57
 * section 5).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine. On that tab the Source Control
 * view drew the changed files (Phase 90.3), the workflow runs (Phase 105) and
 * the branch (Phase 106). It did not draw the history, so a person had to open
 * a session over there and type. This module answers with a page of the newest
 * commits, the two anchors the swimlane picture needs, and the marks that say
 * which commits are ahead of the followed branch and which are behind it.
 *
 * ## Why a third read rather than more fields on `repo-branch`
 *
 * A history read costs tens of thousands of bytes and a branch read costs a
 * hundred. Folding the two into one call would make every Branch read pay for a
 * group nobody opened, which is the union script shape research 57 section 5.3
 * refused. So each group pays for itself and a collapsed group costs nothing.
 *
 * ## What crosses, drawn
 *
 * ```
 *   THIS MAC                              THE MACHINE
 *   ────────                              ───────────
 *   machines:readHistory ──▶ this module
 *                             │ clamp to [1, 500], ask for one more
 *                             │ ONE runRemoteRead of 'repo-history'
 *                             └──────────▶ git rev-parse x3, git log,
 *                                          git merge-base, git rev-list,
 *                                          base64 x2, tr x2
 *                             ◀────────── <word> <head> <upstream> <base>
 *                                         <log b64> <sides b64>
 *                             │
 *                             │ parseGraphLog     (../git/parsers, unchanged)
 *                             │ parseLeftRight    (../git/parsers, unchanged)
 *                             │ annotateDivergence(../git/parsers, unchanged)
 *                             ▼
 *                           MachineHistoryResult
 * ```
 *
 * Nothing else happens. No `gh`, no fetch, no second read, no timer, no write.
 *
 * ## THE MAIN SIDE WRITES NO SECOND PARSER
 *
 * The far side's `--format` literal is exactly `GRAPH_LOG_FORMAT` from
 * `src/main/git/graph-parse.ts`, so `parseGraphLog`, `parseLeftRight` and
 * `annotateDivergence` read the answer unchanged. All three were already
 * exported and are used here as they are. Phase 126 moved this import from the
 * `../git` barrel to `../git/parsers`, which is the parsers and nothing that
 * spawns. The barrel still exports all three names. Condition 57d of
 * `build/conformance-machines.mjs` asserts that the script's literal equals the
 * constant, so the two copies cannot drift.
 *
 * ## THE PAGE, AND WHY THE CEILING IS 500 RATHER THAN 20,000
 *
 * `REMOTE_HISTORY_PAGE` is 50 and `REMOTE_HISTORY_MAX_COMMITS` is 500, both in
 * `@shared/ipc`. One commit record is about 270 base64 bytes, so a page is
 * about 13,500 bytes and the ceiling is about 135,000. The marks add about 41
 * raw bytes a commit, so the worst single answer this module can produce is
 * about 162,000 bytes. `MAX_LOG_COUNT` in `src/main/git/service.ts` is 20,000
 * because a local walk pays for it in local disk reads. A remote walk pays for
 * it over a link a person's laptop may be holding on a hotel network, and
 * 20,000 commits would be 5,400,000 base64 bytes in ONE answer that main
 * buffers whole, hands to a parser whole and sends over one IPC message whole.
 * Main clamps here as well as in the renderer, so a renderer that asked for
 * more is still answered with 500. Condition 57j of the gate holds the two
 * numbers.
 *
 * THE WINDOW IS RE-WALKED FROM THE TOP rather than continued from a cursor. A
 * cursor has to be right about what happened on the far side between two
 * presses, and it cannot be, because a commit made over there in between shifts
 * the window and the two pages then overlap or drop a row. The cost is named
 * rather than hidden. Ten presses send 13,500 + 27,000 and so on up to 135,000
 * bytes, being 742,500 in total, against 135,000 for the last page alone. The
 * far side's own cost is nearly flat. Research 57 section 5.2 measured a
 * history script asked for 51 commits at 95.1 ms and the same script asked for
 * 335 at 93.9 ms.
 *
 * ## The external programs the far side runs, COUNTED rather than estimated
 *
 * Research 57 priced Phase 105 at 4 and the truth was 8, and Phase 106 at 3 and
 * the truth was 5, so this table was MEASURED on 2026-08-20 by putting counting
 * wrappers on PATH ahead of `git`, `base64` and `tr` and running the SHIPPED
 * script text five times against each shape.
 *
 * | Far side path | Programs | Which ones |
 * | --- | --- | --- |
 * | a folder that is not there | 0 | none |
 * | a folder the account cannot read | 0 | none |
 * | a folder git does not track | 1 | git x1 |
 * | a repository with no commits | 6 | git x4, base64 x1, tr x1 |
 * | a branch that follows nothing | 6 | git x4, base64 x1, tr x1 |
 * | a detached head | 6 | git x4, base64 x1, tr x1 |
 * | a branch with an upstream | 10 | git x6, base64 x2, tr x2 |
 * | a linked worktree on a branch with an upstream | 10 | git x6, base64 x2, tr x2 |
 *
 * Every shape ran the same number on all five runs. `printf`, `cd` and `[` are
 * builtins in dash and in bash, so a counting wrapper on PATH never sees them
 * and they are not in these numbers. Row 16 of
 * `node build/probe-p107-history.mjs` measures the same thing again on every
 * run, and the measurement wins over this table.
 *
 * ## What is not true after this phase, said plainly
 *
 *  - THE FILES ONE COMMIT CHANGED ARE NOT READ. Reading them is a second script
 *    and a third one for the two sides of a file, and this phase ships one
 *    script. No row here is clickable and no row expands. The renderer says so
 *    on screen.
 *  - NOTHING REFRESHES. Main cannot see a commit made on another computer, so
 *    there is no timer, no watch and no arming path. A read happens on the
 *    first expand, on Load more, and when a person presses Refresh.
 *  - A PAGE IS READ FRESH, SO THE PICTURE CAN BE DRAWN DIFFERENTLY AFTER LOAD
 *    MORE. The far side resolves its own branches, tags and remote branches on
 *    every read. `layoutGraph` asks the caller to pin the ref set between pages
 *    and this door cannot carry one. The whole list is replaced rather than
 *    appended, so nothing tears, but the lines on the left can move. The
 *    renderer says so on screen.
 *  - THE MARKS ARE READ FOR THE PAGE AND NO FURTHER. `rev-list --left-right` is
 *    asked with the same count as the walk, and when it comes back at that count
 *    `divergenceTruncated` is set and the renderer says so.
 *  - A REMOTE NAME THAT HOLDS A SLASH ATTRIBUTES TO ITS FIRST PART.
 *    `parseGraphLog` takes an optional list of remote names so that
 *    `refs/remotes/team/fork/main` attributes to `team/fork`. Reading the remote
 *    names over there is a second question, so the list is not passed and the
 *    parser's own fallback is used, which is what VS Code does. It affects a
 *    badge's remote name and nothing else.
 *  - THERE IS NO SCOPE CONTROL. The local History offers branch, local and
 *    everything. This one always walks branches, tags and remote branches,
 *    which is the local `everything` scope minus its filter of the
 *    `<remote>/HEAD` alias. That alias names a commit that is already a tip of
 *    the branch it aliases, so the walk sees no commit it would not have seen,
 *    and `parseDecoration` already drops it from the badges.
 *  - NOTHING WRITES. No new writer, no change to the catalogue's two write
 *    scripts, no checkout, no branch, no cherry pick and no revert.
 *  - IT SETS NO SESSION'S STATUS. Nothing here imports the sessions domain.
 *  - IT IMPORTS NOTHING FROM `../actions/`. The stale sentence in
 *    `../actions/index.ts` that Phase 105 had to leave standing is not made
 *    worse by this phase, and condition 57i asserts it.
 *  - `sanitizeRefNames` IS NEVER CALLED HERE and it never crosses. The far side
 *    walks `--branches --tags --remotes`, so no ref name is a value at any
 *    point and the guard's job is removed rather than relocated. Row 18 of the
 *    probe proves that every name the refused `--stdin` shape could have sent is
 *    a name that guard would have passed unchanged.
 *
 * ## It never throws for anything a machine said
 *
 * A folder that is not there, a folder git does not track, a repository with no
 * commits, a machine that did not answer and a machine Tortie is not signed in
 * to are all ordinary states. Each comes back as a result carrying its own mode
 * word, and the renderer draws the sentence from
 * `src/renderer/machines/history.ts`. No prose crosses this boundary.
 */

import type { MachineHistoryInput, MachineHistoryResult } from '@shared/ipc';
import { REMOTE_HISTORY_MAX_COMMITS, REMOTE_HISTORY_PAGE } from '@shared/ipc';
import type { GitGraphLogEntry } from '@shared/types';
import { annotateDivergence, parseGraphLog, parseLeftRight } from '../git/parsers';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * The deadline on one history read, in ms. 20,000.
 *
 * It is longer than the door's own 15,000 ms default because this is the one
 * remote read in the product whose answer can be 162,000 bytes. The far side's
 * own work is not what that pays for. Research 57 section 5.2 measured the walk
 * at about 95 ms whether it was asked for 51 commits or 335. It is a ceiling on
 * a slow link and on a machine that went to sleep, rather than an expectation.
 */
export const REMOTE_HISTORY_TIMEOUT_MS = 20_000;

/** The four words `repo-history` may print first. `none` is not one of them. */
const MODE_WORDS: Readonly<Record<string, RepoHistoryWord>> = {
  repo: 'repo',
  notrepo: 'notrepo',
  missing: 'missing',
  denied: 'denied'
};

/** The first word of one `repo-history` answer. */
export type RepoHistoryWord = 'repo' | 'notrepo' | 'missing' | 'denied';

/** How many words one answer carries, being the mode word and five fields. */
const ANSWER_WORDS = 6;

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/** A commit name as git prints it, under SHA-1 and under SHA-256. */
const SHA_ONLY = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

/** What one machine said about the commits in one folder. */
export interface RepoHistoryAnswer {
  readonly mode: RepoHistoryWord;
  /** The commit HEAD points at over there, or null. */
  readonly headSha: string | null;
  /** The commit the followed branch points at over there, or null. */
  readonly upstreamSha: string | null;
  /** `git merge-base` of those two over there, or null. */
  readonly mergeBase: string | null;
  /** The decoded walk, or null when the far side printed none. */
  readonly log: string | null;
  /** The decoded `rev-list --left-right` output, or null. */
  readonly sides: string | null;
}

/** One base64 field, decoded, or null. `false` means the field is unreadable. */
function decodeField(word: string): string | null | false {
  if (word === 'none' || word.length === 0) return null;
  // The word is checked BEFORE it is decoded, for the reason
  // `./remote-review.ts` states about its own answers. `Buffer.from` DROPS a
  // character it does not know and hands back plausible nonsense, and a person
  // reading a commit subject cannot tell nonsense from a subject.
  if (!BASE64_ONLY.test(word)) return false;
  return Buffer.from(word, 'base64').toString('utf8');
}

/** One commit name field, or null. `false` means the field is unreadable. */
function shaField(word: string): string | null | false {
  if (word === 'none' || word.length === 0) return null;
  return SHA_ONLY.test(word) ? word : false;
}

/**
 * The six fields of one `repo-history` answer, or null when nothing parsed.
 * PURE.
 *
 * The answer is `<word> <head> <upstream> <base> <log> <sides>`. A word this
 * module does not know, a field count that is not six, a commit name that is
 * not a commit name and a base64 field holding a character base64 does not use
 * all make the WHOLE answer unreadable, which the caller reads as the machine
 * not having answered. That is the same treatment `./remote-branch.ts` and
 * `./remote-runs.ts` give a malformed field, and it is louder than a half read
 * answer.
 */
export function parseRepoHistoryAnswer(
  payload: string
): RepoHistoryAnswer | null {
  const words = payload.trim().split(/[ \t\n]+/);
  if (words.length !== ANSWER_WORDS) return null;
  const mode = MODE_WORDS[words[0] ?? ''];
  if (mode === undefined) return null;
  if (mode !== 'repo') {
    // The far side prints five `none` words on all three of its other
    // branches, and an answer carrying anything else there is a shape this
    // module does not recognise.
    for (let at = 1; at < ANSWER_WORDS; at += 1) {
      if (words[at] !== 'none') return null;
    }
    return {
      mode,
      headSha: null,
      upstreamSha: null,
      mergeBase: null,
      log: null,
      sides: null
    };
  }
  const headSha = shaField(words[1] ?? '');
  const upstreamSha = shaField(words[2] ?? '');
  const mergeBase = shaField(words[3] ?? '');
  const log = decodeField(words[4] ?? '');
  const sides = decodeField(words[5] ?? '');
  if (
    headSha === false ||
    upstreamSha === false ||
    mergeBase === false ||
    log === false ||
    sides === false
  ) {
    return null;
  }
  return { mode, headSha, upstreamSha, mergeBase, log, sides };
}

/**
 * The count this read will actually ask for. PURE.
 *
 * A value that is not a finite number is the page. Everything else is floored
 * and then held between 1 and {@link REMOTE_HISTORY_MAX_COMMITS}. Main clamps
 * as well as the renderer, so a renderer that asked for 20,000 is answered with
 * 500 rather than with 20,000, and condition 57j of the gate is what keeps that
 * number where it is.
 */
export function clampHistoryCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return REMOTE_HISTORY_PAGE;
  }
  const whole = Math.floor(value);
  if (whole < 1) return 1;
  if (whole > REMOTE_HISTORY_MAX_COMMITS) return REMOTE_HISTORY_MAX_COMMITS;
  return whole;
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the commits, for the five answers that carry none. */
function answerWithout(
  input: MachineHistoryInput,
  mode: MachineHistoryResult['mode'],
  maxCount: number,
  started: number
): MachineHistoryResult {
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: typeof input.cwd === 'string' ? input.cwd : '',
    mode,
    entries: [],
    maxCount,
    ceiling: REMOTE_HISTORY_MAX_COMMITS,
    hasMore: false,
    atCeiling: false,
    headSha: null,
    upstreamSha: null,
    mergeBase: null,
    markedCount: 0,
    divergenceTruncated: false,
    answerBytes: 0,
    readAt: now,
    elapsedMs: now - started
  };
}

/** How many commit names one `rev-list --left-right` answer carried. */
function sideLineCount(output: string | null): number {
  if (output === null) return 0;
  let lines = 0;
  for (const line of output.split('\n')) {
    if (line.trim().length > 0) lines += 1;
  }
  return lines;
}

/**
 * Ask one machine for a page of the newest commits in one folder.
 *
 * @returns a result carrying `ok` and the page, or one of the six other
 *   answers. It NEVER THROWS for anything the machine said, and it never throws
 *   at all. A folder that is not absolute is answered rather than refused, and
 *   a count that makes no sense is clamped rather than refused.
 */
export async function readHistoryOnMachine(
  input: MachineHistoryInput
): Promise<MachineHistoryResult> {
  const started = Date.now();
  const maxCount = clampHistoryCount(input.maxCount);
  // ONE MORE THAN THE PAGE. The extra commit is how this end learns there are
  // older ones without asking a second question. It is dropped rather than
  // drawn.
  const wanted = maxCount + 1;
  // A path that is not absolute names nothing on that machine. It is reported
  // rather than sent, because the far side's shell would resolve it against
  // whatever folder it started in. That is `./remote-files.ts`'s rule.
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    return answerWithout(input, 'missing', maxCount, started);
  }
  if (!machineIsConnected(input.machineId)) {
    return answerWithout(input, 'notConnected', maxCount, started);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answerWithout(input, 'notConnected', maxCount, started);
  }
  let answer: RepoHistoryAnswer | null;
  let answerBytes = 0;
  try {
    const out = await runRemoteRead(
      ctx,
      'repo-history',
      [input.cwd, String(wanted)],
      { timeoutMs: REMOTE_HISTORY_TIMEOUT_MS }
    );
    answerBytes = out.bytes;
    answer = parseRepoHistoryAnswer(out.payload);
  } catch {
    return answerWithout(input, 'unreachable', maxCount, started);
  }
  // A payload nothing could read is a machine that did not answer, rather than
  // a guess about a folder. The shape this expected is in
  // `parseRepoHistoryAnswer`.
  if (answer === null) {
    return answerWithout(input, 'unreachable', maxCount, started);
  }
  if (answer.mode === 'missing') {
    return answerWithout(input, 'missing', maxCount, started);
  }
  if (answer.mode === 'denied') {
    return answerWithout(input, 'denied', maxCount, started);
  }
  if (answer.mode === 'notrepo') {
    return answerWithout(input, 'notRepo', maxCount, started);
  }
  // The one parser, reused. No remote names are passed, so a remote whose name
  // holds a slash attributes to its first part, which is what VS Code does.
  const walked = parseGraphLog(answer.log ?? '');
  const hasMore = walked.length > maxCount;
  const page: GitGraphLogEntry[] = hasMore ? walked.slice(0, maxCount) : walked;
  const { unpushed, unpulled } = parseLeftRight(answer.sides ?? '');
  const entries = annotateDivergence(page, unpushed, unpulled);
  let markedCount = 0;
  for (const entry of entries) {
    if (entry.unpushed === true || entry.unpulled === true) markedCount += 1;
  }
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    // ONE WORD FOR TWO CAUSES. A repository with no commits yet and a
    // repository with no branches, tags or remote branches to walk from both
    // land here, and the sentence on screen names both.
    mode: entries.length === 0 ? 'noCommits' : 'ok',
    entries,
    maxCount,
    ceiling: REMOTE_HISTORY_MAX_COMMITS,
    hasMore,
    atCeiling: hasMore && maxCount === REMOTE_HISTORY_MAX_COMMITS,
    headSha: answer.headSha,
    upstreamSha: answer.upstreamSha,
    mergeBase: answer.mergeBase,
    markedCount,
    // THE SECOND CUT. The marks were asked for with the same count as the walk,
    // so an answer that came back at that count is one the far side stopped
    // printing rather than one it finished.
    divergenceTruncated: sideLineCount(answer.sides) >= wanted,
    answerBytes,
    readAt: now,
    elapsedMs: now - started
  };
}
