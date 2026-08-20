/**
 * Harness only driver for the LOCAL Runs section (Phase 120 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`localRuns: {…}`) and inert otherwise.
 * It follows ./p105-runs-shot.ts line by line, which is the nearest working
 * sibling and drives the same group for a folder on another machine.
 *
 * ## What the screenshot read has to settle, and why a test cannot
 *
 * Phase 120 puts a run a tag push started into the local Runs list, beside the
 * branch's own runs. The entry's second evidence item is a photograph of the
 * live section drawing five rows at once, being a queued run, a running run,
 * a succeeded run, a failed run, and a running release run whose head branch
 * is a tag name. A unit test can assert a string is in the markup. It cannot
 * say whether the queued glyph and the two spinning glyphs are legible side by
 * side, or whether a tag run's row reads like every other row. So the picture
 * is taken of the real section over the real layout, and this hook is what
 * gets the section open and settled first.
 *
 * ## Driving it, and the one field it is easy to leave out
 *
 * THE SPEC MUST ALSO CARRY `projectPath`, even though this hook does not read
 * it. The base hook in ../editor/shot-hook.ts calls `projects:add` with
 * `spec.projectPath` on every drive, and a spec that omits it sends
 * `undefined` across that channel and puts three error toasts over the
 * picture. That is not this hook's behaviour and this hook cannot prevent it,
 * so it is written down here where the next person taking this screenshot
 * will read it. The project must be a folder on THIS Mac, because the local
 * Runs section is only drawn for a local tab.
 *
 * ## Nothing here asks GitHub anything, and nothing here starts gh
 *
 * THE ANSWER IS SEEDED. The store is handed a canned `ActionsUpdate` of the
 * shape main sends, with `observed` already true, and the section is then
 * expanded through its own toggle button. The section's first expand calls
 * `observe`, and `observe` returns early for a repository already marked
 * observed, so no read is requested, no gh process starts and no network is
 * involved in the picture. That is deliberate: the picture is evidence of the
 * LOOK, and build/probe-p120-merge.mjs is the evidence of the behaviour.
 *
 * What is real in a run: the project tab, the Source Control view, the
 * section, the store, the expand gesture, the glyph table and every sentence
 * drawn. What is supplied: the five rows.
 *
 * ## What it reports
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output, and to `window.__gmuxP120Runs`, which GMUX_SHOT_JS can read
 * back. The report is what the section DREW, read out of the document: the
 * five rows with the status glyph class of each, and the header tooltip text.
 * The seeded head branches ride along so the probe can tie the fifth drawn
 * row to the `v9.9.9` release stand in without trusting the DOM to say it.
 */

import type { ActionsRun, ActionsUpdate } from '@shared/actions';
import { useApp } from '../state/store';
import { emptyRunsRecord, useRuns } from './runs';

export interface LocalRunsProbeSpec {
  /** How long to wait for the section to settle before reading. */
  waitMs?: number;
  /**
   * How long to hold the drawn frame AFTER the readings are out and
   * `window.__gmuxP120Runs` is set. The probe process watches for the
   * `[p120] reading` console line and photographs the window from outside
   * through build/window-shot.mjs during this hold, while the app is still
   * up. Defaults to 0, so a run that only wants the harness capture pays
   * nothing.
   */
  dwellMs?: number;
}

/** One drawn run row, read out of the document. */
export interface LocalRunsRowReading {
  /** The row's own accessible label. */
  label: string;
  /** The workflow name the row draws. */
  name: string;
  /** The glyph's tone class, e.g. `working`. Empty when unreadable. */
  tone: string;
  /** The codicon id inside the glyph, e.g. `sync`. Empty when unreadable. */
  icon: string;
  /** True for the one state that spins, being a run that is under way. */
  spin: boolean;
}

/** What the section drew, read out of the document. */
export interface LocalRunsReading {
  /** True when the section is in the document at all. */
  present: boolean;
  /** True when the group is open. */
  expanded: boolean;
  /** The count in the header, as text. */
  count: string;
  /** The header icon's tooltip, being the one sentence about the newest run. */
  headerTooltip: string;
  /** One entry per drawn run row, in drawn order. */
  rows: LocalRunsRowReading[];
  /** The seeded rows' head branches, in seeded order, for the probe to pin. */
  seededHeadBranches: string[];
}

