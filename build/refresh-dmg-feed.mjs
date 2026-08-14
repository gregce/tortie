/**
 * refresh-dmg-feed.mjs — re-align the updater feed with a DMG that changed
 * after packaging.
 *
 * Stapling a notarization ticket appends bytes to the DMG. After that, the
 * sha512, the size and the blockmap that electron-builder recorded at
 * package time no longer describe the file being published. This script
 * rebuilds the DMG's blockmap with the same buildBlockMap function
 * electron-builder itself uses, then rewrites the DMG entry in
 * release/latest-mac.yml so the feed matches the bytes on disk.
 *
 * The ZIP entries are never touched. The macOS updater consumes only the
 * ZIP (MacUpdater picks the zip and ignores the dmg), so the DMG entry is
 * informational. It should still be honest.
 *
 * Fails hard, exit 1, when the DMG, the feed file or the DMG's feed entry
 * is missing. A silent no-op here would let a stale hash ship.
 *
 * Usage: node build/refresh-dmg-feed.mjs [dmg-path]
 * Default: newest release/Tortie-*-arm64.dmg
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';

const require = createRequire(import.meta.url);
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap.js');
const yaml = require('js-yaml');

const releaseDir = 'release';
const feedPath = join(releaseDir, 'latest-mac.yml');

function newestDmg() {
  if (!existsSync(releaseDir)) return null;
  const candidates = readdirSync(releaseDir)
    .filter((f) => f.startsWith('Tortie-') && f.endsWith('.dmg'))
    .map((f) => join(releaseDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? null;
}

const dmg = process.argv[2] ?? newestDmg();
if (!dmg || !existsSync(dmg)) {
  console.error('refresh-dmg-feed: no DMG found. Expected release/Tortie-*-arm64.dmg or an explicit path.');
  process.exit(1);
}
if (!existsSync(feedPath)) {
  console.error(`refresh-dmg-feed: ${feedPath} does not exist. Run this after packaging, not before.`);
  process.exit(1);
}

const blockMapFile = `${dmg}.blockmap`;
const { sha512, size } = await buildBlockMap(dmg, 'gzip', blockMapFile);

const feed = yaml.load(readFileSync(feedPath, 'utf8'));
const name = basename(dmg);
const entry = (feed.files ?? []).find((f) => f.url === name);
if (!entry) {
  console.error(`refresh-dmg-feed: ${feedPath} has no files entry for ${name}. Refusing to guess.`);
  process.exit(1);
}

console.log(`refresh-dmg-feed: ${name}`);
console.log(`  sha512  ${entry.sha512 === sha512 ? 'unchanged' : `${entry.sha512}\n       -> ${sha512}`}`);
console.log(`  size    ${entry.size === size ? 'unchanged' : `${entry.size} -> ${size}`}`);
console.log(`  blockmap rebuilt at ${blockMapFile}`);

entry.sha512 = sha512;
entry.size = size;
writeFileSync(feedPath, yaml.dump(feed, { lineWidth: 8000 }));
console.log(`refresh-dmg-feed: ${feedPath} updated.`);
