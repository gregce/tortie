/**
 * Phase 108, the miss-recording ContextFs and the context-read answer fold.
 *
 * Everything here is pure: a bundle in memory, a filesystem over it, and the
 * parse and fold of the line records the far side prints. What these tests
 * hold is the contract the driver's loop converges on: an answered question
 * answers, an unanswered one is recorded once with the method that asked, a
 * pinned absence is never asked twice, and the link rewrite follows the same
 * transitive rule the memory filesystem already implements.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine answers in this
 * format, what a call costs, or that the read wrote nothing over there. That
 * is `node build/probe-p108-context.mjs`, against a loopback scratch machine.
 */

import { describe, expect, it } from 'vitest';
import {
  createEmptyRemoteBundle,
  createRecordingContextFs,
  foldContextReadAnswer,
  parseContextReadPayload,
  resolveRemotePath,
  type RemoteFsBundle
} from '../recording-fs';
import { CONTEXT_READ_LIMITS } from '../port';

/** One answered enumeration of `/h/.claude/skills` to depth 2. */
function seededBundle(): RemoteFsBundle {
  const bundle = createEmptyRemoteBundle();
  foldContextReadAnswer(
    bundle,
    { enumerate: ['/h/.claude/skills'], depth: 2, read: [] },
    parseContextReadPayload(
      [
        'E d 100 96 /h/.claude/skills',
        'E d 100 96 /h/.claude/skills/alpha',
        'E f 100 20 /h/.claude/skills/alpha/SKILL.md',
        'E ld 100 96 /h/.claude/skills/linked',
        'R /h/real/linked',
        ''
      ].join('\n')
    )
  );
  return bundle;
}

describe('parseContextReadPayload', () => {
  it('reads the four record shapes, with the path as the rest of the line', () => {
    const records = parseContextReadPayload(
      [
        'E d 1700000000 96 /h/with space/dir',
        'E lf 1700000001 12 /h/link.md',
        'R /h/real/target.md',
        'F 5 /h/read me.md',
        Buffer.from('hello').toString('base64'),
        'X /h/not there.md',
        ''
      ].join('\n')
    );
    expect(records).toEqual([
      {
        type: 'entry',
        kind: 'd',
        mtime: 1700000000,
        size: 96,
        path: '/h/with space/dir',
        link: null
      },
      {
        type: 'entry',
        kind: 'lf',
        mtime: 1700000001,
        size: 12,
        path: '/h/link.md',
        link: '/h/real/target.md'
      },
      {
        type: 'file',
        size: 5,
        path: '/h/read me.md',
        data: Buffer.from('hello')
      },
      { type: 'absent', path: '/h/not there.md' }
    ]);
  });

  it('drops a record it cannot trust rather than guessing', () => {
    const records = parseContextReadPayload(
      [
        'E q 1 2 /h/unknown-kind',
        'E d one 2 /h/mtime-not-a-number',
        'E d 1 2 relative/path',
        'F 5 /h/bad-base64.md',
        'not base64 at all!',
        '  File: "/h/gnu-stat-garbage"',
        'Block size: 4096 Fundamental block size: 4096',
        'E d 1 2 /h/good',
        ''
      ].join('\n')
    );
    expect(records).toEqual([
      { type: 'entry', kind: 'd', mtime: 1, size: 2, path: '/h/good', link: null }
    ]);
  });

  it('reads the empty word as no records', () => {
    expect(parseContextReadPayload('none')).toEqual([]);
    expect(parseContextReadPayload('none\n')).toEqual([]);
  });
});

