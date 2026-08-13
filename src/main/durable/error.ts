/**
 * The failure type the durable writer throws.
 *
 * It is not a `GmuxError`. A `GmuxError` carries a sentence for the renderer
 * inside a JSON message, and this module is a main process primitive whose
 * callers need the step and the errno rather than a sentence. The caller that
 * has a user in front of it turns one of these into whatever the user sees.
 */

/** Which step of the sequence failed. Named for the reader, not for a switch. */
export type DurableStep =
  | 'mkdir'
  | 'open'
  | 'write'
  | 'size'
  | 'sync'
  | 'verify'
  | 'close'
  | 'rename'
  | 'flush-directory';

export class DurableWriteError extends Error {
  readonly step: DurableStep;
  readonly path: string;
  /** The errno token when the operating system gave one, e.g. "ENOSPC". */
  readonly errno?: string;

  constructor(
    step: DurableStep,
    path: string,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'DurableWriteError';
    this.step = step;
    this.path = path;
    this.errno = errnoOf(options?.cause);
  }
}

/** The errno token of an error or of anything it wraps, when there is one. */
export function errnoOf(err: unknown): string | undefined {
  let cursor = err;
  for (let depth = 0; depth < 8 && cursor; depth += 1) {
    const code = (cursor as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * True when the volume ran out of space, or when the write was short in the
 * way a full volume makes it short.
 *
 * Both halves are needed. On the measured full volume the write threw ENOSPC,
 * but a short write that throws nothing publishes an incomplete file just as
 * surely, and the size check is the only thing that sees it.
 */
export function isOutOfSpace(err: unknown): boolean {
  if (errnoOf(err) === 'ENOSPC') return true;
  return err instanceof DurableWriteError && err.step === 'size';
}
