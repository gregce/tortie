#!/usr/bin/env node
/**
 * Stop the update feed serving a bad release (Phase 24, research 27
 * section 5.7 lever 1).
 *
 * Clients only ever read latest-mac.yml. Deleting that one asset from the
 * release stops every install that has not already happened, while the DMG,
 * the ZIP and the blockmaps stay downloadable for anyone who wants them.
 * This script backs the file up first and prints the exact undo command, so
 * a panicking future operator has one command in each direction.
 *
 * It refuses to run without an explicit release tag. There is no default,
 * no --latest and no environment fallback, because the moment this script
 * matters is exactly the moment a guessed tag would delete the wrong feed.
 *
 * It touches exactly one asset. It never deletes the release, the ZIP, the
 * DMG or a blockmap.
 *
 * Usage: node build/halt-release.mjs <tag>
 * Undo:  gh release upload <tag> release/halt-backup-<tag>-latest-mac.yml -R gregce/tortie
 *
 * Operator tool. It never ships in the bundle.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';

const REPO = 'gregce/tortie';
const ASSET = 'latest-mac.yml';

function refuse(why) {
  console.error(`[halt-release] ${why}`);
  process.exit(2);
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

const args = process.argv.slice(2);
if (args.length !== 1 || !/^v\d/.test(args[0])) {
  console.error('usage: node build/halt-release.mjs <tag>');
  console.error('The tag is required and must start with "v" and a digit, e.g. v0.19.0.');
  console.error('There is no default and no --latest on purpose.');
  process.exit(2);
}
const tag = args[0];

// 1. The release must exist and must still carry the feed file.
let assets;
try {
  const raw = gh(['release', 'view', tag, '-R', REPO, '--json', 'assets']);
  assets = JSON.parse(raw).assets ?? [];
} catch {
  refuse(`release ${tag} was not found on ${REPO}, so there is nothing to halt`);
}
if (!assets.some((a) => a.name === ASSET)) {
  refuse(
    `release ${tag} carries no ${ASSET}, so its feed is already halted or was never published`
  );
}

// 2. Back the file up before anything is deleted. No delete happens unless
//    the backup landed and is not empty.
const backup = `release/halt-backup-${tag}-${ASSET}`;
if (existsSync(backup)) {
  refuse(
    `${backup} already exists and will not be overwritten. Move it aside and run again.`
  );
}
mkdirSync('release', { recursive: true });
try {
  gh(['release', 'download', tag, '-R', REPO, '--pattern', ASSET, '-O', backup]);
} catch {
  refuse(`the backup download failed, so nothing was deleted`);
}
if (!existsSync(backup) || statSync(backup).size === 0) {
  refuse(`the backup at ${backup} is missing or empty, so nothing was deleted`);
}

// 3. The one deletion.
try {
  gh(['release', 'delete-asset', tag, ASSET, '-R', REPO, '--yes']);
} catch {
  refuse(`gh could not delete ${ASSET} from ${tag}. The backup at ${backup} is kept.`);
}

// 4. Say what happened and how to undo it, in plain sentences.
console.log(`[halt-release] ${ASSET} was removed from release ${tag} on ${REPO}.`);
console.log('[halt-release] No app will find an update on that feed until the file is restored.');
console.log('[halt-release] Installs that already happened are not undone.');
console.log('[halt-release] The DMG and the ZIP remain downloadable from the release page.');
console.log(`[halt-release] The backup is at ${backup}.`);
console.log('[halt-release] To undo, run this command.');
console.log(`  gh release upload ${tag} ${backup} -R ${REPO}`);
