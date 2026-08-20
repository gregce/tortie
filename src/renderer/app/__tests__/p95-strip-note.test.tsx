/**
 * Phase 95 — both bands above the terminal say that Tortie cannot scroll back
 * through a session on another machine.
 *
 * WHY THERE IS A SENTENCE AT ALL. A session over there has no saved output on
 * this Mac, so the lane at the right edge of the terminal has no thumb and the
 * wheel moves nothing. Before this phase a person read that as a broken
 * scrollbar.
 *
 * WHY BOTH BANDS. There is no single band always on screen above a session.
 * The identity strip in TerminalRegion.tsx is the band for the "right"
 * orientation. The session tab strip in SessionStrip.tsx is the band for the
 * "top" orientation, which is what `sessionOrientation` defaults to and what
 * most people are looking at. The first build of this phase drew the note in
 * the identity strip alone, so it was off screen in the default layout. The
 * last describe below is what stops that returning: it reads both files and
 * fails if either stops mounting the shared component.
 *
 * WHAT IS NOT GIVEN A SENTENCE. A session on this Mac that is not running. Its
 * surface is already the restore card or the ended card, and both say what the
 * session is. A second sentence about scrolling there would be noise on top of
 * an answer the person already has, so the third and fourth tests below pin
 * its absence.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the strip is rendered with
 * `renderToStaticMarkup`, which is the shape p93-attention-row.test.tsx uses.
 * The rule itself is also read straight off `showsNoScrollbackNote`, so a
 * later change to the markup cannot quietly change which sessions are told.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session, SessionMachine } from '@shared/types';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
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
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { IdentityStrip } = await import('../TerminalRegion');
const { NoScrollbackNote, showsNoScrollbackNote } = await import(
  '../session-actions'
);
const { NO_SCROLLBACK_HERE, NO_SCROLLBACK_HERE_TITLE } = await import(
  '../machine-copy'
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function machine(over: Partial<SessionMachine> = {}): SessionMachine {
  return {
    id: 'p95m',
    label: 'Mac Pro',
    color: 'magenta',
    answering: true,
    canRestore: false,
    restoreNote: null,
    ...over
  } as SessionMachine;
}

function session(over: Partial<Session> = {}): Session {
  return {
    id: 's1',
    name: 'claude-1',
    tmuxName: 'claude-1',
    projectPath: '/Users/gdc/gmux',
    cwd: '/Users/gdc/gmux',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  } as Session;
}

const stripHtml = (s: Session): string =>
  renderToStaticMarkup(
    <IdentityStrip session={s} grouped={false} termFocused={false} />
  );

// ---------------------------------------------------------------------------
// What the strip draws
// ---------------------------------------------------------------------------

describe('the identity strip note about scrolling back', () => {
  it('draws the words once for a session on another machine', () => {
    const html = stripHtml(session({ machine: machine() }));
    const hits = html.split(NO_SCROLLBACK_HERE).length - 1;
    expect(hits).toBe(1);
    expect(html).toContain('strip-note');
  });

  it('carries the full sentence as the item title', () => {
    const html = stripHtml(session({ machine: machine() }));
    // The title is escaped in the markup, so the sentence is compared after
    // the one character React escapes here is put back.
    expect(html.replace(/&#x27;/g, "'")).toContain(NO_SCROLLBACK_HERE_TITLE);
  });

  it('draws nothing for a running session on this Mac', () => {
    expect(stripHtml(session())).not.toContain(NO_SCROLLBACK_HERE);
    expect(stripHtml(session())).not.toContain('strip-note');
  });

  it('draws nothing for a session on this Mac that is not running', () => {
    // The charter's own case. The restore card and the ended card already say
    // what this session is, and a second sentence would be noise.
    const html = stripHtml(session({ status: 'exited' }));
    expect(html).not.toContain(NO_SCROLLBACK_HERE);
    expect(html).not.toContain('strip-note');
  });
});

describe('the rule behind the note', () => {
  it('is true for a session on another machine and false for the rest', () => {
    expect(showsNoScrollbackNote(session({ machine: machine() }))).toBe(true);
    expect(showsNoScrollbackNote(session())).toBe(false);
    expect(showsNoScrollbackNote(session({ status: 'exited' }))).toBe(false);
    expect(showsNoScrollbackNote(session({ status: 'needs_input' }))).toBe(
      false
    );
  });
});

describe('both bands draw the shared note', () => {
  // The component itself, rendered on its own, is what each band mounts.
  it('draws the words and the sentence wherever it is mounted', () => {
    const html = renderToStaticMarkup(
      <NoScrollbackNote
        session={session({ machine: machine() })}
        className="strip-note"
      />
    );
    expect(html.split(NO_SCROLLBACK_HERE).length - 1).toBe(1);
    expect(html.replace(/&#x27;/g, "'")).toContain(NO_SCROLLBACK_HERE_TITLE);
  });

  it('draws nothing for a session on this Mac', () => {
    expect(
      renderToStaticMarkup(
        <NoScrollbackNote session={session()} className="strip-note" />
      )
    ).toBe('');
  });

  // A source read rather than a render, because standing up the tab strip
  // needs the layout store, the app store and a project, and a test that
  // mocks all three proves the mocks. What has to stay true is narrow and a
  // read states it exactly: each band's file mounts the one component.
  it.each([
    ['src/renderer/app/TerminalRegion.tsx', 'the "right" orientation'],
    ['src/renderer/app/SessionStrip.tsx', 'the "top" orientation']
  ])('%s mounts it, which is the band for %s', (file) => {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    expect(src).toContain('NoScrollbackNote');
    expect(src).toMatch(/<NoScrollbackNote\b/);
  });
});

describe('the words live in machine-copy.ts', () => {
  it('is what lets the vocabulary audit read them', () => {
    // machine-vocabulary.test.ts already reads machine-copy.ts,
    // session-actions.tsx, SessionStrip.tsx and TerminalRegion.tsx, so neither
    // its file list nor its word list changes for this phase. What has to stay
    // true is that the sentence is composed there and not typed into a
    // component.
    expect(NO_SCROLLBACK_HERE).toBe('Cannot scroll back');
    expect(NO_SCROLLBACK_HERE_TITLE).toBe(
      'Scrolling back is not available for a session on another machine yet. ' +
        'What you see is live.'
    );
  });
});
