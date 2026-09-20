/**
 * Phase 293. The sheet as a person's screen reader and the probe read it: the
 * DOM contract of SPEC 2.14, rendered on the server over the REAL store.
 *
 * What these tests hold:
 *  - the DOM contract: the scrim, the dialog and its name, the toolbar and its
 *    mode, the grid, the group and row stamps, the visible button and its verb,
 *    the checkbox, the footer;
 *  - BOTH TOOLBAR MODES ARE ONE ELEMENT with the one 47px class, and the
 *    stylesheet states the 47px rather than summing it;
 *  - NO `data-session-id` ANYWHERE, on either tab, with a panel or a batch
 *    open: `focusedSessionRowId()` and `menuPointFor()` read that attribute,
 *    and a second bearer behind a modal is how a menu lands on the wrong row;
 *  - the tab counts are WHOLE-TAB totals, which a filter never changes;
 *  - both tabs are `tabIndex={0}` and NEVER `disabled`, a running batch
 *    included, where they are `aria-disabled` instead;
 *  - checkboxes are controlled by SESSION ID;
 *  - a row with no id draws no checkbox, no button and no ellipsis;
 *  - the Past tab is not a table, has no checkbox, and its Restore wears the
 *    `past-restore` class a shot drive reads;
 *  - the Past tab draws ONE list in main's order, each row naming its project,
 *    and a heading only when the project filter names one project (the
 *    operator's ruling, 2026-09-19);
 *  - the five states that replace the grid;
 *  - Tab wraps through `trapTabKey` and never `modalKeyDown` (source text).
 *
 * The vitest environment is node, so this reads static markup from
 * react-dom/server. Effects do not run here; the keyboard is the probe's.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve(),
      list: () => Promise.resolve([])
    },
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve()
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
  removeEventListener() {},
  visibilityState: 'visible'
});
vi.stubGlobal('requestAnimationFrame', () => 0);

// zustand answers a SERVER render from `getInitialState`, where the sheet is
// closed. The hook below runs the same selector over the store's LIVE state,
// which is what the real hook returns in the app; every other member of the
// store (`getState`, `setState`, `subscribe`) is the real one.
vi.mock('../../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/store')>();
  const real = actual.useApp;
  const hook = (selector: (state: unknown) => unknown): unknown =>
    selector(real.getState());
  return { ...actual, useApp: Object.assign(hook, real) };
});

const { useApp } = await import('../../state/store');
const { SessionManagerSheet } = await import('../SessionManagerSheet');
const { selectManageProjection } = await import('../use-sheet-refresh');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function session(
  id: string,
  projectPath: string,
  status: SessionStatus = 'running',
  patch: Partial<Session> = {}
): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'claude',
    status,
    createdAt: new Date(2026, 8, 16, 9, 30).getTime(),
    ...patch
  };
}

const SESSIONS: Session[] = [
  session('a1', '/Users/me/src/alpha', 'running'),
  session('a2', '/Users/me/src/alpha', 'exited', { hasSavedScrollback: true }),
  session('b1', '/Users/me/src/beta', 'needs_input'),
  session('r1', '/srv/work/api', 'idle', { machine: STUDIO })
];

const PAST: Session[] = [
  session('p1', '/Users/me/src/alpha', 'discarded', { removedAt: 1 }),
  session('p2', '/srv/old', 'discarded', {
    removedAt: 1,
    machineGone: {
      label: 'Old Mini',
      lastStatus: 'idle',
      lastSeenAt: 1,
      forgottenAt: 2
    }
  })
];

function open(
  tab: 'managed' | 'past',
  patch: Record<string, unknown> = {},
  lists: { sessions?: Session[]; pastSessions?: Session[] } = {}
): void {
  useApp.setState({
    sessions: lists.sessions ?? SESSIONS,
    pastSessions: lists.pastSessions ?? PAST,
    projects: [],
    tabOrder: [],
    machineStates: [],
    handbacks: {},
    restoringIds: {},
    shellPathReady: true,
    pastLoading: false,
    sessionSheet: {
      tab,
      search: '',
      project: 'all',
      tabFilter: 'all',
      stateFilter: 'all',
      sort: null,
      checked: {},
      inline: null,
      batch: null,
      listError: null,
      activity: {},
      ...patch
    }
  });
}

const render = (): string => renderToStaticMarkup(<SessionManagerSheet />);

/** Every opening tag that carries a class token, as a list of tags. */
function tagsWith(html: string, attr: string): string[] {
  return [...html.matchAll(new RegExp(`<[a-z]+[^>]*${attr}[^>]*>`, 'g'))].map(
    (m) => m[0]
  );
}

