/**
 * Committing what is staged in one repository on another machine (Phase 104).
 *
 * ## What this module owns
 *
 * The whole decision about whether the eighth write leaves this Mac, and the
 * reading of what the machine said afterwards. It is `./remote-stage.ts`'s
 * shape, and it is the only production caller of the `git-commit` script.
 *
 * Until Phase 103 no command Tortie sent could change a git repository on
 * another computer. After that phase two could, and both of them only chose
 * what the next commit would hold. This module makes the commit.
 *
 * ## The one field that decides everything, and it is not a new one
 *
 * `writeRoot` on the machine row, which is the sixth confirmed field Phase 101
 * added. PHASE 104 ADDS NO CONFIRMED FIELD. The hash still covers six fields,
 * `APPENDED_KEYS` in `./confirm.ts` is untouched, and no machine anybody
 * already confirmed is asked to confirm anything again.
 *
 * ## The gate is NOT in the door, and this phase did not move it there
 *
 * `runRemoteWrite` in `./remote-run.ts` has eight steps and none of them reads
 * a machine row. The gate is `confirmedWriteRoot` in `./remote-file.ts`, and
 * each of the write callers calls it as its first act. This module follows that
 * shipped shape.
 *
 * WHAT IS THEREFORE NOT TRUE AFTER THIS PHASE, said rather than left implied.
 * There is still no single place in the door that refuses a write for a machine
 * whose writes are off. Eight callers each ask one shared function, which is a
 * discipline rather than a door. The remedy costs one read of the machine row
 * inside `runRemoteScript` and is written down here for the round that takes
 * it.
 *
 * ## Containment, and it is the same four layers stage has
 *
 * `RemoteScmSection` holds a `repoPath` it got from a review answer. MAIN DOES
 * NOT TAKE IT. {@link commitOnMachine} takes the machine id and the tab's own
 * folder, and it runs the review read itself.
 *
 *  1. `confirmedWriteRoot`, which is the one implementation of the confirm gate
 *     and the confirmed folder. Null is the outcome `refused` with the
 *     writes-off sentence, and nothing is composed.
 *  2. {@link rootHolds} over THE TAB'S OWN FOLDER, imported from
 *     `./remote-stage.ts` because it is pure, already exported, and already
 *     carries the measurement about paths a far side resolved. False is
 *     `refused` with the outside-root sentence, decided before the machine is
 *     contacted at all.
 *  3. The fresh read, through `reviewFilesOn` in `./remote-review.ts`. An empty
 *     `repoPath` is `refused` with the not-a-repository sentence. The
 *     repository root that reaches that machine's git is the one that read
 *     returned, and never one a caller chose.
 *  4. The sha and the staged set of that same fresh read, compared against what
 *     the panel drew.
 *
 * ## The two guards, and neither of them is the renderer's value
 *
 * THE SHA. `git commit` cannot be made safe to run twice by a destination test
 * or by an end state, because running it twice adds two commits. So the sha
 * `HEAD` pointed at in main's own fresh read crosses with the message, that
 * machine compares it against its own `git rev-parse HEAD`, and a difference
 * answers `moved` having committed nothing. The first run moves `HEAD`, so a
 * repeat of one request always finds it moved.
 *
 * THE STAGED SET. `HEAD` does not move when somebody or an agent runs `git add`
 * in that folder on that machine. Tortie runs many agent processes at once
 * under one account, so that is an ordinary event rather than a rare one. A
 * `HEAD` guard alone would let a person commit content they never read in the
 * Changes list. So the same fresh read supplies the staged set, and a
 * difference answers `staged-changed` having committed nothing.
 *
 * THE WINDOW THAT IS NOT CLOSED. That comparison closes the window from the
 * renderer's draw to main's re-read. It does not close the window from main's
 * re-read to the far side's commit, which is one round trip wide. Nothing in
 * this phase closes that window.
 *
 * ## What this module does not import
 *
 * Nothing from `../manifest/`. `./remote-record.ts` is the one place a remote
 * path meets the manifest and this phase does not widen that.
 *
 * ## It opens no child of its own
 *
 * Every long running ssh child is owned by `./execution-ledger.ts`. This module
 * reaches it by passing `execution: { kind: 'command', subject: repoPath }` to
 * `runRemoteWrite`, exactly as `./remote-stage.ts` does.
 *
 * THIS MODULE NAMES NO OTHER DOOR AND NO PROCESS STARTING FUNCTION AT ALL.
 * Condition 86 of `build/conformance-machines.mjs` reads this file as text and
 * fails on four names: the read door, the login shell function, and the two
 * child process functions Node ships. They are listed in that condition rather
 * than here, so that this comment cannot fail the check it describes.
 *
 * ## A lost answer is one word, and it names the read that resolves it
 *
 * `cloneProjectOnMachine` carries two extra arms for the shutdown ledger,
 * because a copy that was cut leaves part of a project in a folder somebody has
 * to go and look at. A commit that was cut leaves either one commit or none,
 * and the Check what happened read answers which. So there is one word for
 * every lost answer, being `unsure`, and the sentence for it names that read.
 * The word never means nothing changed.
 */

