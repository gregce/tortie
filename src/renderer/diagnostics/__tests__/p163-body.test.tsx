/**
 * The diagnostics report's face (Phase 163), rendered without a browser.
 *
 * The claims pinned here are the ones a photograph cannot prove on its own:
 *
 *  - The Tortie table and the Your sessions table are two groups with two
 *    totals, and NO number on the face is their sum.
 *  - A session row names the agent and the session, never a command line.
 *  - A milestone that never landed says "not yet", never 0 ms.
 *  - A pid Electron listed and the table did not name is drawn as such.
 *  - The renderer's live half is the subscription in live.ts and nothing
 *    else: no setInterval, no requestAnimationFrame, no timer of its own,
 *    and the tab's one listener is removed in the same effect that adds it.
 *  - Every colour in the stylesheet is a token.
 *  - No tmux vocabulary reaches a person.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticsReport } from '@shared/ipc';
import { DiagnosticsBody } from '../DiagnosticsTab';
import * as words from '../copy';

const HERE = join(__dirname, '..');

function report(over: Partial<DiagnosticsReport> = {}): DiagnosticsReport {
  return {
    generatedAt: new Date(2026, 7, 29, 9, 0, 0).toISOString(),
    appVersion: '0.83.0',
    windowMs: 1500,
    shell: [
      {
        pid: 100, ppid: 1, kind: 'main', name: 'main',
        memory: { privateBytes: 150 * 1024 * 1024, privateSource: 'electron', rssBytes: 300 * 1024 * 1024 },
        cpuPercent: 2.1, cpuSource: 'sampled', electron: true
      },
      {
        pid: 200, ppid: 100, kind: 'renderer', name: 'renderer', detail: 'Tortie',
        memory: { privateBytes: 90 * 1024 * 1024, privateSource: 'electron', rssBytes: 200 * 1024 * 1024 },
        cpuPercent: 0.4, cpuSource: 'sampled', electron: true
      },
      {
        pid: 5000, ppid: 1, kind: 'session-server', name: 'tmux',
        memory: { privateBytes: 7 * 1024 * 1024, privateSource: 'footprint', rssBytes: 20 * 1024 * 1024 },
        cpuPercent: 0, cpuSource: 'lifetime', electron: false
      }
    ],
    shellTotal: { privateBytes: 247 * 1024 * 1024, rssBytes: 520 * 1024 * 1024, processCount: 3 },
    leftoverTotal: { privateBytes: 0, rssBytes: 0, processCount: 0 },
    sessions: [
      {
        sessionId: 'abc', name: 'claude-1', agent: 'claude', processCount: 3,
        memory: { privateBytes: 400 * 1024 * 1024, privateSource: 'footprint', rssBytes: 500 * 1024 * 1024 },
        cpuPercent: 12,
        projectName: 'webapp', projectPath: '~/src/webapp',
        createdAt: 1_780_000_000_000, lastSeen: 1_780_000_900_000
      }
    ],
    sessionsTotal: { privateBytes: 400 * 1024 * 1024, rssBytes: 500 * 1024 * 1024, processCount: 3 },
    glance: {
      tortie: { processCount: 3, privateBytes: 247 * 1024 * 1024, rssBytes: 520 * 1024 * 1024, cpuPercent: 2.5 },
      agents: { processCount: 3, privateBytes: 400 * 1024 * 1024, rssBytes: 500 * 1024 * 1024, cpuPercent: 12 },
      together: { processCount: 6, privateBytes: 647 * 1024 * 1024, rssBytes: 1020 * 1024 * 1024, cpuPercent: 14.5 },
      energyImpact: 18.4
    },
    machine: {
      rank: 3, appCount: 40, tortieRssBytes: 520 * 1024 * 1024,
      above: [
        { name: 'Google Chrome', rssBytes: 3000 * 1024 * 1024 },
        { name: 'OrbStack', rssBytes: 900 * 1024 * 1024 }
      ]
    },
    electronPids: [
      { pid: 100, type: 'Browser', named: true },
      { pid: 200, type: 'Tab', named: true },
      { pid: 333, type: 'Utility', named: false }
    ],
    main: {
      privateBytes: 150 * 1024 * 1024, sharedBytes: 0,
      heapUsedBytes: 40 * 1024 * 1024, heapTotalBytes: 60 * 1024 * 1024,
      heapLimitBytes: 4096 * 1024 * 1024, mallocedBytes: 0
    },
    renderer: {
      memory: {
        privateBytes: 90 * 1024 * 1024, sharedBytes: 0,
        heapUsedBytes: 30 * 1024 * 1024, heapTotalBytes: 50 * 1024 * 1024,
        heapLimitBytes: 4096 * 1024 * 1024, mallocedBytes: 0,
        blinkAllocatedBytes: 12 * 1024 * 1024, blinkTotalBytes: 16 * 1024 * 1024
      },
      mountedSurfaces: 2,
      longTasks: { count: 0, totalMs: 0, maxMs: 0, buffered: false }
    },
    counts: {
      sessions: 4, localSessions: 3, remoteSessions: 1, windows: 1,
      watchers: 2, pendingWatcherCloses: 0, remoteFeeds: 1, mountedSurfaces: 2,
      listeners: ['hook channel', 'manifest ring']
    },
    watchers: [{ repo: 'project', drops: 1, rescansScheduled: 1, rescansCompleted: 1 }],
    disk: {
      httpCacheBytes: 30 * 1024 * 1024, codeCacheBytes: 12 * 1024 * 1024,
      durableBytes: 80 * 1024 * 1024, profileBytes: 130 * 1024 * 1024,
      freeBytes: 200 * 1024 * 1024 * 1024, profilePath: '~/Library/Application Support/Tortie',
      httpCacheCeilingBytes: null, cachePolicy: { mode: 'chromium-default', reason: 'nothing Tortie serves is stored' }
    },
    milestones: [
      { name: 'app-ready', atMs: 312 },
      { name: 'window-shown', atMs: 640 }
    ],
    ipc: { invokes: 12, events: 40, windowMs: 1500 },
    text: 'Tortie diagnostics\nmain 100\n',
    ...over
  };
}

function render(r: DiagnosticsReport | null, kind: 'ready' | 'capturing' | 'unavailable' | 'failed' = 'ready'): string {
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
      paused: false,
      onTogglePause: () => undefined,
      onCapture: () => undefined,
      onCopy: () => undefined,
      onHeapSnapshot: () => undefined
    })
  );
}

describe('the split', () => {
  it('draws two groups with two totals, and their sum lives in the strip alone', () => {
    const html = render(report());
    expect(html).toContain(words.GROUP_SHELL);
    expect(html).toContain(words.GROUP_SESSIONS);
    expect(html).toContain('3 processes, 247 MB private');
    expect(html).toContain('3 processes, 400 MB');
    // Phase 168: 247 + 400 appears EXACTLY ONCE, in the Together column,
    // which says what it sums. The two tables never carry it.
    expect((html.match(/647 MB/g) ?? []).length).toBe(1);
    const together = html.indexOf(words.GLANCE_TOGETHER_SUB);
    expect(together).toBeGreaterThan(-1);
    expect(html.indexOf('647 MB')).toBeGreaterThan(together);
    expect(html.indexOf('647 MB')).toBeLessThan(html.indexOf(words.GROUP_SHELL_HOVER));
  });

  it('leads with the glance strip above both tables', () => {
    const html = render(report());
    expect(html.indexOf('diag-glance')).toBeLessThan(html.indexOf('diag-group-shell'));
    expect(html).toContain(words.GLANCE_TORTIE);
    expect(html).toContain(words.GLANCE_AGENTS);
    expect(html).toContain(words.GLANCE_TOGETHER);
    expect(html).toContain('2.5%');
    expect(html).toContain('12%');
    // cpuLabel rounds above ten percent, so 14.5 draws as 15%.
    expect(html).toContain('15%');
  });

  it('labels the energy figure an impact score and says unavailable, never zero', () => {
    const html = render(report());
    expect(html).toContain(words.FIG_ENERGY);
    expect(html).toContain('18.4');
    expect(html).toContain(words.ENERGY_HOVER);
    const r = report();
    const none = render({ ...r, glance: { ...r.glance, energyImpact: null } });
    expect(none).toContain(words.ENERGY_UNAVAILABLE);
    expect(none).not.toContain(`>0<`);
  });

  it('says not read when top could not answer the window CPU', () => {
    const r = report();
    const html = render({
      ...r,
      glance: {
        ...r.glance,
        tortie: { ...r.glance.tortie, cpuPercent: null },
        agents: { ...r.glance.agents, cpuPercent: null },
        together: { ...r.glance.together, cpuPercent: null }
      }
    });
    expect(html).toContain(words.NOT_READ);
  });

  it('ranks Tortie on this Mac with the other apps named on the face only', () => {
    const html = render(report());
    expect(html).toContain('Tortie is 3rd of 40 apps on this Mac by memory, behind Google Chrome and OrbStack.');
    expect(html).toContain(words.MACHINE_HOVER);
    // The names are the face's; the copied text is the data-copy attribute,
    // which is report.text, and the main side test proves it carries none.
    const r = report();
    expect(render({ ...r, machine: null })).not.toContain('diag-machine');
  });

  it('gives the GPU row the hover naming what the private figure left out', () => {
    const r = report();
    const gpu = {
      pid: 300, ppid: 100, kind: 'gpu' as const, name: 'GPU',
      memory: { privateBytes: 340 * 1024 * 1024, privateSource: 'footprint' as const, rssBytes: 400 * 1024 * 1024 },
      cpuPercent: 1, cpuSource: 'sampled' as const, electron: true
    };
    const html = render({ ...r, shell: [...r.shell, gpu] });
    expect(html).toContain(words.GPU_FOOTPRINT_HOVER);
  });

  it('draws a stray behind one disclosure under the Tortie table, outside the total', () => {
    const stray = {
      pid: 900, ppid: 1, kind: 'orphan' as const, name: 'left behind (tmux)',
      memory: { privateBytes: 12 * 1024 * 1024, privateSource: 'footprint' as const, rssBytes: 14 * 1024 * 1024 },
      cpuPercent: 0, cpuSource: 'lifetime' as const, electron: false
    };
    const r = report();
    const html = render({ ...r, shell: [...r.shell, stray], leftoverTotal: { privateBytes: 12 * 1024 * 1024, rssBytes: 14 * 1024 * 1024, processCount: 1 } });
    expect(html).toContain('3 processes, 247 MB private');
    expect(html).toContain(`${words.LEFTOVER}: 1 processes, 12 MB`);
    expect(html.indexOf('diag-leftover')).toBeLessThan(html.indexOf('left behind (tmux)'));
    // The stray's row is inside the disclosure, not the main table.
    expect(html.indexOf('</details>')).toBeGreaterThan(html.indexOf('left behind (tmux)'));
    // 247 + 12: the stray is never folded into the Tortie total.
    expect(html).not.toContain('259 MB');
    expect(html).not.toContain('4 processes,');
    // Without a stray the line is not drawn at all.
    expect(render(r)).not.toContain(words.LEFTOVER);
  });

  it('marks the two groups with two classes so the stylesheet can colour them apart', () => {
    const html = render(report());
    expect(html).toContain('diag-group-shell');
    expect(html).toContain('diag-group-sessions');
  });

  it('names a session by agent and name, never by a command line', () => {
    const html = render(report());
    expect(html).toContain('claude-1');
    expect(html).toContain('>claude<');
    expect(html).not.toMatch(/--dangerously|argv|\/usr\/local\/bin/);
  });

  it('indents a child of main and shows every Tortie row with pid, cpu, private and resident', () => {
    const html = render(report());
    expect(html).toContain('diag-child');
    expect(html).toContain('>200<');
    expect(html).toContain('0.4%');
    expect(html).toContain('90 MB');
    expect(html).toContain('200 MB');
  });
});

describe('the sections', () => {
  it('says not yet for a milestone that never landed, never 0 ms', () => {
    const html = render(report());
    expect(html).toContain('312 ms');
    expect(html).toContain('640 ms');
    expect((html.match(new RegExp(words.NOT_YET, 'g')) ?? []).length).toBe(5);
    expect(html).not.toContain('>0 ms<');
  });

  it('draws the Electron proof with the unnamed pid marked', () => {
    const html = render(report());
    expect(html).toContain('3 listed, 2 named');
    expect(html).toContain('Utility 333');
    expect(html).toContain('diag-unnamed');
  });

  it('draws the counts, the disk rows and the watcher row', () => {
    const html = render(report());
    expect(html).toContain(words.FIG_SESSIONS);
    // Phase 170: the message figure moved into this window's row detail,
    // closed at rest. p170-body proves it complete when opened.
    expect(html).not.toContain('12 up, 40 down');
    expect(html).toContain(words.DISK_HTTP);
    expect(html).toContain('30 MB');
    expect(html).toContain('1 dropped, 1 scheduled, 1 completed');
    expect(html).toContain('hook channel');
  });

  it('says one sentence for each state with nothing to draw', () => {
    expect(render(null, 'capturing')).toContain(words.STATE_CAPTURING);
    expect(render(null, 'unavailable')).toContain(words.STATE_NO_BRIDGE);
    expect(render(null, 'failed')).toContain(words.STATE_FAILED);
  });

  it('keeps the previous report on screen while a new capture runs', () => {
    const html = render(report(), 'capturing');
    expect(html).toContain('diag-body-stale');
    expect(html).toContain(words.GROUP_SHELL);
    expect(html).toContain(words.CAPTURING);
  });
});

describe('the refusals, read from the source', () => {
  const tab = readFileSync(join(HERE, 'DiagnosticsTab.tsx'), 'utf8');
  const capture = readFileSync(join(HERE, 'capture.ts'), 'utf8');
  const live = readFileSync(join(HERE, 'live.ts'), 'utf8');
  const css = readFileSync(join(HERE, 'diagnostics.css'), 'utf8');
  const copy = readFileSync(join(HERE, 'copy.ts'), 'utf8');

  it('the renderer arms no timer of its own for live mode', () => {
    // Phase 170: the operator sanctioned sampling WHILE THE TAB IS VISIBLE.
    // The tick's timer lives in MAIN, behind the live subscription. This
    // side holds a listener and nothing else: no setInterval, no
    // requestAnimationFrame, no polling timer anywhere on the surface.
    for (const src of [tab, capture, live]) {
      expect(src).not.toMatch(/setInterval|requestAnimationFrame/);
    }
    // The tab's one setTimeout is the Copied flip. The capture's one is the
    // sampling window itself, closed by the capture.
    expect((tab.match(/setTimeout/g) ?? []).length).toBe(1);
    expect((capture.match(/setTimeout/g) ?? []).length).toBe(1);
    // The one listener the tab adds is removed in the same effect's cleanup,
    // and the subscription is disposed there too, so a closed tab runs
    // nothing and listens to nothing.
    expect((tab.match(/addEventListener/g) ?? []).length).toBe(1);
    expect((tab.match(/removeEventListener/g) ?? []).length).toBe(1);
    expect(tab).toMatch(/s\.dispose\(\)/);
  });

  it('the observer is stopped in a finally block', () => {
    expect(capture).toMatch(/finally\s*{\s*watch\?\.stop\(\);/);
  });

  it('every colour is a token', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });

  it('no tmux vocabulary reaches a person', () => {
    const strings = copy.match(/'[^']*'/g) ?? [];
    for (const s of strings) {
      expect(s.toLowerCase()).not.toMatch(/\bpane\b|\btmux\b|\bprefix\b|\battach/);
    }
  });

  it('no dash of either long kind anywhere in the surface', () => {
    for (const src of [tab, capture, live, css, copy]) {
      expect(src).not.toMatch(/[–—]/);
    }
  });
});
