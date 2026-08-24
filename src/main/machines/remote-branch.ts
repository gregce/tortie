/**
 * The branch checked out in one folder on another machine (Phase 106, research
 * 57 section 5).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine. On that tab the Source Control
 * view drew the changed files (Phase 90.3) and the workflow runs (Phase 105).
 * It did not say which branch is checked out over there, so a person had to
 * read the branch out of the Runs group's own sentence or open a session and
 * type. This module answers with the branch, the branch it follows, and how far
 * ahead and how far behind it is.
 *
 * ## Why a second read rather than four more fields on `repo-facts`
 *
 * Phase 105's `repo-facts` gives the branch name and the commit `HEAD` points
 * at. It gives neither the upstream nor the two counts, which are two of the
 * three things this group must show. Widening it would make every Runs read pay
 * for a group nobody opened, which is the union script shape research 57
 * section 5.3 refused. So each group pays for itself and a collapsed group
 * costs nothing.
 *
 * ## What crosses, drawn
 *
 * ```
 *   THIS MAC                              THE MACHINE
 *   ────────                              ───────────
 *   machines:readBranch ──▶ this module
 *                             │ one read of 'repo-branch', one value
 *                             └──────────▶ git rev-parse x2, git for-each-ref,
 *                                          base64, tr
 *                             ◀────────── <mode word> <base64 or none>
 *                             │
 *                             │ parseForEachRefBranches (../git/parsers)
 *                             ▼
 *                           MachineBranchResult
 * ```
 *
 * Nothing else happens. No gh, no fetch, no second read, no timer.
 *
 * ## THE MAIN SIDE WRITES NO SECOND PARSER
 *
 * The script's `for-each-ref` format is exactly `BRANCH_FORMAT` from
 * `src/main/git/parse.ts` minus `%(subject)`, so `parseForEachRefBranches` and
 * `parseUpstreamTrack` read the answer unchanged. Condition 56d of
 * `build/conformance-machines.mjs` asserts that relation, so the two copies
 * cannot drift. Grepped for before anything was written here: both functions
 * and the `UpstreamTrack` type already existed. Phase 126 moved this import
 * from the `../git` barrel to `../git/parsers`, which is the parsers and
 * nothing that spawns. The barrel still exports all three names.
 *
 * ONE RAW FIELD IS READ BESIDE THAT PARSER, and it is read for one reason.
 * `parseForEachRefBranches` answers 0 and 0 for an empty tracking field, which
 * means level, and it answers 0 and 0 again for a tracking field this end could
 * not read. Those are different states and a person needs them told apart, so
 * the raw `%(upstream:track,nobracket)` field is read out of the same line and
 * `trackUnreadable` is set from it. Phase 99 carried a flag the renderer never
 * read and a cut list drew as a whole one. This one is drawn.
 *
 * ## The external programs the far side runs, COUNTED rather than estimated
 *
 * Research 57 section 5.1 priced this read at 3, counting git alone. MEASURED
 * on 2026-08-20 with counting wrappers on PATH ahead of git, base64 and tr: a
 * folder with a branch checked out runs FIVE programs, being git twice for
 * `rev-parse`, git once for `for-each-ref`, `base64` once and `tr` once. A
 * detached head runs 2, a folder git does not track runs 1, and a folder that is
 * missing or unreadable runs 0. `printf`, `cd`, `case` and `[` are shell
 * builtins, so a counting wrapper never sees them. Row 12 of
 * `node build/probe-p106-branch.mjs` measures it again on every run.
 *
 * ## What it does not do
 *
 *  - IT WRITES NOTHING, on either computer. `repo-branch` is a read and the
 *    catalogue's two writers did not move.
 *  - IT NEVER SWITCHES A BRANCH. There is no checkout verb here, the renderer
 *    draws no control that could ask for one, and switching is a write that no
 *    phase has built.
 *  - IT NEVER FETCHES. The two counts are measured against the copy of the
 *    upstream that machine last fetched, so the answer can already be older
 *    than what is on the server when it is read. The renderer says so on
 *    screen, and condition 56i of the gate fails the script text if it ever
 *    names `git fetch`, `git pull` or `git remote update`.
 *  - IT DOES NOT WATCH. Main cannot see a branch switched on another computer,
 *    so there is no arming path and no poll. A read happens when a person opens
 *    the group and when they press Refresh, and at no other time.
 *  - IT LISTS ONLY THE CHECKED OUT BRANCH. The other branches over there are
 *    not read.
 *  - IT SETS NO SESSION'S STATUS. Nothing here imports the sessions domain.
 *  - IT IMPORTS NOTHING FROM `../actions/`. The stale sentence in
 *    `../actions/index.ts` that Phase 105 had to leave standing is not made
 *    worse by this phase, and condition 56j asserts it.
 *
 * ## It never throws for anything a machine said
 *
 * A folder that is not there, a folder git does not track, a detached head, a
 * git too old to answer the format, a machine that did not answer and a machine
 * Tortie is not signed in to are all ordinary states. Each comes back as a
 * result carrying its own mode word, and the renderer draws the sentence from
 * `src/renderer/machines/branch.ts`. No prose crosses this boundary.
 */

