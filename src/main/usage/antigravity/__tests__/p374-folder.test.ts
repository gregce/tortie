/**
 * Phase 374, the Antigravity usage folder (build/p374/SPEC.md §7.1 row F1, D16,
 * D17, D25, D26): what may be written there, what is read back, and exactly
 * which names go when a session is removed, at the boot sweep and when the
 * switch is off. A stranger's file and the folder holding it stay, and a link
 * standing where the folder should be is never followed.
 *
 * HERMETIC. One temporary userData; nothing under a home.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const world = vi.hoisted(() => ({ userData: '', on: true as unknown, lines: [] as Array<[string, unknown]> }));
vi.mock('electron', () => ({ app: { getPath: () => world.userData } }));
vi.mock('../../../settings/store', () => ({ getSettings: () => ({ usage: { antigravity: world.on } }) }));
vi.mock('../../../log', () => ({
  getLog: () => ({
    info: (event: string, fields?: unknown) => world.lines.push([event, fields]),
    warn: (event: string, fields?: unknown) => world.lines.push([event, fields]),
    error: () => undefined,
    debug: () => undefined
  })
}));

const {
  antigravityFolderMtime,
  antigravityMeterOn,
  antigravityUsageDir,
  bootAntigravityUsage,
  clearAntigravityUsage,
  forgetAntigravitySession,
  listAntigravityFiles,
  openAntigravitySlot,
  readAntigravityGuard,
  resetAntigravityFolderForTests,
  writeAntigravityGuard
} = await import('../folder');
const { saltOf } = await import('../script');

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-folder-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const A = 'aaaaaaaa-1111-4111-8111-111111111111';
const B = 'bbbbbbbb-2222-4222-8222-222222222222';
const C = 'cccccccc-3333-4333-8333-333333333333';
let n = 0;
let dir = '';

beforeEach(() => {
  n += 1;
  world.userData = join(root, `user data ${String(n)}`);
  world.on = true;
  world.lines = [];
  mkdirSync(join(world.userData, 'gmux'), { recursive: true });
  resetAntigravityFolderForTests();
  dir = antigravityUsageDir();
});

const names = (): string[] => readdirSync(dir).sort();

describe('the place main makes for one session', () => {
  it('is a private folder, a private script and one private file holding {}', () => {
    expect(openAntigravitySlot(A)).toBe(join(dir, 'status.sh'));
    expect(dir).toBe(join(world.userData, 'gmux', 'antigravity-usage'));
    expect(names()).toEqual([`${A}.json`, 'status.sh']);
    expect(lstatSync(dir).mode & 0o777).toBe(0o700);
    expect(lstatSync(join(dir, 'status.sh')).mode & 0o777).toBe(0o700);
    expect(lstatSync(join(dir, `${A}.json`)).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(dir, `${A}.json`), 'utf8')).toBe('{}\n');
  });

  it('keeps the salt when the script is regenerated, and rewrites it only when its bytes or mode differ', () => {
    openAntigravitySlot(A);
    const script = join(dir, 'status.sh');
    const text = readFileSync(script, 'utf8');
    const salt = saltOf(text);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    const ino = statSync(script).ino;
    openAntigravitySlot(B);
    expect(statSync(script).ino).toBe(ino);
    writeFileSync(script, `${text}# edited\n`);
    openAntigravitySlot(C);
    expect(readFileSync(script, 'utf8')).toBe(text);
    chmodSync(script, 0o644);
    openAntigravitySlot('dddddddd-4444-4444-8444-444444444444');
    expect(lstatSync(script).mode & 0o777).toBe(0o700);
    expect(saltOf(readFileSync(script, 'utf8'))).toBe(salt);
  });

  it('two folders never share a salt', () => {
    openAntigravitySlot(A);
    const one = saltOf(readFileSync(join(dir, 'status.sh'), 'utf8'));
    clearAntigravityUsage();
    openAntigravitySlot(A);
    expect(saltOf(readFileSync(join(dir, 'status.sh'), 'utf8'))).not.toBe(one);
  });

  it('answers null, and writes nothing, for an id that is not one, a file already there, a file or a link in the way, and a folder it may not write', () => {
    for (const id of ['', 'x', '../x', `${A}/../..`, A.toUpperCase()]) expect(openAntigravitySlot(id)).toBeNull();
    expect(existsSync(dir)).toBe(false);
    expect(openAntigravitySlot(A)).not.toBeNull();
    expect(openAntigravitySlot(A)).toBeNull();
    rmSync(dir, { recursive: true });
    writeFileSync(dir, 'a file\n');
    expect(openAntigravitySlot(A)).toBeNull();
    rmSync(dir);
    const elsewhere = join(world.userData, 'elsewhere');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, dir);
    expect(openAntigravitySlot(A)).toBeNull();
    expect(readdirSync(elsewhere)).toEqual([]);
    rmSync(dir);
    chmodSync(join(world.userData, 'gmux'), 0o500);
    try {
      expect(openAntigravitySlot(A)).toBeNull();
    } finally {
      chmodSync(join(world.userData, 'gmux'), 0o700);
    }
  });

  it('never writes through a link planted at its temporary name', () => {
    mkdirSync(dir, { mode: 0o700 });
    const victim = join(world.userData, 'victim');
    writeFileSync(victim, 'mine\n');
    symlinkSync(victim, join(dir, `status.sh.${String(process.pid)}.tmp`));
    expect(openAntigravitySlot(A)).not.toBeNull();
    expect(readFileSync(victim, 'utf8')).toBe('mine\n');
  });
});

describe('reading it back', () => {
  it('lists nothing before boot says which ids are known', () => {
    openAntigravitySlot(A);
    expect(listAntigravityFiles()).toEqual([]);
  });

  it('answers known ids alone, each with its text and time, and counts an unknown one in one line', () => {
    for (const id of [A, B, C]) openAntigravitySlot(id);
    writeFileSync(join(dir, `${A}.json`), 'one\n');
    utimesSync(join(dir, `${A}.json`), 1000, 1000);
    bootAntigravityUsage(() => [A, B, C]);
    const known = new Set([A, B]);
    bootAntigravityUsage(() => known);
    openAntigravitySlot(C);
    const listed = listAntigravityFiles();
    expect(listed.map((f) => f.id).sort()).toEqual([A, B]);
    expect(listed.find((f) => f.id === A)).toEqual({ id: A, text: 'one\n', mtimeMs: 1_000_000 });
    listAntigravityFiles();
    expect(world.lines).toEqual([['usage.antigravity.unknown-session', { files: 1 }]]);
  });

  it('asks which ids are known again at every listing', () => {
    openAntigravitySlot(A);
    const known = new Set([A]);
    bootAntigravityUsage(() => known);
    expect(listAntigravityFiles()).toHaveLength(1);
    known.clear();
    expect(listAntigravityFiles()).toHaveLength(0);
  });

  it('a session list that cannot be read lists nothing and removes nothing', () => {
    openAntigravitySlot(A);
    bootAntigravityUsage(() => {
      throw new Error('stopped');
    });
    expect(listAntigravityFiles()).toEqual([]);
    expect(names()).toEqual([`${A}.json`, 'status.sh']);
  });

  it('reads only small regular files: not a link, a folder, a large one or a name of another shape', () => {
    for (const id of [A, B, C]) openAntigravitySlot(id);
    const outside = join(world.userData, 'outside');
    writeFileSync(outside, 'outside\n');
    rmSync(join(dir, `${A}.json`));
    symlinkSync(outside, join(dir, `${A}.json`));
    rmSync(join(dir, `${B}.json`));
    mkdirSync(join(dir, `${B}.json`));
    const pipe = 'dddddddd-4444-4444-8444-444444444444';
    expect(spawnSync('/usr/bin/mkfifo', [join(dir, `${pipe}.json`)]).status).toBe(0);
    writeFileSync(join(dir, `${C}.json`), 'x'.repeat(4097));
    writeFileSync(join(dir, 'guard.json'), '{}\n');
    writeFileSync(join(dir, 'other.json'), '{}\n');
    bootAntigravityUsage(() => [A, B, C, pipe]);
    expect(listAntigravityFiles()).toEqual([]);
    writeFileSync(join(dir, `${C}.json`), 'x'.repeat(4096));
    expect(listAntigravityFiles().map((f) => f.id)).toEqual([C]);
  });

  it('answers when the folder moved, and null when there is none or it is a link', () => {
    expect(antigravityFolderMtime()).toBeNull();
    openAntigravitySlot(A);
    expect(antigravityFolderMtime()).toBe(lstatSync(dir).mtimeMs);
    rmSync(dir, { recursive: true });
    symlinkSync(world.userData, dir);
    expect(antigravityFolderMtime()).toBeNull();
    bootAntigravityUsage(() => [A]);
    expect(listAntigravityFiles()).toEqual([]);
  });
});

describe('F1: exactly the named files go', () => {
  /** Every shape that can stand in the folder, and a stranger's. */
  function plant(): void {
    for (const id of [A, B, C]) openAntigravitySlot(id);
    for (const name of [
      `${A}.json.41.tmp`,
      `${B}.json.42.tmp`,
      'status.sh.43.tmp',
      'guard.json.44.tmp',
      'guard.json',
      // Not this file's to remove, whatever it looks like.
      'notes.txt',
      'notes.tmp',
      `${A}.json.bak`,
      `${A}.json.x.tmp`,
      'x.json',
      'status.sh.old'
    ]) {
      writeFileSync(join(dir, name), 'x\n');
    }
    mkdirSync(join(dir, 'mine'));
    writeFileSync(join(dir, 'mine', `${A}.json`), 'x\n');
  }
  const STRANGERS = ['mine', 'notes.txt', 'notes.tmp', `${A}.json.bak`, `${A}.json.x.tmp`, 'x.json', 'status.sh.old'];

  it('the boot sweep takes the unknown ids and every write that was never renamed', () => {
    plant();
    bootAntigravityUsage(() => [A]);
    expect(names()).toEqual([...STRANGERS, `${A}.json`, 'guard.json', 'status.sh'].sort());
  });

  it('a removed session takes its own file and its own unrenamed writes, and no other', () => {
    plant();
    forgetAntigravitySession(A);
    expect(names()).toEqual(
      [...STRANGERS, `${B}.json`, `${C}.json`, `${B}.json.42.tmp`, 'status.sh.43.tmp', 'guard.json.44.tmp', 'guard.json', 'status.sh'].sort()
    );
    const outside = join(world.userData, 'gmux', 'x.json');
    writeFileSync(outside, 'mine\n');
    for (const id of ['', '../x', '.', A.slice(0, 8)]) forgetAntigravitySession(id);
    expect(existsSync(outside)).toBe(true);
    expect(names()).toHaveLength(STRANGERS.length + 7);
  });

  it('off removes every name that is this folder’s own, and leaves a folder that holds anything else', () => {
    plant();
    clearAntigravityUsage();
    expect(names()).toEqual([...STRANGERS].sort());
    expect(existsSync(join(dir, 'mine', `${A}.json`))).toBe(true);
  });

  it('off removes the folder itself when nothing else is in it, at boot too', () => {
    openAntigravitySlot(A);
    clearAntigravityUsage();
    expect(existsSync(dir)).toBe(false);
    openAntigravitySlot(A);
    writeAntigravityGuard({ real: '/x', dev: 1, ino: 2, size: 3, mtimeMs: 4, ctimeMs: 5 });
    world.on = false;
    bootAntigravityUsage(() => [A]);
    expect(existsSync(dir)).toBe(false);
  });

  it('off with no folder makes none', () => {
    world.on = false;
    bootAntigravityUsage(() => [A]);
    clearAntigravityUsage();
    expect(readdirSync(join(world.userData, 'gmux'))).toEqual([]);
  });

  it('nothing is removed through a link standing where the folder should be', () => {
    const elsewhere = join(world.userData, 'elsewhere');
    mkdirSync(elsewhere);
    for (const name of ['status.sh', `${A}.json`, 'guard.json', `${A}.json.1.tmp`]) writeFileSync(join(elsewhere, name), 'x\n');
    symlinkSync(elsewhere, dir);
    bootAntigravityUsage(() => []);
    forgetAntigravitySession(A);
    clearAntigravityUsage();
    world.on = false;
    bootAntigravityUsage(() => []);
    expect(readdirSync(elsewhere)).toHaveLength(4);
    expect(existsSync(dir)).toBe(true);
  });

  it('a name that is a folder is left alone', () => {
    openAntigravitySlot(A);
    mkdirSync(join(dir, `${B}.json`));
    writeFileSync(join(dir, `${B}.json`, 'in it'), 'x\n');
    bootAntigravityUsage(() => [A]);
    clearAntigravityUsage();
    expect(names()).toEqual([`${B}.json`]);
  });
});

