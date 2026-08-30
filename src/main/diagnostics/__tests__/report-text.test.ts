/**
 * Unit tests for src/main/diagnostics/report-text.ts (Phase 163).
 *
 * The text is what the Copy button carries, so the test reads it line by
 * line, and the secret scan runs over the same bytes: a home directory, a
 * key on a session's argv and an environment value are all in the inputs
 * upstream, and none may reach the text.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import type { DiagnosticsReport } from '@shared/ipc';
import { buildDiagnosticsReportText } from '../report-text';

const HOME = '/Users/someone';
const MB = 1024 * 1024;

const BODY: Omit<DiagnosticsReport, 'text'> = {
  generatedAt: '2026-08-29T17:00:00.000Z',
  appVersion: '0.83.0',
  windowMs: 1000,
  shell: [
    { pid: 100, ppid: 1, kind: 'main', name: 'main', memory: { privateBytes: 200 * MB, privateSource: 'electron', rssBytes: 240 * MB }, cpuPercent: 2.5, cpuSource: 'sampled', electron: true },
    { pid: 102, ppid: 100, kind: 'renderer', name: 'renderer', detail: 'Tortie', memory: { privateBytes: 180 * MB, privateSource: 'electron', rssBytes: 260 * MB }, cpuPercent: 1, cpuSource: 'sampled', electron: true },
    { pid: 200, ppid: 1, kind: 'session-server', name: 'session server', memory: { privateBytes: null, privateSource: null, rssBytes: 14 * MB }, cpuPercent: 0.1, cpuSource: 'lifetime', electron: false }
  ],
  shellTotal: { privateBytes: 380 * MB, rssBytes: 514 * MB, processCount: 3 },
  leftoverTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
  sessions: [
    { sessionId: 'S1', name: 'API refactor', agent: 'claude', processCount: 2, memory: { privateBytes: 351 * MB, privateSource: 'footprint', rssBytes: 401 * MB }, cpuPercent: 3.2 }
  ],
  sessionsTotal: { privateBytes: 351 * MB, rssBytes: 401 * MB, processCount: 2 },
  glance: {
    tortie: { processCount: 3, privateBytes: 380 * MB, rssBytes: 514 * MB, cpuPercent: 3.5 },
    agents: { processCount: 2, privateBytes: 351 * MB, rssBytes: 401 * MB, cpuPercent: 9.1 },
    together: { processCount: 5, privateBytes: 731 * MB, rssBytes: 915 * MB, cpuPercent: 12.6 },
    energyImpact: 21.3
  },
  machine: {
    rank: 4, appCount: 38, tortieRssBytes: 514 * MB,
    above: [
      { name: 'Google Chrome', rssBytes: 3000 * MB },
      { name: 'OrbStack', rssBytes: 900 * MB },
      { name: 'Figma', rssBytes: 800 * MB }
    ]
  },
  electronPids: [{ pid: 100, type: 'Browser', named: true }, { pid: 102, type: 'Tab', named: true }],
  main: { privateBytes: 200 * MB, sharedBytes: 50 * MB, heapUsedBytes: 40 * MB, heapTotalBytes: 60 * MB, heapLimitBytes: 4096 * MB, mallocedBytes: 5 * MB },
  renderer: {
    memory: { privateBytes: 180 * MB, sharedBytes: 40 * MB, heapUsedBytes: 30 * MB, heapTotalBytes: 50 * MB, heapLimitBytes: 4096 * MB, mallocedBytes: 4 * MB, blinkAllocatedBytes: 12 * MB, blinkTotalBytes: 20 * MB },
    mountedSurfaces: 3,
    longTasks: { count: 2, totalMs: 120, maxMs: 80, buffered: false }
  },
  counts: { sessions: 4, localSessions: 3, remoteSessions: 1, windows: 1, watchers: 2, pendingWatcherCloses: 0, remoteFeeds: 1, mountedSurfaces: 3, listeners: ['hook channel on this Mac', 'event bus'] },
  watchers: [{ repo: 'gmux', drops: 1, rescansScheduled: 1, rescansCompleted: 1 }],
  disk: { httpCacheBytes: 871 * MB, codeCacheBytes: 270 * MB, durableBytes: 69 * MB, profileBytes: 1200 * MB, freeBytes: 100_000 * MB, profilePath: `${HOME}/Library/Application Support/Tortie`, httpCacheCeilingBytes: null, cachePolicy: { mode: 'chromium-default', reason: 'the packaged app serves every resource over file: and gmux-asset:, which Chromium never stores' } },
  milestones: [{ name: 'app-ready', atMs: 312.4 }, { name: 'window-shown', atMs: 700 }],
  ipc: { invokes: 12, events: 30, windowMs: 1000 }
};

describe('buildDiagnosticsReportText', () => {
  const text = buildDiagnosticsReportText(BODY, HOME);
  const lines = text.split('\n');

  it('opens with the version and the window', () => {
    assert.equal(lines[0], 'Tortie 0.83.0 diagnostics, generated 2026-08-29T17:00:00.000Z');
    assert.equal(lines[1], 'sampling window 1000 ms');
  });

  it('draws the two groups with their own totals, and the sum in the strip alone', () => {
    assert.ok(lines.includes('[Tortie]'));
    assert.ok(lines.includes('3 processes, private 380.0 MB, rss 514.0 MB'));
    assert.ok(lines.includes('[Your sessions]'));
    assert.ok(lines.includes('1 sessions, 2 processes, private 351.0 MB, rss 401.0 MB'));
    // Phase 168: 380 + 351 = 731 appears exactly once, on the Together line,
    // which says what it sums. Neither table's section carries it.
    const carrying = lines.filter((l) => l.includes('731.0 MB'));
    assert.deepEqual(carrying, [
      'Together, Tortie plus your agents  5 processes, private 731.0 MB, rss 915.0 MB, cpu 12.6% sampled'
    ]);
  });

  // Phase 168: the summary before the detail.
  it('leads with the glance strip, before either table', () => {
    const at = lines.indexOf('[At a glance]');
    assert.ok(at > -1);
    assert.ok(at < lines.indexOf('[Tortie]'));
    assert.ok(lines.includes('Tortie itself  3 processes, private 380.0 MB, rss 514.0 MB, cpu 3.5% sampled'));
    assert.ok(lines.includes('Your agents  2 processes, private 351.0 MB, rss 401.0 MB, cpu 9.1% sampled'));
    assert.ok(lines.includes('energy impact 21.3, the power score top reports, not watts'));
  });

  it('says unavailable for energy and not read for cpu, never zero', () => {
    const bare = buildDiagnosticsReportText(
      {
        ...BODY,
        glance: {
          tortie: { ...BODY.glance.tortie, cpuPercent: null },
          agents: { ...BODY.glance.agents, cpuPercent: null },
          together: { ...BODY.glance.together, cpuPercent: null },
          energyImpact: null
        }
      },
      HOME
    );
    assert.ok(bare.includes('energy impact unavailable'));
    assert.ok(bare.includes('cpu not read'));
    assert.equal(bare.includes('energy impact 0'), false);
  });

  it('carries the machine rank and NEVER another app name', () => {
    assert.ok(lines.includes('machine rank 4 of 38 apps by resident memory, app names stay in the app and are not copied'));
    for (const name of ['Google Chrome', 'OrbStack', 'Figma']) {
      assert.equal(text.includes(name), false);
    }
    // With no machine read there is no machine line at all.
    const none = buildDiagnosticsReportText({ ...BODY, machine: null }, HOME);
    assert.equal(none.includes('machine rank'), false);
  });

  it('labels every memory number by its source and every cpu number by its kind', () => {
    assert.ok(lines.includes('main  pid 100  private 200.0 MB (electron), rss 240.0 MB  cpu 2.5% sampled'));
    assert.ok(lines.includes('session server  pid 200  private unknown, rss 14.0 MB  cpu 0.1% lifetime'));
    assert.ok(lines.includes('API refactor  claude  2 processes  private 351.0 MB (footprint), rss 401.0 MB  cpu 3.2% lifetime'));
  });

  it('folds the home directory to ~', () => {
    assert.ok(lines.includes('profile ~/Library/Application Support/Tortie, 1200.0 MB total, 100000.0 MB free on the volume'));
    assert.equal(text.includes(HOME), false);
  });

  // Phase 166. The three cache lines: the ceiling in force, what the http
  // cache can hold in this shape, and the policy's own sentence.
  it('names the cache ceiling, what the cache holds and the policy', () => {
    assert.ok(lines.includes('http cache ceiling Chromium default, up to 1280.0 MB (chromium-default)'));
    assert.ok(lines.includes('http cache holds nothing Tortie serves; file:, gmux-asset: and gmux-preview: resources bypass it'));
    assert.ok(lines.includes('cache policy chromium-default: the packaged app serves every resource over file: and gmux-asset:, which Chromium never stores'));
  });

  it('states a dev ceiling as a number and the dev shape as the one that writes', () => {
    const dev = buildDiagnosticsReportText(
      { ...BODY, disk: { ...BODY.disk, httpCacheCeilingBytes: 128 * MB, cachePolicy: { mode: 'dev-ceiling', reason: 'served by vite' } } },
      HOME
    ).split('\n');
    assert.ok(dev.includes('http cache ceiling 128.0 MB (dev-ceiling)'));
    assert.ok(dev.includes('http cache holds dev server modules and hot updates only'));
    assert.ok(dev.includes('cache policy dev-ceiling: served by vite'));
    assert.equal(dev.some((l) => l.includes('Chromium default')), false);
  });

  it('carries the milestones, the ipc sample and the electron proof', () => {
    assert.ok(lines.includes('app-ready  312'));
    assert.ok(lines.includes('ipc over 1000 ms: 12 requests, 30 pushes'));
    assert.ok(lines.includes('pid 102  Tab  named'));
    assert.ok(lines.includes('long tasks 2, total 120 ms, longest 80 ms, during the capture'));
  });

  it('says unknown, not zero, for what could not be read', () => {
    const text2 = buildDiagnosticsReportText(
      { ...BODY, renderer: { memory: null, mountedSurfaces: null, longTasks: null }, counts: { ...BODY.counts, mountedSurfaces: null }, disk: { ...BODY.disk, codeCacheBytes: null }, milestones: [], watchers: [] },
      HOME
    );
    assert.ok(text2.includes('memory not reported'));
    assert.ok(text2.includes('terminal surfaces mounted not reported'));
    assert.ok(text2.includes('code cache unknown'));
    assert.ok(text2.includes('none recorded'));
  });

  it('lists the strays under their own heading and never inside the Tortie total', () => {
    const stray = { pid: 900, ppid: 1, kind: 'orphan' as const, name: 'left behind (tmux)', memory: { privateBytes: 1 * MB, privateSource: 'footprint' as const, rssBytes: 2 * MB }, cpuPercent: 0, cpuSource: 'lifetime' as const, electron: false };
    const text3 = buildDiagnosticsReportText(
      { ...BODY, shell: [...BODY.shell, stray], leftoverTotal: { privateBytes: 1 * MB, rssBytes: 2 * MB, processCount: 1 } },
      HOME
    );
    const lines3 = text3.split('\n');
    assert.ok(lines3.includes('3 processes, private 380.0 MB, rss 514.0 MB'));
    assert.ok(lines3.includes('[Left over from earlier launches, not counted above]'));
    assert.ok(lines3.includes('1 processes, private 1.0 MB, rss 2.0 MB'));
    const strayAt = lines3.indexOf('left behind (tmux)  pid 900  private 1.0 MB (footprint), rss 2.0 MB  cpu 0.0% lifetime');
    assert.ok(strayAt > lines3.indexOf('[Left over from earlier launches, not counted above]'));
    assert.ok(strayAt < lines3.indexOf('[Your sessions]'));
    // With no strays the heading is absent rather than empty.
    assert.equal(text.includes('Left over'), false);
  });

  it('holds nothing that looks like a key, a token or an environment value', () => {
    assert.doesNotMatch(text, /sk-ant|ghp_|AKIA|BEGIN [A-Z ]*PRIVATE KEY|Bearer |[A-Z_]{4,}=\S/);
  });
});
