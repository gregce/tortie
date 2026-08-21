/**
 * The Phase 97 harness drive, being how the Source Control panel's two groups
 * are photographed without a second computer.
 *
 * ## What the phase claims, and what this file measures
 *
 * The claim is that a folder on another machine now lists the files git is not
 * yet tracking, under their own group row, beside the tracked ones. This drive
 * seeds one answer of that shape and hands the probe what the running app then
 * drew, so `build/probe-p97-untracked.mjs` can compare the drawing with the
 * answer rather than with a description of the answer.
 *
 * It also reads the activity rail's Source Control badge in the same frame,
 * because the fix round's blocking defect was that the badge and the section
 * header stated two different numbers for one folder at one moment.
 *
 * ## What it does NOT prove, and the report has to say so
 *
 * IT SUPPLIES THE ANSWER. Nothing is signed in to the machine it names, no far
 * side is contacted, and no git command runs anywhere. What is proven here is
 * what Tortie DRAWS for such an answer. That a real folder on a real machine
 * produces such an answer is proven by `npm run probe:remotereview` against a
 * loopback scratch machine, which reads a real repository with a real untracked
 * file and a real ignored one in it.
 *
 * ## How it is reached
 *
 * It assigns exactly one function to `window` and changes no behaviour, exactly
 * like `../app/remote-boot-drive.ts` and `../app/target-shot-drive.ts` do.
 * Outside the harness it is one unused property. `./ScmSection.tsx` registers
 * it, because that module is the one the Source Control view always loads, and
 * the probe calls it through `GMUX_SHOT_JS`.
 *
 * ## Why the deleted sentence is not written down in this file
 *
 * This module ships inside the production renderer bundle. Any sentence it
 * names is therefore greppable in `out/renderer`, including one the phase
 * deleted from the product. The caller supplies those words instead, through
 * `absentMarks`, so `build/probe-p97-untracked.mjs` is the only file that holds
 * them and a grep of the build output finds the sentence nowhere.
 *
 * ## Why the seeded entry is written before the tab is opened
 *
 * `RemoteScmSection` calls `ensure` when it mounts, and `ensure` reads a target
 * that has never been read. An entry whose `readAt` is already above zero is
 * one it leaves alone, so seeding first is what keeps the panel from replacing
 * these rows with the sentence saying that machine did not answer.
 */

