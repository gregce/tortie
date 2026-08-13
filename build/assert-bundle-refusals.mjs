#!/usr/bin/env node
/**
 * assert-bundle-refusals.mjs — the durability refusals must survive the
 * bundler (Phase 20 fix round).
 *
 * ## The defect that made this file exist
 *
 * `applyReconstruction` refuses to run unless the caller passes the exact
 * acknowledgement sentence. That refusal is in `src/main/manifest/reconstruct.ts`,
 * a unit test pins it, and the unit test passes. It was not in
 * `out/main/index.js`, which is the file `npm run package` ships. The whole
 * `if` statement was gone, message and all.
 *
 * The cause is ordinary and it will happen again. Rollup tracks the value of a
 * parameter when a function has exactly one call site it can see. There was one
 * call site, it passed the constant, so rollup proved the branch dead and
 * deleted it. Nothing misbehaved, because the one caller was correct. What was
 * false was the claim: the shipped artifact did not contain the check the phase
 * said it contained.
 *
 * Vitest runs the source, so no test in this repo can see this class of defect.
 * This script reads the artifact.
 *
 * ## What it checks, and why it checks both directions
 *
 * Every entry names a refusal, the source file it lives in, and the text
 * fragments its message is built from.
 *
 *  1. Each fragment must be in the SOURCE file. If it is not, someone reworded
 *     a refusal and this table went stale. The run fails and says so, rather
 *     than passing on a check that no longer tests anything, or failing with a
 *     message that sends the reader hunting in the bundle.
 *  2. Each fragment must then be in the BUNDLE. If it is not, the bundler
 *     removed a guard the product claims to have.
 *
 * A fragment is a static piece of the message, so a template literal is listed
 * as the parts around its holes.
 *
 * Run by `npm run build`, so it cannot be skipped by anything that builds,
 * including `npm run package`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(repoRoot, 'out', 'main', 'index.js');

/**
 * The refusals that must reach the shipped artifact.
 *
 * Every one of these has a cost attached if it silently disappears: adopting a
 * session that is not ours, rebuilding over the live manifest, ending the
 * operator's tmux server, keeping a copy that was never verified, or publishing
 * bytes that were never read back.
 */
