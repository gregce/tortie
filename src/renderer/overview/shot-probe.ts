/**
 * Harness only driver for the Catch Me Up page (Phase 137).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`overview: {…}`) through
 * ../app/probe-registry.ts and inert otherwise. The project and the session
 * levels are opened by dispatching the real ⇧⌘U keydown on `window`, which
 * is where ../app/keyboard.ts listens, so the picture shows what the shipped
 * handler produced rather than what a store call staged. The several level
 * is opened through the slice directly, because the rail has no multi
 * select and a split of two seeded restorable sessions cannot be staged by
 * a drive. The console report names which route ran.
 *
 * Phase 143 added two more drives, being the story panel and a press on one
 * of its rows. Both go through the SHIPPED control rather than through the
 * store: since Phase 147 the panel opens by clicking the real button on the
 * session's own PROJECT row, and a row opens by clicking the real row. A
 * drive that staged the store would photograph a state no person can reach.
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output, and the page itself is what GMUX_SHOT_JS reads back.
 */

import { useApp } from '../state/store';
import type { OverviewRequest } from '../state/overview-slice';
import { focusTerminal } from '../app/session-focus';
import { storySnapshot } from './story';

export interface OverviewProbeSpec {
  level: 'project' | 'session' | 'several';
  /** Session NAMES, resolved to ids from the store. Required for 'session' and 'several'. */
  sessionNames?: string[];
  /** Overrides --dur-panel with this many ms, so a capture can land inside the flight. */
  stretchFlightMs?: number;
  /** When true the drive prepares focus and presses nothing. GMUX_SHOT_JS presses. */
  pressOnly?: boolean;
  /**
   * Press the story control on one session's row once the page is open, and
   * wait for the read to answer (Phase 143, moved in Phase 147). Project
   * level only, because that is the only view the control lives in. The row
   * is the one named by the first entry of sessionNames, and the first
   * control on the page when no name is given.
   */
  openStory?: boolean;
  /**
   * Press one row of the story, by position in the drawn list, newest first
   * (Phase 143). Implies openStory, and waits for the turns to arrive.
   */
  pressStoryRow?: number;
}

function log(line: string): void {
  console.log(`[overview-probe] ${line}`);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The real chord, ⇧⌘U, as a capture phase keydown on window. */
function pressChord(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'u',
      code: 'KeyU',
      metaKey: true,
      shiftKey: true,
      bubbles: true
    })
  );
}

/** Poll until the page is open with an answer, or the time is up. */
async function settle(timeoutMs: number): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const open = useApp.getState().overview;
    if (open !== null && (open.data !== null || open.error !== null)) {
      return true;
    }
    await wait(50);
  }
  return false;
}

/** Poll until the story has an answer of some kind, or the time is up. */
async function settleStory(timeoutMs: number): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const story = storySnapshot();
    if (story.timeline !== null || story.error !== null) return true;
    await wait(50);
  }
  return false;
}

/** Poll until the pressed row has its turns, or its own sentence, or time is up. */
async function settleStoryTurns(timeoutMs: number): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const story = storySnapshot();
    if (story.turns !== null || story.turnsError !== null) return true;
    await wait(50);
  }
  return false;
}

/**
 * Drive the story the way a person does. The control is a real button on the
 * session's own project row and the rows are real press targets, so a click
 * is the whole of it and nothing is staged.
 */
