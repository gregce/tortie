/**
 * Phase 31 unit tests for the bounded updater log.
 *
 * The subject is the rotation: over the cap, updates.log becomes
 * updates.log.1 and replaces any previous one, so the pair stays bounded no
 * matter how long the app runs.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// log.ts imports electron for logUpdateEvent; appendUpdateLogLine itself
// never touches it.
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/unused-in-these-tests',
    getVersion: () => '0.19.0',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

import { appendUpdateLogLine, UPDATE_LOG_MAX_BYTES } from '../log';

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-update-log-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const logPath = (): string => join(dir, 'updates.log');
const rotatedPath = (): string => join(dir, 'updates.log.1');

describe('appendUpdateLogLine', () => {
  it('creates the directory and writes one stamped line', () => {
    const nested = join(dir, 'logs');
    appendUpdateLogLine(nested, 'info', 'hello');
    const text = readFileSync(join(nested, 'updates.log'), 'utf8');
    expect(text).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO hello\n$/
    );
  });

  it('uppercases the level per line', () => {
    appendUpdateLogLine(dir, 'warn', 'careful');
    appendUpdateLogLine(dir, 'error', 'broken');
    const text = readFileSync(logPath(), 'utf8');
    expect(text).toContain('Z WARN careful\n');
    expect(text).toContain('Z ERROR broken\n');
  });

  it('rotates once over the cap and keeps the pair bounded', () => {
    const cap = 200;
    // Fill past the cap, then append: the full file must move aside whole.
    writeFileSync(logPath(), 'x'.repeat(cap + 1), 'utf8');
    appendUpdateLogLine(dir, 'info', 'first line after rotation', cap);
    expect(existsSync(rotatedPath())).toBe(true);
    expect(statSync(rotatedPath()).size).toBe(cap + 1);
    const fresh = readFileSync(logPath(), 'utf8');
    expect(fresh).toContain('first line after rotation');
    expect(fresh).not.toContain('xxx');

    // A second overflow REPLACES the previous rotation, so the pair is the
    // whole retention policy: each file is at most cap plus one line.
    writeFileSync(logPath(), 'y'.repeat(cap + 1), 'utf8');
    appendUpdateLogLine(dir, 'info', 'second rotation', cap);
    expect(readFileSync(rotatedPath(), 'utf8')).toBe('y'.repeat(cap + 1));
    expect(readFileSync(logPath(), 'utf8')).toContain('second rotation');
  });

  it('does not rotate at or under the cap', () => {
    const cap = 200;
    writeFileSync(logPath(), 'x'.repeat(cap), 'utf8');
    appendUpdateLogLine(dir, 'info', 'appended', cap);
    expect(existsSync(rotatedPath())).toBe(false);
    expect(readFileSync(logPath(), 'utf8')).toContain('appended');
  });

  it('ships with the 524288 byte cap the spec pins', () => {
    expect(UPDATE_LOG_MAX_BYTES).toBe(524288);
  });
});
