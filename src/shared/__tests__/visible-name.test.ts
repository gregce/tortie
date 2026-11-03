/**
 * PHASE 274.3. A name a person reads, with what cannot be seen written out
 * (build/p352/SPEC.md D5 to D7).
 *
 * Two halves. The rule, read against expectations written here by hand rather
 * than computed from the properties the module names. Then every sentence in
 * main's file operations that quotes a name for a person, driven through the
 * shipping function with a name that holds a zero-width space (U+200B), and
 * each `detail` checked to still carry what it carried. The renderer's two
 * sites are pinned beside their own sentences, in
 * src/renderer/tree/__tests__/entry-name.test.ts and
 * src/renderer/editor/__tests__/p240-save-sentences.test.ts.
 */

import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { visibleName } from '../visible-name';
import { fsOpError, fsOpMessage } from '../../main/fs/errors';
import { copyNameFor, createFileOps } from '../../main/fs/file-ops';
import { resolveIncomingSource, resolveInsideRoot } from '../../main/fs/paths';
import type { FsOpErrno } from '../fs-ops';
import type { GmuxErrorPayload } from '../types';

/** Read every `<U+XXXX>` back to its character: an independent decoder. */
function readBack(shown: string): string {
  return shown.replace(/<U\+([0-9A-F]{4,6})>/g, (_, hex: string) =>
    String.fromCodePoint(Number.parseInt(hex, 16))
  );
}

