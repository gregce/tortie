/**
 * Harness only driver for the Runs group on a tab whose folder is on another
 * machine (Phase 105 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`remoteRuns: {…}`) and inert otherwise.
 * It follows ../app/p100-lines-shot.ts, which is the nearest working sibling.
 *
 * ## What the screenshot read has to settle, and why a test cannot
 *
 * Seven things are read off the image and every one of them is a sentence or a
 * position that a person has to be able to find. A unit test can assert that a
 * string is in the markup. It cannot say whether the band above the group is
 * legible, whether the six honesty sentences fit under the rows without being
 * clipped, whether a run row reads as a thing that opens rather than a thing
 * that expands, or whether this group's spacing matches the Changes group three
 * inches above it. So the picture is taken of the real section over the real
 * layout, and this hook is what gets the section open and settled first.
 *
 * ## The clipping measurement, and why the fix round added it
 *
 * The first verifier read this section at ten rows and found that two of the
 * honesty sentences were drawn inside the group's own scrolling body, which is
 * capped at 45% of the column. The body was 310 px tall over 352 px of content.
 * The sentence reading "These are the newest 10 runs for that branch. There are
 * older ones." spanned y 683 to 727 and the body ended at y 691, so 36 of its
 * 44 px were hidden. The sentence saying the list was cut was itself cut.
 * `clipped` and `captionsInsideBody` below are that reading turned into two
 * numbers the probe prints on every run, so the same defect cannot come back
 * silently. Both must be empty and false.
 *
 * ## Driving it, and the one field it is easy to leave out
 *
 * THE SPEC MUST ALSO CARRY `projectPath`, even though this hook does not read
 * it. The base hook in ../editor/shot-hook.ts calls `projects:add` with
 * `spec.projectPath` on every drive, and a spec that omits it sends `undefined`
 * across that channel and puts three error toasts over the picture. That is not
 * this hook's behaviour and this hook cannot prevent it, so it is written down
 * here where the next person taking this screenshot will read it.
 *
 * ## Nothing here asks a machine anything, and nothing here starts gh
 *
 * THE ANSWER IS SEEDED. The store is handed a canned answer of the shape main
 * sends, and the section is then expanded through its own toggle button. The
 * section's first expand calls `ensure`, and `ensure` returns early for a target
 * that already holds an answer, so no request is made, no machine is contacted
 * and no gh process is created. That is deliberate: the picture is evidence of
 * the LOOK, and build/probe-p105-runs.mjs is the evidence of the behaviour.
 *
 * What is real in a run: the project tab, the Source Control view, the section,
 * the store, the collapse gesture and every sentence drawn. What is supplied:
 * the rows and the mode word.
 *
 * ## What it reports
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output, and to `window.__gmuxP105Runs`, which GMUX_SHOT_JS can read back. The
 * report is what the section DREW, read out of the document, because that is the
 * only reading that settles a sentence. The store's mode word is not the
 * sentence a person reads.
 */

import type { ActionsHealth, ActionsRun } from '@shared/actions';
import type { MachineRunsMode } from '@shared/ipc';
import { useApp } from '../state/store';
import { useRemoteRuns } from './remote-runs';

export interface RemoteRunsProbeSpec {
  /**
   * Open this folder on this machine as a tab first, and make it the active
   * one. Omitted means the tab that is already active is used.
   */
  project?: { machineId: string; path: string };
  /** The mode word to seed. Defaults to `ok`. */
  mode?: MachineRunsMode;
  /** How many canned run rows to seed. Defaults to 3. */
  rows?: number;
  /**
   * The row limit to seed.
   *
   * Setting it equal to `rows` is how the "these are the newest N" sentence is
   * drawn at all, which is the one honesty sentence that is not always drawn.
   * Defaults to 10, which is the local section's own default.
   */
  limit?: number;
  /** Seed this gh rung instead of `ready`, e.g. to draw the sign in sentence. */
  health?: ActionsHealth;
  /** How long to wait for the section to settle before reading. */
  waitMs?: number;
}

