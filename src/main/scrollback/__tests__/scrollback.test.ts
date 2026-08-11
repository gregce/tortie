/**
 * Scrollback: the cost estimator, the on-demand reads, and the one notice
 * this feature is allowed to volunteer (Phase 13.7).
 *
 * The numbers asserted here are MEASURED, not invented — they come from
 * docs/research/23-scrollback-limits.md, and a change that moves them is a
 * change to what gmux tells the user it costs to keep their output.
 *
 * Runner: vitest (`npm test`).
 */

import { describe, expect, it, vi } from 'vitest';
import {
  BYTES_PER_LINE_CEILING,
  BYTES_PER_LINE_FALLBACK,
  bytesPerLine,
  formatScrollbackBytes,
  formatScrollbackSummary,
  type PaneScrollbackFacts,
  type ScrollbackNotice
} from '@shared/scrollback';
import {
  clampSavedScrollbackLines,
  clampScrollbackLines,
  DEFAULT_SAVED_SCROLLBACK_LINES,
  DEFAULT_SCROLLBACK_LINES,
  MAX_SCROLLBACK_LINES,
  MIN_SCROLLBACK_LINES
} from '@shared/settings';
import type { GmuxProcess } from '../../diagnostics/owned-processes';
import {
  formatOwnedProcessLines,
  parseStatsLines,
  readSessionScrollback
} from '../service';
import { isDiscarding, ScrollbackWatch } from '../watch';

function pane(over: Partial<PaneScrollbackFacts> = {}): PaneScrollbackFacts {
  return { lines: 1_000, limit: 25_000, bytes: 400_000, rows: 42, ...over };
}

describe('bytesPerLine — the estimate the UI prints', () => {
  it('falls back until two sessions have real depth', () => {
    // One session's habits are not the user's rate. 160 B/line for a settled
    // claude transcript and 1,451 for an active node agent were measured on
    // the same machine on the same day.
    expect(bytesPerLine([]).estimated).toBe(true);
    expect(bytesPerLine([]).bytes).toBe(BYTES_PER_LINE_FALLBACK);
    expect(bytesPerLine([pane()]).estimated).toBe(true);
    expect(bytesPerLine([pane({ lines: 10 }), pane({ lines: 20 })]).estimated).toBe(
      true
    );
  });

  it('divides by lines + ROWS, because history_bytes includes the screen', () => {
    // MEASURED: a 128-line session read 1,764 B/line over its history alone,
    // but 42 of those lines were a full-width truecolour TUI screen worth
    // ~190 KB. Dividing by history_size alone over-attributes on any shallow
    // pane, which is most of them.
    const p = pane({ lines: 1_000, rows: 42, bytes: 1_042_000 });
    const rate = bytesPerLine([p, p]);
    expect(rate.estimated).toBe(false);
    expect(rate.bytes).toBeCloseTo(1_042_000 / 1_042, 6);
  });

  it('lands in the right place on the user\'s own measured fleet', () => {
    // The three panes with real depth on the user's 15-pane server, read
    // read-only on 2026-08-10 (research §1.2). The naive fleet-wide ratio —
    // 6.99 MB over 18,829 lines — is 371 B/line; this estimator answers 354,
    // and the 5% difference is the screen grids it correctly refuses to
    // charge to the scrollback. Both are the right order of magnitude, which
    // is all a figure printed as "about X MB" is allowed to claim.
    const rate = bytesPerLine([
      pane({ lines: 14_867, rows: 42, bytes: 2_382_817 }),
      pane({ lines: 1_649, rows: 42, bytes: 2_454_222 }),
      pane({ lines: 993, rows: 42, bytes: 1_397_733 })
    ]);
    expect(Math.round(rate.bytes)).toBe(354);
    expect(rate.estimated).toBe(false);
  });

  it('cannot report more than dense truecolour costs', () => {
    // 4,576 B/line at 162 columns is the worst content ever measured; a rate
    // above it means the sample is wrong, not that the user found new physics.
    const rate = bytesPerLine([
      pane({ lines: 1_000, rows: 0, bytes: 999_000_000 }),
      pane({ lines: 1_000, rows: 0, bytes: 999_000_000 })
    ]);
    expect(rate.bytes).toBe(BYTES_PER_LINE_CEILING);
  });
});

