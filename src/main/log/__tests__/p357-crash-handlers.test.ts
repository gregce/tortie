/**
 * Phase 357. The two process handlers in src/main/log/crash.ts
 * (build/p357/SPEC.md §4.4, D16 to D18), driven in plain node.
 *
 * Until this phase main registered no `uncaughtException` and no
 * `unhandledRejection` listener, so 0.114.0 drew Electron's dialog once per
 * refresh of a session list that had stopped reading and wrote nothing at all
 * to app.log. What is held here, each rule red when its clause is removed:
 *
 * - THE RECORD. Frames are the stack's `at` lines AFTER the message is cut off
 *   the front, at most 12, each at most 300 characters, home-redacted before
 *   they are clipped. A better-sqlite3 SqliteError keeps SQLite's own text
 *   clipped to 120; any other error keeps its message's length and none of its
 *   text, because V8's JSON.parse error quotes its input.
 * - THE HANDLERS. One record per distinct error. Electron's own dialog, in its
 *   own words, once per distinct uncaught exception, never in a harness launch
 *   and never for the session list's refusal. A rejection never draws and
 *   prints one stderr line. The repeats are counted and written once at quit.
 *   Neither handler throws, whatever is thrown or whatever it was handed.
 * - THE COMPOSITION ROOT. src/main/index.ts hands in exactly `logEvent`,
 *   `dialog.showErrorBox`, `isHarnessLaunch(process.env)` and
 *   `isManifestStopped`, and installs the manifest fault seam directly after
 *   the push seam and before the harness dispatch.
 *
 * Every handler is registered through an installer of the test's own, so
 * nothing is added to the test process. The two tests of the shipping
 * installer spy on `process.on` and register nothing.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import {
  crashKeyOf,
  crashMessageOf,
  crashRecordOf,
  flushCrashRepeats,
  installCrashHandlers,
  type CrashHandlerDeps,
  type CrashListeners
} from '../crash';

const electron = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('electron', () => ({ crashReporter: { start: electron.start } }));

const HOME = '/Users/someone';
const TITLE = 'A JavaScript error occurred in the main process';

/** A synthetic error whose stack is exactly the text given. */
function withStack(name: string, message: string, frames: string[]): Error {
  const err = new Error(message);
  err.name = name;
  err.stack = [message === '' ? name : `${name}: ${message}`, ...frames].join('\n');
  return err;
}

/** One error made at one place, so two calls from one line share their frames. */
function control(code = 'P357_CONTROL'): Error {
  return Object.assign(new Error('p357 control exception'), { code });
}

interface LogCall {
  readonly scope: string;
  readonly level: string;
  readonly event: string;
  readonly msg: string;
  readonly fields: Record<string, unknown>;
  readonly options: { console: boolean };
}

/** The handlers installed over recorders, with the two listeners they handed back. */
function installed(over: Partial<CrashHandlerDeps> = {}): {
  logs: LogCall[];
  dialogs: { title: string; content: string }[];
  listeners: CrashListeners;
} {
  const logs: LogCall[] = [];
  const dialogs: { title: string; content: string }[] = [];
  let handed: CrashListeners | null = null;
  installCrashHandlers(
    {
      log: (scope, level, event, msg, fields, options) => {
        logs.push({ scope, level, event, msg, fields, options });
      },
      showErrorBox: (title, content) => {
        dialogs.push({ title, content });
      },
      harness: false,
      // D18 by its own definition, not the store's export.
      isStopped: (err) =>
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: unknown }).code === 'MANIFEST_STOPPED',
      ...over
    },
    (listeners) => {
      handed = listeners;
    }
  );
  if (handed === null) throw new Error('the installer was never handed the listeners');
  return { logs, dialogs, listeners: handed };
}

let stderr: MockInstance;

beforeEach(() => {
  stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  stderr.mockRestore();
});