import type { MachineBranchInput, MachineBranchResult } from '@shared/ipc';
import type { GitBranchInfo } from '@shared/types';
import { parseForEachRefBranches } from '../git/parsers';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './ready-context';
import { machineLabelOf, machineRow } from './store';

/**
 * The deadline on the branch read, in ms. 15,000.
 *
 * It is the door's own default in `./remote-run.ts`, named here so this file
 * says what it asks for rather than inheriting it silently. It is a ceiling on
 * a machine that went to sleep rather than an expectation: the five programs
 * above run in tens of milliseconds on a machine that is awake.
 */
export const REMOTE_BRANCH_TIMEOUT_MS = 15_000;

/** The six words `repo-branch` may print first. `none` is not one of them. */
const MODE_WORDS: Readonly<Record<string, RepoBranchWord>> = {
  repo: 'repo',
  nobranch: 'nobranch',
  nodetails: 'nodetails',
  notrepo: 'notrepo',
  missing: 'missing',
  denied: 'denied'
};

/** The first word of one `repo-branch` answer. */
export type RepoBranchWord =
  | 'repo'
  | 'nobranch'
  | 'nodetails'
  | 'notrepo'
  | 'missing'
  | 'denied';

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/** The field separator the format puts between the seven fields. */
const FIELD_SEPARATOR = '\x1f';

/** Where `%(upstream:track,nobracket)` sits in the format. */
const TRACK_FIELD = 5;

/** What one machine said about the branch in one folder. */
export interface RepoBranchAnswer {
  readonly mode: RepoBranchWord;
  /** The one branch row that machine's git printed, or null. */
  readonly row: GitBranchInfo | null;
  /**
   * The raw `%(upstream:track,nobracket)` field, or null when there was none.
   *
   * It is kept so the caller can tell a tracking answer that means level from
   * one this end could not read. Both parse to 0 and 0.
   */
  readonly track: string | null;
}

/**
 * The two fields of one `repo-branch` answer, or null when nothing parsed.
 * PURE.
 *
 * The answer is `<word> <base64 or none>`. The base64 word is checked BEFORE it
 * is decoded, for the reason `./remote-review.ts` states about its own answers:
 * `Buffer.from` DROPS a character it does not know and hands back plausible
 * nonsense, and a person reading a branch name cannot tell nonsense from a
 * branch.
 *
 * A word this module does not know, a field that is not there and a decoded
 * line the shared parser refuses all make the whole answer unreadable, which
 * the caller reads as the machine not having answered. That is the same
 * treatment `./remote-runs.ts` gives a malformed field, and it is louder than a
 * half read answer.
 */
export function parseRepoBranchAnswer(payload: string): RepoBranchAnswer | null {
  const words = payload.trim().split(/[ \t\n]+/);
  if (words.length !== 2) return null;
  const mode = MODE_WORDS[words[0] ?? ''];
  if (mode === undefined) return null;
  if (mode !== 'repo') {
    // The far side prints one `none` word on all five of its other branches,
    // and an answer carrying anything else there is a shape this module does
    // not recognise.
    if (words[1] !== 'none') return null;
    return { mode, row: null, track: null };
  }
  const word = words[1] ?? '';
  if (word === 'none' || word.length === 0 || !BASE64_ONLY.test(word)) {
    return null;
  }
  const decoded = Buffer.from(word, 'base64').toString('utf8');
  const rows = parseForEachRefBranches(decoded);
  const row = rows[0];
  if (row === undefined) return null;
  // The same line the shared parser just read, for the one field it folds away.
  const line = decoded.split('\n').find((one) => one.length > 0) ?? '';
  const track = line.split(FIELD_SEPARATOR)[TRACK_FIELD] ?? '';
  return { mode, row, track };
}

/**
 * Every shape a `nobracket` tracking answer can take, and no other.
 *
 * An empty answer means level and is handled before this is asked. The four
 * below are the whole of what `%(upstream:track,nobracket)` prints otherwise.
 */
const TRACK_SHAPES =
  /^(?:gone|ahead \d+|behind \d+|ahead \d+, behind \d+)$/;

