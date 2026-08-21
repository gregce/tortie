/**
 * Making a folder and renaming an entry on another machine (Phase 102).
 *
 * ## What this module owns
 *
 * The whole decision about whether either of the two Phase 102 commands leaves
 * this Mac, and the reading of what the machine said afterwards. It is
 * `./remote-file.ts`'s shape, and it is the only production caller of the
 * `dir-new` and `entry-rename` scripts.
 *
 * ## The one field that decides everything, and it is not a new one
 *
 * `writeRoot` on the machine row, which is the sixth confirmed field Phase 101
 * added. PHASE 102 ADDS NO CONFIRMED FIELD. The hash still covers six fields,
 * `APPENDED_KEYS` in `./confirm.ts` is untouched, and no machine anybody
 * already confirmed is asked to confirm anything again.
 *
 * A machine that carries no folder cannot be written to at all, and both verbs
 * answer `writesOff` without composing anything.
 *
 * ## Why this path asks the confirm gate, which no read script channel does
 *
 * The same reason `./remote-file.ts` gives. These two paths read `writeRoot`
 * out of the row on disk AT CALL TIME, and the agreement is the only thing that
 * makes that value a confirmed fact. A row whose file changed after the
 * connection was made would otherwise contain the write with a root nobody
 * agreed to. Both verbs call {@link confirmedWriteRoot}, which is
 * `./remote-file.ts`'s own helper, so there is ONE implementation of that
 * decision rather than three copies of it.
 *
 * ## No root crosses either channel
 *
 * `$1` is ALWAYS the confirmed `writeRoot` read from the row here in main.
 * Neither input type has a member called `root`, so no folder chosen in the
 * renderer can decide what is written under. That is the shape Phase 101
 * shipped and this module copies it exactly.
 *
 * ## Containment lives in three places and this is one of them
 *
 * The schema refuses a root that is not absolute, holds a single quote, holds a
 * `..` segment or ends in a slash. Each script's own `case` lines refuse the
 * same shapes on the far side, plus `.git`, so the rule still holds when main
 * is bypassed. And `relativeUnderRoot` resolves both sides and requires the
 * root plus a separator as a prefix. A RENAME HAS TWO PATHS AND BOTH ARE
 * CHECKED. Either one outside the folder refuses the whole call.
 *
 * WHAT NONE OF THE THREE COVERS. A symlink on that machine is not resolved by
 * any of them and cannot be, because resolving one means a second round trip
 * and a second answer that can be stale by the time the write lands.
 * Containment here is over the path text.
 *
 * ## A failure is NOT proof that nothing happened
 *
 * `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link while
 * the far side was writing, and the far side finished the write. Only the
 * answer was lost. So both verbs catch and rethrow a sentence that says the
 * machine did not answer and the work may have gone through. Neither ever says
 * nothing was changed.
 *
 * ## What this module does not import
 *
 * Nothing from `../manifest/`. `./remote-record.ts` is the one place a remote
 * path meets the manifest and this phase does not widen that.
 */

import type {
  MachineMakeDirInput,
  MachineMakeDirOutcome,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameOutcome,
  MachineRenameResult
} from '@shared/ipc';
import { gmuxError } from '../errors';
import { confirmedWriteRoot, relativeUnderRoot } from './remote-file';
import { runRemoteWrite } from './remote-run';
import { readyRemoteContext } from './remote-sessions';

/**
 * How long one of these two commands gets. 15,000 ms.
 *
 * CHOSEN RATHER THAN MEASURED. It equals `REMOTE_RUN_TIMEOUT_MS`, and research
 * 57 section 9 ruled 15,000 ms for both because neither carries a payload. A
 * save gets 60,000 ms because it carries up to 90,000 bytes of file; these two
 * carry two or three short paths.
 */
export const REMOTE_ENTRY_TIMEOUT_MS = 15_000;

/** The four words `dir-new` prints. */
export type MakeDirWord = 'made' | 'exists' | 'denied' | 'noparent';

/** The four words `entry-rename` prints. */
export type RenameWord = 'moved' | 'done' | 'exists' | 'gone';

/** What the far side printed after it was asked to make one folder. */
export interface RemoteMakeDirAnswer {
  readonly word: MakeDirWord;
  /** The parent's mode as octal digits, or null when that machine said none. */
  readonly mode: string | null;
}

/** What the far side printed after it was asked to rename one entry. */
export interface RemoteRenameAnswer {
  readonly word: RenameWord;
}

