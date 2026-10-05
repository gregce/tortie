/**
 * What the editor says about a file on another machine, and every refusal it
 * draws when a save cannot happen there (Phase 101).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import type { MachineFilePutOutcome } from '@shared/ipc';
import type { RemoteWriteRefusal } from '../state/machines-slice';

// -- the editor --------------------------------------------------------------

/**
 * The band under a tab holding a file on another machine that Tortie will not
 * save, one sentence per reason (Phase 336).
 *
 * PHASE 336 REPLACED `remoteFileChip`, which said Tortie cannot save the file
 * until a person lets it save on that machine, and named Settings as the way.
 * Nothing is granted any more. A project open on a confirmed machine is a
 * folder Tortie may write under, the way a project open on this Mac is, so a
 * tab inside one draws NO band at all and behaves like a tab on this Mac. A
 * band is drawn only for a file Tortie will not save, and it says why in the
 * person's terms: the file is outside the projects opened there, the folder is
 * one Tortie never writes in, the file is too large to save there, or the
 * machine is not confirmed right now. None of them sends anybody to Settings.
 */

/** A file outside every project opened on that machine. */
export function remoteFileOutsideChip(label: string): string {
  return (
    `This file is on ${label}, outside the projects you opened there, so ` +
    `Tortie only shows it.`
  );
}

/**
 * The folders Tortie never writes in on another machine.
 *
 * It is the band, the label and, with "Nothing was written." or "Nothing was
 * changed." after it, the refusal, so the rule is stated in one place.
 * His ruling of 5 October 2026 (Phase 336.1, "Yes, fix it now") keeps a home
 * folder ITSELF off the list of folders Tortie writes under, and a folder
 * HOLDING a home (`/`, `/Users`, `/home`) is the same rule from above. A
 * folder directly inside a home, such as `~/dev`, is written like any other
 * opened project, which is why the line names the PROJECT that is or holds
 * a home rather than every folder in one.
 */
export function remoteNeverFolderLine(label: string): string {
  return (
    `Tortie does not save in a project that is a home folder or holds one, ` +
    `or in a .git or .ssh folder, on ${label}.`
  );
}

/**
 * The machine is not confirmed right now, which includes a machine whose
 * details changed after it was confirmed. Nothing is written there until it
 * is confirmed again, and the project tab already offers that.
 */
export function remoteFileUnconfirmedChip(label: string): string {
  return (
    `This file is on ${label}, which is not confirmed right now, so Tortie ` +
    `only shows it.`
  );
}

/**
 * A file larger than Tortie can save on that machine, opened read only.
 *
 * PHASE 336 OPENS IT. Phase 101 refused the open on a machine with saving on,
 * because a tab that could never be saved was worse than a refusal. Research
 * 138's ruling is that a file is never refused for OPENING because of the save
 * cap, so it opens and this band says why typing changes nothing.
 */
export function remoteSaveCapChip(bytes: number, label: string): string {
  return (
    `That file is ${bytes.toLocaleString()} bytes and Tortie saves files up ` +
    `to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ${label}, so it ` +
    `is shown read only.`
  );
}

/**
 * The same band when the read itself was cut, so the size is a floor and the
 * sentence says over rather than printing the floor as the size.
 */
export function remoteSaveCapChipOver(floor: number, label: string): string {
  return (
    `That file is over ${floor.toLocaleString()} bytes and Tortie saves ` +
    `files up to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ` +
    `${label}, so it is shown read only.`
  );
}

/** The band for one refusal. */
export function remoteFileRefusedChip(
  reason: RemoteWriteRefusal,
  label: string
): string {
  switch (reason) {
    case 'unconfirmed':
      return remoteFileUnconfirmedChip(label);
    case 'outside':
      return remoteFileOutsideChip(label);
    case 'never':
      return remoteNeverFolderLine(label);
  }
}

/**
 * The file is outside every project opened on that machine, said after a save
 * main or this renderer refused before anything was sent.
 */
export function remoteSaveOutsideProjects(label: string): string {
  return (
    `Tortie saves on ${label} only inside a project you opened there. ` +
    `Nothing was written.`
  );
}

/** The never-list, said after a save was refused. */
export function remoteSaveNever(label: string): string {
  return `${remoteNeverFolderLine(label)} Nothing was written.`;
}

