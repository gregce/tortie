#!/usr/bin/env node
/**
 * `npm run conformance:credentials`, the gate on the store Tortie keeps
 * accounts in (Phase 204).
 *
 * About four seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, OPENS NO KEYCHAIN, makes no request and reads
 * nothing under the person's home: the keychain is a function written from the
 * measurement, the file system is a bag of strings, and the only real paths
 * are the repository and scratch directories it makes and removes. Every
 * runtime number it prints came from the SHIPPING modules, run under node by
 * build/credentials-conformance-probe.mts.
 *
 * ## Why a gate rather than unit tests alone
 *
 * This is the domain that writes the person's credentials, so the rules that
 * matter are the ones a later round could delete without breaking a test
 * written before the deletion. There are two kinds of check here and only the
 * second kind is new:
 *
 *   - IT SCANS THE REAL SOURCE for the refusals, being the payload never on a
 *     command line, `-A` never passed, the person's own store refused by name,
 *     one write and only one, and not a log line anywhere in the domain.
 *   - IT GOES RED UNDER ABLATION. Every rule below is re-run over an ablated
 *     copy of the shipping domain, and a rule that stays green under its own
 *     ablation is a rule that cannot fail, which proves nothing.
 *
 * ## The rules
 *
 *   1. THE CAPTURE. A store that changed is kept, and when the ACCOUNT changed
 *      rather than the token, the account that was there is promoted into a
 *      login of Tortie's own named from its address, holding the bytes that
 *      were in the store BYTE FOR BYTE. Both providers, claude out of the
 *      account file beside the credential and codex out of the id token claim.
 *   2. THE ROUND TRIP MATRIX. Every ordered pair of three accounts, switched,
 *      switched back, and at every hop all three are still there byte for byte
 *      and the store the chosen login runs under really holds its account.
 *   3. THE INTERRUPTED WRITE. The shipping write, stopped after each of its
 *      three steps over a real login directory: the store holds the old
 *      credential or the new one, never neither, and it is still a credential.
 *   4. THE ROLLBACK. A staged copy that does not read back equal leaves the
 *      store exactly as it was, on a vendor store and on Tortie's own alike,
 *      and the refusal names no payload.
 *   5. THE PERSON'S OWN LOCATION IS NEVER A WRITE TARGET. Both providers
 *      answer no target for it, choosing the default writes nothing, and not
 *      one path outside the login directories is written in that whole arm.
 *   6. A STORE UNDER A RUNNING SESSION IS REFUSED, in a sentence.
 *   7. A STORE CAUGHT MID CHANGE IS NOT CAPTURED, and nothing already kept is
 *      forgotten by it.
 *   8. THE ATTACK SHAPES: a truncated credential, valid JSON that is not a
 *      credential, a store Tortie's own keychain refuses, a store that becomes
 *      unreadable, two switches at once, and an expired credential.
 *   9. NO TOKEN BYTE. Not in an event, a fact, an answer, a refusal, the record
 *      file, the logins file or ANY command line, over an arm that really runs
 *      the keychain path so the command lines exist to be checked.
 *  10. THE KEYCHAIN PATH END TO END, over a `security` that behaves the way the
 *      real one was measured to on 2026-09-02: the bytes are exact, the account
 *      attribute is preserved, the person's own item is untouched, the payload
 *      went over STDIN, `-A` was never passed, and no staged item is left.
 *  11. The gate is named in package.json, in build/verification-checks.mjs and
 *      in CLAUDE.md, because a gate nothing names is how a gate decays.
 *  12. TWO OVERLAPPING OBSERVES leave one login, one surviving record row, the
 *      store's bytes, two answers that agree, and a later list that still says
 *      the account can be put back. An ordinary visit to the Agents page
 *      issues more than one list at once, so this is the common case rather
 *      than a hostile one, and thirteen ablations passed while it was broken.
 *  14. NOTHING IS LEFT HOLDING A CREDENTIAL BESIDE A STORE. A crash runs no
 *      `finally`, and real kills left a whole credential staged in two arms of
 *      three. A later write to the same store replaces it, because staging
 *      overwrites on both backends; the store that is never written again is
 *      swept by the first observe of the next run. PHASE 206 added the half
 *      the sweep never reached, being TORTIE'S OWN VAULT, where the same crash
 *      leaves the whole credential at `<slot>.pending`. The arm stages into a
 *      slot the observe will NOT write, because a successful write discards
 *      its own staged place and would let the arm pass with the sweep gone.
 *  15. A PLANTED LINK AT A STAGED NAME SENDS THE WRITE NOWHERE. Every write
 *      here stages at a name nobody has opened yet, and `writeFile` follows a
 *      link, so an entry planted at one took the whole write and read back
 *      through itself so the check passed. It is the one arm over real files
 *      and real links, because a bag of strings has none and that is how the
 *      defect survived thirteen ablations.
 *  16. A LOGIN THE PERSON REMOVES LEAVES NOTHING BEHIND (Phase 206). The
 *      Phase 203 verifier found the operator's own disk holding two claude
 *      login directories while `logins.json` held one row, and the removed
 *      one's scoped keychain item still held a whole credential of his. Five
 *      shapes are driven: a stray with an item, a stray with none, a stray
 *      whose NAME collides with a live row, a stray that is a symbolic link,
 *      and a remove interrupted between its two halves. All four stores a
 *      login owns must be clear, a row the file still names must survive, and
 *      the person's own item must be neither named by a delete nor changed.
 *  13. A STORE THAT NAMES NO ACCOUNT ON EITHER SIDE still keeps what it
 *      replaced, because a login signed into a moment ago has no address until
 *      it takes a turn and that is exactly when a person types `/login` again.
 *      The cost of keeping on doubt is bounded in the same arm: ten refreshes
 *      of such a store leave ONE login rather than nine, and ten refreshes of
 *      a store that does name itself leave none.
 *  17. THE VAULT IS SCOPED TO ITS PROFILE (Phase 208). A scratch root and the
 *      person's root compose DIFFERENT keychain names for the same slot, no
 *      name composed from any root can equal the unscoped one a tree before
 *      that phase wrote, the digest is re-derived here by a sha256 of this
 *      gate's own, an empty scope throws rather than composing the unscoped
 *      name, the keychain backend lands on the scoped name and nothing else,
 *      and a slot one profile wrote is invisible to another. THE MIGRATION is
 *      driven both ways over the measured security: present is moved and
 *      deleted byte for byte, absent touches nothing, both present with the
 *      record naming the old bytes rewrites the scoped copy, a staged leftover
 *      under the old name is deleted without being moved, and a profile that
 *      is not the person's own composes NO unscoped name at all. The scan half:
 *      the unscoped composer is defined in exactly one file, migrate.ts, and
 *      the one call of the migration outside that file, in index.ts, carries
 *      the profile proof composed by isOwnProfile.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[credentials]';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = join(repoRoot, 'src/main/credentials');

const failures = [];
const notes = [];
function check(ok, sentence) {
  if (!ok) failures.push(sentence);
}

/**
 * The domain has to be there before anything below can read it.
 *
 * WHY THIS IS A SENTENCE RATHER THAN A STACK. Run against the tree before this
 * phase, the gate exited non zero with a raw `ENOENT: scandir` and nothing a
 * reader could act on. It is right to be red there, because the rules it holds
 * did not exist yet, but every other gate in this repository says what is
 * missing in words and this one now does too. It is the first thing checked,
 * so a checkout without the domain reads as one rather than as a crash.
 */
let domainPresent = [];
try {
  domainPresent = readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'));
} catch {
  process.stdout.write(
    `${TAG} FAILED: there is no credentials domain at src/main/credentials, so ` +
      'there is nothing to check. This gate is the one on the store Tortie ' +
      'keeps accounts in, which arrived in Phase 204, and a tree from before ' +
      'that phase is expected to fail here.\n'
  );
  process.exit(1);
}
if (domainPresent.length === 0) {
  process.stdout.write(
    `${TAG} FAILED: src/main/credentials holds no TypeScript file, so there is ` +
      'nothing to check.\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The scanners. Each is proved on fixtures this file writes, so a scan that
// cannot fail is never mistaken for a scan that passed.
// ---------------------------------------------------------------------------

/** Comment text removed, so a sentence about `-A` is not a use of it. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Does this file put a credential on a command line?
 *
 * THE ONE WRITE COMMAND is a template literal whose payload is HEX, handed to
 * `security -i` over stdin. Anything else that names `add-generic-password`
 * inside an ARRAY is an argv, and an argv is readable by every process on the
 * machine for as long as the call lives. That is the shape orca has and this
 * phase refused.
 */
function payloadOnACommandLine(text) {
  const body = stripComments(text);
  const found = [];
  const re = /add-generic-password/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    // Walk back to the nearest quote that opens this literal.
    const before = body.slice(Math.max(0, m.index - 2), m.index);
    if (!before.includes('`')) found.push('add-generic-password not in a template');
  }
  // A payload handed to `run` as part of an argv array rather than as stdin.
  if (/run\(\s*\[[^\]]*\bpayload\b[^\]]*\]/.test(body)) {
    found.push('a payload inside a run argv array');
  }
  if (/run\(\s*\[[^\]]*\bhex\b[^\]]*\]/.test(body)) {
    found.push('a hex payload inside a run argv array');
  }
  return found;
}