/** What the section drew, read out of the document. */
export interface RemoteRunsReading {
  /** True when the section is in the document at all. */
  present: boolean;
  /** True when the group is open. */
  expanded: boolean;
  /** The band above the group, or the empty string when it is not drawn. */
  band: string;
  /** The count in the header, as text. */
  count: string;
  /** One entry per run row, being the row's own label. */
  rowLabels: string[];
  /** How many rows draw a chevron. It must be zero. */
  chevrons: number;
  /**
   * Every note drawn INSIDE the group's scrolling body, in order.
   *
   * That is the bridge sentence, the reading sentence, the one mode sentence
   * and gh's own rung. Every sentence about the list as a whole is drawn below
   * the section instead, and each of those has its own field here.
   */
  notes: string[];
  /** The sentence naming the branch and the commit, or the empty string. */
  branchLine: string;
  /** The sentence naming when it was read, or the empty string. */
  readAtLine: string;
  /** The sentence saying the list does not refresh, or the empty string. */
  notLive: string;
  /** The sentence saying the steps are elsewhere, or the empty string. */
  stepsElsewhere: string;
  /** The sentence saying these are the newest N, or the empty string. */
  newest: string;
  /**
   * Which sentences about the whole list are not fully visible, by selector.
   *
   * It must be empty. A sentence is counted as clipped when its box falls
   * outside the window or outside any ancestor that does not have visible
   * overflow. The second half is the one that mattered, because the sentences
   * were on the page and inside a body that scrolls.
   */
  clipped: string[];
  /**
   * True when either list caption is still drawn inside the scrolling body.
   *
   * It must be false. This is the cheap form of the reading above and it does
   * not depend on how tall the window is.
   */
  captionsInsideBody: boolean;
  /**
   * Whether the sentence saying which sections are absent still REFUSES runs.
   *
   * It must not. Phase 105 rewrote it, and the sentence names runs among the
   * things Tortie does show for a folder on another machine.
   */
  absentSentenceRefusesRuns: boolean;
  /** The whole sentence that says which sections are absent. */
  absentSentence: string;
}

declare global {
  interface Window {
    __gmuxP105Runs?: RemoteRunsReading[];
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Every sentence this group says about the list as a whole, by selector, in the
 * order they are drawn. None of them may sit inside the body that scrolls.
 */
const WHOLE_LIST_SENTENCES = [
  '.runs-hidden',
  '.runs-steps-elsewhere',
  '.runs-newest',
  '.runs-branch-line',
  '.runs-read-at',
  '.runs-not-live'
];

/**
 * Which of those sentences the layout engine is not showing in full.
 *
 * The window is one bound. Every ancestor whose overflow is not visible is
 * another, and that is the bound the defect lived under. A sentence with no box
 * at all counts as clipped, because a person cannot read it either.
 */
function clippedSentences(): string[] {
  const out: string[] = [];
  for (const selector of WHOLE_LIST_SENTENCES) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el === null) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) {
      out.push(selector);
      continue;
    }
    let top = 0;
    let bottom = window.innerHeight;
    let parent: HTMLElement | null = el.parentElement;
    while (parent !== null) {
      const style = getComputedStyle(parent);
      if (style.overflowY !== 'visible' || style.overflowX !== 'visible') {
        const box = parent.getBoundingClientRect();
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
      parent = parent.parentElement;
    }
    if (rect.top < top - 0.5 || rect.bottom > bottom + 0.5) out.push(selector);
  }
  return out;
}

/** The text of one node, or the empty string when it is not there. */
function textOf(selector: string): string {
  const el = document.querySelector<HTMLElement>(selector);
  return (el?.textContent ?? '').trim();
}

/**
 * One canned run row.
 *
 * The fields are the ones the row draws, and the rest are the neutral values
 * the parser produces for a row gh sent in full. Nothing here is read from
 * github.com and nothing here is claimed to be.
 */