describe('the bundle answers', () => {
  it('lists a covered directory with node entry semantics', async () => {
    const fs = createRecordingContextFs(seededBundle());
    const listed = await fs.readDir('/h/.claude/skills');
    expect(listed).toEqual([
      { name: 'alpha', isDirectory: true, isFile: false, isSymbolicLink: false },
      { name: 'linked', isDirectory: false, isFile: false, isSymbolicLink: true }
    ]);
    expect(fs.takeMisses()).toEqual([]);
  });

  it('stats a symlink as its target, the way the local stat follows', async () => {
    const fs = createRecordingContextFs(seededBundle());
    expect(await fs.stat('/h/.claude/skills/linked')).toEqual({
      size: 96,
      isDirectory: true,
      isFile: false
    });
    expect(fs.takeMisses()).toEqual([]);
  });

  it('answers a name a listing covered and did not contain, without asking', async () => {
    const fs = createRecordingContextFs(seededBundle());
    expect(await fs.stat('/h/.claude/skills/absent-name')).toBeNull();
    expect(await fs.exists('/h/.claude/skills/absent-name')).toBe(false);
    expect(await fs.readDir('/h/.claude/skills/absent-name')).toBeNull();
    expect(fs.takeMisses()).toEqual([]);
  });

  it('cuts a text read at maxBytes on the BUFFER, as the local port does', async () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: [], depth: 2, read: ['/h/big.md'] },
      parseContextReadPayload(
        `F 10 /h/big.md\n${Buffer.from('0123456789').toString('base64')}\n`
      )
    );
    const fs = createRecordingContextFs(bundle);
    expect(await fs.readText('/h/big.md', 4)).toBe('0123');
    expect(await fs.readText('/h/big.md')).toBe('0123456789');
  });

  it('never hashes a truncated fetch as if it were the whole file', async () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: [], depth: 2, read: ['/h/cut.md'] },
      parseContextReadPayload(
        `F 999 /h/cut.md\n${Buffer.from('short').toString('base64')}\n`
      )
    );
    const fs = createRecordingContextFs(bundle);
    expect(await fs.hashFile('/h/cut.md')).toBeNull();
    // The stat still carries the TRUE size, so the reader sees the file.
    expect(await fs.stat('/h/cut.md')).toEqual({
      size: 999,
      isDirectory: false,
      isFile: true
    });
  });
});

describe('the misses', () => {
  it('records a question it cannot answer, once, with the asking method', async () => {
    const fs = createRecordingContextFs(seededBundle());
    expect(await fs.readDir('/h/.codex')).toBeNull();
    expect(await fs.readDir('/h/.codex')).toBeNull();
    expect(await fs.readText('/h/.claude.json')).toBeNull();
    expect(await fs.stat('/h/.agents')).toBeNull();
    expect(await fs.exists('/h/AGENTS.md')).toBe(false);
    expect(await fs.hashFile('/h/other.md')).toBeNull();
    expect(fs.takeMisses().sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: '/h/.agents', method: 'stat' },
      { path: '/h/.claude.json', method: 'readText' },
      { path: '/h/.codex', method: 'readDir' },
      { path: '/h/AGENTS.md', method: 'exists' },
      { path: '/h/other.md', method: 'hashFile' }
    ]);
  });

  it('asks for the children of a known but unlisted symlink TARGET', async () => {
    const fs = createRecordingContextFs(seededBundle());
    expect(await fs.readDir('/h/.claude/skills/linked')).toBeNull();
    expect(fs.takeMisses()).toEqual([
      { path: '/h/real/linked', method: 'readDir' }
    ]);
  });

  it('a pinned absence is never asked twice', async () => {
    const bundle = seededBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: ['/h/.codex'], depth: 2, read: ['/h/.claude.json'] },
      parseContextReadPayload('X /h/.codex\nX /h/.claude.json\n')
    );
    const fs = createRecordingContextFs(bundle);
    expect(await fs.readDir('/h/.codex')).toBeNull();
    expect(await fs.readText('/h/.claude.json')).toBeNull();
    expect(await fs.exists('/h/.codex')).toBe(false);
    expect(fs.takeMisses()).toEqual([]);
  });
});

