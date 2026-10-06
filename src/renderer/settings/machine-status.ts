/**
 * Phase 340. What one machine row says at a glance: a chip, the sentence that
 * explains it, and the one next step (build/p340/SPEC.md D11 as revised by the
 * attack, D12).
 *
 * PURE. It reads the row main composed and one fact this window holds, being
 * whether a Prepare for this row is in flight here, and it answers. It starts
 * nothing, reads no file and asks no machine, so it can run on every render.
 *
 * FIRST MATCH WINS, in the order of the table in the spec, and the order is the
 * design. The three confirmation states come first, because a row nobody
 * agreed to is not usable whatever its link says. The last sign-in's three
 * classes a person must act on come next. Then what the link says now.
 *
 * READY MEANS ANSWERING, and the arm that draws it says so in its own words
 * rather than through a helper. `ready` on a row is main's
 * `machineCanHoldSession`, which asks whether a context is registered with a
 * captured search path. Nothing unregisters that context when the machine goes
 * to sleep: the link moves to `quiet` and `ready` stays true. The attack on the
 * spec measured that, so the Ready arm requires `ready` AND a link of
 * `connected` or `polling`, which is the rule of `machineAnswering` in
 * src/renderer/state/machines-slice.ts written out here, and
 * `conformance:machines` condition 139 reads this arm for both words.
 */

import type { MachineRowView } from '@shared/ipc';
import {
  BTN_OPEN_FOLDER,
  BTN_PREPARE,
  BTN_REVIEW,
  BTN_SET_UP_SIGN_IN,
  CHIP_WORDS,
  PREPARE_EXPLAIN,
  PREPARING,
  STATE_SENTENCE
} from './machines-copy';

/** The ten chips a row can wear. */
export type MachineChip = keyof typeof CHIP_WORDS;

/**
 * The one next step a row offers, or none.
 *
 *  - `review` opens the agreement panel of a row nobody confirmed as it is.
 *  - `review-version` runs Prepare so Phase 83's acceptance sheet is drawn.
 *  - `set-up-sign-in` starts the saved check, whose key step is the way in.
 *  - `open-folder` opens the main window's folder sheet on this machine.
 *  - `prepare` is the Prepare call, as it always was.
 */
export type MachineNextStep =
  | 'review'
  | 'review-version'
  | 'set-up-sign-in'
  | 'open-folder'
  | 'prepare';

export interface MachineStatus {
  chip: MachineChip;
  /** The chip's words. */
  word: string;
  /** The sentence that explains the chip, drawn as its hover. */
  hover: string;
  /** The next step, or null when there is nothing for a person to press. */
  next: MachineNextStep | null;
  /** True for the one alarm, a machine whose identity changed. */
  alarm: boolean;
}

/** The words on each next step's button. */
export const NEXT_STEP_LABEL: Readonly<Record<MachineNextStep, string>> = {
  review: BTN_REVIEW,
  'review-version': BTN_REVIEW,
  'set-up-sign-in': BTN_SET_UP_SIGN_IN,
  'open-folder': BTN_OPEN_FOLDER,
  prepare: BTN_PREPARE
};

/** The last sign-in classes that read as a machine that did not answer. */
const OFFLINE_CLASSES: ReadonlySet<string> = new Set([
  'unreachable',
  'refused',
  'not-resolved',
  'timed-out'
]);

/** Main's own two sentences about one sign-in, as one hover. */
function signInSentence(signIn: MachineRowView['signIn'] | null): string | null {
  if (signIn === null || signIn === undefined) return null;
  return `${signIn.headline} ${signIn.detail}`.trim();
}

/** The two last sign-in classes a key is the answer to. */
const KEY_CLASSES: ReadonlySet<string> = new Set(['auth-refused', 'password-required']);

/** The first of these that is a non-empty sentence. */
function firstSentence(...candidates: (string | null | undefined)[]): string {
  for (const one of candidates) {
    if (typeof one === 'string' && one.trim() !== '') return one;
  }
  return '';
}

function status(
  chip: MachineChip,
  hover: string,
  next: MachineNextStep | null
): MachineStatus {
  return {
    chip,
    word: CHIP_WORDS[chip],
    hover,
    next,
    alarm: chip === 'identity-changed'
  };
}

