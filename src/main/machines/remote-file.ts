/**
 * Saving one file on another machine (Phase 101).
 *
 * ## What this module owns
 *
 * The whole decision about whether a byte leaves this Mac for one file, and the
 * reading of what the machine said afterwards. It is `./remote-image.ts`'s
 * shape, and it is the only production caller of the `file-put` script.
 *
 * ## What decides whether a byte lands (Phase 336)
 *
 * Until Phase 336 it was `writeRoot` on the machine row, a typed folder a
 * person confirmed on a sheet in Settings, and a machine carrying none could
 * not be saved to at all. His ruling ended that (research 138 section 9): a
 * file inside a project open on a CONFIRMED machine saves, as one on this Mac
 * does, with nothing asked. `writeFolderFor` and `readyWriteFolder` in
 * `./write-folder.ts` make that decision, in this order: the row is in the
 * machines file, the confirm gate passes, and a legacy `writeRoot` that holds
 * the file or else the deepest open project that holds it is the folder. A row
 * that still carries a `writeRoot` keeps saving under it as before.
 *
 * ## Why this path asks the confirm gate, which no read script channel does
 *
 * No READ script channel calls `assertMachineMayConnect`, and `./ipc.ts` says
 * so in four places. Every folder-bound write asks it, through
 * `./write-folder.ts`, because the decision reads the machine row: a row whose
 * file changed after the connection was made must write nothing until it is
 * confirmed again. The gate reads the IN-MEMORY SNAPSHOT of the machines file,
 * which the store's watcher refreshes about 300 ms after the file changes
 * (`./store.ts`); this comment used to say "the row on disk at call time",
 * which research 138 section 7.1 found was not true. It is asked first, then
 * `readyRemoteContext`. The connected-only check and the generation check come
 * from the door, which every caller gets, rather than from a copy held here.
 *
 * ## Containment lives in several places and this is one of them
 *
 * `pickWriteFolder` chooses the folder over path text, and
 * {@link relativeUnderRoot} below resolves both paths and requires the file's
 * resolved path to start with the folder PLUS a separator. Without the
 * separator a folder of `/Users/gdc` would contain `/Users/gdcx`. The script's
 * own guards refuse an absolute or climbing relative path and a `.git` or
 * `.ssh` segment on the far side, so the rule holds when main is bypassed.
 *
 * WHAT THE TEXT RULES DO NOT COVER, AND WHAT PHASE 242 ADDED BECAUSE OF IT.
 * None of them can see a symbolic link, because all compare path TEXT and a
 * link on another computer cannot be followed from this one. That was a hole
 * rather than a limit, and it was measured rather than argued: research 102
 * section 5.2 drove it at the operator's own Mac Pro and a link inside the
 * confirmed folder pointing out of it carried a save, a folder and a rename
 * straight through, one of them REPLACING a file outside the folder and
 * answering `wrote` with this root named beside it.
 *
 * So there is a FOURTH layer and it lives where the write does. `noLinkWalk` in
 * `./remote-scripts.ts` asks the shell's own `-L` about every directory
 * component of the relative path, plus this verb's last component and its
 * staged name, in the same call that would otherwise have written. It resolves
 * NOTHING — no `readlink`, no `realpath`, no second round trip — so the
 * objection above still holds and is still the reason main does not try. The
 * word it prints is {@link REMOTE_FILE_PUT_OUTSIDE} and it lands on the
 * `outsideRoot` outcome this module already had.
 *
 * AND PHASE 336 ADDED THE FOLDER ITSELF. The walk starts below the folder, so
 * it never asked whether the FOLDER had been swapped for a link (research 138
 * section 2.5 item 1). The far side's `folderCheck` now enters the folder once
 * with `cd -P`, compares its device and inode with the pin taken when the
 * project was opened, and writes through `.` from then on, in the same call;
 * a different folder answers `folderChanged`, and the home and reserved-folder
 * rules are judged there by identity too.
 *
 * ## No sixth kind of remote work is declared
 *
 * The five kinds in `../manifest/remote-executions.ts` are a durable enum and
 * one of them is journaled. A save is a bounded 60,000 ms write, so it rides
 * the Phase 118 ledger as `command`, which is what every other login shell read
 * already is, with the remote path as its subject so a person can read what the
 * work was.
 */

import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import {
  REMOTE_FILE_MAX_BYTES,
  type MachineFilePutInput,
  type MachineFilePutOutcome,
  type MachineFilePutResult
} from '@shared/ipc';
import { gmuxError } from '../errors';
import { readyRemoteContext } from './ready-context';
import { remoteNameRefused } from './remote-copy';
import { runFolderWrite } from './remote-run';
import { machineLabelOf } from './store';
import {
  heldFolder,
  namesProtected,
  readyWriteFolder,
  writeFolderFor
} from './write-folder';