/**
 * True when a tracking answer arrived and this end could not read it. PURE.
 *
 * THIS RULE IS STRICTER THAN THE ONE THE PHASE SPEC DRAFTED, AND THE REASON IS
 * A MEASUREMENT. The spec said to set the flag when the answer was not empty,
 * was not `gone` and still parsed to 0 and 0. Measured on 2026-08-20 against
 * `parseUpstreamTrack` in `../git`: the bracketed answer an older git prints,
 * being `[ahead 2, behind 1]`, parses to ahead 0 and BEHIND 1, not to 0 and 0.
 * Its behind regular expression matches on `, behind 1` while its ahead one
 * needs the start of the string or a `, ` in front, and the leading `[` blocks
 * only the second. So the spec's rule would have called that answer readable
 * and the panel would have drawn "0 commits ahead and 1 commit behind" for a
 * branch that is 2 ahead and 1 behind. Two wrong numbers is worse than a
 * sentence saying the answer could not be read.
 *
 * The rule here is therefore about the SHAPE of the whole string rather than
 * about the numbers that fell out of it. An answer is readable when it is
 * empty, or when it is exactly one of `gone`, `ahead N`, `behind N` and
 * `ahead N, behind M`. Anything else is an answer in a form this version does
 * not know, and the caller zeroes both counts and sets this flag so the
 * renderer draws a sentence instead of a number nobody measured.
 */
export function trackWasUnreadable(track: string | null): boolean {
  if (track === null) return false;
  const text = track.trim();
  if (text.length === 0) return false;
  return !TRACK_SHAPES.test(text);
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the branch, for the seven answers that carry none. */
function answerWithout(
  input: MachineBranchInput,
  mode: MachineBranchResult['mode'],
  started: number
): MachineBranchResult {
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: typeof input.cwd === 'string' ? input.cwd : '',
    mode,
    branch: null,
    sha: null,
    shortSha: null,
    upstream: null,
    upstreamGone: false,
    ahead: 0,
    behind: 0,
    trackUnreadable: false,
    readAt: now,
    elapsedMs: now - started
  };
}

/**
 * Ask one machine which branch is checked out in one folder.
 *
 * @returns a result carrying `ok` and the branch, or one of the seven other
 *   answers. It NEVER THROWS for anything the machine said, and it never throws
 *   at all: the one value it takes beside the machine is a folder, and a folder
 *   that is not absolute is answered rather than refused.
 */
export async function readBranchOnMachine(
  input: MachineBranchInput
): Promise<MachineBranchResult> {
  const started = Date.now();
  // A path that is not absolute names nothing on that machine. It is reported
  // rather than sent, because the far side's shell would resolve it against
  // whatever folder it started in. That is `./remote-files.ts`'s rule.
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    return answerWithout(input, 'missing', started);
  }
  if (!machineIsConnected(input.machineId)) {
    return answerWithout(input, 'notConnected', started);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answerWithout(input, 'notConnected', started);
  }
  let answer: RepoBranchAnswer | null;
  try {
    const out = await runRemoteRead(ctx, 'repo-branch', [input.cwd], {
      timeoutMs: REMOTE_BRANCH_TIMEOUT_MS
    });
    answer = parseRepoBranchAnswer(out.payload);
  } catch {
    return answerWithout(input, 'unreachable', started);
  }
  // A payload nothing could read is a machine that did not answer, rather than
  // a guess about a folder. The shape this expected is in
  // `parseRepoBranchAnswer`.
  if (answer === null) {
    return answerWithout(input, 'unreachable', started);
  }
  if (answer.mode === 'missing') return answerWithout(input, 'missing', started);
  if (answer.mode === 'denied') return answerWithout(input, 'denied', started);
  if (answer.mode === 'notrepo') return answerWithout(input, 'notRepo', started);
  if (answer.mode === 'nobranch') {
    // A detached head and a repository with no commits both land here, and the
    // sentence on screen names both.
    return answerWithout(input, 'noBranch', started);
  }
  if (answer.mode === 'nodetails' || answer.row === null) {
    // The branch name was read over there and its details were not. A git older
    // than 2.13 refuses the whole format, which is the reason the far side has
    // a word for this rather than printing an empty payload.
    return answerWithout(input, 'noDetails', started);
  }
  const row = answer.row;
  const unreadable = trackWasUnreadable(answer.track);
  const now = Date.now();
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode: 'ok',
    branch: row.name.length > 0 ? row.name : null,
    sha: row.sha.length > 0 ? row.sha : null,
    shortSha: row.shortSha.length > 0 ? row.shortSha : null,
    upstream: row.upstream === undefined ? null : row.upstream,
    upstreamGone: row.upstreamGone === true,
    // BOTH COUNTS ARE ZEROED WHEN THE ANSWER WAS NOT READ. A partial parse of
    // an answer in an unknown form gives a number nobody measured, and the
    // renderer draws a sentence for this state rather than a count.
    ahead: unreadable ? 0 : row.ahead,
    behind: unreadable ? 0 : row.behind,
    trackUnreadable: unreadable,
    readAt: now,
    elapsedMs: now - started
  };
}
