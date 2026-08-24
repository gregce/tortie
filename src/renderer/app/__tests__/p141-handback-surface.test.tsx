/**
 * PHASE 141 — the word on the row, and the four refusals that decide when it
 * is not there.
 *
 * THE RULE THAT OUTRANKS EVERYTHING ELSE IN THIS PHASE, and the first test
 * below. A session Tortie has just restored, sitting with its resume command
 * armed and unpressed, is byte for byte the same shape as one whose agent has
 * left: its own program is the login shell, it has an agent on its row, it has
 * an armed resume command, and it is running. Any rule that reads the SHAPE of
 * a session announces that an agent left when no agent ever ran, and that is
 * what refuted three candidate designs.
 *
 * The reason this surface cannot make that mistake is structural rather than
 * careful. It never reads a shape. It draws the word from one fact, being a
 * record main only holds for a session whose WITNESSED process went away, and a
 * restored session was never witnessed running anything. So the test for the
 * restored case is that a row with every one of those attributes and no record
 * draws nothing at all.
 *
 * What else is pinned:
 *  - A session on another machine never offers it. Tortie holds no local
 *    process table for one, so it never witnessed a process over there.
 *  - `returning` and `unconfirmed` never offer it, because both mean something
 *    is running in that session and typing into a session a program owns is how
 *    armed text reaches a program in raw mode.
 *  - An ended session never offers it, so it can never appear beside Restore.
 *  - An `unknown` row never offers it, on the row or in the menu, because that
 *    row withholds every verb that acts on the tmux side.
 *  - Both row surfaces draw the SAME component in the SAME slot, immediately
 *    before the status dot, so the two can never drift.
 *  - The status dot gains no member and is not touched.
 *  - The row's accessible name carries the verb, because an `aria-label` on a
 *    row replaces its descendants' names.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. What a person actually sees is a Tier 3 photograph, not
 * this file.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

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

const {
  ResumeVerb,
  sessionAriaLabel,
  sessionMenuItems,
  sessionTooltip,
  showsResumeVerb,
  statusVisual
} = await import('../session-actions');
const { useApp } = await import('../../state/store');
const { RESUME_IN_PLACE_LABEL, RESUME_IN_PLACE_SUBLABEL, resumeNote } =
  await import('../../state/resume');
import type { SessionHandback } from '../../state/resume';

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'blue',
  answering: true,
  canRestore: false,
  restoreReason: null
};

/**
 * THE HARD CASE. A session Tortie restored a moment ago: an agent on the row,
 * an armed resume command, running, and its own program is the login shell.
 * This is the exact shape of a session whose agent left, and no agent ever ran
 * in it.
 */
function restoredAndArmed(over: Partial<Session> = {}): Session {
  return {
    id: 'sess-restored',
    name: 'docs sweep',
    tmuxName: 'docs-sweep',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'idle',
    createdAt: 0,
    agentSessionId: 'abc',
    resumeArgv: ['/usr/local/bin/claude', '--resume', 'abc'],
    resumeCapture: 'armed',
    ...over
  };
}

const LEFT: SessionHandback = { state: 'left', leftAt: 1_700_000_000_000 };

function setRecords(records: Record<string, SessionHandback>): void {
  useApp.setState({ handbacks: records });
}

function markup(
  session: Session,
  handback: SessionHandback | undefined = undefined
): string {
  return renderToStaticMarkup(
    <ResumeVerb
      session={session}
      handback={handback}
      status={session.status}
    />
  );
}

describe('Phase 141 — a restored session that is armed and unpressed', () => {
  it('does not offer the verb, which is the rule that killed three designs', () => {
    setRecords({});
    const session = restoredAndArmed();
    expect(showsResumeVerb(session, undefined, session.status)).toBe(false);
    expect(markup(session)).toBe('');
  });

  it('offers nothing for it in the session menu either', () => {
    setRecords({});
    const session = restoredAndArmed();
    useApp.setState({ sessions: [session] });
    const labels = sessionMenuItems(session, session.id).map((x) =>
      x === 'sep' ? 'sep' : x.label
    );
    expect(labels).not.toContain(RESUME_IN_PLACE_LABEL);
  });

  it('offers the verb for the same row once main says a witness went away', () => {
    const session = restoredAndArmed();
    setRecords({ [session.id]: LEFT });
    expect(showsResumeVerb(session, LEFT, session.status)).toBe(true);
    expect(markup(session, LEFT)).toContain('Resume');
  });
});

