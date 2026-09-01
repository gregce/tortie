/**
 * The regrouped bottom half (Phase 170), rendered without a browser.
 *
 * WHAT IS PINNED HERE, and the charter line each claim keeps:
 *
 *  - The bottom half is four question shaped sections in order: Open right
 *    now, Startup, On disk, File watching. Nothing from the Phase 163 face
 *    was lost; the parity test names every moved figure's new home.
 *  - THIS WINDOW and MAIN PROCESS are row detail in the Tortie table,
 *    closed at rest, complete when opened.
 *  - The milestones draw as one horizontal ladder, "not yet" kept honest.
 *  - The disk ceiling sits directly under the cache it caps.
 *  - Watcher rows with activity sit on the face; quiet rows rest behind a
 *    counted disclosure.
 *  - Both tables sort by a clicked column, stable, indicator drawn, default
 *    order until a click. Static markup cannot click, so the harness seeds
 *    the sort the way it seeds the open rows.
 *  - The Live indicator and its pause control say what the loop does.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticsReport } from '@shared/ipc';
import { DiagnosticsBody } from '../DiagnosticsTab';
import * as words from '../copy';
import type { SessionSortCol, ShellSortCol, SortSpec } from '../format';
import { formatAbsolute } from '../../scm/format';

const MB = 1024 * 1024;

/**
 * PHASE 188. The report's own instant, and the two session ages are measured
 * from it rather than from the wall clock, because that is what the face does.
 */
const GENERATED = new Date(2026, 7, 30, 9, 0, 0);
const AT = GENERATED.getTime();
const HOUR = 3_600_000;

function report(over: Partial<DiagnosticsReport> = {}): DiagnosticsReport {
  return {
    generatedAt: GENERATED.toISOString(),
    appVersion: '0.86.0',
    windowMs: 1500,
    shell: [
      {
        pid: 100, ppid: 1, kind: 'main', name: 'main',
        memory: { privateBytes: 150 * MB, privateSource: 'electron', rssBytes: 300 * MB },
        cpuPercent: 2.1, cpuSource: 'sampled', electron: true
      },
      {
        pid: 200, ppid: 100, kind: 'renderer', name: 'renderer', detail: 'Tortie',
        memory: { privateBytes: 90 * MB, privateSource: 'electron', rssBytes: 200 * MB },
        cpuPercent: 0.4, cpuSource: 'sampled', electron: true
      },
      {
        pid: 5000, ppid: 1, kind: 'session-server', name: 'tmux',
        memory: { privateBytes: 7 * MB, privateSource: 'footprint', rssBytes: 20 * MB },
        cpuPercent: 0, cpuSource: 'lifetime', electron: false
      }
    ],
    shellTotal: { privateBytes: 247 * MB, rssBytes: 520 * MB, processCount: 3 },
    leftoverTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    sessions: [
      {
        sessionId: 'b', name: 'beta', agent: 'codex', processCount: 2,
        memory: { privateBytes: 100 * MB, privateSource: 'footprint', rssBytes: 120 * MB },
        cpuPercent: 3,
        projectName: 'zebra', projectPath: '~/src/zebra',
        createdAt: AT - 3 * HOUR, lastSeen: AT - 2 * HOUR
      },
      {
        sessionId: 'a', name: 'alpha', agent: 'claude', processCount: 5,
        memory: { privateBytes: 400 * MB, privateSource: 'footprint', rssBytes: 500 * MB },
        cpuPercent: 12,
        projectName: 'apex', projectPath: '~/src/apex',
        createdAt: AT - 49 * HOUR, lastSeen: AT - 10 * 60_000
      }
    ],
    sessionsTotal: { privateBytes: 500 * MB, rssBytes: 620 * MB, processCount: 7 },
    glance: {
      tortie: { processCount: 3, privateBytes: 247 * MB, rssBytes: 520 * MB, cpuPercent: 2.5 },
      agents: { processCount: 7, privateBytes: 500 * MB, rssBytes: 620 * MB, cpuPercent: 15 },
      together: { processCount: 10, privateBytes: 747 * MB, rssBytes: 1140 * MB, cpuPercent: 17.5 },
      energyImpact: 18.4
    },
    machine: null,
    electronPids: [
      { pid: 100, type: 'Browser', named: true },
      { pid: 200, type: 'Tab', named: true }
    ],
    main: {
      privateBytes: 150 * MB, sharedBytes: 0,
      heapUsedBytes: 40 * MB, heapTotalBytes: 60 * MB,
      heapLimitBytes: 4096 * MB, mallocedBytes: 0
    },
    renderer: {
      memory: {
        privateBytes: 90 * MB, sharedBytes: 0,
        heapUsedBytes: 30 * MB, heapTotalBytes: 50 * MB,
        heapLimitBytes: 4096 * MB, mallocedBytes: 0,
        blinkAllocatedBytes: 12 * MB, blinkTotalBytes: 16 * MB
      },
      mountedSurfaces: 2,
      longTasks: { count: 2, totalMs: 130, maxMs: 90, buffered: false }
    },
    counts: {
      sessions: 4, localSessions: 3, remoteSessions: 1, windows: 1,
      watchers: 2, pendingWatcherCloses: 0, remoteFeeds: 1, mountedSurfaces: 2,
      listeners: ['hook channel', 'manifest ring']
    },
    watchers: [
      { repo: 'project', drops: 1, rescansScheduled: 1, rescansCompleted: 1 },
      { repo: 'quiet-repo', drops: 0, rescansScheduled: 0, rescansCompleted: 0 }
    ],
    disk: {
      httpCacheBytes: 30 * MB, codeCacheBytes: 12 * MB,
      durableBytes: 80 * MB, profileBytes: 130 * MB,
      freeBytes: 200 * 1024 * MB, profilePath: '~/Library/Application Support/Tortie',
      httpCacheCeilingBytes: null, cachePolicy: { mode: 'chromium-default', reason: 'nothing stored' }
    },
    milestones: [
      { name: 'app-ready', atMs: 312 },
      { name: 'window-shown', atMs: 640 }
    ],
    ipc: { invokes: 12, events: 40, windowMs: 1500 },
    text: 'Tortie diagnostics\n',
    ...over
  };
}