/** The machine is not confirmed right now, said after a save was refused. */
export function remoteSaveUnconfirmed(label: string): string {
  return (
    `Tortie does not save on ${label} until that machine is confirmed. ` +
    `Nothing was written.`
  );
}

/**
 * The folder at that path on that machine is not the folder that was opened.
 *
 * Main compares the folder's identity on that machine, in the same call as the
 * write, against the identity it read when the project was opened. A folder
 * swapped for a link, or deleted and made again, is a different folder, and
 * Tortie writes nothing until the person opens it again, which is how it
 * learns the new one. It never names a moved or outside folder, because the
 * folder did not move and the file is not outside it.
 */
export function remoteSaveFolderChanged(
  folder: string | null,
  label: string
): string {
  return (
    `${folder ?? 'That folder'} on ${label} is not the folder you opened any ` +
    `more, so Tortie wrote nothing. Open it again to save there.`
  );
}

/**
 * The path names a `.git` or `.ssh` folder, in any case and in every spelling
 * the volume folds to one. Local's own refusal is "Tortie does not touch the
 * .git folder."
 */
export function remoteSaveProtected(label: string): string {
  return (
    `Tortie does not touch .git or .ssh folders on ${label}. Nothing was ` +
    `written.`
  );
}

/** The sentence for a save this renderer refused before anything was sent. */
export function remoteSaveRefusedFor(
  reason: RemoteWriteRefusal,
  label: string
): string {
  switch (reason) {
    case 'unconfirmed':
      return remoteSaveUnconfirmed(label);
    case 'outside':
      return remoteSaveOutsideProjects(label);
    case 'never':
      return remoteSaveNever(label);
  }
}

/**
 * The file is not under the folder this write was bound by.
 *
 * PHASE 336. The folder is the open project that holds the file, or a folder a
 * person typed in an earlier build. The word reaches here when that machine
 * found the path leads out of the folder through a link, and nothing was
 * written. The sentence names the folder, because it is the fact that decided.
 */
export function remoteSaveOutsideRoot(root: string, label: string): string {
  return (
    `Tortie may only save under ${root} on ${label}, and this file is ` +
    `outside that folder. Nothing was written.`
  );
}

/**
 * The file's contents on that machine are not the contents Tortie read.
 *
 * This is the answer that makes the whole write safe, so its sentence says
 * three things. Nothing was written. Why. And what to do, which is to open the
 * file again, because the copy on screen is no longer a copy of anything.
 */
export function remoteSaveStale(label: string): string {
  return (
    `Tortie did not save this file, because it changed on ${label} after ` +
    `Tortie read it. Nothing was written. Open it again to read what it ` +
    `says now.`
  );
}

/** The file Tortie read is no longer on that machine. */
export function remoteSaveMissing(label: string): string {
  return (
    `Tortie did not save this file, because it is no longer on ${label}. ` +
    `Nothing was written.`
  );
}

/**
 * A new file was asked for and something of that name is already there.
 *
 * It names the folder as well as the machine, because New File lands in the
 * folder the tree is showing and a person reading this needs to know which one
 * that is.
 */
export function remoteCreateExists(
  root: string | null,
  label: string
): string {
  return (
    `Tortie did not make that file, because a file of that name is already ` +
    `on ${label}${root === null ? '' : ` under ${root}`}. Nothing was written.`
  );
}

/**
 * Neither spelling of the program that reports a file's permissions answered.
 *
 * Tortie writes a new file and moves it into place, so it has to put the old
 * file's permissions back by hand. A machine that will not report them leaves
 * Tortie with a choice between guessing and refusing, and it refuses.
 */
export function remoteSaveNoMode(label: string): string {
  return (
    `Tortie did not save this file, because it could not read the file's ` +
    `permissions on ${label} and will not write it with permissions nobody ` +
    `chose. Nothing was written.`
  );
}

/**
 * The link dropped while a save was in flight, and nobody can say what landed.
 *
 * THIS SENTENCE EXISTS BECAUSE OF A MEASUREMENT. `build/probe-p101-save.mjs`
 * leg 14 killed a real ssh over a real link while the far side was decoding an
 * 89,000 byte payload. The far side shell carried on and replaced the file in
 * full, and the only thing lost was the answer. Every other sentence about a
 * save ends "Nothing was written." and this one may never say that.
 *
 * It is the fallback the editor uses when the error carries no sentence a
 * person can read. Main's own sentence for the same case is shorter than 160
 * characters on purpose, so it is shown instead of this one whenever it exists.
 */