describe('visibleName writes out every character that cannot be seen', () => {
  it('writes each class as <U+XXXX>, uppercase hex, at least four digits', () => {
    const cases: readonly (readonly [string, string])[] = [
      // Default_Ignorable_Code_Point
      ['\u200B', '<U+200B>'],
      ['\u200C', '<U+200C>'],
      ['\u200D', '<U+200D>'],
      ['\u200E', '<U+200E>'],
      ['\u202E', '<U+202E>'],
      ['\u2060', '<U+2060>'],
      ['\u2066', '<U+2066>'],
      ['\uFEFF', '<U+FEFF>'],
      ['\u00AD', '<U+00AD>'],
      ['\u034F', '<U+034F>'],
      ['\u061C', '<U+061C>'],
      ['\u115F', '<U+115F>'],
      ['\u3164', '<U+3164>'],
      ['\uFE00', '<U+FE00>'],
      ['\uFE0E', '<U+FE0E>'],
      ['\uFE0F', '<U+FE0F>'],
      ['\u{1D173}', '<U+1D173>'],
      ['\u{E0001}', '<U+E0001>'],
      ['\u{E0067}', '<U+E0067>'],
      // Cc
      ['\u0000', '<U+0000>'],
      ['\t', '<U+0009>'],
      ['\n', '<U+000A>'],
      ['\r', '<U+000D>'],
      ['\u001B', '<U+001B>'],
      ['\u007F', '<U+007F>'],
      ['\u0085', '<U+0085>'],
      ['\u009F', '<U+009F>'],
      // Zl and Zp
      ['\u2028', '<U+2028>'],
      ['\u2029', '<U+2029>'],
      // Zs other than U+0020
      ['\u00A0', '<U+00A0>'],
      ['\u1680', '<U+1680>'],
      ['\u2000', '<U+2000>'],
      ['\u2007', '<U+2007>'],
      ['\u200A', '<U+200A>'],
      ['\u202F', '<U+202F>'],
      ['\u205F', '<U+205F>'],
      ['\u3000', '<U+3000>']
    ];
    for (const [hidden, written] of cases) {
      expect(visibleName(`a${hidden}b`)).toBe(`a${written}b`);
      expect(visibleName(hidden)).toBe(written);
    }
  });

  it('tells apart the names that draw alike (SPEC §2.4)', () => {
    expect(visibleName('notes\u200B.md')).toBe('notes<U+200B>.md');
    expect(visibleName('notes.md')).toBe('notes.md');
    expect(visibleName('my\u00A0notes.md')).toBe('my<U+00A0>notes.md');
    expect(visibleName('my notes.md')).toBe('my notes.md');
    expect(visibleName('invoice\u202Edm.exe')).toBe('invoice<U+202E>dm.exe');
    expect(visibleName('\uFEFFreport.pdf')).toBe('<U+FEFF>report.pdf');
    expect(visibleName('re\u00ADsume.md')).toBe('re<U+00AD>sume.md');
    expect(visibleName('line\u2028two')).toBe('line<U+2028>two');
  });

  it('leaves U+0020 and every printable ASCII character exactly as written', () => {
    let ascii = '';
    for (let point = 0x20; point <= 0x7e; point += 1) {
      ascii += String.fromCharCode(point);
    }
    expect(visibleName(ascii)).toBe(ascii);
    for (const character of ascii) expect(visibleName(character)).toBe(character);
  });

  it('passes every other character byte for byte: no normalising, no case folding', () => {
    const names = [
      'Caf\u00E9.md',
      'Cafe\u0301.md',
      'README.MD',
      'readme.md',
      '\u00C4\u00D6\u00DC \u00DF.txt',
      '\u0130stanbul.txt',
      '\u6F22\u5B57.txt',
      '\u0444\u0430\u0439\u043B.txt',
      '\uFB01le.txt',
      '\u2014 dash \u2013.md',
      '\uFFFD.bin'
    ];
    for (const name of names) expect(visibleName(name)).toBe(name);
  });

  it('draws an emoji as written: a family, keycaps, a red heart, flags, a skin tone', () => {
    const emoji = [
      '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
      '1\uFE0F\u20E3',
      '#\uFE0F\u20E3',
      '*\uFE0F\u20E3',
      '\u2764\uFE0F',
      '\u{1F3F3}\uFE0F\u200D\u{1F308}',
      '\u{1F3F4}\u200D\u2620\uFE0F',
      '\u{1F469}\u{1F3FD}\u200D\u{1F4BB}',
      '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F',
      '\u263A\uFE0E',
      '\u{1F1EC}\u{1F1E7}'
    ];
    for (const one of emoji) {
      expect(visibleName(one)).toBe(one);
      expect(visibleName(`notes ${one}.md`)).toBe(`notes ${one}.md`);
    }
  });

  it('writes out a joiner or a selector that joins no emoji', () => {
    expect(visibleName('a\u200Db')).toBe('a<U+200D>b');
    expect(visibleName('\u{1F389}\u200Dx')).toBe('\u{1F389}<U+200D>x');
    expect(visibleName('x\u200D\u{1F389}')).toBe('x<U+200D>\u{1F389}');
    expect(visibleName('\u{1F389}\u200D')).toBe('\u{1F389}<U+200D>');
    expect(visibleName('\u200D\u{1F389}')).toBe('<U+200D>\u{1F389}');
    expect(visibleName('\u{1F389}\u200D\u200D\u{1F389}')).toBe(
      '\u{1F389}<U+200D><U+200D>\u{1F389}'
    );
    expect(visibleName('a\uFE0F')).toBe('a<U+FE0F>');
    expect(visibleName('\uFE0Fa')).toBe('<U+FE0F>a');
    expect(visibleName('\u2764\uFE0F\uFE0F')).toBe('\u2764\uFE0F<U+FE0F>');
    expect(visibleName('\u{1F389}\uFE0E\u200D\u{1F389}')).toBe(
      '\u{1F389}\uFE0E<U+200D>\u{1F389}'
    );
    // A U+FE0F that was itself written out joins nothing, which is what keeps
    // the function idempotent on its own output.
    expect(visibleName('a\uFE0F\u200D\u{1F389}')).toBe('a<U+FE0F><U+200D>\u{1F389}');
  });

  it('writes out a tag sequence, such as a subdivision flag (a stated limit)', () => {
    expect(
      visibleName('\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}')
    ).toBe('\u{1F3F4}<U+E0067><U+E0062><U+E0065><U+E006E><U+E0067><U+E007F>');
  });

  it('is idempotent on its own output, and loses nothing it writes out', () => {
    const pool = [
      'a',
      ' ',
      '1',
      '#',
      '.',
      '\u200B',
      '\u200C',
      '\u200D',
      '\uFE0E',
      '\uFE0F',
      '\u20E3',
      '\u2764',
      '\u{1F468}',
      '\u{1F3FD}',
      '\u{1F389}',
      '\u00A0',
      '\u202E',
      '\u{E0067}',
      '\t',
      '<',
      'U',
      '+',
      '>'
    ];
    let seed = 0x2743;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let walk = 0; walk < 5000; walk += 1) {
      let name = '';
      const length = 1 + (next() % 9);
      for (let at = 0; at < length; at += 1) name += pool[next() % pool.length] ?? '';
      const once = visibleName(name);
      expect(visibleName(once)).toBe(once);
      if (!name.includes('<')) expect(readBack(once)).toBe(name);
    }
  });
});

