/**
 * Phase 374, L6: the presence of `statusLine` in agy's own settings file, and
 * nothing else of it (build/p374/SPEC.md D10; his answer 3 of 2026-11-24).
 *
 * HERMETIC. Every home here is a temporary folder and is handed in; nothing
 * under a real home is named.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { agyOwnsStatusLine } from '../own-status-line';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-own-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let n = 0;
/** A home whose settings file is planted by `plant`, which is handed its path. */
function home(plant: ((file: string) => void) | null): string {
  n += 1;
  const at = join(root, `home ${String(n)}`);
  mkdirSync(at);
  if (plant !== null) {
    mkdirSync(join(at, '.gemini', 'antigravity-cli'), { recursive: true });
    plant(join(at, '.gemini', 'antigravity-cli', 'settings.json'));
  }
  return at;
}
const text = (t: string) => (file: string): void => writeFileSync(file, t);

describe('L6: the twelve shapes and their neighbours', () => {
  const rows: Array<[string, () => string, boolean]> = [
    ['no file and no folder', () => home(null), false],
    ['a folder and no file', () => home(() => undefined), false],
    ['no statusLine', () => home(text('{"theme":"dark","other":{"statusLine":{"type":"command"}}}')), false],
    ['a null statusLine', () => home(text('{"statusLine":null}')), false],
    ['one switched off', () => home(text('{"statusLine":{"type":"command","command":"x","enabled":false}}')), false],
    ['a link to one with none', () => home((file) => { writeFileSync(`${file}.real`, '{}'); symlinkSync(`${file}.real`, file); }), false],
    ['one on', () => home(text('{"statusLine":{"type":"command","command":"x"}}')), true],
    ['one with enabled true', () => home(text('{"statusLine":{"enabled":true}}')), true],
    ['one with enabled "false", which is not false', () => home(text('{"statusLine":{"enabled":"false"}}')), true],
    ['one with enabled 0', () => home(text('{"statusLine":{"enabled":0}}')), true],
    ['an empty object', () => home(text('{"statusLine":{}}')), true],
    ['a string', () => home(text('{"statusLine":"mine"}')), true],
    ['false', () => home(text('{"statusLine":false}')), true],
    ['an array', () => home(text('{"statusLine":[{"enabled":false}]}')), true],
    ['not JSON', () => home(text('{"theme":"dark",}')), true],
    ['JSON with comments', () => home(text('// mine\n{}')), true],
    ['empty', () => home(text('')), true],
    ['not an object', () => home(text('[]')), true],
    ['null', () => home(text('null')), true],
    ['larger than 256 KiB', () => home(text(`{"pad":"${'x'.repeat(256 * 1024)}"}`)), true],
    ['exactly 256 KiB', () => home(text(`{"pad":"${'x'.repeat(256 * 1024 - 10)}"}`)), false],
    ['a link that does not resolve', () => home((file) => symlinkSync(`${file}.nowhere`, file)), true],
    ['a link that loops', () => home((file) => symlinkSync(file, file)), true],
    ['a folder', () => home((file) => mkdirSync(file)), true],
    ['a file where a folder of its path should be', () => { const at = home(null); writeFileSync(join(at, '.gemini'), 'x'); return at; }, true],
    ['unreadable', () => home((file) => { writeFileSync(file, '{}'); chmodSync(file, 0o000); }), true],
    ['a folder that may not be searched', () => home((file) => { writeFileSync(file, '{}'); chmodSync(join(file, '..'), 0o000); }), true],
    ['an empty home', () => '', true],
    ['a home that is not absolute', () => 'home', true]
  ];
  for (const [name, plant, owns] of rows) {
    it(`${name} → ${owns ? 'Tortie stands aside' : 'not owned'}`, () => {
      const at = plant();
      try {
        expect(agyOwnsStatusLine(at)).toBe(owns);
      } finally {
        if (name === 'a folder that may not be searched') chmodSync(join(at, '.gemini', 'antigravity-cli'), 0o700);
      }
    });
  }

  it('a pipe is never opened, so it answers at once', () => {
    const at = home((file) => {
      expect(spawnSync('/usr/bin/mkfifo', [file]).status).toBe(0);
    });
    const from = Date.now();
    expect(agyOwnsStatusLine(at)).toBe(true);
    expect(Date.now() - from).toBeLessThan(2000);
  });
});