beforeEach(() => {
  useApp.setState({ sessionSheet: null });
});

describe('the DOM contract (Phase 293, SPEC 2.14)', () => {
  it('the scrim, the dialog and its name', () => {
    open('managed');
    const html = render();
    expect(html).toMatch(/^<div class="modal-scrim session-sheet-scrim">/);
    expect(html).toMatch(
      /<div class="modal session-sheet" role="dialog" aria-modal="true" aria-label="Session manager"/
    );
  });

  it('the grid, its groups, its rows, the visible button and the footer', () => {
    open('managed');
    const html = render();
    expect(html).toContain('<table class="sm-grid">');
    expect(html).toContain(
      '<tr class="sm-group" data-manage-group="/Users/me/src/alpha" data-tab-open="no">'
    );
    expect(html).toContain(
      '<tr class="sm-group" data-manage-group="studio:/srv/work/api" data-tab-open="no">'
    );
    expect(html).toContain(
      '<tr class="sm-row" data-manage-row="a1" data-status="running">'
    );
    expect(html).toMatch(/data-manage-primary="a1" data-verb="end"/);
    expect(html).toMatch(/data-manage-primary="a2" data-verb="restore"/);
    expect(html).toContain('data-manage-check="a1"');
    expect(html).toContain('data-manage-more="a1"');
    expect(html).toContain('data-manage-name="a1"');
    expect(html).toMatch(/<footer class="sm-foot" data-sm="foot"><span>4 managed sessions<\/span>/);
  });

  it('the tablist and the panel it controls', () => {
    open('managed');
    const html = render();
    expect(html).toContain(
      'role="tablist" aria-label="Session lifecycle"'
    );
    expect(html).toContain(
      'id="sm-panel" role="tabpanel" aria-labelledby="sm-tab-managed"'
    );
    expect(html).toContain('title="Sessions across every project and machine"');
  });

  it('sort headings are buttons with a hover title, and the actions heading is for screen readers', () => {
    open('managed', { sort: { key: 'created', dir: -1 } });
    const html = render();
    expect(html).toContain('data-sort="name"');
    expect(html).toMatch(
      /<th scope="col" aria-sort="descending"><button type="button" class="sm-sort" data-sort="created" title="When the session was first created, not when its project tab was last opened.">/
    );
    expect(html).toMatch(/aria-sort="none"><button type="button" class="sm-sort" data-sort="messages"/);
    expect(html).toContain('<span class="sr-only">Actions</span>');
    expect(html).toContain('codicon-arrow-down');
  });
});

