/**
 * Phase 73 — what a drop on a session that runs on another machine may attach.
 *
 * The whole module is pure, so it is tested exhaustively. Every decision here
 * reads a fact main already put on the item: `kind` says whether it is a file,
 * `isImage` is main's own magic byte sniff rather than the file's name, and
 * `bytes` is main's own `stat`. Nothing in the module reads a file and nothing
 * guesses from an extension, and these tests hold that.
 *
 * One test compares this file's refusal sentence against main's copy of it. The
 * duplication is deliberate, and this is one of the two gates that keep the two
 * copies from drifting. The other is
 * `build/conformance-machines.mjs` condition 39.
 */

import { describe, expect, it } from 'vitest';
import type { DropPreparedItem } from '@shared/types';
import { REMOTE_DROP_IMAGES_ONLY as MAIN_COPY } from '../../../../main/machines/remote-copy';
import {
  REMOTE_DROP_IMAGES_ONLY,
  REMOTE_IMAGE_MAX_BYTES,
  planRemoteAttach,
  remoteDropTooLarge,
  remoteImagesCopied
} from '../remote';

function item(over: Partial<DropPreparedItem>): DropPreparedItem {
  return {
    sourcePath: '/a/shot.png',
    refPath: '/a/shot.png',
    kind: 'file',
    copied: false,
    isImage: true,
    bytes: 1024,
    ...over
  };
}

describe('the split', () => {
  it('lets an image through', () => {
    const plan = planRemoteAttach([item({})]);
    expect(plan.images).toHaveLength(1);
    expect(plan.refused).toEqual([]);
    expect(plan.notes).toEqual([]);
  });

  it('refuses a file whose bytes are not an image', () => {
    // Main sniffed it. The name said `.png` and the bytes said otherwise, and
    // the bytes win, here as everywhere else in this product.
    const plan = planRemoteAttach([item({ isImage: false, refPath: '/a/n.png' })]);
    expect(plan.images).toEqual([]);
    expect(plan.refused).toHaveLength(1);
    expect(plan.notes).toEqual([REMOTE_DROP_IMAGES_ONLY]);
  });

  it('refuses a folder, because a folder here is not a folder there', () => {
    const plan = planRemoteAttach([item({ kind: 'dir', isImage: false })]);
    expect(plan.refused).toHaveLength(1);
    expect(plan.notes).toEqual([REMOTE_DROP_IMAGES_ONLY]);
  });

  it('refuses a path that is not there', () => {
    const plan = planRemoteAttach([item({ kind: 'missing', isImage: false })]);
    expect(plan.refused).toHaveLength(1);
  });

  it('refuses an image over the size limit, and says so separately', () => {
    const plan = planRemoteAttach([
      item({ bytes: REMOTE_IMAGE_MAX_BYTES + 1 })
    ]);
    expect(plan.images).toEqual([]);
    expect(plan.tooLarge).toHaveLength(1);
    expect(plan.notes).toEqual([remoteDropTooLarge(1)]);
  });

  it('lets an image of exactly the limit through', () => {
    const plan = planRemoteAttach([item({ bytes: REMOTE_IMAGE_MAX_BYTES })]);
    expect(plan.images).toHaveLength(1);
  });

  it('keeps the order of what was dropped', () => {
    const a = item({ refPath: '/a/1.png' });
    const b = item({ refPath: '/a/2.png' });
    expect(planRemoteAttach([a, b]).images.map((one) => one.refPath)).toEqual([
      '/a/1.png',
      '/a/2.png'
    ]);
  });

  it('says both things once when a drop held both kinds of refusal', () => {
    const plan = planRemoteAttach([
      item({ isImage: false }),
      item({ isImage: false }),
      item({ bytes: REMOTE_IMAGE_MAX_BYTES + 1 }),
      item({})
    ]);
    expect(plan.images).toHaveLength(1);
    expect(plan.refused).toHaveLength(2);
    expect(plan.tooLarge).toHaveLength(1);
    expect(plan.notes).toEqual([REMOTE_DROP_IMAGES_ONLY, remoteDropTooLarge(1)]);
  });

  it('says nothing at all when there was nothing to refuse', () => {
    expect(planRemoteAttach([]).notes).toEqual([]);
    expect(planRemoteAttach([item({})]).notes).toEqual([]);
  });
});

describe('the sentences', () => {
  it('is byte identical to main’s copy of the same refusal', () => {
    // Main refuses the upload, this file refuses the drop before there is an
    // upload, and a renderer module may not import a main module in the
    // product. This test may, and it is why the two cannot drift.
    expect(REMOTE_DROP_IMAGES_ONLY).toBe(MAIN_COPY);
  });

  it('names the limit as the limit, in a unit a person can say', () => {
    expect(remoteDropTooLarge(1)).toContain(
      `${String(REMOTE_IMAGE_MAX_BYTES / 1_000)} KB`
    );
    expect(remoteDropTooLarge(1)).toContain('90 KB');
    expect(remoteDropTooLarge(1)).not.toContain('MB');
  });

  it('counts in words for one and in numbers for more', () => {
    expect(remoteImagesCopied(1, 'pop')).toBe('Copied one image to pop.');
    expect(remoteImagesCopied(3, 'pop')).toBe('Copied 3 images to pop.');
    expect(remoteDropTooLarge(1)).toContain('That image is larger');
    expect(remoteDropTooLarge(2)).toContain('2 images are larger');
  });

  it('uses no dash of any kind, per the writing rules', () => {
    const every = [
      REMOTE_DROP_IMAGES_ONLY,
      remoteDropTooLarge(1),
      remoteDropTooLarge(4),
      remoteImagesCopied(1, 'pop'),
      remoteImagesCopied(9, 'pop')
    ];
    for (const sentence of every) {
      expect(sentence, sentence).not.toContain('—');
      expect(sentence, sentence).not.toContain('–');
    }
  });
});