function cannedRun(index: number, now: number): ActionsRun {
  const finished = index % 3 !== 0;
  return {
    id: 9_000 + index,
    number: 100 + index,
    workflowName: index % 2 === 0 ? 'gates' : 'package',
    displayTitle: `a commit on the branch over there, number ${String(index)}`,
    status: finished ? 'completed' : 'in_progress',
    statusRaw: finished ? 'completed' : 'in_progress',
    conclusion: finished ? (index % 4 === 1 ? 'failure' : 'success') : null,
    conclusionRaw: finished ? (index % 4 === 1 ? 'failure' : 'success') : null,
    event: 'push',
    headBranch: 'main',
    headSha: '1f2e3d4c5b6a798877665544332211aabbccddee',
    createdAt: now - (index + 1) * 600_000,
    startedAt: now - (index + 1) * 600_000 + 5_000,
    updatedAt: finished ? now - (index + 1) * 600_000 + 240_000 : null,
    url: `https://github.com/itavero/tortie/actions/runs/${String(9_000 + index)}`
  };
}

/** Read the section back out of the document. */
function readSection(): RemoteRunsReading {
  const root = document.querySelector('[data-section-root="remote-runs"]');
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-section="remote-runs"] .section-toggle'
  );
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-section-root="remote-runs"] .runs-row'
    )
  );
  const notes = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-section-root="remote-runs"] .runs-note'
    )
  ).map((n) => (n.textContent ?? '').trim());
  // The last note in the Source Control view is the one that says which
  // sections are not on screen. Phase 105 rewrote it and it must no longer
  // name runs.
  const absentNodes = Array.from(
    document.querySelectorAll<HTMLElement>('.scm-remote-note')
  ).map((n) => (n.textContent ?? '').trim());
  const absent = absentNodes[absentNodes.length - 1] ?? '';
  return {
    present: root !== null,
    expanded: toggle?.getAttribute('aria-expanded') === 'true',
    band: textOf('.runs-band'),
    count: textOf('[data-section="remote-runs"] .section-count'),
    rowLabels: rows.map((r) => r.getAttribute('aria-label') ?? ''),
    chevrons: rows.filter(
      (r) => r.querySelector('.runs-chevron') !== null
    ).length,
    notes,
    branchLine: textOf('.runs-branch-line'),
    readAtLine: textOf('.runs-read-at'),
    notLive: textOf('.runs-not-live'),
    stepsElsewhere: textOf('.runs-steps-elsewhere'),
    newest: textOf('.runs-newest'),
    clipped: clippedSentences(),
    captionsInsideBody:
      document.querySelector('.runs-body .runs-steps-elsewhere') !== null ||
      document.querySelector('.runs-body .runs-newest') !== null,
    absentSentenceRefusesRuns: /does not show[^.]*\bruns\b/i.test(absent),
    absentSentence: absent
  };
}

/**
 * Seed one answer, open the group, and report what it drew.
 *
 * Every gesture is one a person makes. The collapse is pressed through the
 * section's own toggle button rather than by writing the stored answer, so the
 * picture is of the real control in its real state.
 */