describe('Phase 141 — the four refusals', () => {
  it('never offers it for a session on another machine', () => {
    const session = restoredAndArmed({ machine: { ...STUDIO } });
    setRecords({ [session.id]: LEFT });
    expect(showsResumeVerb(session, LEFT, session.status)).toBe(false);
    expect(markup(session, LEFT)).toBe('');
  });

  it('hides it while something is running in the session', () => {
    const session = restoredAndArmed();
    for (const state of ['returning', 'unconfirmed'] as const) {
      const handback: SessionHandback = { state, leftAt: LEFT.leftAt };
      setRecords({ [session.id]: handback });
      expect(showsResumeVerb(session, handback, session.status)).toBe(false);
      expect(markup(session, handback)).toBe('');
    }
  });

  it('never offers it beside Restore, because that session has ended', () => {
    for (const status of ['exited', 'restorable'] as const) {
      const session = restoredAndArmed({ status });
      setRecords({ [session.id]: LEFT });
      expect(showsResumeVerb(session, LEFT, status)).toBe(false);
      expect(markup(session, LEFT)).toBe('');
    }
  });

  it('never offers it on a row Tortie cannot currently see', () => {
    const session = restoredAndArmed({ status: 'unknown' });
    setRecords({ [session.id]: LEFT });
    useApp.setState({ sessions: [session] });
    expect(showsResumeVerb(session, LEFT, 'unknown')).toBe(false);
    expect(markup(session, LEFT)).toBe('');
    const labels = sessionMenuItems(session, session.id).map((x) =>
      x === 'sep' ? 'sep' : x.label
    );
    expect(labels).not.toContain(RESUME_IN_PLACE_LABEL);
  });

  /**
   * Research 64 section 6 says droid's verb is not offered, because no
   * conversation id is ever captured for it, and every row whose id was never
   * harvested is the same shape. As shipped the word appeared on those rows
   * and the press could only ever answer the refusal `no-conversation`.
   */
  it('never offers it on a row with no conversation to put back', () => {
    for (const over of [
      { agentSessionId: undefined },
      { resumeArgv: undefined },
      { resumeArgv: [] }
    ]) {
      const session = restoredAndArmed(over);
      setRecords({ [session.id]: LEFT });
      useApp.setState({ sessions: [session] });
      expect(showsResumeVerb(session, LEFT, session.status)).toBe(false);
      expect(markup(session, LEFT)).toBe('');
      const labels = sessionMenuItems(session, session.id).map((x) =>
        x === 'sep' ? 'sep' : x.label
      );
      expect(labels).not.toContain(RESUME_IN_PLACE_LABEL);
    }
  });

  it('offers it for every live status a running session can carry', () => {
    const live: SessionStatus[] = ['idle', 'running', 'needs_input'];
    for (const status of live) {
      expect(showsResumeVerb(restoredAndArmed({ status }), LEFT, status)).toBe(
        true
      );
    }
  });
});

describe('Phase 141 — the native session menu', () => {
  it('carries the row with the sentence about the prompt and Enter', () => {
    const session = restoredAndArmed();
    setRecords({ [session.id]: LEFT });
    useApp.setState({ sessions: [session] });
    const items = sessionMenuItems(session, session.id);
    const row = items.find(
      (x) => x !== 'sep' && x.label === RESUME_IN_PLACE_LABEL
    );
    expect(row).toBeDefined();
    expect(row !== 'sep' ? row?.sublabel : null).toBe(
      RESUME_IN_PLACE_SUBLABEL
    );
  });

  it('sits above the read only rows and well above End session', () => {
    const session = restoredAndArmed();
    setRecords({ [session.id]: LEFT });
    useApp.setState({ sessions: [session] });
    const labels = sessionMenuItems(session, session.id).map((x) =>
      x === 'sep' ? 'sep' : x.label
    );
    const verb = labels.indexOf(RESUME_IN_PLACE_LABEL);
    expect(verb).toBeGreaterThan(labels.indexOf('Rename'));
    expect(verb).toBeLessThan(labels.indexOf('Show what it loaded…'));
    expect(verb).toBeLessThan(labels.indexOf('sep'));
    expect(verb).toBeLessThan(labels.indexOf('End session…'));
  });
});

