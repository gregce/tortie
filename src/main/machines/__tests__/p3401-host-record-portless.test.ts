/**
 * Phase 340.1, item 1, kept as it was: a machine on a non-default port and a
 * bare `host` line (`../host-record.ts`, "A bare host line, for a machine on
 * another port").
 *
 * Off port 22 ssh asks `[host]:port` first and, finding no key there, asks the
 * bare host over the same files, accepting the bare line only when it holds
 * the key the machine presents. This module reads the files before the test,
 * when that key is not known, so it can only guess. The builder of 340.1 made
 * any bare line count. The reverify measured that with `/usr/bin/ssh` as the
 * oracle over 1,026 rows: 192 rows the parent read wrongly were fixed (a login
 * file can no longer draw Tortie's question over a machine ssh accepts by a
 * bare line), and 108 rows were made worse (a machine whose bare line holds
 * another key, which ssh still asks about, lost Tortie's own first-seen
 * question and Trust it). A reading of the files cannot tell the two apart,
 * and a row worse than the build before it is not landed, so the fix round
 * took the bare name back out. This file pins that, so the trade is not made
 * again without a ruling: off port 22 a bare line does not vouch for the
 * machine in any of the three files, and on port 22 it still does.
 *
 * Every file this test writes is under one temporary folder it removes, and
 * the global list is always handed in, so nothing in `/etc` can change an
 * answer.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hostKeyRecorded } from '../host-record';

const KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';

/** `ssh-keygen -H` over `127.0.0.1` (bare, no port), made by the real program. */
const HASHED_BARE = `|1|T/JDri7yBTyMPra3iPegU9EkwGg=|MDSy5Si9au+DwVs/QbBaEBLG210= ${KEY}`;

describe('a bare host line and a machine on port 2222, in each of the three file kinds', () => {
  let root = '';
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'tortie-p3401-hostrec-'));
  });
  afterAll(() => {
    if (root.length > 0) rmSync(root, { recursive: true, force: true });
  });

  /** Three files, one of which holds `line`; the other two are absent. */
  function readWith(kind: 'tortie' | 'user' | 'global', line: string, port: number | null): boolean {
    const dir = mkdtempSync(join(root, `${kind}-`));
    const files = { tortie: join(dir, 'known-machines'), user: join(dir, 'person') };
    const global = join(dir, 'global');
    const path = kind === 'tortie' ? files.tortie : kind === 'user' ? files.user : global;
    writeFileSync(path, `${line}\n`);
    return hostKeyRecorded(files, '127.0.0.1', port, [global]);
  }

  const bareLines = [
    `127.0.0.1 ${KEY}`,
    HASHED_BARE,
    `localhost,127.0.0.1 ${KEY}`,
    `127.0.0.* ${KEY}`
  ];

  for (const kind of ['tortie', 'user', 'global'] as const) {
    it(`off port 22, a bare line in ${kind === 'tortie' ? 'Tortie’s own file' : kind === 'user' ? 'the person’s file' : 'ssh’s global record'} does not vouch for the machine`, () => {
      for (const line of bareLines) expect(readWith(kind, line, 2222)).toBe(false);
      // The bracketed name is still the one that counts there.
      expect(readWith(kind, `[127.0.0.1]:2222 ${KEY}`, 2222)).toBe(true);
    });

    it(`on port 22 or no port, the same bare line in ${kind} still does`, () => {
      for (const line of bareLines) {
        expect(readWith(kind, line, 22)).toBe(true);
        expect(readWith(kind, line, null)).toBe(true);
      }
    });
  }
});
