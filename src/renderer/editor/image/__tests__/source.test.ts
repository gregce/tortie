/**
 * Which of the five states an image tab is in (Phase 12.10 item 1), and the
 * SVG round trip.
 *
 * The state machine is worth pinning down because two of its answers look
 * like failures and are not: an image missing at HEAD is what an ADDED file
 * looks like, and a raster tab with no reply yet is loading rather than
 * broken.
 */

import { describe, expect, it } from 'vitest';
import {
  IMAGE_EXTENSIONS,
  imageMediaType,
  isImagePath,
  isSvgPath
} from '@shared/image-types';
import { imageSourceFor, svgDataUrl, utf8Bytes } from '../source';

const base = {
  loading: false,
  error: null,
  truncated: false,
  svgText: null,
  data: null
};

describe('what gmux can display', () => {
  it('recognizes every type the phase promised', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg']) {
      expect(isImagePath(`/repo/pic.${ext}`)).toBe(true);
    }
  });

  it('is case-insensitive about the extension', () => {
    expect(isImagePath('/repo/SHOT.PNG')).toBe(true);
    expect(isSvgPath('/repo/Logo.SVG')).toBe(true);
  });

  it('refuses what Chromium cannot decode, rather than showing a broken icon', () => {
    expect(isImagePath('/repo/scan.tiff')).toBe(false);
    expect(isImagePath('/repo/raw.psd')).toBe(false);
  });

  it('is not fooled by a dotfile or a path that merely contains a type', () => {
    expect(isImagePath('/repo/.png')).toBe(false);
    expect(isImagePath('/repo/png/notes.txt')).toBe(false);
  });

  it('gives every allowed extension a media type', () => {
    for (const ext of IMAGE_EXTENSIONS) {
      expect(imageMediaType(`/x${ext}`)).not.toBeNull();
    }
  });
});

describe('raster states', () => {
  it('is loading until the read answers', () => {
    expect(imageSourceFor(base)).toEqual({ kind: 'loading' });
  });

  it('is ready with the asset URL the reader gave it', () => {
    expect(
      imageSourceFor({
        ...base,
        data: {
          status: 'ok',
          path: '/repo/a.png',
          mediaType: 'image/png',
          bytes: 100,
          url: 'gmux-asset://local/repo/a.png',
          dataUrl: null
        }
      })
    ).toEqual({
      kind: 'ready',
      src: 'gmux-asset://local/repo/a.png',
      bytes: 100,
      mediaType: 'image/png'
    });
  });

  it('prefers the data URL when there is one (the HEAD side)', () => {
    const out = imageSourceFor({
      ...base,
      data: {
        status: 'ok',
        path: '/repo/a.png',
        mediaType: 'image/png',
        bytes: 4,
        url: null,
        dataUrl: 'data:image/png;base64,AAAA'
      }
    });
    expect(out).toMatchObject({ kind: 'ready', src: 'data:image/png;base64,AAAA' });
  });

  it('carries the cap through so the copy can name both numbers', () => {
    expect(
      imageSourceFor({
        ...base,
        data: {
          status: 'too-large',
          path: '/repo/huge.jpg',
          mediaType: 'image/jpeg',
          bytes: 50_000_000,
          capBytes: 33_554_432
        }
      })
    ).toEqual({
      kind: 'too-large',
      bytes: 50_000_000,
      capBytes: 33_554_432,
      mediaType: 'image/jpeg'
    });
  });

  it('reports missing, which is also what "added since HEAD" looks like', () => {
    expect(
      imageSourceFor({
        ...base,
        data: { status: 'missing', path: '/repo/new.png' }
      })
    ).toEqual({ kind: 'missing' });
  });

  it('lets a load error win over everything', () => {
    expect(
      imageSourceFor({ ...base, error: 'Could not open a.png' })
    ).toEqual({ kind: 'error', message: 'Could not open a.png' });
  });
});

describe('svg — the file that is both', () => {
  it('renders from its TEXT, so Split can redraw it as you type', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const out = imageSourceFor({ ...base, svgText: markup });
    expect(out).toMatchObject({ kind: 'ready', mediaType: 'image/svg+xml' });
    if (out.kind !== 'ready') throw new Error('expected ready');
    expect(out.src.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(out.src.split(',')[1] ?? '')).toBe(markup);
  });

  it('survives non-ASCII labels (the reason it is not base64)', () => {
    const markup = '<svg><text>日本語 · café</text></svg>';
    const url = svgDataUrl(markup);
    expect(decodeURIComponent(url.split(',')[1] ?? '')).toBe(markup);
  });

  it('measures itself in UTF-8 bytes, not characters', () => {
    expect(utf8Bytes('abc')).toBe(3);
    expect(utf8Bytes('日')).toBe(3);
  });

  it('refuses a TRUNCATED read rather than drawing half a picture', () => {
    const out = imageSourceFor({
      ...base,
      truncated: true,
      svgText: '<svg><path d="M0 0 L10'
    });
    expect(out.kind).toBe('too-large');
  });
});