describe('the toolbar is ONE 47px element in both modes (Phase 293, SPEC 2.2)', () => {
  it('filters mode', () => {
    open('managed');
    const html = render();
    const bars = tagsWith(html, 'data-sm="toolbar"');
    expect(bars).toEqual([
      '<div class="sm-toolbar" data-sm="toolbar" data-mode="filters">'
    ]);
    expect(html).toContain('id="sm-filter-project"');
    expect(html).toContain('id="sm-filter-tab"');
    expect(html).toContain('id="sm-filter-state"');
    expect(html).not.toContain('data-sm="end-selected"');
  });

  it('selection mode wears the same class', () => {
    open('managed', { checked: { a1: true, a2: true } });
    const html = render();
    const bars = tagsWith(html, 'data-sm="toolbar"');
    expect(bars).toEqual([
      '<div class="sm-toolbar" data-sm="toolbar" data-mode="selection">'
    ]);
    expect(html).toContain('<strong class="sm-selected">2 selected</strong>');
    expect(html).toContain('1 running · 1 ended or unreachable');
    expect(html).toMatch(/data-sm="end-selected"[^>]*>/);
    expect(tagsWith(html, 'data-sm="end-selected"')[0]).not.toContain('disabled');
  });

  it('End selected is off when nothing selected can end', () => {
    open('managed', { checked: { a2: true } });
    const html = render();
    expect(tagsWith(html, 'data-sm="end-selected"')[0]).toContain('disabled');
  });

  it('the stylesheet states 47px and 52px outright, in both modes', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../session-manager.css'),
      'utf8'
    );
    expect(css).toMatch(/--sm-toolbar-h:\s*47px;/);
    expect(css).toMatch(/--sm-title-h:\s*52px;/);
    const toolbar = css.slice(css.indexOf('.session-sheet .sm-toolbar {'));
    const block = toolbar.slice(0, toolbar.indexOf('}'));
    expect(block).toMatch(/height:\s*var\(--sm-toolbar-h\);/);
    expect(block).toMatch(/box-sizing:\s*border-box;/);
    // The selection mode changes the ground and nothing that moves a line.
    const selection = css.slice(
      css.indexOf(".session-sheet .sm-toolbar[data-mode='selection'] {")
    );
    const selectionBlock = selection.slice(0, selection.indexOf('}'));
    expect(selectionBlock).not.toMatch(/height|padding|border|margin/);
  });
});

describe('what the sheet never stamps (Phase 293, SPEC 2.14)', () => {
  it('no data-session-id anywhere, on either tab, with a panel and a batch open', () => {
    open('managed', {
      checked: { a1: true },
      batch: {
        runId: 0,
        phase: 'confirm',
        named: [{ id: 'a1', where: 'alpha' }],
        skippedAtOpen: { ended: 0, unreachable: 0 },
        targets: [],
        outcomes: {},
        stopRequested: false
      }
    });
    const managed = render();
    open('managed', { inline: { id: 'a1', kind: 'details' } });
    const withPanel = render();
    open('past', { inline: { id: 'p1', kind: 'details' } });
    const past = render();
    for (const html of [managed, withPanel, past]) {
      expect(html).not.toContain('data-session-id');
    }
    expect(managed).toContain('data-batch-target="a1"');
    expect(withPanel).toContain('data-manage-inline="a1"');
    expect(past).toContain('data-manage-inline="p1"');
  });
});