declare global {
  interface Window {
    __gmuxP120Runs?: LocalRunsReading[];
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** The commit the fixture calls the branch tip. The release run carries it. */
const TIP_SHA = 'aa11bb22cc33dd44ee55ff667788990011223344';

/**
 * The five fixture rows, exactly, per the phase entry:
 *
 *  1. a queued run on the branch, `startedAt` null,
 *  2. a running run on the branch, started a few minutes back,
 *  3. a completed run that succeeded,
 *  4. a completed run that failed,
 *  5. a running run whose head branch is `v9.9.9` and whose head sha is the
 *     fixture tip, standing for the operator's release run.
 *
 * Nothing here is read from github.com and nothing here is claimed to be.
 */
function cannedRuns(now: number): ActionsRun[] {
  const base = {
    event: 'push',
    headBranch: 'main',
    headSha: '1f2e3d4c5b6a798877665544332211aabbccddee'
  };
  return [
    {
      ...base,
      id: 9_101,
      number: 101,
      workflowName: 'gates',
      displayTitle: 'a queued push on the branch',
      status: 'queued',
      statusRaw: 'queued',
      conclusion: null,
      conclusionRaw: null,
      createdAt: now - 2 * 60_000,
      startedAt: null,
      updatedAt: null,
      url: 'https://github.com/itavero/tortie/actions/runs/9101'
    },
    {
      ...base,
      id: 9_102,
      number: 102,
      workflowName: 'gates',
      displayTitle: 'a push the branch is running now',
      status: 'in_progress',
      statusRaw: 'in_progress',
      conclusion: null,
      conclusionRaw: null,
      createdAt: now - 5 * 60_000,
      startedAt: now - 4 * 60_000,
      updatedAt: null,
      url: 'https://github.com/itavero/tortie/actions/runs/9102'
    },
    {
      ...base,
      id: 9_103,
      number: 103,
      workflowName: 'gates',
      displayTitle: 'a push that succeeded',
      status: 'completed',
      statusRaw: 'completed',
      conclusion: 'success',
      conclusionRaw: 'success',
      createdAt: now - 40 * 60_000,
      startedAt: now - 39 * 60_000,
      updatedAt: now - 33 * 60_000,
      url: 'https://github.com/itavero/tortie/actions/runs/9103'
    },
    {
      ...base,
      id: 9_104,
      number: 104,
      workflowName: 'package',
      displayTitle: 'a push that failed',
      status: 'completed',
      statusRaw: 'completed',
      conclusion: 'failure',
      conclusionRaw: 'failure',
      createdAt: now - 70 * 60_000,
      startedAt: now - 69 * 60_000,
      updatedAt: now - 61 * 60_000,
      url: 'https://github.com/itavero/tortie/actions/runs/9104'
    },
    {
      // The release stand in. gh records a tag push run's head branch as the
      // TAG NAME, which is the whole defect Phase 120 fixes, so this is the
      // row the photograph exists to show.
      ...base,
      id: 9_105,
      number: 105,
      workflowName: 'release',
      displayTitle: 'the v9.9.9 release, cut on the branch tip',
      status: 'in_progress',
      statusRaw: 'in_progress',
      conclusion: null,
      conclusionRaw: null,
      headBranch: 'v9.9.9',
      headSha: TIP_SHA,
      createdAt: now - 60_000,
      startedAt: now - 60_000,
      updatedAt: null,
      url: 'https://github.com/itavero/tortie/actions/runs/9105'
    }
  ];
}

/** The text of one node, or the empty string when it is not there. */
function textOf(selector: string): string {
  const el = document.querySelector<HTMLElement>(selector);
  return (el?.textContent ?? '').trim();
}

/** Read the section back out of the document. */
function readSection(seeded: readonly ActionsRun[]): LocalRunsReading {
  const root = document.querySelector('[data-section-root="runs"]');
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-section="runs"] .section-toggle'
  );
  // The header's own status icon is the only `.runs-icon` inside the header
  // div, and it is the only one that carries a title.
  const headerIcon = document.querySelector<HTMLElement>(
    '[data-section="runs"] .runs-icon'
  );
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-section-root="runs"] .runs-row'
    )
  ).map((row): LocalRunsRowReading => {
    const icon = row.querySelector<HTMLElement>('.runs-icon');
    const glyph = icon?.querySelector<HTMLElement>('[class*="codicon-"]');
    const tone = /tone-([a-z]+)/.exec(icon?.className ?? '')?.[1] ?? '';
    const name =
      /codicon-([a-z-]+)/.exec(
        (glyph?.className ?? '').replace('codicon-modifier-spin', '')
      )?.[1] ?? '';
    return {
      label: row.getAttribute('aria-label') ?? '',
      name: (row.querySelector('.runs-name')?.textContent ?? '').trim(),
      tone,
      icon: name,
      spin: glyph?.className.includes('codicon-modifier-spin') === true
    };
  });
  return {
    present: root !== null,
    expanded: toggle?.getAttribute('aria-expanded') === 'true',
    count: textOf('[data-section="runs"] .section-count'),
    headerTooltip: headerIcon?.getAttribute('title') ?? '',
    rows,
    seededHeadBranches: seeded.map((r) => r.headBranch)
  };
}