export { REMOTE_FILE_MAX_BYTES };

/**
 * How long one save gets. 60,000 ms.
 *
 * It matches `REMOTE_IMAGE_TIMEOUT_MS` for a payload of the same size, because
 * the two carry the same number of bytes over the same link. Far side compute
 * for a 90,000 byte decode plus two checksum runs was 0.03 s to 0.05 s across
 * five runs on this Mac, so nearly all of this budget is the link rather than
 * the machine.
 */
export const REMOTE_FILE_PUT_TIMEOUT_MS = 60_000;

/** The word `$3` carries when the caller is making a file that is not there. */
export const REMOTE_FILE_PUT_NEW = 'new';

/**
 * The word the script prints when the bytes are already in place and it cannot
 * describe them, and the one word from that script this module deliberately
 * does not know.
 *
 * It fires only when the checksum program answered for `/dev/null` before
 * either arm and then said nothing about the file it had just written. Every
 * other word the script prints is decided before it writes.
 *
 * IT IS NOT AN OUTCOME AND IT MUST NEVER BECOME ONE. An outcome is something a
 * person is told happened, and this is the case where nobody can say. So
 * {@link parseFilePutAnswer} answers null for it, like any word it does not
 * know, and {@link putFileOnMachine} throws the sentence that says Tortie
 * cannot tell whether the file was saved. Adding it to {@link WORDS} would put
 * it through {@link refused}, and every sentence there ends "Nothing was
 * written", which would be the exact false claim the first fix round of this
 * phase removed from the script.
 */
export const REMOTE_FILE_PUT_UNSURE = 'unsure';

/**
 * The word the script prints when a component of the path it was given is a
 * symbolic link (Phase 242).
 *
 * IT IS NOT AN OUTCOME AND IT NEVER REACHES THE RENDERER. It is mapped onto
 * `outsideRoot`, the outcome this verb already has, whose sentence already
 * says Tortie may only save under that folder and that nothing was written.
 * That is exactly what happened, so no new word crosses the channel and no new
 * sentence is written. It is unlike {@link REMOTE_FILE_PUT_UNSURE} in the one
 * way that matters: `noLinkWalk` in `./remote-scripts.ts` prints this above
 * every line that writes and never below one, so "Nothing was written" is true.
 *
 * Why the far side has to say it: main compares path TEXT, and a link on
 * another computer cannot be seen from this one. The measurement, and why this
 * is a refusal rather than the resolution this file's header refuses, is in
 * `noLinkWalk`'s own comment.
 */
export const REMOTE_FILE_PUT_OUTSIDE = 'outside';

/**
 * The words the far side's folder check and text guards print (Phase 336),
 * each above every line that writes, so each means nothing was written.
 *
 * `notsame`: the folder is not the one that was pinned. `offlimits`: it is `/`,
 * the account's home, directly inside it, or holds it. `nohome`: the account's
 * home could not be read. `protected`: a `.git` or `.ssh` folder. `badname`:
 * a path shape the far side refuses without a parser (a name holding `..`).
 */
export const REMOTE_FOLDER_WORDS = [
  'notsame',
  'offlimits',
  'nohome',
  'protected',
  'badname'
] as const;

/** One of {@link REMOTE_FOLDER_WORDS}. */
export type RemoteFolderWord = (typeof REMOTE_FOLDER_WORDS)[number];

/** True for one of {@link REMOTE_FOLDER_WORDS}. PURE. */
export function isRemoteFolderWord(word: string): word is RemoteFolderWord {
  return (REMOTE_FOLDER_WORDS as readonly string[]).includes(word);
}

/** What the far side printed after it was asked to save one file. */
export interface RemoteFilePutAnswer {
  /** One of the twelve words the script prints, `unsure` excepted. */
  readonly word:
    | 'wrote'
    | 'stale'
    | 'missing'
    | 'exists'
    | 'nomode'
    | 'nosum'
    | 'outside'
    | RemoteFolderWord;
  /** The checksum the machine reported, or null when it reported none. */
  readonly sha256: string | null;
  /** The size the machine reported, or null when it reported none. */
  readonly bytes: number | null;
}

const WORDS = new Set<string>([
  'wrote',
  'stale',
  'missing',
  'exists',
  'nomode',
  'nosum',
  REMOTE_FILE_PUT_OUTSIDE,
  ...REMOTE_FOLDER_WORDS
]);

/**
 * One `file-put` payload into its three values, or null. PURE.
 *
 * The script prints THREE fields and always three, with `none` for a field that
 * has no value. A shorter answer is a machine that printed something else, and
 * reading two of three fields out of it would be a guess. That is
 * `parseImagePutAnswer`'s rule and `git-clone`'s shape, reused rather than
 * restated.
 */