describe('the counts, the tabs and the checkboxes (Phase 293, SPEC 2.3 and 2.10)', () => {
  it('the tab counts are whole-tab totals, which a filter never changes', () => {
    open('managed', { stateFilter: 'needs-input', search: 'name-b' });
    const html = render();
    expect(html).toMatch(/id="sm-tab-managed"[^>]*>.*?<span class="sm-count">4<\/span>/);
    expect(html).toMatch(/id="sm-tab-past"[^>]*>.*?<span class="sm-count">2<\/span>/);
    // The footer counts what the filters leave.
    expect(html).toContain('<span>1 managed session</span>');
  });

  it('both tabs are tabIndex 0 and never disabled, a running batch included', () => {
    for (const phase of ['confirm', 'running'] as const) {
      open('managed', {
        checked: { a1: true },
        batch: {
          runId: phase === 'running' ? 7 : 0,
          phase,
          named: [{ id: 'a1', where: 'alpha' }],
          skippedAtOpen: { ended: 0, unreachable: 0 },
          targets: phase === 'running' ? ['a1'] : [],
          outcomes: phase === 'running' ? { a1: { state: 'ending' } } : {},
          stopRequested: false
        }
      });
      const tabs = tagsWith(render(), 'role="tab"');
      expect(tabs.length).toBe(2);
      for (const tab of tabs) {
        expect(tab).toContain('tabindex="0"');
        expect(tab).not.toMatch(/\bdisabled=""/);
        if (phase === 'running') expect(tab).toContain('aria-disabled="true"');
        else expect(tab).not.toContain('aria-disabled');
      }
    }
  });

  it('checkboxes are controlled by session id', () => {
    open('managed', { checked: { b1: true } });
    const html = render();
    const box = (id: string): string =>
      tagsWith(html, `data-manage-check="${id}"`)[0] ?? '';
    expect(box('b1')).toContain('checked=""');
    expect(box('a1')).not.toContain('checked');
    expect(html).toContain(
      '<tr class="sm-row checked" data-manage-row="b1" data-status="needs_input">'
    );
    expect(box('b1')).toContain('aria-label="Select name-b1 in beta"');
  });

  it('the header checkbox names how many visible rows it selects', () => {
    open('managed', { stateFilter: 'running' });
    const html = render();
    const all = tagsWith(html, 'id="sm-select-all"')[0] ?? '';
    expect(all).toContain('aria-label="Select all 3 visible sessions"');
  });

  it('a running batch makes every row control inert', () => {
    open('managed', {
      checked: { a1: true },
      batch: {
        runId: 3,
        phase: 'running',
        named: [{ id: 'a1', where: 'alpha' }],
        skippedAtOpen: { ended: 0, unreachable: 0 },
        targets: ['a1'],
        outcomes: { a1: { state: 'ending' } },
        stopRequested: false
      }
    });
    const html = render();
    for (const tag of [
      ...tagsWith(html, 'data-manage-check='),
      ...tagsWith(html, 'data-manage-primary='),
      ...tagsWith(html, 'data-manage-more=')
    ]) {
      expect(tag).toContain('disabled=""');
    }
  });

  it('a row whose restore is in the air is inert even when it already reads live (the fix round)', () => {
    // SPEC 2.7: a busy row is inert. A restore that has not answered yet can
    // already read `running`, and its End would race its own restore.
    open('managed');
    useApp.setState({ restoringIds: { a1: true } });
    const html = render();
    const own = (attr: string): string =>
      tagsWith(html, `${attr}="a1"`)[0] ?? '';
    expect(own('data-manage-primary')).toContain('data-verb="end"');
    expect(own('data-manage-primary')).toContain('disabled=""');
    expect(own('data-manage-more')).toContain('disabled=""');
    expect(own('data-manage-check')).toContain('disabled=""');
    // Its neighbour is not.
    expect(tagsWith(html, 'data-manage-primary="b1"')[0]).not.toContain('disabled=""');
  });

  it('a row with no id draws no checkbox, no button and no ellipsis', () => {
    open('managed', {}, { sessions: [session('', '/w/x'), session('ok', '/w/x')] });
    const html = render();
    expect(html).toContain('data-manage-row=""');
    expect(html).not.toContain('data-manage-check=""');
    expect(html).not.toContain('data-manage-primary=""');
    expect(html).not.toContain('data-manage-more=""');
    expect(html).toContain('data-manage-check="ok"');
  });
});

