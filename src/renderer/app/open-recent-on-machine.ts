/**
 * File > Open Recent > a row whose folder is on another machine (Phase 92).
 *
 * WHY THIS IS ITS OWN MODULE. The branch is four lines in `App.tsx`, and four
 * lines is normally not worth a file. This one is, for two reasons. The split
 * of the payload is a rule that has to be exactly right, and a rule that is
 * only reachable through a React component is a rule no unit test can pin. And
 * `App.tsx` is where the menu dispatcher lives, not where a decision about a
 * machine is made.
 *
 * IT TAKES ITS DEPENDENCIES RATHER THAN READING THE STORE. The renderer store's
 * state satisfies {@link RecentOnMachineDeps} exactly as it stands, so the call
 * site is one line and the test needs no store at all.
 *
 * IT WRITES NO SENTENCE OF ITS OWN. Every refusal a click here can produce is
 * already written in ./machine-copy.ts, which is the one file the vocabulary
 * audit reads.
 */

import type { AddRemoteProjectResult, MachineStateView } from '@shared/ipc';
import { machineLabelFor } from '../state/machines-slice';
import { addRemoteRefusal } from './machine-copy';

/** What opening a remote recent row needs. The app store already provides it. */
export interface RecentOnMachineDeps {
  /** Whether this build can open a folder on a machine at all. */
  canAddRemoteProject(): boolean;
  /** The one route a folder on another machine becomes a tab. */
  addRemoteProject(
    machineId: string,
    path: string
  ): Promise<AddRemoteProjectResult>;
  /** How a sentence reaches the person. */
  toast(kind: 'info' | 'error', text: string): void;
  /** The machines this build knows about, for the label in a sentence. */
  machineStates: readonly MachineStateView[];
}

/**
 * Split `<machineId>:<path>` into its two halves, or null when it is neither.
 *
 * THE SPLIT IS AT THE FIRST COLON AND THAT IS EXACT. A machine id matches
 * `^[a-z][a-z0-9-]{0,31}$`, so it can never hold a colon. A path may hold as
 * many as it likes, and a folder called `10:30 recording` is a folder a person
 * may really have. Splitting at the last colon, or on every colon, would open
 * the wrong folder or none at all.
 */
export function splitRecentOnMachine(
  payload: string
): { machineId: string; path: string } | null {
  const cut = payload.indexOf(':');
  if (cut <= 0) return null;
  const machineId = payload.slice(0, cut);
  const path = payload.slice(cut + 1);
  if (path.length === 0) return null;
  return { machineId, path };
}

/**
 * Open the folder the menu row names, or say why it could not be opened.
 *
 * IT CANNOT HANG. `projects:addRemote` asks for the machine's context before it
 * asks the machine anything, and a machine that is not signed in refuses at
 * once with `notConnected` having contacted nothing. A machine that was
 * answering and stopped mid-call is bounded by the deadline the directory
 * listing already carries. Either way the person reads a sentence.
 */
export async function openRecentOnMachine(
  payload: string,
  deps: RecentOnMachineDeps
): Promise<void> {
  const parts = splitRecentOnMachine(payload);
  if (parts === null) return;
  if (!deps.canAddRemoteProject()) {
    deps.toast('info', 'This build cannot open a folder on a machine.');
    return;
  }
  const result = await deps.addRemoteProject(parts.machineId, parts.path);
  if (result.ok) return;
  deps.toast(
    'error',
    addRemoteRefusal(
      result.reason,
      parts.path,
      machineLabelFor(deps.machineStates, parts.machineId)
    )
  );
}
