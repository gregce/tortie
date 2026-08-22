/**
 * The one ssh option that lets a machine ask a person a question.
 *
 * MOVED HERE IN PHASE 123, from `./connection-test.ts`, with its value
 * unchanged. `./key-install.ts` read this one constant back out of
 * `./connection-test.ts`, and `./connection-test.ts` imports `./key-install.ts`
 * for eight names, so the two files loaded each other. Phase 123 ended that by
 * giving the constant a file that imports nothing.
 *
 * WHY NOT `./carriage.ts`, which is the other leaf on this path. The exec plane
 * reads the carriage, and nothing the exec plane can reach may carry this value.
 * A command that waits on a prompt nobody can see is a session that never opens
 * and never says why. This file is read by the visible test and by the key
 * install, and by nothing else.
 *
 * `build/conformance-machines.mjs` rule 9 counts the literal `BatchMode=no`
 * across the whole tree and fails at anything other than one site. This file is
 * that site.
 */

/**
 * What the ONE visible test carries, and nothing else in the tree may.
 *
 * The whole point of this test is that a person is watching and can answer.
 */
export const SSH_BATCH_MODE_INTERACTIVE = 'BatchMode=no';
