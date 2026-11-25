/**
 * Phase 374, the launch decision and the launch guard (build/p374/SPEC.md §7.1
 * rows L4's decision half, L5 and L7; D6, D9, D11, D20).
 *
 * The folder and the settings file are real, in a temporary userData and a
 * temporary home; the reading of the program is handed in, as the create hands
 * it. Nothing starts.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProbedVersion } from '../../../agents/detection';

const world = vi.hoisted(() => ({ userData: '', usage: { antigravity: true } as unknown, lines: [] as Array<[string, unknown]> }));
vi.mock('electron', () => ({ app: { getPath: () => world.userData, isPackaged: false, getAppPath: () => process.cwd(), getVersion: () => '0.0.0' } }));
vi.mock('../../../settings/store', () => ({
  getSettings: () => {
    if (world.usage === 'throws') throw new Error('no settings');
    return { usage: world.usage };
  }
}));
vi.mock('../../../log', () => ({
  getLog: () => ({
    info: () => undefined,
    warn: (event: string, fields?: unknown) => world.lines.push([event, fields]),
    error: () => undefined,
    debug: () => undefined
  })
}));

const { AGY_SETTINGS_FLOOR, antigravityMeterArgs, antigravityWaiting, clearAntigravityGuard, noteAntigravityDeath, resetAntigravityLaunchForTests } = await import('../launch');
const { antigravityUsageDir, clearAntigravityUsage } = await import('../folder');
const { antigravitySettingsJson } = await import('../script');

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-launch-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let n = 0;
let home = '';
const id = (k: number): string => `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`;
let k = 0;

const IDENTITY = { real: '/opt/x/agy', dev: 1, ino: 2, size: 3, mtimeMs: 4, ctimeMs: 5 };
const READ: ProbedVersion = { version: '1.5.16', real: '/opt/x/agy', identity: IDENTITY, native: true, copies: [] };

beforeEach(() => {
  n += 1;
  world.userData = join(root, `data ${String(n)}`);
  world.usage = { antigravity: true };
  world.lines = [];
  mkdirSync(join(world.userData, 'gmux'), { recursive: true });
  home = join(root, `home ${String(n)}`);
  mkdirSync(home);
  resetAntigravityLaunchForTests();
});
afterEach(() => {
  vi.useRealTimers();
});

interface Over {
  probed?: ProbedVersion | null;
  argv?: string[];
  captured?: boolean;
}
function ask(over: Over = {}): { args: readonly string[]; sid: string } {
  k += 1;
  const sid = id(k);
  const args = antigravityMeterArgs({
    sessionId: sid,
    probed: over.probed === undefined ? READ : over.probed,
    argv: over.argv ?? ['agy'],
    captured: over.captured ?? false,
    home
  });
  return { args, sid };
}
const spliced = (over?: Over): boolean => ask(over).args.length > 0;

describe('the two tokens', () => {
  it('are --settings and the one JSON naming the script, and the place is made', () => {
    expect(antigravityWaiting()).toBe('session');
    const { args, sid } = ask();
    const script = join(antigravityUsageDir(), 'status.sh');
    expect(args).toEqual(['--settings', antigravitySettingsJson(script)]);
    expect(readdirSync(antigravityUsageDir()).sort()).toEqual([`${sid}.json`, 'status.sh'].sort());
    expect(antigravityWaiting()).toBe('session');
  });

  it('off, unread settings or any value but true: none, and not one file is made or read', () => {
    for (const usage of [{ antigravity: false }, {}, { antigravity: 'true' }, undefined, 'throws']) {
      world.usage = usage;
      expect(ask().args).toEqual([]);
    }
    expect(existsSync(antigravityUsageDir())).toBe(false);
    expect(antigravityWaiting()).toBe('session');
  });

  it('a captured session: none, and the row says why', () => {
    expect(spliced({ captured: true })).toBe(false);
    expect(antigravityWaiting()).toBe('captured');
    expect(existsSync(antigravityUsageDir())).toBe(false);
  });
});

describe('L4: the floor, on the decision’s side', () => {
  it('is 1.4.10, read whole: at it or past it, and nothing else', () => {
    expect(AGY_SETTINGS_FLOOR).toBe('1.4.10');
    for (const version of ['1.4.10', '1.4.11', '1.5.0', '1.5.16', '2.0.0', '10.0.0', '1.10.0', '1.4.11-rc.1']) {
      expect([version, spliced({ probed: { ...READ, version } })]).toEqual([version, true]);
    }
    for (const version of ['1.4.9', '1.4.2', '1.3.99', '0.9.9', '1.4.10-rc.1', '1.4', '', 'agy 1.5.16', '1.5.16 (x)', 'v1.5.16', '1.5.16\n', 'unknown']) {
      expect([version, spliced({ probed: { ...READ, version } })]).toEqual([version, false]);
      expect(antigravityWaiting()).toBe('version');
    }
  });

  it('a script, and a program whose real file is not agy, carry none', () => {
    expect(spliced({ probed: { ...READ, native: false } })).toBe(false);
    for (const real of ['/opt/mise', '/opt/x/agy.sh', '/opt/agy/volta-shim', '/opt/x/AGY', '/opt/x/agy2']) {
      expect([real, spliced({ probed: { ...READ, real, identity: { ...IDENTITY, real } } })]).toEqual([real, false]);
    }
    expect(antigravityWaiting()).toBe('version');
  });

  it('a plain create, which the person’s shell starts, needs every other agy at the floor; a path and an argv with flags do not', () => {
    for (const copies of [['1.4.9'], [null], ['1.5.16', '1.3.0'], ['unknown']] as Array<Array<string | null>>) {
      expect([copies, spliced({ probed: { ...READ, copies } })]).toEqual([copies, false]);
      expect(antigravityWaiting()).toBe('version');
      expect([copies, spliced({ probed: { ...READ, copies }, argv: ['/opt/x/agy'] })]).toEqual([copies, true]);
      expect([copies, spliced({ probed: { ...READ, copies }, argv: ['agy', '-x'] })]).toEqual([copies, true]);
    }
    expect(spliced({ probed: { ...READ, copies: ['1.4.10', '2.0.0'] } })).toBe(true);
  });

  it('no reading of the file that runs: none, and the row goes on waiting for a session', () => {
    expect(spliced({ probed: null })).toBe(false);
    expect(antigravityWaiting()).toBe('session');
  });
});

describe('L5: the person’s own settings, in every spelling', () => {
  it('stands aside', () => {
    for (const argv of [
      ['agy', '--settings', 'x.json'],
      ['agy', '--settings=x.json'],
      ['agy', '-settings', 'x.json'],
      ['agy', '-settings=x.json'],
      ['agy', '--model', 'm', '--settings'],
      ['agy', '--gemini_dir', '/x'],
      ['agy', '--gemini-dir=/x'],
      ['agy', '-gemini_dir', '/x'],
      ['agy', '-gemini-dir']
    ]) {
      expect([argv, spliced({ argv })]).toEqual([argv, false]);
      expect(antigravityWaiting()).toBe('own-status-line');
    }
    for (const argv of [['agy', '--settings-like'], ['agy', 'settings'], ['agy', '--model', 'settings=1'], ['agy', '---settings'], ['agy', '--nosettings']]) {
      expect([argv, spliced({ argv })]).toEqual([argv, true]);
    }
  });

  it('and for his own status line in his settings file, read only once everything else said yes', () => {
    const file = join(home, '.gemini', 'antigravity-cli', 'settings.json');
    mkdirSync(join(home, '.gemini', 'antigravity-cli'), { recursive: true });
    writeFileSync(file, '{"statusLine":{"type":"command","command":"mine"}}');
    expect(spliced()).toBe(false);
    expect(antigravityWaiting()).toBe('own-status-line');
    expect(spliced({ probed: { ...READ, version: '1.4.9' } })).toBe(false);
    expect(antigravityWaiting()).toBe('version');
    writeFileSync(file, '{"statusLine":{"type":"command","command":"mine","enabled":false}}');
    expect(spliced()).toBe(true);
  });
});

describe('a folder that cannot be written', () => {
  it('costs the flag and never the session, says so once, and follows no link', () => {
    const elsewhere = join(world.userData, 'elsewhere');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, antigravityUsageDir());
    expect(spliced()).toBe(false);
    expect(spliced()).toBe(false);
    expect(antigravityWaiting()).toBe('unwritable');
    expect(readdirSync(elsewhere)).toEqual([]);
    expect(world.lines).toEqual([['usage.antigravity.unwritable', undefined]]);
  });

  it('an input that throws is no flag, and nothing is thrown', () => {
    const bad = { sessionId: id(1), argv: ['agy'], captured: false, home, get probed(): never { throw new Error('x'); } };
    expect(antigravityMeterArgs(bad as never)).toEqual([]);
  });
});

describe('L7: the launch guard', () => {
  /** One start with the flag, and its death `after` ms later. */
  function death(after: number, exitCode: number | undefined, signal?: string, over: Over = {}): void {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_900_000_000_000);
    const { args, sid } = ask(over);
    expect(args).toHaveLength(2);
    vi.setSystemTime(1_900_000_000_000 + after);
    noteAntigravityDeath(sid, exitCode, signal);
  }
  const guardFile = (): string => join(antigravityUsageDir(), 'guard.json');

  it('an exit 1 at 3 s holds that file, logs one line and says why', () => {
    death(3000, 1);
    expect(world.lines).toEqual([['usage.antigravity.start-failed', { exitCode: 1 }]]);
    expect(antigravityWaiting()).toBe('start-failed');
    expect(JSON.parse(readFileSync(guardFile(), 'utf8'))).toEqual(IDENTITY);
    expect(spliced()).toBe(false);
    expect(antigravityWaiting()).toBe('start-failed');
    expect(world.lines).toHaveLength(1);
  });

  it('1, 2, 126 and 127 hold it; 0, 128, 130, 137, no code, a signal and 11 s do not', () => {
    for (const code of [1, 2, 126, 127]) {
      resetAntigravityLaunchForTests();
      clearAntigravityUsage();
      death(9_999, code);
      expect([code, existsSync(guardFile())]).toEqual([code, true]);
    }
    for (const [after, code, signal] of [
      [3000, 0, undefined],
      [3000, 128, undefined],
      [3000, 130, undefined],
      [3000, 137, undefined],
      [3000, undefined, undefined],
      [3000, 1, 'SIGHUP'],
      [3000, undefined, 'SIGKILL'],
      [11_000, 1, undefined]
    ] as Array<[number, number | undefined, string | undefined]>) {
      resetAntigravityLaunchForTests();
      clearAntigravityUsage();
      death(after, code, signal);
      expect([after, code, signal, existsSync(guardFile()), spliced()]).toEqual([after, code, signal, false, true]);
    }
  });

  it('a session that never carried the flag, and a second death of one that did, hold nothing', () => {
    noteAntigravityDeath(id(9), 1, undefined);
    expect(spliced({ probed: { ...READ, version: '1.4.9' } })).toBe(false);
    noteAntigravityDeath(id(k), 1, undefined);
    expect(world.lines).toEqual([]);
    const { sid } = ask();
    noteAntigravityDeath(sid, 130, undefined);
    noteAntigravityDeath(sid, 1, undefined);
    expect(world.lines).toEqual([]);
    expect(spliced()).toBe(true);
  });

  it('survives a new process, and a changed file clears it there', () => {
    death(3000, 1);
    resetAntigravityLaunchForTests();
    expect(antigravityWaiting()).toBe('session');
    expect(spliced()).toBe(false);
    expect(antigravityWaiting()).toBe('start-failed');
    for (const change of [{ ino: 9 }, { dev: 9 }, { size: 9 }, { mtimeMs: 9 }, { ctimeMs: 9 }, { real: '/opt/y/agy' }]) {
      resetAntigravityLaunchForTests();
      clearAntigravityUsage();
      death(3000, 1);
      resetAntigravityLaunchForTests();
      const identity = { ...IDENTITY, ...change };
      expect([change, spliced({ probed: { ...READ, real: identity.real, identity } })]).toEqual([change, true]);
      expect(existsSync(guardFile())).toBe(false);
    }
  });

  it('turning the switch off forgets it, and on again tries again', () => {
    death(3000, 2, undefined, { argv: ['agy', '--mistyped'] });
    expect(spliced()).toBe(false);
    // What off does (../../ipc.ts): the folder, and what is held here.
    clearAntigravityUsage();
    clearAntigravityGuard();
    expect(antigravityWaiting()).toBe('session');
    expect(spliced()).toBe(true);
  });

  it('is held in this process even when the folder has gone', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { sid } = ask();
    clearAntigravityUsage();
    noteAntigravityDeath(sid, 1, undefined);
    expect(existsSync(guardFile())).toBe(false);
    expect(spliced()).toBe(false);
  });

  it('never throws', () => {
    expect(() => noteAntigravityDeath(undefined as never, 1, undefined)).not.toThrow();
  });
});
