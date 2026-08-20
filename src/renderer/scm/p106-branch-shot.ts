/**
 * Harness only driver for the Branch group on a tab whose folder is on another
 * machine (Phase 106 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`remoteBranch: {…}`) and inert
 * otherwise. It follows ./p105-runs-shot.ts, which is the nearest working
 * sibling and which this group was written from.
 *
 * ## What the screenshot read has to settle, and why a test cannot
 *
 * Three things are read off the image and none of them is a string a unit test
 * can compare. The first is whether the four sentences below the group fit
 * under it without being clipped, which is a measurement in pixels against the
 * bottom edge of the group's own scrolling body. The second is whether this
 * group reads as one item in a column that already holds Changes and Runs. The
 * third is whether the group offers anything a person could press to switch a
 * branch, which is counted here as elements rather than asserted in prose.
 *
 * ## The clipping measurement, and where it comes from
 *
 * Phase 105's verifier read the group below this one at ten rows and found two
 * of its honesty sentences drawn inside a body that is capped at 45% of the
 * column and scrolls. The body was 310 px tall over 352 px of content, the
 * sentence saying the list had been cut spanned y 683 to 727, the body ended at
 * y 691, and 36 of that sentence's 44 px were hidden. `clipped` and
 * `captionsInsideBody` below are that reading turned into two numbers this
 * probe prints on every run. Both must be empty and false.
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
 * ## Nothing here asks a machine anything
 *
 * THE ANSWER IS SEEDED. The store is handed a canned answer of the shape main
 * sends, and the group is then expanded through its own toggle button. The
 * group's first expand calls `ensure`, and `ensure` returns early for a target
 * that already holds an answer, so no request is made and no machine is
 * contacted. That is deliberate. The picture is evidence of the LOOK, and
 * build/probe-p106-branch.mjs is the evidence of the behaviour.
 *
 * What is real in a run: the project tab, the Source Control view, the group,
 * the store, the collapse gesture and every sentence drawn. What is supplied:
 * the mode word, the branch, the upstream and the two counts.
 *
 * ## What it reports
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output, and to `window.__gmuxP106Branch`, which GMUX_SHOT_JS can read back.
 * The report is what the group DREW, read out of the document, because that is
 * the only reading that settles a sentence.
 */

import type { MachineBranchMode } from '@shared/ipc';
import { useApp } from '../state/store';
import { useRemoteBranch } from './remote-branch';

export interface RemoteBranchProbeSpec {
  /**
   * Open this folder on this machine as a tab first, and make it the active
   * one. Omitted means the tab that is already active is used.
   */
  project?: { machineId: string; path: string };
  /**
   * One reading per mode, in order. Defaults to `['ok']`.
   *
   * The group is left seeded with the LAST mode in the list, so the picture the
   * harness takes afterwards is of that one.
   */
  modes?: MachineBranchMode[];
  /** The branch name to seed. Defaults to `release/1.4`. */
  branch?: string;
  /** The upstream to seed, or null for a branch that follows nothing. */
  upstream?: string | null;
  /** True to seed a branch whose upstream that machine no longer has. */
  upstreamGone?: boolean;
  /** True to seed a tracking answer this end could not read. */
  trackUnreadable?: boolean;
  /** Commits ahead to seed. Defaults to 2. */
  ahead?: number;
  /** Commits behind to seed. Defaults to 1. */
  behind?: number;
  /** How long to wait for the group to settle before reading. */
  waitMs?: number;
}

/** One sentence the group drew, with the box the layout engine gave it. */
export interface DrawnSentence {
  /** The selector it was found by. */
  selector: string;
  /** Its text, exactly as a person reads it. */
  text: string;
  /** The top edge of its box, in pixels from the top of the window. */
  top: number;
  /** The bottom edge of its box, in pixels from the top of the window. */
  bottom: number;
}

