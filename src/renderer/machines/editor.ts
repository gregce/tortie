/**
 * What the editor says about a file on another machine, and every refusal it
 * draws when a save cannot happen there (Phase 101).
 *
 * The doctrine that binds these sentences is in ./presentation.ts, and the tab
 * they are drawn in is described in ./project-tab.ts.
 */

import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';

// -- the editor --------------------------------------------------------------

/**
 * The band under a tab holding a file from another machine, when saving is off.
 *
 * It says two things and both are needed. The file is over there, which is why
 * the bytes on screen may be older than the file. And Tortie cannot save it
 * yet, which is why typing changes nothing.
 *
 * PHASE 101 REWROTE THE SECOND HALF, and the rewrite is the phase. The old
 * sentence said Tortie cannot save changes, full stop, which is now false for a
 * machine a person has let Tortie save on. It names the one thing that changes
 * the answer instead. THERE IS NO BAND AT ALL when saving is on: the tab
 * behaves like a tab on this Mac, and a band over a tab that saves would be a
 * sentence contradicting the dirty dot beside it.
 */
export function remoteFileChip(label: string): string {
  return (
    `This file is on ${label}. Tortie is showing what it read and cannot ` +
    `save it until you let it save on that machine.`
  );
}

/**
 * What a person reads when they press Save on a tab whose machine has no
 * folder Tortie may save under.
 *
 * PHASE 101 REWROTE IT. The old sentence said the file is on that machine, so
 * Tortie cannot save it, which named the machine as the reason. The reason is
 * not the machine. The reason is that nobody has told Tortie which folder on
 * that machine it may replace a file under, and one person doing one thing once
 * changes it. So the sentence names that thing, and it names the path to it,
 * because `settings:openWindow` takes no argument and cannot open the section
 * itself.
 *
 * The toast that carries it also carries a button labelled Open settings. The
 * sentence still names the path, because a person who reads the sentence
 * somewhere else, e.g. in a screenshot, needs the same answer.
 */
export function remoteSaveRefused(label: string): string {
  return (
    `Tortie cannot save on ${label}. Open Settings, then Machines, then ` +
    `${label}, and let Tortie save files there. Nothing was written.`
  );
}

/**
 * The file is not under the folder this person confirmed for that machine.
 *
 * Main refuses this before it composes anything, so nothing was sent. The
 * sentence names the folder, because the folder is the fact the person agreed
 * to and the one they would change.
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
export function remoteCreateExists(root: string, label: string): string {
  return (
    `Tortie did not make that file, because a file of that name is already ` +
    `on ${label} under ${root}. Nothing was written.`
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
 * Opening a file on a machine Tortie may save on, when the file is over the
 * save cap.
 *
 * WHY THE OPEN IS REFUSED RATHER THAN THE SAVE. A tab that can never be saved
 * is the defect Phase 96 fixed by accident, and it would come straight back for
 * every file over the cap. The cap cannot be raised to meet the read cap,
 * because the whole command Tortie sends is capped as well and a file of that
 * size does not fit at any encoding.
 *
 * IT IS REFUSED ONLY WHEN SAVING IS ON for that machine. With saving off the
 * tab is read only anyway, and refusing the open would take away a read a
 * person has today for nothing.
 */
export function remoteOpenTooLarge(bytes: number, label: string): string {
  return (
    `That file is ${bytes.toLocaleString()} bytes and Tortie can save files ` +
    `up to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ${label}, so ` +
    `it did not open it. Nothing on that machine changed.`
  );
}

/**
 * The same refusal when the read itself was cut, so the size is a floor.
 *
 * TWO SENTENCES RATHER THAN ONE, and the reason is that a truncated read gives
 * a floor rather than a measurement. Printing the floor as the size would put a
 * false number on screen, so this one says over and names the number the read
 * stopped at.
 */
export function remoteOpenTooLargeOver(floor: number, label: string): string {
  return (
    `That file is over ${floor.toLocaleString()} bytes and Tortie can save ` +
    `files up to ${REMOTE_FILE_MAX_BYTES.toLocaleString()} bytes on ` +
    `${label}, so it did not open it. Nothing on that machine changed.`
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
export type MachineSaveRefusalReason =
  | 'writesOff'
  | 'outsideRoot'
  | 'stale'
  | 'missing'
  | 'exists'
  | 'nomode'
  | 'nosum'
  | 'tooLarge';

/**
 * The sentence for one refusal word.
 *
 * `root` is the confirmed folder, which main sends on both words that name one.
 * A null there can only mean saving is off for that machine, so those two words
 * fall back to the sentence that says exactly that, rather than drawing a
 * folder nobody confirmed.
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
      return remoteSaveRefused(label);
    case 'outsideRoot':
      return root === null
        ? remoteSaveRefused(label)
        : remoteSaveOutsideRoot(root, label);
    case 'stale':
      return remoteSaveStale(label);
    case 'missing':
      return remoteSaveMissing(label);
    case 'exists':
      return root === null
        ? remoteSaveRefused(label)
        : remoteCreateExists(root, label);
    case 'nomode':
      return remoteSaveNoMode(label);
    case 'nosum':
      return remoteSaveNoSum(label);
    case 'tooLarge':
      return remoteSaveTooLarge(bytes, label);
  }
}
