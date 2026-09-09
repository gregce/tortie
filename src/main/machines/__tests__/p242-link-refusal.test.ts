/**
 * Phase 242 — a symbolic link inside the confirmed folder is not a way out of
 * it.
 *
 * ## What this file holds that no other one does
 *
 * It RUNS the shipped far side text. `build/conformance-machines.mjs` condition
 * 88 reads that text and asks whether the clauses are there and stand above
 * every line that writes, which is the right question for a gate and is still a
 * question about text. This file writes real directories, real files and real
 * symbolic links on this Mac, hands the same three script strings to `/bin/sh`
 * with the same positional values `runRemoteWrite` composes, and reads what
 * they printed and what is on disk afterwards.
 *
 * The shapes are the ones research 102 section 5.2 measured on the operator's
 * own Mac Pro, where each of them went through:
 *
 *  - `file-put` through a link, which REPLACED a file outside the folder and
 *    answered `wrote` with the confirmed folder named beside it;
 *  - `dir-new` through a link, which made a folder outside the folder;
 *  - `entry-rename` out through a link, which took a file OUT of the folder the
 *    person confirmed.
 *
 * Plus two this file adds, because they are the same class and nobody had asked
 * them: a link as the file being replaced, and a link planted at the staged
 * name `<file>.tortie-part`, which the redirection that writes the payload
 * follows. That second one is `src/main/credentials/nofollow.ts`'s shape, and
 * this domain had not taken the same lesson.
 *
 * ## And the shape the first round still missed, which is why there is a fix
 * ## round
 *
 * A HARD LINK. Every arm above asks the shell's `-L`, and `-L` cannot see one,
 * because a hard link is not a link to the shell: it IS the file, under a
 * second name. The phase's verifier planted one at the staged name and drove it
 * through `machines.putFile` against the operator's own Mac Pro, and the file
 * OUTSIDE the confirmed folder took the payload while the answer read `wrote`
 * with the confirmed folder named beside it. That is arm a9's exact outcome
 * reached by the one link kind the refusal could not see, and it is
 * `nofollow.ts`'s lesson taken only in part: that module is unlink then create
 * exclusively, and this domain had taken the `-L` half alone.
 *
 * The two answers differ on purpose and the arms below pin both. A symbolic
 * link at the staged name is REFUSED with the word `outside`, because it names
 * a path and something is plainly wrong. A hard link is UNLINKED and the save
 * goes through, because it names nothing and the only thing telling it from the
 * ordinary debris of an interrupted save is a link count. Both end with nothing
 * outside the confirmed folder changed, which is the property that matters.
 *
 * ## What it also holds, and it matters as much
 *
 * That the refusal did NOT get wider than the hole. A path with no link in it
 * still writes, a folder is still made, an entry is still renamed, and a
 * symbolic link is still RENAMEABLE, which is what `entry-rename`'s
 * `[ -e ] || [ -L ]` presence test was written for.
 *
 * ## What it cannot show
 *
 * That the machine on the other side of a real link behaves the way this Mac
 * does. That is `build/probe-p242-write-path.mjs`, which drives every one of
 * these arms over the real link against a real machine.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  linkSync,
  chmodSync,
  writeFileSync,
  readFileSync,
  existsSync,
  lstatSync,
  statSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REMOTE_SCRIPTS } from '../remote-scripts';
import { parseFilePutAnswer, REMOTE_FILE_PUT_OUTSIDE } from '../remote-file';
import {
  parseMakeDirAnswer,
  parseRenameAnswer,
  REMOTE_ENTRY_OUTSIDE
} from '../remote-entry';

const textOf = (id: string): string => {
  const row = REMOTE_SCRIPTS.find((one) => one.id === id);
  if (row === undefined) throw new Error(`no script called ${id}`);
  return row.text;
};

/** Run one shipped script text the way the far side runs it. */
function run(id: string, args: string[], path?: string): { out: string; word: string } {
  const done = spawnSync('/bin/sh', ['-c', textOf(id), 'sh', ...args], {
    encoding: 'utf8',
    env: path === undefined ? process.env : { ...process.env, PATH: path }
  });
  const out = `${done.stdout ?? ''}${done.stderr ?? ''}`;
  const at = out.match(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/);
  return { out, word: at === null ? '' : (at[1] ?? '').trim().split(/\s+/)[0] ?? '' };
}

