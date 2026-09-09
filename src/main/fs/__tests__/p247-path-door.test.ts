/**
 * PHASE 247 — the door sequence, driven over real files and real links.
 *
 * These are the hostile shapes the charter names, asked of the SHIPPING
 * sequence rather than of a model of it. Nothing here is ever opened or
 * executed: every answer is `lstat`, `realpath` and `stat`, and a refusal is a
 * word. The fixture directory is made and removed by the suite.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  chmod,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decidePathDoor } from '@shared/path-doors';
import { answerPathDoor, factsForPath } from '../path-door';

let dir = '';

async function file(name: string, body = 'x', mode?: number): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, body);
  if (mode !== undefined) await chmod(p, mode);
  return p;
}

beforeAll(async () => {
  // realpath'd, because /var is itself a link to /private/var on macOS and
  // every answer below is about the REALPATH.
  dir = await realpath(await mkdtemp(join(tmpdir(), 'p247-doors-')));
});

afterAll(async () => {
  if (dir.length > 0) await rm(dir, { recursive: true, force: true });
});

describe('the door sequence', () => {
  it('sends prose and code to the editor', async () => {
    const answer = await answerPathDoor(await file('notes.md', '# hi'));
    expect(answer.door).toBe('editor');
  });

  it('sends a picture to Tortie’s own image surface', async () => {
    const answer = await answerPathDoor(await file('shot.png'));
    expect(answer.door).toBe('image');
  });

  it('sends an ordinary .pdf to the Mac, and it is the only kind that leaves', async () => {
    const answer = await answerPathDoor(await file('paper.pdf'));
    expect(answer.door).toBe('mac');
  });

  it('draws a .png that is really a shell script, and runs nothing', async () => {
    // Tortie's image surface decodes bytes. A file that is not a picture draws
    // a broken picture; it does not execute, which is the whole reason the
    // Tortie door is the default one.
    const answer = await answerPathDoor(
      await file('fake.png', '#!/bin/sh\necho hi\n')
    );
    expect(answer.door).toBe('image');
  });

  it('refuses ANY executable bit before it reads an extension', async () => {
    for (const [name, mode] of [
      ['run.png', 0o755],
      ['paper2.pdf', 0o755],
      ['go.command', 0o755],
      ['lib.dylib', 0o755],
      ['group-only', 0o050],
      ['other-only', 0o005]
    ] as const) {
      const answer = await answerPathDoor(await file(name, 'x', mode));
      expect([name, answer]).toEqual([
        name,
        { door: null, refusal: 'executable-bit' }
      ]);
    }
  });

  it('opens a .command with no executable bit as TEXT, because it is not on the allowlist', async () => {
    const answer = await answerPathDoor(await file('go2.command', '#!/bin/sh\n', 0o644));
    expect(answer.door).toBe('editor');
  });

  it('refuses a bundle directory wearing a .png suffix', async () => {
    const bundle = join(dir, 'shot2.png');
    await mkdir(join(bundle, 'Contents'), { recursive: true });
    await writeFile(join(bundle, 'Contents', 'Info.plist'), '<plist/>');
    expect(await answerPathDoor(bundle)).toEqual({
      door: null,
      refusal: 'bundle'
    });
  });

  it('refuses a .app, and refuses a symlink spelled .png whose LEAF is one', async () => {
    const app = join(dir, 'Thing.app');
    await mkdir(join(app, 'Contents', 'MacOS'), { recursive: true });
    await writeFile(join(app, 'Contents', 'MacOS', 'Thing'), '#!/bin/sh\n');
    await chmod(join(app, 'Contents', 'MacOS', 'Thing'), 0o755);
    expect(await answerPathDoor(app)).toEqual({ door: null, refusal: 'bundle' });
    const link = join(dir, 'pic.png');
    await symlink(app, link);
    expect(await answerPathDoor(link)).toEqual({ door: null, refusal: 'bundle' });
  });

  it('refuses a symlink spelled .md whose LEAF is key material', async () => {
    const key = await file('server.pem', 'k');
    const link = join(dir, 'readme.md');
    await symlink(key, link);
    expect(await answerPathDoor(link)).toEqual({
      door: null,
      refusal: 'secret-name'
    });
  });

  it('refuses a directory, and never calls one a link', async () => {
    const plain = join(dir, 'plainfolder');
    await mkdir(plain, { recursive: true });
    expect(await answerPathDoor(plain)).toEqual({
      door: null,
      refusal: 'not-a-regular-file'
    });
  });

  it('refuses a control character in the spelling before any filesystem call', async () => {
    // A NUL, and a newline under it — the character a macOS filename can
    // really carry, and the one the drop store's own newline rescue exists for.
    expect(await answerPathDoor(`${dir}/a.png\n/etc/passwd`)).toEqual({
      door: null,
      refusal: 'control-character'
    });
    expect(await answerPathDoor(`${dir}/a\u0000b.png`)).toEqual({
      door: null,
      refusal: 'control-character'
    });
  });

  it('refuses a relative spelling and a path that is not there', async () => {
    expect(await answerPathDoor('src/main.ts')).toEqual({
      door: null,
      refusal: 'not-absolute'
    });
    expect(await answerPathDoor(join(dir, 'never-written'))).toEqual({
      door: null,
      refusal: 'missing'
    });
  });

  it('refuses a network mount before any call, so a stale automount cannot hang a hover', async () => {
    expect(await factsForPath('/Volumes/anything/x.md')).toMatchObject({
      realPath: null,
      kind: 'missing'
    });
    expect(await factsForPath('/net/anything/x.md')).toMatchObject({
      realPath: null,
      kind: 'missing'
    });
  });

  it('answers about the REALPATH and not the spelling', async () => {
    const target = await file('real-name.pdf');
    const link = join(dir, 'spelled.md');
    await symlink(target, link);
    const answer = await answerPathDoor(link);
    // The leaf decides: spelled .md, really a .pdf, so it takes the Mac door
    // and the path handed on is the resolved one.
    expect(answer).toEqual({ door: 'mac', path: target });
  });

  it('asks MODE before EXTENSION — the order is the rule', () => {
    // The pure decision, so the order can be asserted without a filesystem.
    const executablePdf = decidePathDoor({
      spelling: '/a/paper.pdf',
      realPath: '/a/paper.pdf',
      kind: 'file',
      bundle: false,
      executable: true
    });
    expect(executablePdf).toEqual({ door: null, refusal: 'executable-bit' });
  });

  it('asks the NAME before the mode, so a secret is refused as a secret', () => {
    expect(
      decidePathDoor({
        spelling: '/a/id_rsa',
        realPath: '/a/id_rsa',
        kind: 'file',
        bundle: false,
        executable: true
      })
    ).toEqual({ door: null, refusal: 'secret-name' });
  });
});
