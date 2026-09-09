/**
 * PHASE 247 — the one door that leaves Tortie, driven with a STUB for macOS.
 *
 * `shell.openPath` is never called by anything in this file. The `open` seam
 * records what it was handed and starts nothing, which is the only way an arm
 * that must refuse can be told apart from an arm that opened something.
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
import type { PathOpenDeps } from '../path-open';
import { openPathExternally } from '../path-open';

let dir = '';
let handed: string[] = [];

const stub = (message = ''): PathOpenDeps => ({
  open: async (path) => {
    handed.push(path);
    return message;
  },
  record: null
});

async function file(name: string, body = 'x', mode?: number): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, body);
  if (mode !== undefined) await chmod(p, mode);
  return p;
}

beforeAll(async () => {
  dir = await realpath(await mkdtemp(join(tmpdir(), 'p247-open-')));
});

afterAll(async () => {
  if (dir.length > 0) await rm(dir, { recursive: true, force: true });
});

describe('fs:openExternalPath', () => {
  it('opens the one kind that is on the allowlist, and hands over the REALPATH', async () => {
    handed = [];
    const target = await file('paper.pdf');
    const link = join(dir, 'spelled.md');
    await symlink(target, link);
    expect(await openPathExternally(link, stub())).toEqual({ status: 'opened' });
    // The spelling was `.md`; what macOS is handed is what the sequence
    // resolved and judged, which is the whole point of asking of the realpath.
    expect(handed).toEqual([target]);
  });

  it('hands macOS NOTHING for every shape the sequence refuses', async () => {
    const bundle = join(dir, 'shot.png');
    await mkdir(join(bundle, 'Contents'), { recursive: true });
    await writeFile(join(bundle, 'Contents', 'Info.plist'), '<plist/>');
    const shapes: [string, string][] = [
      [await file('run.pdf', 'x', 0o755), 'executable-bit'],
      [await file('go.command', '#!/bin/sh\n', 0o755), 'executable-bit'],
      [await file('key.pem', 'k'), 'secret-name'],
      [bundle, 'bundle'],
      [dir, 'not-a-regular-file'],
      [join(dir, 'never-written'), 'missing'],
      ['relative/thing.pdf', 'not-absolute'],
      [`${dir}/a.pdf\n/etc/passwd`, 'control-character'],
      ['/net/anything/x.pdf', 'mount']
    ];
    for (const [path, reason] of shapes) {
      handed = [];
      expect([path, await openPathExternally(path, stub())]).toEqual([
        path,
        { status: 'refused', reason }
      ]);
      expect(handed).toEqual([]);
    }
  });

  it('refuses a kind Tortie draws, rather than assuming the caller behaved', async () => {
    handed = [];
    expect(await openPathExternally(await file('notes.md'), stub())).toEqual({
      status: 'refused',
      reason: 'tortie-draws-it'
    });
    expect(await openPathExternally(await file('shot2.png'), stub())).toEqual({
      status: 'refused',
      reason: 'tortie-draws-it'
    });
    expect(handed).toEqual([]);
  });

  it('refuses a spelling that is not a string at all', async () => {
    handed = [];
    for (const junk of [undefined, null, 42, {}, [], '']) {
      expect(await openPathExternally(junk, stub())).toEqual({
        status: 'refused',
        reason: 'not-absolute'
      });
    }
    expect(handed).toEqual([]);
  });

  it('reports what macOS said rather than throwing', async () => {
    handed = [];
    const answer = await openPathExternally(
      await file('other.pdf'),
      stub('There is no application set to open this document.')
    );
    expect(answer).toEqual({
      status: 'failed',
      message: 'There is no application set to open this document.'
    });
  });

  it('under the record seam it starts nothing at all', async () => {
    handed = [];
    const recorded: string[] = [];
    const answer = await openPathExternally(await file('recorded.pdf'), {
      open: async (path) => {
        handed.push(path);
        return '';
      },
      record: async (path) => {
        recorded.push(path);
      }
    });
    expect(answer).toEqual({ status: 'opened' });
    expect(recorded).toHaveLength(1);
    expect(handed).toEqual([]);
  });
});
