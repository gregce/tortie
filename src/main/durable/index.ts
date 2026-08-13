/**
 * The durable write module (Phase 19 item 2).
 *
 * Anything in the main process that writes a file the user cannot afford to
 * lose goes through here. Snapshots are the first caller and the Phase 20
 * backup ring is the second. Do not write a second copy of this sequence.
 *
 * The whole shape of one save:
 *
 *     const gen  = await nextGeneration(dir, stem);
 *     const out  = await writeDurableBatch(items.map(...));   // steps 1 to 8
 *     recordInManifest(out.written);                          // step 9
 *     await pruneGenerations(dir, stem, KEEP);                // step 10
 *
 * and one load:
 *
 *     const hit = await readVerified(recordsNewestFirst);     // steps 11 to 13
 *     if (!hit) reportNoVerifiedSnapshot();
 *
 * Read write.ts before changing any of it. Every step in it is there because
 * a measured failure got past the step before.
 */

export { DurableWriteError, errnoOf, isOutOfSpace, type DurableStep } from './error';
export { nodeDurableFs, type DurableFileHandle, type DurableFs } from './fs';
export {
  flushDirectory,
  sha256Of,
  writeDurable,
  writeDurableBatch,
  PART_SUFFIX,
  type DurableBatchResult,
  type DurableFailure,
  type DurableReceipt,
  type DurableWriteItem,
  type DurableWriteOptions
} from './write';
export {
  generationName,
  generationPath,
  listGenerations,
  nextGeneration,
  parseGeneration,
  pruneGenerations,
  readVerified,
  GENERATION_DIGITS,
  STALE_PART_MS,
  type DurableRecord,
  type Generation,
  type PruneResult,
  type VerifiedRead
} from './generations';