async function driveStory(spec: OverviewProbeSpec): Promise<void> {
  const name = spec.sessionNames?.[0];
  const button =
    name === undefined
      ? document.querySelector('.overview-story-toggle')
      : document.querySelector(
          `.overview-story-toggle[data-session-name="${CSS.escape(name)}"]`
        );
  if (!(button instanceof HTMLElement)) {
    log('the story control is not on the page');
    return;
  }
  button.click();
  const settled = await settleStory(10_000);
  const story = storySnapshot();
  log(
    `story open=${String(story.open)} settled=${String(settled)} ` +
      `chosen=${String(story.timeline?.chosen ?? false)} ` +
      `rows=${story.timeline?.entries.length ?? 0} ` +
      `modelChanged=${String(story.timeline?.modelChanged ?? false)} ` +
      `error=${story.error ?? 'none'}`
  );
  await wait(150);

  const wanted = spec.pressStoryRow;
  if (wanted === undefined) return;
  const rows = document.querySelectorAll('.overview-story-row');
  const row = rows[wanted];
  if (!(row instanceof HTMLElement)) {
    log(`there is no story row at ${wanted}`);
    return;
  }
  row.click();
  const gotTurns = await settleStoryTurns(10_000);
  const after = storySnapshot();
  log(
    `story row ${wanted} pressed settled=${String(gotTurns)} ` +
      `turns=${after.turns?.length ?? 0} ` +
      `error=${after.turnsError ?? 'none'}`
  );
  await wait(150);
}

/** Names to ids, keeping the asked order. */
function resolveNames(names: string[]): string[] {
  const sessions = useApp.getState().sessions;
  return names.flatMap((name) => {
    const hit = sessions.find((s) => s.name === name);
    return hit === undefined ? [] : [hit.id];
  });
}

/** Open through the slice, which is the route the chord cannot stage. */
async function openDirect(
  level: 'project' | 'session' | 'several',
  sessionIds: string[]
): Promise<void> {
  const app = useApp.getState();
  const project = app.activeProject();
  if (project === null) {
    log('no active project, nothing to open');
    return;
  }
  const req: OverviewRequest = {
    level,
    projectPath: project.path,
    sessionIds,
    openedFromProject: false
  };
  const token = app.openOverview(req);
  await app.loadOverview(req, token);
}

export async function driveOverview(spec: OverviewProbeSpec): Promise<void> {
  if (spec.stretchFlightMs !== undefined) {
    document.documentElement.style.setProperty(
      '--dur-panel',
      `${spec.stretchFlightMs}ms`
    );
    log(`--dur-panel stretched to ${spec.stretchFlightMs}ms for the capture`);
  }

  const ids = resolveNames(spec.sessionNames ?? []);
  if ((spec.sessionNames?.length ?? 0) > 0) {
    log(`resolved ${spec.sessionNames?.join(', ') ?? ''} to ${ids.join(', ')}`);
  }

  // Put the keyboard where the level decision expects it.
  if (spec.level === 'session' && ids[0] !== undefined) {
    useApp.getState().setActiveSession(ids[0]);
    focusTerminal();
    await wait(300);
  } else {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    await wait(50);
  }

  if (spec.pressOnly === true) {
    log('press-only: focus prepared, GMUX_SHOT_JS presses the chord');
    return;
  }

  if (spec.level === 'several') {
    await openDirect('several', ids);
    await settle(10_000);
    log('route: direct, the rail has no multi select to stage');
  } else {
    pressChord();
    const settled = await settle(10_000);
    const got = useApp.getState().overview;
    if (!settled || got === null || got.level !== spec.level) {
      log(
        `route: chord landed on ${got?.level ?? 'nothing'}, ` +
          'falling back to the direct route'
      );
      if (got !== null) useApp.getState().closeOverview();
      await openDirect(spec.level, ids);
      await settle(10_000);
    } else {
      log('route: chord');
    }
  }

  const open = useApp.getState().overview;
  if (open === null) {
    log('the page did not open');
    return;
  }
  log(
    `open level=${open.level} data=${open.data === null ? 'null' : 'yes'} ` +
      `error=${open.error ?? 'none'}`
  );
  if (open.data !== null) {
    log(`reads=${JSON.stringify(open.data.reads)}`);
    for (const s of open.data.sessions) {
      log(
        `session ${s.name} line=${s.line} turns=${s.turns.length} ` +
          `agent=${s.agent}`
      );
    }
  }
  // Let the fade finish before the harness reads the page.
  await wait(spec.stretchFlightMs ?? 400);

  // Phase 143. The story, once the page behind it is settled and painted.
  if (spec.openStory === true || spec.pressStoryRow !== undefined) {
    await driveStory(spec);
  }
}