describe('the switch and the guard file', () => {
  it('is on only for the literal true', () => {
    for (const value of [false, undefined, null, 'true', 1, {}]) {
      world.on = value;
      expect(antigravityMeterOn()).toBe(false);
    }
    world.on = true;
    expect(antigravityMeterOn()).toBe(true);
  });

  it('the guard keeps the six fields of one file, private, and answers null for anything else', () => {
    const identity = { real: '/opt/agy', dev: 1, ino: 2, size: 3, mtimeMs: 4.5, ctimeMs: 5.5 };
    expect(writeAntigravityGuard(identity)).toBe(false);
    openAntigravitySlot(A);
    expect(writeAntigravityGuard(identity)).toBe(true);
    expect(readAntigravityGuard()).toEqual(identity);
    expect(lstatSync(join(dir, 'guard.json')).mode & 0o777).toBe(0o600);
    for (const text of ['', '{', '[]', 'null', '{"real":1,"dev":1,"ino":2,"size":3,"mtimeMs":4,"ctimeMs":5}', '{"real":"/x","dev":1}', '{"real":"/x","dev":"1","ino":2,"size":3,"mtimeMs":4,"ctimeMs":5}']) {
      writeFileSync(join(dir, 'guard.json'), text);
      expect([text, readAntigravityGuard()]).toEqual([text, null]);
    }
  });
});
