/**
 * How many files one arch pass will parse before it says so and stops.
 *
 * It is the one number `src/main/arch/scan.ts` (the import scan) and
 * `src/main/arch/tree-facts.ts` (the fact pass, Phase 257) share, and it
 * lives in a module of its own because the two readers cannot share the
 * scan module: `scan.ts` names the worker pool, and `tree-facts.ts` is
 * loaded by `conformance:reading` from a bare copy of this directory that
 * carries no pool, so a value import of `scan.ts` from it would end the gate
 * with a module it cannot find rather than with a pin. `scan.ts` re-exports it
 * under the name its readers already use.
 */
export const ARCH_SCAN_FILE_CEILING = 50_000;
