/**
 * PHASE 244, audit finding F2. THE MIRROR AND THE FOLDER ON THIS MAC ANSWER THE
 * SAME QUESTION THE SAME WAY.
 *
 * The audit's own fixture (./audit-0908-mirror.test.ts) drives the one shape it
 * measured, being a same-length rewrite inside one timestamp second. The
 * property is wider than that, and the audit says what it is: "Test same-size
 * rewrites, preserved timestamps, deletion and rename against the local source
 * behaviour", because ADAPTER PARITY is what a source is for. Everything below
 * the coordinator — the import scan, the tree read, the reading composer — opens
 * bytes with `node:fs` and cannot tell the two sources apart, so anything the
 * local source would see and the mirror would not is a lie the shared pipeline
 * will tell in the mirror's voice.
 *
 * So every arm here does the same edit twice: once to a folder the LOCAL source
 * would read directly, and once to a folder the machine source mirrors. The
 * local reading is the reading the mirror has to match, and it is taken rather
 * than assumed.
 *
 * The far side is the SHIPPING `arch-read` script under a local `/bin/sh`, which
 * is what the audit's fixture drives too. It is the shipping script and it is
 * not the shipping link; the measure step drove the real link to the operator's
 * Mac Pro and research 108 has that reading.
 *
 * The `cksum` arm is the one that would silently stop meaning anything: with the
 * digest gone the size and stamp check is back and three of these arms pass on
 * luck, so `p244-arch-cksum.test.ts` pins the arithmetic against the program's
 * own numbers separately.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncRemoteArchMirror, type RemoteArchRunner } from '../remote-arch';
import { REMOTE_SCRIPTS } from '../remote-scripts';
import { parseRemoteScriptAnswer, remoteScriptName } from '../remote-run';

let root = '';
let far = '';
let local = '';
let mirror = '';

const run: RemoteArchRunner = async (id, args) => {
  const text = REMOTE_SCRIPTS.find((row) => row.id === id)?.text ?? '';
  const out = execFileSync('/bin/sh', ['-c', text, remoteScriptName(id), ...args], {
    encoding: 'utf8'
  });
  const answer = parseRemoteScriptAnswer(out);
  if (answer === null) throw new Error('no script answer');
  return answer;
};

/**
 * What the SHARED pipeline would read for one tracked file out of each source:
 * the folder itself for the local source, the mirror for the machine source.
 * `null` means there is nothing there to open, which is what a deleted file
 * looks like to every reader below the coordinator.
 */