import type {
  MachineCommitInput,
  MachineCommitOutcome,
  MachineCommitResult,
  MachineReviewFile
} from '@shared/ipc';
import {
  COMMIT_NO_MESSAGE,
  COMMIT_SHA_DISAGREED,
  commitConflicts,
  commitDone,
  commitFailed,
  commitHeadMoved,
  commitIdentityUnset,
  commitNotRepo,
  commitNothingStaged,
  commitOffline,
  commitOutsideRoot,
  commitStagedChanged,
  commitTimedOut,
  commitUnsure,
  commitWritesOff
} from './remote-copy';
import { confirmedWriteRoot } from './remote-file';
import { reviewFilesOn } from './remote-review';
import { machineIsConnected, runRemoteWrite } from './remote-run';
import { readyRemoteContext } from './ready-context';
import { rootHolds } from './remote-stage';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one commit gets on the machine. 300,000 ms.
 *
 * IT IS WHAT A LOCAL COMMIT GETS. `COMMIT_TIMEOUT_MS` in `../git/service.ts` is
 * 300,000 for the reason written beside it, being that hooks run inside a
 * commit. The remote door's own default is `REMOTE_RUN_TIMEOUT_MS` at 15,000,
 * and a `pre-commit` hook that runs a test suite is longer than that. The exec
 * plane kills the local ssh with SIGKILL at the deadline, so a hook slower than
 * it gets its channel killed HERE while the commit may keep running THERE. That
 * is what the `timeout` sentence and the Check what happened read are for.
 *
 * Condition 86h of `build/conformance-machines.mjs` reads the local number out
 * of `../git/service.ts` as text and fails when the two disagree, so a later
 * round that changes one has to change both.
 */
export const REMOTE_COMMIT_TIMEOUT_MS = 300_000;

/** The deadline in minutes, for the one sentence that names it. */
export const REMOTE_COMMIT_TIMEOUT_MINUTES = REMOTE_COMMIT_TIMEOUT_MS / 60_000;

/**
 * The most bytes of that machine's own words that may cross back. 8,192.
 *
 * CHOSEN rather than measured, and it is written into the script's `head -c` as
 * well. Condition 86g of `build/conformance-machines.mjs` proves the two agree.
 *
 * THE REASON FOR A CAP AT ALL IS MEASURED. `MAX_BUFFER_BYTES` in
 * `./exec-plane.ts` is 67,108,864, so with no cap on the far side that many
 * bytes of a hook's output could reach a panel. THE REASON FOR THIS NUMBER IS
 * NOT MEASURED, and `build/probe-p104-commit.mjs` reports the byte size a real
 * refusing hook produced so a later round can move it with a number.
 *
 * WHAT IT DOES NOT BOUND. The far side shell holds the hook's whole output in
 * one variable BEFORE the cap is applied. A hook printing 200 MB uses 200 MB of
 * that machine's memory in that variable. This phase does not bound that.
 */
export const REMOTE_COMMIT_ANSWER_MAX_BYTES = 8_192;

// ---------------------------------------------------------------------------
// The pure halves. No connection, no Electron, so the tests read them directly
// ---------------------------------------------------------------------------

