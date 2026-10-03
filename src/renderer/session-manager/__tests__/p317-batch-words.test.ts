/**
 * Phase 317. The phone's End these says the Mac sheet's words, and this is
 * the Mac's half of holding the two to one file (build/p317/SPEC.md §5.8.7,
 * §7.2, §14 finding 4).
 *
 * ios/TortieTests/Fixtures/batch-words.json holds every word End these
 * composes, for n = 1, 2 and 12 per counting composer, `batchBody` for
 * `anyRemote` false AND true (the confirmation's body, which the first draft
 * of the phone left out), the skipped line's arms, the outcome words, and the
 * four constants. The phone builder writes it; ios/TortieTests/EndWordsTests.swift
 * asserts the phone's composers (ios/Tortie/Style/Copy.swift) produce it, and
 * this file asserts the Mac's own composers in ../copy.ts produce the SAME
 * file, so neither side can drift without the other's test reading red.
 *
 * The shape, agreed with the phone builder: `{ n, constants: { NAME: text },
 * cases: [{ composer, args, text }] }`, each case calling the Mac function
 * named with its arguments exactly as the Mac takes them. A skipped line that
 * skips nothing is the Mac's empty string, which the phone says by saying
 * nothing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as copy from '../copy';

interface BatchWordsFixture {
  n: number[];
  constants: Record<string, string>;
  cases: { composer: string; args: unknown[]; text: string }[];
}

const FIXTURE = join(__dirname, '..', '..', '..', '..', 'ios', 'TortieTests', 'Fixtures', 'batch-words.json');
const doc = JSON.parse(readFileSync(FIXTURE, 'utf8')) as BatchWordsFixture;
const mac = copy as unknown as Record<string, unknown>;

/** The composers the phone's End these draws, each a function of ../copy.ts. */
const COUNTING = ['selectedCount', 'batchHeading', 'batchConfirmLabel', 'batchRunningHeading'] as const;
const COMPOSERS = [...COUNTING, 'batchDoneHeading', 'batchSkippedLine', 'batchBody', 'batchOutcomeWord'] as const;
const CONSTANTS = ['END_SESSION', 'END_SELECTED', 'BATCH_STOP', 'BATCH_DONE'] as const;

const argsOf = (composer: string): string[] =>
  doc.cases.filter((c) => c.composer === composer).map((c) => JSON.stringify(c.args));

describe("Phase 317: the Mac's composers produce every word in the phone's fixture", () => {
  it('every constant is the Mac’s own word, byte for byte', () => {
    expect(Object.keys(doc.constants).sort()).toEqual([...CONSTANTS].sort());
    for (const name of CONSTANTS) expect(mac[name], name).toBe(doc.constants[name]);
  });

  it('every case is the Mac composer’s answer, byte for byte', () => {
    const wrong: string[] = [];
    for (const c of doc.cases) {
      const fn = mac[c.composer];
      if (typeof fn !== 'function') {
        wrong.push(`${c.composer} is not a function of copy.ts`);
        continue;
      }
      const got = (fn as (...a: unknown[]) => unknown)(...c.args);
      if (got !== c.text) wrong.push(`${c.composer}(${JSON.stringify(c.args)}): the Mac says ${JSON.stringify(got)}, the fixture ${JSON.stringify(c.text)}`);
    }
    expect(wrong).toEqual([]);
  });

  it('the fixture covers n = 1, 2 and 12 for every counting composer, and the done heading at each n', () => {
    expect(doc.n).toEqual([1, 2, 12]);
    for (const composer of COUNTING) {
      expect(argsOf(composer), composer).toEqual(expect.arrayContaining(doc.n.map((n) => JSON.stringify([n]))));
    }
    expect(argsOf('batchDoneHeading')).toEqual(expect.arrayContaining(doc.n.map((n) => JSON.stringify([n, n]))));
  });

  it('the fixture holds batchBody for anyRemote false AND true, and they differ', () => {
    expect(argsOf('batchBody').sort()).toEqual(['[false]', '[true]']);
    const local = doc.cases.find((c) => c.composer === 'batchBody' && c.args[0] === false)?.text;
    const remote = doc.cases.find((c) => c.composer === 'batchBody' && c.args[0] === true)?.text;
    expect(local).toBe(copy.batchBody(false));
    expect(remote).toBe(copy.batchBody(true));
    expect(remote).not.toBe(local);
    expect(remote?.startsWith(local ?? '\u0000')).toBe(true);
  });

  it('the skipped line is there for one reason at a time, together, and for nothing skipped', () => {
    const lines = doc.cases.filter((c) => c.composer === 'batchSkippedLine');
    expect(lines.some((c) => c.text === '')).toBe(true);
    for (const reason of ['ended', 'unreachable', 'gone']) {
      expect(lines.some((c) => (c.args[0] as Record<string, number>)[reason] === 1), reason).toBe(true);
    }
  });

  it('every outcome word a row can draw is in the fixture', () => {
    const states = doc.cases
      .filter((c) => c.composer === 'batchOutcomeWord')
      .map((c) => {
        const o = c.args[0] as { state: string; reason?: string };
        return o.reason === undefined ? o.state : `${o.state}:${o.reason}`;
      })
      .sort();
    expect(states).toEqual(
      ['ended', 'ending', 'failed', 'not-run', 'skipped:ended', 'skipped:gone', 'skipped:unreachable'].sort()
    );
  });

  it('every composer the phone draws is in the fixture, and nothing else is', () => {
    const named = [...new Set(doc.cases.map((c) => c.composer))].sort();
    expect(named).toEqual([...COMPOSERS].sort());
  });
});
