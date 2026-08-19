/**
 * Phase 93 — the ⌘J row says who it is, and it can be cleared from where it
 * is seen.
 *
 * The defect this file guards against is one line. The row drew the name of
 * the project tab its session belongs to, and it drew the empty string when no
 * tab matched, so three running agents the operator could not reach all read as
 * a bare `claude-3`. A session with no tab is exactly the row that most needs
 * naming.
 *
 * What these tests hold:
 * - The row draws the folder path for every session, including one whose folder
 *   has no open tab, because the path is on the session row itself.
 * - The machine label is drawn only for a session on another machine, and a
 *   path on another machine keeps that machine's own spelling, with no `~`.
 * - The row's accessible name names the folder, and names the machine as well
 *   when there is one.
 * - A long path loses its MIDDLE and keeps its tail, because the tail is the
 *   folder's own name.
 * - The panel closes only when the jump landed, so a refusal leaves the row on
 *   screen to be ended.
 * - The row's End is the one every other session surface runs, and its menu is
 *   the native session menu through the store's one choke point.
 * - The two new spans carry no fill, no border and no colour of their own, and
 *   `.attention-project` is gone from the stylesheet.
 *
 * The vitest environment is node and this repository has no jsdom, so a
 * rendered button cannot be clicked here and zustand answers a server render
 * from its initial state. That is why the row's contents are a pure component
 * that takes what it draws, exactly as the home screen's recent row is, and why
 * the two gestures are read from the source. What a person sees is a Tier 3
 * screenshot read and build/probe-p93-attention.mjs, not this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session, SessionMachine } from '@shared/types';

const HERE = dirname(fileURLToPath(import.meta.url));

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
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

const {
  AttentionRowBody,
  attentionPathText,
  attentionRowLabel,
  matchesEndChord
} = await import('../AttentionOverlay');
const { accelerator, keymapEntry } = await import('@shared/keymap');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function machine(over: Partial<SessionMachine> = {}): SessionMachine {
  return {
    id: 'p93a',
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
    name: 'claude-3',
    tmuxName: 'claude-3',
    projectPath: '/Users/gdc/gmux',
    cwd: '/Users/gdc/gmux',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

const rowHtml = (s: Session): string =>
  renderToStaticMarkup(
    <AttentionRowBody session={s} excerpt="Do you want to proceed?" age="4m" />
  );

// ---------------------------------------------------------------------------
// What the row draws
// ---------------------------------------------------------------------------

describe('the row names the session it cannot reach', () => {
  it('draws the folder path, with no project tab anywhere in it', () => {
    const html = rowHtml(session());
    expect(html).toContain('attention-path');
    expect(html).toContain('~/gmux');
    // The name is still the first thing on the row.
    expect(html.indexOf('claude-3')).toBeLessThan(html.indexOf('~/gmux'));
  });

  it('draws the path for a session in the home folder itself', () => {
    // The operator's three unreachable rows all carry exactly this path.
    const html = rowHtml(session({ projectPath: '/Users/gdc' }));
    expect(html).toContain('>~<');
  });

  it('draws no machine label for a session on this Mac', () => {
    expect(rowHtml(session())).not.toContain('attention-machine');
  });

  it('draws the machine label for a session on another machine', () => {
    const html = rowHtml(
      session({ machine: machine(), projectPath: '/home/gdc/gmux' })
    );
    expect(html).toContain('attention-machine');
    expect(html).toContain('Mac Pro');
    // The label sits between the name and the path.
    expect(html.indexOf('Mac Pro')).toBeGreaterThan(html.indexOf('claude-3'));
    expect(html.indexOf('Mac Pro')).toBeLessThan(html.indexOf('/home/gdc/gmux'));
  });

  it('leaves a path on another machine spelled the way that machine spells it', () => {
    const html = rowHtml(
      session({ machine: machine(), projectPath: '/Users/gdc/gmux' })
    );
    // No tilde: `/Users/gdc` over there is that machine's account, and Tortie
    // does not know it is this person's home folder.
    expect(html).toContain('/Users/gdc/gmux');
    expect(html).not.toContain('~/gmux');
  });

  it('still draws the row when the session carries no excerpt', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody session={session()} excerpt="" age="now" />
    );
    expect(html).toContain('claude-3');
    expect(html).toContain('~/gmux');
  });
});

describe('the path text', () => {
  it('folds this Mac home folder and keeps a short path whole', () => {
    expect(attentionPathText(session())).toBe('~/gmux');
  });

  it('loses its middle and keeps its tail when it is long', () => {
    const long = '/Users/gdc/src/very/deeply/nested/place/for/the/webapp';
    const drawn = attentionPathText(session({ projectPath: long }));
    expect(drawn.length).toBeLessThanOrEqual(34);
    expect(drawn).toContain('…');
    expect(drawn.endsWith('webapp')).toBe(true);
  });
});

describe('the row accessible name', () => {
  it('names the session and the folder on this Mac', () => {
    expect(attentionRowLabel(session())).toBe('claude-3 in ~/gmux');
  });

  it('names the machine as well when the session is on one', () => {
    expect(
      attentionRowLabel(
        session({ machine: machine(), projectPath: '/home/gdc/gmux' })
      )
    ).toBe('claude-3 in /home/gdc/gmux on Mac Pro');
  });

  it('carries the whole path even when the drawn one is elided', () => {
    const long = '/Users/gdc/src/very/deeply/nested/place/for/the/webapp';
    const label = attentionRowLabel(session({ projectPath: long }));
    expect(label).toBe(
      'claude-3 in ~/src/very/deeply/nested/place/for/the/webapp'
    );
    expect(label).not.toContain('…');
  });
});

// ---------------------------------------------------------------------------
// The two gestures, read from the source
// ---------------------------------------------------------------------------

describe('the panel source', () => {
  const source = readFileSync(resolve(HERE, '../AttentionOverlay.tsx'), 'utf8');

  it('no longer looks a session up in the projects list', () => {
    expect(source).not.toContain('projectNameFor');
    expect(source).not.toContain('targetOfProject');
    expect(source).not.toContain('s.projects');
  });

  it('closes only when the jump landed', () => {
    expect(source).toContain('if (result.ok) setOpen(false);');
  });

  it('ends the selected row on the keymap chord, through the shared verb', () => {
    // The panel spells no chord of its own. It asks the keymap what the chord
    // is and compares the key press against that, which is what keeps the ⌘/
    // overlay, the Settings map, the recorder's reserved list and this footer
    // saying the same thing.
    expect(source).toContain('matchesEndChord(e)');
    expect(source).toContain('closeSession(row)');
    expect(source).toContain("keyDisplay('session.endFromAttention')");
  });

  it('has one keymap row for that chord, and it is the only key that ends a session', () => {
    expect(accelerator('session.endFromAttention')).toBe('Cmd+Backspace');
    // The recorded decision on `session.end` still stands: the verb a menu
    // runs has no chord anywhere, and `accelerator` throws to prove it.
    expect(() => accelerator('session.end')).toThrow();
    expect(keymapEntry('session.endFromAttention').scope).toBe('attention');
  });

  it('matches the chord and nothing near it', () => {
    const press = (over: Record<string, unknown> = {}) => ({
      key: 'Backspace',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...over
    });
    expect(matchesEndChord(press())).toBe(true);
    // A bare Backspace is what the file tree and Source Control lists use, and
    // it must not end a session here.
    expect(matchesEndChord(press({ metaKey: false }))).toBe(false);
    expect(matchesEndChord(press({ shiftKey: true }))).toBe(false);
    expect(matchesEndChord(press({ altKey: true }))).toBe(false);
    expect(matchesEndChord(press({ key: 'Delete' }))).toBe(false);
  });

  it('opens the native session menu through the store choke point', () => {
    expect(source).toContain('sessionMenuItems(session, session.id)');
    expect(source).toContain('setMenu({');
    // Native menus only. Nothing here draws a menu in the DOM.
    expect(source).not.toContain('menu-item');
  });

  it('tells the person about the new gesture in the footer', () => {
    expect(source).toContain('end session');
  });
});

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

describe('the two new spans', () => {
  const css = readFileSync(
    resolve(HERE, '../../styles/app.css'),
    'utf8'
  );
  const block = (selector: string): string => {
    const at = css.indexOf(`${selector} {`);
    expect(at, `${selector} is missing from app.css`).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };

  it('replaced the project span, which is gone', () => {
    expect(css).not.toContain('.attention-project');
  });

  it('carry no fill, no border and no colour of their own', () => {
    for (const selector of ['.attention-machine', '.attention-path']) {
      const rule = block(selector);
      expect(rule).not.toMatch(/background/);
      expect(rule).not.toMatch(/border(?!-)/);
      expect(rule).toContain('color: var(--text-muted)');
    }
  });

  it('step up on the selected row, the way the old span did', () => {
    expect(css).toContain('.attention-row.selected .attention-machine,');
    expect(css).toContain('.attention-row.selected .attention-path,');
  });

  it('let the confirm draw in front of the panel that stays open', () => {
    const rule = block('.attention-panel.under-confirm');
    expect(rule).toContain('z-index: var(--z-modal)');
  });
});
