/**
 * PHASE 250 LIFT TWO — a relative path an agent printed, joined to the pane's
 * own base, and asked EVERY question an absolute one is asked.
 *
 * The operator asked for this on 2026-09-09. Research 114 section 4 measured
 * the base right on 84.6% of the spans that can be checked and, of the links
 * it draws, 39 of 41 opening the file the text names. What makes that a
 * defensible trade rather than a guess is the shape of the failures: seven in
 * ten relative targets open nothing under any base at all, so a wrong base
 * overwhelmingly fails closed.
 *
 * Everything here runs over real files and real links in a scratch directory
 * the suite removes. Nothing is opened or executed: every answer is `lstat`,
 * `realpath` and `stat`, and a refusal is a word.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { insideBase, usableBase } from '@shared/path-doors';
import { answerPathDoor } from '../path-door';

let root = '';
let base = '';
let outside = '';

async function file(rel: string, body = 'x', mode?: number): Promise<string> {
  const p = join(base, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, body);
  if (mode !== undefined) await chmod(p, mode);
  return p;
}

beforeAll(async () => {
  // realpath'd, because /var is itself a link to /private/var on macOS and
  // every answer below is about the REALPATH.
  root = await realpath(await mkdtemp(join(tmpdir(), 'p250-base-')));
  base = join(root, 'project');
  outside = join(root, 'elsewhere');
  await mkdir(base, { recursive: true });
  await mkdir(outside, { recursive: true });
});

afterAll(async () => {
  if (root.length > 0) await rm(root, { recursive: true, force: true });
});

describe('a relative spelling and its base', () => {
  it('opens the file under the base — his second and third screenshots', async () => {
    const real = await file('docs/reviews/decision.md', '# hi');
    expect(await answerPathDoor('docs/reviews/decision.md', base)).toEqual({
      door: 'editor',
      path: real
    });
  });

  it('is refused when there is no base at all, which is the shipped backstop', async () => {
    await file('docs/notes.md', '# hi');
    expect(await answerPathDoor('docs/notes.md')).toEqual({
      door: null,
      refusal: 'not-absolute'
    });
    expect(await answerPathDoor('docs/notes.md', '')).toEqual({
      door: null,
      refusal: 'not-absolute'
    });
  });

  it('is refused when the base is the filesystem root, which contains everything', async () => {
    expect(usableBase('/')).toBe(false);
    expect(await answerPathDoor('etc/hosts', '/')).toEqual({
      door: null,
      refusal: 'not-absolute'
    });
  });

  it('answers `missing` when the base is no longer there', async () => {
    expect(await answerPathDoor('docs/notes.md', join(root, 'gone'))).toEqual({
      door: null,
      refusal: 'missing'
    });
  });

  it('follows the base through a symlink, so /tmp and /private/tmp are one tree', async () => {
    const real = await file('docs/linked.md', '# hi');
    const spelled = join(root, 'via-a-link');
    await symlink(base, spelled);
    expect(await answerPathDoor('docs/linked.md', spelled)).toEqual({
      door: 'editor',
      path: real
    });
  });

  it('leaves an ABSOLUTE spelling alone even when a base is offered', async () => {
    const real = await file('docs/abs.md', '# hi');
    expect(await answerPathDoor(real, join(root, 'somewhere-else'))).toEqual({
      door: 'editor',
      path: real
    });
  });

  it('never joins a `~` spelling to a base, because `~` means a home', async () => {
    expect(await answerPathDoor('~nobody/notes.md', base)).toEqual({
      door: null,
      refusal: 'not-absolute'
    });
  });
});

/**
 * CONTAINMENT, asked of the REALPATH so a `..` climb and a symlink out of the
 * tree are one clause. Research 114 section 4.6 priced it at 7 of 1,224 links
 * over his own panes, and it removes the whole family in one line.
 */
describe('a resolved path that leaves its base', () => {
  it('refuses a `..` climb into a sibling tree', async () => {
    await writeFile(join(outside, 'secrets.md'), 'x');
    expect(await answerPathDoor('../elsewhere/secrets.md', base)).toEqual({
      door: null,
      refusal: 'outside-base'
    });
  });

  it('refuses a symlink inside the base whose leaf is outside it', async () => {
    const target = join(outside, 'escaped.md');
    await writeFile(target, 'x');
    await mkdir(join(base, 'links'), { recursive: true });
    await symlink(target, join(base, 'links', 'looks-local.md'));
    expect(await answerPathDoor('links/looks-local.md', base)).toEqual({
      door: null,
      refusal: 'outside-base'
    });
  });

  it('is a prefix question WITH the separator, so /a/bc is not inside /a/b', () => {
    expect(insideBase('/a/b/c.md', '/a/b')).toBe(true);
    expect(insideBase('/a/b', '/a/b')).toBe(true);
    expect(insideBase('/a/b/c.md', '/a/b/')).toBe(true);
    expect(insideBase('/a/bc.md', '/a/b')).toBe(false);
    expect(insideBase('/a/b/c.md', 'a/b')).toBe(false);
  });

  it('asks nothing of containment for a spelling that was already absolute', async () => {
    const target = join(outside, 'plainly-named.md');
    await writeFile(target, 'x');
    expect(await answerPathDoor(target, base)).toEqual({
      door: 'editor',
      path: target
    });
  });
});

