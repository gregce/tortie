/**
 * What a user-assigned shortcut actually does when something else already
 * owns the chord (Phase 12.12 item 5, "conflict surfacing").
 *
 * WHY THIS EXISTS AND THE RECORDER IS NOT ENOUGH: the recorder refuses a
 * colliding chord at the moment you type it, so a conflict cannot be CREATED
 * from the map. It can still ARRIVE — a chord recorded in an older build
 * becomes a collision the day src/shared/keymap.ts gains the same accelerator
 * (⇧⌘N for New project… is exactly that story). A settings file written by
 * hand can do it too. Those chords sit in the map looking assigned and
 * silently never fire, which is the failure this note refuses to allow.
 *
 * The copy answers two questions the recorder's refusal message does not have
 * to: what wins, and what to do about it. Every table it consults is derived —
 * KEYMAP for gmux's own chords, NATIVE_ROLE_CHORDS for the Edit menu,
 * RESERVED_MACOS_CHORDS for the operating system — so a shortcut added to the
 * keymap starts producing these notes with no edit here.
 */

import {
  NATIVE_ROLE_CHORDS,
  builtInOwner,
  normalizeAccelerator
} from '@shared/keymap';
import { RESERVED_MACOS_CHORDS } from './chords';

/** One agent's recorded chord, as the map already knows it. */
export interface AssignedAgentChord {
  readonly agentId: string;
  readonly displayName: string;
  readonly accelerator: string;
}

/** Menu labels carry a trailing ellipsis; mid-sentence it reads as a pause. */
function plain(action: string): string {
  return action.replace(/…$/, '');
}

/**
 * The note to show under an assignable row, or null when the chord is clear.
 *
 * @param accel      the row's recorded accelerator (any modifier order)
 * @param selfAgentId the row's agent — its own chord is never a conflict
 * @param assigned   every agent's recorded chord, including this row's
 */
export function shortcutConflictNote(
  accel: string,
  selfAgentId: string,
  assigned: readonly AssignedAgentChord[]
): string | null {
  const canonical = normalizeAccelerator(accel);
  const mods = new Set(canonical.split('+').slice(0, -1));

  if (!mods.has('Cmd') && !mods.has('Ctrl')) {
    return 'A shortcut needs ⌘ or ⌃ to reach Tortie. Record a different one.';
  }

  const builtIn = builtInOwner(canonical);
  if (builtIn !== undefined) {
    return `Built in as ${plain(builtIn.action)}, and the built-in wins — this never starts a session. Record a different shortcut.`;
  }

  const nativeRole = NATIVE_ROLE_CHORDS[canonical];
  if (nativeRole !== undefined) {
    return `The Edit menu uses this for ${nativeRole}, so it never starts a session. Record a different shortcut.`;
  }

  const macOwner = RESERVED_MACOS_CHORDS[canonical];
  if (macOwner !== undefined) {
    return `macOS keeps this for ${macOwner} and takes it first. Record a different shortcut.`;
  }

  const other = assigned.find(
    (a) =>
      a.agentId !== selfAgentId && normalizeAccelerator(a.accelerator) === canonical
  );
  if (other !== undefined) {
    return `Also set for New ${other.displayName} session — only one of the two can run. Record a different shortcut.`;
  }

  return null;
}