/** The stderr lines this module printed. */
function stderrLines(): string[] {
  return stderr.mock.calls.map((call: unknown[]) => String(call[0]));
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

describe('crashRecordOf: what one error may leave in app.log', () => {
  it('cuts the message off the front, so a line of the message shaped like a frame is not one', () => {
    const err = new Error(
      'first line\n    at forged (/Users/someone/project/secret-plan.md:1:1)\nlast line'
    );
    const record = crashRecordOf(err, 'uncaught', HOME);
    expect(record.frames.length).toBeGreaterThan(0);
    expect(record.frames.every((frame) => frame.startsWith('at '))).toBe(true);
    expect(JSON.stringify(record)).not.toContain('forged');
    expect(JSON.stringify(record)).not.toContain('secret-plan');
    // The frames are this test's own, the real ones.
    expect(record.frames.some((frame) => frame.includes('p357-crash-handlers.test.ts'))).toBe(true);
  });

  it('keeps at most 12 frames, each at most 300 characters', () => {
    const frames = Array.from({ length: 20 }, (_, i) => `    at f${i} (/x/main.js:${i}:1)`);
    frames[3] = `    at ${'g'.repeat(1_000)} (/x/main.js:3:1)`;
    const record = crashRecordOf(withStack('Error', 'm', frames), 'uncaught', HOME);
    expect(record.frames).toHaveLength(12);
    expect(record.frames[0]).toBe('at f0 (/x/main.js:0:1)');
    expect(record.frames[11]).toBe('at f11 (/x/main.js:11:1)');
    expect(record.frames[3]).toHaveLength(300);
    expect(record.frames[3]).toBe(`at ${'g'.repeat(297)}`);
  });

  it('redacts a frame BEFORE it clips it, so no half of a home path is left behind', () => {
    // The home path straddles the 300th character. Clipped first, the frame
    // would keep "/Users/someo", which redaction can no longer recognise.
    const frame = `    at ${'f'.repeat(283)} (/Users/someone/x.js:1:1)`;
    const record = crashRecordOf(withStack('Error', 'm', [frame]), 'uncaught', HOME);
    expect(record.frames[0]).toBe(`at ${'f'.repeat(283)} (~/x.js:1:1)`);
    expect(record.frames[0]).not.toContain('/Users/some');
  });

  it('never splits a surrogate pair at the clip', () => {
    const frame = `    at ${'f'.repeat(296)}\u{1F600}x (/x.js:1:1)`;
    const record = crashRecordOf(withStack('Error', 'm', [frame]), 'uncaught', HOME);
    const kept = record.frames[0] ?? '';
    expect(kept.length).toBeLessThanOrEqual(300);
    expect(/[\uD800-\uDBFF]$/.test(kept)).toBe(false);
  });

  it('keeps a SqliteError\'s own message, clipped to 120 characters, and no length', () => {
    const text = `database disk image is malformed ${'x'.repeat(200)}`;
    const err = new Database.SqliteError(text, 'SQLITE_CORRUPT');
    const record = crashRecordOf(err, 'uncaught', HOME);
    expect(record.name).toBe('SqliteError');
    expect(record.code).toBe('SQLITE_CORRUPT');
    expect(record.message).toBe(text.slice(0, 120));
    expect(record.messageChars).toBeUndefined();
    expect(crashMessageOf(err, HOME)).toEqual({ message: text.slice(0, 120) });
    // And its frames still start after its message.
    expect(record.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(record.frames)).not.toContain('malformed');
  });

  it('keeps a JSON.parse error\'s length and never its text', () => {
    let parseError: unknown = null;
    try {
      JSON.parse('hunter2-secret-token');
    } catch (err) {
      parseError = err;
    }
    // The precondition: V8 really does quote the input in its message.
    expect((parseError as Error).message).toContain('hunter2');
    const record = crashRecordOf(parseError, 'uncaught', HOME);
    expect(record.name).toBe('SyntaxError');
    expect(record.message).toBeUndefined();
    expect(record.messageChars).toBe((parseError as Error).message.length);
    expect(record.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(record)).not.toContain('hunter2');
  });

  it('keeps no text for an error that only claims to be SQLite\'s', () => {
    // By class, never by name or code.
    const byCode = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT'
    });
    expect(crashMessageOf(byCode, HOME)).toEqual({ messageChars: 32 });
    const byName = {
      name: 'SqliteError',
      message: 'a person’s words',
      code: 'SQLITE_CORRUPT',
      stack: 'SqliteError: a person’s words\n    at x (/a.js:1:1)'
    };
    const record = crashRecordOf(byName, 'uncaught', HOME);
    expect(record.message).toBeUndefined();
    expect(record.messageChars).toBe(16);
    expect(record.frames).toEqual(['at x (/a.js:1:1)']);
    expect(JSON.stringify(record)).not.toContain('words');
  });

  it('redacts the home directory in the name, the code, the frames and the message', () => {
    const err = new Database.SqliteError(
      'unable to open /Users/someone/db/manifest.db',
      'SQLITE_CANTOPEN'
    );
    err.stack =
      'SqliteError: unable to open /Users/someone/db/manifest.db\n' +
      '    at open (/Users/someone/gmux/out/main/index.js:1:2)';
    const record = crashRecordOf(err, 'uncaught', HOME);
    expect(record.message).toBe('unable to open ~/db/manifest.db');
    expect(record.frames).toEqual(['at open (~/gmux/out/main/index.js:1:2)']);
    const named = Object.assign(new Error('m'), {
      name: 'Err /Users/someone/n',
      code: 'C /Users/someone/c'
    });
    const other = crashRecordOf(named, 'uncaught', HOME);
    expect(other.name).toBe('Err ~/n');
    expect(other.code).toBe('C ~/c');
    expect(JSON.stringify([record, other])).not.toContain(HOME);
  });

  it('keeps the code only when it is a string', () => {
    expect(crashRecordOf(Object.assign(new Error('m'), { code: 'ENOENT' }), 'uncaught', HOME).code).toBe('ENOENT');
    expect('code' in crashRecordOf(Object.assign(new Error('m'), { code: 42 }), 'uncaught', HOME)).toBe(false);
    expect('code' in crashRecordOf(new Error('m'), 'uncaught', HOME)).toBe(false);
  });

  it('cuts Node\'s own bracketed header, and a name changed after the stack was read', () => {
    // Plain Node writes an internal error's header as `TypeError [ERR_X]:
    // <message>` (measured on Node 22.23.1). Vitest's own stack formatter
    // drops the brackets, so the shape Electron's main process sees is
    // written out here.
    const bracketed = Object.assign(
      new TypeError('The "path" argument must be of type string. Received undefined'),
      { code: 'ERR_INVALID_ARG_TYPE' }
    );
    bracketed.stack =
      'TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined\n' +
      '    at Object.openSync (node:fs:561:5)\n' +
      '    at Object.readFileSync (node:fs:444:35)';
    const nodeRecord = crashRecordOf(bracketed, 'uncaught', HOME);
    expect(nodeRecord.code).toBe('ERR_INVALID_ARG_TYPE');
    expect(nodeRecord.frames).toEqual([
      'at Object.openSync (node:fs:561:5)',
      'at Object.readFileSync (node:fs:444:35)'
    ]);
    // And a real one, however this runner formats it.
    let nodeError: unknown = null;
    try {
      readFileSync(undefined as unknown as string);
    } catch (err) {
      nodeError = err;
    }
    const real = crashRecordOf(nodeError, 'uncaught', HOME);
    expect(real.code).toBe('ERR_INVALID_ARG_TYPE');
    expect(real.frames.length).toBeGreaterThan(0);
    expect(real.frames.every((frame) => frame.startsWith('at '))).toBe(true);

    const renamed = new Error('line one\n    at forged (/x.js:1:1)');
    void renamed.stack;
    renamed.name = 'Renamed';
    const record = crashRecordOf(renamed, 'uncaught', HOME);
    expect(record.name).toBe('Renamed');
    expect(record.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(record)).not.toContain('forged');
  });

  it('keeps no frames when the message changed after the stack was read', () => {
    // Nothing says where the old message ends, so no line is taken as a frame.
    const err = new Error('old words\n    at forged (/Users/someone/plan.md:1:1)');
    void err.stack;
    err.message = 'new words';
    const record = crashRecordOf(err, 'uncaught', HOME);
    expect(record.frames).toEqual([]);
    expect(JSON.stringify(record)).not.toContain('forged');
    // Emptied, the header looks like the bare name. It is not, because no
    // line break follows the name in the stack.
    const emptied = new Error('old words\n    at forged (/x.js:1:1)');
    void emptied.stack;
    emptied.message = '';
    expect(crashRecordOf(emptied, 'uncaught', HOME).frames).toEqual([]);
    // Changed to words that end a LATER line of the old message, the new
    // message is not taken for the header either: it does not end the first
    // line.
    const suffix = new Error('a line\nlabel: x\n    at forged (/x.js:1:1)');
    void suffix.stack;
    suffix.message = 'x';
    expect(crashRecordOf(suffix, 'uncaught', HOME).frames).toEqual([]);
    // Nor words that end the first line in the middle of the old message.
    const midLine = new Error('first line ends with x\n    at forged (/x.js:1:1)');
    void midLine.stack;
    midLine.message = 'x';
    expect(crashRecordOf(midLine, 'uncaught', HOME).frames).toEqual([]);
    // And a message changed BEFORE the first read is simply in the stack.
    const late = new Error('old words');
    late.message = 'new words\n    at forged (/x.js:1:1)';
    const lateRecord = crashRecordOf(late, 'uncaught', HOME);
    expect(lateRecord.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(lateRecord)).not.toContain('forged');
  });

  it('never throws, whatever is thrown, and keeps no thrown string\'s text', () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('a getter that throws');
        },
        getPrototypeOf() {
          throw new Error('a prototype walk that throws');
        }
      }
    );
    const stackThrows = Object.defineProperty(new Error('m'), 'stack', {
      get() {
        throw new Error('no stack for you');
      }
    });
    const cases: [unknown, string][] = [
      ['secret-string', 'string'],
      [42, 'number'],
      [null, 'null'],
      [undefined, 'undefined'],
      [Symbol('s'), 'symbol'],
      [{}, 'object'],
      [hostile, 'object'],
      [stackThrows, 'Error']
    ];
    for (const [value, name] of cases) {
      const record = crashRecordOf(value, 'rejection', HOME);
      expect(record.name).toBe(name);
      expect(record.origin).toBe('rejection');
      expect(Array.isArray(record.frames)).toBe(true);
      expect(typeof crashKeyOf(record)).toBe('string');
    }
    const thrownString = crashRecordOf('secret-string', 'uncaught', HOME);
    expect(thrownString.messageChars).toBe(13);
    expect(JSON.stringify(thrownString)).not.toContain('secret');
  });
});

