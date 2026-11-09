/**
 * Phase 362 (build/p362/SPEC.md D4, §4.2). A crash in the teardown that two
 * quits still run after will-quit is noticed at the next launch.
 *
 * Until this phase the log's own will-quit listener deleted the run sentinel,
 * and two quits run Node's environment teardown AFTER will-quit: one with an
 * update staged (357.1's D6) and one that holds no session list. The spec
 * step measured it at 357.1 as landed (§0.1 item 5): the process ended with
 * exit 139 at `quit`, a stand-in dump sat in Crashpad's pending folder, and
 * the relaunch wrote no boot.unclean_exit and posted no notice. The listener
 * now MARKS the sentinel with the quit's time and the dump inventory of that
 * moment, and the boot reads a marked sentinel as a clean quit unless a dump
 * is new since the mark.
 *
 * Every boot here is the shipping runLogBootSequence with electron mocked,
 * over a scratch userData whose `logs` and `crashDumps` folders are real
 * directories, and every quit calls the will-quit listener that boot
 * registered, as Electron calls it. Held, each red when its clause goes:
 *
 * - THE BOOT'S THREE ANSWERS. A marked sentinel with no dump new since its
 *   mark writes no record, posts no notice and arms a fresh sentinel. Marked
 *   with a new dump: one boot.unclean_exit whose `prev` carries `quitAt`, and
 *   one notice. Unmarked: today's record and notice, with no `quitAt` in
 *   `prev`, whether or not a dump is new.
 * - THE LISTENER. Exactly one, and it marks the sentinel the boot armed with
 *   the inventory read AT WILL-QUIT, keeping the run's pid, version and boot
 *   time; it creates nothing when no sentinel is there; it never throws.
 * - THE QUITS, END TO END. The update-staged quit (D12, §10.3) and a clean
 *   teardown after a helper's dump from earlier in the run read clean; a
 *   crash in the teardown after the mark is noticed with `quitAt`; the held
 *   quit, whose hard exit clears after the mark, reads clean; a run that died
 *   before its quit is today's unclean exit.
 * - THE CALLERS. clearLogRunSentinel has exactly two production callers
 *   outside the log module, each the statement right before a SIGKILL to
 *   self, and the log's own will-quit listener calls the marker instead. The
 *   gate's S15 reads the same, with ablations; this is the module's own copy
 *   of that rule, so a run of the log's tests alone sees it.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DurabilityNotice } from '@shared/notice';
import {
  readRunSentinel,
  RUN_SENTINEL_NAME,
  writeRunSentinel,
  type RunSentinel
} from '../sentinel';

const electron = vi.hoisted(() => ({
  userData: '',
  /** The will-quit listeners registered, in order. */
  willQuit: [] as Array<() => void>,
  /** Every other event registered on `app`. */
  otherEvents: [] as string[],
  /** When set, app.getPath('crashDumps') throws (the listener must not). */
  crashDumpsThrows: false
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string): string => {
      if (name === 'crashDumps' && electron.crashDumpsThrows) {
        throw new Error('p362: crashDumps is not available');
      }
      return name === 'userData' ? electron.userData : join(electron.userData, name);
    },
    getVersion: () => '0.120.0',
    on: (event: string, fn: () => void) => {
      if (event === 'will-quit') electron.willQuit.push(fn);
      else electron.otherEvents.push(event);
    }
  },
  ipcMain: {
    removeAllListeners: () => undefined,
    removeHandler: () => undefined
  }
}));

/** The lines the wrapper hands to electron-log, in order. */
const written = vi.hoisted(() => [] as string[]);

vi.mock('electron-log/main', () => {
  const push = (line: unknown): void => {
    written.push(String(line));
  };
  return {
    default: {
      transports: {
        file: { level: 'info' as unknown },
        ipc: { level: 'silly' as unknown },
        remote: { level: 'silly' as unknown }
      },
      error: push,
      warn: push,
      info: push,
      debug: push
    }
  };
});