function readThrough(dir: string, rel: string): string | null {
  const path = join(dir, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Write the same bytes into both folders, and give both the same stamp. */
function writeBoth(rel: string, text: string, stamp: number): void {
  for (const dir of [far, local]) {
    writeFileSync(join(dir, rel), text);
    utimesSync(join(dir, rel), stamp, stamp);
  }
}

async function sync(tracked: readonly string[]): Promise<{
  written: number;
  reused: number;
  forgotten: number;
}> {
  const result = await syncRemoteArchMirror({
    run,
    farPath: far,
    mirrorPath: mirror,
    trackedFiles: [...tracked]
  });
  return { written: result.written, reused: result.reused, forgotten: result.forgotten };
}

/** Every arm asserts this, and it is the whole property. */
function expectParity(tracked: readonly string[]): void {
  for (const rel of tracked) {
    expect(readThrough(mirror, rel), `the mirror disagrees with the folder for ${rel}`).toBe(
      readThrough(local, rel)
    );
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p244-parity-'));
  far = join(root, 'far');
  local = join(root, 'local');
  mirror = join(root, 'mirror');
  mkdirSync(far);
  mkdirSync(local);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('the machine source keeps parity with the local source', () => {
  it('sees a same-size rewrite inside one timestamp second', async () => {
    writeBoth('a.ts', 'export const a = 1;\n', 1700000000.1);
    expect(await sync(['a.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expectParity(['a.ts']);

    // The same number of bytes, a different letter, inside the same second the
    // far side's `stat` reports. This is the audit's own shape.
    writeBoth('a.ts', 'export const a = 2;\n', 1700000000.9);
    expect(statSync(join(far, 'a.ts')).size).toBe(20);
    expect(await sync(['a.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expectParity(['a.ts']);

    // And a third pass, because the audit's point is that waiting repairs
    // nothing: an unchanged file keeps its stamp for ever.
    expect(await sync(['a.ts'])).toEqual({ written: 0, reused: 1, forgotten: 0 });
    expectParity(['a.ts']);
  });

  it('sees a same-size rewrite that PRESERVED the timestamp exactly', async () => {
    writeBoth('b.ts', 'const flavour = "vanilla";\n', 1600000000);
    expect(await sync(['b.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });

    // What `cp -p`, `rsync -t`, `tar -x` and a restore from a backup all do.
    // No stamp of any resolution can see this one, which is why the token is
    // the content rather than a finer clock.
    writeBoth('b.ts', 'const flavour = "coconut";\n', 1600000000);
    expect(readThrough(far, 'b.ts')?.length).toBe(27);
    expect(await sync(['b.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expectParity(['b.ts']);
  });

  it('reuses a file nothing changed, and a touch alone costs no transfer', async () => {
    writeBoth('c.ts', 'export const c = 3;\n', 1600000000);
    expect(await sync(['c.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expect(await sync(['c.ts'])).toEqual({ written: 0, reused: 1, forgotten: 0 });

    // A stamp that moved with no byte behind it. The local source would read
    // exactly the same bytes, so the mirror carries nothing.
    utimesSync(join(far, 'c.ts'), 1700000123, 1700000123);
    expect(await sync(['c.ts'])).toEqual({ written: 0, reused: 1, forgotten: 0 });
    expectParity(['c.ts']);
  });

  it('sees a deletion, and the mirror stops holding the file', async () => {
    writeBoth('d.ts', 'export const d = 4;\n', 1600000000);
    await sync(['d.ts']);
    expectParity(['d.ts']);

    rmSync(join(far, 'd.ts'));
    rmSync(join(local, 'd.ts'));
    // Untracked now, which is what a deleted file is to `git ls-files`.
    expect(await sync([])).toEqual({ written: 0, reused: 0, forgotten: 1 });
    expect(readThrough(mirror, 'd.ts')).toBeNull();
    expectParity(['d.ts']);
  });

  it('sees a rename, keeping the new name and dropping the old', async () => {
    writeBoth('old.ts', 'export const e = 5;\n', 1600000000);
    await sync(['old.ts']);
    expectParity(['old.ts']);

    renameSync(join(far, 'old.ts'), join(far, 'new.ts'));
    renameSync(join(local, 'old.ts'), join(local, 'new.ts'));
    expect(await sync(['new.ts'])).toEqual({ written: 1, reused: 0, forgotten: 1 });
    expect(readThrough(mirror, 'old.ts')).toBeNull();
    expectParity(['old.ts', 'new.ts']);
  });

  it('carries a file again when the mirror lost its bytes, and never calls it fresh', async () => {
    writeBoth('f.ts', 'export const f = 6;\n', 1600000000);
    await sync(['f.ts']);
    expect(await sync(['f.ts'])).toEqual({ written: 0, reused: 1, forgotten: 0 });

    // The mirror is its own record, so a mirror somebody deleted half of
    // re-fetches that half rather than trusting a side table that says it is
    // there. This is the property recomputing the digest locally keeps.
    rmSync(join(mirror, 'f.ts'));
    expect(await sync(['f.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expectParity(['f.ts']);
  });

  it('carries a file whose mirrored copy was edited by hand', async () => {
    writeBoth('g.ts', 'export const g = 7;\n', 1600000000);
    await sync(['g.ts']);
    // Same length, so only the content can tell.
    writeFileSync(join(mirror, 'g.ts'), 'export const g = 9;\n');
    utimesSync(join(mirror, 'g.ts'), 1600000000, 1600000000);
    expect(await sync(['g.ts'])).toEqual({ written: 1, reused: 0, forgotten: 0 });
    expectParity(['g.ts']);
  });
});
