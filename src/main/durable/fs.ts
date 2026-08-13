/**
 * The filesystem surface the durable writer uses, and nothing more.
 *
 * It exists for one reason. The failure this module is built to survive is a
 * full volume, and on a full volume `write` fails while `fsync`, `rename` and
 * the directory flush all return success and publish a zero byte file. That
 * was measured (research 34 §3.1). A test must be able to reproduce it, so
 * every call the writer makes is injected here and the production object is
 * a thin wrapper over `node:fs/promises`.
 *
 * The surface is deliberately small. Add a call to it only when the write
 * sequence needs one, because every call added here is a call a fake has to
 * model.
 */

import { open, mkdir, readdir, readFile, rename, stat, unlink } from 'node:fs/promises';

/** The parts of a `FileHandle` the write sequence uses. */
export interface DurableFileHandle {
  write(
    data: Buffer,
    offset: number,
    length: number,
    position: number
  ): Promise<{ bytesWritten: number }>;
  stat(): Promise<{ size: number }>;
  /**
   * On macOS this reaches `fcntl(F_FULLFSYNC)`, because libuv escalates the
   * call. Measured at 3.8 ms inside Electron 43 against 0.039 ms for a plain
   * C `fsync`, which is the proof that the escalation happens. Do not add a
   * native module to call `F_FULLFSYNC` directly, and do not write the POSIX
   * directory flush in C, where it is a no-op on APFS.
   */
  sync(): Promise<void>;
  close(): Promise<void>;
}

/** Every filesystem call the durable writer makes. */
export interface DurableFs {
  open(path: string, flags: string, mode?: number): Promise<DurableFileHandle>;
  rename(from: string, to: string): Promise<void>;
  /** Recursive. Returns the first directory created, or undefined. */
  mkdir(path: string): Promise<string | undefined>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ size: number; mtimeMs: number }>;
  readFile(path: string): Promise<Buffer>;
  unlink(path: string): Promise<void>;
}

/** The production object. Nothing here does anything but forward. */
export function nodeDurableFs(): DurableFs {
  return {
    open: (path, flags, mode) => open(path, flags, mode),
    rename: (from, to) => rename(from, to),
    mkdir: (path) => mkdir(path, { recursive: true }),
    readdir: (path) => readdir(path),
    stat: async (path) => {
      const st = await stat(path);
      return { size: st.size, mtimeMs: st.mtimeMs };
    },
    readFile: (path) => readFile(path),
    unlink: (path) => unlink(path)
  };
}