const REFUSALS = [
  {
    id: 'tmux.kill-server-on-real-socket',
    source: 'src/main/tmux/supervisor.ts',
    why: 'the refusal that stands between any caller and the operator sessions',
    fragments: [
      'Tortie does not end the session server.',
      'it would end every ',
      'Move the harness to its own socket with '
    ]
  },
  {
    id: 'harness.root-unset',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness with no isolated root must not run at all',
    fragments: [' is not set. Refusing to run.']
  },
  {
    id: 'harness.profile-outside-root',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness must never run against the operator profile',
    fragments: ['userData ', ' is outside ', '. Refusing to run.']
  },
  {
    id: 'harness.socket-is-the-real-one',
    source: 'src/main/harness/isolation.ts',
    why: 'a harness must never run against socket gmux',
    fragments: [', the real one. Set GMUX_TMUX_SOCKET and try again.']
  },
  {
    id: 'harness.teardown-checks-socket-first',
    source: 'src/main/harness/isolation.ts',
    why: 'teardown resolves and checks the socket before it kills anything',
    fragments: ['not ending the tmux server: the socket is ']
  },
  {
    id: 'reconstruct.acknowledgement',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'reconstruction runs only on an explicit human decision',
    fragments: [
      'Reconstruction needs an explicit decision. Pass ',
      'RECONSTRUCTION_ACKNOWLEDGEMENT exactly.'
    ]
  },
  {
    id: 'reconstruct.decided-by',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'the report has to record who decided',
    fragments: ['Reconstruction needs the name of who decided.']
  },
  {
    id: 'reconstruct.plan-token',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a plan cannot be synthesised, and cannot be applied twice',
    fragments: ['This plan did not come from surveyReconstruction in this process, or ']
  },
  {
    id: 'reconstruct.never-the-live-directory',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a rebuild never lands on the live manifest',
    fragments: ['Refusing to write the rebuild into the live manifest']
  },
  {
    id: 'reconstruct.never-overwrite',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'a rebuild never overwrites an earlier rebuild',
    fragments: ['A manifest is already at ', 'Refusing to overwrite it.']
  },
  {
    id: 'reconstruct.nothing-included',
    source: 'src/main/manifest/reconstruct.ts',
    why: 'an empty decision set writes no file at all',
    fragments: ['No candidate was included, so there is nothing to reconstruct.']
  },
  {
    id: 'ring.body-too-large',
    source: 'src/main/manifest/recovery.ts',
    why: 'the ring refuses a body it cannot hold',
    fragments: ['and the ring refuses bodies ']
  },
  {
    id: 'ring.prune-keeps-a-verified-generation',
    source: 'src/main/manifest/recovery.ts',
    why: 'pruning can never leave the ring with no verified predecessor',
    fragments: ['the survivor set held no verified generation, so nothing was removed']
  },
  {
    id: 'restore.never-over-an-existing-database',
    source: 'src/main/manifest/recovery.ts',
    why: 'restoring never writes over a database that is already there',
    fragments: [
      ' already exists. Nothing was written. Move the ',
      'existing database aside first, and never delete it.'
    ]
  },
  {
    id: 'restore.no-generation-proved-out',
    source: 'src/main/manifest/recovery.ts',
    why: 'an unverified generation is never restored',
    fragments: ['proved out, so nothing was restored']
  },
  {
    id: 'durable.read-back-size',
    source: 'src/main/durable/write.ts',
    why: 'a durable write is published only after its bytes are read back',
    fragments: [' read back as ', ' and should be ']
  },
  {
    id: 'durable.read-back-hash',
    source: 'src/main/durable/write.ts',
    why: 'a durable write is published only after its hash matches',
    fragments: [' read back with sha256 ']
  }
];

function main() {
  if (!existsSync(bundlePath)) {
    console.error(
      `[refusals] ${bundlePath} is not there. Run the build before this check.`
    );
    process.exit(1);
  }
  const bundle = readFileSync(bundlePath, 'utf8');
  const sources = new Map();
  const staleTable = [];
  const missingFromBundle = [];

  for (const refusal of REFUSALS) {
    const sourcePath = join(repoRoot, refusal.source);
    if (!sources.has(refusal.source)) {
      sources.set(
        refusal.source,
        existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : null
      );
    }
    const source = sources.get(refusal.source);
    if (source === null) {
      staleTable.push(`${refusal.id}: ${refusal.source} does not exist`);
      continue;
    }
    for (const fragment of refusal.fragments) {
      if (!source.includes(fragment)) {
        staleTable.push(`${refusal.id}: ${refusal.source} no longer contains ${JSON.stringify(fragment)}`);
        continue;
      }
      if (!bundle.includes(fragment)) {
        missingFromBundle.push({ refusal, fragment });
      }
    }
  }

  if (staleTable.length > 0) {
    console.error(
      '[refusals] this table is stale. A refusal was reworded or moved and ' +
        'build/assert-bundle-refusals.mjs was not updated with it, so it is no ' +
        'longer checking anything.'
    );
    for (const line of staleTable) console.error(`  ${line}`);
    process.exit(1);
  }

  if (missingFromBundle.length > 0) {
    console.error(
      '[refusals] the bundler removed a refusal that is present in the source.'
    );
    console.error(
      '  This is what happens when a guarded function has one call site the ' +
        'bundler can prove the argument of. Give it a second caller the bundler ' +
        'cannot see through, then run the build again.'
    );
    for (const { refusal, fragment } of missingFromBundle) {
      console.error(`  ${refusal.id}  (${refusal.source})`);
      console.error(`    why it exists: ${refusal.why}`);
      console.error(`    missing text : ${JSON.stringify(fragment)}`);
    }
    process.exit(1);
  }

  console.log(
    `[refusals] ${String(REFUSALS.length)} durability refusals are in out/main/index.js.`
  );
}

main();
