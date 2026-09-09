/**
 * Print the SHIPPING `image-put` text, so a harness cannot drive a copy that
 * has drifted.
 *
 * `build/probe-p242-2-image.mjs`'s reading A hands the far side these exact
 * bytes. It is a file rather than a `tsx -e` line because `-e` runs the module
 * without waiting for its top level import and prints nothing at all, at exit
 * code 0 — which is how the measure step's own reading A came back empty.
 */
import { REMOTE_SCRIPTS } from '../../src/main/machines/remote-scripts';

process.stdout.write(
  REMOTE_SCRIPTS.find((row) => row.id === 'image-put')?.text ?? ''
);