describe('the link rewrite', () => {
  it('rewrites through links transitively, the memory fs rule', async () => {
    const bundle = createEmptyRemoteBundle();
    bundle.links.set('/h/a', '/h/b');
    bundle.links.set('/h/b/inner', '/h/c');
    const fs = createRecordingContextFs(bundle);
    expect(await fs.realPath('/h/a/inner/leaf.md')).toBe('/h/c/leaf.md');
    expect(await fs.realPath('/h/untouched.md')).toBe('/h/untouched.md');
    expect(fs.takeMisses()).toEqual([]);
  });

  it('stops on a link cycle instead of spinning', () => {
    const bundle = createEmptyRemoteBundle();
    bundle.links.set('/h/x', '/h/y');
    bundle.links.set('/h/y', '/h/x');
    expect(['/h/x', '/h/y']).toContain(resolveRemotePath(bundle, '/h/x'));
  });
});

describe('the fold', () => {
  it('a link kind wins over the plain record find -H prints for the same root', () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: ['/h/rootlink'], depth: 2, read: [] },
      parseContextReadPayload(
        [
          'E ld 100 96 /h/rootlink',
          'R /h/real-root',
          'E d 100 96 /h/rootlink',
          'E d 100 64 /h/rootlink/sub',
          ''
        ].join('\n')
      )
    );
    expect(bundle.entries.get('/h/rootlink')?.kind).toBe('ld');
    expect(bundle.links.get('/h/rootlink')).toBe('/h/real-root');
    // The children were rekeyed under the resolved root, so a listing through
    // the link finds them.
    expect(bundle.entries.has('/h/real-root/sub')).toBe(true);
    expect(bundle.listed.has('/h/real-root')).toBe(true);
  });

  it('an X never overrides an answer from the other list', () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: ['/h/dir'], depth: 2, read: ['/h/dir'] },
      parseContextReadPayload(
        ['E d 100 96 /h/dir', 'X /h/dir', ''].join('\n')
      )
    );
    expect(bundle.entries.get('/h/dir')?.kind).toBe('d');
    expect(bundle.absent.has('/h/dir')).toBe(false);
  });

  it('marks listed only above the depth boundary, and never a symlink', () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: ['/h/root'], depth: 2, read: [] },
      parseContextReadPayload(
        [
          'E d 100 96 /h/root',
          'E d 100 96 /h/root/one',
          'E d 100 96 /h/root/one/two',
          'E ld 100 96 /h/root/link',
          'R /h/elsewhere',
          ''
        ].join('\n')
      )
    );
    expect(bundle.listed.has('/h/root')).toBe(true);
    expect(bundle.listed.has('/h/root/one')).toBe(true);
    // Depth 2 entries exist but their own children are unknown.
    expect(bundle.listed.has('/h/root/one/two')).toBe(false);
    // find does not descend a symlink, so its target stays unlisted.
    expect(bundle.listed.has('/h/root/link')).toBe(false);
    expect(bundle.listed.has('/h/elsewhere')).toBe(false);
  });

  it('pins a sent path that came back with nothing, so it is never re-asked', () => {
    const bundle = createEmptyRemoteBundle();
    foldContextReadAnswer(
      bundle,
      { enumerate: ['/h/silent-dir'], depth: 2, read: ['/h/silent.md'] },
      []
    );
    expect(bundle.absent.has('/h/silent-dir')).toBe(true);
    expect(bundle.absent.has('/h/silent.md')).toBe(true);
  });
});

describe('the limits this module leans on', () => {
  it('the default read cap is the one the port declares', () => {
    // The recording readText slices at the caller's maxBytes, and the default
    // is the port's own, so a remote read and a local read cut the same way.
    expect(CONTEXT_READ_LIMITS.defaultMaxBytes).toBe(4 * 1024 * 1024);
    expect(CONTEXT_READ_LIMITS.bigJsonMaxBytes).toBe(32 * 1024 * 1024);
  });
});
