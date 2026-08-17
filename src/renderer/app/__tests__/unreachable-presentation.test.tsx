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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '@shared/types';

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
const { useApp } = await import('../../state/store');
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
  it('offers exactly the two verbs that read Tortie’s own records', () => {
    const items = sessionMenuItems(sess({}), 'x');
    expect(items).toHaveLength(2);
    expect(labelsOf(items)).toEqual([
      'Show what it loaded…',
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
});