function render(
  r: DiagnosticsReport | null,
  opts: {
    kind?: 'ready' | 'capturing' | 'unavailable' | 'failed';
    paused?: boolean;
    expandedPids?: readonly number[];
    shellSort?: SortSpec<ShellSortCol>;
    sessionSort?: SortSpec<SessionSortCol>;
  } = {}
): string {
  const kind = opts.kind ?? 'ready';
  const phase =
    kind === 'ready' && r !== null
      ? { kind: 'ready' as const, report: r }
      : kind === 'capturing'
        ? { kind: 'capturing' as const, previous: r }
        : kind === 'failed'
          ? { kind: 'failed' as const, previous: r }
          : { kind: 'unavailable' as const };
  return renderToStaticMarkup(
    createElement(DiagnosticsBody, {
      phase,
      paused: opts.paused ?? false,
      onTogglePause: () => undefined,
      onCapture: () => undefined,
      onCopy: () => undefined,
      onHeapSnapshot: () => undefined,
      ...(opts.expandedPids !== undefined ? { expandedPids: opts.expandedPids } : {}),
      ...(opts.shellSort !== undefined ? { initialShellSort: opts.shellSort } : {}),
      ...(opts.sessionSort !== undefined ? { initialSessionSort: opts.sessionSort } : {})
    })
  );
}

/** The pids in tbody order, read back from the markup. */
function pidOrder(html: string): number[] {
  const out: number[] = [];
  const re = /<td class="diag-num">(\d+)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(Number(m[1]));
  return out;
}

