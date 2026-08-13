/**
 * What has to be true before the install control does anything.
 *
 * The operator merged installing into this phase and converted the reason for
 * the original staging into four requirements. Three of them are decided here,
 * as a pure function, so that "nothing installs without a human" is a value a
 * test can read rather than a claim about a click handler.
 *
 *   Requirement 2  pin and re-check: a changed hash disables the item and asks
 *                  again
 *   Requirement 3  nothing installs without a human confirming, and the confirm
 *                  shows the full command line
 *   Requirement 4  the executable-content scan is shown before the install
 *                  control (`../surface/preview-sections` owns the order;
 *                  this file owns the consequence)
 *
 * Blockers come in two kinds and the difference matters. A HARD blocker cannot
 * be cleared from this surface at all: a malformed command line is not a risk a
 * user can accept on Tortie's behalf, and a missing CLI is a packaging mistake
 * rather than a decision. An ACKNOWLEDGED blocker is cleared by the person at
 * the keyboard ticking a box that names what they are accepting. Neither kind
 * is ever cleared by time, by a retry or by a second click.
 *
 * ## The executable-content scan is a REFUSAL, not a warning
 *
 * The backlog line is "an install is refused when the executable-content scan
 * finds something, rather than warning after the fact". This shipped first as a
 * soft blocker, and a Phase 22 verifier cleared it with a checkbox: a scan
 * carrying a command finding and an audit rating of critical returned
 * `allowed: false`, and ticking two boxes returned `allowed: true`. That is a
 * warning with extra steps.
 *
 * So `executable-content` and `not-scanned` are both HARD.
 *
 *  - **Found something that runs.** Tortie will not install it. A SKILL.md body
 *    can carry `` !`command` `` placeholders that execute before the model ever
 *    sees the file, and the documented corpus is 1,184 malicious skills on one
 *    hub with 13.4 per cent of scanned skills carrying a critical flaw. The
 *    preview still shows the whole command line with a copy control, so a user
 *    who wants this skill runs that command themselves and owns the decision in
 *    their own terminal. That is the honest consequence and it is stated on the
 *    surface rather than hidden.
 *  - **Could not read it.** Tortie does not install what it has not read.
 *
 * `audit-risk` stays acknowledged, and the difference is deliberate. The scan
 * is a FACT about what the files contain, found by Tortie. A scanner's rating
 * is somebody else's JUDGEMENT, and "no scanner has looked at this" is the
 * common case rather than the exception, so refusing on it would refuse almost
 * everything while telling the user nothing they could act on.
 */

import type { ContextExecutableScan } from '../model';
import { isElevatedRisk, worstRisk } from '../surface/audit';
import { checkPlanShape } from '../surface/command-line';
import { hasExecutableContent, scanRan } from '../surface/executable-scan';
import type {
  AuditRecord,
  InstallPlan,
  InstallTarget,
  PinRecord
} from '../surface/model';

export type BlockerCode =
  | 'malformed-command'
  | 'cli-unavailable'
  | 'offline'
  | 'no-agents'
  | 'executable-content'
  | 'audit-risk'
  | 'not-scanned'
  | 'hash-changed';

export interface Blocker {
  code: BlockerCode;
  /** Hard blockers cannot be acknowledged away. */
  hard: boolean;
  /** One sentence, in the user's words. */
  message: string;
}

export interface InstallGateInput {
  plan: InstallPlan | null;
  scan: ContextExecutableScan | null;
  audit: AuditRecord | null;
  targets: readonly InstallTarget[];
  /** The bundled CLI probed and answered with a version Tortie parses. */
  cliAvailable: boolean;
  /** Discovery and install both need a connection. */
  online: boolean;
  /** Set for an installed item being re-enabled after a refresh. */
  pin?: PinRecord | null;
  /**
   * Set when the command the surface would SHOW is not the command main would
   * RUN. `../install/plan-adapter` compares them token by token. It is hard,
   * because a command line the user did not see is not one they approved.
   */
  commandMismatch?: string | null;
  /** What the human has ticked. Codes only, so it survives a re-render. */
  acknowledged: readonly BlockerCode[];
}

