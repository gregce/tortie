/**
 * The one action a project tab offers for a machine that did not answer
 * (Phase 232, item 4).
 *
 * THE HOLE THIS CLOSES. Research 85 section 4.4: the only control that
 * reconnects a machine is Prepare, in Settings then Machines, and on a project
 * tab there is none. Research 91 section 4.3 counted zero controls matching
 * "prepare" on the unreachable machine's own tab against two in Settings, and
 * read main's refusal for that tab's Source control read going to the log with
 * the door named, "Open Settings and then Machines, and prepare it", where a
 * person cannot see it. The action is now beside the sentence a person meets.
 *
 * THE LABEL IS SETTINGS' OWN, imported rather than retyped, so the two doors
 * to the same channel can never say two different things. The operator's rule
 * of 2026-09-07 bounds this file to the label and the rule below and nothing
 * else: no sentence explains the action, because the same button in Settings
 * has its explanation there and the tab is meant to feel like a local one.
 *
 * THE RULE. The action is offered only while the machine's link reads `quiet`,
 * which is the launch failure this phase is about and the state the region's
 * bar names. A `connecting` machine is a sign-in in flight and needs no second
 * one; `connected` and `polling` need nothing; and `refused` is a machine
 * nobody confirmed or a version nobody measured, both of which Settings alone
 * can change, because that is where the confirm sheet and the acceptance sheet
 * are. A machine Tortie holds no statement about is not offered either.
 */

import type { MachineStateView } from '@shared/ipc';
import { BTN_PREPARE, PREPARING } from '../settings/machines-copy';

/** The button's label, which is the Settings button's label. */
export const PREPARE_ACTION_LABEL = BTN_PREPARE;

/** The label while the press is in flight, which is Settings' as well. */
export const PREPARE_ACTION_BUSY = PREPARING;

/** Whether the tab offers the action for this machine right now. */
export function prepareActionOffered(
  states: readonly MachineStateView[],
  machineId: string
): boolean {
  return states.find((one) => one.id === machineId)?.link === 'quiet';
}