export function parseFilePutAnswer(payload: string): RemoteFilePutAnswer | null {
  const parts = payload.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const word = parts[0] ?? '';
  if (!WORDS.has(word)) return null;
  const sum = parts[1] ?? '';
  const size = parts[2] ?? '';
  const bytes = size === 'none' ? null : Number(size);
  if (bytes !== null && (!Number.isInteger(bytes) || bytes < 0)) return null;
  return {
    word: word as RemoteFilePutAnswer['word'],
    sha256: sum === 'none' || sum.length === 0 ? null : sum,
    bytes
  };
}

/**
 * The file's path relative to the folder, or null when it is not under it.
 * PURE.
 *
 * `relativeInFolder(root, path, 'file')` in src/shared/remote-write-folder.ts
 * is the same rule without a `node:` import, for the renderer; condition 113 of
 * `build/conformance-machines.mjs` drives the two over one corpus and requires
 * them to agree.
 *
 * Both sides are resolved first, so `/Users/gdc/./code/x.ts` and
 * `/Users/gdc/code/x.ts` are one path. The separator is part of the comparison,
 * so `/Users/gdcx/x.ts` is not under `/Users/gdc`. A path equal to the root
 * itself is not under it either, because a root is a folder and a folder is not
 * a file this door may replace.
 */
export function relativeUnderRoot(root: string, path: string): string | null {
  if (root.length === 0 || !root.startsWith('/')) return null;
  if (path.length === 0 || !path.startsWith('/')) return null;
  const base = posix.resolve(root);
  const full = posix.resolve(path);
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (!full.startsWith(prefix)) return null;
  const rel = full.slice(prefix.length);
  return rel.length === 0 ? null : rel;
}

/** A result with nothing sent and nothing written. */
function refused(
  outcome: MachineFilePutOutcome,
  writeRoot: string | null,
  bytes: number | null = null
): MachineFilePutResult {
  return { outcome, sha256: null, bytes, writeRoot };
}

/**
 * Save one file on one machine.
 *
 * The order below is the design (build/p336/SPEC.md D14). Steps 1 to 5 all
 * happen before anything is composed and before anything is sent, so every one
 * of their answers means the machine was never asked.
 *
 *  1. The row has to be in the machines file.
 *  2. The confirm gate, for the reason in this file's header.
 *  3. The folder, by `writeFolderFor`: a file no open project holds answers
 *     `writesOff` with no folder, and one only a never-listed project holds
 *     (`/`, a home, a folder directly inside or holding one) answers
 *     `writesOff` naming that folder.
 *  4. A `.git` or `.ssh` path answers `protected`.
 *  5. A file over {@link REMOTE_FILE_MAX_BYTES} answers `tooLarge`, and a name
 *     holding two dots in a row throws the sentence that says so.
 *  6. The connection, through `readyRemoteContext`.
 *  7. The folder's pin, by `readyWriteFolder`: stored, or one READ.
 *  8. The one write, through `runFolderWrite`, which appends the pin.
 *  9. The answer, with the `stale` rule below applied to it. `notsame` is
 *     `folderChanged`, `offlimits` and `nohome` are `writesOff` naming the
 *     folder, `protected` is `protected`, and `badname` throws.
 *
 * ## A link that drops during step 7 is NOT a failed save
 *
 * `build/probe-p101-save.mjs` leg 14 killed a real ssh over a real link while
 * the far side was decoding an 89,000 byte payload. The far side shell carried
 * on and replaced the file in full. Only the answer was lost. So step 7's own
 * catch rethrows a sentence that says the file may have been saved, rather than
 * any of the refusals, all of which end "Nothing was written."
 *
 * ## The `stale` rule, which is what makes a save safe to run twice
 *
 * A link can drop after the far side has written and before its answer arrives.
 * A second attempt then finds the file already carrying the checksum of the
 * payload, so the machine answers `stale` with that checksum. That is the write
 * having landed and only the answer having been lost, so it is reported as a
 * success rather than as a refusal. Any other reported checksum is somebody
 * else's change and it is the refusal.
 */
