/**
 * `fs:importPaths` — the drop from OUTSIDE the project (Phase 154).
 *
 * THIS FILE IS THE ATTACK, and the attack is about destroying his work. Every
 * test below is a shape that could lose bytes, and each one asserts the bytes
 * are still somewhere afterwards rather than asserting a return value.
 *
 * `trashItem` is faked as a MOVE into a scratch trash folder, exactly as
 * file-ops.test.ts does it, which is what lets "a confirmed overwrite is still
 * recoverable" be a measurement rather than a promise: if the service ever
 * grew an unlink, the trash folder would be empty and these tests would fail.
 */

import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GmuxErrorPayload } from '@shared/types';
import { MAX_IMPORT_SOURCES } from '@shared/fs-ops';
import type { FileOpsService } from '../file-ops';
import { createFileOps } from '../file-ops';

let scratch: string;
let root: string;
let outside: string;
let trashDir: string;
let trashed: string[];
let ops: FileOpsService;

beforeEach(async () => {
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'gmux-p154-')));
  root = join(scratch, 'proj');
  outside = join(scratch, 'elsewhere');
  trashDir = join(scratch, 'trash');
  trashed = [];
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, '.git', 'hooks'), { recursive: true });
  await mkdir(join(outside, 'bundle', 'inner'), { recursive: true });
  await mkdir(trashDir, { recursive: true });
  await writeFile(join(root, 'README.md'), 'the project readme', 'utf8');
  await writeFile(join(root, 'src', 'index.ts'), 'index', 'utf8');
  await writeFile(join(outside, 'notes.md'), 'incoming notes', 'utf8');
  await writeFile(join(outside, 'README.md'), 'a DIFFERENT readme', 'utf8');
  await writeFile(join(outside, 'bundle', 'a.txt'), 'a', 'utf8');
  await writeFile(join(outside, 'bundle', 'inner', 'b.txt'), 'b', 'utf8');

  ops = createFileOps({
    trashItem: async (path) => {
      trashed.push(path);
      await rename(path, join(trashDir, `${trashed.length}-${basename(path)}`));
    },
    listProjectRoots: async () => [root]
  });
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

describe('bringing a file in', () => {
  it('copies a file into a folder and leaves the original alone', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(outside, 'notes.md')],
      destDir: 'src'
    });
    expect(result.status).toBe('imported');
    expect(await readFile(join(root, 'src', 'notes.md'), 'utf8')).toBe(
      'incoming notes'
    );
    // COPIED, never moved. The person still has the file they dragged.
    expect(await readFile(join(outside, 'notes.md'), 'utf8')).toBe(
      'incoming notes'
    );
  });

  it('copies into the project root when destDir is empty', async () => {
    await ops.importPaths({
      root,
      sources: [join(outside, 'notes.md')],
      destDir: ''
    });
    expect(existsSync(join(root, 'notes.md'))).toBe(true);
  });

  it('brings a whole folder in, subtree and all', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(outside, 'bundle')],
      destDir: 'src'
    });
    expect(result.status).toBe('imported');
    expect(await readFile(join(root, 'src', 'bundle', 'a.txt'), 'utf8')).toBe('a');
    expect(
      await readFile(join(root, 'src', 'bundle', 'inner', 'b.txt'), 'utf8')
    ).toBe('b');
  });

  it('reports what landed with a path inside the project', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(outside, 'notes.md')],
      destDir: 'src'
    });
    if (result.status !== 'imported') throw new Error('expected imported');
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]?.to.relPath).toBe('src/notes.md');
    expect(result.imported[0]?.to.kind).toBe('file');
    expect(result.imported[0]?.source).toBe(join(outside, 'notes.md'));
  });
});

