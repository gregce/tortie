/**
 * Phase 72 — the saved output panel, and the fact it exists to state.
 *
 * The panel's job is one sentence: this is a copy, it was taken at a named
 * moment, and it is not live. Everything below checks that sentence is there
 * in every state a person can reach, including the two states where something
 * is missing.
 *
 * What these tests hold:
 * - The header names the machine and the moment, and it is byte for byte the
 *   sentence in the spec.
 * - A copy with no recorded time says so instead of drawing a date from zero.
 * - The panel renders nothing until a session is open in it.
 * - The output is drawn as text and never as markup, which is what stops a
 *   session on a machine Tortie does not control from putting anything into
 *   the DOM.
 * - The session menu offers the panel on every row, and offers it disabled
 *   with the reason when there is no copy.
 *
 * The vitest environment is node, so the component assertions read static
 * markup from react-dom/server. What a person sees is a Tier 3 screenshot
 * read, not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session, SessionMachine } from '@shared/types';

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
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
  void fn;
  return 0;
});

const {
  RESTORE_KEPT_HERE,
  SAVED_OUTPUT_ITEM,
  SAVED_OUTPUT_NONE,
  SAVED_OUTPUT_UNVERIFIED,
  savedOutputHeader,
  savedOutputHeaderLocal,
  savedWhen
} = await import('../machine-copy');
const { SavedOutputModal, SavedOutputPanel } = await import(
  '../SavedOutputModal'
);
const { sessionMenuItems } = await import('../session-actions');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

/** 17 August 2026, 14:32 local time. Built from parts so it is not UTC bound. */
const WHEN = new Date(2026, 7, 17, 14, 32, 0).getTime();