/**
 * The chip, its hover and the next step for one row.
 *
 * `preparing` is true while a Prepare for THIS row is in flight in this
 * window, which main cannot know and the link does not say until the sign in
 * starts.
 *
 * `checkedOkAt` (the fix round) is when this window received a finished
 * check of THIS row that answered ok, or null. A last sign-in that wanted a
 * key and is OLDER than that check is stale: the machine has since signed
 * Tortie in, so the row no longer reads Needs a key, whose next step only
 * checks again, and reads on to the next thing, which is Prepare this machine
 * (the verifiers measured the old rule leaving Ready two presses away behind a
 * next step that did not lead there). A sign-in refused AFTER the check, such
 * as a Prepare that could not use a key the check's person answered for, still
 * reads Needs a key. It starts nothing.
 *
 * THE CHIP AGREES WITH THE CHECK SHOWN (the ruled round, from the reverify).
 * While that ok check is the newest word about the machine, newer than the
 * last sign-in or with none in this run, nothing older says the machine did
 * not answer: a sign-in that did not reach it is stale the way a key one is,
 * and a `quiet` link is not read as Offline. The reverify measured Offline
 * drawn beside the check's own "This machine answered", over a quiet link
 * left from before the check. The row reads Not ready, whose next step,
 * Prepare this machine, is Offline's own. A sign-in AFTER the check is newer
 * than it and is read as before; a changed identity is never cleared so. The
 * link carries no time on the row, so a machine that goes quiet while the ok
 * check is still shown reads Not ready rather than Offline until the check is
 * closed or run again, with the same next step.
 */
export function machineStatusOf(
  row: MachineRowView,
  facts: { preparing: boolean; checkedOkAt?: number | null }
): MachineStatus {
  const link = row.link ?? null;
  const lastClass = row.signIn?.class ?? '';
  const checkedAt = facts.checkedOkAt ?? null;
  // The check shown answered ok, and nothing since has said otherwise: no
  // sign-in in this run, or one at or before the check.
  const checkIsNewest = checkedAt !== null && (row.signIn?.at ?? -Infinity) <= checkedAt;
  const stale =
    checkIsNewest && (KEY_CLASSES.has(lastClass) || OFFLINE_CLASSES.has(lastClass));
  const signIn = stale ? null : (row.signIn ?? null);
  const signInClass = signIn?.class ?? null;

  if (row.state === 'unknown') {
    return status('not-usable', STATE_SENTENCE.unknown, 'review');
  }
  if (row.state === 'never') {
    return status('not-confirmed', STATE_SENTENCE.never, 'review');
  }
  if (row.state === 'changed') {
    return status('changed', STATE_SENTENCE.changed, 'review');
  }
  if (signInClass === 'host-key-changed') {
    return status('identity-changed', firstSentence(signInSentence(signIn)), null);
  }
  if (signInClass !== null && KEY_CLASSES.has(signInClass)) {
    return status('needs-key', firstSentence(signInSentence(signIn)), 'set-up-sign-in');
  }
  if (signInClass === 'version-unmeasured') {
    return status('new-version', firstSentence(signInSentence(signIn)), 'review-version');
  }
  if (facts.preparing || link === 'connecting') {
    return status(
      'connecting',
      firstSentence(row.linkDetail, PREPARING),
      null
    );
  }
  // READY MEANS ANSWERING: `ready` alone is a registered context, which a
  // machine that went to sleep keeps. The two links are written out here.
  if (row.ready === true && (link === 'connected' || link === 'polling')) {
    return status(
      'ready',
      firstSentence(row.linkDetail, STATE_SENTENCE.confirmed),
      'open-folder'
    );
  }
  // THE HOVER SAYS WHAT THE CHIP SAYS (the fix round, the verifiers'
  // finding). A sign-in sentence explains Offline only when that sign-in is
  // the one that did not answer; a machine prepared earlier in this run whose
  // link has since gone quiet is explained by main's link sentence, never by
  // "This machine is ready".
  const offlineSignIn = signInClass !== null && OFFLINE_CLASSES.has(signInClass);
  // A quiet link older than the check shown is not Offline (the ruled round).
  if (offlineSignIn || (link === 'quiet' && !checkIsNewest)) {
    return status(
      'offline',
      offlineSignIn
        ? firstSentence(signInSentence(signIn), row.linkDetail, PREPARE_EXPLAIN)
        : firstSentence(row.linkDetail, PREPARE_EXPLAIN),
      'prepare'
    );
  }
  // Not ready is explained by a sign-in that failed, and by Prepare's own
  // sentence otherwise, so a prepared sign-in never says "ready" under it.
  return status(
    'not-ready',
    signInClass !== null && signInClass !== 'prepared'
      ? firstSentence(signInSentence(signIn), PREPARE_EXPLAIN)
      : PREPARE_EXPLAIN,
    'prepare'
  );
}

/**
 * The name a person knows a system by. `uname -s` answers `Darwin` on a Mac,
 * which is not a word a person reads anywhere else in Tortie.
 */
export function systemName(os: string | null | undefined): string | null {
  if (typeof os !== 'string') return null;
  const trimmed = os.trim();
  if (trimmed === '') return null;
  if (trimmed.toLowerCase() === 'darwin') return 'macOS';
  return trimmed;
}

/**
 * The row's one line of facts, being the address, the system and the version,
 * each only when it is known in this run. The address is always known. The
 * other two are memory in main, read by the last sign in, and never a field of
 * the machines file (D16, D24).
 */
export function machineFactsOf(row: MachineRowView): string[] {
  const parts: string[] = [row.host];
  const system = systemName(row.os);
  if (system !== null) parts.push(system);
  const version = row.signIn?.version ?? null;
  if (typeof version === 'string' && version.trim() !== '') parts.push(version);
  return parts;
}