/** What the group drew, read out of the document. */
export interface RemoteBranchReading {
  /** Which mode was seeded for this reading. */
  mode: MachineBranchMode;
  /** True when the group is in the document at all. */
  present: boolean;
  /** True when the group is open. */
  expanded: boolean;
  /** The band above the group, or the empty string when it is not drawn. */
  band: string;
  /** Every line drawn INSIDE the group's scrolling body, in order. */
  bodyLines: string[];
  /** The bottom edge of the group's body, in pixels. -1 when it is not drawn. */
  bodyBottom: number;
  /** Every sentence drawn below the group, in order, with its box. */
  below: DrawnSentence[];
  /**
   * Which sentences below the group are not fully visible, by selector.
   *
   * It must be empty. A sentence is counted as clipped when its box falls
   * outside the window or outside any ancestor that does not have visible
   * overflow. The second half is the one that mattered on the group below this
   * one, because the sentences were on the page and inside a body that scrolls.
   */
  clipped: string[];
  /**
   * True when any sentence about the whole answer is still inside the body.
   *
   * It must be false. This is the cheap form of the reading above and it does
   * not depend on how tall the window is.
   */
  captionsInsideBody: boolean;
  /**
   * How many controls in the group could switch a branch.
   *
   * IT MUST BE ZERO. Switching a branch on another machine is a write and no
   * write phase has run. The group says on screen that Tortie changes nothing
   * over there, and this is that sentence counted rather than trusted.
   */
  switchControls: number;
  /** How many buttons the group draws at all, being the toggle and Refresh. */
  buttons: number;
  /** The whole sentence that says which sections are absent. */
  absentSentence: string;
  /**
   * Whether that sentence still refuses branches.
   *
   * It must not. Phase 106 rewrote it, and it names the branch among the things
   * Tortie does show for a folder on another machine.
   */
  absentSentenceRefusesBranches: boolean;
}

declare global {
  interface Window {
    __gmuxP106Branch?: RemoteBranchReading[];
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Every sentence this group draws below itself, by selector, in the order they
 * are drawn. None of them may sit inside the body that scrolls.
 */
const BELOW_GROUP_SENTENCES = [
  '.rbranch-read-at',
  '.rbranch-not-live',
  '.rbranch-counts',
  '.rbranch-no-switch',
  '.rbranch-only-current'
];

/**
 * Anything a person could press to change what is checked out over there.
 *
 * The list is written out rather than derived, so a control added later under
 * one of these names is counted rather than missed.
 */
const SWITCH_AFFORDANCES = [
  '[data-section-root="remote-branch"] [data-action="checkout"]',
  '[data-section-root="remote-branch"] [data-action="switch"]',
  '[data-section-root="remote-branch"] .rbranch-checkout',
  '[data-section-root="remote-branch"] [role="listitem"]'
];

/** The box of one node, or null when it has none. */
function boxOf(el: HTMLElement): { top: number; bottom: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.height === 0) return null;
  return { top: rect.top, bottom: rect.bottom };
}

/**
 * Which sentences the layout engine is not showing in full.
 *
 * The window is one bound. Every ancestor whose overflow is not visible is
 * another, and that is the bound the defect on the group below lived under. A
 * sentence with no box at all counts as clipped, because a person cannot read
 * it either.
 */
function clippedSentences(): string[] {
  const out: string[] = [];
  for (const selector of BELOW_GROUP_SENTENCES) {
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

/** Read the group back out of the document. */
function readSection(mode: MachineBranchMode): RemoteBranchReading {
  const root = document.querySelector('[data-section-root="remote-branch"]');
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-section="remote-branch"] .section-toggle'
  );
  const bodyEl = document.querySelector<HTMLElement>('.rbranch-body');
  const bodyLines = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.rbranch-body .rbranch-note, .rbranch-body .rbranch-fact'
    )
  ).map((n) => (n.textContent ?? '').trim());
  const below: DrawnSentence[] = [];
  for (const selector of BELOW_GROUP_SENTENCES) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el === null) continue;
    const box = boxOf(el);
    below.push({
      selector,
      text: (el.textContent ?? '').trim(),
      top: box === null ? -1 : Math.round(box.top),
      bottom: box === null ? -1 : Math.round(box.bottom)
    });
  }
  let switchControls = 0;
  for (const selector of SWITCH_AFFORDANCES) {
    switchControls += document.querySelectorAll(selector).length;
  }
  // The last note in the Source Control view is the one that says which
  // sections are not on screen. Phase 106 rewrote it and it must no longer
  // refuse branches.
  const absentNodes = Array.from(
    document.querySelectorAll<HTMLElement>('.scm-remote-note')
  ).map((n) => (n.textContent ?? '').trim());
  const absent = absentNodes[absentNodes.length - 1] ?? '';
  const bodyBox = bodyEl === null ? null : boxOf(bodyEl);
  return {
    mode,
    present: root !== null,
    expanded: toggle?.getAttribute('aria-expanded') === 'true',
    band: textOf('.rbranch-band'),
    bodyLines,
    bodyBottom: bodyBox === null ? -1 : Math.round(bodyBox.bottom),
    below,
    clipped: clippedSentences(),
    captionsInsideBody:
      BELOW_GROUP_SENTENCES.filter(
        (s) => document.querySelector(`.rbranch-body ${s}`) !== null
      ).length > 0,
    switchControls,
    buttons: document.querySelectorAll(
      '[data-section-root="remote-branch"] button'
    ).length,
    absentSentence: absent,
    absentSentenceRefusesBranches: /does not show[^.]*\bbranch(es)?\b/i.test(
      absent
    )
  };
}

