/**
 * reconstruct-operator.ts — the way a person reaches reconstruction (Phase 20
 * fix round).
 *
 * ## Why this file exists
 *
 * Phase 20 built reconstruction and shipped it with no door. There was no menu
 * item, no IPC channel, no preload method and no flag. The only caller was
 * `GMUX_SMOKE=reconstruct`, and that harness refuses to run against the real
 * profile and the real socket, which is correct of it and useless to the person
 * whose session list has just gone. A verifier put it plainly: on the day the
 * operator loses their manifest, they cannot run reconstruction against their
 * own sessions. The phase claimed the feature needs an explicit human decision,
 * and there was no way for the human to make one.
 *
 * There is a second thing a door fixes, and it is the reason this file is not
 * a nicety. Rollup tracks the value of a parameter when a function has exactly
 * one call site it can see. With one caller passing the acknowledgement
 * constant, rollup proved the acknowledgement refusal dead and deleted it from
 * `out/main/index.js`. The source had the check, the unit test passed, and the
 * shipped artifact did not contain it. A real second caller is what makes the
 * refusal survive the bundler, and `build/assert-bundle-refusals.mjs` is what
 * notices if it stops surviving.
 *
 * ## The shape of the door
 *
 * Menu item, then two native dialogs, and nothing else. No renderer surface, no
 * new IPC channel, no new preload method.
 *
 *  1. The person picks "Rebuild the Session List…" in the Tortie menu.
 *  2. `surveyReconstruction` reads the capsules and the live tmux sessions.
 *     Nothing is written. Foreign sessions are reported and never candidates.
 *  3. A dialog shows the plan and asks. Cancel is the default button and the
 *     escape key, so a person who opened the menu by accident writes nothing.
 *  4. On confirm, the rebuild goes to a new directory under the profile. The
 *     live manifest is never the target and never opened for writing.
 *  5. A second dialog says where the file is and offers to reveal it. Putting
 *     it in place stays a separate act by a person who has read the report.
 *
 * ## What this door deliberately cannot do
 *
 * It cannot include a candidate that has no launch recipe. Such a candidate
 * needs a name, a project root, a working directory and an agent typed in by
 * hand, and a message box has nowhere to type them. Those candidates are listed
 * in the dialog as left out, with the reason. They are reachable from the
 * survey and the apply API, and a later round can give them a form. Guessing
 * them here would be the module inventing a session.
 *
 * It never adopts a live session carrying no identity. That is enforced in
 * `reconstruct.ts`, not here, and this file passes no decision that could
 * reach one.
 */

import { dialog, shell } from 'electron';
import { userInfo } from 'node:os';
import {
  RECONSTRUCTION_ACKNOWLEDGEMENT,
  applyReconstruction,
  defaultReconstructionRoot,
  summarizePlan,
  surveyReconstruction,
  type CandidateDecision,
  type ReconstructionPlan
} from './reconstruct';

/** Everything a dialog needs to say, without a dialog. Kept testable. */
export interface OperatorPrompt {
  /** The short line at the top of the box. */
  message: string;
  /** The body. Already wrapped into lines. */
  detail: string;
  /** Button labels, in the order macOS shows them. */
  buttons: string[];
  /** Index of the button that means "go ahead", or null when there is none. */
  confirmIndex: number | null;
}

/**
 * Who the report records as the decider.
 *
 * The account name of the person at this Mac, and a note that they came through
 * the menu. It is recorded, never consulted. A reconstruction is not authorised
 * by this string, it is authorised by the person clicking the button.
 */
export function operatorDecidedBy(): string {
  let who = 'unknown';
  try {
    who = userInfo().username;
  } catch {
    /* a profile with no passwd entry still gets to rebuild its session list */
  }
  return `${who} (Tortie menu)`;
}

/** Candidates this door can write without asking anything more of a person. */
export function readyCandidates(plan: ReconstructionPlan): string[] {
  return plan.candidates.filter((c) => !c.decisionRequired).map((c) => c.sessionId);
}

/**
 * Turn a plan into the confirmation box.
 *
 * Separated from the dialog call so a test can read the exact words a person is
 * shown, and so the "nothing to do" case and the "here is what would happen"
 * case cannot drift apart.
 */
