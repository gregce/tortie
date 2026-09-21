/**
 * Phase 281.1, rewritten to BYTES by Phase 287. A `-i` line `security` would
 * cut is never sent, and the cap that decides it counts bytes.
 *
 * MEASURED (`build/p287/SPEC.md` §1, four runs on macOS 15.7.9 against
 * `/usr/bin/security` from `Security-61439.140.12.706.1`, each under a scratch
 * `HOME` where no default keychain resolves, on a scratch keychain named by the
 * last token of the line): `security -i` reads at most 4,095 bytes of command
 * per read, so a 4,096 byte line with its newline writes and reads back byte
 * for byte; a 4,097 byte line has its last byte split off and read as a second
 * command; and at 4,098 bytes and above the keychain path loses its own last
 * byte, nothing is written, and the program does not exit with stdin at end of
 * file until it is killed. The edge is a BYTE count, not a character count: a
 * 4,098 byte line of 4,088 characters hangs while a 4,096 byte line of 4,096
 * characters writes.
 *
 * Phase 281.1's cap compared `.length`, which is UTF-16 units, and the one
 * component of Tortie's line that can carry non-ASCII is the harness keychain
 * path. Measured at `a4f44588`: the shipping runner with a scratch keychain
 * path of 100 accented letters sent a 4,100 byte line and the program was
 * SPAWNED. That is item (i) below, and it is what this phase closes.
 *
 * Three refusals now stand before any spawn, and each is driven here over a
 * runner or a `/bin/sh` program of this file's own: no `/usr/bin/security`
 * runs, no keychain is opened.
 *
 *  1. `securityLineFits` compares `Buffer.byteLength` and nothing else.
 *  2. `keychainWrite` REJECTS with `CredentialTooLarge` for a command line over
 *     the cap and never calls its runner. It is a rejection rather than the
 *     `false` every other refusal answers because the one write in this domain
 *     has to tell this reason apart from an ordinary failure to say so.
 *  3. `defaultSecurityRunner` with a keychain file answers `tooLong` for an `-i`
 *     input whose suffix takes it over the cap in BYTES, spawns nothing, and
 *     does not count the call; under the cap it spawns the program with the
 *     suffixed line on stdin.
 */

import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  defaultSecurityRunner,
  keychainWrite,
  SECURITY_LINE_MAX_BYTES,
  securityCallCount,
  securityLineFits,
  type SecurityRunner
} from '../security';
import { CredentialTooLarge } from '../swap';

const scratch = mkdtempSync(join(tmpdir(), 'p2811-line-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const SERVICE = 'Tortie-credentials-p2811.line';
const ACCOUNT = 'p281-vendor';
const HEAD = `add-generic-password -U -a "${ACCOUNT}" -s "${SERVICE}" -X "`;

/** A payload whose composed `-i` line, newline included, is exactly `bytes` long. */
function payloadForLine(bytes: number): string {
  const hexChars = bytes - HEAD.length - '"\n'.length;
  expect(hexChars % 2).toBe(0);
  return 'x'.repeat(hexChars / 2);
}

/** The line `keychainWrite` composes for a payload, as this file spells it. */
function lineFor(payload: string): string {
  return `${HEAD}${Buffer.from(payload, 'utf8').toString('hex')}"\n`;
}

function recording(): SecurityRunner & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    run: async (_argv, stdin) => {
      lines.push(stdin ?? '');
      return { code: 0, stdout: '' };
    }
  };
}

describe('Phase 287: the cap is a byte count', () => {
  it('fits a 4,000 byte string of 2,000 accented letters and refuses one byte more', () => {
    // 2,000 UTF-16 units either way, so a cap comparing `.length` answers
    // "fits" to both of them.
    const atCap = 'é'.repeat(2_000);
    expect(atCap.length).toBe(2_000);
    expect(Buffer.byteLength(atCap, 'utf8')).toBe(4_000);
    expect(securityLineFits(atCap)).toBe(true);
    const over = `${atCap}x`;
    expect(Buffer.byteLength(over, 'utf8')).toBe(4_001);
    expect(securityLineFits(over)).toBe(false);
  });

  it('sits under the measured buffer with the stated margin', () => {
    // 4,096 bytes with the newline is the longest line that arrives whole
    // (build/p287/SPEC.md §1.5), and the margin is 96 bytes.
    expect(SECURITY_LINE_MAX_BYTES).toBeLessThanOrEqual(4_096 - 96);
    // And above every line the measurement wrote and read back.
    expect(SECURITY_LINE_MAX_BYTES).toBeGreaterThanOrEqual(3_995);
  });
});