import type { Project } from '@shared/types';
import type { MachineReviewFile, MachineStateView } from '@shared/ipc';
import { targetKey, type WorkspaceTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { remoteChangesAvailable, useRemoteChanges } from './remote-changes';

export interface P97UntrackedSpec {
  /** The machine id the injected tab claims. Defaults to `p97far`. */
  machineId?: string;
  /** The label that machine reports. Defaults to `Studio`. */
  label?: string;
  /** Milliseconds to let the panel settle before it is read. Defaults to 900. */
  settleMs?: number;
  /**
   * Sentences that must be on no part of the screen, supplied by the caller.
   *
   * THE WORDS LIVE IN THE PROBE, NOT HERE, and the fix round moved them there
   * on purpose. This module ships inside the production renderer bundle, the
   * way `p93-attention-drive.ts` and `p96-remote-surfaces-drive.ts` do. When it
   * held a fragment of the sentence Phase 97 deleted, a person grepping
   * `out/renderer` for that sentence got a hit off the checker rather than off
   * the product, and had to read this file to learn the hit was harmless. Now
   * the deleted words appear in `build/probe-p97-untracked.mjs` and nowhere in
   * anything Tortie ships.
   */
  absentMarks?: readonly string[];
}

/** One group as the panel drew it, read back out of the document. */
export interface P97GroupReading {
  /** The words in the group row, or null when no such row is on screen. */
  label: string | null;
  /** The number beside those words, or null. */
  count: number | null;
}

export interface P97UntrackedResult {
  ok: boolean;
  why?: string;
  /** True when this build can read what changed on another machine at all. */
  available?: boolean;
  machineId?: string;
  label?: string;
  /** What the drive put in the store. */
  seeded?: { tracked: number; untracked: number };
  /** The number in the section header. */
  headerCount?: number | null;
  /** The two group rows, in the order the panel drew them. */
  groups?: P97GroupReading[];
  /** Every row's file name, in the order the panel drew them. */
  rows?: string[];
  /** The rows whose badge is a green U, by file name. */
  untrackedBadges?: string[];
  /** How many marks the caller asked about. Zero means nothing was checked. */
  absentMarksGiven?: number;
  /** The marks that ARE on screen. Empty is the passing answer. */
  absentMarksOnScreen?: string[];
  /** The number on the activity rail's Source Control badge, or null. */
  railBadge?: number | null;
  /** The accessible name of the activity rail's Source Control item. */
  railLabel?: string | null;
}

declare global {
  interface Window {
    __gmuxP97Untracked?: (
      spec?: P97UntrackedSpec
    ) => Promise<P97UntrackedResult>;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * The two tracked files the seeded answer holds.
 *
 * PHASE 103 ADDED THE PAIR git prints for each of them. Both are edits nobody
 * has staged, being the pair `.M`, so both land in the Changes group and this
 * drive's own reading is unchanged.
 */
const TRACKED: readonly MachineReviewFile[] = [
  {
    path: 'src/auth.ts',
    origPath: null,
    status: 'M',
    indexState: '.',
    worktreeState: 'M'
  },
  {
    path: 'src/router.ts',
    origPath: null,
    status: 'M',
    indexState: '.',
    worktreeState: 'M'
  }
];

/**
 * The three untracked files the seeded answer holds.
 *
 * Their letter is `A`, which is what main sends for a file git has never seen,
 * because against the last commit such a file is an addition. The panel never
 * reads that letter for these rows. The group decides the badge.
 */
const UNTRACKED: readonly MachineReviewFile[] = [
  {
    path: 'src/agent-notes.md',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  },
  {
    path: 'src/scratch/plan.txt',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  },
  {
    path: 'tools/p97-new.ts',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  }
];

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim();
}

function numberOf(el: Element | null | undefined): number | null {
  const raw = textOf(el);
  if (raw === '') return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The Source Control panel as it stands right now, read out of the document. */
function readPanel(absentMarks: readonly string[]): {
  headerCount: number | null;
  groups: P97GroupReading[];
  rows: string[];
  untrackedBadges: string[];
  absentMarksGiven: number;
  absentMarksOnScreen: string[];
  railBadge: number | null;
  railLabel: string | null;
} {
  const section = document.querySelector('[data-section-root="changes"]');
  const headerCount = numberOf(section?.querySelector('.section-count'));
  const groups: P97GroupReading[] = [];
  for (const row of Array.from(
    section?.querySelectorAll('.scm-group-row') ?? []
  )) {
    groups.push({
      label: textOf(row.querySelector('.scm-group-label')) || null,
      count: numberOf(row.querySelector('.scm-group-count'))
    });
  }
  const rows: string[] = [];
  const untrackedBadges: string[] = [];
  for (const row of Array.from(section?.querySelectorAll('.scm-hfile') ?? [])) {
    const name = textOf(row.querySelector('.scm-row-name'));
    rows.push(name);
    const badge = row.querySelector('.scm-badge');
    if (
      textOf(badge) === 'U' &&
      badge?.classList.contains('scm-badge-added') === true
    ) {
      untrackedBadges.push(name);
    }
  }
  // The activity rail, read in the same frame as the panel. THE FIX ROUND
  // ADDED THIS. A verifier photographed a rail badge of 2 beside a section
  // header of 5, so the two numbers are now read together and compared.
  const scmItem =
    Array.from(
      document.querySelectorAll('[data-slot="activity-bar"] .ab-item')
    ).find((el) =>
      (el.getAttribute('aria-label') ?? '').startsWith('Source control')
    ) ?? null;

  const onScreen = document.body.innerText;
  return {
    railBadge: numberOf(scmItem?.querySelector('.ab-badge')),
    railLabel: scmItem?.getAttribute('aria-label') ?? null,
    headerCount,
    groups,
    rows,
    untrackedBadges,
    absentMarksGiven: absentMarks.length,
    absentMarksOnScreen: absentMarks.filter((mark) => onScreen.includes(mark))
  };
}

export function registerP97UntrackedDrive(): void {
  window.__gmuxP97Untracked = async (
    spec?: P97UntrackedSpec
  ): Promise<P97UntrackedResult> => {
    const machineId = spec?.machineId ?? 'p97far';
    const label = spec?.label ?? 'Studio';
    const settleMs = spec?.settleMs ?? 900;
    const absentMarks = spec?.absentMarks ?? [];

    const app = useApp.getState();
    const localProject = app.activeProject();
    if (localProject === null) {
      return {
        ok: false,
        why: 'no active project, so there is no window to inject a tab into'
      };
    }

    const target: WorkspaceTarget = {
      machineId,
      path: localProject.path
    };
    const key = targetKey(target);
    const machineRow: MachineStateView = {
      id: machineId,
      label,
      color: 'magenta',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: Date.now(),
      detail: null
    };
    const injectedProject: Project = {
      id: `${machineId}-p97`,
      path: localProject.path,
      name: `${localProject.name} on ${label}`,
      machineId
    };

    // The answer, seeded BEFORE the tab is opened. See the header.
    useRemoteChanges.setState((now) => ({
      byTarget: {
        ...now.byTarget,
        [key]: {
          machineId,
          path: localProject.path,
          repoPath: localProject.path,
          files: [...TRACKED],
          total: TRACKED.length,
          untracked: [...UNTRACKED],
          untrackedTotal: UNTRACKED.length,
          note: null,
          notRepo: false,
          loading: false,
          refreshing: false,
          failed: false,
          readAt: Date.now(),
          // PHASE 103. No write has run on this seeded entry, so the panel
          // draws no sentence under its rows.
          writing: false,
          writeVerb: null,
          writeOutcome: null,
          writeRefusal: null,
          // PHASE 104 ADDED NINE FIELDS TO THIS ENTRY, and a seeded one has to
          // carry all of them. None of them changes what this drive is about:
          // the sha is empty, no commit has run and no check has run.
          headSha: '',
          committing: false,
          commitOutcome: null,
          commitSentences: [],
          commitMachineSaid: null,
          commitGuardSha: '',
          checking: false,
          checkOutcome: null,
          checkHeadSha: ''
        }
      }
    }));

    useApp.setState({
      projects: [...useApp.getState().projects, injectedProject],
      machineStates: [...useApp.getState().machineStates, machineRow]
    });
    useApp.getState().setActiveProject(injectedProject.id);
    useApp.getState().setSidebarView('scm');
    await wait(settleMs);

    // The tab, its machine row and its rows all stay, so the screenshot the
    // harness takes next photographs this state.
    return {
      ok: true,
      available: remoteChangesAvailable(),
      machineId,
      label,
      seeded: { tracked: TRACKED.length, untracked: UNTRACKED.length },
      ...readPanel(absentMarks)
    };
  };
}
