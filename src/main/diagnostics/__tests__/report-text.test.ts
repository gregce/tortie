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
import type {
  DiagnosticsReport,
  DiagnosticsSessionWorkload
} from '@shared/ipc';
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
    { sessionId: 'S1', name: 'API refactor', agent: 'claude', processCount: 2, memory: { privateBytes: 351 * MB, privateSource: 'footprint', rssBytes: 401 * MB }, cpuPercent: 3.2, projectName: 'webapp', projectPath: '~/src/webapp', createdAt: Date.UTC(2026, 7, 30, 9, 15, 0), lastSeen: Date.UTC(2026, 7, 31, 11, 45, 0) }
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
    assert.ok(
      lines.includes(
        'API refactor  webapp (~/src/webapp)  claude  2 processes  private 351.0 MB (footprint), rss 401.0 MB  cpu 3.2% lifetime  started 2026-08-30T09:15:00.000Z  last seen 2026-08-31T11:45:00.000Z'
      )
    );
  });

  // PHASE 188. The complaint that started the phase was that a pasted row
  // cannot be traced to the work it belongs to. A row with no manifest match
  // still has to appear, so it says so in words rather than dropping fields
  // and leaving a line a person cannot align with the others.
  it('says so in words when a session has no manifest row', () => {
    const stray = buildDiagnosticsReportText(
      {
        ...BODY,
        sessions: [
          {
            sessionId: null,
            name: 'stray',
            agent: 'unknown',
            processCount: 1,
            memory: { privateBytes: null, privateSource: null, rssBytes: MB },
            cpuPercent: 0,
            projectName: null,
            projectPath: null,
            createdAt: null,
            lastSeen: null
          }
        ]
      },
      HOME
    ).split('\n');
    assert.ok(
      stray.includes(
        'stray  project unknown  unknown  1 processes  private unknown, rss 1.0 MB  cpu 0.0% lifetime  started unknown  last seen unknown'
      )
    );
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

/**
 * PHASE 188.1. The hostile fixture: bytes somebody else wrote into the
 * manifest, read back and rendered.
 *
 * `stampText` used to hand every value straight to `new Date(...)
 * .toISOString()`, which throws a `RangeError` outside plus or minus
 * 8.64e15 ms. The throw is not one spoilt cell. The text build runs inside
 * `finishCapture` (../report.ts), nothing on that path catches, and Phase
 * 170's live loop stops after three failed ticks (../live.ts), so one corrupt
 * row took the whole pane down with nothing saying why.
 *
 * Tortie writes both fields with `Date.now()`, so a value gets here only by a
 * hand edit, a restore from something else, or corruption. The cost of the
 * guard is one clause and the cost of the defect is the pane, which is why it
 * is guarded rather than assumed away.
 *
 * Every value below is run through the REAL builder over the REAL body shape.
 * At the parent commit each of the five impossible ones throws
 * `RangeError: Invalid time value`.
 */
describe('a line break in a name stays on one row (Phase 197 item 18)', () => {
  it('folds a newline in the session name and in the project name to a space', () => {
    const body: Omit<DiagnosticsReport, 'text'> = {
      ...BODY,
      sessions: [
        {
          ...(BODY.sessions[0] as DiagnosticsSessionWorkload),
          name: 'API\nrefactor',
          projectName: 'web\r\napp',
          projectPath: '~/src/web\napp'
        }
      ]
    };
    const lines = buildDiagnosticsReportText(body, HOME).split('\n');
    const at = lines.indexOf('[Your sessions]');
    // The heading, the total, exactly ONE row, then the blank line before [main].
    assert.equal(lines[at + 3], '');
    const row = lines[at + 2] ?? '';
    assert.ok(row.startsWith('API refactor  web app (~/src/web app)  claude  '), row);
  });
});

describe('an impossible instant is unknown, and a legal one still renders', () => {
  /** The report's own `generatedAt`, so "the future" has something to be after. */
  const AT = Date.parse(BODY.generatedAt);
  const DAY = 24 * 60 * 60 * 1000;

  /** The ordinary row from BODY with ONLY the two stamps moved. */
  function withStamps(
    createdAt: number | null,
    lastSeen: number | null
  ): DiagnosticsSessionWorkload {
    const [base] = BODY.sessions;
    if (base === undefined) throw new Error('BODY carries no session row');
    return { ...base, createdAt, lastSeen };
  }

  /** One session line built over the hostile values and nothing else changed. */
  function sessionLine(createdAt: number | null, lastSeen: number | null): string {
    const out = buildDiagnosticsReportText(
      { ...BODY, sessions: [withStamps(createdAt, lastSeen)] },
      HOME
    )
      .split('\n')
      .filter((l) => l.startsWith('API refactor  '));
    assert.equal(out.length, 1, 'the session row must still be drawn exactly once');
    return out[0] ?? '';
  }

  /**
   * The five the entry names, plus a non-numeric string. The column is
   * declared `INTEGER NOT NULL` in ../manifest/schema.ts and SQLite still
   * hands back the text a hand edit put there, so the declared `number` is a
   * promise the file cannot keep; the cast is how that reaches the builder.
   */
  const IMPOSSIBLE: [string, number][] = [
    ['one past the largest instant', 8.64e15 + 1],
    ['one before the smallest instant', -8.64e15 - 1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['text in an INTEGER column', 'not a time' as unknown as number]
  ];

  for (const [what, value] of IMPOSSIBLE) {
    it(`answers unknown for ${what}, and does not throw`, () => {
      assert.equal(
        sessionLine(value, value),
        'API refactor  webapp (~/src/webapp)  claude  2 processes  private 351.0 MB (footprint), rss 401.0 MB  cpu 3.2% lifetime  started unknown  last seen unknown'
      );
    });
  }

  it('spoils only the two stamps, never the rest of the report', () => {
    const good = buildDiagnosticsReportText(BODY, HOME).split('\n');
    const bad = buildDiagnosticsReportText(
      { ...BODY, sessions: [withStamps(8.64e15 + 1, Number.NaN)] },
      HOME
    ).split('\n');
    // The whole capture survives rather than failing: the report is the same
    // length and EXACTLY ONE line differs, which is the session row. That is
    // the difference between one cell reading unknown and the pane going dead.
    assert.equal(bad.length, good.length);
    const moved = bad.filter((line, i) => line !== good[i]);
    assert.equal(moved.length, 1);
    assert.ok(moved[0]?.startsWith('API refactor  '));
    // The two stamps moved to the word null already uses, and to nothing else.
    // A clamp would have written the boundary instant into the line instead.
    assert.ok(moved[0]?.endsWith('started unknown  last seen unknown'));
    assert.equal(bad.join('\n').includes('+275760'), false);
    assert.equal(bad.join('\n').includes('-271821'), false);
  });

  // The guard is a range check, not a clamp. Both ends are legal instants and
  // both must still render as themselves, which is what catches an off by one.
  it('renders the largest and the smallest instant a Date can hold', () => {
    assert.ok(sessionLine(8.64e15, -8.64e15).endsWith(
      'started +275760-09-13T00:00:00.000Z  last seen -271821-04-20T00:00:00.000Z'
    ));
  });

  // The entry's own clamp trap. A session last seen after the report was
  // generated is a legal instant, and the pasted text carries the instant
  // itself rather than an age, so it must read as that exact time.
  it('renders a last seen three days after the report as that instant', () => {
    assert.ok(
      sessionLine(AT, AT + 3 * DAY).endsWith(
        'started 2026-08-29T17:00:00.000Z  last seen 2026-09-01T17:00:00.000Z'
      )
    );
  });

  // A null was already `unknown` before this phase and still is, so the two
  // kinds of missing read the same on a pasted line.
  it('leaves null reading unknown, which is the word the guard reuses', () => {
    assert.ok(sessionLine(null, null).endsWith('started unknown  last seen unknown'));
  });
});
