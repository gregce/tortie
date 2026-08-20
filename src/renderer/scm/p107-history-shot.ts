/**
 * Harness only driver for the History group on a tab whose folder is on
 * another machine (Phase 107 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`remoteHistory: {…}`) and inert
 * otherwise. It follows ./p106-branch-shot.ts, which is the nearest working
 * sibling and which this group was written from.
 *
 * ## What the screenshot read has to settle, and why a test cannot
 *
 * Four things are read off the image and none of them is a string a unit test
 * can compare.
 *
 * 1. Whether the sentences below the group can be read. That is three separate
 *    measurements, being where each box is, whether a gesture reaches it, and
 *    what a person's eye lands on at the middle of it.
 * 2. Whether the group is showing its rows. A group can hold fifty rows and show
 *    none of them, so the body's height and the count of rows fully inside it
 *    are read as well.
 * 3. Whether the four groups read as one column, in the order Changes, History,
 *    Branch, Runs.
 * 4. Whether the group offers anything a person could press that would write on
 *    another computer, counted here as elements rather than asserted in prose.
 * 5. What one press of Load more leaves on screen.
 *
 * ## The two readability measurements, and why one of them was not enough
 *
 * Phase 105's verifier read the Runs group at ten rows and found two of its
 * honesty sentences drawn inside a body that is capped at 45% of the column and
 * scrolls. The body was 310 px tall over 352 px of content, the sentence saying
 * the list had been cut spanned y 683 to 727, the body ended at y 691, and 36
 * of that sentence's 44 px were hidden. `clipped` and `captionsInsideBody` are
 * that reading turned into two numbers this driver prints on every run. Both
 * must be empty and false.
 *
 * THAT PAIR PASSED THIS GROUP WITH NOTHING DRAWN IN IT, so there are three more.
 * The first build of this phase let the column shrink the section to 0 px with
 * fifty rows inside it, its body came out 6 px, and its header kept drawing at
 * full height because a section sets no `overflow` of its own. Every sentence
 * box was inside every ancestor, so `clipped` was empty while the read time sat
 * underneath the group's chevron and 0 of 50 rows were on screen.
 *
 *   covered      each sentence hit tested at the middle of its own box
 *   rowsVisible  rows fully inside the body, with `bodyHeight` beside it
 *   needsScroll  sentences a gesture away, told apart from ones nothing reaches
 *
 * THE THIRD ONE IS A REPORT AND NOT A FAILURE, and the reason is a number. The
 * sentences under this group are 480 px of a 748 px column at 1440 by 885, so
 * some of them are below the fold whatever the groups do. What must be true is
 * that a gesture reaches them, which is why the column scrolls and why `clipped`
 * counts only what an ancestor clips rather than scrolls.
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
 * THE FIRST ANSWER IS SEEDED AND THE PRESS OF LOAD MORE IS NOT. The store is
 * handed a canned answer of the shape main sends, and the group is then expanded
 * through its own toggle button. The group's first expand calls `ensure`, and
 * `ensure` returns early for a target that already holds an answer, so no
 * request is made and no machine is contacted for the first reading.
 *
 * Load more is different and it cannot be made the same. The click calls the
 * store's `loadMore`, which raises the window by a page and READS THAT MACHINE,
 * and the answer replaces the list rather than being added to it. So the row
 * count in the second reading is that folder's own answer at a window of 100.
 * Point the tab at a folder holding at least 100 commits and the press leaves
 * 100 rows on screen. Point it at a folder holding 1 and the press leaves 1.
 * Nothing in this driver can change that, and an earlier build of this file
 * claimed otherwise in a comment.
 *
 * What is real in a run: the project tab, the Source Control view, the group,
 * the store, the collapse gesture, the graph layout, the ref marks, every
 * sentence drawn, and the whole read that one press of Load more starts. What is
 * supplied: the mode word, the commit rows and the three flags of the FIRST
 * reading.
 *
 * ## THE ONE SAFETY RULE THIS FILE EXISTS UNDER
 *
 * `npm run shot` is NOT safe for this phase. It sets GMUX_SHOT and names no
 * socket, and `activeTmuxSocket` in src/main/tmux/resolve.ts then falls back to
 * the operator's own session server. Two earlier rounds stranded probe sessions
 * there. `resolve.ts` honours GMUX_TMUX_SOCKET when GMUX_SHOT is set, so this
 * screenshot is launched through build/harness-socket.mjs with a socket of its
 * own and an isolated user data directory, and the session count on the
 * operator's server is read before and after and must be equal.
 *
 * ## What it reports
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output, and to `window.__gmuxP107History`, which GMUX_SHOT_JS can read back.
 * The report is what the group DREW, read out of the document, because that is
 * the only reading that settles a sentence.
 */