/**
 * Seed one answer, open the group, and report what it drew.
 *
 * Every gesture is one a person makes. The collapse is pressed through the
 * group's own toggle button rather than by writing the stored answer, so the
 * picture is of the real control in its real state.
 */
export async function driveRemoteBranch(
  spec: RemoteBranchProbeSpec
): Promise<RemoteBranchReading[]> {
  const waitMs = spec.waitMs ?? 8_000;
  const readings: RemoteBranchReading[] = [];

  if (spec.project !== undefined) {
    const target = spec.project;
    // A tab for this folder on this machine may already be open, from a
    // previous run against the same profile. Making it active is the gesture a
    // person makes and it asks the machine nothing, so it is tried first.
    const already = useApp
      .getState()
      .projects.find(
        (p) =>
          (p.machineId ?? 'local') === target.machineId && p.path === target.path
      );
    if (already !== undefined) {
      useApp.getState().setActiveProject(already.id);
      console.log(`[p106] the tab for ${target.path} was already open`);
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
          `[p106] FAILED: could not open ${target.path} on ` +
            `${target.machineId} as a tab, and the last reason was ${reason}`
        );
        window.__gmuxP106Branch = readings;
        return readings;
      }
      await wait(1200);
    }
  }

  useApp.getState().showSidebarView('scm');
  await wait(400);

  const project = useApp.getState().activeProject();
  if (project === null) {
    console.log('[p106] no active project, so there is no group to read');
    window.__gmuxP106Branch = readings;
    return readings;
  }
  const machineId = project.machineId ?? 'local';
  if (machineId === 'local') {
    console.log(
      '[p106] the active tab is on this Mac, so this group is not drawn'
    );
    window.__gmuxP106Branch = readings;
    return readings;
  }

  const modes = spec.modes ?? (['ok'] as MachineBranchMode[]);
  const branch = spec.branch ?? 'release/1.4';
  const upstream =
    spec.upstream === undefined ? `origin/${branch}` : spec.upstream;
  const key = `${machineId}:${project.path}`;

  for (const mode of modes) {
    const now = Date.now();
    const ok = mode === 'ok';
    useRemoteBranch.setState((s) => ({
      byTarget: {
        ...s.byTarget,
        [key]: {
          machineId,
          path: project.path,
          machineLabel: '',
          mode,
          branch: ok ? branch : null,
          sha: ok ? '01167eb9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9' : null,
          shortSha: ok ? '01167eb' : null,
          upstream: ok ? upstream : null,
          upstreamGone: ok ? (spec.upstreamGone ?? false) : false,
          ahead: ok ? (spec.ahead ?? 2) : 0,
          behind: ok ? (spec.behind ?? 1) : 0,
          trackUnreadable: ok ? (spec.trackUnreadable ?? false) : false,
          loading: false,
          refreshing: false,
          readAt: now,
          elapsedMs: 318
        }
      }
    }));
    await wait(200);

    // Open the group through its own control. A group that is already open is
    // left alone, so a second run of the probe does not close it.
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      const toggle = document.querySelector<HTMLButtonElement>(
        '[data-section="remote-branch"] .section-toggle'
      );
      if (toggle === null) {
        await wait(100);
        continue;
      }
      if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
      break;
    }
    await wait(500);
    readings.push(readSection(mode));
  }

  for (const [i, reading] of readings.entries()) {
    console.log(`[p106] reading ${String(i + 1)}: ${JSON.stringify(reading)}`);
  }
  for (const reading of readings) {
    if (!reading.present) {
      console.log(`[p106] FAIL the group was not drawn for mode ${reading.mode}`);
    }
    if (reading.switchControls > 0) {
      console.log(
        `[p106] FAIL the group drew ${String(reading.switchControls)} controls ` +
          'that could switch a branch, and it must draw none'
      );
    }
    if (reading.captionsInsideBody) {
      console.log(
        `[p106] FAIL a sentence about the whole answer is inside the body ` +
          `that scrolls, for mode ${reading.mode}`
      );
    }
    if (reading.clipped.length > 0) {
      console.log(
        `[p106] FAIL ${String(reading.clipped.length)} sentences below the ` +
          `group are not fully on screen, being ${reading.clipped.join(', ')}`
      );
    }
    if (reading.absentSentenceRefusesBranches) {
      console.log(
        '[p106] FAIL the sentence saying which sections are absent still ' +
          'refuses branches'
      );
    }
  }

  window.__gmuxP106Branch = readings;
  return readings;
}
