/**
 * Harness only driver for the Catch Me Up page (Phase 137).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`overview: {…}`) through
 * ../app/probe-registry.ts and inert otherwise. The project and the session
 * levels are opened by dispatching the real ⌃⇧U keydown on `window`, which
 * is where ../app/keyboard.ts listens, so the picture shows what the shipped
 * handler produced rather than what a store call staged. The several level
 * is opened through the slice directly, because the rail has no multi
 * select and a split of two seeded restorable sessions cannot be staged by
 * a drive. The console report names which route ran.
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output, and the page itself is what GMUX_SHOT_JS reads back.
 */

import { useApp } from '../state/store';
import type { OverviewRequest } from '../state/overview-slice';
import { focusTerminal } from '../app/session-focus';

export interface OverviewProbeSpec {
  level: 'project' | 'session' | 'several';
  /** Session NAMES, resolved to ids from the store. Required for 'session' and 'several'. */
  sessionNames?: string[];
  /** Overrides --dur-panel with this many ms, so a capture can land inside the flight. */
  stretchFlightMs?: number;
  /** When true the drive prepares focus and presses nothing. GMUX_SHOT_JS presses. */
  pressOnly?: boolean;
}

function log(line: string): void {
  console.log(`[overview-probe] ${line}`);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The real chord, as a capture phase keydown on window. */
function pressChord(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'u',
      code: 'KeyU',
      ctrlKey: true,
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
}