import type { GitGraphLogEntry } from '@shared/types';
import type { MachineHistoryMode } from '@shared/ipc';
import { useApp } from '../state/store';
import { useRemoteHistory } from './remote-history';

export interface RemoteHistoryProbeSpec {
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
  modes?: MachineHistoryMode[];
  /** How many rows to seed for an `ok` reading. Defaults to 50. */
  commits?: number;
  /** Seed the answer as cut, so the paging control and its sentence draw. */
  hasMore?: boolean;
  /** Seed the answer at the ceiling, so the control is gone and it says why. */
  atCeiling?: boolean;
  /** Seed the mark read as cut, so the second cut sentence draws. */
  divergenceTruncated?: boolean;
  /** Press Load more once and take a second reading. Defaults to false. */
  pressLoadMore?: boolean;
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
export interface RemoteHistoryReading {
  /** Which mode was seeded for this reading. */
  mode: MachineHistoryMode;
  /** A word for what the reading is of, so two readings can be told apart. */
  stage: 'first' | 'afterLoadMore';
  /** True when the group is in the document at all. */
  present: boolean;
  /** True when the group is open. */
  expanded: boolean;
  /** The band above the group, or the empty string when it is not drawn. */
  band: string;
  /** How many commit rows are drawn. */
  rows: number;
  /** How many rows carry a drawn graph gutter. It must equal `rows`. */
  gutters: number;
  /** The one sentence drawn in place of the rows, or the empty string. */
  bodyNote: string;
  /** The bottom edge of the group's body, in pixels. -1 when it is not drawn. */
  bodyBottom: number;
  /**
   * How tall the group's body is, in pixels. -1 when it is not drawn.
   *
   * IT IS READ BECAUSE A GROUP CAN HOLD FIFTY ROWS AND SHOW NONE OF THEM. The
   * first build of this phase drew a 6 px body inside a 0 px section, and every
   * other number in this reading was correct while nothing was on screen.
   */
  bodyHeight: number;
  /** How tall the whole section is, in pixels. -1 when it is not drawn. */
  sectionHeight: number;
  /**
   * How many commit rows are fully inside the body a person is looking at.
   *
   * A row is counted when its whole box is inside the body's box and inside the
   * window. It is the number that says whether the group shows anything, and it
   * must be above 0 whenever `rows` is above 0.
   */
  rowsVisible: number;
  /** True when the paging control is fully inside the body without scrolling. */
  loadMoreOnScreen: boolean;
  /** Every sentence drawn below the group, in order, with its box. */
  below: DrawnSentence[];
  /**
   * Which sentences no gesture can reach, by selector.
   *
   * IT MUST BE EMPTY. A sentence counts here when its box falls outside the
   * window, or outside an ancestor that clips rather than scrolls. Before the
   * fix round of this phase the closing sentence of this view was in that
   * state, under `.sidebar-rest` and its `overflow: hidden`, 134 px past the
   * bottom of a column that did not scroll.
   */
  clipped: string[];
  /**
   * Which sentences are a scroll away rather than on screen, by selector.
   *
   * IT IS REPORTED AND IT IS NOT A FAILURE. The sentences under this group are
   * 480 px of a 748 px column at 1440 by 885, so some of them are below the fold
   * whatever the groups do. What must be true is that the column scrolls, which
   * `columnScrollHeight` against `columnHeight` says, and that nothing is in
   * `clipped`.
   */
  needsScroll: string[];
  /** How tall the whole Source Control column is. -1 when it is not drawn. */
  columnHeight: number;
  /** How tall its content is. Above `columnHeight` means the column scrolls. */
  columnScrollHeight: number;
  /**
   * Which sentences have something else drawn on top of them, by selector.
   *
   * IT MUST BE EMPTY AND IT IS A SECOND READING, NOT A REPEAT OF THE FIRST. A
   * box test asks where a sentence is. This asks what a person's eye lands on
   * at the middle of it, through `document.elementFromPoint`. The first build of
   * this phase drew the read time at y 271 to 299 with the group's own header
   * over it, because the section was 0 px tall and a section sets no overflow of
   * its own, so its header kept its full height and painted on top. Every box
   * was inside every ancestor, `clipped` was empty, and not one word of that
   * sentence could be read.
   */
  covered: string[];
  /**
   * True when any sentence about the whole answer is still inside the body.
   *
   * It must be false. This is the cheap form of the reading above and it does
   * not depend on how tall the window is.
   */
  captionsInsideBody: boolean;
  /**
   * How many controls in the group could change that folder.
   *
   * IT MUST BE ZERO. A checkout, a branch, a cherry pick and a revert would
   * each write on somebody else's computer and no write phase has run. The
   * group says on screen that Tortie changes nothing over there, and this is
   * that sentence counted rather than trusted.
   */
  writeControls: number;
  /** How many buttons the group draws at all. */
  buttons: number;
  /** True when the paging control is drawn. */
  loadMoreDrawn: boolean;
  /** The four group headers this view draws, in the order they are drawn. */
  groupOrder: string[];
  /** The whole sentence under the four groups. */
  sectionsNote: string;
  /**
   * Whether that sentence still refuses history.
   *
   * It must not. Phase 107 rewrote it, and it names the history among the
   * things Tortie does show for a folder on another machine.
   */
  sectionsNoteRefusesHistory: boolean;
}

declare global {
  interface Window {
    __gmuxP107History?: RemoteHistoryReading[];
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Every sentence this group draws below itself, by selector, in the order they
 * are drawn. None of them may sit inside the body that scrolls.
 */
const BELOW_GROUP_SENTENCES = [
  '.rhist-read-at',
  '.rhist-not-live',
  '.rhist-older',
  '.rhist-ceiling',
  '.rhist-marks-cut',
  '.rhist-refs',
  '.rhist-pages-fresh',
  '.rhist-no-write',
  '.rhist-files'
];

/**
 * Anything a person could press that would change that folder.
 *
 * The list is written out rather than derived, so a control added later under
 * one of these names is counted rather than missed. The four names are the four
 * verbs the LOCAL History row menu offers, which is where such a control would
 * come from if one were ever copied across.
 */
const WRITE_AFFORDANCES = [
  '[data-section-root="remote-history"] [data-action="checkout"]',
  '[data-section-root="remote-history"] [data-action="branch"]',
  '[data-section-root="remote-history"] [data-action="cherry-pick"]',
  '[data-section-root="remote-history"] [data-action="revert"]',
  '[data-section-root="remote-history"] [role="option"]'
];

/** The box of one node, or null when it has none. */
function boxOf(el: HTMLElement): { top: number; bottom: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.height === 0) return null;
  return { top: rect.top, bottom: rect.bottom };
}

/**
 * Which sentences the layout engine is not showing in full, and which ones have
 * something drawn on top of them.
 *
 * TWO READINGS, BECAUSE ONE OF THEM PASSED A GROUP WITH NOTHING IN IT.
 *
 * `clipped` is the box reading. The window is one bound. Every ancestor whose
 * overflow is not visible is another, and that is the bound the defect on the
 * Runs group lived under. A sentence with no box at all counts as clipped,
 * because a person cannot read it either.
 *
 * `covered` is the hit reading, and it is what the box reading cannot see. A
 * flex item that is shrunk to 0 px keeps drawing its own children at their full
 * height, because a section here sets no `overflow` of its own. The first build
 * of this phase did exactly that: the section was 0 px tall, its header drew
 * over the read time below it, every box was inside every ancestor and this
 * function returned nothing. So each sentence is also hit tested at the middle
 * of its own box, and a sentence whose topmost element is neither itself nor one
 * of its own children is counted here.
 */
function readabilityOfSentences(): {
  clipped: string[];
  covered: string[];
  needsScroll: string[];
} {
  const clipped: string[] = [];
  const covered: string[] = [];
  const needsScroll: string[] = [];
  const scrolls = (value: string): boolean =>
    value === 'auto' || value === 'scroll' || value === 'overlay';
  for (const selector of BELOW_GROUP_SENTENCES) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el === null) continue;
    const first = el.getBoundingClientRect();
    if (first.height === 0) {
      clipped.push(selector);
      covered.push(selector);
      continue;
    }
    // THE WALK, AND WHY IT REPLACES THE BOX AT A SCROLLER. An ancestor that
    // scrolls can put this sentence anywhere inside itself, so from that
    // ancestor upwards the question is where the SCROLLER is, not where the
    // sentence currently sits. An ancestor that clips can do nothing of the
    // kind, so a sentence outside one of those is reached by nothing.
    let box = { top: first.top, bottom: first.bottom };
    let soft = false;
    let hard = false;
    let parent: HTMLElement | null = el.parentElement;
    while (parent !== null) {
      const style = getComputedStyle(parent);
      const canScroll = scrolls(style.overflowY) || scrolls(style.overflowX);
      const cuts =
        !canScroll &&
        (style.overflowY !== 'visible' || style.overflowX !== 'visible');
      if (canScroll || cuts) {
        const own = parent.getBoundingClientRect();
        const outside = box.top < own.top - 0.5 || box.bottom > own.bottom + 0.5;
        if (canScroll) {
          if (outside) soft = true;
          box = { top: own.top, bottom: own.bottom };
        } else if (outside) {
          hard = true;
        }
      }
      parent = parent.parentElement;
    }
    if (box.top < -0.5 || box.bottom > window.innerHeight + 0.5) hard = true;
    if (hard) clipped.push(selector);
    else if (soft) needsScroll.push(selector);
    // The hit test only means something for a sentence that is on screen now.
    if (hard || soft) continue;
    // The middle of the box. A paragraph's own text nodes are not returned by
    // this call, so the answer is the paragraph itself when nothing is over it.
    const hit = document.elementFromPoint(
      first.left + first.width / 2,
      first.top + first.height / 2
    );
    if (hit === null || (hit !== el && !el.contains(hit))) covered.push(selector);
  }
  return { clipped, covered, needsScroll };
}

