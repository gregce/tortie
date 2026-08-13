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
  },
  {
    id: 'schema.refuse-a-file-that-is-too-new',
    source: 'src/main/db/schema-version.ts',
    why:
      'an older build must refuse a newer manifest rather than write NULLs ' +
      'into a column the restore path reads',
    fragments: [
      'This copy of Tortie is older than your ',
      'are safe and they are still running. This copy understands format ',
      ' or newer. Open the newer Tortie '
    ]
  },
  {
    id: 'schema.refuse-another-application-database',
    source: 'src/main/db/schema-version.ts',
    why: 'a wrong file is refused rather than migrated, which cannot be undone',
    fragments: [' is not a Tortie ', 'It carries ', 'application id ']
  },
  {
    id: 'schema.the-screen-that-says-the-refusal',
    source: 'src/main/manifest/refusal.ts',
    why:
      'a refusal the user is never shown is a refusal that reads to them as ' +
      'their sessions being gone',
    fragments: [
      'This copy of Tortie is older than your session list.',
      'Your sessions are safe and they are still running.',
      'Open the newer Tortie to see your sessions again.',
      'Reveal Data Folder'
    ]
  },
  {
    id: 'schema.version-matches-the-migration-count',
    source: 'src/main/manifest/store.ts',
    why:
      'a manifest that lies about which schema it is at is a manifest the ' +
      'refusal cannot protect',
    fragments: [
      'MANIFEST_SCHEMA_VERSION is ',
      ' migrations. They are the same number. '
    ]
  }
];

/**
 * Phase 22's skills refusals, counted SEPARATELY from the 21 above.
 *
 * They belong in this artifact for the same reason: a refusal that the bundler
 * removed is a refusal the product only claims to have. They are not folded into
 * `REFUSALS` because that number is quoted in the phase records as the count of
 * DURABILITY refusals, being the ones whose loss costs a user their sessions or
 * their manifest. These cost something different. A skills refusal that vanishes
 * lets a write discard the user's update pins, run a command whose arguments the
 * CLI silently drops, or spawn a command line that is not the one a person read
 * and agreed to. That is worth its own line in the log rather than a bigger
 * number on the old one.
 */
const SKILLS_REFUSALS = [
  {
    id: 'skills.lock-unreadable',
    source: 'src/main/skills/lock.ts',
    why:
      'a lock file the CLI cannot parse is one it OVERWRITES, and the write ' +
      'has to stop before that rather than report success afterwards',
    fragments: ['could not be read as a skills lock file']
  },
  {
    id: 'skills.lock-would-lose-pins',
    source: 'src/main/skills/lock.ts',
    why:
      'a CLI that writes an older lock version discards the entries it does ' +
      'not understand, and those entries are the pins update depends on',
    fragments: ['drop the update pins for ']
  },
  {
    id: 'skills.single-agent-becomes-a-copy',
    source: 'src/main/skills/commands.ts',
    why:
      'an add with exactly one target switches the CLI from a symlink to a ' +
      'full copy and the re-add afterwards is a silent no-op that reports ' +
      'success, so there is no such thing as enabling a skill for one agent',
    fragments: ['full copy instead of a symlink']
  },
  {
    id: 'skills.equals-form-is-discarded',
    source: 'src/main/skills/commands.ts',
    why:
      'the parser matches exact flag tokens, so --skill=foo matches nothing, ' +
      'is dropped, and the command runs with a wider meaning and exits 0',
    fragments: ['which the CLI discards silently']
  },
  {
    id: 'skills.plan-changed-after-the-confirm',
    source: 'src/main/skills/run.ts',
    why:
      'the confirm is only worth anything if the command that runs is the ' +
      'command that was read, and a confirm sits on screen while a person ' +
      'reads it',
    fragments: ['the command changed after it was shown']
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

  for (const refusal of [...REFUSALS, ...SKILLS_REFUSALS]) {
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
  console.log(
    `[refusals] ${String(SKILLS_REFUSALS.length)} skills-write refusals are in out/main/index.js.`
  );
}

main();