/** What one `git-commit` payload said. */
export interface RemoteCommitAnswer {
  /** `moved`, `committed` or `failed`. Nothing else parses. */
  readonly word: 'moved' | 'committed' | 'failed';
  /** What git or a hook printed over there, decoded, or null. */
  readonly said: string | null;
  /** What that machine's HEAD holds now, or the empty string for none. */
  readonly headSha: string;
}

const BASE64_ONLY = /^[A-Za-z0-9+/=]+$/;

/**
 * One payload into its three values, or null. PURE.
 *
 * The script prints THREE fields and always three, being a word, one base64
 * word with `none` for nothing, and a sha with `none` for a repository that has
 * no commit. A different field count is a machine that printed something else,
 * and reading one field out of it would be a guess. That is
 * `parseIndexWriteAnswer`'s rule, reused rather than restated.
 *
 * A word holding a character base64 does not use answers null as well, because
 * `Buffer.from` drops such a character and hands back plausible nonsense.
 */
export function parseCommitAnswer(payload: string): RemoteCommitAnswer | null {
  const parts = payload.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const word = parts[0] ?? '';
  if (word !== 'moved' && word !== 'committed' && word !== 'failed') return null;
  const blob = parts[1] ?? '';
  const sha = parts[2] ?? '';
  let said: string | null = null;
  if (blob !== 'none') {
    if (!BASE64_ONLY.test(blob)) return null;
    const text = Buffer.from(blob, 'base64').toString('utf8').trim();
    said = text.length === 0 ? null : text;
  }
  if (sha !== 'none' && !/^[0-9a-f]{7,64}$/.test(sha)) return null;
  return { word, said, headSha: sha === 'none' ? '' : sha };
}

/**
 * The staged paths of one review answer, sorted. PURE.
 *
 * THE RULE IS `groupRemoteFiles`'s, AND A TEST PROVES THE TWO AGREE. The
 * renderer draws the Staged group with `groupRemoteFiles` in
 * `src/renderer/scm/groups.ts`. Main cannot import that module, because
 * `build/assert-import-boundaries.mjs` forbids `src/main` importing
 * `src/renderer` in production sources. So main writes its own predicate and
 * `__tests__/p104-remote-commit.test.ts` asserts, over a table of XY pairs,
 * that this function's answer equals that function's staged group.
 *
 * Three things have to hold for a row to be staged, and they are that rule:
 *
 *  1. It is not a conflict, using the same four part test `groups.ts` uses. A
 *     conflicted row goes to Changes on a remote tab and to nowhere else.
 *  2. Its index character is neither `?` nor `!`. Such a row reached the wrong
 *     array.
 *  3. Its index character is not `.`, which means the index holds nothing new
 *     for it.
 */
