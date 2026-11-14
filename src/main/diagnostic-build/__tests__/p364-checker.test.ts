/**
 * Phase 364 (build/p364/SPEC.md D7, §5): the diagnostic build's handshake with
 * its page-cache checker, src/main/diagnostic-build/checker.ts.
 *
 * The C side is stood in for by a fake better-sqlite3 whose `get()` does what
 * the checker's first entry does (build/diagnostic/sqlite-checker.c, `tchkArm`):
 * read TORTIE_CHECKER and remove it. A fake that leaves it alone is a build
 * with no checker. The rules held here:
 *
 *  - the variable is `<app.log path>\t<home>`, set for the one `SELECT 1` on a
 *    `:memory:` connection and gone when armChecker returns, answered or not,
 *    thrown or not, and an inherited value does not survive either;
 *  - the logs folder exists before the connection opens (§0.1 item 7);
 *  - nothing is logged when the C side answered, and ONE error line, in §5's
 *    words, when it did not;
 *  - a run that writes no app.log hands over no path, and a path the C side
 *    would cut or split (a tab, more than 1,023 bytes) is never handed over;
 *  - it never throws, the connection is closed on every path, and a logs
 *    folder that cannot be made does not stop the handshake (the C side then
 *    writes to stderr, as the log module cannot write app.log either).
 *
 * Two tests run over real native code. The better-sqlite3 in node_modules is
 * the normal prebuild, which has no checker, so the handshake must say so,
 * once. And when P364_CHECKER_BS3 names a checking better-sqlite3 that
 * build/diagnostic/build-checker.mjs built (its `--out` folder, either
 * variant), the real C side answers: it removes the variable and writes its
 * own `diagnostic.armed` line into the app.log the handshake named. That test
 * is skipped when the variable is unset, which is every ordinary `npm test`:
 *
 *     P364_CHECKER_BS3=<out> node_modules/.bin/vitest run src/main/diagnostic-build
 */

import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ fileOn: false, logsDir: '' }));

// The log module's two answers the default deps read, held by the test; the
// rest of the module is the real one, so the default error line is real too.
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    isFileLoggingOn: () => h.fileOn,
    getLogsDir: () => h.logsDir
  };
});

import { armChecker } from '../checker';

const VARIABLE = 'TORTIE_CHECKER';
const NO_CHECKER = 'this diagnostic build has no page-cache checker';

interface Seen {
  filenames: string[];
  sql: string[];
  variable: string | undefined;
  folderAtOpen: boolean | null;
  closed: number;
}

/**
 * A better-sqlite3 stand-in. `consumes` is a build with the checker: its first
 * entry (`get()`) removes the variable, as the C side does.
 */
function fakeDatabase(
  seen: Seen,
  options: {
    consumes: boolean;
    folder?: string;
    openThrows?: Error;
    getThrows?: Error;
  }
): new (filename: string) => { prepare(sql: string): { get(): unknown }; close(): void } {
  return class FakeDatabase {
    constructor(filename: string) {
      seen.filenames.push(filename);
      if (options.folder !== undefined) seen.folderAtOpen = existsSync(options.folder);
      if (options.openThrows !== undefined) throw options.openThrows;
    }
    prepare(sql: string): { get(): unknown } {
      seen.sql.push(sql);
      return {
        get: () => {
          seen.variable = process.env[VARIABLE];
          if (options.consumes) delete process.env[VARIABLE];
          if (options.getThrows !== undefined) throw options.getThrows;
          return { 1: 1 };
        }
      };
    }
    close(): void {
      seen.closed += 1;
    }
  };
}

function freshSeen(): Seen {
  return { filenames: [], sql: [], variable: undefined, folderAtOpen: null, closed: 0 };
}

let scratch = '';
let logsDir = '';
let appLog = '';
let lines: Array<{ msg: string; fields: Record<string, unknown> | undefined }> = [];
const log = (msg: string, fields?: Record<string, unknown>): void => {
  lines.push({ msg, fields });
};
const home = '/Users/someone';

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'p364-checker-'));
  logsDir = join(scratch, 'userData', 'logs');
  appLog = join(logsDir, 'app.log');
  lines = [];
  h.fileOn = false;
  h.logsDir = logsDir;
  delete process.env[VARIABLE];
});

