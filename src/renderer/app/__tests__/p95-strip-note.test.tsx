/**
 * The band above a session draws no control of its own for a session on
 * another machine — Phase 320.1.
 *
 * WHAT THIS FILE USED TO PIN, AND WHY IT CHANGED TWICE. Phase 95 drew a quiet
 * note in both bands saying that a person could not scroll back through a
 * session on another machine. Phase 100 turned it into a button that opened
 * the last lines panel, and this file pinned that both bands drew it, because
 * the first build of Phase 95 drew its note in one band only and most people
 * never saw it. Phase 320.1 makes such a session scroll like one on this Mac
 * wherever its machine runs a tmux Tortie has measured a live connection on,
 * so the button is gone: it existed only because nothing scrolled, and a
 * control drawn on a remote surface alone is exactly what the operator's rule
 * that a remote session feels identical to a local one removes. The panel
 * stays, opened from the terminal's menu beside this Mac's capture items
 * (build/p3201/SPEC.md D16). This file keeps its name and its job, which is
 * the two bands, and now says that NEITHER draws the control.
 *
 * WHY BOTH BANDS STILL. There is no single band always on screen above a
 * session. The identity strip in TerminalRegion.tsx is the band for the
 * "right" orientation, and the session tab strip in SessionStrip.tsx is the
 * band for the "top" orientation, which is the default. A control that comes
 * back in one of them is invisible in the other's layout, so both are read.
 *
 * HOW THIS RENDERS. `environment` is node and this repository carries no jsdom
 * and no @testing-library/react, so the identity strip is rendered with
 * `renderToStaticMarkup`, the shape p93-attention-row.test.tsx uses. The tab
 * strip needs the layout store, the app store and a project, and a test that
 * mocks all three proves the mocks, so it is read as source, as before.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
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
const actions = await import('../session-actions');
const lines = await import('../../machines/read-lines');

/**
 * The three names Phase 320.1 deleted. This file is the one place they are
 * written out, which is why the scan below skips it.
 */
const GONE = ['showsReadLastLines', 'ReadLastLinesButton', 'READ_LAST_LINES_HERE'];
const GONE_RE = new RegExp(`\\b(?:${GONE.join('|')})\\b`, 'g');

/** The band control's own class and words. */
const BAND_CLASS = 'strip-readback';
const BAND_WORDS = /read last lines/i;

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

const buttons = (html: string): string[] => html.match(/<button\b[^>]*>/g) ?? [];

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The "right" orientation, rendered
// ---------------------------------------------------------------------------

describe('the identity strip, the band in the "right" orientation', () => {
  it.each([
    ['running on another machine', session({ machine: machine() })],
    ['on another machine that is not answering', session({ machine: machine({ answering: false }) })],
    ['running on this Mac', session()],
    ['on this Mac and not running', session({ status: 'exited' })]
  ])('draws no read-back control for a session %s', (_what, row) => {
    const html = stripHtml(row);
    expect(html).not.toContain(BAND_CLASS);
    expect(html).not.toMatch(BAND_WORDS);
  });

  it('draws the same buttons for a session on another machine as for one on this Mac', () => {
    // Remote feels identical to local: the band offers a session over there
    // nothing a session here does not get.
    expect(buttons(stripHtml(session({ machine: machine() })))).toEqual(
      buttons(stripHtml(session()))
    );
  });
});

// ---------------------------------------------------------------------------
// The "top" orientation, and the rest of the tree, read as source
// ---------------------------------------------------------------------------

describe('the tab strip, the band in the "top" orientation, and the shared file', () => {
  it.each([
    'src/renderer/app/SessionStrip.tsx',
    'src/renderer/app/TerminalRegion.tsx',
    'src/renderer/app/session-actions.tsx',
    'src/renderer/styles/app.css'
  ])('%s names neither the control nor its class', (file) => {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    expect([file, src.match(GONE_RE) ?? []]).toEqual([file, []]);
    expect([file, src.includes(BAND_CLASS)]).toEqual([file, false]);
  });

  it('the three deleted names exist nowhere under src', () => {
    const self = resolve(import.meta.dirname, 'p95-strip-note.test.tsx');
    const offenders: string[] = [];
    for (const file of filesUnder(resolve(ROOT, 'src'))) {
      if (file === self) continue;
      let source: string;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const m of source.matchAll(GONE_RE)) offenders.push(`${file}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the scan reads names whole, so a longer name that holds one is not a finding', () => {
    // p100-remote-lines.test.tsx pins `READ_LAST_LINES_HERE_TITLE` absent by
    // name, and that line must not read as the constant this phase deleted.
    expect('all.READ_LAST_LINES_HERE_TITLE'.match(GONE_RE)).toBeNull();
    expect('<ReadLastLinesButton session={s} />'.match(GONE_RE)).toEqual([
      'ReadLastLinesButton'
    ]);
  });

  it('no module still exports them', () => {
    const all = { ...actions, ...lines } as unknown as Record<string, unknown>;
    for (const name of GONE) expect([name, all[name]]).toEqual([name, undefined]);
  });
});

// ---------------------------------------------------------------------------
// What stays
// ---------------------------------------------------------------------------

describe('the read stays where this Mac keeps its capture items', () => {
  it('is still the terminal menu item, and the menu still offers it', () => {
    expect(lines.READ_LAST_LINES_ITEM).toBe('Read Last Lines…');
    const menu = readFileSync(
      resolve(ROOT, 'src/renderer/terminal/terminal-menu.ts'),
      'utf8'
    );
    expect(menu).toMatch(/\bREAD_LAST_LINES_ITEM\b/);
    expect(menu).toContain('openRemoteLines');
  });

  it('keeps the tooltip Phase 320 deleted deleted', () => {
    expect(
      (lines as unknown as Record<string, unknown>).READ_LAST_LINES_HERE_TITLE
    ).toBeUndefined();
  });
});
