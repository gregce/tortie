/**
 * Phase 70 — the machine badge.
 *
 * What these tests hold:
 * - A session on another machine draws the badge, in that machine's label and
 *   that machine's colour.
 * - A session on this Mac draws nothing at all, which is every session before
 *   this release.
 * - The badge's sentence is the one a person reads, and it changes when the
 *   machine stopped answering.
 * - The badge dims when the machine did not answer, and the colour goes with
 *   it, because colour is how one machine is told from another and a machine
 *   that is not answering is not one a person can act on.
 * - The row's accessible name carries the sentence, because an `aria-label` on
 *   a row REPLACES its descendants' names and the badge is a descendant.
 * - The condition bar names every quiet machine once.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. What a person actually sees is a Tier 3 screenshot read,
 * not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session, SessionMachine } from '@shared/types';

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { MachineBadge } = await import('../MachineBadge');
const {
  badgeQuietTitle,
  badgeSilentTitle,
  badgeTitle,
  machineSilentText
} = await import('../../machines/session-badge');
const { sessionAriaLabel } = await import('../session-actions');
const { statusVisual, unreachableMachines } = await import('../status');
const { MachineSilentBar, UnreachableBar } = await import('../TerminalRegion');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  // Phase 72 appended these two. A row Tortie may bring back is the case the
  // ten row matrix drives; this fixture is about the badge and the bars, so it
  // states the ordinary answer for a row nothing has offered.
  canRestore: false,
  restoreReason: 'That machine still lists this session, so it is already running.'
};

function sess(over: Partial<Session>): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  };
}

// ---------------------------------------------------------------------------
// The badge itself
// ---------------------------------------------------------------------------

describe('the machine badge', () => {
  it('draws the label and the colour for a session on another machine', () => {
    const html = renderToStaticMarkup(<MachineBadge machine={STUDIO} />);
    expect(html).toContain('Studio');
    expect(html).toContain('data-machine-color="orange"');
    expect(html).toContain('class="machine-badge"');
  });

  it('draws nothing at all for a session on this Mac', () => {
    expect(renderToStaticMarkup(<MachineBadge machine={undefined} />)).toBe('');
  });

  it('carries the sentence a person reads, twice over', () => {
    const html = renderToStaticMarkup(<MachineBadge machine={STUDIO} />);
    expect(badgeTitle('Studio')).toBe('This session runs on Studio.');
    // The tooltip and the accessible name are the same sentence. Two copies
    // that could drift is how a pointer and a screen reader end up being told
    // different things.
    expect(html).toContain(`title="${badgeTitle('Studio')}"`);
    expect(html).toContain(`aria-label="${badgeTitle('Studio')}"`);
  });

  it('dims and changes its sentence when the machine did not answer', () => {
    const html = renderToStaticMarkup(
      <MachineBadge machine={{ ...STUDIO, answering: false }} />
    );
    expect(badgeQuietTitle('Studio')).toBe('Studio did not answer.');
    expect(html).toContain('machine-badge quiet');
    expect(html).toContain(`title="${badgeQuietTitle('Studio')}"`);
    // The label survives the dimming: it is how a person knows WHICH machine
    // went quiet.
    expect(html).toContain('Studio');
  });

  it('keeps the surface class beside its own, never instead of it', () => {
    const html = renderToStaticMarkup(
      <MachineBadge machine={STUDIO} className="srow-machine" />
    );
    expect(html).toContain('class="machine-badge srow-machine"');
  });
});

// ---------------------------------------------------------------------------
// The accessible name of the row the badge sits in
// ---------------------------------------------------------------------------

describe('the row accessible name', () => {
  it('carries the machine sentence for a session on another machine', () => {
    const name = sessionAriaLabel(
      sess({ machine: STUDIO }),
      statusVisual('running')
    );
    expect(name).toBe('auth, working, This session runs on Studio.');
  });

  it('is unchanged for a session on this Mac', () => {
    // A claude row with no recorded resume command reads "directory only",
    // which is what it read before this phase and what it must still read.
    expect(sessionAriaLabel(sess({}), statusVisual('running'))).toBe(
      'auth, working, directory only'
    );
  });

  it('drops the resume mark for a session on another machine', () => {
    // The mark answers what a restart brings back, and a restart is refused
    // for a remote row, so the answer is nothing rather than "directory only".
    const name = sessionAriaLabel(
      sess({ machine: STUDIO }),
      statusVisual('running')
    );
    expect(name).not.toContain('directory only');
  });
});

// ---------------------------------------------------------------------------
// The condition bar
// ---------------------------------------------------------------------------

describe('the machines that went quiet', () => {
  it('lists each one once, and never this Mac', () => {
    const quiet = { ...STUDIO, answering: false };
    const rows = [
      sess({ id: 'a', status: 'unknown', machine: quiet }),
      sess({ id: 'b', status: 'unknown', machine: quiet }),
      // A row on this Mac reading unknown is the Phase 67 condition. It carries
      // no machine and must contribute no badge.
      sess({ id: 'c', status: 'unknown' }),
      // A machine that is answering contributes nothing either.
      sess({ id: 'd', status: 'running', machine: STUDIO })
    ];
    expect(unreachableMachines(rows)).toEqual([quiet]);
  });

  it('draws one badge per quiet machine on the bar, and keeps the sentence', () => {
    const quiet = { ...STUDIO, answering: false };
    const html = renderToStaticMarkup(<UnreachableBar machines={[quiet]} />);
    expect(html).toContain(
      'Machine unreachable. Your sessions are untouched. Tortie just cannot see them.'
    );
    expect(html).toContain('Studio');
    expect(html).toContain('machine-badge quiet');
    expect(html).not.toContain('<button');
  });

  it('draws no badge when only this Mac is quiet', () => {
    const html = renderToStaticMarkup(<UnreachableBar />);
    expect(html).toContain('Machine unreachable.');
    expect(html).not.toContain('machine-badge');
  });
});

// ---------------------------------------------------------------------------
// Phase 71 — the machine Tortie holds no rows for
// ---------------------------------------------------------------------------

/** One machine as main reports its link. */
const SILENT_STUDIO = {
  id: 'studio',
  label: 'Studio',
  color: 'orange' as const,
  link: 'quiet' as const,
  everAnswered: false,
  lastAnsweredAt: null,
  detail: 'Studio did not answer.'
};

