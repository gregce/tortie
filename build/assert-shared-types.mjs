#!/usr/bin/env node
/**
 * assert-shared-types.mjs — Phase 144 stage 3: shared does not see the DOM
 * library, and the two browser shaped globals it does see stay narrow.
 *
 * tsconfig.shared.json used to include the whole DOM library, so window and
 * document looked valid in shared code that runs in main. The stage removed
 * DOM and replaced it with src/shared/browser-globals.d.ts, which declares
 * exactly the two members shared production code uses: the URL constructor
 * for clone-url.ts and the File handle for the preload drop contract.
 *
 * This gate is the compile proof, and it compiles against the REAL config:
 * every fixture program below extends tsconfig.shared.json itself and copies
 * the real browser-globals.d.ts in beside the fixtures, so putting DOM back
 * in the lib set, or widening the ambient file, turns this gate red rather
 * than passing quietly. Only the options a scratch compile needs are
 * overridden, being emit, rootDir and the build info path. The lib set and
 * the types set are inherited from the file this gate protects.
 *
 * Three compiles, about a second each:
 *
 *  1. the positive fixture, every URL operation clone-url.ts performs plus
 *     the File handle shape the drop contract names, MUST compile;
 *  2. the six negative fixtures, one identifier per file, MUST each fail:
 *     window, document, process, Buffer, electron/main, electron/renderer;
 *  3. the control, the window fixture compiled once more with the DOM
 *     library forced back on, MUST compile. This proves the negatives fail
 *     because of the shared lib set and not because the scratch program is
 *     broken, so the gate can tell a real refusal from its own defect.
 *
 * Runs from `npm run typecheck`. Reads the two real files, writes only to a
 * scratch directory it removes in a finally block, spawns only tsc.
 */

import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const SHARED_TSCONFIG = join(ROOT, 'tsconfig.shared.json');
const AMBIENT = join(ROOT, 'src', 'shared', 'browser-globals.d.ts');

class GateFailure extends Error {}

/** Throws rather than exiting, so the finally block always removes scratch. */
function fail(message) {
  throw new GateFailure(message);
}

// The positive fixture. Every URL member clone-url.ts touches, in the same
// shapes, plus the File handle exactly as the drop contract names it.
const POSITIVE = `export function probeCloneUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') return null;
  if (parsed.hostname.length === 0) return null;
  parsed.search = '';
  parsed.hash = '';
  const stripped = parsed.username !== '' || parsed.password !== '';
  parsed.username = '';
  parsed.password = '';
  const segments = parsed.pathname.split('/').filter((s) => s.length > 0);
  parsed.pathname = '/' + segments.join('/');
  return parsed.toString() + parsed.host + (stripped ? '!' : '');
}

export interface ProbeDropExtras {
  pathForFile(file: File): string;
}

export function probeDropHandle(file: File): string {
  return file.name + String(file.size) + file.type;
}
`;

// The negative fixtures, one identifier per file so a failure that goes
// missing is attributable to its identifier by name.
const NEGATIVES = [
  ['neg-window.ts', 'export const probe = window.location.href;'],
  ['neg-document.ts', 'export const probe = document.title;'],
  ['neg-process.ts', 'export const probe = process.pid;'],
  ['neg-buffer.ts', "export const probe = Buffer.from('tortie');"],
  [
    'neg-electron-main.ts',
    "import { app } from 'electron/main';\nexport const probe = app;"
  ],
  [
    'neg-electron-renderer.ts',
    "import { ipcRenderer } from 'electron/renderer';\nexport const probe = ipcRenderer;"
  ]
];

/**
 * Write a tsconfig into `dir` that extends the real shared config and lists
 * `files` plus the copied ambient declarations. `extraOptions` exists for
 * the control run only.
 */
function writeConfig(dir, name, files, extraOptions = {}) {
  const path = join(dir, name);
  writeFileSync(
    path,
    JSON.stringify({
      extends: SHARED_TSCONFIG,
      compilerOptions: {
        composite: false,
        declaration: false,
        declarationMap: false,
        emitDeclarationOnly: false,
        noEmit: true,
        rootDir: dir,
        outDir: join(dir, 'out'),
        tsBuildInfoFile: join(dir, `${name}.tsbuildinfo`),
        ...extraOptions
      },
      include: [],
      exclude: [],
      files: [...files.map((f) => join(dir, f)), join(dir, 'browser-globals.d.ts')]
    })
  );
  return path;
}