const logsDir = (): string => join(electron.userData, 'logs');
const crashDir = (): string => join(electron.userData, 'crashDumps');
const sentinelPath = (): string => join(logsDir(), RUN_SENTINEL_NAME);

beforeEach(() => {
  electron.userData = mkdtempSync(join(tmpdir(), 'gmux-p362-sentinel-'));
  mkdirSync(logsDir(), { recursive: true });
  mkdirSync(crashDir(), { recursive: true });
  electron.willQuit.length = 0;
  electron.otherEvents.length = 0;
  electron.crashDumpsThrows = false;
  written.length = 0;
  process.env['GMUX_LOG_FILE'] = '1';
});

afterEach(() => {
  delete process.env['GMUX_LOG_FILE'];
  rmSync(electron.userData, { recursive: true, force: true });
});

/** A Crashpad dump of `bytes` zero bytes in one of its folders. */
function putDump(name: string, bytes = 4096, sub = 'pending'): void {
  mkdirSync(join(crashDir(), sub), { recursive: true });
  writeFileSync(join(crashDir(), sub, name), Buffer.alloc(bytes));
}

interface Boot {
  /** The notices this boot posted. */
  notices: DurabilityNotice[];
  /** The boot.unclean_exit records this boot wrote, parsed as a reader does. */
  unclean: Record<string, unknown>[];
  /** The will-quit listeners this boot registered. */
  listeners: Array<() => void>;
  /** Will-quit, as Electron emits it: every listener this boot registered. */
  quit: () => void;
}

/** One launch's boot: the shipping sequence, its records and notices kept. */
async function boot(): Promise<Boot> {
  const { initLogging, runLogBootSequence } = await import('../index');
  initLogging();
  const linesBefore = written.length;
  const listenersBefore = electron.willQuit.length;
  const notices: DurabilityNotice[] = [];
  runLogBootSequence({
    postNotice: (notice) => {
      notices.push(notice);
      return true;
    },
    collectBootEnv: async () => ({})
  });
  // The record and the notice are synchronous; boot.env alone is detached.
  const unclean = written
    .slice(linesBefore)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((r) => r['event'] === 'boot.unclean_exit');
  const listeners = electron.willQuit.slice(listenersBefore);
  return {
    notices,
    unclean,
    listeners,
    quit: () => {
      for (const fn of listeners) fn();
    }
  };
}

/** A sentinel as a run of another pid left it. */
function plant(over: Partial<RunSentinel> = {}): RunSentinel {
  const sentinel: RunSentinel = {
    pid: 4242,
    version: '0.119.0',
    bootTs: '2026-11-08T20:00:00.000Z',
    dumpNames: [],
    ...over
  };
  writeRunSentinel(logsDir(), sentinel);
  return sentinel;
}

const QUIT_AT = '2026-11-08T21:00:00.000Z';