export function remoteSaveLostAnswer(label: string): string {
  return (
    `Tortie did not get an answer from ${label} about this file. A machine ` +
    `finishes a command it has already started, so the file may have been ` +
    `saved there. Open it again to read what it says now.`
  );
}

/**
 * Tortie could not get a checksum out of that machine.
 *
 * THREE THINGS PRODUCE THIS WORD AND THE SENTENCE COVERS ALL THREE, which is
 * why it does not say "has no program". The machine has neither `shasum` nor
 * `sha256sum`. Or it has one that answers nothing. Or it has one that answers
 * about other files and said nothing about this one.
 *
 * All three are decided before anything is written, and the fix round of Phase
 * 101 is what made that true: the script used to run the program for the first
 * time AFTER the write. Tortie does not fall back to comparing sizes, because
 * two different files of the same size compare equal and the whole promise is
 * that the contents match.
 */
export function remoteSaveNoSum(label: string): string {
  return (
    `Tortie did not save this file, because it could not get a checksum from ` +
    `${label}, and Tortie replaces a file only after it has checked the ` +
    `file's contents. Nothing was written.`
  );
}

/**
 * The file is over the cap, measured on this Mac before anything is sent.
 *
 * Both numbers are real. The first is what this file measures right now and the
 * second is the cap, so a person can see how far over it is rather than being
 * told it is too big.
 */
export function remoteSaveTooLarge(bytes: number, label: string): string {
  return (
    `That file is ${bytes.toLocaleString()} bytes and Tortie can save files ` +
    `up to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ${label}. ` +
    `Nothing was written.`
  );
}

/**
 * A file of one past commit on that machine, when the larger side is over the
 * save cap (Phase 233).
 *
 * PHASE 336 KEEPS IT FOR THE COMMIT TAB ALONE. A file in the working tree over
 * the cap now opens read only with `remoteSaveCapChip`. A commit tab's two
 * sides are both CUT at the ceiling by the script that reads them, so a file
 * over it cannot be shown whole at all, and a diff of two cut files would be a
 * diff of two files neither of which is the one that was asked for.
 */
export function remoteOpenTooLarge(bytes: number, label: string): string {
  return (
    `That file is ${bytes.toLocaleString()} bytes and Tortie can save files ` +
    `up to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ${label}, so ` +
    `it did not open it. Nothing on that machine changed.`
  );
}

/**
 * Why a save did not happen, as main's outcome word names it.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers one word and this composes the
 * sentence, which is the shape `addRemoteRefusal` in ./project-tab.ts already
 * uses and the
 * shape `machines:listDir` used before it. Every sentence a person reads about
 * a machine stays inside the one file the vocabulary audit reads.
 */
export type MachineSaveRefusalReason = Exclude<
  MachineFilePutOutcome,
  'wrote'
>;

/**
 * The sentence for one refusal word.
 *
 * `root` is the folder the write was bound by, which main sends on the words
 * that name one. PHASE 336: `writesOff` with no folder means the path is
 * outside every project opened on that machine, and `writesOff` naming a
 * folder means that folder is one Tortie never writes in. A null on the other
 * words that name a folder falls back to the sentence that names none.
 *
 * `bytes` is what the file measures, and only `tooLarge` reads it.
 */
export function remoteSaveRefusal(
  reason: MachineSaveRefusalReason,
  label: string,
  root: string | null,
  bytes: number
): string {
  switch (reason) {
    case 'writesOff':
      return root === null
        ? remoteSaveOutsideProjects(label)
        : remoteSaveNever(label);
    case 'outsideRoot':
      return root === null
        ? remoteSaveOutsideProjects(label)
        : remoteSaveOutsideRoot(root, label);
    case 'folderChanged':
      return remoteSaveFolderChanged(root, label);
    case 'protected':
      return remoteSaveProtected(label);
    case 'stale':
      return remoteSaveStale(label);
    case 'missing':
      return remoteSaveMissing(label);
    case 'exists':
      return remoteCreateExists(root, label);
    case 'nomode':
      return remoteSaveNoMode(label);
    case 'nosum':
      return remoteSaveNoSum(label);
    case 'tooLarge':
      return remoteSaveTooLarge(bytes, label);
  }
}
