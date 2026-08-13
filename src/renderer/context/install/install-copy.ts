/**
 * The confirm copy, final, from research 29 §3.7 and §9.1.
 *
 * Sentence case, no exclamation marks. The modal is built out of facts rather
 * than warnings: it names what runs and when, where it came from down to the
 * commit, and what happens to sessions running right now. There is no
 * "do not ask again" and there is no checkbox that switches the dialog off,
 * because a confirmation that can be turned off is decoration.
 *
 * The primary button names the consequence rather than the verb, because the
 * incident data says the body of a skill is where the payload hides and a
 * button reading "OK" tells the reader nothing about what they are agreeing to.
 */

import type { ContextExecutableScan } from '../model';
import { auditSentence } from '../surface/audit';
import { executableClause, scanRan } from '../surface/executable-scan';
import type { AuditRecord } from '../surface/model';

export interface ConfirmCopy {
  title: string;
  /** One paragraph. Each entry is its own sentence-level line. */
  body: string[];
  confirmLabel: string;
  cancelLabel: string;
  /** Present only where research names a third answer. */
  altLabel?: string;
  /** Destructive fill is reserved for confirms that destroy something. */
  destructive: boolean;
}

/**
 * "Install govuk-style from github.com/alphagov/…?"
 * "Skills run inside your agents. This one ships 3 scripts that can run with
 *  your permissions."
 * "Scanned 16 April: Socket 0 alerts, Snyk low."
 */
export function installSkillCopy(
  name: string,
  source: string,
  scan: ContextExecutableScan | null,
  audit: AuditRecord | null,
  now: number = Date.now()
): ConfirmCopy {
  const clause = scan === null ? null : executableClause(scan);
  const second =
    clause !== null
      ? `Skills run inside your agents. This one ${clause}.`
      : scanRan(scan)
        ? 'Skills run inside your agents. Tortie found nothing in this one that runs on its own.'
        : 'Skills run inside your agents. Tortie has not read this one, so it cannot say what runs.';

  return {
    title: `Install ${name} from ${source}?`,
    body: [second, auditSentence(audit, now)],
    confirmLabel: 'Install',
    cancelLabel: 'Cancel',
    destructive: false
  };
}

/**
 * "Add the supabase server?"
 * "An MCP server runs on your machine and can see whatever you give it access
 *  to. It needs SUPABASE_ACCESS_TOKEN."
 *
 * The variable NAMES appear here. The values never do.
 */
export function addMcpCopy(
  name: string,
  envKeys: readonly string[]
): ConfirmCopy {
  const body = [
    'An MCP server runs on your machine and can see whatever you give it access to.'
  ];
  if (envKeys.length > 0) {
    const names = [...envKeys].sort((a, b) => a.localeCompare(b));
    body.push(
      names.length === 1
        ? `It needs ${names[0] ?? ''}.`
        : `It needs ${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}.`
    );
  }
  return {
    title: `Add the ${name} server?`,
    body,
    confirmLabel: 'Add server',
    cancelLabel: 'Cancel',
    destructive: false
  };
}

/**
 * §3.7 rule 4, the control that stops a rug pull. It costs a stored string and
 * it is the only thing in the design that catches a source changing under an
 * approval that was already given.
 */
export function changedAfterApprovalCopy(name: string): ConfirmCopy {
  return {
    title: `${name} changed since you approved it.`,
    body: [
      'Its contents no longer match what you installed. It is disabled until you review it.'
    ],
    confirmLabel: 'Re-enable',
    cancelLabel: 'Leave it disabled',
    altLabel: 'Show what changed',
    destructive: false
  };
}

/** The server that resolves fresh code from npm at every session launch. */
export function unpinnedCommandCopy(command: string): ConfirmCopy {
  return {
    title: 'This server downloads a new version every time it starts.',
    body: [`${command} resolves fresh code from npm at each session launch.`],
    confirmLabel: 'Pin the current version',
    cancelLabel: 'Leave it',
    destructive: false
  };
}

/**
 * §9.1's shape for a plugin, whose whole point is that it runs its own programs
 * while agents work. The event rows are in the user's words. `SessionStart` and
 * `PostToolUse` stay in the detail view for people who want them.
 */
export interface PluginRunRow {
  when: string;
  script: string;
}

export function enablePluginCopy(
  name: string,
  agentName: string,
  blastRadius: string
): ConfirmCopy {
  return {
    title: `Enable "${name}" for ${agentName}`,
    body: ['This plugin runs its own programs while agents work.', blastRadius],
    confirmLabel: 'Enable',
    cancelLabel: 'Cancel',
    destructive: false
  };
}

/**
 * §9.3. Trashing a skill and trashing a link to one are different acts and must
 * never share a sentence.
 */
export function removeSkillCopy(name: string, isSymlink: boolean): ConfirmCopy {
  return isSymlink
    ? {
        title: `Remove the link to "${name}"?`,
        body: ['The skill itself stays in ~/.agents/skills.'],
        confirmLabel: 'Remove the link',
        cancelLabel: 'Cancel',
        destructive: true
      }
    : {
        title: `Delete "${name}"?`,
        body: ['It moves to the Trash, so you can put it back from Finder.'],
        confirmLabel: 'Move to Trash',
        cancelLabel: 'Cancel',
        destructive: true
      };
}

/**
 * §11 item 4 and the failure table: a command that exits non-zero is reported
 * with the exact command line that ran and the last lines of its output, in the
 * same place the confirm showed that command line before it ran. A subprocess
 * that fails without naming itself is unfixable by the person looking at it.
 */
export function commandFailureCopy(
  operation: string,
  exitCode: number | null,
  timedOut: boolean
): string {
  if (timedOut)
    return `Tortie stopped the ${operation} because it did not finish.`;
  if (exitCode === null) return `The ${operation} did not run.`;
  return `The ${operation} exited ${exitCode}.`;
}

/** The banner, never a modal on project open, because that trains dismissal. */
export function projectArrivalSentence(
  servers: number,
  hooks: number
): string[] {
  const parts: string[] = [];
  if (servers > 0)
    parts.push(`${servers} MCP ${servers === 1 ? 'server' : 'servers'}`);
  if (hooks > 0) parts.push(`${hooks} ${hooks === 1 ? 'hook' : 'hooks'}`);
  if (parts.length === 0) return [];
  return [
    `This project adds ${parts.join(' and ')}.`,
    'They come from the repository, not from you. Review them before enabling.'
  ];
}