describe('every sentence in main that quotes a name for a person writes it out (SPEC D6)', () => {
  const NAME = 'na\u200Bme.md';
  const SHOWN = 'na<U+200B>me.md';

  let scratch: string;
  let root: string;

  beforeEach(async () => {
    scratch = await realpath(await mkdtemp(join(tmpdir(), 'p2743-visible-')));
    root = join(scratch, 'proj');
    await mkdir(root, { recursive: true });
  });

  afterEach(async () => {
    await rm(scratch, { recursive: true, force: true });
  });

  async function payloadOf(promise: Promise<unknown>): Promise<GmuxErrorPayload> {
    try {
      await promise;
    } catch (err) {
      return JSON.parse((err as Error).message) as GmuxErrorPayload;
    }
    throw new Error('expected a rejection');
  }

  function payloadOfError(err: Error): GmuxErrorPayload {
    return JSON.parse(err.message) as GmuxErrorPayload;
  }

  it('errors.ts: every errno sentence that names the entry, with the errno left in detail', () => {
    const errnos: readonly FsOpErrno[] = [
      'EACCES',
      'EBUSY',
      'EEXIST',
      'EINVAL',
      'EISDIR',
      'ELOOP',
      'ENAMETOOLONG',
      'ENOENT',
      'ENOTDIR',
      'ENOTEMPTY',
      'EPERM',
      'EROFS',
      'EXDEV'
    ];
    for (const code of errnos) {
      const err = Object.assign(new Error(code), { code });
      const { errno, message } = fsOpMessage(err, 'rename', NAME);
      expect(errno).toBe(code);
      expect(message).toContain(`"${SHOWN}"`);
      expect(message).not.toContain('\u200B');
      const payload = payloadOfError(fsOpError(err, 'rename', NAME));
      expect(payload.message).toBe(message);
      expect(payload.detail).toBe(code);
    }
    const exists = Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
    expect(fsOpMessage(exists, 'create', NAME).message).toBe(
      `"${SHOWN}" already exists here.`
    );
    const full = Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
    expect(fsOpMessage(full, 'copy', NAME).message).toBe(
      'There is no space left on the disk.'
    );
  });

  it('errors.ts: both fallback sentences, with the raw message left in detail', () => {
    const odd = new Error(`EODD: something about ${NAME}`);
    expect(fsOpMessage(odd, 'delete', NAME)).toEqual({
      errno: null,
      message: `Could not delete "${SHOWN}".`
    });
    const payload = payloadOfError(fsOpError(odd, 'move', NAME));
    expect(payload.message).toBe(`Could not move "${SHOWN}".`);
    expect(payload.detail).toBe(odd.message);
  });

  it('paths.ts: the ancestor walk names a folder it could not read', async () => {
    // A symlink loop rather than a mode-000 folder, so the reading is the same
    // under every account.
    await symlink(join(root, 'lo\u200Bopb'), join(root, 'lo\u200Bopa'));
    await symlink(join(root, 'lo\u200Bopa'), join(root, 'lo\u200Bopb'));
    const payload = await payloadOf(resolveInsideRoot(root, 'lo\u200Bopa/child.txt'));
    expect(payload.message).toBe('"lo<U+200B>opa" could not be read (ELOOP).');
    expect(payload.detail).toBe('ELOOP');
  });

  it('paths.ts: a dropped file that has gone', async () => {
    const payload = await payloadOf(resolveIncomingSource(join(scratch, NAME)));
    expect(payload.message).toBe(`"${SHOWN}" is no longer there.`);
    expect(payload.detail).toBe('ENOENT');
  });

  it('file-ops.ts: a folder moved or copied into itself, and a file with no free copy name', async () => {
    const ops = createFileOps({
      trashItem: () => Promise.reject(new Error('nothing is trashed here')),
      listProjectRoots: () => Promise.resolve([root])
    });
    const folder = 'fo\u200Bld';
    await mkdir(join(root, folder, 'sub'), { recursive: true });

    const moved = await payloadOf(
      ops.move({ root, paths: [folder], destDir: `${folder}/sub` })
    );
    expect(moved.message).toBe('"fo<U+200B>ld" cannot be moved inside itself.');
    expect(moved.detail).toBe(folder);

    const copied = await payloadOf(
      ops.importPaths({ root, sources: [join(root, folder)], destDir: `${folder}/sub` })
    );
    expect(copied.message).toBe('"fo<U+200B>ld" cannot be copied inside itself.');
    expect(copied.detail).toBe(join(root, folder));

    await writeFile(join(root, NAME), 'x', 'utf8');
    for (let n = 1; n <= 200; n += 1) {
      await writeFile(join(root, copyNameFor(NAME, n)), '', 'utf8');
    }
    const duplicated = await payloadOf(ops.duplicate({ root, path: NAME }));
    expect(duplicated.message).toBe(`There are already too many copies of "${SHOWN}".`);
    expect(duplicated.detail).toBe('EEXIST');
  });
});
