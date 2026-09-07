/**
 * The sessions table's own name column, capped (Phase 219, item 9).
 *
 * WHAT THIS IS ABOUT. Phase 188's verifier reported two things and only the
 * first was fixed: a newline in a project name split a pasted report line, and
 * a narrow pane shows a horizontal scrollbar. Phase 197 item 18 closed the
 * newline, `oneLine()` in report-text.ts, pinned by its own test. The
 * scrollbar was still true at bd16e36 and the cause is one column.
 *
 * `.diag-scroll` is deliberate and predates Phase 188: a wide table scrolls
 * inside its own card so the tab never scrolls sideways. What Phase 188 did was
 * take the sessions table to EIGHT columns, every cell `white-space: nowrap`,
 * and cap exactly one of them, the project. A session name is typed by a
 * person and has no bound, so one long name widened the table by itself.
 *
 * Static markup cannot measure a pixel, so the geometry itself is the round's
 * app run. What is pinned here is the two things that decide it and that a
 * later edit can silently undo: the cell asks for the cap, and the stylesheet
 * still gives that class one. Both were absent at the parent.
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

const MB = 1024 * 1024;
const AT = new Date(2026, 8, 6, 9, 0, 0).getTime();

/** A name nobody would type by accident, and every one this app has seen. */
const LONG = 'refactor-the-whole-credentials-domain-and-its-gates-round-two';

function report(names: readonly string[]): DiagnosticsReport {
  return {
    generatedAt: new Date(AT).toISOString(),
    appVersion: '0.0.0',
    windowMs: 1500,
    shell: [],
    shellTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    leftoverTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    sessions: names.map((name, i) => ({
      sessionId: `s${String(i)}`,
      name,
      agent: 'claude',
      processCount: 1,
      memory: { privateBytes: MB, privateSource: 'footprint', rssBytes: MB },
      cpuPercent: 0,
      projectName: 'apex',
      projectPath: '~/src/apex',
      createdAt: AT - 3600_000,
      lastSeen: AT - 60_000
    })),
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

function markup(names: readonly string[]): string {
  return renderToStaticMarkup(
    createElement(DiagnosticsBody, {
      phase: { kind: 'ready' as const, report: report(names) },
      paused: false,
      onTogglePause: () => undefined,
      onCapture: () => undefined,
      onCopy: () => undefined,
      onHeapSnapshot: () => undefined
    })
  );
}

describe('the session name cell', () => {
  it('asks for the cap the project cell beside it already had', () => {
    expect(markup([LONG])).toContain('diag-name diag-session-name');
  });

  it('keeps the whole name on the hover, so truncating loses nothing', () => {
    const out = markup([LONG]);
    expect(out).toContain(`title="${LONG}"`);
    // And it is still readable in full in the cell's own text, which is what
    // the ellipsis is drawn over rather than instead of.
    expect(out).toContain(LONG);
  });

  it('caps every row, not only the long one', () => {
    const out = markup(['a', LONG, 'b']);
    expect(out.split('diag-session-name')).toHaveLength(4);
  });

  it('leaves the Tortie process table\'s own name column alone', () => {
    // `.diag-name` is that table's first column too, where the name is a
    // binary name beside a chevron, a kind and a detail. Capping it would be a
    // geometry change to a table nobody reported.
    expect(CSS).toContain('.diag-session-name {');
    expect(CSS).not.toMatch(/^\.diag-name \{[^}]*max-width/m);
  });
});

describe('the stylesheet that makes the cap real', () => {
  it('gives the class a width to cap at', () => {
    expect(CSS).toMatch(/\.diag-session-name \{[^}]*max-width:\s*22ch/);
  });

  it('puts the ellipsis on the span, because the cell is a flex container', () => {
    // text-overflow does nothing on a flex container, so a cap written only on
    // the cell would clip the name with no ellipsis and no sign it was cut.
    expect(CSS).toMatch(/\.diag-name \{[^}]*display:\s*flex/);
    expect(CSS).toMatch(
      /\.diag-session-name \.diag-proc \{[^}]*text-overflow:\s*ellipsis/
    );
    expect(CSS).toMatch(/\.diag-session-name \.diag-proc \{[^}]*min-width:\s*0/);
  });

  it('matches the cap the project column was already given', () => {
    const project = /\.diag-project \{[^}]*max-width:\s*(\d+)ch/.exec(CSS);
    const session = /\.diag-session-name \{[^}]*max-width:\s*(\d+)ch/.exec(CSS);
    expect(project?.[1]).toBe(session?.[1]);
  });
});
