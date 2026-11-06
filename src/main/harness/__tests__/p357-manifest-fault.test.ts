/**
 * Phase 357 — the manifest fault seam: its three refusals over real folders,
 * its parser dropping a file whole, ONE real `SqliteError` per new sequence,
 * and `installManifestFault` as the one setter of the store's hook.
 *
 * The refusals are driven over directories made here, because the profile
 * check compares real paths and a folder that does not exist has none: the
 * `/var` and `/private/var` spellings of one folder must read as inside, and a
 * sibling whose name merely starts with the harness folder's must not.
 *
 * The thrown error is asked of the shipping classifier
 * (`isBrokenConnectionError`, src/main/db/integrity.ts), because the seam's
 * whole claim is that the store reads its error exactly as it reads real
 * damage. Nothing here opens a database.
 */

import Database from 'better-sqlite3';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** What `app.getPath('userData')` answers, set per test. */
let userData = '/nowhere/profile';
vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

/** Every hook handed to the store's setter, in order. */
const hooks: unknown[] = [];
vi.mock('../../manifest/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../manifest/store')>();
  return {
    ...real,
    setManifestFaultHook: (hook: unknown) => {
      hooks.push(hook);
    }
  };
});

const { MANIFEST_OPERATIONS } = await import('../../manifest/store');
const { isBrokenConnectionError } = await import('../../db/integrity');
const {
  MANIFEST_FAULT_CODES,
  MANIFEST_FAULT_POLL_MS,
  armedManifestFaults,
  installManifestFault,
  manifestFaultPath,
  parseManifestFaultFile,
  watchManifestFaultFile
} = await import('../manifest-fault');

type Operation = (typeof MANIFEST_OPERATIONS)[number];

/** The other spelling of a path under /private/var, or null when it has none. */
function otherSpelling(path: string): string | null {
  if (path.startsWith('/private/var/')) return path.slice('/private'.length);
  if (path.startsWith('/var/')) return `/private${path}`;
  return null;
}

describe('manifestFaultPath, the three refusals, over real folders', () => {
  let root = '';
  let harness = '';
  let profile = '';
  let decoy = '';
  const file = (): string => join(harness, 'fault.json');
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'p357-fault-')));
    harness = join(root, 'run');
    profile = join(harness, 'profile');
    decoy = join(`${harness}-elsewhere`, 'profile');
    mkdirSync(profile, { recursive: true });
    mkdirSync(decoy, { recursive: true });
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const env = (over: Record<string, string | undefined>): NodeJS.ProcessEnv => ({
    GMUX_HARNESS_MANIFEST_FAULT: file(),
    GMUX_HARNESS_DIR: harness,
    ...over
  });

  it('answers the path on an armed probe run and on both isolated launches', () => {
    expect(manifestFaultPath(env({ GMUX_PROBES: '1' }), profile)).toBe(file());
    expect(manifestFaultPath(env({ GMUX_SMOKE: 'basic' }), profile)).toBe(file());
    expect(manifestFaultPath(env({ GMUX_SHOT: join(root, 'x.png') }), profile)).toBe(file());
    // The profile being the harness folder itself is inside it.
    expect(manifestFaultPath(env({ GMUX_PROBES: '1' }), harness)).toBe(file());
  });

  it('refuses a launch with no harness term, and every probe value but 1', () => {
    expect(manifestFaultPath(env({}), profile)).toBeNull();
    for (const value of ['0', '', 'true', 'yes', ' 1', '1 ', '01']) {
      expect(manifestFaultPath(env({ GMUX_PROBES: value }), profile), `GMUX_PROBES=${JSON.stringify(value)}`).toBeNull();
    }
    // The widest predicate's other two terms are not enough on their own.
    expect(manifestFaultPath(env({ GMUX_UPDATE_REHEARSAL: '1' }), profile)).toBeNull();
  });

  it('refuses with no harness folder, and with no fault file named', () => {
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: undefined }), profile)).toBeNull();
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: '' }), profile)).toBeNull();
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_MANIFEST_FAULT: undefined }), profile)).toBeNull();
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_MANIFEST_FAULT: '' }), profile)).toBeNull();
  });

  it('refuses a profile outside the harness folder, a prefix sibling and a person’s profile among them', () => {
    expect(manifestFaultPath(env({ GMUX_PROBES: '1' }), decoy)).toBeNull();
    expect(manifestFaultPath(env({ GMUX_PROBES: '1' }), root)).toBeNull();
    expect(
      manifestFaultPath(env({ GMUX_SMOKE: 'basic' }), '/Users/somebody/Library/Application Support/Tortie')
    ).toBeNull();
  });

  it('reads /var and /private/var as one folder, by real path, both ways', () => {
    const alias = otherSpelling(harness);
    // On a machine whose temporary folder has no second spelling there is
    // nothing to compare; the symlink case below still holds the rule.
    if (alias !== null) {
      expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: alias }), profile)).toBe(file());
      expect(manifestFaultPath(env({ GMUX_PROBES: '1' }), join(alias, 'profile'))).toBe(file());
      const decoyAlias = otherSpelling(decoy);
      expect(decoyAlias).not.toBeNull();
      expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: alias }), decoyAlias ?? decoy)).toBeNull();
    }
    const link = join(root, 'link');
    symlinkSync(harness, link);
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: link }), profile)).toBe(file());
    expect(manifestFaultPath(env({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: link }), decoy)).toBeNull();
  });
});