export function stagedPathsOf(files: readonly MachineReviewFile[]): string[] {
  const out: string[] = [];
  for (const file of files) {
    const conflict =
      file.indexState === 'U' ||
      file.worktreeState === 'U' ||
      (file.indexState === 'A' && file.worktreeState === 'A') ||
      (file.indexState === 'D' && file.worktreeState === 'D');
    if (conflict) continue;
    if (file.indexState === '?' || file.indexState === '!') continue;
    if (file.indexState === '.') continue;
    out.push(file.path);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/** True when any row of a fresh read is a conflict, by the same four part test. */
export function holdsConflict(files: readonly MachineReviewFile[]): boolean {
  for (const file of files) {
    if (file.indexState === 'U' || file.worktreeState === 'U') return true;
    if (file.indexState === 'A' && file.worktreeState === 'A') return true;
    if (file.indexState === 'D' && file.worktreeState === 'D') return true;
  }
  return false;
}

/**
 * True when the machine's own words say git there has no identity. PURE.
 *
 * IT IS A MATCH ON THE FAR SIDE'S OWN PROSE, which is exactly what
 * `git-unstage` already does for the six unborn branch phrasings. The four
 * phrasings below are what git actually printed when it was reproduced on
 * 2026-08-21, rather than phrasings anybody assumed.
 *
 * WHAT THE PREMISE GOT WRONG, said rather than hidden. The Phase 104 charter
 * says a machine with no `user.name` or `user.email` fails the commit. Measured
 * with no git configuration at all, git on macOS COMMITTED and guessed a name
 * and an email address from the operating system. It refuses only when it
 * cannot guess, which is `user.useConfigOnly = true` with nothing set, or an
 * empty `user.name`. A commit made under a guessed identity succeeds and this
 * function is never asked about it.
 */
export function identityUnset(said: string | null): boolean {
  if (said === null) return false;
  const text = said.toLowerCase();
  return (
    text.includes('author identity unknown') ||
    text.includes('please tell me who you are') ||
    text.includes('unable to auto-detect email address') ||
    text.includes('empty ident')
  );
}

// ---------------------------------------------------------------------------
// The send counter, so a refusal that sent nothing is measured
// ---------------------------------------------------------------------------

/**
 * How many `git-commit` commands have crossed since the last reset.
 *
 * It exists so a verifier can prove a refusal sent NOTHING, rather than
 * believing a sentence that says so. It is incremented immediately before the
 * one `runRemoteWrite` and never after a refusal. It copies
 * `remoteStageSendCount` in `./remote-stage.ts` and `remoteCloneSendCount` in
 * `./remote-clone.ts`.
 */
let sends = 0;

/** How many `git-commit` commands have crossed. */
export function remoteCommitSendCount(): number {
  return sends;
}

/** Forget the count. Tests and the probes. */
export function resetRemoteCommitSendCountForTests(): void {
  sends = 0;
}

// ---------------------------------------------------------------------------
// The one verb
// ---------------------------------------------------------------------------

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/**
 * Commit what is staged in one repository on one machine.
 *
 * The order below is the design. Steps 1 to 7 all happen before anything is
 * composed and before anything is sent, so every one of their answers means the
 * machine was never asked and the send counter did not move.
 *
 *  1. The message. Empty after trimming, or holding a NUL, answers `refused`.
 *  2. The row, the confirm gate and the confirmed folder, in one call to
 *     `confirmedWriteRoot`. Null answers `refused` with the writes-off
 *     sentence.
 *  3. `rootHolds` over the TAB'S FOLDER. False answers `refused` with the
 *     outside-root sentence, and the machine is not contacted at all.
 *  4. The connection. Not connected answers `offline`.
 *  5. The fresh read. An empty `repoPath` answers `refused` with the
 *     not-a-repository sentence.
 *  6. The sha. A renderer `headSha` that differs from main's own answers
 *     `refused`.
 *  7. The staged set, then the conflicts, then an empty set. Each answers its
 *     own sentence.
 *  8. One `runRemoteWrite`. The send counter moves immediately before it.
 *  9. The answer, parsed. `committed`, `moved`, or `failed` with the machine's
 *     own words. An answer that does not parse answers `unsure`.
 * 10. A throw from the door. Elapsed time at or past the deadline answers
 *     `timeout`, and anything else answers `unsure`. That is
 *     `cloneProjectOnMachine`'s own discrimination, reused rather than
 *     invented, because the door reports a deadline and a dropped link as one
 *     refusal.
 */
export async function commitOnMachine(
  input: MachineCommitInput
): Promise<MachineCommitResult> {
  const from = Date.now();
  let readMs = 0;
  let sent = 0;
  const label = labelOf(input.machineId);
  const answer = (
    outcome: MachineCommitOutcome,
    sentences: readonly string[],
    parts: { sha?: string; headSha?: string; machineSaid?: string | null } = {}
  ): MachineCommitResult => ({
    outcome,
    sha: parts.sha ?? '',
    headSha: parts.headSha ?? '',
    machineSaid: parts.machineSaid ?? null,
    sentences,
    sent,
    readMs,
    tookMs: Date.now() - from
  });

  // 1. The message. It is the only thing on this channel the person wrote, and
  //    it is the one value that reaches `git commit`. A message that is only
  //    spaces would make a commit nobody can read afterwards, and a NUL cannot
  //    survive one argument of a login shell.
  const message = typeof input.message === 'string' ? input.message : '';
  if (message.trim().length === 0 || message.includes('\0')) {
    return answer('refused', [COMMIT_NO_MESSAGE]);
  }

  // 2. The row, the gate and the confirmed folder.
  const ready = confirmedWriteRoot(input.machineId);
  if (ready === null) return answer('refused', [commitWritesOff(label)]);
  const { writeRoot } = ready;

  // 3. The folder this tab is about has to sit under the folder the person
  //    confirmed. BOTH ARE PATHS AS GIVEN, for the reason written in the header
  //    of ./remote-stage.ts: that machine's git resolves every link before it
  //    prints a path and this Mac cannot follow a link on another computer.
  const cwd = typeof input.cwd === 'string' ? input.cwd : '';
  if (!rootHolds(writeRoot, cwd)) {
    return answer('refused', [commitOutsideRoot(label)]);
  }

  // 4. The connection, asked before the read so a machine that is not answering
  //    reads as offline rather than as a read that threw.
  if (!machineIsConnected(input.machineId)) {
    return answer('offline', [commitOffline(label)]);
  }
  let ctx;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return answer('offline', [commitOffline(label)]);
  }

  // 5. The fresh read. THE REPOSITORY ROOT COMES FROM THAT MACHINE'S OWN
  //    rev-parse and never from the caller, and so does the guard sha.
  const readFrom = Date.now();
  let list;
  try {
    list = await reviewFilesOn({ machineId: input.machineId, cwd });
  } catch {
    readMs = Date.now() - readFrom;
    return answer('offline', [commitOffline(label)]);
  }
  readMs = Date.now() - readFrom;
  if (list.repoPath.length === 0) {
    return answer('refused', [commitNotRepo(label)]);
  }

  // 6. The sha the panel drew has to be the sha main just read. A disagreement
  //    means the folder changed while the panel was open, and committing on it
  //    would commit something nobody read.
  const drew = typeof input.headSha === 'string' ? input.headSha : '';
  if (drew !== list.headSha) {
    return answer('refused', [COMMIT_SHA_DISAGREED], {
      headSha: list.headSha
    });
  }

  // 7. The staged set main just read, against the set the panel drew. Then the
  //    conflicts, then an empty set.
  const staged = stagedPathsOf(list.files);
  const asked = Array.isArray(input.staged)
    ? [...input.staged].sort((a, b) => a.localeCompare(b))
    : [];
  const same =
    staged.length === asked.length &&
    staged.every((path, at) => path === asked[at]);
  if (!same) {
    return answer('staged-changed', [commitStagedChanged(label)], {
      headSha: list.headSha
    });
  }
  if (holdsConflict(list.files)) {
    return answer('refused', [commitConflicts(label)], {
      headSha: list.headSha
    });
  }
  if (staged.length === 0) {
    return answer('refused', [commitNothingStaged(label)], {
      headSha: list.headSha
    });
  }

  // 8. The one write. The guard is main's own sha, and the word `none` is what
  //    a repository with no commit sends, so an unborn branch is a state rather
  //    than a special case.
  const guard = list.headSha.length === 0 ? 'none' : list.headSha;
  sends += 1;
  sent = 1;
  let said;
  try {
    const out = await runRemoteWrite(
      ctx,
      'git-commit',
      [list.repoPath, guard, message],
      {
        timeoutMs: REMOTE_COMMIT_TIMEOUT_MS,
        execution: { kind: 'command', subject: list.repoPath }
      }
    );
    said = parseCommitAnswer(out.payload);
  } catch {
    // 10. A deadline and a link that dropped are two different things to a
    //     person, and the door reports both as one refusal. The elapsed time is
    //     what tells them apart, which is what `cloneProjectOnMachine` does.
    if (Date.now() - from >= REMOTE_COMMIT_TIMEOUT_MS) {
      return answer(
        'timeout',
        [commitTimedOut(label, REMOTE_COMMIT_TIMEOUT_MINUTES)],
        { headSha: list.headSha }
      );
    }
    return answer('unsure', [commitUnsure(label)], { headSha: list.headSha });
  }

  // 9. The answer.
  if (said === null) {
    return answer('unsure', [commitUnsure(label)], { headSha: list.headSha });
  }
  if (said.word === 'moved') {
    return answer('moved', [commitHeadMoved(label)], {
      headSha: said.headSha
    });
  }
  if (said.word === 'committed') {
    return answer('committed', [commitDone(label, said.headSha)], {
      sha: said.headSha,
      headSha: said.headSha
    });
  }
  const sentences = [commitFailed(label)];
  if (identityUnset(said.said)) sentences.push(commitIdentityUnset(label));
  return answer('failed', sentences, {
    headSha: said.headSha,
    machineSaid: said.said
  });
}