/**
 * How many commit rows are fully inside the body, and how tall that body is.
 *
 * THIS IS THE MEASURE THAT WOULD HAVE FAILED THE FIRST BUILD OF THIS PHASE. It
 * drew 50 rows into a 6 px body inside a 0 px section, and every other number
 * this driver printed was right while a person saw an empty group.
 */
function bodyMetrics(): {
  bodyTop: number;
  bodyBottom: number;
  bodyHeight: number;
  sectionHeight: number;
  rowsVisible: number;
  loadMoreOnScreen: boolean;
} {
  const bodyEl = document.querySelector<HTMLElement>('.rhist-body');
  const sectionEl = document.querySelector<HTMLElement>(
    '.section-scm-remote-history'
  );
  const sectionHeight =
    sectionEl === null
      ? -1
      : Math.round(sectionEl.getBoundingClientRect().height);
  if (bodyEl === null) {
    return {
      bodyTop: -1,
      bodyBottom: -1,
      bodyHeight: -1,
      sectionHeight,
      rowsVisible: 0,
      loadMoreOnScreen: false
    };
  }
  const box = bodyEl.getBoundingClientRect();
  const top = Math.max(box.top, 0);
  const bottom = Math.min(box.bottom, window.innerHeight);
  const inside = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= top - 0.5 && r.bottom <= bottom + 0.5;
  };
  let rowsVisible = 0;
  for (const row of document.querySelectorAll('.rhist-row')) {
    if (inside(row)) rowsVisible += 1;
  }
  const more = document.querySelector('.rhist-more');
  return {
    bodyTop: Math.round(box.top),
    bodyBottom: Math.round(box.bottom),
    bodyHeight: Math.round(box.height),
    sectionHeight,
    rowsVisible,
    loadMoreOnScreen: more !== null && inside(more)
  };
}

