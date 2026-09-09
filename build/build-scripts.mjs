/**
 * build-scripts.mjs. Which files under build/ a source-reading gate reads
 * (Phase 240's fix round).
 *
 * ## Why this file exists
 *
 * Three gates ask a question of "every script under build/", being
 * build/assert-electron-teardown.mjs, build/assert-background-teardown.mjs and
 * build/assert-known-hosts-scoped.mjs. Two of them read ONE LEVEL with
 * `readdirSync(buildDir)` until Phase 240's fix round, and the third had walked
 * since Phase 193 with its own copy of the walk and a header saying why:
 *
 * > a future `build/probes/foo.mjs` would have been invisible to every rule in
 * > this file ... Costing nothing today is exactly when a boundary is cheap to
 * > close.
 *
 * Phase 240 created that future. It was the first phase to put an Electron
 * starter in a subdirectory, being `build/p240/save-loss.mjs` and
 * `build/p240/save-choice.mjs`, and neither was visible to the gate family that
 * exists because the operator's machine ran out of memory on 2026-08-22.
 * Nothing leaked, because both launch through `build/electron-run.mjs`; what
 * was missing was the guard that could say so.
 *
 * So the walk is here rather than copied a third time, which is CLAUDE.md's
 * growth guardrail applied to the fix rather than to a later cleanup. It is NOT
 * in build/scan-source.mjs, whose header promises that it "spawns nothing,
 * opens no socket and reads no file", and a directory walk is exactly the
 * promise that file keeps.
 *
 * ## What it refuses to walk into
 *
 * `vendor`, which is downloaded rather than written here, and `node_modules`
 * under it. Counted on 2026-09-08 with the `.mjs`, `.cjs` and `.mts` filter:
 * 243 files one level deep, 294 walked, and 309 if vendor were counted — which
 * is the reason it is not, since the population would then move with a
 * download rather than with a commit.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every file under `dir` whose basename `matches`, deepest last, sorted, as
 * `{ path, name }` where `name` is relative to `dir` with `/` separators.
 *
 * The name is what a gate reports and what a gate's exemption sets are keyed
 * by, so a file at the top level is still named exactly as it was before any
 * of this walked.
 */
export function walkScripts(dir, matches) {
  const found = [];
  const walk = (at, prefix) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
      const path = join(at, entry.name);
      const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(path, name);
      else if (matches(entry.name)) found.push({ path, name });
    }
  };
  walk(dir, '');
  return found;
}

/** The scripts the two teardown gates read: `.mjs`, `.cjs` and `.mts`. */
export function buildScriptNames(dir) {
  return walkScripts(dir, (n) => /\.(mjs|cjs|mts)$/.test(n)).map((f) => f.name);
}