describe('the boot reads a sentinel marked at will-quit (D4)', () => {
  it('marked, with no dump new since the mark: no record, no notice, and a fresh sentinel armed', async () => {
    putDump('older.dmp');
    plant({ dumpNames: ['older.dmp'], quitAt: QUIT_AT });

    const b = await boot();

    expect(b.unclean).toEqual([]);
    expect(b.notices).toEqual([]);
    // The fresh sentinel is this run's, unmarked, with this boot's inventory.
    expect(readRunSentinel(logsDir())).toStrictEqual({
      pid: process.pid,
      version: '0.120.0',
      bootTs: expect.any(String),
      dumpNames: ['older.dmp']
    });
  });

  it('marked, with one dump new since the mark: one record whose prev carries quitAt, and one notice', async () => {
    plant({ quitAt: QUIT_AT });
    putDump('p362-standin.dmp', 4096);

    const b = await boot();

    expect(b.unclean).toHaveLength(1);
    const record = b.unclean[0] ?? {};
    expect(record['msg']).toBe('previous run did not exit cleanly');
    expect(record['level']).toBe('warn');
    expect(record['prev']).toStrictEqual({
      pid: 4242,
      version: '0.119.0',
      bootTs: '2026-11-08T20:00:00.000Z',
      quitAt: QUIT_AT
    });
    expect(record['dumps']).toStrictEqual({
      newCount: 1,
      names: ['p362-standin.dmp'],
      bytes: 4096
    });
    expect(b.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 1 }]);
  });

  it('unmarked, with no new dump: today’s record, with no quitAt, and today’s notice', async () => {
    plant();

    const b = await boot();

    expect(b.unclean).toHaveLength(1);
    expect(b.unclean[0]?.['prev']).toStrictEqual({
      pid: 4242,
      version: '0.119.0',
      bootTs: '2026-11-08T20:00:00.000Z'
    });
    expect(b.unclean[0]?.['dumps']).toStrictEqual({ newCount: 0, names: [], bytes: 0 });
    expect(b.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 0 }]);
  });

  it('unmarked, with a new dump: today’s record and notice', async () => {
    plant({ dumpNames: ['older.dmp'] });
    putDump('older.dmp');
    putDump('crash.dmp', 1000, 'completed');

    const b = await boot();

    expect(b.unclean).toHaveLength(1);
    expect(b.unclean[0]?.['prev']).toStrictEqual({
      pid: 4242,
      version: '0.119.0',
      bootTs: '2026-11-08T20:00:00.000Z'
    });
    expect(b.unclean[0]?.['dumps']).toStrictEqual({ newCount: 1, names: ['crash.dmp'], bytes: 1000 });
    expect(b.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 1 }]);
  });

  it('a mark that is not a string reads as no mark: today’s record and notice', async () => {
    writeFileSync(
      sentinelPath(),
      JSON.stringify({ pid: 4242, version: '0.119.0', bootTs: 'b', dumpNames: [], quitAt: 1793987027 }),
      'utf8'
    );

    const b = await boot();

    expect(b.unclean).toHaveLength(1);
    expect(b.unclean[0]?.['prev']).toStrictEqual({ pid: 4242, version: '0.119.0', bootTs: 'b' });
    expect(b.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 0 }]);
  });

  it('no sentinel at all (a first launch, or a hard exit that cleared it): nothing', async () => {
    putDump('older.dmp');

    const b = await boot();

    expect(b.unclean).toEqual([]);
    expect(b.notices).toEqual([]);
    expect(readRunSentinel(logsDir())?.pid).toBe(process.pid);
  });
});

describe('the log’s will-quit listener marks the sentinel, never clears it (D4)', () => {
  it('registers exactly one will-quit listener and nothing else on app', async () => {
    const b = await boot();
    expect(b.listeners).toHaveLength(1);
    expect(electron.otherEvents).toEqual([]);
  });

  it('marks the sentinel the boot armed with the inventory read at will-quit, keeping the run', async () => {
    putDump('at-boot.dmp');
    const b = await boot();
    const armed = readRunSentinel(logsDir());
    expect(armed?.dumpNames).toEqual(['at-boot.dmp']);
    expect(armed !== null && 'quitAt' in armed).toBe(false);
    // A helper's dump written while the run went on, before its quit.
    putDump('renderer-earlier.dmp', 2048, 'completed');

    const before = Date.now();
    b.quit();
    const after = Date.now();

    expect(existsSync(sentinelPath())).toBe(true);
    const marked = readRunSentinel(logsDir());
    expect(marked).toStrictEqual({
      pid: process.pid,
      version: '0.120.0',
      bootTs: armed?.bootTs,
      dumpNames: expect.arrayContaining(['at-boot.dmp', 'renderer-earlier.dmp']),
      quitAt: expect.any(String)
    });
    expect(marked?.dumpNames).toHaveLength(2);
    const at = Date.parse(marked?.quitAt ?? '');
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(after);
  });

  it('creates no sentinel when none is there at will-quit', async () => {
    const b = await boot();
    unlinkSync(sentinelPath());

    expect(() => b.quit()).not.toThrow();

    expect(existsSync(sentinelPath())).toBe(false);
    expect(readdirSync(logsDir())).not.toContain(RUN_SENTINEL_NAME);
  });

  it('never throws into the quit path, and marks nothing it could not inventory', async () => {
    const b = await boot();
    const armed = readFileSync(sentinelPath(), 'utf8');
    electron.crashDumpsThrows = true;

    expect(() => b.quit()).not.toThrow();

    // No inventory, no mark: the sentinel stays as the boot armed it.
    expect(readFileSync(sentinelPath(), 'utf8')).toBe(armed);
  });

  it('never throws when the whole profile is gone by will-quit', async () => {
    const b = await boot();
    rmSync(electron.userData, { recursive: true, force: true });

    expect(() => b.quit()).not.toThrow();

    expect(existsSync(electron.userData)).toBe(false);
  });
});

