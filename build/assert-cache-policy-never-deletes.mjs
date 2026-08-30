#!/usr/bin/env node
/**
 * assert-cache-policy-never-deletes.mjs. The cache policy cannot delete, and
 * nothing that reads it can either (Phase 166).
 *
 * ## Why this file exists
 *
 * Phase 166 measured the Chromium caches over thirty launches, five simulated
 * version changes and five openings of a document carrying 49 MB of local
 * images, and found the shipped app writes zero bytes to either cache. The
 * policy that shipped is therefore one switch in the dev shape and no
 * deletion anywhere. The audit's one absolute is that `<userData>/gmux`,
 * being the manifest, arch.db, the snapshots and the logs, is never a target.
 * A rule with no gate is a rule a later round widens for convenience, and a
 * "cache cleanup" is exactly the kind of convenience that gets added in one
 * line. This gate is what stops that line.
 *
 * ## What it asserts, in about 0.1 seconds, spawning nothing
 *
 *  1. THE POLICY MODULE DIRECTORY. No file under src/main/cache/ (its tests
 *     aside) imports a file system module, calls a deletion API, or names the
 *     durable directory in code. Comments are stripped before the scan, so the
 *     header may say why the directory is never touched.
 *  2. EVERY READER OF THE POLICY. Any production file under src/main that
 *     imports from src/main/cache/ calls no deletion API at all. The report
 *     reads the policy to print it, and the boot reads it to apply one switch;
 *     neither has any business unlinking anything.
 *  3. THE WHOLE MAIN PROCESS. No production file under src/main calls
 *     Electron's session level deletions, being `clearCache`,
 *     `clearCodeCaches`, `clearData`, `clearStorageData`,
 *     `clearAuthCache` or `clearHostResolverCache`. Chromium evicts by its
 *     own rules inside its own ceiling; Tortie never does it for it.
 *  4. THE FIXTURES. The scanner is run over four files this script writes
 *     itself: one clean reader of the policy, one policy module that imports
 *     fs, one reader that unlinks a path naming the durable directory, and one
 *     unrelated module that calls `clearCache`. The first must produce no
 *     finding and the other three must produce exactly one each. A checker
 *     nobody has seen fail is a checker nobody has seen work.
 *
 * ## What it does not assert
 *
 * It does not ban deletion from the rest of main. The manifest rotates its own
 * backups, the migration removes its staging directory and the drop store
 * removes the files it wrote. Those are their own layers managing their own
 * files, and the absolute is about CACHE maintenance reaching durable data,
 * which rules 1 to 3 pin from both sides.
 *
 * Run it with `npm run gate:cache-policy`. Registered in
 * build/verification-checks.mjs as a pure contract test.
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const mainDir = join(repoRoot, 'src', 'main');
const cacheDir = join(mainDir, 'cache');

/** The file system modules a policy module may not import. */
const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'graceful-fs', 'fs-extra', 'rimraf', 'del']);

/** Node deletion calls, matched as `name(` after a dot or a word boundary. */
const NODE_DELETIONS = ['rm', 'rmSync', 'rmdir', 'rmdirSync', 'unlink', 'unlinkSync', 'rimraf'];

/** Electron session deletions. Never called anywhere under src/main. */
const SESSION_DELETIONS = [
  'clearCache',
  'clearCodeCaches',
  'clearData',
  'clearStorageData',
  'clearAuthCache',
  'clearHostResolverCache'
];