let dir = '';
let root = '';
let outside = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p242-link-'));
  root = join(dir, 'root');
  outside = join(dir, 'outside');
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(outside, 'victim.txt'), 'victim, untouched\n', 'utf8');
  writeFileSync(join(root, 'docs', 'notes.md'), 'notes\n', 'utf8');
  // The link inside the folder pointing out of it.
  symlinkSync(outside, join(root, 'escape'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** base64 of a payload, the way `putFileOnMachine` composes the fourth value. */
const payload = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

describe('the three writers refuse a link in a directory component', () => {
  it('file-put refuses a save through a link and leaves the file outside alone', () => {
    const before = readFileSync(join(outside, 'victim.txt'), 'utf8');
    const said = run('file-put', [root, 'escape/victim.txt', 'new', payload('PWNED\n')]);
    expect(said.word).toBe(REMOTE_FILE_PUT_OUTSIDE);
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe(before);
    // And no staged file was left anywhere.
    expect(existsSync(join(outside, 'victim.txt.tortie-part'))).toBe(false);
  });

  it('file-put refuses a REPLACE through a link, which is the arm that landed', () => {
    // The real digest of the file outside, which is what made the parent
    // commit answer `wrote` rather than `stale`.
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(outside, 'victim.txt')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    expect(digest).not.toBe('');
    const said = run('file-put', [root, 'escape/victim.txt', digest, payload('PWNED\n')]);
    expect(said.word).toBe(REMOTE_FILE_PUT_OUTSIDE);
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe('victim, untouched\n');
  });

  it('dir-new refuses a folder made through a link', () => {
    const said = run('dir-new', [root, 'escape/made-through-the-link']);
    expect(said.word).toBe(REMOTE_ENTRY_OUTSIDE);
    expect(existsSync(join(outside, 'made-through-the-link'))).toBe(false);
  });

  it('entry-rename refuses a move OUT through a link and leaves the entry where it is', () => {
    const said = run('entry-rename', [root, 'docs/notes.md', 'escape/notes-moved.md']);
    expect(said.word).toBe(REMOTE_ENTRY_OUTSIDE);
    expect(existsSync(join(root, 'docs', 'notes.md'))).toBe(true);
    expect(existsSync(join(outside, 'notes-moved.md'))).toBe(false);
  });

  it('entry-rename refuses a move IN through a link too, which is the $2 walk', () => {
    writeFileSync(join(outside, 'lure.txt'), 'lure\n', 'utf8');
    const said = run('entry-rename', [root, 'escape/lure.txt', 'docs/lure.txt']);
    expect(said.word).toBe(REMOTE_ENTRY_OUTSIDE);
    expect(existsSync(join(outside, 'lure.txt'))).toBe(true);
    expect(existsSync(join(root, 'docs', 'lure.txt'))).toBe(false);
  });
});

describe("file-put's two extra lines, which the walk deliberately does not cover", () => {
  it('refuses a last component that is a link, so the file read is the file written', () => {
    symlinkSync(join(outside, 'victim.txt'), join(root, 'leaf-link'));
    const said = run('file-put', [root, 'leaf-link', 'new', payload('PWNED\n')]);
    expect(said.word).toBe(REMOTE_FILE_PUT_OUTSIDE);
    // The link is still a link and what it points at is untouched.
    expect(lstatSync(join(root, 'leaf-link')).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe('victim, untouched\n');
  });

  it('refuses a link planted at the staged name, which the redirection follows', () => {
    // This is src/main/credentials/nofollow.ts's shape. `> "$t"` follows a
    // link, so without the refusal the payload lands outside the folder BEFORE
    // the mv runs at all.
    writeFileSync(join(root, 'docs', 'target.md'), 'target\n', 'utf8');
    symlinkSync(join(outside, 'victim.txt'), join(root, 'docs', 'target.md.tortie-part'));
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'target.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    const said = run('file-put', [root, 'docs/target.md', digest, payload('PWNED\n')]);
    expect(said.word).toBe(REMOTE_FILE_PUT_OUTSIDE);
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe('victim, untouched\n');
    expect(readFileSync(join(root, 'docs', 'target.md'), 'utf8')).toBe('target\n');
  });
});

describe('a HARD link, which -L cannot see, and which the fix round closed', () => {
  it('a hard link at the staged name does not take the payload out of the folder', () => {
    // THE BLOCKING FINDING OF THE PHASE'S VERIFICATION, driven here over the
    // shipped text. At the parent of the fix this wrote "PWNED-H1" into the
    // file OUTSIDE the confirmed folder and answered `wrote`.
    writeFileSync(join(root, 'docs', 'target.md'), 'target\n', 'utf8');
    linkSync(join(outside, 'victim.txt'), join(root, 'docs', 'target.md.tortie-part'));
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'target.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    const said = run('file-put', [root, 'docs/target.md', digest, payload('PWNED-H1\n')]);
    // The save GOES THROUGH, because the staged name is Tortie's own name and
    // refusing it would leave a person unable to save a file they can see.
    expect(said.word).toBe('wrote');
    // And this is the whole property: nothing outside the folder moved.
    expect(readFileSync(join(outside, 'victim.txt'), 'utf8')).toBe('victim, untouched\n');
    expect(readFileSync(join(root, 'docs', 'target.md'), 'utf8')).toBe('PWNED-H1\n');
    // The planted name is gone rather than still pointing at the file outside.
    expect(existsSync(join(root, 'docs', 'target.md.tortie-part'))).toBe(false);
  });

  it('the unlink took one NAME and not the file the other name still holds', () => {
    // The `rm` is narrower than the redirection it stands in front of, and this
    // is what that sentence means: the inode keeps its other name and its
    // bytes.
    writeFileSync(join(root, 'docs', 'target.md'), 'target\n', 'utf8');
    linkSync(join(outside, 'victim.txt'), join(root, 'docs', 'target.md.tortie-part'));
    const before = statSync(join(outside, 'victim.txt'));
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'target.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    run('file-put', [root, 'docs/target.md', digest, payload('PWNED-H1\n')]);
    const after = statSync(join(outside, 'victim.txt'));
    expect(after.ino).toBe(before.ino);
    expect(after.size).toBe(before.size);
    expect(after.nlink).toBe(1);
  });

  it('a hard link as the file being REPLACED leaves the other name alone', () => {
    // Contained already, and measured rather than assumed. The confirm sheet
    // discloses it: "a file with more than one name keeps only this one".
    writeFileSync(join(outside, 'victim2.txt'), 'victim two\n', 'utf8');
    linkSync(join(outside, 'victim2.txt'), join(root, 'docs', 'hard.md'));
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'hard.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    const said = run('file-put', [root, 'docs/hard.md', digest, payload('PWNED-H2\n')]);
    expect(said.word).toBe('wrote');
    expect(readFileSync(join(outside, 'victim2.txt'), 'utf8')).toBe('victim two\n');
    expect(readFileSync(join(root, 'docs', 'hard.md'), 'utf8')).toBe('PWNED-H2\n');
  });

  it('dir-new and entry-rename are clean against a hard link too', () => {
    // The neighbours of the verb that broke, asked the same question. `mkdir`
    // never opens a destination and `mv` renames a name, so neither follows
    // one, and this arm is what says so rather than assuming it.
    writeFileSync(join(outside, 'victim3.txt'), 'victim three\n', 'utf8');
    linkSync(join(outside, 'victim3.txt'), join(root, 'docs', 'hard-target'));
    const made = run('dir-new', [root, 'docs/hard-target']);
    expect(made.word).toBe('exists');
    expect(readFileSync(join(outside, 'victim3.txt'), 'utf8')).toBe('victim three\n');
    const moved = run('entry-rename', [root, 'docs/hard-target', 'docs/hard-moved']);
    expect(moved.word).toBe('moved');
    expect(readFileSync(join(outside, 'victim3.txt'), 'utf8')).toBe('victim three\n');
    expect(statSync(join(outside, 'victim3.txt')).nlink).toBe(2);
  });

  it('the base64 -D arm writes too, which the exclusive create could have refused', () => {
    // The first arm's redirection CREATES the staged file even when `base64 -d`
    // is the flag this machine does not have, so the fallback has to unlink
    // again before it writes. Without that second unlink, noclobber refuses the
    // save on every machine whose base64 is the older one.
    const bin = join(dir, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(
      join(bin, 'base64'),
      '#!/bin/sh\nif [ "$1" = -d ]; then echo "base64: illegal option -- d" >&2; exit 1; fi\nexec /usr/bin/base64 "$@"\n',
      'utf8'
    );
    chmodSync(join(bin, 'base64'), 0o755);
    writeFileSync(join(root, 'docs', 'old-mac.md'), 'old\n', 'utf8');
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'old-mac.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    const said = run(
      'file-put',
      [root, 'docs/old-mac.md', digest, payload('through the fallback\n')],
      `${bin}:${process.env.PATH ?? ''}`
    );
    expect(said.word).toBe('wrote');
    expect(readFileSync(join(root, 'docs', 'old-mac.md'), 'utf8')).toBe('through the fallback\n');
  });
});

describe('the refusal did not get wider than the hole', () => {
  it('a save with no link in its path still writes', () => {
    const said = run('file-put', [root, 'docs/new.md', 'new', payload('hello\n')]);
    expect(said.word).toBe('wrote');
    expect(readFileSync(join(root, 'docs', 'new.md'), 'utf8')).toBe('hello\n');
  });

  it('the debris of an interrupted save is still written over', () => {
    // Property 2 of the script's own header, which the unlink must not have
    // taken away: the staged name is deterministic so that the next successful
    // save of the same file clears whatever the interrupted one left.
    writeFileSync(join(root, 'docs', 'debris.md'), 'debris\n', 'utf8');
    writeFileSync(join(root, 'docs', 'debris.md.tortie-part'), 'half a save\n', 'utf8');
    const digest = spawnSync('/usr/bin/shasum', ['-a', '256', join(root, 'docs', 'debris.md')], {
      encoding: 'utf8'
    }).stdout.split(' ')[0] ?? '';
    const said = run('file-put', [root, 'docs/debris.md', digest, payload('fresh\n')]);
    expect(said.word).toBe('wrote');
    expect(readFileSync(join(root, 'docs', 'debris.md'), 'utf8')).toBe('fresh\n');
    expect(existsSync(join(root, 'docs', 'debris.md.tortie-part'))).toBe(false);
  });

  it('a folder with no link in its path is still made', () => {
    const said = run('dir-new', [root, 'docs/made']);
    expect(said.word).toBe('made');
    expect(existsSync(join(root, 'docs', 'made'))).toBe(true);
  });

  it('an entry with no link in its path is still renamed', () => {
    const said = run('entry-rename', [root, 'docs/notes.md', 'docs/renamed.md']);
    expect(said.word).toBe('moved');
    expect(existsSync(join(root, 'docs', 'renamed.md'))).toBe(true);
  });

  it('a symbolic link is still RENAMEABLE, which the presence test was written for', () => {
    symlinkSync(join(root, 'docs', 'notes.md'), join(root, 'docs', 'a-link'));
    const said = run('entry-rename', [root, 'docs/a-link', 'docs/a-link-renamed']);
    expect(said.word).toBe('moved');
    expect(lstatSync(join(root, 'docs', 'a-link-renamed')).isSymbolicLink()).toBe(true);
  });

  it('a DANGLING link is still renameable and is not reported as gone', () => {
    symlinkSync(join(outside, 'never-existed'), join(root, 'docs', 'dangling'));
    const said = run('entry-rename', [root, 'docs/dangling', 'docs/dangling-renamed']);
    expect(said.word).toBe('moved');
    expect(lstatSync(join(root, 'docs', 'dangling-renamed')).isSymbolicLink()).toBe(true);
  });
});

describe('main knows the word and maps it onto the outcome it already had', () => {
  it('the three parsers accept it with the field count their script prints', () => {
    expect(parseFilePutAnswer('outside none none')?.word).toBe('outside');
    expect(parseMakeDirAnswer('outside none')?.word).toBe('outside');
    expect(parseRenameAnswer('outside none')?.word).toBe('outside');
  });

  it('a short answer is still refused whole, so the word bought no laxity', () => {
    expect(parseFilePutAnswer('outside none')).toBeNull();
    expect(parseRenameAnswer('outside')).toBeNull();
  });
});
