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
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, existsSync, lstatSync } from 'node:fs';
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
function run(id: string, args: string[]): { out: string; word: string } {
  const done = spawnSync('/bin/sh', ['-c', textOf(id), 'sh', ...args], {
    encoding: 'utf8'
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

describe('the refusal did not get wider than the hole', () => {
  it('a save with no link in its path still writes', () => {
    const said = run('file-put', [root, 'docs/new.md', 'new', payload('hello\n')]);
    expect(said.word).toBe('wrote');
    expect(readFileSync(join(root, 'docs', 'new.md'), 'utf8')).toBe('hello\n');
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