describe('THE ATTACK: a name that is already taken', () => {
  it('asks first and writes NOTHING', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(outside, 'README.md')],
      destDir: ''
    });
    expect(result.status).toBe('would-overwrite');
    if (result.status !== 'would-overwrite') throw new Error('unreachable');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.name).toBe('README.md');
    // The measurement that matters: his file is untouched.
    expect(await readFile(join(root, 'README.md'), 'utf8')).toBe(
      'the project readme'
    );
    expect(trashed).toEqual([]);
  });

  it('a confirmed replace TRASHES the displaced file before writing', async () => {
    await ops.importPaths({
      root,
      sources: [join(outside, 'README.md')],
      destDir: '',
      overwrite: true
    });
    expect(await readFile(join(root, 'README.md'), 'utf8')).toBe(
      'a DIFFERENT readme'
    );
    // Recoverable, and this is the proof: the old bytes are in the trash.
    expect(trashed).toEqual([join(root, 'README.md')]);
    const inTrash = await readdir(trashDir);
    expect(inTrash).toHaveLength(1);
    expect(
      await readFile(join(trashDir, inTrash[0] as string), 'utf8')
    ).toBe('the project readme');
  });

  it('names EVERY collision at once and copies none of the batch', async () => {
    await writeFile(join(outside, 'index.ts'), 'a different index', 'utf8');
    const result = await ops.importPaths({
      root,
      sources: [join(outside, 'index.ts'), join(outside, 'notes.md')],
      destDir: 'src'
    });
    expect(result.status).toBe('would-overwrite');
    // The clean one in the same batch did not sneak through.
    expect(existsSync(join(root, 'src', 'notes.md'))).toBe(false);
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
  });
});

describe('THE ATTACK: a drag out of Tortie dropped straight back in', () => {
  it('skips a source already sitting in the destination, keeping the bytes', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(root, 'src', 'index.ts')],
      destDir: 'src'
    });
    expect(result.status).toBe('imported');
    if (result.status !== 'imported') throw new Error('unreachable');
    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.relPath).toBe('src/index.ts');
    // THE WHOLE POINT: the file is still there and still has its bytes.
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
    expect(trashed).toEqual([]);
  });

  it('skips it even with overwrite confirmed, so it is never trashed', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(root, 'src', 'index.ts')],
      destDir: 'src',
      overwrite: true
    });
    expect(result.status).toBe('imported');
    // Without the skip this would trash the file and then copy from a path
    // that no longer exists. The file survives and the trash is empty.
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
    expect(trashed).toEqual([]);
  });

  it('skips a source reached through a symlink to the same entry', async () => {
    const alias = join(outside, 'alias-index.ts');
    await symlink(join(root, 'src', 'index.ts'), alias);
    const result = await ops.importPaths({
      root,
      sources: [alias],
      destDir: 'src'
    });
    expect(result.status).toBe('imported');
    if (result.status !== 'imported') throw new Error('unreachable');
    expect(result.skipped).toHaveLength(1);
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
  });

  it('a row dropped into a DIFFERENT folder of the same project copies', async () => {
    const result = await ops.importPaths({
      root,
      sources: [join(root, 'src', 'index.ts')],
      destDir: ''
    });
    expect(result.status).toBe('imported');
    expect(await readFile(join(root, 'index.ts'), 'utf8')).toBe('index');
    // The original is still where it was: this is a copy, not a move.
    expect(await readFile(join(root, 'src', 'index.ts'), 'utf8')).toBe('index');
  });
});

describe('THE ATTACK: a folder dropped onto itself', () => {
  it('refuses a folder copied into itself', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(root, 'src')],
        destDir: 'src'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('cannot be copied inside itself');
    expect(existsSync(join(root, 'src', 'src'))).toBe(false);
  });

  it('refuses a folder copied into its own child', async () => {
    await mkdir(join(root, 'src', 'deep'), { recursive: true });
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(root, 'src')],
        destDir: 'src/deep'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'src', 'deep', 'src'))).toBe(false);
  });

  it('refuses the PROJECT ROOT dropped into one of its own folders', async () => {
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [root], destDir: 'src' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'src', 'proj'))).toBe(false);
  });

  it('refuses an ANCESTOR of the project reached from outside', async () => {
    // `scratch` contains `proj`, so copying it in would copy the project into
    // itself forever. Real paths on both sides is what makes this catchable.
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [scratch], destDir: 'src' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
  });

  it('refuses a folder reached through a SYMLINK that points back inside', async () => {
    const alias = join(outside, 'alias-src');
    await symlink(join(root, 'src'), alias);
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [alias], destDir: 'src' })
    );
    // The source is realpathed leaf and all, so the link cannot disguise it.
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'src', 'alias-src'))).toBe(false);
    expect(existsSync(join(root, 'src', 'src'))).toBe(false);
  });
});