describe('depth clamps — the guard between a text file and tmux', () => {
  it('holds the measured defaults', () => {
    expect(DEFAULT_SCROLLBACK_LINES).toBe(25_000);
    expect(DEFAULT_SAVED_SCROLLBACK_LINES).toBe(10_000);
  });

  it('refuses a hand-edited settings.json memory bomb', () => {
    expect(clampScrollbackLines(50_000_000)).toBe(MAX_SCROLLBACK_LINES);
    expect(clampScrollbackLines(-1)).toBe(MIN_SCROLLBACK_LINES);
    expect(clampScrollbackLines('lots')).toBe(DEFAULT_SCROLLBACK_LINES);
    expect(clampScrollbackLines(undefined)).toBe(DEFAULT_SCROLLBACK_LINES);
    expect(clampScrollbackLines(NaN)).toBe(DEFAULT_SCROLLBACK_LINES);
  });

  it('never saves deeper than the session keeps', () => {
    // Saving 25,000 lines of a session that only holds 2,000 is a promise the
    // capture cannot fulfil.
    expect(clampSavedScrollbackLines(25_000, 2_000)).toBe(2_000);
    expect(clampSavedScrollbackLines(10_000, 100_000)).toBe(10_000);
    // …and the floor still wins over an absurdly shallow depth.
    expect(clampSavedScrollbackLines(10_000, 1_000)).toBe(1_000);
  });
});

describe('the figures the UI actually prints', () => {
  it('never claims more precision than the estimate has', () => {
    // The rate behind these carries ±4×; "8.7 MB" would be a lie told to
    // three significant figures.
    expect(formatScrollbackBytes(0)).toBe('less than 0.1 MB');
    expect(formatScrollbackBytes(908 * 1024)).toBe('0.9 MB');
    expect(formatScrollbackBytes(1.5 * 1024 ** 2)).toBe('1.5 MB');
    expect(formatScrollbackBytes(37 * 1024 ** 2)).toBe('37 MB');
    expect(formatScrollbackBytes(1.2 * 1024 ** 3)).toBe('1.2 GB');
  });

  it('reads the per-session menu line the way the research specified it', () => {
    expect(
      formatScrollbackSummary({ lines: 4210, limit: 25_000, bytes: 1.5 * 1024 ** 2 })
    ).toBe('Scrollback — 4,210 of 25,000 lines · about 1.5 MB');
  });
});

describe('parseStatsLines', () => {
  it('reads the fleet and ignores blank output', () => {
    const rows = parseStatsLines('$1\t14867\t25000\t2382817\t42\n\n$2\t0\t25000\t15504\t42\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      tmuxId: '$1',
      lines: 14867,
      limit: 25000,
      bytes: 2382817,
      rows: 42
    });
  });
});