/** How the durable directory may be named in code. */
const DURABLE_TOKENS = [/['"`]gmux['"`]/, /\bDURABLE_DIR\b/];

// ---------------------------------------------------------------------------
// The scanner. Pure over its inputs, so the fixtures read the same function.
// ---------------------------------------------------------------------------

/** Strip block and line comments, keeping line count so findings name lines. */
export function stripComments(text) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote !== null) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        if (text[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Every module specifier a file imports or requires. */
function importedSpecifiers(code) {
  const specs = [];
  const re = /(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code)) !== null) specs.push(m[1]);
  return specs;
}

function callLines(code, names) {
  const hits = [];
  const lines = code.split('\n');
  const re = new RegExp(`(?:^|[^\\w$])(?:${names.join('|')})\\s*\\(`);
  lines.forEach((line, at) => {
    if (re.test(line)) hits.push({ line: at + 1, text: line.trim() });
  });
  return hits;
}

/**
 * Scan one file. `kind` is 'policy' for a file under src/main/cache/,
 * 'reader' for a file importing from it, and 'other' for the rest of main.
 * Returns findings; an empty array is a pass.
 */
export function scanFile(rel, text, kind) {
  const code = stripComments(text);
  const findings = [];
  if (kind === 'policy') {
    for (const spec of importedSpecifiers(code)) {
      if (FS_MODULES.has(spec)) {
        findings.push(`${rel} imports ${spec}: the policy module may not reach the file system`);
      }
    }
    for (const t of DURABLE_TOKENS) {
      if (t.test(code)) findings.push(`${rel} names the durable directory in code`);
    }
  }
  if (kind === 'policy' || kind === 'reader') {
    for (const h of callLines(code, NODE_DELETIONS)) {
      findings.push(`${rel}:${String(h.line)} calls a deletion API from a file that ${kind === 'policy' ? 'is the cache policy' : 'reads the cache policy'}: ${h.text}`);
    }
  }
  for (const h of callLines(code, SESSION_DELETIONS)) {
    findings.push(`${rel}:${String(h.line)} calls a session cache deletion: ${h.text}`);
  }
  return findings;
}

/** Whether a file imports from src/main/cache/, by relative specifier. */
function readsPolicy(absPath, code) {
  for (const spec of importedSpecifiers(code)) {
    if (!spec.startsWith('.')) continue;
    const target = resolve(absPath, '..', spec);
    if (target === cacheDir || target.startsWith(cacheDir + sep)) return true;
  }
  return false;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      yield* walk(p);
    } else if (/\.(ts|tsx|mts|cts|js|mjs)$/.test(name) && !/\.(test|spec)\./.test(name)) {
      yield p;
    }
  }
}

// ---------------------------------------------------------------------------
// The real scan
// ---------------------------------------------------------------------------

const failures = [];
let policyFiles = 0;
let readerFiles = 0;
let otherFiles = 0;

if (!existsSync(cacheDir)) {
  failures.push(`${relative(repoRoot, cacheDir)} does not exist, so there is no policy to pin`);
} else {
  for (const abs of walk(mainDir)) {
    const rel = relative(repoRoot, abs);
    const text = readFileSync(abs, 'utf8');
    let kind = 'other';
    if (abs.startsWith(cacheDir + sep)) kind = 'policy';
    else if (readsPolicy(abs, stripComments(text))) kind = 'reader';
    if (kind === 'policy') policyFiles += 1;
    else if (kind === 'reader') readerFiles += 1;
    else otherFiles += 1;
    failures.push(...scanFile(rel, text, kind));
  }
  if (policyFiles === 0) failures.push('no policy file was scanned under src/main/cache/');
  if (readerFiles === 0) failures.push('no file under src/main reads the policy, so the boot no longer applies it');
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

const GOOD_READER = `
import { cachePolicyFor } from '../cache/policy';
import { statfs } from 'node:fs/promises';
// rmSync('never called, this is a comment');
export async function read() { const p = cachePolicyFor(process.env, false); return [p, await statfs('/')]; }
`;
const BAD_POLICY = `
import { rmSync } from 'node:fs';
export function apply() { return rmSync; }
`;
const BAD_READER = `
import { cachePolicyFor } from '../cache/policy';
import { unlink } from 'node:fs/promises';
export async function tidy(userData) { cachePolicyFor(process.env, false); await unlink(userData + '/gmux/manifest.db'); }
`;
const BAD_OTHER = `
import { session } from 'electron';
export async function tidy() { await session.defaultSession.clearCache(); }
`;

function runFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'p166-gate-'));
  try {
    const cases = [
      ['fixture-good-reader.ts', GOOD_READER, 'reader', 0],
      ['fixture-bad-policy.ts', BAD_POLICY, 'policy', 1],
      ['fixture-bad-reader.ts', BAD_READER, 'reader', 1],
      ['fixture-bad-other.ts', BAD_OTHER, 'other', 1]
    ];
    for (const [name, text, kind, want] of cases) {
      const p = join(dir, name);
      writeFileSync(p, text);
      const got = scanFile(name, readFileSync(p, 'utf8'), kind);
      if (got.length !== want) {
        failures.push(`fixture ${name} produced ${String(got.length)} finding(s) and ${String(want)} were expected: ${got.join(' | ') || 'none'}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
runFixtures();

const TAG = '[cache-policy]';
if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
console.log(
  `${TAG} OK: ${String(policyFiles)} policy file(s) import no file system and name no durable path, ${String(readerFiles)} reader(s) call no deletion, ${String(otherFiles)} other main files call no session cache deletion, 4 fixtures behaved`
);