describe('Phase 287: keychainWrite rejects a line security would cut', () => {
  it('sends a line of exactly SECURITY_LINE_MAX_BYTES bytes, byte for byte', async () => {
    const at = recording();
    const payload = payloadForLine(SECURITY_LINE_MAX_BYTES);
    expect(await keychainWrite(at, SERVICE, ACCOUNT, payload)).toBe(true);
    expect(at.lines).toEqual([lineFor(payload)]);
    expect(Buffer.byteLength(at.lines[0] ?? '', 'utf8')).toBe(SECURITY_LINE_MAX_BYTES);
  });

  it('rejects CredentialTooLarge two bytes over the cap and never calls its runner', async () => {
    const over = recording();
    await expect(
      keychainWrite(over, SERVICE, ACCOUNT, payloadForLine(SECURITY_LINE_MAX_BYTES + 2))
    ).rejects.toBeInstanceOf(CredentialTooLarge);
    expect(over.lines).toEqual([]);
  });

  it('names no payload, no length and no part of either in what it throws', async () => {
    const payload = payloadForLine(SECURITY_LINE_MAX_BYTES + 2);
    let thrown: unknown = null;
    try {
      await keychainWrite(recording(), SERVICE, ACCOUNT, payload);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CredentialTooLarge);
    const said = `${(thrown as Error).name} ${(thrown as Error).message}`;
    expect(said).not.toContain(payload.slice(0, 16));
    expect(said).not.toMatch(/[0-9]/);
  });

  it('turns a runner that answers tooLong into the same rejection', async () => {
    // A runner whose own keychain suffix took the line over, which is the one
    // thing `keychainWrite`'s own check cannot see.
    const suffixed: SecurityRunner = { run: async () => ({ code: 1, stdout: '', tooLong: true }) };
    await expect(keychainWrite(suffixed, SERVICE, ACCOUNT, 'p287')).rejects.toBeInstanceOf(
      CredentialTooLarge
    );
  });
});

describe('Phase 287: the real runner refuses by BYTES what its keychain suffix takes over', () => {
  const program = join(scratch, 'security');
  const record = join(scratch, 'stdin');
  writeFileSync(program, `#!/bin/sh\ncat > "${record}"\nexit 0\n`, 'utf8');
  chmodSync(program, 0o755);
  /** A scratch keychain path of 100 accented letters: 100 more bytes than units. */
  const wideFile = join(scratch, `kc-${'é'.repeat(100)}`, 'p287-scratch.keychain-db');
  const asciiFile = join(scratch, 'p2811-scratch.keychain-db');

  it('answers tooLong, spawns nothing and counts nothing for a line at the cap in units and over it in bytes', async () => {
    const suffix = ` "${wideFile}"\n`;
    const bare = `${HEAD}${'x'.repeat(SECURITY_LINE_MAX_BYTES + 1 - suffix.length - HEAD.length - 2)}"\n`;
    const suffixed = `${bare.replace(/\n$/, '')}${suffix}`;
    // EXACTLY at the cap in UTF-16 units, and 100 bytes over it.
    expect(suffixed.length).toBe(SECURITY_LINE_MAX_BYTES);
    expect(Buffer.byteLength(suffixed, 'utf8')).toBe(SECURITY_LINE_MAX_BYTES + 100);

    const before = securityCallCount();
    const runner = defaultSecurityRunner(wideFile, program);
    expect(await runner.run(['-i'], bare)).toEqual({ code: 1, stdout: '', tooLong: true });
    // NOTHING RAN, so nothing is counted: the refusal moved above the count.
    expect(securityCallCount()).toBe(before);
    expect(existsSync(record)).toBe(false);
  });

  it('answers tooLong for an ASCII line the suffix takes over, and spawns nothing', async () => {
    const suffix = ` "${asciiFile}"\n`;
    const bare = `${HEAD}${'ab'.repeat((SECURITY_LINE_MAX_BYTES - HEAD.length - 2 - 2) / 2)}"\n`;
    expect(Buffer.byteLength(bare, 'utf8')).toBeLessThanOrEqual(SECURITY_LINE_MAX_BYTES);
    expect(bare.length - 1 + suffix.length).toBeGreaterThan(SECURITY_LINE_MAX_BYTES);
    const runner = defaultSecurityRunner(asciiFile, program);
    expect(await runner.run(['-i'], bare)).toEqual({ code: 1, stdout: '', tooLong: true });
    expect(existsSync(record)).toBe(false);
  });

  it('spawns the program with the suffixed line when it fits, and counts that one call', async () => {
    const before = securityCallCount();
    const runner = defaultSecurityRunner(asciiFile, program);
    const bare = `${HEAD}${'ab'.repeat(8)}"\n`;
    expect(await runner.run(['-i'], bare)).toEqual({ code: 0, stdout: '' });
    expect(securityCallCount()).toBe(before + 1);
    expect(readFileSync(record, 'utf8')).toBe(
      `${bare.replace(/\n$/, '')} "${asciiFile}"\n`
    );
  });
});