export async function putFileOnMachine(
  input: MachineFilePutInput
): Promise<MachineFilePutResult> {
  // 1 to 3. The row, the confirm gate and the folder, in one call.
  const choice = writeFolderFor(input.machineId, input.path, 'file');
  const { row, pick } = choice;
  if (!heldFolder(pick)) {
    return refused('writesOff', pick.refused === 'never' ? pick.path : null);
  }
  const writeRoot = pick.path;

  // Main's own copy of the containment, over the two texts the pick compared.
  const rel = relativeUnderRoot(writeRoot, input.path);
  if (rel === null) return refused('outsideRoot', writeRoot);

  // 4. The reserved names, in any case and any spelling the volume folds.
  if (namesProtected(pick, [rel])) return refused('protected', writeRoot);

  // 5. The size, before anything is encoded, then the one name shape the far
  // side refuses without a parser.
  const payloadBytes = Buffer.from(input.contents, 'utf8');
  if (payloadBytes.byteLength > REMOTE_FILE_MAX_BYTES) {
    return refused('tooLarge', writeRoot, payloadBytes.byteLength);
  }
  if (rel.includes('..')) {
    throw gmuxError(
      'INVALID_INPUT',
      remoteNameRefused(machineLabelOf(row)),
      `${row.id} was asked to save "${rel.slice(0, 120)}", which holds two dots in a row`
    );
  }

  // 6. The connection.
  const ctx = readyRemoteContext(input.machineId);

  // 7. The folder's pin. A READ when the row has none, and nothing else.
  const folder = await readyWriteFolder(ctx, choice, pick);
  if (folder === 'folderChanged') return refused('folderChanged', writeRoot);

  // 8. The one write. The folder that crosses is the one main chose, from the
  // open project rows or the legacy root, and its pin goes last. Nothing the
  // caller sent decides which folder is written under.
  const expect =
    input.expect === REMOTE_FILE_PUT_NEW ? REMOTE_FILE_PUT_NEW : input.expect;
  let answer;
  try {
    answer = await runFolderWrite(
      ctx,
      folder,
      'file-put',
      [folder.path, rel, expect, payloadBytes.toString('base64')],
      {
        timeoutMs: REMOTE_FILE_PUT_TIMEOUT_MS,
        execution: { kind: 'command', subject: `${writeRoot}/${rel}` }
      }
    );
  } catch (err) {
    // MEASURED on 2026-08-21 by `build/probe-p101-save.mjs` leg 14, which is
    // the evidence item research 57 section 10 left open. A real ssh was killed
    // over a real link while the far side was decoding an 89,000 byte payload.
    // THE FAR SIDE SHELL DID NOT STOP. The file was replaced in full, no
    // temporary file was left, and the only thing lost was the answer. The
    // local call failed with the ssh error.
    //
    // So nothing on this path may tell a person the file was not saved. The
    // sentence below says the true thing, which is that nobody can tell, and it
    // is kept under 160 characters so the renderer shows it rather than falling
    // back to its own wording.
    throw gmuxError(
      'INVALID_INPUT',
      `${machineLabelOf(row)} did not answer while this file was being saved, so it may ` +
        `have been saved there. Open it again to read what it says now.`,
      String((err as Error).message ?? err)
    );
  }

  // 9. The answer.
  // A word this module does not know, which includes REMOTE_FILE_PUT_UNSURE.
  // The sentence below is the only true thing to say about it, and it is
  // deliberately not one of the refusals: it does not claim nothing was
  // written, because on the `unsure` word something was.
  const said = parseFilePutAnswer(answer.payload);
  if (said === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `${row.id} did not say what it did with this file, so Tortie cannot tell ` +
        `you whether it was saved. Open it again to read what it says now.`,
      `${row.id} answered "file-put" with ${JSON.stringify(
        answer.payload.slice(0, 120)
      )}`
    );
  }
  const sent = createHash('sha256').update(payloadBytes).digest('hex');
  if (said.word === 'wrote') {
    return {
      outcome: 'wrote',
      sha256: said.sha256,
      bytes: said.bytes,
      writeRoot
    };
  }
  if (said.word === 'stale' && said.sha256 !== null && said.sha256 === sent) {
    // The write landed and only the answer was lost. This is the property that
    // makes a save safe to run twice.
    return {
      outcome: 'wrote',
      sha256: said.sha256,
      bytes: payloadBytes.byteLength,
      writeRoot
    };
  }
  // PHASE 242. The far side's own containment refusal, mapped onto the outcome
  // this verb already has, so the sentence a person reads is the one that was
  // already right for a path outside the confirmed folder.
  if (said.word === REMOTE_FILE_PUT_OUTSIDE) {
    return refused('outsideRoot', writeRoot);
  }
  // PHASE 336. The far side's folder check and text guards, every one printed
  // above every line that writes.
  if (isRemoteFolderWord(said.word)) {
    if (said.word === 'notsame') return refused('folderChanged', writeRoot);
    if (said.word === 'protected') return refused('protected', writeRoot);
    if (said.word === 'badname') {
      throw gmuxError(
        'INVALID_INPUT',
        remoteNameRefused(machineLabelOf(row)),
        `${row.id} refused the shape of "${rel.slice(0, 120)}" and wrote nothing`
      );
    }
    return refused('writesOff', writeRoot);
  }
  return refused(said.word, writeRoot);
}