export interface InstallGate {
  /** True only when every hard blocker is absent and every soft one is ticked. */
  allowed: boolean;
  blockers: Blocker[];
  /** The subset still standing between the user and the confirm. */
  outstanding: Blocker[];
}

/**
 * Requirement 2, on its own, because the pin check also runs on refresh for an
 * item that is already installed and has no plan behind it.
 *
 * A pin that cannot be re-read is treated as changed. The alternative is to
 * treat an unreadable hash as agreement, which is the failure mode this control
 * exists to prevent.
 */
export function pinBlocker(
  pin: PinRecord | null | undefined,
  name: string
): Blocker | null {
  if (pin === null || pin === undefined) return null;
  if (pin.currentHash === pin.pinnedHash) return null;
  return {
    code: 'hash-changed',
    hard: false,
    message:
      pin.currentHash === null
        ? `Tortie cannot re-read ${name} to check it against what was installed. It stays disabled until you review it.`
        : `${name} changed since you approved it. Its contents no longer match what you installed. It is disabled until you review it.`
  };
}

export function evaluateInstall(input: InstallGateInput): InstallGate {
  const blockers: Blocker[] = [];
  const name = input.plan?.displayName ?? 'this item';

  if (!input.cliAvailable) {
    blockers.push({
      code: 'cli-unavailable',
      hard: true,
      message:
        'Skill installing is unavailable in this build. Settings names the path Tortie tried.'
    });
  }

  if (!input.online) {
    blockers.push({
      code: 'offline',
      hard: true,
      message:
        'Installing fetches the skill from its source, so it needs a connection.'
    });
  }

  if (input.plan === null) {
    blockers.push({
      code: 'no-agents',
      hard: true,
      message: 'Choose at least one agent.'
    });
  } else {
    const shape = checkPlanShape(input.plan);
    for (const problem of shape) {
      blockers.push({
        code: problem.code === 'no-agents' ? 'no-agents' : 'malformed-command',
        hard: true,
        message: problem.message
      });
    }
  }

  if (input.targets.length > 0 && !input.targets.some((t) => t.selected)) {
    blockers.push({
      code: 'no-agents',
      hard: true,
      message: 'Choose at least one agent.'
    });
  }

  if (input.commandMismatch !== null && input.commandMismatch !== undefined) {
    blockers.push({
      code: 'malformed-command',
      hard: true,
      message: input.commandMismatch
    });
  }

  // Both hard. See the header: a scan finding is a refusal, not a warning.
  if (!scanRan(input.scan)) {
    blockers.push({
      code: 'not-scanned',
      hard: true,
      message: `Tortie could not read ${name}, so it cannot say what runs when it loads. It does not install what it has not read.`
    });
  } else if (hasExecutableContent(input.scan)) {
    blockers.push({
      code: 'executable-content',
      hard: true,
      message:
        `${name} carries content that runs with your permissions, so Tortie will not install it. ` +
        `What it found is listed above. The whole command is below, so you can run it yourself if you want this skill.`
    });
  }

  const worst = worstRisk(input.audit);
  if (input.audit === null) {
    blockers.push({
      code: 'audit-risk',
      hard: false,
      message: `No scanner has looked at ${name}.`
    });
  } else if (isElevatedRisk(worst)) {
    blockers.push({
      code: 'audit-risk',
      hard: false,
      message: `A scanner rated ${name} ${worst ?? ''}.`
    });
  }

  const pin = pinBlocker(input.pin, name);
  if (pin !== null) blockers.push(pin);

  // One line per distinct thing that is wrong. "Choose at least one agent" can
  // arrive twice, once because there is no plan and once because no target is
  // ticked, and they are the same fact told two ways. A control that says it
  // twice reads as two problems.
  const seen = new Set<string>();
  const distinct = blockers.filter((b) => {
    const key = `${b.code}:${b.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const ticked = new Set(input.acknowledged);
  const outstanding = distinct.filter((b) => b.hard || !ticked.has(b.code));

  return { allowed: outstanding.length === 0, blockers: distinct, outstanding };
}
