/**
 * The sessions table's first column, pinned (Phase 221).
 *
 * WHAT THIS IS ABOUT. Phase 188's verifier reported a horizontal scrollbar in
 * a narrow pane. Phase 219 measured what a column cap is worth against it and
 * lifted it out rather than pretending the cap closed it. Phase 221 measured
 * the rest and RULED: eight columns of real information do not fit the 282px
 * card the app's narrowest editor pane gives this tab, six of them are at their
 * own header minimum and have no give at all, and that is a property of the
 * pane rather than a defect in the table. So the card scrolls sideways there.
 * What was fixed is the thing that made it unusable — scrolled right, the two
 * columns that NAME the row were the first to leave, so a person was reading a
 * row they could no longer identify. The first column is pinned instead.
 *
 * WHY THE OTHER TWO ANSWERS ARE NOT HERE TO BE UNDONE. Reflow takes the floor
 * from 674px to 464px, still 182px over the card, and grows the row from 27px
 * to 387px. Dropping columns cannot work at all: Session and Project ALONE want
 * 333px against that 282px card. Both are measured in
 * docs/research/83-phase-221-narrow-table-measurements.md.
 *
 * WHAT IS PINNED HERE AND WHAT IS NOT. Static markup cannot measure a pixel,
 * and this file does not pretend to: `npm run probe:p219` drives the real
 * window at EDITOR_MIN with the card scrolled to its far end, reads the pin off
 * the DOM, and samples the PHOTOGRAPH at the header's hairline, which is the
 * one question a computed style cannot answer, because `border-collapse:
 * collapse` gives that hairline to the TABLE and paints it before any cell
 * background. It goes red with the rule ablated.
 *
 * What is pinned here is the four things a later edit can undo in silence and
 * that no gate would otherwise catch: the rule exists and says sticky, it is
 * painted in the CARD's own fill rather than the canvas behind it, it is SCOPED
 * so the Tortie process table beside it keeps its geometry, and the cell it
 * lands on is still the name. The last one is the one that rots: the pin is on
 * `:first-child`, so a column inserted before Session would move it without
 * touching this stylesheet at all.
 *
 * THE FIX ROUND ADDED THE LAYER, and it is the one thing here that was a
 * REGRESSION rather than a rule. `.diag-head` has been `position: sticky;
 * z-index: 1` since Phase 163, and this pin arrived sticky at the same number.
 * Nothing between the pinned cell and the tab makes a stacking context, so the
 * two are siblings in ONE context, tree order decides, and the table is later:
 * the pinned column painted over the report's own head and took its clicks.
 * The head is at 2 now and the two cases below hold it, the second of them
 * against EVERY other z-index in the file rather than against the pin alone,
 * because `.diag-ladder-dot` was already sitting on the head for the same
 * reason and a later rule can do it again.
 *
 * PROVED TO BE ABLE TO FAIL, on 2026-09-07, one clause at a time, ten of ten
 * red: the pin made static, its fill changed to `--bg-canvas`, its scope
 * dropped so the Tortie table is caught too, the hover rule's background taken
 * away, `left` moved off 0, `.diag-scroll` given `overflow-x: visible` so the
 * tab scrolls instead of the card, the 22ch name cap removed, the project
 * cell moved in front of the name cell in `DiagnosticsTab.tsx`, the head put
 * back to z-index 1, and the head left at 2 with `.diag-ladder-dot` raised to
 * meet it.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticsReport } from '@shared/ipc';
import { DiagnosticsBody } from '../DiagnosticsTab';

const CSS = readFileSync(
  fileURLToPath(new URL('../diagnostics.css', import.meta.url)),
  'utf8'
);

/**
 * The stylesheet read as RULES rather than as a string, with comments removed
 * first. That second half is not tidiness: the rule this file guards carries a
 * comment naming `--bg-canvas` as the token it must NOT use, so a check run
 * over the raw text could pass on the comment and miss the declaration.
 */
function rules(css: string): Map<string, string> {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map<string, string>();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bare)) !== null) {
    const selector = (m[1] ?? '').split('\n').map((s) => s.trim()).filter(Boolean).join(' ');
    out.set(selector, (m[2] ?? '').trim());
  }
  return out;
}

const RULES = rules(CSS);

function ruleFor(match: (selector: string) => boolean): [string, string] | null {
  for (const [selector, body] of RULES) if (match(selector)) return [selector, body];
  return null;
}

const decl = (body: string, prop: string): string | null => {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body);
  return m === null ? null : (m[1] ?? '').trim();
};

const MB = 1024 * 1024;
const AT = new Date(2026, 8, 7, 9, 0, 0).getTime();