describe('the bar for a machine that has never answered', () => {
  it('names the machine and says Tortie ended nothing', () => {
    const html = renderToStaticMarkup(
      <MachineSilentBar silent={[SILENT_STUDIO]} />
    );
    expect(machineSilentText(['Studio'])).toBe(
      'Tortie could not reach Studio. Sessions you started there are not ' +
        'shown here, and Tortie did not end any of them.'
    );
    expect(html).toContain(machineSilentText(['Studio']));
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<button');
  });

  it('joins two machines into one sentence', () => {
    expect(machineSilentText(['Studio', 'Attic'])).toBe(
      'Tortie could not reach Studio and Attic. Sessions you started there ' +
        'are not shown here, and Tortie did not end any of them.'
    );
  });

  it('never claims the sessions are running and never claims they ended', () => {
    const text = machineSilentText(['Studio']);
    expect(text).not.toMatch(/still running/i);
    expect(text).not.toMatch(/ended\b(?! any)/i);
  });

  it('draws the badge with the sentence for a machine never heard from', () => {
    const html = renderToStaticMarkup(
      <MachineSilentBar silent={[SILENT_STUDIO]} />
    );
    expect(badgeSilentTitle('Studio')).toBe(
      'Studio has not answered since Tortie started. Settings then Machines ' +
        'has a button that tries again.'
    );
    expect(html).toContain(`title="${badgeSilentTitle('Studio')}"`);
    expect(html).toContain('machine-badge quiet');
  });

  it('uses the shorter sentence for a machine that answered and stopped', () => {
    const html = renderToStaticMarkup(
      <MachineSilentBar silent={[{ ...SILENT_STUDIO, everAnswered: true }]} />
    );
    expect(html).toContain(`title="${badgeQuietTitle('Studio')}"`);
  });

  it('draws nothing at all when no machine is quiet', () => {
    expect(renderToStaticMarkup(<MachineSilentBar silent={[]} />)).toBe('');
  });

  it('gives a silent machine its badge on the unreachable bar too', () => {
    // Research 51 section 4.6's sentence is binding and is never reworded, so
    // when both conditions are true it wins the line and the silent machine
    // still gets a badge.
    const quiet = { ...STUDIO, answering: false };
    const html = renderToStaticMarkup(
      <UnreachableBar machines={[quiet]} silent={[SILENT_STUDIO]} />
    );
    expect(html).toContain(
      'Machine unreachable. Your sessions are untouched. Tortie just cannot see them.'
    );
    expect(html).not.toContain(machineSilentText(['Studio']));
    // One badge, not two: the machine is the same machine.
    expect(html.match(/machine-badge/g)?.length).toBe(1);
  });
});