describe('THE ATTACK: .git', () => {
  it('refuses .git as a destination', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: '.git'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('.git');
    expect(existsSync(join(root, '.git', 'notes.md'))).toBe(false);
  });

  it('refuses anything under .git as a destination', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: '.git/hooks'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, '.git', 'hooks', 'notes.md'))).toBe(false);
  });

  it('refuses a dropped folder that is itself called .git', async () => {
    await mkdir(join(outside, '.git'), { recursive: true });
    await writeFile(join(outside, '.git', 'config'), 'stranger', 'utf8');
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [join(outside, '.git')], destDir: 'src' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'src', '.git'))).toBe(false);
  });
});

describe('THE ATTACK: a destination that is not in the project at all', () => {
  it('refuses a root that is not an open project', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root: scratch,
        sources: [join(outside, 'notes.md')],
        destDir: ''
      })
    );
    expect(payload.code).toBe('PROJECT_NOT_FOUND');
    expect(existsSync(join(scratch, 'notes.md'))).toBe(false);
  });

  it('refuses a destination that climbs out with ..', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: '../elsewhere'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
  });

  it('refuses a directory symlink out of root as the destination itself', async () => {
    await symlink(outside, join(root, 'escape'));
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: 'escape'
      })
    );
    // The module's rule is that PARENTS are resolved and the leaf is not, so
    // the link itself is seen for what it is: `lstat` reports a symlink and
    // not a directory, and the destination is refused as not a folder. Same
    // code path and same answer as fs:move, which is the point.
    expect(payload.code).toBe('FS_FAILED');
    expect(payload.detail).toBe('ENOTDIR');
    expect(existsSync(join(outside, 'notes.md'))).toBe(true);
    // Nothing was written on the far side of the link.
    expect(existsSync(join(outside, 'escape'))).toBe(false);
  });

  it('refuses a destination THROUGH a directory symlink out of root', async () => {
    await symlink(outside, join(root, 'escape'));
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: 'escape/bundle'
      })
    );
    // Here the link is an ANCESTOR, so realpath collapses it and the answer
    // lands outside the root. This is the escape the guard exists for.
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('outside the project');
    expect(existsSync(join(outside, 'bundle', 'notes.md'))).toBe(false);
  });

  it('refuses a destination that is a FILE rather than a folder', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: 'README.md'
      })
    );
    expect(payload.code).toBe('FS_FAILED');
    expect(payload.detail).toBe('ENOTDIR');
  });
});