/**
 * Seed one answer, open the group, and report what it drew.
 *
 * The expand is pressed through the section's own toggle button rather than by
 * writing the stored answer, so the picture is of the real control in its real
 * state. The record is seeded with `observed` true, which is what makes the
 * first expand ask nothing of anybody.
 */
export async function driveLocalRuns(
  spec: LocalRunsProbeSpec
): Promise<LocalRunsReading[]> {
  const waitMs = spec.waitMs ?? 8_000;
  const readings: LocalRunsReading[] = [];

  useApp.getState().showSidebarView('scm');
  await wait(400);

  const project = useApp.getState().activeProject();
  if (project === null) {
    console.log('[p120] no active project, so there is no section to read');
    window.__gmuxP120Runs = readings;
    return readings;
  }
  if ((project.machineId ?? 'local') !== 'local') {
    console.log(
      '[p120] the active tab is on another machine, and the local Runs ' +
        'section is not drawn there'
    );
    window.__gmuxP120Runs = readings;
    return readings;
  }
  // The section's store key is the tab's own path, being what ScmSection
  // passes as `repoPath` for a local target.
  const repoPath = project.path;

  const now = Date.now();
  const runs = cannedRuns(now);
  const update: ActionsUpdate = {
    repoPath,
    branch: 'main',
    ownerRepo: 'itavero/tortie',
    runs,
    lastCheckedAt: now,
    health: { state: 'ready' },
    watch: { phase: 'idle', sha: null, stop: null },
    issues: []
  };
  const seed = (): void => {
    useRuns.setState((s) => ({
      repos: {
        ...s.repos,
        [repoPath]: {
          ...(s.repos[repoPath] ?? emptyRunsRecord),
          // Observed already, so the expand below finds nothing to start.
          observed: true,
          loading: false,
          update
        }
      }
    }));
  };
  seed();
  await wait(200);

  // Open the group through its own control. A section that is already open is
  // left alone, so a second run of the probe does not close it.
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const toggle = document.querySelector<HTMLButtonElement>(
      '[data-section="runs"] .section-toggle'
    );
    if (toggle === null) {
      await wait(100);
      continue;
    }
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    break;
  }
  await wait(500);

  // Seed once more before reading. A debounced `git:changed` for an observed
  // repository triggers a real read, and while the scratch repository never
  // changes during a run, a stray event would overwrite the fixture with a
  // real answer. Re-seeding makes the read below a read of the fixture, and
  // the row count check makes any later swap loud rather than silent.
  seed();
  await wait(200);

  readings.push(readSection(runs));
  for (const [i, reading] of readings.entries()) {
    console.log(`[p120] reading ${String(i + 1)}: ${JSON.stringify(reading)}`);
  }
  const last = readings[readings.length - 1];
  if (last !== undefined && last.rows.length !== runs.length) {
    console.log(
      `[p120] FAIL the section drew ${String(last.rows.length)} rows and the ` +
        `fixture seeded ${String(runs.length)}`
    );
  }

  window.__gmuxP120Runs = readings;
  const dwellMs = spec.dwellMs ?? 0;
  if (dwellMs > 0) {
    console.log(`[p120] holding the frame for ${String(dwellMs)} ms`);
    await wait(dwellMs);
  }
  return readings;
}