function report(): DiagnosticsReport {
  return {
    generatedAt: new Date(AT).toISOString(),
    appVersion: '0.0.0',
    windowMs: 1500,
    shell: [],
    shellTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    leftoverTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    sessions: [
      {
        sessionId: 's0',
        name: 'the-one-row-this-file-needs',
        agent: 'claude',
        processCount: 1,
        memory: { privateBytes: MB, privateSource: 'footprint', rssBytes: MB },
        cpuPercent: 0,
        projectName: 'apex',
        projectPath: '~/src/apex',
        createdAt: AT - 3600_000,
        lastSeen: AT - 60_000
      }
    ],
    sessionsTotal: { privateBytes: MB, rssBytes: MB, processCount: 1 },
    glance: {
      tortie: { processCount: 0, privateBytes: 0, rssBytes: 0, cpuPercent: 0 },
      agents: { processCount: 1, privateBytes: MB, rssBytes: MB, cpuPercent: 0 },
      together: { processCount: 1, privateBytes: MB, rssBytes: MB, cpuPercent: 0 },
      energyImpact: 0
    },
    machine: null,
    electronPids: [],
    main: {
      privateBytes: 0, sharedBytes: 0, heapUsedBytes: 0,
      heapTotalBytes: 0, heapLimitBytes: 0, mallocedBytes: 0
    },
    renderer: {
      memory: {
        privateBytes: 0, sharedBytes: 0, heapUsedBytes: 0, heapTotalBytes: 0,
        heapLimitBytes: 0, mallocedBytes: 0, blinkAllocatedBytes: 0,
        blinkTotalBytes: 0
      },
      mountedSurfaces: 0,
      longTasks: { count: 0, totalMs: 0, maxMs: 0, buffered: false }
    },
    counts: {
      sessions: 1, localSessions: 1, remoteSessions: 0, windows: 1,
      watchers: 0, pendingWatcherCloses: 0, remoteFeeds: 0,
      mountedSurfaces: 0, listeners: []
    },
    watchers: [],
    disk: {
      httpCacheBytes: 0, codeCacheBytes: 0, durableBytes: 0, profileBytes: 0,
      freeBytes: 0, profilePath: '~/x',
      httpCacheCeilingBytes: null,
      cachePolicy: { mode: 'chromium-default', reason: 'nothing stored' }
    },
    milestones: [],
    ipc: { invokes: 0, events: 0, windowMs: 1500 },
    text: ''
  };
}

const MARKUP = renderToStaticMarkup(
  createElement(DiagnosticsBody, {
    phase: { kind: 'ready' as const, report: report() },
    paused: false,
    onTogglePause: () => undefined,
    onCapture: () => undefined,
    onCopy: () => undefined,
    onHeapSnapshot: () => undefined
  })
);

/** The sessions card's own markup, so the Tortie table cannot answer for it. */
const SESSIONS = (() => {
  const at = MARKUP.indexOf('diag-group diag-group-sessions');
  expect(at).toBeGreaterThan(-1);
  return MARKUP.slice(at);
})();

const STICKY = ruleFor((s) => s.includes(':first-child') && !s.includes(':hover'));
const HOVER = ruleFor((s) => s.includes(':first-child') && s.includes(':hover'));