function sess(over: Partial<Session> = {}): Session {
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

interface Item {
  label: string;
  disabled?: boolean;
  sublabel?: string;
}

function itemsOf(items: readonly (Item | 'sep')[]): Item[] {
  return items.filter((x): x is Item => x !== 'sep');
}

// ---------------------------------------------------------------------------
// The sentence
// ---------------------------------------------------------------------------

describe('the line above the saved output', () => {
  it('names the machine and the moment, in the words the spec wrote', () => {
    expect(savedOutputHeader('Studio', WHEN)).toBe(
      'Saved from Studio on 17 August 2026 at 14:32. This is a copy Tortie ' +
        'kept on this Mac. It is not live.'
    );
  });

  it('names no machine for a session on this Mac', () => {
    expect(savedOutputHeaderLocal(WHEN)).toBe(
      'Saved on 17 August 2026 at 14:32. This is a copy Tortie kept on this ' +
        'Mac. It is not live.'
    );
  });

  it('says the time was not recorded rather than drawing a date from zero', () => {
    expect(savedOutputHeader('Studio', 0)).toBe(
      'Saved from Studio. Tortie did not record when this copy was taken. ' +
        'This is a copy Tortie kept on this Mac. It is not live.'
    );
    expect(savedOutputHeaderLocal(0)).toContain('did not record when');
    expect(savedOutputHeaderLocal(0)).not.toContain('1970');
  });

  it('always ends by saying the copy is not live', () => {
    for (const text of [
      savedOutputHeader('Studio', WHEN),
      savedOutputHeader('Studio', 0),
      savedOutputHeaderLocal(WHEN),
      savedOutputHeaderLocal(0)
    ]) {
      expect(text).toContain('It is not live.');
    }
  });

  it('writes the month in full and pads the clock', () => {
    expect(savedWhen(new Date(2026, 0, 3, 9, 5, 0).getTime())).toBe(
      '3 January 2026 at 09:05'
    );
  });

  it('uses no dash of any kind in any sentence a person reads', () => {
    for (const text of [
      savedOutputHeader('Studio', WHEN),
      savedOutputHeaderLocal(WHEN),
      SAVED_OUTPUT_NONE,
      SAVED_OUTPUT_UNVERIFIED,
      RESTORE_KEPT_HERE
    ]) {
      expect(text).not.toMatch(/[—–]/);
    }
  });
});

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

describe('the panel', () => {
  const nothing = { session: null, output: null, loading: false, close() {} };

  it('renders nothing at all until a session is open in it', () => {
    // The wrapper reads the store, and zustand answers a server render from
    // the store's INITIAL state, in which no session is open.
    expect(renderToStaticMarkup(<SavedOutputModal />)).toBe('');
  });

  it('says it has nothing when there is no copy, and still opens', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess({ machine: STUDIO })}
      />
    );
    expect(html).toContain(SAVED_OUTPUT_NONE);
    expect(html).toContain('auth');
  });

  it('says it is reading while the read is in flight', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel {...nothing} loading session={sess()} />
    );
    expect(html).toContain('Reading the saved copy');
    expect(html).not.toContain(SAVED_OUTPUT_NONE);
  });

  it('draws the header and the body when there is a copy', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess({ machine: STUDIO })}
        output={{
          text: 'the agent said something\n',
          capturedAt: WHEN,
          machineId: 'studio',
          verified: true,
          bytes: 25,
          lines: 1
        }}
      />
    );
    expect(html).toContain('Saved from Studio on 17 August 2026 at 14:32.');
    expect(html).toContain('the agent said something');
    expect(html).not.toContain(SAVED_OUTPUT_UNVERIFIED);
  });

  it('names no machine for a session on this Mac', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess()}
        output={{
          text: 'local screen\n',
          capturedAt: WHEN,
          machineId: null,
          verified: true,
          bytes: 13,
          lines: 1
        }}
      />
    );
    expect(html).toContain('Saved on 17 August 2026 at 14:32.');
    expect(html).not.toContain('Saved from');
  });

  it('says so when the bytes did not match what was recorded', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess()}
        output={{
          text: 'half a screen\n',
          capturedAt: WHEN,
          machineId: null,
          verified: false,
          bytes: 14,
          lines: 1
        }}
      />
    );
    expect(html).toContain(SAVED_OUTPUT_UNVERIFIED);
  });

  it('draws the output as text and never as markup', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess({ machine: STUDIO })}
        output={{
          text: '<img src=x onerror=alert(1)> & "quoted"\n',
          capturedAt: WHEN,
          machineId: 'studio',
          verified: true,
          bytes: 40,
          lines: 1
        }}
      />
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('names the machine of a row whose machine a person removed', () => {
    const html = renderToStaticMarkup(
      <SavedOutputPanel
        {...nothing}
        session={sess({
          status: 'discarded',
          machineGone: {
            label: 'Studio',
            lastStatus: 'running',
            lastSeenAt: WHEN,
            forgottenAt: WHEN
          }
        })}
        output={{
          text: 'last words\n',
          capturedAt: WHEN,
          machineId: 'studio',
          verified: true,
          bytes: 11,
          lines: 1
        }}
      />
    );
    expect(html).toContain('Saved from Studio on');
  });
});

// ---------------------------------------------------------------------------
// The way in
// ---------------------------------------------------------------------------

describe('the session menu item', () => {
  it('is offered on a row that has a copy, on this Mac and on a machine', () => {
    for (const machine of [undefined, STUDIO]) {
      const item = itemsOf(
        sessionMenuItems(
          sess({ savedOutputAt: WHEN, ...(machine ? { machine } : {}) }),
          'x'
        )
      ).find((x) => x.label === SAVED_OUTPUT_ITEM);
      expect(item).toBeDefined();
      expect(item?.disabled).toBeUndefined();
    }
  });

  it('is offered disabled with the reason when there is no copy', () => {
    const item = itemsOf(sessionMenuItems(sess(), 'x')).find(
      (x) => x.label === SAVED_OUTPUT_ITEM
    );
    expect(item?.disabled).toBe(true);
    expect(item?.sublabel).toBe(SAVED_OUTPUT_NONE);
  });

  it('is offered on an unknown row, because it reads only Tortie s own files', () => {
    const labels = itemsOf(
      sessionMenuItems(sess({ status: 'unknown', savedOutputAt: WHEN }), 'x')
    ).map((x) => x.label);
    expect(labels).toEqual([
      'Show what it loaded…',
      SAVED_OUTPUT_ITEM,
      'Copy directory path'
    ]);
  });

  it('sits directly under the loaded readout', () => {
    const labels = itemsOf(sessionMenuItems(sess(), 'x')).map((x) => x.label);
    expect(labels.indexOf(SAVED_OUTPUT_ITEM)).toBe(
      labels.indexOf('Show what it loaded…') + 1
    );
  });
});