describe('parseManifestFaultFile drops a file whole', () => {
  it('reads the documented shape, for both codes', () => {
    const read = parseManifestFaultFile(
      JSON.stringify({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } })
    );
    expect(read).toEqual({
      file: { seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } },
      reason: null
    });
    const notadb = parseManifestFaultFile('{"seq":0,"fail":{"code":"SQLITE_NOTADB","operation":"getSession"}}');
    expect(notadb.file?.fail).toEqual({ operation: 'getSession', code: 'SQLITE_NOTADB' });
  });

  it('takes every operation the store names but close', () => {
    expect(MANIFEST_OPERATIONS.length).toBe(48);
    for (const operation of MANIFEST_OPERATIONS) {
      const read = parseManifestFaultFile(JSON.stringify({ seq: 3, fail: { operation, code: 'SQLITE_CORRUPT' } }));
      if (operation === 'close') {
        expect(read.file).toBeNull();
        expect(read.reason).toContain('never asks the latch');
      } else {
        expect(read.file?.fail.operation, operation).toBe(operation);
      }
    }
  });

  it.each([
    ['not json', 'not JSON'],
    ['', 'not JSON'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}', 'not JSON'],
    ['[]', 'top level'],
    ['null', 'top level'],
    ['"listSessions"', 'top level'],
    ['7', 'top level'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"},"also":1}', '"also"'],
    ['{"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}}', 'seq'],
    ['{"seq":-1,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}}', 'seq'],
    ['{"seq":1.5,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}}', 'seq'],
    ['{"seq":"1","fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}}', 'seq'],
    ['{"seq":9007199254740992,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT"}}', 'seq'],
    ['{"seq":1}', 'fail is not an object'],
    ['{"seq":1,"fail":[]}', 'fail is not an object'],
    ['{"seq":1,"fail":null}', 'fail is not an object'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT","times":2}}', '"times"'],
    ['{"seq":1,"fail":{"code":"SQLITE_CORRUPT"}}', 'operation'],
    ['{"seq":1,"fail":{"operation":"stoppedReading","code":"SQLITE_CORRUPT"}}', 'operation'],
    ['{"seq":1,"fail":{"operation":"constructor","code":"SQLITE_CORRUPT"}}', 'operation'],
    ['{"seq":1,"fail":{"operation":"toString","code":"SQLITE_CORRUPT"}}', 'operation'],
    ['{"seq":1,"fail":{"operation":"listsessions","code":"SQLITE_CORRUPT"}}', 'operation'],
    ['{"seq":1,"fail":{"operation":"close","code":"SQLITE_CORRUPT"}}', 'close'],
    ['{"seq":1,"fail":{"operation":"listSessions"}}', 'code'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"SQLITE_IOERR_READ"}}', 'code'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"SQLITE_CORRUPT_INDEX"}}', 'code'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"sqlite_corrupt"}}', 'code'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"MANIFEST_STOPPED"}}', 'code'],
    ['{"seq":1,"fail":{"operation":"listSessions","code":"toString"}}', 'code']
  ])('refuses %j, naming %s', (text, named) => {
    const read = parseManifestFaultFile(text);
    expect(read.file).toBeNull();
    expect(read.reason).toContain(named);
  });

  it('never repeats the parser’s own message, which quotes its input', () => {
    const read = parseManifestFaultFile('{"secret value"');
    expect(read.reason).toBe('not JSON');
  });

  it('clips a hostile key it names', () => {
    const key = 'k'.repeat(5_000);
    const read = parseManifestFaultFile(JSON.stringify({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' }, [key]: 1 }));
    expect(read.file).toBeNull();
    expect((read.reason ?? '').length).toBeLessThan(120);
  });
});

describe('armedManifestFaults throws ONE real SqliteError per armed sequence', () => {
  const file = (seq: number, operation: Operation, code: 'SQLITE_CORRUPT' | 'SQLITE_NOTADB' = 'SQLITE_CORRUPT') => ({
    seq,
    fail: { operation, code }
  });

  it('does nothing with nothing armed, and nothing for another operation', () => {
    const said: string[] = [];
    const armed = armedManifestFaults((l) => said.push(l));
    expect(() => armed.fire('listSessions')).not.toThrow();
    armed.arm(file(1, 'listSessions'));
    expect(said).toEqual(['[gmux-harness] manifest fault armed: seq=1 listSessions SQLITE_CORRUPT']);
    expect(() => armed.fire('getSession')).not.toThrow();
    expect(armed.pending()).toHaveLength(1);
  });

  it('throws better-sqlite3’s own class with SQLite’s code and words, once', () => {
    const said: string[] = [];
    const armed = armedManifestFaults((l) => said.push(l));
    armed.arm(file(4, 'listSessions'));
    let thrown: unknown = null;
    try {
      armed.fire('listSessions');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Database.SqliteError);
    expect((thrown as { code: string }).code).toBe('SQLITE_CORRUPT');
    expect((thrown as Error).message).toBe('database disk image is malformed');
    expect((thrown as Error).name).toBe('SqliteError');
    // The shipping classifier reads it exactly as it reads real damage.
    expect(isBrokenConnectionError(thrown)).toBe(true);
    expect(said.at(-1)).toBe('[gmux-harness] manifest fault fired: seq=4 listSessions SQLITE_CORRUPT');
    // ONE throw: the next call goes on untouched.
    expect(() => armed.fire('listSessions')).not.toThrow();
    expect(armed.pending()).toHaveLength(0);
  });

  it('fires NOTADB with its own words, and two armed sequences as two throws, oldest first', () => {
    const armed = armedManifestFaults(() => undefined);
    armed.arm(file(1, 'getSession', 'SQLITE_NOTADB'));
    armed.arm(file(2, 'getSession'));
    const codes: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      try {
        armed.fire('getSession');
        codes.push('none');
      } catch (err) {
        expect(isBrokenConnectionError(err)).toBe(true);
        codes.push(`${(err as { code: string }).code}:${(err as Error).message}`);
      }
    }
    expect(codes).toEqual([
      `SQLITE_NOTADB:${MANIFEST_FAULT_CODES.SQLITE_NOTADB}`,
      `SQLITE_CORRUPT:${MANIFEST_FAULT_CODES.SQLITE_CORRUPT}`,
      'none'
    ]);
  });
});

