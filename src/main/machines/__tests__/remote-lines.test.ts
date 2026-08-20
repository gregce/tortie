/**
 * Reading the last lines of a session on another machine (Phase 100).
 *
 * Two halves, tested two ways.
 *
 * The PURE halves are tested for real, being the depth clamp, the byte ceiling
 * and the line count. Every one of them decides a number a person reads on
 * screen, and Phase 99.1 is the record of what happens when a cut is carried
 * through main and never drawn.
 *
 * The READ itself crosses to another computer, so the exec plane, the link and
 * the feed are replaced here and what these tests hold is the SHAPE of the read:
 * which argv is composed, which refusals send nothing at all, and that no state
 * of a machine ever throws. The live read is driven by
 * `node build/probe-p100-lines.mjs` against a loopback scratch machine, where
 * the body is compared byte for byte against the pane's own `capture-pane`.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, that
 * the bytes come back whole, or how long a read takes. The probe measures all
 * three and prints them.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REMOTE_SESSION_LINES_BYTES_MAX } from '@shared/ipc';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every argv this file caused to be sent. It stays empty for every refusal. */
let execCalls: string[][] = [];
let execAnswer: (args: readonly string[]) => string = () => 'one line\n';
let connected = new Set<string>();
let contextReady = new Set<string>();
let rows: Array<{ id: string; machineId: string; tmuxId: string }> = [];

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    execCalls.push([...args]);
    return Promise.resolve(execAnswer(args));
  }
}));

vi.mock('../remote-run', () => ({
  machineIsConnected: (machineId: string) => connected.has(machineId)
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => {
    if (!contextReady.has(machineId)) throw new Error('no connection');
    return { kind: 'remote', machineId };
  },
  remoteSessionRow: (sessionId: string) =>
    rows.find((one) => one.id === sessionId) ?? null
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => (id === 'far' ? { id, label: 'Studio' } : null),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id
}));

const {
  clampSessionLineDepth,
  countLines,
  cutToCeiling,
  readSessionLinesOnMachine
} = await import('../remote-lines');
const { remoteCaptureArgs } = await import('../remote-capsule');

/** One escape byte, written as an escape so this file holds no control byte. */
const ESC = '\u001b';
/** One bell, being a C0 control a program on that machine can print freely. */
const BELL = '\u0007';

beforeEach(() => {
  execCalls = [];
  execAnswer = () => 'one line\n';
  connected = new Set(['far']);
  contextReady = new Set(['far']);
  rows = [{ id: 's1', machineId: 'far', tmuxId: '$7' }];
});

// ---------------------------------------------------------------------------
// The depth
// ---------------------------------------------------------------------------

