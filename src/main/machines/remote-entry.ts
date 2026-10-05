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
 * ## What decides whether anything happens (Phase 336)
 *
 * The rule a save follows, in `./write-folder.ts`: the row is in the machines
 * file, the confirm gate passes, and a legacy `writeRoot` or the deepest open
 * project on that machine holds the path. No field is confirmed by this module
 * and no machine anybody already confirmed is asked to confirm anything again.
 * Until Phase 336 it was the typed `writeRoot` alone, read through one shared
 * function in `./remote-file.ts`, which is gone.
 *
 * ## No root crosses either channel
 *
 * `$1` is ALWAYS the folder main chose from the open project rows or the
 * legacy root, and the folder's pin goes last. Neither input type has a member
 * called `root`, so no folder chosen in the renderer can decide what is
 * written under. That is the shape Phase 101 shipped and this module copies it.
 *
 * ## Containment lives in four places and this is one of them
 *
 * `pickWriteFolder` chooses over path text, and `relativeUnderRoot` resolves
 * both sides and requires the folder plus a separator as a prefix. A RENAME
 * HAS TWO PATHS AND BOTH ARE CHECKED: it is bound by the deepest folder that
 * holds BOTH ends (`pickWriteFolderForPair`), and two ends no one folder holds
 * refuse the whole call. Each script's own guards refuse an absolute or
 * climbing path and a `.git` or `.ssh` segment on the far side, and its folder
 * check compares the folder's device and inode with its pin, so the rule still
 * holds when main is bypassed.
 *
 * WHAT THE TEXT RULES DO NOT COVER, AND WHAT PHASE 242 ADDED BECAUSE OF IT.
 * They compare path TEXT, so none of them can see a symbolic link. Research
 * 102 section 5.2 drove that at the operator's own Mac Pro: a link inside the
 * confirmed folder pointing out of it let `dir-new` make a folder outside it
 * and let `entry-rename` take a file OUT of the folder the person confirmed.
 *
 * So there is a layer that lives where the write does. `noLinkWalk` in
 * `./remote-scripts.ts` asks the shell's own `-L` about every directory
 * component, once per guarded value, in the same call that would otherwise have
 * moved something. It resolves NOTHING, so the objection above still holds and
 * is still the reason main does not try. A rename's LAST component is
 * deliberately still allowed to be a link, because renaming a link is what this
 * script's `[ -e ] || [ -L ]` presence test was written for and `mv` renames
 * the link rather than following it. The word both scripts print is
 * {@link REMOTE_ENTRY_OUTSIDE} and it lands on the `outsideRoot` outcome they
 * already had. Since Phase 336 the folder itself is checked too, by device and
 * inode against its pin, in the same call, and both scripts write through `.`
 * once they have entered it; a different folder answers `folderChanged`.
 *
 * ## A failure is NOT proof that nothing happened
 *
 * `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link while
 * the far side was writing, and the far side finished the write. Only the
 * answer was lost. So both verbs catch and rethrow a sentence that says the
 * machine did not answer and the work may have gone through. Neither ever says
 * nothing was changed. SINCE PHASE 336 a refusal the far side makes is always a
 * word inside the markers, so "may have been made" is no longer said about a
 * name the far side refused (research 138 section 2.5 item 3).
 *
 * ## What this module does not import
 *
 * Nothing from `../manifest/`. `./remote-record.ts` is the one place a remote
 * path meets the manifest, and `./write-folder.ts` reads the open project rows
 * through it.
 */

import type {
  MachineMakeDirInput,
  MachineMakeDirOutcome,
  MachineMakeDirResult,
  MachineRenameInput,
  MachineRenameOutcome,
  MachineRenameResult
} from '@shared/ipc';
import type { MachineRowV1 } from '@shared/machines';
import { gmuxError } from '../errors';
import { remoteNameRefused } from './remote-copy';
import {
  isRemoteFolderWord,
  relativeUnderRoot,
  REMOTE_FOLDER_WORDS,
  type RemoteFolderWord
} from './remote-file';
import { runFolderWrite } from './remote-run';
import { readyRemoteContext } from './ready-context';
import { machineLabelOf } from './store';
import {
  heldFolder,
  namesProtected,
  readyWriteFolder,
  writeFolderFor,
  writeFolderForPair
} from './write-folder';

/**
 * How long one of these two commands gets. 15,000 ms.
 *
 * CHOSEN RATHER THAN MEASURED. It equals `REMOTE_RUN_TIMEOUT_MS`, and research
 * 57 section 9 ruled 15,000 ms for both because neither carries a payload. A
 * save gets 60,000 ms because it carries up to 90,000 bytes of file; these two
 * carry two or three short paths.
 */
export const REMOTE_ENTRY_TIMEOUT_MS = 15_000;

/**
 * The word both scripts print when a directory component of a path they were
 * given is a symbolic link (Phase 242).
 *
 * IT IS NOT AN OUTCOME AND IT NEVER REACHES THE RENDERER. It is mapped onto
 * `outsideRoot`, which is the outcome these two verbs already have and whose
 * sentence already says Tortie may only change what is under that folder and
 * that nothing was changed. That is exactly what happened, so no new word
 * crosses the channel and no new sentence is written.
 *
 * Why the far side has to say it rather than main: main compares path TEXT and
 * cannot see a link on another computer. `noLinkWalk` in `./remote-scripts.ts`
 * has the measurement and the reason this is a refusal rather than the
 * resolution the headers refuse.
 */
export const REMOTE_ENTRY_OUTSIDE = 'outside';

/** The four words `dir-new` prints, plus Phase 242's and Phase 336's refusals. */
export type MakeDirWord =
  | 'made'
  | 'exists'
  | 'denied'
  | 'noparent'
  | 'outside'
  | RemoteFolderWord;

/** The four words `entry-rename` prints, plus Phase 242's and Phase 336's refusals. */
export type RenameWord =
  | 'moved'
  | 'done'
  | 'exists'
  | 'gone'
  | 'outside'
  | RemoteFolderWord;

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

const MAKE_DIR_WORDS = new Set<string>([
  'made',
  'exists',
  'denied',
  'noparent',
  REMOTE_ENTRY_OUTSIDE,
  ...REMOTE_FOLDER_WORDS
]);
const RENAME_WORDS = new Set<string>([
  'moved',
  'done',
  'exists',
  'gone',
  REMOTE_ENTRY_OUTSIDE,
  ...REMOTE_FOLDER_WORDS
]);

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
 *  3. The folder (`writeFolderFor` in `./write-folder.ts`): no open project
 *     holding the path answers `writesOff` with no folder, a never-listed one
 *     answers `writesOff` naming it.
 *  4. A `.git` or `.ssh` path answers `protected`, and a name holding two dots
 *     in a row throws the sentence that says so.
 *  5. The connection, through `readyRemoteContext`, then the folder's pin.
 *  6. One `runFolderWrite`, and the send counter moves immediately before it.
 *  7. The answer, parsed. A word the parser does not know throws.
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

  // 1 to 3. The row, the gate and the folder.
  const choice = writeFolderFor(input.machineId, input.path, 'file');
  const { row, pick } = choice;
  if (!heldFolder(pick)) {
    return answer('writesOff', null, pick.refused === 'never' ? pick.path : null);
  }
  const writeRoot = pick.path;

  // Containment, main's own copy of it.
  const rel = relativeUnderRoot(writeRoot, input.path);
  if (rel === null) return answer('outsideRoot', null, writeRoot);

  // 4. The reserved names, then the one name shape the far side cannot parse.
  if (namesProtected(pick, [rel])) return answer('protected', null, writeRoot);
  refuseTwoDots(row, [rel]);

  // 5. The connection, then the folder's pin (a READ when the row has none).
  const ctx = readyRemoteContext(input.machineId);
  const folder = await readyWriteFolder(ctx, choice, pick);
  if (folder === 'folderChanged') return answer('folderChanged', null, writeRoot);

  // 6. The one write. The folder that crosses is the one main chose, and its
  // pin goes last. Nothing the caller sent decides which folder is written
  // under.
  sends += 1;
  let out;
  try {
    out = await runFolderWrite(ctx, folder, 'dir-new', [folder.path, rel], {
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
      `${machineLabelOf(row)} did not answer while that folder was being made, so it may ` +
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
  // PHASE 242. The far side's own containment refusal, mapped onto the outcome
  // this verb already has. `noLinkWalk` prints it above the `mkdir` and never
  // below it, so nothing was made.
  if (said.word === REMOTE_ENTRY_OUTSIDE) {
    return answer('outsideRoot', null, writeRoot);
  }
  // PHASE 336. The far side's folder check and text guards, every one printed
  // above the `mkdir`, so nothing was made.
  if (isRemoteFolderWord(said.word)) {
    return answer(folderOutcome(row, said.word, rel), null, writeRoot);
  }
  return answer(said.word, said.mode, writeRoot);
}

/**
 * Rename one file or one folder on one machine.
 *
 * The order is {@link makeRemoteDir}'s order, with one difference that matters:
 * the folder is the deepest one holding BOTH ends (`writeFolderForPair`), and
 * two ends no one folder holds refuse the whole call before anything is
 * composed: `outsideRoot` when the source end is in a folder, `writesOff` when
 * it is in none, as each meant before Phase 336.
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

  // 1 to 3. The row, the gate and the folder holding BOTH ends.
  const choice = writeFolderForPair(input.machineId, input.from, input.to);
  const { row, pick, source } = choice;
  if (!heldFolder(pick)) {
    if (pick.refused === 'never') return answer('writesOff', pick.path);
    // No one folder holds both ends. A source end in a folder is a rename out
    // of it, which is what `outsideRoot` has always said; a source end in no
    // folder is a path nobody opened.
    if (heldFolder(source)) return answer('outsideRoot', source.path);
    return answer('writesOff', source.refused === 'never' ? source.path : null);
  }
  const writeRoot = pick.path;

  // Containment, for BOTH paths. Either one outside refuses the whole call.
  const relFrom = relativeUnderRoot(writeRoot, input.from);
  const relTo = relativeUnderRoot(writeRoot, input.to);
  if (relFrom === null || relTo === null) return answer('outsideRoot', writeRoot);

  // 4. The reserved names on both ends, then the one name shape the far side
  // cannot parse.
  if (namesProtected(pick, [relFrom, relTo])) return answer('protected', writeRoot);
  refuseTwoDots(row, [relFrom, relTo]);

  // 5. The connection, then the folder's pin (a READ when the row has none).
  const ctx = readyRemoteContext(input.machineId);
  const folder = await readyWriteFolder(ctx, choice, pick);
  if (folder === 'folderChanged') return answer('folderChanged', writeRoot);

  // 6. The one write.
  sends += 1;
  let out;
  try {
    out = await runFolderWrite(
      ctx,
      folder,
      'entry-rename',
      [folder.path, relFrom, relTo],
      {
        timeoutMs: REMOTE_ENTRY_TIMEOUT_MS,
        execution: { kind: 'command', subject: `${writeRoot}/${relFrom}` }
      }
    );
  } catch (err) {
    throw gmuxError(
      'INVALID_INPUT',
      `${machineLabelOf(row)} did not answer while that was being renamed, so it may have ` +
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
  // PHASE 242. The far side's own containment refusal, mapped onto the outcome
  // this verb already has. `noLinkWalk` prints it above the `mv` and never
  // below it, so nothing was moved.
  if (said.word === REMOTE_ENTRY_OUTSIDE) return answer('outsideRoot', writeRoot);
  // PHASE 336. The far side's folder check and text guards, every one printed
  // above the `mv`, so nothing was moved.
  if (isRemoteFolderWord(said.word)) {
    return answer(folderOutcome(row, said.word, relFrom), writeRoot);
  }
  return answer(said.word, writeRoot);
}

/**
 * The one name shape the far side refuses without a parser (SPEC D12): a part
 * holding two dots in a row, such as `a..b`. Refused here, before anything is
 * composed, with the sentence that says so.
 *
 * @throws GmuxError INVALID_INPUT
 */
function refuseTwoDots(row: MachineRowV1, rels: readonly string[]): void {
  const bad = rels.find((rel) => rel.includes('..'));
  if (bad === undefined) return;
  throw gmuxError(
    'INVALID_INPUT',
    remoteNameRefused(machineLabelOf(row)),
    `${row.id} was asked to write "${bad.slice(0, 120)}", which holds two dots in a row`
  );
}

/**
 * A far-side Phase 336 refusal word onto the outcome these two verbs answer.
 * `notsame` is `folderChanged`, never `outsideRoot`; `offlimits` and `nohome`
 * are `writesOff` naming the folder; `badname` throws the D12 sentence.
 *
 * @throws GmuxError INVALID_INPUT for `badname`
 */
function folderOutcome(
  row: MachineRowV1,
  word: RemoteFolderWord,
  rel: string
): 'folderChanged' | 'writesOff' | 'protected' {
  if (word === 'notsame') return 'folderChanged';
  if (word === 'offlimits' || word === 'nohome') return 'writesOff';
  if (word === 'protected') return 'protected';
  throw gmuxError(
    'INVALID_INPUT',
    remoteNameRefused(machineLabelOf(row)),
    `${row.id} refused the shape of "${rel.slice(0, 120)}" and changed nothing`
  );
}