describe('watchManifestFaultFile arms each new sequence once', () => {
  let dir = '';
  let stop: (() => void) | null = null;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'p357-watch-'));
  });
  afterEach(() => {
    stop?.();
    stop = null;
    rmSync(dir, { recursive: true, force: true });
  });

  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, MANIFEST_FAULT_POLL_MS * 3));
  /** Written beside the file and renamed over it, as a probe writes it, so each write is a new inode. */
  let n = 0;
  function put(path: string, text: string): void {
    n += 1;
    const tmp = join(dir, `.next-${String(n)}`);
    writeFileSync(tmp, text);
    renameSync(tmp, path);
  }

  it('arms a new seq once, refuses a replay and a bad file with their reasons, then arms the next', async () => {
    const path = join(dir, 'fault.json');
    const said: string[] = [];
    const armed = armedManifestFaults((l) => said.push(l));
    stop = watchManifestFaultFile(path, armed, (l) => said.push(l));
    await settle();
    // No file yet: nothing armed and nothing said.
    expect(said).toEqual([]);

    put(path, JSON.stringify({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } }));
    await settle();
    expect(said).toEqual(['[gmux-harness] manifest fault armed: seq=1 listSessions SQLITE_CORRUPT']);
    expect(armed.pending()).toHaveLength(1);

    // The same sequence written again is a replay: refused, said, and nothing armed again.
    put(path, JSON.stringify({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } }));
    await settle();
    expect(said.at(-1)).toBe(
      '[gmux-harness] manifest fault file refused whole: seq 1 is not newer than seq 1, so nothing is armed again'
    );
    expect(armed.pending()).toHaveLength(1);

    // A lower sequence is a replay too.
    put(path, JSON.stringify({ seq: 0, fail: { operation: 'getSession', code: 'SQLITE_CORRUPT' } }));
    await settle();
    expect(said.at(-1)).toContain('seq 0 is not newer than seq 1');

    // A bad file is refused whole, with its reason.
    put(path, JSON.stringify({ seq: 2, fail: { operation: 'nope', code: 'SQLITE_CORRUPT' } }));
    await settle();
    expect(said.at(-1)).toBe(
      '[gmux-harness] manifest fault file refused whole: fail.operation is not a session list operation (MANIFEST_OPERATIONS)'
    );
    expect(armed.pending()).toHaveLength(1);

    // The next sequence arms.
    put(path, JSON.stringify({ seq: 2, fail: { operation: 'getSession', code: 'SQLITE_NOTADB' } }));
    await settle();
    expect(said.at(-1)).toBe('[gmux-harness] manifest fault armed: seq=2 getSession SQLITE_NOTADB');
    expect(armed.pending().map((f) => f.seq)).toEqual([1, 2]);

    // An unchanged file is not read again, so nothing more is said.
    const count = said.length;
    await settle();
    expect(said.length).toBe(count);
  });
});

