/**
 * Phase 375, the boot brings a standing script up to this build (build/p375/
 * SPEC.md §7.1 row B6, D14): with the switch on, a Phase 374 script on disk is
 * rewritten by a temporary name and a rename, KEEPING ITS SALT, so a session
 * already running reports the address at its next run. Equal bytes are not
 * written, a link or a folder at that name is left alone, and off clears as the
 * parent does.
 *
 * HERMETIC. One temporary userData; nothing under a home.
 */

import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const world = vi.hoisted(() => ({ userData: '', on: true as unknown }));
vi.mock('electron', () => ({ app: { getPath: () => world.userData } }));
vi.mock('../../../settings/store', () => ({ getSettings: () => ({ usage: { antigravity: world.on } }) }));
vi.mock('../../../log', () => {
  const no = (): undefined => undefined;
  return { getLog: () => ({ info: no, warn: no, error: no, debug: no }) };
});

const { antigravityUsageDir, bootAntigravityUsage, resetAntigravityFolderForTests } = await import('../folder');
const { antigravityStatusScript, saltOf } = await import('../script');

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p375-folder-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const A = 'aaaaaaaa-1111-4111-8111-111111111111';
const SALT = 'fedcba9876543210fedcba9876543210';
let n = 0;
let dir = '';

beforeEach(() => {
  n += 1;
  world.userData = join(root, `user data ${String(n)}`);
  world.on = true;
  mkdirSync(join(world.userData, 'gmux'), { recursive: true });
  resetAntigravityFolderForTests();
  dir = antigravityUsageDir();
  mkdirSync(dir, { mode: 0o700 });
});

/** Phase 374's script, being this build's with the three edits of SPEC §4.1 taken back out. */
function phase374(salt: string): string {
  const text = antigravityStatusScript({ dir, salt })
    .replace(' tt_c tt_q\n', '\n')
    .replace('tt_q=\ntt_c=0\n', '')
    .replace(
      "  case $tt_l in\n  '') ;;\n  *)\n    tt_c=$((tt_c+${#tt_l}))\n    [ $tt_c -le 16384 ] || exit 0\n    tt_p=$tt_p$tt_q$tt_l\n    case $tt_l in *'\"'*) tt_q='\n' ;; *) tt_q= ;; esac\n    ;;\n  esac\n  tt_l=\n",
      '  tt_p=$tt_p$tt_l\n  tt_l=\n  [ ${#tt_p} -le 16384 ] || exit 0\n'
    )
    .replace("case $tt_p in *'\"quota\"'* | *'\n'*) ;;", "case $tt_p in *'\"quota\"'*) ;;")
    .replace('"\\"e\\":" e ",\\"p\\":"', '"\\"p\\":"');
  return text;
}

const script = (): string => join(dir, 'status.sh');

describe('B6: the boot rewrites a script that stands, keeping its salt', () => {
  it('B6: a Phase 374 script with the switch on becomes this build’s, salt kept, 0700, by a rename', () => {
    const old = phase374(SALT);
    expect(old).not.toBe(antigravityStatusScript({ dir, salt: SALT }));
    expect(old).not.toContain('tt_c');
    expect(old).not.toContain('tt_q');
    expect(old).toContain('  tt_p=$tt_p$tt_l\n  tt_l=\n  [ ${#tt_p} -le 16384 ] || exit 0\n');
    writeFileSync(script(), old, { mode: 0o700 });
    chmodSync(script(), 0o700);
    const ino = statSync(script()).ino;
    bootAntigravityUsage(() => [A]);
    const now = readFileSync(script(), 'utf8');
    expect(now).toBe(antigravityStatusScript({ dir, salt: SALT }));
    expect(saltOf(now)).toBe(SALT);
    expect(lstatSync(script()).mode & 0o777).toBe(0o700);
    expect(statSync(script()).ino).not.toBe(ino);
    expect(readdirSync(dir)).toEqual(['status.sh']);
  });

  it('B6: a script whose mode moved is put back to 0700, salt kept', () => {
    writeFileSync(script(), antigravityStatusScript({ dir, salt: SALT }));
    chmodSync(script(), 0o644);
    bootAntigravityUsage(() => [A]);
    expect(lstatSync(script()).mode & 0o777).toBe(0o700);
    expect(saltOf(readFileSync(script(), 'utf8'))).toBe(SALT);
  });

  it('B6: equal bytes at 0700 are not written at all', () => {
    writeFileSync(script(), antigravityStatusScript({ dir, salt: SALT }));
    chmodSync(script(), 0o700);
    const before = statSync(script(), { bigint: true });
    bootAntigravityUsage(() => [A]);
    const after = statSync(script(), { bigint: true });
    expect([after.ino, after.mtimeNs]).toEqual([before.ino, before.mtimeNs]);
  });

  it('B6: nothing at that name, a link or a folder is left as it is, and nothing is made', () => {
    bootAntigravityUsage(() => [A]);
    expect(readdirSync(dir)).toEqual([]);
    const elsewhere = join(world.userData, 'elsewhere.sh');
    writeFileSync(elsewhere, phase374(SALT));
    symlinkSync(elsewhere, script());
    resetAntigravityFolderForTests();
    bootAntigravityUsage(() => [A]);
    expect(lstatSync(script()).isSymbolicLink()).toBe(true);
    expect(readFileSync(elsewhere, 'utf8')).toBe(phase374(SALT));
    rmSync(script());
    mkdirSync(script());
    resetAntigravityFolderForTests();
    bootAntigravityUsage(() => [A]);
    expect(lstatSync(script()).isDirectory()).toBe(true);
  });

  it('B6: with the switch off the boot clears, as the parent does, and writes no script', () => {
    writeFileSync(script(), phase374(SALT), { mode: 0o700 });
    writeFileSync(join(dir, `${A}.json`), '{}\n', { mode: 0o600 });
    world.on = false;
    bootAntigravityUsage(() => [A]);
    expect(existsSync(dir)).toBe(false);
  });
});
