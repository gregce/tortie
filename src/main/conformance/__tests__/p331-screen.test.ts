/**
 * Phase 331 (build/p331/SPEC.md §2.8, §3 Builder C). The resume-conformance
 * harness's screen judgement: the one clause that makes the run owed after
 * every agent-CLI upgrade catch a Codex or a Claude Code whose inline switch
 * was renamed, dropped or overridden.
 *
 * Every row below is read from the COMPILED registry, so a switch that stops
 * being `switch-to-inline` there turns S1 red here as well as in
 * `conformance:agents`. `ablation:p331` arm B4 removes the failure line from
 * ./screen-class.ts and requires S1 to go red by name.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchableAgentId } from '@shared/types';
import { LAUNCHABLE_AGENT_IDS, getLaunchableEntry } from '../../agents/registry';
import { SCREEN_FORMAT, judgeScreen, parseScreenReading, readScreen } from '../screen-class';

// The one tmux call, answered here: no server is started by this file.
const { execTmux } = vi.hoisted(() => ({
  execTmux: vi.fn<(args: readonly string[]) => Promise<string>>()
}));
vi.mock('../../tmux', () => ({ execTmux }));

const reading = (alternateOn: boolean, mouseAny: boolean, historySize = 12) => ({
  alternateOn,
  mouseAny,
  historySize
});

/** Every launchable row, by its compiled class. */
const byClass = (cls: string): LaunchableAgentId[] =>
  LAUNCHABLE_AGENT_IDS.filter((id) => getLaunchableEntry(id).screen?.class === cls);

beforeEach(() => {
  execTmux.mockReset();
});

describe('Phase 331: the conformance harness judges each pane against its compiled screen class', () => {
  it('a switch-to-inline row on the alternate screen fails', () => {
    const switched = byClass('switch-to-inline');
    // The two rows Phase 331 compiles a switch for, and no third.
    expect([...switched].sort()).toEqual(['claude', 'codex']);
    for (const agent of switched) {
      for (const mouse of [false, true]) {
        const judged = judgeScreen(agent, reading(true, mouse, 0));
        expect(judged.class).toBe('switch-to-inline');
        expect(judged.fail).not.toBeNull();
        expect(judged.fail).toContain(agent);
        expect(judged.fail).toMatch(/renamed, dropped or overridden/);
      }
    }
  });

  it('a switch-to-inline row on the normal screen passes', () => {
    for (const agent of ['codex', 'claude'] as const) {
      const judged = judgeScreen(agent, reading(false, false, 40));
      expect(judged).toEqual({ class: 'switch-to-inline', fail: null, mismatch: null });
      // A mouse on the normal screen is recorded, never failed.
      const mouse = judgeScreen(agent, reading(false, true, 40));
      expect(mouse.fail).toBeNull();
      expect(mouse.mismatch).not.toBeNull();
    }
  });

  it('any other row records a mismatch with its class and never fails', () => {
    const inline = byClass('inline-already');
    const fullscreen = byClass('fullscreen-with-mouse');
    const unknown = byClass('unknown');
    // Not vacuous: research 134's table has rows of each of the three.
    expect(inline).toContain('cursor');
    expect(fullscreen).toContain('deepseek');
    expect(unknown).toContain('grok');
    const all = [false, true].flatMap((a) => [false, true].map((m) => reading(a, m)));
    for (const agent of [...inline, ...fullscreen, ...unknown]) {
      for (const r of all) expect(judgeScreen(agent, r).fail).toBeNull();
    }
    for (const agent of inline) {
      expect(judgeScreen(agent, reading(false, false)).mismatch).toBeNull();
      const off = judgeScreen(agent, reading(true, true));
      expect(off.class).toBe('inline-already');
      expect(off.mismatch).toContain(agent);
      expect(off.mismatch).toContain('inline-already');
      expect(judgeScreen(agent, reading(true, false)).mismatch).not.toBeNull();
    }
    for (const agent of fullscreen) {
      expect(judgeScreen(agent, reading(true, true)).mismatch).toBeNull();
      const off = judgeScreen(agent, reading(false, false));
      expect(off.class).toBe('fullscreen-with-mouse');
      expect(off.mismatch).toContain('fullscreen-with-mouse');
    }
    for (const agent of unknown) {
      for (const r of all) expect(judgeScreen(agent, r)).toEqual({ class: 'unknown', fail: null, mismatch: null });
    }
  });

  it('a missing reading fails a switch-to-inline row and is recorded for any other', async () => {
    for (const agent of ['codex', 'claude'] as const) {
      const judged = judgeScreen(agent, null);
      expect(judged.fail).not.toBeNull();
      expect(judged.fail).toMatch(/could not look has not passed/);
    }
    for (const agent of LAUNCHABLE_AGENT_IDS.filter((id) => getLaunchableEntry(id).screen?.class !== 'switch-to-inline')) {
      const judged = judgeScreen(agent, null);
      expect(judged.fail).toBeNull();
      expect(judged.mismatch).toMatch(/no screen reading/);
    }
    // What counts as no reading: tmux refusing, and anything that is not the
    // three fields asked for. Never a zero read out of nothing.
    expect(parseScreenReading('')).toBeNull();
    expect(parseScreenReading('1\t0')).toBeNull();
    expect(parseScreenReading('1\t0\t3\t9')).toBeNull();
    expect(parseScreenReading('on\t0\t3')).toBeNull();
    expect(parseScreenReading('0\t1\t-4')).toBeNull();
    expect(parseScreenReading('1\t0\t0\n')).toEqual({ alternateOn: true, mouseAny: false, historySize: 0 });
    execTmux.mockRejectedValueOnce(new Error('no such pane'));
    expect(await readScreen('$9')).toBeNull();
    execTmux.mockResolvedValueOnce('0\t0\t37\n');
    expect(await readScreen('$9')).toEqual({ alternateOn: false, mouseAny: false, historySize: 37 });
    expect(execTmux).toHaveBeenLastCalledWith(['display-message', '-p', '-t', '$9', SCREEN_FORMAT]);
  });
});