describe('the source guard', () => {
  it('refuses a relative source: there is nothing to resolve it against', async () => {
    const payload = await payloadOf(
      ops.importPaths({ root, sources: ['notes.md'], destDir: '' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
  });

  it('refuses an empty source, which is what an unreadable drop looks like', async () => {
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [''], destDir: '' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
  });

  it('refuses a source that is not on disk', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'never-existed.md')],
        destDir: ''
      })
    );
    expect(payload.code).toBe('FS_FAILED');
    expect(payload.detail).toBe('ENOENT');
  });

  it('refuses an empty drop', async () => {
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [], destDir: '' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
  });

  it(`refuses more than ${String(MAX_IMPORT_SOURCES)} items in one drop`, async () => {
    const many = Array.from(
      { length: MAX_IMPORT_SOURCES + 1 },
      () => join(outside, 'notes.md')
    );
    const payload = await payloadOf(
      ops.importPaths({ root, sources: many, destDir: '' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(existsSync(join(root, 'notes.md'))).toBe(false);
  });
});

/**
 * HOSTILE NAMES — the attack the charter asked for by name, added in the fix
 * round because the first pass of this file had none of them.
 *
 * The charter lists the shapes: "a leading dot, a leading dash, spaces, a
 * newline, a glob metacharacter, a path separator, and a name that is only
 * dots". They are here as real files with real names on disk, because a name
 * written into a fixture string and a name the filesystem actually holds are
 * not the same test.
 *
 * Every one of these lands somewhere. The measurement is not "did it work",
 * it is TWO things at once: the bytes are the source's bytes, and the path it
 * landed at is exactly the path the destination plus the name spells. A name
 * that is quietly edited on the way in fails the second half even though the
 * copy succeeded, and that is the defect this suite was written to catch.
 */
const HOSTILE_NAMES: readonly string[] = [
  '.leading-dot',
  '-rf',
  '--force',
  'new\nline.txt',
  'carriage\rreturn.txt',
  'tab\there.txt',
  'star*.txt',
  'question?.txt',
  'brack[abc].txt',
  'brace{a,b}.txt',
  'back\\slash.txt',
  '$(rm -rf x)`id`.txt',
  'a;b|c&d.txt',
  'quote"single\'.txt',
  '~tilde.txt',
  '...',
  '....',
  'rtl‮ovrd.txt',
  'emoji-\u{1f600}.txt',
  'colon:here.txt',
  '%2Fetc%2Fpasswd',
  `${'x'.repeat(200)}.txt`,
  ' leading.txt',
  'trailing.txt ',
  ' both .txt',
  '.gitfoo',
  'dot.at.end.',
  'UPPER.TXT'
];

describe('hostile names', () => {
  for (const name of HOSTILE_NAMES) {
    it(`lands ${JSON.stringify(name)} byte for byte, under that exact name`, async () => {
      const source = join(outside, name);
      await writeFile(source, `BYTES:${name}`, 'utf8');

      const result = await ops.importPaths({
        root,
        sources: [source],
        destDir: 'src'
      });

      expect(result.status).toBe('imported');
      if (result.status !== 'imported') return;
      const landed = result.imported[0]?.to;
      // The name was NOT edited on the way in. This is the assertion that
      // failed before the fix round: ' leading.txt' arrived as 'leading.txt'
      // and nobody was told.
      expect(landed?.relPath).toBe(`src/${name}`);
      expect(await readFile(join(root, 'src', name), 'utf8')).toBe(
        `BYTES:${name}`
      );
      // And the file the person dragged is still where it was.
      expect(await readFile(source, 'utf8')).toBe(`BYTES:${name}`);
    });
  }

  it('does not MANUFACTURE an overwrite out of a name that only looks alike', async () => {
    // ' keep.ts' and 'keep.ts' are two different files. Before the fix round
    // the incoming name was trimmed, so this drop reported a conflict on
    // 'keep.ts', the confirm sheet asked about a file the person had never
    // dragged, and confirming trashed it and put the other one's bytes in
    // its place. Recoverable from the Trash, and still the wrong question.
    await writeFile(join(root, 'src', 'keep.ts'), 'ORIGINAL', 'utf8');
    await writeFile(join(outside, ' keep.ts'), 'INCOMING', 'utf8');

    const result = await ops.importPaths({
      root,
      sources: [join(outside, ' keep.ts')],
      destDir: 'src'
    });

    expect(result.status).toBe('imported');
    expect(await readFile(join(root, 'src', 'keep.ts'), 'utf8')).toBe(
      'ORIGINAL'
    );
    expect(await readFile(join(root, 'src', ' keep.ts'), 'utf8')).toBe(
      'INCOMING'
    );
    expect(trashed).toEqual([]);
    expect((await readdir(join(root, 'src'))).sort()).toEqual([
      ' keep.ts',
      'index.ts',
      'keep.ts'
    ]);
  });

  it('agrees with what an internal move does to the same name', async () => {
    // The two halves of the same product must not disagree about one file.
    // A move keeps the space, so an import keeps the space.
    await writeFile(join(outside, ' spaced.ts'), 'in', 'utf8');
    await writeFile(join(root, ' moved.ts'), 'mv', 'utf8');

    await ops.importPaths({
      root,
      sources: [join(outside, ' spaced.ts')],
      destDir: 'src'
    });
    await ops.move({ root, paths: [' moved.ts'], destDir: 'src' });

    const listing = await readdir(join(root, 'src'));
    expect(listing).toContain(' spaced.ts');
    expect(listing).toContain(' moved.ts');
  });

  it('still refuses a folder named ".git" with spaces around it', async () => {
    // The old trim caught this one BY ACCIDENT, because it ran before the
    // check. Dropping the trim without keeping this refusal would have given
    // it back silently, so it is asserted rather than assumed. It is refused
    // on how it READS to a person, and the detail names what was really
    // dropped rather than the tidied spelling.
    await mkdir(join(outside, ' .git '), { recursive: true });
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, ' .git ')],
        destDir: 'src'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('.git');
    expect(payload.detail).toBe(' .git ');
    expect(existsSync(join(root, 'src', ' .git '))).toBe(false);
  });

  it('refuses a name that is nothing but whitespace', async () => {
    await mkdir(join(outside, '   '), { recursive: true });
    const payload = await payloadOf(
      ops.importPaths({ root, sources: [join(outside, '   ')], destDir: 'src' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toBe('A name is required.');
  });
});

/**
 * THE BLOCKING DEFECT THE RE-VERIFY FOUND, AND IT DESTROYED THE REPOSITORY.
 *
 * The default macOS volume is case insensitive APFS, so `<root>/.GIT` and
 * `<root>/.git` are ONE directory. The guard compared segments exactly, so
 * `.GIT` walked past it. The drop then came back as a conflict named `.GIT`,
 * which is a name the person really did drag, so it is a confirm they would
 * plausibly give, and confirming trashed the whole repository and copied the
 * dropped folder into its place. The sheet never said the word `.git`.
 *
 * Measured before the repair as `.git/HEAD still there: false`.
 */
describe('THE ATTACK: .git under another spelling', () => {
  it('refuses a dropped folder named ".GIT" and leaves the repository alone', async () => {
    await mkdir(join(outside, '.GIT'), { recursive: true });
    await writeFile(join(outside, '.GIT', 'evil.txt'), 'ATTACKER', 'utf8');
    const head = join(root, '.git', 'hooks', 'kept');
    await writeFile(head, 'the repository', 'utf8');

    const payload = await payloadOf(
      ops.importPaths({ root, sources: [join(outside, '.GIT')], destDir: '' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('.git');

    // The confirmed pass is the one that did the damage, so it is the one
    // that has to be driven: nothing may be trashed and the bytes stay.
    const confirmed = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, '.GIT')],
        destDir: '',
        overwrite: true
      })
    );
    expect(confirmed.code).toBe('INVALID_INPUT');
    expect(trashed).toEqual([]);
    expect(await readFile(head, 'utf8')).toBe('the repository');
    expect(existsSync(join(root, '.git', 'hooks'))).toBe(true);
  });

  it('refuses ".Git" and ".giT" too, because folding is the rule', async () => {
    for (const spelling of ['.Git', '.giT']) {
      await mkdir(join(outside, spelling), { recursive: true });
      const payload = await payloadOf(
        ops.importPaths({ root, sources: [join(outside, spelling)], destDir: '' })
      );
      expect(payload.code).toBe('INVALID_INPUT');
      expect(payload.message).toContain('.git');
    }
    expect(trashed).toEqual([]);
  });

  it('refuses ".GIT" as a DESTINATION, which is the same hole facing out', async () => {
    const payload = await payloadOf(
      ops.importPaths({
        root,
        sources: [join(outside, 'notes.md')],
        destDir: '.GIT'
      })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toContain('.git');
  });
});