describe('Phase 141 — what the word is, and what it is not', () => {
  it('is a button a person can press and not a decoration', () => {
    const session = restoredAndArmed();
    setRecords({ [session.id]: LEFT });
    const html = markup(session, LEFT);
    expect(html).toContain('<button');
    expect(html).toContain('class="resume-verb"');
    expect(html).toContain('>Resume<');
  });

  it('carries no badge, no count and no dot of its own', () => {
    const session = restoredAndArmed();
    setRecords({ [session.id]: LEFT });
    const html = markup(session, LEFT);
    expect(html).not.toContain('badge');
    expect(html).not.toContain('dot');
    // The visible text is the one word and nothing else. A digit here would be
    // a count, and this phase promises no count anywhere.
    const visible = html.replace(/<[^>]*>/g, '');
    expect(visible).toBe('Resume');
    expect(visible).not.toMatch(/\d/);
  });

  it('names itself in the row accessible name, and only when it is drawn', () => {
    const session = restoredAndArmed();
    const visual = statusVisual('idle', session);
    expect(sessionAriaLabel(session, visual, LEFT)).toContain(
      'resume available'
    );
    expect(sessionAriaLabel(session, visual)).not.toContain('resume available');
  });

  /**
   * The re-verifier's finding (fix round). markLeft publishes 'left' on every
   * witnessed drop of a non shell agent, including agents that hand Tortie no
   * conversation id, so a row can hold a record while the predicate refuses
   * the verb. Both announcing surfaces ask the predicate now, so a screen
   * reader never hears a verb the row does not draw and the tooltip never
   * says the conversation is still here on a row with nothing to resume.
   */
  it('stays silent on a refused row, in the name, the tooltip and the strip', () => {
    for (const over of [
      { agentSessionId: undefined },
      { resumeArgv: undefined },
      { resumeArgv: [] as string[] }
    ]) {
      const session = restoredAndArmed(over);
      const visual = statusVisual(session.status, session);
      expect(showsResumeVerb(session, LEFT, session.status)).toBe(false);
      expect(sessionAriaLabel(session, visual, LEFT)).not.toContain(
        'resume available'
      );
      const tip = sessionTooltip(session, visual, undefined, Date.now(), LEFT);
      expect(tip).not.toContain('conversation is still here');
      expect(tip).not.toContain('Resume');
      const strip = resumeNote(session, LEFT) ?? '';
      expect(strip).not.toContain('conversation is still here');
      expect(strip).not.toContain('Resume');
    }
  });

  it('says the conversation is still here only where the verb is drawn', () => {
    const session = restoredAndArmed();
    const visual = statusVisual(session.status, session);
    expect(sessionAriaLabel(session, visual, LEFT)).toContain(
      'resume available'
    );
    const tip = sessionTooltip(session, visual, undefined, Date.now(), LEFT);
    expect(tip).toContain('Its conversation is still here');
  });
});

/**
 * A STRUCTURAL PIN, and it is here because the two row surfaces are the one
 * place in this phase where drift is invisible until a person switches
 * orientation. Sessions on the right and sessions on top must draw the SAME
 * component in the SAME slot, immediately before the status dot. Rendering
 * either surface whole would need the layout store, the split tree and the drag
 * machinery, none of which say anything about this rule, so the rule is read
 * from the two files instead.
 */
describe('Phase 141 — both row surfaces, one slot', () => {
  const SURFACES = [
    ['src/renderer/app/SessionDock.tsx', 'srow'],
    ['src/renderer/app/SessionStrip.tsx', 'stab']
  ] as const;

  it('draws the verb immediately before the dot on both surfaces', () => {
    for (const [file] of SURFACES) {
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('<ResumeVerb');
      const verb = text.indexOf('<ResumeVerb');
      const mark = text.indexOf('<ResumeMark session={session} />');
      const dot = text.indexOf('className={`dot dot-${visual.dot}`}');
      expect(verb).toBeGreaterThan(-1);
      expect(verb).toBeLessThan(mark);
      expect(mark).toBeLessThan(dot);
    }
  });

  it('draws it exactly once on each surface', () => {
    for (const [file] of SURFACES) {
      const text = readFileSync(file, 'utf8');
      const hits = text.split('<ResumeVerb').length - 1;
      expect(hits).toBe(1);
    }
  });

  it('gives both surfaces the handback for the card sentence', () => {
    for (const [file] of SURFACES) {
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('useSessionHandback(session)');
      expect(text).toContain('sessionAriaLabel(session, visual, handback)');
    }
  });
});