describe('installManifestFault is the one setter of the store hook, behind the refusals', () => {
  const KEYS = ['GMUX_HARNESS_MANIFEST_FAULT', 'GMUX_HARNESS_DIR', 'GMUX_PROBES', 'GMUX_SMOKE', 'GMUX_SHOT'] as const;
  const saved = new Map<string, string | undefined>();
  let root = '';
  let logs: string[] = [];
  beforeEach(() => {
    for (const k of KEYS) saved.set(k, process.env[k]);
    for (const k of KEYS) delete process.env[k];
    root = realpathSync(mkdtempSync(join(tmpdir(), 'p357-install-')));
    mkdirSync(join(root, 'profile'), { recursive: true });
    hooks.length = 0;
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      logs.push(String(line));
    });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const k of KEYS) {
      const v = saved.get(k);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(root, { recursive: true, force: true });
  });

  it('sets no hook and says nothing in a launch that may not use it', () => {
    userData = join(root, 'profile');
    process.env['GMUX_HARNESS_MANIFEST_FAULT'] = join(root, 'fault.json');
    process.env['GMUX_HARNESS_DIR'] = root;
    process.env['GMUX_PROBES'] = '0';
    installManifestFault();
    expect(hooks).toEqual([]);
    expect(logs).toEqual([]);
    process.env['GMUX_PROBES'] = '1';
    userData = '/Users/somebody/Library/Application Support/Tortie';
    installManifestFault();
    expect(hooks).toEqual([]);
  });

  it('sets ONE hook on an armed probe run, says so, and the hook fires what the file arms', () => {
    userData = join(root, 'profile');
    const path = join(root, 'fault.json');
    process.env['GMUX_HARNESS_MANIFEST_FAULT'] = path;
    process.env['GMUX_HARNESS_DIR'] = root;
    process.env['GMUX_PROBES'] = '1';
    installManifestFault();
    expect(hooks).toHaveLength(1);
    expect(logs[0]).toContain('[gmux-harness] manifest fault seam installed');
    const hook = hooks[0] as (operation: Operation) => void;
    // Nothing armed yet: the hook lets every call through.
    expect(() => hook('listSessions')).not.toThrow();
    writeFileSync(path, JSON.stringify({ seq: 7, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } }));
    vi.advanceTimersByTime(MANIFEST_FAULT_POLL_MS * 2);
    expect(logs).toContain('[gmux-harness] manifest fault armed: seq=7 listSessions SQLITE_CORRUPT');
    expect(() => hook('getSession')).not.toThrow();
    expect(() => hook('listSessions')).toThrow('database disk image is malformed');
    expect(() => hook('listSessions')).not.toThrow();
  });
});