describe('the cells (Phase 293, SPEC 2.5)', () => {
  it('a local row waits for the answer, and a row on another machine never does', () => {
    open('managed');
    const html = render();
    const row = (id: string): string => {
      const at = html.indexOf(`data-manage-row="${id}"`);
      return html.slice(at, html.indexOf('</tr>', at));
    };
    expect(row('a1')).toContain('aria-busy="true">…</span>');
    expect(row('r1')).not.toContain('aria-busy');
    expect(row('r1')).toContain('<small>Unavailable</small>');
  });

  it('a createdAt of 0 is a dash with no small and no title', () => {
    open('managed', {}, { sessions: [session('z', '/w/z', 'idle', { createdAt: 0 })] });
    const html = render();
    expect(html).toContain(
      '<td class="sm-col-created"><span class="sm-cell-main">—</span></td>'
    );
    expect(html).not.toMatch(/19(69|70)/);
  });

  it('an ended local row says what was saved; a row on another machine says nothing', () => {
    open('managed', {}, {
      sessions: [
        session('e1', '/w/e', 'exited', { hasSavedScrollback: true }),
        session('e2', '/w/e', 'exited'),
        session('e3', '/srv/e', 'exited', { machine: STUDIO })
      ]
    });
    const html = render();
    const state = (id: string): string => {
      const at = html.indexOf(`data-manage-row="${id}"`);
      const cell = html.indexOf('class="sm-col-state"', at);
      return html.slice(cell, html.indexOf('</td>', cell));
    };
    expect(state('e1')).toContain('<small>Output saved</small>');
    expect(state('e2')).not.toContain('<small>');
    expect(state('e3')).not.toContain('<small>');
  });
});

describe('the Past tab (Phase 293, SPEC 2.11)', () => {
  it('is not a table, has no checkbox, and its Restore wears past-restore', () => {
    open('past');
    const html = render();
    expect(html).not.toContain('<table');
    expect(html).not.toContain('data-manage-check');
    expect(html).not.toContain('id="sm-filter-state"');
    expect(html).toMatch(/class="btn btn-secondary btn-sm sm-restore past-restore" data-manage-primary="p1" data-verb="restore"/);
    expect(html).toContain(
      'data-manage-row="p1" data-row-group="/Users/me/src/alpha" data-machine-gone="no"'
    );
    expect(html).toContain(
      'data-manage-row="p2" data-row-group="!gone:Old Mini:/srv/old" data-machine-gone="yes"'
    );
    // The fix round, W8: today's footer sentences behind hover.
    expect(html).toContain(
      '<span>2 sessions across 2 projects</span><span title="Restore one to pick it back up. Capture files stay in each project’s history folder.">Kept for 90 days.</span>'
    );
  });

  it('a row says its agent, the folder it ran in and what Restore will do (the reverify, R1)', () => {
    open('past', {}, {
      pastSessions: [
        session('w1', '/Users/me/src/alpha', 'discarded', {
          removedAt: new Date(2026, 8, 19, 14, 5).getTime(),
          cwd: '/Users/me/src/alpha-wt'
        })
      ]
    });
    const html = render();
    const at = html.indexOf('data-manage-row="w1"');
    const row = html.slice(at, html.indexOf('data-manage-primary="w1"', at));
    expect(row).toMatch(/<small>Claude Code · [^<]*alpha-wt · Starts fresh<\/small>/);
    // The whole folder is on the row, so a shortened path is never the only
    // thing a person has to tell two projects apart.
    expect(row).toContain('title="/Users/me/src/alpha-wt"');
    // The day alone cannot tell two removals on one day apart: the hover says the time.
    expect(row).toMatch(/class="sm-past-state" title="[^"]*2:05/);
  });

  it('a row whose folder is its project names that folder, never the project (the reverify, R1)', () => {
    open('past');
    const html = render();
    const at = html.indexOf('data-manage-row="p1"');
    const row = html.slice(at, html.indexOf('data-manage-primary="p1"', at));
    expect(row).toMatch(/<small>Claude Code · [^<]*src\/alpha · Starts fresh<\/small>/);
  });

  it('two projects whose folders share a name are told apart (the reverify, R1)', () => {
    open('past', {}, {
      pastSessions: [
        session('one', '/nr/one/app', 'discarded', { removedAt: 20 }),
        session('two', '/nr/two/app', 'discarded', { removedAt: 10 })
      ]
    });
    const html = render();
    const smallAt = (id: string): string => {
      const at = html.indexOf(`data-manage-row="${id}"`);
      const row = html.slice(at, html.indexOf(`data-manage-primary="${id}"`, at));
      return /<small>([^<]*)<\/small>/.exec(row)?.[1] ?? '';
    };
    expect(smallAt('one')).toContain('/nr/one/app');
    expect(smallAt('two')).toContain('/nr/two/app');
    expect(smallAt('one')).not.toBe(smallAt('two'));
    // And the project filter's two options say which is which.
    const options = [...html.matchAll(/<option value="[^"]*">([^<]*)<\/option>/g)].map(
      (m) => m[1] ?? ''
    );
    expect(new Set(options).size).toBe(options.length);
  });

  it('a machine-removed row says TWO different things, and its Restore is off', () => {
    open('past');
    const html = render();
    const at = html.indexOf('data-manage-row="p2"');
    const row = html.slice(at, html.indexOf('</p>', at));
    expect(row).toContain('Tortie can no longer reach Old Mini');
    // The machine is on the name line's badge and in the tombstone sentence,
    // and not a third time in the small line (the reverify, R2).
    expect(row).toMatch(/<small>Claude Code · [^<]*srv\/old · You removed Old Mini/);
    expect(tagsWith(row, 'data-manage-primary="p2"')[0]).toContain('disabled=""');
  });
});