export async function driveRemoteRuns(
  spec: RemoteRunsProbeSpec
): Promise<RemoteRunsReading[]> {
  const waitMs = spec.waitMs ?? 8_000;
  const readings: RemoteRunsReading[] = [];

  if (spec.project !== undefined) {
    const target = spec.project;
    // A tab for this folder on this machine may already be open, from a
    // previous run against the same profile. Making it active is the gesture a
    // person makes and it asks the machine nothing, so it is tried first.
    const already = useApp
      .getState()
      .projects.find(
        (p) => (p.machineId ?? 'local') === target.machineId && p.path === target.path
      );
    if (already !== undefined) {
      useApp.getState().setActiveProject(already.id);
      console.log(`[p105] the tab for ${target.path} was already open`);
      await wait(800);
    } else {
      // OPENING IT IS A REAL READ OF THAT MACHINE, and main refuses it while
      // the machine has not connected yet. That refusal is a state a harness
      // run passes THROUGH rather than a failure, because the app connects to
      // its machines a moment after it boots. So this waits for it, says which
      // reason came back, and only gives up at the deadline.
      const deadline = Date.now() + waitMs;
      let reason = 'no attempt was made';
      let opened = false;
      while (Date.now() < deadline) {
        const result = await useApp.getState().openTargetProject(target);
        if (result.ok) {
          opened = true;
          break;
        }
        reason =
          result.kind === 'remote' ? result.reason : (result.kind ?? 'unknown');
        await wait(500);
      }
      if (!opened) {
        console.log(
          `[p105] FAILED: could not open ${target.path} on ` +
            `${target.machineId} as a tab, and the last reason was ${reason}`
        );
        window.__gmuxP105Runs = readings;
        return readings;
      }
      await wait(1200);
    }
  }

  useApp.getState().showSidebarView('scm');
  await wait(400);

  const project = useApp.getState().activeProject();
  if (project === null) {
    console.log('[p105] no active project, so there is no section to read');
    window.__gmuxP105Runs = readings;
    return readings;
  }
  const machineId = project.machineId ?? 'local';
  if (machineId === 'local') {
    console.log(
      '[p105] the active tab is on this Mac, so this section is not drawn'
    );
    window.__gmuxP105Runs = readings;
    return readings;
  }

  const now = Date.now();
  const mode = spec.mode ?? 'ok';
  const count = spec.rows ?? 3;
  const limit = spec.limit ?? 10;
  const runs = mode === 'ok' ? Array.from({ length: count }, (_, i) => cannedRun(i, now)) : [];
  const key = `${machineId}:${project.path}`;
  useRemoteRuns.setState((s) => ({
    byTarget: {
      ...s.byTarget,
      [key]: {
        machineId,
        path: project.path,
        machineLabel: '',
        mode,
        ownerRepo: mode === 'ok' ? 'itavero/tortie' : null,
        branch: mode === 'ok' ? 'main' : null,
        headSha: mode === 'ok' ? '1f2e3d4c5b6a798877665544332211aabbccddee' : null,
        limit,
        runs,
        issues: [],
        health: spec.health ?? { state: 'ready' },
        loading: false,
        refreshing: false,
        readAt: now,
        elapsedMs: 512
      }
    }
  }));
  await wait(200);

  // Open the group through its own control. A section that is already open is
  // left alone, so a second run of the probe does not close it.
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const toggle = document.querySelector<HTMLButtonElement>(
      '[data-section="remote-runs"] .section-toggle'
    );
    if (toggle === null) {
      await wait(100);
      continue;
    }
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    break;
  }
  await wait(500);

  readings.push(readSection());
  for (const [i, reading] of readings.entries()) {
    console.log(`[p105] reading ${String(i + 1)}: ${JSON.stringify(reading)}`);
  }
  const last = readings[readings.length - 1];
  if (last !== undefined && last.chevrons > 0) {
    console.log(
      `[p105] FAIL ${String(last.chevrons)} run rows drew a chevron, and a row ` +
        'that opens a page must draw none'
    );
  }
  if (last !== undefined && last.absentSentenceRefusesRuns) {
    console.log(
      '[p105] FAIL the sentence saying which sections are absent still refuses runs'
    );
  }
  if (last !== undefined && last.captionsInsideBody) {
    console.log(
      '[p105] FAIL a sentence about the whole list is inside the body that scrolls'
    );
  }
  if (last !== undefined && last.clipped.length > 0) {
    console.log(
      `[p105] FAIL ${String(last.clipped.length)} sentences about the whole ` +
        `list are not fully on screen, being ${last.clipped.join(', ')}`
    );
  }

  window.__gmuxP105Runs = readings;
  return readings;
}
