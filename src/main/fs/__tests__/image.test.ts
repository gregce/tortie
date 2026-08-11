/**
 * The image reader (Phase 12.10 item 1).
 *
 * The properties worth pinning down are the ones a screenshot cannot show:
 * that the working copy is never read into memory (the URL path stats and
 * stops), that the cap is enforced before any decode, that a symlink cannot
 * smuggle a non-image past the extension check, and that a blob missing at
 * HEAD is reported as "missing" rather than thrown — because that is exactly
 * what an ADDED image looks like and the comparison has to render it.
 */

import { describe, expect, it, vi } from 'vitest';
import { IMAGE_CAP_BYTES } from '@shared/image-types';
import type { GmuxErrorPayload } from '@shared/types';
import { createImageReader } from '../image';
import type { ImageReaderDeps } from '../image';

interface Fake {
  deps: ImageReaderDeps;
  statFile: ReturnType<typeof vi.fn>;
  showAtRef: ReturnType<typeof vi.fn>;
}

function fake(overrides: Partial<ImageReaderDeps> = {}): Fake {
  const statFile = vi.fn(async () => ({ size: 1024, isFile: true }));
  const showAtRef = vi.fn(async () => Buffer.from('OLD-PNG-BYTES'));
  const deps: ImageReaderDeps = {
    statFile: statFile as unknown as ImageReaderDeps['statFile'],
    realPath: async (p: string) => p,
    showAtRef: showAtRef as unknown as ImageReaderDeps['showAtRef'],
    assetUrl: (p: string) => `gmux-asset://local${p}`,
    ...overrides
  };
  return { deps, statFile, showAtRef };
}

function payloadOf(err: unknown): GmuxErrorPayload {
  const raw = err instanceof Error ? err.message : String(err);
  return JSON.parse(raw.slice(raw.indexOf('{'))) as GmuxErrorPayload;
}

describe('the working copy', () => {
  it('answers with an asset URL and never reads the bytes', async () => {
    const f = fake();
    const reader = createImageReader(f.deps);
    const result = await reader.read({ path: '/repo/docs/shot.png' });

    expect(result).toEqual({
      status: 'ok',
      path: '/repo/docs/shot.png',
      mediaType: 'image/png',
      bytes: 1024,
      url: 'gmux-asset://local/repo/docs/shot.png',
      // The whole point: nothing is base64'd across IPC for a file that
      // Chromium can stream from disk itself.
      dataUrl: null
    });
    expect(f.statFile).toHaveBeenCalledOnce();
  });

  it('refuses a file over the cap before anything is decoded', async () => {
    const f = fake({
      statFile: async () => ({ size: IMAGE_CAP_BYTES + 1, isFile: true })
    });
    const result = await createImageReader(f.deps).read({
      path: '/repo/huge.jpg'
    });
    expect(result).toEqual({
      status: 'too-large',
      path: '/repo/huge.jpg',
      mediaType: 'image/jpeg',
      bytes: IMAGE_CAP_BYTES + 1,
      capBytes: IMAGE_CAP_BYTES
    });
  });

  it('takes a file exactly at the cap', async () => {
    const f = fake({
      statFile: async () => ({ size: IMAGE_CAP_BYTES, isFile: true })
    });
    const result = await createImageReader(f.deps).read({
      path: '/repo/big.png'
    });
    expect(result.status).toBe('ok');
  });

  it('judges the symlink TARGET, so logo.png -> id_rsa is refused', async () => {
    const f = fake({ realPath: async () => '/Users/me/.ssh/id_rsa' });
    await expect(
      createImageReader(f.deps).read({ path: '/repo/logo.png' })
    ).rejects.toThrow(/not an image/i);
  });

  it('reports a vanished file as missing rather than throwing', async () => {
    const f = fake({
      statFile: async () => {
        throw new Error('ENOENT');
      }
    });
    const result = await createImageReader(f.deps).read({
      path: '/repo/gone.png'
    });
    expect(result).toEqual({ status: 'missing', path: '/repo/gone.png' });
  });

  it('refuses a type gmux cannot display', async () => {
    const f = fake();
    await expect(
      createImageReader(f.deps).read({ path: '/repo/scan.tiff' })
    ).rejects.toThrow(/cannot display/i);
  });

  it('rejects a path that is not absolute or not given', async () => {
    const reader = createImageReader(fake().deps);
    await expect(reader.read({ path: '' })).rejects.toThrow();
    const err = await reader.read({ path: '  ' }).catch((e: unknown) => e);
    expect(payloadOf(err).code).toBe('INVALID_INPUT');
  });
});

describe('the HEAD side', () => {
  it('comes back as a data URL, because a blob has no file on disk', async () => {
    const f = fake();
    const result = await createImageReader(f.deps).read({
      path: '/repo/docs/chart.png',
      rev: 'HEAD',
      repoPath: '/repo',
      relPath: 'docs/chart.png'
    });
    expect(f.showAtRef).toHaveBeenCalledWith('/repo', 'HEAD', 'docs/chart.png');
    expect(result).toMatchObject({
      status: 'ok',
      mediaType: 'image/png',
      url: null
    });
    if (result.status !== 'ok' || result.dataUrl === null) {
      throw new Error('expected a data URL');
    }
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(
      Buffer.from(result.dataUrl.split(',')[1] ?? '', 'base64').toString()
    ).toBe('OLD-PNG-BYTES');
  });

  it('reports an image that is new since HEAD as missing', async () => {
    const f = fake({ showAtRef: async () => null });
    const result = await createImageReader(f.deps).read({
      path: '/repo/new.png',
      rev: 'HEAD',
      repoPath: '/repo',
      relPath: 'new.png'
    });
    expect(result).toEqual({ status: 'missing', path: '/repo/new.png' });
  });

  it('needs the repo and the path inside it', async () => {
    const err = await createImageReader(fake().deps)
      .read({ path: '/repo/x.png', rev: 'HEAD' })
      .catch((e: unknown) => e);
    expect(payloadOf(err).code).toBe('INVALID_INPUT');
  });

  it('caps a huge blob the same way as a huge file', async () => {
    const f = fake({
      showAtRef: async () => Buffer.alloc(IMAGE_CAP_BYTES + 1)
    });
    const result = await createImageReader(f.deps).read({
      path: '/repo/x.png',
      rev: 'HEAD',
      repoPath: '/repo',
      relPath: 'x.png'
    });
    expect(result.status).toBe('too-large');
  });
});
