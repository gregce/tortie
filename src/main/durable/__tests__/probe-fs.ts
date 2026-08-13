/**
 * A real filesystem with a log and a place to lie.
 *
 * The failure this module is built to survive cannot be produced by asking
 * the operating system nicely. On a volume filled to ENOSPC the write failed
 * and every later call still returned success, so a test needs a filesystem
 * that behaves exactly like a working one until the moment it is told not to.
 * Everything here delegates to the real disk under a scratch directory, and
 * the hooks replace one answer at a time.
 *
 * The verifier repeats the same cases against a real 6 MB sparse image filled
 * to ENOSPC. These tests exist so a builder does not have to mount one to know
 * whether the sequence still holds.
 */

import { basename } from 'node:path';
import type { DurableFileHandle, DurableFs } from '../fs';
import { nodeDurableFs } from '../fs';

export interface ProbeHooks {
  /** Throw, or return the byte count to report, instead of writing. */
  onWrite?(path: string, chunk: Buffer, realBytes: number): number | void;
  /** Report a different size than the one on disk. */
  onStat?(path: string, realSize: number): number;
  /** Throw to fail the flush of a file or of a directory. */
  onSync?(path: string): void;
  /** Hand back different bytes than the ones on disk. */
  onReadFile?(path: string, real: Buffer): Buffer;
  /** Throw to fail the publish. */
  onRename?(from: string, to: string): void;
}

export interface ProbeFs extends DurableFs {
  /** Every call, in order, as "verb name". Paths are basenames. */
  readonly log: string[];
}

function errno(code: string, message: string): NodeJS.ErrnoException {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

/** An ENOSPC the way Node raises one. */
export function enospc(path: string): NodeJS.ErrnoException {
  return errno('ENOSPC', `ENOSPC: no space left on device, write '${path}'`);
}

export function probeFs(hooks: ProbeHooks = {}): ProbeFs {
  const real = nodeDurableFs();
  const log: string[] = [];
  const note = (verb: string, path: string): void => {
    log.push(`${verb} ${basename(path)}`);
  };

  return {
    log,
    async open(path, flags, mode) {
      // The flag is in the log because 'wx' is a requirement, not a detail:
      // 'w' would clobber a staged file left by an earlier crash.
      log.push(`open ${basename(path)} ${flags}`);
      const handle = await real.open(path, flags, mode);
      const wrapped: DurableFileHandle = {
        async write(data, offset, length, position) {
          const forced = hooks.onWrite?.(path, data.subarray(offset, offset + length), length);
          if (typeof forced === 'number') {
            note('write', path);
            if (forced > 0) await handle.write(data, offset, forced, position);
            return { bytesWritten: forced };
          }
          note('write', path);
          return handle.write(data, offset, length, position);
        },
        async stat() {
          const st = await handle.stat();
          const size = hooks.onStat?.(path, st.size);
          note('stat', path);
          return { size: typeof size === 'number' ? size : st.size };
        },
        async sync() {
          hooks.onSync?.(path);
          note('sync', path);
          return handle.sync();
        },
        async close() {
          note('close', path);
          return handle.close();
        }
      };
      return wrapped;
    },
    async rename(from, to) {
      hooks.onRename?.(from, to);
      note('rename', to);
      return real.rename(from, to);
    },
    async mkdir(path) {
      note('mkdir', path);
      return real.mkdir(path);
    },
    async readdir(path) {
      return real.readdir(path);
    },
    async stat(path) {
      return real.stat(path);
    },
    async readFile(path) {
      const bytes = await real.readFile(path);
      note('readFile', path);
      return hooks.onReadFile?.(path, bytes) ?? bytes;
    },
    async unlink(path) {
      note('unlink', path);
      return real.unlink(path);
    }
  };
}