/** Does this file ever pass `-A`, which trusts every program on the machine? */
function passesAllowAll(text) {
  const body = stripComments(text);
  return /['"`]-A['"`]/.test(body);
}

/** Does this file write a log line, which is where a token would land? */
function writesALog(text) {
  const body = stripComments(text);
  return /\bconsole\s*\.|\bgetLog\s*\(|\blog\s*\.(info|warn|error|debug)\s*\(/.test(
    body
  );
}

/** Which files call a swap target's commit, which must be exactly one. */
function commitsAWrite(text) {
  return /\.commit\s*\(/.test(stripComments(text));
}

/**
 * Which files define or use the unscoped composer (Phase 208).
 *
 * The composer is `unscopedVaultServiceFor`, and it must be DEFINED in exactly
 * one file and USED in that same file only. A second definition or a use
 * anywhere else is a second way of naming the item every profile could reach.
 */
function unscopedComposerUses(text) {
  const body = stripComments(text);
  const defines = /export function unscopedVaultServiceFor\s*\(/.test(body);
  const mentions = (body.match(/\bunscopedVaultServiceFor\s*\(/g) ?? []).length;
  // The definition is a mention too, and it is not a use.
  return { defines, uses: defines ? mentions - 1 : mentions };
}

/**
 * Does this file call the migration with the profile proof (Phase 208)?
 *
 * Read from the call to its closing brace by matching braces, so a proof
 * elsewhere in the file does not count for a call that lacks it.
 */
function migrationCarriesTheProof(text) {
  const body = stripComments(text);
  const at = body.indexOf('migrateUnscopedVault({');
  if (at < 0) return { calls: 0, proved: false };
  let depth = 0;
  let end = -1;
  for (let i = body.indexOf('{', at); i < body.length; i += 1) {
    if (body[i] === '{') depth += 1;
    if (body[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const call = end < 0 ? '' : body.slice(at, end + 1);
  const calls = (body.match(/migrateUnscopedVault\s*\(/g) ?? []).length;
  return { calls, proved: /ownProfile:\s*isOwnProfile\s*\(/.test(call) };
}

/**
 * Which files define or use `defaultStoreTarget` (Phase 211).
 *
 * The default store is the one Phase 211 makes writable, and only through this
 * one function, so it must be DEFINED in stores.ts and CALLED from exactly one
 * place, being `keep.ts`'s activate. A call anywhere else is a second way to
 * write the person's own location.
 */
function defaultTargetUses(text) {
  const body = stripComments(text);
  const defines = /export async function defaultStoreTarget\s*\(/.test(body);
  const mentions = (body.match(/\bdefaultStoreTarget\s*\(/g) ?? []).length;
  return { defines, calls: defines ? mentions - 1 : mentions };
}

/** Is the person's own location refused by name, as the first thing? */
function refusesTheDefaultStore(text) {
  const body = stripComments(text);
  const at = body.indexOf('export async function storeTarget');
  if (at < 0) return false;
  const open = body.indexOf('{', at);
  if (open < 0) return false;
  const head = body.slice(open, open + 220);
  return /if\s*\(\s*dir\s*===\s*null[^)]*\)\s*return null;/.test(head);
}

// ---------------------------------------------------------------------------
// The scans, over the real source.
// ---------------------------------------------------------------------------

const domainFiles = readdirSync(DOMAIN)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(DOMAIN, f));
check(domainFiles.length >= 7, `${TAG} the credentials domain has fewer files than expected`);

let committers = 0;
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const text = readFileSync(file, 'utf8');
  for (const why of payloadOnACommandLine(text)) {
    failures.push(`${TAG} ${name} PUTS A CREDENTIAL ON A COMMAND LINE: ${why}`);
  }
  check(!passesAllowAll(text), `${TAG} ${name} passes -A, which trusts every program on the machine with the person's credential`);
  check(!writesALog(text), `${TAG} ${name} writes a log line, so a token has somewhere to land`);
  if (commitsAWrite(text)) committers += 1;
}
check(
  committers === 1,
  `${TAG} ${String(committers)} files in the domain commit a write; there must be exactly one, being swap.ts`
);
check(
  refusesTheDefaultStore(readFileSync(join(DOMAIN, 'stores.ts'), 'utf8')),
  `${TAG} storeTarget no longer refuses the person's own location as its first act`
);
// PHASE 208. One composer of the unscoped name, one proved call of the move.
const composerDefiners = [];
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const found = unscopedComposerUses(readFileSync(file, 'utf8'));
  if (found.defines) composerDefiners.push(name);
  if (!found.defines && found.uses > 0) {
    failures.push(`${TAG} ${name} composes the UNSCOPED keychain name, which every profile on the machine can reach; only migrate.ts may`);
  }
}
check(
  composerDefiners.length === 1 && composerDefiners[0].endsWith('migrate.ts'),
  `${TAG} the unscoped composer is defined in ${composerDefiners.join(', ') || 'no file'} rather than in migrate.ts alone`
);
const proof = migrationCarriesTheProof(readFileSync(join(DOMAIN, 'index.ts'), 'utf8'));
check(
  proof.calls === 1 && proof.proved,
  `${TAG} index.ts calls the migration ${String(proof.calls)} time(s) and ${proof.proved ? 'with' : 'WITHOUT'} the profile proof composed by isOwnProfile`
);
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  if (name.endsWith('index.ts') || name.endsWith('migrate.ts')) continue;
  check(
    !/migrateUnscopedVault\s*\(/.test(stripComments(readFileSync(file, 'utf8'))),
    `${TAG} ${name} calls the migration, which only index.ts may`
  );
}
// PHASE 211. The default store is writable through exactly one function, from
// exactly one caller. storeTarget still refuses dir === null for everyone else.
const defaultDefiners = [];
const defaultCallers = new Set();
let defaultCallSites = 0;
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const found = defaultTargetUses(readFileSync(file, 'utf8'));
  if (found.defines) defaultDefiners.push(name);
  if (found.calls > 0) {
    defaultCallers.add(name);
    defaultCallSites += found.calls;
  }
}
check(
  defaultDefiners.length === 1 && defaultDefiners[0].endsWith('stores.ts'),
  `${TAG} defaultStoreTarget is defined in ${defaultDefiners.join(', ') || 'no file'} rather than in stores.ts alone`
);
check(
  defaultCallers.size === 1 &&
    [...defaultCallers][0].endsWith('keep.ts') &&
    defaultCallSites === 1,
  `${TAG} the default store is reached from ${[...defaultCallers].join(', ') || 'nobody'} (${String(defaultCallSites)} call sites) rather than keep.ts's activate alone`
);
notes.push(
  `${String(domainFiles.length)} files scanned, 1 write, no -A, no log line, no payload on a command line, 1 unscoped composer, 1 proved migration call, 1 default-store writer reached from 1 caller`
);

// ---------------------------------------------------------------------------
// The scanners, proved on fixtures. Some must pass and some must fail.
// ---------------------------------------------------------------------------

const FIXTURES = [
  {
    name: 'the shipping write shape',
    text: 'const command = `add-generic-password -U -a "${a}" -s "${s}" -X "${hex}"\\n`;\nawait runner.run([\'-i\'], command);\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  },
  {
    name: 'a comment naming the flag',
    text: '// It never passes -A and never names add-generic-password on an argv.\nconst a = 1;\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  },
  {
    name: 'the payload as an argv',
    text: "await runner.run(['add-generic-password', '-U', '-w', payload]);\n",
    onCommandLine: true,
    allowAll: false,
    logs: false
  },
  {
    name: 'the hex as an argv',
    text: "await runner.run(['add-generic-password', '-X', hex]);\n",
    onCommandLine: true,
    allowAll: false,
    logs: false
  },
  {
    name: 'the allow all flag',
    text: "await runner.run(['add-generic-password', '-A', '-s', service], cmd);\n",
    onCommandLine: true,
    allowAll: true,
    logs: false
  },
  {
    name: 'a console line',
    text: "console.log('kept', service);\n",
    onCommandLine: false,
    allowAll: false,
    logs: true
  },
  {
    name: 'a scoped logger',
    text: "const log = getLog('credentials');\nlog.info('x', {});\n",
    onCommandLine: false,
    allowAll: false,
    logs: true
  },
  {
    name: 'a word that merely contains one',
    text: 'const catalog = 1;\nexport const dialog = catalog;\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  }
];
let behaved = 0;
for (const f of FIXTURES) {
  const onCommandLine = payloadOnACommandLine(f.text).length > 0;
  const allowAll = passesAllowAll(f.text);
  const logs = writesALog(f.text);
  if (
    onCommandLine === f.onCommandLine &&
    allowAll === f.allowAll &&
    logs === f.logs
  ) {
    behaved += 1;
  } else {
    failures.push(
      `${TAG} the scanner misread the fixture "${f.name}": command line ${String(onCommandLine)} (want ${String(f.onCommandLine)}), allow all ${String(allowAll)} (want ${String(f.allowAll)}), logs ${String(logs)} (want ${String(f.logs)})`
    );
  }
}
const REFUSAL_FIXTURES = [
  {
    name: 'the shipping refusal',
    text: "export async function storeTarget(d, p, dir) {\n  if (dir === null || dir === '') return null;\n  return one(d, dir);\n}\n",
    refuses: true
  },
  {
    name: 'the refusal removed',
    text: "export async function storeTarget(d, p, dir) {\n  return one(d, dir);\n}\n",
    refuses: false
  },
  {
    name: 'a refusal in some other function',
    text: "function other(dir) { if (dir === null) return null; }\nexport async function storeTarget(d, p, dir) {\n  return one(d, dir);\n}\n",
    refuses: false
  }
];
for (const f of REFUSAL_FIXTURES) {
  if (refusesTheDefaultStore(f.text) === f.refuses) behaved += 1;
  else {
    failures.push(
      `${TAG} the refusal scanner misread the fixture "${f.name}"`
    );
  }
}
// PHASE 208. The two scanners above, proved on shapes that must pass and fail.
const SCOPE_FIXTURES = [
  {
    name: 'the shipping composer',
    text: 'export function unscopedVaultServiceFor(slot: string): string {\n  return `${VAULT_SERVICE_PREFIX}${slot}`;\n}\nconst a = unscopedVaultServiceFor(x);\n',
    defines: true,
    uses: 1
  },
  {
    name: 'a second composer under another name that still calls it',
    text: 'const legacy = unscopedVaultServiceFor(slot);\n',
    defines: false,
    uses: 1
  },
  {
    name: 'a comment naming it',
    text: '// unscopedVaultServiceFor(slot) is never called here.\nconst b = 1;\n',
    defines: false,
    uses: 0
  }
];
for (const f of SCOPE_FIXTURES) {
  const got = unscopedComposerUses(f.text);
  if (got.defines === f.defines && got.uses === f.uses) behaved += 1;
  else failures.push(`${TAG} the composer scanner misread the fixture "${f.name}"`);
}
const PROOF_FIXTURES = [
  {
    name: 'the shipping call',
    text: 'migration = migrateUnscopedVault({\n  runner: r,\n  vault: v,\n  slots: [],\n  ownProfile: isOwnProfile({ userData: a, env: process.env })\n});\n',
    calls: 1,
    proved: true
  },
  {
    name: 'the proof replaced by a constant',
    text: 'migration = migrateUnscopedVault({\n  runner: r,\n  ownProfile: true\n});\n',
    calls: 1,
    proved: false
  },
  {
    name: 'the proof elsewhere in the file but not in the call',
    text: 'const own = isOwnProfile({ env });\nmigration = migrateUnscopedVault({\n  runner: r,\n  ownProfile: own\n});\n',
    calls: 1,
    proved: false
  },
  {
    name: 'no call at all',
    text: 'const x = 1;\n',
    calls: 0,
    proved: false
  }
];
for (const f of PROOF_FIXTURES) {
  const got = migrationCarriesTheProof(f.text);
  if (got.calls === f.calls && got.proved === f.proved) behaved += 1;
  else failures.push(`${TAG} the proof scanner misread the fixture "${f.name}"`);
}
// PHASE 211. The default-store reachability scanner, proved on fixtures.
const DEFAULT_FIXTURES = [
  {
    name: 'the shipping definition',
    text: 'export async function defaultStoreTarget(d, p) {\n  return null;\n}\n',
    defines: true,
    calls: 0
  },
  {
    name: 'the one caller',
    text: 'const defTarget = await defaultStoreTarget(d.stores, provider);\n',
    defines: false,
    calls: 1
  },
  {
    name: 'a second caller sneaking in',
    text: 'await defaultStoreTarget(a, b);\nawait defaultStoreTarget(c, d);\n',
    defines: false,
    calls: 2
  },
  {
    name: 'a comment naming it',
    text: '// defaultStoreTarget(d, p) is the only writer of the default store.\nconst x = 1;\n',
    defines: false,
    calls: 0
  }
];
for (const f of DEFAULT_FIXTURES) {
  const got = defaultTargetUses(f.text);
  if (got.defines === f.defines && got.calls === f.calls) behaved += 1;
  else failures.push(`${TAG} the default-store scanner misread the fixture "${f.name}"`);
}
notes.push(
  `${String(behaved)} of ${String(FIXTURES.length + REFUSAL_FIXTURES.length + SCOPE_FIXTURES.length + PROOF_FIXTURES.length + DEFAULT_FIXTURES.length)} scanner fixtures behaved`
);

// ---------------------------------------------------------------------------
// The probe, over the tree and over the ablated copies of it.
// ---------------------------------------------------------------------------

function runProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/credentials-conformance-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(modules === null ? {} : { P204_MODULES: modules })
      }
    }
  );
  if (probe.status !== 0) {
    return { error: `the probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/**
 * The whole set of runtime claims, as one comparable value.
 *
 * The scoped service name derives from a temporary directory and moves every
 * run, so it is reduced to its SHAPE rather than compared verbatim. Everything
 * else is compared exactly, and an ablation must change at least one of them.
 */
/** The name of each reading, so an ablation can be told what it moved. */
const VERDICT_PARTS = [
  'capture',
  'claude',
  'roundTrip',
  'interrupted',
  'rollback',
  'rollbackOwn',
  'defaultStore',
  'running',
  'locks',
  'claudeLock',
  'lockRefusal',
  'defaultLift',
  'watcher',
  'midChange',
  'attack',
  'leak',
  'noDuplicates',
  'overlap',
  'unnamed',
  'residue',
  'removal',
  'nofollow',
  'keychain',
  'scope',
  'shapes'
];

function verdict(d) {
  if ('error' in d) return ['error'];
  const keychain = { ...(d.keychain ?? {}) };
  keychain.itemsNamed = (keychain.itemsNamed ?? []).map((name) =>
    name.startsWith('Claude Code-credentials-') ? 'scoped' : name
  );
  return [
    JSON.stringify(d.capture),
    JSON.stringify(d.claude),
    JSON.stringify(d.roundTrip),
    JSON.stringify(d.interrupted),
    JSON.stringify(d.rollback),
    JSON.stringify(d.rollbackOwn),
    JSON.stringify(d.defaultStore),
    JSON.stringify(d.running),
    JSON.stringify(d.locks),
    JSON.stringify(d.claudeLock),
    JSON.stringify(d.lockRefusal),
    JSON.stringify(d.defaultLift),
    JSON.stringify(d.watcher),
    JSON.stringify(d.midChange),
    JSON.stringify(d.attack),
    JSON.stringify(d.leak),
    JSON.stringify(d.noDuplicates),
    JSON.stringify(d.overlap),
    JSON.stringify(d.unnamed),
    JSON.stringify(d.residue),
    JSON.stringify(d.removal),
    JSON.stringify(d.nofollow),
    JSON.stringify(keychain),
    JSON.stringify(d.scope),
    JSON.stringify(d.shapes)
  ];
}

const live = runProbe(null);
if ('error' in live) {
  failures.push(`${TAG} ${live.error}`);
} else {
  // Rule 1.
  check(live.capture.keptFirst, `${TAG} a store's credential was not kept`);
  check(
    live.capture.promotedName === 'alice.example',
    `${TAG} THE ACCOUNT THAT WAS REPLACED WAS NOT PROMOTED: the login is ${String(live.capture.promotedName)} and a name minted from the address is alice.example`
  );
  check(
    live.capture.promotedBytesExact,
    `${TAG} THE PROMOTED LOGIN DOES NOT HOLD THE BYTES THAT WERE IN THE STORE`
  );
  check(
    live.capture.defaultNowHoldsIncoming,
    `${TAG} the rolling copy of the person's own location was not moved on`
  );
  check(
    live.capture.promotedFactsKept && live.capture.promotedFactsRestores,
    `${TAG} A LOGIN PROMOTED A MOMENT AGO HAS NO ROW OF ITS OWN, so it draws as never signed into until the next observation`
  );
  check(
    live.capture.promotedFactsEmail === 'alice@example.com',
    `${TAG} the promoted login's row does not carry the address Tortie recorded for it`
  );
  check(live.capture.ownStoreUntouched, `${TAG} THE PERSON'S OWN STORE WAS WRITTEN`);
  check(live.capture.recordHasNoToken, `${TAG} A TOKEN BYTE REACHED THE RECORD FILE`);
  check(live.capture.loginsFileHasNoToken, `${TAG} A TOKEN BYTE REACHED THE LOGINS FILE`);
  check(live.claude.promoted, `${TAG} CLAUDE PARITY IS GONE: an account change was not promoted`);
  check(
    live.claude.name === 'carol.example',
    `${TAG} the claude promotion is named ${String(live.claude.name)} rather than from its address`
  );
  check(live.claude.bytesExact, `${TAG} the promoted claude login does not hold the store's bytes`);

  // Rule 2.
  check(
    live.roundTrip.accounts.length === 3,
    `${TAG} the matrix ran over ${String(live.roundTrip.accounts.length)} accounts rather than three`
  );
  check(
    live.roundTrip.pairs.length === 6,
    `${TAG} the matrix ran ${String(live.roundTrip.pairs.length)} ordered pairs rather than six`
  );
  for (const pair of live.roundTrip.pairs) {
    check(
      pair.ok === true,
      `${TAG} A SWITCH LOST AN ACCOUNT: ${pair.from} to ${pair.to} and back answered ${JSON.stringify(pair)}`
    );
    check(
      pair.storeHolds === true,
      `${TAG} after switching back to ${pair.from} its own store does not hold its account`
    );
  }

  // Rule 3.
  for (const arm of live.interrupted) {
    check(
      arm.holdsOneOfThem,
      `${TAG} A WRITE STOPPED AFTER ${String(arm.step)} LEFT THE STORE HOLDING NEITHER CREDENTIAL`
    );
    check(arm.holdsSomething, `${TAG} a write stopped after ${String(arm.step)} emptied the store`);
    check(
      arm.stillACredential,
      `${TAG} a write stopped after ${String(arm.step)} left something that is not a credential`
    );
    check(
      arm.landedWhereExpected,
      `${TAG} a write stopped after ${String(arm.step)} left the store somewhere neither step explains`
    );
  }
  const happy = live.interrupted.find((a) => a.step === 'none');
  check(happy?.ok === true, `${TAG} the uninterrupted write did not finish`);
  check(
    happy?.stagedLeft === false,
    `${TAG} a finished write left its staged copy behind`
  );

  // Rule 4.
  check(live.rollback.refused, `${TAG} A CORRUPTED STAGED COPY WAS COMMITTED`);
  check(live.rollback.unchanged, `${TAG} a refused write changed the store anyway`);
  check(live.rollback.reasonHasNoToken, `${TAG} A REFUSAL NAMED A TOKEN`);
  check(live.rollbackOwn.refused, `${TAG} the same corruption was committed into Tortie's own store`);

  // Rule 5.
  check(
    live.defaultStore.codexTargetIsNull && live.defaultStore.claudeTargetIsNull,
    `${TAG} THE PERSON'S OWN LOCATION IS A WRITE TARGET`
  );
  check(live.defaultStore.chooseOk, `${TAG} choosing the default login was refused`);
  check(live.defaultStore.wrote === false, `${TAG} choosing the default login wrote something`);
  check(live.defaultStore.untouched, `${TAG} choosing the default login changed the person's own store`);
  check(
    live.defaultStore.pathsWritten === 0,
    `${TAG} choosing the default login wrote ${String(live.defaultStore.pathsWritten)} other paths`
  );

  // Rule 6 (Phase 211). A STORE UNDER A RUNNING SESSION IS WRITTEN, NOT REFUSED.
  check(live.running.wrote, `${TAG} A SWITCH UNDER A RUNNING SESSION WAS REFUSED rather than reaching it`);
  check(live.running.ownStoreWritten, `${TAG} the login's own store was not written under a running session`);
  check(
    live.running.defaultUntouchedForNonDefault,
    `${TAG} a session on a NON-default login wrote the person's own default location`
  );
  // THE DEFAULT LIFT: a session on the default login writes the vendor location.
  check(live.running.defaultLoginExists, `${TAG} the default-lift arm made no login, so it proves nothing`);
  check(live.running.defaultLiftWrote, `${TAG} THE DEFAULT LIFT DID NOT WRITE the vendor's own location under a running default session`);
  check(
    live.running.defaultStoreNowHolds,
    `${TAG} the default store does not hold the chosen account after the default lift, so the running session cannot follow`
  );

  // Rule 6b (Phase 211). THE LOCKS. Claude Code's own credential locks.
  check(live.locks.reclaimed, `${TAG} a lock older than the staleness bound was NOT reclaimed, so a dead holder blocks a switch for ever`);
  check(live.locks.neverStole, `${TAG} A LIVE LOCK WAS STOLEN, so a switch can land inside a token refresh`);
  check(live.locks.refusalNamesLock, `${TAG} a lock that could not be taken refused without naming the lock`);
  check(live.locks.refusalHasNoToken, `${TAG} A LOCK REFUSAL NAMED A TOKEN`);
  check(live.locks.locksInOrder, `${TAG} a claude write did not take the vendor's three locks in the vendor's order, being .oauth_refresh.lock, the legacy <config-home>.lock and .storage-write`);
  check(live.locks.allReleased, `${TAG} a claude write left a lock directory behind`);
  check(live.locks.legacyNamedFromRealPath, `${TAG} the legacy lock of a config home that is a link is not named from the real path, so it is not the directory the vendor locks`);
  check(live.locks.neverTheJsonLock, `${TAG} a claude write took the .claude.json lock, which activate never needs`);
  check(live.locks.codexRan && live.locks.codexMadeNoLock, `${TAG} the codex write held a lock; codex holds none`);

  check(live.locks.unwritableImmediate, `${TAG} A LOCK DIRECTORY THAT CANNOT BE MADE WAS WAITED ON, at one core, rather than refused at once`);
  check(live.locks.unwritableSaysWhy, `${TAG} an unmakeable lock refused without naming the lock and saying the folder is not writable`);
  check(live.locks.unwritableNoToken, `${TAG} an unmakeable lock refusal named a token`);
  check(live.locks.nullBranchSleeps, `${TAG} THE LOCK LOOP SPINS: a seam answering not made and not there together ran the whole wait with no sleep`);

  // Rule 6f (Phase 211 fix round). A HELD LOCK IS A REFUSAL, NOT A THROW.
  check(!live.lockRefusal.threw, `${TAG} A LOCK HELD PAST THE WAIT WAS THROWN OUT OF ACTIVATE rather than answered, so the registrar records the choice and the face says switched`);
  check(live.lockRefusal.refused, `${TAG} a lock held past the wait did not refuse the switch`);
  check(live.lockRefusal.reasonNamesLock, `${TAG} the held lock refusal does not name the lock`);
  check(live.lockRefusal.reasonHasNoToken, `${TAG} THE HELD LOCK REFUSAL NAMED A TOKEN`);
  check(live.lockRefusal.holderKept, `${TAG} the live holder's lock was stolen by the refused switch`);
  check(live.lockRefusal.storeUntouched, `${TAG} a refused switch wrote the store anyway`);

  // Rule 6c (Phase 211). A CLAUDE WRITE HOLDS BOTH LOCKS, seen through activate.
  check(live.claudeLock.wrote, `${TAG} the claude lock arm did not write, so the lock check proves nothing`);
  check(
    live.claudeLock.heldAll,
    `${TAG} A CLAUDE SWITCH DID NOT HOLD THE VENDOR'S LOCKS: took ${String(live.claudeLock.lockCount)} rather than 3`
  );

  // Rule 6e (Phase 211 fix round). THE DEFAULT LIFT KEEPS WHAT IT WRITES OVER.
  check(live.defaultLift.wrote, `${TAG} the default lift arm did not write, so the rest of it is a check over an empty world`);
  check(live.defaultLift.itemHoldsChosen, `${TAG} the default lift did not put the chosen account into the vendor's own keychain item`);
  check(
    live.defaultLift.outgoingHeldAfterObserve,
    `${TAG} THE DEFAULT LIFT LOST THE PERSON'S OWN ACCOUNT: the account that was in the default store exists in no slot after the observe that follows a choose, because the lift wrote over it while the vendor's identity file still named it`
  );
  check(
    JSON.stringify(live.defaultLift.logins) === JSON.stringify(['alice.example', 'work']),
    `${TAG} the default lift left the logins as ${JSON.stringify(live.defaultLift.logins)} rather than the chosen one and one promoted from the address`
  );
  check(
    live.defaultLift.recordDigestIsChosen && live.defaultLift.recordEmailIsChosen,
    `${TAG} the default record was not moved on to the chosen account after the lift, so the next observe judges a change instead of reading unchanged bytes`
  );
  check(live.defaultLift.observeChangedNothing, `${TAG} the observe after a lift kept or promoted something, so the lift left the record behind the store`);

  // Rule 6d (Phase 211). THE WATCHER: one observe per burst, only its file.
  check(live.watcher.watchesADirectory, `${TAG} the watcher opened no directory watcher, so the burst check proves nothing`);
  check(live.watcher.quietBeforeDebounce, `${TAG} the watcher observed before the debounce settled`);
  check(live.watcher.oneObservePerBurst, `${TAG} A BURST OF FILE EVENTS DID NOT COLLAPSE INTO ONE OBSERVE`);
  check(live.watcher.ignoresOtherFiles, `${TAG} the watcher observed for a file it does not watch`);

  // Rule 7.
  check(
    live.midChange.kept === 0 && live.midChange.promoted === 0,
    `${TAG} A STORE CAUGHT MID CHANGE WAS CAPTURED, so half a credential can be kept`
  );
  check(live.midChange.copyUnchanged, `${TAG} a store caught mid change moved the kept copy`);
  check(
    live.midChange.loginsAdded === 0,
    `${TAG} a store caught mid change added a login`
  );

  // Rule 8.
  const attack = Object.fromEntries(live.attack.map((a) => [a.name, a]));
  check(
    attack['a truncated credential'].kept === 0 &&
      attack['a truncated credential'].slots === 0,
    `${TAG} a truncated credential was kept`
  );
  check(
    attack['valid JSON that is not a credential'].kept === 0,
    `${TAG} valid JSON that is not a credential was kept`
  );
  check(
    attack['a store Tortie owns that refuses to be kept'].refused === 1 &&
      attack['a store Tortie owns that refuses to be kept'].slots === 0,
    `${TAG} a keychain that refuses did not answer with a sentence`
  );
  check(
    attack['a store that becomes unreadable'].threw === false,
    `${TAG} A STORE THAT BECAME UNREADABLE THREW OUT OF THE DOMAIN, so one bad file stops a person seeing their logins`
  );
  check(
    attack['a store that becomes unreadable'].copyUnchanged,
    `${TAG} a store that became unreadable lost what was already kept`
  );
  check(
    attack['two switches at once'].oneSucceeded &&
      attack['two switches at once'].storeExact &&
      attack['two switches at once'].stagedLeft === false,
    `${TAG} two switches at once left the store wrong or a staged copy behind`
  );
  check(
    attack['an expired credential'].kept === 1 &&
      attack['an expired credential'].bytesExact,
    `${TAG} an expired credential was inspected rather than moved whole`
  );
  check(
    live.noDuplicates.names.length === 2,
    `${TAG} an account was promoted more than once: ${JSON.stringify(live.noDuplicates.names)}`
  );

  // Rule 12. TWO OVERLAPPING OBSERVES, which is what an ordinary mount makes.
  check(
    live.overlap.logins.length === 1,
    `${TAG} two overlapping observes made ${String(live.overlap.logins.length)} logins rather than one`
  );
  check(
    live.overlap.recordKeeps,
    `${TAG} TWO OVERLAPPING LISTS DESTROYED THE PROMOTED LOGIN'S ROW, so the account it holds is offered back to nobody, for ever`
  );
  check(
    live.overlap.bytesExact,
    `${TAG} the account kept through two overlapping observes is not the bytes that were in the store`
  );
  check(
    live.overlap.agree,
    `${TAG} two overlapping observes answered differently about the same login`
  );
  check(
    live.overlap.laterKept,
    `${TAG} a list issued after two overlapping ones draws the promoted login as never signed into`
  );

  // Rule 13. A STORE THAT NAMES NO ACCOUNT still keeps what it replaced.
  check(
    live.unnamed.promoted,
    `${TAG} A STORE NAMING NO ADDRESS ON EITHER SIDE LOST THE ACCOUNT IT REPLACED: this is the shape a person hits by signing in and typing /login before taking a turn`
  );
  check(
    live.unnamed.bytesExact,
    `${TAG} the account kept from an unnamed store is not the bytes that were in it`
  );
  check(
    live.unnamed.loginsAfterTen === 1,
    `${TAG} ten refreshes of an unnamed store made ${String(live.unnamed.loginsAfterTen)} logins rather than one, and the name minter stops at 99`
  );
  check(
    live.unnamed.namedLogins === 0,
    `${TAG} ten refreshes of ONE named account made ${String(live.unnamed.namedLogins)} logins rather than none`
  );

  // Rule 14. NOTHING IS LEFT HOLDING A CREDENTIAL BESIDE A STORE.
  check(
    live.residue.crashLeftACredential,
    `${TAG} the residue arm staged nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.residue.storeUntouched,
    `${TAG} an interrupted write changed the store it was writing`
  );
  check(
    live.residue.secondWriteLeftOnlyItsOwn,
    `${TAG} a later write to the same store did not replace the credential a crash left staged there`
  );
  check(
    live.residue.nextRunSweptIt,
    `${TAG} A WHOLE CREDENTIAL LEFT BESIDE A STORE BY A CRASH IS STILL THERE after a run that observed it`
  );
  check(
    live.residue.storeStillThere,
    `${TAG} the sweep removed something that was not the staged copy`
  );
  // Rule 14b. AND THE SAME INSIDE TORTIE'S OWN VAULT (Phase 206).
  check(
    live.residue.vaultCrashLeftACredential,
    `${TAG} the vault crash arm staged nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.residue.vaultSweptIt,
    `${TAG} A WHOLE CREDENTIAL LEFT IN TORTIE'S OWN VAULT BY A CRASH IS STILL THERE after a run that observed it`
  );
  check(
    live.residue.vaultDefaultSweptIt,
    `${TAG} the default slot's staged place was left holding a credential`
  );
  check(
    live.residue.vaultNoDirSweptIt,
    `${TAG} A WHOLE CREDENTIAL STAGED BESIDE A SLOT WHOSE FOLDER HAS GONE IS STILL THERE after a run that observed it: the sweep read the directories on disk and that login has none`
  );
  check(
    live.residue.vaultSlotsKept,
    `${TAG} the vault sweep left a staged place behind, or removed a slot that was not one`
  );

  // Rule 16. A LOGIN THE PERSON REMOVES LEAVES NOTHING BEHIND (Phase 206).
  check(
    live.removal.strayHeldACredential,
    `${TAG} the removal arm made no stray holding a credential, so the rest of it is a check over an empty world`
  );
  check(
    live.removal.strayCleared,
    `${TAG} A LOGIN THE PERSON REMOVED STILL HAS A CREDENTIAL NOBODY CAN REACH: its keychain item, its slot, its record row or its folder outlived the removal`
  );
  check(
    live.removal.noDirHeldACredential,
    `${TAG} the no folder arm planted no credential, so the rest of it is a check over an empty world`
  );
  check(
    live.removal.noDirCleared,
    `${TAG} A STRAY WHOSE FOLDER HAS ALREADY GONE STILL HAS A CREDENTIAL NOBODY CAN REACH: its keychain item, its slot or its record row outlived the sweep`
  );
  check(
    live.removal.bareStrayCleared,
    `${TAG} a stray folder that was never signed into was left behind`
  );
  check(
    live.removal.finishedCount === 4,
    `${TAG} the sweep finished ${String(live.removal.finishedCount)} strays rather than the 4 it was given, being three with a folder and one with none`
  );
  check(
    live.removal.droppedBySanitizer,
    `${TAG} the collision arm did not produce a dropped row, so what it proves next is nothing`
  );
  check(
    live.removal.liveKept && live.removal.shadowKept,
    `${TAG} THE SWEEP DELETED A LOGIN THE FILE STILL NAMES, because another row shares its name and the reader drops one of them`
  );
  check(
    live.removal.linkGone,
    `${TAG} a stray that is a symbolic link was left in Tortie's own data`
  );
  check(
    live.removal.victimUntouched,
    `${TAG} FINISHING A STRAY THAT IS A LINK REACHED THROUGH IT and changed a file Tortie does not own`
  );
  check(
    live.removal.interruptedLeftNoCredential,
    `${TAG} a remove interrupted after its first half left a credential no row names`
  );
  check(
    live.removal.interruptedLeftTheFolder,
    `${TAG} the interrupted arm removed the folder too, so it is not the half it claims to measure`
  );
  check(
    live.removal.ownItemUntouched && !live.removal.deleteNamedOwnItem,
    `${TAG} THE PERSON'S OWN KEYCHAIN ITEM was named by a delete or changed by one`
  );
  check(
    live.removal.deletesAsked > 0,
    `${TAG} the removal arm asked the keychain for no delete at all, so the two checks above pass over nothing`
  );

  // Rule 15. A PLANTED LINK AT A STAGED NAME SENDS THE WRITE NOWHERE.
  check(
    live.nofollow.linkPlanted,
    `${TAG} the link arm planted nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.nofollow.storeWritten && live.nofollow.storeHoldsTheNewAccount,
    `${TAG} a link beside a store stopped the write reaching the store at all`
  );
  check(
    live.nofollow.storeVictimUntouched,
    `${TAG} A LINK PLANTED BESIDE A STORE SENT THE WRITE THROUGH IT, into a path outside the login directories`
  );
  check(
    live.nofollow.storeIsAFile,
    `${TAG} the commit renamed a link onto a store, so the store is now a link`
  );
  check(
    live.nofollow.vaultWritten && live.nofollow.vaultVictimUntouched,
    `${TAG} A LINK PLANTED IN TORTIE'S OWN STORE TOOK THE WRITE`
  );
  check(
    live.nofollow.recordWritten && live.nofollow.recordVictimUntouched,
    `${TAG} A LINK PLANTED BESIDE THE RECORD FILE TOOK THE WRITE`
  );
  check(
    live.nofollow.renameRefusedALink && live.nofollow.lateVictimUntouched,
    `${TAG} a link planted between the write and the commit was renamed onto the store`
  );

  // Rule 9 and rule 10.
  check(!live.leak.tokenInAnswers, `${TAG} A TOKEN BYTE REACHED AN ANSWER THIS DOMAIN GIVES`);
  check(live.leak.recordHasDigest, `${TAG} the record file holds no digest, so the leak scan is over an empty file`);
  check(live.keychain.promoted && live.keychain.activated, `${TAG} the keychain arm did not run to the end`);
  check(live.keychain.bytesExact, `${TAG} THE KEYCHAIN ROUND TRIP IS NOT BYTE EXACT`);
  check(live.keychain.accountPreserved, `${TAG} a write back did not preserve the item's account attribute`);
  check(live.keychain.ownItemUntouched, `${TAG} THE PERSON'S OWN KEYCHAIN ITEM WAS WRITTEN`);
  check(
    live.keychain.itemsNamed.length === 2,
    `${TAG} the keychain holds ${String(live.keychain.itemsNamed.length)} items rather than the person's own and the one login's`
  );
  check(live.keychain.argvCount > 0, `${TAG} the keychain arm made no calls, so the argv check proves nothing`);
  check(!live.keychain.tokenInArgv, `${TAG} A CREDENTIAL REACHED A COMMAND LINE`);
  check(live.keychain.payloadInStdin, `${TAG} no write went over stdin, so the argv check proves nothing`);
  check(!live.keychain.everPassedA, `${TAG} -A WAS PASSED, which trusts every program on the machine`);
  check(!live.keychain.stagedLeft, `${TAG} a staged keychain item was left behind`);

  // Rule 17. THE VAULT IS SCOPED TO ITS PROFILE (Phase 208).
  check(live.scope.differ, `${TAG} A SCRATCH ROOT AND THE PERSON'S ROOT COMPOSE THE SAME KEYCHAIN NAME, so every profile on the machine addresses one item`);
  check(live.scope.neverUnscoped, `${TAG} A NAME COMPOSED FROM A ROOT EQUALS THE UNSCOPED ONE a tree before Phase 208 wrote`);
  check(live.scope.digestRederived, `${TAG} the scope digest is not the first eight hex of a sha256 of the root`);
  check(live.scope.emptyScopeThrows, `${TAG} an empty scope composed a name rather than throwing`);
  check(live.scope.composerAgrees, `${TAG} the unscoped composer in migrate.ts does not spell the old name`);
  check(live.scope.backendNamesScoped, `${TAG} the keychain backend wrote somewhere other than the scoped name`);
  check(live.scope.crossProfileHidden, `${TAG} a slot one profile wrote is visible to another`);
  check(
    live.scope.ownProfile.own && !live.scope.ownProfile.scratch && !live.scope.ownProfile.probes && !live.scope.ownProfile.smoke,
    `${TAG} isOwnProfile misread a shape: ${JSON.stringify(live.scope.ownProfile)}`
  );
  check(live.scope.migration.presentMoved, `${TAG} AN UNSCOPED ITEM WAS NOT MOVED UNDER THE SCOPED NAME AND DELETED, so a credential nobody can reach survives`);
  check(live.scope.migration.absentUntouched, `${TAG} the migration wrote or deleted with no unscoped item present`);
  check(live.scope.migration.refusedNamesNothing, `${TAG} A PROFILE THAT IS NOT THE PERSON'S OWN COMPOSED THE UNSCOPED NAME`);
  check(live.scope.migration.recordedOldRewritten, `${TAG} the scoped copy was not rewritten from the old item the record names`);
  check(live.scope.migration.stagedResidueDeleted, `${TAG} a staged leftover under the old name survived the migration`);
  check(live.scope.migration.presentNamedUnscoped, `${TAG} the present arm never named the unscoped item, so the refusal arm proves nothing`);
  check(live.scope.migration.badReadbackKept, `${TAG} THE OLD ITEM WAS DELETED THOUGH THE SCOPED COPY NEVER LANDED, so the credential is gone from both names`);

  // Rule 11's runtime half: the shapes.
  check(live.shapes.claudeOk && live.shapes.codexOk, `${TAG} a vendor credential was refused`);
  check(!live.shapes.truncated, `${TAG} a truncated credential passed the shape test`);
  check(!live.shapes.notCredential, `${TAG} JSON that is not a credential passed the shape test`);
  check(!live.shapes.apiKey, `${TAG} an API key file passed as a subscription credential`);
  check(live.shapes.slotOk, `${TAG} a slot Tortie minted was refused`);
  check(!live.shapes.slotEscape && !live.shapes.slotOther, `${TAG} a hand edited slot name was accepted`);

  notes.push(
    `${String(live.roundTrip.pairs.length)} ordered pairs switched and back with all ${String(live.roundTrip.accounts.length)} accounts intact, ${String(live.interrupted.length)} interrupted arms, ${String(live.attack.length)} attack shapes, ${String(live.keychain.argvCount)} keychain calls and no payload on any of them`
  );
}

// ---------------------------------------------------------------------------
// The ablations. Each one must change the verdict.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  {
    name: 'the person own location allowed as a write target',
    edits: [
      {
        file: 'stores.ts',
        from: "  if (dir === null || dir === '') return null;",
        to: "  if (dir === '') return null;\n  if (dir === null) dir = '/home/.codex';"
      }
    ]
  },
  {
    name: 'the read back check taken out of the one write',
    edits: [
      {
        file: 'swap.ts',
        from: '    if (staged !== payload) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    name: 'the promotion of the outgoing account removed',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '    if (false && before !== undefined) {'
      }
    ]
  },
  {
    // THE FIX ROUND'S OWN ABLATION. The rule is that an account is kept unless
    // it is PROVED to be the same one, so the ablation is the rule inverted:
    // keep only when the change is proved to be a DIFFERENT account, which is
    // what the phase shipped with and what lost an account on three real
    // shapes, being a login signed into but not yet used, the person's own
    // claude store in that same shape, and a codex file with no id token.
    name: 'the promotion made to need proof, so an unnamed store loses its account',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '    if (before !== undefined && before.email !== null && reading.email !== null && before.email !== reading.email) {'
      }
    ]
  },
  {
    // The bound on the unnamed chain. Without it ten refreshes of a store that
    // names no account mint nine logins, and `nextKeptLoginName` stops at 99,
    // past which a promotion answers null and the account is lost outright.
    name: 'the unnamed chain left unbounded, so a token refresh mints a login',
    edits: [
      {
        file: 'keep.ts',
        from: '      ? await reusableChainLogin(d, provider, slot, kept)',
        to: '      ? null'
      }
    ]
  },
  {
    // The lock that makes two overlapping observes safe. Without it the second
    // one's write is composed from a copy taken before the first one's
    // promotion, and the promoted login's row is destroyed permanently.
    name: 'the observe lock removed, so two overlapping lists race the record file',
    edits: [
      {
        file: 'keep.ts',
        from: '  return underRootLock(d.root, () => observeOnce(d, provider));',
        to: '  return observeOnce(d, provider);'
      }
    ]
  },
  {
    // The merging write. A caller that writes back a whole file it read
    // earlier discards every row another writer added in between.
    name: 'the record write made to drop the rows it did not write itself',
    edits: [
      {
        file: 'kept.ts',
        from: '  const { file } = readKeptFile(root);\n  let moved = false;',
        to: '  const file = emptyKeptFile();\n  let moved = false;'
      }
    ]
  },
  {
    name: 'a login left with no row of its own until the next observation',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (facts.has(row.id)) continue;\n    facts.set(row.id, await factsFromSlot(d, provider, row.id, null));',
        to: '    if (facts.has(row.id)) continue;'
      }
    ]
  },
  {
    name: 'the second promotion guard removed, so one account gets many logins',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (sameAccountProven(row, before)) return { held: true, event: null };',
        to: '    if (false) return { held: true, event: null };'
      }
    ]
  },
  {
    // PHASE 206. The vendor's own store taken out of the removal, which is the
    // defect exactly: the folder and the row went and the scoped keychain item
    // stayed, holding a whole credential nobody could reach.
    name: 'the vendor store left out of a removal, so its keychain item survives',
    edits: [
      {
        file: 'keep.ts',
        from:
          '  await forgetStore(d.stores, provider, loginDirIn(d.root, provider, id));',
        to: '  await Promise.resolve();'
      }
    ]
  },
  {
    // PHASE 206. The stray finisher taken out, which is the tree before this
    // phase: a removal an earlier run did not finish is never finished.
    name: 'the stray finisher removed, so a half done removal stays half done',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (removeStrayLoginDir(d.root, provider, id)) done.push(id);',
        to: '    if (false) done.push(id);'
      }
    ]
  },
  {
    // PHASE 206. The vault half of the sweep taken out, which is the tree
    // before this phase: `sweepStaged` reached the vendor stores and never the
    // store Tortie owns.
    name: 'the vault left out of the sweep, so a crash keeps a credential at <slot>.pending',
    edits: [
      {
        file: 'keep.ts',
        from: '    await vaultDiscardStaged(d.vault, slot);',
        to: '    await Promise.resolve();'
      }
    ]
  },
  {
    // PHASE 206 FIX ROUND. The sweep put back on `storesOf` alone, which drops
    // a login whose folder is not on disk, so a staged place beside a slot
    // whose directory has already gone is kept for ever. The record file half
    // is left in place on purpose, because the residue this arm plants is a
    // crash between the STAGE and the record row's own write, so there is no
    // row to find it by and the rows index is the only thing that reaches it.
    name: 'the sweep reading directories alone, so a slot with no folder keeps its residue',
    edits: [
      {
        file: 'keep.ts',
        from: '  for (const row of readLoginsFile(root).file.logins) {',
        to: "  for (const row of storesOf(root, provider).map((s) => ({ provider, id: s.id ?? 'default' }))) {"
      }
    ]
  },
  {
    // PHASE 206 FIX ROUND. The stray finisher put back on the `readdir` alone,
    // so a stray whose folder has gone while its slot, its row and its scoped
    // vendor item are all still there is never finished.
    name: 'the stray finisher reading directories alone, so a stray with no folder is never finished',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (id === DEFAULT_SLOT_ID || known.has(id)) continue;',
        to: '    if (true) continue;'
      }
    ]
  },
  {
    // The once per run sweep, for the store that is never written again.
    name: 'the sweep removed, so a store nobody writes again keeps its residue',
    edits: [
      {
        file: 'keep.ts',
        from: '    await sweepStaged(d, provider);',
        to: '    await Promise.resolve();'
      }
    ]
  },
  {
    // The staged write made to follow a link again, which is the shape the
    // whole of `nofollow.ts` exists for. Both halves go, because either one
    // alone still refuses: the unlink acts on the link rather than on what it
    // points at, and O_EXCL refuses a path that exists.
    name: 'the staged write made to follow a link again',
    edits: [
      {
        file: 'nofollow.ts',
        from: '  try {\n    unlinkSync(path);\n  } catch {',
        to: '  try {\n    if (false) unlinkSync(path);\n  } catch {'
      },
      {
        file: 'nofollow.ts',
        from: '    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,',
        to: '    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC,'
      }
    ]
  },
  {
    // The commit asked the same question, for a link planted AFTER the write.
    name: 'the commit no longer refuses to rename a link onto a store',
    edits: [
      {
        file: 'nofollow.ts',
        from: '  if (lstatSync(from).isSymbolicLink()) {',
        to: '  if (false) {'
      }
    ]
  },
  {
    name: 'the settle read dropped, so a store caught mid change is captured',
    edits: [
      {
        file: 'stores.ts',
        from: '  if (second.payload !== first.payload) return null;',
        to: ''
      },
      {
        file: 'stores.ts',
        from: '  if (second.email !== first.email) return null;',
        to: ''
      }
    ]
  },
  {
    name: 'the payload put on a command line the way orca does it',
    edits: [
      {
        file: 'security.ts',
        from:
          '  const command = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\\n`;\n' +
          "  const { code } = await runner.run(['-i'], command);",
        to:
          "  const { code } = await runner.run([\n" +
          "    'add-generic-password',\n" +
          "    '-U',\n" +
          "    '-a',\n" +
          '    account,\n' +
          "    '-s',\n" +
          '    service,\n' +
          "    '-X',\n" +
          '    hex\n' +
          '  ]);'
      }
    ]
  },
  {
    // PHASE 211. The default lift removed, so a session on the default login
    // never has the vendor's own location written and cannot follow a switch.
    name: 'the default lift removed, so a running default session never follows',
    edits: [
      {
        file: 'keep.ts',
        from: '  if (running.some((s) => s.provider === provider && isDefaultLogin(s.login))) {',
        to: '  if (false && running.some((s) => s.provider === provider && isDefaultLogin(s.login))) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The promotion in front of the default lift trusted
    // again, which is the shape that shipped: alice is written over while the
    // vendor's identity file still names her, and the next observe keeps bob
    // under her name.
    name: 'the default lift no longer keeps the account it writes over',
    edits: [
      {
        file: 'keep.ts',
        from: '      const promoted = await promoteOutgoing(d, provider, defSlot, before, kept, changed);\n      updateKeptFile(d.root, changed);\n      if (!promoted.held) {',
        to: '      const promoted = { held: true };\n      updateKeptFile(d.root, changed);\n      if (!promoted.held) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The default record left behind the store after the
    // lift, so the observe that follows judges a change under a stale identity.
    name: 'the default record not moved on after the lift',
    edits: [
      {
        file: 'keep.ts',
        from: '    const copy = await vaultPut(d.vault, defSlot, payload);\n    if (copy.ok) {',
        to: '    const copy = { ok: false };\n    if (copy.ok) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The catch that turns a held lock into a refusal
    // removed, which is the shape that shipped: `LockHeld` leaves activate.
    name: 'a held lock thrown out of activate rather than refused',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (err instanceof LockHeld) return { ok: false, reason: err.message };',
        to: '    if (err instanceof LockHeld) throw err;'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. An unmakeable lock waited on rather than refused,
    // which with the sleep below removed as well is the shape that spun a
    // core for the whole wait.
    name: 'an unmakeable lock waited on for the whole timeout',
    edits: [
      {
        file: 'locks.ts',
        from: "      throw new LockHeld(opts.lockName, 'unwritable');",
        to: '      made = false;'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The sleep on the null branch removed, so a seam
    // answering not made and not there together spins the loop.
    name: 'the lock loop null branch spinning with no sleep',
    edits: [
      {
        file: 'locks.ts',
        from: '      await deps.sleep(50);\n      continue;\n    }\n    if (deps.now() - heldAt > staleness) {',
        to: '      continue;\n    }\n    if (deps.now() - heldAt > staleness) {'
      }
    ]
  },
  {
    // PHASE 211. A live lock stolen, which is the one thing the protocol must
    // never do: a stolen lock is a write inside a token refresh.
    name: 'a live lock stolen, so a switch can land inside a token refresh',
    edits: [
      {
        file: 'locks.ts',
        from: '    if (deps.now() - heldAt > staleness) {',
        to: '    if (true) {'
      }
    ]
  },
  {
    // PHASE 211. A stale lock never reclaimed, so a dead holder blocks a switch
    // for ever.
    name: 'a stale lock never reclaimed, so a dead holder blocks a switch',
    edits: [
      {
        file: 'locks.ts',
        from: '    if (deps.now() - heldAt > staleness) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    // PHASE 211. The claude write no longer held under the locks, so it can
    // race the vendor's own token refresh.
    name: 'the claude write no longer held under the locks',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (provider === \'claude\') {\n      return await withClaudeCredentialLocks(',
        to: '    if (false && provider === \'claude\') {\n      return await withClaudeCredentialLocks('
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The storage write lock dropped, so a commit can land
    // inside the vendor's own read modify write of the credential.
    name: 'the storage write lock not taken',
    edits: [
      {
        file: 'locks.ts',
        from: "  return join(configHome, '.storage-write');",
        to: "  return join(configHome, '.storage-writeX');"
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The legacy lock named from the link rather than
    // the real path, which for a linked config home is not the vendor's lock.
    name: 'the legacy lock named from the link rather than the real path',
    edits: [
      {
        file: 'locks.ts',
        from: '    real = realpathSync(configHome);',
        to: '    real = configHome;'
      }
    ]
  },
  {
    // PHASE 211. The legacy lock named wrong, so the two locks are not the
    // vendor's pair.
    name: 'the legacy claude lock named wrong, so the pair is not the vendor\'s',
    edits: [
      {
        file: 'locks.ts',
        from: '  return `${real}.lock`;',
        to: '  return `${real}X.lock`;'
      }
    ]
  },
  {
    // PHASE 211. The watcher runs on every event, so a burst is not collapsed.
    name: 'the watcher debounce guard removed, so a burst is not collapsed',
    edits: [
      {
        file: 'watch.ts',
        from: '    if (timer !== null || running) return;',
        to: '    if (running) return;'
      }
    ]
  },
  {
    // PHASE 211. The watcher's file filter removed, so any change triggers it.
    name: 'the watcher file filter removed, so it observes for any file',
    edits: [
      {
        file: 'watch.ts',
        from: '          if (file === null || file === target.file) schedule();',
        to: '          schedule();'
      }
    ]
  },
  {
    name: 'the credential shape test relaxed, so anything in a store is kept',
    edits: [
      {
        file: 'payload.ts',
        from: '  const obj = parseObject(payload);\n  if (obj === null) return false;',
        to: '  const obj = parseObject(payload);\n  if (obj === null) return true;'
      }
    ]
  },
  {
    name: 'the slot name rule relaxed',
    edits: [
      {
        file: 'vault.ts',
        from: '  if (!LOGIN_PROVIDERS.includes(provider as LoginProviderId)) return false;',
        to: ''
      }
    ]
  },
  {
    name: 'the staged copy no longer discarded',
    edits: [
      {
        file: 'swap.ts',
        from: '      try {\n        await target.discard();',
        to: '      try {\n        if (false) await target.discard();'
      }
    ]
  },
  {
    name: 'the item account attribute no longer preserved on a write back',
    edits: [
      {
        file: 'stores.ts',
        from: '  const existing = await keychainAccount(d.runner, service);\n  const own = existing ?? (await ownAccountName(d));',
        to: '  const own = d.userName;'
      }
    ]
  },
  {
    // PHASE 208. The digest dropped from the name, which is the tree before
    // that phase: every profile on the machine composes one item.
    name: 'the profile digest dropped from the keychain name',
    edits: [
      {
        file: 'vault.ts',
        from: '  return `${VAULT_SERVICE_PREFIX}${slot}-${vaultScopeDigest(scope)}`;',
        to: '  return `${VAULT_SERVICE_PREFIX}${slot}`;'
      }
    ]
  },
  {
    // PHASE 208. The migration refusal removed, so a scratch profile reads and
    // deletes the item every profile can reach.
    name: 'the migration made to run in any profile',
    edits: [
      {
        file: 'migrate.ts',
        from: '  if (d.ownProfile !== true) {',
        to: '  if (false) {'
      }
    ]
  },
  {
    // PHASE 208. The harness half of the profile proof removed, so a probe
    // launch in the person own profile directory would pass as his.
    name: 'a harness launch read as the person own profile',
    edits: [
      {
        file: 'migrate.ts',
        from: '  if (isHarnessLaunch(shape.env)) return false;',
        to: ''
      }
    ]
  },
  {
    // PHASE 208. The record consulted no more, so a stale scoped copy wins
    // over the old item the profile actually recorded.
    name: 'the record no longer consulted when both names hold something',
    edits: [
      {
        file: 'migrate.ts',
        from: '        rewrite = true;',
        to: '        rewrite = false;'
      }
    ]
  },
  {
    // PHASE 208. The old item deleted before the scoped one is proved.
    name: 'the old item deleted without the scoped one read back',
    edits: [
      {
        file: 'migrate.ts',
        from: '    if (proof === null || (rewrite && proof !== held)) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    name: 'a store that cannot be read throws instead of answering nothing',
    edits: [
      {
        file: 'stores.ts',
        from: '  try {\n    return await d.readText(path);\n  } catch {\n    return null;\n  }',
        to: '  return d.readText(path);'
      }
    ]
  }
];

const moves = [];
/**
 * THE ABLATED COPIES LIVE ONE LEVEL UNDER `src/main/`, and the depth is exact.
 *
 * This domain imports `../logins/dirs`, `../logins/store` and
 * `../usage/login-accounts`, because the vendor paths and the ownership rule
 * live there and duplicating either would be the Phase 203 decoy all over
 * again. A copy anywhere else cannot resolve those three, so every ablation
 * would fail to IMPORT rather than fail the rule it removed, and a suite that
 * is red for the wrong reason proves exactly as little as one that is green
 * for the wrong reason. The first two versions of this gate had that bug, one
 * copying to the system temporary directory and one nesting the copies a level
 * too deep, and both reported twelve of twelve red while proving nothing.
 *
 * So each copy is a SIBLING of `logins/` and `usage/`, its name begins with a
 * dot so neither TypeScript's include globs nor the test runner picks it up,
 * and it is removed in the `finally` below whatever happened. The live probe
 * has already run by this point, so nothing here can affect it.
 */
const ABLATION_PREFIX = `.p204-ablation-${process.pid.toString(36)}-`;
const mainDir = join(repoRoot, 'src/main');

function sweepAblations() {
  for (const name of readdirSync(mainDir)) {
    if (name.startsWith(ABLATION_PREFIX)) {
      rmSync(join(mainDir, name), { recursive: true, force: true });
    }
  }
}

try {
  const liveVerdict = JSON.stringify(verdict(live));
  let red = 0;
  for (const [i, ablation] of ABLATIONS.entries()) {
    const dir = join(mainDir, `${ABLATION_PREFIX}${String(i)}`);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'))) {
      cpSync(join(DOMAIN, f), join(dir, f));
    }
    let applied = true;
    for (const edit of ablation.edits) {
      const target = join(dir, edit.file);
      const before = readFileSync(target, 'utf8');
      if (!before.includes(edit.from)) {
        failures.push(
          `${TAG} the ablation "${ablation.name}" found nothing to edit in ${edit.file}`
        );
        applied = false;
        break;
      }
      writeFileSync(target, before.replace(edit.from, edit.to));
    }
    if (!applied) continue;
    const ablated = runProbe(dir);
    const got = verdict(ablated);
    const was = verdict(live);
    if (got[0] === 'error') {
      // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED. Two earlier
      // versions of this gate counted it as one and proved nothing at all, so
      // it is a finding rather than a pass.
      failures.push(
        `${TAG} the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing: ${String(ablated.error).slice(0, 300)}`
      );
      continue;
    }
    const moved = VERDICT_PARTS.filter((_, at) => got[at] !== was[at]);
    if (moved.length > 0) {
      red += 1;
      // A CLAUSE OWNS A READING. Saying which one is what stops an ablation
      // passing for the wrong reason and going unnoticed.
      moves.push(`${ablation.name} -> ${moved.join(', ')}`);
    } else {
      failures.push(
        `${TAG} the ablation "${ablation.name}" changed nothing this gate checks, so that rule cannot fail`
      );
    }
  }
  notes.push(`${String(red)} of ${String(ABLATIONS.length)} ablations went red`);
  if (process.env['P204_ABLATION_DETAIL'] === '1') {
    for (const line of moves) process.stdout.write(`${TAG} ablation ${line}\n`);
  }
} finally {
  sweepAblations();
}

// ---------------------------------------------------------------------------
// Rule 11. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
check(
  pkg.includes('"conformance:credentials"'),
  `${TAG} package.json does not name conformance:credentials`
);
const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
check(
  checks.includes('conformance-credentials.mjs'),
  `${TAG} build/verification-checks.mjs does not name this gate`
);
const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');
check(
  claudeMd.includes('conformance:credentials'),
  `${TAG} CLAUDE.md does not name conformance:credentials, so nobody is told to run it`
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED with ${String(failures.length)} finding(s)\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} OK: ${notes.join('; ')}.\n`);
