'use strict';
/**
 * build/diagnostic/after-pack.cjs — the diagnostic Tortie's afterPack hook
 * (Phase 364, build/p364/SPEC.md D12).
 *
 * It replaces better-sqlite3's module INSIDE THE PACKED APP with the checking
 * build named by TORTIE_DIAGNOSTIC_NODE, proves the swap by sha256, and then
 * runs the normal afterPack (build/after-pack.cjs). So the arm64 assertion, the
 * helper rename and the nested signing all run over the swapped file, and in
 * the release lane @electron/osx-sign signs it with the rest of the bundle,
 * because afterPack runs before the app is signed (build/after-pack.cjs, SEAL
 * WARNING). better-sqlite3's loader takes prebuilds/<platform>-<arch>.node
 * first (node_modules/better-sqlite3/lib/binding.js:28), so the packed file
 * this hook replaces IS the module the app maps.
 *
 * It runs only when electron-builder is told to run it
 * (`-c.afterPack=build/diagnostic/after-pack.cjs`, which
 * build/diagnostic/package.mjs passes). electron-builder.yml names
 * build/after-pack.cjs, so a normal package never reaches this file.
 *
 * It writes ONE path, the packed module, and refuses before it writes anything:
 *   - unless TORTIE_DIAGNOSTIC is exactly "1";
 *   - a pack that is not for macOS;
 *   - a TORTIE_DIAGNOSTIC_NODE that is not the absolute path of a file;
 *   - a module whose bytes hold P358ADV or [p358adv-, the TEST variant's plant
 *     (D10): the module this package ships cannot plant damage, because the
 *     code that plants is not in it;
 *   - a packed app with no better-sqlite3 module at the packed path;
 *   - a checkout or a packed app whose module already IS the checking build,
 *     because then node_modules was changed in place, which this phase never
 *     does.
 * After the write it proves the packed file hashes to the module it was given
 * and that the checkout's own prebuild did not move.
 */

const {
  chmodSync,
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} = require('node:fs');
const { createHash } = require('node:crypto');
const { isAbsolute, join } = require('node:path');

/** Where the loader finds better-sqlite3's module inside a packed Tortie.app. */
const PACKED_PREBUILD = [
  'Contents',
  'Resources',
  'app.asar.unpacked',
  'node_modules',
  'better-sqlite3',
  'prebuilds',
  'darwin-arm64.node'
];

/** The same module in the checkout being packaged. This hook never writes it. */
const SOURCE_PREBUILD = ['node_modules', 'better-sqlite3', 'prebuilds', 'darwin-arm64.node'];

/** The test variant's plant (D10). A module holding either string can plant. */
const PLANT_STRINGS = ['P358ADV', '[p358adv-'];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function refusal(why) {
  return new Error(`diagnostic after-pack: ${why}`);
}

/**
 * Replace the packed module with the checking build, and nothing else.
 * Throws a sentence on every refusal before anything is written. `env` is
 * process.env in the hook; build/diagnostic/package.mjs --self-test hands it
 * a scratch tree and an env of its own.
 */
function swapPackedPrebuild(context, env) {
  if (env.TORTIE_DIAGNOSTIC !== '1') {
    throw refusal(
      'TORTIE_DIAGNOSTIC is not 1, so this is not the diagnostic package. ' +
        'build/diagnostic/package.mjs sets it.'
    );
  }
  if (context.electronPlatformName !== 'darwin') {
    throw refusal(
      `the diagnostic Tortie is a Mac build, and this pack is for ${String(context.electronPlatformName)}.`
    );
  }
  const node = String(env.TORTIE_DIAGNOSTIC_NODE ?? '');
  if (!isAbsolute(node)) {
    throw refusal(
      'TORTIE_DIAGNOSTIC_NODE must be the absolute path of the built checking better_sqlite3.node.'
    );
  }
  if (!existsSync(node) || !statSync(node).isFile()) {
    throw refusal(`TORTIE_DIAGNOSTIC_NODE names ${node}, which is not a file.`);
  }
  const bytes = readFileSync(node);
  const planted = PLANT_STRINGS.filter((s) => bytes.includes(s));
  if (planted.length > 0) {
    throw refusal(
      `${node} holds ${planted.join(' and ')}, so it is the test variant, which can plant ` +
        'damage. The package takes the diagnostic variant only.'
    );
  }
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const target = join(app, ...PACKED_PREBUILD);
  if (!existsSync(target)) {
    throw refusal(`the packed app has no better-sqlite3 module at ${target}.`);
  }
  const source = join(context.packager.projectDir, ...SOURCE_PREBUILD);
  if (!existsSync(source)) {
    throw refusal(`the checkout has no ${SOURCE_PREBUILD.join('/')}.`);
  }
  const want = sha256(bytes);
  const sourceBefore = sha256(readFileSync(source));
  const before = sha256(readFileSync(target));
  if (before === want || sourceBefore === want) {
    throw refusal(
      'the module is already the checking build, so node_modules was changed in place. ' +
        'The diagnostic package replaces the packed copy only.'
    );
  }
  const mode = statSync(target).mode & 0o7777;
  // Unlink, then write a new file. electron-builder hard-links what it packs
  // when USE_HARD_LINKS or VITEST is set (builder-util/out/fs.js:125), and a
  // write through that link would change node_modules itself.
  unlinkSync(target);
  writeFileSync(target, bytes, { flag: 'wx' });
  chmodSync(target, mode);
  const after = sha256(readFileSync(target));
  const sourceAfter = sha256(readFileSync(source));
  if (after !== want) {
    throw refusal(`the packed module reads ${after}, not the checking build's ${want}.`);
  }
  if (sourceAfter !== sourceBefore) {
    throw refusal(
      `the checkout's ${SOURCE_PREBUILD.join('/')} moved from ${sourceBefore} to ${sourceAfter}.`
    );
  }
  return { target, before, after, source: sourceBefore, mode };
}

exports.default = async function afterPackDiagnostic(context) {
  const swap = swapPackedPrebuild(context, process.env);
  console.log(
    `  • diagnostic after-pack: better-sqlite3 ${swap.before.slice(0, 12)} -> ` +
      `checking build ${swap.after.slice(0, 12)}, node_modules unchanged (${swap.source.slice(0, 12)})`
  );
  // The normal afterPack runs AFTER the swap, over the swapped file. It is
  // required here rather than at the top so the self-test can load this file
  // without a packed app.
  const normal = require('../after-pack.cjs');
  await normal.default(context);
};

exports.swapPackedPrebuild = swapPackedPrebuild;
exports.PACKED_PREBUILD = PACKED_PREBUILD;
exports.PLANT_STRINGS = PLANT_STRINGS;
