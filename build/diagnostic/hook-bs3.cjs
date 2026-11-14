'use strict';
/**
 * hook-bs3.cjs. Loads a CHECKING better-sqlite3 into one process by path
 * (Phase 364, build/p364/SPEC.md §4.1 and §4.5; research 143's hook, rebuilt
 * by the spec step after the original went with Phase 357.1's scratch).
 *
 *   NODE_OPTIONS=--require=<this file> P358ADV_BS3=<a build-checker.mjs --out folder> <node or Electron>
 *
 * In that process `require('better-sqlite3')` returns the build at
 * P358ADV_BS3: its own `lib/database.js`, with the native module taken from
 * `build/Release/better_sqlite3.node` by path. It never reads a `prebuilds/`
 * folder, because better-sqlite3's loader prefers a prebuild there
 * (`lib/binding.js:28`), and the unchecked one is exactly what this replaces.
 *
 * It is how probe:p357's CS arms, probe:p364 and the self-test plant damage
 * through the TEST variant inside an app whose own module is untouched
 * (build/p3571/SPEC.md D7). It does nothing when P358ADV_BS3 is unset, writes
 * nothing, and changes nothing outside the process it is loaded into. It
 * refuses a folder inside node_modules: a checking build is only ever made by
 * build/diagnostic/build-checker.mjs, into a folder of its own.
 */
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const dir = (process.env.P358ADV_BS3 || '').trim();
if (dir !== '') {
  if (!path.isAbsolute(dir)) throw new Error(`hook-bs3: P358ADV_BS3 must be an absolute path, not ${dir}`);
  if (path.resolve(dir).split(path.sep).includes('node_modules')) {
    throw new Error(`hook-bs3: P358ADV_BS3 names a folder inside node_modules (${dir}); a checking build lives in a folder of its own`);
  }
  const node = path.join(dir, 'build', 'Release', 'better_sqlite3.node');
  const lib = path.join(dir, 'lib', 'database.js');
  if (!fs.existsSync(node)) throw new Error(`hook-bs3: no checking build at ${node}`);
  if (!fs.existsSync(lib)) throw new Error(`hook-bs3: no better-sqlite3 library at ${lib}`);
  let cached = null;
  const load = () => {
    if (cached !== null) return cached;
    const create = require(lib);
    const Database = create(() => require(node), false);
    Database.SqliteError = require(path.join(dir, 'lib', 'sqlite-error.js'));
    cached = Database;
    return cached;
  };
  const originalLoad = Module._load;
  Module._load = function hookedLoad(request, parent, isMain) {
    if (request === 'better-sqlite3') return load();
    return originalLoad.call(this, request, parent, isMain);
  };
}
