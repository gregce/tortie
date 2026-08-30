/**
 * Unit tests for src/main/diagnostics/power.ts (Phase 168).
 *
 * The fixture is the shape /usr/bin/top printed on 2026-08-30: two sample
 * blocks, each headed `PID    %CPU POWER`, the first counting since boot
 * and only the second a rate over the gap. The parse must read the LAST
 * block, and must answer null power when the column is absent, never zero.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parseTopSample, readPowerSample, topArgs } from '../power';

const TWO_BLOCKS = `Processes: 998 total, 3 running, 995 sleeping, 9911 threads
2026/08/30 16:11:44
Load Avg: 3.83, 6.77, 9.24

PID    %CPU POWER
99587  0.0  0.0
376    88.1 91.4

Processes: 998 total, 3 running, 995 sleeping, 9911 threads
2026/08/30 16:11:45
Load Avg: 3.83, 6.77, 9.24
CPU usage: 10.8% user, 11.9% sys, 78.81% idle
PhysMem: 47G used (6985M wired, 16G compressor), 139M unused.

PID    %CPU POWER
376    39.0 40.0
0      35.6 0.0
24076  30.0 30.0
7681   15.4 15.7
`;

describe('parseTopSample', () => {
  it('reads the LAST block, because the first counts since boot', () => {
    const sample = parseTopSample(TWO_BLOCKS);
    assert.ok(sample !== null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
    assert.equal(sample.cpuByPid.get(24076), 30.0);
    assert.equal(sample.cpuByPid.size, 4);
    // The first block's 88.1 for pid 376 is discarded.
    assert.notEqual(sample.cpuByPid.get(376), 88.1);
  });

  it('reads the power column when the header names it', () => {
    const sample = parseTopSample(TWO_BLOCKS);
    assert.ok(sample !== null && sample.powerByPid !== null);
    assert.equal(sample.powerByPid.get(376), 40.0);
    assert.equal(sample.powerByPid.get(7681), 15.7);
  });

  it('answers null power, never zero, when the column is absent', () => {
    const noPower = 'PID    %CPU\n376    39.0\n100    1.2\n';
    const sample = parseTopSample(noPower);
    assert.ok(sample !== null);
    assert.equal(sample.powerByPid, null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
    assert.equal(sample.cpuByPid.get(100), 1.2);
  });

  it('answers null for output with no sample block at all', () => {
    assert.equal(parseTopSample(''), null);
    assert.equal(parseTopSample('top: unknown argument\n'), null);
  });

  it('stops at the first line that is not a row', () => {
    const trailing = 'PID    %CPU POWER\n10  1.0 2.0\nProcesses: 5 total\n99  9.0 9.0\n';
    const sample = parseTopSample(trailing);
    assert.ok(sample !== null);
    assert.equal(sample.cpuByPid.size, 1);
    assert.equal(sample.cpuByPid.get(10), 1.0);
  });
});

describe('topArgs', () => {
  it('asks for two samples, zero interval, and the three columns', () => {
    assert.deepEqual(topArgs(), ['-l', '2', '-s', '0', '-stats', 'pid,cpu,power']);
  });
});

describe('readPowerSample', () => {
  it('answers null rather than throwing when the run fails', async () => {
    assert.equal(
      await readPowerSample({ run: () => Promise.reject(new Error('no')) }),
      null
    );
    assert.equal(await readPowerSample({ run: () => Promise.resolve('') }), null);
  });

  it('hands the parsed last block through', async () => {
    const sample = await readPowerSample({ run: () => Promise.resolve(TWO_BLOCKS) });
    assert.ok(sample !== null && sample.powerByPid !== null);
    assert.equal(sample.powerByPid.get(24076), 30.0);
  });
});