describe('readSessionScrollback', () => {
  it('is one round trip, and null for a session that is not running', async () => {
    const run = vi.fn(async () => '4210\t25000\t1572864\n');
    const deps = {
      run,
      tmuxIdOf: (id: string) => (id === 'live' ? '$3' : null),
      nameOf: () => 'claude-3',
      snapshotsDir: () => '/nowhere',
      settings: () => ({}) as never
    };
    expect(await readSessionScrollback(deps, 'live')).toEqual({
      sessionId: 'live',
      lines: 4210,
      limit: 25000,
      bytes: 1572864
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(await readSessionScrollback(deps, 'ended')).toBeNull();
    expect(run).toHaveBeenCalledTimes(1); // no call for a dead session
  });
});

describe('ScrollbackWatch — the Zen line, in code', () => {
  function watch(): { w: ScrollbackWatch; out: ScrollbackNotice[]; at: { now: number } } {
    const out: ScrollbackNotice[] = [];
    const at = { now: 1_800_000_000_000 };
    const w = new ScrollbackWatch({
      nameOf: (id) => (id === 'gone' ? null : `session-${id}`),
      emit: (n) => out.push(n),
      now: () => at.now
    });
    return { w, out, at };
  }

  it('says NOTHING about a session that is merely filling up', () => {
    // "A number that rises on its own is not a signal." Two thirds of the way
    // to the ceiling is a number rising on its own.
    const { w, out, at } = watch();
    w.observe([{ sessionId: 'a', lines: 1, limit: 25_000 }]);
    at.now += 120_000;
    w.observe([{ sessionId: 'a', lines: 16_000, limit: 25_000 }]);
    expect(out).toEqual([]);
  });

  it('speaks ONCE, the first time output is actually discarded', () => {
    // 23,100 of 25,000 — inside tmux's trim band, which is where a pane that
    // is actively discarding actually LIVES. See isDiscarding below.
    const { w, out, at } = watch();
    w.observe([{ sessionId: 'a', lines: 100, limit: 25_000 }]);
    at.now += 120_000;
    for (let i = 0; i < 50; i++) {
      w.observe([{ sessionId: 'a', lines: 23_100 + (i % 900), limit: 25_000 }]);
      at.now += 1_000;
    }
    expect(out).toEqual([
      { kind: 'discarding', sessionName: 'session-a', limit: 25_000 }
    ]);
  });

  it('recognises a discarding pane where tmux actually leaves it', () => {
    // MEASURED at limit 1,000, 40 samples at 10 Hz off a pane in a continuous
    // write loop: history_size ranged [901, 997] and NEVER reached 1,000,
    // because grid_collect_history() drops limit/10 lines at a time. The
    // research's proposed `size >= limit` test would have fired on none of
    // these — this is the bug driving the real app found.
    const observed = [930, 987, 997, 916, 965, 970, 933, 956, 901, 912];
    for (const lines of observed) {
      expect(isDiscarding(lines, 1_000)).toBe(true);
    }
    // …and the Clear action, which empties the history, stays quiet.
    expect(isDiscarding(0, 1_000)).toBe(false);
    expect(isDiscarding(899, 1_000)).toBe(false);
    // A pane with no depth at all cannot be discarding.
    expect(isDiscarding(0, 0)).toBe(false);
  });

  it('lets a new session settle before lecturing it', () => {
    // A restored session replaying a snapshot, or a deliberate `cat` of a
    // huge file, is not news.
    const { w, out, at } = watch();
    w.observe([{ sessionId: 'a', lines: 0, limit: 25_000 }]);
    at.now += 5_000;
    w.observe([{ sessionId: 'a', lines: 24_000, limit: 25_000 }]);
    expect(out).toEqual([]);
    at.now += 120_000;
    w.observe([{ sessionId: 'a', lines: 24_000, limit: 25_000 }]);
    expect(out).toHaveLength(1);
  });

  it('never names a session it cannot name', () => {
    const { w, out, at } = watch();
    w.observe([{ sessionId: 'gone', lines: 0, limit: 100 }]);
    at.now += 120_000;
    w.observe([{ sessionId: 'gone', lines: 100, limit: 100 }]);
    expect(out).toEqual([]);
  });

  it('re-arms the disk thresholds daily, not per check', () => {
    const { w, out, at } = watch();
    const big = 2 * 1024 ** 3;
    const tight = 1024 ** 3;
    w.checkDisk(big, tight);
    w.checkDisk(big, tight);
    expect(out.map((n) => n.kind)).toEqual(['saved-large', 'disk-low']);
    at.now += 25 * 60 * 60 * 1000;
    w.checkDisk(big, tight);
    expect(out).toHaveLength(4);
  });

  it('says nothing about a healthy disk', () => {
    const { w, out } = watch();
    w.checkDisk(908 * 1024, 412 * 1024 ** 3);
    expect(out).toEqual([]);
  });
});

describe('Copy details — the gmux-owned process list (Phase 13.8 item 2)', () => {
  function proc(over: Partial<GmuxProcess> = {}): GmuxProcess {
    return {
      pid: 4210,
      ppid: 1,
      role: 'session',
      rssBytes: 45 * 1024 * 1024,
      cpuPercent: 1.25,
      command: 'claude --resume abc',
      ...over
    };
  }

  it('prints one line per process, with the pid the user came for', () => {
    const lines = formatOwnedProcessLines([
      proc({ pid: 900, role: 'app', command: '/Applications/gmux.app/…/gmux' }),
      proc({ pid: 901, role: 'session', sessionName: 'gmux-ui' })
    ]);
    // Header + one line per process. Nothing summarised away.
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('2 owned by gmux');
    expect(lines[1]).toContain('900');
    expect(lines[1]).toContain('app');
    expect(lines[2]).toContain('901');
    // The session a process belongs to is the answer to "whose claude is
    // this?" — 12.7's bare-name launch cannot supply it, so this list must.
    expect(lines[2]).toContain('[gmux-ui]');
    expect(lines[2]).toContain('claude --resume abc');
  });

  it('says nothing at all when it owns nothing', () => {
    // `ps` refused, or this is a report from a machine with no server. An
    // empty heading would read as a fact ("0 processes"); silence is honest.
    expect(formatOwnedProcessLines([])).toEqual([]);
  });

  it('clips a runaway command line instead of wrapping the report', () => {
    const line = formatOwnedProcessLines([proc({ command: 'x'.repeat(400) })])[1];
    expect(line).toBeDefined();
    expect(line?.length).toBeLessThan(180);
    expect(line?.endsWith('…')).toBe(true);
  });
});