function runTsc(configPath) {
  const result = spawnSync(process.execPath, [TSC, '-p', configPath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.error) fail(`could not spawn tsc: ${result.error.message}`);
  return { status: result.status ?? 1, output: `${result.stdout}\n${result.stderr}` };
}

// The scratch directory lives INSIDE the repo, under the gitignored .tsc/,
// so module and @types resolution walk up to the same node_modules the real
// shared project sees. From a system temp directory every package import
// fails to resolve, which would make the electron refusals below vacuous.
mkdirSync(join(ROOT, '.tsc'), { recursive: true });
const dir = mkdtempSync(join(ROOT, '.tsc', 'shared-types-'));
try {
  // Refuse to certify anything if the config under test carries a DOM lib,
  // or the ambient file has grown a File constructor the drop contract
  // forbids.
  if (/"lib"\s*:\s*\[[^\]]*DOM/i.test(readFileSync(SHARED_TSCONFIG, 'utf8'))) {
    fail(
      'tsconfig.shared.json names a DOM lib again. Shared code runs in ' +
        'main, and the only browser shaped globals it may see are the two ' +
        'declared in src/shared/browser-globals.d.ts.'
    );
  }
  if (
    /declare\s+(var|const|let|class|function)\s+File\b/.test(
      readFileSync(AMBIENT, 'utf8')
    )
  ) {
    fail(
      'src/shared/browser-globals.d.ts declares a File value. The drop ' +
        'contract passes the handle through and research 16 §4.2 forbids ' +
        'constructing one, so File stays an interface with no constructor.'
    );
  }

  copyFileSync(AMBIENT, join(dir, 'browser-globals.d.ts'));
  writeFileSync(join(dir, 'positive.ts'), POSITIVE);
  for (const [name, source] of NEGATIVES) writeFileSync(join(dir, name), source);

  // 1. The two real needs compile.
  const positive = runTsc(writeConfig(dir, 'tsconfig.positive.json', ['positive.ts']));
  if (positive.status !== 0) {
    fail(
      'the URL operations or the File handle no longer compile in a shared ' +
        `shaped program. tsc said:\n${positive.output.trim()}`
    );
  }

  // 2. Every masked identifier fails, each named in the errors.
  const negative = runTsc(
    writeConfig(
      dir,
      'tsconfig.negative.json',
      NEGATIVES.map(([name]) => name)
    )
  );
  if (negative.status === 0) {
    fail(
      'the negative fixtures compiled. Shared can see browser or platform ' +
        'globals again, so the DOM lib or a types entry is back.'
    );
  }
  const missed = NEGATIVES.map(([name]) => name).filter(
    (name) => !new RegExp(`${name.replace('.', '\\.')}\\(\\d+,\\d+\\): error TS`).test(negative.output)
  );
  if (missed.length > 0) {
    fail(
      `these fixtures compiled even though their identifier must not exist ` +
        `in shared: ${missed.join(', ')}. tsc said:\n${negative.output.trim()}`
    );
  }

  // 3. The control: the same window fixture with DOM forced back on must
  // compile, so a broken scratch program cannot masquerade as a refusal.
  const control = runTsc(
    writeConfig(dir, 'tsconfig.control.json', ['neg-window.ts'], {
      lib: ['ES2023', 'DOM']
    })
  );
  if (control.status !== 0) {
    fail(
      'the control fixture failed with the DOM lib forced on, so the ' +
        `scratch program is broken and the six refusals above prove ` +
        `nothing. tsc said:\n${control.output.trim()}`
    );
  }

  console.log(
    '[shared-types] OK: URL and the File handle compile, ' +
      `${NEGATIVES.length} masked identifiers refused by name, control compiled under DOM`
  );
} catch (error) {
  if (!(error instanceof GateFailure)) throw error;
  console.error(`[shared-types] ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