describe('the quits, end to end: a boot, its will-quit, the next boot', () => {
  it('the update-staged quit (357.1 D6, this spec D12): marked at will-quit, no dump, read clean', async () => {
    const first = await boot();
    // No hard exit when an update is staged: the log's listener alone runs,
    // then Node's teardown and Squirrel's install end the process cleanly.
    first.quit();
    expect(readRunSentinel(logsDir())?.quitAt).toEqual(expect.any(String));

    const next = await boot();

    expect(next.unclean).toEqual([]);
    expect(next.notices).toEqual([]);
  });

  it('a helper’s dump from earlier in the run, then a clean teardown quit: no false notice', async () => {
    const first = await boot();
    putDump('renderer.dmp');
    first.quit();

    const next = await boot();

    expect(next.unclean).toEqual([]);
    expect(next.notices).toEqual([]);
  });

  it('a crash in the teardown after the mark: one record naming the dump and quitAt, and one notice', async () => {
    const first = await boot();
    first.quit();
    const quitAt = readRunSentinel(logsDir())?.quitAt;
    expect(quitAt).toEqual(expect.any(String));
    // The main process crashed in Node's teardown, and Crashpad wrote its dump.
    putDump('p362-standin.dmp', 4096);

    const next = await boot();

    expect(next.unclean).toHaveLength(1);
    expect(next.unclean[0]?.['prev']).toStrictEqual({
      pid: process.pid,
      version: '0.120.0',
      bootTs: expect.any(String),
      quitAt
    });
    expect(next.unclean[0]?.['dumps']).toStrictEqual({
      newCount: 1,
      names: ['p362-standin.dmp'],
      bytes: 4096
    });
    expect(next.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 1 }]);
  });

  it('the held quit: the hard exit’s finally clears after the mark, and the next boot says nothing', async () => {
    const first = await boot();
    first.quit();
    expect(existsSync(sentinelPath())).toBe(true);
    const { clearLogRunSentinel } = await import('../index');
    clearLogRunSentinel();
    expect(existsSync(sentinelPath())).toBe(false);

    const next = await boot();

    expect(next.unclean).toEqual([]);
    expect(next.notices).toEqual([]);
  });

  it('a run that died before its quit (no will-quit): today’s record and notice, with no quitAt', async () => {
    await boot();
    putDump('mid-session.dmp');

    const next = await boot();

    expect(next.unclean).toHaveLength(1);
    expect(Object.keys((next.unclean[0]?.['prev'] ?? {}) as object).sort()).toEqual(['bootTs', 'pid', 'version']);
    expect(next.unclean[0]?.['dumps']).toMatchObject({ newCount: 1, names: ['mid-session.dmp'] });
    expect(next.notices).toStrictEqual([{ kind: 'unclean-exit', newDumps: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// The callers, read from the source with the TypeScript parser
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const mainDir = resolve(here, '..', '..');
const repoRoot = resolve(mainDir, '..', '..');

/** Every production .ts file under src/main (no tests, no declarations). */
function productionFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...productionFiles(path));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(path);
    }
  }
  return out;
}

function parse(path: string, text = readFileSync(path, 'utf8')): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Every call of `name(...)` in a file. */
function callsOf(sf: ts.SourceFile, name: string): ts.CallExpression[] {
  const found: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

const squash = (text: string): string => text.replace(/\s+/g, '');

describe('clearLogRunSentinel keeps exactly its two callers (D4)', () => {
  it('two production callers outside src/main/log, each the statement right before a SIGKILL to self', () => {
    const callers: string[] = [];
    for (const path of productionFiles(mainDir)) {
      const rel = relative(repoRoot, path);
      if (rel.startsWith(join('src', 'main', 'log') + '/')) continue;
      // Only a file that spells the name can call it; the rest are not parsed.
      const text = readFileSync(path, 'utf8');
      if (!text.includes('clearLogRunSentinel')) continue;
      const sf = parse(path, text);
      // Bound under its own name only, so a call by another name cannot hide.
      const renamed: string[] = [];
      const visitImports = (node: ts.Node): void => {
        if (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) {
          const imported = (node.propertyName ?? node.name).text;
          if (imported === 'clearLogRunSentinel' && node.name.text !== imported) renamed.push(node.name.text);
        }
        ts.forEachChild(node, visitImports);
      };
      visitImports(sf);
      expect(renamed, `${rel} binds clearLogRunSentinel under another name`).toEqual([]);
      for (const call of callsOf(sf, 'clearLogRunSentinel')) {
        const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;
        callers.push(`${rel}:${String(line)}`);
        const statement = call.parent;
        expect(ts.isExpressionStatement(statement), `${rel}:${String(line)} is a statement of its own`).toBe(true);
        const block = statement.parent;
        expect(ts.isBlock(block), `${rel}:${String(line)} sits in a block`).toBe(true);
        const siblings = (block as ts.Block).statements;
        const next = siblings[siblings.indexOf(statement as ts.Statement) + 1];
        expect(
          next === undefined ? '' : squash(next.getText(sf)),
          `${rel}:${String(line)} is followed by the SIGKILL to self`
        ).toBe("process.kill(process.pid,'SIGKILL');");
      }
    }
    expect(callers.map((c) => c.replace(/:\d+$/, '')).sort()).toEqual([
      join('src', 'main', 'capabilities.ts'),
      join('src', 'main', 'index.ts')
    ]);
  });

  it('the log module calls it nowhere, and its one will-quit listener calls the marker, which reads the inventory itself', () => {
    const sf = parse(join(mainDir, 'log', 'index.ts'));
    expect(callsOf(sf, 'clearLogRunSentinel')).toEqual([]);

    // The will-quit registrations in the log module.
    const registrations: ts.CallExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'on' &&
        node.arguments[0] !== undefined &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        node.arguments[0].text === 'will-quit'
      ) {
        registrations.push(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    expect(registrations).toHaveLength(1);
    const listener = registrations[0]?.arguments[1];
    expect(listener !== undefined && ts.isArrowFunction(listener)).toBe(true);
    expect(squash((listener as ts.ArrowFunction).body.getText(sf))).toBe('markLogRunSentinelAtQuit()');

    // The marker: one call of the pure marker, handed scanCrashDumps' names.
    const marker = sf.statements.find(
      (s): s is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(s) && s.name?.text === 'markLogRunSentinelAtQuit'
    );
    expect(marker).toBeDefined();
    const pure = callsOf(sf, 'markRunSentinelAtQuit').filter(
      (c) => marker !== undefined && c.getStart(sf) >= marker.getStart(sf) && c.getEnd() <= marker.getEnd()
    );
    expect(pure).toHaveLength(1);
    expect(callsOf(sf, 'markRunSentinelAtQuit')).toHaveLength(1);
    const inventory = pure[0]?.arguments[1];
    expect(inventory === undefined ? '' : squash(inventory.getText(sf))).toBe(
      "scanCrashDumps(app.getPath('crashDumps')).map((d)=>d.name)"
    );
  });
});