const MAKE_DIR_WORDS = new Set<string>(['made', 'exists', 'denied', 'noparent']);
const RENAME_WORDS = new Set<string>(['moved', 'done', 'exists', 'gone']);

/**
 * One `dir-new` payload into its two values, or null. PURE.
 *
 * The script prints TWO fields and always two, with `none` for a field that has
 * no value. A shorter answer is a machine that printed something else, and
 * reading one field out of it would be a guess. That is `parseFilePutAnswer`'s
 * rule and `git-clone`'s shape, reused rather than restated.
 *
 * ONE SHORT ANSWER IS ACCEPTED AND ONLY FOR `made`. A machine that answers with
 * neither `stat` spelling leaves `$m` empty, so the second field is empty and
 * trimming the payload leaves one word. That is a folder that WAS made, on a
 * machine that would not say the mode, and refusing it would report a write
 * that landed as an answer nobody could read.
 */
export function parseMakeDirAnswer(payload: string): RemoteMakeDirAnswer | null {
  const parts = payload.trim().split(/\s+/);
  const word = parts[0] ?? '';
  if (!MAKE_DIR_WORDS.has(word)) return null;
  if (parts.length === 1) {
    return word === 'made'
      ? { word: word as MakeDirWord, mode: null }
      : null;
  }
  if (parts.length !== 2) return null;
  const mode = parts[1] ?? '';
  return {
    word: word as MakeDirWord,
    mode: mode === 'none' || mode.length === 0 ? null : mode
  };
}

/**
 * One `entry-rename` payload into its one value, or null. PURE.
 *
 * Two fields and always two. The second is always `none`, because this script
 * has nothing to report beyond which of the five branches it took, and a fixed
 * field count is the catalogue's rule rather than this script's own.
 */
export function parseRenameAnswer(payload: string): RemoteRenameAnswer | null {
  const parts = payload.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const word = parts[0] ?? '';
  if (!RENAME_WORDS.has(word)) return null;
  return { word: word as RenameWord };
}

/**
 * How many commands the two verbs have sent since the last reset.
 *
 * It exists so a verifier can prove a refusal sent NOTHING, rather than
 * believing a sentence that says so. It is incremented immediately before
 * `runRemoteWrite` and never after a refusal, so a call that answered
 * `writesOff` or `outsideRoot` leaves it where it was. It copies
 * `remoteCloneSendCount` in `./remote-clone.ts`.
 */
let sends = 0;

/** How many `dir-new` and `entry-rename` commands have crossed. */
export function remoteEntrySendCount(): number {
  return sends;
}

/** Forget the count. Tests and the probes. */
export function resetRemoteEntrySendCountForTests(): void {
  sends = 0;
}

/**
 * Make one folder on one machine.
 *
 * The order below is the design. Steps 1 to 5 all happen before anything is
 * composed and before anything is sent, so every one of their answers means the
 * machine was never asked.
 *
 *  1. The row has to be in the machines file, or this throws.
 *  2. The confirm gate.
 *  3. A machine with no confirmed folder answers `writesOff`.
 *  4. A path outside the confirmed folder answers `outsideRoot`.
 *  5. The connection, through `readyRemoteContext`.
 *  6. One `runRemoteWrite`, and the send counter moves immediately before it.
 *  7. The answer, parsed. A word the parser does not know throws.
 *
 * Steps 1 to 3 are one call to {@link confirmedWriteRoot}.
 */
export async function makeRemoteDir(
  input: MachineMakeDirInput
): Promise<MachineMakeDirResult> {
  const from = Date.now();
  const answer = (
    outcome: MachineMakeDirOutcome,
    mode: string | null,
    writeRoot: string | null
  ): MachineMakeDirResult => ({
    outcome,
    mode,
    writeRoot,
    tookMs: Date.now() - from
  });

  // 1 to 3. The row, the gate and the confirmed folder.
  const ready = confirmedWriteRoot(input.machineId);
  if (ready === null) return answer('writesOff', null, null);
  const { row, writeRoot } = ready;

  // 4. Containment, main's own copy of it.
  const rel = relativeUnderRoot(writeRoot, input.path);
  if (rel === null) return answer('outsideRoot', null, writeRoot);

  // 5. The connection.
  const ctx = readyRemoteContext(input.machineId);

  // 6. The one write. The root that crosses is the CONFIRMED one, read from the
  // row above. Nothing the caller sent decides which folder is written under.
  sends += 1;
  let out;
  try {
    out = await runRemoteWrite(ctx, 'dir-new', [writeRoot, rel], {
      timeoutMs: REMOTE_ENTRY_TIMEOUT_MS,
      execution: { kind: 'command', subject: `${writeRoot}/${rel}` }
    });
  } catch (err) {
    // A failure here is not proof that nothing happened. Phase 101 measured a
    // killed ssh completing the far side write, so this sentence says the true
    // thing, which is that nobody can tell. It must never say nothing was
    // changed. It is kept under 160 characters so the renderer shows it rather
    // than falling back to its own wording.
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not answer while that folder was being made, so it may ` +
        `have been made there. Press Refresh to read that folder again.`,
      String((err as Error).message ?? err)
    );
  }

  // 7. The answer.
  const said = parseMakeDirAnswer(out.payload);
  if (said === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not say what it did, so Tortie cannot tell you whether ` +
        `that folder was made. Press Refresh to read that folder again.`,
      `${row.id} answered "dir-new" with ${JSON.stringify(
        out.payload.slice(0, 120)
      )}`
    );
  }
  return answer(said.word, said.mode, writeRoot);
}