describe('the depth one read asks for', () => {
  it('clamps below at the screen alone and above at the ceiling', () => {
    expect(clampSessionLineDepth(-5)).toBe(0);
    expect(clampSessionLineDepth(0)).toBe(0);
    expect(clampSessionLineDepth(999_999)).toBe(25_000);
    expect(clampSessionLineDepth(25_000)).toBe(25_000);
  });

  it('truncates a fraction rather than rounding it', () => {
    expect(clampSessionLineDepth(1000.7)).toBe(1000);
  });

  it('reads a number that is not a number as the screen alone', () => {
    // Neither value can come from the panel, which sends one of four constants.
    // The answer is the smallest read rather than the largest, because a number
    // nobody can explain must not turn into the deepest command this module
    // sends.
    expect(clampSessionLineDepth(Number.NaN)).toBe(0);
    expect(clampSessionLineDepth(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('is the number the argv carries and the number the result reports', async () => {
    const out = await readSessionLinesOnMachine({
      sessionId: 's1',
      lines: 999_999
    });
    expect(out.asked).toBe(25_000);
    expect(execCalls[0]).toEqual([
      'capture-pane',
      '-p',
      '-e',
      '-J',
      '-t',
      '$7',
      '-S',
      '-25000'
    ]);
  });
});

// ---------------------------------------------------------------------------
// The argv
// ---------------------------------------------------------------------------

describe('what crosses to the machine', () => {
  it('sends exactly the argv the background copy already composes', async () => {
    await readSessionLinesOnMachine({ sessionId: 's1', lines: 1000 });
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0]).toEqual(remoteCaptureArgs('$7', 1000));
    expect(execCalls[0]).toEqual([
      'capture-pane',
      '-p',
      '-e',
      '-J',
      '-t',
      '$7',
      '-S',
      '-1000'
    ]);
  });

  it('aims at the immutable identifier and never at a name', async () => {
    rows = [{ id: 's1', machineId: 'far', tmuxId: '$12' }];
    await readSessionLinesOnMachine({ sessionId: 's1', lines: 0 });
    expect(execCalls[0]?.[5]).toBe('$12');
    expect(execCalls[0]?.join(' ')).not.toContain('s1');
  });

  it('composes -S -0 for the screen alone', async () => {
    await readSessionLinesOnMachine({ sessionId: 's1', lines: 0 });
    expect(execCalls[0]?.slice(-2)).toEqual(['-S', '-0']);
  });
});

// ---------------------------------------------------------------------------
// The three refusals, and every one of them sends nothing
// ---------------------------------------------------------------------------

describe('the states that are not a read', () => {
  it('answers noSession and sends nothing when there is no row', async () => {
    rows = [];
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 100 });
    expect(out.mode).toBe('noSession');
    expect(out.machineId).toBeNull();
    expect(out.machineLabel).toBeNull();
    expect(out.text).toBe('');
    expect(execCalls).toEqual([]);
  });

  it('answers notConnected and sends nothing when the link is down', async () => {
    connected = new Set();
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 100 });
    expect(out.mode).toBe('notConnected');
    expect(out.machineId).toBe('far');
    expect(out.machineLabel).toBe('Studio');
    expect(execCalls).toEqual([]);
  });

  it('answers notConnected and sends nothing when no context is ready', async () => {
    contextReady = new Set();
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 100 });
    expect(out.mode).toBe('notConnected');
    expect(execCalls).toEqual([]);
  });

  it('answers unreachable rather than throwing when the machine did not answer', async () => {
    execAnswer = () => {
      throw new Error('connection closed');
    };
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 100 });
    expect(out.mode).toBe('unreachable');
    expect(out.text).toBe('');
    expect(out.lines).toBe(0);
    expect(out.bytes).toBe(0);
    expect(out.truncated).toBe(false);
    expect(execCalls).toHaveLength(1);
  });

  it('reports the depth it would have asked for on every refusal', async () => {
    rows = [];
    const out = await readSessionLinesOnMachine({
      sessionId: 's1',
      lines: 999_999
    });
    expect(out.asked).toBe(25_000);
  });
});

// ---------------------------------------------------------------------------
// The bytes
// ---------------------------------------------------------------------------

