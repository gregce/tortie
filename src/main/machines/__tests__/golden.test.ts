/**
 * The captured bytes, read back (Phase 69, M2, research 51 section 7).
 *
 * `./golden/` holds one file per class that a real program actually printed,
 * captured by `build/capture-machine-goldens.mjs` against a scratch sshd on
 * 127.0.0.1. This test reads those files and asserts the classifier gives each one
 * the class the manifest recorded.
 *
 * **IT RUNS NOTHING.** No ssh, no tmux, no server, no request. That is the whole
 * point of splitting the capture from the check: the capture is expensive and
 * needs a real far side, and the check has to be cheap enough to run on every
 * commit.
 *
 * WHAT IT CANNOT PROVE. One ssh client was measured, being the version the
 * manifest records. A different client may print different words, and the answer to
 * that is to re-run the capture rather than to widen the matcher on a guess.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MachineTestClass } from '@shared/ipc';
import { classifyMachineOutput, MACHINE_OUTCOME_CLASSES } from '../errors';
// The SAME decision the product makes. Two of the eight captured classes, `ok` and
// `no-program`, are decided from the markers plus the exit code rather than from
// the phrase table, so asking the phrase table about them would check a function
// that is not the one deciding.
import { classifyProbeOutput } from '../connection-test';

const dir = join(__dirname, 'golden');

interface Manifest {
  capturedAt: string;
  sshClient: string;
  remoteTmux: string;
  carriageStarted: boolean;
  captures: {
    class: string;
    file: string;
    note: string;
    exitCode: number;
    bytes: number;
  }[];
  noGolden: { class: string; reason: string }[];
}

const manifest = JSON.parse(
  readFileSync(join(dir, 'manifest.json'), 'utf8')
) as Manifest;

const files = readdirSync(dir)
  .filter((name) => name.endsWith('.txt'))
  .sort();

describe('the capture itself', () => {
  it('records which client and which remote version printed the text', () => {
    expect(manifest.sshClient).toMatch(/OpenSSH/);
    expect(manifest.remoteTmux).toMatch(/tmux \d/);
    expect(manifest.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('was made against a far side that really answered', () => {
    // A run whose sshd never started would produce files that say nothing about
    // ssh, and the manifest carries that fact so a pass here cannot hide it.
    expect(manifest.carriageStarted).toBe(true);
  });

  it('has a file on disk for every row, and a row for every file', () => {
    expect(manifest.captures.map((row) => row.file).sort()).toEqual(files);
  });

  it('captured bytes rather than empty files', () => {
    for (const row of manifest.captures) {
      expect(row.bytes).toBeGreaterThan(20);
    }
  });
});

describe('every captured file classifies to the class it was captured for', () => {
  for (const row of manifest.captures) {
    it(`${row.class}: ${row.note}`, () => {
      const text = readFileSync(join(dir, row.file), 'utf8');
      expect(classifyProbeOutput(text, row.exitCode)).toBe(
        row.class as MachineTestClass
      );
    });
  }
});

describe('what has no golden, and why', () => {
  it('gives a reason for each one, in words', () => {
    for (const row of manifest.noGolden) {
      expect(row.reason.length).toBeGreaterThan(20);
    }
  });

  it('has no file for any of them', () => {
    // Tortie writes these sentences itself, so a file for one would look like a
    // measurement while being a fixture somebody typed.
    for (const row of manifest.noGolden) {
      expect(files).not.toContain(`${row.class}.txt`);
    }
  });

  it('accounts for every class in the taxonomy, one way or the other', () => {
    const covered = [
      ...manifest.captures.map((row) => row.class),
      ...manifest.noGolden.map((row) => row.class)
    ].sort();
    expect(covered).toEqual([...MACHINE_OUTCOME_CLASSES].sort());
  });
});

describe('the two answers that must never be shared', () => {
  it('keeps a changed identity alarming and a dead machine calm', () => {
    const changed = readFileSync(join(dir, 'host-key-changed.txt'), 'utf8');
    const dead = readFileSync(join(dir, 'unreachable.txt'), 'utf8');
    expect(classifyMachineOutput(changed)).toBe('host-key-changed');
    expect(classifyMachineOutput(dead)).toBe('unreachable');
    // The alarm may never be shared with an ordinary failure, so the two are
    // asserted against each other rather than only each on its own.
    expect(classifyMachineOutput(changed)).not.toBe(classifyMachineOutput(dead));
  });

  it('keeps a machine with no server apart from one that refused', () => {
    const noServer = readFileSync(join(dir, 'no-server.txt'), 'utf8');
    const refused = readFileSync(join(dir, 'refused.txt'), 'utf8');
    expect(classifyMachineOutput(noServer)).toBe('no-server');
    expect(classifyMachineOutput(refused)).toBe('refused');
  });
});