describe('the Past tab is ONE list in main’s removal order (the operator’s ruling, 2026-09-19)', () => {
  // Removals alternating between two projects and a machine, newest first, as
  // main answers them: the no-regression verifier's scenario X5, plus a row on
  // a machine that is still registered.
  const handed = (): Session[] => [
    session('ax2', '/Users/me/src/alpha', 'discarded', { removedAt: 40 }),
    session('bx1', '/Users/me/src/beta', 'discarded', { removedAt: 30 }),
    session('rx1', '/srv/work/api', 'discarded', { removedAt: 25, machine: STUDIO }),
    session('ax1', '/Users/me/src/alpha', 'discarded', { removedAt: 20 }),
    session('d1', '/Users/me/src/delta', 'discarded', { removedAt: 5 })
  ];
  const drawnOrder = (html: string): string[] =>
    [...html.matchAll(/class="sm-past-row[^"]*" data-manage-row="([^"]*)"/g)].map(
      (m) => m[1] ?? ''
    );
  const smallOf = (html: string, id: string): string => {
    const at = html.indexOf(`data-manage-row="${id}"`);
    const row = html.slice(at, html.indexOf(`data-manage-primary="${id}"`, at));
    return /<small>([^<]*)<\/small>/.exec(row)?.[1] ?? '';
  };

  it('under All: main’s order, no heading, and each row names the folder it ran in', () => {
    open('past', {}, { pastSessions: handed() });
    const html = render();
    expect(drawnOrder(html)).toEqual(['ax2', 'bx1', 'rx1', 'ax1', 'd1']);
    expect(html).not.toContain('data-manage-group=');
    expect(html).not.toContain('sm-past-group');
    expect(smallOf(html, 'ax2')).toMatch(/^Claude Code · .*src\/alpha · Starts fresh$/);
    expect(smallOf(html, 'bx1')).toMatch(/^Claude Code · .*src\/beta · Starts fresh$/);
    // A machine is named by the name line's badge alone (the reverify, R2).
    expect(smallOf(html, 'rx1')).toMatch(/^Claude Code · .*work\/api · Starts fresh$/);
    // The footer still counts the projects the list spans.
    expect(html).toContain('<span>5 sessions across 4 projects</span>');
  });

  it('under All with a search: the rows it leaves, still in main’s order', () => {
    open('past', { search: 'x' }, { pastSessions: handed() });
    expect(drawnOrder(render())).toEqual(['ax2', 'bx1', 'rx1', 'ax1']);
  });

  it('filtered to one project: its rows in main’s order under its heading, which names the project so the rows do not', () => {
    open('past', { project: '/Users/me/src/alpha' }, { pastSessions: handed() });
    const html = render();
    expect(drawnOrder(html)).toEqual(['ax2', 'ax1']);
    expect(tagsWith(html, 'data-manage-group=')).toEqual([
      '<div class="sm-group" data-manage-group="/Users/me/src/alpha" data-tab-open="no">'
    ]);
    expect(smallOf(html, 'ax2')).toBe('Claude Code · Starts fresh');
    expect(html).toContain('<span>2 sessions</span>');
  });
});

describe('the states that replace the grid (Phase 293, SPEC 2.12)', () => {
  it('empty Managed', () => {
    open('managed', {}, { sessions: [] });
    const html = render();
    expect(html).toContain('<h2>No sessions to manage</h2>');
    expect(html).not.toContain('sm-grid');
    expect(html).not.toContain('sm-select-all');
  });

  it('empty Past', () => {
    open('past', {}, { pastSessions: [] });
    expect(render()).toContain('<h2>No past sessions yet</h2>');
  });

  it('no match, with the one way out', () => {
    open('managed', { search: 'nothing-matches-this' });
    const html = render();
    expect(html).toContain('<h2>No matching sessions</h2>');
    expect(html).toContain('data-sm="clear-filters"');
    expect(html).toContain('codicon-search');
  });

  it('loading, on Past only, while nothing is held', () => {
    open('past', {}, { pastSessions: [] });
    useApp.setState({ pastLoading: true });
    const html = render();
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading sessions…');
    expect(html.match(/class="sm-skeleton"/g)?.length).toBe(5);
  });

  it('a read failure says the sessions have not changed, and offers Try again', () => {
    open('managed', { listError: 'Main did not answer.' });
    const html = render();
    expect(html).toContain('<h2>Sessions couldn’t be read</h2>');
    expect(html).toContain('Your sessions haven’t changed. Try reading the list again.');
    expect(html).toContain('>Try again</button>');
  });
});

describe('the projection selector is stable (Phase 293)', () => {
  it('answers the same object for the same state, so the store never loops', () => {
    open('managed');
    const s = useApp.getState();
    expect(selectManageProjection(s)).toBe(selectManageProjection(s));
  });
});

describe('source-text pins on the sheet (Phase 293, SPEC 2.13)', () => {
  const text = readFileSync(
    resolve(import.meta.dirname, '../SessionManagerSheet.tsx'),
    'utf8'
  );

  it('Tab wraps through trapTabKey and never modalKeyDown', () => {
    // Comments out: the header says why the other one is not used.
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).toMatch(/trapTabKey\(e, e\.currentTarget\)/);
    expect(code).not.toMatch(/modalKeyDown/);
  });

  it('the reclaim is a layout effect with NO dependency list', () => {
    const at = text.indexOf('useLayoutEffect(() => {\n    if (!opened.current)');
    expect(at).toBeGreaterThan(-1);
    const rest = text.slice(at);
    const close = rest.indexOf('\n  });');
    expect(close).toBeGreaterThan(-1);
    expect(rest.slice(0, close)).toContain('sheetIsTopLayer()');
  });

  it('rows are keyed by session id and groups by group key, never by index', () => {
    const dir = resolve(import.meta.dirname, '..');
    for (const name of ['ManagedGrid.tsx', 'PastList.tsx']) {
      const source = readFileSync(resolve(dir, name), 'utf8');
      expect(source, name).toMatch(/key=\{row\.id\}/);
      expect(source, name).toMatch(/key=\{group\.key\}/);
      expect(source, name).toMatch(/key=\{`\$\{row\.id\}:\$\{inline\.kind\}`\}/);
      expect(source, name).not.toMatch(/key=\{(i|index|idx)\}/);
    }
  });

  it('no file in the domain draws a DOM menu or stamps data-session-id', () => {
    const dir = resolve(import.meta.dirname, '..');
    for (const name of [
      'SessionManagerSheet.tsx',
      'ManagedGrid.tsx',
      'PastList.tsx'
    ]) {
      const source = readFileSync(resolve(dir, name), 'utf8');
      expect(source, name).not.toMatch(/role="menu"|popover|data-session-id=/);
    }
  });
});