describe('what the panel is handed', () => {
  it('takes the colour and the single control bytes out of the body', async () => {
    execAnswer = () =>
      `${ESC}[31mred${ESC}[0m and ${ESC}]0;title${BELL}plain\u0001\u0002x\n`;
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.text).toBe('red and plainx\n');
    expect(out.text).not.toContain(ESC);
    expect(out.text).not.toContain(BELL);
  });

  it('keeps the tab, the newline and the carriage return', async () => {
    execAnswer = () => 'a\tb\r\nc\n';
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.text).toBe('a\tb\r\nc\n');
  });

  it('reports lines and bytes of the FINAL text', async () => {
    execAnswer = () => `${ESC}[32mone${ESC}[0m\ntwo\n`;
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.text).toBe('one\ntwo\n');
    expect(out.lines).toBe(2);
    expect(out.bytes).toBe(8);
  });

  it('says truncated is false when nothing was dropped', async () => {
    execAnswer = () => 'small\n';
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.truncated).toBe(false);
    expect(out.text).toBe('small\n');
  });

  it('keeps the NEWEST bytes and says so when the ceiling bit', async () => {
    // Each line is 11 bytes, so the body runs past the ceiling and the last
    // line of it is the one a person most wants to read.
    const line = 'x'.repeat(10);
    const count = Math.ceil(REMOTE_SESSION_LINES_BYTES_MAX / 11) + 100;
    const body = `${Array.from({ length: count }, () => line).join('\n')}\nLAST\n`;
    execAnswer = () => body;
    const out = await readSessionLinesOnMachine({
      sessionId: 's1',
      lines: 25_000
    });
    expect(out.truncated).toBe(true);
    expect(out.text.endsWith('LAST\n')).toBe(true);
    expect(out.bytes).toBeLessThanOrEqual(REMOTE_SESSION_LINES_BYTES_MAX);
    // The panel never opens on half a line.
    expect(out.text.startsWith(line)).toBe(true);
  });

  it('counts a final line with no newline after it as one line', async () => {
    execAnswer = () => 'one\ntwo';
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.lines).toBe(2);
  });

  it('answers an empty screen with an empty body and no error', async () => {
    execAnswer = () => '';
    const out = await readSessionLinesOnMachine({ sessionId: 's1', lines: 10 });
    expect(out.mode).toBe('read');
    expect(out.text).toBe('');
    expect(out.lines).toBe(0);
    expect(out.bytes).toBe(0);
  });
});

describe('the ceiling, on its own', () => {
  it('leaves a body under the ceiling alone', () => {
    expect(cutToCeiling('a\nb\n', 100)).toEqual({
      text: 'a\nb\n',
      truncated: false
    });
  });

  it('drops the oldest bytes and the part line they end in', () => {
    const cut = cutToCeiling('oldest\nmiddle\nnewest\n', 12);
    expect(cut.truncated).toBe(true);
    expect(cut.text).toBe('newest\n');
  });

  it('keeps a cut body with no newline in it rather than answering nothing', () => {
    const cut = cutToCeiling('abcdefghij', 4);
    expect(cut.truncated).toBe(true);
    expect(cut.text).toBe('ghij');
  });
});

describe('counting lines', () => {
  it('counts nothing in an empty body', () => {
    expect(countLines('')).toBe(0);
  });

  it('counts one line per newline for a body that ends in one', () => {
    expect(countLines('a\n')).toBe(1);
    expect(countLines('a\nb\n')).toBe(2);
  });

  it('counts the final unterminated line', () => {
    expect(countLines('a')).toBe(1);
    expect(countLines('a\nb')).toBe(2);
  });

  it('counts a body that is one newline as one line', () => {
    expect(countLines('\n')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// What the source text may not say, read off disk
// ---------------------------------------------------------------------------

describe('the refusals, read off disk', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'remote-lines.ts'),
    'utf8'
  );

  it('names neither of the two verbs a scrollbar would need', () => {
    // Research 57 section 3.1 refused a real remote scrollbar twice over. A
    // builder who finds they need either verb has designed the wrong thing.
    // Condition 54 of build/conformance-machines.mjs holds the same rule. The
    // two names are composed here so this file can hold the rule without
    // breaking it.
    expect(source).not.toContain(`copy${'-'}mode`);
    expect(source).not.toContain(`send${'-'}keys`);
  });

  it('takes exactly one name from the saved output side', () => {
    // A read is not a capsule. Importing `storeCapsuleText` here would make a
    // person pressing a menu item write a snapshot generation.
    const imports = [
      ...source.matchAll(
        /import\s+\{([^}]*)\}\s+from\s+'\.\.\/restore\/snapshots'/g
      )
    ].map((hit) => (hit[1] ?? '').replace(/\s+/g, ''));
    expect(imports).toEqual(['stripControls']);
    // The header names the function it does not call, so the check is for a
    // call rather than for the word.
    expect(source).not.toContain('storeCapsuleText(');
  });
});