export function buildConfirmPrompt(plan: ReconstructionPlan): OperatorPrompt {
  const ready = readyCandidates(plan);
  const needsMore = plan.candidates.filter((c) => c.decisionRequired);
  const lines: string[] = [];

  if (plan.liveManifestSessions !== null && plan.liveManifestSessions > 0) {
    lines.push(
      `Your session list is not empty. It holds ${String(plan.liveManifestSessions)} sessions ` +
        'right now, so you probably do not need this. Nothing here replaces it ' +
        'either way.'
    );
    lines.push('');
  }

  if (ready.length === 0) {
    lines.push(
      'Tortie found nothing it can rebuild without asking you for facts no ' +
        'record holds.'
    );
  } else {
    lines.push(
      `Tortie can rebuild ${String(ready.length)} sessions from the snapshots on disk and ` +
        'the identity stamps on the sessions that are still running.'
    );
  }

  if (needsMore.length > 0) {
    lines.push('');
    lines.push(
      `${String(needsMore.length)} more sessions are left out. Nothing on record says what ` +
        'their name, project or agent was, and Tortie will not guess.'
    );
  }

  if (plan.foreign.length > 0) {
    lines.push('');
    lines.push(
      `${String(plan.foreign.length)} running sessions are not Tortie's. They are left alone, ` +
        'and no button here can change that.'
    );
  }

  lines.push('');
  lines.push(
    'The rebuild is written to a new folder. Your current session list is not ' +
      'touched, and putting the rebuild in place is a separate step you do ' +
      'afterwards.'
  );
  lines.push('');
  lines.push('What the survey found:');
  lines.push(...summarizePlan(plan));

  if (ready.length === 0) {
    return {
      message: 'There is nothing to rebuild.',
      detail: lines.join('\n'),
      buttons: ['OK'],
      confirmIndex: null
    };
  }
  return {
    message: `Rebuild the session list from ${String(ready.length)} recovered sessions?`,
    detail: lines.join('\n'),
    // Cancel first, so it is both the default button and the escape key.
    buttons: ['Cancel', `Rebuild ${String(ready.length)} Sessions`],
    confirmIndex: 1
  };
}

/**
 * Run the whole flow. Called by the menu item and by nothing else.
 *
 * Never throws at the caller. A menu item that throws into Electron's event
 * loop shows the person nothing, and the one moment this feature is used is the
 * moment they can least afford silence.
 */
export async function runOperatorReconstruction(): Promise<void> {
  let plan: ReconstructionPlan;
  try {
    plan = await surveyReconstruction();
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      message: 'Tortie could not read enough to rebuild the session list.',
      detail: `Nothing was written.\n\n${(err as Error).message}`,
      buttons: ['OK']
    });
    return;
  }

  const prompt = buildConfirmPrompt(plan);
  const asked = await dialog.showMessageBox({
    type: prompt.confirmIndex === null ? 'info' : 'warning',
    message: prompt.message,
    detail: prompt.detail,
    buttons: prompt.buttons,
    defaultId: 0,
    cancelId: 0,
    noLink: true
  });
  if (prompt.confirmIndex === null || asked.response !== prompt.confirmIndex) {
    return;
  }

  const decisions: Record<string, CandidateDecision> = {};
  for (const id of readyCandidates(plan)) decisions[id] = { include: true };

  try {
    const result = await applyReconstruction(plan, {
      acknowledgement: RECONSTRUCTION_ACKNOWLEDGEMENT,
      decidedBy: operatorDecidedBy(),
      outputRoot: defaultReconstructionRoot(),
      decisions
    });
    const detail = [
      `${String(result.written.length)} sessions were written and read back again.`,
      result.verified
        ? 'Every row matched what was intended.'
        : `${String(result.mismatches.length)} rows did not read back as written. Do not put ` +
          'this file in place. The report lists them.',
      '',
      `The rebuild is at ${result.manifestPath}`,
      `The report is at ${result.reportPath}`,
      '',
      'Your current session list has not been changed. To use the rebuild, ' +
        'quit Tortie, move your existing session list aside, and put this file ' +
        'in its place named manifest.db.',
      '',
      'What a rebuilt session comes back without:',
      ...result.gaps.map((g) => `  ${g}`)
    ].join('\n');

    const done = await dialog.showMessageBox({
      type: result.verified ? 'info' : 'warning',
      message: `Rebuilt ${String(result.written.length)} sessions.`,
      detail,
      buttons: ['Done', 'Show in Finder'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
    if (done.response === 1) shell.showItemInFolder(result.manifestPath);
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      message: 'The rebuild was refused, and nothing was written.',
      detail: (err as Error).message,
      buttons: ['OK']
    });
  }
}
