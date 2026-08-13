/**
 * The durable write sequence. One module, one owner.
 *
 * Snapshots use it now and the backup ring uses it in Phase 20. Two copies of
 * the most safety critical code in the product is the failure this file
 * exists to avoid, so nothing else in the tree may write a file it cannot
 * afford to lose by hand.
 *
 * The sequence is research 34 §4, step for step. Two of its steps are not in
 * the textbook version and a reviewer will not think to check them.
 *
 *  1. **Verify the bytes between writing and renaming.** A successful flush
 *     does not mean a complete file. On a volume filled to ENOSPC the write
 *     failed, the flush returned OK, the rename returned OK, the directory
 *     flush returned OK, and what was published under the final name was zero
 *     bytes long. That was measured, not reasoned. The size check and the
 *     hash check are the only steps that see it.
 *  2. **Flush the containing directory after the rename, once per batch.**
 *     Without it the rename can be lost on power failure. The plain C version
 *     of this call is a no-op on APFS and returns success in two microseconds
 *     having flushed nothing, so anyone porting the Linux recipe ships a
 *     placebo. Going through Node makes it real, because libuv escalates the
 *     call. Batching it is worth 370 ms down to 180 ms on the real 43 file
 *     workload, because one directory flush makes every rename before it
 *     durable.
 *
 * No dependency was added. Five candidate packages were read from their
 * published tarballs and all five stop at flushing the file and renaming it.
 * The best of them meets two of the seven requirements. The gap has an open
 * issue on the most popular of them dating from 2020.
 *
 * The completion record is step 9 and it is NOT here. It is a manifest row,
 * written by the caller, and it must never become durable before the batch
 * flush of step 8 has returned. `DurableReceipt` carries exactly the three
 * facts that row needs.
 */

import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import type { DurableStep } from './error';
import { DurableWriteError } from './error';
import type { DurableFileHandle, DurableFs } from './fs';
import { nodeDurableFs } from './fs';

/** One file to publish. */
export interface DurableWriteItem {
  /** Absolute path of the final name. */
  path: string;
  /** Payload. A string is encoded UTF-8. */
  data: string | Buffer;
}

/**
 * What was published, and the three facts a completion record needs.
 *
 * A receipt is only returned after the directory flush for its directory has
 * returned. Holding one is the caller's licence to record the file as good.
 */
export interface DurableReceipt {
  path: string;
  bytes: number;
  sha256: string;
}

/** One file that was not published, with the step that stopped it. */
export interface DurableFailure {
  path: string;
  error: DurableWriteError;
}

export interface DurableWriteOptions {
  /** Injected for tests. Production leaves it out. */
  fs?: DurableFs;
  /**
   * 'hash' reads the file back after the flush and compares the sha256. It is
   * the default because it costs 1.28 ms across the whole 43 file workload
   * and it is what catches a file that was flushed but is not the file you
   * meant. 'size' stops at the size check, for a payload too large to hold
   * twice.
   */
  verify?: 'hash' | 'size';
  /** Mode for the created file. Snapshots are the owner's business only. */
  mode?: number;
  /** How many files of a batch are in flight at once. See DEFAULT_CONCURRENCY. */
  concurrency?: number;
}

/** Files published by one batch, and the ones that failed, per file. */
export interface DurableBatchResult {
  written: DurableReceipt[];
  failed: DurableFailure[];
}

/** Suffix of a staged file that has not been published yet. */
export const PART_SUFFIX = '.part';

const DEFAULT_MODE = 0o600;
/**
 * 32 files in flight. Measured inside Electron 43 on the operator's real
 * shape, being 43 files of 25 KB, as a median of 5 runs: 183 ms at 4, 163 ms
 * at 8, 128 ms at 16, 104 ms at 32, 99 ms at 64 and 110 ms with no bound at
 * all. The curve is flat past 32, so 32 buys the last 5 ms nobody would
 * notice in exchange for never holding more than 32 descriptors open, which
 * is what keeps a later caller with a directory tree out of EMFILE.
 */
const DEFAULT_CONCURRENCY = 32;

/** Run `fn` over `items` with at most `limit` in flight, keeping input order. */
async function inBatches<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await settle(fn(items[index] as T));
    }
  };
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