describe('the pinned first column', () => {
  it('is a rule that exists at all', () => {
    expect(STICKY).not.toBeNull();
    expect(decl(STICKY?.[1] ?? '', 'position')).toBe('sticky');
    expect(decl(STICKY?.[1] ?? '', 'left')).toBe('0');
  });

  it('pins the head as well as the cell, or the head scrolls off its own column', () => {
    expect(STICKY?.[0]).toContain('th:first-child');
    expect(STICKY?.[0]).toContain('td:first-child');
  });

  it('is scoped to the sessions card, so the Tortie process table is untouched', () => {
    // `.diag-name` is that table's first column too, and its geometry was
    // never reported. Every selector in the rule has to carry the scope, not
    // just the first one.
    for (const part of (STICKY?.[0] ?? '').split(',')) {
      expect(part.trim().startsWith('.diag-group-sessions')).toBe(true);
    }
    expect((HOVER?.[0] ?? '').trim().startsWith('.diag-group-sessions')).toBe(true);
  });

  it('is painted in the card\'s own fill, re-derived rather than typed', () => {
    // Measured: `--bg-canvas` resolves to rgb(19,20,23) and the card to
    // rgb(32,35,41), so the wrong token paints a seam down the pinned column.
    // The card is `.diag-group`, and this asks IT what its fill is rather than
    // repeating a token name that could drift on one side only.
    const card = ruleFor((s) => s.trim() === '.diag-group');
    const cardFill = decl(card?.[1] ?? '', 'background');
    expect(cardFill).toBe('var(--bg-raised)');
    expect(decl(STICKY?.[1] ?? '', 'background')).toBe(cardFill);
  });

  it('stacks above the cells that scroll under it', () => {
    expect(Number(decl(STICKY?.[1] ?? '', 'z-index'))).toBeGreaterThan(0);
  });

  it('stays UNDER the report head, which is the other sticky layer in the same context', () => {
    // PHASE 221'S FIX ROUND. `.diag-head` has been `position: sticky;
    // z-index: 1` since Phase 163, and this pin is sticky too. Neither
    // `.diag-group` (overflow hidden) nor `.diag-scroll` (overflow-x auto)
    // makes a stacking context, so the two are SIBLINGS in one context: at the
    // same number TREE ORDER decides and the table is later, so the pinned
    // column painted over the report's own head and swallowed its clicks.
    // Measured in the running app: a point three pixels inside the head
    // answered the table's Session header, and a click meant for Heap snapshot
    // landed on a sort button. It is not a narrow-pane case — `position:
    // sticky` makes a stacking context whether or not its scroller overflows.
    // `npm run probe:p219` reading 9 is what holds it against a real pixel;
    // this holds the arithmetic under `npm test`.
    const head = ruleFor((s) => s.trim() === '.diag-head');
    expect(head).not.toBeNull();
    expect(decl(head?.[1] ?? '', 'position')).toBe('sticky');
    expect(Number(decl(head?.[1] ?? '', 'z-index'))).toBeGreaterThan(
      Number(decl(STICKY?.[1] ?? '', 'z-index'))
    );
  });

  it('stays under every OTHER positioned layer the tab already had, too', () => {
    // The same defect, one rule further down: `.diag-ladder-dot` is
    // `position: relative; z-index: 1` and is later in tree order than the
    // head. Nothing in this tab may share the head's number.
    const head = Number(decl(ruleFor((s) => s.trim() === '.diag-head')?.[1] ?? '', 'z-index'));
    const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const others: number[] = [];
    for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = (m[1] ?? '').split('\n').map((s) => s.trim()).filter(Boolean).join(' ');
      if (selector.trim() === '.diag-head') continue;
      const z = decl(m[2] ?? '', 'z-index');
      if (z !== null) others.push(Number(z));
    }
    expect(others.length).toBeGreaterThan(0);
    for (const z of others) expect(z).toBeLessThan(head);
  });

  it('keeps the row hover on the cell its own fill would paint over', () => {
    // The row fill is set on the `tr`; an opaque `td` wins over it, so without
    // this the pinned column is the one cell that does not light up.
    expect(HOVER).not.toBeNull();
    expect(decl(HOVER?.[1] ?? '', 'background')).toBe('var(--bg-active)');
    const row = ruleFor((s) => s.trim() === '.diag-table tbody tr:hover');
    expect(decl(row?.[1] ?? '', 'background')).toBe(decl(HOVER?.[1] ?? '', 'background'));
  });
});

describe('the cell the pin actually lands on', () => {
  it('is the session name, which is what makes pinning it worth anything', () => {
    // The pin is on `:first-child`. A column inserted before Session would
    // move it to that column and touch no stylesheet, so the ruling would
    // quietly become "the card scrolls and you cannot tell which row".
    const firstCell = /<tbody><tr[^>]*><td class="([^"]*)"/.exec(SESSIONS);
    expect(firstCell?.[1]).toBe('diag-name diag-session-name');
  });

  it('still carries the whole name on its hover, which is the route to a 137 character one', () => {
    expect(SESSIONS).toContain('title="the-one-row-this-file-needs"');
  });
});

describe('the ruling the pin sits on top of', () => {
  it('leaves the CARD scrolling and never the tab', () => {
    // `.diag-scroll` predates Phase 188 and Phase 221 accepted it rather than
    // removing it. Take this away and the whole tab scrolls sideways, which is
    // the thing that was never allowed.
    const scroll = ruleFor((s) => s.trim() === '.diag-scroll');
    expect(decl(scroll?.[1] ?? '', 'overflow-x')).toBe('auto');
  });

  it('says out loud, where the CSS is, why the scrollbar stays', () => {
    // Answer 3 was chosen, and a ruling that is not written down where the
    // rule is gets re-litigated by the next round that sees a scrollbar.
    expect(CSS).toContain('PHASE 221. THE RULING');
    expect(CSS).toMatch(/docs\/research\/83-phase-221/);
  });

  it('keeps the name cap Phase 219 measured, which this round did not revisit', () => {
    expect(CSS).toMatch(/\.diag-session-name \{[^}]*max-width:\s*22ch/);
  });
});
