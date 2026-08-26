/**
 * The argv defense, attacked from the inside (Phase 63).
 *
 * These are the cases that decide whether the Zen line "Nothing Tortie draws
 * ever starts a process on its own" is true. The gate proves the same claim
 * over a whole run of the checkers, and these prove it one function at a time,
 * on shapes a fixture would not naturally produce.
 */

import { describe, expect, it } from 'vitest';
import {
  ARCH_ARGV_WORDS,
  ArchArgvError,
  assertArchArgv,
  catFileBatchCall,
  logNameOnlyCall,
  lsFilesCall,
  revParseHeadCall,
  statusPorcelainCall
} from '../argv-guard';

const OID = '0123456789abcdef0123456789abcdef01234567';

describe('assertArchArgv', () => {
  it('takes the compiled in words and nothing else at all', () => {
    expect([...assertArchArgv(['ls-files', '-z'])]).toEqual(['ls-files', '-z']);
    // The list is closed. An object name and a range of two were accepted by
    // the first build for a freshness range that no longer exists, and a
    // pattern is the thing a later round widens by one character.
    expect(() => assertArchArgv([OID])).toThrow(ArchArgvError);
    expect(() => assertArchArgv([`${OID}..${OID}`])).toThrow(ArchArgvError);
    expect(() => assertArchArgv([`${OID}..HEAD`])).toThrow(ArchArgvError);
  });

  it('refuses every shape a contract value could take', () => {
    const hostile = [
      'src/main',
      'docs/arch/contract.json',
      '--upload-pack=touch',
      '-z-ish',
      'HEAD:src/main/arch/schema.ts',
      '',
      'src/**/*.ts',
      `HEAD..${OID}x`,
      'HEAD..HEAD'
    ];
    for (const element of hostile) {
      let threw: ArchArgvError | null = null;
      try {
        assertArchArgv(['ls-files', element]);
      } catch (err) {
        threw = err as ArchArgvError;
      }
      expect(threw, `it accepted "${element}"`).not.toBeNull();
      expect(threw?.element).toBe(element);
      expect(threw?.message).toContain('no value');
    }
  });

  it('hands back a frozen copy, so a caller cannot add an element after the check', () => {
    const argv = assertArchArgv(['ls-files', '-z']);
    expect(Object.isFrozen(argv)).toBe(true);
  });
});

describe('the five calls, and there are no others', () => {
  it('composes exactly the argv the gate pins', () => {
    expect([...lsFilesCall().argv]).toEqual(['ls-files', '-z']);
    expect([...revParseHeadCall().argv]).toEqual(['rev-parse', 'HEAD']);
    expect([...statusPorcelainCall().argv]).toEqual(['status', '--porcelain', '-z']);
    expect([...logNameOnlyCall().argv]).toEqual([
      'log',
      '--format=%H',
      '--name-only',
      '--no-renames',
      '-z'
    ]);
  });

  it('puts every evidence path on stdin and never on argv', () => {
    const call = catFileBatchCall(['HEAD:src/app/main.ts', 'HEAD:src/core/engine.ts']);
    expect([...call.argv]).toEqual(['cat-file', '--batch']);
    expect(call.stdin).toBe('HEAD:src/app/main.ts\nHEAD:src/core/engine.ts\n');
    expect(call.argv.join(' ')).not.toContain('src/');
  });

  it('refuses a request holding a newline, because the protocol is one per line', () => {
    expect(() => catFileBatchCall(['HEAD:a\nHEAD:/etc/passwd'])).toThrow(ArchArgvError);
  });

  it('takes no argument at all, so a freshness range cannot be smuggled in', () => {
    // There is no parameter to attack. The walk is the whole history and the
    // cut is made in process by `commitsSinceContract`, because a range would
    // need the commit a contract file last changed at, and asking git for that
    // means naming a path from inside docs/arch on a command line.
    expect(logNameOnlyCall.length).toBe(0);
    expect(logNameOnlyCall().argv.join(' ')).not.toContain('..');
  });

  it('gives no composer a parameter that reaches argv', () => {
    // This is what actually keeps the claim, rather than the guard. Four of the
    // five take nothing, and the fifth's argument goes to stdin.
    expect(lsFilesCall.length).toBe(0);
    expect(revParseHeadCall.length).toBe(0);
    expect(statusPorcelainCall.length).toBe(0);
    expect(logNameOnlyCall.length).toBe(0);
    expect(catFileBatchCall.length).toBe(1);
    expect([...catFileBatchCall(['HEAD:x']).argv]).toEqual(['cat-file', '--batch']);
  });

  it('never names a program, so the runner decides what git is', () => {
    for (const word of ARCH_ARGV_WORDS) {
      expect(word).not.toContain('/');
      expect(word).not.toBe('git');
    }
  });
});