async function settle<R>(promise: Promise<R>): Promise<PromiseSettledResult<R>> {
  try {
    return { status: 'fulfilled', value: await promise };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}

/** The hex sha256 of a payload. */
export function sha256Of(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Publish one file durably, flushing its directory before returning.
 *
 * Writing several files at once should call `writeDurableBatch` instead. This
 * function flushes the directory per file, which is the 370 ms shape rather
 * than the 180 ms one.
 */
export async function writeDurable(
  item: DurableWriteItem,
  options: DurableWriteOptions = {}
): Promise<DurableReceipt> {
  const result = await writeDurableBatch([item], options);
  const failure = result.failed[0];
  if (failure) throw failure.error;
  // One item in, so one receipt out. The non-null assertion is the shape of
  // the batch result, not an assumption about the filesystem.
  return result.written[0] as DurableReceipt;
}

/**
 * Publish many files, with ONE directory flush per directory after every
 * rename into it has returned.
 *
 * Per file failure is reported rather than thrown, because the caller is a
 * quit path capturing every session and one session's full disk must not lose
 * the other forty two. A directory whose flush fails moves every one of its
 * files into `failed`: the bytes are probably on disk, but nothing may record
 * them as durable, and recording them is what a receipt authorises.
 */
export async function writeDurableBatch(
  items: readonly DurableWriteItem[],
  options: DurableWriteOptions = {}
): Promise<DurableBatchResult> {
  const fs = options.fs ?? nodeDurableFs();
  const written: DurableReceipt[] = [];
  const failed: DurableFailure[] = [];

  const byDir = new Map<string, DurableWriteItem[]>();
  for (const item of items) {
    const dir = dirname(item.path);
    const bucket = byDir.get(dir);
    if (bucket) bucket.push(item);
    else byDir.set(dir, [item]);
  }

  for (const [dir, bucket] of byDir) {
    const staged: DurableReceipt[] = [];
    try {
      await ensureDir(dir, fs);
    } catch (err) {
      const error = asDurableError(err, 'mkdir', dir);
      for (const item of bucket) failed.push({ path: item.path, error });
      continue;
    }

    // Steps 1 to 7 for every file in this directory, then step 8 once.
    const outcomes = await inBatches(bucket, options.concurrency ?? DEFAULT_CONCURRENCY, (item) =>
      publishOne(item, fs, options)
    );
    for (let i = 0; i < outcomes.length; i += 1) {
      const outcome = outcomes[i] as PromiseSettledResult<DurableReceipt>;
      const item = bucket[i] as DurableWriteItem;
      if (outcome.status === 'fulfilled') staged.push(outcome.value);
      else failed.push({ path: item.path, error: asDurableError(outcome.reason, 'write', item.path) });
    }

    if (staged.length === 0) continue;
    try {
      await flushDirectory(dir, fs);
      written.push(...staged);
    } catch (err) {
      const error = asDurableError(err, 'flush-directory', dir);
      for (const receipt of staged) failed.push({ path: receipt.path, error });
    }
  }

  return { written, failed };
}

/**
 * Step 8. Flush a directory so the renames into it survive a power cut.
 *
 * Opened with 'r'. Opening a directory with 'w' throws EISDIR.
 */
export async function flushDirectory(dir: string, fs: DurableFs = nodeDurableFs()): Promise<void> {
  let handle: DurableFileHandle;
  try {
    handle = await fs.open(dir, 'r');
  } catch (err) {
    throw new DurableWriteError('flush-directory', dir, `could not open ${dir} to flush it`, {
      cause: err
    });
  }
  try {
    await handle.sync();
  } catch (err) {
    throw new DurableWriteError('flush-directory', dir, `could not flush ${dir}`, { cause: err });
  } finally {
    await handle.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Steps 1 to 7, for one file.
// ---------------------------------------------------------------------------

async function publishOne(
  item: DurableWriteItem,
  fs: DurableFs,
  options: DurableWriteOptions
): Promise<DurableReceipt> {
  const body = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data, 'utf8');
  const sha256 = sha256Of(body);
  const dir = dirname(item.path);
  // Step 2. The staged file lives beside the final name, because rename(2) is
  // atomic only within one filesystem. The name carries the time and four
  // random bytes: a fixed temp name lets two capture paths racing on one
  // session write the same file, and both the quit path and the %exit path
  // exist today.
  const tmp = join(
    dir,
    `.${basename(item.path)}.${Date.now().toString(36)}-${randomBytes(4).toString('hex')}${PART_SUFFIX}`
  );

  // Step 3. 'wx' fails rather than clobbering a staged file left by a crash.
  let handle: DurableFileHandle;
  try {
    handle = await fs.open(tmp, 'wx', options.mode ?? DEFAULT_MODE);
  } catch (err) {
    throw new DurableWriteError('open', tmp, `could not create ${tmp}`, { cause: err });
  }

  let closed = false;
  try {
    // Step 4. Loop, because a write may be short without failing.
    let offset = 0;
    while (offset < body.length) {
      let bytesWritten: number;
      try {
        ({ bytesWritten } = await handle.write(body, offset, body.length - offset, offset));
      } catch (err) {
        throw new DurableWriteError('write', item.path, `could not write ${item.path}`, {
          cause: err
        });
      }
      if (bytesWritten <= 0) {
        throw new DurableWriteError(
          'write',
          item.path,
          `wrote 0 of ${body.length - offset} remaining bytes to ${item.path}`
        );
      }
      offset += bytesWritten;
    }

    // Step 5. Not optional. This is the step that catches the full volume.
    let st: { size: number };
    try {
      st = await handle.stat();
    } catch (err) {
      throw new DurableWriteError('size', item.path, `could not size ${item.path}`, { cause: err });
    }
    if (st.size !== body.length) {
      throw new DurableWriteError(
        'size',
        item.path,
        `${item.path} is ${st.size} bytes on disk and should be ${body.length}`
      );
    }

    // Step 6. F_FULLFSYNC on macOS, through libuv.
    try {
      await handle.sync();
    } catch (err) {
      throw new DurableWriteError('sync', item.path, `could not flush ${item.path}`, {
        cause: err
      });
    }

    // Step 7a. Close before reading back and before the rename.
    try {
      await handle.close();
      closed = true;
    } catch (err) {
      throw new DurableWriteError('close', item.path, `could not close ${item.path}`, {
        cause: err
      });
    }

    if ((options.verify ?? 'hash') === 'hash') {
      await verifyStaged(tmp, item.path, body.length, sha256, fs);
    }

    // Step 7b. Publish.
    try {
      await fs.rename(tmp, item.path);
    } catch (err) {
      throw new DurableWriteError('rename', item.path, `could not publish ${item.path}`, {
        cause: err
      });
    }
  } catch (err) {
    if (!closed) await handle.close().catch(() => undefined);
    // The staged file is the only trace of a failed attempt. Remove it here,
    // and let the prune pass sweep the ones a crash leaves behind.
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }

  return { path: item.path, bytes: body.length, sha256 };
}

/** Read the staged file back and prove it is the payload, byte for byte. */
async function verifyStaged(
  tmp: string,
  finalPath: string,
  bytes: number,
  sha256: string,
  fs: DurableFs
): Promise<void> {
  let readBack: Buffer;
  try {
    readBack = await fs.readFile(tmp);
  } catch (err) {
    throw new DurableWriteError('verify', finalPath, `could not read back ${finalPath}`, {
      cause: err
    });
  }
  if (readBack.length !== bytes) {
    throw new DurableWriteError(
      'size',
      finalPath,
      `${finalPath} read back as ${readBack.length} bytes and should be ${bytes}`
    );
  }
  const actual = sha256Of(readBack);
  if (actual !== sha256) {
    throw new DurableWriteError(
      'verify',
      finalPath,
      `${finalPath} read back with sha256 ${actual} and should be ${sha256}`
    );
  }
}

/**
 * Create the directory when it is missing, and flush ITS parent when we made
 * it, so the new directory entry survives the same power cut its contents
 * are being protected from.
 */
async function ensureDir(dir: string, fs: DurableFs): Promise<void> {
  let created: string | undefined;
  try {
    created = await fs.mkdir(dir);
  } catch (err) {
    throw new DurableWriteError('mkdir', dir, `could not create ${dir}`, { cause: err });
  }
  if (!created) return;
  const parent = dirname(created);
  if (parent === created) return;
  await flushDirectory(parent, fs).catch(() => undefined);
}

function asDurableError(err: unknown, step: DurableStep, path: string): DurableWriteError {
  if (err instanceof DurableWriteError) return err;
  const message = err instanceof Error ? err.message : String(err);
  // The constructor reads the errno off the cause, so a bare `{ code }` from
  // a fake and a real Node error both arrive with `errno` set.
  return new DurableWriteError(step, path, message, { cause: err });
}
