/**
 * Every bound the fact base honours, in one place (Phase 257).
 *
 * The two the STORE also refuses past, `maxSubject` and `maxEvidence`, are
 * `ARCH_FACT_LIMITS` in `@shared/arch` and are spread from there so one number
 * exists. The rest bound what the reader and the worker will look at, and
 * each is the prototype's own value carried over rather than a new judgement:
 * research 118 measured 79% precision with these in force.
 *
 * The four the WORKER enforces, being the callee cut, the argument cut, the
 * arguments read per site and the call ceiling past which a file is marked
 * `callsTruncated`, are imported from `src/main/symbols/calls.ts` rather than
 * restated, so one number exists and `conformance:facts` rule 15 drives the
 * worker at the same value this table prints. The binary window and the parse
 * cap are imported from `src/main/symbols/languages.ts` for the same reason.
 */

import { ARCH_FACT_LIMITS } from '@shared/arch';
import { MAX_ARG, MAX_ARGS, MAX_CALLEE, MAX_CALLS_PER_FILE } from '../../symbols/calls';
import { BINARY_SNIFF_BYTES, MAX_INDEXED_FILE_BYTES } from '../../symbols/languages';

export const FACT_LIMITS = {
  ...ARCH_FACT_LIMITS,
  /** Callee text is collapsed and cut here by the worker. */
  maxCallee: MAX_CALLEE,
  /** One string argument, quotes off, is cut here by the worker. */
  maxArg: MAX_ARG,
  /** Arguments read per call site by the worker. */
  maxArgs: MAX_ARGS,
  /** A line longer than this is not read by any line rule. */
  maxLine: 600,
  /** A manifest over this size yields no manifest facts. */
  maxManifestBytes: 2 * 1024 * 1024,
  /** The worker stops capturing call sites at this many and flags the file. */
  maxCallsPerFile: MAX_CALLS_PER_FILE,
  /**
   * The three readers of a file's bytes agree on what is not read, and these
   * are the numbers they agree on (the Phase 257 fix round; the driver under
   * `build/p257/` reads them from here rather than restating them). A file at
   * or past `maxReadBytes` is never buffered and yields no fact; a NUL inside
   * the first `binarySniffBytes` marks a binary, which yields no fact either;
   * a source file over `maxParseBytes` keeps its line and path facts and is
   * linked `truncated`, because its call list is the thing that is missing.
   */
  maxReadBytes: 4_000_000,
  binarySniffBytes: BINARY_SNIFF_BYTES,
  maxParseBytes: MAX_INDEXED_FILE_BYTES
} as const;
