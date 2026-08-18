/**
 * Phase 67 — the renderer's half of "unreachable is not dead".
 *
 * What these tests hold:
 * - An `unknown` row's context menu offers exactly two verbs, the ones that
 *   read Tortie's own records. Every verb that acts on the tmux side is
 *   gone, because the server did not answer and the session may be alive.
 * - The × affordance does nothing for an `unknown` row, and still works for
 *   live and ended rows.
 * - The condition bar renders with the binding copy (research 51 §4.6, one
 *   line, role="status", no button), and while it is on the restore-all bar
 *   does not render, even when restorable rows would otherwise summon it.
 * - The pane input gate refuses input for `unknown` and nothing else.
 * - The image-drop gate refuses an `unknown` pane the same way it refuses
 *   exited and restorable ones.
 *
 * The vitest environment is node, so the component assertions read static
 * markup from react-dom/server. The live half (the producer in main, the
 * retry cadence, recovery) is main-process code with its own tests, and the
 * Tier 3 probes drive the real app for the end-to-end story.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '@shared/types';

const HERE = dirname(fileURLToPath(import.meta.url));

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
// `sessions.restore` and `sessions.discard` are present so canRestore() and
// canDiscard() answer true, which is what lets the restore-all bar render in
// the control case below.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  // The zoom store applies its CSS variables to the root element while it is
  // being imported, so the stub needs a root with a style.
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { closeSession, sessionMenuItems } = await import('../session-actions');
const { RegionBars, UNREACHABLE_BAR_TEXT, UnreachableBar } = await import(
  '../TerminalRegion'
);
const { silentMachines, useApp } = await import('../../state/store');
const { paneRefusesInput } = await import('../../terminal/TerminalPane');
const { paneAccepts } = await import('../../terminal/drop/target');

function sess(over: Partial<Session>): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'unknown',
    createdAt: 0,
    ...over
  };
}

/** The labels of a menu, separators skipped. */
function labelsOf(
  items: readonly ({ label: string } | 'sep')[]
): string[] {
  return items.filter((x): x is { label: string } => x !== 'sep').map(
    (x) => x.label
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Refused verbs
// ---------------------------------------------------------------------------

describe('the unknown row menu', () => {
  /**
   * PHASE 72 added the third. "Show saved output…" reads a file on this Mac and
   * sends nothing anywhere, so it belongs with the other two rather than with
   * the verbs that act on a session Tortie cannot see. On a row with no copy it
   * is offered disabled with the reason under it.
   */
  it('offers exactly the three verbs that read Tortie’s own records', () => {
    const items = sessionMenuItems(sess({}), 'x');
    expect(items).toHaveLength(3);
    expect(labelsOf(items)).toEqual([
      'Show what it loaded…',
      'Show saved output…',
      'Copy directory path'
    ]);
  });

  it('omits every verb that acts on a tmux side Tortie cannot see', () => {
    const labels = labelsOf(sessionMenuItems(sess({}), 'x'));
    for (const verb of [
      'Rename',
      'Restore',
      'Restart',
      'End session…',
      'Remove'
    ]) {
      expect(labels).not.toContain(verb);
    }
  });

  it('leaves the menu for every other status as it was', () => {
    const live = labelsOf(sessionMenuItems(sess({ status: 'running' }), 'x'));
    expect(live).toContain('Rename');
    expect(live).toContain('End session…');
    const saved = labelsOf(
      sessionMenuItems(sess({ status: 'restorable' }), 'x')
    );
    expect(saved).toContain('Restart');
    expect(saved).toContain('Remove');
  });
});

describe('the × affordance', () => {
  it('does nothing for an unknown row, and still acts on the others', () => {
    const endSession = vi.fn();
    const removeSession = vi.fn(() => Promise.resolve());
    const original = {
      endSession: useApp.getState().endSession,
      removeSession: useApp.getState().removeSession
    };
    useApp.setState({ endSession, removeSession });
    try {
      closeSession(sess({}));
      expect(endSession).not.toHaveBeenCalled();
      expect(removeSession).not.toHaveBeenCalled();

      closeSession(sess({ status: 'running' }));
      expect(endSession).toHaveBeenCalledWith('sess-1');
      expect(removeSession).not.toHaveBeenCalled();

      closeSession(sess({ status: 'restorable' }));
      expect(removeSession).toHaveBeenCalledWith('sess-1');
    } finally {
      useApp.setState(original);
    }
  });
});

// ---------------------------------------------------------------------------
// The condition bar
// ---------------------------------------------------------------------------

describe('the condition bar', () => {
  it('carries the binding copy, a status role, and no button', () => {
    const html = renderToStaticMarkup(<UnreachableBar />);
    expect(UNREACHABLE_BAR_TEXT).toBe(
      'Machine unreachable. Your sessions are untouched. ' +
        'Tortie just cannot see them.'
    );
    expect(html).toContain(UNREACHABLE_BAR_TEXT);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<button');
  });

  it('replaces the restore-all bar while any row reads unknown', () => {
    // Two restorable rows is exactly what summons the restore-all bar, so
    // this is the case where the two bars would argue. The condition wins.
    const rows = [
      sess({ id: 'a', status: 'unknown' }),
      sess({ id: 'b', status: 'restorable' }),
      sess({ id: 'c', status: 'restorable' })
    ];
    const html = renderToStaticMarkup(<RegionBars sessions={rows} />);
    expect(html).toContain(UNREACHABLE_BAR_TEXT);
    expect(html).not.toContain('Restore all');
    expect(html).not.toContain('<button');
  });

  it('leaves the restore-all bar alone when no row reads unknown', () => {
    const rows = [
      sess({ id: 'b', status: 'restorable' }),
      sess({ id: 'c', status: 'restorable' })
    ];
    const html = renderToStaticMarkup(<RegionBars sessions={rows} />);
    expect(html).toContain('Restore all');
    expect(html).not.toContain('Machine unreachable');
  });
});

// ---------------------------------------------------------------------------
// Phase 71 — the two bar changes
// ---------------------------------------------------------------------------

describe('the restore-all bar', () => {
  const STUDIO = {
    id: 'studio',
    label: 'Studio',
    color: 'orange' as const,
    answering: true,
    // Phase 72 appended these two. This block is about the bar rather than
    // about one row, so it states the ordinary answer for a row nothing has
    // offered.
    canRestore: false,
    restoreReason: 'That machine still lists this session, so it is already running.'
  };

  it('never offers to restore sessions on another machine', () => {
    // Restore is refused for every remote session, in main and in the row menu
    // alike, so a bar offering to restore all of them would offer an action
    // that is refused the moment it is pressed.
    const rows = [
      sess({ id: 'a', status: 'restorable', machine: STUDIO }),
      sess({ id: 'b', status: 'restorable', machine: STUDIO })
    ];
    const html = renderToStaticMarkup(<RegionBars sessions={rows} />);
    expect(html).not.toContain('Restore all');
  });

  it('counts only the rows on this Mac towards the pair it needs', () => {
    const rows = [
      sess({ id: 'a', status: 'restorable', machine: STUDIO }),
      sess({ id: 'b', status: 'restorable' })
    ];
    expect(
      renderToStaticMarkup(<RegionBars sessions={rows} />)
    ).not.toContain('Restore all');
    const both = [
      sess({ id: 'b', status: 'restorable' }),
      sess({ id: 'c', status: 'restorable' })
    ];
    expect(renderToStaticMarkup(<RegionBars sessions={both} />)).toContain(
      'Restore all'
    );
  });
});

describe('the bar for a machine with no rows at all', () => {
  const QUIET_STUDIO = {
    id: 'studio',
    label: 'Studio',
    color: 'orange' as const,
    link: 'quiet' as const,
    everAnswered: false,
    lastAnsweredAt: null,
    detail: 'Studio did not answer.'
  };

  it('draws when a confirmed machine is quiet and no row reads unknown', () => {
    // This is the startup hole. Tortie holds no record of a remote session, so
    // a machine that was down when Tortie started contributes no row and every
    // row-derived condition is silent.
    const html = renderToStaticMarkup(
      <RegionBars sessions={[]} silent={[QUIET_STUDIO]} />
    );
    expect(html).toContain('Tortie could not reach Studio.');
    expect(html).toContain('did not end any of them');
    expect(html).not.toContain('<button');
  });

  it('loses the line to the unknown-row sentence when both are true', () => {
    const html = renderToStaticMarkup(
      <RegionBars
        sessions={[sess({ id: 'a', status: 'unknown' })]}
        silent={[QUIET_STUDIO]}
      />
    );
    expect(html).toContain(UNREACHABLE_BAR_TEXT);
    expect(html).not.toContain('Tortie could not reach Studio.');
    // The silent machine still gets its badge, so the binding sentence never
    // has to share a line.
    expect(html).toContain('machine-badge');
  });

  it('outranks the restore-all bar', () => {
    const rows = [
      sess({ id: 'b', status: 'restorable' }),
      sess({ id: 'c', status: 'restorable' })
    ];
    const html = renderToStaticMarkup(
      <RegionBars sessions={rows} silent={[QUIET_STUDIO]} />
    );
    expect(html).toContain('Tortie could not reach Studio.');
    expect(html).not.toContain('Restore all');
  });

  it('says nothing for a machine nobody confirmed', () => {
    // `silentMachines` is what decides this, and a refused machine was never
    // asked anything, so nothing about it may claim Tortie could not reach it.
    const refused = { ...QUIET_STUDIO, link: 'refused' as const };
    const html = renderToStaticMarkup(
      <RegionBars sessions={[]} silent={silentMachines([refused])} />
    );
    expect(html).not.toContain('Tortie could not reach');
  });

  /**
   * MEASURED 2026-08-17, and it is why these two assertions exist. With a
   * project open the bar and the badge appeared correctly for a confirmed
   * machine that was down. With no project open the window showed the empty
   * board and said nothing about that machine anywhere, because the bar lives
   * inside the terminal region and the region returns early with no project.
   *
   * The claim is an ordering of components rather than a value, and zustand
   * answers a server render from its initial state, so this is read from the
   * source the way ../../../main/sessions/__tests__/unreachable-boundary.test.ts
   * reads core.ts.
   */
  it('is drawn in the two window states that have no region bars', () => {
    const region = readFileSync(join(HERE, '..', 'TerminalRegion.tsx'), 'utf8');
    const noProject = region.slice(
      region.indexOf('if (!project) {'),
      region.indexOf('const status = active ?')
    );
    expect(noProject).toContain('<MachineStatement />');

    const app = readFileSync(join(HERE, '..', 'App.tsx'), 'utf8');
    const firstRun = app.slice(
      app.indexOf('ready && projects.length === 0'),
      app.indexOf('<div className="shell-body">')
    );
    expect(firstRun).toContain('<MachineStatement />');
    expect(firstRun).toContain('<FirstRun />');
  });

  it('reads the store when the caller passes nothing', () => {
    // The app never passes the prop. This is the slice the component reads,
    // and the store path itself is a screenshot read rather than a unit test,
    // because zustand answers a server render from the initial state.
    const original = useApp.getState().machineStates;
    useApp.setState({ machineStates: [QUIET_STUDIO] });
    try {
      expect(silentMachines(useApp.getState().machineStates)).toEqual([
        QUIET_STUDIO
      ]);
    } finally {
      useApp.setState({ machineStates: original });
    }
  });
});

// ---------------------------------------------------------------------------
// The input and drop gates
// ---------------------------------------------------------------------------

describe('paneRefusesInput', () => {
  it('refuses input for unknown and nothing else', () => {
    expect(paneRefusesInput('unknown')).toBe(true);
    for (const status of [
      'running',
      'idle',
      'needs_input',
      'exited',
      'restorable',
      'discarded',
      undefined
    ] as const) {
      expect(paneRefusesInput(status)).toBe(false);
    }
  });
});

describe('the image-drop gate', () => {
  it('refuses an unknown pane on the same terms as exited and restorable', () => {
    expect(paneAccepts(sess({}))).toBe(false);
    expect(paneAccepts(sess({ status: 'exited' }))).toBe(false);
    expect(paneAccepts(sess({ status: 'restorable' }))).toBe(false);
    expect(paneAccepts(null)).toBe(false);
  });

  // PHASE 71. All three refusals read through `effectiveStatusOf`, the one
  // expression every surface reads status through. This gate decides whether
  // Tortie writes bytes into a session, so it must never decide from a
  // different reading than the row a person is looking at.
  it('refuses a session on another machine that Tortie cannot see', () => {
    const quiet = {
      id: 'studio',
      label: 'Studio',
      color: 'orange' as const,
      answering: false,
      // A machine Tortie cannot see never offers the verb, which is the whole
      // point of the case below.
      canRestore: false,
      restoreReason: 'Tortie cannot see this machine right now.'
    };
    expect(paneAccepts(sess({ status: 'unknown', machine: quiet }))).toBe(
      false
    );
  });
});
