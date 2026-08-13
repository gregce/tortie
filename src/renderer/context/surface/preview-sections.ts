/**
 * The preview card's sections, in order — and the order is the argument
 * (research 29 §7.6).
 *
 * The operator's fourth requirement for this phase is that the
 * executable-content scan runs and is SHOWN BEFORE the install control, not
 * after it. That is a claim about layout, which normally means it can only be
 * checked by looking at a screenshot. So the order lives here as data, the
 * component renders by mapping over `PREVIEW_SECTION_ORDER` and puts its
 * primary control after the map, and a test asserts the positions. The
 * requirement is then executable rather than observed.
 *
 * The six sections, and why each one is where it is:
 *
 *   what-runs    what the static scan found, first, because it is the fact the
 *                decision turns on and it is invisible everywhere else
 *   where-from   owner/repo, the resolved commit, the licence
 *   scanned-by   the four-scanner row with its scan date, or "Not scanned"
 *   cost         the always-on token estimate, labelled an estimate
 *   who-gets-it  the agent picker, with unreachable agents disabled and the
 *                reason on each one
 *   command      the exact child-process command line, copyable
 *
 * Then, and only then, the install control.
 */

import type { ContextExecutableScan } from '../model';
import { auditSentence, isElevatedRisk, worstRisk } from './audit';
import { formatCommandLine } from './command-line';
import {
  commandFindings,
  hasExecutableContent,
  whatRunsSentence
} from './executable-scan';
import type { InstallPlan, InstallTarget, PreviewSubject } from './model';

export type PreviewSectionId =
  | 'what-runs'
  | 'where-from'
  | 'scanned-by'
  | 'cost'
  | 'who-gets-it'
  | 'command';

export const PREVIEW_SECTION_ORDER: readonly PreviewSectionId[] = [
  'what-runs',
  'where-from',
  'scanned-by',
  'cost',
  'who-gets-it',
  'command'
];

/**
 * The install control renders after every section, so its position is the
 * length of the order. Exported so the assertion in the test reads as the
 * requirement rather than as a number somebody has to look up.
 */
export const INSTALL_CONTROL_POSITION = PREVIEW_SECTION_ORDER.length;

export type LineTone = 'normal' | 'muted' | 'warning';

export interface PreviewLine {
  text: string;
  tone: LineTone;
  mono?: boolean;
}

export interface PreviewSection {
  id: PreviewSectionId;
  label: string;
  lines: PreviewLine[];
}

const LABELS: Record<PreviewSectionId, string> = {
  'what-runs': 'What runs',
  'where-from': 'Where it comes from',
  'scanned-by': 'What it has been scanned by',
  cost: 'What it will cost',
  'who-gets-it': 'Who gets it',
  command: 'The command'
};

function whatRunsLines(scan: ContextExecutableScan | null): PreviewLine[] {
  const loud = hasExecutableContent(scan);
  const lines: PreviewLine[] = [
    { text: whatRunsSentence(scan), tone: loud ? 'warning' : 'normal' }
  ];
  if (scan !== null) {
    for (const finding of commandFindings(scan)) {
      lines.push({ text: finding.detail, tone: 'warning', mono: true });
    }
  }
  return lines;
}

function whereFromLines(subject: PreviewSubject): PreviewLine[] {
  const lines: PreviewLine[] = [
    { text: subject.source, tone: 'normal', mono: true }
  ];
  if (subject.commit !== null) {
    lines.push({ text: `commit ${subject.commit}`, tone: 'muted', mono: true });
  }
  lines.push({
    text: subject.license ?? 'Licence unknown.',
    tone: subject.license === null ? 'warning' : 'muted'
  });
  return lines;
}

function scannedByLines(subject: PreviewSubject, now: number): PreviewLine[] {
  const worst = worstRisk(subject.audit);
  return [
    {
      text: auditSentence(subject.audit, now),
      tone:
        subject.audit === null || isElevatedRisk(worst) ? 'warning' : 'normal'
    }
  ];
}

function costLines(subject: PreviewSubject): PreviewLine[] {
  const estimate = subject.tokenEstimate;
  if (estimate === null) {
    return [
      {
        text: 'Tortie cannot estimate what this adds to a session.',
        tone: 'muted'
      }
    ];
  }
  if (estimate.kind === 'measured' && estimate.tokens !== null) {
    return [
      {
        text: `About ${estimate.tokens.toLocaleString()} tokens added to every session.`,
        tone: 'normal'
      }
    ];
  }
  return [
    {
      text: `Estimate: ${estimate.descriptionBytes.toLocaleString()} bytes of description across ${estimate.fileCount} ${
        estimate.fileCount === 1 ? 'file' : 'files'
      }.`,
      tone: 'muted'
    }
  ];
}

function whoGetsItLines(targets: readonly InstallTarget[]): PreviewLine[] {
  return targets
    .filter((t) => t.unavailableReason !== null)
    .map((t) => ({
      text: `${t.agentName}: ${t.unavailableReason ?? ''}`,
      tone: 'muted' as LineTone
    }));
}

function commandLines(plan: InstallPlan | null): PreviewLine[] {
  if (plan === null) {
    return [
      { text: 'Choose at least one agent to see the command.', tone: 'muted' }
    ];
  }
  return [
    { text: formatCommandLine(plan), tone: 'normal', mono: true },
    { text: `Working directory: ${plan.cwd}`, tone: 'muted', mono: true }
  ];
}

/**
 * Build every section, in order. The component never reorders and never
 * inserts, so what this returns is what is rendered.
 */
export function previewSections(
  subject: PreviewSubject,
  targets: readonly InstallTarget[],
  plan: InstallPlan | null,
  now: number = Date.now()
): PreviewSection[] {
  return PREVIEW_SECTION_ORDER.map((id): PreviewSection => {
    switch (id) {
      case 'what-runs':
        return { id, label: LABELS[id], lines: whatRunsLines(subject.scan) };
      case 'where-from':
        return { id, label: LABELS[id], lines: whereFromLines(subject) };
      case 'scanned-by':
        return { id, label: LABELS[id], lines: scannedByLines(subject, now) };
      case 'cost':
        return { id, label: LABELS[id], lines: costLines(subject) };
      case 'who-gets-it':
        return { id, label: LABELS[id], lines: whoGetsItLines(targets) };
      case 'command':
        return { id, label: LABELS[id], lines: commandLines(plan) };
    }
  });
}