/**
 * A BASE IS NOT A BYPASS. Every refusal an absolute spelling meets, a resolved
 * one meets too, because `decidePathDoor` asks them all of the realpath.
 */
describe('a resolved path is asked every question an absolute one is asked', () => {
  it('refuses the executable bit', async () => {
    await file('bin/go.sh', '#!/bin/sh\n', 0o755);
    expect(await answerPathDoor('bin/go.sh', base)).toEqual({
      door: null,
      refusal: 'executable-bit'
    });
  });

  it('refuses a secret by name, and the name it reads is the REALPATH’s', async () => {
    await file('config/.env', 'A=1');
    expect(await answerPathDoor('config/.env', base)).toEqual({
      door: null,
      refusal: 'secret-name'
    });
    // ...and through a link spelled as prose, whose leaf is key material.
    await file('keys/server.pem', 'k');
    await symlink(join(base, 'keys/server.pem'), join(base, 'docs/readme.md'));
    expect(await answerPathDoor('docs/readme.md', base)).toEqual({
      door: null,
      refusal: 'secret-name'
    });
  });

  it('refuses a directory', async () => {
    await mkdir(join(base, 'docs/deeper'), { recursive: true });
    expect(await answerPathDoor('docs/deeper', base)).toEqual({
      door: null,
      refusal: 'not-a-regular-file'
    });
  });

  it('refuses a bundle wearing an ordinary suffix', async () => {
    await mkdir(join(base, 'assets/shot.png/Contents'), { recursive: true });
    await writeFile(join(base, 'assets/shot.png/Contents/Info.plist'), '<plist/>');
    expect(await answerPathDoor('assets/shot.png', base)).toEqual({
      door: null,
      refusal: 'bundle'
    });
  });

  it('refuses a control character in the relative spelling', async () => {
    expect(await answerPathDoor('docs/notes.md\n/etc/passwd', base)).toEqual({
      door: null,
      refusal: 'control-character'
    });
  });

  it('refuses a mount reached through the base, before any call is made', async () => {
    expect(await answerPathDoor('x.md', '/Volumes/anything')).toEqual({
      door: null,
      refusal: 'mount'
    });
    expect(await answerPathDoor('x.md', '/net/anything')).toEqual({
      door: null,
      refusal: 'mount'
    });
  });

  /**
   * The refusal word names the clause that really refused, which is why
   * nothing about the SPELLING is asked at the join: a relative path with a
   * newline in it is a `control-character` and not a `not-absolute`.
   */
  it('answers `missing` for a spelling longer than any path this Mac can hold', async () => {
    expect(await answerPathDoor(`docs/${'x'.repeat(2000)}.md`, base)).toEqual({
      door: null,
      refusal: 'missing'
    });
  });
});

/**
 * THE MAC DOOR IS CLOSED TO A RESOLVED SPELLING, and the asymmetry is the
 * reason. Opening the wrong file in an editor tab is a surprise a person sees
 * and closes; handing the wrong file to LaunchServices runs a program. It
 * costs zero measured spans — there is no `.pdf` anywhere in the 59,791 rows
 * research 114 read — and it is here so it stays that way.
 */
describe('the Mac door and a spelling that was relative', () => {
  it('refuses a resolved .pdf that an absolute spelling would have taken', async () => {
    const real = await file('docs/paper.pdf', '%PDF-1.4\n');
    expect(await answerPathDoor('docs/paper.pdf', base)).toEqual({
      door: null,
      refusal: 'relative-external'
    });
    // ...and the same file, spelled absolutely, still goes to the Mac.
    expect(await answerPathDoor(real)).toEqual({ door: 'mac', path: real });
  });

  it('refuses a resolved link spelled .md whose leaf is a .pdf', async () => {
    await file('papers/real.pdf', '%PDF-1.4\n');
    await symlink(join(base, 'papers/real.pdf'), join(base, 'papers/spelled.md'));
    expect(await answerPathDoor('papers/spelled.md', base)).toEqual({
      door: null,
      refusal: 'relative-external'
    });
  });

  it('still opens a resolved picture in Tortie, which decodes bytes and runs nothing', async () => {
    const real = await file('assets/real.png');
    expect(await answerPathDoor('assets/real.png', base)).toEqual({
      door: 'image',
      path: real
    });
  });
});
