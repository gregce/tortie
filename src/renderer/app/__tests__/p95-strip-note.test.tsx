/**
 * Phase 100 — both bands above the terminal offer to read the last lines of a
 * session on another machine.
 *
 * WHAT THIS FILE USED TO PIN, AND WHY IT CHANGED. Phase 95 drew a quiet note in
 * both bands saying that a person could not scroll back, with a tooltip saying
 * that it was not available for a session on another machine yet. Phase 100
 * makes a person able to read back, so the second half of that tooltip became
 * false. The note is a button now, it opens the last lines panel, and both
 * Phase 95 strings are deleted from the codebase. This file keeps its name and
 * its job, which is the band coverage rule, and every assertion in it moved to
 * the new names. Neither old string is written out here, because
 * ./p100-remote-lines.test.tsx reads every file under src and fails on either.
 *
 * WHY BOTH BANDS. There is no single band always on screen above a session. The
 * identity strip in TerminalRegion.tsx is the band for the "right" orientation.
 * The session tab strip in SessionStrip.tsx is the band for the "top"
 * orientation, which is what `sessionOrientation` defaults to and what most
 * people are looking at. The first build of Phase 95 drew its note in the
 * identity strip alone, so it was off screen in the default layout. The last
 * describe below is what stops that returning: it reads both files and fails if
 * either stops mounting the shared component.
 *
 * WHAT GETS NO BUTTON. Every session on this Mac, running or not. It has a real
 * scrollbar and a real wheel, and it has the two "Capture Last N Lines" items
 * as well, so a fourth way to read the same history would be clutter.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the strip is rendered with
 * `renderToStaticMarkup`, which is the shape p93-attention-row.test.tsx uses.
 * The rule itself is also read straight off `showsReadLastLines`, so a later
 * change to the markup cannot quietly change which sessions are offered it.
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
const { ReadLastLinesButton, showsReadLastLines } = await import(
  '../session-actions'
);
const {
  READ_LAST_LINES_HERE,
  READ_LAST_LINES_HERE_TITLE
} = await import('../../machines/read-lines');
const { useApp } = await import('../../state/store');

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

describe('the identity strip button that reads the last lines', () => {
  it('draws the words once for a session on another machine', () => {
    const html = stripHtml(session({ machine: machine() }));
    const hits = html.split(READ_LAST_LINES_HERE).length - 1;
    expect(hits).toBe(1);
    expect(html).toContain('strip-readback');
  });

  it('is a real button rather than the span Phase 95 drew', () => {
    const html = stripHtml(session({ machine: machine() }));
    expect(html).toContain('<button type="button" class="strip-readback"');
  });

  it('carries the full sentence as the item title', () => {
    const html = stripHtml(session({ machine: machine() }));
    // The title is escaped in the markup, so the sentence is compared after
    // the one character React escapes here is put back.
    expect(html.replace(/&#x27;/g, "'")).toContain(READ_LAST_LINES_HERE_TITLE);
  });

  it('draws nothing for a running session on this Mac', () => {
    expect(stripHtml(session())).not.toContain(READ_LAST_LINES_HERE);
    expect(stripHtml(session())).not.toContain('strip-readback');
  });

  it('draws nothing for a session on this Mac that is not running', () => {
    // The Phase 95 charter's own case, and it still holds. The restore card and
    // the ended card already say what this session is, and a session on this
    // Mac has a scrollbar of its own either way.
    const html = stripHtml(session({ status: 'exited' }));
    expect(html).not.toContain(READ_LAST_LINES_HERE);
    expect(html).not.toContain('strip-readback');
  });
});

describe('the rule behind the button', () => {
  it('is true for a session on another machine and false for the rest', () => {
    expect(showsReadLastLines(session({ machine: machine() }))).toBe(true);
    expect(showsReadLastLines(session())).toBe(false);
    expect(showsReadLastLines(session({ status: 'exited' }))).toBe(false);
    expect(showsReadLastLines(session({ status: 'needs_input' }))).toBe(false);
  });
});

describe('both bands draw the shared button', () => {
  // The component itself, rendered on its own, is what each band mounts.
  it('draws the words and the sentence wherever it is mounted', () => {
    const html = renderToStaticMarkup(
      <ReadLastLinesButton
        session={session({ machine: machine() })}
        className="strip-readback"
      />
    );
    expect(html.split(READ_LAST_LINES_HERE).length - 1).toBe(1);
    expect(html.replace(/&#x27;/g, "'")).toContain(READ_LAST_LINES_HERE_TITLE);
  });

  it('draws nothing for a session on this Mac', () => {
    expect(
      renderToStaticMarkup(
        <ReadLastLinesButton session={session()} className="strip-readback" />
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
    expect(src).toContain('ReadLastLinesButton');
    expect(src).toMatch(/<ReadLastLinesButton\b/);
  });
});

describe('pressing the button opens the panel', () => {
  it('opens it on the session the button was drawn for', () => {
    // The shipped handler, called the way a click calls it. The element is
    // built by the component itself, so this presses what a person presses.
    const row = session({ id: 'p100s', machine: machine() });
    const element = ReadLastLinesButton({
      session: row,
      className: 'strip-readback'
    });
    expect(element).not.toBeNull();
    const onClick = element?.props.onClick as (() => void) | undefined;
    expect(typeof onClick).toBe('function');
    onClick?.();
    expect(useApp.getState().remoteLinesSessionId).toBe('p100s');
    useApp.getState().closeRemoteLines();
  });
});

describe('the words live in presentation.ts', () => {
  it('is what lets the vocabulary audit read them', () => {
    // machine-vocabulary.test.ts already reads presentation.ts,
    // session-actions.tsx, SessionStrip.tsx and TerminalRegion.tsx, so its word
    // list does not change for this phase. What has to stay true is that the
    // sentence is composed there and not typed into a component.
    expect(READ_LAST_LINES_HERE).toBe('Read last lines');
    expect(READ_LAST_LINES_HERE_TITLE).toBe(
      'Tortie cannot scroll back through a session on another machine. ' +
        'Open this to read the last lines it printed.'
    );
  });
});