/** The text of one node, or the empty string when it is not there. */
function textOf(selector: string): string {
  const el = document.querySelector<HTMLElement>(selector);
  return (el?.textContent ?? '').trim();
}

/** Read the group back out of the document. */
function readSection(
  mode: MachineHistoryMode,
  stage: 'first' | 'afterLoadMore'
): RemoteHistoryReading {
  const root = document.querySelector('[data-section-root="remote-history"]');
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-section="remote-history"] .section-toggle'
  );
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
  let writeControls = 0;
  for (const selector of WRITE_AFFORDANCES) {
    writeControls += document.querySelectorAll(selector).length;
  }
  // The last note in the Source Control view is the one that says what the view
  // shows and what it does not. Phase 107 rewrote it and it must no longer
  // refuse history.
  const notes = Array.from(
    document.querySelectorAll<HTMLElement>('.scm-remote-note')
  ).map((n) => (n.textContent ?? '').trim());
  const sectionsNote = notes[notes.length - 1] ?? '';
  const metrics = bodyMetrics();
  const readable = readabilityOfSentences();
  const column = document.querySelector<HTMLElement>('.scm-sections');
  return {
    mode,
    stage,
    present: root !== null,
    expanded: toggle?.getAttribute('aria-expanded') === 'true',
    band: textOf('.rhist-band'),
    rows: document.querySelectorAll('.rhist-row').length,
    gutters: document.querySelectorAll('.rhist-row > .scm-graph').length,
    bodyNote: textOf('.rhist-note'),
    bodyBottom: metrics.bodyBottom,
    bodyHeight: metrics.bodyHeight,
    sectionHeight: metrics.sectionHeight,
    rowsVisible: metrics.rowsVisible,
    loadMoreOnScreen: metrics.loadMoreOnScreen,
    below,
    clipped: readable.clipped,
    covered: readable.covered,
    needsScroll: readable.needsScroll,
    columnHeight: column === null ? -1 : Math.round(column.getBoundingClientRect().height),
    columnScrollHeight: column === null ? -1 : column.scrollHeight,
    captionsInsideBody:
      BELOW_GROUP_SENTENCES.filter(
        (s) => document.querySelector(`.rhist-body ${s}`) !== null
      ).length > 0,
    writeControls,
    buttons: document.querySelectorAll(
      '[data-section-root="remote-history"] button'
    ).length,
    loadMoreDrawn: document.querySelector('.rhist-more') !== null,
    groupOrder: Array.from(
      document.querySelectorAll<HTMLElement>('.scm-sections [data-section]')
    ).map((n) => n.getAttribute('data-section') ?? ''),
    sectionsNote,
    sectionsNoteRefusesHistory: /does not show[^.]*\bhistory\b/i.test(
      sectionsNote
    )
  };
}

