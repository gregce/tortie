/**
 * pickShellOpenPath (Phase 51) — every acceptance rule, without Electron.
 *
 * The cap is a set of mechanical rules and each one is pinned here: dash
 * entries are machinery and skipped silently, payload must be an absolute
 * path to an existing directory, the first accepted entry wins, and every
 * other payload entry is dropped with its reason named.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { pickShellOpenPath } from '../argv';

// Real folders and a real file: the function stats the disk, so the tests do too.
const root = mkdtempSync(join(tmpdir(), 'p51-argv-'));
const dirA = join(root, 'a');
const dirB = join(root, 'b');
const file = join(root, 'file.txt');
mkdirSync(dirA);
mkdirSync(dirB);
writeFileSync(file, '', 'utf8');

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('pickShellOpenPath', () => {
  it('returns null with nothing dropped for an empty argv', () => {
    expect(pickShellOpenPath([])).toEqual({ path: null, dropped: [] });
  });

  it('skips dash entries silently — they are switches, not payload', () => {
    const pick = pickShellOpenPath([
      '--user-data-dir=/tmp/x',
      '-ApplePersistenceIgnoreState',
      '-psn_0_12345'
    ]);
    expect(pick.path).toBeNull();
    expect(pick.dropped).toEqual([]);
  });

  it('accepts one absolute existing directory', () => {
    const pick = pickShellOpenPath([dirA]);
    expect(pick.path).toBe(dirA);
    expect(pick.dropped).toEqual([]);
  });

  it('accepts the folder even when switches surround it', () => {
    const pick = pickShellOpenPath(['--inspect', dirA, '--flag']);
    expect(pick.path).toBe(dirA);
    expect(pick.dropped).toEqual([]);
  });

  it('drops a relative path with (not an absolute path)', () => {
    const pick = pickShellOpenPath(['some/relative']);
    expect(pick.path).toBeNull();
    expect(pick.dropped).toEqual(['some/relative (not an absolute path)']);
  });

  it('drops a missing path with (does not exist)', () => {
    const missing = join(root, 'nope');
    const pick = pickShellOpenPath([missing]);
    expect(pick.path).toBeNull();
    expect(pick.dropped).toEqual([`${missing} (does not exist)`]);
  });

  it('drops a file with (not a folder) — folders only, by the cap', () => {
    const pick = pickShellOpenPath([file]);
    expect(pick.path).toBeNull();
    expect(pick.dropped).toEqual([`${file} (not a folder)`]);
  });

  it('keeps the first folder and drops the second with (a second folder)', () => {
    const pick = pickShellOpenPath([dirA, dirB]);
    expect(pick.path).toBe(dirA);
    expect(pick.dropped).toEqual([`${dirB} (a second folder)`]);
  });

  it('collects every dropped reason while still accepting the one folder', () => {
    const missing = join(root, 'gone');
    const pick = pickShellOpenPath(['rel', missing, file, dirA, dirB, '--x']);
    expect(pick.path).toBe(dirA);
    expect(pick.dropped).toEqual([
      'rel (not an absolute path)',
      `${missing} (does not exist)`,
      `${file} (not a folder)`,
      `${dirB} (a second folder)`
    ]);
  });

  it('ignores empty strings', () => {
    expect(pickShellOpenPath(['', dirA]).path).toBe(dirA);
  });

  it('never interprets a dash entry as payload, even a bare dash', () => {
    const pick = pickShellOpenPath(['-']);
    expect(pick.path).toBeNull();
    expect(pick.dropped).toEqual([]);
  });
});