describe('the regrouped bottom half', () => {
  it('draws four question shaped sections in order, after the two tables', () => {
    const html = render(report());
    const sessionsTable = html.indexOf('diag-group-sessions');
    const open = html.indexOf(words.SECTION_NOW);
    const startup = html.indexOf(`>${words.SECTION_STARTUP}<`);
    const disk = html.indexOf(`>${words.SECTION_DISK}<`);
    const watching = html.indexOf(`>${words.SECTION_WATCHERS}<`);
    expect(sessionsTable).toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(sessionsTable);
    expect(startup).toBeGreaterThan(open);
    expect(disk).toBeGreaterThan(startup);
    expect(watching).toBeGreaterThan(disk);
  });

  it('keeps every count on the face: sessions, surfaces, windows, watchers, feeds, held open', () => {
    const html = render(report());
    expect(html).toContain(words.FIG_SESSIONS);
    expect(html).toContain(words.FIG_SURFACES);
    expect(html).toContain(words.FIG_WINDOWS);
    expect(html).toContain(words.FIG_WATCHERS);
    expect(html).toContain(words.FIG_REMOTE);
    expect(html).toContain('hook channel');
    expect(html).toContain('manifest ring');
  });

  it('rests with the window and main figures folded away, nothing of them on the face', () => {
    const html = render(report());
    expect(html).not.toContain(words.SECTION_RENDERER);
    expect(html).not.toContain(words.SECTION_MAIN);
    expect(html).not.toContain('12 up, 40 down');
    expect(html).not.toContain('30 MB of 50 MB');
    expect(html).not.toContain('diag-detail-row');
  });

  it('opens the main row to the figures the MAIN PROCESS section carried', () => {
    const html = render(report(), { expandedPids: [100] });
    expect(html).toContain(words.SECTION_MAIN);
    expect(html).toContain('40 MB of 60 MB');
    expect(html).toContain(words.FIG_PRIVATE);
    expect(html).toContain('diag-detail-row');
    expect(html).not.toContain(words.SECTION_RENDERER);
  });

  it('opens this window\'s row to every figure THIS WINDOW carried, plus messages and long tasks', () => {
    const html = render(report(), { expandedPids: [200] });
    expect(html).toContain(words.SECTION_RENDERER);
    expect(html).toContain('30 MB of 50 MB');
    expect(html).toContain(words.FIG_BLINK);
    expect(html).toContain('12 MB');
    expect(html).toContain(words.FIG_LONG_TASKS);
    expect(html).toContain('2, 130 ms');
    expect(html).toContain('12 up, 40 down');
    expect(html).toContain(words.FIG_IPC_HOVER);
  });

  it('draws the milestones as one ladder, in launch order, not yet kept honest', () => {
    const html = render(report());
    expect(html).toContain('diag-ladder');
    expect(html.indexOf('312 ms')).toBeLessThan(html.indexOf('640 ms'));
    expect((html.match(/diag-ladder-not-yet/g) ?? []).length).toBe(5);
    expect((html.match(new RegExp(words.NOT_YET, 'g')) ?? []).length).toBe(5);
    expect(html).not.toContain('>0 ms<');
  });

  it('seats the ceiling directly under the HTTP cache it caps', () => {
    const html = render(report());
    const http = html.indexOf(words.DISK_HTTP);
    const ceiling = html.indexOf(words.DISK_CEILING);
    const code = html.indexOf(words.DISK_CODE);
    expect(http).toBeLessThan(ceiling);
    expect(ceiling).toBeLessThan(code);
    expect(html).toContain('diag-line-sub');
    expect(html).toContain(words.DISK_CEILING_DEFAULT);
  });

  it('shows watcher rows with activity and rests the quiet ones behind a counted disclosure', () => {
    const html = render(report());
    expect(html).toContain('1 dropped, 1 scheduled, 1 completed');
    const summary = html.indexOf(`1 ${words.WATCHERS_QUIET_ONE}`);
    expect(summary).toBeGreaterThan(-1);
    expect(html.indexOf('quiet-repo')).toBeGreaterThan(summary);
  });

  it('says all quiet in one line when every watcher has nothing to report', () => {
    const r = report({
      watchers: [
        { repo: 'a', drops: 0, rescansScheduled: 0, rescansCompleted: 0 },
        { repo: 'b', drops: 0, rescansScheduled: 0, rescansCompleted: 0 }
      ]
    });
    const html = render(r);
    expect(html).toContain(words.WATCHERS_ALL_QUIET);
    expect(html).toContain(`2 ${words.WATCHERS_QUIET_MANY}`);
  });
});