describe('crashKeyOf: the key one error is remembered under', () => {
  it('is the sha256 of the origin, the name, the code and the frames, and not the message', () => {
    const frames = ['    at f (/x.js:1:1)'];
    const a = crashRecordOf(Object.assign(withStack('Error', 'path one', frames), { code: 'E1' }), 'uncaught', HOME);
    const b = crashRecordOf(Object.assign(withStack('Error', 'path two', frames), { code: 'E1' }), 'uncaught', HOME);
    expect(crashKeyOf(a)).toBe(crashKeyOf(b));
    expect(crashKeyOf(a)).toBe(
      createHash('sha256')
        .update(JSON.stringify(['uncaught', 'Error', 'E1', ['at f (/x.js:1:1)']]))
        .digest('hex')
    );
    expect(crashKeyOf(a)).toMatch(/^[0-9a-f]{64}$/);
    const otherCode = crashRecordOf(Object.assign(withStack('Error', 'm', frames), { code: 'E2' }), 'uncaught', HOME);
    const otherFrames = crashRecordOf(withStack('Error', 'm', ['    at g (/x.js:2:1)']), 'uncaught', HOME);
    const otherOrigin = { ...a, origin: 'rejection' as const };
    expect(new Set([a, otherCode, otherFrames, otherOrigin].map(crashKeyOf)).size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// The handlers
// ---------------------------------------------------------------------------

describe('the handlers, through an installer of the test\'s own', () => {
  it('writes one record per distinct error, at scope crash, and only counts a repeat', () => {
    const { logs, listeners } = installed();
    for (let i = 0; i < 3; i += 1) listeners.uncaught(control());
    expect(logs).toHaveLength(1);
    const [first] = logs;
    expect(first?.scope).toBe('crash');
    expect(first?.level).toBe('error');
    expect(first?.event).toBe('crash.uncaught');
    expect(first?.msg).toBe('uncaught exception: Error P357_CONTROL');
    expect(first?.options).toEqual({ console: false });
    expect(first?.fields['name']).toBe('Error');
    expect(first?.fields['code']).toBe('P357_CONTROL');
    expect(first?.fields['messageChars']).toBe('p357 control exception'.length);
    expect('message' in (first?.fields ?? {})).toBe(false);
    expect(Array.isArray(first?.fields['frames'])).toBe(true);
    expect(first?.fields['key']).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(logs)).not.toContain('p357 control exception');
    // One stderr line for the one first sighting, none for the repeats.
    expect(stderrLines()).toEqual(['[gmux-crash] uncaught exception: Error P357_CONTROL']);
    // A different error is its own first sighting.
    listeners.uncaught(control('P357_OTHER'));
    expect(logs).toHaveLength(2);
  });

  it('draws Electron\'s own dialog, in its own words, once per distinct uncaught exception', () => {
    const { dialogs, listeners } = installed();
    // Made at one place, so the two share their frames and are one error.
    const [first, again] = Array.from({ length: 2 }, () => control());
    listeners.uncaught(first);
    listeners.uncaught(again);
    expect(dialogs).toEqual([{ title: TITLE, content: `Uncaught Exception:\n${first?.stack}` }]);
    const second = control('P357_OTHER');
    listeners.uncaught(second);
    expect(dialogs).toHaveLength(2);
    expect(dialogs[1]).toEqual({ title: TITLE, content: `Uncaught Exception:\n${second.stack}` });
  });

  it('draws Electron\'s no-stack text for a value with no stack', () => {
    const { dialogs, listeners } = installed();
    listeners.uncaught({ name: 'Odd', message: 'no stack here' });
    listeners.uncaught('a thrown string');
    expect(dialogs.map((d) => d.content)).toEqual([
      'Uncaught Exception:\nOdd: no stack here',
      'Uncaught Exception:\nundefined: undefined'
    ]);
  });

  it('never draws in a harness launch, and still writes the record', () => {
    const { logs, dialogs, listeners } = installed({ harness: true });
    listeners.uncaught(control());
    expect(dialogs).toEqual([]);
    expect(logs.map((l) => l.event)).toEqual(['crash.uncaught']);
  });

  it('never draws for the session list\'s refusal, and still writes it once', () => {
    const { logs, dialogs, listeners } = installed();
    const refusal = (): Error =>
      Object.assign(
        new Error(JSON.stringify({ code: 'MANIFEST_STOPPED', message: 'refused', detail: 'listSessions' })),
        { code: 'MANIFEST_STOPPED' }
      );
    for (let i = 0; i < 5; i += 1) listeners.uncaught(refusal());
    expect(dialogs).toEqual([]);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.fields['code']).toBe('MANIFEST_STOPPED');
    expect(JSON.stringify(logs)).not.toContain('refused');
  });

  it('never draws for a rejection, and prints one stderr line for it', () => {
    const { logs, dialogs, listeners } = installed();
    const reject = (): Error => Object.assign(new Error('p357 control rejection'), { code: 'P357_CONTROL' });
    for (let i = 0; i < 2; i += 1) listeners.rejection(reject());
    expect(dialogs).toEqual([]);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.event).toBe('crash.rejection');
    expect(logs[0]?.msg).toBe('unhandled rejection: Error P357_CONTROL');
    expect(stderrLines()).toEqual(['[gmux-crash] unhandled rejection: Error P357_CONTROL']);
    // A rejection with no code says only its name.
    listeners.rejection(new Error('no code'));
    expect(stderrLines()[1]).toBe('[gmux-crash] unhandled rejection: Error');
  });

  it('keeps an uncaught exception apart from a rejection with the same frames', () => {
    const { logs, dialogs, listeners } = installed();
    const err = control();
    listeners.rejection(err);
    listeners.uncaught(err);
    expect(logs.map((l) => l.event)).toEqual(['crash.rejection', 'crash.uncaught']);
    expect(dialogs).toHaveLength(1);
  });

  it('writes the repeats once at quit, under the key the first record carried', () => {
    const { logs, listeners } = installed();
    for (let i = 0; i < 2; i += 1) listeners.uncaught(control());
    listeners.rejection(new Error('p357 control rejection'));
    flushCrashRepeats();
    flushCrashRepeats();
    const repeats = logs.filter((l) => l.event === 'crash.repeats');
    expect(repeats).toHaveLength(1);
    expect(repeats[0]?.scope).toBe('crash');
    expect(repeats[0]?.level).toBe('warn');
    expect(repeats[0]?.fields).toEqual({
      repeats: [{ key: logs[0]?.fields['key'], count: 2 }]
    });
  });

  it('writes nothing at quit when nothing repeated', () => {
    const { logs, listeners } = installed();
    listeners.uncaught(control());
    flushCrashRepeats();
    expect(logs.map((l) => l.event)).toEqual(['crash.uncaught']);
  });

  it('forgets the stalest of 1,000 distinct errors, never one that keeps repeating', () => {
    const { logs, dialogs, listeners } = installed();
    const cold = (i: number): Error => withStack('Error', 'm', [`    at cold${i} (/x.js:${i}:1)`]);
    const hot = withStack('Error', 'hot', ['    at hot (/x.js:1:1)']);
    listeners.uncaught(hot);
    for (let i = 1; i <= 999; i += 1) listeners.uncaught(cold(i));
    expect(dialogs).toHaveLength(1_000);
    listeners.uncaught(hot);
    // Memory is full; a new error is still written and drawn once, and the
    // stalest, cold1, is the one forgotten.
    listeners.uncaught(cold(1_000));
    expect(dialogs).toHaveLength(1_001);
    listeners.uncaught(hot);
    expect(dialogs).toHaveLength(1_001);
    listeners.uncaught(cold(1));
    expect(dialogs).toHaveLength(1_002);
    flushCrashRepeats();
    const repeats = logs.filter((l) => l.event === 'crash.repeats');
    expect(repeats).toHaveLength(1);
    expect(repeats[0]?.fields).toEqual({
      repeats: [{ key: logs[0]?.fields['key'], count: 3 }],
      forgotten: 2
    });
  });

  it('never throws, and still draws, when what it was handed throws', () => {
    const boom = (): never => {
      throw new Error('boom');
    };
    const logThrows = installed({ log: boom });
    expect(() => logThrows.listeners.uncaught(control())).not.toThrow();
    expect(logThrows.dialogs).toHaveLength(1);

    const stoppedThrows = installed({ isStopped: boom });
    expect(() => stoppedThrows.listeners.uncaught(control())).not.toThrow();
    // A check that throws is not a refusal, so the dialog is today's.
    expect(stoppedThrows.dialogs).toHaveLength(1);

    const dialogThrows = installed({ showErrorBox: boom });
    expect(() => dialogThrows.listeners.uncaught(control())).not.toThrow();
    expect(() => dialogThrows.listeners.rejection(control())).not.toThrow();

    stderr.mockImplementation(boom);
    const stderrThrows = installed();
    expect(() => stderrThrows.listeners.uncaught(control())).not.toThrow();
    expect(stderrThrows.dialogs).toHaveLength(1);

    const hostile = installed();
    const proxy = new Proxy(
      {},
      {
        get: boom,
        getPrototypeOf: boom
      }
    );
    expect(() => hostile.listeners.uncaught(proxy)).not.toThrow();
    expect(hostile.dialogs).toEqual([{ title: TITLE, content: 'Uncaught Exception:\nundefined: undefined' }]);
  });
});

// ---------------------------------------------------------------------------
// The shipping installer and startCrashCapture
// ---------------------------------------------------------------------------

describe('the shipping installer and startCrashCapture', () => {
  const deps: CrashHandlerDeps = {
    log: () => undefined,
    showErrorBox: () => undefined,
    harness: false,
    isStopped: () => false
  };

  /** process.on, recorded and registering nothing. */
  function spyProcessOn(): MockInstance {
    return vi.spyOn(process, 'on').mockImplementation(((): NodeJS.Process => process) as never);
  }

  it('puts exactly the two listeners on the process, once however often it is called', async () => {
    vi.resetModules();
    const fresh = await import('../crash');
    const on = spyProcessOn();
    try {
      fresh.installCrashHandlers(deps);
      fresh.installCrashHandlers(deps);
      expect(on.mock.calls.map((call: unknown[]) => call[0])).toEqual([
        'uncaughtException',
        'unhandledRejection'
      ]);
      expect(on.mock.calls.every((call: unknown[]) => typeof call[1] === 'function')).toBe(true);
    } finally {
      on.mockRestore();
    }
  });

  it('starts crash capture exactly as before, then installs the handlers, even when capture fails', async () => {
    electron.start.mockReset();
    vi.resetModules();
    const fresh = await import('../crash');
    const on = spyProcessOn();
    try {
      fresh.startCrashCapture(deps);
      expect(electron.start).toHaveBeenCalledTimes(1);
      expect(electron.start).toHaveBeenCalledWith({ uploadToServer: false });
      expect(on).toHaveBeenCalledTimes(2);
      const started = electron.start.mock.invocationCallOrder[0] ?? Infinity;
      const listened = on.mock.invocationCallOrder[0] ?? -Infinity;
      expect(started).toBeLessThan(listened);
    } finally {
      on.mockRestore();
    }

    electron.start.mockReset();
    electron.start.mockImplementation(() => {
      throw new Error('crash capture unavailable');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.resetModules();
    const again = await import('../crash');
    const on2 = spyProcessOn();
    try {
      expect(() => again.startCrashCapture(deps)).not.toThrow();
      expect(on2).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      on2.mockRestore();
      warn.mockRestore();
      electron.start.mockReset();
    }
  });
});

// ---------------------------------------------------------------------------
// The composition root
// ---------------------------------------------------------------------------

describe('src/main/index.ts hands the handlers what they draw and write through', () => {
  const INDEX = join(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'index.ts');
  const sf = ts.createSourceFile(
    INDEX,
    readFileSync(INDEX, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  /** Every call whose callee is the bare identifier `name`. */
  function callsOf(name: string): ts.CallExpression[] {
    const found: ts.CallExpression[] = [];
    const walk = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
        found.push(node);
      }
      ts.forEachChild(node, walk);
    };
    walk(sf);
    return found;
  }

  /** The module each value import's local name comes from. */
  function valueImports(): Map<string, string> {
    const out = new Map<string, string>();
    for (const statement of sf.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const clause = statement.importClause;
      if (clause === undefined || clause.isTypeOnly) continue;
      const bindings = clause.namedBindings;
      if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        out.set(element.name.text, statement.moduleSpecifier.text);
      }
    }
    return out;
  }

  /** True when the file declares a binding of its own with this name. */
  function declares(name: string): boolean {
    let found = false;
    const walk = (node: ts.Node): void => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.name.text === name
      ) {
        found = true;
      }
      ts.forEachChild(node, walk);
    };
    walk(sf);
    return found;
  }

  const squash = (node: ts.Node): string => node.getText(sf).replace(/\s+/g, '');

  it('calls startCrashCapture once, right after initLogging, with exactly the four bindings', () => {
    const calls = callsOf('startCrashCapture');
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    const statement = call.parent;
    expect(ts.isExpressionStatement(statement) && statement.parent === sf).toBe(true);
    const at = sf.statements.indexOf(statement as ts.Statement);
    expect(squash(sf.statements[at - 1]!)).toBe('initLogging();');

    expect(call.arguments).toHaveLength(1);
    const arg = call.arguments[0]!;
    if (!ts.isObjectLiteralExpression(arg)) throw new Error('startCrashCapture is not handed an object literal');
    const props = new Map<string, string>();
    for (const prop of arg.properties) {
      if (!ts.isPropertyAssignment(prop)) throw new Error(`a binding that is not name: value: ${prop.getText(sf)}`);
      props.set(prop.name.getText(sf), squash(prop.initializer));
    }
    expect(Object.fromEntries(props)).toEqual({
      log: 'logEvent',
      showErrorBox: '(title,content)=>dialog.showErrorBox(title,content)',
      harness: 'isHarnessLaunch(process.env)',
      isStopped: 'isManifestStopped'
    });

    const imports = valueImports();
    expect(imports.get('startCrashCapture')).toBe('./log/crash');
    expect(imports.get('logEvent')).toBe('./log');
    expect(imports.get('dialog')).toBe('electron');
    expect(imports.get('isHarnessLaunch')).toBe('./harness/launch-gate');
    expect(imports.get('isManifestStopped')).toBe('./manifest/store');
    for (const name of ['logEvent', 'dialog', 'isHarnessLaunch', 'isManifestStopped']) {
      expect(declares(name), `index.ts declares its own ${name}`).toBe(false);
    }
  });

  it('installs the manifest fault seam directly after the push seam, before the harness dispatch', () => {
    const push = callsOf('installPushSeam');
    const fault = callsOf('installManifestFault');
    const dispatch = callsOf('dispatchHarness');
    expect(push).toHaveLength(1);
    expect(fault).toHaveLength(1);
    expect(dispatch).toHaveLength(1);
    const pushStatement = push[0]!.parent;
    const faultStatement = fault[0]!.parent;
    expect(ts.isExpressionStatement(faultStatement)).toBe(true);
    expect(fault[0]!.arguments).toHaveLength(0);
    const block = pushStatement.parent;
    if (!ts.isBlock(block)) throw new Error('installPushSeam() is not a statement of a block');
    const at = block.statements.indexOf(pushStatement as ts.Statement);
    expect(block.statements[at + 1]).toBe(faultStatement);
    expect(fault[0]!.getStart(sf)).toBeLessThan(dispatch[0]!.getStart(sf));
    expect(valueImports().get('installManifestFault')).toBe('./harness/manifest-fault');
  });
});
