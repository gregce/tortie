#!/usr/bin/env node
/**
 * assert-document-types.mjs — link 2 of the Phase 61 drift chain.
 *
 * Finder decides what Tortie can open by reading the packaged Info.plist.
 * The list itself is owned by src/shared/openable.ts, and link 1
 * (src/shared/__tests__/openable-drift.test.ts) holds the declaration in
 * electron-builder.yml equal to that module. This script is the other link.
 * It holds the plist inside the packaged app equal to the yml, so the chain
 * reads openable.ts equals yml equals Info.plist, and each link is cheap.
 *
 * What it asserts, exactly:
 *
 *  - the plist's CFBundleDocumentTypes equals the yml's declaration, not
 *    one type more, not one fewer, in the same order, key for key;
 *  - every entry carries CFBundleTypeRole Viewer;
 *  - every entry carries LSHandlerRank Alternate, so no Owner and no
 *    Default rank exists anywhere. Tortie never seizes anyone's default app.
 *
 * Run it after `npm run package:dir` as `npm run assert:doctypes`. Pass a
 * different plist path as the one argument to check another build. It never
 * touches LaunchServices registration, so it is safe on a machine where the
 * installed /Applications/Tortie.app owns the bundle id.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plistPath =
  process.argv[2] ??
  join(repoRoot, 'release', 'mac-arm64', 'Tortie.app', 'Contents', 'Info.plist');

/** One object as canonical JSON, keys sorted, so comparison is byte-stable. */
function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function fail(message) {
  console.error(`[doctypes] ${message}`);
  process.exit(1);
}

if (!existsSync(plistPath)) {
  fail(
    `${plistPath} is not there. Run npm run package:dir first, or pass the ` +
      `Info.plist path as the one argument.`
  );
}

const plist = JSON.parse(
  execFileSync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  })
);

const config = load(readFileSync(join(repoRoot, 'electron-builder.yml'), 'utf8'));
const declared = config?.mac?.extendInfo?.CFBundleDocumentTypes;
if (!Array.isArray(declared) || declared.length === 0) {
  fail(
    'electron-builder.yml has no mac.extendInfo.CFBundleDocumentTypes array, ' +
      'so there is nothing to hold the plist equal to.'
  );
}

const shipped = plist.CFBundleDocumentTypes;
if (!Array.isArray(shipped)) {
  fail(
    `${plistPath} carries no CFBundleDocumentTypes array. The extendInfo ` +
      `block in electron-builder.yml did not reach the packaged app.`
  );
}

if (shipped.length !== declared.length) {
  fail(
    `the plist declares ${shipped.length} document types and ` +
      `electron-builder.yml declares ${declared.length}. The two must be ` +
      `equal, not one type more, not one fewer.`
  );
}

for (let index = 0; index < declared.length; index += 1) {
  const want = declared[index];
  const got = shipped[index];
  if (canonical(want) !== canonical(got)) {
    fail(
      `entry ${index} differs. electron-builder.yml declares ` +
        `${canonical(want)} and the plist carries ${canonical(got)}.`
    );
  }
}

for (const entry of shipped) {
  const name = entry.CFBundleTypeName ?? '(unnamed)';
  if (entry.CFBundleTypeRole !== 'Viewer') {
    fail(
      `entry ${JSON.stringify(name)} carries role ` +
        `${JSON.stringify(entry.CFBundleTypeRole)}. Every role must be Viewer.`
    );
  }
  if (entry.LSHandlerRank !== 'Alternate') {
    fail(
      `entry ${JSON.stringify(name)} carries rank ` +
        `${JSON.stringify(entry.LSHandlerRank)}. Every rank must be ` +
        `Alternate, and Owner and Default may appear nowhere.`
    );
  }
}

console.log(
  `[doctypes] ${plistPath} declares ${shipped.length} document types, equal ` +
    `to electron-builder.yml. Every role is Viewer and every rank is Alternate.`
);