describe('sorting on the face', () => {
  it('holds the default order until a click', () => {
    const html = render(report());
    expect(html).not.toContain('aria-sort');
    expect(html).not.toContain('diag-sort-ind');
  });

  it('sorts the Tortie table by the seeded column, indicator drawn', () => {
    const desc = render(report(), { shellSort: { col: 'private', dir: 'desc' } });
    expect(desc).toContain('aria-sort="descending"');
    expect(desc).toContain('▾');
    const pids = pidOrder(desc);
    expect(pids.indexOf(100)).toBeLessThan(pids.indexOf(200));
    expect(pids.indexOf(200)).toBeLessThan(pids.indexOf(5000));
    const asc = render(report(), { shellSort: { col: 'private', dir: 'asc' } });
    expect(asc).toContain('▴');
    const up = pidOrder(asc);
    expect(up.indexOf(5000)).toBeLessThan(up.indexOf(200));
    expect(up.indexOf(200)).toBeLessThan(up.indexOf(100));
  });

  it('flattens the parent indentation while a sort is active', () => {
    expect(render(report())).toContain('diag-child');
    expect(render(report(), { shellSort: { col: 'pid', dir: 'asc' } })).not.toContain('diag-child');
  });

  it('sorts the sessions table by the seeded column', () => {
    const byName = render(report());
    expect(byName.indexOf('alpha')).toBeLessThan(byName.indexOf('beta'));
    const byMemory = render(report(), { sessionSort: { col: 'memory', dir: 'asc' } });
    expect(byMemory.indexOf('beta')).toBeLessThan(byMemory.indexOf('alpha'));
    expect(byMemory).toContain('aria-sort="ascending"');
  });

  // PHASE 188. The three new columns sort too, which is the Phase 170 rule.
  it('sorts the sessions table by project, started and last seen', () => {
    const byProject = render(report(), { sessionSort: { col: 'project', dir: 'desc' } });
    expect(byProject.indexOf('zebra')).toBeLessThan(byProject.indexOf('apex'));
    const oldestFirst = render(report(), { sessionSort: { col: 'started', dir: 'asc' } });
    expect(oldestFirst.indexOf('alpha')).toBeLessThan(oldestFirst.indexOf('beta'));
    const staleFirst = render(report(), { sessionSort: { col: 'lastSeen', dir: 'asc' } });
    expect(staleFirst.indexOf('beta')).toBeLessThan(staleFirst.indexOf('alpha'));
  });
});

/**
 * PHASE 188. Whose work each row is. His screenshot had five rows reading
 * `claude-1`, so the table has to carry the project and the two ages.
 */
describe('the project and the age on a session row', () => {
  it('draws the three new heads, and Last seen rather than Last active', () => {
    const html = render(report());
    expect(html).toContain(words.COL_PROJECT);
    expect(html).toContain(words.COL_STARTED);
    expect(html).toContain(words.COL_LAST_SEEN);
    expect(words.COL_LAST_SEEN).toBe('Last seen');
    expect(html).not.toContain('Last active');
  });

  it('names the project on the face and puts the full path on the hover', () => {
    const html = render(report());
    expect(html).toContain('<td class="diag-project" title="~/src/apex">apex</td>');
    expect(html).toContain('<td class="diag-project" title="~/src/zebra">zebra</td>');
  });

  it('draws the two times as an age against the report\'s own instant', () => {
    const html = render(report());
    // beta: created 3h before this report, last confirmed 2h before it.
    expect(html).toContain('>3h</td>');
    expect(html).toContain('>2h</td>');
    // alpha: created 49h before, so two days; confirmed 10 minutes before.
    expect(html).toContain('>2d</td>');
    expect(html).toContain('>10m</td>');
  });

  it('carries the exact instant on the hover of each age cell', () => {
    const html = render(report());
    expect(html).toContain(`title="${formatAbsolute(AT - 3 * HOUR)}"`);
    expect(html).toContain(`title="${formatAbsolute(AT - 10 * 60_000)}"`);
  });

  // The row that must never vanish: a session Tortie did not launch, or one
  // whose manifest row is gone. Empty cells, no dash, no guess, no hover.
  it('still draws a row with no manifest match, with the four cells empty', () => {
    const stray = report({
      sessions: [
        {
          sessionId: null, name: 'stray-one', agent: 'unknown', processCount: 2,
          memory: { privateBytes: null, privateSource: null, rssBytes: 3 * MB },
          cpuPercent: 0,
          projectName: null, projectPath: null, createdAt: null, lastSeen: null
        }
      ]
    });
    const html = render(stray);
    expect(html).toContain('stray-one');
    expect(html).toContain('<td class="diag-project"></td>');
    // Two empty age cells, carrying no title at all.
    expect(html.match(/<td class="diag-num"><\/td>/g)?.length).toBe(2);
  });
});

describe('the live control', () => {
  it('says Live with the stated interval, and offers Pause', () => {
    const html = render(report());
    expect(html).toContain(words.LIVE);
    expect(html).toContain(words.LIVE_EVERY);
    expect(html).toContain(words.PAUSE);
    expect(html).toContain(words.LIVE_HOVER);
  });

  it('says Paused and offers Resume, with Capture again still there as the manual refresh', () => {
    const html = render(report(), { paused: true });
    expect(html).toContain(words.LIVE_PAUSED);
    expect(html).toContain(words.RESUME);
    expect(html).toContain('diag-live-paused');
    expect(html).toContain(words.CAPTURE_AGAIN);
  });

  it('draws no live control at all when diagnostics are unavailable', () => {
    const html = render(null, { kind: 'unavailable' });
    expect(html).not.toContain('diag-live');
    expect(html).not.toContain(words.PAUSE);
  });
});
