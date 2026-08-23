/**
 * What a drop on a session that runs on another machine may attach
 * (Phase 73, M6, item 3).
 *
 * ## The defect this closes
 *
 * A drop on a remote session used to insert THIS Mac's path into the prompt.
 * The path names nothing on the far side, so the agent there could not read the
 * file. It looked like it worked, which is the worst shape a defect can have.
 *
 * ## The rule, in one sentence
 *
 * A path only means something on the machine it is a path on. So a drop on a
 * remote session attaches IMAGES, whose bytes Tortie carries to that machine,
 * and refuses everything else, whose bytes it will not carry.
 *
 * ## Why images and nothing else
 *
 * An image is a bounded thing a person means to show an agent. A source file is
 * a thing the agent can already open, because the session's own folder lives on
 * that machine and the agent is running in it. A folder is a tree, and
 * uploading a tree is a synchronise rather than an attach, which is a different
 * product with a different set of promises about what it overwrites.
 *
 * So the refusal is not a limitation Tortie is apologising for. It is the right
 * answer, and the sentence says which files stayed here and why.
 *
 * ## Where the sentences live
 *
 * Every sentence a person reads on this path is in this file, next to the
 * decision that produces it, which is the shape `src/renderer/machines/presentation.ts`
 * already has for the machine surfaces.
 *
 * {@link REMOTE_DROP_IMAGES_ONLY} is deliberately the same text as the constant
 * of that name in `src/main/machines/remote-copy.ts`. Main refuses the upload
 * and this file refuses the drop, neither may import the other, and the
 * conformance gate compares the two so they cannot drift apart.
 */

import { REMOTE_IMAGE_MAX_BYTES } from '@shared/ipc';
import type { DropPreparedItem } from '@shared/types';

export { REMOTE_IMAGE_MAX_BYTES };

/**
 * Said once when a drop on a remote session held something other than an image.
 *
 * BYTE IDENTICAL to `REMOTE_DROP_IMAGES_ONLY` in
 * `src/main/machines/remote-copy.ts`. The duplication is deliberate and it is
 * the one this phase accepts: main refuses the upload, this file refuses the
 * drop before there is an upload, and a renderer module may not import a main
 * module. `build/conformance-machines.mjs` condition 39 compares the two.
 */
export const REMOTE_DROP_IMAGES_ONLY =
  'That session runs on another machine, so Tortie can only attach images to ' +
  'it. The other files stayed on this Mac, because their paths mean nothing ' +
  'on that machine.';

/**
 * Said once when an image was too big to carry.
 *
 * The number is a limit of the carriage rather than a choice. The bytes travel
 * inside one command, and that command reaches the machine as one argument of
 * its own login shell, which Linux caps at 131,072 bytes.
 *
 * The single file sentence is byte identical to what main composes with
 * `imageTooLargeRefusal`, so a person reading a refusal from either side reads
 * the same words. The unit is kilobytes because the cap is 90,000 bytes, and
 * "0.09 MB" is a number nobody says out loud.
 */
export function remoteDropTooLarge(count: number): string {
  const limit = String(REMOTE_IMAGE_MAX_BYTES / 1_000);
  if (count === 1) {
    return (
      `That image is larger than ${limit} KB, so Tortie did not copy it to ` +
      `the machine. Nothing was sent.`
    );
  }
  return (
    `${String(count)} images are larger than ${limit} KB, so Tortie did not ` +
    `copy them to the machine. Nothing was sent.`
  );
}

/** Said once after images landed on the machine. */
export function remoteImagesCopied(count: number, machineLabel: string): string {
  if (count === 1) return `Copied one image to ${machineLabel}.`;
  return `Copied ${String(count)} images to ${machineLabel}.`;
}

/** Said when every image in a drop failed to land. */
export const REMOTE_DROP_NOTHING_LANDED =
  'None of those images reached the machine, so Tortie did not put anything ' +
  'into the prompt. You can try again.';

/** What a drop on a remote session splits into. */
export interface RemoteAttachPlan {
  /** Items whose bytes must go to the machine first. */
  readonly images: DropPreparedItem[];
  /** Items that cannot be attached to a session on another machine. */
  readonly refused: DropPreparedItem[];
  /** Images refused here because they are over the size limit. */
  readonly tooLarge: DropPreparedItem[];
  /** The sentences to say once, in order. Empty when there is nothing to say. */
  readonly notes: string[];
}

/**
 * Split one drop into what can cross to the machine and what cannot. PURE.
 *
 * The three groups are decided by facts main already put on the item: `kind`
 * says whether it is a file, `isImage` is main's own magic byte sniff rather
 * than the file's name, and `bytes` is main's own `stat`. Nothing here reads a
 * file and nothing here guesses from an extension.
 *
 * A caller sends only {@link RemoteAttachPlan.images} to the machine. The other
 * two groups stay on this Mac, and {@link RemoteAttachPlan.notes} is what the
 * person is told about them.
 */
export function planRemoteAttach(
  items: readonly DropPreparedItem[]
): RemoteAttachPlan {
  const images: DropPreparedItem[] = [];
  const refused: DropPreparedItem[] = [];
  const tooLarge: DropPreparedItem[] = [];
  for (const item of items) {
    if (item.kind !== 'file' || !item.isImage) {
      refused.push(item);
      continue;
    }
    if (item.bytes > REMOTE_IMAGE_MAX_BYTES) {
      tooLarge.push(item);
      continue;
    }
    images.push(item);
  }
  const notes: string[] = [];
  if (refused.length > 0) notes.push(REMOTE_DROP_IMAGES_ONLY);
  if (tooLarge.length > 0) notes.push(remoteDropTooLarge(tooLarge.length));
  return { images, refused, tooLarge, notes };
}
