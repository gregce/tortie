/**
 * assert-apple-events.cjs — prove the packed .app carries the Apple Events
 * dictionary and addon where Info.plist says they are (Phase 363). Runs from
 * afterPack, before sealing, and THROWS. Checks: Contents/Resources/Tortie.sdef
 * is byte-identical to resources/automation/Tortie.sdef; Info.plist has
 * NSAppleScriptEnabled true and OSAScriptingDefinition naming that file;
 * Resources/native/apple-events.node exists, is outside app.asar, is a
 * single-slice arm64 Mach-O, and its signature verifies (it is the signed copy of
 * out/native/apple-events.node, signed by build/sign-nested-binaries.cjs).
 */
const { readFileSync, existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

function assertAppleEvents(context) {
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents');
  const sdef = join(app, 'Resources', 'Tortie.sdef');
  const addon = join(app, 'Resources', 'native', 'apple-events.node');
  const root = join(__dirname, '..');
  if (!existsSync(sdef)) throw new Error('apple events: Contents/Resources/Tortie.sdef missing');
  if (!readFileSync(sdef).equals(readFileSync(join(root, 'resources/automation/Tortie.sdef')))) {
    throw new Error('apple events: packed Tortie.sdef differs from resources/automation/Tortie.sdef');
  }
  if (!existsSync(addon)) throw new Error('apple events: Contents/Resources/native/apple-events.node missing (run build/build-apple-events.mjs)');
  // The packed addon is the signed copy of out/native/apple-events.node, so its
  // bytes differ by the signature; the signature itself is what is checked.
  try {
    execFileSync('/usr/bin/codesign', ['--verify', '--strict', addon], { stdio: 'pipe' });
  } catch (e) {
    throw new Error(`apple events: packed addon signature does not verify: ${String(e.stderr || e.message).slice(0, 200)}`);
  }
  const plist = join(app, 'Info.plist');
  const read = (key) => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', plist], { encoding: 'utf8' }).trim();
  if (read('NSAppleScriptEnabled') !== 'true') throw new Error('apple events: NSAppleScriptEnabled is not true');
  if (read('OSAScriptingDefinition') !== 'Tortie.sdef') throw new Error('apple events: OSAScriptingDefinition is not Tortie.sdef');
  const arch = execFileSync('/usr/bin/lipo', ['-archs', addon], { encoding: 'utf8' }).trim();
  if (arch !== 'arm64') throw new Error(`apple events: addon architectures are "${arch}", want arm64`);
  // The system's own reader (it takes a bundle, not a file) must list exactly the
  // two transport commands from the packed dictionary.
  const bundle = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const xml = execFileSync('/usr/bin/sdef', [bundle], { encoding: 'utf8' });
  const names = [...xml.matchAll(/<command name="([^"]+)" code="TrtE/g)].map((m) => m[1]);
  if (names.join('|') !== 'submit request|request result') {
    throw new Error(`apple events: sdef lists transport commands [${names.join(', ')}], want [submit request, request result]`);
  }
}
module.exports = { assertAppleEvents };