/** One canned commit row of the shape `parseGraphLog` produces. */
function seedRow(index: number, total: number, headSha: string): GitGraphLogEntry {
  const hash = `${String(index).padStart(8, '0')}b9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0`;
  const parentIndex = index + 1;
  const parents =
    parentIndex < total
      ? [`${String(parentIndex).padStart(8, '0')}b9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0`]
      : [];
  // One merge every eleventh row, so the picture has topology to draw rather
  // than one straight line. Its second parent is a commit two rows down, which
  // is inside the window and therefore a real lane rather than an open end.
  const merge = index > 0 && index % 11 === 0 && index + 2 < total;
  if (merge) {
    parents.push(
      `${String(index + 2).padStart(8, '0')}b9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0`
    );
  }
  const refs =
    index === 0
      ? [
          {
            kind: 'localBranch' as const,
            name: 'main',
            fullName: 'refs/heads/main',
            current: true as const
          },
          {
            kind: 'remoteBranch' as const,
            name: 'origin/main',
            fullName: 'refs/remotes/origin/main',
            remote: 'origin'
          }
        ]
      : index === 7
        ? [
            {
              kind: 'tag' as const,
              name: 'v1.4.0',
              fullName: 'refs/tags/v1.4.0'
            }
          ]
        : [];
  const at = Date.now() - index * 3_600_000;
  return {
    hash: index === 0 ? headSha : hash,
    sha: index === 0 ? headSha : hash,
    shortSha: (index === 0 ? headSha : hash).slice(0, 7),
    parents,
    authorName: index % 3 === 0 ? 'Greg' : 'Robin',
    author: index % 3 === 0 ? 'Greg' : 'Robin',
    authorEmail: 'nobody@example.com',
    authorDate: at,
    dateISO: new Date(at).toISOString(),
    subject: `Commit number ${String(total - index)} on that machine`,
    refs,
    ...(index < 2 ? { unpushed: true as const } : {})
  } as GitGraphLogEntry;
}