afterEach(() => {
  delete process.env[VARIABLE];
  vi.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

describe('the handshake', () => {
  it('hands the C side the app.log path and the home for one SELECT 1, after making the logs folder', () => {
    const seen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(seen, { consumes: true, folder: logsDir }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(answered).toBe(true);
    expect(seen.variable).toBe(`${appLog}\t${home}`);
    expect(seen.folderAtOpen).toBe(true);
    expect(seen.filenames).toEqual([':memory:']);
    expect(seen.sql).toEqual(['SELECT 1']);
    expect(seen.closed).toBe(1);
    expect(process.env[VARIABLE]).toBeUndefined();
    expect(lines).toEqual([]);
  });

  it('logs ONE error line when nothing answered, and still removes the variable', () => {
    const seen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(seen, { consumes: false }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(answered).toBe(false);
    expect(seen.variable).toBe(`${appLog}\t${home}`);
    expect(process.env[VARIABLE]).toBeUndefined();
    expect(lines).toEqual([{ msg: NO_CHECKER, fields: undefined }]);
  });

  it('an inherited TORTIE_CHECKER is replaced for the call and gone after it', () => {
    process.env[VARIABLE] = 'stale\t/elsewhere';
    const seen = freshSeen();
    armChecker({
      Database: fakeDatabase(seen, { consumes: false }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(seen.variable).toBe(`${appLog}\t${home}`);
    expect(process.env[VARIABLE]).toBeUndefined();
  });

  it('a module that cannot open names why in the one line, and never throws', () => {
    const seen = freshSeen();
    let answered: boolean | null = null;
    expect(() => {
      answered = armChecker({
        Database: fakeDatabase(seen, { consumes: true, openThrows: new Error('the module did not load') }),
        logsDir: () => logsDir,
        appLogPath: () => appLog,
        home: () => home,
        log
      });
    }).not.toThrow();
    expect(answered).toBe(false);
    expect(process.env[VARIABLE]).toBeUndefined();
    expect(lines).toEqual([{ msg: NO_CHECKER, fields: { error: 'the module did not load' } }]);
  });

  it('closes the connection when the statement throws, and reads the answer anyway', () => {
    const answeredSeen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(answeredSeen, { consumes: true, getThrows: new Error('busy') }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(answered).toBe(true);
    expect(answeredSeen.closed).toBe(1);
    expect(lines).toEqual([]);

    const silentSeen = freshSeen();
    const silent = armChecker({
      Database: fakeDatabase(silentSeen, { consumes: false, getThrows: new Error('busy') }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(silent).toBe(false);
    expect(silentSeen.closed).toBe(1);
    expect(lines).toEqual([{ msg: NO_CHECKER, fields: { error: 'busy' } }]);
    expect(process.env[VARIABLE]).toBeUndefined();
  });

  it('a home that cannot be read is the one line too, with no variable set', () => {
    const seen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(seen, { consumes: true }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => {
        throw new Error('no home');
      },
      log
    });
    expect(answered).toBe(false);
    expect(seen.filenames).toEqual([]);
    expect(process.env[VARIABLE]).toBeUndefined();
    expect(lines).toEqual([{ msg: NO_CHECKER, fields: { error: 'no home' } }]);
  });

  it('a logs folder that cannot be made does not stop the handshake', () => {
    // A file where the folder's parent should be: mkdir answers ENOTDIR.
    writeFileSync(join(scratch, 'userData'), 'not a folder');
    const seen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(seen, { consumes: true }),
      logsDir: () => logsDir,
      appLogPath: () => appLog,
      home: () => home,
      log
    });
    expect(answered).toBe(true);
    expect(seen.variable).toBe(`${appLog}\t${home}`);
    expect(lines).toEqual([]);
  });

  it('a log that throws does not reach main', () => {
    const seen = freshSeen();
    expect(() =>
      armChecker({
        Database: fakeDatabase(seen, { consumes: false }),
        logsDir: () => logsDir,
        appLogPath: () => appLog,
        home: () => home,
        log: () => {
          throw new Error('the log is gone');
        }
      })
    ).not.toThrow();
  });
});

describe('the path the C side is given', () => {
  it('a run that writes no app.log hands over no path and makes no folder', () => {
    const seen = freshSeen();
    const answered = armChecker({
      Database: fakeDatabase(seen, { consumes: true }),
      logsDir: () => logsDir,
      appLogPath: () => '',
      home: () => home,
      log
    });
    expect(answered).toBe(true);
    expect(seen.variable).toBe(`\t${home}`);
    expect(existsSync(logsDir)).toBe(false);
  });

  it('never hands over a path holding a tab, because the C side splits at the first one', () => {
    const tabbed = join(scratch, 'a\tb', 'logs');
    const seen = freshSeen();
    armChecker({
      Database: fakeDatabase(seen, { consumes: true }),
      logsDir: () => tabbed,
      appLogPath: () => join(tabbed, 'app.log'),
      home: () => home,
      log
    });
    expect(seen.variable).toBe(`\t${home}`);
    expect(existsSync(tabbed)).toBe(false);
  });

  it('never hands over a path longer than the 1,023 bytes the C side keeps, counted in UTF-8', () => {
    const fits = `/${'x'.repeat(1022)}`;
    const cut = `/${'x'.repeat(1023)}`;
    // 600 characters, 1,200 bytes: a character count would let it through.
    const wide = `/${'é'.repeat(600)}`;
    expect(Buffer.byteLength(fits)).toBe(1023);
    expect(Buffer.byteLength(cut)).toBe(1024);
    expect(wide.length).toBeLessThan(1023);

    const handed = (path: string): string | undefined => {
      const seen = freshSeen();
      armChecker({
        Database: fakeDatabase(seen, { consumes: true }),
        logsDir: () => logsDir,
        appLogPath: () => path,
        home: () => home,
        log
      });
      return seen.variable;
    };
    expect(handed(fits)).toBe(`${fits}\t${home}`);
    expect(handed(cut)).toBe(`\t${home}`);
    expect(handed(wide)).toBe(`\t${home}`);
  });
});

describe('the defaults', () => {
  it('a run with file logging hands over <logs>/app.log and the home folder', () => {
    h.fileOn = true;
    const seen = freshSeen();
    const answered = armChecker({ Database: fakeDatabase(seen, { consumes: true, folder: logsDir }), log });
    expect(answered).toBe(true);
    expect(seen.variable).toBe(`${join(logsDir, 'app.log')}\t${homedir()}`);
    expect(seen.folderAtOpen).toBe(true);
  });

  it('a run without file logging hands over no path', () => {
    h.fileOn = false;
    const seen = freshSeen();
    armChecker({ Database: fakeDatabase(seen, { consumes: true }), log });
    expect(seen.variable).toBe(`\t${homedir()}`);
    expect(existsSync(logsDir)).toBe(false);
  });

  it('over the normal better-sqlite3, which has no checker, the line is one error at scope diagnostic', () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((line: unknown) => {
      errors.push(String(line));
    });
    const answered = armChecker();
    expect(answered).toBe(false);
    expect(process.env[VARIABLE]).toBeUndefined();
    expect(errors).toEqual([`[gmux-diagnostic] ${NO_CHECKER}`]);
  });
});

const CHECKER_BS3 = (process.env['P364_CHECKER_BS3'] ?? '').trim();

describe('the real checker', () => {
  it.skipIf(CHECKER_BS3 === '')(
    'a checking better-sqlite3 removes the variable and writes its armed line into the app.log it was named',
    () => {
      // Loaded the way build/diagnostic/hook-bs3.cjs loads it: the copy's own
      // lib/database.js over its build/Release module, never its prebuilds/,
      // which better-sqlite3's loader would otherwise prefer.
      const load = createRequire(import.meta.url);
      const create = load(join(CHECKER_BS3, 'lib', 'database.js')) as (
        addon: () => unknown,
        allowNativeBinding: boolean
      ) => new (filename: string) => { prepare(sql: string): { get(): unknown }; close(): void };
      const node = join(CHECKER_BS3, 'build', 'Release', 'better_sqlite3.node');
      const CheckingDatabase = create(() => load(node), false);

      expect(existsSync(logsDir)).toBe(false);
      const answered = armChecker({
        Database: CheckingDatabase,
        logsDir: () => logsDir,
        appLogPath: () => appLog,
        home: () => homedir(),
        log
      });
      expect(answered).toBe(true);
      expect(process.env[VARIABLE]).toBeUndefined();
      expect(lines).toEqual([]);

      const written = readFileSync(appLog, 'utf8').split('\n').filter((l) => l !== '');
      expect(written).toHaveLength(1);
      const armed = JSON.parse(written[0] ?? '') as Record<string, unknown>;
      expect(armed).toMatchObject({
        level: 'info',
        scope: 'diagnostic',
        pid: process.pid,
        proctype: 'main',
        event: 'diagnostic.armed',
        msg: 'The page-cache checker is on',
        installed: true
      });
    }
  );
});
