/**
 * Two sentences a person reads when Tortie refuses to make a key, and nothing
 * else.
 *
 * MOVED HERE IN PHASE 123, from `./key-install.ts`, with both strings unchanged
 * byte for byte. `./key-material.ts` read them back out of `./key-install.ts`,
 * and `./key-install.ts` imports `./key-material.ts` for its public key check,
 * so the two files loaded each other. Composing an install command line and
 * naming a refusal are two different jobs, and only the second one is needed by
 * the file that makes the key.
 *
 * This module imports nothing. Two files read it, being `./key-material.ts`
 * and `./ipc.ts`. No file on the exec path reads it.
 */

export const MACHINE_KEY_NO_ID =
  'Name this machine before Tortie makes a key for it. The name is part of ' +
  "what you are agreeing to, and it is what tells one machine's key from " +
  "another's.";

export const MACHINE_KEY_KEYGEN_MISSING =
  'Tortie could not find the program macOS uses to make a key, at ' +
  '/usr/bin/ssh-keygen. That program ships with macOS, so a missing one means ' +
  'something removed it or the disk is damaged. Nothing was sent to the ' +
  'machine.';