/**
 * Rename one file or one folder on one machine.
 *
 * The order is {@link makeRemoteDir}'s order, with one difference that matters:
 * BOTH paths are checked against the confirmed folder and either one outside it
 * refuses the whole call, before anything is composed.
 *
 * ## What the answers mean, and what one of them cannot tell apart
 *
 * `moved` is this call having moved the entry. `done` is the machine already
 * holding the end state the person asked for, which is what a repeat after a
 * lost answer looks like. It cannot be told apart from a machine where somebody
 * else already held a file at the destination while the source never existed,
 * and this product does not pretend to tell them apart. `exists` and `gone`
 * both mean nothing was moved.
 *
 * ## The race, which no gate can read
 *
 * Between the far side's test on the destination and its `mv`, another writer
 * on that machine can create the destination, and the `mv` then replaces it.
 * There is no command in a POSIX shell that renames and refuses an existing
 * destination in one step. Whether `mv -n` narrows the window is measured by
 * nobody and no number for it exists in this repository.
 *
 * ## `kind` is echoed back and it is not decoration
 *
 * The tab follower does prefix arithmetic for descendants only when the move is
 * a folder, so a folder rename reported as a file leaves every open tab beneath
 * it pointing at a path that is no longer on that machine.
 *
 * WHAT ECHOED MEANS, and it is not a check. This function copies `input.kind`
 * into the answer without asking the machine anything. `entry-rename` reports
 * no kind and nothing here runs a second command to measure one. The renderer
 * reads the value off the tree row it renamed, so the answer's kind is as fresh
 * as that row and no fresher. Do not read this section as a claim that the
 * machine confirmed the kind, because it did not.
 */
export async function renameRemoteEntry(
  input: MachineRenameInput
): Promise<MachineRenameResult> {
  const from = Date.now();
  const answer = (
    outcome: MachineRenameOutcome,
    writeRoot: string | null
  ): MachineRenameResult => ({
    outcome,
    from: input.from,
    to: input.to,
    kind: input.kind,
    writeRoot,
    tookMs: Date.now() - from
  });

  // 1 to 3. The row, the gate and the confirmed folder.
  const ready = confirmedWriteRoot(input.machineId);
  if (ready === null) return answer('writesOff', null);
  const { row, writeRoot } = ready;

  // 4. Containment, for BOTH paths. Either one outside refuses the whole call.
  const relFrom = relativeUnderRoot(writeRoot, input.from);
  const relTo = relativeUnderRoot(writeRoot, input.to);
  if (relFrom === null || relTo === null) return answer('outsideRoot', writeRoot);

  // 5. The connection.
  const ctx = readyRemoteContext(input.machineId);

  // 6. The one write.
  sends += 1;
  let out;
  try {
    out = await runRemoteWrite(ctx, 'entry-rename', [writeRoot, relFrom, relTo], {
      timeoutMs: REMOTE_ENTRY_TIMEOUT_MS,
      execution: { kind: 'command', subject: `${writeRoot}/${relFrom}` }
    });
  } catch (err) {
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not answer while that was being renamed, so it may have ` +
        `been renamed there. Press Refresh to read that folder again.`,
      String((err as Error).message ?? err)
    );
  }

  // 7. The answer.
  const said = parseRenameAnswer(out.payload);
  if (said === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not say what it did, so Tortie cannot tell you whether ` +
        `that was renamed. Press Refresh to read that folder again.`,
      `${row.id} answered "entry-rename" with ${JSON.stringify(
        out.payload.slice(0, 120)
      )}`
    );
  }
  return answer(said.word, writeRoot);
}
