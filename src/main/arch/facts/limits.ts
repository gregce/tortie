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
 * worker at the same value this table prints.
 */

import { ARCH_FACT_LIMITS } from '@shared/arch';
import { MAX_ARG, MAX_ARGS, MAX_CALLEE, MAX_CALLS_PER_FILE } from '../../symbols/calls';

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
  maxCallsPerFile: MAX_CALLS_PER_FILE
} as const;