/** A whole seeded answer, of the shape the store holds. */
function seedEntry(
  machineId: string,
  path: string,
  mode: MachineHistoryMode,
  spec: RemoteHistoryProbeSpec,
  count: number
): Record<string, unknown> {
  const ok = mode === 'ok';
  const headSha = '01167eb9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9';
  const rows = ok
    ? Array.from({ length: count }, (_, i) => seedRow(i, count, headSha))
    : [];
  const atCeiling = ok && (spec.atCeiling ?? false);
  return {
    machineId,
    path,
    machineLabel: '',
    mode,
    entries: rows,
    limit: count,
    maxCount: count,
    ceiling: 500,
    hasMore: ok && (atCeiling || (spec.hasMore ?? true)),
    atCeiling,
    headSha: ok ? headSha : null,
    upstreamSha: ok ? rows[2]?.hash ?? null : null,
    mergeBase: ok ? rows[2]?.hash ?? null : null,
    markedCount: ok ? 2 : 0,
    divergenceTruncated: ok && (spec.divergenceTruncated ?? false),
    answerBytes: ok ? count * 270 : 0,
    loading: false,
    refreshing: false,
    readAt: Date.now(),
    elapsedMs: 412
  };
}

/**
 * Seed one answer, open the group, and report what it drew.
 *
 * Every gesture is one a person makes. The collapse is pressed through the
 * group's own toggle button rather than by writing the stored answer, so the
 * picture is of the real control in its real state.
 */
