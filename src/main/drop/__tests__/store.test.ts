import { describe, expect, it } from 'vitest';
import { LAUNCHABLE_AGENT_IDS } from '../../agents/registry';
import { imageDropFor, imageDropTable } from '../../agents/registry';
import { needsRescueCopy } from '../prepare';
import { safeStem, sniffImage } from '../store';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('sniffImage', () => {
  it('identifies PNG from its signature, not its name', () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)))
      .toEqual({ ext: '.png', isImage: true });
  });

  it('identifies JPEG, GIF and WEBP', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe('.jpg');
    expect(sniffImage(new TextEncoder().encode('GIF89a'))?.ext).toBe('.gif');
    const webp = new TextEncoder().encode('RIFF____WEBPVP8 ');
    expect(sniffImage(webp)?.ext).toBe('.webp');
  });

  it('identifies HEIC and AVIF by their ftyp brand', () => {
    const heic = new TextEncoder().encode('\0\0\0\x18ftypheic');
    expect(sniffImage(heic)?.ext).toBe('.heic');
    const avif = new TextEncoder().encode('\0\0\0\x18ftypavif');
    expect(sniffImage(avif)?.ext).toBe('.avif');
  });

  it('identifies SVG text', () => {
    expect(sniffImage(new TextEncoder().encode('  <svg xmlns=')))
      .toEqual({ ext: '.svg', isImage: true });
  });

  it('returns null for anything that is not an image', () => {
    expect(sniffImage(new TextEncoder().encode('hello world'))).toBeNull();
    expect(sniffImage(bytes())).toBeNull();
  });
});

describe('safeStem', () => {
  it('strips directories, extensions and hostile characters', () => {
    expect(safeStem('/tmp/My Photo (1).png')).toBe('My-Photo-1');
    expect(safeStem('../../etc/passwd')).toBe('passwd');
    expect(safeStem('screen\nshot.png')).toBe('screen-shot');
  });

  it('never returns an empty stem', () => {
    expect(safeStem('')).toBe('image');
    expect(safeStem('...')).toBe('image');
  });

  it('caps the length', () => {
    expect(safeStem('a'.repeat(200)).length).toBe(40);
  });
});

describe('needsRescueCopy', () => {
  it('flags only newline-bearing paths', () => {
    expect(needsRescueCopy('/tmp/plain.png')).toBe(false);
    expect(needsRescueCopy('/tmp/with space.png')).toBe(false);
    expect(needsRescueCopy('/tmp/two\nlines.png')).toBe(true);
    expect(needsRescueCopy('/tmp/carriage\rreturn.png')).toBe(true);
  });
});

describe('image-drop strategy table', () => {
  it('resolves a strategy for every launchable agent', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const drop = imageDropFor(id);
      expect(drop.strategy).toBeTruthy();
      expect(['paste-path', 'clipboard-attach', 'path-text']).toContain(
        drop.strategy
      );
    }
  });

  it('falls back to path text for shells and unknown ids', () => {
    expect(imageDropFor('shell').strategy).toBe('path-text');
    expect(imageDropFor('not-an-agent').strategy).toBe('path-text');
  });

  it('serves the table with a fallback for the renderer', () => {
    const table = imageDropTable();
    expect(table.fallback.strategy).toBe('path-text');
    expect(table.agents['claude']?.strategy).toBe('paste-path');
    // antigravity must TYPE its path: a bracketed paste opens a completion
    // popup that swallows the next keystroke.
    expect(table.agents['antigravity']?.insert).toBe('type');
  });
});
