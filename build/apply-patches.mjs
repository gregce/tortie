/**
 * apply-patches.mjs. Applies every `patches/*.patch` to node_modules with the
 * system `patch` binary, before the native rebuild in `postinstall`.
 *
 * Why this and not patch-package: Phase 167 vendors two lines of upstream
 * node-pty into the pinned 1.1.0 source, and the phase's rule was zero new
 * packages. patch-package would have brought 328 lock lines and a runner of
 * its own to do what `patch -p1` has done since 1985. Every macOS and every
 * CI image Tortie builds on ships `/usr/bin/patch`.
 *
 * What it does, per patch file, in order of name, deciding by CONTENT and
 * not by asking patch, because Apple's patch answers a reverse dry run on an
 * unpatched file with "previously applied" and exit 0:
 *   1. Read the target file each hunk names and the lines the hunk adds. If
 *      every added line is already in the file, the patch is in place and the
 *      file is left alone. This is what makes the script safe to run twice,
 *      which `npm install` does whenever a lockfile moves.
 *   2. If some added lines are present and some are not, the file is in a
 *      state nobody wrote, and the script fails naming it.
 *   3. Otherwise a forward dry run (`patch -C`), then the apply, both with no
 *      fuzz (`-F0`, a pinned version matches exactly or it is reviewed) and no
 *      questions (`-f`). If the dry run fails, the dependency under the patch
 *      moved and the patch is reviewed, not skipped: the script prints patch's
 *      own report and exits non zero, so `npm install` fails.
 *
 * It spawns only `patch`, reads only the repository and node_modules, and
 * starts no Electron.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const patchesDir = join(root, 'patches');
const PATCH = '/usr/bin/patch';

if (!existsSync(patchesDir)) process.exit(0);
const files = readdirSync(patchesDir).filter((f) => f.endsWith('.patch')).sort();
if (files.length === 0) process.exit(0);
if (!existsSync(PATCH)) {
  console.error(`[patches] ${PATCH} is missing, and ${files.length} patch file(s) need it`);
  process.exit(1);
}

/** Run patch with the given flags, the patch file on stdin, from the repo root. */
function run(flags, file) {
  return spawnSync(PATCH, ['-p1', '-s', '-f', '-F0', '-d', root, ...flags, '-i', join(patchesDir, file)], { encoding: 'utf8' });
}

/** The files a patch touches, each with the lines the patch adds to it. */
function additions(text) {
  const out = new Map();
  let target = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++ ')) { target = line.slice(4).replace(/^b\//, '').split('\t')[0]; if (!out.has(target)) out.set(target, []); continue; }
    if (target !== null && line.startsWith('+') && !line.startsWith('+++')) out.get(target).push(line.slice(1));
  }
  return out;
}

/** 'applied', 'missing' or 'mixed', by whether the added lines are in the file. */
function state(file) {
  const added = additions(readFileSync(join(patchesDir, file), 'utf8'));
  let present = 0; let absent = 0;
  for (const [target, lines] of added) {
    const path = join(root, target);
    const body = existsSync(path) ? readFileSync(path, 'utf8') : '';
    for (const line of lines) { if (body.includes(line)) present += 1; else absent += 1; }
  }
  if (absent === 0 && present > 0) return 'applied';
  if (present === 0) return 'missing';
  return 'mixed';
}

let failed = 0;
for (const file of files) {
  const s = state(file);
  if (s === 'applied') { console.log(`[patches] ${file}: already applied`); continue; }
  if (s === 'mixed') {
    failed += 1;
    console.error(`[patches] ${file}: some of its lines are in the target and some are not, a state nobody wrote; reinstall the dependency and run again`);
    continue;
  }
  const check = run(['-C'], file);
  if (check.status !== 0) {
    failed += 1;
    console.error(`[patches] ${file}: does not apply, the dependency under it moved; review the patch, do not skip it`);
    console.error((check.stdout + check.stderr).trim());
    continue;
  }
  const applied = run([], file);
  if (applied.status !== 0 || state(file) !== 'applied') {
    failed += 1;
    console.error(`[patches] ${file}: apply failed after a clean dry run`);
    console.error((applied.stdout + applied.stderr).trim());
    continue;
  }
  console.log(`[patches] ${file}: applied`);
}
process.exit(failed === 0 ? 0 : 1);
