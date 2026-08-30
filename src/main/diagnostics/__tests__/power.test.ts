/**
 * Unit tests for src/main/diagnostics/power.ts (Phase 168, mem in 170).
 *
 * The fixture is the shape /usr/bin/top printed on 2026-08-30: two sample
 * blocks, each headed `PID    %CPU POWER MEM`, the first counting since
 * boot and only the second a rate over the gap. The parse must read the
 * LAST block, must answer null power when the column is absent, never
 * zero, and since Phase 170 must read MEM as physical footprint bytes,
 * because that column is what replaced the /usr/bin/footprint spawn the
 * 5 second deadline was killing on machines with many sessions.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  memTokenBytes,
  parseTopSample,
  readPowerSample,
  topArgs
} from '../power';

const TWO_BLOCKS = `Processes: 998 total, 3 running, 995 sleeping, 9911 threads
2026/08/30 16:11:44
Load Avg: 3.83, 6.77, 9.24

PID    %CPU POWER MEM
99587  0.0  0.0   2080K
376    88.1 91.4  1402M-

Processes: 998 total, 3 running, 995 sleeping, 9911 threads
2026/08/30 16:11:45
Load Avg: 3.83, 6.77, 9.24
CPU usage: 10.8% user, 11.9% sys, 78.81% idle
PhysMem: 47G used (6985M wired, 16G compressor), 139M unused.

PID    %CPU POWER MEM
376    39.0 40.0  1402M-
0      35.6 0.0   121M-
24076  30.0 30.0  1250M+
7681   15.4 15.7  446M
329    0.0  0.0   2080K
`;

describe('parseTopSample', () => {
  it('reads the LAST block, because the first counts since boot', () => {
    const sample = parseTopSample(TWO_BLOCKS);
    assert.ok(sample !== null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
    assert.equal(sample.cpuByPid.get(24076), 30.0);
    assert.equal(sample.cpuByPid.size, 5);
    // The first block's 88.1 for pid 376 is discarded.
    assert.notEqual(sample.cpuByPid.get(376), 88.1);
  });

  it('reads the power column when the header names it', () => {
    const sample = parseTopSample(TWO_BLOCKS);
    assert.ok(sample !== null && sample.powerByPid !== null);
    assert.equal(sample.powerByPid.get(376), 40.0);
    assert.equal(sample.powerByPid.get(7681), 15.7);
  });

  it('reads MEM as physical footprint bytes, delta marks stripped', () => {
    const sample = parseTopSample(TWO_BLOCKS);
    assert.ok(sample !== null && sample.memBytesByPid !== null);
    assert.equal(sample.memBytesByPid.get(376), 1402 * 1024 * 1024);
    assert.equal(sample.memBytesByPid.get(24076), 1250 * 1024 * 1024);
    assert.equal(sample.memBytesByPid.get(7681), 446 * 1024 * 1024);
    assert.equal(sample.memBytesByPid.get(329), 2080 * 1024);
  });

  it('answers null power, never zero, when the column is absent', () => {
    const noPower = 'PID    %CPU MEM\n376    39.0 10M\n100    1.2  2048K\n';
    const sample = parseTopSample(noPower);
    assert.ok(sample !== null);
    assert.equal(sample.powerByPid, null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
    assert.equal(sample.cpuByPid.get(100), 1.2);
    assert.ok(sample.memBytesByPid !== null);
    assert.equal(sample.memBytesByPid.get(376), 10 * 1024 * 1024);
  });

  it('answers null mem, never zero, when the column is absent', () => {
    const noMem = 'PID    %CPU POWER\n376    39.0 40.0\n';
    const sample = parseTopSample(noMem);
    assert.ok(sample !== null);
    assert.equal(sample.memBytesByPid, null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
  });

  it('answers null for output with no sample block at all', () => {
    assert.equal(parseTopSample(''), null);
    assert.equal(parseTopSample('top: unknown argument\n'), null);
  });

  it('stops at the first line that is not a row', () => {
    const trailing =
      'PID    %CPU POWER MEM\n10  1.0 2.0 5M\nProcesses: 5 total\n99  9.0 9.0 5M\n';
    const sample = parseTopSample(trailing);
    assert.ok(sample !== null);
    assert.equal(sample.cpuByPid.size, 1);
    assert.equal(sample.cpuByPid.get(10), 1.0);
  });
});

describe('memTokenBytes', () => {
  it('reads every unit top prints, with and without the delta mark', () => {
    assert.equal(memTokenBytes('0B'), 0);
    assert.equal(memTokenBytes('2080K'), 2080 * 1024);
    assert.equal(memTokenBytes('1250M+'), 1250 * 1024 * 1024);
    assert.equal(memTokenBytes('1402M-'), 1402 * 1024 * 1024);
    assert.equal(memTokenBytes('9G'), 9 * 1024 * 1024 * 1024);
  });

  it('refuses a token that is not a size', () => {
    assert.equal(memTokenBytes(''), null);
    assert.equal(memTokenBytes('39.0'), null);
    assert.equal(memTokenBytes('M'), null);
    assert.equal(memTokenBytes('sleeping'), null);
  });
});

describe('topArgs', () => {
  it('asks for two samples, zero interval, and the four columns', () => {
    assert.deepEqual(topArgs(), [
      '-l',
      '2',
      '-s',
      '0',
      '-stats',
      'pid,cpu,power,mem'
    ]);
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
    assert.ok(sample.memBytesByPid !== null);
    assert.equal(sample.memBytesByPid.get(24076), 1250 * 1024 * 1024);
  });
});
