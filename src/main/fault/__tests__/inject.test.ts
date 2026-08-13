/**
 * The fault-injection channel. These tests never let a real SIGKILL happen:
 * `__resetFaultsForTests` takes the killer as an argument, and every case
 * passes one that records the call instead.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FAULT_POINTS,
  __resetFaultsForTests,
  faultCounts,
  faultPoint,
  parseFaultSpec
} from '../inject';

const scratch: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-fault-test-'));
  scratch.push(dir);
  return dir;
}

afterEach(() => {
  while (scratch.length > 0) {
    rmSync(scratch.pop() as string, { recursive: true, force: true });
  }
  // Leave the module disarmed for whatever runs next.
  __resetFaultsForTests({}, () => undefined);
});

function recorder(): { fired: string[]; kill: (p: string, n: number) => void } {
  const fired: string[] = [];
  return {
    fired,
    kill: (p, n) => fired.push(`${p}#${String(n)}`)
  };
}

describe('parseFaultSpec', () => {
  it('reads a bare point as the first arrival', () => {
    expect(parseFaultSpec('create.after-spawn')).toEqual({
      point: 'create.after-spawn',
      ordinal: 1
    });
  });

  it('reads an explicit ordinal', () => {
    expect(parseFaultSpec('snapshot.after-write#3')).toEqual({
      point: 'snapshot.after-write',
      ordinal: 3
    });
  });

  it('refuses anything it cannot use rather than arming something else', () => {
    expect(parseFaultSpec('')).toBeNull();
    expect(parseFaultSpec('   ')).toBeNull();
    expect(parseFaultSpec('#2')).toBeNull();
    expect(parseFaultSpec('point#0')).toBeNull();
    expect(parseFaultSpec('point#-1')).toBeNull();
    expect(parseFaultSpec('point#two')).toBeNull();
  });
});

describe('faultPoint', () => {
  it('does nothing at all when nothing is armed', () => {
    const rec = recorder();
    __resetFaultsForTests({}, rec.kill);
    faultPoint('create.after-spawn');
    faultPoint('create.after-spawn');
    expect(rec.fired).toEqual([]);
    expect(faultCounts()).toEqual({});
  });

  it('fires once, on the arrival that was asked for', () => {
    const rec = recorder();
    __resetFaultsForTests(
      { GMUX_SMOKE: 'fault-work', GMUX_FAULT: 'create.after-spawn#2' },
      rec.kill
    );
    faultPoint('create.after-spawn');
    expect(rec.fired).toEqual([]);
    faultPoint('create.after-spawn');
    expect(rec.fired).toEqual(['create.after-spawn#2']);
    faultPoint('create.after-spawn');
    expect(rec.fired).toEqual(['create.after-spawn#2']);
  });

  it('counts each point separately', () => {
    const rec = recorder();
    __resetFaultsForTests(
      { GMUX_SMOKE: 'fault-work', GMUX_FAULT: 'snapshot.after-write#2' },
      rec.kill
    );
    faultPoint('snapshot.before-write');
    faultPoint('snapshot.after-write');
    faultPoint('snapshot.before-write');
    expect(rec.fired).toEqual([]);
    faultPoint('snapshot.after-write');
    expect(rec.fired).toEqual(['snapshot.after-write#2']);
    expect(faultCounts()).toEqual({
      'snapshot.before-write': 2,
      'snapshot.after-write': 2
    });
  });

  it('ignores GMUX_FAULT when this is not a harness launch', () => {
    const rec = recorder();
    __resetFaultsForTests({ GMUX_FAULT: 'create.after-spawn' }, rec.kill);
    faultPoint('create.after-spawn');
    expect(rec.fired).toEqual([]);
  });

  it('writes one trace line per arrival, and traces without arming', () => {
    const rec = recorder();
    const path = join(tempDir(), 'trace.tsv');
    __resetFaultsForTests({ GMUX_FAULT_TRACE: path }, rec.kill);
    faultPoint('quit.before-snapshots');
    faultPoint('quit.after-snapshots');
    faultPoint('quit.before-snapshots');
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    expect(lines.map((l) => l.split('\t').slice(0, 2).join('#'))).toEqual([
      'quit.before-snapshots#1',
      'quit.after-snapshots#1',
      'quit.before-snapshots#2'
    ]);
    expect(rec.fired).toEqual([]);
  });

  it('survives a trace path it cannot write', () => {
    const rec = recorder();
    __resetFaultsForTests(
      { GMUX_FAULT_TRACE: '/nope/does/not/exist/trace.tsv' },
      rec.kill
    );
    expect(() => faultPoint('create.before-declaration')).not.toThrow();
  });
});

describe('the point list', () => {
  it('has no duplicates, because the names are the interface', () => {
    expect(new Set(FAULT_POINTS).size).toBe(FAULT_POINTS.length);
  });
});