export async function driveRemoteHistory(
  spec: RemoteHistoryProbeSpec
): Promise<RemoteHistoryReading[]> {
  const waitMs = spec.waitMs ?? 8_000;
  const readings: RemoteHistoryReading[] = [];

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
      console.log(`[p107] the tab for ${target.path} was already open`);
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
          `[p107] FAILED: could not open ${target.path} on ` +
            `${target.machineId} as a tab, and the last reason was ${reason}`
        );
        window.__gmuxP107History = readings;
        return readings;
      }
      await wait(1200);
    }
  }

  useApp.getState().showSidebarView('scm');
  await wait(400);

  const project = useApp.getState().activeProject();
  if (project === null) {
    console.log('[p107] no active project, so there is no group to read');
    window.__gmuxP107History = readings;
    return readings;
  }
  const machineId = project.machineId ?? 'local';
  if (machineId === 'local') {
    console.log(
      '[p107] the active tab is on this Mac, so this group is not drawn'
    );
    window.__gmuxP107History = readings;
    return readings;
  }

  const modes = spec.modes ?? (['ok'] as MachineHistoryMode[]);
  const count = spec.commits ?? 50;
  const key = `${machineId}:${project.path}`;

  /** Put one seeded answer in the store, without asking anybody anything. */
  const seed = (mode: MachineHistoryMode, rows: number): void => {
    useRemoteHistory.setState((s) => ({
      byTarget: {
        ...s.byTarget,
        [key]: seedEntry(
          machineId,
          project.path,
          mode,
          spec,
          rows
        ) as unknown as (typeof s.byTarget)[string]
      }
    }));
  };

  /** Open the group through its own control, and leave an open one alone. */
  const openGroup = async (): Promise<void> => {
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      const toggle = document.querySelector<HTMLButtonElement>(
        '[data-section="remote-history"] .section-toggle'
      );
      if (toggle === null) {
        await wait(100);
        continue;
      }
      if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
      break;
    }
    await wait(500);
  };

  for (const mode of modes) {
    seed(mode, count);
    await wait(200);
    await openGroup();
    readings.push(readSection(mode, 'first'));
  }

  if (spec.pressLoadMore === true) {
    // THE PRESS IS THE ONE THING IN THIS DRIVER THAT ASKS THE MACHINE ANYTHING,
    // and nothing can make it not be. `loadMore` raises the window by a page and
    // reads it, and the answer REPLACES the list rather than being added to it,
    // so a seeded answer written before the click is thrown away by the click.
    // An earlier build of this file seeded the larger answer first and said the
    // press then found a store that already held it. That was wrong twice over.
    // The seed raised the store's own `limit` to that larger number, so the
    // click asked for a page beyond it, and the read went out either way. What
    // the picture shows is what that folder answered.
    //
    // SO THE ROW COUNT AFTER THE PRESS IS A PROPERTY OF THE FOLDER. The group is
    // seeded at 50 and the press asks for 100, so a folder holding 100 commits
    // or more leaves 100 rows on screen, and a smaller one leaves everything it
    // has. Point the tab at a folder with at least 100 commits to take the
    // picture the spec asks for.
    const button = document.querySelector<HTMLButtonElement>('.rhist-more');
    if (button === null) {
      console.log('[p107] FAIL the paging control was not drawn to press');
    } else {
      const before = useRemoteHistory.getState().byTarget[key];
      const askedFrom = before?.limit ?? 0;
      const readAtBefore = before?.readAt ?? 0;
      button.click();
      // A real read over a real link, so this waits for the store to settle
      // rather than for a fixed number of milliseconds.
      const deadline = Date.now() + waitMs;
      let settled = false;
      while (Date.now() < deadline) {
        const now = useRemoteHistory.getState().byTarget[key];
        if (
          now !== undefined &&
          !now.loading &&
          !now.refreshing &&
          now.readAt !== readAtBefore
        ) {
          settled = true;
          break;
        }
        await wait(200);
      }
      const after = useRemoteHistory.getState().byTarget[key];
      console.log(
        `[p107] Load more: the window went from ${String(askedFrom)} to ` +
          `${String(after?.maxCount ?? -1)}, that folder answered with ` +
          `${String(after?.entries.length ?? -1)} rows, hasMore is ` +
          `${String(after?.hasMore ?? false)}, atCeiling is ` +
          `${String(after?.atCeiling ?? false)}, and the read took ` +
          `${String(after?.elapsedMs ?? -1)} ms`
      );
      if (!settled) {
        console.log(
          '[p107] FAIL the read the press started did not come back before ' +
            'the deadline, so the reading below is of a group mid read'
        );
      }
      await wait(500);
      readings.push(readSection('ok', 'afterLoadMore'));
    }
  }

  for (const [i, reading] of readings.entries()) {
    console.log(`[p107] reading ${String(i + 1)}: ${JSON.stringify(reading)}`);
  }
  for (const reading of readings) {
    if (!reading.present) {
      console.log(`[p107] FAIL the group was not drawn for mode ${reading.mode}`);
    }
    if (reading.writeControls > 0) {
      console.log(
        `[p107] FAIL the group drew ${String(reading.writeControls)} controls ` +
          'that could change that folder, and it must draw none'
      );
    }
    if (reading.captionsInsideBody) {
      console.log(
        `[p107] FAIL a sentence about the whole answer is inside the body ` +
          `that scrolls, for mode ${reading.mode}`
      );
    }
    if (reading.clipped.length > 0) {
      console.log(
        `[p107] FAIL ${String(reading.clipped.length)} sentences below the ` +
          `group cannot be reached by any gesture, being ` +
          `${reading.clipped.join(', ')}`
      );
    }
    if (reading.needsScroll.length > 0) {
      console.log(
        `[p107] ${String(reading.needsScroll.length)} sentences below the ` +
          `group are a scroll away rather than on screen, being ` +
          `${reading.needsScroll.join(', ')}. The column is ` +
          `${String(reading.columnHeight)} px over ` +
          `${String(reading.columnScrollHeight)} px of content.`
      );
    }
    if (reading.covered.length > 0) {
      console.log(
        `[p107] FAIL ${String(reading.covered.length)} sentences below the ` +
          `group have something drawn on top of them, being ` +
          `${reading.covered.join(', ')}`
      );
    }
    if (reading.rows > 0 && reading.rowsVisible === 0) {
      console.log(
        `[p107] FAIL ${String(reading.rows)} commit rows are in the document ` +
          `and 0 of them are on screen. The section is ` +
          `${String(reading.sectionHeight)} px and its body is ` +
          `${String(reading.bodyHeight)} px.`
      );
    }
    if (reading.mode === 'ok' && reading.expanded && reading.sectionHeight < 24) {
      console.log(
        `[p107] FAIL the group is ${String(reading.sectionHeight)} px tall, ` +
          'which is less than one row, so its own header is drawing outside it'
      );
    }
    console.log(
      `[p107] ${reading.stage}: the section is ` +
        `${String(reading.sectionHeight)} px, its body is ` +
        `${String(reading.bodyHeight)} px, ${String(reading.rows)} rows are in ` +
        `the document and ${String(reading.rowsVisible)} are fully on screen`
    );
    if (reading.sectionsNoteRefusesHistory) {
      console.log(
        '[p107] FAIL the sentence under the groups still refuses history'
      );
    }
    if (reading.mode === 'ok' && reading.rows !== reading.gutters) {
      console.log(
        `[p107] FAIL ${String(reading.rows)} rows drew ` +
          `${String(reading.gutters)} graph gutters, and every row must have one`
      );
    }
  }

  window.__gmuxP107History = readings;
  return readings;
}
