/**
 * Unit tests for src/main/diagnostics/glance.ts (Phase 168).
 *
 * The claims that matter: the Together column is the sum of the other two
 * and nothing else computes one, the CPU figures are null when top could
 * not answer rather than zero, and the energy score sums over both pid
 * sets or is null when the column was unavailable.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { buildGlance } from '../glance';

const MB = 1024 * 1024;

function input() {
  return {
    shellTotal: { privateBytes: 300 * MB, rssBytes: 500 * MB, processCount: 8 },
    sessionsTotal: { privateBytes: 200 * MB, rssBytes: 400 * MB, processCount: 4 },
    shellPids: [1, 2, 3],
    agentPids: [10, 11],
    cpuByPid: new Map([
      [1, 1.5],
      [2, 0.4],
      [3, 2.0],
      [10, 30.0],
      [11, 4.05],
      [999, 80.0]
    ]),
    powerByPid: new Map([
      [1, 5.0],
      [3, 1.2],
      [10, 12.0],
      [999, 44.0]
    ])
  };
}

describe('buildGlance', () => {
  it('repeats the two table totals and sums them only in Together', () => {
    const g = buildGlance(input());
    assert.equal(g.tortie.privateBytes, 300 * MB);
    assert.equal(g.agents.privateBytes, 200 * MB);
    assert.equal(g.together.privateBytes, 500 * MB);
    assert.equal(g.together.rssBytes, 900 * MB);
    assert.equal(g.together.processCount, 12);
  });

  it('sums CPU over each column pid set and never a stranger pid', () => {
    const g = buildGlance(input());
    assert.equal(g.tortie.cpuPercent, 3.9);
    assert.equal(g.agents.cpuPercent, 34.1);
    assert.equal(g.together.cpuPercent, 38.0);
  });

  it('answers null CPU when top could not answer, never zero', () => {
    const g = buildGlance({ ...input(), cpuByPid: null });
    assert.equal(g.tortie.cpuPercent, null);
    assert.equal(g.agents.cpuPercent, null);
    assert.equal(g.together.cpuPercent, null);
  });

  it('sums the energy score over both pid sets and skips missing pids', () => {
    const g = buildGlance(input());
    assert.equal(g.energyImpact, 18.2);
  });

  it('answers null energy when the power column was unavailable', () => {
    const g = buildGlance({ ...input(), powerByPid: null });
    assert.equal(g.energyImpact, null);
  });
});
